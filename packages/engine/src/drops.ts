import { DUNGEON_VARIANT_PREFIX } from "@hearthforge/shared";
import type { ActionId, GameState, ItemId, MonsterDef, MonsterId } from "@hearthforge/shared";

/**
 * Spieler-Report 30.08.2026 ("Crypt dungeon ... shows as if I haven't"): Der Kampfschirm zeigte im
 * Dungeon dauerhaft "0/6", obwohl die Beute laengst im Inventar lag. Ursache war eine Diskrepanz
 * zwischen Schreib- und Lesepfad: Dungeon-Gegner tragen die Id `dg_<basis>`, und der Kill-Pfad
 * schreibt bewusst unter der BASIS-Id (combat.ts `killCreditMonsterId`, damit Varianten-Beute im
 * Bestiarium des Grundmonsters landet). Die Leser hier nahmen dagegen die rohe Id - also
 * `seenDrops["dg_gray_wolf"]`, das nie befuellt wird. Im normalen Kampf faellt das nicht auf, weil
 * dort Basis-Id und Monster-Id identisch sind. Die Leser loesen die Variante jetzt selbst auf.
 */
function seenListe(state: GameState, monsterId: MonsterId): ItemId[] {
  const direkt = state.seenDrops[monsterId];
  if (direkt && direkt.length > 0) return direkt;
  if (monsterId.startsWith(DUNGEON_VARIANT_PREFIX)) {
    return state.seenDrops[monsterId.slice(DUNGEON_VARIANT_PREFIX.length)] ?? [];
  }
  return direkt ?? [];
}

/** Hat der Spieler diesen Drop von diesem Monster schon mal erbeutet? */
export function hasDropSeen(state: GameState, monsterId: MonsterId, itemId: ItemId): boolean {
  return seenListe(state, monsterId).includes(itemId);
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
  const seenList = seenListe(state, monster.id);
  let seen = 0;
  for (const roll of monster.loot) if (seenList.includes(roll.itemId)) seen++;
  return { seen, total };
}
