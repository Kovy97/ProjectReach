import type {
  CombatEvent,
  CombatState,
  ContentDB,
  DerivedStats,
  DungeonDef,
  EffectCounters,
  GameState,
  ItemId,
  ItemInstance,
  LootRoll,
  MonsterDef,
  MonsterId,
  PetId,
  RngState,
  SpecialEffectType,
  StatusEffect,
  StatusType,
  WeaponEffect,
} from "@hearthforge/shared";
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
  MAGIC_WEAK_FACTOR,
  MANA_PER_CAST,
  BLOCK_DAMAGE_REDUCTION,
  LEATHER_HIT_FLOOR,
  MONSTER_ACC_LEVEL_START,
  MONSTER_ACC_PER_LEVEL,
  ONE_SHOT_CAP,
  WARD_KILL_REFILL_PCT,
  WARDING_XP_PER_ABSORB,
  absorbWard,
  consumableHeal,
  rechargeWard,
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
import { computeStats } from "./character";
import { combatLevel } from "./dungeon";
import { itemCount, removeItem } from "./inventory";
import { grantLoot } from "./mail";
import { applyConsumableBuff, useConsumable } from "./consumable";
import { isHealPotion } from "./consume-gate";
import { markDropSeen } from "./drops";
import {
  type ActivePetAbility,
  petCombatAbility,
  petDoubleLootChance,
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

/** Nächstes verfügbares Auto-Eat-Food im Inventar (Consumable mit Heilung, KEIN Heiltrank — Tränke
 *  laufen über den Auto-Trank). Für den automatischen Futter-Wechsel, wenn das gewählte Food leer ist. */
function findNextFood(state: GameState, content: ContentDB): ItemId | null {
  for (const slot of state.inventory.slots) {
    const id = slot?.itemId;
    if (!id) continue;
    const item = content.items[id];
    if (
      item?.type === "consumable" &&
      ((item.healAmount ?? 0) > 0 || (item.healPct ?? 0) > 0) &&
      !isHealPotion(content, id)
    ) {
      return id;
    }
  }
  return null;
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
    foodId = findNextFood(state, content);
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
  const heal = Math.round(baseHeal * autoEatHealMult(tier));
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
  const granted =
    amount
    * earlyXpMult(levelFromXp(skill.xp))
    * shrineAmplifiedMult(blessingMult(nowMs, "xp"), campShrineBonus(state, content))
    * combatXpEffectMult(fx);
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
 * mehreren Quellen stapeln NICHT — die stärkste Magnitude gewinnt (§2.3-konservativ);
 * VERSCHIEDENE Kinds stapeln frei und wirken multiplikativ auf den Einzelschlag (§2.3.3).
 */
type SpecialEffects = Partial<Record<SpecialEffectType, WeaponEffect>>;

/** Sammelt die Spezial-Effekte der aktuellen Ausrüstung. Rein lesend, kein RNG. */
function collectSpecialEffects(state: GameState, content: ContentDB): SpecialEffects {
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
      if (!existing || e.magnitude > existing.magnitude) fx[kind] = e;
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
 * Bonus fürs Ressourcen-Handicap (Mana; das Munitions-Handicap ist mit #286 gestorben), aber grob
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
  // Überschuss-Schaden des Todesstoßes (enemyHp ist hier ≤ 0) — Quelle für overkillCarry (§2.1).
  const overkill = Math.max(0, -cs.enemyHp);
  cs.kills++;
  state.stats.kills++;
  // Kill-Credit-Alias (Dungeon-Rework-Spec §5.1.4): `dg_*`-Dungeon-Varianten zählen auf die
  // Basis-Id (Kill-Zähler, Slayer-Credit, Collection-Log unten). Normale Monster: creditId = id.
  const creditId = killCreditMonsterId(content, monster.id);
  state.monsterKills[creditId] = (state.monsterKills[creditId] ?? 0) + 1;
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
    g = Math.round(g * shrineAmplifiedMult(blessingMult(nowMs, "gold"), campShrineBonus(state, content)));
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
  const rollLootTable = (): void => {
    for (const roll of monster.loot) {
      if (nextFloat(state.rng) <= Math.min(1, roll.chance * rareDropMult * lootChanceMult)) {
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
    rollLootTable();
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
  //   manaOnKill/healOnKill = flache Ressourcen-Rückflüsse; cooldownOnKill kürzt den Kill-Cooldown
  //   (5 s − X, s. beginKillCooldown); overkillCarry/plaguebearer schreiben ihre „nächster-Gegner"-
  //   Übergabe in die transienten Zähler (Anwendung in applyCarryToNewEnemy beim Spawn).
  if (fx.manaOnKill) {
    state.character.mana = Math.min(
      stats.maxMana,
      state.character.mana + Math.max(0, fx.manaOnKill.magnitude),
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
      cs.encounterIndex++;
      const next = content.monsters[dungeon.encounters[cs.encounterIndex]!];
      if (next) {
        cs.monsterId = next.id;
        cs.enemyHp = next.maxHp;
        // Gegner-Ward (Combat-Depth §3.2): frischer Voll-Pool je Welle (KEIN Regen, kein Teil-Refill
        // wie beim Spieler-Ward unten) — jeder neue Gegner bringt seinen eigenen Schild voll mit.
        cs.enemyWard = next.wardCapacity ?? 0;
        cs.enemyTimerMs = 0;
        cs.enemyEffects = [];
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
        applyCarryToNewEnemy(state, next); // overkillCarry/plaguebearer treffen die neue Welle
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
    if (dungeon) grantDungeonRewards(state, content, dungeon, nowMs, fx);
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
  applyCarryToNewEnemy(state, monster); // overkillCarry/plaguebearer treffen den Respawn
  beginKillCooldown(cs, monster.id, gold, lootSummary, cooldownMs, bloodMoonProc);
}

/**
 * Wendet die „nächster-Gegner"-Übergaben (Waffen 2.0 §2.1) auf den frisch gespawnten Gegner an:
 *  - overkillCarry: der Überschuss des Todesstoßes trifft den Neuen (min. 1 Rest-HP — kein
 *    Insta-Kill-Kaskadieren durch den Kill-Cooldown hindurch); sichtbar als Treffer-Log.
 *  - plaguebearer: der Neue startet vergiftet (respektiert Monster-Resistenzen via applyEnemyStatus).
 * Beide Übergaben werden hier KONSUMIERT (genau ein Gegnerwechsel). Kein RNG.
 */
function applyCarryToNewEnemy(state: GameState, monster: MonsterDef): void {
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
    applyEnemyStatus(state, monster, {
      type: "poison",
      magnitude: ec.plague.magnitude,
      durationMs: ec.plague.durationMs,
    });
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
}

/**
 * ilvl für Suffix-Rolls aus Dungeon-Belohnungen (Truhe + Clear-Loot): das Level des BOSS-Monsters
 * (letzte Welle) — die Belohnung entstammt dem ganzen Lauf, sein Gipfel bestimmt die Item-Stufe
 * (analog „ilvl = Monster-Level" im Kill-Drop-Pfad). Defekter Content (leere encounters/unbekannte
 * Id) fällt defensiv auf 1. Rein lesend, kein RNG.
 */
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
  pushLog(cs, { by: "player", kind: "kill", amount: 0 });
  if (dungeon.gold > 0) {
    // Blessings of the Reach ("greed", §gold): +% auf JEDE Gold-Vergabe — EINMAL berechnet, damit
    // der Erst-Clear-Bonus unten (zweite Gutschrift desselben Betrags) denselben Segens-Betrag
    // dupliziert statt den Multiplikator ein zweites Mal anzuwenden. Schrein der Stillen
    // (Chef-Entscheid 2026-08-03): Bonus-Anteil verstärkt (1.20 → 1.26 bei Stufe III).
    const goldAmt = Math.round(
      dungeon.gold * shrineAmplifiedMult(blessingMult(nowMs, "gold"), campShrineBonus(state, content)),
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
function onPlayerDefeated(state: GameState, maxHp: number): void {
  const cs = state.combat;
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
  // cooldownRemainingMs/lastKill bleiben BEWUSST stehen (falls der Tod in einen laufenden Kill-
  // Cooldown fiel): der Cooldown gilt immer — der nächste manuelle startCombat übernimmt den Rest.
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
): void {
  if (monsterResists(monster, effect.type)) return; // immune Gegner ignorieren den Effekt
  const existing = state.combat.enemyEffects.find((e) => e.type === effect.type);
  if (existing) {
    existing.remainingMs = Math.max(existing.remainingMs, effect.durationMs);
    existing.magnitude = Math.max(existing.magnitude, effect.magnitude);
  } else {
    state.combat.enemyEffects.push({
      type: effect.type,
      remainingMs: effect.durationMs,
      magnitude: effect.magnitude,
    });
    pushLog(state.combat, { by: "player", kind: "status", amount: 0, status: effect.type });
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
): void {
  const catalystMs = fx.catalyst ? Math.max(0, fx.catalyst.durationMs) : 0;
  for (const effect of mainhandStatusEffects(state, content)) {
    const type = effect.type;
    if (!isStatusEffectType(type)) continue; // defensive (mainhandStatusEffects filtert bereits)
    if (nextFloat(state.rng) > effect.chance) continue;
    applyEnemyStatus(state, monster, {
      type,
      magnitude: effect.magnitude,
      durationMs: effect.durationMs + catalystMs,
    });
  }
}

/**
 * Manakosten eines Zaubers mit der ausgerüsteten Magie-Waffe. Liest `item.manaCost` der Waffe;
 * fällt auf den globalen `MANA_PER_CAST` zurück, wenn das Feld fehlt oder ungültig (NaN/negativ)
 * ist. Staff > Wand (Spec §5) ergibt sich rein aus den Content-Werten.
 */
export function castManaCost(content: ContentDB, weaponId: ItemId | null | undefined): number {
  const cost = weaponId ? content.items[weaponId]?.manaCost : undefined;
  return typeof cost === "number" && Number.isFinite(cost) && cost >= 0 ? cost : MANA_PER_CAST;
}

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
function emitDotTick(cs: CombatState, by: "player" | "enemy", e: StatusEffect, before: number): void {
  if (e.type !== "burn" && e.type !== "bleed" && e.type !== "poison") return;
  if (Math.floor(before / 1000) === Math.floor(e.remainingMs / 1000)) return;
  pushLog(cs, { by, kind: "dot", amount: Math.max(1, Math.round(e.magnitude)), status: e.type });
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
): { frost: boolean; shock: number } {
  const cs = state.combat;
  let frost = false;
  let shock = 0;
  // gutter (Ausweider, §2.1): eigene DoT-Ticks am Gegner (burn/bleed/poison — alle vom Spieler/Pet
  // appliziert) schlagen um +Anteil härter. Kein RNG.
  const dotMult = fx.gutter ? 1 + Math.max(0, fx.gutter.magnitude) : 1;
  // Status-vs-Ward-Konter (Chef-Design, s. STATUS_VS_WARD_MULT-Doku in shared): TRAIT-basiert auf
  // `wardCapacity > 0` — gilt den GESAMTEN Kampf über, auch nach Ward-Bruch (nicht an den aktuellen
  // Pool-Stand `cs.enemyWard` gekoppelt). DoT-Ticks schlagen unten ohnehin schon direkt auf `enemyHp`
  // durch (umgehen den Ward-Pool bereits vor diesem Fix) — hier NUR der reine Schadens-Mult.
  const statusVsWardMult = (monster?.wardCapacity ?? 0) > 0 ? STATUS_VS_WARD_MULT : 1;
  for (const e of cs.enemyEffects) {
    if (e.type === "poison" || e.type === "burn" || e.type === "bleed")
      cs.enemyHp -= e.magnitude * dotMult * statusVsWardMult * (TICK_MS / 1000);
    else if (e.type === "frost") frost = true;
    else if (e.type === "shock") shock = Math.max(shock, Math.min(1, e.magnitude)); // shock = Chance 0..1
    const before = e.remainingMs;
    e.remainingMs -= TICK_MS;
    emitDotTick(cs, "player", e, before); // DoT am Gegner → vom Spieler verursacht
  }
  cs.enemyEffects = cs.enemyEffects.filter((e) => e.remainingMs > 0);
  return { frost, shock };
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
): { frost: boolean; shock: number } {
  const cs = state.combat;
  let frost = false;
  let shock = 0;
  for (const e of cs.playerEffects) {
    if (e.type === "poison" || e.type === "burn" || e.type === "bleed") {
      const dmg = e.magnitude * (TICK_MS / 1000);
      state.character.hp -= dmg;
      // Überleben härtet ab — aber seit Chef-Entscheid (2026-07-08) mit derselben Level-Bandbreite
      // wie alle Kampf-XP: am über-levelten Trivial-Mob gibt auch Erleiden keine Vitality-XP mehr.
      const dotMonster = cs.monsterId ? content.monsters[cs.monsterId] : undefined;
      const dotVitMult = dotMonster
        ? combatXpLevelMult(levelFromXp(state.skills.vitality?.xp ?? 0), dotMonster.level)
        : 1;
      addXp(state, content, "vitality", dmg * VITALITY_XP_PER_DAMAGE * dotVitMult, nowMs, fx);
      // OSRS-Fix (Task #197): erlittener DoT-Schaden gibt KEINE Defence-/magic_def-XP mehr —
      // Verteidigung trainiert nur durchs Kämpfen in der Defensiv-Stance (ausgeteilter Schaden),
      // nicht durchs Einstecken.
    } else if (e.type === "frost") {
      frost = true;
    } else if (e.type === "shock") {
      shock = Math.max(shock, Math.min(1, e.magnitude)); // shock = Aussetz-Chance 0..1 (gegen >1-Dauerstun)
    }
    const before = e.remainingMs;
    e.remainingMs -= TICK_MS;
    emitDotTick(cs, "enemy", e, before); // DoT am Spieler → vom Gegner verursacht
  }
  cs.playerEffects = cs.playerEffects.filter((e) => e.remainingMs > 0);
  return { frost, shock };
}

/** Wendet einen vom Gegner ausgelösten Statuseffekt (z.B. Gift) auf den Spieler an. */
function applyMonsterInflict(state: GameState, monster: MonsterDef): void {
  const inflict = monster.inflict;
  if (!inflict) return;
  if (nextFloat(state.rng) > inflict.chance) return;
  const existing = state.combat.playerEffects.find((e) => e.type === inflict.type);
  if (existing) {
    // Spiegelt die Refresh-Semantik der Gegnerseite (applyEnemyStatus): Magnitude/Rest-Dauer per
    // `max` zusammenführen — ein Refresh darf einen stärkeren/längeren bestehenden Effekt am Spieler
    // nie abschwächen (Symmetrie-Pflicht, vom status-coverage-Test eingefordert).
    existing.remainingMs = Math.max(existing.remainingMs, inflict.durationMs);
    existing.magnitude = Math.max(existing.magnitude, inflict.magnitude);
  } else {
    state.combat.playerEffects.push({
      type: inflict.type,
      remainingMs: inflict.durationMs,
      magnitude: inflict.magnitude,
    });
    pushLog(state.combat, { by: "enemy", kind: "status", amount: 0, status: inflict.type });
  }
}

function performPlayerAttack(
  state: GameState,
  content: ContentDB,
  stats: DerivedStats,
  monster: MonsterDef,
  fx: SpecialEffects,
  nowMs?: number,
): void {
  const profile = playerProfile(stats);

  let casts = false;
  // surplus (§2.1) prüft „Mana über X %" VOR den Cast-Kosten (der Zauber selbst zehrt nicht am Bonus).
  const manaBeforeCast = state.character.mana;

  if (stats.style === "magic") {
    // Per-Waffe-Manakosten (Fallback globaler MANA_PER_CAST). Mana-Depletion-Loop:
    // Mana ≥ Kosten → casten (voller Magie-Schaden + Spell-Status); sonst schwacher Stab-Nahkampf
    // (×MAGIC_WEAK_FACTOR) während Mana via manaRegen/Sek (in combatStep) nachläuft → sobald wieder
    // genug → automatisch zurück zum Casten. Kein While-Loop → deterministisch, hängt bei
    // manaRegen=0 nicht (degradiert dann dauerhaft zum Weak-Melee, statt zu blockieren).
    const cost = castManaCost(content, state.character.equipment.mainhand);
    if (state.character.mana >= cost) {
      state.character.mana -= cost;
      casts = true;
      // Ward-Recharge (Rüstungs-Trinität §1.4): jeder echte Cast lädt den Ward-Pool um
      // `cost · WARD_PER_MANA`, gedeckelt auf maxWard. An den Mana-VERBRAUCH gekoppelt — läuft
      // Mana leer (Weak-Melee unten), gibt es keinen Cast und damit keinen Recharge (gewollter Druck).
      state.character.ward = rechargeWard(state.character.ward, stats.maxWard, cost);
    } else {
      // ohne (genug) Mana nur ein schwacher Schlag — die GANZE Spanne skaliert (§1.3)
      profile.damageMin *= MAGIC_WEAK_FACTOR;
      profile.damageMax *= MAGIC_WEAK_FACTOR;
    }
  }
  // Fernkampf: KEINE Munitions-Phase mehr (#286 Ammo-Removal) — der Pfeilschaden steckt seit #287
  // in der Bogen-Spanne, jeder Schuss ist „scharf". Der frühere ammoSaver-Waffeneffekt ist damit
  // ein NO-OP (fx.ammoSaver wird nirgends mehr gelesen, kein RNG-Draw); Stage B ersetzt/entfernt
  // die Träger-Items.

  strikeEnemy(
    state,
    content,
    stats,
    monster,
    fx,
    profile,
    { casts, manaBeforeCast, allowDoubleStrike: true },
    nowMs,
  );
}

/** Kontext eines Einzelschlags (Ressourcen-Phase von performPlayerAttack). */
interface StrikeContext {
  casts: boolean;
  manaBeforeCast: number;
  /** doubleStrike darf nur EINEN Zweitschlag auslösen (keine Kaskade). */
  allowDoubleStrike: boolean;
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
  const result = resolveAttack(state.rng, profile, {
    evasion: monster.evasion * (1 - stats.precision),
    defense: monster.defense * (1 - stats.armorPen),
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
    if (
      fx.surplus &&
      stats.style === "magic" &&
      ctx.casts &&
      ctx.manaBeforeCast > stats.maxMana * (fx.surplus.threshold ?? 0.8)
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
  // critBurst (Funkenschlag, §2.1): FLACHER Zusatzschaden bei Krit (nach Mitigation, unmitigiert drauf).
  const critFlat = result.crit && fx.critBurst ? Math.max(0, fx.critBurst.magnitude) : 0;
  let damage = Math.max(1, Math.round(result.damage * mult + critFlat));

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
  if (cs.enemyWard === undefined) cs.enemyWard = monster.wardCapacity ?? 0;
  if (cs.enemyWard > 0) {
    const bleed = damage * stats.wardBreak; // Bonus-HP-Schaden, umgeht den Pool (additiv)
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
    const heal = Math.min(cap, Math.round(damage * MELEE_LIFESTEAL * 10) / 10);
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
    const heal = Math.min(
      Math.max(0.1, Math.round(damage * stats.lifestealPct * 10) / 10),
      missing,
    );
    if (heal > 0) {
      state.character.hp = Math.min(stats.maxHp, state.character.hp + heal);
      pushLog(cs, { by: "player", kind: "lifesteal", amount: heal, source: "lifesteal" });
    }
  }
  // manaDrain (Zermürbung, §2.1): flacher Mana-Rückfluss je gelandetem Treffer (auf maxMana gedeckelt).
  if (fx.manaDrain) {
    state.character.mana = Math.min(
      stats.maxMana,
      state.character.mana + Math.max(0, fx.manaDrain.magnitude),
    );
  }
  // wardSiphon (elite-balance-spec.md §5, hollowveil_locket): Anteil des soeben verursachten
  // Schadens (post-Mitigation, derselbe `damage` wie Lebensraub oben) füllt den eigenen Ward-Pool.
  // Analog manaDrain: still (kein pushLog — Ressourcen-Rückfluss-Familie loggt nicht, nur HP-Heal
  // tut das). Auf maxWard gedeckelt; ohne Stoff-Pool (maxWard=0) ein reiner No-op.
  if (fx.wardSiphon && damage > 0 && stats.maxWard > 0) {
    state.character.ward = Math.min(
      stats.maxWard,
      state.character.ward + Math.max(0, damage * fx.wardSiphon.magnitude),
    );
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
  // Waffeneffekt: Magie an echten Zauber gekoppelt, sonst bei jedem Treffer (#286: Fernkampf hat
  // keine Munitions-Bedingung mehr — jeder Schuss ist scharf und trägt den Effekt).
  const appliesEffect = stats.style === "magic" ? ctx.casts : true;
  if (appliesEffect) applyWeaponEffects(state, content, monster, fx);

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
  });

  // doubleStrike (Doppelschlag, Palette-Hook — Content folgt später): Chance auf einen sofortigen
  // Zweitschlag mit voller Treffer-/Krit-/Effekt-Auflösung, aber OHNE erneute Ressourcenkosten
  // (kein Mana/Pfeil) und ohne Kaskade (der Zweitschlag kann keinen dritten auslösen).
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
 * Spieler-seitiger Tick-Unterhalt: Mana-Regeneration + HP-Regeneration (Ausrüstung/Set/Buffs) und
 * Kappen aufs (evtl. gesunkene) Maximum. Läuft im aktiven Kampf UND während des Kill-Cooldowns
 * (die Verschnaufpause heilt weiter — Teil des „Kampf entschleunigen"-Designs). Kein RNG.
 */
/**
 * Mana-/HP-Regeneration für EINEN Tick (deterministisch, kein RNG), gedeckelt aufs Maximum.
 * EINE Quelle der Wahrheit für Kampf- UND Idle-Tick (tick.ts `step` ruft sie pro Tick außerhalb
 * des Kampfes — Sweep6 T7-F2: vorher rechnete `advance` den Idle-Regen 1× NACH der Tick-Schleife
 * mit den END-Stats, wodurch ein im Fenster ablaufender Regen-Buff offline 0 Heilung brachte).
 * HP-Regen kommt NUR aus `hpRegenPerSec` (Ausrüstung/Set/Buffs) — natürliche Regeneration ist
 * entfernt (Chef-Entscheid 2026-07-02). Klemmt HP/Mana zusätzlich nach unten, falls ein
 * +maxHp-/+maxMana-Buff gerade abgelaufen ist.
 */
export function tickPlayerRegen(state: GameState, stats: DerivedStats): void {
  state.character.mana = Math.min(
    stats.maxMana,
    state.character.mana + stats.manaRegen * (TICK_MS / 1000),
  );
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
  const hpBefore = state.character.hp;
  tickPlayerRegen(state, stats);
  if (state.character.hp <= hpBefore) return; // voll / kein hpRegenPerSec → nichts zu loggen
  if (state.totalTicks % (1000 / TICK_MS) !== 0) return; // ~1×/Sek drosseln (10 Ticks = 1 s)
  const perSec = Math.round(stats.hpRegenPerSec);
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
 * ist. Deterministisch, kein RNG. Gesamt-Regen (Cast ~1.5/s + Warding ≤2.0/s) bleibt ≪ Endgame-DPS-in.
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
  const monster = cs.paragonFloor
    ? paragonCombatMonster(state, content)
    : cs.eliteVariantId
      ? eliteCombatMonster(state, content)
      : content.monsters[cs.monsterId];
  if (!monster) {
    cs.monsterId = null;
    cs.paragonFloor = undefined; // defekte/verwaiste Turm-Etage sauber schließen (kein Verlust)
    cs.eliteVariantId = undefined; // defekte/verwaiste Elite-Variante sauber schließen (kein Verlust)
    return;
  }

  const stats = computeStats(state, content);
  // Spezial-Waffeneffekte (Waffen 2.0 §2) einmal pro Tick aggregieren — Alt-Content ohne
  // Spezial-Kinds liefert ein leeres Objekt (alle fx-Zweige unten sind dann No-ops).
  const fx = collectSpecialEffects(state, content);

  // Auto-Eat-/Auto-Trank-Cooldowns einmal pro Tick herunterzählen (vor allen tryAutoEat-/
  // tryAutoPotion-Aufrufen dieses Ticks).
  if (cs.autoEatCooldownMs && cs.autoEatCooldownMs > 0) {
    cs.autoEatCooldownMs = Math.max(0, cs.autoEatCooldownMs - TICK_MS);
  }
  if (cs.autoPotionCooldownMs && cs.autoPotionCooldownMs > 0) {
    cs.autoPotionCooldownMs = Math.max(0, cs.autoPotionCooldownMs - TICK_MS);
  }

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
    tickPlayerEffects(state, content, nowMs, fx);
    // KEIN tryAutoEat/tryAutoPotion hier (s.o.) — der Gratis-Refill zwischen den Mobs ist gegatet.
    // Der Tod-durch-DoT-Check bleibt: ein im Cooldown weitertickender Gift-DoT kann jetzt töten.
    if (state.character.hp <= 0) {
      onPlayerDefeated(state, stats.maxHp);
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
      cs.enemyHp = Math.min(monster.maxHp, cs.enemyHp + monster.regen * (TICK_MS / 1000));
    }
  }

  // Statuseffekte auf den Gegner (Brennen-DoT, Frost, Schock).
  // Nach jedem Kill-Pfad zusätzlich auf den frisch gestarteten Kill-Cooldown prüfen: der Respawn
  // steht zwar schon im State, aber der Rest dieses Ticks darf ihn NICHT mehr bekämpfen.
  // Die Guards prüfen `monsterId !== monster.id` statt nur `=== null` (Sweep6 T8-P3-2): drückt
  // cooldownOnKill den Cooldown auf 0, rückt der Dungeon-Wellen-Pfad OHNE aktiven Cooldown zur
  // nächsten Welle vor — der Rest-Tick würde sonst mit dem lokalen `monster` der ALTEN Welle gegen
  // die neue `enemyHp` weiterrechnen (Pet-Schaden aus altem maxHp, alte Angriffswerte/enrage/bane).
  // Heute unerreichbar (max. cooldownOnKill 2000 ms < KILL_COOLDOWN_MS), aber ein Content-/Tuning-
  // Drop macht den Pfad scharf. Der Normalkampf-Respawn behält dieselbe monsterId → weiter erlaubt.
  const status = tickEnemyEffects(state, fx, monster);
  if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
  if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;

  // Getriggerte Pet-Ability (eigener Intervall-Timer, unabhängig vom Spieler-Angriff).
  // Tickt die timed Pet-Debuffs herunter und löst bei Fälligkeit die Ability aus.
  tickPetAbility(state, content, monster, fx);
  if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
  if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;

  // Statuseffekte auf den Spieler (DoT durch Gift/Brennen/Blutung; Frost/Schock stören den Angriff).
  const pStatus = tickPlayerEffects(state, content, nowMs, fx);
  tryAutoEat(state, content, stats.maxHp); // auch DoT-Schaden soll Heilung auslösen (nicht nur Gegner-Schläge)
  tryAutoPotion(state, content, stats.maxHp); // unabhängig von Auto-Eat (eigene Schwelle/Cooldown)
  if (state.character.hp <= 0) {
    onPlayerDefeated(state, stats.maxHp);
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
    if (pStatus.shock > 0 && nextFloat(state.rng) < pStatus.shock) {
      // durch Schock ausgesetzt — missReason (E+ §E+) macht den Aussetzer vom echten Fehlschlag
      // unterscheidbar (nur Log-Feld, derselbe RNG-Draw wie vorher).
      pushLog(cs, { by: "player", kind: "miss", amount: 0, missReason: "shock" });
    } else {
      performPlayerAttack(state, content, stats, monster, fx, nowMs);
      if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
    }
  }

  // Kampf beendet ODER Kill-Cooldown gestartet (der Respawn ruht) → Tick hier zu Ende.
  if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;

  // Gegner-Angriff (Frost verlangsamt seinen Timer; Pet-`stun` friert ihn ganz ein).
  // Gleicher Intervall-Guard wie beim Spieler.
  const enemyInterval = safeInterval(monster.attackIntervalMs);
  const enemyStunned = cs.petAbility.enemyStunMs > 0;
  cs.enemyTimerMs += TICK_MS * (enemyStunned ? 0 : status.frost ? 1 - FROST_SLOW : 1);
  if (!enemyStunned && cs.enemyTimerMs >= enemyInterval) {
    cs.enemyTimerMs -= enemyInterval;
    if (status.shock > 0 && nextFloat(state.rng) < status.shock) {
      // durch Schock ausgesetzt — missReason (E+ §E+) analog zum Spieler-Zweig (Symmetrie-Pflicht).
      pushLog(cs, { by: "enemy", kind: "miss", amount: 0, missReason: "shock" });
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
      // STEP 1 — Leder-Dodge (flache Voll-Vermeidung, §1.3): ausgewichen ⇒ 0 Schaden, kein Contest.
      if (stats.dodgeChance > 0 && nextFloat(state.rng) < effectiveDodge) {
        // ausgewichen (Leder-Dodge) — missReason (E+ §E+): Rüstungs-Trinität wird im Log lesbar
        // („Du weichst aus" statt generischem „verfehlt"). Nur Log-Feld, derselbe RNG-Draw.
        pushLog(cs, { by: "enemy", kind: "miss", amount: 0, missReason: "dodge" });
      } else {
        // Wut: unter dem HP-Schwellwert schlägt der Gegner härter.
        const enraged = monster.enrage && cs.enemyHp / monster.maxHp <= monster.enrage.belowHpPct;
        const enemyDamage = enraged ? monster.damage * monster.enrage!.damageMult : monster.damage;
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
          // Pet-`blockNextEnemyHit`: blockt diesen Treffer komplett (one-shot).
          let dmg = result.damage;
          if (cs.petAbility.blockNextHit) {
            cs.petAbility.blockNextHit = false;
            dmg = 0;
            // source "effect" (Task #220): Pet-Schild/-Block, kein Ward — die UI trennt beide Quellen.
            pushLog(cs, { by: "player", kind: "shield", amount: result.damage, source: "effect" });
          } else if (cs.petAbility.shieldHp > 0) {
            // Pet-`shield`: Absorb-Pool fängt einen Teil des Treffers ab (vor Block/Ward).
            const absorbed = Math.min(cs.petAbility.shieldHp, result.damage);
            cs.petAbility.shieldHp = Math.max(0, cs.petAbility.shieldHp - absorbed);
            dmg = Math.max(0, result.damage - absorbed);
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
          applyMonsterInflict(state, monster); // z.B. Gift bei Treffer
          // vengeance (Rache, §2.1): ein ERLITTENER Treffer lädt den nächsten eigenen Schlag auf.
          if (fx.vengeance) effectCounters(cs).vengeancePrimed = true;
          // thorns (Spiegelhaut, §2.1/§5-Rüstungs-Chase): der Angreifer erleidet flachen Rückschaden
          // (unmitigiert — „X Schaden"). Kill-Fall wird nach dem Spieler-Überlebens-Check behandelt.
          if (fx.thorns && fx.thorns.magnitude > 0) {
            const thornsDmg = Math.max(1, Math.round(fx.thorns.magnitude));
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
      onPlayerDefeated(state, stats.maxHp);
      return;
    }
    // thorns kann den Gegner töten (Rückschaden) → gleicher Kill-Pfad wie beim aktiven Schlag.
    // Der Spieler-Tod oben hat Vorrang (harte Niederlage schlägt Rückschaden-Kill).
    if (cs.enemyHp <= 0) onEnemyDefeated(state, content, monster, stats, fx, nowMs);
    if (cs.monsterId !== monster.id || killCooldownActive(cs)) return;
  }

  // Stalemate-Erkennung: hier leben Gegner UND Spieler (alle Tod-Pfade sind oben zurückgekehrt) →
  // cs.enemyHp/enemyWard sind am Tick-Tiefpunkt. Stoppt den Kampf, wenn über STALEMATE_NO_PROGRESS_MS
  // kein neuer HP+Ward-Tiefstwert erreicht wurde (kein Netto-Fortschritt; Spec §5.1.1).
  trackStalemate(state.combat, monster);
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
): void {
  const pa = state.combat.petAbility;
  // Timed Debuffs herunterzählen (laufen auch ohne aktives Pet ab, falls noch aktiv).
  if (pa.enemyStunMs > 0) pa.enemyStunMs = Math.max(0, pa.enemyStunMs - TICK_MS);
  if (pa.enemyAccDownMs > 0) pa.enemyAccDownMs = Math.max(0, pa.enemyAccDownMs - TICK_MS);
  if (pa.enemyVulnMs > 0) pa.enemyVulnMs = Math.max(0, pa.enemyVulnMs - TICK_MS);

  const ability = petCombatAbility(state, content);
  if (!ability) {
    pa.timerMs = 0; // kein Pet/keine Ability → Timer ruht (kein Drift)
    return;
  }
  // packLeader (Rudelführer, §2.1): die Pet-Ability lädt um +Anteil schneller (Timer läuft
  // beschleunigt — deterministisch, kein RNG; +25 % ⇒ Trigger ~alle intervalMs/1.25).
  const speed = fx.packLeader ? 1 + Math.max(0, fx.packLeader.magnitude) : 1;
  pa.timerMs += TICK_MS * speed;
  if (pa.timerMs < ability.intervalMs) return;
  pa.timerMs -= ability.intervalMs;
  firePetAbility(state, content, monster, ability);
}

/** Direkter Sofortschaden an den Gegner durch eine Pet-Ability (berücksichtigt armorRend-Vuln). */
function petDamageEnemy(state: GameState, fraction: number, monster: MonsterDef): number {
  const pa = state.combat.petAbility;
  const vuln = pa.enemyVulnMs > 0 ? 1 + pa.enemyVulnPct : 1;
  const dmg = Math.max(1, Math.round(monster.maxHp * fraction * vuln));
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
    case "manaRestore":
      state.character.mana = Math.min(stats.maxMana, state.character.mana + stats.maxMana * value);
      amount = Math.round(stats.maxMana * value);
      break;
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
      applyEnemyStatus(state, monster, {
        type: ability.status,
        magnitude,
        durationMs: ability.kind === "delayedDot" ? PET_ABILITY_DELAYED_DOT_MS : PET_ABILITY_STATUS_MS,
      });
      amount = magnitude; // Log zeigt die tatsächliche Schadens-Magnitude/s (0 bei frost)
      break;
    }
    case "stealDrop": {
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
