// codex:2026-08-24T01:25:00+02:00
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const generated = 'C:/Users/MSchu/.codex/generated_images/01a02f40-1bd9-7802-8352-58082679c45b';
const work = 'G:/GameDev/CODEX/work/2026-08-24-companions-native';
const files = {
  rotbark: 'exec-b21dfe66-87a8-4db5-b8d7-ae97e2ffd63b.png',
  cragmaw: 'exec-e6ab84c1-1abf-467e-bc94-968a238bbd05.png',
  gillrot: 'exec-e106728f-bf26-4a8b-b15f-ad5f986e52b1.png',
  witherling: 'exec-5499b3ef-4e6c-4860-a6a8-463bb05b365b.png',
};

(async () => {
  fs.mkdirSync(work, { recursive: true });
  const report = {};
  for (const [id, file] of Object.entries(files)) {
    const source = path.join(generated, file);
    const raw = path.join(work, `${id}-raw.png`);
    fs.copyFileSync(source, raw);
    const meta = await sharp(raw).metadata();
    const { data, info } = await sharp(raw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    let partial = 0;
    let opaque = 0;
    let saturatedEdge = 0;
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2]; const a = data[i + 3];
      if (a === 0) transparent += 1; else if (a === 255) opaque += 1; else partial += 1;
      if (a > 0 && a < 220 && Math.max(r, g, b) - Math.min(r, g, b) > 90) saturatedEdge += 1;
    }
    report[id] = { meta: { width: meta.width, height: meta.height, channels: meta.channels, hasAlpha: meta.hasAlpha }, alpha: { transparent, partial, opaque }, saturatedEdge };
  }
  fs.writeFileSync(path.join(work, 'group1-inspection.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
