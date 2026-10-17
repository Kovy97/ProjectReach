import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, MonsterDef, SlayerMasterDef, SlayerTask } from "@hearthforge/shared";
import { SLAYER_SKIP_FREE_BELOW_LEVEL, SLAYER_STREAK_POINT_INTERVAL } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import {
  TOWER_TASK_LEVEL_MAX_UNDER,
  STRETCH_UP_MAX,
  WORLD_TASK_LEVEL_MAX_OVER,
  assignTask,
  buySlayerShopItem,
  campFreeSkipAvailable,
  canFightMonster,
  effectiveSkipCost,
  getAvailableMasters,
  getSlayerLevel,
  recordKillForSlayer,
  rerollTask,
  scaledTaskPoints,
  skipTask,
  slayerRequirementMet,
  spendSlayerPoints,
  stretchLevelWindow,
  TOWER_FLOOR_POINTS_MULT,
  towerTaskPointsMult,
  unlockedTowerFloors,
  worldTaskMonsters,
} from "./slayer";
import { isItemDiscovered, itemCount } from "./inventory";

/** Setzt alle Kampf-Fertigkeiten auf ein Level → combatLevel == lvl (siehe dungeon.combatLevel). */
function setCombatLevel(s: ReturnType<typeof createGame>, lvl: number): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
}

function setSlayerLevel(s: ReturnType<typeof createGame>, lvl: number): void {
  s.skills["slayer"] = { xp: xpForLevel(lvl) };
}

const mob = (id: string, over: Partial<MonsterDef> = {}): MonsterDef => ({
  id,
  name: id,
  level: 1,
  maxHp: 10,
  damage: 1,
  accuracy: 1,
  evasion: 1,
  defense: 1,
  attackIntervalMs: 2000,
  xp: 10,
  gold: 1,
  loot: [],
  ...over,
});

/**
 * Synthetisches Content-Fixture mit VOLL kontrollierter Monster-Tabelle, damit der DYNAMISCHE
 * Welt-Task-Pool (worldTaskMonsters: Level-Fenster über dem Spieler) deterministisch testbar ist.
 * Welt-Mobs tragen alle xp 20 (→ exakte Pro-Kill-/Reward-Mathematik), Tower-Mobs sind über
 * `slayerFloor`/`zone: "slayer_tower"` markiert und fallen damit aus dem Welt-Pool.
 */
const tc: ContentDB = {
  ...content,
  items: {
    ...content.items,
    test_nose: { id: "test_nose", name: "Nose Clip", type: "material", stackable: true },
    test_helm: {
      id: "test_helm",
      name: "Slayer Helm",
      type: "equipment",
      stackable: false,
      slot: "helmet",
      slayerHelm: true,
    },
  },
  monsters: {
    w2: mob("w2", { level: 2, xp: 20 }),
    w6: mob("w6", { level: 6, xp: 20 }),
    w8: mob("w8", { level: 8, xp: 20 }),
    w10: mob("w10", { level: 10, xp: 20 }),
    w13: mob("w13", { level: 13, xp: 20 }),
    w40: mob("w40", { level: 40, xp: 20 }),
    w_req: mob("w_req", { level: 30, xp: 20, slayerRequirement: "test_nose" }),
    sl_t1: mob("sl_t1", { level: 5, slayerFloor: 1, zone: "slayer_tower" }),
    sl_t2: mob("sl_t2", { level: 25, slayerFloor: 2, zone: "slayer_tower" }),
  },
  slayerMasters: [
    // Welt-Master (towerTaskChance 0 → immer Welt-Task), taskPool LEER (dynamisch ersetzt).
    // Fix-Spanne (min == max) → scaledTaskPoints == basePoints (exakte Reward-Mathematik).
    { id: "warden", name: "Warden", unlock: { combatLevel: 1, slayerLevel: 1 }, taskPool: [], towerTaskChance: 0, taskAmount: { min: 3, max: 3 }, basePoints: 5, skipCost: 10 },
    // Tower-Master (towerTaskChance 1 → immer Tower, solange möglich).
    { id: "tower_master", name: "Tower", unlock: { combatLevel: 1, slayerLevel: 1 }, taskPool: [], towerTaskChance: 1, taskAmount: { min: 2, max: 2 }, basePoints: 8, skipCost: 15 },
    // Hoch gegateter Master (für Unlock-Tests).
    { id: "high_master", name: "High", unlock: { combatLevel: 50, slayerLevel: 40 }, taskPool: [], towerTaskChance: 0, taskAmount: { min: 1, max: 1 }, basePoints: 20, skipCost: 30 },
    // Spannen-Master für die Punkte-Skalierung (Welle GG V1): min ≠ max → pointReward variiert.
    { id: "scaler", name: "Scaler", unlock: { combatLevel: 1, slayerLevel: 1 }, taskPool: [], towerTaskChance: 0, taskAmount: { min: 10, max: 30 }, basePoints: 10, skipCost: 10 },
  ],
  slayerTower: [
    { floor: 1, name: "F1", slayerLevelRequired: 1, monsters: ["sl_t1"] },
    { floor: 2, name: "F2", slayerLevelRequired: 20, monsters: ["sl_t2"] },
  ],
};

describe("slayer — Content: genau EIN Slayer-Master, früh verfügbar", () => {
  it("content liefert exakt einen Master mit niedrigem Unlock und leerem (dynamischem) taskPool", () => {
    const masters = content.slayerMasters ?? [];
    expect(masters.length).toBe(1);
    const m = masters[0]!;
    expect(m.unlock.combatLevel).toBeLessThanOrEqual(1);
    expect(m.unlock.slayerLevel).toBeLessThanOrEqual(1);
    // taskPool wird vom dynamischen Algorithmus ersetzt → bewusst leer.
    expect(m.taskPool).toEqual([]);
    // Der eine Master ist für einen frischen Char sofort verfügbar.
    const s = createGame({ name: "X" }, content, 1);
    expect(getAvailableMasters(s, content).map((x) => x.id)).toContain(m.id);
  });
});

describe("slayer — Verfügbarkeit & Unlock", () => {
  it("getAvailableMasters respektiert combat- UND slayer-Level-Gate", () => {
    const s = createGame({ name: "X" }, content, 1);
    let ids = getAvailableMasters(s, tc).map((m) => m.id);
    expect(ids).toContain("warden");
    expect(ids).not.toContain("high_master"); // L1 < Unlock 50/40

    setCombatLevel(s, 50);
    setSlayerLevel(s, 40);
    ids = getAvailableMasters(s, tc).map((m) => m.id);
    expect(ids).toContain("high_master");
  });

  it("assignTask gibt null für einen nicht freigeschalteten Master", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(assignTask(s, tc, "high_master")).toBeNull();
    expect(s.slayerTask).toBeNull();
  });

  it("unlockedTowerFloors ist slayer-level-gated (1/20)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(getSlayerLevel(s)).toBe(1);
    expect(unlockedTowerFloors(s, tc).map((f) => f.floor)).toEqual([1]);
    setSlayerLevel(s, 20);
    expect(unlockedTowerFloors(s, tc).map((f) => f.floor)).toEqual([1, 2]);
  });
});

