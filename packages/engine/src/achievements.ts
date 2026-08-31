import type { AchievementCondition, ContentDB, GameState, ItemId } from "@hearthforge/shared";
import {
  DUNGEON_VARIANT_PREFIX, AP_MILESTONE_STEP_PCT, MASTERY_MAX_LEVEL, apMilestoneTokens, earnedAP, totalAP } from "@hearthforge/shared";
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

// ───────────────────────────────────────────────────────────────────────────
// Achievements 1.2.0 (Chef-Entscheid 27.08.2026, design/achievements-1.2.0/audit.md § 2.5):
// Zähler-Ableitungen für die neuen Bedingungstypen. Alle REIN LESEND aus bestehendem State
// (kein neues Feld, kein SAVE_VERSION-Sprung); wo eine Content-Menge gebraucht wird (Zonen-
// Monster, Turm-Etagen, Kochen-Outputs, Daily-Pool), liefert die Funktion ohne Content defensiv 0
// — der echte Unlock-Pfad `checkAchievements` reicht den Content immer durch.
// ───────────────────────────────────────────────────────────────────────────

/** Paragonturm-ID: hat eine eigene Etagen-Leiter (`paragon_floor`) und zählt NICHT als Dungeon. */
const PARAGON_TOWER_ID = "paragon_tower";

/**
 * Anzahl Content-Monster mit mindestens einem Kill (Bestiarium-Vollständigkeit).
 *
 * OHNE die `dg_`-Dungeon-Varianten — genau wie die Bestiarium-Seite selbst, die sie seit dem
 * Dungeon-Rework herausfiltert (BestiaryPage.tsx). Ihre Kills laufen auf die Basis-Id
 * (`killCreditMonsterId`), ihr eigener Zähler bleibt also ewig 0. Solange sie hier mitzählten,
 * konnte „Das ganze Bestiarium" (Ziel: alle 110 Einträge) nie über 105 kommen — derselbe
 * Id-Bruch wie beim Zonen-Bestiarium unten.
 */
function monstersDiscovered(state: GameState, content?: ContentDB): number {
  if (!content) return 0;
  let n = 0;
  for (const id of Object.keys(content.monsters)) {
    if (id.startsWith(DUNGEON_VARIANT_PREFIX)) continue;
    if ((state.monsterKills[id] ?? 0) >= 1) n++;
  }
  return n;
}

/**
 * Zonen-Bestiarium: KLEINSTER Kill-Stand über alle Content-Monster der Zone — inkl. der
 * Nur-Dungeon-Wesen mit eigener Id, aber OHNE die `dg_`-Varianten (Begründung im Rumpf).
 * count 1 = „jedes Wesen besiegt", count 100 = „Zone gemeistert". Zone ohne
 * Monster (oder unbekannt) → 0, damit ein Tippfehler nie einen Gratis-Unlock erzeugt.
 */
function zoneBestiaryMin(state: GameState, zoneId: string, content?: ContentDB): number {
  if (!content) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const m of Object.values(content.monsters)) {
    if (m.zone !== zoneId) continue;
    // Spieler-Report 31.08.2026 (FR, 1.2.3): „Crypt achievement is bugged ... I have defeated all
    // the crypt monsters more than 100 times, but my tracker remains stuck at 0/1 and 0/100."
    //
    // Die Zone `crypt` fuehrt fuenf Dungeon-Varianten (`dg_skeleton_*`) als eigene Monster mit
    // `zone: "crypt"`. Kills darauf werden aber bewusst unter der BASIS-Id verbucht
    // (combat.ts `killCreditMonsterId` schneidet `dg_` ab, damit Varianten-Beute im Bestiarium des
    // Grundmonsters landet) — `monsterKills["dg_skeleton_warrior"]` bleibt also fuer immer 0.
    // Da dieser Erfolg das MINIMUM ueber alle Zonen-Monster nimmt, war er unerfuellbar, egal wie
    // oft der Spieler die Krypta geraeumt hat. Betroffen war genau eine Zone: crypt (geprueft ueber
    // alle zehn Zonen), was zur Meldung passt, dass alle anderen Erfolge sauber zaehlen.
    //
    // Dungeon-Varianten sind skalierte Kopien desselben Wesens, keine eigene Kreatur der Zone —
    // sie gehoeren hier also ohnehin nicht in die Zaehlung. Derselbe Id-Bruch traf am selben Tag
    // schon den Beutezaehler im Dungeon (s. drops.ts).
    if (m.id.startsWith(DUNGEON_VARIANT_PREFIX)) continue;
    min = Math.min(min, state.monsterKills[m.id] ?? 0);
  }
  return Number.isFinite(min) ? min : 0;
}

