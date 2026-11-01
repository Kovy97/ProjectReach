import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { TICK_MS } from "@hearthforge/shared";
import { createTestGame } from "./test-helpers";
import { enqueueAction, enqueueFight, setActiveAction } from "./actions";
import { selectFood } from "./combat";
import { OFFLINE_IDLE_MIN_RUN_MS, advance, createOfflineIdleTally, isHeroIdle } from "./tick";

/**
 * claude:2026-10-31T16:08:21+01:00 — 1.4.2 (Sweep-Idee, Chef-GO 31.10.2026): Offline-Bericht zeigt den Leerlauf. `advance` zählt mit
 * einem optionalen, NICHT gespeicherten Sammler, wie lange nichts lief (keine Aktion, kein Kampf, kein belegter Raid) und ab wann der
 * erste längere Leerlauf begann. Reiner Beobachter: der Tick-Verlauf bleibt bit-gleich.
 */
function hero(seed = 5): GameState {
  return createTestGame({ name: "Leerlauf", createdAt: 1 }, content, seed);
}

describe("Leerlauf-Sammler im Offline-Fenster", () => {
  it("nichts läuft: das ganze Fenster ist Leerlauf, ab Versatz 0", () => {
    const s = hero();
    expect(isHeroIdle(s)).toBe(true);
    const t = createOfflineIdleTally();
    advance(s, content, 10 * 60_000, { offline: true, idleTally: t });
    expect(t.idleMs).toBe(10 * 60_000);
    expect(t.idleFromMs).toBe(0);
  });

  it("Aktion mit Ziel läuft aus: Leerlauf ab ihrem Ende bis zum Fensterende", () => {
    const s = hero();
    enqueueAction(s, content, "cut_normal_tree", 3);
    const t = createOfflineIdleTally();
    const windowMs = 10 * 60_000;
    advance(s, content, windowMs, { offline: true, idleTally: t });
    expect(s.activeActionId).toBeNull();
    expect(t.idleFromMs).not.toBeNull();
    expect(t.idleFromMs!).toBeGreaterThan(0);
    expect(t.idleMs).toBe(windowMs - t.idleFromMs!); // danach lief nichts mehr
  });

  it("Kampf läuft das ganze Fenster: kein Leerlauf (Kill-Cooldown zählt als Kampf)", () => {
    const s = hero();
    s.bank.cooked_trout = 400;
    selectFood(s, content, "cooked_trout");
    enqueueFight(s, content, "chicken", null);
    const t = createOfflineIdleTally();
    advance(s, content, 10 * 60_000, { offline: true, idleTally: t });
    expect(s.stats.deaths).toBe(0);
    expect(s.combat.monsterId).not.toBeNull();
    expect(t.idleMs).toBe(0);
    expect(t.idleFromMs).toBeNull();
  });

  it("kurze Lücke unter der Schwelle setzt keinen Beginn; erst ein Leerlauf ab OFFLINE_IDLE_MIN_RUN_MS", () => {
    expect(OFFLINE_IDLE_MIN_RUN_MS).toBe(60_000);
    const s = hero();
    const t = createOfflineIdleTally();
    advance(s, content, 30_000, { offline: true, idleTally: t }); // 30 s nichts
    setActiveAction(s, content, "cut_normal_tree"); // endlos
    advance(s, content, 60_000, { offline: true, idleTally: t });
    expect(t.idleMs).toBe(30_000);
    expect(t.idleFromMs).toBeNull();
    setActiveAction(s, content, null);
    advance(s, content, OFFLINE_IDLE_MIN_RUN_MS - TICK_MS, { offline: true, idleTally: t });
    expect(t.idleFromMs).toBeNull(); // ein Tick fehlt noch
    advance(s, content, TICK_MS, { offline: true, idleTally: t });
    expect(t.idleFromMs).toBe(90_000); // Beginn dieses Leerlaufs, nicht der ersten kurzen Lücke
    expect(t.idleMs).toBe(30_000 + OFFLINE_IDLE_MIN_RUN_MS);
  });

  it("reiner Beobachter: mit und ohne Sammler bit-gleicher Zustand", () => {
    const build = (): GameState => {
      const s = hero(9);
      enqueueAction(s, content, "cut_normal_tree", 5);
      enqueueFight(s, content, "chicken", 3);
      return s;
    };
    const a = build();
    const b = build();
    advance(a, content, 15 * 60_000, { offline: true, idleTally: createOfflineIdleTally() });
    advance(b, content, 15 * 60_000, { offline: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toContain("idleMs");
  });
});
