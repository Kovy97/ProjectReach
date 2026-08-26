// codex:2026-08-24T01:54:00+02:00
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const generated = 'C:/Users/MSchu/.codex/generated_images/01a02f40-1bd9-7802-8352-58082679c45b';
const work = 'G:/GameDev/CODEX/work/2026-08-24-companions-native';
const finished = 'G:/GameDev/ASSETS/companions-2026-08-23/fertig';
const files = {
  rotbark: 'exec-b21dfe66-87a8-4db5-b8d7-ae97e2ffd63b.png',
  cragmaw: 'exec-e6ab84c1-1abf-467e-bc94-968a238bbd05.png',
  gillrot: 'exec-e106728f-bf26-4a8b-b15f-ad5f986e52b1.png',
  witherling: 'exec-5499b3ef-4e6c-4860-a6a8-463bb05b365b.png',
  sporewretch: 'exec-586ff055-6514-446e-9364-c5fd30741ce7.png',
  gloomrat: 'exec-dab8bf6b-b97c-4753-8739-d78aff4012ce.png',
  slagfiend: 'exec-fe522ed2-5ca9-4915-afc5-c317926ac3af.png',
  ashgut: 'exec-a025824c-c7d8-44dd-ba37-1d9ba067e5cc.png',
  quillshrike: 'exec-5e28ff0f-b3e1-41a3-843a-0f70023bb18b.png',
  flayling: 'exec-a7615440-b666-4049-9bbf-c1aba6b031c9.png',
  gemwraith: 'exec-fd363428-5ef2-40c2-8c45-162a6271bc10.png',
  glyphmaw: 'exec-b2ed98db-8be0-4c3b-bf6f-0e4a6c63d2dd.png',
  vellumoth: 'exec-d19edeb8-a87a-47f3-9e44-e6d4acad35a9.png',
  hemlock: 'exec-2fde49b4-6aa3-43d5-9728-750aa15dc95b.png',
  ironmaw: 'exec-bbbae93a-cd9e-471e-9504-f376bcf5cd0b.png',
  carapace: 'exec-388bbdf7-9d7e-4613-a1ff-1dfb52d7b6ad.png',
  gorehound: 'exec-24a3ad02-be66-4106-aa7b-4440262f6bee.png',
  carrionwing: 'exec-4e715cac-878b-4fff-ac67-89edffaea2f7.png',
  pyreling: 'exec-ea02b486-ef68-404c-9a56-2091a404ae6a.png',
  hoarspite: 'exec-470b22e7-54c4-4e67-ba40-74dc348f945b.png',
  charnel: 'exec-0a5663c9-c350-4ee0-950f-f3ca1884ed4d.png',
};

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
          if (score < bestScore) {
            bestScore = score;
            best = q;
          }
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
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
  }
  const pad = 8;
  left = Math.max(0, left - pad); top = Math.max(0, top - pad);
  right = Math.min(info.width - 1, right + pad); bottom = Math.min(info.height - 1, bottom + pad);
  const width = right - left + 1; const height = bottom - top + 1;
  const scale = maxSubject / Math.max(width, height);
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  const subject = await sharp(source).extract({ left, top, width, height }).resize(outWidth, outHeight, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  await sharp({ create: { width: target, height: target, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: subject, left: Math.floor((target - outWidth) / 2), top: Math.floor((target - outHeight) / 2) }])
    .png().toFile(output);
  return { bbox: { left, top, width, height }, subject: { width: outWidth, height: outHeight } };
}

async function stats(imagePath) {
  const meta = await sharp(imagePath).metadata();
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0; let partial = 0; let opaque = 0; let saturatedLowAlpha = 0; let magenta = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i]; const g = data[i + 1]; const b = data[i + 2]; const a = data[i + 3];
    if (a === 0) transparent += 1; else if (a === 255) opaque += 1; else partial += 1;
    if (a > 0 && a < 170 && Math.max(r, g, b) - Math.min(r, g, b) > 90) saturatedLowAlpha += 1;
    if (a > 8 && r > 140 && b > 140 && g + 35 < Math.min(r, b)) magenta += 1;
  }
  const corners = [0, (info.width - 1) * info.channels, (info.height - 1) * info.width * info.channels, (info.height * info.width - 1) * info.channels]
    .map((index) => data[index + 3]);
  return { meta: { width: meta.width, height: meta.height, channels: meta.channels, hasAlpha: meta.hasAlpha }, alpha: { transparent, partial, opaque }, corners, saturatedLowAlpha, visibleMagenta: magenta };
}

(async () => {
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(finished, { recursive: true });
  const report = {};
  for (const [id, file] of Object.entries(files)) {
    const source = path.join(generated, file);
    const raw = path.join(work, `${id}-raw.png`);
    const corrected = path.join(work, `${id}-edge-corrected.png`);
    const output = path.join(finished, `${id}.png`);
    fs.copyFileSync(source, raw);
    const sourceMeta = await sharp(raw).metadata();
    if (!sourceMeta.hasAlpha || sourceMeta.channels !== 4) throw new Error(`${id} has no native RGBA alpha`);
    await correctLowAlphaFringe(raw, corrected);
    const normalization = await normalize(corrected, output);
    report[id] = { normalization, stats: await stats(output) };
  }

  const tile = 240; const columns = 5; const rows = Math.ceil(Object.keys(files).length / columns);
  for (const [name, background] of [
    ['black-qa-contact-sheet.png', { r: 0, g: 0, b: 0 }],
    ['gray-qa-contact-sheet.png', { r: 110, g: 110, b: 110 }],
    ['pink-qa-contact-sheet.png', { r: 255, g: 0, b: 255 }],
  ]) {
    const composites = [];
    let index = 0;
    for (const id of Object.keys(files)) {
      const input = await sharp(path.join(finished, `${id}.png`)).resize(tile, tile, { fit: 'contain', background: { ...background, alpha: 0 } }).png().toBuffer();
      composites.push({ input, left: (index % columns) * tile, top: Math.floor(index / columns) * tile });
      index += 1;
    }
    await sharp({ create: { width: columns * tile, height: rows * tile, channels: 3, background } }).composite(composites).png().toFile(path.join(work, name));
  }
  fs.writeFileSync(path.join(work, 'companion-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
