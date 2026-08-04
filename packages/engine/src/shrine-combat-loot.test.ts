import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, DungeonDef, ItemDef, MonsterDef } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { combatStep, startCombat } from "./combat";
import { startDungeon } from "./dungeon";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { shrineAmplifiedMult } from "./blessing";
import { campShrineBonus } from "./camp";

/**
 * Schrein der Stillen × Kampf-BEUTE-Segen (Chef-Entscheid 2026-08-03, Audit-Befund K1).
 *
 * Der Schrein verstärkte bisher nur die Skilling-Segen (tick.ts), die bloodmoon-CHANCE und den
 * wildhunt-Ersatz (elites.ts) — die Kampf-Beute-Callsites in combat.ts blieben laut #359-Sperrzone
 * auf dem Basis-Wert. Der Chef-Entscheid vom 03.08. hebt diese Ungleichbehandlung auf: Kill-XP
 * (mistvigil), Kill-/Clear-Gold (greed) und Rare-Drop-Chance (rotmist) laufen jetzt ebenfalls über
 * `shrineAmplifiedMult` (Bonus-Anteil × (1 + 0.10 × Stufe): 1.10 → 1.13, 1.20 → 1.26).
 *
 * HARTE GRENZEN, die diese Suite pinnt:
 *  - wildhunt (§attackSpeed) bleibt KOMPLETT roh (Kampf-Tempo = Kampfwert, Eiserne Regel 3).
 *  - Ohne Schrein bleibt an Segenstagen alles exakt wie vorher (Basis 1.10/1.20 byte-gleich).
 *  - Ohne nowMs (Alt-Aufrufer/Sim-Läufe) ist der Schrein im Kampf ein kompletter No-op.
 *  - Determinismus: die Verstärkung ändert nur die SCHWELLE bestehender Würfe, nie die Wurf-Zahl.
 */

const SHRINE = "camp_warden_shrine";

/** Nächster Tag (inkl. `from`) mit lokalem Wochentag `targetDay`, 12:00 lokal (Muster blessing.test.ts). */
function nextLocalWeekday(from: Date, targetDay: number): Date {
  let d = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
  while (d.getDay() !== targetDay) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 12, 0, 0, 0);
  }
  return d;
}

const REF = new Date(2026, 0, 1);

/** Synthetisches Drop-Material (volle Kontrolle, keine Content-Abhängigkeit — Muster dungeon.test.ts). */
const MAT: ItemDef = {
  id: "test_shrine_mat",
  name: { en: "Test Shrine Mat", de: "Test-Schrein-Material" },
  type: "material",
  stackable: true,
};

/** Harmloser Test-Mob: stirbt schnell, trifft nie → deterministische, kurze Kills. */
function shrineMob(id: string, overrides: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id,
    name: { en: id, de: id },
    level: 45,
    maxHp: 4,
    damage: 0,
    accuracy: 0,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 100_000,
    xp: 50,
    gold: 120,
    loot: [],
    ...overrides,
  };
}

function shrineDungeon(id: string, encounters: string[], overrides: Partial<DungeonDef> = {}): DungeonDef {
  return {
    id,
    name: { en: id, de: id },
    requiredLevel: 1,
    keyItem: "crypt_key",
    keysPerRun: 1,
    encounters,
    loot: [],
    xp: 0,
    gold: 0,
    ...overrides,
  };
}

function withSynthetic(monsters: MonsterDef[], dungeons: DungeonDef[]): ContentDB {
  const monsterMap = { ...content.monsters };
  for (const m of monsters) monsterMap[m.id] = m;
  return {
    ...content,
    monsters: monsterMap,
    dungeons: [...content.dungeons, ...dungeons],
    items: { ...content.items, [MAT.id]: MAT },
  };
}

/** Alle Kampf-Skills auf L45: earlyXpMult ist dort exakt 1 → XP-Verhältnisse bleiben mathematisch sauber. */
function presetCombatSkills(s: ReturnType<typeof createTestGame>): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(45) };
  }
}

