// claude:2026-10-26T10:30:00+02:00 — QA-Prüfrunde 1.4.0 „Materiallager und Bergung“ (Kontrolleur). Nachweis-Tests für
// Befunde; neue Datei, keine bestehende geändert. Tests, die einen OFFENEN Befund belegen, stehen als `it.fails`
// (grün = Fehler reproduziert). Nach dem Fix auf `it` umstellen.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemInstance } from "@hearthforge/shared";
import { RELIC_DUST_ITEM_ID, effectiveBankCapacity } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { addInstance, addItem, itemCount } from "./inventory";
import { depositItemGroup, withdrawItemGroup } from "./bank";
import { isStorageItem } from "./storage";
import { isSalvageable, salvageInstance, salvagePlan, salvageYield, toggleSalvageLock } from "./salvage";
import { enqueueAction } from "./actions";
import { advance } from "./tick";
import { claimQuest } from "./quests";

const nonStorageIds = Object.keys(content.items).filter((id) => !isStorageItem(content, id) && content.items[id]!.type !== "equipment");

/** Bank bis zur Kapazität mit NICHT-Lagerware füllen (distinkte Arten). */
function fillBank(s: ReturnType<typeof createTestGame>): void {
  const cap = effectiveBankCapacity(s, content);
  for (const id of nonStorageIds.slice(0, cap)) s.bank[id] = 1;
}

/** Inventar bis auf `free` Fächer mit distinkten Nicht-Lager-Items füllen. */
function fillInventory(s: ReturnType<typeof createTestGame>, free: number): void {
  const n = s.inventory.slots.length - free;
  let i = 0;
  for (const id of nonStorageIds) {
    if (i >= n) break;
    if (s.inventory.slots.some((x) => x?.itemId === id)) continue;
    addItem(s.inventory, content, id, 1);
    i++;
  }
}

const mkInst = (id: string, baseItemId: string, affixes: ItemInstance["affixes"] = []): ItemInstance => ({ instanceId: id, baseItemId, affixes });

describe("QA Bergung: Raid-Teile (Goal Z. 633: „Raid-Gegenstände sind zerlegbar (A13)“)", () => {
  const raid = Object.keys(content.items).filter((id) => id.startsWith("gk_") && content.items[id]!.type === "equipment");

  it("es gibt 93 Raid-Teile in drei Fassungen", () => {
    expect(raid.length).toBe(93);
    expect(raid.filter((id) => content.items[id]!.rarity === "heroic").length).toBe(31);
    expect(raid.filter((id) => content.items[id]!.rarity === "mythic").length).toBe(31);
  });

  // BEFUND P2: drop-sources.ts indiziert `content.raids` nicht (Raum-Tabellen, Trash-Teile, Wochentruhe); die Raid-Monster
  // tragen `loot: []`. Damit hat kein Raid-Teil eine Drop-Quelle und `isSalvageable` ist für alle 93 false, obwohl
  // RELIC_DUST_BY_RARITY heroic 40 / mythic 60 und die Leiter-Stufe XIII genau dafür angelegt sind.
  it("[offen] Raid-Teile sind zerlegbar: Normal, Heroisch, Mythisch", () => {
    const notSalvageable = raid.filter((id) => !isSalvageable(content, id));
    expect(notSalvageable).toEqual([]);
  });

  it("[offen] Ertrag eines mythischen Raid-Teils: Götteisen-Stufe plus 60 Reliktstaub", () => {
    const y = salvageYield(content, "gk_bleed_chest_mythic");
    expect(y).not.toBeNull();
    expect(y!.dust).toBe(60);
    expect(y!.items.map((i) => i.itemId)).toContain("godiron_bar");
  });
});

describe("QA Lager: Bank-Gruppen-Operationen", () => {
  // BEFUND P2: `depositItemGroup` (Bank-Seite: „Stapel einlagern“, Shift-Klick, Drag&Drop) prüft `isBankFull`, obwohl
  // Lagerware keinen Bankplatz braucht (`canDeposit` weiß das). Bei voller Bank lehnt die Bank-Seite neue Materialien
  // mit „bank.noSlot“ ab; „Alles einlagern“ (depositItem) nimmt dieselben Materialien an.
  it("[offen] Stapel einlagern (depositItemGroup) nimmt Lagerware auch bei voller Bank", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    fillBank(s);
    addItem(s.inventory, content, "copper_ore", 5);
    expect(s.bank.copper_ore).toBeUndefined();
    const res = depositItemGroup(s, content, "copper_ore");
    expect(res.deposited).toBe(5);
    expect(s.bank.copper_ore).toBe(5);
  });

  // BEFUND P1 (Bestand, nicht neu in 1.4.0, aber im Bereich Bank-Fächer): `withdrawItemGroup` löscht den Bankbestand
  // und ruft `addItem` ohne den Rückgabewert zu prüfen. Passt der Stapel nicht ganz ins Inventar (ein freies Fach,
  // Stapel > MAX_STACK), ist der Rest WEG. Erreichbar über Bank-Seite „ganzen Stapel abheben“/Shift-Klick/Drag.
  it("[offen] Ganzen Stapel abheben (withdrawItemGroup) verliert nichts, wenn das Inventar nicht alles fasst", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    fillInventory(s, 1);
    s.bank.cooked_trout = 25_000;
    const before = 25_000 + itemCount(s.inventory, "cooked_trout"); // Füller kann schon eine Forelle enthalten
    withdrawItemGroup(s, content, "cooked_trout");
    const after = itemCount(s.inventory, "cooked_trout") + (s.bank.cooked_trout ?? 0);
    expect(after).toBe(before);
  });
});

