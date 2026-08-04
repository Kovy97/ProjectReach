// codex:2026-08-02T13:38:00+02:00
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const workspaceRoot = path.resolve(import.meta.dirname, '..', '..', '..', '..');
const controlDir = path.join(
  workspaceRoot,
  'CODEX',
  'AssetControl',
  'NewHaven-Calibration-2026-08-02',
);

const assets = [
  ['camp_townhall_1', 'Town Hall I'],
  ['camp_fishing_hut_1', "Fisher's Hut I"],
  ['camp_watchtower_1', 'Watchtower I'],
  ['camp_seed_garden_1', 'Seed Garden I'],
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

async function polishAsset(id) {
  const assetPath = path.join(controlDir, `${id}.png`);
  const backupPath = path.join(controlDir, 'pre-polish', `${id}.png`);

  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  try {
    await fs.access(backupPath);
  } catch {
    await fs.copyFile(assetPath, backupPath);
  }

  // codex:2026-08-02T13:42:00+02:00 — Always rebuild from the preserved pre-polish source.
  const image = sharp(backupPath).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  let fringePixels = 0;
  let occupiedPixels = 0;
  let residualMagentaPixels = 0;

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha === 0) continue;

    occupiedPixels += 1;
    const magentaExcess = Math.min(red, blue) - green;
    const magentaDominance = red + blue - green * 2;

    if (magentaExcess > 7 && magentaDominance > 20) {
      fringePixels += 1;
      const strength = clamp((magentaExcess - 7) / 42, 0, 1);
      const neutralTarget = Math.round((red + blue + green * 2) / 4);
      data[offset] = Math.round(red + (neutralTarget - red) * strength);
      data[offset + 1] = Math.round(green + (neutralTarget - green) * strength * 0.72);
      data[offset + 2] = Math.round(blue + (neutralTarget - blue) * strength);

      if (alpha < 245) {
        data[offset + 3] = Math.round(alpha * (1 - strength * 0.72));
      }
    }

    const polishedExcess = Math.min(data[offset], data[offset + 2]) - data[offset + 1];
    if (data[offset + 3] > 32 && polishedExcess > 12) residualMagentaPixels += 1;
  }

  const tempPath = path.join(controlDir, `${id}.polished.png`);
  await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(tempPath);
  await fs.rename(tempPath, assetPath);

  const alphaStats = await sharp(assetPath).extractChannel('alpha').stats();
  return {
    id,
    width: info.width,
    height: info.height,
    channels: info.channels,
    occupiedPixels,
    fringePixels,
    residualMagentaPixels,
    residualMagentaRatio: occupiedPixels === 0 ? 0 : residualMagentaPixels / occupiedPixels,
    alphaMin: alphaStats.channels[0].min,
    alphaMax: alphaStats.channels[0].max,
  };
}

function checkerSvg(width, height) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="checker" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="32" height="32" fill="#15191c"/>
          <rect width="16" height="16" fill="#242a2e"/>
          <rect x="16" y="16" width="16" height="16" fill="#242a2e"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#checker)"/>
    </svg>
  `);
}

function labelSvg(label, width) {
  const safeLabel = label.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`
    <svg width="${width}" height="62" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="62" fill="#0d1012" fill-opacity="0.92"/>
      <line x1="0" y1="1" x2="${width}" y2="1" stroke="#9d7140" stroke-width="2"/>
      <text x="${width / 2}" y="39" text-anchor="middle" fill="#e2c478"
        font-family="Georgia, serif" font-size="25" font-weight="700">${safeLabel}</text>
    </svg>
  `);
}

async function buildContactSheet() {
  const cellWidth = 720;
  const cellHeight = 720;
  const artHeight = cellHeight - 62;
  const sheetWidth = cellWidth * 2;
  const sheetHeight = cellHeight * 2;
  const composites = [];

  for (let index = 0; index < assets.length; index += 1) {
    const [id, label] = assets[index];
    const left = (index % 2) * cellWidth;
    const top = Math.floor(index / 2) * cellHeight;
    const art = await sharp(path.join(controlDir, `${id}.png`))
      // codex:2026-08-02T13:42:00+02:00 — Letterboxing must stay transparent on the QA checker.
      .resize({
        width: cellWidth - 56,
        height: artHeight - 40,
        fit: 'contain',
        withoutEnlargement: true,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const artMeta = await sharp(art).metadata();

    composites.push({ input: checkerSvg(cellWidth, cellHeight), left, top });
    composites.push({
      input: art,
      left: left + Math.round((cellWidth - artMeta.width) / 2),
      top: top + Math.round((artHeight - artMeta.height) / 2),
    });
    composites.push({ input: labelSvg(label, cellWidth), left, top: top + artHeight });
  }

  await sharp({
    create: { width: sheetWidth, height: sheetHeight, channels: 4, background: '#101316' },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(controlDir, 'calibration-contact-sheet.png'));
}

const reports = [];
for (const [id] of assets) reports.push(await polishAsset(id));
await buildContactSheet();
await fs.writeFile(
  path.join(controlDir, 'alpha-polish-report.json'),
  `${JSON.stringify({
    generatedAt: '2026-08-02T13:38:00+02:00',
    method: 'targeted magenta-edge neutralization and translucent-fringe contraction',
    reports,
  }, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(reports, null, 2));
