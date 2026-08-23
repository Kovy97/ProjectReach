#!/usr/bin/env node
/**
 * clip-audit.mjs — systematischer Messlauf für ABGESCHNITTENE TEXTE und SKALIERUNGSPROBLEME.
 *
 * Hintergrund (1.0-Runde, 2026-08-22): der Chef hat viel Spieler-Feedback zu "Text ist in der Box
 * abgeschnitten" und zu Skalierungsproblemen oberhalb von 3440×1440. Dieses Skript ersetzt das
 * Stichproben-Augenmaß durch eine WIEDERHOLBARE Messung: es fährt jede Seite der App bei mehreren
 * Auflösungen an, prüft JEDEN sichtbaren Textknoten gegen drei harte Clipping-Kriterien und
 * schreibt eine maschinenlesbare Fundliste + einen nach Ursache gruppierten Markdown-Bericht.
 *
 *   node ui-audit/clip-audit.mjs                              # voller Lauf: 3 Sprachen x 6 Aufloesungen
 *   node ui-audit/clip-audit.mjs --res 3440x1440              # nur eine Aufloesung
 *   node ui-audit/clip-audit.mjs --locales de                 # nur eine Sprache
 *   node ui-audit/clip-audit.mjs --scenes combat-zones,bank   # nur einzelne Szenen
 *   node ui-audit/clip-audit.mjs --report-only                # Bericht aus vorhandenen raw/*.json neu bauen
 *   node ui-audit/clip-audit.mjs --skip-run                   # nur Beleg-Screenshots + Bericht (raw/ liegt schon da)
 *   node ui-audit/clip-audit.mjs --list-scenes                # Szenen-IDs auflisten
 *
 * Weitere Flags: `--out <ordner>`, `--port <n>`, `--fixture <name>`, `--stress false`,
 * `--min-px <n>` (Melde-Schwelle, Default 2), `--max-shots <n>` (Default 90), `--no-shots`,
 * `--settle-ms <n>`.
 *
 * ── Aufbau (was gekapselt ist, damit ein Aufrufer nichts davon wissen muss) ────────────────────
 *
 * - Dev-Server, GPU-sicherer Headless-Chromium, Fixture-Laden, Cold-Start-Settle: komplett über
 *   `sim-harness.mjs`'s `startHarness()` — dasselbe erprobte Fundament wie bot.mjs & alle anderen
 *   ui-audit-Skripte. KEIN zweiter Bootstrap-Pfad.
 * - EINE Seite, EIN Prozess (die rAF-Freeze-Falle aus BOT-GUIDE.md gilt hier genauso). Sprachen
 *   und Aufloesungen laufen SEQUENZIELL in derselben Seite (`setViewportSize` + Reload).
 *   Parallelisieren: mehrere Prozesse mit je eigenem `--port` und eigener `--locales`/`--res`,
 *   danach alle `raw/*.json` in EINEN Ordner kopieren und dort einmal `--skip-run` (mit Belegen)
 *   oder `--report-only` (ohne) laufen lassen — die Rohdaten liegen bewusst je Sprache+Aufloesung
 *   in getrennten Dateien (`raw/<sprache>-<breite>x<hoehe>.json`).
 * - Spielstand: ein weit fortgeschrittener Charakter (Default-Fixture-Präferenz s. FIXTURE_PREFS)
 *   plus ein "Stress-Patch" IM SPEICHER (kein Datei-Schreiben, keine neue Fixture): sechs-/
 *   siebenstelliges Gold, alle Erfolge, fünfstellige Kill-Zähler, volles Lager, Postfach-Inhalt.
 *   Genau die Zustände, in denen lange Zahlen und lange Namen die Boxen sprengen.
 *   Der EXAKTE sichtbare Text steht bei jedem Fund dabei — wer beurteilen will, ob ein Fund nur
 *   bei 7-stelligem Gold auftritt, sieht das direkt am `text`-Feld.
 * - Die Touren/Guides des Onboardings blockieren jeden Klick (`body.guide-active`). Vor dem ersten
 *   Schritt werden deshalb ALLE bekannten `toursSeen`-Schlüssel gesetzt und, falls doch noch ein
 *   Guide steht, sein "Überspringen"-Knopf gedrückt. Alt-Fixtures kennen neuere Tour-Keys nicht.
 *
 * ── Die drei Clipping-Kriterien (alle mit gemessenen Werten im Fund) ───────────────────────────
 *
 *   A "overflow-clip"        `scrollWidth > clientWidth+ε` bzw. `scrollHeight > clientHeight+ε`
 *                            bei `overflow: hidden|clip` oder `text-overflow: ellipsis`.
 *   B "line-clamp"           `-webkit-line-clamp` greift und der Text ist höher als die Box.
 *   C "container-overflow"   Das Element ragt aus seinem NÄCHSTEN clippenden Vorfahren heraus.
 *   D "viewport-overflow"    Das Element ragt aus dem Fenster heraus.
 *   E "js-truncated"         Text endet auf "…"/"...", aber `title`/`aria-label` ist länger →
 *                            im JS vorab gekürzt (CSS-Messung greift hier gar nicht).
 *
 * BEWUSST NICHT gemessen (Stand 2026-08-22, naechster Ausbauschritt): Text, der einen NICHT
 * clippenden Container verlaesst und einen Nachbarn UEBERLAPPT. Das ist eine eigene Bugklasse
 * ("Text auf Text") und braucht einen Kollisions-Sweep ueber alle Textkaesten — die drei
 * Kriterien oben decken sie nicht ab. Ein beobachtetes Beispiel: die ausklappbare Sidebar-
 * Fussleiste legt sich bei 1366x768 ueber die letzte Skill-Zeile.
 *
 * Je Fund werden Seite, Sprache, Aufloesung, CSS-Pfad, sichtbarer Text (per
 * `caretRangeFromPoint` an der Schnittkante bestimmt), voller Text, Element-Masse, das greifende
 * Kriterium und die passenden CSS-Regeln festgehalten — inklusive Quelldatei:Zeile, die NICHT aus
 * der CSSOM stammen kann (Vite zieht im Dev-Modus alle @imports zu einem <style> zusammen), sondern
 * aus einem Selektor-Index ueber `src/renderer/styles/*.css` (s. `cssSourceIndex`).
 *
 * Gemessen wird immer der GEMALTE Text (Range-Rechtecke), nie die Element-Huelle: eine Box mit
 * Innenabstand kann aus ihrem Container ragen, ohne dass ein Buchstabe verschwindet. Ebenso
 * ausgefiltert: Screenreader-Verstecke (1x1-px-Clipper), Elemente hinter einem Scroller (die kann
 * man hinscrollen) und die EM-Box-Ueberhaenge von `line-height: 1`.
 *
 * ── Ausgabe ───────────────────────────────────────────────────────────────────────────────────
 *   <out>/raw/<sprache>-<res>.json        Rohdaten je Sprache+Aufloesung (Funde + Skalierungs-Sonde)
 *   <out>/findings.json                   alle Funde, zusammengefuehrt, mit Schweregrad + Gruppen-ID
 *   <out>/groups.json                     Ursachen-Gruppen (das Arbeitsmaterial fuer die Fix-Agenten)
 *   <out>/scale.json                      Skalierungs-Sonde, gesamt + je Szene
 *   <out>/report.md                       nach Schwere sortierter Bericht
 *   <out>/shots/<sprache>-<res>/<szene>.jpg   Uebersichts-Screenshot je Szene
 *   <out>/shots/<sprache>-<res>/G###-*.png    Ausschnitt mit rot markiertem Element, je Ursachen-Gruppe
 *
 * ── Port ──────────────────────────────────────────────────────────────────────────────────────
 * Default 5290 (frei laut SIM-AGENT-GUIDE.md's Port-Tabelle: "5281+"). Bei Parallelläufen je
 * Prozess einen eigenen Port aus 5290-5299 vergeben.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const SERVED_FIXTURES = join(CLIENT_DIR, "src", "renderer", "public", "ui-audit-fixtures");

const DEFAULT_PORT = 5290;
const DEFAULT_OUT = join(__dirname, "clip-audit-runs", "latest");

/** Auflösungen. Der Chef-Befund hängt an allem OBERHALB von 3440×1440 → 3840×2160 ist Pflicht,
 *  1366×768 markiert die untere Kante (kleinstes noch unterstütztes Fenster). */
const DEFAULT_RESOLUTIONS = ["1366x768", "1600x900", "1920x1080", "2560x1440", "3440x1440", "3840x2160"];

/**
 * Sprachen. Englisch ist der KÜRZESTE der sieben Texte — die Boxen sind auf ihn hin gebaut, ein
 * reiner EN-Lauf findet deshalb fast nichts (gemessen: 0-2 Funde je Seite, quer über alle
 * Auflösungen). Deutsch und Russisch sind die Langtext-Extreme und damit die eigentlichen
 * Bug-Finder. Gültig: en, de, zh, ru, es, pt-BR, fr (s. renderer/i18n/index.tsx).
 */
const DEFAULT_LOCALES = ["en", "de", "ru"];

/** Fixture-Präferenz: die erste vorhandene gewinnt. `mkt_camp` ist der vollständigste Zustand im
 *  Repo (Total Lv 1915, 900.000 Gold, 62 Lager-Posten, 15 gebaute New-Haven-Gebäude MIT Positionen
 *  auf der Karte) — `endgame` ist der Rückfall, falls jemand die Marketing-Fixture aufräumt. */
const FIXTURE_PREFS = ["mkt_camp", "t334_camp", "nh_busy", "endgame", "midgame"];

const SKILL_PAGES = [
  "woodcutting", "mining", "fishing", "smithing", "cooking", "farming", "foraging",
  "thieving", "leatherworking", "jewelcrafting", "runecrafting", "herblore", "slayer",
];

// ─────────────────────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

function parseRes(spec) {
  const m = /^(\d+)x(\d+)$/.exec(String(spec).trim());
  if (!m) throw new Error(`Auflösung muss "BREITExHOEHE" sein (z.B. 3440x1440), bekam "${spec}"`);
  return { width: Number(m[1]), height: Number(m[2]), label: `${m[1]}x${m[2]}` };
}

