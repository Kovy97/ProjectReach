// Vorher/Nachher-Vergleich fuer die 1.1.0-UI-Politik.
//
// Herkunft: entstanden aus dem Wegwerf-Skript des Raender-Audits, das 22 Szenen sauber
// ansteuern konnte — diese Navigation ist zu wertvoll zum Wegwerfen. Der Schatten-/Rahmen-
// Umbau aendert Pixel in fast jeder Datei; ohne einen Bildvergleich ueber ALLE Szenen waere
// jede Aussage "sieht noch gut aus" geraten.
//
// Aufruf:  node ui-audit/stil-vergleich.mjs 1920x1080 vorher
//          ... Aenderungen ...
//          node ui-audit/stil-vergleich.mjs 1920x1080 nachher
//          python ui-audit/stil-diff.py
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { withHarness } = await import(pathToFileURL("G:/GameDev/apps/client/ui-audit/sim-harness.mjs").href);

const PORT = 5351;
const args = process.argv.slice(2);
// Label als 2. Argument: "vorher" oder "nachher". Beide Laeufe erzeugen dieselben Szenen
// unter verschiedenen Ordnern, danach vergleicht sie ui-audit/stil-diff.py Pixel fuer Pixel.
const LABEL = args[1] || "lauf";
const OUT_ROOT = "G:/GameDev/apps/client/ui-audit/_stilvergleich/" + LABEL;
const viewportArg = args[0] || "1920x1080";
const [vw, vh] = viewportArg.split("x").map(Number);
const shotDir = join(OUT_ROOT, `shots-${vw}`);
const dataDir = join(OUT_ROOT, "data");
mkdirSync(shotDir, { recursive: true });
mkdirSync(dataDir, { recursive: true });

// ---- the in-page scan function (self-contained, runs via page.evaluate) ----
function scanBordersImpl() {
  function sideVal(cs, prop) {
    return {
      width: cs.getPropertyValue(prop + "-width").trim(),
      style: cs.getPropertyValue(prop + "-style").trim(),
      color: cs.getPropertyValue(prop + "-color").trim(),
    };
  }
  function borderOf(cs) {
    const sides = ["top", "right", "bottom", "left"].map((s) => sideVal(cs, "border-" + s));
    const allSame = sides.every(
      (s) => s.width === sides[0].width && s.style === sides[0].style && s.color === sides[0].color,
    );
    if (allSame) return { uniform: sides[0] };
    return { top: sides[0], right: sides[1], bottom: sides[2], left: sides[3] };
  }
  function radiusOf(cs) {
    const c = ["top-left", "top-right", "bottom-right", "bottom-left"].map((s) =>
      cs.getPropertyValue("border-" + s + "-radius").trim(),
    );
    const allSame = c.every((v) => v === c[0]);
    return allSame ? c[0] : c.join("/");
  }
  function hasVisibleBorder(cs) {
    return ["top", "right", "bottom", "left"].some((s) => {
      const w = parseFloat(cs.getPropertyValue("border-" + s + "-width"));
      const st = cs.getPropertyValue("border-" + s + "-style").trim();
      return w > 0 && st !== "none" && st !== "hidden";
    });
  }
  function hasVisibleOutline(cs) {
    const w = parseFloat(cs.getPropertyValue("outline-width"));
    const st = cs.getPropertyValue("outline-style").trim();
    return w > 0 && st !== "none";
  }
  function classKey(el) {
    const cls =
      el.className && typeof el.className === "string"
        ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(".")
        : "";
    return el.tagName.toLowerCase() + (cls ? "." + cls : "");
  }

  const all = Array.from(document.querySelectorAll("body *"));
  const vw = window.innerWidth,
    vh = window.innerHeight;
  const groups = new Map();
  const doubleBorderFindings = [];
  const outlineBorderFindings = [];
  const seamFindings = [];

  for (const el of all) {
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const vBorder = hasVisibleBorder(cs);
    const vOutline = hasVisibleOutline(cs);
    if (!vBorder && !vOutline) continue;

    const key = classKey(el);
    const rec = {
      key,
      id: el.id || null,
      rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) },
      border: borderOf(cs),
      radius: radiusOf(cs),
      outline: vOutline ? { width: cs.outlineWidth, style: cs.outlineStyle, color: cs.outlineColor } : null,
      bg: cs.backgroundColor,
    };

    if (!groups.has(key)) groups.set(key, { count: 0, sample: rec });
    groups.get(key).count++;

    if (vBorder && el.parentElement) {
      const pcs = getComputedStyle(el.parentElement);
      if (hasVisibleBorder(pcs)) {
        const pRect = el.parentElement.getBoundingClientRect();
        const gapTop = Math.abs(rect.top - pRect.top);
        const gapLeft = Math.abs(rect.left - pRect.left);
        const gapRight = Math.abs(pRect.right - rect.right);
        const gapBottom = Math.abs(pRect.bottom - rect.bottom);
        const closeSides = [gapTop, gapLeft, gapRight, gapBottom].filter((g) => g <= 4).length;
        if (closeSides >= 2) {
          doubleBorderFindings.push({
            childKey: key,
            childId: el.id || null,
            parentKey: classKey(el.parentElement),
            childBorder: borderOf(cs),
            parentBorder: borderOf(pcs),
            rect: rec.rect,
            gaps: { gapTop, gapLeft, gapRight, gapBottom },
          });
        }
      }
    }

    if (vBorder && vOutline) {
      outlineBorderFindings.push({ key, id: el.id || null, border: rec.border, outline: rec.outline, rect: rec.rect });
    }

    // seam check: does this element's border-color differ sharply from the background-color of
    // the element immediately behind one of its edges (a sibling/ancestor edge butting up against
    // it)? Approximate via parent bg vs own border color when NOT already flagged as double-border.
    if (vBorder && el.parentElement) {
      const pcs = getComputedStyle(el.parentElement);
      const pbg = pcs.backgroundColor;
      if (pbg && pbg !== "rgba(0, 0, 0, 0)" && pbg !== "transparent") {
        seamFindings.push({ key, id: el.id || null, ownBorder: borderOf(cs), parentBg: pbg, rect: rec.rect });
      }
    }
  }

  const groupList = Array.from(groups.entries()).map(([key, g]) => ({ key, count: g.count, ...g.sample }));
  return {
    url: location.href,
    viewport: { w: vw, h: vh },
    groups: groupList,
    doubleBorderFindings,
    outlineBorderFindings,
    seamFindingsSample: seamFindings.slice(0, 40),
  };
}

