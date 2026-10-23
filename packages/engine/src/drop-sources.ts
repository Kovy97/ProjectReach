// claude:2026-10-23T20:30:00+02:00 — Drop-Quellen-Index (1.4.0 „Feder und Stahl“, ST + BG).
//
// Einmal je ContentDB berechnet: für jedes Item alle Stellen, an denen es FALLEN kann, mit dem Level der Quelle.
// Quellen: Monster-Beute (Monster-Level), Champion-Unikat und -Zusatzbeute (Level des Basis-Monsters), Dungeon-Truhe
// und -Abschluss (`requiredLevel`), Slayer-Turm-Monster (Kennzeichen tower), Paragon-Truhen (Kennzeichen paragon).
// Grundlage für (a) die Herkunftsregel der Bergung (Chef 23.10.: „nur gedroppte Items“) und (b) den Stufen-Rückfall
// für Ausrüstung ohne Trage-Anforderung (design/1.4.0-balance-werkstatt.md §1.2). Rein, kein State, kein RNG.
import type { ContentDB, ItemId, LootRoll } from "@hearthforge/shared";
import { RAID_DIFFICULTIES, RAID_VARIANT_SUFFIX } from "@hearthforge/shared";

export type DropSourceKind = "monster" | "elite" | "dungeon" | "tower" | "paragon" | "raid";

export interface DropSource {
  kind: DropSourceKind;
  /** Level der Quelle (Monster-Level, Dungeon-`requiredLevel`); Paragon ohne Level = 300. */
  level: number;
}

const cache = new WeakMap<ContentDB, Map<ItemId, DropSource[]>>();

function build(content: ContentDB): Map<ItemId, DropSource[]> {
  const map = new Map<ItemId, DropSource[]>();
  const add = (itemId: ItemId | undefined, src: DropSource): void => {
    if (!itemId) return;
    const list = map.get(itemId);
    if (list) list.push(src);
    else map.set(itemId, [src]);
  };
  const addRolls = (rolls: LootRoll[] | undefined, src: DropSource): void => {
    for (const r of rolls ?? []) add(r.itemId, src);
  };
  const towerIds = new Set<string>();
  for (const floor of content.slayerTower ?? []) for (const id of floor.monsters) towerIds.add(id);
  for (const m of Object.values(content.monsters)) {
    addRolls(m.loot, { kind: towerIds.has(m.id) ? "tower" : "monster", level: m.level });
  }
  for (const e of Object.values(content.elites ?? {})) {
    const level = content.monsters[e.baseMonsterId]?.level ?? 1;
    add(e.uniqueItemId, { kind: "elite", level });
    addRolls(e.extraLoot, { kind: "elite", level });
  }
  for (const d of content.dungeons) {
    addRolls(d.chest?.loot, { kind: "dungeon", level: d.requiredLevel });
    addRolls(d.loot, { kind: "dungeon", level: d.requiredLevel });
  }
  for (const tier of content.paragon?.chest ?? []) addRolls(tier.loot, { kind: "paragon", level: 300 });
  // claude:2026-10-26T01:35:00+02:00 — Raid-Beute (Boss-Tabellen samt Stufen-Varianten, Trash- und Nebenbeute, Wochentruhe): sonst hatten die
  // Raid-Teile keine Drop-Quelle und galten für die Bergung als nicht zerlegbar (A13, QA-Lager P2).
  for (const raid of content.raids ?? []) {
    for (const room of raid.rooms) {
      const level = content.monsters[room.bossId]?.level ?? 300;
      for (const e of room.table.entries) {
        for (const d of RAID_DIFFICULTIES) add(`${e.itemId}${RAID_VARIANT_SUFFIX[d]}`, { kind: "raid", level });
      }
    }
    for (const row of [...raid.trashLoot, ...raid.bossSideLoot]) add(row.itemId, { kind: "raid", level: 300 });
    for (const e of raid.weeklyChest.extraItems) add(e.itemId, { kind: "raid", level: 300 });
  }
  return map;
}

/** Alle Drop-Quellen eines Items (leer = fällt nirgends). */
export function dropSourcesOf(content: ContentDB, itemId: ItemId): readonly DropSource[] {
  let map = cache.get(content);
  if (!map) {
    map = build(content);
    cache.set(content, map);
  }
  return map.get(itemId) ?? [];
}

/**
 * Quell-Level eines Drops für die Stufen-Ableitung ohne Trage-Anforderung (Werkstatt-Spec §1.2): die niedrigste
 * Quelle, Turm und Paragon nur, wenn es keine andere gibt. null = keine Drop-Quelle.
 */
export function lowestDropSourceLevel(content: ContentDB, itemId: ItemId): number | null {
  const srcs = dropSourcesOf(content, itemId);
  if (srcs.length === 0) return null;
  const main = srcs.filter((s) => s.kind !== "tower" && s.kind !== "paragon");
  const pool = main.length > 0 ? main : srcs;
  return Math.min(...pool.map((s) => s.level));
}

/** Quell-Level → gleichwertige Trage-Anforderung (Werkstatt-Spec §1.2, Median der Anforderungen je Band). */
export function sourceLevelToWearLevel(level: number): number {
  if (level < 100) return Math.max(1, level);
  if (level < 150) return 80;
  if (level < 225) return 90;
  if (level < 275) return 95;
  return 99;
}
