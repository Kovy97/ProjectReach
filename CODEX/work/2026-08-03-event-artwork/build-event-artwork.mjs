// codex:2026-08-03T13:12:00+02:00
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const SOURCE = 'C:/Users/MSchu/.codex/generated_images/019fba2b-d954-7593-958e-229eccdc95c4/exec-828b0a39-fed2-4d87-884a-35ff774d8b1d.png';
const OUTPUT = path.join(ROOT, 'CODEX/AssetControl/event-0.3.0');
const FONT_PATH = path.join(ROOT, 'apps/client/src/renderer/fonts/Cinzel-Regular.ttf');
const GOLD = '#d8b870';
const GOLD_BRIGHT = '#f0dca0';
const GOLD_DIM = '#a07840';
const PARCHMENT = '#e8d8b0';

const fontData = (await fs.readFile(FONT_PATH)).toString('base64');

function ornament(x, y, dx, dy, size) {
  const x2 = x + dx * size;
  const y2 = y + dy * size;
  const inset = 6;
  return `
    <path d="M${x},${y2}V${y}H${x2}" fill="none" stroke="${GOLD}" stroke-width="2"/>
    <path d="M${x + dx * inset},${y + dy * (size - 3)}V${y + dy * inset}H${x + dx * (size - 3)}" fill="none" stroke="${GOLD_DIM}" stroke-width="1"/>
    <path d="M${x - 4},${y} ${x},${y - 4} ${x + 4},${y} ${x},${y + 4}Z" fill="${GOLD}"/>
  `;
}

