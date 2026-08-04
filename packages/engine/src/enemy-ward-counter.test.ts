import { describe, expect, it } from "vitest";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { ARMOR_PEN_CAP, PRECISION_CAP } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat, combatStep } from "./combat";
import { xpForLevel } from "./leveling";

/**
 * Combat-Depth Phase B (combat.ts) — Verhaltens-Regressionen für die drei disjunkten Spieler-Konter
 * (Spec §3.2) und den neuen Gegner-Ward-Absorb:
 *   1. Precision  senkt NUR die effektive Gegner-Evasion (Accuracy-Contest) → mehr Treffer.
 *   2. Armor-Pen  senkt NUR den Mitigations-Input effDef → mehr Schaden pro Treffer.
 *   3. Gegner-Ward absorbiert den Schlag VOR den HP, bis der Pool erschöpft ist → dann trifft es HP.
 *   4. Ward-Break (ADDITIV, Combat-Feel v2 #2a): der volle Treffer drainт den Pool, `bleed = dmg·wardBreak`
 *      trifft die HP ZUSÄTZLICH → `Treffer bis Kill = (HP + Ward·(1−wardBreak))/dmg`, spart bei großem
 *      Pool nachweislich Treffer (die alte Anteils-Split-Formel war TTK-neutral, kürzte wardBreak raus).
 *   5. No-op-Disziplin: Konter 0 + wardCapacity 0 laufen bit-identisch (kein zusätzlicher RNG-Draw).
 */

// ── Test-Content-Fabriken (self-contained, analog armor-iteration2-combat.test.ts) ──
function withItems(items: ItemDef[]): ContentDB {
  const map = { ...content.items };
  for (const it of items) map[it.id] = it;
  return { ...content, items: map };
}
function withMonster(c: ContentDB, m: MonsterDef): ContentDB {
  return { ...c, monsters: { ...c.monsters, [m.id]: m } };
}
/** Nahkampfwaffe mit steuerbaren Konter-Signaturen (armorPen/precision/wardBreak). */
function weapon(id: string, fields: Partial<ItemDef>): ItemDef {
  return {
    id,
    name: { en: id, de: id },
    type: "equipment",
    stackable: false,
    slot: "mainhand",
    weaponStyle: "melee",
    weaponType: "sword",
    damageMin: 8,
    damageMax: 12,
    attackIntervalMs: 800, // schnellster Takt → viele Stichproben je Fenster
    ...fields,
  } as ItemDef;
}
/**
 * Gegner mit steuerbaren Verteidigungs-/Ward-Werten. Default: greift NIE an (attackIntervalMs riesig)
 * und stirbt im Fenster nicht (riesige HP) → isoliert die reine Spieler→Gegner-Auflösung.
 */
function mob(id: string, fields: Partial<MonsterDef>): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 10,
    maxHp: 50_000_000,
    damage: 0,
    accuracy: 100_000,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 10_000_000,
    xp: 0,
    gold: 0,
    loot: [],
    ...fields,
  } as MonsterDef;
}

/** Ein Held mit modestem str/dex (deterministische Akkuratesse/Schaden), viel con (überlebt sicher). */
function hero(c: ContentDB, weaponId: string, seed: number) {
  const s = createGame({ name: "K", baseAttributes: { str: 20, con: 200, dex: 10 } }, c, seed);
  s.character.equipment.mainhand = weaponId;
  s.character.food = null;
  s.character.hp = computeStats(s, c).maxHp;
  return s;
}

/** Zieht alle neuen Spieler-Angriffs-Events seit `lastSeq` (Ring-Puffer-sicher via monotone seq). */
function drainPlayerEvents(
  s: ReturnType<typeof hero>,
  lastSeq: number,
  onHit: (amount: number, crit: boolean) => void,
  onMiss: () => void,
): number {
  for (const e of s.combat.log) {
    if (e.seq <= lastSeq) continue;
    if (e.by === "player" && (e.kind === "hit" || e.kind === "crit")) onHit(e.amount, e.kind === "crit");
    else if (e.by === "player" && e.kind === "miss") onMiss();
  }
  return s.combat.eventCount - 1;
}

