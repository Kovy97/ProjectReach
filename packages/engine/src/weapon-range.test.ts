import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, ItemDef, MonsterDef } from "@hearthforge/shared";
import { DMG_MAX_HIT_MULT, DMG_ROLL_FLOOR } from "@hearthforge/shared";
import { createGame } from "./state";
import { computeStats } from "./character";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { xpForLevel } from "./leveling";

/**
 * Waffen 2.0 §1 (design/itemization-parity-fix.md) — Schadensspannen-Modell:
 *  - Range-Form-Waffen (damageMin/damageMax): computeStats liefert attackDamageMin/Max =
 *    Charakter-Anteil + Spanne (munitionsfrei seit #286; Pfeilschaden in der Waffe eingebacken);
 *    combat.ts rollt NON-Crits uniform darin (§1.3).
 *  - Legacy-Waffen (Alt-Content, nur Flats): Spanne aus dem Flat abgeleitet
 *    (max = Flat×DMG_MAX_HIT_MULT, min = max×DMG_ROLL_FLOOR) — Übergangs-Kompatibilität.
 *  - accuracy: offenseSkill·0.35, UNGERUNDET (§1.2) — +1-Boosts sind immer sichtbar.
 *  - Tempo: Range-Form-Waffen tragen ihr attackIntervalMs ABSOLUT (§1.4).
 */

/** Trainingspuppe: greift praktisch nie an, stirbt praktisch nie, gibt nichts. */
function dummy(over: Partial<MonsterDef> = {}): MonsterDef {
  return {
    id: "fx_dummy",
    name: "Trainingspuppe",
    level: 5,
    maxHp: 1_000_000,
    damage: 0.1,
    accuracy: 0,
    evasion: 0,
    defense: 0,
    attackIntervalMs: 9_999_999,
    xp: 0,
    gold: 0,
    loot: [],
    ...over,
  };
}

/** Anti-Krit-Offhand: drückt critChance auf 0 → deterministische NON-Crit-Sequenzen. */
const NOCRIT: ItemDef = {
  id: "fx_nocrit",
  name: "Anti-Krit-Buckler",
  type: "equipment",
  stackable: false,
  slot: "offhand",
  bonus: { critChance: -1 },
};

function withContent(items: ItemDef[], monsters: MonsterDef[] = [dummy()]): ContentDB {
  const c: ContentDB = { ...content, items: { ...content.items }, monsters: { ...content.monsters } };
  for (const i of [...items, NOCRIT]) c.items[i.id] = i;
  for (const m of monsters) c.monsters[m.id] = m;
  return c;
}

/**
 * Kampf-Skills auf L60 einfrieren: Monster-L5 liegt ≥ XP_ZERO_GAP unter dem Skill → Offensiv-XP
 * = 0 → KEINE Level-/Attribut-Drift während des Tests (Vitality-XP fließt, levelt aber nicht).
 */
function freezeCombatSkills(s: GameState): void {
  for (const id of ["attack", "power", "defence", "vitality", "ranged", "magic", "warding"]) {
    s.skills[id] = { xp: xpForLevel(60) };
  }
}

function playerHits(s: GameState): Array<{ kind: string; amount: number }> {
  return s.combat.log
    .filter((e) => e.by === "player" && (e.kind === "hit" || e.kind === "crit"))
    .map((e) => ({ kind: e.kind, amount: e.amount }));
}

