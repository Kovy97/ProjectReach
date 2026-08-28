import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState, ItemInstance } from "@hearthforge/shared";
import { EQUIP_KIT_COUNT, EQUIP_SLOTS, SAVE_VERSION, emptyEquipKit } from "@hearthforge/shared";
import { addInstance, addItem, createGame, equipInstance, equipItem, itemCount, switchEquipKit } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Persistenz der Ausrüstungs-KITS (`equipKits` + `activeKit`, SAVE_VERSION 85-Nachtrag, Chef-Entscheid
 * 28.08.2026 — ersetzt die v75-Loadout-Vorlagen `equipLoadouts`):
 *  • Migration v84 → Kits: Vorlage N (1..2) zieht ihre Teile aus dem INVENTAR ins Kit (plain Stück vom
 *    Stapel, Instanz per instanceId mitsamt Affixen); fehlende Teile bleiben leer; Vorlage 0 wird
 *    verworfen (Kit 0 = getragene Ausrüstung); Alt-Saves ohne `equipLoadouts` → Kits 1/2 leer.
 *  • sanitize: Länge exakt 3, activeKit 0..2, nur bekannte + slot-korrekte Items (Rettung), Instanz-
 *    Invariante je Kit, Zweihand ⇒ Offhand leer, Spiegel des aktiven Kits = Charakter, Altfeld weg.
 *  • Round-Trip-Idempotenz (inkl. Instanzen) und serialize-Sync des stale Spiegels.
 * Muster equip-loadouts-persistence.test.ts (v75) / tavern-persistence.test.ts (SaveShape-Handarbeit).
 */

interface SaveShape {
  version: number;
  savedAt: number;
  summary: unknown;
  state: GameState;
}

const SAVED_AT = 1_000_000;

function toSave(s: GameState): SaveShape {
  return JSON.parse(serialize(s, SAVED_AT)) as SaveShape;
}

function load(save: SaveShape): GameState {
  const r = deserialize(JSON.stringify(save), content, save.savedAt);
  expect(r).not.toBeNull();
  return r!.state;
}

function roundTrip(s: GameState): GameState {
  return load(toSave(s));
}

/** v84-Form eines Saves: Kits raus, Vorlagen-Liste rein, Version 84. */
function asV84(save: SaveShape, loadouts: unknown[]): SaveShape {
  const st = save.state as unknown as Record<string, unknown>;
  delete st.equipKits;
  delete st.activeKit;
  st.equipLoadouts = loadouts;
  save.version = 84;
  save.state.version = 84;
  return save;
}

const INST: ItemInstance = {
  instanceId: "inst-kit-42",
  baseItemId: "rusty_sword",
  affixes: [{ affixId: "whetted", tier: 1 }],
};

