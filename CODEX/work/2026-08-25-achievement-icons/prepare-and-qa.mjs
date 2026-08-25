// codex:2026-08-25T20:18:00+02:00
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const STAGING = path.join(ROOT, 'CODEX/assets/achievement-icons-2026-08-25');
const RAW = path.join(STAGING, 'raw');
const FINAL = path.join(STAGING, 'fertig');
const QA = path.join(STAGING, 'qa');
const TARGET = 512;
const BODY_HEIGHT = 435;
const MAX_EXTENT = 480;
const REQUIRED = [
  'icon_ach_trophy',
  'icon_ach_forge',
  'icon_ach_combat',
  'icon_ach_nature',
  'icon_ach_craft',
  'icon_ach_scroll',
  'icon_ach_gold',
  'icon_ach_gift',
  'icon_ach_compass',
  'icon_ach_star',
];
const OPTIONAL = ['icon_achievments', 'icon_ach_milestone', 'icon_achievement_unlocked'];
const RARITIES = [
  ['common', '#454d54'],
  ['uncommon', 'rgba(91,143,214,.6)'],
  ['rare', 'rgba(216,192,106,.65)'],
  ['epic', 'rgba(170,80,200,.65)'],
  ['legendary', 'rgba(217,138,74,.7)'],
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
  const active = await alphaBox(rawPath, 2);
  if (!body || !active) throw new Error(`${id}: no visible subject found`);
  const crop = {
    left: Math.max(0, active.x - 8),
    top: Math.max(0, active.y - 8),
    width: 0,
    height: 0,
  };
  crop.width = Math.min(metadata.width - crop.left, active.width + 16);
  crop.height = Math.min(metadata.height - crop.top, active.height + 16);
  const scale = Math.min(BODY_HEIGHT / body.height, MAX_EXTENT / crop.width, MAX_EXTENT / crop.height);
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const resized = await sharp(rawPath)
    .extract(crop)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const finalPath = path.join(FINAL, `${id}.png`);
  await sharp({
    create: { width: TARGET, height: TARGET, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left: Math.floor((TARGET - width) / 2), top: Math.floor((TARGET - height) / 2) }])
    .toColourspace('srgb')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(finalPath);
  return finalPath;
}

async function inspect(file) {
  const data = await fs.readFile(file);
  const metadata = await sharp(data).metadata();
  const raw = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = raw.info;
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  let outer16NonZero = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = raw.data[(y * width + x) * 4 + 3];
      if (alpha === 0) transparent += 1;
      else if (alpha === 255) opaque += 1;
      else partial += 1;
      if ((x < 16 || x >= width - 16 || y < 16 || y >= height - 16) && alpha !== 0) outer16NonZero += 1;
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
    outer16NonZero,
    alphaBox2: await alphaBox(file, 2),
    alphaBox16: await alphaBox(file, 16),
    bodyBox224: await alphaBox(file, 224),
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function labelSvg(width, height, text, fontSize = 12) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="${fontSize + 10}" fill="#080a0d" fill-opacity=".92"/><text x="6" y="${fontSize + 1}" font-family="Arial,sans-serif" font-size="${fontSize}" fill="#e8e1d2">${escapeXml(text)}</text></svg>`);
}

async function contactSheet(files, name, background, cell = 240) {
  const columns = Math.min(5, files.length);
  const rows = Math.ceil(files.length / columns);
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const left = (index % columns) * cell;
    const top = Math.floor(index / columns) * cell;
    const item = await sharp(files[index]).resize(cell - 24, cell - 24, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: item, left: left + 12, top: top + 22 });
    composites.push({ input: labelSvg(cell, cell, path.basename(files[index], '.png')), left, top });
  }
  await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, name));
}

function ringSvg(stroke) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="46" height="46"><defs><radialGradient id="g" cx="35%" cy="30%" r="74%"><stop offset="0" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#0a0806" stop-opacity=".85"/></radialGradient></defs><circle cx="23" cy="23" r="21" fill="url(#g)" stroke="${stroke}" stroke-width="2"/></svg>`);
}

