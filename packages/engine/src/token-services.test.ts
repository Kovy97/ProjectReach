// claude:2026-10-30T22:28:00+01:00 — Belohnungsladen 1.4.2 (Chef-Entscheide L1–L10 vom 30.10.2026, design/1.4.2-belohnungsladen-plan.md § 7):
// Dienste mit Sofortwirkung, Kaufbuch-Grenzen (Tag/Woche, Uhr zurück), Rückbuchung, Gates, Würfeln (Determinismus, Baseline,
// Warteschlange), Auftrag rufen, Lehrstunde, Meisterlehre, Begleiter-Fährte, Gebührenschein (Angebot, startRaid, Warteschlange).
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, DungeonDef, GameState, RaidDef, TokenServiceDef } from "@hearthforge/shared";
import {
  MASTERY_MAX_LEVEL,
  actionSuccessChance, // claude:2026-10-31T13:58:31+01:00 — A2/B2
  RAID_FEE_WRIT_ITEM_ID,
  calendarWeekIndex,
  defaultTokenShopLedger,
  makeRaidQueueEntry,
  rollTokenShopLedger,
  tokenShopLedgerUsage,
} from "@hearthforge/shared";
import { createGame } from "./state";
import { createTestGame } from "./test-helpers";
import { addItem, itemCount } from "./inventory";
import { levelFromXp, xpForLevel } from "./leveling";
import { advanceActionQueue, setActiveAction } from "./actions"; // claude:2026-10-31T13:58:31+01:00 — + setActiveAction (A2/B2)
import { advance, effectiveActionDurationMs } from "./tick"; // claude:2026-10-31T13:58:31+01:00 — + advance (A2/B2)
import { createRng } from "./rng";
import { bestEffectiveXpPerMinute, onWorkOrderActionCompleted } from "./orders";
import { petPityProgress } from "./pets";
import { PRESTIGE_STATE_FIELDS } from "./prestige";
import { consumeFailReason, useConsumable } from "./consumable";
import { dailyQueuePlan } from "./dailyQueue";
import {
  buyTokenShopOffer,
  dailyRerollCandidates,
  dailyRerolledToday,
  questObjectiveProgress,
  refreshDailyQuests,
  tokenShopOfferStatus,
} from "./quests";
import {
  buyTokenService,
  skillLessonXp,
  tokenServiceDefs,
  tokenServicePreview,
  tokenServiceStatus,
  tokenServiceTargets,
} from "./token-services";
import { onRaidRoomCleared, raidFeeWithWrit, raidFeeWritCount, raidWeekIndex, startRaid, startRaidFromQueue, tickRaid } from "./raid";

const MON = 20261102; // Montag
const SUN = 20261108; // Sonntag derselben Woche
const NEXT_MON = 20261109;

function game(tokens = 200, day = MON): GameState {
  const s = createGame({ name: "Laden" }, content, 7);
  s.character.questTokens = tokens;
  refreshDailyQuests(s, content, day);
  return s;
}

function quest(id: string) {
  return content.quests.find((q) => q.id === id)!;
}

