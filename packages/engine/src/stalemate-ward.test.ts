import { describe, it, expect } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, ItemDef, MonsterDef } from "@hearthforge/shared";
import { STALEMATE_MIN_PROGRESS_PCT, STALEMATE_NO_PROGRESS_MS, TICK_MS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { computeStats } from "./character";
import { addItem, expandBaseCapacity } from "./inventory";
import { xpForLevel } from "./leveling";
import { buildBisCharacter } from "./balance-envelope-helpers";

/**
 * P0-Ward-Patt-Fix (Dungeon-Rework-Spec §E1/§5.1.1, Welle 0):
 *
 * `strikeEnemy` leitet Schaden ZUERST in `enemyWard` — solange der Pool steht, bewegt sich
 * `enemyHp` bei Builds ohne wardBreak GAR NICHT. Die alte, rein HP-basierte `trackStalemate`-Metrik
 * brach deshalb jeden Build unter ~28 DPS (= Ward 1654 / 60 s) gegen den aether_wraith nach 60 s
 * fälschlich als „Patt" ab — idol_sanctum war damit für den BiS-99-Melee-Tank unschaffbar
 * (0/10 Clears im Spec-Harness, Schlüssel jedes Mal verloren).
 *
 * Fix: Fortschritts-Metrik = `enemyHp + enemyWard` gegen 1 % von `(maxHp + wardCapacity)`.
 * Diese Suite sichert beide Seiten:
 *  (a) Ward-Abbau IST Fortschritt → kein Patt-Abbruch, solange der Pool sinkt,
 *  (b) ein ECHTES Patt (weder HP noch Ward bewegen sich netto / nur Mikro-Fortschritt) feuert
 *      weiterhin — auch bei Ward-Gegnern,
 *  (c) Spec-Sonde Welle 0: der BiS-99-Melee-Tank (der 0/10-Fall) fällt den aether_wraith jetzt
 *      ohne Patt-Abbruch (Nachweis für „idol_sanctum W2 ist kein Hard-Blocker mehr").
 */

/**
 * Mini-Schadens-Waffe für den „langsamen Build": fixe Spanne (min=max ⇒ kein Roll-Rauschen über
 * die Waffe), Schaden bewusst so klein, dass der 1654er-Ward des Wraith in 65 s NIE bricht
 * (Obergrenze selbst mit Krits ≪ Pool), aber jeder gelandete Treffer den Pool sichtbar drainiert
 * (Fortschritt ≫ 1 %-Schwelle pro 60-s-Fenster).
 */
const TRAINING_BLADE: ItemDef = {
  id: "test_ward_chipper",
  name: "Stumpfe Übungsklinge",
  type: "equipment",
  stackable: false,
  slot: "mainhand",
  weaponStyle: "melee",
  weaponType: "sword",
  damageMin: 10,
  damageMax: 10,
  attackIntervalMs: 2000,
};

function withTestContent(monsters: MonsterDef[] = []): ContentDB {
  const c: ContentDB = {
    ...content,
    items: { ...content.items, [TRAINING_BLADE.id]: TRAINING_BLADE },
    monsters: { ...content.monsters },
  };
  // Welle 3: aether_wraith ist dungeonOnly (Idol-Finale) — dieser Test prüft die STALEMATE-
  // Mechanik am Ward-Koloss direkt und braucht den freien Direktstart; Flag im Test-Klon lösen.
  const wraith = { ...c.monsters.aether_wraith! };
  delete wraith.dungeonOnly;
  c.monsters.aether_wraith = wraith;
  for (const m of monsters) c.monsters[m.id] = m;
  return c;
}

/** Schwacher, aber praktisch unsterblicher Chipper-Held (con 9999 ⇒ ~20k HP Puffer). */
function chipperHero(c: ContentDB, seed: number) {
  const s = createTestGame({ name: "WardChipper" }, c, seed);
  s.character.baseAttributes.con = 9999; // Überlebens-Puffer (isoliert das Patt-Verhalten vom Tod)
  s.skills.attack = { xp: xpForLevel(50) }; // trifft zuverlässig (Accuracy) — Schaden bleibt mini
  s.character.equipment.mainhand = TRAINING_BLADE.id;
  s.character.equipment.offhand = null;
  return s;
}

/** 60-s-Patt-Fenster + 10 s Puffer, in Ticks. */
const WINDOW_TICKS = STALEMATE_NO_PROGRESS_MS / TICK_MS + 100;

describe("Stalemate-Ward-Fix (Dungeon-Rework-Spec §5.1.1, Welle 0)", () => {
  it("(a) Ward-Tank aether_wraith: langsamer Build baut 60 s+ NUR Ward ab → KEIN Patt-Abbruch", () => {
    const c = withTestContent();
    const wraith = c.monsters["aether_wraith"]!;
    expect(wraith, "aether_wraith existiert").toBeDefined();
    // Szenario-Guard: der Pool muss groß genug sein, dass der Chipper (Obergrenze ~65 s × ~20
    // Post-Mitigation-DPS-Maximum) ihn im Fenster nicht brechen kann — sonst misst der Test das
    // Bug-Szenario (reine Ward-Phase > 60 s) nicht mehr. Spec-Stand: Ward 1654.
    expect(wraith.wardCapacity ?? 0).toBeGreaterThan(1300);

    const s = chipperHero(c, 11);
    expect(startCombat(s, c, "aether_wraith")).toBe(true);
    s.character.hp = computeStats(s, c).maxHp;
    const wardStart = s.combat.enemyWard!;
    expect(wardStart).toBe(wraith.wardCapacity);

    for (let t = 0; t < WINDOW_TICKS && s.combat.stopReason === undefined; t++) combatStep(s, c);

    // Kein Patt-Abbruch: der Kampf läuft nach > 60 s ohne jeden HP-Fortschritt weiter …
    expect(s.combat.stopReason).toBeUndefined();
    expect(s.combat.monsterId).toBe("aether_wraith");
    // … weil der Ward-Abbau als Fortschritt zählt (deutlich über der 1 %-Schwelle):
    const maxTotal = wraith.maxHp + (wraith.wardCapacity ?? 0);
    expect(wardStart - (s.combat.enemyWard ?? 0)).toBeGreaterThan(
      maxTotal * STALEMATE_MIN_PROGRESS_PCT,
    );
    // Regressions-Kern: Ward steht noch UND die HP haben sich um weniger als die alte 1 %-HP-Schwelle
    // bewegt — die alte, rein HP-basierte Metrik hätte hier nach exakt 60 s „stalemate" gefeuert.
    expect(s.combat.enemyWard ?? 0).toBeGreaterThan(0);
    expect(s.combat.enemyHp).toBeGreaterThan(
      wraith.maxHp - wraith.maxHp * STALEMATE_MIN_PROGRESS_PCT,
    );
  });

  it("(b1) echtes Patt trotz Ward: Mini-Ward bricht, Regen friert die HP ein → Abbruch feuert weiterhin", () => {
    // Synthetischer Patt-Gegner: kleiner Ward-Pool (bricht nach Sekunden), danach heilt der massive
    // Regen jeden Chip-Treffer sofort zurück ⇒ HP+Ward bewegen sich netto NICHT mehr. Harmlos
    // (damage 0.1, Intervall ∞), damit ausschließlich der Patt-Pfad endet — nicht ein Spieler-Tod.
    const wall: MonsterDef = {
      id: "test_ward_regen_wall",
      name: "Test-Ward-Regen-Wall",
      level: 50,
      maxHp: 100_000,
      damage: 0.1,
      accuracy: 0,
      evasion: 0,
      defense: 0,
      defenseType: "ward",
      wardCapacity: 50,
      regen: 10_000,
      attackIntervalMs: 9_999_999,
      xp: 0,
      gold: 0,
      loot: [],
    };
    const c = withTestContent([wall]);
    const s = chipperHero(c, 12);
    expect(startCombat(s, c, wall.id)).toBe(true);
    s.character.hp = computeStats(s, c).maxHp;

    let minWardSeen = s.combat.enemyWard!;
    for (let t = 0; t < WINDOW_TICKS && s.combat.stopReason === undefined; t++) {
      combatStep(s, c);
      minWardSeen = Math.min(minWardSeen, s.combat.enemyWard ?? 0);
    }
    expect(minWardSeen, "Ward wurde erst abgebaut (Szenario greift)").toBeLessThan(50);
    expect(s.combat.kills).toBe(0);
    expect(s.combat.stopReason).toBe("stalemate");
    expect(s.combat.monsterId).toBeNull();
  });

  it("(b2) echtes Patt: Mikro-Ward-Drip unter der 1 %-Schwelle zählt NICHT als Fortschritt → Abbruch feuert", () => {
    // Riesiger Ward-Pool: der Chipper drainт nur ~200–400 pro Minute — weit unter 1 % von
    // (maxHp + wardCapacity) ≈ 10 100. Mikro-Fortschritt darf das Patt (Spieler käme erst nach
    // Tagen durch) nicht endlos offenhalten — exakt die Mikro-Schaden-Regel der HP-Seite.
    const colossus: MonsterDef = {
      id: "test_ward_colossus",
      name: "Test-Ward-Koloss",
      level: 50,
      maxHp: 10_000,
      damage: 0.1,
      accuracy: 0,
      evasion: 0,
      defense: 0,
      defenseType: "ward",
      wardCapacity: 1_000_000,
      attackIntervalMs: 9_999_999,
      xp: 0,
      gold: 0,
      loot: [],
    };
    const c = withTestContent([colossus]);
    const s = chipperHero(c, 13);
    expect(startCombat(s, c, colossus.id)).toBe(true);
    s.character.hp = computeStats(s, c).maxHp;

    let minWardSeen = s.combat.enemyWard!;
    for (let t = 0; t < WINDOW_TICKS && s.combat.stopReason === undefined; t++) {
      combatStep(s, c);
      minWardSeen = Math.min(minWardSeen, s.combat.enemyWard ?? 0);
    }
    expect(minWardSeen, "Ward bewegte sich (nur eben unterschwellig)").toBeLessThan(1_000_000);
    expect(minWardSeen).toBeGreaterThan(1_000_000 - 10_100); // Drip blieb unter der 1 %-Schwelle
    expect(s.combat.stopReason).toBe("stalemate");
    expect(s.combat.monsterId).toBeNull();
  });

  it("(c) Spec-Sonde Welle 0: BiS-99-Melee-Tank fällt aether_wraith OHNE Patt-Abbruch (der 0/10-Blocker)", () => {
    // Exakt der Spec-Harness-Fall (§3/§5.1.1): der BiS-99-Melee-Tank (kein wardBreak) scheiterte
    // vor dem Fix 10/10 an W2 des idol_sanctum — ~60 s reiner Ward-Abbau ⇒ „stalemate". Nach dem
    // Fix muss er den Wraith regulär töten (Spec-Erwartung: Sanktum-Clear in ~35–50 min gesamt).
    // Welle 3: aether_wraith ist dungeonOnly — für die isolierte Mechanik-Sonde den Direktstart
    // über den Test-Klon erlauben (withTestContent löst das Flag; die Dungeon-Route testet
    // idol-sanctum-clear.test.ts end-to-end).
    const c = withTestContent();
    const build = buildBisCharacter(c, "melee", 99, "tank", { allBuffs: true });
    const s = build.state;
    expandBaseCapacity(s.inventory, c, 100);
    addItem(s.inventory, c, "cooked_voidray", 50_000);
    s.character.food = "cooked_voidray";
    const deathsBefore = s.stats.deaths;

    expect(startCombat(s, c, "aether_wraith")).toBe(true);
    s.character.hp = computeStats(s, c).maxHp;

    // 30 000 Ticks = 50 min Sim-Zeit-Obergrenze (reine Berechnung, kein Wall-Clock-Sleep).
    for (let t = 0; t < 30_000 && s.combat.kills === 0 && s.combat.stopReason === undefined; t++) {
      combatStep(s, c);
    }
    expect(s.combat.stopReason, "kein Patt-/Niederlage-Abbruch").toBeUndefined();
    expect(s.combat.kills, "aether_wraith besiegt").toBeGreaterThanOrEqual(1);
    expect(s.stats.deaths, "0 Tode (Tank-Envelope hält W2)").toBe(deathsBefore);
  });
});
