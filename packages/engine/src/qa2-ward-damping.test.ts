import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, EquipSlot, MonsterDef } from "@hearthforge/shared";
import { BOSS_FROST_SLOW_MULT, FREEZE_IMMUNITY_MS, FROST_SLOW, WARD_HIT_DAMPING } from "@hearthforge/shared";
import { buildBisCharacter } from "./balance-envelope-helpers";
import { computeStats } from "./character";
import { combatStep, startCombat } from "./combat";
import { equipPet, equipSecondPet } from "./pets";
import { createTestGame } from "./test-helpers";

/**
 * QA-Runde 2, 1.4.0 „Feder und Stahl“ — Stoff und Ward (W1/W2/W4/W5) sowie Frost an Bossen (F1).
 * claude:2026-10-24T12:00:00+02:00 — Reine Prüfdatei (Kontrolleur), ändert keinen Produktcode.
 *
 * Kern der Prüfung: Nach dem Ward-Fix (Commit 613771d, STEP 7 in combat.ts) darf die 30-%-Dämpfung nur den Rohschaden
 * betreffen, den der Ward wirklich schluckt. Ein Krümel Ward (Ring mit 7 Punkten) darf keinem Stil mehr dauerhaft
 * −30 % geben. Geprüft werden die Formel direkt, die Reihenfolge DoT → Treffer im selben Tick, Treffer-Folgen ohne
 * Nachladen, Mischausrüstung (ein Stoffteil an Nah-/Fernkämpfer) und die Frost-Regeln an Dungeon-/Raid-Bossen.
 */

const KEEP = 1 - WARD_HIT_DAMPING;

/** Zonen-Gegner mit ordentlichem Schlag, ohne Status/Ward/Phasen, direkt bekämpfbar. */
function plainHitter(minDamage = 30): MonsterDef {
  const candidates = Object.values(content.monsters).filter(
    (m) => !m.inflict && m.damage >= minDamage && m.damage <= 150 && !(m.wardCapacity ?? 0) && !m.phases && !m.enrage && !m.dungeonOnly,
  );
  const monster = candidates.find((m) => startCombat(createTestGame({ name: "probe" }, content, 1), content, m.id));
  if (!monster) throw new Error("kein passender Gegner im Katalog");
  return monster;
}

/**
 * Lässt den Spieler gegen `monster` kämpfen und misst Tick für Tick den HP-Verlust. `prepare` setzt vor jedem Tick den
 * gewünschten Ward-/Status-Zustand. Der Spieler greift nie an (Timer eingefroren), der Gegner überlebt (1e9 HP), die HP
 * werden nach jedem Tick zurückgesetzt (kein Tod, kein Auto-Essen). Da Ward und DoT kein RNG ziehen, sind die Treffer
 * zwischen zwei Läufen mit gleichem Seed tickgenau identisch.
 */
function trace(
  monster: MonsterDef,
  ticks: number,
  prepare: (s: ReturnType<typeof createTestGame>, tick: number) => void,
  seed = 7,
): { loss: number[]; wardBefore: number[]; wardAfter: number[] } {
  const s = createTestGame({ name: "T", baseAttributes: { con: 200 } }, content, seed);
  s.character.food = null;
  const st = computeStats(s, content);
  expect(st.maxWard).toBe(0); // ohne Stoff kein eigener Pool, kein Warding-Regen, kein Cast-Nachladen
  expect(startCombat(s, content, monster.id)).toBe(true);
  s.combat.enemyHp = 1e9;
  s.combat.playerTimerMs = -1e9;
  s.character.hp = st.maxHp;
  const loss: number[] = [];
  const wardBefore: number[] = [];
  const wardAfter: number[] = [];
  for (let i = 0; i < ticks; i++) {
    prepare(s, i);
    wardBefore.push(s.character.ward);
    const hp0 = s.character.hp;
    combatStep(s, content);
    loss.push(hp0 - s.character.hp);
    wardAfter.push(s.character.ward);
    s.character.hp = st.maxHp;
  }
  return { loss, wardBefore, wardAfter };
}

