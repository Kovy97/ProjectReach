import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB } from "@hearthforge/shared";
import {
  ATTACK_INTERVAL_FLOOR_MS,
  DODGE_CAP,
  DODGE_EFF_MAX,
  EVASION_ATTR_K,
  EVASION_ATTR_MAX,
  K_DODGE,
  MONSTER_ACC_LEVEL_START,
  MONSTER_ACC_PER_LEVEL,
  TEMPO_REDUCTION_CAP,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { combatStep, combinedFloorDodge, enemyEffectiveAccuracy, startCombat } from "./combat";

/**
 * Evasion-Tempo-Zähmung (design/evasion-tempo-taming-spec.md §3/§5.5, Task #301,
 * CHEF-GO 2026-07-09 mit T1-Cap −20 % statt −30 %) — Guard-Suite.
 *
 * Chef-Fund: BiS-Evasion-Builds waren gegen den L245-Boss de facto unverwundbar (Live-Sim 3,4 %
 * Land-Chance, „der Gegner verfehlt einfach IMMER") und JEDE Waffe klebte ab Endgame-dex am
 * 800-ms-Boden. Diese Guards frieren die vier Zähmungs-Hebel ein:
 *  E1 Dodge-Kurve (Asymptote 0.5 > Cap 0.40 — Cap erreichbar, aber nur mit Voll-Investment),
 *  E2 Level-skalierte Gegner-Accuracy (≤ L150 bit-identisch),
 *  E3 DEX-Sättigung der Contest-Evasion,
 *  T1 relatives Tempo-Cap (−20 % vom Waffen-Basisintervall — 2H bleibt 2H),
 *  L5 Kombiboden (NACHTRAG): MIN_HIT_CHANCE klemmt Dodge×Contest GEMEINSAM.
 */

/** Spiegel des modul-lokalen Bodens aus combat.ts (wie balance-envelope.test.ts). */
const MIN_HIT_CHANCE = 0.1;

describe("Evasion-Zähmung #301 (E1): Leder-Dodge-Kurve + Cap 0.40", () => {
  it("Dodge clampt exakt auf den Cap: Σevr 10 000 ⇒ dodge == 0.40 (Kurven-Asymptote 0.5 läge drüber)", () => {
    const local: ContentDB = {
      ...content,
      items: {
        ...content.items,
        t301_super_leather: {
          id: "t301_super_leather",
          name: { en: "T301 Leather", de: "T301-Leder" },
          type: "equipment",
          stackable: false,
          slot: "body",
          value: 1,
          evasionRating: 10_000,
        },
      },
    };
    const s = createGame({ name: "QA" }, local, 1);
    s.character.equipment.body = "t301_super_leather";
    const st = computeStats(s, local);
    expect(st.dodgeChance).toBe(DODGE_CAP);
    expect(DODGE_CAP).toBeLessThan(DODGE_EFF_MAX); // Cap < Asymptote ⇒ Cap ist ERREICHBAR (by design)
  });

  it("Chef-Szenario (voidhide_body + vambraces, Σevr 59,4): 56,9 % → 24,9 % — exakte Kurvenlage", () => {
    const s = createGame({ name: "QA" }, content, 1);
    s.character.equipment.body = "voidhide_body"; // evr 40.5
    s.character.equipment.gloves = "voidhide_vambraces"; // evr 18.9
    const evr =
      (content.items.voidhide_body?.evasionRating ?? 0) +
      (content.items.voidhide_vambraces?.evasionRating ?? 0);
    expect(evr).toBeCloseTo(59.4, 5); // Detektor: Content-Retune ⇒ bewusst neu messen
    const st = computeStats(s, content);
    expect(st.dodgeChance).toBeCloseTo((DODGE_EFF_MAX * evr) / (evr + K_DODGE), 10);
    expect(st.dodgeChance).toBeCloseTo(0.2487, 4); // war 0.5688 (Chefs 57-%-Messwert)
  });

  it("R99-Voll-Leder (voidhide 5tlg, Σevr 135) ⇒ ~34,6 % — UNTER dem Cap (Sprossen statt Plateau)", () => {
    const s = createGame({ name: "QA" }, content, 1);
    s.character.equipment.helmet = "voidhide_helm";
    s.character.equipment.body = "voidhide_body";
    s.character.equipment.legs = "voidhide_legs";
    s.character.equipment.gloves = "voidhide_vambraces";
    s.character.equipment.boots = "voidhide_boots";
    const st = computeStats(s, content);
    expect(st.dodgeChance).toBeCloseTo(0.3462, 4); // war 0.75 == Cap
    expect(st.dodgeChance).toBeLessThan(DODGE_CAP);
  });
});

describe("Evasion-Zähmung #301 (E3): DEX-Beitrag zur Contest-Evasion saturiert", () => {
  it("dex 1000 bleibt unter 1 + Asymptote (26); exakte Kurvenlage statt lineares dex·0.3 (wäre ~301)", () => {
    const s = createGame({ name: "QA", baseAttributes: { dex: 1000 } }, content, 1);
    const st = computeStats(s, content);
    const D = st.attributes.dex;
    expect(D).toBeGreaterThanOrEqual(1000);
    expect(st.evasion).toBeLessThan(1 + EVASION_ATTR_MAX);
    expect(st.evasion).toBeCloseTo(1 + (EVASION_ATTR_MAX * D) / (D + EVASION_ATTR_K), 10);
  });
});

describe("Tempo-Zähmung #301 (T1): DEX-Sättigung + relatives Cap −20 % (CHEF-ENTSCHEID)", () => {
  /** Alle stapelbaren Tempo-Tonika (Envelope-§4-Inventur: 9 Stück, Σ −5100 ms). */
  function pushAllHasteTonics(s: ReturnType<typeof createGame>): number {
    const haste = Object.values(content.items).filter(
      (it) => it.type === "consumable" && (it.buff?.bonus?.attackIntervalMs ?? 0) < 0,
    );
    for (const it of haste) s.character.buffs.push({ itemId: it.id, remainingMs: 3_600_000 });
    return haste.length;
  }

  it("voidwarden_blade (3650 ms): dex 200 + Slayer's War Brew ⇒ exakt base·0.8 = 2920 ms (≥ Chef-Minimum 2240)", () => {
    const s = createGame({ name: "QA", baseAttributes: { dex: 200 } }, content, 1);
    s.character.equipment.mainhand = "voidwarden_blade";
    s.character.buffs.push({ itemId: "slayer_war_brew", remainingMs: 3_600_000 }); // −750 ms
    const base = content.items.voidwarden_blade?.attackIntervalMs ?? 0;
    expect(base).toBe(3650); // Detektor: Waffen-Retune ⇒ Guards bewusst neu rechnen
    const st = computeStats(s, content);
    // Ungecappt läge der Stack bei ~1488 ms — der relative Boden MUSS binden.
    expect(st.attackIntervalMs).toBe(base * (1 - TEMPO_REDUCTION_CAP));
    // CHEF-ENTSCHEID 2026-07-09 („min. 2240 ms"): mit der echten Katalog-Basis 3650 sogar 2920.
    expect(st.attackIntervalMs).toBeGreaterThanOrEqual(2240);
  });

  it("2H bleibt 2H: selbst dex 1000 + ALLE Tempo-Tonika enden am relativen Boden (nie 800er-Einheitsbrei)", () => {
    const s = createGame({ name: "QA", baseAttributes: { dex: 1000 } }, content, 1);
    s.character.equipment.mainhand = "voidwarden_blade";
    const n = pushAllHasteTonics(s);
    expect(n).toBeGreaterThanOrEqual(5); // der Stack existiert wirklich (Envelope-Inventur: 9)
    const st = computeStats(s, content);
    const base = content.items.voidwarden_blade?.attackIntervalMs ?? 0;
    expect(st.attackIntervalMs).toBe(base * (1 - TEMPO_REDUCTION_CAP)); // 2920
    expect(st.attackIntervalMs).toBeGreaterThan(ATTACK_INTERVAL_FLOOR_MS); // der 800er-Boden bindet NIE mehr für 2H
  });

  it("Waffen-Tempo-Identität: der Dolch bleibt am Voll-Stack klar schneller als die schwerste 2H", () => {
    const build = (weapon: string) => {
      const s = createGame({ name: "QA", baseAttributes: { dex: 1000 } }, content, 1);
      s.character.equipment.mainhand = weapon;
      pushAllHasteTonics(s);
      return computeStats(s, content).attackIntervalMs;
    };
    const dagger = build("adamantium_dagger");
    const heavy2h = build("voidwarden_blade");
    const daggerBase = content.items.adamantium_dagger?.attackIntervalMs ?? 3000;
    expect(dagger).toBe(daggerBase * (1 - TEMPO_REDUCTION_CAP));
    // Vor #301 klebten BEIDE bei 800 ms (Identität wegnivelliert) — jetzt trennt sie der relative Boden.
    expect(dagger).toBeLessThan(heavy2h);
  });
});

describe("Evasion-Zähmung #301 (E2): Gegner-Accuracy skaliert ab L150 mit dem Level", () => {
  it("ALLE Monster ≤ L150 bleiben bit-identisch (Low/Mid-Game unberührt)", () => {
    let below = 0;
    let above = 0;
    for (const m of Object.values(content.monsters)) {
      if (m.level <= MONSTER_ACC_LEVEL_START) {
        below++;
        expect(enemyEffectiveAccuracy(m), m.id).toBe(m.accuracy);
      } else {
        above++;
        expect(enemyEffectiveAccuracy(m), m.id).toBeGreaterThan(m.accuracy);
      }
    }
    // Zensus-Anker (Spec §1: 78 von 99 unter der Schwelle) — beide Seiten müssen real existieren.
    expect(below).toBeGreaterThan(0);
    expect(above).toBeGreaterThan(0);
  });

  it("Referenzwerte: forest_bear (L120) unverändert 15; idol_warden (L245) ⇒ 24 + 0.35·95 = 57,25", () => {
    // red-team #302 L2-Re-Pin (2026-07-09, monster-threat-spec §6): forest_bear acc 14→15,
    // idol_warden acc 14→24 (Papier-Monster-Fix) — beide Basiswerte verschieben sich, die
    // E2-Surcharge-Formel selbst (ab L150, +0.35/Level) bleibt unverändert.
    expect(enemyEffectiveAccuracy(content.monsters.forest_bear!)).toBe(15);
    expect(enemyEffectiveAccuracy(content.monsters.idol_warden!)).toBeCloseTo(
      24 + MONSTER_ACC_PER_LEVEL * (245 - MONSTER_ACC_LEVEL_START),
      10,
    );
    expect(enemyEffectiveAccuracy(content.monsters.idol_warden!)).toBeCloseTo(57.25, 10);
  });
});

describe("Evasion-Zähmung #301 (L5-NACHTRAG): MIN_HIT_CHANCE klemmt die KOMBINIERTE Vermeidung", () => {
  it("combinedFloorDodge: Normalspiel unberührt, am Contest-Boden wird der Dodge ganz geklemmt", () => {
    // Contest deutlich über dem Boden ⇒ Klemme bindet nicht (Dodge bleibt voll).
    expect(combinedFloorDodge(DODGE_CAP, 0.25)).toBe(DODGE_CAP); // land 0.6·0.25 = 0.15 ≥ 0.1
    // Contest exakt am Boden ⇒ Dodge wird vollständig geklemmt (land == 0.1).
    expect(combinedFloorDodge(DODGE_CAP, MIN_HIT_CHANCE)).toBe(0);
    // Teil-Klemme: (1−0.2)·0.125 == 0.1 exakt.
    expect(combinedFloorDodge(DODGE_CAP, 0.125)).toBeCloseTo(0.2, 10);
    // Ohne Leder (dodge 0) ist die Klemme ein No-op.
    expect(combinedFloorDodge(0, 0.25)).toBe(0);
  });

  it("Eigenschaft: (1−effDodge)·contest ≥ MIN_HIT_CHANCE auf dem ganzen Raster", () => {
    for (let dodge = 0; dodge <= 0.75; dodge += 0.05) {
      for (let contest = MIN_HIT_CHANCE; contest <= 0.95; contest += 0.05) {
        const eff = combinedFloorDodge(dodge, contest);
        expect(eff).toBeLessThanOrEqual(dodge);
        expect((1 - eff) * contest).toBeGreaterThanOrEqual(MIN_HIT_CHANCE - 1e-12);
      }
    }
  });

  it("Verdrahtung im Kampf: Dodge-Cap + Contest-Boden landen kombiniert ~10 % (vorher 6 %) der Gegner-Schwünge", () => {
    // Degenerate-Worst-Case: acc-2-Gegner (Contest floored auf 0.1) gegen Dodge am Cap (0.40).
    // OHNE den L5-Kombiboden läge die Land-Rate bei 0.6·0.1 = 6 % — MIT muss sie ~10 % betragen.
    const local: ContentDB = {
      ...content,
      items: {
        ...content.items,
        t301_super_leather: {
          id: "t301_super_leather",
          name: { en: "T301 Leather", de: "T301-Leder" },
          type: "equipment",
          stackable: false,
          slot: "body",
          value: 1,
          evasionRating: 600, // ⇒ Kurve 0.4545 → Cap 0.40
        },
      },
      monsters: {
        ...content.monsters,
        t301_dummy: {
          ...content.monsters.chicken!,
          id: "t301_dummy",
          accuracy: 2,
          evasion: 0,
          damage: 1,
          attackIntervalMs: 1000,
          maxHp: 1000,
          loot: [],
          inflict: undefined,
        },
      },
    };
    const s = createGame({ name: "QA", baseAttributes: { dex: 1000, con: 100 } }, local, 4711);
    s.character.equipment.mainhand = null; // keine Waffen-Statuseffekte (Frost/Schock) im Messfenster
    s.character.equipment.body = "t301_super_leather";
    const st = computeStats(s, local);
    expect(st.dodgeChance).toBe(DODGE_CAP);
    // Contest ist wirklich am Boden: 2/(2+eva) < 0.1 (eva ≈ 24.3 durch die E3-Kurve).
    expect(2 / (2 + st.evasion)).toBeLessThan(MIN_HIT_CHANCE);

    expect(startCombat(s, local, "t301_dummy")).toBe(true);
    s.combat.enemyHp = 1_000_000_000; // der Spieler killt nie → durchgehendes Schwung-Fenster
    const maxHp = st.maxHp;
    let hits = 0;
    let misses = 0;
    let lastSeq = -1;
    for (let i = 0; i < 12_000; i++) {
      // 20 min à 100 ms
      s.character.hp = maxHp; // Unsterblichkeits-Reset (deterministisch, kein RNG-Draw)
      combatStep(s, local);
      for (const e of s.combat.log) {
        if (e.seq <= lastSeq || e.by !== "enemy") continue;
        if (e.kind === "hit") hits++;
        else if (e.kind === "miss") misses++;
      }
      lastSeq = s.combat.eventCount - 1;
    }
    const swings = hits + misses;
    expect(swings).toBeGreaterThan(1000); // 20 min / 1 s-Intervall — das Fenster ist real
    const landRate = hits / swings;
    // Erwartung 0.10 (Binomial-σ bei ~1200 Schwüngen ≈ 0.9 pp). 0.08 trennt sauber vom
    // ungeklemmten 0.06-Boden; die Obergrenze fängt eine versehentlich entfernte Dodge-Schicht.
    expect(landRate).toBeGreaterThanOrEqual(0.08);
    expect(landRate).toBeLessThanOrEqual(0.13);
  });
});
