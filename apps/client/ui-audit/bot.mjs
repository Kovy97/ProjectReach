#!/usr/bin/env node
/**
 * bot.mjs — Task #351 "Spieler-Bot-Toolkit": ONE command a WEAK model (Opus-class) can drive
 * reliably to steer the real renderer, without needing to know Playwright, ports, GPU flags,
 * fixture loading, `window.__hfDebug`, or any of `sim-harness.mjs`'s "7 lessons" (see
 * SIM-AGENT-GUIDE.md). Everything is declarative — a flat list of `verb:arg` strings in, a
 * machine-readable `result.json` out.
 *
 *   node ui-audit/bot.mjs --fixture midgame --actions actions.json --out result.json
 *   node ui-audit/bot.mjs --fixture midgame --do "goto:combat; zone:pastures; fight-now:chicken; wait:combat-active; shot:kampf.png; state:combat"
 *
 * **Read `BOT-GUIDE.md` first if you're driving this tool — this header is for whoever
 * maintains bot.mjs itself.**
 *
 * ── Architecture (what's encapsulated so the caller never has to think about it) ──────────────
 *
 * - Dev-server lifecycle, GPU-safe headless Chromium launch, fixture loading, cold-start settle,
 *   locale pinning: all delegated to `sim-harness.mjs`'s `startHarness()` — the same, already-
 *   battle-tested infra every other ui-audit script uses. This file adds NO parallel bootstrap.
 * - **Idempotent port reuse, for free:** `startHarness`'s `waitForServer()` polls the HTTP
 *   endpoint, not "did MY child process bind it" — so if a previous bot.mjs run's vite server is
 *   still alive on the same port (crashed without cleanup, or a still-running parallel call), THIS
 *   run's own `vite --strictPort` child fails to bind and exits immediately, but `waitForServer`
 *   still sees the OLD server answering and happily proceeds against it. No explicit lock/reuse
 *   code needed — don't "fix" this into something more complex. For genuinely concurrent bot
 *   sessions (parallel testers), each MUST still pass its own `--port` (reserved range below) —
 *   the shared-port trick only works for sequential reuse/crash-recovery, not two live sessions at
 *   once (the one that exits first would kill the server the other is still using).
 * - **The `document.hidden`/rAF-freeze trap:** `GameContext.tsx`'s entire tick loop runs on
 *   `requestAnimationFrame` (not `setInterval`) — a backgrounded page's rAF is throttled/paused by
 *   Chromium, so combat/skills/everything silently freezes. This only bites when a script opens a
 *   SECOND page in the same browser (the non-active one gets backgrounded). bot.mjs therefore
 *   NEVER opens a second page, and calls `page.bringToFront()` before every action as cheap
 *   insurance. Do not add multi-page support without re-reading this paragraph.
 * - Every action is looked up against `data-guide-id` (existing sidebar/topbar nav markers),
 *   `#monstercard-<id>` (already existed before this task), or the two NEW additive
 *   `data-bot-zone`/`data-bot-fight-now` attributes on CombatPage.tsx zone-cards / the fight-now
 *   button (no stable selector existed there before — see that file's Task #351 comments).
 *
 * ── Port registry ───────────────────────────────────────────────────────────────────────────────
 * Reserved range **5340–5359** for bot.mjs (see SIM-AGENT-GUIDE.md's port table) — default 5340
 * for solo/sequential use; pick another free one in-range per PARALLEL bot session.
 *
 * ── Output ──────────────────────────────────────────────────────────────────────────────────────
 * Everything a run produces lands next to `result.json` (its directory = the "run folder"):
 * default `ui-audit/bot-runs/<timestamp>-<pid>/result.json` + screenshots alongside it, or
 * wherever `--out <path>` points. Exit code 0 iff every action reported `ok:true`. The caller
 * should read ONLY `result.json` — never parse stdout/stderr (see BOT-GUIDE.md's hard rules).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startHarness } from "./sim-harness.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 5340;
const RETRY_DELAY_MS = 500;

/** Carries a player-facing `hint` (remedy) alongside the raw error message — shown verbatim in
 *  result.json so a weak model never has to guess what to try next. */
