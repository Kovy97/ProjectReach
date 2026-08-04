import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { computeStats, activeSets } from "./character";

function equipCopper(pieces: string[]) {
  const s = createGame({ name: "X" }, content, 1);
  const slotFor: Record<string, keyof typeof s.character.equipment> = {
    copper_medhelm: "helmet",
    copper_platebody: "body",
    copper_platelegs: "legs",
    copper_gauntlets: "gloves",
    copper_sabatons: "boots",
  };
  for (const p of pieces) s.character.equipment[slotFor[p]!] = p;
  return s;
}

describe("equipment set bonuses", () => {
  it("Set wird erst ab minPieces aktiv (Kupfer: 5)", () => {
    const four = equipCopper(["copper_medhelm", "copper_platebody", "copper_platelegs", "copper_gauntlets"]);
    expect(activeSets(four, content).map((x) => x.id)).not.toContain("copper_set");

    const five = equipCopper(["copper_medhelm", "copper_platebody", "copper_platelegs", "copper_gauntlets", "copper_sabatons"]);
    expect(activeSets(five, content).map((x) => x.id)).toContain("copper_set");
  });

  it("voll getragenes Kupfer-Set gewährt zusätzlich CON-Set-Bonus (Itemization 2.0 §6.6; CON-Kanal seit Itemization 2.5)", () => {
    // Item-modifiers (itemization-parity-fix §4.2, strikte Leiter + 0-Attribut-Verbot): copper_medhelm
    // con 1, copper_platebody str 1/con 1, copper_platelegs str 1/con 1, copper_gauntlets con 1,
    // copper_sabatons con 1. copper_set-Krönung (§6.6, ab 5 Teilen): str 1 · con 1.
    // Rüstungs-Trinität / Itemization 2.5 (armor-trinity-spec §1.1): CON zahlt NICHT mehr auf defense
    // (das kommt jetzt aus armorRating), sondern nur noch auf maxHp (con·2). Der CON-Set-Bonus wird
    // daher über die CON-Attributsumme UND maxHp geprüft (früher über defense).
    const base = createGame({ name: "X" }, content, 1);
    const baseCon = computeStats(base, content).attributes.con;
    const baseMaxHp = computeStats(base, content).maxHp;

    // 4 Teile (kein Set, < minPieces 5): Σcon = 1+1+1+1 = 4 → +4 CON → +8 maxHp.
    const four = equipCopper(["copper_medhelm", "copper_platebody", "copper_platelegs", "copper_gauntlets"]);
    expect(activeSets(four, content).map((x) => x.id)).not.toContain("copper_set");
    expect(computeStats(four, content).attributes.con - baseCon).toBe(4);
    expect(computeStats(four, content).maxHp - baseMaxHp).toBeCloseTo(4 * 2, 6);

    // 5. Teil (copper_sabatons) trägt selbst con 1 UND aktiviert das Set (+1 con) → Σcon = 6 → +12 maxHp.
    const five = equipCopper(["copper_medhelm", "copper_platebody", "copper_platelegs", "copper_gauntlets", "copper_sabatons"]);
    expect(activeSets(five, content).map((x) => x.id)).toContain("copper_set");
    expect(computeStats(five, content).attributes.con - baseCon).toBe(6);
    expect(computeStats(five, content).maxHp - baseMaxHp).toBeCloseTo(6 * 2, 6);
  });

  it("Content: alle Set-Teile sind existierende Items", () => {
    for (const set of content.sets) {
      for (const p of set.pieces) expect(content.items[p], `${set.id}: ${p} fehlt`).toBeDefined();
    }
  });
});
