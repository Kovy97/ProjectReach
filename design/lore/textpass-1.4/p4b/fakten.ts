// claude:2026-10-24T23:40:00+02:00 — Textpass 1.4 P4b (Lore-Dev): Faktensammler für Items ohne Beschreibung.
// Reines Hilfsskript, liest nur. Aufruf aus dem Repo-Root:
//   node_modules/.bin/tsx design/lore/textpass-1.4/p4b/fakten.ts
// Schreibt fakten.json (strukturiert) und fakten.md (lesbar) in denselben Ordner.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "../../../../packages/content/src/index";
import { HUNT_BAIT_TIERS, ARROW_TIER_RANGED_LEVEL } from "../../../../packages/shared/src/index";

const here = dirname(fileURLToPath(import.meta.url));
const db: any = content;
const items: Record<string, any> = db.items;
const actions: Record<string, any> = db.actions;
const monsters: Record<string, any> = db.monsters;

const nameOf = (x: any) => (x?.name ? `${x.name.en} / ${x.name.de}` : "?");
const skillName = (id: string) => (db.skills[id] ? `${db.skills[id].name.de}` : id);
const pct = (c: number) => (c >= 1 ? "100 %" : `${(c * 100).toFixed(c * 100 < 1 ? 2 : 1).replace(/\.0$/, "")} %`);
const mins = (ms: number) => (ms % 60000 === 0 ? `${ms / 60000} min` : `${(ms / 1000).toFixed(1)} s`);

interface Fact {
  id: string;
  name_en: string;
  name_de: string;
  type: string;
  rarity?: string;
  value?: number;
  shelf?: string | null;
  sources: string[];
  uses: string[];
  effects: string[];
  refs: string[];
}

const target = Object.values(items).filter(
  (it: any) => !it.description && (it.type === "material" || it.type === "consumable" || it.type === "tool"),
);

// Generischer Referenzsucher: jede Stelle, an der die ID als Wert eines Schlüssels vorkommt.
const KEYS = new Set(["itemId", "id", "seedItem", "yieldItem", "slayerRequirement", "baitItemId", "keyItem", "variantOf"]);
function walk(node: any, path: string, hits: Map<string, string[]>, depth = 0) {
  if (depth > 12 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walk(v, `${path}[${i}]`, hits, depth + 1));
    return;
  }
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === "string" && KEYS.has(k) && items[v] && !(path === "" && k === "id")) {
      const list = hits.get(v) ?? [];
      list.push(`${path}.${k}`);
      hits.set(v, list);
    } else if (v && typeof v === "object") {
      walk(v, `${path}.${k}`, hits, depth + 1);
    }
  }
}
const hits = new Map<string, string[]>();
for (const section of Object.keys(db)) {
  if (section === "items") continue;
  walk(db[section], section, hits);
}

function describeAction(a: any): string {
  const ins = (a.inputs ?? []).map((i: any) => `${i.qty}× ${items[i.itemId]?.name.de ?? i.itemId}`).join(" + ");
  const outs = (a.loot ?? []).map((l: any) => `${l.min === l.max ? l.min : `${l.min}–${l.max}`}× ${items[l.itemId]?.name.de ?? l.itemId}${l.chance < 1 ? ` (${pct(l.chance)})` : ""}`).join(", ");
  return `${a.name.de} [${skillName(a.skill)} ${a.levelRequired ?? 1}] ${ins} → ${outs}`;
}

