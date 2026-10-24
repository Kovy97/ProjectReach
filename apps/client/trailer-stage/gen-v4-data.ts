// claude:2026-10-24T11:55:00+02:00 — Trailer v4 „Inventar“: zieht Zahlen, englische Namen und Bildpfade aus dem Content,
// damit keine Einblendung von Hand getippt ist. Aufruf (aus apps/client): npx tsx trailer-stage/gen-v4-data.ts
import { existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "../../../packages/content/src/index.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ASSETS = resolve(here, "../src/renderer/assets");
const has = (p: string): boolean => existsSync(resolve(ASSETS, p));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const c = content as any;
const en = (n: { en?: string } | undefined): string => n?.en ?? "";

const GATHER = ["woodcutting", "mining", "fishing", "farming", "foraging", "thieving", "hunting"];
const CRAFT = ["smithing", "cooking", "leatherworking", "tailoring", "bowcraft", "jewelcrafting", "runecrafting", "herblore"];
const skillIds = Object.keys(c.skills);
const skills = skillIds.map((id) => ({
  id,
  name: en(c.skills[id].name),
  group: GATHER.includes(id) ? "gathering" : CRAFT.includes(id) ? "crafting" : "combat",
  icon: has(`skills/${id}.webp`) ? `skills/${id}.webp` : `sidebar/sidebaricon_${id}.webp`,
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allItems = Object.values(c.items) as any[];
const base = allItems.filter((i) => !i.variantOf);
// Chef 24.10.: godgem_ring hat einen weißen Freistellungsrest im Ring; bleibt im Spiel, aber nicht im Trailer
const EXCLUDE = new Set(["godgem_ring"]);
const items = base.filter((i) => has(`items/${i.id}.webp`) && !EXCLUDE.has(i.id)).map((i) => ({ id: i.id, name: en(i.name), rarity: i.rarity ?? "none", slot: i.slot ?? null, img: `items/${i.id}.webp` }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const actions = Object.values(c.actions) as any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const monsters = (Object.values(c.monsters) as any[]).filter((m) => has(`monsters/${m.id}.webp`)).map((m) => ({ id: m.id, name: en(m.name), img: `monsters/${m.id}.webp` }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const elites = (Object.values(c.elites) as any[]).filter((m) => has(`monsters/${m.id}.webp`)).map((m) => ({ id: m.id, name: en(m.name), img: `monsters/${m.id}.webp` }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pets = (Object.values(c.pets) as any[]).filter((p) => has(`pets/${p.id}.webp`)).map((p) => ({ id: p.id, name: en(p.name), img: `pets/${p.id}.webp` }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const zones = (c.zones as any[]).map((z) => ({ id: z.id, name: en(z.name), img: has(`zones/${z.id}.webp`) ? `zones/${z.id}.webp` : null, battle: has(`battlescreens/${z.id}.webp`) ? `battlescreens/${z.id}.webp` : null }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dungeons = (c.dungeons as any[]).map((d) => ({ id: d.id, name: en(d.name), img: has(`battlescreens/${d.id}.webp`) ? `battlescreens/${d.id}.webp` : null }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sets = (c.sets as any[]).map((s) => ({ id: s.id, name: en(s.name), pieces: (s.pieces as string[]).filter((p) => has(`items/${p}.webp`)).map((p) => `items/${p}.webp`) }));
const races = ["human", "elf", "goblin", "orc"].filter((r) => has(`portraits/${r}_warrior_m.webp`));

const counts = {
  skills: skillIds.length,
  items: base.length,
  gear: base.filter((i) => i.slot).length,
  sets: c.sets.length,
  recipes: actions.filter((a) => a.inputs && Object.keys(a.inputs).length > 0).length,
  // verschiedene Monster: eindeutige englische Namen (ohne Dungeon-Doppel dg_* und gleichnamige Varianten)
  monsters: new Set((Object.values(c.monsters) as { name: { en: string } }[]).map((m) => m.name.en)).size,
  champions: Object.keys(c.elites).length,
  zones: c.zones.length,
  // eigenständige Dungeons: ohne die Raid-Säle gk_room_*
  dungeons: (c.dungeons as { id: string }[]).filter((d) => !d.id.startsWith("gk_")).length,
  raidHalls: c.raids[0]?.rooms?.length ?? 0,
  enchantments: Object.keys(c.affixes).length,
  suffixes: Object.keys(c.suffixes).length,
  achievements: c.achievements.length,
  quests: c.quests.length,
  companions: Object.keys(c.pets).length,
  talentTrees: c.talentTrees.length,
  races: races.length,
  languages: Object.keys(c.skills[skillIds[0]!].name).length,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const affixes = (Object.values(c.affixes) as any[]).map((a) => en(a.prefix));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const suffixes = (Object.values(c.suffixes) as any[]).map((s) => en(s.suffix));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const achievements = (c.achievements as any[]).map((a) => en(a.name));
const out = { counts, skills, items, monsters, elites, pets, zones, dungeons, sets, races, affixes, suffixes, achievements };
writeFileSync(resolve(here, "src/v4/data.json"), JSON.stringify(out));
console.log(JSON.stringify(counts));
console.log(`items mit Bild ${items.length}/${base.length}, Monster ${monsters.length}, Eliten ${elites.length}, Begleiter ${pets.length}`);
