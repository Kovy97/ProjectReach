import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { applyEnemyStatus, startCombat } from "./combat";

/**
 * P1-Regression (Min-Maxer): Ein Status-Refresh gleicher Art darf einen stärkeren/längeren
 * bestehenden Effekt NIE abschwächen. Vorher überschrieb `applyEnemyStatus` Magnitude + Dauer
 * bedingungslos (last-write-wins) → eine schwache Feuer-Verzauberung (burn ~4-14) zog eine starke
 * Apex-Glut (burn 48) nach unten und machte die Apex-Waffe schwächer. Fix: `max`-Merge.
 */
describe("status refresh merges via max (never downgrades)", () => {
  const goblin = content.monsters.goblin!; // resistet keinen Status

  it("schwacher Refresh senkt eine starke bestehende Glut NICHT", () => {
    const s = createGame({ name: "X" }, content, 1);
    startCombat(s, content, "goblin");
    // Starke Glut zuerst (z.B. Apex-Burn-Stab).
    applyEnemyStatus(s, goblin, { type: "burn", magnitude: 48, durationMs: 5000 });
    // Kurz darauf eine schwache, kurze Feuer-Affix-Glut.
    applyEnemyStatus(s, goblin, { type: "burn", magnitude: 6, durationMs: 1000 });

    const burn = s.combat.enemyEffects.find((e) => e.type === "burn");
    expect(burn).toBeDefined();
    expect(burn!.magnitude).toBe(48); // bleibt stark, NICHT auf 6 heruntergesetzt
    expect(burn!.remainingMs).toBe(5000); // längere Rest-Dauer bleibt erhalten
    // Refresh stapelt nicht — es bleibt genau EINE Burn-Instanz.
    expect(s.combat.enemyEffects.filter((e) => e.type === "burn")).toHaveLength(1);
  });

  it("starker Refresh HEBT eine schwache bestehende Magnitude an", () => {
    const s = createGame({ name: "X" }, content, 2);
    startCombat(s, content, "goblin");
    applyEnemyStatus(s, goblin, { type: "bleed", magnitude: 5, durationMs: 1000 });
    applyEnemyStatus(s, goblin, { type: "bleed", magnitude: 20, durationMs: 4000 });

    const bleed = s.combat.enemyEffects.find((e) => e.type === "bleed");
    expect(bleed!.magnitude).toBe(20);
    expect(bleed!.remainingMs).toBe(4000);
  });

  it("Refresh verlängert die Rest-Dauer auf den neuen Wert (gleiche Quelle, abgelaufene Zeit)", () => {
    const s = createGame({ name: "X" }, content, 3);
    startCombat(s, content, "goblin");
    // Effekt schon teilweise abgelaufen (Rest 300ms).
    s.combat.enemyEffects.push({ type: "poison", remainingMs: 300, magnitude: 10 });
    // Gleich starker Refresh mit voller Dauer → auf 2000 aufgefrischt (verlängert), Magnitude bleibt.
    applyEnemyStatus(s, goblin, { type: "poison", magnitude: 10, durationMs: 2000 });

    const poison = s.combat.enemyEffects.find((e) => e.type === "poison");
    expect(poison!.remainingMs).toBe(2000);
    expect(poison!.magnitude).toBe(10);
  });

  it("immuner Gegner ignoriert den Status weiterhin (Resist-Pfad unberührt)", () => {
    const s = createGame({ name: "X" }, content, 4);
    const ember = content.monsters.ember_elemental!; // burn-immun
    startCombat(s, content, "ember_elemental");
    applyEnemyStatus(s, ember, { type: "burn", magnitude: 48, durationMs: 5000 });
    expect(s.combat.enemyEffects.some((e) => e.type === "burn")).toBe(false);
  });
});
