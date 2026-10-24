#!/usr/bin/env node
// claude:2026-10-24T13:25:06+02:00 — Asset-Katalog: Abnahme-Screenshots (headless Chromium über das in apps/client
// installierte @playwright/test). Erwartet einen laufenden Server auf 127.0.0.1:5430. Legt eine Test-Anfrage an,
// fotografiert die Anfragenliste und löscht die Test-Anfrage danach wieder über die Oberfläche.
// Aufruf: node tools/asset-katalog/screenshots.mjs
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(HERE, "..", "..", "apps", "client", "package.json"));
const { chromium } = require("@playwright/test");
const BASE = process.env.ASSET_KATALOG_URL || "http://127.0.0.1:5430";
const OUT = path.join(HERE, "screens");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.on("dialog", (d) => d.accept());
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // 1) Raster
  await page.goto(BASE + "/#/raster");
  await page.waitForSelector(".tile");
  await page.waitForFunction(() => [...document.querySelectorAll(".tile img")].slice(0, 30).every((i) => i.complete));
  await page.screenshot({ path: path.join(OUT, "01-raster.png") });

  // 2) Detail godgem_ring mit Vergleich gegen das Archiv-Original
  await page.setViewportSize({ width: 1600, height: 1900 });
  await page.goto(BASE + "/#/a/" + encodeURIComponent("items/godgem_ring.webp"));
  await page.waitForSelector(".d-body .flag-schleier");
  const cand = page.locator(".cmp", { hasText: "Downloads/ASSETS" }).first();
  await cand.locator("[data-act=cmp]").first().click();
  await page.waitForSelector(".stage.split");
  await page.waitForFunction(() => [...document.querySelectorAll("#detail img")].filter((i) => i.getBoundingClientRect().top < 1900).every((i) => i.complete));
  await page.screenshot({ path: path.join(OUT, "02-detail-godgem_ring.png") });

  // 3) Test-Anfrage anlegen (Tauschen gegen das Archiv-Original), Anfragenliste fotografieren, wieder löschen
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.locator(".cmp", { hasText: "Downloads/ASSETS" }).first().locator("[data-act=swap-from]").click();
  await page.waitForSelector("#dlg[open] .pick.sel");
  await page.fill("#f-notiz", "TEST (Abnahme): Beispiel-Anfrage gegen das Juni-Original aus dem Archiv. Wird gleich wieder gelöscht.");
  await page.click("#f-save");
  await page.waitForSelector(".req-mini");
  await page.goto(BASE + "/#/anfragen");
  await page.waitForSelector(".req");
  await page.waitForFunction(() => [...document.querySelectorAll(".req img")].every((i) => i.complete));
  await page.screenshot({ path: path.join(OUT, "03-anfragen.png") });
  const before = JSON.parse(fs.readFileSync(path.join(HERE, "requests.json"), "utf8"));
  await page.locator(".req", { hasText: "TEST (Abnahme)" }).locator("[data-act=req-del]").click();
  await page.waitForSelector(".req", { state: "detached" });
  const after = JSON.parse(fs.readFileSync(path.join(HERE, "requests.json"), "utf8"));
  console.log(`Anfragen vor dem Löschen: ${before.length}, danach: ${after.length}`);
  console.log(JSON.stringify(before.find((r) => r.notiz.startsWith("TEST")), null, 2));
  if (errors.length) console.log("Seitenfehler:", errors);
} finally {
  await browser.close();
}
