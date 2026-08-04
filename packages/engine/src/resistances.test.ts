import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { monsterResists } from "./combat";

describe("monster status resistances", () => {
  it("Glutelementar ist immun gegen Brand, aber nicht gegen Frost/Schock", () => {
    const m = content.monsters.ember_elemental!;
    expect(monsterResists(m, "burn")).toBe(true);
    expect(monsterResists(m, "frost")).toBe(false);
    expect(monsterResists(m, "shock")).toBe(false);
  });

  it("Frosthund ist immun gegen Frost", () => {
    expect(monsterResists(content.monsters.frost_hound!, "frost")).toBe(true);
    expect(monsterResists(content.monsters.frost_hound!, "burn")).toBe(false);
  });

  it("Der Letzte Götze ist immun gegen Schock und Gift, aber nicht gegen Feuer/Frost/Blutung", () => {
    // Design-Entscheidung: Vollimmunität auf 2 Typen reduziert (DoT-Builds sollen Endboss
    // herausfordern können — burn/bleed/frost gehen durch, shock/poison bleiben geblockt).
    const boss = content.monsters.last_idol!;
    expect(monsterResists(boss, "shock")).toBe(true);
    expect(monsterResists(boss, "poison")).toBe(true);
    expect(monsterResists(boss, "burn")).toBe(false);
    expect(monsterResists(boss, "frost")).toBe(false);
    expect(monsterResists(boss, "bleed")).toBe(false);
  });

  it("ein gewöhnlicher Gegner ohne resist ist gegen nichts immun", () => {
    const goblin = content.monsters.goblin!;
    expect(monsterResists(goblin, "burn")).toBe(false);
    expect(monsterResists(goblin, "frost")).toBe(false);
    expect(monsterResists(goblin, "shock")).toBe(false);
  });
});
