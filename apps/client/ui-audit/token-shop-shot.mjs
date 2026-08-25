#!/usr/bin/env node
/**
 * Screenshot des Belohnungs-Shops mit Regalen (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p13) — zeigt ein offenes und ein gesperrtes Regal.
 * Port 5402 (content-dev, #p13-Auftrag).
 *
 * Run: node token-shop-shot.mjs
 * Output: ui-audit/shots-token-shop/*.png
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "shots-token-shop");

const h = await startHarness({ port: 5402, fixture: "midgame", locale: "de", outDir: OUT_DIR });
try {
  // Zweimal Escape (Auftrag): schließt evtl. offene Onboarding-/Greeting-Overlays.
  await h.page.keyboard.press("Escape");
  await h.page.waitForTimeout(150);
  await h.page.keyboard.press("Escape");
  await h.page.waitForTimeout(300);

  // Quests-Seite über die Kopfleiste "Aufgaben".
  await h.clickRetry(h.page.locator('[data-guide-id="topbar.quests"]').first());
  await h.page.waitForTimeout(400);

  // Tab "Belohnungs-Shop" (4. Tab: Chronik/Aufträge/Tägliches/Shop).
  await h.clickRetry(h.page.locator(".quests-tab-btn").nth(3));
  await h.page.waitForTimeout(400);
  await h.shot("01-shop-overview");

  // Regal 1 (Aschfelder) einklappen/aufklappen prüfen — Klick auf den ersten offenen Kopf.
  const openHead = h.page.locator(".quest-shelf-head:not(.quest-shelf-head--static)").first();
  if (await openHead.count()) {
    await h.clickRetry(openHead);
    await h.page.waitForTimeout(300);
    await h.shot("02-shop-shelf-toggle");
  }

  // Nahaufnahme eines gesperrten Regals (Schloss + Gate-Hinweis).
  const lockedShelf = h.page.locator(".quest-shelf--locked").first();
  if (await lockedShelf.count()) {
    await lockedShelf.scrollIntoViewIfNeeded();
    await h.page.waitForTimeout(200);
    await lockedShelf.screenshot({ path: join(OUT_DIR, "03-shop-locked-shelf.png") });
    console.log("SHOT SAVED: 03-shop-locked-shelf.png");
  } else {
    console.log("!! kein .quest-shelf--locked gefunden");
  }

  await h.shot("04-shop-full-scroll", { fullPage: true });

  // Innerer Scroll-Container (nicht das Dokument) — findet den ersten scrollbaren Vorfahren des
  // Shop-Panels und scrollt ihn ganz nach unten, damit die späteren Regale (2-5) sichtbar werden.
  await h.page.evaluate(() => {
    let el = document.querySelector(".quest-shop-panel");
    while (el) {
      if (el.scrollHeight > el.clientHeight + 4) {
        el.scrollTop = el.scrollHeight;
        break;
      }
      el = el.parentElement;
    }
  });
  await h.page.waitForTimeout(300);
  await h.shot("05-shop-scrolled-bottom");

  // Mittleres Regal (Küste und Schlackengrube — längster Regal-Name, Umbruch-Check) in Sicht scrollen.
  const slagpitHead = h.page.locator(".quest-shelf-name", { hasText: "Schlackengrube" }).first();
  if (await slagpitHead.count()) {
    await slagpitHead.scrollIntoViewIfNeeded();
    await h.page.waitForTimeout(300);
    await h.shot("06-shop-shelf-slagpit-name-wrap");
  } else {
    console.log("!! Regal 'Küste und Schlackengrube' nicht gefunden");
  }

  console.log(h.errors.length ? `${h.errors.length} page errors:\n` + h.errors.join("\n") : "no page errors");
} finally {
  await h.stop();
}
