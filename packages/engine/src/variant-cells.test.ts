import { describe, expect, it } from "vitest";
import type { GameState, InventoryState, ItemInstance } from "@hearthforge/shared";
import { PARAGON_KEY_ITEM_ID } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import {
  addInstance,
  addItem,
  addItemOrBank,
  canHold,
  compactInventory,
  freeSlots,
  hasInstanceRoom,
  instanceCellCount,
  isFull,
  legacyVariantCellLayout,
  moveInventorySlot,
  pureVariantBases,
  removeInstance,
  removeItem,
  slotsFreedByInstanceRemoval,
  sortInventory,
  syncVariantCells,
  usedCapacityUnits,
  variantCellIndex,
} from "./inventory";
import { equipInstance } from "./equipment";
import { createGame } from "./state";
import { advance } from "./tick";

/**
 * claude:2026-10-25T18:05:00+01:00 — SAVE 98, Chef-Report 25.10.2026: „Items verschieben sich nach Restart von selbst. Habe vom
 * letzten Slot ein Item weggezogen, dann ist ein anderes Item hineingesprungen, was nicht mehr draggable ist.“
 *
 * Reine Variantengruppen (nur verzauberte/gesuffixte Instanzen, kein Grundstapel) haben jetzt ein gespeichertes Fach
 * (`inventory.variantCells`). Geprüft: Vergabe/Bereinigung (`syncVariantCells`), Beute überspringt reservierte Fächer, alle
 * Zug-Fälle, Kompaktieren/Sortieren, Kapazität voll/übervoll ohne Verlust, alte Anzeige-Logik für die Migration, Determinismus.
 */

let seq = 0;
const inst = (baseItemId: string): ItemInstance => ({
  instanceId: `t-${++seq}`,
  baseItemId,
  affixes: [],
  suffix: { suffixId: "of_the_bear", ilvl: 10, roll: 0.5 },
});

/** Inventar aus Fach-Belegung (Item-ID oder null), Instanz-Basen und optionalen Reservierungen. */
function inv(slots: Array<string | null>, instanzen: string[] = [], cells?: Record<string, number>): InventoryState {
  return {
    baseCapacity: slots.length,
    bagSlots: [],
    slots: slots.map((id) => (id === null ? null : { itemId: id, qty: 1 })),
    instances: instanzen.map(inst),
    variantCells: cells ?? {},
  };
}
const belegung = (i: InventoryState): Array<string | null> => i.slots.map((s) => (s === null ? null : s.itemId));
/** Sichtbares Raster: Stapel-ID, „V:basis“ für Variantenzellen, null für leer. */
const raster = (i: InventoryState): Array<string | null> => {
  const zellen = variantCellIndex(i);
  return i.slots.map((s, k) => (s ? s.itemId : zellen.has(k) ? `V:${zellen.get(k)}` : null));
};

describe("syncVariantCells: Vergabe", () => {
  it("neue reine Gruppen nehmen die ersten freien Fächer hinter dem letzten belegten (Reihenfolge der Instanzen)", () => {
    const i = inv(["copper_ore", null, "oak_log", null, null, null], ["rusty_sword", "gnarled_staff"]);
    expect(syncVariantCells(i)).toBe(true);
    expect(i.variantCells).toEqual({ rusty_sword: 3, gnarled_staff: 4 });
    expect(syncVariantCells(i)).toBe(false); // idempotent
  });

  it("hinten kein Platz: erstes freies Fach davor", () => {
    const i = inv(["copper_ore", null, null, "oak_log"], ["rusty_sword", "gnarled_staff"]);
    syncVariantCells(i);
    expect(i.variantCells).toEqual({ rusty_sword: 1, gnarled_staff: 2 });
  });

  it("bestehende Reservierungen zählen beim „letzten belegten Fach“ mit", () => {
    const i = inv(["copper_ore", null, null, null, null], ["rusty_sword", "gnarled_staff"], { rusty_sword: 2 });
    syncVariantCells(i);
    expect(i.variantCells).toEqual({ rusty_sword: 2, gnarled_staff: 3 });
  });

  it("kein freies Fach: kein Eintrag (fachlos); wird eines frei, bekommt die Gruppe es", () => {
    const i = inv(["copper_ore", "oak_log"], ["rusty_sword"]);
    syncVariantCells(i);
    expect(i.variantCells).toEqual({});
    expect(usedCapacityUnits(i)).toBe(3); // übervoll, ehrlich gezählt
    removeItem(i, "oak_log", 1);
    expect(i.variantCells).toEqual({ rusty_sword: 1 });
    expect(usedCapacityUnits(i)).toBe(2);
  });

  it("Gruppe mit Grundstapel ist nicht rein und bekommt kein eigenes Fach", () => {
    const i = inv(["rusty_sword", null, null], ["rusty_sword", "rusty_sword"]);
    syncVariantCells(i);
    expect(i.variantCells).toEqual({});
    expect(pureVariantBases(i)).toEqual([]);
    expect(instanceCellCount(i)).toBe(0);
  });
});

