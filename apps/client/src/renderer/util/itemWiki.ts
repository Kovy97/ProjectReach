import { content } from "@hearthforge/content";
import type { LocalizedString } from "@hearthforge/shared";
import { ELITE_UNIQUE_DROP_CHANCE_DEFAULT } from "@hearthforge/shared";

/**
 * Item-Wiki-Modal (Task #308, Chef-Feature): reverse-lookup indices "wo kommt das her" / "wofür
 * wird das gebraucht" — vormals modulweit in CharacterPage.tsx gebaut (`buildIndices`, ~Z.48-95),
 * jetzt hier heraufgezogen, weil das neue `ItemWikiModal` sie ebenfalls braucht (der "?"-Button im
 * Tooltip erscheint überall, nicht nur im Charakter-Inventar). CharacterPage's Source/Used-For-
 * Sektion im Detail-Panel ist dafür entfernt — die Infos leben jetzt nur noch im Modal.
 *
 * Erweiterung ggü. dem alten CharacterPage-Index: Dungeon-Loot (`content.dungeons[].loot`) als
 * eigene Source-Art `"dungeon"` — Dungeons droppen ihre Belohnungen NICHT über `monster.loot`
 * (jede Encounter-Welle droppt normal, der Dungeon-Loot-Pool ist eine SEPARATE Belohnung beim
 * Abschluss), tauchten im alten Index also gar nicht auf.
 *
 * Namen werden bewusst als `LocalizedString` gehalten (nicht früh auf `.en` aufgelöst wie im alten
 * CharacterPage-Code) — der Aufrufer löst sie zur Renderzeit über `tr()` auf, damit ein Sprachwechsel
 * (7 Sprachen, Localization-Sweep) sie sofort korrekt zeigt statt für immer auf Englisch zu kleben.
 *
 * Reine Content-Ableitung, einmalig beim Modulladen (kein State/Reaktivität nötig — der Content-
 * Katalog ändert sich nie zur Laufzeit).
 */
export type ItemWikiSource =
  | { kind: "monster"; monsterId: string; name: LocalizedString; chance: number }
  | { kind: "dungeon"; dungeonId: string; name: LocalizedString; chance: number }
  // Spieler-Report 28.08.2026 („Greytooth Mantle: no Sources info"): Champion-Unikate und Champion-Zusatzbeute
  // (content.elites, uniqueItemId/extraLoot) waren wiki-blind.
  | { kind: "champion"; eliteId: string; name: LocalizedString; zoneId: string; chance: number }
  | { kind: "action"; actionId: string; name: LocalizedString; skillId: string; chance: number }
  | { kind: "shop"; cost: number }
  // Chef-Audit 2026-07-09: 20 Items waren wiki-blind — Farming-Erträge, Slayer-Shop, Token-Shop
  // sind ebenso legitime Quellen und werden jetzt mitindiziert.
  | { kind: "crop"; cropId: string; name: LocalizedString }
  | { kind: "slayerShop"; cost: number }
  | { kind: "tokenShop"; tokenCost: number };

export interface ItemWikiUse {
  actionId: string;
  actionName: LocalizedString;
  skillId: string;
  /** Primärer Output der Aktion (garantierter Loot bevorzugt, sonst der erste) — das Item, das aus
   *  dem Verbrauch entsteht. Als ID gehalten (nicht nur Name), damit das Modal per Klick dorthin
   *  weiterspringen kann (Chef-Kür: "Klick öffnet das Wiki des Ziel-Items"). */
  outputItemId: string;
  outputName: LocalizedString;
}

