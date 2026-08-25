/**
 * Beleg-Aufnahmen + Messungen fuer den Tooltip-Umbau der Action-Queue (Chef-Auftrag 25.08.2026):
 * native `title=` raus, Custom-Tooltips (HoverTip/CitadelTip, Vorbild Charakter-Stats) rein.
 *
 * Prueft je Aufloesung (1920x1080 UND 1366x768):
 *   - Tooltip ueberdeckt NICHT den Cursor-Punkt (Hover-Element-Mittelpunkt)
 *   - Tooltip liegt VOLLSTAENDIG im Viewport (kein Abschneiden am Rand)
 *   - genau EIN `.ct-tip` ist offen (kein doppeltes/ueberlappendes Tooltip aus der Zeile +
 *     dem Knopf gleichzeitig, s. ActionQueuePanel.tsx-Kommentar am Zeilen-Umbau)
 */
import { startHarness } from "./sim-harness.mjs";

const h = await startHarness({ port: 5391, fixture: "midgame", locale: "de" });
const { page } = h;

const problems = [];

function within(rect, vw, vh) {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= vw && rect.y + rect.height <= vh;
}
function coversPoint(rect, px, py) {
  return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
}

async function checkHover(label, locator, shotName, vw, vh) {
  const el = locator.first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) {
    problems.push(`${label}: Element nicht sichtbar/kein boundingBox (${vw}x${vh})`);
    return;
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.waitForTimeout(250);
  const tips = page.locator(".ct-tip");
  const n = await tips.count();
  if (n === 0) {
    problems.push(`${label}: kein .ct-tip nach Hover (${vw}x${vh})`);
    await page.mouse.move(5, 5);
    return;
  }
  if (n > 1) {
    problems.push(`${label}: ${n} .ct-tip GLEICHZEITIG offen (${vw}x${vh}) — Doppel-Tooltip-Verdacht`);
  }
  for (let i = 0; i < n; i++) {
    const tipBox = await tips.nth(i).boundingBox();
    if (!tipBox) continue;
    const inView = within(tipBox, vw, vh);
    const overCursor = coversPoint(tipBox, cx, cy);
    console.log(
      `BEFUND ${label} [${vw}x${vh}] tip#${i}: rect=${JSON.stringify(tipBox)} cursor=(${cx.toFixed(1)},${cy.toFixed(1)}) imViewport=${inView} ueberCursor=${overCursor}`,
    );
    if (!inView) problems.push(`${label}: Tooltip #${i} ragt aus dem Viewport (${vw}x${vh}): ${JSON.stringify(tipBox)}`);
    if (overCursor) problems.push(`${label}: Tooltip #${i} liegt UEBER dem Cursor-Punkt (${vw}x${vh}): ${JSON.stringify(tipBox)}`);
  }
  await page.screenshot({ path: `ui-audit/shots-queue-tooltips/${shotName}-${vw}x${vh}.png` });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(150);
}

try {
  await page.waitForTimeout(1400);
  await page.keyboard.press("Escape");

  // ── Warteschlange fuellen (Chef-Vorgabe: ein Kampf-Eintrag + ein Aktions-Eintrag) ─────────────
  await page.evaluate(() => {
    const s = window.__hfDebug.state;
    s.actionQueue = [
      { kind: "fight", monsterId: "chicken", target: 5 },
      { kind: "action", actionId: Object.keys(window.__hfDebug.content.actions)[0], target: 10 },
    ];
  });
  await page.waitForTimeout(600);

  // Panel ggf. aufklappen (Default-Zustand kann kollabiert sein).
  const panel = page.locator(".queue-panel");
  if (await panel.evaluate((el) => el.classList.contains("queue-panel--collapsed"))) {
    await page.locator(".queue-panel-toggle").click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: "ui-audit/shots-queue-tooltips/00-panel-expanded-1920x1080.png" });

  const rowCount = await page.locator(".queue-panel-list .queue-row").count();
  console.log("BEFUND queue-row-count:", rowCount);
  if (rowCount === 0) problems.push("Keine .queue-row in der Warteschlangenliste — Testdaten nicht angekommen?");

  const runs = [
    { vw: 1920, vh: 1080 },
    { vw: 1366, vh: 768 },
  ];

  for (const { vw, vh } of runs) {
    await page.setViewportSize({ width: vw, height: vh });
    await page.waitForTimeout(300);
    if (await panel.evaluate((el) => el.classList.contains("queue-panel--collapsed"))) {
      await page.locator(".queue-panel-toggle").click();
      await page.waitForTimeout(400);
    }

    // 1) Sortier-Pfeil (Hoch) am ersten wartenden Eintrag
    await checkHover(
      "moveUp-Knopf",
      page.locator(".queue-panel-list .queue-row .queue-row-btn:not(.queue-row-btn--start):not(.queue-row-remove)").first(),
      "01-moveup",
      vw,
      vh,
    );

    // 2) Entfernen-Knopf
    await checkHover("remove-Knopf", page.locator(".queue-panel-list .queue-row .queue-row-remove").first(), "02-remove", vw, vh);

    // 3) Jetzt-starten-Knopf
    await checkHover("startNow-Knopf", page.locator(".queue-panel-list .queue-row .queue-row-btn--start").first(), "03-startnow", vw, vh);

    // 4) Zeilen-Koerper (Name/Dauer) — der neue .queue-row-body-Tooltip
    await checkHover("Zeilen-Body (Dauer/Menge)", page.locator(".queue-panel-list .queue-row .queue-row-body").first(), "04-rowbody", vw, vh);

    // 5) Panel-Toggle-Button (eingeklappt/ausgeklappt-Text)
    await checkHover("Panel-Toggle", page.locator(".queue-panel-toggle"), "05-toggle", vw, vh);

    // 6) "Warteschlange leeren"
    await checkHover("Warteschlange-leeren", page.locator(".queue-panel-clear"), "06-clearall", vw, vh);
  }

  console.log("PAGE ERRORS:", h.errors.length);
  if (h.errors.length) console.log(h.errors.join("\n"));

  if (problems.length) {
    console.log("PROBLEME:\n" + problems.map((p) => "- " + p).join("\n"));
  } else {
    console.log("ALLE MESSUNGEN OK.");
  }
} finally {
  await h.stop();
}