async function scanAndShot(h, sceneName) {
  const shotPath = join(shotDir, `${sceneName}.png`);
  await h.page.screenshot({ path: shotPath });
  const data = await h.page.evaluate(scanBordersImpl);
  const dataPath = join(dataDir, `${vw}x${vh}__${sceneName}.json`);
  writeFileSync(dataPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`SCENE ok: ${sceneName} groups=${data.groups.length} dbl=${data.doubleBorderFindings.length} outl=${data.outlineBorderFindings.length}`);
}

async function safe(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.log(`SCENE FAILED: ${label}: ${err.message}`);
  }
}

async function dismissSpotlightGuide(h) {
  // SpotlightGuide.tsx sets body.guide-active + pointer-events:none on .layout while a forced
  // onboarding/area tour is up, only the spotlighted target (or the guide bubble itself) stays
  // clickable. Escape closes it (registerEscCloser("guide", onSkip)). Safe no-op if none is up.
  await h.page.keyboard.press("Escape").catch(() => {});
  await h.page.waitForTimeout(150);
}

async function clickWithGuideRetry(locator) {
  try {
    await locator.click({ timeout: 4000 });
  } catch {
    await dismissSpotlightGuide({ page: locator.page() });
    await locator.click({ timeout: 15000 });
  }
}

async function gotoNav(h, id) {
  const sidebarSel = `[data-guide-id="sidebar.${id}"]`;
  const topbarSel = `[data-guide-id="topbar.${id}"]`;
  const s = h.page.locator(sidebarSel);
  if ((await s.count()) > 0) {
    await clickWithGuideRetry(s.first());
    return;
  }
  const t = h.page.locator(topbarSel);
  if ((await t.count()) > 0) {
    await clickWithGuideRetry(t.first());
    return;
  }
  throw new Error(`nav id not found: ${id}`);
}

