import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { COMPLETION_CAPE_KEY, masterRingItemId } from "@hearthforge/shared";
import { createGame } from "./state";
import { checkMasteryCapes } from "./capes";
import { itemCount, removeItem } from "./inventory";
import { buyMasterRing, masterRingShopCost, masterRingShopEntries, sellItem, sellPrice } from "./shop";
import { xpForLevel } from "./leveling";

/**
 * Meisterring-Wiederbeschaffung (Chef-Auftrag 2026-07-18, Live-Fund: „99er-Fishing-Cape bei
 * vollem Inventar weg — sollte mit Max-Level immer neu zu kaufen sein"):
 *  §1 Angebots-Bedingungen: verliehen (`capeGranted`) && NIRGENDS besessen (Inventar/Instanzen/
 *     Bank/Vault/angelegt/Buy-Back). Buy-Back zählt als Besitz — dort ist der günstigere Pfad.
 *  §2 Kauf-Verb: Gold-Abzug, Zustellung mit Bank-Garantie (voller-Inventar-Kauf verliert nie).
 *  §3 Exploit-Guard: Wiederbeschaffungspreis > maximaler Verkaufserlös (inkl. Pet-Bonus ≤ 5 %)
 *     für JEDEN Meisterring — Verkaufen+Wiederkaufen ist nie eine Gold-Pumpe.
 * Deterministisch, kein RNG.
 */

/** Frischer Char mit Mining 99 — die Weihe verleiht den echten ring_master_mining. */
function withGrantedMiningRing() {
  const s = createGame({ name: "X" }, content, 1);
  s.skills.mining = { xp: xpForLevel(99) };
  checkMasteryCapes(s, content);
  const ringId = masterRingItemId("mining");
  expect(s.capeGranted.mining).toBe(true);
  expect(itemCount(s.inventory, ringId)).toBe(1);
  return { s, ringId };
}

describe("Meisterring-Shop §1: Angebots-Bedingungen", () => {
  it("frischer Char: kein Angebot (keine Weihe verliehen)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(masterRingShopEntries(s, content)).toEqual([]);
  });

  it("Ring im Besitz (Inventar) ⇒ kein Angebot; Ring VERLOREN ⇒ Angebot mit vollem value-Preis", () => {
    const { s, ringId } = withGrantedMiningRing();
    expect(masterRingShopEntries(s, content)).toEqual([]); // besessen → nichts anzubieten

    removeItem(s.inventory, ringId, 1); // „verloren" (Drop-Äquivalent, ohne Buy-Back-Spur)
    expect(masterRingShopEntries(s, content)).toEqual([
      { itemId: ringId, cost: content.items[ringId]!.value! },
    ]);
  });

  it("Ring in der BANK oder im BUY-BACK-Regal zählt als Besitz ⇒ kein Angebot", () => {
    const { s, ringId } = withGrantedMiningRing();
    // Bank-Besitz:
    removeItem(s.inventory, ringId, 1);
    s.bank[ringId] = 1;
    expect(masterRingShopEntries(s, content)).toEqual([]);
    // Buy-Back-Besitz (Verkauf legt den Eintrag an — der reguläre Rückkauf-Pfad hat Vorrang):
    const { s: s2, ringId: r2 } = withGrantedMiningRing();
    sellItem(s2, content, r2, 1);
    expect(itemCount(s2.inventory, r2)).toBe(0);
    expect(s2.buyBack.some((e) => e.itemId === r2)).toBe(true);
    expect(masterRingShopEntries(s2, content)).toEqual([]);
    // Regal geleert (Eintrag herausgealtert) → jetzt greift das Netz:
    s2.buyBack = [];
    expect(masterRingShopEntries(s2, content).map((e) => e.itemId)).toEqual([r2]);
  });

  it("Krönung: ring_master_completion ist nach Verleihung + Verlust ebenfalls wiederbeschaffbar", () => {
    const s = createGame({ name: "X" }, content, 1);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    checkMasteryCapes(s, content);
    const ringId = masterRingItemId(COMPLETION_CAPE_KEY);
    expect(s.capeGranted[COMPLETION_CAPE_KEY]).toBe(true);
    // ALLE Meister-Items wegwerfen → 21 Angebote (20 Skills + Krönung), Krönung zum 100k-Preis.
    for (const skillId of [...Object.keys(content.skills), COMPLETION_CAPE_KEY]) {
      const id = masterRingItemId(skillId);
      removeItem(s.inventory, id, 1);
      delete s.bank[id];
    }
    const entries = masterRingShopEntries(s, content);
    expect(entries).toHaveLength(Object.keys(content.skills).length + 1);
    expect(entries.find((e) => e.itemId === ringId)?.cost).toBe(content.items[ringId]!.value!);
  });

  it("ring_master_enchanting existiert nicht (Welle TT) und wird selbst mit ALLEN Weihen nie angeboten", () => {
    // Welle TT (Chef-Entscheid 2026-07-18): Enchanting ist in Runecrafting integriert, der
    // vormals geparkte Ring ist aus dem Katalog entfernt. Save-Risiko-Nachweis: ein
    // `capeGranted["enchanting"]` kann nie entstehen (kein Skill in content.skills ⇒
    // checkMasteryCapes vergibt den Marker nie) — selbst der Voll-99er mit allen Weihen und
    // leerem Besitz bekommt den Ring nicht angeboten. Er war zu keinem Zeitpunkt erhältlich.
    expect(content.items["ring_master_enchanting"]).toBeUndefined();
    const s = createGame({ name: "X" }, content, 1);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    checkMasteryCapes(s, content);
    expect(s.capeGranted["enchanting"]).toBeUndefined();
    for (const skillId of [...Object.keys(content.skills), COMPLETION_CAPE_KEY]) {
      const id = masterRingItemId(skillId);
      removeItem(s.inventory, id, 1);
      delete s.bank[id];
    }
    const offered = masterRingShopEntries(s, content).map((e) => e.itemId);
    expect(offered).not.toContain("ring_master_enchanting");
  });
});