class ActionError extends Error {
  constructor(message, hint) {
    super(message);
    this.hint = hint ?? null;
  }
}

// ── CLI parsing ────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith("--")) continue;
    const key = tok.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function parseViewport(spec) {
  if (!spec) return undefined;
  const m = /^(\d+)x(\d+)$/.exec(spec.trim());
  if (!m) throw new Error(`--viewport muss "BREITExHOEHE" sein (z.B. 1920x1080), bekam "${spec}"`);
  return { width: Number(m[1]), height: Number(m[2]) };
}

function defaultOutPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return join(__dirname, "bot-runs", `${stamp}-${process.pid}`, "result.json");
}

/** Normalizes `--actions <file.json>` (array of "verb:arg" strings, OR array of {type,arg}
 *  objects — both accepted so a weak model can emit whichever it finds easier) and/or
 *  `--do "a; b; c"` into one flat array of "verb:arg" strings. Exactly one of the two must be
 *  given — mixing silently is a foot-gun (unclear ordering), so this errors instead. */
function loadActionList(args) {
  const hasActions = !!args.actions;
  const hasDo = !!args.do;
  if (hasActions === hasDo) {
    throw new Error(
      "Gib GENAU EINEN von --actions <datei.json> ODER --do \"a; b; c\" an, nicht beide/keins.",
    );
  }
  if (hasDo) {
    return args.do
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  const path = resolve(args.actions);
  if (!existsSync(path)) throw new Error(`--actions Datei nicht gefunden: ${path}`);
  let raw;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`--actions Datei ist kein gültiges JSON (${path}): ${err.message}`);
  }
  if (!Array.isArray(raw)) throw new Error(`--actions Datei muss ein JSON-Array sein (${path}).`);
  return raw.map((entry) => {
    if (typeof entry === "string") return entry.trim();
    if (entry && typeof entry === "object" && typeof entry.type === "string") {
      return entry.arg !== undefined ? `${entry.type}:${entry.arg}` : `${entry.type}:`;
    }
    throw new Error(`--actions Eintrag weder ein String noch {type,arg}: ${JSON.stringify(entry)}`);
  });
}

