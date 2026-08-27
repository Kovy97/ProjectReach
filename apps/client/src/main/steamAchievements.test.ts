import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { STEAM_ACHIEVEMENTS, steamApiName } from "./steamAchievements";

/**
 * Wächter für das Steam-Mapping (Achievements 1.2.0, 27.08.2026): die Tabelle in steamAchievements.ts
 * muss (a) nur interne IDs nennen, die es im Content gibt, (b) 1:1 dem eingefrorenen Steam-Set
 * (design/achievements-1.2.0/steam-set.csv) entsprechen — API-Name UND Auslöser — und (c) Steams
 * Regeln einhalten (API-Name ≤ 32 Zeichen, nur A–Z/0–9/_, eindeutig). Nicht gemappte IDs liefern null.
 */
const here = dirname(fileURLToPath(import.meta.url));
const CSV = resolve(here, "../../../../design/achievements-1.2.0/steam-set.csv");

function csvRows(): Array<{ api: string; id: string }> {
  const out: Array<{ api: string; id: string }> = [];
  const lines = readFileSync(CSV, "utf8").split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines.slice(1)) {
    const cols: string[] = [];
    let cur = "";
    let q = false;
    for (const ch of line) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) {
        cols.push(cur);
        cur = "";
      } else cur += ch;
    }
    cols.push(cur);
    let id = /(ach_[a-z0-9_]+)/.exec(cols[4]!)![1]!;
    if (id === "ach_total_level_2079") id = "ach_total_level_1980";
    out.push({ api: cols[0]!, id });
  }
  return out;
}

describe("Steam-Achievement-Mapping", () => {
  it("jede gemappte interne ID existiert im Content", () => {
    const ids = new Set(content.achievements.map((a) => a.id));
    const missing = Object.keys(STEAM_ACHIEVEMENTS).filter((id) => !ids.has(id));
    expect(missing, `unbekannte IDs im Mapping: ${missing.join(", ")}`).toEqual([]);
  });

  it("Mapping ist exakt das eingefrorene Steam-Set (67 Paare, API-Namen + Auslöser aus der CSV)", () => {
    const rows = csvRows();
    expect(rows.length).toBe(67);
    expect(Object.keys(STEAM_ACHIEVEMENTS).length).toBe(67);
    for (const r of rows) expect(STEAM_ACHIEVEMENTS[r.id], `${r.id} → ${r.api}`).toBe(r.api);
  });

  it("API-Namen: eindeutig, ≤ 32 Zeichen, nur Großbuchstaben/Ziffern/Unterstrich", () => {
    const names = Object.values(STEAM_ACHIEVEMENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) {
      expect(n.length, n).toBeLessThanOrEqual(32);
      expect(n, n).toMatch(/^[A-Z0-9_]+$/);
    }
  });

  it("steamApiName: gemappt → API-Name, In-Game-only → null (kein 1:1-Fallback mehr)", () => {
    expect(steamApiName("ach_kills_100")).toBe("BLOODED");
    expect(steamApiName("ach_chapter_20")).toBe("CH20_THE_TRUE_CULPRIT");
    expect(steamApiName("ach_skill_mining_25")).toBeNull();
    expect(steamApiName("gibt_es_nicht")).toBeNull();
  });
});
