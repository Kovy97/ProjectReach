// codex:2026-08-24T13:30:00+02:00
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const generated = 'C:/Users/MSchu/.codex/generated_images/01a02f40-1bd9-7802-8352-58082679c45b';
const work = 'G:/GameDev/CODEX/work/2026-08-24-companions-redesign';
const delivery = 'G:/GameDev/ASSETS/companions-2026-08-23/fertig';
const cardDir = path.join(delivery, 'card');
const fightDir = path.join(delivery, 'fight');
const extractedDir = path.join(work, 'extracted');

const series = {
  rotbark: ['exec-6d805064-cca8-445b-8e2b-54d1b52e20c4.png', 'exec-0af4c27e-2af8-4d68-ab43-dccee2c3a49a.png'],
  cragmaw: ['exec-aa00f036-8003-4a58-b557-46d09c8ad6d7.png', 'exec-5ae8effc-ed62-4203-80d7-9aa5ccfe195a.png'],
  gillrot: ['exec-ed8446af-f68a-4d91-a01c-1338cf91a2a5.png', 'exec-27de055f-9719-440d-8c00-df88f83fec49.png'],
  witherling: ['exec-772275b9-abfe-4201-ae55-9dd74c5e818c.png', 'exec-12ad5141-eeb7-4595-92a6-c5fda8899997.png'],
  sporewretch: ['exec-d2e59a10-9333-4e00-a599-6de415ca930a.png', 'exec-e26e72aa-8083-4803-984b-b1258500c637.png'],
  gloomrat: ['exec-e966bbe9-946a-4e68-a76a-5e9d4bc407f0.png', 'exec-ec2219de-ff4c-4db4-a8d4-cc8385ecc3fd.png'],
  slagfiend: ['exec-1e698484-5507-4a3f-bcaf-0d775c839ce8.png', 'exec-f1e4c2b1-1ad1-4c34-ad1a-a2f8a8c9d90f.png'],
  ashgut: ['exec-8c551e01-ef24-4c73-b598-54c43aa2c1b4.png', 'exec-08534afb-e304-46fc-b836-64ef3d855e7c.png'],
  quillshrike: ['exec-430bae1d-a7e4-4b58-aa68-96e0cb431e04.png', 'exec-ed136e7f-806a-4f33-a1fa-827259f6daba.png'],
  flayling: ['exec-799409a7-c8ce-47ac-9edc-ad63ea516ce2.png', 'exec-170ee75f-9e5a-49f3-89a7-8e783d1a900d.png'],
  gemwraith: ['exec-fef05138-ff8e-44a5-aa26-49b6f3a1a6bb.png', 'exec-bbe3400d-14e9-4f76-bf92-823127c893bd.png'],
  glyphmaw: ['exec-1f1b9b56-fad7-4af2-a55e-590222865de6.png', 'exec-ee1050ad-2aa7-46f9-854b-71ddba080a52.png'],
  vellumoth: ['exec-68da97af-1195-4c1b-a9d9-54c3631b01f6.png', 'exec-c1f79be0-529a-4639-80fd-c86100edae72.png'],
  hemlock: ['exec-c62248be-9a7f-4aa4-9105-28a43b111128.png', 'exec-31fef305-96a1-4809-a196-393cb2227fd1.png'],
  ironmaw: ['exec-4d089157-0d63-46ae-bf98-588179212f73.png', 'exec-b24abb98-eed1-4c2c-a666-a0bec9f664fd.png'],
  carapace: ['exec-82f94090-df43-49c5-99f5-a7d413700ec5.png', 'exec-fa048a67-0f82-4e8a-947f-1db4995c4c9e.png'],
  gorehound: ['exec-39c26a1c-17fa-461e-afc8-b0c679e6ddb6.png', 'exec-b792e82f-c9ae-469d-9cee-7991007dd029.png'],
  carrionwing: ['exec-34244b8e-3e59-4fd5-95e2-ed23975415d6.png', 'exec-4c79d9a5-c321-418d-8359-4b609b53ca1a.png'],
  pyreling: ['exec-a4afca0f-cdf8-4cf3-92a6-1709beef1d05.png', 'exec-d6644855-abd2-4edb-801c-a068cfdaa493.png'],
  hoarspite: ['exec-c299c07b-bb59-4094-943c-e0ad2bb1d550.png', 'exec-badd4ccb-5b78-402f-86b8-29caf3e6a78a.png'],
  charnel: ['exec-f408f57f-51f1-42f4-8a2a-b0eb5515e981.png', 'exec-e3b86baf-06c3-47aa-a892-daf7bfe48206.png'],
};

