import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, WorkOrder } from "@hearthforge/shared";
import { SAVE_VERSION, defaultRaidState, defaultSkillEventState, defaultWorkOrderState } from "@hearthforge/shared";
import { ascend, createGame, startRaid, workOrderProgress, xpForLevel } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * QA 1.4.0 Spielstände (Kontrolleur, 2026-10-23): Aufträge zählen offline, Ereignisse ruhen offline,
 * Aschesturz setzt die neuen Felder richtig, Schrott in allen neuen Feldern gleichzeitig.
 */
const AT = 1_761_700_000_000;
const MIN30 = 30 * 60 * 1000;
type SaveShape = { version: number; savedAt: number; state: GameState };

function findNonFinite(value: unknown, path: string, out: string[]): void {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) out.push(`${path} = ${value}`);
    return;
  }
  if (Array.isArray(value)) value.forEach((v, i) => findNonFinite(v, `${path}[${i}]`, out));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) findNonFinite(v, `${path}.${k}`, out);
}

const copperOrder = (baseline: number): WorkOrder => ({
  id: 1,
  kind: "deliver",
  skill: "mining",
  actionId: "mine_copper",
  itemId: "copper_ore",
  count: 50,
  minutes: 30,
  band: 1,
  gold: 400,
  xp: 900,
  customerId: "grumm",
  baseline,
});

describe("Aufträge und Ereignisse im Offline-Fenster", () => {
  it("angenommener Lieferauftrag zählt offline abgebautes Erz; Fixpunkt danach", () => {
    const s = createGame({ name: "QA-AU" }, content, 31);
    s.skills.mining = { xp: xpForLevel(50) };
    s.activeActionId = "mine_copper";
    s.actionTarget = null;
    s.workOrders = { ...defaultWorkOrderState(), open: [copperOrder(s.stats.producedById?.copper_ore ?? 0)], seq: 1 };
    const res = deserialize(serialize(s, AT), content, AT + MIN30)!;
    const st = res.state;
    expect(res.offlineTicks).toBeGreaterThan(0);
    const p = workOrderProgress(st, st.workOrders!.open[0]!);
    expect(p.done).toBeGreaterThan(0);
    expect(st.workOrders!.open[0]!.baseline).toBe(0);
    const once = serialize(st, AT + MIN30);
    expect(serialize(deserialize(once, content, AT + MIN30)!.state, AT + MIN30)).toBe(once);
  });

  it("laufendes Zähl-Ereignis (Reiche Ader) wird offline weder verbraucht noch verfällt es", () => {
    const s = createGame({ name: "QA-EV" }, content, 32);
    s.skills.mining = { xp: xpForLevel(50) };
    s.activeActionId = "mine_copper";
    s.skillEvents = { ...defaultSkillEventState(), active: { id: "rich_vein", skill: "mining", actionsLeft: 12, msLeft: 300_000 }, seq: 1 };
    s.workOrders = { ...defaultWorkOrderState(), offer: copperOrder(0), offerMsLeft: 600_000, seq: 1 };
    const res = deserialize(serialize(s, AT), content, AT + MIN30)!;
    expect(res.offlineTicks).toBeGreaterThan(0);
    expect(res.state.skillEvents!.active).toEqual({ id: "rich_vein", skill: "mining", actionsLeft: 12, msLeft: 300_000 });
    expect(res.state.skillEvents!.cooldownMs).toBe(600_000);
    // Angebot verfällt nur online: nach 30 min offline steht es noch.
    expect(res.state.workOrders!.offer?.id).toBe(1);
    expect(res.state.workOrders!.offerMsLeft).toBe(600_000);
  });
});

