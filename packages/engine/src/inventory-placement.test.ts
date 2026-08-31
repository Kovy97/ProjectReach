import { describe, expect, it } from "vitest";
import type { InventoryState } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { addItem } from "./inventory";

/**
 * Chef-Report 31.08.2026: „neue items kommen nicht an den nächsten Slot sondern irgendwo dazwischen
 * — fühlt sich nicht an wie ein Spiel Inventar."
 *
 * Vorher nahm die Platzierung immer die ERSTE Lücke. Wer sein Erz aus Fach 3 nahm, bekam den
 * nächsten Fund dorthin, während die Reihe weiter hinten weiterlief. Jetzt hängt Beute hinten an
 * die belegte Reihe an; Lücken davor werden nur genutzt, wenn dahinter nichts mehr frei ist —
 * sonst ginge Beute bei fast vollem Inventar verloren.
 */

function inv(slots: Array<string | null>, kapazitaet = slots.length): InventoryState {
  return {
    baseCapacity: kapazitaet,
    bagSlots: [],
    instances: [],
    slots: slots.map((id) => (id === null ? null : { itemId: id, qty: 1 })),
  } as unknown as InventoryState;
}

const belegung = (i: InventoryState): Array<string | null> =>
  i.slots.map((s) => (s === null ? null : s.itemId));

describe("Inventar-Platzierung: neue Beute hängt hinten an", () => {
  it("legt einen Fund hinter das letzte belegte Fach, nicht in die Lücke davor", () => {
    const i = inv(["copper_ore", null, "oak_log", null, null]);
    addItem(i, content, "raw_hide", 1);
    // Fach 1 bleibt leer — der Fund geht auf 3, direkt hinter das letzte belegte Fach 2.
    expect(belegung(i)).toEqual(["copper_ore", null, "oak_log", "raw_hide", null]);
  });

  it("füllt Lücken davor erst, wenn hinten nichts mehr frei ist", () => {
    const i = inv(["copper_ore", null, "oak_log", "raw_hide"]);
    addItem(i, content, "coal", 1);
    // Hinter Fach 3 ist nichts frei -> die Lücke auf 1 wird genutzt, statt die Beute zu verlieren.
    expect(belegung(i)).toEqual(["copper_ore", "coal", "oak_log", "raw_hide"]);
  });

  it("stapelt weiter auf einen vorhandenen Stapel, egal wo der liegt", () => {
    const i = inv(["copper_ore", null, "oak_log", null]);
    addItem(i, content, "copper_ore", 4);
    expect(i.slots[0]).toEqual({ itemId: "copper_ore", qty: 5 });
    // Kein neues Fach belegt.
    expect(belegung(i)).toEqual(["copper_ore", null, "oak_log", null]);
  });

  it("leeres Inventar füllt von vorne", () => {
    const i = inv([null, null, null]);
    addItem(i, content, "copper_ore", 1);
    addItem(i, content, "oak_log", 1);
    expect(belegung(i)).toEqual(["copper_ore", "oak_log", null]);
  });

  it("volles Inventar nimmt nichts mehr an", () => {
    const i = inv(["feather", "fang"]);
    const gelegt = addItem(i, content, "crude_bone", 1);
    expect(gelegt).toBe(0);
    expect(belegung(i)).toEqual(["feather", "fang"]);
  });

  it("mehrere Funde hintereinander bleiben in Reihenfolge und überspringen die Lücke", () => {
    const i = inv(["copper_ore", null, null, "oak_log", null, null]);
    addItem(i, content, "raw_hide", 1);
    addItem(i, content, "coal", 1);
    expect(belegung(i)).toEqual(["copper_ore", null, null, "oak_log", "raw_hide", "coal"]);
  });
});
