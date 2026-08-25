import type {
  ContentDB,
  GameState,
  MonsterId,
  QuestDef,
  QuestObjective,
  QuestObjectiveType,
  DailyQuestEntry,
} from "@hearthforge/shared";
import {
  DAILY_QUEST_COUNT,
  DAILY_MAX_PER_DIFFICULTY,
  DAILY_NONCOMBAT_MIN,
  DAILY_LEVEL_HEADROOM,
  DAILY_DIFFICULTY_MIN_TOTAL_LEVEL,
  PARAGON_DUNGEON_ID,
  QUEST_DIFFICULTIES,
  effectiveBankCapacity,
  nextCalendarDay,
  usedBankSlots,
} from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { addItemOrBank, freeSlots, MAX_STACK, removeItem } from "./inventory";
import { createRng, nextInt } from "./rng";
import { isZoneUnlocked } from "./zones";
import { isDungeonUnlocked } from "./dungeon";

/**
 * Roher (absoluter) Fortschrittswert eines Objectives — gelesen aus BEREITS VORHANDENEN
 * State-Zählern. Keine neuen Event-Hooks in combat/tick nötig (das ist Absicht: günstig &
 * deterministisch). Für craft_items pflegt der tick-/Action-Pfad neue Zähler (itemsCrafted /
 * craftedById), die ebenfalls nur kumulativ steigen.
 */
function rawProgress(state: GameState, _content: ContentDB, obj: QuestObjective): number {
  switch (obj.type) {
    case "kill_monster": {
      // [Sweep6 W2-T6-#3] `targets` = Varianten-Liste: Kills ALLER gelisteten Monster zählen
      // summiert (Union mit `target`, dedupliziert). Löst die Goblin-Quest-Falle: q_first_blood
      // zählte nur den Basis-`goblin` — 4 614 Kills an 8 Goblin-Varianten = 0/10 Fortschritt.
      // Ohne `targets` unverändert nur `target` (abwärtskompatibel; Baselines bleiben konsistent,
      // da repeatBaseline denselben rawProgress speichert).
      if (obj.targets && obj.targets.length > 0) {
        const ids = new Set<string>(obj.targets);
        if (obj.target) ids.add(obj.target);
        let sum = 0;
        for (const id of ids) sum += state.monsterKills[id] ?? 0;
        return sum;
      }
      return obj.target ? (state.monsterKills[obj.target] ?? 0) : 0;
    }
    case "kill_total":
      return state.stats.kills;
    case "reach_skill_level":
      return obj.target ? levelFromXp(state.skills[obj.target]?.xp ?? 0) : 0;
    case "reach_total_level":
      return state.character.totalLevel;
    case "gather_items":
      return state.stats.itemsGathered;
    case "craft_items":
      // target gesetzt = bestimmte Item-ID, leer = beliebiges geschmiedetes Item.
      return obj.target ? (state.stats.craftedById[obj.target] ?? 0) : state.stats.itemsCrafted;
    case "reach_paragon_floor":
      // Paragonturm-Etagen-Höchststand (Aschechronik Kapitel 21, ceo-run-2026-07-13):
      // `state.paragon.best` = höchste jemals ABGESCHLOSSENE Etage, strikt monoton — der
      // Tod-Reset im Turm senkt nur den checkpoint, nie best (engine/paragon.ts). Kumulativ
      // wie die anderen reach_*-Zustände; target ignoriert, count = Ziel-Etage. Kein neuer
      // State, kein Event-Hook — bewusst nur lesend (Muster dieses switch).
      return state.paragon?.best ?? 0;
    default:
      return 0;
  }
}

/**
 * Effektiver Fortschritt eines Objectives unter Berücksichtigung der Repeatable-Baseline.
 * Bei nicht-wiederholbaren Quests ist die Baseline 0 → roher kumulativer Zähler.
 * Bei wiederholbaren Quests misst der Fortschritt „seit dem letzten Claim" (Zähler − Baseline).
 *
 * Wichtig für reach_*-Objectives (Skill-/Gesamtlevel): diese sind keine „pro Zyklus"-Mengen,
 * sondern Zustände. Eine sinnvolle repeatable reach_*-Quest ist selten; die Baseline-Subtraktion
 * gilt trotzdem konsistent (nach Claim müsste man weiter aufsteigen, um erneut zu erfüllen).
 */
export function objectiveProgress(
  state: GameState,
  content: ContentDB,
  obj: QuestObjective,
  baseline = 0,
): number {
  return Math.max(0, rawProgress(state, content, obj) - baseline);
}