function overlaySvg(width, height, layout) {
  const { kickerY, titleY, badgeY, titleSize, kickerSize, badgeSize, featureSize, cornerInset, cornerSize } = layout;
  const badgeWidth = width < 1000 ? 158 : 220;
  const badgeHeight = width < 1000 ? 38 : 52;
  const featureY = badgeY + badgeHeight / 2 + featureSize + (width < 1000 ? 13 : 18);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <font-face font-family="GrimCinzel"><font-face-src><font-face-uri href="data:font/ttf;base64,${fontData}"/></font-face-src></font-face>
      <radialGradient id="v" cx="50%" cy="48%" r="72%"><stop offset="0" stop-color="#000" stop-opacity=".08"/><stop offset=".58" stop-color="#000" stop-opacity=".2"/><stop offset="1" stop-color="#000" stop-opacity=".88"/></radialGradient>
      <linearGradient id="stage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#080706" stop-opacity=".78"/><stop offset=".5" stop-color="#0b0805" stop-opacity=".58"/><stop offset="1" stop-color="#080706" stop-opacity=".38"/></linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GOLD_BRIGHT}"/><stop offset="1" stop-color="${GOLD}"/></linearGradient>
      <filter id="shadow"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#v)"/>
    <rect x="0" y="${Math.max(0, kickerY - 58)}" width="${width}" height="${badgeY - kickerY + 120}" fill="url(#stage)"/>
    <g opacity=".98">
      ${ornament(cornerInset, cornerInset, 1, 1, cornerSize)}
      ${ornament(width - cornerInset, cornerInset, -1, 1, cornerSize)}
      ${ornament(cornerInset, height - cornerInset, 1, -1, cornerSize)}
      ${ornament(width - cornerInset, height - cornerInset, -1, -1, cornerSize)}
    </g>
    <g font-family="GrimCinzel,Georgia,serif" text-anchor="middle">
      <line x1="${width * .18}" y1="${kickerY}" x2="${width * .34}" y2="${kickerY}" stroke="${GOLD_DIM}" stroke-width="1"/>
      <line x1="${width * .66}" y1="${kickerY}" x2="${width * .82}" y2="${kickerY}" stroke="${GOLD_DIM}" stroke-width="1"/>
      <path d="M${width * .35 - 4},${kickerY} ${width * .35},${kickerY - 4} ${width * .35 + 4},${kickerY} ${width * .35},${kickerY + 4}Z" fill="${GOLD}"/>
      <path d="M${width * .65 - 4},${kickerY} ${width * .65},${kickerY - 4} ${width * .65 + 4},${kickerY} ${width * .65},${kickerY + 4}Z" fill="${GOLD}"/>
      <text x="${width / 2}" y="${kickerY + kickerSize * .34}" font-size="${kickerSize}" letter-spacing="${width < 1000 ? 4 : 7}" fill="${GOLD}">GRIM REACH · UPDATE 0.3.0</text>
      <text x="${width / 2 + 2}" y="${titleY + 3}" font-size="${titleSize}" letter-spacing="${width < 1000 ? 5 : 9}" fill="#100b06" opacity=".95">NEW HAVEN</text>
      <text x="${width / 2}" y="${titleY}" font-size="${titleSize}" letter-spacing="${width < 1000 ? 5 : 9}" fill="url(#gold)">NEW HAVEN</text>
      <!-- codex:2026-08-03T13:18:00+02:00 -->
      <g transform="translate(${width / 2 - badgeWidth / 2},${badgeY - badgeHeight / 2})">
        <rect x="0" y="0" width="${badgeWidth}" height="${badgeHeight}" rx="3" fill="#0c0805" fill-opacity=".92" stroke="${GOLD}" stroke-width="1.5"/>
        <rect x="4" y="4" width="${badgeWidth - 8}" height="${badgeHeight - 8}" rx="2" fill="none" stroke="${GOLD_DIM}" stroke-width="1"/>
        <text x="${badgeWidth / 2}" y="${badgeHeight / 2 + badgeSize * .36}" font-size="${badgeSize}" letter-spacing="${width < 1000 ? 2 : 3}" fill="${GOLD_BRIGHT}">NEW FRONTIER</text>
      </g>
      <text x="${width / 2}" y="${featureY}" font-size="${featureSize}" letter-spacing="${width < 1000 ? .6 : 1.4}" fill="${PARCHMENT}">15 BUILDINGS · 3 TIERS · ONE LAST WATCHFIRE</text>
    </g>
  </svg>`);
}

async function baseFor(width, height, focusY = .5) {
  // codex:2026-08-03T13:15:00+02:00
  const position = focusY > .6 ? 'south' : 'centre';
  return sharp(SOURCE)
    .resize(width, height, { fit: 'cover', position })
    .modulate({ brightness: .78, saturation: .72 })
    .blur(.35);
}

async function render(name, width, height, focusY, layout) {
  const target = path.join(OUTPUT, name);
  await (await baseFor(width, height, focusY))
    .composite([{ input: overlaySvg(width, height, layout), left: 0, top: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(target);
  return target;
}

await fs.mkdir(OUTPUT, { recursive: true });
await fs.copyFile(SOURCE, path.join(OUTPUT, 'source_new_haven_watchfire.png'));

const cover = await render('event_new_haven_capsule_800x450.png', 800, 450, .5, {
  kickerY: 140, titleY: 225, badgeY: 298, titleSize: 65, kickerSize: 15,
  badgeSize: 13, featureSize: 12, cornerInset: 26, cornerSize: 28
});
const header = await render('event_new_haven_header_1920x622.png', 1920, 622, .67, {
  kickerY: 202, titleY: 315, badgeY: 410, titleSize: 92, kickerSize: 23,
  badgeSize: 18, featureSize: 17, cornerInset: 40, cornerSize: 36
});

const preview = sharp({ create: { width: 1920, height: 1160, channels: 3, background: '#0b0d0f' } });
const coverPreview = await sharp(cover).resize(800, 450).toBuffer();
const headerPreview = await sharp(header).toBuffer();
await preview.composite([
  { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1160"><rect width="1920" height="1160" fill="#0b0d0f"/><text x="40" y="42" font-family="Georgia,serif" font-size="22" fill="#d8b870">TARGET-SIZE REVIEW · 800×450 + 1920×622</text></svg>') },
  { input: coverPreview, left: 40, top: 70 },
  { input: headerPreview, left: 0, top: 538 }
]).png({ compressionLevel: 9 }).toFile(path.join(OUTPUT, 'preview-target-sizes.png'));

await fs.writeFile(path.join(OUTPUT, 'README.md'), `<!-- codex:2026-08-03T13:12:00+02:00 -->\n# New Haven · Steam Event Artwork\n\n- Capsule: \`event_new_haven_capsule_800x450.png\`\n- Header: \`event_new_haven_header_1920x622.png\`\n- Combined target-size review: \`preview-target-sizes.png\`\n- Unlettered source: \`source_new_haven_watchfire.png\`\n- Status: CODEX staging; no Steam upload and no runtime binding\n- Typography: deterministic Cinzel from the renderer font bundle\n- Motif: watchfire, patched camp, palisade hint and ruined road-waystation; no creatures\n\nThe status-neutral badge NEW FRONTIER avoids making an unapproved release-date or availability claim.\n`, 'utf8');
