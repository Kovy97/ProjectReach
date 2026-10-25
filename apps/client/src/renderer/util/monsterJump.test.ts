// claude:2026-10-25T13:11:00+01:00 — 1.4.1 B1 Nachprüfung: Der Champion-Sprung versprach einen Rückfall auf die Karte des
// Grundmonsters, falls der Champion beim Klick schon verschwunden ist. Der Spielstand kennt die Variante dann nicht mehr,
// deshalb reicht der Aufrufer (Champion-Fenster, Champion-Toast) das Grundmonster jetzt mit.
import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import {
  consumeEliteJumpFallback,
  consumeEliteJumpTarget,
  consumeMonsterJumpTarget,
  getMonsterJumpNav,
  jumpToElite,
  jumpToMonster,
} from "./monsterJump";

const variant = Object.values(content.elites ?? {})[0]!;

describe("monsterJump: Champion-Sprung mit Rückfall", () => {
  it("merkt Zone und Grundmonster vor, beides ist genau einmal abholbar", () => {
    const before = getMonsterJumpNav()?.nonce ?? 0;
    jumpToElite(variant.zone, variant.baseMonsterId);
    expect(getMonsterJumpNav()).toEqual({ pageId: "combat", nonce: before + 1 });
    expect(consumeEliteJumpTarget()).toBe(variant.zone);
    expect(consumeEliteJumpFallback()).toBe(variant.baseMonsterId);
    expect(consumeEliteJumpTarget()).toBeNull();
    expect(consumeEliteJumpFallback()).toBeNull();
  });

  it("ohne oder mit unbekanntem Grundmonster gibt es keinen Rückfall", () => {
    jumpToElite(variant.zone);
    expect(consumeEliteJumpFallback()).toBeNull();
    jumpToElite(variant.zone, "gibt_es_nicht");
    expect(consumeEliteJumpFallback()).toBeNull();
    consumeEliteJumpTarget();
  });

  it("ein späterer Monster-Sprung verwirft Champion-Ziel und Rückfall", () => {
    jumpToElite(variant.zone, variant.baseMonsterId);
    jumpToMonster(variant.baseMonsterId);
    expect(consumeEliteJumpTarget()).toBeNull();
    expect(consumeEliteJumpFallback()).toBeNull();
    expect(consumeMonsterJumpTarget()).toBe(variant.baseMonsterId);
  });

  it("unbekannte Zone ist ein No-op", () => {
    const before = getMonsterJumpNav();
    jumpToElite("keine_zone", variant.baseMonsterId);
    expect(getMonsterJumpNav()).toBe(before);
    expect(consumeEliteJumpTarget()).toBeNull();
    expect(consumeEliteJumpFallback()).toBeNull();
  });
});
