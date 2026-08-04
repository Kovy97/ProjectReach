#!/usr/bin/env node
/**
 * TESTER 8 ("Der Archivar") — Hauptmenü-Deep-Dive: Charakter-Karten (Load-Panel), New-Panel
 * (Overwrite-Confirm), Delete-Confirm, zweizeilige lange Namen, leere Slots.
 * Injiziert zwei ECHTE Saves aus %APPDATA%\Grim Reach\saves\ als localStorage-Slots 0+1, plus
 * eine dritte, künstlich lang-benannte Kopie in Slot 2 (Slots 3+4 bleiben leer). Read-only:
 * nur localStorage des headless-vite betroffen, keine echten Save-Dateien angefasst.
 * Port 5257.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5257;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep8";
const SAVES_DIR = join(process.env.APPDATA, "Grim Reach", "saves");

const aldric = readFileSync(join(SAVES_DIR, "slot-1.json"), "utf8"); // "Aldric Thornwald", lvl 1049
const adhavar = readFileSync(join(SAVES_DIR, "slot-0.json"), "utf8"); // "Adhavar", lvl 241

// Dritte Karte: Kopie von Aldric mit künstlich langem Namen (2-Zeilen-Umbruch-Test).
const longNameObj = JSON.parse(aldric);
const LONG_NAME = "Korveth Grimhollow von Ashfall dem Unerschütterlichen";
longNameObj.summary.name = LONG_NAME;
longNameObj.state.character.name = LONG_NAME;
const longNameSave = JSON.stringify(longNameObj);

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
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });

  // Dialog-Handler wird pro Test-Schritt umgesetzt (dismiss zuerst, dann accept).
  let dialogAction = "dismiss";
  page.on("dialog", async (d) => {
    console.log("DIALOG:", d.type(), "|", d.message().slice(0, 80), "| action:", dialogAction);
    if (dialogAction === "accept") await d.accept();
    else await d.dismiss();
  });

  await page.addInitScript(
    ([a, b, c]) => {
      localStorage.setItem("hearthforge:save:0", a);
      localStorage.setItem("hearthforge:save:1", b);
      localStorage.setItem("hearthforge:save:2", c);
      // Slots 3+4 bewusst leer.
    },
    [aldric, adhavar, longNameSave],
  );

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // ── (0) Default-Panel-Check: Chef-Änderung "rechts nichts offen bis Klick" ──
  const defaultPanelOpen = await page.evaluate(() => !!document.querySelector(".menu-right"));
  console.log("DEFAULT-PANEL-OPEN (soll false sein):", defaultPanelOpen);
  await page.screenshot({ path: join(OUT_DIR, "01-menu-default.png") });
  console.log("SHOT SAVED: 01-menu-default.png");

  // ── (1) Load-Panel: 3 Karten (Aldric, Adhavar, Langname) ──
  await page.locator(".menu-nav-btn").nth(1).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "02-load-panel-3cards.png") });
  console.log("SHOT SAVED: 02-load-panel-3cards.png");

  const cardInfo = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll(".menu-slot.filled"));
    return cards.map((c) => {
      const nameEl = c.querySelector(".menu-slot-name");
      const img = c.querySelector(".menu-slot-portrait img");
      return {
        name: nameEl?.textContent ?? null,
        nameLines: nameEl ? Math.round(nameEl.getBoundingClientRect().height / parseFloat(getComputedStyle(nameEl).lineHeight || "20")) : null,
        imgLoaded: img ? img.complete && img.naturalWidth > 0 : null,
        imgSrcHead: img?.getAttribute("src")?.slice(0, 24) ?? null,
        played: c.querySelector(".menu-slot-info .menu-slot-meta")?.textContent ?? null,
        lastSaved: c.querySelector(".menu-slot-sub")?.textContent ?? null,
      };
    });
  });
  console.log("LOAD-CARDS:", JSON.stringify(cardInfo, null, 1));

  // ── (2) Delete-Confirm: DISMISS zuerst (Karte darf bleiben), dann ACCEPT (Karte verschwindet) ──
  const cardCountBefore = await page.locator(".menu-slot.filled").count();
  dialogAction = "dismiss";
  await page.locator(".menu-slot.filled").nth(2).locator(".hf-btn--danger").click(); // Langname-Karte, "Löschen"
  await page.waitForTimeout(500);
  const cardCountAfterDismiss = await page.locator(".menu-slot.filled").count();
  console.log(`DELETE-DISMISS: vorher=${cardCountBefore} nachher=${cardCountAfterDismiss} (soll gleich sein)`);

  dialogAction = "accept";
  await page.locator(".menu-slot.filled").nth(2).locator(".hf-btn--danger").click();
  await page.waitForTimeout(700);
  const cardCountAfterAccept = await page.locator(".menu-slot.filled").count();
  console.log(`DELETE-ACCEPT: vorher=${cardCountBefore} nachher=${cardCountAfterAccept} (soll -1 sein)`);
  await page.screenshot({ path: join(OUT_DIR, "03-load-panel-after-delete.png") });
  console.log("SHOT SAVED: 03-load-panel-after-delete.png");

  // ── (3) New-Panel: gemischt (2 belegt + 3 leer nach dem Delete oben) ──
  await page.locator(".menu-nav-btn").nth(0).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT_DIR, "04-new-panel-mixed.png") });
  console.log("SHOT SAVED: 04-new-panel-mixed.png");
  const newPanelInfo = await page.evaluate(() => ({
    filled: document.querySelectorAll(".menu-slot.filled").length,
    empty: document.querySelectorAll(".menu-slot--empty").length,
  }));
  console.log("NEW-PANEL:", JSON.stringify(newPanelInfo));

  // ── (4) Overwrite-Confirm: DISMISS (Screen bleibt "menu"), dann ACCEPT (→ Charaktererstellung) ──
  dialogAction = "dismiss";
  await page.locator(".menu-slot.filled").first().locator(".hf-btn--danger").click(); // "Überschreiben"
  await page.waitForTimeout(600);
  const screenAfterDismiss = await page.evaluate(() => ({
    creation: !!document.querySelector(".creation-back"),
    menu: !!document.querySelector(".menu"),
  }));
  console.log("OVERWRITE-DISMISS:", JSON.stringify(screenAfterDismiss), "(creation soll false sein)");

  dialogAction = "accept";
  await page.locator(".menu-slot.filled").first().locator(".hf-btn--danger").click();
  await page.waitForTimeout(900);
  const screenAfterAccept = await page.evaluate(() => ({
    creation: !!document.querySelector(".creation-back"),
  }));
  console.log("OVERWRITE-ACCEPT:", JSON.stringify(screenAfterAccept), "(creation soll true sein)");
  await page.screenshot({ path: join(OUT_DIR, "05-overwrite-into-creation.png") });
  console.log("SHOT SAVED: 05-overwrite-into-creation.png");
  // Zurück ins Menü, ohne den Slot tatsächlich zu überschreiben (Chef-GO: reiner Read-Test).
  if (await page.locator(".creation-back").count()) {
    await page.locator(".creation-back").click();
    await page.waitForTimeout(500);
  }

  console.log(errors.length ? "PAGE ERRORS:\n" + errors.slice(0, 20).join("\n") : "no page errors");
  await browser.close();
} finally {
  child.kill();
}
