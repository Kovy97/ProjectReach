import { describe, it, expect } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { addItem, itemCount, freeSlots } from "./inventory";
import { equipItem } from "./equipment";
import { xpForLevel } from "./leveling";

/**
 * Guard (Tester-Sweep 2026-06-30, T11#1): Ein Equip-Tausch darf NIEMALS das ausgezogene Item
 * vernichten, wenn das Inventar voll ist. Früher prüfte stowEquipped die addItem-Rückgabe nicht →
 * Datenverlust (Steam-Blocker). Jetzt: Equip wird abgelehnt (ok:false), Bestand bleibt unverändert.
 */
describe("Equip-Tausch verliert bei vollem Inventar kein Item", () => {
  it("Equip aus qty>1-Stack in belegten Slot bei vollem Inventar → abgelehnt, nichts verloren", () => {
    const s = createGame({ name: "X" }, content, 1);
    s.skills.attack = { xp: xpForLevel(10) }; // bronze_sword braucht attack 5
    // 1) bronze_sword anlegen (mainhand belegt).
    addItem(s.inventory, content, "bronze_sword", 1);
    expect(equipItem(s, content, "bronze_sword").ok).toBe(true);
    expect(s.character.equipment.mainhand).toBe("bronze_sword");
    // 2) Stapel von 2 weiteren bronze_sword (qty>1 → Entnahme gibt KEINEN Slot frei).
    addItem(s.inventory, content, "bronze_sword", 2);
    // 3) ALLE übrigen Slots füllen.
    for (let i = 0; i < s.inventory.slots.length; i++) {
      if (!s.inventory.slots[i]) s.inventory.slots[i] = { itemId: "copper_ore", qty: 1 };
    }
    expect(freeSlots(s.inventory)).toBe(0);
    const swordsBefore = itemCount(s.inventory, "bronze_sword"); // = 2 im Stapel

    // 4) Erneut bronze_sword anlegen → kein Platz für das alte (mainhand) → muss abgelehnt werden.
    const res = equipItem(s, content, "bronze_sword");
    expect(res.ok).toBe(false);
    // 5) Nichts vernichtet: Stapel unverändert, mainhand weiterhin belegt.
    expect(itemCount(s.inventory, "bronze_sword")).toBe(swordsBefore);
    expect(s.character.equipment.mainhand).toBe("bronze_sword");
  });

  // Der frühere Köcher-Sortenwechsel-Guard (T19/T2#1) ist mit dem Ammo-Removal (#286) gestorben —
  // es gibt keinen Köcher-Slot und keine ausrüstbare Munition mehr.
});