/** Anzahl verschiedener Dungeons mit ≥ 1 Clear — ohne Paragonturm; mit Content nur echte Dungeon-IDs. */
function dungeonsDistinct(state: GameState, content?: ContentDB): number {
  const known = content ? new Set(content.dungeons.map((d) => d.id)) : null;
  let n = 0;
  for (const [id, clears] of Object.entries(state.dungeonsCleared)) {
    if (id === PARAGON_TOWER_ID || clears < 1) continue;
    if (known && !known.has(id)) continue;
    n++;
  }
  return n;
}

/** Höchste Slayer-Turm-Etage, auf der der Spieler mindestens ein Wesen erlegt hat (0 = keine). */
function slayerFloorReached(state: GameState, content?: ContentDB): number {
  if (!content) return 0;
  let best = 0;
  for (const m of Object.values(content.monsters)) {
    if (!m.slayerFloor || (state.monsterKills[m.id] ?? 0) < 1) continue;
    best = Math.max(best, m.slayerFloor);
  }
  return best;
}

/** Champion-Kodex: Σ Kills (ohne target) bzw. Kills EINER Variante. Defensiv gegen rohe Alt-States. */
function eliteKills(state: GameState, variantId?: string): number {
  const codex = state.eliteCodex ?? {};
  if (variantId) return codex[variantId]?.kills ?? 0;
  let sum = 0;
  for (const e of Object.values(codex)) sum += e.kills;
  return sum;
}

/** Anzahl Champion-Varianten mit `field ≥ 1` (kills → „alle Champions", uniques → „Trophäenhalle"). */
function eliteVariantsWith(state: GameState, field: "kills" | "uniques", content?: ContentDB): number {
  const codex = state.eliteCodex ?? {};
  let n = 0;
  for (const [id, e] of Object.entries(codex)) {
    if (content?.elites && !content.elites[id]) continue; // verwaiste Variante zählt nicht
    if (e[field] >= 1) n++;
  }
  return n;
}

/** New Haven: Σ Gebäude-Stufen (ohne target) bzw. Stufe EINES Gebäudes. `camp` fehlt bei rohen Alt-States. */
function campLevels(state: GameState, buildingId?: string): number {
  const buildings = state.camp?.buildings ?? {};
  if (buildingId) return buildings[buildingId] ?? 0;
  let sum = 0;
  for (const lvl of Object.values(buildings)) sum += lvl;
  return sum;
}

/** New Haven: Anzahl gebauter Gebäude (Stufe ≥ 1). */
function campBuildingsBuilt(state: GameState): number {
  let n = 0;
  for (const lvl of Object.values(state.camp?.buildings ?? {})) if (lvl >= 1) n++;
  return n;
}

/** Anzahl Aktionen mit Meisterschafts-Level ≥ MASTERY_MAX_LEVEL (mit Content nur echte Aktions-IDs). */
function masteryMaxed(state: GameState, content?: ContentDB): number {
  let n = 0;
  for (const [actionId, st] of Object.entries(state.mastery)) {
    if (content && !content.actions[actionId]) continue;
    if (levelFromXp(st.xp) >= MASTERY_MAX_LEVEL) n++;
  }
  return n;
}

/** Kleinstes Skill-Level über alle Content-Skills („Alleskönner": alle ≥ 50/75). Ohne Content über state.skills. */
function minSkillLevel(state: GameState, content?: ContentDB): number {
  const ids = content ? Object.keys(content.skills) : Object.keys(state.skills);
  if (ids.length === 0) return 0;
  let min = Number.POSITIVE_INFINITY;
  for (const id of ids) min = Math.min(min, levelFromXp(state.skills[id]?.xp ?? 0));
  return Number.isFinite(min) ? min : 0;
}

/**
 * Anzahl VERSCHIEDENER Daily-Quests, die je einmal abgeholt wurden. `quests.claimed` trägt jede
 * (auch wiederholbare) Quest-ID genau einmal (quests.ts claimQuest pusht nur, wenn noch nicht enthalten).
 */
function dailiesDistinct(state: GameState, content?: ContentDB): number {
  if (!content) return 0;
  const daily = new Set(content.quests.filter((q) => q.daily).map((q) => q.id));
  let n = 0;
  for (const id of state.quests.claimed) if (daily.has(id)) n++;
  return n;
}

