// claude:2026-10-25T12:00:00+02:00 — Kontrollbilder Raid-Oberfläche (1.4.0 Welle 4), de 1366x768. Port 5420.
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5420, fixture: "endgame", locale: "de", viewport: { width: 1366, height: 768 } });
const { page } = h;
const click = (sel) => page.locator(sel).first().evaluate((el) => el.click());
try {
  await page.waitForTimeout(1200);
  for (let i = 0; i < 6; i++) { await page.keyboard.press("Escape").catch(() => {}); await page.waitForTimeout(150); }
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.dungeonsCleared.behind_the_throne = 1;
    s.character.gold = 9_000_000;
    s.raid = s.raid ?? {};
    s.raid.clears = { normal: 1, heroic: 0, mythic: 0 };
    s.raid.fastestMs = { normal: 1_234_000 };
  });
  await click('[data-guide-id="sidebar.combat"]');
  await page.waitForTimeout(800);
  if (await page.locator(".combat-zones-btn").count()) { await page.locator(".combat-zones-btn").first().evaluate((el) => el.click()); await page.waitForTimeout(400); }
  await page.locator(".raid-panel").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await h.shot("raid-w4-01-zonenwahl");

  // Raid starten (echter UI-Pfad)
  await page.locator(".raid-start-btn").first().evaluate((el) => el.click());
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.character.hp = 9_999_999;
    s.combat.encounterIndex = 4;
    s.combat.monsterId = "gk_tallymistress";
    s.combat.enemyHp = 1000;
    s.combat.bossPhase = 1;
  });
  await page.waitForTimeout(600);
  await h.shot("raid-w4-02-kampf-hud");

  // Rast
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.combat.monsterId = null; s.combat.dungeonId = null;
    const r = s.raid.run;
    r.phase = "rest"; r.room = 0; r.restMs = 3000;
    r.lastLoot = [{ itemId: "gk_fire_hands_heroic", qty: 1 }, { itemId: "relic_dust", qty: 12 }];
    r.loot = [...r.lastLoot];
  });
  await page.waitForTimeout(800);
  await h.shot("raid-w4-03-rast");

  // Zeremonie (bossSeq steigt)
  await page.evaluate(() => {
    const r = window.__hfDebug.state.raid.run;
    r.lastLoot = [{ itemId: "relic_dust", qty: 12 }, { itemId: "gk_fire_hands", qty: 1 }, { itemId: "gk_tally_dagger_heroic", qty: 1 }, { itemId: "gk_king_greatsword_mythic", qty: 1 }];
    r.bossSeq += 1;
  });
  await page.waitForTimeout(1800);
  await h.shot("raid-w4-04a-zeremonie-truhe");
  await page.waitForTimeout(4200);
  await h.shot("raid-w4-04b-zeremonie-beute");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);

  // Tod-Dialog Heroisch
  await page.evaluate(() => {
    const r = window.__hfDebug.state.raid.run;
    r.difficulty = "heroic"; r.phase = "defeated"; r.room = 2;
  });
  await page.waitForTimeout(700);
  await h.shot("raid-w4-05-tod-heroisch");
  await page.evaluate(() => { window.__hfDebug.state.raid.run.phase = "complete"; window.__hfDebug.state.raid.run.bossSeq += 0; });
  await page.waitForTimeout(700);
  await h.shot("raid-w4-06-abschluss");
  if (h.errors.length) console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
} finally {
  await h.stop();
}
