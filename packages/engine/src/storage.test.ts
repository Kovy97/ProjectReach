import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { STORAGE_SHELVES, effectiveBankCapacity } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { addItem, addItemOrBank, itemCount } from "./inventory";
import { bankSlotsUsed, canDeposit, depositStorageMaterials, sellFromStorage } from "./bank";
import { isStorageItem, storageShelfOf, storageShelves } from "./storage";

/** Materiallager (1.4.0 „Feder und Stahl“ ML; claude:2026-10-23T23:45:00+02:00). */
describe("Materiallager", () => {
  it("jedes Material hat ein Regal oder ist ausdrücklich Bankware (Schlüssel, Siegel)", () => {
    const bankOnly: string[] = [];
    for (const it of Object.values(content.items)) {
      if (it.type !== "material") continue;
      const shelf = storageShelfOf(content, it.id);
      if (shelf === null) bankOnly.push(it.id);
      else expect(STORAGE_SHELVES).toContain(shelf);
    }
    expect(bankOnly.every((id) => /(_key|_sigil|_seal)$|^masters_mark$/.test(id))).toBe(true);
    expect(storageShelves(content).reduce((a, s) => a + s.items.length, 0)).toBeGreaterThan(300);
  });

  it("Regale nach Chef-Auswahl: Erz, Fisch, Samen, Verzauberungsrunen, Monsterteile im Lager", () => {
    expect(storageShelfOf(content, "copper_ore")).toBe("ores");
    expect(storageShelfOf(content, "raw_trout")).toBe("fish");
    expect(storageShelfOf(content, "graywort_seed")).toBe("seeds");
    expect(storageShelfOf(content, "rune_keen_i")).toBe("enchant_runes");
    expect(storageShelfOf(content, "goblin_ear")).toBe("loot");
    expect(isStorageItem(content, "crypt_key")).toBe(false);
    expect(isStorageItem(content, "rusty_sword")).toBe(false);
  });

  it("Lagerware belegt keinen Bankplatz und lässt sich auch bei voller Bank einlagern", () => {
    const s = createTestGame({ name: "L" }, content, 1);
    const cap = effectiveBankCapacity(s, content);
    const gear = Object.keys(content.items).filter((id) => !isStorageItem(content, id)).slice(0, cap);
    for (const id of gear) s.bank[id] = 1;
    s.bank.copper_ore = 500;
    expect(bankSlotsUsed(s, content)).toBe(cap);
    expect(canDeposit(s, content, "iron_ore")).toBe(true);
    expect(canDeposit(s, content, "cooked_cod")).toBe(s.bank.cooked_cod !== undefined);
  });

  it("„Direkt ins Lager“: an = am Inventar vorbei, aus = wie früher", () => {
    const s = createTestGame({ name: "L" }, content, 1);
    s.settings.materialsToStorage = true;
    addItemOrBank(s, content, "copper_ore", 7);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
    expect(s.bank.copper_ore).toBe(7);
    addItemOrBank(s, content, "cooked_trout", 2); // keine Lagerware ⇒ Inventar
    expect(itemCount(s.inventory, "cooked_trout")).toBe(2);
    s.settings.materialsToStorage = false;
    addItemOrBank(s, content, "copper_ore", 3);
    expect(itemCount(s.inventory, "copper_ore")).toBe(3);
  });

  it("Alles einlagern und Verkauf aus dem Lager", () => {
    const s = createTestGame({ name: "L" }, content, 1);
    addItem(s.inventory, content, "copper_ore", 10);
    addItem(s.inventory, content, "cooked_trout", 4);
    expect(depositStorageMaterials(s, content)).toBe(10);
    expect(itemCount(s.inventory, "cooked_trout")).toBe(4);
    const gold = s.character.gold;
    const got = sellFromStorage(s, content, "copper_ore", 4);
    expect(got).toBeGreaterThan(0);
    expect(s.character.gold).toBe(gold + got);
    expect(s.bank.copper_ore).toBe(6);
    expect(sellFromStorage(s, content, "cooked_trout", 1)).toBe(0); // keine Lagerware
  });
});