describe("Aschesturz: neue 1.4.0-Felder", () => {
  function ascendable(): GameState {
    const s = createGame({ name: "QA-Asche" }, content, 33);
    for (const id of Object.keys(content.skills).slice(0, 4)) s.skills[id] = { xp: xpForLevel(99) };
    s.quests.claimed.push("chronicle_21");
    return s;
  }

  it("Köcher/Mahlzeit/Lauf/Warteschlange/Wochentruhen/Aufträge/Ereignisse zurück; Zähler, Schlösser, Schalter, Strom bleiben; Fixpunkt", () => {
    const s = ascendable();
    s.character.equipment.mainhand = "copper_shortbow";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 120 };
    s.character.meal = "marshroot_chowder";
    s.character.mealKeep = false;
    s.lockedItems = { copper_shortbow: true, inst_7: true };
    s.settings.raidAutoContinue = true;
    s.settings.raidAutoBuyRestart = true;
    s.settings.quiverAutoRefill = false;
    s.settings.materialsToStorage = false;
    s.raid = {
      ...defaultRaidState(),
      run: {
        raidId: "gobkharaz",
        difficulty: "normal",
        room: 1,
        phase: "rest",
        feePaid: 300_000,
        restarts: 1,
        loot: [{ itemId: "relic_dust", qty: 3 }],
        lastLoot: [],
        bossSeq: 1,
        startedAtMs: 0,
        modifier: "quiet_halls",
        restMs: 0,
      },
      queue: { raidId: "gobkharaz", difficulty: "normal", remaining: 2, completed: 1 },
      clears: { normal: 2, heroic: 1, mythic: 0 },
      bossKills: { "gk_tallymistress:normal": 3 },
      weekly: { week: 42, chests: { "gk_tallymistress:normal": true } },
      fastestMs: { normal: 3_000_000 },
      feesPaid: 900_000,
      lastResult: { seq: 2, difficulty: "normal", outcome: "complete", durationMs: 3_000_000, refund: 0 },
      resultSeq: 2,
    };
    s.workOrders = { ...defaultWorkOrderState(), open: [copperOrder(0)], seq: 1, delivered: 5 };
    s.skillEvents = { ...defaultSkillEventState(), active: { id: "rich_vein", skill: "mining", actionsLeft: 5, msLeft: 100_000 }, seq: 4, harvestReady: true };
    const eventRngBefore = { ...s.eventRng! };

    expect(ascend(s, content)).toBe(true);

    expect(s.character.quiver ?? null).toBeNull();
    expect(s.character.meal ?? null).toBeNull();
    expect(s.character.mealKeep).toBe(false);
    expect(s.lockedItems).toEqual({ copper_shortbow: true, inst_7: true });
    expect(s.settings.raidAutoContinue).toBe(true);
    expect(s.settings.quiverAutoRefill).toBe(false);
    expect(s.settings.materialsToStorage).toBe(false);
    expect(s.raid!.run).toBeNull();
    expect(s.raid!.queue).toBeNull();
    expect(s.raid!.weekly).toEqual({ week: -1, chests: {} });
    expect(s.raid!.clears).toEqual({ normal: 2, heroic: 1, mythic: 0 });
    expect(s.raid!.bossKills).toEqual({ "gk_tallymistress:normal": 3 });
    expect(s.raid!.fastestMs).toEqual({ normal: 3_000_000 });
    expect(s.raid!.feesPaid).toBe(900_000);
    expect(s.raid!.lastResult?.seq).toBe(2);
    expect(s.workOrders).toEqual(defaultWorkOrderState());
    expect(s.skillEvents).toEqual(defaultSkillEventState());
    expect(s.eventRng).toEqual(eventRngBefore);

    const once = serialize(s, AT);
    const back = deserialize(once, content, AT)!.state;
    expect(serialize(back, AT)).toBe(once);
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.character.quiver).toBeNull();
    expect(back.raid!.run).toBeNull();
  });
});