describe("slayer — dynamischer Welt-Task-Pool (Level-Fenster über dem Spieler)", () => {
  it("worldTaskMonsters: nur Mobs ein paar Stufen ÜBER dem Spieler (keine Low-Level, keine Tower)", () => {
    const s = createGame({ name: "X" }, content, 1);
    setCombatLevel(s, 5); // Fenster [6..13] — 4 Kandidaten drin → KEINE Streckung (Welle GG V3)
    const pool = worldTaskMonsters(s, tc).slice().sort();
    expect(pool).toEqual(["w10", "w13", "w6", "w8"].sort());
    // w2 (zu niedrig), w40 (zu hoch), w_req (Lvl 30, zu hoch), Tower-Mobs → NICHT im Pool.
    expect(pool).not.toContain("w2");
    expect(pool).not.toContain("w40");
    expect(pool).not.toContain("sl_t1");
  });

  it("worldTaskMonsters: Pool < 4 im Fenster → untere Kante streckt sich runter bis 4 (Welle GG V3)", () => {
    const s = createGame({ name: "X" }, content, 1);
    setCombatLevel(s, 11); // Fenster [12..19]: nur w13 drin (1 < 4)
    // Streckung: lo 12→6 holt w10, w8, w6 dazu (leichtere zuerst); hi bleibt 19 (w40 draußen).
    const pool = worldTaskMonsters(s, tc).slice().sort();
    expect(pool).toEqual(["w10", "w13", "w6", "w8"].sort());
    expect(pool).not.toContain("w40");
  });

  it("worldTaskMonsters: Endgame-Spieler über allen Mobs → Fenster streckt bis 4 Kandidaten (nie leer)", () => {
    const s = createGame({ name: "X" }, content, 1);
    setCombatLevel(s, 99); // Fenster [100..107] — kein Mob so hoch
    // Welle GG V3: statt des alten 1er-„nächstgelegen"-Fallbacks (immer nur w40) streckt sich die
    // untere Kante, bis 4 Kandidaten drinliegen → Task-Vielfalt am Level-Cap.
    const pool = worldTaskMonsters(s, tc).slice().sort();
    expect(pool).toEqual(["w10", "w13", "w40", "w8"].sort());
  });

  it("assignTask zieht Welt-Monster ausschließlich aus dem Level-Fenster", () => {
    const s = createGame({ name: "X" }, content, 7);
    setCombatLevel(s, 5); // Fenster [6..13] — 4 Kandidaten → ungestreckt (Welle GG V3 greift nicht)
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const t = assignTask(s, tc, "warden")!;
      expect(t.isTower).toBe(false);
      const lvl = tc.monsters[t.monsterId]!.level;
      expect(lvl).toBeGreaterThan(5); // immer ÜBER dem Spieler
      expect(lvl).toBeLessThanOrEqual(13); // innerhalb des Fensters
      seen.add(t.monsterId);
      s.slayerTask = null;
    }
    expect(seen.size).toBeGreaterThan(1); // RNG streut über das Fenster
  });

  it("assignTask-Belohnung beim Assign fix: xpReward = round(xp*0.5*N), pointReward = basePoints bei Fix-Spanne", () => {
    const s = createGame({ name: "X" }, content, 3);
    setCombatLevel(s, 5);
    const t = assignTask(s, tc, "warden")!;
    expect(t.isTower).toBe(false);
    expect(t.required).toBe(3);
    const xp = tc.monsters[t.monsterId]!.xp; // 20
    expect(t.xpReward).toBe(Math.round(xp * 0.5 * 3)); // 30
    // warden hat eine FIX-Spanne (3..3) → Punkte-Skalierung (Welle GG V1) ist exakt ×1 = basePoints.
    expect(t.pointReward).toBe(5);
    expect(assignTask(s, tc, "warden")).toBeNull(); // schon ein Task aktiv
  });
});

describe("slayer — Punkte-Skalierung nach Task-Größe (Welle GG V1)", () => {
  it("scaledTaskPoints: sanft linear um das Spannen-Mittel (Mitte = basePoints, min 1)", () => {
    // Brenna-Profil: 15..50, basePoints 5 → Mitte 32.5.
    const brenna = { taskAmount: { min: 15, max: 50 }, basePoints: 5 } as SlayerMasterDef;
    expect(scaledTaskPoints(brenna, 15)).toBe(4); // round(5 · (0.5 + 0.5·15/32.5)) = round(3.65)
    expect(scaledTaskPoints(brenna, 32)).toBe(5); // ~Mitte → basePoints
    expect(scaledTaskPoints(brenna, 50)).toBe(6); // round(5 · 1.269) = round(6.35)
    // Fix-Spanne → exakt basePoints; Untergrenze 1 (nie 0 Punkte für einen echten Task).
    const fix = { taskAmount: { min: 3, max: 3 }, basePoints: 5 } as SlayerMasterDef;
    expect(scaledTaskPoints(fix, 3)).toBe(5);
    const tiny = { taskAmount: { min: 10, max: 30 }, basePoints: 1 } as SlayerMasterDef;
    expect(scaledTaskPoints(tiny, 10)).toBe(1); // round(1 · 0.75) = 1 ≥ min 1
  });

  it("assignTask stempelt den skalierten pointReward (min ≠ max ⇒ variiert mit N)", () => {
    const s = createGame({ name: "X" }, content, 13);
    setCombatLevel(s, 5);
    const master = tc.slayerMasters!.find((m) => m.id === "scaler")!;
    const seen = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const t = assignTask(s, tc, "scaler")!;
      expect(t.pointReward).toBe(scaledTaskPoints(master, t.required));
      seen.add(t.pointReward);
      s.slayerTask = null;
    }
    expect(seen.size).toBeGreaterThan(1); // die Spanne 10..30 erzeugt echte Punkt-Varianz
  });

  it("Bestandsschutz: ein laufender Task behält seine beim Assign gerollten Werte", () => {
    // Die Skalierung lebt NUR in assignTask — ein bereits gespeicherter Task (Alt-Werte) wird
    // von recordKillForSlayer unverändert ausgezahlt (kein Neuberechnen).
    const s = createGame({ name: "X" }, content, 9);
    s.slayerTask = {
      masterId: "warden",
      monsterId: "w8",
      isTower: false,
      required: 1,
      progress: 0,
      xpReward: 10,
      pointReward: 99, // gerollter Alt-Wert — muss exakt so ausgezahlt werden
    };
    expect(recordKillForSlayer(s, tc, "w8")).toBe(true);
    expect(s.slayerPoints).toBe(99);
  });
});

describe("slayer — Endgame-Pool-Streckung (Welle GG V3, stretchLevelWindow)", () => {
  it("genug Kandidaten im Fenster → Fenster unverändert (No-op)", () => {
    expect(stretchLevelWindow([6, 8, 10, 13], 6, 13, 4)).toEqual({ lo: 6, hi: 13 });
  });

  it("streckt ERST die obere Kante hoch (bis STRETCH_UP_MAX), dann die untere runter (Chef-Test 25.08.2026)", () => {
    // [2,8,10,13,40], Fenster [6..13] (3 drin) → hi hoch bis zur Kappe 13+8=21 findet nichts (w40 liegt
    // darüber), dann lo runter bis 2 holt w2 als Vierten. Vorher andersherum (lo zuerst), was bei
    // CL 35–39 die L19-Turm-Goblins in den Pool holte (design/slayer-auftraege-1.1.0.md §2).
    expect(stretchLevelWindow([2, 8, 10, 13, 40], 6, 13, 4)).toEqual({ lo: 2, hi: 13 + STRETCH_UP_MAX });
    // Kappe greift: liegt ein Kandidat knapp über der Kappe, wird erst unten gesucht.
    expect(stretchLevelWindow([2, 8, 10, 13, 22], 6, 13, 4)).toEqual({ lo: 2, hi: 21 });
    // Innerhalb der Kappe wird nach oben gefunden, bevor es nach unten geht.
    expect(stretchLevelWindow([2, 8, 10, 13, 18], 6, 13, 4)).toEqual({ lo: 6, hi: 18 });
    // Untere Kante erschöpft (lo schon am Minimum) → obere Kante wächst.
    expect(stretchLevelWindow([10, 50], 1, 20, 2)).toEqual({ lo: 1, hi: 50 });
  });

  it("Pool erschöpft: weniger Kandidaten als minPool → Fenster deckt alle ab und stoppt", () => {
    expect(stretchLevelWindow([7, 9], 20, 28, 4)).toEqual({ lo: 7, hi: 28 });
    expect(stretchLevelWindow([], 20, 28, 4)).toEqual({ lo: 20, hi: 28 }); // leer = No-op
  });

  it("deterministisch: identische Eingaben → identisches Fenster (kein RNG, kein State)", () => {
    const a = stretchLevelWindow([2, 6, 8, 10, 13, 40], 100, 107, 4);
    const b = stretchLevelWindow([2, 6, 8, 10, 13, 40], 100, 107, 4);
    expect(a).toEqual(b);
    expect(a).toEqual({ lo: 8, hi: 107 }); // lo wandert bis 4 Kandidaten (8,10,13,40) drinliegen
  });

  it("Turm-Pfad: Kappe streckt sich hoch, wenn < 4 bekämpfbare Turm-Kandidaten drunter liegen", () => {
    // CL 10 → Basis-Kappe 18: sl_t1 (5) liegt drunter, sl_t2 (25) drüber — nur 1 Kandidat < 4.
    // Streckung hebt die Kappe bis 25 → BEIDE Etagen-Mobs sind zuweisbar (Task-Vielfalt).
    const s = createGame({ name: "X" }, content, 21);
    setSlayerLevel(s, 25); // beide Etagen frei
    setCombatLevel(s, 10);
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const t = assignTask(s, tc, "tower_master")!;
      expect(t.isTower).toBe(true);
      seen.add(t.monsterId);
      s.slayerTask = null;
    }
    expect(seen.has("sl_t1")).toBe(true);
    expect(seen.has("sl_t2")).toBe(true);
  });
});

