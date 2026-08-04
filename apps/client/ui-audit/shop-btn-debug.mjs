import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5227;
const BASE = `http://localhost:${PORT}`;
const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
const up = async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 300)); } return false; };
try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4000);
  await page.locator('[data-guide-id="topbar.shop"]').first().click();
  await page.waitForTimeout(600);
  const info = await page.evaluate(() => {
    const btn = document.querySelector(".shopv2-buyqty-btn");
    const n = btn.querySelector(".shopv2-buyqty-n");
    const cs = getComputedStyle(btn);
    const csb = getComputedStyle(btn, "::before");
    const br = btn.getBoundingClientRect();
    const nr = n.getBoundingClientRect();
    return {
      btn: { h: br.height, padding: cs.padding, minHeight: cs.minHeight, overflow: cs.overflow, lineHeight: cs.lineHeight, justify: cs.justifyContent },
      before: { borderWidth: csb.borderWidth, borderImageWidth: csb.borderImageWidth },
      nSpan: { top: nr.top - br.top, height: nr.height, fontSize: getComputedStyle(n).fontSize, lineHeight: getComputedStyle(n).lineHeight },
    };
  });
  console.log(JSON.stringify(info, null, 1));
  const card = page.locator(".shopv2-card").first();
  await card.screenshot({ path: join(__dirname, "shop-card-fresh.png") });
  console.log("FRESH SHOT: shop-card-fresh.png");
  await browser.close();
} finally { child.kill(); }
