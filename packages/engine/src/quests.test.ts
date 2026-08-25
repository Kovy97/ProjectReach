import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState, QuestDef } from "@hearthforge/shared";
import {
  QUEST_OBJECTIVE_TYPES,
  DAILY_QUEST_COUNT,
  DAILY_NONCOMBAT_MIN,
  DAILY_DIFFICULTY_MIN_TOTAL_LEVEL,
} from "@hearthforge/shared";
import type { QuestDifficulty } from "@hearthforge/shared";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";
import { totalLevel } from "./character";
import {
  addQuestTokens,
  buyTokenShopOffer,
  canClaimQuest,
  claimQuest,
  evaluateQuests,
  isCombatQuest,
  isDailyEligible,
  isShelfOpen,
  objectiveProgress,
  questObjectivesMet,
  questStatus,
  questTokenBalance,
  pickDailyQuests,
  refreshDailyQuests,
  isDailyClaimed,
  spendQuestTokens,
} from "./quests";

/** Test-Content: zwei verkettete Quests gegen vorhandene Zähler. */
function questContent(): ContentDB {
  const quests: QuestDef[] = [
    {
      id: "q_kill_goblins",
      name: { en: "Kill Goblins", de: "Töte Goblins" },
      description: { en: "", de: "" },
      objectives: [{ type: "kill_monster", target: "goblin", count: 10 }],
      rewards: { gold: 50, items: [{ id: "normal_log", qty: 3 }] },
    },
    {
      id: "q_chain",
      name: { en: "Chain", de: "Kette" },
      description: { en: "", de: "" },
      objectives: [{ type: "kill_total", count: 50 }],
      rewards: { gold: 100 },
      requires: ["q_kill_goblins"],
    },
  ];
  return { ...content, quests };
}

/** Test-Content mit einer wiederholbaren Craft-Quest gegen den itemsCrafted-Zähler. */
function repeatableCraftContent(): ContentDB {
  const quests: QuestDef[] = [
    {
      id: "q_daily_craft",
      name: { en: "Daily Craft", de: "Tägliches Handwerk" },
      description: { en: "", de: "" },
      objectives: [{ type: "craft_items", count: 5 }],
      rewards: { gold: 40 },
      repeatable: true,
    },
    {
      id: "q_daily_smith_bars",
      name: { en: "Daily Bars", de: "Tägliche Barren" },
      description: { en: "", de: "" },
      objectives: [{ type: "craft_items", target: "copper_bar", count: 3 }],
      rewards: { gold: 30 },
      repeatable: true,
    },
  ];
  return { ...content, quests };
}

/** Daily-Pool-Content: viele Pool-Quests über alle Schwierigkeiten (für die 6er-Auswahl). */
function dailyContent(): ContentDB {
  const diffs: QuestDifficulty[] = ["very_easy", "easy", "medium", "hard", "master"];
  const quests: QuestDef[] = [];
  // 4 Pool-Quests je Schwierigkeit (20 gesamt) — genug, dass der 2×-Constraint immer 6 zieht.
  for (const d of diffs) {
    for (let i = 0; i < 4; i++) {
      quests.push({
        id: `pool_${d}_${i}`,
        name: { en: `${d} ${i}`, de: `${d} ${i}` },
        description: { en: "x", de: "x" },
        objectives: [{ type: "gather_items", count: 5 }],
        rewards: { gold: 10 },
        daily: true,
        difficulty: d,
      });
    }
  }
  return { ...content, quests };
}