describe("Migration v84 (Loadout-Vorlagen) → Kits", () => {
  it("Vorlage 1: Teile im Inventar wandern ins Kit (aus dem Inventar entnommen), fehlende bleiben leer; Vorlage 0 wird verworfen", () => {
    const s = createGame({ name: "Alt" }, content, 1);
    addItem(s.inventory, content, "bronze_sword", 1);
    addItem(s.inventory, content, "copper_kiteshield", 2);
    addItem(s.inventory, content, "garnet_ring", 1);
    const save = asV84(toSave(s), [
      { mainhand: { itemId: "copper_spear" } }, // Vorlage 0: verworfen (Kit 0 ist die getragene Ausrüstung)
      {
        mainhand: { itemId: "bronze_sword" },
        offhand: { itemId: "copper_kiteshield" },
        ring1: { itemId: "garnet_ring" },
        helmet: { itemId: "iron_fullhelm" }, // NICHT im Inventar → Platz bleibt leer
      },
      null,
    ]);
    const loaded = load(save);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.activeKit).toBe(0);
    expect(loaded.equipKits).toHaveLength(EQUIP_KIT_COUNT);
    expect((loaded as unknown as { equipLoadouts?: unknown }).equipLoadouts).toBeUndefined();

    // Kit 0 = getragene Ausrüstung (rusty_sword vom Start), NICHT die Vorlage 0.
    expect(loaded.equipKits[0]!.equipment).toEqual(loaded.character.equipment);
    expect(loaded.equipKits[0]!.equipment.mainhand).toBe("rusty_sword");
    expect(itemCount(loaded.inventory, "copper_spear")).toBe(0);
    expect(loaded.bank.copper_spear ?? 0).toBe(0);

    // Kit 1: drei Teile aus dem Inventar, Helm leer.
    const kit1 = loaded.equipKits[1]!;
    expect(kit1.equipment.mainhand).toBe("bronze_sword");
    expect(kit1.equipment.offhand).toBe("copper_kiteshield");
    expect(kit1.equipment.ring1).toBe("garnet_ring");
    expect(kit1.equipment.helmet).toBeNull();
    expect(kit1.equippedInstances).toEqual({});
    // Entnommen: Schwert/Ring weg, vom Schild-Stapel genau EIN Stück.
    expect(itemCount(loaded.inventory, "bronze_sword")).toBe(0);
    expect(itemCount(loaded.inventory, "garnet_ring")).toBe(0);
    expect(itemCount(loaded.inventory, "copper_kiteshield")).toBe(1);
    expect(loaded.equipKits[2]).toEqual(emptyEquipKit());

    // Round-Trip stabil (Migration + sanitize idempotent).
    expect(roundTrip(loaded)).toEqual(loaded);
  });

  it("Instanz per instanceId wandert mitsamt Affixen aus der Tasche ins Kit; verkaufte Instanz → leer, KEIN plain Ersatz", () => {
    const s = createGame({ name: "Inst" }, content, 1);
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    addItem(s.inventory, content, "rusty_sword", 1); // plain Exemplar liegt daneben
    const save = asV84(toSave(s), [
      null,
      { mainhand: { itemId: "rusty_sword", instanceId: "laengst-verkauft" } }, // Instanz weg → leer
      { mainhand: { itemId: "rusty_sword", instanceId: INST.instanceId } },
    ]);
    const loaded = load(save);
    expect(loaded.equipKits[1]!.equipment.mainhand).toBeNull();
    expect(loaded.equipKits[1]!.equippedInstances).toEqual({});
    expect(loaded.equipKits[2]!.equipment.mainhand).toBe("rusty_sword");
    expect(loaded.equipKits[2]!.equippedInstances.mainhand).toEqual(INST);
    // Die Tasche hat die Instanz abgegeben, das plain Schwert liegt weiter im Inventar.
    expect(loaded.inventory.instances).toHaveLength(0);
    expect(itemCount(loaded.inventory, "rusty_sword")).toBe(1);
    expect(roundTrip(loaded)).toEqual(loaded);
  });

  it("zwei Vorlagen mit demselben Stück: die erste bekommt es, die zweite bleibt leer (keine Duplikate)", () => {
    const s = createGame({ name: "Dup" }, content, 1);
    addItem(s.inventory, content, "copper_kiteshield", 1);
    const save = asV84(toSave(s), [
      null,
      { offhand: { itemId: "copper_kiteshield" } },
      { offhand: { itemId: "copper_kiteshield" } },
    ]);
    const loaded = load(save);
    expect(loaded.equipKits[1]!.equipment.offhand).toBe("copper_kiteshield");
    expect(loaded.equipKits[2]!.equipment.offhand).toBeNull();
    expect(itemCount(loaded.inventory, "copper_kiteshield")).toBe(0);
  });

  it("Bank/Gear-Vault werden NICHT angezapft: Teil nur in der Bank → Kit-Platz leer, Bank unverändert", () => {
    const s = createGame({ name: "Bank" }, content, 1);
    s.bank.copper_kiteshield = 1;
    const save = asV84(toSave(s), [null, { offhand: { itemId: "copper_kiteshield" } }, null]);
    const loaded = load(save);
    expect(loaded.equipKits[1]!.equipment.offhand).toBeNull();
    expect(loaded.bank.copper_kiteshield).toBe(1);
  });

  it("Alt-Save ganz ohne `equipLoadouts` (v74-Form): Kit 0 = getragen, Kits 1/2 leer, activeKit 0", () => {
    const s = createGame({ name: "Uralt" }, content, 1);
    const save = asV84(toSave(s), []);
    delete (save.state as unknown as Record<string, unknown>).equipLoadouts;
    save.version = 74;
    save.state.version = 74;
    const loaded = load(save);
    expect(loaded.activeKit).toBe(0);
    expect(loaded.equipKits[0]!.equipment).toEqual(loaded.character.equipment);
    expect(loaded.equipKits[1]).toEqual(emptyEquipKit());
    expect(loaded.equipKits[2]).toEqual(emptyEquipKit());
  });
});

