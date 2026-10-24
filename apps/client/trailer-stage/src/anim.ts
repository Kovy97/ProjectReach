// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne (Trailer v3 „Gehalten“): Zeit, Easing, Keyframes, Zufall.
// Alles ist eine reine Funktion der Zeit: jede Szene kann für jedes t ausgewertet werden (Unterframes, Zeitlupe, Wiederholung).

export const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
export const smooth = (k: number): number => {
  const x = clamp(k);
  return x * x * (3 - 2 * x);
};
export const easeOutCubic = (k: number): number => 1 - Math.pow(1 - clamp(k), 3);
export const easeInCubic = (k: number): number => Math.pow(clamp(k), 3);
export const easeInOutCubic = (k: number): number => {
  const x = clamp(k);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeOutExpo = (k: number): number => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(k)));

/** Fenster: 0 vor a, 1 nach b, dazwischen geglättet. */
export const ramp = (t: number, a: number, b: number, ease: (k: number) => number = smooth): number => ease((t - a) / (b - a));
/** Puls: steigt in `att` auf 1, fällt in `rel` auf 0 (z. B. Blitz, Kamerastoß). */
export const pulse = (t: number, at: number, att: number, rel: number): number => {
  if (t < at - att || t > at + rel) return 0;
  return t < at ? smooth((t - (at - att)) / att) : 1 - easeOutCubic((t - at) / rel);
};

export type Vec3 = [number, number, number];
export interface Key<T> { t: number; v: T; ease?: (k: number) => number }

/** Keyframe-Spur für Zahlen oder Vektoren. */
export function track<T extends number | Vec3>(keys: Key<T>[], t: number): T {
  if (t <= keys[0]!.t) return keys[0]!.v;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (t <= b.t) {
      const k = (b.ease ?? easeInOutCubic)((t - a.t) / (b.t - a.t));
      if (typeof a.v === "number") return lerp(a.v, b.v as number, k) as T;
      const av = a.v as Vec3;
      const bv = b.v as Vec3;
      return [lerp(av[0], bv[0], k), lerp(av[1], bv[1], k), lerp(av[2], bv[2], k)] as T;
    }
  }
  return keys[keys.length - 1]!.v;
}

/**
 * Zeit-Umbildung Musikzeit τ → Handlungszeit: stückweise linear mit Steigung (1 = Echtzeit, 0.2 = Zeitlupe, 0 = Stopp).
 * `segs` beginnen bei τ=0 und sind aufsteigend.
 */
export function timeRemap(segs: { from: number; rate: number }[], tau: number): number {
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i]!;
    const end = i + 1 < segs.length ? segs[i + 1]!.from : Infinity;
    if (tau <= s.from) break;
    acc += (Math.min(tau, end) - s.from) * s.rate;
    if (tau <= end) break;
  }
  return acc;
}

/** Deterministischer Zufall (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Glattes Rauschen aus Sinus-Summen (für Kamera-Wackeln, Flackern); deterministisch. */
export function wobble(t: number, seed: number): number {
  return (
    Math.sin(t * 13.1 + seed * 1.7) * 0.5 +
    Math.sin(t * 23.7 + seed * 3.1) * 0.3 +
    Math.sin(t * 41.3 + seed * 5.3) * 0.2
  );
}
