import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { content } from "./index";

/**
 * Wächter für den Achievement-Katalog 1.2.0 (Chef-Entscheid 27.08.2026, design/achievements-1.2.0/audit.md § 2).
 *
 *  1. Alle 69 Steam-Auslöser (steam-set.csv, Spalte `trigger_internal_id`) existieren als interne
 *     Erfolge — bestehende unter ihrer alten ID, neue exakt wie in der CSV benannt
 *     (`ach_total_level_2079 (count 1980)` heißt laut CSV jetzt `ach_total_level_1980`).
 *  2. Hidden-Flag stimmt mit der CSV überein (kein Spoiler im Spiel, wo Steam versteckt).
 *  3. Keine doppelten IDs, jede Bedingung trägt count > 0, Zielgröße ≈ 330 (D1: 537 → ~330),
 *     genau 12 versteckte (§ 2.6), keine XP-Meilensteine (D2: kein `skill_xp`).
 *  4. Spielersichtbare Texte: max. 1 Gedankenstrich je Text (Hausregel „natürliche Spieltexte").
 *  5. Overlay-Vollständigkeit: jeder Erfolg trägt name UND description in allen 5 Overlay-Sprachen
 *     (die Kill-Tripel sind weg, dafür ist der Rest komplett übersetzt — verwaiste Keys wären harmlos,
 *     FEHLENDE Keys hießen englische Erfolgsnamen in fünf Sprachen).
 */

const here = dirname(fileURLToPath(import.meta.url));
const CSV = resolve(here, "../../../design/achievements-1.2.0/steam-set.csv");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let quoted = false;
    for (const ch of line) {
      if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) {
        cols.push(cur);
        cur = "";
      } else cur += ch;
    }
    cols.push(cur);
    rows.push(cols);
  }
  return rows;
}

/** Steam-Set aus der eingefrorenen CSV: API-Name → { internalId, hidden }. */
export function steamSetFromCsv(): Array<{ api: string; internalId: string; hidden: boolean }> {
  const rows = parseCsv(readFileSync(CSV, "utf8"));
  const header = rows[0]!;
  const iApi = header.indexOf("api_name");
  const iTrig = header.indexOf("trigger_internal_id");
  const iHidden = header.indexOf("hidden");
  return rows.slice(1).map((r) => {
    const m = /(ach_[a-z0-9_]+)/.exec(r[iTrig]!);
    let internalId = m![1]!;
    if (internalId === "ach_total_level_2079") internalId = "ach_total_level_1980"; // CSV: „(count 2178)", ID historisch
    return { api: r[iApi]!, internalId, hidden: r[iHidden] === "yes" };
  });
}

