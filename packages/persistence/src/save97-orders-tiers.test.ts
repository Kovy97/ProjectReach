import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { ORDER_TIERS, SAVE_VERSION, defaultWorkOrderTierClocks, workOrderTierClockMax } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * claude:2026-10-25T17:05:00+01:00 — Save-Vertrag SAVE 97 (1.4.1 gestufte Arbeitsaufträge, Chef 25.10.2026; design/1.4.1-auftraege-gestuft.md):
 * `WorkOrder.tier` und `WorkOrderState.tierMs`, optional `SkillEventLogEntry.orderTier`. Alt-Saves < 97: offene Aufträge und Angebot
 * werden Stufe 2 mit unverändertem Lohn, Uhren auf den Mittelwerten. Sanitizing für kaputte Werte, Fixpunkt.
 */
const AT = 1_762_100_000_000;
const MIN = 60_000;
type SaveShape = { version: number; savedAt: number; state: GameState };
const means = defaultWorkOrderTierClocks();

function asVersion(s: GameState, v: number, strip: (st: Record<string, unknown>) => void = () => {}): string {
  const parsed = JSON.parse(serialize(s, AT)) as SaveShape;
  parsed.version = v;
  parsed.state.version = v;
  strip(parsed.state as unknown as Record<string, unknown>);
  return JSON.stringify(parsed);
}
function fixpoint(s: GameState): void {
  const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
  expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
}
/** Auftrag in der 1.4.0-Form (ohne Stufe), fester Lohn mit dem alten XP-Faktor 1,5. */
const legacyOrder = (id: number, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  id,
  kind: "deliver",
  skill: "mining",
  actionId: "mine_copper",
  itemId: "copper_ore",
  count: 480,
  minutes: 35,
  band: 1,
  gold: 1234,
  xp: 5678,
  customerId: "grumm",
  baseline: 17,
  ...extra,
});

