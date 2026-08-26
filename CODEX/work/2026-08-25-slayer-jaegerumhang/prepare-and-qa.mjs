// codex:2026-08-25T21:18:00+02:00
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const STAGING = path.join(ROOT, 'CODEX/assets/slayer-jaegerumhang-2026-08-25');
const RAW = path.join(STAGING, 'raw');
const FINAL = path.join(STAGING, 'fertig');
const QA = path.join(STAGING, 'qa');
const ITEMS = path.join(ROOT, 'apps/client/src/renderer/assets/items');
const TARGET = 1024;
const BODY_HEIGHT = 880;
const MAX_EXTENT = 960;
const SELECTED = 'a';
const VARIANTS = ['a', 'b'];
const REFERENCES = ['field_cape', 'ranger_cape', 'hardened_warcape', 'warden_greatcloak', 'mariner_cloak'];

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

async function normalize(rawPath, outputPath) {
  const metadata = await sharp(rawPath).metadata();
  if (!metadata.hasAlpha || metadata.channels !== 4) throw new Error(`${rawPath}: no native RGBA`);
  const alphaStats = (await sharp(rawPath).stats()).channels[3];
  if (alphaStats.min !== 0 || alphaStats.max !== 255) throw new Error(`${rawPath}: alpha range is not 0..255`);
  const active = await alphaBox(rawPath, 2);
  const body = await alphaBox(rawPath, 224);
  if (!active || !body) throw new Error(`${rawPath}: no visible cloak body`);
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
  const left = Math.floor((TARGET - width) / 2);
  const top = TARGET - 24 - height;
  if (top < 24) throw new Error(`${rawPath}: normalized cloak violates top safe area`);
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
    bodyBox224: await alphaBox(file, 224),
    sha256: crypto.createHash('sha256').update(data).digest('hex'),
  };
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function labelSvg(width, text, fontSize = 12) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="30"><rect width="100%" height="30" fill="#080a0d"/><text x="7" y="20" font-family="Arial,sans-serif" font-size="${fontSize}" fill="#e8e1d2">${escapeXml(text)}</text></svg>`);
}

async function variantBackgroundSheet(files, name, background) {
  const cell = 360;
  const composites = [];
  for (let index = 0; index < files.length; index += 1) {
    const image = await sharp(files[index]).resize(330, 330, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: image, left: index * cell + 15, top: 30 });
    composites.push({ input: labelSvg(cell, path.basename(files[index], '.png')), left: index * cell, top: 0 });
  }
  await sharp({ create: { width: files.length * cell, height: cell, channels: 3, background } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, name));
}

async function familyContact(previews) {
  const sources = [
    ...REFERENCES.slice(0, 4).map((id) => ({ label: id, file: path.join(ITEMS, `${id}.webp`) })),
    { label: 'VARIANTE A', file: previews.a },
    { label: 'VARIANTE B', file: previews.b },
    { label: 'OBERE GRENZE · mariner_cloak', file: path.join(ITEMS, 'mariner_cloak.webp') },
  ];
  const cell = 260;
  const columns = 4;
  const rows = Math.ceil(sources.length / columns);
  const composites = [];
  for (let index = 0; index < sources.length; index += 1) {
    const left = (index % columns) * cell;
    const top = Math.floor(index / columns) * cell;
    const image = await sharp(sources[index].file).resize(224, 224, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: image, left: left + 18, top: top + 30 });
    composites.push({ input: labelSvg(cell, sources[index].label, 11), left, top });
  }
  await sharp({ create: { width: columns * cell, height: rows * cell, channels: 3, background: '#101318' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-neben-bestand.png'));
}

async function sizeContact(previews) {
  const sources = [
    { label: 'field', file: path.join(ITEMS, 'field_cape.webp') },
    { label: 'ranger', file: path.join(ITEMS, 'ranger_cape.webp') },
    { label: 'hardened', file: path.join(ITEMS, 'hardened_warcape.webp') },
    { label: 'variant-a', file: previews.a },
    { label: 'variant-b', file: previews.b },
    { label: 'mariner', file: path.join(ITEMS, 'mariner_cloak.webp') },
  ];
  const sizes = [48, 96, 128];
  const cellWidth = 180;
  const cellHeight = 178;
  const composites = [];
  for (let row = 0; row < sizes.length; row += 1) {
    for (let column = 0; column < sources.length; column += 1) {
      const size = sizes[row];
      const image = await sharp(sources[column].file).resize(size, size, { fit: 'contain' }).png().toBuffer();
      const left = column * cellWidth + Math.floor((cellWidth - size) / 2);
      const top = row * cellHeight + 36;
      composites.push({ input: image, left, top });
      composites.push({ input: labelSvg(cellWidth, `${size}px · ${sources[column].label}`, 11), left: column * cellWidth, top: row * cellHeight });
    }
  }
  await sharp({ create: { width: sources.length * cellWidth, height: sizes.length * cellHeight, channels: 3, background: '#101318' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-ui-48-96-128.png'));
}

// codex:2026-08-25T21:31:00+02:00 — compare the selected cape with Brenna and the established Slayer material palette.
async function slayerLineContact(selectedPreview) {
  const sources = [
    { label: 'FINALWAHL · Jägerumhang', file: selectedPreview },
    { label: 'slayer_helm', file: path.join(ITEMS, 'slayer_helm.webp') },
    { label: 'slayer_greaves', file: path.join(ITEMS, 'slayer_greaves.webp') },
    { label: 'slayer_vambraces', file: path.join(ITEMS, 'slayer_vambraces.webp') },
    { label: 'Brenna Aschenweide', file: path.join(ROOT, 'apps/client/src/renderer/assets/portraits/slayermaster_brenna_ashwick.webp') },
  ];
  const cell = 240;
  const composites = [];
  for (let index = 0; index < sources.length; index += 1) {
    const image = await sharp(sources[index].file).resize(210, 210, { fit: 'contain' }).png().toBuffer();
    composites.push({ input: image, left: index * cell + 15, top: 30 });
    composites.push({ input: labelSvg(cell, sources[index].label, 11), left: index * cell, top: 0 });
  }
  await sharp({ create: { width: sources.length * cell, height: cell, channels: 3, background: '#101318' } })
    .composite(composites)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(QA, 'contact-sheet-neben-slayer-linie.png'));
}

const previews = {};
for (const variant of VARIANTS) {
  const rawPath = path.join(RAW, `slayer_hunters_cape-variant-${variant}-raw.png`);
  const previewPath = path.join(QA, `slayer_hunters_cape-variant-${variant}-preview.png`);
  await normalize(rawPath, previewPath);
  previews[variant] = previewPath;
}
await fs.copyFile(previews[SELECTED], path.join(FINAL, 'slayer_hunters_cape.png'));

await variantBackgroundSheet(Object.values(previews), 'contact-sheet-black.png', '#050608');
await variantBackgroundSheet(Object.values(previews), 'contact-sheet-gray.png', '#555555');
await variantBackgroundSheet(Object.values(previews), 'contact-sheet-magenta.png', '#ff00ff');
await familyContact(previews);
await sizeContact(previews);
await slayerLineContact(previews[SELECTED]);

const files = [await inspect(previews.a), await inspect(previews.b), await inspect(path.join(FINAL, 'slayer_hunters_cape.png'))];
const qa = {
  // codex:2026-08-25T21:18:00+02:00
  generatedAt: '2026-08-25T21:18:00+02:00',
  method: 'native generator alpha preserved; transparent crop, proportional resize and bottom-center placement only; no keying',
  selectedVariant: SELECTED,
  files,
  checks: {
    exactFinalFilename: files[2].file === 'slayer_hunters_cape.png',
    all1024PngSrgb: files.every((entry) => entry.width === 1024 && entry.height === 1024 && entry.format === 'png' && entry.colourSpace === 'srgb'),
    allRgbaWithUsedAlpha: files.every((entry) => entry.channels === 4 && entry.hasAlpha && entry.transparentPixels > 0 && entry.partialAlphaPixels > 0 && entry.opaquePixels > 0),
    allOuter16Transparent: files.every((entry) => entry.outer16NonZero === 0),
    allBodyHeightsWithin80To90Percent: files.every((entry) => entry.bodyBox224 && entry.bodyBox224.height >= 819 && entry.bodyBox224.height <= 922),
  },
};
await fs.writeFile(path.join(QA, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
