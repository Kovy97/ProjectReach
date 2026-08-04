/**
 * Task #330 — Barrel-Export. Der EINE externe Berührungspunkt (CombatPage.tsx, s. "ARENA25D MOUNT
 * SWITCH" dort) importiert ausschließlich von hier — Entfernen des Features heißt: diesen Ordner
 * löschen + den Mount-Switch-Block in CombatPage.tsx zurückbauen, sonst nichts.
 */
export { Arena25DStage, type Arena25DFighter, type Arena25DFloaterInput, type Arena25DStageProps } from "./Arena25DStage";
export { isArena25dActive, ARENA25D_SUPPORTED } from "./flag";
