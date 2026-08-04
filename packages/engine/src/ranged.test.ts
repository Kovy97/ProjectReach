import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, ItemDef } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";
import { advance } from "./tick";
import { equipItem } from "./equipment";
import { addItem, itemCount } from "./inventory";
import { computeStats } from "./character";

/**
 * Fernkampf NACH dem Ammo-Removal (#286, SAVE_VERSION 57): Es gibt KEINE Munition mehr —
 * der Pfeilschaden ist seit dem Waffen-Kurven-Pass (#287) in die damageMin/Max-Spanne der
 * Bögen eingebacken. Diese Guards pinnen die neue Welt: Bögen feuern immer (voller Schaden,
 * kein Notschlag, kein outOfAmmo-Stopp), und nichts ist mehr in einen Köcher ausrüstbar.
 */
describe("ranged ohne Munitionssystem (#286)", () => {
  it("Bogen feuert ohne jegliche Pfeile: Kampf läuft dauerhaft, Kills fließen, kein Stopp", () => {
    const s = createTestGame({ name: "X", baseAttributes: { dex: 8 } }, content, 5);
    s.character.equipment.mainhand = "copper_shortbow";
    // bewusst: kein Pfeil weit und breit — der Bogen ist trotzdem voll feuerbereit.
    // Ziel = Huhn (on-level, harmlos): ein härterer Mob (Goblin) tötet den ungerüsteten
    // Test-Archer im Fenster — das würde die Feuer-Mechanik-Aussage mit Survival vermischen.
    startCombat(s, content, "chicken");
    expect(s.combat.monsterId).toBe("chicken");

    advance(s, content, 30_000);
    expect(s.combat.monsterId).toBe("chicken"); // Kampf läuft weiter (Respawn nach Kills)
    expect(s.combat.stopReason).toBeUndefined(); // kein outOfAmmo (existiert nicht mehr)
    expect(s.combat.kills).toBeGreaterThan(0); // scharfe Schüsse, kein −60%-Notschlag
  });

  it("Schadensspanne = Charakter-Anteil + Bogen-Spanne (kein Ammo-Zuschlag, kein Double-Dip)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { dex: 8 } }, content, 5);
    s.character.equipment.mainhand = "copper_shortbow";
    const bow = content.items.copper_shortbow!;
    const st = computeStats(s, content);
    expect(st.style).toBe("ranged");
    // charDamage des Fernkampf-Stils ist `rangedDamage` (reiner Charakter-Anteil) — die Spanne
    // liegt exakt Bogen-damageMin/Max darüber. Ein Ammo-Zuschlag würde diese Gleichung brechen.
    expect(st.attackDamageMin).toBeCloseTo(st.rangedDamage + (bow.damageMin ?? 0), 9);
    expect(st.attackDamageMax).toBeCloseTo(st.rangedDamage + (bow.damageMax ?? 0), 9);
  });

  it("Pfeile sind NICHT mehr ausrüstbar (kein Köcher-Slot) — synthetisches Legacy-Ammo-Item", () => {
    // Synthetisch statt echter copper_arrow (Pfeil-Items sind seit Stage B aus dem Katalog gelöscht).
    // Alt-Shape mit den toten Munitionsfeldern via Cast — der Guard beweist, dass selbst ein
    // Alt-Katalog-Item mit diesen Feldern keinen Ammo-Sonderpfad mehr auslöst.
    const synthAmmo = {
      id: "legacy_guard_arrow",
      name: "Legacy-Testpfeil",
      type: "material",
      stackable: true,
      value: 1,
      ammo: true,
      ammoDamage: 5,
    } as unknown as ItemDef;
    const testContent: ContentDB = {
      ...content,
      items: { ...content.items, [synthAmmo.id]: synthAmmo },
    };
    const s = createTestGame({ name: "X", baseAttributes: { dex: 8 } }, testContent, 5);
    addItem(s.inventory, testContent, synthAmmo.id, 20);
    const res = equipItem(s, testContent, synthAmmo.id);
    expect(res.ok).toBe(false); // Material ohne Slot → nicht ausrüstbar, kein Ammo-Sonderpfad mehr
    expect(itemCount(s.inventory, synthAmmo.id)).toBe(20); // nichts verschoben/verloren
    expect("ammoCount" in s).toBe(false); // Alt-Key existiert nicht mehr
  });

  it("Nahkampf unverändert: Kampf läuft durch", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 12, con: 10 } }, content, 5);
    s.character.equipment.mainhand = "bronze_sword";
    startCombat(s, content, "goblin");

    // 20 s Fenster (TTK-Randlagen-Puffer, s. Historie) — Kampf muss aktiv bleiben und Kills liefern.
    advance(s, content, 20_000);
    expect(s.combat.monsterId).not.toBeNull();
    expect(s.combat.kills).toBeGreaterThan(0);
  });

  it("Magie ohne Mana stoppt NICHT (gewollter Weak-Melee-Loop)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { int: 12, con: 10 } }, content, 5);
    s.character.equipment.mainhand = "copper_staff"; // Magie-Stil, verbraucht Mana
    s.character.mana = 0; // Mana leer → schwacher Stab-Nahschlag, aber KEIN Kampf-Stopp
    startCombat(s, content, "goblin");

    for (let i = 0; i < 30; i++) combatStep(s, content);
    expect(s.combat.monsterId).not.toBeNull();
  });
});