// codex:2026-08-24T14:05:00+02:00
// Small resumable batches keep the image-matte pass inside the tool time window.
const activeIds = ['carrionwing', 'pyreling', 'hoarspite', 'charnel'];

function distance(r, g, b, color) {
  return Math.sqrt((r - color[0]) ** 2 + (g - color[1]) ** 2 + (b - color[2]) ** 2);
}

function borderPalette(data, info) {
  const counts = new Map();
  const add = (x, y) => {
    const i = (y * info.width + x) * info.channels;
    const key = `${data[i]},${data[i + 1]},${data[i + 2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  };
  for (let x = 0; x < info.width; x += 1) {
    add(x, 0);
    add(x, info.height - 1);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    add(0, y);
    add(info.width - 1, y);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([key]) => key.split(',').map(Number))
    .filter(([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 14 && (r + g + b) / 3 > 218);
}

async function extractNeutralChecker(source, output) {
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = borderPalette(data, info);
  if (palette.length < 2) throw new Error(`No neutral checker palette detected: ${source}`);
  const pixels = info.width * info.height;
  const background = new Uint8Array(pixels);
  const candidate = new Uint8Array(pixels);
  const nearest = (p) => {
    const i = p * info.channels;
    let bestDistance = Infinity;
    let bestColor = palette[0];
    for (const color of palette) {
      const d = distance(data[i], data[i + 1], data[i + 2], color);
      if (d < bestDistance) {
        bestDistance = d;
        bestColor = color;
      }
    }
    return { distance: bestDistance, color: bestColor };
  };
  for (let p = 0; p < pixels; p += 1) candidate[p] = nearest(p).distance <= 18 ? 1 : 0;

  // codex:2026-08-24T13:30:00+02:00
  // Substantial checker-colored components include fields enclosed by limbs.
  const visited = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  for (let start = 0; start < pixels; start += 1) {
    if (!candidate[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let touchesBorder = false;
    queue[tail++] = start;
    visited[start] = 1;
    while (head < tail) {
      const p = queue[head++];
      const x = p % info.width;
      const y = Math.floor(p / info.width);
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) touchesBorder = true;
      if (x > 0 && candidate[p - 1] && !visited[p - 1]) { visited[p - 1] = 1; queue[tail++] = p - 1; }
      if (x + 1 < info.width && candidate[p + 1] && !visited[p + 1]) { visited[p + 1] = 1; queue[tail++] = p + 1; }
      if (y > 0 && candidate[p - info.width] && !visited[p - info.width]) { visited[p - info.width] = 1; queue[tail++] = p - info.width; }
      if (y + 1 < info.height && candidate[p + info.width] && !visited[p + info.width]) { visited[p + info.width] = 1; queue[tail++] = p + info.width; }
    }
    if (touchesBorder || tail >= 64) {
      for (let i = 0; i < tail; i += 1) background[queue[i]] = 1;
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let p = 0; p < pixels; p += 1) {
      if (background[p] || nearest(p).distance > 28) continue;
      const x = p % info.width;
      const y = Math.floor(p / info.width);
      if ((x > 0 && background[p - 1]) || (x + 1 < info.width && background[p + 1])
        || (y > 0 && background[p - info.width]) || (y + 1 < info.height && background[p + info.width])) {
        background[p] = 1;
        changed = true;
      }
    }
  }

  const rgba = Buffer.alloc(pixels * 4);
  for (let p = 0; p < pixels; p += 1) {
    const src = p * info.channels;
    const dst = p * 4;
    const x = p % info.width;
    const y = Math.floor(p / info.width);
    let alpha = background[p] ? 0 : 255;
    let nearBackground = false;
    if (!background[p]) {
      for (let oy = -3; oy <= 3 && !nearBackground; oy += 1) {
        const yy = y + oy;
        if (yy < 0 || yy >= info.height) continue;
        for (let ox = -3; ox <= 3; ox += 1) {
          const xx = x + ox;
          if (xx >= 0 && xx < info.width && background[yy * info.width + xx]) {
            nearBackground = true;
            break;
          }
        }
      }
    }
    const match = nearest(p);
    if (nearBackground) alpha = Math.max(0, Math.min(255, Math.round(((match.distance - 9) / 95) * 255)));
    if (alpha > 0 && alpha < 255) {
      const a = alpha / 255;
      rgba[dst] = Math.max(0, Math.min(255, Math.round((data[src] - (1 - a) * match.color[0]) / a)));
      rgba[dst + 1] = Math.max(0, Math.min(255, Math.round((data[src + 1] - (1 - a) * match.color[1]) / a)));
      rgba[dst + 2] = Math.max(0, Math.min(255, Math.round((data[src + 2] - (1 - a) * match.color[2]) / a)));
    } else {
      rgba[dst] = data[src];
      rgba[dst + 1] = data[src + 1];
      rgba[dst + 2] = data[src + 2];
    }
    rgba[dst + 3] = alpha;
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(output);
  return { method: 'neutral-checker-component-matte', palette };
}

async function correctLowAlphaFringe(source, output) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const corrected = Buffer.from(data);
  const radius = 6;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const p = (y * info.width + x) * info.channels;
      const alpha = data[p + 3];
      if (alpha === 0 || alpha >= 170) continue;
      let best = -1;
      let bestScore = Infinity;
      for (let oy = -radius; oy <= radius; oy += 1) {
        const yy = y + oy;
        if (yy < 0 || yy >= info.height) continue;
        for (let ox = -radius; ox <= radius; ox += 1) {
          const xx = x + ox;
          if (xx < 0 || xx >= info.width) continue;
          const q = (yy * info.width + xx) * info.channels;
          if (data[q + 3] < 205) continue;
          const score = ox * ox + oy * oy - data[q + 3] / 512;
          if (score < bestScore) { bestScore = score; best = q; }
        }
      }
      if (best >= 0) {
        const blend = Math.max(0.2, Math.min(0.92, (170 - alpha) / 170));
        for (let channel = 0; channel < 3; channel += 1) {
          corrected[p + channel] = Math.round(data[p + channel] * (1 - blend) + data[best + channel] * blend);
        }
      }
    }
  }
  await sharp(corrected, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(output);
}

async function normalize(source, output, target = 1024, maxSubject = 800) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left || bottom < top) throw new Error(`No visible subject in ${source}`);
  const pad = 8;
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(info.width - 1, right + pad); bottom = Math.min(info.height - 1, bottom + pad);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const scale = maxSubject / Math.max(width, height);
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  const subject = await sharp(source).extract({ left, top, width, height })
    .resize(outWidth, outHeight, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  await sharp({ create: { width: target, height: target, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: subject, left: Math.floor((target - outWidth) / 2), top: Math.floor((target - outHeight) / 2) }])
    .png().toFile(output);
  return { sourceBbox: { left, top, width, height }, normalizedSubject: { width: outWidth, height: outHeight } };
}

async function stats(file) {
  const meta = await sharp(file).metadata();
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0; let partial = 0; let opaque = 0;
  let left = info.width; let top = info.height; let right = -1; let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const alpha = data[i + 3];
      if (alpha === 0) transparent += 1; else if (alpha === 255) opaque += 1; else partial += 1;
      if (alpha > 8) {
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  const corners = [
    data[3],
    data[(info.width - 1) * info.channels + 3],
    data[(info.height - 1) * info.width * info.channels + 3],
    data[(info.height * info.width - 1) * info.channels + 3],
  ];
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  return {
    width: meta.width, height: meta.height, channels: meta.channels, hasAlpha: meta.hasAlpha,
    alpha: { transparent, partial, opaque }, corners,
    visibleBbox: { left, top, width: right - left + 1, height: bottom - top + 1 },
    sha256: hash,
  };
}

async function makeSheet(kind, dir, background, name) {
  const ids = Object.keys(series);
  const tile = 236; const label = 28; const columns = 5;
  const rows = Math.ceil(ids.length / columns);
  const composites = [];
  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    const x = (index % columns) * tile;
    const y = Math.floor(index / columns) * (tile + label);
    const input = await sharp(path.join(dir, `${id}.png`))
      .resize(tile, tile, { fit: 'contain', background: { ...background, alpha: 0 } }).png().toBuffer();
    const ink = background.r + background.g + background.b < 250 ? '#fff' : '#111';
    const svg = Buffer.from(`<svg width="${tile}" height="${label}"><rect width="100%" height="100%" fill="rgb(${background.r},${background.g},${background.b})"/><text x="8" y="20" fill="${ink}" font-family="Arial" font-size="15">${id} · ${kind}</text></svg>`);
    composites.push({ input, left: x, top: y });
    composites.push({ input: svg, left: x, top: y + tile });
  }
  await sharp({ create: { width: columns * tile, height: rows * (tile + label), channels: 3, background } })
    .composite(composites).png().toFile(path.join(work, name));
}

await (async () => {
  for (const dir of [work, cardDir, fightDir, extractedDir]) fs.mkdirSync(dir, { recursive: true });
  const report = { expectedIds: Object.keys(series), card: {}, fight: {} };
  for (const [id, [cardName, fightName]] of Object.entries(series).filter(([id]) => activeIds.includes(id))) {
    for (const [kind, sourceName, outputDir] of [['card', cardName, cardDir], ['fight', fightName, fightDir]]) {
      const source = path.join(generated, sourceName);
      const sourceMeta = await sharp(source).metadata();
      const extracted = path.join(extractedDir, `${kind}-${id}.png`);
      let extraction;
      if (sourceMeta.hasAlpha && sourceMeta.channels === 4) {
        await correctLowAlphaFringe(source, extracted);
        extraction = { method: 'native-alpha-edge-corrected' };
      } else {
        extraction = await extractNeutralChecker(source, extracted);
      }
      const output = path.join(outputDir, `${id}.png`);
      const normalization = await normalize(extracted, output);
      report[kind][id] = { source: sourceName, sourceMeta, extraction, normalization, stats: await stats(output) };
    }
  }
  const allReady = [cardDir, fightDir].every((dir) => fs.existsSync(dir)
    && fs.readdirSync(dir).filter((name) => name.endsWith('.png')).length === Object.keys(series).length);
  const backgrounds = [
    ['black', { r: 0, g: 0, b: 0 }],
    ['gray', { r: 112, g: 112, b: 112 }],
    ['pink', { r: 255, g: 0, b: 255 }],
  ];
  if (allReady) {
    for (const [label, background] of backgrounds) {
      await makeSheet('card', cardDir, background, `cards-${label}-qa.png`);
      await makeSheet('fight', fightDir, background, `fights-${label}-qa.png`);
    }
  }
  const exactCard = fs.readdirSync(cardDir).filter((name) => name.endsWith('.png')).sort();
  const exactFight = fs.readdirSync(fightDir).filter((name) => name.endsWith('.png')).sort();
  report.filenameCheck = {
    expected: Object.keys(series).map((id) => `${id}.png`).sort(),
    card: exactCard, fight: exactFight,
  };
  report.pass = allReady && [...Object.values(report.card), ...Object.values(report.fight)].every(({ stats: value }) =>
    value.width === 1024 && value.height === 1024 && value.channels === 4 && value.hasAlpha
    && value.alpha.transparent > 0 && value.alpha.partial > 0 && value.corners.every((alpha) => alpha === 0)
    && Math.max(value.visibleBbox.width, value.visibleBbox.height) >= 790
    && Math.max(value.visibleBbox.width, value.visibleBbox.height) <= 800)
    && JSON.stringify(report.filenameCheck.expected) === JSON.stringify(exactCard)
    && JSON.stringify(report.filenameCheck.expected) === JSON.stringify(exactFight);
  fs.writeFileSync(path.join(work, 'companion-pairs-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ pass: report.pass, cards: exactCard.length, fights: exactFight.length }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
