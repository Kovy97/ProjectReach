import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { FROST_SLOW, WARD_HIT_DAMPING, WARDING_XP_PER_ABSORB } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatStep, startCombat } from "./combat";
import { createTestGame } from "./test-helpers";

/**
 * QA 1.4.0 Welle 5 „Stoff und Ward“ (Kontrolleur, claude:2026-10-25T23:30:00+02:00).
 * Grenzfälle der Ward-Dämpfung (W4), DoT-am-Ward (W2) und Frost (F1). Reine Prüfdatei, ändert keinen Code.
 */

/** Erster Gegnertreffer auf die HP; `ward` wird VOR jedem Tick auf den Wunschwert gesetzt. */
function firstHpLoss(ward: number): number {
  const s = createGame({ name: "D", baseAttributes: { con: 200 } }, content, 11);
  s.character.food = null;
  s.character.hp = computeStats(s, content).maxHp;
  expect(startCombat(s, content, "chicken")).toBe(true);
  s.combat.enemyHp = 1e9;
  const hp0 = s.character.hp;
  for (let i = 0; i < 400; i++) {
    s.character.ward = ward;
    combatStep(s, content);
    const lost = hp0 - s.character.hp;
    if (lost > 0) return lost;
  }
  throw new Error("kein Treffer");
}

// claude:2026-10-26T02:55:00+02:00 — Befund P1 behoben: gedämpft wird nur der Teil, den der Ward trägt. Tests auf das Soll umgestellt.
describe("QA W4: Ward-Dämpfung wirkt nur auf den Teil, den der Ward trägt", () => {
  it("Ward = 0,0001 dämpft praktisch nichts: der Treffer geht fast voll auf die HP", () => {
    const onHp = firstHpLoss(0);
    const onTinyWard = firstHpLoss(0.0001);
    expect(onHp).toBeGreaterThan(2);
    expect(onTinyWard).toBe(onHp);
  });

  it("Nicht-Stoff-Träger mit einem 7-Ward-Ring: nach dem Ward-Bruch dämpfen Regen-Krümel die Treffer nicht mehr", () => {
    // Gegner ohne Status (kein DoT am Ward), ordentlicher Schlag, kein eigener Ward, keine Phasen.
    const candidates = Object.values(content.monsters).filter(
      (m) => !m.inflict && m.damage >= 30 && m.damage <= 120 && !(m.wardCapacity ?? 0) && !m.phases && !m.enrage && !m.dungeonOnly,
    );
    // Erster direkt bekämpfbarer Zonen-Gegner (Slayer-/Turm-/Quest-Gates ausgeschlossen, Probe per startCombat).
    const monster = candidates.find((m) => startCombat(createTestGame({ name: "probe" }, content, 1), content, m.id));
    expect(monster).toBeTruthy();
    // Zwilling A trägt den Ring (wardCapacity 7, int 4 / wis 2 / lck 1). Zwilling B trägt keinen Ring, bekommt dieselben
    // Attributpunkte als Basis, damit Verteidigung, Ausweichen, max. HP und die RNG-Folge identisch sind; nur der Ward-Pool fehlt.
    const run = (ring: boolean): { loss: number; w0: number; stats: ReturnType<typeof computeStats> } => {
      const s = createTestGame(
        { name: "P", baseAttributes: ring ? { con: 200 } : { con: 200, int: 4, wis: 2, lck: 1 } },
        content,
        7,
      );
      s.character.food = null;
      if (ring) s.character.equipment.ring1 = "emberglass_loop"; // Stufe-IV-Magie-Ring, wardCapacity 7
      const st = computeStats(s, content);
      expect(st.maxWard).toBe(ring ? 7 : 0);
      if (ring) expect(st.wardRegenPerSec).toBeGreaterThan(0); // Bannmagie Stufe 1 ⇒ 0,02/s
      expect(startCombat(s, content, monster!.id)).toBe(true);
      s.combat.enemyHp = 1e9;
      s.character.hp = st.maxHp;
      s.character.ward = st.maxWard;
      const out: { loss: number; w0: number }[] = [];
      for (let i = 0; i < 500 && s.combat.monsterId !== null; i++) {
        const hp0 = s.character.hp;
        const w0 = s.character.ward;
        combatStep(s, content);
        out.push({ loss: hp0 - s.character.hp, w0 });
        s.character.hp = st.maxHp; // nie sterben, keine Auto-Heilung nötig
      }
      return Object.assign(out, { stats: st }) as unknown as { loss: number; w0: number; stats: ReturnType<typeof computeStats> };
    };
    const withWard = run(true) as unknown as { loss: number; w0: number }[] & { stats: ReturnType<typeof computeStats> };
    const withoutWard = run(false) as unknown as { loss: number; w0: number }[] & { stats: ReturnType<typeof computeStats> };
    for (const k of ["defense", "evasion", "maxHp", "attackIntervalMs", "dodgeChance", "blockChance", "damageReduction"] as const) {
      expect(withWard.stats[k], k).toBe(withoutWard.stats[k]);
    }
    expect(withWard.length).toBe(withoutWard.length);
    let dampedHits = 0;
    let totalA = 0;
    let totalB = 0;
    for (let i = 0; i < withWard.length; i++) {
      const a = withWard[i]!;
      const b = withoutWard[i]!;
      totalA += a.loss;
      totalB += b.loss;
      if (b.loss <= 0) continue; // kein Treffer in diesem Tick
      if (a.w0 >= b.loss) continue; // der Pool hat den Treffer wirklich geschluckt (die ersten 7 Punkte)
      if (a.w0 > 0.5) continue; // Übergangstreffer, der den Pool bricht
      // Winziger Rest-Ward (< 0,5 Punkt aus dem Regen) ⇒ höchstens dieser Krümel wird gedämpft, der Rest trifft voll.
      expect(b.loss - a.loss).toBeLessThanOrEqual(1);
      dampedHits += 1;
    }
    expect(dampedHits).toBeGreaterThanOrEqual(5);
    // Summe: der Ring spart nur seine paar Ward-Punkte, keine 30 % des gesamten Trefferschadens.
    expect(totalA).toBeGreaterThan(totalB * 0.95);
  });
});

