import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { EquipSlot } from "@hearthforge/shared";
import { buildBisCharacter } from "./balance-envelope-helpers";
import { startRaid } from "./raid";
import { advance } from "./tick";

/**
 * Raid Ende zu Ende (1.4.0 Welle 4; claude:2026-10-25T12:05:00+02:00): das Referenz-Kit „BiS-2H“ aus
 * 1.4.0-balance-raid.md §2.1 (Waffe und Schmuck aus „damage“, Rüstung aus „tank“, ohne Raid-Teile, Essen und Auto-Trank)
 * läuft „Die Hallen von Gobkha'raz“ Normal über den echten Tick: Kampf-Anbindung, Bossphasen, Beute, Rast mit
 * Auto-Weiter (offline), Abschluss. Prüft das Zusammenspiel; die Laufzeit nur grob (Zielband §2.5, Nachmessung Apply #12).
 */
describe("Raid Normal Ende zu Ende", () => {
  it("BiS-2H-Kit (Magie) schafft den Lauf offline mit Auto-Weiter; Gebühr weg, Bosse, Abschluss und Bestzeit da", () => {
    const b = buildBisCharacter(content, "magic", 99, "damage", { allBuffs: true, excludeRaid: true });
    const tank = buildBisCharacter(content, "magic", 99, "tank", { allBuffs: true, excludeRaid: true });
    const s = b.state;
    for (const slot of ["helmet", "body", "legs", "gloves", "boots"] as EquipSlot[]) {
      s.character.equipment[slot] = tank.state.character.equipment[slot];
      const inst = tank.state.character.equippedInstances?.[slot];
      if (inst) s.character.equippedInstances![slot] = inst;
      else delete s.character.equippedInstances![slot];
    }
    s.inventory.slots[0] = { itemId: "cooked_idolscale", qty: 1000 };
    s.inventory.slots[1] = { itemId: "godbloom_infusion", qty: 100 };
    s.character.food = "cooked_idolscale";
    s.character.autoEatTier = 3;
    s.character.autoPotion = { ...s.character.autoPotion, healPotionId: "godbloom_infusion", healThreshold: 0.4 };
    s.dungeonsCleared.behind_the_throne = 1;
    s.character.gold = 400_000;
    expect(startRaid(s, content, "gobkharaz", "normal")).toBe("ok");
    expect(s.character.gold).toBe(100_000);
    for (let t = 0; t < 3 * 3_600_000 && s.raid!.lastResult === null; t += 60_000) {
      advance(s, content, 60_000, { offline: true });
    }
    const rs = s.raid!;
    expect(rs.lastResult, JSON.stringify(rs.lastResult)).toMatchObject({ outcome: "complete", difficulty: "normal" });
    expect(rs.clears.normal).toBe(1);
    expect(Object.keys(rs.bossKills).length).toBe(5);
    expect(rs.fastestMs.normal).toBeGreaterThan(0);
    // claude:2026-10-25T23:40:00+02:00 — Chef: Raid-Dauer halbiert (RAID_HP_SCALE 0,5) ⇒ Leitplanke 12–45 min (vorher 25–90).
    // Grobe Leitplanke gegen Skalierungsfehler, keine Balance-Abnahme.
    expect(rs.lastResult!.durationMs).toBeGreaterThan(12 * 60_000);
    expect(rs.lastResult!.durationMs).toBeLessThan(45 * 60_000);
  }, 180_000);
});
