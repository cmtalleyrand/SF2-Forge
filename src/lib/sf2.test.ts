
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
});
