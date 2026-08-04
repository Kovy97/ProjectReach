// codex:2026-08-02T18:11:25+02:00
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOOL_DIR = path.resolve(SCRIPT_DIR, '..');

// codex:2026-08-02T18:44:00+02:00
export function makePrompt(manifest, building, rank, rankArchetypes = {}) {
  const scale = manifest.rankScale[String(rank)];
  const targetWidth = Math.round(building.rank1Bounds[0] * scale);
  const targetHeight = Math.round(building.rank1Bounds[1] * scale);
  const previousRank = rank > 1 ? `${building.id}_${rank - 1}.png` : 'none';
  const calibrationRefs = manifest.calibrationIds.map((id) => `${id}_1.png`).join(', ');
  const rankArchetype = rankArchetypes[building.id]?.[rank - 1] ?? building.visual;

  return `NEW HAVEN LOCKED ASSET PRODUCTION\n\n` +
    `OUTPUT: ${building.id}_${rank}.png\n` +
    `SUBJECT: ${building.name}, rank ${rank} of 3\n` +
    `VISUAL FUNCTION: ${building.visual}\n` +
    `RANK ARCHETYPE: ${rankArchetype}\n` +
    `WORLD FOOTPRINT: ${building.footprint[0]} x ${building.footprint[1]} reference units\n` +
    `SIZE CLASS: ${building.sizeClass}\n` +
    `TARGET VISIBLE BOUNDS: ${targetWidth} x ${targetHeight} px within a 1536 x 1536 canvas\n` +
    `ANCHOR: ground contact at canvas pixel 768,1352; center the built footprint on x=768\n\n` +
    `LOCKED CAMERA: orthographic projection, azimuth 45 degrees clockwise, elevation 35.264 degrees. ` +
    `Vertical edges stay vertical. Screen ground axes run at approximately -30 and +30 degrees. ` +
    `Do not use perspective, a different camera height, a close-up lens, or a top-down view.\n\n` +
    `LOCKED LIGHT: one broad soft key from screen upper-left at 35 degrees elevation, cool low ambient fill, ` +
    `no separate rim-light direction. Coal black, ash-grey, cold iron, dark charred wood, dirty ochre and ` +
    `restrained oxblood palette; only functional ember, plant-green or restrained brass accents.\n\n` +
    `STYLE: readable painted dark-fantasy game asset for a fortified frontier encampment, coherent with Grim Reach Ashen Iron. ` +
    `Soot-blackened beams, rough fieldstone, dull forged iron, dark hide and heavy patched canvas. ` +
    `The structure is squat, practical, repaired and siege-ready. NO cheerful village, NO picturesque Fachwerk, ` +
    `NO colorful market-fair styling, NO whimsical roofline. Strong silhouette and medium detail readable at map scale. ` +
    `Rank ${rank} must remain recognizably the same building family${rank > 1 ? ` and visibly grow from ${previousRank}` : ''}.\n\n` +
    `TRANSPARENCY CONTRACT: exact RGBA PNG, fully transparent background. Show the building and only objects ` +
    `physically attached to it. NO soil, grass, gravel, rock slab, water, terrain tile, floor diamond, painted ` +
    `ground ellipse, ground-contact shadow, detached prop scatter, label, UI, border or text. Internal ambient ` +
    `occlusion on the structure is allowed. Keep every outer canvas edge completely transparent.\n\n` +
    `REFERENCE LOCK: attach the exact approved calibration images without replacing or reinterpreting them: ` +
    `${calibrationRefs}.${rank > 1 ? ` Also attach ${previousRank} as the same-family geometry reference.` : ''}\n\n` +
    `FINAL CHECK: 1536 x 1536, sRGB, true alpha, visible bounds near ${targetWidth} x ${targetHeight}, ` +
    `bottom contact y=1352, centered at x=768, no crop, no ground, no cast shadow.`;
}

export async function generatePackets(mode = 'calibration', toolDir = TOOL_DIR) {
  const manifest = JSON.parse(await readFile(path.join(toolDir, 'manifest.json'), 'utf8'));
  // codex:2026-08-02T18:44:00+02:00
  const rankArchetypes = JSON.parse(await readFile(path.join(toolDir, 'rank-archetypes.json'), 'utf8'));
  const outDir = path.join(toolDir, 'out', mode === 'all' ? 'all-buildings' : 'calibration');
  await mkdir(outDir, { recursive: true });
  const selected = mode === 'all'
    ? manifest.buildings
    : manifest.buildings.filter((building) => manifest.calibrationIds.includes(building.id));
  const ranks = mode === 'all' ? [1, 2, 3] : [1];
  const written = [];

  for (const building of selected) {
    for (const rank of ranks) {
      const filename = `${building.id}_${rank}.prompt.txt`;
      await writeFile(path.join(outDir, filename), makePrompt(manifest, building, rank, rankArchetypes), 'utf8');
      written.push(filename);
    }
  }

  const packetManifest = {
    status: mode === 'all' ? 'requires_approved_calibration_before_use' : 'calibration_candidates_only',
    sourceManifest: '../../manifest.json',
    count: written.length,
    files: written,
  };
  await writeFile(path.join(outDir, 'packet-manifest.json'), `${JSON.stringify(packetManifest, null, 2)}\n`, 'utf8');
  return { outDir, written };
}

// codex:2026-08-02T18:11:25+02:00
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const mode = process.argv[2] === 'all' ? 'all' : 'calibration';
  const result = await generatePackets(mode);
  console.log(`Wrote ${result.written.length} prompt packet(s) to ${result.outDir}`);
}
