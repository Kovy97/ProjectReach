import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, ItemInstance, WeaponStyle } from "@hearthforge/shared";
import {
  ARMOR_PEN_CAP,
  ATTACK_INTERVAL_FLOOR_MS,
  BLOCK_CAP,
  CRIT_CHANCE_CAP,
  CRIT_DAMAGE_CAP,
  DEFENSE_MITIGATION_K,
  DEFENSE_MITIGATION_MAX,
  DMG_MAX_HIT_MULT,
  DMG_ROLL_FLOOR,
  DODGE_CAP,
  LEATHER_HIT_FLOOR,
  MASTER_PERK_CAP,
  MASTERY_DOUBLE_CAP,
  PET_SKILL_EFFECT_CAP,
  poolCheckpointBonus,
  PRECISION_CAP,
  RANGED_INTERVAL_FLOOR_MS,
  SELL_FRACTION,
  TEMPO_REDUCTION_CAP,
  WARD_BREAK_CAP,
  instanceBonusDelta,
  masterRingItemId,
} from "@hearthforge/shared";
import { computeStats } from "./character";
import { combinedFloorDodge, enemyEffectiveAccuracy } from "./combat";
import { combatLevel } from "./dungeon";
import { buildBisCharacter, monsterClosestTo } from "./balance-envelope-helpers";
import type { BisBuild, BisTarget } from "./balance-envelope-helpers";

/**
 * Balance-Envelope-Suite („BiS-Red-Team", Chef-GO 2026-07-09).
 *
 * Hintergrund: Stacking-Lecks tauchten wiederholt erst im Live-Test auf (Crit-One-Hit → gezähmt
 * #294; aktuell offen: Evasion-Stacking + Attack-Speed-Stacking). Diese Suite baut die Worst-Case-
 * Charaktere AUTOMATISCH aus dem echten Content-Katalog (buildBisCharacter, verallgemeinert den
 * Voll-Stack-Guard aus crit-taming.test.ts) und friert die Stat-Envelopes ein:
 *
 *  §1 Existenz-Guards — die Suite darf nie stumm degradieren, wenn Content umbenannt wird.
 *  §2 Harte Caps — alles bereits Gezähmte/Gebodente hält auch im maximal legalen Voll-Stack.
 *  §3 Cap-Bindungs-Detektoren — wo der Voll-Stack den Cap HEUTE exakt erreicht, wird das gepinnt
 *     (erreicht er ihn plötzlich nicht mehr ODER erst gar nicht, hat sich die Balance verschoben).
 *  §4 Gepinnte Worst-Case-Tabelle — reale Messwerte als Regression-Detektor (KEINE Wunschwerte).
 *  §5 Messmatrix Evasion/Tempo/TTK — seit #301 (evasion-tempo-taming-spec, CHEF-GO) GEZÄHMT und
 *     NEU GEPINNT: aus den Mess-Pins des kaputten Zustands wurden harte Cap-Asserts
 *     (Dodge ≤ 0.40, Intervall ≥ base·0.8, Boss-Land-Chance real) plus frische Messwerte.
 *  §6 Runen-Stapelung — seit dem Chef-Entscheid 25.08.2026 ERLAUBT (die `duplicate_affix`-Sperre
 *     aus #303 L4 ist gefallen): drei Slots nehmen drei gleiche Runen, die Stat-Boni summieren
 *     sich. Nur Waffen-Procs entdoppelt `effectiveInstanceWeaponEffects` weiterhin.
 *  §7 Ökonomie-Schnellcheck — kein profitabler Kauf→Verkauf-Loop im Shop (inkl. Pet-Verkaufsbonus).
 *
 * NEU VERMESSEN 2026-08-25 (Chef-Entscheid Runen-Stapelung): „Voll-Stack" heißt weiterhin „bester
 * Buff JE Kategorie" (#303 L3, unverändert), bei der Verzauberung aber wieder „der beste Affix
 * auf ALLEN Rarity-Slots" statt der Top-N-Bestenliste verschiedener Affixe. Folge: Dodge-Cap
 * (ab CL 60) und Mitigations-Cap (CL 90) werden vom theoretischen BiS-Build wieder ERREICHT —
 * beides sind Clamps, es läuft nichts über, aber die Kopffreiheit ist weg. Krit und Block (CL 90)
 * erreichen ihre Deckel wie bisher.
 *
 * OFFEN FÜR DEN CHEF (nicht stillschweigend weggepinnt): der Ward-Pool des BiS-Stoff-Builds
 * springt bei CL 90 von 779,5 auf 1179,5 (≈ 1,6× maxHp, dieselbe Größenordnung, die #303 seinerzeit
 * senken sollte). Wenn das zu weit geht, wäre die kleinste Bremse, TRINITY-Runen (armorRating/
 * evasionRating/wardCapacity/blockChance) vom Stapeln auszunehmen — die reinen Stat-Runen sind an
 * keinem der Deckel beteiligt.
 *
 * Alle Builds sind deterministisch (kein RNG-Draw) und rein content-gescannt (kein Id-Hardcoding
 * im Builder; Pins nennen Ids nur als DETEKTOR — reißt ein Pin, bewusst neu messen & pinnen).
 */

const STYLES: WeaponStyle[] = ["melee", "ranged", "magic"];
const TIERS = [30, 60, 90] as const;
const TARGETS: BisTarget[] = ["crit", "haste", "dodge", "tank", "lifesteal", "ward", "damage"];

/** Trefferchancen-Boden aus combat.ts (MIN_HIT_CHANCE, dort modul-lokal). */
const MIN_HIT_CHANCE = 0.1;

/** Build-Cache (Suite baut jede Kombination genau einmal — rein deterministisch). */
const buildCache = new Map<string, BisBuild>();
function bis(style: WeaponStyle, lvl: number, target: BisTarget): BisBuild {
  const key = `${style}|${lvl}|${target}`;
  let b = buildCache.get(key);
  if (!b) {
    // claude:2026-10-25T06:00:00+02:00 — 1.4.0: Raid-Teile außen vor, die Pins messen den Bestand (Raid: eigene Messung, Apply #12).
    b = buildBisCharacter(content, style, lvl, target, { allBuffs: true, excludeRaid: true });
    buildCache.set(key, b);
  }
  return b;
}

/** Gedeckelte Gegner-Mitigation wie in resolveAttack (combat.ts). */
function mitigation(defense: number): number {
  return Math.min(DEFENSE_MITIGATION_MAX, defense / (defense + DEFENSE_MITIGATION_K));
}

/** Trefferchance des Accuracy-Contests wie in resolveAttack (inkl. MIN_HIT_CHANCE-Boden). */
function hitChance(accuracy: number, evasion: number): number {
  const sum = accuracy + evasion;
  return Math.max(MIN_HIT_CHANCE, sum > 0 ? accuracy / sum : 0.5);
}

