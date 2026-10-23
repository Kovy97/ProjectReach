import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, ItemDef } from "@hearthforge/shared";
import { AMMO_SAVER_CAP } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { combatStep, startCombat } from "./combat";
import { computeStats } from "./character";
import { equipItem, unequipItem } from "./equipment";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { advance } from "./tick";
import { activeArrow, ammoSaverChance, arrowChoices, consumeArrow, loadQuiver, refillQuiver, unloadQuiver } from "./quiver";

/**
 * Köcher und Pfeile (1.4.0 „Feder und Stahl“ FK; claude:2026-10-24T20:00:00+02:00). Chef 23.10.: Pfeile sind
 * Verbrauchsgut, einfache Pfeile unbegrenzt, der Köcher ist die einzige Nebenhand für Bögen.
 * Zahlen: design/1.4.0-balance-fernkampf.md §3/§5.
 */
function archer(level = 99): GameState {
  const s = createTestGame({ name: "A", baseAttributes: { dex: 8, con: 10 } }, content, 7);
  s.settings.materialsToStorage = true;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(level) };
  addItem(s.inventory, content, "copper_shortbow", 1);
  addItem(s.inventory, content, "copper_quiver", 1);
  expect(equipItem(s, content, "copper_shortbow").ok).toBe(true);
  expect(equipItem(s, content, "copper_quiver").ok).toBe(true);
  s.character.hp = computeStats(s, content).maxHp;
  return s;
}

describe("Köcher-Regel", () => {
  it("Köcher nur neben einem Bogen; ein Bogen behält ihn, jede andere Haupthand legt ihn ab", () => {
    const s = createTestGame({ name: "A" }, content, 1);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    addItem(s.inventory, content, "copper_quiver", 1);
    expect(equipItem(s, content, "copper_quiver")).toEqual({ ok: false, reason: "Köcher nur mit Bogen" });
    addItem(s.inventory, content, "copper_longbow", 1);
    addItem(s.inventory, content, "copper_shortbow", 1);
    expect(equipItem(s, content, "copper_longbow").ok).toBe(true);
    expect(equipItem(s, content, "copper_quiver").ok).toBe(true);
    expect(s.character.equipment.mainhand).toBe("copper_longbow"); // Köcher verdrängt den Zweihandbogen nicht
    expect(equipItem(s, content, "copper_shortbow").ok).toBe(true); // Bogen gegen Bogen: Köcher bleibt
    expect(s.character.equipment.offhand).toBe("copper_quiver");
    addItem(s.inventory, content, "bronze_sword", 1);
    expect(equipItem(s, content, "bronze_sword").ok).toBe(true); // andere Haupthand ⇒ Köcher zurück
    expect(s.character.equipment.offhand).toBeNull();
    expect(itemCount(s.inventory, "copper_quiver")).toBe(1);
  });

  it("Ablegen des Köchers bringt die geladenen Pfeile ins Lager zurück", () => {
    const s = archer();
    s.bank.copper_arrow = 40;
    expect(loadQuiver(s, content, "copper_arrow")).toEqual({ ok: true, qty: 40 });
    expect(s.bank.copper_arrow).toBeUndefined();
    expect(unequipItem(s, content, "offhand")).toBe(true);
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 }); // claude:2026-10-26T04:15:00+02:00 — Art gemerkt (QA-Fernkampf P3)
    expect(s.bank.copper_arrow).toBe(40);
  });
});

describe("Einlegen", () => {
  it("nimmt alles aus Lager und Inventar, tauscht eine andere Art zurück, prüft das Fernkampf-Level", () => {
    const s = archer();
    s.bank.copper_arrow = 30;
    addItem(s.inventory, content, "copper_arrow", 15);
    expect(loadQuiver(s, content, "copper_arrow")).toEqual({ ok: true, qty: 45 });
    expect(itemCount(s.inventory, "copper_arrow")).toBe(0);
    s.bank.iron_arrow = 10;
    expect(loadQuiver(s, content, "iron_arrow").ok).toBe(true);
    expect(s.character.quiver).toEqual({ itemId: "iron_arrow", qty: 10 });
    expect(s.bank.copper_arrow).toBe(45);
    const low = archer(30);
    low.bank.godiron_arrow = 5;
    expect(loadQuiver(low, content, "godiron_arrow")).toEqual({ ok: false, reason: "level" });
    expect(arrowChoices(low, content).find((c) => c.itemId === "godiron_arrow")?.usable).toBe(false);
  });

  it("der Pfeilbonus liegt auf der Spanne, nur solange Pfeile geladen sind", () => {
    const s = archer();
    const plain = computeStats(s, content);
    s.bank.copper_arrow = 3;
    loadQuiver(s, content, "copper_arrow");
    const loaded = computeStats(s, content);
    const a = content.items.copper_arrow!.arrow!;
    expect(loaded.attackDamageMin).toBeCloseTo(plain.attackDamageMin + a.bonusMin, 9);
    expect(loaded.attackDamageMax).toBeCloseTo(plain.attackDamageMax + a.bonusMax, 9);
    s.character.quiver!.qty = 0;
    expect(activeArrow(s, content)).toBeUndefined();
    expect(computeStats(s, content).attackDamageMax).toBeCloseTo(plain.attackDamageMax, 9);
  });
});