function pickFixture(explicit) {
  if (explicit) return explicit;
  for (const name of FIXTURE_PREFS) {
    if (existsSync(join(SERVED_FIXTURES, `${name}.json`))) return name;
  }
  throw new Error(
    `Keine Fixture gefunden. Erst \`pnpm --filter @hearthforge/client ui-audit:fixtures\` laufen lassen ` +
      `(schreibt midgame/endgame nach ${SERVED_FIXTURES}).`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Szenen — jede fährt einen Zustand an, den anschließend der Scanner vermisst.
// `run(ctx)` bekommt kleine Helfer; alles andere ist bewusst gewöhnliches Playwright.
// ─────────────────────────────────────────────────────────────────────────────────────────────

function buildScenes() {
  const scenes = [];
  const add = (id, label, run, opts = {}) => scenes.push({ id, label, run, ...opts });

  // ── Hauptmenü & Charaktererstellung (ohne Fixture — eigener Screen-Zweig der App) ──
  add("menu", "Hauptmenü (Ledger geschlossen)", async (c) => { await c.toMenu(); }, { menu: true });
  add("menu-load", "Hauptmenü · Spielstand laden", async (c) => {
    await c.toMenu();
    await c.clickNth(".menu-nav button", 1);
    await c.settle(600);
  }, { menu: true });
  add("menu-options", "Hauptmenü · Optionen", async (c) => {
    await c.toMenu();
    await c.clickNth(".menu-nav button", 2);
    await c.settle(600);
  }, { menu: true });
  add("creation", "Charaktererstellung", async (c) => {
    await c.toMenu();
    await c.clickNth(".menu-nav button", 0);
    await c.settle(600);
    if (!(await c.clickOpt(".menu-slot--empty .menu-slot-actions button"))) {
      await c.clickOpt(".menu-slot--empty");
    }
    await c.waitFor(".creation, .cc-root, [class*=creation]", 6000);
    await c.settle(700);
  }, { menu: true });

  // ── Charakterbogen ──
  add("character-equipment", "Charakter · Ausrüstung", async (c) => {
    await c.nav("character");
    await c.clickOpt("#cs-tab-equipment");
    await c.settle(500);
  });
  add("character-stats", "Charakter · Werte-Reiter", async (c) => {
    await c.nav("character");
    await c.clickOpt("#cs-tab-stats");
    await c.settle(500);
  });
  add("character-item-tooltip", "Charakter · Item-Tooltip über Inventar", async (c) => {
    await c.nav("character");
    await c.clickOpt("#cs-tab-equipment");
    await c.settle(300);
    await c.hoverFirst(".cs-inv-slot-wrap .item-cell.filled, .inv-slot .item-cell.filled, .item-cell.filled");
    await c.waitFor(".item-tooltip", 4000);
    await c.settle(400);
  });
  add("character-equip-tooltip", "Charakter · Tooltip über angelegtem Ausrüstungsteil", async (c) => {
    await c.nav("character");
    await c.clickOpt("#cs-tab-equipment");
    await c.settle(300);
    await c.hoverFirst(".cs-slot.slot-item, .eq-slot.slot-item, .cs-slot");
    await c.waitFor(".item-tooltip", 4000);
    await c.settle(400);
  });
  add("companions", "Gefährten / Pets", async (c) => { await c.nav("companions"); });

  // ── Fortschritt / Übersichten ──
  add("skills-overview", "Skills-Übersicht", async (c) => { await c.nav("skills-overview"); });
  add("stats", "Statistik", async (c) => { await c.nav("stats"); });
  add("achievements", "Erfolge", async (c) => { await c.nav("achievements"); });
  add("bestiary", "Bestiarium", async (c) => { await c.nav("bestiary"); await c.settle(900); });
  add("mastery", "Meisterschaft", async (c) => { await c.nav("mastery"); await c.settle(600); });
  add("mastery-expanded", "Meisterschaft · aufgeklappter Skill-Block", async (c) => {
    await c.nav("mastery");
    await c.settle(400);
    await c.clickOpt(".ms2-skill-hdr");
    await c.settle(600);
  });

  // ── Kampf ──
  add("combat-zones", "Kampf · Zonen-Übersicht", async (c) => { await c.nav("combat"); await c.settle(700); });
  add("combat-zone-detail", "Kampf · Gegnerauswahl in einer Zone", async (c) => {
    await c.nav("combat");
    await c.settle(500);
    await c.openFirstZone();
    await c.settle(900);
  });
  add("combat-fight", "Kampf · laufender Kampf", async (c) => {
    await c.nav("combat");
    await c.settle(500);
    await c.openFirstZone();
    await c.settle(500);
    await c.clickOpt("[data-bot-fight-now]");
    await c.page.waitForFunction(() => window.__hfDebug?.state?.combat?.monsterId != null, null, { timeout: 12000 }).catch(() => {});
    await c.settle(2200);
  });
  add("combat-queue-picker", "Kampf · Mengen-Picker auf der Monsterkarte", async (c) => {
    await c.nav("combat");
    await c.settle(500);
    await c.openFirstZone();
    await c.settle(500);
    await c.clickOpt(".mc-queue-actions .qty-picker-btn");
    await c.settle(600);
  });

  // ── Alle Skill-Seiten mit Aktionskarten ──
  for (const skill of SKILL_PAGES) {
    add(`skill-${skill}`, `Skill-Seite · ${skill}`, async (c) => {
      await c.nav(skill);
      await c.settle(700);
    });
  }
  add("skill-action-tooltip", "Skill-Seite · Tooltip auf einer Aktionskarte", async (c) => {
    await c.nav("smithing");
    await c.settle(600);
    await c.hoverFirst(".skillcard .item-chip, .skillcard-produces-item, .skillcard");
    await c.settle(700);
  });

  // ── Wirtschaft ──
  add("bank", "Bank", async (c) => { await c.nav("bank"); await c.settle(700); });
  add("bank-tooltip", "Bank · Item-Tooltip", async (c) => {
    await c.nav("bank");
    await c.settle(500);
    await c.hoverFirst(".bank-drag-cell .item-cell.filled, .bank-drag-cell .item-cell");
    await c.waitFor(".item-tooltip", 4000);
    await c.settle(400);
  });
  add("shop", "Shop", async (c) => { await c.nav("shop"); await c.settle(700); });
  add("shop-tabs", "Shop · zweiter Reiter", async (c) => {
    await c.nav("shop");
    await c.settle(400);
    await c.clickNth(".shopv2-maintabs button", 1);
    await c.settle(700);
  });
  add("enchanting", "Verzauberung", async (c) => { await c.nav("enchanting"); await c.settle(700); });
  add("quests", "Quests", async (c) => { await c.nav("quests"); await c.settle(700); });
  add("quests-tab2", "Quests · zweiter Reiter", async (c) => {
    await c.nav("quests");
    await c.settle(400);
    await c.clickNth(".quests-tab-btn", 1);
    await c.settle(700);
  });
  add("quests-tab3", "Quests · dritter Reiter", async (c) => {
    await c.nav("quests");
    await c.settle(400);
    await c.clickNth(".quests-tab-btn", 2);
    await c.settle(700);
  });

  // ── New Haven ──
  add("newhaven-map", "New Haven · Karte", async (c) => { await c.nav("newhaven"); await c.settle(1200); });
  add("newhaven-building", "New Haven · Gebäude-Dialog", async (c) => {
    await c.nav("newhaven");
    await c.settle(1000);
    await c.clickOpt(".nh-map-tile");
    await c.waitFor(".nh-popup", 5000);
    await c.settle(600);
  });
  add("newhaven-list", "New Haven · Listenansicht", async (c) => {
    await c.nav("newhaven");
    await c.settle(800);
    await c.clickNth(".nh-view-tab", 1);
    await c.settle(900);
  });
  add("newhaven-buildmenu", "New Haven · Baumenü", async (c) => {
    await c.nav("newhaven");
    await c.settle(1000);
    await c.scrollIntoView(".nh-buildmenu-list");
    await c.settle(500);
  });
  add("newhaven-confirm", "New Haven · Bestätigungs-Popup (Abriss)", async (c) => {
    await c.nav("newhaven");
    await c.settle(1000);
    await c.clickOpt(".nh-map-tile");
    await c.waitFor(".nh-popup", 5000);
    await c.settle(400);
    await c.clickLast(".nh-popup-actions button");
    await c.settle(700);
  });

  // ── Footer-Schublade: Postfach & Optionen ──
  add("mail", "Postfach", async (c) => { await c.navFooter("mail"); await c.settle(800); });
  add("options", "Optionen", async (c) => { await c.navFooter("options"); await c.settle(800); });
  add("options-scrolled", "Optionen · unterer Bereich", async (c) => {
    await c.navFooter("options");
    await c.settle(500);
    await c.scrollBottom(".content, .opz-root, .options-page");
    await c.settle(600);
  });

  return scenes;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Der Scanner — läuft KOMPLETT im Browser (eine `page.evaluate`-Runde pro Szene).
// Muss ohne Closures über Node-Variablen auskommen (Playwright serialisiert die Funktion).
// ─────────────────────────────────────────────────────────────────────────────────────────────

function inPageScan(cfg) {
  const EPS = cfg.eps;
  const MIN_PX = cfg.minOverflowPx;

  // Tags ohne eigenen Textfluss / mit abweichender scrollWidth-Semantik.
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "HEAD", "META", "LINK", "TITLE", "BR", "HR", "IMG", "SVG", "PATH", "CANVAS",
    "VIDEO", "AUDIO", "SOURCE", "TRACK", "NOSCRIPT", "G", "DEFS", "USE", "CIRCLE", "RECT", "LINE",
    "POLYGON", "POLYLINE", "TSPAN", "TEXTPATH", "INPUT", "TEXTAREA", "PROGRESS", "METER", "IFRAME",
  ]);
  // Klassen, die einen ZUSTAND beschreiben, nicht eine Komponente — taugen nicht als Gruppenschlüssel.
  const STATE_CLASSES = new Set([
    "active", "filled", "empty", "disabled", "selected", "open", "closed", "muted", "dim", "hidden",
    "visible", "all", "acc", "qty", "bar", "unavailable", "unknown", "undiscovered", "reached",
    "has-bg", "lacking", "pixelart", "ui-icon", "dragging", "hover", "current", "done", "locked",
    "small", "large", "compact", "wide", "narrow", "row", "col", "left", "right", "center", "top",
    "bottom", "first", "last", "even", "odd", "boost", "up", "down", "on", "off", "new", "old",
  ]);
  const RULE_PROPS = [
    "overflow", "overflow-x", "overflow-y", "text-overflow", "white-space", "-webkit-line-clamp",
    "width", "height", "max-width", "max-height", "min-width", "min-height", "flex", "flex-basis",
    "font-size", "line-height", "word-break", "overflow-wrap",
  ];

  // ── CSS-Regel-Index (einmal pro Dokument; Vite-Dev hängt die Quelldatei an das <style>) ──
  function buildRuleIndex() {
    if (window.__clipAuditRules) return window.__clipAuditRules;
    const out = [];
    const visit = (rules, media, src) => {
      for (const rule of rules) {
        if (rule.selectorText && rule.style) {
          const sel = rule.selectorText;
          if (!sel || sel.indexOf("::") !== -1 || sel.indexOf("@") === 0) continue;
          const decls = [];
          for (const p of RULE_PROPS) {
            const v = rule.style.getPropertyValue(p);
            if (v) decls.push(p + ": " + v.trim());
          }
          if (decls.length) out.push({ sel, decl: decls.join("; "), media, src });
        } else if (rule.cssRules) {
          const own = rule.media ? rule.media.mediaText : rule.conditionText || "";
          visit(rule.cssRules, own ? (media ? media + " and " + own : own) : media, src);
        }
      }
    };
    for (const ss of document.styleSheets) {
      let rules = null;
      try { rules = ss.cssRules; } catch { continue; }
      if (!rules) continue;
      let src = ss.href || "";
      const node = ss.ownerNode;
      if (node && node.getAttribute) src = node.getAttribute("data-vite-dev-id") || src;
      visit(rules, "", src);
    }
    window.__clipAuditRules = out;
    return out;
  }

  const ruleIndex = buildRuleIndex();
  // matchMedia einmal pro Scan auswerten (Viewport ändert sich während eines Scans nicht).
  for (const r of ruleIndex) {
    r._ok = !r.media || (() => { try { return window.matchMedia(r.media).matches; } catch { return true; } })();
  }
  const liveRules = ruleIndex.filter((r) => r._ok);

  function rulesFor(el) {
    const hits = [];
    for (let i = 0; i < liveRules.length && hits.length < 6; i++) {
      const r = liveRules[i];
      try { if (el.matches(r.sel)) hits.push({ sel: r.sel, decl: r.decl, src: shortSrc(r.src), media: r.media || null }); } catch { /* exotischer Selektor */ }
    }
    return hits;
  }

  function shortSrc(s) {
    if (!s) return null;
    const i = s.replace(/\\/g, "/").lastIndexOf("/src/renderer/");
    return i === -1 ? s.replace(/\\/g, "/").split("/").slice(-2).join("/") : s.replace(/\\/g, "/").slice(i + 1);
  }

  // ── CSS-Pfad eines Elements (kurz genug zum Wiederfinden, lang genug zum Eindeutigsein) ──
  function cssPath(el) {
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && parts.length < 7) {
      let seg = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(seg + "#" + node.id); break; }
      const cls = Array.from(node.classList).slice(0, 3);
      if (cls.length) seg += "." + cls.join(".");
      const parent = node.parentElement;
      if (parent) {
        const sibs = Array.from(parent.children).filter((s) => s.tagName === node.tagName);
        if (sibs.length > 1) seg += ":nth-of-type(" + (sibs.indexOf(node) + 1) + ")";
      }
      parts.unshift(seg);
      node = node.parentElement;
    }
    return parts.join(" > ");
  }

  /** Die aussagekräftigste Klasse eines Elements — Basis für die Ursachen-Gruppierung. */
  function componentClass(el) {
    let best = null;
    for (const c of el.classList) {
      if (STATE_CLASSES.has(c)) continue;
      if (/^(is-|has-|rarity-|lang-|theme-)/.test(c)) continue;
      if (!best || c.length > best.length) best = c;
    }
    return best || "<" + el.tagName.toLowerCase() + ">";
  }

  function norm(s) { return (s || "").replace(/\s+/g, " ").trim(); }

  /**
   * Die tatsächlich GEMALTEN Textkästen des Elements (nicht seine Border-Box). Entscheidend gegen
   * Fehlalarme: eine Box mit Innenabstand/Rahmen kann aus ihrem Container ragen, ohne dass auch nur
   * ein Buchstabe verdeckt wird. Gemessen wird deshalb immer der Text, nie die Hülle.
   */
  function textRect(el) {
    let r;
    try {
      r = document.createRange();
      r.selectNodeContents(el);
    } catch { return null; }
    const rects = r.getClientRects();
    let l = Infinity, t = Infinity, rr = -Infinity, b = -Infinity;
    for (const q of rects) {
      if (q.width < 0.5 || q.height < 0.5) continue;
      if (q.left < l) l = q.left;
      if (q.top < t) t = q.top;
      if (q.right > rr) rr = q.right;
      if (q.bottom > b) b = q.bottom;
    }
    if (l === Infinity) return null;
    return { left: l, top: t, right: rr, bottom: b, width: rr - l, height: b - t };
  }

  /** Der sichtbare Textanteil, per Caret an der SCHNITTKANTE bestimmt (präzise, nicht geschätzt). */
  function visibleCut(el, tr, clip, axis) {
    const full = norm(el.textContent);
    if (!full) return { visible: "", approx: true };
    try {
      const x = axis === "x" ? clip.right - 3 : Math.min(clip.right, tr.right) - 2;
      const y = axis === "x" ? Math.max(tr.top + 3, Math.min(clip.bottom - 3, tr.top + tr.height / 2)) : clip.bottom - 4;
      const r = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
      if (r && r.startContainer && r.startContainer.nodeType === 3 && el.contains(r.startContainer)) {
        const probe = document.createRange();
        probe.selectNodeContents(el);
        probe.setEnd(r.startContainer, r.startOffset);
        const vis = norm(probe.toString());
        if (vis && vis.length < full.length) return { visible: vis, approx: false };
      }
    } catch { /* caretRangeFromPoint ist Chromium-spezifisch, aber genau da laufen wir */ }
    // Fallback: Anteil des Textkastens, der INNERHALB der Clip-Kante liegt (nicht scrollWidth —
    // bei Kriterium C/D ist scrollWidth === clientWidth und das Verhaeltnis waere immer 1).
    let ratio = 1;
    if (axis === "x" && tr && tr.width > 0) ratio = (Math.min(tr.right, clip.right) - Math.max(tr.left, clip.left)) / tr.width;
    else if (axis === "y" && tr && tr.height > 0) ratio = (Math.min(tr.bottom, clip.bottom) - Math.max(tr.top, clip.top)) / tr.height;
    ratio = Math.max(0, Math.min(1, ratio));
    return { visible: full.slice(0, Math.max(0, Math.round(full.length * ratio))), approx: true };
  }

  /** Content-Box (Rahmen abgezogen, Scrollbalken-Breite abgezogen) eines Elements, absolut. */
  function contentBox(el, cs) {
    const r = el.getBoundingClientRect();
    const bl = parseFloat(cs.borderLeftWidth) || 0;
    const bt = parseFloat(cs.borderTopWidth) || 0;
    return { left: r.left + bl, top: r.top + bt, right: r.left + bl + el.clientWidth, bottom: r.top + bt + el.clientHeight };
  }

  /** Bildet `el` (oder ein Vorfahre) den umschliessenden Block fuer absolut/fix positionierte
   *  Nachfahren? Nur DIESE Vorfahren koennen so einen Nachfahren ueberhaupt beschneiden. */
  function establishesCB(cs, forFixed) {
    const cb = cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" ||
      (cs.contain || "").indexOf("paint") !== -1 || (cs.willChange || "").indexOf("transform") !== -1;
    return forFixed ? cb : cb || cs.position !== "static";
  }

  /**
   * Der naechste Vorfahre, der den Text WIRKLICH beschneidet.
   * Wichtig gegen Fehlalarme: ein `overflow:hidden`-Vorfahre mit `position:static` beschneidet
   * einen absolut positionierten Nachfahren NICHT — genau das Muster der 1x1-px-Screenreader-
   * Ueberschriften in dieser App (`h1{width:1px;overflow:hidden}` mit sichtbarem Kind).
   */
  function nearestClipper(el, axis) {
    let pending = getComputedStyle(el).position;
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      const escapes =
        (pending === "absolute" && !establishesCB(cs, false)) ||
        (pending === "fixed" && !establishesCB(cs, true));
      if (!escapes) {
        const ov = axis === "x" ? cs.overflowX : cs.overflowY;
        // Screenreader-Verstecke (`width:1px;height:1px;overflow:hidden`) sind ABSICHTLICH
        // unsichtbar — kein Layout-Schnitt. Alles unter 4 px Innenmass zaehlt als solches.
        if ((ov === "hidden" || ov === "clip") && p.clientWidth >= 4 && p.clientHeight >= 4) return { el: p, cs };
        if ((ov === "hidden" || ov === "clip")) return null;
        if (ov === "auto" || ov === "scroll") return null; // scrollbar → kein harter Schnitt
      }
      if (pending === "absolute" && establishesCB(cs, false)) pending = "static";
      else if (pending === "fixed" && establishesCB(cs, true)) pending = "static";
      if (cs.position === "absolute") pending = "absolute";
      else if (cs.position === "fixed") pending = "fixed";
      p = p.parentElement;
    }
    return null;
  }

  /** Liegt irgendwo über dem Element ein Scroller, der es ins Bild holen KANN? Dann ist ein
   *  Herausragen aus dem Fenster kein "abgeschnitten", sondern nur "noch nicht gescrollt". */
  function hasScrollableAncestor(el, axis) {
    let p = el.parentElement;
    while (p) {
      const cs = getComputedStyle(p);
      const ov = axis === "x" ? cs.overflowX : cs.overflowY;
      if (ov === "auto" || ov === "scroll") {
        if (axis === "x" ? p.scrollWidth > p.clientWidth + 1 : p.scrollHeight > p.clientHeight + 1) return true;
      }
      p = p.parentElement;
    }
    const de = document.documentElement;
    return axis === "x" ? de.scrollWidth > de.clientWidth + 1 : de.scrollHeight > de.clientHeight + 1;
  }

  function hasDirectText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) return true;
    return false;
  }

  function isInteractive(el) {
    const t = el.tagName;
    if (t === "BUTTON" || t === "A" || t === "SELECT") return true;
    if (el.getAttribute("role") === "button" || el.getAttribute("role") === "tab") return true;
    return !!el.closest("button, a, [role=button], [role=tab]");
  }

  // ── Durchlauf ──
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const findings = [];
  const seen = new Set();
  const all = document.querySelectorAll("body *");

  for (const el of all) {
    if (SKIP_TAGS.has(el.tagName)) continue;
    const text = norm(el.textContent);
    if (!text) continue;
    if (text.length > 4000) continue; // Container-Riesen, kein Textknoten

    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (parseFloat(cs.opacity) < 0.06) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    // komplett außerhalb des Fensters (eingeklappte Panels, vorbereitete Overlays) → kein Fund
    if (rect.right < -4 || rect.bottom < -4 || rect.left > vw + 4 || rect.top > vh + 4) continue;

    const own = hasDirectText(el);
    const hits = [];
    const selfBox = contentBox(el, cs);

    // ── A/B: die eigene Box schneidet ──
    const clipX = cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow.indexOf("ellipsis") !== -1;
    const clipY = cs.overflowY === "hidden" || cs.overflowY === "clip";
    const lineClamp = cs.webkitLineClamp && cs.webkitLineClamp !== "none";
    const ovX = el.scrollWidth - el.clientWidth;
    const ovY = el.scrollHeight - el.clientHeight;

    // NUR Elemente mit EIGENEM Text: ein textloser Container, dessen Kinder ueberlaufen, wird
    // ueber Kriterium C von genau dem Kind gemeldet, das den Text traegt — dort gehoert der Fix hin.
    if (own && clipX && ovX > Math.max(EPS, MIN_PX)) {
      hits.push({ criterion: "overflow-clip", axis: "x", overflowPx: ovX, clip: selfBox });
    }
    if (own && (clipY || lineClamp) && ovY > Math.max(EPS, MIN_PX)) {
      hits.push({ criterion: lineClamp ? "line-clamp" : "overflow-clip", axis: "y", overflowPx: ovY, clip: selfBox });
    }

    // ── C/D: nur mit dem GEMALTEN Text messen, nie mit der Hülle (sonst massenhaft Fehlalarme) ──
    const tr = own ? textRect(el) : null;
    if (tr) {
      const cx = nearestClipper(el, "x");
      if (cx) {
        const cb = contentBox(cx.el, cx.cs);
        const out = Math.max(tr.right - cb.right, cb.left - tr.left);
        if (out > MIN_PX) hits.push({ criterion: "container-overflow", axis: "x", overflowPx: out, container: componentClass(cx.el), clip: cb });
      }
      const cy = nearestClipper(el, "y");
      if (cy) {
        const cb = contentBox(cy.el, cy.cs);
        const out = Math.max(tr.bottom - cb.bottom, cb.top - tr.top);
        // Toleranz: die Range-Rechtecke messen die EM-Box, nicht die Glyphen-Tinte. Bei
        // `line-height: 1` ragt die em-Box grundsaetzlich ~15-20 % der Schriftgroesse ueber die
        // Zeilenbox hinaus, ohne dass ein Buchstabe verschwindet — sonst meldet JEDE solche Box.
        const yTol = Math.max(MIN_PX, (parseFloat(cs.fontSize) || 16) * 0.2);
        if (out > yTol) hits.push({ criterion: "container-overflow", axis: "y", overflowPx: out, container: componentClass(cy.el), clip: cb });
      }
      const vpBox = { left: 0, top: 0, right: vw, bottom: vh };
      const outVw = Math.max(tr.right - vw, -tr.left);
      const outVh = Math.max(tr.bottom - vh, -tr.top);
      if (outVw > MIN_PX && !hasScrollableAncestor(el, "x")) hits.push({ criterion: "viewport-overflow", axis: "x", overflowPx: outVw, clip: vpBox });
      const yTolVp = Math.max(MIN_PX, (parseFloat(cs.fontSize) || 16) * 0.2);
      if (outVh > yTolVp && !hasScrollableAncestor(el, "y")) hits.push({ criterion: "viewport-overflow", axis: "y", overflowPx: outVh, clip: vpBox });
    }

    // ── E: im JS vorab gekürzt ──
    if (own && /(…|\.\.\.)$/.test(text)) {
      const full = el.getAttribute("title") || el.getAttribute("aria-label") || "";
      if (norm(full).length > text.length + 1) {
        hits.push({ criterion: "js-truncated", axis: "x", overflowPx: norm(full).length - text.length, fullAttr: norm(full), clip: selfBox });
      }
    }

    if (!hits.length) continue;

    for (const hit of hits) {
      const key = cssPath(el) + "|" + hit.criterion + "|" + hit.axis;
      if (seen.has(key)) continue;
      seen.add(key);
      const cut = hit.criterion === "js-truncated"
        ? { visible: text, approx: false }
        : visibleCut(el, tr || { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }, hit.clip, hit.axis);
      const fullText = hit.fullAttr || text;
      let hidden;
      if (hit.criterion === "container-overflow" || hit.criterion === "viewport-overflow") {
        const span = hit.axis === "x" ? (tr ? tr.width : rect.width) : (tr ? tr.height : rect.height);
        hidden = span > 0 ? Math.min(1, Math.max(0, hit.overflowPx / span)) : 0;
      } else {
        hidden = hit.axis === "x"
          ? (el.scrollWidth ? Math.min(1, Math.max(0, 1 - el.clientWidth / el.scrollWidth)) : 0)
          : (el.scrollHeight ? Math.min(1, Math.max(0, 1 - el.clientHeight / el.scrollHeight)) : 0);
      }
      // Kein einziges Zeichen wirklich verdeckt? Dann ist es kein Fund, sondern Geometrie-Rauschen.
      if (cut.visible && cut.visible.length >= fullText.length && hit.criterion !== "js-truncated" && hidden < 0.02) continue;
      findings.push({
        scene: cfg.sceneId,
        res: cfg.resLabel,
        locale: cfg.locale,
        criterion: hit.criterion,
        axis: hit.axis,
        overflowPx: Math.round(hit.overflowPx * 10) / 10,
        hiddenRatio: Math.round(hidden * 1000) / 1000,
        container: hit.container || null,
        tag: el.tagName.toLowerCase(),
        component: componentClass(el),
        classes: Array.from(el.classList).join(" "),
        path: cssPath(el),
        text: cut.visible.slice(0, 160),
        textApprox: cut.approx,
        fullText: fullText.slice(0, 400),
        fullTextLen: fullText.length,
        ownText: own,
        interactive: isInteractive(el),
        box: {
          x: Math.round(rect.x), y: Math.round(rect.y),
          w: Math.round(rect.width), h: Math.round(rect.height),
          clientW: el.clientWidth, clientH: el.clientHeight,
          scrollW: el.scrollWidth, scrollH: el.scrollHeight,
        },
        css: {
          overflowX: cs.overflowX, overflowY: cs.overflowY,
          whiteSpace: cs.whiteSpace, textOverflow: cs.textOverflow,
          lineClamp: cs.webkitLineClamp && cs.webkitLineClamp !== "none" ? cs.webkitLineClamp : null,
          fontSize: cs.fontSize, lineHeight: cs.lineHeight,
          width: cs.width, height: cs.height, maxWidth: cs.maxWidth, minWidth: cs.minWidth,
          flexBasis: cs.flexBasis,
        },
        rules: rulesFor(el),
      });
      if (findings.length >= cfg.maxFindings) break;
    }
    if (findings.length >= cfg.maxFindings) break;
  }

  // ── Eltern-Duplikate weg: hat ein Vorfahre denselben Schnitt wie ein textführendes Kind,
  //    ist der Vorfahre nur der Bote — der Fix gehört an das Element mit dem Text. ──
  const byKey = new Map();
  for (const f of findings) byKey.set(f.path + "|" + f.criterion + "|" + f.axis, f);
  const kept = findings.filter((f) => {
    if (f.ownText) return true;
    for (const g of findings) {
      if (g === f || !g.ownText) continue;
      if (g.criterion === f.criterion && g.axis === f.axis && g.path.startsWith(f.path + " > ")) return false;
    }
    return true;
  });

  return { findings: kept, truncated: findings.length >= cfg.maxFindings, elementsScanned: all.length };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Skalierungs-Sonde — beantwortet "skaliert das Layout oberhalb von 3440×1440 überhaupt mit?"
