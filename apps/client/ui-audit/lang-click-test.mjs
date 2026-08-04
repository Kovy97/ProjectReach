import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5186;
const BASE_URL = `http://localhost:${PORT}`;

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
  while (Date.now() - s < t) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); }
  return false;
}

const { child, getOutput } = startDevServer();
try {
  if (!(await waitForServer(BASE_URL))) { console.error("SERVER NOT UP:\n" + getOutput()); process.exit(1); }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const navFirst = () => page.locator(".menu-nav-btn").first().innerText();
  const before = await navFirst();

  // Klick auf einen Sprach-Button, der NICHT die aktive Sprache ist (falls DE aktiv → EN, sonst DE).
  const targetLang = before.trim().toUpperCase().includes("NEUES") ? "EN" : "DE";
  await page.locator(".menu-lang button", { hasText: new RegExp(`^${targetLang}$`, "i") }).click();
  await page.waitForTimeout(500);
  const after = await navFirst();

  console.log(`NAV-Text VORHER : "${before.trim()}"`);
  console.log(`Klick auf Sprach-Button: ${targetLang}`);
  console.log(`NAV-Text NACHHER: "${after.trim()}"`);
  console.log(before.trim() !== after.trim() ? "✓ SPRACHE GEWECHSELT — Buttons funktionieren!" : "✗ KEIN WECHSEL — Buttons kaputt.");
  await browser.close();
} finally {
  child.kill();
}
