import type { AchievementCondition, ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { AP_MILESTONE_STEP_PCT, apMilestoneTokens, earnedAP, totalAP } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";

/**
 * Vereinigung aller Basis-Item-IDs, die der Spieler IRGENDWO besitzt: getragene Ausrüstung
 * (`equipment` + `equippedInstances.baseItemId`), Inventar-Slots (Stacks) + Instanz-Tasche
 * (`inventory.instances.baseItemId`), die stackbare Bank (`bank`-Keys) und der Gear-Vault
 * (`bankInstances.baseItemId`). Rein lesend, deterministisch. Für die Besitz-Auswertung von
 * `sets_completed` (vollständig BESESSENE Sets, nicht nur getragene).
 * (Taschenslots entfielen mit Task #271 — `bagSlots` ist post-Migration immer leer.)
 */
function ownedItemIds(state: GameState): Set<ItemId> {
  const owned = new Set<ItemId>();
  for (const id of Object.values(state.character.equipment)) {
    if (id) owned.add(id);
  }
  for (const inst of Object.values(state.character.equippedInstances)) {
    if (inst) owned.add(inst.baseItemId);
  }
  for (const slot of state.inventory.slots) {
    if (slot) owned.add(slot.itemId);
  }
  // Instanz-Tasche (v53): non-stackable Instanzen liegen nicht mehr in `slots`, sondern hier.
  for (const inst of state.inventory.instances) owned.add(inst.baseItemId);
  for (const id of Object.keys(state.bank)) owned.add(id);
  for (const inst of state.bankInstances) owned.add(inst.baseItemId);
  return owned;
}

/**
 * Anzahl distinkter Sets, die der Spieler VOLLSTÄNDIG BESITZT — d. h. ALLE Teile (`pieces`)
 * eines Sets sind irgendwo im Besitz (siehe `ownedItemIds`). Bewusst NICHT „gleichzeitig
 * getragen" (das wäre durch die Slot-Anzahl auf ~3 gedeckelt und machte `sets_completed_5/_10`
 * unerreichbar). Ohne Content defensiv 0.
 */
function ownedSetsCount(state: GameState, content?: ContentDB): number {
  if (!content) return 0;
  const owned = ownedItemIds(state);
  // Distinkte VOLLSTÄNDIG besessene Sets. Mehrere Set-Defs können sich EXAKT dieselben Teile teilen —
  // die Slayer-Breakpoints (`slayer_set` / `slayer_set_4pc` mit identischer `pieces`-Liste) sind zwei
  // Defs, aber physisch EIN Set. Ohne Dedup zählte der Besitz der 4 Slayer-Teile +2, wodurch
  // `ownedSetsCount` die Zahl distinkter Sets überschreitet (30 statt 29) und „Master of All Sets"
  // (ach_sets_all, count = distinkte Sets) mit einem fehlenden Nicht-Slayer-Set erreichbar wäre.
  // Dedup über die kanonische (sortierte) Teile-Signatur zählt identische-Teile-Sets als eins.
  const completed = new Set<string>();
  for (const set of content.sets) {
    if (set.pieces.length > 0 && set.pieces.every((p) => owned.has(p))) {
      completed.add([...set.pieces].sort().join("|"));
    }
  }
  return completed.size;
}

/** Summe aller Dungeon-Clears (über alle Dungeon-IDs). */
function totalDungeonsCleared(state: GameState): number {
  let sum = 0;
  for (const n of Object.values(state.dungeonsCleared)) sum += n;
  return sum;
}

/**
 * Roher (absoluter) Zählerstand einer Achievement-Bedingung — gelesen aus BEREITS VORHANDENEN
 * State-Zählern (plus den neuen `goldSpent`/`dungeonsCleared`/`dailyStreak`). KEIN neuer
 * Event-Hook (Muster aus quests.ts `rawProgress`). Auch für die UI als Fortschrittswert nutzbar.
 *
 * `content` ist optional, weil die meisten Zähler rein aus dem State lesbar sind; nur `sets_completed`
 * braucht den Content (Set-Definitionen). Ohne Content liefert dieser Typ defensiv 0 (der echte
 * Unlock-Pfad `checkAchievements` reicht den Content immer durch).
 */
export function achievementProgress(
  state: GameState,
  cond: AchievementCondition,
  content?: ContentDB,
): number {
  switch (cond.type) {
    case "skill_level":
      return cond.target ? levelFromXp(state.skills[cond.target]?.xp ?? 0) : 0;
    case "total_level":
      return state.character.totalLevel;
    case "monster_kills":
      return cond.target ? (state.monsterKills[cond.target] ?? 0) : 0;
    case "total_kills":
      return state.stats.kills;
    case "items_gathered":
      return state.stats.itemsGathered;
    case "items_crafted":
      return cond.target ? (state.stats.craftedById[cond.target] ?? 0) : state.stats.itemsCrafted;
    case "quests_completed":
      return state.quests.claimed.length;
    case "gold_reached":
      return state.character.gold;
    case "gold_spent":
      return state.stats.goldSpent;
    case "items_discovered":
      // MONOTONE Wahrheit (Welle LL, Fun-Retest collection-pip BUG P2): dieselbe Quelle wie
      // Bestiarium/Wiki — `discoveredItems` (Erst-Besitz-Marker, SAVE 58, wird NIE entfernt).
      // Vorher zählte hier eine Besitz-Union (seenDrops ∪ Inventar ∪ Bank), die durch VERKAUF
      // sinken konnte — Collection-Fortschritt darf nie fallen. Alt-Saves holen dadurch beim
      // ersten checkAchievements ggf. Collection-Achievements nach (korrekt & erwünscht).
      // Defensiv `?? {}` (Muster paragon?.best) — post-Migration existiert das Feld immer.
      return Object.keys(state.discoveredItems ?? {}).length;
    case "dungeons_cleared":
      return cond.target ? (state.dungeonsCleared[cond.target] ?? 0) : totalDungeonsCleared(state);
    case "daily_streak":
      return state.stats.dailyStreak;
    case "pets_owned":
      // Anzahl besessener Pets. `ownedPets` ist ein Record<PetId, true> (nur Besitz wird
      // eingetragen), daher entspricht die Schlüsselzahl direkt der Sammlungsgröße.
      return Object.keys(state.character.ownedPets).length;
    case "sets_completed":
      // Anzahl distinkter Sets, die der Spieler VOLLSTÄNDIG BESITZT (alle Teile irgendwo im
      // Besitz: Equipment + Instanzen + Inventar + Taschen + Bank + Gear-Vault). Bewusst NICHT
      // „gleichzeitig getragen" — das war durch die Slot-Anzahl auf ~3 gedeckelt und machte
      // ach_sets_completed_5/_10 mathematisch unerreichbar (29 Sets existieren).
      return ownedSetsCount(state, content);
    case "paragon_floor":
      // Prestige-Rekord des Paragonturms (Welle JJ, A3-Voraussetzung): höchste JEMALS
      // abgeschlossene Etage. Bewusst `best` statt `checkpoint` — der Tod-Reset (checkpoint → 0)
      // darf ein einmal verdientes Achievement nie wieder „unerreicht" zeigen (best ist strikt
      // monoton, sanitize erzwingt best ≥ checkpoint). Defensiv gegen rohe Alt-States ohne
      // paragon-Feld (Muster paragon.ts: dort ??= defaultParagonState()).
      return state.paragon?.best ?? 0;
    default:
      return 0;
  }
}

/** Ist eine einzelne Bedingung erfüllt? */
export function achievementMet(
  state: GameState,
  cond: AchievementCondition,
  content?: ContentDB,
): boolean {
  return achievementProgress(state, cond, content) >= cond.count;
}

/**
 * Prüft alle NOCH NICHT freigeschalteten Achievements gegen die State-Zähler und schaltet
 * neu erfüllte frei (Open-Set: bereits freigeschaltete werden via Set übersprungen — billig
 * pro advance, auch bei ~660 Defs). Gibt die in diesem Aufruf neu freigeschalteten IDs zurück.
 *
 * Save-kompatibel: `state.achievements` bleibt ein string[]; alte IDs (ach_kills_10 …) bleiben
 * als gültige Defs erhalten und werden nie doppelt aufgenommen.
 */
export function checkAchievements(state: GameState, content: ContentDB): string[] {
  const unlocked = new Set(state.achievements);
  const newly: string[] = [];
  for (const a of content.achievements) {
    if (unlocked.has(a.id)) continue;
    if (achievementMet(state, a.condition, content)) {
      state.achievements.push(a.id);
      unlocked.add(a.id);
      newly.push(a.id);
    }
  }
  // AP-Meilensteine am selben Choke-Point (SAVE 66, Welle GG): läuft bewusst UNGEGATED (nicht nur
  // bei newly > 0), damit ein Alt-Save seine bereits verdiente Quote beim ERSTEN Check nachholt —
  // zum Load-Zeitpunkt schaltet ja kein Achievement mehr neu frei. Billig (zwei lineare Pässe über
  // die Defs pro advance-Runde, nicht pro Tick) und RNG-frei.
  checkApMilestones(state, content);
  return newly;
}

/**
 * AP-Meilenstein-Vergabe (Welle GG/collection-pip P1, SAVE_VERSION 66): bei jedem vollen
 * 5-%-Schritt der Gesamt-AP-Quote (earnedAP/totalAP, content-getrieben) gibt es EINMALIG
 * Quest-Tokens nach der Staffel `AP_MILESTONE_TOKENS` (shared). Eigenschaften:
 *  - IDEMPOTENT: vergebene Schritte stehen in `claimedApMilestones` und werden nie erneut gezahlt.
 *  - NACHHOLEND: ein Alt-Save mit 60 % Quote bekommt beim ersten Check die Schritte 5..60 auf
 *    einmal — als EIN Breadcrumb-Stapel (`lastApMilestone.steps`), damit die UI sie bündeln kann.
 *  - CONTENT-WACHSTUMS-FEST: sinkt die Quote, weil neue Achievements dazukommen, bleiben bereits
 *    vergebene Schritte vergeben (claimed-Liste, KEIN Neuberechnen/Rückzug).
 *  - Schwellen-Vergleich in GANZZAHL-Arithmetik (earned·100 ≥ step·total statt Float-Division),
 *    damit exakte Quoten (z. B. 7/20 = 35 %) nicht an IEEE-754-Rundung scheitern.
 *  - 100 % setzt zusätzlich das Zeremonie-Flag `apCeremonyPending` (UI feiert groß, quittiert false).
 *  - `seq` kommt aus dem monotonen `apMilestoneSeq` (NIE aus dem nullbaren Breadcrumb — Welle DD).
 * Rückgabe: die in diesem Aufruf neu vergebenen Schritte (leer = nichts Neues). RNG-frei.
 */
export function checkApMilestones(state: GameState, content: ContentDB): number[] {
  const total = totalAP(content);
  if (total <= 0) return [];
  const earned = earnedAP(state, content);
  const claimed = new Set(state.claimedApMilestones);
  const newly: number[] = [];
  let tokens = 0;
  for (let step = AP_MILESTONE_STEP_PCT; step <= 100; step += AP_MILESTONE_STEP_PCT) {
    if (earned * 100 < step * total) break; // Schritt (noch) nicht erreicht — höhere erst recht nicht
    if (claimed.has(step)) continue;
    state.claimedApMilestones.push(step);
    newly.push(step);
    tokens += apMilestoneTokens(step);
  }
  if (newly.length === 0) return newly;
  state.character.questTokens += tokens;
  state.apMilestoneSeq += 1;
  state.lastApMilestone = { steps: newly, tokens, seq: state.apMilestoneSeq };
  if (newly.includes(100)) state.apCeremonyPending = true;
  return newly;
}