/**
 * Zählt die gelandeten Spieler-Treffer bis zum ERSTEN Kill (evasion 0 ⇒ jeder Angriff landet; der
 * Gegner greift nie an ⇒ der Held stirbt nicht). Deterministisch je Seed: die Schadenssequenz hängt
 * NICHT vom Ward ab (der Ward-Schritt zieht keinen RNG), sodass gleiche Seeds über verschiedene
 * wardBreak/wardCapacity-Varianten dieselbe Schadensfolge teilen → saubere gepaarte Treffer-Differenz.
 */
function hitsToKill(wb: number, wardCap: number, maxHp: number, seed: number): number {
  const w = weapon(`k_${wb}_${wardCap}`, { wardBreak: wb });
  const c = withMonster(withItems([w]), mob("k_mob", { wardCapacity: wardCap, maxHp, evasion: 0 }));
  const s = hero(c, `k_${wb}_${wardCap}`, seed);
  startCombat(s, c, "k_mob");
  let hits = 0;
  let lastSeq = s.combat.eventCount - 1;
  for (let i = 0; i < 6000 && s.combat.kills === 0; i++) {
    combatStep(s, c);
    lastSeq = drainPlayerEvents(s, lastSeq, () => hits++, () => {});
  }
  return hits;
}

// ── 1) Precision ↔ Gegner-Evasion ────────────────────────────────────────────
describe("Combat-Depth §3.2: Precision senkt die effektive Gegner-Evasion", () => {
  it("mit Precision ist die Trefferquote klar höher (Accuracy-Contest gegen effEva)", () => {
    const baseW = weapon("pt_plain", {});
    const precW = weapon("pt_precise", { precision: PRECISION_CAP }); // 0.60

    // Offensiv-Skill über-levelt (attack/power 30 vs Mob L10 ⇒ combatXpLevelMult 0 ⇒ 0 Kampf-XP) →
    // die Akkuratesse driftet über den Lauf NICHT. Precision ändert die Akkuratesse ohnehin NICHT
    // (kein eq.accuracy-Term) → beide Läufe teilen exakt dieselbe acc; nur effEva differiert.
    function boostSkills(s: ReturnType<typeof hero>) {
      s.skills.attack = { xp: xpForLevel(30) };
      s.skills.power = { xp: xpForLevel(30) };
    }
    // Gegner-Evasion an die Spieler-Akkuratesse koppeln → baseline hitChance ≈ 0.5, Precision ≈ 0.71.
    const probeC = withItems([baseW]);
    const probe = hero(probeC, "pt_plain", 1);
    boostSkills(probe);
    const eva = Math.round(computeStats(probe, probeC).accuracy);
    expect(eva).toBeGreaterThan(0);

    // Mehrere KURZE Kämpfe (je < 600 Ticks → unter dem Stalemate-Fenster, kein Auto-Stopp; riesige
    // Gegner-HP ⇒ kein Kill/Respawn) aggregieren genug Stichproben für eine belastbare Quote.
    function run(weaponId: string, w: ItemDef): { hits: number; misses: number } {
      let hits = 0;
      let misses = 0;
      for (let seed = 1; seed <= 8; seed++) {
        const c = withMonster(withItems([w]), mob("pt_mob", { evasion: eva }));
        const s = hero(c, weaponId, seed);
        boostSkills(s);
        startCombat(s, c, "pt_mob");
        let lastSeq = s.combat.eventCount - 1;
        for (let i = 0; i < 550; i++) {
          combatStep(s, c);
          lastSeq = drainPlayerEvents(s, lastSeq, () => hits++, () => misses++);
        }
      }
      return { hits, misses };
    }

    const base = run("pt_plain", baseW);
    const prec = run("pt_precise", precW);
    const baseRate = base.hits / (base.hits + base.misses);
    const precRate = prec.hits / (prec.hits + prec.misses);

    expect(base.hits + base.misses).toBeGreaterThan(300); // genug Stichproben
    expect(prec.hits + prec.misses).toBeGreaterThan(300);
    expect(precRate).toBeGreaterThan(baseRate + 0.12); // Precision hebt die Quote klar an
    expect(baseRate).toBeGreaterThan(0.42);
    expect(baseRate).toBeLessThan(0.58); // baseline ~0.5 (Evasion = Akkuratesse)
    expect(precRate).toBeGreaterThan(0.62); // ~0.71 mit Precision 0.60
  });
});

