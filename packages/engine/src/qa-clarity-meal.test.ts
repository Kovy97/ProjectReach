import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { addItem, itemCount } from "./inventory";
import { mealStock, tickMealKeep } from "./consumable";
import { advance } from "./tick";
import { selectFood, selectMeal, startCombat } from "./combat";

/**
 * QA 1.4.0 Welle 1 „Klarheit“ BF (Kontrolleur, claude:2026-10-25T23:30:00+02:00).
 * Grenzfälle des Mahlzeit-Platzes: ohne Vorrat, Mahlzeit gleich Heilessen, offline == online.
 */
const MEAL = "marshroot_chowder";
const DUR = content.items[MEAL]!.buff!.durationMs;

describe("QA BF: Mahlzeit-Platz Grenzfälle", () => {
  it("Mahlzeit ohne Vorrat: kein Essen, kein Absturz, Wahl bleibt stehen", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    selectMeal(s, content, MEAL);
    expect(mealStock(s, MEAL)).toBe(0);
    startCombat(s, content, "goblin");
    for (let i = 0; i < 50; i++) advance(s, content, 100);
    expect(s.character.meal).toBe(MEAL);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(false);
    expect(tickMealKeep(s, content)).toBe(false);
  });

  // claude:2026-10-26T06:00:00+02:00 — Befund P3 behoben: der Mahlzeit-Bissen zählt als Auto-Ess-Bissen (Takt), nur eine Portion je Tick.
  it("Mahlzeit gleich Heilessen: auch bei niedrigen HP geht im ersten Tick nur EINE Portion weg", () => {
    // Hohe max. HP: die Mahlzeit heilt 7 %, die Ess-Schwelle liegt bei 45 % ⇒ „Mahlzeit halten“ (Tick-Anfang) und
    // Auto-Essen (Tick-Ende) essen beide dieselbe Mahlzeit im selben Tick. Bei winzigen HP-Balken (Frühspiel) hebt der
    // Mahlzeit-Bissen die HP schon über die Schwelle, dann bleibt es bei einer Portion.
    const s = createTestGame({ name: "X", baseAttributes: { con: 200 } }, content, 1);
    addItem(s.inventory, content, MEAL, 10);
    selectFood(s, content, MEAL);
    selectMeal(s, content, MEAL);
    startCombat(s, content, "goblin");
    s.character.hp = 1;
    advance(s, content, 100);
    const afterFirst = itemCount(s.inventory, MEAL);
    expect(10 - afterFirst).toBe(1);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(true);
    // Ab jetzt läuft der Buff (Auto-Essen lädt ihn auf), „Mahlzeit halten“ isst nicht mehr dazu.
    s.character.hp = computeStats(s, content).maxHp;
    advance(s, content, 5000);
    expect(itemCount(s.inventory, MEAL)).toBe(afterFirst);
  });

  it("offline == online: derselbe Verbrauch über 20 Minuten, eine Portion je Buff-Dauer, aus der Bank", () => {
    const build = (): ReturnType<typeof createTestGame> => {
      const s = createTestGame({ name: "O", baseAttributes: { con: 200 } }, content, 9);
      s.bank[MEAL] = 50;
      selectMeal(s, content, MEAL);
      s.character.food = null;
      s.character.hp = computeStats(s, content).maxHp;
      startCombat(s, content, "chicken"); // echter Dauerkampf mit Respawns (kein Patt-Stopp)
      return s;
    };
    const online = build();
    for (let i = 0; i < 1200; i++) advance(online, content, 1000);
    const offline = build();
    advance(offline, content, 1_200_000, { offline: true });
    expect(online.combat.monsterId).not.toBeNull();
    const usedOnline = 50 - (online.bank[MEAL] ?? 0);
    const usedOffline = 50 - (offline.bank[MEAL] ?? 0);
    expect(usedOnline).toBe(usedOffline);
    // 20 min / 3 min Buff: 7 Portionen (eine sofort, dann alle 180 s), ± eine durch Tick-Rundung.
    expect(usedOnline).toBeGreaterThanOrEqual(Math.floor(1_200_000 / DUR));
    expect(usedOnline).toBeLessThanOrEqual(Math.floor(1_200_000 / DUR) + 1);
  });

  it("Heilplatz-Wechsel im Kampf auf eine Mahlzeit: Auto-Essen isst sie, Mahlzeit-Platz bleibt unberührt", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    const other = Object.values(content.items).find((i) => i.id !== MEAL && i.type === "consumable" && i.buff?.category === "food")!;
    addItem(s.inventory, content, MEAL, 3);
    addItem(s.inventory, content, other.id, 3);
    selectMeal(s, content, MEAL);
    selectFood(s, content, "cooked_trout"); // leer ⇒ Ersatz greift nur reine Heilnahrung
    startCombat(s, content, "goblin");
    advance(s, content, 100); // Mahlzeit halten isst MEAL
    expect(itemCount(s.inventory, MEAL)).toBe(2);
    selectFood(s, content, other.id); // Spieler legt bewusst eine andere Mahlzeit in den Heilplatz
    s.character.hp = 1;
    advance(s, content, 100);
    expect(itemCount(s.inventory, other.id)).toBe(2); // Auto-Essen isst die gewählte Mahlzeit
    expect(s.character.meal).toBe(MEAL);
    // Die Heil-Mahlzeit verdrängt den MEAL-Buff (gleiche Kategorie); „Mahlzeit halten“ isst MEAL erst wieder, wenn kein Food-Buff läuft.
    expect(s.character.buffs.some((b) => b.itemId === other.id)).toBe(true);
    expect(s.character.buffs.some((b) => b.itemId === MEAL)).toBe(false);
    expect(itemCount(s.inventory, MEAL)).toBe(2);
  });
});
