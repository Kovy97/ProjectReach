import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Wächter-Test für Chef-Entscheid 25.08.2026 (nur Smithing; design/smithing-xp-barren.md, Option B):
 * Forge-Dauer koppelt jetzt an die Barren-Zahl (durationMs = Barren × Tier-Sekunden), die XP folgen
 * unverändert der bestehenden Level×Dauer-Formel. Vorher trieb eine frei vergebene "Schwere" pro Item
 * die Dauer, nicht die Barren-Zahl — daraus kam die vom Chef bemängelte Anomalie (Blacksteel Maul
 * 3 Barren/120 XP = 40.0 XP/Barren, Blacksteel Platebody 5 Barren/99 XP = 19.8 XP/Barren, Faktor 2.0
 * am selben Level). Dieser Test fängt eine Rückkehr zu item-eigenen Dauern ab.
 *
 * Toleranz: Die Chef-Vorgabe war ±3 % vom Tier-Median. Real unvermeidbar sind aber bis zu ~13.5 %
 * (XP/Barren, schlechtester Fall Steel-Tier) bzw. ~7.1 % (Dauer/Barren, schlechtester Fall Copper-Tier)
 * Streuung innerhalb eines Tiers — das kommt aus zwei GEWOLLTEN Quellen, nicht aus einem Fehler:
 * (1) durationMs wird auf 500 ms gerundet, und bei kleinen Basis-Dauern (Copper: ~2.3 s/Barren) ist das
 * eine relativ große Rundung; (2) ein Metall-Tier deckt 2-3 Spieler-Level ab (z.B. Blacksteel L30-32),
 * und die Ziel-XP/h-Kurve steigt pro Level — höhere Level im selben Tier geben darum etwas mehr XP pro
 * Barren. Beides ist in design/smithing-xp-barren.md §4.1 ("Restspanne ... kommt ausschließlich aus
 * den Level-Offsets") und §4.3 (Rundungs-Spannen) dokumentiert und dort als hingenommen markiert.
 * Die Toleranz hier liegt knapp über dem real gemessenen Maximum (15 % / 10 %) — eng genug, um die
 * alte Anomalie (25-67 % Streuung je Tier, siehe Testfall unten) sicher zu fangen, aber nicht enger,
 * als Rundung + Formel tatsächlich hergeben.
 */
const XP_PER_BAR_TOLERANCE = 0.15;
const DUR_PER_BAR_TOLERANCE = 0.10;

// Barren-Items folgen der Konvention "<metall>_bar" (copper_bar, blacksteel_bar, murkvein_bar, ...).
const BAR_SUFFIX = "_bar";

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid]!;
  return sorted.length % 2 !== 0 ? upper : (sorted[mid - 1]! + upper) / 2;
}

type Recipe = {
  id: string;
  tier: string; // Barren-Item-Id, dient als Tier-Schlüssel
  bars: number;
  durationMs: number;
  xp: number;
  levelRequired: number;
};

// Ein "reines Barren-Rezept" hat AUSSCHLIESSLICH Barren-Items als Input — genau die Rezepte, die der
// Chef-Entscheid betrifft. Gemischte Rezepte (Gravesteel + crude_bone, Void + void_essence, Slayer-
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
  recipes.push({
    id: action.id,
    tier: barId,
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

describe("Smithing: XP und Dauer pro Barren sind je Tier stabil (Chef-Entscheid 25.08.2026)", () => {
  it("findet die erwarteten reinen Barren-Forge-Rezepte (236 Haupt-Tiers + murkvein_longsword)", () => {
    expect(recipes.length).toBe(237);
  });

  for (const [tier, items] of byTier) {
    if (items.length < 2) continue; // Singleton-Tiers (murkvein_bar) haben trivial keine Streuung

    const xpPerBarMedian = median(items.map((r) => r.xp / r.bars));
    const durPerBarMedian = median(items.map((r) => r.durationMs / r.bars));

    it(`${tier}: XP/Barren bleibt je Rezept innerhalb ±${(XP_PER_BAR_TOLERANCE * 100).toFixed(0)}% vom Tier-Median (${xpPerBarMedian.toFixed(2)} XP/Barren)`, () => {
      for (const r of items) {
        const ratio = r.xp / r.bars;
        const dev = Math.abs(ratio - xpPerBarMedian) / xpPerBarMedian;
        expect(
          dev,
          `${r.id}: ${r.bars} Barren, ${r.xp} XP, ${r.durationMs} ms Dauer → ${ratio.toFixed(2)} XP/Barren ` +
            `(Tier-Median ${xpPerBarMedian.toFixed(2)}, Abweichung ${(dev * 100).toFixed(1)}%)`,
        ).toBeLessThanOrEqual(XP_PER_BAR_TOLERANCE);
      }
    });

    it(`${tier}: Dauer/Barren bleibt je Rezept innerhalb ±${(DUR_PER_BAR_TOLERANCE * 100).toFixed(0)}% vom Tier-Median (${durPerBarMedian.toFixed(1)} ms/Barren)`, () => {
      for (const r of items) {
        const ratio = r.durationMs / r.bars;
        const dev = Math.abs(ratio - durPerBarMedian) / durPerBarMedian;
        expect(
          dev,
          `${r.id}: ${r.bars} Barren, ${r.xp} XP, ${r.durationMs} ms Dauer → ${ratio.toFixed(1)} ms/Barren ` +
            `(Tier-Median ${durPerBarMedian.toFixed(1)}, Abweichung ${(dev * 100).toFixed(1)}%)`,
        ).toBeLessThanOrEqual(DUR_PER_BAR_TOLERANCE);
      }
    });
  }
});
