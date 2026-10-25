import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { EVENT_COOLDOWN_MS, SAVE_VERSION, defaultSkillEventState, defaultWorkOrderState, defaultWorkOrderTierClocks } from "@hearthforge/shared";
import { createGame, createRng, deriveEventRngSeed } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/** Zufallsereignisse und Arbeitsaufträge (SAVE 91 → 92, 1.4.0 Welle 3; claude:2026-10-25T00:35:00+02:00). */
const AT = 1_761_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

const order = (id: number, extra: Partial<WorkOrder> = {}): WorkOrder => ({
  id,
  kind: "deliver",
  tier: 2, // claude:2026-10-25T17:05:00+01:00 — Pflichtfeld Stufe seit SAVE 97 (1.4.1 gestufte Aufträge); Stufe 2 = 1.4.0-Auftrag
  skill: "mining",
  actionId: "mine_copper",
  itemId: "copper_ore",
  count: 120,
  minutes: 30,
  band: 1,
  gold: 400,
  xp: 900,
  customerId: "grumm",
  baseline: 10,
  ...extra,
});

describe("Migration v91 → v92", () => {
  it("Alt-Save: Strom aus rng abgeleitet (rng unberührt), leere Ereignis- und Auftragslisten", () => {
    const s = createGame({ name: "W3" }, content, 4);
    const save = JSON.parse(serialize(s, AT)) as SaveShape;
    save.version = 91;
    save.state.version = 91;
    delete (save.state as Partial<GameState>).eventRng;
    delete (save.state as Partial<GameState>).skillEvents;
    delete (save.state as Partial<GameState>).workOrders;
    const rngBefore = save.state.rng;
    const out = deserialize(JSON.stringify(save), content, AT)!.state;
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.rng).toEqual(rngBefore);
    expect(out.eventRng).toEqual(createRng(deriveEventRngSeed(rngBefore.state)));
    expect(out.skillEvents).toEqual(defaultSkillEventState());
    expect(out.workOrders).toEqual(defaultWorkOrderState());
  });
});

describe("Ereignisse und Aufträge über Save/Load", () => {
  it("laufendes Ereignis, Logbuch, offene Aufträge und Angebot sind ein Fixpunkt", () => {
    const s = createGame({ name: "W3" }, content, 4);
    s.skillEvents = {
      cooldownMs: 120_000,
      active: { id: "rich_vein", skill: "mining", actionsLeft: 12, msLeft: 400_000 },
      harvestReady: true,
      trailReady: false,
      log: [{ seq: 3, id: "storm_fell", skill: "woodcutting", atMs: 5000, itemId: "oak_log", qty: 14 }],
      seq: 3,
    };
    s.workOrders = { open: [order(1), order(2, { kind: "produce", skill: "smithing", actionId: "smelt_copper", itemId: "copper_bar" })], offer: order(3), offerMsLeft: 600_000, tierMs: defaultWorkOrderTierClocks(), seq: 3, delivered: 4 }; // claude:2026-10-25T17:05:00+01:00 — tierMs (SAVE 97)
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.skillEvents).toEqual(s.skillEvents);
    expect(st.workOrders).toEqual(s.workOrders);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });

  it("kaputte Daten werden bereinigt, nie übernommen", () => {
    const s = createGame({ name: "W3" }, content, 4);
    (s as { skillEvents: unknown }).skillEvents = {
      cooldownMs: -5,
      active: { id: "gold_rain", skill: "mining", actionsLeft: 3, msLeft: 100 },
      harvestReady: "yes",
      log: [{ seq: 1, id: "nope", skill: "mining", atMs: 0 }],
      seq: -2,
    };
    (s as { workOrders: unknown }).workOrders = {
      open: [order(1), order(1), order(2, { actionId: "no_such_action" }), order(4), order(5), order(6)],
      offer: order(7),
      offerMsLeft: 99_999_999,
      seq: 0,
      delivered: NaN,
    };
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.skillEvents).toEqual({ cooldownMs: 0, active: null, harvestReady: false, trailReady: false, log: [], seq: 0 });
    expect(out.workOrders!.open.map((o) => o.id)).toEqual([1, 4, 5]);
    expect(out.workOrders!.offerMsLeft).toBe(900_000);
    expect(out.workOrders!.seq).toBe(7);
    expect(out.workOrders!.delivered).toBe(0);
    expect(EVENT_COOLDOWN_MS).toBe(600_000);
  });
});