/** Σ gekochter Portionen = craftedById über alle Loot-Outputs von Kochen-Aktionen. */
function foodCooked(state: GameState, content?: ContentDB): number {
  if (!content) return 0;
  const outputs = new Set<ItemId>();
  for (const a of Object.values(content.actions)) {
    if (a.skill !== "cooking") continue;
    for (const roll of a.loot) outputs.add(roll.itemId);
  }
  let sum = 0;
  for (const id of outputs) sum += state.stats.craftedById[id] ?? 0;
  return sum;
}

/** Anzahl entdeckter Runen-Items (`ItemDef.rune` gesetzt) im monotonen Erst-Besitz-Marker. */
function runesDiscovered(state: GameState, content?: ContentDB): number {
  if (!content) return 0;
  let n = 0;
  for (const id of Object.keys(state.discoveredItems ?? {})) {
    if (content.items[id]?.rune) n++;
  }
  return n;
}

/** Anzahl aktuell bepflanzter Beete. */
function farmPlotsPlanted(state: GameState): number {
  let n = 0;
  for (const p of state.farmPlots ?? []) if (p.cropId !== null) n++;
  return n;
}

/**
 * Roher (absoluter) Zählerstand einer Achievement-Bedingung — gelesen aus BEREITS VORHANDENEN
 * State-Zählern (plus den neuen `goldSpent`/`dungeonsCleared`/`dailyStreak`). KEIN neuer
 * Event-Hook (Muster aus quests.ts `rawProgress`). Auch für die UI als Fortschrittswert nutzbar.
 *
 * `content` ist optional, weil die meisten Zähler rein aus dem State lesbar sind; Typen, die eine
 * Content-Menge brauchen (sets_completed, monsters_discovered, zone_bestiary, slayer_floor,
 * dailies_distinct, food_cooked, runes_discovered), liefern ohne Content defensiv 0 (der echte
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
      // Mit target (Achievements 1.2.0, Chronik-Kapitel): 1/0 — „Kapitel abgeschlossen" heißt
      // ABGEHOLT (`claimed`), nicht nur Objectives erfüllt (`completed`), damit der Erfolg exakt
      // mit dem Kapitel-Popup/der Belohnung zusammenfällt. Ohne target wie bisher: Anzahl.
      return cond.target ? (state.quests.claimed.includes(cond.target) ? 1 : 0) : state.quests.claimed.length;
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
    // ── Achievements 1.2.0 (§ 2.5) — rein lesend aus bestehendem State ──────────────────
    case "monsters_discovered":
      return monstersDiscovered(state, content);
    case "zone_bestiary":
      return cond.target ? zoneBestiaryMin(state, cond.target, content) : 0;
    case "dungeons_distinct":
      return dungeonsDistinct(state, content);
    case "slayer_tasks":
      return state.slayerTasksCompleted ?? 0;
    case "slayer_streak":
      return state.slayerStreak ?? 0;
    case "slayer_floor":
      return slayerFloorReached(state, content);
    case "elite_kills":
      return eliteKills(state, cond.target);
    case "elite_variants":
      return eliteVariantsWith(state, "kills", content);
    case "elite_uniques":
      return eliteVariantsWith(state, "uniques", content);
    case "camp_levels":
      return campLevels(state, cond.target);
    case "camp_buildings":
      return campBuildingsBuilt(state);
    case "mastery_maxed":
      return masteryMaxed(state, content);
    case "min_skill_level":
      return minSkillLevel(state, content);
    case "dailies_distinct":
      return dailiesDistinct(state, content);
    case "bank_slots":
      return state.bankSlotsPurchased ?? 0;
    case "food_cooked":
      return foodCooked(state, content);
    case "runes_discovered":
      return runesDiscovered(state, content);
    case "farm_plots_planted":
      return farmPlotsPlanted(state);
    case "deaths":
      return state.stats.deaths;
    case "play_hours":
      // Aktive Spielzeit (ohne Offline-Catch-up), volle Stunden. `activePlayMs` ist monoton (sanitize
      // klemmt nur nach oben auf elapsedMs) — ein Meilenstein kann also nie „zurückfallen".
      return Math.floor((state.activePlayMs ?? 0) / 3_600_000);
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
 * als gültige Defs erhalten und werden nie doppelt aufgenommen. Entfernte IDs (Achievements 1.2.0:
 * Kill-Tripel, Skill-Stufen 10/20/30/40/60/70/80, ach_total_level_2079 → ach_total_level_1980)
 * bleiben im Save harmlos stehen (earnedAP zählt nur IDs mit Def; nie neu angelegt).
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
