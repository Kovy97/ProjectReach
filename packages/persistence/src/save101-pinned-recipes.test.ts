// claude:2026-10-31T11:54:13+01:00 — Save-Vertrag SAVE 101 (1.4.2 Rezepte anpinnen): `pinnedRecipes`. Migration < 101 (echtes
// v100-Fixture: nur das neue Feld ändert sich), Sanitizing (nur bekannte Rezepte, ohne Doppel, höchstens 10), Pins über Laden
// und Speichern, Aschesturz über Laden.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { MAX_PINNED_RECIPES, createGame, togglePinnedRecipe } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";
import { erwarteSave101Flaechen } from "./save101-test-helper";
import { erwarteSave103Flaechen } from "./save103-test-helper"; // claude:2026-10-31T16:08:21+01:00 — SAVE 103
import { erwarteSave102Rueckgabe } from "./save102-test-helper"; // claude:2026-10-31T14:58:54+01:00 — SAVE 102

const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const AT = 1_762_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function load(state: unknown, version = SAVE_VERSION): GameState {
  const r = deserialize(JSON.stringify({ version, savedAt: AT, state }), content, AT);
  expect(r).not.toBeNull();
  return r!.state;
}

const RECIPES = Object.values(content.actions)
  .filter((a) => (a.inputs?.length ?? 0) > 0)
  .map((a) => a.id);

describe("SAVE 101: Migration < 101 (echtes v100-Fixture)", () => {
  it("leere Pin-Liste, sonst byte-genau derselbe Stand", () => {
    const json = readFileSync(join(VAULT_DIR, "v100-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(100);
    expect((raw.state as Partial<GameState>).pinnedRecipes).toBeUndefined();
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.pinnedRecipes).toEqual([]);
    const erwartet = structuredClone(raw.state);
    erwarteSave101Flaechen(erwartet);
    erwarteSave103Flaechen(erwartet); // claude:2026-10-31T16:08:21+01:00 — SAVE 103 (1.4.2): drei leere Warteschlangen-Vorlagen
    erwarteSave102Rueckgabe(erwartet); // claude:2026-10-31T14:58:54+01:00 — SAVE 102 (1.4.2): Dev-Stand, nur die Rückgabe (54 Narben, Ränge weg)
    erwartet.version = SAVE_VERSION;
    expect((JSON.parse(serialize(s, raw.savedAt)) as SaveShape).state).toEqual(erwartet);
  });

  it("ein v100-Dev-Stand, der das Feld schon trägt, behält seine Pins (gehärtet), nichts geht verloren", () => {
    const json = readFileSync(join(VAULT_DIR, "v100-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    (raw.state as unknown as Record<string, unknown>).pinnedRecipes = ["smelt_copper", "mine_copper", "smelt_copper"];
    const s = deserialize(JSON.stringify(raw), content, raw.savedAt)!.state;
    expect(s.pinnedRecipes).toEqual(["smelt_copper"]);
  });

  it("idempotent: ein zweites Laden ändert nichts mehr", () => {
    const json = readFileSync(join(VAULT_DIR, "v100-synthetic-1.4.2.json"), "utf-8");
    const savedAt = (JSON.parse(json) as SaveShape).savedAt;
    const once = serialize(deserialize(json, content, savedAt)!.state, savedAt);
    expect(serialize(deserialize(once, content, savedAt)!.state, savedAt)).toBe(once);
  });
});

describe("SAVE 101: Sanitizing der Pins", () => {
  it("nur Strings und bekannte Rezepte (Aktionen mit Zutaten), ohne Doppel, Reihenfolge bleibt", () => {
    const s = createGame({ name: "Pinnwand" }, content, 3);
    (s as unknown as Record<string, unknown>).pinnedRecipes = [
      "smelt_bronze",
      7,
      null,
      "mine_copper", // Sammelaktion ohne Zutaten
      "gibt_es_nicht",
      "smelt_bronze",
      { id: "smelt_copper" },
      "smelt_copper",
    ];
    const out = load(s);
    expect(out.pinnedRecipes).toEqual(["smelt_bronze", "smelt_copper"]);
    expect(load(out).pinnedRecipes).toEqual(out.pinnedRecipes); // Fixpunkt
  });

  it(`höchstens ${MAX_PINNED_RECIPES}: ein manipulierter Stand wird gekürzt, die ersten bleiben`, () => {
    const s = createGame({ name: "Pinnwand" }, content, 3);
    s.pinnedRecipes = RECIPES.slice(0, MAX_PINNED_RECIPES + 5);
    const out = load(s);
    expect(out.pinnedRecipes).toEqual(RECIPES.slice(0, MAX_PINNED_RECIPES));
  });

  it("fehlt/kaputt ⇒ leer", () => {
    for (const bad of [undefined, null, 7, "smelt_copper", { a: 1 }]) {
      const s = createGame({ name: "Pinnwand" }, content, 3);
      (s as unknown as Record<string, unknown>).pinnedRecipes = bad;
      expect(load(s).pinnedRecipes).toEqual([]);
    }
  });
});

describe("SAVE 101: Pins überleben Speichern und Laden", () => {
  it("Reihenfolge und gesperrtes Rezept bleiben; Round-Trip byte-stabil", () => {
    const s = createGame({ name: "Pinnwand" }, content, 5);
    for (const id of ["cook_voidray", "smelt_bronze", "forge_copper_axe"]) expect(togglePinnedRecipe(s, content, id).ok).toBe(true);
    const json = serialize(s, AT);
    const back = deserialize(json, content, AT)!.state;
    expect(back.pinnedRecipes).toEqual(["cook_voidray", "smelt_bronze", "forge_copper_axe"]);
    expect(serialize(back, AT)).toBe(json);
  });
});
