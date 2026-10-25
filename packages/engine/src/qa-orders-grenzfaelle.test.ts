import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ActionDef, GameState, WorkOrder } from "@hearthforge/shared";
import { ORDER_MAX_OPEN, ORDER_OFFER_TTL_MS, ORDER_TIERS, PRESTIGE_UNLOCK_QUEST_ID, defaultSkillEventState, defaultWorkOrderState } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance, effectiveActionDurationMs } from "./tick";
import { addItem, itemCount, removeItem } from "./inventory";
import { xpForLevel } from "./leveling";
import { createRng } from "./rng";
import { useConsumable } from "./consumable";
import { ascend } from "./prestige";
import {
  abandonWorkOrder,
  acceptWorkOrder,
  bestEffectiveXpPerMinute,
  deliverWorkOrder,
  makeWorkOrderOffer,
  openWorkCrate,
  rollWorkCrateContents,
  workOrderCustomers,
  workOrderKindFor,
  workOrderProgress,
  workOrdersOf,
} from "./orders";

/**
 * QA-Prüfrunde 1.4.0 Welle 3 (Arbeitsaufträge): Grenzfälle (claude:2026-10-25T18:30:00+02:00, Kontrolleur).
 * Tests mit `it.fails` sind BEFUNDE: sie beschreiben das Soll (Spec design/1.4.0-balance-werkstatt.md §4) und
 * schlagen heute fehl; nach dem Fix werden sie rot und sind in einen normalen Test zu wandeln.
 */
const NOW = 1_761_300_000_000;

function game(level: number, seed = 21): GameState {
  const s = createTestGame({ name: "Q" }, content, seed);
  s.settings.materialsToStorage = false;
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(level) };
  return s;
}
const durOf = (s: GameState) => (a: ActionDef): number => effectiveActionDurationMs(s, content, a);
function stock(s: GameState, id: string): number {
  return itemCount(s.inventory, id) + (s.bank[id] ?? 0);
}
function handOrder(s: GameState, o: Partial<WorkOrder> & Pick<WorkOrder, "actionId" | "itemId" | "count">): WorkOrder {
  const w = workOrdersOf(s);
  w.seq += 1;
  const action = content.actions[o.actionId]!;
  const order: WorkOrder = {
    id: w.seq,
    kind: workOrderKindFor(action.skill)!,
    skill: action.skill,
    minutes: 20,
    band: 1,
    gold: 100,
    xp: 1_000,
    customerId: "guild",
    baseline: s.stats.producedById?.[o.itemId] ?? 0,
    ...o,
    tier: o.tier ?? 2, // claude:2026-10-25T17:05:00+01:00 — Pflichtfeld Stufe seit SAVE 97 (1.4.1 gestufte Aufträge); Stufe 2 = 1.4.0-Auftrag
  };
  w.open.push(order);
  return order;
}
/** Genau `n` Durchläufe der aktiven Aktion offline (Mengen-Ziel), ohne Ereignisse. */
function runExactly(s: GameState, actionId: string, n: number): void {
  setActiveAction(s, content, actionId);
  s.actionTarget = n;
  const dur = effectiveActionDurationMs(s, content, content.actions[actionId]!);
  advance(s, content, (n + 2) * dur, { offline: true });
}

