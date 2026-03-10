import { describe, it, expect } from 'vitest';
import { parseSFZ } from './sfz-parser';

describe('sfz-parser', () => {
  describe('parseSFZ', () => {
    it('should parse basic regions', () => {
      const sfz = `
<region> sample=kick.wav key=36
<region> sample=snare.wav key=38
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(2);
      expect(regions[0].sample).toBe('kick.wav');
      expect(regions[0].key).toBe('36');
      expect(regions[1].sample).toBe('snare.wav');
      expect(regions[1].key).toBe('38');
    });

    it('should ignore comments', () => {
      const sfz = `
// This is a comment
<region> sample=hat.wav key=42 // inline comment
/* Block
   comment */
<region> sample=crash.wav key=49
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(2);
      expect(regions[0].sample).toBe('hat.wav');
      expect(regions[0].key).toBe('42');
      expect(regions[1].sample).toBe('crash.wav');
      expect(regions[1].key).toBe('49');
    });

    it('should handle quoted values', () => {
      const sfz = `
<region> sample="my sample.wav" key=60
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(1);
      expect(regions[0].sample).toBe('my sample.wav');
      expect(regions[0].key).toBe('60');
    });

    it('should parse key ranges', () => {
      const sfz = `
<region> sample=piano.wav lokey=60 hikey=72 pitch_keycenter=60
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(1);
      expect(regions[0].sample).toBe('piano.wav');
      expect(regions[0].lokey).toBe('60');
      expect(regions[0].hikey).toBe('72');
      expect(regions[0].pitch_keycenter).toBe('60');
    });

    it('should handle group and global headers', () => {
      const sfz = `
<global> lokey=0 hikey=127
<group> pitch_keycenter=60
<region> sample=piano_c4.wav
<region> sample=piano_c4_loud.wav volume=10
<group> pitch_keycenter=72
<region> sample=piano_c5.wav
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(3);
      
      expect(regions[0].sample).toBe('piano_c4.wav');
      expect(regions[0].lokey).toBe('0');
      expect(regions[0].hikey).toBe('127');
      expect(regions[0].pitch_keycenter).toBe('60');
      expect(regions[0].volume).toBeUndefined();

      expect(regions[1].sample).toBe('piano_c4_loud.wav');
      expect(regions[1].lokey).toBe('0');
      expect(regions[1].hikey).toBe('127');
      expect(regions[1].pitch_keycenter).toBe('60');
      expect(regions[1].volume).toBe('10');

      expect(regions[2].sample).toBe('piano_c5.wav');
      expect(regions[2].lokey).toBe('0');
      expect(regions[2].hikey).toBe('127');
      expect(regions[2].pitch_keycenter).toBe('72');
    });
    it('should handle unquoted values with spaces', () => {
      const sfz = `
<region> sample=my kick drum.wav key=36
<region> sample=C:\\Users\\Name\\Desktop\\my snare.wav key=38
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(2);
      expect(regions[0].sample).toBe('my kick drum.wav');
      expect(regions[0].key).toBe('36');
      expect(regions[1].sample).toBe('C:\\Users\\Name\\Desktop\\my snare.wav');
      expect(regions[1].key).toBe('38');
    });

    it('should return an empty array for empty input', () => {
      expect(parseSFZ('')).toHaveLength(0);
      expect(parseSFZ('// just a comment')).toHaveLength(0);
    });

    it('should handle ADSR envelope opcodes', () => {
      const sfz = `
<region> sample=pad.wav ampeg_attack=0.25 ampeg_decay=0.5 ampeg_sustain=80 ampeg_release=1.2
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(1);
      expect(regions[0].ampeg_attack).toBe('0.25');
      expect(regions[0].ampeg_decay).toBe('0.5');
      expect(regions[0].ampeg_sustain).toBe('80');
      expect(regions[0].ampeg_release).toBe('1.2');
    });

    it('should handle loop opcodes', () => {
      const sfz = `
<region> sample=loop.wav loop_mode=loop_continuous loop_start=100 loop_end=500
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(1);
      expect(regions[0].loop_mode).toBe('loop_continuous');
      expect(regions[0].loop_start).toBe('100');
      expect(regions[0].loop_end).toBe('500');
    });

    it('should silently skip opcodes that appear before any header', () => {
      const sfz = `sample=orphan.wav key=60
<region> sample=valid.wav key=61`;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(1);
      expect(regions[0].sample).toBe('valid.wav');
    });

    it('should reset group settings for new group headers', () => {
      const sfz = `
<group> volume=5
<region> sample=a.wav key=60
<group> volume=10
<region> sample=b.wav key=62
      `;
      const regions = parseSFZ(sfz);
      expect(regions).toHaveLength(2);
      expect(regions[0].volume).toBe('5');
      expect(regions[1].volume).toBe('10');
    });
  });
});
