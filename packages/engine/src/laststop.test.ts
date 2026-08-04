import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { addItem } from "./inventory";

// Eine Verarbeitungs-Aktion mit Eingaben auf Startlevel (Kupfer schmelzen, Lvl 1).
const PROCESS_ACTION = "smelt_copper";

describe("lastStop reason tracking", () => {
  it("setzt lastStop, wenn eine Verarbeitung mangels Material endet", () => {
    const s = createGame({ name: "X" }, content, 1);
    const action = content.actions[PROCESS_ACTION]!;
    // Genau eine Charge Material geben → nach 1 Abschluss ist es leer.
    for (const inp of action.inputs ?? []) addItem(s.inventory, content, inp.itemId, inp.qty);

    setActiveAction(s, content, PROCESS_ACTION);
    expect(s.lastStop).toBeNull();

    advance(s, content, action.durationMs * 3); // genug Zeit für >1 Versuch
    expect(s.activeActionId).toBeNull(); // Aktion gestoppt
    expect(s.lastStop).toEqual({ actionId: PROCESS_ACTION, reason: "no_materials" });
  });

  it("verwirft den Hinweis beim Start einer neuen Aktion", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.lastStop = { actionId: PROCESS_ACTION, reason: "no_materials" };
    setActiveAction(s, content, "cut_normal_tree"); // Sammeln ohne Eingaben
    expect(s.lastStop).toBeNull();
  });
});
