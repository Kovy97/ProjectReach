import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { addItem, itemCount } from "./inventory";
import { isMealItem, tickMealKeep, useConsumable } from "./consumable";
import { advance } from "./tick";
import { eligibleMeals, findNextFood, selectFood, selectMeal, startCombat } from "./combat";

/**
 * Mahlzeit-Platz (1.4.0 „Feder und Stahl“, Chef 23.10.2026; claude:2026-10-23T16:50:00+02:00):
 *  - BF-1: Das Auto-Essen isst nie eine Mahlzeit, außer der Spieler legt sie selbst in den Heilplatz.
 *    Der Ersatz bei leerem Essen wählt nur reine Heilnahrung, und zwar die passendste Heilmenge.
 *  - BF-2/BF-3: „Mahlzeit halten“ isst nur im Kampf nach, kostenlos, und nie über einen laufenden
 *    Mahlzeit-Buff hinweg.
 */
const MEAL = "marshroot_chowder";

describe("Mahlzeit-Platz", () => {
  it("Content-Vorbedingung: die Test-Mahlzeit ist eine Mahlzeit, Fisch ist reine Heilnahrung", () => {
    expect(isMealItem(content, MEAL)).toBe(true);
    expect(isMealItem(content, "cooked_trout")).toBe(false);
    expect(content.items.cooked_trout?.buff).toBeUndefined();
  });

  it("Ersatz-Essen greift keine Mahlzeit und nimmt die passendste Heilung", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const maxHp = computeStats(s, content).maxHp;
    addItem(s.inventory, content, MEAL, 5);
    addItem(s.inventory, content, "cooked_shrimp", 5);
    addItem(s.inventory, content, "cooked_trout", 5);
    const pick = findNextFood(s, content, maxHp);
    expect(pick).not.toBe(MEAL);
    expect(["cooked_shrimp", "cooked_trout"]).toContain(pick);
    // Nur Mahlzeiten im Inventar: kein Ersatz.
    const t = createTestGame({ name: "Y" }, content, 2);
    addItem(t.inventory, content, MEAL, 5);
    expect(findNextFood(t, content, maxHp)).toBeNull();
  });

  it("Läuft das gewählte Essen leer, wechselt das Auto-Essen nie auf eine Mahlzeit", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, MEAL, 3);
    addItem(s.inventory, content, "cooked_trout", 3);
    s.character.food = "cooked_shrimp"; // leer
    startCombat(s, content, "goblin");
    s.character.hp = 1;
    advance(s, content, 100);
    expect(s.character.food).toBe("cooked_trout");
    expect(itemCount(s.inventory, MEAL)).toBe(3);
  });

  it("Eine selbst in den Heilplatz gelegte Mahlzeit isst das Auto-Essen weiterhin", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, MEAL, 3);
    selectFood(s, content, MEAL);
    startCombat(s, content, "goblin");
    s.character.hp = 1;
    advance(s, content, 100);
    expect(itemCount(s.inventory, MEAL)).toBeLessThan(3);
  });

  it("Mahlzeit halten wirkt nur im Kampf", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, MEAL, 3);
    selectMeal(s, content, MEAL);
    expect(tickMealKeep(s, content)).toBe(false); // kein Kampf
    advance(s, content, 1000);
    expect(itemCount(s.inventory, MEAL)).toBe(3);
    startCombat(s, content, "goblin");
    advance(s, content, 100);
    expect(itemCount(s.inventory, MEAL)).toBe(2);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(true);
    // Läuft der Buff, wird nicht nachgegessen.
    advance(s, content, 1000);
    expect(itemCount(s.inventory, MEAL)).toBe(2);
  });

  it("Mahlzeit halten überschreibt keine andere laufende Mahlzeit und lässt sich abschalten", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const other = Object.values(content.items).find((i) => i.id !== MEAL && i.type === "consumable" && i.buff?.category === "food");
    expect(other).toBeTruthy();
    addItem(s.inventory, content, MEAL, 3);
    addItem(s.inventory, content, other!.id, 1);
    expect(useConsumable(s, content, other!.id)).toBe(true);
    selectMeal(s, content, MEAL);
    startCombat(s, content, "goblin");
    advance(s, content, 100);
    expect(itemCount(s.inventory, MEAL)).toBe(3);
    s.character.buffs = [];
    s.character.mealKeep = false;
    advance(s, content, 100);
    expect(itemCount(s.inventory, MEAL)).toBe(3);
  });

  it("Mahlzeit halten nimmt den Vorrat aus der Bank, wenn das Inventar leer ist", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    s.bank[MEAL] = 2;
    selectMeal(s, content, MEAL);
    expect(eligibleMeals(s, content)).toContain(MEAL);
    startCombat(s, content, "goblin");
    advance(s, content, 100);
    expect(s.bank[MEAL]).toBe(1);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(true);
  });

  it("selectMeal nimmt nur Mahlzeiten an", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    selectMeal(s, content, "cooked_trout");
    expect(s.character.meal ?? null).toBeNull();
    selectMeal(s, content, MEAL);
    expect(s.character.meal).toBe(MEAL);
    selectMeal(s, content, null);
    expect(s.character.meal).toBeNull();
  });
});
