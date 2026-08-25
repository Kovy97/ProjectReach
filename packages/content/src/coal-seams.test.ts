import { describe, expect, it } from "vitest";
import { content } from "./index";
import { es } from "./locales/es";
import { fr } from "./locales/fr";
import { ptBR } from "./locales/ptBR";
import { ru } from "./locales/ru";
import { zh } from "./locales/zh";

/**
 * Wächter-Test für die drei neuen Kohleflöze (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p15).
 *
 * Ausgangslage: das einzige Kohleflöz (mine_coal, Bergbau 15) brachte 11 143 XP/h, während die
 * Bergbau-Zielkurve bei Level 75 bereits 212 968 XP/h verlangt (Kohle war dort eine 5-%-Beschäftigung),
 * UND die Kohle-Abbauzeit je Barren lag ab Adamant über der Erz-Abbauzeit — der Spieler verbrachte im
 * Lategame mehr Zeit auf dem Level-15-Flöz als auf seinem eigentlichen Erz.
 *
 * Chef-Korrektur zum Design: Kohle bleibt "Bei-Komponente zum echten Erz" — KEINE eigene, längere
 * Abbauzeit (das Design schlug eine Adern-Leiter mit 5,5/7,5/8,5 s vor). Stattdessen bekommen alle drei
 * neuen Flöze exakt dieselbe Dauer wie das bestehende mine_coal, nur der Ertrag steigt (2/3/4 Kohle).
 * Das hält "Kohle fühlt sich wie Kohle an", während die XP über den höheren Ertrag automatisch auf die
 * Zielkurve rutschen.
 *
 * Die Formel-Konstante (600) wird hier NICHT hartkodiert übernommen, sondern aus mehreren bestehenden
 * Bergbau-Aktionen (Erz- und Edelstein-Adern über die ganze Levelspanne) zurückgerechnet und auf
 * gegenseitige Konsistenz geprüft — erst danach fließt sie in die Ziel-XP/h-Berechnung für die drei
 * neuen Flöze ein. So bleibt der Test ein echter Beleg dafür, dass die neuen Flöze auf DERSELBEN Kurve
 * liegen wie der Rest von Bergbau, statt gegen eine im Test frei erfundene Zahl zu prüfen.
 */

// xpForLevel-Tabelle 1:1 aus packages/engine/src/leveling.ts nachgebaut (das Content-Paket hängt
// bewusst nicht von @hearthforge/engine ab, siehe smithing-xp-per-bar.test.ts für dieselbe Konvention).
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
function xpForLevel(level: number): number {
  return XP_TABLE[level]!;
}

function xphOf(xp: number, durationMs: number): number {
  return (xp * 3_600_000) / durationMs;
}

// Konstante C aus der Formel target_xph(L) = C·sqrt(xpForLevel(L+1)−xpForLevel(L)) zurückrechnen.
function deriveC(xp: number, durationMs: number, levelRequired: number): number {
  const step = Math.sqrt(xpForLevel(levelRequired + 1) - xpForLevel(levelRequired));
  return xphOf(xp, durationMs) / step;
}

function targetXph(levelRequired: number, c: number): number {
  return c * Math.sqrt(xpForLevel(levelRequired + 1) - xpForLevel(levelRequired));
}

const actions = content.actions;

