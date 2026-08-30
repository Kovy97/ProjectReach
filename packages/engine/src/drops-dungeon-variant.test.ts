import { describe, expect, it } from "vitest";
import { DUNGEON_VARIANT_PREFIX } from "@hearthforge/shared";
import type { GameState, MonsterDef } from "@hearthforge/shared";
import { hasDropSeen, markDropSeen, seenDropCount } from "./drops";

/**
 * Spieler-Report 30.08.2026 (Crypt-Dungeon): Der Kampfschirm zeigte im Dungeon dauerhaft "0/6",
 * obwohl die Beute im Inventar lag.
 *
 * Ursache war eine Diskrepanz zwischen Schreib- und Lesepfad. Dungeon-Gegner tragen die Id
 * `dg_<basis>`; der Kill-Pfad in combat.ts schreibt den entdeckten Drop bewusst unter der
 * BASIS-Id (`killCreditMonsterId`), damit Varianten-Beute im Bestiarium des Grundmonsters landet.
 * Die Leser in drops.ts nahmen dagegen die rohe Monster-Id und schauten damit in
 * `seenDrops["dg_gray_wolf"]`, das nie befuellt wird.
 *
 * Im normalen Kampf faellt das nicht auf, weil dort Basis-Id und Monster-Id identisch sind —
 * deshalb blieb es bis zum Spieler-Report unentdeckt. Diese Tests pinnen beide Richtungen.
 */

function leererState(): GameState {
  return { seenDrops: {}, seenActionDrops: {} } as unknown as GameState;
}

function monster(id: string, items: string[]): MonsterDef {
  return {
    id,
    loot: items.map((itemId) => ({ itemId, chance: 1, min: 1, max: 1 })),
  } as unknown as MonsterDef;
}

describe("Drop-Entdeckung: Dungeon-Varianten lesen unter der Basis-Id", () => {
  it("hasDropSeen findet einen unter der Basis-Id markierten Drop auch fuer die Dungeon-Variante", () => {
    const s = leererState();
    // So schreibt der Kill-Pfad: Basis-Id, nicht `dg_gray_wolf`.
    markDropSeen(s, "gray_wolf", "raw_hide");

    expect(hasDropSeen(s, "gray_wolf", "raw_hide")).toBe(true);
    expect(hasDropSeen(s, `${DUNGEON_VARIANT_PREFIX}gray_wolf`, "raw_hide")).toBe(true);
  });

  it("seenDropCount zaehlt fuer die Dungeon-Variante dasselbe wie fuer das Grundmonster", () => {
    const s = leererState();
    markDropSeen(s, "gray_wolf", "raw_hide");
    markDropSeen(s, "gray_wolf", "fang");

    const def = monster(`${DUNGEON_VARIANT_PREFIX}gray_wolf`, ["raw_hide", "fang", "warhide"]);
    // Genau der Zaehler aus dem Kampfschirm, der "0/6" zeigte.
    expect(seenDropCount(s, def)).toEqual({ seen: 2, total: 3 });
  });

  it("meldet nichts faelschlich als entdeckt", () => {
    const s = leererState();
    markDropSeen(s, "gray_wolf", "raw_hide");

    expect(hasDropSeen(s, `${DUNGEON_VARIANT_PREFIX}gray_wolf`, "warhide")).toBe(false);
    // Ein anderes Monster darf von der Basis-Aufloesung nicht profitieren.
    expect(hasDropSeen(s, `${DUNGEON_VARIANT_PREFIX}dire_wolf`, "raw_hide")).toBe(false);
  });

  it("bevorzugt einen vorhandenen Varianten-Eintrag (Alt-Saves, die direkt unter dg_ geschrieben haben)", () => {
    const s = leererState();
    markDropSeen(s, `${DUNGEON_VARIANT_PREFIX}gray_wolf`, "crypt_key");

    expect(hasDropSeen(s, `${DUNGEON_VARIANT_PREFIX}gray_wolf`, "crypt_key")).toBe(true);
  });

  it("normale Monster bleiben unveraendert", () => {
    const s = leererState();
    markDropSeen(s, "goblin", "crude_bone");

    expect(hasDropSeen(s, "goblin", "crude_bone")).toBe(true);
    expect(hasDropSeen(s, "goblin", "fang")).toBe(false);
    expect(seenDropCount(s, monster("goblin", ["crude_bone", "fang"]))).toEqual({ seen: 1, total: 2 });
  });
});
