import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { AUTO_EAT_COOLDOWN_MS, consumableHeal } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { useConsumable } from "./consumable";
import { addItem, itemCount } from "./inventory";
import { computeStats } from "./character";

/**
 * Balance-Kette Schritt 4 (Chef-GO, Spec weapon-damage-scaling §5.4/§5.5):
 * Hybrid-Heilung `consumableHeal = max(healAmount, round(maxHp · healPct))` + Auto-Eat-Takt 4,5 s.
 * Diese Tests prüfen die Formel ANGEWANDT (durch useConsumable bzw. den Kampf-Tick), nicht nur
 * als Unit — „defined but never applied" wäre sonst unsichtbar.
 */
describe("Food-Hybrid-Heilung (max(flat, %maxHp))", () => {
  it("Unit-Semantik: nur-flat und nur-pct unverändert, bei beiden gewinnt die größere Seite", () => {
    // Nur flat (pct fehlt) → exakt der flache Wert (Alt-Verhalten).
    expect(consumableHeal({ healAmount: 5 }, 100)).toBe(5);
    // Nur pct (flat fehlt) → exakt round(maxHp·pct) (Alt-Verhalten).
    expect(consumableHeal({ healPct: 0.1 }, 100)).toBe(10);
    // Beide gesetzt, kleines maxHp → FLAT dominiert (Früh-Game-Boden; alt hätte pct=5 gewonnen).
    expect(consumableHeal({ healAmount: 12, healPct: 0.1 }, 50)).toBe(12);
    // Beide gesetzt, großes maxHp → PCT dominiert (End-Game-Floor).
    expect(consumableHeal({ healAmount: 12, healPct: 0.1 }, 300)).toBe(30);
    // Keins gesetzt → 0 (kein Heiler).
    expect(consumableHeal({}, 100)).toBe(0);
  });

  it("angewandt (useConsumable): flat dominiert früh, pct dominiert spät", () => {
    (content.items as Record<string, unknown>).__test_hybrid__ = {
      id: "__test_hybrid__",
      type: "consumable",
      stackable: true,
      healAmount: 6,
      healPct: 0.1,
    };
    try {
      // Früh-Game-Charakter: kleines maxHp (con 5 → ~15) ⇒ round(maxHp·0.1) ≈ 2 < flat 6.
      const early = createGame({ name: "X", baseAttributes: { con: 5 } }, content, 1);
      const earlyMax = computeStats(early, content).maxHp;
      expect(Math.round(earlyMax * 0.1)).toBeLessThan(6); // Vorbedingung: flat MUSS dominieren
      early.character.hp = 1;
      addItem(early.inventory, content, "__test_hybrid__", 1);
      expect(useConsumable(early, content, "__test_hybrid__")).toBe(true);
      expect(early.character.hp).toBe(1 + 6); // geheilt um den FLACHEN Wert (alt: nur +2)

      // End-Game-Charakter: großes maxHp ⇒ round(maxHp·0.1) >> flat 6.
      const late = createGame({ name: "X", baseAttributes: { con: 400 } }, content, 1);
      const lateMax = computeStats(late, content).maxHp;
      const pctHeal = Math.round(lateMax * 0.1);
      expect(pctHeal).toBeGreaterThan(6); // Vorbedingung: pct MUSS dominieren
      late.character.hp = 1;
      addItem(late.inventory, content, "__test_hybrid__", 1);
      expect(useConsumable(late, content, "__test_hybrid__")).toBe(true);
      expect(late.character.hp).toBe(1 + pctHeal); // geheilt um den %-Anteil
    } finally {
      delete (content.items as Record<string, unknown>).__test_hybrid__;
    }
  });

  it("Auto-Eat-Takt 4,5 s: unter Dauer-DoT genau 2 Bissen in 9 s (alt @3 s wären es 3)", () => {
    expect(AUTO_EAT_COOLDOWN_MS).toBe(4_500);
    (content.items as Record<string, unknown>).__test_bite__ = {
      id: "__test_bite__",
      type: "consumable",
      stackable: true,
      healAmount: 3,
    };
    try {
      const s = createGame({ name: "X", baseAttributes: { con: 20 } }, content, 1);
      s.character.food = "__test_bite__";
      addItem(s.inventory, content, "__test_bite__", 50);
      startCombat(s, content, "chicken");
      s.combat.enemyTimerMs = -100_000; // Gegner schlägt im Fenster nicht — HP-Verlust nur DoT
      // Spieler greift auch nicht an: ein Kill würde den Kill-Cooldown starten, in dem Auto-Eat
      // gegatet ist (Combat-Feel v2) — die Bissen wären dann nicht mehr rein Cooldown-getaktet.
      s.combat.playerTimerMs = -100_000;
      const maxHp = computeStats(s, content).maxHp; // con 20 → ~51, Tier-0-Schwelle 0.45 → ~23
      s.character.hp = 15; // dauerhaft unter der Schwelle ⇒ Bissen sind rein Cooldown-getaktet
      // Milder DoT (0.1 HP/Tick) hält die HP unter der Schwelle, tötet aber sicher nicht
      // (90 Ticks ≈ −9 HP, Bissen +3): Bissen fallen auf Tick 1 und Tick 46 (Cooldown 4500 ms).
      s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 1 });
      const before = itemCount(s.inventory, "__test_bite__");

      for (let i = 0; i < 90; i++) combatStep(s, content); // 9 s

      expect(before - itemCount(s.inventory, "__test_bite__")).toBe(2); // exakt 2 Bissen
      expect(s.stats.deaths).toBe(0);
      expect(s.character.hp).toBeGreaterThan(0);
      expect(s.character.hp).toBeLessThan(maxHp);
    } finally {
      delete (content.items as Record<string, unknown>).__test_bite__;
    }
  });
});
