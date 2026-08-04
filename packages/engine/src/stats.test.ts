import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createTestGame } from "./test-helpers";
import { startCombat, stopCombat } from "./combat";
import { setActiveAction } from "./actions";
import { advance } from "./tick";
import { computeStats } from "./character";

describe("player stats", () => {
  it("zählt Kills lebenslang über mehrere Kampf-Sessions hinweg", () => {
    // Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §6.1): con 4→40 gibt genug HP-Puffer,
    // damit Session 2 (nach vollem Heal) zuverlässig einen weiteren Kill schafft, bevor der neue
    // Gegner-Damage-Rescale (goblin dmg 1→7) einen zweiten Tod riskiert — die Kill-Zählung selbst
    // ist der Testzweck, nicht die Survival-Ökonomie (Kommentar unten bleibt dazu bestehen).
    const s = createTestGame({ name: "X", baseAttributes: { str: 6, con: 40 } }, content, 7);
    expect(s.stats.kills).toBe(0);

    startCombat(s, content, "goblin");
    advance(s, content, 120_000);
    const afterFirst = s.stats.kills;
    expect(afterFirst).toBeGreaterThan(0);

    // combat.kills wird beim Neustart genullt, stats.kills nicht.
    stopCombat(s);
    startCombat(s, content, "goblin");
    // Vor Session 2 voll heilen: ohne Food endet Session 1 je nach Roll-Sequenz auf Rest-HP —
    // ein sofortiger Tod würde den Kampf abbrechen (Chef 2026-07-01) und die Kill-Zählung
    // vakuant machen. Der Test misst die LEBENSLANGE Zählung, nicht die Survival-Ökonomie.
    s.character.hp = computeStats(s, content).maxHp;
    expect(s.combat.kills).toBe(0);
    advance(s, content, 60_000);
    expect(s.stats.kills).toBeGreaterThan(afterFirst);
  });

  it("zählt Kills je Monster im Bestiarium", () => {
    const s = createTestGame({ name: "X", baseAttributes: { str: 6, con: 4 } }, content, 7);
    expect(s.monsterKills.goblin ?? 0).toBe(0);

    startCombat(s, content, "goblin");
    advance(s, content, 120_000);

    expect(s.monsterKills.goblin ?? 0).toBeGreaterThan(0);
    // Nur das gekämpfte Monster wird gezählt.
    expect(s.monsterKills.ash_rat ?? 0).toBe(0);
    // Bestiarium-Summe stimmt mit der Gesamt-Kill-Statistik überein.
    const beastiarySum = Object.values(s.monsterKills).reduce((a, b) => a + b, 0);
    expect(beastiarySum).toBe(s.stats.kills);
  });

  it("zählt gesammelte Items beim Sammeln", () => {
    const s = createTestGame({ name: "X" }, content, 1);
    expect(s.stats.itemsGathered).toBe(0);
    setActiveAction(s, content, "cut_normal_tree");
    advance(s, content, 30_000); // 10 Abschlüsse
    expect(s.stats.itemsGathered).toBeGreaterThanOrEqual(10);
  });
});
