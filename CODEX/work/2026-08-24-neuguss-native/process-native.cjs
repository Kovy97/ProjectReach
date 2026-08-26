// codex:2026-08-24T00:34:00+02:00
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const generated = 'C:/Users/MSchu/.codex/generated_images/01a02f40-1bd9-7802-8352-58082679c45b';
const work = 'G:/GameDev/CODEX/work/2026-08-24-neuguss-native';
const finished = 'G:/GameDev/ASSETS/neuguss-2026-08-23/fertig';

const files = {
  elite_slag_hexer: 'exec-1035105e-9d1a-41df-9d19-e87a1a389c89.png',
  elite_wild_wolf: 'exec-d2e64eb8-088b-48c8-8620-b33dfee1d1d2.png',
  elite_high_specter: 'exec-73f11c6a-5a22-4bba-a247-b40aa2cac9d5.png',
  elite_black_witch: 'exec-9ddc5392-ca7b-44c3-945c-058b4eb2ba02.png',
  elite_crypt_pyroclasp: 'exec-db1ae2fc-d84d-4060-a857-bb437e1310ab.png',
  elite_coast_drowned: 'exec-9abb12a1-6c54-431b-b398-839ec84b77c6.png',
  elite_black_golem: 'exec-2a7cdef4-aae8-4a5f-86e8-bf3b61a579f3.png',
  elite_wild_stag: 'exec-c995f4a0-4826-46a8-b305-4a68729d2a34.png',
  iron_sentinel: 'exec-9dfbe848-996d-4b53-8a60-7624478f1ec8.png',
  elite_crypt_butcher: 'exec-3e02b327-7575-44d0-bdba-bd0bd283220b.png',
  barrow_chanter: 'exec-9963af4f-96de-4571-ac9e-812e43956661.png',
};

async function alphaStats(imagePath) {
  const { data, info } = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  let partial = 0;
  let opaque = 0;
  let magenta = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    if (a === 0) transparent += 1;
    else if (a === 255) opaque += 1;
    else partial += 1;
    if (a > 8 && r > 140 && b > 140 && g + 35 < Math.min(r, b)) magenta += 1;
  }
  return { transparent, partial, opaque, magenta };
}

async function normalizeNativeAlpha(source, output, qaOutput, target = 1254, maxSubject = 1100) {
  const meta = await sharp(source).metadata();
  if (!meta.hasAlpha || meta.channels !== 4) return { accepted: false, reason: 'no-native-alpha', meta };

  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) return { accepted: false, reason: 'empty-alpha', meta };

  const pad = 12;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(info.width - 1, right + pad);
  bottom = Math.min(info.height - 1, bottom + pad);
  const width = right - left + 1;
  const height = bottom - top + 1;
  const scale = maxSubject / Math.max(width, height);
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  const leftPad = Math.floor((target - outWidth) / 2);
  const topPad = Math.floor((target - outHeight) / 2);

  const subject = await sharp(source)
    .extract({ left, top, width, height })
    .resize(outWidth, outHeight, { kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  await sharp({
    create: { width: target, height: target, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: subject, left: leftPad, top: topPad }])
    .png()
    .toFile(output);

  await sharp({
    create: { width: target, height: target, channels: 3, background: { r: 255, g: 0, b: 255 } },
  })
    .composite([{ input: output, left: 0, top: 0 }])
    .png()
    .toFile(qaOutput);

  return {
    accepted: true,
    meta,
    sourceBbox: { left, top, width, height },
    normalizedSubject: { width: outWidth, height: outHeight },
    alpha: await alphaStats(output),
  };
}

(async () => {
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(finished, { recursive: true });
  const report = {};
  for (const [id, generatedName] of Object.entries(files)) {
    const source = path.join(generated, generatedName);
    const raw = path.join(work, `${id}-raw.png`);
    const output = path.join(finished, `${id}.png`);
    const qaOutput = path.join(work, `${id}-pink-qa.png`);
    fs.copyFileSync(source, raw);
    report[id] = await normalizeNativeAlpha(raw, output, qaOutput);
  }
  fs.writeFileSync(path.join(work, 'native-alpha-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
