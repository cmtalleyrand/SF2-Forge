
import { describe, it, expect } from 'vitest';
import { SF2Builder } from './sf2-builder';
import { SampleData } from '../components/SampleList';
import { SoundFont2 } from 'soundfont2';

describe('SF2Builder', () => {
  it('should mask bank number to 15 bits', () => {
    const builder = new SF2Builder();
    const sample: SampleData = {
      id: '1',
      name: 'test',
      file: new File([], 'test.wav'),
      buffer: {
        length: 100,
        sampleRate: 44100,
        numberOfChannels: 1,
        duration: 100/44100,
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getChannelData: () => new Float32Array(100)
      } as unknown as AudioBuffer,
      rootKey: 60,
      lowKey: 0,
      highKey: 127,
      sampleRate: 44100,
      bank: 32769, // 0x8001 - MSB set, should become 1
      preset: 0
    };
    
    builder.addSample(sample);
    const sf2Data = builder.build('Test SoundFont');
    
    const parsed = new SoundFont2(sf2Data);
    expect(parsed.presets.length).toBe(1);
    expect(parsed.presets[0].header.bank).toBe(1); // 32769 & 0x7FFF = 1
  });

  it('should handle bank 0 correctly', () => {
    const builder = new SF2Builder();
    const sample: SampleData = {
      id: '1',
      name: 'test',
      file: new File([], 'test.wav'),
      buffer: {
        length: 100,
        sampleRate: 44100,
        numberOfChannels: 1,
        duration: 100/44100,
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getChannelData: () => new Float32Array(100)
      } as unknown as AudioBuffer,
      rootKey: 60,
      lowKey: 0,
      highKey: 127,
      sampleRate: 44100,
      bank: 0,
      preset: 0
    };
    
    builder.addSample(sample);
    const sf2Data = builder.build('Test SoundFont');
    
    const parsed = new SoundFont2(sf2Data);
    expect(parsed.presets.length).toBe(1);
    expect(parsed.presets[0].header.bank).toBe(0);
  });


  it('should group presets by serialized bank identity to prevent duplicate headers', () => {
    const builder = new SF2Builder();
    const makeSample = (id: string, bank: number): SampleData => ({
      id,
      name: `test-${id}`,
      file: new File([], `test-${id}.wav`),
      buffer: {
        length: 100,
        sampleRate: 44100,
        numberOfChannels: 1,
        duration: 100 / 44100,
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getChannelData: () => new Float32Array(100)
      } as unknown as AudioBuffer,
      rootKey: 60,
      lowKey: 0,
      highKey: 127,
      sampleRate: 44100,
      bank,
      preset: 3
    });

    builder.addSample(makeSample('a', 1));
    builder.addSample(makeSample('b', 32769));
    const sf2Data = builder.build('Test SoundFont');

    const parsed = new SoundFont2(sf2Data);
    expect(parsed.presets.length).toBe(1);
    expect(parsed.presets[0].header.bank).toBe(1);
    expect(parsed.presets[0].header.preset).toBe(3);
  });
  it('should keep distinct presets when program is shared across banks', () => {
    const builder = new SF2Builder();
    const makeSample = (id: string, bank: number): SampleData => ({
      id,
      name: `test-${id}`,
      file: new File([], `test-${id}.wav`),
      buffer: {
        length: 100,
        sampleRate: 44100,
        numberOfChannels: 1,
        duration: 100 / 44100,
        copyFromChannel: () => {},
        copyToChannel: () => {},
        getChannelData: () => new Float32Array(100)
      } as unknown as AudioBuffer,
      rootKey: 60,
      lowKey: 0,
      highKey: 127,
      sampleRate: 44100,
      bank,
      preset: 5
    });

    builder.addSample(makeSample('a', 0));
    builder.addSample(makeSample('b', 1));
    const sf2Data = builder.build('Test SoundFont');

    const parsed = new SoundFont2(sf2Data);
    expect(parsed.presets.length).toBe(2);
    expect(parsed.presets.map(p => p.header.bank).sort((a, b) => a - b)).toEqual([0, 1]);
    expect(parsed.presets.map(p => p.header.preset)).toEqual([5, 5]);
  });

  it('should not reuse a sample header when loop points differ on the same AudioBuffer', () => {
    const builder = new SF2Builder();
    const sharedBuffer = {
      length: 256,
      sampleRate: 44100,
      numberOfChannels: 1,
      duration: 256 / 44100,
      copyFromChannel: () => {},
      copyToChannel: () => {},
      getChannelData: () => new Float32Array(256)
    } as unknown as AudioBuffer;

    const makeSample = (id: string, loopStart: number, loopEnd: number): SampleData => ({
      id,
      name: `test-${id}`,
      file: new File([], `test-${id}.wav`),
      buffer: sharedBuffer,
      rootKey: 60,
      lowKey: 0,
      highKey: 127,
      sampleRate: 44100,
      bank: 0,
      preset: 0,
      loopMode: 'loop_continuous',
      loopStart,
      loopEnd
    });

    builder.addSample(makeSample('a', 20, 120));
    builder.addSample(makeSample('b', 40, 140));
    const sf2Data = builder.build('Test SoundFont');

    const parsed = new SoundFont2(sf2Data);
    const instrumentZones = parsed.presets[0].zones[0].instrument.zones.filter(z => !!z.sample);

    expect(instrumentZones.length).toBe(2);
    expect(instrumentZones[0].sample?.header.startLoop).not.toBe(instrumentZones[1].sample?.header.startLoop);
    expect(instrumentZones[0].sample?.header.endLoop).not.toBe(instrumentZones[1].sample?.header.endLoop);
  });
});
