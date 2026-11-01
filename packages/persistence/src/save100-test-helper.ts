import type { GameState } from "@hearthforge/shared";
import { defaultTokenShopLedger } from "@hearthforge/shared";

/**
 * claude:2026-10-30T22:28:00+01:00 — SAVE 100 (1.4.2 Belohnungsladen, design/1.4.2-belohnungsladen-plan.md § 5): die Flächen, die
 * die Migration < 100 an JEDEM Alt-Stand ergänzt, für die „sonst byte-genau“-Gegenproben der Vault-/Migrationstests (Muster
 * `erwarteSave99Flaechen`). Nur von Tests benutzt.
 *  - `tokenShopLedger` leer (noch nichts gekauft);
 *  - `settings.raidUseFeeWrit` aus;
 *  - `stats.closeWins` 0 (claude:2026-10-31T09:29:00+01:00 — Nachtrag „Heute nicht“, Siege mit höchstens 5 % Leben).
 */
export function erwarteSave100Flaechen(state: GameState): void {
  state.tokenShopLedger = defaultTokenShopLedger();
  state.settings.raidUseFeeWrit = false;
  state.stats.closeWins = 0; // claude:2026-10-31T09:29:00+01:00
}
