import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { addItem, itemCount } from "./inventory";
import { advance } from "./tick";
import { enqueueFight } from "./actions";
import {
  autoConsumeStock,
  combatStep,
  eligibleFoods,
  eligibleHealPotions,
  findNextFood,
  selectFood,
  selectHealPotion,
  setAutoPotionThreshold,
  startCombat,
} from "./combat";
import { slayerRetryAfterDeath } from "./slayer";

/**
 * claude:2026-10-31T16:08:21+01:00 — 1.4.2 (Sweep-Idee, Chef-GO 31.10.2026): Auto-Essen und Auto-Trank ziehen aus der Bank nach, wenn das
 * gewählte Essen bzw. der Trank im Inventar aufgebraucht ist (Muster Handwerk/„Mahlzeit halten“). Inventar zuerst, dann ein Stück direkt aus
 * dem Lager, kein Inventarplatz nötig, deterministisch. Der Slayer-Neuversuch zählt dieselbe Quelle.
 */
const FOOD = "cooked_trout";
const OTHER_FOOD = "cooked_shrimp";
const POTION = "potion_minor_heal";

/** Ein isolierter Kampf-Tick: beide Angriffs-Timer genullt, niemand schlägt zu (kein RNG). */
function quietTick(s: GameState): void {
  s.combat.playerTimerMs = 0;
  s.combat.enemyTimerMs = 0;
  combatStep(s, content);
}

function fightWithBankFood(bankQty: number, invQty = 0): { s: GameState; maxHp: number } {
  const s = createTestGame({ name: "Vorrat" }, content, 3);
  if (invQty > 0) addItem(s.inventory, content, FOOD, invQty);
  if (bankQty > 0) s.bank[FOOD] = bankQty;
  selectFood(s, content, FOOD);
  startCombat(s, content, "goblin");
  return { s, maxHp: computeStats(s, content).maxHp };
}

describe("Auto-Essen aus der Bank", () => {
  it("leeres Inventar, Essen nur in der Bank: isst aus der Bank, die Wahl bleibt, kein Inventarplatz belegt", () => {
    const { s, maxHp } = fightWithBankFood(5);
    s.character.hp = Math.floor(maxHp * 0.1);
    const hpBefore = s.character.hp;
    quietTick(s);
    expect(s.bank[FOOD]).toBe(4);
    expect(itemCount(s.inventory, FOOD)).toBe(0);
    expect(s.character.food).toBe(FOOD);
    expect(s.character.hp).toBeGreaterThan(hpBefore);
    expect(s.combat.log.some((e) => e.kind === "heal" && e.source === "food" && e.itemId === FOOD)).toBe(true);
    expect(autoConsumeStock(s, FOOD)).toBe(4);
  });

  it("Inventar zuerst: liegt das Essen in beiden, bleibt die Bank unberührt", () => {
    const { s, maxHp } = fightWithBankFood(5, 2);
    s.character.hp = Math.floor(maxHp * 0.1);
    quietTick(s);
    expect(itemCount(s.inventory, FOOD)).toBe(1);
    expect(s.bank[FOOD]).toBe(5);
  });

  it("letztes Bank-Stück: Bestand weg, das Bankfach bleibt leer stehen", () => {
    const { s, maxHp } = fightWithBankFood(0);
    s.bank[FOOD] = 1;
    s.bankOrder = [FOOD];
    s.character.hp = Math.floor(maxHp * 0.1);
    quietTick(s);
    expect(s.bank[FOOD]).toBeUndefined();
    expect(s.bankOrder[0]).toBeNull();
    expect(s.character.food).toBe(FOOD); // erst der nächste Versuch merkt „aufgebraucht“
  });

  it("gewähltes Essen überall leer, anderes Essen nur in der Bank: Ersatz aus der Bank", () => {
    const { s, maxHp } = fightWithBankFood(0);
    s.bank[OTHER_FOOD] = 3;
    s.character.hp = Math.floor(maxHp * 0.1);
    expect(findNextFood(s, content, maxHp)).toBe(OTHER_FOOD);
    quietTick(s);
    expect(s.character.food).toBe(OTHER_FOOD);
    expect(s.bank[OTHER_FOOD]).toBe(2);
  });

  it("Ersatz-Essen im Inventar hat Vorrang vor der Bank", () => {
    const { s, maxHp } = fightWithBankFood(0);
    addItem(s.inventory, content, OTHER_FOOD, 1);
    s.bank.cooked_salmon = 9;
    expect(findNextFood(s, content, maxHp)).toBe(OTHER_FOOD);
  });

  it("kein Essen irgendwo: Wahl wird geleert, nichts geheilt", () => {
    const { s, maxHp } = fightWithBankFood(0);
    s.character.hp = Math.floor(maxHp * 0.1);
    const hpBefore = s.character.hp;
    quietTick(s);
    expect(s.character.food).toBeNull();
    expect(s.character.hp).toBe(hpBefore);
  });

  it("offline == online: ein großes Fenster und viele kleine Schritte enden bit-gleich (Essen nur in der Bank)", () => {
    const build = (): GameState => {
      const s = createTestGame({ name: "Vorrat", createdAt: 1 }, content, 11);
      s.bank[FOOD] = 400;
      selectFood(s, content, FOOD);
      enqueueFight(s, content, "cow", null);
      return s;
    };
    const one = build();
    advance(one, content, 10 * 60_000, { offline: true });
    const many = build();
    for (let i = 0; i < 6000; i++) advance(many, content, 100, { offline: true });
    expect(one.bank[FOOD] ?? 0).toBeLessThan(395); // es wurde wirklich mehrfach aus der Bank gegessen
    expect(itemCount(one.inventory, FOOD)).toBe(0);
    expect(JSON.stringify(many)).toBe(JSON.stringify(one));
  });
});