// ── 2) Armor-Pen ↔ Gegner-Mitigation ─────────────────────────────────────────
describe("Combat-Depth §3.2: Armor-Pen senkt die Gegner-Mitigation (nur effDef, K unberührt)", () => {
  it("mit Armor-Pen ist der Schaden pro Treffer (und der Max-Hit) höher", () => {
    const DEF = 150; // reduction 150/275 ≈ 0.55 (unter dem 0.8-Deckel)
    const baseW = weapon("at_plain", {});
    const penW = weapon("at_pen", { armorPen: ARMOR_PEN_CAP }); // 0.60 → effDef 60

    function run(weaponId: string, w: ItemDef): { total: number; hits: number; maxHit: number } {
      // evasion 0 → jeder Schlag landet (hitChance 1) → beide Läufe haben GLEICH VIELE Treffer,
      // sodass der Vergleich rein die Mitigation/Schadenshöhe isoliert.
      const c = withMonster(withItems([w]), mob("at_mob", { defense: DEF, evasion: 0 }));
      const s = hero(c, weaponId, 3);
      startCombat(s, c, "at_mob");
      let total = 0;
      let hits = 0;
      let maxHit = 0;
      let lastSeq = s.combat.eventCount - 1;
      // < 600 Ticks → kein Stalemate-Stopp; evasion 0 ⇒ beide Läufe landen dieselbe Trefferzahl.
      for (let i = 0; i < 550; i++) {
        combatStep(s, c);
        lastSeq = drainPlayerEvents(
          s,
          lastSeq,
          (amount) => {
            total += amount;
            hits++;
            maxHit = Math.max(maxHit, amount);
          },
          () => {},
        );
      }
      return { total, hits, maxHit };
    }

    const base = run("at_plain", baseW);
    const pen = run("at_pen", penW);

    expect(base.hits).toBeGreaterThan(50);
    expect(pen.hits).toBe(base.hits); // evasion 0 → identische Trefferzahl (nur Schadenshöhe differiert)
    expect(pen.total / pen.hits).toBeGreaterThan(base.total / base.hits); // mehr Schaden pro Treffer
    expect(pen.maxHit).toBeGreaterThan(base.maxHit); // höhere Ober-Schranke der Schadensspanne
  });
});

