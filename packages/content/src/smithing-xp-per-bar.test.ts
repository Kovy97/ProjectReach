import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Wächter-Test für Smithing-Forge-Rezepte, in zwei Runden gewachsen:
 *
 * 1) Chef-Entscheid 25.08.2026 (Vormittag; design/smithing-xp-barren.md, Option B): Forge-Dauer koppelt
 *    an die Barren-Zahl (durationMs = Barren × Tier-Sekunden) statt an eine frei vergebene "Schwere".
 *    Prüfung unten: "Dauer/Barren bleibt je Tier stabil".
 *
 * 2) Chef-Entscheid 25.08.2026 (Nachmittag; "Leiter ab Barren-Level", siehe der lange Kommentar vor
 *    smelt_copper im Content): das levelRequired jedes Forge-Rezepts wurde neu verteilt, sodass der
 *    Dolch (leichtestes Item) IMMER exakt auf dem Barren-Level des Tiers liegt und die restliche Leiter
 *    von dort nach Gewicht aufsteigt (statt vorher pauschal 5+ Level über dem Barren zu kleben — der
 *    Chef hatte 200+ Mithril-Barren gefarmt und konnte den ersten Mithril-Dolch immer noch nicht bauen).
 *    Weil jetzt ein Tier bis zu 10 Spieter-Level überspannt (statt vorher 2-3), ist "XP/Barren je Tier
 *    konstant" keine gültige Prüfung mehr — die Ziel-XP/h-Kurve steigt pro Level, ein Tier mit größerer
 *    Level-Spanne hat also zwangsläufig eine größere XP/Barren-Spanne. Die eigentliche Invariante ist
 *    nicht mehr "XP/Barren ≈ Tier-Median", sondern direkt die Formel je Rezept:
 *      target_xph(L) = 600 · sqrt(xpForLevel(L+1) − xpForLevel(L))
 *      xp = max(1, round(target_xph(levelRequired) · durationMs / 3_600_000))
 *    Prüfung unten: "XP folgt der Formel für das eigene levelRequired" (±2 % Rundungstoleranz).
 *
 *    Sonderfall L99 (Level-Cap): godiron_greatsword/-maul/-platebody liegen auf L99, dem höchsten
 *    erreichbaren Spieler-Level. `xpForLevel` im Engine-Code (leveling.ts) klemmt bei MAX_LEVEL=99 —
 *    für den Balance-Zweck hier (die Kurve DARF am Cap nicht plötzlich abflachen) wird die Tabelle daher
 *    zwei Stufen über den Cap hinaus mit derselben Formel weitergerechnet (rein rechnerisch, kein
 *    Spieler erreicht Level 100). Ohne diese Erweiterung wichen exakt die 4 L99-Rezepte vom Original ab
 *    (verifiziert per Vergleich gegen den Stand vor der Level-Umverteilung: 232/236 stimmten schon mit
 *    der geklemmten Tabelle exakt, erst die Erweiterung brachte alle 236/236 auf 0 Abweichung).
 *
 *    Zusätzlich NEU: je Tier muss das niedrigste Forge-Level exakt dem Barren-Level (smelt_<tier>)
 *    entsprechen, UND "dagger" muss eines der Items auf diesem niedrigsten Level sein — das ist die
 *    eigentliche Chef-Anforderung ("Dolch immer zuerst, auf Barren-Level").
 *
 * Betroffen sind ausschließlich die 236 reinen Barren-Rezepte der 12 Haupt-Tiers (forge_copper_* bis
 * forge_godiron_*). Gravesteel-, Murkvein-, Void- und Slayer-Sonderrezepte mit gemischten Inputs bleiben
 * unverändert und fallen hier bewusst raus (kein Dolch, keine einheitliche Leiter für die).
 */

// Barren-Items folgen der Konvention "<metall>_bar" (copper_bar, blacksteel_bar, murkvein_bar, ...).
const BAR_SUFFIX = "_bar";

