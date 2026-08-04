import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { bestToolSpeed } from "./tools";
import { xpForLevel } from "./leveling";

describe("mining expansion", () => {
  it("jede Erz-Ader ist gegated und liefert garantiert ihr Erz", () => {
    const mining = Object.values(content.actions).filter((a) => a.skill === "mining");
    expect(mining.length).toBeGreaterThanOrEqual(8);
    for (const a of mining) {
      expect(a.levelRequired, `${a.id} ohne levelRequired`).toBeGreaterThanOrEqual(1);
      expect(a.loot[0]?.chance, `${a.id} Erz nicht garantiert`).toBe(1);
    }
  });

  it("eine Spitzhacke beschleunigt den Abbau (mehr Erz pro Zeit)", () => {
    const copperMined = (withPick: boolean): number => {
      const s = createGame({ name: "X" }, content, 7);
      if (withPick) addItem(s.inventory, content, "bronze_pickaxe", 1);
      setActiveAction(s, content, "mine_copper");
      advance(s, content, 60_000);
      return itemCount(s.inventory, "copper_ore");
    };
    const base = copperMined(false);
    const fast = copperMined(true);
    expect(base).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(base);
  });

  it("bestToolSpeed wirkt nur bei passender Fertigkeit und erfüllten Anforderungen", () => {
    const s = createGame({ name: "X" }, content, 1);
    expect(bestToolSpeed(s, content, "mining")).toBe(1);

    addItem(s.inventory, content, "bronze_pickaxe", 1); // keine Anforderung
    expect(bestToolSpeed(s, content, "mining")).toBeLessThan(1);
    expect(bestToolSpeed(s, content, "woodcutting")).toBe(1); // Spitzhacke hilft Holzfällen nicht

    // Eisen-Spitzhacke braucht Bergbau 10 → auf Level 1 nicht nutzbar.
    const s2 = createGame({ name: "X" }, content, 1);
    addItem(s2.inventory, content, "iron_pickaxe", 1);
    expect(bestToolSpeed(s2, content, "mining")).toBe(1);
  });

  it("Stahl schmelzen verbraucht Eisen UND Kohle", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.smithing = { xp: xpForLevel(20) }; // smelt_steel benötigt Schmieden 20
    addItem(s.inventory, content, "iron_ore", 5);
    addItem(s.inventory, content, "coal", 5);

    setActiveAction(s, content, "smelt_steel");
    advance(s, content, 20_000);

    expect(itemCount(s.inventory, "steel_bar")).toBeGreaterThan(0);
    expect(itemCount(s.inventory, "iron_ore")).toBeLessThan(5);
    expect(itemCount(s.inventory, "coal")).toBeLessThan(5);
  });
});
