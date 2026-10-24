import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { EquipSlot, GameState, ItemInstance } from "@hearthforge/shared";
import { WARD_RECHARGE_PCT_PER_CAST, affixAppliesToItem } from "@hearthforge/shared";
import { computeStats } from "./character";
import { collectSpecialEffects, combatStep, startCombat } from "./combat";
import { trinityGatePasses } from "./enchant";
import { createTestGame } from "./test-helpers";

/**
 * QA-Runde 2, 1.4.0 — F2 Schleiertrinker-Rune (`affix_veil_drinker`, Stufe IV, Stoff):
 * 10 % des verursachten Schadens füllen den eigenen Ward. Geprüft: Trinitäts-Gate (nur Stoff), keine Stapelung über
 * mehrere Teile (stärkste Quelle zählt, auch gegen das Hohlschleier-Medaillon 0,08), Wirkung je Treffer (zusätzlich zum
 * Cast-Nachladen W1), keine Doppelzählung (kein Warding-XP aus dem Rückfluss, kein Rückfluss aus DoT-Ticks), Deckel maxWard.
 * claude:2026-10-24T12:00:00+02:00 — Reine Prüfdatei, ändert keinen Produktcode.
 */

const CLOTH: Record<EquipSlot & ("helmet" | "body" | "legs" | "gloves" | "boots"), string> = {
  helmet: "voidweave_mitre",
  body: "voidweave_vestment",
  legs: "voidweave_skirt",
  gloves: "voidweave_handwraps",
  boots: "voidweave_sandals",
};

function veilInstance(slot: string, itemId: string): ItemInstance {
  return { instanceId: `qa2-${slot}`, baseItemId: itemId, affixes: [{ affixId: "affix_veil_drinker", tier: 4 }] };
}

function mageWithVeil(slots: Array<keyof typeof CLOTH>, extra?: Partial<Record<EquipSlot, string>>): GameState {
  const staff = Object.values(content.items).find((i) => i.weaponStyle === "magic" && i.twoHanded && (i.requirements?.magic ?? 0) >= 90)!;
  const s = createTestGame({ name: "V", baseAttributes: { con: 200, int: 300 } }, content, 5);
  s.character.food = null;
  s.character.equipment.mainhand = staff.id;
  const eqi: NonNullable<GameState["character"]["equippedInstances"]> = {};
  for (const slot of Object.keys(CLOTH) as Array<keyof typeof CLOTH>) {
    s.character.equipment[slot] = CLOTH[slot];
    if (slots.includes(slot)) eqi[slot] = veilInstance(slot, CLOTH[slot]);
  }
  for (const [slot, id] of Object.entries(extra ?? {})) s.character.equipment[slot as EquipSlot] = id;
  s.character.equippedInstances = eqi;
  return s;
}

describe("QA2 F2: Schleiertrinker — Gate und Stapelung", () => {
  const def = content.affixes!.affix_veil_drinker!;

  it("Rune ist Stufe IV, Rüstung-only, verlangt Ward-Kapazität am Zielteil", () => {
    expect(def.weaponEffectByTier?.[3]).toEqual({ type: "wardSiphon", chance: 1, magnitude: 0.1, durationMs: 0 });
    expect(def.appliesTo).toEqual(["armor"]);
    expect(def.requiresTrinity).toBe("wardCapacity");
    expect(trinityGatePasses(def, 4, content.items.voidweave_vestment!)).toBe(true);
    // Platte und Leder: abgelehnt (kein wardCapacity).
    const plate = Object.values(content.items).find((i) => (i.armorRating ?? 0) > 0 && i.slot === "body" && !(i.wardCapacity ?? 0))!;
    const leather = Object.values(content.items).find((i) => (i.evasionRating ?? 0) > 0 && i.slot === "body" && !(i.wardCapacity ?? 0))!;
    expect(trinityGatePasses(def, 4, plate)).toBe(false);
    expect(trinityGatePasses(def, 4, leather)).toBe(false);
    expect(affixAppliesToItem(def.appliesTo, content.items.voidweave_vestment!)).toBe(true);
    // Raid-Stoff (Stufe XIII) trägt wardCapacity ⇒ zulässig.
    expect(trinityGatePasses(def, 4, content.items.gk_fire_chest!)).toBe(true);
  });

  it("fünf Teile mit Schleiertrinker stapeln nicht: wardSiphon bleibt 0,10", () => {
    const s = mageWithVeil(["helmet", "body", "legs", "gloves", "boots"]);
    const fx = collectSpecialEffects(s, content);
    expect(fx.wardSiphon?.magnitude).toBeCloseTo(0.1, 9);
  });

  it("Schleiertrinker + Hohlschleier-Medaillon (0,08): die stärkste Quelle zählt, 0,10", () => {
    const locket = content.items.hollowveil_locket!;
    expect(locket.weaponEffect).toEqual({ type: "wardSiphon", chance: 1, magnitude: 0.08, durationMs: 0 });
    const s = mageWithVeil(["body"], { [locket.slot as EquipSlot]: locket.id });
    const fx = collectSpecialEffects(s, content);
    expect(fx.wardSiphon?.magnitude).toBeCloseTo(0.1, 9);
  });

  // claude:2026-10-24T16:03:31+02:00 — Hinweis H1 per Chef-Entscheid umgesetzt: die Kette trägt 0,08 (vorher 0,12), die Rune bleibt die beste Quelle.
  it("Flutbruch-Kette (tidewrack_collar) trägt 0,08; mit der Stufe-IV-Rune zählt die Rune (0,10), ohne Rune die Kette", () => {
    const collar = content.items.tidewrack_collar!;
    expect(collar.weaponEffect?.type).toBe("wardSiphon");
    expect(collar.weaponEffect?.magnitude).toBe(0.08);
    expect(collar.requirements ?? {}).toEqual({});
    const withRune = collectSpecialEffects(mageWithVeil(["body"], { amulet: collar.id }), content);
    const withoutRune = collectSpecialEffects(mageWithVeil([], { amulet: collar.id }), content);
    expect(withRune.wardSiphon?.magnitude).toBeCloseTo(0.1, 9);
    expect(withoutRune.wardSiphon?.magnitude).toBe(0.08);
  });
});

