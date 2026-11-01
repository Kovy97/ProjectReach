// claude:2026-10-31T16:08:21+01:00 — Warteschlangen-Vorlagen (1.4.2, SAVE 103; Sweep-Idee mit Chef-GO 31.10.2026). Einzige Schreib-Stelle von
// `GameState.queueTemplates`: drei Plätze, in die der Spieler seine aktuelle Planung (laufende Aktivität + Warteschlange) ablegt und später
// wieder HINTEN an die Warteschlange hängt. Laden läuft ausschließlich über die vorhandenen enqueue-Verben (gleiche Prüfungen, gleiche
// Stapel-Regel, Wiederaufnahme-Signal). Deterministisch: kein RNG, keine Zeitquelle, kein I/O.
import type { ContentDB, GameState, QueuedAction, QueueTemplate } from "@hearthforge/shared";
import {
  QUEUE_TEMPLATE_MAX_ENTRIES,
  QUEUE_TEMPLATE_NAME_MAX,
  QUEUE_TEMPLATE_SLOTS,
  emptyQueueTemplates,
  isDungeonQueueEntry,
  isFightQueueEntry,
  isRaidQueueEntry,
  makeDungeonQueueEntry,
  makeFightQueueEntry,
  makeRaidQueueEntry,
} from "@hearthforge/shared";
import { enqueueAction, enqueueDungeonRuns, enqueueFight, enqueueRaid } from "./actions";

/** Spiegel von actions.ts `QUEUE_TARGET_CAP` bzw. persistence `QTY_HARD_CAP` (1e9). */
const TEMPLATE_TARGET_CAP = 1_000_000_000;

/** Ziel wie in der Warteschlange: endliche positive Ganzzahl (gekappt) oder null (= ∞ bzw. „bis Stopp“). */
function normalizeTemplateTarget(t: unknown): number | null {
  return typeof t === "number" && Number.isFinite(t) && t > 0 ? Math.min(Math.floor(t), TEMPLATE_TARGET_CAP) : null;
}

/** Gültiger Platz-Index 0 … QUEUE_TEMPLATE_SLOTS − 1. */
function isTemplateSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < QUEUE_TEMPLATE_SLOTS;
}

/** Defensiv: genau QUEUE_TEMPLATE_SLOTS Plätze (fehlt/kaputt ⇒ leer, zu kurz ⇒ aufgefüllt). */
function templateSlots(state: GameState): (QueueTemplate | null)[] {
  if (!Array.isArray(state.queueTemplates)) state.queueTemplates = emptyQueueTemplates();
  const list = state.queueTemplates;
  while (list.length < QUEUE_TEMPLATE_SLOTS) list.push(null);
  if (list.length > QUEUE_TEMPLATE_SLOTS) list.length = QUEUE_TEMPLATE_SLOTS;
  return list;
}

/**
 * Name einer Vorlage: nur Strings, Steuerzeichen raus, getrimmt, höchstens QUEUE_TEMPLATE_NAME_MAX Zeichen (Unicode-Codepoints, damit kein
 * Emoji/Schriftzeichen halbiert wird). Leer ist erlaubt (die UI zeigt dann „Vorlage n“).
 */
export function normalizeQueueTemplateName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // eslint-disable-next-line no-control-regex
  const clean = raw.replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim();
  return Array.from(clean).slice(0, QUEUE_TEMPLATE_NAME_MAX).join("").trim();
}

/**
 * Härtet EINEN Eintrag (Muster persistence-Sanitize von `actionQueue`): Kampf nur gegen bekannte, nicht-dungeonOnly-Monster; Dungeon nur
 * bekannt und mit Wellen; Raid nur bekannt mit gültiger Stufe; sonst Aktion mit bekannter `actionId`. Ziel normalisiert. Ungültig ⇒ null.
 */
export function cleanQueueTemplateEntry(raw: unknown, content: ContentDB): QueuedAction | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const target = normalizeTemplateTarget(r.target);
  if (r.kind === "fight") {
    const monsterId = r.monsterId;
    if (typeof monsterId !== "string") return null;
    const monster = content.monsters[monsterId];
    if (!monster || monster.dungeonOnly) return null;
    return makeFightQueueEntry(monsterId, target);
  }
  if (r.kind === "dungeon") {
    const dungeonId = r.dungeonId;
    if (typeof dungeonId !== "string") return null;
    const dungeon = content.dungeons.find((d) => d.id === dungeonId);
    if (!dungeon || dungeon.encounters.length === 0) return null;
    return makeDungeonQueueEntry(dungeonId, target);
  }
  if (r.kind === "raid") {
    const raidId = r.raidId;
    const diff = r.raidDifficulty;
    if (typeof raidId !== "string" || !(content.raids ?? []).some((x) => x.id === raidId)) return null;
    if (diff !== "normal" && diff !== "heroic" && diff !== "mythic") return null;
    return makeRaidQueueEntry(raidId, diff, target);
  }
  if (r.kind !== undefined && r.kind !== "action") return null;
  const actionId = r.actionId;
  if (typeof actionId !== "string" || !content.actions[actionId]) return null;
  return { kind: "action", actionId, target };
}

