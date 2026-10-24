// Textpass 1.4 · P4b Teil A (Ausrüstung) · Faktensammler
// lore-dev, 2026-10-24. Liest NUR den Content-Katalog, schreibt nichts in den Content.
// Eigener Dateiname, weil `fakten.ts` dem Parallel-Agenten (Materialien/Verbrauch/Werkzeuge) gehört.
// Aufruf:  cd G:/GameDev/apps/client && npx tsx G:/GameDev/design/lore/textpass-1.4/p4b/fakten-ausruestung.ts
// Ausgabe: p4b/fakten-ausruestung.json (alle Fakten je Item) + p4b/fakten-ausruestung-kompakt.txt (eine Zeile je Item)

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { content } from "../../../../packages/content/src/index";
import type { ItemDef, LootRoll, WeaponEffect } from "../../../../packages/shared/src/index";

const here = dirname(fileURLToPath(import.meta.url));

type Src = { kind: string; text: string };

const nameOf = (id: string): string => {
  const it = content.items[id];
  return it ? `${it.name.en}/${it.name.de}` : id;
};
const monName = (id: string): string => {
  const m = content.monsters[id];
  return m ? `${m.name.en}/${m.name.de}` : id;
};
const pct = (c: number): string => {
  if (c >= 1) return "100%";
  if (c >= 0.01) return `${(c * 100).toFixed(c * 100 >= 10 ? 0 : 1)}%`;
  return `1/${Math.round(1 / c)}`;
};
const effStr = (e: WeaponEffect): string => {
  const parts: string[] = [e.type];
  if (e.chance && e.chance < 1) parts.push(`chance ${e.chance}`);
  if (e.magnitude) parts.push(`mag ${e.magnitude}`);
  if (e.durationMs) parts.push(`${e.durationMs}ms`);
  if (e.threshold != null) parts.push(`thr ${e.threshold}`);
  if (e.stacks != null) parts.push(`stacks ${e.stacks}`);
  if (e.targetFamily) parts.push(`vs ${e.targetFamily}`);
  return parts.join(" ");
};
const kv = (o: Record<string, unknown> | undefined): string =>
  o ? Object.entries(o).filter(([, v]) => v != null && v !== 0).map(([k, v]) => `${k} ${v}`).join(", ") : "";

const isEmptyDesc = (it: ItemDef): boolean => {
  const d = it.description;
  if (!d) return true;
  const en = (d as { en?: string }).en ?? "";
  const de = (d as { de?: string }).de ?? "";
  return en.trim() === "" && de.trim() === "";
};

// ── Quellen-Index aufbauen ─────────────────────────────────────────────────────
const sources = new Map<string, Src[]>();
const add = (id: string, s: Src): void => {
  const arr = sources.get(id) ?? [];
  arr.push(s);
  sources.set(id, arr);
};

