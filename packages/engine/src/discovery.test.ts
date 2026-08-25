import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, QuestDef } from "@hearthforge/shared";
import { createGame } from "./state";
import { combatStep, killCreditMonsterId, startCombat } from "./combat";
import { startDungeon } from "./dungeon";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { equipItem } from "./equipment";
import {
  addItem,
  addItemOrBank,
  discoverPossessedItems,
  isItemDiscovered,
  markItemDiscovered,
} from "./inventory";
import { intakeInstance } from "./enchant";
import { monsterKills } from "./drops";
import { buyBack, buyItem, sellItem } from "./shop";
import { addQuestTokens, buyTokenShopOffer, claimQuest, evaluateQuests } from "./quests";
import { xpForLevel } from "./leveling";

/**
 * GUARDS Bestiarium-Sammlungs-Fundament (SAVE_VERSION 58, Chef-GO 2026-07-09):
 *  - `monsterKills` zählt JEDEN Kill (Normalkampf UND Dungeon-Wellen) — Selektor `monsterKills()`.
 *  - `discoveredItems` markiert Erst-Besitz an den ZENTRALEN Zugangs-Pfaden (addItemOrBank /
 *    intakeInstance / Shop-Kauf / Buy-Back / createGame-Starter) — Selektor `isItemDiscovered()`.
 * Alles reine Buchführung: kein RNG-Zug, keine Sim-/Kampf-Verhaltensänderung.
 */

/** Setzt alle Kampf-Fertigkeiten auf ein Level (Muster dungeon.test.ts). */
function setCombatLevel(s: ReturnType<typeof createGame>, lvl: number): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
}

describe("Bestiarium: Kill-Zähler (monsterKills)", () => {
  it("Normalkampf: jeder Kill inkrementiert monsterKills; Selektor liest nie raw", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 20, dex: 16, con: 16 } }, content, 3);
    expect(monsterKills(s, "chicken")).toBe(0);
    startCombat(s, content, "chicken");
    for (let i = 0; i < 600 && monsterKills(s, "chicken") < 2; i++) combatStep(s, content);
    expect(monsterKills(s, "chicken")).toBeGreaterThanOrEqual(2);
    // Selektor == Raw-Record (eine Quelle der Wahrheit) und synchron zum Gesamt-Kill-Zähler.
    expect(monsterKills(s, "chicken")).toBe(s.monsterKills.chicken);
    expect(s.stats.kills).toBe(monsterKills(s, "chicken"));
    // Nie gekämpftes Monster bleibt 0 (kein Geister-Key).
    expect(monsterKills(s, "ash_rat")).toBe(0);
  });

  it("Dungeon-Wellen zählen mit: jeder Encounter-Kill landet in monsterKills", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, 7);
    setCombatLevel(s, 99);
    for (const g of ["godiron_sword", "godiron_fullhelm", "godiron_platebody", "godiron_platelegs", "godiron_kiteshield"]) {
      addItem(s.inventory, content, g, 1);
      equipItem(s, content, g);
    }
    addItem(s.inventory, content, "cooked_voidray", 1000);
    s.character.food = "cooked_voidray";
    s.dungeonsUnlocked["crypt_depths"] = true; // Einmal-Unlock (SAVE 60)
    const d = content.dungeons.find((x) => x.id === "crypt_depths")!;

    expect(startDungeon(s, content, "crypt_depths")).toBe(true);
    let guard = 0;
    while (s.combat.dungeonId && guard++ < 400) advance(s, content, 5_000);
    expect(s.combat.dungeonId, "Dungeon nicht beendet").toBe(null);

    // Jedes Encounter-Monster hat mindestens einen Bestiariums-Kill; die Summe über die
    // (deduplizierten) Encounter-IDs entspricht exakt der Wellen-Anzahl — kein Kill fehlt/doppelt.
    // Seit W1 (dg_-Alias) schreiben Kills auf die BASIS-Id (killCreditMonsterId) — der
    // Bestiariums-Zähler kennt dg_goblin_rogue & Co. bewusst nicht als eigene Einträge.
    const credit = (id: string) => killCreditMonsterId(content, id);
    const unique = [...new Set(d.encounters.map(credit))];
    for (const id of unique) expect(monsterKills(s, id), `Dungeon-Kill ${id} fehlt`).toBeGreaterThanOrEqual(1);
    const sum = unique.reduce((n, id) => n + monsterKills(s, id), 0);
    expect(sum).toBe(d.encounters.length);
  });
});

