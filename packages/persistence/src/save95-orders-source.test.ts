import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { SAVE_VERSION, defaultWorkOrderState } from "@hearthforge/shared";
import { addItem, createGame, plantCrop, workOrderProgress, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * claude:2026-10-24T16:03:31+02:00 — Save-Vertrag SAVE 95 (Chef-Entscheid QA-Runde 2 Werkstatt B2 „nur die passende Quelle zählt“):
 * neuer Zähler `stats.producedBySkill`, Arbeitsaufträge messen ihren Fortschritt daran. Migration < 95 belegt den Zähler für offene
 * Aufträge mit dem bisherigen `producedById`-Stand vor (kein Fortschrittsverlust), Sanitizing nur bekannte Skills/Items, Fixpunkt.
 */
const AT = 1_762_000_000_000;
const H = 3_600_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function asVersion(s: GameState, v: number): string {
  const parsed = JSON.parse(serialize(s, AT)) as SaveShape;
  parsed.version = v;
  parsed.state.version = v;
  return JSON.stringify(parsed);
}
const load = (s: GameState): GameState => deserialize(serialize(s, AT), content, AT)!.state;
function fixpoint(s: GameState): void {
  const once = serialize(load(s), AT);
  expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
}
function order(o: Partial<WorkOrder> & Pick<WorkOrder, "skill" | "actionId" | "itemId" | "count" | "baseline">): WorkOrder {
  return { id: 1, kind: "deliver", minutes: 20, band: 1, gold: 100, xp: 1000, customerId: "guild", ...o };
}

describe("SAVE 95: stats.producedBySkill", () => {
  it("Vault v94: lädt auf v95, offener Auftrag ohne Fortschritt bleibt bei 0, Zähler ohne Altlast; Fixpunkt", () => {
    const raw = readFileSync(join(__dirname, "..", "fixtures", "save-compat", "v94-synthetic-1.4.0.json"), "utf8");
    const savedAt = (JSON.parse(raw) as SaveShape).savedAt;
    const s = deserialize(raw, content, savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(95); // claude:2026-10-25T10:32:00+01:00 — seit 1.4.1 v96 (Slayer-Punkte), der v95-Vertrag gilt weiter
    expect(s.workOrders?.open).toHaveLength(1);
    expect(workOrderProgress(s, s.workOrders!.open[0]!).done).toBe(0);
    expect(s.stats.producedBySkill).toEqual({});
    fixpoint(s);
  });

  it("Migration < 95: offener Auftrag behält seinen Fortschritt (Vorbelegung aus producedById), danach zählt nur der Skill", () => {
    const s = createGame({ name: "QA95" }, content, 11);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    delete (s.stats as { producedBySkill?: unknown }).producedBySkill;
    s.stats.producedById = { herb_godsbreath: 40, copper_ore: 999 };
    s.workOrders = { ...defaultWorkOrderState(), seq: 1, open: [order({ skill: "foraging", actionId: "forage_godsbreath", itemId: "herb_godsbreath", count: 30, baseline: 25 })] };
    const out = deserialize(asVersion(s, 94), content, AT)!.state;
    expect(out.stats.producedBySkill).toEqual({ foraging: { herb_godsbreath: 40 } }); // copper_ore ohne offenen Auftrag: nicht vorbelegt
    expect(workOrderProgress(out, out.workOrders!.open[0]!).done).toBe(15); // 40 − 25, wie vor dem Update
    // Erneut als Alt-Version geladen: keine zweite Vorbelegung (idempotent).
    const again = deserialize(asVersion(out, 94), content, AT)!.state;
    expect(again.stats.producedBySkill).toEqual(out.stats.producedBySkill);
    fixpoint(out);
  });

  it("Sanitizing: nur bekannte Skills und Items, endliche positive Mengen; Fremdformen ⇒ {}", () => {
    const s = createGame({ name: "QA95b" }, content, 12);
    (s.stats as { producedBySkill: unknown }).producedBySkill = {
      mining: { copper_ore: 5, gibt_es_nicht: 3, tin_ore: -1, iron_ore: "x" },
      gibt_es_nicht: { copper_ore: 1 },
      fishing: [1, 2],
    };
    expect(load(s).stats.producedBySkill).toEqual({ mining: { copper_ore: 5 } });
    (s.stats as { producedBySkill: unknown }).producedBySkill = "kaputt";
    expect(load(s).stats.producedBySkill).toEqual({});
  });

  it("offline: Beet-Ernte erfüllt keinen Sammel-Lieferauftrag auf dieselbe Feldfrucht", () => {
    const s = createGame({ name: "QA95c" }, content, 13);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    const crop = Object.values(content.crops ?? {}).find((c) => c.yieldItem === "herb_godsbreath")!;
    expect(crop).toBeTruthy();
    addItem(s.inventory, content, crop.seedItem, 50);
    expect(plantCrop(s, content, 0, crop.id)).toBe(true);
    s.workOrders = { ...defaultWorkOrderState(), seq: 1, open: [order({ skill: "foraging", actionId: "forage_godsbreath", itemId: "herb_godsbreath", count: 5, baseline: 0 })] };
    const res = deserialize(serialize(s, AT), content, AT + 8 * H)!;
    expect(res.state.stats.harvestedById.herb_godsbreath ?? 0).toBeGreaterThan(0);
    expect(workOrderProgress(res.state, res.state.workOrders!.open[0]!).done).toBe(0);
  });
});
