import type {
  BossPhase,
  CombatEvent,
  CombatState,
  ContentDB,
  DerivedStats,
  DungeonClearSummary,
  DungeonDef,
  EffectCounters,
  ElementalCounters,
  ElementalSideCounters,
  GameState,
  ItemId,
  ItemInstance,
  LootRoll,
  MonsterDef,
  MonsterId,
  PetId,
  RaidWeeklyModifierId,
  RngState,
  SetEffectDef,
  SpecialEffectType,
  StatusEffect,
  StatusType,
  WeaponEffect,
} from "@hearthforge/shared";
import { activeArrow, consumeArrow } from "./quiver"; // claude:2026-10-24T18:20:00+02:00 — Köcher/Pfeile (1.4.0 FK)
import {
  AUTO_EAT_COOLDOWN_MS,
  AUTO_POTION_COOLDOWN_MS,
  AUTO_POTION_MAX_THRESHOLD,
  DMG_ROLL_FLOOR,
  EQUIP_SLOTS,
  STALEMATE_NO_PROGRESS_MS,
  STALEMATE_MIN_PROGRESS_PCT,
  autoEatHealMult,
  effectiveAutoEatThreshold,
  AUTO_EAT_MIN_THRESHOLD,
  AUTO_EAT_MAX_THRESHOLD,
  COMBAT_LOG_MAX,
  createEffectCounters,
  createPetAbilityRuntime,
  DEFAULT_DROP_SUFFIX_CHANCE,
  DEFENSE_MITIGATION_K,
  DEFENSE_MITIGATION_MAX,
  earlyXpMult,
  effectiveWeaponEffects,
  effectiveInstanceWeaponEffects,
  isStatusEffectType,
  FROST_SLOW,
  BLOCK_DAMAGE_REDUCTION,
  LEATHER_HIT_FLOOR,
  MONSTER_ACC_LEVEL_START,
  MONSTER_ACC_PER_LEVEL,
  ONE_SHOT_CAP,
  WARD_KILL_REFILL_PCT,
  WARDING_XP_PER_ABSORB,
  absorbWard,
  consumableHeal,
  castWardRecharge,
  rechargeWard,
  WARD_HIT_DAMPING,
  BOSS_FROST_SLOW_MULT,
  PET_ABILITY_DEBUFF_MS,
  PET_ABILITY_DELAYED_DOT_MS,
  PET_ABILITY_MULTIHIT_COUNT,
  PET_ABILITY_STATUS_MS,
  PET_STEAL_MIN_LOOT_CHANCE,
  petDotMagnitude,
  KILL_COOLDOWN_MS,
  PRE_BOSS_BREATHER_MS,
  MELEE_LIFESTEAL,
  MELEE_LIFESTEAL_CAP_PCT,
  MELEE_LIFESTEAL_CAP_ABS,
  BLOCK_RESTORE_CAP_PCT,
  BLOCK_RESTORE_CAP_ABS,
  COMBAT_XP_BONUS_CAP,
  LOOT_CHANCE_BONUS_CAP,
  MELEE_XP_PER_DAMAGE,
  combatXpLevelMult,
  TICK_MS,
  VITALITY_XP_PER_DAMAGE,
  DMG_MAX_HIT_MULT,
  activeStanceMods,
  STATUS_VS_WARD_MULT,
  BURN_VULNERABILITY,
  FROST_FREEZE_STACKS,
  WIS_FROST_EXTRA_STACK_RESIST,
  FREEZE_IMMUNITY_MS,
  SHOCK_DELAY_MS,
  SHOCK_DELAY_CAP_MS,
  SHOCK_ARC_FRACTION,
  POISON_MAX_STACKS,
  POISON_REGEN_MULT,
  VOID_WEAKEN,
  AETHER_WARD_ON_HIT,
  AETHER_WARD_PIERCE,
  createElementalCounters,
  createElementalSideCounters,
  TALENT_RARE_DROP_MAX_BASE_CHANCE,
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework (Kampf-Fähigkeiten, Glut-Stapel).
  EMBER_MAX_STACKS,
  PET_CRIPPLE_SLOW_MS,
  PET_CRIPPLE_SLOW_PCT,
  PET_EMBER_BRAND_MS,
  PET_EMBER_BRAND_STACK_BONUS,
  PET_EMBER_DETONATE_BURN_MS,
  PET_EMERGENCY_HEAL_BELOW,
  PET_EXECUTE_BLEED_BELOW,
  PET_EXECUTE_BLEED_MULT,
  PET_FROSTBITE_FREEZE_EVERY,
  PET_POISON_SLOW_PCT,
  ARMOR_PEN_CAP, // claude:2026-10-25T05:40:00+02:00 — Offenes Zeughaus (1.4.0 Raid §7): Deckel bleibt
} from "@hearthforge/shared";
import { nextFloat, nextInt } from "./rng";
import { blessingChance, blessingMult, shrineAmplifiedMult } from "./blessing";
// Schrein der Stillen (Chef-Entscheid 2026-08-03): verstärkt seit heute AUCH die Kampf-BEUTE-Segen
// (mistvigil/greed/rotmist) — exakt der bestehende shrineAmplifiedMult-Pfad wie in tick.ts/elites.ts,
// kein zweiter Rechenweg. wildhunt (§attackSpeed) bleibt KOMPLETT ausgenommen (Eiserne Regel 3:
// Kampf-Tempo ist ein Kampfwert, Beute nicht) — s. combatStep-Callsite unten.
import { campShrineBonus } from "./camp";
// Blutmond-Duplikat (Task #337): identische Instanz-Kopie (gleicher Suffix, neue instanceId) über
// denselben Intake-Pfad wie der Erst-Drop (tryCraftSuffix → intakeInstance).
import { intakeInstance, mintInstanceId } from "./enchant";
import { levelFromXp } from "./leveling";
import { activeSetEffects, computeStats } from "./character";
import { combatLevel } from "./dungeon";
import { itemCount, removeItem } from "./inventory";
import { grantLoot } from "./mail";
import { applyConsumableBuff, tickMealKeep, useConsumable } from "./consumable";
import { isHealPotion } from "./consume-gate";
import { familyBestiaryComplete, markDropSeen } from "./drops";
import { talentEffect } from "./talents";
// claude:2026-10-18T12:00:00+02:00 — Narbenbuch (Prestige Welle B2, Auftrag Logic-Dev mit Revier engine/**):
// XP-, Gold- und Schadensfaktoren; jeder ist ohne Ränge exakt 1 (bit-identisch).
import { goldFindMult, prestigeSkillXpMult, talentDamageMult } from "./prestige-effects";
import {
  type ActivePetAbility,
  petCombatAbility,
  petDoubleLootChance,
  petFoodHealMult,
  petKillHealFraction,
  tryPetDrop,
} from "./pets";
// Paragonturm-Andockstellen (dungeon-rework-spec §7, Welle P1 — logic-dev-Modul mit
// EXPLIZITEM GRANT für die drei minimalen Aufrufstellen hier: Monster-Auflösung in combatStep,
// Etagen-Abschluss in onEnemyDefeated, Tod-Reset in onPlayerDefeated + Aufräum-Zeilen in
// stopCombat/trackStalemate). Die gesamte Turm-Logik lebt in paragon.ts.
import { onParagonFloorCleared, paragonCombatMonster, resetParagonOnDeath } from "./paragon";
import { canFightMonster, recordKillForSlayer } from "./slayer";
import { tryCraftSuffix } from "./suffix";
// Elite-/World-Spawns-Andockstellen (design/elite-spawns-concept.md, Phase 1 — logic-dev-Modul mit
// EXPLIZITEM GRANT für die vier minimalen Aufrufstellen hier: Monster-Auflösung in combatStep,
// Kill-Abschluss in onEnemyDefeated, Aufräum-Zeilen in stopCombat/onPlayerDefeated). Die gesamte
// Zyklus-/Kill-Logik lebt in elites.ts.
import { eliteCombatMonster, onEliteKilled } from "./elites";
// claude:2026-10-25T05:40:00+02:00 — Raid-Andockstellen (1.4.0 Welle 4; Modul engine/raid.ts entscheidet, combat.ts ruft): Gegner-
// Auflösung (raidCombatMonster), Phasen-Faktoren, Wochen-Modifikator, Wellen-Kill, Raum-Abschluss, Tod/Patt.
import {
  activeRaidFight,
  onRaidDefeat,
  onRaidMonsterKilled,
  onRaidRoomCleared,
  raidCombatMonster,
  raidDamageFactor,
  raidDefenseFactor,
} from "./raid";

/** Quelle eines Heil-/Absorptions-Events fürs Combat-Log (Task #220). Siehe CombatEvent.source. */
type HealSource = NonNullable<CombatEvent["source"]>;

/**
 * Heilt den Spieler um `amount` HP, gedeckelt auf maxHp. Loggt bei ≥1. Geteilt von Heal-on-Kill
 * und den heilenden Pet-Abilities. `source` (Task #220) taggt das Heil-Event mit seiner Herkunft
 * (kill/effect/lifesteal), damit der Combat-Log/Floating-Text die Quelle zeigen kann.
 */
function healPlayer(state: GameState, maxHp: number, amount: number, source: HealSource): void {
  if (amount <= 0) return;
  const heal = Math.round(amount);
  if (heal <= 0) return;
  if (state.character.hp >= maxHp) return;
  state.character.hp = Math.min(maxHp, state.character.hp + heal);
  pushLog(state.combat, { by: "player", kind: "heal", amount: heal, source });
}

/**
 * Ersatz-Essen, wenn das gewählte Food leer ist. Tränke laufen über den Auto-Trank.
 *
 * claude:2026-10-23T16:30:00+02:00 — 1.4.0 (Chef 23.10.: „Auto-Essen isst nie eine Mahlzeit, außer du legst
 * sie selbst in den Heilplatz“): nur noch REINE Heilnahrung (ohne `buff`), und nicht mehr das erste Feld im
 * Inventar, sondern die passendste Heilmenge: die kleinste Heilung, die die fehlende HP an der Ess-Schwelle
 * deckt; deckt keine, die größte. Gleichstand → Inventar-Reihenfolge (deterministisch). Vorher konnte der
 * Ersatz eine seltene Mahlzeit greifen und sie dauerhaft zum Essen machen.
 */
export function findNextFood(state: GameState, content: ContentDB, maxHp: number): ItemId | null {
  const need = Math.max(1, Math.round(maxHp * (1 - effectiveAutoEatThreshold(state.character))));
  let best: { id: ItemId; heal: number } | null = null;
  let bestCovers = false;
  const seen = new Set<ItemId>();
  for (const slot of state.inventory.slots) {
    const id = slot?.itemId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const item = content.items[id];
    if (
      item?.type !== "consumable" ||
      item.buff ||
      ((item.healAmount ?? 0) <= 0 && (item.healPct ?? 0) <= 0) ||
      isHealPotion(content, id)
    ) {
      continue;
    }
    const heal = consumableHeal(item, maxHp);
    const covers = heal >= need;
    if (
      !best ||
      (covers && !bestCovers) ||
      (covers && bestCovers && heal < best.heal) ||
      (!covers && !bestCovers && heal > best.heal)
    ) {
      best = { id, heal };
      bestCovers = covers;
    }
  }
  return best?.id ?? null;
}

/** Isst automatisch gewähltes Essen, wenn die HP unter die Schwelle fallen. */
function tryAutoEat(state: GameState, content: ContentDB, maxHp: number): void {
  const tier = state.character.autoEatTier ?? 0;
  // Max-Tier: konfigurierbarer Schwellen-Override (Chef-Slider); darunter feste Tier-Schwelle.
  if (state.character.hp > maxHp * effectiveAutoEatThreshold(state.character)) return;
  // Cooldown: ohne ihn würde pro Tick gegessen → man kann nie sterben. Greift der Cooldown noch,
  // wird dieser Tick NICHT gegessen (mehrere harte Treffer in Folge können töten — Chef-Wunsch).
  if ((state.combat.autoEatCooldownMs ?? 0) > 0) return;
  // Spieler-Report-Fix (2026-07-21): läuft das GEWÄHLTE Food leer, AUTOMATISCH auf ein anderes
  // verfügbares Food im Inventar wechseln (statt aufzuhören zu heilen → Tod). Ist keins mehr da,
  // Auswahl leeren (→ die UI zeigt dann kein „totes" Icon eines aufgebrauchten Foods). Nichts
  // gewählt (null) bleibt unverändert — der Spieler wählt bewusst.
  let foodId = state.character.food;
  if (foodId && itemCount(state.inventory, foodId) < 1) {
    foodId = findNextFood(state, content, maxHp);
    state.character.food = foodId;
  }
  if (!foodId) return;
  const foodItem = content.items[foodId];
  if (!foodItem) return;
  // Zentraler Heilbetrag (Hybrid, Balance-Kette Schritt 4): max(healAmount, round(maxHp·healPct))
  // — flat trägt Früh-/Mid-Game, pct das End-Game (EINE Quelle: consumableHeal, shared).
  // autoEatHealMult(tier) bleibt separater Multiplikator (aktuell 1.0 auf allen Stufen).
  const baseHeal = consumableHeal(foodItem, maxHp);
  if (baseHeal <= 0) return;
  // claude:2026-10-18T02:00:00+02:00 — Aschbauch „Feinschmecker" (foodHealBonus, 1.3.0): Essen heilt × (1 + Anteil).
  // Auto-Eat fasst nie Heiltränke an (findNextFood/selectFood); ohne Begleiter Faktor 1 ⇒ bit-identisch.
  const heal = Math.round(baseHeal * autoEatHealMult(tier) * petFoodHealMult(state, content));
  removeItem(state.inventory, foodId, 1);
  state.combat.autoEatCooldownMs = AUTO_EAT_COOLDOWN_MS;
  state.character.hp = Math.min(maxHp, state.character.hp + heal);
  // source "food" + itemId (Task #220): der Log/Floating-Text zeigt „geheilt durch <Essen>".
  pushLog(state.combat, { by: "player", kind: "heal", amount: heal, source: "food", itemId: foodId });
  // Combo-/Effekt-Food (heilt UND bufft): der Buff wirkt im Auto-Eat-Pfad IDENTISCH zum manuellen
  // Verzehr (useConsumable) — sonst gäbe Auto-Eat dasselbe Item nur halb (heilen ohne Effekt).
  applyConsumableBuff(state, content, foodId);
  // Gift-Heilung ebenfalls identisch zum manuellen Verzehr (run4 P3): heilt das Essen Gift, entfernt
  // Auto-Eat denselben aktiven Poison-DoT wie useConsumable — sonst wäre „Auto-Eat = manuell" gebrochen.
  if (content.items[foodId]?.curesPoison) {
    state.combat.playerEffects = state.combat.playerEffects.filter((e) => e.type !== "poison");
  }
}

/**
 * Läuft gerade ein Heil-über-Zeit-HoT der AUTO-TRANK-PIPELINE (Kurzzeit-Heil-Draught mit
 * `hpRegenPerSec` > 0)? Wertet AUSSCHLIESSLICH echte Consumable-Buffs (`character.buffs`) aus —
 * passiver Gear-Regen ist KEIN Buff und darf den Auto-Trank nicht dauerhaft sperren (ein
 * Regen-Gear-Träger tränke sonst nie). Rein lesend, kein RNG.
 *
 * Trennlinie (Drazhan-Audit Welle F/G 2026-07-13): NUR KATEGORIELOSE Buffs zählen. Die 2–4-s-Heil-
 * HoTs (minor/greater_healing_potion, bloodmend_draught, Task #244) sind laut Task #303 BEWUSST ohne
 * `buff.category` — sie sind Heil-MECHANIK des Auto-Tranks, keine Dauer-Buffs; content-integrity
 * §4.4 erzwingt diese Invariante (jedes andere Buff-Consumable MUSS eine Kategorie tragen). Dauer-
 * Tonika mit Mini-Regen (emberroot/ironbark/panacea/witchlight/gloomspore …, 90–180 s, category
 * "regeneration"/"offense") blockten hier früher den Not-Heiltrank für MINUTEN — genau der Boss-Kipp-
 * Bug aus dem Audit. Kategorisierte Buffs sperren daher NIE, egal wie viel hpRegenPerSec sie tragen.
 */
function hasActiveHotBuff(state: GameState, content: ContentDB): boolean {
  for (const b of state.character.buffs) {
    const buff = content.items[b.itemId]?.buff;
    if (buff?.category) continue; // Dauer-Tonikum (exklusiver Kategorie-Slot) — sperrt den Not-Trank nicht
    if ((buff?.bonus?.hpRegenPerSec ?? 0) > 0) return true;
  }
  return false;
}

/**
 * Auto-Trank (Chef-Feature 2026-07-02, analog tryAutoEat): trinkt den konfigurierten Heiltrank,
 * wenn die HP AUF/UNTER die Trank-Schwelle (`character.autoPotion.healThreshold`) fallen.
 *
 * Verhältnis zu Auto-Eat: beide Systeme prüfen UNABHÄNGIG, mit getrennt konfigurierten Schwellen
 * und getrennten Cooldowns. An jeder Aufrufstelle läuft Auto-Eat ZUERST — hebt dessen Heilung die
 * HP bereits über die Trank-Schwelle, bleibt der Trank im Gürtel (Food = billige Grundversorgung,
 * Trank = der seltene große Schluck).
 *
 * Der Verzehr läuft über die ECHTE Consumable-Logik (`useConsumable`): Heilung + `curesPoison`
 * + evtl. Buff wirken IDENTISCH zum manuellen Trinken (kein „Auto ≠ manuell"-Drift wie einst bei
 * Auto-Eat). Eigener, längerer Cooldown (AUTO_POTION_COOLDOWN_MS) — ohne ihn würde pro Tick
 * getrunken.
 *
 * Chugging-Fix (Task #259): Zusätzlich zum Cooldown wird NICHT nachgetrunken, solange bereits ein
 * Heil-über-Zeit-Buff aktiv ist (HoT-Draughts #244). Ein HoT-Draught heilt nur einen winzigen Sofort-
 * Rest und schiebt den Löwenanteil als `hpRegenPerSec`-Buff über die Zeit — die HP bleiben also nach
 * dem Schluck unter der Schwelle, und ohne diesen Guard würde jeder Cooldown-Ablauf sofort den nächsten
 * Trank verbrennen (nur Buff-Refresh, kein Nutzen). Ziel: EIN Trank pro Bedarf, dann Cooldown/HoT wirken
 * lassen. Deterministisch, kein RNG.
 */
function tryAutoPotion(state: GameState, content: ContentDB, maxHp: number): void {
  const ap = state.character.autoPotion;
  const potionId = ap?.healPotionId;
  if (!potionId) return;
  // Schwelle defensiv auf [0, AUTO_POTION_MAX_THRESHOLD] klemmen (Sweep6 T8-P4-2): eine
  // save-editierte Schwelle 1.0 tränke sonst bei VOLLEN HP (Bedingung „auf/unter" inklusive)
  // alle Cooldown-Fenster einen Trank mit 0 Heilung. sanitizeState härtet nur auf [0,1].
  const threshold = Math.min(AUTO_POTION_MAX_THRESHOLD, Math.max(0, ap.healThreshold));
  if (state.character.hp > maxHp * threshold) return;
  if ((state.combat.autoPotionCooldownMs ?? 0) > 0) return;
  // Chugging-Fix (Task #259): läuft schon ein kategorieloser Kurzzeit-Heil-HoT (HoT-Draught #244),
  // NICHT nachtrinken — die HoT hebt die HP über die Zeit, ein Nachschlag würde nur den Buff
  // refreshen und Tränke verbrennen. EIN Trank pro Bedarf, dann Cooldown/HoT wirken lassen.
  // Dauer-Tonika (buff.category) zählen hier NICHT (Welle G, s. hasActiveHotBuff).
  if (hasActiveHotBuff(state, content)) return;
  // kein Heiltrank (mehr) → no-op. Combat-Feel v2 #0a: healPct-only-Tränke (ohne flachen healAmount)
  // zählen ebenfalls als Heiltrank. Die eigentliche Heilung läuft über useConsumable (consumableHeal).
  const potItem = content.items[potionId];
  if (!potItem || ((potItem.healAmount ?? 0) <= 0 && (potItem.healPct ?? 0) <= 0)) return;
  if (itemCount(state.inventory, potionId) < 1) return;
  const hpBefore = state.character.hp;
  if (!useConsumable(state, content, potionId)) return;
  state.combat.autoPotionCooldownMs = AUTO_POTION_COOLDOWN_MS;
  const healed = state.character.hp - hpBefore;
  if (healed > 0) {
    // source "potion" + itemId (Task #220): der Log/Floating-Text zeigt „geheilt durch <Trank>".
    pushLog(state.combat, {
      by: "player",
      kind: "heal",
      amount: Math.max(1, Math.round(healed)),
      source: "potion",
      itemId: potionId,
    });
  }
}

// `content`: seit #276 nur noch für den Schrein-Bonus gelesen (XP-Pets abgeschafft, Chef-Entscheid
// 2026-08-03 nutzt die Signatur wieder). `nowMs` (Blessings of the Reach, "mistvigil" §xp):
// zentraler Grant-Punkt — JEDE Kampf-XP (Stil-/Vitality-/Warding-/Dungeon-XP) läuft durch addXp,
// ein einziger Multiplikator deckt sie alle ab. RÜCKGABE (Release-Fix 0.3.0, Bot-3 Befund B1):
// die TATSÄCHLICH vergebene XP (nach earlyXpMult/Segen/Schrein) — damit Log-Zeilen den effektiven
// Betrag ausweisen können, ohne die Formel zu duplizieren. Bestehende Aufrufer dürfen den
// Rückgabewert weiterhin ignorieren (vorher `void`).
// `fx` (Runen Tier IV, Chef-Entscheid 25.08.2026, design/runen-tier-iv.html §4.3 Rune der Chronik):
// traegt die Ausruestung das Kind `combatXp`, wird JEDE hier vergebene XP um dessen Anteil
// angehoben (Klemme COMBAT_XP_BONUS_CAP). Genau deshalb sitzt der Faktor hier und nicht nur im
// Kill-Pfad: „alle Kampf-Skills" heisst Stil-, Vitality-, Warding- und Dungeon-XP, und das ist
// exakt die Menge, die durch addXp laeuft. Slayer-XP hat einen eigenen Pfad und bleibt aussen vor.
// Optional, damit Aufrufer ohne fx (heute keiner) bit-identisch bleiben. Kein RNG.
function addXp(
  state: GameState,
  content: ContentDB,
  skillId: string,
  amount: number,
  nowMs?: number,
  fx?: SpecialEffects,
): number {
  const skill = (state.skills[skillId] ??= { xp: 0 });
  // #276: XP-Pets sind ABGESCHAFFT (Chef-Verbot, Spec §4.2) — der frühere petSkillXpMult-Faktor
  // ist ersatzlos entfernt (logic-dev löscht den Stub in pets.ts nach diesem Schritt).
  // Schrein der Stillen (Chef-Entscheid 2026-08-03): verstärkt den BONUS-Anteil des mistvigil-Segens
  // auch im Kampf (1.10 → 1.13 bei Stufe III) — Muster tick.ts skillingStep. Ohne nowMs bzw. an
  // Nicht-mistvigil-Tagen ist die Basis 1 und shrineAmplifiedMult lässt sie unverändert
  // (bit-identisch zum Vorher-Zustand, kein RNG).
  // claude:2026-10-18T12:00:00+02:00 — Narbenbuch (Lehrjahre/Handgedächtnis): letzter Faktor, ohne Ränge 1.
  const granted =
    amount
    * earlyXpMult(levelFromXp(skill.xp))
    * shrineAmplifiedMult(blessingMult(nowMs, "xp"), campShrineBonus(state, content))
    * combatXpEffectMult(fx)
    * prestigeSkillXpMult(state, content, skillId, skill.xp);
  skill.xp += granted;
  // Encounter-XP-Akkumulator für die Kill-Summary (`lastKill.xpBySkill`): sammelt die TATSÄCHLICH
  // vergebene XP (nach allen Multiplikatoren) je Skill seit dem Spawn des aktuellen Gegners. Wird
  // beim Kill in `lastKill` übernommen und geleert (beginKillCooldown) bzw. bei jedem Kampf-Ende
  // verworfen. Kein RNG, rein additiv → Determinismus unberührt.
  const acc = (state.combat.encounterXp ??= {});
  acc[skillId] = (acc[skillId] ?? 0) + granted;
  return granted;
}

/**
 * OSRS-Fix (Task #197): Verteidigung (`defence`/`magic_def`) trainiert NICHT mehr durchs
 * Getroffen-/Getroffenwerden. Wählt der Spieler die Defensiv-Stance, routet der AUSGETEILTE Schaden
 * seine Offense-XP auf `defence` (Melee/Fernkampf) bzw. `magic_def` (Magie) — zentral über
 * `activeStanceMods().xpSkill` in `activeOffenseSkill`/`grantOffenseXp`. Ein früherer Pfad vergab
 * Defence-XP pro erlittenem Treffer/DoT (passives Tanken eines High-Level-Mobs = Gratis-Defence);
 * der ist bewusst entfernt. Vitality bleibt unverändert (härtet weiter beim Ein- UND Austeilen ab).
 */

export function createCombat(): CombatState {
  return {
    monsterId: null,
    enemyHp: 0,
    playerTimerMs: 0,
    enemyTimerMs: 0,
    kills: 0,
    eventCount: 0,
    enemyEffects: [],
    playerEffects: [],
    log: [],
    dungeonId: null,
    encounterIndex: 0,
    petAbility: createPetAbilityRuntime(),
  };
}

/**
 * Setzt die GEGNER-gerichteten Pet-Ability-Debuffs zurück (neuer Gegner = frische Schleife).
 * Spieler-Schild und Trigger-Timer bleiben über Respawns hinweg erhalten (Kontinuität).
 */
function resetEnemyPetDebuffs(cs: CombatState): void {
  cs.petAbility.enemyStunMs = 0;
  cs.petAbility.enemyAccDownMs = 0;
  cs.petAbility.enemyAccDownPct = 0;
  cs.petAbility.enemyVulnMs = 0;
  cs.petAbility.enemyVulnPct = 0;
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0: Tempo-Malus, Frostbiss-Zähler und Diebstahl-Sperre gelten je Begegnung.
  // Die Abklingzeit der Geladen-Fähigkeiten (chargeMs) läuft über Respawns weiter (Kontinuität).
  cs.petAbility.enemySlowMs = 0;
  cs.petAbility.enemySlowPct = 0;
  cs.petAbility.frostBites = 0;
  cs.petAbility.stolenThisEncounter = false;
}

function pushLog(cs: CombatState, event: Omit<CombatEvent, "seq">): void {
  cs.log.push({ ...event, seq: cs.eventCount++ });
  if (cs.log.length > COMBAT_LOG_MAX) cs.log.shift();
}

/** Startet einen Kampf gegen `monsterId`. Stoppt laufendes Sammeln. */
export function startCombat(state: GameState, content: ContentDB, monsterId: MonsterId): boolean {
  const monster = content.monsters[monsterId];
  if (!monster) return false;
  // Slayer-Hard-Block: fehlt das geforderte Slayer-Item, wird der Kampf nicht betreten
  // (UI zeigt „benötigt: <Item>"). Monster ohne Anforderung → immer true (unverändert).
  if (!canFightMonster(state, content, monsterId)) return false;
  // Nur-Dungeon-Monster (Dungeon-Rework-Spec §5.1.2/§5.3): kein Direktstart — die vier Idol-Monster
  // (u.a.) existieren nur noch als Dungeon-Wellen (der last_idol-Kill IST der Endboss-Kill nach dem
  // ganzen Lauf, Leitplanke 3). Dungeon-Wellen laufen über startDungeon/onEnemyDefeated und bleiben
  // unberührt. Fehlend/false ⇒ heutiges Verhalten (Alt-Content unverändert). Slayer-Welt-Task-Pool-
  // und UI-Filter liegen bei logic-dev/ui-dev (§6 Welle 1/4).
  if (monster.dungeonOnly) return false;
  // Eine laufende Aktion mit ENDLICHEM Mengen-Ziel wandert mit ihrem Rest an die Queue-Front,
  // statt still zu verschwinden (Chef-Report 25.08.2026: "hat mir einen ganzen Auftrag aus der
  // Queue geloescht" — Direktstart aus dem Bestiarium, vorbei an `insertQueueEntryAtFront`, das
  // genau diese Rueckstellung macht). Hier an der Wurzel, damit JEDER Aufrufer sicher ist.
  // Bewusst nur endliche Ziele: eine endlose Aktion beim manuellen Kampfstart abzulegen ist ein
  // Aktivitaetswechsel, kein Verlust — und die Sims starten Kaempfe direkt ohne Queue-Kenntnis,
  // ihre Queue wuerde sonst bei jedem Tod um einen Eintrag wachsen.
  if (
    state.activeActionId !== null &&
    typeof state.actionTarget === "number" &&
    state.actionTarget > 0 &&
    content.actions[state.activeActionId]
  ) {
    if (!Array.isArray(state.actionQueue)) state.actionQueue = [];
    state.actionQueue.unshift({ kind: "action", actionId: state.activeActionId, target: state.actionTarget });
  }
  state.activeActionId = null;
  // Invariante `activeActionId === null => actionTarget === null`: bisher blieb das Ziel der
  // geraeumten Aktion hier haengen.
  state.actionTarget = null;
  state.actionProgressMs = 0;
  state.lastStop = null;
  state.stunMs = 0;
  state.combat = {
    monsterId,
    enemyHp: monster.maxHp,
    // Gegner-Ward-Init (Combat-Depth §3.2): frischer Voll-Pool je Encounter (kein Regen). Melee/Range-
    // Gegner (wardCapacity 0/undefined) ⇒ 0 ⇒ der Ward-Schritt in strikeEnemy ist ein No-op.
    enemyWard: monster.wardCapacity ?? 0,
    playerTimerMs: 0,
    enemyTimerMs: 0,
    kills: 0,
    eventCount: 0,
    enemyEffects: [],
    playerEffects: [],
    log: [],
    dungeonId: null,
    encounterIndex: 0,
    petAbility: createPetAbilityRuntime(),
    // Kill-Cooldown-Übernahme (Queue-Variante „beginnt erst nach Ablauf"): ein manueller startCombat
    // bricht einen laufenden Kill-Cooldown NICHT ab (sonst klickt man ihn weg). Der neue Gegner steht
    // sofort im State (UI zeigt ihn), aber der Kampf ruht, bis der Rest-Cooldown abgelaufen ist.
    // `lastKill` wandert mit (die Summary bleibt bis zum Ablauf sichtbar). Läuft KEIN Cooldown, sind
    // beide Felder undefined → Verhalten wie bisher (sofortiger Kampfbeginn).
    cooldownRemainingMs: state.combat.cooldownRemainingMs,
    lastKill: state.combat.lastKill,
    // Clear-Zeremonie-Vertrag (SAVE 83, s. CombatState.lastDungeonClear): eine Queue-Kette
    // Dungeon-Clear → Kampf-Eintrag startet im selben Tick — die Summary wandert mit.
    lastDungeonClear: state.combat.lastDungeonClear,
  };
  // Ward-Init (Rüstungs-Trinität §1.4): der Stoff-Held startet jeden Kampf mit vollem Ward-Pool
  // (analog hp/mana). computeStats ist rein/deterministisch — der frische Wert deckt auch einen
  // Gear-Wechsel seit dem letzten Kampf ab (sonst bliebe `ward` auf einem veralteten maxWard hängen).
  state.character.ward = computeStats(state, content).maxWard;
  return true;
}

