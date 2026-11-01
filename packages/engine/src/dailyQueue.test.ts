import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, QuestDef, QuestObjectiveType } from "@hearthforge/shared";
import { createGame } from "./state";
import { setActiveAction } from "./actions"; // claude:2026-10-31T13:58:31+01:00 — D1
import { dailyPool } from "./quests";
import { dailyQueuePlan, enqueueAllDailyQuests, enqueueDailyQuest } from "./dailyQueue";

// claude:2026-10-30T19:05:00+01:00 — Tagesaufgaben in die Warteschlange (Spieler-Wunsch 30.10.2026).

const POOL = dailyPool(content);
function daily(type: QuestObjectiveType, pred: (q: QuestDef) => boolean = () => true): QuestDef {
  const q = POOL.find((p) => p.objectives[0]?.type === type && pred(p));
  if (!q) throw new Error(`keine Tagesaufgabe vom Typ ${type}`);
  return q;
}
function withDailies(...quests: QuestDef[]): GameState {
  const s = createGame({ name: "Tag" }, content, 3);
  s.quests.daily = { ...s.quests.daily, day: 20261030, quests: quests.map((q) => ({ questId: q.id, claimed: false })) };
  return s;
}

const KILL_OPEN = daily("kill_monster", (q) => {
  const id = q.objectives[0]!.target!;
  return !content.monsters[id]?.dungeonOnly && !content.monsters[id]?.zone?.startsWith("slayer") && (content.monsters[id]?.level ?? 99) <= 3;
});
const KILL_DUNGEON = daily("kill_monster", (q) => !!content.monsters[q.objectives[0]!.target!]?.dungeonOnly);
const CRAFT_ITEM = daily("craft_items", (q) => q.objectives[0]!.target === "copper_bar");
const GATHER = daily("gather_items");
const KILL_ANY = daily("kill_total");

describe("Tagesaufgaben einreihen", () => {
  it("Monster-Aufgabe wird ein Kampf mit der Restmenge, ein zweiter Klick reiht nichts doppelt ein", () => {
    const s = withDailies(KILL_OPEN);
    const target = KILL_OPEN.objectives[0]!.target!;
    s.monsterKills[target] = 2;
    const plan = enqueueDailyQuest(s, content, KILL_OPEN.id)!;
    expect(plan.ok).toBe(true);
    expect(plan.runs).toBe(KILL_OPEN.objectives[0]!.count - 2);
    expect(s.actionQueue).toEqual([expect.objectContaining({ kind: "fight", monsterId: target, target: plan.runs })]);
    const again = enqueueDailyQuest(s, content, KILL_OPEN.id)!;
    expect(again.ok).toBe(false);
    expect(again.reason).toBe("already_queued");
    expect(s.actionQueue).toHaveLength(1);
  });

  it("Herstellen nimmt das passende Rezept und meldet, wofür das Material reicht", () => {
    const s = withDailies(CRAFT_ITEM);
    const plan = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    expect(plan.ok).toBe(true);
    const action = content.actions[plan.entry!.actionId]!;
    expect(action.loot.some((l) => l.itemId === "copper_bar")).toBe(true);
    expect(typeof plan.materialRuns).toBe("number");
  });

  it("Sammeln nimmt eine freigeschaltete Sammelaktion ohne Zutaten", () => {
    const s = withDailies(GATHER);
    const plan = dailyQueuePlan(s, content, GATHER.id)!;
    expect(plan.ok).toBe(true);
    const action = content.actions[plan.entry!.actionId]!;
    expect(action.inputs ?? []).toHaveLength(0);
    expect((action.levelRequired ?? 1) <= 1).toBe(true);
  });

  it("beliebige Kills gehen an den schwächsten bekämpfbaren Gegner", () => {
    const s = withDailies(KILL_ANY);
    const plan = dailyQueuePlan(s, content, KILL_ANY.id)!;
    expect(plan.ok).toBe(true);
    expect(plan.entry!.kind).toBe("fight");
    expect(content.monsters[plan.entry!.monsterId!]!.dungeonOnly).toBeFalsy();
  });

  it("Dungeon-Gegner ohne Zugang wird nicht eingereiht", () => {
    const s = withDailies(KILL_DUNGEON);
    const plan = dailyQueuePlan(s, content, KILL_DUNGEON.id)!;
    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe("locked");
  });

  it("erfüllte und eingelöste Aufgaben bleiben draußen, alle anderen in Reihenfolge", () => {
    const s = withDailies(KILL_OPEN, GATHER, KILL_ANY);
    s.monsterKills[KILL_OPEN.objectives[0]!.target!] = KILL_OPEN.objectives[0]!.count; // erfüllt
    s.quests.daily.quests[2]!.claimed = true;
    const plans = enqueueAllDailyQuests(s, content);
    expect(plans.map((p) => p.reason ?? "ok")).toEqual(["done", "ok", "claimed"]);
    expect(s.actionQueue).toHaveLength(1);
    expect(s.actionQueue[0]!.kind).toBe("action");
  });

  it("nicht heute gezogene Aufgaben liefern null", () => {
    const s = withDailies(GATHER);
    expect(dailyQueuePlan(s, content, KILL_ANY.id)).toBeNull();
  });
});

