import { effectiveCapacity, usedCapacityUnits } from "@hearthforge/engine";
import type { ContentDB, GameState } from "@hearthforge/shared";
import { gameAlert } from "../components/GameAlert";

/**
 * Equip-Feedback (Chef-Bugfix 22.07.): ein stiller Equip-Fehlschlag gab dem Spieler bisher NULL
 * Rückmeldung (Klick, nichts passiert). Jede Equip-Aufrufstelle (EquipmentDoll Drag&Drop/Klick,
 * CharacterPage-Inventaraktionen, BankPage-Direktausrüsten) prüft jetzt den Rückgabewert und ruft
 * bei `false`/`{ok:false}` `reportEquipFailure` — voller/übervoller Bag bekommt die spezifische
 * Meldung, jeder andere Fehlschlag (fehlende Skill-Anforderung, ungültiges Item, …) den generischen
 * Fallback.
 */

/**
 * Die Engine-Equip-Funktionen (`equipItem`/`equipInstance`/`equipTool`) liefern aktuell noch
 * `{ ok, reason }`; der geplante Contract-Wechsel (logic-dev, parallel zu diesem Auftrag) liefert
 * künftig schlicht `boolean`. Normalisiert beide Formen, damit die UI nicht auf den exakten
 * Zeitpunkt des Wechsels warten muss (s. `equipSucceeded`-Aufrufer).
 */
export type EquipOutcome = boolean | { ok: boolean; reason?: string };

/** Liest den Erfolg aus einem Equip-Rückgabewert, egal ob `boolean` oder `{ok, reason}`. */
export function equipSucceeded(result: EquipOutcome): boolean {
  return typeof result === "boolean" ? result : result.ok;
}

/**
 * WoW-Stil-Fehlermeldung nach einem fehlgeschlagenen Equip-Aufruf: `alert.noBagSpace`, wenn das
 * Inventar zum Zeitpunkt des Fehlschlags voll ODER übervoll ist. Chef-Follow-up (23.07., parallel
 * gelandeter Engine-Fix): die "22/20"-Realität besteht aus 20 Slots + N Instanz-Zellen aus der
 * separaten Instanz-Tasche (`inventory.instances`) — `usedSlots` allein zählt die Instanzen NICHT
 * mit. `usedCapacityUnits` (= usedSlots + instances.length) ist das ehrliche Gesamtmaß.
 */
export function reportEquipFailure(state: GameState, content: ContentDB): void {
  const full = usedCapacityUnits(state.inventory) >= effectiveCapacity(state.inventory, content);
  gameAlert(full ? "alert.noBagSpace" : "alert.actionFailed");
}