export function stopCombat(state: GameState): void {
  state.combat.monsterId = null;
  // Dungeon-Run-Zustand mit aufräumen (konsistent zu endDungeon/onPlayerDefeated) —
  // sonst bleibt ein Geister-Run (dungeonId/encounterIndex) zurück, der sogar persistiert wird.
  state.combat.dungeonId = null;
  state.combat.encounterIndex = 0;
  // Paragonturm (§7): freiwilliges Verlassen = PAUSE, kein Verlust — nur die aktive Etage
  // schließen; der Checkpoint (state.paragon) bleibt unangetastet („Weiter ab Etage N").
  state.combat.paragonFloor = undefined;
  // Elite-/World-Spawns: freiwilliges Verlassen räumt NUR den Kampf-Zeiger. Kein Belohnungs-/
  // Despawn-Sonderfall hier — die Zone bleibt „Aktiv" (der Elite ist ja nicht besiegt) und läuft im
  // nächsten Tick regulär weiter (Fenster tickt herunter/despawnt bei Ablauf wie ohne den Besuch).
  state.combat.eliteVariantId = undefined;
  state.combat.stopReason = undefined; // manueller Stopp = kein Auto-Grund
  state.combat.encounterXp = undefined; // Begegnung vorbei → XP-Akkumulator verfällt
  state.combat.effectCounters = undefined; // Spezial-Effekt-Zähler resetten bei Kampfende (§2.3.4)
  state.combat.elemental = undefined; // Elementar-Zähler (Frost/Schock/Gift) verfallen bei Kampfende
  resetBossPhase(state.combat); // claude:2026-10-25T05:50:00+02:00 — Bossphasen-Zustand verfällt bei Kampfende
  // BEWUSST NICHT geleert: cooldownRemainingMs + lastKill. Der Kill-Cooldown gilt IMMER — Stop+Start
  // darf ihn nicht überspringen (startCombat übernimmt den Rest). Außerhalb des Kampfs ruht er
  // eingefroren (combatStep läuft nicht) und läuft beim nächsten Kampfstart zu Ende. Seit Sweep6
  // T7-F1 gilt das auch über Save/Load: cooldownRemainingMs wird persistiert (nur die lastKill-
  // Summary ist transient) — vorher war der Reload die einzige Cooldown-Skip-Lücke.
}

/** Wählt das Essen für die Auto-Heilung (null = keins). */
export function selectFood(state: GameState, content: ContentDB, itemId: ItemId | null): void {
  if (itemId === null) {
    state.character.food = null;
    return;
  }
  const item = content.items[itemId];
  // Combat-Feel v2 #0a: auch healPct-only-Food (ohne flachen healAmount) ist gültiges Auto-Eat-Food.
  if (item?.type === "consumable" && ((item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0)) {
    state.character.food = itemId;
  }
}

/**
 * Mahlzeit-Platz wählen (1.4.0, claude:2026-10-23T16:30:00+02:00). Nur Mahlzeiten (Buff der Kategorie
 * "food") sind gültig; null leert den Platz. Ein ungültiges Item lässt die Wahl unverändert.
 */
export function selectMeal(state: GameState, content: ContentDB, itemId: ItemId | null): void {
  if (itemId === null) {
    state.character.meal = null;
    return;
  }
  const item = content.items[itemId];
  if (item?.type === "consumable" && item.buff?.category === "food") state.character.meal = itemId;
}

/** „Mahlzeit halten“ an/aus (kostenlos, Chef 23.10.). claude:2026-10-23T16:30:00+02:00 */
export function setMealKeep(state: GameState, on: boolean): void {
  state.character.mealKeep = on;
}

/**
 * Kandidaten für den Mahlzeit-Picker: alle Mahlzeiten aus Inventar und Bank (inkl. Lager),
 * dedupliziert, Inventar zuerst. Rein lesend. claude:2026-10-23T16:30:00+02:00
 */
export function eligibleMeals(state: GameState, content: ContentDB): ItemId[] {
  const out: ItemId[] = [];
  const seen = new Set<ItemId>();
  const consider = (id: ItemId | undefined | null) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    const it = content.items[id];
    if (it?.type === "consumable" && it.buff?.category === "food") out.push(id);
  };
  for (const slot of state.inventory.slots) consider(slot?.itemId);
  for (const id of Object.keys(state.bank)) if ((state.bank[id] ?? 0) > 0) consider(id);
  return out;
}

// ── Auto-Trank: Engine-API für die UI (Settings + Trank-Erkennung) ──────────

// Heiltrank-Erkennung (`isHealPotion`) + Konsum-Abklingzeit wohnen seit dem Exploit-Fix 1.0.1 in
// consume-gate.ts — gemeinsame Quelle für die Auto-Pfade HIER und den manuellen Verzehr in
// consumable.ts (ohne Import-Zyklus combat.ts ↔ consumable.ts). Re-Export: die öffentliche
// Engine-API (`isHealPotion` aus @hearthforge/engine) bleibt unverändert.
export { isHealPotion } from "./consume-gate";

/**
 * Alle Heiltränke im Inventar (Kandidaten für den UI-Trank-Picker), dedupliziert in
 * Inventar-Slot-Reihenfolge. Rein lesend, kein RNG.
 */
export function eligibleHealPotions(state: GameState, content: ContentDB): ItemId[] {
  const seen = new Set<ItemId>();
  const out: ItemId[] = [];
  for (const slot of state.inventory.slots) {
    if (!slot || slot.qty < 1 || seen.has(slot.itemId)) continue;
    if (!isHealPotion(content, slot.itemId)) continue;
    seen.add(slot.itemId);
    out.push(slot.itemId);
  }
  return out;
}

/** Wählt den Auto-Heiltrank (null = aus). Analog selectFood: nur echte Heiltränke werden übernommen. */
export function selectHealPotion(state: GameState, content: ContentDB, itemId: ItemId | null): void {
  if (itemId === null) {
    state.character.autoPotion.healPotionId = null;
    return;
  }
  if (isHealPotion(content, itemId)) state.character.autoPotion.healPotionId = itemId;
}

/**
 * Setzt die HP-Schwelle (Anteil), auf/unter der der Auto-Heiltrank getrunken wird — geklemmt auf
 * [0, AUTO_POTION_MAX_THRESHOLD] (Sweep6 T8-P4-2: Schwelle 1.0 hieße „trinke auch bei vollen HP").
 */
export function setAutoPotionThreshold(state: GameState, threshold: number): void {
  if (!Number.isFinite(threshold)) return;
  state.character.autoPotion.healThreshold = Math.min(AUTO_POTION_MAX_THRESHOLD, Math.max(0, threshold));
}

/** Konfigurierbare Auto-Eat-Schwelle (Chef-Slider, nur beim Max-Tier wirksam — siehe
 *  effectiveAutoEatThreshold). Wert = HP-Anteil (0..1), geklemmt auf [MIN, MAX]. */
export function setAutoEatThreshold(state: GameState, threshold: number): void {
  if (!Number.isFinite(threshold)) return;
  state.character.autoEatThreshold = Math.min(AUTO_EAT_MAX_THRESHOLD, Math.max(AUTO_EAT_MIN_THRESHOLD, threshold));
}

/** Schaltet das automatische Nachtrinken abgelaufener Buff-Tonika an/aus (Kampf UND Skilling). */
export function setAutoRebuffTonics(state: GameState, enabled: boolean): void {
  // codex:2026-08-02T16:20:00+02:00 — Aktivieren ist nur nach dem persistenten Kauf erlaubt;
  // Ausschalten bleibt immer möglich. So kann kein UI-/Save-Pfad die Goldsenke umgehen.
  state.character.autoPotion.autoRebuffTonics = enabled && state.character.autoPotion.autoRebuffUnlocked;
}

interface AttackProfile {
  accuracy: number;
  /**
   * Schadensspanne des Angriffs (Waffen 2.0 §1.3): NON-Crits rollen uniform in der MITIGIERTEN
   * Spanne [min..max]; Krits bleiben am MITTEL verankert (×critDamage). Spieler: attackDamageMin/Max
   * aus computeStats. Monster: Legacy-Spanne aus dem flachen `damage` (DMG_MAX_HIT_MULT/DMG_ROLL_FLOOR),
   * bis Content Monster-Spannen liefert.
   */
  damageMin: number;
  damageMax: number;
  critChance: number;
  critDamage: number;
  /** eagleEye u.ä.: dieser Angriff ist — falls er trifft — garantiert kritisch. */
  forceCrit?: boolean;
}

interface DefendProfile {
  evasion: number;
  defense: number;
}

interface AttackResult {
  hit: boolean;
  crit: boolean;
  damage: number;
  /**
   * effDef-Mitigationsanteil (0..DEFENSE_MITIGATION_MAX) dieses Schlags. `damage` ist bereits
   * post-Mitigation; `reduction` erlaubt dem Aufrufer, den Roh-Schaden vor der Mitigation und den
   * geschluckten Betrag fürs Combat-Log zu rekonstruieren (Task #220, kein zusätzlicher RNG-Draw).
   * Bei einem Fehltreffer 0.
   */
  reduction: number;
}

// ── Spezial-Waffeneffekte (Waffen 2.0, itemization-parity-fix §2) ────────────

/**
 * Aggregierte Spezial-Effekte je Kind. Quelle: ALLE ausgerüsteten Slots (Waffe, Offhand-Totems
 * mit packLeader, Rüstungs-Chase mit thorns), instanz-bewusst (Enchant-Procs). Status-Procs
 * (burn/…) bleiben davon getrennt Mainhand-Sache (`applyWeaponEffects`). GLEICHE Kinds aus
 * mehreren Quellen stapeln NICHT — die stärkste Magnitude gewinnt (§2.3-konservativ); AUSNAHME (Spieler-Report
 * 28.08.2026, Chef-GO): die flachen Kill-Rückflüsse healOnKill/wardOnKill/cooldownOnKill SUMMIEREN sich über alle
 * Quellen (Armschützer +4 LP und Klinge +2 LP = +6 LP je Kill), weil ein Spieler zwei Flats erwartbar addiert;
 * VERSCHIEDENE Kinds stapeln frei und wirken multiplikativ auf den Einzelschlag (§2.3.3).
 */
type SpecialEffects = Partial<Record<SpecialEffectType, WeaponEffect>>;

/**
 * Flache Kill-Rückflüsse: `magnitude` UND `durationMs` addieren sich über alle Quellen (s. Kopfkommentar).
 * healOnKill/wardOnKill tragen ihren Wert in `magnitude`, cooldownOnKill seinen ms-Abzug in `durationMs`
 * (magnitude dort 0) — der Kill-Pfad liest je Kind genau dieses Feld (Revision 29.08.2026: die Summe
 * addierte nur magnitude, Waffe + Handschuhe kürzten den Cooldown daher nicht gemeinsam).
 */
const ADDITIVE_KILL_FLATS: ReadonlySet<SpecialEffectType> = new Set<SpecialEffectType>(["healOnKill", "wardOnKill", "cooldownOnKill"]);

/** Sammelt die Spezial-Effekte der aktuellen Ausrüstung. Rein lesend, kein RNG. */
export function collectSpecialEffects(state: GameState, content: ContentDB): SpecialEffects {
  const fx: SpecialEffects = {};
  const c = state.character;
  for (const slot of EQUIP_SLOTS) {
    const itemId = c.equipment[slot];
    if (!itemId) continue;
    const item = content.items[itemId];
    if (!item) continue;
    const inst = c.equippedInstances?.[slot];
    // Schneller Ausstieg: ohne Effekt-Felder UND ohne Instanz (Enchant-Proc) gibt es nichts zu lesen.
    if (!item.weaponEffect && !item.weaponEffects && !inst) continue;
    const effects =
      inst && inst.baseItemId === itemId
        ? effectiveInstanceWeaponEffects(inst, item, content)
        : effectiveWeaponEffects(item);
    for (const e of effects) {
      const kind = e.type;
      if (isStatusEffectType(kind)) continue;
      const existing = fx[kind];
      if (existing && ADDITIVE_KILL_FLATS.has(kind)) {
        fx[kind] = {
          ...existing,
          magnitude: existing.magnitude + e.magnitude,
          durationMs: Math.max(0, existing.durationMs) + Math.max(0, e.durationMs),
        };
      } else if (!existing || e.magnitude > existing.magnitude) fx[kind] = e;
    }
  }
  return fx;
}

/** Trägt die Ausrüstung überhaupt Spezial-Effekte? (Fast-Path: Alt-Content = immer false.) */
function hasSpecialEffects(fx: SpecialEffects): boolean {
  for (const _k in fx) return true;
  return false;
}

/**
 * combatXp (Rune der Chronik, Runen Tier IV §4.3): Multiplikator auf jede Kampf-XP, 1 ohne das
 * Kind. Magnitude ist der Bonus-ANTEIL (0.10 = +10 %), auf COMBAT_XP_BONUS_CAP geklemmt und nie
 * negativ. Ueber Quellen hinweg gilt wie bei allen Kinds MAX (collectSpecialEffects), vier Ringe
 * mit der Rune zaehlen also einmal.
 */
function combatXpEffectMult(fx: SpecialEffects | undefined): number {
  const e = fx?.combatXp;
  if (!e) return 1;
  return 1 + Math.min(COMBAT_XP_BONUS_CAP, Math.max(0, e.magnitude));
}

/**
 * lootChance (Rune der Nachlese, Runen Tier IV §4.3): Multiplikator auf die Chance JEDES Eintrags
 * einer regulaeren Kill-Loot-Tabelle, 1 ohne das Kind. Klemme LOOT_CHANCE_BONUS_CAP. Wirkt nur auf
 * den Vergleichswert des bestehenden nextFloat-Wurfs (Muster rareDropMult), nie auf die Zahl der
 * Wuerfe. Elite-Uniques (eigener eliteRng-Strom) und Dungeon-Truhen/-Abschluss bleiben unberuehrt
 * (§9 Frage 4, Option A).
 */
function lootChanceEffectMult(fx: SpecialEffects | undefined): number {
  const e = fx?.lootChance;
  if (!e) return 1;
  return 1 + Math.min(LOOT_CHANCE_BONUS_CAP, Math.max(0, e.magnitude));
}

/** Transiente Spezial-Effekt-Zähler des laufenden Kampfs (lazy angelegt; NIE persistiert). */
function effectCounters(cs: CombatState): EffectCounters {
  return (cs.effectCounters ??= createEffectCounters());
}

// ── Elementar-Effekte (Chef-GO 28.08.2026, design/elementar-status-konzept.md) ────────────────
// Eine Identität je Element, SYMMETRISCH für beide Seiten (Waffen-Status → Gegner, Monster-inflict →
// Spieler): Glut (burn), Einfrieren (frost), Verzögerung + Überspringen (shock), Stapel + halbierter
// Unterhalt (poison), Entzug (void). Zähler/Immunitäten leben transient in `cs.elemental`.

/** Seite = ZIEL eines Status (auf wem er liegt). */
type Side = "player" | "enemy";

/** Transiente Elementar-Zähler beider Seiten (lazy angelegt; NIE persistiert). */
function elementalCounters(cs: CombatState): ElementalCounters {
  return (cs.elemental ??= createElementalCounters());
}

/** Elementar-Zähler EINER Seite (lazy). */
function sideCounters(cs: CombatState, side: Side): ElementalSideCounters {
  return elementalCounters(cs)[side];
}

/** Gegnerwechsel (Respawn/Welle): nur die GEGNER-Zähler frisch — der Spieler behält seine (sein Status läuft weiter). */
function resetEnemyElemental(cs: CombatState): void {
  if (cs.elemental) cs.elemental.enemy = createElementalSideCounters();
}

function hasStatus(effects: StatusEffect[], type: StatusType): boolean {
  return effects.some((e) => e.type === type);
}

/** Glut: ein brennendes Ziel nimmt BURN_VULNERABILITY mehr Schaden aus ALLEN Quellen. 1 ohne Brand (bit-identisch). */
function burnVulnMult(targetEffects: StatusEffect[]): number {
  return hasStatus(targetEffects, "burn") ? 1 + BURN_VULNERABILITY : 1;
}

/** Entzug: ein entkräfteter Angreifer macht VOID_WEAKEN weniger Schaden. 1 ohne void. */
function voidWeakenMult(attackerEffects: StatusEffect[]): number {
  return hasStatus(attackerEffects, "void") ? 1 - VOID_WEAKEN : 1;
}

/** Gift: Regeneration und Lebensraub des vergifteten Ziels × POISON_REGEN_MULT. 1 ohne Gift. */
function poisonSustainMult(targetEffects: StatusEffect[]): number {
  return hasStatus(targetEffects, "poison") ? POISON_REGEN_MULT : 1;
}

/**
 * Schock: schiebt den nächsten Angriff der Seite `side` um SHOCK_DELAY_MS nach hinten (Timer zurück,
 * darf negativ werden — die Verzögerung ist dann exakt SHOCK_DELAY_MS, egal in welcher Timer-Phase der
 * Proc fällt; der Load-Pfad klemmt Timer auf ≥ 0, ein Mid-Fight-Save verliert also höchstens den Rest
 * der Kette). Kette: aufsummiert bis SHOCK_DELAY_CAP_MS, endet mit dem nächsten AUSGEFÜHRTEN Angriff
 * der Seite (Reset in combatStep). Liefert die tatsächlich hinzugefügten ms (0 am Deckel). Loggt die
 * Verzögerung als status-Event mit `amount` = ms (kind "status", status "shock"; der Renderer zeigt
 * heute „erleidet Schock", die Klartext-Keys combat.shockDelay* liegen für die UI bereit). Kein RNG.
 * `resist` (Weisheits-Status-Widerstand, nur Spieler-Seite): Verzögerung je Anwendung UND Ketten-
 * Deckel × (1 − resist) — „schwächer" heißt bei Schock kürzer (Spec §3). Gegner: immer 0.
 */
function delayNextAttack(cs: CombatState, side: Side, resist = 0): number {
  const c = sideCounters(cs, side);
  const scale = 1 - resist;
  const add = Math.round(Math.min(SHOCK_DELAY_MS * scale, Math.max(0, SHOCK_DELAY_CAP_MS * scale - c.shockDelayMs)));
  if (add <= 0) return 0;
  c.shockDelayMs += add;
  if (side === "enemy") cs.enemyTimerMs -= add;
  else cs.playerTimerMs -= add;
  pushLog(cs, { by: side === "enemy" ? "player" : "enemy", kind: "status", amount: add, status: "shock" });
  return add;
}

/**
 * Gemeinsamer Nachlauf JEDER Status-Anwendung (beide Seiten, Symmetrie-Pflicht): Log der Anwendung
 * plus die elementare Zusatzregel des Typs.
 *  - frost: Anwendungen in Folge zählen; die FROST_FREEZE_STACKS-te friert ein (`frozen`: der nächste
 *    fällige Angriff der Seite fällt aus), danach FREEZE_IMMUNITY_MS Immunität (Anwendungen zählen nicht).
 *  - shock: jede Anwendung = Verzögerung (delayNextAttack); die Verzögerungs-Zeile ersetzt die
 *    Status-Zeile (sonst zwei Zeilen je Proc). Am Ketten-Deckel bleibt die reine Status-Zeile.
 *  - poison: Stapel +1 bis POISON_MAX_STACKS (Schaden je Tick × Stapel); jeder weitere Stapel loggt eine
 *    Status-Zeile mit `amount` = Stapelzahl (UI kann „Gift ×3" zeigen).
 *  - burn/bleed/void: nur die Status-Zeile bei Erst-Anwendung (Glut/Entzug sind passive Multiplikatoren).
 * `by` = Verursacher-Seite (Gegner-Status ⇒ "player", Spieler-Status ⇒ "enemy"), wie bisher.
 * `resist` = Weisheits-Status-Widerstand des ZIELS (Zauberreserve und Weisheit, Chef-GO 28.08.2026):
 * nur die Spieler-Seite trägt ihn (Monster haben keine Weisheit) — Schock verzögert kürzer, Frost
 * braucht ab WIS_FROST_EXTRA_STACK_RESIST eine Anwendung mehr zum Einfrieren. Dauer/Magnitude der
 * DoTs skaliert bereits der Aufrufer (applyMonsterInflict).
 */
function onStatusApplied(
  cs: CombatState,
  side: Side,
  type: StatusType,
  isNew: boolean,
  resist = 0,
  // claude:2026-10-25T05:40:00+02:00 — Gift-Stapel-Deckel (Schleichende Seuche 4/5: 7 auf dem Gegner, Spec §6.1); sonst POISON_MAX_STACKS.
  poisonMaxStacks = POISON_MAX_STACKS,
): void {
  const by: Side = side === "enemy" ? "player" : "enemy";
  if (type === "shock") {
    if (delayNextAttack(cs, side, resist) <= 0 && isNew) pushLog(cs, { by, kind: "status", amount: 0, status: type });
    return;
  }
  if (type === "poison") {
    const c = sideCounters(cs, side);
    const stacks = Math.min(poisonMaxStacks, (isNew ? 0 : Math.max(1, c.poisonStacks)) + 1);
    const grew = stacks !== c.poisonStacks;
    c.poisonStacks = stacks;
    if (isNew) pushLog(cs, { by, kind: "status", amount: 0, status: type });
    else if (grew) pushLog(cs, { by, kind: "status", amount: stacks, status: type });
    return;
  }
  if (isNew) pushLog(cs, { by, kind: "status", amount: 0, status: type });
  // claude:2026-10-18T02:00:00+02:00 — Glut-Stapel (1.3.0): jede Brand-Anwendung von Spielerseite (Waffe, Verzauberung,
  // Begleiter) legt einen Stapel auf den GEGNER, bis EMBER_MAX_STACKS. Ohne Eigenwirkung (Glut bleibt
  // flach BURN_VULNERABILITY); nur emberBrand/emberDetonate lesen die Stapel. Kein RNG.
  if (type === "burn" && side === "enemy") {
    const c = sideCounters(cs, side);
    c.emberStacks = Math.min(EMBER_MAX_STACKS, (c.emberStacks ?? 0) + 1);
  }
  if (type === "frost") {
    const c = sideCounters(cs, side);
    if (c.freezeImmunityMs > 0) return; // immun: Anwendungen zählen nicht
    c.frostStacks += 1;
    const freezeStacks = FROST_FREEZE_STACKS + (resist >= WIS_FROST_EXTRA_STACK_RESIST ? 1 : 0);
    if (c.frostStacks >= freezeStacks) {
      c.frostStacks = 0;
      c.frozen = true;
      c.freezeImmunityMs = FREEZE_IMMUNITY_MS;
    }
  }
}

/**
 * Tick-Nachlauf der Elementar-Zähler einer Seite (nach dem Ablaufen der Effekte): Immunität läuft
 * herunter; ohne aktiven Frost verfällt der Anwendungszähler (die „dritte Anwendung in Folge" muss
 * innerhalb eines Frost-Fensters fallen); ohne aktives Gift verfallen die Stapel. `frozen` bleibt
 * bestehen, bis der nächste fällige Angriff ausfällt. Kein RNG.
 */
function tickElementalSide(cs: CombatState, side: Side, effects: StatusEffect[]): void {
  const c = cs.elemental?.[side];
  if (!c) return;
  if (c.freezeImmunityMs > 0) c.freezeImmunityMs = Math.max(0, c.freezeImmunityMs - TICK_MS);
  if (!hasStatus(effects, "frost")) c.frostStacks = 0;
  if (!hasStatus(effects, "poison")) c.poisonStacks = 0;
  if (!hasStatus(effects, "burn") && c.emberStacks) c.emberStacks = 0; // claude:2026-10-18T02:00:00+02:00 — Glut-Stapel enden mit dem Brand
}

/** Aktive Gift-Stapel einer Seite (≥ 1, solange Gift liegt — ein Alt-Save ohne Zähler zählt als 1 Stapel). */
function poisonStacksOf(cs: CombatState, side: Side): number {
  return Math.max(1, cs.elemental?.[side]?.poisonStacks ?? 0);
}

/**
 * Effektive STATUS-Effekte der Mainhand (Basis + Enchant-Procs) — geteilt von
 * `applyWeaponEffects` (Proc-Anwendung) und `plaguebearer` (Gift-Parameter der Basiswaffe).
 */
function mainhandStatusEffects(state: GameState, content: ContentDB): WeaponEffect[] {
  const weaponId = state.character.equipment.mainhand;
  const item = weaponId ? content.items[weaponId] : undefined;
  const inst = weaponId ? state.character.equippedInstances?.mainhand : undefined;
  const effects =
    inst && inst.baseItemId === weaponId
      ? effectiveInstanceWeaponEffects(inst, item, content)
      : effectiveWeaponEffects(item);
  return effects.filter((e) => isStatusEffectType(e.type));
}

/** Trägt die Mainhand (Basis oder Enchant-Proc) einen Schock-Status? (Überspringen bei Krit, s. strikeEnemy.) */
function weaponHasShock(state: GameState, content: ContentDB): boolean {
  return mainhandStatusEffects(state, content).some((e) => e.type === "shock");
}

// ── Raid: Set-Effekte und Wochen-Modifikatoren (1.4.0 Welle 4, Spec 1.4.0-balance-raid.md §6.1/§7) ─────────────
// claude:2026-10-25T05:40:00+02:00 — Einmal je Tick gesammelt (combatMods). Ohne Stufen-Set und außerhalb des Raids ist es die
// geteilte Konstante NO_COMBAT_MODS, und jeder Zweig unten ist ein No-op (gleiche Rechnung, keine neuen RNG-Züge).

/** Aggregierte Set-Effekte der getragenen Stufen-Sets (Werte §6.1, Spezifikations-Spalte). */
interface SetCombatFx {
  burnDamagePct: number;
  burnDurationMs: number;
  poisonDamagePct: number;
  bleedDamagePct: number;
  fireInterest?: SetEffectDef;
  fireCollection?: SetEffectDef;
  creepingPlague?: SetEffectDef;
  outbreak?: SetEffectDef;
  openWounds?: SetEffectDef;
  bloodToll?: SetEffectDef;
}

/** Kampf-Kontext je Tick: Set-Effekte + Raid (Wochen-Modifikator, Raum-Boss). */
interface CombatMods {
  set: SetCombatFx | null;
  inRaid: boolean;
  modifier: RaidWeeklyModifierId | null;
  raidBossId: MonsterId | null;
  /** Gift-Stapel-Deckel auf dem Gegner (Schleichende Seuche 7, sonst POISON_MAX_STACKS). */
  poisonMaxStacks: number;
  /** Blutungs-Stapel-Deckel auf dem Gegner; 0 = Blutung stapelt nicht (heutige Logik). */
  bleedMaxStacks: number;
}

const NO_COMBAT_MODS: CombatMods = Object.freeze({
  set: null,
  inRaid: false,
  modifier: null,
  raidBossId: null,
  poisonMaxStacks: POISON_MAX_STACKS,
  bleedMaxStacks: 0,
});

/** Gleiche Kinds aus mehreren Stufen/Sets: Prozente und Dauern summieren, bei Mechanik-Kinds gilt der stärkere `value`. */
function collectSetCombatFx(effects: readonly SetEffectDef[]): SetCombatFx | null {
  if (effects.length === 0) return null;
  const s: SetCombatFx = { burnDamagePct: 0, burnDurationMs: 0, poisonDamagePct: 0, bleedDamagePct: 0 };
  for (const e of effects) {
    const v = e.value ?? 0;
    switch (e.kind) {
      case "burnDamagePct":
        s.burnDamagePct += v;
        break;
      case "burnDurationMs":
        s.burnDurationMs += v;
        break;
      case "poisonDamagePct":
        s.poisonDamagePct += v;
        break;
      case "bleedDamagePct":
        s.bleedDamagePct += v;
        break;
      default: {
        const prev = s[e.kind];
        if (!prev || (prev.value ?? 0) < v) s[e.kind] = e;
      }
    }
  }
  return s;
}

/** claude:2026-10-25T05:40:00+02:00 — Set-Effekte + Raid-Kontext dieses Ticks (rein lesend, kein RNG). */
function combatMods(state: GameState, content: ContentDB): CombatMods {
  const set = collectSetCombatFx(activeSetEffects(state, content));
  const raid = state.combat.dungeonId ? activeRaidFight(state, content) : null;
  if (!set && !raid) return NO_COMBAT_MODS;
  return {
    set,
    inRaid: !!raid,
    modifier: raid?.run.modifier ?? null,
    raidBossId: raid?.room.bossId ?? null,
    poisonMaxStacks: set?.creepingPlague ? Math.max(1, Math.round(set.creepingPlague.maxStacks ?? 7)) : POISON_MAX_STACKS,
    bleedMaxStacks: set?.openWounds ? Math.max(1, Math.round(set.openWounds.maxStacks ?? 3)) : 0,
  };
}

/**
 * Dauer eines SPIELER-Status auf dem Gegner nach Set und Woche: Ornat 2/5 Brand +ms, Giftküche Gift ×1,5, Blutfest
 * Blutung ×1,5 (die Spielerseite des Blutfests trägt raidCombatMonster bzw. die Phasen-inflict). Sonst unverändert.
 */
function playerStatusDuration(type: StatusType, durationMs: number, cm: CombatMods): number {
  if (cm === NO_COMBAT_MODS) return durationMs;
  let d = durationMs;
  if (type === "burn" && cm.set && cm.set.burnDurationMs > 0) d += cm.set.burnDurationMs;
  if (type === "poison" && cm.modifier === "poison_kitchen") d = Math.round(d * 1.5);
  if (type === "bleed" && cm.modifier === "blood_feast") d = Math.round(d * 1.5);
  return d;
}

/** Schadensfaktor eines Spieler-DoT-Typs auf dem Gegner (Set 2/5, Offene Wunden, Geliehenes Feuer). 1 ohne Mods. */
function playerDotSetMult(cs: CombatState, type: StatusType, cm: CombatMods): number {
  if (cm === NO_COMBAT_MODS) return 1;
  const set = cm.set;
  if (type === "burn") return (1 + (set?.burnDamagePct ?? 0)) * (cm.modifier === "borrowed_fire" ? 1.1 : 1);
  if (type === "poison") return 1 + (set?.poisonDamagePct ?? 0);
  if (type === "bleed") {
    let m = 1 + (set?.bleedDamagePct ?? 0);
    const stacks = cs.effectCounters?.bleedStacks ?? 0;
    if (set?.openWounds && stacks > 1) m *= 1 + (set.openWounds.value ?? 0) * (stacks - 1);
    return m;
  }
  return 1;
}

/** Per-Tick-Konstanten der Gegner-DoTs (geteilt von tickEnemyEffects und den Set-Einlösungen). */
interface EnemyDotCtx {
  vuln: number;
  poisonStacks: number;
  burnPetMult: number;
  bleedPetMult: number;
  dotMult: number;
  statusVsWardMult: number;
  cm: CombatMods;
}

function enemyDotCtx(
  state: GameState,
  fx: SpecialEffects,
  monster: MonsterDef | undefined,
  petKind: ActivePetAbility["kind"] | undefined,
  talentDmgMult: number,
  cm: CombatMods,
): EnemyDotCtx {
  const cs = state.combat;
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-DoT-Modifikatoren (nur solange das Pet in Platz 1 aktiv ist):
  // Schlackenscheusal (emberBrand): Brand-Ticks × (1 + 0.10 × (Glut-Stapel − 1));
  // Blutbracke (executeBleed): Blutungs-Ticks × 2 unter 50 % Gegner-LP. Ohne Pet Faktor 1 (bit-identisch).
  const burnPetMult =
    petKind === "emberBrand"
      ? 1 + PET_EMBER_BRAND_STACK_BONUS * Math.max(0, (cs.elemental?.enemy.emberStacks ?? 0) - 1)
      : 1;
  const bleedPetMult =
    petKind === "executeBleed" && monster && cs.enemyHp < PET_EXECUTE_BLEED_BELOW * monster.maxHp
      ? PET_EXECUTE_BLEED_MULT
      : 1;
  return {
    // Elementar-Effekte: Glut (brennendes Ziel ×(1+BURN_VULNERABILITY) auf JEDEN DoT-Tick, auch den Brand
    // selbst) und Gift-Stapel (Schaden × Stapel). Ohne Brand/Gift Faktor 1 bzw. Stapel 1 ⇒ bit-identisch.
    vuln: burnVulnMult(cs.enemyEffects),
    poisonStacks: poisonStacksOf(cs, "enemy"),
    burnPetMult,
    bleedPetMult,
    // gutter (Ausweider, §2.1): eigene DoT-Ticks am Gegner (burn/bleed/poison — alle vom Spieler/Pet
    // appliziert) schlagen um +Anteil härter. Kein RNG.
    // claude:2026-10-18T12:00:00+02:00 — Narbenbuch „Narbenfaust" (damagePct): auch eigene DoT-Ticks; ohne Rang ×1.
    dotMult: (fx.gutter ? 1 + Math.max(0, fx.gutter.magnitude) : 1) * talentDmgMult,
    // Status-vs-Ward-Konter (Chef-Design, s. STATUS_VS_WARD_MULT-Doku in shared): TRAIT-basiert auf
    // `wardCapacity > 0` — gilt den GESAMTEN Kampf über, auch nach Ward-Bruch (nicht an den aktuellen
    // Pool-Stand `cs.enemyWard` gekoppelt). DoT-Ticks schlagen unten ohnehin schon direkt auf `enemyHp`
    // durch (umgehen den Ward-Pool bereits vor diesem Fix) — hier NUR der reine Schadens-Mult.
    statusVsWardMult: (monster?.wardCapacity ?? 0) > 0 ? STATUS_VS_WARD_MULT : 1,
    cm,
  };
}

