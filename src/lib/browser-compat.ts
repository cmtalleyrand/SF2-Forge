type AudioContextCtor = new () => AudioContext;

type LegacyAudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: AudioContextCtor;
};

export function readPersistedGeminiApiKey(storageProvider: () => Storage | null = () => window.localStorage): string {
  try {
    const storage = storageProvider();
    return storage?.getItem('gemini_api_key') ?? '';
  } catch {
    return '';
  }
}

export function resolveAudioContextConstructor(targetWindow: LegacyAudioWindow = window): AudioContextCtor {
  const ctor = targetWindow.AudioContext ?? targetWindow.webkitAudioContext;
  if (!ctor) {
    throw new Error('AudioContext is unavailable in this browser context.');
  }
  return ctor;
}