// ── small selector-escaping helper (ids are simple slugs, but don't trust that blindly) ─────────
function q(val) {
  return String(val).replace(/"/g, '\\"');
}

// ── curated window.__hfDebug reads (NEVER the whole state — see BOT-GUIDE.md) ──────────────────

async function readCuratedState(page, kind) {
  return page.evaluate((kind) => {
    const dbg = window.__hfDebug;
    if (!dbg) throw new Error("__hfDebug ist nicht gesetzt — kein aktiver Spielstand.");
    const { state } = dbg;
    switch (kind) {
      case "combat": {
        const c = state.combat;
        return {
          monsterId: c.monsterId,
          enemyHp: c.enemyHp,
          playerHp: state.character.hp,
          kills: c.kills,
          dungeonId: c.dungeonId,
          paragonFloor: c.paragonFloor ?? null,
          eliteVariantId: c.eliteVariantId ?? null,
          stopReason: c.stopReason ?? null,
        };
      }
      case "queue": {
        const q = state.actionQueue ?? [];
        return {
          length: q.length,
          entries: q.slice(0, 20).map((e) => ({
            kind: e.kind,
            actionId: e.actionId,
            monsterId: e.monsterId ?? null,
            target: e.target ?? null,
          })),
        };
      }
      case "inventory-count": {
        const used = state.inventory.slots.filter((s) => s !== null).length;
        return {
          slotsUsed: used,
          slotsTotal: state.inventory.baseCapacity,
          instances: state.inventory.instances.length,
        };
      }
      case "level":
        return { totalLevel: state.character.totalLevel };
      case "gold":
        return { gold: state.character.gold };
      default:
        throw new Error(
          `Unbekannter state-Pfad "${kind}" — erlaubt: combat, queue, inventory-count, level, gold.`,
        );
    }
  }, kind);
}

async function evalAssertExpr(page, expr) {
  return page.evaluate((expr) => {
    const dbg = window.__hfDebug;
    if (!dbg) throw new Error("__hfDebug ist nicht gesetzt — kein aktiver Spielstand.");
    const { state, content } = dbg;
    // eslint-disable-next-line no-new-func -- expr kommt vom Bot-Aufrufer, läuft NUR im
    // dev-only Playwright-Tab, gleiches Vertrauensmodell wie sim-harness.mjs' evalDebug.
    const fn = new Function("state", "content", `return (${expr});`);
    return fn(state, content);
  }, expr);
}

// ── action handlers ──────────────────────────────────────────────────────────────────────────

async function actGoto(page, pageId) {
  const sidebarSel = `[data-guide-id="sidebar.${pageId}"]`;
  const topbarSel = `[data-guide-id="topbar.${pageId}"]`;
  let sel = null;
  if ((await page.locator(sidebarSel).count()) > 0) sel = sidebarSel;
  else if ((await page.locator(topbarSel).count()) > 0) sel = topbarSel;
  if (!sel) {
    throw new ActionError(
      `Keine Sidebar-/TopBar-Seite mit id "${pageId}" gefunden.`,
      `Gültige IDs stehen in navigation.ts (NavPage.id) — u.a. character, combat, skills-overview, ` +
        `mastery, bestiary, achievements, quests, bank, shop, options, stats, companions, enchanting, ` +
        `mail, oder ein Skill-Id wie mining/smithing/cooking/woodcutting/fishing/farming/foraging/` +
        `thieving/leatherworking/jewelcrafting/runecrafting/herblore/slayer.`,
    );
  }
  await page.locator(sel).first().click({ timeout: 6000 });
  await page
    .waitForFunction((s) => document.querySelector(s)?.classList.contains("active"), sel, { timeout: 5000 })
    .catch(() => {
      throw new ActionError(
        `Klick auf "${pageId}" hat die Seite nicht als aktiv markiert.`,
        `Ist "${pageId}" evtl. gesperrt/nicht sichtbar (z.B. Onboarding aktiv)? Mit shot: einen Screenshot machen.`,
      );
    });
  await page.waitForTimeout(150); // kurzer Settle für den ersten Render der Ziel-Seite
  return { note: `navigiert zu "${pageId}"` };
}

async function actZone(page, zoneId) {
  const sel = `[data-bot-zone="${q(zoneId)}"]`;
  if ((await page.locator(sel).count()) === 0) {
    // Evtl. mitten in einer Zonen-Detailansicht — zurück zum Grid, dann erneut versuchen.
    const backBtn = page.locator(".zone-back").first();
    if ((await backBtn.count()) > 0) await backBtn.click({ timeout: 4000 }).catch(() => {});
  }
  const locator = page.locator(sel).first();
  if ((await locator.count()) === 0) {
    throw new ActionError(
      `Keine Zonen-Karte mit id "${zoneId}" gefunden.`,
      `Erst goto:combat aufrufen? Zone evtl. per Story-Fortschritt gesperrt (storyLocked) — ein ` +
        `Fixture mit mehr Fortschritt nötig (z.B. "midgame" statt keins, oder "endgame"). Zone-ids ` +
        `stehen im Content-Katalog (packages/content, ZoneDef.id).`,
    );
  }
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 6000 });
  await page.waitForTimeout(150);
  return { note: `Zone "${zoneId}" geöffnet` };
}

async function actCard(page, monsterId) {
  const sel = `#monstercard-${q(monsterId)}`;
  const locator = page.locator(sel).first();
  if ((await locator.count()) === 0) {
    throw new ActionError(
      `Keine Monster-Karte mit id "${monsterId}" gefunden.`,
      `Ist die richtige Zone offen (zone:<zoneId> zuerst, die dieses Monster enthält)? Monster-ids ` +
        `stehen im Content-Katalog (packages/content, MonsterDef.id).`,
    );
  }
  await locator.scrollIntoViewIfNeeded();
  return { note: `Monster-Karte "${monsterId}" sichtbar` };
}

