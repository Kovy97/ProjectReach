// claude:2026-10-30T22:28:00+01:00 — Belohnungsladen 1.4.2: Dienste mit Sofortwirkung (Chef-Entscheide L1–L10 vom 30.10.2026,
// design/1.4.2-belohnungsladen-plan.md § 4.1/§ 5/§ 7). Ein Dienst wirkt beim Kauf (Zielwahl im Laden), nichts landet im Inventar.
// Grenzen je Kalendertag/-woche im Kaufbuch `state.tokenShopLedger` (SAVE 100); „heute“ = `stats.lastDailyDay` (YYYYMMDD vom
// Client), keine Zeitquelle in der Engine. Rein und deterministisch: kein Math.random, kein Date, kein Zug aus `state.rng`
// (das Würfeln seedet einen eigenen `createRng` aus Tag + Wurfzähler).
import type { ActionDef, ActionId, ContentDB, GameState, PetId, SkillId, TalentEffectKind, TokenServiceDef, TokenServiceKind } from "@hearthforge/shared";
import { recordTokenShopPurchase, tokenServicePriceAt, tokenShopLedgerUsage, tokenShopLimitRemaining } from "@hearthforge/shared";
import { actionLevelMet } from "./actions";
import { syncProgression } from "./character";
import { levelFromXp } from "./leveling";
import { grantMasteryLesson, masteryLessonXp } from "./mastery";
import { bestEffectiveXpPerMinute, callWorkOrderTier, workOrderTierCallable } from "./orders";
import { addPetTrail, petTrailPreview } from "./pets";
import { prestigeSkillXpMult, talentMasteryXpMult } from "./prestige-effects";
import {
  dailyRerollCandidates,
  dailyRerolledToday,
  isShelfOpen,
  rerollDailyQuest,
  spendQuestTokens,
  tokenShopLedgerOf,
  tokenShopToday,
} from "./quests";
import { talentEffect } from "./talents";
import { effectiveActionDurationMs } from "./tick";

/** Höchste Fertigkeitsstufe: die Lehrstunde gilt nicht für Fertigkeiten auf 99 (Plan § 4.1). */
const SKILL_LESSON_MAX_LEVEL = 99;
/** Rückfall-Minuten, falls ein Lehr-Dienst im Content ohne `minutes` steht (Plan: Lehrstunde 30, Meisterlehre 60). */
const DEFAULT_LESSON_MINUTES: Readonly<Partial<Record<TokenServiceKind, number>>> = { skillLesson: 30, masteryLesson: 60 };
/** Rückfall-Anteil der Begleiter-Fährte (Plan: 5 %). */
const DEFAULT_PET_TRAIL_PCT = 0.05;

/**
 * Stabile Fehlschlag-Codes (sprachneutral, die UI rendert `t("quests.services.reason." + code)` o. ä.):
 *  - `not_found`          unbekannte Dienst-Id (Content-Fehler).
 *  - `locked`             Kapitel-Regal noch zu oder Talent fehlt (Details in `TokenServiceStatus.lock`).
 *  - `limit`              Tages- oder Wochengrenze erreicht.
 *  - `not_enough_tokens`  Marken reichen nicht für den aktuellen Preis (Staffel).
 *  - `invalid_target`     Ziel fehlt oder passt nicht (fremde Karte, eingelöst/erfüllt, Fertigkeit nicht erlaubt, Aktion gesperrt,
 *                         Begleiter schon da …).
 *  - `no_effect`          Ziel gültig, aber der Kauf brächte nichts (kein Ersatz für die Karte, Uhr steht schon auf 0,
 *                         Fertigkeit/Meisterschaft auf 99, Spur schon voll).
 */
export type TokenServiceReason = "not_found" | "locked" | "limit" | "not_enough_tokens" | "invalid_target" | "no_effect";

/** Warum ein Dienst gesperrt ist: Kapitel-Regal (mit Gate-Quest) oder Talent (mit Baum/Knoten zur Anzeige des Namens). */
export type TokenServiceLock =
  | { kind: "shelf"; shelfId: string; questId: string }
  | { kind: "talent"; effect: TalentEffectKind; treeId?: string; nodeId?: string };

