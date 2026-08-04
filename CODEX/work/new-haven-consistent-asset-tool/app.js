// codex:2026-08-02T10:44:59+02:00
const MANIFEST = {
  canvas: { width: 1536, height: 1536 },
  anchor: { x: 768, y: 1352, toleranceX: 24, toleranceY: 20 },
  rankScale: { 1: 1, 2: 1.1, 3: 1.18 },
  boundsTolerance: 8,
  calibrationIds: ['camp_townhall', 'camp_fishing_hut', 'camp_watchtower', 'camp_seed_garden'],
  buildings: [
    ['camp_townhall', 'Town Hall', 'large', [7.5, 5.8], [760, 590], 'center', 'low settler hall growing into a fieldstone-and-timber meeting house with a restrained bell frame; administrative, practical, no heraldry'],
    ['camp_watchtower', 'Watchtower', 'tall', [3.4, 3.4], [410, 760], 'high-ground', 'narrow timber lookout on a stone-footed base, readable ladder and platform, no oversized fantasy spire'],
    ['camp_storehouse', 'Storehouse', 'medium', [4.6, 4.2], [560, 500], 'dry-edge', 'raised storage house on stone stilts, sealed timber walls and a practical loading step'],
    ['camp_scrivener_tent', "The Scrivener's Tent", 'wide', [5.2, 3.8], [620, 410], 'center-edge', 'patched record-keeper awning with desk, stools, ledger chest and lantern; civilian rather than military'],
    ['camp_fishing_hut', "Fisher's Hut", 'small', [3.6, 3], [430, 370], 'water-edge', 'compact weathered fisher shelter with racks, baskets and coiled nets attached to the structure'],
    ['camp_sawpit', 'The Sawpit', 'wide', [5.2, 3.2], [610, 350], 'forest-edge', 'beam-framed work rig with a log and long pit saw; no ground hole or terrain chunk'],
    ['camp_mine_adit', 'The Adit', 'wide', [4.8, 3.4], [560, 400], 'rock-edge', 'heavy timber mine portal with doors, baskets and an attached ore sled; no cliff or rubble field'],
    ['camp_seed_garden', 'The Seed Garden', 'wide', [5.6, 3.6], [650, 350], 'open-ground', 'four raised planting beds enclosed by low wattle fencing; no surrounding soil patch'],
    ['camp_fence_tent', "The Fence's Tent", 'small', [3.8, 3], [450, 340], 'entrance', 'low patched trading tent with lockbox and concealed shelves, discreet and weathered'],
    ['camp_workyard', 'The Workyard', 'large', [6.6, 5], [720, 500], 'work-edge', 'open timber workshop combining benches, hoist and tool racks beneath partial roofs'],
    ['camp_smelter', 'The Smelter', 'medium', [4.5, 4.2], [520, 520], 'rock-edge', 'masonry furnace with short chimney, bellows and attached work canopy; no smoke cloud or ground scorch'],
    ['camp_smokehouse', 'The Smokehouse', 'medium', [4.7, 4.1], [540, 500], 'water-edge', 'tight timber smokehouse with vented roof, hanging hooks and stacked fuel'],
    ['camp_trophy_wall', 'The Trophy Wall', 'wide', [5.8, 3.2], [680, 420], 'outer-edge', 'freestanding fortified timber wall displaying restrained hunt trophies; not a full hall'],
    ['camp_warden_shrine', 'Shrine of the Silent', 'tall-small', [3.2, 3], [380, 500], 'quiet-grove', 'empty aniconic roadside shrine of dark stone and timber with no statue or face'],
    ['camp_trade_post', 'The Trading Post', 'wide', [5.7, 4], [650, 430], 'entrance', 'sturdy covered counter and store room with tied crates, scales and a restrained sign'],
  ].map(([id, name, sizeClass, footprint, rank1Bounds, zone, visual]) => ({ id, name, sizeClass, footprint, rank1Bounds, zone, visual })),
};

