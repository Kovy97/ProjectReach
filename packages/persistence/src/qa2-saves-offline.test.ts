import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { ORDER_OFFER_TTL_MS, defaultRaidState } from "@hearthforge/shared";
import { createGame, selectMeal, setActiveAction, setMealKeep, startCombat, startRaid, startRaidFromQueue, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Runde 2, Spielstände (Kontrolleur, 2026-10-24): Offline-Fortschritt der 1.4-Systeme beim Laden
 * (Raid-Rast/-Tod/-Warteschlange, Mahlzeit halten, Aufträge über den Deckel). `it.fails` = belegter Befund.
 */
const AT = 1_761_500_000_000;
const H1 = 60 * 60 * 1000;
const H8 = 8 * H1;

function raider(gold = 5_000_000): GameState {
  const s = createGame({ name: "QA-Raid" }, content, 11);
  for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
  s.dungeonsCleared.behind_the_throne = 1;
  s.raid = { ...defaultRaidState(), clears: { normal: 1, heroic: 1, mythic: 0 } };
  s.character.gold = gold;
  return s;
}

/** Fixpunkt ab dem zweiten Serialize (der erste nach einem Catch-up trägt transiente Kampffelder). */
function expectFixpoint(s: GameState, at: number): void {
  const once = serialize(deserialize(serialize(s, at), content, at)!.state, at);
  expect(serialize(deserialize(once, content, at)!.state, at)).toBe(once);
}

/** Lauf in die Rast nach Raum 1 versetzen (Kampf beendet, wie nach dem Boss). */
function intoRest(s: GameState): void {
  const run = s.raid!.run!;
  run.phase = "rest";
  run.room = 0;
  run.restMs = 3000;
  s.combat.monsterId = null;
  s.combat.dungeonId = null;
}

describe("Raid: Rast bzw. Tod-Dialog und eine eigene, vom Spieler gestartete Aktion", () => {
  it("Referenz online: in der Rast (Auto-Weiter aus) wartet der Raid, die eigene Aktion läuft", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    intoRest(s);
    setActiveAction(s, content, "mine_copper");
    const res = deserialize(serialize(s, AT), content, AT)!; // 0 Ticks
    expect(res.state.activeActionId).toBe("mine_copper");
    expect(res.state.raid!.run?.phase).toBe("rest");
  });

  // claude:2026-10-24T15:18:33+02:00 — B2 behoben (CEO: offline wie online): der Raid wartet in der Rast, die eigene Aktion läuft weiter.
  it("offline setzt sich der Raid aus der Rast nicht selbst fort, solange die eigene endlose Aktion läuft; sie geht nicht verloren", () => {
    const s = raider();
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    intoRest(s);
    setActiveAction(s, content, "mine_copper");
    const res = deserialize(serialize(s, AT), content, AT + H1)!;
    // SOLL: die vom Spieler gestartete Aktion geht nicht verloren (aktiv oder wieder in der Warteschlange).
    const survived =
      res.state.activeActionId === "mine_copper" ||
      res.state.actionQueue.some((e) => e.kind === "action" && e.actionId === "mine_copper");
    expect(survived).toBe(true);
  });

  it("Heroisch-Tod ohne Auto-Kauf (R3): offline wartet der Dialog, die eigene Aktion läuft derweil weiter, Gold unverändert", () => {
    const s = raider(1_000_000);
    expect(startRaid(s, content, "gobkharaz", "heroic")).toBe("ok");
    const run = s.raid!.run!;
    run.phase = "defeated";
    run.restMs = 3000;
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    setActiveAction(s, content, "mine_copper");
    const gold = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H1)!;
    expect(res.state.raid!.run?.phase).toBe("defeated");
    expect(res.state.character.gold).toBe(gold);
    expect(res.state.activeActionId).toBe("mine_copper");
    expect(res.offline.skillXp.mining?.xp ?? 0).toBeGreaterThan(0);
    expectFixpoint(res.state, AT + H1);
  });

  it("Heroisch aus der Warteschlange: Tod offline beendet Lauf und Warteschlange mit Grund, Gold unverändert, Fixpunkt", () => {
    const s = raider();
    expect(startRaidFromQueue(s, content, "gobkharaz", "heroic", 3)).toBe("ok");
    const gold = s.character.gold;
    const res = deserialize(serialize(s, AT), content, AT + H8)!;
    expect(res.state.raid!.run).toBeNull();
    expect(res.state.raid!.queue).toBeNull();
    expect(res.state.lastQueueSkip?.reason).toBe("dungeon_defeated");
    expect(res.state.lastQueueSkip?.raidId).toBe("gobkharaz");
    expect(res.state.raid!.lastResult?.outcome).toBe("defeated");
    expect(res.state.character.gold).toBe(gold);
    expectFixpoint(res.state, AT + H8);
  });

  it("Abschluss + ∞-Warteschlange ohne Gold für die nächste Gebühr: Warteschlange endet mit raid_gold, kein Minus, Fixpunkt", () => {
    const s = raider(300_000); // genau eine Normal-Gebühr
    expect(startRaidFromQueue(s, content, "gobkharaz", "normal", null)).toBe("ok");
    expect(s.character.gold).toBe(0);
    const run = s.raid!.run!;
    run.phase = "complete";
    run.room = 4;
    run.restMs = 3000;
    s.combat.monsterId = null;
    s.combat.dungeonId = null;
    const res = deserialize(serialize(s, AT), content, AT + H1)!;
    expect(res.state.raid!.run).toBeNull();
    expect(res.state.raid!.queue).toBeNull();
    expect(res.state.raid!.lastResult?.outcome).toBe("complete");
    expect(res.state.lastQueueSkip?.reason).toBe("raid_gold");
    expect(res.state.character.gold).toBe(0);
    expectFixpoint(res.state, AT + H1);
  });
});

