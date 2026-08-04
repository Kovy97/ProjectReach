// codex:2026-08-03T11:40:00+02:00
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const ROOT = 'G:/GameDev';
const OUTPUT = path.join(ROOT, 'CODEX/AssetControl/micro-icon-sets-2026-08-03');
const GOLD = '#d7ad55';
const GOLD_HI = '#f0d27d';
const COPPER = '#9a5b35';
const IRON = '#252a2d';
const PANEL = '#111518';
const PANEL_ALT = '#171b1e';
const MUTED = '#9ca3a6';

// codex:2026-08-03T11:40:00+02:00
const warningBody = `
  <path class="p" d="M256 72 458 426H54Z"/>
  <path class="p" d="M256 178v116"/>
  <circle class="f" cx="256" cy="358" r="25"/>
`;

const sets = [
  {
    id: '01-action-queue',
    title: 'ACTION QUEUE',
    subtitle: 'Operative Reihenfolge, Blockaden und Priorität',
    icons: [
      { id: 'icon_queue_list', label: 'Queue / Liste', body: `
        <path class="p" d="M158 142h270M158 256h270M158 370h270"/>
        <path class="c" d="m72 142 34-34 34 34-34 34Z"/>
        <path class="c" d="m72 256 34-34 34 34-34 34Z"/>
        <path class="c" d="m72 370 34-34 34 34-34 34Z"/>
      ` },
      { id: 'icon_queue_warning', label: 'Warnung', body: warningBody },
      { id: 'icon_queue_blocked', label: 'Zeitblock / Blockiert', body: `
        <path class="p" d="M144 76h224M144 436h224M176 90c0 90 80 105 80 166s-80 76-80 166M336 90c0 90-80 105-80 166s80 76 80 166"/>
        <path class="c" d="M112 256h288"/>
        <circle class="fc" cx="256" cy="256" r="40"/>
      ` },
      { id: 'icon_queue_priority', label: 'Priorität / Start', body: `
        <path class="p" d="m274 54-132 226h106l-18 178 140-250H262Z"/>
        <path class="c" d="M88 420h116M308 92h116"/>
      ` },
      { id: 'icon_queue_arrow_up', label: 'Nach oben', body: `
        <path class="p" d="M256 424V104M112 248l144-144 144 144"/>
        <path class="c" d="M112 424h288"/>
      ` },
      { id: 'icon_queue_arrow_down', label: 'Nach unten', body: `
        <path class="p" d="M256 88v320M112 264l144 144 144-144"/>
        <path class="c" d="M112 88h288"/>
      ` }
    ]
  },
  {
    id: '02-quest-semantics',
    title: 'QUEST SEMANTICS',
    subtitle: 'Contract-Wall-Metadaten ohne Emoji-Sprache',
    icons: [
      { id: 'icon_quest_ticket', label: 'Ticket / Token', body: `
        <path class="p" d="M76 156h360v62c-50 0-50 76 0 76v62H76v-62c50 0 50-76 0-76Z"/>
        <path class="c" d="M256 178v156"/>
        <circle class="fc" cx="256" cy="256" r="28"/>
      ` },
      { id: 'icon_quest_pin', label: 'Orts-Pin', body: `
        <path class="p" d="M256 454s132-132 132-260a132 132 0 1 0-264 0c0 128 132 260 132 260Z"/>
        <circle class="c" cx="256" cy="194" r="48"/>
      ` },
      { id: 'icon_quest_dialog', label: 'Dialog', body: `
        <path class="p" d="M70 98h372v250H232l-92 72v-72H70Z"/>
        <circle class="fc" cx="166" cy="224" r="22"/><circle class="fc" cx="256" cy="224" r="22"/><circle class="fc" cx="346" cy="224" r="22"/>
      ` },
      { id: 'icon_quest_calendar', label: 'Kalender', body: `
        <rect class="p" x="76" y="112" width="360" height="326" rx="28"/>
        <path class="p" d="M76 210h360M166 72v82M346 72v82"/>
        <path class="c" d="m188 316 46 46 98-104"/>
      ` },
      { id: 'icon_quest_journal', label: 'Journal / Buch', body: `
        <path class="p" d="M92 94h258c40 0 70 30 70 70v274H162c-40 0-70-30-70-70Z"/>
        <path class="p" d="M162 94v344M214 172h142M214 250h142"/>
        <path class="c" d="M304 94v140l52-34 52 34V112"/>
      ` },
      { id: 'icon_quest_coin', label: 'Münze', body: `
        <circle class="p" cx="256" cy="256" r="180"/>
        <circle class="c" cx="256" cy="256" r="120"/>
        <path class="p" d="M300 160h-70c-44 0-66 20-66 52 0 76 184 16 184 92 0 30-24 50-68 50h-86M256 124v264"/>
      ` }
    ]
  },
  {
    id: '03-achievements',
    title: 'ACHIEVEMENT CATEGORIES',
    subtitle: 'Geschlossenes Kategorien- und Milestone-System',
    icons: [
      { id: 'icon_ach_trophy', label: 'Trophäe', body: `
        <path class="p" d="M168 88h176v94c0 92-40 138-88 138s-88-46-88-138Z"/>
        <path class="p" d="M168 126H82v54c0 64 44 98 98 98M344 126h86v54c0 64-44 98-98 98M256 320v74M168 430h176M208 394h96"/>
      ` },
      // codex:2026-08-03T12:04:00+02:00
      { id: 'icon_ach_forge', label: 'Schmieden', body: `
        <path class="p" d="M66 252h250l92-58 38 58-104 74h-82v52h70v70H152v-70h72v-52H120Z"/>
        <path class="c" d="M128 166 258 72M220 62l102 106"/>
      ` },
      { id: 'icon_ach_combat', label: 'Kampf', body: `
        <path class="p" d="m104 84 112 112-58 58L46 142ZM408 84 296 196l58 58 112-112ZM216 196l138 138M296 196 158 334"/>
        <path class="c" d="m120 296-54 54 96 96 54-54M392 296l54 54-96 96-54-54"/>
      ` },
      { id: 'icon_ach_nature', label: 'Natur', body: `
        <path class="p" d="M256 446V170M256 280c-82 0-144-48-144-144 98 0 144 50 144 144ZM256 338c82 0 144-48 144-144-98 0-144 50-144 144Z"/>
        <path class="c" d="M256 198 178 154M256 274l82-46"/>
      ` },
      { id: 'icon_ach_craft', label: 'Handwerk', body: `
        <path class="p" d="M84 422 326 180M282 94l68-38 106 106-38 68-72-72-42 42Z"/>
        <path class="c" d="m76 286 150 150M80 372l60 60"/>
      ` },
      { id: 'icon_ach_scroll', label: 'Schriftrolle', body: `
        <!-- codex:2026-08-03T12:12:00+02:00 -->
        <path class="p" d="M152 92h214c46 0 68 26 68 58s-22 58-68 58H184v182H90c0 44 26 66 60 66s60-22 60-66h200"/>
        <path class="c" d="M222 278h142M222 344h112"/>
      ` },
      { id: 'icon_ach_gold', label: 'Gold', body: `
        <ellipse class="p" cx="256" cy="142" rx="142" ry="64"/>
        <path class="p" d="M114 142v92c0 36 64 64 142 64s142-28 142-64v-92M114 234v92c0 36 64 64 142 64s142-28 142-64v-92"/>
        <path class="c" d="M256 114v56"/>
      ` },
      { id: 'icon_ach_gift', label: 'Geschenk', body: `
        <path class="p" d="M72 208h368v230H72ZM48 144h416v82H48ZM256 144v294"/>
        <!-- codex:2026-08-03T12:12:00+02:00 -->
        <path class="c" d="M256 144c-62-72-112-86-130-44-18 44 42 68 130 44ZM256 144c62-72 112-86 130-44 18 44-42 68-130 44Z"/>
      ` },
      { id: 'icon_ach_compass', label: 'Kompass', body: `
        <circle class="p" cx="256" cy="256" r="180"/>
        <path class="c" d="m310 202-28 80-80 28 28-80Z"/>
        <path class="p" d="M256 60v42M256 410v42M60 256h42M410 256h42"/>
      ` },
      { id: 'icon_ach_star', label: 'Stern', body: `
        <path class="p" d="m256 58 57 126 137 16-102 92 28 134-120-68-120 68 28-134-102-92 137-16Z"/>
      ` },
      { id: 'icon_ach_milestone', label: 'Milestone-Trophäe', body: `
        <path class="p" d="M174 94h164v92c0 82-36 124-82 124s-82-42-82-124ZM256 310v76M170 430h172"/>
        <path class="c" d="m256 134 20 44 48 6-36 32 10 48-42-24-42 24 10-48-36-32 48-6Z"/>
        <path class="p" d="M174 132H90c0 76 34 112 94 112M338 132h84c0 76-34 112-94 112"/>
      ` },
      { id: 'icon_ach_search', label: 'Lupe', body: `
        <circle class="p" cx="214" cy="214" r="132"/>
        <path class="p" d="m312 312 128 128"/>
        <path class="c" d="M152 214h124M214 152v124"/>
      ` }
    ]
  },
  {
    id: '04-combat-status',
    title: 'COMBAT STATUS',
    subtitle: 'Heilquellen, Bedrohung und Zustandsresistenz',
    icons: [
      { id: 'icon_combat_status_heal_blood', label: 'Heilquelle: Blut', body: `
        <!-- codex:2026-08-03T12:12:00+02:00 -->
        <path class="p" d="M256 60S130 218 130 328a126 126 0 0 0 252 0C382 218 256 60 256 60Z"/>
        <path class="c" d="M256 232v152M180 308h152"/>
      ` },
      // codex:2026-08-03T11:52:00+02:00
      { id: 'icon_combat_status_heal_death', label: 'Heilquelle: Tod', body: `
        <path class="p" d="M126 226c0-92 58-150 130-150s130 58 130 150v92l-48 34-40-26-42 34-42-34-40 26-48-34Z"/>
        <circle class="fc" cx="204" cy="210" r="38"/><circle class="fc" cx="308" cy="210" r="38"/>
        <path class="c" d="M210 292h92"/>
        <path class="c" d="M382 96v104M330 148h104"/>
      ` },
      { id: 'icon_combat_status_heal_spell', label: 'Heilquelle: Zauber', body: `
        <path class="p" d="M256 64 294 202 432 240 294 278 256 416 218 278 80 240 218 202Z"/>
        <path class="c" d="M256 184v112M200 240h112"/>
      ` },
      // codex:2026-08-03T11:52:00+02:00
      { id: 'icon_combat_status_kill', label: 'Kill', body: `
        <path class="p" d="M126 214c0-86 58-142 130-142s130 56 130 142v84l-48 34-40-26-42 34-42-34-40 26-48-34Z"/>
        <circle class="fc" cx="206" cy="208" r="30"/><circle class="fc" cx="306" cy="208" r="30"/>
        <path class="p" d="M220 282h72"/>
        <path class="c" d="m116 438 280-88M368 324l58 14-42 44"/>
      ` },
      { id: 'icon_combat_status_immune', label: 'Immunität', body: `
        <path class="p" d="M256 54 410 112v126c0 108-58 180-154 222-96-42-154-114-154-222V112Z"/>
        <path class="c" d="M158 354 354 158"/>
        <circle class="c" cx="256" cy="256" r="86"/>
      ` },
      { id: 'icon_combat_status_boss', label: 'Boss / Dungeon', body: `
        <path class="p" d="M86 432V184l82-62 88 62 88-62 82 62v248ZM156 432V280h200v152"/>
        <path class="c" d="m178 122 28-70 50 58 50-58 28 70"/>
        <path class="p" d="M256 280v152"/>
      ` },
      { id: 'icon_combat_status_regen', label: 'Regeneration', body: `
        <path class="p" d="M102 230c12-92 78-150 164-150 62 0 112 30 144 76l36-70M410 156l-76-14M410 282c-12 92-78 150-164 150-62 0-112-30-144-76l-36 70M102 356l76 14"/>
        <path class="c" d="M256 188v136M188 256h136"/>
      ` }
    ]
  },
  {
    id: '05-system-empty',
    title: 'SYSTEM / EMPTY STATES',
    subtitle: 'Neutrale Zustände und echte UI-Grafikschalter',
    icons: [
      { id: 'icon_sys_warning', label: 'Warnung', body: warningBody },
      { id: 'icon_sys_idle', label: 'Schlaf / Idle', body: `
        <path class="p" d="M348 92c-112 8-188 88-188 186s78 176 176 176c48 0 92-18 124-50-34 12-62 14-90 6-92-24-146-118-122-210 14-52 50-90 100-108Z"/>
        <path class="c" d="m84 92 32 32-32 32M126 192l38 38-38 38"/>
      ` },
      { id: 'icon_sys_mail', label: 'Brief / Mail', body: `
        <rect class="p" x="62" y="116" width="388" height="286" rx="24"/>
        <path class="p" d="m76 140 180 142 180-142M76 378l126-118M436 378 310 260"/>
        <circle class="fc" cx="392" cy="126" r="38"/>
      ` },
      { id: 'icon_sys_folder', label: 'Ordner', body: `
        <path class="p" d="M58 150h152l44 54h200v234H58Z"/>
        <path class="c" d="M58 240h396"/>
      ` },
      { id: 'icon_sys_checkbox_on', label: 'Checkbox an', body: `
        <rect class="p" x="76" y="76" width="360" height="360" rx="34"/>
        <path class="c" d="m148 256 74 76 150-170"/>
      ` },
      { id: 'icon_sys_checkbox_off', label: 'Checkbox aus', body: `
        <rect class="p" x="76" y="76" width="360" height="360" rx="34"/>
        <path class="c" d="M174 256h164"/>
      ` },
      // codex:2026-08-03T13:03:00+02:00
      { id: 'icon_sys_save', label: 'Speichern', body: `
        <path class="p" d="M82 74h300l48 48v316H82Z"/>
        <path class="p" d="M154 74v132h202V74M154 438V284h202v154"/>
        <path class="c" d="M202 334h106M202 382h72"/>
      ` },
      // codex:2026-08-03T13:03:00+02:00
      { id: 'icon_sys_back', label: 'Zurück', body: `
        <path class="p" d="M238 114 92 256l146 142M102 256h170c96 0 154 54 154 152"/>
        <path class="c" d="M426 408v-92"/>
      ` }
    ]
  }
];