function makePrompt(building, rank) {
  const scale = MANIFEST.rankScale[rank];
  const width = Math.round(building.rank1Bounds[0] * scale);
  const height = Math.round(building.rank1Bounds[1] * scale);
  const refs = MANIFEST.calibrationIds.map((id) => `${id}_1.png`).join(', ');
  return `NEW HAVEN LOCKED ASSET PRODUCTION\n\nOUTPUT: ${building.id}_${rank}.png\nSUBJECT: ${building.name}, rank ${rank} of 3\nVISUAL FUNCTION: ${building.visual}\nWORLD FOOTPRINT: ${building.footprint.join(' x ')} reference units\nSIZE CLASS: ${building.sizeClass}\nTARGET VISIBLE BOUNDS: ${width} x ${height} px within a 1536 x 1536 canvas\nANCHOR: ground contact at canvas pixel 768,1352; center the built footprint on x=768\n\nLOCKED CAMERA: orthographic projection, azimuth 45 degrees clockwise, elevation 35.264 degrees. Vertical edges stay vertical. Screen ground axes run at approximately -30 and +30 degrees. Do not use perspective, another camera height, a close-up lens or a top-down view.\n\nLOCKED LIGHT: one broad soft key from screen upper-left at 35 degrees elevation, cool low ambient fill, no separate rim-light direction. Ash-grey, weathered wood-brown and dull iron palette; only functional ember, plant-green or restrained brass accents.\n\nSTYLE: readable painted fantasy game asset, grounded frontier craft, coherent with Grim Reach Ashen Iron. Practical salvaged materials, strong silhouette, medium detail that remains readable at map scale. Rank ${rank} must remain recognizably the same building family${rank > 1 ? ` and visibly grow from ${building.id}_${rank - 1}.png` : ''}.\n\nTRANSPARENCY CONTRACT: exact RGBA PNG, fully transparent background. Show the building and only objects physically attached to it. NO soil, grass, gravel, rock slab, water, terrain tile, floor diamond, painted ground ellipse, ground-contact shadow, detached prop scatter, label, UI, border or text. Internal ambient occlusion on the structure is allowed. Keep every outer canvas edge completely transparent.\n\nREFERENCE LOCK: attach the exact approved calibration images without replacing or reinterpreting them: ${refs}.${rank > 1 ? ` Also attach ${building.id}_${rank - 1}.png as the same-family geometry reference.` : ''}\n\nFINAL CHECK: 1536 x 1536, sRGB, true alpha, visible bounds near ${width} x ${height}, bottom contact y=1352, centered at x=768, no crop, no ground, no cast shadow.`;
}

// codex:2026-08-02T10:44:59+02:00
const tabs = document.querySelectorAll('[data-tab]');
tabs.forEach((button) => button.addEventListener('click', () => {
  tabs.forEach((tab) => tab.classList.toggle('active', tab === button));
  document.querySelectorAll('.panel').forEach((panel) => panel.classList.toggle('active', panel.id === button.dataset.tab));
}));

const calibrationGrid = document.querySelector('#calibrationGrid');
MANIFEST.calibrationIds.forEach((id) => {
  const item = MANIFEST.buildings.find((building) => building.id === id);
  calibrationGrid.insertAdjacentHTML('beforeend', `<article class="calibration-card"><div class="shape">${item.sizeClass.toUpperCase()} REFERENCE</div><h3>${item.name}</h3><dl><dt>ID</dt><dd>${item.id}_1</dd><dt>Footprint</dt><dd>${item.footprint.join(' × ')}</dd><dt>Bounds</dt><dd>${item.rank1Bounds.join(' × ')} px</dd><dt>Zone</dt><dd>${item.zone}</dd></dl></article>`);
});

const buildingSelect = document.querySelector('#buildingSelect');
const rankSelect = document.querySelector('#rankSelect');
const promptOutput = document.querySelector('#promptOutput');
MANIFEST.buildings.forEach((building) => buildingSelect.add(new Option(`${String(MANIFEST.buildings.indexOf(building) + 1).padStart(2, '0')} · ${building.name}`, building.id)));

