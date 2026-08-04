import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { startCombat, combatStep } from "./combat";
import { addItem, itemCount } from "./inventory";
import { computeStats } from "./character";

/**
 * Regression: Auto-Eat wurde nur bei Gegner-Schlägen geprüft. Seit DoT (Gift/Brennen/Blutung)
 * jeden Tick HP zieht, konnte ein Spieler MIT Essen zwischen zwei langsamen Schlägen an DoT
 * sterben, ohne zu essen. Auto-Eat muss auch nach dem DoT-Tick greifen.
 */
describe("Auto-Eat gegen DoT", () => {
  it("der Spieler isst durch DoT-Schaden und überlebt (statt ungenutzt zu sterben)", () => {
    // Seed 10→5 (Itemization 2.0 §1: Seeds zählen 1:1) — hält maxHp klein genug, dass der
    // 6-s-DoT die 45-%-Auto-Eat-Schwelle (Tier 0, Balance-Kette Schritt 4) sicher unterschreitet.
    const s = createGame({ name: "X", baseAttributes: { con: 5 } }, content, 1);
    s.character.food = "cooked_trout"; // healAmount 3 (Cooking-Retune #241)
    addItem(s.inventory, content, "cooked_trout", 50);
    startCombat(s, content, "chicken");
    // Gegner schlägt im Testfenster nicht → HP-Verlust kommt ausschließlich vom DoT. Der SPIELER
    // greift ebenfalls nicht an (Timer eingefroren): ein Kill würde den Kill-Cooldown starten, in
    // dem Auto-Eat bewusst gegatet ist (Combat-Feel v2) — das würde hier die Messung verfälschen
    // (der Test prüft „Essen durch DoT", nicht das Cooldown-Gate).
    s.combat.enemyTimerMs = -100_000;
    s.combat.playerTimerMs = -100_000;
    s.character.hp = computeStats(s, content).maxHp;

    // 0.2 HP/Tick (Squish-Skala): vom Auto-Eat (cooked_trout heal 3) sicher tragbar → der DoT löst
    // Essen aus, tötet aber nicht. (Wichtig seit Chef 2026-07-01: ein Tod würde den Kampf ABBRECHEN —
    // ein zu harter DoT würde also nicht still überdeckt, sondern die Messung sofort beenden.)
    // Fenster 8 s: die 45-%-Schwelle (Tier 0) wird bei maxHp 21 nach ~5,9 s DoT unterschritten.
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 2 });
    const foodBefore = itemCount(s.inventory, "cooked_trout");

    for (let i = 0; i < 80; i++) combatStep(s, content); // 8 s reiner DoT

    expect(itemCount(s.inventory, "cooked_trout")).toBeLessThan(foodBefore); // hat WEGEN des DoT gegessen
    expect(s.stats.deaths).toBe(0); // überlebt tatsächlich (kein Tod, kein Abbruch)
    expect(s.combat.monsterId).not.toBeNull(); // Kampf läuft (nicht abgebrochen)
    expect(s.character.hp).toBeGreaterThan(0);
  });

  it("ohne Essen bricht ein tödlicher DoT den Kampf ab (Niederlage-Strafe, Chef 2026-07-01)", () => {
    const s = createGame({ name: "X", baseAttributes: { con: 5 } }, content, 2);
    startCombat(s, content, "chicken");
    s.combat.enemyTimerMs = -100_000;
    s.character.hp = computeStats(s, content).maxHp;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 60_000, magnitude: 20 });
    for (let i = 0; i < 60; i++) combatStep(s, content);
    // An DoT gestorben → Kampf ABGEBROCHEN (kein Auto-Neustart mehr): Tod gezählt, HP voll
    // zurückgesetzt, transienter Gift-DoT beim Tod verfallen, monsterId genullt (stopReason defeated).
    // Nach dem Abbruch sind die restlichen Ticks No-Ops → deaths bleibt bei genau 1 (kein Weiter-Sterben).
    expect(s.stats.deaths).toBe(1);
    expect(s.combat.monsterId).toBeNull();
    expect(s.combat.stopReason).toBe("defeated");
    expect(s.combat.playerEffects).toHaveLength(0);
    expect(s.character.hp).toBe(computeStats(s, content).maxHp); // voll geheilt, kein negativer HP
  });
});

describe("Auto-Eat: automatischer Futter-Wechsel (Spieler-Report 2026-07-21)", () => {
  it("wechselt auf ein anderes Food, sobald das gewählte leer läuft (statt aufzuhören zu heilen)", () => {
    const s = createGame({ name: "X", baseAttributes: { con: 5 } }, content, 1);
    s.character.food = "cooked_trout"; // gewähltes Food: nur EIN Stück
    addItem(s.inventory, content, "cooked_trout", 1);
    addItem(s.inventory, content, "cooked_shrimp", 50); // zweites Food als Fallback
    startCombat(s, content, "chicken");
    s.combat.enemyTimerMs = -100_000;
    s.combat.playerTimerMs = -100_000;
    // HP weit unter die Ess-Schwelle setzen → Auto-Eat feuert sofort und wiederholt. Kein DoT: die
    // HP steigen nur (kein Tod) — der Test prüft rein den automatischen Futter-Wechsel.
    s.character.hp = 1;

    for (let i = 0; i < 200; i++) combatStep(s, content);

    expect(itemCount(s.inventory, "cooked_trout")).toBe(0); // erstes Food (1 Stück) aufgebraucht
    expect(itemCount(s.inventory, "cooked_shrimp")).toBeLessThan(50); // danach auto-umgeschaltet + gegessen
    expect(s.character.food).toBe("cooked_shrimp"); // Auswahl automatisch umgestellt (UI-Icon aktualisiert sich)
    expect(s.character.hp).toBeGreaterThan(1); // hat tatsächlich geheilt (Wechsel hat funktioniert)
    expect(s.stats.deaths).toBe(0); // kein Tod
  });

  it("leert die Food-Auswahl, wenn gar kein Food mehr da ist (kein totes Icon)", () => {
    const s = createGame({ name: "X", baseAttributes: { con: 5 } }, content, 1);
    s.character.food = "cooked_trout";
    addItem(s.inventory, content, "cooked_trout", 1); // nur 1, kein Ersatz
    startCombat(s, content, "chicken");
    s.combat.enemyTimerMs = -100_000;
    s.combat.playerTimerMs = -100_000;
    s.character.hp = computeStats(s, content).maxHp;
    s.combat.playerEffects.push({ type: "poison", remainingMs: 120_000, magnitude: 2 });

    for (let i = 0; i < 200; i++) combatStep(s, content);

    expect(itemCount(s.inventory, "cooked_trout")).toBe(0);
    expect(s.character.food).toBeNull(); // Auswahl geleert → UI zeigt kein aufgebrauchtes Food mehr
  });
});