/** Verhält sich die Quest wie eine wiederholbare? (explizit repeatable ODER Daily-Pool-Quest). */
function isRepeatable(quest: QuestDef): boolean {
  return !!quest.repeatable || !!quest.daily;
}

/** Baseline-Offset eines Objective-Index für eine (ggf. wiederholbare) Quest. */
function baselineFor(state: GameState, quest: QuestDef, objIndex: number): number {
  if (!isRepeatable(quest)) return 0;
  return state.quests.repeatBaseline[quest.id]?.[objIndex] ?? 0;
}

/** Ein Objective gilt als erfüllt, wenn sein (Baseline-bereinigter) Zähler den Zielwert erreicht. */
function objectiveMet(
  state: GameState,
  content: ContentDB,
  quest: QuestDef,
  obj: QuestObjective,
  objIndex: number,
): boolean {
  return objectiveProgress(state, content, obj, baselineFor(state, quest, objIndex)) >= obj.count;
}

/** Sind ALLE Objectives einer Quest erfüllt? */
export function questObjectivesMet(state: GameState, content: ContentDB, quest: QuestDef): boolean {
  return quest.objectives.every((o, i) => objectiveMet(state, content, quest, o, i));
}

/**
 * Ist eine Quest freigeschaltet (Quest-Ketten)? Verfügbar, sobald alle `requires`-Quests
 * EINGELÖST (claimed) sind. Ohne `requires` immer verfügbar.
 *
 * Hinweis: wiederholbare Quests landen nach dem Claim NICHT in `claimed`. Als Vorbedingung
 * einer Kette ist eine repeatable Quest daher nur direkt nach ihrem ersten Claim „erfüllt"
 * (über das hier mitgeführte `claimed`-Set, sobald sie einmal eingelöst wurde) — content-dev
 * sollte repeatable Quests bevorzugt NICHT als `requires` referenzieren.
 */
export function questUnlocked(state: GameState, quest: QuestDef): boolean {
  if (!quest.requires || quest.requires.length === 0) return true;
  return quest.requires.every((id) => state.quests.claimed.includes(id));
}

/**
 * Prüft alle freigeschalteten Quests gegen die State-Zähler und markiert erfüllte als
 * `completed` (= claimbar). Günstig: nur lesende Zählerprüfung, idempotent.
 *
 * - Einmalige Quests: nach Claim dauerhaft in `claimed` → werden übersprungen.
 * - Wiederholbare Quests: NICHT dauerhaft `claimed`; sie re-armen, sobald der Baseline-bereinigte
 *   Fortschritt das Ziel wieder erreicht → tauchen erneut in `completed` auf.
 */
export function evaluateQuests(state: GameState, content: ContentDB): void {
  for (const quest of content.quests) {
    if (!isRepeatable(quest) && state.quests.claimed.includes(quest.id)) continue;
    if (state.quests.completed.includes(quest.id)) continue;
    if (!questUnlocked(state, quest)) continue;
    if (questObjectivesMet(state, content, quest)) {
      state.quests.completed.push(quest.id);
    }
  }
}

/** Status einer einzelnen Quest für die UI. */
export type QuestStatus = "locked" | "active" | "completed" | "claimed";

export function questStatus(state: GameState, content: ContentDB, quest: QuestDef): QuestStatus {
  // Wiederholbare Quests sind nie dauerhaft „claimed": sie sind entweder claimbar oder wieder aktiv.
  if (!isRepeatable(quest) && state.quests.claimed.includes(quest.id)) return "claimed";
  if (!questUnlocked(state, quest)) return "locked";
  if (state.quests.completed.includes(quest.id) || questObjectivesMet(state, content, quest)) {
    return "completed";
  }
  return "active";
}

/** Kann diese Quest gerade eingelöst werden (erfüllt, freigeschaltet, nicht schon eingelöst)? */
export function canClaimQuest(state: GameState, content: ContentDB, questId: string): boolean {
  const quest = content.quests.find((q) => q.id === questId);
  if (!quest) return false;
  // Einmalige, bereits eingelöste Quest → nicht erneut claimbar. Repeatable: immer prüfbar.
  if (!isRepeatable(quest) && state.quests.claimed.includes(questId)) return false;
  // Daily-Quest, heute schon eingelöst → erst beim nächsten Tageswechsel wieder.
  if (quest.daily && isDailyClaimed(state, questId)) return false;
  // Daily-Quest muss in der HEUTIGEN Auswahl stehen — sonst ließe sich eine nicht gezogene Daily mit
  // bereits erfülltem kumulativem Zähler off-rotation einlösen (Tester-Sweep2 T28#P3).
  if (quest.daily && !state.quests.daily.quests.some((d) => d.questId === questId)) return false;
  if (!questUnlocked(state, quest)) return false;
  return questObjectivesMet(state, content, quest);
}

