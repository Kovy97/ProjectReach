import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  DMG_MAX_HIT_MULT,
  LEATHER_HIT_FLOOR,
  WARDING_REGEN_CAP,
  WARDING_REGEN_PER_LEVEL,
  WARDING_XP_PER_ABSORB,
} from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat, combatStep } from "./combat";
import { advance } from "./tick";
import { xpForLevel } from "./leveling";

/**
 * Armor-Iteration 2 — combat-dev (Phase B) Verhaltens-Regressionen für die vier combat.ts-Änderungen:
 *   1. Ward-Regen pro Tick über den Warding-Skill (§9.2, additiv zum Cast-Recharge, kampf-scoped).
 *   2. Leder-Floor: ein LANDENDER Treffer wird bei dodgeChance>0 um LEATHER_HIT_FLOOR reduziert (§5.2).
 *   3. Warding-XP: absorbierter Ward trainiert den Warding-Skill (§9.3).
 * (Ward-Kill-Refill 20 % + 2H-naked=0 sind in armor-trinity-combat/ward/lifesteal-respawn re-gepinnt.)
 */

// ── Test-Content-Fabriken (self-contained) ──────────────────────────────────
function withItems(items: ItemDef[]): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, items: map };
}
function withMonster(c: ContentDB, m: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [m.id]: m } };
}
/** Rüstungsteil-Fabrik: injiziert eine Klassen-Schicht auf einen Slot. */
function armor(id: string, slot: ItemDef["slot"], fields: Partial<ItemDef>): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot, ...fields } as ItemDef;
}
/** Gegner mit steuerbarem Schaden/Takt (riesige HP → stirbt im Fenster nicht). */
function mob(id: string, damage: number, attackIntervalMs: number): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 5_000_000,
    damage,
    accuracy: 100_000, // gewinnt den Accuracy-Contest praktisch immer (isoliert die Klassen-Mechanik)
    evasion: 0,
    defense: 0,
    attackIntervalMs,
    xp: 0,
    gold: 0,
    loot: [],
  };
}

