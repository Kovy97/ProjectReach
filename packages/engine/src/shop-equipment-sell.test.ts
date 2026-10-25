// claude:2026-10-25T10:32:00+01:00 — Sammelverkauf von Ausrüstung (1.4.1 K1). Prüft Art-/Seltenheitsfilter, alle
// Ausschlüsse (Schloss, Runen, Werkzeug, Meisterring, Arbeitsauftrag, angelegt), Preisgleichheit mit dem Einzelverkauf,
// Bank-Quelle samt Fächern, kein Rückkauf-Eintrag und tausende Einzelstücke in einem Zug.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, ItemInstance, WorkOrder } from "@hearthforge/shared";
import { createGame } from "./state";
import { addItem, itemCount } from "./inventory";
import { toggleSalvageLock } from "./salvage";
import {
  effectiveSellPrice,
  equipmentSellKind,
  equipmentSellPlan,
  sellEquipmentBatch,
  sellInstance,
  sellItem,
} from "./shop";
import type { EquipmentSellOptions } from "./shop";

const COMMON_SWORD = "rusty_sword"; // common, Haupthand
const RARE_SWORD = "iron_sword"; // rare
const SUPER_RARE_SWORD = "mithril_sword"; // superRare
const COMMON_HELM = "leather_helm"; // ohne Rarität = common
const RING = "garnet_ring"; // ohne Rarität = common
const AMULET = "garnet_amulet";
const AXE = "bronze_axe"; // Ausrüstung mit Werkzeug-Feld
const MASTER_RING = "ring_master_mining";

function fresh(): GameState {
  const s = createGame({ name: "Händler" }, content, 7);
  // Startbestand (Essen, Samen) stört nicht, aber leere Fächer machen die Zählungen eindeutig.
  for (let i = 0; i < s.inventory.slots.length; i++) s.inventory.slots[i] = null;
  s.inventory.instances = [];
  s.character.gold = 0;
  s.buyBack = [];
  return s;
}

let seq = 0;
function inst(baseItemId: string, runes = false): ItemInstance {
  seq++;
  return {
    instanceId: `t-${seq}`,
    baseItemId,
    affixes: runes ? [{ affixId: "sharp", tier: 1 } as unknown as ItemInstance["affixes"][number]] : [],
  };
}

const INV_ALL: EquipmentSellOptions = { kind: "all", maxRarity: "epic", source: "inventory" };

describe("Sammelverkauf: Art und Seltenheit", () => {
  it("ordnet Waffen, Rüstung und Schmuck zu; Werkzeug-Typ und Material sind keine Ausrüstung", () => {
    expect(equipmentSellKind(content.items[COMMON_SWORD])).toBe("weapons");
    expect(equipmentSellKind(content.items["aetherium_quiver"])).toBe("weapons");
    expect(equipmentSellKind(content.items[COMMON_HELM])).toBe("armor");
    expect(equipmentSellKind(content.items["wooden_shield"])).toBe("armor");
    expect(equipmentSellKind(content.items[RING])).toBe("jewelry");
    expect(equipmentSellKind(content.items[AMULET])).toBe("jewelry");
    expect(equipmentSellKind(content.items["bronze_pickaxe"])).toBeNull();
    expect(equipmentSellKind(content.items["cooked_shrimp"])).toBeNull();
  });

  it("filtert nach Art und zählt je Art", () => {
    const s = fresh();
    addItem(s.inventory, content, COMMON_SWORD, 30);
    addItem(s.inventory, content, COMMON_HELM, 4);
    addItem(s.inventory, content, RING, 2);
    addItem(s.inventory, content, "cooked_shrimp", 50);
    const weapons = equipmentSellPlan(s, content, { ...INV_ALL, kind: "weapons" });
    expect(weapons.entries.map((e) => e.itemId)).toEqual([COMMON_SWORD]);
    const all = equipmentSellPlan(s, content, INV_ALL);
    expect(all.byKind.weapons.pieces).toBe(30);
    expect(all.byKind.armor.pieces).toBe(4);
    expect(all.byKind.jewelry.pieces).toBe(2);
    expect(all.pieces).toBe(36);
    expect(all.entries.some((e) => e.itemId === "cooked_shrimp")).toBe(false);
  });

  it("Seltenheit gilt einschließlich", () => {
    const s = fresh();
    addItem(s.inventory, content, COMMON_SWORD, 1);
    addItem(s.inventory, content, RARE_SWORD, 1);
    addItem(s.inventory, content, SUPER_RARE_SWORD, 1);
    const ids = (max: EquipmentSellOptions["maxRarity"]): string[] =>
      equipmentSellPlan(s, content, { ...INV_ALL, maxRarity: max }).entries.map((e) => e.itemId);
    expect(ids("common")).toEqual([COMMON_SWORD]);
    expect(ids("rare")).toEqual([COMMON_SWORD, RARE_SWORD]);
    expect(ids("superRare")).toEqual([COMMON_SWORD, RARE_SWORD, SUPER_RARE_SWORD]);
  });
});

