// codex:2026-08-02T14:05:00+02:00
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..', '..');
const toolDir = path.join(workspaceRoot, 'CODEX', 'work', 'new-haven-consistent-asset-tool');
const controlDir = path.join(workspaceRoot, 'CODEX', 'AssetControl', 'NewHaven-Production-2026-08-02');
const sourceDir = path.join(controlDir, 'source_chromakey');
const manifest = JSON.parse(await fs.readFile(path.join(toolDir, 'manifest.json'), 'utf8'));

const anchorX = manifest.anchor.x;
const anchorY = manifest.anchor.y;
const rankScale = manifest.rankScale;
const buildingById = new Map(manifest.buildings.map((building) => [building.id, building]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function parseFilename(filename) {
  const match = filename.match(/^(camp_.+)_([123])\.png$/);
  if (!match) return null;
  return { id: match[1], rank: Number(match[2]) };
}

function alphaBounds(data, info, threshold = 8) {
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= threshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('No visible subject pixels found');
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

// codex:2026-08-02T15:24:00+02:00
function removeMagenta(data, info) {
  let keyedPixels = 0;
  let residualMagentaPixels = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const originalAlpha = data[offset + 3];
    const magentaExcess = Math.min(red, blue) - green;
    const brightPair = (red + blue) / 2;
    const keyDistance = Math.sqrt((255 - red) ** 2 + green ** 2 + (255 - blue) ** 2);
    const solidKey = red > 175 && blue > 175 && magentaExcess > 58;
    const keyCloseness = clamp((205 - keyDistance) / 155, 0, 1);
    const dominance = clamp((magentaExcess - 18) / 92, 0, 1);
    const brightness = clamp((brightPair - 105) / 105, 0, 1);
    const chromaStrength = solidKey ? 1 : keyCloseness * dominance * brightness;

    if (chromaStrength > 0) {
      keyedPixels += 1;
      data[offset + 3] = chromaStrength > 0.96
        ? 0
        : Math.round(originalAlpha * (1 - chromaStrength));
      const neutral = Math.round((red + blue + green * 2) / 4);
      const despill = clamp((magentaExcess - 4) / 70, 0, 1);
      data[offset] = Math.round(red + (neutral - red) * despill);
      data[offset + 1] = Math.round(green + (neutral - green) * despill * 0.72);
      data[offset + 2] = Math.round(blue + (neutral - blue) * despill);
    }

    const polishedExcess = Math.min(data[offset], data[offset + 2]) - data[offset + 1];
    if (data[offset + 3] > 32 && polishedExcess > 24) residualMagentaPixels += 1;
  }
  return { keyedPixels, residualMagentaPixels };
}

async function processFile(filename) {
  const parsed = parseFilename(filename);
  if (!parsed) return null;
  const building = buildingById.get(parsed.id);
  if (!building) throw new Error(`Unknown building family: ${parsed.id}`);

  const sourcePath = path.join(sourceDir, filename);
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const chroma = removeMagenta(data, info);
  const bounds = alphaBounds(data, info);
  const scale = rankScale[String(parsed.rank)];
  const targetWidth = Math.round(building.rank1Bounds[0] * scale);
  const targetHeight = Math.round(building.rank1Bounds[1] * scale);
  const fitScale = Math.min(targetWidth / bounds.width, targetHeight / bounds.height);
  const finalWidth = Math.max(1, Math.round(bounds.width * fitScale));
  const finalHeight = Math.max(1, Math.round(bounds.height * fitScale));
  const left = Math.round(anchorX - finalWidth / 2);
  const top = anchorY - finalHeight + 1;

  const subject = await sharp(data, { raw: info })
    .extract(bounds)
    .resize({ width: finalWidth, height: finalHeight, fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const outputPath = path.join(controlDir, filename);
  await sharp({
    create: { width: manifest.canvas.width, height: manifest.canvas.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: subject, left, top }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  const final = await sharp(outputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const finalBounds = alphaBounds(final.data, final.info);
  return {
    filename,
    family: parsed.id,
    rank: parsed.rank,
    sourceBounds: [bounds.width, bounds.height],
    targetBox: [targetWidth, targetHeight],
    finalBounds: [finalBounds.width, finalBounds.height],
    centerX: finalBounds.left + (finalBounds.width - 1) / 2,
    baseline: finalBounds.top + finalBounds.height - 1,
    keyedPixels: chroma.keyedPixels,
    residualMagentaPixels: chroma.residualMagentaPixels,
  };
}

const files = (await fs.readdir(sourceDir)).filter((filename) => filename.endsWith('.png')).sort();
const reports = [];
for (const filename of files) {
  const report = await processFile(filename);
  if (report) reports.push(report);
}

await fs.writeFile(
  path.join(controlDir, 'production-qa-report.json'),
  `${JSON.stringify({
    generatedAt: '2026-08-02T14:05:00+02:00',
    status: 'control_assets_only_not_runtime_bound',
    processed: reports.length,
    reports,
  }, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({ processed: reports.length, reports }, null, 2));
