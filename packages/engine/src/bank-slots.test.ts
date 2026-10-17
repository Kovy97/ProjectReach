import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { moveBankSlot, syncBankOrder } from "@hearthforge/shared";
import { addItem, createGame, depositItem, withdrawItem } from "./index";

/**
 * Bankfaecher „wie OSRS" (SAVE 87, Chef-Auftrag 31.08.2026): Die Position gehoert dem Spieler.
 * `bank` traegt die Mengen, `bankOrder` die Platzierung — ein geleertes Fach bleibt leer stehen,
 * und ein Stapel darf auf Fach 65, auch wenn 64 und alles davor leer ist.
 */

function spiel() {
  const s = createGame({ name: "Lager" }, content, 1);
  return s;
}

function einlagern(s: ReturnType<typeof spiel>, id: string, n = 1): void {
  addItem(s.inventory, content, id, n);
  depositItem(s, content, id, n);
}

describe("Bankfaecher: Platzierung gehoert dem Spieler", () => {
  it("neu eingelagerte Arten bekommen der Reihe nach ein Fach", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 3);
    einlagern(s, "oak_log", 2);
    expect(s.bankOrder.slice(0, 2)).toEqual(["copper_ore", "oak_log"]);
  });

  it("ein leergeraeumtes Fach bleibt als Luecke stehen und rueckt NICHT nach", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 1);
    einlagern(s, "oak_log", 1);
    einlagern(s, "raw_hide", 1);
    expect(withdrawItem(s, content, "oak_log", 1)).toBe(1);
    // Fach 1 ist jetzt leer, „raw_hide" bleibt auf Fach 2.
    expect(s.bankOrder[0]).toBe("copper_ore");
    expect(s.bankOrder[1]).toBeNull();
    expect(s.bankOrder[2]).toBe("raw_hide");
  });

  it("die naechste neue Art fuellt genau diese Luecke", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 1);
    einlagern(s, "oak_log", 1);
    einlagern(s, "raw_hide", 1);
    withdrawItem(s, content, "oak_log", 1);
    einlagern(s, "coal", 1);
    expect(s.bankOrder[1]).toBe("coal");
    expect(s.bankOrder[2]).toBe("raw_hide");
  });

  it("ein Stapel laesst sich auf ein weit hinten liegendes leeres Fach ziehen", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 5);
    expect(moveBankSlot(s, 0, 64)).toBe(true);
    expect(s.bankOrder[0]).toBeNull();
    expect(s.bankOrder[64]).toBe("copper_ore");
    // Der Bestand selbst bleibt voellig unberuehrt — verschoben wird nur die Platzierung.
    expect(s.bank.copper_ore).toBe(5);
  });

  it("zwei belegte Faecher tauschen ihren Platz", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 1);
    einlagern(s, "oak_log", 1);
    expect(moveBankSlot(s, 0, 1)).toBe(true);
    expect(s.bankOrder.slice(0, 2)).toEqual(["oak_log", "copper_ore"]);
  });

  it("ein weit hinten geparktes Fach ueberlebt das Aufraeumen", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 5);
    moveBankSlot(s, 0, 64);
    syncBankOrder(s);
    expect(s.bankOrder[64]).toBe("copper_ore");
    expect(s.bankOrder.filter((id) => id === "copper_ore")).toHaveLength(1);
  });

  it("syncBankOrder ist idempotent", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 1);
    einlagern(s, "oak_log", 1);
    moveBankSlot(s, 1, 30);
    const einmal = JSON.stringify(s.bankOrder);
    syncBankOrder(s);
    syncBankOrder(s);
    expect(JSON.stringify(s.bankOrder)).toBe(einmal);
  });

  it("Bestand, der direkt in `bank` landet, bekommt spaetestens im Sync ein Fach", () => {
    const s = spiel();
    einlagern(s, "copper_ore", 1);
    // Genau das tun Auto-Einlagern, Lager-Verbrauch und Meisterweihe: direkt in den Record.
    s.bank.coal = 7;
    syncBankOrder(s);
    expect(s.bankOrder).toContain("coal");
  });
});
