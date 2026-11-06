/**
 * Relógio único do motor. Todo tempo vira frame por `toFrame` (arredondamento
 * ao frame mais próximo: erro máximo de meio frame) e todo estado visual é
 * função pura do frame — sem timers, sem estado acumulado, sem Math.random.
 */

export function toFrame(seconds: number, fps: number): number {
  return Math.round(seconds * fps);
}

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Progresso 0→1 entre dois frames, já limitado. */
export function progress(frame: number, start: number, duration: number): number {
  return duration <= 0 ? (frame >= start ? 1 : 0) : clamp((frame - start) / duration);
}

export const ease = {
  linear: (t: number) => t,
  inOut: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t: number) => 1 - (1 - t) ** 3,
  in: (t: number) => t * t * t,
  /** Passa do alvo e volta (entradas com "pop"). */
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  /** Mola amortecida, 0→1, sem depender de estado anterior. */
  spring: (t: number) => (t >= 1 ? 1 : 1 - Math.cos(t * Math.PI * 2.5) * Math.exp(-t * 6)),
};

/** Ruído determinístico em [-1, 1] (hash inteiro), estável entre renders. */
export function noise(seed: number, i: number): number {
  let h = (seed * 374761393 + i * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Ruído suave (interpolado) para tremores e respiração. */
export function smoothNoise(seed: number, t: number): number {
  const i = Math.floor(t), f = t - i;
  const s = f * f * (3 - 2 * f);
  return lerp(noise(seed, i), noise(seed, i + 1), s);
}

/** Hash estável de texto (mesmo id → mesma semente). */
export function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
