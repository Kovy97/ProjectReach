import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { ContentDB, GameState } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Bestands-Heilung Task #347 (KEIN SAVE_VERSION-Bump — idempotente Load-Normalisierung im
 * sanitize-Pass): Live-Saves (v0.2.1/0.2.2) tragen Slayer-Tasks auf dg_-Geister-Varianten
 * (dg_skeleton_warrior & Co.), die der Welt-Task-Generator fälschlich vergeben hat. Solche Tasks
 * sind unerfüllbar (JEDER Kill kreditiert via killCreditMonsterId auf die Basis-ID). Beim Laden:
 *  - dg_-Task MIT existierender Basis → auf die Basis-ID umgeschrieben (Fortschritt/Umfang/
 *    Belohnungen bleiben; isTower = false, die Basis ist ein Welt-Monster).
 *  - dg_-Task OHNE Basis (Content-Drift) → kostenlos annulliert (Punkte/Streak unangetastet).
 *  - Basis-ID-Tasks laufen unverändert durch (keine Über-Normalisierung).
 * Bei jedem Load harmlos wiederholbar (zweiter Round-Trip = No-op).
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick (Muster paragon-migration.test.ts). */
function roundTrip(s: GameState, db: ContentDB = content): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), db, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Load-Normalisierung #347 — Slayer-Task auf dg_-Geister-Variante", () => {
  it("dg_skeleton_warrior-Task (Report 0/43) wird auf skeleton_warrior umgeschrieben — Fortschritt & Belohnungen bleiben", () => {
    const s = createGame({ name: "Betroffen" }, content, 93);
    s.slayerPoints = 120;
    s.slayerStreak = 7;
    s.slayerTasksCompleted = 41;
    s.slayerTask = {
      masterId: "brenna_ashwick",
      monsterId: "dg_skeleton_warrior",
      isTower: false,
      required: 43,
      progress: 12,
      xpReward: 4945,
      pointReward: 6,
    };
    const loaded = roundTrip(s);
    expect(loaded.slayerTask).not.toBeNull();
    expect(loaded.slayerTask!.monsterId).toBe("skeleton_warrior");
    expect(loaded.slayerTask!.required).toBe(43);
    expect(loaded.slayerTask!.progress).toBe(12);
    expect(loaded.slayerTask!.xpReward).toBe(4945);
    expect(loaded.slayerTask!.pointReward).toBe(6);
    expect(loaded.slayerTask!.isTower).toBe(false);
    // Kostenlos: Punkte/Streak/Completed unangetastet.
    expect(loaded.slayerPoints).toBe(120);
    expect(loaded.slayerStreak).toBe(7);
    expect(loaded.slayerTasksCompleted).toBe(41);
    // Idempotent: zweiter Round-Trip ändert nichts mehr.
    const again = roundTrip(loaded);
    expect(again.slayerTask).toEqual(loaded.slayerTask);
    expect(again.slayerPoints).toBe(120);
    expect(again.slayerStreak).toBe(7);
  });

  it("dg_-Task OHNE Basis-Monster (Content-Drift) wird kostenlos annulliert — Punkte/Streak bleiben", () => {
    // Synthetischer Content: eine dg_-Variante, deren Basis nicht (mehr) existiert.
    const db: ContentDB = {
      ...content,
      monsters: {
        ...content.monsters,
        dg_ghost_orphan: { ...content.monsters["dg_skeleton_warrior"]!, id: "dg_ghost_orphan" },
      },
    };
    const s = createGame({ name: "Waise" }, db, 93);
    s.slayerPoints = 55;
    s.slayerStreak = 3;
    s.slayerTask = {
      masterId: "brenna_ashwick",
      monsterId: "dg_ghost_orphan",
      isTower: false,
      required: 30,
      progress: 5,
      xpReward: 100,
      pointReward: 5,
    };
    const loaded = roundTrip(s, db);
    expect(loaded.slayerTask).toBeNull();
    expect(loaded.slayerPoints).toBe(55);
    expect(loaded.slayerStreak).toBe(3);
  });

  it("Basis-ID-Task (Report 0/24, funktionierte schon) läuft UNVERÄNDERT durch — keine Über-Normalisierung", () => {
    const s = createGame({ name: "Gesund" }, content, 93);
    s.slayerTask = {
      masterId: "brenna_ashwick",
      monsterId: "skeleton_warrior",
      isTower: false,
      required: 24,
      progress: 9,
      xpReward: 2760,
      pointReward: 5,
    };
    const loaded = roundTrip(s);
    expect(loaded.slayerTask).toEqual(s.slayerTask);
  });

  it("Turm-Task (tower_skeleton_warrior, isTower) bleibt UNANGETASTET — Turm-Tasks sind legitim & erfüllbar", () => {
    const s = createGame({ name: "Türmer" }, content, 93);
    s.slayerTask = {
      masterId: "brenna_ashwick",
      monsterId: "tower_skeleton_warrior",
      isTower: true,
      required: 20,
      progress: 4,
      xpReward: 1500,
      pointReward: 5,
    };
    const loaded = roundTrip(s);
    expect(loaded.slayerTask).toEqual(s.slayerTask);
  });
});