function totalXp(s: ReturnType<typeof createTestGame>): number {
  return Object.values(s.skills).reduce((sum, sk) => sum + sk.xp, 0);
}

/** Ein einzelner Kill mit optionalem Wall-Clock-Anker und Schrein-Stufe. */
function killRun(c: ContentDB, monsterId: string, seed: number, nowMs?: number, shrineLevel = 0) {
  const s = createTestGame({ name: "X", baseAttributes: { str: 90, dex: 90, con: 90 } }, c, seed);
  presetCombatSkills(s);
  if (shrineLevel > 0) {
    s.camp.buildings[SHRINE] = shrineLevel;
    s.camp.buildSeq += 1; // Cache-Vertrag (camp.ts campBoostCached)
  }
  const xp0 = totalXp(s);
  const gold0 = s.character.gold;
  expect(startCombat(s, c, monsterId)).toBe(true);
  let guard = 0;
  while (s.combat.kills < 1 && s.combat.monsterId && guard++ < 2000) combatStep(s, c, nowMs);
  expect(s.combat.kills).toBe(1);
  return { s, xpDelta: totalXp(s) - xp0, goldDelta: s.character.gold - gold0 };
}

/** Ein kompletter Dungeon-Run (Erst-Clear) mit optionalem Anker und Schrein-Stufe. */
function dungeonRun(c: ContentDB, dungeonId: string, seed: number, nowMs?: number, shrineLevel = 0) {
  const s = createTestGame({ name: "X", baseAttributes: { str: 90, dex: 90, con: 90 } }, c, seed);
  presetCombatSkills(s);
  s.dungeonsUnlocked[dungeonId] = true; // Mechanik-Test, kein Story-Gating
  if (shrineLevel > 0) {
    s.camp.buildings[SHRINE] = shrineLevel;
    s.camp.buildSeq += 1;
  }
  const xp0 = totalXp(s);
  const gold0 = s.character.gold;
  expect(startDungeon(s, c, dungeonId)).toBe(true);
  let guard = 0;
  while (s.combat.dungeonId && guard++ < 50_000) combatStep(s, c, nowMs);
  expect(s.combat.dungeonId).toBe(null);
  return { s, xpDelta: totalXp(s) - xp0, goldDelta: s.character.gold - gold0 };
}

