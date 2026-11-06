import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { PetDef } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { deserialize, serialize } from "./index";

/**
 * claude:2026-11-06T09:37:55+01:00 — SAVE 104 (Hotfix 1.4.2.2, Chef 06.11.2026): Begleiter-Spur-Nachzahlung beim Laden eines Stands < 104.
 * Basis ist das echte v103-Vault-Fixture, darin Talent „Spur aufgenommen“ + volle Fährtenkunde und Lebenszeit-Kills gesetzt.
 */
const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");

function v103With(mutate: (state: Record<string, unknown>) => void, version = 103): { json: string; savedAt: number } {
  const raw = JSON.parse(readFileSync(join(VAULT_DIR, "v103-synthetic-1.4.2.json"), "utf-8")) as { version: number; savedAt: number; state: Record<string, unknown> };
  raw.version = version;
  raw.state.version = version; // die Migration liest state.version
  mutate(raw.state);
  return { json: JSON.stringify(raw), savedAt: raw.savedAt };
}

const combatPets = (): PetDef[] => Object.values(content.pets ?? {}).filter((p): p is PetDef => !!p && p.source.kind === "combat" && p.dropChance > 0);
const halfCap = (p: PetDef): number => Math.ceil(Math.ceil(2 / Math.min(1, p.dropChance * 2)) / 2);

function withTrail(kills: number) {
  return (st: Record<string, unknown>): void => {
    st.talents = { ...((st.talents as object) ?? {}), slayer: { tracking: 5, trail: 1 } };
    (st.stats as Record<string, unknown>).kills = kills;
    st.petPity = {};
  };
}

describe("SAVE 104: Begleiter-Spur-Nachzahlung", () => {
  it("SAVE_VERSION ist 104", () => {
    expect(SAVE_VERSION).toBe(104);
  });

  it("Stand < 104 mit Spur-Talent: fehlende Kampf-Begleiter stehen auf min(halbe Schwelle, Kills)", () => {
    const { json, savedAt } = v103With(withTrail(10_000_000));
    const s = deserialize(json, content, savedAt)!.state;
    let checked = 0;
    for (const p of combatPets()) {
      if (s.character.ownedPets[p.id]) continue;
      expect(s.petPity[p.id], p.id).toBe(halfCap(p));
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("Stand < 104 ohne Spur-Talent: Spur unverändert", () => {
    const { json, savedAt } = v103With((st) => {
      (st.stats as Record<string, unknown>).kills = 10_000_000;
      st.petPity = {};
    });
    const s = deserialize(json, content, savedAt)!.state;
    expect(Object.keys(s.petPity ?? {})).toEqual([]);
  });

  it("Stand ab 104 wird nicht noch einmal bezahlt; erneutes Laden nach dem Speichern ändert nichts", () => {
    const { json, savedAt } = v103With(withTrail(10_000_000), 104);
    const s = deserialize(json, content, savedAt)!.state;
    expect(Object.keys(s.petPity ?? {})).toEqual([]);
    const first = deserialize(v103With(withTrail(123)).json, content, savedAt)!.state;
    const again = deserialize(serialize(first, savedAt), content, savedAt)!.state;
    expect(again.petPity).toEqual(first.petPity);
  });
});
