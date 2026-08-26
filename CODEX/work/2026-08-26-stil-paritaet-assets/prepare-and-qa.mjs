// codex:2026-08-26T13:40:00+02:00
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

const root = "G:/GameDev/CODEX/assets/stil-paritaet-2026-08-26";
const rawDir = path.join(root, "raw");
const finalDir = path.join(root, "fertig");
const qaDir = path.join(root, "qa");
const promptsPath = "G:/GameDev/CODEX/work/2026-08-26-stil-paritaet-assets/PROMPTS.md";

await fs.mkdir(finalDir, { recursive: true });
await fs.mkdir(qaDir, { recursive: true });

const promptText = await fs.readFile(promptsPath, "utf8");
const blockRe = /###\s+(\d+)\s+·\s+`([^`]+)`[^\n]*[\s\S]*?```\r?\n([\s\S]*?)\r?\n```/g;
const items = [];
let match;
while ((match = blockRe.exec(promptText))) {
  items.push({ n: Number(match[1]), id: match[2], prompt: match[3] });
}
if (items.length !== 47) throw new Error(`Expected 47 prompt blocks, found ${items.length}`);

const groups = [
  { key: "a1-bows", title: "A1 Bows", from: 1, to: 10 },
  { key: "a2-magic", title: "A2 Magic", from: 11, to: 18 },
  { key: "a3-leather", title: "A3 Leather", from: 19, to: 29 },
  { key: "a4-cloth", title: "A4 Cloth", from: 30, to: 45 },
  { key: "a7-tonics", title: "A7 Tonics", from: 46, to: 47 },
];

function alphaBounds(data, width, height, threshold = 4) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let nonzero = 0;
  let semi = 0;
  let maxAlpha = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > maxAlpha) maxAlpha = a;
      if (a > 0 && a < 250) semi += 1;
      if (a > threshold) {
        nonzero += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("No visible alpha pixels");
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1, nonzero, semi, maxAlpha };
}

async function inspect(file) {
  const { data, info } = await sharp(file).ensureAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(data, info.width, info.height);
  let outerPixels = 0;
  const border = 16;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (x >= border && x < info.width - border && y >= border && y < info.height - border) continue;
      if (data[(y * info.width + x) * 4 + 3] !== 0) outerPixels += 1;
    }
  }
  // codex:2026-08-26T13:47:00+02:00
  return { canvasWidth: info.width, canvasHeight: info.height, channels: info.channels, ...bounds, outer16Nonzero: outerPixels };
}

const qa = [];
for (const item of items) {
  const input = path.join(rawDir, `${item.id}-raw.png`);
  const output = path.join(finalDir, `${item.id}.png`);
  const { data, info } = await sharp(input).ensureAlpha().toColourspace("srgb").raw().toBuffer({ resolveWithObject: true });
  const rawBounds = alphaBounds(data, info.width, info.height);
  const maxContentWidth = 928;
  const maxContentHeight = 880;
  const scale = Math.min(maxContentWidth / rawBounds.width, maxContentHeight / rawBounds.height);
  const width = Math.max(1, Math.round(rawBounds.width * scale));
  const height = Math.max(1, Math.round(rawBounds.height * scale));
  const left = Math.round((1024 - width) / 2);
  const top = Math.max(24, 1024 - 36 - height);
  const subject = await sharp(input)
    .ensureAlpha()
    .extract({ left: rawBounds.minX, top: rawBounds.minY, width: rawBounds.width, height: rawBounds.height })
    .resize(width, height, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: subject, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
  const finalStats = await inspect(output);
  const hash = crypto.createHash("sha256").update(await fs.readFile(output)).digest("hex");
  qa.push({ id: item.id, group: groups.find((g) => item.n >= g.from && item.n <= g.to)?.key, raw: { width: info.width, height: info.height, ...rawBounds }, final: finalStats, sha256: hash });
}

const backgrounds = [
  { key: "transparent", rgba: { r: 0, g: 0, b: 0, alpha: 0 } },
  { key: "black", rgba: { r: 10, g: 10, b: 12, alpha: 1 } },
  { key: "gray", rgba: { r: 112, g: 112, b: 116, alpha: 1 } },
  { key: "magenta", rgba: { r: 255, g: 0, b: 210, alpha: 1 } },
];

async function contactSheet(group, background, cell = 252, labelHeight = 42) {
  const selected = items.filter((item) => item.n >= group.from && item.n <= group.to);
  const cols = group.key === "a7-tonics" ? 2 : group.key === "a4-cloth" ? 4 : 5;
  const rows = Math.ceil(selected.length / cols);
  const width = cols * cell;
  const height = rows * (cell + labelHeight) + 44;
  const composites = [];
  composites.push({ input: Buffer.from(`<svg width="${width}" height="44"><rect width="100%" height="100%" fill="#17191d"/><text x="16" y="29" fill="#e5e0d5" font-family="Arial" font-size="20">${group.title} — ${background.key}</text></svg>`), top: 0, left: 0 });
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const thumb = await sharp(path.join(finalDir, `${item.id}.png`)).resize(cell - 20, cell - 20, { fit: "contain" }).png().toBuffer();
    composites.push({ input: thumb, left: col * cell + 10, top: 44 + row * (cell + labelHeight) + 10 });
    const label = `<svg width="${cell}" height="${labelHeight}"><rect width="100%" height="100%" fill="#17191d"/><text x="${cell / 2}" y="25" text-anchor="middle" fill="#ddd7c8" font-family="Arial" font-size="13">${item.id}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: col * cell, top: 44 + row * (cell + labelHeight) + cell });
  }
  const base = sharp({ create: { width, height, channels: 4, background: background.rgba } });
  await base.composite(composites).png().toFile(path.join(qaDir, `contact-sheet-${group.key}-${background.key}.png`));
}

for (const group of groups) {
  for (const background of backgrounds) await contactSheet(group, background);
}

// codex:2026-08-26T14:02:00+02:00
const referenceMap = {
  "a1-bows": ["copper_shortbow.webp", "stolen_shortbow.webp", "copper_longbow.webp", "iron_longbow.webp"],
  "a2-magic": ["gnarled_staff.webp", "iron_staff.webp", "iron_wand.webp", "iron_focus.webp"],
  "a3-leather": ["cowhide_jerkin.webp", "direhide_jerkin.webp", "padfoot_boots.webp"],
  "a4-cloth": ["silk_mantle.webp", "arcane_cape.webp", "aetherweave_leggings.webp"],
  "a7-tonics": ["tonic_stoneskin.webp", "tonic_keeneye.webp"],
};
const referenceDir = "G:/GameDev/apps/client/src/renderer/assets/items";

async function comparisonSheet(group) {
  const selected = items.filter((item) => item.n >= group.from && item.n <= group.to);
  const references = referenceMap[group.key];
  const entries = [
    ...references.map((name) => ({ name: `BESTAND · ${name.replace(/\.webp$/, "")}`, file: path.join(referenceDir, name) })),
    ...selected.map((item) => ({ name: `NEU · ${item.id}`, file: path.join(finalDir, `${item.id}.png`) })),
  ];
  const cols = 5;
  const cell = 246;
  const labelHeight = 42;
  const rows = Math.ceil(entries.length / cols);
  const width = cols * cell;
  const height = 44 + rows * (cell + labelHeight);
  const composites = [{ input: Buffer.from(`<svg width="${width}" height="44"><rect width="100%" height="100%" fill="#17191d"/><text x="16" y="29" fill="#e5e0d5" font-family="Arial" font-size="20">${group.title} — Bestandsvergleich</text></svg>`), left: 0, top: 0 }];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const thumb = await sharp(entry.file).ensureAlpha().resize(cell - 20, cell - 20, { fit: "contain" }).png().toBuffer();
    composites.push({ input: thumb, left: col * cell + 10, top: 44 + row * (cell + labelHeight) + 10 });
    const label = `<svg width="${cell}" height="${labelHeight}"><rect width="100%" height="100%" fill="#17191d"/><text x="${cell / 2}" y="25" text-anchor="middle" fill="#ddd7c8" font-family="Arial" font-size="12">${entry.name}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: col * cell, top: 44 + row * (cell + labelHeight) + cell });
  }
  await sharp({ create: { width, height, channels: 4, background: { r: 112, g: 112, b: 116, alpha: 1 } } })
    .composite(composites)
    .png()
    .toFile(path.join(qaDir, `bestandsvergleich-${group.key}.png`));
}

