#!/usr/bin/env node
/**
 * bot-selftest.mjs — Task #351: end-to-end self-check for `ui-audit/bot.mjs`, run as a real CLI
 * invocation (child process), exactly the way BOT-GUIDE.md tells a weak-model caller to use it —
 * not a shortcut that imports bot.mjs's internals directly. Two runs:
 *
 *   1. POSITIVE — a full example flow (fixture load → combat page → zone → fight-now → wait
 *      combat-active → screenshot → 2 asserts → a state dump) must exit 0 with every action
 *      `ok:true`.
 *   2. NEGATIVE — the same flow but with a deliberately wrong monster id must exit 1 with a CLEAN
 *      `ok:false` entry (error+hint), not a crash/uncaught stack trace.
 *
 * Keep this file (reference/example, like sim-harness-selftest.mjs) — don't delete after a run.
 * Uses port 5340 (bot.mjs's own reserved default, see SIM-AGENT-GUIDE.md's port table) for both
 * runs, sequentially (never in parallel — see bot.mjs's port-reuse header comment for why that's
 * fine for a solo/sequential caller but NOT for two truly concurrent sessions).
 *
 * Run: node ui-audit/bot-selftest.mjs   (from apps/client/)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BOT_PATH = join(__dirname, "bot.mjs");
const NODE = process.execPath;
// Feste (nicht temp-) Ausgabeordner unter ui-audit/bot-runs/ — bewusst NICHT am Ende gelöscht,
// damit der Screenshot des Positiv-Laufs danach per Read inspizierbar bleibt (Task #351 Auflage
// "Screenshots des Beispiel-Flows per Read ansehen"). Wird bei jedem Selftest-Lauf frisch geleert.
const WORK_DIR = join(__dirname, "bot-runs", "selftest");

function runBot(doString, outPath) {
  const args = [BOT_PATH, "--fixture", "midgame", "--port", "5340", "--do", doString, "--out", outPath];
  const startedAt = Date.now();
  const res = spawnSync(NODE, args, { cwd: __dirname, encoding: "utf8" });
  const ms = Date.now() - startedAt;
  return { res, ms };
}

function loadResult(outPath) {
  if (!existsSync(outPath)) {
    throw new Error(`result.json wurde nicht geschrieben: ${outPath}`);
  }
  return JSON.parse(readFileSync(outPath, "utf8"));
}

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`  OK   ${label}`);
  } else {
    failures++;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

rmSync(WORK_DIR, { recursive: true, force: true });
mkdirSync(WORK_DIR, { recursive: true });

{
  // ── 1. POSITIVE ────────────────────────────────────────────────────────────────────────────
  console.log("=== POSITIVE run ===");
  const posOut = join(WORK_DIR, "positive", "result.json");
  const posDo =
    "goto:combat; " +
    "zone:pastures; " +
    "fight-now:chicken; " +
    "wait:combat-active; " +
    "shot:selftest-01-combat.png; " +
    'assert:state.combat.monsterId == "chicken"; ' +
    "assert:state.character.hp > 0; " +
    "state:combat";
  const { res: posRes, ms: posMs } = runBot(posDo, posOut);
  console.log(`  Quickstart-Laufzeit: ${posMs}ms`);

  check("Prozess-Exitcode 0", posRes.status === 0, `status=${posRes.status}`);
  const posPayload = loadResult(posOut);
  check("result.json ok:true", posPayload.ok === true, JSON.stringify(posPayload.summary));
  check("alle 8 Aktionen ok", posPayload.actions.length === 8 && posPayload.actions.every((a) => a.ok), JSON.stringify(posPayload.summary));
  const shotAction = posPayload.actions.find((a) => a.action.startsWith("shot:"));
  check("Screenshot-Datei existiert", !!shotAction?.file && existsSync(shotAction.file), shotAction?.file);
  const stateAction = posPayload.actions.find((a) => a.action === "state:combat");
  check(
    "state:combat liefert monsterId chicken",
    stateAction?.data?.monsterId === "chicken",
    JSON.stringify(stateAction?.data),
  );
  check("kein pageError", (posPayload.pageErrors ?? []).length === 0, JSON.stringify(posPayload.pageErrors));
  check("Quickstart < 60s", posMs < 60_000, `${posMs}ms`);

  // ── 2. NEGATIVE — absichtlich falsche monsterId ───────────────────────────────────────────
  console.log("\n=== NEGATIVE run (falsche monsterId) ===");
  const negOut = join(WORK_DIR, "negative", "result.json");
  const negDo = "goto:combat; zone:pastures; fight-now:definitely_not_a_real_monster_id_zzz";
  const { res: negRes } = runBot(negDo, negOut);

  check("Prozess-Exitcode 1 (kein Crash)", negRes.status === 1, `status=${negRes.status}`);
  check("kein Node-Stacktrace auf stderr", !/at\s+.*\(.*bot\.mjs:\d+/.test(negRes.stderr ?? ""), negRes.stderr?.slice(0, 300));
  const negPayload = loadResult(negOut);
  check("result.json ok:false", negPayload.ok === false, JSON.stringify(negPayload.summary));
  const failedAction = negPayload.actions[negPayload.actions.length - 1];
  check("letzte Aktion ist fight-now mit falscher id", failedAction?.action === "fight-now:definitely_not_a_real_monster_id_zzz");
  check("ok:false auf der fehlgeschlagenen Aktion", failedAction?.ok === false);
  check("error-Feld gesetzt", typeof failedAction?.error === "string" && failedAction.error.length > 0, failedAction?.error);
  check("hint-Feld gesetzt (Abhilfe)", typeof failedAction?.hint === "string" && failedAction.hint.length > 0, failedAction?.hint);
  check(
    "vorherige 2 Aktionen (goto/zone) liefen noch ok",
    negPayload.actions.slice(0, 2).every((a) => a.ok === true),
    JSON.stringify(negPayload.actions.slice(0, 2)),
  );

  console.log(`\n${failures === 0 ? "ALLE CHECKS OK" : `${failures} CHECK(S) FEHLGESCHLAGEN`}`);
  if (posRes.status !== 0 && posRes.status !== null) {
    console.log("\n--- positive stdout ---\n" + posRes.stdout);
    console.log("--- positive stderr ---\n" + posRes.stderr);
  }
  if (failures > 0) {
    console.log("\n--- negative stdout ---\n" + negRes.stdout);
    console.log("--- negative stderr ---\n" + negRes.stderr);
  }
}

process.exit(failures === 0 ? 0 : 1);
