// claude:2026-10-26T14:50:00+02:00 — QA-Runde 2 1.4.0 „Werkstatt“ (Kontrolleur): Zerlegen in der Bank (Chef BG1), Lager.
// Nachweis-Tests; `it.fails` = offener Befund (grün = Fehler reproduziert). Nach dem Fix auf `it` umstellen.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemInstance } from "@hearthforge/shared";
import { RELIC_DUST_ITEM_ID, effectiveBankCapacity } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { addItem, itemCount } from "./inventory";
import { isStorageItem } from "./storage";
import { sellPrice } from "./shop";
import { claimQuest } from "./quests";
import {
  isSalvageable,
  salvageBankInstance,
  salvageBankItem,
  salvageItem,
  salvageYield,
  toggleSalvageLock,
} from "./salvage";

const LOOT = "goblin_warkilt"; // Drop, selten, Stufe IV → 3 steel_bar + 1 Reliktstaub
const nonStorageIds = Object.keys(content.items).filter((id) => !isStorageItem(content, id) && content.items[id]!.type !== "equipment");
const mkInst = (id: string, baseItemId: string, affixes: ItemInstance["affixes"] = []): ItemInstance => ({ instanceId: id, baseItemId, affixes });

function fillBank(s: ReturnType<typeof createTestGame>): void {
  const cap = effectiveBankCapacity(s, content);
  for (const id of nonStorageIds.slice(0, cap)) s.bank[id] = 1;
}
function fillInventory(s: ReturnType<typeof createTestGame>): void {
  const n = s.inventory.slots.length;
  let i = 0;
  for (const id of nonStorageIds) {
    if (i >= n) break;
    if (s.inventory.slots.some((x) => x?.itemId === id)) continue;
    addItem(s.inventory, content, id, 1);
    i++;
  }
}
function matTotal(s: ReturnType<typeof createTestGame>, id: string): number {
  const mail = (s.mailbox ?? []).filter((m) => m.kind === "overflow").reduce((a, m) => a + (m.items.find((x) => x.itemId === id)?.qty ?? 0), 0);
  return itemCount(s.inventory, id) + (s.bank[id] ?? 0) + mail;
}

