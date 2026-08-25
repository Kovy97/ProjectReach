// codex:2026-08-25T10:48:00+02:00
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const STAGING = path.join(ROOT, 'CODEX/assets/runen-tier-iv-2026-08-25');
const RAW = path.join(STAGING, 'raw');
const FINAL = path.join(STAGING, 'fertig');
const QA = path.join(STAGING, 'qa');
const TARGET = 1024;
const BODY_HEIGHT = 860;
const MAX_SOURCE_EXTENT = 942;
const EXPECTED = [
  'rune_warpath_iv', 'rune_second_arrow_iv', 'rune_thin_veil_iv', 'rune_wasting_iv', 'rune_judgement_iv',
  'rune_iron_answer_iv', 'rune_ambush_iv', 'rune_veil_drinker_iv', 'rune_unbroken_wall_iv',
  'rune_bounty', 'rune_tallyman', 'rune_restless', 'rune_chronicle', 'rune_gleaning'
];

await fs.mkdir(FINAL, { recursive: true });
await fs.mkdir(QA, { recursive: true });

async function alphaBox(input, threshold) {
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = raw.info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (raw.data[(y * width + x) * 4 + 3] <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function prepare(rawPath, id) {
  const metadata = await sharp(rawPath).metadata();
  if (!metadata.hasAlpha || metadata.channels !== 4) {
    throw new Error(`${id}: raw generator output has no native alpha`);
  }
  const body = await alphaBox(rawPath, 224);
  if (!body) throw new Error(`${id}: no opaque runestone body found`);
  // codex:2026-08-25T11:32:00+02:00 — crop only generator-canvas emptiness and near-zero stray pixels; native motif alpha stays untouched.
  const active = await alphaBox(rawPath, 16);
  if (!active) throw new Error(`${id}: no visible alpha extent found`);
  const crop = {
    left: Math.max(0, active.x - 8),
    top: Math.max(0, active.y - 8),
    width: 0,
    height: 0
  };
  crop.width = Math.min(metadata.width - crop.left, active.width + 16);
  crop.height = Math.min(metadata.height - crop.top, active.height + 16);
  const scale = Math.min(
    BODY_HEIGHT / body.height,
    MAX_SOURCE_EXTENT / crop.width,
    MAX_SOURCE_EXTENT / crop.height
  );
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const resized = await sharp(rawPath)
    .extract(crop)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const finalPath = path.join(FINAL, `${id}.png`);
  await sharp({ create: { width: TARGET, height: TARGET, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: resized, left: Math.floor((TARGET - width) / 2), top: Math.floor((TARGET - height) / 2) }])
    .toColourspace('srgb')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(finalPath);
  return finalPath;
}

async function inspect(file) {
  const data = await fs.readFile(file);
  const image = sharp(data);
  const metadata = await image.metadata();
  const raw = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = raw.info;
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  let edgeNonZero = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = raw.data[(y * width + x) * 4 + 3];
      if (alpha === 0) transparent += 1;
      else if (alpha === 255) opaque += 1;
      else partial += 1;
      if ((x < 32 || x >= width - 32 || y < 32 || y >= height - 32) && alpha !== 0) edgeNonZero += 1;
    }
  }
  return {
    file: path.basename(file),
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    colourSpace: metadata.space,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    transparentPixels: transparent,
    partialAlphaPixels: partial,
    opaquePixels: opaque,
    edge32NonZero: edgeNonZero,
    alphaBox16: await alphaBox(file, 16),
    bodyBox224: await alphaBox(file, 224),
    sha256: crypto.createHash('sha256').update(data).digest('hex')
  };
}