describe("Kohleflöze L50/75/90 (#p15, Chef-Korrektur gleiche Dauer wie mine_coal)", () => {
  it("mine_coal (Referenz) existiert und trägt die erwartete Dauer", () => {
    expect(actions.mine_coal).toBeDefined();
    expect(actions.mine_coal!.durationMs).toBe(4200);
  });

  // Die Formel-Konstante wird aus mehreren bestehenden Bergbau-Aktionen quer über die Levelspanne
  // hergeleitet (nicht hartkodiert) und auf gegenseitige Konsistenz geprüft. mine_iron und mine_coal
  // bleiben bewusst außen vor: beide tragen laut Design einen dokumentierten Frühspiel-Boden-Aufschlag
  // (Eisen auf 9 XP angehoben) und würden die Konstante leicht nach oben verzerren; die verbleibenden
  // acht Mid-/Endgame-Adern (Level 35–95) liegen alle innerhalb von 0,5 % voneinander.
  const REFERENCE_ORE_ACTIONS = [
    "mine_mithril", "mine_adamantite", "mine_runite", "mine_murkvein",
    "mine_bloodiron", "mine_titanium", "mine_aetherite", "mine_godiron",
  ];

  it("die Formel-Konstante ist über die Referenz-Aktionen konsistent (±2%)", () => {
    const derived = REFERENCE_ORE_ACTIONS.map((id) => {
      const a = actions[id];
      expect(a, `Referenz-Aktion ${id} fehlt im Content`).toBeDefined();
      return deriveC(a!.xp, a!.durationMs, a!.levelRequired!);
    });
    const sorted = [...derived].sort((x, y) => x - y);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
    for (const c of derived) {
      expect(Math.abs(c - median) / median).toBeLessThan(0.02);
    }
  });

  const C = (() => {
    const derived = REFERENCE_ORE_ACTIONS.map((id) => {
      const a = actions[id]!;
      return deriveC(a.xp, a.durationMs, a.levelRequired!);
    });
    const sorted = [...derived].sort((x, y) => x - y);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  })();

  const CASES: Array<{ id: string; level: number; coalQty: number; sideItemId: string }> = [
    { id: "mine_coal_deep", level: 50, coalQty: 2, sideItemId: "rough_ruby" },
    { id: "mine_coal_rich", level: 75, coalQty: 3, sideItemId: "rough_diamond" },
    { id: "mine_coal_ancient", level: 90, coalQty: 4, sideItemId: "rough_diamond" },
  ];

  for (const { id, level, coalQty, sideItemId } of CASES) {
    describe(id, () => {
      it("existiert, ist bei der richtigen Stufe freigeschaltet und teilt mine_coals Dauer", () => {
        const a = actions[id];
        expect(a).toBeDefined();
        expect(a!.levelRequired).toBe(level);
        expect(a!.durationMs).toBe(actions.mine_coal!.durationMs);
        expect(a!.skill).toBe("mining");
      });

      it("liefert garantiert Kohle als erste Loot-Zeile (mining.test.ts-Guard: loot[0].chance===1)", () => {
        const a = actions[id]!;
        expect(a.loot[0]!.itemId).toBe("coal");
        expect(a.loot[0]!.chance).toBe(1);
        expect(a.loot[0]!.min).toBe(coalQty);
        expect(a.loot[0]!.max).toBe(coalQty);
      });

      it("hat die Nebenfund-Chance aus dem Design (Rohrubin/Rohdiamant)", () => {
        const a = actions[id]!;
        const side = a.loot.find((l) => l.itemId === sideItemId);
        expect(side, `Nebenfund ${sideItemId} fehlt`).toBeDefined();
        expect(side!.chance).toBeGreaterThan(0);
      });

      it("liegt im ±2%-Band der Mining-Zielkurve für dieses Level", () => {
        const a = actions[id]!;
        const actual = xphOf(a.xp, a.durationMs);
        const target = targetXph(level, C);
        expect(Math.abs(actual - target) / target).toBeLessThan(0.02);
      });

      it("ist bilingual benannt (en/de)", () => {
        const a = actions[id]!;
        expect(typeof a.name).toBe("object");
        const name = a.name as { en: string; de?: string };
        expect(name.en.length).toBeGreaterThan(0);
        expect((name.de ?? "").length).toBeGreaterThan(0);
      });

      it("hat Overlay-Namen in allen 5 weiteren Sprachen", () => {
        const key = `actions:${id}:name`;
        for (const [locale, dict] of [
          ["es", es], ["fr", fr], ["pt-BR", ptBR], ["ru", ru], ["zh", zh],
        ] as const) {
          const value = dict[key];
          expect(value, `${locale} fehlt Key ${key}`).toBeDefined();
          expect(value!.length).toBeGreaterThan(0);
        }
      });
    });
  }

  it("das alte Flöz (mine_coal, L15) bleibt unverändert bestehen", () => {
    const a = actions.mine_coal!;
    expect(a.levelRequired).toBe(15);
    expect(a.xp).toBe(13);
    expect(a.loot[0]!.itemId).toBe("coal");
  });
});
