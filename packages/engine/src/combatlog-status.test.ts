import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, combatStep } from "./combat";

describe("combat log records status events", () => {
  it("loggt ein Gift-Ereignis vom Gegner (Spielerseite)", () => {
    const s = createTestGame({ name: "X", baseAttributes: { con: 10 } }, content, 42);
    s.character.hp = 100000; // überlebt lange, damit Gift sicher einmal auslöst
    startCombat(s, content, "mire_crawler"); // inflict poison 30%

    let found = false;
    for (let i = 0; i < 800 && !found; i++) {
      combatStep(s, content);
      found = s.combat.log.some((e) => e.kind === "status" && e.by === "enemy" && e.status === "poison");
    }
    expect(found).toBe(true);
  });

  it("loggt ein Status-Ereignis am Gegner (Magie-Brand)", () => {
    // Combat-Depth #223 (design/combat-depth-spec.md §3.4): ash_rat ist jetzt defenseType "evasion"
    // mit evasion=round(0.22·30+2)=9 (vorher 2, ungelesen). Der ursprüngliche reine int/wis-Glaskanonen-
    // Char hatte nur ~11 maxHp (computeStats-Formel skaliert allein mit con) und starb nach 1-2 Gegner-
    // Treffern, BEVOR der (an einen Treffer gebundene) Burn-Proc überhaupt eine faire Chance bekam —
    // `s.character.hp` direkt zu überschreiben half nicht, combat.ts klemmt hp jeden Step auf maxHp
    // zurück (Zeile ~1458). Fix: con hoch genug für echte Überlebensfähigkeit (analog zum Gift-Test
    // oben, gleiches Muster: "überlebt lange, damit der Proc sicher einmal auslöst").
    const s = createTestGame({ name: "X", baseAttributes: { int: 20, wis: 10, con: 200 } }, content, 7);
    s.character.equipment.mainhand = "gnarled_staff"; // weaponEffect burn (Magie)
    startCombat(s, content, "ash_rat"); // nicht burn-immun

    let found = false;
    for (let i = 0; i < 800 && !found; i++) {
      combatStep(s, content);
      found = s.combat.log.some((e) => e.kind === "status" && e.by === "player" && e.status === "burn");
    }
    expect(found).toBe(true);
  });
});
