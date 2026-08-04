// Task #349: Ausrüstungs-Loadouts 1/2/3 — Headless-Screenshots (EN+DE) des Equipment-Tabs mit
// Loadout-Leiste plus ein voller Wechsel-Flow: Set in Slot 1 speichern → Waffe ablegen → Set ohne
// Waffe in Slot 2 speichern → Loadout 1 anlegen (Puppe füllt sich, Toast) → Loadout 2 anlegen
// (Waffe wieder weg, Toast). Muster char-tabs-340-shot.mjs (eigener Vite + Playwright, KEIN
// Electron). Eigener Port 5259 gegen Kollisionen mit parallelen ui-audit-Skripten.
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5259;
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

async function snapshot(page) {
  return page.evaluate(() => {
    const bar = document.querySelector(".eq-loadout-bar");
    const btns = [...document.querySelectorAll(".eq-loadout-btn")].map((b) => ({
      text: b.textContent,
      disabled: b.disabled,
    }));
    const mainhandFilled = !!document.querySelector(".cs-slot.mainhand.filled");
    const offhandFilled = !!document.querySelector(".cs-slot.offhand.filled");
    const alert = document.querySelector(".game-alert")?.textContent ?? null;
    const alertSuccess = !!document.querySelector(".game-alert-success");
    return { barPresent: !!bar, btns, mainhandFilled, offhandFilled, alert, alertSuccess };
  });
}

try {
  if (!(await up())) throw new Error("vite down");
  const browser = await chromium.launch();
  for (const locale of ["en", "de"]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.addInitScript((loc) => localStorage.setItem("hearthforge:locale", loc), locale);
    await page.goto(`${BASE}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.locator('[data-guide-id="topbar.character"]').first().click();
    await page.waitForTimeout(600);

    console.log(`\n=== ${locale} INITIAL (#349) ===`);
    console.log(JSON.stringify(await snapshot(page), null, 1));
    await page.screenshot({ path: join(__dirname, `equip-loadouts-349-${locale}-initial.png`) });

    // 1) Aktuelles Set in Slot 1 speichern.
    await page.locator(".eq-loadout-save-btn").nth(0).click();
    await page.waitForTimeout(350); // Tick-Re-Render + Toast
    console.log(`\n=== ${locale} SAVED SLOT 1 ===`);
    console.log(JSON.stringify(await snapshot(page), null, 1));
    await page.screenshot({ path: join(__dirname, `equip-loadouts-349-${locale}-saved.png`) });

    // 2) Waffe (Mainhand) über die normale Item-Aktion ablegen.
    await page.locator(".cs-slot.mainhand .slot-item").first().click();
    await page.waitForTimeout(300);
    await page.locator(".it-action-btn").first().click();
    await page.waitForTimeout(400);
    // Tooltip schließen: neutraler Klick auf den Inventar-Slot-Zähler (KEIN Blindklick — x=20
    // traf beim ersten Lauf die Sidebar und navigierte von der Character-Seite weg).
    await page.locator(".cs-slot-count").first().click();
    await page.waitForTimeout(200);
    console.log(`\n=== ${locale} AFTER UNEQUIP ===`);
    console.log(JSON.stringify(await snapshot(page), null, 1));

    // 3) Set OHNE Waffe in Slot 2 speichern.
    await page.locator(".eq-loadout-save-btn").nth(1).click();
    await page.waitForTimeout(2600); // Save-Toast ausklingen lassen (2.45s Lebensdauer)
    console.log(`\n=== ${locale} WEAPONLESS + SLOT 2 SAVED ===`);
    console.log(JSON.stringify(await snapshot(page), null, 1));
    await page.screenshot({ path: join(__dirname, `equip-loadouts-349-${locale}-weaponless.png`) });

    // 4) Loadout 1 anlegen → Waffe zurück + Ergebnis-Toast.
    await page.locator(".eq-loadout-btn").nth(0).click();
    await page.waitForTimeout(400);
    console.log(`\n=== ${locale} APPLIED SLOT 1 ===`);
    console.log(JSON.stringify(await snapshot(page), null, 1));
    await page.screenshot({ path: join(__dirname, `equip-loadouts-349-${locale}-applied1.png`) });
    await page.waitForTimeout(2400); // Toast ausklingen lassen

    // 5) Loadout 2 anlegen → Waffe wieder weg (Puppe ändert sich sichtbar).
    await page.locator(".eq-loadout-btn").nth(1).click();
    await page.waitForTimeout(400);
    console.log(`\n=== ${locale} APPLIED SLOT 2 ===`);
    console.log(JSON.stringify(await snapshot(page), null, 1));
    await page.screenshot({ path: join(__dirname, `equip-loadouts-349-${locale}-applied2.png`) });

    await page.close();
  }
  await browser.close();
} finally {
  child.kill();
}
