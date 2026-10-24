// claude:2026-10-25T00:30:00+02:00 — Textpass 1.4 P4b (Lore-Dev): Prüfskript für die neuen Beschreibungen.
// Aufruf aus dem Repo-Root: apps/client/node_modules/.bin/tsx design/lore/textpass-1.4/p4b/pruefung.ts
// Prüft: JSON gültig, jede ID aus fakten.json genau einmal, keine fremden IDs, Längen (DE ≤ 140 Soll, EN),
// Semikolons, Gedankenstriche (max. 1), leere Texte, Reizwörter aus dem Glossar.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fakten = JSON.parse(readFileSync(join(here, "fakten.json"), "utf8")) as Array<{ id: string; type: string; name_de: string }>;
const expected = new Map(fakten.map((f) => [f.id, f]));

interface Row { id: string; en: string; de: string; fakten: string; file: string }
const rows: Row[] = [];
for (const f of readdirSync(here)) {
  if (!/^(werkzeug|verbrauch|material).*\.json$/.test(f)) continue;
  const arr = JSON.parse(readFileSync(join(here, f), "utf8")) as Row[];
  for (const r of arr) rows.push({ ...r, file: f });
}

const seen = new Map<string, number>();
const problems: string[] = [];
const warn: string[] = [];
// Reizwörter: Glossar-Entscheide (Krypta statt Gruft, Reach statt Reich, kein Schutzschild für Ward, keine Entwicklerwörter)
const bad: Array<[RegExp, string]> = [
  [/\bGruft\b/, "DE „Gruft“ (Kanon: Krypta)"],
  [/\bReich\b|\bReiches\b/, "DE „Reich“ (Kanon: das Reach)"],
  [/Schutzschild/, "DE „Schutzschild“ (Glossar: Ward)"],
  [/Mitigation|Boost\b|\bInt\b|Buff\b/, "Entwicklerwort"],
  [/;/, "Semikolon"],
  [/\bItems?\b/, "„Item“ (im Flavor vermeiden)"],
  [/Stufe \d+ in|Stufe \d+\b(?! der)/, "„Stufe“ für Level (Chef: Level)"],
];
const badEn: Array<[RegExp, string]> = [
  [/;/, "Semikolon"],
  [/\brealm\b/i, "EN „realm“ (Kanon: the Reach)"],
  [/\bpet\b/i, "EN „pet“ (Glossar: companion)"],
  [/\bshield\b.*\bward\b|\bward\b.*\bshield\b/i, "EN shield/ward im selben Satz prüfen"],
];

for (const r of rows) {
  seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  if (!expected.has(r.id)) problems.push(`${r.file}: FREMDE ID ${r.id}`);
  if (!r.en || !r.de) problems.push(`${r.file}: LEERER TEXT ${r.id}`);
  const dashes = (r.de.match(/—|–(?!\d)/g) ?? []).length + 0;
  const dashesEn = (r.en.match(/—/g) ?? []).length;
  if (dashes > 1 || dashesEn > 1) problems.push(`${r.file}: >1 Gedankenstrich ${r.id}`);
  if (r.de.length > 160) problems.push(`${r.file}: DE ${r.de.length} Zeichen ${r.id}`);
  else if (r.de.length > 140) warn.push(`${r.file}: DE ${r.de.length} Zeichen ${r.id}`);
  if (r.en.length > 170) warn.push(`${r.file}: EN ${r.en.length} Zeichen ${r.id}`);
  for (const [re, label] of bad) if (re.test(r.de)) warn.push(`${r.file}: ${label} in DE ${r.id}: „${r.de}“`);
  for (const [re, label] of badEn) if (re.test(r.en)) warn.push(`${r.file}: ${label} in EN ${r.id}: “${r.en}”`);
  if (/  /.test(r.de) || /  /.test(r.en)) warn.push(`${r.file}: Doppelleerzeichen ${r.id}`);
}
for (const [id, n] of seen) if (n > 1) problems.push(`DOPPELT: ${id} (${n}×)`);
const missing = [...expected.keys()].filter((id) => !seen.has(id));

console.log(`Texte: ${rows.length} · erwartet: ${expected.size} · fehlend: ${missing.length}`);
if (missing.length) console.log("FEHLEND:", missing.join(", "));
console.log(`\nPROBLEME (${problems.length}):`);
for (const p of problems) console.log(" - " + p);
console.log(`\nHINWEISE (${warn.length}):`);
for (const w of warn) console.log(" - " + w);
const byType: Record<string, number> = {};
for (const r of rows) { const t = expected.get(r.id)?.type ?? "?"; byType[t] = (byType[t] ?? 0) + 1; }
console.log("\nJe Typ:", byType);
const lens = rows.map((r) => r.de.length).sort((a, b) => a - b);
console.log(`DE-Länge min/median/max: ${lens[0]} / ${lens[Math.floor(lens.length / 2)]} / ${lens[lens.length - 1]}`);
