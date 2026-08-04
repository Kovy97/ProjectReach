import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { EquipSlot, GameState, ItemId, WeaponStyle } from "@hearthforge/shared";
import { PARAGON_DUNGEON_ID, PARAGON_KEY_ITEM_ID } from "@hearthforge/shared";
import { computeStats } from "./character";
import { unlockDungeonsForKey } from "./dungeon";
import { addItem, expandBaseCapacity } from "./inventory";
import { xpForLevel } from "./leveling";
import { startParagonFloor } from "./paragon";
import { createGame } from "./state";
import { advance } from "./tick";

/**
 * Paragonturm-Machbarkeits-Korridor (BLOCKER-Fix Welle BB, 2026-07-16).
 *
 * Befund (design/fun-review/paragon-aldric.md #1): `paragonScaledMonster` erbte die
 * SEKUNDÄRWERTE der L175–242-Pool-Monster roh (Rüstung 90–170, Enrage ×1,7–1,8, Ausweichen 86,
 * Regen, Inflicts) — der Turm begann oberhalb der Story-Endgame-Decke und Chronik-Kapitel 21
 * („Erreiche Etage 5") war mit realistischem Gear unabschließbar. Fix: Sekundärwert-Rampe +
 * HP-Onramp in paragon.ts; Kalibrierung/Messwerte in design/balance-paragon-calibration.md.
 *
 * Diese Suite friert den beschlossenen Korridor als DETERMINISTISCHE Engine-Sims ein
 * (echtes `advance`→`combatStep`, feste Seeds — kein Flake; Muster: paragon.test.ts Envelope):
 *  §1 Etage 1: Tod-Risiko 0, TTK ≤ ~30 s (Median-Toleranz 36 s) — „unten Tempo".
 *  §2 Kapitel-21-Onramp: E1→E5 ohne Tod ≥ 70 % je Stil, ≥ 80 % über alle Stile (gemessen
 *     2026-07-16: 100 % je Stil bei N=150 — die Schwellen sind bewusst tolerant, damit normale
 *     Combat-Balance-Wellen den Guard nicht reißen, ein Regressions-Rückfall Richtung
 *     „Wand auf Etage 3" aber sofort).
 *  §3 Oben bleibt der Turm hart: E10 fordernd (Tod-Risiko sichtbar), E20 = Wand für das
 *     Referenz-Loadout (BiS-/Suffix-Territorium; ab E20 sind Rampe & Onramp exakt ×1 —
 *     Formel-Guard in paragon.test.ts — d.h. die Alt-Härte dort ist unverändert).
 *
 * REFERENZ-LOADOUT = das Kapitel-20-„craft"-Loadout des Drazhan-Audits (§3, design/
 * balance-drazhan-audit.md): 100 % craft-garantiert — volles Godiron-Panzer-Set + Kiteschild +
 * Godgem-Schmuck, Tier-III-Runen (Waffen-Rune je Stil, Ägide auf jedem Panzerteil), Skills 99,
 * Auto-Eat Tier 3 mit soulfire_banquet. Waffen-Stil-Parität über den Rüstungs-Wechsel des
 * Audits: godiron_mace / godiron_shortbow (1H) / godiron_wand + Schild.
 * KEINE Suffixe, kein Pet, keine Chase-Items, KEIN Auto-Trank, KEINE Tonika — bewusst der
 * nackte, garantierte Craft-Floor.
 *
 * TRANK-/TONIKA-HONESTY (SAVE-69-Fund, 2026-07-18): die ursprüngliche Fassung DEKLARIERTE
 * godbloom_infusion @40 % + 3 Tonika, aber beim alten MAX_STACK 999 fraßen die 100k Banquet
 * ALLE ~80 Slots — Tränke/Tonika kamen real NIE ins Inventar (addItem lieferte 0, useConsumable
 * false). Die komplette Welle-BB-Kalibrierung (Onramp-Quoten, „E10 fordernd, E20 Wand") wurde
 * also faktisch am potion-losen Floor gemessen. Mit MAX_STACK 9999 passte plötzlich alles —
 * und der Korridor kippte: E10–E18 todesfrei, E20-Boss fällt für Melee in 2/6 Läufen (Messung
 * 2026-07-18, N=6 je Stil). Damit dieser Guard weiter EXAKT die kalibrierte Größe misst, ist
 * der Trank-/Tonika-Verzicht jetzt EXPLIZIT (kein stiller Fixture-Nebeneffekt mehr). Der
 * Balance-Befund „Kapitel-20-Gear + Auto-Trank/Tonika trivialisiert E10–E18" liegt beim
 * CEO/balance-designer (Kandidat für den Armor-Trinity-/Turm-Balance-Block) — ein Turm-Härtungs-
 * Pass misst dann ehrlich NEU und pinnt beide Varianten.
 */

