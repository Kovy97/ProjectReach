import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ActionDef, ContentDB, GameState, WorkOrderTier } from "@hearthforge/shared";
import {
  EVENT_WEIGHTS,
  ORDER_GOLD_KIND_FACTOR,
  ORDER_GOLD_SELL_FACTOR,
  ORDER_INTERVAL_SPREAD,
  ORDER_MAX_OPEN,
  ORDER_TIERS,
  TAVERN_BANDS,
  TAVERN_GOLD_BY_BAND,
  WORK_ORDER_TIERS,
  defaultWorkOrderTierClocks,
  tavernBandForLevel,
} from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { xpForLevel } from "./leveling";
import { createRng, nextFloat } from "./rng";
import { sellPrice } from "./shop";
import {
  abandonWorkOrder,
  acceptWorkOrder,
  bestEffectiveXpPerMinute,
  declineWorkOrder,
  deliverWorkOrder,
  makeWorkOrderOffer,
  onWorkOrderActionCompleted,
  rollWorkOrderInterval,
  workCrateItemId,
  workOrderCandidates,
  workOrdersOf,
} from "./orders";

/**
 * claude:2026-10-25T17:05:00+01:00 — Gestufte Arbeitsaufträge (1.4.1, Chef 25.10.2026 „Arbeitsaufträge öfter, getiert 1–2–3“;
 * design/1.4.1-auftraege-gestuft.md). Jede Stufe hat eine eigene Uhr in Online-Skilling-Zeit; Lohn, Kiste und Angebots-Laufzeit je Stufe.
 */
const NOW = 1_761_300_000_000;
const MIN = 60_000;
const H = 3_600_000;

function game(level = 50, seed = 21): GameState {
  const s = createTestGame({ name: "T" }, content, seed);
  s.settings.materialsToStorage = false;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(level) };
  return s;
}
const durOf = (s: GameState) => (a: ActionDef): number => effectiveActionDurationMs(s, content, a);
/** Live-Loop wie der Client: kleine Fenster mit echter Uhrzeit. */
function live(s: GameState, ms: number, step = 1_000): void {
  for (let t = 0; t < ms; t += step) advance(s, content, step, { nowMs: NOW + t });
}
const means = defaultWorkOrderTierClocks();

describe("Stufen-Uhren: Takt", () => {
  it("zählen die effektive Dauer abgeschlossener ONLINE-Aktionen, alle drei Stufen gleich", () => {
    const s = game();
    s.skillEvents!.cooldownMs = 1e12; // nur die Auftrags-Uhren beobachten
    setActiveAction(s, content, "mine_copper");
    live(s, 10 * MIN);
    // Fortschritt wächst je Tick um TICK_MS und verliert je Abschluss die effektive Dauer: Summe der Abschlüsse = Laufzeit − Rest.
    const spent = 10 * MIN - s.actionProgressMs;
    expect(spent).toBeGreaterThan(9 * MIN);
    for (const t of WORK_ORDER_TIERS) expect(means[t] - s.workOrders!.tierMs[t], `Stufe ${t}`).toBe(spent);
  });

  it("offline, ohne Uhrzeit (Sim) und bei Diebeskunst stehen die Uhren; offline kein Wurf aus eventRng", () => {
    const off = game();
    setActiveAction(off, content, "mine_copper");
    const rng0 = structuredClone(off.eventRng);
    advance(off, content, 20 * H, { offline: true, nowMs: NOW });
    expect(off.workOrders!.tierMs).toEqual(means);
    expect(off.workOrders!.offer).toBeNull();
    expect(off.eventRng).toEqual(rng0);

    const sim = game();
    setActiveAction(sim, content, "mine_copper");
    advance(sim, content, 2 * H);
    expect(sim.workOrders!.tierMs).toEqual(means);

    const thief = game();
    setActiveAction(thief, content, "pickpocket_beggar");
    live(thief, 10 * MIN);
    expect(thief.stats.actionRunsById.pickpocket_beggar ?? 0).toBeGreaterThan(0);
    expect(thief.workOrders!.tierMs).toEqual(means);
  });

  it("Ereignis-Topf enthält keine Kundschaft mehr (Aufträge kommen nur über die Stufen-Uhren)", () => {
    for (const w of Object.values(EVENT_WEIGHTS)) expect(w.customer).toBeUndefined();
  });
});

