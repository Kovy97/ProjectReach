// claude:2026-10-24T10:24:00+02:00 — Kalibrierbild: Kulisse aus der Malerposition (CAM0) mit zwei Figuren. Vergleich gegen das
// Original-Gemälde für Helligkeit und Schärfe (?scene=calib&bg=battlescreens/borderlands.webp).
import * as THREE from "three";
import { backdrop, CAM0, figure, FOV0, setCam } from "../kit";
import type { Puppet } from "../puppet";
import type { Stage, TrailerScene } from "../stage";

export function calib(): TrailerScene {
  const bg = new URLSearchParams(location.search).get("bg") ?? "battlescreens/borderlands.webp";
  const figs = new URLSearchParams(location.search).get("figs") !== "0";
  let hero: Puppet | null = null;
  let gob: Puppet | null = null;
  return {
    id: "calib",
    duration: 1,
    audioStart: 0,
    async setup(stage: Stage, root?: THREE.Object3D) {
      const parent = root ?? stage.scene;
      parent.add(await backdrop(stage, bg));
      if (figs) {
        hero = await figure(stage, "portraits/human_warrior_m.webp", { height: 2.25 });
        gob = await figure(stage, "monsters/goblin_reaver.webp", { height: 2.05 });
        hero.group.position.set(-1.5, 0, 0);
        gob.group.position.set(1.5, 0, 0);
        parent.add(hero.group, gob.group);
      }
    },
    update(_t, stage) {
      setCam(stage, CAM0, [0, 1.5, 0], FOV0);
      hero?.face(stage.camera.position);
      gob?.face(stage.camera.position);
    },
    grade: () => ({ vignette: 0, split: 0, grain: 0, bloom: 0.35 }),
  };
}