/**
 * Schaden je Sekunde eines Gegner-DoTs: `perSec` = Anzeige-Wert (wie bisher geloggt), `total` = tatsächlicher HP-Schaden
 * je Sekunde (× gutter/Narbenbuch × Status-vs-Ward). Für frost/shock/void null. Die Faktor-Reihenfolge ist die der alten
 * Inline-Rechnung (bit-identisch ohne Set/Raid).
 */
function enemyDotRate(cs: CombatState, ctx: EnemyDotCtx, e: StatusEffect): { perSec: number; total: number } | null {
  if (e.type !== "poison" && e.type !== "burn" && e.type !== "bleed") return null;
  const petMult = e.type === "burn" ? ctx.burnPetMult : e.type === "bleed" ? ctx.bleedPetMult : 1;
  let perSec = e.magnitude * (e.type === "poison" ? ctx.poisonStacks : 1) * ctx.vuln * petMult;
  const setMult = playerDotSetMult(cs, e.type, ctx.cm); // claude:2026-10-25T05:40:00+02:00 — Set 2/5, Offene Wunden, Geliehenes Feuer
  if (setMult !== 1) perSec *= setMult;
  return { perSec, total: perSec * ctx.dotMult * ctx.statusVsWardMult };
}

/** Restschaden eines Gegner-DoTs (Rate × Restdauer) für Eintreibung/Ausbruch/Blutzoll. */
function enemyDotResidual(
  state: GameState,
  content: ContentDB,
  monster: MonsterDef,
  fx: SpecialEffects,
  cm: CombatMods,
  e: StatusEffect,
): number {
  const ctx = enemyDotCtx(state, fx, monster, petCombatAbility(state, content)?.kind, talentDamageMult(state, content), cm);
  const rate = enemyDotRate(state.combat, ctx, e);
  return rate ? rate.total * (Math.max(0, e.remainingMs) / 1000) : 0;
}

/** Zinsfeuer-Stufen (volle Sekunden Brand, gedeckelt). 0 ohne Effekt. */
function fireInterestStacks(cs: CombatState, cm: CombatMods): number {
  const fi = cm.set?.fireInterest;
  if (!fi) return 0;
  return Math.min(Math.max(0, Math.round(fi.maxStacks ?? 8)), Math.floor((cs.effectCounters?.fireInterestMs ?? 0) / 1000));
}

/** Set-Abklingzeiten (Ausbruch, Blutzoll) laufen in Kampf-Ticks, auch in der Kill-Pause. Ohne Zähler ein No-op. */
function tickSetCooldowns(cs: CombatState): void {
  const ec = cs.effectCounters;
  if (!ec) return;
  if ((ec.outbreakCdMs ?? 0) > 0) ec.outbreakCdMs = Math.max(0, (ec.outbreakCdMs ?? 0) - TICK_MS);
  if ((ec.bloodTollCdMs ?? 0) > 0) ec.bloodTollCdMs = Math.max(0, (ec.bloodTollCdMs ?? 0) - TICK_MS);
}

/**
 * Eintreibung (Ornat 5/5, Spec §6.1): jeder `every`-te Zauber (gezählt je Cast) detoniert den Brand: (value + perStack ×
 * Zinsstufen) des Restschadens sofort auf die HP (wie ein DoT, am Ward vorbei), Neuentzündung mit voller Dauer, Zins bleibt;
 * der Ward füllt sich um `wardPct` des Betrags. Ohne Brand auf dem Ziel zählt der Zauber, detoniert aber nichts. Kein RNG.
 */
function tryFireCollection(
  state: GameState,
  content: ContentDB,
  stats: DerivedStats,
  monster: MonsterDef,
  fx: SpecialEffects,
  cm: CombatMods,
): void {
  const fc = cm.set?.fireCollection;
  if (!fc) return;
  const cs = state.combat;
  const ec = effectCounters(cs);
  ec.castCount = (ec.castCount ?? 0) + 1;
  const every = Math.max(1, Math.round(fc.every ?? 5));
  if (ec.castCount % every !== 0 || cs.enemyHp <= 0) return;
  const burn = cs.enemyEffects.find((e) => e.type === "burn");
  if (!burn) return;
  const share = (fc.value ?? 0) + (fc.perStack ?? 0) * fireInterestStacks(cs, cm);
  const dmg = Math.round(enemyDotResidual(state, content, monster, fx, cm, burn) * share);
  // Neuentzündung: volle Dauer des eigenen Brands (Waffe/Pfeil + Katalysator + Set), nie kürzer als der Rest.
  const catalystMs = fx.catalyst ? Math.max(0, fx.catalyst.durationMs) : 0;
  let full = 0;
  for (const e of mainhandStatusEffects(state, content)) if (e.type === "burn") full = Math.max(full, e.durationMs);
  const arrowFx = activeArrow(state, content)?.def.effect;
  if (arrowFx?.type === "burn") full = Math.max(full, arrowFx.durationMs);
  if (full > 0) burn.remainingMs = Math.max(burn.remainingMs, playerStatusDuration("burn", full + catalystMs, cm));
  if (dmg <= 0) return;
  cs.enemyHp -= dmg;
  let restored = 0;
  if ((fc.wardPct ?? 0) > 0 && stats.maxWard > 0) {
    const before = state.character.ward;
    state.character.ward = Math.min(stats.maxWard, before + dmg * (fc.wardPct ?? 0));
    restored = Math.round((state.character.ward - before) * 10) / 10;
  }
  pushLog(cs, {
    by: "player",
    kind: "hit",
    amount: dmg,
    hitKind: "fireCollection",
    ...(restored > 0 ? { wardRestored: restored } : {}),
  });
}

/**
 * Ausbruch (Pirschgewand 5/5) und Blutzoll (Blutschwur 5/5), Spec §6.1: ein GELANDETER Treffer auf ein Ziel mit vollen
 * Stapeln (Stand VOR den Status-Procs dieses Treffers) löst sie aus. Ausbruch: `value` × Gift-Restschaden sofort, Stapel
 * halbieren (7 → 3). Blutzoll: `value` × Blutungs-Restschaden sofort, Heilung `healPct` davon, Blutung erlischt. Beide mit
 * eigener Abklingzeit, beide direkt auf die HP (wie DoTs), ohne XP und ohne RNG.
 */
function trySetDetonations(
  state: GameState,
  content: ContentDB,
  stats: DerivedStats,
  monster: MonsterDef,
  fx: SpecialEffects,
  cm: CombatMods,
): void {
  const set = cm.set;
  if (!set || (!set.outbreak && !set.bloodToll)) return;
  const cs = state.combat;
  if (set.outbreak && cs.enemyHp > 0) {
    const ec = effectCounters(cs);
    const poison = cs.enemyEffects.find((e) => e.type === "poison");
    const stacks = cs.elemental?.enemy.poisonStacks ?? 0;
    if (poison && (ec.outbreakCdMs ?? 0) <= 0 && stacks >= cm.poisonMaxStacks) {
      const dmg = Math.round(enemyDotResidual(state, content, monster, fx, cm, poison) * (set.outbreak.value ?? 1));
      sideCounters(cs, "enemy").poisonStacks = Math.max(1, Math.floor(stacks / 2));
      ec.outbreakCdMs = Math.max(0, set.outbreak.cooldownMs ?? 8000);
      if (dmg > 0) {
        cs.enemyHp -= dmg;
        pushLog(cs, { by: "player", kind: "hit", amount: dmg, hitKind: "outbreak" });
      }
    }
  }
  if (set.bloodToll && cs.enemyHp > 0 && cm.bleedMaxStacks > 0) {
    const ec = effectCounters(cs);
    const bleed = cs.enemyEffects.find((e) => e.type === "bleed");
    if (bleed && (ec.bloodTollCdMs ?? 0) <= 0 && (ec.bleedStacks ?? 0) >= cm.bleedMaxStacks) {
      const dmg = Math.round(enemyDotResidual(state, content, monster, fx, cm, bleed) * (set.bloodToll.value ?? 1));
      cs.enemyEffects = cs.enemyEffects.filter((e) => e.type !== "bleed");
      ec.bleedStacks = 0;
      ec.bloodTollCdMs = Math.max(0, set.bloodToll.cooldownMs ?? 8000);
      if (dmg > 0) {
        cs.enemyHp -= dmg;
        pushLog(cs, { by: "player", kind: "hit", amount: dmg, hitKind: "bloodToll" });
        if (state.character.hp > 0) healPlayer(state, stats.maxHp, dmg * (set.bloodToll.healPct ?? 0), "effect");
      }
    }
  }
}

// ── Bossphasen (1.4.0 Raid R4, Spec §3 Regeln 1–6) ───────────────────────────────────────────────────────────
// claude:2026-10-25T05:40:00+02:00 — Die Phase ist die tiefste erreichte HP-Schwelle (absolut, monoton je Begegnung). Felder,
// die die Phase nicht nennt, fallen auf die (skalierte) Basis zurück. Zustand transient in CombatState.bossPhase*.

/** Phasen absteigend nach Schwelle (je Content-Array gecacht). null ohne Phasen. */
const sortedPhasesCache = new WeakMap<readonly BossPhase[], BossPhase[]>();
function sortedPhases(m: MonsterDef): BossPhase[] | null {
  const p = m.phases;
  if (!p || p.length === 0) return null;
  let sorted = sortedPhasesCache.get(p);
  if (!sorted) {
    sorted = [...p].sort((a, b) => b.atHpPct - a.atHpPct);
    sortedPhasesCache.set(p, sorted);
  }
  return sorted;
}

/** Aktive Phase des laufenden Bosses (undefined in der Basis oder ohne Phasen). */
function currentBossPhase(cs: CombatState, m: MonsterDef): BossPhase | undefined {
  const k = cs.bossPhase ?? 0;
  return k > 0 ? sortedPhases(m)?.[k - 1] : undefined;
}

/**
 * Neuer Gegner (Welle/Respawn): Phasen-Zustand frisch. Mit Phasen explizit 0 (dann gilt jede Schwelle, auch durch
 * overkillCarry beim Spawn, als im Kampf betreten → Schild), ohne Phasen werden vorhandene Felder geräumt.
 */
function resetBossPhase(cs: CombatState, next?: MonsterDef): void {
  if (next && sortedPhases(next)) {
    cs.bossPhase = 0;
    cs.bossPhaseMs = 0;
    cs.bossAttackCount = 0;
  } else if (cs.bossPhase !== undefined || cs.bossPhaseMs !== undefined || cs.bossAttackCount !== undefined) {
    cs.bossPhase = undefined;
    cs.bossPhaseMs = undefined;
    cs.bossAttackCount = undefined;
  }
}

/**
 * Gleicht die Phase mit den aktuellen HP ab und liefert die Gegner-Instanz der aktiven Phase. `resolved` ist die aufgelöste
 * (ggf. Raid-/Paragon-/Elite-skalierte) Instanz ohne Phase. Regeln:
 *  - Fehlt `bossPhase` (nach dem Laden), wird die Phase STILL aus den HP abgeleitet (kein Schild, kein Log; Regel 4).
 *  - Sonst: neu erreichte Schwellen werden betreten; jeder Ward-Schild der übersprungenen Phasen gilt (Regel 2), Schild in %
 *    der skalierten maxHp (Regel 5), Log `phase` je Phase, Patt-Zähler zurück (Regel 3), Rampe/Zähler neu, laufende
 *    Status, gegen die die neue Phase resistent ist, erlöschen.
 *  - Werte: Takt × attackIntervalMult × Rampe, Schaden × damageMult, absolute Rüstung × raidDefenseFactor, regen ersetzt
 *    (skaliert wie der Basis-Regen der Instanz), inflict ersetzt (Stärke × raidDamageFactor, Blutfest-Blutung ×1,5),
 *    resist ersetzt.
 * Ohne Phasen liefert sie `resolved` unverändert (kein Zugriff, keine Allokation).
 */
function syncBossPhase(state: GameState, content: ContentDB, resolved: MonsterDef, cm: CombatMods): MonsterDef {
  const sorted = sortedPhases(resolved);
  if (!sorted) return resolved;
  const cs = state.combat;
  const reached = phasesReachedByHp(sorted, cs.enemyHp, resolved.maxHp);
  if (cs.bossPhase === undefined) {
    cs.bossPhase = reached;
    cs.bossPhaseMs = 0;
    cs.bossAttackCount = 0;
  } else if (reached > cs.bossPhase) {
    let shield = 0;
    for (let k = cs.bossPhase + 1; k <= reached; k++) {
      const ph = sorted[k - 1]!;
      if ((ph.wardShieldPct ?? 0) > 0) shield += (ph.wardShieldPct ?? 0) * resolved.maxHp;
      pushLog(cs, { by: "enemy", kind: "phase", amount: k, phaseKey: ph.logKey });
    }
    if (shield > 0) cs.enemyWard = (cs.enemyWard ?? resolved.wardCapacity ?? 0) + Math.round(shield);
    cs.bossPhase = reached;
    cs.bossPhaseMs = 0;
    cs.bossAttackCount = 0;
    const res = sorted[reached - 1]!.resist;
    if (res && res.length > 0 && cs.enemyEffects.some((e) => res.includes(e.type))) {
      cs.enemyEffects = cs.enemyEffects.filter((e) => !res.includes(e.type));
    }
    resetStalemate(cs);
  }
  return phasedMonster(state, content, resolved, cs.bossPhase > 0 ? sorted[cs.bossPhase - 1] : undefined, cm.modifier);
}

/** Zahl der erreichten Phasen bei diesen HP (Phasen absteigend; erreicht = HP-Anteil ≤ atHpPct). */
function phasesReachedByHp(sorted: readonly BossPhase[], enemyHp: number, maxHp: number): number {
  const frac = maxHp > 0 ? enemyHp / maxHp : 1;
  let reached = 0;
  while (reached < sorted.length && frac <= sorted[reached]!.atHpPct) reached++;
  return reached;
}

/** claude:2026-10-25T05:50:00+02:00 — Gegner-Auflösung des Kampfs: Paragon → Elite → Raid → Content (ohne Phase). */
function resolveCombatMonster(state: GameState, content: ContentDB): MonsterDef | undefined {
  const cs = state.combat;
  if (cs.monsterId === null) return undefined;
  return cs.paragonFloor
    ? paragonCombatMonster(state, content)
    : cs.eliteVariantId
      ? eliteCombatMonster(state, content)
      : (raidCombatMonster(state, content) ?? content.monsters[cs.monsterId]);
}

/** Rein lesend: Instanz einer Phase (s. syncBossPhase, Abschnitt „Werte“). Ohne Phase `resolved` selbst. */
function phasedMonster(
  state: GameState,
  content: ContentDB,
  resolved: MonsterDef,
  phase: BossPhase | undefined,
  modifier: RaidWeeklyModifierId | null,
): MonsterDef {
  if (!phase) return resolved;
  const cs = state.combat;
  let interval = resolved.attackIntervalMs * (phase.attackIntervalMult ?? 1);
  const ramp = phase.intervalRamp;
  if (ramp && ramp.everyMs > 0) {
    const steps = Math.min(Math.max(0, ramp.maxStacks), Math.floor((cs.bossPhaseMs ?? 0) / ramp.everyMs));
    if (steps > 0) interval *= Math.pow(ramp.mult, steps);
  }
  const m: MonsterDef = { ...resolved, attackIntervalMs: interval, damage: resolved.damage * (phase.damageMult ?? 1) };
  if (phase.defense !== undefined) m.defense = Math.round(phase.defense * raidDefenseFactor(state, content));
  if (phase.regen !== undefined) {
    // Phasen-Regen ist ein Normal-Wert: × derselbe Faktor, mit dem die Instanz ihren Basis-Regen skaliert (Raid-Stufe).
    const base = content.monsters[resolved.id];
    const factor =
      base && (base.regen ?? 0) > 0 && resolved.regen !== undefined
        ? resolved.regen / base.regen!
        : base && base.maxHp > 0
          ? resolved.maxHp / base.maxHp
          : 1;
    m.regen = phase.regen * factor;
  }
  if (phase.inflict) {
    const inf = phase.inflict;
    m.inflict = {
      ...inf,
      magnitude: inf.magnitude * raidDamageFactor(state, content),
      durationMs: inf.type === "bleed" && modifier === "blood_feast" ? Math.round(inf.durationMs * 1.5) : inf.durationMs,
    };
  }
  if (phase.resist) m.resist = phase.resist;
  return m;
}

/**
 * claude:2026-10-25T05:50:00+02:00 — Der Gegner, wie der Kampf ihn gerade sieht (rein lesend, kein RNG, keine Mutation): aufgelöst
 * Paragon → Elite → Raid → Content und mit der aktiven Bossphase (`bossPhase`, sonst aus den HP abgeleitet). Für die UI
 * (Raid-HUD, Bossleiste, Gegnerwerte) und Tests. undefined ohne Kampf.
 */
export function combatMonsterView(state: GameState, content: ContentDB): MonsterDef | undefined {
  const resolved = resolveCombatMonster(state, content);
  if (!resolved) return undefined;
  const phase = combatBossPhase(state, content, resolved);
  if (!phase) return resolved;
  const raid = state.combat.dungeonId ? activeRaidFight(state, content) : null;
  return phasedMonster(state, content, resolved, phase.phase ?? undefined, raid?.run.modifier ?? null);
}

/**
 * claude:2026-10-25T05:50:00+02:00 — Aktive Bossphase (1-basiert, 0 = Basis) und ihre Definition; null ohne Phasen-Gegner. Für das
 * Raid-HUD (Bossleiste mit Phasenmarken). Rein lesend; ohne `bossPhase` (nach dem Laden) aus den HP abgeleitet.
 */
export function combatBossPhase(
  state: GameState,
  content: ContentDB,
  resolved: MonsterDef | undefined = resolveCombatMonster(state, content),
): { index: number; phase: BossPhase | null } | null {
  const sorted = resolved ? sortedPhases(resolved) : null;
  if (!resolved || !sorted) return null;
  const k = state.combat.bossPhase ?? phasesReachedByHp(sorted, state.combat.enemyHp, resolved.maxHp);
  return { index: k, phase: k > 0 ? (sorted[k - 1] ?? null) : null };
}

/**
 * Default-Trefferchance, falls accuracy + evasion ≤ 0 ist (sonst NaN durch 0/0).
 * Ein degenerierter Stat-Zustand (beide 0, z.B. korrupter Save / leeres Profil) darf die
 * Treffer-Logik nicht mit NaN vergiften — NaN > x ist immer false, d.h. JEDER Treffer würde
 * landen, und nachgelagerte Rechnungen (enemyHp -= NaN) könnten den Save soft-bricken.
 * 0,5 = neutrale Münze als definierter, endlicher Fallback.
 */
const FALLBACK_HIT_CHANCE = 0.5;
/**
 * Trefferchancen-Boden: selbst extrem hohe Evasion (Suffix-/Gear-Stacking im Endgame) darf NICHT
 * unverwundbar machen — Pendant zu DEFENSE_MITIGATION_MAX. Im Normalspiel bindet er nie
 * (hitChance bleibt deutlich darüber), greift nur gegen Degenerate-Evasion-Builds.
 */
const MIN_HIT_CHANCE = 0.1;

/**
 * Trefferchance des Accuracy-Contests (EINZIGE Formel-Quelle — resolveAttack UND der
 * L5-Kombiboden unten lesen sie, damit beide Schichten garantiert dieselbe Mathematik sehen).
 * Schutz vor 0/0 = NaN (und vor negativen Summen durch defekte Stats): definierter Fallback.
 * Boden via MIN_HIT_CHANCE → keine Unverwundbarkeit durch Evasion-Stacking.
 * EXPORTIERT seit #305 (Kampf-Transparenz-UI liest dieselbe Quelle — keine Renderer-Duplikate).
 */
export function contestHitChance(accuracy: number, evasion: number): number {
  const sum = accuracy + evasion;
  return Math.max(MIN_HIT_CHANCE, sum > 0 ? accuracy / sum : FALLBACK_HIT_CHANCE);
}

/**
 * E2 (design/evasion-tempo-taming-spec.md §3.2, #301): effektive Gegner-Accuracy skaliert ab
 * MONSTER_ACC_LEVEL_START (150) mit dem Monster-Level (+MONSTER_ACC_PER_LEVEL je Level darüber).
 * DAS ist der Level-Gap-Malus auf der richtigen Contest-Seite: ein L245er bringt effektiv
 * 14 + 0.35·95 = 47,25 acc und TRIFFT einen 90er wieder (76–86 %), während ALLE Monster ≤ L150
 * (das gesamte Low/Mid-Game) bit-identisch bleiben. Gilt automatisch für jedes künftige Monster
 * (Skalierungsregel statt Einzelwert-Flickerei). Exportiert für die Guard-Tests (#301 §5.5).
 */
export function enemyEffectiveAccuracy(monster: MonsterDef): number {
  return (
    monster.accuracy + MONSTER_ACC_PER_LEVEL * Math.max(0, monster.level - MONSTER_ACC_LEVEL_START)
  );
}

/**
 * L5-Kombiboden (evasion-tempo-taming-spec NACHTRAG / Red-Team-Audit L5, #301): MIN_HIT_CHANCE
 * muss die KOMBINIERTE Vermeidung (Leder-Dodge × Accuracy-Contest) klemmen, nicht nur EINE
 * Schicht — Contest-Floor (10 %) und Dodge-Cap multiplizierten sich sonst zu einem Boden von nur
 * (1−DODGE_CAP)·10 %. Liefert den effektiv gewürfelten Dodge, sodass
 * `(1−dodge)·contestChance ≥ MIN_HIT_CHANCE` gilt; im Normalspiel (Contest deutlich über dem
 * Boden) bindet die Klemme nie. Exportiert für die Guard-Tests (#301 §5.5).
 */
export function combinedFloorDodge(dodgeChance: number, contestChance: number): number {
  return Math.min(dodgeChance, Math.max(0, 1 - MIN_HIT_CHANCE / Math.max(contestChance, MIN_HIT_CHANCE)));
}

/**
 * Defensiver Angriffs-Intervall-Guard: erzwingt ein endliches Intervall ≥ 1 Tick.
 * Ein 0/NaN/negatives Intervall (defekte Stats / korrupter Save) würde sonst die Timer-Logik
 * brechen (Endlos-Nichtauslösen oder NaN-Drift bei `timer -= intervall`).
 */
function safeInterval(intervalMs: number): number {
  return Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : TICK_MS;
}

/**
 * Eine einzelne Schlag-Kalkulation: Treffer → Krit → Schadensminderung → Wurf.
 *
 * Waffen 2.0 (§1.3): NON-Crits rollen UNIFORM in der MITIGIERTEN Spanne [effMin..effMax]
 * (effMin/Max = damageMin/Max ×(1−reduction)) — die WAFFE definiert die Breite. Der Wurf
 * konsumiert IMMER genau EINEN State-RNG-Draw (der frühere „floor ≥ maxHit rollte nicht"-
 * Kurzschluss ist bewusst entfallen — RNG-Disziplin, geseedete Fixtures wurden re-gepinnt).
 * CRITS bleiben erwartungs-verankert am MITTEL der Spanne: round(((effMin+effMax)/2)·critDamage)
 * — kein Extra-Roll, Krit-Stile werden nicht umbalanciert.
 */
function resolveAttack(rng: RngState, atk: AttackProfile, def: DefendProfile): AttackResult {
  // Contest-Formel zentral in contestHitChance (NaN-Fallback + MIN_HIT_CHANCE-Boden, s. dort).
  const hitChance = contestHitChance(atk.accuracy, def.evasion);
  if (nextFloat(rng) > hitChance) return { hit: false, crit: false, damage: 0, reduction: 0 };

  // Krit-Roll IMMER ziehen — auch bei forceCrit (eagleEye): so bleibt die RNG-Sequenz stabil,
  // egal ob der Garantie-Krit gerade geladen ist (Determinismus-Disziplin).
  const crit = nextFloat(rng) < atk.critChance || atk.forceCrit === true;
  // Prozentuale Mitigation (Melvor/OSRS-Stil): hohe Verteidigung dämpft, nullt aber nie.
  // Am oberen Ende gedeckelt (DEFENSE_MITIGATION_MAX), damit hochgerüstete Endgame-Spieler
  // weiterhin spürbar Schaden nehmen und der Term nicht asymptotisch gegen „unverwundbar" läuft.
  const reduction = Math.min(
    DEFENSE_MITIGATION_MAX,
    def.defense / (def.defense + DEFENSE_MITIGATION_K),
  );
  const effMin = atk.damageMin * (1 - reduction);
  const effMax = atk.damageMax * (1 - reduction);
  let damage: number;
  if (crit) {
    damage = Math.max(1, Math.round(((effMin + effMax) / 2) * atk.critDamage));
  } else {
    const lo = Math.max(1, Math.round(effMin));
    const hi = Math.max(lo, Math.round(effMax));
    damage = nextInt(rng, lo, hi); // konsumiert auch bei lo===hi genau einen Draw
  }
  return { hit: true, crit, damage, reduction };
}

function playerProfile(stats: DerivedStats): AttackProfile {
  // Waffe bestimmt den Stil → attackDamageMin/Max ist bereits die richtige Spanne
  // (Pfeilschaden seit #287 in der Bogen-Spanne eingebacken, #286 — combat.ts addiert NICHTS mehr dazu).
  return {
    accuracy: stats.accuracy,
    damageMin: stats.attackDamageMin,
    damageMax: stats.attackDamageMax,
    critChance: stats.critChance,
    critDamage: stats.critDamage,
  };
}

/**
 * Offense-XP-Faktor für die ressourcen-abhängigen Stile (Fernkampf/Magie) relativ zur
 * Schadens-XP-Basis. War für ranged ×2, dadurch erreichte ein Bogen-Build in ~1h bereits L40
 * und die ranged-Gates (22/42/62/80/95) waren faktisch wirkungslos. Auf ×1.2 gesenkt: leichter
 * Bonus fürs frühere Ressourcen-Handicap (Mana-Verbrauch ist mit der Zauberreserve 28.08.2026 entfallen, das Munitions-Handicap mit #286), aber grob
 * auf melee-Niveau, damit die Gates wieder als echte Progression greifen.
 *
 * Magie lief weiter auf ×2 → Magier levelten ihren Offense-Skill ~67 % schneller als Bogis
 * (Playtest 2026-06-25, B3). Beide Ressourcen-Stile teilen jetzt denselben Faktor → Stil-Parität.
 */
// Balance-Pass 3 #9b: 1.2 → 1.1 (symmetrisch für BEIDE Ressourcen-Stile). Nach dem CL-Kohärenz-Fix
// (#9a: magicOffense=magic_off) klettern Ranged und Magie identisch schnell im Kampf-Niveau; der leicht
// gesenkte Faktor zieht beide etwas Richtung Melee, ohne die Stil-Parität (gleicher Faktor) zu brechen.
const RANGED_XP_FACTOR = 1.1;
const MAGIC_XP_FACTOR = 1.1;
/**
 * Anteil der Melee-Offensiv-XP, der in der Default-„attack"-Stance an `attack` geht; der Rest
 * (1−Anteil) trainiert `power` (balance-pass2 #7). So wächst meleeDamage auch im Default-Modus mit.
 * Exportiert, damit die XP-Routing-Guards (kill-xp/over-level/combat) das Verhältnis 1:1 pinnen.
 */
export const ATTACK_STANCE_ATTACK_SHARE = 0.55;

/**
 * Bestimmt den Skill, der die Offensiv-/Kill-XP des aktiven Stils empfängt.
 * Magie/Fernkampf haben feste Skills; Nahkampf routet nach gewähltem combatStyle (OSRS-artig).
 */
function activeOffenseSkill(state: GameState, style: DerivedStats["style"]): string {
  // Stance-abhängiges XP-Routing (Melee: attack/power/defence, Ranged: ranged/ranged/defence,
  // Magie: magic_off/magic_def) — zentral in activeStanceMods.
  return activeStanceMods(style, state.character).xpSkill;
}

/**
 * Level-Range-XP-Faktor (CEO #113) für den aktiven Offensiv-Skill gegen diesen Mob.
 * Vergleicht das Level DESSELBEN Skills, der die XP empfängt (Stil-Skill), gegen `monster.level`.
 * Sanfte Bandbreite: voll bis XP_FULL_GAP über dem Mob, linear runter, 0 ab XP_ZERO_GAP drüber.
 * Wirkt NUR auf Kampf-XP — Loot & Gold bleiben unberührt (siehe `combatXpLevelMult`).
 */
function offenseXpMult(
  state: GameState,
  style: DerivedStats["style"],
  monster: MonsterDef,
): number {
  const skillId = activeOffenseSkill(state, style);
  const skillLevel = levelFromXp(state.skills[skillId]?.xp ?? 0);
  return combatXpLevelMult(skillLevel, monster.level);
}

/**
 * Routet Offensiv-XP nach aktivem Stil. Ausgeteilter Schaden trainiert auch Lebenskraft.
 * Die Stil-XP wird über die Level-Differenz gedämpft (über-levelter Mob → 0 = Anti-Dauerfarm);
 * Lebenskraft respektiert seit Chef-Entscheid (2026-07-08) DIESELBE Bandbreite — gegen das
 * EIGENE vitality-Level verglichen (Muster von offenseXpMult: der empfangende Skill zählt).
 * Vorher floss Survival-XP ungedämpft: „Chicken zu schwach — keine Kampf-XP", aber +109 Vitality.
 */
function grantOffenseXp(
  state: GameState,
  content: ContentDB,
  style: DerivedStats["style"],
  monster: MonsterDef,
  damage: number,
  nowMs?: number,
  fx?: SpecialEffects,
): void {
  const xpMult = offenseXpMult(state, style, monster);
  const skillId = activeOffenseSkill(state, style);
  const styleFactor =
    style === "ranged" ? RANGED_XP_FACTOR : style === "magic" ? MAGIC_XP_FACTOR : 1;
  const offenseXp = damage * MELEE_XP_PER_DAMAGE * styleFactor * xpMult;
  // Default-Melee-„attack"-Stance splittet die Offensiv-XP 55 % attack / 45 % power (balance-pass2 #7):
  // ohne Split trainiert ein Default-Melee nie `power` → meleeDamage stagniert → Wall an boar L10. Die
  // Summe bleibt identisch (Stil-Parität-Guard unberührt); andere Stances (power/defence/ranged/magic)
  // routen weiterhin 100 % an ihren einen Skill.
  if (style === "melee" && state.character.combatStyle === "attack") {
    addXp(state, content, "attack", offenseXp * ATTACK_STANCE_ATTACK_SHARE, nowMs, fx);
    addXp(state, content, "power", offenseXp * (1 - ATTACK_STANCE_ATTACK_SHARE), nowMs, fx);
  } else {
    addXp(state, content, skillId, offenseXp, nowMs, fx);
  }
  const vitalityLevel = levelFromXp(state.skills.vitality?.xp ?? 0);
  const vitalityMult = combatXpLevelMult(vitalityLevel, monster.level);
  addXp(state, content, "vitality", damage * VITALITY_XP_PER_DAMAGE * vitalityMult, nowMs, fx);
}