/** Lese-Status eines Dienstes für die Laden-Leiste (ohne Ziel). */
export interface TokenServiceStatus {
  id: string;
  kind: TokenServiceKind | null;
  found: boolean;
  locked: boolean;
  lock?: TokenServiceLock;
  /** Preis des NÄCHSTEN Kaufs (Staffel beim Würfeln: 2/3/4). */
  price: number;
  affordable: boolean;
  usedToday: number;
  usedThisWeek: number;
  limitPerDay: number | null;
  limitPerWeek: number | null;
  /** Restkäufe heute bzw. diese Woche (null = keine solche Grenze). */
  remainingToday: number | null;
  remainingWeek: number | null;
  /** Restkäufe bis zur engsten Grenze (null = unbegrenzt). */
  remaining: number | null;
  /** Braucht der Kauf ein Ziel (Karte, Fertigkeit, Aktion, Begleiter)? Auftrag rufen: nein. */
  needsTarget: boolean;
  /** Erster Grund, der einen Kauf JETZT verhindert (ohne Zielprüfung), sonst fehlt das Feld. */
  reason?: TokenServiceReason;
}

/** Ergebnis einer Vorschau bzw. eines Kaufs. `amount` = XP, Meisterschafts-XP oder vorgezogene Fehlwürfe (sonst 0). */
export interface TokenServiceResult {
  ok: boolean;
  reason?: TokenServiceReason;
  /** Bezahlter (Kauf) bzw. fälliger (Vorschau) Markenpreis. */
  price: number;
  amount: number;
  /** NUR Würfeln nach dem Kauf: die neue Tagesaufgabe (sie steht auf dem Platz der alten). */
  questId?: string;
}

/** Ein wählbares Ziel mit Vorschau (für Zielwahl-Listen der UI). */
export interface TokenServiceTarget {
  target: string;
  ok: boolean;
  reason?: "invalid_target" | "no_effect";
  amount: number;
}

/** Alle Dienste in Anzeige-Reihenfolge (`sortOrder`, dann Content-Reihenfolge). Fehlt die Liste: leer. */
export function tokenServiceDefs(content: ContentDB): TokenServiceDef[] {
  const list = content.tokenServices ?? [];
  return list
    .map((d, i) => ({ d, i }))
    .sort((a, b) => (a.d.sortOrder ?? 0) - (b.d.sortOrder ?? 0) || a.i - b.i)
    .map((x) => x.d);
}

export function tokenServiceDef(content: ContentDB, id: string): TokenServiceDef | undefined {
  return content.tokenServices?.find((d) => d.id === id);
}

/** Gesperrt? Regal-Gate (Kapitel) vor Talent-Gate. null = offen. */
function lockOf(state: GameState, content: ContentDB, def: TokenServiceDef): TokenServiceLock | null {
  if (!isShelfOpen(state, content, def.shelfId)) {
    const questId = content.tokenShopShelves?.find((s) => s.id === def.shelfId)?.requiresQuest ?? "";
    return { kind: "shelf", shelfId: def.shelfId ?? "", questId };
  }
  const effect = def.requiresTalentEffect;
  if (effect && !(talentEffect(state, content, effect) > 0)) {
    for (const tree of content.talentTrees ?? []) {
      const node = tree.nodes.find((n) => n.effect.kind === effect);
      if (node) return { kind: "talent", effect, treeId: tree.id, nodeId: node.id };
    }
    return { kind: "talent", effect };
  }
  return null;
}

function needsTarget(kind: TokenServiceKind): boolean {
  return kind !== "orderCall";
}

/** Verbrauch, Restgrenzen und Preis des nächsten Kaufs (rein lesend). */
function usageOf(state: GameState, def: TokenServiceDef): {
  usedToday: number;
  usedThisWeek: number;
  remainingToday: number | null;
  remainingWeek: number | null;
  remaining: number | null;
  price: number;
} {
  const usage = tokenShopLedgerUsage(state.tokenShopLedger, def.id, tokenShopToday(state));
  const remainingToday = typeof def.limitPerDay === "number" ? Math.max(0, def.limitPerDay - usage.day) : null;
  const remainingWeek = typeof def.limitPerWeek === "number" ? Math.max(0, def.limitPerWeek - usage.week) : null;
  // Staffel zählt im engsten Zeitraum: Tag, falls es eine Tagesgrenze gibt, sonst Woche.
  const n = typeof def.limitPerDay === "number" ? usage.day : usage.week;
  return {
    usedToday: usage.day,
    usedThisWeek: usage.week,
    remainingToday,
    remainingWeek,
    remaining: tokenShopLimitRemaining(def, usage),
    price: tokenServicePriceAt(def, n),
  };
}

