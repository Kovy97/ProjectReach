import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ItemInstance } from "@hearthforge/shared";
import { EQUIP_KIT_COUNT, EQUIP_SLOTS, emptyEquipKit } from "@hearthforge/shared";
import { computeStats } from "./character";
import { addInstance, addItem, itemCount } from "./inventory";
import { equipInstance, equipItem, equipTool, unequipItem } from "./equipment";
import { isValidKitIndex, kitSummary, switchEquipKit, syncActiveKit } from "./loadouts";
import { createGame } from "./state";

/**
 * Ausrüstungs-KITS 1/2/3 (SAVE_VERSION 85, Chef-Entscheid 28.08.2026 — „3 separate equipment kits,
 * not unequip/equip modes, just swap"): Umschalten außerhalb/innerhalb des Kampfes, Set-Tausch mit
 * Instanzen (Verzauberung reist mit), equip/unequip wirken aufs aktive Kit, Stats ändern sich beim
 * Wechsel, Werkzeuge tauschen mit, nichts wandert ins Inventar, RNG-Freiheit.
 */

/** Frischer Melee-Spielstand (rusty_sword direkt ausgerüstet, Kit 0 aktiv). */
function makeState() {
  return createGame({ name: "Kits" }, content, 1);
}

/** Kit 0 mit Set A bestücken: rusty_sword (Start) + Schild + Ring. */
function equipSetA(s: ReturnType<typeof makeState>) {
  addItem(s.inventory, content, "copper_kiteshield", 1);
  addItem(s.inventory, content, "garnet_ring", 1);
  expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
  expect(equipItem(s, content, "garnet_ring").ok).toBe(true);
}

const INST: ItemInstance = {
  instanceId: "tst-kit-1",
  baseItemId: "rusty_sword",
  affixes: [{ affixId: "whetted", tier: 1 }],
};

describe("createGame: drei Kits, Kit 0 aktiv und Spiegel der Start-Ausrüstung", () => {
  it("Länge EQUIP_KIT_COUNT, activeKit 0, Kit 0 = Start-Ausrüstung, Kits 1/2 leer", () => {
    const s = makeState();
    expect(s.equipKits).toHaveLength(EQUIP_KIT_COUNT);
    expect(s.activeKit).toBe(0);
    expect(s.equipKits[0]!.equipment).toEqual(s.character.equipment);
    expect(s.equipKits[0]!.equipment.mainhand).toBe("rusty_sword");
    expect(s.equipKits[1]).toEqual(emptyEquipKit());
    expect(s.equipKits[2]).toEqual(emptyEquipKit());
    // Spiegel ist eine KOPIE, kein Alias (Mutation des Spiegels darf die Wahrheit nicht berühren).
    expect(s.equipKits[0]!.equipment).not.toBe(s.character.equipment);
    expect(isValidKitIndex(0) && isValidKitIndex(2)).toBe(true);
    expect(isValidKitIndex(3) || isValidKitIndex(-1) || isValidKitIndex(1.5)).toBe(false);
  });
});

