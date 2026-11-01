import type { GameState } from "@hearthforge/shared";

/**
 * claude:2026-10-31T16:08:21+01:00 — SAVE 103 (1.4.2 Warteschlangen-Vorlagen): die Fläche, die die Migration < 103 an JEDEM Alt-Stand
 * ergänzt, für die „sonst byte-genau“-Gegenproben der Vault-/Migrationstests (Muster `erwarteSave101Flaechen`). Nur von Tests benutzt.
 *  - `queueTemplates` mit drei leeren Plätzen (ein Stand < 103 kannte keine Vorlagen).
 */
export function erwarteSave103Flaechen(state: GameState): void {
  state.queueTemplates = [null, null, null];
}