describe("Alles gleichzeitig aktiv: laufender Raid-Kampf, offener Auftrag, Ereignis, geladener Köcher, Mahlzeit", () => {
  it("ist ab dem ersten Load ein Fixpunkt und verliert nichts", () => {
    const s = createGame({ name: "QA-Alles" }, content, 35);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    s.dungeonsCleared.behind_the_throne = 1;
    s.character.gold = 1_000_000;
    s.character.equipment.mainhand = "copper_longbow";
    s.character.equipment.offhand = "copper_quiver";
    s.character.quiver = { itemId: "copper_arrow", qty: 333 };
    s.character.meal = "marshroot_chowder";
    s.workOrders = { ...defaultWorkOrderState(), open: [copperOrder(7)], offer: { ...copperOrder(0), id: 2 }, offerMsLeft: 1234, seq: 2 };
    s.skillEvents = { ...defaultSkillEventState(), active: { id: "thrifty_hand", skill: "smithing", actionsLeft: 9, msLeft: 99_000 }, log: [{ seq: 1, id: "thrifty_hand", skill: "smithing", atMs: 0 }], seq: 1 };
    s.lockedItems = { copper_longbow: true };
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    const once = serialize(deserialize(serialize(s, AT), content, AT)!.state, AT);
    const st = (JSON.parse(once) as SaveShape).state;
    expect(st.raid!.run?.phase).toBe("fight");
    expect(st.combat.dungeonId).toBe("gk_room_1");
    expect(st.character.quiver).toEqual({ itemId: "copper_arrow", qty: 333 });
    expect(st.character.meal).toBe("marshroot_chowder");
    expect(st.workOrders!.open[0]!.baseline).toBe(7);
    expect(st.workOrders!.offerMsLeft).toBe(1234);
    expect(st.skillEvents!.active?.actionsLeft).toBe(9);
    expect(st.lockedItems).toEqual({ copper_longbow: true });
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});

describe("Schrott in allen neuen Feldern gleichzeitig", () => {
  it("lädt ohne Exception, ohne non-finite Werte, und ist nach einem Load ein Fixpunkt", () => {
    const s = createGame({ name: "QA-Schrott" }, content, 34);
    const c = s.character as unknown as Record<string, unknown>;
    c.meal = 5;
    c.mealKeep = "nein";
    c.quiver = "copper_arrow";
    const st = s as unknown as Record<string, unknown>;
    st.lockedItems = ["a", "b"];
    st.eventRng = { state: NaN };
    st.skillEvents = "keine";
    st.workOrders = { open: "x", offer: { kind: "deliver" }, offerMsLeft: -1, seq: Infinity, delivered: -3 };
    st.raid = {
      // Phase „rest“ (nicht „fight“: der Fight-ohne-Kampf-Fall samt hängender Queue steht in qa-saves-raid.test.ts)
      run: { raidId: "gobkharaz", difficulty: "normal", room: -2, phase: "rest", feePaid: NaN, restarts: 1e12, loot: "x", modifier: 7, restMs: -5 },
      clears: null,
      bossKills: ["x"],
      weekly: { week: NaN, chests: ["a"] },
      fastestMs: { normal: Infinity },
      queue: { raidId: "gobkharaz", difficulty: "normal", remaining: 0, completed: -1 },
    };
    const settings = s.settings as unknown as Record<string, unknown>;
    settings.materialsToStorage = "ja";
    settings.quiverAutoRefill = 1;
    settings.raidAutoContinue = null;
    settings.raidAutoBuyRestart = "x";
    s.bank = { copper_ore: 5, rusty_sword: 1, copper_arrow: -4 } as Record<string, number>;
    st.bankOrder = ["copper_ore", "rusty_sword", "rusty_sword", "unbekannt", 42, "copper_arrow"];
    st.actionQueue = [
      { kind: "raid", actionId: "", raidId: "gobkharaz", raidDifficulty: "epic", target: 1 },
      { kind: "raid", actionId: "", raidId: "gobkharaz", raidDifficulty: "mythic", target: -1 },
    ];
    const res = deserialize(serialize(s, AT), content, AT);
    expect(res).not.toBeNull();
    const out = res!.state;
    const bad: string[] = [];
    findNonFinite(out, "state", bad);
    expect(bad).toEqual([]);
    expect(out.character.meal).toBeNull();
    expect(out.character.mealKeep).toBe(true);
    expect(out.character.quiver).toBeNull();
    expect(out.lockedItems).toEqual({});
    expect(Number.isFinite(out.eventRng!.state)).toBe(true);
    expect(out.skillEvents).toEqual(defaultSkillEventState());
    expect(out.workOrders).toEqual(defaultWorkOrderState());
    expect(out.raid!.run).toMatchObject({ raidId: "gobkharaz", difficulty: "normal", room: 0, phase: "rest", feePaid: 0, restarts: 1000, loot: [], modifier: "quiet_halls", restMs: 0 });
    expect(out.raid!.queue).toEqual({ raidId: "gobkharaz", difficulty: "normal", remaining: 1, completed: 0 });
    expect(out.raid!.clears).toEqual({ normal: 0, heroic: 0, mythic: 0 });
    expect(out.raid!.weekly).toEqual({ week: -1, chests: {} });
    expect(out.raid!.fastestMs).toEqual({});
    // copper_ore ist Lagerware (kein Fach), Doppel/Unbekanntes/Nicht-String/0-Bestand werden zu Lücken (gewollt, v87-Verhalten).
    expect(out.bankOrder).toEqual([null, "rusty_sword", null, null, null, null]);
    expect(out.bank.copper_arrow).toBeUndefined();
    expect(out.actionQueue).toEqual([{ kind: "raid", actionId: "", raidId: "gobkharaz", raidDifficulty: "mythic", target: null }]);
    const once = serialize(out, AT);
    expect(serialize(deserialize(once, content, AT)!.state, AT)).toBe(once);
  });
});