/**
 * Lade-Härtung von `queueTemplates` (persistence `sanitizeState`, jede Version): genau QUEUE_TEMPLATE_SLOTS Plätze; ein Platz ist null oder
 * eine Vorlage mit normalisiertem Namen und gehärteten Einträgen (höchstens QUEUE_TEMPLATE_MAX_ENTRIES). Eine Vorlage, deren Einträge der
 * Content nicht mehr kennt, bleibt mit ihrem Namen stehen (nichts Spielerseitiges geht still verloren). Fehlt/kaputt ⇒ alle leer. Idempotent.
 */
export function cleanQueueTemplates(raw: unknown, content: ContentDB): (QueueTemplate | null)[] {
  const out = emptyQueueTemplates();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < QUEUE_TEMPLATE_SLOTS; i++) {
    const t = raw[i] as unknown;
    if (!t || typeof t !== "object") continue;
    const entriesRaw = (t as { entries?: unknown }).entries;
    const entries: QueuedAction[] = [];
    if (Array.isArray(entriesRaw)) {
      for (const e of entriesRaw) {
        if (entries.length >= QUEUE_TEMPLATE_MAX_ENTRIES) break;
        const clean = cleanQueueTemplateEntry(e, content);
        if (clean) entries.push(clean);
      }
    }
    out[i] = { name: normalizeQueueTemplateName((t as { name?: unknown }).name), entries };
  }
  return out;
}

/**
 * Die laufende Aktivität als Warteschlangen-Eintrag mit RESTZIEL, sofern sie einer sein kann (sonst null):
 *  - Raid-Lauf: aus der Raid-Warteschlange mit restlichen Läufen (inkl. des laufenden), sonst ein Lauf;
 *  - Queue-Dungeon-Lauf: restliche Läufe (inkl. des laufenden); ein manuell betretener Dungeon: ein Lauf;
 *  - Queue-Kampf: restliche Kills; ein manueller normaler Kampf: ∞ (wie er lief, Muster Slayer-Neuversuch);
 *  - Turm-Etage und Elite-Kampf: keine Warteschlangen-Einträge ⇒ null;
 *  - Aktion: Restmenge (`actionTarget`, null = endlos).
 * Ein bereits erfülltes Restziel (≤ 0, defensiv) ergibt null. Rein lesend.
 */
export function currentActivityQueueEntry(state: GameState): QueuedAction | null {
  const rs = state.raid;
  if (rs?.run) {
    const q = rs.queue;
    if (q && q.raidId === rs.run.raidId && q.difficulty === rs.run.difficulty) {
      if (q.remaining !== null && q.remaining <= 0) return null;
      return makeRaidQueueEntry(q.raidId, q.difficulty, q.remaining);
    }
    return makeRaidQueueEntry(rs.run.raidId, rs.run.difficulty, 1);
  }
  const run = state.queueDungeon;
  if (run) {
    if (run.remaining !== null && run.remaining <= 0) return null;
    return makeDungeonQueueEntry(run.dungeonId, run.remaining);
  }
  const cs = state.combat;
  if (cs.monsterId !== null) {
    if (cs.paragonFloor || cs.eliteVariantId) return null;
    if (cs.dungeonId !== null) return makeDungeonQueueEntry(cs.dungeonId, 1);
  }
  const fight = state.queueFight;
  if (fight) {
    if (fight.remaining !== null && fight.remaining <= 0) return null;
    return makeFightQueueEntry(fight.monsterId, fight.remaining);
  }
  if (cs.monsterId !== null) return makeFightQueueEntry(cs.monsterId, null);
  if (state.activeActionId !== null) {
    if (state.actionTarget !== null && state.actionTarget <= 0) return null;
    return { kind: "action", actionId: state.activeActionId, target: normalizeTemplateTarget(state.actionTarget) };
  }
  return null;
}

/** Flache Kopie eines Eintrags über die Konstruktoren (keine geteilten Objekte zwischen Vorlage und Warteschlange). */
function copyEntry(e: QueuedAction): QueuedAction | null {
  const target = normalizeTemplateTarget(e.target);
  if (isFightQueueEntry(e)) return makeFightQueueEntry(e.monsterId, target);
  if (isDungeonQueueEntry(e)) return makeDungeonQueueEntry(e.dungeonId, target);
  if (isRaidQueueEntry(e)) return makeRaidQueueEntry(e.raidId, e.raidDifficulty, target);
  if (e.kind === "action" && typeof e.actionId === "string" && e.actionId !== "") return { kind: "action", actionId: e.actionId, target };
  return null;
}

