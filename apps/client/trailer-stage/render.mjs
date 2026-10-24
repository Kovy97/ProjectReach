// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne: Aufnahme. Startet die Bühne (Vite), rendert eine Szene Bild für Bild in
// Chromium (60 fps, 4 Unterframes je Bild für echte Bewegungsunschärfe), baut mit ffmpeg ein MP4 mit dem passenden Ausschnitt
// aus settings.mp3. Aufruf aus apps/client:  node trailer-stage/render.mjs <szene> [--sub 4] [--frames a-b] [--still τ]
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const scene = args[0] ?? "firstStrike";
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const sub = Number(opt("--sub", "4"));
const fps = Number(opt("--fps", "60"));
const range = opt("--range", null); // Sekunden a-b (nur Gesamt-Trailer)
const audio = opt("--audio", null); // statt --music: fertige Mischung ab 0 s
const still = opt("--still", null);
const music = resolve(opt("--music", "C:/Users/MSchu/Downloads/settings.mp3"));
const outDir = resolve(opt("--out", resolve(here, "../../../marketing/trailer-v3/tests")));
const frameDir = resolve(opt("--frames-dir", join(tmpdir(), "grimreach-trailer-frames", scene)));

const server = await createServer({ configFile: resolve(here, "vite.config.ts") });
await server.listen();
const url = `http://localhost:5420/?scene=${scene}&sub=${sub}&fps=${fps}`;
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error") console.error("[page]", m.text()); });
  page.on("pageerror", (e) => console.error("[page]", e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.trailer?.ready === true, null, { timeout: 120000 });
  const info = await page.evaluate(() => ({ ...window.trailer, renderFrame: undefined }));
  const gl = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const ext = c?.getExtension("WEBGL_debug_renderer_info");
    return ext ? c.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unbekannt";
  });
  console.log(`Szene ${info.id}: ${info.frames} Bilder, ${info.duration}s, Unterframes ${sub}, GPU: ${gl}`);
  mkdirSync(outDir, { recursive: true });
  const canvas = await page.$("#c");

  if (still !== null) {
    for (const t of still.split(",").map(Number)) {
      await page.evaluate((i) => window.trailer.renderFrame(i), Math.round(t * info.fps));
      const file = join(outDir, `${scene}-still-${t.toFixed(2)}.png`);
      await canvas.screenshot({ path: file });
      console.log("Standbild", file);
    }
  } else {
    if (existsSync(frameDir)) rmSync(frameDir, { recursive: true, force: true });
    mkdirSync(frameDir, { recursive: true });
    let [a, b] = (opt("--frames", `0-${info.frames - 1}`)).split("-").map(Number);
    if (range) {
      const [ra, rb] = range.split("-").map(Number);
      a = Math.round(ra * info.fps);
      b = Math.min(info.frames - 1, Math.round(rb * info.fps) - 1);
    }
    const t0 = Date.now();
    for (let i = a; i <= b; i++) {
      await page.evaluate((k) => window.trailer.renderFrame(k), i);
      await canvas.screenshot({ path: join(frameDir, `f${String(i).padStart(5, "0")}.png`) });
      if (i % 30 === 0) console.log(`  Bild ${i}/${b}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
    const mp4 = join(outDir, range ? `${scene}-${range.replace(/[.]/g, ",")}.mp4` : `${scene}.mp4`);
    const ff = spawnSync("ffmpeg", [
      "-y", "-v", "error",
      "-framerate", String(info.fps), "-start_number", String(a), "-i", join(frameDir, "f%05d.png"),
      "-ss", String(info.audioStart + a / info.fps), "-t", String((b - a + 1) / info.fps), "-i", audio ? resolve(audio) : music,
      "-map", "0:v", "-map", "1:a",
      "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "256k", "-af", "afade=t=in:d=0.04,afade=t=out:st=" + ((b - a + 1) / info.fps - 0.08).toFixed(3) + ":d=0.08",
      "-shortest", mp4,
    ], { stdio: "inherit" });
    if (ff.status !== 0) throw new Error("ffmpeg fehlgeschlagen");
    writeFileSync(join(outDir, `${scene}.txt`), `${info.id} · Musik ${info.audioStart}s + ${info.duration}s · ${info.frames} Bilder @ ${info.fps} fps · ${sub} Unterframes\n`);
    console.log("Fertig:", mp4);
  }
} finally {
  await browser.close();
  await server.close();
}