/**
 * Löst die Belohnung einer erfüllten Quest ein: Gold + Items.
 * - Einmalige Quest: wird als `claimed` gemerkt (idempotent, nie doppelt).
 * - Wiederholbare Quest: speichert den aktuellen Zählerstand je Objective als neue Baseline und
 *   re-armt damit; sie wird zusätzlich (einmalig) in `claimed` aufgenommen, damit Quest-Ketten,
 *   die sie als `requires` führen, freischalten können. Gibt true bei Erfolg zurück.
 */
/**
 * Passen ALLE Belohnungs-Items (kumulativ) ins Inventar bzw. — bei Auto-Bank — ins Lager? Verhindert, dass
 * eine eingelöste Quest ihre Belohnung bei vollem Inventar verliert UND die einmalige Quest verbraucht wird
 * (Tester-Sweep3 T12#1 = unwiederbringlicher Reward-Verlust). Reward-Mengen sind klein (≤1 Slot/Eintrag).
 */
function canHoldRewards(
  state: GameState,
  content: ContentDB,
  items: { id: string; qty: number }[],
): boolean {
  let freeInv = freeSlots(state.inventory);
  // [Sweep6 W2-T5-P3] usedBankSlots statt Object.keys(...).length: 0-qty-Geister-Keys belegen
  // keinen Slot (einheitliche Zählung mit bank.ts/inventory.ts/tick.ts).
  let bankFreeKinds = state.settings.autoBank
    ? Math.max(0, effectiveBankCapacity(state, content) - usedBankSlots(state))
    : 0;
  const plannedBankKinds = new Set<string>();
  for (const { id } of items) {
    // 1) vorhandener (plain) Stack mit Platz → kein neuer Slot nötig
    if (state.inventory.slots.some((s) => s !== null && s.itemId === id && !s.instance && s.qty < MAX_STACK)) continue;
    // 2) freier Inventar-Slot
    if (freeInv > 0) { freeInv--; continue; }
    // 3) Auto-Bank: vorhandene/schon eingeplante Art kostet keinen Slot; sonst neue Art nur bei Kapazität
    if (state.settings.autoBank) {
      if (state.bank[id] !== undefined || plannedBankKinds.has(id)) continue;
      if (bankFreeKinds > 0) { bankFreeKinds--; plannedBankKinds.add(id); continue; }
    }
    return false;
  }
  return true;
}

