import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { MonsterDef, StatusType } from "@hearthforge/shared";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { computeStats } from "./character";
import { combatLevel } from "./dungeon";
import { xpForLevel } from "./leveling";

/**
 * OSRS-Fix (Task #197): Defence-/Warding-XP kommt NICHT mehr durchs Getroffen-/Einstecken
 * (passives Tanken eines High-Level-Mobs = Gratis-Defence war der Bug), sondern ausschließlich durch
 * KÄMPFEN in der Defensiv-Stance — der ausgeteilte Schaden routet dort seine Offense-XP auf
 * `defence` (Melee/Fernkampf) bzw. `warding` (Magie, früher `magic_def`), analog zur Attack-Stance → attack.
 */

/**
 * Synthetisches Monster mit definierbarem `inflict` (für reproduzierbare Schadensart der eingesteckten
 * Treffer). Bewusst ÜBERLEBBAR abgestimmt (niedriger Schaden), damit der Spieler-Angriffs-Timer
 * (~2900ms) zündet, BEVOR die eingesteckten Treffer ihn töten — sonst käme der Spieler nie zum
 * Austeilen und wir könnten „defence durchs Austeilen" nicht von „defence durchs Einstecken" trennen.
 */
function makeMonster(id: string, inflict?: { type: StatusType }): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 1,
    maxHp: 100000, // lebt lange → Spieler teilt viele Treffer aus UND steckt viele ein
    damage: 5, // niedrig → Spieler überlebt lange genug, um selbst anzugreifen
    accuracy: 100000, // trifft immer → deterministisch viele eingesteckte Treffer
    evasion: 0, // Spieler-Treffer landen → deterministisch ausgeteilter Schaden
    defense: 0,
    attackIntervalMs: 300, // schlägt oft (viele eingesteckte Treffer), aber nicht tödlich
    xp: 0,
    gold: 0,
    loot: [],
    ...(inflict ? { inflict: { ...inflict, chance: 0, magnitude: 0, durationMs: 0 } } : {}),
  };
}

interface RunOpts {
  inflict?: StatusType;
  ticks?: number;
  configure?: (s: ReturnType<typeof createGame>) => void;
}

function runHits(opts: RunOpts = {}) {
  const ticks = opts.ticks ?? 200;
  const local = {
    ...content,
    monsters: { ...content.monsters, dummy: makeMonster("dummy", opts.inflict ? { type: opts.inflict } : undefined) },
  };
  // str, damit der Spieler dem Dummy sichtbaren Schaden zufügt (nötig, um „defence durch Austeilen"
  // vom alten „defence durchs Einstecken" zu trennen).
  const s = createGame({ name: "X", baseAttributes: { con: 50, str: 30 } }, local, 42);
  opts.configure?.(s);
  startCombat(s, local, "dummy");
  s.combat.enemyHp = 100000;
  for (let i = 0; i < ticks; i++) combatStep(s, local);
  const enemyHits = s.combat.log.filter((e) => e.by === "enemy" && e.kind === "hit").length;
  const playerHits = s.combat.log.filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit")).length;
  return {
    attack: s.skills.attack?.xp ?? 0,
    power: s.skills.power?.xp ?? 0,
    defence: s.skills.defence?.xp ?? 0,
    // Armor-Iteration 2 §9.1 Rename: magic_def→warding, magic_off→magic.
    warding: s.skills.warding?.xp ?? 0,
    magic: s.skills.magic?.xp ?? 0,
    enemyHits,
    playerHits,
  };
}