describe("slayer — Turm-Unterkante (Welle LL, Fun-RETEST slayer-vesna)", () => {
  // ECHTER Content (reale Turm-Etagen L3–96) + synthetischer Immer-Turm-Master: die Vesna-
  // Beschwerde („CL 96 zieht Etage-1/2-Trivial-Tasks") ist nur gegen die echte Etagen-Staffelung
  // beweisbar. Requirement-Items (plague_mask …) liegen in der Bank — Besitz genügt (idle-fair),
  // damit ALLE Etagen-Monster Kandidaten sind und die strikte Fenster-Mathematik greift.
  const llMaster: SlayerMasterDef = {
    id: "ll_tower_master",
    name: "LL",
    unlock: { combatLevel: 1, slayerLevel: 1 },
    taskPool: [],
    towerTaskChance: 1,
    taskAmount: { min: 5, max: 10 },
    basePoints: 5,
    skipCost: 10,
  };
  const rc: ContentDB = { ...content, slayerMasters: [...(content.slayerMasters ?? []), llMaster] };

  it("CL 96: alle Turm-Tasks liegen im Fenster [CL−20 .. CL+8] — keine Trivial-Etagen (L<50) mehr", () => {
    const s = createGame({ name: "X" }, rc, 13);
    setCombatLevel(s, 96);
    setSlayerLevel(s, 99); // alle 5 Etagen frei
    for (const req of ["plague_mask", "mirror_ward", "ear_plugs", "soul_veil", "void_anchor"]) {
      expect(rc.items[req], `Requirement-Item ${req} fehlt im Content`).toBeDefined();
      s.bank[req] = 1;
    }
    const levels = new Set<number>();
    for (let i = 0; i < 120; i++) {
      const t = assignTask(s, rc, "ll_tower_master")!;
      expect(t.isTower).toBe(true);
      const lvl = rc.monsters[t.monsterId]!.level;
      levels.add(lvl);
      // Chef-Test 25.08.2026: Unterkante jetzt CL−3 (=93); die Streckung nach unten darf sie für die
      // Pool-Mindestgröße wieder senken (real: soul_flayer L86), aber nie in Trivial-Etagen (<76,
      // die alte Unterkante). Nach oben höchstens CL+8+STRETCH_UP_MAX.
      expect(lvl, `Trivial-Ziel ${t.monsterId} (L${lvl})`).toBeGreaterThanOrEqual(96 - 20);
      expect(lvl).toBeLessThanOrEqual(96 + WORLD_TASK_LEVEL_MAX_OVER + STRETCH_UP_MAX);
      s.slayerTask = null;
    }
    expect(levels.size, "echte Verteilung über die Spitzen-Etagen, kein 1er-Pool").toBeGreaterThanOrEqual(2);
  });

  it("Low-Level unverändert: CL 5 (nur Etage 1 frei) zieht weiterhin Etage-1-Mobs — Unterkante bleibt 0", () => {
    const s = createGame({ name: "X" }, rc, 13);
    setCombatLevel(s, 5); // Slayer 1 → nur Etage 1 frei; baseLo = max(0, 5−20) = 0 wie vor Welle LL
    for (let i = 0; i < 40; i++) {
      const t = assignTask(s, rc, "ll_tower_master")!;
      expect(t.isTower).toBe(true);
      expect(rc.monsters[t.monsterId]!.slayerFloor).toBe(1);
      s.slayerTask = null;
    }
  });

  it("Pool-Sicherheit: CL 96 mit NUR Etage 1 frei — die Streckung senkt die Unterkante wieder, ein Task kommt", () => {
    const s = createGame({ name: "X" }, rc, 13);
    setCombatLevel(s, 96); // Slayer 1: Fenster [76..104] ist leer → stretchLevelWindow geht runter
    // Chef-Test 25.08.2026: hat der Turm keinen Kandidaten auf Niveau (≥ CL−3), kommt ein
    // WELT-Auftrag, solange die Welt welche hat — kein unterlevelter Etage-1-Auftrag mehr.
    const t = assignTask(s, rc, "ll_tower_master")!;
    expect(t).not.toBeNull();
    expect(t.isTower, "Turm unter Niveau → Welt-Auftrag").toBe(false);
    // Ist auch die Welt leer (alle Zonen quest-gesperrt), greift die Streckung: Etage-1-Auftrag
    // statt gar keinem (Pool-Mindestgröße geht vor Härte, kein Soft-Lock).
    const rcGesperrt: ContentDB = { ...rc, zones: rc.zones.map((z) => ({ ...z, requiresQuest: "quest_niemals" })) };
    const s2 = createGame({ name: "X" }, rcGesperrt, 13);
    setCombatLevel(s2, 96);
    const t2 = assignTask(s2, rcGesperrt, "ll_tower_master")!;
    expect(t2).not.toBeNull();
    expect(t2.isTower).toBe(true);
    expect(rcGesperrt.monsters[t2.monsterId]!.slayerFloor, "Pool-Mindestgröße geht vor Härte").toBe(1);
  });
});

