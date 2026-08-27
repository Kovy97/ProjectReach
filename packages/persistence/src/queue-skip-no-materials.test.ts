import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { addItem, advanceActionQueue, createGame, enqueueAction } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Warteschlangen-Projektion (Chef-Auftrag 27.08.2026): der Skip-Grund `no_materials` mit `actionId`
 * ist eine reine Union-Erweiterung von `QueueSkip` (KEIN SAVE_VERSION-Bump). Die Persistenz-
 * Whitelist muss ihn (a) durchlassen, solange das Material heute noch fehlt, (b) verwerfen, sobald
 * der Spieler Nachschub hat (Regel „gilt der Grund HEUTE noch?", Spieler-Report 1.0.2), und (c)
 * Garbage (unbekannte Aktion, falscher Grund am actionId-Shape) abweisen.
 */
const SAVED_AT = 1_000_000;

function roundTrip(s: GameState): GameState {
  const r = deserialize(serialize(s, SAVED_AT), content, SAVED_AT);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Skip-Breadcrumb no_materials (Aktions-Eintrag) über Save/Load", () => {
  it("überlebt den Load, solange das Material weiterhin fehlt; mit Nachschub ist er weg", () => {
    const s = createGame({ name: "Projektion" }, content, 3);
    enqueueAction(s, content, "smelt_copper", 650); // kein Erz → der Start überspringt
    expect(advanceActionQueue(s, content)).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "", actionId: "smelt_copper", reason: "no_materials" });

    const stillMissing = roundTrip(s);
    expect(stillMissing.lastQueueSkip).toEqual({ monsterId: "", actionId: "smelt_copper", reason: "no_materials" });

    addItem(stillMissing.inventory, content, "copper_ore", 1);
    const restocked = roundTrip(stillMissing);
    expect(restocked.lastQueueSkip).toBeNull();
    expect(roundTrip(restocked).lastQueueSkip).toBeNull(); // idempotent
  });

  it("Garbage wird abgewiesen: unbekannte Aktion, fremder Grund am actionId-Shape", () => {
    const s = createGame({ name: "Garbage" }, content, 3);
    s.lastQueueSkip = { monsterId: "", actionId: "gibt_es_nicht", reason: "no_materials" };
    expect(roundTrip(s).lastQueueSkip).toBeNull();
    s.lastQueueSkip = { monsterId: "", actionId: "smelt_copper", reason: "gate_locked" };
    expect(roundTrip(s).lastQueueSkip).toBeNull();
    // Aktion ohne Inputs kann nie „keine Materialien" haben → weg.
    s.lastQueueSkip = { monsterId: "", actionId: "cut_normal_tree", reason: "no_materials" };
    expect(roundTrip(s).lastQueueSkip).toBeNull();
  });

  it("quittierter Breadcrumb (×-Klick nullt das Feld) bleibt null; Queue-Einträge bleiben erhalten", () => {
    const s = createGame({ name: "Quittiert" }, content, 3);
    enqueueAction(s, content, "mine_copper", 650);
    enqueueAction(s, content, "smelt_copper", 650); // vorgeplant über die Projektion
    s.lastQueueSkip = { monsterId: "", actionId: "smelt_copper", reason: "no_materials" };
    s.lastQueueSkip = null;
    const r = roundTrip(s);
    expect(r.lastQueueSkip).toBeNull();
    expect(r.actionQueue).toEqual([
      { kind: "action", actionId: "mine_copper", target: 650 },
      { kind: "action", actionId: "smelt_copper", target: 650 },
    ]);
  });
});