describe("QA2 W5: Dämpfung nur auf den Teil, den der Ward trägt", () => {
  const monster = plainHitter();
  const TICKS = 600;
  const ref = trace(monster, TICKS, (s) => {
    s.character.ward = 0;
  });
  const hitTicks = ref.loss.map((l, i) => (l > 0 ? i : -1)).filter((i) => i >= 0);

  it("Referenz: der Gegner landet mehrere Treffer über 60 s", () => {
    expect(hitTicks.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...ref.loss)).toBeGreaterThan(20);
  });

  it("Krümel-Ward (7 Punkte, jeden Tick neu): der Treffer verliert genau 7 ÷ 0,7 = 10 Rohschaden, nicht 30 %", () => {
    const seven = trace(monster, TICKS, (s) => {
      s.character.ward = 7;
    });
    let bigHits = 0;
    for (const i of hitTicks) {
      const raw = ref.loss[i]!;
      const got = seven.loss[i]!;
      if (raw <= 7 / KEEP) {
        expect(got).toBe(0); // komplett geschluckt
        continue;
      }
      // Erwartung: HP-Verlust = round(raw − 7/0,7). Rundungsfenster ±1.
      expect(Math.abs(got - (raw - 7 / KEEP))).toBeLessThanOrEqual(1);
      expect(seven.wardAfter[i]).toBe(0);
      // Ab raw ≥ 40 unterscheiden sich alte Welt (raw × 0,7) und Soll (raw − 10) um > 2 Punkte: die alte Welt ist ausgeschlossen.
      if (raw >= 40) {
        expect(got).toBeGreaterThan(raw * KEEP + 1);
        bigHits += 1;
      }
    }
    expect(bigHits).toBeGreaterThanOrEqual(3);
  });

  it("Voller Ward: der ganze Treffer wird um 30 % gedämpft und vom Pool getragen, die HP bleiben unberührt", () => {
    const big = trace(monster, TICKS, (s) => {
      s.character.ward = 1e6;
    });
    for (const i of hitTicks) {
      const raw = ref.loss[i]!;
      expect(big.loss[i]).toBe(0);
      const absorbed = big.wardBefore[i]! - big.wardAfter[i]!;
      expect(absorbed).toBeCloseTo(raw * KEEP, 0);
    }
  });

  it("Treffer-Folge ohne Nachladen: nur der erste Treffer sieht den Ward, alle weiteren treffen voll", () => {
    let seeded = false;
    const once = trace(monster, TICKS, (s) => {
      if (!seeded) {
        s.character.ward = 10;
        seeded = true;
      }
    });
    const first = hitTicks[0]!;
    const rawFirst = ref.loss[first]!;
    // Erster Treffer: 10 Ward decken 10/0,7 ≈ 14,3 Rohschaden.
    expect(Math.abs(once.loss[first]! - Math.max(0, rawFirst - 10 / KEEP))).toBeLessThanOrEqual(1);
    expect(once.wardAfter[first]).toBe(0);
    // Alle weiteren Treffer: identisch zur Referenz (keine Rest-Dämpfung, kein Regen-Krümel).
    for (const i of hitTicks.slice(1)) {
      expect(once.wardBefore[i]).toBe(0);
      expect(once.loss[i]).toBe(ref.loss[i]);
    }
  });

  it("DoT und Treffer im selben Tick: die Blutung nimmt zuerst vom Ward (ungedämpft), der Treffer dämpft nur den Rest", () => {
    // Blutung 10/s ⇒ 1 Schaden je 100-ms-Tick, ungedämpft (W2/W4). Ward 5 jeden Tick neu.
    const mixed = trace(monster, TICKS, (s) => {
      s.character.ward = 5;
      s.combat.playerEffects = [{ type: "bleed", remainingMs: 5000, magnitude: 10 }];
    });
    // Ticks ohne Gegnertreffer: der DoT-Tick (1,0) wird komplett vom Ward geschluckt, 0 auf die HP.
    const quiet = ref.loss.map((l, i) => (l === 0 ? i : -1)).filter((i) => i >= 0).slice(0, 50);
    for (const i of quiet) {
      expect(mixed.loss[i]).toBeCloseTo(0, 6);
      expect(mixed.wardAfter[i]).toBeCloseTo(4, 6);
    }
    // Treffer-Ticks: nach dem DoT bleiben 4 Ward ⇒ decken 4/0,7 ≈ 5,71 Rohschaden; HP-Verlust = round(raw − 5,71).
    for (const i of hitTicks) {
      const raw = ref.loss[i]!;
      const expectedHit = Math.max(0, raw - 4 / KEEP);
      expect(Math.abs(mixed.loss[i]! - expectedHit)).toBeLessThanOrEqual(1);
      expect(mixed.wardAfter[i]).toBe(0);
    }
  });
});

