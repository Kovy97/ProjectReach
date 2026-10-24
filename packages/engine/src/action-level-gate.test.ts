import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advanceActionQueue } from "./actions";
import { advance } from "./tick";
import { itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

/**
 * claude:2026-10-24T15:21:04+02:00 — Level-Tor der laufenden Aktion (QA-Runde 2 Spielstände B1/B3). `setActiveAction` lehnt eine Aktion
 * über dem eigenen Skill-Level ab; der Tick prüft dasselbe vor jedem Abschluss (online wie offline), und die Warteschlange überspringt
 * einen zu hohen Eintrag MIT Grund `level_too_low`. Nichts wird produziert, Bestand und XP bleiben.
 */
const HIGH = "fletch_godiron_shortbow"; // Bognerei 99
const OUT = content.actions[HIGH]!.loot[0]!.itemId;

function bowyer() {
  const s = createGame({ name: "Bogner" }, content, 5);
  s.skills.leatherworking = { xp: xpForLevel(99) };
  for (const inp of content.actions[HIGH]!.inputs ?? []) s.bank[inp.itemId] = 100;
  return s;
}

describe("Level-Tor im Tick", () => {
  for (const offline of [false, true]) {
    it(`laufende Aktion über dem Level endet im ersten Tick mit Grund level_too_low (${offline ? "offline" : "online"})`, () => {
      const s = bowyer();
      s.activeActionId = HIGH; // wie ein Alt-Save, der vor dem Umzug in die Bognerei mitten im Bogenbau gespeichert wurde
      s.actionTarget = 4;
      advance(s, content, 60_000, offline ? { offline: true } : { nowMs: 1_761_000_000_000 });
      expect(s.activeActionId).toBeNull();
      expect(s.actionTarget).toBeNull();
      expect(s.lastStop).toEqual({ actionId: HIGH, reason: "level_too_low" });
      expect(s.skills.bowcraft?.xp ?? 0).toBe(0);
      expect(s.stats.producedById?.[OUT] ?? 0).toBe(0);
      expect(itemCount(s.inventory, OUT) + (s.bank[OUT] ?? 0)).toBe(0);
      for (const inp of content.actions[HIGH]!.inputs ?? []) expect(s.bank[inp.itemId]).toBe(100);
    });
  }

  it("statt zu stoppen schaltet die Warteschlange zum nächsten gültigen Eintrag", () => {
    const s = bowyer();
    s.activeActionId = HIGH;
    s.actionQueue = [{ kind: "action", actionId: "cut_normal_tree", target: 2 }];
    advance(s, content, 200);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.actionQueue).toEqual([]);
    expect(s.skills.bowcraft?.xp ?? 0).toBe(0);
  });
});

describe("Level-Tor in der Warteschlange", () => {
  it("ein Eintrag über dem Level wird mit Grund übersprungen, der nächste startet", () => {
    const s = bowyer();
    s.actionQueue = [
      { kind: "action", actionId: HIGH, target: 5 },
      { kind: "action", actionId: "cut_normal_tree", target: null },
    ];
    expect(advanceActionQueue(s, content)).toBe(true);
    expect(s.activeActionId).toBe("cut_normal_tree");
    expect(s.lastQueueSkip).toEqual({ monsterId: "", actionId: HIGH, reason: "level_too_low" });
  });
});
