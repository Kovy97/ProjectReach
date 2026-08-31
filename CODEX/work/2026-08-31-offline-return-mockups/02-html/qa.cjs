// codex:2026-08-31T00:55:00+02:00
const fs = require("node:fs");
const path = require("node:path");

const htmlPath = path.join(__dirname, "index.html");
const html = fs.readFileSync(htmlPath, "utf8");
const failures = [];

const staticReferences = [
  ...html.matchAll(/(?:src|href)=["']([^"'#]+)["']/g),
  ...html.matchAll(/url\(["']?([^"')]+)["']?\)/g),
].map((match) => match[1]);

for (const reference of new Set(staticReferences)) {
  if (/^(?:https?:|data:|#)/.test(reference)) continue;
  const resolved = path.resolve(__dirname, reference);
  if (!fs.existsSync(resolved)) failures.push(`Fehlender Asset-Pfad: ${reference}`);
}

const dynamicReferences = [...html.matchAll(/image:\s*`\$\{assetRoot\}\/([^`]+)`/g)]
  .map((match) => match[1]);
const assetRoot = path.resolve(__dirname, "../../../../apps/client/src/renderer/assets");
for (const reference of dynamicReferences) {
  if (!fs.existsSync(path.join(assetRoot, reference))) {
    failures.push(`Fehlender dynamischer Asset-Pfad: ${reference}`);
  }
}

const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicateIds.length) failures.push(`Doppelte IDs: ${[...new Set(duplicateIds)].join(", ")}`);

for (const required of [
  'data-scenario="companion"',
  'data-scenario="death"',
  'data-scenario="stalemate"',
  'data-scenario="workstop"',
  'data-scenario="empty"',
  'id="density"',
  'class="collect"',
  '@media (max-width: 1260px)',
  '@media (max-width: 980px)',
  'codex:2026-08-31T00:42:00+02:00',
]) {
  if (!html.includes(required)) failures.push(`Pflichtmerkmal fehlt: ${required}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`QA bestanden: ${new Set(staticReferences).size} statische Pfade, ${dynamicReferences.length} Szenario-Pfade, ${ids.length} eindeutige IDs.`);