/** Lese-Status eines Dienstes (Gate, Grenzen, Preis, Kaufbarkeit ohne Ziel). Unbekannte Id ⇒ `found: false`, Grund `not_found`. */
export function tokenServiceStatus(state: GameState, content: ContentDB, id: string): TokenServiceStatus {
  const def = tokenServiceDef(content, id);
  if (!def) {
    return {
      id, kind: null, found: false, locked: false, price: 0, affordable: false, usedToday: 0, usedThisWeek: 0,
      limitPerDay: null, limitPerWeek: null, remainingToday: null, remainingWeek: null, remaining: 0, needsTarget: false, reason: "not_found",
    };
  }
  const lock = lockOf(state, content, def);
  const u = usageOf(state, def);
  const affordable = state.character.questTokens >= u.price;
  const reason: TokenServiceReason | undefined = lock ? "locked" : u.remaining === 0 ? "limit" : !affordable ? "not_enough_tokens" : undefined;
  return {
    id: def.id,
    kind: def.kind,
    found: true,
    locked: lock !== null,
    ...(lock ? { lock } : {}),
    price: u.price,
    affordable,
    usedToday: u.usedToday,
    usedThisWeek: u.usedThisWeek,
    limitPerDay: typeof def.limitPerDay === "number" ? def.limitPerDay : null,
    limitPerWeek: typeof def.limitPerWeek === "number" ? def.limitPerWeek : null,
    remainingToday: u.remainingToday,
    remainingWeek: u.remainingWeek,
    remaining: u.remaining,
    needsTarget: needsTarget(def.kind),
    ...(reason ? { reason } : {}),
  };
}

// ── Lehrstunde (Fertigkeits-XP) ─────────────────────────────────────────────

/**
 * XP einer Lehrstunde: `minutes` × beste XP/min der Fertigkeit mit effektiver Dauer (`bestEffectiveXpPerMinute`, dieselbe Formel
 * wie die Auftrags-XP, seit claude:2026-10-31T13:58:31+01:00 zusätzlich mit der Grund-Erfolgschance gewichtet), gerundet, dann × Prestige-XP-Faktor (`prestigeSkillXpMult`, wie `deliverWorkOrder`). 0 auf Stufe 99 oder
 * ohne nutzbare Aktion. Rein.
 */
export function skillLessonXp(state: GameState, content: ContentDB, skill: SkillId, minutes: number): number {
  if (!content.skills[skill] || !(minutes > 0)) return 0;
  const xpBefore = Math.max(0, state.skills[skill]?.xp ?? 0);
  if (levelFromXp(xpBefore) >= SKILL_LESSON_MAX_LEVEL) return 0;
  const durOf = (a: ActionDef): number => effectiveActionDurationMs(state, content, a);
  // claude:2026-10-31T13:58:31+01:00 — Befunde A2/B2: Erfolgschance einrechnen (Diebeskunst gab sonst bis zu doppelt so viel wie echtes Spiel).
  const base = Math.round(minutes * bestEffectiveXpPerMinute(state, content, skill, durOf, { successWeighted: true }));
  if (!(base > 0)) return 0;
  return base * prestigeSkillXpMult(state, content, skill, xpBefore);
}

/** Schreibt eine Lehrstunde gut (s. `skillLessonXp`), synct Gesamtstufe. Rückgabe: gutgeschriebene XP (0 = nichts). */
export function grantSkillLesson(state: GameState, content: ContentDB, skill: SkillId, minutes: number): number {
  const xp = skillLessonXp(state, content, skill, minutes);
  if (!(xp > 0)) return 0;
  const entry = (state.skills[skill] ??= { xp: 0 });
  entry.xp += xp;
  syncProgression(state, content);
  return xp;
}

// ── Zielprüfung je Art (rein) ───────────────────────────────────────────────

type TargetCheck = { ok: true; amount: number } | { ok: false; reason: "invalid_target" | "no_effect" | "locked" };