// ── 1) Ward-Regen pro Tick (§9.2) ───────────────────────────────────────────
describe("Armor-Iteration 2 §9.2: Warding-Skill → Ward-Regen pro Kampf-Tick", () => {
  // Melee + Stoff-Robe: reiner Ward-Pool OHNE Cast-Recharge; ein Gegner mit riesigem Angriffs-Intervall
  // schlägt im Fenster NICHT zu (kein Absorb) → die Ward-Bewegung ist AUSSCHLIESSLICH der Warding-Regen.
  function setup(wardingLevel: number, stance: "offensive" | "defensive", seed = 1) {
    const c = withMonster(
      withItems([armor("ai2_robe", "body", { wardCapacity: 100_000 })]),
      mob("ai2_idle_mob", 5, 10_000_000),
    );
    const s = createGame({ name: "R", baseAttributes: { con: 40 } }, c, seed);
    s.character.equipment.body = "ai2_robe";
    s.character.magicStance = stance;
    s.skills.warding = { xp: xpForLevel(wardingLevel) };
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    startCombat(s, c, "ai2_idle_mob");
    return { s, c, st };
  }

  it("regeneriert Ward um stats.wardRegenPerSec·dt pro Tick (level 50 → 1.0/s → 0.1/Tick)", () => {
    const { s, c, st } = setup(50, "offensive");
    expect(st.wardRegenPerSec).toBeCloseTo(
      Math.min(WARDING_REGEN_CAP, 50 * WARDING_REGEN_PER_LEVEL),
      6,
    ); // 1.0/s
    s.character.ward = 100; // deutlich unter maxWard → Regen hat Raum
    for (let i = 0; i < 30; i++) combatStep(s, c);
    // 30 Ticks · 0.1 Ward/Tick = +3 (kein Absorb, kein Cast → reiner Regen).
    expect(s.character.ward).toBeCloseTo(100 + 30 * st.wardRegenPerSec * (100 / 1000), 6);
  });

  it("Defensiv-Magie-Stance skaliert den Ward-Regen ×1.5 (§9.2)", () => {
    const off = setup(50, "offensive");
    const def = setup(50, "defensive");
    // Zauberreserve (Chef-GO 28.08.2026): die Schild-Haltung legt zusätzlich +1 % je 40 Reserve obendrauf
    // (spellReserveWardRegenBonus, nur defensiv) — der ×1.5-Stance-Faktor bleibt darunter unverändert.
    const shield = 1.5 * (1 + def.st.spellReserveWardRegenBonus);
    expect(def.st.spellReserveWardRegenBonus).toBeGreaterThan(0);
    expect(def.st.wardRegenPerSec).toBeCloseTo(off.st.wardRegenPerSec * shield, 6);
    off.s.character.ward = 100;
    def.s.character.ward = 100;
    for (let i = 0; i < 20; i++) {
      combatStep(off.s, off.c);
      combatStep(def.s, def.c);
    }
    // Defensiv regeneriert im selben Fenster mehr Ward (×1.5 × Reserve-Bonus).
    expect(def.s.character.ward - 100).toBeCloseTo((off.s.character.ward - 100) * shield, 6);
  });

  it("deckelt den Ward-Regen auf maxWard (kein Overshoot)", () => {
    const { s, c, st } = setup(99, "defensive"); // hoher Regen
    s.character.ward = st.maxWard - 0.05; // knapp unter voll
    combatStep(s, c);
    expect(s.character.ward).toBe(st.maxWard); // exakt gedeckelt, kein Überlauf
  });

  it("Idle-Tick füllt Ward mit 5 % des Maximums je Sekunde (Chef 28.08.2026), der Skill-Regen bleibt kampf-scoped", () => {
    const c = withItems([armor("ai2_robe_idle", "body", { wardCapacity: 100_000 })]);
    const s = createGame({ name: "I", baseAttributes: { con: 40 } }, c, 1);
    s.character.equipment.body = "ai2_robe_idle";
    s.character.magicStance = "defensive";
    s.skills.warding = { xp: xpForLevel(99) }; // maximaler Regen → Effekt wäre groß, wenn er liefe
    expect(computeStats(s, c).wardRegenPerSec).toBeGreaterThan(0);
    s.character.ward = 5; // niedrig, aber KEIN Kampf aktiv (combat.monsterId === null)
    advance(s, c, 5_000); // 50 Idle-Ticks
    // Chef 28.08.2026 ("Warum startet mein Ward-Pool immer bei 0?"): im Leerlauf fuellt sich Ward wie das Leben, mit
    // 5 % des Maximums je Sekunde (tick.ts OUT_OF_COMBAT_WARD_REGEN_PCT); der Abwehr-Skill-Regen (1,0/s hier) laeuft
    // weiterhin NUR im combatStep, sonst laegen wir bei 25 010.
    expect(s.character.ward).toBeCloseTo(5 + 100_000 * 0.05 * 5, 3);
  });
});