describe("Meisterring-Shop §2: buyMasterRing", () => {
  it("Kauf zieht den vollen Preis ab, liefert den Ring und schließt das Angebot", () => {
    const { s, ringId } = withGrantedMiningRing();
    removeItem(s.inventory, ringId, 1);
    const cost = masterRingShopCost(content, ringId);
    s.character.gold = cost + 123;
    const spentBefore = s.stats.goldSpent;

    expect(buyMasterRing(s, content, ringId)).toBe(true);
    expect(s.character.gold).toBe(123);
    expect(s.stats.goldSpent).toBe(spentBefore + cost);
    expect(itemCount(s.inventory, ringId)).toBe(1);
    expect(masterRingShopEntries(s, content)).toEqual([]); // wieder besessen → Angebot zu

    // Doppelkauf unmöglich (nicht mehr angeboten):
    expect(buyMasterRing(s, content, ringId)).toBe(false);
  });

  it("ohne Gold bzw. ohne Angebot (nicht verloren / nie verliehen) schlägt der Kauf fehl", () => {
    const { s, ringId } = withGrantedMiningRing();
    // Besessen → kein Angebot:
    s.character.gold = 10_000_000;
    expect(buyMasterRing(s, content, ringId)).toBe(false);
    // Verloren, aber zu arm:
    removeItem(s.inventory, ringId, 1);
    s.character.gold = masterRingShopCost(content, ringId) - 1;
    expect(buyMasterRing(s, content, ringId)).toBe(false);
    expect(itemCount(s.inventory, ringId)).toBe(0);
    // Nie verliehene Ringe sind nicht kaufbar (auch mit Gold):
    s.character.gold = 10_000_000;
    expect(buyMasterRing(s, content, masterRingItemId("fishing"))).toBe(false);
  });

  it("Bank-Garantie: Kauf bei vollem Inventar + Auto-Bank aus verliert den Ring NICHT (Bank-Zustellung)", () => {
    const { s, ringId } = withGrantedMiningRing();
    removeItem(s.inventory, ringId, 1);
    s.settings.autoBank = false;
    for (let i = 0; i < s.inventory.slots.length; i++) {
      s.inventory.slots[i] = { itemId: "copper_ore", qty: 9999 };
    }
    s.character.gold = masterRingShopCost(content, ringId);
    expect(buyMasterRing(s, content, ringId)).toBe(true);
    expect(s.bank[ringId]).toBe(1);
    expect(s.character.gold).toBe(0);
  });
});

describe("Meisterring-Shop §3: Exploit-Guard (Preis > maximaler Verkaufserlös)", () => {
  it("für JEDEN Meisterring gilt: Wiederbeschaffung > Verkauf ×1,05 (Pet-Bonus-Decke)", () => {
    const skillKeys = [...Object.keys(content.skills), COMPLETION_CAPE_KEY];
    const ringIds = skillKeys.map((id) => masterRingItemId(id));
    for (const id of ringIds) {
      expect(content.items[id], id).toBeDefined();
      const cost = masterRingShopCost(content, id);
      const maxSell = Math.round(sellPrice(content, id) * 1.05); // effectiveSellPrice-Decke (§4.2 ≤5 %)
      expect(cost, `${id}: cost ${cost} muss > maxSell ${maxSell} sein`).toBeGreaterThan(maxSell);
    }
  });
});