describe("Schrein × Kampf-Beute (Chef-Entscheid 2026-08-03): Kill-Pfad", () => {
  const XP_MOB = shrineMob("test_shrine_mob");
  const c = withSynthetic([XP_MOB], []);

  it("mistvigil (Montag): Kill-/Kampf-XP ×1.10 ohne Schrein, ×1.13 mit Schrein III — Gold unberührt", () => {
    const monday = nextLocalWeekday(REF, 1).getTime();
    const base = killRun(c, XP_MOB.id, 7); // ohne nowMs: kein Segen (Regressions-Anker)
    const blessed = killRun(c, XP_MOB.id, 7, monday);
    const shrined = killRun(c, XP_MOB.id, 7, monday, 3);

    expect(base.xpDelta).toBeGreaterThan(0);
    // Ohne Schrein exakt der Vorher-Zustand: Basis-Multiplikator 1.10 (byte-gleiche Formel).
    expect(blessed.xpDelta / base.xpDelta).toBeCloseTo(1.10, 10);
    // Mit Schrein III: Bonus-Anteil ×1.30 → 1.13 (encampment-balance.md §6).
    expect(shrined.xpDelta / base.xpDelta).toBeCloseTo(1.13, 10);
    // mistvigil ist ein XP-Segen: Kill-Gold bleibt in allen drei Läufen identisch.
    expect(blessed.goldDelta).toBe(base.goldDelta);
    expect(shrined.goldDelta).toBe(base.goldDelta);
  });

  it("greed (Donnerstag): Kill-Gold round(g×1.20) ohne Schrein, round(g×1.26) mit Schrein III — XP unberührt", () => {
    const thursday = nextLocalWeekday(REF, 4).getTime();
    for (const seed of [1, 2, 3, 4, 5]) {
      const base = killRun(c, XP_MOB.id, seed);
      const blessed = killRun(c, XP_MOB.id, seed, thursday);
      const shrined = killRun(c, XP_MOB.id, seed, thursday, 3);
      const g = base.goldDelta; // roher Wurf (Mult 1 → round(g) = g)
      expect(g).toBeGreaterThanOrEqual(120);

      // Ohne Schrein byte-gleich zum Vorher-Zustand (Basis 1.20).
      expect(blessed.goldDelta).toBe(Math.round(g * 1.20));
      // Mit Schrein III exakt der Engine-Ausdruck (1.20 → 1.26); die Zahlen-Tabelle selbst pinnt
      // blessing.test.ts („shrineAmplifiedMult rechnet exakt die Balance-Tabelle §6 nach").
      const bonus = campShrineBonus(shrined.s, c);
      expect(shrineAmplifiedMult(1.20, bonus)).toBeCloseTo(1.26, 10);
      expect(shrined.goldDelta).toBe(Math.round(g * shrineAmplifiedMult(1.20, bonus)));
      expect(shrined.goldDelta).toBeGreaterThan(blessed.goldDelta);

      // greed ist ein Gold-Segen: XP bleibt in allen drei Läufen bit-identisch.
      expect(blessed.xpDelta).toBe(base.xpDelta);
      expect(shrined.xpDelta).toBe(base.xpDelta);
    }
  });

  it("rotmist (Sonntag): Schrein III hebt NUR die Schwelle des bestehenden Drop-Wurfs (0.935 → 0.9605) — monoton, kein Extra-Wurf", () => {
    // Loot-Chance 0.85: ×1.10 → 0.935, ×1.13 → 0.9605. Gleicher Seed = gleicher nextFloat-Draw →
    // jeder Drop des unverstärkten Laufs fällt auch im verstärkten (Monotonie), und über viele
    // Seeds landen einige Würfe im Fenster (0.935, 0.9605] → nur dort dreht der Schrein den Ausgang.
    const RARE_MOB = shrineMob("test_shrine_rare_mob", {
      gold: 0,
      xp: 0,
      loot: [{ itemId: MAT.id, chance: 0.85, min: 1, max: 1, suffixChance: 0 }],
    });
    const cRare = withSynthetic([RARE_MOB], []);
    const sunday = nextLocalWeekday(REF, 0).getTime();

    let blessedDrops = 0;
    let shrinedDrops = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const blessed = killRun(cRare, RARE_MOB.id, seed, sunday);
      const shrined = killRun(cRare, RARE_MOB.id, seed, sunday, 3);
      const db = itemCount(blessed.s.inventory, MAT.id) > 0;
      const ds = itemCount(shrined.s.inventory, MAT.id) > 0;
      if (db) expect(ds).toBe(true); // Monotonie: höhere Schwelle kann einen Drop nie WEGnehmen
      if (db) blessedDrops++;
      if (ds) shrinedDrops++;
    }
    expect(blessedDrops).toBeGreaterThan(0); // Sanity: Basis-Segen droppt überhaupt
    expect(shrinedDrops).toBeLessThan(150); // Sanity: keine Dauer-Garantie
    expect(shrinedDrops).toBeGreaterThan(blessedDrops); // der Schrein wirkt messbar auf die Chance
  });

  it("OHNE nowMs ist der Schrein im Kampf ein kompletter No-op (Alt-Aufrufer/Sim-Läufe bit-identisch)", () => {
    const bare = killRun(c, XP_MOB.id, 11);
    const shrined = killRun(c, XP_MOB.id, 11, undefined, 3);
    expect(shrined.goldDelta).toBe(bare.goldDelta);
    expect(shrined.xpDelta).toBe(bare.xpDelta);
    expect(shrined.s.skills).toEqual(bare.s.skills);
    expect(shrined.s.rng).toEqual(bare.s.rng); // identische Wurf-Sequenz — kein zusätzlicher Draw
  });
});