describe("syncVariantCells: Bereinigung", () => {
  it("entfernt Einträge ohne Instanzen, mit Grundstapel, außerhalb, auf belegtem Fach, unganz; Doppelte: erster gewinnt", () => {
    const i = inv(
      ["copper_ore", "rusty_sword", null, null, null, null],
      ["rusty_sword", "gnarled_staff", "cracked_bow", "leather_helm", "leather_body"],
      {
        oak_log: 2, // keine Instanzen
        rusty_sword: 3, // Grundstapel liegt in Fach 1
        gnarled_staff: 99, // außerhalb
        cracked_bow: 0, // Fach belegt
        leather_helm: 4,
        leather_body: 4, // doppelt
      },
    );
    syncVariantCells(i);
    // leather_helm behält 4; gnarled_staff/cracked_bow/leather_body werden neu vergeben (hinter dem letzten belegten oder
    // reservierten Fach = 4 → 5, dann davor 2, 3) in Instanz-Reihenfolge.
    expect(i.variantCells).toEqual({ leather_helm: 4, gnarled_staff: 5, cracked_bow: 2, leather_body: 3 });
  });

  it("verträgt Müll im Feld (Array, null, String, Bruchzahlen, negative Indizes)", () => {
    for (const muell of [[1, 2], null, "x", { rusty_sword: 1.5 }, { rusty_sword: -1 }, { rusty_sword: "2" }]) {
      const i = inv(["copper_ore", null, null], ["rusty_sword"]);
      (i as unknown as Record<string, unknown>).variantCells = muell;
      syncVariantCells(i);
      expect(i.variantCells).toEqual({ rusty_sword: 1 });
    }
  });

  it("schreibt immer ein neues Objekt (der Rohwert bleibt unberührt)", () => {
    const roh = { rusty_sword: 2, oak_log: 1 };
    const i = inv(["copper_ore", null, null], ["rusty_sword"], roh);
    syncVariantCells(i);
    expect(roh).toEqual({ rusty_sword: 2, oak_log: 1 });
    expect(i.variantCells).toEqual({ rusty_sword: 2 });
  });
});

describe("addItem mit Reservierungen", () => {
  it("überspringt reservierte Fächer, auch beim Ermitteln des letzten belegten Fachs", () => {
    const i = inv(["copper_ore", null, null, null], ["rusty_sword"], { rusty_sword: 2 });
    addItem(i, content, "oak_log", 1);
    // letztes belegt/reserviert = 2 → Fund auf 3 (nicht in die Zelle, nicht in die Lücke 1)
    expect(raster(i)).toEqual(["copper_ore", null, "V:rusty_sword", "oak_log"]);
    addItem(i, content, "raw_hide", 1);
    expect(raster(i)).toEqual(["copper_ore", "raw_hide", "V:rusty_sword", "oak_log"]);
  });

  it("nur noch reservierte Fächer frei: nichts wird abgelegt (kein Überschreiben der Zelle)", () => {
    const i = inv(["copper_ore", null], ["rusty_sword"], { rusty_sword: 1 });
    expect(canHold(i, content, "oak_log")).toBe(false);
    expect(freeSlots(i)).toBe(0);
    expect(isFull(i)).toBe(true);
    expect(addItem(i, content, "oak_log", 1)).toBe(0);
    expect(raster(i)).toEqual(["copper_ore", "V:rusty_sword"]);
  });

  it("eigene Variantenzelle nimmt den ersten Grundstapel auf, die Zelle bleibt stehen", () => {
    const i = inv(["copper_ore", null, null, "oak_log", null], ["rusty_sword"], { rusty_sword: 1 });
    expect(canHold(i, content, "rusty_sword")).toBe(true);
    expect(addItem(i, content, "rusty_sword", 3)).toBe(3);
    expect(belegung(i)).toEqual(["copper_ore", "rusty_sword", null, "oak_log", null]);
    expect(i.slots[1]!.qty).toBe(3);
    expect(i.variantCells).toEqual({});
    expect(i.instances).toHaveLength(1); // die Instanz teilt sich jetzt die Zelle des Stapels
  });

  it("Gruppe ohne Fach bekommt das freie Fach vor der Beute", () => {
    const i = inv(["copper_ore", null], ["rusty_sword"], {});
    expect(addItem(i, content, "oak_log", 1)).toBe(0);
    expect(raster(i)).toEqual(["copper_ore", "V:rusty_sword"]);
  });

  it("vorhandener Stapel wächst unabhängig von Reservierungen", () => {
    const i = inv(["copper_ore", null], ["rusty_sword"], { rusty_sword: 1 });
    expect(addItem(i, content, "copper_ore", 5)).toBe(5);
    expect(i.slots[0]!.qty).toBe(6);
  });
});

