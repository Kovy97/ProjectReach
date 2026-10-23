import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ActionDef, GameState } from "@hearthforge/shared";
import { ORDER_MAX_OPEN, ORDER_OFFER_TTL_MS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel, levelFromXp } from "./leveling";
import { sellPrice } from "./shop";
import { createRng } from "./rng";
import {
  acceptWorkOrder,
  deliverWorkOrder,
  makeWorkOrderOffer,
  openWorkCrate,
  rollWorkCrateContents,
  tickWorkOrders,
  workOrderCandidates,
  workOrderProgress,
  workOrdersFull,
} from "./orders";

/**
 * Arbeitsaufträge (1.4.0 „Feder und Stahl“ Welle 3 AU; claude:2026-10-25T00:20:00+02:00). Chef 23.10.: Aufträge
 * kommen als Ereignis beim Arbeiten, Teile werden abgegeben, kein Zeitlimit, höchstens drei offen, XP 1,5-fach.
 */
function game(level: number): GameState {
  const s = createTestGame({ name: "A" }, content, 21);
  s.settings.materialsToStorage = false;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(level) };
  return s;
}
const durOf = (s: GameState) => (a: ActionDef): number => effectiveActionDurationMs(s, content, a);

describe("Erzeugung", () => {
  it("nur erreichbare Stufen, Tier-Boden Level − 25, höchste Stufe dreifach", () => {
    const s = game(40);
    const c = workOrderCandidates(s, content, "mining");
    expect(c.length).toBeGreaterThan(0);
    for (const x of c) {
      expect(x.action.levelRequired ?? 1).toBeLessThanOrEqual(40);
      expect(x.action.levelRequired ?? 1).toBeGreaterThanOrEqual(15);
      expect(x.action.inputs?.length ?? 0).toBe(0);
    }
    const top = Math.max(...c.map((x) => x.action.levelRequired ?? 1));
    for (const x of c) expect(x.weight).toBe((x.action.levelRequired ?? 1) === top ? 3 : 1);
    expect(workOrderCandidates(s, content, "thieving")).toEqual([]);
  });

  it("Herstellaufträge nur, wenn die Zutaten erreichbar sind; Menge und Lohn nach Spec", () => {
    const s = game(30);
    const offer = makeWorkOrderOffer(s, content, content.actions.smelt_copper!, createRng(5), durOf(s))!;
    expect(offer.kind).toBe("produce");
    expect(content.actions[offer.actionId]!.skill).toBe("smithing");
    expect(offer.minutes).toBeGreaterThanOrEqual(20);
    expect(offer.minutes).toBeLessThanOrEqual(40);
    expect(offer.gold).toBeGreaterThan(Math.round(1.2 * offer.count * sellPrice(content, offer.itemId)));
    expect(offer.xp).toBeGreaterThan(0);
    expect(s.workOrders!.offer).toEqual(offer);
    expect(workOrdersFull(s)).toBe(true); // ein Angebot liegt vor
  });

  it("Angebot verfällt nach 15 min Online-Zeit", () => {
    const s = game(20);
    makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(3), durOf(s));
    tickWorkOrders(s, ORDER_OFFER_TTL_MS - 1);
    expect(s.workOrders!.offer).not.toBeNull();
    tickWorkOrders(s, 1);
    expect(s.workOrders!.offer).toBeNull();
  });
});

describe("Fortschritt und Abgabe", () => {
  it("Fortschritt zählt nur Arbeit ab der Annahme, nie den Bestand; Abgabe zahlt Gold und XP", () => {
    const s = game(20);
    s.bank.copper_ore = 50_000; // voller Bestand erfüllt keinen Lieferauftrag
    const offer = makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(9), durOf(s))!;
    expect(acceptWorkOrder(s)).toBe(true);
    const order = s.workOrders!.open[0]!;
    expect(workOrderProgress(s, order).done).toBe(0);
    expect(deliverWorkOrder(s, content, order.id, createRng(1)).reason).toBe("not_ready");

    setActiveAction(s, content, offer.actionId);
    advance(s, content, offer.count * effectiveActionDurationMs(s, content, content.actions[offer.actionId]!) * 1.6, { offline: true });
    expect(workOrderProgress(s, order).ready).toBe(true); // offline erledigte Arbeit zählt
    const gold = s.character.gold;
    const xp = s.skills[offer.skill]!.xp;
    const stock = itemCount(s.inventory, offer.itemId) + (s.bank[offer.itemId] ?? 0);
    const res = deliverWorkOrder(s, content, order.id, createRng(1));
    expect(res.reason).toBe("ok");
    expect(s.character.gold - gold).toBe(res.gold);
    expect(res.gold).toBeGreaterThanOrEqual(offer.gold);
    expect(s.skills[offer.skill]!.xp - xp).toBeCloseTo(res.xp, 0);
    expect(itemCount(s.inventory, offer.itemId) + (s.bank[offer.itemId] ?? 0)).toBe(stock - offer.count);
    expect(s.workOrders!.open).toEqual([]);
    expect(s.workOrders!.delivered).toBe(1);
  });

  it("höchstens drei offene Aufträge", () => {
    const s = game(20);
    for (let i = 0; i < ORDER_MAX_OPEN; i++) {
      expect(makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(10 + i), durOf(s))).not.toBeNull();
      expect(acceptWorkOrder(s)).toBe(true);
    }
    expect(workOrdersFull(s)).toBe(true);
    expect(makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(99), durOf(s))).toBeNull();
  });

  it("Werkstattkiste: drei Band-Materialien, keine Ausrüstung; Öffnen verbraucht sie", () => {
    const s = game(50);
    const items = rollWorkCrateContents(s, content, 3);
    expect(items.filter((i) => content.items[i.id]?.type === "material").length).toBeGreaterThanOrEqual(3);
    for (const i of items) expect(content.items[i.id]?.type).not.toBe("equipment");
    s.bank.work_crate_iii = 1;
    expect(openWorkCrate(s, content, "work_crate_iii")).not.toBeNull();
    expect(s.bank.work_crate_iii).toBeUndefined();
  });
});

describe("Kundschaft im Live-Loop", () => {
  it("ein Angebot entsteht nur online, gehört zum Skill der Arbeit und ist machbar", () => {
    const s = game(45);
    setActiveAction(s, content, "mine_iron");
    for (let t = 0; t < 40 * 3_600_000 && !s.workOrders!.offer; t += 10_000) {
      advance(s, content, 10_000, { nowMs: 1_761_300_000_000 + t });
      if (s.skillEvents!.active) s.skillEvents!.active = null; // nur Würfe zählen
    }
    const offer = s.workOrders!.offer;
    expect(offer).not.toBeNull();
    expect(offer!.skill).toBe("mining");
    expect(content.actions[offer!.actionId]!.levelRequired ?? 1).toBeLessThanOrEqual(levelFromXp(s.skills.mining!.xp));
  });
});