describe("Content: Dienste und Angebote (Plan § 4.1, Chef-Entscheide § 7)", () => {
  it("genau die sechs Dienste ohne Lagerschein (L8), Preise ≤ 20, Gates und Grenzen wie beschlossen", () => {
    const defs = tokenServiceDefs(content);
    expect(defs.map((d) => d.id)).toEqual([
      "svc_daily_reroll",
      "svc_order_call_2",
      "svc_skill_lesson",
      "svc_mastery_lesson",
      "svc_order_call_3",
      "svc_pet_trail",
    ]);
    const by = (id: string): TokenServiceDef => defs.find((d) => d.id === id)!;
    expect(by("svc_daily_reroll")).toMatchObject({ kind: "dailyReroll", tokenCostSteps: [2, 3, 4], limitPerDay: 3 });
    expect(by("svc_order_call_2")).toMatchObject({ kind: "orderCall", tier: 2, tokenCost: 4, limitPerDay: 2 });
    expect(by("svc_skill_lesson")).toMatchObject({ kind: "skillLesson", minutes: 30, tokenCost: 6, limitPerWeek: 7 });
    expect(by("svc_skill_lesson").skills).toEqual(["woodcutting", "mining", "fishing", "foraging", "thieving"]); // L3
    expect(by("svc_mastery_lesson")).toMatchObject({ kind: "masteryLesson", minutes: 60, tokenCost: 4, limitPerWeek: 7, shelfId: "shelf_ashfields" });
    expect(by("svc_order_call_3")).toMatchObject({ kind: "orderCall", tier: 3, tokenCost: 12, limitPerWeek: 2, shelfId: "shelf_crypt" });
    expect(by("svc_pet_trail")).toMatchObject({ kind: "petTrail", pct: 0.05, tokenCost: 15, limitPerWeek: 1, requiresTalentEffect: "petPity" }); // L5
    for (const d of defs) {
      for (const p of [d.tokenCost, ...(d.tokenCostSteps ?? [])]) expect(p).toBeLessThanOrEqual(20);
      expect(typeof d.name === "object" && d.name.en && d.name.de).toBeTruthy();
      expect(typeof d.description === "object" && d.description.en && d.description.de).toBeTruthy();
      if (d.shelfId) expect(content.tokenShopShelves!.some((s) => s.id === d.shelfId)).toBe(true);
    }
    const offerIds = new Set((content.tokenShop ?? []).map((o) => o.id));
    for (const d of defs) expect(offerIds.has(d.id)).toBe(false);
  });

  it("Slayer-Marke im offenen Regal (L9), Gebührenschein im zweiten Band mit 1/Woche (L4)", () => {
    expect(content.tokenShop!.find((o) => o.id === "ts_task_token_1")).toMatchObject({ shelfId: "shelf_open", tokenCost: 3 });
    expect(content.tokenShop!.find((o) => o.id === "ts_raid_writ_1")).toMatchObject({
      itemId: RAID_FEE_WRIT_ITEM_ID,
      qty: 1,
      tokenCost: 20,
      shelfId: "shelf_second_volume",
      limitPerWeek: 1,
    });
    expect(content.items[RAID_FEE_WRIT_ITEM_ID]).toMatchObject({ type: "consumable", stackable: true, consumable: { kind: "raidFeeWrit" } });
  });
});

describe("Kaufbuch: Tag/Woche nur aus dem Daily-Stempel", () => {
  it("Wochen beginnen montags, mit denselben Grenzen wie die Raid-Woche", () => {
    expect(calendarWeekIndex(SUN)).toBe(calendarWeekIndex(MON));
    expect(calendarWeekIndex(NEXT_MON)).toBe(calendarWeekIndex(MON) + 1);
    expect(calendarWeekIndex(20261231) + 1).toBe(calendarWeekIndex(20270104)); // über den Jahreswechsel (Do → Mo)
    expect(calendarWeekIndex(20240229)).toBe(calendarWeekIndex(20240226)); // Schaltjahr
    const raidOffset = raidWeekIndex(new Date(2026, 10, 2, 12).getTime()) - calendarWeekIndex(MON);
    for (const [y, m, d] of [[2026, 0, 5], [2026, 6, 19], [2026, 6, 20], [2027, 2, 1], [2028, 1, 29]] as const) {
      const stamp = y * 10000 + (m + 1) * 100 + d;
      expect(raidWeekIndex(new Date(y, m, d, 12).getTime()) - calendarWeekIndex(stamp)).toBe(raidOffset);
    }
    expect(calendarWeekIndex(0)).toBe(0);
  });

  it("Topf rückt nur vorwärts; ein früherer Tag (Uhr zurück) leert nichts", () => {
    const l = defaultTokenShopLedger();
    rollTokenShopLedger(l, NEXT_MON);
    l.byDay.x = 2;
    l.byWeek.x = 5;
    rollTokenShopLedger(l, SUN);
    expect(l).toMatchObject({ day: NEXT_MON, byDay: { x: 2 }, byWeek: { x: 5 } });
    expect(tokenShopLedgerUsage(l, "x", SUN)).toEqual({ day: 2, week: 5 });
    expect(tokenShopLedgerUsage(l, "x", 20261110)).toEqual({ day: 0, week: 5 });
    expect(tokenShopLedgerUsage(l, "x", 20261116)).toEqual({ day: 0, week: 0 });
  });
});