describe("Verbrauch", () => {
  it("ein Pfeil je Schuss; leer ohne Vorrat ⇒ einfache Pfeile, der Kampf läuft weiter", () => {
    const s = archer();
    s.bank.copper_arrow = 8;
    loadQuiver(s, content, "copper_arrow");
    startCombat(s, content, "chicken");
    advance(s, content, 60_000);
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 }); // Art gemerkt, Menge 0
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.combat.stopReason).toBeUndefined();
    expect(s.combat.kills).toBeGreaterThan(0);
  });

  it("Nachfüllen aus dem Lager, nur mit Option an", () => {
    const s = archer();
    s.bank.copper_arrow = 20;
    loadQuiver(s, content, "copper_arrow", 2);
    expect(s.bank.copper_arrow).toBe(18);
    s.character.quiver!.qty = 0;
    s.settings.quiverAutoRefill = false;
    expect(refillQuiver(s, content)).toBe(false);
    s.settings.quiverAutoRefill = true;
    expect(refillQuiver(s, content)).toBe(true);
    expect(s.character.quiver).toEqual({ itemId: "copper_arrow", qty: 18 });
    expect(s.bank.copper_arrow).toBeUndefined();
  });

  it("Sparchance: Köcher-Wert, Summe mit der Haupthand, Deckel 50 %; ohne Ladung kein RNG-Zug", () => {
    const s = archer();
    expect(ammoSaverChance(s, content)).toBeCloseTo(0.04, 9);
    const bow = content.items.copper_shortbow!;
    const greedy: ItemDef = { ...bow, id: "test_greedy_bow", weaponEffect: { type: "ammoSaver", chance: 1, magnitude: 0.9, durationMs: 0 } };
    const c2: ContentDB = { ...content, items: { ...content.items, [greedy.id]: greedy } };
    s.character.equipment.mainhand = greedy.id;
    expect(ammoSaverChance(s, c2)).toBe(AMMO_SAVER_CAP);
    s.character.equipment.mainhand = "copper_shortbow";
    const rngBefore = JSON.stringify(s.rng);
    expect(consumeArrow(s, content, s.rng)).toBeNull();
    expect(JSON.stringify(s.rng)).toBe(rngBefore);
    s.bank.copper_arrow = 1000;
    loadQuiver(s, content, "copper_arrow");
    let used = 0;
    for (let i = 0; i < 1000; i++) if (consumeArrow(s, content, s.rng)) used++;
    expect(1000 - used).toBeGreaterThan(15); // ~4 % gespart
    expect(1000 - used).toBeLessThan(80);
    expect(s.character.quiver!.qty).toBe(1000 - used);
  });

  it("Effektpfeil legt seinen Status auf das Ziel", () => {
    const s = archer();
    addItem(s.inventory, content, "bloodiron_shortbow", 1);
    equipItem(s, content, "bloodiron_shortbow");
    s.bank.bloodiron_arrow_poison = 500;
    loadQuiver(s, content, "bloodiron_arrow_poison");
    s.character.hp = computeStats(s, content).maxHp;
    startCombat(s, content, "dire_wolf"); // 448 HP, kein Gift-Widerstand
    let poisoned = false;
    for (let i = 0; i < 600 && !poisoned; i++) {
      combatStep(s, content);
      poisoned = s.combat.enemyEffects.some((e) => e.type === "poison");
    }
    expect(poisoned).toBe(true);
    expect(s.character.quiver!.qty).toBeLessThan(500);
  });

  it("Abholen ohne Köcher: unloadQuiver ist leer harmlos", () => {
    const s = archer();
    expect(unloadQuiver(s)).toBe(0);
    expect(s.character.quiver).toBeNull();
  });
});

describe("Kette Barren → Spitze → Pfeil", () => {
  it("1 Barren = 45 Spitzen; 15 Schäfte + 15 Spitzen + 5 Federn = 15 Pfeile", () => {
    const forge = content.actions.forge_copper_arrowheads!;
    expect(forge.inputs).toEqual([{ itemId: "copper_bar", qty: 1 }]);
    expect(forge.loot[0]).toMatchObject({ itemId: "copper_arrowheads", min: 45, max: 45 });
    const fletch = content.actions.fletch_copper_arrow!;
    expect(fletch.skill).toBe("bowcraft");
    expect(fletch.inputs).toEqual([
      { itemId: "arrow_shaft", qty: 15 },
      { itemId: "copper_arrowheads", qty: 15 },
      { itemId: "feather", qty: 5 },
    ]);
    expect(fletch.loot[0]).toMatchObject({ itemId: "copper_arrow", min: 15, max: 15 });
    // Jede Pfeilstufe hat ihr Befiedern, jede Spitze ihre Schmiede.
    const arrows = Object.values(content.items).filter((i) => i.arrow && !i.arrow.effect);
    expect(arrows).toHaveLength(12);
    for (const a of arrows) {
      const metal = a.id.replace(/_arrow$/, "");
      expect(content.actions[`fletch_${metal}_arrow`]?.skill).toBe("bowcraft");
      expect(content.actions[`forge_${metal}_arrowheads`]?.skill).toBe("smithing");
    }
  });

  it("die Bogen-Aktionen gehören zur Bognerei, Holzschilde bleiben beim Handwerk", () => {
    expect(content.actions.fletch_copper_shortbow?.skill).toBe("bowcraft");
    expect(content.actions.fletch_bowstring?.skill).toBe("bowcraft");
    const shields = Object.values(content.actions).filter((a) => /^fletch_.*(shield|buckler|pavise)$/.test(a.id));
    expect(shields.length).toBeGreaterThan(0);
    for (const a of shields) expect(a.skill).toBe("leatherworking");
  });
});
