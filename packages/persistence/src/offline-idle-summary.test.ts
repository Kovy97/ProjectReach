import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame, enqueueAction, enqueueFight, selectFood } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * claude:2026-10-31T16:08:21+01:00 — 1.4.2 (Sweep-Idee, Chef-GO 31.10.2026): der Offline-Bericht meldet den Leerlauf. `OfflineSummary.idleMs`
 * (gesamte ungenutzte Zeit) und `idleFromMs` (Versatz des ersten längeren Leerlaufs) entstehen beim Laden aus dem Offline-Nachholen; beides
 * ist transient und landet nie im Spielstand.
 */
const SAVED_AT = 1_000_000;
const HOUR = 3_600_000;

function load(s: GameState, offlineMs: number) {
  const r = deserialize(serialize(s, SAVED_AT), content, SAVED_AT + offlineMs);
  expect(r).not.toBeNull();
  return r!;
}

describe("Offline-Bericht: Leerlauf", () => {
  it("nichts eingeplant: das ganze Fenster ist Leerlauf ab Beginn", () => {
    const s = createGame({ name: "Pause", createdAt: 1 }, content, 4);
    const r = load(s, 2 * HOUR);
    expect(r.offline.idleMs).toBe(2 * HOUR);
    expect(r.offline.idleFromMs).toBe(0);
    expect(serialize(r.state, SAVED_AT)).not.toContain("idleMs"); // kein Save-Feld
  });

  it("Aktion läuft unterwegs aus: Leerlauf ab ihrem Ende", () => {
    const s = createGame({ name: "Pause", createdAt: 1 }, content, 4);
    enqueueAction(s, content, "cut_normal_tree", 5);
    const r = load(s, HOUR);
    expect(r.offline.idleFromMs).toBeGreaterThan(0);
    expect(r.offline.idleMs).toBe(HOUR - r.offline.idleFromMs!);
  });

  it("Kampf das ganze Fenster: keine Leerlauf-Felder", () => {
    const s = createGame({ name: "Pause", createdAt: 1 }, content, 5);
    s.bank.cooked_trout = 2000;
    selectFood(s, content, "cooked_trout");
    enqueueFight(s, content, "chicken", null);
    const r = load(s, HOUR);
    expect(r.state.stats.deaths).toBe(0);
    expect(r.offline.idleMs).toBeUndefined();
    expect(r.offline.idleFromMs).toBeUndefined();
  });

  it("ohne Offline-Zeit keine Leerlauf-Felder", () => {
    const s = createGame({ name: "Pause", createdAt: 1 }, content, 4);
    const r = load(s, 0);
    expect(r.offline.idleMs).toBeUndefined();
    expect(r.offline.idleFromMs).toBeUndefined();
  });
});