describe("QA2 W2: DoT am Ward im Kampflog", () => {
  /** Blutung 10/s (1 je Tick) über 12 Ticks gegen `ward`; liefert die Log-Zeilen der Sekundengrenze. */
  function dotLog(ward: number): { shield: number[]; dot: number[]; hpLoss: number } {
    const s = createTestGame({ name: "L", baseAttributes: { con: 200 } }, content, 5);
    s.character.food = null;
    const st = computeStats(s, content);
    s.character.hp = st.maxHp;
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = -1e9;
    s.combat.playerTimerMs = -1e9;
    // 1000 ms Rest, 10 Ticks: genau eine Sekundengrenze (1000→900), das Auslaufen (100→0) loggt nicht mehr.
    s.combat.playerEffects = [{ type: "bleed", remainingMs: 1000, magnitude: 10 }];
    s.character.ward = ward;
    for (let i = 0; i < 10; i++) combatStep(s, content);
    const shield = s.combat.log.filter((e) => e.kind === "shield" && e.source === "ward").map((e) => e.amount);
    const dot = s.combat.log.filter((e) => e.kind === "dot" && e.by === "enemy").map((e) => e.amount);
    return { shield, dot, hpLoss: st.maxHp - s.character.hp };
  }

  it("voller Ward: die Sekundenzeile ist ein Ward-Absorb (10), keine DoT-Zeile; HP unberührt", () => {
    const r = dotLog(1000);
    expect(r.shield).toEqual([10]);
    expect(r.dot).toEqual([]);
    expect(r.hpLoss).toBe(0);
  });

  it("kein Ward: nur die DoT-Zeile (10), kein Ward-Absorb", () => {
    const r = dotLog(0);
    expect(r.shield).toEqual([]);
    expect(r.dot).toEqual([10]);
    expect(r.hpLoss).toBeCloseTo(10, 6);
  });
});

describe("QA2 W5: Mischausrüstung — ein Stoffteil an Nah- und Fernkämpfer spart nur seine Ward-Punkte", () => {
  const monster = plainHitter();

  /**
   * Zwillingslauf: A trägt das Stoffteil; B trägt dasselbe Teil in einem Content-Klon ohne wardCapacity (gleiche Attribute,
   * gleiche Stats, gleiche RNG-Folge, nur kein Ward-Pool).
   */
  function twins(mainhand: string, clothSlot: EquipSlot, clothId: string): { a: number[]; b: number[]; aWard: number[]; maxWard: number } {
    const noWard: ContentDB = { ...content, items: { ...content.items, [clothId]: { ...content.items[clothId]!, wardCapacity: 0 } } };
    const run = (c: ContentDB) => {
      const s = createTestGame({ name: "Z", baseAttributes: { con: 200 } }, c, 11);
      s.character.food = null;
      s.character.equipment.mainhand = mainhand;
      s.character.equipment[clothSlot] = clothId;
      const st = computeStats(s, c);
      expect(startCombat(s, c, monster.id)).toBe(true);
      s.combat.enemyHp = 1e9;
      s.combat.playerTimerMs = -1e9; // nie zaubern/schlagen ⇒ kein Cast-Nachladen, gleiche RNG-Folge
      s.character.hp = st.maxHp;
      s.character.ward = st.maxWard;
      const loss: number[] = [];
      const ward: number[] = [];
      for (let i = 0; i < 900; i++) {
        ward.push(s.character.ward);
        const hp0 = s.character.hp;
        combatStep(s, c);
        loss.push(hp0 - s.character.hp);
        s.character.hp = st.maxHp;
      }
      return { loss, ward, st };
    };
    const A = run(content);
    const B = run(noWard);
    for (const k of ["defense", "evasion", "maxHp", "dodgeChance", "blockChance", "damageReduction", "style"] as const) {
      expect(A.st[k], k).toBe(B.st[k]);
    }
    expect(B.st.maxWard).toBe(0);
    return { a: A.loss, b: B.loss, aWard: A.ward, maxWard: A.st.maxWard };
  }

  for (const [label, mainhand] of [
    ["Nahkämpfer (Schwert)", Object.values(content.items).find((i) => i.weaponStyle === "melee" && !i.twoHanded)!.id],
    ["Fernkämpfer (Bogen)", Object.values(content.items).find((i) => i.weaponStyle === "ranged")!.id],
  ] as const) {
    it(`${label} mit Leerengewebe-Sandalen (Ward 89,6): nach dem Bruch dämpfen Regen-Krümel nichts mehr`, () => {
      const t = twins(mainhand, "boots", "voidweave_sandals");
      expect(t.maxWard).toBeCloseTo(89.6, 3);
      let totalA = 0;
      let totalB = 0;
      let checked = 0;
      for (let i = 0; i < t.b.length; i++) {
        totalA += t.a[i]!;
        totalB += t.b[i]!;
        if (t.b[i]! <= 0) continue;
        if (t.aWard[i]! > 0.5) continue; // der Pool trägt noch (oder bricht gerade)
        // Krümel (< 0,5 Ward aus dem Regen): höchstens dieser Krümel wird gedämpft.
        expect(t.b[i]! - t.a[i]!).toBeLessThanOrEqual(1);
        checked += 1;
      }
      expect(checked).toBeGreaterThanOrEqual(5);
      // Das Stoffteil spart genau seinen Pool (89,6 gedämpft = 128 roh) plus Regen-Krümel, nie 30 % der Summe.
      expect(totalB - totalA).toBeLessThanOrEqual(t.maxWard / KEEP + 10);
      expect(totalB - totalA).toBeGreaterThanOrEqual(t.maxWard / KEEP - 3);
      expect(totalB).toBeGreaterThan(t.maxWard / KEEP * 3); // genug Treffer nach dem Bruch, damit die Aussage trägt
    });
  }
});

