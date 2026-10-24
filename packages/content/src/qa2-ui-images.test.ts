// claude:2026-10-24T15:50:00+02:00 — QA-Runde 2 (1.4.0 „Feder und Stahl“), Bereich Oberfläche/Bilder.
// Bild-Abdeckung der 1.4-Inhalte gegen den Asset-Ordner des Clients (Loader-Regeln aus apps/client/src/renderer/items.ts
// nachgebildet: direkte Datei, Alias, `_heroic`/`_mythic` → Grundbild) sowie 7-Sprachen-Parität der Content-Felder.
// Bericht: design/qa/1.4.0-r2-ui.md.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "./index";
import { collectEnglishStrings } from "./locales/apply";

const RENDERER = join(__dirname, "..", "..", "..", "apps", "client", "src", "renderer");
const ids = (dir: string): Set<string> =>
  new Set(readdirSync(join(RENDERER, "assets", dir)).filter((f) => /\.(png|webp)$/.test(f)).map((f) => f.replace(/\.(png|webp)$/, "")));

const itemImgs = ids("items");
const monsterImgs = ids("monsters");
const eventImgs = ids("events");
const roomImgs = new Set([...ids("battlescreens"), ...ids("dungeons")]);

const itemsTs = readFileSync(join(RENDERER, "items.ts"), "utf8");
const aliasStart = itemsTs.indexOf("ITEM_IMAGE_ALIASES");
const aliasBlock = itemsTs.slice(aliasStart, itemsTs.indexOf("};", aliasStart));
const aliases: Record<string, string> = {};
for (const m of aliasBlock.matchAll(/^\s*([a-z_]+):\s*"([a-z_]+)"/gm)) aliases[m[1]!] = m[2]!;
const VARIANT = /_(heroic|mythic)$/;
const hasItemImage = (id: string): boolean =>
  itemImgs.has(id) || itemImgs.has(aliases[id] ?? "") || (VARIANT.test(id) && itemImgs.has(id.replace(VARIANT, "")));

describe("qa2 ui images: Raid-Beute (Welle 4) und Teil-1-Bilder", () => {
  it("alle 93 Raid-Items (31 × Normal/Heroisch/Mythisch) lösen auf ein Bild auf", () => {
    const raid = Object.keys(content.items).filter((id) => id.startsWith("gk_"));
    expect(raid.length).toBe(93);
    expect(raid.filter((id) => !hasItemImage(id))).toEqual([]);
  });

  it("Köcher, Pfeilschäfte, Grundpfeile Kupfer–Blutstahl, Reliktstaub, Meisterring Bognerei haben ein Bild", () => {
    const must = Object.keys(content.items).filter((id) => /_quiver$|^arrow_shaft$|^relic_dust$|^ring_master_bowcraft$/.test(id));
    expect(must.length).toBeGreaterThanOrEqual(15);
    expect(must.filter((id) => !hasItemImage(id))).toEqual([]);
  });

  // Offen (keine Fehler der Welle, Restlieferung liegt laut design/1.4.0-assets-final.md im Staging, Einbau steht aus):
  // Gruppe F (3 Grundpfeile Titan–Götteisen, 12 Effektpfeile, 12 Pfeilspitzen), Gruppe K (5 Werkstattkisten),
  // Gruppe B (15 Raid-Gegner), Gruppe A (gk_room_5, Raid-Karte), Gruppe H (inspiration). Bis dahin Emoji-/Rückfall-Anzeige.
  it.fails("OFFEN: Restlieferung 1.4.0 (Pfeile/Spitzen, Werkstattkisten, Raid-Gegner, Raum 5, Ereigniskarte „Eingebung“) noch nicht eingebaut", () => {
    const openItems = Object.keys(content.items).filter((id) => !hasItemImage(id));
    const openRaidMonsters = Object.keys(content.monsters).filter((id) => id.startsWith("gk_") && !monsterImgs.has(id));
    expect(openItems.filter((id) => /arrow|work_crate/.test(id))).toEqual([]);
    expect(openRaidMonsters).toEqual([]);
    expect(eventImgs.has("inspiration")).toBe(true);
    expect(roomImgs.has("gk_room_5")).toBe(true);
  });

  // Befund (Niedrig): zwei Textdateien mit einer Node-Fehlerausgabe liegen im Bildordner der Items (Commit f6a9914).
  // Der Loader liest nur png/webp, deshalb ohne Laufzeitwirkung, aber Fremdmaterial im Asset-Bestand.
  it("Item-Bildordner frei von Fremddateien (dps5_*.txt entfernt, QA2-UI N6)", () => {
    const foreign = readdirSync(join(RENDERER, "assets", "items")).filter((f) => !/\.(png|webp)$/.test(f));
    expect(foreign).toEqual([]);
  });
});

describe("qa2 ui images: Content-Texte in 7 Sprachen", () => {
  it("jedes lokalisierbare Content-Feld trägt en, de, es, fr, pt-BR, ru und zh", () => {
    const LOCALES = ["en", "de", "es", "pt-BR", "fr", "ru", "zh"] as const;
    const missing: string[] = [];
    const db = content as unknown as Record<string, unknown>;
    const find = (collection: string, id: string): Record<string, unknown> | null => {
      if (collection === "talentBranches" || collection === "talentNodes") {
        const [treeId, sub] = id.split(".");
        const tree = (db.talentTrees as Array<Record<string, unknown>>).find((t) => t.id === treeId);
        const list = (collection === "talentBranches" ? tree?.branches : tree?.nodes) as Array<Record<string, unknown>> | undefined;
        return list?.find((x) => x.id === sub) ?? null;
      }
      const c = db[collection];
      if (Array.isArray(c)) return (c as Array<Record<string, unknown>>).find((x) => String(x.id ?? x.floor) === id) ?? null;
      return ((c as Record<string, Record<string, unknown>> | undefined)?.[id]) ?? null;
    };
    for (const key of Object.keys(collectEnglishStrings(content))) {
      const [collection, id, field] = key.split(/:(.+?):(.+)$/).filter(Boolean) as [string, string, string];
      const ent = find(collection, id);
      if (!ent) {
        missing.push(`${key} (nicht auflösbar)`);
        continue;
      }
      let val: unknown = ent;
      for (const part of field.split(".")) val = (val as Record<string, unknown> | undefined)?.[part];
      const obj = typeof val === "string" ? { en: val } : (val as Record<string, string>);
      for (const loc of LOCALES) if (typeof obj?.[loc] !== "string" || obj[loc]!.trim() === "") missing.push(`${loc} ${key}`);
    }
    expect(missing).toEqual([]);
  });
});
