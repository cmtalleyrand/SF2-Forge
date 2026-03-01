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
  });
});