function buildIndices(): {
  sourceIndex: Map<string, ItemWikiSource[]>;
  usedForIndex: Map<string, ItemWikiUse[]>;
} {
  const sourceIndex = new Map<string, ItemWikiSource[]>();
  const usedForIndex = new Map<string, ItemWikiUse[]>();

  const pushSource = (itemId: string, entry: ItemWikiSource): void => {
    const list = sourceIndex.get(itemId) ?? [];
    list.push(entry);
    sourceIndex.set(itemId, list);
  };

  for (const monster of Object.values(content.monsters)) {
    for (const roll of monster.loot) {
      pushSource(roll.itemId, { kind: "monster", monsterId: monster.id, name: monster.name, chance: roll.chance });
    }
  }

  for (const dungeon of content.dungeons) {
    for (const roll of dungeon.loot) {
      pushSource(roll.itemId, { kind: "dungeon", dungeonId: dungeon.id, name: dungeon.name, chance: roll.chance });
    }
  }

  for (const elite of Object.values(content.elites ?? {})) {
    pushSource(elite.uniqueItemId, {
      kind: "champion", eliteId: elite.id, name: elite.name, zoneId: elite.zone,
      chance: elite.uniqueDropChance ?? ELITE_UNIQUE_DROP_CHANCE_DEFAULT,
    });
    for (const roll of elite.extraLoot ?? []) {
      pushSource(roll.itemId, { kind: "champion", eliteId: elite.id, name: elite.name, zoneId: elite.zone, chance: roll.chance });
    }
  }

  for (const action of Object.values(content.actions)) {
    for (const roll of action.loot) {
      pushSource(roll.itemId, { kind: "action", actionId: action.id, name: action.name, skillId: action.skill, chance: roll.chance });
    }
    if (action.inputs) {
      // Primärer Output: bevorzugt ein GARANTIERTER Loot-Eintrag (chance 1) statt blind loot[0] —
      // manche Rezepte listen einen seltenen Nebendrop vor dem eigentlichen Hauptprodukt.
      const primary = action.loot.find((l) => l.chance >= 1) ?? action.loot[0];
      const outputItem = primary ? content.items[primary.itemId] : undefined;
      if (primary && outputItem) {
        for (const inp of action.inputs) {
          const list = usedForIndex.get(inp.itemId) ?? [];
          list.push({
            actionId: action.id,
            actionName: action.name,
            skillId: action.skill,
            outputItemId: outputItem.id,
            outputName: outputItem.name,
          });
          usedForIndex.set(inp.itemId, list);
        }
      }
    }
  }

  for (const entry of content.shop) {
    pushSource(entry.itemId, { kind: "shop", cost: entry.cost });
  }

  // Farming: Ernte-Erträge (+ Saatgut-Verwendung — Samen werden beim Pflanzen verbraucht).
  for (const crop of Object.values(content.crops ?? {})) {
    pushSource(crop.yieldItem, { kind: "crop", cropId: crop.id, name: crop.name });
    const yieldDef = content.items[crop.yieldItem];
    if (yieldDef) {
      const list = usedForIndex.get(crop.seedItem) ?? [];
      list.push({
        actionId: `crop:${crop.id}`,
        actionName: crop.name,
        skillId: "farming",
        outputItemId: crop.yieldItem,
        outputName: yieldDef.name,
      });
      usedForIndex.set(crop.seedItem, list);
    }
  }

  for (const entry of content.slayerShop ?? []) {
    pushSource(entry.itemId, { kind: "slayerShop", cost: entry.cost });
  }
  for (const offer of content.tokenShop ?? []) {
    pushSource(offer.itemId, { kind: "tokenShop", tokenCost: offer.tokenCost });
  }

  return { sourceIndex, usedForIndex };
}

const { sourceIndex, usedForIndex } = buildIndices();

/** itemId → alle bekannten Quellen (Monster-Drop/Dungeon-Loot/Aktions-Loot/Shop). */
export const ITEM_SOURCE_INDEX: ReadonlyMap<string, ItemWikiSource[]> = sourceIndex;
/** itemId → alle Rezepte, die es als Zutat verbrauchen (+ deren primärer Output). */
export const ITEM_USED_FOR_INDEX: ReadonlyMap<string, ItemWikiUse[]> = usedForIndex;
