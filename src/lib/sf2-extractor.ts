import { SoundFont2, GeneratorType } from 'soundfont2';
import { SampleData } from '../components/SampleList';

type GeneratorMap = Record<number, { value?: number; range?: { lo: number; hi: number } }>;

function getLastDefinedValue(generatorType: number, ...generators: GeneratorMap[]): number | undefined {
  for (let i = generators.length - 1; i >= 0; i--) {
    const value = generators[i]?.[generatorType]?.value;
    if (value !== undefined) return value;
  }
  return undefined;
}

function getSummedValue(generatorType: number, ...generators: GeneratorMap[]): number | undefined {
  let hasAny = false;
  let sum = 0;
  for (const generator of generators) {
    const value = generator?.[generatorType]?.value;
    if (value !== undefined) {
      hasAny = true;
      sum += value;
    }
  }
  return hasAny ? sum : undefined;
}

function resolveKeyRange(...generators: GeneratorMap[]): { lo: number; hi: number } {
  let lo = 0;
  let hi = 127;
  for (const generator of generators) {
    const range = generator?.[GeneratorType.KeyRange]?.range;
    if (!range) continue;
    lo = Math.max(lo, range.lo);
    hi = Math.min(hi, range.hi);
  }
  if (hi < lo) {
    return { lo, hi: lo };
  }
  return { lo, hi };
}

export async function extractSamplesFromSF2(file: File, ctx: AudioContext): Promise<SampleData[]> {
  const buffer = await file.arrayBuffer();
  const sf2 = new SoundFont2(new Uint8Array(buffer));
  
  const extractedSamples: SampleData[] = [];
  const sampleBufferCache = new Map<string, AudioBuffer>();
  
  for (const preset of sf2.presets) {
    const presetName = preset.header.name;
    const presetNum = preset.header.preset;
    const bankNum = preset.header.bank;
    
    const presetGlobalZone = preset.zones.find(zone => !zone.instrument);
    const presetGlobalGens = (presetGlobalZone?.generators || {}) as GeneratorMap;

    for (const pZone of preset.zones) {
      if (!pZone.instrument) continue;

      const pGens = (pZone.generators || {}) as GeneratorMap;
      const instrumentGlobalZone = pZone.instrument.zones.find(zone => !zone.sample);
      const instrumentGlobalGens = (instrumentGlobalZone?.generators || {}) as GeneratorMap;
      
      for (const iZone of pZone.instrument.zones) {
        if (!iZone.sample) continue;
        
        const sf2Sample = iZone.sample;
        const sampleName = sf2Sample.header.name;
        const sampleKey = `${sampleName}_${sf2Sample.header.start}_${sf2Sample.header.end}`;
        
        let audioBuffer = sampleBufferCache.get(sampleKey);
        
        if (!audioBuffer) {
          // Convert Int16Array to Float32Array for AudioBuffer
          const int16Data = sf2Sample.data;
          const float32Data = new Float32Array(int16Data.length);
          for (let i = 0; i < int16Data.length; i++) {
            float32Data[i] = int16Data[i] / 32768.0;
          }
          
          audioBuffer = ctx.createBuffer(1, float32Data.length, sf2Sample.header.sampleRate);
          audioBuffer.getChannelData(0).set(float32Data);
          sampleBufferCache.set(sampleKey, audioBuffer);
        }
        
        const iGens = (iZone.generators || {}) as GeneratorMap;
        const mergedGeneratorScopes = [presetGlobalGens, pGens, instrumentGlobalGens, iGens];
        
        const rootKey = getLastDefinedValue(GeneratorType.OverridingRootKey, ...mergedGeneratorScopes)
          ?? sf2Sample.header.originalPitch;
        const { lo: lowKey, hi: highKey } = resolveKeyRange(...mergedGeneratorScopes);
        
        const panRaw = getSummedValue(GeneratorType.Pan, ...mergedGeneratorScopes);
        const attenuationRaw = getSummedValue(GeneratorType.InitialAttenuation, ...mergedGeneratorScopes);
        const tuneRaw = getSummedValue(GeneratorType.FineTune, ...mergedGeneratorScopes);
        
        const attack = getSummedValue(34, ...mergedGeneratorScopes); // AttackVolEnv
        const decay = getSummedValue(36, ...mergedGeneratorScopes); // DecayVolEnv
        const sustain = getSummedValue(37, ...mergedGeneratorScopes); // SustainVolEnv
        const release = getSummedValue(38, ...mergedGeneratorScopes); // ReleaseVolEnv

        const sampleModes = getLastDefinedValue(GeneratorType.SampleModes, ...mergedGeneratorScopes) ?? 0;
        let loopMode = 'no_loop';
        if (sampleModes === 1) loopMode = 'loop_continuous';
        else if (sampleModes === 3) loopMode = 'loop_sustain';
        
        // Create a dummy File object for the sample
        const dummyFile = new File([audioBuffer.getChannelData(0)], `${sampleName}.wav`, { type: 'audio/wav' });
        
        extractedSamples.push({
          id: Math.random().toString(36).substr(2, 9),
          file: dummyFile,
          name: sampleName,
          buffer: audioBuffer,
          rootKey,
          lowKey,
          highKey,
          sampleRate: sf2Sample.header.sampleRate,
          bank: bankNum,
          preset: presetNum,
          presetName: presetName,
          pan: panRaw !== undefined ? panRaw / 500.0 : undefined,
          volume: attenuationRaw !== undefined ? -(attenuationRaw / 10.0) : undefined,
          tune: tuneRaw,
          loopMode,
          loopStart: sf2Sample.header.startLoop - sf2Sample.header.start,
          loopEnd: sf2Sample.header.endLoop - sf2Sample.header.start,
          attack: attack !== undefined ? Math.pow(2, attack / 1200) : undefined,
          decay: decay !== undefined ? Math.pow(2, decay / 1200) : undefined,
          sustain: sustain !== undefined ? 100 * Math.pow(10, -sustain / 200) : undefined,
          release: release !== undefined ? Math.pow(2, release / 1200) : undefined,
        });
      }
    }
  }
  
  return extractedSamples;
}
