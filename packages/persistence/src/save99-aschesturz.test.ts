import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import {
  CAMP_MAX_OFFLINE_BONUS_MS,
  FARM_PLOT_SLOTS,
  HUNT_TRAP_SLOTS_TOTAL,
  MAX_OFFLINE_MS,
  PRESTIGE_MAX_OFFLINE_BONUS_MS,
  PRESTIGE_TALENT_TREE_ID,
  SAVE_VERSION,
  defaultPrestigePaidLedger,
  emptyFarmPlot,
  emptyHuntTrap,
} from "@hearthforge/shared";
import { createGame, prestigePointsPreview } from "@hearthforge/engine";
import { MAX_POSSIBLE_OFFLINE_MS, deserialize, serialize } from "./index";

/**
 * claude:2026-10-30T19:07:00+01:00 — Save-Vertrag SAVE 99 (1.4.2 „Aschesturz 2.0“, design/1.4.2-aschesturz-spec.md § 5):
 * `prestige.paid` (Hauptbuch, leer ab Update, E2), `prestige.runStart.raidClears` (Migration = aktueller Stand), Beete 12 /
 * Fallen 8, Sanitizing des Hauptbuchs und der neuen Offline-Obergrenze, Offline-Fenster mit „Lange Nacht“.
 */
const VAULT_DIR = join(__dirname, "..", "fixtures", "save-compat");
const AT = 1_762_200_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function v98(): { json: string; raw: SaveShape } {
  const json = readFileSync(join(VAULT_DIR, "v98-synthetic-1.4.1.json"), "utf-8");
  return { json, raw: JSON.parse(json) as SaveShape };
}

