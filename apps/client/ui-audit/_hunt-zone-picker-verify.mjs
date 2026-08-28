// Verifikations-Shots für das neue zweispaltige Gebiet-Modal (HuntZonePicker, Chef-Auftrag
// 28.08.2026) — Fixture hfhunt_demo (Trap-Slot 2 ist leer, monsterKills deckt alle vier Weiden-
// Kandidaten, seenDrops kennt NUR "chicken" → Weiden zeigt bewusst bekannte UND unbekannte Chips).
import { startHarness } from "./sim-harness.mjs";

const OUT = "G:/GameDev/apps/client/ui-audit/shots-hunt-zone-picker";
const PORT = 5468;

async function openPickerOnFirstZone(page) {
  // Verifikations-Shots sollen NUR das Gebiet-Modal zeigen — die Fixture lässt eine Hintergrund-
  // Aktion weiterlaufen, die während der harness-Wartezeiten einen Meisterschafts-Toast auslösen
  // kann (reines Timing-Artefakt der Testumgebung, keine Modal-Interaktion). Toast-Stack für die
  // Shots ausblenden, ändert nichts an Spiellogik/State.
  await page.addStyleTag({ content: ".toast-stack { display: none !important; }" });
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(200);
  const skip = page.locator(".guide-bubble-skip");
  if (await skip.count()) {
    await skip.first().click();
    await page.waitForTimeout(300);
  }

  await page.locator('[data-guide-id="sidebar.hunting"]').first().click();
  await page.waitForTimeout(800);

  // Fixture: Trap-Slot-Index 2 (0-based) ist leer (zoneId: null) — sein "Falle stellen"-Knopf
  // öffnet den Picker (der Auto-Umschalt-Knopf trägt zusätzlich .hunt-trap-auto, ausgeschlossen).
  const emptySlot = page.locator(".hunt-traps .hunt-trap-card").nth(2);
  await emptySlot.locator(".hunt-trap-footer button:not(.hunt-trap-auto)").first().click();
  await page.waitForTimeout(500);

  // "The Pastures"/"Weiden" ist Zone 1 (niedrigste Stufe) → oberste Kachel der Liste. Explizit
  // klicken (statt sich nur auf die Vorauswahl zu verlassen), um die Auswahl-Interaktion selbst
  // mitzuprüfen.
  await page.locator(".hzp-zone-tile").first().click();
  await page.waitForTimeout(300);
}

// Shot 1: 1920×1080 de — "Nicht fangbar" aufklappen und ans Ende der (intern scrollenden) rechten
// Spalte scrollen, damit Fangbar-Chips (bekannt+unbekannt) UND die aufgeklappten Nicht-fangbar-
// Gründe gemeinsam im Bild sind (das Banner scrollt dabei bewusst aus dem sichtbaren Bereich —
// genau das ist die "beide Spalten scrollen intern"-Vorgabe).
async function shotDe1920() {
  const h = await startHarness({ port: PORT, fixture: "hfhunt_demo", locale: "de", viewport: { width: 1920, height: 1080 }, outDir: OUT });
  try {
    await openPickerOnFirstZone(h.page);
    await h.page.locator(".hzp-nt-head").first().click();
    await h.page.waitForTimeout(300);
    await h.page.evaluate(() => {
      const detail = document.querySelector(".hzp-col-detail");
      if (detail) detail.scrollTop = detail.scrollHeight;
    });
    await h.page.waitForTimeout(200);
    await h.shot("picker-1920x1080-de");
    console.log(`picker-1920x1080-de ok — errors: ${h.errors.length}`);
    if (h.errors.length) console.log(h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}

// Shot 2: 1366×768 ru — oben (natürliche Scroll-Position nach der Auswahl) für die bindende
// Kleinbildschirm-Prüfung: Banner auf 120px, Kacheln zweizeilig, kein Clipping.
async function shotRu1366() {
  const h = await startHarness({ port: PORT, fixture: "hfhunt_demo", locale: "ru", viewport: { width: 1366, height: 768 }, outDir: OUT });
  try {
    await openPickerOnFirstZone(h.page);
    await h.shot("picker-1366x768-ru");
    console.log(`picker-1366x768-ru ok — errors: ${h.errors.length}`);
    if (h.errors.length) console.log(h.errors.join("\n"));
  } finally {
    await h.stop();
  }
}

await shotDe1920();
await shotRu1366();