export function claimQuest(state: GameState, content: ContentDB, questId: string): boolean {
  if (!canClaimQuest(state, content, questId)) return false;
  const quest = content.quests.find((q) => q.id === questId)!;
  const r = quest.rewards;
  // Belohnung muss KOMPLETT unterbringbar sein — sonst Claim ablehnen (nichts vergeben, Quest bleibt
  // einlösbar). Sonst gingen Items verloren und die einmalige Quest wäre verbraucht.
  if (r.items && r.items.length > 0 && !canHoldRewards(state, content, r.items)) return false;

  if (r.gold) state.character.gold += r.gold;
  // Quest-Tokens (Task #271, SAVE_VERSION 56): zusätzlich zur normalen Reward-Pipeline. Fehlendes
  // Feld / ungültiger Wert (≤0, NaN) ⇒ 0 Tokens — kein Bruch für bestehende Quest-Defs.
  if (
    typeof quest.tokenReward === "number" &&
    Number.isFinite(quest.tokenReward) &&
    quest.tokenReward > 0
  ) {
    state.character.questTokens += Math.floor(quest.tokenReward);
  }
  if (r.items) {
    for (const { id, qty } of r.items) {
      const { toInventory, toBank } = addItemOrBank(state, content, id, qty);
      state.stats.itemsGathered += toInventory + toBank;
    }
  }

  if (isRepeatable(quest)) {
    // Neue Baseline = aktueller ROHER Zählerstand je Objective → Fortschritt startet wieder bei 0.
    const baseline: Record<number, number> = {};
    quest.objectives.forEach((o, i) => {
      baseline[i] = rawProgress(state, content, o);
    });
    state.quests.repeatBaseline[questId] = baseline;
    // Einmalig als „schon mal eingelöst" markieren (für requires-Ketten), aber NICHT als Sperre.
    if (!state.quests.claimed.includes(questId)) state.quests.claimed.push(questId);
  } else {
    state.quests.claimed.push(questId);
  }

  // Daily-Entry für heute als eingelöst markieren (1× pro Tag).
  if (quest.daily) {
    const entry = state.quests.daily.quests.find((d) => d.questId === questId);
    if (entry) entry.claimed = true;
  }

  // Aus der claimbar-Liste entfernen (eingelöst ≠ mehr claimbar). Bei repeatable re-armt
  // evaluateQuests sie wieder, sobald die neue Baseline + count erreicht ist.
  const i = state.quests.completed.indexOf(questId);
  if (i >= 0) state.quests.completed.splice(i, 1);
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// Daily-Quests: deterministische Tagesauswahl aus dem Daily-Pool.
// Die Engine erzeugt KEINE Zeit — der Kalendertag-Stempel (z.B. 20260625) wird vom
// Client übergeben. Gleicher Tag → gleiche 6 Dailies; neuer Tag → neue 6 + Reset.
// ───────────────────────────────────────────────────────────────────────────

/** Alle Pool-Quests (daily === true) aus dem Content. */
export function dailyPool(content: ContentDB): QuestDef[] {
  return content.quests.filter((q) => q.daily);
}

// ── Progressions-Filter der Daily-Vergabe (Welle Z2, 2026-07-16) ────────────
// Neuling-Review Jorin Empf. 5: Tag-1-Spieler bekamen Dailies auf GESPERRTE Zonen
// (Grenzlande-Kills vor Chronik-Kapitel 3) und „Meister"-Karten weit über ihrem Stand.
// Muster: Slayer-Welt-Task-Pool-Filter aus Welle C (slayer.ts worldTaskMonsters).
// Wirkt NUR auf die NEUE Vergabe (pickDailyQuests mit state) — bereits vergebene Dailies in
// bestehenden Saves bleiben unangetastet, kein SAVE-Bump (reine Auswahl-Logik, kein State).

/** Objective-Typen, die Kampf verlangen (Basis der Nicht-Kampf-Mix-Garantie). */
const COMBAT_OBJECTIVE_TYPES: ReadonlySet<QuestObjectiveType> = new Set<QuestObjectiveType>([
  "kill_monster",
  "kill_total",
  "reach_paragon_floor", // Paragonturm-Etagen erklimmt man nur kämpfend
]);

/** Verlangt die Quest Kampf (mind. ein Kampf-Objective)? Nicht-Kampf = craft/gather/reach_skill. */
export function isCombatQuest(quest: QuestDef): boolean {
  return quest.objectives.some((o) => COMBAT_OBJECTIVE_TYPES.has(o.type));
}

/**
 * Ist dieses kill_monster-Ziel mit dem AKTUELLEN Stand bekämpfbar?
 * - dungeonOnly-Monster: nur wenn irgendein Dungeon, der es in seinen `encounters` führt,
 *   offen ist (isDungeonUnlocked — Quest-Gate + Trägerzone + Bestandsschutz).
 * - Welt-Monster: Zone muss offen sein (isZoneUnlocked; Monster ohne Zone = kein Gate) —
 *   exakt das Zonen-Gate, das canFightMonster/startCombat hart durchsetzen (Welle C).
 * Unbekannte Monster-IDs gelten als NICHT erfüllbar (defensiv zu; Integrity-Test sichert IDs).
 */
function killTargetAttainable(state: GameState, content: ContentDB, id: MonsterId): boolean {
  const monster = content.monsters[id];
  if (!monster) return false;
  if (monster.dungeonOnly) {
    return content.dungeons.some(
      (d) => d.encounters.includes(id) && isDungeonUnlocked(state, content, d.id),
    );
  }
  return monster.zone == null || isZoneUnlocked(state, content, monster.zone);
}

/**
 * Ist ein einzelnes Objective mit dem AKTUELLEN Stand (heute) erfüllbar? Heuristiken:
 * - kill_monster: mind. EIN Ziel der targets-Union ist bekämpfbar (s. killTargetAttainable).
 * - craft_items mit target: irgendeine Craft-Aktion (inputs > 0, wie der craftedById-Pfad in
 *   tick.ts), die das Item herstellt, verlangt höchstens aktuelles Skill-Level +
 *   DAILY_LEVEL_HEADROOM. Kein bekannter Hersteller → defensiv OFFEN (Content-Lücken fängt
 *   der Quest-Integrity-Guard, kein stilles Wegfiltern per Lookup-Fehler).
 * - reach_skill_level / reach_total_level: Ziel-Level ≤ aktuelles Level + DAILY_LEVEL_HEADROOM.
 * - reach_paragon_floor: nur wenn der Paragonturm entsperrt ist (paragon_key-Einmal-Unlock).
 * - kill_total / gather_items / craft_items ohne target: immer erfüllbar (die Startzone
 *   `pastures` ist nie gesperrt; Kupfer schmelzen geht ab Level 1).
 */
function objectiveAttainable(state: GameState, content: ContentDB, obj: QuestObjective): boolean {
  switch (obj.type) {
    case "kill_monster": {
      const ids = new Set<string>(obj.targets ?? []);
      if (obj.target) ids.add(obj.target);
      if (ids.size === 0) return false; // zielloses kill_monster wäre nie erfüllbar
      for (const id of ids) if (killTargetAttainable(state, content, id)) return true;
      return false;
    }
    case "craft_items": {
      if (!obj.target) return true;
      const producers = Object.values(content.actions).filter(
        (a) => (a.inputs?.length ?? 0) > 0 && a.loot.some((l) => l.itemId === obj.target),
      );
      if (producers.length === 0) return true; // defensiv offen (s. Doku oben)
      return producers.some(
        (a) =>
          (a.levelRequired ?? 1) <=
          levelFromXp(state.skills[a.skill]?.xp ?? 0) + DAILY_LEVEL_HEADROOM,
      );
    }
    case "reach_skill_level":
      if (!obj.target) return true;
      return obj.count <= levelFromXp(state.skills[obj.target]?.xp ?? 0) + DAILY_LEVEL_HEADROOM;
    case "reach_total_level":
      return obj.count <= state.character.totalLevel + DAILY_LEVEL_HEADROOM;
    case "reach_paragon_floor":
      // Gleicher Gate-Lesepfad wie paragon.ts: nur der dungeonsUnlocked-Eintrag öffnet den Turm.
      return state.dungeonsUnlocked?.[PARAGON_DUNGEON_ID] === true;
    default:
      return true; // kill_total / gather_items
  }
}

/**
 * Darf diese Pool-Quest HEUTE vergeben werden? Zwei Stufen:
 * 1. Schwierigkeits-Gate: `DAILY_DIFFICULTY_MIN_TOTAL_LEVEL` (hält „Meister"-Karten von
 *    Tag-1-Brettern fern, deren Ziele selbst kein Zonen-/Rezept-Gate tragen).
 * 2. Alle Objectives sind mit dem aktuellen Stand erfüllbar (objectiveAttainable).
 * Rein & deterministisch (kein RNG, kein Schreibzugriff).
 */
export function isDailyEligible(state: GameState, content: ContentDB, quest: QuestDef): boolean {
  const minTotal = DAILY_DIFFICULTY_MIN_TOTAL_LEVEL[quest.difficulty ?? "medium"] ?? 0;
  if (state.character.totalLevel < minTotal) return false;
  return quest.objectives.every((o) => objectiveAttainable(state, content, o));
}

/**
 * Zieht deterministisch `DAILY_QUEST_COUNT` Dailies aus dem Pool für einen Kalendertag.
 * Seed = day (+ optionaler Salt), sodass ein Tag immer dieselbe Auswahl liefert.
 * Constraint: keine Schwierigkeit erscheint öfter als `DAILY_MAX_PER_DIFFICULTY`.
 * Reiner, deterministischer Vorgang (Fisher-Yates über die Pool-Kopie mit seeded RNG).
 *
 * Mit `state` (Welle Z2 — der Pfad, den refreshDailyQuests nutzt) zusätzlich:
 * 1. Progressions-Filter: nur Quests, die `isDailyEligible` besteht (erfüllbare Ziele,
 *    kein Schwierigkeits-Überzug).
 * 2. Mix-Garantie: mindestens `DAILY_NONCOMBAT_MIN` Nicht-Kampf-Dailies, sofern der
 *    gefilterte Pool sie hergibt (Kern-Loop-Review Henrik Empf. 5 — Skiller-Grundversorgung).
 * 3. Auffüll-Regel: bleiben nach Filter + Constraint zu wenige, wird auf min(6, Poolgröße)
 *    aufgefüllt — erst erfüllbare (Constraint gelockert), dann die LEICHTESTEN übrigen —
 *    nie weniger Karten als die ungefilterte Vergabe von heute.
 * Determinismus: gleiche (day, salt, Spielstand-Fortschritt) → gleiche Auswahl; die
 * RNG-Mischung hängt unverändert NUR am Tag. Ohne `state` exakt das Alt-Verhalten
 * (ungefiltert — z.B. für den Content-Integrity-Guard).
 */
export function pickDailyQuests(
  content: ContentDB,
  day: number,
  salt = 0,
  state?: GameState,
): QuestDef[] {
  const pool = dailyPool(content);
  if (pool.length === 0) return [];

  // Deterministisch mischen (Seed aus day + salt; >>>0 hält ihn im uint32-Bereich).
  const rng = createRng((day * 2654435761 + salt) >>> 0);
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = nextInt(rng, 0, i);
    const tmp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = tmp;
  }

  const perDiff: Record<string, number> = {};
  const picked: QuestDef[] = [];
  const pickedIds = new Set<string>();
  const capOk = (q: QuestDef): boolean =>
    (perDiff[q.difficulty ?? "medium"] ?? 0) < DAILY_MAX_PER_DIFFICULTY;
  const take = (q: QuestDef): void => {
    const diff = q.difficulty ?? "medium";
    perDiff[diff] = (perDiff[diff] ?? 0) + 1;
    picked.push(q);
    pickedIds.add(q.id);
  };

  if (!state) {
    // Alt-Pfad ohne Spielstand: Greedy mit Schwierigkeits-Constraint, exakt wie bisher.
    for (const q of shuffled) {
      if (picked.length >= DAILY_QUEST_COUNT) break;
      if (capOk(q)) take(q);
    }
    return picked;
  }

  const target = Math.min(DAILY_QUEST_COUNT, pool.length);
  const eligible = shuffled.filter((q) => isDailyEligible(state, content, q));

  // Phase 1 — Mix-Garantie: die ersten Nicht-Kampf-Kandidaten reservieren (Skiller-Versorgung).
  for (const q of eligible) {
    if (picked.length >= DAILY_NONCOMBAT_MIN || picked.length >= target) break;
    if (!isCombatQuest(q) && capOk(q)) take(q);
  }

  // Phase 2 — regulär auffüllen (gemischte Reihenfolge, Schwierigkeits-Constraint).
  for (const q of eligible) {
    if (picked.length >= target) break;
    if (!pickedIds.has(q.id) && capOk(q)) take(q);
  }

  // Phase 3 — Auffüll-Regel: Lücken schließen statt weniger Karten auszugeben. Reihenfolge:
  // erfüllbare (nur am Constraint gescheitert) vor unerfüllbaren, darin die LEICHTESTEN zuerst;
  // Gleichstand entscheidet die (deterministische) Misch-Reihenfolge (stabiler Sort).
  if (picked.length < target) {
    const eligibleIds = new Set(eligible.map((q) => q.id));
    const rank = (q: QuestDef): number => QUEST_DIFFICULTIES.indexOf(q.difficulty ?? "medium");
    const rest = shuffled
      .filter((q) => !pickedIds.has(q.id))
      .sort((a, b) => {
        const ea = eligibleIds.has(a.id) ? 0 : 1;
        const eb = eligibleIds.has(b.id) ? 0 : 1;
        if (ea !== eb) return ea - eb;
        return rank(a) - rank(b);
      });
    for (const q of rest) {
      if (picked.length >= target) break;
      take(q);
    }
  }
  return picked;
}

