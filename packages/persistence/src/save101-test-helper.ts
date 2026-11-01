import type { GameState } from "@hearthforge/shared";

/**
 * claude:2026-10-31T11:46:28+01:00 — SAVE 101 (1.4.2 Rezepte anpinnen): die Fläche, die die Migration < 101 an JEDEM Alt-Stand
 * ergänzt, für die „sonst byte-genau“-Gegenproben der Vault-/Migrationstests (Muster `erwarteSave100Flaechen`). Nur von Tests benutzt.
 *  - `pinnedRecipes` leer (ein Stand < 101 kannte keine Pins).
 */
export function erwarteSave101Flaechen(state: GameState): void {
  state.pinnedRecipes = [];
}