/**
 * Startet den Kill-Cooldown (Chef-Feature „Kampf entschleunigen") und friert die Kill-Summary fürs
 * UI ein: `lastKill` übernimmt den Encounter-XP-Akkumulator (tatsächlich vergebene XP je Skill seit
 * Spawn dieses Gegners) plus Loot/Gold DIESES Kills; `expiresInMs` läuft im Gleichschritt mit
 * `cooldownRemainingMs` ab. Der Akkumulator wird für den nächsten Gegner geleert. Aufruf NUR in den
 * Pfaden, die weiterkämpfen (Respawn/Dungeon-Welle) — der Dungeon-ABSCHLUSS bleibt cooldown-frei
 * (Chef-Vorgabe „Dungeon-Abschluss unverändert"; ohne Cooldown würde lastKill auch nie ablaufen).
 */
function beginKillCooldown(
  cs: CombatState,
  monsterId: MonsterId,
  gold: number,
  loot: Array<{ itemId: ItemId; qty: number }>,
  cooldownMs: number = KILL_COOLDOWN_MS,
  // Blutmond-Jackpot-Flag (Task #337): true ⇒ `loot` enthält bereits die verdoppelten Mengen;
  // die Summary markiert den Kill fürs UI (LastKillSummary.bloodMoonProc).
  bloodMoonProc = false,
): void {
  // cooldownOnKill (Waffen 2.0 §2.1) kann den Cooldown bis auf 0 drücken (5 s − X): dann startet
  // der nächste Kampf SOFORT — ohne Cooldown-Ticks würde eine lastKill-Summary nie ablaufen,
  // darum wird sie hier gar nicht erst gesetzt.
  if (cooldownMs <= 0) {
    cs.cooldownRemainingMs = undefined;
    cs.lastKill = undefined;
    cs.encounterXp = undefined;
    return;
  }
  cs.cooldownRemainingMs = cooldownMs;
  cs.lastKill = {
    monsterId,
    xpBySkill: cs.encounterXp ?? {},
    loot,
    gold,
    expiresInMs: cooldownMs,
  };
  if (bloodMoonProc) cs.lastKill.bloodMoonProc = true;
  cs.encounterXp = undefined;
}

/** Id-Präfix der dedizierten Dungeon-Varianten-Monster (Dungeon-Rework-Spec §5.2/§5.4). */
const DUNGEON_VARIANT_PREFIX = "dg_";

/**
 * Kill-Credit-Alias für Dungeon-Varianten (Dungeon-Rework-Spec §5.1.4): Kills von `dg_<baseId>`-
 * Monstern schreiben Kill-Zähler (`monsterKills`), Slayer-Task-Credit und Collection-Log auf die
 * BASIS-Id — Achievements/Tasks/Bestiarium bleiben von der Varianten-Einführung unberührt
 * (Präfix-Strip, Muster `tower_`-Art-Alias). Defensiv: existiert die Basis-Id nicht im Content
 * (kein echtes Varianten-Paar), zählt die Variante auf sich selbst — kein Credit ins Leere.
 * Deterministisch, kein RNG. Exportiert für Guards + als eine Quelle der Wahrheit (UI-Art-Alias
 * der ui-dev-Welle spiegelt dasselbe Muster in monsters.ts).
 */
/** claude:2026-10-18T02:00:00+02:00 — Item-IDs aller Champion-Unikate (Elite-Varianten), je Content gecacht. */
const championUniqueCache = new WeakMap<ContentDB, Set<ItemId>>();
function championUniqueIds(content: ContentDB): Set<ItemId> {
  let set = championUniqueCache.get(content);
  if (!set) {
    set = new Set(Object.values(content.elites ?? {}).map((e) => e.uniqueItemId));
    championUniqueCache.set(content, set);
  }
  return set;
}

export function killCreditMonsterId(content: ContentDB, monsterId: MonsterId): MonsterId {
  if (!monsterId.startsWith(DUNGEON_VARIANT_PREFIX)) return monsterId;
  const baseId = monsterId.slice(DUNGEON_VARIANT_PREFIX.length);
  return content.monsters[baseId] ? baseId : monsterId;
}

function onEnemyDefeated(
  state: GameState,
  content: ContentDB,
  monster: MonsterDef,
  stats: DerivedStats,
  fx: SpecialEffects,
  nowMs?: number,
): void {
  const cs = state.combat;
  const style = stats.style;
  // claude:2026-10-25T05:50:00+02:00 — Raid-Kampf? Einmal vor allen Änderungen am Kampfzustand feststellen (Wellen-Kill/Raum-Abschluss unten).
  const raidFight = cs.dungeonId ? activeRaidFight(state, content) : null;
  // Überschuss-Schaden des Todesstoßes (enemyHp ist hier ≤ 0) — Quelle für overkillCarry (§2.1).
  const overkill = Math.max(0, -cs.enemyHp);
  cs.kills++;
  state.stats.kills++;
  // Kill-Credit-Alias (Dungeon-Rework-Spec §5.1.4): `dg_*`-Dungeon-Varianten zählen auf die
  // Basis-Id (Kill-Zähler, Slayer-Credit, Collection-Log unten). Normale Monster: creditId = id.
  const creditId = killCreditMonsterId(content, monster.id);
  state.monsterKills[creditId] = (state.monsterKills[creditId] ?? 0) + 1;
  // claude:2026-10-18T00:30:00+02:00 — Talent `slayerTaskRareMult` (Jagdbuch „Beute“): VOR dem
  // Slayer-Credit festhalten, ob dieses Monster das Ziel des AKTIVEN Auftrags ist — der letzte Kill
  // schließt den Auftrag sonst vor dem Loot-Wurf und verlöre den Bonus.
  const taskRareBonus =
    state.slayerTask?.monsterId === creditId ? Math.max(0, talentEffect(state, content, "slayerTaskRareMult")) : 0;
  // Slayer-Task-Fortschritt (no-op ohne passenden Task). Rückgabe true = Task abgeschlossen.
  // Slayer-XP läuft über einen EIGENEN Vergabe-Pfad (grantSlayerXp, nicht unser addXp) → für die
  // Kill-Summary per Vorher/Nachher-Differenz erfassen (robust inkl. Task-Abschluss-Bonus).
  const slayerXpBefore = state.skills.slayer?.xp ?? 0;
  recordKillForSlayer(state, content, creditId);
  const slayerXpGained = (state.skills.slayer?.xp ?? 0) - slayerXpBefore;
  if (slayerXpGained > 0) {
    const acc = (cs.encounterXp ??= {});
    acc.slayer = (acc.slayer ?? 0) + slayerXpGained;
  }

  // Level-Range-XP (CEO #113): Kill-Bonus-XP (monster.xp) geht an den Stil-Skill, über die
  // Level-Differenz desselben Skills vs Mob-Level gedämpft. Über-levelter Mob → Faktor 0 = keine
  // Kampf-XP (gegen ewiges Farmen am selben schwachen Mob). Skill via `activeOffenseSkill`
  // (ranged/magic_off bzw. attack/power/defence je combatStyle) — eine einzige Quelle der Wahrheit.
  const xpMult = offenseXpMult(state, style, monster);
  const xpSkill = activeOffenseSkill(state, style);
  if (monster.xp > 0) addXp(state, content, xpSkill, monster.xp * xpMult, nowMs, fx); // bisher nur in der UI angezeigt, aber nie vergeben

  pushLog(cs, { by: "player", kind: "kill", amount: 0 });

  // Kill-Bonus-XP im Log ausweisen (tatsächlich vergebener, gedämpfter Betrag, gerundet).
  // Bei genullter XP (über-levelt) eine 0-XP-Zeile als „zu schwach — kein Kampf-XP"-Signal —
  // Loot & Gold bleiben unberührt (s.u.). (UI-Feinschliff/eigene Klartext-Zeile: siehe Bericht an ui-dev.)
  if (monster.xp > 0) {
    pushLog(cs, { by: "player", kind: "xp", amount: Math.round(monster.xp * xpMult), skill: xpSkill });
  }

  // Gold mit kleiner Streuung — bewusst UNGEDÄMPFT (CEO #113): schwache Mobs bleiben als
  // Material-/Gold-Quelle attraktiv; nur die Kampf-XP wird über-level-genullt, nicht die Ökonomie.
  // Als Closure (#276 doubleLoot): der carrionwing-Proc unten wiederholt exakt DIESEN Wurf einmal.
  const rollKillGold = (): number => {
    let g = monster.gold + nextInt(state.rng, 0, Math.ceil(monster.gold * 0.4));
    // luckyStrike (Glücksklinge, §2.1): +Anteil Gold von Kills — NACH der Streuung, kein Extra-Draw.
    if (fx.luckyStrike) g = Math.round(g * (1 + Math.max(0, fx.luckyStrike.magnitude)));
    // Blessings of the Reach ("greed", §gold): +% auf JEDE Gold-Vergabe — reine Arithmetik, kein
    // zusätzlicher RNG-Draw (Determinismus/offline==online unberührt). Schrein der Stillen
    // (Chef-Entscheid 2026-08-03): Bonus-Anteil verstärkt (1.20 → 1.26 bei Stufe III).
    // claude:2026-10-18T12:00:00+02:00 — Narbenbuch „Elsternauge" (goldFindPct): letzter Faktor, ohne Rang 1.
    g = Math.round(
      g * shrineAmplifiedMult(blessingMult(nowMs, "gold"), campShrineBonus(state, content)) * goldFindMult(state, content),
    );
    state.character.gold += g;
    if (g > 0) pushLog(cs, { by: "player", kind: "gold", amount: g });
    return g;
  };
  let gold = rollKillGold();

  // Loot-Mitschrift für die Kill-Summary (`lastKill.loot`): exakt die Mengen, die dieser Kill
  // tatsächlich vergeben hat (Stack + evtl. Suffix-Instanz — identisch zum Loot-Log-Eintrag).
  // Gleiche itemIds werden GEMERGT (statt Doppelzeile) — relevant, sobald der doubleLoot-Proc
  // denselben Eintrag zweimal würfelt.
  const lootSummary: Array<{ itemId: ItemId; qty: number }> = [];
  // Blutmond-Mitschrift (Task #337): getrennt nach Stack-Anteilen und Instanzen, damit der
  // Verdopplungs-Proc unten jeden Stack in EXAKT gleicher Menge nachlegen und jede Instanz als
  // wertgleiches Duplikat neu prägen kann (lootSummary mischt beides und taugt dafür nicht).
  const killStackGrants: Array<{ itemId: ItemId; qty: number }> = [];
  const killInstances: ItemInstance[] = [];

  // Ein kompletter Durchlauf der Monster-Loot-Tabelle (Chance-Wurf je Eintrag + Suffix-Roll).
  // Als Closure (#276 doubleLoot): der carrionwing-Proc unten wiederholt exakt DIESEN Wurf einmal.
  // Blessings of the Reach: "rotmist" (§rareDrop) hebt die Drop-CHANCE an (angewandt auf den
  // Vergleichswert selbst, derselbe nextFloat-Draw — kein zusätzlicher RNG-Zug); "bloodmoon"
  // (§doubleLootChance, Task #337) würfelt NACH allen Loot-Durchläufen genau EINMAL auf
  // Komplett-Verdopplung (s.u.) — Dungeon-/Truhen-Loot läuft über rollDungeonLootTable und bekommt
  // bewusst NUR den rareDrop-Bonus (Truhen-Loot ist kein Kill, „double loot pro Kill" greift nicht).
  // Schrein der Stillen (Chef-Entscheid 2026-08-03): Bonus-Anteil verstärkt (1.10 → 1.13 bei
  // Stufe III) — nur die Schwelle des BESTEHENDEN Wurfs ändert sich, nie die Zahl der Würfe.
  const rareDropMult = shrineAmplifiedMult(blessingMult(nowMs, "rareDrop"), campShrineBonus(state, content));
  // lootChance (Rune der Nachlese, Runen Tier IV §4.3, Chef-Entscheid 25.08.2026): zweiter Faktor auf
  // demselben Vergleichswert, dieselbe Disziplin wie rareDropMult (kein zusaetzlicher Draw, auf 1
  // geklemmt). NUR hier, in der regulaeren Kill-Tabelle: rollDungeonLootTable und der Elite-Unique-
  // Wurf (elites.ts, eliteRng) lesen den Faktor bewusst nicht (§9 Frage 4, Option A).
  const lootChanceMult = lootChanceEffectMult(fx);
  // claude:2026-10-18T02:00:00+02:00 — 1.3.0 (Chef 17.10.): der Aasschwinge-Zweitwurf überspringt Champion-Unikate
  // (Elite-`uniqueItemId`), damit diese Funde besonders bleiben. Begleiter/Dungeon-Token laufen ohnehin
  // über eigene Würfe. Übersprungene Einträge ziehen keinen RNG.
  const rollLootTable = (skipChampionUniques = false): void => {
    const uniques = skipChampionUniques ? championUniqueIds(content) : null;
    for (const roll of monster.loot) {
      if (uniques?.has(roll.itemId)) continue;
      // claude:2026-10-18T00:30:00+02:00 — Jagdbuch „Beute“: nur seltene Einträge (Basis ≤ 1/500) des
      // Auftragsmonsters; derselbe Draw, nur die Schwelle wächst (Champion-Unikate/Begleiter laufen
      // über eigene Würfe und bleiben unberührt). Ohne Talent ×1 ⇒ bit-identisch.
      const taskMult = taskRareBonus > 0 && roll.chance <= TALENT_RARE_DROP_MAX_BASE_CHANCE ? 1 + taskRareBonus : 1;
      if (nextFloat(state.rng) <= Math.min(1, roll.chance * rareDropMult * lootChanceMult * taskMult)) {
        let qty = nextInt(state.rng, roll.min, roll.max);
        // Drop-Suffix-Roll (Phase 2, #128 Abschluss — analog zum Craft-Pfad in tick.ts): jeder
        // gedroppte Equipment-Gegenstand kann einen WoW-Stil Random-Roll-Suffix bekommen. Chance:
        // `LootRoll.suffixChance` › globaler `DEFAULT_DROP_SUFFIX_CHANCE`. ilvl = Monster-Level des
        // besiegten Gegners. `tryCraftSuffix` zieht ZUERST keinen RNG, wenn kein Suffix möglich ist
        // (kein content.suffixes / Output kein Equipment / kein passender Pool / Chance 0) → Gold,
        // Materialien und sonstiger Nicht-Equipment-Loot bleiben RNG-bit-identisch. Fällt ein Suffix,
        // wird genau EIN Exemplar zur Item-Instanz (via intakeInstance ins Inventar, Auto-Salvage-
        // fähig), der Rest bleibt Stack — es zählt also nicht zusätzlich als Stack.
        let instanceMade = 0;
        const suffixChance = roll.suffixChance ?? DEFAULT_DROP_SUFFIX_CHANCE;
        if (qty > 0 && suffixChance > 0) {
          const res = tryCraftSuffix(state, content, roll.itemId, monster.level, suffixChance);
          if (res) {
            qty -= 1;
            instanceMade = 1;
            killInstances.push(res.instance); // Blutmond-Duplikat-Quelle (Task #337)
          }
        }
        // Überlauf-Pfad (SAVE 71, Muster tick.ts-Loot): grantLoot legt Inventar → (Auto-Bank) Lager
        // → Postfach ab — NICHTS geht bei vollem Inventar+Lager verloren. Da grantLoot die gesamte
        // `qty` unterbringt, ist der Zugewinn genau `qty` (+ die ggf. via intakeInstance erzeugte
        // Suffix-Instanz, die tryCraftSuffix bereits selbst ablegt — daher hier nur additiv gezählt).
        grantLoot(state, content, roll.itemId, qty);
        if (qty > 0) killStackGrants.push({ itemId: roll.itemId, qty }); // Blutmond-Mitschrift (#337)
        state.stats.itemsGathered += qty + instanceMade;
        // Collection-Log auf die BASIS-Id (Kill-Credit-Alias §5.1.4): Varianten-Loot = Basis-Loot
        // (Spec §5.4 „Loot/gold = Basis") → die Entdeckung gehört ins Bestiarium des Basis-Monsters.
        markDropSeen(state, creditId, roll.itemId);
        const dropped = qty + instanceMade;
        if (dropped > 0) {
          pushLog(cs, { by: "player", kind: "loot", amount: dropped, itemId: roll.itemId });
          const existing = lootSummary.find((l) => l.itemId === roll.itemId);
          if (existing) existing.qty += dropped;
          else lootSummary.push({ itemId: roll.itemId, qty: dropped });
        }
      }
    }
  };
  rollLootTable();

  // — #276 §4.2 doubleLoot (carrionwing „Scavenger"): Chance je Kill, den KOMPLETTEN Loot+Gold-Wurf
  //   genau EINMAL zu wiederholen — keine Rekursion (kein zweiter doubleLoot-Wurf), kein zweiter
  //   Pet-Drop-Wurf, keine Dungeon-Token (die vergibt nur grantDungeonRewards). RNG-Disziplin:
  //   der Erfolgs-nextFloat wird NUR gezogen, wenn die Chance > 0 ist (Muster tryPetDrop) —
  //   pet-lose States behalten ihre bit-identische Sequenz (Sim-Seeds!).
  const doubleLootChance = petDoubleLootChance(state, content);
  if (doubleLootChance > 0 && nextFloat(state.rng) < doubleLootChance) {
    gold += rollKillGold();
    rollLootTable(true);
  }

  // — Blutmond (Task #337, Samstags-Segen §doubleLootChance, Chef-Design „15% Chance for double
  //   loot … auf den gesamten Loot!"): EIN Wurf pro Kill, NACH Abschluss ALLER Loot-Produktion
  //   dieses Kills (Basis-Durchlauf UND ggf. carrionwing-Zweitroll direkt darüber — beides zählt
  //   zum „gesamten Loot"). Bei Erfolg wird ALLES verdoppelt, was dieser Kill an Beute produziert
  //   hat: jeder Stack nochmal in gleicher Menge über denselben Intake-Pfad wie der Erst-Drop
  //   (grantLoot: Inventar → Lager → Postfach, nichts geht verloren) und jede Drop-Instanz als
  //   wertgleiches DUPLIKAT (gleiches Item, gleicher Suffix-Roll — KEIN Re-Roll, nur eine frische
  //   instanceId). Kill-Gold ist KEIN Loot-Tabellen-Eintrag und bleibt unverdoppelt (XP sowieso);
  //   würde ein Monster Gold je als Loot-ZEILE droppen, verdoppelte es sich als Stack automatisch
  //   mit — konsistent mit „alles 2x". RNG-Disziplin (GESETZ offline==online): der Erfolgs-
  //   nextFloat wird NUR gezogen, wenn (a) der Segen aktiv ist (blessingChance > 0 — ohne nowMs
  //   bzw. an anderen Wochentagen 0, Muster petDoubleLootChance) UND (b) der Kill überhaupt Beute
  //   produziert hat (lootSummary leer ⇒ KEIN Draw — Paragon-Etagen/Nieten-Kills bleiben
  //   bit-identisch). Feste, dokumentierte Wurf-Reihenfolge im Kill-Pfad: Gold → Loot-Tabelle →
  //   carrionwing-Proc → BLUTMOND-Proc → Pet-Drop. Die Verdopplung selbst zieht KEINEN weiteren
  //   RNG (mintInstanceId ist ein deterministischer Zähler). Live-Tick und Offline-Aufholung
  //   laufen beide durch exakt diesen Pfad (nowMs kommt als Parameter, nie Date.now()).
  const bloodMoonChance = blessingChance(nowMs, "doubleLootChance");
  let bloodMoonProc = false;
  if (bloodMoonChance > 0 && lootSummary.length > 0 && nextFloat(state.rng) < bloodMoonChance) {
    bloodMoonProc = true;
    for (const grant of killStackGrants) {
      grantLoot(state, content, grant.itemId, grant.qty);
      state.stats.itemsGathered += grant.qty;
    }
    for (const inst of killInstances) {
      const copy: ItemInstance = {
        instanceId: mintInstanceId(state),
        baseItemId: inst.baseItemId,
        affixes: inst.affixes.map((a) => ({ ...a })),
      };
      if (inst.suffix) copy.suffix = { ...inst.suffix };
      intakeInstance(state, content, copy);
      state.stats.itemsGathered += 1;
    }
    // Kill-Summary + Log spiegeln die Verdopplung: je Item eine zweite Loot-Zeile in der bereits
    // vergebenen Menge, danach Summary-Menge ×2 — die UI (Kill-Karte/Toasts) liest `lastKill.loot`
    // und zeigt damit automatisch die verdoppelten Endmengen. `markDropSeen` lief schon beim
    // Erst-Drop (identische itemIds), kein zweiter Eintrag nötig.
    for (const entry of lootSummary) {
      pushLog(cs, { by: "player", kind: "loot", amount: entry.qty, itemId: entry.itemId });
      entry.qty *= 2;
    }
  }
  // — #276 §4.2 killHeal (charnel „Corpsefeeder"): heilt Bruch × maxHp bei jedem Kill. Kein RNG;
  //   healPlayer loggt als bestehendes heal-Event (source "effect") und cappt auf maxHp.
  const killHealFraction = petKillHealFraction(state, content);
  if (killHealFraction > 0) healPlayer(state, stats.maxHp, stats.maxHp * killHealFraction, "effect");

  // Pet-Drop-Wurf (unabhängig vom normalen Loot, KEIN Pity) — NACH allen Loot-/Mastery-Würfen,
  // damit `tryPetDrop` für Content ohne passendes Combat-Pet die RNG-Sequenz bit-identisch lässt.
  // Chef-Fix 2026-07-22: nur Pets des AKTIVEN Kampfstils würfeln mit — derselbe `style`
  // (DerivedStats["style"], waffenbestimmt/waffenlos=melee-Default), den die Offense-XP-Vergabe
  // oben schon nutzt (`activeOffenseSkill`/`offenseXpMult`) — keine neue Stil-Ermittlung.
  // Bei Treffer ist das Pet bereits in ownedPets + state.lastPetDrop gesetzt → Log-Eintrag.
  if (tryPetDrop(state, content, { kind: "combat", style })) {
    pushLog(cs, { by: "player", kind: "pet", amount: 0 });
  }

  // — Kill-Trigger-Spezial-Effekte (Waffen 2.0 §2.1) — deterministisch, kein RNG:
  //   wardOnKill/healOnKill = flache Ressourcen-Rückflüsse; cooldownOnKill kürzt den Kill-Cooldown
  //   (5 s − X, s. beginKillCooldown); overkillCarry/plaguebearer schreiben ihre „nächster-Gegner"-
  //   Übergabe in die transienten Zähler (Anwendung in applyCarryToNewEnemy beim Spawn).
  //   wardOnKill (Zauberreserve 28.08.2026, ersetzt manaOnKill): flacher Ward je Kill, auf maxWard
  //   gedeckelt — ohne Stoff-Pool (maxWard 0) ein No-op, still wie die übrige Ressourcen-Familie.
  if (fx.wardOnKill && stats.maxWard > 0) {
    state.character.ward = Math.min(
      stats.maxWard,
      state.character.ward + Math.max(0, fx.wardOnKill.magnitude),
    );
  }
  if (fx.healOnKill) healPlayer(state, stats.maxHp, fx.healOnKill.magnitude, "kill");
  const cooldownMs = Math.max(
    0,
    KILL_COOLDOWN_MS - (fx.cooldownOnKill ? Math.max(0, fx.cooldownOnKill.durationMs) : 0),
  );
  // Per-Begegnung-Zähler resetten (Gegnerwechsel, §2.3.4) + Übergaben für den nächsten Gegner setzen.
  if (cs.effectCounters || hasSpecialEffects(fx)) {
    const ec = effectCounters(cs);
    ec.momentumStacks = 0;
    ec.firstHitDone = false;
    ec.hitCount = 0;
    ec.vengeancePrimed = false;
    ec.overkillCarry = fx.overkillCarry ? overkill : 0;
    ec.plague = null;
    // claude:2026-10-25T05:50:00+02:00 — Raid-Sets: Zins und Wunden hängen am Ziel und enden mit ihm (Zauber-Zähler und
    // Abklingzeiten laufen über den Gegnerwechsel weiter). Nur vorhandene Felder anfassen (Form ohne Set unverändert).
    if (ec.fireInterestMs) ec.fireInterestMs = 0;
    if (ec.bleedStacks) ec.bleedStacks = 0;
    if (fx.plaguebearer) {
      // Gift-Parameter: der Poison-Status der Basiswaffe/Enchants („Magnitude der Basiswaffe",
      // §2.1); Fallback = eigene plaguebearer-Werte, falls die Waffe keinen Gift-Proc trägt.
      const p = fx.plaguebearer;
      const weaponPoison = mainhandStatusEffects(state, content).find((e) => e.type === "poison");
      const magnitude = weaponPoison?.magnitude ?? (p.magnitude > 0 ? p.magnitude : 0);
      const durationMs = weaponPoison?.durationMs ?? (p.durationMs > 0 ? p.durationMs : 0);
      if (magnitude > 0 && durationMs > 0) ec.plague = { magnitude, durationMs };
    }
  }

  // Paragonturm (§7, GRANT-Stelle 2/3): Etagen-Kill = Etage abgeschlossen. Die Etagen-Belohnung
  // (Gold/XP der skalierten Instanz, loot ist leer) ist oben bereits über den normalen Kill-Pfad
  // geflossen; onParagonFloorCleared (paragon.ts) schreibt Checkpoint/Rekord, rollt auf
  // Boss-Etagen die Meilenstein-Truhe und BEENDET den Kampf (Pause zum Aufstocken — kein
  // Auto-Weiter, kein Respawn, bewusst ohne Kill-Cooldown/lastKill wie der Dungeon-Abschluss).
  if (cs.paragonFloor) {
    onParagonFloorCleared(state, content);
    return;
  }

  // Elite-/World-Spawns (§Kill-Pfad, design/elite-spawns-concept.md): die Basis-Rewards (XP/Gold,
  // bereits ×statMults/xpMult/goldMult) UND die unveränderte Zonen-Loot-Tabelle sind oben bereits
  // über den UNVERÄNDERTEN Kill-Pfad geflossen (eliteScaledMonster skaliert xp/gold/maxHp/damage VOR
  // combat.ts — dieselbe Formel-Stelle wie paragonScaledMonster). onEliteKilled (elites.ts, logic-dev)
  // vergibt zusätzlich den garantierten Unique + extraLoot AUSSCHLIESSLICH über eliteRng und beendet
  // den Kampf sauber — kein Respawn desselben Elites (Konzept-Auftrag).
  if (cs.eliteVariantId) {
    // Jagd-Paket S1: `nowMs` durchreichen, sonst wäre der Blutmond-Bonus auf die Unique-Chance
    // im Live-Spiel inert (logic-dev-Befund 2026-07-22; ohne nowMs ist der Bonus neutral 0).
    onEliteKilled(state, content, monster, nowMs);
    return;
  }

  // Dungeon-Run: nächste Welle ODER Abschluss; sonst respawnt derselbe Gegner.
  if (cs.dungeonId) {
    const dungeon = content.dungeons.find((d) => d.id === cs.dungeonId);
    if (dungeon && cs.encounterIndex + 1 < dungeon.encounters.length) {
      // claude:2026-10-25T05:50:00+02:00 — Raid: Wellen-Kill (nicht der Boss) an raid.ts (Trash-Beute), vor dem Wellenwechsel.
      if (raidFight) onRaidMonsterKilled(state, content, monster, nowMs);
      cs.encounterIndex++;
      const nextBase = content.monsters[dungeon.encounters[cs.encounterIndex]!];
      if (nextBase) {
        cs.monsterId = nextBase.id;
        // claude:2026-10-25T05:50:00+02:00 — Raid: die nächste Welle als skalierte Instanz (Stufe, verstärkte Welle 4, Woche);
        // raidCombatMonster liest monsterId/encounterIndex (oben gesetzt). Außerhalb des Raids exakt das Content-Monster.
        const next = (raidFight ? raidCombatMonster(state, content) : undefined) ?? nextBase;
        cs.enemyHp = next.maxHp;
        // Gegner-Ward (Combat-Depth §3.2): frischer Voll-Pool je Welle (KEIN Regen, kein Teil-Refill
        // wie beim Spieler-Ward unten) — jeder neue Gegner bringt seinen eigenen Schild voll mit.
        cs.enemyWard = next.wardCapacity ?? 0;
        resetBossPhase(cs, next); // claude:2026-10-25T05:50:00+02:00 — Boss-Welle startet in der Basis (vor overkillCarry)
        cs.enemyTimerMs = 0;
        cs.enemyEffects = [];
        resetEnemyElemental(cs); // neue Welle = frische Frost-/Schock-/Gift-Zähler (vor applyCarryToNewEnemy)
        // Armor-Iteration 2 §6.1: Ward ist FARM-SESSION-scoped, kein Gratis-Voll-Reset je Kill mehr.
        // Die neue Welle refillt nur WARD_KILL_REFILL_PCT (20 %) des Pools — verbraucht ein Dauerkampf
        // mehr als 20 %+Cast-Recharge/Warding-Regen zurückgeben, erodiert der Pool → Food kehrt zurück.
        // Start/Death-Heal bleiben VOLL (startCombat / onPlayerDefeated).
        state.character.ward = Math.min(
          stats.maxWard,
          state.character.ward + WARD_KILL_REFILL_PCT * stats.maxWard,
        );
        resetEnemyPetDebuffs(cs);
        resetStalemate(cs); // neue Welle = neue Begegnung
        applyCarryToNewEnemy(state, next, combatMods(state, content)); // overkillCarry/plaguebearer treffen die neue Welle
        // Schatztruhe + Atempause VOR dem Boss (Dungeon-Rework-Spec §5.1.2, Leitplanke 1): beim
        // Übergang in die LETZTE Welle rollen die Chest-Rows (genau 1× pro Run — dieser Übergang
        // existiert nur einmal; kein State-Flag nötig) und der Wellen-Cooldown beträgt einmalig
        // PRE_BOSS_BREATHER_MS (Boss-Intro-Fenster fürs UI, §5.1.5) statt des Kill-Cooldowns.
        // Bewusst NICHT via cooldownOnKill verkürzbar (Dramaturgie-Fenster). RNG-Disziplin: ohne
        // definiertes `chest` weder RNG-Draw noch Cooldown-Änderung → Alt-Content bit-identisch.
        // Ein Teil des Laufs ist damit vor dem Boss-Risiko „gebankt" (Fairness-Baustein, §5.7).
        let waveCooldownMs = cooldownMs;
        if (dungeon.chest && cs.encounterIndex === dungeon.encounters.length - 1) {
          rollDungeonLootTable(state, content, dungeon.chest.loot, dungeonLootIlvl(content, dungeon), nowMs);
          waveCooldownMs = PRE_BOSS_BREATHER_MS;
        }
        // Kill-Cooldown auch zwischen Dungeon-Wellen (Konsistenz): die nächste Welle steht bereits,
        // greift aber erst nach Ablauf an. Der ABSCHLUSS (letzte Welle, unten) bleibt cooldown-frei.
        beginKillCooldown(cs, monster.id, gold, lootSummary, waveCooldownMs, bloodMoonProc);
        return;
      }
    }
    // Letzte Welle besiegt (oder defekter Dungeon) → Abschluss-Belohnung, Run beenden.
    // Bewusst OHNE Kill-Cooldown/lastKill (Chef: „Dungeon-Abschluss unverändert"; außerdem würde
    // lastKill ohne laufenden combatStep nie ablaufen). endDungeon leert den Encounter-Akkumulator.
    // claude:2026-10-25T05:50:00+02:00 — Raid-Raum: Boss besiegt ⇒ raid.ts vergibt Beute/Truhe und schaltet auf Rast bzw.
    // Abschluss; statt der Dungeon-Abschlussbelohnung (kein Clear-Gold, kein dungeonsCleared-Zähler). Danach wie gehabt endDungeon.
    if (raidFight) onRaidRoomCleared(state, content, nowMs);
    else if (dungeon) grantDungeonRewards(state, content, dungeon, nowMs, fx);
    endDungeon(state);
    return;
  }
  // Normaler Kampf: gleicher Gegner respawnt → durchgehendes Farmen, bis der Spieler stoppt.
  // Der Respawn steht sofort im State (UI zeigt ihn samt Countdown), der Kampf ruht aber für
  // KILL_COOLDOWN_MS (beginKillCooldown) — erst danach laufen Angriffe/Timer/Effekte weiter.
  cs.enemyHp = monster.maxHp;
  // Gegner-Ward (Combat-Depth §3.2): frischer Voll-Pool je Respawn (KEIN Regen, kein Teil-Refill wie
  // beim Spieler-Ward unten) — anders als der farm-erodierende Spieler-Ward startet der Gegner-Schild
  // jede Begegnung voll. wardCapacity 0/undefined (Melee/Range) ⇒ 0 ⇒ Ward-Schritt bleibt No-op.
  cs.enemyWard = monster.wardCapacity ?? 0;
  cs.enemyTimerMs = 0;
  cs.enemyEffects = [];
  resetEnemyElemental(cs); // Respawn = frische Frost-/Schock-/Gift-Zähler (vor applyCarryToNewEnemy)
  // Armor-Iteration 2 §6.1: Ward beim Respawn nur TEIL-Refill (WARD_KILL_REFILL_PCT = 20 %) statt
  // Gratis-Voll-Reset — der Pool ist farm-session-scoped und erodiert über eine Farm-Serie, sobald
  // pro Kill mehr Ward verbraucht wird als 20 %+Recharge+Warding-Regen zurückgeben (→ Food-Druck für
  // den Magier). Voller Start bleibt startCombat, volles Nachfüllen nur beim Death-Heal.
  state.character.ward = Math.min(
    stats.maxWard,
    state.character.ward + WARD_KILL_REFILL_PCT * stats.maxWard,
  );
  resetEnemyPetDebuffs(cs);
  resetStalemate(cs); // Respawn = neue Begegnung
  resetBossPhase(cs, monster); // claude:2026-10-25T05:50:00+02:00 — Respawn startet in der Basis
  applyCarryToNewEnemy(state, monster, combatMods(state, content)); // overkillCarry/plaguebearer treffen den Respawn
  beginKillCooldown(cs, monster.id, gold, lootSummary, cooldownMs, bloodMoonProc);
}

