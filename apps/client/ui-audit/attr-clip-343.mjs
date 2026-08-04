import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5255;
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
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(400);
  const info = await page.evaluate(() => {
    const card = document.querySelector(".cs-attr-card");
    const name = card.querySelector(".cs-attr-card-name");
    const val = card.querySelector(".cs-attr-card-val");
    const cs = getComputedStyle(card);
    const section = document.querySelector(".cs-attr-section");
    const grid = document.querySelector(".cs-attr-grid");
    const buffs = document.querySelector(".cs-buffs");
    return {
      card: { w: card.clientWidth, h: card.clientHeight, scrollH: card.scrollHeight, padding: cs.padding, border: cs.borderWidth, gap: cs.gap },
      name: { h: name.getBoundingClientRect().height, font: getComputedStyle(name).fontSize },
      val: { h: val.getBoundingClientRect().height, font: getComputedStyle(val).fontSize },
      section: section.getBoundingClientRect(),
      grid: grid.getBoundingClientRect(),
      buffsH: buffs ? buffs.getBoundingClientRect().height : null,
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
} finally {
  child.kill();
}