// codex:2026-08-25T20:42:00+02:00 — CSS grayscale(0.45) is a partial luminance mix, not a full grayscale conversion.
async function partialGrayscale(input, amount) {
  const raw = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let offset = 0; offset < raw.data.length; offset += 4) {
    const luminance = 0.2126 * raw.data[offset] + 0.7152 * raw.data[offset + 1] + 0.0722 * raw.data[offset + 2];
    raw.data[offset] = Math.round(raw.data[offset] * (1 - amount) + luminance * amount);
    raw.data[offset + 1] = Math.round(raw.data[offset + 1] * (1 - amount) + luminance * amount);
    raw.data[offset + 2] = Math.round(raw.data[offset + 2] * (1 - amount) + luminance * amount);
  }
  return sharp(raw.data, { raw: raw.info }).png().toBuffer();
}

async function ringTile(file, stroke, locked = false) {
  let iconBuffer = await sharp(file).resize(28, 28, { fit: 'contain' }).png().toBuffer();
  if (locked) iconBuffer = await partialGrayscale(iconBuffer, 0.45);
  let tile = sharp({ create: { width: 46, height: 46, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: ringSvg(stroke), left: 0, top: 0 }, { input: iconBuffer, left: 9, top: 9 }]);
  if (locked) tile = tile.modulate({ saturation: 0.72, brightness: 0.84 });
  return tile.png().toBuffer();
}

