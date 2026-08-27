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
  huntZoneDef,
  huntableMonsters,
  setHuntAutoRebait,
  setHuntTrap,
  tickHuntTraps,
} from "@hearthforge/engine";
export type { HuntSetReason } from "@hearthforge/engine";
