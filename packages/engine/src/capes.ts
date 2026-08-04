import type { ContentDB, GameState, MasterPerkKind, SkillId } from "@hearthforge/shared";
import {
  COMPLETION_CAPE_KEY,
  EQUIP_SLOTS,
  MASTER_CAPE_LEVEL,
  MASTER_PERK_CAP,
  masterRingItemId,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { addItemOrBank, markItemDiscovered } from "./inventory";

/**
 * Meisterweihe & Meisterringe (Level-99-Belohnung) — reine, deterministische Engine-Logik.
 * BINDENDE GRUNDLAGE: design/master-capes-konzept.md (Chef-GO 2026-07-09) + Chef-Entscheid
 * 2026-07-17 (SAVE_VERSION 69): die Belohnung ist seither ein legendärer RING je Skill
 * (`ring_master_<skillId>`, Slot ring1) statt eines Umhangs — Modul-/Feld-/API-Namen mit
 * „Cape" bleiben aus Save-/UI-Kompat-Gründen stehen (reine Marker-Semantik, kein Item-Bezug).
 * Logic-Dev-Revier.
 *
 * ZWEI TEILE:
 *  1. PERK-AGGREGATION (`master*`-Helfer): liest `ItemDef.masterPerk` aller AUSGERÜSTETEN Items
 *     (generisch alle Slots — praktisch tragen nur die Meisterringe einen Perk) und liefert die
 *     ADDITIVE Summe je Kind. Die Callsites sind exakt die Stellen der Pet-Passiva-Präzedenz
 *     (petDoubleYieldBonus & Co.) — Perk-Werte stapeln dort ADDITIV mit den Pet-Boni:
 *       doubleYield   → tick.ts `bonusChance` (Doppelertrag-Kette)
 *       inputSaver    → tick.ts `preserveChance` (Material-Preservation)
 *       cropSpeed     → farming.ts `effectiveGrowMs` (Beet-Reifezeit)
 *       alwaysSucceed → tick.ts Erfolgs-Mechanik (Chance exakt 1, Soulchef-Hommage)
 *       buffDuration  → consumable.ts `applyConsumableBuff` (Dauer beim Anlegen)
 *       stunReduction → tick.ts Fehlschlag-Betäubung (DEFAULT_STUN_MS-Anwendung)
 *       successBoost  → tick.ts `successBonus` (→ actionSuccessChance, Cap 0.95 bleibt)
 *       slayerPoints  → slayer.ts `recordKillForSlayer` (Punkte-Gutschrift)
 *     Die 7 KAMPF-Ringe brauchen KEINE Hooks hier — ihre Wirkung sind bestehende Bonus-/
 *     Signatur-Felder, die computeStats ohnehin aggregiert (Konzept-Notiz §1).
 *
 *  2. WEIHE-VERLEIHUNG (`checkMasteryCapes`/`grantPendingCapes`) + ZEREMONIE-SIGNAL
 *     (`pendingCapeCeremonies`/`markCapeCeremonySeen`): erreicht ein Skill Level ≥ 99, wird die
 *     Weihe EINMALIG in `state.masteryCapes` vermerkt und das Ring-Item (Konvention
 *     `masterRingItemId(skillId)` = `ring_master_<skillId>`) via addItemOrBank verliehen —
 *     Content-Guard: existiert das Item (noch) nicht, bleibt es beim Marker; die Verleihung wird
 *     NACHGEREICHT (zweiter Marker `capeGranted`), sobald content-dev die Items liefert
 *     (grantPendingCapes läuft je advance UND im sanitize-Pass der Persistenz).
 *
 * DETERMINISMUS: kein RNG in diesem Modul (addItemOrBank zieht keinen). Solange kein Ring-Item
 * im Content existiert, sind alle Pfade reine Marker-No-ops → bestehende Fixtures/Sim-Läufe
 * bleiben bit-identisch (Guard in capes.test.ts).
 */

/** Klemmt einen Perk-Wert defensiv in [0, Kind-Cap] (Schutz vor Fehl-Content; Muster capSkill, pets.ts). */
function capPerk(kind: MasterPerkKind, value: number): number {
  if (!Number.isFinite(value)) return 0;
  const max = MASTER_PERK_CAP[kind] ?? 0;
  return Math.max(0, Math.min(max, value));
}

/**
 * ADDITIVE Summe der `masterPerk`-Werte eines Kinds über alle AUSGERÜSTETEN Items. Skill-Scope
 * wie bei den Pet-Passiva (skillScopedValue, pets.ts): deklariert der Perk einen Skill, zählt er
 * nur bei Übereinstimmung mit dem gefilterten `skill`; ohne deklarierten Skill zählt er immer.
 * `skill === undefined` = globale Lesart (buffDuration/slayerPoints — deklarierte Skills sind
 * dort reine Provenienz-Doku und werden ignoriert). Zieht KEIN RNG; 0 ohne Träger.
 */
function masterPerkValue(
  state: GameState,
  content: ContentDB,
  kind: MasterPerkKind,
  skill?: SkillId,
): number {
  let sum = 0;
  const equipment = state.character.equipment;
  for (const slot of EQUIP_SLOTS) {
    const itemId = equipment[slot];
    if (!itemId) continue;
    const perk = content.items[itemId]?.masterPerk;
    if (!perk || perk.kind !== kind) continue;
    if (skill !== undefined && perk.skill !== undefined && perk.skill !== skill) continue;
    sum += capPerk(kind, perk.value ?? 0);
  }
  return sum;
}

// ── Perk-Lese-API (eine Funktion je Callsite — Spiegel der pets.ts-Helfer) ──────────────────

/**
 * Additiver Doppelertrag-Chancen-Bonus der Meisterumhänge für einen Skill (Sammler-Capes,
 * Konzept: +5 %). tick.ts addiert ihn in `bonusChance` NEBEN petDoubleYieldBonus (additiv).
 */
export function masterDoubleYieldBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return masterPerkValue(state, content, "doubleYield", skill);
}

