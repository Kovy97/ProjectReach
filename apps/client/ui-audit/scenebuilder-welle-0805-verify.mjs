#!/usr/bin/env node
/**
 * Scene-Builder-Upgrade-Welle 05.08. (Chef-Feedback: Werkzeug-Kamera frei / Backdrop als
 * Manifest-Feld / alle Platzierungs-Limits raus) — Verifikation:
 *
 *   B) Roundtrip-Beweis auf Modul-Ebene (echte Vite-transformierte Quellen im Browser):
 *      Manifest mit `backdropLayout`-Block + Props WEIT außerhalb der alten Limits
 *      (z=-20, x=25, scale=12, …) → validateZoneManifest → Export → Import → Re-Export.
 *      Muss byte-identisch sein, kein Wert geklemmt/verschluckt.
 *   C) Screenshot-Beweise am laufenden Builder (?sceneBuilder=pastures):
 *      (1) Kamera weit zurückgefahren + "Spiel-Ausschnitt"-Rahmen sichtbar,
 *      (2) Prop per Zahlenfeld auf z=-15/x=25 (weit jenseits der alten Klemmen) sichtbar,
 *      (3) Backdrop-Regler (Abstand/Höhe) vorher/nachher.
 *
 * Muster/Werkzeuge 1:1 aus arena25d-manifest-verify.mjs (Dev-Server-Spawn, GPU-Headless-Chromium
 * via ANGLE/D3D11) — s. dortige Kommentare für die Begründung.
 *
 * Run: node ui-audit/scenebuilder-welle-0805-verify.mjs        (from apps/client/)
 *      SHOT_DIR=<pfad> überschreibt den Screenshot-Zielordner.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5341;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = process.env.SHOT_DIR || join(__dirname, "_shots-scenebuilder-welle");
mkdirSync(OUT_DIR, { recursive: true });

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
    { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}
async function waitForServer(url, t = 40000) {
  const s = Date.now();
  while (Date.now() - s < t) {
    try {
      const r = await fetch(url);
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) {
    console.error("SERVER NOT UP:\n" + getOutput());
    process.exit(1);
  }
  const browser = await chromium.launch({
    args: ["--headless=new", "--use-gl=angle", "--use-angle=d3d11", "--ignore-gpu-blocklist", "--enable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  await page.goto(`${BASE_URL}/?sceneBuilder=pastures`, { waitUntil: "load" });
  await page.waitForSelector(".sb-canvas", { timeout: 15000 });
  await page.waitForTimeout(2500); // Texturen/Baselines laden lassen

  // ═══ B) Roundtrip-Beweis (Modul-Ebene) ══════════════════════════════════════════════════════
  console.log("\n### B) Roundtrip: backdropLayout + Props jenseits der alten Limits ###");
  const INPUT = {
    zoneId: "pastures",
    ground: "arena_pastures_ground.webp",
    backdrop: "arena_pastures_backdrop.webp",
    backdropLayout: { z: -20, height: 18.4, widthScale: 1.6, yOffset: -1.2 },
    lighting: {
      sunColor: "#ffd9a0",
      sunIntensity: 3.4,
      sunAngleDeg: 46,
      sunAzimuthDeg: 26,
      ambientColor: "#9fb8dd",
      ambientIntensity: 1.1,
      fogColor: "#e8c98a",
      fogDensity: 0,
      grade: { saturation: 1, temperature: 0, lift: 0 },
    },
    props: [
      // Alte Klemmen: x∈[-9.5,9.5], z∈[1.2,11.5], scale∈[0.15,6] — alles hier liegt WEIT außerhalb.
      { file: "arena_pastures_prop_01.webp", x: 25, z: -20, scale: 12, layer: "mid" },
      { file: "arena_pastures_prop_02.webp", x: -31.25, z: 44.5, scale: 0.011, flip: true, layer: "back", rotDeg: -73.5, flat: true },
    ],
  };
  const rt = await page.evaluate(async (input) => {
    const elements = await import("/components/arena25d/builder/elements.ts");
    const manifestMod = await import("/components/arena25d/manifest.ts");
    const env = await import("/components/arena25d/sceneEnvironment.ts");
    const validated = manifestMod.validateZoneManifest(JSON.parse(JSON.stringify(input)), "roundtrip-test");
    if (!validated) return { validatedOk: false };
    const els = validated.props.map((def, i) => ({ id: i + 1, def }));
    const export1 = elements.buildFullManifestExport(
      validated.zoneId,
      validated.ground,
      validated.backdrop,
      validated.lighting,
      els,
      env.resolveBackdropLayout(validated.backdropLayout),
    );
    const reimport = elements.parseManifestFile(export1);
    const m2 = reimport.manifest;
    if (!m2) return { validatedOk: true, validated, export1, reimportOk: false };
    const els2 = m2.props.map((def, i) => ({ id: i + 1, def }));
    const export2 = elements.buildFullManifestExport(m2.zoneId, m2.ground, m2.backdrop, m2.lighting, els2, env.resolveBackdropLayout(m2.backdropLayout));
    return { validatedOk: true, validated, export1, reimportOk: true, reimported: m2, export2 };
  }, INPUT);

  check("Validator akzeptiert Manifest mit backdropLayout + Extrem-Props", rt.validatedOk === true);
  if (rt.validatedOk) {
    check("backdropLayout unverändert durchgereicht (kein Klemmen/Verschlucken)", deepEqual(rt.validated.backdropLayout, INPUT.backdropLayout), JSON.stringify(rt.validated.backdropLayout));
    check(
      "Prop[0] x=25/z=-20/scale=12 ungeklemmt",
      rt.validated.props[0].x === 25 && rt.validated.props[0].z === -20 && rt.validated.props[0].scale === 12,
      JSON.stringify(rt.validated.props[0]),
    );
    check(
      "Prop[1] scale=0.011/rotDeg=-73.5/flat=true ungeklemmt/nicht verschluckt",
      rt.validated.props[1].scale === 0.011 && rt.validated.props[1].rotDeg === -73.5 && rt.validated.props[1].flat === true,
      JSON.stringify(rt.validated.props[1]),
    );
    check("Re-Import des Exports validiert", rt.reimportOk === true);
    if (rt.reimportOk) {
      check("Export→Import→Re-Export byte-identisch", rt.export1 === rt.export2, `${rt.export1.length} Bytes`);
      check("Re-importierter backdropLayout wertgleich", deepEqual(rt.reimported.backdropLayout, INPUT.backdropLayout), JSON.stringify(rt.reimported.backdropLayout));
      check(
        "Re-importierte Props wertgleich (inkl. Extremwerte)",
        rt.reimported.props[0].x === 25 &&
          rt.reimported.props[0].z === -20 &&
          rt.reimported.props[0].scale === 12 &&
          rt.reimported.props[1].scale === 0.011 &&
          rt.reimported.props[1].rotDeg === -73.5 &&
          rt.reimported.props[1].flat === true,
        JSON.stringify(rt.reimported.props),
      );
      console.log("\n--- Export-JSON (Roundtrip-Artefakt) ---\n" + rt.export1 + "\n---------------------------------------");
    }
  }

  // Gegenprobe: Default-Werte ⇒ KEIN backdropLayout-Block im Export (Bestands-Manifeste bleiben blockfrei).
  const noBlock = await page.evaluate(async () => {
    const elements = await import("/components/arena25d/builder/elements.ts");
    const env = await import("/components/arena25d/sceneEnvironment.ts");
    const json = elements.buildFullManifestExport(
      "pastures",
      "g.webp",
      "b.webp",
      { sunColor: "#fff", sunIntensity: 1, sunAngleDeg: 45, sunAzimuthDeg: 0, ambientColor: "#fff", ambientIntensity: 1, fogColor: "#fff", fogDensity: 0, grade: { saturation: 1, temperature: 0 } },
      [],
      env.resolveBackdropLayout(undefined),
    );
    return json.includes("backdropLayout");
  });
  check("Default-Layout erzeugt KEINEN backdropLayout-Block im Export", noBlock === false);

  // ═══ C1) Kamera weit zurück + Spiel-Ausschnitt-Rahmen ═══════════════════════════════════════
  console.log("\n### C1) Werkzeug-Kamera weit zurück + Spiel-Ausschnitt ###");
  const camPanel = page.locator(".sb-panel", { has: page.locator('h2:text-is("Kamera (Werkzeug)")') });
  const distField = camPanel.locator(".sb-row").filter({ has: page.locator('label:text-is("Distanz (Dolly)")') }).locator('input[type="number"]');
  await distField.fill("60");
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "builder-01-camera-far-gameframe.png") });
  console.log("SHOT SAVED: builder-01-camera-far-gameframe.png (Dolly 60 statt Spiel-Distanz ~17.4, blauer Spiel-Ausschnitt-Rahmen)");
  check("Kamera-Distanzfeld akzeptiert 60", (await distField.inputValue()) === "60");

  // ═══ C2) Prop per Zahlenfeld weit jenseits der alten Limits ═════════════════════════════════
  console.log("\n### C2) Prop auf x=25 / z=-15 (alte Klemmen: x≤9.5, z≥1.2) ###");
  await page.locator(".sb-element-row").first().click();
  const elPanel = page.locator(".sb-panel", { has: page.locator('h2:text-is("Element")') });
  const xField = elPanel.locator(".sb-row").filter({ has: page.locator('label:text-is("X")') }).locator('input[type="number"]');
  const zField = elPanel.locator(".sb-row").filter({ has: page.locator('label:text-is("Z")') }).locator('input[type="number"]');
  await xField.fill("25");
  await page.waitForTimeout(200);
  await zField.fill("-15");
  await page.waitForTimeout(700);
  check("X-Feld hält 25 (nicht auf 9.5 geklemmt)", (await xField.inputValue()) === "25");
  check("Z-Feld hält -15 (nicht auf 1.2 geklemmt)", (await zField.inputValue()) === "-15");
  await page.screenshot({ path: join(OUT_DIR, "builder-02-prop-beyond-limits.png") });
  console.log("SHOT SAVED: builder-02-prop-beyond-limits.png (Prop weit hinten rechts, außerhalb der Bodenfläche)");

  // ═══ C3) Backdrop-Regler vorher/nachher ═════════════════════════════════════════════════════
  console.log("\n### C3) Backdrop-Regler (Abstand/Höhe) ###");
  await page.keyboard.press("Escape"); // Auswahl aufheben, damit der Ring nicht ablenkt
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT_DIR, "builder-03a-backdrop-default.png") });
  console.log("SHOT SAVED: builder-03a-backdrop-default.png (Default z≈-3.5, Höhe 12.2)");
  const bdPanel = page.locator(".sb-panel", { has: page.locator('h2:text-is("Kulisse")') });
  const bdZField = bdPanel.locator(".sb-row").filter({ has: page.locator('label:text-is("Abstand (Z)")') }).locator('input[type="number"]');
  const bdHField = bdPanel.locator(".sb-row").filter({ has: page.locator('label:text-is("Höhe")') }).locator('input[type="number"]');
  await bdZField.fill("-20");
  await page.waitForTimeout(200);
  await bdHField.fill("20");
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "builder-03b-backdrop-moved.png") });
  console.log("SHOT SAVED: builder-03b-backdrop-moved.png (z=-20, Höhe 20 — Kulisse sichtbar weiter hinten/höher)");
  check("Backdrop-Z-Feld hält -20 (alte Slider-Grenze war -8)", (await bdZField.inputValue()) === "-20");

  console.log(`\n[page errors] ${errors.length ? errors.length + ":\n" + errors.slice(0, 10).join("\n") : "keine"}`);
  if (errors.length) failures++;

  await browser.close();
  console.log(`\n[scenebuilder-welle-0805-verify] done — ${failures === 0 ? "ALLE CHECKS GRÜN" : failures + " FEHLSCHLÄGE"}.`);
  process.exitCode = failures === 0 ? 0 : 1;
} finally {
  child.kill();
}