const ARMOR: Partial<Record<EquipSlot, ItemId>> = {
  helmet: "godiron_fullhelm",
  body: "godiron_platebody",
  legs: "godiron_platelegs",
  gloves: "godiron_gauntlets",
  boots: "godiron_sabatons",
  amulet: "godgem_amulet",
  ring1: "godgem_ring",
  ring2: "godgem_ring",
  offhand: "godiron_kiteshield",
};
const WEAPON: Record<WeaponStyle, ItemId> = {
  melee: "godiron_mace",
  ranged: "godiron_shortbow",
  magic: "godiron_wand",
};
const WEAPON_AFFIX: Record<WeaponStyle, string> = {
  melee: "affix_keen",
  ranged: "affix_hunter",
  magic: "affix_arcane",
};
const STYLES: WeaponStyle[] = ["melee", "ranged", "magic"];

/** Existenz-Guard: reißt laut bei Content-Renames statt still ein schwächeres Loadout zu messen. */
function assertLoadoutContent(): void {
  const ids: ItemId[] = [
    ...Object.values(ARMOR),
    ...Object.values(WEAPON),
    "soulfire_banquet",
  ];
  for (const id of ids) expect(content.items[id], `Loadout-Item ${id} fehlt im Content`).toBeDefined();
  for (const a of [...Object.values(WEAPON_AFFIX), "affix_aegis"]) {
    expect(content.affixes?.[a], `Loadout-Affix ${a} fehlt im Content`).toBeDefined();
  }
}

/** Baut das Kapitel-20-Referenz-Loadout (s. Kopfkommentar) als echten GameState. */
function buildChapter20(style: WeaponStyle, seed: number): GameState {
  const s = createGame({ name: `C20-${style}` }, content, seed);
  for (const skillId of Object.keys(content.skills)) s.skills[skillId] = { xp: xpForLevel(99) };
  for (const slot of Object.keys(s.character.equipment) as EquipSlot[]) {
    s.character.equipment[slot] = null;
  }
  s.character.equipment.mainhand = WEAPON[style];
  for (const [slot, id] of Object.entries(ARMOR) as Array<[EquipSlot, ItemId]>) {
    s.character.equipment[slot] = id;
  }
  const eqi: NonNullable<GameState["character"]["equippedInstances"]> = {
    mainhand: {
      instanceId: "c20-mainhand",
      baseItemId: WEAPON[style],
      affixes: [{ affixId: WEAPON_AFFIX[style], tier: 3 }],
    },
  };
  for (const slot of ["helmet", "body", "legs", "gloves", "boots", "offhand"] as EquipSlot[]) {
    eqi[slot] = {
      instanceId: `c20-${slot}`,
      baseItemId: ARMOR[slot]!,
      affixes: [{ affixId: "affix_aegis", tier: 3 }],
    };
  }
  s.character.equippedInstances = eqi;

  expandBaseCapacity(s.inventory, content, 60);
  // Nur Auto-Eat-Food — BEWUSST keine Tränke/Tonika (s. Kopfkommentar TRANK-/TONIKA-HONESTY:
  // die Welle-BB-Kalibrierung wurde faktisch am potion-losen Floor gemessen; hier explizit).
  addItem(s.inventory, content, "soulfire_banquet", 100_000);
  s.character.food = "soulfire_banquet";
  s.character.autoEatTier = 3;
  const stats = computeStats(s, content);
  s.character.hp = stats.maxHp;
  s.character.mana = stats.maxMana;
  s.character.ward = stats.maxWard;
  const newly = unlockDungeonsForKey(s, content, PARAGON_KEY_ITEM_ID);
  expect(newly).toContain(PARAGON_DUNGEON_ID);
  return s;
}

interface ClimbResult {
  /** Höchste ohne Tod/Patt geclearte Etage (absolut). */
  cleared: number;
  died: boolean;
  stalled: boolean;
  /** Sim-TTK je gekämpfter Etage (ms, 500-ms-Raster). */
  ttksMs: number[];
}

