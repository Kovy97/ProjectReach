import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// codex:2026-08-02T22:06:00+02:00 — reproduzierbare, verlustarm rückrollbare Übergabe des
// chefseitig freigegebenen Encampment-V3-Satzes aus AssetControl in den Runtime-Importordner.
const workspace = path.resolve(import.meta.dirname, "../../../..");
const control = path.join(workspace, "CODEX", "AssetControl", "NewHaven-Encampment-V3-2026-08-02");
const runtime = path.join(workspace, "apps", "client", "src", "renderer", "assets", "camp");
const backup = path.join(workspace, "CODEX", "backups", "new-haven-runtime-before-encampment-v3-2026-08-02");

const buildingIds = [
  "camp_townhall",
  "camp_fishing_hut",
  "camp_fence_tent",
  "camp_mine_adit",
  "camp_sawpit",
  "camp_scrivener_tent",
  "camp_seed_garden",
  "camp_smelter",
  "camp_smokehouse",
  "camp_storehouse",
  "camp_trade_post",
  "camp_trophy_wall",
  "camp_warden_shrine",
  "camp_watchtower",
  "camp_workyard",
];

const buildingSources = buildingIds.flatMap((id) => [1, 2, 3].flatMap((rank) => [
  `${id}_${rank}.png`,
  `${id}_${rank}_night.png`,
]));
const constructionSources = [
  "camp_slot_empty_day.png",
  "camp_slot_empty_night.png",
  "camp_site_day.png",
  "camp_site_night.png",
  "camp_scaffold_day.png",
  "camp_scaffold_night.png",
];
const mapSources = ["camp_map_day.png", "camp_map_night.png"];

async function assertFiles(dir, names) {
  const present = new Set(await readdir(dir));
  const missing = names.filter((name) => !present.has(name));
  if (missing.length > 0) throw new Error(`Missing approved sources in ${dir}: ${missing.join(", ")}`);
}

async function backupRuntime() {
  await mkdir(backup, { recursive: true });
  // codex:2026-08-02T22:18:00+02:00 — ein abgebrochener Encoderlauf darf das bereits vollständige
  // Pre-V3-Backup niemals mit einem teilweise ausgetauschten Runtime-Satz überschreiben.
  const existingBackup = new Set(await readdir(backup));
  const expectedRuntime = [
    ...buildingSources,
    ...constructionSources,
    ...mapSources,
  ].map((name) => name.replace(/\.png$/, ".webp"));
  if (expectedRuntime.every((name) => existingBackup.has(name))) return;
  for (const name of await readdir(runtime)) {
    const source = path.join(runtime, name);
    if ((await stat(source)).isFile()) await copyFile(source, path.join(backup, name));
  }
}

async function encode(source, target, isMap = false) {
  const image = sharp(source, { failOn: "error" });
  const metadata = await image.metadata();
  if (!isMap && (metadata.width !== 1536 || metadata.height !== 1536 || metadata.channels !== 4)) {
    throw new Error(`Invalid transparent asset contract: ${source} (${metadata.width}x${metadata.height}, ${metadata.channels} channels)`);
  }
  if (isMap && (metadata.width !== 3344 || metadata.height !== 1882)) {
    throw new Error(`Invalid map contract: ${source} (${metadata.width}x${metadata.height})`);
  }
  await image.webp({ quality: isMap ? 91 : 94, alphaQuality: 100, effort: 4, smartSubsample: true }).toFile(target);
}

async function inParallel(items, worker, concurrency = 6) {
  // codex:2026-08-02T22:18:00+02:00 — begrenzte Parallelität hält den atomaren Deploy unter dem
  // Tool-Zeitfenster, ohne Sharp mit 98 gleichzeitigen Encodern den Arbeitsspeicher fluten zu lassen.
  let cursor = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const item = items[cursor++];
      await worker(item);
    }
  }));
}

await assertFiles(path.join(control, "production"), buildingSources);
await assertFiles(path.join(control, "construction"), constructionSources);
await assertFiles(path.join(control, "map"), mapSources);
await backupRuntime();

await inParallel(buildingSources, async (name) => {
  await encode(
    path.join(control, "production", name),
    path.join(runtime, name.replace(/\.png$/, ".webp")),
  );
});
await inParallel(constructionSources, async (name) => {
  await encode(
    path.join(control, "construction", name),
    path.join(runtime, name.replace(/\.png$/, ".webp")),
  );
});
await inParallel(mapSources, async (name) => {
  await encode(
    path.join(control, "map", name),
    path.join(runtime, name.replace(/\.png$/, ".webp")),
    true,
  );
}, 2);

console.log(JSON.stringify({
  backup,
  runtime,
  deployed: buildingSources.length + constructionSources.length + mapSources.length,
}, null, 2));