describe("Waffen 2.0 — Uniform-Schadensroll (§1.3)", () => {
  it("NON-Crits rollen uniform in [round(min)..round(max)]; Erwartungswert ≈ (min+max)/2", () => {
    const c = withContent([
      {
        id: "fx_range_sword",
        name: "Spannen-Klinge",
        type: "equipment",
        stackable: false,
        slot: "mainhand",
        weaponStyle: "melee",
        weaponType: "sword",
        damageMin: 5,
        damageMax: 9,
        attackIntervalMs: 1000,
      },
    ]);
    const s = createGame({ name: "FX" }, c, 42);
    freezeCombatSkills(s);
    s.character.equipment.mainhand = "fx_range_sword";
    s.character.equipment.offhand = "fx_nocrit";
    const st = computeStats(s, c);
    s.character.hp = st.maxHp;
    const lo = Math.round(st.attackDamageMin);
    const hi = Math.round(st.attackDamageMax);
    expect(hi - lo).toBe(4); // Waffenspanne 5–9 bleibt 4 breit (Charakter-Anteil auf BEIDEN Enden)

    startCombat(s, c, "fx_dummy");
    // Hits über die Log-seq einsammeln (Log ist auf COMBAT_LOG_MAX gedeckelt).
    const amounts: number[] = [];
    let lastSeq = -1;
    for (let i = 0; i < 700 && amounts.length < 60; i++) {
      advance(s, c, 100);
      for (const e of s.combat.log) {
        if (e.seq <= lastSeq) continue;
        lastSeq = e.seq;
        if (e.by === "player" && e.kind === "hit") amounts.push(e.amount);
        expect(e.kind).not.toBe("crit"); // Anti-Krit-Offhand → keine Krits in der Stichprobe
      }
    }
    expect(amounts.length).toBeGreaterThanOrEqual(50);
    for (const a of amounts) {
      expect(a).toBeGreaterThanOrEqual(lo);
      expect(a).toBeLessThanOrEqual(hi);
    }
    // Beide Kanten der Spanne werden real gewürfelt (kein heimlicher Mittelwert-Kurzschluss).
    expect(amounts).toContain(lo);
    expect(amounts).toContain(hi);
    // DPS-Erwartung = Mittel der Spanne (attackDamage, §1.2/§1.5).
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    expect(Math.abs(mean - st.attackDamage)).toBeLessThan(0.75);
  });

  it("min==max-Waffe trifft exakt konstant (und der Roll konsumiert trotzdem einen Draw — deterministisch)", () => {
    const c = withContent([
      {
        id: "fx_flatline",
        name: "Konstant-Klinge",
        type: "equipment",
        stackable: false,
        slot: "mainhand",
        weaponStyle: "melee",
        weaponType: "sword",
        damageMin: 50,
        damageMax: 50,
        attackIntervalMs: 1000,
      },
    ]);
    const run = (): GameState => {
      const s = createGame({ name: "FX" }, c, 9);
      freezeCombatSkills(s);
      s.character.equipment.mainhand = "fx_flatline";
      s.character.equipment.offhand = "fx_nocrit";
      s.character.hp = computeStats(s, c).maxHp;
      startCombat(s, c, "fx_dummy");
      advance(s, c, 5_000);
      s.character.createdAt = 0;
      return s;
    };
    const s = run();
    const st = computeStats(s, c);
    const expected = Math.round(st.attackDamageMin);
    const hits = playerHits(s);
    expect(hits.length).toBeGreaterThanOrEqual(3);
    for (const h of hits) expect(h.amount).toBe(expected);
    // Determinismus: gleiche Seed → identischer Zustand (inkl. RNG-Sequenz mit Pflicht-Draw je Roll).
    expect(run()).toEqual(run());
  });

  it("offline == online: identische Tick-Läufe liefern bit-identische Kampf-Zustände (Range-Waffe + Spezial-Effekt)", () => {
    const c = withContent([
      {
        id: "fx_momentum_blade",
        name: "Blutrausch-Klinge",
        type: "equipment",
        stackable: false,
        slot: "mainhand",
        weaponStyle: "melee",
        weaponType: "scimitar",
        damageMin: 8,
        damageMax: 12,
        attackIntervalMs: 1000,
        weaponEffects: [{ type: "momentum", chance: 1, magnitude: 0.02, durationMs: 0, stacks: 5 }],
      },
    ]);
    const make = (): GameState => {
      const s = createGame({ name: "FX" }, c, 1234);
      freezeCombatSkills(s);
      s.character.equipment.mainhand = "fx_momentum_blade";
      s.character.equipment.offhand = "fx_nocrit";
      s.character.hp = computeStats(s, c).maxHp;
      s.character.createdAt = 0;
      startCombat(s, c, "fx_dummy");
      return s;
    };
    const live = make();
    for (let i = 0; i < 600; i++) advance(live, c, 100); // Live-Loop: kleine Frames
    const offline = make();
    advance(offline, c, 60_000, { offline: true }); // Offline-Catch-up: ein großer Sprung
    // activePlayMs zählt offline bewusst nicht mit — für den Vergleich angleichen.
    offline.activePlayMs = live.activePlayMs;
    // Elite-/World-Spawns (SAVE 72, design/elite-spawns-concept.md §1.3): der Zonen-Zyklus tickt
    // bewusst NUR online — eliteZones/eliteRng/eliteSpawnSeq/lastEliteSpawn laufen im Live-Loop
    // weiter, im Offline-Catch-up stehen alle vier still (KEIN Bruch des offline==online-Gesetzes,
    // das für die KERN-Kampf-/RNG-Sequenz gilt und hier unverändert bit-identisch bleibt) — für
    // DIESEN Vergleich angleichen. Alle vier statt nur zwei (Härtung 2026-07-22): seit content-dev
    // Phase 2 reale Elite-Varianten liefert, ist „content.elites leer" keine sichere Annahme mehr.
    offline.eliteZones = live.eliteZones;
    offline.eliteRng = live.eliteRng;
    offline.eliteSpawnSeq = live.eliteSpawnSeq;
    offline.lastEliteSpawn = live.lastEliteSpawn;
    expect(offline).toEqual(live);
  });
});

