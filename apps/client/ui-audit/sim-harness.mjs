#!/usr/bin/env node
/**
 * sim-harness.mjs — shared Playwright test-harness infrastructure for sim/tester agents.
 *
 * Every sweep/tester script under ui-audit/ used to hand-roll the same ~40 lines of "spawn vite,
 * wait for it, open a browser, wire error collectors, load a fixture, wait for it to settle"
 * boilerplate — and kept re-discovering the same handful of traps along the way. This module
 * packages the ESTABLISHED, working patterns (mined from story-tab-check.mjs, dungeon-gate-
 * check.mjs, menu-slots-shot.mjs, npc-greeting-check.mjs, vite.t3.config.mjs) behind one small API
 * so the next agent doesn't have to rediscover them. See SIM-AGENT-GUIDE.md for the full write-up
 * of each lesson below; the short version:
 *
 *   1. vite-HMR-Falle    — HMR defaults OFF here (see sim-harness.vite.config.mjs header).
 *   2. Cold-start race   — app-ready wait is __hfDebug-exists (fast) THEN networkidle (slow,
 *                          catches React.StrictMode's dev double-mount) THEN a settle timeout.
 *   3. Port collisions   — every caller MUST pass its own `port`; register it in
 *                          SIM-AGENT-GUIDE.md's port table. This module does not allocate ports
 *                          for you (agents run concurrently across separate processes — a runtime
 *                          allocator here can't see what a sibling agent already grabbed).
 *   4. Fixture injection — two supported paths, both exposed: `fixture` (?fixture=<name> query
 *                          patch, the "jump straight into a prepared GameState" route) and
 *                          `slotSaves` (localStorage `hearthforge:save:<slot>` injection via
 *                          addInitScript, the "make the Load/New menu show occupied slots" route).
 *   5. __hfDebug scope   — it's attached in ALL THREE state-creation paths (fixture/new/load) as
 *                          of Fix-Welle M, not just the fixture path — `waitForDebugHook()` works
 *                          after any of them, not only after `startHarness({ fixture })`.
 *   6. MODULE_NOT_FOUND  — every path here is resolved from `import.meta.url`, never
 *                          `process.cwd()`, so this module works regardless of the caller's shell
 *                          cwd. `SIM_OUT_DIR` env var overrides the screenshot output directory
 *                          (falls back to `ui-audit/shots/`) instead of a hardcoded scratchpad path.
 *   7. Server cleanup    — `stop()` / `withHarness()` ALWAYS kill the vite child + close the
 *                          browser, even on error (try/finally internally) — no zombie processes.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * API
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 * startHarness(opts) → Promise<Harness>
 *   opts:
 *     port            (required) number. Own port per agent — see SIM-AGENT-GUIDE.md registry.
 *     viewport        {width,height} — default 1920×1080.
 *     fixture         "midgame" | "endgame" | <any name in ui-audit/fixtures/*.json> | null
 *                     (default null). Navigates straight to `?fixture=<name>` and waits for the
 *                     sidebar + __hfDebug to be ready — see "Cold-start race" above.
 *     slotSaves       { [slotIndex]: "midgame" | "endgame" | <raw save JSON string>, ... } | null.
 *                     Injected as `localStorage["hearthforge:save:<slot>"]` BEFORE first
 *                     navigation (addInitScript, so it's present on the very first paint — the
 *                     menu-slots-shot.mjs pattern). Combine with `fixture: null` to test the
 *                     Load/New menu panels with occupied slots.
 *     hmr             boolean — default false. true re-enables vite HMR (rarely what you want —
 *                     see lesson 1).
 *     locale          "en" | "de" | null — default "en". Pins `localStorage["hearthforge:locale"]`
 *                     before first navigation so string assertions are deterministic regardless
 *                     of the browser's/OS's default. Pass null to leave it untouched.
 *     requireDebugHook boolean — default `!!fixture`. Waits for `window.__hfDebug` to exist before
 *                     returning. Set true even without `fixture` if your script loads/creates a
 *                     game itself after `startHarness()` returns and you'll call
 *                     `waitForDebugHook()` manually at that point instead.
 *     settleMs        number — default 2000. Extra wait AFTER `networkidle`, before returning
 *                     control — absorbs the dev-mode StrictMode double-mount race (lesson 2).
 *     outDir          string — default `process.env.SIM_OUT_DIR || ui-audit/shots/`.
 *     serverTimeoutMs number — default 40000. How long to wait for the vite dev server to answer.
 *
 *   Resolves to a Harness:
 *     { page, browser, errors, shot, patchContent, setState, clickRetry, waitForDebugHook,
 *       getServerOutput, stop }
 *
 *     page / browser  — the live Playwright objects, for anything this API doesn't cover.
 *     errors           — array, growing live. Populated from `page.on("pageerror")` and
 *                        `page.on("console", type === "error")`. Check `.length` at the end of a
 *                        script the same way every existing check script does.
 *     shot(name, opts) — screenshots to `<outDir>/<name>.png` (`.png` optional in `name`).
 *                        `opts.fullPage` default false. Logs "SHOT SAVED: <file>" (existing
 *                        scripts grep this). Returns the absolute file path.
 *     patchContent(fn, opts) — runs `fn(dbg)` in the PAGE (dbg = `window.__hfDebug`, i.e.
 *                        `{ state, content }`) via a serialize-and-reconstruct bridge — `fn` must
 *                        be a plain function with no closure over outer Node variables (same
 *                        constraint `page.evaluate` already has). Throws a clear error if
 *                        `window.__hfDebug` isn't set yet (no active game state).
 *                          opts.retry  boolean, default false — re-run `fn` up to `opts.attempts`
 *                            times (default 6, `opts.settleMs` apart, default 500) until its
 *                            return value stops changing between two consecutive applies. Use
 *                            this for idempotent mutator/cleanup functions (e.g. "strip all
 *                            chronicle_* quests") that can race the app's own fixture-load effect
 *                            chain — see lesson 2 and story-tab-check.mjs's "Clear-Versuch" loop.
 *                          opts.verify function(dbg) → boolean — if given, takes priority over the
 *                            auto-compare `retry` heuristic: apply `fn`, wait, call `verify(dbg)`,
 *                            retry until it returns true (or attempts run out). Use this when
 *                            "stable" means something other than "fn's return value stopped
 *                            changing" (e.g. "this specific quest id is no longer present").
 *     setState(fn, opts) — sugar for `patchContent((dbg) => fn(dbg.state), opts)` — `fn` receives
 *                        `state` directly, for the common case of a single-field mutation.
 *     clickRetry(locator, opts) — the ubiquitous "click, and if the first attempt times out
 *                        (element mid-transition/animation), wait 400ms and try once more" helper.
 *     waitForDebugHook(timeoutMs) — waits for `window.__hfDebug` to exist (default 8000ms). Call
 *                        this yourself after a manual create/load flow when you didn't pass
 *                        `fixture` to `startHarness`.
 *     getServerOutput() — returns the vite dev server's captured stdout+stderr so far (for
 *                        diagnosing a server that came up but is misbehaving).
 *     stop()           — closes the page + browser, kills the vite child. Safe to call multiple
 *                        times. ALWAYS call this (or use `withHarness`) — see lesson 7.
 *
 * withHarness(opts, fn) → Promise<T>
 *   `const h = await startHarness(opts); try { return await fn(h); } finally { await h.stop(); }`
 *   — the recommended entry point for a throwaway script: guarantees cleanup even if `fn` throws
 *   or a check `problems.push(...)`s and the script exits early.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * Minimal example
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 *
 *   import { withHarness } from "./sim-harness.mjs";
 *
 *   await withHarness({ port: 5299, fixture: "midgame" }, async (h) => {
 *     await h.shot("my-check-01-loaded");
 *     await h.patchContent((dbg) => { dbg.state.character.gold = 999999; });
 *     await h.page.locator('[data-guide-id="topbar.bank"]').first().click();
 *     await h.shot("my-check-02-bank");
 *     if (h.errors.length) console.log("PAGE ERRORS:\n" + h.errors.join("\n"));
 *   });
 *
 * See sim-harness-selftest.mjs for a fuller, runnable example (menu shot + fixture load + a
 * retry-verified content patch + a setState patch) that also serves as this module's own test.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = join(__dirname, "..");
const FIXTURES_DIR = join(__dirname, "fixtures");
const CONFIG_PATH = join(__dirname, "sim-harness.vite.config.mjs");
const DEFAULT_OUT_DIR = join(__dirname, "shots");

// ── internals ──────────────────────────────────────────────────────────────────────────────

function startDevServer({ port, hmr }) {
  const viteBin = join(CLIENT_DIR, "node_modules", "vite", "bin", "vite.js");
  const child = spawn(
    process.execPath,
    [viteBin, "dev", "--config", CONFIG_PATH, "--port", String(port), "--strictPort"],
    {
      cwd: CLIENT_DIR, // resolved from import.meta.url, not process.cwd() — lesson 6
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, SIM_HARNESS_HMR: hmr ? "1" : "0" },
    },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  return { child, getOutput: () => out };
}

async function waitForServer(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/** Reads a slotSaves value into a raw save JSON string: a known fixture name, or a literal JSON
 * string passed straight through (menu-slots-shot.mjs pattern, generalized). */