/**
 * Additiver Material-Preservation-Bonus (Input-Sparer der Handwerks-Capes, Konzept: 5 %).
 * tick.ts addiert ihn in `preserveChance` NEBEN petPreserveBonus (additiv).
 */
export function masterPreserveBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return masterPerkValue(state, content, "inputSaver", skill);
}

/**
 * Additiver Erfolgschancen-Bonus (Shadowgrasp-Cape, Konzept: +3 % Diebstahl-Erfolg). tick.ts
 * addiert ihn in `successBonus` NEBEN petThievingBonus + Risiko-Modus; der 0.95-Cap bleibt
 * (actionSuccessChance klemmt).
 */
export function masterSuccessBonus(state: GameState, content: ContentDB, skill: SkillId): number {
  return masterPerkValue(state, content, "successBoost", skill);
}

/**
 * Betäubungs-Reduktion bei Fehlschlag (Shadowgrasp-Cape, Konzept: −20 % Stun), 0..MASTER_PERK_CAP.
 * tick.ts multipliziert die (risiko-modifizierte) Stun-Dauer mit (1 − Wert).
 */
export function masterStunReduction(state: GameState, content: ContentDB, skill: SkillId): number {
  return masterPerkValue(state, content, "stunReduction", skill);
}

/**
 * Gilt für Aktionen dieses Skills „misslingt nie" (Soulchef-Cape, Konzept: Kochen 100 %)?
 * tick.ts setzt die Erfolgschance dann EXAKT 1 — bewusst am 0.95-Cap vorbei (der lebt in
 * actionSuccessChance und bleibt für alle anderen Quellen bindend). `value` des Perks ist egal.
 */
export function masterAlwaysSucceeds(state: GameState, content: ContentDB, skill: SkillId): boolean {
  const equipment = state.character.equipment;
  for (const slot of EQUIP_SLOTS) {
    const itemId = equipment[slot];
    if (!itemId) continue;
    const perk = content.items[itemId]?.masterPerk;
    if (!perk || perk.kind !== "alwaysSucceed") continue;
    if (perk.skill !== undefined && perk.skill !== skill) continue;
    return true;
  }
  return false;
}

