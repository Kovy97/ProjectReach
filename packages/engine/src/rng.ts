import type { RngState } from "@hearthforge/shared";

/**
 * Deterministischer PRNG (mulberry32). Der Zustand ist eine einzelne Zahl und
 * damit serialisierbar — dieselbe Seed erzeugt garantiert dieselbe Sequenz.
 * Das ist die Grundlage für reproduzierbare Läufe & späteren MP-Abgleich.
 */
export function createRng(seed: number): RngState {
  return { state: seed >>> 0 };
}

/** Nächster Float in [0, 1). Mutiert den RNG-Zustand. */
export function nextFloat(rng: RngState): number {
  let a = rng.state | 0;
  a = (a + 0x6d2b79f5) | 0;
  rng.state = a >>> 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Ganzzahl in [minInclusive, maxInclusive]. */
export function nextInt(rng: RngState, minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(nextFloat(rng) * (maxInclusive - minInclusive + 1));
}
