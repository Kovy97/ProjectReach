/**
 * Re-Export-Punkt für die Jagen-Engine-API (design/handwerk-fasern-jagen/spec-technik.md §3).
 *
 * `packages/engine/src/hunting.ts` ist inzwischen von logic-dev geliefert und exportiert alle
 * zehn Funktionen 1:1 nach Spezifikation (plus `huntBaitCount` als Komfort-Helfer) — reine
 * Re-Exports, keine lokalen Stubs mehr. HuntingPage.tsx importiert ausschließlich von hier, nie
 * direkt von `@hearthforge/engine`, damit ein künftiger API-Umbau nur diese eine Datei träfe.
 */
export {
  clearHuntTrap,
  huntBaitCount,
  huntCatchChance,
  huntSetReason,
  huntTrapSlots,
  huntTrapWaiting,
  huntZoneDef,
  huntableMonsters,
  setHuntAutoRebait,
  setHuntTrap,
  tickHuntTraps,
} from "@hearthforge/engine";
export type { HuntSetReason } from "@hearthforge/engine";
// Köder-Stufen (28.08.2026): welcher Köder für ein Gebiet gilt; huntBaitCount(state, baitId) zählt je Sorte.
export { huntZoneBaitId } from "@hearthforge/engine";
export { HUNT_BAIT_TIERS, huntBaitForZoneLevel } from "@hearthforge/shared";
