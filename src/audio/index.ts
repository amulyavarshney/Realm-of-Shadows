import { Platform } from 'react-native';
import { Audio, type AVPlaybackStatus } from 'expo-av';
import { toneDataUri, type ToneSpec } from './wav';

export type SoundKind = 'tap' | 'reveal' | 'seal' | 'success' | 'fail' | 'win' | 'lose';

const PRESETS: Record<SoundKind, ToneSpec[]> = {
  tap: [{ freq: 520, durationMs: 45, volume: 0.2 }],
  reveal: [
    { freq: 330, durationMs: 90, volume: 0.28 },
    { freq: 440, durationMs: 90, volume: 0.28, delayMs: 70 },
    { freq: 660, durationMs: 120, volume: 0.32, delayMs: 140 },
  ],
  seal: [{ freq: 280, durationMs: 110, volume: 0.3 }],
  success: [
    { freq: 523, durationMs: 100, volume: 0.3 },
    { freq: 659, durationMs: 100, volume: 0.3, delayMs: 80 },
    { freq: 784, durationMs: 140, volume: 0.32, delayMs: 160 },
  ],
  fail: [
    { freq: 180, durationMs: 160, volume: 0.35 },
    { freq: 120, durationMs: 200, volume: 0.3, delayMs: 120 },
  ],
  win: [
    { freq: 392, durationMs: 90, volume: 0.28 },
    { freq: 523, durationMs: 90, volume: 0.28, delayMs: 70 },
    { freq: 659, durationMs: 90, volume: 0.28, delayMs: 140 },
    { freq: 784, durationMs: 180, volume: 0.34, delayMs: 210 },
  ],
  lose: [
    { freq: 330, durationMs: 120, volume: 0.3 },
    { freq: 247, durationMs: 140, volume: 0.3, delayMs: 100 },
    { freq: 165, durationMs: 220, volume: 0.32, delayMs: 220 },
  ],
};

let soundEnabled = true;
let audioReady = false;
const uriCache = new Map<SoundKind, string>();
let webCtx: AudioContext | null = null;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
}

export async function initAudio() {
  if (audioReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioReady = true;
  } catch {
    /* audio unavailable */
  }
}

function getUri(kind: SoundKind): string {
  let uri = uriCache.get(kind);
  if (!uri) {
    uri = toneDataUri(PRESETS[kind]);
    uriCache.set(kind, uri);
  }
  return uri;
}

function playWeb(kind: SoundKind) {
  try {
    if (!webCtx) webCtx = new AudioContext();
    const specs = PRESETS[kind];
    let when = webCtx.currentTime;
    for (const spec of specs) {
      when += (spec.delayMs ?? 0) / 1000;
      const osc = webCtx.createOscillator();
      const gain = webCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = spec.freq;
      gain.gain.value = spec.volume ?? 0.3;
      osc.connect(gain);
      gain.connect(webCtx.destination);
      const dur = spec.durationMs / 1000;
      gain.gain.setValueAtTime(0, when);
      gain.gain.linearRampToValueAtTime(spec.volume ?? 0.3, when + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
      osc.start(when);
      osc.stop(when + dur);
      when += dur;
    }
  } catch {
    /* web audio unavailable */
  }
}

async function playNative(kind: SoundKind) {
  if (!audioReady) await initAudio();
  try {
    const { sound } = await Audio.Sound.createAsync({ uri: getUri(kind) }, { shouldPlay: true, volume: 0.85 });
    sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) void sound.unloadAsync();
    });
  } catch {
    /* playback failed */
  }
}

export async function playSound(kind: SoundKind) {
  if (!soundEnabled) return;
  if (Platform.OS === 'web') {
    playWeb(kind);
  } else {
    await playNative(kind);
  }
}