describe("buyTokenService: Gründe, Grenzen, Rückbuchung", () => {
  it("not_found, not_enough_tokens und Vorschau ändern nichts", () => {
    const s = game(3);
    const before = JSON.stringify(s);
    expect(buyTokenService(s, content, "svc_nope").reason).toBe("not_found");
    expect(buyTokenService(s, content, "svc_order_call_2").reason).toBe("not_enough_tokens");
    expect(tokenServicePreview(s, content, "svc_skill_lesson", "woodcutting").reason).toBe("not_enough_tokens");
    expect(JSON.stringify(s)).toBe(before);
  });

  it("Kapitel-Gate: Meisterlehre ab Kapitel 4, Großauftrag ab Kapitel 9 (Status nennt die Gate-Quest)", () => {
    const s = game();
    const st = tokenServiceStatus(s, content, "svc_mastery_lesson");
    expect(st).toMatchObject({ locked: true, reason: "locked", lock: { kind: "shelf", shelfId: "shelf_ashfields", questId: "chronicle_04" } });
    expect(buyTokenService(s, content, "svc_mastery_lesson", "cut_normal_tree").reason).toBe("locked");
    expect(tokenServiceStatus(s, content, "svc_order_call_3").lock).toMatchObject({ kind: "shelf", questId: "chronicle_09" });
    s.quests.claimed.push("chronicle_09");
    expect(buyTokenService(s, content, "svc_order_call_3")).toMatchObject({ ok: true, price: 12 });
    expect(s.workOrders!.tierMs![3]).toBe(0);
  });

  it("Tagesgrenze: Auftrag rufen 2/Tag, am nächsten Tag wieder frei", () => {
    const s = game();
    expect(buyTokenService(s, content, "svc_order_call_2")).toMatchObject({ ok: true, price: 4 });
    expect(s.workOrders!.tierMs![2]).toBe(0);
    expect(buyTokenService(s, content, "svc_order_call_2").reason).toBe("no_effect"); // Uhr steht schon auf 0, nichts gebucht
    expect(s.character.questTokens).toBe(196);
    s.workOrders!.tierMs![2] = 5_000;
    expect(buyTokenService(s, content, "svc_order_call_2").ok).toBe(true);
    s.workOrders!.tierMs![2] = 5_000;
    expect(buyTokenService(s, content, "svc_order_call_2").reason).toBe("limit");
    expect(tokenServiceStatus(s, content, "svc_order_call_2")).toMatchObject({ usedToday: 2, remainingToday: 0, remaining: 0, reason: "limit" });
    expect(s.character.questTokens).toBe(192);
    refreshDailyQuests(s, content, 20261103);
    expect(tokenServiceStatus(s, content, "svc_order_call_2")).toMatchObject({ usedToday: 0, remaining: 2 });
    expect(buyTokenService(s, content, "svc_order_call_2").ok).toBe(true);
  });

  it("Wochengrenze und Uhr rückwärts: Lehrstunde 7/Woche, Sonntag noch gesperrt, Montag frei, Rückstellen bringt nichts", () => {
    const s = game(500);
    for (let i = 0; i < 7; i++) expect(buyTokenService(s, content, "svc_skill_lesson", "woodcutting").ok).toBe(true);
    expect(buyTokenService(s, content, "svc_skill_lesson", "woodcutting").reason).toBe("limit");
    refreshDailyQuests(s, content, SUN);
    expect(tokenServiceStatus(s, content, "svc_skill_lesson")).toMatchObject({ usedThisWeek: 7, remainingWeek: 0, reason: "limit" });
    refreshDailyQuests(s, content, NEXT_MON);
    expect(tokenServiceStatus(s, content, "svc_skill_lesson")).toMatchObject({ usedThisWeek: 0, remainingWeek: 7 });
    for (let i = 0; i < 7; i++) expect(buyTokenService(s, content, "svc_skill_lesson", "mining").ok).toBe(true);
    // Uhr zurück: refreshDailyQuests weist den früheren Tag ab, `lastDailyDay` und damit das Kaufbuch bleiben stehen.
    expect(refreshDailyQuests(s, content, SUN)).toBe(false);
    expect(s.stats.lastDailyDay).toBe(NEXT_MON);
    expect(buyTokenService(s, content, "svc_skill_lesson", "mining").reason).toBe("limit");
    // Selbst ein manipulierter, früherer Stempel leert keinen Topf.
    s.stats.lastDailyDay = SUN;
    expect(tokenServiceStatus(s, content, "svc_skill_lesson").remaining).toBe(0);
    expect(s.tokenShopLedger.day).toBe(NEXT_MON);
  });

  it("Rückbuchung: scheitert die Anwendung nach dem Abbuchen, kommen die Marken zurück und nichts wird verbucht", () => {
    const s = game();
    // Content-Attrappe: `kind` liest beim Prüfen "orderCall", bei der Anwendung eine unbekannte Art ⇒ Anwendung scheitert.
    let reads = 0;
    const flaky = { id: "svc_flaky", name: { en: "F" }, description: { en: "F" }, tokenCost: 5, limitPerDay: 3, tier: 2 } as TokenServiceDef;
    Object.defineProperty(flaky, "kind", { get: () => (reads++ === 0 ? "orderCall" : "bogus"), enumerable: true });
    const c: ContentDB = { ...content, tokenServices: [flaky] };
    const tokens = s.character.questTokens;
    const clock = s.workOrders!.tierMs![2];
    const r = buyTokenService(s, c, "svc_flaky");
    expect(r).toMatchObject({ ok: false, reason: "invalid_target" });
    expect(s.character.questTokens).toBe(tokens);
    expect(s.workOrders!.tierMs![2]).toBe(clock);
    expect(s.tokenShopLedger.byDay).toEqual({});
  });

  it("Aschesturz: das Kaufbuch bleibt (keep)", () => {
    expect(PRESTIGE_STATE_FIELDS.tokenShopLedger).toBe("keep");
  });
});