describe("quests", () => {
  it("frischer Spielstand: leerer Quest-State", () => {
    const s = createGame({ name: "Test" }, content, 1);
    expect(s.quests.completed).toEqual([]);
    expect(s.quests.claimed).toEqual([]);
  });

  it("Objective liest aus dem vorhandenen State-Zähler", () => {
    const c = questContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.monsterKills.goblin = 7;
    expect(objectiveProgress(s, c, c.quests[0]!.objectives[0]!)).toBe(7);
    expect(questObjectivesMet(s, c, c.quests[0]!)).toBe(false);
    s.monsterKills.goblin = 10;
    expect(questObjectivesMet(s, c, c.quests[0]!)).toBe(true);
  });

  it("evaluateQuests markiert eine erfüllte Quest als claimbar", () => {
    const c = questContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.monsterKills.goblin = 10;
    evaluateQuests(s, c);
    expect(s.quests.completed).toContain("q_kill_goblins");
    expect(canClaimQuest(s, c, "q_kill_goblins")).toBe(true);
  });

  it("claimQuest vergibt gold + items und ist nicht doppelt einlösbar", () => {
    const c = questContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.monsterKills.goblin = 10;
    const goldBefore = s.character.gold;
    const logsBefore = s.bank.normal_log ?? 0;
    evaluateQuests(s, c);

    expect(claimQuest(s, c, "q_kill_goblins")).toBe(true);
    expect(s.character.gold).toBe(goldBefore + 50);
    const logsAfter =
      (s.bank.normal_log ?? 0) +
      s.inventory.slots.reduce((n, sl) => n + (sl?.itemId === "normal_log" ? sl.qty : 0), 0);
    expect(logsAfter).toBe(logsBefore + 3);
    expect(s.quests.claimed).toContain("q_kill_goblins");
    expect(s.quests.completed).not.toContain("q_kill_goblins");

    // Zweiter Versuch: keine zweite Belohnung.
    expect(claimQuest(s, c, "q_kill_goblins")).toBe(false);
    expect(s.character.gold).toBe(goldBefore + 50);
  });

  // ── Quest-Tokens (Task #271, SAVE_VERSION 56) ──────────────────────────────

  it("claimQuest schreibt tokenReward gut — zusätzlich zur normalen Reward-Pipeline", () => {
    const c = questContent();
    // tokenReward auf die erste Quest legen (Kopie, kein Content-Mutieren über Tests hinweg).
    c.quests = c.quests.map((q) => (q.id === "q_kill_goblins" ? { ...q, tokenReward: 3 } : q));
    const s = createGame({ name: "Test" }, c, 1);
    s.monsterKills.goblin = 10;
    const goldBefore = s.character.gold;
    evaluateQuests(s, c);

    expect(s.character.questTokens).toBe(0);
    expect(claimQuest(s, c, "q_kill_goblins")).toBe(true);
    expect(s.character.questTokens).toBe(3); // Tokens gutgeschrieben …
    expect(s.character.gold).toBe(goldBefore + 50); // … Gold/Items laufen unverändert weiter

    // Kein Doppel-Claim → keine Doppel-Tokens.
    expect(claimQuest(s, c, "q_kill_goblins")).toBe(false);
    expect(s.character.questTokens).toBe(3);
  });

  it("claimQuest ohne tokenReward: 0 Tokens, nichts bricht (abwärtskompatible Quest-Defs)", () => {
    const c = questContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.monsterKills.goblin = 10;
    evaluateQuests(s, c);
    expect(claimQuest(s, c, "q_kill_goblins")).toBe(true);
    expect(s.character.questTokens).toBe(0);
  });

  it("spendQuestTokens validiert: nur endliche positive Ganzzahl ≤ Bestand; kein Teil-Abzug", () => {
    const s = createGame({ name: "Test" }, content, 1);
    s.character.questTokens = 10;
    expect(spendQuestTokens(s, 4)).toBe(true);
    expect(s.character.questTokens).toBe(6);
    expect(questTokenBalance(s)).toBe(6);
    // Ablehnen ohne Nebeneffekt: zu viel, 0, negativ, NaN, Nicht-Ganzzahl.
    expect(spendQuestTokens(s, 7)).toBe(false);
    expect(spendQuestTokens(s, 0)).toBe(false);
    expect(spendQuestTokens(s, -1)).toBe(false);
    expect(spendQuestTokens(s, Number.NaN)).toBe(false);
    expect(spendQuestTokens(s, 1.5)).toBe(false);
    expect(s.character.questTokens).toBe(6); // unverändert
    // Exakter Restbestand ist ausgebbar (kein Off-by-one).
    expect(spendQuestTokens(s, 6)).toBe(true);
    expect(s.character.questTokens).toBe(0);
  });

  it("addQuestTokens: schreibt nur gültige Mengen gut (≤0/NaN/Float = no-op)", () => {
    const s = createGame({ name: "Test" }, content, 1);
    expect(addQuestTokens(s, 5)).toBe(5);
    expect(addQuestTokens(s, 0)).toBe(0);
    expect(addQuestTokens(s, -2)).toBe(0);
    expect(addQuestTokens(s, 2.5)).toBe(0);
    expect(s.character.questTokens).toBe(5);
  });

  it("claimQuest verliert keine Belohnung bei vollem Inventar (T12#1) — blockt statt zu verbrennen", () => {
    const c = questContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.settings.autoBank = false; // sonst würde der Überlauf in die Bank wandern
    s.monsterKills.goblin = 10;
    evaluateQuests(s, c);
    // Inventar KOMPLETT füllen (kein normal_log-Stack, kein freier Slot).
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (!s.inventory.slots[i]) s.inventory.slots[i] = { itemId: "copper_ore", qty: 1 };
    }
    const goldBefore = s.character.gold;
    // Belohnung (3 normal_log) passt nirgends → Claim ABGELEHNT: nichts vergeben, Quest bleibt einlösbar.
    expect(claimQuest(s, c, "q_kill_goblins")).toBe(false);
    expect(s.character.gold).toBe(goldBefore); // kein Gold verbrannt
    expect(s.quests.claimed).not.toContain("q_kill_goblins"); // einmalige Quest NICHT verbraucht
    expect(canClaimQuest(s, c, "q_kill_goblins")).toBe(true); // weiterhin einlösbar
    // Platz schaffen → jetzt gelingt der Claim regulär.
    s.inventory.slots[0] = null;
    expect(claimQuest(s, c, "q_kill_goblins")).toBe(true);
    expect(s.character.gold).toBe(goldBefore + 50);
  });

  it("Quest-Kette: Folge-Quest ist gesperrt, bis die Vorbedingung eingelöst ist", () => {
    const c = questContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.stats.kills = 50; // Objective der Folge-Quest schon erfüllt …
    expect(questStatus(s, c, c.quests[1]!)).toBe("locked"); // … aber gesperrt (requires)
    evaluateQuests(s, c);
    expect(s.quests.completed).not.toContain("q_chain");

    // Vorbedingung einlösen → Folge-Quest schaltet frei.
    s.monsterKills.goblin = 10;
    evaluateQuests(s, c);
    claimQuest(s, c, "q_kill_goblins");
    evaluateQuests(s, c);
    expect(canClaimQuest(s, c, "q_chain")).toBe(true);
  });

  it("craft_items zählt geschmiedete Items (gesamt + je Item-ID) über den tick-Pfad", () => {
    const c = repeatableCraftContent();
    const s = createGame({ name: "Smith" }, c, 1);
    // Genug Erz für mehrere Smelt-Durchläufe ins Inventar legen.
    s.inventory.slots[1] = { itemId: "copper_ore", qty: 20 };
    setActiveAction(s, c, "smelt_copper");
    // Lange genug laufen lassen, dass mehrere Barren entstehen (smelt_copper ~2600 ms).
    advance(s, c, 30_000);
    expect(s.stats.itemsCrafted).toBeGreaterThan(0);
    expect(s.stats.craftedById.copper_bar).toBe(s.stats.itemsCrafted);
    // Gather-Zähler darf nicht „weniger" sein — Craft zählt zusätzlich, nicht statt itemsGathered.
    expect(s.stats.itemsGathered).toBeGreaterThanOrEqual(s.stats.itemsCrafted);
  });

  it("craft_items (target=Item-ID) erfüllt sich über craftedById", () => {
    const c = repeatableCraftContent();
    const s = createGame({ name: "Smith" }, c, 1);
    s.stats.itemsCrafted = 3;
    s.stats.craftedById = { copper_bar: 3 };
    const quest = c.quests.find((q) => q.id === "q_daily_smith_bars")!;
    expect(questObjectivesMet(s, c, quest)).toBe(true);
    // anderes Item zählt nicht aufs target-Objective
    s.stats.craftedById = { iron_bar: 99 };
    expect(questObjectivesMet(s, c, quest)).toBe(false);
  });

  it("repeatable Quest: nach Claim re-armt sie (neue Baseline) und ist erst nach erneutem Fortschritt wieder claimbar", () => {
    const c = repeatableCraftContent();
    const s = createGame({ name: "Smith" }, c, 1);
    const goldStart = s.character.gold;

    // 5 craften → erste Quest erfüllbar.
    s.stats.itemsCrafted = 5;
    evaluateQuests(s, c);
    expect(canClaimQuest(s, c, "q_daily_craft")).toBe(true);
    expect(claimQuest(s, c, "q_daily_craft")).toBe(true);
    expect(s.character.gold).toBe(goldStart + 40);

    // Direkt nach Claim: NICHT mehr claimbar (Baseline = 5, Fortschritt seit Claim = 0).
    expect(canClaimQuest(s, c, "q_daily_craft")).toBe(false);
    expect(s.quests.completed).not.toContain("q_daily_craft");
    expect(questStatus(s, c, c.quests[0]!)).toBe("active"); // nicht „claimed"
    expect(s.quests.repeatBaseline.q_daily_craft?.[0]).toBe(5);

    // Doppel-Claim im selben Zyklus verweigert (keine zweite Belohnung).
    expect(claimQuest(s, c, "q_daily_craft")).toBe(false);
    expect(s.character.gold).toBe(goldStart + 40);

    // Noch 4 craften (total 9) → Fortschritt seit Claim = 4 < 5 → noch nicht claimbar.
    s.stats.itemsCrafted = 9;
    evaluateQuests(s, c);
    expect(canClaimQuest(s, c, "q_daily_craft")).toBe(false);

    // 10 craften (total 10) → seit Claim = 5 → wieder claimbar.
    s.stats.itemsCrafted = 10;
    evaluateQuests(s, c);
    expect(s.quests.completed).toContain("q_daily_craft");
    expect(canClaimQuest(s, c, "q_daily_craft")).toBe(true);
    expect(claimQuest(s, c, "q_daily_craft")).toBe(true);
    expect(s.character.gold).toBe(goldStart + 80); // zweite Belohnung kassiert
    expect(s.quests.repeatBaseline.q_daily_craft?.[0]).toBe(10);
  });

  it("objectiveProgress berücksichtigt die Repeatable-Baseline", () => {
    const c = repeatableCraftContent();
    const s = createGame({ name: "Smith" }, c, 1);
    const obj = c.quests[0]!.objectives[0]!;
    s.stats.itemsCrafted = 8;
    expect(objectiveProgress(s, c, obj)).toBe(8); // ohne Baseline = absoluter Zähler
    expect(objectiveProgress(s, c, obj, 5)).toBe(3); // mit Baseline 5 → seit Claim
    expect(objectiveProgress(s, c, obj, 99)).toBe(0); // nie negativ
  });

  it("Guard: jeder genutzte Objective-Typ ist im Progress-Switch behandelt", () => {
    // Verhindert „definiert-aber-nie-geprüft": ein Typ ohne Zweig liefert immer 0 → Quest nie erfüllbar.
    const s = createGame({ name: "Test" }, content, 1);
    const used = new Set(content.quests.flatMap((q) => q.objectives.map((o) => o.type)));
    for (const type of used) {
      expect(QUEST_OBJECTIVE_TYPES, `unbekannter Objective-Typ: ${type}`).toContain(type);
    }
  });
});

