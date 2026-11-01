// claude:2026-10-31T11:18:00+01:00 — Massen-Bergung (Diablo-3-Stil, Chef 31.10.2026): Kandidaten, exakter Raritäts-Plan,
// Vorschau == Ergebnis, Mengen-Klemmung, Auswahl über Inventar und Bank.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { RELIC_DUST_ITEM_ID } from "@hearthforge/shared";
import type { ItemRarity } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { addItem, addInstance, itemCount } from "./inventory";
import { equipmentSellKind } from "./shop";
import {
  isSalvageable,
  salvageCandidates,
  salvagePicks,
  salvagePreview,
  salvageRarityPlan,
  salvageYield,
  toggleSalvageLock,
} from "./salvage";

const loot = Object.values(content.items).filter((i) => isSalvageable(content, i.id));
const byRarity = (r: ItemRarity) => loot.filter((i) => (i.rarity ?? "common") === r);
// Zwei verschiedene Raritäten mit je mindestens zwei zerlegbaren Teilen.
const rarities = [...new Set(loot.map((i) => i.rarity ?? "common"))].filter((r) => byRarity(r).length >= 2);
const [RA, RB] = rarities as [ItemRarity, ItemRarity];
const [A1, A2] = byRarity(RA) as [(typeof loot)[number], (typeof loot)[number]];
const B1 = byRarity(RB)[0]!;

function fresh() {
  const s = createTestGame({ name: "Bulk" }, content, 1);
  s.character.gold = 0;
  return s;
}

