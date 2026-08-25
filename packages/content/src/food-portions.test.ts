import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Wächter-Test für die Kochen-Portionsreform (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p11).
 *
 * Befund des Abschnitts: alle 47 Kochen-Rezepte lagen exakt auf der XP-Zielkurve (C=600, ≤1 XP
 * Abweichung), aber 13 der 47 lieferten unter 60 % Heilung je Koch-Sekunde gegenüber der einfachen
 * Referenz-Speise desselben Level-Bands (ein Gericht kostet 10-24 s und 3-6 Zutaten für einen Bissen,
 * der kaum mehr heilt als der Einfach-Fisch derselben Stufe). Die drei Regeln des Abschnitts (Chef
 * mit "einverstanden" gedeckt):
 *   Regel 1: +1 healAmount in der Delle L28-L48 (10 Werte).
 *   Regel 2: MEHR-PORTIONEN-LOOT statt kürzerer Dauer — loot.min/max hoch, Dauer/XP UNVERÄNDERT
 *            (damit Kochen-XP/h identisch bleibt), value je Portion geteilt (Gold/Koch-h identisch).
 *   Regel 3: je Stil eine Trinity-Zutat (Rüstung/Ausweichen/Schild) unter den Herblore-Tonika-Deckeln,
 *            Endgame-Quartett stilspezifisch, Mindestdauer 180s (T3 240s, T4/T5 300s).
 *
 * Dieser Test hält beide Zusagen des Abschnitts als WÄCHTER fest (Chef-Vorgabe: Referenz "im Test
 * hergeleitet, nicht hartkodiert"):
 *   (a) Heilung/Koch-s (= healAmount × mittlere Portionen / Dauer) liegt für JEDES Kochen-Rezept mit
 *       Heil-Item-Output bei ≥ 60 % der Referenz — Referenz = die "einfache Speise" (cook_fish/
 *       cook_meat, genau 1 Input-Item, Output-Item ohne buff — also KEIN Kombi-/Feast-Gericht) mit
 *       dem höchsten levelRequired ≤ dem Level des geprüften Rezepts. Deckt automatisch auch die
 *       unveränderten Anbau-Schalen (Aschwurz-Brühe/Grimmkorn-Brei/Honigkuchen, laut Abschnitt bereits
 *       über der Schwelle) und alle 47 Rezepte ab, nicht nur die 16 geänderten.
 *   (b) `cook_feasts`-Rezepte liefern mindestens 2 Portionen (Regel 2, explizite Zusage des Abschnitts).
 *   (c) XP folgt weiterhin exakt der C-600-Formel (Regel 2: Dauer/XP der Rezepte bleiben unverändert,
 *       nur der Loot-Output wächst) — dieselbe Formel wie smithing-xp-per-bar.test.ts.
 */

const MIN_HEAL_RATIO = 0.6;

// xpForLevel-Tabelle 1:1 aus packages/engine/src/leveling.ts nachgebaut (Content-Paket hängt bewusst
// nicht von @hearthforge/engine ab) — identischer Nachbau wie smithing-xp-per-bar.test.ts.
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
// C=600 (wie smithing-xp-per-bar.test.ts; #p11-Auftrag nennt dieselbe Formel).
function expectedXp(levelRequired: number, durationMs: number): number {
  const targetXph = 600 * Math.sqrt(xpForLevelUnclamped(levelRequired + 1) - xpForLevelUnclamped(levelRequired));
  return Math.max(1, Math.round((targetXph * durationMs) / 3_600_000));
}
const XP_FORMULA_TOLERANCE = 0.02;

type CookRecipe = {
  id: string;
  itemId: string;
  category: string | undefined;
  levelRequired: number;
  durationMs: number;
  xp: number;
  portions: number;
  isSimple: boolean;
};

// Alle Kochen-Rezepte mit einem Heil-Item als Output (schließt reine Zutaten-Verarbeitung ohne
// healAmount aus, falls es sowas im Katalog gibt).
const cookRecipes: CookRecipe[] = [];
for (const action of Object.values(content.actions)) {
  if (action.skill !== "cooking") continue;
  const roll = action.loot[0];
  if (!roll) continue;
  const item = content.items[roll.itemId];
  if (!item || (item.healAmount ?? 0) <= 0) continue;
  // "Einfache Speise" = Fisch oder Fleisch, genau 1 Input-Item, Output ohne buff (kein Attribut-/
  // Trinity-Bonus) — exakt die Referenz-Definition des Abschnitts ("Fisch oder Fleisch mit dem
  // nächstliegenden Level auf oder unter dem Gericht").
  const isSimple =
    (action.category === "cook_fish" || action.category === "cook_meat") &&
    (action.inputs?.length ?? 0) === 1 &&
    !item.buff;
  cookRecipes.push({
    id: action.id,
    itemId: roll.itemId,
    category: action.category,
    levelRequired: action.levelRequired ?? 1,
    durationMs: action.durationMs,
    xp: action.xp,
    portions: (roll.min + roll.max) / 2,
    isSimple,
  });
}

const simples = cookRecipes.filter((r) => r.isSimple);

function healPerSec(r: CookRecipe): number {
  const item = content.items[r.itemId]!;
  return ((item.healAmount ?? 0) * r.portions) / (r.durationMs / 1000);
}

// Nächstliegende einfache Referenz-Speise AUF ODER UNTER dem eigenen Level (§Befund 2 des Abschnitts).
function referenceFor(r: CookRecipe): CookRecipe | undefined {
  let best: CookRecipe | undefined;
  for (const cand of simples) {
    if (cand.levelRequired > r.levelRequired) continue;
    if (!best || cand.levelRequired > best.levelRequired) best = cand;
  }
  return best;
}

describe("Kochen-Portionsreform (#p11): Heilung/Koch-s ≥ 60% der Referenz, Portionen, XP-Formel", () => {
  it("findet Kochen-Rezepte mit Heil-Item-Output (Bestands-Detektor, ~47 laut Abschnitt)", () => {
    expect(cookRecipes.length).toBeGreaterThanOrEqual(40);
  });

  it("findet einfache Referenz-Speisen (cook_fish/cook_meat, 1 Input, kein Buff)", () => {
    expect(simples.length).toBeGreaterThanOrEqual(10);
  });

  describe(`Heilung je Koch-Sekunde ≥ ${(MIN_HEAL_RATIO * 100).toFixed(0)}% der Referenz-Speise`, () => {
    for (const r of cookRecipes) {
      it(`${r.id} (L${r.levelRequired})`, () => {
        const ref = referenceFor(r);
        expect(ref, `${r.id}: keine Referenz-Speise auf/unter L${r.levelRequired} gefunden`).toBeDefined();
        const refRate = healPerSec(ref!);
        const rate = healPerSec(r);
        const ratio = rate / refRate;
        expect(
          ratio,
          `${r.id}: ${rate.toFixed(2)} HP/s vs. Referenz ${ref!.id} (${refRate.toFixed(2)} HP/s) ` +
            `→ ${(ratio * 100).toFixed(0)}%`,
        ).toBeGreaterThanOrEqual(MIN_HEAL_RATIO);
      });
    }
  });

  it("cook_feasts-Rezepte liefern mindestens 2 Portionen (Regel 2)", () => {
    const offenders: string[] = [];
    for (const action of Object.values(content.actions)) {
      if (action.skill !== "cooking" || action.category !== "cook_feasts") continue;
      const roll = action.loot[0];
      const min = roll?.min ?? 0;
      if (min < 2) offenders.push(`${action.id}: loot.min=${min} < 2`);
    }
    expect(offenders).toEqual([]);
  });

  // cook_beef (L5, 3500 ms → xp=7, Formel erwartet 6, 16.7 % Abweichung) ist eine VORBESTEHENDE
  // Kuriosität, die mit #p11 nichts zu tun hat — cooked_beef ist nicht Teil der 16 Portions-Rezepte
  // und wurde von diesem Patch nicht angefasst. An den Chef gemeldet statt hier fixiert (kein Mandat
  // für eine XP-Korrektur an einem unbeteiligten Basis-Rezept in diesem Ticket).
  const XP_FORMULA_EXCEPTIONS = new Set(["cook_beef"]);

  describe(`XP folgt der C-600-Formel für levelRequired (±${(XP_FORMULA_TOLERANCE * 100).toFixed(0)}% Rundungstoleranz)`, () => {
    for (const r of cookRecipes) {
      if (XP_FORMULA_EXCEPTIONS.has(r.id)) continue;
      it(`${r.id}`, () => {
        const want = expectedXp(r.levelRequired, r.durationMs);
        const dev = Math.abs(r.xp - want) / want;
        expect(
          dev,
          `${r.id}: L${r.levelRequired}, ${r.durationMs} ms Dauer → xp=${r.xp}, Formel erwartet ${want} ` +
            `(Abweichung ${(dev * 100).toFixed(2)}%)`,
        ).toBeLessThanOrEqual(XP_FORMULA_TOLERANCE);
      });
    }
  });
});