// Die 12 Haupt-Tiers, für die die Leiter gilt (murkvein ist ein Singleton-Sondertier ohne Dolch/Leiter).
const MAIN_TIERS = new Set([
  "copper_bar", "bronze_bar", "iron_bar", "steel_bar", "blacksteel_bar", "mithril_bar",
  "adamantium_bar", "runite_bar", "bloodiron_bar", "titanium_bar", "aetherium_bar", "godiron_bar",
]);

// xpForLevel-Tabelle 1:1 aus packages/engine/src/leveling.ts nachgebaut (das Content-Paket hängt bewusst
// nicht von @hearthforge/engine ab). MAX_LEVEL + 2 Zusatzstufen: die Balance-Formel braucht xpForLevel
// (L+1) auch für L=99 (Level-Cap); die Engine klemmt dort, hier wird die Kurve für den Formel-Vergleich
// unverändert weitergerechnet (siehe Kommentar oben, Sonderfall L99).
const MAX_LEVEL = 99;
function buildXpTable(upTo: number): number[] {
  const table: number[] = [0, 0];
  let acc = 0;
  for (let n = 1; n < upTo; n++) {
    acc += Math.floor(n + 300 * Math.pow(2, n / 7));
    table[n + 1] = Math.floor(acc / 4);
  }
  return table;
}
const XP_TABLE = buildXpTable(MAX_LEVEL + 2);
function xpForLevelUnclamped(level: number): number {
  return XP_TABLE[level]!;
}
function expectedXp(levelRequired: number, durationMs: number): number {
  const targetXph = 600 * Math.sqrt(xpForLevelUnclamped(levelRequired + 1) - xpForLevelUnclamped(levelRequired));
  return Math.max(1, Math.round((targetXph * durationMs) / 3_600_000));
}

const DUR_PER_BAR_TOLERANCE = 0.10;
const XP_FORMULA_TOLERANCE = 0.02;

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid]!;
  return sorted.length % 2 !== 0 ? upper : (sorted[mid - 1]! + upper) / 2;
}

type Recipe = {
  id: string;
  tier: string; // Barren-Item-Id, dient als Tier-Schlüssel
  suffix: string; // Item-Suffix nach "<tier>_", z.B. "dagger"
  bars: number;
  durationMs: number;
  xp: number;
  levelRequired: number;
};

// Ein "reines Barren-Rezept" hat AUSSCHLIESSLICH Barren-Items als Input — genau die Rezepte, die beide
// Chef-Entscheide betreffen. Gemischte Rezepte (Gravesteel + crude_bone, Void + void_essence, Slayer-
// Sonderteile) bleiben laut Design-Dokument bewusst unverändert und fallen hier raus.
const recipes: Recipe[] = [];
for (const action of Object.values(content.actions)) {
  if (action.skill !== "smithing") continue;
  const inputs = action.inputs ?? [];
  if (inputs.length === 0) continue;
  if (!inputs.every((inp) => inp.itemId.endsWith(BAR_SUFFIX))) continue;
  const barIds = new Set(inputs.map((inp) => inp.itemId));
  if (barIds.size !== 1) continue; // aktuell mischt kein Rezept zwei Barren-Sorten
  const barId = [...barIds][0]!;
  const bars = inputs.reduce((sum, inp) => sum + inp.qty, 0);
  const lootId = action.loot?.[0]?.itemId ?? "";
  const prefix = barId.slice(0, -BAR_SUFFIX.length) + "_";
  const suffix = lootId.startsWith(prefix) ? lootId.slice(prefix.length) : lootId;
  recipes.push({
    id: action.id,
    tier: barId,
    suffix,
    bars,
    durationMs: action.durationMs,
    xp: action.xp,
    levelRequired: action.levelRequired ?? 1,
  });
}

const byTier = new Map<string, Recipe[]>();
for (const r of recipes) {
  if (!byTier.has(r.tier)) byTier.set(r.tier, []);
  byTier.get(r.tier)!.push(r);
}

