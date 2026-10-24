// Textpass 1.4 · P4b Teil A (Ausrüstung) · Zusammenführen + Prüfen
// lore-dev, 2026-10-24. Liest die Teildateien ausruestung-*.json, prüft jeden Text gegen den Katalog
// und die Stilregeln und schreibt ausruestung.json mit automatisch aus den Daten erzeugter `fakten`-Spalte.
// Aufruf:  cd G:/GameDev/apps/client && npx tsx G:/GameDev/design/lore/textpass-1.4/p4b/zusammenfuehren-ausruestung.ts

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "../../../../packages/content/src/index";

const here = dirname(fileURLToPath(import.meta.url));
type Part = { id: string; en: string; de: string };
type Fact = { id: string; sources: string[]; slot?: string; weapon?: string };

const facts: Fact[] = JSON.parse(readFileSync(join(here, "fakten-ausruestung.json"), "utf8"));
const factById = new Map(facts.map((f) => [f.id, f]));
const order = new Map(facts.map((f, i) => [f.id, i]));

const parts: Part[] = [];
for (const f of readdirSync(here).filter((n) => /^ausruestung-\d+-.*\.json$/.test(n)).sort()) {
  const arr: Part[] = JSON.parse(readFileSync(join(here, f), "utf8"));
  for (const p of arr) parts.push(p);
}

const errors: string[] = [];
const warnings: string[] = [];
const seen = new Set<string>();
const dashes = (s: string): number => (s.match(/—|–| - /g) ?? []).length;
const badWordsDe = [/\bStufe\b/, /\bGruft\b/, /\bSchutzschild/, /\bMonsterjäger/, /\bdas Reich\b/, /\bdes Reiches\b/, /\bLevel\b/];

for (const p of parts) {
  const it = content.items[p.id];
  if (!it) { errors.push(`${p.id}: ID existiert nicht im Katalog`); continue; }
  if (it.type !== "equipment") errors.push(`${p.id}: kein Ausrüstungsteil (${it.type})`);
  if (it.description && ((it.description as { en?: string }).en ?? "").trim()) errors.push(`${p.id}: hat bereits eine Beschreibung`);
  if (seen.has(p.id)) errors.push(`${p.id}: doppelt`);
  seen.add(p.id);
  if (!factById.has(p.id)) errors.push(`${p.id}: nicht in der Faktenliste`);
  if (p.de.length > 180) errors.push(`${p.id}: DE ${p.de.length} Zeichen (>180)`);
  else if (p.de.length > 145 && !["legendary", "godly"].includes(it?.rarity ?? "")) warnings.push(`${p.id}: DE ${p.de.length} Zeichen`);
  if (p.en.length > 180) errors.push(`${p.id}: EN ${p.en.length} Zeichen (>180)`);
  if (p.de.length < 50) warnings.push(`${p.id}: DE sehr kurz (${p.de.length})`);
  if (dashes(p.de) > 1 || dashes(p.en) > 1) errors.push(`${p.id}: mehr als ein Gedankenstrich`);
  if (p.de.includes(";") || p.en.includes(";")) errors.push(`${p.id}: Semikolon`);
  if (/!/.test(p.de + p.en)) warnings.push(`${p.id}: Ausrufezeichen`);
  for (const rx of badWordsDe) if (rx.test(p.de)) warnings.push(`${p.id}: Glossar-Wort ${rx} in DE`);
}
const missing = facts.filter((f) => !seen.has(f.id)).map((f) => f.id);

// fakten-Spalte: erste zwei Quellen, gekürzt
const shorten = (s: string): string =>
  s
    .replace(/\[[^\]]*\]/g, "") // Aktionsname raus
    .replace(/\s{2,}/g, " ")
    .replace(/ :/g, ":")
    .replace(/\/[^,:;)|]+?(?=( x\d| \(|,|$|\)))/g, "") // EN/DE-Namen → nur EN behalten? nein: nur DE behalten (zweiter Teil); hier wird der DE-Teil entfernt, daher unten umgedreht
    .trim();
const dePart = (s: string): string =>
  s
    .replace(/\[[^\]]*\]/g, "")
    .replace(/Basis [^/]+\/([^)]+)\)/, "Basis $1)")
    .replace(/[A-Za-z'.-]+(?: [A-Za-z'.-]+)*\/([^,:;)|(]+)/g, "$1") // "Copper Bar/Kupferbarren" → "Kupferbarren"
    .replace(/\s*:\s*/g, ": ")
    .replace(/,(\S)/g, ", $1")
    .replace(/\s{2,}/g, " ")
    .trim();
void shorten;

const out = parts
  .filter((p) => factById.has(p.id))
  .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  .map((p) => {
    const f = factById.get(p.id)!;
    const src = f.sources.slice(0, 2).map(dePart);
    const kind = /^(Elite|Schmieden|Handwerk|Schneidern|Bognerei|Runenkunst|Juwelierskunst|Laden|Slayer-Laden|Belohnungsladen|Aufgabe|Paragon)/.test(f.sources[0] ?? "") ? "" : "Drop: ";
    return { id: p.id, en: p.en, de: p.de, fakten: (kind + src.join(" | ")).slice(0, 220) };
  });

writeFileSync(join(here, "ausruestung.json"), JSON.stringify(out, null, 1), "utf8");

console.log(`Teile gelesen: ${parts.length}, geschrieben: ${out.length}, erwartet: ${facts.length}`);
console.log(`Fehlend (${missing.length}): ${missing.join(", ") || "keine"}`);
console.log(`Fehler (${errors.length}):`); for (const e of errors) console.log("  " + e);
console.log(`Warnungen (${warnings.length}):`); for (const w of warnings) console.log("  " + w);
const lens = parts.map((p) => p.de.length);
console.log(`DE-Länge: min ${Math.min(...lens)}, max ${Math.max(...lens)}, Ø ${Math.round(lens.reduce((a, b) => a + b, 0) / lens.length)}`);