describe("Schrein × Kampf-Beute (Chef-Entscheid 2026-08-03): Dungeon-Pfad", () => {
  const WAVE_MOB = shrineMob("test_shrine_wave_mob", { xp: 0, gold: 0 });
  const DUNGEON = shrineDungeon("test_shrine_dungeon", [WAVE_MOB.id], { xp: 100, gold: 500 });
  const c = withSynthetic([WAVE_MOB], [DUNGEON]);

  it("greed (Donnerstag): Clear-Gold (inkl. Erst-Clear-Verdopplung) 2×round(500×1.20) → 2×round(500×1.26) mit Schrein III", () => {
    const thursday = nextLocalWeekday(REF, 4).getTime();
    const base = dungeonRun(c, DUNGEON.id, 3);
    const blessed = dungeonRun(c, DUNGEON.id, 3, thursday);
    const shrined = dungeonRun(c, DUNGEON.id, 3, thursday, 3);

    expect(base.goldDelta).toBe(1_000); // Erst-Clear zahlt doppelt (Mob-Gold 0)
    expect(blessed.goldDelta).toBe(2 * Math.round(500 * 1.20)); // 1200 — Basis wie vorher
    const bonus = campShrineBonus(shrined.s, c);
    expect(shrined.goldDelta).toBe(2 * Math.round(500 * shrineAmplifiedMult(1.20, bonus))); // 1260
    expect(shrined.goldDelta).toBeGreaterThan(blessed.goldDelta);
    // Gold-Segen fasst die XP nicht an.
    expect(blessed.xpDelta).toBe(base.xpDelta);
    expect(shrined.xpDelta).toBe(base.xpDelta);
  });

  it("mistvigil (Montag): Dungeon-XP (Clear-Vitality + Kampf-XP via addXp) ×1.10 → ×1.13 mit Schrein III", () => {
    const monday = nextLocalWeekday(REF, 1).getTime();
    const base = dungeonRun(c, DUNGEON.id, 3);
    const blessed = dungeonRun(c, DUNGEON.id, 3, monday);
    const shrined = dungeonRun(c, DUNGEON.id, 3, monday, 3);

    expect(base.xpDelta).toBeGreaterThanOrEqual(100); // Clear-XP ist dabei
    expect(blessed.xpDelta / base.xpDelta).toBeCloseTo(1.10, 10);
    expect(shrined.xpDelta / base.xpDelta).toBeCloseTo(1.13, 10);
    // XP-Segen fasst das Gold nicht an.
    expect(blessed.goldDelta).toBe(base.goldDelta);
    expect(shrined.goldDelta).toBe(base.goldDelta);
  });

  it("Bot-3 B1 (Release-Fix 0.3.0): die Clear-XP-Logzeile zeigt den TATSÄCHLICH vergebenen Betrag, nicht den Katalog-Rohwert", () => {
    // Kontext: der Gold-Pfad loggte schon immer den effektiven Betrag (goldAmt), die XP-Zeile
    // dagegen den rohen dungeon.xp — sichtbar falsch an Segens-Tagen/mit Schrein. Der Fix loggt
    // die addXp-Rückgabe (gerundet). WAVE_MOB hat xp 0 und der Offense-Skill ist nie vitality —
    // die EINZIGE vitality-XP-Logzeile des Runs ist damit exakt die Clear-Zeile.
    const clearXpLogAmount = (s: ReturnType<typeof createTestGame>): number => {
      const entries = s.combat.log.filter((e) => e.kind === "xp" && e.skill === "vitality");
      expect(entries, "genau EINE vitality-XP-Logzeile (der Clear)").toHaveLength(1);
      return entries[0]!.amount;
    };

    // Neutraler Tag (ohne nowMs, kein Segen; earlyXpMult bei L45 exakt 1): Log == Rohwert.
    const base = dungeonRun(c, DUNGEON.id, 3);
    expect(clearXpLogAmount(base.s)).toBe(DUNGEON.xp); // 100

    // mistvigil (Montag) + Schrein III: Log == round(vergebene XP) == round(100 × 1.13) = 113 —
    // derselbe Engine-Ausdruck wie der Grant (shrineAmplifiedMult × campShrineBonus), Muster der
    // Gold-Prüfung oben. Vorher stand hier fälschlich der Rohwert 100 im Log.
    const monday = nextLocalWeekday(REF, 1).getTime();
    const shrined = dungeonRun(c, DUNGEON.id, 3, monday, 3);
    const bonus = campShrineBonus(shrined.s, c);
    const logged = clearXpLogAmount(shrined.s);
    expect(logged).toBe(Math.round(DUNGEON.xp * shrineAmplifiedMult(1.10, bonus))); // 113
    expect(logged).not.toBe(DUNGEON.xp); // der Bot-Befund: Rohwert ≠ vergebener Wert

    // Ohne Schrein (nur Segen): Log == round(100 × 1.10) = 110.
    const blessed = dungeonRun(c, DUNGEON.id, 3, monday);
    expect(clearXpLogAmount(blessed.s)).toBe(Math.round(DUNGEON.xp * 1.10)); // 110
  });

  it("rotmist (Sonntag): Clear-Loot-Chance wird über dieselbe Schwellen-Verstärkung angehoben (monoton, kein Extra-Wurf)", () => {
    const RARE_DUNGEON = shrineDungeon("test_shrine_rare_dungeon", [WAVE_MOB.id], {
      loot: [{ itemId: MAT.id, chance: 0.85, min: 1, max: 1 }],
    });
    const cRare = withSynthetic([WAVE_MOB], [RARE_DUNGEON]);
    const sunday = nextLocalWeekday(REF, 0).getTime();

    let blessedDrops = 0;
    let shrinedDrops = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const blessed = dungeonRun(cRare, RARE_DUNGEON.id, seed, sunday);
      const shrined = dungeonRun(cRare, RARE_DUNGEON.id, seed, sunday, 3);
      const db = itemCount(blessed.s.inventory, MAT.id) > 0;
      const ds = itemCount(shrined.s.inventory, MAT.id) > 0;
      if (db) expect(ds).toBe(true);
      if (db) blessedDrops++;
      if (ds) shrinedDrops++;
    }
    expect(blessedDrops).toBeGreaterThan(0);
    expect(shrinedDrops).toBeLessThan(150);
    expect(shrinedDrops).toBeGreaterThan(blessedDrops);
  });
});

