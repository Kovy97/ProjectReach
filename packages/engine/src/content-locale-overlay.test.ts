import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { resolveText, type LocalizedString } from "@hearthforge/shared";

/**
 * Deckt die Content-Lokalisierungs-Overlay-Architektur ab (Task „5-Sprachen-Fundament", 2026-07):
 * `packages/content/src/locales/*.ts` sind schlanke Key→Text-Tabellen, die `applyContentLocales`
 * beim Content-Bootstrap in die `name`/`description`-Objekte einmischt (siehe
 * `packages/content/src/locales/apply.ts`). en+de bleiben Pflicht direkt im Katalog; die 5
 * Overlay-Sprachen (es/pt-BR/fr/ru/zh) füllen sich inkrementell — fehlende Einträge fallen über
 * `resolveText` sauber auf `en` zurück.
 *
 * Hinweis: Die Fallback-/Isolations-Fälle testen die `resolveText`-MECHANIK an synthetischen
 * LocalizedStrings statt an echten Items — sonst würde der Test brechen, sobald die Übersetzer
 * die Overlays füllen (dann ist jedes echte Item übersetzt und fällt eben NICHT mehr zurück).
 */
const OVERLAY_LOCALES = ["es", "pt-BR", "fr", "ru", "zh"] as const;

describe("Content-Lokalisierungs-Overlay", () => {
  it("übersetzter Eintrag: das es-Overlay wird ins echte Katalog-Item eingemischt (Referenz items:iron_sword:name)", () => {
    const item = content.items["iron_sword"];
    expect(item, "Referenz-Item iron_sword fehlt im Katalog").toBeDefined();
    // Der Referenz-Seed-Eintrag aus locales/es.ts wurde in item.name.es eingemischt …
    expect(resolveText(item!.name, "es")).toBe("Espada de hierro");
    // … OHNE en/de zu verändern (kein Datenverlust beim Einmischen).
    expect(resolveText(item!.name, "en")).toBe("Iron Sword");
    expect(resolveText(item!.name, "de")).toBe("Eisen-Schwert");
  });

  it("Fallback-Mechanik: ein Wert ohne Overlay-Sprache fällt auf en zurück (nicht undefined/leer)", () => {
    const onlyEn: LocalizedString = { en: "Only English" };
    for (const locale of OVERLAY_LOCALES) {
      expect(resolveText(onlyEn, locale), `${locale} muss auf en zurückfallen`).toBe("Only English");
    }
  });

  it("Isolations-Mechanik: ein es-only-Wert wirkt NUR auf es, die anderen 4 fallen auf en zurück", () => {
    const enPlusEs: LocalizedString = { en: "EN", es: "ES" };
    expect(resolveText(enPlusEs, "es")).toBe("ES");
    for (const locale of ["pt-BR", "fr", "ru", "zh"] as const) {
      expect(resolveText(enPlusEs, locale), `${locale} darf den es-Wert nicht sehen`).toBe("EN");
    }
  });
});

/**
 * DAUER-GUARD (Task #364 Fix 5b, Audit #363): Der Test oben prüft die MECHANIK an einem einzigen
 * Referenz-Item — er würde nicht bemerken, wenn eine ganze Content-Sammlung unübersetzt bliebe.
 * New Haven ist die erste Sammlung, für die die Vollständigkeit zugesichert ist (alle 15 Gebäude
 * sind in allen 5 Overlay-Sprachen benannt UND beschrieben, s. `packages/content/src/locales/*.ts`
 * Schlüssel `campBuildings:<id>:name|description`). Kommt ein Gebäude dazu, ohne dass die Overlays
 * mitwachsen, fällt genau dieser Test — statt dass der Spieler in fünf Sprachen englische
 * Gebäudenamen liest.
 *
 * Geprüft wird der EINGEMISCHTE Katalog (nicht die Overlay-Tabelle): `applyContentLocales` läuft
 * beim Content-Bootstrap, ein vorhandener Schlüssel landet also als eigene Locale-Eigenschaft im
 * `LocalizedString`. Bewusst KEIN Vergleich „übersetzt ≠ englisch": Eigennamen dürfen in einer
 * Sprache legitim gleich lauten, das wäre ein falsch-positiver Wächter.
 */
describe("Content-Overlay-Vollständigkeit — Lager-Gebäude (New Haven)", () => {
  it("jedes Lager-Gebäude trägt name UND description in allen 5 Overlay-Sprachen", () => {
    const buildings = content.campBuildings ?? [];
    expect(buildings.length, "Katalog kennt keine campBuildings").toBeGreaterThan(0);

    const missing: string[] = [];
    for (const b of buildings) {
      for (const field of ["name", "description"] as const) {
        const value = b[field];
        if (value === undefined) continue; // Feld gibt es an dieser Entity nicht
        for (const locale of OVERLAY_LOCALES) {
          const translated = typeof value === "string" ? undefined : value[locale];
          if (typeof translated !== "string" || translated.length === 0) {
            missing.push(`campBuildings:${b.id}:${field} → ${locale}`);
          }
        }
      }
    }
    expect(missing, `Fehlende Overlay-Einträge:\n${missing.join("\n")}`).toEqual([]);
  });

  it("und die Übersetzungen kommen auch wirklich bei resolveText an (Stichprobe je Sprache)", () => {
    const first = (content.campBuildings ?? [])[0];
    expect(first).toBeDefined();
    for (const locale of OVERLAY_LOCALES) {
      const text = resolveText(first!.name, locale);
      expect(typeof text, `${locale}`).toBe("string");
      expect(text.length, `${locale} liefert einen leeren Namen`).toBeGreaterThan(0);
    }
  });
});

/**
 * DAUER-GUARD (Task #368, „Die Bauteile erklären sich nicht"): die 3 New-Haven-Bauteile
 * (timber_beam/brace/anchor, Task #366) sind der billigste Hebel gegen den Blocker „ohne Balken
 * steht nicht mal das Zentralhaus" — ihre `description` erklärt Woher (Skill+Stufe) direkt im
 * ItemTooltip, an BEIDEN Stellen aus dem Bot-Befund (Lager-Kostenchip + Holzfällen-Seite). Eng
 * begrenzt auf diese 3 Items (nicht „alle Items"), weil der Katalog sonst noch viele unübersetzte
 * Beschreibungen hat — dieser Guard soll NUR verhindern, dass genau diese drei wieder verwaisen.
 */
describe("Content-Overlay-Vollständigkeit — Bauteile (timber_beam/brace/anchor)", () => {
  it("die 3 Bauteil-Items tragen description in allen 5 Overlay-Sprachen", () => {
    const ids = ["timber_beam", "timber_brace", "timber_anchor"] as const;
    const missing: string[] = [];
    for (const id of ids) {
      const item = content.items[id];
      expect(item, `Item ${id} fehlt im Katalog`).toBeDefined();
      expect(item!.description, `${id} hat keine description`).toBeDefined();
      const desc = item!.description!;
      for (const locale of OVERLAY_LOCALES) {
        const translated = typeof desc === "string" ? undefined : desc[locale];
        if (typeof translated !== "string" || translated.length === 0) {
          missing.push(`items:${id}:description → ${locale}`);
        }
      }
    }
    expect(missing, `Fehlende Overlay-Einträge:\n${missing.join("\n")}`).toEqual([]);
  });
});