describe("Tagesaufgabe neu würfeln", () => {
  function rerollable(s: GameState): string {
    const t = tokenServiceTargets(s, content, "svc_daily_reroll").filter((x) => x.ok);
    // die Karte mit den meisten Ersatzkarten (stabil, damit die Ausschluss-Prüfung nie in den Rückfall läuft)
    let best = t[0]!.target;
    let n = -1;
    for (const x of t) {
      const c = dailyRerollCandidates(s, content, x.target);
      const len = c.ok ? c.candidates.length : 0;
      if (len > n) {
        n = len;
        best = x.target;
      }
    }
    return best;
  }

  it("Staffel 2/3/4, höchstens 3 am Tag; Ersatz gleicher Schwierigkeit und gleicher Marken, gleicher Platz, kein Rückkehrer", () => {
    const s = game();
    let cur = rerollable(s);
    const slot = s.quests.daily.quests.findIndex((d) => d.questId === cur);
    const orig = quest(cur);
    const seen: string[] = [];
    for (const price of [2, 3, 4]) {
      expect(tokenServiceStatus(s, content, "svc_daily_reroll").price).toBe(price);
      const cand = dailyRerollCandidates(s, content, cur, dailyRerolledToday(s));
      const r = buyTokenService(s, content, "svc_daily_reroll", cur);
      expect(r).toMatchObject({ ok: true, price });
      const next = quest(r.questId!);
      expect(next.id).not.toBe(cur);
      expect(next.difficulty ?? "medium").toBe(orig.difficulty ?? "medium");
      expect(next.tokenReward ?? 0).toBe(orig.tokenReward ?? 0);
      expect(s.quests.daily.quests[slot]).toEqual({ questId: next.id, claimed: false });
      if (cand.ok && cand.candidates.every((q) => !seen.includes(q.id))) expect(seen).not.toContain(next.id);
      seen.push(cur);
      cur = next.id;
    }
    expect(s.tokenShopLedger.rerolledDailies).toEqual(seen);
    expect(s.character.questTokens).toBe(200 - 9);
    expect(buyTokenService(s, content, "svc_daily_reroll", cur).reason).toBe("limit");
    // neuer Tag: Staffel und Ausschlussliste beginnen von vorn
    refreshDailyQuests(s, content, 20261103);
    expect(tokenServiceStatus(s, content, "svc_daily_reroll").price).toBe(2);
    expect(dailyRerolledToday(s)).toEqual([]);
  });

  it("deterministisch über Tag + Wurfzähler, ohne Zug aus state.rng", () => {
    const a = game();
    const b = structuredClone(a);
    const target = rerollable(a);
    const rngBefore = { ...a.rng };
    const ra = buyTokenService(a, content, "svc_daily_reroll", target);
    const rb = buyTokenService(b, content, "svc_daily_reroll", target);
    expect(ra.questId).toBe(rb.questId);
    expect(a).toEqual(b);
    expect(a.rng).toEqual(rngBefore);
  });

  it("neue Karte startet bei 0 (Baseline gesetzt), auch wenn die Zähler längst darüber liegen", () => {
    const s = game();
    s.stats.kills += 100_000;
    s.stats.itemsGathered += 100_000;
    s.stats.itemsCrafted += 100_000;
    for (const id of Object.keys(content.monsters)) s.monsterKills[id] = (s.monsterKills[id] ?? 0) + 10_000;
    const r = buyTokenService(s, content, "svc_daily_reroll", rerollable(s));
    expect(r.ok).toBe(true);
    const q = quest(r.questId!);
    q.objectives.forEach((_, i) => expect(questObjectiveProgress(s, content, q, i)).toBe(0));
    expect(s.quests.completed).not.toContain(q.id);
  });

  it("nur offene Karten: eingelöst, erfüllt oder fremd ⇒ invalid_target ohne Abbuchung", () => {
    const s = game();
    const [a, b] = s.quests.daily.quests;
    a!.claimed = true;
    expect(buyTokenService(s, content, "svc_daily_reroll", a!.questId).reason).toBe("invalid_target");
    s.quests.completed.push(b!.questId);
    expect(buyTokenService(s, content, "svc_daily_reroll", b!.questId).reason).toBe("invalid_target");
    const foreign = content.quests.find((q) => q.daily && !s.quests.daily.quests.some((d) => d.questId === q.id))!;
    expect(buyTokenService(s, content, "svc_daily_reroll", foreign.id).reason).toBe("invalid_target");
    expect(buyTokenService(s, content, "svc_daily_reroll").reason).toBe("invalid_target");
    expect(s.character.questTokens).toBe(200);
  });

  it("Warteschlange plant die neue Karte, die alte ist nicht mehr heute", () => {
    const s = game();
    const old = rerollable(s);
    const r = buyTokenService(s, content, "svc_daily_reroll", old);
    expect(dailyQueuePlan(s, content, old)).toBeNull();
    const plan = dailyQueuePlan(s, content, r.questId!);
    expect(plan).not.toBeNull();
    expect(plan!.questId).toBe(r.questId);
  });
});

