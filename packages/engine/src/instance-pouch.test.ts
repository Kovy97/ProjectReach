import { describe, expect, it } from "vitest";
import type { ItemInstance } from "@hearthforge/shared";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import {
  addInstance,
  getInstance,
  groupInstancesByBase,
  removeInstance,
} from "./inventory";
import { sellInstance, sellPrice } from "./shop";
import { depositInstance, withdrawInstance } from "./bank";
import { equipInstance, unequipItem } from "./equipment";

/**
 * #246 — Instanz-Tasche (`inventory.instances`) + Gear-Vault (`bankInstances`): die pro-Basis-Item
 * unbegrenzte Ablage für non-stackable Item-Instanzen und die Verben, die sie bewegen
 * (add/remove/get, gruppieren, verkaufen, ein-/auslagern, ausrüsten — jeweils per `instanceId`).
 */

function inst(id: string, baseItemId = "rusty_sword"): ItemInstance {
  return { instanceId: id, baseItemId, affixes: [{ affixId: "affix_x", tier: 1 }] };
}

describe("#246 Instanz-Tasche & Gear-Vault", () => {
  it("addInstance: die Tasche ist unbegrenzt — sie wird nie „voll“", () => {
    const s = createGame({ name: "X" }, content, 1);
    const N = 500; // weit über jeder Slot-Kapazität
    for (let i = 0; i < N; i++) {
      expect(addInstance(s.inventory, inst(`i${i}`))).toBe(true); // schlägt nie fehl
    }
    expect(s.inventory.instances).toHaveLength(N);
    // Instanzen belegen KEINEN Slot-Platz.
    expect(s.inventory.slots.every((slot) => slot === null || !slot.instance)).toBe(true);
  });

  it("getInstance/removeInstance adressieren per instanceId; removeInstance gibt die Instanz zurück", () => {
    const s = createGame({ name: "X" }, content, 1);
    addInstance(s.inventory, inst("a"));
    addInstance(s.inventory, inst("b"));
    expect(getInstance(s.inventory, "b")?.instanceId).toBe("b");
    const removed = removeInstance(s.inventory, "a");
    expect(removed?.instanceId).toBe("a");
    expect(s.inventory.instances).toHaveLength(1);
    expect(getInstance(s.inventory, "a")).toBeUndefined();
    // Unbekannte ID: null, kein Wurf.
    expect(removeInstance(s.inventory, "ghost")).toBeNull();
  });

  it("groupInstancesByBase: je Basis-Item eine Gruppe, Eingabereihenfolge erhalten", () => {
    const list = [
      inst("s1", "rusty_sword"),
      inst("f1", "dim_focus"),
      inst("s2", "rusty_sword"),
      inst("s3", "rusty_sword"),
      inst("f2", "dim_focus"),
    ];
    const groups = groupInstancesByBase(list);
    expect([...groups.keys()]).toEqual(["rusty_sword", "dim_focus"]);
    expect(groups.get("rusty_sword")!.map((i) => i.instanceId)).toEqual(["s1", "s2", "s3"]);
    expect(groups.get("dim_focus")!.map((i) => i.instanceId)).toEqual(["f1", "f2"]);
    expect(groupInstancesByBase([]).size).toBe(0);
  });

  it("sellInstance: entfernt aus der Tasche und schreibt sellPrice der Basis gut", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.character.gold = 0;
    addInstance(s.inventory, inst("sell1", "dim_focus"));
    const gold = sellInstance(s, content, "sell1");
    expect(gold).toBe(sellPrice(content, "dim_focus"));
    expect(s.character.gold).toBe(gold);
    expect(getInstance(s.inventory, "sell1")).toBeUndefined();
    // Nicht (mehr) vorhandene Instanz: 0 Gold, kein Nebeneffekt.
    expect(sellInstance(s, content, "sell1")).toBe(0);
  });

  it("depositInstance/withdrawInstance: verlustfreier Round-Trip Tasche ↔ Gear-Vault", () => {
    const s = createGame({ name: "X" }, content, 1);
    addInstance(s.inventory, inst("v1", "dim_focus"));
    expect(depositInstance(s, "v1")).toBe(true);
    expect(getInstance(s.inventory, "v1")).toBeUndefined();
    expect(s.bankInstances.map((i) => i.instanceId)).toEqual(["v1"]);
    // Doppelt einlagern schlägt fehl (nicht mehr in der Tasche).
    expect(depositInstance(s, "v1")).toBe(false);
    // Zurück in die Tasche.
    expect(withdrawInstance(s, "v1")).toBe(true);
    expect(s.bankInstances).toHaveLength(0);
    expect(getInstance(s.inventory, "v1")?.instanceId).toBe("v1");
    // Unbekannte ID aus dem Vault: false.
    expect(withdrawInstance(s, "ghost")).toBe(false);
  });

  it("equipInstance: nimmt die Instanz aus der Tasche; unequip legt sie zurück", () => {
    const s = createGame({ name: "X" }, content, 1);
    addInstance(s.inventory, inst("eq1", "rusty_sword"));
    expect(equipInstance(s, content, "eq1").ok).toBe(true);
    // Aus der Tasche entfernt, Basis + Instanz reisen in den Ausrüstungs-Slot.
    expect(getInstance(s.inventory, "eq1")).toBeUndefined();
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(s.character.equippedInstances.mainhand?.instanceId).toBe("eq1");
    // Ablegen schiebt die Instanz zurück in die (unbegrenzte) Tasche — nicht in einen Slot.
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    expect(s.character.equipment.mainhand).toBeNull();
    expect(s.character.equippedInstances.mainhand).toBeUndefined();
    expect(getInstance(s.inventory, "eq1")?.instanceId).toBe("eq1");
  });
});
