// claude:2026-10-26T10:30:00+02:00 — QA-Prüfrunde 1.4.0 „Materiallager und Bergung“ (Kontrolleur): Grenzfälle der
// v90-Migration und des Sanitizings. Neue Datei, keine bestehende geändert.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { SAVE_VERSION } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

const AT = 1_761_100_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function asVersion(s: GameState, v: number): SaveShape {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  save.version = v;
  save.state.version = v;
  return save;
}

describe("QA Migration v90: Bank mit Lücken, Instanzen, Alt-Save ohne bankOrder", () => {
  it("v89: Lücken schließen sich, Instanz-Basis behält ihr Fach, Lagerware verschwindet aus der Reihenfolge", () => {
    const s = createGame({ name: "Q" }, content, 3);
    s.bank = { copper_ore: 50, rusty_sword: 1, oak_log: 20, cooked_trout: 9, relic_dust: 4 };
    s.bankInstances = [{ instanceId: "v1", baseItemId: "goblin_warkilt", affixes: [] }];
    s.bankOrder = [null, "copper_ore", null, "rusty_sword", "goblin_warkilt", null, "oak_log", "cooked_trout", "relic_dust"];
    const out = deserialize(JSON.stringify(asVersion(s, 89)), content, AT)!.state;
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.bankOrder).toEqual(["rusty_sword", "goblin_warkilt", "cooked_trout"]);
    // Bestandsverhalten (sanitize, index.ts:1735): eine modifikationslose Instanz zerfällt zum plain Bank-Stack.
    expect(out.bank).toEqual({ copper_ore: 50, rusty_sword: 1, oak_log: 20, cooked_trout: 9, relic_dust: 4, goblin_warkilt: 1 });
    expect(out.bankInstances.length).toBe(0);
  });

  it("v86 (vor bankOrder): Reihenfolge entsteht ohne Lagerware, Bestand bleibt", () => {
    const s = createGame({ name: "Q" }, content, 3);
    s.bank = { iron_ore: 7, rusty_sword: 1, cooked_trout: 2 };
    const save = asVersion(s, 86);
    delete (save.state as Partial<GameState>).bankOrder;
    delete (save.state as Partial<GameState>).lockedItems;
    // Echte Alt-Saves kennen das Feld nicht (Test-createGame ohne starterKit schriebe die Engine-Baseline false hinein).
    delete (save.state.settings as Partial<GameState["settings"]>).materialsToStorage;
    const out = deserialize(JSON.stringify(save), content, AT)!.state;
    expect(out.bankOrder).toEqual(["cooked_trout", "rusty_sword"]);
    expect(out.bank.iron_ore).toBe(7);
    expect(out.settings.materialsToStorage).toBe(true);
    expect(out.lockedItems).toEqual({});
  });

  it("v90+: Lagerware, die (z. B. per Alt-Client) doch in bankOrder steht, wird genullt, nichts geht verloren", () => {
    const s = createGame({ name: "Q" }, content, 3);
    s.bank = { copper_ore: 50, rusty_sword: 1 };
    s.bankOrder = ["copper_ore", "rusty_sword"];
    const out = deserialize(JSON.stringify(asVersion(s, SAVE_VERSION)), content, AT)!.state;
    expect(out.bankOrder).toEqual([null, "rusty_sword"]);
    expect(out.bank.copper_ore).toBe(50);
  });

  it("lockedItems: Müll wird verworfen (false, Zahlen, Array), echte Sperren bleiben, Round-Trip stabil", () => {
    const s = createGame({ name: "Q" }, content, 3);
    (s as { lockedItems?: unknown }).lockedItems = { sickle_shiv: true, goblin_warkilt: false, inst_1: 1, "": true };
    const out = deserialize(JSON.stringify(asVersion(s, SAVE_VERSION)), content, AT)!.state;
    expect(out.lockedItems).toEqual({ sickle_shiv: true, "": true });
    const s2 = createGame({ name: "Q" }, content, 3);
    (s2 as { lockedItems?: unknown }).lockedItems = ["sickle_shiv"];
    expect(deserialize(JSON.stringify(asVersion(s2, SAVE_VERSION)), content, AT)!.state.lockedItems).toEqual({});
    const once = serialize(out, AT);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});