function labelSvg(width, height, text, fontSize = 18) {
  const safe = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="${fontSize + 12}" fill="#080a0d" fill-opacity=".88"/><text x="8" y="${fontSize + 2}" font-family="Arial,sans-serif" font-size="${fontSize}" fill="#e8e1d2">${safe}</text></svg>`);
}

async function contactSheet(files, name, background, cell = 320) {
  const columns = Math.min(4, files.length);
  const rows = Math.ceil(files.length / columns);
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const left = (index % columns) * cell;
    const top = Math.floor(index / columns) * cell;
    const item = await sharp(files[index]).resize(cell, cell, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: item, left, top });
    composites.push({ input: labelSvg(cell, cell, path.basename(files[index], '.png')), left, top });
  }
  await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, name));
}

// codex:2026-08-25T11:40:00+02:00 — exact reduced-size UI proof and line-by-line tier comparison.
async function reducedSizeSheet(files) {
  const cellWidth = 150;
  const cellHeight = 150;
  const columns = 7;
  const rows = 4;
  const composites = [];
  for (let pass = 0; pass < 2; pass += 1) {
    const iconSize = pass === 0 ? 96 : 64;
    for (let index = 0; index < files.length; index += 1) {
      const row = pass * 2 + Math.floor(index / columns);
      const column = index % columns;
      const left = column * cellWidth;
      const top = row * cellHeight;
      const icon = await sharp(files[index]).resize(iconSize, iconSize, { fit: 'contain' }).png().toBuffer();
      composites.push({ input: icon, left: left + Math.floor((cellWidth - iconSize) / 2), top: top + 34 });
      composites.push({ input: labelSvg(cellWidth, cellHeight, `${pass === 0 ? '96' : '64'} · ${path.basename(files[index], '.png')}`, 11), left, top });
    }
  }
  await sharp({ create: { width: columns * cellWidth, height: rows * cellHeight, channels: 3, background: '#17130f' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-ui-64-96.png'));
}

async function tierComparison() {
  const groups = [
    ['rune_flame_iii.webp', 'rune_warpath_iv.png', 'rune_second_arrow_iv.png', 'rune_thin_veil_iv.png', 'rune_wasting_iv.png', 'rune_judgement_iv.png'],
    ['rune_aegis_iii.webp', 'rune_iron_answer_iv.png', 'rune_ambush_iv.png', 'rune_veil_drinker_iv.png', 'rune_unbroken_wall_iv.png'],
    ['rune_warding_iii.webp', 'rune_bounty.png', 'rune_tallyman.png', 'rune_restless.png', 'rune_chronicle.png', 'rune_gleaning.png']
  ];
  const cell = 200;
  const composites = [];
  for (let row = 0; row < groups.length; row += 1) {
    for (let column = 0; column < groups[row].length; column += 1) {
      const name = groups[row][column];
      const file = name.endsWith('.webp')
        ? path.join(ROOT, 'apps/client/src/renderer/assets/items', name)
        : path.join(FINAL, name);
      const item = await sharp(file).resize(176, 176, { fit: 'contain' }).png().toBuffer();
      composites.push({ input: item, left: column * cell + 12, top: row * cell + 24 });
      composites.push({ input: labelSvg(cell, cell, `${column === 0 ? 'TIER III · ' : ''}${path.basename(name, path.extname(name))}`, 12), left: column * cell, top: row * cell });
    }
  }
  await sharp({ create: { width: 6 * cell, height: 3 * cell, channels: 3, background: '#101216' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-neben-tier-iii.png'));
}

const rawFiles = (await fs.readdir(RAW)).filter((name) => name.endsWith('-raw.png')).sort();
const finalFiles = [];
for (const rawName of rawFiles) {
  const id = rawName.slice(0, -'-raw.png'.length);
  finalFiles.push(await prepare(path.join(RAW, rawName), id));
}

await contactSheet(finalFiles, 'contact-sheet-black.png', '#050608');
await contactSheet(finalFiles, 'contact-sheet-gray.png', '#555555');
await contactSheet(finalFiles, 'contact-sheet-magenta.png', '#ff00ff');
await reducedSizeSheet(finalFiles);
await tierComparison();

const qa = {
  // codex:2026-08-25T11:56:00+02:00
  generatedAt: '2026-08-25T11:56:00+02:00',
  method: 'native generator alpha preserved; resize and transparent-canvas centering only; no keying',
  expectedIds: EXPECTED,
  files: [],
  checks: {}
};
for (const file of finalFiles) qa.files.push(await inspect(file));
const actualIds = qa.files.map((entry) => path.basename(entry.file, '.png')).sort();
const expectedSorted = [...EXPECTED].sort();
qa.checks = {
  expectedCount: EXPECTED.length,
  actualCount: actualIds.length,
  missingIds: expectedSorted.filter((id) => !actualIds.includes(id)),
  unexpectedIds: actualIds.filter((id) => !expectedSorted.includes(id)),
  all1024PngSrgb: qa.files.every((entry) => entry.width === 1024 && entry.height === 1024 && entry.format === 'png' && entry.colourSpace === 'srgb'),
  allRgbaWithUsedAlpha: qa.files.every((entry) => entry.channels === 4 && entry.hasAlpha && entry.transparentPixels > 0 && entry.partialAlphaPixels > 0),
  allOuter32Transparent: qa.files.every((entry) => entry.edge32NonZero === 0),
  allBodyHeightsWithin80To88Percent: qa.files.every((entry) => entry.bodyBox224 && entry.bodyBox224.height >= 819 && entry.bodyBox224.height <= 901),
  nineTierIvFilenames: actualIds.filter((id) => id.endsWith('_iv')).length,
  fiveJewelryFilenamesWithoutTierSuffix: actualIds.filter((id) => !id.endsWith('_iv')).length
};
await fs.writeFile(path.join(QA, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