/**
 * Reife-Beschleunigung der Farming-Beete (Gravetender-Cape, Konzept: 8 % schneller), 0..Cap.
 * farming.ts rechnet `effectiveGrowMs = growMs × (1 − Wert)`. Skill-Scope "farming" (der Perk
 * der Content-Welle deklariert ihn so; ein skill-freier Perk zählt ebenfalls).
 */
export function masterCropSpeedBonus(state: GameState, content: ContentDB): number {
  return masterPerkValue(state, content, "cropSpeed", "farming");
}

/**
 * Buff-Dauer-Multiplikator ≥ 1 (Venombrewer-Cape, Konzept: Tonika/Tränke +10 % Dauer).
 * consumable.ts wendet ihn BEIM ANLEGEN eines Buffs an (globale Lesart — am Callsite gibt es
 * keinen Skill-Kontext; ein deklarierter Perk-`skill` ist reine Doku). Exakt 1 ohne Träger.
 */
export function masterBuffDurationMult(state: GameState, content: ContentDB): number {
  return 1 + masterPerkValue(state, content, "buffDuration");
}

/**
 * Slayer-Punkte-Bonus (Bountymaster-Cape, Konzept: +10 % Punkte), 0..Cap. slayer.ts skaliert die
 * Task-Abschluss-Gutschrift mit (1 + Wert), kaufmännisch gerundet. Globale Lesart (Slayer hat
 * genau eine Gutschrift-Stelle; deklarierter Perk-`skill` ist reine Doku).
 */
export function masterSlayerPointsBonus(state: GameState, content: ContentDB): number {
  return masterPerkValue(state, content, "slayerPoints");
}

// ── Weihe-Verleihung (Level-99-Hook) ────────────────────────────────────────────────────────

/**
 * Level-99-Hook: prüft ALLE Content-Skills und vermerkt frische Meisterweihen (Level ≥ 99 &&
 * noch nicht vermerkt) in `state.masteryCapes` — EINMALIG & idempotent (der Marker ist monoton,
 * ein erneuter Aufruf ändert nichts). Läuft einmal je advance (tick.ts, hinter syncProgression)
 * und deckt damit ALLE XP-Quellen ab (Skilling/Combat/Slayer/Farming/Quests — alles läuft durch
 * advance). Verleiht anschließend fällige Ring-Items über `grantPendingCapes`.
 *
 * Zieht KEIN RNG; ohne frischen 99er und ohne Cape-Content ein reiner No-op → Determinismus-
 * Fixtures bleiben bit-identisch. Gibt die FRISCH geweihten Skills zurück (für Log/Tests; die
 * UI liest Zeremonien über `pendingCapeCeremonies`, nicht über diesen Rückgabewert).
 */
export function checkMasteryCapes(state: GameState, content: ContentDB): SkillId[] {
  // Defensiv gegen handgebaute Test-/Alt-States ohne Felder (Muster markItemDiscovered).
  const capes = (state.masteryCapes ??= {});
  const newly: SkillId[] = [];
  for (const skillId of Object.keys(content.skills)) {
    if (capes[skillId] === true) continue;
    if (levelFromXp(state.skills[skillId]?.xp ?? 0) >= MASTER_CAPE_LEVEL) {
      capes[skillId] = true;
      newly.push(skillId);
    }
  }
  // VOLLENDUNGS-Weihe (Konzept § „Vollendung", COMPLETION_CAPE_KEY, Ring der Vollendung): ALLE
  // Content-Skills ≥ 99 → derselbe Marker-/Verleihungs-/Zeremonie-Pfad, nur unterm Pseudo-Key.
  // Prüfbar billig über die soeben gepflegten Marker (jeder 99er steht in `capes`).
  if (capes[COMPLETION_CAPE_KEY] !== true) {
    const allMastered = Object.keys(content.skills).every((id) => capes[id] === true);
    if (allMastered) {
      capes[COMPLETION_CAPE_KEY] = true;
      newly.push(COMPLETION_CAPE_KEY);
    }
  }
  grantPendingCapes(state, content);
  return newly;
}

