import type { ContentDB, GameState } from "@hearthforge/shared";

/**
 * Story-Zonen-Gating (Aschechronik, ceo-run-2026-07-13 Welle C).
 *
 * Kampf-Zonen können per Content-Feld `ZoneDef.requiresQuest` hinter eine Quest gelegt werden
 * (Chronik-Kapitel, Welle D2). Die EINZIGE Gate-Logik lebt hier — UI (Welle E), Slayer-Welt-Pool
 * und der Kampf-Start-Hard-Block (`canFightMonster`, slayer.ts → combat.ts startCombat) lesen
 * ausschließlich `isZoneUnlocked`. Solange kein Content `requiresQuest` setzt, ist alles ein
 * No-op (Mechanik neutral — heutiges Verhalten).
 */

/**
 * Ist die Zone betretbar? true, wenn
 *  (a) die Zone KEIN `requiresQuest` trägt (auch: unbekannte Zonen-ID → defensiv offen — die
 *      Content-Integrität sichert zones.test.ts, ein Gate darf nie aus Versehen entstehen), ODER
 *  (b) der Spielstand einen Bestandsschutz-Grant trägt (`legacyZoneGrants[zoneId]`,
 *      v63-Migration — Alt-Saves verlieren NIE Zugriff, CEO-Leitplanke), ODER
 *  (c) die Gate-Quest abgeschlossen ist. „Abgeschlossen" = Objectives erfüllt: eingelöst
 *      (`quests.claimed`) ODER erfüllt-claimbar (`quests.completed`, von evaluateQuests je
 *      advance gepflegt) — der Story-Beat zählt, nicht der Klick auf „Einlösen" (bewusst
 *      großzügiger als die requires-Kette der Quests, die strikt auf claimed geht).
 * Rein & deterministisch, kein RNG, kein State-Schreibzugriff.
 */
export function isZoneUnlocked(state: GameState, content: ContentDB, zoneId: string): boolean {
  const zone = content.zones.find((z) => z.id === zoneId);
  const req = zone?.requiresQuest;
  if (!req) return true;
  // Optional-Chaining defensiv: handgebaute Test-/Alt-States ohne das v63-Feld gelten als „kein Grant".
  if (state.legacyZoneGrants?.[zoneId] === true) return true;
  return state.quests.claimed.includes(req) || state.quests.completed.includes(req);
}
