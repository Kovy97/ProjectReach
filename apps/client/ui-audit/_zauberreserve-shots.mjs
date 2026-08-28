// Wegwerf-Verifikationsskript (ui-dev, Zauberreserve/Weisheit 28.08.2026): screenshottet das
// Kampf-Panel (Magier mit Stab, Zauberreserve-Zeile neben Ward statt Mana-Balken) in DE 1920x1080
// und RU 1366x768, plus den Character-"Stats"-Tab mit den zwei neuen Tooltips (Zauberreserve-Zeile,
// Weisheit-Attributkarte). Läuft NICHT als dauerhaftes Tool — nach Gebrauch löschbar.
import { startHarness } from "./sim-harness.mjs";

const OUT_DIR = new URL("./shots-zauberreserve/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const PORT = 5480;

function equipStaff(state) {
  state.character.equipment.mainhand = "copper_staff";
  state.character.equipment.offhand = null;
  state.capeCeremonySeen.magic = true;
}

async function combatShot({ locale, viewport, shotName }) {
  const h = await startHarness({
    port: PORT,
    fixture: "midgame",
    locale,
    viewport,
    outDir: OUT_DIR,
  });
  try {
    await h.setState(equipStaff);
    await h.page.locator('[data-guide-id="sidebar.combat"]').first().click({ timeout: 6000 });
    await h.page.waitForTimeout(300);
    await h.page.locator('[data-bot-zone="pastures"]').first().click({ timeout: 6000 });
    await h.page.waitForTimeout(300);
    await h.page.locator('[data-bot-fight-now="chicken"]').first().click({ timeout: 6000 });
    await h.page.waitForFunction(() => window.__hfDebug?.state?.combat?.monsterId != null, null, { timeout: 15000 });
    await h.page.waitForTimeout(900); // Lektion aus BOT-GUIDE.md: Render-Settle nach combat-active
    await h.shot(shotName);
    if (h.errors.length) console.log(`[${shotName}] PAGE ERRORS:\n${h.errors.join("\n")}`);
  } finally {
    await h.stop();
  }
}

async function statsTabShots() {
  const h = await startHarness({
    port: PORT,
    fixture: "midgame",
    locale: "de",
    viewport: { width: 1920, height: 1080 },
    outDir: OUT_DIR,
  });
  try {
    await h.setState(equipStaff);
    await h.page.locator('[data-guide-id="topbar.character"]').first().click({ timeout: 6000 });
    await h.page.waitForTimeout(400);
    await h.page.click("#cs-tab-stats", { timeout: 6000 });
    await h.page.waitForTimeout(300);

    const reserveRow = h.page.locator(".cs-stat-row", { hasText: "Zauberreserve" }).first();
    await reserveRow.hover({ timeout: 6000 });
    await h.page.waitForTimeout(300);
    await h.shot("stats-tab-de-spellreserve-tooltip");

    const wisCard = h.page.locator(".cs-attr-card", { hasText: "Weisheit" }).first();
    await wisCard.hover({ timeout: 6000 });
    await h.page.waitForTimeout(300);
    await h.shot("stats-tab-de-wisdom-tooltip");

    if (h.errors.length) console.log(`[stats-tab] PAGE ERRORS:\n${h.errors.join("\n")}`);
  } finally {
    await h.stop();
  }
}

await combatShot({ locale: "de", viewport: { width: 1920, height: 1080 }, shotName: "combat-de-1920x1080" });
await combatShot({ locale: "ru", viewport: { width: 1366, height: 768 }, shotName: "combat-ru-1366x768" });
await statsTabShots();
console.log("DONE");