describe("Stufen-Uhren: Angebot", () => {
  it("mehrere fällig: höchste Stufe zuerst, die anderen warten auf 0; nach dem Angebot Neuwurf in der Spanne", () => {
    const s = game(45);
    const o = workOrdersOf(s);
    o.tierMs = { 1: 0, 2: 0, 3: 0 };
    const rng = createRng(7);
    const act = content.actions.mine_iron!;
    const tiers: WorkOrderTier[] = [];
    for (let i = 0; i < 3; i++) {
      const offer = onWorkOrderActionCompleted(s, content, act, 3_000, rng, durOf(s));
      expect(offer).not.toBeNull();
      tiers.push(offer!.tier);
      expect(o.offerMsLeft).toBe(ORDER_TIERS[offer!.tier].offerTtlMs);
      const t = offer!.tier;
      expect(o.tierMs[t]).toBeGreaterThanOrEqual(ORDER_TIERS[t].meanIntervalMs * (1 - ORDER_INTERVAL_SPREAD) - 3_000);
      expect(o.tierMs[t]).toBeLessThanOrEqual(ORDER_TIERS[t].meanIntervalMs * (1 + ORDER_INTERVAL_SPREAD));
      // Solange das Angebot liegt, entsteht kein weiteres; die fälligen Stufen bleiben auf 0.
      expect(onWorkOrderActionCompleted(s, content, act, 3_000, rng, durOf(s))).toBeNull();
      declineWorkOrder(s);
    }
    expect(tiers).toEqual([3, 2, 1]);
    expect(onWorkOrderActionCompleted(s, content, act, 3_000, rng, durOf(s))).toBeNull(); // alle Uhren neu gewürfelt
  });

  it("kein Platz (drei offene Aufträge): die Uhr bleibt auf 0 und wartet; nach dem Aufgeben kommt das Angebot sofort", () => {
    const s = game(45);
    for (const [i, id] of ["mine_iron", "cut_normal_tree", "catch_shrimp"].entries()) {
      expect(makeWorkOrderOffer(s, content, content.actions[id]!, createRng(40 + i), durOf(s), 1)).not.toBeNull();
      expect(acceptWorkOrder(s)).toBe(true);
    }
    const o = workOrdersOf(s);
    expect(o.open.length).toBe(ORDER_MAX_OPEN);
    o.tierMs = { 1: 0, 2: 5 * H, 3: 5 * H };
    const rng = createRng(3);
    const before = structuredClone(rng);
    expect(onWorkOrderActionCompleted(s, content, content.actions.mine_iron!, 3_000, rng, durOf(s))).toBeNull();
    expect(o.tierMs[1]).toBe(0);
    expect(o.tierMs[2]).toBe(5 * H - 3_000);
    expect(rng).toEqual(before); // ohne Platz kein Wurf
    expect(abandonWorkOrder(s, o.open[0]!.id)).toBe(true);
    const offer = onWorkOrderActionCompleted(s, content, content.actions.mine_iron!, 3_000, rng, durOf(s));
    expect(offer?.tier).toBe(1);
    expect(offer?.skill).toBe("mining");
  });

  it("kein machbarer Auftrag (leerer Pool): alle fälligen Stufen warten auf 0, bis wieder einer möglich ist", () => {
    // Bergbau auf genau eine Aktion beschränkt und auf deren Erz liegt schon ein offener Auftrag: der Pool ist leer.
    const only: ContentDB = {
      ...content,
      actions: Object.fromEntries(Object.entries(content.actions).filter(([, a]) => a.skill !== "mining" || a.id === "mine_copper")),
    };
    const s = game(20);
    expect(makeWorkOrderOffer(s, only, only.actions.mine_copper!, createRng(1), durOf(s), 2)).not.toBeNull();
    expect(acceptWorkOrder(s)).toBe(true);
    const o = workOrdersOf(s);
    o.tierMs = { 1: 0, 2: 0, 3: 0 };
    const rng = createRng(11);
    expect(onWorkOrderActionCompleted(s, only, only.actions.mine_copper!, 3_000, rng, durOf(s))).toBeNull();
    expect(o.tierMs).toEqual({ 1: 0, 2: 0, 3: 0 });
    expect(o.offer).toBeNull();
    expect(abandonWorkOrder(s, o.open[0]!.id)).toBe(true);
    expect(onWorkOrderActionCompleted(s, only, only.actions.mine_copper!, 3_000, rng, durOf(s))?.tier).toBe(3);
  });

  it("Neuwurf gleichverteilt in [0,75 · Mittel, 1,25 · Mittel], Mittel getroffen", () => {
    for (const t of WORK_ORDER_TIERS) {
      const rng = createRng(99 + t);
      const mean = ORDER_TIERS[t].meanIntervalMs;
      let sum = 0;
      let lo = Infinity;
      let hi = 0;
      const n = 4_000;
      for (let i = 0; i < n; i++) {
        const v = rollWorkOrderInterval(t, rng);
        sum += v;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      expect(lo).toBeGreaterThanOrEqual(mean * 0.75);
      expect(hi).toBeLessThanOrEqual(mean * 1.25);
      expect(lo).toBeLessThan(mean * 0.76); // die Spanne wird ausgeschöpft
      expect(hi).toBeGreaterThan(mean * 1.24);
      expect(Math.abs(sum / n / mean - 1)).toBeLessThan(0.015);
    }
  });
});

describe("Lohn je Stufe", () => {
  it("Menge, Gold, XP, Minuten und Angebots-Laufzeit nach den Stufen-Formeln (Liefern und Herstellen)", () => {
    for (const tier of WORK_ORDER_TIERS) {
      for (const [actionId, seed] of [["mine_iron", 1], ["cut_normal_tree", 2], ["smelt_copper", 3], ["catch_shrimp", 4]] as const) {
        const s = game(50);
        const act = content.actions[actionId]!;
        const def = ORDER_TIERS[tier];
        const o = makeWorkOrderOffer(s, content, act, createRng(seed + 10 * tier), durOf(s), tier);
        expect(o, `${actionId} Stufe ${tier}`).not.toBeNull();
        expect(o!.tier).toBe(tier);
        expect(def.minutes).toContain(o!.minutes);
        expect(s.workOrders!.offerMsLeft).toBe(def.offerTtlMs);
        const cand = workOrderCandidates(s, content, act.skill).find((c) => c.action.id === o!.actionId && c.itemId === o!.itemId)!;
        expect(cand).toBeDefined();
        const count = Math.max(1, Math.round(((o!.minutes * MIN) / Math.max(1, durOf(s)(cand.action))) * cand.perRun));
        expect(o!.count).toBe(count);
        const band = Math.max(1, Math.min(TAVERN_BANDS, tavernBandForLevel(50)));
        expect(o!.band).toBe(band);
        expect(o!.gold).toBe(
          Math.round(ORDER_GOLD_SELL_FACTOR * count * sellPrice(content, o!.itemId) + (TAVERN_GOLD_BY_BAND[band] ?? 0) * ORDER_GOLD_KIND_FACTOR[o!.kind] * def.bandGoldFactor),
        );
        expect(o!.xp).toBe(Math.round(o!.minutes * def.xpFactor * bestEffectiveXpPerMinute(s, content, act.skill, durOf(s))));
      }
    }
  });

  it("Kiste: Stufe 3 immer, Stufe 1 nie; jede Abgabe zieht genau einen Wurf aus dem Strom", () => {
    for (const tier of [1, 2, 3] as const) {
      for (let seed = 1; seed <= 6; seed++) {
        const s = game(20);
        const o = makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(seed), durOf(s), tier)!;
        expect(acceptWorkOrder(s)).toBe(true);
        const order = s.workOrders!.open[0]!;
        // Arbeit erledigt und Bestand da (Zähler je Skill wie tick.ts).
        ((s.stats.producedBySkill ??= {}).mining ??= {})[o.itemId] = order.baseline + order.count;
        s.bank[o.itemId] = order.count;
        const rng = createRng(1000 + seed);
        const expected = createRng(1000 + seed);
        const roll = nextFloat(expected);
        const r = deliverWorkOrder(s, content, order.id, rng);
        expect(r.reason).toBe("ok");
        expect(rng).toEqual(expected); // genau ein Wurf
        if (tier === 3) expect(r.crateItemId).toBe(workCrateItemId(order.band));
        else if (tier === 1) expect(r.crateItemId).toBeNull();
        else expect(r.crateItemId !== null).toBe(roll < ORDER_TIERS[2].crateChance);
      }
    }
  });
});