function renderPrompt() {
  const building = MANIFEST.buildings.find((entry) => entry.id === buildingSelect.value) || MANIFEST.buildings[0];
  const rank = Number(rankSelect.value);
  promptOutput.value = makePrompt(building, rank);
  document.querySelector('#promptTarget').textContent = `${building.id}_${rank}.png`;
  document.querySelector('#referenceList').textContent = `${MANIFEST.calibrationIds.map((id) => `${id}_1.png`).join(' · ')}${rank > 1 ? ` · ${building.id}_${rank - 1}.png` : ''}`;
}
buildingSelect.addEventListener('change', renderPrompt);
rankSelect.addEventListener('change', renderPrompt);
document.querySelector('#copyPrompt').addEventListener('click', async () => navigator.clipboard.writeText(promptOutput.value));
document.querySelector('#downloadPrompt').addEventListener('click', () => {
  const blob = new Blob([promptOutput.value], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${buildingSelect.value}_${rankSelect.value}.prompt.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
});
renderPrompt();

// codex:2026-08-02T10:44:59+02:00
const qaResults = document.querySelector('#qaResults');
const qaSummary = document.querySelector('#qaSummary');
const mapStage = document.querySelector('#mapStage');
const previewSlots = [[35, 51], [62, 38], [77, 59], [54, 69], [26, 73], [71, 78]];

function parseName(name) {
  const match = /^(camp_[a-z_]+)_([123])\.png$/i.exec(name);
  return match ? { id: match[1].toLowerCase(), rank: Number(match[2]) } : null;
}

async function inspectFile(file, previewIndex) {
  const parsed = parseName(file.name);
  const checks = [];
  const add = (status, name, detail) => checks.push({ status, name, detail });
  if (!parsed) return { file, overall: 'fail', checks: [{ status: 'fail', name: 'Dateiname', detail: 'camp_<id>_<rank>.png erwartet' }] };
  const building = MANIFEST.buildings.find((item) => item.id === parsed.id);
  if (!building) return { file, overall: 'fail', checks: [{ status: 'fail', name: 'ID', detail: `${parsed.id} nicht im Manifest` }] };

  const bitmap = await createImageBitmap(file);
  bitmap.width === 1536 && bitmap.height === 1536 ? add('pass', 'Canvas', '1536 × 1536') : add('fail', 'Canvas', `${bitmap.width} × ${bitmap.height}`);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1, visible = 0, edge = 0;
  const rows = new Uint32Array(canvas.height);
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    const alpha = pixels[(y * canvas.width + x) * 4 + 3];
    if (alpha <= 16) continue;
    visible += 1; rows[y] += 1; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    if (x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) edge += 1;
  }
  if (!visible) add('fail', 'Alpha', 'Keine sichtbaren Pixel');
  else {
    const transparency = 1 - visible / (canvas.width * canvas.height);
    transparency >= .35 ? add('pass', 'Alpha', `${(transparency * 100).toFixed(1)} % transparent`) : add('fail', 'Alpha', `nur ${(transparency * 100).toFixed(1)} % transparent`);
    edge === 0 ? add('pass', 'Außenrand', 'vollständig frei') : add('fail', 'Außenrand', `${edge} belegte Pixel`);
    const scale = MANIFEST.rankScale[parsed.rank];
    const targetW = Math.round(building.rank1Bounds[0] * scale), targetH = Math.round(building.rank1Bounds[1] * scale);
    const width = maxX - minX + 1, height = maxY - minY + 1;
    const widthDev = Math.abs(width - targetW) / targetW * 100, heightDev = Math.abs(height - targetH) / targetH * 100;
    widthDev <= 8 && heightDev <= 8 ? add('pass', 'Bounds', `${width} × ${height}`) : add('fail', 'Bounds', `${width} × ${height}; Ziel ${targetW} × ${targetH}`);
    Math.abs((minX + maxX) / 2 - 768) <= 24 ? add('pass', 'Zentrum', `x=${((minX + maxX) / 2).toFixed(1)}`) : add('fail', 'Zentrum', `x=${((minX + maxX) / 2).toFixed(1)}`);
    Math.abs(maxY - 1352) <= 20 ? add('pass', 'Baseline', `y=${maxY}`) : add('fail', 'Baseline', `y=${maxY}; Ziel 1352±20`);
    let broadRows = 0;
    for (let y = Math.max(minY, maxY - Math.round(height * .12)); y <= maxY; y += 1) if (rows[y] > width * .72) broadRows += 1;
    broadRows > Math.max(8, height * .05) ? add('warn', 'Bodenheuristik', `${broadRows} breite Unterzeilen prüfen`) : add('pass', 'Bodenheuristik', 'kein Alpha-Teppich erkannt');
  }
  const overall = checks.some((check) => check.status === 'fail') ? 'fail' : checks.some((check) => check.status === 'warn') ? 'warn' : 'pass';
  const slot = previewSlots[previewIndex % previewSlots.length];
  const image = new Image();
  image.className = 'placed-asset';
  image.src = URL.createObjectURL(file);
  image.alt = building.name;
  image.style.left = `${slot[0]}%`;
  image.style.top = `${slot[1]}%`;
  image.style.width = `${Math.round(building.rank1Bounds[0] * MANIFEST.rankScale[parsed.rank] / 1536 * 29)}%`;
  mapStage.append(image);
  return { file, building, parsed, overall, checks };
}

document.querySelector('#assetInput').addEventListener('change', async (event) => {
  qaResults.innerHTML = '';
  mapStage.querySelectorAll('.placed-asset').forEach((image) => image.remove());
  const files = [...event.target.files];
  const results = [];
  for (let index = 0; index < files.length; index += 1) results.push(await inspectFile(files[index], index));
  const counts = { pass: 0, warn: 0, fail: 0 };
  results.forEach((result) => {
    counts[result.overall] += 1;
    qaResults.insertAdjacentHTML('beforeend', `<article class="qa-card ${result.overall}"><h3>${result.file.name}</h3>${result.checks.map((check) => `<div class="check ${check.status}"><b>${check.name}</b><span>${check.status.toUpperCase()} · ${check.detail}</span></div>`).join('')}</article>`);
  });
  qaSummary.textContent = `${files.length} geprüft · ${counts.pass} PASS · ${counts.warn} WARN · ${counts.fail} FAIL`;
});

// codex:2026-08-02T10:44:59+02:00
document.querySelectorAll('[data-viewport]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-viewport]').forEach((item) => item.classList.toggle('active', item === button));
  document.querySelector('#viewportShell').classList.toggle('ultrawide', button.dataset.viewport === '3440');
  document.querySelector('#viewportLabel').textContent = button.dataset.viewport === '3440' ? '3440 × 1440' : '1920 × 1080';
}));
document.querySelectorAll('[data-light]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-light]').forEach((item) => item.classList.toggle('active', item === button));
  mapStage.classList.toggle('night', button.dataset.light === 'night');
  mapStage.classList.toggle('day', button.dataset.light === 'day');
}));

