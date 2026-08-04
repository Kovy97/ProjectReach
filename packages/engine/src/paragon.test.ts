import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState } from "@hearthforge/shared";
import {
  PARAGON_ACC_BASE,
  PARAGON_ACC_PER_FLOOR,
  PARAGON_BOSS_DMG_MULT,
  PARAGON_BOSS_HP_MULT,
  PARAGON_DMG_BASE,
  PARAGON_DMG_GROWTH,
  PARAGON_DUNGEON_ID,
  PARAGON_GOLD_BASE,
  PARAGON_HP_BASE,
  PARAGON_HP_GROWTH,
  PARAGON_KEY_ITEM_ID,
  PARAGON_XP_BASE,
  PARAGON_YIELD_GROWTH,
} from "@hearthforge/shared";
import { buildBisCharacter } from "./balance-envelope-helpers";
import { startCombat, stopCombat } from "./combat";
import { unlockDungeonsForKey } from "./dungeon";
import { addItem, expandBaseCapacity } from "./inventory";
import {
  PARAGON_HP_ONRAMP_BASE,
  PARAGON_HP_ONRAMP_FULL_FLOOR,
  PARAGON_SECONDARY_RAMP_BASE,
  PARAGON_SECONDARY_RAMP_FULL_FLOOR,
  isParagonBossFloor,
  onParagonFloorCleared,
  paragonFloorMonsterId,
  paragonFloorPreview,
  paragonHpOnrampFactor,
  paragonScaledMonster,
  paragonSecondaryFactor,
  paragonStatus,
  paragonUnlocked,
  resetParagonOnDeath,
  startParagonFloor,
} from "./paragon";
import { createGame } from "./state";
import { advance } from "./tick";

/**
 * Paragonturm-Guards (dungeon-rework-spec §7, Welle P1+P2). Seit Welle P2 (content-dev) trägt
 * der ECHTE Content bereits eine reale `paragon_tower`-DungeonDef + `content.paragon`
 * (Spec-Vorschlags-Pools) — die Suite überschreibt `paragon` trotzdem mit einem eigenen,
 * kontrollierten Fixture (Existenz der Ids wird hart geprüft), damit die Kurven-/Rotations-
 * Assertions unten unabhängig von den exakten Live-Content-Werten bleiben. Die `dungeons`-Liste
 * wird NICHT mehr dupliziert (die reale `paragon_tower`-Def aus content.dungeons reicht).
 */

const POOL = ["iron_revenant", "frost_hexer", "charred_doomknight", "roc_void", "void_titan"];
const BOSS_POOL = ["charred_doomknight", "void_titan", "roc_void"];

function paragonContent(): ContentDB {
  for (const id of [...POOL, ...BOSS_POOL, "aether_wraith"]) {
    expect(content.monsters[id], `Fixture-Monster ${id} fehlt im Content`).toBeDefined();
  }
  for (const id of ["godiron_bar", "soulopal", "onyx"]) {
    expect(content.items[id], `Fixture-Item ${id} fehlt im Content`).toBeDefined();
  }
  expect(
    content.dungeons.find((d) => d.id === PARAGON_DUNGEON_ID),
    `${PARAGON_DUNGEON_ID}-DungeonDef fehlt im echten Content (Welle P2)`,
  ).toBeDefined();
  return {
    ...content,
    paragon: {
      pool: [...POOL],
      bossPool: [...BOSS_POOL],
      chest: [
        { loot: [{ itemId: "godiron_bar", chance: 1, min: 1, max: 3 }] },
        { minFloor: 10, loot: [{ itemId: "soulopal", chance: 1, min: 1, max: 2 }] },
        { minFloor: 20, loot: [{ itemId: "onyx", chance: 1, min: 1, max: 1 }] },
      ],
    },
  };
}

/** Entsperrt den Turm über den ECHTEN Einmal-Unlock-Pfad (kein Raw-Write). */
function unlockTower(s: GameState, c: ContentDB): void {
  const newly = unlockDungeonsForKey(s, c, PARAGON_KEY_ITEM_ID);
  expect(newly).toContain(PARAGON_DUNGEON_ID);
}

/** Starker Kämpfer (BiS-99-Melee-Damage + Top-Food) für die Etagen-Integrationstests. */
function fighter(c: ContentDB): GameState {
  const s = buildBisCharacter(c, "melee", 99, "damage", { allBuffs: true }).state;
  expandBaseCapacity(s.inventory, c, 100);
  addItem(s.inventory, c, "cooked_voidray", 50_000);
  s.character.food = "cooked_voidray";
  return s;
}

/** Kämpft die aktive Etage zu Ende (Clear/Tod/Patt) — Sim-Zeit, kein Wall-Clock-Sleep. */
function runFloor(s: GameState, c: ContentDB): void {
  let guard = 0;
  while (s.combat.monsterId !== null && guard++ < 3000) advance(s, c, 1000);
  expect(guard, "Etage in der Zeitschranke beendet").toBeLessThan(3000);
}