describe("removeItem / addInstance / removeInstance", () => {
  it("letzter Grundstapel eines Items mit Varianten: die Gruppe behält genau dieses Fach", () => {
    const i = inv(["copper_ore", "rusty_sword", "oak_log", null, null], ["rusty_sword"]);
    syncVariantCells(i);
    expect(i.variantCells).toEqual({});
    removeItem(i, "rusty_sword", 1);
    expect(raster(i)).toEqual(["copper_ore", "V:rusty_sword", "oak_log", null, null]);
  });

  it("Stapel ohne Varianten: Fach wird einfach leer", () => {
    const i = inv(["copper_ore", "oak_log", null], []);
    removeItem(i, "copper_ore", 1);
    expect(raster(i)).toEqual([null, "oak_log", null]);
    expect(i.variantCells).toEqual({});
  });

  it("addInstance: neue reine Gruppe bekommt ein Fach, Instanz zu vorhandenem Stapel nicht", () => {
    const i = inv(["copper_ore", "rusty_sword", null, null], []);
    addInstance(i, inst("gnarled_staff"));
    addInstance(i, inst("rusty_sword"));
    expect(i.variantCells).toEqual({ gnarled_staff: 2 });
    addInstance(i, inst("gnarled_staff")); // zweite Instanz derselben Gruppe: dieselbe Zelle
    expect(i.variantCells).toEqual({ gnarled_staff: 2 });
  });

  it("removeInstance: letzte Instanz gibt das Fach frei, andere bleiben stehen", () => {
    const i = inv(["copper_ore", null, null, null], ["rusty_sword", "gnarled_staff"]);
    syncVariantCells(i);
    expect(i.variantCells).toEqual({ rusty_sword: 1, gnarled_staff: 2 });
    removeInstance(i, i.instances[0]!.instanceId);
    expect(i.variantCells).toEqual({ gnarled_staff: 2 });
    expect(raster(i)).toEqual(["copper_ore", null, "V:gnarled_staff", null]);
  });
});

