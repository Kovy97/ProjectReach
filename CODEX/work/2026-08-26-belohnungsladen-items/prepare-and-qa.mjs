// codex:2026-08-26T10:23:25+02:00
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const STAGING = path.join(ROOT, 'CODEX/assets/belohnungsladen-2026-08-26');
const RAW = path.join(STAGING, 'raw');
const FINAL = path.join(STAGING, 'fertig');
const QA = path.join(STAGING, 'qa');
const ITEMS = path.join(ROOT, 'apps/client/src/renderer/assets/items');
const TARGET = 1024;
const BODY_HEIGHT = 870;
const MAX_EXTENT = 944;
const BOTTOM_GAP = 24;
const IDS = [
  'chronicle_wanderers_seal',
  'chronicle_ash_mark',
  'chronicle_crypt_lantern',
  'chronicle_tide_chain',
  'chronicle_idol_eye_ring',
  'chronicle_chronicler_signet',
  'chronicle_task_token',
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
      if (raw.data[(y * width + x) * 4 + 3] < threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function normalize(rawPath, outputPath) {
  const metadata = await sharp(rawPath).metadata();
  if (!metadata.hasAlpha || metadata.channels !== 4) throw new Error(`${rawPath}: kein natives RGBA`);
  const alphaStats = (await sharp(rawPath).stats()).channels[3];
  if (alphaStats.min !== 0 || alphaStats.max !== 255) throw new Error(`${rawPath}: Alpha deckt nicht 0..255 ab`);
  const active = await alphaBox(rawPath, 8);
  const body = await alphaBox(rawPath, 224);
  if (!active || !body) throw new Error(`${rawPath}: kein sichtbarer Motivkörper`);
  const crop = {
    left: Math.max(0, active.x - 4),
    top: Math.max(0, active.y - 4),
    width: 0,
    height: 0,
  };
  crop.width = Math.min(metadata.width - crop.left, active.width + 8);
  crop.height = Math.min(metadata.height - crop.top, active.height + 8);
  const scale = Math.min(BODY_HEIGHT / body.height, MAX_EXTENT / crop.width, MAX_EXTENT / crop.height);
  const width = Math.max(1, Math.round(crop.width * scale));
  const height = Math.max(1, Math.round(crop.height * scale));
  const resized = await sharp(rawPath)
    .extract(crop)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toColourspace('srgb')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const left = Math.floor((TARGET - width) / 2);
  const top = TARGET - BOTTOM_GAP - height;
  if (left < 24 || top < 24) throw new Error(`${rawPath}: Sicherheitsrand unterschritten`);
  await sharp({
    create: { width: TARGET, height: TARGET, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left, top }])
    .toColourspace('srgb')
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);
}

async function inspect(file) {
  const data = await fs.readFile(file);
  const metadata = await sharp(data).metadata();
  const raw = await sharp(data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = raw.info;
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  let solid245 = 0;
  let outer16NonZero = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = raw.data[(y * width + x) * 4 + 3];
      if (alpha === 0) transparent += 1;
      else if (alpha === 255) opaque += 1;
      else partial += 1;
      if (alpha >= 245) solid245 += 1;
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
    solid245Pixels: solid245,
    outer16NonZero,
    alphaBox8: await alphaBox(file, 8),
    bodyBox224: await alphaBox(file, 224),
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function labelSvg(width, text, fontSize = 11) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="28"><rect width="100%" height="28" fill="#080a0d"/><text x="7" y="19" font-family="Arial,sans-serif" font-size="${fontSize}" fill="#e8e1d2">${escapeXml(text)}</text></svg>`);
}

async function contactSheet(sources, output, options = {}) {
  const cell = options.cell ?? 240;
  const columns = options.columns ?? 4;
  const imageSize = options.imageSize ?? cell - 30;
  const rows = Math.ceil(sources.length / columns);
  const composites = [];
  for (let index = 0; index < sources.length; index += 1) {
    const left = (index % columns) * cell;
    const top = Math.floor(index / columns) * cell;
    const image = await sharp(sources[index].file).resize(imageSize, imageSize, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: image, left: left + Math.floor((cell - imageSize) / 2), top: top + 28 });
    composites.push({ input: labelSvg(cell, sources[index].label), left, top });
  }
  await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background: options.background ?? '#101318' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, output));
}

async function backgroundContact(files, output, background) {
  const cell = 190;
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const image = await sharp(files[index]).resize(165, 165, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: image, left: index * cell + 12, top: 28 });
    composites.push({ input: labelSvg(cell, path.basename(files[index], '.png'), 9), left: index * cell, top: 0 });
  }
  await sharp({ create: { width: files.length * cell, height: cell, channels: 3, background } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, output));
}

async function uiSizeContact(files) {
  const sizes = [48, 96, 128];
  const cellWidth = 150;
  const cellHeight = 170;
  const composites = [];
  for (let row = 0; row < sizes.length; row += 1) {
    for (let column = 0; column < files.length; column += 1) {
      const size = sizes[row];
      const image = await sharp(files[column]).resize(size, size, { fit: 'contain' }).png().toBuffer();
      composites.push({ input: image, left: column * cellWidth + Math.floor((cellWidth - size) / 2), top: row * cellHeight + 30 });
      composites.push({ input: labelSvg(cellWidth, `${size}px · ${IDS[column].replace('chronicle_', '')}`, 9), left: column * cellWidth, top: row * cellHeight });
    }
  }
  await sharp({ create: { width: files.length * cellWidth, height: sizes.length * cellHeight, channels: 3, background: '#101318' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-ui-48-96-128.png'));
}

for (const id of IDS) {
  await normalize(path.join(RAW, `${id}-raw.png`), path.join(FINAL, `${id}.png`));
}

const finalFiles = IDS.map((id) => path.join(FINAL, `${id}.png`));
const finalSources = IDS.map((id, index) => ({ label: id, file: finalFiles[index] }));
await contactSheet(finalSources, 'contact-sheet-series.png', { columns: 4, cell: 260, imageSize: 225 });
await backgroundContact(finalFiles, 'contact-sheet-black.png', '#050608');
await backgroundContact(finalFiles, 'contact-sheet-gray.png', '#55585d');
await backgroundContact(finalFiles, 'contact-sheet-magenta.png', '#ff00ff');
await uiSizeContact(finalFiles);

const comparisonSources = [
  { label: 'Bestand · garnet_ring', file: path.join(ITEMS, 'garnet_ring.webp') },
  { label: 'Neu · wanderers_seal', file: finalFiles[0] },
  { label: 'Neu · idol_eye_ring', file: finalFiles[4] },
  { label: 'Neu · chronicler_signet', file: finalFiles[5] },
  { label: 'Bestand · garnet_amulet', file: path.join(ITEMS, 'garnet_amulet.webp') },
  { label: 'Neu · ash_mark', file: finalFiles[1] },
  { label: 'Neu · tide_chain', file: finalFiles[3] },
  { label: 'Bestand · drovers_charm', file: path.join(ITEMS, 'drovers_charm.webp') },
  { label: 'Bestand · field_cape', file: path.join(ITEMS, 'field_cape.webp') },
  { label: 'Neu · crypt_lantern', file: finalFiles[2] },
  { label: 'Bestand · shroud_of_the_dead', file: path.join(ITEMS, 'shroud_of_the_dead.webp') },
  { label: 'Neu · task_token', file: finalFiles[6] },
];
await contactSheet(comparisonSources, 'contact-sheet-neben-bestand.png', { columns: 4, cell: 260, imageSize: 220 });

const files = [];
for (const file of finalFiles) files.push(await inspect(file));
const expected = IDS.map((id) => `${id}.png`);
const qa = {
  generatedAt: '2026-08-26T10:23:25+02:00',
  method: 'native generator alpha preserved; alpha-bounded crop, proportional resize and bottom-center placement only; no keying or matte removal',
  files,
  checks: {
    exactFilenames: files.map((entry) => entry.file).join('|') === expected.join('|'),
    sevenFiles: files.length === 7,
    all1024PngSrgb: files.every((entry) => entry.width === 1024 && entry.height === 1024 && entry.format === 'png' && entry.colourSpace === 'srgb'),
    allRgbaWithUsedAlpha: files.every((entry) => entry.channels === 4 && entry.hasAlpha && entry.transparentPixels > 0 && entry.partialAlphaPixels > 0 && entry.solid245Pixels > 0),
    allOuter16Transparent: files.every((entry) => entry.outer16NonZero === 0),
    allBodyHeightsWithin80To90Percent: files.every((entry) => entry.bodyBox224 && entry.bodyBox224.height >= 819 && entry.bodyBox224.height <= 922),
  },
};
await fs.writeFile(path.join(QA, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
