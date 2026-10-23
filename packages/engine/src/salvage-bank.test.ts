import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { RELIC_DUST_ITEM_ID } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { itemCount } from "./inventory";
import { isSalvageable, salvageBankInstance, salvageBankItem, salvageYield, toggleSalvageLock } from "./salvage";

/**
 * claude:2026-10-26T07:00:00+02:00 — Zerlegen direkt in der Bank (Chef-Entscheid BG1, 26.10.): dieselben Regeln wie im Inventar,
 * Stapel aus `bank`, Einzelstücke aus `bankInstances`, Schloss auf Item oder Basis.
 */
const LOOT = "goblin_warkilt";

describe("Bergung in der Bank", () => {
  it("Stapel: zerlegt höchstens den Bankbestand, zahlt den Ertrag je Stück aus", () => {
    expect(isSalvageable(content, LOOT)).toBe(true);
    const y = salvageYield(content, LOOT)!;
    const s = createTestGame({ name: "B" }, content, 1);
    s.bank[LOOT] = 3;
    expect(salvageBankItem(s, content, LOOT, 2)).toBe(2);
    expect(s.bank[LOOT]).toBe(1);
    expect((s.bank[RELIC_DUST_ITEM_ID] ?? 0) + itemCount(s.inventory, RELIC_DUST_ITEM_ID)).toBe(y.dust * 2);
    expect(salvageBankItem(s, content, LOOT, 99)).toBe(1);
    expect(s.bank[LOOT]).toBeUndefined();
    expect(salvageBankItem(s, content, LOOT, 1)).toBe(0);
  });

  it("Einzelstück aus dem Gear-Vault; Schloss auf Instanz oder Basis sperrt", () => {
    const s = createTestGame({ name: "B" }, content, 1);
    s.bankInstances.push({ instanceId: "v1", baseItemId: LOOT, affixes: [] });
    s.bankInstances.push({ instanceId: "v2", baseItemId: LOOT, affixes: [] });
    toggleSalvageLock(s, "v1");
    expect(salvageBankInstance(s, content, "v1")).toBe(false);
    expect(salvageBankInstance(s, content, "v2")).toBe(true);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["v1"]);
    toggleSalvageLock(s, "v1");
    toggleSalvageLock(s, LOOT);
    expect(salvageBankInstance(s, content, "v1")).toBe(false);
    s.bank[LOOT] = 2;
    expect(salvageBankItem(s, content, LOOT, 1)).toBe(0);
  });

  it("Hergestelltes bleibt unzerlegbar, auch in der Bank", () => {
    const s = createTestGame({ name: "B" }, content, 1);
    s.bank.copper_sword = 2;
    expect(isSalvageable(content, "copper_sword")).toBe(false);
    expect(salvageBankItem(s, content, "copper_sword", 1)).toBe(0);
    expect(s.bank.copper_sword).toBe(2);
  });
});