describe("switchEquipKit: ganzes Set tauscht, nichts wandert ins Inventar", () => {
  it("Kit 0 (Set A) → Kit 1 (leer) → Speer anlegen → zurück zu Kit 0: beide Sets bleiben exakt erhalten", () => {
    const s = makeState();
    equipSetA(s);
    const invBefore = JSON.stringify(s.inventory);

    expect(switchEquipKit(s, content, 1)).toBe("ok");
    expect(s.activeKit).toBe(1);
    // Charakter trägt jetzt das leere Kit 1 — ALLE Slots leer, keine Instanzen.
    for (const slot of EQUIP_SLOTS) expect(s.character.equipment[slot]).toBeNull();
    expect(s.character.equippedInstances).toEqual({});
    // Set A liegt im Kit 0, NICHT im Inventar (kein Umzug, kein Verbrauch).
    expect(s.equipKits[0]!.equipment.mainhand).toBe("rusty_sword");
    expect(s.equipKits[0]!.equipment.offhand).toBe("copper_kiteshield");
    expect(s.equipKits[0]!.equipment.ring1).toBe("garnet_ring");
    expect(JSON.stringify(s.inventory)).toBe(invBefore);
    expect(itemCount(s.inventory, "copper_kiteshield")).toBe(0);

    // Im aktiven Kit 1 einen Zweihand-Speer anlegen (normaler Equip-Pfad).
    addItem(s.inventory, content, "copper_spear", 1);
    expect(equipItem(s, content, "copper_spear").ok).toBe(true);
    expect(s.character.equipment.mainhand).toBe("copper_spear");

    // Zurück zu Kit 0: Set A komplett wieder am Körper, der Speer bleibt in Kit 1.
    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(s.activeKit).toBe(0);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
    expect(s.character.equipment.ring1).toBe("garnet_ring");
    expect(s.equipKits[1]!.equipment.mainhand).toBe("copper_spear");
    expect(s.equipKits[1]!.equipment.offhand).toBeNull();
    expect(itemCount(s.inventory, "copper_spear")).toBe(0);
    expect(JSON.stringify(s.inventory)).toBe(invBefore);
  });

  it("Stats ändern sich mit dem Kit (computeStats-Cache invalidiert von selbst) und kehren exakt zurück", () => {
    const s = makeState();
    equipSetA(s);
    const statsA = computeStats(s, content);
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    const statsEmpty = computeStats(s, content);
    // Nackt (Kit 1) schlägt schwächer zu als mit Schwert+Schild+Ring (Kit 0).
    expect(statsEmpty.attackDamageMax).toBeLessThan(statsA.attackDamageMax);
    expect(statsEmpty).not.toEqual(statsA);
    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(computeStats(s, content)).toEqual(statsA);
  });

  it("\"same\" bei aktivem Index (No-op), \"invalid\" bei 3/-1/1.5 — State unangetastet", () => {
    const s = makeState();
    equipSetA(s);
    const before = JSON.stringify(s);
    expect(switchEquipKit(s, content, 0)).toBe("same");
    expect(switchEquipKit(s, content, 3)).toBe("invalid");
    expect(switchEquipKit(s, content, -1)).toBe("invalid");
    expect(switchEquipKit(s, content, 1.5)).toBe("invalid");
    expect(JSON.stringify(s)).toBe(before);
    expect(s.activeKit).toBe(0);
  });

  it("Kampf-Gate: im laufenden Kampf (combat.monsterId gesetzt) → \"in_combat\", nichts passiert; \"same\" bleibt \"same\"", () => {
    const s = makeState();
    equipSetA(s);
    s.combat.monsterId = Object.keys(content.monsters)[0]!;
    s.combat.enemyHp = 5;
    const before = JSON.stringify(s);
    expect(switchEquipKit(s, content, 1)).toBe("in_combat");
    expect(JSON.stringify(s)).toBe(before);
    expect(s.activeKit).toBe(0);
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
    expect(switchEquipKit(s, content, 0)).toBe("same");
    // Kampf vorbei → Wechsel erlaubt.
    s.combat.monsterId = null;
    expect(switchEquipKit(s, content, 1)).toBe("ok");
  });

  it("hp/ward werden beim Wechsel nur GESENKT (≤ neues Maximum), nie geheilt", () => {
    const s = makeState();
    equipSetA(s);
    s.character.hp = 1;
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    expect(s.character.hp).toBe(1);
    const stats = computeStats(s, content);
    expect(s.character.hp).toBeLessThanOrEqual(stats.maxHp);
    expect(s.character.ward).toBeLessThanOrEqual(stats.maxWard);
  });
});

describe("switchEquipKit: Instanzen (Verzauberung/Suffix) reisen exakt mit", () => {
  it("verzaubertes Schwert bleibt als Instanz im Kit und kommt mit Affix zurück — nie in der Tasche", () => {
    const s = makeState();
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    expect(equipInstance(s, content, INST.instanceId).ok).toBe(true);
    expect(s.inventory.instances).toHaveLength(0);

    expect(switchEquipKit(s, content, 2)).toBe("ok");
    expect(s.character.equipment.mainhand).toBeNull();
    expect(s.character.equippedInstances.mainhand).toBeUndefined();
    const kept = s.equipKits[0]!.equippedInstances.mainhand;
    expect(kept?.instanceId).toBe(INST.instanceId);
    expect(kept?.affixes).toEqual([{ affixId: "whetted", tier: 1 }]);
    expect(s.equipKits[0]!.equipment.mainhand).toBe("rusty_sword");
    expect(s.inventory.instances).toHaveLength(0);

    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(s.character.equippedInstances.mainhand?.instanceId).toBe(INST.instanceId);
    expect(s.character.equippedInstances.mainhand?.affixes).toEqual([{ affixId: "whetted", tier: 1 }]);
    expect(s.inventory.instances).toHaveLength(0);
  });

  it("Kit-Instanz und Charakter-Instanz sind nie dasselbe Objekt (Kopie statt Alias)", () => {
    const s = makeState();
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    addInstance(s.inventory, { ...INST, affixes: [...INST.affixes] });
    expect(equipInstance(s, content, INST.instanceId).ok).toBe(true);
    syncActiveKit(s);
    expect(s.equipKits[0]!.equippedInstances.mainhand).not.toBe(s.character.equippedInstances.mainhand);
    expect(s.equipKits[0]!.equippedInstances.mainhand).toEqual(s.character.equippedInstances.mainhand);
  });
});