// codex:2026-08-03T11:40:00+02:00
function iconSvg(body, size = 512) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
    <style>
      .p,.c{fill:none;stroke-linecap:round;stroke-linejoin:round}
      .p{stroke:${GOLD};stroke-width:44}.c{stroke:${COPPER};stroke-width:48}
      .f{fill:${GOLD_HI};stroke:${IRON};stroke-width:16}.fc{fill:${COPPER};stroke:${IRON};stroke-width:16}
    </style>${body}</svg>`);
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

async function renderTiny(body, size) {
  return sharp(iconSvg(body)).resize(size, size, { fit: 'contain', kernel: sharp.kernel.lanczos3 }).png().toBuffer();
}

async function renderPixelInspection(body) {
  const tiny = await renderTiny(body, 16);
  return sharp(tiny).resize(128, 128, { kernel: sharp.kernel.nearest }).png().toBuffer();
}

// codex:2026-08-03T12:04:00+02:00
function hash(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function alphaAudit(buffer) {
  const image = sharp(buffer).ensureAlpha();
  const metadata = await image.metadata();
  const raw = await image.raw().toBuffer();
  let minX = metadata.width;
  let minY = metadata.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < metadata.height; y += 1) {
    for (let x = 0; x < metadata.width; x += 1) {
      if (raw[(y * metadata.width + x) * 4 + 3] > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const corners = [
    raw[3],
    raw[(metadata.width - 1) * 4 + 3],
    raw[((metadata.height - 1) * metadata.width) * 4 + 3],
    raw[(metadata.height * metadata.width - 1) * 4 + 3]
  ];
  return {
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    hasAlpha: metadata.hasAlpha,
    corners,
    alphaBounds: { minX, minY, maxX, maxY },
    outerMarginTransparent: minX >= 24 && minY >= 24 && maxX <= 487 && maxY <= 487
  };
}

async function produceSet(set) {
  const dir = path.join(OUTPUT, set.id, 'production');
  await fs.mkdir(dir, { recursive: true });
  const records = [];
  for (const icon of set.icons) {
    const master = sharp(iconSvg(icon.body));
    const png = await master.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer();
    const webp = await master.clone().webp({ lossless: true, effort: 6, alphaQuality: 100 }).toBuffer();
    const pngName = `${icon.id}.png`;
    const webpName = `${icon.id}.webp`;
    await fs.writeFile(path.join(dir, pngName), png);
    await fs.writeFile(path.join(dir, webpName), webp);
    records.push({
      id: icon.id,
      label: icon.label,
      png: { file: pngName, bytes: png.length, sha256: hash(png), audit: await alphaAudit(png) },
      webp: { file: webpName, bytes: webp.length, sha256: hash(webp), audit: await alphaAudit(webp) }
    });
  }
  await fs.writeFile(path.join(dir, 'manifest.json'), JSON.stringify({ set: set.id, count: records.length, records }, null, 2), 'utf8');
  return records;
}

function textLayer(width, height, fragments) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <style>
      .title{font:700 30px 'Segoe UI',sans-serif;letter-spacing:2px;fill:${GOLD_HI}}
      .sub{font:400 17px 'Segoe UI',sans-serif;fill:${MUTED}}
      .label{font:600 16px 'Segoe UI',sans-serif;fill:#e5e0d4}
      .size{font:500 13px 'Segoe UI',sans-serif;fill:${MUTED}}
      .id{font:400 12px ui-monospace,monospace;fill:${COPPER}}
    </style>${fragments.join('')}</svg>`);
}

