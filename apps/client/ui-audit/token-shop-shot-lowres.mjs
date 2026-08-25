#!/usr/bin/env node
/**
 * Niedrigauflösungs-Check des Regal-Kopfs (Chef-Regel "UI-Skalierung: unten, nicht oben" — der
 * Schmerz sitzt bei 1366x768/1600x900). Prüft, dass die längsten Regal-Namen ("Küste und
 * Schlackengrube" / "Der zweite Band" + der wiederverwendete Zonen-Gate-Hinweis) bei kleiner
 * Aufloesung umbrechen statt abzuschneiden. Gleicher Fixture/Port-Slot wie token-shop-shot.mjs
 * (sequenziell, kein Konflikt).
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "shots-token-shop");

const h = await startHarness({
  port: 5402,
  fixture: "midgame",
  locale: "de",
  outDir: OUT_DIR,
  viewport: { width: 1366, height: 768 },
});
try {
  await h.page.keyboard.press("Escape");
  await h.page.waitForTimeout(150);
  await h.page.keyboard.press("Escape");
  await h.page.waitForTimeout(300);

  await h.clickRetry(h.page.locator('[data-guide-id="topbar.quests"]').first());
  await h.page.waitForTimeout(400);
  await h.clickRetry(h.page.locator(".quests-tab-btn").nth(3));
  await h.page.waitForTimeout(400);
  await h.shot("07-shop-1366x768-overview");

  const slagpitHead = h.page.locator(".quest-shelf-name", { hasText: "Schlackengrube" }).first();
  if (await slagpitHead.count()) {
    await slagpitHead.scrollIntoViewIfNeeded();
    await h.page.waitForTimeout(300);
    await h.shot("08-shop-1366x768-shelf-name-wrap");
  }

  console.log(h.errors.length ? `${h.errors.length} page errors:\n` + h.errors.join("\n") : "no page errors");
} finally {
  await h.stop();
}