describe("QA2 F2: Schleiertrinker — Wirkung im Kampf", () => {
  /** Erster gelandeter Zauber: Ward-Zuwachs im Tick gegen den geloggten Schaden. */
  function firstLandedCast(withVeil: boolean): { dmg: number; wardGain: number; wardRestored: number | undefined; maxWard: number; xpGain: number } {
    const s = mageWithVeil(withVeil ? ["body"] : []);
    const st = computeStats(s, content);
    expect(st.maxWard).toBeGreaterThan(500);
    // Gegner ohne Ward und ohne Rückschlag, direkt bekämpfbar.
    const monster = Object.values(content.monsters).find(
      (m) => !m.inflict && !(m.wardCapacity ?? 0) && !m.phases && !m.dungeonOnly && m.level >= 20 && m.level <= 60 && startCombat(createTestGame({ name: "p" }, content, 1), content, m.id),
    )!;
    expect(startCombat(s, content, monster.id)).toBe(true);
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = -1e9; // der Gegner schlägt nie
    s.character.hp = st.maxHp;
    let lastSeq = -1;
    for (let i = 0; i < 600; i++) {
      s.character.ward = 0; // leerer Pool vor jedem Tick: Zuwachs = Cast-Nachladen (+ Siphon)
      const xp0 = s.skills.warding?.xp ?? 0;
      combatStep(s, content);
      s.combat.enemyHp = 1e9;
      const hit = s.combat.log.find((e) => e.seq > lastSeq && e.by === "player" && (e.kind === "hit" || e.kind === "crit") && e.amount > 0);
      lastSeq = s.combat.log[s.combat.log.length - 1]?.seq ?? lastSeq;
      if (hit) {
        return { dmg: hit.amount, wardGain: s.character.ward, wardRestored: hit.wardRestored, maxWard: st.maxWard, xpGain: (s.skills.warding?.xp ?? 0) - xp0 };
      }
    }
    throw new Error("kein gelandeter Zauber");
  }

  it("ohne Rune: Zuwachs je Zauber = 4 % des Ward-Maximums (W1), keine Rückfluss-Annotation", () => {
    const r = firstLandedCast(false);
    // ± Warding-Grundregen eines Ticks (0,002)
    expect(r.wardGain).toBeCloseTo(r.maxWard * WARD_RECHARGE_PCT_PER_CAST, 1);
    expect(r.wardRestored).toBeUndefined();
    expect(r.xpGain).toBe(0);
  });

  it("mit Rune: zusätzlich 10 % des Treffers in den Ward, im Log als wardRestored, ohne Warding-XP", () => {
    const r = firstLandedCast(true);
    const cast = r.maxWard * WARD_RECHARGE_PCT_PER_CAST;
    expect(r.wardGain - cast).toBeCloseTo(r.dmg * 0.1, 1);
    expect(r.wardRestored).toBeCloseTo(Math.round(r.dmg * 0.1 * 10) / 10, 6);
    expect(r.xpGain).toBe(0); // Rückfluss ist kein Absorb ⇒ keine Warding-XP (keine Doppelzählung)
  });

  it("Rückfluss ist auf maxWard gedeckelt", () => {
    const s = mageWithVeil(["body"]);
    const st = computeStats(s, content);
    const monster = Object.values(content.monsters).find(
      (m) => !m.inflict && !(m.wardCapacity ?? 0) && !m.phases && !m.dungeonOnly && m.level >= 20 && m.level <= 60 && startCombat(createTestGame({ name: "p" }, content, 1), content, m.id),
    )!;
    expect(startCombat(s, content, monster.id)).toBe(true);
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = -1e9;
    s.character.hp = st.maxHp;
    for (let i = 0; i < 600; i++) {
      s.character.ward = st.maxWard - 1; // fast voll
      combatStep(s, content);
      s.combat.enemyHp = 1e9;
      expect(s.character.ward).toBeLessThanOrEqual(st.maxWard);
    }
  });

  it("DoT-Ticks des Spielers am Gegner (Brand) füllen den Ward nicht (nur gelandete Treffer)", () => {
    const s = mageWithVeil(["body"]);
    const st = computeStats(s, content);
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = -1e9;
    s.combat.playerTimerMs = -1e9; // der Spieler zaubert nie
    s.combat.enemyEffects = [{ type: "burn", remainingMs: 30_000, magnitude: 50 }];
    s.character.hp = st.maxHp;
    s.character.ward = 0;
    for (let i = 0; i < 100; i++) combatStep(s, content);
    // Nur der Warding-Grundregen (≤ 2/s) darf den Pool bewegen, kein Siphon aus 50/s Brand.
    expect(s.character.ward).toBeLessThanOrEqual(st.wardRegenPerSec * 10 + 1e-6);
  });
});