describe("Round-Trip mit umgeschalteten Kits", () => {
  it("aktives Kit 1 mit Speer, Kit 0 mit Set A und verzauberter Instanz überleben serialize/deserialize verlustfrei", () => {
    const s = createGame({ name: "Wechsel" }, content, 1);
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    // Kit 2 bekommt eine verzauberte Instanz.
    expect(switchEquipKit(s, content, 2)).toBe("ok");
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    expect(equipInstance(s, content, INST.instanceId).ok).toBe(true);
    // Kit 1 bekommt den Zweihand-Speer und bleibt aktiv.
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    addItem(s.inventory, content, "copper_spear", 1);
    expect(equipItem(s, content, "copper_spear").ok).toBe(true);

    const loaded = roundTrip(s);
    expect(loaded.activeKit).toBe(1);
    expect(loaded.character.equipment.mainhand).toBe("copper_spear");
    expect(loaded.equipKits[1]!.equipment.mainhand).toBe("copper_spear");
    expect(loaded.equipKits[0]!.equipment.mainhand).toBe("rusty_sword");
    expect(loaded.equipKits[0]!.equipment.offhand).toBe("copper_kiteshield");
    expect(loaded.equipKits[2]!.equipment.mainhand).toBe("rusty_sword");
    expect(loaded.equipKits[2]!.equippedInstances.mainhand).toEqual(INST);
    expect(loaded.inventory.instances).toHaveLength(0);
    expect(roundTrip(loaded)).toEqual(loaded);
    // Zurück zu Kit 2 nach dem Laden: die Instanz sitzt wieder am Körper.
    expect(switchEquipKit(loaded, content, 2)).toBe("ok");
    expect(loaded.character.equippedInstances.mainhand?.instanceId).toBe(INST.instanceId);
  });

  it("serialize synchronisiert den stale Spiegel des aktiven Kits aus dem Charakter", () => {
    const s = createGame({ name: "Stale" }, content, 1);
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    expect(s.equipKits[0]!.equipment.offhand).toBeNull(); // stale — Wahrheit ist character
    const save = toSave(s);
    expect(save.state.equipKits[0]!.equipment.offhand).toBe("copper_kiteshield");
    expect(save.state.equipKits[0]!.equipment).toEqual(save.state.character.equipment);
  });
});

