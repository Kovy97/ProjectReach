#!/usr/bin/env node
/**
 * Content-Lokalisierungs-String-Extraktor für Grim Reach.
 *
 * Dumpt ALLE lokalisierten `name`/`description`/`prefix`/`suffix`-Strings aus dem Content-Katalog
 * (`packages/content/src/index.ts`) als flache `"<collection>:<id>:<field>": "<en-Text>"`-Map nach
 * `design/content-strings-en.json` — die vollständige Quell-Liste für die Übersetzer-Agenten
 * (es/pt-BR/fr/ru/zh), die `packages/content/src/locales/<lang>.ts` befüllen.
 *
 * Nutzt dieselbe Traversierung wie `packages/content/src/locales/apply.ts`
 * (`collectEnglishStrings`), damit die extrahierten Keys 1:1 mit dem Overlay-Key-Schema
 * übereinstimmen. Da das Content-Package rein aus TypeScript-Quellen ohne Build-Schritt besteht
 * (`exports: "./src/index.ts"`), transpiliert dieses Skript die paar betroffenen Dateien selbst
 * (über die TypeScript-Compiler-API, kein `tsx`/`ts-node` nötig) in ein Temp-Verzeichnis und
 * `require()`t sie von dort.
 *
 * Aufruf:  node tools/extract-content-strings.mjs   (einmalig; erneut ausführbar, wenn neuer
 * Content dazukommt und die Quell-Liste aufgefrischt werden soll — überschreibt die JSON-Datei).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CONTENT_SRC = path.join(REPO_ROOT, "packages", "content", "src");
const OUT_FILE = path.join(REPO_ROOT, "design", "content-strings-en.json");

// Kompletter Laufzeit-Abhängigkeitsgraph von content/src/index.ts (alle @hearthforge/shared-
// Importe darin sind `import type` → syntaktisch elidiert, kein Cross-Package-Runtime-Import nötig).
const RELATIVE_MODULES = [
  "index.ts",
  path.join("locales", "apply.ts"),
  path.join("locales", "es.ts"),
  path.join("locales", "ptBR.ts"),
  path.join("locales", "fr.ts"),
  path.join("locales", "ru.ts"),
  path.join("locales", "zh.ts"),
];

function transpileToCommonJs(tsSource) {
  const { outputText } = ts.transpileModule(tsSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  });
  return outputText;
}

function main() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "grimreach-content-extract-"));
  try {
    for (const rel of RELATIVE_MODULES) {
      const src = fs.readFileSync(path.join(CONTENT_SRC, rel), "utf8");
      const js = transpileToCommonJs(src);
      const outPath = path.join(tmpDir, rel.replace(/\.ts$/, ".js"));
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, js, "utf8");
    }

    // eslint-disable-next-line import/no-dynamic-require -- bewusst: Temp-Build, kein echtes Modul
    const contentModule = require(path.join(tmpDir, "index.js"));
    const applyModule = require(path.join(tmpDir, "locales", "apply.js"));

    const strings = applyModule.collectEnglishStrings(contentModule.content);
    const sortedKeys = Object.keys(strings).sort((a, b) => a.localeCompare(b));
    const sorted = {};
    for (const key of sortedKeys) sorted[key] = strings[key];

    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 2) + "\n", "utf8");

    console.log(`Extrahiert: ${sortedKeys.length} Strings → ${path.relative(REPO_ROOT, OUT_FILE)}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