describe("Determinismus im Live-Loop", () => {
  it("gleicher Seed → gleiche Angebote, gleicher Strom, gleiches Logbuch (mit Stufe); state.rng bleibt wie im Sim-Lauf", () => {
    const run = (): GameState => {
      const s = game(45, 5);
      setActiveAction(s, content, "mine_iron");
      for (let t = 0; t < 3 * H; t += 5_000) {
        advance(s, content, 5_000, { nowMs: NOW + t });
        if (s.workOrders!.offer && s.workOrders!.open.length < ORDER_MAX_OPEN) acceptWorkOrder(s);
      }
      return s;
    };
    const a = run();
    const b = run();
    expect(a.workOrders).toEqual(b.workOrders);
    expect(a.eventRng).toEqual(b.eventRng);
    expect(a.skillEvents).toEqual(b.skillEvents);
    expect(a.workOrders!.seq).toBeGreaterThanOrEqual(3); // ~1 Kleiner Auftrag je 40 min
    const customers = a.skillEvents!.log.filter((e) => e.id === "customer");
    expect(customers.length).toBeGreaterThan(0);
    for (const e of customers) expect([1, 2, 3]).toContain(e.orderTier);
    const sim = game(45, 5);
    setActiveAction(sim, content, "mine_iron");
    advance(sim, content, 3 * H);
    expect(a.rng).toEqual(sim.rng); // Aufträge würfeln nur aus eventRng
  });
});