describe("Auftrag rufen: Angebot über den normalen Pfad", () => {
  it("Stufe-II-Uhr auf 0, die nächste Online-Aktion bringt ein Stufe-II-Angebot", () => {
    const s = createTestGame({ name: "A" }, content, 3);
    s.character.questTokens = 50;
    refreshDailyQuests(s, content, MON);
    s.skills.mining = { xp: xpForLevel(30) };
    expect(buyTokenService(s, content, "svc_order_call_2").ok).toBe(true);
    const act = content.actions.mine_iron!;
    const offer = onWorkOrderActionCompleted(s, content, act, 3_000, createRng(5), (a) => effectiveActionDurationMs(s, content, a));
    expect(offer?.tier).toBe(2);
    expect(s.workOrders!.tierMs![2]).toBeGreaterThan(0); // neu gewürfelt wie immer
  });
});

describe("Lehrstunde (nur Sammel-Fertigkeiten, L3)", () => {
  it("XP = 30 min × beste XP/min (effektive Dauer), Prestige-XP-Faktor wie Auftrags-XP", () => {
    const s = game();
    s.skills.woodcutting = { xp: xpForLevel(40) };
    const perMin = bestEffectiveXpPerMinute(s, content, "woodcutting", (a) => effectiveActionDurationMs(s, content, a));
    const want = Math.round(30 * perMin);
    expect(skillLessonXp(s, content, "woodcutting", 30)).toBe(want);
    const before = s.skills.woodcutting.xp;
    const r = buyTokenService(s, content, "svc_skill_lesson", "woodcutting");
    expect(r).toMatchObject({ ok: true, amount: want, price: 6 });
    expect(s.skills.woodcutting.xp).toBe(before + want);
    s.prestige.count = 3; // „Zeichen der Asche“: +6 %
    expect(skillLessonXp(s, content, "woodcutting", 30)).toBeCloseTo(Math.round(30 * bestEffectiveXpPerMinute(s, content, "woodcutting", (a) => effectiveActionDurationMs(s, content, a))) * 1.06, 6);
  });

  // claude:2026-10-31T13:58:31+01:00 — Befunde A2/B2: Aktionen mit Erfolgschance (Diebeskunst) zählen nur mit ihrer Grund-Erfolgschance.
  // Gemessen (Standard-Modus „vorsichtig“): L60 Tresor knacken (Chance 0,505) Lehrstunde 19 998 gegen echtes Spiel 19 859 je halbe Stunde,
  // vorher das Doppelte. L50 trägt die Hehler-Aktion „Abzeichen einschmelzen“ (Material, Chance 1) die Bestrate.
  it("Diebeskunst: Lehrstunde ≈ echte XP je halbe Stunde (L50 und L60), Aufträge unverändert", () => {
    for (const level of [50, 60]) {
      const s = createGame({ name: "Dieb" }, content, 5);
      s.skills.thieving = { xp: xpForLevel(level) };
      addItem(s.inventory, content, "guard_insignia", 2000); // Hehler-Material, damit das echte Spiel dieselbe Bestaktion laufen kann
      const durOf = (a: Parameters<typeof effectiveActionDurationMs>[2]) => effectiveActionDurationMs(s, content, a);
      const actions = Object.values(content.actions).filter((a) => a.skill === "thieving" && (a.levelRequired ?? 1) <= level && a.durationMs > 0);
      const rate = (a: (typeof actions)[number]) => (a.xp / durOf(a)) * actionSuccessChance(a, level, 0);
      const best = actions.reduce((b, a) => (rate(a) > rate(b) ? a : b));
      const lesson = skillLessonXp(s, content, "thieving", 30);
      expect(lesson).toBe(Math.round(30 * bestEffectiveXpPerMinute(s, content, "thieving", durOf, { successWeighted: true })));
      expect(bestEffectiveXpPerMinute(s, content, "thieving", durOf)).toBeGreaterThanOrEqual(bestEffectiveXpPerMinute(s, content, "thieving", durOf, { successWeighted: true }));
      const xp0 = s.skills.thieving.xp;
      setActiveAction(s, content, best.id, null);
      advance(s, content, 3_600_000);
      expect(s.activeActionId, `L${level}: ${best.id} lief die ganze Stunde`).toBe(best.id);
      const realHalfHour = (s.skills.thieving.xp - xp0) / 2;
      expect(lesson, `L${level} ${best.id}`).toBeGreaterThan(realHalfHour * 0.8);
      expect(lesson, `L${level} ${best.id}`).toBeLessThan(realHalfHour * 1.2);
    }
  });

  it("Handwerk und Kampf sind keine Ziele; Stufe 99 ⇒ no_effect", () => {
    const s = game();
    expect(buyTokenService(s, content, "svc_skill_lesson", "smithing").reason).toBe("invalid_target");
    expect(buyTokenService(s, content, "svc_skill_lesson", "attack").reason).toBe("invalid_target");
    s.skills.fishing = { xp: xpForLevel(99) };
    expect(buyTokenService(s, content, "svc_skill_lesson", "fishing").reason).toBe("no_effect");
    expect(tokenServiceTargets(s, content, "svc_skill_lesson").find((t) => t.target === "fishing")).toMatchObject({ ok: false, reason: "no_effect" });
    expect(s.character.questTokens).toBe(200);
  });
});