function masteryLessonCheck(state: GameState, content: ContentDB, def: TokenServiceDef, actionId: ActionId): TargetCheck {
  const action = content.actions[actionId];
  if (!action || !(action.durationMs > 0) || !actionLevelMet(state, content, actionId)) return { ok: false, reason: "invalid_target" };
  const minutes = def.minutes ?? DEFAULT_LESSON_MINUTES.masteryLesson!;
  const amount = masteryLessonXp(state, content, actionId, minutes, effectiveActionDurationMs(state, content, action), talentMasteryXpMult(state, content));
  return amount > 0 ? { ok: true, amount } : { ok: false, reason: "no_effect" };
}

function checkTarget(state: GameState, content: ContentDB, def: TokenServiceDef, target: string | undefined): TargetCheck {
  switch (def.kind) {
    case "orderCall": {
      const tier = def.tier ?? 2;
      return workOrderTierCallable(state, tier) ? { ok: true, amount: 0 } : { ok: false, reason: "no_effect" };
    }
    case "dailyReroll": {
      if (!target) return { ok: false, reason: "invalid_target" };
      const c = dailyRerollCandidates(state, content, target, dailyRerolledToday(state));
      return c.ok ? { ok: true, amount: 0 } : { ok: false, reason: c.reason };
    }
    case "skillLesson": {
      if (!target || !(def.skills ?? []).includes(target) || !content.skills[target]) return { ok: false, reason: "invalid_target" };
      const amount = skillLessonXp(state, content, target, def.minutes ?? DEFAULT_LESSON_MINUTES.skillLesson!);
      return amount > 0 ? { ok: true, amount } : { ok: false, reason: "no_effect" };
    }
    case "masteryLesson":
      if (!target) return { ok: false, reason: "invalid_target" };
      return masteryLessonCheck(state, content, def, target);
    case "petTrail": {
      if (!target) return { ok: false, reason: "invalid_target" };
      const p = petTrailPreview(state, content, target, def.pct ?? DEFAULT_PET_TRAIL_PCT);
      return p.ok ? { ok: true, amount: p.add } : { ok: false, reason: p.reason };
    }
    default:
      return { ok: false, reason: "invalid_target" };
  }
}

/**
 * Vorschau eines Kaufs mit Ziel, in DERSELBEN Prüf-Reihenfolge wie `buyTokenService`: not_found → locked → limit →
 * not_enough_tokens → invalid_target → no_effect. Bei Erfolg `amount` (XP, Meisterschafts-XP, Fehlwürfe; sonst 0). Rein.
 */
export function tokenServicePreview(state: GameState, content: ContentDB, id: string, target?: string): TokenServiceResult {
  const def = tokenServiceDef(content, id);
  if (!def) return { ok: false, reason: "not_found", price: 0, amount: 0 };
  const u = usageOf(state, def);
  if (lockOf(state, content, def)) return { ok: false, reason: "locked", price: u.price, amount: 0 };
  if (u.remaining === 0) return { ok: false, reason: "limit", price: u.price, amount: 0 };
  if (state.character.questTokens < u.price) return { ok: false, reason: "not_enough_tokens", price: u.price, amount: 0 };
  const t = checkTarget(state, content, def, target);
  if (!t.ok) return { ok: false, reason: t.reason, price: u.price, amount: 0 };
  return { ok: true, price: u.price, amount: t.amount };
}

/**
 * Wählbare Ziele eines Dienstes mit Vorschau (Grenzen/Marken NICHT geprüft, dafür `tokenServiceStatus`):
 *  - dailyReroll:   die heutigen, noch nicht eingelösten Karten.
 *  - skillLesson:   die erlaubten Fertigkeiten (`def.skills`), `amount` = XP.
 *  - masteryLesson: freigeschaltete Aktionen (optional nur `opts.skill`), `amount` = Meisterschafts-XP.
 *  - petTrail:      fehlende Begleiter mit Drop-Chance, `amount` = vorgezogene Fehlwürfe.
 *  - orderCall:     keine (leere Liste).
 */
