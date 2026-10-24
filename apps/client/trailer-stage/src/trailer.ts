// claude:2026-10-24T10:24:00+02:00 — Trailer v3 „Gehalten“: Gesamt-Zeitstrahl (81,41 s). Jeder Shot hat eine eigene Gruppe; aktiv ist
// genau der Shot, in dessen Fenster die Musikzeit τ liegt. Raid-Gegner sind bis zur Codex-Lieferung Platzhalter (RAID_CAST in shots/raid.ts).
import * as THREE from "three";
import type { Shot } from "./kit";
import { firstStrike } from "./scenes/firstStrike";
import { breadthShots } from "./shots/breadth";
import { finaleShots } from "./shots/finale";
import { openingShots } from "./shots/opening";
import { raidShots } from "./shots/raid";
import { DEFAULT_GRADE, type Grade, type Stage, type TrailerScene } from "./stage";

export const TRAILER_DURATION = 81.41;

/** Eine bestehende Einzelszene als Shot einhängen (lokale Zeit = τ − t0). */
function sceneShot(id: string, t0: number, scene: TrailerScene): Shot {
  const group = new THREE.Group();
  return {
    id, t0, t1: t0 + scene.duration, group,
    setup: (stage) => scene.setup(stage, group),
    update: (t, stage) => scene.update(t, stage),
    grade: (t) => scene.grade(t),
  };
}

/**
 * claude:2026-10-24T10:24:00+02:00 — Der Bildblitz wird linear vor der sRGB-Umrechnung addiert und wirkt dadurch rund dreimal so
 * hell wie eingestellt. Für die neuen Shots (ab 12) wird er quadriert: starke Blitze bleiben, kleine Nachglüher verschwinden.
 * Die abgenommenen Testszenen (09–11, 24) behalten ihre Werte.
 */
function softFlash(shots: Shot[]): Shot[] {
  return shots.map((s) => {
    if (s.id === "24" || !s.grade) return s;
    const grade = s.grade;
    return { ...s, grade: (t: number) => {
      const g = grade(t);
      return g.flash ? { ...g, flash: g.flash * g.flash } : g;
    } };
  });
}

export function buildShots(): Shot[] {
  return [
    ...openingShots(),
    sceneShot("09-11", 22.13, firstStrike()),
    ...softFlash([...breadthShots(), ...raidShots(), ...finaleShots()]),
  ];
}

export function trailer(shots: Shot[] = buildShots()): TrailerScene {
  const active = (tau: number): Shot | undefined => shots.find((s) => tau >= s.t0 && tau < s.t1) ?? shots[shots.length - 1];
  return {
    id: "trailer",
    duration: TRAILER_DURATION,
    audioStart: 0,
    async setup(stage: Stage) {
      for (const s of shots) {
        await s.setup(stage);
        s.group.visible = false;
        stage.scene.add(s.group);
      }
    },
    update(tau, stage) {
      const cur = active(tau);
      for (const s of shots) s.group.visible = s === cur;
      cur?.update(tau - cur.t0, stage, tau);
    },
    grade(tau): Partial<Grade> {
      const cur = active(tau);
      return cur?.grade ? cur.grade(tau - cur.t0) : DEFAULT_GRADE;
    },
  };
}