/**
 * Ring-NACHREICHUNG: verleiht für jede vermerkte Weihe („masteryCapes[skill] === true"), deren
 * Ring-Item im aktuellen Content EXISTIERT und die NIE verliehen wurde („!capeGranted[skill]"),
 * genau EIN `ring_master_<skillId>` via addItemOrBank (markiert automatisch die Entdeckung).
 *
 * Warum getrennt vom Weihe-Marker: das Ring-Item kann beim Erreichen der 99 noch fehlen (Content
 * kommt ggf. in Folge-Wellen) — dann bleibt NUR der Weihe-Marker gesetzt, und dieser Pfad reicht die
 * Verleihung nach, sobald der Content da ist. Aufrufer: `checkMasteryCapes` (je advance) und der
 * sanitize-Pass der Persistenz (jeder Load — deckt die v59-Migration rückwirkender 99er ab).
 *
 * ZUSTELL-GARANTIE statt Verlust-Fenster (Chef-Fund 2026-07-18, „99er-Fishing-Cape bei vollem
 * Inventar weg"): kommt das Item über addItemOrBank nirgends unter (Inventar voll + Auto-Bank
 * aus bzw. Bank-Arten erschöpft ⇒ 0 angekommen), wird es DIREKT in die Bank zugestellt —
 * der Bank-Record hat strukturell immer Platz (dasselbe Muster wie die Slot-Rettung im
 * sanitize-Pass der Persistenz). Die Verleihung bleibt damit nie mehr „pending" und kann
 * nie verloren gehen; einziger Pending-Grund ist ein (noch) fehlendes Content-Item.
 * Idempotent, zieht KEIN RNG.
 */
export function grantPendingCapes(state: GameState, content: ContentDB): void {
  const capes = (state.masteryCapes ??= {});
  const granted = (state.capeGranted ??= {});
  for (const skillId of Object.keys(capes)) {
    if (capes[skillId] !== true || granted[skillId] === true) continue;
    const itemId = masterRingItemId(skillId);
    if (!content.items[itemId]) continue; // Content-Guard: Item existiert (noch) nicht → nur Marker
    const { toInventory, toBank } = addItemOrBank(state, content, itemId, 1);
    if (toInventory + toBank <= 0) {
      // Zustell-Garantie: direkt in die Bank (Kapazität zählt distinkte ARTEN — ein erzwungener
      // Neueintrag überschreitet sie schlimmstenfalls um 1; Datenverlust wäre schlimmer).
      state.bank[itemId] = (state.bank[itemId] ?? 0) + 1;
      markItemDiscovered(state, itemId);
    }
    granted[skillId] = true;
  }
}

// ── Zeremonie-Signal für die UI ─────────────────────────────────────────────────────────────

/**
 * Offene Weihe-Zeremonien: alle Skills mit vermerkter Weihe, deren Zeremonie die UI noch nicht
 * quittiert hat (`!capeCeremonySeen`). Reihenfolge = Einfüge-Reihenfolge der Weihen (live: in
 * Erreichens-Reihenfolge; Migration: Content-Skill-Reihenfolge) — deterministisch. Die UI zeigt
 * sie GESTAFFELT (eine Zeremonie nach der anderen, Konzept-Notiz §4) und quittiert je Skill via
 * `markCapeCeremonySeen`. Rein lesend, zieht kein RNG.
 */
export function pendingCapeCeremonies(state: GameState): SkillId[] {
  const capes = state.masteryCapes ?? {};
  const seen = state.capeCeremonySeen ?? {};
  return Object.keys(capes).filter((id) => capes[id] === true && seen[id] !== true);
}

/**
 * Quittiert die Weihe-Zeremonie eines Skills (UI-Verb — die UI mutiert den State nie direkt).
 * No-op für Skills ohne vermerkte Weihe (Invariante capeCeremonySeen ⊆ masteryCapes bleibt
 * gewahrt; sanitize erzwingt sie zusätzlich beim Load). Idempotent.
 */
export function markCapeCeremonySeen(state: GameState, skillId: SkillId): void {
  if (state.masteryCapes?.[skillId] !== true) return;
  (state.capeCeremonySeen ??= {})[skillId] = true;
}