describe("slayer — Etagen-Los nach Kandidatenzahl gewichtet (Welle NN, Fun-Sweep R3 slayer-vesna)", () => {
  // Vesna R3, 200 Ziehungen bei CL 96: Etage 4 hat im Fenster [76..104] genau EIN Monster
  // (bone_colossus L76) — als GLEICHVERTEILTES Etagen-Los war das so wahrscheinlich wie die
  // 5-köpfige Etage 5 → 26 % ALLER Tasks (49,5 % der Turm-Tasks) auf einem einzigen Kopf.
  // Fix: P(Etage) ∝ Kandidatenzahl == flaches Los über den vereinigten Kandidaten-Pool.
  const nnMaster: SlayerMasterDef = {
    id: "nn_tower_master",
    name: "NN",
    unlock: { combatLevel: 1, slayerLevel: 1 },
    taskPool: [],
    towerTaskChance: 1,
    taskAmount: { min: 5, max: 10 },
    basePoints: 5,
    skipCost: 10,
  };
  const rc: ContentDB = { ...content, slayerMasters: [...(content.slayerMasters ?? []), nnMaster] };

  /** Endgame-Stand wie im Welle-LL-Block: CL 96, alle Etagen frei, Requirement-Items in der Bank. */
  function endgameState(c: ContentDB, seed: number): ReturnType<typeof createGame> {
    const s = createGame({ name: "X" }, c, seed);
    setCombatLevel(s, 96);
    setSlayerLevel(s, 99);
    for (const req of ["plague_mask", "mirror_ward", "ear_plugs", "soul_veil", "void_anchor"]) {
      expect(c.items[req], `Requirement-Item ${req} fehlt im Content`).toBeDefined();
      s.bank[req] = 1;
    }
    return s;
  }

  it("ECHTER Content, CL 96, Turm-only: der 1-Kandidaten-Etage-4-Kopf fällt von ~50 % auf ~1/Pool der Turm-Ziehungen", () => {
    const s = endgameState(rc, 17);
    // Erwarteter Turm-Kandidaten-Pool: Fenster [CL−3 .. CL+8], gestreckt wie in der Engine
    // (unabhängig vom RNG berechnet). Chef-Test 25.08.2026: bone_colossus (L76) liegt seit der
    // Unterkante CL−3 NICHT mehr im Pool — die Streckung endet bei soul_flayer (L86), sobald ≥ 4
    // Kandidaten drin sind. Der Sinn des Tests (Etagen-Los ∝ Kandidatenzahl) bleibt.
    const alleTurm = (rc.slayerTower ?? []).flatMap((f) => f.monsters);
    const win = stretchLevelWindow(alleTurm.map((m) => rc.monsters[m]!.level), 96 - TOWER_TASK_LEVEL_MAX_UNDER, 96 + WORLD_TASK_LEVEL_MAX_OVER, 4);
    const towerPool = alleTurm.filter((m) => rc.monsters[m]!.level >= win.lo && rc.monsters[m]!.level <= win.hi);
    expect(towerPool).not.toContain("bone_colossus");
    expect(towerPool.length).toBeGreaterThanOrEqual(4); // reale Endgame-Spitze: Etage 5 (+ Etage-4-Spitze)

    const N = 300;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const t = assignTask(s, rc, "nn_tower_master")!;
      expect(t.isTower).toBe(true);
      // Trivial-Schutz (Welle LL) bleibt: keine Ziehung unter Etage 4.
      expect(rc.monsters[t.monsterId]!.slayerFloor!).toBeGreaterThanOrEqual(4);
      counts.set(t.monsterId, (counts.get(t.monsterId) ?? 0) + 1);
      s.slayerTask = null;
    }
    // JEDER Fenster-Kandidat kommt vor (flaches Los über den vereinigten Pool) …
    for (const m of towerPool) {
      expect(counts.get(m) ?? 0, `Kandidat ${m} nie gezogen`).toBeGreaterThan(0);
    }
    // … und kein Kopf dominiert: jeder liegt bei ~1/|Pool| statt ~50 % (Altstand: Etagen-Los 50/50).
    for (const [m, n] of counts) {
      expect(n / N, `${m} dominiert die Turm-Ziehungen`).toBeLessThan(0.3);
      expect(n / N).toBeGreaterThan(0.05);
    }
  });

  it("ECHTER Content, CL 96, echter Master (Brenna): kein Monster > 15 % der Ziehungen (Pool ≥ 8)", () => {
    const s = endgameState(content, 23);
    // Vereinigter Kandidaten-Pool (Turm-Fenster + dynamischer Welt-Pool), unabhängig berechnet.
    const alleTurm = (content.slayerTower ?? []).flatMap((f) => f.monsters);
    const win = stretchLevelWindow(alleTurm.map((m) => content.monsters[m]!.level), 96 - TOWER_TASK_LEVEL_MAX_UNDER, 96 + WORLD_TASK_LEVEL_MAX_OVER, 4);
    const towerPool = alleTurm.filter((m) => content.monsters[m]!.level >= win.lo && content.monsters[m]!.level <= win.hi);
    const pool = new Set([...towerPool, ...worldTaskMonsters(s, content)]);
    expect(pool.size, "Verteilungs-Schwelle gilt nur ab 8 Kandidaten").toBeGreaterThanOrEqual(8);

    const master = (content.slayerMasters ?? [])[0]!;
    // N groß genug, dass das Stichproben-Rauschen die 15-%-Schwelle nicht streift (Welt-Pool des
    // frischen Saves = 4 quest-freie Starter-Mobs à ~12,5 % Erwartung; sd bei N=1200 ≈ 1 %).
    const N = 1200;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const t = assignTask(s, content, master.id)!;
      if (t.isTower) {
        expect(content.monsters[t.monsterId]!.slayerFloor!).toBeGreaterThanOrEqual(4); // 0 % Trivial
      }
      counts.set(t.monsterId, (counts.get(t.monsterId) ?? 0) + 1);
      s.slayerTask = null;
    }
    for (const [m, n] of counts) {
      expect(n / N, `${m} stellt ${((n / N) * 100).toFixed(1)} % aller Ziehungen`).toBeLessThanOrEqual(0.15);
    }
    // Chef-Test 25.08.2026: bone_colossus (L76) liegt bei CL 96 nicht mehr im Turm-Fenster (Unterkante CL−3).
    expect(counts.get("bone_colossus") ?? 0, "bone_colossus (L76) ist bei CL 96 kein Ziel mehr").toBe(0);
  });

  it("Gewichtungs-Mathematik: 1-Kandidaten-Etage vs 3-Kandidaten-Etage → jedes Monster ~1/4 (nicht 50 % für den Solisten)", () => {
    // Synthetisch, exakt kontrolliert: Etage 1 = 1 Kandidat, Etage 2 = 3 Kandidaten, alle im Fenster.
    const wc: ContentDB = {
      ...tc,
      monsters: {
        ...tc.monsters,
        nn_solo: mob("nn_solo", { level: 24, slayerFloor: 1, zone: "slayer_tower" }),
        nn_a: mob("nn_a", { level: 26, slayerFloor: 2, zone: "slayer_tower" }),
        nn_b: mob("nn_b", { level: 28, slayerFloor: 2, zone: "slayer_tower" }),
        nn_c: mob("nn_c", { level: 30, slayerFloor: 2, zone: "slayer_tower" }),
      },
      slayerTower: [
        { floor: 1, name: "N1", slayerLevelRequired: 1, monsters: ["nn_solo"] },
        { floor: 2, name: "N2", slayerLevelRequired: 1, monsters: ["nn_a", "nn_b", "nn_c"] },
      ],
    };
    const s = createGame({ name: "X" }, wc, 7);
    setCombatLevel(s, 22); // Fenster [2..30] — alle 4 Kandidaten drin, keine Streckung
    const N = 800;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const t = assignTask(s, wc, "tower_master")!; // tc-Master: towerTaskChance 1
      expect(t.isTower).toBe(true);
      counts.set(t.monsterId, (counts.get(t.monsterId) ?? 0) + 1);
      s.slayerTask = null;
    }
    // Flach über den vereinigten Pool: jeder der 4 Kandidaten ~25 %. Altstand: nn_solo ~50 %
    // (Etagen-Los 50/50), Rest je ~16,7 % — die Schranken trennen beide Welten deutlich.
    for (const m of ["nn_solo", "nn_a", "nn_b", "nn_c"]) {
      const share = (counts.get(m) ?? 0) / N;
      expect(share, `${m}: ${(share * 100).toFixed(1)} %`).toBeGreaterThan(0.15);
      expect(share, `${m}: ${(share * 100).toFixed(1)} %`).toBeLessThan(0.35);
    }
  });

  it("Low-Level unverändert: EINE brauchbare Etage (CL 5) → gleichverteilt über deren Kandidaten wie vor Welle NN", () => {
    // Mit nur einer brauchbaren Etage ist der neue Pfad bit-identisch zum Altstand (gleiche
    // Draw-Anzahl, Monster-Wurf sieht denselben RNG-Zustand) — hier der statistische Beleg
    // gegen echten Content: alle Ziehungen Etage 1, Verteilung gleichmäßig über die Kandidaten.
    const s = createGame({ name: "X" }, rc, 13);
    setCombatLevel(s, 5); // Slayer 1 → nur Etage 1 frei
    const N = 240;
    const counts = new Map<string, number>();
    for (let i = 0; i < N; i++) {
      const t = assignTask(s, rc, "nn_tower_master")!;
      expect(t.isTower).toBe(true);
      expect(rc.monsters[t.monsterId]!.slayerFloor).toBe(1);
      counts.set(t.monsterId, (counts.get(t.monsterId) ?? 0) + 1);
      s.slayerTask = null;
    }
    // Ohne plague_mask sind die Req-Mobs raus; das gestreckte Fenster trägt mehrere Kandidaten,
    // keiner dominiert (gleichverteilt IN der Etage — exakt das Alt-Verhalten).
    expect(counts.size).toBeGreaterThanOrEqual(3);
    for (const [m, n] of counts) {
      expect(n / N, `${m} dominiert die Einzel-Etage`).toBeLessThan(0.45);
    }
  });
});