/**
 * Bringt den Daily-State auf den übergebenen Kalendertag. Bei Tageswechsel (oder erstem Aufruf):
 * - 6 neue Dailies ziehen (deterministisch),
 * - Fortschritt der alten Dailies zurücksetzen (deren repeatBaseline = aktueller Zählerstand →
 *   die neuen/erneuten Dailies starten bei 0; verfallene Dailies werden nicht weiter angerechnet),
 * - claimed-Flags der neuen Auswahl auf false.
 * Idempotent: gleicher Tag → keine Änderung. Gibt true zurück, wenn neu gezogen wurde.
 */
export function refreshDailyQuests(state: GameState, content: ContentDB, day: number): boolean {
  if (state.quests.daily.day === day && state.quests.daily.quests.length > 0) return false;

  // Clock-Cheat-Bremse (Security-Härtung r1, V2.1/V5.6): Der Tages-Stempel kommt vom Client
  // (lokale Systemuhr) — ein Spieler kann die Uhr vorstellen, neue Dailies ziehen + claimen,
  // dann ZURÜCKstellen und beliebig oft re-rollen/pumpen. Harte Monotonie-Schranke: ein Tag,
  // der RÜCKWÄRTS hinter den zuletzt gesehenen Tag springt, löst KEINEN Reset/keine neue
  // Auswahl aus (kein neuer Reward-Zugang, kein Streak-Pump). Defensiv auch nicht-endliche
  // Tage abweisen. Vorwärts-Reset (echter Tageswechsel) läuft normal.
  const last = state.stats.lastDailyDay;
  if (!Number.isFinite(day) || (last > 0 && day < last)) return false;

  // Daily-Streak fortschreiben: aufeinanderfolgende Kalendertage zählen, eine Lücke setzt zurück.
  // Erster Tag überhaupt (lastDailyDay === 0) → Streak startet bei 1; folgt der neue Tag direkt auf
  // den letzten → +1; ansonsten Reset auf 1. Idempotent über die `day`-Schranke oben (gleicher Tag
  // läuft nie zweimal durch). Quelle für `daily_streak`-Achievements. Da Rückwärts-Sprünge oben
  // bereits abgewiesen sind, kann der Streak nur bei echtem Vorwärts-Fortschritt wachsen.
  if (last === 0) {
    state.stats.dailyStreak = 1;
  } else if (day === nextCalendarDay(last)) {
    state.stats.dailyStreak += 1;
  } else {
    state.stats.dailyStreak = 1;
  }
  state.stats.lastDailyDay = day;

  // Welle Z2: Vergabe mit Progressions-Filter + Mix-Garantie (state-Pfad). Greift NUR hier —
  // die bereits im Save liegende Tagesauswahl (state.quests.daily) bleibt unangetastet.
  const picks = pickDailyQuests(content, day, 0, state);
  const entries: DailyQuestEntry[] = picks.map((q) => ({ questId: q.id, claimed: false }));

  // Baseline jeder neuen Daily auf den aktuellen Zählerstand setzen → Fortschritt startet bei 0.
  for (const q of picks) {
    const baseline: Record<number, number> = {};
    q.objectives.forEach((o, i) => {
      baseline[i] = rawProgress(state, content, o);
    });
    state.quests.repeatBaseline[q.id] = baseline;
    // Aus der claimbar-Liste nehmen (frischer Tag = noch nicht erfüllt).
    const ci = state.quests.completed.indexOf(q.id);
    if (ci >= 0) state.quests.completed.splice(ci, 1);
  }

  state.quests.daily = { day, quests: entries };
  return true;
}

