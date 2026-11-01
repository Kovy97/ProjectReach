import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame } from "./state";
import { enqueueAction, enqueueFight } from "./actions";
import { startCombat } from "./combat";
import { advance } from "./tick";
import { addItem, itemCount, removeItem } from "./inventory";
import { SLAYER_RETRY_MAX_DEATHS, SLAYER_RETRY_RECOVERY_MS, recordKillForSlayer, slayerRetryAfterDeath } from "./slayer";

/**
 * claude:2026-10-31T13:00:41+01:00 — 1.4.2 Slayer-Neuversuch nach dem Tod (Chef 31.10.2026: „Wenn es ein Slayer-Task ist, soll man
 * es einfach nochmal probieren.“). Tod in einem normalen Kampf gegen das aktuelle Auftragsmonster ⇒ der Kampf startet neu (Queue-
 * Rest an die Front bzw. manueller Kampf als ∞-Eintrag). Nach SLAYER_RETRY_MAX_DEATHS Toden in Folge ohne Auftrags-Kill gilt das
 * alte Verhalten (Eintrag verfällt, Queue macht weiter). Gelände wie fight-queue.test.ts: `bull_boss` (L15) ist für einen
 * frischen L1-Helden ein sicherer Tod, die Weiden sind ungegated.
 *
 * claude:2026-10-31T13:58:31+01:00 — Fix-Welle Befund B1 (Chef-GO): der Tod heilt voll, darum gibt es den Neuversuch nur noch mit Essen
 * im Auto-Essen-Platz und erst nach SLAYER_RETRY_RECOVERY_MS Erholung (Kill-Cooldown des neu gestarteten Kampfs). Der Popup-Hinweis
 * `combat.slayerRetryNote` meldet Neuversuch bzw. Grund des Aufgebens.
 */
const MASTER = "brenna_ashwick";
const FOOD = "cooked_trout";

function doomedHunter(seed: number, food = 0): GameState {
  const s = createGame({ name: "Wagemut", createdAt: 1 }, content, seed);
  s.slayerTask = { masterId: MASTER, monsterId: "bull_boss", isTower: false, required: 5, progress: 0, xpReward: 0, pointReward: 5 };
  if (food > 0) {
    addItem(s.inventory, content, FOOD, food);
    s.character.food = FOOD;
  }
  return s;
}

/** Tick für Tick bis zum nächsten Tod (der Tod-Tick ist der letzte ausgeführte). */
function untilDeath(s: GameState, deaths: number): void {
  let guard = 0;
  while (s.stats.deaths < deaths && guard++ < 100_000) advance(s, content, 100);
  expect(s.stats.deaths, "Tod in der Zeitschranke").toBe(deaths);
}