describe("slayer — Task-Streak (Welle GG V2)", () => {
  /** Legt einen 1-Kill-Task und schließt ihn ab (Streak +1). */
  function completeTask(s: ReturnType<typeof createGame>, pointReward = 5): void {
    s.slayerTask = {
      masterId: "warden",
      monsterId: "w8",
      isTower: false,
      required: 1,
      progress: 0,
      xpReward: 0,
      pointReward,
    };
    expect(recordKillForSlayer(s, tc, "w8")).toBe(true);
  }

  it("jeder Abschluss +1; jeder 5. Task zahlt +2 Quest-Tokens (Breadcrumb mit eigener seq)", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(s.slayerStreak).toBe(0);
    expect(s.character.questTokens).toBe(0);

    for (let i = 1; i <= 4; i++) completeTask(s);
    expect(s.slayerStreak).toBe(4);
    expect(s.character.questTokens).toBe(0); // noch kein Intervall erreicht
    expect(s.lastSlayerStreakBonus).toBeNull();

    completeTask(s); // Task 5 → Token-Bonus
    expect(s.slayerStreak).toBe(5);
    expect(s.character.questTokens).toBe(2);
    expect(s.lastSlayerStreakBonus).toEqual({ streak: 5, tokens: 2, points: 0, seq: 1 });
  });

  it("jeder 10. Task zahlt ZUSÄTZLICH Bonus-Punkte (~1 Task-Äquivalent = pointReward des Tasks)", () => {
    const s = createGame({ name: "X" }, content, 1);
    for (let i = 1; i <= 9; i++) completeTask(s, 5);
    s.lastSlayerStreakBonus = null; // UI hat den 5er-Toast quittiert
    const pointsBefore = s.slayerPoints;

    completeTask(s, 7); // Task 10 → Tokens UND Punkte
    expect(s.slayerStreak).toBe(10);
    expect(s.character.questTokens).toBe(4); // 2 (Task 5) + 2 (Task 10)
    expect(s.slayerPoints - pointsBefore).toBe(7 + 7); // reguläre Gutschrift + Bonus (1 Task-Äquivalent)
    // seq kommt aus dem monotonen Zähler — trotz UI-Quittung (null) echt HÖHER als beim 5er-Bonus.
    expect(s.lastSlayerStreakBonus).toEqual({ streak: 10, tokens: 2, points: 7, seq: 2 });
    expect(s.slayerStreakSeq).toBe(2);
  });

  it("BEZAHLTER Skip bricht die Serie auf 0", () => {
    const s = createGame({ name: "X" }, content, 4);
    setCombatLevel(s, 5);
    setSlayerLevel(s, 15); // über der Gnaden-Schwelle → Skip kostet
    for (let i = 1; i <= 3; i++) completeTask(s);
    expect(s.slayerStreak).toBe(3);

    s.slayerPoints = 50;
    assignTask(s, tc, "warden");
    expect(skipTask(s, tc)).toBe(true); // kostet 10
    expect(s.slayerStreak).toBe(0);
  });

  it("Gratis-Gnade (unter SL 10) bricht die Serie NICHT", () => {
    const s = createGame({ name: "X" }, content, 4);
    setCombatLevel(s, 5);
    expect(getSlayerLevel(s)).toBeLessThan(SLAYER_SKIP_FREE_BELOW_LEVEL);
    for (let i = 1; i <= 3; i++) completeTask(s);
    expect(s.slayerStreak).toBe(3);

    const master = tc.slayerMasters!.find((m) => m.id === "warden")!;
    assignTask(s, tc, "warden");
    expect(effectiveSkipCost(s, tc, master)).toBe(0); // Gnade markiert sich als Kosten 0
    expect(skipTask(s, tc)).toBe(true); // gratis (0 Punkte nötig)
    expect(s.slayerStreak).toBe(3); // Serie überlebt
    expect(s.slayerPoints).toBe(0 + 3 * 5); // nur die regulären Task-Gutschriften, kein Abzug
  });

  it("fehlgeschlagener Skip (zu wenig Punkte) lässt die Serie stehen", () => {
    const s = createGame({ name: "X" }, content, 4);
    setCombatLevel(s, 5);
    setSlayerLevel(s, 15);
    for (let i = 1; i <= 2; i++) completeTask(s);
    s.slayerPoints = 0; // kann den Skip (10) nicht bezahlen
    assignTask(s, tc, "warden");
    expect(skipTask(s, tc)).toBe(false);
    expect(s.slayerStreak).toBe(2); // kein Effekt ohne echten Skip
  });
});

describe("slayer — assignTask Tower (Typ-Split, Etagen-Gate)", () => {
  it("towerTaskChance 1 → Tower-Task; Etagen-Gate hält Floor 2 bis Level 20 fern", () => {
    const s = createGame({ name: "X" }, content, 3);
    setCombatLevel(s, 5);
    // Nur Floor 1 frei: über viele Assigns NUR sl_t1.
    for (let i = 0; i < 40; i++) {
      const t = assignTask(s, tc, "tower_master")!;
      expect(t.isTower).toBe(true);
      expect(t.monsterId).toBe("sl_t1");
      s.slayerTask = null;
    }
    // Floor 2 frei → über viele Assigns beide Mobs (gleichverteilt über Etagen).
    // [Sweep6 W2-T4-P2-2] Turm-Pfad hat jetzt ein CL-Fenster (level ≤ CL+8) wie der Welt-Pfad;
    // CL hoch, damit sl_t2 (Level 25) überhaupt zuweisbar ist — sonst filtert die Plausibilität es raus.
    setSlayerLevel(s, 25);
    setCombatLevel(s, 25);
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      seen.add(assignTask(s, tc, "tower_master")!.monsterId);
      s.slayerTask = null;
    }
    expect(seen.has("sl_t1")).toBe(true);
    expect(seen.has("sl_t2")).toBe(true);
  });

  it("towerTaskChance 1 ohne freigeschalteten Tower fällt auf Welt-Task zurück", () => {
    const s = createGame({ name: "X" }, content, 5);
    setCombatLevel(s, 5); // Welt-Pool nicht leer (Fenster [6..13])
    const noTower: ContentDB = { ...tc, slayerTower: [] };
    const t = assignTask(s, noTower, "tower_master")!;
    expect(t.isTower).toBe(false);
    expect(tc.monsters[t.monsterId]!.level).toBeGreaterThan(5);
  });
});

