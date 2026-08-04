#!/usr/bin/env node
/**
 * nh-bot1-de.mjs — Release-Checkpoint 0.3.0, Bot 1/5, Session 2: Sprachen-Stichprobe DEUTSCH
 * auf der Frischstart-/New-Haven-Strecke (Menü → Charaktererstellung → New Haven Karte+Liste →
 * Holzfällen). Frischer Save, Port 5349. Key-Leak-Scan + Screenshots je Station.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "bot-runs", "nh-bot1-de");
mkdirSync(OUT, { recursive: true });

const findings = [];
const log = (m) => { console.log(m); findings.push(m); };

const KEY_LEAK_RE = /(?:^|[\s>(])((?:newhaven|menu|creation|skill|nav|common|queue|offline|char|combat|bank|shop)\.[a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)/g;
async function scanKeyLeaks(page, station) {
  const text = await page.evaluate(() => document.body.innerText);
  const hits = new Set();
  let m;
  while ((m = KEY_LEAK_RE.exec(text)) !== null) hits.add(m[1]);
  if (hits.size > 0) log(`KEYLEAK @${station}: ${[...hits].join(", ")}`);
  else log(`keyleak-scan @${station}: sauber`);
}

async function st(h, fn) {
  return h.page.evaluate((src) => {
    const f = new Function("dbg", `return (${src})(dbg);`);
    return f(window.__hfDebug);
  }, fn.toString());
}

const main = async () => {
  const h = await startHarness({
    port: 5349,
    fixture: null,
    locale: "de",
    requireDebugHook: false,
    outDir: OUT,
    viewport: { width: 1920, height: 1080 },
  });
  const { page } = h;
  try {
    await page.waitForTimeout(1500);
    await page.keyboard.press("Escape");
    await page.mouse.click(960, 900);
    await page.getByText("Neues Spiel", { exact: true }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1300);
    await h.shot("de-01-menu");
    await scanKeyLeaks(page, "menu-de");

    await page.getByText("Neues Spiel", { exact: true }).first().click();
    await page.waitForSelector(".menu-slot", { timeout: 8000 });
    const emptySlotBtn = page.locator(".menu-slot--empty .hf-btn--primary").first();
    await emptySlotBtn.click();
    await page.waitForSelector(".creation-input", { timeout: 8000 });
    await h.shot("de-02-creation");
    await scanKeyLeaks(page, "creation-de");
    await page.locator(".creation-input").fill("Grimhild");
    await page.locator(".creation-start").click();
    await h.waitForDebugHook(15000);
    await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 15000 });
    await page.waitForTimeout(1500);
    await h.shot("de-03-ingame");
    await scanKeyLeaks(page, "ingame-de");
    // Warden-Onboarding-Guide wegklicken (blockiert als Modal alle Klicks)
    for (let i = 0; i < 4; i++) {
      const skip = page.locator(".guide-bubble-skip").first();
      if ((await skip.count()) === 0) break;
      const skipText = await skip.textContent().catch(() => null);
      log(`onboarding-skip de #${i + 1}: "${skipText?.trim()}"`);
      await skip.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(700);
    }

    // New Haven: Karte + Liste
    await page.locator('[data-guide-id="sidebar.newhaven"]').first().click();
    await page.waitForSelector(".newhaven-page", { timeout: 8000 });
    await page.waitForTimeout(800);
    await h.shot("de-04-newhaven-karte");
    await scanKeyLeaks(page, "newhaven-karte-de");
    // Steuerzeile: alle Button-Texte einsammeln (Karte/Liste/Verschieben/Debug/Slots)
    const controls = await page.evaluate(() =>
      [...document.querySelectorAll(".nh-view-controls button, .nh-view-controls span")].map((e) => e.textContent?.trim()),
    );
    log(`nh steuerzeile de: ${JSON.stringify(controls)}`);
    // BuildMenu-Einträge + Sperr-Gründe auf Deutsch
    const bmenu = await page.evaluate(() =>
      [...document.querySelectorAll(".nh-buildmenu-item")].slice(0, 5).map((el) => ({
        name: el.querySelector(".nh-buildmenu-name")?.textContent?.trim(),
        reason: el.querySelector(".nh-buildmenu-reason")?.textContent?.trim() ?? null,
      })),
    );
    log(`buildmenu de (top5): ${JSON.stringify(bmenu)}`);

    await page.locator('[role="tab"]').nth(1).click();
    await page.waitForSelector(".nh-grid", { timeout: 8000 });
    await page.waitForTimeout(500);
    await h.shot("de-05-newhaven-liste");
    await scanKeyLeaks(page, "newhaven-liste-de");
    const hallCard = await page.evaluate(() => {
      const card = [...document.querySelectorAll(".nh-card")][0];
      if (!card) return null;
      return {
        name: card.querySelector(".nh-card-name")?.textContent?.trim(),
        flavor: card.querySelector(".nh-card-flavor")?.textContent?.trim(),
        effects: [...card.querySelectorAll(".nh-effect")].map((e) => e.textContent?.trim()),
        gold: card.querySelector(".nh-cost-gold")?.textContent?.trim(),
        time: card.querySelector(".nh-cost-time")?.textContent?.trim(),
        blocked: card.querySelector(".nh-blocked")?.textContent?.trim() ?? null,
        btn: card.querySelector(".nh-build-btn")?.textContent?.trim(),
      };
    });
    log(`zentralhaus-karte de: ${JSON.stringify(hallCard)}`);

    // Holzfällen: Karten + Boost-Struktur (ohne Lager neutral)
    await page.locator('[data-guide-id="sidebar.woodcutting"]').first().click();
    await page.waitForSelector("#skillcard-cut_normal_tree", { timeout: 8000 });
    await page.waitForTimeout(600);
    await h.shot("de-06-holzfaellen");
    await scanKeyLeaks(page, "holzfaellen-de");
    const beamCard = await page.evaluate(() => {
      const el = document.getElementById("skillcard-craft_timber_beam");
      if (!el) return null;
      return { title: el.querySelector(".skillcard-title")?.textContent?.trim(), lvl: el.querySelector(".skillcard-lvl")?.textContent?.trim(), locked: el.className.includes("locked") };
    });
    log(`balken-karte de: ${JSON.stringify(beamCard)}`);

    log(`pageErrors: ${h.errors.length}`);
    if (h.errors.length) log("PAGEERRORS:\n" + h.errors.slice(0, 10).join("\n---\n"));
  } catch (err) {
    log(`ABBRUCH: ${err.message}`);
    await h.shot("de-99-crash").catch(() => {});
  } finally {
    writeFileSync(join(OUT, "findings.txt"), findings.join("\n"), "utf8");
    console.log(`FINDINGS: ${join(OUT, "findings.txt")}`);
    await h.stop();
  }
};

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