function resolveSaveJson(value) {
  if (typeof value !== "string") {
    throw new Error(`sim-harness: slotSaves value must be a string (fixture name or raw save JSON), got ${typeof value}`);
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("{")) return value;
  const fixturePath = join(FIXTURES_DIR, `${value}.json`);
  if (!existsSync(fixturePath)) {
    throw new Error(
      `sim-harness: slotSaves fixture "${value}" not found at ${fixturePath}. ` +
        `Pass a name that exists in ui-audit/fixtures/*.json (e.g. "midgame", "endgame"), or a raw save JSON string.`,
    );
  }
  return readFileSync(fixturePath, "utf8");
}

async function clickRetry(locator, opts = {}) {
  try {
    await locator.click({ timeout: 6000, ...opts });
  } catch {
    await locator.page().waitForTimeout(400);
    await locator.click({ timeout: 6000, ...opts });
  }
}

/** Runs `fn` inside the page against window.__hfDebug (or dbg.state / dbg.content, per `mode`).
 * `fn` is serialized via `.toString()` and reconstructed in the browser — it must not close over
 * outer Node-side variables (same constraint `page.evaluate` itself has for arrow functions). */
function evalDebug(page, fn, mode) {
  return page.evaluate(
    ({ src, mode }) => {
      const dbg = window.__hfDebug;
      if (!dbg) {
        throw new Error(
          "sim-harness: window.__hfDebug is not set — no active game state yet. " +
            "Pass `fixture` to startHarness, or call waitForDebugHook() after your own create/load flow.",
        );
      }
      // eslint-disable-next-line no-eval -- reconstructing a function passed in as source text is
      // the whole point here; there is no closure to leak since `src` came from `fn.toString()`.
      const reconstructed = (0, eval)(`(${src})`);
      const arg = mode === "state" ? dbg.state : mode === "content" ? dbg.content : dbg;
      return reconstructed(arg);
    },
    { src: fn.toString(), mode },
  );
}