describe("slayer — Pro-Kill-XP & Completion", () => {
  it("recordKillForSlayer gibt Pro-Kill-XP bei JEDEM Kill + Abschluss-Bonus obendrauf", () => {
    const s = createGame({ name: "X" }, content, 11);
    setCombatLevel(s, 5);
    setSlayerLevel(s, 40); // earlyXpMult == 1 → exakte Delta-Mathematik
    const base = s.skills["slayer"]!.xp;

    const t = assignTask(s, tc, "warden")!; // Welt-Mob, required 3, xp 20 → perKill 10
    const id = t.monsterId;
    expect(tc.monsters[id]!.xp).toBe(20);

    expect(recordKillForSlayer(s, tc, id)).toBe(false); // Kill 1
    expect(s.skills["slayer"]!.xp - base).toBe(10);
    expect(recordKillForSlayer(s, tc, id)).toBe(false); // Kill 2
    expect(s.skills["slayer"]!.xp - base).toBe(20);

    expect(recordKillForSlayer(s, tc, id)).toBe(true); // Kill 3 → Abschluss
    // 3× perKill (30) + Abschluss-Bonus xpReward (30) = 60.
    expect(s.skills["slayer"]!.xp - base).toBe(60);
    expect(s.slayerTask).toBeNull();
    expect(s.slayerPoints).toBe(5);
    expect(s.slayerTasksCompleted).toBe(1);
  });

  it("recordKill dekrementiert nur beim Ziel-Monster", () => {
    const s = createGame({ name: "X" }, content, 5);
    setCombatLevel(s, 5);
    const t = assignTask(s, tc, "warden")!;
    expect(recordKillForSlayer(s, tc, "sl_t1")).toBe(false); // falsches Monster
    expect(t.progress).toBe(0);
  });

  it("recordKill ist no-op ohne aktiven Task", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(recordKillForSlayer(s, tc, "w8")).toBe(false);
  });
});

describe("slayer — Anforderungs-Item & Hard-Block", () => {
  it("slayerRequirementMet: keine Anforderung → true", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(slayerRequirementMet(s, tc, "w8")).toBe(true);
    expect(canFightMonster(s, tc, "w8")).toBe(true);
  });

  it("Hard-Block ohne Item; Besitz (Bank) ODER ausgerüsteter Slayer-Helm erfüllt", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(slayerRequirementMet(s, tc, "w_req")).toBe(false);
    expect(canFightMonster(s, tc, "w_req")).toBe(false);

    s.bank["test_nose"] = 1; // Besitz in der Bank genügt
    expect(slayerRequirementMet(s, tc, "w_req")).toBe(true);
    expect(canFightMonster(s, tc, "w_req")).toBe(true);

    delete s.bank["test_nose"];
    expect(canFightMonster(s, tc, "w_req")).toBe(false);
    s.character.equipment.helmet = "test_helm"; // kombinierter Helm erfüllt alles
    expect(canFightMonster(s, tc, "w_req")).toBe(true);
  });

  it("recordKill zählt NICHT, solange die Anforderung nicht erfüllt ist", () => {
    const s = createGame({ name: "X" }, content, 9);
    // Task direkt setzen (assignTask wählt unter den Welt-Mobs zufällig; hier wollen wir gezielt w_req).
    const task: SlayerTask = {
      masterId: "warden",
      monsterId: "w_req",
      isTower: false,
      required: 1,
      progress: 0,
      xpReward: 10,
      pointReward: 5,
    };
    s.slayerTask = task;

    expect(recordKillForSlayer(s, tc, "w_req")).toBe(false);
    expect(task.progress).toBe(0);
    expect(s.slayerTask).not.toBeNull();

    s.bank["test_nose"] = 1;
    expect(recordKillForSlayer(s, tc, "w_req")).toBe(true); // jetzt zählt + schließt ab
    expect(s.slayerTask).toBeNull();
  });
});

describe("slayer — Skip & Punkte-Senke", () => {
  it("skipTask kostet Punkte; scheitert bei zu wenig Guthaben", () => {
    const s = createGame({ name: "X" }, content, 4);
    setCombatLevel(s, 5);
    // [Sweep6 W2-T4-P2-2] Skips sind unter Slayer-Level SLAYER_SKIP_FREE_BELOW_LEVEL (10) GRATIS
    // (Früh-Gnade). Dieser Test prüft den KOSTEN-Pfad → über die Schwelle heben.
    setSlayerLevel(s, 15);
    assignTask(s, tc, "warden"); // skipCost 10
    expect(skipTask(s, tc)).toBe(false); // 0 Punkte
    expect(s.slayerTask).not.toBeNull();

    s.slayerPoints = 12;
    expect(skipTask(s, tc)).toBe(true);
    expect(s.slayerPoints).toBe(2);
    expect(s.slayerTask).toBeNull();
  });

  it("spendSlayerPoints zieht nur bei ausreichendem Guthaben ab", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.slayerPoints = 30;
    expect(spendSlayerPoints(s, 50)).toBe(false);
    expect(s.slayerPoints).toBe(30);
    expect(spendSlayerPoints(s, 30)).toBe(true);
    expect(s.slayerPoints).toBe(0);
    expect(spendSlayerPoints(s, 0)).toBe(false);
  });
});

describe("slayer — Punkte-Shop (buySlayerShopItem)", () => {
  /** Synthetischer Shop über stabilen Real-Items — robust gegen Content-Katalog-Änderungen. */
  const shopContent: ContentDB = {
    ...content,
    slayerShop: [
      { itemId: "copper_ore", cost: 10, slayerLevelRequired: 1 },
      { itemId: "coal", cost: 25, slayerLevelRequired: 15 },
    ],
  };

  it("Kauf ok: Punkte abgezogen, Item im Inventar, Erst-Besitz entdeckt (zentraler Pfad)", () => {
    const s = createGame({ name: "X" }, shopContent, 1);
    s.slayerPoints = 12;
    expect(isItemDiscovered(s, "copper_ore")).toBe(false);
    expect(buySlayerShopItem(s, shopContent, "copper_ore")).toEqual({ ok: true });
    expect(s.slayerPoints).toBe(2);
    expect(itemCount(s.inventory, "copper_ore")).toBe(1);
    expect(isItemDiscovered(s, "copper_ore")).toBe(true); // via addItemOrBank (SAVE 58)
  });

  it("zu wenig Punkte: not_enough_points — nichts abgezogen, kein Item", () => {
    const s = createGame({ name: "X" }, shopContent, 1);
    s.slayerPoints = 9;
    expect(buySlayerShopItem(s, shopContent, "copper_ore")).toEqual({ ok: false, reason: "not_enough_points" });
    expect(s.slayerPoints).toBe(9);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
  });

  it("Level-Gate: level_locked unter slayerLevelRequired; nach Level-Anhebung kaufbar", () => {
    const s = createGame({ name: "X" }, shopContent, 1);
    s.slayerPoints = 100;
    expect(buySlayerShopItem(s, shopContent, "coal")).toEqual({ ok: false, reason: "level_locked" });
    expect(s.slayerPoints).toBe(100); // Gate greift VOR dem Abbuchen
    setSlayerLevel(s, 15);
    expect(buySlayerShopItem(s, shopContent, "coal")).toEqual({ ok: true });
    expect(s.slayerPoints).toBe(75);
    expect(itemCount(s.inventory, "coal")).toBe(1);
  });

  it("not_found für Items ohne Shop-Eintrag; no_space-Rollback erstattet Punkte (kein Verlust)", () => {
    const s = createGame({ name: "X" }, shopContent, 1);
    s.slayerPoints = 50;
    expect(buySlayerShopItem(s, shopContent, "oak_log")).toEqual({ ok: false, reason: "not_found" });
    expect(s.slayerPoints).toBe(50);

    // Kein Platz: Auto-Bank aus + jeder Slot belegt → Punkte zurück, KEINE Geister-Entdeckung.
    s.settings.autoBank = false;
    s.inventory.slots = s.inventory.slots.map(() => ({ itemId: "tin_ore", qty: 999 }));
    expect(buySlayerShopItem(s, shopContent, "copper_ore")).toEqual({ ok: false, reason: "no_space" });
    expect(s.slayerPoints).toBe(50);
    expect(isItemDiscovered(s, "copper_ore")).toBe(false);
  });
});