const facts: Fact[] = [];
for (const it of target as any[]) {
  const f: Fact = {
    id: it.id,
    name_en: it.name.en,
    name_de: it.name.de,
    type: it.type,
    rarity: it.rarity,
    value: it.value,
    shelf: it.shelf,
    sources: [],
    uses: [],
    effects: [],
    refs: [],
  };
  // Quellen: Aktionen
  for (const a of Object.values(actions) as any[]) {
    const roll = (a.loot ?? []).find((l: any) => l.itemId === it.id);
    if (roll) {
      const ins = (a.inputs ?? []).map((i: any) => `${i.qty}× ${items[i.itemId]?.name.de ?? i.itemId}`).join(" + ");
      f.sources.push(
        `AKTION ${a.name.en} / ${a.name.de} [${skillName(a.skill)} ${a.levelRequired ?? 1}, ${mins(a.durationMs)}]${ins ? ` aus ${ins}` : ""}: ${roll.min === roll.max ? roll.min : `${roll.min}–${roll.max}`}× zu ${pct(roll.chance)}`,
      );
    }
  }
  // Quellen: Monster
  const monsterSrc: string[] = [];
  for (const m of Object.values(monsters) as any[]) {
    const roll = (m.loot ?? []).find((l: any) => l.itemId === it.id);
    if (roll) {
      const zone = db.zones.find((z: any) => z.id === m.zone);
      monsterSrc.push(
        `${m.name.de} (Lv ${m.level}, ${zone ? zone.name.de : m.zone ?? "?"}${m.slayerFloor ? `, T${m.slayerFloor}` : ""}${m.dungeonOnly ? ", Dg" : ""}, ${roll.min === roll.max ? roll.min : `${roll.min}–${roll.max}`}× ${pct(roll.chance)})`,
      );
    }
  }
  if (monsterSrc.length) f.sources.push(`MONSTER (${monsterSrc.length}): ${monsterSrc.length > 10 ? monsterSrc.slice(0, 10).join("; ") + ` … +${monsterSrc.length - 10}` : monsterSrc.join("; ")}`);
  // Quellen: Laden
  for (const s of db.shop ?? []) if (s.itemId === it.id) f.sources.push(`LADEN: ${s.cost} Gold`);
  for (const s of db.slayerShop ?? []) if (s.itemId === it.id) f.sources.push(`SLAYER-LADEN: ${s.cost} Punkte${s.slayerLevelRequired ? `, ab Slayer ${s.slayerLevelRequired}` : ""}${s.maxPurchases ? `, max ${s.maxPurchases}×` : ""}`);
  for (const s of db.tokenShop ?? []) if (s.itemId === it.id) f.sources.push(`MARKENLADEN: ${s.qty}× für ${s.tokenCost} Aufgabenmarken${s.shelfId ? ` (Regal ${s.shelfId})` : ""}`);
  // Quellen: Dungeons
  for (const d of db.dungeons ?? []) {
    const r1 = (d.loot ?? []).find((l: any) => l.itemId === it.id);
    const r2 = (d.chest?.loot ?? []).find((l: any) => l.itemId === it.id);
    if (r1) f.sources.push(`DUNGEON-ABSCHLUSS ${d.name.en} / ${d.name.de}: ${r1.min}–${r1.max}× zu ${pct(r1.chance)}`);
    if (r2) f.sources.push(`DUNGEON-TRUHE ${d.name.en} / ${d.name.de}: ${r2.min}–${r2.max}× zu ${pct(r2.chance)}`);
  }
  // Quellen: Beete
  for (const c of Object.values(db.crops ?? {}) as any[]) {
    if (c.yieldItem === it.id) f.sources.push(`BEET ${c.name.en} / ${c.name.de} [Anbau ${c.levelRequired}, ${mins(c.growMs)}] aus Saat ${items[c.seedItem]?.name.de ?? c.seedItem}: ${c.yieldMin}–${c.yieldMax}×`);
    if (c.seedItem === it.id) f.uses.push(`SAAT für Beet ${c.name.en} / ${c.name.de} [Anbau ${c.levelRequired}, ${mins(c.growMs)}] → ${c.yieldMin}–${c.yieldMax}× ${items[c.yieldItem]?.name.de ?? c.yieldItem}`);
  }
  // Quellen: Quests
  for (const q of db.quests ?? []) {
    const r = (q.rewards?.items ?? []).find((x: any) => x.id === it.id);
    if (r) f.sources.push(`QUEST ${q.name.en} / ${q.name.de}: ${r.qty}×`);
  }
  // Quellen: Paragon-Truhen
  for (const t of db.paragon?.chest ?? []) {
    const r = (t.loot ?? []).find((l: any) => l.itemId === it.id);
    if (r) f.sources.push(`PARAGON-TRUHE ${JSON.stringify({ ...t, loot: undefined })}: ${r.min}–${r.max}× zu ${pct(r.chance)}`);
  }
  // Verwendungen: Rezepte
  const rec: string[] = [];
  for (const a of Object.values(actions) as any[]) {
    if ((a.inputs ?? []).some((i: any) => i.itemId === it.id)) rec.push(describeAction(a));
  }
  if (rec.length) f.uses.push(`REZEPTE (${rec.length}): ${rec.length > 8 ? rec.slice(0, 8).join(" | ") + ` … +${rec.length - 8}` : rec.join(" | ")}`);
  // Verwendungen: Gebäude
  for (const b of db.campBuildings ?? []) {
    b.levels.forEach((lv: any, i: number) => {
      const c = (lv.items ?? []).find((x: any) => x.itemId === it.id);
      if (c) f.uses.push(`GEBÄUDE ${b.name.en} / ${b.name.de} Stufe ${["I", "II", "III"][i]}: ${c.qty}×`);
    });
  }
  // Verwendungen: Slayer-Pflichtitem
  for (const m of Object.values(monsters) as any[]) {
    if (m.slayerRequirement === it.id) f.uses.push(`SLAYER-PFLICHT gegen ${m.name.en} / ${m.name.de} [Lv ${m.level}${m.slayerFloor ? `, Turm-Etage ${m.slayerFloor}` : ""}]${m.inflict ? ` (fügt zu: ${m.inflict.type} ${pct(m.inflict.chance)})` : ""}`);
  }
  // Verwendungen: Köder
  const bait = HUNT_BAIT_TIERS.find((b) => b.itemId === it.id);
  if (bait) f.uses.push(`KÖDER Stufe ${bait.tier}: Jagdgebiete ab Level ${bait.minZoneLevel}, geangelt ab Angeln ${bait.fishingLevel}`);
  for (const hz of db.huntingZones ?? []) {
    if (hz.baitItemId === it.id) f.uses.push(`KÖDER explizit für Jagdgebiet ${hz.zoneId} [Jagen ${hz.levelRequired}, Falle ${mins(hz.trapMs)}]`);
  }
  // Pfeil
  if (it.arrow) {
    const a = it.arrow;
    f.effects.push(`PFEIL Stufe ${a.tier} (Fernkampf ${ARROW_TIER_RANGED_LEVEL[a.tier - 1]}): +${a.bonusMin}–${a.bonusMax} Schaden${a.effect ? `, Effekt ${JSON.stringify(a.effect)}` : ""}`);
  }
  // Werkzeug
  if (it.tool) f.effects.push(`WERKZEUG für ${skillName(it.tool.skill)}: Tempo ×${it.tool.speedMult} (${Math.round((1 - it.tool.speedMult) * 100)} % schneller)`);
  // Verbrauch
  if (it.healAmount != null) f.effects.push(`HEILT ${it.healAmount} HP${it.healPct != null ? ` bzw. ${Math.round(it.healPct * 100)} % der max. HP` : ""}`);
  if (it.curesPoison) f.effects.push(`HEILT GIFT`);
  if (it.consumable) f.effects.push(`SONDERWIRKUNG ${JSON.stringify(it.consumable)}`);
  if (it.buff) {
    const b = it.buff;
    const parts: string[] = [];
    for (const [k, v] of Object.entries(b.bonus ?? {})) parts.push(`${k} ${v}`);
    for (const [k, v] of Object.entries(b.modifiers ?? {})) parts.push(`Attribut ${k} +${v}`);
    for (const [k, v] of Object.entries(b.trinity ?? {})) parts.push(`Trinity ${k} +${v}`);
    f.effects.push(`BUFF ${mins(b.durationMs)}${b.category ? ` [${b.category}]` : ""}: ${parts.join(", ")}`);
  }
  if (it.requirements) f.effects.push(`BRAUCHT ${JSON.stringify(it.requirements)}`);
  if (it.rune) f.effects.push(`RUNE ${JSON.stringify(it.rune)}`);
  if (it.bonus) f.effects.push(`BONUS ${JSON.stringify(it.bonus)}`);
  if (it.modifiers) f.effects.push(`MODIFIKATOREN ${JSON.stringify(it.modifiers)}`);
  // Generische Referenzen (alles, was oben nicht strukturiert erfasst ist)
  const covered = /^(actions\.|monsters\.|shop\[|slayerShop\[|tokenShop\[|dungeons\[|crops\.|quests\[.*rewards|campBuildings\[|huntingZones\[|paragon\.chest)/;
  f.refs = (hits.get(it.id) ?? []).filter((p) => !covered.test(p));
  facts.push(f);
}

facts.sort((a, b) => (a.type === b.type ? a.id.localeCompare(b.id) : a.type.localeCompare(b.type)));
writeFileSync(join(here, "fakten.json"), JSON.stringify(facts, null, 1), "utf8");

const lines: string[] = [];
lines.push(`# P4b Fakten — ${facts.length} Items ohne Beschreibung (material/consumable/tool)`, "");
const byType: Record<string, number> = {};
for (const f of facts) byType[f.type] = (byType[f.type] ?? 0) + 1;
lines.push(JSON.stringify(byType), "");
for (const f of facts) {
  lines.push(`## ${f.id} · ${f.name_en} / ${f.name_de} · ${f.type}${f.rarity ? ` · ${f.rarity}` : ""}${f.value != null ? ` · Wert ${f.value}` : ""}${f.shelf ? ` · Regal ${f.shelf}` : ""}`);
  for (const s of f.sources) lines.push(`- Quelle: ${s}`);
  for (const u of f.uses) lines.push(`- Nutzen: ${u}`);
  for (const e of f.effects) lines.push(`- Wirkung: ${e}`);
  for (const r of f.refs) lines.push(`- Ref: ${r}`);
  if (!f.sources.length) lines.push(`- (KEINE QUELLE GEFUNDEN)`);
  lines.push("");
}
writeFileSync(join(here, "fakten.md"), lines.join("\n"), "utf8");
console.log(`Items: ${facts.length}`, byType);
console.log(`Ohne Quelle: ${facts.filter((f) => !f.sources.length).map((f) => f.id).join(", ")}`);
