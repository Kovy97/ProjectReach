import type { ContentDB, GameState } from "@hearthforge/shared";
import { createGame } from "./state";
import type { CharacterCreation } from "./character";

/**
 * Zentrale Test-Fixtures (ceo-run-2026-07-13 Welle G).
 *
 * Hintergrund: Welle D2 hat die Story-Zonen-Gates (Aschechronik, `ZoneDef.requiresQuest`) in den
 * Content eingetragen — seither liegt z. B. `goblin` (borderlands) hinter `chronicle_03`, und
 * `startCombat` auf frischem `createGame()`-State lehnt KORREKT ab (leere `legacyZoneGrants`,
 * keine Quest abgeschlossen). Die Mechanik-Tests (Kampf, Loot, Status, Regen, …) prüfen aber
 * KAMPF-VERHALTEN, nicht das Gating — sie bekommen hier alle Zonen freigeschaltet, über denselben
 * Bestandsschutz-Pfad (`legacyZoneGrants`), den auch die v63-Migration für Alt-Saves nutzt.
 * Das Gating-Verhalten selbst testet ausschließlich zone-gating.test.ts (ohne diese Helfer).
 *
 * NICHT in index.ts exportieren — reine Test-Infrastruktur, kein Engine-API.
 */

/**
 * Schaltet ALLE Content-Zonen des States frei (Bestandsschutz-Grant je Zone, s. isZoneUnlocked (b)).
 * Semantik: „dieser Test prüft Kampf-Mechanik, nicht Story-Gating". Gibt den State für Chaining zurück.
 */
export function grantAllZones(state: GameState, content: ContentDB): GameState {
  for (const z of content.zones) state.legacyZoneGrants[z.id] = true;
  return state;
}

/**
 * Schaltet ALLE Content-Dungeons des States frei (Bestandsschutz-Eintrag `dungeonsUnlocked`,
 * s. isDungeonUnlocked (a) — überstimmt Quest-Gate UND Trägerzone). Welle J (2026-07-13,
 * quest-based unlock): Semantik „dieser Test prüft Dungeon-MECHANIK (Wellen/Loot/Clear), nicht
 * das Story-Gating" — hält Mechanik-Tests K-fest, wenn Welle K `requiresQuest` auf die echten
 * Dungeons legt. Das Gating selbst testet ausschließlich dungeon.test.ts (ohne diesen Helfer).
 * Gibt den State für Chaining zurück.
 */
export function grantAllDungeons(state: GameState, content: ContentDB): GameState {
  for (const d of content.dungeons) state.dungeonsUnlocked[d.id] = true;
  return state;
}

/**
 * `createGame` + `grantAllZones` in einem Schritt — Drop-in-Ersatz für die Kampf-Test-Fixtures
 * (identische Signatur/Rückgabe wie createGame; nur die Story-Zonen-Gates sind offen).
 */
export function createTestGame(
  creation: CharacterCreation,
  content: ContentDB,
  seed?: number,
): GameState {
  return grantAllZones(seed === undefined ? createGame(creation, content) : createGame(creation, content, seed), content);
}