// ── 3) Gegner-Ward-Absorb (VOR HP, kein Regen) ───────────────────────────────
describe("Combat-Depth §3.2: Gegner-Ward absorbiert bis erschöpft, dann trifft es die HP", () => {
  it("initialisiert enemyWard auf wardCapacity und schützt HP, bis der Pool leer ist (wardBreak 0)", () => {
    const W = 40;
    const w = weapon("wa_sword", { wardBreak: 0 }); // kein Durchbluten
    const c = withMonster(withItems([w]), mob("wa_mob", { wardCapacity: W, evasion: 0 }));
    const s = hero(c, "wa_sword", 5);
    startCombat(s, c, "wa_mob");

    expect(s.combat.enemyWard).toBe(W); // Encounter-Start = frischer Voll-Pool
    const maxHp = c.monsters.wa_mob!.maxHp;

    let sawAbsorbNoHp = false;
    let sawHpDamage = false;
    for (let i = 0; i < 3000; i++) {
      combatStep(s, c);
      const ward = s.combat.enemyWard!;
      if (ward < W && ward > 0 && s.combat.enemyHp === maxHp) sawAbsorbNoHp = true;
      if (s.combat.enemyHp < maxHp) {
        sawHpDamage = true;
        expect(ward).toBe(0); // bei wardBreak 0 sinkt HP ERST nach erschöpftem Ward
      }
    }
    expect(sawAbsorbNoHp).toBe(true); // Ward wurde angezehrt, während die HP voll blieben
    expect(sawHpDamage).toBe(true); // und danach ging es auf die HP über
  });

  it("Gegner mit wardCapacity 0 (Melee/Range): Ward-Schritt ist No-op, jeder Treffer trifft direkt HP", () => {
    const w = weapon("wa0_sword", {});
    const c = withMonster(withItems([w]), mob("wa0_mob", { wardCapacity: 0, evasion: 0 }));
    const s = hero(c, "wa0_sword", 5);
    startCombat(s, c, "wa0_mob");
    expect(s.combat.enemyWard).toBe(0);
    const maxHp = c.monsters.wa0_mob!.maxHp;
    for (let i = 0; i < 200; i++) combatStep(s, c);
    expect(s.combat.enemyWard).toBe(0); // bleibt 0
    expect(s.combat.enemyHp).toBeLessThan(maxHp); // Schaden ging direkt auf die HP
  });
});

// ── 4) Ward-Break ADDITIV (Combat-Feel v2 #2a) ───────────────────────────────
describe("Combat-Feel v2 #2a: Ward-Break ist ADDITIVer Bonus-HP-Schaden (spart Treffer bei großem Pool)", () => {
  it("bei riesigem Ward-Pool blutet dmg·wardBreak ZUSÄTZLICH auf HP, während der volle Treffer den Pool drainт", () => {
    const WB = 0.4;
    const HUGE = 50_000_000; // Ward erschöpft im Fenster nie → HP-Schaden = ausschließlich Durchbluten
    const w = weapon("wb_sword", { wardBreak: WB });
    const c = withMonster(
      withItems([w]),
      mob("wb_mob", { wardCapacity: HUGE, maxHp: 100_000_000, evasion: 0 }),
    );
    const s = hero(c, "wb_sword", 7);
    startCombat(s, c, "wb_mob");

    const wardStart = s.combat.enemyWard!;
    const hpStart = c.monsters.wb_mob!.maxHp;
    let bleedWhileWardUp = false;
    for (let i = 0; i < 4000; i++) {
      combatStep(s, c);
      if (s.combat.enemyWard! > 0 && s.combat.enemyHp < hpStart) bleedWhileWardUp = true;
    }
    const hpLost = hpStart - s.combat.enemyHp;
    const wardConsumed = wardStart - s.combat.enemyWard!;

    expect(bleedWhileWardUp).toBe(true); // HP sank, OBWOHL der Ward noch stand (additiver Bonus)
    expect(s.combat.enemyWard!).toBeGreaterThan(0); // Pool nie erschöpft → reines Durchbluten
    expect(hpLost).toBeGreaterThan(0);
    expect(wardConsumed).toBeGreaterThan(0);
    // ADDITIV: der volle Treffer drainт den Pool (wardConsumed = Σ dmg), der Bonus-Bleed = Σ dmg·wardBreak
    // trifft die HP zusätzlich. Also ist das Verhältnis hpLost/wardConsumed ≈ wardBreak (NICHT
    // hpLost/(hpLost+wardConsumed) wie in der alten Split-Formel — dort wäre es ebenfalls wb, aber der
    // Pool hätte nur dmg·(1−wb) statt dmg verloren).
    const bleedRatio = hpLost / wardConsumed;
    expect(bleedRatio).toBeGreaterThan(WB - 0.06);
    expect(bleedRatio).toBeLessThan(WB + 0.06);
  });

  it("ohne Ward-Break schützt ein riesiger Pool die HP KOMPLETT (kein additiver Bleed)", () => {
    const HUGE = 50_000_000;
    const w = weapon("wb0_sword", { wardBreak: 0 });
    const c = withMonster(
      withItems([w]),
      mob("wb0_mob", { wardCapacity: HUGE, maxHp: 100_000_000, evasion: 0 }),
    );
    const s = hero(c, "wb0_sword", 7);
    startCombat(s, c, "wb0_mob");
    const hpStart = c.monsters.wb0_mob!.maxHp;
    for (let i = 0; i < 2000; i++) combatStep(s, c);
    expect(s.combat.enemyWard!).toBeLessThan(HUGE); // Pool wird angezehrt (voller Treffer drainт)
    expect(s.combat.enemyHp).toBe(hpStart); // aber ohne wardBreak bleibt die HP unangetastet
  });

  it("bei großem Ward-Pool SPART Ward-Break nachweislich Treffer bis zum Kill (und skaliert mit dem Pool)", () => {
    // Kernbefund des Fixes: die alte Split-Formel war TTK-neutral (wardBreak kürzte sich raus). Additiv
    // gilt `Treffer bis Kill = (HP + Ward·(1−wardBreak))/dmg` → wardBreak spart `Ward·wardBreak/dmg`
    // Treffer, skaliert mit der Pool-Größe. evasion 0 ⇒ jeder Angriff landet; gleicher Seed ⇒ IDENTISCHE
    // Schadenssequenz (der Ward-Schritt zieht keinen RNG) ⇒ die Treffer-Differenz ist rein die Formel.
    const SEED = 11;
    const savedAt = (wardCap: number): number =>
      hitsToKill(0, wardCap, 200, SEED) - hitsToKill(0.6, wardCap, 200, SEED);

    const savedBigPool = savedAt(1200);
    const savedSmallPool = savedAt(200);

    expect(savedBigPool).toBeGreaterThan(10); // großer Pool → Ward-Break spart klar Treffer
    expect(savedSmallPool).toBeGreaterThanOrEqual(0); // kleiner Pool → geringe, aber nicht-negative Ersparnis
    expect(savedBigPool).toBeGreaterThan(savedSmallPool + 10); // Ersparnis skaliert mit der Pool-Größe
  });
});