async function run() {
  // ── Phase 1: no-fixture flow (main menu, character creation, bug-report modal) ──
  await withHarness({ port: PORT, viewport: { width: vw, height: vh }, fixture: null, requireDebugHook: false }, async (h) => {
    await h.page.waitForTimeout(1500);
    await safe("mainmenu", async () => scanAndShot(h, "01-mainmenu"));

    await safe("mainmenu-newpanel", async () => {
      await h.page.locator(".menu-nav >> text=New Game").first().click();
      await h.page.waitForTimeout(500);
      await scanAndShot(h, "02-mainmenu-newpanel");
    });

    await safe("charactercreation", async () => {
      await h.page.locator(".menu-slot--empty .hf-btn--primary").first().click();
      await h.page.waitForSelector("text=Create a New Hero", { timeout: 8000 });
      await h.page.waitForTimeout(500);
      await scanAndShot(h, "03-charactercreation");
    });

    await safe("mainmenu-back", async () => {
      await h.page.locator(".creation-back").first().click();
      await h.page.waitForTimeout(500);
    });

    await safe("bugreport-modal", async () => {
      await h.page.locator(".bugreport-entry-banner").first().click();
      await h.page.waitForTimeout(500);
      await scanAndShot(h, "04-bugreport-modal");
      await h.page.keyboard.press("Escape");
    });
  });

  // ── Phase 2: fixture midgame (everything else) ──
  await withHarness({ port: PORT, viewport: { width: vw, height: vh }, fixture: "midgame" }, async (h) => {
    await h.page.waitForTimeout(1500);
    await dismissSpotlightGuide(h);

    await safe("character", async () => {
      await gotoNav(h, "character");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "10-character");
    });

    await safe("companions", async () => {
      await gotoNav(h, "companions");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "11-companions");
    });

    await safe("combat-zones", async () => {
      await gotoNav(h, "combat");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "12-combat-zones");
    });

    await safe("combat-zone-detail", async () => {
      await clickWithGuideRetry(h.page.locator('[data-bot-zone="pastures"]').first());
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "13-combat-zone-detail");
    });

    await safe("combat-active", async () => {
      await clickWithGuideRetry(h.page.locator('[data-bot-fight-now="chicken"]').first());
      await h.page.waitForTimeout(1200);
      await scanAndShot(h, "14-combat-active");
    });

    await safe("bestiary", async () => {
      await gotoNav(h, "bestiary");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "15-bestiary");
    });

    await safe("mastery", async () => {
      await gotoNav(h, "mastery");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "16-mastery");
    });

    await safe("newhaven", async () => {
      await gotoNav(h, "newhaven");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "17-newhaven");
    });

    await safe("shop", async () => {
      await gotoNav(h, "shop");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "18-shop");
    });

    await safe("bank", async () => {
      await gotoNav(h, "bank");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "19-bank");
    });

    await safe("bank-tooltip", async () => {
      const cell = h.page.locator(".item-cell").first();
      await cell.hover();
      await h.page.waitForTimeout(600);
      await scanAndShot(h, "20-bank-tooltip");
    });

    await safe("quests", async () => {
      await gotoNav(h, "quests");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "21-quests");
    });

    await safe("achievements", async () => {
      await gotoNav(h, "achievements");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "22-achievements");
    });

    await safe("stats", async () => {
      await gotoNav(h, "stats");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "23-stats");
    });

    await safe("skills-overview", async () => {
      await gotoNav(h, "skills-overview");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "24-skills-overview");
    });

    await safe("skill-mining", async () => {
      await gotoNav(h, "mining");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "25-skill-mining");
    });

    await safe("enchanting", async () => {
      await gotoNav(h, "enchanting");
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "26-enchanting");
    });

    await safe("quit-modal", async () => {
      await h.page.locator(".sb-footer-drawer-tab").first().hover();
      await h.page.waitForTimeout(300);
      await clickWithGuideRetry(h.page.locator(".sb-footer-quit").first());
      await h.page.waitForTimeout(400);
      await scanAndShot(h, "27-quit-modal");
      await h.page.locator(".quit-confirm-actions .combat-btn.ghost").first().click();
    });

    if (h.errors.length) {
      writeFileSync(join(dataDir, `${vw}x${vh}__page-errors.json`), JSON.stringify(h.errors, null, 2), "utf-8");
    }
  });

  console.log("DONE " + viewportArg);
}

run().catch((err) => {
  console.error("FATAL", err);
  process.exit(1);
});
