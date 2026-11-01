// claude:2026-10-31T09:29:00+01:00 — Save-Vertrag Nachtrag SAVE 100 (Chef-Entscheid 31.10.2026 versteckte Erfolge, „Heute nicht“):
// `stats.closeWins` (Siege mit höchstens 5 % Leben). Migration < 100 setzt 0 (echte Fixtures v99 und v56), Sanitizing (Ganzzahl ≥ 0,
// auch ein v100-Dev-Stand ohne Feld), Round-Trip mit Wert > 0, ein schon freigeschaltetes „Heute nicht“ bleibt über das Laden erhalten.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const AT = 1_762_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function load(state: unknown, version = SAVE_VERSION): GameState {
  const r = deserialize(JSON.stringify({ version, savedAt: AT, state }), content, AT);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("SAVE 100 Nachtrag: Migration < 100 setzt stats.closeWins = 0", () => {
  it("echtes v99-Fixture: Feld fehlt vorher, danach 0; ein vorhandenes „Heute nicht“ bleibt", () => {
    const json = readFileSync(join(VAULT_DIR, "v99-synthetic-1.4.2.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    expect(raw.version).toBe(99);
    expect((raw.state.stats as Partial<GameState["stats"]>).closeWins).toBeUndefined();
    expect(deserialize(json, content, raw.savedAt)!.state.stats.closeWins).toBe(0);

    // Wer den Erfolg über die alte 100-Tode-Bedingung schon hat, behält ihn (ID unverändert, kein Abstreifen).
    raw.state.achievements = [...raw.state.achievements, "ach_deaths_100"];
    const s = deserialize(JSON.stringify(raw), content, raw.savedAt)!.state;
    expect(s.achievements).toContain("ach_deaths_100");
    expect(s.stats.closeWins).toBe(0);
  });

  it("ältestes Vault-Fixture (v56) lädt mit closeWins = 0", () => {
    const json = readFileSync(join(VAULT_DIR, "v56-slot-0.json"), "utf-8");
    const s = deserialize(json, content, (JSON.parse(json) as SaveShape).savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.stats.closeWins).toBe(0);
  });

  it("idempotent: zweites Laden des migrierten v99-Stands ändert nichts", () => {
    const json = readFileSync(join(VAULT_DIR, "v99-synthetic-1.4.2.json"), "utf-8");
    const savedAt = (JSON.parse(json) as SaveShape).savedAt;
    const once = serialize(deserialize(json, content, savedAt)!.state, savedAt);
    expect(serialize(deserialize(once, content, savedAt)!.state, savedAt)).toBe(once);
  });
});

describe("SAVE 100 Nachtrag: Sanitizing von stats.closeWins", () => {
  it("Ganzzahl ≥ 0: negativ, NaN-Ersatz, Text, null und fehlend werden 0, Brüche abgerundet", () => {
    const cases: Array<[unknown, number]> = [
      [3, 3],
      [2.7, 2],
      [-4, 0],
      [null, 0],
      ["7", 0],
      [{}, 0],
    ];
    for (const [value, want] of cases) {
      const s = createGame({ name: "Knapp" }, content, 5);
      (s.stats as unknown as Record<string, unknown>).closeWins = value;
      expect(load(s).stats.closeWins, JSON.stringify(value)).toBe(want);
    }
    // v100-Dev-Stand ohne das Feld (vor dem Nachtrag gespeichert): Sanitize ergänzt 0.
    const ohne = createGame({ name: "Knapp" }, content, 5);
    delete (ohne.stats as Partial<GameState["stats"]>).closeWins;
    expect(load(ohne).stats.closeWins).toBe(0);
  });

  it("Round-Trip: ein Wert > 0 übersteht Speichern und Laden unverändert", () => {
    const s = createGame({ name: "Knapp" }, content, 5);
    s.stats.closeWins = 3;
    const once = serialize(load(s), AT);
    const back = deserialize(once, content, AT)!.state;
    expect(back.stats.closeWins).toBe(3);
    expect(serialize(back, AT)).toBe(once);
  });
});