describe("moveInventorySlot: alle Fälle", () => {
  const basis = (): InventoryState =>
    inv(["copper_ore", "oak_log", null, null, null, null], ["rusty_sword", "gnarled_staff"], { rusty_sword: 3, gnarled_staff: 4 });

  it("Stapel → leer und Stapel ↔ Stapel unverändert", () => {
    const i = basis();
    expect(moveInventorySlot(i, 0, 2)).toBe(true);
    expect(raster(i)).toEqual([null, "oak_log", "copper_ore", "V:rusty_sword", "V:gnarled_staff", null]);
    moveInventorySlot(i, 1, 2);
    expect(raster(i)).toEqual([null, "copper_ore", "oak_log", "V:rusty_sword", "V:gnarled_staff", null]);
  });

  it("Variantenzelle → leeres Fach: Reservierung zieht um", () => {
    const i = basis();
    moveInventorySlot(i, 3, 5);
    expect(raster(i)).toEqual(["copper_ore", "oak_log", null, null, "V:gnarled_staff", "V:rusty_sword"]);
    expect(i.variantCells).toEqual({ rusty_sword: 5, gnarled_staff: 4 });
  });

  it("Variantenzelle ↔ Stapel tauschen (in beide Richtungen)", () => {
    const i = basis();
    moveInventorySlot(i, 3, 0);
    expect(raster(i)).toEqual(["V:rusty_sword", "oak_log", null, "copper_ore", "V:gnarled_staff", null]);
    moveInventorySlot(i, 1, 0); // Stapel → reserviertes Fach
    expect(raster(i)).toEqual(["oak_log", "V:rusty_sword", null, "copper_ore", "V:gnarled_staff", null]);
  });

  it("Variantenzelle ↔ Variantenzelle: Reservierungen tauschen", () => {
    const i = basis();
    moveInventorySlot(i, 4, 3);
    expect(i.variantCells).toEqual({ rusty_sword: 4, gnarled_staff: 3 });
  });

  it("ungültige Indizes: nichts passiert", () => {
    const i = basis();
    const vorher = JSON.stringify(i);
    expect(moveInventorySlot(i, 3, 3)).toBe(false);
    expect(moveInventorySlot(i, -1, 2)).toBe(false);
    expect(moveInventorySlot(i, 2, 6)).toBe(false);
    expect(JSON.stringify(i)).toBe(vorher);
  });

  it("Chef-Report: letztes belegtes Item nach vorne ziehen → keine Zelle springt in die Lücke", () => {
    const ids = ["copper_ore", "oak_log", "raw_hide", "coal", "feather", "fang", null, null, "crude_bone", "bones"];
    const i = inv([...ids, ...new Array<null>(10).fill(null)], ["rusty_sword", "gnarled_staff"]);
    syncVariantCells(i);
    expect(i.variantCells).toEqual({ rusty_sword: 10, gnarled_staff: 11 });
    moveInventorySlot(i, 9, 6);
    expect(i.variantCells).toEqual({ rusty_sword: 10, gnarled_staff: 11 });
    expect(i.slots[9]).toBeNull();
    // Beute danach legt sich hinter die Zellen, nie in Fach 9 „vor“ eine Zelle, solange hinten Platz ist.
    addItem(i, content, "pine_log", 1);
    expect(i.slots[12]?.itemId).toBe("pine_log");
    expect(i.variantCells).toEqual({ rusty_sword: 10, gnarled_staff: 11 });
  });
});

describe("Kompaktieren / Sortieren", () => {
  it("compactInventory: Variantenzellen rücken wie belegte Fächer mit, Reihenfolge bleibt", () => {
    const i = inv(["copper_ore", null, null, "oak_log", null, "raw_hide", null], ["rusty_sword"], { rusty_sword: 4 });
    expect(compactInventory(i)).toBe(true);
    expect(raster(i)).toEqual(["copper_ore", "oak_log", "V:rusty_sword", "raw_hide", null, null, null]);
    expect(compactInventory(i)).toBe(false);
  });

  it("sortInventory mit Vergleich: Variantenzellen nach ihrer Basis-ID einsortiert wie Stapel", () => {
    const i = inv(["raw_hide", null, "copper_ore", null, null], ["oak_log", "bones"], { oak_log: 1, bones: 3 });
    sortInventory(i, (a, b) => a.localeCompare(b));
    expect(raster(i)).toEqual(["V:bones", "copper_ore", "V:oak_log", "raw_hide", null]);
  });

  it("sortInventory ohne Vergleich = compactInventory, Bestand unverändert", () => {
    const i = inv([null, "raw_hide", null, "copper_ore"], ["oak_log"], { oak_log: 2 });
    const instanzen = JSON.stringify(i.instances);
    sortInventory(i);
    expect(raster(i)).toEqual(["raw_hide", "V:oak_log", "copper_ore", null]);
    expect(JSON.stringify(i.instances)).toBe(instanzen);
  });

  it("übervoll mit fachloser Gruppe: Kompaktieren verliert nichts", () => {
    const i = inv(["copper_ore", "oak_log"], ["rusty_sword"]);
    compactInventory(i);
    expect(belegung(i)).toEqual(["copper_ore", "oak_log"]);
    expect(i.variantCells).toEqual({});
    expect(pureVariantBases(i)).toEqual(["rusty_sword"]);
  });
});