/**
 * Wendet die „nächster-Gegner"-Übergaben (Waffen 2.0 §2.1) auf den frisch gespawnten Gegner an:
 *  - overkillCarry: der Überschuss des Todesstoßes trifft den Neuen (min. 1 Rest-HP — kein
 *    Insta-Kill-Kaskadieren durch den Kill-Cooldown hindurch); sichtbar als Treffer-Log.
 *  - plaguebearer: der Neue startet vergiftet (respektiert Monster-Resistenzen via applyEnemyStatus).
 * Beide Übergaben werden hier KONSUMIERT (genau ein Gegnerwechsel). Kein RNG.
 */
function applyCarryToNewEnemy(
  state: GameState,
  monster: MonsterDef,
  cm: CombatMods = NO_COMBAT_MODS, // claude:2026-10-25T05:50:00+02:00 — Raid-Sets/Woche (Gift-Dauer/-Stapel)
): void {
  const cs = state.combat;
  const ec = cs.effectCounters;
  if (!ec) return;
  if (ec.overkillCarry > 0) {
    const carry = Math.min(ec.overkillCarry, monster.maxHp - 1);
    if (carry > 0) {
      cs.enemyHp -= carry;
      pushLog(cs, { by: "player", kind: "hit", amount: Math.max(1, Math.round(carry)) });
    }
    ec.overkillCarry = 0;
  }
  if (ec.plague) {
    applyEnemyStatus(
      state,
      monster,
      {
        type: "poison",
        magnitude: ec.plague.magnitude,
        durationMs: ec.plague.durationMs,
      },
      cm,
    );
    ec.plague = null;
  }
}

/** Beendet einen Dungeon-Run (zurück zur Auswahl). */
function endDungeon(state: GameState): void {
  const cs = state.combat;
  cs.dungeonId = null;
  cs.encounterIndex = 0;
  cs.monsterId = null;
  cs.playerTimerMs = 0;
  cs.enemyTimerMs = 0;
  cs.enemyEffects = [];
  cs.playerEffects = [];
  cs.petAbility = createPetAbilityRuntime();
  cs.encounterXp = undefined; // Begegnung/Run vorbei → Kill-Summary-Akkumulator verfällt
  cs.effectCounters = undefined; // Spezial-Effekt-Zähler resetten bei Kampfende (§2.3.4)
  cs.elemental = undefined; // Elementar-Zähler verfallen mit dem Run
  resetBossPhase(cs); // claude:2026-10-25T05:50:00+02:00 — Bossphasen-Zustand verfällt mit dem Run
}

/**
 * ilvl für Suffix-Rolls aus Dungeon-Belohnungen (Truhe + Clear-Loot): das Level des BOSS-Monsters
 * (letzte Welle) — die Belohnung entstammt dem ganzen Lauf, sein Gipfel bestimmt die Item-Stufe
 * (analog „ilvl = Monster-Level" im Kill-Drop-Pfad). Defekter Content (leere encounters/unbekannte
 * Id) fällt defensiv auf 1. Rein lesend, kein RNG.
 */
/** claude:2026-10-25T21:55:00+02:00 — Kämpft der Spieler gerade gegen den Boss eines Dungeon- oder Raid-Laufs (Boss-Welle bzw. letzte Begegnung)? */
function fightingRunBoss(state: GameState, content: ContentDB): boolean {
  const cs = state.combat;
  if (!cs.dungeonId) return false;
  const d = content.dungeons.find((x) => x.id === cs.dungeonId);
  if (!d) return false;
  return d.waveMeta?.[cs.encounterIndex]?.kind === "boss" || cs.encounterIndex === d.encounters.length - 1;
}

function dungeonLootIlvl(content: ContentDB, dungeon: DungeonDef): number {
  const bossId = dungeon.encounters[dungeon.encounters.length - 1];
  return (bossId && content.monsters[bossId]?.level) || 1;
}

/**
 * Rollt eine Dungeon-Belohnungs-Tabelle (Schatztruhe §5.1.2 + Clear-Loot): Chance-Wurf je Row,
 * Menge, grantLoot (Inventar → Auto-Bank → Postfach) + Loot-Log — gemeinsamer Pfad, damit Truhe
 * und Abschluss identisch ticken.
 *
 * Suffix-Rolls (Dungeon-Rework-Spec §5.5: Clear-Chase-Items tragen `suffixChance 0.30`) werden
 * NUR bei EXPLIZIT gesetzter `roll.suffixChance` gewürfelt — bewusst OHNE den
 * DEFAULT_DROP_SUFFIX_CHANCE-Fallback des Kill-Drop-Pfads: Alt-Dungeons ohne das Feld müssen
 * RNG-bit-identisch bleiben (kein zusätzlicher Draw), und tryCraftSuffix zieht bei Chance 0/undefined
 * garantiert keinen RNG. Fällt ein Suffix, wird genau EIN Exemplar zur Item-Instanz (intakeInstance),
 * der Rest bleibt Stack (Muster rollLootTable in onEnemyDefeated). Ohne diese Anwendung wäre das
 * Content-Feld „definiert, aber nie angewandt" (bekannte Bug-Klasse — Hard-Rule).
 */
function rollDungeonLootTable(
  state: GameState,
  content: ContentDB,
  rolls: LootRoll[],
  ilvl: number,
  nowMs?: number,
): void {
  const cs = state.combat;
  // Blessings of the Reach ("rotmist", §rareDrop): analog zum Kill-Loot-Pfad (onEnemyDefeated) —
  // NUR die Chance, KEIN Blutmond-doubleLootChance (Truhen-/Clear-Loot ist kein KILL — der
  // Samstags-Segen „15% Chance auf doppelten Gesamt-Loot pro Kill" greift hier bewusst nicht).
  // Schrein der Stillen (Chef-Entscheid 2026-08-03): Bonus-Anteil verstärkt (1.10 → 1.13 bei
  // Stufe III) — Schwelle des bestehenden Wurfs, kein zusätzlicher RNG-Zug.
  const rareDropMult = shrineAmplifiedMult(blessingMult(nowMs, "rareDrop"), campShrineBonus(state, content));
  for (const roll of rolls) {
    if (nextFloat(state.rng) <= Math.min(1, roll.chance * rareDropMult)) {
      let qty = nextInt(state.rng, roll.min, roll.max);
      let instanceMade = 0;
      const suffixChance = roll.suffixChance ?? 0; // explizit-only — Alt-Content bit-identisch
      if (qty > 0 && suffixChance > 0) {
        const res = tryCraftSuffix(state, content, roll.itemId, ilvl, suffixChance);
        if (res) {
          qty -= 1;
          instanceMade = 1;
        }
      }
      // Überlauf-Pfad (SAVE 71, Muster tick.ts-Loot): grantLoot legt Inventar → (Auto-Bank) Lager
      // → Postfach ab — Truhen-/Clear-Loot geht bei vollem Inventar+Lager nicht mehr verloren. Da
      // grantLoot die gesamte `qty` unterbringt, ist der Zugewinn genau `qty` (+ ggf. Suffix-Instanz).
      grantLoot(state, content, roll.itemId, qty);
      state.stats.itemsGathered += qty + instanceMade;
      const dropped = qty + instanceMade;
      if (dropped > 0) pushLog(cs, { by: "player", kind: "loot", amount: dropped, itemId: roll.itemId });
    }
  }
}

/** Vergibt die Abschluss-Belohnungen eines geschafften Dungeons (Loot + XP + Gold). `fx` nur für den
 *  combatXp-Faktor der Abschluss-XP (addXp); der Clear-Loot bleibt vom lootChance-Kind unberührt. */
function grantDungeonRewards(
  state: GameState,
  content: ContentDB,
  dungeon: DungeonDef,
  nowMs?: number,
  fx?: SpecialEffects,
): void {
  const cs = state.combat;
  // Lebenslanger Dungeon-Clear-Zähler (Quelle für `dungeons_cleared`-Achievements). Nur hier,
  // beim tatsächlichen Abschluss der letzten Welle — nicht pro Welle.
  state.dungeonsCleared[dungeon.id] = (state.dungeonsCleared[dungeon.id] ?? 0) + 1;
  // Clear-Zeremonie-Vertrag (SAVE 83): alles, was NACH diesem Marker geloggt wird, ist die
  // Abschluss-Belohnung — daraus entsteht unten `lastDungeonClear` (reine Log-Lektüre, kein RNG).
  const markerSeq = cs.eventCount;
  pushLog(cs, { by: "player", kind: "kill", amount: 0 });
  if (dungeon.gold > 0) {
    // Blessings of the Reach ("greed", §gold): +% auf JEDE Gold-Vergabe — EINMAL berechnet, damit
    // der Erst-Clear-Bonus unten (zweite Gutschrift desselben Betrags) denselben Segens-Betrag
    // dupliziert statt den Multiplikator ein zweites Mal anzuwenden. Schrein der Stillen
    // (Chef-Entscheid 2026-08-03): Bonus-Anteil verstärkt (1.20 → 1.26 bei Stufe III).
    // claude:2026-10-18T12:00:00+02:00 — Narbenbuch „Elsternauge" (goldFindPct): letzter Faktor, ohne Rang 1.
    const goldAmt = Math.round(
      dungeon.gold * shrineAmplifiedMult(blessingMult(nowMs, "gold"), campShrineBonus(state, content)) * goldFindMult(state, content),
    );
    state.character.gold += goldAmt;
    pushLog(cs, { by: "player", kind: "gold", amount: goldAmt });
    // Erst-Clear-Bonus (Dungeon-Rework-Spec §5.1.3): der ERSTE Clear dieses Dungeons zahlt das
    // Clear-Gold DOPPELT — als ZWEITER pushLog-Gold-Eintrag (UI: Erst-Clear-Moment/Badge, §5.6.4).
    // Nutzt den soeben inkrementierten, bereits persistierten Zähler (=== 1 ⇔ dieser Clear war der
    // erste) — KEIN neues Save-Feld, kein SAVE-Bump. Folge-Clears: exakt der alte Pfad.
    if (state.dungeonsCleared[dungeon.id] === 1) {
      state.character.gold += goldAmt;
      pushLog(cs, { by: "player", kind: "gold", amount: goldAmt });
    }
  }
  if (dungeon.xp > 0) {
    // Dungeon-XP geht an Lebenskraft (skillübergreifender Kampf-Anker), via earlyXpMult.
    // Release-Fix 0.3.0 (Bot-3 Befund B1): das Log zeigt den TATSÄCHLICH vergebenen Betrag
    // (addXp-Rückgabe: inkl. earlyXpMult/Segen/Schrein, gerundet — Muster Kill-XP-Zeile und
    // Gold-Pfad direkt darüber), nicht mehr den Katalog-Rohwert. Reiner Log-Inhalt, kein RNG —
    // offline==online bleibt byte-gleich (beide Pfade laufen durch exakt diese Zeile).
    const granted = addXp(state, content, "vitality", dungeon.xp, nowMs, fx);
    pushLog(cs, { by: "player", kind: "xp", amount: Math.round(granted), skill: "vitality" });
  }
  // Clear-Loot über den gemeinsamen Dungeon-Loot-Pfad (identische RNG-Draw-Reihenfolge wie der
  // frühere Inline-Loop, solange keine Row eine explizite suffixChance trägt — Bit-Identität).
  rollDungeonLootTable(state, content, dungeon.loot, dungeonLootIlvl(content, dungeon), nowMs);

  // `lastDungeonClear` (SAVE 83 „Dungeons queuebar", s. CombatState-JSDoc): die Summary aus den
  // soeben geloggten Belohnungs-Einträgen (seq > Marker) — exakt die Rekonstruktion, die die
  // Clear-Zeremonie der UI bisher selbst aus dem Log machte, jetzt engine-seitig und damit robust
  // gegen den Queue-Neustart im selben Tick (der das Log leert). Transient, kein RNG, kein Save-Bump.
  const clearNo = state.dungeonsCleared[dungeon.id] ?? 1;
  const summary: DungeonClearSummary = {
    dungeonId: dungeon.id,
    clearNo,
    firstClear: clearNo === 1,
    gold: 0,
    xp: 0,
    loot: [],
  };
  for (const e of cs.log) {
    if (e.seq <= markerSeq) continue;
    if (e.kind === "gold") summary.gold += e.amount;
    else if (e.kind === "xp") summary.xp += e.amount;
    else if (e.kind === "loot" && e.itemId) {
      const existing = summary.loot.find((l) => l.itemId === e.itemId);
      if (existing) existing.qty += e.amount;
      else summary.loot.push({ itemId: e.itemId, qty: e.amount });
    }
  }
  cs.lastDungeonClear = summary;
}

/**
 * Spieler besiegt → HARTER STOPP als Niederlage-Strafe (Chef-Änderung): Der Kampf ENDET und läuft
 * NICHT automatisch gegen denselben Gegner weiter. Der Spieler muss den Gegner nach Vorbereitung
 * (Essen auffüllen, Ausrüstung, heilen) MANUELL neu wählen/starten. So hat ein Tod eine spürbare Folge
 * (Zeit-/Fortschrittsverlust) statt folgenlosem Auto-Respawn — Strafe für schlechte Vorbereitung.
 *
 * Idle-fair genug: der Held wird trotzdem voll geheilt (`maxHp`), damit er nach dem manuellen Neustart
 * sofort wieder einsteigen kann — es geht KEIN Item/Gold verloren (Chef verlangte nur den Abbruch).
 *
 * Ablauf (deterministisch, kein RNG/Date.now; der Tod vergibt KEINE Belohnung → kein Doppel-Reward):
 *  - `state.stats.deaths++` → das Todes-Popup im Renderer feuert darauf (es liest den Killer aus dem
 *    Vor-Tick-Snapshot und ist robust gegen das Nullen von `monsterId`).
 *  - `stopReason = "defeated"` markiert den Auto-Stopp-Grund für den UI-Hinweis (analog stalemate).
 *  - Sauberer „Kampf aus"-Zustand wie `stopCombat`: monsterId & dungeonId = null,
 *    encounterIndex = 0, und der transiente Kampf-Zustand (DoT/Frost/Schock, Pet-Schild/Debuffs, Timer,
 *    Stalemate-Tracking) verfällt — kein Alt-Zustand leckt in den nächsten (manuell gestarteten) Kampf.
 *
 * Dungeon-Tod: bricht den Run wie bisher ab (Schlüssel verbraucht = Einsatz/Risiko) — jetzt exakt
 * derselbe Pfad wie der Normalkampf-Tod, da beide `monsterId`/`dungeonId` nullen.
 *
 * Mess-Harness: der SimPlayer startet in `fightFor` bei `monsterId === null` (das ist jetzt AUCH der
 * Tod-Pfad) unter `restartOnDeath` selbst neu — der Spiel-Abbruch bricht die Personas/Sim also NICHT.
 */
function onPlayerDefeated(state: GameState, content: ContentDB, maxHp: number): void {
  const cs = state.combat;
  // claude:2026-10-25T05:50:00+02:00 — Raid-Tod (R3): VOR dem Aufräumen feststellen (es nullt dungeonId), danach an raid.ts melden.
  const inRaid = cs.dungeonId !== null && activeRaidFight(state, content) !== null;
  // Paragonturm (§7, GRANT-Stelle 3/3): Tod im Turm = kompletter Reset auf Etage 1
  // (state.paragon.checkpoint → 0; Rekord `best` bleibt) + paragonFloor räumen. Außerhalb
  // des Turms ein No-op. MUSS vor dem Nullen der Kampf-Felder laufen (liest cs.paragonFloor).
  resetParagonOnDeath(state);
  state.stats.deaths++;
  pushLog(cs, { by: "enemy", kind: "defeat", amount: 0 });
  state.character.hp = maxHp; // voll heilen: nach Vorbereitung sofort wieder einsteigbar (kein 1-HP-Grind)
  // Sauberer „Kampf aus"-Zustand (spiegelt stopCombat/endDungeon): der Kampf endet, KEIN Auto-Neustart.
  cs.stopReason = "defeated";
  cs.monsterId = null;
  cs.eliteVariantId = undefined; // Tod gegen einen Elite: Kampf-Zeiger räumen (Zone bleibt „Aktiv"
  // bis Fenster/nächster Tick — kein Verlust der Elite-Verfügbarkeit durch den Tod, nur der Kampf endet).
  cs.dungeonId = null; // Dungeon-Tod = Run-Abbruch (Schlüssel verbraucht); Normalkampf-Tod bereits null
  cs.encounterIndex = 0;
  // Transienter Kampf-Zustand verfällt beim Tod (Gift weg, Pet-Schild/Debuffs weg, Timer reset).
  cs.playerTimerMs = 0;
  cs.enemyTimerMs = 0;
  cs.enemyEffects = [];
  cs.playerEffects = []; // Gift verfliegt bei Kampfende
  cs.petAbility = createPetAbilityRuntime(); // Pet-Schild/Debuffs verfallen bei Kampfende
  resetStalemate(cs); // Stalemate-Tracking der beendeten Begegnung zurücksetzen
  cs.encounterXp = undefined; // Begegnung vorbei → Kill-Summary-Akkumulator verfällt
  cs.effectCounters = undefined; // Spezial-Effekt-Zähler resetten bei Tod (§2.3.4)
  cs.elemental = undefined; // Elementar-Zähler (Frost/Schock/Gift, beide Seiten) verfallen beim Tod
  resetBossPhase(cs); // claude:2026-10-25T05:50:00+02:00 — Bossphasen-Zustand verfällt mit dem Kampf
  // cooldownRemainingMs/lastKill bleiben BEWUSST stehen (falls der Tod in einen laufenden Kill-
  // Cooldown fiel): der Cooldown gilt immer — der nächste manuelle startCombat übernimmt den Rest.
  if (inRaid) onRaidDefeat(state, content, "defeated"); // claude:2026-10-25T05:50:00+02:00 — nach dem bestehenden Aufräumen
}

/** Ist der Gegner gegen diesen Statuseffekt immun? */
export function monsterResists(monster: MonsterDef, type: StatusType): boolean {
  return monster.resist?.includes(type) ?? false;
}

/**
 * Wendet einen Statuseffekt des Spielers auf den Gegner an (Refresh bei vorhandenem).
 *
 * Refresh-Semantik = "verstärken, nie abschwächen" (P1-Fix Min-Maxer): bei bereits aktivem Status
 * gleicher Art werden Magnitude UND Rest-Dauer per `max(bestehend, neu)` zusammengeführt statt
 * bedingungslos überschrieben. Sonst zog ein schwacher Refresh (z.B. Feuer-Affix burn ~4-14) eine
 * starke bestehende Glut (z.B. Apex-Stab burn 48) nach unten — eine "Feuer-auf-Feuer"-Verzauberung
 * hätte die Apex-Waffe SCHWÄCHER gemacht. Es bleibt beim Refreshen einer EINZIGEN Instanz (kein
 * Stacking mehrerer Instanzen) — `max` sorgt nur dafür, dass ein Refresh den stärkeren/längeren
 * Effekt nie verschlechtert.
 */
export function applyEnemyStatus(
  state: GameState,
  monster: MonsterDef,
  effect: { type: StatusType; magnitude: number; durationMs: number },
  // claude:2026-10-25T05:40:00+02:00 — Raid-Sets/Wochen-Modifikator (intern; externe Aufrufer ohne = heutige Logik).
  cm: CombatMods = NO_COMBAT_MODS,
): void {
  if (monsterResists(monster, effect.type)) return; // immune Gegner ignorieren den Effekt
  const cs = state.combat;
  // claude:2026-10-25T05:40:00+02:00 — Dauer nach Set/Woche (Ornat Brand +2 s, Giftküche, Blutfest); ohne Mods unverändert.
  const durationMs = playerStatusDuration(effect.type, effect.durationMs, cm);
  const existing = cs.enemyEffects.find((e) => e.type === effect.type);
  if (existing) {
    existing.remainingMs = Math.max(existing.remainingMs, durationMs);
    existing.magnitude = Math.max(existing.magnitude, effect.magnitude);
  } else {
    cs.enemyEffects.push({
      type: effect.type,
      remainingMs: durationMs,
      magnitude: effect.magnitude,
    });
  }
  // Elementar-Nachlauf (Log + Einfrieren/Verzögerung/Stapel) — auch bei Refresh (jede Anwendung zählt).
  onStatusApplied(cs, "enemy", effect.type, !existing, 0, cm.poisonMaxStacks);
  // claude:2026-10-25T05:40:00+02:00 — Offene Wunden (Blutschwur 4/5, Spec §6.1): Blutung stapelt bis `maxStacks` (eine
  // Instanz, Stapel im Zähler); jeder weitere Stapel loggt wie beim Gift `amount` = Stapelzahl. Ohne Set kein Zähler.
  if (effect.type === "bleed" && cm.bleedMaxStacks > 0) {
    const ec = effectCounters(cs);
    const prev = existing ? Math.max(1, ec.bleedStacks ?? 0) : 0;
    const stacks = Math.min(cm.bleedMaxStacks, prev + 1);
    const grew = stacks !== (ec.bleedStacks ?? 0);
    ec.bleedStacks = stacks;
    if (existing && grew) pushLog(cs, { by: "player", kind: "status", amount: stacks, status: "bleed" });
  }
}

/**
 * Wendet bei einem Treffer ALLE Statuseffekte der Waffe auf den Gegner an.
 * Iteriert über die STATUS-Effekte der Mainhand (Basis + Enchant-Procs, dedupliziert), damit
 * Fusions-Waffen (z.B. Void burn+bleed) wirklich beide Status anwenden. Spezial-Kinds (Waffen 2.0)
 * werden hier ÜBERSPRUNGEN — sie sind passive Bedingungs-Effekte ohne Proc-Roll (kein RNG-Draw
 * für sie → Status-only-Waffen behalten ihre bit-identische Sequenz). Pro Status ein eigener
 * Chance-Wurf in stabiler Reihenfolge (weaponEffect zuerst, dann das Array).
 * catalyst (§2.1): verlängert die Dauer der EIGENEN Waffen-Status um +ms.
 */
function applyWeaponEffects(
  state: GameState,
  content: ContentDB,
  monster: MonsterDef,
  fx: SpecialEffects,
  cm: CombatMods = NO_COMBAT_MODS, // claude:2026-10-25T05:40:00+02:00 — Raid-Sets/Woche (Dauer, Stapel)
): void {
  const catalystMs = fx.catalyst ? Math.max(0, fx.catalyst.durationMs) : 0;
  const mainEffects = mainhandStatusEffects(state, content);
  for (const effect of mainEffects) {
    const type = effect.type;
    if (!isStatusEffectType(type)) continue; // defensive (mainhandStatusEffects filtert bereits)
    if (nextFloat(state.rng) > statusApplyChance(effect)) continue;
    applyEnemyStatus(
      state,
      monster,
      {
        type,
        magnitude: effect.magnitude,
        durationMs: effect.durationMs + catalystMs,
      },
      cm,
    );
  }
  // claude:2026-10-24T18:20:00+02:00 — Effektpfeil (1.4.0 FK §3.3): eigener Proc-Wurf je Treffer, NACH den Waffen-Procs. Trägt der Bogen
  // denselben Status schon, bringt der Pfeil davon nichts (gewollte Wahl, Spec); kein Wurf ⇒ keine Sequenzänderung.
  const arrowFx = activeArrow(state, content)?.def.effect;
  if (arrowFx && isStatusEffectType(arrowFx.type) && !mainEffects.some((e) => e.type === arrowFx.type)) {
    if (nextFloat(state.rng) <= statusApplyChance(arrowFx)) {
      applyEnemyStatus(
        state,
        monster,
        {
          type: arrowFx.type,
          magnitude: arrowFx.magnitude,
          durationMs: arrowFx.durationMs + catalystMs,
        },
        cm,
      );
    }
  }
}

/**
 * Anwendungschance eines Status je Treffer. Elementar-Effekte (Chef-GO 28.08.2026): für shock ist die
 * Content-`chance` die Anwendungschance (CEO-Korrektur 28.08.2026; `magnitude` bleibt bei Schock ungenutzt) — die frühere
 * Aussetz-Chance je Angriff ist entfallen, die Verzögerung selbst ist konstant (SHOCK_DELAY_MS).
 * `chance` wird für shock nicht gelesen (Alt-Feld; bei Drops/Affixen ohnehin ≈ magnitude). Alle
 * anderen Status: `chance` wie gehabt. Gilt für Waffen-Procs UND Monster-inflict (Symmetrie).
 */
function statusApplyChance(effect: { type: string; chance: number; magnitude: number }): number {
  // CEO 28.08.2026: auch bei Schock zaehlt `chance` als Anwendungschance (wie bei allen Status); `magnitude` ist fuer
  // Schock ohne Wirkung (Verzoegerung ist die feste SHOCK_DELAY_MS-Kette). Sonst fielen Bronze-/Adamantium-Stab auf 16-26 %.
  return effect.chance;
}

// castManaCost: ENTFERNT (Zauberreserve, Chef-GO 28.08.2026) — Zauber kosten nichts mehr.

/**
 * Emittiert für Schadens-DoTs (burn/bleed/poison) ~1×/Sekunde einen `dot`-Event (Floating-Text +
 * Chat), abgeleitet aus der überschrittenen Sekundengrenze von `remainingMs`. So füllt der
 * 100ms-Tick das Combat-Log nicht voll (sonst 10 Zeilen/Sek). `before` = remainingMs VOR dem
 * Dekrement. `amount` ≈ Schaden pro Sekunde (magnitude), gerundet und mind. 1; `status` = die
 * DoT-Art (der Renderer unterscheidet Text/Icon/Farbe darüber — bestehendes dot/status-Muster,
 * kein neuer Event-kind).
 *
 * E+-Paket (design/battle-040-dramaturgie.md §E+, Chef-GO 2026-08-03): vorher feuerte NUR burn —
 * bleed und poison verursachten Schaden ohne Log-Zeile (hieß emitBurnTick). Frost/Schock sind
 * keine Schadens-DoTs und emittieren weiterhin nichts. Log-only: kein RNG-Draw, keine Schadens-/
 * Timing-Änderung — offline==online bleibt byte-gleich (beide Pfade laufen durch combatStep).
 */
function emitDotTick(cs: CombatState, by: "player" | "enemy", e: StatusEffect, before: number, perSec = e.magnitude): void {
  if (e.type !== "burn" && e.type !== "bleed" && e.type !== "poison") return;
  if (Math.floor(before / 1000) === Math.floor(e.remainingMs / 1000)) return;
  pushLog(cs, { by, kind: "dot", amount: Math.max(1, Math.round(perSec)), status: e.type });
}

/**
 * Tickt die Gegner-Effekte (DoT, Ablauf) und liefert Frost-/Schock-Status.
 * `monster` optional (Aufrufer-Vertrag: combatStep übergibt das aktuelle Monster) — nur für den
 * Status-vs-Ward-Konter (STATUS_VS_WARD_MULT) gebraucht; fehlend ⇒ kein Bonus (Alt-Verhalten).
 */
function tickEnemyEffects(
  state: GameState,
  fx: SpecialEffects,
  monster?: MonsterDef,
  petKind?: ActivePetAbility["kind"],
  // claude:2026-10-18T12:00:00+02:00 — Narbenbuch-Schadensfaktor (talentDamageMult), vom Aufrufer mit content berechnet.
  talentDmgMult = 1,
  // claude:2026-10-25T05:40:00+02:00 — Raid-Set-Effekte/Wochen-Modifikator (combatMods); Default = keine (bit-identisch).
  cm: CombatMods = NO_COMBAT_MODS,
): { frost: boolean } {
  const cs = state.combat;
  let frost = false;
  // Per-Tick-Konstanten (Glut, Gift-Stapel, Begleiter, gutter/Narbenbuch, Status-vs-Ward, Set) — s. enemyDotCtx.
  const ctx = enemyDotCtx(state, fx, monster, petKind, talentDmgMult, cm);
  for (const e of cs.enemyEffects) {
    let perSec = e.magnitude;
    const rate = enemyDotRate(cs, ctx, e);
    if (rate) {
      perSec = rate.perSec;
      cs.enemyHp -= rate.total * (TICK_MS / 1000);
    } else if (e.type === "frost") frost = true;
    // shock/void: keine Tick-Wirkung — Verzögerung passiert bei der Anwendung, Entzug ist ein
    // Multiplikator im Schadenspfad (voidWeakenMult).
    const before = e.remainingMs;
    e.remainingMs -= TICK_MS;
    emitDotTick(cs, "player", e, before, perSec); // DoT am Gegner → vom Spieler verursacht
  }
  cs.enemyEffects = cs.enemyEffects.filter((e) => e.remainingMs > 0);
  tickElementalSide(cs, "enemy", cs.enemyEffects);
  // claude:2026-10-25T05:40:00+02:00 — Raid-Sets (Spec §6.1): Zinsfeuer zählt die Zeit, die der Gegner ohne Unterbrechung brennt,
  // und verfällt mit dem Brand; Offene-Wunden-Stapel enden mit der Blutung. Ohne Set/Zähler kein Zugriff.
  const ec = cs.effectCounters;
  if (cm.set?.fireInterest) {
    const burning = hasStatus(cs.enemyEffects, "burn");
    if (burning) effectCounters(cs).fireInterestMs = (cs.effectCounters?.fireInterestMs ?? 0) + TICK_MS;
    else if (ec?.fireInterestMs) ec.fireInterestMs = 0;
  } else if (ec?.fireInterestMs) ec.fireInterestMs = 0;
  if (ec?.bleedStacks && !hasStatus(cs.enemyEffects, "bleed")) ec.bleedStacks = 0;
  return { frost };
}