describe("QA W2: DoT trifft den Ward, Warding-XP, keine Dämpfung", () => {
  /** Ein DoT-Tick (1 Schaden) gegen `ward`; liefert HP-Verlust und Warding-XP-Zuwachs. */
  function dotTick(ward: number): { hpLoss: number; wardAfter: number; xpGain: number } {
    const s = createTestGame({ name: "D", baseAttributes: { con: 200 } }, content, 5);
    s.character.food = null;
    const st = computeStats(s, content);
    s.character.hp = st.maxHp;
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = -1e9; // Gegner schlägt nicht
    s.combat.playerTimerMs = -1e9; // Spieler schlägt nicht
    s.combat.playerEffects = [{ type: "bleed", remainingMs: 5000, magnitude: 10 }]; // 1 Schaden je 100-ms-Tick
    s.character.ward = ward;
    const xp0 = s.skills.warding?.xp ?? 0;
    combatStep(s, content);
    return { hpLoss: st.maxHp - s.character.hp, wardAfter: s.character.ward, xpGain: (s.skills.warding?.xp ?? 0) - xp0 };
  }

  it("DoT-Tick genau beim Ward-Bruch: Rest geht ungedämpft auf die HP, Warding-XP proportional zum Absorbierten", () => {
    const a = dotTick(0.4);
    expect(a.wardAfter).toBe(0);
    expect(a.hpLoss).toBeCloseTo(0.6, 6); // 1,0 Schaden − 0,4 absorbiert; KEINE 30 % Dämpfung am DoT
    expect(a.xpGain).toBeGreaterThan(0);
    const b = dotTick(0.8);
    expect(b.hpLoss).toBeCloseTo(0.2, 6);
    expect(b.xpGain / a.xpGain).toBeCloseTo(2, 6); // XP = absorbiert × WARDING_XP_PER_ABSORB × globaler XP-Faktor
    expect(WARDING_XP_PER_ABSORB).toBeGreaterThan(0);
    const none = dotTick(0);
    expect(none.hpLoss).toBeCloseTo(1, 6);
    expect(none.xpGain).toBe(0);
  });
});

describe("QA F1: Frost-Halbierung nur an Dungeon-/Raid-Bossen", () => {
  it("Normaler Zonenkampf nimmt die volle Verlangsamung (kein Boss)", () => {
    const s = createTestGame({ name: "F", baseAttributes: { con: 200 } }, content, 4);
    s.character.hp = computeStats(s, content).maxHp;
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = 0;
    s.combat.playerTimerMs = -1e9;
    s.combat.enemyEffects = [{ type: "frost", remainingMs: 60_000, magnitude: 1 }];
    combatStep(s, content);
    expect(s.combat.enemyTimerMs).toBeCloseTo(100 * (1 - FROST_SLOW), 6);
  });
});