for (const a of Object.values(content.actions)) {
  for (const l of a.loot) {
    const inputs = (a.inputs ?? []).map((i) => `${nameOf(i.itemId)} x${i.qty}`).join(", ");
    const sk = content.skills[a.skill]?.name.de ?? a.skill;
    add(l.itemId, { kind: "craft", text: `${sk} ${a.levelRequired ?? 1} [${a.name.en}]${inputs ? ": " + inputs : ""}${l.chance < 1 ? " @" + pct(l.chance) : ""}` });
  }
}
for (const m of Object.values(content.monsters)) {
  for (const l of m.loot) {
    const tags = [m.zone, m.family, m.slayerFloor ? `Turm-Etage ${m.slayerFloor}` : "", m.dungeonOnly ? "nur Dungeon" : ""].filter(Boolean).join(", ");
    add(l.itemId, { kind: "drop", text: `${monName(m.id)} (L${m.level}; ${tags}) ${pct(l.chance)}` });
  }
}
for (const d of content.dungeons) {
  for (const l of d.loot) add(l.itemId, { kind: "dungeon", text: `${d.name.en}/${d.name.de} Abschluss ${pct(l.chance)}${d.raidOnly ? " [Raid]" : ""}` });
  for (const l of d.chest?.loot ?? []) add(l.itemId, { kind: "dungeon", text: `${d.name.en}/${d.name.de} Truhe ${pct(l.chance)}` });
}
for (const s of content.shop) add(s.itemId, { kind: "shop", text: `Laden ${s.cost}g` });
for (const s of content.slayerShop ?? []) add(s.itemId, { kind: "slayerShop", text: `Slayer-Laden ${s.cost} Pkt${s.slayerLevelRequired ? ", ab Slayer " + s.slayerLevelRequired : ""}` });
for (const s of content.tokenShop ?? []) add(s.itemId, { kind: "tokenShop", text: `Belohnungsladen ${s.tokenCost} Marken${s.shelfId ? " (" + s.shelfId + ")" : ""}` });
for (const e of Object.values(content.elites ?? {})) {
  const ev = e as unknown as { id: string; zone: string; baseMonsterId: string; name: { en: string; de: string }; uniqueItemId?: string; extraLoot?: LootRoll[] };
  if (ev.uniqueItemId) add(ev.uniqueItemId, { kind: "elite", text: `Elite-Unikat: ${ev.name.en}/${ev.name.de} (${ev.zone}, Basis ${monName(ev.baseMonsterId)})` });
  for (const l of ev.extraLoot ?? []) add(l.itemId, { kind: "elite", text: `Elite: ${ev.name.en}/${ev.name.de} (${ev.zone}) ${pct(l.chance)}` });
}
for (const t of content.paragon?.chest ?? []) {
  for (const l of t.loot) add(l.itemId, { kind: "paragon", text: `Paragonturm-Truhe ab Etage ${t.minFloor ?? 1} ${pct(l.chance)}` });
}
for (const q of content.quests) {
  for (const r of q.rewards.items ?? []) add(r.id, { kind: "quest", text: `Aufgabe „${q.name.en}/${q.name.de}“ x${r.qty}` });
}
for (const r of content.raids ?? []) {
  const rr = r as unknown as Record<string, unknown>;
  const json = JSON.stringify(rr);
  for (const m of json.matchAll(/"itemId":"([a-z0-9_]+)"/g)) add(m[1], { kind: "raid", text: `Raid ${(rr.id as string) ?? "?"}` });
}
const setOf = new Map<string, string>();
for (const s of content.sets) for (const p of s.pieces) setOf.set(p, `${s.name.en}/${s.name.de} (${s.pieces.length} Teile)`);

