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
    einlagern(s, "cooked_shrimp", 3);
    einlagern(s, "cooked_trout", 2);
    expect(s.bankOrder.slice(0, 2)).toEqual(["cooked_shrimp", "cooked_trout"]);
  });

  it("ein leergeraeumtes Fach bleibt als Luecke stehen und rueckt NICHT nach", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 1);
    einlagern(s, "cooked_trout", 1);
    einlagern(s, "cooked_cod", 1);
    expect(withdrawItem(s, content, "cooked_trout", 1)).toBe(1);
    // Fach 1 ist jetzt leer, „raw_hide" bleibt auf Fach 2.
    expect(s.bankOrder[0]).toBe("cooked_shrimp");
    expect(s.bankOrder[1]).toBeNull();
    expect(s.bankOrder[2]).toBe("cooked_cod");
  });

  it("die naechste neue Art haengt HINTEN an, die Luecke bleibt stehen", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 1);
    einlagern(s, "cooked_trout", 1);
    einlagern(s, "cooked_cod", 1);
    withdrawItem(s, content, "cooked_trout", 1);
    einlagern(s, "cooked_salmon", 1);
    expect(s.bankOrder[1]).toBeNull();
    expect(s.bankOrder[3]).toBe("cooked_salmon");
  });

  it("ohne Platz hinten (Kapazitaet) fuellt die neue Art die Luecke davor", () => {
    const s = spiel();
    s.bankOrder = ["cooked_shrimp", null, "cooked_cod"];
    s.bank.cooked_shrimp = 1;
    s.bank.cooked_cod = 1;
    s.bank.coal = 1;
    syncBankOrder(s, 3);
    expect(s.bankOrder[1]).toBe("coal");
  });

  it("ein Fach mit nur verzauberter Instanz (Menge 0) bleibt belegt", () => {
    const s = spiel();
    s.bankInstances.push({ instanceId: "inst_t1", baseItemId: "rusty_sword", affixes: [] });
    syncBankOrder(s);
    expect(s.bankOrder).toContain("rusty_sword");
    moveBankSlot(s, s.bankOrder.indexOf("rusty_sword"), 40);
    syncBankOrder(s);
    expect(s.bankOrder[40]).toBe("rusty_sword");
    expect(s.bankOrder.filter((i) => i === "rusty_sword")).toHaveLength(1);
  });

  it("ein Stapel laesst sich auf ein weit hinten liegendes leeres Fach ziehen", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 5);
    expect(moveBankSlot(s, 0, 64)).toBe(true);
    expect(s.bankOrder[0]).toBeNull();
    expect(s.bankOrder[64]).toBe("cooked_shrimp");
    // Der Bestand selbst bleibt voellig unberuehrt — verschoben wird nur die Platzierung.
    expect(s.bank.cooked_shrimp).toBe(5);
  });

  it("zwei belegte Faecher tauschen ihren Platz", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 1);
    einlagern(s, "cooked_trout", 1);
    expect(moveBankSlot(s, 0, 1)).toBe(true);
    expect(s.bankOrder.slice(0, 2)).toEqual(["cooked_trout", "cooked_shrimp"]);
  });

  it("ein weit hinten geparktes Fach ueberlebt das Aufraeumen", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 5);
    moveBankSlot(s, 0, 64);
    syncBankOrder(s);
    expect(s.bankOrder[64]).toBe("cooked_shrimp");
    expect(s.bankOrder.filter((id) => id === "cooked_shrimp")).toHaveLength(1);
  });

  it("syncBankOrder ist idempotent", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 1);
    einlagern(s, "cooked_trout", 1);
    moveBankSlot(s, 1, 30);
    const einmal = JSON.stringify(s.bankOrder);
    syncBankOrder(s);
    syncBankOrder(s);
    expect(JSON.stringify(s.bankOrder)).toBe(einmal);
  });

  it("Bestand, der direkt in `bank` landet, bekommt spaetestens im Sync ein Fach", () => {
    const s = spiel();
    einlagern(s, "cooked_shrimp", 1);
    // Genau das tun Auto-Einlagern, Lager-Verbrauch und Meisterweihe: direkt in den Record.
    s.bank.coal = 7;
    syncBankOrder(s);
    expect(s.bankOrder).toContain("coal");
  });
});
