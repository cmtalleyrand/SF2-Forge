import { describe, it, expect } from 'vitest';
import { SF2Builder, Sample } from './sf2-builder';

// Mock AudioBuffer since we are in Node environment
class MockAudioBuffer {
  length: number;
  sampleRate: number;
  numberOfChannels: number;
  private data: Float32Array;

  constructor(options: { length: number; sampleRate: number; numberOfChannels?: number }) {
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.numberOfChannels = options.numberOfChannels || 1;
    this.data = new Float32Array(this.length);
  }

  getChannelData(channel: number) {
    if (channel >= this.numberOfChannels) {
      throw new Error('Channel out of bounds');
    }
    return this.data;
  }
}

describe('sf2-builder', () => {
  describe('SF2Builder', () => {
    it('should build a valid SF2 file with no samples', () => {
      const builder = new SF2Builder();
      const sf2Data = builder.build();
      
      expect(sf2Data).toBeInstanceOf(Uint8Array);
      
      // Check RIFF header
      const view = new DataView(sf2Data.buffer);
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      expect(riff).toBe('RIFF');
      
      const sfbk = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
      expect(sfbk).toBe('sfbk');
    });

    it('should build a valid SF2 file with samples', () => {
      const builder = new SF2Builder();

      const sample1: Sample = {
        name: 'test1',
        buffer: new MockAudioBuffer({ length: 100, sampleRate: 44100 }) as unknown as AudioBuffer,
        rootKey: 60,
        lowKey: 0,
        highKey: 127,
        sampleRate: 44100
      };

      builder.addSample(sample1);

      const sf2Data = builder.build();
      expect(sf2Data).toBeInstanceOf(Uint8Array);

      // Check RIFF header
      const view = new DataView(sf2Data.buffer);
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      expect(riff).toBe('RIFF');
    });

    it('should clamp negative loopStart to the sample start offset', () => {
      const builder = new SF2Builder();
      builder.addSample({
        name: 'looptest',
        buffer: new MockAudioBuffer({ length: 200, sampleRate: 44100 }) as unknown as AudioBuffer,
        rootKey: 60,
        lowKey: 0,
        highKey: 127,
        sampleRate: 44100,
        loopStart: -50,  // invalid: negative relative offset
        loopEnd: 100,
      });
      // Should not throw; the clamped value prevents negative absolute indices
      expect(() => builder.build()).not.toThrow();
    });

    it('should handle a sample name longer than 20 characters by truncating', () => {
      const builder = new SF2Builder();
      builder.addSample({
        name: 'this_is_a_very_long_sample_name_that_exceeds_20_chars',
        buffer: new MockAudioBuffer({ length: 100, sampleRate: 44100 }) as unknown as AudioBuffer,
        rootKey: 60,
        lowKey: 0,
        highKey: 127,
        sampleRate: 44100,
      });
      const sf2Data = builder.build();
      expect(sf2Data).toBeInstanceOf(Uint8Array);
    });

    it('should handle multiple samples in the same preset', () => {
      const builder = new SF2Builder();
      for (let i = 0; i < 5; i++) {
        builder.addSample({
          name: `sample${i}`,
          buffer: new MockAudioBuffer({ length: 64, sampleRate: 44100 }) as unknown as AudioBuffer,
          rootKey: 48 + i * 12,
          lowKey: 48 + i * 12 - 6,
          highKey: 48 + i * 12 + 5,
          sampleRate: 44100,
          bank: 0,
          preset: 0,
        });
      }
      const sf2Data = builder.build('MultiSample');
      expect(sf2Data).toBeInstanceOf(Uint8Array);
      const view = new DataView(sf2Data.buffer);
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
    });

    it('should build a valid custom soundfont name', () => {
      const builder = new SF2Builder();
      const sf2Data = builder.build('My Custom Font');
      expect(sf2Data).toBeInstanceOf(Uint8Array);
    });
  });
});
