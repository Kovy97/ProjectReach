import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { addItem, usedCapacityUnits, effectiveCapacity } from "./inventory";
import { canUnequip, equipItem, unequipItem } from "./equipment";

/**
 * Chef-Report 26.08.2026: „Warum darf ich Items unequippen, wenn mein Inventar 48/48 ist? Es darf
 * keinen Overflow geben." Ausziehen darf die Kapazitäts-EINHEITEN nie überschreiten — auch nicht
 * über verzauberte Instanzen (unbegrenzte Tasche) und nicht über freie physische Null-Slots, wenn
 * die Einheiten (Slots + Instanz-Zellen) schon voll sind.
 */
describe("unequip — kein Inventar-Überlauf", () => {
  function vollesInventar() {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "rusty_sword", 1);
    expect(equipItem(s, content, "rusty_sword").ok).toBe(true);
    const mats = Object.values(content.items).filter((i) => i.type === "material" && i.stackable).map((i) => i.id);
    let k = 0;
    while (usedCapacityUnits(s.inventory) < effectiveCapacity(s.inventory, content)) addItem(s.inventory, content, mats[k++ % mats.length]!, 1);
    return s;
  }

  it("schlichtes Item: bei vollen Einheiten bleibt es angelegt, unequip liefert false", () => {
    const s = vollesInventar();
    const cap = effectiveCapacity(s.inventory, content);
    expect(canUnequip(s, content, "mainhand")).toBe(false);
    expect(unequipItem(s, content, "mainhand")).toBe(false);
    expect(s.character.equipment.mainhand).toBe("rusty_sword");
    expect(usedCapacityUnits(s.inventory)).toBe(cap);
  });

  it("verzauberte Instanz OHNE Zelle ihrer Basis-Art: ebenfalls gesperrt (vorher unbegrenzt)", () => {
    const s = vollesInventar();
    // Basis-Art ohne Zelle im Inventar (rusty_sword liegt als Starter-Stück noch drin, bronze_sword nicht)
    s.character.equipment.mainhand = "bronze_sword";
    s.character.equippedInstances.mainhand = { instanceId: "inst_1", baseItemId: "bronze_sword", affixes: [], suffix: null } as never;
    expect(canUnequip(s, content, "mainhand")).toBe(false);
    expect(unequipItem(s, content, "mainhand")).toBe(false);
    expect(s.inventory.instances.length).toBe(0);
  });

  it("verzauberte Instanz MIT Zelle ihrer Basis-Art im Inventar teilt sie und darf abgelegt werden", () => {
    const s = vollesInventar();
    // eine Einheit freimachen und ein schlichtes iron_sword hineinlegen → Zelle existiert
    const idx = s.inventory.slots.findIndex((x) => x !== null && x.itemId !== "bronze_sword");
    s.inventory.slots[idx] = { itemId: "bronze_sword", qty: 1 };
    s.character.equipment.mainhand = "bronze_sword";
    s.character.equippedInstances.mainhand = { instanceId: "inst_2", baseItemId: "bronze_sword", affixes: [], suffix: null } as never;
    expect(canUnequip(s, content, "mainhand")).toBe(true);
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    expect(usedCapacityUnits(s.inventory)).toBeLessThanOrEqual(effectiveCapacity(s.inventory, content));
  });

  it("mit freier Einheit funktioniert das Ablegen wie bisher", () => {
    const s = createGame({ name: "X" }, content, 1);
    addItem(s.inventory, content, "rusty_sword", 1);
    expect(equipItem(s, content, "rusty_sword").ok).toBe(true);
    expect(unequipItem(s, content, "mainhand")).toBe(true);
    expect(s.character.equipment.mainhand).toBeNull();
  });
});