// ─────────────────────────────────────────────────────────────────────────────────────────────

function inPageScaleProbe() {
  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      w: Math.round(r.width), h: Math.round(r.height),
      fontSize: c.fontSize, padding: c.padding,
    };
  };

  // Verteilung der tatsächlich gerenderten Schriftgrößen über allen sichtbaren Textknoten.
  const sizes = [];
  let fixedPxBoxes = 0;
  let relativeBoxes = 0;
  const contentRoot = document.querySelector(".content") || document.body;
  for (const el of contentRoot.querySelectorAll("*")) {
    const c = getComputedStyle(el);
    if (c.display === "none" || c.visibility === "hidden") continue;
    let hasText = false;
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { hasText = true; break; }
    const r = el.getBoundingClientRect();
    if (r.width > 4 && r.height > 4) {
      // "hart in px" = die inline/berechnete Breite hängt an keiner relativen Einheit im Stylesheet.
      const wSpec = el.style.width || "";
      if (/px$/.test(wSpec)) fixedPxBoxes++;
      else if (/(%|vw|vh|em|rem)/.test(wSpec)) relativeBoxes++;
    }
    if (!hasText) continue;
    const fs = parseFloat(c.fontSize);
    if (fs > 0) sizes.push(fs);
  }
  sizes.sort((a, b) => a - b);
  const pct = (p) => (sizes.length ? sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * p))] : 0);

  // Wie viel des Inhaltsbereichs ist tatsächlich belegt, und wie weit reicht der GEMALTE Inhalt?
  // Beides zusammen ist das Leerflächen-Maß: "Füllgrad" (Raster) + "Tinten-Rechteck" (Ausdehnung).
  const cr = contentRoot.getBoundingClientRect();
  let covered = 0;
  const rows = 24, cols = 24;
  const marks = new Uint8Array(rows * cols);
  let inkL = Infinity, inkT = Infinity, inkR = -Infinity, inkB = -Infinity;
  for (const el of contentRoot.querySelectorAll("*")) {
    const c = getComputedStyle(el);
    if (c.display === "none" || c.visibility === "hidden" || parseFloat(c.opacity) < 0.1) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.width > cr.width * 0.98 && r.height > cr.height * 0.98) continue; // reine Hüllen
    if (r.left < inkL) inkL = r.left;
    if (r.top < inkT) inkT = r.top;
    if (r.right > inkR) inkR = r.right;
    if (r.bottom > inkB) inkB = r.bottom;
    const c0 = Math.max(0, Math.floor(((r.left - cr.left) / cr.width) * cols));
    const c1 = Math.min(cols - 1, Math.floor(((r.right - cr.left) / cr.width) * cols));
    const r0 = Math.max(0, Math.floor(((r.top - cr.top) / cr.height) * rows));
    const r1 = Math.min(rows - 1, Math.floor(((r.bottom - cr.top) / cr.height) * rows));
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) marks[y * cols + x] = 1;
  }
  for (let i = 0; i < marks.length; i++) if (marks[i]) covered++;
  const ink = inkL === Infinity ? null : {
    w: Math.round(Math.min(inkR, cr.right) - Math.max(inkL, cr.left)),
    h: Math.round(Math.min(inkB, cr.bottom) - Math.max(inkT, cr.top)),
  };

  return {
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    rootFontSize: getComputedStyle(document.documentElement).fontSize,
    bodyFontSize: getComputedStyle(document.body).fontSize,
    dsFsBase: getComputedStyle(document.documentElement).getPropertyValue("--ds-fs-base").trim() || null,
    landmarks: {
      layout: cs(".layout"),
      sidebar: cs(".sidebar"),
      topbar: cs(".topbar"),
      content: cs(".content"),
      contentHeader: cs(".content-header"),
    },
    fontSizes: {
      count: sizes.length,
      min: sizes[0] ?? 0,
      p10: pct(0.1), median: pct(0.5), p90: pct(0.9),
      max: sizes[sizes.length - 1] ?? 0,
      belowThirteenPx: sizes.filter((s) => s < 13).length,
      belowFifteenPx: sizes.filter((s) => s < 15).length,
    },
    inlineWidths: { fixedPx: fixedPxBoxes, relative: relativeBoxes },
    contentFillPct: Math.round((covered / (rows * cols)) * 100),
    contentInk: ink,
    /** Anteil der Inhaltsbreite/-hoehe, den der gemalte Inhalt ueberhaupt erreicht. Faellt der
     *  Wert bei 3840x2160 deutlich unter den bei 1920x1080, skaliert das Layout NICHT mit. */
    inkFill: ink && cr.width > 0 && cr.height > 0
      ? { w: Math.round((ink.w / cr.width) * 100), h: Math.round((ink.h / cr.height) * 100) }
      : null,
    documentOverflow: {
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      scrollH: document.documentElement.scrollHeight,
      clientH: document.documentElement.clientHeight,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Szenen-Kontext (die kleinen Helfer, die `run(ctx)` bekommt)
// ─────────────────────────────────────────────────────────────────────────────────────────────

function makeCtx(page, baseUrl, fixture) {
  const settle = (ms) => page.waitForTimeout(ms);

  async function clickSel(sel, opts = {}) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) === 0) return false;
    try {
      await loc.scrollIntoViewIfNeeded({ timeout: 2500 });
      await loc.click({ timeout: opts.timeout ?? 5000 });
      return true;
    } catch {
      try { await loc.click({ timeout: 2500, force: true }); return true; } catch { return false; }
    }
  }

  return {
    page,
    settle,
    async toMenu() {
      await page.goto(baseUrl, { waitUntil: "load" });
      await page.waitForSelector(".menu", { timeout: 15000 });
      // IntroSequence: ein Klick überspringt Video/Embers.
      await page.mouse.click(5, 5).catch(() => {});
      await settle(1200);
    },
    async toGame() {
      await page.goto(`${baseUrl}/?fixture=${encodeURIComponent(fixture)}`, { waitUntil: "load" });
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: 20000 });
      await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 15000 });
    },
    async nav(pageId) {
      for (const pre of ["sidebar", "topbar"]) {
        const sel = `[data-guide-id="${pre}.${pageId}"]`;
        if ((await page.locator(sel).count()) > 0) {
          if (await clickSel(sel)) { await settle(450); return true; }
        }
      }
      throw new Error(`nav: Seite "${pageId}" nicht anklickbar`);
    },
    /** Postfach/Optionen liegen in der ausklappbaren Sidebar-Fußleiste. */
    async navFooter(pageId) {
      const sel = `[data-guide-id="sidebar.${pageId}"]`;
      let visible = await page.locator(sel).first().isVisible().catch(() => false);
      if (!visible) {
        await clickSel(".sb-footer-drawer-tab");
        // Auf die aufgeklappte Schublade WARTEN statt blind zu klicken — ein Klick auf den noch
        // unsichtbaren Knopf laeuft sonst erst in einen 5-s-Timeout (gemessen: 12 s je Szene).
        await page.waitForSelector(sel, { state: "visible", timeout: 4000 }).catch(() => {});
        visible = await page.locator(sel).first().isVisible().catch(() => false);
      }
      if (!(await clickSel(sel))) throw new Error(`navFooter: "${pageId}" nicht anklickbar`);
      await settle(450);
      return true;
    },
    clickOpt: (sel) => clickSel(sel),
    async clickNth(sel, n) {
      const loc = page.locator(sel).nth(n);
      if ((await loc.count()) === 0) return false;
      try { await loc.click({ timeout: 5000 }); return true; } catch { return false; }
    },
    async clickLast(sel) {
      const loc = page.locator(sel).last();
      if ((await loc.count()) === 0) return false;
      try { await loc.click({ timeout: 5000 }); return true; } catch { return false; }
    },
    async hoverFirst(sel) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) return false;
      try { await loc.scrollIntoViewIfNeeded({ timeout: 2500 }); await loc.hover({ timeout: 4000 }); return true; } catch { return false; }
    },
    async waitFor(sel, timeout) {
      try { await page.waitForSelector(sel, { state: "visible", timeout: timeout ?? 5000 }); return true; } catch { return false; }
    },
    async scrollIntoView(sel) {
      const loc = page.locator(sel).first();
      if ((await loc.count()) === 0) return false;
      try { await loc.scrollIntoViewIfNeeded({ timeout: 3000 }); return true; } catch { return false; }
    },
    async scrollBottom(sel) {
      return page.evaluate((s) => {
        for (const cand of s.split(",")) {
          const el = document.querySelector(cand.trim());
          if (el && el.scrollHeight > el.clientHeight) { el.scrollTop = el.scrollHeight; return true; }
        }
        return false;
      }, sel);
    },
    /** Erste NICHT gesperrte Zone im Kampf-Grid öffnen. */
    async openFirstZone() {
      const id = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll("[data-bot-zone]"));
        const open = cards.find((c) => !/locked/.test(c.className));
        return open ? open.getAttribute("data-bot-zone") : (cards[0] ? cards[0].getAttribute("data-bot-zone") : null);
      });
      if (!id) return false;
      return clickSel(`[data-bot-zone="${id}"]`);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Stress-Patch — bringt den geladenen Spielstand auf "worst case für lange Zahlen/Namen".
