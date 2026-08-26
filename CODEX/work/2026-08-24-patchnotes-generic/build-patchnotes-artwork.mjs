// codex:2026-08-24T15:10:00+02:00
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const OUTPUT = path.join(ROOT, 'CODEX/AssetControl/patchnotes-generic');
const SOURCE = path.join(OUTPUT, 'source_patchnotes_generic.png');
const LOGO = path.join(ROOT, 'apps/client/src/renderer/assets/ui/mainmenu_logo.webp');
const FONT = path.join(ROOT, 'apps/client/src/renderer/fonts/Cinzel-Regular.ttf');

const GOLD = '#d2ad62';
const GOLD_BRIGHT = '#f0d79b';
const GOLD_DIM = '#76562c';
const CRIMSON = '#711d20';
const IRON_LIGHT = '#d6d2c7';
const IRON_MID = '#92918d';
const IRON_DARK = '#4b4d50';
const LABEL = 'PATCH NOTES';

const fontData = (await fs.readFile(FONT)).toString('base64');

function cornerOrnament(x, y, dx, dy, size) {
  const x2 = x + dx * size;
  const y2 = y + dy * size;
  return `
    <path d="M${x},${y2}V${y}H${x2}" fill="none" stroke="${GOLD}" stroke-width="2"/>
    <path d="M${x + dx * 7},${y + dy * (size - 4)}V${y + dy * 7}H${x + dx * (size - 4)}"
      fill="none" stroke="${GOLD_DIM}" stroke-width="1"/>
    <path d="M${x - 4},${y} ${x},${y - 4} ${x + 4},${y} ${x},${y + 4}Z" fill="${GOLD_BRIGHT}"/>
  `;
}