describe("Mahlzeit halten offline (Kampf gegen Huhn, Stufe-50-Held)", () => {
  const MEAL = "marshroot_chowder";
  /** Stufe 50 überall: überlebt das Huhn, löst aber keine 99er-Meisterring-Gutschrift beim Laden aus. */
  function eater(): GameState {
    const s = createGame({ name: "QA-Mahl" }, content, 5);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(50) };
    return s;
  }

  it("isst aus der Bank nach, Bestand nie negativ, Eintrag sauber gelöscht, Fixpunkt", () => {
    const s = eater();
    selectMeal(s, content, MEAL);
    s.bank[MEAL] = 3;
    s.bankOrder = [MEAL];
    expect(startCombat(s, content, "chicken")).toBe(true);
    const res = deserialize(serialize(s, AT), content, AT + H1)!;
    expect(res.state.bank[MEAL]).toBeUndefined(); // 3 Portionen à 3 min reichen nicht für 1 h
    expect(Object.values(res.state.bank).every((q) => q > 0)).toBe(true);
    expect(res.state.character.meal).toBe(MEAL);
    expect(res.state.combat.monsterId).toBe("chicken");
    expectFixpoint(res.state, AT + H1);
  });

  it("isst zuerst aus dem Inventar", () => {
    const s = eater();
    selectMeal(s, content, MEAL);
    s.inventory.slots[0] = { itemId: MEAL, qty: 2 };
    s.bank[MEAL] = 1;
    expect(startCombat(s, content, "chicken")).toBe(true);
    const res = deserialize(serialize(s, AT), content, AT + H1)!;
    expect(res.state.inventory.slots.some((sl) => sl?.itemId === MEAL)).toBe(false);
    expect(res.state.bank[MEAL]).toBeUndefined();
  });

  it("„Mahlzeit halten“ aus: nichts wird gegessen", () => {
    const s = eater();
    selectMeal(s, content, MEAL);
    setMealKeep(s, false);
    s.bank[MEAL] = 3;
    expect(startCombat(s, content, "chicken")).toBe(true);
    const res = deserialize(serialize(s, AT), content, AT + H1)!;
    expect(res.state.bank[MEAL]).toBe(3);
    expect(res.state.character.mealKeep).toBe(false);
  });
});

describe("Köcher beim Laden (Ist-Stand, Hinweis an Fernkampf)", () => {
  it("leerer Köcher mit gemerkter Art + 300 Pfeile im Lager + Option an: das Laden füllt nicht nach (online tut es erst der nächste Kit-/Ausrüstungswechsel)", () => {
    const s = createGame({ name: "QA-Köcher" }, content, 17);
    s.skills.ranged = { xp: xpForLevel(99) };
    s.character.equipment.mainhand = "copper_shortbow";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 0 };
    s.bank.copper_arrow = 300;
    const out = deserialize(serialize(s, AT), content, AT)!.state;
    expect(out.settings.quiverAutoRefill).toBe(true);
    expect(out.character.quiver).toEqual({ itemId: "copper_arrow", qty: 0 });
    expect(out.bank.copper_arrow).toBe(300);
  });
});

describe("Aufträge und Angebot über den Offline-Deckel", () => {
  it("24 h weg ⇒ 8 h gutgeschrieben; Lieferauftrag zählt die Offline-Arbeit, das Angebot behält seine Restzeit, Fixpunkt", () => {
    const s = createGame({ name: "QA-Auftrag" }, content, 13);
    const baseline = s.stats.producedById?.copper_ore ?? 0;
    const order: WorkOrder = { id: 1, kind: "deliver", skill: "mining", actionId: "mine_copper", itemId: "copper_ore", count: 500, minutes: 30, band: 1, gold: 1200, xp: 900, customerId: "guild", baseline };
    const offer: WorkOrder = { ...order, id: 2, baseline: 0 };
    s.workOrders = { open: [order], offer, offerMsLeft: ORDER_OFFER_TTL_MS, seq: 2, delivered: 0 };
    setActiveAction(s, content, "mine_copper");
    const res = deserialize(serialize(s, AT), content, AT + 24 * H1)!;
    expect(res.offlineMs).toBe(H8);
    const produced = (res.state.stats.producedById?.copper_ore ?? 0) - baseline;
    expect(produced).toBeGreaterThan(0);
    expect(res.state.workOrders!.open).toHaveLength(1);
    expect(res.state.workOrders!.open[0]!.baseline).toBe(baseline);
    expect(res.state.workOrders!.offer?.id).toBe(2);
    expect(res.state.workOrders!.offerMsLeft).toBe(ORDER_OFFER_TTL_MS);
    expectFixpoint(res.state, AT + 24 * H1);
  });
});