describe("Tagesaufgaben einreihen · Zulieferkette", () => {
  it("fehlendes Material wird vorab gesammelt, das Rezept steht am Ende der Kette", () => {
    const s = withDailies(CRAFT_ITEM);
    const plan = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    expect(plan.ok).toBe(true);
    const chain = plan.entries!;
    expect(chain[chain.length - 1]).toEqual(plan.entry);
    // Kupferbarren brauchen Erz: ohne Vorrat steht vor dem Schmelzen mindestens eine Sammelaktion.
    expect(chain.length).toBeGreaterThan(1);
    for (const step of chain.slice(0, -1)) expect(content.actions[step.actionId]!.inputs ?? []).toHaveLength(0);
    enqueueDailyQuest(s, content, CRAFT_ITEM.id);
    expect(s.actionQueue.map((q) => q.actionId)).toEqual(chain.map((c) => c.actionId));
  });

  it("vorhandenes Material wird angerechnet: mit vollem Lager keine Zulieferung", () => {
    const s = withDailies(CRAFT_ITEM);
    const first = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    const craft = content.actions[first.entry!.actionId]!;
    for (const input of craft.inputs ?? []) s.bank[input.itemId] = input.qty * first.runs;
    const plan = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    expect(plan.entries).toEqual([plan.entry]);
  });

  it("nicht beschaffbares Material (z. B. Feldfrucht) meldet no_materials mit dem Gegenstand", () => {
    const farmQuest = POOL.find((q) => q.objectives[0]?.type === "craft_items" && q.objectives[0]?.target === "witherleek_arcane_broth");
    if (!farmQuest) return; // Content ohne diese Tagesaufgabe: nichts zu prüfen
    const s = withDailies(farmQuest);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: 13_034_431 }; // Level 99, damit das Rezept frei ist
    const plan = dailyQueuePlan(s, content, farmQuest.id)!;
    expect(plan.ok).toBe(false);
    expect(plan.reason).toBe("no_materials");
    expect(plan.missingItemId).toBeTruthy();
  });
});

describe("Tagesaufgaben einreihen · Material nur für erfolgreiche Pläne (Review K3)", () => {
  it("ein gescheiterter Plan bindet kein Material", () => {
    const s = withDailies(CRAFT_ITEM);
    const craft = content.actions[dailyQueuePlan(s, content, CRAFT_ITEM.id)!.entry!.actionId]!;
    const reserved = new Map<string, number>();
    // Bereits eingereiht ⇒ already_queued ⇒ darf nichts reservieren.
    s.actionQueue.push({ kind: "action", actionId: craft.id, target: null }); // claude:2026-10-31T13:58:31+01:00 — D1: ∞ deckt jeden Bedarf
    for (const input of craft.inputs ?? []) s.bank[input.itemId] = 50;
    const plan = dailyQueuePlan(s, content, CRAFT_ITEM.id, reserved)!;
    expect(plan.reason).toBe("already_queued");
    expect(reserved.size).toBe(0);
  });
});

