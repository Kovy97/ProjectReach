// codex:2026-08-24T12:35:04+02:00
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const batches = {
  neuguss: {
    dir: 'G:/GameDev/ASSETS/neuguss-2026-08-23/fertig',
    size: 1254,
    ids: ['mire_wisp', 'elite_crypt_icemage', 'elite_high_wyvern', 'elite_slag_hexer', 'elite_slag_revenant', 'elite_wild_wolf', 'elite_high_roc', 'elite_high_specter', 'elite_black_witch', 'elite_crypt_pyroclasp', 'elite_coast_drowned', 'elite_black_golem', 'elite_wild_stag', 'elite_coast_crab', 'iron_sentinel', 'elite_crypt_butcher', 'barrow_chanter'],
  },
  companions: {
    dir: 'G:/GameDev/ASSETS/companions-2026-08-23/fertig',
    size: 1024,
    ids: ['rotbark', 'cragmaw', 'gillrot', 'witherling', 'sporewretch', 'gloomrat', 'slagfiend', 'ashgut', 'quillshrike', 'flayling', 'gemwraith', 'glyphmaw', 'vellumoth', 'hemlock', 'ironmaw', 'carapace', 'gorehound', 'carrionwing', 'pyreling', 'hoarspite', 'charnel'],
  },
};

async function inspect(filePath) {
  const buffer = fs.readFileSync(filePath);
  const meta = await sharp(buffer).metadata();
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0; let partial = 0; let opaque = 0; let magenta = 0;
  let left = info.width; let top = info.height; let right = -1; let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * info.channels;
      const r = data[i]; const g = data[i + 1]; const b = data[i + 2]; const a = data[i + 3];
      if (a === 0) transparent += 1; else if (a === 255) opaque += 1; else partial += 1;
      if (a > 8) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        if (r > 140 && b > 140 && g + 35 < Math.min(r, b)) magenta += 1;
      }
    }
  }
  const corners = [0, (info.width - 1) * info.channels, (info.height - 1) * info.width * info.channels, (info.width * info.height - 1) * info.channels].map((index) => data[index + 3]);
  return {
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    width: meta.width, height: meta.height, channels: meta.channels, hasAlpha: meta.hasAlpha,
    alpha: { transparent, partial, opaque }, corners,
    bbox: { left, top, width: right - left + 1, height: bottom - top + 1 },
    visibleMagenta: magenta,
  };
}

(async () => {
  const report = { generatedAt: '2026-08-24T12:35:04+02:00', batches: {} };
  for (const [name, batch] of Object.entries(batches)) {
    const actual = fs.readdirSync(batch.dir).filter((file) => file.toLowerCase().endsWith('.png')).sort();
    const expected = batch.ids.map((id) => `${id}.png`).sort();
    const files = {};
    for (const id of batch.ids) files[id] = await inspect(path.join(batch.dir, `${id}.png`));
    const violations = [];
    for (const [id, result] of Object.entries(files)) {
      if (result.width !== batch.size || result.height !== batch.size) violations.push(`${id}:size`);
      if (!result.hasAlpha || result.channels !== 4) violations.push(`${id}:rgba`);
      if (result.alpha.transparent === 0 || result.alpha.partial === 0) violations.push(`${id}:alpha-usage`);
      if (result.corners.some((alpha) => alpha !== 0)) violations.push(`${id}:corner-alpha`);
    }
    report.batches[name] = {
      expectedCount: expected.length,
      actualCount: actual.length,
      missing: expected.filter((file) => !actual.includes(file)),
      unexpected: actual.filter((file) => !expected.includes(file)),
      requiredSize: batch.size,
      violations,
      files,
    };
  }
  fs.writeFileSync('G:/GameDev/CODEX/work/2026-08-24-final-qa/final-asset-qa.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    neuguss: { count: report.batches.neuguss.actualCount, missing: report.batches.neuguss.missing, unexpected: report.batches.neuguss.unexpected, violations: report.batches.neuguss.violations },
    companions: { count: report.batches.companions.actualCount, missing: report.batches.companions.missing, unexpected: report.batches.companions.unexpected, violations: report.batches.companions.violations },
  }, null, 2));
})().catch((error) => { console.error(error); process.exitCode = 1; });