describe("Meisterlehre", () => {
  it("Meisterschafts-XP von 60 min: Abschlüsse × XP je Abschluss, am Deckel gekappt", () => {
    const s = game();
    s.quests.claimed.push("chronicle_04");
    const act = content.actions.cut_normal_tree!;
    const runs = Math.floor(3_600_000 / effectiveActionDurationMs(s, content, act));
    const r = buyTokenService(s, content, "svc_mastery_lesson", act.id);
    expect(r).toMatchObject({ ok: true, price: 4 });
    expect(r.amount).toBe(runs * act.xp); // unter Meisterschaft 50 bringt jeder Abschluss genau action.xp
    expect(levelFromXp(s.mastery[act.id]!.xp)).toBeLessThan(50);
    // kurz vor dem Deckel: nur bis 99
    const cap = xpForLevel(MASTERY_MAX_LEVEL);
    s.mastery[act.id] = { xp: cap - 10 };
    expect(buyTokenService(s, content, "svc_mastery_lesson", act.id).amount).toBe(10);
    expect(s.mastery[act.id]!.xp).toBe(cap);
    expect(buyTokenService(s, content, "svc_mastery_lesson", act.id).reason).toBe("no_effect");
  });

  it("gesperrte oder unbekannte Aktion ⇒ invalid_target", () => {
    const s = game();
    s.quests.claimed.push("chronicle_04");
    const high = Object.values(content.actions).find((a) => (a.levelRequired ?? 1) > 50)!;
    expect(buyTokenService(s, content, "svc_mastery_lesson", high.id).reason).toBe("invalid_target");
    expect(buyTokenService(s, content, "svc_mastery_lesson", "no_such_action").reason).toBe("invalid_target");
    expect(tokenServiceTargets(s, content, "svc_mastery_lesson", { skill: "woodcutting" }).every((t) => content.actions[t.target]!.skill === "woodcutting")).toBe(true);
  });
});

describe("Begleiter-Fährte (nur mit Talent „Spur aufgenommen“, L5)", () => {
  function withTrail(): GameState {
    const s = game();
    s.skills.slayer = { xp: xpForLevel(85) };
    s.talents = { slayer: { tracking: 1, trail: 1 } };
    return s;
  }

  it("ohne Talent gesperrt (Status nennt den Knoten)", () => {
    const s = game();
    expect(tokenServiceStatus(s, content, "svc_pet_trail")).toMatchObject({ locked: true, lock: { kind: "talent", effect: "petPity", treeId: "slayer", nodeId: "trail" } });
    const pet = Object.keys(content.pets)[0]!;
    expect(buyTokenService(s, content, "svc_pet_trail", pet).reason).toBe("locked");
  });

  it("+5 % der Schwelle, gedeckelt auf die Schwelle; besessen ⇒ invalid_target; volle Spur ⇒ no_effect; 1/Woche", () => {
    const s = withTrail();
    const petId = Object.keys(content.pets).find((id) => petPityProgress(s, content, content.pets[id]!) !== null)!;
    const { threshold } = petPityProgress(s, content, content.pets[petId]!)!;
    const step = Math.max(1, Math.round(threshold * 0.05));
    expect(tokenServicePreview(s, content, "svc_pet_trail", petId)).toMatchObject({ ok: true, amount: step });
    expect(buyTokenService(s, content, "svc_pet_trail", petId)).toMatchObject({ ok: true, amount: step, price: 15 });
    expect(s.petPity[petId]).toBe(step);
    expect(buyTokenService(s, content, "svc_pet_trail", petId).reason).toBe("limit");
    refreshDailyQuests(s, content, NEXT_MON);
    s.petPity[petId] = threshold - 1;
    expect(buyTokenService(s, content, "svc_pet_trail", petId).amount).toBe(1);
    expect(s.petPity[petId]).toBe(threshold);
    refreshDailyQuests(s, content, 20261116);
    expect(buyTokenService(s, content, "svc_pet_trail", petId).reason).toBe("no_effect");
    s.character.ownedPets[petId] = true;
    expect(buyTokenService(s, content, "svc_pet_trail", petId).reason).toBe("invalid_target");
  });
});