// ─────────────────────────────────────────────────────────────────────────────────────────────

async function applyStressPatch(h) {
  return h.patchContent((dbg) => {
    const s = dbg.state;
    const c = dbg.content;
    // Guides/Touren: alte Fixtures kennen neuere Tour-Keys nicht → alle setzen.
    s.onboarding.active = false;
    s.onboarding.done = true;
    for (const k of ["featureTourV1", "featureTourV2", "featureTourV3", "combat", "shop", "bank", "newhaven", "quests"]) {
      s.onboarding.toursSeen[k] = true;
    }
    // Lange Zahlen: Gold siebenstellig (Idle-Endgame), Slayer-Punkte vierstellig.
    s.character.gold = 1284960;
    s.slayerPoints = 4820;
    s.slayerTasksCompleted = 1207;
    // Alle Erfolge freigeschaltet → die Erfolgsseite rendert ihre vollständige Kartenmenge.
    if (Array.isArray(c.achievements)) s.achievements = c.achievements.map((a) => a.id);
    // Fünfstellige Kill-Zähler über das ganze Bestiarium.
    const mids = Object.keys(c.monsters);
    for (let i = 0; i < mids.length; i++) s.monsterKills[mids[i]] = 1200 + ((i * 977) % 88000);
    // Alle Items entdeckt → Bestiarium/Wiki zeigen echte Namen statt Silhouetten.
    for (const id of Object.keys(c.items)) s.discoveredItems[id] = true;
    // Lager füllen (lange Namen + fünfstellige Mengen nebeneinander).
    const itemIds = Object.keys(c.items);
    for (let i = 0; i < Math.min(140, itemIds.length); i++) s.bank[itemIds[i]] = 12000 + i * 731;
    // Meisterschaft: jede Aktion mit Fortschritt, damit alle Blöcke Zahlen tragen.
    for (const aid of Object.keys(c.actions)) if (!s.mastery[aid]) s.mastery[aid] = { xp: 120000 };
    // Postfach: eine Überlauf-Mail mit vielen Anhängen.
    if (Array.isArray(s.mailbox) && s.mailbox.length === 0) {
      s.mailbox.push({
        kind: "overflow",
        id: "clip_audit_overflow",
        createdSeq: (s.mailSeq = (s.mailSeq || 0) + 1),
        items: itemIds.slice(0, 12).map((id, i) => ({ itemId: id, qty: 1000 + i * 913 })),
        instances: [],
      });
    }
    return {
      gold: s.character.gold,
      achievements: s.achievements.length,
      bank: Object.keys(s.bank).length,
      kills: Object.keys(s.monsterKills).length,
      mail: s.mailbox.length,
      totalLevel: s.character.totalLevel,
    };
  }, { retry: false });
}

