import type { GameState, PrestigeRespec142 } from "@hearthforge/shared";
import { PRESTIGE_TALENT_TREE_ID, emptyPrestigeRespecRetro } from "@hearthforge/shared";

/**
 * claude:2026-10-31T14:58:54+01:00 — SAVE 102 (Narben-Rückgabe und Nachzahlung zu 1.4.2, Chef-Auftrag 31.10.2026): die Flächen, die das
 * erste Laden eines Stands < 102 ändert, für die „sonst byte-genau“-Gegenproben der Vault-/Migrationstests (Muster
 * `erwarteSave101Flaechen`). Nur von Tests benutzt.
 *  - ohne Rückgabe und ohne Nachzahlung (kein Sturz, nichts ausgegeben): nur `prestige.respec142` = null;
 *  - mit `beleg`: genau dieser Beleg (die Tests rechnen Guthaben, Ränge und Hauptbuch selbst sichtbar nach).
 */
export function erwarteSave102Flaechen(state: GameState, beleg: PrestigeRespec142 | null = null): void {
  state.prestige.respec142 = beleg;
}

/**
 * claude:2026-10-31T14:58:54+01:00 — SAVE 102 an einem Dev-Stand 99–101 (nur die Rückgabe, keine Nachzahlung): alle Ränge im Narbenbuch
 * weg, `points += pointsSpent`, `pointsSpent = 0`, Beleg mit `refunded` (null, wenn nichts ausgegeben war). Der Jägerkodex bleibt.
 */
export function erwarteSave102Rueckgabe(state: GameState): void {
  const refunded = state.prestige.pointsSpent;
  delete state.talents[PRESTIGE_TALENT_TREE_ID];
  state.prestige.points += refunded;
  state.prestige.pointsSpent = 0;
  state.prestige.respec142 = refunded > 0 ? { refunded, retro: emptyPrestigeRespecRetro(), acknowledged: false } : null;
}
