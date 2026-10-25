import { content } from "@hearthforge/content";

/**
 * Wiki→Kampfgebiet-Sprung: spiegelt util/skillJump.ts (dortiges JSDoc erklärt das Grundmuster
 * ausführlich) für den zweiten Sprung-Typ aus dem Item-Wiki — Klick auf eine Monster-Quelle-Zeile
 * (`SourceRow`, `kind: "monster"`) statt eine Rezept-Zeile. `ItemWikiModalOverlay` sitzt außerhalb
 * von MainLayout und kann `activePageId` nicht direkt setzen; dieser modul-globale Mini-Store
 * merkt sich BEIDES — die Ziel-Monster-ID (von CombatPage.tsx einmalig konsumiert, s.
 * `consumeMonsterJumpTarget`) UND den Seitenwechsel zur Kampf-Seite (von MainLayout abonniert, s.
 * `subscribeMonsterJump`/`getMonsterJumpNav`).
 */
interface MonsterJumpNav {
  pageId: string;
  /** Steigt bei jedem Sprung — auch ein Sprung auf DIESELBE Seite (z.B. zwei Monster nacheinander
   *  aus dem Wiki heraus angeklickt) muss CombatPages Effect erneut auslösen. */
  nonce: number;
}

let navRequest: MonsterJumpNav | null = null;
let pendingMonsterId: string | null = null;
/** claude:2026-10-25T10:32:00+01:00 — B1 (1.4.1): Ziel-Zone eines Champion-Sprungs (s. jumpToElite). */
let pendingEliteZoneId: string | null = null;
let navNonce = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Springt zu einem Monster: merkt die Ziel-Monster-ID vor (CombatPage sucht die Zone, in der es
 * vorkommt, öffnet deren Monster-Karten-Ansicht und pulst die Karte kurz auf, s. dortiges JSDoc)
 * UND löst die Navigation zur Kampf-Seite aus. No-op bei einer unbekannten monsterId
 * (Content-Guard, spiegelt jumpToAction).
 */
export function jumpToMonster(monsterId: string): void {
  if (!content.monsters[monsterId]) return;
  pendingMonsterId = monsterId;
  pendingEliteZoneId = null; // claude:2026-10-25T10:32:00+01:00 — der jüngste Sprung gewinnt
  navRequest = { pageId: "combat", nonce: ++navNonce };
  emit();
}

/**
 * claude:2026-10-25T10:32:00+01:00 — B1 (1.4.1, Spieler-Report „Champion-Fenster springt zum falschen Gegner"): Sprung zur
 * Champion-Karte einer Zone. `jumpToMonster(variant.baseMonsterId)` hob die normale Karte des
 * Grundmonsters hervor, der Spieler kämpfte dann gegen den gewöhnlichen Gegner. CombatPage öffnet
 * hier die Zone und scrollt zur Champion-Karte (`#elitecard-<zoneId>`); ist der Champion inzwischen
 * verschwunden, fällt sie auf die Karte des Grundmonsters zurück. No-op bei unbekannter Zone.
 */
export function jumpToElite(zoneId: string): void {
  if (!content.zones.some((z) => z.id === zoneId)) return;
  pendingEliteZoneId = zoneId;
  pendingMonsterId = null;
  navRequest = { pageId: "combat", nonce: ++navNonce };
  emit();
}

/** claude:2026-10-25T10:32:00+01:00 — Liest UND löscht die ausstehende Champion-Ziel-Zone (Muster consumeMonsterJumpTarget). */
export function consumeEliteJumpTarget(): string | null {
  const id = pendingEliteZoneId;
  pendingEliteZoneId = null;
  return id;
}

/** `useSyncExternalStore`-Subscribe für MainLayout (App.tsx). */
/** claude:2026-10-25T01:30:00+02:00 — Sprung auf eine beliebige Seite (z. B. Quests aus dem Kopf-Chip), gleiche Nav-Leitung wie jumpToMonster. */
export function jumpToPage(pageId: string): void {
  navRequest = { pageId, nonce: ++navNonce };
  emit();
}

export function subscribeMonsterJump(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aktuelle Navigations-Anfrage (oder `null`, wenn noch nie gesprungen wurde). */
export function getMonsterJumpNav(): MonsterJumpNav | null {
  return navRequest;
}

/** Liest UND löscht die ausstehende Ziel-Monster-ID (einmalig konsumierbar — ein späterer,
 *  unabhängiger CombatPage-Mount darf denselben Sprung nicht ein zweites Mal auslösen). */
export function consumeMonsterJumpTarget(): string | null {
  const id = pendingMonsterId;
  pendingMonsterId = null;
  return id;
}
