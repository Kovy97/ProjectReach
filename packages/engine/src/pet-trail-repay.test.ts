import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, PetDef } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { petPityProgress, repayPetTrail } from "./pets";

/**
 * claude:2026-11-06T09:37:55+01:00 — SAVE 104 (Hotfix 1.4.2.2, Chef 06.11.2026 „bis halber Balken“): Begleiter-Spur-Nachzahlung.
 * Je fehlendem Kampf-Begleiter Spur = max(alt, min(⌈Schwelle/2⌉, Lebenszeit-Kills)), nur mit gekauftem Talent „Spur aufgenommen“.
 */

function game(): GameState {
  const s = createTestGame({ name: "Spur", baseAttributes: { str: 20, dex: 20, con: 20 } }, content, 7);
  s.talents = { ...(s.talents ?? {}), slayer: { tracking: 5, trail: 1 } };
  return s;
}

const combatPets = (): PetDef[] => Object.values(content.pets ?? {}).filter((p): p is PetDef => !!p && p.source.kind === "combat" && p.dropChance > 0);
const skillPets = (): PetDef[] => Object.values(content.pets ?? {}).filter((p): p is PetDef => !!p && p.source.kind === "skill");

/** Halbe Schwelle bei voller Fährtenkunde (×2 Chance) und Spur-Faktor 2. */
function halfCap(p: PetDef): number {
  const chance = Math.min(1, p.dropChance * 2);
  return Math.ceil(Math.ceil(2 / chance) / 2);
}

describe("repayPetTrail (SAVE 104)", () => {
  it("hebt jeden fehlenden Kampf-Begleiter auf min(halbe Schwelle, Kills)", () => {
    expect(combatPets().length).toBeGreaterThan(0);
    const s = game();
    s.stats.kills = 10_000_000;
    const plus = repayPetTrail(s, content);
    for (const p of combatPets()) {
      expect(s.petPity?.[p.id], p.id).toBe(halfCap(p));
      expect(plus[p.id], p.id).toBe(halfCap(p));
    }
    // wenige Kills: nur so viel, wie es Kills gab
    const t = game();
    t.stats.kills = 7;
    repayPetTrail(t, content);
    for (const p of combatPets()) expect(t.petPity?.[p.id], p.id).toBe(Math.min(7, halfCap(p)));
  });

  it("Berufs-Begleiter und schon besessene bleiben unberührt", () => {
    const s = game();
    s.stats.kills = 10_000_000;
    const owned = combatPets()[0]!;
    s.character.ownedPets[owned.id] = true;
    repayPetTrail(s, content);
    expect(s.petPity?.[owned.id]).toBeUndefined();
    for (const p of skillPets()) expect(s.petPity?.[p.id], p.id).toBeUndefined();
  });

  it("ohne gekauftes Spur-Talent passiert nichts", () => {
    const s = game();
    s.talents = { slayer: { tracking: 5 } };
    s.stats.kills = 10_000_000;
    expect(repayPetTrail(s, content)).toEqual({});
    expect(Object.keys(s.petPity ?? {})).toEqual([]);
  });

  it("greift auch bei ruhendem Kodex (gekaufter Rang zählt), Live-Schwelle bleibt gesperrt", () => {
    const s = game();
    s.skills.slayer = { xp: 0 }; // Slayer 1: Kodex ruht
    s.stats.kills = 10_000_000;
    const p = combatPets()[0]!;
    expect(petPityProgress(s, content, p)).toBeNull();
    repayPetTrail(s, content);
    expect(s.petPity?.[p.id]).toBe(halfCap(p));
  });

  it("idempotent und senkt nie: max statt Summe", () => {
    const s = game();
    s.stats.kills = 10_000_000;
    const p = combatPets()[0]!;
    const higher = halfCap(p) + 5;
    s.petPity = { [p.id]: higher };
    repayPetTrail(s, content);
    expect(s.petPity[p.id]).toBe(higher);
    const before = JSON.stringify(s.petPity);
    repayPetTrail(s, content);
    expect(JSON.stringify(s.petPity)).toBe(before);
  });

  it("zieht keinen Zufallswert", () => {
    const s = game();
    s.stats.kills = 50_000;
    const rng = JSON.stringify(s.rng);
    repayPetTrail(s, content);
    expect(JSON.stringify(s.rng)).toBe(rng);
  });
});