// Reine Formel-Spiegel für die Kurven-Guards (identisch zu paragonScaledMonster; seit Welle BB
// inkl. HP-Onramp r(f) — ab E5 exakt die alte §7-Kurve).
const hpBudget = (f: number, boss: boolean): number =>
  PARAGON_HP_BASE *
  Math.pow(PARAGON_HP_GROWTH, f - 1) *
  (boss ? PARAGON_BOSS_HP_MULT : 1) *
  paragonHpOnrampFactor(f);
const dmg = (f: number, boss: boolean): number =>
  PARAGON_DMG_BASE * Math.pow(PARAGON_DMG_GROWTH, f - 1) * (boss ? PARAGON_BOSS_DMG_MULT : 1);
const yieldGold = (f: number): number => PARAGON_GOLD_BASE * Math.pow(PARAGON_YIELD_GROWTH, f - 1);

describe("Paragonturm — Freischaltung & Gates", () => {
  it("ohne Unlock kein Start; der paragon_key entsperrt über das Einmal-Unlock-System permanent", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    expect(paragonUnlocked(s)).toBe(false);
    expect(startParagonFloor(s, c)).toBe(false);
    unlockTower(s, c);
    expect(paragonUnlocked(s)).toBe(true);
    expect(startParagonFloor(s, c)).toBe(true);
    expect(s.combat.paragonFloor).toBe(1);
    expect(s.combat.monsterId).toBe(POOL[0]);
    expect(s.combat.dungeonId).toBe(null);
  });

  it("Gate <kein anderer Kampf>: ein laufender Kampf blockiert den Etagen-Start", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    unlockTower(s, c);
    expect(startCombat(s, c, "chicken")).toBe(true);
    expect(startParagonFloor(s, c)).toBe(false); // Kampf läuft → Turm verweigert
    expect(s.combat.paragonFloor).toBeUndefined();
  });

  it("fehlender Paragon-Content (synthetisches Fixture ohne `paragon`) ⇒ Turm inert, kein Crash", () => {
    // Seit Welle P2 trägt der ECHTE Content bereits `content.paragon` (s. Suite-Docstring oben) —
    // die dokumentierte Toleranz „ohne Paragon-Content ⇒ inert" bleibt trotzdem ein Guard, nur
    // gegen ein explizit content-loses Fixture statt gegen den (jetzt befüllten) Live-Katalog.
    const c: ContentDB = { ...content, paragon: undefined };
    const s = createGame({ name: "X" }, c, 1);
    s.dungeonsUnlocked[PARAGON_DUNGEON_ID] = true; // Unlock simuliert — Content fehlt trotzdem
    expect(startParagonFloor(s, c)).toBe(false);
    expect(paragonFloorPreview(c, 1)).toBe(null);
    expect(paragonScaledMonster(c, 1)).toBe(null);
  });
});

