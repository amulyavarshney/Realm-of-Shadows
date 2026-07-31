/** Build a minimal mono 16-bit PCM WAV and return a data URI for expo-av. */

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += chars[a >> 2];
    out += chars[((a & 3) << 4) | (b >> 4)];
    out += i + 1 < bytes.length ? chars[((b & 15) << 2) | (c >> 6)] : '=';
    out += i + 2 < bytes.length ? chars[c & 63] : '=';
  }
  return out;
}

export interface ToneSpec {
  freq: number;
  durationMs: number;
  volume?: number;
  delayMs?: number;
}

export function toneDataUri(specs: ToneSpec[], sampleRate = 22050): string {
  const totalMs = specs.reduce((s, t) => s + (t.delayMs ?? 0) + t.durationMs, 0);
  const numSamples = Math.ceil((totalMs / 1000) * sampleRate);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let sampleIdx = 0;
  for (const spec of specs) {
    const delaySamples = Math.floor(((spec.delayMs ?? 0) / 1000) * sampleRate);
    sampleIdx += delaySamples;
    const durSamples = Math.floor((spec.durationMs / 1000) * sampleRate);
    const vol = spec.volume ?? 0.35;
    for (let i = 0; i < durSamples && sampleIdx < numSamples; i++, sampleIdx++) {
      const t = i / sampleRate;
      const env = Math.min(1, t * 40, (spec.durationMs / 1000 - t) * 40);
      const sample = Math.sin(2 * Math.PI * spec.freq * t) * env * vol;
      view.setInt16(44 + sampleIdx * 2, Math.max(-32767, Math.min(32767, sample * 32767)), true);
    }
  }

  return `data:audio/wav;base64,${bytesToBase64(new Uint8Array(buffer))}`;
}
