#!/usr/bin/env node
// T8: Live-Diff — welche lokalisierbaren Content-Keys fehlen in den zh/ru/ptBR-Overlays?
// Repliziert tools/extract-content-strings.mjs (Transpile in Temp, collectEnglishStrings),
// schreibt aber NICHTS ins Repo.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const CONTENT_SRC = "G:\\GameDev\\packages\\content\\src";
const MODULES = ["index.ts", "locales/apply.ts", "locales/es.ts", "locales/ptBR.ts", "locales/fr.ts", "locales/ru.ts", "locales/zh.ts"];

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "t8-extract-"));
try {
  for (const rel of MODULES) {
    const src = fs.readFileSync(path.join(CONTENT_SRC, rel), "utf8");
    const { outputText } = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
    const outPath = path.join(tmpDir, rel.replace(/\.ts$/, ".js"));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, outputText, "utf8");
  }
  const contentModule = require(path.join(tmpDir, "index.js"));
  const applyModule = require(path.join(tmpDir, "locales", "apply.js"));
  const enKeys = Object.keys(applyModule.collectEnglishStrings(contentModule.content));
  console.log("EN lokalisierbare Keys (live):", enKeys.length);

  for (const [name, mod] of [["zh", "zh"], ["ru", "ru"], ["ptBR", "ptBR"]]) {
    const overlay = require(path.join(tmpDir, "locales", `${mod}.js`))[mod];
    const overlayKeys = new Set(Object.keys(overlay));
    const missing = enKeys.filter((k) => !overlayKeys.has(k));
    const orphans = [...overlayKeys].filter((k) => !enKeys.includes(k));
    console.log(`\n[${name}] overlay keys: ${overlayKeys.size} | FEHLEND: ${missing.length} | verwaist: ${orphans.length}`);
    if (missing.length) console.log("  fehlend:", JSON.stringify(missing.slice(0, 40), null, 1));
    if (orphans.length) console.log("  verwaist (Overlay-Key ohne Content):", JSON.stringify(orphans.slice(0, 15)));
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