describe("Massen-Bergung", () => {
  it("Fixture-Annahme: zwei Raritäten mit genug Beute", () => {
    expect(rarities.length).toBeGreaterThanOrEqual(2);
  });

  it("Kandidaten: Inventar und Bank getrennt, Gesperrte und Runen markiert, Hergestelltes nie dabei", () => {
    const s = fresh();
    addItem(s.inventory, content, A1.id, 3);
    addItem(s.inventory, content, "copper_sword", 1);
    s.bank[A2.id] = 4;
    s.bank.copper_sword = 2;
    addInstance(s.inventory, { instanceId: "i-rune", baseItemId: A1.id, affixes: [{ affixId: "x", tier: 1 } as never] });
    toggleSalvageLock(s, A2.id);
    const inv = salvageCandidates(s, content, "inventory");
    const bank = salvageCandidates(s, content, "bank");
    expect(inv.some((c) => c.itemId === "copper_sword")).toBe(false);
    expect(bank.some((c) => c.itemId === "copper_sword")).toBe(false);
    expect(inv.find((c) => c.itemId === A1.id && !c.instanceId)?.qty).toBe(3);
    expect(inv.find((c) => c.instanceId === "i-rune")?.hasRunes).toBe(true);
    expect(bank.find((c) => c.itemId === A2.id)).toMatchObject({ qty: 4, locked: true, source: "bank" });
  });

  it("Raritäts-Plan: exakte Rarität, ohne Gesperrte und Runen, mit Schutz-Zähler", () => {
    const s = fresh();
    addItem(s.inventory, content, A1.id, 2);
    addItem(s.inventory, content, B1.id, 5);
    s.bank[A2.id] = 3;
    addInstance(s.inventory, { instanceId: "i-rune", baseItemId: A1.id, affixes: [{ affixId: "x", tier: 1 } as never] });
    const plan = salvageRarityPlan(s, content, { sources: ["inventory", "bank"], rarity: RA });
    expect(plan.pieces).toBe(2 + 3);
    expect(plan.protectedCount).toBe(1);
    expect(plan.picks.every((p) => (content.items[p.itemId]!.rarity ?? "common") === RA)).toBe(true);
    toggleSalvageLock(s, A2.id);
    const locked = salvageRarityPlan(s, content, { sources: ["inventory", "bank"], rarity: RA });
    expect(locked.pieces).toBe(2);
    expect(locked.protectedCount).toBe(4);
    const onlyInv = salvageRarityPlan(s, content, { sources: ["inventory"], rarity: RB });
    expect(onlyInv.pieces).toBe(5);
  });

  // claude:2026-10-31T13:58:31+01:00 — Befund A3 (Chef-GO): Teile mit Suffix bleiben standardmäßig liegen (Schalter „Teile mit Suffix behalten“).
  it("Raritäts-Plan: Suffix-Teile standardmäßig geschützt, mit keepSuffix false zerlegbar; Runen bleiben immer geschützt", () => {
    const s = fresh();
    addItem(s.inventory, content, A1.id, 2);
    addInstance(s.inventory, { instanceId: "i-suffix", baseItemId: A1.id, affixes: [], suffix: { suffixId: "of_the_bear", ilvl: 10, roll: 0.5 } });
    s.bankInstances.push({ instanceId: "b-suffix", baseItemId: A2.id, affixes: [], suffix: { suffixId: "of_the_bear", ilvl: 10, roll: 0.5 } });
    addInstance(s.inventory, { instanceId: "i-both", baseItemId: A1.id, affixes: [{ affixId: "x", tier: 1 } as never], suffix: { suffixId: "of_the_bear", ilvl: 10, roll: 0.5 } });
    addInstance(s.inventory, { instanceId: "i-plain", baseItemId: A1.id, affixes: [] });
    const inv = salvageCandidates(s, content, "inventory");
    expect(inv.find((c) => c.instanceId === "i-suffix")).toMatchObject({ hasSuffix: true, hasRunes: false });
    expect(inv.find((c) => c.instanceId === "i-plain")?.hasSuffix).toBe(false);
    expect(inv.find((c) => c.itemId === A1.id && !c.instanceId)?.hasSuffix).toBe(false);
    expect(salvageCandidates(s, content, "bank").find((c) => c.instanceId === "b-suffix")?.hasSuffix).toBe(true);

    const keep = salvageRarityPlan(s, content, { sources: ["inventory", "bank"], rarity: RA });
    expect(keep.pieces).toBe(2 + 1); // Stapel + schlichte Instanz
    expect(keep.protectedCount).toBe(3); // zwei Suffix-Teile + das verzauberte
    expect(keep.picks.some((p) => p.instanceId === "i-suffix" || p.instanceId === "b-suffix" || p.instanceId === "i-both")).toBe(false);
    expect(salvageRarityPlan(s, content, { sources: ["inventory", "bank"], rarity: RA, keepSuffix: true })).toEqual(keep);

    const all = salvageRarityPlan(s, content, { sources: ["inventory", "bank"], rarity: RA, keepSuffix: false });
    expect(all.pieces).toBe(2 + 1 + 2);
    expect(all.protectedCount).toBe(1); // nur das verzauberte (Runen)
    expect(all.picks.some((p) => p.instanceId === "i-suffix")).toBe(true);
    expect(all.picks.some((p) => p.instanceId === "b-suffix")).toBe(true);
    expect(all.picks.some((p) => p.instanceId === "i-both")).toBe(false);
  });

  it("Raritäts-Plan: Art-Filter nutzt equipmentSellKind", () => {
    const s = fresh();
    for (const i of loot.slice(0, 40)) addItem(s.inventory, content, i.id, 1);
    for (const kind of ["weapons", "armor", "jewelry"] as const) {
      for (const r of rarities) {
        const plan = salvageRarityPlan(s, content, { sources: ["inventory"], rarity: r, kind });
        for (const p of plan.picks) expect(equipmentSellKind(content.items[p.itemId])).toBe(kind);
      }
    }
  });

  it("Vorschau == Ergebnis über Inventar und Bank, Material und Staub aggregiert", () => {
    const s = fresh();
    addItem(s.inventory, content, A1.id, 2);
    s.bank[A2.id] = 3;
    s.bank[B1.id] = 1;
    const picks = [
      { source: "inventory" as const, itemId: A1.id, instanceId: null, qty: 2 },
      { source: "bank" as const, itemId: A2.id, instanceId: null, qty: 3 },
      { source: "bank" as const, itemId: B1.id, instanceId: null, qty: 1 },
    ];
    const preview = salvagePreview(content, picks);
    const out = salvagePicks(s, content, picks);
    expect(out.pieces).toBe(6);
    expect(out.pieces).toBe(preview.pieces);
    expect(out.dust).toBe(preview.dust);
    const norm = (l: { itemId: string; qty: number }[]) => [...l].sort((a, b) => a.itemId.localeCompare(b.itemId));
    expect(norm(out.items)).toEqual(norm(preview.items));
    expect(itemCount(s.inventory, A1.id)).toBe(0);
    expect(s.bank[A2.id]).toBeUndefined();
    const dustHeld = itemCount(s.inventory, RELIC_DUST_ITEM_ID) + (s.bank[RELIC_DUST_ITEM_ID] ?? 0);
    expect(dustHeld).toBe(out.dust);
  });

  it("Einzelstücke (Inventar und Bank-Vault) werden einzeln zerlegt und eingerechnet", () => {
    const s = fresh();
    addInstance(s.inventory, { instanceId: "iv", baseItemId: A1.id, affixes: [] });
    s.bankInstances.push({ instanceId: "bv", baseItemId: A2.id, affixes: [] });
    const picks = [
      { source: "inventory" as const, itemId: A1.id, instanceId: "iv", qty: 1 },
      { source: "bank" as const, itemId: A2.id, instanceId: "bv", qty: 1 },
    ];
    const preview = salvagePreview(content, picks);
    const out = salvagePicks(s, content, picks);
    expect(out.pieces).toBe(2);
    expect(out.dust).toBe(preview.dust);
    expect(s.inventory.instances).toHaveLength(0);
    expect(s.bankInstances).toHaveLength(0);
  });

  it("Ausführung prüft neu: Menge klemmt auf Bestand, Schloss sperrt, Doppel-Pick zerlegt nichts doppelt", () => {
    const s = fresh();
    addItem(s.inventory, content, A1.id, 2);
    s.bank[A2.id] = 2;
    toggleSalvageLock(s, A2.id);
    const picks = [
      { source: "inventory" as const, itemId: A1.id, instanceId: null, qty: 99 },
      { source: "inventory" as const, itemId: A1.id, instanceId: null, qty: 1 },
      { source: "bank" as const, itemId: A2.id, instanceId: null, qty: 2 },
      { source: "inventory" as const, itemId: A1.id, instanceId: null, qty: Number.NaN },
    ];
    const out = salvagePicks(s, content, picks);
    expect(out.pieces).toBe(2);
    expect(s.bank[A2.id]).toBe(2);
    expect(out.items).toEqual(salvagePreview(content, [{ source: "inventory", itemId: A1.id, instanceId: null, qty: 2 }]).items);
  });

  it("Ausbeute meldet Materiallager getrennt vom Überlauf", () => {
    const s = fresh();
    addItem(s.inventory, content, A1.id, 2);
    const pick = [{ source: "inventory" as const, itemId: A1.id, instanceId: null, qty: 2 }];
    const out = salvagePicks(s, content, pick);
    expect(out.toBank).toBe(0);
    expect(out.toMail).toBe(0);
    const s2 = fresh();
    s2.settings.materialsToStorage = false;
    addItem(s2.inventory, content, A1.id, 2);
    const out2 = salvagePicks(s2, content, pick);
    expect(out2.toStorage).toBe(0);
    expect(out2.toBank).toBe(0);
  });

  it("Vorschau ignoriert Hergestelltes", () => {
    const p = salvagePreview(content, [{ source: "inventory", itemId: "copper_sword", instanceId: null, qty: 3 }]);
    expect(p).toEqual({ pieces: 0, items: [], dust: 0 });
    const s = fresh();
    addItem(s.inventory, content, "copper_sword", 3);
    expect(salvagePicks(s, content, [{ source: "inventory", itemId: "copper_sword", instanceId: null, qty: 3 }]).pieces).toBe(0);
    expect(itemCount(s.inventory, "copper_sword")).toBe(3);
  });

  it("deterministisch: gleicher Stand, gleiche Auswahl, gleiches Ergebnis", () => {
    const run = () => {
      const s = fresh();
      addItem(s.inventory, content, A1.id, 4);
      s.bank[B1.id] = 2;
      const plan = salvageRarityPlan(s, content, { sources: ["inventory", "bank"], rarity: RA });
      const out = salvagePicks(s, content, [...plan.picks, { source: "bank", itemId: B1.id, instanceId: null, qty: 2 }]);
      return { out, inv: itemCount(s.inventory, RELIC_DUST_ITEM_ID), y: salvageYield(content, A1.id) };
    };
    expect(run()).toEqual(run());
  });
});
