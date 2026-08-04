#!/usr/bin/env node
/** TESTER 1 Zusatz-Check: Rohleder-Rezepte in der Lederverarbeitung (Handwerk) sichtbar
 *  scrollen + fotografieren (Beleg fuer den Sweep-Bericht). READ-ONLY. Port 5250. */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const PORT = 5250;
const BASE_URL = `http://localhost:${PORT}`;
const OUT_DIR = "C:\\Users\\MSchu\\AppData\\Local\\Temp\\claude\\G--GameDev\\553d2095-3a73-4795-9782-0fe746a25f13\\scratchpad\\sweep1";

function startDevServer() {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", join(CLIENT_DIR, "ui-audit", "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
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
async function clickRetry(page, locator, opts = {}) {
  try { await locator.click({ timeout: 6000, ...opts }); }
  catch { await page.waitForTimeout(400); await locator.click({ timeout: 6000, ...opts }); }
}

const { child, getOutput } = startDevServer();
try {
  const ok = await waitForServer(BASE_URL);
  if (!ok) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => { if (m.type() === "error") console.log("console-error:", m.text()); });

  await page.goto(BASE_URL, { waitUntil: "load" });
  await page.waitForSelector(".menu-nav", { timeout: 15000 });
  await clickRetry(page, page.locator(".menu-nav-btn").first());
  await page.waitForTimeout(400);
  await clickRetry(page, page.locator(".menu-slot--empty .hf-btn--primary").first());
  await page.waitForSelector(".creation-panel", { timeout: 10000 });
  await page.locator(".creation-input").fill("Leder Check");
  await clickRetry(page, page.locator(".creation-start"));
  await page.waitForSelector(".onboarding-guide-root", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(300);
  // Sofort ueberspringen — uns interessiert nur die Lederverarbeitung-Seite.
  await clickRetry(page, page.locator(".guide-bubble-skip"));
  await page.waitForTimeout(400);

  await clickRetry(page, page.locator('[data-guide-id="sidebar.leatherworking"]').first());
  await page.waitForSelector(".skillcard", { timeout: 8000 });
  await page.waitForTimeout(400);

  // Zum Rohleder-Bereich scrollen (erste Karte mit "Rohleder" im Titel).
  const target = page.locator(".skillcard").filter({ hasText: "Rohleder" }).first();
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT_DIR, "27-lederverarbeitung-rohleder-scroll.png"), fullPage: false });
  console.log("SHOT: 27-lederverarbeitung-rohleder-scroll.png");

  const rawhideInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".skillcard")).map((el) => ({
      title: el.querySelector(".skillcard-title")?.textContent ?? "",
      locked: el.classList.contains("locked"),
    })).filter((c) => /rohleder/i.test(c.title));
  });
  console.log("ROHLEDER-KARTEN:", JSON.stringify(rawhideInfo));

  await browser.close();
} finally {
  child.kill();
}
