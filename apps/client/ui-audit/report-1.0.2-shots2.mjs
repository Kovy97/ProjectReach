/**
 * Nachtrag zu report-1.0.2-shots.mjs: die beiden Faelle, die das Fixture nicht von selbst
 * hergibt — ein AKTIVER Slayer-Auftrag und ein LAUFENDER Kampf.
 *
 * Geprueft wird gegen den SPIELSTAND (window.__hfDebug), nicht gegen DOM-Klassen: ob "Einreihen"
 * wirklich eingereiht hat, steht in `state.actionQueue`, nicht in einem Panel, das eingeklappt
 * sein kann.
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5384, fixture: "midgame", locale: "de" });
const { page } = h;

const nav = page.locator('.sidebar-btn, [data-guide-id^="sidebar."], [data-guide-id^="topbar."]');
async function zuSeite(muster) {
  const n = await nav.count();
  for (let i = 0; i < n; i++) {
    const txt = ((await nav.nth(i).textContent()) ?? "").trim();
    if (muster.test(txt)) { await nav.nth(i).click(); return txt; }
  }
  return null;
}
const shot = (name) => page.screenshot({ path: `ui-audit/shots-report-102/${name}.png` });
const lies = (fn) => page.evaluate(fn);

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");

  // ── Slayer: erst einen Auftrag holen ─────────────────────────────────
  await zuSeite(/slayer/i);
  await page.waitForTimeout(1100);
  const holen = page.locator("button").filter({ hasText: /auftrag holen/i }).first();
  if (await holen.count()) { await holen.click(); await page.waitForTimeout(900); }
  const btns = await page.locator(".slayer-task-fight-row .btn").allTextContents();
  const gesperrt = await page.locator(".slayer-task-fight-row .btn[disabled]").count();
  console.log("BEFUND slayer-knoepfe:", JSON.stringify(btns), "gesperrt:", gesperrt);
  await shot("06-slayer-auftrag");

  const vorher = await lies(() => (window.__hfDebug.state.actionQueue ?? []).length);
  const einreihen = page.locator(".slayer-task-queue-btn");
  if ((await einreihen.count()) && gesperrt === 0) {
    await einreihen.click();
    await page.waitForTimeout(700);
    const nachher = await lies(() => {
      const q = window.__hfDebug.state.actionQueue ?? [];
      return { laenge: q.length, letzter: q[q.length - 1] ?? null };
    });
    console.log("BEFUND einreihen:", vorher, "->", JSON.stringify(nachher));
  }

  // ── Kampf: einen ueber die Engine starten, dann "Nachlegen" ──────────
  await zuSeite(/^kampf|combat/i);
  await page.waitForTimeout(1300);
  // Direkt im Spielstand einen Kampf setzen — der Klickpfad haengt an QuantityPicker/Karten-
  // Layout und ist fuer DIESEN Beleg Nebensache.
  const gestartet = await lies(() => {
    const dbg = window.__hfDebug;
    const s = dbg.state;
    const m = Object.values(dbg.content.monsters).find(
      (x) => !x.dungeonOnly && !x.slayerRequirement && (x.level ?? 1) <= 10,
    );
    if (!m) return null;
    s.actionQueue = s.actionQueue ?? [];
    s.actionQueue.unshift({ kind: "fight", monsterId: m.id, target: 3 });
    s.queuePaused = false;
    s.activeActionId = null;
    return m.id;
  });
  console.log("BEFUND kampf-gesetzt:", gestartet);
  await page.waitForTimeout(2500);
  const nachlegen = page.locator(".battle-queue-more-btn");
  console.log("BEFUND kampf-laeuft:", (await nachlegen.count()) > 0);
  if (await nachlegen.count()) {
    await shot("07-kampf-nachlegen");
    await nachlegen.first().click();
    await page.waitForTimeout(1000);
    const balken = await page.locator(".combat-return-note").allTextContents();
    const listeDa = await page.locator(".combat-main-area").count();
    const kampfLaeuftNoch = await lies(() => window.__hfDebug.state.combat.monsterId);
    console.log("BEFUND rueckweg:", JSON.stringify(balken), "liste-da:", listeDa > 0,
                "kampf-noch-aktiv:", kampfLaeuftNoch);
    await shot("08-kampf-liste");
    await page.locator(".combat-return-btn").first().click();
    await page.waitForTimeout(900);
    console.log("BEFUND zurueck-im-kampf:", (await page.locator(".battle-queue-more-btn").count()) > 0);
  }
} finally {
  await h.stop();
}
