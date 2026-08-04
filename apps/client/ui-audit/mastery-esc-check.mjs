#!/usr/bin/env node
// Focused check: does Escape dismiss the MasteryCeremony (same as clicking "Weiter")? Reuses the
// mastery fixture + the plain (real-content) dev server config. Not part of the main tour script
// to keep that one focused; this is a throwaway verification run.
import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const CLIENT_DIR = "G:\\GameDev\\apps\\client";
const UI_AUDIT = CLIENT_DIR + "\\ui-audit";
const PORT = 5231;
const BASE_URL = `http://localhost:${PORT}`;

function startDevServer() {
  const viteBin = CLIENT_DIR + "\\node_modules\\vite\\bin\\vite.js";
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", UI_AUDIT + "\\vite.tour.config.mjs", "--port", String(PORT), "--strictPort"],
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  await page.goto(`${BASE_URL}/?fixture=mastery`, { waitUntil: "load" });
  await page.waitForSelector(".mwc-card", { timeout: 15000 });
  const sub1 = await page.locator(".mwc-subtitle").innerText();
  console.log("Before ESC, ceremony subtitle: " + sub1);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(1800); // exit (420ms) + queue pause (800ms) + margin

  await page.waitForSelector(".mwc-card", { timeout: 15000 });
  const sub2 = await page.locator(".mwc-subtitle").innerText();
  console.log("After ESC, ceremony subtitle: " + sub2);
  console.log("ESC advanced the queue: " + (sub1 !== sub2));

  await browser.close();
} finally {
  child.kill();
}
