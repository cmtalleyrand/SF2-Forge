import { SoundFont2, GeneratorType } from 'soundfont2';
import { SampleData } from '../components/SampleList';

export async function extractSamplesFromSF2(file: File, ctx: AudioContext): Promise<SampleData[]> {
  const buffer = await file.arrayBuffer();
  const sf2 = new SoundFont2(new Uint8Array(buffer));
  
  const extractedSamples: SampleData[] = [];
  const sampleBufferCache = new Map<string, AudioBuffer>();
  
  for (const preset of sf2.presets) {
    const presetName = preset.header.name;
    const presetNum = preset.header.preset;
    const bankNum = preset.header.bank;
    
    for (const pZone of preset.zones) {
      if (!pZone.instrument) continue;
      
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
        
        // Extract generators
        const pGens = pZone.generators || {};
        const iGens = iZone.generators || {};
        
        const rootKey = iGens[GeneratorType.OverridingRootKey]?.value ?? sf2Sample.header.originalPitch;
        
        // Key range
        const pKeyRange = pGens[GeneratorType.KeyRange]?.range;
        const iKeyRange = iGens[GeneratorType.KeyRange]?.range;
        
        let lowKey = 0;
        let highKey = 127;
        
        if (iKeyRange) {
          lowKey = iKeyRange.lo;
          highKey = iKeyRange.hi;
        } else if (pKeyRange) {
          lowKey = pKeyRange.lo;
          highKey = pKeyRange.hi;
        }
        
        // Other parameters
        const pan = (iGens[GeneratorType.Pan]?.value ?? 0) / 500.0; // SF2 pan is -500 to 500 (0.1% units)
        const volume = (iGens[GeneratorType.InitialAttenuation]?.value ?? 0) / 10.0; // SF2 attenuation is in centibels
        const tune = iGens[GeneratorType.FineTune]?.value ?? 0;
        
        // Envelope settings
        const attack = iGens[34]?.value; // AttackVolEnv
        const decay = iGens[36]?.value; // DecayVolEnv
        const sustain = iGens[37]?.value; // SustainVolEnv
        const release = iGens[38]?.value; // ReleaseVolEnv

        const sampleModes = iGens[GeneratorType.SampleModes]?.value ?? 0;
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
          pan,
          volume: -volume, // Convert attenuation back to volume (negative dB)
          tune,
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
