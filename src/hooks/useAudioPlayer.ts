import { useState, useRef, useCallback, useEffect } from 'react';
import { SampleData } from '../components/SampleList';
import { resolveAudioContextConstructor } from '../lib/browser-compat';

export function useAudioPlayer(samples: SampleData[]) {
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSources = useRef(new Map<number, AudioBufferSourceNode>());

  useEffect(() => {
    return () => {
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };
  }, []);

  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      const AudioContextCtor = resolveAudioContextConstructor();
      audioCtxRef.current = new AudioContextCtor();
    }
    return audioCtxRef.current;
  };

  const playNote = useCallback((note: number) => {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    if (activeSources.current.has(note)) return;

    const sample = samples.find(s => note >= s.lowKey && note <= s.highKey);
    if (!sample) return;

    const source = ctx.createBufferSource();
    source.buffer = sample.buffer;
    const semitones = note - sample.rootKey;
    const detune = semitones * 100;
    source.detune.value = detune;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
    activeSources.current.set(note, source);
    setActiveNote(note);
    source.onended = () => {
      if (activeSources.current.get(note) === source) {
        activeSources.current.delete(note);
        setActiveNote(null);
      }
    };
  }, [samples]);

  const stopNote = useCallback((note: number) => {
    const ctx = getAudioCtx();
    const source = activeSources.current.get(note);
    if (source) {
      source.stop(ctx.currentTime + 0.1);
      activeSources.current.delete(note);
      setActiveNote(null);
    }
  }, []);

  return { activeNote, playNote, stopNote, getAudioCtx };
}