/** Ist diese Daily heute bereits eingelöst? */
export function isDailyClaimed(state: GameState, questId: string): boolean {
  return state.quests.daily.quests.find((d) => d.questId === questId)?.claimed ?? false;
}

// ───────────────────────────────────────────────────────────────────────────
// Quest-Tokens (Task #271, SAVE_VERSION 56): Zweit-Währung analog Gold. Gutschrift beim
// Quest-Claim (`QuestDef.tokenReward`); Ausgabe im kommenden Token-Shop über `spendQuestTokens`.
// ───────────────────────────────────────────────────────────────────────────

/** Aktueller Quest-Token-Stand (Getter für die UI — analog `state.character.gold`). */
export function questTokenBalance(state: GameState): number {
  return state.character.questTokens;
}

/**
 * Gibt `amount` Quest-Tokens aus (für den kommenden Token-Shop). Validiert defensiv:
 * `amount` muss eine endliche, positive GANZE Zahl sein und der Bestand muss reichen —
 * sonst `false`, State unverändert (kein Teil-Abzug, kein Negativ-Saldo). `true` = abgebucht.
 */
export function spendQuestTokens(state: GameState, amount: number): boolean {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return false;
  if (amount <= 0 || !Number.isInteger(amount)) return false;
  if (state.character.questTokens < amount) return false;
  state.character.questTokens -= amount;
  return true;
}