describe("QA2 Bergung in der Bank (BG1): Regeln wie im Inventar", () => {
  it("Ertrag je Stück identisch zum Inventar-Pfad, kein Doppelertrag, Bankfach wird frei", () => {
    const y = salvageYield(content, LOOT)!;
    const a = createTestGame({ name: "A" }, content, 1);
    const b = createTestGame({ name: "B" }, content, 1);
    a.bank[LOOT] = 2;
    addItem(b.inventory, content, LOOT, 2);
    expect(salvageBankItem(a, content, LOOT, 2)).toBe(2);
    expect(salvageItem(b, content, LOOT, 2)).toBe(2);
    for (const it of y.items) expect(matTotal(a, it.itemId)).toBe(matTotal(b, it.itemId));
    expect(matTotal(a, RELIC_DUST_ITEM_ID)).toBe(matTotal(b, RELIC_DUST_ITEM_ID));
    expect(matTotal(a, "steel_bar")).toBe(6);
    expect(a.bank[LOOT]).toBeUndefined();
    expect(a.bankOrder.includes(LOOT)).toBe(false);
    // Nach dem Bank-Zerlegen gibt es im Inventar nichts mehr zu zerlegen (kein zweiter Ertrag aus derselben Quelle).
    expect(salvageItem(a, content, LOOT, 1)).toBe(0);
    expect(salvageBankItem(a, content, LOOT, 1)).toBe(0);
  });

  it("Herkunftsregel gilt in der Bank: Hergestelltes, Shop-Ware, Meisterring bleiben; Raid-Teil ist zerlegbar", () => {
    const s = createTestGame({ name: "A" }, content, 1);
    for (const id of ["godiron_sword", "wooden_shield", "ring_master_mining"]) {
      s.bank[id] = 1;
      expect(salvageBankItem(s, content, id, 1), id).toBe(0);
      expect(s.bank[id], id).toBe(1);
    }
    s.bankInstances.push(mkInst("r1", "gk_bleed_chest_mythic"));
    expect(isSalvageable(content, "gk_bleed_chest_mythic")).toBe(true);
    expect(salvageBankInstance(s, content, "r1")).toBe(true);
    expect(matTotal(s, RELIC_DUST_ITEM_ID)).toBe(60);
    expect(matTotal(s, "godiron_bar")).toBeGreaterThan(0);
  });

  it("Kreislauf-Probe: Bergungs-Ertrag → herstellen → das Ergebnis ist nie wieder zerlegbar (auch über die Bank)", () => {
    // Jedes zerlegbare Teil liefert nur Lagerware; alles, was ein Rezept daraus macht, ist per Regel unzerlegbar.
    const crafted = new Set<string>();
    for (const a of Object.values(content.actions)) if ((a.inputs?.length ?? 0) > 0) for (const l of a.loot) crafted.add(l.itemId);
    const leaks = [...crafted].filter((id) => content.items[id]?.type === "equipment" && isSalvageable(content, id));
    expect(leaks).toEqual([]);
    // Zerlegen und Verkaufen bringt nie mehr Gold als direkt verkaufen (kein Gold-Trick über die Bank).
    const over: string[] = [];
    for (const id of Object.keys(content.items)) {
      if (!isSalvageable(content, id)) continue;
      const y = salvageYield(content, id)!;
      const G = y.dust * sellPrice(content, RELIC_DUST_ITEM_ID) + y.items.reduce((acc, it) => acc + it.qty * sellPrice(content, it.itemId), 0);
      if (G > sellPrice(content, id)) over.push(id);
    }
    expect(over).toEqual([]);
  });

  it("Schloss: Item-Schloss sperrt Stapel UND Einzelstück in der Bank; Instanz-Schloss nur das Stück; ausgerüstete Teile unberührt", () => {
    const s = createTestGame({ name: "A" }, content, 1);
    const equippedBefore = JSON.stringify(s.character.equipment);
    s.bank[LOOT] = 2;
    s.bankInstances.push(mkInst("i1", LOOT), mkInst("i2", LOOT));
    toggleSalvageLock(s, LOOT);
    expect(salvageBankItem(s, content, LOOT, 2)).toBe(0);
    expect(salvageBankInstance(s, content, "i1")).toBe(false);
    toggleSalvageLock(s, LOOT);
    toggleSalvageLock(s, "i1");
    expect(salvageBankInstance(s, content, "i1")).toBe(false);
    expect(salvageBankInstance(s, content, "i2")).toBe(true);
    expect(salvageBankItem(s, content, LOOT, 2)).toBe(2);
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["i1"]);
    expect(JSON.stringify(s.character.equipment)).toBe(equippedBefore);
  });

  it("Ertrag bei vollem Inventar: „Direkt ins Lager“ an → Lager; aus + Auto-Bank aus → Postfach, nichts geht verloren", () => {
    const on = createTestGame({ name: "A" }, content, 1);
    on.settings.materialsToStorage = true;
    fillInventory(on);
    fillBank(on);
    on.bank[LOOT] = 1;
    expect(salvageBankItem(on, content, LOOT, 1)).toBe(1);
    expect(on.bank.steel_bar).toBe(3);
    expect(on.bank[RELIC_DUST_ITEM_ID]).toBe(1);

    const off = createTestGame({ name: "B" }, content, 1);
    off.settings.materialsToStorage = false;
    off.settings.autoBank = false;
    fillInventory(off);
    off.bank[LOOT] = 1;
    expect(salvageBankItem(off, content, LOOT, 1)).toBe(1);
    expect(itemCount(off.inventory, "steel_bar")).toBe(0);
    expect(off.bank.steel_bar ?? 0).toBe(0);
    expect(matTotal(off, "steel_bar")).toBe(3); // im Überlauf-Postfach
    expect(matTotal(off, RELIC_DUST_ITEM_ID)).toBe(1);
  });

  // BEFUND (niedrig): salvageBankItem hat keinen Finite-Guard (depositItem/sellFromStorage/addItemOrBank haben ihn). Mit qty=NaN wird
  // `n` NaN, `n <= 0` ist false, `n >= have` ist false → `state.bank[LOOT] = have - NaN = NaN` (Bank vergiftet), payOut zahlt 0.
  // Aus der Oberfläche heute nicht erreichbar (qty ist 1 oder der Bankbestand), aber ein Alt-/Korrupt-Save-Pfad wie bei depositItem.
  // claude:2026-10-24T15:21:04+02:00 — Befund B3 behoben (Finite-Guard in salvageBankItem/salvageItem): it.fails → it.
  it("salvageBankItem(…, NaN) vergiftet den Bankbestand nicht, sondern liefert 0 (vorher salvage.ts:198-202)", () => {
    const s = createTestGame({ name: "A" }, content, 1);
    s.bank[LOOT] = 3;
    expect(salvageBankItem(s, content, LOOT, Number.NaN)).toBe(0);
    expect(s.bank[LOOT]).toBe(3);
  });
});

describe("QA2 Lager: Quest-Belohnung aus Lagerware", () => {
  // BEFUND (niedrig): canHoldRewards (quests.ts:269-272) kennt den Lager-Weg nur bei „Direkt ins Lager“ AN. Ist die Option AUS,
  // legt addItemOrBank (inventory.ts:219-223) Lagerware trotzdem ohne Bankplatz ins Lager, canHoldRewards lehnt aber ab:
  // Belohnung gilt als „passt nicht“, obwohl sie problemlos ankäme. Betroffen: Option aus + Auto-Bank an + Inventar und Bank voll.
  // claude:2026-10-24T15:21:04+02:00 — Befund B4 behoben (canHoldRewards kennt den Lager-Überlauf auch bei Option AUS): it.fails → it.
  it("Quest-Belohnung aus Lagerware bei „Direkt ins Lager“ AUS, Auto-Bank AN, Inventar und Bank voll ist einlösbar", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    s.settings.materialsToStorage = false;
    s.settings.autoBank = true;
    s.quests.claimed.push("chronicle_04");
    s.monsterKills.goblin_warchief = 1;
    fillInventory(s);
    fillBank(s);
    expect(claimQuest(s, content, "chronicle_05")).toBe(true); // Belohnung: 15 dim_essence (Regal Essenzen)
    expect(s.bank.dim_essence).toBe(15);
  });
});