describe("Sammelverkauf: Ausschlüsse", () => {
  it("Schloss auf der Item-ID schützt Stapel und alle Einzelstücke, Schloss auf der Instanz nur dieses", () => {
    const s = fresh();
    addItem(s.inventory, content, COMMON_SWORD, 5);
    const a = inst(COMMON_SWORD);
    const b = inst(COMMON_SWORD);
    s.inventory.instances.push(a, b);
    toggleSalvageLock(s, COMMON_SWORD);
    let plan = equipmentSellPlan(s, content, INV_ALL);
    expect(plan.entries).toEqual([]);
    expect(plan.skipped.locked).toBe(7);

    toggleSalvageLock(s, COMMON_SWORD); // wieder frei
    toggleSalvageLock(s, a.instanceId);
    plan = equipmentSellPlan(s, content, INV_ALL);
    expect(plan.entries[0]!.stackQty).toBe(5);
    expect(plan.entries[0]!.instanceIds).toEqual([b.instanceId]);
    expect(plan.skipped.locked).toBe(1);

    sellEquipmentBatch(s, content, INV_ALL);
    expect(s.inventory.instances.map((i) => i.instanceId)).toEqual([a.instanceId]);
    expect(itemCount(s.inventory, COMMON_SWORD)).toBe(0);
  });

  it("Einzelstücke mit Runen bleiben, ohne Runen gehen mit", () => {
    const s = fresh();
    const runed = inst(COMMON_SWORD, true);
    const plain = inst(COMMON_SWORD);
    s.inventory.instances.push(runed, plain);
    const plan = equipmentSellPlan(s, content, INV_ALL);
    expect(plan.skipped.runes).toBe(1);
    expect(plan.entries[0]!.instanceIds).toEqual([plain.instanceId]);
    sellEquipmentBatch(s, content, INV_ALL);
    expect(s.inventory.instances).toEqual([runed]);
  });

  it("Äxte (Werkzeug), Meisterringe und Teile offener Arbeitsaufträge bleiben", () => {
    const s = fresh();
    expect(content.items[AXE]?.tool).toBeTruthy();
    expect(content.items[MASTER_RING]).toBeTruthy();
    addItem(s.inventory, content, AXE, 3);
    addItem(s.inventory, content, MASTER_RING, 1);
    addItem(s.inventory, content, RARE_SWORD, 2);
    addItem(s.inventory, content, COMMON_SWORD, 2);
    const order = { id: 1, kind: "produce", skill: "smithing", actionId: "x", itemId: RARE_SWORD, count: 2 } as unknown as WorkOrder;
    s.workOrders!.open.push(order);
    const plan = equipmentSellPlan(s, content, { ...INV_ALL, maxRarity: "legendary" });
    expect(plan.entries.map((e) => e.itemId)).toEqual([COMMON_SWORD]);
    expect(plan.skipped.tools).toBe(3);
    expect(plan.skipped.masterRings).toBe(1);
    expect(plan.skipped.orders).toBe(2);
    sellEquipmentBatch(s, content, { ...INV_ALL, maxRarity: "legendary" });
    expect(itemCount(s.inventory, AXE)).toBe(3);
    expect(itemCount(s.inventory, MASTER_RING)).toBe(1);
    expect(itemCount(s.inventory, RARE_SWORD)).toBe(2);
    expect(itemCount(s.inventory, COMMON_SWORD)).toBe(0);
  });

  it("angelegte Ausrüstung und Kits bleiben unberührt", () => {
    const s = fresh();
    s.character.equipment.mainhand = COMMON_SWORD;
    s.character.equipment.helmet = COMMON_HELM;
    addItem(s.inventory, content, COMMON_SWORD, 3);
    const kitsBefore = JSON.stringify(s.equipKits);
    sellEquipmentBatch(s, content, INV_ALL);
    expect(s.character.equipment.mainhand).toBe(COMMON_SWORD);
    expect(s.character.equipment.helmet).toBe(COMMON_HELM);
    expect(JSON.stringify(s.equipKits)).toBe(kitsBefore);
    expect(itemCount(s.inventory, COMMON_SWORD)).toBe(0);
  });
});