/** Klettert deterministisch von Etage `fromFloor` bis `toFloor` (Clear/Tod/Patt), inkl. Heilpause. */
function climb(s: GameState, fromFloor: number, toFloor: number): ClimbResult {
  s.paragon ??= { checkpoint: 0, best: 0 };
  s.paragon.checkpoint = fromFloor - 1;
  const ttksMs: number[] = [];
  for (let f = fromFloor; f <= toFloor; f++) {
    if (!startParagonFloor(s, content)) return { cleared: f - 1, died: false, stalled: true, ttksMs };
    let t = 0;
    while (s.combat.monsterId !== null && t < 900_000) {
      advance(s, content, 500);
      t += 500;
    }
    if (s.stats.deaths > 0) return { cleared: f - 1, died: true, stalled: false, ttksMs };
    if (s.combat.stopReason === "stalemate" || t >= 900_000) {
      return { cleared: f - 1, died: false, stalled: true, ttksMs };
    }
    ttksMs.push(t);
    // Heilpause zwischen den Etagen (die Etagen-Pause ist laut Spec explizit zum Aufstocken da):
    // natürliche 1 %/s-Out-of-Combat-Regen bis voll (Guard 4 min Sim-Zeit).
    const stats = computeStats(s, content);
    let p = 0;
    while (s.character.hp < stats.maxHp - 0.5 && p < 240_000) {
      advance(s, content, 1000);
      p += 1000;
    }
  }
  return { cleared: toFloor, died: false, stalled: false, ttksMs };
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

describe("Paragon-Korridor (Welle BB): Kapitel 21 mit Kapitel-20-Gear machbar, oben bleibt hart", () => {
  it("Existenz-Guard: das Referenz-Loadout ist vollständig im Content", () => {
    assertLoadoutContent();
  });

  it(
    "§1+§2 E1→E5: je Stil ≥ 70 % ohne Tod (pooled ≥ 80 %), Etage 1 ohne Tod-Risiko und mit Tempo",
    { timeout: 300_000 },
    () => {
      const N = 25;
      let pooledOk = 0;
      for (const style of STYLES) {
        let ok = 0;
        let diedBeforeFloor2 = 0;
        const ttk1: number[] = [];
        for (let n = 0; n < N; n++) {
          const s = buildChapter20(style, 1000 + n * 17);
          const r = climb(s, 1, 5);
          if (r.ttksMs[0] !== undefined) ttk1.push(r.ttksMs[0]);
          if (r.cleared >= 5) ok++;
          if (r.died && r.cleared < 1) diedBeforeFloor2++;
        }
        pooledOk += ok;
        // §2: Kapitel-21-Onramp je Stil (gemessen 100 % @N=150; Schwelle bewusst tolerant).
        expect(ok / N, `${style}: E1→E5-Erfolgsquote`).toBeGreaterThanOrEqual(0.7);
        // §1: Etage 1 tötet den Kapitel-20-Sieger nicht (Korridor „Tod-Risiko ≈ 0 %").
        expect(diedBeforeFloor2, `${style}: Tode auf Etage 1`).toBe(0);
        // §1: „unten Tempo" — Median-TTK Etage 1 ≤ 36 s (Ziel ~30 s; gemessen 22/31/33,5 s).
        expect(median(ttk1), `${style}: Median-TTK Etage 1`).toBeLessThanOrEqual(36_000);
      }
      expect(pooledOk / (N * STYLES.length), "E1→E5 über alle Stile").toBeGreaterThanOrEqual(0.8);
    },
  );

  it(
    "§3 Oben bleibt der Turm hart: E10 fordernd, E20 = Wand fürs Referenz-Loadout",
    { timeout: 300_000 },
    () => {
      // E10 (frisch angesetzt): kein Freilauf — mindestens EIN Tod über die Stile hinweg
      // (Tod-Risiko sichtbar), aber für Melee auch kein Totalausfall (keine neue Wand unten).
      const N = 6;
      let e10Deaths = 0;
      let e10MeleeClears = 0;
      for (const style of STYLES) {
        for (let n = 0; n < N; n++) {
          const s = buildChapter20(style, 5000 + n * 13);
          const r = climb(s, 10, 10);
          if (r.died) e10Deaths++;
          else if (r.cleared >= 10 && style === "melee") e10MeleeClears++;
        }
      }
      expect(e10Deaths, "E10: Tod-Risiko muss sichtbar sein").toBeGreaterThanOrEqual(1);
      expect(e10MeleeClears, "E10: Melee-Referenz cleart noch (keine neue Wand)").toBeGreaterThanOrEqual(1);
      // E20 (Boss, Rampe & Onramp exakt ×1 ⇒ Alt-Härte): das suffix-lose Referenz-Loadout
      // kommt NICHT durch — BiS-/Suffix-Territorium bleibt BiS-/Suffix-Territorium.
      let e20Clears = 0;
      for (let n = 0; n < 4; n++) {
        const s = buildChapter20("melee", 7000 + n * 29);
        const r = climb(s, 20, 20);
        if (r.cleared >= 20) e20Clears++;
      }
      expect(e20Clears, "E20 darf für das suffix-lose Referenz-Loadout keine Freikarte sein").toBe(0);
    },
  );
});