describe("Item-Entdeckung (discoveredItems / isItemDiscovered)", () => {
  it("createGame: Starterbesitz ist entdeckt (inkl. DIREKT ausgerüsteter Startwaffe/-rüstung)", () => {
    const s = createGame({ name: "X", startingStyle: "melee", starterKit: true }, content, 1);
    expect(isItemDiscovered(s, "rusty_sword")).toBe(true); // Startwaffe: nur equipment, nie addItem
    expect(isItemDiscovered(s, "cooked_shrimp")).toBe(true); // Starter-Food
    expect(isItemDiscovered(s, "graywort_seed")).toBe(true); // Starter-Saat
    expect(isItemDiscovered(s, "copper_platebody")).toBe(true); // Starter-Rüstung (direkt equipped)
    expect(isItemDiscovered(s, "godiron_sword")).toBe(false); // nie besessen
  });

  it("Kampf-Drop: erbeuteter Loot ist entdeckt (zentraler addItemOrBank-Pfad)", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 20, dex: 16, con: 16 } }, content, 3);
    startCombat(s, content, "chicken");
    for (let i = 0; i < 600 && (s.seenDrops.chicken?.length ?? 0) === 0; i++) combatStep(s, content);
    const dropped = s.seenDrops.chicken ?? [];
    expect(dropped.length).toBeGreaterThan(0);
    for (const id of dropped) expect(isItemDiscovered(s, id), `Drop ${id} nicht entdeckt`).toBe(true);
  });

  it("Craft: der Output einer Verarbeitungs-Aktion ist entdeckt (tick → addItemOrBank)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.smithing = { xp: xpForLevel(5) };
    addItem(s.inventory, content, "copper_ore", 5);
    addItem(s.inventory, content, "tin_ore", 5);
    expect(isItemDiscovered(s, "bronze_bar")).toBe(false);
    setActiveAction(s, content, "smelt_bronze", 1);
    advance(s, content, 60_000);
    expect(isItemDiscovered(s, "bronze_bar")).toBe(true);
  });

  it("Kauf (buyItem) und Buy-Back markieren Erst-Besitz", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.gold = 1_000;
    expect(isItemDiscovered(s, "coal")).toBe(false);
    expect(buyItem(s, content, "coal", 10, 1)).toBe(1);
    expect(isItemDiscovered(s, "coal")).toBe(true);

    // Buy-Back: Verkauf + Marker künstlich löschen (simuliert ein VOR dem Feature verkauftes Item),
    // dann Rückkauf → wieder entdeckt.
    sellItem(s, content, "coal", 1);
    delete s.discoveredItems.coal;
    expect(buyBack(s, content, 0)).toBe(true);
    expect(isItemDiscovered(s, "coal")).toBe(true);
  });

  it("Quest-Belohnung: claimQuest-Items sind entdeckt (Reward-Pipeline → addItemOrBank)", () => {
    const quests: QuestDef[] = [
      {
        id: "q_disc",
        name: { en: "Disc", de: "Disc" },
        description: { en: "", de: "" },
        objectives: [{ type: "kill_monster", target: "goblin", count: 1 }],
        rewards: { gold: 5, items: [{ id: "oak_log", qty: 2 }] },
      },
    ];
    const c: ContentDB = { ...content, quests };
    const s = createGame({ name: "X" }, c, 1);
    s.monsterKills.goblin = 1;
    evaluateQuests(s, c);
    expect(isItemDiscovered(s, "oak_log")).toBe(false);
    expect(claimQuest(s, c, "q_disc")).toBe(true);
    expect(isItemDiscovered(s, "oak_log")).toBe(true);
  });

  it("Token-Shop: gekauftes Angebot ist entdeckt (buyTokenShopOffer → addItemOrBank)", () => {
    const offer = content.tokenShop?.[0];
    expect(offer, "content.tokenShop ist leer — Guard braucht mind. ein Angebot").toBeDefined();
    const s = createGame({ name: "X" }, content, 1);
    addQuestTokens(s, offer!.tokenCost);
    delete s.discoveredItems[offer!.itemId]; // falls Starterbesitz kollidiert
    expect(buyTokenShopOffer(s, content, offer!.id).ok).toBe(true);
    expect(isItemDiscovered(s, offer!.itemId)).toBe(true);
  });

  it("Instanz-Zugang (intakeInstance): baseItemId ist entdeckt — Suffix-Drop-Pfad", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(isItemDiscovered(s, "iron_sword")).toBe(false);
    intakeInstance(s, content, {
      instanceId: "inst_disc",
      baseItemId: "iron_sword",
      affixes: [],
      suffix: { suffixId: "sfx_x", ilvl: 10, roll: 0.5 },
    });
    expect(isItemDiscovered(s, "iron_sword")).toBe(true);
  });

  it("KEIN Besitz = KEINE Entdeckung: voller Verlust-Overflow (Auto-Bank aus) markiert nicht", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.settings.autoBank = false;
    // Inventar hart füllen (jeder Slot belegt, kein Stack-Raum für eine NEUE Art).
    s.inventory.slots = s.inventory.slots.map(() => ({ itemId: "copper_ore", qty: 999 }));
    const res = addItemOrBank(s, content, "oak_log", 5);
    expect(res.toInventory + res.toBank).toBe(0);
    expect(isItemDiscovered(s, "oak_log")).toBe(false);
  });

  it("markItemDiscovered ist idempotent; discoverPossessedItems unioniert monoton (Backfill-Helfer)", () => {
    const s = createGame({ name: "X" }, content, 1);
    markItemDiscovered(s, "coal");
    markItemDiscovered(s, "coal");
    expect(s.discoveredItems.coal).toBe(true);

    // Union aus dem IST-Bestand: Inventar + Bank + Vault + Equipment; entfernt nie Einträge.
    addItem(s.inventory, content, "copper_ore", 1);
    s.bank.oak_log = 2;
    s.bankInstances.push({ instanceId: "inst_v", baseItemId: "steel_sword", affixes: [{ affixId: "a", tier: 1 }] });
    s.character.equipment.offhand = "copper_kiteshield";
    const before = Object.keys(s.discoveredItems).length;
    discoverPossessedItems(s);
    for (const id of ["copper_ore", "oak_log", "steel_sword", "copper_kiteshield", "coal"]) {
      expect(isItemDiscovered(s, id), `${id} fehlt nach Union`).toBe(true);
    }
    expect(Object.keys(s.discoveredItems).length).toBeGreaterThanOrEqual(before);
    // Idempotent: zweiter Lauf ändert nichts.
    const snapshot = { ...s.discoveredItems };
    discoverPossessedItems(s);
    expect(s.discoveredItems).toEqual(snapshot);
  });
});
