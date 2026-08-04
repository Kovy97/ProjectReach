// Task #343 Chef-Nachtrag: Stats-Tab-Zeilen jetzt auf HoverTip (Citadel-Standard) statt nativem
// `title` umgestellt — Screenshot mit GEÖFFNETEM Tooltip (Maus über einer Stat-Zeile), um zu
// verifizieren, dass der Tooltip NICHT unter dem Cursor liegt (Portal + Flip-Positionierung).
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5254;
const BASE = `http://localhost:${PORT}`;

const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(
  process.execPath,
  [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"],
  { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] },
);
const up = async () => {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(BASE)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
};

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "3440x1440", width: 3440, height: 1440 },
];

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(500);
    await page.locator("#cs-tab-stats").click();
    await page.waitForTimeout(300);

    // Erste Stat-Zeile im Offensive-Block hovern (Nahkampf/Melee).
    const row = page.locator(".cs-tab-stat-group .cs-stat-row").first();
    const box = await row.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      const tip = document.querySelector(".ct-tip");
      if (!tip) return { found: false };
      const r = tip.getBoundingClientRect();
      return { found: true, rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, text: tip.textContent };
    });
    console.log(`\n=== ${vp.name} TOOLTIP ===`);
    console.log(JSON.stringify({ mouseAt: { x: box.x + box.width / 2, y: box.y + box.height / 2 }, tip: info }, null, 1));

    await page.screenshot({ path: join(__dirname, `stats-tooltip-343-${vp.name}.png`) });
    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
