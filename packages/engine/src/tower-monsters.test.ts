import { describe, it, expect } from "vitest";
import { content } from "@hearthforge/content";

/**
 * Guard: Slayer-Tower-Monster (`tower_<x>`) sind Klone des Zonen-Monsters `<x>` — Loot/Resist/Inflict/
 * Enrage/attackIntervalMs bleiben 1:1 identisch (s. design/tower-monster-refactor.md), aber Level +
 * Kampfstats + xp/gold dürfen bewusst abweichen (balance-pass2 2026-07-01: Tower-Etagen 2–5 lagen
 * 2–3× über ihrem Etagen-Band; die Klone sind laut Content-Kommentar :10835 "bewusst unabhängig
 * editierbar"). Dieser Test verhindert stille Drift bei allen ANDEREN Feldern, falls jemand ein
 * Basis-Monster tunt und den Tower-Zwilling vergisst. Auch der Bild-Resolver setzt die id/zone-Beziehung
 * voraus (getMonsterSrc: tower_<x> → <x>.png).
 *
 * Soll ein Tower-Monster in einem weiteren Feld bewusst abweichen, hier ergänzen — dann ist die
 * Designentscheidung dokumentiert statt Zufall.
 */
const ALLOWED_DIFF_KEYS = new Set([
  "id",
  "zone",
  "slayerFloor",
  "level",
  "maxHp",
  "damage",
  "accuracy",
  "evasion",
  "defense",
  "wardCapacity",
  "regen",
  "xp",
  "gold",
  // Fix-Welle O (2026-07-13, Chef-Muster "Dungeon erzwingen"): Boss-Kapitel-Monster wie roc_void
  // wurden dungeonOnly (nur noch via Dungeon-Wellen kämpfbar), damit ihr Boss-Kapitel den Dungeon
  // erzwingt statt sie offen umgehbar zu lassen. Der Turm-Klon (tower_roc_void) ist ein EIGENER,
  // legitimer Kampf-Kontext (Slayer-Turm-Etage, direkt via startCombat betreten) — er bleibt
  // bewusst frei kämpfbar und trägt das Flag NICHT. Basis darf dungeonOnly sein, Klon nicht.
  "dungeonOnly",
]);

/**
 * item-drop-audit Nachzug (Task #339 → #344, Chef-GO 25.07.2026): Der Audit hat die geteilten
 * Loot-Tabellen zwischen Slayer-Turm-Twins und Welt-Zonen-Versionen als eine der zwei WURZELURSACHEN
 * für wertlose Hochlevel-Zonen-Drops identifiziert (design/item-drop-audit.md §4.1) — die Tabellen
 * sind für die TURM-Inkarnation getunt (Etagen-Fenster F1–F5) und liefern auf der Zonen-Seite
 * (3–5 Tiers höheres Spieler-Fenster) systematisch unterband. Der Chef hat für GENAU diese 5 Paare
 * die Loot-Parität aufgehoben, damit die Zonen-Version die im Audit §6 P3 vorgeschlagenen on-band-
 * Beikost-Rows tragen kann (Task #341 hatte sie deshalb zurückgenommen statt den Guard eigenmächtig
 * aufzuweichen).
 *
 * Richtung der Divergenz (EINZIGE erlaubte): die ZONEN-Version bekommt eine zusätzliche on-band-Row
 * ans Tabellenende, der TURM-Zwilling bleibt UNVERÄNDERT beim bestehenden Turm-Tuning (design/
 * tower-monster-refactor.md: "Turm-Tabellen F1–F5 nicht anfassen").
 *
 * ABSICHTLICH ENG gefasst als Allowlist der Basis-IDs (nicht `loot` blanko in ALLOWED_DIFF_KEYS) —
 * alle anderen Turm-Klone (tower_goblin, tower_goblin_rogue) bleiben unter voller 1:1-Loot-Pflicht;
 * künftige Drift bei IHNEN feuert weiterhin rot.
 *
 * #354 Paket 3.3 Nachtrag (2026-07-26, Chef-Mandat): roc_void ergänzt dieselbe on-band-Row-Politur
 * (aetherium_chainbody @0.3%, Highlands-Zonen-Top) — tower_roc_void bleibt bewusst UNVERÄNDERT beim
 * bestehenden Turm-F5-Tuning. War vorher explizit als "bleibt 1:1" genannt; das war der Stand VOR
 * diesem Task, jetzt bewusst aufgehoben nach demselben Muster wie die 5 Bestandsausnahmen.
 */
const LOOT_PARITY_EXCEPTIONS = new Set([
  "skeleton_warrior",
  "skeleton_archer",
  "ember_elemental",
  "iron_revenant",
  "frost_hound",
  "roc_void",
]);

describe("Slayer-Tower-Monster sind 1:1-Klone ihrer Basis", () => {
  const mons = content.monsters as unknown as Record<string, Record<string, unknown>>;
  const towerIds = Object.keys(mons).filter((id) => id.startsWith("tower_"));

  it("es gibt überhaupt Tower-Monster (Sanity)", () => {
    expect(towerIds.length).toBeGreaterThan(0);
  });

  for (const tid of towerIds) {
    const baseId = tid.replace(/^tower_/, "");
    it(`${tid} == ${baseId} (außer id/zone${LOOT_PARITY_EXCEPTIONS.has(baseId) ? "/loot" : ""})`, () => {
      const base = mons[baseId];
      expect(base, `Basis-Monster "${baseId}" fehlt für ${tid}`).toBeDefined();
      const t = mons[tid]!;
      const keys = new Set([...Object.keys(t), ...Object.keys(base!)]);
      for (const k of keys) {
        if (ALLOWED_DIFF_KEYS.has(k)) continue;
        if (k === "loot" && LOOT_PARITY_EXCEPTIONS.has(baseId)) continue;
        expect(JSON.stringify(t[k]), `Drift in "${k}" zwischen ${tid} und ${baseId}`).toBe(
          JSON.stringify(base![k]),
        );
      }
    });
  }
});