// ── Das Lager: Trophäenwand (Task #359, encampment-balance.md §6) ────────────────────────────────

/**
 * Trophäenwand: Punkte-Bonus (+10/20/30 %, additiv zum Meisterring, Gesamt-Klemme ×1.5) und der
 * Tages-Gratis-Skip der Stufe III. Grundlage: design/encampment-balance.md §6.
 */
describe("Trophäenwand — Slayer-Punkte-Bonus", () => {
  const TROPHY = "camp_trophy_wall";

  /** Spielstand mit Trophäenwand auf `level` (0 = ungebaut). */
  function wallGame(level: number): ReturnType<typeof createGame> {
    const s = createGame({ name: "Wand" }, content, 1);
    if (level > 0) s.camp.buildings[TROPHY] = level;
    s.camp.buildSeq += 1;
    return s;
  }

  function completeWallTask(s: ReturnType<typeof createGame>, pointReward: number): void {
    s.slayerTask = {
      masterId: "warden",
      monsterId: "w8",
      isTower: false,
      required: 1,
      progress: 0,
      xpReward: 0,
      pointReward,
    };
    expect(recordKillForSlayer(s, tc, "w8")).toBe(true);
  }

  it("ohne Lager exakt der Alt-Pfad (kein Aufschlag, keine Rundung)", () => {
    const s = wallGame(0);
    completeWallTask(s, 37);
    expect(s.slayerPoints).toBe(37);
  });

  it("Stufen I/II/III geben +10/+20/+30 % (kaufmännisch gerundet)", () => {
    for (const [level, expected] of [[1, 110], [2, 120], [3, 130]] as const) {
      const s = wallGame(level);
      completeWallTask(s, 100);
      expect(s.slayerPoints, `Stufe ${level}`).toBe(expected);
    }
  });

  it("Gesamt-Klemme ×1.5: eine überhöhte Boost-Quelle kann nicht darüber stapeln", () => {
    const s = wallGame(3);
    // Katalog-Manipulation: die Wand liefert plötzlich +200 % statt +30 %.
    const fat = {
      ...content,
      campBuildings: content.campBuildings!.map((b) =>
        b.id !== TROPHY ? b : { ...b, levels: b.levels.map((l) => ({ ...l, boost: { ...l.boost, value: 0.7 } })) },
      ),
    } as ContentDB;
    s.slayerTask = {
      masterId: "warden", monsterId: "w8", isTower: false,
      required: 1, progress: 0, xpReward: 0, pointReward: 100,
    };
    // recordKillForSlayer liest den Boost aus `fat` — ohne Klemme wären das 310 Punkte.
    expect(recordKillForSlayer(s, { ...tc, campBuildings: fat.campBuildings }, "w8")).toBe(true);
    expect(s.slayerPoints).toBe(150); // ×1.5, hart geklemmt
  });

  it("Streak-Bonuspunkte bleiben BEWUSST ohne Multiplikator (Präzedenz Meisterring)", () => {
    const s = wallGame(3);
    for (let i = 1; i <= SLAYER_STREAK_POINT_INTERVAL; i++) completeWallTask(s, 100);
    // 10 reguläre Gutschriften à 130 (mit Wand-Bonus) + der 10.-Task-Streak-Bonus in Höhe des
    // ROHEN pointReward (100, OHNE Wand-Multiplikator — balance.md §6, Präzedenz Meisterring).
    expect(s.slayerPoints).toBe(SLAYER_STREAK_POINT_INTERVAL * 130 + 100);
  });
});

describe("Trophäenwand III — 1 Gratis-Skip pro Kalendertag", () => {
  const TROPHY = "camp_trophy_wall";
  const TODAY = 20260727;
  const TOMORROW = 20260728;

  /** Spielstand über der Früh-Gnade-Schwelle, mit Trophäenwand auf `level` und Punkten. */
  function skipGame(level: number, points = 1000): ReturnType<typeof createGame> {
    const s = createGame({ name: "Skip" }, content, 1);
    setSlayerLevel(s, SLAYER_SKIP_FREE_BELOW_LEVEL + 10); // Früh-Gnade greift NICHT
    if (level > 0) s.camp.buildings[TROPHY] = level;
    s.camp.buildSeq += 1;
    s.slayerPoints = points;
    assignTask(s, tc, "warden");
    return s;
  }

  const master = (): SlayerMasterDef => tc.slayerMasters!.find((m) => m.id === "warden")!;

  it("ohne Trophäenwand III: Skip kostet regulär, Stempel bleibt 0", () => {
    for (const level of [0, 1, 2]) {
      const s = skipGame(level);
      expect(effectiveSkipCost(s, tc, master(), TODAY)).toBe(master().skipCost);
      expect(skipTask(s, tc, TODAY)).toBe(true);
      expect(s.slayerPoints, `Stufe ${level}`).toBe(1000 - master().skipCost);
      expect(s.slayerFreeSkipDay).toBe(0);
    }
  });

  it("Stufe III: der ERSTE Skip des Tages ist gratis, erhält die Streak und stempelt den Tag", () => {
    const s = skipGame(3);
    s.slayerStreak = 4;
    expect(effectiveSkipCost(s, tc, master(), TODAY)).toBe(0);
    expect(skipTask(s, tc, TODAY)).toBe(true);
    expect(s.slayerPoints).toBe(1000); // nichts abgezogen
    expect(s.slayerStreak).toBe(4); // Gratis-Skip bricht die Serie NICHT
    expect(s.slayerFreeSkipDay).toBe(TODAY);
  });

  it("der ZWEITE Skip desselben Tages kostet wieder regulär", () => {
    const s = skipGame(3);
    skipTask(s, tc, TODAY);
    assignTask(s, tc, "warden");
    expect(effectiveSkipCost(s, tc, master(), TODAY)).toBe(master().skipCost);
    expect(skipTask(s, tc, TODAY)).toBe(true);
    expect(s.slayerPoints).toBe(1000 - master().skipCost);
    expect(s.slayerStreak).toBe(0); // bezahlter Skip bricht die Serie
  });

  it("am nächsten Kalendertag ist der Gratis-Skip wieder da", () => {
    const s = skipGame(3);
    skipTask(s, tc, TODAY);
    assignTask(s, tc, "warden");
    expect(effectiveSkipCost(s, tc, master(), TOMORROW)).toBe(0);
    expect(skipTask(s, tc, TOMORROW)).toBe(true);
    expect(s.slayerPoints).toBe(1000);
    expect(s.slayerFreeSkipDay).toBe(TOMORROW);
  });

  it("Uhr-Rücksprung schenkt KEINEN zweiten Gratis-Skip (Task #364 Fix 3, `<`-Semantik)", () => {
    const s = skipGame(3);
    expect(skipTask(s, tc, TOMORROW)).toBe(true); // Tagesration von „morgen" verbraucht
    expect(s.slayerFreeSkipDay).toBe(TOMORROW);
    assignTask(s, tc, "warden");
    // Systemuhr zurückgestellt: derselbe Stempel ist NICHT mehr „≠ heute" genug — nur ein NEUERER
    // Kalendertag stellt die Ration wieder her.
    expect(campFreeSkipAvailable(s, tc, TODAY)).toBe(false);
    expect(effectiveSkipCost(s, tc, master(), TODAY)).toBe(master().skipCost);
    expect(skipTask(s, tc, TODAY)).toBe(true);
    expect(s.slayerPoints).toBe(1000 - master().skipCost);
    expect(s.slayerFreeSkipDay).toBe(TOMORROW); // der Stempel bleibt auf dem höheren Tag
    // Erst der Tag NACH dem Stempel ist wieder gratis.
    expect(campFreeSkipAvailable(s, tc, TOMORROW + 1)).toBe(true);
  });

  it("OHNE dayStamp (Alt-Aufrufer/Tests) neutral: regulärer Preis, kein Stempel", () => {
    const s = skipGame(3);
    expect(effectiveSkipCost(s, tc, master())).toBe(master().skipCost);
    expect(skipTask(s, tc)).toBe(true);
    expect(s.slayerPoints).toBe(1000 - master().skipCost);
    expect(s.slayerFreeSkipDay).toBe(0);
  });

  it("die Früh-Gnade hat Vorrang und verbraucht den Tages-Skip NICHT", () => {
    const s = createGame({ name: "Jung" }, content, 1);
    setSlayerLevel(s, 1); // unter SLAYER_SKIP_FREE_BELOW_LEVEL
    s.camp.buildings[TROPHY] = 3;
    s.camp.buildSeq += 1;
    assignTask(s, tc, "warden");
    expect(skipTask(s, tc, TODAY)).toBe(true);
    expect(s.slayerFreeSkipDay).toBe(0); // Tagesration unangetastet
  });
});