describe("Paragonturm — Rotation & Skalierungs-Formel (§7 VERBATIM)", () => {
  it("deterministische Rotation: Normal-Etagen zählen ohne Boss-Etagen, Bosse rotieren eigen", () => {
    const c = paragonContent();
    // Normale Etagen 1..4, 6..9, 11: alle 5 Pool-Mitglieder kommen dran (kein Schatten-Index).
    expect(paragonFloorMonsterId(c, 1)).toBe(POOL[0]);
    expect(paragonFloorMonsterId(c, 2)).toBe(POOL[1]);
    expect(paragonFloorMonsterId(c, 3)).toBe(POOL[2]);
    expect(paragonFloorMonsterId(c, 4)).toBe(POOL[3]);
    expect(paragonFloorMonsterId(c, 6)).toBe(POOL[4]);
    expect(paragonFloorMonsterId(c, 7)).toBe(POOL[0]);
    // Boss-Etagen (jede 5.): eigener Pool, eigene Rotation.
    expect(isParagonBossFloor(5)).toBe(true);
    expect(paragonFloorMonsterId(c, 5)).toBe(BOSS_POOL[0]);
    expect(paragonFloorMonsterId(c, 10)).toBe(BOSS_POOL[1]);
    expect(paragonFloorMonsterId(c, 15)).toBe(BOSS_POOL[2]);
    expect(paragonFloorMonsterId(c, 20)).toBe(BOSS_POOL[0]);
    // Ungültige Etagen.
    expect(paragonFloorMonsterId(c, 0)).toBe(null);
    expect(paragonFloorMonsterId(c, 1.5)).toBe(null);
  });

  it("Formel-Werte: hp/dmg/acc/gold/xp exakt nach Spec-Kurve; Boss-Mults nur auf hp/dmg", () => {
    const c = paragonContent();
    for (const f of [1, 2, 7, 13, 41]) {
      const boss = isParagonBossFloor(f);
      expect(boss).toBe(false);
      const m = paragonScaledMonster(c, f)!;
      const base = content.monsters[paragonFloorMonsterId(c, f)!]!;
      const k = paragonSecondaryFactor(f);
      expect((m.maxHp ?? 0) + (m.wardCapacity ?? 0)).toBe(Math.round(hpBudget(f, false)));
      expect(m.damage).toBeCloseTo(dmg(f, false), 10);
      expect(m.accuracy).toBeCloseTo(PARAGON_ACC_BASE + PARAGON_ACC_PER_FLOOR * (f - 1), 10);
      expect(m.gold).toBe(Math.round(yieldGold(f)));
      expect(m.xp).toBe(Math.round(PARAGON_XP_BASE * Math.pow(PARAGON_YIELD_GROWTH, f - 1)));
      // Identität = Basis-Monster: id/level/interval unverändert, loot LEER;
      // Sekundärwerte defense/evasion GERAMPT (Welle BB — ab RAMP_FULL_FLOOR wieder = Basis).
      expect(m.id).toBe(base.id);
      expect(m.level).toBe(base.level);
      expect(m.evasion).toBe(Math.round(base.evasion * k));
      expect(m.defense).toBe(Math.round(base.defense * k));
      expect(m.attackIntervalMs).toBe(base.attackIntervalMs);
      expect(m.loot).toEqual([]);
    }
    // Boss-Etage: hp-Budget ×2, dmg ×1,15 — Ertrag (gold/xp) bewusst OHNE Boss-Mult.
    const b = paragonScaledMonster(c, 5)!;
    expect((b.maxHp ?? 0) + (b.wardCapacity ?? 0)).toBe(Math.round(hpBudget(5, true)));
    expect(b.damage).toBeCloseTo(dmg(5, true), 10);
    expect(b.gold).toBe(Math.round(yieldGold(5)));
  });

  it("Sekundärwert-Rampe (Welle BB): k(1)=Basis-Faktor, linear, ab E20 exakt ×1 — Grenzwerte & Blend", () => {
    // Rampen-Funktion selbst.
    expect(paragonSecondaryFactor(1)).toBeCloseTo(PARAGON_SECONDARY_RAMP_BASE, 12);
    expect(paragonSecondaryFactor(PARAGON_SECONDARY_RAMP_FULL_FLOOR)).toBe(1);
    expect(paragonSecondaryFactor(PARAGON_SECONDARY_RAMP_FULL_FLOOR + 37)).toBe(1);
    for (let f = 1; f < PARAGON_SECONDARY_RAMP_FULL_FLOOR; f++) {
      expect(paragonSecondaryFactor(f + 1)).toBeGreaterThan(paragonSecondaryFactor(f));
    }
    // HP-Onramp: ×Basis auf E1, linear, ab E5 (erste Boss-/Kapitel-21-Etage) EXAKT ×1 —
    // die §7-HP-Kurve ab E5 bleibt unangetastet.
    expect(paragonHpOnrampFactor(1)).toBeCloseTo(PARAGON_HP_ONRAMP_BASE, 12);
    expect(paragonHpOnrampFactor(PARAGON_HP_ONRAMP_FULL_FLOOR)).toBe(1);
    expect(paragonHpOnrampFactor(PARAGON_HP_ONRAMP_FULL_FLOOR + 100)).toBe(1);
    for (let f = 1; f < PARAGON_HP_ONRAMP_FULL_FLOOR; f++) {
      expect(paragonHpOnrampFactor(f + 1)).toBeGreaterThan(paragonHpOnrampFactor(f));
    }
    // Onramp endet spätestens dort, wo die Sekundär-Rampe endet (E20+-Härte = alles Basis).
    expect(PARAGON_HP_ONRAMP_FULL_FLOOR).toBeLessThanOrEqual(PARAGON_SECONDARY_RAMP_FULL_FLOOR);
    // Blend an einem Voll-Sekundärwert-Monster (void_titan: def/eva/regen/enrage/inflict).
    const base = content.monsters["void_titan"]!;
    const c = paragonContent();
    c.paragon = { pool: ["void_titan"] };
    const k1 = paragonSecondaryFactor(1);
    const e1 = paragonScaledMonster(c, 1)!;
    expect(e1.defense).toBe(Math.round(base.defense * k1));
    expect(e1.evasion).toBe(Math.round(base.evasion * k1));
    expect(e1.regen).toBeCloseTo((base.regen ?? 0) * k1, 12);
    // Enrage blendet Richtung ×1,0 (nur der Mult; die Schwelle bleibt Monster-Identität).
    expect(e1.enrage!.belowHpPct).toBe(base.enrage!.belowHpPct);
    expect(e1.enrage!.damageMult).toBeCloseTo(1 + (base.enrage!.damageMult - 1) * k1, 12);
    expect(e1.enrage!.damageMult).toBeLessThan(base.enrage!.damageMult);
    expect(e1.inflict!.chance).toBeCloseTo(base.inflict!.chance * k1, 12);
    expect(e1.inflict!.magnitude).toBeCloseTo(base.inflict!.magnitude * k1, 12);
    expect(e1.inflict!.type).toBe(base.inflict!.type);
    expect(e1.inflict!.durationMs).toBe(base.inflict!.durationMs);
    // Ab der Voll-Etage (E20+, Nicht-Boss-Etage 21) erben die Sekundärwerte wieder ROH —
    // die bisherige BiS-/Suffix-Härte dort oben bleibt unangetastet.
    const e21 = paragonScaledMonster(c, 21)!;
    expect(e21.defense).toBe(base.defense);
    expect(e21.evasion).toBe(base.evasion);
    expect(e21.regen).toBe(base.regen);
    expect(e21.enrage).toEqual(base.enrage);
    expect(e21.inflict).toEqual(base.inflict);
    // Basis OHNE optionale Sekundärfelder behält „Feld fehlt" (identische Kampf-Pfade).
    const plainC = paragonContent();
    plainC.paragon = { pool: ["iron_revenant"] };
    const plain = paragonScaledMonster(plainC, 1)!;
    expect(plain.enrage).toBeUndefined();
    expect(plain.inflict).toBeUndefined();
  });

  it("Ward-Gegner: hp-Budget auf hp+ward verteilt, Ward-Quote gerampt (Threat-Spec §3.2 + Welle BB)", () => {
    const c = paragonContent();
    c.paragon = { pool: ["aether_wraith"] }; // Ward-Monster als Etage 1
    const base = content.monsters["aether_wraith"]!;
    expect(base.wardCapacity ?? 0).toBeGreaterThan(0);
    const m = paragonScaledMonster(c, 1)!;
    const budget = Math.round(hpBudget(1, false));
    expect(m.maxHp + (m.wardCapacity ?? 0)).toBe(budget);
    // Ward-Quote des Basis-Monsters × Rampen-Faktor (±1 Rundung); Budget-Summe bleibt exakt.
    const baseShare = (base.wardCapacity ?? 0) / (base.maxHp + (base.wardCapacity ?? 0));
    expect(m.wardCapacity ?? 0).toBeCloseTo(budget * baseShare * paragonSecondaryFactor(1), 0);
    // Ab der Voll-Etage gilt wieder die volle Basis-Quote (Nicht-Boss-Etage 21).
    const m21 = paragonScaledMonster(c, 21)!;
    const budget21 = Math.round(hpBudget(21, false));
    expect(m21.maxHp + (m21.wardCapacity ?? 0)).toBe(budget21);
    expect(m21.wardCapacity ?? 0).toBeCloseTo(budget21 * baseShare, 0);
    // Ward-lose Basis ⇒ Feld bleibt weg (identische Kampf-Pfade).
    const plain = paragonContent();
    expect(paragonScaledMonster(plain, 1)!.wardCapacity).toBeUndefined();
  });

  it("GUARD Monotonie: Schwierigkeit wächst strikt, Ertrag/Schwierigkeit fällt strikt (kein Printer)", () => {
    // Kurven-Ebene (boss-frei): hp & dmg strikt steigend, gold/hp & xp/hp strikt fallend.
    expect(PARAGON_YIELD_GROWTH).toBeLessThan(PARAGON_HP_GROWTH);
    expect(PARAGON_YIELD_GROWTH).toBeLessThan(PARAGON_DMG_GROWTH);
    for (let f = 1; f < 120; f++) {
      expect(hpBudget(f + 1, false)).toBeGreaterThan(hpBudget(f, false));
      expect(dmg(f + 1, false)).toBeGreaterThan(dmg(f, false));
      const ratioNow = yieldGold(f) / hpBudget(f, false);
      const ratioNext = yieldGold(f + 1) / hpBudget(f + 1, false);
      expect(ratioNext).toBeLessThan(ratioNow);
    }
    // Boss-Etagen sind strikt härter als die Normal-Formel derselben Etage (und zahlen NICHT mehr).
    for (const f of [5, 10, 25, 50]) {
      expect(hpBudget(f, true)).toBeGreaterThan(hpBudget(f, false));
      expect(dmg(f, true)).toBeGreaterThan(dmg(f, false));
    }
    // Block-Ebene inkl. Boss-Mults: Ertrag/Schwierigkeit je 5er-Block fällt monoton.
    const blockRatio = (block: number): number => {
      let gold = 0;
      let hp = 0;
      for (let f = block * 5 + 1; f <= block * 5 + 5; f++) {
        gold += yieldGold(f);
        hp += hpBudget(f, isParagonBossFloor(f));
      }
      return gold / hp;
    };
    for (let block = 0; block < 20; block++) {
      expect(blockRatio(block + 1)).toBeLessThan(blockRatio(block));
    }
  });
});