describe("Abgabe", () => {
  it("Teile aus Inventar und Bank/Lager zusammen: Inventar zuerst, dann Bank; Rest bleibt liegen", () => {
    const s = game(20);
    const order = handOrder(s, { actionId: "mine_copper", itemId: "copper_ore", count: 30 });
    runExactly(s, "mine_copper", 30);
    expect(workOrderProgress(s, order).ready).toBe(true);
    const total = stock(s, "copper_ore");
    expect(total).toBeGreaterThanOrEqual(30);
    removeItem(s.inventory, "copper_ore", itemCount(s.inventory, "copper_ore"));
    addItem(s.inventory, content, "copper_ore", 10);
    s.bank.copper_ore = total - 10 + 5; // 5 extra in der Bank
    const r = deliverWorkOrder(s, content, order.id, createRng(1));
    expect(r.reason).toBe("ok");
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
    expect(s.bank.copper_ore).toBe(total - 10 + 5 - 20);
    expect(s.workOrders!.open).toEqual([]);
  });

  it("BEFUND P2: Suffix-Einzelstücke zählen als hergestellt, aber nicht als Bestand (Spec §4.3: Einzelstücke nach Rückfrage abgebbar)", () => {
    const s = game(30);
    s.firstSuffixGranted = false; // erste Suffix-Herstellung ist sicher (suffix.ts tryCraftSuffix)
    s.bank.copper_bar = 500;
    const order = handOrder(s, { actionId: "forge_copper_sword", itemId: "copper_sword", count: 5 });
    runExactly(s, "forge_copper_sword", 5);
    const p = workOrderProgress(s, order);
    expect(p.done).toBe(5);
    expect(p.ready).toBe(true);
    expect(s.inventory.instances.filter((i) => i.baseItemId === "copper_sword").length).toBeGreaterThanOrEqual(1);
    // claude:2026-10-26T02:35:00+02:00 — Befund behoben: der abgebbare Bestand zählt ungesperrte Einzelstücke mit.
    expect(p.stock).toBe(5);
    expect(deliverWorkOrder(s, content, order.id, createRng(1)).reason).toBe("ok");
  });

  it("BEFUND P2: zwei offene Aufträge auf dasselbe Item teilen sich dieselbe Arbeit (ein Mal arbeiten, zwei Mal Lohn)", () => {
    const s = game(20);
    s.bank.copper_ore = 100_000; // Bestand ist da, nur die Arbeit soll zählen (Spec §4.3)
    const o1 = handOrder(s, { actionId: "mine_copper", itemId: "copper_ore", count: 40 });
    // claude:2026-10-26T02:35:00+02:00 — Befund behoben: acceptWorkOrder setzt den Startanker hinter den Restbedarf offener Aufträge aufs selbe Item.
    const w = workOrdersOf(s);
    w.seq += 1;
    w.offer = { ...o1, id: w.seq };
    expect(acceptWorkOrder(s)).toBe(true);
    const o2 = w.open[1]!;
    runExactly(s, "mine_copper", 40);
    expect(workOrderProgress(s, o1).ready).toBe(true);
    expect(workOrderProgress(s, o2).ready).toBe(false);
    runExactly(s, "mine_copper", 40);
    expect(workOrderProgress(s, o2).ready).toBe(true);
  });

  it("Aufgeben zahlt nichts; ein Auftrag auf ein nicht mehr herstellbares Ziel bleibt harmlos", () => {
    const s = game(10);
    const order = handOrder(s, { actionId: "smelt_copper", itemId: "copper_bar", count: 50 });
    const gold = s.character.gold;
    const xp = s.skills.smithing!.xp;
    expect(deliverWorkOrder(s, content, order.id, createRng(1)).reason).toBe("not_ready");
    expect(abandonWorkOrder(s, order.id)).toBe(true);
    expect(abandonWorkOrder(s, order.id)).toBe(false);
    expect(s.character.gold).toBe(gold);
    expect(s.skills.smithing!.xp).toBe(xp);
    expect(s.workOrders!.open).toEqual([]);
  });
});

