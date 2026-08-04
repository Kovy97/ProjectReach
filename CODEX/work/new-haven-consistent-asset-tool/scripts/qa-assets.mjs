// codex:2026-08-02T10:44:59+02:00
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = path.resolve(SCRIPT_DIR, '..');

function parseAssetName(filename) {
  const match = /^(camp_[a-z_]+)_([123])\.png$/i.exec(filename);
  return match ? { id: match[1].toLowerCase(), rank: Number(match[2]) } : null;
}

export async function analyzeAsset(filePath, manifest) {
  const filename = path.basename(filePath);
  const parsed = parseAssetName(filename);
  const checks = [];
  const fail = (name, detail) => checks.push({ name, status: 'fail', detail });
  const pass = (name, detail) => checks.push({ name, status: 'pass', detail });
  const warn = (name, detail) => checks.push({ name, status: 'warn', detail });

  if (!parsed) {
    fail('filename', 'Expected <building-id>_<rank>.png');
    return { filename, overall: 'fail', checks };
  }
  const building = manifest.buildings.find((entry) => entry.id === parsed.id);
  if (!building) {
    fail('building-id', `${parsed.id} is not present in manifest.json`);
    return { filename, overall: 'fail', checks };
  }
  pass('filename', `${building.name}, rank ${parsed.rank}`);

  const image = sharp(filePath, { failOn: 'error' }).ensureAlpha();
  const meta = await image.metadata();
  if (meta.format === 'png') pass('format', 'PNG'); else fail('format', `Expected PNG, got ${meta.format}`);
  if (meta.width === manifest.canvas.width && meta.height === manifest.canvas.height) {
    pass('canvas', `${meta.width} × ${meta.height}`);
  } else {
    fail('canvas', `Expected ${manifest.canvas.width} × ${manifest.canvas.height}, got ${meta.width} × ${meta.height}`);
  }
  if (meta.hasAlpha || meta.channels === 4) pass('alpha-channel', 'RGBA/alpha channel present');
  else fail('alpha-channel', 'No alpha channel');

  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let visible = 0;
  let edge = 0;
  const rowVisible = new Uint32Array(info.height);

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * info.channels + 3];
      if (alpha <= 16) continue;
      visible += 1;
      rowVisible[y] += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) edge += 1;
    }
  }

  if (!visible) {
    fail('visible-content', 'No visible pixels above alpha 16');
    return { filename, buildingId: parsed.id, rank: parsed.rank, overall: 'fail', checks };
  }

  const bounds = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, bottom: maxY };
  const transparentRatio = 1 - visible / (info.width * info.height);
  transparentRatio >= manifest.tolerances.minTransparentRatio
    ? pass('true-alpha', `${(transparentRatio * 100).toFixed(1)}% transparent`)
    : fail('true-alpha', `Only ${(transparentRatio * 100).toFixed(1)}% transparent`);
  edge <= manifest.tolerances.edgeOccupiedPixels
    ? pass('clear-outer-edge', 'No occupied outer-edge pixels')
    : fail('clear-outer-edge', `${edge} occupied outer-edge pixels`);

  const scale = manifest.rankScale[String(parsed.rank)];
  const target = { width: Math.round(building.rank1Bounds[0] * scale), height: Math.round(building.rank1Bounds[1] * scale) };
  const widthDeviation = Math.abs(bounds.width - target.width) / target.width * 100;
  const heightDeviation = Math.abs(bounds.height - target.height) / target.height * 100;
  widthDeviation <= manifest.tolerances.boundsPercent && heightDeviation <= manifest.tolerances.boundsPercent
    ? pass('bounds', `${bounds.width} × ${bounds.height}; target ${target.width} × ${target.height}`)
    : fail('bounds', `${bounds.width} × ${bounds.height}; target ${target.width} × ${target.height}; deviation ${widthDeviation.toFixed(1)}% / ${heightDeviation.toFixed(1)}%`);

  const centerX = (minX + maxX) / 2;
  Math.abs(centerX - manifest.anchor.x) <= manifest.anchor.toleranceX
    ? pass('horizontal-anchor', `center x=${centerX.toFixed(1)}`)
    : fail('horizontal-anchor', `center x=${centerX.toFixed(1)}, target ${manifest.anchor.x}±${manifest.anchor.toleranceX}`);
  Math.abs(bounds.bottom - manifest.anchor.y) <= manifest.anchor.toleranceY
    ? pass('baseline', `bottom y=${bounds.bottom}`)
    : fail('baseline', `bottom y=${bounds.bottom}, target ${manifest.anchor.y}±${manifest.anchor.toleranceY}`);

  const lowerStart = Math.max(minY, maxY - Math.round(bounds.height * 0.12));
  let broadRows = 0;
  for (let y = lowerStart; y <= maxY; y += 1) {
    if (rowVisible[y] > bounds.width * 0.72) broadRows += 1;
  }
  if (broadRows > Math.max(8, bounds.height * 0.05)) {
    warn('ground-shadow-heuristic', `${broadRows} broad lower rows; inspect for terrain tile or cast shadow`);
  } else {
    pass('ground-shadow-heuristic', 'No broad lower alpha carpet detected');
  }

  const overall = checks.some((check) => check.status === 'fail') ? 'fail' : checks.some((check) => check.status === 'warn') ? 'warn' : 'pass';
  return { filename, buildingId: parsed.id, rank: parsed.rank, overall, bounds, target, checks };
}

export async function analyzeDirectory(inputDir, toolDir = TOOL_DIR) {
  const manifest = JSON.parse(await readFile(path.join(toolDir, 'manifest.json'), 'utf8'));
  const files = (await readdir(inputDir)).filter((name) => name.toLowerCase().endsWith('.png')).sort();
  const results = [];
  for (const filename of files) results.push(await analyzeAsset(path.join(inputDir, filename), manifest));
  return { generatedBy: 'New Haven Consistent Asset Tool', inputDir, files: files.length, results };
}

// codex:2026-08-02T10:44:59+02:00
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const inputDir = path.resolve(process.argv[2] || path.join(TOOL_DIR, 'intake'));
  const report = await analyzeDirectory(inputDir);
  const reportPath = path.join(TOOL_DIR, 'out', 'qa-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`Checked ${report.files} PNG(s); report: ${reportPath}`);
  if (report.results.some((result) => result.overall === 'fail')) process.exitCode = 1;
}
