import { describe, expect, it } from "vitest";
import type { ContentDB } from "@hearthforge/shared";
import {
  addInstance,
  addItem,
  createInventory,
  effectiveCapacity,
  expandBaseCapacity,
  hasInstanceRoom,
  instanceCellCount,
  isFull,
  itemCount,
  removeItem,
  usedCapacityUnits,
  usedSlots,
} from "./inventory";

const content: ContentDB = {
  skills: {},
  actions: {},
  monsters: {},
  shop: [],
  achievements: [],
  zones: [],
  dungeons: [],
  categories: [],
  sets: [],
  quests: [],
  pets: {},
  items: {
    log: { id: "log", name: "Holz", type: "material", stackable: true },
    sword: { id: "sword", name: "Schwert", type: "equipment", stackable: false, slot: "mainhand" },
    // Ex-Taschen-Item: seit #278 ein gewöhnliches inertes Item (ItemType "bag"/bagCapacity gelöscht).
    pouch: { id: "pouch", name: "Beutel", type: "material", stackable: false },
  },
};

describe("inventory", () => {
  it("stapelt stapelbare Items in einem einzigen Slot", () => {
    const inv = createInventory(10);
    addItem(inv, content, "log", 5);
    addItem(inv, content, "log", 3);
    expect(itemCount(inv, "log")).toBe(8);
    expect(usedSlots(inv)).toBe(1);
  });

  it("stapelt ALLE Items bis MAX_STACK — auch ehemals nicht-stapelbare (Chef-Entscheid)", () => {
    const inv = createInventory(10);
    addItem(inv, content, "sword", 3);
    expect(usedSlots(inv)).toBe(1); // 3 Schwerter → EIN Stack (kein Slot-pro-Stück mehr)
    expect(itemCount(inv, "sword")).toBe(3);
  });

  it("verwirft Overflow, wenn alle Slots voll sind (über MAX_STACK hinaus)", () => {
    const inv = createInventory(1);
    // Chef-Entscheid 2026-07-18 (SAVE 69): MAX_STACK 999 → 9999.
    expect(addItem(inv, content, "sword", 10_500)).toBe(9999); // 1 Slot fasst 9999, der Rest fällt weg
    expect(isFull(inv)).toBe(true);
  });

  it("entfernt Items und gibt leere Slots frei", () => {
    const inv = createInventory(10);
    addItem(inv, content, "log", 10);
    expect(removeItem(inv, "log", 4)).toBe(4);
    expect(itemCount(inv, "log")).toBe(6);
    removeItem(inv, "log", 100);
    expect(usedSlots(inv)).toBe(0);
  });

  it("erweitert die Basis-Kapazität über Upgrades", () => {
    const inv = createInventory(2);
    addItem(inv, content, "sword", 1);
    addItem(inv, content, "log", 1); // 2 VERSCHIEDENE Items → 2 belegte Slots (alles stapelt)
    expect(isFull(inv)).toBe(true);
    expandBaseCapacity(inv, content, 3);
    expect(inv.slots.length).toBe(5);
    expect(isFull(inv)).toBe(false);
  });

  // ── Taschenslot-System: ENTFERNT (Task #271, SAVE_VERSION 56; No-ops gelöscht in #278) ─────
  // Kapazität kommt NUR noch aus `baseCapacity` (Gold-Shop-Upgrade). Der Guard-Test sichert:
  // effectiveCapacity ignoriert Taschen-Items komplett.

  it("effectiveCapacity = baseCapacity — Taschen-Items erweitern NICHTS mehr", () => {
    const inv = createInventory(2);
    expect(inv.bagSlots).toEqual([]); // Legacy-Feld bleibt leer
    expect(effectiveCapacity(inv, content)).toBe(2);
    addItem(inv, content, "pouch", 1); // Pouch im Inventar ist ein inertes Item
    expect(effectiveCapacity(inv, content)).toBe(2);
  });

  it("addItem: nicht-endliche Menge (NaN/Infinity) ist ein No-op (kein Slot-Vergiften)", () => {
    const inv = createInventory(10);
    addItem(inv, content, "log", 5);
    expect(addItem(inv, content, "log", Number.NaN)).toBe(0);
    expect(addItem(inv, content, "log", Number.POSITIVE_INFINITY)).toBe(0);
    // Bestehender Stack unverändert & endlich — NaN hat sich nicht in `qty` eingeschlichen.
    expect(itemCount(inv, "log")).toBe(5);
    expect(Number.isFinite(inv.slots[0]!.qty)).toBe(true);
  });

  // ── Kapazitäts-Gate für die Instanz-Tasche — „Zelle = Kapazitätseinheit" (Chef-Bugfix „22/20",
  // 2026-07-23, Follow-up 23.07.: Anzeige „21/20" bei nur 19 sichtbaren Zellen) ───────────────────
  // Pro Basis-Item genau EINE Zelle (Varianten-Container-Design): mehrere Instanzen derselben Basis-
  // Art teilen sich eine Zelle (gewollt günstig — seltene Drops sollen nicht künstlich Kapazität
  // fressen); nur eine BRAND NEUE Basis-Art (kein Slot, keine bestehende Instanz-Gruppe) braucht eine
  // zusätzliche Zelle. `instanceCellCount`/`usedCapacityUnits` MÜSSEN deckungsgleich mit
  // CharacterPage.tsx' `orphanInstanceGroups`-Render-Logik bleiben (dieselbe `groupInstancesByBase` +
  // derselbe `slotItemIds`-Filter).
  describe("instanceCellCount / usedCapacityUnits / hasInstanceRoom (Zellen-Kapazitäts-Gate)", () => {
    it("instanceCellCount: mehrere Instanzen DERSELBEN Basis-Art zählen als EINE Zelle", () => {
      const inv = createInventory(5);
      addInstance(inv, { instanceId: "i1", baseItemId: "sword", affixes: [] });
      addInstance(inv, { instanceId: "i2", baseItemId: "sword", affixes: [] });
      addInstance(inv, { instanceId: "i3", baseItemId: "sword", affixes: [] });
      expect(instanceCellCount(inv)).toBe(1); // 3 Instanzen, aber 1 Basis-Art → 1 Zelle
      expect(usedCapacityUnits(inv)).toBe(1); // keine Slots belegt
    });

    it("instanceCellCount: eine Instanz, deren Basis-Art bereits einen Stack-Slot hat, kostet 0 zusätzliche Zellen", () => {
      const inv = createInventory(5);
      addItem(inv, content, "sword", 1); // plain Stack-Slot für "sword"
      addInstance(inv, { instanceId: "i1", baseItemId: "sword", affixes: [] }); // teilt sich die Zelle
      addInstance(inv, { instanceId: "i2", baseItemId: "pouch", affixes: [] }); // eigene (orphan) Zelle
      expect(instanceCellCount(inv)).toBe(1); // nur "pouch" ist eine ZUSÄTZLICHE Zelle
      expect(usedCapacityUnits(inv)).toBe(2); // 1 Slot ("sword") + 1 orphan Zelle ("pouch")
    });

    it("hasInstanceRoom: eine weitere Instanz einer BEREITS vorhandenen Basis-Art ist IMMER erlaubt (teilt sich die Zelle)", () => {
      const inv = createInventory(1);
      addInstance(inv, { instanceId: "i1", baseItemId: "sword", affixes: [] }); // 1/1 Zellen belegt (voll)
      expect(usedCapacityUnits(inv)).toBe(1);
      expect(effectiveCapacity(inv, content)).toBe(1);
      // "sword" hat schon eine Zelle → eine weitere Instanz braucht 0 zusätzliche Einheiten, obwohl "voll".
      expect(hasInstanceRoom(inv, content, "sword")).toBe(true);
      // Eine BRAND NEUE Basis-Art bräuchte dagegen eine zusätzliche Zelle → keine mehr frei.
      expect(hasInstanceRoom(inv, content, "pouch")).toBe(false);
    });

    it("hasInstanceRoom: eine Instanz einer Basis-Art, die schon einen plain Stack-Slot belegt, teilt sich dessen Zelle", () => {
      const inv = createInventory(1);
      addItem(inv, content, "sword", 1); // 1/1 Slots belegt (voll) — kein Instanz-Eintrag nötig
      expect(hasInstanceRoom(inv, content, "sword")).toBe(true); // teilt sich den Stack-Slot
      expect(hasInstanceRoom(inv, content, "pouch")).toBe(false); // bräuchte eine neue Zelle, keine frei
    });

    it("hasInstanceRoom: true solange eine NEUE Basis-Art noch eine freie Zelle findet, false sobald alle Zellen belegt sind", () => {
      const inv = createInventory(2);
      addItem(inv, content, "log", 1); // 1/2 Zellen belegt
      expect(hasInstanceRoom(inv, content, "sword")).toBe(true); // "sword" ist neu, aber noch 1 Zelle frei
      addInstance(inv, { instanceId: "i1", baseItemId: "sword", affixes: [] }); // 2/2 Zellen belegt
      expect(hasInstanceRoom(inv, content, "pouch")).toBe(false); // "pouch" ist neu UND alles voll
      expect(hasInstanceRoom(inv, content, "sword")).toBe(true); // "sword" teilt sich weiter seine Zelle
    });

    it("hasInstanceRoom: bei einem historisch übervollen Bestand (Slots allein > Kapazität) ist eine NEUE Basis-Art sofort false", () => {
      // Alt-Save-Fall (s. InventoryState-Doku, Pouch-Entfall SAVE_VERSION 56): `slots.length`/`usedSlots`
      // können die effektive Kapazität bereits allein überschreiten — kein Sanitize-Wegräumen, aber
      // NEUER Instanz-Zugang (einer bislang unbesessenen Basis-Art) darf nicht mehr in die Tasche wachsen.
      const inv = createInventory(2);
      inv.slots = [{ itemId: "log", qty: 1 }, { itemId: "sword", qty: 1 }, { itemId: "log", qty: 1 }];
      expect(usedSlots(inv)).toBe(3);
      expect(effectiveCapacity(inv, content)).toBe(2);
      expect(hasInstanceRoom(inv, content, "pouch")).toBe(false); // brandneue Basis-Art
      expect(hasInstanceRoom(inv, content, "sword")).toBe(true); // "sword" hat schon einen Slot
    });
  });
});