describe("Auto-Trank aus der Bank", () => {
  it("Trank nur in der Bank: trinkt von dort, Takt gesetzt, Inventar unberührt", () => {
    const s = createTestGame({ name: "Vorrat" }, content, 1);
    s.bank[POTION] = 3;
    selectHealPotion(s, content, POTION);
    setAutoPotionThreshold(s, 0.4);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = Math.floor(maxHp * 0.3);
    const hpBefore = s.character.hp;
    quietTick(s);
    expect(s.bank[POTION]).toBe(2);
    expect(itemCount(s.inventory, POTION)).toBe(0);
    expect(s.character.hp).toBeGreaterThan(hpBefore);
    expect(s.combat.autoPotionCooldownMs ?? 0).toBeGreaterThan(0);
    expect(s.combat.log.some((e) => e.kind === "heal" && e.source === "potion" && e.itemId === POTION)).toBe(true);
    // Während des Takts kein zweiter Schluck aus der Bank.
    s.character.hp = Math.floor(maxHp * 0.3);
    quietTick(s);
    expect(s.bank[POTION]).toBe(2);
  });

  it("Inventar zuerst, danach die Bank; ohne Bestand irgendwo kein Schluck", () => {
    const s = createTestGame({ name: "Vorrat" }, content, 1);
    addItem(s.inventory, content, POTION, 1);
    s.bank[POTION] = 1;
    selectHealPotion(s, content, POTION);
    setAutoPotionThreshold(s, 0.4);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = Math.floor(maxHp * 0.3);
    quietTick(s);
    expect(itemCount(s.inventory, POTION)).toBe(0);
    expect(s.bank[POTION]).toBe(1);
    s.combat.autoPotionCooldownMs = 0;
    s.character.hp = Math.floor(maxHp * 0.3);
    quietTick(s);
    expect(s.bank[POTION]).toBeUndefined();
    s.combat.autoPotionCooldownMs = 0;
    s.character.hp = Math.floor(maxHp * 0.3);
    const hpBefore = s.character.hp;
    quietTick(s);
    expect(s.character.hp).toBe(hpBefore);
    expect(s.character.autoPotion.healPotionId).toBe(POTION); // die Wahl bleibt (wie bisher)
  });

  it("eligibleFoods listet Essen aus Inventar und Bank (ohne Heiltränke), jede Sorte einmal", () => {
    const s = createTestGame({ name: "Vorrat" }, content, 1);
    addItem(s.inventory, content, OTHER_FOOD, 1);
    s.bank[FOOD] = 3;
    s.bank[OTHER_FOOD] = 2;
    s.bank[POTION] = 2;
    const foods = eligibleFoods(s, content);
    expect(foods).toContain(FOOD);
    expect(foods).toContain(OTHER_FOOD);
    expect(foods).not.toContain(POTION);
    expect(new Set(foods).size).toBe(foods.length);
  });

  it("eligibleHealPotions listet Bank-Tränke hinter den Inventar-Tränken, ohne Doppel", () => {
    const s = createTestGame({ name: "Vorrat" }, content, 1);
    addItem(s.inventory, content, "duskcap_tonic", 1);
    s.bank[POTION] = 2;
    s.bank.duskcap_tonic = 4;
    s.bank[FOOD] = 5; // Essen gehört nicht in den Trank-Platz
    expect(eligibleHealPotions(s, content)).toEqual(["duskcap_tonic", POTION]);
  });
});

describe("Slayer-Neuversuch zählt Inventar und Bank", () => {
  function doomed(): GameState {
    const s = createTestGame({ name: "Wagemut" }, content, 23);
    s.slayerTask = { masterId: "brenna_ashwick", monsterId: "bull_boss", isTower: false, required: 5, progress: 0, xpReward: 0, pointReward: 5 };
    s.character.food = FOOD;
    return s;
  }

  it("gewähltes Essen nur in der Bank: Neuversuch", () => {
    const s = doomed();
    s.bank[FOOD] = 10;
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(true);
    expect(s.combat.slayerRetryNote?.kind).toBe("retry");
  });

  it("gewähltes Essen aufgebraucht, Ersatz-Essen in der Bank: Neuversuch (Auto-Essen springt um)", () => {
    const s = doomed();
    s.bank[OTHER_FOOD] = 10;
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(true);
  });

  it("nur Heiltränke in der Bank zählen nicht als Essen", () => {
    const s = doomed();
    s.bank[POTION] = 10;
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(false);
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "noFood" });
  });
});
