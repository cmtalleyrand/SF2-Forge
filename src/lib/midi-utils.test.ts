import { describe, it, expect } from 'vitest';
import { noteToMidi } from './midi-utils';

describe('midi-utils', () => {
  describe('noteToMidi', () => {
    it('should return null for undefined or null', () => {
      expect(noteToMidi(undefined)).toBeNull();
      expect(noteToMidi(null)).toBeNull();
    });

    it('should return the number if passed a number', () => {
      expect(noteToMidi(60)).toBe(60);
      expect(noteToMidi(0)).toBe(0);
      expect(noteToMidi(127)).toBe(127);
    });

    it('should parse numeric strings', () => {
      expect(noteToMidi('60')).toBe(60);
      expect(noteToMidi(' 127 ')).toBe(127);
    });

    it('should parse standard note names', () => {
      expect(noteToMidi('C4')).toBe(60);
      expect(noteToMidi('C#4')).toBe(61);
      expect(noteToMidi('D4')).toBe(62);
      expect(noteToMidi('Eb4')).toBe(63);
      expect(noteToMidi('E4')).toBe(64);
      expect(noteToMidi('F4')).toBe(65);
      expect(noteToMidi('F#4')).toBe(66);
      expect(noteToMidi('G4')).toBe(67);
      expect(noteToMidi('G#4')).toBe(68);
      expect(noteToMidi('A4')).toBe(69);
      expect(noteToMidi('Bb4')).toBe(70);
      expect(noteToMidi('B4')).toBe(71);
      expect(noteToMidi('C5')).toBe(72);
    });

    it('should handle negative octaves', () => {
      expect(noteToMidi('C-1')).toBe(0);
      expect(noteToMidi('C#-1')).toBe(1);
    });

    it('should return null for invalid note names', () => {
      expect(noteToMidi('H4')).toBeNull();
      expect(noteToMidi('C')).toBeNull();
      expect(noteToMidi('invalid')).toBeNull();
    });

    it('should return null for out-of-range MIDI numbers', () => {
      expect(noteToMidi(-1)).toBeNull();
      expect(noteToMidi(128)).toBeNull();
      expect(noteToMidi(999)).toBeNull();
    });

    it('should return null for out-of-range note names', () => {
      // C-2 = -12, below MIDI range
      expect(noteToMidi('C-2')).toBeNull();
      // G9 = 127, exactly at the boundary
      expect(noteToMidi('G9')).toBe(127);
      // G#9 = 128, above MIDI range
      expect(noteToMidi('G#9')).toBeNull();
    });

    it('should return null for out-of-range numeric strings', () => {
      expect(noteToMidi('128')).toBeNull();
      expect(noteToMidi('-1')).toBeNull();
    });

    it('should return null for non-integer numbers', () => {
      expect(noteToMidi(60.5)).toBeNull();
    });
  });
});
