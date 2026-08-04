// Chef-Befund: CharacterPage plötzlich scrollbar. Misst bei 1920×1080, WER überläuft.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5224;
const BASE = `http://localhost:${PORT}`;
const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
const child = spawn(process.execPath, [viteBin, "dev", "--config", join(__dirname, "vite.tour.config.mjs"), "--port", String(PORT), "--strictPort"], { cwd: CLIENT_DIR, stdio: ["ignore", "pipe", "pipe"] });
const up = async () => { for (let i = 0; i < 100; i++) { try { if ((await fetch(BASE)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 300)); } return false; };
try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${BASE}/?fixture=endgame`, { waitUntil: "load" });
  await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
  await page.waitForTimeout(4200);
  await page.locator('[data-guide-id="topbar.character"]').first().click();
  await page.waitForTimeout(800);
  const report = await page.evaluate(() => {
    const scroller = document.querySelector(".content-body") ?? document.scrollingElement;
    const s = scroller;
    const out = { scroller: s.className || "document", scrollH: s.scrollHeight, clientH: s.clientHeight, overflowPx: s.scrollHeight - s.clientHeight, children: [] };
    // Spalten-Diagnose: Unterkanten der Layout-Kinder (relativ zur Scroller-Oberkante)
    const top = s.getBoundingClientRect().top;
    const layout = s.querySelector(".cs-layout");
    out.layoutMinH = layout ? getComputedStyle(layout).minHeight : null;
    out.layoutH = layout ? Math.round(layout.getBoundingClientRect().height) : null;
    for (const col of layout ? layout.children : []) {
      const r = col.getBoundingClientRect();
      out.children.push(`${String(col.className).slice(0, 40)}: höhe=${Math.round(r.height)} unterkante@${Math.round(r.bottom - top)}`);
      for (const sub of col.children) {
        const rr = sub.getBoundingClientRect();
        out.children.push(`   └ ${String(sub.className).slice(0, 44)}: h=${Math.round(rr.height)}`);
      }
    }
    return out;
  });
  console.log(JSON.stringify(report, null, 1));
  await page.screenshot({ path: join(__dirname, "charpage-after.png") });
  await browser.close();
} finally { child.kill(); }