// ── 2) Leder-Floor (§5.2) ────────────────────────────────────────────────────
describe("Armor-Iteration 2 §5.2: Leder-Floor senkt jeden landenden Treffer um LEATHER_HIT_FLOOR", () => {
  it("landender Treffer ≤ round(hi·(1−LEATHER_HIT_FLOOR)) — ohne Floor ginge er bis hi", () => {
    // Isoliert: KEINE Mitigation (armorRating 0 → reduction 0), KEIN Block (kein Schild), KEIN Ward
    // (kein Stoff), maxHp riesig (One-Shot-Cap bindet nie). Leder (evasionRating klein) → dodgeChance>0
    // (Floor AKTIV), aber so klein, dass der Dodge im Fenster praktisch nie greift → wir messen LANDENDE
    // Treffer: hpDamage = round(rolledDamage · (1 − LEATHER_HIT_FLOOR)).
    const DMG = 100;
    const c = withMonster(
      withItems([armor("ai2_leather", "body", { evasionRating: 0.001 })]),
      mob("ai2_floor_mob", DMG, 100), // schlägt jeden Tick
    );
    const s = createGame({ name: "L", baseAttributes: { str: 6, con: 100_000 } }, c, 4);
    s.character.equipment.body = "ai2_leather";
    s.character.food = null;
    const st = computeStats(s, c);
    expect(st.dodgeChance).toBeGreaterThan(0); // Leder getragen → Floor aktiv
    expect(st.armorRating).toBe(0); // keine Mitigation (reduction 0)
    expect(st.maxWard).toBe(0); // kein Ward-Pool
    s.character.hp = st.maxHp;
    startCombat(s, c, "ai2_floor_mob");

    const hi = Math.round(DMG * DMG_MAX_HIT_MULT); // ungefloorte Maximal-Roll (reduction 0)
    const flooredMax = Math.round(hi * (1 - LEATHER_HIT_FLOOR));
    expect(flooredMax).toBeLessThan(hi); // Sanity: der Floor senkt die Ober-Schranke wirklich

    let landed = 0;
    let maxHit = 0;
    for (let i = 0; i < 120; i++) combatStep(s, c);
    for (const e of s.combat.log) {
      if (e.by === "enemy" && e.kind === "hit" && e.amount > 0) {
        landed++;
        maxHit = Math.max(maxHit, e.amount);
        expect(e.amount).toBeLessThanOrEqual(flooredMax); // JEDER landende Treffer bleibt unter der gefloorten Grenze
      }
    }
    expect(landed).toBeGreaterThan(20); // genug Stichproben (Test aussagekräftig)
    expect(maxHit).toBeGreaterThan(flooredMax * 0.8); // die Roll-Spanne wurde ausgeschöpft (kein Zufalls-Pass)
  });

  it("greift NICHT ohne Leder (dodgeChance 0 → kein Floor): Treffer erreichen die volle Roll-Spanne", () => {
    // Gleicher Aufbau OHNE Leder → dodgeChance 0 → der Floor-Step ist no-op; ein landender Treffer kann
    // die ungefloorte Maximal-Roll (hi) erreichen (der die gefloorte Grenze übersteigt).
    const DMG = 100;
    const c = withMonster(withItems([]), mob("ai2_nofloor_mob", DMG, 100));
    const s = createGame({ name: "N", baseAttributes: { str: 6, con: 100_000 } }, c, 4);
    s.character.equipment.mainhand = null; // nackt: kein Leder, kein Schild, kein Stoff
    s.character.food = null;
    const st = computeStats(s, c);
    expect(st.dodgeChance).toBe(0); // kein Leder → Floor inaktiv
    s.character.hp = st.maxHp;
    startCombat(s, c, "ai2_nofloor_mob");

    const hi = Math.round(DMG * DMG_MAX_HIT_MULT);
    const flooredMax = Math.round(hi * (1 - LEATHER_HIT_FLOOR));
    let maxHit = 0;
    for (let i = 0; i < 120; i++) combatStep(s, c);
    for (const e of s.combat.log) {
      if (e.by === "enemy" && e.kind === "hit" && e.amount > 0) maxHit = Math.max(maxHit, e.amount);
    }
    // Ohne Floor übersteigt der stärkste Treffer die gefloorte Grenze (Kontrast zum Floor-Test oben).
    expect(maxHit).toBeGreaterThan(flooredMax);
  });
});