/**
 * Tickt die Spieler-Effekte und lässt sie ablaufen. Spiegelt die Gegner-Logik:
 * Gift/Brennen/Blutung = DoT (ignoriert Rüstung), Frost verlangsamt, Schock setzt aus.
 * Liefert Frost-/Schock-Status für den Spieler-Angriffs-Timer.
 */
function tickPlayerEffects(
  state: GameState,
  content: ContentDB,
  nowMs?: number,
  fx?: SpecialEffects,
  // claude:2026-10-25T05:40:00+02:00 — aufgelöste Gegner-Instanz (Raid/Paragon/Elite) für die Vitality-Level-Bandbreite; fehlt ⇒ Content.
  enemy?: MonsterDef,
): { frost: boolean } {
  const cs = state.combat;
  let frost = false;
  // Symmetrie (Elementar-Effekte): Glut und Gift-Stapel wirken auf den Spieler wie auf den Gegner.
  const vuln = burnVulnMult(cs.playerEffects);
  const poisonStacks = poisonStacksOf(cs, "player");
  for (const e of cs.playerEffects) {
    let perSec = e.magnitude;
    if (e.type === "poison" || e.type === "burn" || e.type === "bleed") {
      perSec = e.magnitude * (e.type === "poison" ? poisonStacks : 1) * vuln;
      const dmg = perSec * (TICK_MS / 1000);
      // claude:2026-10-25T19:55:00+02:00 — Chef-Entscheid 1.4.0 Welle 5: Status geht nicht mehr am Ward vorbei, sondern beschädigt ihn
      // (wie ein Treffer, STEP 7): erst der Ward-Pool, der Rest auf die HP. Gegnerseite bleibt unberührt (Status-vs-Ward-Konter).
      const wardRes = absorbWard(state.character.ward, dmg);
      state.character.ward = wardRes.ward;
      state.character.hp -= wardRes.hpDamage;
      if (wardRes.absorbed > 0) addXp(state, content, "warding", wardRes.absorbed * WARDING_XP_PER_ABSORB, nowMs);
      // Überleben härtet ab — aber seit Chef-Entscheid (2026-07-08) mit derselben Level-Bandbreite
      // wie alle Kampf-XP: am über-levelten Trivial-Mob gibt auch Erleiden keine Vitality-XP mehr.
      const dotMonster = enemy ?? (cs.monsterId ? content.monsters[cs.monsterId] : undefined);
      const dotVitMult = dotMonster
        ? combatXpLevelMult(levelFromXp(state.skills.vitality?.xp ?? 0), dotMonster.level)
        : 1;
      addXp(state, content, "vitality", wardRes.hpDamage * VITALITY_XP_PER_DAMAGE * dotVitMult, nowMs, fx);
      // OSRS-Fix (Task #197): erlittener DoT-Schaden gibt KEINE Defence-/magic_def-XP mehr —
      // Verteidigung trainiert nur durchs Kämpfen in der Defensiv-Stance (ausgeteilter Schaden),
      // nicht durchs Einstecken.
    } else if (e.type === "frost") {
      frost = true;
    }
    // shock/void: keine Tick-Wirkung (s. tickEnemyEffects).
    const before = e.remainingMs;
    e.remainingMs -= TICK_MS;
    emitDotTick(cs, "enemy", e, before, perSec); // DoT am Spieler → vom Gegner verursacht
  }
  cs.playerEffects = cs.playerEffects.filter((e) => e.remainingMs > 0);
  tickElementalSide(cs, "player", cs.playerEffects);
  return { frost };
}

/**
 * Wendet einen vom Gegner ausgelösten Statuseffekt (z.B. Gift) auf den Spieler an.
 * Weisheit = Status-Widerstand (Zauberreserve und Weisheit, Chef-GO 28.08.2026, Spec §3): `r =
 * stats.statusResist` (min(0,4; 0,01·WIS aus den effektiven Attributen)) macht JEDEN Status auf den
 * Spieler um r kürzer (Dauer × (1 − r)) UND um r schwächer (Magnitude × (1 − r); für Schock: kürzere
 * Verzögerung, für Frost: ab 20 % Widerstand vier statt drei Anwendungen zum Einfrieren — beides in
 * onStatusApplied). Die Anwendungschance bleibt unverändert. Symmetrie (Spec §5): Gegner haben keine
 * Weisheit — applyEnemyStatus bleibt ungeschützt.
 */
function applyMonsterInflict(state: GameState, monster: MonsterDef, stats: DerivedStats): void {
  const inflict = monster.inflict;
  if (!inflict) return;
  // Anwendungschance wie bei Waffen-Procs (statusApplyChance: shock ⇒ magnitude) — Symmetrie-Pflicht.
  if (nextFloat(state.rng) > statusApplyChance(inflict)) return;
  const resist = clamp01(stats.statusResist);
  const durationMs = inflict.durationMs * (1 - resist);
  const magnitude = inflict.magnitude * (1 - resist);
  const existing = state.combat.playerEffects.find((e) => e.type === inflict.type);
  if (existing) {
    // Spiegelt die Refresh-Semantik der Gegnerseite (applyEnemyStatus): Magnitude/Rest-Dauer per
    // `max` zusammenführen — ein Refresh darf einen stärkeren/längeren bestehenden Effekt am Spieler
    // nie abschwächen (Symmetrie-Pflicht, vom status-coverage-Test eingefordert).
    existing.remainingMs = Math.max(existing.remainingMs, durationMs);
    existing.magnitude = Math.max(existing.magnitude, magnitude);
  } else {
    state.combat.playerEffects.push({
      type: inflict.type,
      remainingMs: durationMs,
      magnitude,
    });
  }
  // Elementar-Nachlauf am Spieler (Log + Einfrieren/Verzögerung/Stapel) — dieselben Regeln wie am
  // Gegner, nur dass der Weisheits-Widerstand Schock-Verzögerung und Frost-Schwelle mildert.
  onStatusApplied(state.combat, "player", inflict.type, !existing, resist);
}

/** 0..1-Klemme, NaN-fest (defekte Stats ⇒ 0 = kein Widerstand). */
function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

function performPlayerAttack(
  state: GameState,
  content: ContentDB,
  stats: DerivedStats,
  monster: MonsterDef,
  fx: SpecialEffects,
  nowMs?: number,
  cm: CombatMods = NO_COMBAT_MODS, // claude:2026-10-25T05:40:00+02:00 — Raid-Sets/Woche
): void {
  const profile = playerProfile(stats);

  let casts = false;
  // surplus (§2.1) prüft „Ward über X %" VOR dem Cast-Recharge (der Zauber selbst zehrt nicht am Bonus).
  const wardBeforeCast = state.character.ward;

  if (stats.style === "magic") {
    // Zauberreserve (Chef-GO 28.08.2026): Zauber kosten nichts — jeder Magie-Angriff ist ein echter
    // Cast (voller Magie-Schaden + Spell-Status). Der frühere Mana-Depletion-Loop mit dem „schwachen
    // Stab-Schlag" (×0.35) ist entfallen; er griff faktisch nie (Regen > Kosten).
    casts = true;
    // Ward-Recharge (Rüstungs-Trinität §1.4): jeder Cast lädt den Ward-Pool, gedeckelt auf maxWard.
    // claude:2026-10-25T19:00:00+02:00 — seit 1.4.0 Anteil des Maximums (castWardRecharge: 4 %, Boden WARD_RECHARGE_PER_CAST), vorher fest 1,2.
    state.character.ward = rechargeWard(state.character.ward, stats.maxWard, castWardRecharge(stats.maxWard));
  }
  // claude:2026-10-24T18:20:00+02:00 — Fernkampf (1.4.0 FK): Die Bogenspanne ist der Schaden mit einfachen Pfeilen. Ein echter Pfeil im
  // Köcher addiert seinen Bonus über computeStats und seinen Status über applyWeaponEffects; verbraucht wird er
  // NACH dem Schlag (auch beim Fehlschuss), damit dieser Schuss noch vom geladenen Pfeil kommt. Ohne Ladung kein
  // RNG-Zug (Alt-Sequenzen bleiben bit-gleich). Der doubleStrike-Zweitschlag ist kostenlos.

  strikeEnemy(
    state,
    content,
    stats,
    monster,
    fx,
    profile,
    { casts, wardBeforeCast, allowDoubleStrike: true, cm },
    nowMs,
  );
  // claude:2026-10-25T05:40:00+02:00 — Eintreibung (Ornat 5/5): jeder Zauber zählt, der `every`-te detoniert den Brand (nach dem Schlag).
  if (casts && cm.set?.fireCollection) tryFireCollection(state, content, stats, monster, fx, cm);
  if (stats.style === "ranged") consumeArrow(state, content, state.rng);
}

/** Kontext eines Einzelschlags (Ressourcen-Phase von performPlayerAttack). */
interface StrikeContext {
  casts: boolean;
  /** Eigener Ward VOR dem Cast-Recharge dieses Schlags (surplus liest ihn; Zauberreserve 28.08.2026). */
  wardBeforeCast: number;
  /** doubleStrike darf nur EINEN Zweitschlag auslösen (keine Kaskade). */
  allowDoubleStrike: boolean;
  /** claude:2026-10-25T05:40:00+02:00 — Raid-Sets/Wochen-Modifikator dieses Ticks (NO_COMBAT_MODS = keine). */
  cm: CombatMods;
}

/**
 * Ein aufgelöster Spieler-Schlag: Treffer-/Krit-/Mitigation-Wurf (resolveAttack) + konditionale
 * Spezial-Effekt-Mods (Waffen 2.0 §2) + Schadens-Anwendung, Lebensraub, XP, Status-Procs, Log.
 * Von performPlayerAttack (regulärer Angriff) und doubleStrike (kostenloser Zweitschlag) geteilt.
 */
function strikeEnemy(
  state: GameState,
  content: ContentDB,
  stats: DerivedStats,
  monster: MonsterDef,
  fx: SpecialEffects,
  profile: AttackProfile,
  ctx: StrikeContext,
  nowMs?: number,
): void {
  const cs = state.combat;
  // Zähler nur materialisieren, wenn überhaupt Spezial-Effekte ausgerüstet sind (Alt-Content-Fast-Path).
  const ec = hasSpecialEffects(fx) ? effectCounters(cs) : null;

  // eagleEye (§2.1): der erste Treffer der Begegnung ist garantiert kritisch (Misses verbrauchen
  // die Garantie nicht — der erste GELANDETE Schuss zündet sie).
  profile.forceCrit = !!(fx.eagleEye && ec && !ec.firstHitDone);

  // Konter-Achsen (Combat-Depth §3.2, disjunkt — jeder Konter trifft GENAU EINE Gegner-Achse):
  //  · Precision senkt NUR die Gegner-Evasion (Accuracy-Contest in resolveAttack) → mehr Treffer.
  //  · Armor-Pen senkt NUR den Mitigations-Input effDef (K bleibt unberührt) → weniger Reduktion.
  // Beide klemmt computeStats auf ihren Cap (0..0.6); bei 0 (kein Konter-Gear) sind effEva/effDef
  // == monster.evasion/defense → RNG- und Schadens-bit-identisch zum Alt-Verhalten. Der Ward-Konter
  // (Ward-Break) greift NICHT hier, sondern erst nach der Mitigation im Ward-Absorb-Schritt unten.
  // claude:2026-10-25T05:40:00+02:00 — Offenes Zeughaus (Raid §7): armorPen ×2, Deckel ARMOR_PEN_CAP bleibt. Schleichende Seuche
  // (Pirschgewand 4/5, §6.1): je Gift-Stapel auf dem Ziel `perStack` der (Rest-)Rüstung ignoriert. Ohne beides die alte Rechnung.
  const cm = ctx.cm;
  const armorPen = cm.modifier === "open_armory" ? Math.min(ARMOR_PEN_CAP, stats.armorPen * 2) : stats.armorPen;
  let effDefense = monster.defense * (1 - armorPen);
  const plague = cm.set?.creepingPlague;
  if (plague && hasStatus(cs.enemyEffects, "poison")) {
    const ignore = Math.min(1, Math.max(0, (plague.perStack ?? 0) * poisonStacksOf(cs, "enemy")));
    if (ignore > 0) effDefense *= 1 - ignore;
  }
  const result = resolveAttack(state.rng, profile, {
    evasion: monster.evasion * (1 - stats.precision),
    defense: effDefense,
  });
  if (!result.hit) {
    pushLog(cs, { by: "player", kind: "miss", amount: 0 });
    return;
  }

  // — Konditionale Schadens-Mods (§2.3.3): MULTIPLIKATIV auf den Einzelschlag, kommutativ —
  // jede Bedingung wird gegen den Zustand VOR diesem Treffer geprüft (enemyHp/eigene HP/Status).
  let mult = 1;
  if (ec) {
    if (fx.execute && cs.enemyHp < monster.maxHp * (fx.execute.threshold ?? 0.2)) {
      mult *= 1 + fx.execute.magnitude;
    }
    if (fx.giantSlayer && monster.level > combatLevel(state)) mult *= 1 + fx.giantSlayer.magnitude;
    // bane (Bane-System #213): +Anteil gegen Monster der getaggten Familie (z.B. undead).
    // Ungetaggte Monster (family undefined) matchen NIE; targetFamily-Guard hält auch defekten
    // Content (bane ohne targetFamily) inert statt gegen undefined===undefined zu zünden.
    if (fx.bane?.targetFamily && monster.family === fx.bane.targetFamily) {
      mult *= 1 + fx.bane.magnitude;
    }
    if (fx.desperation && state.character.hp < stats.maxHp * (fx.desperation.threshold ?? 0.3)) {
      mult *= 1 + fx.desperation.magnitude;
    }
    if (fx.bounty && state.slayerTask?.monsterId === monster.id) mult *= 1 + fx.bounty.magnitude;
    if (fx.firstBlood && cs.enemyHp >= monster.maxHp) mult *= 1 + fx.firstBlood.magnitude;
    if (fx.frostbite && cs.enemyEffects.some((e) => e.type === "frost")) {
      mult *= 1 + fx.frostbite.magnitude;
    }
    // surplus (Überschuss, §2.1) — Zauberreserve 28.08.2026: liest jetzt den EIGENEN Ward-Anteil (vorher
    // den Mana-Anteil, der ohne Verbrauch immer 100 % wäre ⇒ der Effekt wäre bedingungslos). Ohne
    // Stoff-Pool (maxWard 0) inaktiv; Ward VOR dem Cast-Recharge dieses Schlags.
    if (
      fx.surplus &&
      stats.style === "magic" &&
      ctx.casts &&
      stats.maxWard > 0 &&
      ctx.wardBeforeCast > stats.maxWard * (fx.surplus.threshold ?? 0.8)
    ) {
      mult *= 1 + fx.surplus.magnitude;
    }
    if (fx.firstStrike && !ec.firstHitDone) {
      // magnitude = Zusatz-Anteil (1 = ×2); 0/fehlend fällt auf den Spec-Default ×2 zurück.
      mult *= 1 + (fx.firstStrike.magnitude > 0 ? fx.firstStrike.magnitude : 1);
    }
    if (fx.momentum && ec.momentumStacks > 0) mult *= 1 + ec.momentumStacks * fx.momentum.magnitude;
    if (fx.everyNth) {
      const n = Math.max(2, Math.round(fx.everyNth.stacks ?? 5));
      if ((ec.hitCount + 1) % n === 0) mult *= 1 + fx.everyNth.magnitude;
    }
    if (fx.vengeance && ec.vengeancePrimed) {
      mult *= 1 + fx.vengeance.magnitude;
      ec.vengeancePrimed = false; // verbraucht — zündet nicht doppelt
    }
  }
  // claude:2026-10-25T05:40:00+02:00 — Raid (Spec §6.1/§7), multiplikativ wie die Spezial-Mods; ohne Set/Woche kein Faktor:
  //  · Zinsfeuer (Ornat 4/5): echter Zauber × (1 + perStack · Zinsstufen).
  //  · Geliehenes Feuer (Woche): Treffer einer Waffe mit magicTheme "fire" × 1,10.
  //  · Offene Wunden (Blutschwur 4/5): kritischer Treffer × (1 + perStack · Blutungs-Stapel), NACH dem Krit-Deckel
  //    (resolveAttack hat critDamage schon gedeckelt angewandt).
  if (cm !== NO_COMBAT_MODS) {
    const interest = stats.style === "magic" && ctx.casts ? fireInterestStacks(cs, cm) : 0;
    if (interest > 0) mult *= 1 + (cm.set?.fireInterest?.perStack ?? 0) * interest;
    if (cm.modifier === "borrowed_fire") {
      const weaponId = state.character.equipment.mainhand;
      if (weaponId && content.items[weaponId]?.magicTheme === "fire") mult *= 1.1;
    }
    const ow = cm.set?.openWounds;
    const bleedStacks = cs.effectCounters?.bleedStacks ?? 0;
    if (result.crit && ow && bleedStacks > 0 && hasStatus(cs.enemyEffects, "bleed")) {
      mult *= 1 + (ow.perStack ?? 0) * bleedStacks;
    }
  }
  // critBurst (Funkenschlag, §2.1): FLACHER Zusatzschaden bei Krit (nach Mitigation, unmitigiert drauf).
  const critFlat = result.crit && fx.critBurst ? Math.max(0, fx.critBurst.magnitude) : 0;
  let damage = Math.max(1, Math.round(result.damage * mult + critFlat));

  // Elementar-Effekte (Chef-GO 28.08.2026): Entzug am ANGREIFER (Spieler mit void-Status schlägt
  // VOID_WEAKEN schwächer) und Glut am ZIEL (brennender Gegner nimmt BURN_VULNERABILITY mehr) —
  // multiplikativ nach den Spezial-Mods, vor Pet-Vuln/Ward. Beide 1 ohne Status ⇒ bit-identisch.
  const elementalMult = voidWeakenMult(cs.playerEffects) * burnVulnMult(cs.enemyEffects);
  if (elementalMult !== 1) damage = Math.max(1, Math.round(damage * elementalMult));
  // claude:2026-10-18T00:30:00+02:00 — Talent `familyDamage` (Jagdbuch „Wissen“): +Anteil gegen
  // Familien, deren erreichbare Monster alle ≥ 1 Kill im Bestiarium haben. Ohne Talent kein Lookup.
  const familyBonus = monster.family ? talentEffect(state, content, "familyDamage") : 0;
  if (familyBonus > 0 && familyBestiaryComplete(state, content, monster.family!)) {
    damage = Math.max(1, Math.round(damage * (1 + familyBonus)));
  }
  // Waffeneffekt-Bedingung (auch für Lichtsegen/Überspringen unten): Magie nur bei echtem Zauber,
  // sonst bei jedem Treffer (#286: Fernkampf hat keine Munitions-Bedingung mehr).
  const appliesEffect = stats.style === "magic" ? ctx.casts : true;

  // armorRend-Pet (enemyVuln): der Gegner nimmt für ein Fenster mehr Schaden.
  if (cs.petAbility.enemyVulnMs > 0) {
    damage = Math.max(1, Math.round(damage * (1 + cs.petAbility.enemyVulnPct)));
  }

  // — Gegner-Ward-Absorb (Combat-Depth §3.2, Schritt 4): NACH Mitigation/allen Schadens-Mods, VOR
  //   dem HP-Abzug. Lazy-Init deckt Alt-Saves ab, die mitten im Kampf ohne `enemyWard` geladen wurden
  //   (der Load-Pfad verwirft das transiente Feld) — dann startet der Pool frisch auf `wardCapacity`.
  //   Deterministisch, KEIN RNG-Draw; für wardCapacity-0-Gegner (Melee/Range) ist die ganze Passage
  //   ein No-op (Pool 0 ⇒ Bedingung false ⇒ `damage` unverändert = bit-identisch zum Alt-Verhalten).
  //
  //   Combat-Feel v2 #2a — ADDITIVES Ward-Break (der eigentliche wardBreak-Fix): Der VOLLE Treffer
  //   drainт den Ward-Pool (`absorbed = min(ward, dmg)`), und `bleed = dmg·wardBreak` trifft die HP
  //   ZUSÄTZLICH als Bonus durch den Ward hindurch. Die alte Anteils-SPLIT-Formel (bleed→HP,
  //   dmg−bleed→Ward) war TTK-neutral (`Treffer = (HP+Ward)/dmg`, wardBreak kürzte sich raus). Additiv
  //   gilt `Treffer bis Kill = (HP + Ward·(1−wardBreak))/dmg` → wardBreak SPART `Ward·wardBreak/dmg`
  //   Treffer und skaliert mit der Pool-Größe. Der Cap WARD_BREAK_CAP=0,75 (<1) hält den Ward nie
  //   völlig wirkungslos (Pool behält (1−wb) seiner effektiven HP). Solange der Ward steht, ist der
  //   HP-Schaden REIN das Durchbluten; nach dem Bruch kommt der Überlauf oben drauf.
  // wardAbsorbedThisHit (Chef-Fix nach Spieler-Report "Hollow Choir: I miss 9/10"): der von DIESEM
  // Schlag geschluckte Betrag, fürs Hit-Log — außerhalb des Blocks deklariert, damit pushLog unten
  // (die HP-Schaden-`amount` bleibt unverändert) ihn unabhängig vom Ward-Zweig lesen kann. Bleibt 0
  // (⇒ Log-Feld `absorbed` fehlt) für wardCapacity-0-Gegner (Melee/Range).
  let wardAbsorbedThisHit = 0;
  // Überspringen (Schock, s.u.) und Lichtsegen rechnen mit dem Treffer VOR dem Ward-Schritt.
  const preWardDamage = damage;
  if (cs.enemyWard === undefined) cs.enemyWard = monster.wardCapacity ?? 0;
  if (cs.enemyWard > 0) {
    // Lichtsegen (Aether, Kind lightblessing): Treffer durchdringen AETHER_WARD_PIERCE des Gegner-Wards —
    // als Boden auf den wardBreak-Stat (max), damit ein besserer Stat nicht verliert. Ohne das Kind
    // exakt stats.wardBreak (bit-identisch).
    const wardBreak = fx.lightblessing && appliesEffect ? Math.max(stats.wardBreak, AETHER_WARD_PIERCE) : stats.wardBreak;
    const bleed = damage * wardBreak; // Bonus-HP-Schaden, umgeht den Pool (additiv)
    const absorbed = Math.min(cs.enemyWard, damage); // der volle Treffer drainт den Ward-Pool
    cs.enemyWard = Math.max(0, cs.enemyWard - absorbed);
    wardAbsorbedThisHit = absorbed;
    const overflow = damage - absorbed; // Rest-Schaden nach dem Ward-Bruch (0 solange Pool ≥ dmg)
    // HP-Schaden = Durchbluten + Überlauf (auf ganze Zahl gerundet wie der Basiswurf). Voll absorbiert
    // OHNE Ward-Break ⇒ 0 (der Treffer landete, zehrte aber nur am Schild) — kein Min-1.
    damage = Math.max(0, Math.round(bleed + overflow));
  }

  cs.enemyHp -= damage;
  grantOffenseXp(state, content, stats.style, monster, damage, nowMs, fx);
  // Gift am Spieler (Elementar-Effekte): halbiert seinen Lebensraub (Stil UND Gear), solange Gift liegt.
  const sustain = poisonSustainMult(cs.playerEffects);
  if (stats.style === "melee") {
    // Lebensraub: Anteil des Schadens, je Treffer doppelt gedeckelt — prozentual (kein Burst-
    // Vollheal im Frühgame) UND absolut (skaliert nicht mit der riesigen Endgame-HP mit, sonst
    // voll-heilt Lifesteal die Boss-Schläge weg). Effektiver Deckel = min beider.
    // Stat-Squish ÷10 (Spec §3.2): Heil-Raster von Ganzzahl auf 1 Dezimale — bei Treffern von
    // 1–6 wäre round(dmg·0.08) sonst immer 0 und der Melee-Lebensraub unterhalb des Midgames
    // TOT (vorher hießen dieselben Treffer 10–60 → 1–5 HP). 1 Dezimale = altes Raster ÷10.
    const cap = Math.min(
      Math.round(stats.maxHp * MELEE_LIFESTEAL_CAP_PCT * 10) / 10,
      MELEE_LIFESTEAL_CAP_ABS,
    );
    // Gift halbiert den TATSÄCHLICHEN Raub (nach dem Deckel, sonst bliebe die Halbierung am Deckel unsichtbar).
    const heal = Math.round(Math.min(cap, Math.round(damage * MELEE_LIFESTEAL * 10) / 10) * sustain * 10) / 10;
    // E+-Paket (battle-040-dramaturgie §E+, Chef-GO 2026-08-03): der Stil-Lebensraub heilte STUMM —
    // nur der Gear-Lebensraub (unten) loggte. Jetzt dieselbe lifesteal-Event-Emission mit
    // unterscheidbarer Quelle (source "meleeLifesteal"). Geloggt wird der TATSÄCHLICH geheilte
    // Betrag (vorher/nachher-Differenz, 1-Dezimal-Raster wie der Gear-Pfad — kein Overheal in der
    // Anzeige); bei vollen HP oder heal 0 (voll ward-absorbierter Treffer) KEIN Event (keine
    // Geister-Zeilen). Log-only: die HP-Anwendung selbst ist byte-identisch zum Vorher-Zustand,
    // kein RNG-Draw — offline==online unberührt.
    const hpBeforeLifesteal = state.character.hp;
    state.character.hp = Math.min(stats.maxHp, state.character.hp + heal);
    const meleeHealed = Math.round((state.character.hp - hpBeforeLifesteal) * 10) / 10;
    if (meleeHealed > 0) {
      pushLog(cs, { by: "player", kind: "lifesteal", amount: meleeHealed, source: "meleeLifesteal" });
    }
  }
  // Gear-Lebensraub (ALLE Stile, aus Ausrüstung/Set/Buffs): Anteil des Schadens heilt den Spieler.
  // Eigenes, sichtbares Heil-Event (grüne Zahl + Lebensraub-Icon im Renderer). Auf fehlende HP
  // gedeckelt, damit der gezeigte Wert dem tatsächlich Geheilten entspricht (kein Overheal).
  // Stat-Squish ÷10: 1-Dezimal-Raster analog zum Melee-Lebensraub (min 0.1 statt min 1).
  if (stats.lifestealPct > 0 && damage > 0) {
    const missing = Math.max(0, Math.round((stats.maxHp - state.character.hp) * 10) / 10);
    let heal = Math.min(
      Math.max(0.1, Math.round(damage * stats.lifestealPct * 10) / 10),
      missing,
    );
    if (sustain !== 1) heal = Math.round(heal * sustain * 10) / 10; // Gift: halber Raub (nach Deckel/Rest)
    if (heal > 0) {
      state.character.hp = Math.min(stats.maxHp, state.character.hp + heal);
      pushLog(cs, { by: "player", kind: "lifesteal", amount: heal, source: "lifesteal" });
    }
  }
  // manaDrain (Zermürbung): ENTFERNT (Zauberreserve 28.08.2026) — Mana wird nicht verbraucht, ein
  // Mana-Rückfluss je Treffer wäre wirkungslos. Träger-Items sind auf wardSiphon umgestellt/bereinigt.
  // wardSiphon (elite-balance-spec.md §5, hollowveil_locket): Anteil des soeben verursachten
  // Schadens (post-Mitigation, derselbe `damage` wie Lebensraub oben) füllt den eigenen Ward-Pool.
  // Still (kein pushLog — Ressourcen-Rückfluss-Familie loggt nicht, nur HP-Heal
  // tut das). Auf maxWard gedeckelt; ohne Stoff-Pool (maxWard=0) ein reiner No-op.
  // claude:2026-10-17T20:00:00+02:00 — K1: tatsächlich aufgefüllter Siphon-Ward fließt in die Annotation wardRestored
  let wardSiphonRestored = 0;
  if (fx.wardSiphon && damage > 0 && stats.maxWard > 0) {
    const siphonBefore = state.character.ward;
    state.character.ward = Math.min(
      stats.maxWard,
      state.character.ward + Math.max(0, damage * fx.wardSiphon.magnitude),
    );
    wardSiphonRestored = state.character.ward - siphonBefore;
  }
  // Lichtsegen (Aether, Elementar-Effekte): jeder gelandete Zauber füllt einen Anteil des EIGENEN
  // Ward-Maximums (magnitude; 0 ⇒ AETHER_WARD_ON_HIT). Ohne Stoff-Pool (maxWard 0) ein No-op; Magie nur
  // bei echtem Zauber (appliesEffect). review-1.2.0 P2 (29.08.2026): war still wie wardSiphon, steht jetzt
  // LEISE im Protokoll — als Annotation `wardRestored` des Treffer-Ereignisses unten (Muster absorbed/
  // mitigated), NICHT als eigenes kind "status": ein neues Status-Literal würde im Renderer als „Status
  // auf den Gegner gelegt" laufen (Partikel/Floater/i18n `status.<typ>`, typisierte StatusType-Senken)
  // und jede Zauber-Zeile verdoppeln. Geloggt wird der TATSÄCHLICH aufgefüllte Ward (1-Dezimal-Raster wie
  // der Lebensraub, kein Overheal); bei vollem Ward fehlt das Feld (keine Geister-Angaben). Log-only:
  // Ward-Anwendung und RNG bleiben byte-identisch.
  let lightblessingWard = 0;
  if (fx.lightblessing && appliesEffect && stats.maxWard > 0) {
    const share = fx.lightblessing.magnitude > 0 ? fx.lightblessing.magnitude : AETHER_WARD_ON_HIT;
    const wardBefore = state.character.ward;
    state.character.ward = Math.min(stats.maxWard, state.character.ward + stats.maxWard * share);
    lightblessingWard = Math.round((state.character.ward - wardBefore) * 10) / 10;
  }
  // Zähler-Fortschreibung je gelandetem Treffer (§2.3.4).
  if (ec) {
    ec.firstHitDone = true;
    if (fx.everyNth) ec.hitCount += 1;
    if (fx.momentum) {
      const maxStacks = Math.max(1, Math.round(fx.momentum.stacks ?? 10));
      ec.momentumStacks = Math.min(maxStacks, ec.momentumStacks + 1);
    }
  }
  // claude:2026-10-25T05:40:00+02:00 — Ausbruch/Blutzoll (5/5): Stand VOR den Status-Procs dieses Treffers (der Treffer, der den
  // vollen Stapel erst legt, löst noch nicht aus). Nur mit Set; der Rest des Schlags läuft unverändert.
  if (cm.set && cs.enemyHp > 0) trySetDetonations(state, content, stats, monster, fx, cm);
  // Waffeneffekt: Magie an echten Zauber gekoppelt, sonst bei jedem Treffer (#286: Fernkampf hat
  // keine Munitions-Bedingung mehr — jeder Schuss ist scharf und trägt den Effekt).
  if (appliesEffect) applyWeaponEffects(state, content, monster, fx, cm);

  // Combat-Log-Anreicherung (Task #220): der geloggte `damage` (amount) ist bereits post-Mitigation.
  // `rawDamage` rekonstruiert proportional den Schaden VOR der effDef-Reduktion (reduction aus
  // resolveAttack — kein zusätzlicher RNG-Draw), `mitigated` = der von der Gegner-Rüstung geschluckte
  // Betrag. Es gilt `rawDamage − mitigated === amount`. Gegen einen defense-0-Gegner ist reduction 0
  // ⇒ rawDamage === amount ⇒ mitigated 0; gegen einen Rüstungs-Gegner mitigated > 0. Die 1−reduction-
  // Division ist sicher (reduction ≤ DEFENSE_MITIGATION_MAX < 1); der Guard hält auch defekte Werte inert.
  const reduction = result.reduction;
  const rawDamage =
    reduction > 0 && reduction < 1 ? Math.round(damage / (1 - reduction)) : damage;
  const mitigated = Math.max(0, rawDamage - damage);
  pushLog(cs, {
    by: "player",
    kind: result.crit ? "crit" : "hit",
    amount: damage,
    rawDamage,
    mitigated,
    ...(wardAbsorbedThisHit > 0 ? { absorbed: wardAbsorbedThisHit } : {}),
    // claude:2026-10-17T20:00:00+02:00 — K1: Lichtsegen + Ward-Siphon summiert, 1-Dezimal-Raster, nichts bei vollem Ward
    ...(Math.round((lightblessingWard + wardSiphonRestored) * 10) / 10 > 0
      ? { wardRestored: Math.round((lightblessingWard + wardSiphonRestored) * 10) / 10 }
      : {}),
  });

  // Überspringen (Schock, Elementar-Effekte): ein KRITISCHER Treffer mit einer Schock-Waffe (Status-
  // Liste der Mainhand enthält shock — Basis oder Enchant-Proc) springt über und trifft ein zweites
  // Mal für SHOCK_ARC_FRACTION des Treffers VOR dem Ward-Schritt; der Blitz umgeht den Gegner-Ward und
  // geht direkt auf die HP. Deterministisch (kein Proc-Wurf, kein RNG), keine XP (reiner Bonus).
  // Nur wenn der Gegner den Haupttreffer überlebt hat. Log: eigenes Merkmal `hitKind: "shockArc"`
  // (review-1.2.0 P2, 29.08.2026 — vorher ein nacktes "hit", das im Renderer als zweites „Du triffst"
  // mit vollem zweiten Geschoss lief); `kind` bleibt "hit", damit Floater/Filter/Alt-Clients weiterlaufen.
  // Spieler-Report 31.08.2026: „For characters that ignore status effects, Shock works, but Ice and
  // Poison don't." Genau so war es: JEDE andere Elementar-Wirkung laeuft ueber `applyEnemyStatus`
  // und damit durch `monsterResists`. Der Schock-Bogen zieht dem Gegner aber direkt Lebenspunkte ab
  // und fragte nur, ob die WAFFE Schock traegt — nie, ob das Ziel dagegen immun ist. Ein Gegner mit
  // Schock-Immunitaet bekam den Bogen bei jedem Krit trotzdem ab.
  if (
    result.crit &&
    appliesEffect &&
    cs.enemyHp > 0 &&
    preWardDamage > 0 &&
    weaponHasShock(state, content) &&
    !monsterResists(monster, "shock")
  ) {
    const arc = Math.max(1, Math.round(preWardDamage * SHOCK_ARC_FRACTION));
    cs.enemyHp -= arc;
    pushLog(cs, { by: "player", kind: "hit", amount: arc, hitKind: "shockArc" });
  }

  // doubleStrike (Doppelschlag, Palette-Hook — Content folgt später): Chance auf einen sofortigen
  // Zweitschlag mit voller Treffer-/Krit-/Effekt-Auflösung, aber OHNE erneuten Cast-Recharge
  // und ohne Kaskade (der Zweitschlag kann keinen dritten auslösen).
  if (
    ctx.allowDoubleStrike &&
    fx.doubleStrike &&
    cs.enemyHp > 0 &&
    nextFloat(state.rng) < fx.doubleStrike.chance
  ) {
    strikeEnemy(state, content, stats, monster, fx, profile, { ...ctx, allowDoubleStrike: false }, nowMs);
  }
}

