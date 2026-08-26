// codex:2026-08-24T00:49:00+02:00
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const work = 'G:/GameDev/CODEX/work/2026-08-24-neuguss-native';
const finished = 'G:/GameDev/ASSETS/neuguss-2026-08-23/fertig';
const ids = [
  'elite_slag_hexer',
  'elite_wild_wolf',
  'elite_high_specter',
  'elite_black_witch',
  'elite_crypt_pyroclasp',
  'elite_coast_drowned',
  'elite_black_golem',
  'elite_wild_stag',
  'iron_sentinel',
  'elite_crypt_butcher',
  'barrow_chanter',
];

function colorDistance(r, g, b, color) {
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
    .slice(0, 8)
    .map(([key]) => key.split(',').map(Number))
    .filter(([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 12 && (r + g + b) / 3 > 220);
}

async function extractChecker(source, extracted) {
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = borderPalette(data, info);
  if (!palette.length) throw new Error(`No checker palette detected for ${source}`);
  const pixels = info.width * info.height;
  const background = new Uint8Array(pixels);
  const queue = new Int32Array(pixels);
  let head = 0;
  let tail = 0;
  const nearest = (p) => {
    const i = p * info.channels;
    let distance = Infinity;
    let color = palette[0];
    for (const candidate of palette) {
      const d = colorDistance(data[i], data[i + 1], data[i + 2], candidate);
      if (d < distance) {
        distance = d;
        color = candidate;
      }
    }
    return { distance, color };
  };
  const seed = (p) => {
    if (background[p] || nearest(p).distance > 14) return;
    background[p] = 1;
    queue[tail++] = p;
  };
  for (let x = 0; x < info.width; x += 1) {
    seed(x);
    seed((info.height - 1) * info.width + x);
  }
  for (let y = 1; y < info.height - 1; y += 1) {
    seed(y * info.width);
    seed(y * info.width + info.width - 1);
  }
  while (head < tail) {
    const p = queue[head++];
    const x = p % info.width;
    const y = Math.floor(p / info.width);
    const neighbors = [];
    if (x > 0) neighbors.push(p - 1);
    if (x + 1 < info.width) neighbors.push(p + 1);
    if (y > 0) neighbors.push(p - info.width);
    if (y + 1 < info.height) neighbors.push(p + info.width);
    for (const n of neighbors) {
      if (!background[n] && nearest(n).distance <= 25) {
        background[n] = 1;
        queue[tail++] = n;
      }
    }
  }

  // codex:2026-08-24T01:18:00+02:00
  // Checker fields can be fully enclosed by limbs, cloth or spectral ribbons.
  // Their near-exact neutral colors are background even when no path reaches the canvas edge.
  for (let p = 0; p < pixels; p += 1) {
    if (nearest(p).distance <= 18) background[p] = 1;
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
    if (nearBackground) alpha = Math.max(0, Math.min(255, Math.round(((match.distance - 10) / 100) * 255)));
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
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(extracted);
  return { palette, width: info.width, height: info.height };
}

async function normalize(source, output, pink, target = 1254, maxSubject = 1100) {
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  let sourcePartial = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const a = data[(y * info.width + x) * info.channels + 3];
      if (a > 0 && a < 255) sourcePartial += 1;
      if (a > 8) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  const pad = 12;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(info.width - 1, right + pad);
  bottom = Math.min(info.height - 1, bottom + pad);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const scale = maxSubject / Math.max(width, height);
  const outWidth = Math.round(width * scale);
  const outHeight = Math.round(height * scale);
  const subject = await sharp(source).extract({ left, top, width, height }).resize(outWidth, outHeight, { kernel: sharp.kernel.lanczos3 }).png().toBuffer();
  await sharp({ create: { width: target, height: target, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: subject, left: Math.floor((target - outWidth) / 2), top: Math.floor((target - outHeight) / 2) }])
    .png().toFile(output);
  await sharp({ create: { width: target, height: target, channels: 3, background: { r: 255, g: 0, b: 255 } } })
    .composite([{ input: output, left: 0, top: 0 }]).png().toFile(pink);
  const stats = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  let magenta = 0;
  for (let i = 0; i < stats.data.length; i += stats.info.channels) {
    const [r, g, b, a] = [stats.data[i], stats.data[i + 1], stats.data[i + 2], stats.data[i + 3]];
    if (a === 0) transparent += 1; else if (a === 255) opaque += 1; else partial += 1;
    if (a > 8 && r > 140 && b > 140 && g + 35 < Math.min(r, b)) magenta += 1;
  }
  return { sourcePartial, bbox: { left, top, width, height }, subject: { width: outWidth, height: outHeight }, alpha: { transparent, partial, opaque }, visibleMagenta: magenta };
}

(async () => {
  fs.mkdirSync(finished, { recursive: true });
  const report = {};
  for (const id of ids) {
    const raw = path.join(work, `${id}-raw.png`);
    const extracted = path.join(work, `${id}-extracted.png`);
    const final = path.join(finished, `${id}.png`);
    const pink = path.join(work, `${id}-pink-qa.png`);
    const extraction = await extractChecker(raw, extracted);
    report[id] = { extraction, normalization: await normalize(extracted, final, pink) };
  }
  fs.writeFileSync(path.join(work, 'checker-extraction-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