async function actFightNow(page, monsterId) {
  const sel = `[data-bot-fight-now="${q(monsterId)}"]`;
  const locator = page.locator(sel).first();
  if ((await locator.count()) === 0) {
    throw new ActionError(
      `Kein Sofort-Kämpfen-Button für "${monsterId}" gefunden.`,
      `Erst card:${monsterId} (oder die passende zone:<zoneId>) aufrufen — der Button lebt auf der ` +
        `Monster-Karte, die nur sichtbar ist, wenn die Zone offen ist.`,
    );
  }
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 6000 });
  return { note: `Sofort-Kampf gegen "${monsterId}" gestartet` };
}

async function actQueue(page, argRaw) {
  const m = /^(.+)x(\d+)$/.exec(argRaw);
  if (!m) {
    throw new ActionError(
      `queue-Argument "${argRaw}" hat nicht die Form <monsterId>x<n>.`,
      `Beispiel: "queue:chickenx25" (kein Leerzeichen vor/nach dem "x").`,
    );
  }
  const monsterId = m[1];
  const n = Number(m[2]);
  const scope = page.locator(`#monstercard-${q(monsterId)} .mc-queue-actions`).first();
  if ((await scope.count()) === 0) {
    throw new ActionError(
      `Kein Mengen-Grid für "${monsterId}" gefunden.`,
      `Erst card:${monsterId} sicherstellen (richtige Zone offen?).`,
    );
  }
  const presetBtn = scope.getByRole("button", { name: `${n}×`, exact: true });
  if ((await presetBtn.count()) > 0) {
    await presetBtn.first().click({ timeout: 6000 });
  } else {
    const input = scope.locator(".qty-picker-input").first();
    if ((await input.count()) === 0) {
      throw new ActionError(
        `Kein Mengen-Eingabefeld für "${monsterId}" gefunden.`,
        `mc-queue-actions/qty-picker-Markup hat sich evtl. geändert — an ui-dev melden.`,
      );
    }
    await input.fill(String(n));
    await scope.locator(".qty-picker-confirm").first().click({ timeout: 6000 });
  }
  return { note: `${n}× "${monsterId}" eingereiht` };
}

async function actClick(page, arg) {
  const locator = arg.startsWith("text=") ? page.getByText(arg.slice(5), { exact: false }).first() : page.locator(arg).first();
  if ((await locator.count()) === 0) {
    throw new ActionError(
      `Kein Element für click "${arg}" gefunden.`,
      `CSS-Selektor prüfen (z.B. per shot: einen Screenshot machen und im Bild nachsehen), oder ` +
        `"text=<sichtbarer Text>" statt eines CSS-Selektors verwenden.`,
    );
  }
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 6000 });
  return { note: `click "${arg}"` };
}

async function actType(page, arg) {
  const eq = arg.indexOf("=");
  if (eq === -1) {
    throw new ActionError(
      `type-Argument "${arg}" hat nicht die Form <css>=<text>.`,
      `Beispiel: "type:.qty-picker-input=25"`,
    );
  }
  const css = arg.slice(0, eq);
  const text = arg.slice(eq + 1);
  const locator = page.locator(css).first();
  if ((await locator.count()) === 0) {
    throw new ActionError(`Kein Eingabefeld für "${css}" gefunden.`, `CSS-Selektor prüfen.`);
  }
  await locator.fill(text);
  return { note: `type "${text}" in "${css}"` };
}

