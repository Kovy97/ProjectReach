import { startHarness } from "./sim-harness.mjs";

const LOCALE = process.env.SHOT_LOCALE || "de";
const W = Number(process.env.SHOT_W || 1366);
const H = Number(process.env.SHOT_H || 900);
const OUT = "ui-audit/shots-buttons";
const tag = `${LOCALE}-${W}x${H}`;

const h = await startHarness({ port: 5423, fixture: "midgame", locale: LOCALE, viewport: { width: W, height: H } });
const { page } = h;

const shot = async (loc, name, pad = 14) => {
  const el = page.locator(loc).first();
  if (!(await el.count())) { console.log("BEFUND fehlt:", name, loc); return; }
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(150);
  const bb = await el.boundingBox();
  if (!bb) { console.log("BEFUND unsichtbar:", name, loc); return; }
  await page.screenshot({ path: `${OUT}/${tag}-${name}.png`, clip: { x: Math.max(0, bb.x - pad), y: Math.max(0, bb.y - pad), width: bb.width + pad * 2, height: bb.height + pad * 2 } });
  console.log("BEFUND ok:", name);
};

const step = async (label, fn) => {
  try { await fn(); } catch (e) { console.log("BEFUND FEHLER in", label, ":", String(e).slice(0, 200)); }
};

// Robuster Klick: Escape (schliesst Toasts/Popups), dann ein echtes DOM-.click() per evaluate —
// bei 1366x768 ueberlappt die (immer sichtbare) Fuss-Aktionsreihe die unteren Sidebar-Eintraege
// (Slayer/Kraeuterkunde/...) visuell, ein Playwright-Klick trifft dort das falsche Element.
const goto = async (sel) => {
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(350);
  const el = page.locator(sel).first();
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
  await el.evaluate((node) => node.click());
  await page.waitForTimeout(1000);
};

const clickEl = async (sel, wait = 700) => {
  const el = page.locator(sel).first();
  if (!(await el.count())) return false;
  await el.scrollIntoViewIfNeeded().catch(() => {});
  await el.evaluate((node) => node.click());
  await page.waitForTimeout(wait);
  return true;
};

try {
  await page.waitForTimeout(1200);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(300);

  // ── Kampf: Monsterkarte mit Mengen-Picker (Presets + GO) ──────────────────────────
  await step("combat-setup", async () => {
    await goto('[data-guide-id="sidebar.combat"]');
    if (await page.locator(".combat-zones-btn").count()) {
      await shot(".battle-topbar", "combat-topbar", 10);
      await clickEl(".combat-zones-btn");
    }
    await clickEl(".zone-card:not(.dungeon-card)", 900);
    await shot(".monster-card-actions", "monster-card-qty", 16);

    if (await clickEl(".mc-fight-now-btn", 1500)) {
      await shot(".battle-topbar", "combat-topbar", 10);
      if (await clickEl(".combat-zones-btn")) {
        await shot(".combat-return-bar", "combat-return-bar", 10);
        // Zurueck in die `.battle`-Ansicht, sonst existiert `.combat-stop-btn` gleich nicht mehr.
        await clickEl(".combat-return-btn", 800);
      }
    }
    // Aufraeumen: laufenden Kampf beenden, sonst haengt in New Haven eine "Warteschlange wartet,
    // Kampf hat kein Ziel"-Meldung an der Baukarte, die uns hier nicht interessiert.
    await clickEl(".battle .combat-stop-btn:not(.combat-zones-btn)", 800);
  });

  // ── New Haven: Baukarte ────────────────────────────────────────────────────────────
  await step("newhaven", async () => {
    await goto('[data-guide-id="sidebar.newhaven"]');
    // Default-View ist "Karte" (map) — `.nh-card` rendert nur in der "Liste"-Ansicht (zweiter Tab,
    // Reihenfolge ist locale-unabhaengig fix: Karte/Liste/...).
    await clickEl(".nh-view-tabbar .nh-view-tab >> nth=1", 800);
    // Maus auf neutrale Flaeche (oben rechts in der Kopfzeile), sonst haengt an (2,2) selbst ein
    // HoverTip (Sidebar-Icon) und verdeckt den Aktions-Knopf.
    await page.mouse.move(700, 5);
    await page.waitForTimeout(300);
    await shot(".nh-card-action-slot", "newhaven-card", 20);
  });

  // ── Bestaetigen-Dialog: Fuss-Schublade -> Spiel verlassen ─────────────────────────
  await step("quit-confirm", async () => {
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(300);
    await clickEl(".sb-footer-drawer-tab", 500);
    if (await clickEl(".sb-footer-quit", 700)) {
      await shot(".quit-confirm-actions", "quit-confirm-dialog", 16);
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(400);
    }
  });

  // ── Slayer: Auftragszettel ─────────────────────────────────────────────────────────
  await step("slayer", async () => {
    await goto('[data-guide-id="sidebar.slayer"]');
    if (!(await page.locator(".slayer-task-fight-row").count())) {
      await clickEl(".slayer-get-task-btn", 900);
    }
    await shot(".slayer-task-fight-row", "slayer-task-row", 14);
  });

  // ── Bank ─────────────────────────────────────────────────────────────────────────
  await step("bank", async () => {
    await goto('[data-guide-id="topbar.bank"]');
    await page.screenshot({ path: `${OUT}/${tag}-bank-page.png` });
    console.log("BEFUND ok: bank-page");
  });

  // ── Optionen: Save-Import (rot) ────────────────────────────────────────────────────
  // Der Knopf ist per default disabled (leeres Textfeld) -> `.btn-iron[disabled]` graut ihn ab
  // (hoehere Spezifitaet als `.btn-iron--danger`, gewollt). Text eintragen zeigt den echten
  // roten Zustand, den der Chef sehen wollte.
  await step("options", async () => {
    await goto('[data-guide-id="sidebar.options"]');
    const textarea = page.locator(".opz-textarea").first();
    if (await textarea.count()) { await textarea.fill('{"proof":"btn-iron--danger"}'); await page.waitForTimeout(200); }
    await shot(".opz-import-row", "options-import-danger", 16);
  });
} finally {
  await h.stop();
}