describe("Gebührenschein: Angebot (1/Woche) und Item", () => {
  it("erst ab Kapitel 20, 20 Marken, höchstens einer je Woche", () => {
    const s = game();
    expect(buyTokenShopOffer(s, content, "ts_raid_writ_1").reason).toBe("shelf_locked");
    expect(tokenShopOfferStatus(s, content, "ts_raid_writ_1")).toMatchObject({ locked: true, lockQuestId: "chronicle_20" });
    s.quests.claimed.push("chronicle_20");
    expect(buyTokenShopOffer(s, content, "ts_raid_writ_1").ok).toBe(true);
    expect(raidFeeWritCount(s)).toBe(1);
    expect(buyTokenShopOffer(s, content, "ts_raid_writ_1").reason).toBe("limit");
    expect(tokenShopOfferStatus(s, content, "ts_raid_writ_1")).toMatchObject({ remaining: 0, usedThisWeek: 1, limitPerWeek: 1, reason: "limit" });
    expect(s.character.questTokens).toBe(180);
    refreshDailyQuests(s, content, NEXT_MON);
    expect(buyTokenShopOffer(s, content, "ts_raid_writ_1").ok).toBe(true);
    expect(raidFeeWritCount(s)).toBe(2);
  });

  it("Slayer-Marke ab Spielbeginn kaufbar, unbegrenzte Angebote landen nicht im Kaufbuch", () => {
    const s = game();
    expect(buyTokenShopOffer(s, content, "ts_task_token_1").ok).toBe(true);
    expect(s.tokenShopLedger.byDay).toEqual({});
  });

  it("kein „Benutzen“: der Schein bleibt liegen, Grund raid_only", () => {
    const s = game();
    addItem(s.inventory, content, RAID_FEE_WRIT_ITEM_ID, 1);
    expect(useConsumable(s, content, RAID_FEE_WRIT_ITEM_ID)).toBe(false);
    expect(itemCount(s.inventory, RAID_FEE_WRIT_ITEM_ID)).toBe(1);
    expect(consumeFailReason(s, content, RAID_FEE_WRIT_ITEM_ID)).toBe("raid_only");
  });
});