describe("SAVE 97: Migration < 97", () => {
  it("Vault v96: lädt auf v97, der offene Auftrag bleibt vollständig erhalten und wird Stufe 2, Uhren auf den Mittelwerten; Fixpunkt", () => {
    const raw = readFileSync(join(__dirname, "..", "fixtures", "save-compat", "v96-synthetic-1.4.1.json"), "utf8");
    const parsed = JSON.parse(raw) as SaveShape;
    const before = parsed.state.workOrders!.open[0]!;
    expect((before as Partial<WorkOrder>).tier).toBeUndefined();
    const s = deserialize(raw, content, parsed.savedAt)!.state;
    expect(s.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(97);
    expect(s.workOrders!.open).toHaveLength(1);
    expect(s.workOrders!.open[0]).toEqual({ ...before, tier: 2 });
    expect(s.workOrders!.tierMs).toEqual(means);
    expect(s.workOrders!.seq).toBe(parsed.state.workOrders!.seq);
    fixpoint(s);
  });

  it("Alt-Save mit offenen Aufträgen und Angebot: alles bleibt (Lohn, Menge, Startanker, Restzeit), Stufe 2; erneutes Laden als v96 idempotent", () => {
    const s = createGame({ name: "S97" }, content, 9);
    const json = asVersion(s, 96, (st) => {
      st.workOrders = { open: [legacyOrder(1), legacyOrder(2, { itemId: "tin_ore", actionId: "mine_tin" })], offer: legacyOrder(3), offerMsLeft: 600_000, seq: 3, delivered: 5 };
    });
    const out = deserialize(json, content, AT)!.state;
    const wo = out.workOrders!;
    expect(wo.open.map((o) => o.tier)).toEqual([2, 2]);
    expect(wo.open[0]).toEqual({ ...legacyOrder(1), tier: 2 });
    expect(wo.open[1]!.itemId).toBe("tin_ore");
    expect(wo.offer).toEqual({ ...legacyOrder(3), tier: 2 });
    expect(wo.offerMsLeft).toBe(600_000);
    expect(wo.tierMs).toEqual(means);
    expect(wo.delivered).toBe(5);
    const again = deserialize(asVersion(out, 96), content, AT)!.state;
    expect(again.workOrders).toEqual(out.workOrders);
    fixpoint(out);
  });

  it("Alt-Save ohne Aufträge: Default-Zustand mit Uhren auf den Mittelwerten", () => {
    const s = createGame({ name: "S97b" }, content, 10);
    const out = deserialize(asVersion(s, 96, (st) => { delete (st.workOrders as Record<string, unknown>).tierMs; }), content, AT)!.state;
    expect(out.workOrders).toEqual({ open: [], offer: null, offerMsLeft: 0, tierMs: means, seq: 0, delivered: 0 });
  });
});

describe("SAVE 97: Sanitizing", () => {
  it("Stufe außerhalb 1–3 → 2; Uhr nicht endlich/negativ → Mittelwert, zu groß → Deckel; Angebots-Restzeit je Stufe gedeckelt", () => {
    const s = createGame({ name: "S97c" }, content, 11);
    (s as { workOrders: unknown }).workOrders = {
      open: [legacyOrder(1, { tier: 7 }), legacyOrder(2, { tier: "3", itemId: "tin_ore", actionId: "mine_tin" }), legacyOrder(4, { tier: 1, itemId: "iron_ore", actionId: "mine_iron" })],
      offer: legacyOrder(5, { tier: 1 }),
      offerMsLeft: 20 * MIN,
      tierMs: { 1: -5, 2: Number.NaN, 3: 1e15 },
      seq: 5,
      delivered: 0,
    };
    const out = deserialize(serialize(s, AT), content, AT)!.state.workOrders!;
    expect(out.open.map((o) => o.tier)).toEqual([2, 2, 1]);
    expect(out.offer?.tier).toBe(1);
    expect(out.offerMsLeft).toBe(ORDER_TIERS[1].offerTtlMs);
    expect(out.tierMs).toEqual({ 1: means[1], 2: means[2], 3: workOrderTierClockMax(3) });
    expect(workOrderTierClockMax(3)).toBe(ORDER_TIERS[3].meanIntervalMs * 1.25);
  });

  it("Teilweise Uhren: gültige Werte bleiben (ganzzahlig), fehlende werden Mittelwert; Großauftrags-Angebot behält 25 min", () => {
    const s = createGame({ name: "S97d" }, content, 12);
    (s as { workOrders: unknown }).workOrders = {
      open: [],
      offer: legacyOrder(1, { tier: 3 }),
      offerMsLeft: 25 * MIN,
      tierMs: { 1: 1234.7, 3: 0 },
      seq: 1,
      delivered: 0,
    };
    const out = deserialize(serialize(s, AT), content, AT)!.state.workOrders!;
    expect(out.tierMs).toEqual({ 1: 1234, 2: means[2], 3: 0 });
    expect(out.offer?.tier).toBe(3);
    expect(out.offerMsLeft).toBe(25 * MIN);
  });

  it("Logbuch: Stufe nur am Kundschaft-Eintrag und nur 1–3", () => {
    const s = createGame({ name: "S97e" }, content, 13);
    (s as { skillEvents: unknown }).skillEvents = {
      cooldownMs: 0,
      active: null,
      harvestReady: false,
      trailReady: false,
      log: [
        { seq: 4, id: "customer", skill: "mining", atMs: 40, itemId: "copper_ore", qty: 90, orderTier: 3 },
        { seq: 3, id: "customer", skill: "mining", atMs: 30, itemId: "copper_ore", qty: 20, orderTier: 9 },
        { seq: 2, id: "rich_vein", skill: "mining", atMs: 20, orderTier: 2 },
        { seq: 1, id: "customer", skill: "smithing", atMs: 10, itemId: "copper_bar", qty: 40 },
      ],
      seq: 4,
    };
    const log = deserialize(serialize(s, AT), content, AT)!.state.skillEvents!.log;
    expect(log.map((e) => e.orderTier)).toEqual([3, undefined, undefined, undefined]);
    expect(log[0]).toEqual({ seq: 4, id: "customer", skill: "mining", atMs: 40, itemId: "copper_ore", qty: 90, orderTier: 3 });
  });

  it("Aufträge aller Stufen, Angebot und Uhren über Save/Load sind ein Fixpunkt", () => {
    const s = createGame({ name: "S97f" }, content, 14);
    s.workOrders = {
      open: [
        { ...(legacyOrder(1) as unknown as WorkOrder), tier: 1 },
        { ...(legacyOrder(2, { itemId: "tin_ore", actionId: "mine_tin" }) as unknown as WorkOrder), tier: 3 },
      ],
      offer: { ...(legacyOrder(3, { itemId: "iron_ore", actionId: "mine_iron" }) as unknown as WorkOrder), tier: 2 },
      offerMsLeft: 7 * MIN,
      tierMs: { 1: 0, 2: 123_456, 3: 40_000_000 },
      seq: 3,
      delivered: 2,
    };
    const st = deserialize(serialize(s, AT), content, AT)!.state;
    expect(st.workOrders).toEqual(s.workOrders);
    fixpoint(st);
  });
});