/** Falls trotz Patch noch ein Guide-Spotlight steht: wegklicken. */
async function dismissGuides(page) {
  for (let i = 0; i < 6; i++) {
    const active = await page.evaluate(() => document.body.classList.contains("guide-active"));
    if (!active) return true;
    const skip = page.locator(".guide-bubble-skip").first();
    if ((await skip.count()) > 0) await skip.click({ timeout: 3000 }).catch(() => {});
    else await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(400);
  }
  return !(await page.evaluate(() => document.body.classList.contains("guide-active")));
}

/** Overlays, die eine Szene verdecken könnten (Offline-Report, Todes-Popup, Zeremonien). */
async function dismissOverlays(page) {
  await page.evaluate(() => {
    for (const sel of [".offline-stage-close", ".offline-popup .combat-btn", ".death-popup button", ".stalemate-popup button"]) {
      const el = document.querySelector(sel);
      if (el) el.click();
    }
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Auswertung: Schweregrad + Ursachen-Gruppen
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** Wird eine ZAHL beschnitten? Der schlimmste Fall: der Spieler liest einen falschen Wert. */
function detectNumberCut(f) {
  const vis = (f.text || "").replace(/\s+/g, "");
  const full = (f.fullText || "").replace(/\s+/g, "");
  if (!/[0-9]/.test(full)) return false;
  if (vis === full) return false;
  const numsFull = full.match(/[0-9][0-9.,%]*/g) || [];
  const numsVis = vis.match(/[0-9][0-9.,%]*/g) || [];
  if (numsVis.length < numsFull.length) return true;
  for (let i = 0; i < numsVis.length; i++) if (numsVis[i] !== numsFull[i]) return true;
  return false;
}

/**
 * Einzeiler, dem unten ein paar Pixel abgeschnitten werden ("Unterlaengen angeschnitten"), sind
 * kosmetisch — KEIN verlorener Text. Eine ganze Zeile, die unter die Kante rutscht, ist es sehr
 * wohl. Unterschieden wird an der Ueberlauf-Hoehe im Verhaeltnis zur Zeilenhoehe.
 * Nebeneffekt: die Caret-Sonde liefert bei so einem Anschnitt einen zu fruehen Schnittpunkt
 * ("208 /" statt "208 / 208") — der sichtbare Text wird deshalb wieder auf den vollen gesetzt.
 */
function markVerticalShave(f) {
  if (f.axis !== "y") return false;
  const fs = parseFloat(f.css && f.css.fontSize) || 16;
  const lineH = Math.max(1, f.box.h);
  const singleLine = lineH <= fs * 2.2;
  if (!singleLine) return false;
  if (f.overflowPx >= lineH * 0.35) return false; // mehr als ein Drittel weg = echter Verlust
  f.text = f.fullText;
  f.textApprox = false;
  return true;
}

function scoreFinding(f) {
  let score = 0;
  score += Math.min(55, f.overflowPx * 1.1);
  score += f.hiddenRatio * 55;
  if (f.criterion === "viewport-overflow") score += 32;
  else if (f.criterion === "container-overflow") score += 16;
  else if (f.criterion === "js-truncated") score += 10;
  // Eine abgeschnittene ZAHL ist immer schlimmer als ein abgeschnittener Fließtext:
  // der Spieler liest sie FALSCH ("41 240" statt "412 400"), statt sie nur unvollständig zu lesen.
  if (f.numberCut) score += 26;
  else if (/\d/.test(f.fullText)) score += 8;
  if (f.interactive) score += 9;
  // Ein Fließtext, der per line-clamp bewusst auf 2 Zeilen gekürzt wird, ist Design, kein Bug —
  // es sei denn, es fehlt viel.
  if (f.criterion === "line-clamp" && f.hiddenRatio < 0.34) score -= 22;
  if (f.verticalShave) score -= 30;
  if (f.fullTextLen <= 3) score -= 15;
  return Math.round(Math.max(0, score));
}

function severityOf(score) {
  if (score >= 62) return "critical";
  if (score >= 34) return "major";
  return "minor";
}

/** Der Gruppenschlüssel ist das Herz des Berichts: er bündelt Einzelfunde zu EINER Ursache,
 *  damit ein Fix-Agent eine Klasse repariert statt 40 Fundstellen. */
function groupKeyOf(f) {
  const sig = [
    f.css.whiteSpace === "nowrap" ? "nowrap" : "",
    f.css.textOverflow && f.css.textOverflow.indexOf("ellipsis") !== -1 ? "ellipsis" : "",
    f.css.lineClamp ? "clamp" + f.css.lineClamp : "",
    f.css.overflowX === "hidden" || f.css.overflowX === "clip" ? "ovx" : "",
    f.css.overflowY === "hidden" || f.css.overflowY === "clip" ? "ovy" : "",
  ].filter(Boolean).join("+");
  return `${f.component}|${f.criterion}|${f.axis}|${sig}`;
}

function buildGroups(findings) {
  const map = new Map();
  for (const f of findings) {
    const key = groupKeyOf(f);
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        component: f.component,
        criterion: f.criterion,
        axis: f.axis,
        cssSignature: {
          whiteSpace: f.css.whiteSpace, textOverflow: f.css.textOverflow,
          lineClamp: f.css.lineClamp, overflowX: f.css.overflowX, overflowY: f.css.overflowY,
        },
        rules: f.rules,
        count: 0, scenes: new Set(), resolutions: new Set(), locales: new Set(),
        maxScore: 0, maxOverflowPx: 0, worst: null, samples: [],
      };
      map.set(key, g);
    }
    g.count++;
    g.scenes.add(f.scene);
    g.resolutions.add(f.res);
    g.locales.add(f.locale || "en");
    g.maxOverflowPx = Math.max(g.maxOverflowPx, f.overflowPx);
    if (f.score > g.maxScore) { g.maxScore = f.score; g.worst = f; }
    if (g.samples.length < 6) g.samples.push({ scene: f.scene, res: f.res, locale: f.locale || "en", text: f.text, fullText: f.fullText, overflowPx: f.overflowPx });
    if (!g.rules.length && f.rules.length) g.rules = f.rules;
  }
  const groups = [...map.values()].map((g) => ({
    ...g,
    scenes: [...g.scenes].sort(),
    resolutions: [...g.resolutions].sort(),
    locales: [...g.locales].sort(),
    severity: severityOf(g.maxScore),
  }));
  // Sortierung: was viele Stellen betrifft UND schlimm ist, zuerst.
  groups.sort((a, b) => (b.maxScore * Math.log2(b.count + 1)) - (a.maxScore * Math.log2(a.count + 1)));
  groups.forEach((g, i) => { g.id = `G${String(i + 1).padStart(3, "0")}`; });
  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Bericht
// ─────────────────────────────────────────────────────────────────────────────────────────────

/** `.klasse`, `<tag>` oder `.eltern-klasse <tag>` — componentClass markiert reine Tag-Treffer
 *  mit spitzen Klammern, refineComponent haengt bei klassenlosen Elementen den naechsten
 *  klassentragenden Vorfahren davor (sonst waere die Gruppe nur "<span>" und damit wertlos). */
function compLabel(c) {
  if (!c) return "?";
  if (c.startsWith("<")) return c;
  const sp = c.indexOf(" ");
  return sp === -1 ? "." + c : "." + c.slice(0, sp) + c.slice(sp);
}

/** Klassenlose Elemente ueber ihren naechsten klassentragenden Vorfahren benennen. */
function refineComponent(f) {
  if (!f.component || !f.component.startsWith("<")) return f.component;
  const segs = String(f.path || "").split(" > ");
  for (let i = segs.length - 2; i >= 0; i--) {
    const m = /\.([A-Za-z0-9_-]+)/.exec(segs[i]);
    if (m) return `${m[1]} ${f.component}`;
  }
  return f.component;
}

/**
 * Selektor → Quelldatei:Zeile. Nötig, weil Vite im Dev-Modus ALLE @import-ierten Stylesheets zu
 * EINEM <style data-vite-dev-id=".../index.css"> zusammenzieht — die CSSOM kennt die echte
 * Herkunftsdatei einer Regel also nicht mehr. Wir bauen den Index deshalb aus den Quelldateien.
 */
let CSS_SOURCE_INDEX = null;
const SPLIT_LINES = /\r?\n/;
function normSel(sel) {
  return String(sel).replace(/\s*([>+~])\s*/g, "$1").replace(/\s+/g, " ").trim().toLowerCase();
}
function cssSourceIndex() {
  if (CSS_SOURCE_INDEX) return CSS_SOURCE_INDEX;
  const idx = new Map();
  const dir = join(CLIENT_DIR, "src", "renderer", "styles");
  if (!existsSync(dir)) { CSS_SOURCE_INDEX = idx; return idx; }
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".css")) continue;
    const text = readFileSync(join(dir, file), "utf8");
    // Zeichenweiser Scanner statt Zeilen-Heuristik: Kommentare und Deklarationszeilen
    // muessen sauber uebersprungen werden, sonst landen sie im Selektor-Kopf und der
    // Index findet nichts wieder (erster Versuch: 90 % Fehlschlaege).
    let depth = 0;
    let header = "";
    let headerLine = 1;
    let line = 1;
    for (let k = 0; k < text.length; k++) {
      const ch = text[k];
      if (ch === "\n") { line++; continue; }
      if (ch === "/" && text[k + 1] === "*") {
        const end = text.indexOf("*/", k + 2);
        const chunk = end === -1 ? text.slice(k) : text.slice(k, end + 2);
        for (let n = 0; n < chunk.length; n++) if (chunk[n] === "\n") line++;
        k = end === -1 ? text.length : end + 1;
        continue;
      }
      if (ch === "{") {
        const head = header.replace(/\s+/g, " ").trim();
        if (head && head[0] !== "@") {
          for (const part of head.split(",")) {
            const key = normSel(part);
            if (key && !idx.has(key)) idx.set(key, `${file}:${headerLine}`);
          }
        }
        header = "";
        depth++;
        continue;
      }
      if (ch === "}") { header = ""; depth = Math.max(0, depth - 1); continue; }
      if (ch === ";") { header = ""; continue; } // Deklaration im Regelrumpf
      if (!header.trim() && /\S/.test(ch)) headerLine = line;
      header += ch;
    }
  }
  CSS_SOURCE_INDEX = idx;
  return idx;
}