// ── 3) Warding-XP bei Ward-Absorb (§9.3) ─────────────────────────────────────
describe("Armor-Iteration 2 §9.3: absorbierter Ward trainiert den Warding-Skill", () => {
  it("Warding-XP = Σ absorbed · WARDING_XP_PER_ABSORB (earlyXpMult=1 ab Level 40)", () => {
    // Riesiger Ward-Pool (deckt jeden Treffer voll) → absorbed = rolledDamage (ganzzahlig) je Treffer.
    // Warding auf Level 40 vorgesetzt ⇒ earlyXpMult(≥40)=1 ⇒ die gewährte XP ist EXAKT 0.25·Σabsorbed.
    const c = withMonster(
      withItems([armor("ai2_wrobe", "body", { wardCapacity: 1_000_000 })]),
      mob("ai2_ward_mob", 50, 100), // schlägt jeden Tick, voll vom Ward abgefangen
    );
    const s = createGame({ name: "W", baseAttributes: { str: 6, con: 200 } }, c, 9);
    s.character.equipment.body = "ai2_wrobe";
    s.character.food = null;
    s.skills.warding = { xp: xpForLevel(40) }; // earlyXpMult(≥40)=1 (bleibt 1, XP steigt nur)
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    startCombat(s, c, "ai2_ward_mob");
    const hpStart = s.character.hp;
    const wardingXpBefore = s.skills.warding.xp;

    // Absorb-Beträge robust über die monotone `seq` einsammeln (das Combat-Log ist ein Ring-Puffer mit
    // Cap → ein Index-basiertes slice würde nach dem Überlauf Treffer verlieren). absorbed ist je Treffer
    // ganzzahlig (Pool riesig ⇒ absorbed = rolledDamage; keine Mitigation/Floor/Block) ⇒ shield.amount = absorbed.
    let lastSeq = s.combat.eventCount - 1;
    let absorbedSum = 0;
    let hits = 0;
    for (let i = 0; i < 100; i++) {
      combatStep(s, c);
      for (const e of s.combat.log) {
        if (e.seq <= lastSeq) continue;
        if (e.by === "player" && e.kind === "shield") {
          absorbedSum += e.amount;
          hits++;
        }
      }
      lastSeq = s.combat.eventCount - 1;
    }
    const wardingXpGained = s.skills.warding.xp - wardingXpBefore;
    expect(absorbedSum).toBeGreaterThan(100); // Ward hat wirklich (viel) absorbiert
    expect(s.character.hp).toBe(hpStart); // Pool riesig → HP komplett verschont
    // Vertrag (§9.3): 0.25 XP je absorbiertem Ward-Punkt (earlyXpMult=1, kein Pet). claude:2026-10-25T22:00:00+02:00 — seit der
    // Ward-Dämpfung (W4, ×0,7) ist der absorbierte Betrag nicht mehr ganzzahlig; das Log rundet je Treffer (±0,5).
    expect(Math.abs(wardingXpGained - absorbedSum * WARDING_XP_PER_ABSORB)).toBeLessThanOrEqual(hits * 0.5 * WARDING_XP_PER_ABSORB + 1e-6);
  });

  it("KEIN Warding-XP ohne Ward-Pool: Getroffen-werden ohne Stoff trainiert Warding NICHT (§9.3, absorb-basiert)", () => {
    // Kontroll-Fall: kein Stoff (maxWard 0) → kein Absorb → kein Warding-XP, obwohl HP-Treffer landen.
    const c = withMonster(withItems([]), mob("ai2_noward_mob", 20, 100));
    const s = createGame({ name: "C", baseAttributes: { str: 6, con: 100_000 } }, c, 3);
    s.character.equipment.mainhand = null;
    s.character.food = null;
    s.skills.warding = { xp: xpForLevel(40) };
    const st = computeStats(s, c);
    expect(st.maxWard).toBe(0); // kein Stoff → kein Ward-Pool
    s.character.hp = st.maxHp;
    startCombat(s, c, "ai2_noward_mob");
    const wardingXpBefore = s.skills.warding.xp;
    const hpBefore = s.character.hp;
    for (let i = 0; i < 60; i++) combatStep(s, c);
    expect(hpBefore - s.character.hp).toBeGreaterThan(0); // Treffer gingen voll auf die HP
    expect(s.skills.warding.xp).toBe(wardingXpBefore); // aber KEIN Warding-XP (nichts absorbiert)
  });
});
