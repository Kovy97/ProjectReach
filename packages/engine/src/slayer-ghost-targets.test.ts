import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { DUNGEON_VARIANT_PREFIX } from "@hearthforge/shared";
import { createGame } from "./state";
import { xpForLevel } from "./leveling";
import { killCreditMonsterId } from "./combat";
import { assignTask, worldTaskMonsters } from "./slayer";

/**
 * Guard-Tests Task #347 (P0, Spieler-Report 93h-Endgame): Slayer-Tasks zielten auf
 * „Geister-Varianten" — die dg_-Dungeon-Zwillinge der Krypta (dg_skeleton_warrior & Co.) tragen
 * zone: "crypt" aber KEIN dungeonOnly-Flag und rutschten so in den DYNAMISCHEN Welt-Task-Pool
 * (worldTaskMonsters). Ein Task auf eine dg_-ID ist mathematisch UNERFÜLLBAR: JEDER Kill (Zone wie
 * Dungeon-Welle) kreditiert über killCreditMonsterId (combat.ts) auf die BASIS-ID — der
 * dg_-Task-Zähler sieht nie einen Treffer (Report: „0/43, Kills zählen NICHT").
 *
 * Der Fix filtert dg_-Varianten (DUNGEON_VARIANT_PREFIX, shared) aus dem Welt-Pool. Die
 * KREDIT-Richtung bleibt unangetastet: Dungeon-Kills zählen weiter auf Basis-ID-Tasks.
 */

/** Setzt alle Kampf-Fertigkeiten auf ein Level → combatLevel == lvl (Muster slayer.test.ts). */
function setCombatLevel(s: ReturnType<typeof createGame>, lvl: number): void {
  for (const id of ["attack", "power", "defence", "ranged", "magic", "warding", "vitality"]) {
    s.skills[id] = { xp: xpForLevel(lvl) };
  }
}

/** Frischer Spielstand mit ALLEN Zonen offen (legacyZoneGrants) — das Zonen-Gate ist hier nicht
 *  Testgegenstand; ohne Grants fiele die Krypta (Story-Gate) aus dem Pool und der Guard liefe leer. */
function openWorldState(cl: number): ReturnType<typeof createGame> {
  const s = createGame({ name: "Guard" }, content, 347);
  for (const z of content.zones) s.legacyZoneGrants[z.id] = true;
  setCombatLevel(s, cl);
  return s;
}

describe("slayer #347 — Welt-Task-Pool liefert NIE Geister-Varianten", () => {
  it("worldTaskMonsters: über alle Kampf-Level keine dg_-/Turm-/dungeonOnly-IDs, jede ID kreditiert auf sich selbst", () => {
    for (let cl = 1; cl <= 150; cl += 1) {
      const s = openWorldState(cl);
      for (const id of worldTaskMonsters(s, content)) {
        const m = content.monsters[id]!;
        expect(id.startsWith(DUNGEON_VARIANT_PREFIX), `CL ${cl}: dg_-Geist ${id} im Welt-Pool`).toBe(false);
        expect(m.zone, `CL ${cl}: Turm-Monster ${id} im Welt-Pool`).not.toBe("slayer_tower");
        expect(m.slayerFloor, `CL ${cl}: Etagen-Monster ${id} im Welt-Pool`).toBeUndefined();
        expect(m.dungeonOnly ?? false, `CL ${cl}: dungeonOnly-Monster ${id} im Welt-Pool`).toBe(false);
        // Kern-Invariante: das Task-Ziel MUSS sein eigener Kill-Credit sein, sonst zählt nie ein Kill.
        expect(killCreditMonsterId(content, id), `CL ${cl}: ${id} kreditiert woandershin`).toBe(id);
      }
    }
  });

  it("Regression (Report 0/43): CL 60 — Basis skeleton_warrior im Pool, dg_skeleton_warrior NICHT", () => {
    const s = openWorldState(60); // Fenster [61..68] deckt die L65-Skelette
    const pool = worldTaskMonsters(s, content);
    expect(pool).toContain("skeleton_warrior");
    expect(pool).not.toContain("dg_skeleton_warrior");
    expect(pool).not.toContain("dg_skeleton_archer");
  });

  it("assignTask-Fuzz: 250 Vergaben im Skelett-Band — nie eine dg_-ID, Welt-Tasks nur auf echte Welt-Monster", () => {
    for (let seed = 0; seed < 250; seed++) {
      const s = createGame({ name: "Fuzz" }, content, seed);
      for (const z of content.zones) s.legacyZoneGrants[z.id] = true;
      setCombatLevel(s, 60 + (seed % 35)); // CL 60..94 überstreicht das gesamte Krypta-Band (L65–90)
      s.skills["slayer"] = { xp: xpForLevel(80) }; // alle Etagen offen → auch der Turm-Pfad wird gewürfelt
      const task = assignTask(s, content, "brenna_ashwick");
      expect(task, `seed ${seed}: kein Task vergeben`).not.toBeNull();
      const m = content.monsters[task!.monsterId]!;
      expect(task!.monsterId.startsWith(DUNGEON_VARIANT_PREFIX), `seed ${seed}: dg_-Task ${task!.monsterId}`).toBe(false);
      expect(killCreditMonsterId(content, task!.monsterId)).toBe(task!.monsterId);
      if (!task!.isTower) {
        expect(m.zone).not.toBe("slayer_tower");
        expect(m.slayerFloor).toBeUndefined();
        expect(m.dungeonOnly ?? false).toBe(false);
      }
    }
  });
});