describe("Paragonturm — Etagen-Loop, Pause, Truhen", () => {
  it("Etagen-Clear: Kill beendet den Kampf (Pause), Checkpoint++ & Rekord, Ertrag = Etagen-Gold/XP, KEIN Basis-Loot", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    const goldBefore = s.character.gold;
    const itemsBefore = s.stats.itemsGathered;

    expect(startParagonFloor(s, c)).toBe(true);
    runFloor(s, c);

    expect(s.stats.deaths, "Etage 1 als Clear (BiS-99-Damage)").toBe(0);
    expect(s.paragon.checkpoint).toBe(1);
    expect(s.paragon.best).toBe(1);
    // Pause: Kampf ist AUS, kein Auto-Weiter — auch nach weiterer Sim-Zeit.
    expect(s.combat.monsterId).toBe(null);
    expect(s.combat.paragonFloor).toBeUndefined();
    advance(s, c, 60_000);
    expect(s.combat.monsterId).toBe(null);
    expect(s.paragon.checkpoint).toBe(1);
    // Ertrag: Etagen-Gold floss über den normalen Kill-Pfad; kein Item-Loot (Etage 1 = keine Truhe).
    expect(s.character.gold).toBeGreaterThanOrEqual(goldBefore + Math.round(yieldGold(1)));
    expect(s.stats.itemsGathered).toBe(itemsBefore);
    // Kill-Credit läuft auf die Basis-Id (Bestiarium bleibt konsistent).
    expect(s.monsterKills[POOL[0]!]).toBe(1);
    // Fortsetzen: nächster Start = Etage 2 mit dem nächsten Rotations-Monster.
    expect(startParagonFloor(s, c)).toBe(true);
    expect(s.combat.paragonFloor).toBe(2);
    expect(s.combat.monsterId).toBe(POOL[1]);
  });

  it("Meilenstein-Truhe: rollt genau auf Boss-Etagen, Stufen respektieren minFloor", () => {
    const c = paragonContent();
    // Etage 5 (Boss, < minFloor 10/20): nur die Basis-Stufe rollt.
    const s5 = fighter(c);
    unlockTower(s5, c);
    s5.paragon.checkpoint = 4;
    expect(startParagonFloor(s5, c)).toBe(true);
    expect(s5.combat.paragonFloor).toBe(5);
    expect(s5.combat.monsterId).toBe(BOSS_POOL[0]);
    const items5 = s5.stats.itemsGathered;
    runFloor(s5, c);
    expect(s5.stats.deaths, "Boss-Etage 5 als Clear").toBe(0);
    expect(s5.paragon.checkpoint).toBe(5);
    const gained5 = s5.stats.itemsGathered - items5;
    expect(gained5, "Basis-Truhe (godiron_bar @1,0 x1–3) gerollt").toBeGreaterThanOrEqual(1);
    expect(gained5).toBeLessThanOrEqual(3);
    const bars = (s5.bank["godiron_bar"] ?? 0) + s5.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "godiron_bar" ? sl.qty : 0), 0);
    expect(bars).toBe(gained5);
    // soulopal-Stufe (minFloor 10) hat auf Etage 5 NICHT gerollt.
    expect(s5.bank["soulopal"] ?? 0).toBe(0);

    // Etage 10 (Boss): Basis-Stufe + soulopal-Stufe rollen, onyx-Stufe (minFloor 20) nicht.
    const s10 = fighter(c);
    unlockTower(s10, c);
    s10.paragon.checkpoint = 9;
    expect(startParagonFloor(s10, c)).toBe(true);
    expect(s10.combat.paragonFloor).toBe(10);
    runFloor(s10, c);
    if (s10.stats.deaths === 0) {
      const opals = (s10.bank["soulopal"] ?? 0) + s10.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "soulopal" ? sl.qty : 0), 0);
      expect(opals, "soulopal-Stufe ab f≥10").toBeGreaterThanOrEqual(1);
      const onyx = (s10.bank["onyx"] ?? 0) + s10.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "onyx" ? sl.qty : 0), 0);
      expect(onyx, "onyx-Stufe erst ab f≥20").toBe(0);
    }
  });

  it("Truhen-Breadcrumb (SAVE 68, Welle LL): Boss-Etage stempelt lastParagonChest mit Inhalt + monotoner seq", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 7);
    unlockTower(s, c);
    expect(s.paragonChestSeq).toBe(0);
    expect(s.lastParagonChest).toBeNull();

    // Normale Etage: KEIN Breadcrumb, Zähler unangetastet.
    s.paragon.checkpoint = 0;
    s.combat.paragonFloor = 1;
    s.combat.monsterId = POOL[0]!;
    onParagonFloorCleared(s, c);
    expect(s.lastParagonChest).toBeNull();
    expect(s.paragonChestSeq).toBe(0);

    // Boss-Etage 5: Basis-Stufe (godiron_bar @1,0 ×1–3) rollt → Breadcrumb trägt exakt den
    // tatsächlich angekommenen Inhalt (chestTier 1 = nur die Basis-Stufe rollt auf E5).
    s.paragon.checkpoint = 4;
    s.combat.paragonFloor = 5;
    s.combat.monsterId = BOSS_POOL[0]!;
    onParagonFloorCleared(s, c);
    const crumb = s.lastParagonChest!;
    expect(crumb).not.toBeNull();
    expect(crumb.floor).toBe(5);
    expect(crumb.chestTier).toBe(1);
    expect(crumb.seq).toBe(1);
    expect(s.paragonChestSeq).toBe(1);
    expect(crumb.items).toHaveLength(1);
    expect(crumb.items[0]!.id).toBe("godiron_bar");
    const owned = (s.bank["godiron_bar"] ?? 0) + s.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "godiron_bar" ? sl.qty : 0), 0);
    expect(crumb.items[0]!.qty).toBe(owned);
    expect(crumb.items[0]!.qty).toBeGreaterThanOrEqual(1);
    expect(crumb.items[0]!.qty).toBeLessThanOrEqual(3);
  });

  it("Truhen-Breadcrumb: unquittierte Truhen KUMULIEREN die items (Auto-Aufstieg/Offline-Chaining); Quittung startet frisch, seq bleibt monoton", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 11);
    unlockTower(s, c);

    // Truhe 1 (E5) — UI zeigt sie NICHT an (kein Ack), z.B. weil offline weitergechained wurde.
    s.paragon.checkpoint = 4;
    s.combat.paragonFloor = 5;
    s.combat.monsterId = BOSS_POOL[0]!;
    onParagonFloorCleared(s, c);
    const bars5 = s.lastParagonChest!.items.find((i) => i.id === "godiron_bar")!.qty;

    // Truhe 2 (E10, soulopal-Stufe rollt mit) OHNE Quittung: items aufsummiert, floor/seq = letzte
    // Truhe, chestTier = Maximum (E10 ⇒ 2 Stufen).
    s.paragon.checkpoint = 9;
    s.combat.paragonFloor = 10;
    s.combat.monsterId = BOSS_POOL[1]!;
    onParagonFloorCleared(s, c);
    const crumb = s.lastParagonChest!;
    expect(crumb.floor).toBe(10);
    expect(crumb.chestTier).toBe(2);
    expect(crumb.seq).toBe(2);
    expect(s.paragonChestSeq).toBe(2);
    const barsTotal = (s.bank["godiron_bar"] ?? 0) + s.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "godiron_bar" ? sl.qty : 0), 0);
    expect(crumb.items.find((i) => i.id === "godiron_bar")!.qty, "godiron_bar beider Truhen aufsummiert").toBe(barsTotal);
    expect(barsTotal, "zweite Basis-Stufe (@1,0) hat echt dazu addiert").toBeGreaterThan(bars5);
    expect(crumb.items.find((i) => i.id === "soulopal")!.qty).toBeGreaterThanOrEqual(1);

    // UI quittiert (null) → nächste Truhe startet frisch; die seq läuft aus dem monotonen
    // Zähler WEITER (nie wieder bei 1 — Lehre aus Welle DD/petDropSeq).
    s.lastParagonChest = null;
    s.paragon.checkpoint = 14;
    s.combat.paragonFloor = 15;
    s.combat.monsterId = BOSS_POOL[2]!;
    onParagonFloorCleared(s, c);
    const fresh = s.lastParagonChest!;
    expect(fresh.seq).toBe(3);
    expect(s.paragonChestSeq).toBe(3);
    expect(fresh.floor).toBe(15);
    const barsFresh = fresh.items.find((i) => i.id === "godiron_bar")!.qty;
    expect(barsFresh, "frischer Breadcrumb trägt NUR die neue Truhe").toBeLessThanOrEqual(3);
  });

  it("Truhen-Breadcrumb: All-Miss-Truhe wird trotzdem gefeiert (items leer); ohne Chest-Content kein Breadcrumb", () => {
    // Alle Rows verfehlen (chance 0) → die Truhe selbst bleibt der Meilenstein (items: []).
    const c = paragonContent();
    c.paragon = {
      pool: [...POOL],
      bossPool: [...BOSS_POOL],
      chest: [{ loot: [{ itemId: "godiron_bar", chance: 0, min: 1, max: 3 }] }],
    };
    const s = createGame({ name: "X" }, c, 3);
    unlockTower(s, c);
    s.paragon.checkpoint = 4;
    s.combat.paragonFloor = 5;
    s.combat.monsterId = BOSS_POOL[0]!;
    onParagonFloorCleared(s, c);
    expect(s.lastParagonChest).toEqual({ floor: 5, chestTier: 1, items: [], seq: 1 });

    // Ohne definierte Truhen-Stufen (chest fehlt) gibt es KEINEN Breadcrumb (Spiegel hasChest).
    const c2 = paragonContent();
    c2.paragon = { pool: [...POOL], bossPool: [...BOSS_POOL] };
    const s2 = createGame({ name: "Y" }, c2, 3);
    unlockTower(s2, c2);
    s2.paragon.checkpoint = 4;
    s2.combat.paragonFloor = 5;
    s2.combat.monsterId = BOSS_POOL[0]!;
    onParagonFloorCleared(s2, c2);
    expect(s2.lastParagonChest).toBeNull();
    expect(s2.paragonChestSeq).toBe(0);
  });

  it("Pause via stopCombat = kein Verlust: Checkpoint bleibt, Wiedereinstieg bei derselben Etage", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    s.paragon.checkpoint = 2;
    expect(startParagonFloor(s, c)).toBe(true);
    expect(s.combat.paragonFloor).toBe(3);
    advance(s, c, 3_000); // mitten im Kampf …
    stopCombat(s);
    expect(s.combat.monsterId).toBe(null);
    expect(s.combat.paragonFloor).toBeUndefined();
    expect(s.paragon.checkpoint, "freiwilliges Verlassen kostet nichts").toBe(2);
    expect(startParagonFloor(s, c)).toBe(true);
    expect(s.combat.paragonFloor).toBe(3); // Fortsetzen bei checkpoint+1
  });

  it("paragonStatus/paragonFloorPreview liefern die P2-UI-Sicht", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    expect(paragonStatus(s)).toEqual({ unlocked: false, currentFloor: 1, bestFloor: 0, activeFloor: null });
    unlockTower(s, c);
    s.paragon = { checkpoint: 7, best: 12 };
    expect(paragonStatus(s)).toEqual({ unlocked: true, currentFloor: 8, bestFloor: 12, activeFloor: null });
    const p5 = paragonFloorPreview(c, 5)!;
    expect(p5.isBoss).toBe(true);
    expect(p5.hasChest).toBe(true);
    expect(p5.monster.id).toBe(BOSS_POOL[0]);
    expect(p5.monster.maxHp + (p5.monster.wardCapacity ?? 0)).toBe(Math.round(hpBudget(5, true)));
    const p6 = paragonFloorPreview(c, 6)!;
    expect(p6.isBoss).toBe(false);
    expect(p6.hasChest).toBe(false);
  });
});

