import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

// claude:2026-10-18T00:30:00+02:00 — Talentbäume/Jagdbuch (1.3.0, kein SAVE-Bump): `talents`,
// `petPity`, `character.companionPetId2` — Round-Trip, Alt-Save ohne Felder, Sanitize.

const SAVED_AT = 1_760_000_000_000;
const VAULT = join(__dirname, "..", "fixtures", "save-compat");

function loadRaw(state: unknown): GameState {
  const json = JSON.stringify({ version: SAVE_VERSION, savedAt: SAVED_AT, state });
  const res = deserialize(json, content, SAVED_AT);
  expect(res).not.toBeNull();
  return res!.state;
}

const pets = Object.keys(content.pets);
const [P1, P2, P3] = [pets[0]!, pets[1]!, pets[2]!];

describe("Jagdbuch-Persistenz", () => {
  it("Round-Trip: Ränge, Pity und zweiter Platz bleiben erhalten", () => {
    const s = createGame({ name: "T", baseAttributes: { str: 10, dex: 10, con: 10 } }, content, 1);
    s.talents = { slayer: { tracking: 5, trail: 1, collar: 1, lore: 2 } };
    s.character.ownedPets = { [P1]: true, [P2]: true };
    s.character.companionPetId = P1;
    s.character.companionPetId2 = P2;
    s.petPity = { [P3]: 1234 };
    const back = deserialize(serialize(s, SAVED_AT), content, SAVED_AT)!.state;
    expect(back.talents).toEqual({ slayer: { tracking: 5, trail: 1, collar: 1, lore: 2 } });
    expect(back.petPity).toEqual({ [P3]: 1234 });
    expect(back.character.companionPetId2).toBe(P2);
  });

  it("Alt-Save (v87-Vault) ohne die Felder lädt mit Defaults", () => {
    const raw = JSON.parse(readFileSync(join(VAULT, "v87-synthetic-1.3.0.json"), "utf8")) as { state: Record<string, unknown> };
    delete raw.state.talents;
    delete raw.state.petPity;
    delete (raw.state.character as Record<string, unknown>).companionPetId2;
    const s = loadRaw(raw.state);
    expect(s.talents).toEqual({});
    expect(s.petPity).toEqual({});
    expect(s.character.companionPetId2).toBeNull();
  });

  it("Sanitize: unbekannte Bäume/Knoten fallen weg, Ränge gekappt, Voraussetzungen nicht erzwungen", () => {
    const s = createGame({ name: "T", baseAttributes: { str: 10, dex: 10, con: 10 } }, content, 1);
    (s as unknown as { talents: unknown }).talents = {
      slayer: { tracking: 99, trail: 1, pace: -2, spoils: 2.7, bogus: 3, lore: "x" },
      ghostTree: { a: 1 },
    };
    const back = loadRaw(s);
    // trail ohne tracking-Voraussetzung wäre hier gültig geblieben; tracking gekappt auf 5.
    expect(back.talents).toEqual({ slayer: { tracking: 5, trail: 1, spoils: 2 } });
  });

  it("Sanitize: Pity nur für bekannte, nicht besessene Begleiter; Platz 2 nur mit Talent, besessen und ≠ Platz 1", () => {
    const s = createGame({ name: "T", baseAttributes: { str: 10, dex: 10, con: 10 } }, content, 1);
    s.character.ownedPets = { [P1]: true, [P2]: true };
    s.character.companionPetId = P1;
    s.petPity = { [P1]: 5, [P3]: 7.9, nope: 3 } as GameState["petPity"];
    s.character.companionPetId2 = P2; // ohne Talent
    let back = loadRaw(structuredClone(s));
    expect(back.petPity).toEqual({ [P3]: 7 });
    expect(back.character.companionPetId2).toBeNull();

    s.talents = { slayer: { tracking: 5, collar: 1 } };
    back = loadRaw(structuredClone(s));
    expect(back.character.companionPetId2).toBe(P2);
    s.character.companionPetId2 = P1; // = Platz 1
    expect(loadRaw(structuredClone(s)).character.companionPetId2).toBeNull();
    s.character.companionPetId2 = P3; // nicht besessen
    expect(loadRaw(structuredClone(s)).character.companionPetId2).toBeNull();
  });
});