describe("Slayer-Neuversuch nach dem Tod", () => {
  it("Queue-Kampf mit Essen: neu versuchen, nach der Höchstzahl Tode verfällt der Eintrag, die Queue läuft weiter", () => {
    const s = doomedHunter(23, 200);
    enqueueFight(s, content, "bull_boss", 5);
    enqueueAction(s, content, "cut_normal_tree", 3);
    advance(s, content, 30 * 60_000);
    expect(s.stats.deaths).toBe(SLAYER_RETRY_MAX_DEATHS);
    expect(s.lastQueueSkip).toEqual({ monsterId: "bull_boss", reason: "defeated" });
    expect(s.combat.slayerRetryDeaths).toBeUndefined(); // Serie nach dem Aufgeben zurückgesetzt
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "deaths" });
    expect(s.queueFight).toBeNull();
    expect(itemCount(s.inventory, "normal_log")).toBe(3); // die Aktion dahinter lief danach regulär
    expect(s.actionQueue).toEqual([]);
    expect(s.slayerTask).not.toBeNull(); // der Auftrag selbst bleibt
  });

  it("ohne Essen kein Neuversuch: ein Tod, der Eintrag verfällt, Hinweis noFood", () => {
    const s = doomedHunter(23);
    enqueueFight(s, content, "bull_boss", 5);
    enqueueAction(s, content, "cut_normal_tree", 3);
    advance(s, content, 15 * 60_000);
    expect(s.stats.deaths).toBe(1);
    expect(s.lastQueueSkip).toEqual({ monsterId: "bull_boss", reason: "defeated" });
    expect(s.combat.slayerRetryDeaths).toBeUndefined();
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "noFood" });
    expect(itemCount(s.inventory, "normal_log")).toBe(3);
  });

  it("Essen gewählt, aber aufgebraucht: zählt als kein Essen", () => {
    const s = doomedHunter(28, 3);
    removeItem(s.inventory, FOOD, 3);
    expect(s.character.food).toBe(FOOD);
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(false);
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "noFood" });
  });

  it("manueller Kampf mit Essen: startet neu (als ∞-Eintrag), ruht aber erst SLAYER_RETRY_RECOVERY_MS", () => {
    expect(SLAYER_RETRY_RECOVERY_MS).toBe(30_000);
    const s = doomedHunter(24, 200);
    expect(startCombat(s, content, "bull_boss")).toBe(true);
    untilDeath(s, 1);
    expect(s.combat.monsterId).toBe("bull_boss"); // im selben Tick wieder im Kampf …
    expect(s.combat.cooldownRemainingMs).toBe(SLAYER_RETRY_RECOVERY_MS); // … aber in der Erholung
    expect(s.combat.slayerRetryNote).toEqual({ kind: "retry", attempt: 1, resumeInMs: SLAYER_RETRY_RECOVERY_MS });
    expect(s.queueFight).toEqual({ monsterId: "bull_boss", remaining: null });
    expect(s.combat.slayerRetryDeaths).toBe(1);
    const enemyMax = content.monsters.bull_boss!.maxHp;
    advance(s, content, SLAYER_RETRY_RECOVERY_MS - 100);
    expect(s.combat.cooldownRemainingMs).toBe(100); // ruht noch: kein Schlag gefallen
    expect(s.combat.enemyHp).toBe(enemyMax);
    expect(s.stats.deaths).toBe(1);
    advance(s, content, 100);
    expect(s.combat.cooldownRemainingMs).toBeUndefined();
    advance(s, content, 10_000);
    expect(s.combat.monsterId === null || s.combat.enemyHp < enemyMax || s.stats.deaths > 1).toBe(true); // danach wird gekämpft
    untilDeath(s, 2);
    expect(s.combat.slayerRetryNote).toEqual({ kind: "retry", attempt: 2, resumeInMs: SLAYER_RETRY_RECOVERY_MS });
    untilDeath(s, SLAYER_RETRY_MAX_DEATHS);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.stopReason).toBe("defeated");
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "deaths" });
    expect(s.actionQueue).toEqual([]);
  });

  it("ohne passenden Auftrag bleibt alles beim Alten: ein Tod, der Eintrag verfällt, kein Hinweis", () => {
    const s = createGame({ name: "Wagemut" }, content, 25);
    s.slayerTask = { masterId: MASTER, monsterId: "cow", isTower: false, required: 5, progress: 0, xpReward: 0, pointReward: 5 };
    addItem(s.inventory, content, FOOD, 200);
    s.character.food = FOOD;
    s.combat.slayerRetryNote = { kind: "giveUp", reason: "noFood" }; // alter Hinweis eines früheren Todes
    enqueueFight(s, content, "bull_boss", 5);
    advance(s, content, 30 * 60_000);
    expect(s.stats.deaths).toBe(1);
    expect(s.lastQueueSkip).toEqual({ monsterId: "bull_boss", reason: "defeated" });
    expect(s.combat.slayerRetryNote).toBeUndefined();
  });

  it("offline derselbe Pfad wie online: gleiche Todeszahl, gleicher Zustand, deterministisch", () => {
    const run = (offline: boolean): GameState => {
      const s = doomedHunter(26, 200);
      enqueueFight(s, content, "bull_boss", 5);
      if (offline) advance(s, content, 40 * 60_000, { offline: true });
      else for (let i = 0; i < 40 * 600; i++) advance(s, content, 100);
      return s;
    };
    const off = run(true);
    expect(off.stats.deaths).toBe(SLAYER_RETRY_MAX_DEATHS);
    expect(run(true)).toEqual(off);
    const on = run(false);
    expect(on.stats.deaths).toBe(off.stats.deaths);
    expect(on.rng).toEqual(off.rng);
    expect(on.combat).toEqual(off.combat);
    expect(itemCount(on.inventory, FOOD)).toBe(itemCount(off.inventory, FOOD));
    expect(on.actionQueue).toEqual(off.actionQueue);
    expect(on.lastQueueSkip).toEqual(off.lastQueueSkip);
  });

  it("Zähler und Hinweis: Auftrags-Kill setzt die Serie zurück, fremde Monster und erledigte Aufträge zählen nicht", () => {
    const s = doomedHunter(27, 50);
    expect(slayerRetryAfterDeath(s, content, "cow")).toBe(false); // nicht das Auftragsmonster
    expect(s.combat.slayerRetryDeaths).toBeUndefined();
    expect(s.combat.slayerRetryNote).toBeUndefined();
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(true);
    expect(s.combat.cooldownRemainingMs).toBe(SLAYER_RETRY_RECOVERY_MS);
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(true);
    expect(s.combat.slayerRetryDeaths).toBe(2);
    expect(s.combat.slayerRetryNote).toEqual({ kind: "retry", attempt: 2, resumeInMs: SLAYER_RETRY_RECOVERY_MS });
    recordKillForSlayer(s, content, "bull_boss");
    expect(s.combat.slayerRetryDeaths).toBeUndefined();
    expect(s.combat.slayerRetryNote).toBeUndefined();
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(true); // neue Serie
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(true);
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(false); // dritter Tod in Folge
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "deaths" });
    expect(s.combat.slayerRetryDeaths).toBeUndefined();
    // Nicht (mehr) bekämpfbar: goblin lebt in den Grenzlanden (Kapitel 3), für den frischen Helden gesperrt.
    s.slayerTask = { masterId: MASTER, monsterId: "goblin", isTower: false, required: 5, progress: 0, xpReward: 0, pointReward: 5 };
    expect(slayerRetryAfterDeath(s, content, "goblin")).toBe(false);
    expect(s.combat.slayerRetryNote).toEqual({ kind: "giveUp", reason: "unreachable" });
    s.slayerTask = null;
    expect(slayerRetryAfterDeath(s, content, "bull_boss")).toBe(false);
    expect(s.combat.slayerRetryNote).toBeUndefined();
  });
});