// codex:2026-08-03T11:40:00+02:00
async function buildBoard(set) {
  const columns = Math.min(6, set.icons.length);
  const rows = Math.ceil(set.icons.length / columns);
  const cellW = 286;
  const cellH = 310;
  const margin = 44;
  const headerH = 118;
  const width = margin * 2 + columns * cellW;
  const height = headerH + rows * cellH + margin;
  const composites = [];
  const text = [
    `<text class="title" x="${margin}" y="48">${escapeXml(set.title)} — 14 / 16 / 20 PX GATE</text>`,
    `<text class="sub" x="${margin}" y="80">${escapeXml(set.subtitle)}</text>`,
    `<text class="size" x="${width - margin}" y="48" text-anchor="end">ASHEN IRON · FLAT GOLD / COPPER · TRANSPARENT GLYPHS</text>`
  ];

  for (let index = 0; index < set.icons.length; index += 1) {
    const icon = set.icons[index];
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = margin + col * cellW;
    const y = headerH + row * cellH;
    const cardSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cellW - 14}" height="${cellH - 14}">
      <rect x="1" y="1" width="${cellW - 16}" height="${cellH - 16}" rx="8" fill="${PANEL_ALT}" stroke="#49372a" stroke-width="2"/>
      <path d="M16 58H${cellW - 30}" stroke="#5c472e" stroke-width="1"/>
      <rect x="122" y="82" width="132" height="146" rx="5" fill="#0c0f11" stroke="#2e363a"/>
    </svg>`);
    composites.push({ input: cardSvg, left: x, top: y });
    text.push(`<text class="label" x="${x + 14}" y="${y + 28}">${escapeXml(icon.label)}</text>`);
    text.push(`<text class="id" x="${x + 14}" y="${y + 48}">${escapeXml(icon.id)}</text>`);
    text.push(`<text class="size" x="${x + 20}" y="${y + 100}">14</text><text class="size" x="${x + 52}" y="${y + 100}">16</text><text class="size" x="${x + 87}" y="${y + 100}">20</text>`);
    text.push(`<text class="size" x="${x + 188}" y="${y + 250}" text-anchor="middle">16 px × 8 inspection</text>`);
    for (const [size, left, top] of [[14, 20, 112], [16, 52, 111], [20, 86, 109]]) {
      composites.push({ input: await renderTiny(icon.body, size), left: x + left, top: y + top });
    }
    composites.push({ input: await renderPixelInspection(icon.body), left: x + 124, top: y + 90 });
  }

  composites.push({ input: textLayer(width, height, text), left: 0, top: 0 });
  const board = sharp({ create: { width, height, channels: 4, background: PANEL } }).composite(composites);
  const dir = path.join(OUTPUT, set.id);
  await fs.mkdir(dir, { recursive: true });
  await board.png().toFile(path.join(dir, 'review-board.png'));
}

// codex:2026-08-03T11:40:00+02:00
function htmlIcon(icon, size) {
  return `<span class="glyph" style="width:${size}px;height:${size}px">${iconSvg(icon.body, size).toString()}</span>`;
}

function buildHtml() {
  const sections = sets.map((set) => `<section><header><span>${set.title}</span><small>${set.subtitle}</small></header><div class="grid">${set.icons.map((icon) => `
    <article><h2>${icon.label}</h2><code>${icon.id}</code><div class="sizes">${[14, 16, 20].map((size) => `<label>${htmlIcon(icon, size)}<b>${size}</b></label>`).join('')}</div><div class="zoom">${htmlIcon(icon, 128)}</div></article>`).join('')}</div></section>`).join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grim Reach Micro-Icon Review</title><style>
  /* codex:2026-08-03T11:40:00+02:00 */
  :root{color-scheme:dark;font-family:Segoe UI,sans-serif;background:#0b0e10;color:#e5e0d4}*{box-sizing:border-box}body{margin:0;padding:32px;background:radial-gradient(circle at top,#20262a,#0b0e10 42%)}main{max-width:1700px;margin:auto}h1{color:${GOLD_HI};letter-spacing:.08em;margin:0}.intro{color:${MUTED};max-width:850px;line-height:1.5}section{margin:28px 0;border:1px solid #49372a;background:#111518;padding:20px}section>header{display:flex;gap:16px;align-items:baseline;color:${GOLD_HI};font-weight:800;letter-spacing:.08em}section>header small{color:${MUTED};font-weight:400;letter-spacing:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:18px}article{position:relative;min-height:250px;padding:14px;border:1px solid #49372a;background:#171b1e}h2{font-size:15px;margin:0 0 4px}code{font-size:11px;color:${COPPER}}.sizes{display:flex;gap:22px;align-items:end;margin-top:28px}.sizes label{display:grid;place-items:center;gap:7px;color:${MUTED};font-size:11px}.glyph{display:inline-grid;place-items:center}.glyph svg{display:block;width:100%;height:100%}.zoom{position:absolute;right:18px;bottom:18px;width:128px;height:128px;background:#0c0f11;border:1px solid #2e363a;display:grid;place-items:center}.zoom .glyph{image-rendering:pixelated}footer{color:${MUTED};font-size:12px;padding:12px 0 36px}</style></head><body><main><h1>GRIM REACH · MICRO-ICON GATE</h1><p class="intro">Fünf produktionsfertige Micro-Icon-Sets in einem gemeinsamen Ashen-Iron-System. Links stehen die tatsächlichen 14/16/20-px-Anwendungen; die große Ansicht dient der Formprüfung.</p>${sections}<footer>Staging only · no runtime binding · transparent 512 px PNG + lossless WebP</footer></main></body></html>`;
}