describe("OSRS-Fix: Defence-XP nur durchs Kämpfen (Defensiv-Stance), nicht durchs Getroffen-werden", () => {
  it("(b) reines Getroffen-werden (physischer Angreifer, Angriffs-Stance) gibt KEINE Defence-EP", () => {
    const r = runHits({ inflict: "poison" }); // Default combatStyle = "attack"
    expect(r.enemyHits).toBeGreaterThan(0); // Beleg: Spieler hat wirklich Treffer eingesteckt
    expect(r.attack).toBeGreaterThan(0); // Beleg: es wurde gekämpft (Offense → attack)
    expect(r.defence).toBe(0); // Einstecken trainiert Defence NICHT mehr
    expect(r.warding).toBe(0);
  });

  it("(b) reines Getroffen-werden durch magischen Angreifer gibt KEINE warding-EP", () => {
    const r = runHits({ inflict: "frost" });
    expect(r.enemyHits).toBeGreaterThan(0);
    expect(r.warding).toBe(0);
    expect(r.defence).toBe(0);
  });

  it("(b) erlittener DoT (Brennen/Blutung) gibt KEINE Defence-/warding-EP mehr", () => {
    const burn = createGame({ name: "X", baseAttributes: { con: 50 } }, content, 7);
    burn.character.hp = computeStats(burn, content).maxHp;
    startCombat(burn, content, "chicken");
    burn.combat.playerEffects.push({ type: "burn", remainingMs: 10_000, magnitude: 20 });
    for (let i = 0; i < 30; i++) combatStep(burn, content);
    expect(burn.skills.warding?.xp ?? 0).toBe(0);
    expect(burn.skills.defence?.xp ?? 0).toBe(0);
    expect(burn.character.hp).toBeLessThan(computeStats(burn, content).maxHp); // DoT hat gewirkt
  });

  it("(a) Defensiv-Stance (Melee): ausgeteilter Schaden trainiert defence — nicht attack/warding", () => {
    const r = runHits({ configure: (s) => (s.character.combatStyle = "defensive") });
    expect(r.playerHits).toBeGreaterThan(0); // Beleg: Spieler hat wirklich ausgeteilt
    expect(r.defence).toBeGreaterThan(0); // Kämpfen in Defensiv-Stance härtet ab
    expect(r.attack).toBe(0); // Offense-XP geht an defence, nicht attack
    expect(r.warding).toBe(0);
  });

  it("(a) Defensiv-Stance (Magie): ausgeteilter Schaden trainiert warding — nicht magic/defence", () => {
    const r = runHits({
      configure: (s) => {
        s.character.equipment.mainhand = "gnarled_staff"; // Magie-Stil
        s.character.magicStance = "defensive";
        s.character.mana = 1000;
      },
    });
    expect(r.playerHits).toBeGreaterThan(0);
    expect(r.warding).toBeGreaterThan(0);
    expect(r.magic).toBe(0);
    expect(r.defence).toBe(0);
  });
});

/**
 * P0.1 Regression: combatLevel war Ø aller 7 Kampf-Skills → Single-Style klemmte (max ~57),
 * idol_sanctum (99)/highland_aerie (65) mathematisch unerreichbar. Neue Formel belohnt Fokus.
 */
describe("P0.1 combatLevel fokus-belohnend", () => {
  function mk(skills: Record<string, number>) {
    const s = createGame({ name: "X" }, content, 1);
    for (const [k, v] of Object.entries(skills)) s.skills[k] = { xp: xpForLevel(v) };
    return s;
  }

  it("frischer Char bleibt niedrig", () => {
    expect(combatLevel(mk({}))).toBeLessThanOrEqual(5);
  });

  it("voll gemaxter Single-Style (Stil + defence + vitality @99) erreicht ~99", () => {
    const melee = mk({ attack: 99, power: 99, defence: 99, vitality: 99 });
    const ranged = mk({ ranged: 99, defence: 99, vitality: 99 });
    const magic = mk({ magic: 99, warding: 99, defence: 99, vitality: 99 });
    expect(combatLevel(melee)).toBe(99);
    expect(combatLevel(ranged)).toBe(99);
    expect(combatLevel(magic)).toBe(99);
  });

  it("Skill-Cap 99: XP über 99 hebt combatLevel nicht über 99 (Endgame-Dungeon-Gates erreichbar)", () => {
    // Hard-Cap = 99: selbst XP-Werte oberhalb von Level 99 werden auf 99 geklemmt → der gemaxte
    // Single-Style erreicht exakt das Cap 99 und damit jedes Dungeon-Gate (höchstes seit
    // 2026-07-14: wyvern/sanctum/throne = 95, s. Gesamtbogen-Review).
    const melee = mk({ attack: 120, power: 120, defence: 120, vitality: 120 });
    expect(combatLevel(melee)).toBe(99);
    expect(combatLevel(melee)).toBeGreaterThanOrEqual(95); // höchstes Dungeon-Gate (95) locker erreicht
  });

  it("kein Strafabzug fürs Diversifizieren: All-99 ist nicht niedriger als Single-99", () => {
    const all = mk({ attack: 99, power: 99, defence: 99, ranged: 99, magic: 99, warding: 99, vitality: 99 });
    expect(combatLevel(all)).toBe(99);
  });

  it("fokussierter Build skaliert linear durch die Gates (12/30/34/65)", () => {
    expect(combatLevel(mk({ attack: 12, power: 12, defence: 12, vitality: 12 }))).toBe(12);
    expect(combatLevel(mk({ attack: 30, power: 30, defence: 30, vitality: 30 }))).toBe(30);
    expect(combatLevel(mk({ ranged: 34, defence: 34, vitality: 34 }))).toBe(34);
    expect(combatLevel(mk({ ranged: 65, defence: 65, vitality: 65 }))).toBe(65);
  });
});