// endCombatOutOfAmmo / bestInventoryAmmo / stopIfOutOfAmmo: ENTFERNT (#286 Ammo-Removal).
// Es gibt keine Munition mehr — Fernkampf feuert immer (Pfeilschaden seit #287 in der Bogen-Spanne
// eingebacken), der "outOfAmmo"-Stopp und der Köcher-Auto-Reload sind ersatzlos gestorben.
// (`stopReason: "outOfAmmo"` wird von der Engine nie mehr gesetzt; das Typ-Literal lebt nur noch
// als Renderer-Brücke bis Stage C, siehe shared.)

/** Läuft gerade der Kill-Cooldown? (Kampf pausiert; combatStep tickt ihn im Cooldown-Zweig herunter.) */
function killCooldownActive(cs: CombatState): boolean {
  return (cs.cooldownRemainingMs ?? 0) > 0;
}

/**
 * Spieler-seitiger Tick-Unterhalt: Zauberreserve-Abgleich + HP-Regeneration (Ausrüstung/Set/Buffs)
 * und Kappen aufs (evtl. gesunkene) Maximum. Läuft im aktiven Kampf UND während des Kill-Cooldowns
 * (die Verschnaufpause heilt weiter — Teil des „Kampf entschleunigen"-Designs). Kein RNG.
 */
/**
 * Reserve-/HP-Unterhalt für EINEN Tick (deterministisch, kein RNG), gedeckelt aufs Maximum.
 * EINE Quelle der Wahrheit für Kampf- UND Idle-Tick (tick.ts `step` ruft sie pro Tick außerhalb
 * des Kampfes — Sweep6 T7-F2: vorher rechnete `advance` den Idle-Regen 1× NACH der Tick-Schleife
 * mit den END-Stats, wodurch ein im Fenster ablaufender Regen-Buff offline 0 Heilung brachte).
 * Zauberreserve (Chef-GO 28.08.2026): `character.mana` wird nicht mehr verbraucht/regeneriert,
 * sondern jeden Tick auf `stats.maxMana` gehalten (Save-Kompat; die UI zeigt stats.maxMana).
 * HP-Regen kommt NUR aus `hpRegenPerSec` (Ausrüstung/Set/Buffs) — natürliche Regeneration ist
 * entfernt (Chef-Entscheid 2026-07-02). Klemmt HP zusätzlich nach unten, falls ein +maxHp-Buff
 * gerade abgelaufen ist.
 */
export function tickPlayerRegen(state: GameState, stats: DerivedStats): void {
  state.character.mana = Number.isFinite(stats.maxMana) ? Math.max(0, stats.maxMana) : 0;
  // HP-Regeneration über Zeit aus Ausrüstung/Set/Buffs (z.B. Regenerations-Food). Wirkt auch im
  // Kampf jeden Tick (deterministisch, kein RNG), gedeckelt aufs Maximum. 0 ohne Quelle → kein Effekt.
  if (stats.hpRegenPerSec > 0 && state.character.hp < stats.maxHp) {
    state.character.hp = Math.min(
      stats.maxHp,
      state.character.hp + stats.hpRegenPerSec * (TICK_MS / 1000),
    );
  }
  if (state.character.hp > stats.maxHp) state.character.hp = stats.maxHp;
}

/**
 * FIX B (Task #259): Kampf-seitiger Regen-Tick MIT sichtbarer grüner Heil-Zeile im Combat-Log. Ruft die
 * geteilte `tickPlayerRegen` (heilt aus `hpRegenPerSec` = Draughts/Tonika/Gear) und schreibt bei
 * TATSÄCHLICHER Heilung ein `heal`-Event — throttled auf ~1×/Sek über die `state.totalTicks`-
 * Sekundengrenze (analog `emitDotTick`; ungedrosselt wären es 10 Zeilen/Sek). `amount` = Sekunden-Regen
 * (`round(hpRegenPerSec)` — konsistent zur DoT-Zeile, die ebenfalls die Magnitude/Sek zeigt), min 1;
 * nur wenn dieser Tick real geheilt hat. Deterministisch (totalTicks ist persistierter, monoton
 * steigender State — gleicher Seed ⇒ gleiche Log-Kadenz, auch über Save/Load). NUR im Kampf: der Idle-
 * Regen in tick.ts ruft weiter direkt `tickPlayerRegen`, damit außerhalb des Kampfes kein Combat-Log
 * anfällt. `source: "effect"` (Task-#220-Union) taggt es als „sonstiger Heil-Effekt" — grün färbt der
 * Renderer bereits über `kind: "heal"`.
 */
function tickCombatRegen(state: GameState, stats: DerivedStats): void {
  // Gift am Spieler (Elementar-Effekte): HP-Regeneration × POISON_REGEN_MULT, solange Gift liegt. Nur
  // der Kampf-Pfad (der Idle-Regen in tick.ts ruft tickPlayerRegen direkt; außerhalb des Kampfes gibt
  // es keine Gift-Status — die verfallen bei Kampfende). Ohne Gift dasselbe stats-Objekt (bit-identisch).
  const sustain = poisonSustainMult(state.combat.playerEffects);
  const effStats = sustain !== 1 ? { ...stats, hpRegenPerSec: stats.hpRegenPerSec * sustain } : stats;
  const hpBefore = state.character.hp;
  tickPlayerRegen(state, effStats);
  if (state.character.hp <= hpBefore) return; // voll / kein hpRegenPerSec → nichts zu loggen
  if (state.totalTicks % (1000 / TICK_MS) !== 0) return; // ~1×/Sek drosseln (10 Ticks = 1 s)
  const perSec = Math.round(effStats.hpRegenPerSec);
  if (perSec > 0) {
    pushLog(state.combat, { by: "player", kind: "heal", amount: perSec, source: "effect" });
  }
}

/**
 * Ward-Regeneration für EINEN Kampf-Tick (Armor-Iteration 2 §9.2): der Warding-Skill treibt
 * `stats.wardRegenPerSec` (×1.5 in der Defensiv-Magie-Stance, siehe computeStats), ADDITIV zum
 * Cast-Recharge (`rechargeWard`). Analog zu hpRegenPerSec, aber bewusst KAMPF-scoped: Ward ist eine
 * Kampf-Ressource (bei Start/Welle/Respawn gesetzt) — im Idle-Tick regeneriert sie NICHT (tickPlayerRegen
 * bleibt für den Idle-Pfad ward-frei). Nur wenn ein Stoff-Pool existiert (maxWard>0) und er nicht voll
 * ist. Deterministisch, kein RNG. claude:2026-10-25T19:00:00+02:00 — der Haupt-Zufluss ist seit 1.4.0 der Cast-Recharge (4 % des Maximums je
 * Zauber, castWardRecharge); der Warding-Regen (≤2.0/s) bleibt die kleine Grundlast.
 */
function tickWardRegen(state: GameState, stats: DerivedStats): void {
  if (stats.wardRegenPerSec <= 0 || stats.maxWard <= 0) return;
  if (state.character.ward >= stats.maxWard) return;
  state.character.ward = Math.min(
    stats.maxWard,
    state.character.ward + stats.wardRegenPerSec * (TICK_MS / 1000),
  );
}

/** Setzt das Stalemate-Tracking zurück (neuer Gegner / neue Welle / Respawn). */
function resetStalemate(cs: GameState["combat"]): void {
  cs.enemyHpLow = undefined;
  cs.noProgressMs = 0;
}

/**
 * Stalemate-Erkennung (ST1 + Dungeon-Rework-Spec §5.1.1): Verfolgt den niedrigsten je erreichten
 * GESAMT-Fortschrittswert (Gegner-HP + Gegner-Ward) der laufenden Begegnung. Sinkt er über
 * STALEMATE_NO_PROGRESS_MS NICHT weiter (Gegner-Regen ≥ DPS, oder zu hohe Evasion/Mitigation →
 * quasi 0 Netto-Schaden), wird der Kampf gestoppt (statt endlos still zu laufen).
 * Ein gewinnbarer (auch langsamer) Kampf erreicht laufend neue Tiefstwerte → kein Fehlalarm.
 *
 * P0-Ward-Fix (Spec §E1/§5.1.1): strikeEnemy leitet Schaden ZUERST in `enemyWard` — solange der
 * Pool steht, bewegt sich `enemyHp` bei Builds ohne wardBreak GAR NICHT. Die alte, rein HP-basierte
 * Metrik brach deshalb jeden Build unter ~28 DPS gegen Ward-Tanks (aether_wraith, Ward 1654) nach
 * 60 s fälschlich als „Patt" ab (idol_sanctum: 0/10-Clears für den BiS-99-Melee-Tank). Fortschritt
 * misst darum `enemyHp + enemyWard` gegen 1 % von `(maxHp + wardCapacity)`: reiner Ward-Abbau IST
 * Fortschritt; ein echtes Patt (weder HP noch Ward sinken) feuert weiterhin. Gegner-Ward regeneriert
 * nie (Voll-Pool nur je Encounter/Welle/Respawn) → die Summe kann nicht durch Ward-Refill „Fortschritt
 * vortäuschen". Ward-lose Gegner (wardCapacity 0/undefined): beide Terme 0 ⇒ bit-identisch zum alten
 * Verhalten. Deterministisch, KEIN RNG-Draw. Aufruf am Tick-Ende (Gegner lebt, Spieler lebt).
 */
function trackStalemate(cs: GameState["combat"], monster: MonsterDef): void {
  if (cs.monsterId === null) return;
  // Gesamt-Fortschritt = HP + Ward. `enemyWard` undefined (Alt-Save mitten im Kampf geladen, das
  // transiente Feld verwirft der Load-Pfad) fällt wie das strikeEnemy-Lazy-Init auf den Voll-Pool.
  const progress = cs.enemyHp + (cs.enemyWard ?? monster.wardCapacity ?? 0);
  const maxTotal = monster.maxHp + (monster.wardCapacity ?? 0);
  // enemyHpLow = Referenz-Tief (HP+Ward) des aktuellen Fensters (nicht jeder Mini-Dip!).
  if (cs.enemyHpLow === undefined) {
    cs.enemyHpLow = progress;
    cs.noProgressMs = 0;
    return;
  }
  // Spürbarer Fortschritt = HP+Ward mind. STALEMATE_MIN_PROGRESS_PCT·(maxHp+Ward) unter die Referenz
  // gesunken. Mikro-Schaden, den der Regen sofort zurückholt, zählt NICHT (sonst nie ein Patt erkennbar).
  if (progress <= cs.enemyHpLow - maxTotal * STALEMATE_MIN_PROGRESS_PCT) {
    cs.enemyHpLow = progress;
    cs.noProgressMs = 0;
    return;
  }
  cs.noProgressMs = (cs.noProgressMs ?? 0) + TICK_MS;
  if (cs.noProgressMs >= STALEMATE_NO_PROGRESS_MS) {
    cs.stopReason = "stalemate";
    cs.monsterId = null;
    cs.dungeonId = null;
    cs.encounterIndex = 0;
    // Paragonturm (§7): Patt im Turm = Abbruch OHNE Checkpoint-Verlust (wie Verlassen; der
    // TTK-Bruch gegen diesen Guard ist per Spec das zweite Ende der Endlos-Achse neben dem Tod).
    cs.paragonFloor = undefined;
    resetStalemate(cs);
  }
}

/**
 * Rückt den laufenden Kampf um genau einen Tick vor.
 * `nowMs` (Blessings of the Reach, s. tick.ts `advance`): das reale Kalender-„jetzt" DIESES Ticks —
 * optional, alle bestehenden Aufrufer/Tests laufen ohne (bit-identisch, s. blessing.ts `blessingMult`).
 */
export function combatStep(state: GameState, content: ContentDB, nowMs?: number): void {
  const cs = state.combat;
  if (cs.monsterId === null) return;

  // Paragonturm (§7, GRANT-Stelle 1/3): ein Turm-Kampf (paragonFloor gesetzt) löst seinen Gegner
  // über die synthetisch skalierte Monster-Instanz auf (deterministisch aus Etage + Basis-Id
  // rekonstruiert — überlebt Save/Load ohne Zusatz-State). Alle nachfolgenden Lese-Stellen
  // (damage/accuracy/maxHp/ward/enrage/regen/xp/gold/loot) nutzen dadurch automatisch die
  // skalierten Werte — KEINE weitere Multiplikator-Streuung im Kampfcode. Normale Kämpfe:
  // exakt der alte Pfad. Passt die Rotation nicht mehr zur monsterId (Content-Änderung/
  // Save-Edit) oder fehlt das Monster, endet der Kampf sauber (Checkpoint bleibt erhalten).
  // Elite-/World-Spawns (§Kill-Pfad, design/elite-spawns-concept.md): ein Elite-Kampf löst seinen
  // Gegner analog zum Paragonturm über eine synthetisch skalierte Instanz auf (eliteCombatMonster,
  // elites.ts). Reihenfolge egal (nie gleichzeitig gesetzt — startEliteCombat/startParagonFloor
  // verlangen beide `monsterId === null`, s. Invariante in CombatState).
  // claude:2026-10-25T05:50:00+02:00 — Raid (1.4.0 Welle 4): Reihenfolge Paragon → Elite → Raid → Content. raidCombatMonster
  // liefert außerhalb eines laufenden Raid-Kampfs undefined (dann exakt der alte Content-Pfad).
  const resolved = resolveCombatMonster(state, content);
  if (!resolved) {
    cs.monsterId = null;
    cs.paragonFloor = undefined; // defekte/verwaiste Turm-Etage sauber schließen (kein Verlust)
    cs.eliteVariantId = undefined; // defekte/verwaiste Elite-Variante sauber schließen (kein Verlust)
    return;
  }

  const stats = computeStats(state, content);
  // Spezial-Waffeneffekte (Waffen 2.0 §2) einmal pro Tick aggregieren — Alt-Content ohne
  // Spezial-Kinds liefert ein leeres Objekt (alle fx-Zweige unten sind dann No-ops).
  const fx = collectSpecialEffects(state, content);
  // claude:2026-10-25T05:50:00+02:00 — Raid-Set-Effekte + Wochen-Modifikator einmal je Tick (NO_COMBAT_MODS ohne beides).
  const cm = combatMods(state, content);
  // Bossphasen (Spec §3): `monster` ist ab hier die Instanz der aktiven Phase und wird nach jedem Schadensblock neu
  // abgeglichen (refreshPhase). Ohne Phasen ist sie `resolved` selbst.
  let monster = resolved;
  const refreshPhase = (): void => {
    if (cs.monsterId === resolved.id && cs.enemyHp > 0) monster = syncBossPhase(state, content, resolved, cm);
  };

  // Auto-Eat-/Auto-Trank-Cooldowns einmal pro Tick herunterzählen (vor allen tryAutoEat-/
  // tryAutoPotion-Aufrufen dieses Ticks).
  if (cs.autoEatCooldownMs && cs.autoEatCooldownMs > 0) {
    cs.autoEatCooldownMs = Math.max(0, cs.autoEatCooldownMs - TICK_MS);
  }
  if (cs.autoPotionCooldownMs && cs.autoPotionCooldownMs > 0) {
    cs.autoPotionCooldownMs = Math.max(0, cs.autoPotionCooldownMs - TICK_MS);
  }
  // claude:2026-10-23T16:30:00+02:00 — „Mahlzeit halten“ (1.4.0): einmal pro Kampf-Tick, auch in der Kill-Pause
  // (ein Buff ist kein Heil-Refill). Isst nur, wenn kein Mahlzeit-Buff läuft; ohne gewählte Mahlzeit ein No-op.
  tickMealKeep(state, content);

  // — Kill-Cooldown (Chef-Feature „Kampf entschleunigen"): Nach jedem Kill ruht der Kampf für
  //   KILL_COOLDOWN_MS (deterministisch tick-basiert → gilt aktiv, idle UND offline identisch).
  //   Der nächste Gegner steht bereits im State (voll geheilt), aber es greift KEINE Seite an;
  //   Angriffs-Timer, Gegner-Effekte, Pet-Ability und Stalemate-Tracking pausieren. Spieler-
  //   seitiger Unterhalt läuft weiter: passiver Regen (Ausrüstung/Buff) und DoTs (Gift tickt —
  //   Tod durch DoT bleibt möglich). `lastKill.expiresInMs` läuft mit ab.
  //
  //   Combat-Feel v2 #0 (Rüstung ab L45 zur Pflicht): Auto-Eat UND Auto-Trank feuern hier NICHT.
  //   Der 5 s-Cooldown war ein schadensfreies Gratis-Heil-Fenster — kein Gegner-Schaden fließt, aber
  //   die Heilpfade top-ten den Char zwischen den Mobs kostenlos auf (kein Kampf-Risiko dafür). Heilung
  //   nur noch im AKTIVEN Kampf (lebender Gegner, Schaden fließt); die Pause heilt nur passiv (Regen).
  //   Sobald der nächste Mob engaged, laufen Auto-Eat/Auto-Trank unten wieder normal. Effekt: der
  //   Kampfstart-HP nach einer Pause liegt jetzt am Trough des letzten Kampfes statt aufgefüllt →
  //   Attrition trägt sich zwischen den Mobs weiter, un-gerüstet on-level in den Tod (voll gerüstet
  //   hält die In-Combat-Heilung). Verifiziert per Wegwerf-Sim (siehe Bericht an CEO/Kontrolleur). —
  if (killCooldownActive(cs)) {
    tickCombatRegen(state, stats); // HP-/Mana-Regen + sichtbares HoT-Log (FIX B), auch in der Pause
    tickWardRegen(state, stats); // Warding-Regen läuft auch in der Kill-Cooldown-Verschnaufpause weiter
    tickPlayerEffects(state, content, nowMs, fx, resolved);
    tickSetCooldowns(cs); // claude:2026-10-25T05:50:00+02:00 — Ausbruch/Blutzoll-Abklingzeit läuft auch in der Pause
    // KEIN tryAutoEat/tryAutoPotion hier (s.o.) — der Gratis-Refill zwischen den Mobs ist gegatet.
    // Der Tod-durch-DoT-Check bleibt: ein im Cooldown weitertickender Gift-DoT kann jetzt töten.
    if (state.character.hp <= 0) {
      onPlayerDefeated(state, content, stats.maxHp);
      return;
    }
    cs.cooldownRemainingMs = Math.max(0, (cs.cooldownRemainingMs ?? 0) - TICK_MS);
    if (cs.lastKill) {
      cs.lastKill.expiresInMs = Math.max(0, cs.lastKill.expiresInMs - TICK_MS);
      if (cs.lastKill.expiresInMs <= 0) cs.lastKill = undefined; // Summary läuft mit dem Cooldown ab
    }
    if (cs.cooldownRemainingMs <= 0) cs.cooldownRemainingMs = undefined; // abgelaufen → Feld weg
    return;
  }

  // Munitions-Stopp: ENTFERNT (#286 Ammo-Removal) — Bögen feuern immer, es gibt nichts zu leeren.

  // claude:2026-10-25T05:50:00+02:00 — Set-Abklingzeiten und Phasen-Uhr (intervalRamp) laufen je aktivem Kampf-Tick; danach die
  // Phase mit den HP abgleichen (betritt Schwellen aus dem letzten Tick, leitet sie nach dem Laden still ab).
  tickSetCooldowns(cs);
  if (cs.bossPhase !== undefined && cs.bossPhase > 0) cs.bossPhaseMs = (cs.bossPhaseMs ?? 0) + TICK_MS;
  refreshPhase();

  // Mana-Regeneration + HP-Regeneration, gekappt aufs (evtl. gesunkene) Maximum. tickCombatRegen
  // ergänzt tickPlayerRegen um die sichtbare grüne HoT-Heil-Zeile (FIX B, throttled ~1×/Sek).
  tickCombatRegen(state, stats);
  // Ward-Regeneration (Warding-Skill, §9.2) — additiv zum Cast-Recharge, kampf-scoped.
  tickWardRegen(state, stats);

  // Gegner-Selbstheilung (solange er lebt) — macht den Kampf zum DPS-Check.
  // antiRegen (Wundbrand, §2.1): Ziele mit JEDEM aktiven DoT (burn/bleed/poison) regenerieren NICHT.
  // Sweep6 T2-F2: vorher zählten nur bleed|poison — skeleton_nekro (der Regen-Untote der Krypta)
  // resistet genau diese beiden, wodurch antiRegen auf der Grabstahlklinge an ihrem Kern-Ziel nie
  // greifen konnte. burn zählt jetzt mit (die Klinge bekommt parallel einen Burn-Proc, content-dev).
  if (monster.regen && cs.enemyHp > 0 && cs.enemyHp < monster.maxHp) {
    const wounded =
      fx.antiRegen &&
      cs.enemyEffects.some((e) => e.type === "burn" || e.type === "bleed" || e.type === "poison");
    if (!wounded) {
      // Gift (Elementar-Effekte): halbiert die Regeneration des vergifteten Ziels (POISON_REGEN_MULT).
      cs.enemyHp = Math.min(
        monster.maxHp,
        cs.enemyHp + monster.regen * poisonSustainMult(cs.enemyEffects) * (TICK_MS / 1000),
      );
    }
  }

  // Statuseffekte auf den Gegner (DoTs inkl. Glut/Gift-Stapel, Frost; Schock/Entzug wirken an ihren Stellen).
  // Nach jedem Kill-Pfad zusätzlich auf den frisch gestarteten Kill-Cooldown prüfen: der Respawn
  // steht zwar schon im State, aber der Rest dieses Ticks darf ihn NICHT mehr bekämpfen.
  // Die Guards prüfen `monsterId !== monster.id` statt nur `=== null` (Sweep6 T8-P3-2): drückt
  // cooldownOnKill den Cooldown auf 0, rückt der Dungeon-Wellen-Pfad OHNE aktiven Cooldown zur
  // nächsten Welle vor — der Rest-Tick würde sonst mit dem lokalen `monster` der ALTEN Welle gegen
  // die neue `enemyHp` weiterrechnen (Pet-Schaden aus altem maxHp, alte Angriffswerte/enrage/bane).
  // Heute unerreichbar (cooldownOnKill summiert seit 29.08.2026 über die Slots: Bogen 2000 ms +
  // Handschuhe 2000 ms = 4000 ms < KILL_COOLDOWN_MS), aber ein Content-/Tuning-Drop macht den Pfad scharf. Der Normalkampf-Respawn behält dieselbe monsterId → weiter erlaubt.
  // claude:2026-10-18T02:00:00+02:00 — das aktive Pet-Kind einmal je Tick (Brand-/Blutungs-Modifikatoren, Gegner-Tempo).
  const activePetKind = petCombatAbility(state, content)?.kind;
  const status = tickEnemyEffects(state, fx, monster, activePetKind, talentDamageMult(state, content), cm);
  if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
  if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;
  refreshPhase(); // claude:2026-10-25T05:50:00+02:00 — Schwelle durch DoT erreicht ⇒ Phase sofort (Schild vor dem nächsten Schlag)

  // Getriggerte Pet-Ability (eigener Intervall-Timer, unabhängig vom Spieler-Angriff).
  // Tickt die timed Pet-Debuffs herunter und löst bei Fälligkeit die Ability aus.
  tickPetAbility(state, content, monster, fx, stats);
  if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
  if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;
  refreshPhase(); // claude:2026-10-25T05:50:00+02:00

  // Statuseffekte auf den Spieler (DoT durch Gift/Brennen/Blutung; Frost verlangsamt, Einfrieren/Schock greifen am Timer).
  const pStatus = tickPlayerEffects(state, content, nowMs, fx, monster);
  tryAutoEat(state, content, stats.maxHp); // auch DoT-Schaden soll Heilung auslösen (nicht nur Gegner-Schläge)
  tryAutoPotion(state, content, stats.maxHp); // unabhängig von Auto-Eat (eigene Schwelle/Cooldown)
  if (state.character.hp <= 0) {
    onPlayerDefeated(state, content, stats.maxHp);
    return;
  }

  // Spieler-Angriff (eigener Timer; Frost verlangsamt ihn).
  // Defensiver Intervall-Guard: ein nicht-endliches/≤0 Intervall (defekte Stats) würde den Timer
  // nie auslösen ODER bei -= zu NaN driften → fester, sinnvoller Mindestwert (1 Tick).
  // Blessings of the Reach ("wildhunt", §attackSpeed): verkürzt NUR das Spieler-Angriffsintervall
  // (÷ mult = schneller) — der Gegner-Timer unten bleibt unberührt (reiner Spieler-Buff).
  // BEWUSST ROH (Eiserne Regel 3, auch nach Chef-Entscheid 2026-08-03): der Schrein verstärkt nur
  // BEUTE-Segen (mistvigil/greed/rotmist), NIE Kampf-Tempo — wildhunt bleibt auf dem Basis-Wert
  // (Schrein-Ersatz an wildhunt-Tagen: Elite-Spawn-Frequenz, s. elites.ts wildhuntCooldownMult).
  const playerInterval = safeInterval(stats.attackIntervalMs / blessingMult(nowMs, "attackSpeed"));
  cs.playerTimerMs += TICK_MS * (pStatus.frost ? 1 - FROST_SLOW : 1);
  if (cs.playerTimerMs >= playerInterval) {
    cs.playerTimerMs -= playerInterval;
    // Elementar-Effekte: der fällige Angriff beendet die Schock-Kette (die Verzögerung selbst ist bei
    // der Anwendung in den Timer geflossen — kein Aussetz-Wurf mehr, kein RNG-Draw hier). Einfrieren
    // (dritter Frost): genau dieser eine Angriff fällt aus — missReason "frozen" hält ihn im Log vom
    // echten Fehlschlag unterscheidbar.
    const pc = cs.elemental?.player;
    if (pc) pc.shockDelayMs = 0;
    if (pc?.frozen) {
      pc.frozen = false;
      pushLog(cs, { by: "player", kind: "miss", amount: 0, missReason: "frozen" });
    } else {
      performPlayerAttack(state, content, stats, monster, fx, nowMs, cm);
      if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
    }
  }

  // Kampf beendet ODER Kill-Cooldown gestartet (der Respawn ruht) → Tick hier zu Ende.
  if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;
  refreshPhase(); // claude:2026-10-25T05:50:00+02:00 — neue Phase wirkt schon auf den Gegner-Schlag dieses Ticks

  // Gegner-Angriff (Frost verlangsamt seinen Timer; Pet-`stun` friert ihn ganz ein).
  // Gleicher Intervall-Guard wie beim Spieler.
  const enemyInterval = safeInterval(monster.attackIntervalMs);
  const enemyStunned = cs.petAbility.enemyStunMs > 0;
  // claude:2026-10-18T02:00:00+02:00 — Gegner-Tempo-Malus der Begleiter (1.3.0), multiplikativ zu Frost: Leon
  // (crippleStrike, Fenster enemySlowMs) bzw. Schierling (cripplingPoison, solange Gift liegt).
  // Ohne Malus Faktor 1 ⇒ bit-identisch.
  const petSlow = Math.max(
    (cs.petAbility.enemySlowMs ?? 0) > 0 ? (cs.petAbility.enemySlowPct ?? 0) : 0,
    activePetKind === "cripplingPoison" && hasStatus(cs.enemyEffects, "poison") ? PET_POISON_SLOW_PCT : 0,
  );
  // claude:2026-10-25T21:55:00+02:00 — F1: Bosse (letzte Begegnung eines Dungeon-/Raid-Laufs) nehmen nur die halbe Frost-Verlangsamung.
  const frostSlow = FROST_SLOW * (fightingRunBoss(state, content) ? BOSS_FROST_SLOW_MULT : 1);
  cs.enemyTimerMs +=
    TICK_MS * (enemyStunned ? 0 : status.frost ? 1 - frostSlow : 1) * (petSlow > 0 ? 1 - petSlow : 1);
  if (!enemyStunned && cs.enemyTimerMs >= enemyInterval) {
    cs.enemyTimerMs -= enemyInterval;
    // Elementar-Effekte (Symmetrie zum Spieler-Zweig): Schock-Kette endet mit dem fälligen Angriff;
    // ein eingefrorener Gegner lässt genau diesen einen Angriff aus (missReason "frozen").
    const ecEl = cs.elemental?.enemy;
    if (ecEl) ecEl.shockDelayMs = 0;
    if (ecEl?.frozen) {
      ecEl.frozen = false;
      pushLog(cs, { by: "enemy", kind: "miss", amount: 0, missReason: "frozen" });
    } else {
      // — Gegner-Treffer-Auflösung (Armor-Iteration 2 §5.2 Resolve-Order): Dodge → Accuracy-Contest →
      //   Mitigation → Leder-Floor → Block → One-Shot-Cap → Ward-Absorb → HP. Die RNG-Draws für
      //   Dodge/Block werden NUR gezogen, wenn die jeweilige Chance > 0 ist — Alt-Content ohne
      //   Leder/Schild (dodgeChance/blockChance = 0) behält damit seine bit-identische RNG-Sequenz.
      //   (Der Leder-Floor ist deterministisch — er senkt nur einen bereits gelandeten Treffer.)
      // Pet-`accuracyDownEnemy`: senkt die Treffer-Chance des Gegners für ein Fenster. Multiplikativ
      // auf die E2-skalierte Accuracy → skaliert in Endzonen mit (wird dort wieder wertvoll, §7).
      const accDown = cs.petAbility.enemyAccDownMs > 0 ? cs.petAbility.enemyAccDownPct : 0;
      // E2 (evasion-tempo-taming-spec §3.2, #301): Level-skalierte effektive Gegner-Accuracy —
      // einzige Änderung an dieser Lesestelle, Formel/Doku in enemyEffectiveAccuracy (oben).
      const enemyAccuracy = enemyEffectiveAccuracy(monster) * (1 - accDown);
      // L5-Kombiboden (Spec-NACHTRAG, #301): der gewürfelte Dodge wird so geklemmt, dass die
      // KOMBINIERTE Land-Chance `(1−dodge)·contest` nie unter MIN_HIT_CHANCE fällt (vorher
      // multiplizierten sich Contest-Floor und Dodge zu nur 2,5–6 %). Deterministisch, KEIN
      // zusätzlicher RNG-Draw; der Dodge-Draw bleibt an stats.dodgeChance > 0 gekoppelt, damit
      // die Draw-ZAHL nicht vom Gegner-Kontext abhängt (Sequenz-Stabilität geseedeter Fixtures).
      const effectiveDodge = combinedFloorDodge(
        stats.dodgeChance,
        contestHitChance(enemyAccuracy, stats.evasion),
      );
      // claude:2026-10-25T05:50:00+02:00 — Bossphase (Spec §3): `everyNth` zählt jeden ausgeführten Angriff der Phase (auch
      // Ausweichen/Fehlschlag); der n-te schlägt × mult. Ohne Phasen kein Zähler.
      const bossPhases = sortedPhases(monster) !== null;
      const activePhase = bossPhases ? currentBossPhase(cs, monster) : undefined;
      let nthMult = 1;
      if (activePhase?.everyNth) {
        cs.bossAttackCount = (cs.bossAttackCount ?? 0) + 1;
        if (cs.bossAttackCount % Math.max(1, Math.round(activePhase.everyNth.n)) === 0) nthMult = activePhase.everyNth.mult;
      }
      // STEP 1 — Leder-Dodge (flache Voll-Vermeidung, §1.3): ausgewichen ⇒ 0 Schaden, kein Contest.
      if (stats.dodgeChance > 0 && nextFloat(state.rng) < effectiveDodge) {
        // ausgewichen (Leder-Dodge) — missReason (E+ §E+): Rüstungs-Trinität wird im Log lesbar
        // („Du weichst aus" statt generischem „verfehlt"). Nur Log-Feld, derselbe RNG-Draw.
        pushLog(cs, { by: "enemy", kind: "miss", amount: 0, missReason: "dodge" });
      } else {
        // Wut: unter dem HP-Schwellwert schlägt der Gegner härter.
        // claude:2026-10-25T05:50:00+02:00 — Bossphasen-Monster haben keine Wut (Spec §3 Regel 6; ihr Schadensfaktor IST die Wut).
        const enraged = !bossPhases && monster.enrage && cs.enemyHp / monster.maxHp <= monster.enrage.belowHpPct;
        // Entzug (Elementar-Effekte, void): ein entkräfteter Gegner schlägt VOID_WEAKEN schwächer — auf die
        // ganze Spanne, vor dem Wurf (Faktor 1 ohne Status ⇒ bit-identisch).
        let enemyDamage =
          (enraged ? monster.damage * monster.enrage!.damageMult : monster.damage) * voidWeakenMult(cs.enemyEffects);
        if (nthMult !== 1) enemyDamage *= nthMult; // claude:2026-10-25T05:50:00+02:00 — Phase „jeder n-te Angriff × mult“
        // STEP 2 (Accuracy-Contest) + STEP 3 (Mitigation, def/(def+K)) laufen beide in resolveAttack;
        // `result.damage` ist bereits post-Mitigation. Gegner-Spanne = Legacy-Ableitung aus dem flachen
        // `damage` (identische Breite wie der alte 0,52–1,48-Wurf), bis Content Monster-Spannen liefert.
        const result = resolveAttack(
          state.rng,
          {
            accuracy: enemyAccuracy,
            damageMin: enemyDamage * DMG_MAX_HIT_MULT * DMG_ROLL_FLOOR,
            damageMax: enemyDamage * DMG_MAX_HIT_MULT,
            critChance: 0,
            critDamage: 1,
          },
          { evasion: stats.evasion, defense: stats.defense },
        );
        if (result.hit) {
          // Glut (Elementar-Effekte): ein brennender Spieler nimmt BURN_VULNERABILITY mehr Schaden — auf
          // den aufgelösten Treffer VOR Pet-Block/Schild/Leder-Floor/Block/Cap/Ward (alle Folgeschritte
          // sehen den erhöhten Betrag). Ohne Brand Faktor 1 ⇒ bit-identisch.
          const struck = result.damage * burnVulnMult(cs.playerEffects);
          // Pet-`blockNextEnemyHit`: blockt diesen Treffer komplett (one-shot).
          let dmg = struck;
          if (cs.petAbility.blockNextHit) {
            cs.petAbility.blockNextHit = false;
            dmg = 0;
            // source "effect" (Task #220): Pet-Schild/-Block, kein Ward — die UI trennt beide Quellen.
            pushLog(cs, { by: "player", kind: "shield", amount: Math.round(struck), source: "effect" });
          } else if (cs.petAbility.shieldHp > 0) {
            // Pet-`shield`: Absorb-Pool fängt einen Teil des Treffers ab (vor Block/Ward).
            const absorbed = Math.min(cs.petAbility.shieldHp, struck);
            cs.petAbility.shieldHp = Math.max(0, cs.petAbility.shieldHp - absorbed);
            dmg = Math.max(0, struck - absorbed);
            if (absorbed >= 1)
              pushLog(cs, { by: "player", kind: "shield", amount: Math.round(absorbed), source: "effect" });
          }
          // STEP 4 — Leder-Floor (Armor-Iteration 2 §5.2): trägt der Spieler Leder (dodgeChance>0),
          // verliert ein LANDENDER Treffer nach der Mitigation LEATHER_HIT_FLOOR (−12 %). Dämpft die
          // Dodge-Varianz („ein Unglückstreffer = halbe Leiste") am Low/Mid-Band, ohne Leders
          // Vermeidungs-Identität zu Mitigation umzubauen. Deterministisch (kein RNG-Draw). Läuft VOR
          // Block/Cap/Ward — ein Leder-Träger ohne Schild hat blockChance=0 (der Block-Step ist no-op).
          if (stats.dodgeChance > 0) dmg *= 1 - LEATHER_HIT_FLOOR;
          // STEP 5 — Schild-Block (§1.2): ein geblockter Treffer verliert BLOCK_DAMAGE_REDUCTION
          // (−85 %). RNG nur bei blockChance > 0 (Melee-1H-Schild) → Alt-Content sequenz-identisch.
          let blockedThisHit = false;
          if (stats.blockChance > 0 && nextFloat(state.rng) < stats.blockChance) {
            // Chef-BUG: Block war STUMM (kein pushLog wie der Ward-Absorb darunter). Der geblockte
            // Betrag wird VOR der Reduktion gemessen und als eigenes kind:"block"-Event geloggt, damit
            // der Spieler sieht „Blocked! −X" (Renderer färbt es blau, analog Ward). Rein additiv —
            // keine Mechanik-Änderung, kein zusätzlicher RNG-Draw.
            const blocked = dmg * BLOCK_DAMAGE_REDUCTION;
            dmg *= 1 - BLOCK_DAMAGE_REDUCTION;
            if (blocked >= 1) pushLog(cs, { by: "player", kind: "block", amount: Math.round(blocked) });
            blockedThisHit = true; // blockRestore-Hook (unten, nach dem Restschaden)
          }
          // STEP 6 — One-Shot-Cap (§1.6): kein Einzeltreffer entfernt mehr als ONE_SHOT_CAP der max. HP.
          dmg = Math.min(dmg, ONE_SHOT_CAP * stats.maxHp);
          // STEP 7 — Ward-Absorb (Stoff, §1.4): der Ward-Pool fängt zuerst ab, der Rest geht auf HP.
          // claude:2026-10-25T21:55:00+02:00 — W4: solange Ward steht, dämpft er den Treffer um WARD_HIT_DAMPING (30 %).
          if (state.character.ward > 0) dmg *= 1 - WARD_HIT_DAMPING;
          const wardRes = absorbWard(state.character.ward, dmg);
          state.character.ward = wardRes.ward;
          if (wardRes.absorbed >= 1) {
            // source "ward" (Task #220): Ward-Absorb am Spieler — der Log zeigt, dass der Stoff-Schild schluckte.
            pushLog(cs, { by: "player", kind: "shield", amount: Math.round(wardRes.absorbed), source: "ward" });
          }
          // Warding-XP (Armor-Iteration 2 §9.3): absorbierter Ward trainiert den Warding-Skill
          // (`absorbed · WARDING_XP_PER_ABSORB`) — universell, stil-neutral („Abwehr durch Abwehren").
          // So levelt JEDER Magier, der Treffer schluckt, seinen Ward-Regen — auch der Offensiv-Magier.
          if (wardRes.absorbed > 0) {
            addXp(state, content, "warding", wardRes.absorbed * WARDING_XP_PER_ABSORB, nowMs);
          }
          // STEP 8 — Restschaden auf die HP (gerundet wie der frühere Mana-Schild-Pfad).
          let hpDamage = Math.max(0, Math.round(wardRes.hpDamage));
          // STEP 8b — Pet-damageReduction (carapace „Stoneshell", #276 §4.2): multiplikativ NACH
          // Armor/Ward/Block auf den Rest, der die HP tatsächlich erreicht (0..0.04, computeStats).
          // Der hpDamage>0-Guard hält voll absorbierte Treffer (Ward/Pet-Block ⇒ 0) bei 0 — das
          // max(1,…) darf aus einer Null-Landung keinen 1er-Treffer machen; ein ECHTER Resttreffer
          // fällt dafür nie unter 1. Deterministisch, kein RNG-Draw → Sequenzen bleiben bit-identisch.
          if (stats.damageReduction > 0 && hpDamage > 0) {
            hpDamage = Math.max(1, Math.round(hpDamage * (1 - stats.damageReduction)));
          }
          // claude:2026-10-18T02:00:00+02:00 — Seidenweber „Rettungsfaden" (deathSave, 1.3.0, Geladen-Muster): ein
          // gelandeter Treffer, der die LP auf ≤ 0 senken würde (nach Block/Schild/Ward/Reduktion), lässt
          // 1 LP; danach Abklingzeit = intervalMs. Kein RNG.
          if (hpDamage > 0 && state.character.hp - hpDamage <= 0 && activePetKind === "deathSave") {
            const pa = cs.petAbility;
            const ab = petCombatAbility(state, content);
            if (ab && (pa.chargeMs ?? 0) <= 0 && state.character.hp > 1) {
              const saved = hpDamage - (state.character.hp - 1);
              hpDamage = state.character.hp - 1;
              pa.chargeMs = ab.intervalMs;
              pushLog(cs, {
                by: "player",
                kind: "petAbility",
                amount: Math.round(saved),
                petId: state.character.companionPetId ?? undefined,
                ability: "deathSave",
              });
            }
          }
          state.character.hp -= hpDamage;
          // OSRS-Fix (Task #197): Getroffen-werden gibt KEINE Defence-/magic_def-XP mehr. Verteidigung
          // trainiert nur durchs Kämpfen in der Defensiv-Stance — der ausgeteilte Schaden routet dort
          // via grantOffenseXp/activeStanceMods auf `defence` (Melee/Fernkampf) bzw. `magic_def` (Magie).
          pushLog(cs, { by: "enemy", kind: "hit", amount: hpDamage });
          // blockRestore (Rune der Ungebrochenen Mauer, Runen Tier IV §4.2, Chef-Entscheid 25.08.2026):
          // jeder ERFOLGREICHE Block heilt einen Anteil der max. HP. Bewusst NACH dem Restschaden,
          // nicht im Block-Zweig selbst: healPlayer heilt nur unter maxHp, und ein Block bei voller
          // Leiste haette die Heilung sonst verschenkt, bevor der Rest des Treffers ueberhaupt landete.
          // Nur solange der Spieler lebt (ein Block rettet nicht aus dem Tod zurueck). Doppelte Klemme
          // (§9 Frage 11, Option A): min(maxHp·min(magnitude, CAP_PCT), CAP_ABS), dieselbe
          // Groessenordnung wie der gedeckelte Melee-Lebensraub. Kein RNG, source "effect" wie andere
          // Heil-Effekte (die UI kennt diese Quelle bereits).
          if (blockedThisHit && fx.blockRestore && state.character.hp > 0) {
            const pct = Math.min(BLOCK_RESTORE_CAP_PCT, Math.max(0, fx.blockRestore.magnitude));
            healPlayer(state, stats.maxHp, Math.min(stats.maxHp * pct, BLOCK_RESTORE_CAP_ABS), "effect");
          }
          applyMonsterInflict(state, monster, stats); // z.B. Gift bei Treffer (Weisheits-Widerstand aus stats)
          // claude:2026-10-25T05:50:00+02:00 — Heilung je gelandetem Treffer mit Schaden > 0 (Ward + HP): Phase `healPerHitPct`
          // plus Bestienhunger (Woche, nur der Raum-Boss, +0,20 %). Anteil der (skalierten) maxHp, Gift auf dem Boss halbiert.
          const healPct =
            (activePhase?.healPerHitPct ?? 0) + (cm.modifier === "beast_hunger" && cm.raidBossId === monster.id ? 0.002 : 0);
          if (healPct > 0 && wardRes.absorbed + hpDamage > 0 && cs.enemyHp > 0) {
            cs.enemyHp = Math.min(monster.maxHp, cs.enemyHp + monster.maxHp * healPct * poisonSustainMult(cs.enemyEffects));
          }
          // vengeance (Rache, §2.1): ein ERLITTENER Treffer lädt den nächsten eigenen Schlag auf.
          if (fx.vengeance) effectCounters(cs).vengeancePrimed = true;
          // thorns (Spiegelhaut, §2.1/§5-Rüstungs-Chase): der Angreifer erleidet flachen Rückschaden
          // (unmitigiert — „X Schaden"). Kill-Fall wird nach dem Spieler-Überlebens-Check behandelt.
          if (fx.thorns && fx.thorns.magnitude > 0) {
            // Glut: auch Dornen-Rückschaden trifft ein brennendes Ziel härter („aus allen Quellen").
            // claude:2026-10-18T12:00:00+02:00 — Narbenbuch „Narbenfaust" (damagePct): letzter Faktor, ohne Rang 1.
            const thornsDmg = Math.max(
              1,
              Math.round(fx.thorns.magnitude * burnVulnMult(cs.enemyEffects) * talentDamageMult(state, content)),
            );
            cs.enemyHp -= thornsDmg;
            pushLog(cs, { by: "player", kind: "hit", amount: thornsDmg });
          }
        } else {
          pushLog(cs, { by: "enemy", kind: "miss", amount: 0 });
        }
      }
    }
    tryAutoEat(state, content, stats.maxHp);
    tryAutoPotion(state, content, stats.maxHp); // unabhängig von Auto-Eat (eigene Schwelle/Cooldown)
    if (state.character.hp <= 0) {
      onPlayerDefeated(state, content, stats.maxHp);
      return;
    }
    // thorns kann den Gegner töten (Rückschaden) → gleicher Kill-Pfad wie beim aktiven Schlag.
    // Der Spieler-Tod oben hat Vorrang (harte Niederlage schlägt Rückschaden-Kill).
    if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
    if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;
    refreshPhase(); // claude:2026-10-25T05:50:00+02:00 — Dornen können eine Schwelle reißen
  }

  // Stalemate-Erkennung: hier leben Gegner UND Spieler (alle Tod-Pfade sind oben zurückgekehrt) →
  // cs.enemyHp/enemyWard sind am Tick-Tiefpunkt. Stoppt den Kampf, wenn über STALEMATE_NO_PROGRESS_MS
  // kein neuer HP+Ward-Tiefstwert erreicht wurde (kein Netto-Fortschritt; Spec §5.1.1).
  trackStalemate(state.combat, monster);
  // claude:2026-10-25T05:50:00+02:00 — Patt im Raid = Tod der Stufe (R3): nach dem Patt-Aufräumen (das dungeonId nullt) an
  // raid.ts melden. Ob es ein Raid-Kampf war, steht in `cm` vom Tick-Anfang (bis hier kein Kampfende).
  if (cs.monsterId === null && cs.stopReason === "stalemate") {
    resetBossPhase(cs);
    if (cm.inRaid) onRaidDefeat(state, content, "stalemate");
  }
}

