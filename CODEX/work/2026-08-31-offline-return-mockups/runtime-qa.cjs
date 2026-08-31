// codex:2026-08-31T01:39:00+02:00 — Statische Runtime-QA ohne Electron-/Browserstart.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const componentPath = path.join(root, "apps/client/src/renderer/pages/OfflinePopup.tsx");
const cssPath = path.join(root, "apps/client/src/renderer/styles/offline-stage.css");
const component = fs.readFileSync(componentPath, "utf8");
const css = fs.readFileSync(cssPath, "utf8");
const failures = [];

for (const token of [
  "ofs-summary-bar",
  "ofs-event-ribbon",
  "ofs-report-column--progress",
  "ofs-report-column--loot",
  "ofs-report-column--camp",
  "ofs-empty",
  "getCampImage",
  "offline.stage.awayLabel",
  "codex:2026-08-31T01:18:00+02:00",
]) {
  if (!component.includes(token)) failures.push(`Komponentenvertrag fehlt: ${token}`);
}

for (const token of [
  ".ofs-report-grid.has-progress.has-loot.has-camp",
  "@media (max-width: 1120px)",
  "@media (max-width: 820px)",
  "@media (max-height: 760px)",
  "codex:2026-08-31T01:26:00+02:00",
]) {
  if (!css.includes(token)) failures.push(`CSS-Vertrag fehlt: ${token}`);
}

for (const [, reference] of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
  if (!fs.existsSync(path.resolve(path.dirname(cssPath), reference))) {
    failures.push(`Fehlendes CSS-Asset: ${reference}`);
  }
}

const localePaths = [
  "apps/client/src/renderer/i18n/translations.ts",
  "apps/client/src/renderer/i18n/locales/es.ts",
  "apps/client/src/renderer/i18n/locales/fr.ts",
  "apps/client/src/renderer/i18n/locales/ptBR.ts",
  "apps/client/src/renderer/i18n/locales/ru.ts",
  "apps/client/src/renderer/i18n/locales/zh.ts",
];
for (const localePath of localePaths) {
  const source = fs.readFileSync(path.join(root, localePath), "utf8");
  if (!source.includes('"offline.stage.awayLabel"')) failures.push(`i18n-Key fehlt: ${localePath}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Runtime-QA bestanden: Layoutzustände, Breakpoints, vier CSS-Assets und alle Sprachen vollständig.");