function locateRule(sel) {
  const idx = cssSourceIndex();
  const k = normSel(sel);
  if (idx.has(k)) return idx.get(k);
  for (const part of String(sel).split(",")) {
    const kk = normSel(part);
    if (idx.has(kk)) return idx.get(kk);
  }
  return null;
}

function shortText(s, n = 70) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
}

function buildReport({ findings, groups, scale, sceneScale, meta }) {
  const L = [];
  const bySev = (s) => findings.filter((f) => f.severity === s).length;
  L.push(`# Clip-Audit — abgeschnittene Texte & Skalierung`);
  L.push("");
  L.push(`Lauf: ${meta.startedAt} · Fixture \`${meta.fixture}\` · Stress-Patch ${meta.stress ? "an" : "aus"} · ${meta.scenes} Szenen`);
  L.push("");
  L.push(`**${findings.length} Funde** — ${bySev("critical")} kritisch · ${bySev("major")} deutlich · ${bySev("minor")} gering · **${groups.length} Ursachen-Gruppen**`);
  L.push("");

  // ── Funde je Auflösung (über alle Sprachen) ──
  L.push(`## Funde je Auflösung`);
  L.push("");
  L.push(`| Auflösung | Funde | kritisch | deutlich | gering | Median-Schrift | Inhaltsfläche belegt |`);
  L.push(`|---|---:|---:|---:|---:|---:|---:|`);
  for (const res of meta.resolutions) {
    const fs = findings.filter((f) => f.res === res);
    const sc = scale[`${meta.locales[0]}|${res}`] || scale[res];
    L.push(`| **${res}** | ${fs.length} | ${fs.filter((f) => f.severity === "critical").length} | ${fs.filter((f) => f.severity === "major").length} | ${fs.filter((f) => f.severity === "minor").length} | ${sc ? Math.round(sc.fontSizes.median) + " px" : "–"} | ${sc ? sc.contentFillPct + " %" : "–"} |`);
  }
  L.push("");

  // ── Funde je Sprache × Auflösung ──
  L.push(`## Funde je Sprache × Auflösung`);
  L.push("");
  L.push(`| Sprache | ${meta.resolutions.join(" | ")} | Summe |`);
  L.push(`|---|${meta.resolutions.map(() => "---:").join("|")}|---:|`);
  for (const loc of meta.locales) {
    const cells = meta.resolutions.map((res) => findings.filter((f) => (f.locale || "en") === loc && f.res === res).length);
    L.push(`| **${loc}** | ${cells.join(" | ")} | ${cells.reduce((a, b) => a + b, 0)} |`);
  }
  L.push("");

  // ── Ursachen-Gruppen (der wichtigste Teil) ──
  L.push(`## Ursachen-Gruppen — Arbeitsliste für die Fix-Agenten`);
  L.push("");
  L.push(`Jede Gruppe ist EIN Fix (eine Klasse/eine Regel), nicht n Einzelfälle.`);
  L.push("");
  for (const g of groups) {
    if (g.severity === "minor" && g.count < 3) continue;
    L.push(`### ${g.id} · \`${compLabel(g.component)}\` — ${g.criterion} (${g.axis}-Achse) · ${g.severity} · ${g.count} Stellen`);
    L.push("");
    L.push(`- **Sprachen:** ${g.locales.join(", ")}`);
    L.push(`- **Auflösungen:** ${g.resolutions.join(", ")}`);
    L.push(`- **Seiten:** ${g.scenes.slice(0, 12).join(", ")}${g.scenes.length > 12 ? ` … (+${g.scenes.length - 12})` : ""}`);
    L.push(`- **CSS-Signatur:** \`white-space: ${g.cssSignature.whiteSpace}; text-overflow: ${g.cssSignature.textOverflow}; overflow: ${g.cssSignature.overflowX}/${g.cssSignature.overflowY}${g.cssSignature.lineClamp ? `; -webkit-line-clamp: ${g.cssSignature.lineClamp}` : ""}\``);
    if (g.criterion === "line-clamp") {
      L.push(`- _Hinweis: ein \`-webkit-line-clamp\` ist meist ABSICHT (Fliesstext auf n Zeilen kuerzen). Hier zaehlt nur, ob n zu klein gewaehlt ist._`);
    }
    if (g.rules.length) {
      L.push(`- **Regel-Quelle:**`);
      for (const r of g.rules.slice(0, 3)) {
        const loc = locateRule(r.sel);
        L.push(`  - \`${r.sel}\` → \`${r.decl}\`${loc ? `  _(styles/${loc})_` : r.src ? `  _(${r.src})_` : ""}${r.media ? `  _@media ${r.media}_` : ""}`);
      }
    }
    if (g.worst) {
      L.push(`- **Schlimmste Stelle:** ${g.worst.scene} @ ${g.worst.locale || "en"}/${g.worst.res} — ${g.worst.overflowPx} px verdeckt (${Math.round(g.worst.hiddenRatio * 100)} %)`);
      L.push(`  - sichtbar: \`${shortText(g.worst.text, 80)}\``);
      L.push(`  - vollständig: \`${shortText(g.worst.fullText, 120)}\``);
      L.push(`  - Box: ${g.worst.box.w}×${g.worst.box.h} px, Inhalt ${g.worst.box.scrollW}×${g.worst.box.scrollH} px`);
      L.push(`  - Pfad: \`${g.worst.path}\``);
      if (g.worst.shot) L.push(`  - Screenshot: \`${g.worst.shot}\``);
    }
    L.push("");
  }

  // ── Top-Einzelfunde ──
  const top = [...findings].sort((a, b) => b.score - a.score).slice(0, 15);
  L.push(`## Die 15 schlimmsten Einzelfunde`);
  L.push("");
  L.push(`| # | Seite | Sprache | Auflösung | Element | Kriterium | verdeckt | sichtbar → vollständig | Screenshot |`);
  L.push(`|---:|---|---|---|---|---|---:|---|---|`);
  top.forEach((f, i) => {
    L.push(`| ${i + 1} | ${f.scene} | ${f.locale || "en"} | ${f.res} | \`${compLabel(f.component)}\` | ${f.criterion}/${f.axis} | ${f.overflowPx} px (${Math.round(f.hiddenRatio * 100)} %) | \`${shortText(f.text, 34)}\` → \`${shortText(f.fullText, 46)}\` | ${f.shot ? `\`${f.shot}\`` : "–"} |`);
  });
  L.push("");

  // ── Skalierung ──
  L.push(`## Skalierung`);
  L.push("");
  L.push(`Gemessen in \`${meta.locales[0]}\` (die Schriftgrößen sind sprachunabhängig).`);
  L.push("");
  L.push(`| Auflösung | :root | body | Median | p10 | p90 | < 15 px | Sidebar | Content | Content-Anteil | Doc-Overflow |`);
  L.push(`|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|`);
  for (const res of meta.resolutions) {
    const s = scale[`${meta.locales[0]}|${res}`] || scale[res];
    if (!s) continue;
    const doc = s.documentOverflow;
    const ov = doc.scrollW > doc.clientW + 1 || doc.scrollH > doc.clientH + 1
      ? `${doc.scrollW}×${doc.scrollH} > ${doc.clientW}×${doc.clientH}` : "–";
    const share = s.landmarks.content ? Math.round((s.landmarks.content.w / s.viewport.w) * 100) + " %" : "–";
    L.push(`| ${res} | ${s.rootFontSize} | ${s.bodyFontSize} | ${Math.round(s.fontSizes.median)} px | ${Math.round(s.fontSizes.p10)} px | ${Math.round(s.fontSizes.p90)} px | ${s.fontSizes.belowFifteenPx} | ${s.landmarks.sidebar ? s.landmarks.sidebar.w + " px" : "–"} | ${s.landmarks.content ? s.landmarks.content.w + "×" + s.landmarks.content.h : "–"} | ${share} | ${ov} |`);
  }
  L.push("");

  // ── Skaliert das Layout ueber 3440x1440 hinaus mit? ──
  if (sceneScale && sceneScale.length) {
    const base = meta.resolutions.includes("1920x1080") ? "1920x1080" : meta.resolutions[0];
    const big = meta.resolutions.filter((r) => parseInt(r) > 3440 || (parseInt(r) === 3440 && parseInt(r.split("x")[1]) > 1440));
    const target = big[0] || meta.resolutions[meta.resolutions.length - 1];
    const pick = (res) => {
      const rec = sceneScale.find((x) => x.res === res && x.locale === meta.locales[0]) || sceneScale.find((x) => x.res === res);
      return rec ? rec.scenes : [];
    };
    const a = pick(base);
    const b = pick(target);
    if (a.length && b.length) {
      L.push(`## Skaliert das Layout mit? (${base} → ${target})`);
      L.push("");
      L.push(`\`Fuellgrad\` = Anteil des Inhaltsbereichs, den gemalter Inhalt ueberhaupt erreicht.`);
      L.push(`Faellt er bei der grossen Aufloesung deutlich, bleibt dort Flaeche leer — das Layout waechst nicht mit.`);
      L.push("");
      L.push(`| Seite | Median-Schrift ${base} | Median-Schrift ${target} | Fuellgrad ${base} | Fuellgrad ${target} |`);
      L.push(`|---|---:|---:|---:|---:|`);
      for (const rec of a) {
        const other = b.find((x) => x.scene === rec.scene);
        if (!other) continue;
        L.push(`| ${rec.scene} | ${rec.fontMedian} px | ${other.fontMedian} px | ${rec.inkFillW ?? "-"}×${rec.inkFillH ?? "-"} % | ${other.inkFillW ?? "-"}×${other.inkFillH ?? "-"} % |`);
      }
      L.push("");
    }
  }

  L.push(`## Alle Funde`);
  L.push("");
  L.push(`Vollständig maschinenlesbar in \`findings.json\` (${findings.length} Einträge), Gruppen in \`groups.json\`.`);
  L.push("");
  return L.join("\n");
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Hauptlauf
// ─────────────────────────────────────────────────────────────────────────────────────────────

async function runResolution(h, baseUrl, res, scenes, opts, locale) {
  const { page } = h;
  const outDir = opts.outDir;
  const shotDir = join(outDir, "shots", `${locale}-${res.label}`);
  mkdirSync(shotDir, { recursive: true });

  await page.setViewportSize({ width: res.width, height: res.height });
  await applyLocale(page, baseUrl, locale);

  const ctx = makeCtx(page, baseUrl, opts.fixture);
  const findings = [];
  const sceneNotes = [];
  const scaleByScene = [];
  let scale = null;
  let gameLoaded = false;

  for (const scene of scenes) {
    const t0 = Date.now();
    try {
      if (scene.menu) {
        gameLoaded = false;
      } else {
        if (!gameLoaded) {
          await ctx.toGame();
          if (opts.stress) await applyStressPatch(h);
          await page.waitForTimeout(900);
          await dismissGuides(page);
          await dismissOverlays(page);
          gameLoaded = true;
        }
        await dismissOverlays(page);
      }
      await scene.run(ctx);
      await page.waitForTimeout(opts.settleMs);

      const scan = await page.evaluate(inPageScan, {
        sceneId: scene.id,
        resLabel: res.label,
        locale,
        eps: 1,
        minOverflowPx: opts.minOverflowPx,
        maxFindings: opts.maxFindingsPerScene,
      });
      for (const f of scan.findings) findings.push(f);

      if (!scene.menu) {
        const probe = await page.evaluate(inPageScaleProbe);
        if (!scale) scale = probe;
        scaleByScene.push({
          scene: scene.id,
          fontMedian: Math.round(probe.fontSizes.median),
          fontP10: Math.round(probe.fontSizes.p10),
          belowFifteenPx: probe.fontSizes.belowFifteenPx,
          contentW: probe.landmarks.content ? probe.landmarks.content.w : null,
          contentH: probe.landmarks.content ? probe.landmarks.content.h : null,
          inkFillW: probe.inkFill ? probe.inkFill.w : null,
          inkFillH: probe.inkFill ? probe.inkFill.h : null,
          fillPct: probe.contentFillPct,
        });
      }

      // Übersichts-Screenshot als JPEG (bei 4K wäre PNG ~8 MB je Bild).
      const shotRel = join("shots", `${locale}-${res.label}`, `${scene.id}.jpg`);
      await page.screenshot({ path: join(outDir, shotRel), type: "jpeg", quality: 68 }).catch(() => {});

      sceneNotes.push({ scene: scene.id, ok: true, ms: Date.now() - t0, findings: scan.findings.length, elements: scan.elementsScanned, truncated: scan.truncated });
      process.stdout.write(`  ${res.label} · ${scene.id}: ${scan.findings.length} Funde (${Date.now() - t0} ms)\n`);
    } catch (err) {
      sceneNotes.push({ scene: scene.id, ok: false, ms: Date.now() - t0, error: String(err.message || err) });
      process.stdout.write(`  ${res.label} · ${scene.id}: FEHLER ${err.message}\n`);
      gameLoaded = false; // nach einem Fehler sauber neu laden
    }
  }

  return { res: res.label, locale, findings, scale, scaleByScene, scenes: sceneNotes };
}

/** Sprache umschalten: einmal pro Sprach-Block gesetzt, danach liest JEDE Navigation sie aus
 *  localStorage (deshalb bekommt startHarness `locale: null` — sonst überschreibt sein
 *  addInitScript unsere Wahl bei jedem goto wieder). */
async function applyLocale(page, baseUrl, locale) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  await page.evaluate((l) => {
    try { localStorage.setItem("hearthforge:locale", l); } catch { /* noop */ }
  }, locale);
}

/** Zweiter, kurzer Durchgang: je Ursachen-Gruppe EIN Ausschnitts-Screenshot mit rotem Rahmen. */
async function captureGroupShots(h, baseUrl, scenes, groups, opts) {
  const { page } = h;
  const wanted = [];
  for (const g of groups) {
    if (!g.worst) continue;
    if (g.severity === "minor" && g.count < 3) continue;
    if (wanted.length >= opts.maxShots) break;
    wanted.push(g);
  }
  if (!wanted.length) return;

  // Nach Sprache+Auflösung+Szene bündeln, damit wir nicht ständig neu laden.
  const byRes = new Map();
  for (const g of wanted) {
    const key = `${g.worst.locale || "en"}|${g.worst.res}`;
    if (!byRes.has(key)) byRes.set(key, []);
    byRes.get(key).push(g);
  }

  const sceneById = new Map(scenes.map((s) => [s.id, s]));

  for (const [comboKey, list] of byRes) {
    const [locale, resLabel] = comboKey.split("|");
    const res = parseRes(resLabel);
    await page.setViewportSize({ width: res.width, height: res.height });
    await applyLocale(page, baseUrl, locale);
    const ctx = makeCtx(page, baseUrl, opts.fixture);
    const bySceneMap = new Map();
    for (const g of list) {
      if (!bySceneMap.has(g.worst.scene)) bySceneMap.set(g.worst.scene, []);
      bySceneMap.get(g.worst.scene).push(g);
    }
    let gameLoaded = false;
    for (const [sceneId, gs] of bySceneMap) {
      const scene = sceneById.get(sceneId);
      if (!scene) continue;
      try {
        if (scene.menu) { gameLoaded = false; }
        else if (!gameLoaded) {
          await ctx.toGame();
          if (opts.stress) await applyStressPatch(h);
          await page.waitForTimeout(900);
          await dismissGuides(page);
          await dismissOverlays(page);
          gameLoaded = true;
        }
        await scene.run(ctx);
        await page.waitForTimeout(opts.settleMs);
        for (const g of gs) {
          const rel = join("shots", `${locale}-${resLabel}`, `${g.id}-${sceneId}.png`);
          const box = await page.evaluate((path) => {
            const el = document.querySelector(path);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const mark = document.createElement("div");
            mark.id = "__clip_audit_mark";
            mark.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
              `outline:3px solid #ff2d2d;outline-offset:1px;box-shadow:0 0 0 9999px rgba(0,0,0,0.32);pointer-events:none;z-index:2147483647;`;
            document.body.appendChild(mark);
            return { x: r.left, y: r.top, w: r.width, h: r.height };
          }, g.worst.path).catch(() => null);
          if (!box) continue;
          // Grosszuegiger Rand + Mindestgroesse: ein 20x14-px-Fund ohne Umfeld ist auf dem Bild
          // nicht wiederzuerkennen. Der rote Rahmen zeigt WAS, der Rand zeigt WO.
          const pad = 170;
          const wantW = Math.max(420, Math.round(box.w + pad * 2));
          const wantH = Math.max(300, Math.round(box.h + pad * 2));
          const clip = {
            x: Math.max(0, Math.round(box.x + box.w / 2 - wantW / 2)),
            y: Math.max(0, Math.round(box.y + box.h / 2 - wantH / 2)),
            width: Math.min(res.width, wantW),
            height: Math.min(res.height, wantH),
          };
          clip.width = Math.min(clip.width, res.width - clip.x);
          clip.height = Math.min(clip.height, res.height - clip.y);
          if (clip.width > 4 && clip.height > 4) {
            await page.screenshot({ path: join(opts.outDir, rel), clip }).catch(() => {});
            g.shotPath = rel.replace(/\\/g, "/");
            g.worst.shot = g.shotPath;
          }
          await page.evaluate(() => { const m = document.getElementById("__clip_audit_mark"); if (m) m.remove(); }).catch(() => {});
        }
      } catch (err) {
        process.stdout.write(`  Screenshot-Runde ${resLabel}/${sceneId}: ${err.message}\n`);
        gameLoaded = false;
      }
    }
  }
}

function loadRaw(outDir) {
  const rawDir = join(outDir, "raw");
  if (!existsSync(rawDir)) return [];
  return readdirSync(rawDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(rawDir, f), "utf8")));
}