describe("daily quests", () => {
  it("pickDailyQuests ist deterministisch pro Tag und liefert genau 6", () => {
    const c = dailyContent();
    const a = pickDailyQuests(c, 20260625).map((q) => q.id);
    const b = pickDailyQuests(c, 20260625).map((q) => q.id);
    expect(a).toEqual(b); // gleicher Tag → gleiche Auswahl
    expect(a.length).toBe(DAILY_QUEST_COUNT);
    expect(new Set(a).size).toBe(DAILY_QUEST_COUNT); // keine Duplikate
  });

  it("anderer Tag → andere Auswahl (mit hoher Wahrscheinlichkeit)", () => {
    const c = dailyContent();
    const a = pickDailyQuests(c, 20260625).map((q) => q.id).join(",");
    const b = pickDailyQuests(c, 20260626).map((q) => q.id).join(",");
    expect(a).not.toBe(b);
  });

  it("Constraint: keine Schwierigkeit erscheint öfter als 2× unter den 6", () => {
    const c = dailyContent();
    for (const day of [20260625, 20260626, 20260701, 20270101]) {
      const picked = pickDailyQuests(c, day);
      const counts: Record<string, number> = {};
      for (const q of picked) counts[q.difficulty!] = (counts[q.difficulty!] ?? 0) + 1;
      for (const [d, n] of Object.entries(counts)) {
        expect(n, `Tag ${day}: Schwierigkeit ${d} erscheint ${n}× (> 2)`).toBeLessThanOrEqual(2);
      }
      expect(Object.keys(counts).length).toBeGreaterThanOrEqual(3); // ≥3 Schwierigkeiten
    }
  });

  it("refreshDailyQuests zieht bei Tageswechsel neu, resettet Fortschritt & ist idempotent", () => {
    const c = dailyContent();
    const s = createGame({ name: "D" }, c, 1);

    // Erster Tag: 6 Dailies gezogen.
    expect(refreshDailyQuests(s, c, 20260625)).toBe(true);
    expect(s.quests.daily.day).toBe(20260625);
    expect(s.quests.daily.quests.length).toBe(DAILY_QUEST_COUNT);

    // Idempotent: gleicher Tag → kein Neuziehen.
    expect(refreshDailyQuests(s, c, 20260625)).toBe(false);

    // Eine gezogene Daily erfüllen (gather_items count 5) und claimen.
    const first = s.quests.daily.quests[0]!.questId;
    s.stats.itemsGathered = (s.quests.repeatBaseline[first]?.[0] ?? 0) + 5;
    evaluateQuests(s, c);
    expect(canClaimQuest(s, c, first)).toBe(true);
    expect(claimQuest(s, c, first)).toBe(true);
    expect(isDailyClaimed(s, first)).toBe(true);
    // Heute nicht erneut claimbar.
    expect(canClaimQuest(s, c, first)).toBe(false);

    // Tageswechsel: neue 6 + Fortschritt-Reset (Baseline auf aktuellen Zähler gehoben).
    expect(refreshDailyQuests(s, c, 20260626)).toBe(true);
    expect(s.quests.daily.day).toBe(20260626);
    expect(s.quests.daily.quests.every((d) => d.claimed === false)).toBe(true);
    // Baseline jeder neuen Daily = aktueller Zählerstand → Fortschritt startet bei 0.
    for (const d of s.quests.daily.quests) {
      const q = c.quests.find((x) => x.id === d.questId)!;
      expect(questObjectivesMet(s, c, q)).toBe(false);
    }
  });

  it("leerer Daily-Pool → pickDailyQuests liefert []", () => {
    const c: ContentDB = { ...content, quests: [] };
    expect(pickDailyQuests(c, 20260625)).toEqual([]);
  });

  it("dailyStreak: aufeinanderfolgende Tage zählen hoch, eine Lücke setzt zurück (auch über Monatsgrenze)", () => {
    const c = dailyContent();
    const s = createGame({ name: "D" }, c, 1);

    // Erster Tag → Streak startet bei 1.
    refreshDailyQuests(s, c, 20260625);
    expect(s.stats.dailyStreak).toBe(1);

    // Folgetag → +1.
    refreshDailyQuests(s, c, 20260626);
    expect(s.stats.dailyStreak).toBe(2);

    // Idempotent: gleicher Tag erneut → Streak unverändert.
    refreshDailyQuests(s, c, 20260626);
    expect(s.stats.dailyStreak).toBe(2);

    // Lücke (28. statt 27.) → Reset auf 1.
    refreshDailyQuests(s, c, 20260628);
    expect(s.stats.dailyStreak).toBe(1);

    // Monatsgrenze: 30.06. → 01.07. ist konsekutiv → +1.
    refreshDailyQuests(s, c, 20260629);
    refreshDailyQuests(s, c, 20260630);
    expect(s.stats.dailyStreak).toBe(3);
    refreshDailyQuests(s, c, 20260701);
    expect(s.stats.dailyStreak).toBe(4);
  });

  it("Clock-Cheat-Bremse: ein RÜCKWÄRTS-Tagessprung löst KEINEN Reset/keinen Streak-Pump aus", () => {
    const c = dailyContent();
    const s = createGame({ name: "D" }, c, 1);

    // Tag 1 (vorgestellte Uhr).
    expect(refreshDailyQuests(s, c, 20260625)).toBe(true);
    expect(s.stats.dailyStreak).toBe(1);
    expect(s.stats.lastDailyDay).toBe(20260625);
    const dayAfterForward = s.quests.daily.day;

    // Uhr ZURÜCKgestellt (gestern): darf nicht neu ziehen / nicht den Streak pumpen.
    expect(refreshDailyQuests(s, c, 20260624)).toBe(false);
    expect(s.stats.dailyStreak).toBe(1); // unverändert
    expect(s.stats.lastDailyDay).toBe(20260625); // Untergrenze bleibt
    expect(s.quests.daily.day).toBe(dayAfterForward); // Auswahl unverändert

    // Noch weiter zurück → ebenfalls ignoriert.
    expect(refreshDailyQuests(s, c, 20251231)).toBe(false);
    expect(s.stats.lastDailyDay).toBe(20260625);

    // Echter Vorwärts-Tageswechsel funktioniert weiterhin normal.
    expect(refreshDailyQuests(s, c, 20260626)).toBe(true);
    expect(s.stats.dailyStreak).toBe(2);
    expect(s.stats.lastDailyDay).toBe(20260626);
  });

  it("Clock-Cheat-Bremse: nicht-endlicher Tagesstempel wird abgewiesen (kein Crash)", () => {
    const c = dailyContent();
    const s = createGame({ name: "D" }, c, 1);
    expect(refreshDailyQuests(s, c, NaN)).toBe(false);
    expect(refreshDailyQuests(s, c, Infinity)).toBe(false);
    expect(s.stats.lastDailyDay).toBe(0); // nie gesetzt
  });
});

