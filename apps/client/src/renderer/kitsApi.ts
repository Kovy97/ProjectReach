/**
 * RE-EXPORT-MODUL — ui-dev, 28.08.2026 (Chef-Entscheid: 3 Ausrüstungs-Kits mit eigenen Items,
 * Umschalten tauscht das GANZE Set, nur außerhalb des Kampfes).
 *
 * Die UI importiert Kit-Funktionen AUSSCHLIESSLICH aus DIESER Datei (nie direkt aus
 * "@hearthforge/engine"/"@hearthforge/shared") — ein künftiger API-Wechsel bliebe damit ein
 * reiner Tausch HIER, ohne Komponenten anzufassen.
 *
 * STATUS: echte Engine-API ist gelandet (packages/engine/src/loadouts.ts, geprüft per
 * `grep -n switchEquipKit packages/engine/src/loadouts.ts`) — kein STUB mehr nötig. `EquipKit`
 * lebt in shared (GameState.equipKits/activeKit), `switchEquipKit`/`kitSummary` in der Engine.
 */
export { EQUIP_KIT_COUNT, kitSummary, switchEquipKit } from "@hearthforge/engine";
export type { KitSummary, KitSwitchReason } from "@hearthforge/engine";
export type { EquipKit, EquipKitIndex } from "@hearthforge/shared";