describe("Angebot", () => {
  it("verfällt nur online: ein Offline-Fenster von 30 min lässt die 15-min-Uhr stehen", () => {
    const s = game(20);
    expect(makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(3), durOf(s))).not.toBeNull();
    setActiveAction(s, content, "mine_copper");
    advance(s, content, 30 * 60_000, { offline: true, nowMs: NOW });
    expect(s.workOrders!.offer).not.toBeNull();
    expect(s.workOrders!.offerMsLeft).toBe(ORDER_OFFER_TTL_MS);
    for (let t = 0; t < ORDER_OFFER_TTL_MS; t += 1_000) advance(s, content, 1_000, { nowMs: NOW + t });
    expect(s.workOrders!.offer).toBeNull();
  });

  it("drei offene Aufträge: im Live-Loop entsteht kein viertes Angebot, Kundschaft fällt aus dem Topf, andere Ereignisse laufen", () => {
    const s = game(45);
    for (let i = 0; i < ORDER_MAX_OPEN; i++) {
      expect(makeWorkOrderOffer(s, content, content.actions.mine_iron!, createRng(30 + i), durOf(s))).not.toBeNull();
      expect(acceptWorkOrder(s)).toBe(true);
    }
    setActiveAction(s, content, "mine_iron");
    for (let t = 0; t < 20 * 3_600_000; t += 10_000) {
      advance(s, content, 10_000, { nowMs: NOW + t });
      if (s.skillEvents!.active) s.skillEvents!.active = null; // nur Würfe zählen
    }
    expect(s.skillEvents!.seq).toBeGreaterThan(10);
    expect(s.workOrders!.offer).toBeNull();
    expect(s.skillEvents!.log.some((e) => e.id === "customer")).toBe(false);
    expect(s.workOrders!.open.length).toBe(ORDER_MAX_OPEN);
  });

  it("Angebot zur ausgelösten Aktion: Menge, Lohn und XP-Batzen in Spec-Spannen; Kandidat ist erreichbar", () => {
    for (const [actionId, seed] of [["cut_normal_tree", 1], ["catch_shrimp", 2], ["forage_ashfields", 3], ["smelt_copper", 4]] as const) {
      const s = game(50);
      const act = content.actions[actionId]!;
      const o = makeWorkOrderOffer(s, content, act, createRng(seed), durOf(s));
      expect(o, actionId).not.toBeNull();
      expect(o!.skill).toBe(act.skill);
      expect(content.actions[o!.actionId]!.levelRequired ?? 1).toBeLessThanOrEqual(50);
      expect(o!.count).toBeGreaterThanOrEqual(1);
      // claude:2026-10-25T17:05:00+01:00 — XP-Faktor je Stufe statt fest 1,5 (Chef 25.10.2026, gestufte Aufträge); ohne Angabe Stufe 2 = 1,0.
      expect(o!.tier).toBe(2);
      expect(o!.xp).toBeCloseTo(Math.round(o!.minutes * ORDER_TIERS[2].xpFactor * bestEffectiveXpPerMinute(s, content, act.skill, durOf(s))), 0);
      expect(o!.band).toBe(3);
    }
  });
});

