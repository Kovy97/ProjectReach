import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { DUNGEON_VARIANT_PREFIX } from "@hearthforge/shared";
import type { GameState } from "@hearthforge/shared";
import { achievementProgress } from "./achievements";

/**
 * Spieler-Report 31.08.2026 (FR, 1.2.3, Save 86, 147 h Spielzeit): „Crypt achievement is bugged on
 * my account. I have defeated all the crypt monsters, the champions, and the dungeon monsters more
 * than 100 times, but my achievement tracker remains stuck at 0/1 and 0/100."
 *
 * Ursache: Die Zone `crypt` fuehrt fuenf Dungeon-Varianten (`dg_skeleton_*`) als eigene Monster mit
 * `zone: "crypt"`. Kills darauf werden aber unter der BASIS-Id verbucht (combat.ts
 * `killCreditMonsterId`), `monsterKills["dg_…"]` bleibt also immer 0. Weil der Erfolg das MINIMUM
 * ueber alle Zonen-Monster nimmt, war er unerfuellbar.
 *
 * Diese Tests pinnen beide Seiten: die Varianten zaehlen nicht mehr mit, und ein echtes
 * Zonen-Monster ohne Kills blockiert weiterhin korrekt.
 */

function stateMit(kills: Record<string, number>): GameState {
  return { monsterKills: kills } as unknown as GameState;
}

const cryptMonster = Object.values(content.monsters).filter((m) => m.zone === "crypt");
const echte = cryptMonster.filter((m) => !m.id.startsWith(DUNGEON_VARIANT_PREFIX));
const varianten = cryptMonster.filter((m) => m.id.startsWith(DUNGEON_VARIANT_PREFIX));

describe("Zonen-Bestiarium: Dungeon-Varianten zaehlen nicht mit", () => {
  it("die Krypta hat ueberhaupt Dungeon-Varianten — sonst prueft dieser Test nichts", () => {
    expect(varianten.length).toBeGreaterThan(0);
    expect(echte.length).toBeGreaterThan(0);
  });

  it("alle ECHTEN Krypta-Monster 100x besiegt erfuellt den Erfolg, auch ohne dg_-Kills", () => {
    const kills: Record<string, number> = {};
    for (const m of echte) kills[m.id] = 100;
    // Genau die Lage des Spielers: die dg_-Eintraege stehen auf 0, weil Dungeon-Kills unter der
    // Basis-Id landen.
    const fortschritt = achievementProgress(
      stateMit(kills),
      { type: "zone_bestiary", target: "crypt", count: 100 } as never,
      content,
    );
    expect(fortschritt).toBe(100);
  });

  it("ein einziges nicht besiegtes ECHTES Monster blockiert weiterhin", () => {
    const kills: Record<string, number> = {};
    for (const m of echte) kills[m.id] = 100;
    kills[echte[0]!.id] = 0;
    const fortschritt = achievementProgress(
      stateMit(kills),
      { type: "zone_bestiary", target: "crypt", count: 1 } as never,
      content,
    );
    expect(fortschritt).toBe(0);
  });

  it("eine Zone ohne Dungeon-Varianten verhaelt sich unveraendert", () => {
    const pastures = Object.values(content.monsters).filter((m) => m.zone === "pastures");
    const kills: Record<string, number> = {};
    for (const m of pastures) kills[m.id] = 7;
    const fortschritt = achievementProgress(
      stateMit(kills),
      { type: "zone_bestiary", target: "pastures", count: 1 } as never,
      content,
    );
    expect(fortschritt).toBe(7);
  });
});

/**
 * Der eigentliche Waechter: Kein Bestiarium-Erfolg darf ein Ziel tragen, das selbst ein Spieler mit
 * ALLEN erreichbaren Kills nicht schafft. Genau diese Luecke liess „Krypta“ (zone_bestiary) und
 * „Das ganze Bestiarium“ (monsters_discovered, Ziel 110 bei 105 erreichbaren Wesen) monatelang
 * unerfuellbar durchgehen.
 */
describe("Bestiarium-Erfolge sind erreichbar", () => {
  const allesGetoetet = (): GameState => {
    const kills: Record<string, number> = {};
    for (const m of Object.values(content.monsters)) {
      if (m.id.startsWith(DUNGEON_VARIANT_PREFIX)) continue; // kann nie eigene Kills sammeln
      kills[m.id] = 1000;
    }
    return stateMit(kills);
  };

  it("jeder monsters_discovered- und zone_bestiary-Erfolg wird von einem Vollende-Save erfuellt", () => {
    const s = allesGetoetet();
    const betroffen = content.achievements.filter(
      (a) => a.condition.type === "monsters_discovered" || a.condition.type === "zone_bestiary",
    );
    expect(betroffen.length).toBeGreaterThan(0);
    const unerfuellt = betroffen
      .filter((a) => achievementProgress(s, a.condition, content) < a.condition.count)
      .map((a) => `${a.id} (${achievementProgress(s, a.condition, content)}/${a.condition.count})`);
    expect(unerfuellt).toEqual([]);
  });

  it('„Das ganze Bestiarium“ zielt auf die Zahl der Wesen, die das Bestiarium auch zeigt', () => {
    const def = content.achievements.find((a) => a.id === "ach_bestiary_all");
    expect(def).toBeDefined();
    const sichtbar = Object.keys(content.monsters).filter(
      (id) => !id.startsWith(DUNGEON_VARIANT_PREFIX),
    ).length;
    expect(def!.condition.count).toBe(sichtbar);
  });
});