/**
 * Speichert die aktuelle Planung in Platz `slot` (0 … 2) unter `name`: die laufende Aktivität mit Restziel als erster Eintrag (sofern sie
 * ein Warteschlangen-Eintrag sein kann, s. `currentActivityQueueEntry`), danach die Warteschlange in Reihenfolge; höchstens
 * QUEUE_TEMPLATE_MAX_ENTRIES Einträge (der Rest wird abgeschnitten). Überschreibt einen belegten Platz. `false` (nichts geändert) bei
 * ungültigem Platz oder wenn nichts zu speichern ist (keine Aktivität, leere Warteschlange). Die Warteschlange selbst bleibt unberührt.
 */
export function saveQueueTemplate(state: GameState, slot: number, name: string): boolean {
  if (!isTemplateSlot(slot)) return false;
  const entries: QueuedAction[] = [];
  const current = currentActivityQueueEntry(state);
  if (current) entries.push(current);
  for (const e of Array.isArray(state.actionQueue) ? state.actionQueue : []) {
    if (entries.length >= QUEUE_TEMPLATE_MAX_ENTRIES) break;
    const copy = copyEntry(e);
    if (copy) entries.push(copy);
  }
  if (entries.length === 0) return false;
  templateSlots(state)[slot] = { name: normalizeQueueTemplateName(name), entries: entries.slice(0, QUEUE_TEMPLATE_MAX_ENTRIES) };
  return true;
}

/** Ergebnis von `loadQueueTemplate`: angehängte bzw. übersprungene (unbekannte/ungültige) Einträge. */
export interface QueueTemplateLoadResult {
  added: number;
  skipped: number;
}

/**
 * Hängt die Einträge der Vorlage in Platz `slot` HINTEN an die Warteschlange, in Reihenfolge, ausschließlich über die vorhandenen
 * enqueue-Verben (`enqueueAction`/`enqueueFight`/`enqueueDungeonRuns`/`enqueueRaid`) — also mit deren Prüfungen, der Stapel-Regel
 * (gleicher letzter Eintrag mit endlichen Zielen ⇒ addieren) und dem Wiederaufnahme-Signal. Lehnt ein Verb ab (Aktion/Monster/Dungeon/Raid
 * unbekannt geworden, Dungeon-only-Monster), zählt der Eintrag als übersprungen. Leerer/ungültiger Platz ⇒ { added: 0, skipped: 0 }.
 * Die Vorlage selbst bleibt unverändert (mehrfach ladbar). Läuft gerade nichts, startet der nächste Tick den ersten Eintrag regulär.
 */
export function loadQueueTemplate(state: GameState, content: ContentDB, slot: number): QueueTemplateLoadResult {
  const result: QueueTemplateLoadResult = { added: 0, skipped: 0 };
  if (!isTemplateSlot(slot)) return result;
  const tpl = templateSlots(state)[slot];
  if (!tpl || !Array.isArray(tpl.entries)) return result;
  for (const e of tpl.entries.slice(0, QUEUE_TEMPLATE_MAX_ENTRIES)) {
    let ok = false;
    if (e && typeof e === "object") {
      const target = normalizeTemplateTarget(e.target);
      if (isFightQueueEntry(e)) ok = enqueueFight(state, content, e.monsterId, target);
      else if (isDungeonQueueEntry(e)) ok = enqueueDungeonRuns(state, content, e.dungeonId, target);
      else if (isRaidQueueEntry(e)) {
        const d = e.raidDifficulty;
        ok = (d === "normal" || d === "heroic" || d === "mythic") && enqueueRaid(state, content, e.raidId, d, target);
      } else if (e.kind === "action" && typeof e.actionId === "string") ok = enqueueAction(state, content, e.actionId, target);
    }
    if (ok) result.added++;
    else result.skipped++;
  }
  return result;
}

/** Leert Platz `slot`. `true`, wenn dort eine Vorlage lag. */
export function clearQueueTemplate(state: GameState, slot: number): boolean {
  if (!isTemplateSlot(slot)) return false;
  const list = templateSlots(state);
  if (!list[slot]) return false;
  list[slot] = null;
  return true;
}

/** Benennt die Vorlage in Platz `slot` um (Name normalisiert wie beim Speichern). `false` bei leerem/ungültigem Platz. */
export function renameQueueTemplate(state: GameState, slot: number, name: string): boolean {
  if (!isTemplateSlot(slot)) return false;
  const tpl = templateSlots(state)[slot];
  if (!tpl) return false;
  tpl.name = normalizeQueueTemplateName(name);
  return true;
}

/** Die Vorlage in Platz `slot` (oder null), defensiv lesend für die UI. */
export function queueTemplateAt(state: GameState, slot: number): QueueTemplate | null {
  if (!isTemplateSlot(slot) || !Array.isArray(state.queueTemplates)) return null;
  return state.queueTemplates[slot] ?? null;
}
