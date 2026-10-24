// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne: Einstieg. ?scene=<id> lädt eine Szene; ?preview=1 spielt sie in Echtzeit ab
// (ohne Unterframes), sonst steuert render.mjs Bild für Bild über window.trailer.renderFrame(i).
import { loadFonts } from "./assets";
import { Stage, type TrailerScene } from "./stage";
import { calib } from "./scenes/calib";
import { firstStrike } from "./scenes/firstStrike";
import { frostMoment } from "./scenes/frostMoment";
import { trailer } from "./trailer";
import { trailerV4 } from "./v4";
import { setV4Lang } from "./v4/lang";

const SCENES: Record<string, () => TrailerScene> = { calib, firstStrike, frostMoment: () => frostMoment(), trailer: () => trailer(), v4: () => trailerV4(),
  // claude:2026-10-24T20:16:00+02:00 — chinesische Fassung von v4 (Chef 24.10.): gleiche Szene, Wörter und Schrift auf Chinesisch
  v4zh: () => { setV4Lang("zh"); return trailerV4(); } };

declare global {
  interface Window {
    trailer?: { id: string; duration: number; audioStart: number; fps: number; frames: number; renderFrame(i: number): void; ready: boolean };
  }
}

async function boot(): Promise<void> {
  const q = new URLSearchParams(location.search);
  const FPS = Number(q.get("fps") ?? 60);
  const id = q.get("scene") ?? "firstStrike";
  const make = SCENES[id];
  if (!make) throw new Error(`Unbekannte Szene ${id}`);
  await loadFonts();
  const stage = new Stage(document.getElementById("c") as HTMLCanvasElement);
  const scene = make();
  await scene.setup(stage);
  const frames = Math.round(scene.duration * FPS);
  const sub = Number(q.get("sub") ?? 4);
  window.trailer = {
    id,
    duration: scene.duration,
    audioStart: scene.audioStart,
    fps: FPS,
    frames,
    ready: true,
    renderFrame(i: number) {
      stage.renderFrame(scene, i / FPS, i, FPS, sub);
    },
  };
  const hud = document.getElementById("hud")!;
  if (q.get("preview") === "1") {
    const t0 = performance.now();
    const loop = (): void => {
      const t = (((performance.now() - t0) / 1000) % scene.duration);
      stage.renderFrame(scene, t, Math.floor(t * FPS), FPS, 1);
      hud.textContent = `${id} τ=${t.toFixed(2)}s`;
      requestAnimationFrame(loop);
    };
    loop();
  } else if (q.get("t")) {
    const t = Number(q.get("t"));
    stage.renderFrame(scene, t, Math.floor(t * FPS), FPS, sub);
    hud.textContent = `${id} τ=${t.toFixed(2)}s`;
  }
}

boot().catch((e) => {
  document.getElementById("hud")!.textContent = String(e);
  console.error(e);
});
