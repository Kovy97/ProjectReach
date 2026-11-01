import type { GameState } from "@hearthforge/shared";
import { FARM_PLOT_SLOTS, HUNT_TRAP_SLOTS_TOTAL, defaultPrestigePaidLedger, emptyFarmPlot, emptyHuntTrap } from "@hearthforge/shared";

/**
 * claude:2026-10-30T19:01:00+01:00 — SAVE 99 (1.4.2 „Aschesturz 2.0“, design/1.4.2-aschesturz-spec.md § 5): die Flächen, die
 * die Migration < 99 an JEDEM Alt-Stand ergänzt, für die „sonst byte-genau“-Gegenproben der Vault-/Migrationstests (Muster:
 * je SAVE-Bump eine Zeile in den `erwartet`-Blöcken). Nur von Tests benutzt.
 *  - `farmPlots` mit leeren Beeten auf FARM_PLOT_SLOTS (12) und `huntTraps` mit leeren Plätzen auf HUNT_TRAP_SLOTS_TOTAL (8);
 *  - `prestige.runStart.raidClears` = aktueller `raid.clears` (gezählt wird ab dem Update);
 *  - `prestige.paid` leer (E2).
 */
export function erwarteSave99Flaechen(state: GameState): void {
  while (state.farmPlots.length < FARM_PLOT_SLOTS) state.farmPlots.push(emptyFarmPlot());
  while (state.huntTraps.length < HUNT_TRAP_SLOTS_TOTAL) state.huntTraps.push(emptyHuntTrap());
  const clears = state.raid?.clears;
  state.prestige.runStart.raidClears = { normal: clears?.normal ?? 0, heroic: clears?.heroic ?? 0, mythic: clears?.mythic ?? 0 };
  state.prestige.paid = defaultPrestigePaidLedger();
}
