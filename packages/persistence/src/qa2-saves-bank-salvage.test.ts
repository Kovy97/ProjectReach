import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame, salvageBankInstance, salvageBankItem, salvageYield, toggleSalvageLock } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Runde 2, Spielstände (Kontrolleur, 2026-10-24): Zerlegen in der Bank (Chef-Entscheid BG1) über
 * Speichern/Laden: Schlösser, Fächer, Ertrag, Fixpunkt.
 */
const AT = 1_761_500_000_000;
const LOOT = "goblin_warkilt"; // reine Beute, zerlegbar

const load = (s: GameState): GameState => deserialize(serialize(s, AT), content, AT)!.state;
const fixpoint = (s: GameState): void => {
  const once = serialize(load(s), AT);
  expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
};

function withLoot(): GameState {
  const s = createGame({ name: "QA-Bank" }, content, 21);
  s.bank[LOOT] = 3;
  s.bank.cooked_shrimp = 4;
  s.bankOrder = [LOOT, "cooked_shrimp"];
  return s;
}

describe("Stapel in der Bank", () => {
  it("Stapel-Schloss überlebt das Laden und blockiert die Bank-Bergung; gelöst zerlegt sie, das Fach bleibt stehen, Fixpunkt", () => {
    const s0 = withLoot();
    toggleSalvageLock(s0, LOOT);
    const s = load(s0);
    expect(s.lockedItems?.[LOOT]).toBe(true);
    expect(salvageBankItem(s, content, LOOT, 3)).toBe(0);
    expect(s.bank[LOOT]).toBe(3);

    toggleSalvageLock(s, LOOT);
    expect(salvageBankItem(s, content, LOOT, 2)).toBe(2);
    expect(s.bank[LOOT]).toBe(1);
    expect(s.bankOrder[0]).toBe(LOOT);
    fixpoint(s);

    const y = salvageYield(content, LOOT)!;
    expect(salvageBankItem(s, content, LOOT, 1)).toBe(1);
    expect(s.bank[LOOT]).toBeUndefined();
    expect(s.bankOrder).toEqual([null, "cooked_shrimp"]); // geleertes Fach bleibt leer (OSRS)
    const t = load(s);
    expect(t.bankOrder).toEqual([null, "cooked_shrimp"]);
    expect(t.lockedItems?.[LOOT]).toBeUndefined();
    // Ertrag dreimal gutgeschrieben (Lagerware: Bank ohne Fach, oder Inventar), nichts davon in einem Bankfach.
    for (const it of y.items) {
      const have = (t.bank[it.itemId] ?? 0) + t.inventory.slots.filter((sl) => sl?.itemId === it.itemId).reduce((a, sl) => a + (sl?.qty ?? 0), 0);
      expect(have).toBe(it.qty * 3);
      expect(t.bankOrder).not.toContain(it.itemId);
    }
    fixpoint(t);
  });
});

describe("Einzelstücke im Gear-Vault", () => {
  it("Instanz-Schloss und Basis-Schloss überleben das Laden; Basis sperrt alle Einzelstücke; nach dem Lösen zerlegt, Fixpunkt", () => {
    const s0 = createGame({ name: "QA-Bank" }, content, 22);
    // Echte Einzelstücke (mit Suffix): modifikationslose Instanzen zerfallen beim Laden planmäßig zum Stapel.
    const suffixId = Object.keys(content.suffixes ?? {})[0]!;
    s0.bankInstances.push({ instanceId: "v1", baseItemId: LOOT, affixes: [], suffix: { suffixId, ilvl: 40, roll: 0.5 } });
    s0.bankInstances.push({ instanceId: "v2", baseItemId: LOOT, affixes: [], suffix: { suffixId, ilvl: 40, roll: 0.7 } });
    s0.bankOrder = [LOOT];
    toggleSalvageLock(s0, "v1");
    const s = load(s0);
    expect(s.lockedItems?.v1).toBe(true);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["v1", "v2"]);
    expect(salvageBankInstance(s, content, "v1")).toBe(false);

    toggleSalvageLock(s, LOOT); // Basis-Schloss
    const t = load(s);
    expect(t.lockedItems?.[LOOT]).toBe(true);
    expect(salvageBankInstance(t, content, "v2")).toBe(false);
    toggleSalvageLock(t, LOOT);
    expect(salvageBankInstance(t, content, "v2")).toBe(true);
    expect(t.bankInstances.map((i) => i.instanceId)).toEqual(["v1"]);
    expect(t.bankOrder[0]).toBe(LOOT); // v1 hält das Fach
    fixpoint(t);

    toggleSalvageLock(t, "v1");
    expect(salvageBankInstance(t, content, "v1")).toBe(true);
    expect(t.bankInstances).toEqual([]);
    expect(t.bankOrder).toEqual([null]);
    fixpoint(t);
  });
});

describe("Schrott im Schloss-Feld", () => {
  it("Nicht-Objekt, false-Werte und Zahlen fallen weg, echte Sperren bleiben, Bank-Bergung respektiert sie", () => {
    const s0 = withLoot();
    (s0 as { lockedItems?: unknown }).lockedItems = { [LOOT]: true, cooked_shrimp: false, x: 1, y: "true" };
    const s = load(s0);
    expect(s.lockedItems).toEqual({ [LOOT]: true });
    expect(salvageBankItem(s, content, LOOT, 1)).toBe(0);
    const s1 = withLoot();
    (s1 as { lockedItems?: unknown }).lockedItems = ["v1"];
    expect(load(s1).lockedItems).toEqual({});
  });
});
