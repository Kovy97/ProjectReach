import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import {
  MELEE_LIFESTEAL_CAP_ABS,
  MELEE_LIFESTEAL_CAP_PCT,
  WARD_KILL_REFILL_PCT,
  WARD_RECHARGE_PER_CAST,
} from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { equipItem } from "./equipment";
import { computeStats } from "./character";
import { addItem } from "./inventory";

/**
 * Regression (Chef-Änderung 2026-07-01, Niederlage = Abbruch): Der Voll-Heal beim Tod heilt im selben
 * Tick auf maxHp und BEENDET den Kampf (monsterId null, stopReason "defeated"). Das ist ein TOD-Event,
 * KEIN Lebensraub-Treffer — es darf den Pro-Treffer-Lifesteal-Cap nicht als getarnter Treffer umgehen.
 *
 * Diese Tests pinnen die Trennung explizit:
 *  - normale Lifesteal-Treffer bleiben je Treffer am Cap (kein Cap-Umgehen im Kampf),
 *  - der Voll-Heal beim Tod übersteigt den Cap zwar, ist aber ein Tod-Event, das den Kampf abbricht.
 */
describe("Lifesteal-Cap vs. Tod-Voll-Heal (Niederlage bricht ab)", () => {
  it("normale Lifesteal-Treffer bleiben je Treffer am Pro-Treffer-Cap", () => {
    // Weidetier statt Goblin (2026-07-13): der Goblin-Lauf war seed-sensibel knapp (halbe HP,
    // kein Food, 200 Ticks) und kippte, als Welle K Loot-Rows entfernte und damit die
    // RNG-Sequenz verschob. Das Huhn beweist die Cap-Semantik identisch, ohne Todesrisiko.
    // Unter maxHp gestartet, damit die Lebensraub-Heilung je Treffer sichtbar ist.
    const s = createTestGame({ name: "X", baseAttributes: { str: 8, con: 30 } }, content, 5);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");
    startCombat(s, content, "chicken");
    s.character.food = null; // kein Auto-Eat → nur Lebensraub heilt (keine Fremd-Heilung im Sprung)
    s.character.hp = Math.max(2, Math.floor(computeStats(s, content).maxHp / 2));

    let maxHitJump = 0;
    for (let i = 0; i < 200; i++) {
      const before = s.character.hp;
      const deathsBefore = s.stats.deaths;
      // Cap je Tick frisch aus den aktuellen Stats (falls der Held durch Kill-XP hochlevelt).
      // 1-Dezimal-Raster wie in combat.ts (Squish: Heil-Raster ÷10).
      const st = computeStats(s, content);
      const cap = Math.min(Math.round(st.maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10, MELEE_LIFESTEAL_CAP_ABS);
      combatStep(s, content);
      if (s.combat.monsterId === null || s.stats.deaths > deathsBefore) break; // stirbt hier nicht
      const jump = s.character.hp - before;
      if (jump > 0) maxHitJump = Math.max(maxHitJump, jump);
      expect(jump).toBeLessThanOrEqual(cap + 1); // JEDER Treffer-Tick bleibt am Cap (+DoT-Rauschen)
    }
    expect(s.stats.deaths).toBe(0); // harmloses Weidetier: kein Tod in diesem Fenster
    expect(maxHitJump).toBeGreaterThan(0); // es wurde tatsächlich ein Lebensraub-Treffer beobachtet
  });

  it("der Voll-Heal beim Tod übersteigt den Cap, BEENDET aber den Kampf (kein Cap-Umgehungs-Treffer)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 8, con: 8 } }, content, 5);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");
    startCombat(s, content, "goblin");
    s.character.food = null;

    const st = computeStats(s, content);
    // 1-Dezimal-Raster wie in combat.ts (Squish: Heil-Raster ÷10).
    const cap = Math.min(Math.round(st.maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10, MELEE_LIFESTEAL_CAP_ABS);
    s.character.hp = 1; // maximaler Heil-Raum
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 100 }); // tödlicher DoT
    const before = s.character.hp;
    combatStep(s, content);

    const maxHp = computeStats(s, content).maxHp;
    expect(s.stats.deaths).toBe(1);
    expect(s.combat.monsterId).toBeNull(); // Tod bricht den Kampf ab (kein Auto-Neustart)
    expect(s.combat.stopReason).toBe("defeated");
    expect(s.character.hp).toBe(maxHp); // voll geheilt
    // Der Tod-Heal übersteigt den Pro-Treffer-Cap deutlich — aber als TOD-Event, nicht als Lifesteal-Treffer.
    expect(s.character.hp - before).toBeGreaterThan(cap);
  });
});

/**
 * Rüstungs-Trinität / Itemization 2.5 (Phase A2): der frühere Mana-Schild-Pfad (Cast-Floor +
 * Tier-Skalierung) ist ERSETZT durch den Ward-Absorb. Diese Tests pinnen die neue Semantik über
 * einen Respawn hinweg:
 *   - Ohne Ward (Pool erschöpft, kein Cast) schlägt der Treffer voll auf die HP durch.
 *   - Armor-Iteration 2 §6.1: der Respawn refillt den Ward-Pool NUR um WARD_KILL_REFILL_PCT (20 %),
 *     KEIN Gratis-Voll-Reset mehr (farm-session-scoped → Pool erodiert, Food-Druck für den Magier).
 */