// ── Progressions-Filter + Mix-Garantie der Daily-Vergabe (Welle Z2, 2026-07-16) ──────────────
// Neuling-Review Jorin Empf. 5: Tag-1-Spieler bekamen Dailies auf gesperrte Zonen (Grenzlande-
// Kills vor Chronik-Kapitel 3) und Meister-Karten weit über ihrem Stand. Kern-Loop-Review Henrik
// Empf. 5: ≥2 Nicht-Kampf-Karten pro Tag (Skiller-Grundversorgung).

describe("Daily-Progressions-Filter (Welle Z2)", () => {
  /** Endgame-Stand: alle Story-Gates offen (Zonen + Dungeons), alle Skills 99. */
  function endgameState(): GameState {
    const s = createGame({ name: "End" }, content, 1);
    for (const z of content.zones) if (z.requiresQuest) s.quests.claimed.push(z.requiresQuest);
    for (const d of content.dungeons) if (d.requiresQuest) s.quests.claimed.push(d.requiresQuest);
    for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(99) };
    s.character.totalLevel = totalLevel(s, content);
    return s;
  }

  /** Die dem State zugewiesenen Tages-Quests als QuestDefs. */
  function assigned(s: GameState): QuestDef[] {
    return s.quests.daily.quests.map((d) => content.quests.find((q) => q.id === d.questId)!);
  }

  const SAMPLE_DAYS = [
    20260716, 20260717, 20260718, 20260719, 20260720, 20260721, 20260722,
    20260723, 20260724, 20260725, 20260726, 20260727, 20260728, 20260729,
  ];

  it("frischer Spielstand (nur pastures offen): keine gesperrten Ziele, keine Master-Karte, volle 6, ≥2 Nicht-Kampf", () => {
    for (const day of SAMPLE_DAYS) {
      const s = createGame({ name: "Neuling" }, content, 1);
      expect(refreshDailyQuests(s, content, day)).toBe(true);
      const picks = assigned(s);

      // Nie weniger Karten als heute (Pool 50 → volle 6) + Schwierigkeits-Constraint intakt.
      expect(picks.length, `Tag ${day}: nur ${picks.length} Karten`).toBe(DAILY_QUEST_COUNT);
      const perDiff: Record<string, number> = {};
      for (const q of picks) perDiff[q.difficulty!] = (perDiff[q.difficulty!] ?? 0) + 1;
      for (const [d, n] of Object.entries(perDiff)) {
        expect(n, `Tag ${day}: Schwierigkeit ${d} erscheint ${n}× (> 2)`).toBeLessThanOrEqual(2);
      }

      for (const q of picks) {
        // Keine Meister-Karte am ersten Tag (Gesamtlevel-Gate).
        expect(q.difficulty, `Tag ${day}: Master-Daily ${q.id} am Tag 1`).not.toBe("master");
        // Jede vergebene Karte ist mit dem Stand erfüllbar (deckt Zonen-/Dungeon-/Rezept-Gates ab).
        expect(isDailyEligible(s, content, q), `Tag ${day}: unerfüllbare Daily ${q.id}`).toBe(true);
        // Explizit: kein kill_monster-Ziel in quest-gesperrter Zone (Grenzlande & Co.) / dungeonOnly.
        for (const o of q.objectives) {
          if (o.type !== "kill_monster") continue;
          const ids = [...(o.targets ?? []), ...(o.target ? [o.target] : [])];
          const openTarget = ids.some((id) => {
            const m = content.monsters[id]!;
            const zone = m.zone ? content.zones.find((z) => z.id === m.zone) : undefined;
            return !m.dungeonOnly && !zone?.requiresQuest;
          });
          expect(openTarget, `Tag ${day}: Daily ${q.id} zeigt nur auf gesperrte Ziele`).toBe(true);
        }
      }

      // Mix-Garantie (Kern-Loop-Review Henrik): ≥2 Nicht-Kampf-Karten.
      const nonCombat = picks.filter((q) => !isCombatQuest(q)).length;
      expect(nonCombat, `Tag ${day}: nur ${nonCombat} Nicht-Kampf-Karten`).toBeGreaterThanOrEqual(
        DAILY_NONCOMBAT_MIN,
      );
    }
  });

  it("Endgame-Stand: volles Spektrum (Master/Hard erscheinen über die Tage) + Mix-Garantie bleibt", () => {
    const seenDifficulties = new Set<string>();
    for (const day of SAMPLE_DAYS) {
      const s = endgameState();
      expect(refreshDailyQuests(s, content, day)).toBe(true);
      const picks = assigned(s);
      expect(picks.length).toBe(DAILY_QUEST_COUNT);
      for (const q of picks) {
        seenDifficulties.add(q.difficulty!);
        // Am Endgame-Stand ist ALLES erfüllbar — der Filter darf nichts fälschlich sperren.
        expect(isDailyEligible(s, content, q), `Tag ${day}: Endgame sperrt ${q.id}`).toBe(true);
      }
      const nonCombat = picks.filter((q) => !isCombatQuest(q)).length;
      expect(nonCombat, `Tag ${day}: Endgame nur ${nonCombat} Nicht-Kampf`).toBeGreaterThanOrEqual(
        DAILY_NONCOMBAT_MIN,
      );
    }
    // Über 14 Tage muss das obere Spektrum vorkommen — der Filter kappt Endgame nichts weg.
    expect(seenDifficulties.has("master"), "Master-Dailies erscheinen im Endgame nie").toBe(true);
    expect(seenDifficulties.has("hard"), "Hard-Dailies erscheinen im Endgame nie").toBe(true);
  });

  it("Determinismus: gleicher Tag + gleicher Stand → identische Auswahl (Doppel-Refresh & Doppel-Pick)", () => {
    const a = createGame({ name: "A" }, content, 1);
    const b = createGame({ name: "B" }, content, 1);
    refreshDailyQuests(a, content, 20260716);
    refreshDailyQuests(b, content, 20260716);
    expect(a.quests.daily.quests.map((d) => d.questId)).toEqual(
      b.quests.daily.quests.map((d) => d.questId),
    );
    // pickDailyQuests mit state ist rein: doppelter Aufruf am selben State ist identisch.
    const p1 = pickDailyQuests(content, 20260716, 0, a).map((q) => q.id);
    const p2 = pickDailyQuests(content, 20260716, 0, a).map((q) => q.id);
    expect(p1).toEqual(p2);
    // Endgame-Stand ebenso deterministisch (Filter hängt nur an Tag + Fortschritt).
    const e1 = pickDailyQuests(content, 20260716, 0, endgameState()).map((q) => q.id);
    const e2 = pickDailyQuests(content, 20260716, 0, endgameState()).map((q) => q.id);
    expect(e1).toEqual(e2);
  });

  it("Bestands-Kompat: bereits vergebene Tagesauswahl bleibt am selben Tag unangetastet — nur die NEUE Vergabe filtert", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    // Alt-Save simulieren: eine (nach neuem Filter unzulässige) Grenzlande-Daily liegt im Tages-Slot.
    s.quests.daily = { day: 20260716, quests: [{ questId: "daily_e_kill_goblins_15", claimed: false }] };
    s.stats.lastDailyDay = 20260716;
    expect(refreshDailyQuests(s, content, 20260716)).toBe(false); // kein Neu-Ziehen am selben Tag
    expect(s.quests.daily.quests.map((d) => d.questId)).toEqual(["daily_e_kill_goblins_15"]);
    // Erst der Tageswechsel zieht neu — und dann gefiltert.
    expect(refreshDailyQuests(s, content, 20260717)).toBe(true);
    for (const q of assigned(s)) {
      expect(isDailyEligible(s, content, q), `Neu-Vergabe enthält unerfüllbare ${q.id}`).toBe(true);
    }
  });

  it("Auffüll-Regel: zu wenige erfüllbare Kandidaten → trotzdem volle Kartenzahl, erfüllbare zuerst, dann die leichtesten", () => {
    // 6 Kill-Dailies auf die quest-gesperrten Grenzlande (goblin) + 2 erfüllbare Gather-Dailies.
    const mk = (id: string, d: QuestDifficulty, obj: QuestDef["objectives"]): QuestDef => ({
      id,
      name: { en: id, de: id },
      description: { en: "x", de: "x" },
      objectives: obj,
      rewards: { gold: 1 },
      daily: true,
      difficulty: d,
    });
    const kill = (id: string, d: QuestDifficulty): QuestDef =>
      mk(id, d, [{ type: "kill_monster", target: "goblin", count: 5 }]);
    const c: ContentDB = {
      ...content,
      quests: [
        kill("pool_kill_m1", "medium"),
        kill("pool_kill_h1", "hard"),
        kill("pool_kill_ma1", "master"),
        kill("pool_kill_m2", "medium"),
        kill("pool_kill_h2", "hard"),
        kill("pool_kill_ma2", "master"),
        mk("pool_gather_a", "very_easy", [{ type: "gather_items", count: 5 }]),
        mk("pool_gather_b", "easy", [{ type: "gather_items", count: 5 }]),
      ],
    };
    const s = createGame({ name: "N" }, c, 1);
    const picks = pickDailyQuests(c, 20260716, 0, s);
    const ids = picks.map((q) => q.id);
    // Nie weniger Karten als heute: min(6, Poolgröße 8) = 6.
    expect(picks.length).toBe(DAILY_QUEST_COUNT);
    // Beide erfüllbaren Karten sind sicher dabei …
    expect(ids).toContain("pool_gather_a");
    expect(ids).toContain("pool_gather_b");
    // … und die Auffüller sind die LEICHTESTEN der übrigen (medium/hard vor master).
    expect(picks.filter((q) => q.difficulty === "master").length, "Auffüller griff zu master statt zu leichteren").toBe(0);
    // Auffüllen ist deterministisch (gleicher Tag + Stand → gleiche Reihenfolge).
    expect(pickDailyQuests(c, 20260716, 0, s).map((q) => q.id)).toEqual(ids);
  });

  it("Mix-Garantie: kampflastiger Pool → trotzdem ≥2 Nicht-Kampf-Karten am Tag", () => {
    // 10 ERFÜLLBARE Kill-Dailies (chicken, pastures = nie gesperrt) + 3 Gather-Dailies. Ohne
    // Garantie könnte die Tagesrotation 5-6 Kampf-Karten ziehen (Skiller-feindliches Brett).
    const quests: QuestDef[] = [];
    const diffs: QuestDifficulty[] = ["very_easy", "easy", "medium", "hard"];
    for (let i = 0; i < 10; i++) {
      quests.push({
        id: `pool_combat_${i}`,
        name: { en: `c${i}`, de: `c${i}` },
        description: { en: "x", de: "x" },
        objectives: [{ type: "kill_monster", target: "chicken", count: 5 }],
        rewards: { gold: 1 },
        daily: true,
        difficulty: diffs[i % diffs.length]!,
      });
    }
    for (let i = 0; i < 3; i++) {
      quests.push({
        id: `pool_skiller_${i}`,
        name: { en: `s${i}`, de: `s${i}` },
        description: { en: "x", de: "x" },
        objectives: [{ type: "gather_items", count: 5 }],
        rewards: { gold: 1 },
        daily: true,
        difficulty: diffs[i]!,
      });
    }
    const c: ContentDB = { ...content, quests };
    for (const day of SAMPLE_DAYS) {
      const s = createGame({ name: "Mix" }, c, 1);
      const picks = pickDailyQuests(c, day, 0, s);
      expect(picks.length).toBe(DAILY_QUEST_COUNT);
      const nonCombat = picks.filter((q) => !isCombatQuest(q)).length;
      expect(nonCombat, `Tag ${day}: nur ${nonCombat} Nicht-Kampf`).toBeGreaterThanOrEqual(
        DAILY_NONCOMBAT_MIN,
      );
    }
  });

  it("Rezept-Heuristik: Craft-Ziel nur bei Skill-Level-Anforderung ≤ aktuelles Level + 10", () => {
    const runite = content.quests.find((q) => q.id === "daily_ma_smelt_runite_4")!;
    const req = content.actions.smelt_runite!.levelRequired ?? 1;
    const s = createGame({ name: "Schmied" }, content, 1);
    s.character.totalLevel = DAILY_DIFFICULTY_MIN_TOTAL_LEVEL.master; // Master-Gate isolieren
    // Smithing exakt (req − 10): Anforderung liegt genau am Headroom-Rand → erfüllbar.
    s.skills.smithing = { xp: xpForLevel(req - 10) };
    expect(isDailyEligible(s, content, runite)).toBe(true);
    // Ein Level darunter → außer Reichweite.
    s.skills.smithing = { xp: xpForLevel(req - 11) };
    expect(isDailyEligible(s, content, runite)).toBe(false);
  });

  it("Master-Gate: Ziele ohne Zonen-/Rezept-Gate (gather 250) bleiben Tag-1 gesperrt, später offen", () => {
    const gather = content.quests.find((q) => q.id === "daily_ma_gather_250")!;
    const s = createGame({ name: "Frisch" }, content, 1);
    expect(isDailyEligible(s, content, gather)).toBe(false); // Gesamtlevel ≈ Σ Level-1-Skills
    s.character.totalLevel = DAILY_DIFFICULTY_MIN_TOTAL_LEVEL.master;
    expect(isDailyEligible(s, content, gather)).toBe(true);
  });
});

