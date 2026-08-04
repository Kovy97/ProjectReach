import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { OUT_OF_COMBAT_HP_REGEN_PCT } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { advance } from "./tick";
import { startCombat, combatStep } from "./combat";

/**
 * Guards für die ZWEI Regen-Entscheide des Chefs:
 *  - 2026-07-02 (SAVE_VERSION 49): IM KAMPF gibt es KEINE natürliche HP-Regeneration — Heilung
 *    kommt dort ausschließlich aus Items/Effekten (Auto-Eat, Auto-Trank, Lifesteal, Pet-Heals,
 *    hpRegenPerSec aus Gear/Buffs, Tod-Voll-Heal). Verhindert die alte Regen-Unsterblichkeit.
 *  - 2026-07-13: AUSSERHALB des Kampfes regeneriert der Held natürlich mit
 *    OUT_OF_COMBAT_HP_REGEN_PCT (1 % der Max-HP pro Sekunde, voll in ≤100 s) — nach dem Kampf
 *    füllt er sich von selbst wieder auf. Mana-Regeneration (WIS-basiert) bleibt unberührt.
 */
describe("HP-Regeneration: natürlich NUR außerhalb des Kampfes", () => {
  it("außerhalb des Kampfes: 1 % Max-HP pro Sekunde, gedeckelt aufs Maximum", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.character.food).toBeNull(); // Baseline ohne Starterkit: kein Auto-Eat-Food
    expect(s.character.buffs.length).toBe(0);
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = 1;

    advance(s, content, 10_000); // 10 s idle
    const expected = 1 + maxHp * OUT_OF_COMBAT_HP_REGEN_PCT * 10;
    expect(s.character.hp).toBeCloseTo(Math.min(maxHp, expected), 5);

    advance(s, content, 600_000); // 10 min idle → sicher voll, nie über Max
    expect(s.character.hp).toBe(maxHp);
  });

  it("außerhalb des Kampfes: Mana regeneriert weiterhin (WIS-basiert, unberührt)", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.mana = 0;

    advance(s, content, 60_000);

    expect(s.character.mana).toBeGreaterThan(0);
  });

  it("im Kampf (Kill-Cooldown-Pause): HP steigen ohne Food/Items NICHT von allein (Entscheid 2026-07-02)", () => {
    const s = createGame({ name: "X" }, content, 1);
    startCombat(s, content, "goblin");
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = Math.round(maxHp * 0.3);
    const before = s.character.hp;
    // Kill-Cooldown aktiv ⇒ keine Angriffe beider Seiten; nur passiver Unterhalt (Regen/DoT) läuft
    // (Auto-Eat/Auto-Trank sind im Cooldown gegatet — Combat-Feel v2 #0). Ohne hpRegenPerSec: 0 Heilung.
    s.combat.cooldownRemainingMs = 2_000;

    for (let i = 0; i < 10; i++) combatStep(s, content);

    expect(s.character.hp).toBe(before); // tickPlayerRegen heilt ohne hpRegenPerSec-Quelle nichts
  });

  it("hpRegenPerSec aus Buffs/Gear heilt weiterhin ZUSÄTZLICH (Special Effects bleiben)", () => {
    const s = createGame({ name: "X" }, content, 1);
    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = 1;
    (content.items as Record<string, unknown>).__test_regen_guard__ = {
      id: "__test_regen_guard__",
      type: "consumable",
      stackable: true,
      buff: { durationMs: 600_000, bonus: { hpRegenPerSec: 5 } },
    };
    s.character.buffs.push({ itemId: "__test_regen_guard__", remainingMs: 600_000 });

    advance(s, content, 10_000);
    delete (content.items as Record<string, unknown>).__test_regen_guard__;

    // Buff-Regen (5/s) + natürlicher Idle-Regen (1 %/s) stapeln — deutlich über dem
    // natürlichen Anteil allein, gedeckelt aufs Maximum.
    const naturalOnly = 1 + maxHp * OUT_OF_COMBAT_HP_REGEN_PCT * 10;
    expect(s.character.hp).toBeGreaterThan(Math.min(maxHp, naturalOnly));
  });
});
