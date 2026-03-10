import { describe, expect, it } from 'vitest';
import { readPersistedGeminiApiKey, resolveAudioContextConstructor } from './browser-compat';

describe('readPersistedGeminiApiKey', () => {
  it('returns empty string when storage access throws', () => {
    const value = readPersistedGeminiApiKey(() => {
      throw new DOMException('blocked', 'SecurityError');
    });

    expect(value).toBe('');
  });


  it('returns empty string when storage provider yields null', () => {
    const value = readPersistedGeminiApiKey(() => null);

    expect(value).toBe('');
  });

  it('returns persisted key when storage is available', () => {
    const value = readPersistedGeminiApiKey(
      () => ({
        getItem: (key: string) => (key === 'gemini_api_key' ? 'abc123' : null),
      }) as Storage,
    );

    expect(value).toBe('abc123');
  });
});

describe('resolveAudioContextConstructor', () => {
  it('uses webkitAudioContext when AudioContext is unavailable', () => {
    class LegacyAudioContext {}

    const ctor = resolveAudioContextConstructor({
      AudioContext: undefined,
      webkitAudioContext: LegacyAudioContext as unknown as typeof AudioContext,
    } as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext });

    expect(ctor).toBe(LegacyAudioContext);
  });


  it('throws when neither AudioContext constructor is available', () => {
    expect(() =>
      resolveAudioContextConstructor({
        AudioContext: undefined,
        webkitAudioContext: undefined,
      } as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext })
    ).toThrowError('AudioContext is unavailable in this browser context.');
  });
});