// ── 5) No-op-Disziplin (kein zusätzlicher RNG-Draw) ──────────────────────────
describe("Combat-Depth §3.2: No-op-Pfade sind bit-identisch (RNG-Draw-Disziplin)", () => {
  it("Konter 0 + wardCapacity 0 laufen exakt wie ohne die Felder (identische RNG-Sequenz)", () => {
    // Gegner greift AN (damage>0, evasion>0, defense>0) → beide resolveAttack-Pfade ziehen RNG.
    // Ein versehentlicher Extra-Draw auf dem Ward-/Konter-No-op-Pfad würde die Sequenz verschieben.
    function run(withZeros: boolean) {
      const wFields = withZeros ? { armorPen: 0, precision: 0, wardBreak: 0 } : {};
      const mFields = withZeros ? { wardCapacity: 0 } : {};
      const w = weapon("noop_sword", wFields);
      const c = withMonster(
        withItems([w]),
        mob("noop_mob", {
          defense: 50,
          evasion: 30,
          damage: 3,
          accuracy: 40,
          attackIntervalMs: 1500,
          maxHp: 300_000,
          ...mFields,
        }),
      );
      const s = hero(c, "noop_sword", 42);
      startCombat(s, c, "noop_mob");
      for (let i = 0; i < 500; i++) combatStep(s, c);
      return {
        rng: s.rng,
        hp: s.character.hp,
        enemyHp: s.combat.enemyHp,
        log: s.combat.log.map((e) => ({ ...e })),
      };
    }
    const plain = run(false);
    const zeros = run(true);
    expect(zeros.rng).toEqual(plain.rng); // identische RNG-Sequenz → kein Extra-Draw auf No-op
    expect(zeros.enemyHp).toBe(plain.enemyHp);
    expect(zeros.hp).toBe(plain.hp);
    expect(zeros.log).toEqual(plain.log);
  });
});