/** Shared engine behind both `patchContent` (mode "dbg", fn receives `{state,content}`) and
 * `setState` (mode "state", fn receives `state` directly). See the retry/verify contract in the
 * module header doc comment above `startHarness`. */
async function applyWithRetry(page, fn, mode, opts = {}) {
  const { retry = false, verify = null, attempts = 6, settleMs = 500, label = "patchContent" } = opts;
  let result = await evalDebug(page, fn, mode);
  if (!retry && !verify) return result;

  for (let attempt = 1; attempt < attempts; attempt++) {
    await page.waitForTimeout(settleMs);
    let stable;
    if (verify) {
      stable = await evalDebug(page, verify, mode);
    } else {
      const again = await evalDebug(page, fn, mode);
      stable = JSON.stringify(again) === JSON.stringify(result);
      result = again;
    }
    if (stable) return result;
    console.log(`[sim-harness] ${label}: attempt ${attempt} not yet stable (racing the app's own load effects?), retrying...`);
  }
  console.log(`[sim-harness] ${label}: gave up waiting for stability after ${attempts} attempts — proceeding anyway.`);
  return result;
}

async function shotImpl(page, outDir, name, opts = {}) {
  const fileName = name.endsWith(".png") ? name : `${name}.png`;
  const path = join(outDir, fileName);
  await page.screenshot({ path, fullPage: opts.fullPage ?? false });
  console.log(`SHOT SAVED: ${fileName}`);
  return path;
}