describe("Waffen 2.0 — computeStats-Vertrag (§1.2/§1.4)", () => {
  it("Range-Form: attackDamageMin/Max = Charakter-Anteil + Waffenspanne; attackDamage = Mittel; min/maxHit ungerundet", () => {
    const c = withContent([
      {
        id: "fx_range_sword",
        name: "Spannen-Klinge",
        type: "equipment",
        stackable: false,
        slot: "mainhand",
        weaponStyle: "melee",
        weaponType: "sword",
        damageMin: 5,
        damageMax: 9,
        attackIntervalMs: 2800,
      },
    ]);
    const bare = createGame({ name: "FX" }, c, 1);
    bare.character.equipment.mainhand = null;
    const armed = createGame({ name: "FX" }, c, 1);
    armed.character.equipment.mainhand = "fx_range_sword";

    const stBare = computeStats(bare, c);
    const stArmed = computeStats(armed, c);
    // Charakter-Anteil C = meleeDamage (Formel unverändert); Spanne oben drauf.
    expect(stArmed.attackDamageMin).toBeCloseTo(stArmed.meleeDamage + 5, 9);
    expect(stArmed.attackDamageMax).toBeCloseTo(stArmed.meleeDamage + 9, 9);
    expect(stArmed.attackDamage).toBeCloseTo((stArmed.attackDamageMin + stArmed.attackDamageMax) / 2, 9);
    expect(stArmed.maxHit).toBe(stArmed.attackDamageMax); // ungerundet (Anzeige rundet, §7.1)
    expect(stArmed.minHit).toBe(stArmed.attackDamageMin);
    // Tempo ABSOLUT (§1.4): Basis = Waffen-attackIntervalMs statt 3000.
    expect(stArmed.attackIntervalMs).toBe(stBare.attackIntervalMs - (3000 - 2800));
  });

  it("Legacy-Form (Alt-Content): Spanne aus dem Flat (max = Flat×MULT, min = max×FLOOR); Tempo bleibt Delta", () => {
    const c = withContent([
      {
        id: "fx_legacy_sword",
        name: "Alt-Klinge",
        type: "equipment",
        stackable: false,
        slot: "mainhand",
        weaponStyle: "melee",
        weaponType: "sword",
        bonus: { meleeDamage: 4, attackIntervalMs: -300 },
      },
    ]);
    const s = createGame({ name: "FX" }, c, 1);
    s.character.equipment.mainhand = "fx_legacy_sword";
    const st = computeStats(s, c);
    // Flat fließt wie bisher in meleeDamage; die Spanne wird daraus abgeleitet.
    expect(st.attackDamageMax).toBeCloseTo(st.meleeDamage * DMG_MAX_HIT_MULT, 9);
    expect(st.attackDamageMin).toBeCloseTo(st.attackDamageMax * DMG_ROLL_FLOOR, 9);
    // attackDamage = Mittel der Spanne ≈ alter Flat (Abweichung < 0,002 % — dokumentierte Rundung).
    expect(st.attackDamage).toBeCloseTo(st.meleeDamage, 2);
    // Tempo: Legacy-Delta −300 wirkt wie bisher (3000er-Basis).
    const bare = createGame({ name: "FX" }, c, 1);
    bare.character.equipment.mainhand = null;
    expect(st.attackIntervalMs).toBe(computeStats(bare, c).attackIntervalMs - 300);
  });

  it("echter Content (bronze_sword) läuft über den NEUEN Range-Pfad (itemization-parity-fix §1.1: Waffen 2.0 komplett — kein Alt-Content mehr im Katalog)", () => {
    // Vor itemization-parity-fix trug bronze_sword noch bonus.meleeDamage (Legacy-Pfad, s. Fixture-
    // Test oben). Der Content-Apply hat ALLE Waffen (Craft-Linien + Uniques) auf damageMin/damageMax
    // umgestellt — dieser Test pinnt das: kein bonus-Kampf-Flat mehr, echte Range-Form-Ableitung.
    const item = content.items.bronze_sword!;
    expect(item.damageMin).toBeGreaterThan(0);
    expect(item.damageMax).toBeGreaterThan(item.damageMin!);
    expect(item.bonus).toBeUndefined();

    const s = createGame({ name: "FX" }, content, 1);
    s.character.equipment.mainhand = "bronze_sword";
    const st = computeStats(s, content);
    expect(st.attackDamageMin).toBeCloseTo(st.meleeDamage + item.damageMin!, 9);
    expect(st.attackDamageMax).toBeCloseTo(st.meleeDamage + item.damageMax!, 9);
    expect(st.maxHit).toBe(st.attackDamageMax);
    expect(st.minHit).toBe(st.attackDamageMin);
  });

  it("Range-Form-Waffe: eigene bonus-Offensiv-Flats werden ignoriert (Doppelzähl-Schutz), Whitelist (lifesteal) bleibt", () => {
    const mk = (bonus: ItemDef["bonus"]): ContentDB =>
      withContent([
        {
          id: "fx_range_sword",
          name: "Spannen-Klinge",
          type: "equipment",
          stackable: false,
          slot: "mainhand",
          weaponStyle: "melee",
          weaponType: "sword",
          damageMin: 5,
          damageMax: 9,
          attackIntervalMs: 2800,
          bonus,
        },
      ]);
    const clean = createGame({ name: "FX" }, mk(undefined), 1);
    clean.character.equipment.mainhand = "fx_range_sword";
    const dirtyContent = mk({ meleeDamage: 50, accuracy: 50, attackIntervalMs: -900, lifesteal: 0.1 });
    const dirty = createGame({ name: "FX" }, dirtyContent, 1);
    dirty.character.equipment.mainhand = "fx_range_sword";

    const stClean = computeStats(clean, mk(undefined));
    const stDirty = computeStats(dirty, dirtyContent);
    expect(stDirty.attackDamageMin).toBe(stClean.attackDamageMin); // meleeDamage-Flat ignoriert
    expect(stDirty.accuracy).toBe(stClean.accuracy); // acc-Flat ignoriert
    expect(stDirty.attackIntervalMs).toBe(stClean.attackIntervalMs); // Tempo-Delta ignoriert (absolut zählt)
    expect(stDirty.lifestealPct).toBeCloseTo(0.1, 9); // Signatur-Whitelist wirkt weiter
  });

  it("Bogen-Spanne ist munitionsfrei (#286): reine Charakter+Waffen-Spanne, tote Legacy-Ammo-Felder ändern NICHTS", () => {
    // Der frühere „Munition zählt in die Spanne"-Guard ist invertiert: ammoType/ammoDamage existieren
    // nicht mehr im ItemDef-Typ — ein Alt-Katalog-Item, das sie (via Cast angeheftet) noch trägt,
    // darf die Spanne NICHT ändern (Double-Dip-Regression wäre sofort sichtbar).
    const mkBow = (withLegacyFields: boolean) => {
      const bow = {
        id: "fx_range_bow",
        name: "Spannen-Bogen",
        type: "equipment",
        stackable: false,
        slot: "mainhand",
        weaponStyle: "ranged",
        weaponType: "shortbow",
        damageMin: 4,
        damageMax: 8,
        attackIntervalMs: 2850,
      } as ItemDef;
      // totes Alt-Feld anheften (nur noch als Raw-Key möglich — genau wie in einem Alt-Save/-Katalog)
      if (withLegacyFields) (bow as unknown as Record<string, unknown>).ammoType = "crude_arrow";
      return withContent([bow]);
    };
    const run = (withLegacyFields: boolean) => {
      const c = mkBow(withLegacyFields);
      const s = createGame({ name: "FX" }, c, 1);
      s.character.equipment.mainhand = "fx_range_bow";
      return computeStats(s, c);
    };
    const legacy = run(true);
    const clean = run(false);
    expect(legacy.attackDamageMin).toBeCloseTo(clean.attackDamageMin, 9);
    expect(legacy.attackDamageMax).toBeCloseTo(clean.attackDamageMax, 9);
    // Spanne = Charakter-Anteil + Waffen-min/max (kein weiterer Summand).
    expect(legacy.attackDamageMax - legacy.attackDamageMin).toBeCloseTo(8 - 4, 9);
  });

  it("accuracy ist UNGERUNDET und offenseSkill wiegt 0.35 — der +1-Boost-Rundungs-Schlucker ist tot (§8.1)", () => {
    const c = withContent([
      {
        id: "fx_boost_ring",
        name: "Ring des Angriffs",
        type: "equipment",
        stackable: false,
        slot: "ring1",
        skillBoost: { attack: 1 },
      },
    ]);
    const s = createGame({ name: "FX" }, c, 1);
    s.character.equipment.mainhand = null;
    const base = computeStats(s, c);
    // Ungerundet: der Wert trägt einen Nachkommaanteil (vorher round() → Ganzzahl).
    expect(base.accuracy).not.toBe(Math.round(base.accuracy));
    // +1 Attack-Boost ist IMMER sichtbar: exakt +0.35·accMult (Attack-Stance ×1.12).
    s.character.equipment.ring1 = "fx_boost_ring";
    const boosted = computeStats(s, c);
    expect(boosted.accuracy).toBeGreaterThan(base.accuracy);
    expect(boosted.accuracy - base.accuracy).toBeCloseTo(0.35 * 1.12, 9);
  });
});
