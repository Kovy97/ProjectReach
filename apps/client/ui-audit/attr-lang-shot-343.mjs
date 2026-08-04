import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5256;
const BASE = `http://localhost:${PORT}`;

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(
  process.execPath,
  [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
  { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
);
const up = async () => {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(BASE)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const locale of ["ru", "pt-BR"]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript((loc) => localStorage.setItem("hearthforge:locale", loc), locale);
    await page.goto(`${BASE}/?fixture=endgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(__dirname, `attr-lang-343-${locale}-1920x1080.png`) });
    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
