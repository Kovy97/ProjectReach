import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame, setActiveAction } from "@hearthforge/engine";
import { NOTIFY_MIN_GAP_MS, diffNotifications, takeSnapshot, throttleKinds } from "./desktopNotify";

// claude:2026-10-31T16:34:28+01:00 — Desktop-Benachrichtigungen (1.4.2): Zustands-Diff und Drosselung.

function fresh() {
  return createGame({ name: "Test" }, content, 3);
}

describe("Benachrichtigungs-Diff", () => {
  it("meldet einen Tod", () => {
    const s = fresh();
    const prev = takeSnapshot(s);
    s.stats.deaths += 1;
    expect(diffNotifications(prev, s).kinds).toEqual(["died"]);
  });

  it("meldet leer gelaufene Warteschlange genau einmal und nicht bei manuellem Stopp ohne Warteschlange", () => {
    const s = fresh();
    s.actionQueue.push({ kind: "action", actionId: "cut_normal_tree", target: 1 });
    setActiveAction(s, content, "cut_normal_tree", 1);
    let prev = takeSnapshot(s);
    expect(prev.queueTouched).toBe(true);
    // Queue-Eintrag wird gepoppt, Aktion läuft weiter: noch keine Meldung.
    s.actionQueue.length = 0;
    let r = diffNotifications(prev, s);
    expect(r.kinds).toEqual([]);
    prev = r.next;
    // Stillstand: Warteschlange ist leer gelaufen.
    setActiveAction(s, content, null);
    r = diffNotifications(prev, s);
    expect(r.kinds).toEqual(["queueDone"]);
    // Weiterer Stillstand meldet nichts mehr.
    expect(diffNotifications(r.next, s).kinds).toEqual([]);
  });

  it("schweigt beim Stopp ohne Warteschlange", () => {
    const s = fresh();
    setActiveAction(s, content, "cut_normal_tree", null);
    const prev = takeSnapshot(s);
    setActiveAction(s, content, null);
    expect(diffNotifications(prev, s).kinds).toEqual([]);
  });

  it("meldet einen erfüllten Slayer-Auftrag", () => {
    const s = fresh();
    const prev = takeSnapshot(s);
    (s as unknown as { slayerTasksCompleted: number }).slayerTasksCompleted = 1;
    expect(diffNotifications(prev, s).kinds).toContain("slayerDone");
  });

  it("drosselt dieselbe Art auf einmal pro Minute", () => {
    const last = {};
    expect(throttleKinds(["died"], last, 1000)).toEqual(["died"]);
    expect(throttleKinds(["died"], last, 1000 + NOTIFY_MIN_GAP_MS - 1)).toEqual([]);
    expect(throttleKinds(["died", "slayerDone"], last, 1000 + NOTIFY_MIN_GAP_MS)).toEqual(["died", "slayerDone"]);
  });
});