describe("Eiserne Regel 3: wildhunt bleibt auch mit Schrein III komplett roh", () => {
  it("Freitag + Schrein III: Angriffs-Sequenz und RNG bit-identisch zu Freitag ohne Schrein", () => {
    const friday = nextLocalWeekday(REF, 5).getTime();
    const run = (shrineLevel: number) => {
      const s = createTestGame(
        { name: "X", baseAttributes: { str: 80, dex: 80, con: 80 } },
        content,
        9,
      );
      if (shrineLevel > 0) {
        s.camp.buildings[SHRINE] = shrineLevel;
        s.camp.buildSeq += 1;
      }
      startCombat(s, content, "rootling_treemonster");
      s.combat.enemyHp = 100_000; // Gegner überlebt das Fenster (kein Respawn-Rauschen)
      for (let i = 0; i < 400; i++) combatStep(s, content, friday);
      return s;
    };
    const bare = run(0);
    const shrined = run(3);
    // Der wildhunt-Basis-Buff selbst wirkt (das testet blessing.test.ts) — hier zählt NUR, dass der
    // Schrein NICHTS obendrauf legt: identisches Kampf-Log (jeder Schlag, jeder Betrag) + RNG-Stand.
    expect(shrined.combat.log).toEqual(bare.combat.log);
    expect(shrined.combat.playerTimerMs).toBe(bare.combat.playerTimerMs);
    expect(shrined.rng).toEqual(bare.rng);
    expect(shrined.character.hp).toBe(bare.character.hp);
  });
});