describe("Paragonturm — Auto-Aufstieg (settings.autoParagonAscend, SAVE 67 / Welle JJ)", () => {
  it("Default AUS: createGame startet mit false, Etagen-Clear bleibt exakt das Pausen-Verhalten", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    expect(s.settings.autoParagonAscend, "Opt-in — frische Saves pausieren wie bisher").toBe(false);
    unlockTower(s, c);
    s.combat.paragonFloor = 1;
    s.combat.monsterId = POOL[0]!;
    onParagonFloorCleared(s, c);
    expect(s.paragon.checkpoint).toBe(1);
    expect(s.combat.monsterId, "Toggle aus ⇒ kein Auto-Start").toBe(null);
    expect(s.combat.paragonFloor).toBeUndefined();
  });

  it("Toggle AN: Etagen-Clear startet sofort die nächste Etage (Rotation, Checkpoint, frische HP)", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    unlockTower(s, c);
    s.settings.autoParagonAscend = true;
    s.combat.paragonFloor = 1;
    s.combat.monsterId = POOL[0]!;
    onParagonFloorCleared(s, c);
    expect(s.paragon.checkpoint).toBe(1);
    expect(s.combat.paragonFloor, "nächste Etage läuft bereits").toBe(2);
    expect(s.combat.monsterId).toBe(POOL[1]);
    expect(s.combat.enemyHp).toBe(paragonScaledMonster(c, 2)!.maxHp);
  });

  it("Integration: der Kampf-Loop chained mehrere Etagen ohne manuellen Neustart", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    s.settings.autoParagonAscend = true;
    expect(startParagonFloor(s, c)).toBe(true);
    let guard = 0;
    while (s.paragon.checkpoint < 3 && s.stats.deaths === 0 && guard++ < 900) advance(s, c, 1000);
    expect(s.stats.deaths, "BiS-99 stirbt unten nicht").toBe(0);
    expect(s.paragon.checkpoint, "mindestens 3 Etagen am Stück gecleart").toBeGreaterThanOrEqual(3);
    // Invariante der Kette: nach jedem Clear läuft sofort checkpoint+1 (keine Pausen-Lücke).
    expect(s.combat.paragonFloor).toBe(s.paragon.checkpoint + 1);
    expect(s.combat.monsterId).not.toBe(null);
  });

  it("Tod bricht die Kette: Reset greift, KEIN Auto-Neustart (auch nach weiterer Sim-Zeit)", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    s.settings.autoParagonAscend = true;
    // Weit über der Envelope-Decke (s. Envelope-Guard unten) — der Build MUSS hier sterben.
    s.paragon = { checkpoint: 60, best: 60 };
    expect(startParagonFloor(s, c)).toBe(true);
    runFloor(s, c);
    expect(s.stats.deaths, "Etage 61 tötet den BiS-Build").toBeGreaterThanOrEqual(1);
    expect(s.paragon.checkpoint, "Tod-Reset griff").toBe(0);
    expect(s.combat.monsterId, "Tod = harter Stopp — Auto-Aufstieg hängt am CLEAR-Pfad").toBe(null);
    expect(s.combat.paragonFloor).toBeUndefined();
    advance(s, c, 60_000);
    expect(s.combat.monsterId, "bleibt aus — nichts startet Etage 1 von selbst").toBe(null);
  });

  it("Manuelles Verlassen bricht die Kette: stopCombat pausiert trotz Toggle AN verlustfrei", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    s.settings.autoParagonAscend = true;
    s.paragon.checkpoint = 2;
    expect(startParagonFloor(s, c)).toBe(true);
    advance(s, c, 3_000); // mitten im Kampf …
    stopCombat(s);
    expect(s.combat.monsterId).toBe(null);
    expect(s.combat.paragonFloor).toBeUndefined();
    advance(s, c, 60_000);
    expect(s.combat.monsterId, "kein Clear ⇒ kein Auto-Start").toBe(null);
    expect(s.paragon.checkpoint, "Verlassen kostet weiter nichts").toBe(2);
  });

  it("Offline-Catch-up: Toggle AN chained auch offline (identischer Kill-Pfad — best wächst über 1)", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    s.settings.autoParagonAscend = true;
    expect(startParagonFloor(s, c)).toBe(true);
    advance(s, c, 2 * 3_600_000, { offline: true });
    // Anders als der Offline-Neutralitäts-Guard unten (Toggle AUS ⇒ exakt 1 Etage): die Kette
    // läuft offline weiter, bis Tod/Patt/Zeitende sie bricht. `best` ist tod-fest und beweist
    // die Mehr-Etagen-Kette unabhängig davon, ob der Build unterwegs gestorben ist.
    expect(s.paragon.best, "mehrere Etagen offline gecleart").toBeGreaterThan(1);
  });
});