export function tokenServiceTargets(
  state: GameState,
  content: ContentDB,
  id: string,
  opts: { skill?: SkillId } = {},
): TokenServiceTarget[] {
  const def = tokenServiceDef(content, id);
  if (!def) return [];
  const row = (target: string, c: TargetCheck): TokenServiceTarget =>
    c.ok ? { target, ok: true, amount: c.amount } : { target, ok: false, reason: c.reason === "locked" ? "invalid_target" : c.reason, amount: 0 };
  switch (def.kind) {
    case "dailyReroll":
      return state.quests.daily.quests.filter((d) => !d.claimed).map((d) => row(d.questId, checkTarget(state, content, def, d.questId)));
    case "skillLesson":
      return (def.skills ?? []).filter((s) => !!content.skills[s]).map((s) => row(s, checkTarget(state, content, def, s)));
    case "masteryLesson": {
      const out: TokenServiceTarget[] = [];
      for (const a of Object.values(content.actions)) {
        if (opts.skill && a.skill !== opts.skill) continue;
        if (!(a.durationMs > 0) || !actionLevelMet(state, content, a.id)) continue;
        out.push(row(a.id, masteryLessonCheck(state, content, def, a.id)));
      }
      return out;
    }
    case "petTrail": {
      const out: TokenServiceTarget[] = [];
      for (const petId of Object.keys(content.pets ?? {})) {
        if (state.character.ownedPets[petId]) continue;
        const c = checkTarget(state, content, def, petId);
        if (!c.ok && c.reason !== "no_effect") continue; // ohne Drop-Chance bzw. ohne Talent nicht anbieten
        out.push(row(petId, c));
      }
      return out;
    }
    default:
      return [];
  }
}

/**
 * Kauft einen Dienst und wendet ihn SOFORT an. Prüft wie `tokenServicePreview`, bucht dann den aktuellen Preis ab, wendet an und
 * verbucht den Kauf im Kaufbuch. Scheitert die Anwendung unerwartet, werden die Marken zurückgebucht und nichts verbucht
 * (kein Verlust, Muster `buyTokenShopOffer`). Würfeln merkt sich die weggewürfelte Karte für den Rest des Tages.
 */
export function buyTokenService(state: GameState, content: ContentDB, serviceId: string, target?: string): TokenServiceResult {
  const pre = tokenServicePreview(state, content, serviceId, target);
  if (!pre.ok) return pre;
  const def = tokenServiceDef(content, serviceId)!;
  const today = tokenShopToday(state);
  const usedToday = tokenShopLedgerUsage(state.tokenShopLedger, def.id, today).day;
  if (!spendQuestTokens(state, pre.price)) return { ok: false, reason: "not_enough_tokens", price: pre.price, amount: 0 };
  const refund = (reason: TokenServiceReason): TokenServiceResult => {
    state.character.questTokens += pre.price;
    return { ok: false, reason, price: pre.price, amount: 0 };
  };
  let amount = 0;
  let questId: string | undefined;
  switch (def.kind) {
    case "orderCall":
      if (!callWorkOrderTier(state, def.tier ?? 2)) return refund("no_effect");
      break;
    case "dailyReroll": {
      const r = rerollDailyQuest(state, content, target!, usedToday, dailyRerolledToday(state));
      if (!r.ok) return refund(r.reason);
      questId = r.questId;
      break;
    }
    case "skillLesson":
      amount = grantSkillLesson(state, content, target!, def.minutes ?? DEFAULT_LESSON_MINUTES.skillLesson!);
      if (!(amount > 0)) return refund("no_effect");
      break;
    case "masteryLesson": {
      const action = content.actions[target!]!;
      amount = grantMasteryLesson(
        state,
        content,
        action.id,
        def.minutes ?? DEFAULT_LESSON_MINUTES.masteryLesson!,
        effectiveActionDurationMs(state, content, action),
        talentMasteryXpMult(state, content),
      );
      if (!(amount > 0)) return refund("no_effect");
      break;
    }
    case "petTrail":
      amount = addPetTrail(state, content, target as PetId, def.pct ?? DEFAULT_PET_TRAIL_PCT);
      if (!(amount > 0)) return refund("no_effect");
      break;
    default:
      return refund("invalid_target");
  }
  const ledger = tokenShopLedgerOf(state);
  recordTokenShopPurchase(ledger, def.id, today);
  if (def.kind === "dailyReroll" && target && !ledger.rerolledDailies.includes(target)) ledger.rerolledDailies.push(target);
  return { ok: true, price: pre.price, amount, ...(questId ? { questId } : {}) };
}
