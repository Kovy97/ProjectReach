import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { EquipLoadout, GameState } from "@hearthforge/shared";
import { EQUIP_LOADOUT_COUNT } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz der Ausrüstungs-Loadouts (`equipLoadouts`, SAVE_VERSION 74→75, Task #349):
 * Migration (Alt-Save-Defaults), Round-Trip-Idempotenz befüllter Loadouts (inkl. Instanz-
 * Referenzen) und die sanitize-Härtung (fixe Länge, nur LOADOUT_SLOTS-Keys, Unknown-Id-Strip,
 * kaputte instanceId-Typen degradieren zum plain Eintrag). Muster elite-kill-breadcrumb-
 * persistence.test.ts.
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

/** Ein legitimes, befülltes Loadout (reale Content-Items, eine Instanz-Referenz). */
function validLoadout(): EquipLoadout {
  return {
    mainhand: { itemId: "rusty_sword", instanceId: "inst-42" },
    offhand: { itemId: "copper_kiteshield" },
    ring1: { itemId: "garnet_ring" },
  };
}

describe("Ausrüstungs-Loadouts — Migration v74→v75", () => {
  it("Alt-Save ohne das Feld (v74-Shape): equipLoadouts = [null, null, null]", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    delete (s as Partial<GameState>).equipLoadouts;
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts).toEqual([null, null, null]);
  });

  it("frischer Save (createGame): [null, null, null] in fixer Länge", () => {
    const s = createGame({ name: "Neu" }, content, 1);
    expect(s.equipLoadouts).toEqual([null, null, null]);
    expect(s.equipLoadouts.length).toBe(EQUIP_LOADOUT_COUNT);
  });
});

describe("Ausrüstungs-Loadouts — Round-Trip", () => {
  it("erhält befüllte Loadouts verlustfrei (idempotent), null-Slots bleiben null", () => {
    const s = createGame({ name: "Presets" }, content, 1);
    s.equipLoadouts = [validLoadout(), null, {}]; // {} = „nackt gespeichert" ist legitim
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts).toEqual([validLoadout(), null, {}]);
    const again = roundTrip(loaded);
    expect(again.equipLoadouts).toEqual(loaded.equipLoadouts);
  });

  it("Instanz-Referenz (instanceId) überlebt den Round-Trip auch OHNE existierende Instanz — ob sie noch im Besitz ist, prüft erst applyLoadout", () => {
    const s = createGame({ name: "Inst" }, content, 1);
    s.equipLoadouts = [{ mainhand: { itemId: "rusty_sword", instanceId: "laengst-verkauft" } }, null, null];
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts[0]!.mainhand).toEqual({
      itemId: "rusty_sword",
      instanceId: "laengst-verkauft",
    });
  });
});

describe("Ausrüstungs-Loadouts — sanitize-Härtung", () => {
  it("kaputtes Gesamt-Shape (kein Array/String/Objekt) → [null, null, null], kein Crash", () => {
    for (const garbage of ["kaputt", 42, { mainhand: {} }, null]) {
      const s = createGame({ name: "Editor" }, content, 1);
      (s as unknown as { equipLoadouts: unknown }).equipLoadouts = garbage;
      const loaded = roundTrip(s);
      expect(loaded.equipLoadouts, JSON.stringify(garbage)).toEqual([null, null, null]);
    }
  });

  it("Länge wird auf EQUIP_LOADOUT_COUNT normiert: Überhang gekappt, fehlende Slots → null", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s as unknown as { equipLoadouts: unknown }).equipLoadouts = [validLoadout()];
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts.length).toBe(EQUIP_LOADOUT_COUNT);
    expect(loaded.equipLoadouts[0]).toEqual(validLoadout());
    expect(loaded.equipLoadouts[1]).toBeNull();
    expect(loaded.equipLoadouts[2]).toBeNull();

    const s2 = createGame({ name: "Editor2" }, content, 1);
    (s2 as unknown as { equipLoadouts: unknown }).equipLoadouts = [null, null, null, validLoadout(), {}];
    const loaded2 = roundTrip(s2);
    expect(loaded2.equipLoadouts.length).toBe(EQUIP_LOADOUT_COUNT);
  });

  it("unbekannte itemIds werden gestrippt (Unknown-Id-Strip), valide Einträge desselben Loadouts bleiben", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    s.equipLoadouts = [
      {
        mainhand: { itemId: "rusty_sword" },
        offhand: { itemId: "gibt_es_nicht" },
      },
      null,
      null,
    ];
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts[0]).toEqual({ mainhand: { itemId: "rusty_sword" } });
  });

  it("Fremd-Keys (Werkzeug-Slots, erfundene Slots) fliegen; ein Array-Loadout → null", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s as unknown as { equipLoadouts: unknown }).equipLoadouts = [
      {
        mainhand: { itemId: "rusty_sword" },
        tool1: { itemId: "bronze_pickaxe" }, // Werkzeuge sind kein Loadout-Bestandteil
        fantasieslot: { itemId: "rusty_sword" },
      },
      ["kein", "objekt"],
      null,
    ];
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts[0]).toEqual({ mainhand: { itemId: "rusty_sword" } });
    expect(loaded.equipLoadouts[1]).toBeNull();
  });

  it("kaputte instanceId-Typen (Zahl/leerer String) degradieren zum plain Eintrag", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    (s as unknown as { equipLoadouts: unknown }).equipLoadouts = [
      {
        mainhand: { itemId: "rusty_sword", instanceId: 42 },
        offhand: { itemId: "copper_kiteshield", instanceId: "" },
      },
      null,
      null,
    ];
    const loaded = roundTrip(s);
    expect(loaded.equipLoadouts[0]).toEqual({
      mainhand: { itemId: "rusty_sword" },
      offhand: { itemId: "copper_kiteshield" },
    });
  });
});
