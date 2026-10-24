// claude:2026-10-24T15:40:00+02:00 — QA-Runde 2 (1.4.0 „Feder und Stahl“), Bereich Oberfläche/Sprachen.
// Statischer Abgleich der UI-Texte: Schlüsselparität und Platzhalter in allen 7 Sprachen (Guard) sowie
// Belege (`it.fails`) für gefundene Text-Auffälligkeiten. Bericht: design/qa/1.4.0-r2-ui.md.
import { describe, expect, it } from "vitest";
import { UI_TEXT } from "./i18n/translations";

const LOCALES = ["de", "es", "pt-BR", "fr", "ru", "zh"] as const;
const en = UI_TEXT.en;
const placeholders = (s: string): string =>
  [...s.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map((m) => m[0]).sort().join(" ");

describe("qa2 ui i18n: Parität der UI-Texte (1.4.0)", () => {
  it("jede Sprache trägt exakt die EN-Schlüssel (keine fehlenden, keine zusätzlichen)", () => {
    for (const loc of LOCALES) {
      const tbl = UI_TEXT[loc]!;
      const missing = Object.keys(en).filter((k) => !(k in tbl));
      const extra = Object.keys(tbl).filter((k) => !(k in en));
      expect({ loc, missing, extra }).toEqual({ loc, missing: [], extra: [] });
    }
  });

  it("Platzhalter ({n}, {gold}, …) sind in jeder Sprache wörtlich gleich (t() ersetzt nichts selbst)", () => {
    const bad: string[] = [];
    for (const loc of LOCALES) {
      const tbl = UI_TEXT[loc]!;
      for (const k of Object.keys(en)) {
        if (k in tbl && placeholders(en[k]!) !== placeholders(tbl[k]!)) bad.push(`${loc}:${k}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("keine leeren Texte, keine deutschen Reste (äöüß) in es/fr/pt-BR/ru/zh", () => {
    const bad: string[] = [];
    for (const loc of LOCALES) {
      const tbl = UI_TEXT[loc]!;
      for (const [k, v] of Object.entries(tbl)) {
        if (v.trim() === "") bad.push(`${loc}:${k} leer`);
        // „vergüenza“ (es) ist echtes Spanisch, deshalb nur ä/ö/ß als deutsche Marker.
        if (loc !== "de" && /[äößÄÖ]/.test(v)) bad.push(`${loc}:${k} deutsche Zeichen`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("1.4-Schlüsselfamilien (raid/storage/salvage/orders/events/estates) sind in allen 7 Sprachen übersetzt (nicht EN-gleich)", () => {
    // Einzelne Wörter dürfen gleich sein (Raid, Normal, Phase {n}); geprüft werden nur Sätze mit Leerzeichen
    // und mindestens zwei Wörtern.
    const families = /^(raid|storage|salvage|orders|events|estates)\./;
    const same: string[] = [];
    for (const loc of LOCALES) {
      const tbl = UI_TEXT[loc]!;
      for (const k of Object.keys(en).filter((x) => families.test(x))) {
        const v = en[k]!;
        if (/\s/.test(v.trim()) && /[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(v) && tbl[k] === v) same.push(`${loc}:${k}`);
      }
    }
    expect(same).toEqual([]);
  });
});

describe("qa2 ui i18n: Belege", () => {
  // Befund (Niedrig): Die neuen zh-Texte der Raid-/Warteschlangen-/Itemkarten-Familien verwenden ASCII-Satzzeichen
  // (, : ( ) ! ?) direkt an CJK-Zeichen, der Bestand nutzt Vollbreite-Zeichen (，：（）！？). 37 von 298 neuen
  // Schlüsseln gegenüber 9 von 2415 alten. Beispiel zh "raid.lockedHint": "击败一次{dungeon},即可开启大厅。"
  it("BUG-behoben: zh-Texte der 1.4-Familien mischen ASCII-Satzzeichen in CJK-Text (raid.*, queue.skip.*, itip.*)", () => {
    const zh = UI_TEXT.zh!;
    const ascii = /[一-鿿][,:;!?()]|[,:;!?()][一-鿿]/;
    const families = /^(raid|queue\.skip|itip\.setfx|itip\.primary|combat\.log\.(fireCollection|outbreak|bloodToll)|combat\.bleedStack|options\.(raid|quiver|storage)|toast\.rareFind)/;
    const hits = Object.keys(zh).filter((k) => families.test(k) && ascii.test(zh[k]!));
    expect(hits).toEqual([]);
  });

  // Befund (Niedrig): ru „estates.note.plot(s)“/„trap(s)“ lauten „грядок: {n}“ / „ловушек: {n}“ und werden in
  // „Параллельно: {list}“ eingesetzt → Kopfzeile „Параллельно: грядок: 6“ (doppelter Doppelpunkt); Einzahl und
  // Mehrzahl sind gleich („грядок: 1“ statt „1 грядка“). Alle anderen Sprachen: „{n} Felder“, „{n} parcelles“ …
  it("BUG-behoben: ru Ländereien-Kopfzeile „Параллельно: грядок: 6“ (Doppelpunkt im Listenteil, keine Einzahl)", () => {
    const ru = UI_TEXT.ru!;
    const parts = ["estates.note.plot", "estates.note.plots", "estates.note.trap", "estates.note.traps"];
    expect(parts.filter((k) => ru[k]!.includes(":"))).toEqual([]);
    expect(ru["estates.note.plot"]).not.toBe(ru["estates.note.plots"]);
  });
});
