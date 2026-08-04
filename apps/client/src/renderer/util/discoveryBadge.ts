import type { GameState } from "@hearthforge/shared";

/**
 * Welle PP („NEU"-Funkel im Inventar): welche Basis-Item-IDs der Spieler bereits als „gesehen"
 * quittiert hat — NICHT im GameState (Chef-Vorgabe: kein Save-Bump für ein rein kosmetisches
 * UI-Badge), sondern in localStorage, PRO SAVE-SLOT gescoped über `character.createdAt`
 * (einmalig bei der Charaktererstellung gesetzter Zeitstempel, s. shared/index.ts
 * `CharacterState.createdAt`) — ein zweiter Charakter auf einem anderen Slot startet also mit
 * einer eigenen, leeren Quittungs-Liste, statt die eines anderen Spielstands zu erben oder zu
 * überschreiben.
 *
 * Wahrheit für "ist das ein Erstfund": `state.discoveredItems` (Engine, `isItemDiscovered`,
 * monoton, wird nie entfernt) — hier wird NUR verwaltet, ob der Spieler das Badge dazu schon
 * einmal gesehen/quittiert hat.
 *
 * Chef-Bugreport 23.07.: der Badge feuerte falsch (a) beim Unequip und (b) nach jedem Neustart
 * auf praktisch allen Items. Root Cause für (a): Paperdoll/Bank reichen `newBadge` nie durch (s.
 * ItemCell-Kommentar) — dort gibt es also NIE eine Hover-Quittierung, obwohl das Item dort
 * unzweifelhaft schon besessen ist. Sobald so ein Item (z.B. Start-Ausrüstung, nie durchs
 * Inventar-Grid gelaufen) per Unequip zurück ins Inventar fällt, war es nach alter Logik nie
 * "gesehen" → Fehlalarm. Root Cause für (b): eine frisch angelegte/aktualisierte Quittungs-Liste
 * startete LEER, statt mit dem vorhandenen Bestand befüllt zu werden → jedes bereits besessene
 * Item blitzte einmalig als "neu" auf. Fix: (1) Ausrüstung + Bank zählen automatisch als
 * "gesehen" (keine Hover-Zelle dort, s. `syncPassiveOwnershipSeen`), (2) Erstzugriff auf einen
 * Save-Slot befüllt die Quittungs-Liste mit dem AKTUELLEN Vollbestand statt leer zu starten (s.
 * `ensureCache`). Das reguläre Inventar-Grid bleibt bewusst NICHT Teil der Auto-Quittierung —
 * dort soll der Badge weiter bis zum Hover/Klick sichtbar bleiben (das ist der eigentliche Zweck
 * des Features).
 *
 * Instanzen (Suffix-/Unique-Varianten, #246): Quittierung läuft über die BASIS-Item-ID, exakt wie
 * `discoveredItems` selbst (engine-seitig gibt es keine Erst-Besitz-Granularität je Instanz/Roll).
 * Konsequenz — bewusste, dokumentierte Entscheidung: eine NEUE Instanz (z.B. anderer Suffix-Roll)
 * eines bereits bekannten Basis-Items markiert NICHT erneut als "neu"; nur der allererste Besitz
 * der Basis-Item-Art überhaupt tut das. Das spiegelt 1:1, was `isItemDiscovered` (engine) schon
 * für die Basis-ID festhält — es gibt kein separates "pro Instanz entdeckt"-Signal, das man
 * konsistent anzapfen könnte, ohne die Engine anzufassen.
 */

const KEY_PREFIX = "gr.newItemSeen.";

// In-Memory-Cache: das Set wird nur EINMAL pro Save-Slot aus localStorage geparst (nicht bei
// jedem Tick-Re-Render neu, s. Aufrufer CharacterPage — die Seite re-rendert jeden Game-Tick).
let cachedScopeKey: string | null = null;
let cachedSet: Set<string> = new Set();

function scopeKey(state: GameState): string {
  return `${KEY_PREFIX}${state.character.createdAt}`;
}

function persist(state: GameState, set: Set<string>): void {
  try {
    localStorage.setItem(scopeKey(state), JSON.stringify([...set]));
  } catch {
    // Storage voll/deaktiviert: Badge bleibt ggf. hartnäckiger sichtbar, kein Crash.
  }
}