describe("QA Bergung: Schloss, Runen, Sammel-Knopf", () => {
  it("Basis-Schloss blockiert auch das Einzelstück (Engine); UI zeigt beim Einzelstück aber nur das Instanz-Schloss", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    addInstance(s.inventory, mkInst("i1", "goblin_warkilt"));
    toggleSalvageLock(s, "goblin_warkilt"); // Stapel-Schloss auf der Basis
    expect(salvageInstance(s, content, "i1")).toBe(false); // engine: salvage.ts:178
    expect(s.inventory.instances.length).toBe(1);
  });

  it("Sammel-Knopf: Einzelstück mit Runen und gesperrtes Einzelstück bleiben liegen, Suffix-Stück ohne Runen kommt mit", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    addInstance(s.inventory, mkInst("runed", "goblin_warkilt", [{ affixId: "keen", tier: 1 } as never]));
    addInstance(s.inventory, mkInst("locked", "goblin_warkilt"));
    addInstance(s.inventory, mkInst("plain", "goblin_warkilt"));
    toggleSalvageLock(s, "locked");
    const plan = salvagePlan(s, content, "epic");
    expect(plan.map((e) => e.instanceId)).toEqual(["plain"]);
  });

  it("Sammel-Knopf bis Episch nimmt kein legendäres/göttliches Teil", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    const legendary = Object.keys(content.items).find((id) => isSalvageable(content, id) && content.items[id]!.rarity === "legendary")!;
    addItem(s.inventory, content, legendary, 1);
    addItem(s.inventory, content, "goblin_warkilt", 1);
    expect(salvagePlan(s, content, "epic").map((e) => e.itemId)).toEqual(["goblin_warkilt"]);
  });

  it("Zerlegen zahlt bei „Direkt ins Lager“ Material und Staub ins Lager, nicht ins Inventar", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    s.settings.materialsToStorage = true;
    addInstance(s.inventory, mkInst("x", "goblin_warkilt"));
    expect(salvageInstance(s, content, "x")).toBe(true);
    expect(itemCount(s.inventory, "steel_bar")).toBe(0);
    expect(s.bank.steel_bar).toBe(3);
    expect(s.bank[RELIC_DUST_ITEM_ID]).toBe(1);
  });
});

describe("QA Lager: Warteschlange, Offline-Funde, Quest-Belohnung", () => {
  it("Warteschlangen-Rezept nimmt Material aus dem Lager, Ertrag geht ins Lager", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    s.settings.materialsToStorage = true;
    s.bank.copper_ore = 10;
    expect(enqueueAction(s, content, "smelt_copper", 3)).toBe(true);
    advance(s, content, 30_000);
    expect(s.bank.copper_ore).toBe(7);
    expect(s.bank.copper_bar).toBe(3);
    expect(itemCount(s.inventory, "copper_bar")).toBe(0);
  });

  it("Offline-Funde landen direkt im Lager, Inventar bleibt leer", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    s.settings.materialsToStorage = true;
    expect(enqueueAction(s, content, "mine_copper", null)).toBe(true);
    advance(s, content, 60_000, { offline: true });
    expect(s.bank.copper_ore ?? 0).toBeGreaterThan(0);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
  });

  // BEFUND P3: `canHoldRewards` (quests.ts:257-282) kennt „Direkt ins Lager“ nicht. Bei vollem Inventar UND voller Bank
  // lehnt claimQuest eine Belohnung aus Lagerware ab, obwohl grantLoot sie problemlos ins Lager legen würde.
  it("[offen] Quest-Belohnung aus Lagerware ist bei vollem Inventar und voller Bank einlösbar", () => {
    const s = createTestGame({ name: "Q" }, content, 1);
    s.settings.materialsToStorage = true;
    s.settings.autoBank = true;
    s.quests.claimed.push("chronicle_04");
    s.monsterKills.goblin_warchief = 1;
    fillInventory(s, 0);
    fillBank(s);
    expect(claimQuest(s, content, "chronicle_05")).toBe(true); // Belohnung: 15 dim_essence (Regal Essenzen)
    expect(s.bank.dim_essence).toBe(15);
  });
});