describe("slayer — rerollTask (Auftragsmarke, Chef-GO 26.08.2026)", () => {
  /** Spieler ÜBER der Gnaden-Schwelle mit 0 Punkten: ein Skip würde scheitern/kosten, der Reroll nicht. */
  function rerollGame(seed: number) {
    const s = createGame({ name: "X" }, content, seed);
    setCombatLevel(s, 5);
    setSlayerLevel(s, 15);
    s.slayerPoints = 0;
    s.slayerStreak = 3;
    s.slayerFreeSkipDay = 20260801;
    return s;
  }

  it("mit Auftrag: neuer Auftrag beim selben Meister; Punkte, Serie und Tages-Skip bit-identisch", () => {
    const s = rerollGame(4);
    const old = assignTask(s, tc, "warden")!;
    expect(old).not.toBeNull();
    const master = tc.slayerMasters!.find((m) => m.id === "warden")!;
    expect(effectiveSkipCost(s, tc, master)).toBe(master.skipCost); // Skip wäre NICHT gratis …
    expect(skipTask(s, tc)).toBe(false); // … und mit 0 Punkten unbezahlbar

    expect(rerollTask(s, tc)).toBe(true);
    const next = s.slayerTask!;
    expect(next).not.toBeNull();
    expect(next).not.toBe(old); // echtes neues Task-Objekt (frisch gewürfelt)
    expect(next.masterId).toBe("warden");
    expect(next.progress).toBe(0);
    expect(next.isTower).toBe(false); // warden: towerTaskChance 0 → Welt-Task wie beim Assign
    expect(s.slayerPoints).toBe(0);
    expect(s.slayerStreak).toBe(3);
    expect(s.slayerFreeSkipDay).toBe(20260801);
  });

  it("Fortschritt des alten Auftrags verfällt (frischer Auftrag), Serie überlebt auch mit Fortschritt", () => {
    const s = rerollGame(4);
    assignTask(s, tc, "warden");
    s.slayerTask!.progress = 2;
    expect(rerollTask(s, tc)).toBe(true);
    expect(s.slayerTask!.progress).toBe(0);
    expect(s.slayerStreak).toBe(3);
  });

  it("ohne aktiven Auftrag: false, State und RNG unberührt", () => {
    const s = rerollGame(4);
    const rngBefore = s.rng.state;
    expect(rerollTask(s, tc)).toBe(false);
    expect(s.slayerTask).toBeNull();
    expect(s.rng.state).toBe(rngBefore);
    expect(s.slayerPoints).toBe(0);
    expect(s.slayerStreak).toBe(3);
  });

  it("kein neuer Auftrag vergebbar (leerer Pool): false, ALTER Auftrag bleibt unverändert stehen", () => {
    const s = rerollGame(4);
    const old = assignTask(s, tc, "warden")!;
    old.progress = 1;
    const leer: ContentDB = { ...tc, monsters: {}, slayerTower: [] };
    expect(rerollTask(s, leer)).toBe(false);
    expect(s.slayerTask).toBe(old); // dasselbe Objekt, nichts verloren
    expect(s.slayerTask!.progress).toBe(1);
    expect(s.slayerStreak).toBe(3);
  });

  it("Meister nicht (mehr) im Content: false, Auftrag bleibt", () => {
    const s = rerollGame(4);
    const old = assignTask(s, tc, "warden")!;
    const ohneMeister: ContentDB = { ...tc, slayerMasters: [] };
    expect(rerollTask(s, ohneMeister)).toBe(false);
    expect(s.slayerTask).toBe(old);
  });

  it("DETERMINISMUS: gleiche Seed ⇒ identischer neuer Auftrag; Reroll nutzt nur state.rng", () => {
    const a = rerollGame(21);
    const b = rerollGame(21);
    assignTask(a, tc, "warden");
    assignTask(b, tc, "warden");
    expect(rerollTask(a, tc)).toBe(true);
    expect(rerollTask(b, tc)).toBe(true);
    expect(a.slayerTask).toEqual(b.slayerTask);
    expect(a.rng.state).toBe(b.rng.state);
    // Der Reroll ist exakt „Skip + Neuvergabe" auf dem Würfel: ein drittes Spiel, das den Auftrag
    // von Hand verwirft und neu zieht, landet auf demselben Ergebnis.
    const c = rerollGame(21);
    assignTask(c, tc, "warden");
    c.slayerTask = null;
    assignTask(c, tc, "warden");
    expect(c.slayerTask).toEqual(a.slayerTask);
    expect(c.rng.state).toBe(a.rng.state);
  });
});

// codex:2026-10-17T14:00:00+02:00 — 1.3.0 E3-Nachbesserung: Endgame-Zuschlag der Turm-Etagen 6–8.
describe("Slayer-Punkte: Endgame-Zuschlag Etage 6–8", () => {
  it("Etage 1–5 und Welt-Aufträge bleiben ×1, Etage 6–8 tragen den Tabellen-Faktor", () => {
    expect(towerTaskPointsMult(content, "abyssal_devourer", true)).toBe(1);
    expect(towerTaskPointsMult(content, "tower_charred_doomknight", false)).toBe(1);
    for (const f of [6, 7, 8]) {
      const floor = content.slayerTower?.find((x) => x.floor === f);
      expect(floor, `Etage ${f} fehlt`).toBeDefined();
      for (const id of floor!.monsters) expect(towerTaskPointsMult(content, id, true), id).toBe(TOWER_FLOOR_POINTS_MULT[f]);
    }
  });

  it("assignTask fixiert den Zuschlag im pointReward (Kampflevel 99, Slayer 95)", () => {
    let seen = 0;
    for (let seed = 1; seed <= 80 && seen < 3; seed++) {
      const s = createGame({ name: "E" }, content, seed);
      for (const id of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) s.skills[id] = { xp: xpForLevel(99) };
      s.skills.slayer = { xp: xpForLevel(95) };
      const task = assignTask(s, content, "brenna_ashwick");
      const floor = task && task.isTower ? content.monsters[task.monsterId]?.slayerFloor : undefined;
      if (!task || floor == null || floor < 6) continue;
      const master = content.slayerMasters!.find((m) => m.id === "brenna_ashwick")!;
      expect(task.pointReward).toBe(Math.round(scaledTaskPoints(master, task.required) * TOWER_FLOOR_POINTS_MULT[floor]!));
      seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });
});
