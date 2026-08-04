import type { ActionId, GameState, ItemId, MonsterDef, MonsterId } from "@hearthforge/shared";

/** Hat der Spieler diesen Drop von diesem Monster schon mal erbeutet? */
export function hasDropSeen(state: GameState, monsterId: MonsterId, itemId: ItemId): boolean {
  return state.seenDrops[monsterId]?.includes(itemId) ?? false;
}

/** Markiert einen Drop als entdeckt (Collection-Log). Idempotent. */
export function markDropSeen(state: GameState, monsterId: MonsterId, itemId: ItemId): void {
  const list = (state.seenDrops[monsterId] ??= []);
  if (!list.includes(itemId)) list.push(itemId);
}

/** Hat der Spieler diesen Drop von dieser Aktion schon mal erhalten? (Aktions-Collection-Log) */
export function hasActionDropSeen(state: GameState, actionId: ActionId, itemId: ItemId): boolean {
  return state.seenActionDrops[actionId]?.includes(itemId) ?? false;
}

/** Markiert einen Aktions-Drop als entdeckt (Spiegel von markDropSeen). Idempotent. */
export function markActionDropSeen(state: GameState, actionId: ActionId, itemId: ItemId): void {
  const list = (state.seenActionDrops[actionId] ??= []);
  if (!list.includes(itemId)) list.push(itemId);
}

/**
 * Selektor für die UI (Bestiarium, SAVE 58): lebenslange Kills am Monster `monsterId`.
 * Einzige Lese-Schnittstelle — die UI greift nie raw in `state.monsterKills`.
 * (Inkrement-Stelle: combat.ts `onEnemyDefeated` — alle Kill-Pfade, Normal- wie Dungeon-Wellen.)
 */
export function monsterKills(state: GameState, monsterId: MonsterId): number {
  const n = state.monsterKills?.[monsterId];
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

/** Wie viele der möglichen Drops eines Monsters sind entdeckt? */
export function seenDropCount(state: GameState, monster: MonsterDef): { seen: number; total: number } {
  const total = monster.loot.length;
  const seenList = state.seenDrops[monster.id] ?? [];
  let seen = 0;
  for (const roll of monster.loot) if (seenList.includes(roll.itemId)) seen++;
  return { seen, total };
}
