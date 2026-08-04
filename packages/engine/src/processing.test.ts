import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { xpForLevel } from "./leveling";

function newGame() {
  const s = createGame({ name: "Schmied" }, content, 1);
  s.skills.smithing = { xp: xpForLevel(5) }; // smelt_bronze benötigt Schmieden 5
  return s;
}

describe("processing", () => {
  it("verbraucht Materialien und erzeugt das Produkt", () => {
    const s = newGame();
    addItem(s.inventory, content, "copper_ore", 3);
    addItem(s.inventory, content, "tin_ore", 3);

    setActiveAction(s, content, "smelt_bronze"); // 3 s, 1 Kupfer + 1 Zinn → 1 Barren
    advance(s, content, 9_000); // 3 Abschlüsse

    expect(itemCount(s.inventory, "bronze_bar")).toBe(3);
    expect(itemCount(s.inventory, "copper_ore")).toBe(0);
    expect(itemCount(s.inventory, "tin_ore")).toBe(0);
  });

  it("stoppt die Aktion, wenn Materialien fehlen", () => {
    const s = newGame();
    addItem(s.inventory, content, "copper_ore", 1);
    addItem(s.inventory, content, "tin_ore", 1);

    setActiveAction(s, content, "smelt_bronze");
    advance(s, content, 30_000); // viel Zeit, aber nur 1 Set Material

    expect(itemCount(s.inventory, "bronze_bar")).toBe(1);
    expect(s.activeActionId).toBeNull(); // gestoppt mangels Material
  });

  it("kocht Fisch zu heilendem Essen", () => {
    const s = newGame();
    addItem(s.inventory, content, "raw_shrimp", 2);
    setActiveAction(s, content, "cook_shrimp");
    advance(s, content, 5_000);
    expect(itemCount(s.inventory, "cooked_shrimp")).toBe(2);
    expect(content.items.cooked_shrimp?.healAmount).toBeGreaterThan(0);
  });
});
