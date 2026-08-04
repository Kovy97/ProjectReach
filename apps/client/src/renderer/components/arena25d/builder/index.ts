/**
 * Scene-Builder — Barrel-Export. Der EINE externe Berührungspunkt (`main.tsx`, s. Kommentar dort
 * "SCENE BUILDER MOUNT SWITCH") importiert ausschließlich von hier — Entfernen des Werkzeugs heißt:
 * `builder/`-Ordner löschen + die paar Zeilen in `main.tsx` zurückbauen, sonst nichts. Gleiches
 * Muster wie `../index.ts` für `Arena25DStage`.
 */
export { SceneBuilderApp } from "./SceneBuilderApp";
export { getSceneBuilderZoneId, SCENE_BUILDER_SUPPORTED } from "./flag";
