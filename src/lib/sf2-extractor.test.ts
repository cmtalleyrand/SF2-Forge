import { describe, it, expect } from 'vitest';
import { SF2Builder } from './sf2-builder';
import { extractSamplesFromSF2 } from './sf2-extractor';

class MockAudioContext {
  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    const channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
    return {
      length,
      sampleRate,
      numberOfChannels,
      duration: length / sampleRate,
      copyFromChannel: () => {},
      copyToChannel: () => {},
      getChannelData: (channel: number) => channels[channel],
    } as unknown as AudioBuffer;
  }
}

function createAudioBuffer(length = 64, sampleRate = 44100): AudioBuffer {
  const data = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    data[i] = Math.sin(i / 8);
  }
  return {
    length,
    sampleRate,
    numberOfChannels: 1,
    duration: length / sampleRate,
    copyFromChannel: () => {},
    copyToChannel: () => {},
    getChannelData: () => data,
  } as unknown as AudioBuffer;
}

const mockCtx = new MockAudioContext() as unknown as AudioContext;

describe('extractSamplesFromSF2', () => {
  it('throws a descriptive error when passed corrupt/non-SF2 data', async () => {
    const corrupt = new File([new Uint8Array([0, 1, 2, 3, 4, 5])], 'bad.sf2', { type: 'audio/sf2' });
    await expect(extractSamplesFromSF2(corrupt, mockCtx)).rejects.toThrow(/parse/i);
  });

  it('returns an empty array for a valid SF2 with no presets', async () => {
    const builder = new SF2Builder();
    const sf2Data = builder.build('Empty');
    const file = new File([sf2Data], 'empty.sf2', { type: 'audio/sf2' });
    const extracted = await extractSamplesFromSF2(file, mockCtx);
    expect(extracted).toHaveLength(0);
  });

  it('preserves preset configuration parameters across export/import cycles', async () => {
    const builder = new SF2Builder();
    builder.addSample({
      name: 'preserve-me',
      buffer: createAudioBuffer(),
      rootKey: 62,
      lowKey: 12,
      highKey: 96,
      sampleRate: 44100,
      bank: 4,
      preset: 9,
      presetName: 'Config Preset',
      pan: 0.4,
      volume: -6.0,
      tune: 15,
      loopMode: 'loop_continuous',
      loopStart: 10,
      loopEnd: 40,
      attack: 0.25,
      decay: 0.75,
      sustain: 55,
      release: 1.2,
    });

    const sf2Data = builder.build('RoundTrip');
    const sf2File = new File([sf2Data], 'roundtrip.sf2', { type: 'audio/sf2' });
    const extracted = await extractSamplesFromSF2(sf2File, new MockAudioContext() as unknown as AudioContext);

    expect(extracted.length).toBe(1);
    const sample = extracted[0];

    expect(sample.bank).toBe(4);
    expect(sample.preset).toBe(9);
    expect(sample.presetName).toBe('Config Preset');
    expect(sample.rootKey).toBe(62);
    expect(sample.lowKey).toBe(12);
    expect(sample.highKey).toBe(96);
    expect(sample.loopMode).toBe('loop_continuous');
    expect(sample.loopStart).toBe(10);
    expect(sample.loopEnd).toBe(40);

    expect(sample.pan ?? 0).toBeCloseTo(0.4, 2);
    expect(sample.volume ?? 0).toBeCloseTo(-6.0, 1);
    expect(sample.tune).toBe(15);

    expect(sample.attack ?? 0).toBeCloseTo(0.25, 2);
    expect(sample.decay ?? 0).toBeCloseTo(0.75, 2);
    expect(sample.sustain ?? 0).toBeCloseTo(55, 0);
    expect(sample.release ?? 0).toBeCloseTo(1.2, 2);
  });
});