describe("Aschesturz", () => {
  it("mit offenen Aufträgen, Angebot und laufendem Ereignis: alles zurückgesetzt, Ereignis-Strom bleibt", () => {
    const s = createGame({ name: "Asche", portrait: "char_3", baseAttributes: { str: 4 } }, content, 7);
    const skills = Object.keys(content.skills);
    for (const id of skills.slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    for (const id of [PRESTIGE_UNLOCK_QUEST_ID, "chronicle_22", "chronicle_23", "chronicle_05"]) if (!s.quests.claimed.includes(id)) s.quests.claimed.push(id);
    s.quests.completed.push("chronicle_24");
    handOrder(s, { actionId: "mine_copper", itemId: "copper_ore", count: 30 });
    handOrder(s, { actionId: "smelt_copper", itemId: "copper_bar", count: 30 });
    expect(makeWorkOrderOffer(s, content, content.actions.mine_copper!, createRng(5), durOf(s))).not.toBeNull();
    s.skillEvents!.active = { id: "rich_vein", skill: "mining", actionsLeft: 12, msLeft: 400_000 };
    s.skillEvents!.harvestReady = true;
    s.skillEvents!.cooldownMs = 0;
    s.eventRng = createRng(123_456);
    expect(ascend(s, content)).toBe(true);
    expect(s.workOrders).toEqual(defaultWorkOrderState());
    expect(s.skillEvents).toEqual(defaultSkillEventState());
    expect(s.eventRng).toEqual(createRng(123_456));
  });
});

describe("Werkstattkiste", () => {
  it("I–V liefern je drei Band-Materialien (keine Ausrüstung); das Runen-Tier des Bands existiert im Content", () => {
    const runeTierByBand = [0, 1, 2, 3, 3, 4];
    for (let band = 1; band <= 5; band++) {
      const s = game(20 * band);
      const items = rollWorkCrateContents(s, content, band);
      const mats = items.filter((i) => content.items[i.id]?.type === "material" && !content.items[i.id]?.rune);
      expect(mats.length, `Band ${band}`).toBe(3);
      for (const i of items) expect(content.items[i.id]?.type, i.id).not.toBe("equipment");
      for (const i of mats) {
        expect(i.qty).toBeGreaterThanOrEqual(3);
        expect(i.qty).toBeLessThanOrEqual(8);
      }
      const runes = Object.values(content.items).filter((it) => it.rune?.tier === runeTierByBand[band]);
      expect(runes.length, `Runen-Tier ${runeTierByBand[band]}`).toBeGreaterThan(0);
    }
  });

  it("ohne Platz: Inventar voll, Auto-Bank aus → Inhalt landet im Postfach, nichts geht verloren, Kiste verbraucht", () => {
    const s = game(50);
    s.settings.autoBank = false;
    s.inventory.slots = s.inventory.slots.map(() => ({ itemId: "copper_sword", qty: 1 }));
    s.bank.work_crate_iii = 1;
    const expected = rollWorkCrateContents(s, content, 3);
    const res = openWorkCrate(s, content, "work_crate_iii");
    expect(res).not.toBeNull();
    expect(res!.items).toEqual(expected);
    expect(s.bank.work_crate_iii).toBeUndefined();
    const mail = (s.mailbox ?? []).filter((m) => m.kind === "overflow");
    const inMail = new Map<string, number>();
    for (const m of mail) for (const it of m.items) inMail.set(it.itemId, (inMail.get(it.itemId) ?? 0) + it.qty);
    for (const it of expected) {
      expect((inMail.get(it.id) ?? 0) + stock(s, it.id), it.id).toBe(it.qty);
    }
  });

  it("BEFUND P3: Kiste liegt nur in der Bank: openWorkCrate kann sie öffnen, der Knopf „Benutzen“ (useConsumable) nicht", () => {
    const s = game(50);
    s.bank.work_crate_ii = 1;
    expect(itemCount(s.inventory, "work_crate_ii")).toBe(0);
    // Soll laut Kommentar in orders.ts/consumable.ts („Inventar zuerst, sonst Lager“). Ist: consumeInternal verlangt Inventar.
    expect(useConsumable(s, content, "work_crate_ii")).toBe(true);
  });
});

describe("Texte", () => {
  it("Kundenzeilen aller Auftraggeber (tavernTasks.line bzw. produceLine/deliverLine) liegen in allen 7 Sprachen vor (Content-Overlay)", () => {
    const langs = ["en", "de", "es", "fr", "pt-BR", "ru", "zh"] as const;
    const missing: string[] = [];
    for (const skill of Object.keys(content.skills)) {
      const kind = workOrderKindFor(skill);
      if (!kind) continue;
      for (const id of workOrderCustomers(content, skill)) {
        const guest = (content.tavernGuests ?? []).find((g) => g.id === id);
        let line: Record<string, string | undefined> | string | undefined;
        if (guest) {
          const tpl = (content.tavernTasks ?? []).find((t) => t.guestId === id && t.kind === kind)
            ?? (content.tavernTasks ?? []).find((t) => t.guestId === id && (t.kind === "produce" || t.kind === "deliver"));
          line = tpl?.line as never;
        } else {
          const c = (content.orderCustomers ?? []).find((g) => g.id === id);
          line = (kind === "produce" ? c?.produceLine : c?.deliverLine) as never;
        }
        if (!line) {
          missing.push(`${id}: keine Zeile`);
          continue;
        }
        const gaps = langs.filter((l) => typeof line === "object" && !line[l]);
        if (gaps.length > 0) missing.push(`${id} (${kind}): ${gaps.join(",")}`);
      }
    }
    console.log("Kundenzeilen ohne Übersetzung:", missing.length, "\n" + missing.join("\n"));
    expect(missing).toEqual([]);
  });

  it("XP-Batzen: Gewinner-Aktion je Skill (Protokoll für die Prüfrunde)", () => {
    const s = game(99);
    const rows: string[] = [];
    for (const skill of Object.keys(content.skills)) {
      if (!workOrderKindFor(skill)) continue;
      let best: { id: string; rate: number } = { id: "-", rate: 0 };
      for (const a of Object.values(content.actions)) {
        if (a.skill !== skill || !(a.durationMs > 0)) continue;
        const rate = (a.xp / Math.max(1, durOf(s)(a))) * 60_000;
        if (rate > best.rate) best = { id: a.id, rate };
      }
      expect(bestEffectiveXpPerMinute(s, content, skill, durOf(s))).toBeCloseTo(best.rate, 6);
      rows.push(`${skill}: ${best.id} (${Math.round(best.rate)} XP/min)`);
    }
    console.log(rows.join("\n"));
  });
});
