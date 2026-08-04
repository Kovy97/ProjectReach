// Client-seitige UI-Display-Präferenzen (localStorage) — KEINE Save-State-Felder, daher kein
// SAVE_VERSION-Bump/Migration nötig (analog audio.ts / uiScale.ts / music.ts). Reine Anzeige-
// Vorlieben, die pro Gerät gelten und den Spielstand nicht berühren.

import type { FilterCategory, ItemSortMode } from "../items";

const TOOLTIP_POPUP_KEY = "gr.tooltipImagePopup";

// Default AN (Chef-Vorgabe): fehlender Key ⇒ true; nur explizites "0" schaltet den Effekt aus.
let tooltipImagePopup = localStorage.getItem(TOOLTIP_POPUP_KEY) !== "0";

/** Ob der Fake-3D-Bild-Popup-Effekt auf Item-Tooltips aktiv ist (Optionsmenü-Toggle, Default an). */
export function isTooltipImagePopupEnabled(): boolean {
  return tooltipImagePopup;
}

/** Schaltet den Tooltip-Bild-Popup-Effekt ein/aus (persistiert in localStorage). */
export function setTooltipImagePopupEnabled(value: boolean): void {
  tooltipImagePopup = value;
  localStorage.setItem(TOOLTIP_POPUP_KEY, value ? "1" : "0");
}

// ─── Sidebar-Breite (Task #291, Chef-Feature: stufenlos per Rand-Handle ziehbar) ───
// Reine Anzeige-Vorliebe wie oben — kein Save-State-Feld, kein SAVE_VERSION-Bump.
const SIDEBAR_WIDTH_KEY = "gr.sidebarWidth";
export const SIDEBAR_WIDTH_DEFAULT = 240;
export const SIDEBAR_WIDTH_MIN = 64;
export const SIDEBAR_WIDTH_MAX = 420;

function clampSidebarWidth(px: number): number {
  return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, px));
}

/** Liest die persistierte Sidebar-Breite. Fehlender/ungültiger Wert ⇒ Default (240px);
 *  wird zusätzlich in den erlaubten Range geklemmt (Range-Änderungen zwischen Versionen). */
export function getSidebarWidth(): number {
  const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return SIDEBAR_WIDTH_DEFAULT;
  return clampSidebarWidth(parsed);
}

/** Persistiert die per Drag gewählte Sidebar-Breite (localStorage). Wird bewusst erst bei
 *  mouseup aufgerufen, nicht pro mousemove — s. Sidebar.tsx handleResizeStart. */
export function setSidebarWidth(px: number): void {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, String(clampSidebarWidth(px)));
}

// ─── TopBar-Höhe (Chef-Feature 2026-07-23: analog zur Sidebar-Breite — stufenlos per
// Rand-Handle an der Unterkante ziehbar). Reine Anzeige-Vorliebe wie oben — kein Save-State-Feld,
// kein SAVE_VERSION-Bump. "TopBar" meint hier den kompletten oberen Streifen (Seiten-Nav +
// Titel-/Statuszeile mit Aktions-/XP-Leiste zusammen, App.tsx `.topbar-area`-Wrapper) — beide
// skalieren gemeinsam über eine einzige `--tb-scale`-Variable (topbar.css).
const TOPBAR_HEIGHT_KEY = "gr.topbarHeight";
// "Heutige" (Vor-Feature) Gesamthöhe bei ≥1280px Fensterbreite: Topbar-Nav (64px, unclamped
// Desktop-Wert von `height: clamp(50px, 5vw, 64px)`) + Content-Header (78px, dessen eigenes
// `min-height`) = 142px. Dient NUR als Referenz für `--tb-scale` (= Höhe ÷ Referenz, s.
// topbar.css) — nicht als persistierter Default (der ist bewusst schon moderat größer, s.u.).
export const TOPBAR_HEIGHT_REFERENCE = 142;
// Chef-Auftrag 2026-07-23: Ursprungswunsch „50% größer" durch die Zieh-Lösung ersetzt — Default
// nur noch moderat größer (~+18%), der Chef zieht sich den Rest selbst zurecht.
export const TOPBAR_HEIGHT_DEFAULT = Math.round(TOPBAR_HEIGHT_REFERENCE * 1.18); // 168px
export const TOPBAR_HEIGHT_MIN = Math.round(TOPBAR_HEIGHT_REFERENCE * 0.8); // 114px (0,8×)
export const TOPBAR_HEIGHT_MAX = Math.round(TOPBAR_HEIGHT_REFERENCE * 1.8); // 256px (1,8×)

