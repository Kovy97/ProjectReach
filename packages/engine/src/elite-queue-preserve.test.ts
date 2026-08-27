import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB } from "@hearthforge/shared";
import { TICK_MS } from "@hearthforge/shared";
import { createGame } from "./state";
import { step } from "./tick";
import { advanceActionQueue, enqueueFight, setActiveAction } from "./actions";
import { startEliteCombat } from "./elites";

/**
 * Spieler-Feedback 27.08.2026: „Champions and Queues — there's gotta be a way to fight a champion
 * without messing up your queue. Shift click doesn't shoot it to the top like on anything else."
 * Ein Champion-Kampf ist jetzt ein Prioritäts-Start: laufende Aktion oder laufender Queue-Kampf
 * wandern mit ihrem Rest an die Queue-Front und laufen nach dem Kill weiter.
 */
const TEST_VARIANT = {
  id: "test_elite_pastures_queue",
  zone: "pastures",
  baseMonsterId: "chicken",
  name: { en: "Test Elite Chicken" },
  statMults: { hp: 5, damage: 1.2 },
  uniqueItemId: "rusty_sword",
  uniqueDropChance: 1,
  uniqueSuffixChance: 1,
} as const;
const TEST_CONTENT: ContentDB = { ...content, elites: { [TEST_VARIANT.id]: TEST_VARIANT } };

function mitAktivemChampion() {
  const s = createGame({ name: "Elite" }, TEST_CONTENT, 1);
  s.eliteZones.pastures = { cooldownMs: TICK_MS };
  step(s, TEST_CONTENT, false); // spawnt die Variante in den Weiden
  expect("variantId" in s.eliteZones.pastures).toBe(true);
  return s;
}

describe("Champion-Kampf verwirft die Warteschlange nicht", () => {
  it("laufende Aktion mit endlichem Ziel wandert mit Rest an die Queue-Front", () => {
    const s = mitAktivemChampion();
    setActiveAction(s, TEST_CONTENT, "mine_copper", 5);
    expect(s.activeActionId).toBe("mine_copper");
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(true);
    expect(s.combat.eliteVariantId).toBe(TEST_VARIANT.id);
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue[0]).toMatchObject({ kind: "action", actionId: "mine_copper", target: 5 });
  });

  it("laufender Warteschlangen-Kampf wandert mit Rest-Kills an die Front, Champion startet sofort", () => {
    const s = mitAktivemChampion();
    enqueueFight(s, TEST_CONTENT, "chicken", 10);
    advanceActionQueue(s, TEST_CONTENT);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.queueFight?.remaining).toBe(10);
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(true);
    expect(s.combat.eliteVariantId).toBe(TEST_VARIANT.id);
    expect(s.queueFight).toBeNull();
    expect(s.actionQueue[0]).toMatchObject({ kind: "fight", monsterId: "chicken", target: 10 });
  });

  it("ein bereits laufender Champion-Kampf bleibt gesperrt", () => {
    const s = mitAktivemChampion();
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(true);
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(false);
  });

  it("nach dem Champion-Kill läuft der zurückgestellte Warteschlangen-Kampf von selbst weiter", () => {
    const s = mitAktivemChampion();
    enqueueFight(s, TEST_CONTENT, "chicken", 10);
    advanceActionQueue(s, TEST_CONTENT);
    expect(startEliteCombat(s, TEST_CONTENT, "pastures")).toBe(true);
    let guard = 0;
    while (s.combat.eliteVariantId && guard++ < 5000) step(s, TEST_CONTENT, false);
    expect(s.combat.eliteVariantId).toBeFalsy();
    // Die Queue zieht nach: der Hühnchen-Auftrag läuft wieder (oder steht unmittelbar vorn).
    const resumed = s.combat.monsterId === "chicken" || s.actionQueue[0]?.monsterId === "chicken";
    expect(resumed).toBe(true);
  });
});