// ── Items filtern ─────────────────────────────────────────────────────────────
type Rec = {
  id: string; en: string; de: string; slot?: string; weapon?: string; magicTheme?: string; rarity: string;
  tier?: number; variantOf?: string; value?: number; req?: string; stats?: string; modifiers?: string; bonus?: string;
  skillBoost?: string; effects?: string[]; set?: string; sources: string[]; line: string;
};
const out: Rec[] = [];
for (const it of Object.values(content.items)) {
  if (it.type !== "equipment") continue;
  if (!isEmptyDesc(it)) continue;
  const stats: string[] = [];
  if (it.damageMin != null) stats.push(`dmg ${it.damageMin}–${it.damageMax} @${it.attackIntervalMs ?? 3000}ms`);
  if (it.spellFocus) stats.push(`spellFocus ${it.spellFocus}`);
  if (it.armorRating) stats.push(`armor ${it.armorRating}`);
  if (it.blockChance) stats.push(`block ${it.blockChance}`);
  if (it.evasionRating) stats.push(`evasion ${it.evasionRating}`);
  if (it.wardCapacity) stats.push(`ward ${it.wardCapacity}`);
  if (it.armorPen) stats.push(`armorPen ${it.armorPen}`);
  if (it.precision) stats.push(`precision ${it.precision}`);
  if (it.wardBreak) stats.push(`wardBreak ${it.wardBreak}`);
  if (it.primaryAttribute) stats.push(`primary ${it.primaryAttribute}`);
  if (it.primarySkillBoost) stats.push(`primaryBoost ${it.primarySkillBoost}`);
  const mods = kv(it.modifiers as Record<string, unknown>);
  const bonus = kv(it.bonus as Record<string, unknown>);
  const boost = kv(it.skillBoost as Record<string, unknown>);
  const req = kv(it.requirements as Record<string, unknown>);
  const effs: string[] = [];
  if (it.weaponEffect) effs.push(effStr(it.weaponEffect));
  for (const e of it.weaponEffects ?? []) effs.push(effStr(e));
  if (it.masterPerk) effs.push(`masterPerk ${it.masterPerk.kind} ${it.masterPerk.skill ?? ""} ${it.masterPerk.value}`);
  if (it.slayerHelm) effs.push("slayerHelm");
  const src = sources.get(it.id) ?? [];
  const weapon = it.weaponStyle ? `${it.weaponStyle}/${it.weaponType}${it.twoHanded ? " 2H" : ""}` : undefined;
  const srcTxt = src.length ? src.map((s) => s.text).join(" | ") : "KEINE QUELLE";
  const line =
    `${it.id} :: ${it.name.en} / ${it.name.de} :: ${it.slot}${weapon ? " " + weapon : ""}${it.magicTheme ? " [" + it.magicTheme + "]" : ""} :: ${it.rarity ?? "common"}${req ? " :: req " + req : ""}` +
    `${stats.length ? " :: " + stats.join(", ") : ""}${mods ? " :: mod " + mods : ""}${bonus ? " :: bonus " + bonus : ""}${boost ? " :: boost " + boost : ""}` +
    `${effs.length ? " :: FX " + effs.join("; ") : ""}${setOf.get(it.id) ? " :: SET " + setOf.get(it.id) : ""}\n    <- ${srcTxt}`;
  out.push({
    id: it.id, en: it.name.en, de: it.name.de, slot: it.slot, weapon, magicTheme: it.magicTheme, rarity: it.rarity ?? "common",
    tier: it.tier, variantOf: it.variantOf, value: it.value, req: req || undefined, stats: stats.join(", ") || undefined,
    modifiers: mods || undefined, bonus: bonus || undefined, skillBoost: boost || undefined, effects: effs.length ? effs : undefined,
    set: setOf.get(it.id), sources: src.map((s) => s.text), line,
  });
}

// Sortierung: Slot → Waffenstil/-typ → Requirement-Level → id
const slotOrder = ["mainhand", "offhand", "helmet", "body", "legs", "gloves", "boots", "cape", "amulet", "ring1", "ring2"];
const reqLevel = (r: Rec): number => {
  const m = (r.req ?? "").match(/(\d+)/g);
  return m ? Math.max(...m.map(Number)) : 0;
};
out.sort((a, b) => {
  const sa = slotOrder.indexOf(a.slot ?? ""), sb = slotOrder.indexOf(b.slot ?? "");
  if (sa !== sb) return sa - sb;
  const wa = a.weapon ?? "", wb = b.weapon ?? "";
  if (wa !== wb) return wa.localeCompare(wb);
  return reqLevel(a) - reqLevel(b) || a.id.localeCompare(b.id);
});

writeFileSync(join(here, "fakten-ausruestung.json"), JSON.stringify(out.map(({ line: _l, ...r }) => r), null, 1), "utf8");
writeFileSync(join(here, "fakten-ausruestung-kompakt.txt"), out.map((r) => r.line).join("\n") + "\n", "utf8");

const bySlot: Record<string, number> = {};
for (const r of out) {
  const k = `${r.slot}${r.weapon ? " " + r.weapon.split("/")[0] : ""}`;
  bySlot[k] = (bySlot[k] ?? 0) + 1;
}
console.log(`Ausrüstung ohne Beschreibung: ${out.length}`);
console.log(bySlot);
console.log("ohne Quelle:", out.filter((r) => r.sources.length === 0).map((r) => r.id).join(", ") || "keine");