function clampTopBarHeight(px: number): number {
  return Math.min(TOPBAR_HEIGHT_MAX, Math.max(TOPBAR_HEIGHT_MIN, px));
}

/** Liest die persistierte TopBar-Höhe. Fehlender/ungültiger Wert ⇒ Default (168px); wird
 *  zusätzlich in den erlaubten Range geklemmt (Range-Änderungen zwischen Versionen). */
export function getTopBarHeight(): number {
  const raw = localStorage.getItem(TOPBAR_HEIGHT_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return TOPBAR_HEIGHT_DEFAULT;
  return clampTopBarHeight(parsed);
}

/** Persistiert die per Drag gewählte TopBar-Höhe (localStorage). Wird bewusst erst bei mouseup
 *  aufgerufen, nicht pro mousemove — s. App.tsx handleTopBarResizeStart (analog Sidebar.tsx). */
export function setTopBarHeight(px: number): void {
  localStorage.setItem(TOPBAR_HEIGHT_KEY, String(clampTopBarHeight(px)));
}

// ─── Kampf-Effekte-Stufe (Task #296, Chef-Greenlight P0 „Launch-Juice") ───
// Steuert die NEUEN (Treffer-Flash/Recoil, Crit-Aufwertung, Kill-Flourish, Pet-Ability-Puls,
// Status-Rand-Puls) UND die BESTEHENDEN (Angriffs-Lunge/Cast-Animation, Ward-Aufladepuls) Kampf-
// Animationen in CombatPage.tsx. Reine Anzeige-Vorliebe wie oben, kein Save-State-Feld.
// - "full":    alles an.
// - "reduced": nur Flash-/Farbeffekte (Opacity/Box-Shadow/Filter) bleiben — KEINE Bewegung
//              (Lunge/Cast/Recoil/Pet-Sprung/Kill-Sacken sind aus).
// - "off":     komplett aus. Schadenszahlen/HP-Balken/Log sind Kernfeedback, kein „Effekt", und
//              bleiben in JEDER Stufe unverändert sichtbar.
// `prefers-reduced-motion` (OS-Einstellung) übersteuert IMMER zusätzlich auf "off", unabhängig
// vom hier gespeicherten Wert — s. `fxLevel`-Berechnung in CombatPage.tsx (Battle).
export type CombatFxLevel = "full" | "reduced" | "off";

const COMBAT_FX_KEY = "gr.combatFxLevel";

function readCombatFxLevel(): CombatFxLevel {
  const raw = localStorage.getItem(COMBAT_FX_KEY);
  return raw === "full" || raw === "reduced" || raw === "off" ? raw : "full";
}

let combatFxLevel: CombatFxLevel = readCombatFxLevel();

/** Aktuelle Kampf-Effekte-Stufe (Optionsmenü, Default "full"). */
export function getCombatFxLevel(): CombatFxLevel {
  return combatFxLevel;
}

/** Setzt die Kampf-Effekte-Stufe (3-Wege-Segment im Optionsmenü), persistiert in localStorage. */
export function setCombatFxLevel(level: CombatFxLevel): void {
  combatFxLevel = level;
  localStorage.setItem(COMBAT_FX_KEY, level);
}

// ─── Bank-/Inventar-Filter & -Sortierung (Suche/Filter/Sortierung, Chef-Auftrag 2026-07-09) ───
// Reine Anzeige-Vorlieben wie oben — kein Save-State-Feld, kein SAVE_VERSION-Bump. Nur die
// zuletzt gewählte Filter-Kategorie + Sortierung werden gemerkt; der Suchtext selbst bleibt
// bewusst transient (kein localStorage-Write pro Tastenanschlag, verschwindet beim Neuladen).
const BANK_SORT_KEY = "gr.bankSort";
const BANK_FILTER_CAT_KEY = "gr.bankFilterCat";
const INV_FILTER_CAT_KEY = "gr.invFilterCat";

const VALID_SORT_MODES: ItemSortMode[] = ["newest", "name", "value", "rarity", "qty"];
const VALID_FILTER_CATS: FilterCategory[] = ["all", "weapons", "armor", "tools", "food", "potions", "materials"];

function readSortPref(key: string): ItemSortMode {
  const raw = localStorage.getItem(key);
  return (VALID_SORT_MODES as string[]).includes(raw ?? "") ? (raw as ItemSortMode) : "newest";
}

function readFilterCatPref(key: string): FilterCategory {
  const raw = localStorage.getItem(key);
  return (VALID_FILTER_CATS as string[]).includes(raw ?? "") ? (raw as FilterCategory) : "all";
}

/** Zuletzt gewählter Bank-Sortiermodus (Dropdown "Sortieren:", Default "newest"). */
export function getBankSort(): ItemSortMode {
  return readSortPref(BANK_SORT_KEY);
}

/** Persistiert den gewählten Bank-Sortiermodus. */
export function setBankSort(mode: ItemSortMode): void {
  localStorage.setItem(BANK_SORT_KEY, mode);
}

/** Zuletzt gewählter Bank-Typ-Filter-Chip (Default "all"). */
export function getBankFilterCat(): FilterCategory {
  return readFilterCatPref(BANK_FILTER_CAT_KEY);
}

/** Persistiert den gewählten Bank-Typ-Filter-Chip. */
export function setBankFilterCat(cat: FilterCategory): void {
  localStorage.setItem(BANK_FILTER_CAT_KEY, cat);
}

/** Zuletzt gewählter Charakter-Inventar-Typ-Filter-Chip (Default "all"). Die Inventar-Sortierung
 *  bleibt beim bestehenden lokalen Component-State (vorbestehendes Feature, unverändert). */
export function getInvFilterCat(): FilterCategory {
  return readFilterCatPref(INV_FILTER_CAT_KEY);
}

/** Persistiert den gewählten Charakter-Inventar-Typ-Filter-Chip. */
export function setInvFilterCat(cat: FilterCategory): void {
  localStorage.setItem(INV_FILTER_CAT_KEY, cat);
}

// ─── Action-Queue-Panel (ersetzt den früheren Rezept-Pin-Tracker) ───
// Reine Anzeige-Vorliebe wie oben — kein Save-State-Feld, kein SAVE_VERSION-Bump. Der Panel-
// Inhalt selbst (state.actionQueue) IST Save-State und lebt in der Engine; nur ob das Panel
// gerade ein- oder ausgeklappt ist, ist Geschmackssache und wird lokal gemerkt.
const QUEUE_PANEL_COLLAPSED_KEY = "gr.queuePanelCollapsed";

/** Ob das Warteschlangen-Panel eingeklappt ist (Default: EINGEKLAPPT — Chef 2026-07-21; fehlender
 *  Key ⇒ true, nur explizites "0" hält es aufgeklappt). Passt zur „Was ist neu"-Tour, die auf den
 *  Aufklappen-Knopf zeigt. */
export function getQueuePanelCollapsed(): boolean {
  return localStorage.getItem(QUEUE_PANEL_COLLAPSED_KEY) !== "0";
}

/** Persistiert den Ein-/Ausklapp-Zustand des Warteschlangen-Panels. */
export function setQueuePanelCollapsed(value: boolean): void {
  localStorage.setItem(QUEUE_PANEL_COLLAPSED_KEY, value ? "1" : "0");
}

// ─── Elite-/Kopfgeld-Mini-Fenster (Spieler-Feedback 0.2.2 Punkt 3) ───
// Reine Anzeige-Vorliebe wie oben — kein Save-State-Feld, kein SAVE_VERSION-Bump. Ersetzt das
// frühere Inline-Kopfgeld-Brett auf der Slayer-Seite (BountyBoard.tsx) durch ein schwebendes,
// verschiebbares + einklappbares Panel (components/EliteMiniWindow.tsx), das app-weit (nicht nur
// auf der Slayer-Seite) den aktuell aktivsten Elite/Champion zeigt. Muster identisch zu
// getSidebarWidth/getTopBarHeight oben ("gr.*"-Key, geklemmter Fallback-Default).
const ELITE_MINI_POS_KEY = "gr.eliteMiniPos";
const ELITE_MINI_COLLAPSED_KEY = "gr.eliteMiniCollapsed";

export interface EliteMiniPos {
  x: number;
  y: number;
}

/** Persistierte Fensterposition, oder `null` wenn noch nie verschoben (Aufrufer errechnet dann
 *  seinen eigenen Default aus der aktuellen Fenstergröße). Korrupte/fremde Werte → `null`. */
export function getEliteMiniPos(): EliteMiniPos | null {
  const raw = localStorage.getItem(ELITE_MINI_POS_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<EliteMiniPos>;
    if (typeof parsed.x === "number" && typeof parsed.y === "number" && Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* korrupter Wert → Default beim Aufrufer */
  }
  return null;
}

/** Persistiert die per Drag gewählte Fensterposition (erst bei pointerup, nicht pro pointermove —
 *  Muster Sidebar-/TopBar-Rand-Handle). */
export function setEliteMiniPos(pos: EliteMiniPos): void {
  localStorage.setItem(ELITE_MINI_POS_KEY, JSON.stringify(pos));
}

/** Ob das Elite-Mini-Fenster eingeklappt ist (Default: AUSGEKLAPPT, anders als das Queue-Panel —
 *  das Fenster erscheint ohnehin nur, wenn GERADE ein Champion aktiv ist, s. EliteMiniWindow.tsx). */
export function getEliteMiniCollapsed(): boolean {
  return localStorage.getItem(ELITE_MINI_COLLAPSED_KEY) === "1";
}

/** Persistiert den Ein-/Ausklapp-Zustand des Elite-Mini-Fensters. */
export function setEliteMiniCollapsed(value: boolean): void {
  localStorage.setItem(ELITE_MINI_COLLAPSED_KEY, value ? "1" : "0");
}

// ─── Kampf-Loadout-/Log-Panel-Maße + Log-Anzeigefilter (Task #333, Chef-Feature "Kampf-Screen-
// Ergonomie": beide Panels per Rand-/Eck-Handle ziehbar, Log bekommt ein Zahnrad-Popover mit
// Kategorie-Checkboxen "wie in WoW") ───
// Reine Anzeige-Vorlieben wie oben — kein Save-State-Feld, kein SAVE_VERSION-Bump. Muster identisch
// zu getSidebarWidth/getTopBarHeight oben ("gr.*"-Key, geklemmter Fallback-Default); s.
// CombatPage.tsx Battle für den Drag-Handler (pointermove/pointerup/pointercancel + blur auf
// window, EliteMiniWindow-Lektion — persistiert wird erst am Drag-Ende, nicht pro pointermove).
const COMBAT_LOADOUT_WIDTH_KEY = "gr.combat.loadoutWidth";
/** Matcht den bisherigen CSS-Fixwert (combat.css `.battle-main` grid-template-columns). */
export const COMBAT_LOADOUT_WIDTH_DEFAULT = 250;
export const COMBAT_LOADOUT_WIDTH_MIN = 200;
export const COMBAT_LOADOUT_WIDTH_MAX = 480;

function clampCombatLoadoutWidth(px: number): number {
  return Math.min(COMBAT_LOADOUT_WIDTH_MAX, Math.max(COMBAT_LOADOUT_WIDTH_MIN, px));
}

/** Liest die persistierte Breite des linken Kampf-Loadout-Panels (Skills/Kampfhaltung/Auto-Eat/
 *  Tränke). Fehlender/ungültiger Wert ⇒ Default (250px); wird zusätzlich in den erlaubten Range
 *  geklemmt (Range-Änderungen zwischen Versionen). */
export function getCombatLoadoutWidth(): number {
  const raw = localStorage.getItem(COMBAT_LOADOUT_WIDTH_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return COMBAT_LOADOUT_WIDTH_DEFAULT;
  return clampCombatLoadoutWidth(parsed);
}

/** Persistiert die per Drag gewählte Loadout-Panel-Breite (erst am Drag-Ende). */
export function setCombatLoadoutWidth(px: number): void {
  localStorage.setItem(COMBAT_LOADOUT_WIDTH_KEY, String(clampCombatLoadoutWidth(px)));
}

const COMBAT_LOG_WIDTH_KEY = "gr.combat.logWidth";
/** Matcht den bisherigen CSS-Fixwert (combat.css `.battle-main` grid-template-columns). */
export const COMBAT_LOG_WIDTH_DEFAULT = 300;
export const COMBAT_LOG_WIDTH_MIN = 220;
export const COMBAT_LOG_WIDTH_MAX = 460;

function clampCombatLogWidth(px: number): number {
  return Math.min(COMBAT_LOG_WIDTH_MAX, Math.max(COMBAT_LOG_WIDTH_MIN, px));
}

/** Liest die persistierte Breite des Kampf-Log-Panels. Fehlender/ungültiger Wert ⇒ Default
 *  (300px); wird zusätzlich in den erlaubten Range geklemmt. */
export function getCombatLogWidth(): number {
  const raw = localStorage.getItem(COMBAT_LOG_WIDTH_KEY);
  const parsed = raw !== null ? Number(raw) : NaN;
  if (!Number.isFinite(parsed)) return COMBAT_LOG_WIDTH_DEFAULT;
  return clampCombatLogWidth(parsed);
}

/** Persistiert die per Drag gewählte Log-Panel-Breite (erst am Drag-Ende). */
export function setCombatLogWidth(px: number): void {
  localStorage.setItem(COMBAT_LOG_WIDTH_KEY, String(clampCombatLogWidth(px)));
}

const COMBAT_LOG_HEIGHT_KEY = "gr.combat.logHeight";
export const COMBAT_LOG_HEIGHT_MIN = 120;
// Kein fester Max-Pixelwert (Chef-Vorgabe "60vh") — vh ändert sich mit der Fensterhöhe, darum hier
// nur der Faktor; CombatPage.tsx klemmt zur Drag-/Ladezeit gegen `window.innerHeight * diesen
// Faktor`, `clampCombatLogHeight` unten tut dasselbe für Lade-/Persistierzeit.
// Kalibriert am realen Layout (Chef-Vorgabe "Log z.B. 120px-60vh — an realem Layout kalibrieren"):
// die volle Zeilenhöhe (Default, `height:100%`) misst bei 1920x1080 bereits ~751px (~70vh, s.
// combat.css .battle-main/.page-transition Höhen-Kette) — ein 60vh-Deckel läge damit UNTER dem
// bisherigen Default und würde die erste Zieh-Berührung sofort schrumpfen lassen, statt Raum zum
// Wachsen zu geben. 85vh lässt das Panel spürbar über den Default hinaus wachsen und bleibt
// trotzdem klar unter 100vh (Topbar/Rahmen bleiben immer sichtbar).
export const COMBAT_LOG_HEIGHT_MAX_VH_FACTOR = 0.85;

function clampCombatLogHeight(px: number): number {
  const maxPx = typeof window !== "undefined" ? window.innerHeight * COMBAT_LOG_HEIGHT_MAX_VH_FACTOR : 800;
  return Math.min(maxPx, Math.max(COMBAT_LOG_HEIGHT_MIN, px));
}

/** Liest die persistierte Höhe des Kampf-Log-Panels — `null` heißt "kein Override, volle
 *  Zeilenhöhe wie bisher" (der eigentliche Default ist der CSS-Var-Fallback `height:100%` in
 *  combat.css, KEIN fester Pixelwert, da die Grid-Zeile ohnehin die verfügbare Höhe vorgibt).
 *  Korrupte Werte fallen ebenfalls auf `null` zurück (Muster `getEliteMiniPos` oben). */
export function getCombatLogHeight(): number | null {
  const raw = localStorage.getItem(COMBAT_LOG_HEIGHT_KEY);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampCombatLogHeight(parsed) : null;
}

/** Persistiert die per Drag gewählte Log-Panel-Höhe; `null` löscht den Override (Doppelklick-
 *  Reset auf die volle Zeilenhöhe, s. CombatPage.tsx handleLogResizeReset). */
export function setCombatLogHeight(px: number | null): void {
  if (px === null) {
    localStorage.removeItem(COMBAT_LOG_HEIGHT_KEY);
    return;
  }
  localStorage.setItem(COMBAT_LOG_HEIGHT_KEY, String(clampCombatLogHeight(px)));
}

// ─── Kampf-Log-Anzeigefilter (Task #333, Chef-Feature "wie in WoW": Zahnrad-Popover mit
// Kategorie-Checkboxen) ───
// Reiner ANZEIGE-Filter — die Engine sammelt/loggt jedes CombatEvent unverändert weiter
// (state.combat.log); nur das Rendern in CombatPage.tsx wird gefiltert, rückwirkend auf bereits
// vorhandene Einträge (ein Toggle rendert die komplette Liste einfach neu). Kein Save-State-Feld.
export type CombatLogCategory =
  | "ownDamage"
  | "enemyDamage"
  | "healing"
  | "status"
  | "loot"
  | "xp"
  | "companion"
  | "deathVictory";

/** Anzeige-Reihenfolge der Filter-Checkboxen im Settings-Popover (s. `logEventCategory` in
 *  CombatPage.tsx für die kind→Kategorie-Zuordnung der 16 CombatEvent-Kinds). */
export const COMBAT_LOG_CATEGORIES: readonly CombatLogCategory[] = [
  "ownDamage", "enemyDamage", "healing", "status", "loot", "xp", "companion", "deathVictory",
];

const COMBAT_LOG_FILTERS_KEY = "gr.combat.logFilters";

/** Liest die aktiven Log-Kategorien (Default: ALLE an — fehlender/korrupter Key ⇒ volles Set). */
export function getCombatLogFilters(): ReadonlySet<CombatLogCategory> {
  const raw = localStorage.getItem(COMBAT_LOG_FILTERS_KEY);
  if (!raw) return new Set(COMBAT_LOG_CATEGORIES);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set(COMBAT_LOG_CATEGORIES);
    const valid = parsed.filter((v): v is CombatLogCategory =>
      (COMBAT_LOG_CATEGORIES as readonly string[]).includes(v as string),
    );
    return new Set(valid);
  } catch {
    return new Set(COMBAT_LOG_CATEGORIES);
  }
}

/** Persistiert die aktiven Log-Kategorien (bei jedem Checkbox-Toggle — kein Drag-Perf-Thema). */
export function setCombatLogFilters(categories: ReadonlySet<CombatLogCategory>): void {
  localStorage.setItem(COMBAT_LOG_FILTERS_KEY, JSON.stringify([...categories]));
}

// ─── Kampf-Seitenpanels ein-/ausklappen (Chef-Auftrag 2026-08-03: "Frontline-Dock wirkt in der
// Zonen-Übersicht out of place, mehr Platz für die Zonen" + Erweiterung "Battle Record genauso") ───
// Reine Anzeige-Vorlieben wie oben — kein Save-State-Feld, kein SAVE_VERSION-Bump. EIN globaler
// Zustand je Panel (Chef-Wunsch: Möglichkeit, keine automatische Trennung je Kontext) — gilt
// identisch in der Zonen-Übersicht (.combat-layout) UND im laufenden Kampf (.battle-main), s.
// CombatPage.tsx CombatPage()/Battle() für die beiden Mount-Stellen. Dock (links) und Battle Record
// (rechts) klappen UNABHÄNGIG voneinander — zwei getrennte Keys, gleiches Muster.
const COMBAT_DOCK_COLLAPSED_KEY = "gr.combat.dockCollapsed";
const COMBAT_RECORD_COLLAPSED_KEY = "gr.combat.recordCollapsed";

/** Ob das linke Ausrüstungs-Dock (Gear/Skills/Style/Prep) eingeklappt ist (Default: AUSGEKLAPPT). */
export function getCombatDockCollapsed(): boolean {
  return localStorage.getItem(COMBAT_DOCK_COLLAPSED_KEY) === "1";
}

/** Persistiert den Ein-/Ausklapp-Zustand des Ausrüstungs-Docks. */
export function setCombatDockCollapsed(value: boolean): void {
  localStorage.setItem(COMBAT_DOCK_COLLAPSED_KEY, value ? "1" : "0");
}

/** Ob der rechte Battle Record (Kampf-/Beute-Log + Sitzungsbilanz) eingeklappt ist — existiert nur
 *  in der aktiven Kampf-Ansicht (.battle-log-panel), Default: AUSGEKLAPPT. */
export function getCombatRecordCollapsed(): boolean {
  return localStorage.getItem(COMBAT_RECORD_COLLAPSED_KEY) === "1";
}

/** Persistiert den Ein-/Ausklapp-Zustand des Battle Record. */
export function setCombatRecordCollapsed(value: boolean): void {
  localStorage.setItem(COMBAT_RECORD_COLLAPSED_KEY, value ? "1" : "0");
}
