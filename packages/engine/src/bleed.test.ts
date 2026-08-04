import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";

describe("bleed status effect", () => {
  it("Blutung verursacht Schaden über Zeit am Gegner (wie Brand, ignoriert Rüstung)", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    startCombat(s, content, "goblin");
    const hp0 = s.combat.enemyHp;
    s.combat.enemyEffects.push({ type: "bleed", remainingMs: 1000, magnitude: 10 });
    // Spieler-Timer hochsetzen, damit der eigene Angriff in diesem Tick NICHT trifft.
    s.combat.playerTimerMs = 0;

    const enemyHpBeforeTick = s.combat.enemyHp;
    combatStep(s, content); // 1 Tick → Blutung 10/s * 0,1s = 1 Schaden (plus evtl. nichts sonst)
    // Der Gegner hat mindestens den Blutungsschaden erlitten.
    expect(s.combat.enemyHp).toBeLessThanOrEqual(enemyHpBeforeTick - 1 + 0.001);
    expect(hp0).toBeGreaterThan(0);
  });

  it("eine Nahkampfwaffe mit weaponEffect kann den Effekt auslösen (über viele Treffer)", () => {
    // Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §6.1): ash_tyrant's Damage-Rescale
    // (8→17) macht ein blank-nacktes con:16-Fixture zu sterblich, um über 4000 Ticks zuverlässig
    // einen Bleed-Proc zu erwischen — con 16→60 gibt genug HP-Puffer für den langen Beobachtungs-Loop.
    const s = createTestGame({ name: "X", baseAttributes: { str: 16, dex: 16, con: 60 } }, content, 12345);
    s.character.equipment.mainhand = "steel_warblade"; // Blutungs-Effekt, Stil = Nahkampf
    // Zäher Gegner (überlebt mehrere Treffer), damit der Effekt sichtbar persistiert.
    startCombat(s, content, "ash_tyrant");

    let sawBleed = false;
    for (let i = 0; i < 4000; i++) {
      combatStep(s, content);
      if (s.combat.enemyEffects.some((e) => e.type === "bleed")) {
        sawBleed = true;
        break;
      }
    }
    expect(sawBleed).toBe(true);
  });

  it("Content-Markierungen: Warblade blutet, Konstrukt/Geist sind blutungsimmun; Endboss nur noch shock/poison", () => {
    // iron_revenant + spectral_stag: blutungsimmun (konstrukte/geister bluten nicht)
    expect(content.items.steel_warblade?.weaponEffect?.type).toBe("bleed");
    expect(content.monsters.iron_revenant?.resist).toContain("bleed");
    expect(content.monsters.spectral_stag?.resist).toContain("bleed");
    // last_idol: Design-Änderung → nur noch shock+poison-immun; bleed/burn/frost-Builds sollen wirken.
    expect(content.monsters.last_idol?.resist).not.toContain("bleed");
    expect(content.monsters.last_idol?.resist).toContain("shock");
    expect(content.monsters.last_idol?.resist).toContain("poison");
  });
});
