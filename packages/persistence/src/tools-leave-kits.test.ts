import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { TOOL_SLOTS } from "@hearthforge/shared";
import { addItem, createGame, equipTool } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * SAVE 87 (Chef-Entscheid 31.08.2026 nach Spieler-Vorschlag „I don't think that we need 3 sets of
 * the same tools"): Werkzeuge gehoeren nicht mehr zum Ausruestungs-Kit. Sie haengen am Charakter
 * und ueberleben jeden Wechsel.
 *
 * Diese Tests pinnen die MIGRATION alter Spielstaende: was in einem inaktiven Kit steckengeblieben
 * ist, muss herauskommen — und zwar verlustfrei (Save-Kompat-Gesetz).
 */

function ladeMitWerkzeugImKit(
  kitWerkzeuge: Record<string, string | null>,
  getrageneWerkzeuge: Record<string, string> = {},
) {
  const s = createGame({ name: "Werkzeug" }, content, 1);
  const roh = JSON.parse(serialize(s, 1000)) as { state: Record<string, unknown>; version: number };
  const kits = roh.state.equipKits as Array<{ equipment: Record<string, string | null> }>;
  for (const [slot, id] of Object.entries(kitWerkzeuge)) kits[1]!.equipment[slot] = id;
  const charEq = (roh.state.character as { equipment: Record<string, string | null> }).equipment;
  for (const [slot, id] of Object.entries(getrageneWerkzeuge)) charEq[slot] = id;
  roh.state.version = 86; // Alt-Save von vor dem Umbau
  roh.version = 86;
  const geladen = deserialize(JSON.stringify(roh), content, 2000);
  expect(geladen).not.toBeNull();
  return geladen!.state;
}

describe("Migration: Werkzeuge verlassen die Kits", () => {
  it("ein Werkzeug aus einem inaktiven Kit landet in einem freien Werkzeug-Slot des Charakters", () => {
    const s = ladeMitWerkzeugImKit({ tool1: "bronze_pickaxe" });
    const getragen = TOOL_SLOTS.map((slot) => s.character.equipment[slot]);
    expect(getragen).toContain("bronze_pickaxe");
    // Und im Kit steckt nichts mehr.
    for (const slot of TOOL_SLOTS) expect(s.equipKits[1]!.equipment[slot]).toBeNull();
  });

  it("mehr Werkzeuge als freie Slots gehen NICHT verloren, sondern in Inventar oder Bank", () => {
    // Alle vier Werkzeug-Slots des Charakters sind BELEGT — was aus dem Kit kommt, findet also
    // keinen Platz mehr am Koerper und muss ueber den Grant-Pfad gerettet werden.
    const s = ladeMitWerkzeugImKit(
      {
        tool1: "bronze_pickaxe",
        tool2: "copper_axe",
        tool3: "crude_fishing_rod",
      },
      {
        tool1: "iron_pickaxe",
        tool2: "crude_sickle",
        tool3: "crude_fishing_rod",
        tool4: "copper_axe",
      },
    );
    expect(TOOL_SLOTS.every((slot) => s.character.equipment[slot])).toBe(true);
    const getragen = TOOL_SLOTS.map((slot) => s.character.equipment[slot]).filter(Boolean);
    const imInventar = s.inventory.slots.filter((sl) => sl !== null).map((sl) => sl!.itemId);
    const inDerBank = Object.keys(s.bank).filter((id) => (s.bank[id] ?? 0) > 0);
    for (const id of ["bronze_pickaxe", "copper_axe", "crude_fishing_rod"]) {
      const irgendwo =
        getragen.includes(id) || imInventar.includes(id) || inDerBank.includes(id);
      expect(irgendwo, `${id} ist verschwunden`).toBe(true);
    }
    for (const slot of TOOL_SLOTS) expect(s.equipKits[1]!.equipment[slot]).toBeNull();
  });

  it("ein zweiter Ladevorgang aendert nichts mehr (idempotent)", () => {
    const s = ladeMitWerkzeugImKit({ tool1: "bronze_pickaxe" });
    const einmal = serialize(s, 3000);
    const nochmal = deserialize(einmal, content, 4000);
    expect(nochmal).not.toBeNull();
    const zweimal = serialize(nochmal!.state, 3000);
    expect(JSON.parse(zweimal).state.character.equipment).toEqual(
      JSON.parse(einmal).state.character.equipment,
    );
  });
});

describe("Werkzeuge und der vierte Slot im laufenden Spiel", () => {
  it("vier Werkzeuge lassen sich gleichzeitig tragen", () => {
    const s = createGame({ name: "Vier" }, content, 1);
    const werkzeuge = ["bronze_pickaxe", "copper_axe", "crude_fishing_rod", "crude_sickle"];
    for (const id of werkzeuge) {
      addItem(s.inventory, content, id, 1);
      expect(equipTool(s, content, id).ok, id).toBe(true);
    }
    const getragen = TOOL_SLOTS.map((slot) => s.character.equipment[slot]);
    for (const id of werkzeuge) expect(getragen).toContain(id);
  });

  it("ein Speicher-Rundlauf haelt alle vier Werkzeuge (Kompat-Gesetz)", () => {
    const s = createGame({ name: "Vier" }, content, 1);
    for (const id of ["bronze_pickaxe", "copper_axe", "crude_fishing_rod", "crude_sickle"]) {
      addItem(s.inventory, content, id, 1);
      equipTool(s, content, id);
    }
    const zurueck = deserialize(serialize(s, 5000), content, 5000);
    expect(zurueck).not.toBeNull();
    expect(TOOL_SLOTS.map((slot) => zurueck!.state.character.equipment[slot])).toEqual(
      TOOL_SLOTS.map((slot) => s.character.equipment[slot]),
    );
  });
});