describe("Achievements 1.2.0 — Katalog-Wächter", () => {
  const byId = new Map(content.achievements.map((a) => [a.id, a]));

  it("alle 69 Steam-Auslöser aus steam-set.csv (1.2.0: +MASTER_TAILORING, +MASTER_HUNTING) existieren, API-Namen sind eindeutig und ≤ 32 Zeichen", () => {
    const set = steamSetFromCsv();
    expect(set.length).toBe(69);
    const missing = set.filter((s) => !byId.has(s.internalId)).map((s) => `${s.api} → ${s.internalId}`);
    expect(missing, `fehlende interne Erfolge:\n${missing.join("\n")}`).toEqual([]);
    const apis = new Set(set.map((s) => s.api));
    expect(apis.size).toBe(69);
    for (const s of set) expect(s.api.length, s.api).toBeLessThanOrEqual(32);
    expect(byId.has("ach_total_level_2079"), "alte ID wurde laut CSV umbenannt").toBe(false);
    expect(byId.get("ach_total_level_1980")!.condition.count).toBe(2178); // 1.2.0: 22 Skills × 99 (ID bleibt, nie recyceln)
  });

  it("hidden-Flag stimmt mit dem Steam-Set überein", () => {
    for (const s of steamSetFromCsv()) {
      expect(!!byId.get(s.internalId)!.hidden, `${s.internalId} hidden`).toBe(s.hidden);
    }
  });

  it("Katalog: keine Duplikate, count > 0, ~330 Erfolge, 12 versteckte, keine XP-Meilensteine", () => {
    const ids = content.achievements.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of content.achievements) expect(a.condition.count, a.id).toBeGreaterThan(0);
    expect(content.achievements.length).toBeGreaterThanOrEqual(300);
    expect(content.achievements.length).toBeLessThanOrEqual(380); // claude:2026-10-25T05:25:00+02:00 — 1.4.0 Raid: 22 interne Raid-Erfolge
    expect(content.achievements.filter((a) => a.hidden).length).toBe(12);
    expect(content.achievements.some((a) => (a.condition.type as string) === "skill_xp")).toBe(false);
    // Kill-Tripel sind Geschichte: kein Monster hat mehr die 10/100/1000-Leiter.
    const chains = new Map<string, number[]>();
    for (const a of content.achievements) {
      if (a.condition.type !== "monster_kills" || !a.condition.target) continue;
      chains.set(a.condition.target, [...(chains.get(a.condition.target) ?? []), a.condition.count]);
    }
    for (const [m, counts] of chains) expect(counts.length, `Kill-Kette ${m}`).toBeLessThanOrEqual(2);
  });

  it("Skill-Leitern: genau 5 Stufen (25/50/75/90/99) je Skill, alle 20 Skills", () => {
    for (const skill of Object.keys(content.skills)) {
      const levels = content.achievements
        .filter((a) => a.condition.type === "skill_level" && a.condition.target === skill)
        .map((a) => a.condition.count)
        .sort((x, y) => x - y);
      expect(levels, skill).toEqual([25, 50, 75, 90, 99]);
    }
  });

  it("Chronik: 21 Kapitel-Erfolge in Kapitelreihenfolge, jede Zone hat Bestiarium-Paar, jeder Dungeon eine Leiter", () => {
    for (let n = 1; n <= 21; n++) {
      const id = `ach_chapter_${String(n).padStart(2, "0")}`;
      const a = byId.get(id);
      expect(a, id).toBeDefined();
      expect(a!.condition).toEqual({ type: "quests_completed", target: `chronicle_${String(n).padStart(2, "0")}`, count: 1 });
    }
    for (const z of content.zones) {
      expect(byId.has(`ach_zone_${z.id}_1`), z.id).toBe(true);
      expect(byId.has(`ach_zone_${z.id}_100`), z.id).toBe(true);
    }
    for (const d of content.dungeons) {
      if (d.id === "paragon_tower") continue;
      if (d.raidOnly) continue; // claude:2026-10-25T10:00:00+02:00 — Raid-Räume haben eigene Erfolge je Boss und Stufe (raid-content.test.ts), keine Dungeon-Leiter
      for (const n of [1, 10, 50]) expect(byId.has(`ach_dungeon_${d.id}_${n}`), `${d.id}_${n}`).toBe(true);
    }
  });

  it("Texte: max. 1 Gedankenstrich je spielersichtbarem Text (en/de)", () => {
    const dashes = (s: string) => (s.match(/[—–]/g) ?? []).length;
    for (const a of content.achievements) {
      for (const v of [a.name, a.description]) {
        const en = typeof v === "string" ? v : v.en;
        const de = typeof v === "string" ? "" : v.de ?? "";
        expect(dashes(en), `${a.id}: ${en}`).toBeLessThanOrEqual(1);
        expect(dashes(de), `${a.id}: ${de}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("Overlays: jeder Erfolg trägt name UND description in es/fr/pt-BR/ru/zh", () => {
    const missing: string[] = [];
    for (const a of content.achievements) {
      for (const field of ["name", "description"] as const) {
        const v = a[field];
        for (const locale of ["es", "fr", "pt-BR", "ru", "zh"] as const) {
          const t = typeof v === "string" ? undefined : v[locale];
          if (typeof t !== "string" || t.length === 0) missing.push(`achievements:${a.id}:${field} → ${locale}`);
        }
      }
    }
    expect(missing, `Fehlende Overlay-Einträge (${missing.length}):\n${missing.slice(0, 40).join("\n")}`).toEqual([]);
  });
});
