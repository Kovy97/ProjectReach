import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { startDungeon, combatLevel } from "./dungeon";
import { advance } from "./tick";
import { addItem, itemCount } from "./inventory";
import { equipItem } from "./equipment";
import { computeStats } from "./character";

/**
 * Chef-Änderung 2026-07-01: Eine Niederlage ist jetzt eine STRAFE für schlechte Vorbereitung — der
 * Kampf ABBRICHT (kein stiller Auto-Neustart gegen denselben Gegner mehr). Der Held wird voll geheilt
 * (nach Vorbereitung sofort wieder einsteigbar) und der Tod gezählt, aber `monsterId` wird genullt
 * (stopReason="defeated") → der Spieler muss den Gegner MANUELL neu wählen/starten. Kein Item-/Gold-
 * Verlust. Häufigster Tod-Auslöser ist leeres Essen (kein Auto-Eat), darum hier bewusst OHNE Essen.
 */
describe("Niederlage bricht den Kampf ab (Vorbereitungs-Strafe)", () => {
  it("Tod im Normalkampf beendet den Kampf (monsterId null, stopReason defeated, HP voll, deaths+1)", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, 2);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");
    s.character.food = null; // kein Essen → der typische Tod-Auslöser
    startCombat(s, content, "chicken");

    // Erste Niederlage erzwingen (tödlicher DoT, kein Essen).
    s.character.hp = 1;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 100 });
    combatStep(s, content);

    expect(s.stats.deaths).toBe(1);
    expect(s.combat.monsterId).toBeNull(); // ABBRUCH statt Auto-Neustart (vorher "chicken")
    expect(s.combat.stopReason).toBe("defeated"); // Auto-Stopp-Grund für den UI-Hinweis
    expect(s.combat.playerEffects).toHaveLength(0); // DoT beim Tod verfallen
    expect(s.character.hp).toBe(computeStats(s, content).maxHp); // trotzdem voll geheilt
    expect(s.combat.dungeonId).toBeNull();
    expect(s.combat.encounterIndex).toBe(0);

    // Der Kampf läuft NICHT von selbst weiter: weitere Ticks sind No-Ops (kein neuer Kill, kein Tod).
    for (let i = 0; i < 200; i++) combatStep(s, content);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.kills).toBe(0);
    expect(s.stats.deaths).toBe(1); // kein Weiter-Sterben ohne manuellen Neustart
  });

  it("nach der Niederlage kann der Spieler denselben Gegner MANUELL neu starten und weiterkämpfen", () => {
    const s = createGame({ name: "X", baseAttributes: { str: 10, con: 10 } }, content, 4);
    addItem(s.inventory, content, "bronze_sword", 1);
    equipItem(s, content, "bronze_sword");
    s.character.food = null;
    startCombat(s, content, "chicken");

    // Eine Niederlage bricht ab …
    s.character.hp = 1;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 100 });
    combatStep(s, content);
    expect(s.stats.deaths).toBe(1);
    expect(s.combat.monsterId).toBeNull();

    // … der Spieler startet manuell neu (frischer Kampf: kills/stopReason zurückgesetzt) und farmt.
    expect(startCombat(s, content, "chicken")).toBe(true);
    expect(s.combat.stopReason).toBeUndefined(); // frischer Kampf = kein Auto-Stopp-Grund
    for (let i = 0; i < 200; i++) combatStep(s, content);
    expect(s.combat.monsterId).toBe("chicken");
    expect(s.combat.kills).toBeGreaterThan(0);
  });

  it("Tod im Dungeon bricht den Run weiterhin ab (harter Stopp, kein Auto-Restart)", () => {
    const s = createGame({ name: "X" }, content, 3);
    // Task #345 (Chef-Entscheid 25.07.): die Kampfstufe sperrt Dungeons nicht mehr — der L1-Char
    // (Empfehlung: 75) betritt die Krypta über den Einmal-Unlock und stirbt dort regulär.
    expect(combatLevel(s)).toBeLessThan(75);
    s.dungeonsUnlocked["crypt_depths"] = true; // Einmal-Unlock (SAVE 60)
    expect(startDungeon(s, content, "crypt_depths")).toBe(true);

    s.character.food = null;
    s.character.hp = 1;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 100 });
    combatStep(s, content);

    expect(s.stats.deaths).toBe(1);
    expect(s.combat.monsterId).toBeNull(); // Dungeon-Tod = harter Run-Abbruch
    expect(s.combat.dungeonId).toBeNull();
    expect(s.combat.stopReason).toBe("defeated"); // gleicher Tod-Pfad wie der Normalkampf
  });
});

/**
 * run4 P3: `curesPoison` wurde nur im manuellen Verzehr (useConsumable) angewandt, nicht im
 * Auto-Eat-Pfad. Auto-Eat soll Gift jetzt identisch zum manuellen Verzehr heilen.
 */
describe("Auto-Eat heilt Gift (curesPoison)", () => {
  it("ein curesPoison-Food entfernt beim Auto-Eat den aktiven Poison-DoT", () => {
    const s = createGame({ name: "X", baseAttributes: { con: 10 } }, content, 7);
    // potion_antidote: curesPoison + healAmount 20 → qualifiziert als Auto-Eat-Food.
    addItem(s.inventory, content, "potion_antidote", 10);
    s.character.food = "potion_antidote";
    startCombat(s, content, "chicken");
    s.combat.enemyTimerMs = -100_000; // Gegner schlägt im Fenster nicht → HP-Differenz nur vom DoT

    const maxHp = computeStats(s, content).maxHp;
    s.character.hp = maxHp * 0.3; // unter der Auto-Eat-Schwelle → Auto-Eat feuert
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 20 });
    const foodBefore = itemCount(s.inventory, "potion_antidote");

    combatStep(s, content);

    expect(itemCount(s.inventory, "potion_antidote")).toBeLessThan(foodBefore); // hat gegessen
    expect(s.combat.playerEffects.some((e) => e.type === "poison")).toBe(false); // Gift geheilt
  });
});
