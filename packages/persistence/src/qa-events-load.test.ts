import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { ORDER_OFFER_TTL_MS } from "@hearthforge/shared";
import { createGame, setActiveAction } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA-Prüfrunde 1.4.0 Welle 3: Laden mit Offline-Fenster (claude:2026-10-25T18:30:00+02:00, Kontrolleur).
 * Die Uhren von Ereignis und Angebot dürfen beim Offline-Catch-up nicht laufen, ein Zähl-Ereignis nicht verbraucht werden.
 */
const AT = 1_761_300_000_000;
type SaveShape = { version: number; savedAt: number; state: GameState };

const order = (id: number, extra: Partial<WorkOrder> = {}): WorkOrder => ({
  id,
  kind: "deliver",
  skill: "mining",
  actionId: "mine_copper",
  itemId: "copper_ore",
  count: 120,
  minutes: 30,
  band: 1,
  gold: 400,
  xp: 900,
  customerId: "grumm",
  baseline: 0,
  ...extra,
});

describe("Laden mit Offline-Fenster", () => {
  it("1 h offline Bergbau: Reiche Ader unverbraucht, Zeituhr steht, Angebot bleibt mit voller Restzeit; Auftrag zählt die Offline-Arbeit", () => {
    const s = createGame({ name: "W3" }, content, 4);
    s.settings.materialsToStorage = false;
    setActiveAction(s, content, "mine_copper");
    s.skillEvents = {
      cooldownMs: 120_000,
      active: { id: "rich_vein", skill: "mining", actionsLeft: 12, msLeft: 400_000 },
      harvestReady: false,
      trailReady: false,
      log: [],
      seq: 0,
    };
    s.workOrders = { open: [order(1)], offer: order(2), offerMsLeft: ORDER_OFFER_TTL_MS, seq: 2, delivered: 0 };
    const out = deserialize(serialize(s, AT), content, AT + 3_600_000)!.state;
    const ev = out.skillEvents!;
    const wo = out.workOrders!;
    expect(out.stats.actionRunsById.mine_copper ?? 0).toBeGreaterThan(100); // das Fenster lief
    expect(ev.active).toEqual({ id: "rich_vein", skill: "mining", actionsLeft: 12, msLeft: 400_000 });
    expect(ev.cooldownMs).toBe(120_000);
    expect(ev.seq).toBe(0);
    expect(wo.offer).toEqual(order(2));
    expect(wo.offerMsLeft).toBe(ORDER_OFFER_TTL_MS);
    expect(wo.open[0]).toEqual(order(1));
    expect((out.stats.producedById?.copper_ore ?? 0) - 0).toBeGreaterThanOrEqual(120); // Offline-Arbeit zählt (Spec §4.3)
  });

  it("Angebot ohne Restzeit im Save wird beim Laden verworfen (kein Geister-Angebot), offene Aufträge bleiben", () => {
    const s = createGame({ name: "W3" }, content, 4);
    s.workOrders = { open: [order(1)], offer: order(2), offerMsLeft: 0, seq: 2, delivered: 0 };
    const save = JSON.parse(serialize(s, AT)) as SaveShape;
    const wo = deserialize(JSON.stringify(save), content, AT)!.state.workOrders!;
    expect(wo.offer).toBeNull();
    expect(wo.open.length).toBe(1);
    expect(wo.seq).toBe(2);
  });
});