describe("Sammelverkauf: Gold und Rückkauf", () => {
  it("zahlt exakt so viel wie die Einzelverkäufe und meldet dasselbe wie die Vorschau", () => {
    const build = (): GameState => {
      seq = 1000;
      const s = fresh();
      addItem(s.inventory, content, COMMON_SWORD, 40);
      addItem(s.inventory, content, COMMON_HELM, 7);
      addItem(s.inventory, content, RING, 3);
      s.inventory.instances.push(inst(RARE_SWORD), inst(RARE_SWORD), inst(AMULET));
      return s;
    };
    const batch = build();
    const plan = equipmentSellPlan(batch, content, INV_ALL);
    const res = sellEquipmentBatch(batch, content, INV_ALL);
    expect(res.pieces).toBe(plan.pieces);
    expect(res.gold).toBe(plan.gold);
    expect(res.kinds).toBe(plan.entries.length);
    expect(res.byKind).toEqual(plan.byKind);
    expect(batch.character.gold).toBe(res.gold);

    const single = build();
    let gold = 0;
    gold += sellItem(single, content, COMMON_SWORD, 40);
    gold += sellItem(single, content, COMMON_HELM, 7);
    gold += sellItem(single, content, RING, 3);
    for (const i of [...single.inventory.instances]) gold += sellInstance(single, content, i.instanceId);
    expect(res.gold).toBe(gold);
    expect(res.gold).toBe(40 * effectiveSellPrice(batch, content, COMMON_SWORD) + 7 * effectiveSellPrice(batch, content, COMMON_HELM)
      + 3 * effectiveSellPrice(batch, content, RING) + 2 * effectiveSellPrice(batch, content, RARE_SWORD)
      + effectiveSellPrice(batch, content, AMULET));
  });

  it("legt keine Rückkauf-Einträge an und lässt bestehende stehen", () => {
    const s = fresh();
    s.buyBack = [{ itemId: "cooked_shrimp", qty: 2, price: 3 }];
    addItem(s.inventory, content, COMMON_SWORD, 10);
    s.inventory.instances.push(inst(COMMON_SWORD));
    sellEquipmentBatch(s, content, INV_ALL);
    expect(s.buyBack).toEqual([{ itemId: "cooked_shrimp", qty: 2, price: 3 }]);
  });

  it("leerer Plan ändert nichts", () => {
    const s = fresh();
    addItem(s.inventory, content, "cooked_shrimp", 5);
    const before = JSON.stringify(s);
    const res = sellEquipmentBatch(s, content, INV_ALL);
    expect(res).toMatchObject({ pieces: 0, gold: 0, kinds: 0 });
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe("Sammelverkauf: Bank", () => {
  it("verkauft Bankstapel und Gear-Vault, Inventar bleibt, Fächer werden frei", () => {
    const s = fresh();
    addItem(s.inventory, content, COMMON_SWORD, 4);
    s.bank[COMMON_SWORD] = 120;
    s.bank[COMMON_HELM] = 9;
    s.bank["cooked_shrimp"] = 30;
    const vaultOnly = inst(RARE_SWORD);
    const runed = inst(RARE_SWORD, true);
    s.bankInstances.push(vaultOnly, runed, inst(COMMON_SWORD));
    s.bankOrder = [COMMON_SWORD, COMMON_HELM, "cooked_shrimp", RARE_SWORD];
    const opts: EquipmentSellOptions = { kind: "all", maxRarity: "rare", source: "bank" };
    const plan = equipmentSellPlan(s, content, opts);
    expect(plan.pieces).toBe(120 + 9 + 1 + 1);
    const res = sellEquipmentBatch(s, content, opts);
    expect(res.pieces).toBe(plan.pieces);
    expect(res.gold).toBe(plan.gold);
    expect(s.bank[COMMON_SWORD]).toBeUndefined();
    expect(s.bank[COMMON_HELM]).toBeUndefined();
    expect(s.bank["cooked_shrimp"]).toBe(30);
    expect(s.bankInstances).toEqual([runed]); // Runen bleiben, Fach der Basis bleibt dadurch belegt
    expect(itemCount(s.inventory, COMMON_SWORD)).toBe(4);
    // Geleerte Fächer bleiben leer stehen (wie beim Abheben), belegte behalten ihren Platz.
    expect(s.bankOrder.slice(0, 4)).toEqual([null, null, "cooked_shrimp", RARE_SWORD]);
  });
});

describe("Sammelverkauf: Menge", () => {
  it("tausende Einzelstücke und volle Stapel in einem Zug, ohne quadratische Laufzeit", () => {
    const s = fresh();
    addItem(s.inventory, content, COMMON_SWORD, 9999);
    addItem(s.inventory, content, COMMON_HELM, 9999);
    const keep: ItemInstance[] = [];
    for (let i = 0; i < 20_000; i++) {
      const x = inst(i % 2 === 0 ? COMMON_SWORD : RARE_SWORD, i % 1000 === 0);
      s.inventory.instances.push(x);
      if (i % 1000 === 0) keep.push(x);
    }
    const t0 = performance.now();
    const res = sellEquipmentBatch(s, content, INV_ALL);
    const ms = performance.now() - t0;
    expect(res.pieces).toBe(9999 * 2 + 20_000 - keep.length);
    expect(s.inventory.instances).toEqual(keep);
    expect(itemCount(s.inventory, COMMON_SWORD)).toBe(0);
    // Großzügige Schranke (paralleler Rechner): die alte Einzelpfad-Schleife läge hier im Sekundenbereich.
    expect(ms).toBeLessThan(1500);
  });

  it("deterministisch: gleicher Stand, gleiches Ergebnis", () => {
    // Ein Stand, tief kopiert: createGame zieht für Nebenströme eigene Startwerte, zwei Neuanlagen wären nie bitgleich.
    const a = fresh();
    addItem(a.inventory, content, COMMON_SWORD, 12);
    for (let i = 0; i < 50; i++) a.inventory.instances.push(inst(i % 3 ? RARE_SWORD : RING));
    const b = structuredClone(a);
    expect(sellEquipmentBatch(a, content, INV_ALL)).toEqual(sellEquipmentBatch(b, content, INV_ALL));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
