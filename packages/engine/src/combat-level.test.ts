import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { combatLevel } from "./dungeon";
import { xpForLevel } from "./leveling";

/**
 * Balance-Pass 3 #9a — combatLevel-Kohärenz: `magicOffense` nutzt `magic` ALLEIN (früher
 * `(magic + warding) / 2`). `warding` ist rein defensiv (Ward-Regen) → treibt die OFFENSE nicht.
 *
 * Task #235 — `warding` symmetrisch in die DEFENSIV-Basis gefaltet: die Defensivfertigkeit ist
 * max(defence, warding). Ein Magier trainiert `warding` STATT `defence` → beide Stile erreichen
 * dieselbe CL (Parität). #9a hatte `warding` versehentlich ganz aus der CL entfernt (raus aus der
 * Offense, aber nie in die Defense) → ein reiner Magier saß ~11 CL zu niedrig und cappte bei ~75.
 *
 * Diese Guards pinnen: (1) `warding` leakt NICHT in die Offense (unter defence-Niveau ändert es nichts),
 * (2) `warding` ist symmetrisch zu `defence` in der Defensiv-Basis (Magier-Parität). Die bestehenden
 * combatLevel-Tests (magic-def-xp.test.ts) setzen `warding == defence` und maskieren die Symmetrie —
 * hier wird `warding` bewusst asymmetrisch gehalten.
 */
function mk(skills: Record<string, number>): ReturnType<typeof createGame> {
  const s = createGame({ name: "X" }, content, 1);
  for (const [k, v] of Object.entries(skills)) s.skills[k] = { xp: xpForLevel(v) };
  return s;
}

describe("combatLevel #9a — magicOffense = magic allein", () => {
  it("reiner Offensiv-Caster (magic 99, warding 1) erreicht die volle CL 99", () => {
    // Neue Formel: magicOffense = 99 → CL = round(0.25*(99+99) + 0.5*99) = 99.
    // Alte (magic+warding)/2 = 50 → CL nur round(49.5 + 25) = 75 → dieser Test würde rot.
    const caster = mk({ magic: 99, warding: 1, defence: 99, vitality: 99 });
    expect(combatLevel(caster)).toBe(99);
  });

  it("warding leakt NICHT in die Offense (unter defence-Niveau ändert es die CL nicht)", () => {
    // warding ≤ defence → Defensiv-Basis bleibt defence; kein Offense-Beitrag. Unter der alten
    // Mittel-Formel `(magic+warding)/2` zöge warding die CL hoch (Offense-Leak) → rot.
    const a = mk({ magic: 60, warding: 1, defence: 50, vitality: 40 });
    const b = mk({ magic: 60, warding: 50, defence: 50, vitality: 40 });
    expect(combatLevel(b)).toBe(combatLevel(a));
  });

  it("warding ist symmetrisch zu defence in der Defensiv-Basis (Magier-Parität, Task #235)", () => {
    // Magier trainiert warding STATT defence, Krieger defence STATT warding → identische CL.
    // Vor dem #235-Fix fiel warding ganz aus der CL → mage läge ~11 CL unter dem warrior.
    const mage = mk({ magic: 70, warding: 60, defence: 1, vitality: 50 });
    const warrior = mk({ attack: 70, power: 70, defence: 60, warding: 1, vitality: 50 });
    expect(combatLevel(mage)).toBe(combatLevel(warrior));
  });

  it("Magie und Ranged klettern das Kampf-Niveau symmetrisch (ein Offensiv-Skill je Stil)", () => {
    const magic = mk({ magic: 70, defence: 50, vitality: 50 });
    const ranged = mk({ ranged: 70, defence: 50, vitality: 50 });
    expect(combatLevel(magic)).toBe(combatLevel(ranged));
  });
});
