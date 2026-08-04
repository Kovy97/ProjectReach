import { content } from "@hearthforge/content";

/**
 * Wiki→Rezept-Sprung: der "?"-Item-Wiki (ItemWikiModal.tsx) sitzt außerhalb von MainLayout (s.
 * App.tsx, `<ItemWikiModalOverlay />` neben `<Root />`) und kann `activePageId` deshalb nicht
 * direkt setzen — MainLayout hält diesen State lokal. Modul-globaler Mini-Store (gleiches Muster
 * wie das frühere util/pinnedActions.ts bzw. ItemWikiModal's eigener `store`): ein Klick auf eine
 * Quelle-/Verwendungs-Zeile im Wiki merkt sich hier BEIDES — die Ziel-Aktion (von SkillPage.tsx
 * einmalig konsumiert, s. `consumeSkillJumpTarget`) UND den Seitenwechsel dorthin (von MainLayout
 * abonniert, s. `subscribeSkillJump`/`getSkillJumpNav`).
 */
interface SkillJumpNav {
  pageId: string;
  /** Steigt bei jedem Sprung — auch ein Sprung auf DIESELBE Seite (z.B. zwei Rezepte im selben
   *  Skill nacheinander) muss MainLayouts Effect erneut auslösen. */
  nonce: number;
}

let navRequest: SkillJumpNav | null = null;
let pendingActionId: string | null = null;
let navNonce = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Springt zu einer Aktion: merkt die Ziel-Aktions-ID vor (SkillPage öffnet ihre Kategorie und
 * pulst kurz auf, s. dortiges JSDoc) UND löst die Navigation zur zugehörigen Skill-Seite aus.
 * No-op bei einer unbekannten actionId (Content-Guard). Combat-/Farming-/Slayer-Aktionen leben
 * nicht auf der generischen SkillPage — die Navigation klappt trotzdem (Seite existiert), nur
 * der Aufklapp-/Scroll-/Puls-Teil bleibt dort aus (SkillPage.tsx ist der einzige Konsument).
 */
export function jumpToAction(actionId: string): void {
  const action = content.actions[actionId];
  if (!action) return;
  pendingActionId = actionId;
  navRequest = { pageId: action.skill, nonce: ++navNonce };
  emit();
}

/** `useSyncExternalStore`-Subscribe für MainLayout (App.tsx). */
export function subscribeSkillJump(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Aktuelle Navigations-Anfrage (oder `null`, wenn noch nie gesprungen wurde). */
export function getSkillJumpNav(): SkillJumpNav | null {
  return navRequest;
}

/** Liest UND löscht die ausstehende Ziel-Aktion (einmalig konsumierbar — ein späterer,
 *  unabhängiger SkillPage-Mount darf denselben Sprung nicht ein zweites Mal auslösen). */
export function consumeSkillJumpTarget(): string | null {
  const id = pendingActionId;
  pendingActionId = null;
  return id;
}
