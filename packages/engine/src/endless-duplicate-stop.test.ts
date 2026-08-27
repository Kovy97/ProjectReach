import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advance } from "./tick";
import { enqueueAction, setActiveAction } from "./actions";
import { xpForLevel } from "./leveling";

/**
 * Bug-Report 27.08.2026 (Spieler, 1.1.1): „Endlosschleife beim Stehlen (Stadtwache) lässt sich bei beiden
 * Spielcharakteren nicht beenden.“ Ursache: Seit die Skill-Karten nur noch EINREIHEN, legte jeder weitere
 * ∞-Klick auf die bereits endlos laufende Aktion still einen zweiten ∞-Eintrag derselben Aktion in die
 * Warteschlange. Nach „Stopp“ startete der Leerlauf-Tick den nächsten ∞-Eintrag sofort wieder — für den
 * Spieler sah das aus wie eine Aktion, die sich nicht beenden lässt.
 *
 * Fix (engine/actions.ts): (1) ∞ auf die laufende ∞-Aktion oder auf einen ∞-Eintrag derselben Aktion am
 * Queue-Ende ist ein No-op; (2) der manuelle Stopp einer endlosen Aktion räumt wartende ∞-Einträge
 * derselben Aktion mit ab (Alt-Saves). Endliche Einträge bleiben.
 */
function thief(): ReturnType<typeof createGame> {
  const s = createGame({ name: "Repro" }, content, 7);
  s.skills.thieving = { xp: xpForLevel(70) };
  return s;
}
const GUARD = "pickpocket_city_guard";

describe("Endlos-Doppel: ∞ derselben Aktion stapelt nicht", () => {
  it("drei ∞-Klicks vor dem Start ergeben EINEN Queue-Eintrag", () => {
    const s = thief();
    expect(enqueueAction(s, content, GUARD, null)).toBe(true);
    expect(enqueueAction(s, content, GUARD, null)).toBe(true);
    expect(enqueueAction(s, content, GUARD, null)).toBe(true);
    expect(s.actionQueue).toHaveLength(1);
  });

  it("∞-Klick auf die bereits endlos laufende Aktion reiht nichts ein", () => {
    const s = thief();
    enqueueAction(s, content, GUARD, null);
    advance(s, content, 1000);
    expect(s.activeActionId).toBe(GUARD);
    expect(s.actionTarget).toBeNull();
    expect(enqueueAction(s, content, GUARD, null)).toBe(true);
    expect(s.actionQueue).toHaveLength(0);
    // Eine ANDERE Aktion oder ein endliches Ziel derselben Aktion bleiben einreihbar.
    expect(enqueueAction(s, content, GUARD, 25)).toBe(true);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: GUARD, target: 25 }]);
  });

  it("Stopp der endlosen Aktion räumt wartende ∞-Doppel derselben Aktion ab (Alt-Save), endliche bleiben", () => {
    const s = thief();
    enqueueAction(s, content, GUARD, null);
    advance(s, content, 1000);
    // Alt-Save-Zustand nachstellen: zwei stille ∞-Doppel + ein endlicher Eintrag + eine fremde Aktion.
    s.actionQueue.push({ kind: "action", actionId: GUARD, target: null });
    s.actionQueue.push({ kind: "action", actionId: GUARD, target: 10 });
    s.actionQueue.push({ kind: "action", actionId: GUARD, target: null });
    s.actionQueue.push({ kind: "action", actionId: "melt_insignia", target: null });
    setActiveAction(s, content, null);
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: GUARD, target: 10 },
      { kind: "action", actionId: "melt_insignia", target: null },
    ]);
    // Der Leerlauf-Tick startet den ENDLICHEN Rest (10×), nicht wieder ∞ — nach dessen Ende ist Ruhe.
    advance(s, content, 1000);
    expect(s.activeActionId).toBe(GUARD);
    expect(s.actionTarget).toBe(10);
  });

  it("Stopp einer ENDLICHEN Aktion lässt die Queue unangetastet", () => {
    const s = thief();
    enqueueAction(s, content, GUARD, 5);
    advance(s, content, 1000);
    s.actionQueue.push({ kind: "action", actionId: GUARD, target: null });
    setActiveAction(s, content, null);
    expect(s.actionQueue).toEqual([{ kind: "action", actionId: GUARD, target: null }]);
  });
});