describe("sanitize: Kits gegen den Content härten", () => {
  it("activeKit kaputt (7 / -1 / \"1\" / 1.5) → 0; Länge wird auf EQUIP_KIT_COUNT normiert", () => {
    for (const garbage of [7, -1, "1", 1.5, null, undefined]) {
      const s = createGame({ name: "Editor" }, content, 1);
      const save = toSave(s);
      (save.state as unknown as Record<string, unknown>).activeKit = garbage;
      const loaded = load(save);
      expect(loaded.activeKit, String(garbage)).toBe(0);
      expect(loaded.equipKits).toHaveLength(EQUIP_KIT_COUNT);
    }
    const s2 = createGame({ name: "Editor2" }, content, 1);
    const save2 = toSave(s2);
    (save2.state as unknown as Record<string, unknown>).equipKits = [save2.state.equipKits[0]];
    expect(load(save2).equipKits).toHaveLength(EQUIP_KIT_COUNT);
    const save3 = toSave(createGame({ name: "Editor3" }, content, 1));
    (save3.state as unknown as Record<string, unknown>).equipKits = [
      ...save3.state.equipKits,
      emptyEquipKit(),
      "kaputt",
    ];
    expect(load(save3).equipKits).toHaveLength(EQUIP_KIT_COUNT);
    const save4 = toSave(createGame({ name: "Editor4" }, content, 1));
    (save4.state as unknown as Record<string, unknown>).equipKits = "kaputt";
    const loaded4 = load(save4);
    expect(loaded4.equipKits).toHaveLength(EQUIP_KIT_COUNT);
    expect(loaded4.equipKits[0]!.equipment).toEqual(loaded4.character.equipment);
  });

  it("inaktives Kit: unbekanntes Item → leer; slot-fremdes Item wird in die Bank gerettet; Instanz-Invariante", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    const save = toSave(s);
    const kit1 = emptyEquipKit();
    kit1.equipment.mainhand = "gibt_es_nicht";
    kit1.equipment.helmet = "rusty_sword"; // Waffe im Helm-Slot → Rettung in die Bank
    kit1.equipment.offhand = "copper_kiteshield";
    kit1.equipment.ring1 = "garnet_ring";
    // Instanz passt nicht zum Slot-Item (baseItemId ≠ equipment[slot]) → fliegt.
    kit1.equippedInstances.offhand = { instanceId: "x1", baseItemId: "rusty_sword", affixes: [{ affixId: "whetted", tier: 1 }] };
    // Modifikationslose Instanz = plain → nur equipment[slot] bleibt.
    kit1.equippedInstances.ring1 = { instanceId: "x2", baseItemId: "garnet_ring", affixes: [] };
    save.state.equipKits[1] = kit1;
    const loaded = load(save);
    const k = loaded.equipKits[1]!;
    expect(k.equipment.mainhand).toBeNull();
    expect(k.equipment.helmet).toBeNull();
    expect(loaded.bank.rusty_sword).toBe(1);
    expect(k.equipment.offhand).toBe("copper_kiteshield");
    expect(k.equipment.ring1).toBe("garnet_ring");
    expect(k.equippedInstances).toEqual({});
    expect(roundTrip(loaded)).toEqual(loaded);
  });

  it("inaktives Kit: Zweihand im Mainhand ⇒ Offhand verlustfrei zurück (Grant-Pfad), Slot leer", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    const save = toSave(s);
    const kit2 = emptyEquipKit();
    kit2.equipment.mainhand = "copper_spear";
    kit2.equipment.offhand = "copper_kiteshield";
    save.state.equipKits[2] = kit2;
    const loaded = load(save);
    expect(loaded.equipKits[2]!.equipment.mainhand).toBe("copper_spear");
    expect(loaded.equipKits[2]!.equipment.offhand).toBeNull();
    expect(itemCount(loaded.inventory, "copper_kiteshield") + (loaded.bank.copper_kiteshield ?? 0)).toBe(1);
    expect(roundTrip(loaded)).toEqual(loaded);
  });

  it("Spiegel des aktiven Kits im Save ist stale/kaputt → nach dem Laden exakt der Charakter", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    const save = toSave(s);
    (save.state.equipKits as unknown[])[0] = { equipment: { mainhand: "copper_spear" }, equippedInstances: "kaputt" };
    const loaded = load(save);
    expect(loaded.character.equipment.mainhand).toBe("rusty_sword");
    expect(loaded.equipKits[0]!.equipment).toEqual(loaded.character.equipment);
    expect(loaded.equipKits[0]!.equippedInstances).toEqual({});
    for (const slot of EQUIP_SLOTS) expect(slot in loaded.equipKits[0]!.equipment).toBe(true);
  });

  it("Altfeld `equipLoadouts` auf einem Save MIT Kits fliegt ersatzlos (keine zweite Überführung)", () => {
    const s = createGame({ name: "Editor" }, content, 1);
    addItem(s.inventory, content, "copper_kiteshield", 1);
    const save = toSave(s);
    (save.state as unknown as Record<string, unknown>).equipLoadouts = [null, { offhand: { itemId: "copper_kiteshield" } }, null];
    const loaded = load(save);
    expect((loaded as unknown as { equipLoadouts?: unknown }).equipLoadouts).toBeUndefined();
    expect(loaded.equipKits[1]!.equipment.offhand).toBeNull();
    expect(itemCount(loaded.inventory, "copper_kiteshield")).toBe(1);
    expect(JSON.stringify(serialize(loaded, SAVED_AT))).not.toContain("equipLoadouts");
  });
});
