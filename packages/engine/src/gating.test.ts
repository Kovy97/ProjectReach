import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { actionLevelMet, setActiveAction } from "./actions";
import { xpForLevel } from "./leveling";

describe("action level gating", () => {
  it("blockiert Aktionen unter dem benötigten Level", () => {
    const s = createGame({ name: "Sim" }, content, 1);
    // forge_steel_battleaxe braucht Schmieden 21
    expect(actionLevelMet(s, content, "forge_steel_battleaxe")).toBe(false);
    setActiveAction(s, content, "forge_steel_battleaxe");
    expect(s.activeActionId).toBeNull();
  });

  it("erlaubt Aktionen auf dem Startlevel weiterhin", () => {
    const s = createGame({ name: "Sim" }, content, 1);
    setActiveAction(s, content, "smelt_copper"); // levelRequired 1
    expect(s.activeActionId).toBe("smelt_copper");
  });

  it("erlaubt die Aktion ab dem benötigten Level", () => {
    const s = createGame({ name: "Sim" }, content, 1);
    s.skills.smithing = { xp: xpForLevel(21) };
    expect(actionLevelMet(s, content, "forge_steel_battleaxe")).toBe(true);
    setActiveAction(s, content, "forge_steel_battleaxe");
    expect(s.activeActionId).toBe("forge_steel_battleaxe");
  });
});
