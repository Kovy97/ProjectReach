import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, MonsterDef } from "@hearthforge/shared";
import { DEFENSE_MITIGATION_K, DEFENSE_MITIGATION_MAX } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { computeStats } from "./character";
import { addItem, itemCount } from "./inventory";
import { combatStep, selectHealPotion, setAutoPotionThreshold, startCombat } from "./combat";

/**
 * Task #220 — Combat-Log-Anreicherung. Der Log/Floating-Text soll (1) zeigen, aus welcher QUELLE
 * eine Heilung kommt (Auto-Trank/Auto-Eat/Lebensraub/Kill/Effekt/Ward) und (2) wie viel Schaden die
 * GEGNER-RÜSTUNG schluckt (rawDamage/mitigated am Spieler-Angriffs-Event). Rein additive Felder,
 * deterministisch (kein zusätzlicher RNG-Draw).
 */

/** Klont die ContentDB mit einem override-ten Monster (content-neutral, wie das mitigation-Testpattern). */
function contentWithMonster(id: string, overrides: Partial<MonsterDef>): ContentDB {
  const base = content.monsters[id]!;
  return {
    ...content,
    monsters: { ...content.monsters, [id]: { ...base, ...overrides } },
  };
}

describe("Combat-Log: Heil-Quelle (source)", () => {
  it("Auto-Eat taggt das Heil-Event mit source 'food' + itemId", () => {
    // Muster aus autoeat-dot.test.ts: der DoT drückt HP unter die Schwelle → Auto-Eat greift.
    // Beide Angriffs-Timer eingefroren: ein Spieler-Kill würde den Kill-Cooldown starten, in dem
    // Auto-Eat gegatet ist (Combat-Feel v2). Fenster 8 s: die 45-%-Schwelle (Balance-Kette
    // Schritt 4) wird bei maxHp 21 nach ~5,9 s DoT unterschritten.
    const s = createTestGame({ name: "X", baseAttributes: { con: 5 } }, content, 1);
    s.character.food = "cooked_trout";
    addItem(s.inventory, content, "cooked_trout", 50);
    startCombat(s, content, "chicken");
    s.combat.enemyTimerMs = -100_000; // HP-Verlust ausschließlich vom DoT (kein Gegner-Schlag)
    s.combat.playerTimerMs = -100_000;
    s.character.hp = computeStats(s, content).maxHp;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 2 });

    for (let i = 0; i < 80; i++) combatStep(s, content);

    const healEvent = s.combat.log.find((e) => e.by === "player" && e.kind === "heal" && e.source === "food");
    expect(healEvent).toBeDefined();
    expect(healEvent!.itemId).toBe("cooked_trout");
  });

  it("Auto-Trank taggt das Heil-Event mit source 'potion' + itemId", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "potion_minor_heal", 5);
    selectHealPotion(s, content, "potion_minor_heal");
    setAutoPotionThreshold(s, 0.4);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    // Isolierter Tick: beide Timer genullt → niemand schlägt zu; HP unter die Trank-Schwelle.
    s.combat.playerTimerMs = 0;
    s.combat.enemyTimerMs = 0;
    s.character.hp = maxHp * 0.3;
    combatStep(s, content);

    const healEvent = s.combat.log.find((e) => e.by === "player" && e.kind === "heal" && e.source === "potion");
    expect(healEvent).toBeDefined();
    expect(healEvent!.itemId).toBe("potion_minor_heal");
  });
});

describe("Combat-Log: rawDamage/mitigated (Gegner-Rüstung)", () => {
  /** Manuelle Referenz-Reduktion (an dieselbe Konstante gebunden wie resolveAttack). */
  function reductionFor(defense: number): number {
    return Math.min(DEFENSE_MITIGATION_MAX, defense / (defense + DEFENSE_MITIGATION_K));
  }

  /**
   * Fährt den Kampf gegen `monsterId` (im gegebenen Content-Klon), bis ein Spieler-Treffer im Log
   * steht, und liefert dieses Event. Gegner tut 0 Schaden + riesige maxHp ⇒ der Spieler überlebt
   * und tötet nicht sofort; monster.evasion 0 ⇒ sichere Treffer.
   */
  function firstPlayerHit(c: ContentDB, monsterId: string) {
    const s = createTestGame({ name: "Held", baseAttributes: { str: 20, dex: 12, con: 20 } }, c, 3);
    startCombat(s, c, monsterId);
    for (let i = 0; i < 400; i++) {
      combatStep(s, c);
      const hit = s.combat.log.find((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"));
      if (hit) return hit;
    }
    return undefined;
  }

  it("gegen einen Rüstungs-Gegner: mitigated > 0 und rawDamage − mitigated === amount", () => {
    // Hohe defense ⇒ spürbare Reduktion; damage 0 + riesige HP + evasion 0 ⇒ Spieler landet Treffer, stirbt nicht.
    const c = contentWithMonster("chicken", { defense: 200, evasion: 0, damage: 0, maxHp: 1_000_000 });
    expect(reductionFor(200)).toBeGreaterThan(0.1); // Sanity: die Rüstung dämpft wirklich

    const hit = firstPlayerHit(c, "chicken");
    expect(hit).toBeDefined();
    expect(hit!.rawDamage).toBeGreaterThan(hit!.amount); // Roh-Schaden lag höher als der zugefügte
    expect(hit!.mitigated).toBeGreaterThan(0); // die Rüstung hat etwas geschluckt
    expect(hit!.rawDamage! - hit!.mitigated!).toBe(hit!.amount); // Konsistenz für die UI-Zeile
  });

  it("gegen einen defense-0-Gegner: mitigated === 0 und rawDamage === amount", () => {
    const c = contentWithMonster("chicken", { defense: 0, evasion: 0, damage: 0, maxHp: 1_000_000 });

    const hit = firstPlayerHit(c, "chicken");
    expect(hit).toBeDefined();
    expect(hit!.mitigated).toBe(0); // keine Rüstung → nichts geschluckt
    expect(hit!.rawDamage).toBe(hit!.amount);
  });
});