// Barren-Level je Tier (levelRequired des smelt_<tier>-Rezepts), für die "Leiter ab Barren-Level"-Prüfung.
const smeltLevelByBar = new Map<string, number>();
for (const action of Object.values(content.actions)) {
  if (action.skill !== "smithing" || !action.id.startsWith("smelt_")) continue;
  const lootId = action.loot?.[0]?.itemId;
  if (lootId && lootId.endsWith(BAR_SUFFIX)) smeltLevelByBar.set(lootId, action.levelRequired ?? 1);
}

describe("Smithing: Forge-Rezepte folgen der XP-Formel und der Leiter ab Barren-Level (Chef-Entscheid 25.08.2026)", () => {
  it("findet die erwarteten reinen Barren-Forge-Rezepte (236 Haupt-Tiers + murkvein_longsword)", () => {
    expect(recipes.length).toBe(237);
  });

  for (const [tier, items] of byTier) {
    if (items.length < 2) continue; // Singleton-Tiers (murkvein_bar) haben trivial keine Streuung

    it(`${tier}: XP folgt für jedes Rezept der Formel für das eigene levelRequired (±${(XP_FORMULA_TOLERANCE * 100).toFixed(0)}% Rundung)`, () => {
      for (const r of items) {
        const want = expectedXp(r.levelRequired, r.durationMs);
        const dev = Math.abs(r.xp - want) / want;
        expect(
          dev,
          `${r.id}: L${r.levelRequired}, ${r.durationMs} ms Dauer → xp=${r.xp}, Formel erwartet ${want} ` +
            `(Abweichung ${(dev * 100).toFixed(2)}%)`,
        ).toBeLessThanOrEqual(XP_FORMULA_TOLERANCE);
      }
    });

    const durPerBarMedian = median(items.map((r) => r.durationMs / r.bars));
    it(`${tier}: Dauer/Barren bleibt je Rezept innerhalb ±${(DUR_PER_BAR_TOLERANCE * 100).toFixed(0)}% vom Tier-Median (${durPerBarMedian.toFixed(1)} ms/Barren)`, () => {
      for (const r of items) {
        const ratio = r.durationMs / r.bars;
        const dev = Math.abs(ratio - durPerBarMedian) / durPerBarMedian;
        expect(
          dev,
          `${r.id}: ${r.bars} Barren, ${r.durationMs} ms Dauer → ${ratio.toFixed(1)} ms/Barren ` +
            `(Tier-Median ${durPerBarMedian.toFixed(1)}, Abweichung ${(dev * 100).toFixed(1)}%)`,
        ).toBeLessThanOrEqual(DUR_PER_BAR_TOLERANCE);
      }
    });

    if (!MAIN_TIERS.has(tier)) continue; // Leiter-Anforderung gilt nur für die 12 Haupt-Tiers mit Dolch

    it(`${tier}: das niedrigste Forge-Level entspricht dem Barren-Level, und "dagger" liegt darauf`, () => {
      const smeltLevel = smeltLevelByBar.get(tier);
      expect(smeltLevel, `${tier}: kein smelt_-Rezept mit diesem Barren als Loot gefunden`).toBeDefined();

      const minLevel = Math.min(...items.map((r) => r.levelRequired));
      expect(
        minLevel,
        `${tier}: niedrigstes Forge-Level (${minLevel}) sollte dem Barren-Level (${smeltLevel}) entsprechen`,
      ).toBe(smeltLevel);

      const dagger = items.find((r) => r.suffix === "dagger");
      expect(dagger, `${tier}: kein "dagger"-Rezept gefunden`).toBeDefined();
      expect(
        dagger!.levelRequired,
        `${tier}: dagger liegt auf L${dagger!.levelRequired}, sollte auf dem Barren-Level L${smeltLevel} liegen`,
      ).toBe(smeltLevel);
    });
  }
});
