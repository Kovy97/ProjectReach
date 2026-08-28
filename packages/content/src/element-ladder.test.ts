import { describe, expect, it } from "vitest";
import { content } from "./index";
import { effectiveWeaponEffects } from "@hearthforge/shared";
import type { ItemDef } from "@hearthforge/shared";

/**
 * WÄCHTER Elementleiter der Magiewaffen (Chef-GO 28.08.2026, design/elementleiter-magiewaffen.md):
 * vor der Umsetzung waren 24 von 57 Magie-Haupthänden Feuer (jeder gefertigte Stab trug Brand).
 * Diese Suite hält fest, dass die gefertigte Leiter (Stab 2H + Zauberstab 1H je Handwerks-Stufe)
 * jetzt alle sechs Basis-Elemente in jeder Phase zeigt (Aether als bewusste Endgame-Ausnahme), und
 * dass JEDE Magie-Haupthand im Content (Craft + Drops + Champions) zu genau einem Renderer-Thema
 * auflöst — kein „läuft ins Nichts"/undefiniertes Thema.
 *
 * `WEAPON_EFFECT_THEME`/`magicThemeFor` bilden `apps/client/src/renderer/combatFx.ts` NACH (apps/**
 * ist content-dev-TABU — kein Import). Bei einer Renderer-Änderung dort beide Stellen synchron
 * halten; ändert sich die echte Tabelle, ohne dass hier nachgezogen wird, drohen beide Seiten
 * auseinanderzulaufen (Guard hier prüft nur die Content-Seite der Abmachung).
 */

type MagicTheme = "arcane" | "fire" | "frost" | "shock" | "poison" | "void" | "aether";
const THEMES: MagicTheme[] = ["arcane", "fire", "frost", "shock", "poison", "void", "aether"];

// Nachbildung von combatFx.ts `WEAPON_EFFECT_THEME` (Reihenfolge = Priorität wie dort).
const WEAPON_EFFECT_THEME: Partial<Record<string, MagicTheme>> = {
  burn: "fire",
  frost: "frost",
  frostbite: "frost",
  shock: "shock",
  poison: "poison",
  plaguebearer: "poison",
  bane: "void",
  execute: "void",
};

// Nachbildung von combatFx.ts `magicThemeFor` — PLUS den `magicTheme`-Override (shared, Chef-GO
// 28.08.2026), den der Renderer noch nicht verdrahtet hat (offener Punkt, s. Content-Bericht),
// dessen Content-Seite aber schon vollständig steht und hier geprüft wird.
function magicThemeFor(item: ItemDef): MagicTheme {
  if (item.magicTheme) return item.magicTheme;
  for (const fx of effectiveWeaponEffects(item)) {
    const theme = WEAPON_EFFECT_THEME[fx.type];
    if (theme) return theme;
  }
  if (item.id.startsWith("aether") || item.id.startsWith("godspark")) return "aether";
  return "arcane";
}

const items = Object.values(content.items);
const magicMainhand = items.filter((i) => i.weaponStyle === "magic" && i.slot === "mainhand");
const req = (i: ItemDef): number => Math.max(0, ...Object.values(i.requirements ?? {}).map((v) => v ?? 0));

// Die gefertigte Leiter: Stab (2H) + Zauberstab (1H) je Handwerks-Stufe (Runecrafting, 12 Tiers je
// Typ) — dieselbe Abgrenzung wie `LADDER_PREFIX` in spell-focus-content.test.ts.
const LADDER_PREFIX =
  /^(copper|bronze|iron|steel|blacksteel|mithril|adamantium|runite|bloodiron|titanium|aetherium|godiron)_(staff|wand)$/;
const craftedLadder = magicMainhand.filter((i) => LADDER_PREFIX.test(i.id));

function themesInPhase(lo: number, hi: number): Set<MagicTheme> {
  const set = new Set<MagicTheme>();
  for (const w of craftedLadder) {
    const r = req(w);
    if (r >= lo && r <= hi) set.add(magicThemeFor(w));
  }
  return set;
}

describe("Elementleiter der Magiewaffen", () => {
  it("Verteilungstabelle über alle Magie-Haupthände (Bericht)", () => {
    const byTheme = new Map<MagicTheme, string[]>();
    for (const w of magicMainhand) {
      const theme = magicThemeFor(w);
      (byTheme.get(theme) ?? byTheme.set(theme, []).get(theme)!).push(w.id);
    }
    const lines = THEMES.filter((t) => byTheme.has(t)).map((t) => {
      const ids = byTheme.get(t)!.sort();
      return `  ${t.padEnd(6)} (${ids.length}): ${ids.join(", ")}`;
    });
    console.log(
      `\n=== MAGIE-THEMEN-VERTEILUNG (${magicMainhand.length} Magie-Haupthände, ${craftedLadder.length} davon gefertigte Leiter) ===\n${lines.join("\n")}\n`,
    );
    expect(byTheme.size).toBeGreaterThan(0);
  });

  it("jede Magie-Haupthand löst zu genau einem bekannten Thema auf", () => {
    const offenders = magicMainhand.filter((w) => !THEMES.includes(magicThemeFor(w)));
    expect(offenders.map((w) => w.id)).toEqual([]);
  });

  it("Aether ist auf der gefertigten Leiter erst ab Requirement 80 (Chef-Ausnahme: Endgame)", () => {
    const offenders = craftedLadder.filter((w) => magicThemeFor(w) === "aether" && req(w) < 80);
    expect(offenders.map((w) => `${w.id} (req ${req(w)})`)).toEqual([]);
  });

  it("Early (≤30): alle sechs Elemente auf mind. einer gefertigten Magiewaffe vertreten", () => {
    const present = themesInPhase(0, 30);
    for (const t of ["arcane", "fire", "frost", "shock", "poison", "void"] as MagicTheme[]) {
      expect([...present], `Early-Phase (≤30) fehlt Thema "${t}"`).toContain(t);
    }
  });

  it("Mid (40-60): alle sechs Elemente auf mind. einer gefertigten Magiewaffe vertreten", () => {
    const present = themesInPhase(40, 60);
    for (const t of ["arcane", "fire", "frost", "shock", "poison", "void"] as MagicTheme[]) {
      expect([...present], `Mid-Phase (40-60) fehlt Thema "${t}"`).toContain(t);
    }
  });

  it("End (70-99): Feuer/Frost/Aether/Blitz/Arkan/Leere auf mind. einer gefertigten Magiewaffe vertreten", () => {
    // Phasenprobe der Spec (design/elementleiter-magiewaffen.md): das End-Sextett ersetzt Gift durch
    // Aether (die Aether-Ausnahme gilt NUR im Endgame) — Gift bleibt bewusst auf Early/Mid begrenzt.
    const present = themesInPhase(70, 99);
    for (const t of ["fire", "frost", "aether", "shock", "arcane", "void"] as MagicTheme[]) {
      expect([...present], `End-Phase (70-99) fehlt Thema "${t}"`).toContain(t);
    }
  });

  it("jede Handwerks-Stufe trägt einen Stab und einen Zauberstab mit VERSCHIEDENEN Themen", () => {
    const mismatches: string[] = [];
    for (const w of craftedLadder) {
      if (!w.id.endsWith("_staff")) continue;
      const wand = content.items[w.id.replace(/_staff$/, "_wand")];
      if (!wand) continue;
      if (magicThemeFor(w) === magicThemeFor(wand)) {
        mismatches.push(`${w.id} (${magicThemeFor(w)}) == ${wand.id} (${magicThemeFor(wand)})`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});
