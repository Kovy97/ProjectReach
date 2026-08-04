// Task #340: Character-Screen — Equipment/Stats-Tab-Umbau (war: zwei gestapelte Container).
// Screenshots beider Tabs bei 1920x1080 + 3440x1440 + einem Schmal-Fenster (~500px), plus ein
// paar Layout-Messungen (Doll-Größe, Zeilenzahl je Stat-Gruppe, Panel-Rect) zur ehrlichen
// Sichtprüfung. Muster aus combat-scale-336-measure.mjs (Task #336) übernommen: eigener Vite
// (vite.tour.config.mjs) + Playwright, KEIN Electron. Eigener Port (5250), damit kein Konflikt
// mit parallel laufenden ui-audit-Skripten anderer Agenten.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5250;
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
  { name: "narrow500", width: 500, height: 900 },
];

async function measure(page) {
  return page.evaluate(() => {
    const px = (v) => (v == null ? null : Math.round(v * 100) / 100);
    const rectOf = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: px(r.top), bottom: px(r.bottom), left: px(r.left), right: px(r.right), width: px(r.width), height: px(r.height) };
    };
    const panel = document.querySelector(".cs-col-tabpanel");
    const tabbar = document.querySelector(".cs-tabbar");
    const tabs = [...document.querySelectorAll(".cs-tab-btn")].map((b) => ({
      text: b.textContent,
      active: b.classList.contains("active"),
      ariaSelected: b.getAttribute("aria-selected"),
      rect: rectOf(b),
    }));
    const doll = document.querySelector(".cs-col-mid .cs-doll");
    const slots = [...document.querySelectorAll(".cs-col-mid .cs-slot")];
    const groups = [...document.querySelectorAll(".cs-tab-stat-group")].map((g) => ({
      title: g.querySelector(".cs-section-title")?.textContent,
      rect: rectOf(g),
      rowCount: g.querySelectorAll(".cs-stat-row").length,
    }));
    const setBonus = document.querySelector(".cs-tab-setbonus-group");
    const statsScroll = document.querySelector(".cs-col-stats .cs-tab-stats-scroll");
    return {
      panel: rectOf(panel),
      tabbar: rectOf(tabbar),
      tabs,
      doll: rectOf(doll),
      slotCount: slots.length,
      firstSlotRect: rectOf(slots[0]),
      groups,
      setBonus: setBonus ? { rect: rectOf(setBonus), text: setBonus.querySelector(".cs-section-title")?.textContent } : null,
      statsScrollOverflow: statsScroll ? { scrollHeight: statsScroll.scrollHeight, clientHeight: statsScroll.clientHeight } : null,
    };
  });
}

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(600);

    // Equipment-Tab (Default)
    const eqReport = await measure(page);
    console.log(`\n=== ${vp.name} EQUIPMENT (#340) ===`);
    console.log(JSON.stringify(eqReport, null, 1));
    await page.screenshot({ path: join(__dirname, `char-tabs-340-${vp.name}-equipment.png`) });

    // Stats-Tab
    await page.locator("#cs-tab-stats").click();
    await page.waitForTimeout(300);
    const statsReport = await measure(page);
    console.log(`\n=== ${vp.name} STATS (#340) ===`);
    console.log(JSON.stringify(statsReport, null, 1));
    await page.screenshot({ path: join(__dirname, `char-tabs-340-${vp.name}-stats.png`) });

    // Keyboard-Check nur bei 1920x1080: Fokus auf Stats-Tab, ArrowLeft -> sollte zu Equipment wechseln.
    if (vp.name === "1920x1080") {
      await page.locator("#cs-tab-stats").focus();
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(200);
      const afterArrow = await page.evaluate(() => ({
        activeId: document.activeElement?.id,
        equipmentSelected: document.getElementById("cs-tab-equipment")?.getAttribute("aria-selected"),
        statsSelected: document.getElementById("cs-tab-stats")?.getAttribute("aria-selected"),
      }));
      console.log(`\n=== ${vp.name} KEYBOARD-CHECK (#340) ===`);
      console.log(JSON.stringify(afterArrow, null, 1));
    }

    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
