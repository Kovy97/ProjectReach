import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { grantAllZones } from "./test-helpers";
import { advance } from "./tick";
import { enqueueAction, enqueueFightAtFront, setActiveAction } from "./actions";
import { startCombat } from "./combat";

/**
 * Chef-Report 25.08.2026: "wenn ich zb einen Kampf da rein force (einen Champion zb), hat es mir
 * einen ganzen Auftrag aus der Queue geloescht."
 *
 * Reproduziert am Bestiarium-Pfad: die Seite ruft `startCombat` DIREKT, vorbei an der Warteschlange.
 * `startCombat` nullte die laufende Aktion, ohne sie zurueckzustellen — ein Auftrag "x25" war weg,
 * und `actionTarget` blieb als 25 haengen. Der Queue-Pfad (`insertQueueEntryAtFront`) machte es
 * richtig. Seit dem Fix rettet `startCombat` selbst jeden ENDLICHEN Auftrag an die Queue-Front.
 */
function game() {
  const s = createGame({ name: "Erzwungen" }, content, 1);
  grantAllZones(s, content);
  for (const id of Object.keys(s.skills)) s.skills[id] = { xp: 5_000_000 };
  return s;
}
const holzfaellen = (): string =>
  Object.values(content.actions).find((a) => !a.inputs?.length && a.skill === "woodcutting")!.id;

describe("erzwungener Kampf verschluckt keinen endlichen Auftrag", () => {
  it("Direktstart (Bestiarium): die laufende Aktion x25 wandert mit Rest an die Queue-Front", () => {
    const s = game();
    const act = holzfaellen();
    setActiveAction(s, content, act, 25);
    enqueueAction(s, content, act, 5);

    expect(startCombat(s, content, "chicken")).toBe(true);
    expect(s.activeActionId).toBeNull();
    expect(s.actionTarget).toBeNull(); // Invariante: kein haengendes Ziel mehr
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: act, target: 25 }, // gerettet, VOR dem bereits Wartenden
      { kind: "action", actionId: act, target: 5 },
    ]);
  });

  it("nach dem erzwungenen Kampf laeuft der gerettete Auftrag von selbst weiter", () => {
    const s = game();
    const act = holzfaellen();
    setActiveAction(s, content, act, 25);
    startCombat(s, content, "chicken");
    // Kampf hart beenden wie ein Sieg ohne Folgeziel: monsterId null, dann tickt die Queue.
    s.combat.monsterId = null;
    advance(s, content, 200);
    expect(s.activeActionId).toBe(act);
    expect(s.actionTarget).toBe(25);
    expect(s.actionQueue).toEqual([]);
  });

  it("eine ENDLOSE Aktion wird beim Direktstart bewusst NICHT zurueckgestellt (Aktivitaetswechsel)", () => {
    const s = game();
    setActiveAction(s, content, holzfaellen(), null);
    startCombat(s, content, "chicken");
    expect(s.activeActionId).toBeNull();
    expect(s.actionQueue).toEqual([]);
  });

  it("Queue-Pfad (Shift-Klick) bleibt unveraendert: keine Doppel-Rueckstellung", () => {
    const s = game();
    const act = holzfaellen();
    setActiveAction(s, content, act, 25);
    enqueueAction(s, content, act, 5);
    expect(enqueueFightAtFront(s, content, "chicken", 3)).toBe(true);
    // insertQueueEntryAtFront stellt zurueck und nullt activeActionId, BEVOR startCombat laeuft —
    // der neue Schutz in startCombat sieht also nichts Laufendes mehr und legt nichts doppelt an.
    expect(s.actionQueue).toEqual([
      { kind: "action", actionId: act, target: 25 },
      { kind: "action", actionId: act, target: 5 },
    ]);
    expect(s.queueFight).toEqual({ monsterId: "chicken", remaining: 3 });
  });
});