describe("QA2 F1: Frost an Dungeon-/Raid-Bossen", () => {
  function timerStep(dungeonId: string, encounterIndex: number): number {
    const d = content.dungeons.find((x) => x.id === dungeonId)!;
    const s = createTestGame({ name: "F", baseAttributes: { con: 200 } }, content, 4);
    s.character.hp = computeStats(s, content).maxHp;
    expect(startCombat(s, content, "chicken")).toBe(true);
    s.combat.dungeonId = d.id;
    s.combat.encounterIndex = encounterIndex;
    s.combat.monsterId = d.encounters[encounterIndex]!;
    s.combat.enemyHp = 1e9;
    s.combat.enemyTimerMs = 0;
    s.combat.playerTimerMs = -1e9;
    s.combat.enemyEffects = [{ type: "frost", remainingMs: 60_000, magnitude: 1 }];
    combatStep(s, content);
    return s.combat.enemyTimerMs;
  }

  it("Raid-Raum: Wellen 1–4 volle Verlangsamung, Boss (Welle 5) nur die Hälfte", () => {
    const rooms = content.dungeons.filter((d) => d.raidOnly);
    expect(rooms.length).toBe(5);
    for (const room of rooms) {
      for (let i = 0; i < room.encounters.length - 1; i++) {
        expect(timerStep(room.id, i), `${room.id} W${i + 1}`).toBeCloseTo(100 * (1 - FROST_SLOW), 6);
      }
      expect(timerStep(room.id, room.encounters.length - 1), `${room.id} Boss`).toBeCloseTo(100 * (1 - FROST_SLOW * BOSS_FROST_SLOW_MULT), 6);
    }
  });

  it("Boss-Wellen stehen im Content ausschließlich an letzter Stelle (Spec: „letzte Begegnung eines Laufs“)", () => {
    for (const d of content.dungeons) {
      const bossIdx = (d.waveMeta ?? []).map((w, i) => (w?.kind === "boss" ? i : -1)).filter((i) => i >= 0);
      for (const i of bossIdx) expect(i, `${d.id}: boss-Welle bei Index ${i}`).toBe(d.encounters.length - 1);
    }
  });

  it("Kein Einfrier-Dauerstun: L99-Magier mit sicherem Frost-Proc gegen den Raid-Boss, 4 Minuten", () => {
    // BiS-Magier (99, Schaden) aus dem Envelope-Builder; sein Stab bekommt im Content-Klon einen sicheren Frost-Proc.
    const bis = buildBisCharacter(content, "magic", 99, "damage", { allBuffs: false, excludeRaid: true, seed: 3 });
    const s = bis.state;
    const staffId = s.character.equipment.mainhand!;
    const staff = content.items[staffId]!;
    const c: ContentDB = {
      ...content,
      items: {
        ...content.items,
        [staffId]: { ...staff, weaponEffect: undefined, weaponEffects: [{ type: "frost", chance: 1, magnitude: 1, durationMs: 8000 }] },
      },
    };
    if (s.character.equippedInstances) delete s.character.equippedInstances.mainhand; // keine Runen-Procs auf dem Stab
    equipPet(s, null); // kein Begleiter-Tempo-Malus/-Stun, nur Frost soll den Takt bestimmen
    equipSecondPet(s, content, null);
    s.character.food = null;
    const room = content.dungeons.find((d) => d.raidOnly)!;
    const bossId = room.encounters[room.encounters.length - 1]!;
    const boss = content.monsters[bossId]!;
    expect(boss.resist?.includes("frost") ?? false).toBe(false);
    const st = computeStats(s, c);
    expect(st.style).toBe("magic");
    expect(startCombat(s, c, "chicken")).toBe(true);
    s.combat.dungeonId = room.id;
    s.combat.encounterIndex = room.encounters.length - 1;
    s.combat.monsterId = bossId;
    s.combat.enemyHp = 5e7; // groß, aber der Magier macht sichtbar Fortschritt (kein Patt-Stopp)
    s.character.hp = st.maxHp;
    const DURATION_MS = 240_000;
    let attacks = 0;
    let frozenSkips = 0;
    let frostTicks = 0;
    let lastSeq = -1;
    const skipTicks: number[] = [];
    for (let t = 0; t < DURATION_MS; t += 100) {
      combatStep(s, c);
      expect(s.combat.monsterId, `Kampf endete bei t=${t}`).toBe(bossId);
      if (s.combat.enemyEffects.some((e) => e.type === "frost")) frostTicks += 1;
      s.character.hp = st.maxHp;
      s.character.ward = st.maxWard;
      for (const ev of s.combat.log) {
        if (ev.seq <= lastSeq) continue;
        if (ev.by === "enemy" && (ev.kind === "hit" || ev.kind === "miss")) {
          attacks += 1;
          if (ev.kind === "miss" && ev.missReason === "frozen") {
            frozenSkips += 1;
            skipTicks.push(t);
          }
        }
      }
      lastSeq = s.combat.log[s.combat.log.length - 1]?.seq ?? lastSeq;
    }
    // Frost liegt praktisch durchgehend (sicherer Proc, 8 s Dauer, Zauber alle ~2 s).
    expect(frostTicks).toBeGreaterThan((DURATION_MS / 100) * 0.9);
    // Takt: 20 % langsamer am Boss ⇒ nominal × 0,8 fällige Angriffe (±1 Takt), davon einige eingefroren.
    const nominal = DURATION_MS / boss.attackIntervalMs;
    expect(attacks).toBeGreaterThanOrEqual(Math.floor(nominal * (1 - FROST_SLOW * BOSS_FROST_SLOW_MULT)) - 1);
    expect(attacks).toBeLessThanOrEqual(Math.ceil(nominal * (1 - FROST_SLOW * BOSS_FROST_SLOW_MULT)) + 1);
    // Einfrieren (Chef: unverändert) greift, aber nie als Kette: zwischen zwei Ausfällen liegt mindestens das Immunitätsfenster,
    // und mehr als die Hälfte der fälligen Angriffe kommt durch.
    expect(frozenSkips).toBeGreaterThan(0);
    for (let i = 1; i < skipTicks.length; i++) {
      expect(skipTicks[i]! - skipTicks[i - 1]!).toBeGreaterThanOrEqual(FREEZE_IMMUNITY_MS);
    }
    expect(attacks - frozenSkips).toBeGreaterThan(attacks * 0.5);
    console.log(`F1-Messung ${bossId}: fällige Angriffe ${attacks} (nominal ${nominal.toFixed(1)}), eingefroren ${frozenSkips}, Frost-Ticks ${frostTicks}/${DURATION_MS / 100}`);
  });
});