function treatmentSvg(width, height, layout) {
  const { logoTop, logoHeight, badgeY, badgeWidth, badgeHeight, badgeSize, cornerInset, cornerSize } = layout;
  const centre = width / 2;
  const stageTop = Math.max(0, logoTop - 18);
  const stageBottom = Math.min(height, badgeY + badgeHeight + 38);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <font-face font-family="GrimCinzel"><font-face-src><font-face-uri href="data:font/ttf;base64,${fontData}"/></font-face-src></font-face>
      <radialGradient id="vignette" cx="50%" cy="48%" r="75%">
        <stop offset="0" stop-color="#020407" stop-opacity=".02"/>
        <stop offset=".62" stop-color="#020407" stop-opacity=".17"/>
        <stop offset="1" stop-color="#010204" stop-opacity=".76"/>
      </radialGradient>
      <linearGradient id="stage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#030508" stop-opacity=".61"/>
        <stop offset=".58" stop-color="#030508" stop-opacity=".32"/>
        <stop offset="1" stop-color="#030508" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="badge" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#15191d" stop-opacity=".98"/>
        <stop offset=".5" stop-color="#090b0e" stop-opacity=".98"/>
        <stop offset="1" stop-color="#17191b" stop-opacity=".98"/>
      </linearGradient>
      <linearGradient id="metalText" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${IRON_LIGHT}"/>
        <stop offset=".42" stop-color="#f0ece0"/>
        <stop offset=".5" stop-color="${IRON_DARK}"/>
        <stop offset=".62" stop-color="${IRON_MID}"/>
        <stop offset="1" stop-color="#c1bcae"/>
      </linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>
    <rect x="0" y="${stageTop}" width="${width}" height="${stageBottom - stageTop}" fill="url(#stage)"/>
    <ellipse cx="${centre}" cy="${logoTop + logoHeight * .52}" rx="${logoHeight * 1.18}" ry="${logoHeight * .46}"
      fill="#000" opacity=".34" filter="url(#soft)"/>
    <g opacity=".9">
      ${cornerOrnament(cornerInset, cornerInset, 1, 1, cornerSize)}
      ${cornerOrnament(width - cornerInset, cornerInset, -1, 1, cornerSize)}
      ${cornerOrnament(cornerInset, height - cornerInset, 1, -1, cornerSize)}
      ${cornerOrnament(width - cornerInset, height - cornerInset, -1, -1, cornerSize)}
    </g>
    <g transform="translate(${centre - badgeWidth / 2},${badgeY})" font-family="GrimCinzel,Georgia,serif" text-anchor="middle">
      <rect width="${badgeWidth}" height="${badgeHeight}" rx="3" fill="url(#badge)" stroke="${IRON_MID}" stroke-width="1.8"/>
      <rect x="5" y="5" width="${badgeWidth - 10}" height="${badgeHeight - 10}" rx="2" fill="none" stroke="#482226" stroke-width="1"/>
      <path d="M${badgeWidth / 2 - 4},${badgeHeight * .22} ${badgeWidth / 2},${badgeHeight * .14} ${badgeWidth / 2 + 4},${badgeHeight * .22} ${badgeWidth / 2},${badgeHeight * .3}Z"
        fill="${CRIMSON}"/>
      <text x="${badgeWidth / 2}" y="${badgeHeight / 2 + badgeSize * .42}" font-size="${badgeSize}" font-weight="700"
        letter-spacing="${badgeSize * .16}" fill="url(#metalText)" stroke="#050608" stroke-width="1.25" paint-order="stroke fill">${LABEL}</text>
    </g>
  </svg>`);
}

async function backgroundFor(width, height) {
  return sharp(SOURCE)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: .78, saturation: .72 })
    .sharpen({ sigma: .45 });
}

async function logoBuffer(width, height) {
  return sharp(LOGO)
    .resize(width, height, { fit: 'contain', withoutEnlargement: false })
    .png()
    .toBuffer();
}

async function render(name, width, height, layout) {
  const logoWidth = Math.round(layout.logoHeight * 16 / 9);
  const logoLeft = Math.round((width - logoWidth) / 2);
  const target = path.join(OUTPUT, name);
  const background = await backgroundFor(width, height);
  await background
    .composite([
      { input: treatmentSvg(width, height, layout), left: 0, top: 0 },
      { input: await logoBuffer(logoWidth, layout.logoHeight), left: logoLeft, top: layout.logoTop }
    ])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(target);
  return target;
}

await fs.mkdir(OUTPUT, { recursive: true });

const capsule = await render('grim_reach_patchnotes_main_capsule_800x450.png', 800, 450, {
  logoTop: 4,
  logoHeight: 238,
  badgeY: 260,
  badgeWidth: 230,
  badgeHeight: 42,
  badgeSize: 15,
  cornerInset: 24,
  cornerSize: 28
});

const title = await render('grim_reach_patchnotes_title_1920x622.png', 1920, 622, {
  logoTop: 3,
  logoHeight: 340,
  badgeY: 374,
  badgeWidth: 350,
  badgeHeight: 56,
  badgeSize: 22,
  cornerInset: 38,
  cornerSize: 38
});

const capsulePreview = await sharp(capsule).toBuffer();
const titlePreview = await sharp(title).toBuffer();
await sharp({ create: { width: 1920, height: 1160, channels: 3, background: '#080b0f' } })
  .composite([
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1160"><text x="40" y="46" font-family="Georgia,serif" font-size="23" fill="${GOLD}">GRIM REACH · GENERIC PATCH NOTES · 800×450 + 1920×622</text></svg>`) },
    { input: capsulePreview, left: 40, top: 74 },
    { input: titlePreview, left: 0, top: 538 }
  ])
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(path.join(OUTPUT, 'preview-target-sizes.png'));

async function inspect(file) {
  const data = await fs.readFile(file);
  const metadata = await sharp(data).metadata();
  return {
    file: path.basename(file),
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    sha256: crypto.createHash('sha256').update(data).digest('hex')
  };
}

const qa = {
  generatedAt: '2026-08-24T15:10:00+02:00',
  reusableFor: ['patches', 'hotfixes', 'updates'],
  label: LABEL,
  source: path.basename(SOURCE),
  logo: 'apps/client/src/renderer/assets/ui/mainmenu_logo.webp',
  files: [await inspect(capsule), await inspect(title)]
};
await fs.writeFile(path.join(OUTPUT, 'qa.json'), `${JSON.stringify(qa, null, 2)}\n`, 'utf8');
