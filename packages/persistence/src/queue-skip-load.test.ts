import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { advanceActionQueue, canFightMonster, createGame, enqueueFight } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Spieler-Report 1.0.2 (67-h-Spieler): „if you tried to fight a monster you were not ready for it
 * gave you an error message, but each time you load your game it repeats that error message even
 * though you are strong enough to fight them now."
 *
 * Die „error message" ist der Skip-Hinweis des Queue-Panels („Aus der Warteschlange entfernt:
 * {monster} — Voraussetzung nicht erfüllt.", i18n `queue.skip.gate_locked`), gespeist aus dem
 * persistierten Breadcrumb `GameState.lastQueueSkip` (SAVE_VERSION 73). Zwei Lücken:
 *  1. Das Panel merkte sich die Weg-Klickung nur in lokalem React-State — das Save-Feld blieb
 *     gefüllt und der Hinweis stand nach jedem Start wieder da. Fix: der Melder quittiert im
 *     State (client ActionQueuePanel.tsx, nicht headless testbar → hier nur der Persistenz-Teil).
 *  2. Die Persistenz reichte den Breadcrumb beim Laden ungeprüft durch, auch wenn das Gate
 *     längst offen war. Fix: sanitize prüft den Grund neu und verwirft, was heute nicht mehr gilt.
 *
 * Fixture-Konvention wie combat-gate-load.test.ts: goblin sitzt in `borderlands` (Gate
 * chronicle_03) — ein frischer Save hat die Zone GESPERRT; `legacyZoneGrants` öffnet sie.
 */

const SAVED_AT = 1_000_000;

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const r = deserialize(serialize(s, SAVED_AT), content, SAVED_AT);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Skip-Breadcrumb beim Laden (Spieler-Report 1.0.2)", () => {
  it("gate_locked überlebt den Load nur, solange das Gate noch greift; nach dem Freischalten ist er weg", () => {
    const s = createGame({ name: "Report" }, content, 7);
    // Der echte Engine-Pfad: Kampf eingereiht, der Queue-Start prüft das Gate und überspringt.
    expect(enqueueFight(s, content, "goblin", 10)).toBe(true);
    expect(advanceActionQueue(s, content)).toBe(false);
    expect(s.lastQueueSkip).toEqual({ monsterId: "goblin", reason: "gate_locked" });

    // Gate weiterhin zu → der Hinweis ist noch wahr und bleibt (wie `lastStop`).
    const stillLocked = roundTrip(s);
    expect(canFightMonster(stillLocked, content, "goblin")).toBe(false);
    expect(stillLocked.lastQueueSkip).toEqual({ monsterId: "goblin", reason: "gate_locked" });

    // Der Spieler hat die Voraussetzung inzwischen erfüllt (hier: Zonen-Grant) → beim nächsten
    // Laden darf die veraltete Meldung nicht mehr erscheinen.
    stillLocked.legacyZoneGrants["borderlands"] = true;
    expect(canFightMonster(stillLocked, content, "goblin")).toBe(true);
    const unlocked = roundTrip(stillLocked);
    expect(unlocked.lastQueueSkip).toBeNull();
    // Idempotent: ein weiterer Load ändert nichts mehr.
    expect(roundTrip(unlocked).lastQueueSkip).toBeNull();
  });

  it("quittierter Breadcrumb (×-Klick nullt das Feld) bleibt über Save/Load null", () => {
    const s = createGame({ name: "Quittiert" }, content, 7);
    enqueueFight(s, content, "goblin", 10);
    advanceActionQueue(s, content);
    expect(s.lastQueueSkip).not.toBeNull();
    s.lastQueueSkip = null; // genau das tut der ×-Button im Queue-Panel
    expect(roundTrip(s).lastQueueSkip).toBeNull();
  });

  it("unknown_monster / not_queueable gelten nur, solange der Grund heute noch stimmt", () => {
    // Monster existiert wieder (Content zurückgerollt/ergänzt) → "unknown_monster" ist veraltet.
    const known = createGame({ name: "Bekannt" }, content, 1);
    known.lastQueueSkip = { monsterId: "chicken", reason: "unknown_monster" };
    expect(roundTrip(known).lastQueueSkip).toBeNull();

    // Monster weiterhin unbekannt → Breadcrumb bleibt (Content-Drift ist gerade der Grund).
    const gone = createGame({ name: "Weg" }, content, 1);
    gone.lastQueueSkip = { monsterId: "weg_damit", reason: "unknown_monster" };
    expect(roundTrip(gone).lastQueueSkip).toEqual({ monsterId: "weg_damit", reason: "unknown_monster" });

    // Normales Zonen-Monster als "not_queueable" gestempelt → heute einreihbar → weg.
    const queueable = createGame({ name: "Einreihbar" }, content, 1);
    queueable.lastQueueSkip = { monsterId: "chicken", reason: "not_queueable" };
    expect(roundTrip(queueable).lastQueueSkip).toBeNull();

    // dungeonOnly-Monster bleibt "not_queueable" (Grund trifft weiterhin zu).
    expect(content.monsters["goblin_reaver"]?.dungeonOnly).toBe(true);
    const dungeon = createGame({ name: "Dungeon" }, content, 1);
    dungeon.lastQueueSkip = { monsterId: "goblin_reaver", reason: "not_queueable" };
    expect(roundTrip(dungeon).lastQueueSkip).toEqual({ monsterId: "goblin_reaver", reason: "not_queueable" });

    // "gate_locked" für ein frei kämpfbares Monster → veraltet → weg.
    const free = createGame({ name: "Frei" }, content, 1);
    expect(canFightMonster(free, content, "chicken")).toBe(true);
    free.lastQueueSkip = { monsterId: "chicken", reason: "gate_locked" };
    expect(roundTrip(free).lastQueueSkip).toBeNull();
  });
});