async function actWait(page, argRaw) {
  const at = argRaw.lastIndexOf("@");
  let kind = argRaw;
  let timeout = null;
  if (at !== -1 && /^\d+$/.test(argRaw.slice(at + 1))) {
    kind = argRaw.slice(0, at);
    timeout = Number(argRaw.slice(at + 1));
  }
  try {
    if (kind === "combat-active") {
      await page.waitForFunction(() => window.__hfDebug?.state?.combat?.monsterId != null, null, {
        timeout: timeout ?? 15000,
      });
      return { note: "Kampf aktiv" };
    }
    if (kind === "combat-idle") {
      await page.waitForFunction(() => window.__hfDebug?.state?.combat?.monsterId == null, null, {
        timeout: timeout ?? 15000,
      });
      return { note: "kein Kampf aktiv" };
    }
    if (kind === "page-loaded") {
      await page.waitForSelector('[data-guide-id^="sidebar."]', { timeout: timeout ?? 15000 });
      return { note: "Hauptlayout geladen" };
    }
    if (kind === "toast") {
      await page.waitForSelector(".toast-stack .toast", { timeout: timeout ?? 6000 });
      return { note: "Toast sichtbar" };
    }
    if (kind.startsWith("selector=")) {
      const sel = kind.slice("selector=".length);
      await page.waitForSelector(sel, { state: "visible", timeout: timeout ?? 8000 });
      return { note: `Selektor "${sel}" sichtbar` };
    }
  } catch {
    throw new ActionError(
      `wait:${argRaw} lief in den Timeout (${timeout ?? "Default"}ms).`,
      waitHint(kind),
    );
  }
  throw new ActionError(
    `Unbekannter wait-Typ "${kind}".`,
    `Erlaubt: combat-active, combat-idle, page-loaded, toast, selector=<css> (optional @<timeoutMs>-Suffix, z.B. wait:combat-active@20000).`,
  );
}

function waitHint(kind) {
  if (kind === "combat-active") return `Wurde fight-now:<monsterId> oder queue:<monsterId>x<n> vorher aufgerufen? state:combat prüfen.`;
  if (kind === "combat-idle") return `Läuft eine ∞-Queue weiter? state:queue prüfen.`;
  if (kind === "page-loaded") return `Steckt die App noch im Hauptmenü/Onboarding fest? shot: einen Screenshot machen.`;
  if (kind === "toast") return `Toasts verschwinden nach ~4s wieder — evtl. schon abgelaufen, oder das erwartete Ereignis ist gar nicht eingetreten.`;
  if (kind.startsWith("selector=")) return `CSS-Selektor prüfen (per shot: einen Screenshot machen und im Bild nachsehen).`;
  return null;
}

async function actAssert(page, expr) {
  let result;
  try {
    result = await evalAssertExpr(page, expr);
  } catch (err) {
    throw new ActionError(`assert-Ausdruck ist ungültig: ${expr}`, err.message);
  }
  if (!result) {
    throw new ActionError(
      `assert fehlgeschlagen: ${expr}`,
      `Ausdruck war falsy (${JSON.stringify(result)}). Mit state:<pfad> (combat/queue/inventory-count/level/gold) den echten Wert prüfen.`,
    );
  }
  return { note: `assert ok: ${expr}` };
}

async function performAction(h, rawAction) {
  const idx = rawAction.indexOf(":");
  if (idx === -1) {
    throw new ActionError(`Aktion ohne "verb:arg"-Form: "${rawAction}"`, `Format ist immer verb:arg, z.B. "goto:combat".`);
  }
  const verb = rawAction.slice(0, idx).trim();
  const arg = rawAction.slice(idx + 1).trim();
  const { page } = h;

  // Vor JEDER Aktion in den Vordergrund holen — billige Versicherung gegen die document.hidden/
  // rAF-Freeze-Falle (s. Modul-Header). Ein No-op im normalen Ein-Seiten-Fall.
  await page.bringToFront();

  switch (verb) {
    case "goto":
      return actGoto(page, arg);
    case "zone":
      return actZone(page, arg);
    case "card":
      return actCard(page, arg);
    case "fight-now":
      return actFightNow(page, arg);
    case "queue":
      return actQueue(page, arg);
    case "click":
      return actClick(page, arg);
    case "type":
      return actType(page, arg);
    case "wait":
      return actWait(page, arg);
    case "shot":
      return { file: await h.shot(arg) };
    case "state":
      return { data: await readCuratedState(page, arg) };
    case "assert":
      return actAssert(page, arg);
    default:
      throw new ActionError(
        `Unbekanntes Verb "${verb}" in "${rawAction}".`,
        `Erlaubtes Vokabular: goto, zone, card, fight-now, queue, click, type, wait, shot, state, assert.`,
      );
  }
}

