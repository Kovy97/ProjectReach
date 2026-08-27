#!/usr/bin/env node
/**
 * _tavern-screens.mjs — Abnahme-Screenshots der Taverne (1.2.0 „Alive", ui-dev-Lieferung
 * 27.08.2026, design/1.2.0-alive/taverne-spec-technik.md §9): TavernPage 1920x1080 de mit vier
 * Gästen, die Gäste-Karte offen, TavernPage 1366x768 ru. Port 5453 (Chef-Zuteilung dieser
 * Lieferung). Patcht `camp.buildings.camp_tavern = 1` auf das "midgame"-Fixture, ruft danach
 * denselben Mount-Refresh wie die echte Seite auf (Sidebar-Klick genügt — TavernPage.tsx ruft
 * `tavernRefresh` selbst beim Mount).
 */
import { withHarness } from "./sim-harness.mjs";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "shots-tavern");
mkdirSync(OUT_DIR, { recursive: true });

const problems = [];

async function openTavern(h) {
  await h.setState((state) => {
    // Onboarding-Tour-Bubble blockiert sonst jeden Klick (deckt #root ab) — Muster
    // _bestiary-glowup-verify.mjs.
    if (state.onboarding) {
      state.onboarding.active = false;
      state.onboarding.done = true;
      state.onboarding.toursSeen ??= {};
      for (const k of ["combat", "shop", "bank", "featureTourV1", "featureTourV2"]) {
        state.onboarding.toursSeen[k] = true;
      }
    }
    state.camp.buildings.camp_tavern = 1;
  });
  await h.clickRetry(h.page.locator('[data-guide-id="sidebar.tavern"]'));
  await h.page.waitForSelector(".tvn-stage", { timeout: 8000 });
  await h.page.waitForTimeout(300);
}

// ── Session 1 (DE, 1920x1080): Taverne mit vier Gästen + Gäste-Karte offen ──────────────────────
await withHarness({ port: 5453, fixture: "midgame", locale: "de", viewport: { width: 1920, height: 1080 }, outDir: OUT_DIR }, async (h) => {
  await openTavern(h);

  const seatCount = await h.page.locator(".tvn-seat:not(.tvn-seat--empty)").count();
  if (seatCount === 0) {
    problems.push("Session 1 (DE 1920x1080) — kein besetzter Sitzplatz sichtbar (.tvn-seat:not(.tvn-seat--empty) count=0)");
  }

  await h.shot("tavern-1920x1080-de");

  if (seatCount > 0) {
    await h.clickRetry(h.page.locator(".tvn-seat:not(.tvn-seat--empty)").first());
    await h.page.waitForSelector(".tvn-guest-modal", { timeout: 5000 });
    await h.page.waitForTimeout(200);
    await h.shot("tavern-guest-card-1920x1080-de");
  }

  if (h.errors.length) {
    problems.push(`Session 1 (DE) — Konsolenfehler:\n${h.errors.join("\n")}`);
  }
});

// ── Session 2 (RU, 1366x768): kleinste Zielauflösung, kein Scrollen ─────────────────────────────
await withHarness({ port: 5453, fixture: "midgame", locale: "ru", viewport: { width: 1366, height: 768 }, outDir: OUT_DIR }, async (h) => {
  await openTavern(h);

  const overflow = await h.page.evaluate(() => {
    const el = document.querySelector(".tavern-page");
    if (!el) return null;
    return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  if (!overflow) {
    problems.push("Session 2 (RU 1366x768) — .tavern-page nicht gefunden");
  } else if (overflow.scrollHeight > overflow.clientHeight + 1 || overflow.scrollWidth > overflow.clientWidth + 1) {
    problems.push(`Session 2 (RU 1366x768) — .tavern-page überläuft: ${JSON.stringify(overflow)}`);
  }

  await h.shot("tavern-1366x768-ru");

  if (h.errors.length) {
    problems.push(`Session 2 (RU) — Konsolenfehler:\n${h.errors.join("\n")}`);
  }
});

if (problems.length) {
  console.log("\nPROBLEME:\n" + problems.map((p) => `- ${p}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("\nAlle Prüfungen bestanden.");
}