/**
 * Alle Basis-Item-IDs, die JETZT irgendwo im Besitz sind — Inventar-Slots, Instanz-Tasche, Bank
 * (qty > 0), Gear-Vault (bankInstances) und angelegte Ausrüstung. Spiegelt bewusst dieselben
 * Quellen wie `discoverPossessedItems` (engine/inventory.ts), bleibt hier aber rein lesend (kein
 * State-Write) — dient NUR der einmaligen Erstbefüllung der UI-Quittungsliste.
 */
function fullPossessionSnapshot(state: GameState): Set<string> {
  const ids = new Set<string>();
  for (const slot of state.inventory.slots) if (slot) ids.add(slot.itemId);
  for (const inst of state.inventory.instances) if (inst?.baseItemId) ids.add(inst.baseItemId);
  for (const [id, qty] of Object.entries(state.bank)) if (qty > 0) ids.add(id);
  for (const inst of state.bankInstances) if (inst?.baseItemId) ids.add(inst.baseItemId);
  for (const id of Object.values(state.character.equipment)) if (id) ids.add(id);
  return ids;
}

function ensureCache(state: GameState): Set<string> {
  const key = scopeKey(state);
  if (key === cachedScopeKey) return cachedSet;
  cachedScopeKey = key;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    raw = null;
  }
  if (raw === null) {
    // Erstzugriff für DIESEN Save-Slot (frischer Charakter ODER Bestands-Spielstand, der dieses
    // Feature zum ersten Mal sieht) — mit dem AKTUELLEN Vollbestand befüllen statt leer zu
    // starten, sonst würde jedes längst besessene Item einmalig als „neu" aufblitzen (Chef-
    // Bugreport 23.07., Punkt b). Für einen brandneuen Charakter heißt das: die Start-Ausrüstung
    // gilt ebenfalls sofort als „gesehen" — sie ist keine Beute/Kauf/Craft/Post-Neuerwerbung, soll
    // also gar nicht erst leuchten.
    cachedSet = fullPossessionSnapshot(state);
    persist(state, cachedSet);
    return cachedSet;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    cachedSet = Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === "string")) : new Set();
  } catch {
    cachedSet = new Set();
  }
  return cachedSet;
}

/** Wurde das „NEU"-Badge für dieses Basis-Item in DIESEM Spielstand schon quittiert (Hover/Klick,
 *  oder implizit weil es aktuell ausgerüstet/in der Bank liegt — s. Modul-Kommentar)? */
export function hasSeenNewItemBadge(state: GameState, itemId: string): boolean {
  const set = ensureCache(state);
  if (set.has(itemId)) return true;
  // Ausrüstung und Bank haben keine eigene Badge-Zelle (Paperdoll/BankPage reichen `newBadge` nie
  // durch) — also auch nie eine Hover-Quittierung. Besitz DORT zählt automatisch als „gesehen",
  // sonst flackert das Item beim Unequip bzw. bei der Bank-Entnahme fälschlich als NEU auf.
  if (isEquippedOrBanked(state, itemId)) {
    set.add(itemId);
    persist(state, set);
    return true;
  }
  return false;
}

function isEquippedOrBanked(state: GameState, itemId: string): boolean {
  if ((state.bank[itemId] ?? 0) > 0) return true;
  if (state.bankInstances.some((inst) => inst?.baseItemId === itemId)) return true;
  for (const id of Object.values(state.character.equipment)) if (id === itemId) return true;
  return false;
}

/** Quittiert das „NEU"-Badge (Hover/Klick auf die Zelle) — persistiert sofort. */
export function markNewItemBadgeSeen(state: GameState, itemId: string): void {
  const set = ensureCache(state);
  if (set.has(itemId)) return;
  set.add(itemId);
  persist(state, set);
}

// ─── Einmaliges Funkeln beim ersten Erscheinen (In-Memory, wie Toasts.tsx' `hasFiredFenceToast`:
// ein reiner Session-Flag, kein localStorage nötig — nach einem Reload darf der Sparkle für ein
// noch unquittiertes Item ruhig erneut kurz aufblitzen, das ist kein Fehlverhalten). ───────────
const sparkledThisSession = new Set<string>();

/** true GENAU BEIM ERSTEN Aufruf für diese Item-ID in dieser Session (danach immer false) —
 *  steuert das einmalige kurze Funkeln, bevor die Zelle in den statischen Punkt übergeht. */
export function consumeSparkleOnce(itemId: string): boolean {
  if (sparkledThisSession.has(itemId)) return false;
  sparkledThisSession.add(itemId);
  return true;
}