// ───────────────────────────────────────────────────────────────────────────
// §1 Existenz-Guards: Content-Anker der Suite (nie stumm degradieren)
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §1: Existenz-Guards", () => {
  it("Referenz-Bosse existieren mit den erwarteten Leveln (Basis der ±Level-Messungen)", () => {
    expect(content.monsters.idol_warden?.level, "idol_warden Level").toBe(245);
    expect(content.monsters.last_idol?.level, "last_idol Level").toBe(295);
  });

  it("die Stack-Träger existieren: Tempo-/Krit-Suffixe, Evasion-Rune/-Tonikum, Kriegsgebräu, Pets", () => {
    // Soft-Stat-Suffixe (Tempo/Krit) — ohne sie prüft die Suite nicht mehr den Stack, den sie behauptet.
    expect(content.suffixes?.suffix_wolf?.softStats).toContain("attackIntervalMs");
    expect(content.suffixes?.suffix_viper?.softStats).toContain("attackIntervalMs");
    expect(content.suffixes?.suffix_executioner?.softStats).toEqual(
      expect.arrayContaining(["critChance", "critDamage"]),
    );
    // Evasion-Schiene: Leder-Rune + Tonikum (Trinity-Schicht).
    expect(content.affixes?.affix_evasion?.trinityByTier?.[2]?.evasionRating).toBeGreaterThan(0);
    expect(content.items.tonic_keeneye?.buff?.trinity?.evasionRating).toBeGreaterThan(0);
    // Stärkster Tempo/Krit-Buff (crit-taming-Anker) trägt beide Zeilen.
    const brew = content.items.slayer_war_brew?.buff?.bonus;
    expect(brew?.attackIntervalMs).toBeLessThan(0);
    expect(brew?.critChance).toBeGreaterThan(0);
    // Globale Kampf-Pet-Passiva existieren im Katalog. claude:2026-10-18T02:00:00+02:00 — 1.3.0: das sellBonus-Pet entfällt
    // (Pergamotte trägt jetzt „Archivar"), dafür Stilschaden/Essensheilung/Ward-Kapazität.
    const kinds = new Set(Object.values(content.pets ?? {}).map((p) => p.skillEffect?.kind));
    for (const kind of ["lifesteal", "damageReduction", "styleDamage", "foodHealBonus", "wardCapacityPct"]) {
      expect(kinds, `Pet-Passiv ${kind}`).toContain(kind);
    }
  });

  it("buildBisCharacter liefert volle Kits und exakt das Ziel-Kampflevel (CL == targetLevel)", () => {
    for (const lvl of TIERS) {
      const b = bis("melee", lvl, "crit");
      expect(combatLevel(b.state), `CL bei targetLevel ${lvl}`).toBe(lvl);
      // Kein still-leeres Kit: Waffe + alle 7 Rüstungs-/Schmuck-Kernslots + beide Ringe belegt.
      for (const slot of ["mainhand", "helmet", "amulet", "body", "legs", "gloves", "boots", "cape", "ring1", "ring2"] as const) {
        expect(b.kit[slot], `Slot ${slot} bei CL ${lvl}`).toBeTruthy();
      }
      // Der Voll-Stack trägt wirklich Suffixe + Buffs (sonst misst die Suite einen leeren Build).
      // Re-Messung 2026-08-25 (Chef-GO 1.1.0, #p14 Rüstungsklassen-Trennung): bei CL 30 sinkt die
      // Zahl auf genau 5 (Waffe/Amulett/Cape/beide Ringe) — Platte (body/legs/gloves/boots) hat in
      // diesem niedrigen Ilvl-Band keinen crit-relevanten Suffix mehr im Pool (Phantom/Lynx sind
      // jetzt armor_leather) und kein Leder-Ersatzteil schlägt dort Platte auf den Rohwerten; ab
      // CL 60 (ilvl ≥ minIlvl 50 von Phantom) weicht der Builder für diese Slots auf Leder-Rüstung
      // aus und bleibt bei 9. Weiterhin ≥5 (nie ein leerer Voll-Stack).
      expect(Object.keys(b.suffixBySlot).length).toBeGreaterThanOrEqual(5);
      // #303 L3: „alle Buffs" = bester Buff JE Kategorie — für crit sind das heute genau
      // offense (slayer_war_brew) + food (soulfire_banquet); andere Kategorien scoren crit nicht.
      expect(b.buffIds.length).toBeGreaterThanOrEqual(2);
      expect(b.buffIds).toContain("slayer_war_brew");
      // Exklusivitäts-Invariante des Helpers: keine zwei kategorisierten Buffs teilen eine Kategorie.
      const cats = b.buffIds
        .map((id) => content.items[id]?.buff?.category)
        .filter((c): c is NonNullable<typeof c> => !!c);
      expect(new Set(cats).size).toBe(cats.length);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §2 Harte Caps im Voll-Stack (CL 30/60/90 × 3 Stile × alle Ziel-Builds)
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §2: harte Caps halten im maximal legalen Voll-Stack", () => {
  for (const lvl of TIERS) {
    for (const style of STYLES) {
      it(`CL ${lvl} / ${style}: alle Deckel halten über alle Ziel-Builds`, () => {
        for (const target of TARGETS) {
          const st = computeStats(bis(style, lvl, target).state, content);
          const tag = `${target}@CL${lvl}/${style}`;
          // Crit-Zähmung #294 — beide Deckel auch im Voll-Stack (Gear+Suffix+alle Buffs).
          expect(st.critChance, `critChance ${tag}`).toBeLessThanOrEqual(CRIT_CHANCE_CAP);
          expect(st.critDamage, `critDamage ${tag}`).toBeLessThanOrEqual(CRIT_DAMAGE_CAP);
          // Tempo-Boden: kein Build unterschreitet das harte 800-ms-Intervall.
          expect(st.attackIntervalMs, `interval ${tag}`).toBeGreaterThanOrEqual(ATTACK_INTERVAL_FLOOR_MS);
          // Defensiv-Deckel: Dodge/Block/Mitigation/Lifesteal/Pet-DR.
          expect(st.dodgeChance, `dodge ${tag}`).toBeLessThanOrEqual(DODGE_CAP);
          expect(st.blockChance, `block ${tag}`).toBeLessThanOrEqual(BLOCK_CAP);
          expect(mitigation(st.defense), `mitigation ${tag}`).toBeLessThanOrEqual(DEFENSE_MITIGATION_MAX);
          expect(st.lifestealPct, `lifesteal ${tag}`).toBeLessThanOrEqual(1);
          expect(st.damageReduction, `petDR ${tag}`).toBeLessThanOrEqual(
            PET_SKILL_EFFECT_CAP.damageReduction ?? 0.04,
          );
          // Konter-Signaturen bleiben in ihren Caps.
          expect(st.armorPen, `armorPen ${tag}`).toBeLessThanOrEqual(ARMOR_PEN_CAP);
          expect(st.precision, `precision ${tag}`).toBeLessThanOrEqual(PRECISION_CAP);
          expect(st.wardBreak, `wardBreak ${tag}`).toBeLessThanOrEqual(WARD_BREAK_CAP);
        }
      });
    }
  }
});

// ───────────────────────────────────────────────────────────────────────────
// §3 Cap-Bindungs-Detektoren: wo der Voll-Stack den Deckel HEUTE exakt erreicht
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §3: Cap-Bindungs-Detektoren (heutige Realität)", () => {
  it("Krit-Voll-Stack erreicht BEIDE Caps exakt — auch nach #303 (Gear+Suffix tragen; Buffs geben nur noch max +0.20 via war_brew)", () => {
    // Re-Messung 2026-07-09 nach L3-Exklusivität: der Buff-Anteil fällt von Σ +1.04 auf +0.20
    // (bestes offense-Tonikum), die Caps binden TROTZDEM ab CL 30 — der Krit-Träger ist die
    // Gear-/Suffix-/Attribut-Schiene, nicht das Tonika-Stacking. Bewusst gepinnt als Detektor.
    // Re-Messung 2026-08-25 (Chef-GO 1.1.0, design/rezension-patch-2026-08-25.html #p14, Rüstungs-
    // klassen-Trennung): suffix_phantom/suffix_lynx/suffix_tiger tragen dex nur noch auf Leder statt
    // auf jeder Rüstung — bei CL 30 reicht das dem Builder nicht mehr, um für melee/ranged/magic den
    // 0.5-Deckel zu erreichen (der Pin bricht §3 exakt wie im Design-Dokument vorhergesagt). Ab CL 60
    // (ilvl ≥ minIlvl 50 von Phantom) tauscht der Builder die Rüstungsslots gegen Leder-Teile und
    // erreicht den Deckel wieder — GEMESSEN, nicht der grobe Vorab-Schätzwert aus dem Design-Dokument
    // (0,438/0,461/0,485 dort war eine Pool-Emulation ohne die echte Item-/Builder-Logik). Der Krit-
    // Schaden bleibt am Cap 2,50 auf jeder Stufe/jedem Stil (unverändert).
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): die vier
    // umgetypten Endgame-Gerichte (voidray_banquet/ambergrain_feast/abyssal_feast/risotto_starcap,
    // s. #p11 Regel 3) tragen jetzt Trinity-Werte UND leicht andere Attribut-Splits (z.B.
    // abyssal_feast dex+4→+6, lck+2→+3) — der "beste Food je Kategorie"-Pick des Builders wechselt
    // dadurch teils das Item, was die Attribut-Summe (u.a. lck, das überall in critChance einfließt)
    // minimal anhebt: 0.4367/0.4955/0.4355 → 0.4376/0.4963/0.4363 (CL30, alle Stile, +0.0008..0.0009).
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): CL30/melee
    // steigt 0.4376→0.4920 — der Voll-Stack-Builder greift jetzt zu einem der neu angehobenen
    // Nahkampf-Drops (Requirement jetzt im CL30-Fenster, lck/Kernwerte über dem alten Craft-Pick).
    // CL30/ranged erreicht jetzt sogar den 0.5-Deckel exakt (0.4963→0.5, ein neu angehobener
    // Fernkampf-Drop trägt genug lck) — Sonderfall unten separat behandelt. CL30/magic steigt
    // ebenfalls (0.4363→0.4871, ein neu angehobener Fokus-/Stab-Drop trägt mehr lck).
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, design/stil-paritaet-2026-08-26.md
    // §4a A1–A4/A7): der "crit"-Score (scoreContribution) ist STIL-UNABHÄNGIG (dex·0.4+lck·0.6) und
    // gilt für ALLE Nicht-Waffen-Slots gleich (nur die Waffe selbst wird per weaponStyle gefiltert,
    // s. buildBisCharacter §2) — der Voll-Stack-Builder trägt für melee/ranged/magic denselben
    // Rüstungs-/Schmuck-/Buff-Satz. Die 11 neuen A3-Leder-Teile (u.a. ratpelt_cap dex1,
    // skirmisher_hide_jerkin dex1) UND das neue Attribut-Tonikum tonic_windstride (dex 6, "attribute"-
    // Kategorie, schlägt tonic_bloodrage[str 6] im dex/lck-Score) sind ab CL 30 requirement-legal und
    // heben den attribut-Score für ALLE DREI Stile gleichermaßen — CL30/melee erreicht dadurch jetzt
    // ebenfalls den 0.5-Deckel exakt (0.4920→0.5), CL30/magic ebenso (0.4871→0.5). Kein Melee-Item
    // wurde geändert; die Bewegung ist eine Konsequenz des stilneutralen Nicht-Waffen-Scorings, exakt
    // wie schon bei den vorigen Re-Messungen oben (Rezension #8 hob umgekehrt melee/ranged/magic
    // gemeinsam). Nahkampf-KIT bleibt unverändert an sich — nur der bereits vorher fast erreichte
    // Deckel bindet jetzt zusätzlich exakt.
    const CL30_CRIT_CHANCE: Record<WeaponStyle, number> = {
      melee: CRIT_CHANCE_CAP,
      ranged: CRIT_CHANCE_CAP,
      magic: CRIT_CHANCE_CAP,
    };
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 5, §1.7 Glücks-Pass): lck sinkt
    // katalogweit von 20,6 % auf 12,6 % des Schmuck-Attributbudgets (44 Ring-/Amulett-Items,
    // Summe je Stück unverändert — reine Umverteilung zu str/dex/int). Der crit-optimierte CL-30-
    // Voll-Stack (wenige Slots requirement-legal) erreicht dadurch erstmals NICHT mehr lck ≥ 100 für
    // den 2,50-critDamage-Deckel (1,5 + lck·0,01) — critChance (dex·0,4 + lck·0,6) bleibt am
    // 0,5-Deckel, weil der dex-Anteil den Verlust auffängt. Ab CL 60 sind genug zusätzliche Slots
    // legal, der Deckel bindet dort weiterhin exakt.
    // claude:2026-10-24T21:30:00+02:00 — 1.4.0 FK (Chef 24.10.: „Entscheide das Beste“, Gate B F1–F5 wie
    // empfohlen): Der Köcher bringt Glück in die Fernkampf-Nebenhand. Der CL-30-Crit-Stack erreicht damit auch im
    // Fernkampf den 2,50-Deckel (war 2,39). Clamp hält; Nahkampf und Magie unverändert.
    const CL30_CRIT_DAMAGE: Record<WeaponStyle, number> = {
      melee: 2.47,
      ranged: CRIT_DAMAGE_CAP,
      magic: 2.43,
    };
    for (const lvl of TIERS) {
      for (const style of STYLES) {
        const st = computeStats(bis(style, lvl, "crit").state, content);
        if (lvl === 30) {
          expect(st.critChance, `critChance CL${lvl}/${style}`).toBeCloseTo(CL30_CRIT_CHANCE[style], 4);
          expect(st.critDamage, `critDamage CL${lvl}/${style}`).toBeCloseTo(CL30_CRIT_DAMAGE[style], 4);
          continue;
        }
        expect(st.critChance, `critChance CL${lvl}/${style}`).toBe(CRIT_CHANCE_CAP);
        expect(st.critDamage, `critDamage CL${lvl}/${style}`).toBe(CRIT_DAMAGE_CAP);
      }
    }
  });

  it("Haste-Voll-Stack schlägt an den RELATIVEN T1-Boden (base·0.8, #301) — der 800er-Einheitsbrei ist weg", () => {
    // Evasion-Tempo-Zähmung #301 (CHEF-ENTSCHEID −20 %): Flat-Quellen (DEX-Kurve + Suffixe + Tonika)
    // drücken das Intervall max. 20 % unter die WAFFEN-Basis — der Voll-Stack bindet den relativen
    // Boden exakt (Cap erreichbar, by design), der absolute 800er-Boden bindet nie mehr.
    for (const lvl of TIERS) {
      const melee = bis("melee", lvl, "haste");
      expect(computeStats(melee.state, content).attackIntervalMs, `melee CL${lvl}`).toBe(
        melee.weaponBaseIntervalMs * (1 - TEMPO_REDUCTION_CAP),
      );
      const magic = bis("magic", lvl, "haste");
      expect(computeStats(magic.state, content).attackIntervalMs, `magic CL${lvl}`).toBe(
        magic.weaponBaseIntervalMs * (1 - TEMPO_REDUCTION_CAP),
      );
      // Fernkampf: relativer Boden → Stil-Mult ×0.9 (Zwischen-Boden 1000) → Fast-Stance ×0.85
      // (Stil-/Stance-Mults bleiben AUSSERHALB des relativen Bodens, Spec §3.5) ⇒ 2650er-Bogen 1621,8 ms.
      const ranged = bis("ranged", lvl, "haste");
      expect(computeStats(ranged.state, content).attackIntervalMs, `ranged CL${lvl}`).toBeCloseTo(
        Math.max(RANGED_INTERVAL_FLOOR_MS, ranged.weaponBaseIntervalMs * (1 - TEMPO_REDUCTION_CAP) * 0.9) * 0.85,
        6,
      );
    }
  });

  it("Dodge-Voll-Stack: seit der Runen-Stapelung bindet der 0.40-Cap ab CL 60 wieder", () => {
    // Re-Messung 2026-08-25 (Chef-Entscheid Runen-Stapelung): mit wieder duplizierten Evasion-III-
    // Runen steigt Σevr über die Cap-Schwelle 240 (Kurve 0.5·Σevr/(Σevr+60)) — ab CL 60 sitzt der
    // Voll-Stack exakt auf dem 0.40-Deckel, CL 30 bleibt mit 0.3912 knapp darunter.
    // Vorher (#303-L4-Stand, distinct-Runen): 0.3583 / 0.3751 / 0.3934 — der Deckel band auf
    // keinem Tier. Der Cap CLAMPT, es läuft also nichts über; was fehlt, ist die Kopffreiheit.
    // Ein Content-Stack, der den Cap frisch erreicht, fällt hier weiterhin auf: dann steht in
    // einer Zeile plötzlich 0.4 statt des gepinnten Werts.
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): duskfin_rangers_stew/
    // steelshot_bisque/witherleek_sharpshooters_pie/abyssal_feast tragen jetzt buff.trinity.evasionRating
    // (Fernkampf-Trinity-Zutat, #p11 Regel 3) — der Voll-Stack-Builder sammelt das mit ein (allBuffs:
    // true, kein Level-Gate in der Hülle) und hebt CL 30 leicht an: 0.3912 → 0.3943. CL 60/90 bleiben
    // am 0.40-Deckel (Clamp, unverändert).
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, §4a A1–A4/A7): derselbe stil-
    // unabhängige Nicht-Waffen-Score wie beim Krit-Detektor oben (evasionRating·100 + dex-Anteil) —
    // die neuen A3-Leder-Teile (evasionRating je Slot über dem alten Pick) und tonic_windstride
    // heben CL 30 für alle drei Stile gleichermaßen auf den 0.40-Deckel: 0.3943 → 0.40 (Clamp,
    // kein Melee-Item geändert). CL 60/90 bleiben unverändert am Deckel.
    const expected: Record<number, number> = { 30: DODGE_CAP, 60: DODGE_CAP, 90: DODGE_CAP };
    for (const lvl of TIERS) {
      for (const style of STYLES) {
        const d = computeStats(bis(style, lvl, "dodge").state, content).dodgeChance;
        expect(d, `CL${lvl}/${style}`).toBeLessThanOrEqual(DODGE_CAP); // der Deckel hält
        expect(d, `CL${lvl}/${style}`).toBeCloseTo(expected[lvl]!, 4);
      }
    }
  });

  it("Tank-Voll-Stack CL 90: der Mitigations-Deckel bindet jetzt, der Block-Deckel nicht mehr", () => {
    // Re-Messung 2026-08-25 (Chef-Entscheid Runen-Stapelung): mit wieder duplizierten Aegis-III-
    // Runen erreicht der CL-90-Voll-Stack den Mitigations-Deckel exakt (0.7047 → 0.80 = Cap).
    // Das ist ein CLAMP: mehr armorRating wird ab hier wertlos, es läuft nichts über. Der Block-
    // Cap bindet dagegen NICHT mehr (0.50 → 0.47) — und das ist kein Nerf, sondern eine Folge
    // der Bauweise dieser Hülle: sie belegt jeden Slot mit dem bestbewerteten Affix, und beim
    // Ziel "tank" schlägt die Aegis-Rune (armorRating·100) die Block-Rune. Früher bekam Block
    // den zweiten Slot als Zweitplatzierter. Wer im Spiel bewusst Block-Runen stapelt, erreicht
    // den Deckel weiterhin; die Hülle misst nur den score-maximalen Build, nicht jeden denkbaren.
    const st90 = computeStats(bis("melee", 90, "tank").state, content);
    expect(mitigation(st90.defense)).toBe(DEFENSE_MITIGATION_MAX);
    expect(st90.blockChance).toBeLessThanOrEqual(BLOCK_CAP); // der Deckel hält in jedem Fall
    expect(st90.blockChance).toBeCloseTo(0.47, 3);
    const st60 = computeStats(bis("melee", 60, "tank").state, content);
    expect(mitigation(st60.defense)).toBeLessThan(DEFENSE_MITIGATION_MAX);
    expect(st60.blockChance).toBeLessThan(BLOCK_CAP);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §4 Gepinnte Worst-Case-Tabelle (reale Messwerte 2026-07-09 — Regression-Detektor:
//    JEDES neue Item/Suffix/Tonikum, das diese Envelope verschiebt, reißt hier sichtbar)
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §4: gepinnte Worst-Case-Werte (Stat × Stufe)", () => {
  it("Tank-Schiene (armorRating → Mitigation, Block) wächst kontrolliert über die Bänder", () => {
    // Re-Messung 2026-07-09 nach #303 (1H+Schild, Aegis-III nur noch 1× je Teil [L4], genau EIN
    // Defensiv-Tonikum [L3, stoneskin verdrängt bulwark], carapace-Pet). Vorher/Nachher:
    // armor 350.97/379.79/538.23 → 230.97/259.79/298.23; mit 0.7374/0.7524 → 0.6488/0.6751.
    // Re-Messung 2026-07-22 (Elite-/World-Spawns Phase 2): morvane_warplate (armorRating 27.5, req
    // defence 62) schlägt bei CL 60 die vorherige BiS-Platte — CL 30/90 unverändert (Requirements
    // dort außerhalb der jeweiligen Build-Reichweite).
    // Re-Messung 2026-07-25 (item-drop-audit P1, #339, Chef-GO, Variante A — Req UND Stats angehoben):
    // cinderhusk_bulwark (AR 11.5→13.4, Block 28%→33.5%, req defence 16→30) schlägt jetzt bei CL 30
    // bark_bulwark (AR 11.57/28.7 %) als BiS-Offhand → armor/mitigation/block bei t30 steigen.
    // morvane_warplate (req defence 62→80) UND shellfather_aegis (req defence 55→82) fallen aus der
    // CL-60-Build-Reichweite (waren vorher BiS-Body/BiS-Offhand dort) → t60 fällt auf die nächst-
    // schwächere Platte/Schild zurück (armor/mitigation/block sinken leicht). CL 90 unverändert
    // (dort war keines der drei je BiS).
    // Re-Messung 2026-08-25 (Chef-Entscheid Runen-Stapelung): alle Rarity-Slots tragen wieder den
    // BESTEN Affix statt der Top-N-Bestenliste ⇒ armorRating +120 auf jeder Stufe, Mitigation
    // entsprechend. Der Block SINKT dabei bei CL 30/60 (0.415→0.335, 0.468→0.388): der zweitbeste
    // Affix, der dort Block beisteuerte, hat seinen Slot an eine weitere Aegis-Rune verloren. Für
    // die Hülle ist das korrekt — sie misst die Spitze des ZIEL-Stats, nicht die Summe aller.
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): voidray_banquet
    // trägt jetzt buff.trinity.armorRating +12 (Nahkampf-Trinity-Zutat, #p11 Regel 3) und ist damit
    // global das armorRating-stärkste Food — der Voll-Stack-Builder addiert das auf JEDER Stufe
    // oben auf den Steinhaut-Tonikum-Wert (allBuffs:true, kein Level-Gate in der Hülle): armorRating
    // +12 auf allen drei Bändern (352.23→364.23, 379.79→391.79, 538.53→550.53). Mitigation zieht bei
    // CL 30/60 mit (noch unter dem 0.80-Deckel); CL 90 bleibt am Deckel (Clamp, kein Assert nötig).
    // Block/damageReduction unverändert (Trinity-Zutat ist reines armorRating, kein Block-Anteil).
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): Platte-/Schild-
    // Drops im CL-30-Fenster (u.a. Turm-F2-Platte, basilisk_scale_shield/cowhide_jerkin-Klasse mit
    // jetzt next-Tier-Werten bei Craft-Req) schlagen die bisherige BiS-Wahl — armorRating 364.23→
    // 366.65, Mitigation zieht mit (0.7445→0.7458), Block sinkt leicht (0.335→0.332: der neue Schild-
    // Pick trägt mehr AR, etwas weniger Block als der alte). CL 60 unverändert (kein geänderter Drop
    // im dortigen Requirement-Fenster). CL 90 steigt weiter (550.53→552.07): Mitigation/Block waren
    // schon vor #8 am Deckel (0.80/0.47) und bleiben dort (Clamp, kein Assert nötig).
    // Re-Messung 2026-08-25 (Chef-Entscheid E1, toter skillBoost.defence -> Trinity-Klassenwert):
    // mehrere CL-30-Fenster-Platteile (u.a. cowhide_jerkin/warband_hauberk/goblin_warkilt/
    // chitin_helm/sootscale_greaves, armorRating je +0.42..+0.54) tragen jetzt echten armorRating
    // statt totem skillBoost.defence — der BiS-Tank-Pick bei CL30 gewinnt armorRating 366.65→367.07.
    // Mitigation/Block bleiben innerhalb der bestehenden Pin-Toleranz (0.7458→0.7460, 0.332 exakt).
    const t30 = computeStats(bis("melee", 30, "tank").state, content);
    expect(t30.armorRating).toBeCloseTo(367.07, 2);
    expect(mitigation(t30.defense)).toBeCloseTo(0.7458, 3);
    expect(t30.blockChance).toBeCloseTo(0.332, 3);
    // Re-Messung 2026-08-25 (Rezension #8, Chef-GO 25.08.2026, #p8, Nachzug außerhalb der #8-
    // Tabellen): slagcarapace_plate (AR 26.15→26.8) und revenant_greatshield (AR 15.45→16.0, Block
    // 0.382 unverändert) schlagen jetzt bei CL 60 die bisherige BiS-Platte/-Schild — armorRating
    // 391.79→432.17, Mitigation zieht mit, Block sinkt leicht (0.388→0.382, revenant_greatshield
    // trägt weniger Block als der alte Pick).
    // Re-Messung 2026-08-25 (Chef-Entscheid E1, toter skillBoost.defence -> blockChance): der
    // BiS-Schild bei CL60 ist revenant_greatshield, dessen skillBoost.defence 1 jetzt echte
    // blockChance speist (0.382 -> 0.393, n=1 * 3% + EXEMPT von der Craft-Leiter) — armorRating/
    // Mitigation unveraendert (nur blockChance auf diesem Schild betroffen).
    const t60 = computeStats(bis("melee", 60, "tank").state, content);
    expect(t60.armorRating).toBeCloseTo(432.17, 2);
    expect(mitigation(t60.defense)).toBeCloseTo(0.7757, 3);
    expect(t60.blockChance).toBeCloseTo(0.393, 3);
    // Re-Messung 2026-07-26 (#354 Paket 3.2 Nachschärfung): shellfather_aegis AR 19.6→21.5, Block
    // 45%→47% (Marge über titanium_kiteshield) — schlägt bei CL 90 jetzt klar als BiS-Offhand.
    // Re-Messung 2026-08-25 (Chef-Entscheid E1, toter skillBoost.defence -> armorRating): padfoot_boots
    // (armorRating 17.08→17.59, con unveraendert 2) überholt in der argmax-Score-Heuristik
    // (armorRating·100 + con·2) jetzt aetherium_sabatons (AR 17.08, con 4, Score 1712→1708+8=1716 vs.
    // padfoot 1712→1763) und wird BiS-Boots bei CL90-Tank. Der Score ist NUR ein Rang-Näherungswert
    // auf dem Basis-Item (s. Datei-Kopf); er kennt keine Enchant-Slot-Kapazität — aetherium_sabatons
    // ist "epic" (mehr Rarity-Slots für die Iron-Answer-armorRating-Rune) und trug in der ECHTEN
    // computeStats-Rechnung dadurch deutlich mehr Ziel-Stat als das jetzt gewählte "rare" padfoot_boots.
    // Das ist eine bekannte Heuristik-Ungenauigkeit des deterministischen argmax-Builders (kein
    // Content-Bug, keine echte Tank-Schwächung — ein echter Spieler würde weiter aetherium_sabatons
    // tragen), aber die Suite pinnt bewusst, was der Builder tatsächlich liefert: armorRating
    // 552.07 → 533.41 bei CL90. Block/Mitigation an dieser Stufe unveraendert (0.47 exakt).
    const t90 = computeStats(bis("melee", 90, "tank").state, content);
    expect(t90.armorRating).toBeCloseTo(533.41, 2);
    // Pet-Schadensreduktion obendrauf (multiplikativ NACH Armor/Ward/Block). claude:2026-10-18T02:00:00+02:00 — 1.3.0
    // Chitinpanzer „Panzerhaut" 3 % → 5 % (Werte-Datei Apply 6).
    expect(t90.damageReduction).toBeCloseTo(0.05, 5);
  });

  it("Lifesteal-Schiene: max. 9,5 % (Melee-Waffe 5 % + gorehound 1,5 % + greytooth_mantle 3 %) ab CL 60; sonst 4,5 %", () => {
    // Re-Messung 2026-07-22 (Elite-/World-Spawns Phase 2): greytooth_mantle (bonus.lifesteal 0.03,
    // rarity legendary, KEIN Requirement) ist ab CL 30 auf JEDEM Stil BiS-Cape für das
    // "lifesteal"-Ziel — +3 pp auf der gesamten Schiene gegenüber der alten Baseline (1,5 %/6,5 %).
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): nekro_reaperblade
    // (bonus.lifesteal 0.05, einzige Waffen-Lifesteal-Whitelist neben doomknight_cinderblade) bekommt
    // Requirement attack 40→70 (nächstes Craft-Tier der Zone) und ist damit ab CL 70 statt CL 40
    // legal — bei CL 60 fällt die Schiene auf 4,5 % zurück (0,095→0,045), CL 90 unverändert (0,095).
    // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Blutbracke „Blutspur" 1,5 % → 2 % ⇒ Schiene 4,5 → 5 % bzw. 9,5 → 10 % (Werte-Datei Apply 6).
    expect(computeStats(bis("melee", 30, "lifesteal").state, content).lifestealPct).toBeCloseTo(0.05, 5);
    expect(computeStats(bis("melee", 60, "lifesteal").state, content).lifestealPct).toBeCloseTo(0.05, 5);
    expect(computeStats(bis("melee", 90, "lifesteal").state, content).lifestealPct).toBeCloseTo(0.1, 5);
    expect(computeStats(bis("ranged", 90, "lifesteal").state, content).lifestealPct).toBeCloseTo(0.05, 5);
    expect(computeStats(bis("magic", 90, "lifesteal").state, content).lifestealPct).toBeCloseTo(0.05, 5);
  });

  it("Ward-Schiene: BiS-Pool 583 / 777 / 1179,5 (CL 30/60/90) — der Beobachtungs-Pin des Stoff-EHP", () => {
    // Re-Messung 2026-08-25 (Chef-Entscheid Runen-Stapelung): Warding-III sitzt wieder mehrfach je
    // Teil ⇒ der CL-90-Pool steigt von 779,5 auf 1179,5 (≈ ×1,6 der BiS-maxHp-Größenordnung, also
    // zurück auf den Stand, den #303 seinerzeit senken sollte). Ward regeneriert nur im Kampf
    // (Cast/Warding-Skill) und absorbiert 1:1 — kein Cap davor, deshalb der SCHIEBER, den der Chef
    // im Blick behalten sollte. Kleinste Bremse wäre, Trinity-Runen vom Stapeln auszunehmen
    // (s. Suiten-Kopf); die reinen Stat-Runen sind an keinem Deckel beteiligt.
    // Re-Messung 2026-07-22 (Elite-/World-Spawns Phase 2): thorncrown (wc 48, req magic 45) und
    // pyrebound_vestment (wc 101, req magic 58) schlagen ab CL 60 ihre bisherigen BiS-Stoff-Teile;
    // tideterror_grip (wc 90, req magic 88) zusätzlich ab CL 90. CL 30 unverändert.
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): ambergrain_feast
    // trägt jetzt buff.trinity.wardCapacity +30 (Magie-Trinity-Zutat, #p11 Regel 3) und ist damit
    // global das wardCapacity-stärkste Food — der Voll-Stack-Builder addiert das auf JEDER Stufe
    // oben auf den Warding-Skill-Stack (allBuffs:true, kein Level-Gate in der Hülle): maxWard +30
    // auf allen drei Bändern (583→613, 777→807, 1179.5→1209.5). Ward hat weiterhin keinen Cap davor
    // (offener Schieber, s. Suiten-Kopf-Kommentar).
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): pyrebound_vestment
    // (Elite-Unique, wardCapacity 101→142.85, Req magic 58→70 nachgezogen, s. Elite-Tabelle #p8)
    // fällt aus dem CL-60-Fenster (Requirement jetzt oberhalb) — der CL-60-BiS-Build fällt auf das
    // nächstschwächere Stoff-Teil zurück: maxWard 807→730.8. CL 30/90 unverändert (dort war
    // pyrebound_vestment nie BiS bzw. bleibt es bei CL 90 weiterhin).
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, §4a A5): affix_warding
    // trinityByTier Tier II/III 25/40 → 35/60 (Ward-Relativwert 31%→47% des Stoff-Kits laut
    // Dokument) — seit der Runen-Stapelung (25.08.) summiert der Voll-Stack-Builder die Bewahrende-
    // Rune mehrfach über bis zu 5 Slots, der Tier-Sprung wirkt daher vervielfacht statt additiv-flach:
    // CL30 613→818.06, CL60 730.8→947.64, CL90 1209.5→1558.32. Kein Stoff-ITEM wurde in diesem Zug
    // geändert (die A4-Stoff-Drops selbst tragen moderate wardCapacity je Rare-Drop-Philosophie) —
    // die Bewegung kommt ausschließlich aus der gepinnten Runenwert-Änderung, wie in §6 des
    // Dokuments vorhergesagt ("Ward-Schiene ... steigt ... neu pinnen").
    // Re-Messung 2026-08-29 (Schmuck-Rework W3, §3.6): die neue Magie-Ring-Reihe trägt erstmals
    // wardCapacity auf RINGEN (emberglass_loop Req34/ward7, hollowlight_seal Req55/ward12,
    // nightwell_loop Req70/ward15, voidscribe_glyph Req85/ward18, godsight_loop Req95/ward20) — bei
    // "alle Skills = targetLevel" (buildBisCharacter) füllt das ab CL 60 (hollowlight_seal legal)
    // erstmals überhaupt beide Ringplätze mit wardCapacity; bei CL 90 sind zusätzlich nightwell_loop
    // und voidscribe_glyph legal (godsight_loop Req95 noch nicht). Vorher war dort 0 Basiswert,
    // jeder Ring-Slot nimmt aber ZUSÄTZLICH an der Rune-Stapelung teil (s. Kommentar A5 oben) — der
    // Sprung ist deshalb ein Vielfaches des reinen Basiswerts, nicht 1:1. CL 30 (alle Reqs >30)
    // unverändert: 730.8→947.64→1346.64 (CL60), 1209.5→1558.32→1987.32 (CL90).
    // claude:2026-10-17T20:50:00+02:00 — Begleiter-Rework Apply 6: BiS besitzt alle Begleiter, das Echo
    // (+1,5 % Ward aus dem Global-Passiv) hebt den Pool 818.06→830.33 / 1346.64→1366.84 / 1987.32→2017.13.
    expect(computeStats(bis("magic", 30, "ward").state, content).maxWard).toBeCloseTo(830.33, 1);
    expect(computeStats(bis("magic", 60, "ward").state, content).maxWard).toBeCloseTo(1366.84, 1);
    expect(computeStats(bis("magic", 90, "ward").state, content).maxWard).toBeCloseTo(2017.13, 1);
  });

  it("Buff-Exklusivitäts-Inventur (#303 L3): alle Tempo-/Krit-Tonika sind 'offense' ⇒ aktiv max. −750 ms / +0.20 crit", () => {
    // Vorher (Frühwarner-Pin): 9 stapelbare Tempo-Tonika Σ −5100 ms, 9 Krit-Tonika Σ +1.04.
    // Jetzt: die Katalog-ZAHL bleibt der Detektor für neue Tonika-Zeilen, aber die AKTIVE Decke ist
    // per Kategorie-Verdrängung das beste Einzel-Item — heute slayer_war_brew (−750 ms, +0.20).
    // Reißt einer der Asserts, hat jemand ein neues Tempo-/Krit-Consumable ergänzt (Zahl), es NICHT
    // als "offense" getaggt (Kategorie-Assert) oder die Spitze verschoben (Max-Asserts) — bewusst
    // entscheiden & neu pinnen.
    const consumables = Object.values(content.items).filter((it) => it.type === "consumable");
    const haste = consumables.filter((it) => (it.buff?.bonus?.attackIntervalMs ?? 0) < 0);
    const crit = consumables.filter((it) => (it.buff?.bonus?.critChance ?? 0) > 0);
    expect(haste.length).toBe(9);
    expect(crit.length).toBe(9);
    // JEDES Tempo-/Krit-Tonikum trägt die offense-Kategorie ⇒ es ist immer nur EINES aktiv.
    for (const it of [...haste, ...crit]) {
      expect(it.buff?.category, `${it.id} muss 'offense' sein (L3-Exklusivität)`).toBe("offense");
    }
    // Aktive Worst-Case-Decke = bestes Einzel-Item (statt Σ über alle 9).
    expect(Math.min(...haste.map((it) => it.buff?.bonus?.attackIntervalMs ?? 0))).toBe(-750);
    expect(Math.max(...crit.map((it) => it.buff?.bonus?.critChance ?? 0))).toBeCloseTo(0.2, 5);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §5 Messmatrix Evasion/Tempo/TTK — NEU GEPINNT mit evasion-tempo-taming-spec (#301,
//    CHEF-GO 2026-07-09): aus den Mess-Pins des Evasion-/Tempo-Lecks wurden harte Asserts
//    (Dodge ≤ 0.40, Intervall ≥ base·(1−TEMPO_REDUCTION_CAP), reale Boss-Land-Chancen).
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §5: Messmatrix (Evasion/Tempo/TTK, gezähmt #301)", () => {
  it("Gegner-Trefferchance gegen den BiS-Evasion-Build (CL 90): on-level ~24 %, +150 Level ~47 % Land-Chance", () => {
    const b = bis("ranged", 90, "dodge");
    const st = computeStats(b.state, content);
    // Re-Messung 2026-08-25 (Chef-Entscheid Runen-Stapelung): mehrfache Evasion-III-Runen drücken
    // den CL-90-Build auf den 0.40-Deckel (vorher 0.3934). `evasion` — der flache DEX-Kontest-Stat
    // hinter dem Dodge — steigt dabei nur von 15.919 auf 16.234, weil er aus Modifiers kommt und
    // nicht aus evasionRating. Der Cap CLAMPT: der Dodge kann nicht darüber.
    // Re-Messung 2026-08-25 (Chef-GO 1.1.0, #p14 Rüstungsklassen-Trennung, Vorschlag B): die vier
    // umgetypten Küsten-/Hochland-Plattenteile (jetzt Leder + evasionRating + dex) verdrängen für
    // diesen Build ein bisheriges Leder-BiS-Teil mit etwas mehr dex ⇒ evasion sinkt leicht
    // (16.234 → 16.027). Der Dodge-Deckel bleibt trotzdem gebunden (Clamp).
    expect(st.dodgeChance).toBe(DODGE_CAP);
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): abyssal_feast trägt
    // jetzt buff.trinity.evasionRating +8 UND dex+6 statt dex+4 (Fernkampf-Retyping, #p11 Regel 3);
    // der Voll-Stack-Builder pickt es weiterhin als bestes Food für diesen Ranged-Dodge-Build, der
    // höhere dex-Anteil hebt den flachen `evasion`-Kontest-Stat leicht: 16.027 → 16.079.
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): mehrere Leder-
    // Drops im CL-90-Fenster (u.a. wyvernscale_aegis/-greaves, direkt next-Tier-EV bei Craft-Req)
    // schlagen jetzt die bisherige BiS-Wahl für einzelne Slots und heben den dex-Anteil: evasion
    // 16.079 → 16.530.
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, §4a A3): roc_feather_cap (R90,
    // dex 2/con 6/EV 25.4) schlägt an der Helm-Zeile die bisherige BiS-Wahl, weitere A3-Leder-Teile
    // (u.a. cryptstalker_vambraces) verdrängen kleinere Slots — evasion 16.530 → 16.809 (Fernkampf-
    // eigene Verbesserung, wie in §6 des Dokuments für die TTK-Matrix vorhergesagt).
    // Re-Messung 2026-08-26 (Chef-Auftrag "Slayer omnifunktional"): slayer_vambraces dex 1→2 UND
    // slayer_helm dex 2→4 (beide Plattenteile/Leder-Teil bleiben trotzdem hinter der jeweils
    // besten Craft-/Drop-Wahl zurueck, s.u. TTK-Matrix fuer die tatsaechlichen Slot-Verschiebungen)
    // heben den flachen dex-Kontest-Stat leicht an: 16.8088 → 16.8537.
    // Re-Messung 2026-08-27 (content-dev, 1.2.0 „Fasern und Fallen"): neuer Skill "hunting" (trains
    // dex) — NICHT der neue Meisterring (ring_master_hunting verlangt hunting:99 > CL90-Deckel,
    // requirementsOk schließt ihn hier wie jeden Meisterring aus, bisektiv verifiziert: Pin bleibt
    // identisch verschoben auch ohne das Ring-Item). buildBisCharacter setzt jeden Skill auf
    // targetLevel — der zusätzliche trainierte Skill hebt trained.dex (character.ts computeStats
    // §2 Hybrid) und damit den flachen evasion-Kontest-Stat: 16.8537 → 17.3194.
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 2, design/schmuck-audit-
    // 2026-08-29.md §3.5): 7 neue Fernkampf-Ringe + 7 neue Fernkampf-Amulette (dex/con/lck +
    // evasionRating) sind die ersten craftbaren Schmuckstücke, die für einen Ranged-Build
    // überhaupt konkurrieren — sie schlagen an mehreren Slots die bisherige BiS-Wahl dieses
    // Dodge-Builds und heben den dex-Anteil: evasion 17.3194 → 17.9528.
    // claude:2026-10-24T21:35:00+02:00 — Re-Messung 1.4.0 FK (Chef 24.10.: „Entscheide das Beste“): Der Bogen trägt
    // jetzt einen Köcher (aetherium_quiver, Geschick + Präzision, Stat-Runen) in der vorher leeren Nebenhand.
    // Mehr dex hebt den flachen Kontest-Stat: evasion 17.9528 → 19.4896. Dodge bleibt am 0,40-Deckel (Clamp).
    expect(st.evasion).toBeCloseTo(19.4896, 3);

    const onLevel = monsterClosestTo(content, 90);
    const plus150 = monsterClosestTo(content, 240);
    // Detektor: verschiebt sich die Monster-Landschaft, ändern sich die Referenzgegner sichtbar.
    expect(onLevel.id).toBe("forest_hare");
    expect(onLevel.level).toBe(90);
    expect(plus150.id).toBe("void_titan");
    expect(plus150.level).toBe(242);

    // #301-Gegenrechnung, re-gemessen nach #303 (weniger Buff-Evasion/-Dodge ⇒ Gegner landen etwas
    // MEHR): on-level 0.2308 → 0.2449, +150 Level 0.4570 → 0.4716 — die Zähmung wirkt in die
    // richtige Richtung, das Chef-Leck („Gegner verfehlt IMMER") bleibt geschlossen.
    // Re-Messung 2026-08-25 (Runen-Stapelung): die leicht höhere `evasion` (15.919 → 16.234)
    // lässt den Gegner etwas seltener landen (0.2479 → 0.2423 / 0.4727 → 0.4655) — marginal.
    // Wichtiger: der Dodge sitzt jetzt auf dem 0.40-Deckel, die kombinierte Land-Chance bleibt
    // trotzdem deutlich über dem 10-%-Boden. Das Chef-Leck („Gegner verfehlt IMMER") bleibt zu.
    // Re-Messung 2026-08-25 (Chef-GO 1.1.0, #p14): `evasion` sinkt leicht (16.234 → 16.027, s.o.)
    // ⇒ der Gegner landet minimal HÄUFIGER (0.2423 → 0.2442 / 0.4655 → 0.4669) — marginal, der
    // Cap-Befund oben bleibt unverändert.
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): `evasion` steigt
    // leicht (16.027 → 16.079, s.o.) ⇒ der Gegner landet minimal SELTENER (0.2442 → 0.2437 /
    // 0.4669 → 0.4665) — marginal, der Cap-Befund oben bleibt unverändert.
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): `evasion` steigt
    // weiter (16.079 → 16.530, s.o.) ⇒ der Gegner landet noch etwas seltener (0.4062 → 0.3996 /
    // 0.2437 → 0.2397 / 0.7775 → 0.7727 / 0.4665 → 0.4636) — marginal, der Cap-Befund bleibt.
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, §4a A3): `evasion` steigt weiter
    // (16.530 → 16.809, s.o.) ⇒ der Gegner landet noch etwas seltener (0.3996 → 0.3956 /
    // 0.2397 → 0.2373 / 0.7727 → 0.7698 / 0.4636 → 0.4619) — marginal, der Cap-Befund bleibt.
    const hcOn = hitChance(enemyEffectiveAccuracy(onLevel), st.evasion); // L90 < Schwelle ⇒ acc unverändert
    // Re-Messung 2026-08-26 (Slayer omnifunktional, s.o.): evasion 16.8088→16.8537 laesst den
    // Gegner marginal seltener landen: 0.3956 → 0.3949 / 0.7698 → 0.7693.
    // Re-Messung 2026-08-27 (content-dev, 1.2.0 „Fasern und Fallen", neuer Skill "hunting" trains
    // dex, s.o.): evasion 16.8537 → 17.3194 laesst den Gegner spuerbar seltener landen.
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 2, s.o.): evasion 17.3194 → 17.9528
    // laesst den Gegner spuerbar seltener landen: 0.3884 → 0.3799 / 0.2334 → 0.2280 /
    // 0.7643 → 0.7579 / 0.4586 → 0.4547.
    // claude:2026-10-24T21:35:00+02:00 — Re-Messung 1.4.0 FK (Köcher, s.o.): evasion 17.9528 → 19.4896 lässt den
    // Gegner etwas seltener landen: 0.3799 → 0.3608 / 0.2280 → 0.2165 / 0.7579 → 0.7425 / 0.4547 → 0.4455.
    expect(hcOn).toBeCloseTo(0.3608, 3);
    expect((1 - combinedFloorDodge(st.dodgeChance, hcOn)) * hcOn).toBeCloseTo(0.2165, 3);
    const hc150 = hitChance(enemyEffectiveAccuracy(plus150), st.evasion); // acc 24 → eff. ~65
    expect(hc150).toBeCloseTo(0.7425, 3);
    expect((1 - combinedFloorDodge(st.dodgeChance, hc150)) * hc150).toBeCloseTo(0.4455, 3);
    // Harte Untergrenze (L5-Kombiboden): kombinierte Land-Chance nie unter MIN_HIT_CHANCE.
    expect((1 - combinedFloorDodge(st.dodgeChance, hcOn)) * hcOn).toBeGreaterThanOrEqual(MIN_HIT_CHANCE);
  });

  it("BiS-Haste-Build (CL 90): Waffen-Tempo-Identität steht wieder — Kompression hart bei 80 % (Ranged-Stance 61 %)", () => {
    // #301: vorher drückte der Stack JEDE Waffe auf 800 ms (Kompression 31–33 %, Waffenwahl
    // tempo-seitig bedeutungslos). Jetzt bindet das relative Cap: base·0.8; Ranged zusätzlich
    // ×0.9·×0.85 (Stil/Stance außerhalb des Bodens, Spec §3.5) ⇒ 0.612·base — der Tempo-König.
    const melee = bis("melee", 90, "haste");
    expect(melee.weaponBaseIntervalMs).toBe(2400);
    expect(computeStats(melee.state, content).attackIntervalMs / melee.weaponBaseIntervalMs).toBe(
      1 - TEMPO_REDUCTION_CAP,
    );
    const ranged = bis("ranged", 90, "haste");
    expect(ranged.weaponBaseIntervalMs).toBe(2650);
    expect(computeStats(ranged.state, content).attackIntervalMs / ranged.weaponBaseIntervalMs).toBeCloseTo(
      (1 - TEMPO_REDUCTION_CAP) * 0.9 * 0.85,
      6,
    );
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, §4a A2): sentinel_core_wand
    // (R90, attackIntervalMs 2580) ist jetzt die schnellste legale magic-Waffe bei CL 90 und
    // schlägt die bisherige Haste-BiS-Wahl (2600) — echte Waffenwahl (weaponStyle-gefiltert),
    // kein Cross-Class-Effekt. Die Kompressionsrate bleibt exakt 1−TEMPO_REDUCTION_CAP (s.u.).
    const magic = bis("magic", 90, "haste");
    expect(magic.weaponBaseIntervalMs).toBe(2580);
    expect(computeStats(magic.state, content).attackIntervalMs / magic.weaponBaseIntervalMs).toBe(
      1 - TEMPO_REDUCTION_CAP,
    );
  });

  /**
   * Analytischer Erwartungswert-TTK (kein RNG, Formeln aus resolveAttack/strikeEnemy repliziert —
   * Muster endgame-danger.test.ts). Vereinfachungen (dokumentiert, konstant über Re-Messungen):
   * Magier castet immer (Mana-Druck ignoriert), Gegner-Ward zählt als (1−wardBreak)-EHP, Spieler-
   * Ward als 1:1-EHP (Regen/Refill ignoriert), Enrage/DoTs/Auto-Eat ignoriert, One-Shot-Cap auf dem
   * Mittelwert angewandt.
   */
  // codex:2026-10-17T16:00:00+02:00 — 1.3.0 E5: optionaler Level-Parameter für den CL-99-Paritäts-Pin unten
  // (Default 90 = alle Bestands-Aufrufe bit-identisch).
  function expectedTtk(style: WeaponStyle, monsterId: string, level = 90): { player: number; enemy: number } {
    return expectedTtkOf(bis(style, level, "damage").state, monsterId);
  }
  // claude:2026-10-18T12:00:00+02:00 — dieselbe Formel auf einem beliebigen Spielstand (Narbenbuch-Pin unten);
  // expectedTtk delegiert unverändert hierher, die Bestands-Pins rechnen bit-identisch.
  function expectedTtkOf(state: GameState, monsterId: string): { player: number; enemy: number } {
    const st = computeStats(state, content);
    const m = content.monsters[monsterId]!;
    // Spieler → Gegner
    const hcP = hitChance(st.accuracy, m.evasion * (1 - st.precision));
    const red = mitigation(m.defense * (1 - st.armorPen));
    const mean = ((st.attackDamageMin + st.attackDamageMax) / 2) * (1 - red);
    const eOut = hcP * mean * (1 + st.critChance * (st.critDamage - 1));
    const effHp = m.maxHp + (m.wardCapacity ?? 0) * (1 - st.wardBreak);
    // Gegner → Spieler (#301: E2-Accuracy-Skalierung + L5-Kombiboden — Spiegel des Kampf-Pfads)
    const hc = hitChance(enemyEffectiveAccuracy(m), st.evasion);
    const land = (1 - combinedFloorDodge(st.dodgeChance, hc)) * hc;
    let hit = m.damage * DMG_MAX_HIT_MULT * ((1 + DMG_ROLL_FLOOR) / 2) * (1 - mitigation(st.defense));
    if (st.dodgeChance > 0) hit *= 1 - LEATHER_HIT_FLOOR; // Leder-Floor (#301: 0.12 → 0.18)
    hit *= 1 - st.blockChance * 0.85; // erwarteter Block-Anteil (BLOCK_DAMAGE_REDUCTION)
    hit = Math.min(hit, 0.5 * st.maxHp); // One-Shot-Cap
    hit *= 1 - st.damageReduction;
    return {
      player: (effHp / eOut) * (st.attackIntervalMs / 1000),
      enemy: ((st.maxHp + st.maxWard) / (land * hit)) * (m.attackIntervalMs / 1000),
    };
  }

  it("TTK-Matrix (CL-90-BiS-Damage-Builds vs. Idol-Bosse): red-team #302 L2-Re-Pin — Idol-Halle ist keine Farm-Node mehr", () => {
    // red-team #302 L2-Re-Pin (2026-07-09, monster-threat-spec §6): idol_warden/last_idol dmg+hp+acc
    // stark angehoben (Papier-Monster-Fix, §6-Apply-Liste). Ein reiner CL-90-BiS-DAMAGE-Build (kein
    // Block/Tank-Fokus, diese Formel ignoriert Food/Enrage/Regen) kann die Idol-Halle jetzt NICHT
    // mehr im 8–21-s-Farm-Modus clearen (Spieler-TTK springt auf ~47–250 s, proportional zum ~6×-
    // HP-Sprung) — das ist die vom Chef gewollte Konsequenz des Threat-Fixes: DPS-only stirbt hier
    // eher als er killt, Mitigation/Sustain sind wieder Pflicht (s. monster-threat-spec §8, Chef-GO
    // sim-realistic-Endgame-Verschiebung ist explizit erwünscht). Gegenrichtung (Boss→Spieler) fällt
    // von ~1,4–2 min auf ~12–24 s — der Boss tötet einen ungeblockten Damage-Build sehr real.
    // #303-Re-Pin: L3 (nur noch 1 offense-Tonikum statt 9) + L4 (distinct-Runen statt dupliziertem
    // Top-Affix) senken den BiS-DPS-Output ⇒ Spieler-TTK +25–35 % über alle Stile (z.B. melee vs
    // last_idol 155 s → 196 s); die Boss-Seite wird leicht schneller (weniger Buff-HP/-Ward).
    // Re-Messung 2026-07-22 (Elite-/World-Spawns Phase 2): furnaceheart_core (offhand magic, req
    // magic 90, surplus-Effekt) ist jetzt BiS-Offhand für den CL-90-Magic-"damage"-Build — nur die
    // MAGIC-Zeilen verschieben sich (melee/ranged unverändert, deren BiS-Kits enthalten keines der
    // neuen Uniques auf dem "damage"-Ziel).
    // Re-Messung 2026-07-25 (item-drop-audit P1, #339, Chef-GO): palemourn_shroud (requirement-frei,
    // modifiers int4/wis3→int6/wis6/lck3) bleibt BiS-Cape auf JEDEM Ziel/Level, liefert dem CL-90-
    // Magic-"damage"-Build jetzt mehr int → minimal höherer Output ⇒ Spieler-TTK vs. idol_warden
    // sinkt leicht (78.3s→78.05s); alle anderen Stil/Ziel-Paare unverändert.
    // Re-Messung 2026-08-23 (Chef-Entscheid „alle Fernkampfwaffen sind zweihaendig", ausgeloest
    // durch einen Spieler-Report zu Bogen+Kiteschild): der CL-90-ranged-BiS-Build verliert damit
    // seine Offhand. Nur die RANGED-Zeilen verschieben sich — Spieler-TTK vs. idol_warden
    // 91.59→95.57 s (+4.3 %), vs. last_idol 302.85→316.15 s (+4.4 %), Boss→Spieler vs. idol_warden
    // 14.1→14.02 s. Melee/Magic unveraendert (deren Offhand ist Schild bzw. Fokus und bleibt).
    // Re-Messung 2026-08-25 (Chef-Entscheid Runen-Stapelung): der BiS-Damage-Build trägt wieder den
    // besten Schadens-Affix auf allen Slots statt der Top-N-Bestenliste ⇒ Spieler-TTK sinkt um
    // 4–9 % (melee→idol_warden 59.67→56.45 s, magic→last_idol 262.73→240.73 s). Die Boss-Seite
    // bleibt praktisch unverändert — der "damage"-Build stapelt keine Defensiv-Runen. Die Aussage
    // des Pins hält: die Idol-Halle ist auch so keine 8–21-s-Farm-Node.
    // Re-Messung 2026-08-25 (Chef-GO 1.1.0, #p14 Rüstungsklassen-Trennung, Vorschlag B): die vier
    // umgetypten Küsten-/Hochland-Plattenteile (jetzt Leder + evasionRating + dex, Req ranged) sind
    // jetzt gültige Kandidaten für den CL-90-Ranged-"damage"-Build und verdrängen an 1-2 Slots das
    // bisherige BiS-Teil — nur die RANGED-Zeilen verschieben sich (idol_warden 92.44→97.77 s,
    // last_idol 305.65→323.54 s, jeweils +5-6 %); melee/magic nutzen keines der vier Teile (deren
    // Requirement war/ist defence bzw. jetzt ranged) und bleiben unverändert.
    // Re-Messung 2026-08-25 (Rezension #11, Trinity-Gerichte, Chef-GO 25.08.): das Endgame-Quartett
    // ist jetzt stilspezifisch (#p11 Regel 3: voidray_banquet=Nahkampf str+6, abyssal_feast=Fernkampf
    // dex+6/lck+3, ambergrain_feast=Magie int+6/wis+3, je +Trinity) statt vorher "ein bisschen von
    // allem" (con+/str+/dex+/int+3..4 gleichzeitig) — der Voll-Stack-Builder pickt für jeden Stil
    // jetzt gezielter das eigene Food, das hebt den Spieler-Output leicht an (Player-TTK sinkt,
    // schneller kill) UND die Trinity-Rüstung/-Ausweichen/-Schild reduziert eingehenden Schaden
    // (Enemy-TTK steigt, Spieler hält länger durch). Alle sechs Paare re-gemessen:
    // melee/idol_warden 56.45/18.9 → 57.34/19.0, melee/last_idol 184.96/13.4 → 188.17/13.5,
    // ranged/idol_warden 97.77/14.14 → 97.21/13.8, ranged/last_idol 323.54/12.9 → 321.66/13.1,
    // magic/idol_warden 71.52/23.7 → 72.55/25.3, magic/last_idol 240.73/25.6 → 244.57/27.4.
    // Re-Messung 2026-08-25 (Rezension #8, Drops ≥ Craft, Chef-GO 25.08.2026, #p8): der CL-90-BiS-
    // "damage"-Build je Stil greift jetzt teils zu neu angehobenen Drops (Melee/Ranged: mehrere
    // Dolch-/Bogen-Uniques im CL-90-Fenster; Magie: Fokus-/Stab-Drops) — Spieler-DPS steigt auf
    // allen drei Stilen (schnellerer Kill, Player-TTK sinkt bei Melee/Ranged), die Rüstungs-Drops
    // (Trinity) heben gleichzeitig den eingehenden EHP-Puffer (Enemy-TTK steigt). Alle sechs Paare
    // re-gemessen: melee/idol_warden 57.34/19.0 → 56.87/19.79, melee/last_idol 188.17/13.5 →
    // 186.56/14.10, ranged/idol_warden 97.21/13.8 → 87.24/14.52, ranged/last_idol 321.66/13.1 →
    // 289.16/13.23, magic/idol_warden 72.55/25.3 → 73.98/25.34, magic/last_idol 244.57/27.4 →
    // 248.98/27.39.
    // Re-Messung 2026-08-25 (Chef-Test, Slayer-Shop-Rüstung, design/slayer-shop-1.1.0.md §4.1):
    // slayer_vambraces bekommt erstmals evasionRating (11.76) und ist bereits vorher die BiS-
    // Handschuh-Wahl des CL-90-Ranged-"damage"-Builds gewesen (dex/lck-Score unverändert, nur str/
    // int wurden — Trinity-Klassenregel #p14 — nach con umgeschichtet, s. Item-Kommentar in
    // packages/content/src/index.ts). Der Build erbt die neue evasionRating passiv, dadurch steigt
    // st.dodgeChance und mit ihr NUR die ranged/idol_warden-Enemy-Zeile spürbar (14.52→17.83,
    // +23 %): idol_wardens hitChance-Gegenrechnung war noch nicht am combinedFloorDodge-Boden,
    // last_idols war es bereits (13.23 unverändert — der Boden absorbiert den Zusatz-Dodge dort
    // vollständig). Alle Spieler→Gegner-Zeilen und alle anderen Stile bleiben exakt gleich (kein
    // Melee/Magic-Slot nutzt ein Slayer-Teil auf dem "damage"-Ziel).
    // Re-Messung 2026-08-25 (Chef-Entscheid E1, toter skillBoost.defence -> Trinity-Klassenwert):
    // der CL-90-BiS-"damage"-Build traegt jetzt mehr armorRating (Melee: Platte-Endgame-Teile
    // idol_crown/idolstep_sabatons/voidtouched_gauntlets/aetherweave_leggings) bzw. evasionRating
    // (Ranged: Leder-Teile krakenhide_cuirass/direhide_jerkin/bearhide_cuirass) — Spieler haelt dem
    // Boss laenger stand, NUR die Boss→Spieler-Zeilen (enemy) steigen: melee/idol_warden 19.79→20.20,
    // melee/last_idol 14.1→14.40, ranged/idol_warden 17.83→18.19. ranged/last_idol (13.23) und alle
    // magic-Zeilen (kein wardCapacity-Item unter den 51 skillBoost.defence-Traegern) bleiben exakt.
    // Spieler→Gegner-Zeilen (player) bleiben unveraendert (kein DPS-Gear betroffen).
    // Re-Messung 2026-08-26 (Stil-Parität 4a, Chef-GO 26.08.2026, §4a A1–A4): das "damage"-Ziel
    // filtert Nicht-Waffen-Slots über den STIL-EIGENEN Attribut-Term (attrDmg = dex·0.24 ranged /
    // int·0.34 magic / str·0.3 melee, s. scoreContribution) — die neuen A1/A3-Bögen/Leder-Teile
    // tragen nur dex/lck, die neuen A2/A4-Magie-Waffen/Stoff-Teile nur int/wis/lck: kein Melee-Item
    // punktet auf dem melee-"damage"-Score, darum bleiben BEIDE Melee-Paare exakt (56.87/20.20,
    // 186.56/14.40 unverändert). Ranged und Magic verbessern sich hingegen wie in §6 des Dokuments
    // vorhergesagt ("Fernkampf-/Magie-Zeilen sinken"): ranged/idol_warden 87.24→81.02 (schnellerer
    // Kill über neue Bogen-/Leder-Drops), ranged/last_idol 289.16→268.31; magic/idol_warden
    // 73.98→72.29, magic/last_idol 248.98→243.30 (neue Stab-/Fokus-/Stoff-Drops). Die Boss→Spieler-
    // Zeilen bewegen sich gemischt (Trade-off zwischen mehr dex/int-Schaden und leicht anderer
    // Trinity-Verteilung je Slot, kein hartes Muster über alle vier Paare) — ranged/idol_warden
    // 18.19→15.45, ranged/last_idol 13.23→13.86, magic/idol_warden 25.34→27.32, magic/last_idol
    // 27.39→29.53. Alle Werte per buildCache-Neumessung, kein Melee-Kit betroffen.
    // Re-Messung 2026-08-26 (Chef-Entscheid "Slayer omnifunktional"): das Slayer-Set (Helm, Beinschienen,
    // Armschienen, Amulett) traegt jetzt str = dex = int und die Armschienen/das Amulett einen Omni-Boost
    // attack = ranged = magic = 3 (benannte Ausnahmen in suffix-class-fit SLAYER_OMNI_SET und
    // itemization-guards §8.3). Der dex-Score macht die Slayer-Teile fuer den CL-90-Ranged-"damage"-
    // Build konkurrenzfaehig und verdraengt an mehreren Slots die bisherige Drop-/Craft-Wahl; der
    // Ranged-Boost +3 verkuerzt den Kill leicht. NUR die ranged-Zeilen bewegen sich: melee scort auf
    // str (unveraendert auf den betroffenen Slots), magic auf int — die neuen int-Werte der Slayer-
    // Platten-/Lederteile schlagen die bestehenden Stoff-Picks des Magic-Builds nicht (72.29/27.32 und
    // 243.30/29.53 exakt wie zuvor): ranged/idol_warden 81.02/15.45 → 82.20/19.64,
    // ranged/last_idol 268.31/13.86 → 272.31/13.60.
    // Re-Messung 2026-08-27 (content-dev, 1.2.0 „Fasern und Fallen", neuer Skill "hunting" trains
    // dex, s.o. §5-Kopf): buildBisCharacter setzt jeden Skill auf targetLevel, der zusätzliche
    // trainierte Skill hebt trained.dex bei JEDEM All-Skills-CL90-Build (character.ts computeStats
    // §2 Hybrid) — kein neuer BiS-Slot-Pick (kein Gear-Item betroffen), aber der flache dex-Zuwachs
    // speist sowohl den ranged-damage-Score (dex-Anteil) als auch den Kontest-Stat `evasion` (s.o.),
    // der wiederum in JEDE hitChance-Rechnung (Spieler↔Gegner, alle drei Stile) eingeht. Re-gemessen:
    // ALLE sechs Paare bewegen sich leicht — Spieler-Seite sinkt überall (schnellerer Kill dank mehr
    // dex-Schaden bzw. Ranged-Trade-off), Gegner-Seite steigt überall (Spieler weicht minimal
    // häufiger aus). Größter Ausschlag bei ranged (dex ist dort der Haupt-Schadensterm).
    // Re-Messung 2026-08-28 — Zauberfokus (Chef-GO 28.08.2026): bewusster Magier-Buff +15/22/30 %
    // Waffenspanne (CL 30/60/90 bei realistischem INT, s. design/zauberfokus-2026-08-28.md; die
    // Engine multipliziert die Magie-Waffenspanne mit 1 + spellFocus·int). Der CL-90-Magic-"damage"-
    // Build (stormcrest_staff spellFocus 0.0032 × int 182 ⇒ Spanne ×1.58) hebt seine Spanne
    // 85.54–91.24 → 92.12–101.14 (+9,3 % mittlerer Schaden) ⇒ NUR die beiden magic-Spieler-Zeilen
    // sinken: idol_warden 71.22→65.15 s, last_idol 239.01→218.63 s. Boss→Spieler-Zeilen (28.03/
    // 30.12) und alle melee/ranged-Paare exakt unverändert (kein Nicht-Magie-Item trägt spellFocus,
    // die Engine ignoriert das Feld außerhalb des Magie-Stils — s. spell-focus.test.ts).
    // Re-Messung 2026-08-28 — Elementleiter der Magiewaffen (Chef-GO 28.08.2026, design/
    // elementleiter-magiewaffen.md): titanium_staff/aetherium_staff verlieren ihren Feuer-Status
    // (Aether = manaOnKill statt Brand, DurationMs 0, kein DPS-Beitrag in dieser Formel — sie
    // ignoriert Waffeneffekte komplett, nur `attackDamageMin/Max` zählt) und bekommen dafür eine
    // deutlich höhere Grundspanne, um bei `coreStatScore` (sim-consistency.ts) Parität zur jeweils
    // vorherigen Craft-Stufe zu halten (Herleitung/Zahlen im Content-Bericht). Der CL-90-Magic-
    // "damage"-Build wechselt dadurch die Waffe: aetherium_staff (Spanne 12,5–18,8 vor Zauberfokus)
    // schlägt jetzt stormcrest_staff (Drop, Spanne unverändert 11,3–17) und wird neue BiS-Mainhand
    // ⇒ NUR die beiden magic-Spieler-Zeilen sinken (schnellerer Kill): idol_warden 65.15→58.05 s,
    // last_idol 218.63→194.82 s. Boss→Spieler-Zeilen bleiben praktisch exakt (28.03/30.12, das neue
    // Kit trägt keine andere Trinity-Verteilung) und alle melee/ranged-Paare unverändert (kein
    // Nicht-Magie-Slot betroffen).
    // Re-Messung 2026-08-28 — Community-Item „Esthar, Sturm der Gebeine" (Chef 28.08.2026, 1.2.0,
    // legendäre Großaxt R90 vom neuen Hochland-Champion elite_ossric; Rare-Drop-Philosophie: Götzeneisen-
    // Spanne +8 % = 33,5–62,4 @3450, Basis-DPS 13,90 gegen aetherium_maul 10,90): der DPS-Schätzer des
    // BiS-Builders (`weaponScore`, reine Spanne/Intervall) wählt Esthar als neue CL-90-Melee-„damage"-
    // Mainhand statt aetherium_maul — aber NUR die Idol-Bosse sind Rüstungs-Ziele (defense 123/150,
    // defenseType armor), und diese Formel rechnet armorPen mit: der Maul trug 0,40 armorPen (Mitigation
    // 0,371/0,419), Esthar trägt keinen (0,496/0,545). Gegen genau diese beiden Bosse ist der Maul also
    // trotz geringerer Roh-DPS besser ⇒ die beiden Melee-Spieler-Zeilen STEIGEN (idol_warden 55.96→59.39 s,
    // last_idol 183.02→199.15 s; Boss→Spieler 20.76→20.65 / 14.70→14.63, minimal — anderer str/lck-Mix).
    // Das ist kein Balance-Rückschritt, sondern die Grenze des Schätzers: gegen Ausweich-/Ward-Ziele
    // (Hochland-Rocs, Klippengeister, Esthars eigenes Gebiet) greift die +27 % Roh-DPS voll, und die
    // Formel ignoriert Esthars Drop-Premium (everyNth n=4 = +25 % auf die Grundspanne, Blutung 0,35×6/6 s)
    // komplett. Ranged/Magic exakt unverändert (kein Nicht-Melee-Slot betroffen).
    // Re-Messung 2026-08-28 — Zauberreserve (Chef-GO 28.08.2026, design/zauberreserve-weisheit.md):
    // Mana ist kein Verbrauch mehr, die Fokus-Haltung (offensive Magie-Haltung) liest die Reserve:
    // +1 % Zauberschaden je 60 Reserve, Deckel +15 % (Balance-Audit-Korrektur; die Spec nannte 1 %/40 und
    // +30 %). Das CL-90-Magie-„damage"-Kit liegt am Deckel (Reserve ≈ 1 000 ⇒ +15 %), die beiden Magie-
    // Spieler-Zeilen sinken daher exakt um den Faktor 1/1,15 (idol_warden 58.05→50.48 s, last_idol
    // 194.82→169.41 s). Boss→Spieler unverändert (der Weisheits-Status-Widerstand greift nur auf
    // Statuseffekte, nicht auf den Treffer-Schaden dieser Formel); melee/ranged exakt unverändert.
    // Re-Messung 2026-08-29 — Aether-Klippe (Chef-GO 29.08.2026, design/balance-audit-magie-2026-08-28.md
    // R5 (b)): die Paritäts-Anhebung der Aether-Stäbe war eine Klippe (Roh-DPS ×2,25 R70→R80); jetzt
    // einheitliche +36-%-Prämie wie godiron_staff: titanium_staff 11,4–17,2 → 8,8–13,3, aetherium_staff
    // 12,5–18,8 → 11,0–16,6 (Tempo unverändert). Der CL-90-Magic-"damage"-Build behält aetherium_staff
    // als BiS-Mainhand (Roh-DPS 5,05 > stormcrest_staff 4,72), seine Kit-Spanne mit Zauberfokus liegt jetzt
    // bei 105,8–116,0 ⇒ NUR die beiden magic-Spieler-Zeilen steigen leicht (langsamerer Kill): idol_warden 50.48→52.02 s,
    // last_idol 169.41→174.56 s. Boss→Spieler (28.03/30.12) und alle melee/ranged-Paare exakt unverändert.
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 2, design/schmuck-audit-
    // 2026-08-29.md §3.5): 7 neue Fernkampf-Ringe + 7 neue Fernkampf-Amulette (skillBoost.ranged
    // 1-4 + precision + evasionRating, erste jemals konkurrenzfähige craftbare Fernkampf-Schmuck-
    // Reihe) schlagen an mehreren Slots die bisherige BiS-Wahl des CL-90-Ranged-„damage"-Builds ⇒
    // schnellerer Kill (mehr ranged-Skalierung/Precision) und leicht höhere Gegner-Landchance
    // (Kontest-`evasion` verschiebt sich mit, s. Kopf-Pin oben): ranged/idol_warden 78.23/19.78 →
    // 73.03/19.60, ranged/last_idol 258.94/13.67 → 241.29/13.50. Melee/Magic exakt unverändert
    // (kein Nicht-Ranged-Slot betroffen).
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 3, §3.2/§3.3): armorPen erstmals auf
    // den bestehenden Craft-Ringen (ruby/bloodstone/diamond/onyx/voidstone/godgem_ring + garnet/
    // gemstone/warband/grave_warden) — der CL-90-Melee-„damage"-Build trägt jetzt godgem_ring
    // (armorPen 0,018) auf beiden Ringplätzen (0,036 zusätzlich zur Waffe) und mitigiert die
    // Idol-Boss-Rüstung stärker ⇒ schnellerer Kill: idol_warden 59.39→58.93 s. Boss→Spieler
    // unverändert (kein Angriffswert des Spielers geändert, nur Verteidigung gegen Boss-Rüstung).
    // last_idol trägt denselben armorPen-Hebel: 199.15→197.39 s.
    // wardBreak auf der neuen Magie-Ring-Reihe (§3.6) hebt zusätzlich die Ward-Durchdringung des
    // CL-90-Magic-„damage"-Builds (godsight_loop wardBreak 0,026 auf beiden Ringplätzen) ⇒ etwas
    // schnellerer Kill gegen die ward-tragenden Idol-Bosse: idol_warden 52.02→52.67 s. Derselbe Kit-
    // Wechsel trägt jetzt auch wardCapacity auf beiden Ringen (statt keiner) — der Boss braucht
    // dadurch spürbar länger, den Magic-Build zu töten: idol_warden→Spieler 28.03→31.76 s.
    // last_idol (schwächere Boss-Rüstung/-Angriff) trägt denselben wardBreak-Hebel: 174.56→176.94 s,
    // und denselben wardCapacity-Hebel gegen den Boss: last_idol→Spieler 30.12→34.21 s.
    // Re-Messung 2026-08-29 (content-dev): voidscribe_glyph int 8→6/wis 5→7 (spell-focus.test.ts §3
    // Re-Pin, s. Item-Kommentar) senkt das INT des CL-90-Magic-Builds leicht ⇒ minimal langsamerer
    // Kill: idol_warden 52.67→53.36 s, last_idol trägt denselben Hebel: 176.94→177.85 s.
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 4, §3.7): armorPen erstmals auf den
    // Amulett-Slot (5 neue Nahkampf-Amulette + die 5 Edelstein-Amulette als Ersatz für das laut
    // Doku geplante, aber Guard-verbotene bonus.hpRegenPerSec) — der CL-90-Melee-Build trägt jetzt
    // zusätzlich warcrown_reliquary (armorPen 0,018) am Amulett-Slot obendrauf ⇒ noch schnellerer
    // Kill: idol_warden 58.93→57.54 s. Der zusätzliche Attributpunkt-Zuwachs (Amulett trägt jetzt
    // mehr str/con) verschiebt auch die Boss→Spieler-Zeile geringfügig: 20.65→20.48. last_idol
    // trägt denselben Doppel-Hebel: 197.39→192.58 s, Boss→Spieler 14.63→14.50.
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 4, §3.8): der CL-90-Melee-„damage"-
    // Build (Score-Heuristik, kein echter DPS-Optimierer) ersetzt Amulett/ring2 durch die beiden
    // neuen Fundstücke ashenvow_locket (str8/con5, desperation) und thornwarden_seal (str7/con7/
    // lck2, vengeance) — mehr Rohattribute, aber KEIN armorPen mehr an diesen zwei Slots (die
    // Vorgänger trugen welches). Gegen die rüstungsbasierten Idol-Bosse (defenseType armor) wiegt
    // der Mitigations-Verlust den Rohschaden-Gewinn auf — dasselbe „Esthar vs. aetherium_maul"-
    // Muster wie oben: langsamerer statt schnellerer Kill: idol_warden 57.54→59.57 s, last_idol
    // trägt denselben Effekt: 192.58→199.69 s, Boss→Spieler beider Bosse geht dabei leicht zurück
    // auf die alten W3-Werte (20.65/14.63).
    // Der CL-90-Magic-„damage"-Build ersetzt sein Amulett durch tidewrack_collar (int6/wis3,
    // wardSiphon) — KEIN wardCapacity mehr an diesem Slot (der Vorgänger gravecall_sigil trug
    // wardCapacity 20) ⇒ der Boss braucht spürbar weniger Zeit, den Build zu töten: idol_warden→
    // Spieler 31.54→30.42 s, last_idol→Spieler 33.97→32.77 s. Spieler→Boss-Zeilen fast unverändert
    // (minimale int/wis-Verschiebung): idol_warden 53.36→53.45 s, last_idol 179.28→179.58 s.
    // Re-Messung 2026-08-29 (content-dev, Schmuck-Rework Welle 5, §1.7 Glücks-Pass): mehrere der
    // 44 umverteilten Schmuck-/Signatur-Items tragen jetzt mehr str/con statt lck — der CL-90-
    // Melee-„damage"-Build wird dadurch stärker, schnellerer Kill: idol_warden 59.57→57.76 s
    // (Boss→Spieler 20.65→20.76), last_idol 199.69→193.68 s (Boss→Spieler 14.63→14.70). Derselbe
    // Pass hebt int/wis auf mehreren Magie-Items (stormcaller_amulet, abyssal_signet, ...) — der
    // CL-90-Magic-Build trifft dadurch stärker. Nach den beiden spell-focus-Korrekturen (abyssal_
    // signet int 7→4/wis 0→3, hollowveil_locket int 9→8/wis 6→7, s. dortige Item-Kommentare) final
    // gemessen: idol_warden 53.45→52.69 s (Boss→Spieler 30.42→30.00), last_idol 179.58→176.98 s
    // (Boss→Spieler 32.77→32.32).
    const pins: Array<[WeaponStyle, string, number, number]> = [
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework: Eisenschlund „Eisenkiefer" (+3 % Nahkampfschaden) ersetzt
      // skillBoost +2 Power im Melee-„damage"-Build ⇒ idol_warden 57.76→56.145 s, last_idol 193.68→188.275 s
      // (Boss→Spieler unverändert).
      // claude:2026-10-17T20:50:00+02:00 — Apply 6 (alle Begleiter besessen, Echo 25 %): Spieler-TTK unverändert,
      // Boss→Spieler +1,2–2,4 % aus den Echo-Schutzanteilen (Schadensred./Ward/Kill-Heilung), z. B. idol_warden
      // melee 20.76→21.02, magic 30.00→30.72.
      ["melee", "idol_warden", 56.145, 21.02],
      ["melee", "last_idol", 188.275, 14.89],
      // claude:2026-10-24T21:40:00+02:00 — 1.4.0 FK (Chef 24.10.: „Entscheide das Beste“, Gate B F1–F5): Bogenleiter,
      // Jägerisch 3/6/10, Köcher in der Nebenhand und Grundpfeil der Stufe (design/1.4.0-balance-fernkampf.md §10.3,
      // Erwartung 55,13/20,22 und 181,59/13,89). Bauer-Waffenwahl bleibt (vergleichbar), Melee/Magie unverändert.
      ["ranged", "idol_warden", 55.13, 20.22],
      ["ranged", "last_idol", 181.59, 13.89],
      ["magic", "idol_warden", 52.69, 30.72],
      ["magic", "last_idol", 176.98, 33.09],
    ];
    for (const [style, monsterId, playerS, enemyS] of pins) {
      const ttk = expectedTtk(style, monsterId);
      expect(ttk.player, `TTK Spieler→${monsterId} (${style})`).toBeCloseTo(playerS, 2);
      expect(ttk.enemy, `TTK ${monsterId}→Spieler (${style})`).toBeCloseTo(enemyS, 1);
    }
  });

  it("CL-99-Parität je Stil (Chef-GO 17.10.2026, 1.3.0 E5): Waffen ab 95 + Chase-Nachzug", () => {
    // codex:2026-10-17T16:00:00+02:00 — NEUER Pin (design/1.3.0-balance-e5-e6.md „Pins und Wächter",
    // Chef-GO 17.10.2026: Nachzug JA, Fernkampf-Abstand bleibt als Stil-Eigenart). Gleiche Formel wie die
    // TTK-Matrix oben, nur auf CL 99 (damage-BiS, alle Buffs). Die Pins auf CL 30/60/90 bewegen sich NICHT:
    // jede neue Waffe trägt Req ≥ 95 und fällt durch requirementsOk. Erwartung laut Spec: Fernkampf/Nahkampf
    // ≈ 0,73, Magie/Nahkampf ≈ 1,04 (vorher 0,69 / 0,97). Gemessen nach der Umsetzung: 0,74 / 1,08 — leicht
    // über der Spec-Schätzung, Richtung wie beschlossen (BiS-Wahl R9 crownless_warbow / M9 crownless_stave).
    // Spieler-TTK gegen drazhan 254,69 / 343,58 / 236,29 s, gegen last_idol 151,09 / 204,19 / 137,07 s
    // (Spec: 255 / 349 / 245 bzw. 151 / 208 / 142).
    expect(bis("ranged", 99, "damage").kit.mainhand).toBe("crownless_warbow");
    expect(bis("magic", 99, "damage").kit.mainhand).toBe("crownless_stave");
    const pins: Array<[WeaponStyle, number, number]> = [
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Eisenkiefer +3 % Nahkampfschaden (statt +2 Power) ⇒ 254.69→247.57 / 151.09→146.86 s.
      ["melee", 247.57, 146.86],
      // claude:2026-10-24T21:40:00+02:00 — 1.4.0 FK (s. TTK-Matrix oben): 343,58 → 242,14 / 204,19 → 144,55 s (Spec §10.3).
      ["ranged", 242.14, 144.55],
      ["magic", 236.29, 137.07],
    ];
    for (const [style, drazhanS, lastIdolS] of pins) {
      expect(expectedTtk(style, "drazhan", 99).player, `CL 99 ${style} → drazhan`).toBeCloseTo(drazhanS, 1);
      expect(expectedTtk(style, "last_idol", 99).player, `CL 99 ${style} → last_idol`).toBeCloseTo(lastIdolS, 1);
    }
    const melee = expectedTtk("melee", "drazhan", 99).player;
    // claude:2026-10-18T02:00:00+02:00 — 1.3.0: der stärkere Nahkampf-Begleiter verschiebt die Verhältnisse 0,74→0,72 / 1,08→1,05.
    // claude:2026-10-24T21:40:00+02:00 — 1.4.0 FK: Fernkampf schließt auf, 0,72 → 1,02 (Spec §10.3, Chef-Ziel ±5 %).
    expect(melee / expectedTtk("ranged", "drazhan", 99).player, "Parität Fernkampf/Nahkampf").toBeCloseTo(1.02, 2);
    expect(melee / expectedTtk("magic", "drazhan", 99).player, "Parität Magie/Nahkampf").toBeCloseTo(1.05, 2);
  });

  // claude:2026-10-30T19:14:00+01:00 — 1.4.2 Chef-Entscheid E6 (design/1.4.2-aschesturz-spec.md § 3): Narbenfaust und Narbengewebe +2/4/6/8/10 %
  // statt +1–5 %. Der Grenztest zieht auf die neue Obergrenze nach (Leben/Schaden ≤ 1,10, Spieler-TTK ≥ 1/1,10, Gegner-TTK
  // ≤ 1,10); sonst bleibt alles wie in Balance § 7. Kein anderer Balance-Wert ändert sich.
  it("Narbenbuch-Macht-Ast voll (Leben +10 %, Schaden +10 %, Gold +5 %) verschiebt TTK höchstens 10 % (Spec 1.4.2 E6)", () => {
    // claude:2026-10-18T12:00:00+02:00 — Prestige Welle B2: die Pins oben bleiben die kodexfreie Basis
    // (buildBisCharacter kauft keine Narbenbuch-Ränge). Hier derselbe BiS-Stand mit vollem Macht-Ast im
    // zweiten Durchgang (Baum freigeschaltet): Quote Leben ≤ 1,10, Schaden ≤ 1,10, Spieler-TTK ≥ 1/1,10,
    // Gegner-TTK ≤ 1,10 je Stil, gegen die CL-90-Matrix und die CL-99-Bosse.
    const cases: Array<[WeaponStyle, number, string]> = [];
    for (const style of STYLES) {
      for (const mid of ["idol_warden", "last_idol"]) cases.push([style, 90, mid]);
      for (const mid of ["drazhan", "last_idol"]) cases.push([style, 99, mid]);
    }
    for (const [style, lvl, monsterId] of cases) {
      const base = bis(style, lvl, "damage").state;
      const scarred = structuredClone(base);
      scarred.prestige = { ...scarred.prestige, count: 1 };
      scarred.talents = { ...scarred.talents, prestige: { maxHp: 5, damage: 5, goldFind: 1 } };
      const a = computeStats(base, content);
      const b = computeStats(scarred, content);
      const tag = `${style} CL ${lvl} vs ${monsterId}`;
      expect(b.maxHp / a.maxHp, `Leben ${tag}`).toBeLessThanOrEqual(1.1 + 1e-12);
      expect(b.attackDamage / a.attackDamage, `Schaden ${tag}`).toBeLessThanOrEqual(1.1 + 1e-12);
      const ta = expectedTtkOf(base, monsterId);
      const tb = expectedTtkOf(scarred, monsterId);
      expect(tb.player / ta.player, `Spieler-TTK ${tag}`).toBeGreaterThanOrEqual(1 / 1.1 - 1e-12);
      expect(tb.enemy / ta.enemy, `Gegner-TTK ${tag}`).toBeLessThanOrEqual(1.1 + 1e-12);
    }
  });

  it("MIN_HIT_CHANCE-Boden: selbst gegen den BiS-Evasion-Build fällt die Contest-Chance nie unter 10 %", () => {
    // Der Unverwundbarkeits-Riegel aus combat.ts — hier gegen die real höchste erreichbare
    // Evasion verifiziert. Der 40-%-Dodge liegt zusätzlich davor, wird aber seit #301 (L5-NACHTRAG)
    // vom Kombiboden geklemmt: auch Dodge × Contest zusammen fällt nie unter 10 % (Guard in
    // evasion-tempo-taming.test.ts; hier der reine Contest-Anteil).
    const st = computeStats(bis("ranged", 90, "dodge").state, content);
    const weakest = Object.values(content.monsters).reduce((a, m) => (m.accuracy < a.accuracy ? m : a));
    expect(hitChance(enemyEffectiveAccuracy(weakest), st.evasion)).toBeGreaterThanOrEqual(MIN_HIT_CHANCE);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §6 Runen-Stapelung: seit dem Chef-Entscheid 25.08.2026 ERLAUBT — Pin statt Guard
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §6: Runen-Stapelung (Chef-Entscheid 25.08.2026)", () => {
  it("gestapelte Runen summieren voll (2× Swift III ⇒ +6 dex)", () => {
    // Das war vor #303 legal, war während der Sperre nur noch als Alt-Save GEDULDET und ist seit
    // dem Chef-Entscheid wieder der Normalfall: instanceBonusDelta kennt bewusst keinen Dedup.
    // Reißt dieser Pin, summiert das Stapeln nicht mehr — und der ganze Sinn wäre weg.
    expect(content.affixes?.affix_swift?.modifiersByTier?.[2]?.dex).toBe(3);
    const inst: ItemInstance = {
      instanceId: "t-dup",
      baseItemId: "adamantium_dagger",
      affixes: [
        { affixId: "affix_swift", tier: 3 },
        { affixId: "affix_swift", tier: 3 },
      ],
    };
    expect(instanceBonusDelta(inst, content).modifiers.dex).toBe(6);
  });

  it("Worst-Case-Builds belegen ALLE Rarity-Slots mit dem besten Affix (Hüllen-Bauer spiegelt die Rechtslage)", () => {
    // Detektor in die andere Richtung als früher: baut der Hüllen-Bauer wieder eine Bestenliste
    // VERSCHIEDENER Affixe, misst die ganze Suite einen zu SCHWACHEN Worst Case — sie wäre dann
    // keine obere Schranke mehr. Mindestens ein Build muss deshalb echt stapeln.
    let gestapelt = 0;
    for (const lvl of TIERS) {
      for (const target of TARGETS) {
        const b = bis("melee", lvl, target);
        for (const inst of Object.values(b.state.character.equippedInstances)) {
          if (!inst || inst.affixes.length === 0) continue;
          const ids = inst.affixes.map((a) => a.affixId);
          // Alle Affixe einer Instanz sind derselbe (der bestbewertete) — nie eine Mischung.
          expect(new Set(ids).size, `Affix-Sorten auf ${inst.baseItemId} (${target}@CL${lvl})`).toBe(1);
          if (ids.length > 1) gestapelt++;
        }
      }
    }
    expect(gestapelt, "kein einziger Build stapelt — der Worst Case wäre zu schwach").toBeGreaterThan(0);
  });

  it("Bogen-Regel: JEDE Fernkampfwaffe ist zweihändig (Chef-Entscheid 23.08.2026)", () => {
    // Vorgeschichte: Bis 1.0.1 trugen nur die thematischen Drop-Bögen `twoHanded: true`, die
    // gefletchte Tier-Leiter (copper→godiron short-/longbow) nicht — ein Fernkämpfer mit
    // Craft-Bogen durfte Kiteschild+Block stacken. Der Detektor an dieser Stelle hat das seit
    // 2026-07-09 als OFFENE Content-Frage festgehalten; ein Spieler hat sie am 23.08. von selbst
    // gestellt („bow + kite shield … feels more sensible to not be able to"). Chef-Entscheid:
    // alle Fernkampfwaffen belegen beide Hände. Die Regel selbst hängt in `weapon-hands.test.ts`;
    // hier bleibt nur der BALANCE-Bezug stehen, weil die §4-Tank-/Block-Pins und die TTK-Matrix
    // von dieser Frage abhängen (die ranged-Zeile der Matrix wurde dadurch neu gemessen).
    expect(content.items.adamantium_longbow?.twoHanded).toBe(true);
    expect(content.items.godiron_longbow?.twoHanded).toBe(true);
    expect(content.items.abyssal_tide_bow?.twoHanded).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §8 Meister-Perk-Inventur (Meisterweihe-Fundament, master-capes-konzept.md — Content-Welle
//    2026-07-10; seit SAVE 69 sind die Meister-Items RINGE statt Capes, Chef-Entscheid
//    2026-07-17, Stats/Perks 1:1 übernommen): 15 der 22 Meisterringe tragen einen `masterPerk`
//    (die Ökonomie-Perks, seit 1.2.0 „Fasern und Fallen" inkl. ring_master_hunting, seit dem
//    Skill-Split Schneidern (SAVE 86) inkl. ring_master_tailoring); die 7
//    Kampf-Ringe (attack/power/defence/ranged/magic/warding/vitality) nutzen bestehende
//    Bonus-/Signaturfelder — KEIN masterPerk (Konzept §2).
//    `ring_master_completion` trägt ebenfalls keinen masterPerk (Krönung, kein Stapeln).
//    Der vormals geparkte `ring_master_enchanting` ist ENTFERNT (Welle TT, Chef-Entscheid
//    2026-07-18: Enchanting in Runecrafting integriert — es kommt kein Enchanting-Skill).
//    Kampf-Envelopes (§2-§5) bleiben unverändert: die Suite misst nur bei targetLevel 30/60/90
//    (TIERS), die Ringe verlangen 99 → requirementsOk schließt sie dort aus (s. balance-envelope-
//    helpers.ts Kopfkommentar „MEISTERRINGE"); nur ein einzelner Level-99-Build außerhalb dieser
//    Suite (idol-sanctum-clear.test.ts) kann sie tragen, dort rein verhaltensbasiert geprüft.
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §8: Meister-Perk-Inventur (masterPerk-Quellen)", () => {
  it("Ring-Umbau SAVE 69: alle Meisterringe existieren, GENAU 20 Teile tragen einen masterPerk (seit 1.4.0 inkl. Bognerei)", () => {
    // Detektor: reißt dieser Pin, hat sich die Perk-Verteilung der Meisterringe verschoben —
    // bewusst neu messen & pinnen (Anzahl Träger, Kampf-Envelopes §2-§5 gegenprüfen).
    // Schmuck-Rework Welle 5 (content-dev, 29.08.2026, §3.9): 4 neue craftbare Skilling-Ringe/
    // -Amulette (oreveined_hoop/thriftcut_cinch/steadhand_cuff/harvestward_clutch, jeweils halbe
    // Magnitude ihres gleichnamigen Meisterrings) — 15→19.
    const carriers = Object.values(content.items)
      .filter((it) => it.masterPerk)
      .map((it) => it.id)
      .sort();
    expect(carriers, "masterPerk-Träger im Katalog").toEqual(
      [
        "ring_master_cooking",
        "ring_master_farming",
        "ring_master_fishing",
        "ring_master_foraging",
        "ring_master_herblore",
        "ring_master_hunting",
        "ring_master_jewelcrafting",
        "ring_master_leatherworking",
        "ring_master_mining",
        "ring_master_tailoring", // Skill-Split Schneidern (SAVE 86, 28.08.2026): inputSaver wie leatherworking
        "ring_master_bowcraft", // claude:2026-10-24T21:10:00+02:00 — Bognerei (1.4.0 FK): inputSaver wie Schneidern
        "ring_master_runecrafting",
        "ring_master_slayer",
        "ring_master_smithing",
        "ring_master_thieving",
        "ring_master_woodcutting",
        "oreveined_hoop",
        "thriftcut_cinch",
        "steadhand_cuff",
        "harvestward_clutch",
      ].sort(),
    );
    const ringIds = Object.keys(content.skills)
      .filter((s) => content.items[masterRingItemId(s)])
      .sort();
    expect(ringIds, "existierende ring_master_*-Items je Skill").toEqual(
      Object.keys(content.skills).sort(),
    ); // alle 20 Skills haben ihren Ring
  });

  it("alle deklarierten masterPerk-Werte liegen in [0, MASTER_PERK_CAP] (heute vakuum-wahr — Guard für die Content-Welle)", () => {
    for (const it of Object.values(content.items)) {
      const perk = it.masterPerk;
      if (!perk) continue;
      expect(Number.isFinite(perk.value), `${it.id}.masterPerk.value endlich`).toBe(true);
      expect(perk.value, `${it.id}.masterPerk.value ≥ 0`).toBeGreaterThanOrEqual(0);
      expect(perk.value, `${it.id}.masterPerk.value ≤ Cap(${perk.kind})`).toBeLessThanOrEqual(
        MASTER_PERK_CAP[perk.kind],
      );
      // Skill-Scope muss (falls deklariert) auf einen existierenden Skill zeigen.
      if (perk.skill !== undefined) {
        expect(content.skills[perk.skill], `${it.id}.masterPerk.skill existiert`).toBeDefined();
      }
    }
  });

  it("Worst-Case-Doppelertrag-Kette bleibt eine CHANCE < 1: Mastery-Cap + Pool + Pet-Cap + bester Buff + masterPerk-Decke", () => {
    // Ehrliche Messung der additiven bonusChance-Kette (tick.ts): masteryDoubleChance-Cap (0.5)
    // + Pool-Capstone (poolCheckpointBonus(1).double) + Pet-Familien-Cap (doubleDrop) + stärkster
    // gatherYieldMult-Buff im Katalog + masterPerk-DECKE (MASTER_PERK_CAP.doubleYield — heute
    // trägt kein Item einen Perk, der Cap ist die obere Schranke jeder künftigen Content-Welle).
    // Solange die Summe < 1 bleibt, ist der Doppelertrag nie ein Automatismus.
    const bestBuff = Math.max(
      0,
      ...Object.values(content.items).map((it) => it.buff?.bonus?.gatherYieldMult ?? 0),
    );
    const petCap = PET_SKILL_EFFECT_CAP.doubleDrop ?? 0;
    const worst =
      MASTERY_DOUBLE_CAP + poolCheckpointBonus(1).double + petCap + bestBuff + MASTER_PERK_CAP.doubleYield;
    // Gemessen 2026-07-09: 0.5 + 0.08 (Pool 0.03+0.05) + 0.05 + 0.20 + 0.10 = 0.93. Detektor:
    // hebt jemand eine der Quellen an, reißt zuerst dieser Pin (Summe), dann die < 1-Schranke.
    expect(bestBuff).toBeCloseTo(0.2, 5); // stärkstes Ertrag-Tonikum im Katalog (Detektor)
    expect(worst).toBeCloseTo(0.93, 5);
    expect(worst).toBeLessThan(1);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §7 Ökonomie-Schnellcheck: kein profitabler Kauf→Verkauf-Loop im Shop
// ───────────────────────────────────────────────────────────────────────────
describe("Balance-Envelope §7: Shop-Ökonomie", () => {
  it("Worst-Case-Verkaufspreis (inkl. bestem sellBonus-Pet) liegt bei JEDEM Shop-Item unter dem Kaufpreis", () => {
    // Spiegelt effectiveSellPrice (shop.ts): sellPrice = max(1, round(value·SELL_FRACTION)),
    // dann ×(1+petSellBonus) gerundet, min 1. petSellBonus über PET_SKILL_EFFECT_CAP gedeckelt.
    const maxSellBonus = Math.max(
      0,
      ...Object.values(content.pets ?? {}).map((p) =>
        p.skillEffect?.kind === "sellBonus"
          ? Math.min(PET_SKILL_EFFECT_CAP.sellBonus ?? 0, p.skillEffect.value ?? 0)
          : 0,
      ),
    );
    // claude:2026-10-18T02:00:00+02:00 — 1.3.0: kein Begleiter trägt mehr sellBonus (Pergamotte → „Archivar"); die Schleife
    // bleibt als Wächter, falls das Kind je zurückkehrt.
    expect(maxSellBonus).toBe(0);
    expect(content.shop.length).toBeGreaterThan(0);
    for (const entry of content.shop) {
      const item = content.items[entry.itemId];
      expect(item, `Shop-Item ${entry.itemId} existiert`).toBeTruthy();
      const sellBase = Math.max(1, Math.round((item!.value ?? 0) * SELL_FRACTION));
      const sellEff = Math.max(1, Math.round(sellBase * (1 + maxSellBonus)));
      expect(sellEff, `Kauf→Verkauf-Loop bei ${entry.itemId}`).toBeLessThan(entry.cost);
    }
  });
});