async function sizeProbe(group) {
  const selected = items.filter((item) => item.n >= group.from && item.n <= group.to);
  const cols = 4;
  const cellWidth = 308;
  const cellHeight = 248;
  const rows = Math.ceil(selected.length / cols);
  const width = cols * cellWidth;
  const height = 44 + rows * cellHeight;
  const composites = [{ input: Buffer.from(`<svg width="${width}" height="44"><rect width="100%" height="100%" fill="#17191d"/><text x="16" y="29" fill="#e5e0d5" font-family="Arial" font-size="20">${group.title} — UI 48 / 96 / 175 px</text></svg>`), left: 0, top: 0 }];
  for (let index = 0; index < selected.length; index += 1) {
    const item = selected[index];
    const col = index % cols;
    const row = Math.floor(index / cols);
    const baseLeft = col * cellWidth;
    const baseTop = 44 + row * cellHeight;
    for (const [size, offset] of [[48, 12], [96, 75], [175, 128]]) {
      const icon = await sharp(path.join(finalDir, `${item.id}.png`)).resize(size, size, { fit: "contain" }).png().toBuffer();
      composites.push({ input: icon, left: baseLeft + offset, top: baseTop + 20 + (175 - size) });
    }
    const label = `<svg width="${cellWidth}" height="44"><rect width="100%" height="100%" fill="#17191d"/><text x="${cellWidth / 2}" y="25" text-anchor="middle" fill="#ddd7c8" font-family="Arial" font-size="12">${item.id}</text></svg>`;
    composites.push({ input: Buffer.from(label), left: baseLeft, top: baseTop + 204 });
  }
  await sharp({ create: { width, height, channels: 4, background: { r: 16, g: 17, b: 20, alpha: 1 } } })
    .composite(composites)
    .png()
    .toFile(path.join(qaDir, `ui-scale-${group.key}.png`));
}

for (const group of groups) {
  await comparisonSheet(group);
  await sizeProbe(group);
}

await fs.writeFile(path.join(qaDir, "qa.json"), `${JSON.stringify({ generatedAt: "2026-08-26T13:40:00+02:00", count: qa.length, qa }, null, 2)}\n`, "utf8");

// codex:2026-08-26T13:47:00+02:00
const failures = qa.filter((entry) => entry.final.canvasWidth !== 1024 || entry.final.canvasHeight !== 1024 || entry.final.channels !== 4 || entry.final.maxAlpha < 250 || entry.final.outer16Nonzero !== 0);
console.log(JSON.stringify({ count: qa.length, failures, minHeight: Math.min(...qa.map((x) => x.final.height)), maxHeight: Math.max(...qa.map((x) => x.final.height)) }, null, 2));
if (failures.length) throw new Error(`${failures.length} QA failures`);