// ── Getriggertes Pet-Ability-Framework ───────────────────────────────────────

/**
 * Tickt das getriggerte Pet-Ability-System um einen Combat-Tick vor:
 *  1. zählt die timed Pet-Debuffs (stun/accuracyDown/armorRend) herunter,
 *  2. akkumuliert den Intervall-Timer NUR, wenn ein aktives Pet eine Ability trägt,
 *  3. löst bei Fälligkeit `firePetAbility` aus und setzt den Timer zurück.
 *
 * Determinismus: ohne aktives Pet/Ability wird KEIN RNG gezogen und der Timer nicht bewegt
 * (frische States ohne Pet bleiben bit-stabil). RNG nur in Abilities, die ihn brauchen (stealDrop).
 */
function tickPetAbility(
  state: GameState,
  content: ContentDB,
  monster: MonsterDef,
  fx: SpecialEffects,
  stats: DerivedStats,
): void {
  const pa = state.combat.petAbility;
  // Timed Debuffs herunterzählen (laufen auch ohne aktives Pet ab, falls noch aktiv).
  if (pa.enemyStunMs > 0) pa.enemyStunMs = Math.max(0, pa.enemyStunMs - TICK_MS);
  if (pa.enemyAccDownMs > 0) pa.enemyAccDownMs = Math.max(0, pa.enemyAccDownMs - TICK_MS);
  if (pa.enemyVulnMs > 0) pa.enemyVulnMs = Math.max(0, pa.enemyVulnMs - TICK_MS);
  if ((pa.enemySlowMs ?? 0) > 0) pa.enemySlowMs = Math.max(0, (pa.enemySlowMs ?? 0) - TICK_MS); // claude:2026-10-18T02:00:00+02:00

  const ability = petCombatAbility(state, content);
  if (!ability) {
    pa.timerMs = 0; // kein Pet/keine Ability → Timer ruht (kein Drift)
    return;
  }
  // packLeader (Rudelführer, §2.1): die Pet-Ability lädt um +Anteil schneller (Timer läuft
  // beschleunigt — deterministisch, kein RNG; +25 % ⇒ Trigger ~alle intervalMs/1.25).
  const speed = fx.packLeader ? 1 + Math.max(0, fx.packLeader.magnitude) : 1;
  // claude:2026-10-18T02:00:00+02:00 — Geladen-Muster (1.3.0, Aschbauch „Notration", Seidenweber „Rettungsfaden"):
  // statt eines Intervall-Takts zählt eine Abklingzeit (chargeMs) herunter und bleibt bei 0 „geladen".
  // Bei Kampfbeginn geladen (frische Runtime ohne chargeMs). Notration feuert, sobald geladen UND die
  // LP unter PET_EMERGENCY_HEAL_BELOW liegen; Rettungsfaden löst im Gegner-Treffer-Pfad aus.
  if (ability.kind === "emergencyHeal" || ability.kind === "deathSave") {
    pa.timerMs = 0;
    if ((pa.chargeMs ?? 0) > 0) pa.chargeMs = Math.max(0, (pa.chargeMs ?? 0) - TICK_MS * speed);
    if (
      ability.kind === "emergencyHeal" &&
      (pa.chargeMs ?? 0) <= 0 &&
      state.character.hp > 0 &&
      state.character.hp < PET_EMERGENCY_HEAL_BELOW * stats.maxHp
    ) {
      pa.chargeMs = ability.intervalMs;
      firePetAbility(state, content, monster, ability);
    }
    return;
  }
  pa.timerMs += TICK_MS * speed;
  if (pa.timerMs < ability.intervalMs) return;
  pa.timerMs -= ability.intervalMs;
  firePetAbility(state, content, monster, ability);
}

/** Direkter Sofortschaden an den Gegner durch eine Pet-Ability (berücksichtigt armorRend-Vuln). */
function petDamageEnemy(state: GameState, fraction: number, monster: MonsterDef): number {
  const pa = state.combat.petAbility;
  const vuln = pa.enemyVulnMs > 0 ? 1 + pa.enemyVulnPct : 1;
  // Glut (Elementar-Effekte): Pet-Schaden gegen ein brennendes Ziel ×(1+BURN_VULNERABILITY).
  const dmg = Math.max(1, Math.round(monster.maxHp * fraction * vuln * burnVulnMult(state.combat.enemyEffects)));
  state.combat.enemyHp -= dmg;
  return dmg;
}

/**
 * Löst die Ability des aktiven Pets aus (Effekt nach `kind`) und pusht einen `petAbility`-Log-
 * Eintrag (pet-id + ability) für UI/Animation. `ability.value` ist bereits gedeckelt.
 */
function firePetAbility(
  state: GameState,
  content: ContentDB,
  monster: MonsterDef,
  ability: ActivePetAbility,
): void {
  const cs = state.combat;
  const pa = cs.petAbility;
  const stats = computeStats(state, content);
  const petId: PetId | undefined = state.character.companionPetId ?? undefined;
  const value = ability.value;
  // Standard-Log (amount = Wirkungsgröße); stealDrop loggt selbst mit itemId.
  let amount = 0;

  switch (ability.kind) {
    case "stun":
      pa.enemyStunMs = Math.max(pa.enemyStunMs, value);
      amount = Math.round(value);
      break;
    case "enemyAttackDelay":
      cs.enemyTimerMs = Math.max(0, cs.enemyTimerMs - value);
      amount = Math.round(value);
      break;
    case "burstDamage":
    case "guaranteedCrit":
    case "armorPierceHit":
      amount = petDamageEnemy(state, value, monster);
      break;
    case "multiHit": {
      for (let i = 0; i < PET_ABILITY_MULTIHIT_COUNT; i++) amount += petDamageEnemy(state, value, monster);
      break;
    }
    case "lifestealBurst": {
      amount = petDamageEnemy(state, value, monster);
      healPlayer(state, stats.maxHp, Math.round(stats.maxHp * value), "lifesteal");
      break;
    }
    case "heal":
      amount = Math.round(stats.maxHp * value);
      healPlayer(state, stats.maxHp, amount, "effect");
      break;
    case "shield":
      pa.shieldHp = Math.max(pa.shieldHp, Math.round(stats.maxHp * value));
      amount = pa.shieldHp;
      break;
    case "blockNextEnemyHit":
      pa.blockNextHit = true;
      break;
    case "wardRestore": {
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0 (Chef 17.10., Schutz-Band): Gutschrift = value × player.maxHp
      // (vorher × maxWard), gedeckelt bei maxWard. Ohne Stoff-Pool (maxWard 0) ein No-op (Log 0).
      if (stats.maxWard > 0) {
        const before = state.character.ward;
        state.character.ward = Math.min(stats.maxWard, before + stats.maxHp * value);
        amount = Math.round(state.character.ward - before);
      }
      break;
    }
    case "accuracyDownEnemy":
      pa.enemyAccDownMs = PET_ABILITY_DEBUFF_MS;
      pa.enemyAccDownPct = value;
      break;
    case "armorRend":
      pa.enemyVulnMs = PET_ABILITY_DEBUFF_MS;
      pa.enemyVulnPct = value;
      break;
    case "onHitStatus":
    case "delayedDot": {
      if (!ability.status) break;
      const isDot = ability.status !== "frost";
      // #276 §5.1: `value` ist neu ein BRUCH von enemy.maxHp PRO SEKUNDE (Cap 0.04) statt flacher
      // Magnitude — Pet-DoTs skalieren damit implizit mit dem Gegner (wie burstDamage). Die
      // Umrechnung läuft über den EINEN shared-Helfer `petDotMagnitude` (max(1, round(maxHp·value))),
      // damit Sim/Tests/Kampf identisch rechnen. frost bleibt reiner Slow-Timer (Magnitude 0).
      const magnitude = isDot ? petDotMagnitude(monster.maxHp, value) : 0;
      applyEnemyStatus(
        state,
        monster,
        {
          type: ability.status,
          magnitude,
          durationMs: ability.kind === "delayedDot" ? PET_ABILITY_DELAYED_DOT_MS : PET_ABILITY_STATUS_MS,
        },
        combatMods(state, content), // claude:2026-10-25T05:50:00+02:00 — Raid-Sets/Woche gelten für jeden eigenen Status
      );
      amount = magnitude; // Log zeigt die tatsächliche Schadens-Magnitude/s (0 bei frost)
      break;
    }
    // claude:2026-10-18T02:00:00+02:00 — 1.3.0 Begleiter-Rework: neue Kampf-Fähigkeiten (design/1.3.0-begleiter-werte.md §2c).
    case "currentHpStrike": {
      // Kiemenfäule „Sog": Anteil der AKTUELLEN Gegner-LP (stark gegen volle Bosse), inkl. armorRend/Glut.
      const vuln = pa.enemyVulnMs > 0 ? 1 + pa.enemyVulnPct : 1;
      const dmg = Math.max(1, Math.round(Math.max(0, cs.enemyHp) * value * vuln * burnVulnMult(cs.enemyEffects)));
      cs.enemyHp -= dmg;
      amount = dmg;
      break;
    }
    case "crippleStrike":
      // Leon „Gestiefelter Hieb": Krit-Treffer (wie guaranteedCrit), danach greift der Gegner langsamer an.
      amount = petDamageEnemy(state, value, monster);
      pa.enemySlowMs = Math.max(pa.enemySlowMs ?? 0, PET_CRIPPLE_SLOW_MS);
      pa.enemySlowPct = Math.max(pa.enemySlowPct ?? 0, PET_CRIPPLE_SLOW_PCT);
      break;
    case "cripplingPoison":
    case "executeBleed":
    case "emberBrand": {
      // Schierling „Lähmgift" (Gift), Blutbracke „Reißen" (Blutung), Schlackenscheusal
      // „Schlackenspritzer" (Brand). Die Zusatzwirkung (Tempo, ×2 unter 50 %, Glut-Stapel) wirkt in
      // combatStep/tickEnemyEffects, solange das Pet aktiv ist.
      const type = ability.kind === "cripplingPoison" ? "poison" : ability.kind === "executeBleed" ? "bleed" : "burn";
      const magnitude = petDotMagnitude(monster.maxHp, value);
      applyEnemyStatus(
        state,
        monster,
        {
          type,
          magnitude,
          durationMs: ability.kind === "emberBrand" ? (ability.durationMs ?? PET_EMBER_BRAND_MS) : PET_ABILITY_STATUS_MS,
        },
        combatMods(state, content), // claude:2026-10-25T05:50:00+02:00
      );
      amount = magnitude;
      break;
    }
    case "emberDetonate": {
      // Scheiterling „Funkenregen": legt zuerst Brand an (zählt als Stapel), zündet dann ALLE Glut-Stapel
      // als Sofortschaden (Stapel × value × maxHp, inkl. Glut) und setzt sie auf 0; der Brand bleibt.
      if (ability.burnValue && ability.burnValue > 0) {
        applyEnemyStatus(
          state,
          monster,
          {
            type: "burn",
            magnitude: petDotMagnitude(monster.maxHp, ability.burnValue),
            durationMs: PET_EMBER_DETONATE_BURN_MS,
          },
          combatMods(state, content), // claude:2026-10-25T05:50:00+02:00
        );
      }
      const ec = sideCounters(cs, "enemy");
      const stacks = ec.emberStacks ?? 0;
      if (stacks > 0) {
        amount = petDamageEnemy(state, stacks * value, monster);
        ec.emberStacks = 0;
      }
      break;
    }
    case "frostBite": {
      // Frostgroll „Frostbiss": Frost für value ms (normale Elementar-Zählung bleibt). Jeder
      // PET_FROSTBITE_FREEZE_EVERY-te Biss friert ein, sofern keine Einfrier-Immunität läuft; sonst bleibt
      // der Zähler kurz davor stehen. Frost-immune Gegner: kein Biss-Zähler.
      if (monsterResists(monster, "frost")) break;
      applyEnemyStatus(state, monster, { type: "frost", magnitude: 0, durationMs: value });
      pa.frostBites = (pa.frostBites ?? 0) + 1;
      if (pa.frostBites >= PET_FROSTBITE_FREEZE_EVERY) {
        const ec = sideCounters(cs, "enemy");
        if (ec.freezeImmunityMs <= 0) {
          ec.frozen = true;
          ec.freezeImmunityMs = FREEZE_IMMUNITY_MS;
          ec.frostStacks = 0;
          pa.frostBites = 0;
        } else {
          pa.frostBites = PET_FROSTBITE_FREEZE_EVERY - 1;
        }
      }
      amount = Math.round(value);
      break;
    }
    case "emergencyHeal":
      // Aschbauch „Notration": ausgelöst von tickPetAbility (geladen + LP unter der Schwelle).
      amount = Math.round(stats.maxHp * value);
      healPlayer(state, stats.maxHp, amount, "effect");
      break;
    case "deathSave":
      // Seidenweber „Rettungsfaden": löst im Gegner-Treffer-Pfad aus (combatStep), nie über den Takt.
      return;
    case "stealDrop": {
      // claude:2026-10-18T02:00:00+02:00 — 1.3.0 (Chef 17.10.): höchstens EIN Erfolg je Begegnung; danach kein Versuch (kein Wurf).
      if (pa.stolenThisEncounter) return;
      // Anker-Ability: klaut ein Item aus dem Loot-Table des aktuellen Monsters.
      // #276 §5.2 (Rare-Drop-Schutz, PFLICHT): NUR Commons mit chance ≥ PET_STEAL_MIN_LOOT_CHANCE
      // (5 %) sind stehlbar — Chase-Equipment (1/350–1/500, teils mit Suffix) und Keys sind
      // AUSGESCHLOSSEN, sonst hebelte das Pet die Rare-Drop-Philosophie aus. Auswahl gleichverteilt
      // über die GEFILTERTE Liste; Menge = roll.min (der Dieb klaut, er erntet nicht — kein
      // qty-RNG-Draw mehr). Leere gefilterte Liste → kein Effekt, kein Log, KEIN RNG-Draw (der
      // Filter ist deterministisch; RNG fließt nur bei mind. einem stehlbaren Eintrag).
      const stealable = monster.loot.filter((r) => r.chance >= PET_STEAL_MIN_LOOT_CHANCE);
      if (stealable.length === 0) return; // nichts (Stehlbares) zu klauen
      if (value < 1 && nextFloat(state.rng) > value) return; // Versuch misslungen (kein Log)
      const roll = stealable[nextInt(state.rng, 0, stealable.length - 1)]!;
      const qty = Math.max(1, roll.min);
      // Überlauf-Pfad (SAVE 71, Muster tick.ts-Loot): grantLoot legt Inventar → (Auto-Bank) Lager
      // → Postfach ab — der geklaute Drop geht bei vollem Inventar+Lager nicht mehr verloren. Da
      // grantLoot die gesamte `qty` unterbringt, ist der Zugewinn genau `qty` (keine Suffix-Instanz hier).
      grantLoot(state, content, roll.itemId, qty);
      state.stats.itemsGathered += qty;
      markDropSeen(state, monster.id, roll.itemId);
      pa.stolenThisEncounter = true; // claude:2026-10-18T02:00:00+02:00
      pushLog(cs, {
        by: "player",
        kind: "petAbility",
        amount: qty,
        petId,
        ability: "stealDrop",
        itemId: roll.itemId,
      });
      return; // eigener Log mit itemId
    }
  }

  pushLog(cs, { by: "player", kind: "petAbility", amount, petId, ability: ability.kind });
}