/**
 * Stabile Fehlschlag-Codes für den Quest-Token-Belohnungs-Shop (Chef-GO 25.08.2026 (1.1.0),
 * design/rezension-patch-2026-08-25.html #p13 — Regale nach Kapitel; Muster `SlayerShopReason`,
 * slayer.ts): sprachneutral & deterministisch testbar; die UI rendert `t("quests.shop.reason." + code)`.
 *  - `not_found`           Keine `tokenShop`-Angebots-ID (oder Item/Bündelgröße defekt) — Content-Fehler.
 *  - `shelf_locked`        Das Regal des Angebots (`TokenShopOffer.shelfId`) verlangt eine Chronik-
 *                          Kapitel-Quest, die noch nicht abgeschlossen ist (s. `isShelfOpen`).
 *  - `not_enough_tokens`   Quest-Tokens reichen nicht (`spendQuestTokens` scheitert).
 *  - `no_space`            Bündel passt weder ins Inventar noch (Auto-Bank) ins Lager — Tokens
 *                          wurden zurückerstattet (No-Loss-Rollback, unverändert seit Task #284).
 */
export type TokenShopReason = "not_found" | "shelf_locked" | "not_enough_tokens" | "no_space";

export interface TokenShopResult {
  ok: boolean;
  reason?: TokenShopReason;
}