describe("Gebührenschein in startRaid", () => {
  function raidContent(): ContentDB {
    const rooms: DungeonDef[] = [1, 2].map((i) => ({
      id: `writ_room_${i}`,
      name: { en: `Room ${i}`, de: `Raum ${i}` },
      requiredLevel: 1,
      encounters: ["goblin", "goblin", "goblin", "goblin", "goblin_warchief"],
      raidOnly: true,
      loot: [],
      xp: 0,
      gold: 0,
    }));
    const def: RaidDef = {
      id: "writ_raid",
      name: { en: "Writ Raid", de: "Schein-Raid" },
      unlockDungeonId: content.dungeons[0]!.id,
      rooms: rooms.map((d, i) => ({
        id: `r${i}`,
        name: d.name,
        dungeonId: d.id,
        bossId: "goblin_warchief",
        table: { draws: 1, extraChance: 0, entries: [{ itemId: "copper_sword", weight: 1 }] },
      })),
      fees: { normal: 1000, heroic: 3000, mythic: 8000 },
      heroicRestartCost: 500,
      mythicRefundPct: 0.25,
      scaling: {
        normal: { hpMult: 1, damageMult: 1, levelAdd: 0, defenseMult: 1 },
        heroic: { hpMult: 2, damageMult: 1.6, levelAdd: 10, defenseMult: 1.1 },
        mythic: { hpMult: 2.4, damageMult: 1.85, levelAdd: 20, defenseMult: 1.2 },
      },
      reinforcedWave: { index: 3, hpMult: 1.5, damageMult: 1.15 },
      trashLoot: [],
      trashPieceChance: { normal: 0, heroic: 0, mythic: 0 },
      bossSideLoot: [],
      suffixChance: { normal: 0, heroic: 0, mythic: 0 },
      weeklyChest: { extraItems: [], dust: { normal: 0, heroic: 0, mythic: 0 } },
      maxAutoRestarts: 3,
    };
    return { ...content, dungeons: [...content.dungeons, ...rooms], raids: [def] };
  }
  function raider(c: ContentDB, gold = 50_000, writs = 0): GameState {
    const s = createTestGame({ name: "W" }, c, 9);
    for (const id of Object.keys(c.skills)) s.skills[id] = { xp: xpForLevel(99) };
    s.dungeonsCleared[c.raids![0]!.unlockDungeonId] = 1;
    s.character.gold = gold;
    if (writs > 0) addItem(s.inventory, c, RAID_FEE_WRIT_ITEM_ID, writs);
    return s;
  }

  it("Opt-in senkt die Gebühr um 25 % und verbraucht genau einen Schein; ohne Opt-in volle Gebühr, Schein bleibt", () => {
    const c = raidContent();
    expect(raidFeeWithWrit(1000)).toBe(750);
    const s = raider(c, 50_000, 2);
    expect(startRaid(s, c, "writ_raid", "normal", undefined, { useFeeWrit: true })).toBe("ok");
    expect(s.character.gold).toBe(49_250);
    expect(s.raid!.run!.feePaid).toBe(750);
    expect(s.raid!.feesPaid).toBe(750);
    expect(raidFeeWritCount(s)).toBe(1);
    const t = raider(c, 50_000, 1);
    expect(startRaid(t, c, "writ_raid", "normal")).toBe("ok");
    expect(t.character.gold).toBe(49_000);
    expect(raidFeeWritCount(t)).toBe(1);
  });

  it("ohne Schein no_writ, ohne Gold für die gesenkte Gebühr gold; beides ohne Änderung; Schein aus dem Lager", () => {
    const c = raidContent();
    const none = raider(c);
    expect(startRaid(none, c, "writ_raid", "normal", undefined, { useFeeWrit: true })).toBe("no_writ");
    expect(none.character.gold).toBe(50_000);
    expect(none.raid?.run ?? null).toBeNull();
    const poor = raider(c, 700, 1);
    expect(startRaid(poor, c, "writ_raid", "normal", undefined, { useFeeWrit: true })).toBe("gold");
    expect(raidFeeWritCount(poor)).toBe(1);
    const banked = raider(c);
    banked.bank[RAID_FEE_WRIT_ITEM_ID] = 1;
    expect(startRaid(banked, c, "writ_raid", "normal", undefined, { useFeeWrit: true })).toBe("ok");
    expect(banked.bank[RAID_FEE_WRIT_ITEM_ID]).toBeUndefined();
    expect(banked.character.gold).toBe(49_250);
  });

  it("Warteschlange: Schein nur mit Einstellung `raidUseFeeWrit`, auch für die Folgerunde; ohne Schein volle Gebühr", () => {
    const c = raidContent();
    const off = raider(c, 50_000, 2);
    expect(startRaidFromQueue(off, c, "writ_raid", "normal", 1)).toBe("ok");
    expect(off.character.gold).toBe(49_000);
    expect(raidFeeWritCount(off)).toBe(2);

    const on = raider(c, 50_000, 2);
    on.settings.raidUseFeeWrit = true;
    on.actionQueue = [makeRaidQueueEntry("writ_raid", "normal", 2)];
    expect(advanceActionQueue(on, c)).toBe(true);
    expect(on.raid!.run!.feePaid).toBe(750);
    expect(raidFeeWritCount(on)).toBe(1);
    on.combat.encounterIndex = 4;
    onRaidRoomCleared(on, c);
    tickRaid(on, c, 5_000, false);
    on.combat.encounterIndex = 4;
    onRaidRoomCleared(on, c);
    tickRaid(on, c, 5_000, false); // Abschluss → Folgerunde startet mit dem zweiten Schein
    expect(on.raid!.run?.feePaid).toBe(750);
    expect(raidFeeWritCount(on)).toBe(0);
    expect(on.raid!.feesPaid).toBe(1500);

    const empty = raider(c);
    empty.settings.raidUseFeeWrit = true;
    expect(startRaidFromQueue(empty, c, "writ_raid", "normal", 1)).toBe("ok");
    expect(empty.character.gold).toBe(49_000);
  });
});