async function runActions(h, actionList) {
  const results = [];
  for (const raw of actionList) {
    const startedAt = Date.now();
    let attempt = 0;
    let lastErr = null;
    let outcome = null;
    while (attempt < 2 && !outcome) {
      attempt++;
      try {
        const data = await performAction(h, raw);
        outcome = { action: raw, ok: true, ms: Date.now() - startedAt, ...(data ?? {}) };
        if (attempt > 1) outcome.retried = true;
      } catch (err) {
        lastErr = err;
        if (attempt < 2) await h.page.waitForTimeout(RETRY_DELAY_MS);
      }
    }
    if (!outcome) {
      outcome = {
        action: raw,
        ok: false,
        ms: Date.now() - startedAt,
        error: lastErr?.message ?? String(lastErr),
        hint: lastErr?.hint ?? null,
        retried: true,
      };
    }
    results.push(outcome);
    if (!outcome.ok) break; // Folgeaktionen bauen typischerweise auf dieser auf — fail fast.
  }
  return results;
}

function bootstrapHint(err) {
  const msg = err?.message ?? "";
  if (msg.includes("did not come up")) {
    return `Port evtl. von einem hängenden Fremd-Prozess belegt, der NICHT bot.mjs/sim-harness ist ` +
      `(bot.mjs' eigener Port-Reuse-Mechanismus setzt denselben vite-Config voraus, s. Modul-Header) ` +
      `— anderen --port aus dem reservierten Bereich 5340-5359 probieren.`;
  }
  if (msg.includes("browser") || msg.includes("Executable doesn't exist")) {
    return `Playwright-Chromium fehlt evtl. — einmalig: pnpm --filter @hearthforge/client exec playwright install chromium`;
  }
  return null;
}

// ── entry point ──────────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fixture = args.fixture && args.fixture !== "none" ? args.fixture : null;
  const port = args.port ? Number(args.port) : DEFAULT_PORT;
  const outPath = resolve(args.out ?? defaultOutPath());
  const runDir = dirname(outPath);
  mkdirSync(runDir, { recursive: true });

  const startedAt = Date.now();
  const payload = {
    ok: false,
    fixture,
    port,
    startedAt: new Date().toISOString(),
    actions: [],
    pageErrors: [],
    summary: null,
    durationMs: 0,
  };

  let actionList;
  try {
    actionList = loadActionList(args);
  } catch (err) {
    payload.actions.push({ action: "<parse>", ok: false, ms: 0, error: err.message, hint: null });
    finish(payload, outPath, startedAt);
    return;
  }

  let h = null;
  try {
    h = await startHarness({
      port,
      fixture,
      viewport: parseViewport(args.viewport),
      locale: args.locale ?? "en",
      outDir: runDir,
    });
    await h.page.bringToFront();
    payload.actions = await runActions(h, actionList);
    payload.pageErrors = h.errors.slice();
  } catch (err) {
    payload.actions.push({
      action: "<bootstrap>",
      ok: false,
      ms: Date.now() - startedAt,
      error: err.message,
      hint: bootstrapHint(err),
    });
  } finally {
    if (h) await h.stop();
  }

  finish(payload, outPath, startedAt);
}

function finish(payload, outPath, startedAt) {
  const okCount = payload.actions.filter((a) => a.ok).length;
  payload.summary = { total: payload.actions.length, ok: okCount, failed: payload.actions.length - okCount };
  payload.ok = payload.summary.failed === 0 && payload.actions.length > 0;
  payload.durationMs = Date.now() - startedAt;

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`RESULT: ${outPath}`);
  console.log(payload.ok ? "OK" : "FAILED");
  process.exit(payload.ok ? 0 : 1);
}

main().catch((err) => {
  // Letzter Auffang-Fallschirm: darf NIE passieren (main() fängt alles selbst ab und schreibt
  // immer result.json), aber falls doch — wenigstens eine klare Meldung statt eines nackten Stack-
  // Traces, exit 1.
  console.error("bot.mjs: unerwarteter Fehler außerhalb des normalen Fehlerpfads:", err);
  process.exit(1);
});