// codex:2026-08-03T11:40:00+02:00
async function main() {
  await fs.mkdir(OUTPUT, { recursive: true });
  for (const set of sets) await buildBoard(set);
  // codex:2026-08-03T12:04:00+02:00
  const production = {};
  for (const set of sets) production[set.id] = await produceSet(set);
  const all = Object.values(production).flat();
  const queueWarning = all.find((entry) => entry.id === 'icon_queue_warning');
  const systemWarning = all.find((entry) => entry.id === 'icon_sys_warning');
  const qa = {
    iconCount: all.length,
    uniqueIds: new Set(all.map((entry) => entry.id)).size,
    expectedFiles: all.length * 2,
    passedDimensions: all.every((entry) => entry.png.audit.width === 512 && entry.png.audit.height === 512 && entry.webp.audit.width === 512 && entry.webp.audit.height === 512),
    passedAlpha: all.every((entry) => entry.png.audit.hasAlpha && entry.webp.audit.hasAlpha && entry.png.audit.corners.every((value) => value === 0) && entry.webp.audit.corners.every((value) => value === 0)),
    passedOuterMargin: all.every((entry) => entry.png.audit.outerMarginTransparent && entry.webp.audit.outerMarginTransparent),
    warningDedupe: {
      pngBitIdentical: queueWarning.png.sha256 === systemWarning.png.sha256,
      webpBitIdentical: queueWarning.webp.sha256 === systemWarning.webp.sha256,
      queuePngSha256: queueWarning.png.sha256,
      systemPngSha256: systemWarning.png.sha256,
      queueWebpSha256: queueWarning.webp.sha256,
      systemWebpSha256: systemWarning.webp.sha256
    },
    sets: Object.fromEntries(Object.entries(production).map(([key, records]) => [key, { count: records.length, ids: records.map((record) => record.id) }]))
  };
  await fs.writeFile(path.join(OUTPUT, 'production-qa.json'), JSON.stringify(qa, null, 2), 'utf8');
  await fs.writeFile(path.join(OUTPUT, 'index.html'), buildHtml(), 'utf8');
  // codex:2026-08-03T13:03:00+02:00
  await fs.writeFile(path.join(OUTPUT, 'README.md'), `# Grim Reach Micro-Icon-System\n\n- Aufträge: CODEX/inbox/2026-08-03-03-micro-icon-sets.md, CODEX/inbox/2026-08-03-04-go-micro-icon-vollproduktion.md und CODEX/inbox/2026-08-03-05-event-artwork-und-konzepte.md\n- Status: Vollproduktion im CODEX-Staging, nicht produktiv verdrahtet\n- Methode: manuelle 512er Vektorgeometrie, echte 14/16/20-px-Rasterprüfung\n- Palette: Altgold #d7ad55, Kupfer #9a5b35, Eisen #252a2d\n- Namensschema: icon_queue_*, icon_quest_*, icon_ach_*, icon_combat_status_*, icon_sys_*\n- Pro Icon: transparentes 512×512 PNG und verlustfreies WebP\n- Gesamtumfang: ${all.length} Icons / ${all.length * 2} Produktionsdateien\n- Produktivcode und Runtime-Assets: unangetastet\n\nJeder Set-Ordner enthält review-board.png und production/ mit den finalen Einzeldateien sowie einem Manifest. production-qa.json enthält die technische Gesamtprüfung. Warnung in Queue und System ist in beiden Formaten bitidentisch.\n`, 'utf8');
}

await main();
