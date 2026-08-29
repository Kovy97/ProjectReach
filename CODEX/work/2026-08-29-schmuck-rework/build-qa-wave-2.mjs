// codex:2026-08-29T16:19:58+02:00
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const BASE = path.join(ROOT, 'CODEX/assets/schmuck-rework-2026-08-29');
const FINAL = path.join(BASE, 'fertig');
const RAW = path.join(BASE, 'raw');
const QA = path.join(BASE, 'qa');
const ITEMS = path.join(ROOT, 'apps/client/src/renderer/assets/items');
const IDS = [
  'kestrel_loop', 'hawkeye_gyre', 'sinewbound_coil', 'windwidow_snare',
  'blackfletch_nock', 'ghostquiver_notch', 'worldpiercer_barb',
  'longsight_cord', 'windwhisper_torc', 'harriers_clasp', 'kitehunter_collar',
  'gloomfletch_choker', 'nightquarry_wreath', 'deadeye_reliquary'
];
const CONTACT = [
  { id: 'REF diamond_ring', file: path.join(ITEMS, 'diamond_ring.webp') },
  { id: 'REF onyx_amulet', file: path.join(ITEMS, 'onyx_amulet.webp') },
  ...IDS.map((id) => ({ id, file: path.join(FINAL, `${id}.webp`) }))
];

await fs.mkdir(QA, { recursive: true });

// codex:2026-08-29T16:19:58+02:00
function svgLabel(text, width, height, size) {
  const escaped = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#111418"/>
    <text x="50%" y="${Math.round(height * 0.72)}" text-anchor="middle"
      font-family="Arial, sans-serif" font-size="${size}" fill="#d9c398">${escaped}</text>
  </svg>`);
}

// codex:2026-08-29T16:19:58+02:00
async function makeContact(target, background, iconSize, cellWidth, cellHeight, columns) {
  const rows = Math.ceil(CONTACT.length / columns);
  const composites = [];
  for (let index = 0; index < CONTACT.length; index += 1) {
    const item = CONTACT[index];
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    const icon = await sharp(item.file).resize(iconSize, iconSize, { fit: 'contain' }).png().toBuffer();
    const label = svgLabel(item.id, cellWidth - 8, cellHeight - iconSize - 8, iconSize <= 60 ? 9 : 16);
    composites.push({ input: icon, left: left + Math.round((cellWidth - iconSize) / 2), top: top + 4 });
    composites.push({ input: label, left: left + 4, top: top + iconSize + 4 });
  }
  await sharp({
    create: { width: cellWidth * columns, height: cellHeight * rows, channels: 3, background }
  }).composite(composites).png({ compressionLevel: 9 }).toFile(target);
}

// codex:2026-08-29T16:19:58+02:00
async function inspect(id) {
  const file = path.join(FINAL, `${id}.webp`);
  const rawFile = path.join(RAW, `${id}.png`);
  const metadata = await sharp(file).metadata();
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let alphaMin = 255;
  let alphaMax = 0;
  let softAlphaPixels = 0;
  let edgeAlphaMax = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      alphaMin = Math.min(alphaMin, alpha);
      alphaMax = Math.max(alphaMax, alpha);
      if (alpha > 0 && alpha < 255) softAlphaPixels += 1;
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        edgeAlphaMax = Math.max(edgeAlphaMax, alpha);
      }
    }
  }
  const bytes = await fs.readFile(file);
  const rawMeta = await sharp(rawFile).metadata();
  return {
    id,
    file: `${id}.webp`,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    alphaMin,
    alphaMax,
    softAlphaPixels,
    edgeAlphaMax,
    raw: { file: `${id}.png`, width: rawMeta.width, height: rawMeta.height, hasAlpha: rawMeta.hasAlpha },
    bytes: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex')
  };
}

// codex:2026-08-29T16:19:58+02:00
await makeContact(path.join(QA, 'contact-wave-2-dark.png'), '#202326', 280, 320, 328, 4);
await makeContact(path.join(QA, 'contact-wave-2-magenta.png'), '#ff00ff', 280, 320, 328, 4);
await makeContact(path.join(QA, 'contact-wave-2-60px.png'), '#202326', 60, 120, 88, 8);

const files = [];
for (const id of IDS) files.push(await inspect(id));
const report = {
  generatedAt: '2026-08-29T16:19:58+02:00',
  wave: 2,
  count: files.length,
  references: ['diamond_ring.webp', 'onyx_amulet.webp'],
  expected: { format: 'webp', width: 640, height: 640, alpha: true, edgeAlphaMax: 0 },
  pass: files.every((file) => file.width === 640 && file.height === 640 && file.format === 'webp'
    && file.hasAlpha && file.alphaMin === 0 && file.alphaMax === 255 && file.edgeAlphaMax === 0),
  files
};
await fs.writeFile(path.join(QA, 'qa-wave-2.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
