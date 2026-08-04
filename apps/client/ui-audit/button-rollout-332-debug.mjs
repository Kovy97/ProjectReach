#!/usr/bin/env node
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const PORT = 5335;
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
  while (Date.now() - s < t) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  const server = startDevServer();
  const up = await waitForServer(BASE_URL);
  if (!up) { console.error("DEV SERVER NOT UP:\n" + server.getOutput()); server.child.kill(); process.exitCode = 1; return; }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(`${BASE_URL}/?fixture=midgame`, { waitUntil: "load" });
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(4200);
    await page.click(".sb-footer-quit");
    await page.waitForTimeout(400);

    const info = await page.evaluate(() => {
      const btn = document.querySelector(".quit-confirm-actions .combat-btn.flee");
      if (!btn) return { found: false };
      const cs = getComputedStyle(btn);
      return {
        found: true,
        borderImageSource: cs.borderImageSource,
        borderStyle: cs.borderStyle,
        borderWidth: cs.borderWidth,
        borderImageWidth: cs.borderImageWidth,
        borderImageSlice: cs.borderImageSlice,
        background: cs.backgroundImage,
        backgroundColor: cs.backgroundColor,
        className: btn.className,
        outerHTML: btn.outerHTML.slice(0, 300),
      };
    });
    console.log(JSON.stringify(info, null, 2));

    // also dump matched CSS rules for this element
    const rules = await page.evaluate(() => {
      const btn = document.querySelector(".quit-confirm-actions .combat-btn.flee");
      const sheets = Array.from(document.styleSheets);
      const matched = [];
      for (const sheet of sheets) {
        let cssRules;
        try { cssRules = sheet.cssRules; } catch { continue; }
        for (const rule of cssRules) {
          if (rule.selectorText && btn.matches(rule.selectorText.split(",")[0].trim())) {
            try {
              if (btn.matches(rule.selectorText)) {
                matched.push({ selector: rule.selectorText, cssText: rule.cssText.slice(0, 400), href: sheet.href });
              }
            } catch {}
          }
        }
      }
      return matched;
    });
    console.log(JSON.stringify(rules, null, 2));

    await page.close();
  } finally {
    await browser.close();
    server.child.kill();
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