describe("Paragonturm — Tod-Reset, Rekord, Offline, Envelope", () => {
  it("GUARD Tod im Turm = Reset auf Etage 1 (checkpoint 0); Rekord best bleibt", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    // Hoch im Turm (Etage 61 — weit über der Envelope-Decke) MUSS der Build sterben.
    s.paragon = { checkpoint: 60, best: 60 };
    expect(startParagonFloor(s, c)).toBe(true);
    expect(s.combat.paragonFloor).toBe(61);
    runFloor(s, c);
    expect(s.stats.deaths, "Etage 61 tötet den BiS-Build").toBe(1);
    expect(s.paragon.checkpoint, "Tod = kompletter Reset auf Etage 1").toBe(0);
    expect(s.paragon.best, "Prestige-Rekord bleibt").toBe(60);
    expect(s.combat.paragonFloor).toBeUndefined();
    expect(s.combat.monsterId).toBe(null);
    // Neustart beginnt unten.
    expect(startParagonFloor(s, c)).toBe(true);
    expect(s.combat.paragonFloor).toBe(1);
  });

  it("Tod AUSSERHALB des Turms berührt den Checkpoint nicht (resetParagonOnDeath ist No-op)", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    s.paragon = { checkpoint: 9, best: 20 };
    resetParagonOnDeath(s); // kein paragonFloor gesetzt
    expect(s.paragon).toEqual({ checkpoint: 9, best: 20 });
  });

  it("GUARD Rekord-Monotonie: Wieder-Aufstieg nach Tod senkt best nie", () => {
    const c = paragonContent();
    const s = createGame({ name: "X" }, c, 1);
    s.paragon = { checkpoint: 0, best: 37 };
    s.combat.paragonFloor = 1;
    s.combat.monsterId = POOL[0]!;
    onParagonFloorCleared(s, c); // Etage 1 nach Tod-Reset gecleart
    expect(s.paragon.checkpoint).toBe(1);
    expect(s.paragon.best).toBe(37); // Rekord unangetastet
  });

  it("GUARD Offline-Neutralität: der Catch-up beendet höchstens die LAUFENDE Etage, startet nie die nächste", () => {
    const c = paragonContent();
    const s = fighter(c);
    unlockTower(s, c);
    expect(startParagonFloor(s, c)).toBe(true);
    // 2 h Offline-Catch-up: Etage 1 wird fertig gekämpft (Clear), danach Leerlauf.
    advance(s, c, 2 * 3_600_000, { offline: true });
    expect(s.paragon.checkpoint, "genau EINE Etage offline beendet").toBe(1);
    expect(s.combat.monsterId).toBe(null);
    expect(s.combat.paragonFloor).toBeUndefined();
    // Weitere Offline-Zeit ändert nichts mehr (kein Auto-Chaining).
    advance(s, c, 2 * 3_600_000, { offline: true });
    expect(s.paragon.checkpoint).toBe(1);
    expect(s.combat.monsterId).toBe(null);
  });

  it("GUARD Envelope: der BiS-99-Build cleart unten, bricht aber an einer ENDLICHEN Etage (Tod/Patt)", () => {
    const c = paragonContent();
    // Geometrische Sonde statt Voll-Aufstieg (Laufzeit): je Etage frischer BiS-Build,
    // Checkpoint direkt gesetzt. „Bricht" = Tod ODER Stalemate-Stopp (TTK-Bruch, Spec §7).
    const probes = [1, 5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 80];
    let breakFloor: number | null = null;
    for (const f of probes) {
      const s = fighter(c);
      unlockTower(s, c);
      s.paragon = { checkpoint: f - 1, best: f - 1 }; // Aufstieg bis hierher simuliert
      expect(startParagonFloor(s, c)).toBe(true);
      runFloor(s, c);
      const died = s.stats.deaths > 0;
      const stalled = s.combat.stopReason === "stalemate";
      if (f === 1) {
        expect(died || stalled, "Etage 1 muss für BiS-99 clearbar sein").toBe(false);
        expect(s.paragon.checkpoint).toBe(1);
      }
      if (died || stalled) {
        breakFloor = f;
        if (died) {
          expect(s.paragon.checkpoint, "Tod-Reset griff").toBe(0);
          expect(s.paragon.best, "Rekord blieb").toBe(f - 1);
        }
        break;
      }
      expect(s.paragon.checkpoint, `Etage ${f} gecleart`).toBe(f);
    }
    expect(breakFloor, "es gibt ein endliches N, an dem der BiS-Build bricht (Chef-Leitplanke: bis ans Limit)").not.toBe(null);
    expect(breakFloor!).toBeGreaterThan(1);
  });
});