describe("Kapazität: stimmig, kein Verlust, kein falscher Überlauf", () => {
  /** Vorprüfungen und tatsächliches Ablegen müssen übereinstimmen, für viele Belegungen (deterministischer Zufall). */
  it("canHold/freeSlots/hasInstanceRoom decken sich mit addItem/addInstance (Eigenschaftstest, fester Seed)", () => {
    let x = 12345;
    const zufall = (n: number): number => {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x % n;
    };
    const stapelIds = ["copper_ore", "oak_log", "raw_hide", "coal", "feather", "fang", "crude_bone", "bones"];
    const gearIds = ["rusty_sword", "gnarled_staff", "cracked_bow", "leather_helm", "leather_body"];
    for (let runde = 0; runde < 300; runde++) {
      const n = 3 + zufall(6);
      const slots: Array<string | null> = [];
      const benutzt = new Set<string>();
      for (let k = 0; k < n; k++) {
        const id = stapelIds[zufall(stapelIds.length)]!;
        slots.push(zufall(2) === 0 || benutzt.has(id) ? null : id);
        if (slots[k]) benutzt.add(id);
      }
      const gear = gearIds.filter(() => zufall(3) === 0);
      const i = inv(slots, gear, {});
      syncVariantCells(i);
      const neu = stapelIds.find((id) => !benutzt.has(id))!;
      const frei = freeSlots(i);
      const kann = canHold(i, content, neu);
      const einheitenVorher = usedCapacityUnits(i);
      expect(kann).toBe(frei > 0);
      const gelegt = addItem(i, content, neu, 1);
      expect(gelegt).toBe(kann ? 1 : 0);
      if (gelegt) expect(usedCapacityUnits(i)).toBe(einheitenVorher + 1);
      expect(usedCapacityUnits(i) <= n || einheitenVorher > n || !gelegt).toBe(true);
      // Neue Variantengruppe: hasInstanceRoom ⇒ sie bekommt wirklich ein Fach.
      const neuGear = gearIds.find((id) => !gear.includes(id));
      if (neuGear) {
        const raum = hasInstanceRoom(i, content, neuGear);
        addInstance(i, inst(neuGear));
        if (raum) expect(Object.prototype.hasOwnProperty.call(i.variantCells, neuGear)).toBe(true);
      }
      // Kein Fach doppelt, keine Zelle auf einem Stapel.
      const faecher = Object.values(i.variantCells);
      expect(new Set(faecher).size).toBe(faecher.length);
      for (const f of faecher) expect(i.slots[f]).toBeNull();
    }
  });

  it("voll in Einheiten: Beute geht ins Lager statt die Zelle zu überschreiben, nichts verloren", () => {
    const s = createGame({ name: "T" }, content, 7) as GameState;
    s.settings.autoBank = true;
    s.settings.materialsToStorage = false;
    const n = s.inventory.slots.length;
    const ids = Object.values(content.items)
      .filter((it) => it.type !== "equipment")
      .map((it) => it.id)
      .slice(0, n);
    for (let k = 0; k < n; k++) s.inventory.slots[k] = { itemId: ids[k]!, qty: 1 };
    s.inventory.slots[n - 1] = null;
    s.inventory.instances = [inst("rusty_sword")];
    s.inventory.variantCells = {};
    syncVariantCells(s.inventory);
    expect(s.inventory.variantCells).toEqual({ rusty_sword: n - 1 });
    expect(usedCapacityUnits(s.inventory)).toBe(n);
    const neu = Object.values(content.items).find((it) => it.type !== "equipment" && !ids.includes(it.id) && it.id !== PARAGON_KEY_ITEM_ID)!.id;
    const bankVorher = s.bank[neu] ?? 0;
    const r = addItemOrBank(s, content, neu, 3);
    expect(r).toEqual({ toInventory: 0, toBank: 3 });
    expect(s.bank[neu]).toBe(bankVorher + 3);
    expect(s.inventory.variantCells).toEqual({ rusty_sword: n - 1 });
    expect(usedCapacityUnits(s.inventory)).toBe(n);
  });

  it("verzaubertes Teil aus vollem Inventar anlegen: das getragene schlichte Teil nimmt das Fach der Zelle (Tausch klappt)", () => {
    const s = createGame({ name: "T" }, content, 7) as GameState;
    const n = s.inventory.slots.length;
    const ids = Object.values(content.items)
      .filter((it) => it.type !== "equipment")
      .map((it) => it.id)
      .slice(0, n);
    for (let k = 0; k < n; k++) s.inventory.slots[k] = { itemId: ids[k]!, qty: 1 };
    s.inventory.slots[4] = null;
    const sword = inst("rusty_sword");
    s.inventory.instances = [sword];
    s.inventory.variantCells = { rusty_sword: 4 };
    s.character.equipment.mainhand = "gnarled_staff";
    delete s.character.equippedInstances.mainhand;
    s.character.equipment.offhand = null;
    expect(freeSlots(s.inventory)).toBe(0);
    expect(slotsFreedByInstanceRemoval(s.inventory, sword.instanceId)).toBe(1);
    const r = equipInstance(s, content, sword.instanceId);
    expect(r.ok).toBe(true);
    // (Casts: TS hat die beiden Felder oben durch `delete`/`= null` verengt.)
    expect((s.character.equippedInstances as Partial<Record<string, ItemInstance>>).mainhand?.instanceId).toBe(sword.instanceId);
    expect((s.inventory.slots as Array<{ itemId: string } | null>)[4]?.itemId).toBe("gnarled_staff");
    expect(s.inventory.variantCells).toEqual({});
    expect(usedCapacityUnits(s.inventory)).toBe(n);
  });
});