function assemble(outDir, meta) {
  const raws = loadRaw(outDir);
  const findings = [];
  const scale = {};
  const resSet = new Set();
  const locSet = new Set();
  const sceneScale = [];
  for (const r of raws) {
    const loc = r.locale || "en";
    resSet.add(r.res);
    locSet.add(loc);
    if (r.scale) scale[`${loc}|${r.res}`] = r.scale;
    if (r.scaleByScene) sceneScale.push({ locale: loc, res: r.res, scenes: r.scaleByScene });
    for (const f of r.findings) findings.push(f);
  }
  const resolutions = [...resSet].sort((a, b) => parseInt(a) - parseInt(b) || parseInt(a.split("x")[1]) - parseInt(b.split("x")[1]));
  const locales = [...locSet].sort();
  for (const f of findings) {
    f.component = refineComponent(f);
    f.verticalShave = markVerticalShave(f);
    f.numberCut = detectNumberCut(f);
    f.score = scoreFinding(f);
    f.severity = severityOf(f.score);
  }
  const groups = buildGroups(findings);
  const keyToId = new Map(groups.map((g) => [g.key, g.id]));
  for (const f of findings) f.group = keyToId.get(groupKeyOf(f)) || null;

  const fullMeta = { ...meta, resolutions, locales, scenes: meta.scenes ?? 0 };
  writeFileSync(join(outDir, "findings.json"), JSON.stringify({ meta: fullMeta, findings }, null, 1), "utf8");
  writeFileSync(join(outDir, "groups.json"), JSON.stringify({ meta: fullMeta, groups }, null, 1), "utf8");
  writeFileSync(join(outDir, "scale.json"), JSON.stringify({ meta: fullMeta, scale, perScene: sceneScale }, null, 1), "utf8");
  writeFileSync(join(outDir, "report.md"), buildReport({ findings, groups, scale, sceneScale, meta: fullMeta }), "utf8");
  return { findings, groups, scale, meta: fullMeta };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const allScenes = buildScenes();

  if (args["list-scenes"]) {
    for (const s of allScenes) console.log(`${s.id}\t${s.label}`);
    return;
  }

  const outDir = args.out ? String(args.out) : DEFAULT_OUT;
  mkdirSync(join(outDir, "raw"), { recursive: true });

  if (args["report-only"]) {
    const res = assemble(outDir, {
      startedAt: new Date().toISOString(),
      fixture: args.fixture ? String(args.fixture) : "(aus raw)",
      stress: true,
      scenes: allScenes.length,
    });
    console.log(`REPORT: ${join(outDir, "report.md")} (${res.findings.length} Funde, ${res.groups.length} Gruppen)`);
    return;
  }

  const port = args.port ? Number(args.port) : DEFAULT_PORT;
  const fixture = pickFixture(args.fixture ? String(args.fixture) : null);
  const resolutions = (args.res ? String(args.res).split(",") : DEFAULT_RESOLUTIONS).map(parseRes);
  const locales = String(args.locales || args.locale || DEFAULT_LOCALES.join(","))
    .split(",").map((l) => l.trim()).filter(Boolean);
  const sceneFilter = args.scenes ? new Set(String(args.scenes).split(",").map((s) => s.trim())) : null;
  const scenes = sceneFilter ? allScenes.filter((s) => sceneFilter.has(s.id)) : allScenes;
  const opts = {
    outDir,
    fixture,
    stress: args.stress !== "false" && args.stress !== false,
    settleMs: args["settle-ms"] ? Number(args["settle-ms"]) : 500,
    minOverflowPx: args["min-px"] ? Number(args["min-px"]) : 2,
    maxFindingsPerScene: args["max-per-scene"] ? Number(args["max-per-scene"]) : 900,
    maxShots: args["max-shots"] ? Number(args["max-shots"]) : 90,
  };

  const startedAt = new Date().toISOString();
  console.log(`clip-audit: Fixture "${fixture}", Port ${port}, ${scenes.length} Szenen, Sprachen ${locales.join(", ")}, Auflösungen ${resolutions.map((r) => r.label).join(", ")}`);
  console.log(`Ausgabe: ${outDir}`);

  const h = await startHarness({
    port,
    fixture,
    // Zwei belegte Slots (langer Charaktername + vierstelliges Total Lv) und einer frei: so hat
    // das "Spielstand laden"-Panel echte Karten zu zeigen, und "Neues Spiel" findet trotzdem
    // einen leeren Slot fuer die Charaktererstellung.
    slotSaves: { 0: fixture, 1: fixture },
    viewport: resolutions[0],
    locale: null, // die Sprache schalten wir selbst um (applyLocale) — sonst überschreibt
                  // startHarness' addInitScript unsere Wahl bei jeder Navigation wieder.
    outDir: join(outDir, "shots"),
    settleMs: 2500,
  });
  const baseUrl = `http://localhost:${port}`;

  try {
    // `--skip-run`: die Messung ist schon gelaufen (z.B. drei parallele Prozesse, je eine Sprache,
    // deren `raw/*.json` in DIESEN Ordner kopiert wurden) — nur noch Belege schiessen + berichten.
    for (const locale of args["skip-run"] ? [] : locales) {
      for (const res of resolutions) {
        console.log(`\n── ${locale} · ${res.label} ──`);
        const raw = await runResolution(h, baseUrl, res, scenes, opts, locale);
        writeFileSync(join(outDir, "raw", `${locale}-${res.label}.json`), JSON.stringify(raw, null, 1), "utf8");
      }
    }

    // Gruppen bilden, dann gezielt je Gruppe einen Beleg-Ausschnitt schießen.
    let assembled = assemble(outDir, { startedAt, fixture, stress: opts.stress, scenes: scenes.length });
    if (!args["no-shots"]) {
      console.log(`\n── Beleg-Screenshots je Ursachen-Gruppe ──`);
      await captureGroupShots(h, baseUrl, scenes, assembled.groups, opts);
      // Screenshot-Pfade in die Rohdaten zurückschreiben, damit `--report-only` sie behält.
      const shotByPath = new Map();
      for (const g of assembled.groups) if (g.shotPath && g.worst) shotByPath.set(g.worst.res + "|" + g.worst.path + "|" + g.worst.criterion + "|" + g.worst.axis, g.shotPath);
      for (const file of readdirSync(join(outDir, "raw"))) {
        const p = join(outDir, "raw", file);
        const raw = JSON.parse(readFileSync(p, "utf8"));
        let touched = false;
        for (const f of raw.findings) {
          const s = shotByPath.get(f.res + "|" + f.path + "|" + f.criterion + "|" + f.axis);
          if (s) { f.shot = s; touched = true; }
        }
        if (touched) writeFileSync(p, JSON.stringify(raw, null, 1), "utf8");
      }
      assembled = assemble(outDir, { startedAt, fixture, stress: opts.stress, scenes: scenes.length });
    }

    console.log(`\nFERTIG — ${assembled.findings.length} Funde, ${assembled.groups.length} Ursachen-Gruppen`);
    console.log(`REPORT: ${join(outDir, "report.md")}`);
    if (h.errors.length) {
      console.log(`\nBrowser-Konsolenfehler (${h.errors.length}, informativ):`);
      for (const e of h.errors.slice(0, 12)) console.log("  " + e.slice(0, 200));
    }
  } finally {
    await h.stop();
  }
}

main().catch((err) => {
  console.error("clip-audit FEHLGESCHLAGEN:", err);
  process.exit(1);
});