// ── public API ─────────────────────────────────────────────────────────────────────────────

export async function startHarness(opts = {}) {
  const {
    port,
    viewport = { width: 1920, height: 1080 },
    fixture = null,
    slotSaves = null,
    hmr = false,
    locale = "en",
    requireDebugHook = !!fixture,
    settleMs = 2000,
    outDir = process.env.SIM_OUT_DIR || DEFAULT_OUT_DIR, // lesson 6: overridable, not hardcoded
    serverTimeoutMs = 40000,
  } = opts;

  if (!port) {
    throw new Error(
      "startHarness: `port` is required. Pick your own free 52xx port and register it in " +
        "SIM-AGENT-GUIDE.md's port table (lesson 3 — port collisions between concurrent agents).",
    );
  }

  mkdirSync(outDir, { recursive: true });

  const { child, getOutput } = startDevServer({ port, hmr });
  const baseUrl = `http://localhost:${port}`;

  let browser = null;
  let page = null;
  let stopped = false;

  async function stop() {
    if (stopped) return;
    stopped = true;
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    try {
      child.kill(); // lesson 7: always kill the vite child, even on error paths
    } catch {
      /* already dead */
    }
  }

  try {
    const up = await waitForServer(baseUrl, serverTimeoutMs);
    if (!up) {
      throw new Error(
        `sim-harness: dev server on port ${port} did not come up within ${serverTimeoutMs}ms ` +
          `(port already in use by another agent? check SIM-AGENT-GUIDE.md's port table). Server output:\n${getOutput()}`,
      );
    }

    browser = await chromium.launch();
    page = await browser.newPage({ viewport, deviceScaleFactor: 1 });

    const errors = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console: ${m.text()}`);
    });

    if (locale) {
      await page.addInitScript((loc) => {
        try {
          localStorage.setItem("hearthforge:locale", loc);
        } catch {
          /* noop */
        }
      }, locale);
    }

    if (slotSaves) {
      const pairs = Object.entries(slotSaves).map(([slot, value]) => [slot, resolveSaveJson(value)]);
      await page.addInitScript((entries) => {
        for (const [slot, json] of entries) {
          try {
            localStorage.setItem(`hearthforge:save:${slot}`, json);
          } catch {
            /* noop */
          }
        }
      }, pairs);
    }

    const url = fixture ? `${baseUrl}/?fixture=${encodeURIComponent(fixture)}` : baseUrl;
    await page.goto(url, { waitUntil: "load" });

    const readySelector = fixture ? '[data-guide-id^="sidebar."]' : ".menu";
    await page.waitForSelector(readySelector, { timeout: 15000 });

    if (requireDebugHook) {
      await page.waitForFunction(() => !!window.__hfDebug, null, { timeout: 8000 });
    }

    // Lesson 2: __hfDebug existing is fast; React.StrictMode's dev double-mount of the fixture-
    // load effect can take much longer (observed up to ~16s on a cold vite dependency-optimize
    // pass) before the CONTENT it produced is final. networkidle + a settle buffer, always BEFORE
    // any caller mutation — otherwise a caller's patch can get silently overwritten moments later
    // by the still-in-flight load effect (flaky: works sometimes, not others).
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    if (settleMs > 0) await page.waitForTimeout(settleMs);

    const handle = {
      page,
      browser,
      errors,
      shot: (name, shotOpts) => shotImpl(page, outDir, name, shotOpts),
      patchContent: (fn, patchOpts) => applyWithRetry(page, fn, "dbg", { label: "patchContent", ...patchOpts }),
      setState: (fn, patchOpts) => applyWithRetry(page, fn, "state", { label: "setState", ...patchOpts }),
      clickRetry: (locator, clickOpts) => clickRetry(locator, clickOpts),
      waitForDebugHook: (timeoutMs) => page.waitForFunction(() => !!window.__hfDebug, null, { timeout: timeoutMs ?? 8000 }),
      getServerOutput: getOutput,
      stop,
    };

    return handle;
  } catch (err) {
    await stop();
    throw err;
  }
}

export async function withHarness(opts, fn) {
  const h = await startHarness(opts);
  try {
    return await fn(h);
  } finally {
    await h.stop();
  }
}