describe("legacyVariantCellLayout (alte Anzeige-Logik für die Migration < 98)", () => {
  it("erste freie hinter dem letzten belegten Fach", () => {
    const i = inv(["copper_ore", "oak_log", "raw_hide", "coal", "feather", null, null, null], ["rusty_sword", "gnarled_staff"]);
    expect(legacyVariantCellLayout(i)).toEqual({ rusty_sword: 5, gnarled_staff: 6 });
  });

  it("hinten zu wenig Platz: die LETZTEN freien davor (anders als die neue Vergabe)", () => {
    const s: Array<string | null> = ["copper_ore", "oak_log", "raw_hide", "coal", "feather", null, null, null, "fang", "bones"];
    const i = inv(s, ["rusty_sword", "gnarled_staff"]);
    expect(legacyVariantCellLayout(i)).toEqual({ rusty_sword: 6, gnarled_staff: 7 });
    syncVariantCells(i);
    expect(i.variantCells).toEqual({ rusty_sword: 5, gnarled_staff: 6 }); // neue Regel: erste freie davor
  });

  it("Fall aus dem Repro vom 24.10.: 0–9 und 18/19 belegt, drei Gruppen → 15, 16, 17", () => {
    const ids = ["copper_ore", "oak_log", "raw_hide", "coal", "feather", "fang", "crude_bone", "bones", "pine_log", "iron_ore"];
    const s: Array<string | null> = [...ids, null, null, null, null, null, null, null, null, "tin_ore", "gold_ore"];
    const i = inv(s, ["rusty_sword", "gnarled_staff", "cracked_bow"]);
    expect(legacyVariantCellLayout(i)).toEqual({ rusty_sword: 15, gnarled_staff: 16, cracked_bow: 17 });
  });

  it("übervoll: Gruppen ohne Fach bekommen keinen Eintrag", () => {
    const i = inv(["copper_ore", "oak_log"], ["rusty_sword"]);
    expect(legacyVariantCellLayout(i)).toEqual({});
  });
});

describe("Determinismus", () => {
  it("gleiche Operationsfolge auf zwei Kopien → identischer Zustand; advance() vergibt die Fächer", () => {
    let basen: string[] = [];
    const lauf = (): string => {
      const s = createGame({ name: "D" }, content, 42) as GameState;
      const inSlots = new Set(s.inventory.slots.filter((x) => x).map((x) => x!.itemId));
      basen = Object.values(content.items)
        .filter((it) => it.type === "equipment" && !inSlots.has(it.id))
        .slice(0, 2)
        .map((it) => it.id);
      s.inventory.instances = basen.map((b, k) => ({ instanceId: `det-${k}`, baseItemId: b, affixes: [], suffix: { suffixId: "x", ilvl: 1, roll: 0 } }));
      s.inventory.variantCells = {};
      advance(s, content, 1000);
      expect(Object.keys(s.inventory.variantCells).sort()).toEqual([...basen].sort());
      moveInventorySlot(s.inventory, s.inventory.variantCells[basen[0]!]!, s.inventory.slots.length - 1);
      addItem(s.inventory, content, "copper_ore", 3);
      sortInventory(s.inventory, (a, b) => a.localeCompare(b));
      return JSON.stringify({ inv: s.inventory, rng: s.rng });
    };
    const a = lauf();
    const b = lauf();
    expect(a).toBe(b);
  });
});
