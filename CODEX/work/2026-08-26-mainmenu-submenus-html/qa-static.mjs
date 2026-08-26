// codex:2026-08-26T19:31:00+02:00
import fs from 'node:fs';
import path from 'node:path';

const root = 'G:/GameDev/CODEX/outbox/2026-08-26-mainmenu-submenus-html';
const htmlFiles = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
const missing = [];
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of content.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (/^(?:https?:|#|mailto:)/.test(reference)) continue;
    if (!fs.existsSync(path.resolve(root, reference))) missing.push(`${file}: ${reference}`);
  }
}

const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
for (const match of css.matchAll(/url\("([^"]+)"\)/g)) {
  if (!fs.existsSync(path.resolve(root, match[1]))) missing.push(`styles.css: ${match[1]}`);
}
const braceBalance = [...css].reduce((balance, character) => balance + (character === '{' ? 1 : character === '}' ? -1 : 0), 0);
const codexMarkers = [
  ...htmlFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')),
  css,
  fs.readFileSync(path.join(root, 'app.js'), 'utf8'),
].reduce((total, content) => total + (content.match(/codex:/g)?.length ?? 0), 0);

console.log(JSON.stringify({ htmlFiles, missing, braceBalance, codexMarkers }, null, 2));
if (missing.length || braceBalance !== 0) process.exitCode = 1;