// ── Quest-Token-Belohnungs-Shop (buyTokenShopOffer, Task #284) ───────────────

/** Test-Content mit einem synthetischen Token-Shop (deterministisch, unabhängig vom echten Katalog). */
function tokenShopContent(): ContentDB {
  return {
    ...content,
    tokenShop: [
      { id: "ts_test_logs", itemId: "normal_log", qty: 25, tokenCost: 5 },
      { id: "ts_test_broken", itemId: "__does_not_exist__", qty: 10, tokenCost: 1 },
      // #p13-Regal-Gate-Fixture: ein Angebot hinter einem synthetischen Kapitel-Regal.
      { id: "ts_test_gated", itemId: "normal_log", qty: 5, tokenCost: 3, shelfId: "shelf_test_locked" },
    ],
    tokenShopShelves: [
      { id: "shelf_test_open", name: { en: "Open Shelf", de: "Offenes Regal" }, sortOrder: 0 },
      {
        id: "shelf_test_locked",
        name: { en: "Locked Shelf", de: "Gesperrtes Regal" },
        requiresQuest: "q_first_steps", // reale, im Katalog existierende Quest-ID (Guard-sicher)
        sortOrder: 1,
      },
    ],
  };
}

describe("Token-Shop (buyTokenShopOffer)", () => {
  it("Kauf ok: Tokens abgebucht, Bündel landet als Stack im Inventar", () => {
    const c = tokenShopContent();
    const s = createGame({ name: "Shopper" }, c, 1);
    s.character.questTokens = 12;
    expect(buyTokenShopOffer(s, c, "ts_test_logs").ok).toBe(true);
    expect(s.character.questTokens).toBe(7); // 12 − 5
    expect(itemCount(s.inventory, "normal_log")).toBe(25);
    // Zweiter Kauf stapelt (unbegrenzt oft kaufbar).
    expect(buyTokenShopOffer(s, c, "ts_test_logs").ok).toBe(true);
    expect(s.character.questTokens).toBe(2);
    expect(itemCount(s.inventory, "normal_log")).toBe(50);
  });

  it("zu wenig Tokens: kein Kauf, Reason not_enough_tokens, State unverändert", () => {
    const c = tokenShopContent();
    const s = createGame({ name: "Broke" }, c, 1);
    s.character.questTokens = 4; // Angebot kostet 5
    const res = buyTokenShopOffer(s, c, "ts_test_logs");
    expect(res).toEqual({ ok: false, reason: "not_enough_tokens" });
    expect(s.character.questTokens).toBe(4);
    expect(itemCount(s.inventory, "normal_log")).toBe(0);
  });

  it("unbekannte Offer-ID / kaputte ItemId / fehlender tokenShop: Reason not_found, kein Nebeneffekt", () => {
    const c = tokenShopContent();
    const s = createGame({ name: "Test" }, c, 1);
    s.character.questTokens = 100;
    expect(buyTokenShopOffer(s, c, "ts_nope")).toEqual({ ok: false, reason: "not_found" }); // unbekannte Offer
    expect(buyTokenShopOffer(s, c, "ts_test_broken")).toEqual({ ok: false, reason: "not_found" }); // ItemId nicht im Katalog
    const noShop: ContentDB = { ...content, tokenShop: undefined };
    expect(buyTokenShopOffer(s, noShop, "ts_test_logs")).toEqual({ ok: false, reason: "not_found" }); // Shop fehlt komplett
    expect(s.character.questTokens).toBe(100); // nie abgebucht
    expect(itemCount(s.inventory, "normal_log")).toBe(0);
  });

  it("Regal-Gate (#p13): Kauf vor Kapitel-Abschluss scheitert mit Reason shelf_locked, danach gelingt er", () => {
    const c = tokenShopContent();
    const s = createGame({ name: "Pilger" }, c, 1);
    s.character.questTokens = 100;
    // Gate-Quest noch nicht abgeschlossen → gesperrt, KEINE Abbuchung.
    expect(isShelfOpen(s, c, "shelf_test_locked")).toBe(false);
    expect(buyTokenShopOffer(s, c, "ts_test_gated")).toEqual({ ok: false, reason: "shelf_locked" });
    expect(s.character.questTokens).toBe(100); // unangetastet
    expect(itemCount(s.inventory, "normal_log")).toBe(0);
    // Kapitel abgeschlossen (claimed ODER completed genügt, Muster isZoneUnlocked) → offen, Kauf gelingt.
    s.quests.claimed.push("q_first_steps");
    expect(isShelfOpen(s, c, "shelf_test_locked")).toBe(true);
    expect(buyTokenShopOffer(s, c, "ts_test_gated")).toEqual({ ok: true });
    expect(s.character.questTokens).toBe(97); // 100 − 3
    expect(itemCount(s.inventory, "normal_log")).toBe(5);
  });

  it("Regal-Gate: Angebot ohne shelfId und unbekanntes Regal gelten defensiv als offen", () => {
    const c = tokenShopContent();
    const s = createGame({ name: "Free" }, c, 1);
    expect(isShelfOpen(s, c, undefined)).toBe(true); // kein shelfId → offenes Start-Regal
    expect(isShelfOpen(s, c, "shelf_does_not_exist")).toBe(true); // unbekanntes Regal → defensiv offen
    const noShelves: ContentDB = { ...c, tokenShopShelves: undefined };
    expect(isShelfOpen(s, noShelves, "shelf_test_locked")).toBe(true); // Content ohne Regale → alles offen
  });

  it("volles Inventar ohne Auto-Bank: kein Teil-Verlust — Rollback + Token-Erstattung", () => {
    const c = tokenShopContent();
    const s = createGame({ name: "Full" }, c, 1);
    s.settings.autoBank = false;
    s.character.questTokens = 10;
    // Inventar KOMPLETT mit Fremd-Stacks füllen (kein normal_log-Stack, kein freier Slot).
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (!s.inventory.slots[i]) s.inventory.slots[i] = { itemId: "copper_ore", qty: 1 };
    }
    expect(buyTokenShopOffer(s, c, "ts_test_logs")).toEqual({ ok: false, reason: "no_space" });
    expect(s.character.questTokens).toBe(10); // erstattet
    expect(itemCount(s.inventory, "normal_log")).toBe(0); // kein Teil-Add übrig
    // Platz schaffen → Kauf gelingt regulär.
    s.inventory.slots[0] = null;
    expect(buyTokenShopOffer(s, c, "ts_test_logs").ok).toBe(true);
    expect(s.character.questTokens).toBe(5);
    expect(itemCount(s.inventory, "normal_log")).toBe(25);
  });

  it("Katalog-Guard: echte content.tokenShop-Offers sind konsistent (IDs eindeutig, Items existieren & stackable, Preise 1..25)", () => {
    const offers = content.tokenShop ?? [];
    expect(offers.length).toBeGreaterThanOrEqual(8); // Task #284: 8-12 Erst-Angebote
    const ids = new Set(offers.map((o) => o.id));
    expect(ids.size).toBe(offers.length); // eindeutige Offer-IDs
    for (const o of offers) {
      const item = content.items[o.itemId];
      expect(item, `tokenShop ${o.id}: itemId ${o.itemId} fehlt im Katalog`).toBeDefined();
      expect(item?.stackable, `tokenShop ${o.id}: ${o.itemId} muss stackable sein (Bündel = Stack)`).toBe(true);
      expect(Number.isInteger(o.qty) && o.qty > 0, `tokenShop ${o.id}: qty muss positive Ganzzahl sein`).toBe(true);
      // Preisleitplanke (Chef-Vorgabe): günstig für große Mengen, nichts über 25 Tokens.
      expect(Number.isInteger(o.tokenCost) && o.tokenCost >= 1 && o.tokenCost <= 25, `tokenShop ${o.id}: tokenCost außerhalb 1..25`).toBe(true);
    }
  });
});