/**
 * Ist das Regal `shelfId` HEUTE offen? Exakt dasselbe Gate-Muster wie `isZoneUnlocked` (zones.ts),
 * nur auf `content.tokenShopShelves` statt `content.zones` gelesen — dieselbe Kapitel-Kette
 * (`ZoneDef.requiresQuest`/`TokenShopShelf.requiresQuest` tragen oft dieselbe Quest-ID). true, wenn
 *  (a) `shelfId` fehlt (Angebot ohne Regal-Zuordnung → gilt als offenes Start-Regal), ODER
 *  (b) `content.tokenShopShelves` fehlt/leer ist (defensiv offen — Alt-Content/Tests ohne Regale
 *      bleiben unverändert kaufbar), ODER
 *  (c) das Regal unbekannt ist (defensiv offen — dieselbe Content-Lücken-Haltung wie isZoneUnlocked,
 *      der Wiring-Guard sichert echte Referenzen), ODER
 *  (d) das Regal kein `requiresQuest` trägt (das offene Start-Regal), ODER
 *  (e) die Gate-Quest abgeschlossen ist: `quests.claimed` ODER `quests.completed` — der Story-Beat
 *      zählt, nicht der Klick auf „Einlösen" (bewusst großzügiger als die requires-Kette der Quests).
 * Rein & deterministisch, kein RNG, kein State-Schreibzugriff. Lesehelfer für Kauf-Gate + UI-Anzeige.
 */
export function isShelfOpen(state: GameState, content: ContentDB, shelfId: string | undefined): boolean {
  if (!shelfId) return true;
  const shelves = content.tokenShopShelves;
  if (!shelves || shelves.length === 0) return true;
  const shelf = shelves.find((s) => s.id === shelfId);
  const req = shelf?.requiresQuest;
  if (!req) return true;
  return state.quests.claimed.includes(req) || state.quests.completed.includes(req);
}

/**
 * Kauft ein Angebot aus dem Quest-Token-Belohnungs-Shop (`content.tokenShop`, Task #284; Regal-Gate
 * #p13): prüft zuerst das Regal-Gate (`isShelfOpen`), bucht dann `tokenCost` Tokens ab (via
 * `spendQuestTokens` — validiert Bestand/Ganzzahl) und liefert das Item-BÜNDEL (`qty` Stück) ins
 * Inventar; Überlauf wandert per `addItemOrBank` ins Lager (Auto-Bank-Muster wie Combat-Loot).
 * KEIN Teil-Verlust: passt das Bündel nicht VOLLSTÄNDIG (Inventar voll + Auto-Bank aus/Bank voll),
 * wird alles zurückgerollt und die Tokens erstattet (Muster `buyBack`, shop.ts). Rein & deterministisch.
 * Rückgabe wie `buySlayerShopItem` (slayer.ts): `{ ok, reason? }` statt nacktem `boolean`, damit
 * die UI zwischen „Regal gesperrt" und „kein Platz" unterscheiden kann.
 */
export function buyTokenShopOffer(state: GameState, content: ContentDB, offerId: string): TokenShopResult {
  const offer = content.tokenShop?.find((o) => o.id === offerId);
  if (!offer) return { ok: false, reason: "not_found" };
  // Defensiv gegen fehlerhafte Content-Daten: Item muss existieren, qty positive Ganzzahl.
  if (!content.items[offer.itemId]) return { ok: false, reason: "not_found" };
  if (!Number.isInteger(offer.qty) || offer.qty <= 0) return { ok: false, reason: "not_found" };
  if (!isShelfOpen(state, content, offer.shelfId)) return { ok: false, reason: "shelf_locked" };
  if (!spendQuestTokens(state, offer.tokenCost)) return { ok: false, reason: "not_enough_tokens" };
  const { toInventory, toBank } = addItemOrBank(state, content, offer.itemId, offer.qty);
  const delivered = toInventory + toBank;
  if (delivered < offer.qty) {
    // Rollback (kein Teilkauf → kein Verlust): Inventar- und Bank-Anteil zurücknehmen, Tokens erstatten.
    if (toInventory > 0) removeItem(state.inventory, offer.itemId, toInventory);
    if (toBank > 0) {
      const rest = (state.bank[offer.itemId] ?? 0) - toBank;
      if (rest > 0) state.bank[offer.itemId] = rest;
      else delete state.bank[offer.itemId];
    }
    state.character.questTokens += offer.tokenCost;
    return { ok: false, reason: "no_space" };
  }
  return { ok: true };
}

/**
 * Schreibt `amount` Quest-Tokens gut (z.B. für künftige Nicht-Quest-Quellen; der Quest-Claim
 * selbst bucht direkt in `claimQuest`). Ungültige Mengen (≤0, NaN, nicht-ganzzahlig) sind no-op.
 */
export function addQuestTokens(state: GameState, amount: number): number {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return 0;
  if (amount <= 0 || !Number.isInteger(amount)) return 0;
  state.character.questTokens += amount;
  return amount;
}