function robe(id: string, wardCapacity: number): ItemDef {
  return { id, name: id, type: "equipment", stackable: false, slot: "body", wardCapacity } as ItemDef;
}
function withAll(items: ItemDef[], monster: MonsterDef): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, monsters: { ...content.monsters, [monster.id]: monster }, items: map };
}

describe("Ward statt Mana-Schild: Absorb + Respawn-Auffüllung (Itemization 2.5)", () => {
  const WAND: ItemDef = {
    id: "lr_wand",
    name: "Respawn-Test-Zepter",
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "magic",
    twoHanded: false,
    bonus: { magicDamage: 5, accuracy: 40 },
  };

  it("erschöpfter Ward + kein Cast ⇒ der Treffer schlägt voll auf die HP (kein Mana-Schutz)", () => {
    const mob: MonsterDef = {
      id: "lr_mob",
      name: { en: "lr", de: "lr" },
      level: 20,
      maxHp: 5_000_000,
      damage: 25,
      accuracy: 100_000,
      evasion: 0,
      defense: 0,
      attackIntervalMs: 1000,
      xp: 0,
      gold: 0,
      loot: [],
    };
    const c = withAll([WAND], mob);
    const s = createTestGame({ name: "Mage", baseAttributes: { int: 16, con: 400 } }, c, 11);
    s.character.equipment.mainhand = "lr_wand";
    s.character.food = null;
    const st = computeStats(s, c);
    expect(st.style).toBe("magic");
    s.character.hp = st.maxHp;
    startCombat(s, c, "lr_mob");
    s.character.ward = 0; // Pool leer
    // Zauberreserve (28.08.2026): jeder Cast lädt Ward — Spieler-Angriff abklemmen, damit der Pool leer bleibt.

    const hpBefore = s.character.hp;
    for (let i = 0; i < 40; i++) {
      s.combat.playerTimerMs = -1_000_000; // kein Cast → kein Recharge → der Ward bleibt garantiert leer
      combatStep(s, c);
      if (s.character.hp < hpBefore) break;
    }
    expect(hpBefore - s.character.hp).toBeGreaterThan(0); // Treffer ging voll auf die HP
    expect(s.combat.log.some((e) => e.kind === "shield")).toBe(false); // nichts absorbiert
  });

  it("Respawn refillt den Ward-Pool NUR um WARD_KILL_REFILL_PCT (10 %) statt voll (§6.1)", () => {
    const frail: MonsterDef = {
      id: "lr_frail",
      name: { en: "frail", de: "frail" },
      level: 1,
      maxHp: 1, // ein Schlag genügt → Respawn-Pfad läuft
      damage: 1,
      accuracy: 1,
      evasion: 0,
      defense: 0,
      attackIntervalMs: 4000,
      xp: 0,
      gold: 0,
      loot: [],
    };
    const c = withAll([WAND, robe("lr_robe", 300)], frail);
    const s = createTestGame({ name: "Mage", baseAttributes: { int: 16, con: 40 } }, c, 11);
    s.character.equipment.mainhand = "lr_wand";
    s.character.equipment.body = "lr_robe";
    s.character.mana = 999;
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    startCombat(s, c, "lr_frail");
    s.character.ward = 4; // künstlich niedrig → der Teil-Refill ist eindeutig messbar
    for (let i = 0; i < 60; i++) {
      s.combat.playerTimerMs = st.attackIntervalMs; // jeden Tick angreifen → Kill im ersten Tick
      combatStep(s, c);
      if (s.combat.kills > 0) break;
    }
    expect(s.combat.kills).toBeGreaterThan(0);
    // Armor-Iteration 2 §2: WARD_CORE_PER_INT=0 ⇒ maxWard = Σ wardCapacity (kein INT-Kern) = 300 exakt.
    expect(st.maxWard).toBe(300);
    // §6.1 Teil-Refill: der Kill-Tick castet einmal (Recharge +WARD_RECHARGE_PER_CAST = 1.2, Zauberreserve
    // 28.08.2026), danach refillt der Respawn +0.10·300 = 30 → ward ≈ 4 + 1.2 + 30 = 35.2 (KEIN Voll-Reset auf 300).
    expect(s.character.ward).toBeLessThan(st.maxWard); // KEIN Gratis-Voll-Reset (§6.1)
    expect(s.character.ward).toBeGreaterThan(WARD_KILL_REFILL_PCT * st.maxWard); // ≥ 10 % (über der 4-Basis)
    expect(s.character.ward).toBeCloseTo(4 + WARD_RECHARGE_PER_CAST + WARD_KILL_REFILL_PCT * st.maxWard, 0); // 4 + Recharge + 10 %
  });
});