async function ringContact(files, name) {
  const zoom = 4;
  const cellWidth = 220;
  const cellHeight = 222;
  const rows = RARITIES.length + 1;
  const composites = [];
  for (let column = 0; column < files.length; column += 1) {
    for (let row = 0; row < rows; row += 1) {
      const locked = row === RARITIES.length;
      const rarity = locked ? RARITIES[0] : RARITIES[row];
      const exact = await ringTile(files[column], rarity[1], locked);
      const enlarged = await sharp(exact).resize(46 * zoom, 46 * zoom, { kernel: sharp.kernel.nearest }).png().toBuffer();
      const left = column * cellWidth + Math.floor((cellWidth - 46 * zoom) / 2);
      const top = row * cellHeight + 28;
      composites.push({ input: enlarged, left, top });
      composites.push({ input: labelSvg(cellWidth, cellHeight, row === 0 ? path.basename(files[column], '.png') : `${rarity[0]}${locked ? ' locked' : ''}`, 11), left: column * cellWidth, top: row * cellHeight });
    }
  }
  await sharp({ create: { width: files.length * cellWidth, height: rows * cellHeight, channels: 3, background: '#111419' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, name));
}

async function runeComparison(files) {
  const anchors = [
    path.join(ROOT, 'CODEX/assets/runen-tier-iv-2026-08-25/fertig/rune_judgement_iv.png'),
    path.join(ROOT, 'CODEX/assets/runen-tier-iv-2026-08-25/fertig/rune_iron_answer_iv.png'),
    path.join(ROOT, 'CODEX/assets/runen-tier-iv-2026-08-25/fertig/rune_bounty.png'),
  ];
  const all = [...files, ...anchors];
  const cell = 176;
  const columns = Math.min(5, all.length);
  const rows = Math.ceil(all.length / columns);
  const composites = [];
  for (let index = 0; index < all.length; index += 1) {
    const image = await sharp(all[index]).resize(144, 144, { fit: 'contain' }).png().toBuffer();
    const left = (index % columns) * cell;
    const top = Math.floor(index / columns) * cell;
    composites.push({ input: image, left: left + 16, top: top + 26 });
    composites.push({ input: labelSvg(cell, cell, `${index >= files.length ? 'RUNE · ' : ''}${path.basename(all[index], path.extname(all[index]))}`, 10), left, top });
  }
  await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background: '#12151a' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-neben-runen-iv.png'));
}

// codex:2026-08-25T20:42:00+02:00 — prove the two unframed UI sizes and the optional milestone's 12/20 px use.
async function smallSizeContact(requiredFiles, optionalFiles) {
  const rows = [
    { label: '24 px · category strip', files: requiredFiles, size: 24 },
    { label: '50 px · detail sheet', files: requiredFiles, size: 50 },
  ];
  const nature = requiredFiles.find((file) => path.basename(file, '.png') === 'icon_ach_nature');
  if (nature) rows.push({ label: '12 px · nature on farm', files: [nature], size: 12 });
  if (optionalFiles.some((file) => path.basename(file, '.png') === 'icon_ach_milestone')) {
    const milestone = optionalFiles.find((file) => path.basename(file, '.png') === 'icon_ach_milestone');
    rows.push({ label: '12 px · milestone', files: [milestone], size: 12 });
    rows.push({ label: '20 px · milestone', files: [milestone], size: 20 });
  }
  const cellWidth = 150;
  const cellHeight = 112;
  const columns = Math.max(...rows.map((row) => row.files.length));
  const composites = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (let column = 0; column < row.files.length; column += 1) {
      const icon = await sharp(row.files[column]).resize(row.size, row.size, { fit: 'contain' }).png().toBuffer();
      const left = column * cellWidth + Math.floor((cellWidth - row.size) / 2);
      const top = rowIndex * cellHeight + 34;
      composites.push({ input: icon, left, top });
      composites.push({ input: labelSvg(cellWidth, cellHeight, column === 0 ? row.label : path.basename(row.files[column], '.png'), 10), left: column * cellWidth, top: rowIndex * cellHeight });
    }
  }
  await sharp({ create: { width: columns * cellWidth, height: rows.length * cellHeight, channels: 3, background: '#101318' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-ui-small-sizes.png'));
}

const rawNames = (await fs.readdir(RAW)).filter((name) => name.endsWith('-raw.png')).sort();
const finalFiles = [];
for (const rawName of rawNames) {
  const id = rawName.slice(0, -'-raw.png'.length);
  if (![...REQUIRED, ...OPTIONAL].includes(id)) throw new Error(`unexpected raw id: ${id}`);
  finalFiles.push(await prepare(path.join(RAW, rawName), id));
}
const finalById = new Map(finalFiles.map((file) => [path.basename(file, '.png'), file]));
const requiredFinalFiles = REQUIRED.map((id) => finalById.get(id)).filter(Boolean);
const optionalFinalFiles = OPTIONAL.map((id) => finalById.get(id)).filter(Boolean);

await contactSheet(finalFiles, 'contact-sheet-black.png', '#050608');
await contactSheet(finalFiles, 'contact-sheet-gray.png', '#555555');
await contactSheet(finalFiles, 'contact-sheet-magenta.png', '#ff00ff');
await ringContact(requiredFinalFiles, requiredFinalFiles.length === 10 ? 'contact-sheet-ring-28-46.png' : 'contact-sheet-ring-28-46-anchors.png');
await smallSizeContact(requiredFinalFiles, optionalFinalFiles);
await runeComparison(finalFiles);

const qa = {
  generatedAt: '2026-08-25T20:55:00+02:00',
  method: 'native generator alpha preserved; transparent crop, proportional resize and transparent-canvas centering only; no keying',
  requiredIds: REQUIRED,
  optionalIds: OPTIONAL,
  files: [],
  checks: {},
};
for (const file of finalFiles) qa.files.push(await inspect(file));
const actualIds = qa.files.map((entry) => path.basename(entry.file, '.png')).sort();
qa.checks = {
  requiredCount: REQUIRED.length,
  actualRequiredCount: actualIds.filter((id) => REQUIRED.includes(id)).length,
  deliveredOptionalIds: actualIds.filter((id) => OPTIONAL.includes(id)),
  missingRequiredIds: REQUIRED.filter((id) => !actualIds.includes(id)),
  unexpectedIds: actualIds.filter((id) => ![...REQUIRED, ...OPTIONAL].includes(id)),
  all512PngSrgb: qa.files.every((entry) => entry.width === 512 && entry.height === 512 && entry.format === 'png' && entry.colourSpace === 'srgb'),
  allRgbaWithUsedAlpha: qa.files.every((entry) => entry.channels === 4 && entry.hasAlpha && entry.transparentPixels > 0 && entry.partialAlphaPixels > 0),
  allOuter16Transparent: qa.files.every((entry) => entry.outer16NonZero === 0),
  allBodyHeightsWithin80To90Percent: qa.files.every((entry) => entry.bodyBox224 && entry.bodyBox224.height >= 410 && entry.bodyBox224.height <= 461),
};
await fs.writeFile(path.join(QA, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
