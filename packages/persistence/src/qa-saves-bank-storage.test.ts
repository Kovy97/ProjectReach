import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, ItemId } from "@hearthforge/shared";
import { SAVE_VERSION, effectiveBankCapacity } from "@hearthforge/shared";
import { bankSlotsUsed, createGame, isStorageItem } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Spielstände (Kontrolleur, 2026-10-23): Bank am Limit + Lagerware, Köcher-Grenzfälle, Alt-IDs aus v57.
 * `it.fails` = dokumentierter Befund (SOLL-Formulierung, reißt heute). Plain `it` = Absicherung des Ist-Zustands.
 */
const AT = 1_761_600_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };
const VAULT = join(__dirname, "..", "fixtures", "save-compat");

function asVersion(s: GameState, version: number, strip: (save: SaveShape) => void): string {
  const save = JSON.parse(serialize(s, AT)) as SaveShape;
  save.version = version;
  save.state.version = version;
  strip(save);
  return JSON.stringify(save);
}

describe("v89 → v90: Bank exakt am Kapazitätslimit, gemischt mit Lagerware", () => {
  const storeIds = Object.keys(content.items).filter((id) => isStorageItem(content, id)).slice(0, 40) as ItemId[];
  const bankIds = Object.keys(content.items)
    .filter((id) => !isStorageItem(content, id) && content.items[id]!.type === "consumable")
    .slice(0, 20) as ItemId[];

  function fullBankSave(): { json: string; before: Record<string, number> } {
    const s = createGame({ name: "QA-Bank" }, content, 21);
    expect(storeIds).toHaveLength(40);
    expect(bankIds).toHaveLength(20);
    const bank: Record<string, number> = {};
    [...storeIds, ...bankIds].forEach((id, i) => (bank[id] = 100 + i));
    s.bank = bank;
    s.bankOrder = [...storeIds, ...bankIds]; // 60 belegte Fächer = BASE_BANK_CAPACITY, kein freies Fach
    s.bankSlotsPurchased = 0;
    expect(effectiveBankCapacity(s, content)).toBe(60);
    const json = asVersion(s, 89, (save) => {
      delete (save.state.settings as Partial<GameState["settings"]>).materialsToStorage;
      delete (save.state as Partial<GameState>).lockedItems;
    });
    return { json, before: bank };
  }

  it("kein Bestand geht verloren, Lagerware räumt 40 Fächer frei, Reihenfolge der Bankware bleibt, Fixpunkt", () => {
    const { json, before } = fullBankSave();
    const res = deserialize(json, content, AT)!;
    const out = res.state;
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.bank).toEqual(before);
    expect(bankSlotsUsed(out, content)).toBe(20);
    expect(bankSlotsUsed(out, content)).toBeLessThan(effectiveBankCapacity(out, content));
    expect(out.bankOrder).toEqual(bankIds);
    expect(new Set(out.bankOrder.filter((x) => x !== null)).size).toBe(20);
    const once = serialize(out, AT);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });

  it("Alt-Save OHNE bankOrder (< v87) und 60 Arten: Fächer entstehen nur für Bankware", () => {
    const { json } = fullBankSave();
    const save = JSON.parse(json) as SaveShape;
    save.version = 86;
    save.state.version = 86;
    delete (save.state as Partial<GameState>).bankOrder;
    const out = deserialize(JSON.stringify(save), content, AT)!.state;
    expect(out.bankOrder.filter((x) => x !== null).sort()).toEqual([...bankIds].sort());
    expect(bankSlotsUsed(out, content)).toBe(20);
  });
});

describe("Köcher: Grenzfälle der Ladung", () => {
  it("[BEFUND P3] Köcher-Menge hat keinen Deckel (Bank klemmt auf 1e9, der Köcher nicht)", () => {
    const s = createGame({ name: "QA-Köcher" }, content, 22);
    s.character.equipment.mainhand = "copper_shortbow";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 1e300 };
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.character.quiver!.qty).toBeLessThanOrEqual(1_000_000_000);
  });

  it("Köcher-Ladung + Nebenhand-Köcher an einer Nicht-Bogen-Haupthand: Pfeile landen im Lager, Köcher im Inventar, Fixpunkt", () => {
    const s = createGame({ name: "QA-Köcher" }, content, 23);
    s.character.equipment.mainhand = "rusty_sword";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 40 };
    s.bank.copper_arrow = 10;
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 }); // claude:2026-10-26T04:05:00+02:00 — ohne Köcher bleibt die Art als leere Ladung gemerkt (Nachfüllen nach Kit-Wechsel, QA-Fernkampf P3)
    expect(st.bank.copper_arrow).toBe(50);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });

  it("Köcher mit unbekannter Pfeil-ID verliert die Ladung (kein Bestand erfunden), Fixpunkt", () => {
    const s = createGame({ name: "QA-Köcher" }, content, 24);
    s.character.equipment.mainhand = "copper_shortbow";
    s.character.equipment.offhand = "copper_quiver";
    (s.character as { quiver: unknown }).quiver = { itemId: "pfeil_aus_der_zukunft", qty: 99 };
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.character.quiver).toBeNull();
    expect(Object.keys(st.bank)).not.toContain("pfeil_aus_der_zukunft");
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});

describe("Alt-IDs aus v57-Zeiten (Pfeile wiederverwendet, keine Tombstone-Liste)", () => {
  it("v57-Vault-Save: der Rückkauf-Eintrag `copper_arrow` ×5079 zu 1 Gold wird wieder kaufbar (Ist-Stand, bewusst? Spec §1)", () => {
    const json = readFileSync(join(VAULT, "v57-slot-4.json"), "utf-8");
    const raw = JSON.parse(json) as SaveShape;
    const legacy = raw.state.buyBack.find((e) => e.itemId === "copper_arrow");
    expect(legacy).toEqual({ itemId: "copper_arrow", qty: 5079, price: 1 });
    const out = deserialize(json, content, raw.savedAt)!.state;
    const entry = out.buyBack.find((e) => e.itemId === "copper_arrow");
    expect(entry).toEqual({ itemId: "copper_arrow", qty: 5079, price: 1 });
    expect(content.items.copper_arrow?.arrow).toBeDefined();
    expect(content.items.copper_arrow?.value).toBe(2);
    // Altschlüssel `fletching` faltet weiterhin in Handwerk, Bognerei bleibt ohne Konto.
    expect((out.skills as Record<string, unknown>).fletching).toBeUndefined();
    expect(out.skills.bowcraft).toBeUndefined();
  });
});