function load(state: unknown, now = AT): GameState {
  const r = deserialize(JSON.stringify({ version: SAVE_VERSION, savedAt: AT, state }), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

function fresh(): GameState {
  return createGame({ name: "Neun" }, content, 9);
}

describe("SAVE 99: Migration < 99 (echtes v98-Fixture)", () => {
  it("Hauptbuch leer, Raid-Laufanker = aktueller Stand, Beete 12 / Fallen 8 mit leeren Zusatzplätzen, sonst unverändert", () => {
    const { json, raw } = v98();
    expect(raw.version).toBe(98);
    expect(raw.state.farmPlots).toHaveLength(9);
    expect(raw.state.huntTraps).toHaveLength(6);
    const s = deserialize(json, content, raw.savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION); // claude:2026-10-30T22:28:00+01:00 — seit SAVE 100 hebt die Kette weiter als 99
    // claude:2026-10-31T14:58:54+01:00 — SAVE 102: Die Migration < 99 legt das Hauptbuch leer an; weil der v98-Stand schon einen Sturz hat, zahlt die
    // Nachzahlung zu 1.4.2 beim selben Laden die Sammlung aus und trägt sie ein (2 Begleiter, 500 AP, Raid normal/heroisch = 28 Narben).
    expect(s.prestige.paid).toEqual({ pets: ["rotbark", "cragmaw"], bestiary: [], ap: 500, raids: ["normal", "heroic"] });
    expect(s.prestige.respec142?.retro.total).toBe(28);
    expect(s.prestige.runStart.raidClears).toEqual(raw.state.raid!.clears);
    expect(s.prestige.runStart.raidClears).toEqual({ normal: 3, heroic: 1, mythic: 0 });
    expect(s.farmPlots).toHaveLength(FARM_PLOT_SLOTS);
    expect(s.farmPlots.slice(0, 9)).toEqual(raw.state.farmPlots);
    for (const p of s.farmPlots.slice(9)) expect(p).toEqual(emptyFarmPlot());
    expect(s.huntTraps).toHaveLength(HUNT_TRAP_SLOTS_TOTAL);
    expect(s.huntTraps.slice(0, 6)).toEqual(raw.state.huntTraps);
    for (const t of s.huntTraps.slice(6)) expect(t).toEqual(emptyHuntTrap());
    // Alles Übrige des Prestige-Zustands bleibt (Zählerstand, Guthaben, Historie, Zähler-Anker).
    // claude:2026-10-31T14:58:54+01:00 — SAVE 102: Guthaben = alter Stand + Nachzahlung; der Beleg ist neu.
    const { paid: _p, runStart, respec142: _b, points, ...rest } = s.prestige;
    const { runStart: rawRun, points: rawPoints, ...rawRest } = raw.state.prestige as unknown as Record<string, unknown> & { runStart: Record<string, unknown>; points: number };
    expect(rest).toEqual(rawRest);
    expect(points).toBe(rawPoints + 28);
    const { raidClears: _r, ...runRest } = runStart;
    expect(runRest).toEqual(rawRun);
  });

  it("E2: der erste Sturz nach dem Update zahlt die bestehende Sammlung (Begleiter, Raid-Erstabschluss) einmal; alte Raids nicht doppelt", () => {
    // claude:2026-10-31T14:58:54+01:00 — SAVE 102 (Chef 31.10.2026): Wer schon gestürzt ist, bekommt die Sammlung jetzt beim Laden (s. save102-respec.test.ts).
    // E2 gilt weiter für Stände ohne Sturz; darum hier derselbe v98-Stand im ersten Durchgang.
    const { raw } = v98();
    const firstRun = structuredClone(raw);
    firstRun.state.prestige.count = 0;
    firstRun.state.prestige.history = [];
    const s = deserialize(JSON.stringify(firstRun), content, raw.savedAt)!.state;
    expect(s.prestige.respec142).toBeNull();
    const p = prestigePointsPreview(s, content);
    expect(p.newPets).toEqual(["rotbark", "cragmaw"]);
    expect(p.fromPets).toBe(8);
    expect(p.newRaidFirsts).toEqual(["normal", "heroic"]);
    expect(p.fromRaidFirst).toBe(15);
    expect(p.fromRaid).toBe(0); // Abschlüsse vor dem Update zählen nicht noch einmal als Leistung dieses Durchgangs
  });

  it("idempotent: ein v99-Stand bleibt beim zweiten Laden byte-gleich", () => {
    const { json, raw } = v98();
    const once = serialize(deserialize(json, content, raw.savedAt)!.state, raw.savedAt);
    const twice = serialize(deserialize(once, content, raw.savedAt)!.state, raw.savedAt);
    expect(twice).toBe(once);
  });
});

describe("SAVE 99: Sanitizing", () => {
  it("Hauptbuch: nur bekannte Ids, ohne Doppel und `dg_`-Varianten, AP ganzzahlig ≥ 0 auf volle 100", () => {
    const s = fresh();
    const pet = Object.keys(content.pets)[0]!;
    const dg = Object.keys(content.monsters).find((id) => id.startsWith("dg_"));
    (s.prestige as unknown as Record<string, unknown>).paid = {
      pets: [pet, pet, "kein_begleiter", 7],
      bestiary: ["chicken", "chicken", "kein_monster", ...(dg ? [dg] : [])],
      ap: 1234.9,
      raids: ["heroic", "legendary", "heroic", "normal"],
    };
    expect(load(s).prestige.paid).toEqual({ pets: [pet], bestiary: ["chicken"], ap: 1200, raids: ["heroic", "normal"] });
    for (const bad of [undefined, null, 5, "x", []]) {
      (s.prestige as unknown as Record<string, unknown>).paid = bad;
      expect(load(s).prestige.paid, String(bad)).toEqual(defaultPrestigePaidLedger());
    }
    (s.prestige as unknown as Record<string, unknown>).paid = { pets: [], bestiary: [], ap: -50, raids: [] };
    expect(load(s).prestige.paid.ap).toBe(0);
  });

  it("Raid-Laufanker: ganzzahlig, höchstens der aktuelle Stand; fehlt er, gilt der aktuelle Stand", () => {
    const s = fresh();
    s.raid!.clears = { normal: 4, heroic: 2, mythic: 0 };
    s.prestige.runStart.raidClears = { normal: 9, heroic: 1.7, mythic: -3 };
    expect(load(s).prestige.runStart.raidClears).toEqual({ normal: 4, heroic: 1, mythic: 0 });
    delete (s.prestige.runStart as unknown as Record<string, unknown>).raidClears;
    expect(load(s).prestige.runStart.raidClears).toEqual({ normal: 4, heroic: 2, mythic: 0 });
    (s as unknown as Record<string, unknown>).prestige = "kaputt";
    expect(load(s).prestige.runStart.raidClears).toEqual({ normal: 4, heroic: 2, mythic: 0 });
  });

  it("gültiger v99-Stand mit Hauptbuch ist ein Fixpunkt (Round-Trip byte-gleich)", () => {
    const s = fresh();
    s.prestige.paid = { pets: [Object.keys(content.pets)[1]!], bestiary: ["chicken"], ap: 300, raids: ["normal"] };
    const once = serialize(load(s), AT);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
    expect((JSON.parse(once) as SaveShape).state.prestige.paid).toEqual(s.prestige.paid);
  });

  it("Timer-Klemme: Obergrenze = 8 h + 3 h Wachturm + 8 h Lange Nacht = 19 h", () => {
    expect(MAX_POSSIBLE_OFFLINE_MS).toBe(MAX_OFFLINE_MS + CAMP_MAX_OFFLINE_BONUS_MS + PRESTIGE_MAX_OFFLINE_BONUS_MS);
    expect(MAX_POSSIBLE_OFFLINE_MS).toBe(19 * 3_600_000);
    const s = fresh();
    s.accumulatorMs = 18 * 3_600_000; // über der alten 11-h-Grenze, legitim mit Lange Nacht
    expect(load(s).accumulatorMs).toBe(18 * 3_600_000);
    s.accumulatorMs = 30 * 3_600_000;
    expect(load(s).accumulatorMs).toBe(MAX_POSSIBLE_OFFLINE_MS);
  });
});

describe("SAVE 99: Offline-Fenster mit „Lange Nacht“ beim Laden", () => {
  it("Rang 4 ⇒ 16 h statt 8 h; ohne Aufstieg (Baum gesperrt) bleibt es bei 8 h", () => {
    const s = fresh();
    s.prestige.count = 1;
    s.talents = { [PRESTIGE_TALENT_TREE_ID]: { offlineHours: 4 } };
    const json = serialize(s, AT);
    const r = deserialize(json, content, AT + 30 * 3_600_000)!;
    expect(r.offlineMs).toBe(16 * 3_600_000);
    const locked = structuredClone(s);
    locked.prestige.count = 0;
    const r0 = deserialize(serialize(locked, AT), content, AT + 30 * 3_600_000)!;
    expect(r0.offlineMs).toBe(MAX_OFFLINE_MS);
  });
});
