import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, stopCombat } from "./combat";
import { advance } from "./tick";
import { itemCount } from "./inventory";
import { levelFromXp } from "./leveling";

function newGame(seed: number) {
  // Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §6.1): der Gegner-Damage-Rescale macht
  // einen blank-nackten Held ab L10-15 (goblin=L15) bewusst gefährlich ("ohne Rüstung = Suizid").
  // con 4→40→80 (Chef-Fix 2026-07-22, Combat-Pet-Stilbindung): das Kill-Pfad-RNG zieht jetzt pro
  // Kill weniger nextFloat (nur noch stilpassende Combat-Pets statt aller 7) — das verschiebt die
  // Zug-Reihenfolge für JEDEN nachfolgenden Wurf (Treffer/Schaden/Loot) ab dem ersten Kill. Für
  // Seed 7 reichte der alte HP-Puffer (con 40) danach nicht mehr, um zuverlässig genug Kills vor
  // dem Tod zu sammeln (Kampf endet OHNE Auto-Respawn bei Niederlage, s. onPlayerDefeated). con 80
  // gibt dem Test-Fixture wieder genug HP-Puffer, um zuverlässig MEHRERE Kills/Loot-Rolls innerhalb
  // der 120s-Fenster zu sammeln, ohne die eigentliche Prüfabsicht (XP-Routing/Loot) zu verändern —
  // die Gefahr selbst ist gewollt, nicht die Test-Flakiness dadurch.
  return createTestGame({ name: "Held", baseAttributes: { str: 6, con: 80 } }, content, seed);
}

describe("combat", () => {
  it("ist deterministisch bei gleicher Seed", () => {
    const run = () => {
      const s = newGame(999);
      startCombat(s, content, "goblin");
      advance(s, content, 30_000);
      s.character.createdAt = 0;
      return s;
    };
    expect(run()).toEqual(run());
  });

  it("besiegt Gegner, routet Offensiv-XP nach Stil (attack-Stance splittet 55/45) und sammelt Loot", () => {
    const s = newGame(7);
    // Default-Stil ist "attack" → Nahkampf-XP wird 55 % attack / 45 % power gesplittet (balance-pass2 #7).
    expect(s.character.combatStyle).toBe("attack");
    startCombat(s, content, "goblin");
    advance(s, content, 120_000); // genug Zeit für mehrere Kills

    expect(s.combat.kills).toBeGreaterThan(0);
    expect(s.skills.attack?.xp ?? 0).toBeGreaterThan(0); // Angriff bekommt den 55%-Löwenanteil (+ Kill-Bonus)
    // balance-pass2 #7 (boar-Wall-Fix): attack-Stance trainiert jetzt AUCH power (45 %), sonst stagniert
    // meleeDamage im Default-Modus. Attack bleibt aber vorn (55 % + ungesplitteter Kill-Bonus).
    expect(s.skills.power?.xp ?? 0).toBeGreaterThan(0);
    expect(s.skills.attack?.xp ?? 0).toBeGreaterThan(s.skills.power?.xp ?? 0);
    // OSRS-Fix (Task #197): Getroffen-werden trainiert KEINE Defence mehr. In der Angriffs-Stance
    // routet die Offensiv-XP auf attack/power → Defence bleibt trotz vieler eingesteckter Treffer 0.
    expect(s.skills.defence?.xp ?? 0).toBe(0);
    const loot = itemCount(s.inventory, "goblin_ear") + itemCount(s.inventory, "crude_bone");
    expect(loot).toBeGreaterThan(0);
  });

  it("Stil-Wechsel routet die XP: Wucht → power, Defensiv → defence", () => {
    const power = newGame(7);
    power.character.combatStyle = "power";
    startCombat(power, content, "goblin");
    advance(power, content, 120_000);
    expect(power.skills.power?.xp ?? 0).toBeGreaterThan(0);
    expect(power.skills.attack?.xp ?? 0).toBe(0);

    const def = newGame(7);
    def.character.combatStyle = "defensive";
    startCombat(def, content, "goblin");
    advance(def, content, 120_000);
    expect(def.skills.defence?.xp ?? 0).toBeGreaterThan(0);
    expect(def.skills.attack?.xp ?? 0).toBe(0);
  });

  it("Default-attack-Stance trainiert power mit (boar-Wall-Fix, balance-pass2 #7): power > 0 nach Kills", () => {
    // Regression: früher routete die Default-„attack"-Stance 100 % der Offensiv-XP an `attack`,
    // `power` blieb 0 → meleeDamage (1 + str·1.5 + power·0.8) stagnierte → Wall am boar L10. Jetzt
    // splittet die attack-Stance 55/45, sodass power (und damit der Nahkampf-Schaden) mitwächst.
    const s = newGame(7);
    expect(s.character.combatStyle).toBe("attack");
    startCombat(s, content, "goblin");
    advance(s, content, 120_000);
    expect(s.combat.kills).toBeGreaterThan(0);
    expect(s.skills.power?.xp ?? 0).toBeGreaterThan(0); // war vor dem Fix exakt 0
  });

  it("Kämpfen levelt den aktiven Kampf-Skill (Wucht → trainiert STR über das Hybrid-System)", () => {
    const s = newGame(7);
    s.character.combatStyle = "power";
    startCombat(s, content, "goblin");
    advance(s, content, 300_000);
    expect(levelFromXp(s.skills.power?.xp ?? 0)).toBeGreaterThan(1);
  });

  it("Sammeln und Kampf schließen sich aus", () => {
    const s = newGame(1);
    startCombat(s, content, "goblin");
    expect(s.combat.monsterId).toBe("goblin");
    stopCombat(s);
    expect(s.combat.monsterId).toBeNull();
  });
});