// claude:2026-10-31T13:58:31+01:00 — Befund D1: eingereihte Mengen werden angerechnet, nur die Differenz wird nachgereiht.
describe("Tagesaufgaben einreihen · mengengenau (D1)", () => {
  const smelt = Object.values(content.actions).find(
    (a) => (a.inputs?.length ?? 0) > 0 && a.loot.some((l) => l.itemId === "copper_bar" && l.chance >= 1) && (a.levelRequired ?? 1) <= 1,
  )!;
  const queuedRuns = (s: GameState, actionId: string): number =>
    s.actionQueue.filter((q) => q.kind === "action" && q.actionId === actionId).reduce((sum, q) => sum + (q.target ?? Infinity), 0);
  const stockOre = (s: GameState, runs: number): void => {
    for (const input of smelt.inputs ?? []) s.bank[input.itemId] = input.qty * runs;
  };

  it("Teilmenge schon eingereiht: nur die Differenz, danach gedeckt", () => {
    const s = withDailies(CRAFT_ITEM);
    const need = dailyQueuePlan(s, content, CRAFT_ITEM.id)!.runs;
    expect(need).toBeGreaterThan(2);
    stockOre(s, need);
    s.actionQueue.push({ kind: "action", actionId: smelt.id, target: 2 });
    const plan = enqueueDailyQuest(s, content, CRAFT_ITEM.id)!;
    expect(plan.ok).toBe(true);
    expect(plan.queuedBefore).toBe(2);
    expect(plan.runs).toBe(need - 2);
    expect(plan.entries).toEqual([{ kind: "action", actionId: smelt.id, target: need - 2 }]);
    expect(queuedRuns(s, smelt.id)).toBe(need);
    const again = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    expect(again.reason).toBe("already_queued");
    expect(again.queuedBefore).toBe(need);
  });

  it("der Rest der laufenden Aktion zählt mit; läuft sie ∞, ist alles gedeckt", () => {
    const s = withDailies(CRAFT_ITEM);
    const need = dailyQueuePlan(s, content, CRAFT_ITEM.id)!.runs;
    stockOre(s, need);
    setActiveAction(s, content, smelt.id, 3);
    const plan = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    expect(plan.ok).toBe(true);
    expect(plan.runs).toBe(need - 3);
    setActiveAction(s, content, smelt.id, null);
    const endless = dailyQueuePlan(s, content, CRAFT_ITEM.id)!;
    expect(endless.reason).toBe("already_queued");
    expect(endless.queuedBefore).toBe(Infinity);
  });

  it("Kampf: Teil-Kills in der Queue werden angerechnet", () => {
    const s = withDailies(KILL_OPEN);
    const target = KILL_OPEN.objectives[0]!.target!;
    const need = KILL_OPEN.objectives[0]!.count;
    s.actionQueue.push({ kind: "fight", actionId: "", monsterId: target, target: 1 });
    const plan = enqueueDailyQuest(s, content, KILL_OPEN.id)!;
    expect(plan.ok).toBe(true);
    expect(plan.runs).toBe(need - 1);
    expect(s.actionQueue.filter((q) => q.monsterId === target).reduce((n, q) => n + (q.target ?? 0), 0)).toBe(need);
  });

  it("zwei Karten, dieselbe Aktion (Zulieferkette A = Barren als Vorprodukt, B = Barren herstellen): B reiht die Differenz ein", () => {
    // Karte A stellt etwas aus Kupferbarren her (die Barren kommen als Zulieferung), Karte B verlangt 25 Kupferbarren.
    const smith = Object.values(content.actions).find(
      (a) => a.inputs?.length === 1 && a.inputs[0]!.itemId === "copper_bar" && (a.levelRequired ?? 1) <= 1 && a.loot.some((l) => l.chance >= 1),
    )!;
    const product = smith.loot.find((l) => l.chance >= 1)!.itemId;
    const quest = (id: string, target: string, count: number): QuestDef => ({
      id, name: { en: id, de: id }, description: { en: id, de: id }, daily: true,
      objectives: [{ type: "craft_items", target, count }], rewards: {},
    });
    const qA = quest("test_daily_a", product, 3);
    const qB = quest("test_daily_b", "copper_bar", 25);
    const c: ContentDB = { ...content, quests: [...content.quests, qA, qB] };
    const s = withDailies(qA, qB);
    const barsForA = smith.inputs![0]!.qty * 3;
    expect(barsForA).toBeLessThan(25);
    const plans = enqueueAllDailyQuests(s, c);
    expect(plans.map((p) => p.reason ?? "ok")).toEqual(["ok", "ok"]);
    expect(plans[1]!.queuedBefore).toBe(barsForA);
    expect(plans[1]!.runs).toBe(25 - barsForA);
    expect(queuedRuns(s, smelt.id)).toBe(25); // Gesamtbedarf beider Karten: A verbraucht seine Barren, B zählt jeden geschmolzenen
    // Die Zulieferung für B deckt genau die Differenz (Erz für 25 Schmelzvorgänge, nicht 25 + A).
    for (const input of smelt.inputs ?? []) {
      const gather = s.actionQueue.filter((q) => content.actions[q.actionId]?.loot.some((l) => l.itemId === input.itemId && l.chance >= 1));
      const perRun = Math.max(1, content.actions[gather[0]!.actionId]!.loot.find((l) => l.itemId === input.itemId)!.min);
      expect(gather.reduce((n, q) => n + (q.target ?? 0), 0) * perRun).toBeGreaterThanOrEqual(input.qty * 25);
      expect(gather.reduce((n, q) => n + (q.target ?? 0), 0) * perRun).toBeLessThan(input.qty * 25 + perRun * gather.length);
    }
    const again = enqueueAllDailyQuests(s, c);
    expect(again.map((p) => p.reason)).toEqual(["already_queued", "already_queued"]);
  });
});