// ── Obere Gesamtlevel-Schranke der Daily-Vergabe (Chef-Entscheidung E7, 25.08.2026) ──────────
// Rezension #13: leichte Anfänger-Karten („5 Hühner") liefen für Hochstufige ewig weiter. Content
// trägt je leichter Daily ein `maxTotalLevel`; `isDailyEligible` filtert ÜBER dem Wert. Der Filter
// läuft nach der seeded Mischung → kein neuer RNG-Zug, Saves ohne Schranke würfeln identisch.

describe("Daily-Obergrenze maxTotalLevel (Chef-Entscheidung E7)", () => {
  /** dailyContent() mit Deckel 100 auf allen very_easy-Karten (easy/medium/hard/master ohne). */
  function cappedContent(): ContentDB {
    const c = dailyContent();
    return {
      ...c,
      quests: c.quests.map((q) =>
        q.difficulty === "very_easy" ? { ...q, maxTotalLevel: 100 } : q,
      ),
    };
  }
  function stateAt(c: ContentDB, total: number): GameState {
    const s = createGame({ name: "Cap" }, c, 1);
    s.character.totalLevel = total;
    return s;
  }

  it("isDailyEligible: genau am Deckel noch eligible, eins darüber nicht; ohne Feld nie gedeckelt", () => {
    const c = cappedContent();
    const ve = c.quests.find((q) => q.id === "pool_very_easy_0")!;
    const master = c.quests.find((q) => q.id === "pool_master_0")!;
    expect(isDailyEligible(stateAt(c, 100), c, ve)).toBe(true);
    expect(isDailyEligible(stateAt(c, 101), c, ve)).toBe(false);
    expect(isDailyEligible(stateAt(c, 9999), c, ve)).toBe(false);
    // Kein maxTotalLevel → nur das untere Schwierigkeits-Gate zählt (master ab 300).
    expect(isDailyEligible(stateAt(c, 9999), c, master)).toBe(true);
    expect(isDailyEligible(stateAt(c, 299), c, master)).toBe(false);
  });

  it("über dem Deckel: keine gedeckelte Karte in der Tagesauswahl, trotzdem volle 6", () => {
    const c = cappedContent();
    for (const day of [20260825, 20260826, 20260827, 20260828, 20260829]) {
      const s = stateAt(c, 500);
      expect(refreshDailyQuests(s, c, day)).toBe(true);
      const ids = s.quests.daily.quests.map((d) => d.questId);
      expect(ids.length).toBe(DAILY_QUEST_COUNT);
      expect(ids.some((id) => id.startsWith("pool_very_easy_")), `Tag ${day}: very_easy trotz Deckel`).toBe(false);
    }
  });

  it("Determinismus: unter dem Deckel würfelt gedeckelter Content IDENTISCH zum ungedeckelten (kein neuer RNG-Zug)", () => {
    const plain = dailyContent();
    const capped = cappedContent();
    for (const day of [20260825, 20260826, 20260827, 20260828, 20260829, 20260830, 20260831]) {
      const a = pickDailyQuests(plain, day, 0, stateAt(plain, 50)).map((q) => q.id);
      const b = pickDailyQuests(capped, day, 0, stateAt(capped, 50)).map((q) => q.id);
      expect(b, `Tag ${day}: Auswahl weicht ab`).toEqual(a);
    }
  });

  it("echter Content: Hochstufige (alle Gates offen) ziehen keine very_easy/easy-Karte mehr", () => {
    for (const day of [20260825, 20260826, 20260827, 20260828, 20260829, 20260830, 20260831]) {
      const s = createGame({ name: "Hoch" }, content, 1);
      for (const z of content.zones) if (z.requiresQuest) s.quests.claimed.push(z.requiresQuest);
      for (const d of content.dungeons) if (d.requiresQuest) s.quests.claimed.push(d.requiresQuest);
      for (const id of Object.keys(content.skills)) s.skills[id] = { xp: xpForLevel(40) };
      s.character.totalLevel = totalLevel(s, content); // 20 Skills × 40 = 800
      expect(refreshDailyQuests(s, content, day)).toBe(true);
      const picks = s.quests.daily.quests.map((d) => content.quests.find((q) => q.id === d.questId)!);
      expect(picks.length).toBe(DAILY_QUEST_COUNT);
      for (const q of picks) {
        expect(
          q.difficulty === "very_easy" || q.difficulty === "easy",
          `Tag ${day}: leichte Daily ${q.id} bei Gesamtlevel ${s.character.totalLevel}`,
        ).toBe(false);
        expect(isDailyEligible(s, content, q), `Tag ${day}: ${q.id} nicht eligible`).toBe(true);
      }
    }
  });

  it("echter Content: Tag-1-Stand zieht weiterhin leichte Karten (Deckel greift erst darüber)", () => {
    let seenLight = false;
    for (const day of [20260825, 20260826, 20260827, 20260828, 20260829]) {
      const s = createGame({ name: "Neu" }, content, 1);
      refreshDailyQuests(s, content, day);
      for (const d of s.quests.daily.quests) {
        const q = content.quests.find((x) => x.id === d.questId)!;
        if (q.difficulty === "very_easy" || q.difficulty === "easy") seenLight = true;
      }
    }
    expect(seenLight).toBe(true);
  });
});