describe("Ausrüsten/Ablegen wirkt IMMER auf das aktive Kit; Werkzeuge tauschen mit", () => {
  it("equip/unequip in Kit 1 lassen Kit 0 unberührt", () => {
    const s = makeState();
    equipSetA(s);
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    addItem(s.inventory, content, "copper_kiteshield", 1);
    expect(equipItem(s, content, "copper_kiteshield").ok).toBe(true);
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
    // Kit 0 (inaktiv) trägt weiterhin SEINEN Schild — unabhängig davon.
    expect(s.equipKits[0]!.equipment.offhand).toBe("copper_kiteshield");
    expect(unequipItem(s, content, "offhand")).toBe(true);
    expect(s.character.equipment.offhand).toBeNull();
    expect(itemCount(s.inventory, "copper_kiteshield")).toBe(1);
    expect(s.equipKits[0]!.equipment.offhand).toBe("copper_kiteshield");
    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");
    expect(s.equipKits[1]!.equipment.offhand).toBeNull();
  });

  it("Werkzeug-Slots gehören zum Kit (ganzes Set tauscht — keine LOADOUT_SLOTS-Ausnahme mehr)", () => {
    const s = makeState();
    addItem(s.inventory, content, "bronze_pickaxe", 1);
    expect(equipTool(s, content, "bronze_pickaxe").ok).toBe(true);
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    expect(s.character.equipment.tool1).toBeNull();
    expect(s.equipKits[0]!.equipment.tool1).toBe("bronze_pickaxe");
    expect(itemCount(s.inventory, "bronze_pickaxe")).toBe(0);
    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(s.character.equipment.tool1).toBe("bronze_pickaxe");
  });
});

describe("kitSummary / syncActiveKit", () => {
  it("aktives Kit liest aus dem Charakter (Wahrheit), inaktive aus equipKits; ungültig → leer; Kopie, kein Alias", () => {
    const s = makeState();
    equipSetA(s);
    // Spiegel bewusst stale lassen (equipSetA lief NACH createGame) — die Summary muss trotzdem stimmen.
    expect(s.equipKits[0]!.equipment.offhand).toBeNull();
    const active = kitSummary(s, 0);
    expect(active.pieces).toBe(3);
    expect(active.equipment.offhand).toBe("copper_kiteshield");
    active.equipment.offhand = null;
    expect(s.character.equipment.offhand).toBe("copper_kiteshield");

    expect(kitSummary(s, 1).pieces).toBe(0);
    expect(kitSummary(s, 7).pieces).toBe(0);
    expect(kitSummary(s, 7).equipment).toEqual(emptyEquipKit().equipment);

    expect(switchEquipKit(s, content, 2)).toBe("ok");
    const inactive = kitSummary(s, 0);
    expect(inactive.pieces).toBe(3);
    expect(inactive.equipment.ring1).toBe("garnet_ring");
    expect(kitSummary(s, 2).pieces).toBe(0);
  });

  it("syncActiveKit schreibt den stale Spiegel aus dem Charakter nach (idempotent)", () => {
    const s = makeState();
    equipSetA(s);
    expect(s.equipKits[0]!.equipment.offhand).toBeNull(); // stale
    syncActiveKit(s);
    expect(s.equipKits[0]!.equipment).toEqual(s.character.equipment);
    const once = JSON.stringify(s.equipKits);
    syncActiveKit(s);
    expect(JSON.stringify(s.equipKits)).toBe(once);
  });
});

describe("Determinismus", () => {
  it("Umschalten zieht NIE am RNG-Strom (rng + eliteRng unverändert)", () => {
    const s = makeState();
    equipSetA(s);
    const rngBefore = s.rng.state;
    const eliteRngBefore = s.eliteRng.state;
    expect(switchEquipKit(s, content, 1)).toBe("ok");
    expect(switchEquipKit(s, content, 2)).toBe("ok");
    expect(switchEquipKit(s, content, 0)).toBe("ok");
    expect(s.rng.state).toBe(rngBefore);
    expect(s.eliteRng.state).toBe(eliteRngBefore);
  });
});
