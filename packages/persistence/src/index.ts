import type {
  AttributeId,
  BuyBackEntry,
  CampBuildJob,
  ContentDB,
  EquipKit,
  EquipKitIndex,
  EquipSlot,
  GameState,
  InventorySlot,
  ItemId,
  ItemInstance,
  MailAttachment,
  MailMessage,
  OfflineSummary,
  PetId,
  PrestigeRecord,
  PrestigeRunTally,
  QuiverLoad,
  SkillEventId,
  SkillEventLogEntry,
  WorkOrder,
  RaidDifficulty,
  RaidRun,
  RaidWeeklyModifierId,
  QueueSkipReason,
  QueuedAction,
  SaveSummary,
} from "@hearthforge/shared";
import { defaultRaidState, makeRaidQueueEntry, RAID_WEEKLY_MODIFIERS } from "@hearthforge/shared"; // claude:2026-10-25T04:40:00+02:00 — Raid (SAVE 93)
import { QUIVER_CAPACITY } from "@hearthforge/shared"; // claude:2026-10-24T15:21:04+02:00 — Köcher-Deckel (QA-Runde 2 Fernkampf B2)
import { defaultSkillEventState, defaultWorkOrderState, EVENT_COOLDOWN_MS, EVENT_EXPIRE_MS, EVENT_LOG_MAX, ORDER_MAX_OPEN, SKILL_EVENT_IDS } from "@hearthforge/shared"; // claude:2026-10-24T23:55:00+02:00 — 1.4.0 Welle 3
import type { WorkOrderTier, WorkOrderTierClocks } from "@hearthforge/shared";
import { defaultWorkOrderTierClocks, ORDER_LEGACY_TIER, ORDER_TIERS, WORK_ORDER_TIERS, workOrderTierClockMax } from "@hearthforge/shared"; // claude:2026-10-25T17:05:00+01:00 — SAVE 97 gestufte Aufträge
import {
  consumableHeal,
  AP_MILESTONE_STEP_PCT,
  ATTRIBUTE_IDS,
  AUTO_POTION_DEFAULT_THRESHOLD,
  BASE_ATTRIBUTE_VALUE,
  BASE_BANK_CAPACITY,
  AUTO_EAT_DEFAULT_THRESHOLD,
  AUTO_EAT_MAX_THRESHOLD,
  AUTO_EAT_MIN_THRESHOLD,
  BASE_INVENTORY_SLOTS,
  CAMP_MAP_VISUAL_SCALE_MAX_PERCENT,
  CAMP_MAP_VISUAL_SCALE_MIN_PERCENT,
  CAMP_MAX_BUILDING_LEVEL,
  BUYBACK_BANNED_ITEM_IDS,
  BUYBACK_MAX_ENTRIES,
  COMBAT_LOG_MAX,
  COMPLETION_CAPE_KEY,
  DEFAULT_PORTRAIT,
  DEFAULT_THIEVING_RISK,
  DUNGEON_VARIANT_PREFIX,
  ELITE_COOLDOWN_HARD_CAP_MS,
  ELITE_WINDOW_MS,
  EQUIP_KIT_COUNT,
  EQUIP_SLOTS,
  TOOL_SLOTS,
  isToolSlot,
  KILL_COOLDOWN_MS,
  defaultEquipKits,
  emptyEquipKit,
  LEGACY_BASE_INVENTORY_SLOTS,
  MASTER_CAPE_LEVEL,
  MAX_BANK_SLOTS_PURCHASED,
  syncBankOrder,
  MAX_FARM_PLOTS,
  MAX_OFFLINE_MS,
  CAMP_MAX_OFFLINE_BONUS_MS,
  effectiveMaxOfflineMs,
  PARAGON_KEY_ITEM_ID,
  PARAGON_MAX_FLOOR,
  SAVE_VERSION,
  SELL_FRACTION,
  THIEVING_RISKS,
  TICK_MS,
  CAMP_BUILD_QUEUE_MAX,
  campRepairPositions,
  createPetAbilityRuntime,
  defaultAutoPotion,
  defaultCampState,
  defaultTavernState,
  defaultHuntTraps,
  HUNT_TRAP_SLOTS,
  emptyHuntTrap,
  LEATHERWORKING_SKILL_ID,
  TAILORING_SKILL_ID,
  TAVERN_BANDS,
  TAVERN_SEATS,
  defaultDailyState,
  defaultParagonState,
  defaultPrestigeState,
  PRESTIGE_HISTORY_MAX,
  PRESTIGE_RUN_BASELINE_KEYS, // claude:2026-10-18T19:40:00+02:00 — Prestige Welle E1
  PRESTIGE_RUN_TALLY_KEYS,
  defaultQuestState,
  defaultSettings,
  emptyFarmPlot,
  legacyOnboarding,
  makeDungeonQueueEntry,
  makeFightQueueEntry,
} from "@hearthforge/shared";
import type { EliteZoneState, FarmPlot, HuntCatch, HuntTrap } from "@hearthforge/shared";
import type { HuntCatchTally } from "@hearthforge/engine";
import { legacyVariantCellLayout, syncVariantCells } from "@hearthforge/engine"; // claude:2026-10-25T18:02:00+01:00 — feste Fächer der Variantenzellen (SAVE 98)
import type { InventoryState } from "@hearthforge/shared"; // claude:2026-10-25T18:02:00+01:00
import { actionLevelMet, MAX_STACK, deriveEventRngSeed, isQuiverItem, offhandFitsMain, storagePredicate, compactInventory, actionInputsOnHand, addItemOrBank, advance, beginQueueSkipTally, endQueueSkipTally, canEnterDungeon, canFightMonster, computeStats, createRng, deriveEliteRngSeed, discoverPossessedItems, effectiveCapacity, grantLoot, grantLootInstance, grantPendingCapes, initEliteZonesStaggered, isDungeonUnlocked, isEliteZoneHuntable, isHealPotion, resolveLeftRaidFight, isRefineRecipe, isZoneUnlocked, killCreditMonsterId, levelFromXp, refineAccCapMs, refineKindOf, secondPetSlotOwned, sendLetter, stopCombat, syncActiveKit, unlockParagonTower } from "@hearthforge/engine";

/**
 * MAXIMAL MÖGLICHES Offline-Fenster (8 h Basis + 3 h Wachturm-Vollausbau) — die Korruptions-Klemme
 * für die Timer-Felder in `sanitizeState`. Bewusst das Katalog-Maximum und NICHT das effektive
 * Fenster des konkreten Spielstands (s. Kommentar an der Klemme). Die echte Fenster-Größe beim
 * Laden liefert `effectiveMaxOfflineMs(state, content)` in `deserialize`.
 */
const MAX_POSSIBLE_OFFLINE_MS = MAX_OFFLINE_MS + CAMP_MAX_OFFLINE_BONUS_MS;

// ───────────────────────────────────────────────────────────────────────────
// Sanitize: defensiver Validierungs-/Clamp-Pass beim Laden (Security-Härtung r1).
//
// Läuft bei JEDEM Load am Ende von migrateState — KEIN SAVE_VERSION-Bump nötig, weil es eine
// reine Validierung ist (keine Schema-Änderung). Ziel ist NICHT Anti-Cheat (ein Client-Save eines
// SP-Idle-Games ist inhärent editierbar), sondern Korruptions-/Crash-/Soft-Brick-Schutz:
// manipulierte oder beschädigte Werte (NaN/Infinity/negativ/absurd groß, unbekannte Item-IDs,
// riesige Arrays) dürfen den State nicht dauerhaft kaputt machen oder die App einfrieren.
// Legitime Saves laufen unverändert durch (jeder Clamp ist no-op auf gültigen Werten).
// ───────────────────────────────────────────────────────────────────────────

/** Endliche Zahl ≥ 0, sonst Default. Fängt NaN/Infinity/negativ ab. */
function finiteNonNeg(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Endliche Zahl in [min, max], sonst Default (clamped, NaN/Infinity-fest). */
function clampFinite(value: unknown, min: number, max: number, fallback = min): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

/** Endliche, nicht-negative GANZE Zahl (abgerundet, Cap), sonst Default. */
function finiteIntNonNeg(value: unknown, cap: number, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(Math.min(value, cap));
}

/** Item-Liste `{ id, qty }[]` auf bekannte Items mit positiver ganzer Menge reduzieren (gleiche IDs bleiben getrennt). */
function sanitizeRewardItems(raw: unknown, content: ContentDB): { id: ItemId; qty: number }[] {
  const out: { id: ItemId; qty: number }[] = [];
  if (!Array.isArray(raw)) return out;
  for (const e of raw as unknown[]) {
    if (!e || typeof e !== "object") continue;
    const id = (e as { id?: unknown }).id;
    const qty = finiteIntNonNeg((e as { qty?: unknown }).qty, QTY_HARD_CAP, 0);
    if (typeof id !== "string" || !content.items[id] || qty < 1) continue;
    out.push({ id, qty });
  }
  return out;
}

const TAVERN_TASK_KINDS: ReadonlySet<string> = new Set(["deliver", "produce", "run", "kill", "dungeon", "champion", "assortment"]);

/**
 * Härtet EINE gewürfelte Tavernen-Aufgabe gegen den Content (taverne-spec-technik.md §2): bekannte
 * Vorlage DES Gastes (gleiche Art), Ziel je Art vorhanden (Item/Aktion/Monster/Dungeon/Variante),
 * Zahlen geklemmt (count ≥ 1, band 1..5, baseline ≥ 0, Gold/XP endlich ≥ 0), rewardItems nur
 * bekannte Items, bekannter Belohnungs-Skill, `actionId` nur bekannt. null = Aufgabe verwerfen
 * (Platz bleibt mit `task: null`, der nächste tavernRefresh besetzt neu). Idempotent.
 */
function sanitizeTavernTask(raw: unknown, guestId: string, content: ContentDB): GameState["tavern"]["seats"][number]["task"] {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const templateId = r.templateId;
  if (typeof templateId !== "string") return null;
  const tpl = content.tavernTasks?.find((t) => t.id === templateId);
  if (!tpl || tpl.guestId !== guestId) return null;
  const kind = r.kind;
  if (typeof kind !== "string" || !TAVERN_TASK_KINDS.has(kind) || kind !== tpl.kind) return null;
  const targetId = r.targetId;
  if (typeof targetId !== "string" || targetId.length === 0) return null;
  switch (kind) {
    case "deliver":
    case "produce":
    case "assortment":
      if (!content.items[targetId]) return null;
      break;
    case "run":
      if (!content.actions[targetId]) return null;
      break;
    case "kill":
      if (!content.monsters[targetId]) return null;
      break;
    case "dungeon":
      if (!content.dungeons.some((d) => d.id === targetId)) return null;
      break;
    case "champion":
      if (!content.elites?.[targetId]) return null;
      break;
    default:
      return null;
  }
  const rewardSkill = r.rewardSkill;
  if (typeof rewardSkill !== "string" || !content.skills[rewardSkill]) return null;
  const band = finiteIntNonNeg(r.band, TAVERN_BANDS, 1);
  const task: NonNullable<GameState["tavern"]["seats"][number]["task"]> = {
    templateId,
    kind: kind as NonNullable<GameState["tavern"]["seats"][number]["task"]>["kind"],
    band: Math.max(1, band),
    targetId,
    count: Math.max(1, finiteIntNonNeg(r.count, QTY_HARD_CAP, 1)),
    requiredLevel: finiteIntNonNeg(r.requiredLevel, 999, 0),
    accepted: r.accepted === true,
    baseline: finiteIntNonNeg(r.baseline, GOLD_HARD_CAP, 0),
    rewardGold: finiteIntNonNeg(r.rewardGold, GOLD_HARD_CAP, 0),
    rewardXp: finiteIntNonNeg(r.rewardXp, GOLD_HARD_CAP, 0),
    rewardSkill,
    rewardItems: sanitizeRewardItems(r.rewardItems, content),
    paysCrate: r.paysCrate === true,
  };
  if (kind === "assortment") {
    const ids = Array.isArray(r.targetIds) ? (r.targetIds as unknown[]).filter((x): x is string => typeof x === "string" && !!content.items[x]) : [];
    if (ids.length === 0) return null;
    task.targetIds = ids;
  }
  if (typeof r.actionId === "string" && content.actions[r.actionId]) task.actionId = r.actionId;
  return task;
}

/**
 * Härtet `state.tavern` (SAVE_VERSION 84, taverne-spec-technik.md §2): Zahlen geklemmt, Plätze nur
 * mit bekanntem Gast (unbekannt ⇒ Platzhalter = erster Aufgaben-Gast des Contents, `task: null`),
 * Aufgaben über `sanitizeTavernTask`, Länge 0 (nie besetzt / kein Tavernen-Content) oder EXAKT
 * `TAVERN_SEATS` (fehlende Plätze = Platzhalter mit `task: null` → nächster tavernRefresh besetzt
 * neu), `lastDelivery` nur mit gültiger Form, `deliveredByGuest` nur bekannte Gäste. Idempotent.
 */
function sanitizeTavern(state: GameState, content: ContentDB): void {
  const raw = (state.tavern && typeof state.tavern === "object" && !Array.isArray(state.tavern) ? state.tavern : null) as
    | Partial<Record<keyof GameState["tavern"], unknown>>
    | null;
  const t = defaultTavernState();
  if (!raw) {
    state.tavern = t;
    return;
  }
  t.day = finiteIntNonNeg(raw.day, 99_999_999, 0);
  t.swapsUsed = finiteIntNonNeg(raw.swapsUsed, QTY_HARD_CAP, 0);
  t.deliveredToday = finiteIntNonNeg(raw.deliveredToday, QTY_HARD_CAP, 0);
  t.totalDelivered = finiteIntNonNeg(raw.totalDelivered, GOLD_HARD_CAP, 0);
  t.deliverSeq = finiteIntNonNeg(raw.deliverSeq, GOLD_HARD_CAP, 0);
  t.introSeen = raw.introSeen === true;

  const guests = content.tavernGuests ?? [];
  const knownGuest = (id: unknown): id is string => typeof id === "string" && guests.some((g) => g.id === id);
  const placeholder = guests.find((g) => g.givesTasks)?.id ?? null;

  // Plätze: Länge 0 oder exakt TAVERN_SEATS.
  const rawSeats = Array.isArray(raw.seats) ? (raw.seats as unknown[]) : [];
  if (rawSeats.length > 0 && placeholder !== null) {
    for (let i = 0; i < TAVERN_SEATS; i++) {
      const s = rawSeats[i];
      const obj = s && typeof s === "object" ? (s as Record<string, unknown>) : null;
      const guestId = obj && knownGuest(obj.guestId) ? obj.guestId : placeholder;
      const task = obj && guestId === obj.guestId ? sanitizeTavernTask(obj.task, guestId, content) : null;
      t.seats.push({ guestId, task, swaps: finiteIntNonNeg(obj?.swaps, QTY_HARD_CAP, 0) });
    }
  }

  // Abgaben je Gast: nur bekannte Gäste, endliche ganze Zahlen ≥ 0.
  if (raw.deliveredByGuest && typeof raw.deliveredByGuest === "object" && !Array.isArray(raw.deliveredByGuest)) {
    for (const [id, n] of Object.entries(raw.deliveredByGuest as Record<string, unknown>)) {
      if (!knownGuest(id)) continue;
      const v = finiteIntNonNeg(n, GOLD_HARD_CAP, 0);
      if (v > 0) t.deliveredByGuest[id] = v;
    }
  }

  // Breadcrumb der jüngsten Abgabe: nur mit gültiger Form (bekannter Gast + Skill, Zahlen, Listen).
  const ld = raw.lastDelivery;
  if (ld && typeof ld === "object") {
    const d = ld as Record<string, unknown>;
    if (knownGuest(d.guestId) && typeof d.skill === "string" && content.skills[d.skill]) {
      t.lastDelivery = {
        seq: finiteIntNonNeg(d.seq, GOLD_HARD_CAP, 0),
        guestId: d.guestId,
        gold: finiteIntNonNeg(d.gold, GOLD_HARD_CAP, 0),
        xp: finiteIntNonNeg(d.xp, GOLD_HARD_CAP, 0),
        skill: d.skill,
        items: sanitizeRewardItems(d.items, content),
        crates: Array.isArray(d.crates) ? (d.crates as unknown[]).filter((x): x is string => typeof x === "string" && !!content.items[x]) : [],
      };
    }
  }
  state.tavern = t;
}

/**
 * Validiert eine (geladene) Item-Instanz gegen den aktuellen Content. Liefert die bereinigte
 * Instanz oder null (unbekannte/fehlende baseItemId ⇒ verwerfen). Affixe/Suffix werden STRUKTURELL
 * validiert (gültige Felder, endliche Werte), aber NICHT gegen den Katalog (`content.affixes`/
 * `content.suffixes`) gefiltert: das ist die einzige Stelle, an der eine Instanz beim Save/Load
 * Mods verlieren würde, und es wäre verlustbehaftet (eine Content-Umbenennung würde legitime
 * Instanzen entkernen). Unbekannte Affix-/Suffix-IDs sind harmlos — `instanceBonusDelta` (shared)
 * überspringt sie beim Stat-Aufbau (`if (!def) continue;`), sie können also nicht crashen.
 * Die Aufrufer behandeln eine modifikationslose Instanz (keine Affixe, kein Suffix) als „plain"
 * und degradieren sie zum Stack.
 */
function sanitizeInstance(raw: unknown, content: ContentDB): ItemInstance | null {
  if (!raw || typeof raw !== "object") return null;
  const inst = raw as Partial<ItemInstance>;
  if (typeof inst.baseItemId !== "string" || !content.items[inst.baseItemId]) return null;
  if (typeof inst.instanceId !== "string" || inst.instanceId.length === 0) return null;
  const affixesRaw = Array.isArray(inst.affixes) ? inst.affixes : [];
  const affixes = affixesRaw
    .filter(
      (a): a is { affixId: string; tier: number } =>
        !!a &&
        typeof a.affixId === "string" &&
        typeof a.tier === "number" &&
        Number.isFinite(a.tier),
    )
    .slice(0, 16)
    .map((a) => ({ affixId: a.affixId, tier: Math.max(1, Math.floor(a.tier)) }));
  let suffix = inst.suffix;
  if (suffix) {
    const ok =
      typeof suffix.suffixId === "string" &&
      Number.isFinite(suffix.ilvl) &&
      Number.isFinite(suffix.roll);
    if (!ok) suffix = undefined;
  }
  const out: ItemInstance = { instanceId: inst.instanceId, baseItemId: inst.baseItemId, affixes };
  if (suffix) {
    out.suffix = { suffixId: suffix.suffixId, ilvl: suffix.ilvl, roll: suffix.roll };
  }
  return out;
}

/** Harte Obergrenzen — großzügig genug für legitimes Endgame, eng genug gegen Overflow-DoS. */
const QTY_HARD_CAP = 1_000_000_000; // 1e9 pro Stack/Bank-Eintrag
const GOLD_HARD_CAP = Number.MAX_SAFE_INTEGER;
const XP_HARD_CAP = Number.MAX_SAFE_INTEGER; // Skill-/Mastery-XP: reiner Korruptionsschutz, KEIN Spiel-Deckel (s. XP-Pass)
const ARRAY_HARD_CAP = 100_000; // generische Obergrenze gegen Millionen-Element-Arrays
/** claude:2026-10-24T15:21:04+02:00 — Deckel der Bergungs-Schlösser je Spielstand (SAVE 90); beim Laden bleiben die neuesten. */
const SALVAGE_LOCK_CAP = 5000;

/**
 * EINGEFRORENE Kampf-Zonen-Liste zum v62-Zeitpunkt (Story-Zonen-Gating, SAVE_VERSION 62→63,
 * ceo-run-2026-07-13 Welle C): Alt-Saves (< 63) erhalten für JEDE dieser Zonen einen
 * Bestandsschutz-Grant (`legacyZoneGrants`) — Bestandsspieler verlieren NIE Zugriff auf Zonen,
 * die vor der Aschechronik frei waren (CEO-Leitplanke: „im Zweifel großzügig").
 *
 * BEWUSST als hartes Literal statt zur Laufzeit aus `content.zones` gelesen: die Migration muss
 * DETERMINISTISCH bleiben, wenn der Content später wächst — eine NACH v63 hinzukommende Zone
 * (z. B. der Endkampf-Dungeon-Kontext „behind_the_throne") darf für Alt-Saves NICHT automatisch
 * gegrantet werden, sie ist regulär quest-gated. Abgeschrieben aus packages/content/src/index.ts
 * (`zones`, Stand 2026-07-13, 11 Einträge). Diese Liste wird NIE erweitert — neue Zonen gehören
 * grundsätzlich nicht hierher (sie existierten zum v62-Zeitpunkt nicht).
 */
const LEGACY_V62_ZONE_IDS: readonly string[] = [
  "pastures",
  "borderlands",
  "ashfields",
  "blackthorn",
  "crypt",
  "wildwood",
  "coast",
  "slagpit",
  "highlands",
  "idolhall",
  "slayer_tower",
];

/**
 * EINGEFRORENE Schlüssel→Dungeon-Zuordnung zum v63-Zeitpunkt (quest-basierter Dungeon-Unlock,
 * SAVE_VERSION 63→64, ceo-run-2026-07-13 Welle J — Chef-Direktive „Keine Dungeon keys mehr,
 * sondern quest based unlock"). Grundlage der v64-Migration: Alt-Schlüssel im Besitz tragen
 * ihren Dungeon als Bestandsschutz in `dungeonsUnlocked` ein, die Bestände werden entfernt und
 * VOLL erstattet (qty × item.value).
 *
 * BEWUSST als hartes Literal statt zur Laufzeit aus `content.dungeons[].keyItem` gelesen
 * (Muster LEGACY_V62_ZONE_IDS): die Migration muss DETERMINISTISCH bleiben, wenn Welle K die
 * deprecated `keyItem`-Felder später umbaut/entfernt. Abgeschrieben aus
 * packages/content/src/index.ts (`dungeons`, Stand 2026-07-13). highland_key ist die legale
 * Mehrfach-Zuordnung (ein Schlüssel trug zwei Dungeons). OHNE paragon_key: der Paragonturm
 * bleibt eigenes Einmal-Unlock-System (Live-Intercept + Load-Sweep unverändert). Diese Liste
 * wird NIE erweitert — neue Dungeons sind quest-gated und hatten nie Schlüssel.
 */
const LEGACY_V63_KEY_TO_DUNGEONS: ReadonlyArray<readonly [ItemId, readonly string[]]> = [
  ["warband_key", ["goblin_warband"]],
  ["crypt_key", ["crypt_depths"]],
  ["wildwood_key", ["wildwood_hunt"]],
  ["highland_key", ["highland_aerie", "wyvern_lair"]],
  ["idolhall_key", ["idol_sanctum"]],
  ["masters_mark", ["behind_the_throne"]],
];

/**
 * Meister-Cape → Meister-RING Item-Renames (SAVE_VERSION 68→69, Chef-Entscheid 2026-07-17
 * „Skill-99-Belohnung = legendärer Ring statt Meister-Cape"): die 21 Level-99-Belohnungs-Items
 * wurden von `cape_master_<skillId>` auf `ring_master_<skillId>` umbenannt (Slot cape → ring1,
 * Stats 1:1). Läuft (a) über den generischen RENAME-Pfad in migrateState (inventory.slots/
 * equipment/food/buffs/bank) und (b) über einen dedizierten Erweiterungs-Block für die vom
 * generischen Pfad NICHT erfassten Flächen (Instanz-baseItemIds, Buy-Back, discoveredItems)
 * plus den Umzug eines GETRAGENEN Capes in den Ring-Slot.
 *
 * BEWUSST als hartes Literal statt zur Laufzeit aus `masterRingItemId(content.skills)` erzeugt
 * (Muster LEGACY_V62_ZONE_IDS/LEGACY_V63_KEY_TO_DUNGEONS): die Migration muss DETERMINISTISCH
 * bleiben, wenn später Skills dazukommen (z. B. der geplante Enchanting-Skill — ein
 * `cape_master_enchanting` hat NIE existiert und gehört nicht hierher). Diese Map wird NIE
 * erweitert. `completion` ist der COMPLETION_CAPE_KEY-Pseudo-Skill (Krönung).
 */
const RING_MASTER_RENAME: Readonly<Record<string, ItemId>> = {
  cape_master_attack: "ring_master_attack",
  cape_master_completion: "ring_master_completion",
  cape_master_cooking: "ring_master_cooking",
  cape_master_defence: "ring_master_defence",
  cape_master_farming: "ring_master_farming",
  cape_master_fishing: "ring_master_fishing",
  cape_master_foraging: "ring_master_foraging",
  cape_master_herblore: "ring_master_herblore",
  cape_master_jewelcrafting: "ring_master_jewelcrafting",
  cape_master_leatherworking: "ring_master_leatherworking",
  cape_master_magic: "ring_master_magic",
  cape_master_mining: "ring_master_mining",
  cape_master_power: "ring_master_power",
  cape_master_ranged: "ring_master_ranged",
  cape_master_runecrafting: "ring_master_runecrafting",
  cape_master_slayer: "ring_master_slayer",
  cape_master_smithing: "ring_master_smithing",
  cape_master_thieving: "ring_master_thieving",
  cape_master_vitality: "ring_master_vitality",
  cape_master_warding: "ring_master_warding",
  cape_master_woodcutting: "ring_master_woodcutting",
};

/** Die NEUEN Meisterring-IDs (Werte der Map oben) — für den Getragen-Umzug in migrateState. */
const RING_MASTER_IDS: ReadonlySet<string> = new Set(Object.values(RING_MASTER_RENAME));

/**
 * Defensiver Validierungs-Pass. Clamped alle Zahlen auf endliche, sinnvolle Bereiche und
 * verwirft unbekannte Item-/Pet-/Achievement-Referenzen. Mutiert `state` in-place.
 */
function sanitizeState(state: GameState, content: ContentDB): GameState {
  const known = (id: ItemId | null | undefined): boolean =>
    !!id && content.items[id as ItemId] !== undefined;
  // claude:2026-10-25T18:02:00+01:00 — SAVE 98: die gespeicherten Fächer der Variantenzellen ROH festhalten, bevor irgendein Sanitize-Schritt über
  // addItem/addInstance (`syncVariantCells`) das Feld neu schreibt. Fehlt es (jeder Stand < 98, s. migrateState), gilt die alte
  // Anzeige-Logik als Vorbelegung (`legacyVariantCellLayout`, unten am Ende).
  const rawVariantCells: unknown = (state.inventory as Partial<InventoryState> | undefined)?.variantCells;
  const variantCellsMissing = !rawVariantCells || typeof rawVariantCells !== "object" || Array.isArray(rawVariantCells);

  // — RNG: defensiv defaulten/validieren (Fix run5 #4). `state.rng` wurde bisher nie gehärtet, und
  //   `advance()` läuft in deserialize NACH migrate/sanitize, aber AUSSERHALB des migrate-try/catch.
  //   Ein hand-korrumpierter Save (rng fehlt / kein Objekt / nicht-endlicher state) würde dann beim
  //   Offline-Nachholen `nextFloat` mit NaN vergiften (NaN-Beute, kaputter Folge-Save) oder werfen.
  //   Nur für manipulierte Saves relevant; legitime Saves laufen unverändert durch. Idempotent.
  const rngRaw = (state.rng as { state?: unknown } | null | undefined) ?? null;
  if (!rngRaw || typeof rngRaw !== "object" || typeof rngRaw.state !== "number" || !Number.isFinite(rngRaw.state)) {
    state.rng = createRng(1);
  } else {
    state.rng = createRng(rngRaw.state);
  }
  // — Elite-RNG (SAVE_VERSION 72, design/elite-spawns-concept.md): exakt dieselbe Härtung wie `rng`
  //   oben (eigener, unabhängiger Strom — s. GameState.eliteRng-Doku). Ein manipulierter/beschädigter
  //   Save darf `tickEliteSpawns`/`onEliteKilled` nie mit NaN vergiften. —
  const eliteRngRaw = (state.eliteRng as { state?: unknown } | null | undefined) ?? null;
  if (
    !eliteRngRaw ||
    typeof eliteRngRaw !== "object" ||
    typeof eliteRngRaw.state !== "number" ||
    !Number.isFinite(eliteRngRaw.state)
  ) {
    state.eliteRng = createRng(1);
  } else {
    state.eliteRng = createRng(eliteRngRaw.state);
  }
  // claude:2026-10-24T23:55:00+02:00 — Ereignis-RNG (SAVE 92, 1.4.0 EV): dieselbe Härtung wie `rng`/`eliteRng`. Fehlt er, leitet die
  // Migration ihn ab; ein kaputter Wert wird deterministisch ersetzt.
  const eventRngRaw = (state.eventRng as { state?: unknown } | null | undefined) ?? null;
  if (!eventRngRaw || typeof eventRngRaw !== "object" || typeof eventRngRaw.state !== "number" || !Number.isFinite(eventRngRaw.state)) {
    state.eventRng = createRng(deriveEventRngSeed(typeof state.rng?.state === "number" ? state.rng.state : 1));
  } else {
    state.eventRng = createRng(eventRngRaw.state);
  }
  sanitizeSkillEvents(state, content);
  sanitizeWorkOrders(state, content);
  sanitizeRaid(state, content);

  // — Character: Gold/HP/Mana/totalLevel/autoEatTier —
  const c = state.character;
  c.gold = clampFinite(c.gold, 0, GOLD_HARD_CAP, 0);
  // Quest-Tokens (SAVE_VERSION 56): endlich & ≥ 0, analog gold (NaN würde jeden Token-Kauf vergiften).
  c.questTokens = clampFinite(c.questTokens, 0, GOLD_HARD_CAP, 0);
  c.hp = finiteNonNeg(c.hp, 0);
  c.mana = finiteNonNeg(c.mana, 0);
  c.totalLevel = finiteNonNeg(c.totalLevel, 0);
  c.autoEatTier = finiteNonNeg(c.autoEatTier, 0); // autoEatTier() clamped den Effekt zusätzlich
  // Auto-Trank-Einstellungen härten (SAVE_VERSION 49/79): Schwelle endlich in [0,1]; konfigurierter
  // Trank muss ein bekanntes Heil-Consumable sein, sonst null (aus); Rebuff-/Unlock-Flag strikt boolean.
  // migrateState hat das Objekt bereits gedefaultet — hier nur defensiv nachziehen.
  // „Heilt" wird wie in `consumableHeal` (shared) gedacht: ein Trank zählt als Heiler, wenn er
  // ENTWEDER flach (healAmount > 0) ODER prozentual (healPct > 0, %maxHp) heilt. Nur wenn WEDER
  // noch — dann null. So überlebt ein rein-prozentualer Trank (healPct > 0, healAmount 0/fehlt) den
  // Load, falls Content je einen shippt (sonst bräche der Auto-Trank fälschlich beim Laden weg).
  if (!c.autoPotion || typeof c.autoPotion !== "object") c.autoPotion = defaultAutoPotion();
  const ap = c.autoPotion;
  ap.healThreshold = clampFinite(ap.healThreshold, 0, 1, AUTO_POTION_DEFAULT_THRESHOLD);
  if (
    ap.healPotionId !== null &&
    (typeof ap.healPotionId !== "string" ||
      content.items[ap.healPotionId]?.type !== "consumable" ||
      ((content.items[ap.healPotionId]?.healAmount ?? 0) <= 0 &&
        (content.items[ap.healPotionId]?.healPct ?? 0) <= 0))
  ) {
    ap.healPotionId = null;
  }
  // codex:2026-08-02T16:20:00+02:00 — das bezahlte Unlock ist Voraussetzung; korrupte oder manuell
  // gesetzte Saves dürfen Auto-Buff nicht kostenlos aktivieren.
  ap.autoRebuffUnlocked = ap.autoRebuffUnlocked === true;
  ap.autoRebuffTonics = ap.autoRebuffUnlocked && ap.autoRebuffTonics === true;
  // Auto-Eat-Schwellen-Override (SAVE_VERSION 55): OPTIONAL. Nur klemmen, wenn gesetzt — ein
  // ungesetztes Feld bedeutet „kein Override" (der Kampf nutzt die feste Tier-Schwelle) und muss
  // undefined bleiben. Ein gesetzter (auch korrupter) Wert wird endlich in [min,max] geklemmt.
  if (c.autoEatThreshold !== undefined) {
    c.autoEatThreshold = clampFinite(
      c.autoEatThreshold,
      AUTO_EAT_MIN_THRESHOLD,
      AUTO_EAT_MAX_THRESHOLD,
      AUTO_EAT_DEFAULT_THRESHOLD,
    );
  }
  // baseAttributes: jedes Attribut endlich & ≥ 0 (NaN hier vergiftet sonst ALLE computeStats).
  if (c.baseAttributes && typeof c.baseAttributes === "object") {
    for (const id of ATTRIBUTE_IDS) {
      c.baseAttributes[id] = finiteNonNeg(c.baseAttributes[id], 0);
    }
  }

  // — Equipment-Slots: unbekannte IDs ablegen; Slot-Konsistenz ENGINE-GETREU prüfen (Spoofing) —
  // Erlaubt ist je Slot exakt das, was equipment.ts dort ausrüsten würde (equipItem/equipInstance/
  // equipTool/equipAmmo — die Engine-Regel spiegeln, nicht raten):
  //  • item.slot === slot (kanonischer Slot);
  //  • ring2 für Items mit slot "ring1": Ringe deklarieren kanonisch ring1, equipItem/equipInstance
  //    weichen auf ring2 aus. Der alte Check (`item.slot !== slot` ⇒ nullen) hat einen legitim in
  //    ring2 getragenen Ring bei JEDEM Laden still vernichtet — P1-Datenverlust (ui-audit-Fund);
  //  • die Werkzeug-Slots (TOOL_SLOTS, seit SAVE 87 vier statt drei — EINE Liste aus shared, damit
  //    hier nie einer fehlt) für Werkzeuge: `equipTool` (engine/equipment.ts) rüstet JEDES Item mit einem
  //    `tool`-Feld in einen freien Werkzeug-Slot aus — reine Werkzeuge (type "tool", KEIN slot-Feld)
  //    UND Dual-Use-Waffen (type "equipment", z.B. Äxte — Chef 2026-07-21). Der Check muss deshalb
  //    `!!item.tool` prüfen, NICHT `item.type === "tool"`: Ein `type==="tool"`-Check ließ Dual-Use-
  //    Äxte im Werkzeug-Slot bei JEDEM Load in die Bank „retten" (item.slot ist "mainhand", nicht der
  //    Tool-Slot) — still-silent-Verschieben, kein Crash, also lange unbemerkt (Fund beim tool3-Bau,
  //    SAVE_VERSION 72 NACHTRAG). tool3 fährt hier mit demselben Fix mit.
  //  (Der frühere "ammo"-Köcher-Fall ist mit dem Ammo-Removal #286/v57 gestorben — EQUIP_SLOTS
  //  enthält den Slot nicht mehr, migrateState lässt Alt-Köcher-Inhalt kontrolliert verfallen.)
  // Ein WIRKLICH invalider Eintrag (z. B. Waffe im Ring-Slot — nur per Save-Edit/Korruption möglich)
  // wird nicht mehr vernichtet, sondern GERETTET: modifizierte Instanz → Gear-Vault (bankInstances),
  // plain Item → 1 Stück in die Bank. Bank statt Inventar, weil sie als Record strukturell immer
  // Platz hat; die Bank-/Vault-Sanitize-Pässe laufen danach und validieren die Rettung mit. Nur
  // unbekannte Item-IDs werden weiterhin ersatzlos genullt (es gibt nichts Rettbares).
  const slotAccepts = (slot: EquipSlot, id: ItemId): boolean => {
    const item = content.items[id];
    if (!item) return false;
    if (item.slot === slot) return true;
    if (slot === "ring2" && item.slot === "ring1") return true;
    if (isToolSlot(slot) && !!item.tool) return true;
    return false;
  };
  const rawEqInst =
    c.equippedInstances && typeof c.equippedInstances === "object" && !Array.isArray(c.equippedInstances)
      ? (c.equippedInstances as Record<string, unknown>)
      : {};
  if (!Array.isArray(state.bankInstances)) state.bankInstances = [];
  for (const slot of EQUIP_SLOTS) {
    const id = c.equipment[slot];
    if (!id) continue;
    if (!known(id)) {
      c.equipment[slot] = null; // unbekanntes Item: nicht rettbar → ablegen (wie bisher)
      continue;
    }
    if (slotAccepts(slot, id)) continue;
    // Retten statt nullen: hängt am Slot eine gültige modifizierte Instanz, wandert sie mitsamt
    // Affixen/Suffix in den Gear-Vault; sonst das plain Item als 1 Stück in die Bank. Danach den
    // Slot leeren — der equippedInstances-Pass unten verwirft den Instanz-Eintrag dann automatisch
    // (equipment[slot] passt nicht mehr), es entsteht KEIN Duplikat.
    const inst = sanitizeInstance(rawEqInst[slot], content);
    if (inst && inst.baseItemId === id && (inst.affixes.length > 0 || inst.suffix)) {
      state.bankInstances.push(inst);
    } else {
      state.bank[id] = finiteNonNeg(state.bank[id], 0) + 1;
    }
    c.equipment[slot] = null;
  }

  // — Ausgerüstete Instanzen (Affix/Suffix-Detail je Slot): validieren + Invariante erzwingen.
  //   Behalten nur, wenn equipment[slot] === instance.baseItemId UND mind. eine Modifikation übrig
  //   ist (modifikationslose Instanz = plain → equipment[slot] genügt). —
  const cleanEqInst: Partial<Record<EquipSlot, ItemInstance>> = {};
  for (const slot of EQUIP_SLOTS) {
    const inst = sanitizeInstance(rawEqInst[slot], content);
    if (inst && c.equipment[slot] === inst.baseItemId && (inst.affixes.length > 0 || inst.suffix)) {
      cleanEqInst[slot] = inst;
    }
  }
  c.equippedInstances = cleanEqInst;

  // — Zweihandwaffe verdrängt Offhand beim Laden (rückwirkender Exploit-Fix, Chef-Freigabe) —
  //   Engine-Invariante (equipment.ts equipItem/equipInstance): eine Zweihandwaffe im Mainhand und
  //   eine belegte Offhand schließen sich aus — beim Anlegen verdrängt die 2H-Waffe die Offhand.
  //   Ein Alt-Save aus der Zeit VOR dieser Regel (oder ein Save-Edit) kann aber beides gleichzeitig
  //   tragen; das wird hier beim Laden aufgeräumt. Läuft NACH der Slot-/Instanz-Härtung, damit
  //   equipment.offhand ein bekanntes, slot-korrektes Offhand-Item ist und equippedInstances.offhand
  //   (falls vorhanden) konsistent zu equipment.offhand === inst.baseItemId ist.
  //   VERLUSTFREI über den Grant-Pfad (Inventar → Auto-Bank → Postfach): eine verzauberte/gesuffixte
  //   Instanz reist mitsamt Modifikationen (grantLootInstance in die unbegrenzte Instanz-Tasche), ein
  //   plain Item als 1 Stück (grantLoot). Danach den Slot leeren. Die nachfolgenden Inventar-/Bank-/
  //   Instanz-/Mailbox-Pässe validieren die Rückgabe mit. RNG-frei (Grant zieht kein RNG) und
  //   idempotent: kein Mainhand / 1H-Waffe / leere Offhand ⇒ No-op → serialize↔deserialize-stabil.
  {
    let entwaffnet = false;
    const mainId = c.equipment.mainhand;
    // claude:2026-10-24T19:00:00+02:00 — 1.4.0 FK: Bogen + Köcher ist gültig; ein Köcher neben einer anderen Haupthand fliegt (offhandFitsMain).
    const offItem = c.equipment.offhand ? content.items[c.equipment.offhand] : undefined;
    if (mainId && !offhandFitsMain(content.items[mainId], offItem)) {
      const offInst = c.equippedInstances.offhand;
      const offId = c.equipment.offhand;
      if (offInst) {
        grantLootInstance(state, content, offInst);
        delete c.equippedInstances.offhand;
        c.equipment.offhand = null;
        entwaffnet = true;
      } else if (offId) {
        grantLoot(state, content, offId, 1);
        c.equipment.offhand = null;
        entwaffnet = true;
      }
    }
    // 1.0.2: SAGEN, dass es passiert ist. Bis 1.0.1 trugen 35 der 47 Fernkampfwaffen faelschlich
    // kein `twoHanded` (Spieler-Report „Bogen + Schild gleichzeitig?"); mit der Korrektur greift
    // die Regel oben rueckwirkend und raeumt gewachsene Spielstaende auf. Ohne Erklaerung waere
    // das fuer den Spieler ein Schild, das ueber Nacht aus dem Slot verschwindet — genau die
    // Sorte stiller Aenderung, die als Fehler gemeldet wird (vgl. der New-Haven-Umzug, der ohne
    // Patchnote fuer Verwirrung gesorgt hat). Ein Brief kostet nichts, geht nie verloren und
    // steht auch dann noch da, wenn der Spieler beim Laden nicht hinschaut. Feuert von selbst
    // nur einmal: danach ist die Offhand leer und die Bedingung nie wieder wahr.
    if (entwaffnet && !isQuiverItem(offItem)) sendLetter(state, "warden", "mail.letter.warden.twoHandedRanged");
  }

  // claude:2026-10-24T19:00:00+02:00 — Köcher-Ladung (SAVE 91, 1.4.0 FK): nur ein bekannter Pfeil mit ganzzahliger Menge ≥ 0, sonst null.
  // Liegt kein Köcher in der Nebenhand, gehen die Pfeile verlustfrei ins Lager (= Bank, Lagerware ohne Fach).
  {
    const raw = (c as { quiver?: unknown }).quiver;
    let load: QuiverLoad | null = null;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const id = (raw as { itemId?: unknown }).itemId;
      if (typeof id === "string" && content.items[id]?.arrow) {
        // claude:2026-10-26T02:10:00+02:00 — Deckel wie bei Bank/Lager (QTY_HARD_CAP), QA-Saves #5.
        load = { itemId: id, qty: finiteIntNonNeg((raw as { qty?: unknown }).qty, QTY_HARD_CAP, 0) };
      }
    }
    if (load && !isQuiverItem(c.equipment.offhand ? content.items[c.equipment.offhand] : undefined)) {
      if (load.qty > 0) state.bank[load.itemId] = finiteNonNeg(state.bank[load.itemId], 0) + load.qty;
      load = { itemId: load.itemId, qty: 0 }; // claude:2026-10-26T03:50:00+02:00 — Art gemerkt wie syncQuiverLoad (QA-Fernkampf P3)
    }
    // claude:2026-10-24T15:21:04+02:00 — Köcher-Deckel (QA-Runde 2 Fernkampf B2): was über `QUIVER_CAPACITY` geladen ist, geht verlustfrei ins Lager
    // (wie Einlegen/Nachfüllen, die nur bis zum Deckel ziehen). Idempotent, jede Version.
    if (load && load.qty > QUIVER_CAPACITY) {
      state.bank[load.itemId] = finiteNonNeg(state.bank[load.itemId], 0) + (load.qty - QUIVER_CAPACITY);
      load = { itemId: load.itemId, qty: QUIVER_CAPACITY };
    }
    c.quiver = load;
  }

  // — Food: nur ein bekanntes Item —
  if (c.food && !known(c.food)) c.food = null;
  // claude:2026-10-23T16:45:00+02:00 — Mahlzeit-Platz (SAVE 89): nur eine bekannte Mahlzeit (Buff "food"), sonst null;
  // „Mahlzeit halten“ strikt boolean, Standard an.
  if (c.meal === undefined || (c.meal !== null && (typeof c.meal !== "string" || content.items[c.meal]?.buff?.category !== "food"))) {
    c.meal = null;
  }
  c.mealKeep = c.mealKeep !== false;

  // — Buffs: nur bekannte Items, endliche remainingMs —
  if (Array.isArray(c.buffs)) {
    c.buffs = c.buffs
      .filter((b) => b && known(b.itemId))
      .slice(0, ARRAY_HARD_CAP)
      .map((b) => ({ itemId: b.itemId, remainingMs: finiteNonNeg(b.remainingMs, 0) }));
  } else {
    c.buffs = [];
  }

  // — Ausrüstungs-Kits (SAVE_VERSION 85-Nachtrag, Chef-Entscheid 28.08.2026): STRIKT härten.
  //   `activeKit` ganzzahlig 0..EQUIP_KIT_COUNT-1 (sonst 0); Liste exakt EQUIP_KIT_COUNT (fehlende
  //   Kits → leer, Überhang gekappt — ein viertes Kit kann nur per Save-Edit existieren). Je
  //   INAKTIVEM Kit exakt die Regeln des Charakter-Blocks oben: unbekannte Item-IDs → leer (nicht
  //   rettbar); slot-fremdes Item wird GERETTET (modifizierte Instanz → Gear-Vault, plain → 1 Stück
  //   Bank); Instanz nur bei equipment[slot] === baseItemId UND mindestens einer Modifikation;
  //   Zweihand im Mainhand ⇒ Offhand verlustfrei über den Grant-Pfad zurück (Inventar → Bank →
  //   Post; KEIN Warden-Brief — das Kit wird nicht getragen, es verschwindet nichts vom Körper).
  //   Das AKTIVE Kit wird hier NICHT aus dem Save gelesen: seine Wahrheit ist `character` (oben
  //   gehärtet), der Spiegel wird GANZ AM ENDE von sanitizeState via syncActiveKit geschrieben —
  //   so kann kein späterer Pass (Cape-Nachreichung, HP-Deckel …) den Spiegel stale machen.
  //   Das Alt-Feld `equipLoadouts` (v75-Vorlagen) fliegt (migrateState hat es bereits überführt).
  //   Idempotent (Fixpunkt: ein sauberes Kit reproduziert sich byte-genau). —
  {
    const rawActive = (state as { activeKit?: unknown }).activeKit;
    state.activeKit =
      typeof rawActive === "number" && Number.isInteger(rawActive) && rawActive >= 0 && rawActive < EQUIP_KIT_COUNT
        ? (rawActive as EquipKitIndex)
        : 0;
    const rawKits: unknown[] = Array.isArray(state.equipKits) ? state.equipKits : [];
    const cleanKits: EquipKit[] = [];
    for (let i = 0; i < EQUIP_KIT_COUNT; i++) {
      const kit = emptyEquipKit();
      cleanKits.push(kit);
      if (i === state.activeKit) continue; // Spiegel des Charakters — kommt am Ende via syncActiveKit
      const raw = rawKits[i];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const rawEq = (raw as { equipment?: unknown }).equipment;
      const rawInst = (raw as { equippedInstances?: unknown }).equippedInstances;
      const eqRec =
        rawEq && typeof rawEq === "object" && !Array.isArray(rawEq) ? (rawEq as Record<string, unknown>) : {};
      const instRec =
        rawInst && typeof rawInst === "object" && !Array.isArray(rawInst) ? (rawInst as Record<string, unknown>) : {};
      for (const slot of EQUIP_SLOTS) {
        const id = eqRec[slot];
        if (typeof id !== "string" || !known(id)) continue;
        const inst = sanitizeInstance(instRec[slot], content);
        const modInst = inst && inst.baseItemId === id && (inst.affixes.length > 0 || inst.suffix) ? inst : null;
        // WERKZEUGE GEHÖREN NICHT INS KIT (SAVE 87): sie hängen am Charakter und überleben jeden
        // Wechsel. Regulär hat `migrateState` sie längst herausgeholt (in freie Werkzeug-Slots,
        // sonst per Grant-Pfad) — dieser Zweig ist das Sicherheitsnetz für alles, was danach noch
        // eines in ein Kit schreiben könnte. Er RETTET wie bei einem slot-fremden Teil, statt zu
        // löschen: ein Werkzeug ist Besitz (Kompat-Gesetz).
        if (isToolSlot(slot) || !slotAccepts(slot, id)) {
          if (modInst) state.bankInstances.push(modInst);
          else state.bank[id] = finiteNonNeg(state.bank[id], 0) + 1;
          continue;
        }
        kit.equipment[slot] = id;
        if (modInst) kit.equippedInstances[slot] = modInst;
      }
      const mainId = kit.equipment.mainhand;
      // claude:2026-10-24T19:00:00+02:00 — 1.4.0 FK: Bogen + Köcher bleibt auch im Kit zusammen (offhandFitsMain).
      if (mainId && !offhandFitsMain(content.items[mainId], kit.equipment.offhand ? content.items[kit.equipment.offhand] : undefined)) {
        const offInst = kit.equippedInstances.offhand;
        const offId = kit.equipment.offhand;
        if (offInst) grantLootInstance(state, content, offInst);
        else if (offId) grantLoot(state, content, offId, 1);
        delete kit.equippedInstances.offhand;
        kit.equipment.offhand = null;
      }
    }
    state.equipKits = cleanKits;
    delete (state as { equipLoadouts?: unknown }).equipLoadouts;
  }

  // — Das Lager (SAVE_VERSION 76, Task #358): Struktur strikt härten (Neuaufbau aus dem Default,
  //   Muster equipLoadouts). `buildings`: nur im Katalog (content.campBuildings) bekannte
  //   Gebäude-IDs, Stufen ganzzahlig auf 1..CAMP_MAX_BUILDING_LEVEL geklemmt (0/kaputt = Eintrag
  //   raus — fehlend IST Stufe 0). `buildJob`: nur strukturell stimmig (bekannte ID, targetLevel
  //   EXAKT aktuelle Stufe + 1, remainingMs endlich 0..Basis-Bauzeit der Zielstufe — mehr kann
  //   ein legitimer Job nie tragen, Schreibzelt-buildSpeed verkürzt nur; ein NICHT-ENDLICHER
  //   (NaN/Infinity/fehlender) Wert fällt konservativ auf die volle Bauzeit zurück); sonst wird
  //   der Job verworfen (sanitize repariert, erstattet aber NIE — cancelCampBuild ist der einzige
  //   Erstattungs-Pfad). buildSeq/lastCompletedBuild nach dem Monotonie-Muster petDropSeq
  //   (seq ≥ Breadcrumb-seq). Idempotent.
  //
  //   EHRLICHE EINORDNUNG DER remainingMs-KLEMME (Task #364 Fix 4): hier stand früher, der
  //   Rückfall auf die volle Bauzeit sei ein Schutz gegen „Instant-Fertig über ein hand-editiertes
  //   Save-Feld". Das ist er NICHT — ein eingetragenes `remainingMs: 0` ist endlich, passiert die
  //   Klemme unverändert und der Bau ist im nächsten Tick fertig. Bewusst kein Bug: Save-Editing
  //   liegt außerhalb des Bedrohungsmodells (wer die Datei editiert, trägt sich im selben Zug Gold
  //   und Materialien ein). Diese Klemme repariert KORRUPTION, sie verteidigt nicht gegen den
  //   Besitzer der Datei. —
  {
    const rawCamp = state.camp as unknown;
    const cleanCamp = defaultCampState();
    if (rawCamp && typeof rawCamp === "object" && !Array.isArray(rawCamp)) {
      const campCatalog = new Map((content.campBuildings ?? []).map((b) => [b.id, b]));
      const rawBuildings = (rawCamp as { buildings?: unknown }).buildings;
      if (rawBuildings && typeof rawBuildings === "object" && !Array.isArray(rawBuildings)) {
        for (const [id, lvl] of Object.entries(rawBuildings as Record<string, unknown>)) {
          if (!campCatalog.has(id)) continue;
          if (typeof lvl !== "number" || !Number.isFinite(lvl)) continue;
          const level = Math.floor(Math.min(CAMP_MAX_BUILDING_LEVEL, lvl));
          if (level >= 1) cleanCamp.buildings[id] = level;
        }
      }
      const rawJob = (rawCamp as { buildJob?: unknown }).buildJob;
      if (rawJob && typeof rawJob === "object" && !Array.isArray(rawJob)) {
        const j = rawJob as Partial<CampBuildJob>;
        const def = typeof j.buildingId === "string" ? campCatalog.get(j.buildingId) : undefined;
        const levelDef =
          def && typeof j.targetLevel === "number" && Number.isInteger(j.targetLevel) && j.targetLevel >= 1
            ? def.levels[j.targetLevel - 1]
            : undefined;
        if (def && levelDef && j.targetLevel === (cleanCamp.buildings[def.id] ?? 0) + 1) {
          cleanCamp.buildJob = {
            buildingId: def.id,
            targetLevel: j.targetLevel as number,
            remainingMs: clampFinite(j.remainingMs, 0, levelDef.buildMs, levelDef.buildMs),
          };
        }
      }
      // — Bauwarteschlange (SAVE_VERSION 81, Spieler-Report 1.0.2): Liste von Gebaeude-IDs.
      // Strikt gehaertet wie `buildings`: nur im Katalog bekannte IDs, Laenge auf
      // CAMP_BUILD_QUEUE_MAX geklemmt. Bewusst OHNE weitere Pruefungen — ob ein Eintrag beim
      // Anlauf wirklich baubar ist (Stufe schon max, Zentralhaus fehlt, Material fehlt), gehoert
      // nicht in die Ladehaertung: das kann sich bis dahin jederzeit aendern, und
      // `advanceCampQueue` prueft es ohnehin im Moment des Starts.
      const rawQueue = (rawCamp as { buildQueue?: unknown }).buildQueue;
      if (Array.isArray(rawQueue)) {
        for (const id of rawQueue) {
          if (cleanCamp.buildQueue.length >= CAMP_BUILD_QUEUE_MAX) break;
          if (typeof id !== "string" || !campCatalog.has(id)) continue;
          cleanCamp.buildQueue.push(id);
        }
      }
      cleanCamp.buildSeq = Math.floor(finiteNonNeg((rawCamp as { buildSeq?: unknown }).buildSeq, 0));
      const rawLast = (rawCamp as { lastCompletedBuild?: unknown }).lastCompletedBuild;
      if (rawLast && typeof rawLast === "object" && !Array.isArray(rawLast)) {
        const l = rawLast as { buildingId?: unknown; level?: unknown; seq?: unknown };
        if (typeof l.buildingId === "string" && campCatalog.has(l.buildingId)) {
          cleanCamp.lastCompletedBuild = {
            buildingId: l.buildingId,
            level: Math.floor(clampFinite(l.level, 1, CAMP_MAX_BUILDING_LEVEL, 1)),
            seq: Math.floor(finiteNonNeg(l.seq, 0)),
          };
          // Monotonie-Invariante (Muster petDropSeq): der Lebenszeit-Zähler ist NIE kleiner als
          // der jüngste Breadcrumb.
          cleanCamp.buildSeq = Math.max(cleanCamp.buildSeq, cleanCamp.lastCompletedBuild.seq);
        }
      }

      // — Offline-Veredelungs-Rezeptwahl (SAVE_VERSION 77, Task #359): je Veredelungs-Gebäude EIN
      //   Slot. Gestrippt wird alles, was die Engine-Verben (engine/refine.ts) nie erzeugt hätten:
      //   Schlüssel, die gar keine Veredelungs-Anlage sind (`refineKindOf`), unbekannte oder für
      //   DIESE Anlage unzulässige Rezept-IDs (`isRefineRecipe` — z.B. ein mehrzutatiges
      //   `smelt_bronze` oder ein Kochrezept im Schmelzofen). Die LEVEL-Anforderung wird hier
      //   bewusst NICHT geprüft: sie hängt am Spielstand, nicht an der Struktur — ein Rezept, das
      //   der Spieler (noch) nicht beherrscht, ruht in refine.ts still, statt die Wahl zu
      //   verlieren (Rückstufung durch einen künftigen Level-Rebalance darf keinen Datenverlust
      //   auslösen). Zahlen: accMs endlich 0..`refineAccCapMs` = msPerRun der TATSÄCHLICH
      //   gebauten Stufe DIESER Anlage (Stufe I 180 000 ms, II 90 000 ms, III 60 000 ms — die
      //   Engine lädt den Akkumulator bis auf genau einen eigenen Durchlauf auf). Bis Task #364
      //   klemmte hier `refineMaxAccMs`, also die 60 000 ms der ENDSTUFE — das schnitt einem
      //   Stufe-I-Schmelzofen bei JEDEM Laden bis zu 120 000 ms echten Fortschritt ab (Audit
      //   #363). Deshalb gegen `cleanCamp` (die bereits gehärteten Gebäude-Stufen, s. oben)
      //   gerechnet, nicht gegen den Katalog-Bestwert. produced ganzzahlig ≥ 0. Idempotent. —
      const rawRefine = (rawCamp as { refine?: unknown }).refine;
      if (rawRefine && typeof rawRefine === "object" && !Array.isArray(rawRefine)) {
        for (const [id, slot] of Object.entries(rawRefine as Record<string, unknown>)) {
          const kind = refineKindOf(content, id);
          if (!kind) continue; // kein Veredelungs-Gebäude (oder unbekannte ID)
          if (!slot || typeof slot !== "object" || Array.isArray(slot)) continue;
          const s = slot as { recipeId?: unknown; accMs?: unknown; produced?: unknown };
          if (typeof s.recipeId !== "string") continue;
          if (!isRefineRecipe(content.actions[s.recipeId], kind)) continue;
          cleanCamp.refine[id] = {
            recipeId: s.recipeId,
            accMs: clampFinite(s.accMs, 0, refineAccCapMs(cleanCamp, content, kind), 0),
            produced: Math.floor(finiteNonNeg(s.produced, 0)),
          };
        }
      }

      // — Karten-Positionen (SAVE_VERSION 78, Task #370): erst grob übernehmen (nur bekannte
      //   Gebäude-IDs, nur Objekte mit zwei endlichen Zahlen), die eigentliche Härtung macht
      //   `campRepairPositions` unten: 0..1-Klemme + Rundung, Strip für Gebäude ohne
      //   Karten-Präsenz, deterministische Rasterplatz-Vergabe für UNGÜLTIGE Plätze. Überlappende
      //   Plätze sind seit dem Chef-Nachentscheid 31.07. ERLAUBT und bleiben exakt erhalten
      //   (s. codex 2026-07-31T23:56:00 in shared `campRepairPositions`). —
      const rawPositions = (rawCamp as { positions?: unknown }).positions;
      if (rawPositions && typeof rawPositions === "object" && !Array.isArray(rawPositions)) {
        for (const [id, p] of Object.entries(rawPositions as Record<string, unknown>)) {
          if (!campCatalog.has(id)) continue;
          if (!p || typeof p !== "object" || Array.isArray(p)) continue;
          const { x, y } = p as { x?: unknown; y?: unknown };
          if (typeof x !== "number" || !Number.isFinite(x)) continue;
          if (typeof y !== "number" || !Number.isFinite(y)) continue;
          cleanCamp.positions[id] = { x, y };
        }
      }

      // codex:2026-08-03T12:45:00+02:00 — Persönliche Karten-Darstellung (SAVE_VERSION 80):
      // bekannte IDs, endliche Skalierung, gemeinsame 1..300-%-Grenzen und strikt boolescher Flip.
      const rawMapVisuals = (rawCamp as { mapVisuals?: unknown }).mapVisuals;
      if (rawMapVisuals && typeof rawMapVisuals === "object" && !Array.isArray(rawMapVisuals)) {
        for (const [id, visual] of Object.entries(rawMapVisuals as Record<string, unknown>)) {
          if (!campCatalog.has(id)) continue;
          if (!visual || typeof visual !== "object" || Array.isArray(visual)) continue;
          const { scalePercent, flipped } = visual as { scalePercent?: unknown; flipped?: unknown };
          if (typeof scalePercent !== "number" || !Number.isFinite(scalePercent)) continue;
          cleanCamp.mapVisuals[id] = {
            scalePercent: Math.max(
              CAMP_MAP_VISUAL_SCALE_MIN_PERCENT,
              Math.min(CAMP_MAP_VISUAL_SCALE_MAX_PERCENT, Math.round(scalePercent)),
            ),
            flipped: flipped === true,
          };
        }
      }
    }

    // — Der EINE Reparatur-Pass der Dorfkarte (shared, Task #370): stellt die Invariante her
    //   „genau die Gebäude auf der Karte haben eine Position und jede hält die volle Gebäudebühne
    //   im Kartenrand". KEINE Kollisions-Entzerrung mehr: Überlappung ist seit dem
    //   Chef-Nachentscheid 31.07. erlaubte Spielerwahl und bleibt exakt erhalten (codex
    //   2026-07-31T23:56:00 dort). Läuft BEWUSST außerhalb des rawCamp-Zweigs (auch ein
    //   komplett kaputtes `camp` bekommt so einen konsistenten — hier leeren — Karten-Zustand) und
    //   NACH der Gebäude-/Job-Härtung, weil er auf den bereits gehärteten Stufen aufsetzt. Er ist
    //   zugleich der MIGRATIONS-Weg der Bestandsspieler (v77 → v78: gar keine Positionen ⇒ jedes
    //   Gebäude bekommt in Katalog-Reihenfolge den nächsten freien Rasterplatz). Idempotent. —
    campRepairPositions(cleanCamp, content.campBuildings);
    // Overrides ohne Karten-Präsenz können die Engine-Verben nie erzeugen und werden entfernt.
    for (const id of Object.keys(cleanCamp.mapVisuals)) {
      if (!cleanCamp.positions[id]) delete cleanCamp.mapVisuals[id];
    }
    state.camp = cleanCamp;
  }

  // — Tages-Gratis-Skip der Trophäenwand III (SAVE_VERSION 77): reiner YYYYMMDD-Stempel, ganzzahlig
  //   ≥ 0 (0 = nie verbraucht). Keine Kalender-Plausibilisierung: der Stempel kommt vom Client, und
  //   ein „Zukunfts-Datum" kostet den Spieler höchstens den eigenen Gratis-Skip. —
  state.slayerFreeSkipDay = Math.floor(finiteNonNeg(state.slayerFreeSkipDay, 0));

  // — Skills/Mastery-XP: endlich, ≥ 0, gegen den harten Korruptions-Cap (XP_HARD_CAP). —
  //   BEWUSST NICHT gegen die Level-99-Schwelle (xpForLevel(MAX_LEVEL) = 13 034 431) klemmen:
  //   die Engine vergibt XP jenseits von Level 99 ungedeckelt weiter (tick.ts/farming.ts/
  //   slayer.ts/combat.ts addXp — Über-XP ist harmlos, levelFromXp kappt das Level bei 99;
  //   Mastery-Über-XP füllt weiterhin legitim den skillweiten Pool). Eine Schwellen-Klemme ist
  //   auf solchen legitimen Saves KEIN No-op — genau das riss am 2026-07-16 den
  //   Save-Kompat-Vault-Guard zeitversetzt (v64-Fixture: aktive Fischerei + wachsendes
  //   offlineMs bis zum 8h-Cap schoben fishing.xp über die Schwelle; der Re-Load beschnitt sie
  //   → serialize→deserialize-Round-Trip instabil). Der Hard-Cap fängt weiterhin
  //   NaN/Infinity/negativ (Save-Edit/Korruption) ab.
  for (const skill of Object.values(state.skills)) {
    if (skill) skill.xp = clampFinite(skill.xp, 0, XP_HARD_CAP, 0);
  }
  for (const key of Object.keys(state.mastery)) {
    const m = state.mastery[key];
    if (m) m.xp = clampFinite(m.xp, 0, XP_HARD_CAP, 0);
  }

  // — Inventar: unbekannte/leere itemIds verwerfen, qty clampen, Länge auf Kapazität trimmen —
  const inv = state.inventory;
  if (!Array.isArray(inv.instances)) inv.instances = [];
  const zelleAm = new Map<number, ItemId>(); // claude:2026-10-25T18:02:00+01:00 — SAVE 98: Fachindex → Basis der Variantenzelle
  if (Array.isArray(inv.slots)) {
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i];
      if (!s) continue;
      if (!known(s.itemId)) {
        inv.slots[i] = null;
        continue;
      }
      // Stray-Instanz in einem Slot (dürfte nach migrateState nicht mehr vorkommen — v53 zieht sie
      // in die Tasche) → defensiv in die Tasche verschieben, Slot leeren. Validierung folgt unten.
      if (s.instance) {
        inv.instances.push(s.instance);
        inv.slots[i] = null;
        continue;
      }
      const qty = clampFinite(s.qty, 0, QTY_HARD_CAP, 0);
      inv.slots[i] = qty > 0 ? { itemId: s.itemId, qty } : null;
    }
    // claude:2026-10-25T18:02:00+01:00 — SAVE 98: Reservierungen strukturell prüfen (bekannte ID, ganzzahliger Index im Bereich, Fach nach der Säuberung
    // leer, je Fach nur eine Zelle). Ob die Gruppe wirklich „rein“ ist, entscheidet `syncVariantCells` am Ende (die Instanz-Tasche
    // wird erst unten gesäubert).
    if (!variantCellsMissing) {
      const rec = rawVariantCells as Record<string, unknown>;
      for (const id of Object.keys(rec).slice(0, ARRAY_HARD_CAP)) {
        const idx = rec[id];
        if (id === "__proto__" || !known(id as ItemId)) continue;
        if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx >= inv.slots.length) continue;
        if (inv.slots[idx] || zelleAm.has(idx)) continue;
        zelleAm.set(idx, id as ItemId);
      }
    }
    // Auf effektive Kapazität trimmen (belegte zuerst), damit ein überlanges slots-Array nicht
    // bis zum nächsten Kapazitäts-Event hängen bleibt (DoS gegen sich selbst).
    const cap = effectiveCapacity(inv, content);
    if (inv.slots.length > cap) {
      const filled = inv.slots.filter((s) => s !== null);
      // claude:2026-10-25T18:02:00+01:00 — SAVE 98: Variantenzellen rücken wie belegte Fächer mit nach vorne (sonst zeigten ihre Reservierungen nach dem
      // Kompaktieren auf fremde Fächer). Stapel haben Vorrang: passt nicht alles in max(cap, Stapel), fallen die hintersten
      // Reservierungen weg (die Gruppe steht dann fachlos hinten wie bisher, `syncVariantCells` vergibt ihr später ein Fach).
      const laenge = Math.max(cap, filled.length);
      const eintraege: Array<{ slot: InventorySlot } | { zelle: ItemId }> = [];
      for (let i = 0; i < inv.slots.length; i++) {
        const s = inv.slots[i];
        if (s) eintraege.push({ slot: s });
        else if (zelleAm.has(i)) eintraege.push({ zelle: zelleAm.get(i)! });
      }
      let ueber = eintraege.length - laenge;
      for (let k = eintraege.length - 1; k >= 0 && ueber > 0; k--) {
        if ("zelle" in eintraege[k]!) {
          eintraege.splice(k, 1);
          ueber--;
        }
      }
      const next: typeof inv.slots = new Array(laenge).fill(null);
      zelleAm.clear();
      eintraege.forEach((e, i) => {
        if ("slot" in e) next[i] = e.slot;
        else zelleAm.set(i, e.zelle);
      });
      inv.slots = next;
    }
  } else {
    inv.slots = [];
  }
  // claude:2026-10-25T18:02:00+01:00 — SAVE 98: geprüfte Reservierungen setzen, damit spätere Sanitize-Schritte (Beute über addItem) sie respektieren.
  {
    const cells: Record<ItemId, number> = {};
    for (const [idx, id] of zelleAm) if (!Object.prototype.hasOwnProperty.call(cells, id)) cells[id] = idx;
    inv.variantCells = cells;
  }
  // Instanz-Tasche (v53) validieren — analog `bankInstances`: unbekannte baseItemId raus, jede Instanz
  // strukturell säubern; eine modifikationslose Instanz zerfällt zum plain Bank-Stack (die Tasche hält
  // nur echte Instanzen), Array gedeckelt. (Die stackbare Bank wird gleich darunter neu aufgebaut und
  // übernimmt den evtl. hier hinzugefügten Basis-Stack.)
  {
    const cleanBag: ItemInstance[] = [];
    for (const raw of inv.instances.slice(0, ARRAY_HARD_CAP)) {
      const instv = sanitizeInstance(raw, content);
      if (!instv) continue;
      if (instv.affixes.length === 0 && !instv.suffix) {
        state.bank[instv.baseItemId] = finiteNonNeg(state.bank[instv.baseItemId], 0) + 1;
        continue;
      }
      cleanBag.push(instv);
    }
    inv.instances = cleanBag;
  }
  // Bag-Slots: Taschenslot-System entfernt (SAVE_VERSION 56) — Invariante: immer leer.
  inv.bagSlots = [];

  // — Bank: unbekannte Keys verwerfen, Mengen clampen —
  const bank: Record<ItemId, number> = {};
  for (const [id, qty] of Object.entries(state.bank)) {
    if (!known(id as ItemId)) continue;
    const n = clampFinite(qty, 0, QTY_HARD_CAP, 0);
    if (n > 0) bank[id as ItemId] = n;
  }
  state.bank = bank;

  // — Bank-Platzierung (SAVE 87, Chef-Auftrag „wie OSRS"): `bankOrder` traegt NUR die Faecher,
  //   die Mengen bleiben in `bank`. Alt-Saves (< 87) haben das Feld nicht: dann entsteht es hier
  //   aus den vorhandenen Bank-Eintraegen in der Reihenfolge, die der Spieler zuletzt gesehen hat
  //   (alphabetisch nach Id — dieselbe Ordnung, die die alte Bankansicht als Vorgabe hatte), damit
  //   sich nach dem Update nichts verschiebt. `syncBankOrder` raeumt danach Unbekanntes weg,
  //   entfernt Doppelte und haengt fehlende Items an; es verliert dabei nie Bestand.
  if (!Array.isArray(state.bankOrder)) {
    // claude:2026-10-23T22:10:00+02:00 — 1.4.0 ML: Lagerware bekommt kein Bankfach (sie steht im Materiallager).
    const isStore = storagePredicate(content);
    state.bankOrder = (Object.keys(bank) as ItemId[]).filter((id) => !isStore(id)).sort();
  } else {
    state.bankOrder = state.bankOrder.map((id) =>
      typeof id === "string" && known(id as ItemId) ? (id as ItemId) : null,
    );
  }

  // claude:2026-10-23T22:50:00+02:00 — Bergungs-Schloss (1.4.0 BG, SAVE 90): nur Strings mit exakt `true`, gedeckelt; fehlt ⇒ {}.
  // claude:2026-10-24T15:21:04+02:00 — der Deckel behält die NEUESTEN Einträge (QA-Runde 2 Spielstände B4): `toggleSalvageLock` hängt ein frisches Schloss
  // hinten an (Einfügereihenfolge, Schlüssel sind nie ganzzahlig), vorher fiel genau dieses weg und die ältesten blieben.
  {
    const raw = (state as { lockedItems?: unknown }).lockedItems;
    const clean: Record<string, true> = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const valid = Object.entries(raw as Record<string, unknown>).filter(
        ([k, v]) => v === true && typeof k === "string" && k.length <= 200,
      );
      for (const [k] of valid.slice(-SALVAGE_LOCK_CAP)) clean[k] = true;
    }
    state.lockedItems = clean;
  }

  // — Bank-Ausbau: gekaufte Zusatz-Slots endlich, ≥ 0, ganzzahlig, ≤ Cap. Ein manipulierter Wert
  //   würde sonst die effektive Kapazität absurd aufblähen oder (NaN) computeStats/Deposit vergiften. —
  state.bankSlotsPurchased = Math.floor(
    clampFinite(state.bankSlotsPurchased, 0, MAX_BANK_SLOTS_PURCHASED, 0),
  );

  // — Achievements: nur bekannte IDs, dedupliziert, gedeckelt —
  if (Array.isArray(state.achievements)) {
    const knownAch = new Set(content.achievements.map((a) => a.id));
    state.achievements = [...new Set(state.achievements.filter((id) => knownAch.has(id)))].slice(
      0,
      ARRAY_HARD_CAP,
    );
  } else {
    state.achievements = [];
  }

  // — AP-Meilensteine (SAVE 66, Welle GG): claimed-Liste = ganze Vielfache von
  //   AP_MILESTONE_STEP_PCT in [STEP..100], dedupliziert + aufsteigend sortiert (die Vergabe
  //   pusht ohnehin aufsteigend → No-op auf legitimen Saves, Round-Trip-stabil). BEWUSST KEIN
  //   Abgleich gegen die aktuelle AP-Quote: claimed bleibt claimed — Content-Wachstum (Quote
  //   sinkt) darf vergebene Schritte NIE zurückziehen; überzählige Schritte sind inert (die
  //   Vergabe überspringt sie). Breadcrumb-Shape härten (Muster lastDungeonUnlock);
  //   apMilestoneSeq monoton ≥ lastApMilestone.seq (Muster petDropSeq — NIE senken/nullen);
  //   Zeremonie-Flag strikt boolean. Idempotent. —
  {
    const rawClaimed = Array.isArray(state.claimedApMilestones) ? state.claimedApMilestones : [];
    const validStep = (v: unknown): v is number =>
      typeof v === "number" &&
      Number.isFinite(v) &&
      Number.isInteger(v) &&
      v >= AP_MILESTONE_STEP_PCT &&
      v <= 100 &&
      v % AP_MILESTONE_STEP_PCT === 0;
    state.claimedApMilestones = [...new Set(rawClaimed.slice(0, ARRAY_HARD_CAP).filter(validStep))].sort(
      (a, b) => a - b,
    );
    const rawLast = state.lastApMilestone as
      | Partial<NonNullable<GameState["lastApMilestone"]>>
      | null
      | undefined;
    let cleanLast: GameState["lastApMilestone"] = null;
    if (rawLast && typeof rawLast === "object" && Array.isArray(rawLast.steps)) {
      const steps = rawLast.steps.filter(validStep);
      if (steps.length > 0) {
        cleanLast = {
          steps,
          tokens: Math.floor(finiteNonNeg(rawLast.tokens, 0)),
          seq: Math.floor(finiteNonNeg(rawLast.seq, 0)),
        };
      }
    }
    state.lastApMilestone = cleanLast;
    state.apMilestoneSeq = Math.max(
      Math.floor(finiteNonNeg(state.apMilestoneSeq, 0)),
      state.lastApMilestone?.seq ?? 0,
    );
    state.apCeremonyPending = state.apCeremonyPending === true;
  }

  // — Pets: ownedPets/companionPetId nur gegen bekannte Pets (sonst inert/abgelegt) —
  const ownedPets: Record<string, true> = {};
  if (state.character.ownedPets && typeof state.character.ownedPets === "object") {
    for (const id of Object.keys(state.character.ownedPets)) {
      if (state.character.ownedPets[id as keyof typeof state.character.ownedPets] && content.pets[id]) {
        ownedPets[id] = true;
      }
    }
  }
  state.character.ownedPets = ownedPets as typeof state.character.ownedPets;
  if (
    state.character.companionPetId &&
    (!content.pets[state.character.companionPetId] || !ownedPets[state.character.companionPetId])
  ) {
    state.character.companionPetId = null;
  }

  // — Talentbäume / Jagdbuch (1.3.0, kein SAVE-Bump: v87 war nie live) —
  //   claude:2026-10-18T00:30:00+02:00 — `talents`: nur bekannte Bäume/Knoten, Rang ganzzahlig in
  //   1..maxRank (gekappt), Rang 0 fällt weg; Voraussetzungen werden NICHT nachträglich erzwungen.
  //   `petPity`: nur bekannte, noch NICHT besessene Begleiter, ganzzahlig ≥ 0. Zweiter Platz
  //   `companionPetId2`: bekannt + besessen + ≠ Platz 1 + Talent `secondPetSlot` — sonst null.
  //   Fehlende Felder (jeder Alt-Save) werden so zu {} / {} / null.
  {
    const rawTalents = state.talents as unknown;
    const cleanTalents: Record<string, Record<string, number>> = {};
    if (rawTalents && typeof rawTalents === "object") {
      for (const tree of content.talentTrees ?? []) {
        const rawTree = (rawTalents as Record<string, unknown>)[tree.id];
        if (!rawTree || typeof rawTree !== "object") continue;
        const ranks: Record<string, number> = {};
        for (const node of tree.nodes) {
          const r = Math.floor(clampFinite((rawTree as Record<string, unknown>)[node.id], 0, node.maxRank, 0));
          if (r > 0) ranks[node.id] = r;
        }
        if (Object.keys(ranks).length > 0) cleanTalents[tree.id] = ranks;
      }
    }
    state.talents = cleanTalents;

    const rawPity = state.petPity as unknown;
    const cleanPity: Record<string, number> = {};
    if (rawPity && typeof rawPity === "object") {
      for (const [id, v] of Object.entries(rawPity as Record<string, unknown>)) {
        if (!content.pets[id] || ownedPets[id]) continue;
        const n = finiteIntNonNeg(v, Number.MAX_SAFE_INTEGER, 0);
        if (n > 0) cleanPity[id] = n;
      }
    }
    state.petPity = cleanPity as typeof state.petPity;

    const second = state.character.companionPetId2;
    if (
      typeof second !== "string" ||
      !content.pets[second] ||
      !ownedPets[second] ||
      second === state.character.companionPetId ||
      // claude:2026-10-18T12:00:00+02:00 — gekauft genügt (ohne Freischalt-Gate): nach einem Aufstieg ruht der
      // Jägerkodex bis Slayer 85, die Wahl im zweiten Platz bleibt aber erhalten (wirkt erst wieder ab 85).
      !secondPetSlotOwned(state, content)
    ) {
      state.character.companionPetId2 = null;
    }
  }

  // — Prestige (SAVE 88) —
  //   claude:2026-10-17T23:30:00+02:00 — fehlend/kaputt ⇒ Default; Zähler ganzzahlig ≥ 0; Historie nur aus
  //   vollständig gültigen Einträgen (je Feld ganzzahlig ≥ 0, count ≥ 1), gedeckelt auf PRESTIGE_HISTORY_MAX
  //   (die jüngsten bleiben). Invariante: count ≥ Historienlänge (jeder Aufstieg schreibt genau einen Eintrag).
  //   Idempotent: ein gültiger Zustand bleibt byte-gleich.
  {
    const raw = state.prestige as unknown;
    const clean = defaultPrestigeState();
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      clean.count = finiteIntNonNeg(r.count, Number.MAX_SAFE_INTEGER, 0);
      clean.points = finiteIntNonNeg(r.points, Number.MAX_SAFE_INTEGER, 0);
      clean.pointsSpent = finiteIntNonNeg(r.pointsSpent, Number.MAX_SAFE_INTEGER, 0);
      if (Array.isArray(r.history)) {
        for (const e of r.history) {
          if (!e || typeof e !== "object") continue;
          const rec = e as Record<string, unknown>;
          const isInt = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
          if (!isInt(rec.count) || rec.count < 1) continue;
          if (!isInt(rec.points) || !isInt(rec.totalLevel) || !isInt(rec.skills99) || !isInt(rec.activePlayMs)) continue;
          const entry: PrestigeRecord = {
            count: rec.count,
            points: rec.points,
            totalLevel: rec.totalLevel,
            skills99: rec.skills99,
            activePlayMs: rec.activePlayMs,
          };
          // claude:2026-10-18T19:40:00+02:00 — Welle E1: Bilanz nur vollständig gültig (alle Felder ganzzahlig ≥ 0),
          // sonst entfällt nur sie; der Eintrag selbst bleibt (Test-Saves vor E1 haben keine).
          const t = rec.tally;
          if (t && typeof t === "object") {
            const v = t as Record<string, unknown>;
            if (PRESTIGE_RUN_TALLY_KEYS.every((k) => isInt(v[k]))) {
              const tally = {} as PrestigeRunTally;
              for (const k of PRESTIGE_RUN_TALLY_KEYS) tally[k] = v[k] as number;
              entry.tally = tally;
            }
          }
          clean.history.push(entry);
        }
        if (clean.history.length > PRESTIGE_HISTORY_MAX) {
          clean.history = clean.history.slice(clean.history.length - PRESTIGE_HISTORY_MAX);
        }
      }
      clean.count = Math.max(clean.count, clean.history.length);
      // claude:2026-10-18T19:40:00+02:00 — Welle E1: Baselines des laufenden Durchgangs. Fehlt das Objekt
      // (Test-Saves vor E1), gelten alle Zähler ab Spielbeginn (0); nur `activePlayMs` ist exakt rekonstruierbar
      // (der jüngste Historien-Eintrag hält genau den Stand beim Aufstieg fest). Einzelne kaputte Werte ⇒ 0.
      const rs = r.runStart;
      if (rs && typeof rs === "object" && !Array.isArray(rs)) {
        const b = rs as Record<string, unknown>;
        for (const k of PRESTIGE_RUN_BASELINE_KEYS) clean.runStart[k] = finiteIntNonNeg(b[k], Number.MAX_SAFE_INTEGER, 0);
      } else if (clean.history.length > 0) {
        clean.runStart.activePlayMs = clean.history[clean.history.length - 1]!.activePlayMs;
      }
    }
    state.prestige = clean;
  }

  // — Aktive Aktion: gegen entfernte/unbekannte Aktionen nullen (defensiv, idempotent). content.actions
  // ist die Quelle der Wahrheit. Ohne diesen Guard zeigt ein Alt-Save, der beim Verlassen genau eine
  // später entfernte Aktion lief, eine leere „Aktiv"-Header-Zeile (kein Crash, da überall null-geprüft).
  if (state.activeActionId && !content.actions[state.activeActionId]) {
    state.activeActionId = null;
  }
  // claude:2026-10-24T15:21:04+02:00 — Skill-Level der laufenden Aktion wie `setActiveAction` (QA-Runde 2 Spielstände B1): ein Alt-Save mitten im Bogenbau
  // (v91, Bögen ziehen vom Handwerk in die Bognerei, alle starten bei Stufe 1) lief sonst offline ohne Bognerei-Stufe weiter. Die
  // Aktion endet mit Grund `level_too_low`, nichts wird produziert; Items und XP bleiben. Versionsfrei (jede Version), idempotent; die
  // Engine prüft dasselbe in jedem Tick (tick.ts skillingStep). Skills sind oben schon geklemmt und umbenannt.
  if (state.activeActionId && !actionLevelMet(state, content, state.activeActionId)) {
    state.lastStop = { actionId: state.activeActionId, reason: "level_too_low" };
    state.activeActionId = null;
    state.actionProgressMs = 0;
  }

  // — Mengen-Craft-Ziel: null = unbegrenzt; sonst endliche positive Ganzzahl. Manipulierte/kaputte
  //   Werte (NaN/Infinity/≤0/Float) → auf eine gültige Form bringen. Invariante: ohne aktive Aktion
  //   gibt es kein Ziel (sonst „Geister-Ziel", das beim nächsten Start mitzählen könnte). —
  if (
    typeof state.actionTarget === "number" &&
    Number.isFinite(state.actionTarget) &&
    state.actionTarget > 0
  ) {
    state.actionTarget = Math.floor(Math.min(state.actionTarget, QTY_HARD_CAP));
  } else {
    state.actionTarget = null;
  }
  if (!state.activeActionId) state.actionTarget = null;

  // — Action-Queue (SAVE_VERSION 70; `kind`-Diskriminator + Kampf-Einträge seit 73/#312): nur
  //   wohlgeformte Einträge behalten. `target` ist für BEIDE Sorten null ODER eine endliche
  //   positive Ganzzahl (wie actionTarget; NaN/Infinity/≤0/Float → null = „bis Stopp"/∞,
  //   Cap QTY_HARD_CAP).
  //    • kind "fight": `monsterId` muss ein bekanntes, NICHT-dungeonOnly-Monster sein (Content-
  //      Drift/nie-queuebar → Eintrag raus, analog unbekannter actionId); `actionId` wird auf den
  //      Übergangs-Platzhalter normiert (makeFightQueueEntry — EINE Konstruktions-Stelle).
  //    • sonst (kind "action", fehlend oder unbekannt — Alt-Saves stempelt die Migration, hier
  //      belt-and-suspenders): bekannte `actionId` nötig (content.actions = Quelle der Wahrheit).
  //   Nicht-Array, kaputte/leere Einträge → verworfen. Idempotent. —
  if (!Array.isArray(state.actionQueue)) {
    state.actionQueue = [];
  } else {
    const cleanQueue: QueuedAction[] = [];
    for (const raw of state.actionQueue as unknown[]) {
      if (!raw || typeof raw !== "object") continue;
      const t = (raw as { target?: unknown }).target;
      const target =
        typeof t === "number" && Number.isFinite(t) && t > 0
          ? Math.floor(Math.min(t, QTY_HARD_CAP))
          : null;
      if ((raw as { kind?: unknown }).kind === "fight") {
        const monsterId = (raw as { monsterId?: unknown }).monsterId;
        if (typeof monsterId !== "string") continue;
        const monster = content.monsters[monsterId];
        if (!monster || monster.dungeonOnly) continue;
        cleanQueue.push(makeFightQueueEntry(monsterId, target));
        continue;
      }
      if ((raw as { kind?: unknown }).kind === "dungeon") {
        // kind "dungeon" (SAVE_VERSION 83): `dungeonId` muss ein bekannter Dungeon MIT Wellen sein
        // (Content-Drift / Paragonturm ohne encounters → Eintrag raus, analog dungeonOnly-Kampf);
        // `actionId` wird auf den Übergangs-Platzhalter normiert (makeDungeonQueueEntry).
        const dungeonId = (raw as { dungeonId?: unknown }).dungeonId;
        if (typeof dungeonId !== "string") continue;
        const dungeon = content.dungeons.find((d) => d.id === dungeonId);
        if (!dungeon || dungeon.encounters.length === 0) continue;
        cleanQueue.push(makeDungeonQueueEntry(dungeonId, target));
        continue;
      }
      if ((raw as { kind?: unknown }).kind === "raid") {
        // claude:2026-10-25T04:40:00+02:00 — kind "raid" (SAVE 93): bekannter Raid und gültige Stufe, sonst raus.
        const raidId = (raw as { raidId?: unknown }).raidId;
        const diff = (raw as { raidDifficulty?: unknown }).raidDifficulty;
        if (typeof raidId !== "string" || !(content.raids ?? []).some((r) => r.id === raidId)) continue;
        if (diff !== "normal" && diff !== "heroic" && diff !== "mythic") continue;
        cleanQueue.push(makeRaidQueueEntry(raidId, diff, target));
        continue;
      }
      const actionId = (raw as { actionId?: unknown }).actionId;
      if (typeof actionId !== "string" || !content.actions[actionId]) continue;
      cleanQueue.push({ kind: "action", actionId, target });
    }
    state.actionQueue = cleanQueue;
  }

  // (Die Härtung der Kampf-Queue-LAUFZEIT — queueFight/queuePaused/lastQueueSkip, SAVE_VERSION 73 —
  //  läuft bewusst WEITER UNTEN, NACH der Kampf-Gate-Load-Invariante: die kann einen getamperten
  //  Kampf noch per stopCombat beenden, und die queueFight⇔combat-Konsistenz muss auf dem
  //  ENDGÜLTIGEN Kampf-Zustand geprüft werden.)

  // — Timer/Akkumulator: endlich & plausibel (riesiger accumulatorMs = Endlos-Tick-Schleife) —
  //   Klemme seit SAVE 77 (Das Lager/Wachturm, Task #359): auf das MAXIMAL MÖGLICHE Offline-Fenster
  //   (8 h + 3 h Wachturm-Vollausbau), NICHT auf das des konkreten Spielstands. Warum das Maximum:
  //   die Klemme ist eine Korruptions-Schranke, keine Balance-Regel — würde sie mit dem eigenen
  //   Baufortschritt schrumpfen, verlöre ein Spieler beim Abriss/bei einem Content-Rollback still
  //   legitime Timer-Werte. Die ECHTE Fenster-Größe entscheidet `effectiveMaxOfflineMs` unten in
  //   `deserialize`. —
  state.accumulatorMs = clampFinite(state.accumulatorMs, 0, MAX_POSSIBLE_OFFLINE_MS, 0);
  state.actionProgressMs = clampFinite(state.actionProgressMs, 0, MAX_POSSIBLE_OFFLINE_MS, 0);
  state.stunMs = clampFinite(state.stunMs, 0, MAX_POSSIBLE_OFFLINE_MS, 0);
  // Thieving-Risiko: nur die definierten Modi zulassen, sonst auf „careful" zurückfallen.
  if (!THIEVING_RISKS.includes(state.thievingRisk)) state.thievingRisk = DEFAULT_THIEVING_RISK;
  state.totalTicks = finiteNonNeg(state.totalTicks, 0);
  state.elapsedMs = finiteNonNeg(state.elapsedMs, 0);
  state.activePlayMs = finiteNonNeg(state.activePlayMs, 0);
  // Invariante: aktive Spielzeit ≤ Sim-Zeit (activePlayMs zählt nur live, elapsedMs zählt auch offline
  // → activePlayMs kann nie größer sein). Manipulierte/kaputte Saves auf die Invariante zurückholen.
  state.activePlayMs = Math.min(state.activePlayMs, state.elapsedMs);

  // — Farming-Plots: fixe Länge, Crop gegen content.crops validieren, Zeit-/Mengen-Clamps —
  // Läuft NACH der elapsedMs-Härtung, damit der plantedAtMs-Clamp gegen einen sauberen Wert greift.
  const crops = content.crops ?? {};
  const plots: FarmPlot[] = Array.isArray(state.farmPlots) ? state.farmPlots : [];
  const sanitizedPlots: FarmPlot[] = [];
  for (let i = 0; i < MAX_FARM_PLOTS; i++) {
    const raw = plots[i];
    const base = emptyFarmPlot();
    if (!raw || typeof raw !== "object") {
      sanitizedPlots.push(base);
      continue;
    }
    // cropId nur behalten, wenn die Crop im aktuellen Content existiert; sonst Plot leeren.
    const cropId = typeof raw.cropId === "string" && crops[raw.cropId] ? raw.cropId : null;
    // plantedAtMs nie in der Zukunft (sonst Negativ-Wachstum/Exploit) und nie negativ.
    const plantedAtMs = cropId ? clampFinite(raw.plantedAtMs, 0, state.elapsedMs, 0) : 0;
    // readyItem nur, wenn bekanntes Item; sonst wartende Ernte verwerfen.
    const readyItem = typeof raw.readyItem === "string" && known(raw.readyItem) ? raw.readyItem : null;
    const readyYield = readyItem ? clampFinite(raw.readyYield, 0, QTY_HARD_CAP, 0) : 0;
    // Folgesorte (SAVE_VERSION 82, #p12): nur behalten, wenn String, im aktuellen Content vorhanden
    // und ungleich der wachsenden Sorte (Plan == Sorte ist nutzlos, setNextCrop lehnt es ab).
    // BEWUSST auch auf einem LEEREN Beet gültig (Chef-Entscheid #12.2: fehlt die Saat zur Reife,
    // bleibt der Plan stehen und der Tick sät ein, sobald Saat da ist). Level wird hier nicht
    // geprüft — der Tick sät dann schlicht nicht (Muster buildQueue: keine Baubarkeits-Prüfung
    // in der Ladehärtung).
    const rawNext = (raw as { nextCropId?: unknown }).nextCropId;
    const nextCropId =
      typeof rawNext === "string" && crops[rawNext] && rawNext !== cropId ? rawNext : null;
    sanitizedPlots.push({
      cropId,
      plantedAtMs,
      autoReplant: typeof raw.autoReplant === "boolean" ? raw.autoReplant : base.autoReplant,
      readyYield,
      readyItem: readyYield > 0 ? readyItem : null,
      nextCropId,
    });
  }
  state.farmPlots = sanitizedPlots;

  // — Combat-State: HP/Timer endlich, Effekt-Magnituden endlich, Log gedeckelt —
  const cb = state.combat;
  cb.enemyHp = finiteNonNeg(cb.enemyHp, 0);
  cb.playerTimerMs = finiteNonNeg(cb.playerTimerMs, 0);
  cb.enemyTimerMs = finiteNonNeg(cb.enemyTimerMs, 0);
  cb.kills = finiteNonNeg(cb.kills, 0);
  cb.eventCount = finiteNonNeg(cb.eventCount, 0);
  cb.encounterIndex = finiteNonNeg(cb.encounterIndex, 0);
  const sanitizeEffects = (effs: typeof cb.playerEffects): typeof cb.playerEffects =>
    (Array.isArray(effs) ? effs : [])
      .filter((e) => e && typeof e.type === "string")
      .slice(0, ARRAY_HARD_CAP)
      .map((e) => ({
        type: e.type,
        remainingMs: finiteNonNeg(e.remainingMs, 0),
        magnitude: clampFinite(e.magnitude, 0, QTY_HARD_CAP, 0),
      }));
  cb.playerEffects = sanitizeEffects(cb.playerEffects);
  cb.enemyEffects = sanitizeEffects(cb.enemyEffects);
  if (Array.isArray(cb.log) && cb.log.length > COMBAT_LOG_MAX) {
    cb.log = cb.log.slice(-COMBAT_LOG_MAX);
  } else if (!Array.isArray(cb.log)) {
    cb.log = [];
  }
  // Kill-Cooldown (persistiert-optional, Sweep6 T7-F1): endlich und maximal KILL_COOLDOWN_MS —
  // ein save-editierter Riesenwert würde den Kampf sonst dauerhaft einfrieren (stopCombat/startCombat
  // übernehmen den Rest bewusst). ≤0/ungültig ⇒ Feld weg (Engine-Konvention „abgelaufen → undefined").
  if (cb.cooldownRemainingMs !== undefined) {
    const cd = clampFinite(cb.cooldownRemainingMs, 0, KILL_COOLDOWN_MS, 0);
    cb.cooldownRemainingMs = cd > 0 ? cd : undefined;
  }
  // — Paragonturm (SAVE_VERSION 61, dungeon-rework-spec §7): STRIKT härten. —
  //   (1) state.paragon: checkpoint/best endlich, ≥ 0, ganzzahlig, ≤ PARAGON_MAX_FLOOR
  //       (Numerik-Guard: 1,12^f läuft ab ~f≈6000 in Infinity — ein editierter Riesenwert
  //       würde sonst beim nächsten Etagen-Start NaN/Infinity-Stats erzeugen). Invariante
  //       best ≥ checkpoint (der Rekord kann nie hinter dem laufenden Aufstieg liegen).
  //   (2) combat.paragonFloor: nur gültig als EXAKT checkpoint+1 in einem aktiven Kampf ohne
  //       Dungeon-Run — alles andere (Save-Edit „paragonFloor: 999" für Etagen-999-Erträge,
  //       verwaistes Feld ohne Kampf, Kollision mit dungeonId) beendet den Kampf strikt
  //       (monsterId null; der Checkpoint bleibt = kein Verlust; startParagonFloor setzt sauber
  //       bei checkpoint+1 fort). Legitime Saves laufen unverändert durch; idempotent.
  {
    const rawParagon = state.paragon as Partial<GameState["paragon"]> | null | undefined;
    const checkpoint = Math.floor(clampFinite(rawParagon?.checkpoint, 0, PARAGON_MAX_FLOOR, 0));
    const best = Math.max(
      checkpoint,
      Math.floor(clampFinite(rawParagon?.best, 0, PARAGON_MAX_FLOOR, 0)),
    );
    state.paragon = { checkpoint, best };
    if (cb.paragonFloor !== undefined) {
      const floor = Math.floor(clampFinite(cb.paragonFloor, 0, PARAGON_MAX_FLOOR, 0));
      const valid = floor === checkpoint + 1 && cb.monsterId !== null && cb.dungeonId === null;
      if (valid) {
        cb.paragonFloor = floor;
      } else {
        cb.paragonFloor = undefined;
        cb.monsterId = null; // inkonsistente Turm-Etage ⇒ Kampf beenden statt raten
      }
    }
  }
  // — Paragon-Truhen-Breadcrumb (SAVE 68, Welle LL): Shape härten (Muster lastApMilestone) —
  //   floor ganzzahlig in [1..PARAGON_MAX_FLOOR] (sonst Breadcrumb verworfen), chestTier
  //   ganzzahlig ≥ 1, items nur bekannte Item-IDs mit qty ≥ 1 (unbekannte/defekte Rows fliegen —
  //   ein LEERES items-Array bleibt legitim: Truhe vergeben, alle Chance-Rows verfehlt).
  //   paragonChestSeq monoton ≥ lastParagonChest.seq (Muster petDropSeq — NIE senken/nullen).
  //   Idempotent. —
  {
    const rawChest = state.lastParagonChest as
      | Partial<NonNullable<GameState["lastParagonChest"]>>
      | null
      | undefined;
    let cleanChest: GameState["lastParagonChest"] = null;
    if (
      rawChest &&
      typeof rawChest === "object" &&
      Array.isArray(rawChest.items) &&
      typeof rawChest.floor === "number" &&
      Number.isInteger(rawChest.floor) &&
      rawChest.floor >= 1 &&
      rawChest.floor <= PARAGON_MAX_FLOOR
    ) {
      const items: { id: ItemId; qty: number }[] = [];
      for (const it of rawChest.items.slice(0, ARRAY_HARD_CAP)) {
        if (!it || typeof it !== "object" || typeof it.id !== "string" || !content.items[it.id]) continue;
        const qty = Math.floor(clampFinite(it.qty, 0, QTY_HARD_CAP, 0));
        if (qty > 0) items.push({ id: it.id, qty });
      }
      cleanChest = {
        floor: rawChest.floor,
        chestTier: Math.max(1, Math.floor(finiteNonNeg(rawChest.chestTier, 1))),
        items,
        seq: Math.floor(finiteNonNeg(rawChest.seq, 0)),
      };
    }
    state.lastParagonChest = cleanChest;
    state.paragonChestSeq = Math.max(
      Math.floor(finiteNonNeg(state.paragonChestSeq, 0)),
      state.lastParagonChest?.seq ?? 0,
    );
  }

  // — Elite-/World-Spawns (SAVE_VERSION 72, design/elite-spawns-concept.md): eliteZones strikt auf
  //   die beiden gültigen Shapes härten (Ruhe `{cooldownMs}` ODER Aktiv `{variantId,remainingMs}`).
  //   Unbekannte Zonen-KEYS werden TOLERIERT (Content-Drift-Leitplanke, Muster legacyZoneGrants —
  //   eine später entfernte Zone liegt einfach inert herum, tickEliteSpawns iteriert nur über die
  //   aktuellen content.zones und fasst sie nie an). Ein AKTIVER Eintrag mit einer `variantId`, die
  //   im aktuellen Content NICHT (mehr) existiert (Content entfernt/Save-Edit), wird STATT eines
  //   Crashs/Verwurfs in Ruhe mit `cooldownMs: 0` überführt (sofort wieder fällig — der nächste
  //   tickEliteSpawns-Durchlauf würfelt bei Bedarf ganz normal über eliteRng weiter; sanitize selbst
  //   bleibt dadurch RNG-frei, wie jeder andere Clamp-Pass). Zahlen werden endlich/≥0/gedeckelt
  //   (ELITE_WINDOW_MS bzw. der zonen-unabhängige blunte ELITE_COOLDOWN_HARD_CAP_MS — sanitize
  //   braucht keine zonen-PRÄZISE Bänder, nur Crash-/NaN-Schutz) — Schutz gegen einen editierten
  //   Riesenwert. —
  {
    const rawZones =
      state.eliteZones && typeof state.eliteZones === "object" && !Array.isArray(state.eliteZones)
        ? (state.eliteZones as Record<string, unknown>)
        : {};
    const cleanZones: Record<string, EliteZoneState> = {};
    for (const [zoneId, raw] of Object.entries(rawZones)) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Partial<{ variantId: unknown; remainingMs: unknown; cooldownMs: unknown }>;
      if (typeof r.variantId === "string") {
        if (content.elites?.[r.variantId]) {
          cleanZones[zoneId] = {
            variantId: r.variantId,
            remainingMs: clampFinite(r.remainingMs, 0, ELITE_WINDOW_MS, 0),
          };
        } else {
          cleanZones[zoneId] = { cooldownMs: 0 }; // Variante verschwunden → Ruhe, sofort fällig
        }
        continue;
      }
      cleanZones[zoneId] = { cooldownMs: clampFinite(r.cooldownMs, 0, ELITE_COOLDOWN_HARD_CAP_MS, 0) };
    }
    state.eliteZones = cleanZones;
  }
  // — Elite-Spawn-Breadcrumb (Muster lastApMilestone/lastParagonChest — Shape-Härtung; bewusst OHNE
  //   Content-Abgleich der variantId: ein stale Toast nach Content-Entfernung ist rein kosmetisch,
  //   kein Crash-Risiko). eliteSpawnSeq monoton ≥ lastEliteSpawn.seq (Muster petDropSeq — NIE
  //   senken/nullen). —
  {
    const rawSpawn = state.lastEliteSpawn as
      | Partial<NonNullable<GameState["lastEliteSpawn"]>>
      | null
      | undefined;
    let cleanSpawn: GameState["lastEliteSpawn"] = null;
    if (
      rawSpawn &&
      typeof rawSpawn === "object" &&
      typeof rawSpawn.zoneId === "string" &&
      typeof rawSpawn.variantId === "string"
    ) {
      cleanSpawn = {
        zoneId: rawSpawn.zoneId,
        variantId: rawSpawn.variantId,
        seq: Math.floor(finiteNonNeg(rawSpawn.seq, 0)),
      };
    }
    state.lastEliteSpawn = cleanSpawn;
    state.eliteSpawnSeq = Math.max(
      Math.floor(finiteNonNeg(state.eliteSpawnSeq, 0)),
      state.lastEliteSpawn?.seq ?? 0,
    );
  }
  // — Elite-Sieg-Breadcrumb (SAVE_VERSION 74, Task #324): STRIKTE Shape-Härtung — anders als beim
  //   rein kosmetischen lastEliteSpawn werden hier die itemIds GEGEN DEN CONTENT geprüft (die
  //   UI-Sieg-Zeremonie rendert Item-Karten aus drops/uniqueItemId — eine unbekannte Id soll gar
  //   nicht erst ankommen): unbekannte drops-Zeilen werden gestrippt, ein unbekanntes Unique fällt
  //   auf null (+ suffixRolled false — ohne Unique gibt es keinen Unique-Suffix). Kaputtes/
  //   unbekanntes Gesamt-Shape → null. Die variantId bleibt bewusst OHNE Content-Abgleich (Muster
  //   lastEliteSpawn — ein stale Breadcrumb nach Content-Entfernung ist kosmetisch, die UI muss
  //   eine fehlende Variante ohnehin abfangen). eliteKillSeq monoton ≥ lastEliteKill.seq (Muster
  //   eliteSpawnSeq — NIE senken/nullen). Idempotent. —
  {
    const rawKill = state.lastEliteKill as
      | Partial<NonNullable<GameState["lastEliteKill"]>>
      | null
      | undefined;
    let cleanKill: GameState["lastEliteKill"] = null;
    if (rawKill && typeof rawKill === "object" && typeof rawKill.variantId === "string") {
      const dropsRaw = Array.isArray(rawKill.drops) ? rawKill.drops : [];
      const drops = dropsRaw
        .filter(
          (d): d is { itemId: string; qty: number } =>
            !!d &&
            typeof d === "object" &&
            typeof d.itemId === "string" &&
            content.items[d.itemId] !== undefined &&
            typeof d.qty === "number" &&
            Number.isFinite(d.qty) &&
            d.qty > 0,
        )
        .slice(0, 64) // Elite-extraLoot hat eine Handvoll Zeilen — blunter Cap gegen Save-Edit-Riesen-Arrays
        .map((d) => ({ itemId: d.itemId, qty: Math.min(QTY_HARD_CAP, Math.floor(d.qty)) }));
      const uniqueItemId =
        typeof rawKill.uniqueItemId === "string" && content.items[rawKill.uniqueItemId] !== undefined
          ? rawKill.uniqueItemId
          : null;
      cleanKill = {
        variantId: rawKill.variantId,
        atMs: finiteNonNeg(rawKill.atMs, 0),
        drops,
        uniqueItemId,
        suffixRolled: uniqueItemId !== null && rawKill.suffixRolled === true,
        bountyTokens: Math.floor(finiteNonNeg(rawKill.bountyTokens, 0)),
        seq: Math.floor(finiteNonNeg(rawKill.seq, 0)),
      };
      // claude:2026-10-25T10:32:00+01:00 — Slayer-Punkte des Champion-Kills (SAVE 96, optional): nur eine endliche Zahl ≥ 0, ganzzahlig;
      // fehlt sie (Breadcrumb aus Saves vor v96) oder ist sie kaputt, bleibt das Feld weg (die UI zeigt dann nichts).
      if (typeof rawKill.slayerPoints === "number" && Number.isFinite(rawKill.slayerPoints) && rawKill.slayerPoints >= 0) {
        cleanKill.slayerPoints = Math.min(GOLD_HARD_CAP, Math.floor(rawKill.slayerPoints));
      }
    }
    state.lastEliteKill = cleanKill;
    state.eliteKillSeq = Math.max(
      Math.floor(finiteNonNeg(state.eliteKillSeq, 0)),
      state.lastEliteKill?.seq ?? 0,
    );
  }

  // — Früh-Garantie-Suffix (SAVE_VERSION 72): strikte boolean-Härtung bei JEDEM Load (Defense-in-
  //   Depth zusätzlich zur migrateState-Härtung oben) — jeder Nicht-boolesche Wert (Save-Edit/
  //   Korruption) fällt KONSERVATIV auf `true` zurück (verhindert einen wiederholbaren Garantie-
  //   Suffix-Exploit über ein hand-editiertes Feld; Muster autoBank/autoParagonAscend, aber bewusst
  //   mit `true` statt `false` als Sicherheitsrichtung). Ein legitimes `false` (frischer Save) bleibt
  //   unangetastet. —
  if (typeof state.firstSuffixGranted !== "boolean") state.firstSuffixGranted = true;

  // — Champion-Codex (SAVE_VERSION 72, selber Bump, „Jagd-Paket" S2/M): strikte Struktur-Härtung —
  //   endliche Ganzzahlen ≥ 0 (sightings/kills/uniques), fastestKillMs endlich ≥ 0 ODER null.
  //   Unbekannte variantIds werden TOLERIERT (Content-Drift-Leitplanke, Muster eliteZones/
  //   legacyZoneGrants — ein später entfernter Elite behält seine Statistik). Nicht-Objekt/Array → {}. —
  {
    const rawCodex =
      state.eliteCodex && typeof state.eliteCodex === "object" && !Array.isArray(state.eliteCodex)
        ? (state.eliteCodex as Record<string, unknown>)
        : {};
    const cleanCodex: GameState["eliteCodex"] = {};
    for (const [variantId, raw] of Object.entries(rawCodex)) {
      if (!raw || typeof raw !== "object") continue;
      const r = raw as Partial<{ sightings: unknown; kills: unknown; uniques: unknown; fastestKillMs: unknown }>;
      const fastest =
        typeof r.fastestKillMs === "number" && Number.isFinite(r.fastestKillMs) && r.fastestKillMs >= 0
          ? r.fastestKillMs
          : null;
      cleanCodex[variantId] = {
        sightings: Math.floor(finiteNonNeg(r.sightings, 0)),
        kills: Math.floor(finiteNonNeg(r.kills, 0)),
        uniques: Math.floor(finiteNonNeg(r.uniques, 0)),
        fastestKillMs: fastest,
      };
    }
    state.eliteCodex = cleanCodex;
  }

  // — Stats: alle kumulativen Zähler endlich & ≥ 0 —
  const st = state.stats;
  st.kills = finiteNonNeg(st.kills, 0);
  st.deaths = finiteNonNeg(st.deaths, 0);
  st.itemsGathered = finiteNonNeg(st.itemsGathered, 0);
  st.itemsCrafted = finiteNonNeg(st.itemsCrafted, 0);
  st.goldSpent = finiteNonNeg(st.goldSpent, 0);
  st.dailyStreak = finiteNonNeg(st.dailyStreak, 0);
  st.lastDailyDay = finiteNonNeg(st.lastDailyDay, 0);
  // — Jagen (SAVE_VERSION 85, spec-technik §3/§5): `huntTraps` STRIKT härten — fixe Länge HUNT_TRAP_SLOTS;
  //   Gebiet nur, wenn es in `content.huntingZones` steht (sonst Platz leer, Köder verfällt — Muster
  //   unbekannte Crop), `remainingMs` endlich in [0, trapMs] (nie „ewig gestellt"), `autoRebait`/
  //   `lastMissed` strikt boolean, `lastCatch` nur mit bekanntem Monster und bekannten Items (Mengen
  //   ganzzahlig ≥ 1, `gold`/`seq` endlich ≥ 0), sonst null. `huntCatchSeq` ≥ jede gespeicherte
  //   Fang-Nummer (Toast-Dedupe der UI verlässt sich auf strikt steigende seq). Ohne Jagd-Katalog
  //   (Alt-Content) werden alle Plätze geleert, die Breadcrumbs bleiben. Idempotent. —
  {
    const huntZones = Array.isArray(content.huntingZones) ? content.huntingZones : [];
    const rawTraps: unknown[] = Array.isArray(state.huntTraps) ? state.huntTraps : [];
    let maxSeq = 0;
    state.huntTraps = Array.from({ length: HUNT_TRAP_SLOTS }, (_, i): HuntTrap => {
      const t = rawTraps[i] as Partial<Record<keyof HuntTrap, unknown>> | null | undefined;
      if (!t || typeof t !== "object") return emptyHuntTrap();
      const zone = typeof t.zoneId === "string" ? huntZones.find((z) => z.zoneId === t.zoneId) : undefined;
      const remainingMs = zone ? clampFinite(t.remainingMs, 0, Math.max(1, zone.trapMs), 0) : 0;
      let lastCatch: HuntCatch | null = null;
      const lc = t.lastCatch as Partial<Record<keyof HuntCatch, unknown>> | null | undefined;
      if (lc && typeof lc === "object" && typeof lc.monsterId === "string" && content.monsters[lc.monsterId]) {
        const seq = finiteIntNonNeg(lc.seq, Number.MAX_SAFE_INTEGER, 0);
        if (seq > maxSeq) maxSeq = seq;
        lastCatch = {
          seq,
          monsterId: lc.monsterId,
          items: sanitizeRewardItems(lc.items, content),
          gold: finiteIntNonNeg(lc.gold, GOLD_HARD_CAP, 0),
        };
      }
      return {
        zoneId: zone ? zone.zoneId : null,
        remainingMs,
        autoRebait: t.autoRebait !== false,
        lastCatch,
        lastMissed: t.lastMissed === true,
      };
    });
    state.huntCatchSeq = Math.max(finiteIntNonNeg(state.huntCatchSeq, Number.MAX_SAFE_INTEGER, 0), maxSeq);
    st.huntCatches = finiteIntNonNeg(st.huntCatches, Number.MAX_SAFE_INTEGER, 0);
    if (!st.huntCatchesById || typeof st.huntCatchesById !== "object") st.huntCatchesById = {};
    for (const id of Object.keys(st.huntCatchesById)) {
      if (!content.monsters[id]) delete st.huntCatchesById[id];
      else st.huntCatchesById[id] = finiteIntNonNeg(st.huntCatchesById[id], Number.MAX_SAFE_INTEGER, 0);
    }
  }
  // Taverne (SAVE 84): Zähler-Records nur mit endlichen, nicht-negativen Zahlen (Muster craftedById).
  for (const key of ["actionRunsById", "producedById"] as const) {
    const rec = st[key];
    if (!rec || typeof rec !== "object") { st[key] = {}; continue; }
    for (const id of Object.keys(rec)) rec[id] = finiteNonNeg(rec[id], 0);
  }
  // claude:2026-10-24T15:21:04+02:00 — Beet-Ernte (SAVE 94, QA-Runde 2 Klarheit B1): nur bekannte Items, endliche positive Mengen; fehlt/kaputt ⇒ {}.
  {
    const rec = (st as { harvestedById?: unknown }).harvestedById;
    const clean: Record<string, number> = {};
    if (rec && typeof rec === "object" && !Array.isArray(rec)) {
      for (const [id, n] of Object.entries(rec as Record<string, unknown>)) {
        if (!content.items[id]) continue;
        const v = finiteNonNeg(n, 0);
        if (v > 0) clean[id] = v;
      }
    }
    st.harvestedById = clean;
  }
  // claude:2026-10-24T16:03:31+02:00 — Erzeugt je Skill (SAVE 95, QA-Runde 2 Werkstatt B2): nur bekannte Skills und Items, endliche positive Mengen; sonst {}.
  {
    const raw = (st as { producedBySkill?: unknown }).producedBySkill;
    const clean: Partial<Record<string, Record<string, number>>> = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [skill, rec] of Object.entries(raw as Record<string, unknown>)) {
        if (!content.skills[skill] || !rec || typeof rec !== "object" || Array.isArray(rec)) continue;
        const inner: Record<string, number> = {};
        for (const [id, n] of Object.entries(rec as Record<string, unknown>)) {
          if (!content.items[id]) continue;
          const v = finiteNonNeg(n, 0);
          if (v > 0) inner[id] = v;
        }
        if (Object.keys(inner).length > 0) clean[skill] = inner;
      }
    }
    st.producedBySkill = clean;
  }

  // — Slayer: Punkte/Completed clampen; Task gegen aktuellen Content validieren —
  state.slayerPoints = clampFinite(state.slayerPoints, 0, GOLD_HARD_CAP, 0);
  state.slayerTasksCompleted = finiteNonNeg(state.slayerTasksCompleted, 0);
  // claude:2026-10-25T10:32:00+01:00 — Aufträge automatisch fortsetzen (SAVE 96): strikt boolean, nur exakt `true` schaltet ein.
  state.slayerAutoTask = state.slayerAutoTask === true;
  const task = state.slayerTask;
  if (
    task &&
    (typeof task !== "object" ||
      !(content.slayerMasters ?? []).some((m) => m.id === task.masterId) ||
      !content.monsters[task.monsterId])
  ) {
    // Task mit unbekanntem Master/Monster (gelöschter Content / Korruption) → verwerfen.
    state.slayerTask = null;
  } else if (task) {
    // [Task #347, P0 — Bestands-Heilung OHNE SAVE-Bump] Geister-Task-Normalisierung: Live-Saves
    // (v0.2.1/0.2.2) tragen Welt-Tasks auf dg_-Dungeon-Zwillinge (dg_skeleton_warrior & Co.), die
    // der Generator fälschlich vergab. Solche Tasks sind UNERFÜLLBAR — jeder Kill kreditiert via
    // killCreditMonsterId (engine/combat.ts) auf die BASIS-ID, der dg_-Zähler bleibt ewig 0/N.
    // Heilung beim Laden (idempotent, deterministisch, Teil des sanitize-Passes — KEINE Migration):
    //  - Basis existiert → Task auf die Basis-ID umschreiben (Fortschritt/Umfang/Belohnungen
    //    bleiben; isTower = false, die Basis ist ein Welt-Monster). Kills zählen ab sofort.
    //  - dg_-ID OHNE Basis (Content-Drift) → kostenlos annullieren (Punkte/Streak unangetastet —
    //    derselbe „verwerfen ohne Strafe"-Pfad wie unbekannte Monster oben).
    // Basis-/Turm-Tasks laufen unverändert durch (creditId === monsterId ⇒ komplettes No-op).
    const creditId = killCreditMonsterId(content, task.monsterId);
    if (creditId !== task.monsterId) {
      task.monsterId = creditId;
      task.isTower = false;
    } else if (task.monsterId.startsWith(DUNGEON_VARIANT_PREFIX)) {
      state.slayerTask = null;
    }
    if (state.slayerTask) {
      task.required = clampFinite(task.required, 0, QTY_HARD_CAP, 0);
      task.progress = clampFinite(task.progress, 0, task.required, 0);
      task.xpReward = finiteNonNeg(task.xpReward, 0);
      task.pointReward = finiteNonNeg(task.pointReward, 0);
      task.isTower = task.isTower === true;
    }
  }
  // — Slayer-Streak (SAVE 66, Welle GG): Serie endlich/≥0/ganzzahlig; Bonus-Breadcrumb-Shape
  //   härten (Muster lastApMilestone); slayerStreakSeq monoton ≥ lastSlayerStreakBonus.seq
  //   (Muster petDropSeq — NIE senken/nullen). Idempotent. —
  {
    state.slayerStreak = Math.floor(finiteNonNeg(state.slayerStreak, 0));
    const rawBonus = state.lastSlayerStreakBonus as
      | Partial<NonNullable<GameState["lastSlayerStreakBonus"]>>
      | null
      | undefined;
    let cleanBonus: GameState["lastSlayerStreakBonus"] = null;
    if (
      rawBonus &&
      typeof rawBonus === "object" &&
      typeof rawBonus.streak === "number" &&
      Number.isFinite(rawBonus.streak) &&
      rawBonus.streak > 0
    ) {
      cleanBonus = {
        streak: Math.floor(rawBonus.streak),
        tokens: Math.floor(finiteNonNeg(rawBonus.tokens, 0)),
        points: Math.floor(finiteNonNeg(rawBonus.points, 0)),
        seq: Math.floor(finiteNonNeg(rawBonus.seq, 0)),
      };
    }
    state.lastSlayerStreakBonus = cleanBonus;
    state.slayerStreakSeq = Math.max(
      Math.floor(finiteNonNeg(state.slayerStreakSeq, 0)),
      state.lastSlayerStreakBonus?.seq ?? 0,
    );
  }

  // — Köcher: GESTORBEN (#286 Ammo-Removal, v57). `ammoCount` existiert nicht mehr im Typ —
  //   den Alt-Key restlos aus geladenen Saves löschen (Alt-Saves/Save-Edits tragen ihn noch),
  //   damit er nicht als toter Ballast ewig re-serialisiert wird. —
  delete (state as { ammoCount?: unknown }).ammoCount;

  // — Gear-Vault (bankInstances): jede Instanz validieren; modifikationslose Instanzen zerfallen
  //   zum plain Bank-Stack (der Vault hält nur echte Instanzen). Unbekannte baseItemIds raus. —
  if (Array.isArray(state.bankInstances)) {
    const cleanVault: ItemInstance[] = [];
    for (const raw of state.bankInstances.slice(0, ARRAY_HARD_CAP)) {
      const inst = sanitizeInstance(raw, content);
      if (!inst) continue;
      if (inst.affixes.length === 0 && !inst.suffix) {
        state.bank[inst.baseItemId] = (state.bank[inst.baseItemId] ?? 0) + 1;
        continue;
      }
      cleanVault.push(inst);
    }
    state.bankInstances = cleanVault;
  } else {
    state.bankInstances = [];
  }
  // — Instanz-ID-Zähler: endlich & ≥ 0 (deterministische ID-Vergabe darf nie NaN/negativ werden). —
  state.nextInstanceSeq = Math.floor(finiteNonNeg(state.nextInstanceSeq, 0));

  // — Postfach/Mailbox (SAVE_VERSION 71, plus `letter` in 72 und `transfer` in 87 (ehem. 88);
  //   codex:2026-08-31T23:08:00+02:00):
  //   jede Mail härten. DREI bekannte Sorten, ALLE über dieselben `items`/`instances`-Felder (echtes
  //   Discriminated Union, s. shared `MailMessage` — ein Brief ist strukturell eine Überlauf-Mail
  //   plus `from`+`textKey`, KEIN separates `attachments`-Feld) — unbekannte Sorten/kaputte Einträge
  //   raus (Muster actionQueue). `items` per bekannter itemId gestapelt (positive endliche
  //   Ganzzahl-qty, gegen QTY_HARD_CAP), `instances` über sanitizeInstance. Eine OVERFLOW-Mail ohne
  //   jeden gültigen Inhalt (keine items UND keine instances) fällt raus — leere Überlauf-Mails
  //   existieren nie; ein BRIEF fällt NIE deswegen raus (der Brieftext selbst ist der Inhalt,
  //   unabhängig vom Geschenk — z. B. der geschenklose Wächter-Brief). Nicht-Array → []. —
  const stackMailItems = (raw: unknown): MailAttachment[] => {
    const stacked = new Map<ItemId, number>();
    const arr = Array.isArray(raw) ? raw : [];
    for (const a of arr.slice(0, ARRAY_HARD_CAP)) {
      if (!a || typeof a !== "object") continue;
      const itemId = (a as { itemId?: unknown }).itemId;
      const qty = (a as { qty?: unknown }).qty;
      if (typeof itemId !== "string" || !content.items[itemId]) continue;
      if (typeof qty !== "number" || !Number.isFinite(qty) || qty <= 0) continue;
      const add = Math.floor(Math.min(qty, QTY_HARD_CAP));
      if (add <= 0) continue;
      stacked.set(itemId, Math.min((stacked.get(itemId) ?? 0) + add, QTY_HARD_CAP));
    }
    return [...stacked.entries()].map(([itemId, qty]) => ({ itemId, qty }));
  };
  const sanitizeMailInstances = (raw: unknown): ItemInstance[] => {
    const out: ItemInstance[] = [];
    const arr = Array.isArray(raw) ? raw : [];
    for (const raw2 of arr.slice(0, ARRAY_HARD_CAP)) {
      const inst = sanitizeInstance(raw2, content);
      if (inst) out.push(inst);
    }
    return out;
  };
  if (Array.isArray(state.mailbox)) {
    const cleanMail: MailMessage[] = [];
    for (const raw of state.mailbox.slice(0, ARRAY_HARD_CAP)) {
      if (!raw || typeof raw !== "object") continue;
      const m = raw as Partial<MailMessage>;
      if (typeof m.id !== "string" || m.id.length === 0) continue;
      const createdSeq = Math.floor(finiteNonNeg(m.createdSeq, 0));
      const items = stackMailItems(m.items);
      const instances = sanitizeMailInstances(m.instances);

      // claude:2026-10-18T12:00:00+02:00 — Post-Sperre (SAVE 88 Nachtrag B2): nur exakt `true` überlebt, und nur an
      // einer Mail mit Inhalt (eine leere Mail ist nichts, was gesperrt sein könnte). Anhängen als LETZTES Feld,
      // damit Mails ohne Flag byte-gleich bleiben.
      const held = m.prestigeHeld === true && (items.length > 0 || instances.length > 0);

      if (m.kind === "overflow") {
        if (items.length === 0 && instances.length === 0) continue;
        cleanMail.push({ id: m.id, kind: "overflow", createdSeq, items, instances, ...(held ? { prestigeHeld: true as const } : {}) });
        continue;
      }

      if (m.kind === "letter") {
        const from = m.from;
        const textKey = m.textKey;
        if ((from !== "brenna" && from !== "warden") || typeof textKey !== "string" || textKey.length === 0) {
          continue;
        }
        cleanMail.push({ id: m.id, kind: "letter", createdSeq, items, instances, from, textKey, ...(held ? { prestigeHeld: true as const } : {}) });
        continue;
      }

      // codex:2026-08-31T22:04:00+02:00 — SAVE 87 (ehem. 88): reine Cross-Save-Fracht ohne Freitext/Gold.
      if (m.kind === "transfer") {
        const fromSaveName = m.fromSaveName;
        if (typeof fromSaveName !== "string" || fromSaveName.trim().length === 0) continue;
        // Eine leere Transfer-Mail ist kein Brief und trägt keinerlei Inhalt → verwerfen wie Overflow.
        if (items.length === 0 && instances.length === 0) continue;
        cleanMail.push({
          id: m.id,
          kind: "transfer",
          createdSeq,
          items,
          instances,
          fromSaveName: fromSaveName.trim().slice(0, 64),
          ...(held ? { prestigeHeld: true as const } : {}),
        });
      }
      // unbekannte Mail-Sorte → raus (Muster actionQueue)
    }
    state.mailbox = cleanMail;
  } else {
    state.mailbox = [];
  }
  // — Mail-ID-Zähler: endlich & ≥ 0 UND streng größer als jede vorhandene createdSeq, damit neue
  //   Mails nie eine ID/Sequenz doppeln (Muster nextInstanceSeq + Breadcrumb-seq-Monotonie). —
  {
    let minNext = 0;
    for (const m of state.mailbox) minNext = Math.max(minNext, m.createdSeq + 1);
    state.mailSeq = Math.max(Math.floor(finiteNonNeg(state.mailSeq, 0)), minNext);
  }

  // — Buy-Back-Liste (Task #245): jeden Eintrag validieren; unbekannte Item-IDs raus, qty/price auf
  //   endliche, sinnvolle Bereiche klemmen, Instanzen (falls vorhanden) über sanitizeInstance härten.
  //   Länge auf BUYBACK_MAX_ENTRIES kappen (jüngste zuerst). Ein Eintrag ohne gültige baseItemId/
  //   Instanz fällt raus (kein Rückkauf-Geist). Rein defensiv — legitime Puffer bleiben unverändert. —
  //   PLUS (Härtung 2026-07-11, Dungeon-Einmal-Unlock SAVE 60; beibehalten unter dem
  //   quest-based unlock, Welle J/SAVE 64): Dungeon-SCHLÜSSEL-Einträge fliegen raus. Für den
  //   paragon_key ist das die harte „nie im Besitz"-Invariante (Rückkauf per rohem addItem hätte
  //   ihn wieder in die Welt gebracht); für die deprecated Story-Schlüssel schlichte
  //   Tote-Items-Hygiene (kein Verlust — der Spieler hat beim Verkauf bereits Gold erhalten).
  //   Die Sperr-Menge (paragon_key + eingefrorene Story-Schlüssel) lebt seit Tester-Sweep 2 T6
  //   als GETEILTE Konstante BUYBACK_BANNED_ITEM_IDS in shared — engine/shop.ts `pushBuyBack`
  //   (Live-Pfad, Defense-in-depth gegen Live-Injection) und dieser Load-Strip nutzen EINE Quelle.
  const dungeonKeyIds = new Set<string>(BUYBACK_BANNED_ITEM_IDS);
  // Defense-in-depth-Rest: trägt Content (wieder) keyItem-Felder (heute nur der Paragonturm,
  // dessen paragon_key ohnehin in der Sperr-Menge steckt), fliegen auch diese raus.
  for (const d of content.dungeons) if (d.keyItem) dungeonKeyIds.add(d.keyItem);
  if (Array.isArray(state.buyBack)) {
    const cleanBuyBack: BuyBackEntry[] = [];
    for (const raw of state.buyBack.slice(0, ARRAY_HARD_CAP)) {
      if (cleanBuyBack.length >= BUYBACK_MAX_ENTRIES) break;
      if (!raw || typeof raw !== "object") continue;
      const e = raw as Partial<BuyBackEntry>;
      const price = clampFinite(e.price, 0, GOLD_HARD_CAP, 0);
      if (e.instance !== undefined) {
        const inst = sanitizeInstance(e.instance, content);
        if (!inst) continue; // Instanz-Eintrag ohne gültige Instanz → verwerfen (kein Geist-Rückkauf).
        cleanBuyBack.push({ itemId: inst.baseItemId, qty: 1, price, instance: inst });
        continue;
      }
      if (typeof e.itemId !== "string" || !known(e.itemId)) continue;
      if (dungeonKeyIds.has(e.itemId)) continue; // Schlüssel: s. Kommentar oben
      const qty = Math.floor(clampFinite(e.qty, 1, QTY_HARD_CAP, 1));
      if (qty <= 0) continue;
      cleanBuyBack.push({ itemId: e.itemId, qty, price });
    }
    state.buyBack = cleanBuyBack;
  } else {
    state.buyBack = [];
  }

  // — Dungeon-Unlocks (Einmal-Unlock SAVE 60; quest-based unlock SAVE 64/Welle J): DREI
  //   Load-Invarianten, bewusst versions-UNGEGATED bei jedem Load (idempotent, monoton, RNG-frei
  //   → Round-Trip-stabil):
  //   (1) `dungeonsUnlocked` härten: unbekannte Dungeon-IDs strippen (gegen content.dungeons),
  //       nur truthy Werte überleben als strikt `true` (Set-Semantik, Muster discoveredItems).
  //   (2) Geclearte Dungeons sind entsperrt (`dungeonsCleared[id] > 0` ⇒ unlocked) — wer je drin
  //       war, hatte sich den Zutritt erspielt; der Bestandsschutz überstimmt die neuen
  //       Quest-Gates (`DungeonDef.requiresQuest`, engine/dungeon.ts isDungeonUnlocked).
  //   (3) Paragon-Schlüssel-Sweep: NUR noch der paragon_key (der Turm bleibt eigenes
  //       Einmal-Unlock-System) existiert nach dem Load NIE im Besitz — Selbstheilung für
  //       Direktpfade vorbei am addItemOrBank-Intercept (Alt-UI/Save-Edit). 1 Stück geht im
  //       Unlock auf (nur wenn der Sweep wirklich NEU entsperrt); Überschuss wird zum
  //       Verkaufswert erstattet (floor(value × SELL_FRACTION), Köcher-Präzedenz #286).
  //       Die STORY-Dungeon-Schlüssel sind seit SAVE 64 deprecated (quest-based unlock, Welle J):
  //       ihre Alt-Bestände räumt EINMALIG die v64-Migration (migrateState: Bestandsschutz-Grant
  //       + Voll-Erstattung); danach sind sie gewöhnliche (tote, aber verkaufbare) Items —
  //       bewusst KEIN Load-Sweep mehr, ein Übergangsphasen-Drop bleibt schlicht Vendor-Ware.
  //   Dazu den UI-Breadcrumb `lastDungeonUnlock` härten (bekannte IDs, endliche seq, sonst null).
  {
    const knownDungeon = (id: string): boolean => content.dungeons.some((d) => d.id === id);
    // (1) Härtung des Unlock-Sets.
    const cleanUnlocked: Record<string, true> = {};
    if (state.dungeonsUnlocked && typeof state.dungeonsUnlocked === "object" && !Array.isArray(state.dungeonsUnlocked)) {
      for (const [id, v] of Object.entries(state.dungeonsUnlocked)) {
        if (v && knownDungeon(id)) cleanUnlocked[id] = true;
      }
    }
    state.dungeonsUnlocked = cleanUnlocked;
    // (2) Cleared ⇒ Unlocked (Migrationspfad a; heilt auch Save-Edits, die den Unlock entfernen).
    // claude:2026-10-18T20:30:00+02:00 — NUR ohne Aufstieg: `dungeonsCleared` ist ein Lebenszeit-Zähler und überlebt den
    // Aschesturz; sonst öffnete jeder Load nach einem Aufstieg alle früher geräumten Dungeons wieder (Quest-Gates und
    // Reset ausgehebelt, Knoten „Alte Pfade“ wirkungslos). Befund Welle E1, 6/6 Dungeons. Ohne Aufstieg bit-identisch.
    const ascended = typeof state.prestige?.count === "number" && state.prestige.count > 0;
    for (const [id, n] of ascended ? [] : Object.entries(state.dungeonsCleared ?? {})) {
      if (typeof n === "number" && Number.isFinite(n) && n > 0 && knownDungeon(id)) {
        cleanUnlocked[id] = true;
      }
    }
    // (2b) Aktiver Run ⇒ Unlocked: ein v59-Save MITTEN in einem laufenden Dungeon-Run hat seinen
    //      Schlüssel beim Start bereits verbraucht (alte Verbrauchs-Logik) — der aktive Run IST
    //      der Schlüssel-Beweis. Ohne dies verlöre ein Offline-Tod des Alt-Runs den Unlock unfair
    //      (der Offline-Catch-up läuft NACH sanitize). Idempotent/monoton; kein Anti-Cheat-Thema
    //      (ein Save-Edit könnte dungeonsUnlocked ohnehin direkt setzen).
    {
      const active = state.combat?.dungeonId;
      // claude:2026-10-26T02:10:00+02:00 — Raid-Räume sind keine freischaltbaren Dungeons (eigenes Stufen-Gate), QA-Saves #4.
      const raidOnly = typeof active === "string" && content.dungeons.find((d) => d.id === active)?.raidOnly === true;
      if (typeof active === "string" && knownDungeon(active) && !raidOnly) cleanUnlocked[active] = true;
    }
    // (3) Paragon-Schlüssel-Sweep (Selbstheilung; Story-Schlüssel s. Kopf-Kommentar → v64-Migration).
    {
      const keyId: ItemId = PARAGON_KEY_ITEM_ID;
      let count = 0;
      for (let i = 0; i < state.inventory.slots.length; i++) {
        const slot = state.inventory.slots[i];
        if (slot && slot.itemId === keyId && !slot.instance) {
          count += Math.max(0, Math.floor(finiteNonNeg(slot.qty, 0)));
          state.inventory.slots[i] = null;
        }
      }
      if (keyId in state.bank) {
        count += Math.max(0, Math.floor(finiteNonNeg(state.bank[keyId], 0)));
        delete state.bank[keyId];
      }
      if (count > 0) {
        (state.discoveredItems ??= {})[keyId] = true; // Besitz war echt — Entdeckung bleibt
        const surplus = count - (unlockParagonTower(state) ? 1 : 0);
        if (surplus > 0) {
          const unitRefund = Math.floor((content.items[keyId]?.value ?? 0) * SELL_FRACTION);
          if (unitRefund > 0) state.character.gold += unitRefund * surplus;
        }
      }
    }
    // Breadcrumb härten (Muster onboarding: Struktur erzwingen oder null).
    const raw = state.lastDungeonUnlock as Partial<NonNullable<GameState["lastDungeonUnlock"]>> | null | undefined;
    let cleanCrumb: GameState["lastDungeonUnlock"] = null;
    if (raw && typeof raw === "object" && typeof raw.itemId === "string" && Array.isArray(raw.dungeonIds)) {
      const ids = raw.dungeonIds.filter((id): id is string => typeof id === "string" && knownDungeon(id));
      if (ids.length > 0 && content.items[raw.itemId]) {
        cleanCrumb = { dungeonIds: ids, itemId: raw.itemId, seq: Math.floor(finiteNonNeg(raw.seq, 0)) };
      }
    }
    state.lastDungeonUnlock = cleanCrumb;
  }

  // — Story-Zonen-Bestandsschutz (SAVE_VERSION 63): `legacyZoneGrants` härten — strikte true-Map
  //   (Muster onboarding.toursSeen): nur nicht-leere String-Keys ≤ 64 Zeichen, truthy Fremdwerte
  //   werden auf strikt `true` normalisiert, falsy fliegen raus. BEWUSST KEIN Abgleich gegen
  //   content.zones: ein Grant muss eine (temporär) entfernte/umbenannte Zone überleben
  //   (Leitplanke „NIE Zugriff verlieren"); überzählige Keys sind inert (isZoneUnlocked liest
  //   nur exakte Zonen-IDs). Idempotent. —
  {
    const cleanGrants: Record<string, true> = {};
    const rawGrants = state.legacyZoneGrants;
    if (rawGrants && typeof rawGrants === "object" && !Array.isArray(rawGrants)) {
      for (const [k, v] of Object.entries(rawGrants)) {
        if (v && typeof k === "string" && k.length > 0 && k.length <= 64) cleanGrants[k] = true;
      }
    }
    state.legacyZoneGrants = cleanGrants;
  }

  // — Kampf-Gate-Load-Invariante (Tester-Sweep 2 T10, 2026-07-13): das Zonen-/Dungeon-Gate beim
  //   LOAD erneut prüfen — combatStep prüft es nie wieder; ein Save-Edit (combat.monsterId auf ein
  //   Monster einer GESPERRTEN Zone) würde sonst den Offline-Catch-up (deserialize → advance, läuft
  //   NACH sanitize) stundenlang durchfarmen. startCombat blockt korrekt (canFightMonster) — die
  //   Lücke ist NUR der geladene Zustand. Gesperrt ⇒ Kampf STILL beenden (stopCombat, engine:
  //   dieselben Felder wie beim regulären Kampf-Ende; KEIN Loot, kein Fehler, Kill-Cooldown bleibt).
  //   Für legitime Saves garantiert No-op: die Bestandsschutz-Pässe OBEN (legacyZoneGrants v63 bzw.
  //   dungeonsUnlocked inkl. „aktiver Run ⇒ unlocked") halten jeden rechtmäßig begonnenen Kampf
  //   offen — deshalb läuft dieser Block bewusst NACH beiden Härtungen; nur getamperte Saves
  //   verlieren den unrechtmäßigen Kampf. Paragon-Etagen sind AUSGENOMMEN (eigenes System ohne
  //   Zonen-Gate — Basis-Monster stammen designgemäß aus späten Zonen; die strikte
  //   Konsistenz-Härtung macht der Paragon-Block oben). Idempotent, RNG-frei → Round-Trip-stabil. —
  if (cb.monsterId !== null && cb.paragonFloor === undefined) {
    let gateOpen: boolean;
    const raidRoom = typeof cb.dungeonId === "string" && content.dungeons.find((d) => d.id === cb.dungeonId)?.raidOnly === true;
    if (raidRoom) {
      // claude:2026-10-25T04:40:00+02:00 — Raid-Raum (SAVE 93): offen genau dann, wenn der laufende Raid-Lauf in diesem Raum kämpft.
      const run = state.raid?.run;
      const room = run ? (content.raids ?? []).find((r) => r.id === run.raidId)?.rooms[run.room] : undefined;
      gateOpen = !!run && run.phase === "fight" && room?.dungeonId === cb.dungeonId;
    } else if (typeof cb.dungeonId === "string") {
      // Dungeon-Kontext: das Dungeon-Gate zählt (inkl. Trägerzonen-Kohärenz). Für jeden BEKANNTEN
      // aktiven Run ist das per „(2b) aktiver Run ⇒ unlocked" oben immer offen — real beendet
      // dieser Zweig nur Kämpfe mit unauflösbarer (unbekannter/getamperter) dungeonId.
      gateOpen = isDungeonUnlocked(state, content, cb.dungeonId);
    } else {
      // Normalkampf: Zone des Monsters muss offen sein (isZoneUnlocked — Quest ODER Grant).
      // Unbekannte monsterId/Monster ohne Zone bleiben Sache des combatStep (heutiges Verhalten).
      const zone = content.monsters[cb.monsterId]?.zone;
      gateOpen = !zone || isZoneUnlocked(state, content, zone);
    }
    if (!gateOpen) stopCombat(state);
  }
  // claude:2026-10-25T04:40:00+02:00 — Raid-Lauf im Kampf ohne passenden Kampf (kaputter/getamperter Save).
  // claude:2026-10-26T00:55:00+02:00 — Nur ein unbekannter Raid/Raum wird verworfen (samt Warteschlange). Passt nur der Kampf nicht, gilt die
  // Engine-Regel „Kampf verlassen = Tod“ schon beim Laden (Mythisch mit 25 % Rückgabe, Warteschlange endet), QA-Raid #9 / QA-Saves.
  {
    const run = state.raid?.run;
    if (run && run.phase === "fight") {
      const room = (content.raids ?? []).find((r) => r.id === run.raidId)?.rooms[run.room];
      if (!room) {
        state.raid!.run = null;
        state.raid!.queue = null;
      } else if (state.combat.monsterId === null || state.combat.dungeonId !== room.dungeonId) {
        stopCombat(state);
        resolveLeftRaidFight(state, content); // claude:2026-10-26T04:00:00+02:00
      }
    }
  }

  // — Elite-Zugangs-Load-Invariante (Spieler-Report 1.0.0: „The Ninth Warden … located in The Idol
  //   Hall — i do not see how to gain access", Fix 1.0.1). BEWUSST OHNE SAVE_VERSION-Bump: eine
  //   versions-ungegatete, idempotente, RNG-FREIE Load-Regel im Muster der Kampf-Gate-Load-
  //   Invariante direkt darüber — kein neues Feld, keine neue Semantik, nur eine Invariante auf
  //   bestehenden Daten.
  //   INVARIANTE: ein AKTIVER `eliteZones`-Eintrag darf nur in einer Zone stehen, die der Spieler
  //   betreten UND deren Champion er bekämpfen kann (`isEliteZoneHuntable`, engine/elites.ts =
  //   Zone freigeschaltet + Variante auf einer nicht-`dungeonOnly`-Basis). Alt-Spielstände tragen
  //   genau das im Save: der Zyklus vor 1.0.1 durfte in `idolhall` spawnen, sobald Kapitel 18
  //   erfüllt war — die Zone hat aber ausschließlich dungeonOnly-Monster, also gar keine
  //   Zonen-Karte; der Champion war unerreichbar und seine Ankündigung eine Falschmeldung.
  //   AUFRÄUMEN wie beim Content-Drift-Fall oben: Aktiv → Ruhe mit `cooldownMs: 0` (sofort wieder
  //   fällig; `tickEliteSpawns` entscheidet danach ganz normal neu und würfelt für eine
  //   nicht-jagdbare Zone weiterhin KEINEN eliteRng-Zug). Zusätzlich fällt der Toast-Breadcrumb
  //   `lastEliteSpawn`, wenn er auf so eine Zone zeigt — sonst feuert beim Laden noch einmal exakt
  //   die Meldung, die den Spieler in die Irre geführt hat. `eliteSpawnSeq` bleibt UNANGETASTET
  //   (Monotonie-Gesetz, Muster petDropSeq). Ruhe-Cooldowns nicht-jagdbarer Zonen bleiben stehen
  //   (inert, s. tickEliteSpawns). Läuft NACH der legacyZoneGrants-Härtung oben (isZoneUnlocked
  //   liest sie). Idempotent → Round-Trip-stabil. —
  {
    for (const [zoneId, entry] of Object.entries(state.eliteZones)) {
      if (!("variantId" in entry)) continue;
      if (isEliteZoneHuntable(state, content, zoneId)) continue;
      state.eliteZones[zoneId] = { cooldownMs: 0 };
    }
    const crumb = state.lastEliteSpawn;
    if (crumb && !isEliteZoneHuntable(state, content, crumb.zoneId)) state.lastEliteSpawn = null;
  }

  // — Kampf-Queue-Laufzeit + Pause + Skip-Breadcrumb (SAVE_VERSION 73, Task #312) — bewusst NACH
  //   der Kampf-Gate-Load-Invariante (s. Verweis beim Action-Queue-Block oben): erst wenn der
  //   Kampf-Zustand FINAL ist, lässt sich die queueFight⇔combat-Konsistenz korrekt prüfen.
  //   queueFight strikt härten: bekanntes, nicht-dungeonOnly-Monster; `remaining` null (∞) oder
  //   endliche positive Ganzzahl (Cap QTY_HARD_CAP) — alles andere (inkl. remaining ≤ 0 = Ziel
  //   bereits erfüllt) → Laufzeit verwerfen. INVARIANTE danach: queueFight existiert nur zusammen
  //   mit GENAU diesem laufenden Kampf (`combat.monsterId === queueFight.monsterId`) — passt der
  //   Kampf nicht (Save-Edit/gate-gestoppter Kampf/inkonsistenter Zwischenstand), wandert das
  //   Rest-Ziel als regulärer "fight"-Eintrag an die QUEUE-FRONT (nichts geht still verloren; der
  //   Gate-Fall bekommt so beim nächsten Queue-Start seinen sauberen `lastQueueSkip`-Grund). Der
  //   Front-Eintrag ist konstruktionsgemäß sanitize-stabil → idempotent (beim Re-Load ist
  //   queueFight null und der Eintrag bleibt einfach stehen). —
  {
    const rawFight = state.queueFight as unknown;
    let cleanFight: GameState["queueFight"] = null;
    if (rawFight && typeof rawFight === "object") {
      const monsterId = (rawFight as { monsterId?: unknown }).monsterId;
      const rem = (rawFight as { remaining?: unknown }).remaining;
      const remaining =
        rem === null
          ? null
          : typeof rem === "number" && Number.isFinite(rem) && rem > 0
            ? Math.floor(Math.min(rem, QTY_HARD_CAP))
            : undefined;
      if (
        typeof monsterId === "string" &&
        content.monsters[monsterId] &&
        !content.monsters[monsterId]!.dungeonOnly &&
        remaining !== undefined
      ) {
        cleanFight = { monsterId, remaining };
      }
    }
    if (cleanFight !== null && state.combat.monsterId !== cleanFight.monsterId) {
      state.actionQueue.unshift(makeFightQueueEntry(cleanFight.monsterId, cleanFight.remaining));
      cleanFight = null;
    }
    state.queueFight = cleanFight;

    // — Dungeon-Queue-Laufzeit (SAVE_VERSION 83, Chef-Auftrag 26.08.2026 „Dungeons queuebar"),
    //   Spiegel der queueFight-Härtung: bekannter Dungeon MIT Wellen; `remaining` null (∞) oder
    //   endliche positive Ganzzahl (Cap QTY_HARD_CAP); `completed` endlich ≥ 0 ganzzahlig (sonst 0).
    //   INVARIANTE danach: queueDungeon existiert nur zusammen mit GENAU diesem laufenden Dungeon
    //   (`combat.dungeonId === dungeonId` UND ein Gegner steht, `combat.monsterId !== null`, UND
    //   keine Turm-Etage) — passt der Kampf nicht (Save-Edit/gate-gestoppter Kampf/Geister-Run),
    //   wandert der Rest als "dungeon"-Eintrag an die QUEUE-FRONT (nichts geht still verloren; die
    //   `completed`-Zählung des Eintrags beginnt dann bei 0 — der Lauf selbst zählt ohnehin nicht).
    //   Front-Eintrag ist sanitize-stabil → idempotent. —
    {
      const rawRun = state.queueDungeon as unknown;
      let cleanRun: GameState["queueDungeon"] = null;
      if (rawRun && typeof rawRun === "object") {
        const dungeonId = (rawRun as { dungeonId?: unknown }).dungeonId;
        const rem = (rawRun as { remaining?: unknown }).remaining;
        const done = (rawRun as { completed?: unknown }).completed;
        const remaining =
          rem === null
            ? null
            : typeof rem === "number" && Number.isFinite(rem) && rem > 0
              ? Math.floor(Math.min(rem, QTY_HARD_CAP))
              : undefined;
        const completed =
          typeof done === "number" && Number.isFinite(done) && done > 0
            ? Math.floor(Math.min(done, QTY_HARD_CAP))
            : 0;
        const dungeon = typeof dungeonId === "string" ? content.dungeons.find((d) => d.id === dungeonId) : undefined;
        if (typeof dungeonId === "string" && dungeon && dungeon.encounters.length > 0 && remaining !== undefined) {
          cleanRun = { dungeonId, remaining, completed };
        }
      }
      if (
        cleanRun !== null &&
        (state.combat.dungeonId !== cleanRun.dungeonId ||
          state.combat.monsterId === null ||
          state.combat.paragonFloor !== undefined)
      ) {
        state.actionQueue.unshift(makeDungeonQueueEntry(cleanRun.dungeonId, cleanRun.remaining));
        cleanRun = null;
      }
      state.queueDungeon = cleanRun;
    }
    // Pause strikt boolesch (alles andere = false). Hygiene: ohne Queue UND ohne Laufzeit gibt es
    // nichts zu pausieren → Flag löschen (eine hängengebliebene Pause würde sonst künftige
    // Einreihungen still blockieren, ohne dass die UI je einen Grund anzeigen könnte). Idempotent.
    state.queuePaused =
      state.queuePaused === true &&
      (state.actionQueue.length > 0 || state.queueFight !== null || state.queueDungeon !== null);
    // Skip-Breadcrumb: Shape + Grund-Whitelist härten. Das Monster darf UNBEKANNT sein —
    // "unknown_monster" ist gerade der Grund für entfernte Monster (Content-Drift).
    // Spieler-Report 1.0.2 („each time you load your game it repeats that error message even
    // though you are strong enough to fight them now"): der Grund wird beim Laden NEU geprüft.
    // Ein Breadcrumb überlebt nur, wenn sein Grund HEUTE noch zutrifft (Monster weiterhin
    // unbekannt / weiterhin dungeonOnly / Gate weiterhin gesperrt, canFightMonster). Hat der
    // Spieler die Voraussetzung inzwischen erfüllt, wäre „Voraussetzung nicht erfüllt" beim Start
    // eine veraltete Fehlermeldung, die er nicht mehr wegbekommt. Bewusst NACH der Kampf-Gate-
    // Load-Invariante (gleiche Gate-Quelle, endgültiger Zustand); zieht kein RNG, idempotent.
    // Die Quittung im laufenden Spiel (×-Klick nullt das Feld) übernimmt der Melder selbst,
    // das Queue-Panel (client ActionQueuePanel.tsx, Regel „wer meldet, quittiert").
    const rawSkip = state.lastQueueSkip as unknown;
    state.lastQueueSkip = null;
    if (rawSkip && typeof rawSkip === "object") {
      const monsterId = (rawSkip as { monsterId?: unknown }).monsterId;
      const reason = (rawSkip as { reason?: unknown }).reason;
      const skipDungeonId = (rawSkip as { dungeonId?: unknown }).dungeonId;
      const skipActionId = (rawSkip as { actionId?: unknown }).actionId;
      const skipRaidId = (rawSkip as { raidId?: unknown }).raidId;
      if (typeof skipRaidId === "string" && skipRaidId.length > 0) {
        // claude:2026-10-25T04:40:00+02:00 — Raid-Skip (SAVE 93): vergangenes Ereignis, bleibt bis zur Quittung, solange der Raid bekannt ist.
        const known = (content.raids ?? []).some((r) => r.id === skipRaidId);
        const okReason = reason === "raid_gold" || reason === "raid_locked" || reason === "defeated" || reason === "dungeon_defeated" || (reason === "unknown_raid" && !known);
        if (okReason && (known || reason === "unknown_raid")) state.lastQueueSkip = { monsterId: "", raidId: skipRaidId, reason: reason as QueueSkipReason };
      } else if (typeof skipActionId === "string" && skipActionId.length > 0) {
        // Aktions-Skip (27.08.2026, Warteschlangen-Projektion): `no_materials` nur, solange das
        // Material HEUTE noch fehlt (Inventar + Lager) — hat der Spieler inzwischen Nachschub,
        // wäre „keine Materialien" beim Start eine veraltete Meldung. Unbekannte Aktion → weg.
        const action = content.actions[skipActionId];
        if (reason === "no_materials" && action && !actionInputsOnHand(state, action)) {
          state.lastQueueSkip = { monsterId: "", actionId: skipActionId, reason };
        } else if (reason === "level_too_low" && action && !actionLevelMet(state, content, skipActionId)) {
          // claude:2026-10-24T15:21:04+02:00 — Level-Skip (QA-Runde 2 Spielstände B3): bleibt, solange das Level HEUTE noch fehlt.
          state.lastQueueSkip = { monsterId: "", actionId: skipActionId, reason };
        }
      } else if (typeof skipDungeonId === "string" && skipDungeonId.length > 0) {
        // Dungeon-Skip (SAVE 83): dieselbe „gilt der Grund HEUTE noch?"-Regel wie beim Monster —
        // unknown_dungeon nur, solange der Dungeon fehlt/keine Wellen hat; dungeon_locked nur,
        // solange das Gate (canEnterDungeon) weiterhin zu ist. `monsterId` = Platzhalter "".
        const dungeon = content.dungeons.find((d) => d.id === skipDungeonId);
        const known = !!dungeon && dungeon.encounters.length > 0;
        if (reason === "unknown_dungeon" && !known) {
          state.lastQueueSkip = { monsterId: "", dungeonId: skipDungeonId, reason };
        } else if (reason === "dungeon_locked" && known && !canEnterDungeon(state, content, skipDungeonId)) {
          state.lastQueueSkip = { monsterId: "", dungeonId: skipDungeonId, reason };
        } else if ((reason === "dungeon_defeated" || reason === "dungeon_stalemate") && known) {
          // Tod/Patt im Lauf (Chef 29.08.2026): vergangenes Ereignis, bleibt bis zur Quittung stehen.
          state.lastQueueSkip = { monsterId: "", dungeonId: skipDungeonId, reason };
        }
      } else if (typeof monsterId === "string" && monsterId.length > 0) {
        const monster = content.monsters[monsterId];
        if (reason === "unknown_monster" && !monster) {
          state.lastQueueSkip = { monsterId, reason };
        } else if (reason === "not_queueable" && monster && monster.dungeonOnly) {
          state.lastQueueSkip = { monsterId, reason };
        } else if (
          reason === "gate_locked" &&
          monster &&
          !monster.dungeonOnly &&
          !canFightMonster(state, content, monsterId)
        ) {
          state.lastQueueSkip = { monsterId, reason };
        } else if ((reason === "defeated" || reason === "stalemate") && monster) {
          // Tod/Patt im Kampf-Eintrag (Chef 29.08.2026): vergangenes Ereignis, bleibt bis zur Quittung.
          state.lastQueueSkip = { monsterId, reason };
        }
      }
    }
  }

  // — Bestiarium (SAVE_VERSION 58): `monsterKills` härten — unbekannte Monster-IDs strippen
  //   (Präzedenz small_pouch/Unknown-Id-Strip), Werte endlich/≥ 0/ganzzahlig klemmen; 0-Einträge
  //   fallen weg (ein nie getötetes Monster hat schlicht keinen Key). Idempotent. —
  {
    const cleanKills: Record<string, number> = {};
    if (state.monsterKills && typeof state.monsterKills === "object" && !Array.isArray(state.monsterKills)) {
      for (const [id, n] of Object.entries(state.monsterKills)) {
        if (!content.monsters[id]) continue;
        const v = Math.floor(clampFinite(n, 0, QTY_HARD_CAP, 0));
        if (v > 0) cleanKills[id] = v;
      }
    }
    state.monsterKills = cleanKills;
  }

  // — Meisterweihe (SAVE_VERSION 59): `masteryCapes`/`capeGranted`/`capeCeremonySeen` härten —
  //   Robustness-Muster von discoveredItems kopiert: unbekannte Skill-IDs strippen (gegen
  //   content.skills), truthy Fremdwerte auf strikt `true` normalisieren, falsy raus. Zusätzlich
  //   die Teilmengen-Invarianten erzwingen: capeGranted ⊆ masteryCapes und capeCeremonySeen ⊆
  //   masteryCapes (ein granted/seen ohne vermerkte Weihe ist nur per Save-Edit/Korruption
  //   möglich). DANACH die Cape-NACHREICHUNG (grantPendingCapes, engine/capes.ts): „Weihe
  //   vermerkt && Cape-Item existiert im Content && nie verliehen" → jetzt verleihen. Das ist der
  //   Pfad, über den rückwirkend geweihte Alt-99er (v59-Migration) ihr Cape bekommen, sobald
  //   content-dev die `cape_master_<skillId>`-Items liefert. Läuft bewusst NACH den Inventar-/
  //   Bank-/Equipment-Pässen (addItemOrBank braucht einen sauberen Zustand) und VOR dem
  //   discoveredItems-Union (das frisch verliehene Cape wird dort mit erfasst). Idempotent
  //   (capeGranted-Marker) und RNG-frei → Round-Trip-stabil. —
  {
    const cleanSkillSet = (raw: unknown): Record<string, true> => {
      const out: Record<string, true> = {};
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [id, v] of Object.entries(raw)) {
          // COMPLETION_CAPE_KEY ("completion") ist der einzige Nicht-Skill-Key der Cape-Sets
          // (Vollendungs-Weihe, capes.ts) — er darf den Load überleben, sonst würde die
          // Verleihung bei jedem Load wiederholt (Cape-Duplikate).
          if (v && (content.skills[id] || id === COMPLETION_CAPE_KEY)) out[id] = true;
        }
      }
      return out;
    };
    state.masteryCapes = cleanSkillSet(state.masteryCapes);
    const capes = state.masteryCapes;
    const subsetOfCapes = (raw: unknown): Record<string, true> => {
      const out: Record<string, true> = {};
      for (const id of Object.keys(cleanSkillSet(raw))) {
        if (capes[id] === true) out[id] = true;
      }
      return out;
    };
    state.capeGranted = subsetOfCapes(state.capeGranted);
    state.capeCeremonySeen = subsetOfCapes(state.capeCeremonySeen);
    grantPendingCapes(state, content);
  }

  // — Erst-Besitz-Marker (SAVE_VERSION 58): `discoveredItems` härten — unbekannte Item-IDs raus,
  //   nur truthy Werte überleben und werden auf strikt `true` normalisiert (Set-Semantik). DANACH
  //   den IST-Bestand ein-unionieren (discoverPossessedItems, engine): das ist der Alt-Save-
  //   Backfill (< 58) UND die Selbstheilung für Zugangs-Pfade am zentralen Marker vorbei. Läuft
  //   bewusst NACH allen Inventar-/Bank-/Vault-/Equipment-Pässen (nur bereinigte, bekannte IDs
  //   fließen ein) und ist idempotent/monoton → Round-Trip-stabil. —
  {
    const cleanDiscovered: Record<ItemId, true> = {};
    if (state.discoveredItems && typeof state.discoveredItems === "object" && !Array.isArray(state.discoveredItems)) {
      for (const [id, v] of Object.entries(state.discoveredItems)) {
        if (v && known(id as ItemId)) cleanDiscovered[id as ItemId] = true;
      }
    }
    state.discoveredItems = cleanDiscovered;
    discoverPossessedItems(state);
  }

  // — Onboarding-Guide: booleans strikt normalisieren, `step` auf eine ganze Zahl ≥ 0 klemmen
  //   (NaN/Infinity/negativ/Float → 0 bzw. abgerundet). Die Obergrenze (Registry-Länge) kennt nur
  //   die UI und clampt dort; hier genügt der Untergrund-/Korruptionsschutz. Ein fehlendes/kaputtes
  //   Feld wurde in migrateState bereits mit `legacyOnboarding()` vorbelegt. —
  const ob = (state.onboarding ?? {}) as Partial<GameState["onboarding"]>;
  // toursSeen (SAVE_VERSION 62): strikte true-Map härten (Muster masteryCapes) — Keys sind
  // UI-definierte Bereichs-Namen (kein Content-Abgleich möglich), nur Format erzwingen.
  const tours: Record<string, true> = {};
  if (ob.toursSeen && typeof ob.toursSeen === "object" && !Array.isArray(ob.toursSeen)) {
    for (const [k, v] of Object.entries(ob.toursSeen)) {
      if (v && typeof k === "string" && k.length > 0 && k.length <= 64) tours[k] = true;
    }
  }
  state.onboarding = {
    active: ob.active === true,
    step: Math.floor(finiteNonNeg(ob.step, 0)),
    done: ob.done === true,
    toursSeen: tours,
  };

  // — Taverne (SAVE_VERSION 84): Plätze/Aufgaben/Zähler/Breadcrumb gegen den Content härten
  //   (Gäste + Vorlagen + Ziele + Items); ohne Tavernen-Content bleiben nur die Zähler. —
  sanitizeTavern(state, content);

  // — HP-Deckel gegen die abgeleiteten Stats: hp > maxHp (Alt-Save über eine Skalen-Migration wie
  //   den Stat-Squish ÷10 hinweg, entwertetes Gear, manipulierter Save) beim Laden direkt auf maxHp
  //   klemmen, statt auf den ersten Kampf-Tick zu warten. Läuft bewusst GANZ am Ende: Attribute,
  //   Skills, Equipment, Instanzen und Buffs sind oben bereits gehärtet, computeStats ist damit
  //   sicher aufrufbar. Defensiv nur bei endlichem maxHp anwenden (kein NaN-Durchschlag). —
  const derived = computeStats(state, content);
  const derivedMaxHp = derived.maxHp;
  if (Number.isFinite(derivedMaxHp) && state.character.hp > derivedMaxHp) {
    state.character.hp = derivedMaxHp;
  }
  // Ward analog zu hp (Rüstungs-Trinität, SAVE_VERSION 50): endlich, ≥ 0, ≤ maxWard. Ein Alt-Save
  // (ward = 0) oder ein entwertetes Stoff-Gear (maxWard gesunken) wird beim Laden auf den gültigen
  // Bereich geklemmt, statt auf den ersten Kampf-Tick zu warten. NaN/Infinity → 0 (kein Durchschlag).
  const derivedMaxWard = derived.maxWard;
  state.character.ward = finiteNonNeg(state.character.ward, 0);
  if (Number.isFinite(derivedMaxWard) && state.character.ward > derivedMaxWard) {
    state.character.ward = derivedMaxWard;
  }

  // — Ausrüstungs-Kits (SAVE_VERSION 85): Spiegel des AKTIVEN Kits = der fertig gehärtete Charakter.
  //   BEWUSST als allerletzter Schritt (nach Slot-/Instanz-/Zweihand-Härtung, Meisterring-Umzug,
  //   Cape-Nachreichung): nichts danach kann `character.equipment` noch ändern → Round-Trip-stabil. —
  // — Bank-Platzierung (SAVE 87): ALLERLETZTER Bank-Schritt. Muss nach jeder Stelle laufen, die
  //   `bank` noch anfasst (Story-Schluessel-Einzug, Instanz-Aufloesung, getragene Ausruestung) —
  //   ein frueherer Aufruf machte den Round-Trip nicht-idempotent: der erste Load schrieb noch
  //   `["paragon_key"]`, der zweite `[null]`, weil der Schluessel erst danach eingezogen wurde.
  //   Selbstheilend: leert Faecher verschwundener Items, entfernt Doppelte, haengt Fehlende an. —
  syncBankOrder(state, undefined, storagePredicate(content)); // claude:2026-10-23T22:00:00+02:00 — Lagerware hat kein Bankfach (1.4.0 ML)

  // — claude:2026-10-25T18:02:00+01:00 — Feste Fächer der Variantenzellen (SAVE 98): ALLERLETZTER Inventar-Schritt (nach Instanz-Säuberung, Paragon-
  //   Sweep, Ausrüstungs-Rückgaben). Stand < 98 (Feld fehlt): die Zellen genau dort vorbelegen, wo der alte Client sie zeichnete
  //   (`legacyVariantCellLayout`), damit beim ersten Laden nichts springt. Danach räumt `syncVariantCells` Ungültiges weg (keine
  //   reine Gruppe mehr, Fach belegt, doppelt) und vergibt fehlenden reinen Gruppen ein Fach. Idempotent. —
  if (variantCellsMissing) state.inventory.variantCells = legacyVariantCellLayout(state.inventory);
  syncVariantCells(state.inventory);

  syncActiveKit(state);

  return state;
}

/**
 * Bringt einen geladenen State auf das aktuelle Schema. Hier landen alle
 * Save-Migrationen, damit alte Spielstände nach Modelländerungen weiter laufen.
 */
/**
 * Skill-Split „Schneidern" (SAVE_VERSION 85 → 86, Chef-Entscheid 28.08.2026, design/handwerk-fasern-jagen/
 * spec-technik.md §6): XP-Anteil, der NACH TATSÄCHLICH HERGESTELLTEM aus dem Handwerk-Konto (`leatherworking`)
 * ins neue Konto `tailoring` wandert. Für jedes Rezept, das im AKTUELLEN Content `tailoring` ist (Weben,
 * Roben, Umhänge), zählt `stats.craftedById[ergebnisItem] × rezept.xp`. `craftedById` existiert seit SAVE 27
 * und zählt jedes aus einem Rezept mit Zutaten erzeugte Stück (tick.ts `isCraft`; Weben eingeschlossen);
 * `producedById`/`actionRunsById` gibt es erst seit v84 (unveröffentlicht) und tragen nichts bei, was
 * `craftedById` nicht schon hätte. Mastery-Doppel-Erträge zählen mit (der Zähler kann sie nicht
 * unterscheiden — die Klemme auf das Handwerk-Konto in der Migration fängt jede Überzählung). Ergebnis-
 * Items, die AUCH ein Rezept eines anderen Skills liefert, werden konservativ übersprungen. Reine Lese-
 * Funktion (kein RNG, kein State-Schreibzugriff); exportiert für die Persistenz-Tests.
 */
export function tailoringXpFromCraftLog(state: GameState, content: ContentDB): number {
  const crafted = state.stats?.craftedById;
  if (!crafted || typeof crafted !== "object") return 0;
  const xpByItem = new Map<ItemId, number>();
  const foreign = new Set<ItemId>();
  for (const action of Object.values(content.actions)) {
    if (!action.inputs || action.inputs.length === 0) continue; // nur Rezepte zählen in craftedById
    for (const l of action.loot) {
      if (action.skill === TAILORING_SKILL_ID) {
        xpByItem.set(l.itemId, Math.max(xpByItem.get(l.itemId) ?? 0, finiteNonNeg(action.xp, 0)));
      } else {
        foreign.add(l.itemId);
      }
    }
  }
  let moved = 0;
  for (const [itemId, xp] of xpByItem) {
    if (foreign.has(itemId)) continue;
    const n = (crafted as Record<string, unknown>)[itemId];
    if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) continue;
    moved += Math.floor(n) * xp;
  }
  return moved;
}

/**
 * Beste REINE Heilnahrung (heilt, kein Buff, kein Heiltrank) aus Inventar, sonst Bank — für die
 * v89-Migration des Essensplatzes. claude:2026-10-23T16:45:00+02:00
 */
function bestPlainHealFood(state: GameState, content: ContentDB): ItemId | null {
  const refMaxHp = Math.max(100, Number.isFinite(state.character.hp) ? state.character.hp : 0);
  const plain = (id: ItemId): number => {
    const it = content.items[id];
    if (!it || it.type !== "consumable" || it.buff) return -1;
    if ((it.healAmount ?? 0) <= 0 && (it.healPct ?? 0) <= 0) return -1;
    if (isHealPotion(content, id)) return -1; // claude:2026-10-26T02:10:00+02:00 — dieselbe Trank-Regel wie Auto-Essen (Kräuterkunde-Salben), QA-Saves #2
    return consumableHeal(it, refMaxHp);
  };
  const pick = (ids: Iterable<ItemId>): ItemId | null => {
    let best: ItemId | null = null;
    let bestHeal = -1;
    for (const id of ids) {
      const h = plain(id);
      if (h > bestHeal) {
        best = id;
        bestHeal = h;
      }
    }
    return bestHeal > 0 ? best : null;
  };
  const inv = (state.inventory?.slots ?? []).map((sl) => sl?.itemId).filter((x): x is ItemId => !!x);
  return pick(inv) ?? pick(Object.keys(state.bank ?? {}).filter((id) => (state.bank[id] ?? 0) > 0));
}

function migrateState(state: GameState, content: ContentDB): GameState {
  // — Inventar einmalig geradeziehen (SAVE 87, Chef-Report 31.08.2026 mit Bildbeleg) —
  //   Bis v86 legte jeder Fund sich in die ERSTE freie Luecke, und beim Verbrauchen blieb ein
  //   leeres Fach zurueck. Ueber Wochen entsteht daraus ein Flickenteppich, den die alte Ansicht
  //   nur versteckt hat: sie zeichnete die belegten Faecher zusammenhaengend und schob alle
  //   Luecken ans Ende. Seit die Faecher an ihrer ECHTEN Position stehen, saehe der Spieler dieses
  //   Chaos zum ersten Mal — beim Chef waren es 22 Stapel, verteilt ueber 40 Faecher.
  //   Ein Spielstand soll nicht mit fremdem Durcheinander in das neue System starten, deshalb hier
  //   EINMALIG (nur beim Sprung von < 87) aufraeumen. Danach gehoeren die Luecken dem Spieler:
  //   wer sein Erz aus Fach 3 nimmt, behaelt Fach 3 leer.
  if ((state.version ?? 0) < 87 && state.inventory && Array.isArray(state.inventory.slots)) {
    compactInventory(state.inventory);
  }

  // Equip-Slots: fehlende/umbenannte Slots auffüllen.
  const oldEquip = state.character.equipment as Record<string, ItemId | null>;
  const equip = {} as Record<EquipSlot, ItemId | null>;
  for (const slot of EQUIP_SLOTS) equip[slot] = oldEquip[slot] ?? null;
  state.character.equipment = equip;

  // Ausrüstungs-Loadouts (v75-VORLAGEN `equipLoadouts`) → Ausrüstungs-KITS (SAVE_VERSION 85-Nachtrag,
  // Chef-Entscheid 28.08.2026): die Überführung in echte Kits läuft GANZ AM ENDE von migrateState
  // (nach allen Item-Renames und Inventar-Migrationen — s. Block „Ausrüstungs-Kits" unten). Hier nur
  // die Alt-Form greifbar machen, damit der generische RENAME-Pfad die Vorlagen-Einträge weiterhin
  // mitnimmt (ein Rename darf keine Vorlage entwerten, bevor sie zum Kit wird).
  const legacyLoadouts: unknown[] = Array.isArray((state as { equipLoadouts?: unknown }).equipLoadouts)
    ? ((state as { equipLoadouts?: unknown }).equipLoadouts as unknown[])
    : [];

  // Das Lager (SAVE_VERSION 75→76, Task #358): neues Feld `camp`. Alt-Saves (< 76) haben es
  // nicht → leeres Lager (`defaultCampState` — rückwirkend gibt es nichts zu rekonstruieren: ein
  // leeres Lager IST seit Task #365 der reguläre Startzustand, den auch ein frischer Charakter
  // hat; das Kapitel-4-Zugangs-Gate ist ersatzlos entfallen, kein SAVE-Bump nötig). Der
  // Lager-State trägt KEINE Item-IDs (nur Gebäude-IDs + Zähler) → der generische Item-RENAME-Pfad
  // unten braucht ihn nicht. Shape-/Referenz-Härtung (Unknown-Id-Strip gegen content.campBuildings,
  // Stufen-/Timer-Klemmen, Job-Validierung) macht sanitizeState. Idempotent.
  if (!state.camp || typeof state.camp !== "object" || Array.isArray(state.camp)) {
    state.camp = defaultCampState();
  }
  // Taverne (SAVE_VERSION 83→84): EIN neues Feld `tavern`. Alt-Saves → `defaultTavernState()` (ungebaut,
  // keine Plätze; die Besetzung macht engine/tavern.ts nach dem Bau). Feld-Härtung: sanitizeState.
  if (!state.tavern || typeof state.tavern !== "object" || !Array.isArray(state.tavern.seats)) {
    state.tavern = defaultTavernState();
  }
  // Jagen (SAVE_VERSION 84→85): sechs leere Fallenplätze, Fang-Nummer 0. Feld-Härtung in sanitizeState.
  if (!Array.isArray(state.huntTraps)) state.huntTraps = defaultHuntTraps();
  if (typeof state.huntCatchSeq !== "number") state.huntCatchSeq = 0;

  // Offline-Veredelung (SAVE_VERSION 76→77, Task #359): neues Teilfeld `camp.refine`. Alt-Saves
  // (< 77, inkl. der frischen v76-Lager-Saves) haben es nicht → `{}` (kein Rezept gewählt, beide
  // Anlagen ruhen — rückwirkend gibt es nichts zu rekonstruieren: ohne gebaute Anlage hätte auch
  // nie etwas veredelt werden können). Trägt KEINE Item-IDs, sondern Gebäude-/Aktions-IDs → der
  // generische Item-RENAME-Pfad unten braucht es nicht. Shape-/Referenz-Härtung (Nicht-Anlagen-
  // Schlüssel + unzulässige Rezept-IDs strippen, accMs-/produced-Klemmen) macht sanitizeState.
  // Idempotent.
  if (!state.camp.refine || typeof state.camp.refine !== "object" || Array.isArray(state.camp.refine)) {
    state.camp.refine = {};
  }

  // New-Haven-Dorfkarte (SAVE_VERSION 77→78, Task #370): neues Teilfeld `camp.positions`
  // (Standort je Gebäude, normalisierte 0..1-Koordinaten). Alt-Saves (< 78) haben es nicht → `{}`.
  // DIE EIGENTLICHE VERTEILUNG macht `campRepairPositions` in sanitizeState (s. dort): jedes
  // Bestandsgebäude bekommt in KATALOG-Reihenfolge den nächsten freien Rasterplatz innerhalb der
  // bebaubaren Fläche — deterministisch, ohne Verlust, ohne Neubau-Zwang. Bewusst NICHT hier
  // dupliziert: dieselbe Reparatur muss ohnehin bei JEDEM Laden laufen (Content-Drift, verbogene
  // Saves, künftige Flächen-Änderungen), und zwei Verteil-Implementierungen könnten auseinander
  // driften. Trägt KEINE Item-IDs → der generische Item-RENAME-Pfad unten braucht es nicht.
  // Idempotent.
  if (
    !state.camp.positions ||
    typeof state.camp.positions !== "object" ||
    Array.isArray(state.camp.positions)
  ) {
    state.camp.positions = {};
  }

  // codex:2026-08-03T12:45:00+02:00 — v79→v80: freie visuelle Gebäude-Anpassungen. Alt-Saves
  // starten ohne Override und behalten dadurch exakt die bisherigen rangabhängigen Standardwerte.
  if (
    !state.camp.mapVisuals ||
    typeof state.camp.mapVisuals !== "object" ||
    Array.isArray(state.camp.mapVisuals)
  ) {
    state.camp.mapVisuals = {};
  }

  // Bauwarteschlange (SAVE_VERSION 80→81, Spieler-Report 1.0.2 "New Haven, ability to queue up
  // what would start next after the current project ends"): neues Teilfeld `camp.buildQueue`.
  // Alt-Saves bekommen eine leere Liste — nichts wartet, exakt das bisherige Verhalten. Die
  // Shape-Haertung (nur bekannte IDs, Laengen-Deckel) macht sanitizeState.
  if (!Array.isArray(state.camp.buildQueue)) {
    state.camp.buildQueue = [];
  }

  // Tages-Gratis-Skip der Trophäenwand III (SAVE_VERSION 76→77, Task #359): neues Feld
  // `slayerFreeSkipDay`. Alt-Saves → 0 („heute noch nicht verbraucht"; großzügig und rückwirkend
  // korrekt — die Trophäenwand konnte vor v77 gar nicht gebaut sein). Ganzzahl-Härtung: sanitize.
  if (typeof state.slayerFreeSkipDay !== "number") state.slayerFreeSkipDay = 0;

  // Portrait für Saves von vor dem Account-Portrait-System (SAVE_VERSION 22).
  if (typeof state.character.portrait !== "string") state.character.portrait = DEFAULT_PORTRAIT;
  // Essen-Feld für Saves von vor dem Kochen-System.
  if (state.character.food === undefined) state.character.food = null;
  // Gold für Saves von vor dem Shop-System.
  if (state.character.gold === undefined) state.character.gold = 0;
  // Mana für Saves von vor dem Magie-System (regeneriert sich schnell auf max).
  if (state.character.mana === undefined) state.character.mana = 0;
  // Buffs für Saves von vor dem Buff-System.
  if (!Array.isArray(state.character.buffs)) state.character.buffs = [];
  // Combat-Style für Saves von vor dem Stil-System.
  if (!state.character.combatStyle) state.character.combatStyle = "attack";
  // Fernkampf-/Magie-Stance für Saves von vor dem Stance-System (SAVE_VERSION 43).
  if (!state.character.rangedStance) state.character.rangedStance = "precise";
  if (!state.character.magicStance) state.character.magicStance = "offensive";
  // baseAttributes anlegen/auffüllen: computeStats liest c.baseAttributes[id] UNGESCHÜTZT
  // (character.ts) und advance läuft beim Laden außerhalb des migrate-try/catch — ein Save mit
  // fehlendem/korruptem baseAttributes würde sonst beim ersten (Offline-)Tick hart crashen.
  // Skalen-bewusster Fill (jede Ära bekommt IHREN Basiswert, damit die Skalen-Migrationen unten
  // aufgefüllte und echte Alt-Werte GEMEINSAM korrekt treffen — kein Doppel-Squish):
  //   v<47: 5 (vor dem Input-Squish) → v47 halbiert → v48 hebt auf 3;
  //   v47:  2.5 (Input-Squish-Ära) → v48 hebt auf 3;
  //   v≥48: BASE_ATTRIBUTE_VALUE (3, ganzzahlige Skala).
  const fillAttributeValue =
    (state.version ?? 0) < 47 ? 5 : (state.version ?? 0) < 48 ? 2.5 : BASE_ATTRIBUTE_VALUE;
  if (!state.character.baseAttributes || typeof state.character.baseAttributes !== "object") {
    state.character.baseAttributes = Object.fromEntries(
      ATTRIBUTE_IDS.map((id) => [id, fillAttributeValue]),
    ) as Record<AttributeId, number>;
  }
  for (const id of ATTRIBUTE_IDS) {
    if (typeof state.character.baseAttributes[id] !== "number") {
      state.character.baseAttributes[id] = fillAttributeValue;
    }
  }
  // skills defaulten: sanitizeState iteriert Object.values(state.skills) → fehlt skills, würde der
  // ganze Save als „beschädigt" verworfen statt rekonstruiert. Leeres Objekt ist sicher
  // (Skill-Level lesen überall via `state.skills[id]?.xp ?? 0`).
  if (!state.skills || typeof state.skills !== "object") state.skills = {};
  // Auto-Eat-Stufe für Saves von vor der Auto-Eat-Upgrade-Linie.
  if (typeof state.character.autoEatTier !== "number") state.character.autoEatTier = 0;
  // Auto-Trank-System (SAVE_VERSION 48→49): neues Feld `character.autoPotion` (Heiltrank-Auswahl,
  // Trink-Schwelle, Auto-Rebuff für Tonika). Alt-Saves (< 49) haben es nicht → Default AUS
  // (healPotionId null, Schwelle 0.4, Rebuff aus). Idempotent; die Wert-Härtung (Schwelle 0..1,
  // Trank-ID gegen den Content, Flag strikt boolean) macht sanitizeState.
  if (!state.character.autoPotion || typeof state.character.autoPotion !== "object") {
    state.character.autoPotion = defaultAutoPotion();
  }
  // codex:2026-08-02T16:20:00+02:00 — v78→v79: Wer Auto-Rebuff bereits aktiv genutzt hat,
  // behält ihn ohne nachträgliche Gebühr; alle anderen Alt-Saves beginnen mit gesperrtem Auto-Buff.
  if (typeof state.character.autoPotion.autoRebuffUnlocked !== "boolean") {
    state.character.autoPotion.autoRebuffUnlocked =
      (state.version ?? 0) < 79 && state.character.autoPotion.autoRebuffTonics === true;
  }
  // Statistik für Saves von vor dem Statistik-System.
  if (!state.stats)
    state.stats = {
      kills: 0,
      deaths: 0,
      itemsGathered: 0,
      itemsCrafted: 0,
      craftedById: {},
      goldSpent: 0,
      dailyStreak: 0,
      lastDailyDay: 0,
      actionRunsById: {},
      producedById: {},
      harvestedById: {}, // claude:2026-10-24T15:21:04+02:00 — SAVE 94
      producedBySkill: {}, // claude:2026-10-24T16:03:31+02:00 — SAVE 95
      huntCatches: 0,
      huntCatchesById: {},
    };
  if (typeof state.stats.itemsGathered !== "number") state.stats.itemsGathered = 0;
  // Craft-Zähler (SAVE_VERSION 27): für craft_items-Quests. Alt-Saves starten bei 0 (rückwirkend
  // werden geschmiedete Items nicht nachgezählt — wäre nicht rekonstruierbar). Idempotent.
  if (typeof state.stats.itemsCrafted !== "number") state.stats.itemsCrafted = 0;
  if (!state.stats.craftedById || typeof state.stats.craftedById !== "object") {
    state.stats.craftedById = {};
  }
  // Achievement-System 2.0 (SAVE_VERSION 27→28): neue lebenslange Zähler defaulten. Alt-Saves
  // starten bei 0 (rückwirkend nicht rekonstruierbar). Idempotent. `state.achievements` (string[])
  // bleibt unverändert kompatibel — alte IDs (ach_kills_10 …) bleiben gültige Defs.
  if (typeof state.stats.goldSpent !== "number") state.stats.goldSpent = 0;
  if (typeof state.stats.dailyStreak !== "number") state.stats.dailyStreak = 0;
  if (typeof state.stats.lastDailyDay !== "number") state.stats.lastDailyDay = 0;
  // Taverne (SAVE_VERSION 83→84, taverne-spec-technik.md §2): zwei neue Baseline-Zähler. Alt-Saves
  // starten leer (rückwirkend nicht rekonstruierbar). Idempotent.
  if (!state.stats.actionRunsById || typeof state.stats.actionRunsById !== "object") state.stats.actionRunsById = {};
  if (!state.stats.producedById || typeof state.stats.producedById !== "object") state.stats.producedById = {};
  // Jagen (SAVE_VERSION 84→85): Fang-Zähler. Alt-Saves 0.
  if (typeof state.stats.huntCatches !== "number") state.stats.huntCatches = 0;
  if (!state.stats.huntCatchesById || typeof state.stats.huntCatchesById !== "object") state.stats.huntCatchesById = {};
  // Achievements für Saves von vor dem Meilenstein-System.
  if (!Array.isArray(state.achievements)) state.achievements = [];
  // Bestiarium-Kills für Saves von vor dem Bestiarium-System.
  if (!state.monsterKills || typeof state.monsterKills !== "object") state.monsterKills = {};
  // Dungeon-Clears (SAVE_VERSION 28): je Dungeon-ID kumulativ. Inkrement-Stelle ist combat.ts
  // (Dungeon-Clear-Pfad). Alt-Saves starten leer. Idempotent.
  if (!state.dungeonsCleared || typeof state.dungeonsCleared !== "object") state.dungeonsCleared = {};
  // Dungeon-Einmal-Unlock (SAVE_VERSION 59→60, Dungeon-Rework CHEF-ENTSCHEID 2026-07-09): neue
  // Felder defaulten. Die eigentlichen Migrationspfade — (a) geclearte Dungeons ⇒ entsperrt,
  // (b) Alt-Schlüssel im Besitz ⇒ entsperren + entfernt + Überschuss zum Verkaufswert erstattet,
  // (c) Unknown-Id-Strip/strikt-true — laufen als versions-ungegatete Load-Invarianten in
  // sanitizeState (idempotent; heilt so auch Save-Edits und Schlüssel-Zuflüsse an addItemOrBank
  // vorbei). Idempotent.
  if (!state.dungeonsUnlocked || typeof state.dungeonsUnlocked !== "object" || Array.isArray(state.dungeonsUnlocked)) {
    state.dungeonsUnlocked = {};
  }
  if (state.lastDungeonUnlock === undefined) state.lastDungeonUnlock = null;
  // Paragonturm (SAVE_VERSION 60→61, dungeon-rework-spec §7): neues Feld `state.paragon`
  // ({ checkpoint, best }). Alt-Saves (< 61) haben es nicht → Default { 0, 0 } (frischer
  // Aufstieg; rückwirkend gibt es nichts zu rekonstruieren). `combat.paragonFloor` läuft
  // unten über den Combat-Whitelist-Rebuild (nur Zahl wird übernommen, sonst undefined).
  // Wert-Härtung (Finites/Ganzzahlen/Invarianten) macht sanitizeState. Idempotent.
  if (!state.paragon || typeof state.paragon !== "object" || Array.isArray(state.paragon)) {
    state.paragon = defaultParagonState();
  }
  // Story-Zonen-Gating (SAVE_VERSION 62→63, Aschechronik ceo-run-2026-07-13 Welle C): neues Feld
  // `legacyZoneGrants` (Record<zoneId, true> — Bestandsschutz-Freischaltungen, Gate-Logik
  // engine/zones.ts isZoneUnlocked). Alt-Saves (< 63) erhalten ALLE zum v62-Zeitpunkt
  // existierenden Kampf-Zonen als Grant (EINGEFRORENE Liste LEGACY_V62_ZONE_IDS oben — die
  // Chronik-Gates aus Welle D2 dürfen Bestandsspielern nichts wegnehmen; die Story bleibt via
  // Chronik-Quests trotzdem ab Kapitel 1 spielbar, KEIN Auto-Complete). Saves ≥ 63 (inkl.
  // frischer createGame-Stände mit leerem Objekt) bleiben unangetastet — idempotent über die
  // Versions-Schranke. Wert-Härtung (strikte true-Map) macht sanitizeState.
  if (!state.legacyZoneGrants || typeof state.legacyZoneGrants !== "object" || Array.isArray(state.legacyZoneGrants)) {
    state.legacyZoneGrants = {};
  }
  if ((state.version ?? 0) < 63) {
    for (const zoneId of LEGACY_V62_ZONE_IDS) state.legacyZoneGrants[zoneId] = true;
  }
  // Stopp-Hinweis für Saves von vor dem „Aktion gestoppt"-Feature.
  if (state.lastStop === undefined) state.lastStop = null;
  // Betäubung für Saves von vor dem Thieving-Ausbau.
  if (typeof state.stunMs !== "number") state.stunMs = 0;
  // Mastery für Saves von vor dem Mastery-System.
  if (!state.mastery || typeof state.mastery !== "object") state.mastery = {};
  // Bank/Lager für Saves von vor dem Lager-System.
  if (!state.bank || typeof state.bank !== "object") state.bank = {};
  // Collection-Log für Saves von vor dem „gesehene Drops"-System.
  if (!state.seenDrops || typeof state.seenDrops !== "object") state.seenDrops = {};
  // Aktions-Collection-Log (SAVE_VERSION 51→52): je Aktion die bereits erhaltenen Loot-Item-IDs
  // (Spiegel von seenDrops). Alt-Saves (< 52) haben es nicht → leer defaulten (rückwirkend nicht
  // rekonstruierbar). Idempotent.
  if (!state.seenActionDrops || typeof state.seenActionDrops !== "object") state.seenActionDrops = {};
  // Erst-Besitz-Marker (SAVE_VERSION 57→58, Bestiarium-/Item-Wiki-Fundament): Alt-Saves (< 58)
  // haben das Feld nicht → leer defaulten. Den EHRLICHEN Backfill (Union des IST-Bestands aus
  // Inventar+Bank+Equipment+Instanzen) macht sanitizeState — er läuft dort bewusst bei JEDEM Load
  // (idempotent/monoton), NACHDEM alle Renames + Unknown-Id-Strips durch sind. `monsterKills`
  // bleibt für Alt-Saves unangetastet (das Feld existiert seit dem Bestiarium-Grundstein und
  // trägt echte Historie; nichts zu raten). Idempotent.
  if (!state.discoveredItems || typeof state.discoveredItems !== "object" || Array.isArray(state.discoveredItems)) {
    state.discoveredItems = {};
  }
  // Komfort-Einstellungen (Auto-Bank) für Saves von vor dem Idle-Komfort-System (SAVE_VERSION 24).
  if (!state.settings || typeof state.settings !== "object") state.settings = defaultSettings();
  if (typeof state.settings.autoBank !== "boolean") state.settings.autoBank = defaultSettings().autoBank;
  // Auto-Aufstieg im Paragonturm (SAVE_VERSION 66→67, Welle JJ — Aldric A2): neues Settings-Feld
  // `autoParagonAscend`. Alt-Saves (< 67) haben es nicht → Default false (Opt-in-Komfort; die
  // Etagen-Pause bleibt Default-Verhalten). STRIKTE boolean-Härtung bei JEDEM Load (Muster
  // autoBank): jeder Nicht-boolean-Wert (String "true", 1, null, …) fällt auf false zurück.
  if (typeof state.settings.autoParagonAscend !== "boolean") {
    state.settings.autoParagonAscend = defaultSettings().autoParagonAscend;
  }
  // claude:2026-10-23T19:20:00+02:00 — Ländereien-Meldungen (1.4.0, SAVE 89-Nachtrag, nie live): strikt boolean, Standard an.
  if (typeof state.settings.estateNotifications !== "boolean") {
    state.settings.estateNotifications = defaultSettings().estateNotifications;
  }
  // claude:2026-10-23T22:00:00+02:00 — Materiallager (1.4.0 ML): „Direkt ins Lager“, strikt boolean, Standard an.
  if (typeof state.settings.materialsToStorage !== "boolean") {
    state.settings.materialsToStorage = true; // Alt-Saves: Chef-Vorgabe „an“ (die Engine-Baseline aus gilt nur für Sim/Tests)
  }
  // claude:2026-10-24T19:00:00+02:00 — Köcher nachfüllen (1.4.0 FK): strikt boolean, Standard an.
  if (typeof state.settings.quiverAutoRefill !== "boolean") {
    state.settings.quiverAutoRefill = defaultSettings().quiverAutoRefill;
  }
  // claude:2026-10-25T04:40:00+02:00 — Raid (SAVE 93): beide Schalter strikt boolean, Standard aus.
  if (typeof state.settings.raidAutoContinue !== "boolean") state.settings.raidAutoContinue = false;
  if (typeof state.settings.raidAutoBuyRestart !== "boolean") state.settings.raidAutoBuyRestart = false;
  // Quest-State (SAVE_VERSION 25): leer defaulten. Quests werden beim nächsten advance via
  // evaluateQuests gegen die bestehenden Zähler (Kills etc.) neu ausgewertet.
  if (!state.quests || typeof state.quests !== "object") state.quests = defaultQuestState();
  if (!Array.isArray(state.quests.completed)) state.quests.completed = [];
  if (!Array.isArray(state.quests.claimed)) state.quests.claimed = [];
  // Repeatable-Baseline (SAVE_VERSION 27): pro wiederholbarer Quest der Zählerstand beim letzten
  // Claim. Alt-Saves ohne repeatable Quests starten leer; fehlt das Feld → Fortschritt = absoluter
  // Zähler (Baseline 0). Idempotent.
  if (!state.quests.repeatBaseline || typeof state.quests.repeatBaseline !== "object") {
    state.quests.repeatBaseline = {};
  }
  // Daily-State (SAVE_VERSION 27): leer defaulten (Tag 0 = noch nie gezogen). Beim nächsten
  // refreshDailyQuests(state, content, heute) werden die 6 Dailies frisch gezogen. Idempotent.
  if (!state.quests.daily || typeof state.quests.daily !== "object") {
    state.quests.daily = defaultDailyState();
  }
  if (typeof state.quests.daily.day !== "number") state.quests.daily.day = 0;
  if (!Array.isArray(state.quests.daily.quests)) state.quests.daily.quests = [];

  // Pet-/Begleiter-System (SAVE_VERSION 28→29): neue State-Felder defaulten. Alt-Saves
  // (v28) haben weder Begleiter noch besessene Pets. Idempotent.
  // PET_RENAME: eigener Rename-Pfad für umbenannte Pet-IDs — getrennt von der Item-RENAME,
  // da Pets NICHT in inventory.slots/bagSlots/equipment/food/buffs/bank liegen, sondern nur
  // in character.companionPetId + character.ownedPets.
  //
  // SAVE_VERSION 29→30 (Zwei-Effekt-Redesign, Chef-Freigabe 2026-06-25): die 21 Pet-IDs
  // sind auf die Grimm-Namen umbenannt. Alte IDs werden hier 1:1 auf die neuen gemappt;
  // unbekannte/alte IDs ohne Mapping fallen unten gegen content.pets durch
  // (ensureValidIds) sauber heraus. Das alte single-`effect`-Schema lebte nur im Content
  // (nicht im Save), also genügt der ID-Rename für die Persistenz.
  const PET_RENAME: Record<string, PetId> = {
    barki: "rotbark",
    pebblesnout: "cragmaw",
    bubblefin: "gillrot",
    sproutling: "witherling",
    filu: "sporewretch",
    shadowpaw: "gloomrat",
    cindersnap: "slagfiend",
    sizzlecub: "ashgut",
    quillwhisk: "quillshrike",
    tanpaw: "flayling",
    gemsprite: "gemwraith",
    inkwhisper: "glyphmaw",
    brewmouse: "hemlock",
    scrollwing: "vellumoth",
    bladenip: "gorehound",
    ironpup: "ironmaw",
    shellback: "carapace",
    arrowwren: "carrionwing",
    embermote: "pyreling",
    wispguard: "hoarspite",
    skullkin: "charnel",
  };
  const renamePet = (id: PetId | null): PetId | null => {
    if (!id) return null;
    return (PET_RENAME[id] ?? id) as PetId;
  };
  if (state.character.companionPetId === undefined) state.character.companionPetId = null;
  state.character.companionPetId = renamePet(state.character.companionPetId);
  const ownedRaw = state.character.ownedPets;
  const ownedPets: Record<PetId, true> = {};
  if (ownedRaw && typeof ownedRaw === "object") {
    for (const id of Object.keys(ownedRaw)) {
      if ((ownedRaw as Record<string, unknown>)[id]) {
        const nid = renamePet(id as PetId);
        if (nid) ownedPets[nid] = true;
      }
    }
  }
  state.character.ownedPets = ownedPets;
  // Ausgerüstetes Pet muss besessen sein — sonst ablegen (defensiv).
  if (state.character.companionPetId && !ownedPets[state.character.companionPetId]) {
    state.character.companionPetId = null;
  }
  // Pet-Drop-Breadcrumb (UI-Benachrichtigung). Alt-Saves: nichts Neues. Härtung: Shape prüfen
  // (petId muss String sein, sonst Breadcrumb verwerfen), seq NaN/negativ-fest, Pet-Renames
  // auch hier nachziehen (der Breadcrumb zeigt sonst auf eine tote ID).
  if (state.lastPetDrop === undefined) state.lastPetDrop = null;
  if (state.lastPetDrop !== null) {
    const lp = state.lastPetDrop as Partial<{ petId: unknown; seq: unknown }>;
    if (typeof lp.petId !== "string") {
      state.lastPetDrop = null;
    } else {
      state.lastPetDrop = {
        petId: renamePet(lp.petId as PetId) as PetId,
        seq: finiteNonNeg(lp.seq, 0),
      };
    }
  }
  // v65 (Welle DD „Kein Drop darf je stumm sein"): monotoner Lebenszeit-Drop-Zähler. Alt-Saves
  // (< 65) kennen nur lastPetDrop.seq — davon initialisieren (bzw. 0, wenn der Breadcrumb schon
  // quittiert/nie gesetzt war; die UI-seenSeq startet dann ebenfalls bei 0 → kein Stumm-Drop).
  // sanitize-Härtung (JEDER Load): Monotonie-Invariante petDropSeq ≥ lastPetDrop.seq erzwingen,
  // NaN/Infinity/negativ → 0. NIE senken, NIE nullen.
  state.petDropSeq = Math.max(
    finiteNonNeg((state as Partial<GameState>).petDropSeq, 0),
    state.lastPetDrop?.seq ?? 0,
  );

  // v66 (Welle GG): AP-Meilensteine + Slayer-Streak. Alt-Saves (< 66) haben keins der sieben
  // Felder → Defaults: claimed-Liste leer, Zähler/Streak 0, Breadcrumbs null, Zeremonie-Flag
  // false. Die NACHHOLUNG bereits verdienter AP-Quote macht bewusst NICHT die Migration, sondern
  // der Vergabe-Choke-Point selbst (checkApMilestones via checkAchievements, tick.ts advance) —
  // beim ersten Check nach dem Load bekommt ein Alt-Save alle erreichten Schritte als EINEN
  // Breadcrumb-Stapel (Chef-GO: „die UI zeigt das als Stapel"). Wert-/Shape-Härtung macht
  // sanitizeState. Idempotent (nur fehlende/typfremde Felder werden gesetzt).
  if (!Array.isArray(state.claimedApMilestones)) state.claimedApMilestones = [];
  if (typeof state.apMilestoneSeq !== "number") state.apMilestoneSeq = 0;
  if (state.lastApMilestone === undefined) state.lastApMilestone = null;
  if (typeof state.apCeremonyPending !== "boolean") state.apCeremonyPending = false;
  if (typeof state.slayerStreak !== "number") state.slayerStreak = 0;
  if (typeof state.slayerStreakSeq !== "number") state.slayerStreakSeq = 0;
  if (state.lastSlayerStreakBonus === undefined) state.lastSlayerStreakBonus = null;

  // v68 (Welle LL): Paragon-Truhen-Breadcrumb (Fun-Retest paragon-aldric P1). Alt-Saves (< 68)
  // haben keins der beiden Felder → Defaults: Zähler 0, Breadcrumb null (rückwirkend gibt es
  // keine Truhe nachzureichen — der Inhalt kam ja an, nur die Feier fehlte). Shape-/Monotonie-
  // Härtung macht sanitizeState. Idempotent (nur fehlende/typfremde Felder werden gesetzt).
  if (typeof state.paragonChestSeq !== "number") state.paragonChestSeq = 0;
  if (state.lastParagonChest === undefined) state.lastParagonChest = null;

  // Manuelles Attributpunkt-System ausgebaut (SAVE_VERSION 26, Chef-Entscheidung 2026-06-25):
  // reine Hybrid-Progression. Die nur der manuellen Vergabe dienenden Felder werden defensiv
  // aus Alt-Saves entfernt (idempotent; computeStats liest sie nicht mehr). Bereits zugeteilte
  // allocatedAttributes werden NICHT in baseAttributes übernommen — Attribute leiten sich künftig
  // ausschließlich aus baseAttributes + Skills + Ausrüstung ab.
  const legacyChar = state.character as unknown as {
    allocatedAttributes?: unknown;
    unspentPoints?: unknown;
  };
  delete legacyChar.allocatedAttributes;
  delete legacyChar.unspentPoints;

  // Inventar: altes `capacity` → `baseCapacity`, Taschen-Plätze ergänzen.
  const inv = state.inventory as unknown as {
    baseCapacity?: number;
    capacity?: number;
    bagSlots?: Array<ItemId | null>;
    slots: Array<InventorySlot | null>;
    instances?: ItemInstance[];
  };
  inv.baseCapacity = inv.baseCapacity ?? inv.capacity ?? BASE_INVENTORY_SLOTS;
  delete inv.capacity;
  // Idle-Komfort (SAVE_VERSION 24): Start-Slots 10 → 20. Alt-Saves (< 24) bekommen die
  // zusätzlichen Gratis-Slots geschenkt, OHNE gekaufte Slot-Upgrades zu verlieren: wir
  // verschieben die Basis um die Differenz nach oben (10 + n·2 Upgrades → 20 + n·2). So
  // bleibt auch `slotUpgradeCost` (= (baseCapacity − BASE_INVENTORY_SLOTS)/2) konsistent.
  // Idempotent über die Versions-Schranke: schon migrierte Saves (≥ 24) bleiben unberührt.
  if ((state.version ?? 0) < 24) {
    const extra = BASE_INVENTORY_SLOTS - LEGACY_BASE_INVENTORY_SLOTS;
    inv.baseCapacity += extra;
    // Slot-Array um dieselbe Differenz mit leeren Plätzen auffüllen (vorne bleiben die
    // belegten Slots; die Engine synchronisiert die Länge ohnehin bei Kapazitätsänderungen).
    if (Array.isArray(inv.slots)) for (let i = 0; i < extra; i++) inv.slots.push(null);
  }
  // Pouch-/Taschenslot-System ENTFERNT (SAVE_VERSION 55→56, Task #271): ausgerüstete Taschen
  // werden ersatzlos entfernt (Chef: Kapazität läuft NUR noch über den Gold-Shop) — die durch
  // Taschen gewährte Zusatz-Kapazität entfällt. VERLUSTFREI für Items im Überhang: sanitizeState
  // kürzt `slots` beim Trimmen nie unter die Anzahl belegter Slots (Math.max(cap, filled.length));
  // nur NEUE Aufnahme ist begrenzt, bis wieder Platz frei ist. Gelagerte small_pouch-STACKS in
  // Inventar/Bank bleiben unangetastet (inertes Item; content-dev entfernt es in der Folge-Welle).
  // Idempotent: post-v56-Saves haben bereits ein leeres Array.
  inv.bagSlots = [];

  // Inventar-Instanz-Tasche (SAVE_VERSION 52→53, #246): Item-Instanzen (verzaubert/gesuffixt) lagen
  // bisher je in einem eigenen `slots[].instance` — bei vielen Varianten explodierte der Platzbedarf.
  // Sie ziehen jetzt in die UNBEGRENZTE Tasche `inventory.instances` (analog `bankInstances`). Alt-Saves:
  // jede Slot-Instanz herausziehen, den Slot leeren. `bankInstances` (Gear-Vault) bleibt unberührt.
  // Idempotent: bereits migrierte Saves (≥ 53) haben keine Slot-Instanzen mehr → no-op. Die
  // Instanz-Validierung + der DISCARD_IDS-Filter laufen weiter unten bzw. in sanitizeState. Läuft VOR
  // dem Rename-Pass, damit dieser nur noch plain Slots sieht.
  if (!Array.isArray(inv.instances)) inv.instances = [];
  for (let i = 0; i < inv.slots.length; i++) {
    const s = inv.slots[i];
    if (s?.instance) {
      inv.instances.push(s.instance);
      inv.slots[i] = null;
    }
  }

  // Item-IDs umbenennen (Metall-Leiter-Neuordnung: grimiron/blackcast/… → neue Tiers;
  // plus die 21 Meister-Cape→Ring-Renames aus RING_MASTER_RENAME, SAVE 69).
  const RENAME: Record<string, ItemId> = {
    ...RING_MASTER_RENAME,
    grimiron_sword: "iron_sword",
    // Iron wurde zum vollen Set (Kupfer-Schema): alte 4 Rüstungs-IDs → neue Pendants.
    grimiron_helm: "iron_fullhelm",
    grimiron_body: "iron_platebody",
    grimiron_legs: "iron_platelegs",
    grimiron_shield: "iron_kiteshield",
    iron_helm: "iron_fullhelm",
    iron_body: "iron_platebody",
    iron_legs: "iron_platelegs",
    iron_shield: "iron_kiteshield",
    grimiron_bar: "iron_bar",
    grimiron_ore: "iron_ore",
    grimiron_pickaxe: "mithril_pickaxe",
    blackcast_warblade: "steel_sword",
    blackcast_helm: "steel_fullhelm",
    blackcast_body: "steel_platebody",
    blackcast_bar: "steel_bar",
    blackcast_ore: "mithril_ore",
    frostiron_ore: "adamantite_ore",
    frostiron_bar: "adamantium_bar",
    voidstone_ore: "runite_ore",
    voidsteel_bar: "runite_bar",
    voidsteel_pickaxe: "runite_pickaxe",
    idol_ore: "godiron_ore",
    vulture_feather: "feather",
    // Copper-Gear-Umbenennung (SAVE_VERSION 23): alte ID → neue kanonische ID.
    copper_breastplate: "copper_platebody",
    copper_legguards: "copper_platelegs",
    copper_gloves: "copper_gauntlets",
    copper_boots: "copper_sabatons",
    // Legacy-Bögen → Tier-Leiter (SAVE_VERSION 32→33): alte generische Bow-IDs entfernt.
    short_bow: "copper_shortbow",
    grimoak_longbow: "iron_longbow",
    ashbark_longbow: "steel_longbow",
    blackthorn_warbow: "steel_longbow",
    composite_warbow: "mithril_longbow",
    ironbark_warbow: "mithril_longbow",
    runed_longbow: "runite_longbow",
    shadowpine_longbow: "runite_longbow",
    bonewood_greatbow: "titanium_longbow",
    godwood_bow: "godiron_longbow",
    dustwing_shortbow: "steel_shortbow",
  };
  // DISCARD_IDS: Item-IDs, die vollständig entfernt wurden und kein Nachfolger existiert.
  // Saves mit diesen IDs im Inventar/Equipment werden einfach geleert (kein Crash).
  //
  // SAVE_VERSION 38→39 (generischer Verzauberungstisch): die 11 alten per-Waffe-Enchant-FESTITEMS
  // wurden aus dem Content gelöscht (ersetzt durch Affix-Instanzen am Verzauberungstisch). Es gibt
  // KEINEN sinnvollen Basis-Ersatz (das waren einmalige Enchant-Produkte) → Slot leeren. Greift über
  // den rename()-Pfad unten für inventory.slots[].itemId, bagSlots, equipment[*], food, buffs, bank;
  // Instanzen mit einer dieser baseItemId werden separat unten entfernt.
  const DISCARD_IDS = new Set<string>([
    "forceful_iron_sword",
    "flaming_steel_sword",
    "emberforce_sword",
    "frostbite_longbow",
    "warded_platebody",
    "swift_chainbody",
    "storm_scimitar",
    "aether_runite_staff",
    "swiftflame_shortbow",
    "void_greatsword",
    "voidstorm_staff",
  ]);
  const rename = (id: ItemId | null): ItemId | null => {
    if (!id) return null;
    if (DISCARD_IDS.has(id)) return null;
    return (RENAME[id] ?? id) as ItemId;
  };
  for (const slot of inv.slots) if (slot) slot.itemId = rename(slot.itemId) as ItemId;
  // Verwerfe Inventar-Slots, deren itemId nach dem Rename null wurde.
  for (let i = 0; i < inv.slots.length; i++) {
    const slot = inv.slots[i];
    if (slot && slot.itemId === null) inv.slots[i] = null;
  }
  for (const s of EQUIP_SLOTS) equip[s] = rename(equip[s]);
  state.character.food = rename(state.character.food);
  for (const b of state.character.buffs) b.itemId = rename(b.itemId) as ItemId;
  // Bank-Schlüssel ebenfalls umbenennen (Mengen bei Kollision zusammenführen).
  const renamedBank: Record<ItemId, number> = {};
  for (const [id, qty] of Object.entries(state.bank)) {
    const nid = rename(id as ItemId);
    if (nid) renamedBank[nid] = (renamedBank[nid] ?? 0) + qty;
  }
  // Vorlagen-Einträge der ALTEN Loadouts (v75, bis zur Kit-Überführung am Ende von migrateState) und
  // die Ausrüstung der KITS (SAVE_VERSION 85) laufen im generischen RENAME-Pfad mit: ein künftiger
  // Item-Rename darf weder eine Vorlage noch ein Kit entwerten (Save-Disziplin: renamed ids AUCH in
  // Kits). DISCARD-Ids verlieren ihren Platz. Instanz-Referenzen/-baseItemIds bleiben hier unberührt
  // (instanceId ist stabil; baseItemIds ziehen über die dedizierten Instanz-Blöcke unten mit).
  for (const lo of legacyLoadouts) {
    if (!lo || typeof lo !== "object" || Array.isArray(lo)) continue;
    const rec = lo as Record<string, { itemId?: unknown } | null | undefined>;
    for (const slot of EQUIP_SLOTS) {
      const entry = rec[slot];
      if (!entry || typeof entry !== "object" || typeof entry.itemId !== "string") continue;
      const nid = rename(entry.itemId as ItemId);
      if (nid) entry.itemId = nid;
      else delete rec[slot];
    }
  }
  if (Array.isArray(state.equipKits)) {
    for (const kit of state.equipKits) {
      if (!kit || typeof kit !== "object" || !kit.equipment || typeof kit.equipment !== "object") continue;
      for (const slot of EQUIP_SLOTS) kit.equipment[slot] = rename(kit.equipment[slot] ?? null);
    }
  }
  state.bank = renamedBank;

  // Munitions-System entfernt (SAVE_VERSION 56→57, Task #286 Stage A): der Köcher-Slot "ammo"
  // existiert nicht mehr (EQUIP_SLOTS-Rebuild oben hat ihn bereits aus dem equipment-Record
  // gelassen → er verschwindet aus dem Save-Shape). Ausgerüstete Alt-Munition verfällt ERSATZLOS
  // (Chef-Entscheid 2026-07-08: „Wir brauchen auch gar keine Pfeile generell mehr im Spiel";
  // Stage B löscht die Pfeil-Items komplett aus dem Katalog — Inventar-/Bank-Stacks räumt dann
  // der generische Unknown-Id-Strip in sanitizeState, wie beim small_pouch-Präzedenzfall).
  // FAIRE GESTE: der Verkaufswert des Köcher-Stacks (floor(value × SELL_FRACTION) je Stück) wird
  // als Gold gutgeschrieben — kein „stiller Diebstahl" beim Update. Idempotent: post-v57-Saves
  // haben weder den ammo-Key noch ammoCount > 0 → no-op. gold-Härtung macht sanitizeState.
  {
    const legacyAmmoId = rename((oldEquip["ammo"] as ItemId | null | undefined) ?? null);
    const rawCount = (state as { ammoCount?: unknown }).ammoCount;
    // Menge defensiv wie der alte Köcher-Clamp auf QTY_HARD_CAP deckeln (kein Gold-Overflow aus
    // einem editierten Riesen-ammoCount; Korruptionsschutz, kein Anti-Cheat).
    const qty =
      typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount > 0
        ? Math.min(Math.floor(rawCount), QTY_HARD_CAP)
        : 0;
    if (legacyAmmoId && qty > 0) {
      const unitValue = content.items[legacyAmmoId]?.value ?? 0;
      const credit = Math.floor(unitValue * SELL_FRACTION) * qty;
      if (credit > 0 && typeof state.character.gold === "number" && Number.isFinite(state.character.gold)) {
        state.character.gold += credit;
      }
    }
    // Alt-Key restlos entfernen (Feld existiert seit dem Stage-C-Finale nicht mehr im Typ);
    // sanitizeState löscht ihn zusätzlich (Save-Edit-Härtung).
    delete (state as { ammoCount?: unknown }).ammoCount;
  }

  // Combat-State normalisieren (Saves von vor dem Kampfsystem / vor eventCount).
  const cb = state.combat as Partial<GameState["combat"]> | undefined;
  state.combat = {
    monsterId: cb?.monsterId ?? null,
    enemyHp: cb?.enemyHp ?? 0,
    playerTimerMs: cb?.playerTimerMs ?? 0,
    enemyTimerMs: cb?.enemyTimerMs ?? 0,
    kills: cb?.kills ?? 0,
    eventCount: cb?.eventCount ?? 0,
    enemyEffects: Array.isArray(cb?.enemyEffects) ? cb.enemyEffects : [],
    playerEffects: Array.isArray(cb?.playerEffects) ? cb.playerEffects : [],
    log: Array.isArray(cb?.log) ? cb.log : [],
    // Dungeon-Run-Felder für Saves von vor dem Dungeon-System.
    dungeonId: cb?.dungeonId ?? null,
    encounterIndex: typeof cb?.encounterIndex === "number" ? cb.encounterIndex : 0,
    // Paragonturm (SAVE_VERSION 61): aktive Turm-Etage. WIRD persistiert (ein mitten in der
    // Etage gespeicherter Kampf läuft nach dem Load korrekt skaliert weiter — die Instanz wird
    // deterministisch aus (paragonFloor, monsterId) rekonstruiert). Alt-Saves ⇒ undefined.
    // Strikte Konsistenz-Härtung (=== checkpoint+1, sonst Kampf beenden) macht sanitizeState.
    paragonFloor: typeof cb?.paragonFloor === "number" ? cb.paragonFloor : undefined,
    // Elite-/World-Spawns (SAVE_VERSION 71→72): aktive Elite-Kampf-Variante. WIRD persistiert (ein
    // mitten im Kampf gespeicherter Elite-Fight läuft nach dem Load skaliert weiter — Muster
    // paragonFloor). Alt-Saves ⇒ undefined. Anders als paragonFloor braucht dies KEINE zusätzliche
    // Save-Edit-Härtung in sanitizeState: es gibt keinen „Etagen-999"-artigen Skalierungs-Exploit
    // (eliteVariantId adressiert direkt EINE feste, im Content definierte Variante — kein separater
    // Zahlenwert, der sich zu absurden Rewards hochschrauben ließe). combatStep löst den Gegner beim
    // ersten Tick nach dem Load über `eliteCombatMonster` auf und beendet den Kampf sauber, falls die
    // Variante/das Basis-Monster nicht mehr existiert (Muster jeder anderen stale `monsterId`).
    eliteVariantId: typeof cb?.eliteVariantId === "string" ? cb.eliteVariantId : undefined,
    // Pet-Ability-Laufzeitzustand (SAVE_VERSION 30→31): getriggertes Pet-Kampf-Framework.
    // Transient (gehört zum laufenden Kampf) → Alt-Saves bekommen einfach den frischen Default.
    petAbility:
      cb?.petAbility && typeof cb.petAbility === "object"
        ? cb.petAbility
        : createPetAbilityRuntime(),
    // Kill-Cooldown (Sweep6 T7-F1): der Rest-Cooldown WIRD persistiert — der Engine-Vertrag
    // (combat.ts stopCombat/startCombat: „Der Kill-Cooldown gilt IMMER") gilt damit auch über
    // Save/Load; vorher übersprang jeder Reload bis zu KILL_COOLDOWN_MS Kampfpause. Additiv-
    // optional wie autoEatCooldownMs: Alt-Saves ohne Feld ⇒ undefined = kein Cooldown, daher
    // KEIN SAVE_VERSION-Bump nötig. `lastKill` (reine UI-Summary) bleibt bewusst transient.
    // Härtung (endlich, [0, KILL_COOLDOWN_MS]) macht sanitizeState.
    cooldownRemainingMs: typeof cb?.cooldownRemainingMs === "number" ? cb.cooldownRemainingMs : undefined,
  };

  // SAVE_VERSION 31→32 (Magie-/Enchant-Fundament): neue OPTIONALE Felder leben ausschließlich in
  // den ContentDB-Definitionen (ItemDef.manaCost/weaponEffects, EquipBonus.maxMana/manaRegen) und
  // NICHT im GameState — der Save speichert nur Item-IDs/Mengen, die abgeleiteten Stats berechnet
  // computeStats live aus dem Content. Daher KEIN State-Migrationszweig nötig: Alt-Saves laden
  // unverändert weiter, die neuen Felder greifen über den aktuellen Content automatisch.

  // Passive Farming-Plots (SAVE_VERSION 33→34): neues persistentes Feld `farmPlots`. Alt-Saves
  // (< 34) haben keine Plots → mit leeren Beeten auf die fixe Länge MAX_FARM_PLOTS auffüllen.
  // Idempotent: bereits migrierte Saves werden nur auf die Soll-Länge getrimmt/aufgefüllt. Die
  // detaillierte Wert-Härtung (cropId-Validierung, plantedAtMs-Clamp etc.) macht sanitizeState.
  if (!Array.isArray(state.farmPlots)) state.farmPlots = [];
  while (state.farmPlots.length < MAX_FARM_PLOTS) state.farmPlots.push(emptyFarmPlot());
  state.farmPlots.length = MAX_FARM_PLOTS; // auf fixe Länge trimmen

  // Folgesorte je Beet (SAVE_VERSION 81→82, Chef-GO 25.08.2026 (1.1.0),
  // design/rezension-patch-2026-08-25.html #p12): neues Feld `farmPlots[*].nextCropId`. Alt-Saves
  // bekommen auf jedem Beet explizit `null` (nichts geplant — gab es vorher gar nicht) statt
  // „fehlend", damit die Save-Form fest ist und der Vault-Guard („es ändert sich NUR das neue
  // Feld") byte-genau vergleichen kann (Muster camp.buildQueue, 80→81). Idempotent; die
  // Wert-Härtung (unbekannte Sorte, Plan == Sorte) macht sanitizeState.
  for (const plot of state.farmPlots) {
    if (plot && typeof plot === "object" && (plot as { nextCropId?: unknown }).nextCropId === undefined) {
      plot.nextCropId = null;
    }
  }

  // Thieving-Risiko-Modus (SAVE_VERSION 34→35): neues Feld `thievingRisk`. Alt-Saves (< 35) haben
  // es nicht → auf den Default „careful" setzen (bestehendes, sicheres Spielverhalten). Idempotent;
  // die Wert-Härtung (ungültige Strings → „careful") macht sanitizeState.
  if (state.thievingRisk === undefined) state.thievingRisk = DEFAULT_THIEVING_RISK;

  // Slayer-System (SAVE_VERSION 35→36): neue State-Felder defaulten. Alt-Saves (< 36) haben weder
  // Task noch Punkte. Der neue Skill "slayer" wird beim nächsten advance/computeStats über ?? 0 als 0
  // gelesen — kein Eintrag im skills-Record nötig. Idempotent. Keine Item-ID-Renames durch dieses
  // Feature (Slayer-Anforderungs-Items laufen ggf. später über den bestehenden RENAME-Pfad).
  if (state.slayerTask === undefined) state.slayerTask = null;
  if (typeof state.slayerPoints !== "number") state.slayerPoints = 0;
  if (typeof state.slayerTasksCompleted !== "number") state.slayerTasksCompleted = 0;

  // Köcher-/Ammo-Slot (SAVE_VERSION 36→37): OBSOLET seit v57 (#286 Ammo-Removal) — der Slot ist
  // wieder weg und der Alt-Key `ammoCount` wird oben (Quiver-Verfall-Block) restlos gelöscht.

  // Item-Instanz-Fundament (SAVE_VERSION 37→38): rein ADDITIV — Alt-Saves haben keine Instanzen,
  // alte Stacks bleiben gültig (`InventorySlot.instance` fehlt = klassischer Stack, kein Eingriff).
  // Neue Felder defaulten leer; die Wert-/Referenz-Härtung macht sanitizeState. Idempotent.
  const ch = state.character as unknown as {
    equippedInstances?: unknown;
  };
  if (
    !ch.equippedInstances ||
    typeof ch.equippedInstances !== "object" ||
    Array.isArray(ch.equippedInstances)
  ) {
    state.character.equippedInstances = {};
  }
  if (!Array.isArray(state.bankInstances)) state.bankInstances = [];
  if (typeof state.nextInstanceSeq !== "number") state.nextInstanceSeq = 0;

  // Obsolete Enchant-Festitems (SAVE_VERSION 38→39): die 11 gelöschten IDs (siehe DISCARD_IDS oben)
  // wurden über den rename()-Pfad bereits aus inventory.slots/bagSlots/equipment/food/buffs/bank
  // entfernt (inkl. der Instanz auf einem solchen Inventar-Slot, weil der ganze Slot genullt wird).
  // Instanzen in equippedInstances/bankInstances werden NICHT von rename() berührt → hier explizit
  // entfernen, falls ihre baseItemId verworfen wurde. (sanitizeState würde sie zwar ebenfalls fangen
  // — equipment[slot] ist genullt bzw. baseItemId unbekannt — aber explizit ist robuster.) Idempotent.
  const eqInst = state.character.equippedInstances as Record<string, ItemInstance | undefined>;
  for (const slot of EQUIP_SLOTS) {
    const inst = eqInst[slot];
    if (inst && DISCARD_IDS.has(inst.baseItemId)) delete eqInst[slot];
  }
  // Kit-Instanzen (SAVE_VERSION 85) ebenso — Muster equippedInstances (Save-Disziplin für Kits).
  const kitInstanceRecords: Record<string, ItemInstance | undefined>[] = [];
  if (Array.isArray(state.equipKits)) {
    for (const kit of state.equipKits) {
      const rec = kit?.equippedInstances;
      if (rec && typeof rec === "object" && !Array.isArray(rec)) {
        kitInstanceRecords.push(rec as Record<string, ItemInstance | undefined>);
      }
    }
  }
  for (const rec of kitInstanceRecords) {
    for (const slot of EQUIP_SLOTS) {
      const inst = rec[slot];
      if (inst && DISCARD_IDS.has(inst.baseItemId)) delete rec[slot];
    }
  }
  state.bankInstances = state.bankInstances.filter((inst) => !DISCARD_IDS.has(inst.baseItemId));
  // Instanz-Tasche (v53) ebenso: eine Instanz mit verworfener baseItemId hätte im rename()-Pfad als
  // Slot ihren Slot verloren — hier explizit spiegeln (Instanzen berührt rename() nicht). Idempotent.
  inv.instances = (inv.instances ?? []).filter((inst) => !DISCARD_IDS.has(inst.baseItemId));

  // ── Meister-Capes → Meister-RINGE (SAVE_VERSION 68→69, Chef-Entscheid 2026-07-17) ──────────
  // Die 21 Renames (RING_MASTER_RENAME, oben in die generische RENAME-Map gemischt) haben
  // inventory.slots/equipment/food/buffs/bank bereits erfasst. Der generische rename()-Pfad
  // berührt aber weder Instanz-baseItemIds noch Buy-Back noch discoveredItems — für die
  // Meister-Items hier EXPLIZIT nachziehen (Kompat-GESETZ: Besitz, Rückkauf-Recht und
  // Entdeckung überleben das Update; ohne dies würde sanitize die Alt-IDs als „unbekannt"
  // strippen = stiller Verlust). Bewusst NUR für die Ring-Map, nicht generisch für alle
  // Alt-Renames — deren Migrations-Verhalten bleibt eingefroren (Fixture-Stabilität).
  // Un-gegated & idempotent: cape_master_*-IDs existieren im Content nicht mehr und können
  // in einem post-v69-State nie neu entstehen.
  {
    const ringRename = (id: unknown): ItemId | null =>
      typeof id === "string" ? ((RING_MASTER_RENAME[id] as ItemId | undefined) ?? null) : null;
    // (a) Instanz-baseItemIds (verzauberte/gesuffixte Meister-Capes) in Tasche/Gear-Vault/angelegt.
    for (const inst of inv.instances) {
      const nid = ringRename(inst?.baseItemId);
      if (inst && nid) inst.baseItemId = nid;
    }
    state.bankInstances = state.bankInstances ?? [];
    for (const inst of state.bankInstances) {
      const nid = ringRename(inst?.baseItemId);
      if (inst && nid) inst.baseItemId = nid;
    }
    for (const slot of EQUIP_SLOTS) {
      const inst = eqInst[slot];
      const nid = ringRename(inst?.baseItemId);
      if (inst && nid) inst.baseItemId = nid;
    }
    for (const rec of kitInstanceRecords) {
      for (const slot of EQUIP_SLOTS) {
        const inst = rec[slot];
        const nid = ringRename(inst?.baseItemId);
        if (inst && nid) inst.baseItemId = nid;
      }
    }
    // (b) Buy-Back-Regal: ein kurz vor dem Update verkauftes Meister-Cape bleibt zurückkaufbar
    // (kommt als Ring zurück; sanitize hätte den Alt-ID-Eintrag sonst verworfen).
    if (Array.isArray(state.buyBack)) {
      for (const raw of state.buyBack) {
        if (!raw || typeof raw !== "object") continue;
        const e = raw as Partial<BuyBackEntry>;
        const nid = ringRename(e.itemId);
        if (nid) e.itemId = nid;
        const iid = ringRename(e.instance?.baseItemId);
        if (e.instance && iid) e.instance.baseItemId = iid;
      }
    }
    // (c) discoveredItems-Keys: die Entdeckung ist MONOTON (items_discovered-Achievements lesen
    // sie) — der Fortschritt eines Spielers, der sein Cape längst verkauft hat, darf durch den
    // Rename nicht fallen. Nur strikt-true-Werte übertragen (Härtung macht sanitize).
    if (state.discoveredItems && typeof state.discoveredItems === "object" && !Array.isArray(state.discoveredItems)) {
      for (const [id, v] of Object.entries(state.discoveredItems)) {
        const nid = ringRename(id);
        if (nid) {
          delete state.discoveredItems[id];
          if (v === true) state.discoveredItems[nid] = true;
        }
      }
    }
    // (d) GETRAGENES Meister-Cape: steckt nach dem Rename als Ring im Cape-Slot → in den
    // Ring-Slot umziehen (ring1 frei? sonst ring2 — Spiegel der equipItem-Ausweichregel).
    // Sind beide Ring-Slots belegt: eine MODIFIZIERTE Instanz wandert mitsamt Affixen/Suffix
    // in den Gear-Vault (bankInstances), ein plain Stück via addItemOrBank ins Inventar
    // (Überlauf → Bank; zieht KEIN RNG); als letzte Rettung ein direkter Bank-Eintrag (der
    // Record hat strukturell immer Platz — Muster der sanitize-Slot-Rettung). Ohne diesen
    // Zweig würde sanitize das Stück zwar auch retten (slotAccepts-Rescue), aber stumpf in
    // die Bank statt an den Finger. Idempotent: post-v69 kann ein ring_master_* nie legal im
    // Cape-Slot stehen (equipItem routet Ringe nach ring1/ring2).
    const wornId = equip.cape;
    if (wornId && RING_MASTER_IDS.has(wornId)) {
      const wornInst = eqInst["cape"];
      const target = !equip.ring1 ? ("ring1" as const) : !equip.ring2 ? ("ring2" as const) : null;
      if (target) {
        equip[target] = wornId;
        if (wornInst) eqInst[target] = wornInst;
      } else if (wornInst && wornInst.baseItemId === wornId && ((wornInst.affixes?.length ?? 0) > 0 || wornInst.suffix)) {
        state.bankInstances.push(wornInst);
      } else {
        const { toInventory, toBank } = addItemOrBank(state, content, wornId, 1);
        if (toInventory + toBank <= 0) {
          state.bank[wornId] = finiteNonNeg(state.bank[wornId], 0) + 1;
        }
      }
      equip.cape = null;
      delete eqInst["cape"];
    }
  }

  // ── Stack-Konsolidierung (SAVE_VERSION 68→69, Chef-Entscheid 2026-07-18: MAX_STACK 999 →
  // 9999, „jedes Item braucht maximal 1 Stapel") ──────────────────────────────────────────────
  // Alt-Saves tragen mehrere Teil-Stapel desselben Items (mehrere 999er, weil der alte Cap
  // Überlauf in weitere Slots schob). Hier werden gleiche PLAIN-Stapel (ohne Instanz — Instanz-
  // Slots sind Unikate und seit v53 ohnehin in der Tasche) zusammengelegt: der ERSTE Stapel
  // behält seine Slot-Position und schluckt bis MAX_STACK, Folge-Stapel behalten nur einen
  // etwaigen Rest (> MAX_STACK Gesamtmenge), frei werdende Slots werden geleert. Die BANK ist
  // ein Record<ItemId, qty> ohne Stapel-Semantik → dort gibt es nichts zu konsolidieren.
  // Un-gegated & idempotent: das Ergebnis ist ein Fixpunkt (Re-Merge reproduziert exakt
  // dieselbe Verteilung — Round-Trip-stabil); nicht-endliche qty härtet sanitize danach.
  {
    const firstStackIdx = new Map<ItemId, number>();
    for (let i = 0; i < inv.slots.length; i++) {
      const s = inv.slots[i];
      if (!s || s.instance) continue;
      // Korruption (NaN/∞/negativ/0) NICHT anfassen — sanitize entfernt/klemmt solche Stacks
      // danach; ein Merge IN einen Negativ-Stack würde Menge verschlucken (Guard-Test unten).
      if (typeof s.qty !== "number" || !Number.isFinite(s.qty) || s.qty <= 0) continue;
      const firstIdx = firstStackIdx.get(s.itemId);
      if (firstIdx === undefined) {
        firstStackIdx.set(s.itemId, i);
        continue;
      }
      const first = inv.slots[firstIdx]!;
      const room = MAX_STACK - first.qty;
      if (room > 0) {
        const move = Math.min(room, s.qty);
        first.qty += move;
        s.qty -= move;
      }
      if (s.qty <= 0) {
        inv.slots[i] = null;
      } else {
        // Rest-Stapel (Gesamtmenge > MAX_STACK): wird selbst zum neuen „ersten" Auffüll-Ziel,
        // damit ALLE weiteren Teil-Stapel dieses Items ebenfalls zusammenlaufen.
        firstStackIdx.set(s.itemId, i);
      }
    }
  }

  // Mengen-Craft-Ziel (SAVE_VERSION 39→40): neuer Ziel-Zähler `actionTarget` für die aktive Aktion
  // (1/5/10/Alle). Alt-Saves (< 40) haben es nicht → auf null (unbegrenzt = bisheriges Endlos-Verhalten)
  // defaulten. Die Wert-/Invarianten-Härtung (positive Ganzzahl bzw. null ohne aktive Aktion) macht
  // sanitizeState. Idempotent.
  if (state.actionTarget === undefined) state.actionTarget = null;

  // Action-Queue (SAVE_VERSION 69→70): neues Feld `actionQueue` (vorgeplante Folge-Aktivitäten).
  // Alt-Saves (< 70) haben es nicht → auf [] defaulten (leer = bisheriges Verhalten: nach der
  // aktiven Aktion läuft nichts nach). Die Eintrags-/Referenz-Härtung (nur bekannte actionIds,
  // target null oder positiv-endlich) macht sanitizeState. Idempotent (überschreibt nur ein
  // fehlendes Feld). Muster wie actionTarget oben.
  if (state.actionQueue === undefined) state.actionQueue = [];

  // Kampf-Queue (SAVE_VERSION 72→73, Task #312): (a) Queue-Einträge tragen jetzt den Sorten-
  // Diskriminator `kind` — ALLE Alt-Einträge (< 73) sind reine Skilling-Aktionen → `kind:"action"`
  // stempeln (verlustfrei, kein Eintrag fällt weg). (b) Neue Felder default-initialisieren:
  // `queueFight` (Laufzeit des aktiven Queue-Kampfs) → null, `queuePaused` (Tod-/Patt-Pause) →
  // false, `lastQueueSkip` (Skip-Breadcrumb für die UI) → null. Idempotent (stempelt nur fehlende
  // kinds, defaultet nur fehlende Felder); Struktur-/Wert-/Invarianten-Härtung macht sanitizeState.
  if (Array.isArray(state.actionQueue)) {
    for (const entry of state.actionQueue as unknown[]) {
      if (entry && typeof entry === "object" && (entry as { kind?: unknown }).kind === undefined) {
        (entry as { kind: string }).kind = "action";
      }
    }
  }
  if (state.queueFight === undefined) state.queueFight = null;
  if (typeof state.queuePaused !== "boolean") state.queuePaused = false;
  if (state.lastQueueSkip === undefined) state.lastQueueSkip = null;

  // Dungeon-Queue (SAVE_VERSION 82→83, Chef-Auftrag 26.08.2026 „Dungeons queuebar"): EIN neues
  // Feld `queueDungeon` (Laufzeit des aktiven Queue-Dungeon-Laufs) → null (kein Lauf — gab es
  // vorher gar nicht; explizit null statt fehlend, damit der Vault-Guard byte-genau vergleichen
  // kann, Muster queueFight/v73). Alt-Einträge der Queue bleiben unverändert (die neue Sorte
  // "dungeon" kann in Alt-Saves nicht vorkommen). Idempotent; Struktur-/Invarianten-Härtung
  // (bekannter Dungeon, queueDungeon⇔combat) macht sanitizeState.
  if (state.queueDungeon === undefined) state.queueDungeon = null;

  // Postfach/Mailbox (SAVE_VERSION 70→71): neue Felder `mailbox` (Überlauf-Puffer) + `mailSeq`
  // (deterministischer Mail-ID-Zähler). Alt-Saves (< 71) haben sie nicht → auf [] bzw. 0 defaulten
  // (leeres Postfach = bisheriges Verhalten). Die Inhalts-/Wert-Härtung (nur bekannte itemIds,
  // positive qty, gültige Instanzen, Nicht-Array → []; mailSeq endlich ≥ 0 und > max createdSeq)
  // macht sanitizeState. Muster wie actionQueue/nextInstanceSeq. Idempotent.
  if (state.mailbox === undefined) state.mailbox = [];
  if (typeof state.mailSeq !== "number") state.mailSeq = 0;

  // Ausbaubare Bank-Slots (SAVE_VERSION 40→41): neues Feld `bankSlotsPurchased` (gekaufte Zusatz-Slots
  // als Gold-Sink; effektive Kapazität = BASE_BANK_CAPACITY + dies). Alt-Saves (< 41) haben es nicht →
  // auf 0 defaulten (kein Datenverlust: bestehende Bank-Einträge bleiben). Die Wert-Härtung (endlich,
  // ≥ 0, ≤ MAX_BANK_SLOTS_PURCHASED, ganzzahlig) macht sanitizeState. Idempotent.
  if (typeof state.bankSlotsPurchased !== "number") state.bankSlotsPurchased = 0;
  // GRANDFATHER (P1-Regression, Tester-Fund): Vor SAVE_VERSION 41 war die Bank-Basis fix 100
  // (das alte `BANK_CAPACITY`); mit 41 sank sie still auf BASE_BANK_CAPACITY=60 (+ per Gold ausbaubar).
  // Ein Alt-Save (< 41) mit 61–100 distinkten Bank-Arten würde sonst mit effektiver Kapazität 60 laden
  // → isBankFull → der Veteran könnte rückwirkend KEINE neuen Arten mehr einlagern (Daten bleiben zwar
  // verlustfrei, aber eine nachträgliche Sperre/Paywall). Darum die alte effektive Kapazität 100
  // erhalten: bankSlotsPurchased auf ≥ (100 − BASE) anheben (60 + 40 = 100). NUR bei Migration von < 41;
  // frische v41-createGame-States bleiben 0 (= 60 Basis, wie für neue Spieler gewollt). Idempotent über
  // die Versions-Schranke (≥ 41 unberührt); die Cap-Härtung (≤ MAX_BANK_SLOTS_PURCHASED) macht sanitizeState.
  const LEGACY_BANK_CAPACITY = 100; // fixe Bank-Größe vor SAVE_VERSION 41
  if ((state.version ?? 0) < 41) {
    state.bankSlotsPurchased = Math.max(
      state.bankSlotsPurchased,
      LEGACY_BANK_CAPACITY - BASE_BANK_CAPACITY,
    );
  }

  // Aktive Spielzeit (SAVE_VERSION 43→44): neues Feld `activePlayMs` (Spielzeit OHNE Offline-Catch-up).
  // Alt-Saves (< 44) haben es nicht → best effort auf `elapsedMs` setzen (bisher zählte die angezeigte
  // Spielzeit die Offline-Zeit mit, mehr Info ist rückwirkend nicht rekonstruierbar). Für Saves mit
  // ungültigem `elapsedMs` greift der finiteNonNeg-Fallback (0). Idempotent: bereits gesetzte Werte
  // (≥ 44) bleiben unberührt. Die Wert-Härtung (endlich, ≥ 0) macht sanitizeState.
  if (typeof state.activePlayMs !== "number") {
    state.activePlayMs = typeof state.elapsedMs === "number" ? state.elapsedMs : 0;
  }

  // Onboarding-Guide (SAVE_VERSION 44→45): neues Feld `onboarding`. Alt-Saves (< 45) haben es nicht
  // → auf den „erledigt"-Zustand setzen ({ active:false, step:0, done:true }), damit bestehende
  // Spieler NICHT erneut ins Tutorial gezwungen werden. Frische Saves setzt createGame auf den aktiven
  // Startzustand. Die Wert-Härtung (booleans, step als ganze Zahl ≥ 0) macht sanitizeState. Idempotent.
  if (!state.onboarding || typeof state.onboarding !== "object") {
    state.onboarding = legacyOnboarding();
  }

  // Bereichs-Touren (SAVE_VERSION 61→62): neues Feld `onboarding.toursSeen`. Alt-Saves (< 62)
  // haben es nicht → leer (Bereichs-Touren erscheinen einmalig beim ersten Betreten, kurz +
  // überspringbar — bewusst AUCH für Bestands-Spieler, die Touren existierten ja nie).
  // Wert-Härtung (strikte true-Map) macht sanitizeState. Idempotent.
  if (!state.onboarding.toursSeen || typeof state.onboarding.toursSeen !== "object") {
    state.onboarding.toursSeen = {};
  }

  // Stat-Squish ÷10 (SAVE_VERSION 45→46, design/stat-squish-spec.md, S=10): die gesamte HP-/
  // Schadens-Skala (Content-Katalog + computeStats-Koeffizienten) wurde ÷10 skaliert. Persistierte
  // ABSOLUTE HP-Beträge müssen mitziehen, sonst lädt ein Alt-Save mit hp≈3600 gegen neues
  // maxHp≈360 (bzw. kämpft einen Gegner mit 10×-Rest-HP weiter):
  //  - `character.hp` ×0.1 (round, min 1 — ein lebender Held bleibt lebendig; der Clamp auf das
  //    neue maxHp passiert unten in sanitizeState gegen computeStats);
  //  - `combat.enemyHp` ×0.1 (laufender Kampf; round, min 1);
  //  - laufende DoT-Magnituden (burn/poison/bleed = Schaden/Sek) in player-/enemyEffects ×0.1;
  //    shock-Magnitude ist eine CHANCE (0..1), frost ein reiner Slow-Timer → beide unangetastet;
  //  - `combat.petAbility.shieldHp` ×0.1 (HP-Betrag eines laufenden Pet-Schilds).
  // `character.mana` bleibt unangetastet (Mana-Teilsystem unskaliert, Spec §3.4). Buffs/Instanzen
  // referenzieren nur IDs — ihre Werte kommen live aus dem gesquishten Content → nichts zu tun.
  // Idempotent über die Versions-Schranke (≥ 46 unberührt).
  if ((state.version ?? 0) < 46) {
    const squish = (v: unknown): number | null =>
      typeof v === "number" && Number.isFinite(v) && v > 0 ? v * 0.1 : null;
    const hp = squish(state.character.hp);
    if (hp !== null) state.character.hp = Math.max(1, Math.round(hp));
    const enemyHp = squish(state.combat.enemyHp);
    if (enemyHp !== null) state.combat.enemyHp = Math.max(1, Math.round(enemyHp));
    const isDot = (type: unknown): boolean =>
      type === "burn" || type === "poison" || type === "bleed";
    for (const effects of [state.combat.playerEffects, state.combat.enemyEffects]) {
      for (const e of effects) {
        if (e && isDot(e.type)) {
          const mag = squish(e.magnitude);
          if (mag !== null) e.magnitude = Math.round(mag * 10) / 10;
        }
      }
    }
    const pa = state.combat.petAbility;
    if (pa && typeof pa === "object") {
      const shield = squish(pa.shieldHp);
      if (shield !== null) pa.shieldHp = Math.max(1, Math.round(shield));
    }
  }

  // Attribut-Input-Squish a=1/2 (SAVE_VERSION 46→47, stat-squish-spec §6.2, output-neutral):
  // ALLE Attribut-Quellen wurden ×0.5 skaliert (Basis 5→2.5, Gear-`modifiers` und
  // Suffix-`attrPerIlvl` im Content halbiert, Skill-Beitrag ×0.5) und alle Attribut-Koeffizienten
  // der Konsumenten ×2 → jeder abgeleitete Wert bleibt BIT-identisch. Persistiert ist von den
  // Quellen NUR `character.baseAttributes` → hier ×0.5 (historisches Literal — die damalige
  // Konstante ATTRIBUTE_INPUT_SQUISH ist mit v48 entfallen). `hp`/`mana` bleiben
  // unberührt (maxHp/maxMana ändern sich nicht); Item-Instanzen referenzieren nur Def-IDs — ihre
  // Attribut-Magnituden entstehen live aus dem halbierten Content. Nicht-endliche Werte überspringt
  // der Guard (sanitizeState setzt sie unten ohnehin auf 0). Idempotent über die Versions-Schranke.
  if ((state.version ?? 0) < 47) {
    for (const id of ATTRIBUTE_IDS) {
      const v = state.character.baseAttributes[id];
      if (typeof v === "number" && Number.isFinite(v)) {
        state.character.baseAttributes[id] = v * 0.5;
      }
    }
  }

  // Itemization 2.0 §1 — Revert auf GANZZAHLIGE Attribute (SAVE_VERSION 47→48,
  // design/itemization-2-spec.md §1.4): Basis 2.5→3; der Skill-Beitrag (floor(lvl/8) ganze
  // Punkte statt floor(lvl/4)·0.5) ist NICHT persistiert und zieht automatisch mit. Persistiert
  // ist nur `character.baseAttributes` (Basis 2.5 + ggf. Creation-Seed im 0.5-Raster):
  //   neu = 3 + max(0, round(alt − 2.5))
  // Live-Spieler ohne Seed (exakt 2.5) landen auf 3; Seed-Reste runden half-up auf ganze Punkte.
  // hp > neuem maxHp fängt der sanitize-Clamp am Ende (computeStats-basiert). Nicht-endliche
  // Werte überspringt der Guard. Idempotent über die Versions-Schranke (≥ 48 unberührt).
  if ((state.version ?? 0) < 48) {
    for (const id of ATTRIBUTE_IDS) {
      const v = state.character.baseAttributes[id];
      if (typeof v === "number" && Number.isFinite(v)) {
        state.character.baseAttributes[id] = 3 + Math.max(0, Math.round(v - 2.5));
      }
    }
  }

  // Rüstungs-Trinität / Itemization 2.5 (SAVE_VERSION 49→50): neues Feld `character.ward` (Ward-
  // Absorptionspool des Stoff-Stils, analog hp/mana). Alt-Saves (< 50) haben es nicht → auf 0
  // defaulten (Spec §2.4). sanitizeState klemmt es unten auf [0, maxWard]; beim ersten Kampfstart
  // füllt combat-dev (A2) es auf maxWard. Die vier neuen ItemDef-Klassen-Schicht-Felder
  // (armorRating/blockChance/evasionRating/wardCapacity) + MonsterDef.defenseType leben nur in der
  // ContentDB (nicht im Save) → kein weiterer Migrationszweig nötig (analog v32). Idempotent.
  if (typeof state.character.ward !== "number") state.character.ward = 0;

  // Skill-Rename/-Merge (Key-basiert, läuft für jede Save-Ära — rein am Vorhandensein hängend):
  //  • SAVE_VERSION 50→51 (Armor-Iteration 2 §9.1): `magic_off`→`magic`, `magic_def`→`warding`.
  //  • SAVE_VERSION 56→57 (#286 Ammo-Removal): `fletching`→`leatherworking` — der Fletching-Skill
  //    stirbt mit dem Munitions-System; seine XP wird VERLUSTFREI in die im Spiel als
  //    „Crafting"/„Handwerk" angezeigte Fertigkeit (interne Id `leatherworking`) gemergt.
  //    String-basiert und content-unabhängig; solange Stage B die fletch_*-Aktionen noch nicht
  //    umgezogen hat, faltet jeder Load evtl. frisch angefallene fletching-XP erneut hinein
  //    (konvergent, nichts geht verloren).
  // Die XP-KEYS in `state.skills` werden umbenannt (XP/Level ERHALTEN, nur der Key ändert sich);
  // bei Kollision mit einem bereits vorhandenen Ziel-Key werden die XP SUMMIERT. Idempotent.
  if (state.skills && typeof state.skills === "object") {
    const SKILL_RENAME: Record<string, string> = {
      magic_off: "magic",
      magic_def: "warding",
      fletching: "leatherworking",
    };
    for (const [oldId, newId] of Object.entries(SKILL_RENAME)) {
      const old = state.skills[oldId];
      if (!old) continue;
      const existing = state.skills[newId];
      state.skills[newId] = { xp: (existing?.xp ?? 0) + (old.xp ?? 0) };
      delete state.skills[oldId];
    }
  }

  // Generischer AKTIONS-Rename-Pfad (analog RENAME für Item-IDs, NEU mit v57): benennt die
  // Mastery-XP-Keys (`state.mastery`, Keys = Action-IDs) und eine evtl. laufende `activeActionId`
  // um; Mastery-XP wird bei Kollision SUMMIERT. Die Mastery-Einträge der fletch_*-Aktionen bleiben
  // in v57 BEWUSST unangetastet (die Aktionen leben bis Stage B im Content weiter) — Stage B trägt
  // hier das Mapping alte-fletch-Action → neue Crafting-Action ein, dann ziehen die Mastery-Keys
  // verlustfrei mit. Idempotent (Map aktuell leer = no-op).
  const ACTION_RENAME: Record<string, string> = {};
  if (state.mastery && typeof state.mastery === "object") {
    for (const [oldId, newId] of Object.entries(ACTION_RENAME)) {
      const old = state.mastery[oldId];
      if (!old) continue;
      const existing = state.mastery[newId];
      state.mastery[newId] = { xp: (existing?.xp ?? 0) + (old.xp ?? 0) };
      delete state.mastery[oldId];
    }
  }
  if (state.activeActionId && ACTION_RENAME[state.activeActionId]) {
    state.activeActionId = ACTION_RENAME[state.activeActionId] as typeof state.activeActionId;
  }

  // Buy-Back-Liste (SAVE_VERSION 53→54, Task #245): neues Feld `buyBack` (zuletzt verkaufte Items/
  // Instanzen, zum Verkaufspreis zurückkaufbar). Alt-Saves (< 54) haben es nicht → leer defaulten
  // (der Puffer ist rückwirkend nicht rekonstruierbar). Die Eintrags-/Referenz-Härtung + das Kappen
  // auf BUYBACK_MAX_ENTRIES macht sanitizeState. Idempotent (überschreibt nur ein fehlendes Feld).
  if (!Array.isArray(state.buyBack)) state.buyBack = [];

  // Auto-Eat-Schwellen-Slider (SAVE_VERSION 54→55, Chef-Feature 2026-07-06, analog Auto-Trank-Slider):
  // neues OPTIONALES Feld `character.autoEatThreshold` (Override der Ess-Schwelle, NUR auf der Max-
  // Auto-Eat-Stufe wirksam). Alt-Saves (< 55) defaulten auf AUTO_EAT_DEFAULT_THRESHOLD (damals 0.8 =
  // Max-Tier-Verhalten → verhaltensneutral; seit Balance-Kette Schritt 4 ist die Konstante 0.7, sehr
  // alte Saves bekommen also den jeweils AKTUELLEN Default). Neue Saves (≥ 55) lassen das Feld bewusst
  // ungesetzt (= „kein Override"), bis der Spieler den Slider bewegt. Die Clamp-Härtung auf
  // [AUTO_EAT_MIN_THRESHOLD, AUTO_EAT_MAX_THRESHOLD] macht sanitizeState. Idempotent.
  if ((state.version ?? 0) < 55 && typeof state.character.autoEatThreshold !== "number") {
    state.character.autoEatThreshold = AUTO_EAT_DEFAULT_THRESHOLD;
  }

  // Dreifach-Umbau (SAVE_VERSION 55→56, Task #271, Chef-Entscheidungen 2026-07-08):
  //  (a) Pouch-/Taschenslot-System entfernt — `inv.bagSlots = []` läuft oben im Inventar-Block
  //      (VOR dem Rename-Pass); Überhang-Items bleiben via sanitizeState-Trim-Regel erhalten.
  //  (b) Auto-Salvage entfernt: das Flag wird aus Alt-Saves GELÖSCHT (Feld ist nur noch
  //      deprecated-optional für die UI-Übergangszeit; die Engine liest es nirgends mehr).
  //      Der Gear-Vault (`bankInstances`) bleibt als bewusstes Bank-Feature bestehen
  //      (depositInstance/withdrawInstance) — keine Daten-Migration nötig.
  //  (c) Quest-Tokens: neues Feld `character.questTokens` (analog gold). Alt-Saves → 0
  //      (rückwirkend nicht rekonstruierbar). Wert-Härtung (endlich, ≥ 0) macht sanitizeState.
  // Idempotent: delete auf fehlendem Feld ist no-op, questTokens wird nur bei Nicht-Zahl gesetzt.
  delete (state.settings as { autoSalvage?: boolean }).autoSalvage;
  if (typeof state.character.questTokens !== "number") state.character.questTokens = 0;

  // Meisterweihe (SAVE_VERSION 58→59, design/master-capes-konzept.md): drei neue Set-Semantik-
  // Records defaulten (Muster discoveredItems). Alt-Saves (< 59) mit BESTEHENDEN 99er-Skills
  // bekommen den Weihe-Marker RÜCKWIRKEND (fair — die Leistung ist erbracht, Konzept-Notiz §4);
  // `capeCeremonySeen` bleibt dabei BEWUSST leer: die Zeremonien werden beim ersten Login
  // nachgefeiert (die UI staffelt sie über pendingCapeCeremonies — nie 12 Popups auf einmal).
  // Die VERLEIHUNG läuft NICHT hier, sondern über den Nachreich-Pfad grantPendingCapes in
  // sanitizeState („Weihe vermerkt && Ring-Item existiert im Content && nie verliehen") — so
  // bekommen Alt-99er ihren Meisterring (`ring_master_<skillId>`, seit v69 Ring statt Cape)
  // automatisch. Idempotent (Marker monoton, Rückwirkung über die Versions-Schranke gegated); die
  // Wert-/Referenz-Härtung (unbekannte Skill-IDs, strikte true-Semantik, Teilmengen-Invarianten)
  // macht sanitizeState.
  if (!state.masteryCapes || typeof state.masteryCapes !== "object" || Array.isArray(state.masteryCapes)) {
    state.masteryCapes = {};
  }
  if (!state.capeGranted || typeof state.capeGranted !== "object" || Array.isArray(state.capeGranted)) {
    state.capeGranted = {};
  }
  if (!state.capeCeremonySeen || typeof state.capeCeremonySeen !== "object" || Array.isArray(state.capeCeremonySeen)) {
    state.capeCeremonySeen = {};
  }
  if ((state.version ?? 0) < 59) {
    for (const skillId of Object.keys(content.skills)) {
      const xp = state.skills[skillId]?.xp;
      if (typeof xp === "number" && Number.isFinite(xp) && levelFromXp(xp) >= MASTER_CAPE_LEVEL) {
        state.masteryCapes[skillId] = true;
      }
    }
  }

  // Quest-basierter Dungeon-Unlock (SAVE_VERSION 63→64, ceo-run-2026-07-13 Welle J — Chef-
  // Direktive „Keine Dungeon keys mehr, sondern quest based unlock"): Alt-Schlüssel im Besitz
  // (Inventar-plain-Stacks + Bank; EINGEFRORENE Zuordnung LEGACY_V63_KEY_TO_DUNGEONS oben,
  // OHNE paragon_key — der Turm bleibt eigenes System) tragen ihren Dungeon als Bestandsschutz
  // in `dungeonsUnlocked` ein, die Bestände werden ENTFERNT und VOLL erstattet
  // (qty × item.value — bewusst OHNE den alten „1 Stück geht im Unlock auf"-Abzug und OHNE
  // SELL_FRACTION: das Zutrittsrecht kommt jetzt von der Quest/dem Bestandsschutz, der Schlüssel
  // ist nur noch Geld; Kompat-GESETZ: kein stiller Verlust). KEIN UI-Breadcrumb — der
  // Systemwechsel migriert still (kein „Dungeon entsperrt!"-Toast für einen Schlüssel, den es
  // nicht mehr gibt). Für v60–63-Saves ist das praktisch ein No-op (Schlüssel existierten dort
  // nie im Besitz — Intercept + Alt-Sweep); ihre bestehenden `dungeonsUnlocked`-Einträge bleiben
  // ohnehin. Läuft NACH den Inventar-Shape-Migrationen (v24/v53/v56 oben) und VOR sanitize
  // (dessen Unknown-Id-Strip die eingefrorenen, real existierenden Dungeon-Ids nicht berührt);
  // die Gold-Härtung übernimmt sanitize. Idempotent über die Versions-Schranke.
  if ((state.version ?? 0) < 64) {
    for (const [keyId, dungeonIds] of LEGACY_V63_KEY_TO_DUNGEONS) {
      let count = 0;
      if (Array.isArray(state.inventory?.slots)) {
        for (let i = 0; i < state.inventory.slots.length; i++) {
          const slot = state.inventory.slots[i];
          if (slot && slot.itemId === keyId && !slot.instance) {
            count += Math.max(0, Math.floor(finiteNonNeg(slot.qty, 0)));
            state.inventory.slots[i] = null;
          }
        }
      }
      if (state.bank && typeof state.bank === "object" && !Array.isArray(state.bank) && keyId in state.bank) {
        count += Math.max(0, Math.floor(finiteNonNeg(state.bank[keyId], 0)));
        delete state.bank[keyId];
      }
      if (count <= 0) continue;
      (state.discoveredItems ??= {})[keyId] = true; // Besitz war echt — Entdeckung bleibt
      for (const id of dungeonIds) state.dungeonsUnlocked[id] = true;
      const unitValue = Math.max(0, Math.floor(finiteNonNeg(content.items[keyId]?.value, 0)));
      if (unitValue > 0 && Number.isFinite(state.character.gold)) {
        state.character.gold += unitValue * count;
      }
    }
  }

  // Elite-/World-Spawns (SAVE_VERSION 71→72, design/elite-spawns-concept.md + elite-balance-spec.md
  // §3): neue Felder `eliteRng`/`eliteZones`/`eliteSpawnSeq`/`lastEliteSpawn`. Alt-Saves (< 72) haben
  // `eliteRng` nicht → deterministisch aus dem bereits geladenen `state.rng.state` ableiten
  // (`deriveEliteRngSeed`, engine/elites.ts) — LIEST nur eine vorhandene Zahl, konsumiert `state.rng`
  // NICHT (Determinismus-/offline==online-Gesetz: die Migration darf die Grind-Sequenz nie
  // verschieben). `eliteZones` wird im selben Zug über den NORMALEN, staffelnden Band-Roll befüllt
  // (`initEliteZonesStaggered` — JEDE Zone würfelt in ihrem EIGENEN Cooldown-Band, Chef-Nachtrag
  // 2026-07-22: „bei der Migration von Alt-Saves normal staffeln, Bestandsspieler brauchen keinen
  // Früh-Haken" — der Früh-Haken `initEliteZonesEarlyHook` ist NUR `createGame` vorbehalten); die
  // Funktion nutzt/mutiert DENSELBEN frisch abgeleiteten eliteRng-Strom, damit zwei Migrationen mit
  // identischem Ausgangs-Seed identische Ergebnisse liefern (kein Sonderfall). `eliteSpawnSeq`/
  // `lastEliteSpawn` starten bei 0/null (Muster petDropSeq — rückwirkend gibt es nichts
  // nachzuholen). Idempotent: nur ein fehlendes `eliteRng`-Feld löst die Ableitung aus (post-72-
  // Saves haben es bereits); Wert-/Shape-Härtung (eliteRng-Finiteness, eliteZones-Shape, Breadcrumb/
  // Seq-Monotonie) macht sanitizeState.
  if (state.eliteRng === undefined) {
    const seedSource =
      typeof state.rng?.state === "number" && Number.isFinite(state.rng.state) ? state.rng.state : 1;
    const eliteRng = createRng(deriveEliteRngSeed(seedSource));
    state.eliteRng = eliteRng;
    state.eliteZones = initEliteZonesStaggered(content, eliteRng);
    state.eliteSpawnSeq = 0;
    state.lastEliteSpawn = null;
  }

  // Früh-Garantie-Suffix (SAVE_VERSION 72, selber Bump — Chef-GO 2026-07-22 „Identitäts-Paket"):
  // neues Feld `firstSuffixGranted`. Alt-Saves (< 72, Feld fehlt) → `true` (KEINE nachträgliche
  // Garantie für Bestandsspieler — sie haben Suffixe längst gesehen oder gespielt, ohne sie zu
  // brauchen). `createGame` setzt frische Saves explizit auf `false`. Idempotent (Muster autoBank/
  // autoParagonAscend: `typeof !== "boolean"` deckt sowohl das komplett fehlende Feld EINES Alt-
  // Saves als auch einen nicht-booleschen Save-Edit ab — beide fallen hier wie dort KONSERVATIV auf
  // `true`, kein Wiederhol-Exploit über korrupte/edited Saves). sanitizeState härtet dieselbe
  // Invariante zusätzlich bei JEDEM Load (Defense-in-Depth, Muster apCeremonyPending).
  if (typeof state.firstSuffixGranted !== "boolean") state.firstSuffixGranted = true;

  // Champion-Codex (SAVE_VERSION 72, selber Bump, „Jagd-Paket" S2/M): neues Feld `eliteCodex`.
  // Fehlt es (Alt-Save ODER ein v72-Zwischenstand vor diesem Nachtrag) → `{}` (rückwirkend nicht
  // rekonstruierbar — Phase 1 hatte ohnehin eine leere content.elites-Registry, ein Alt-Save kann
  // strukturell nie einen realen Elite-Kill verpasst haben). Idempotent (nur ein fehlendes Feld löst
  // den Default aus); Struktur-/Wert-Härtung macht sanitizeState.
  if (state.eliteCodex === undefined) state.eliteCodex = {};

  // Elite-Sieg-Breadcrumb (SAVE_VERSION 73→74, Task #324): neue Felder `eliteKillSeq`/
  // `lastEliteKill` für die kommende UI-Sieg-Zeremonie („Fanfare + Loot-Übersicht"). Alt-Saves
  // (< 74) starten bei 0/null (rückwirkend gibt es nichts nachzuholen — Muster eliteSpawnSeq/
  // lastEliteSpawn, v72). Idempotent (nur fehlende Felder lösen den Default aus); Shape-/Wert-
  // Härtung (Content-Abgleich der itemIds, Seq-Monotonie) macht sanitizeState.
  if (state.eliteKillSeq === undefined) state.eliteKillSeq = 0;
  if (state.lastEliteKill === undefined) state.lastEliteKill = null;

  // ── Ausrüstungs-Loadouts (v75-Vorlagen) → Ausrüstungs-KITS (SAVE_VERSION 85-Nachtrag, Chef-Entscheid
  // 28.08.2026 nach Spieler-Feedback „3 separate equipment kits, not unequip/equip modes, just swap") ──
  // Jeder Save OHNE `equipKits` (alle < 85 und frühe v85-Stände) bekommt drei Kits:
  //  • Kit 0 = die GETRAGENE Ausrüstung (Spiegel von `character`; Vorlage 0 wird VERWORFEN — Kit 0 ist,
  //    was man trägt; eine abweichende Vorlage 0 war nur ein Wunschbild, kein Besitz).
  //  • Kit N (1..2) aus Vorlage N: jede Position, deren Item (bzw. Instanz per instanceId) JETZT im
  //    INVENTAR liegt, wird dem Inventar ENTNOMMEN (1 Stück vom plain Stapel bzw. die Instanz aus der
  //    Tasche mitsamt Affixen/Suffix) und ins Kit gelegt. Fehlt das Teil (Bank/Gear-Vault/verkauft/
  //    gerade getragen), bleibt der Platz LEER — nichts wird dupliziert, nichts erfunden. Bank und
  //    Vault werden BEWUSST nicht angezapft (kein stiller Umzug des Lagers; der Spieler legt die Teile
  //    selbst ins Kit). Zwei Vorlagen mit demselben Stück: die erste bekommt es, die zweite bleibt leer.
  //  Läuft GANZ AM ENDE von migrateState (nach Rename-Pass, Instanz-Tasche v53, Stack-Konsolidierung),
  //  damit das Inventar in seiner finalen Form durchsucht wird. Slot-/Instanz-/Zweihand-Härtung je Kit
  //  macht sanitizeState; dort fliegt auch das Alt-Feld. RNG-frei. Idempotent: post-Kit-Saves tragen
  //  `equipKits` und laufen hier nicht mehr durch (ihre Vorlagen-Liste existiert nicht mehr).
  if (!Array.isArray(state.equipKits)) {
    state.equipKits = defaultEquipKits();
    state.activeKit = 0;
    for (let n = 1; n < EQUIP_KIT_COUNT; n++) {
      const lo = legacyLoadouts[n];
      if (!lo || typeof lo !== "object" || Array.isArray(lo)) continue;
      const rec = lo as Record<string, { itemId?: unknown; instanceId?: unknown } | null | undefined>;
      const kit = state.equipKits[n]!;
      for (const slot of EQUIP_SLOTS) {
        const entry = rec[slot];
        if (!entry || typeof entry !== "object" || typeof entry.itemId !== "string") continue;
        const itemId = entry.itemId as ItemId;
        const instanceId =
          typeof entry.instanceId === "string" && entry.instanceId.length > 0 ? entry.instanceId : null;
        if (instanceId) {
          const bag = inv.instances ?? [];
          const idx = bag.findIndex((i) => !!i && i.instanceId === instanceId && i.baseItemId === itemId);
          if (idx < 0) continue;
          const inst = bag[idx]!;
          bag.splice(idx, 1);
          kit.equipment[slot] = itemId;
          kit.equippedInstances[slot] = inst;
        } else {
          const idx = inv.slots.findIndex((s) => !!s && s.itemId === itemId && !s.instance && s.qty >= 1);
          if (idx < 0) continue;
          const s = inv.slots[idx]!;
          s.qty -= 1;
          if (s.qty <= 0) inv.slots[idx] = null;
          kit.equipment[slot] = itemId;
        }
      }
    }
    // Kit-0-Spiegel sofort schreiben (sanitizeState zieht ihn am Ende erneut aus dem gehärteten Charakter).
    syncActiveKit(state);
  }
  delete (state as { equipLoadouts?: unknown }).equipLoadouts;

  // ── Werkzeuge verlassen die Kits (SAVE_VERSION 87, Chef-Entscheid 31.08.2026) ──────────────────
  // Spieler-Vorschlag: „I don't think that we need 3 sets of the same tools, so it will be better to
  // not swap tool slots while swapping between equipment kits." Seit v85 besaß jedes Kit seine
  // eigenen Werkzeuge — wer nach dem Kit-Wechsel weiter abbauen wollte, musste dieselbe Spitzhacke
  // dreimal besitzen. Ab jetzt hängen Werkzeuge am CHARAKTER (KIT_SLOTS in shared, snapshotKit in
  // engine/loadouts.ts) und bleiben beim Wechsel einfach liegen.
  //
  // Diese Migration holt heraus, was in einem INAKTIVEN Kit steckengeblieben ist. Reihenfolge, vom
  // Nützlichsten zum Sichersten:
  //   1. In einen FREIEN Werkzeug-Slot des Charakters — der Normalfall. Wer drei Kits mit je
  //      Spitzhacke/Axt/Angel hatte, trägt sie danach schlicht alle vier gleichzeitig, und der neue
  //      vierte Slot nimmt genau das auf, was vorher nicht passte.
  //   2. Sonst über den Grant-Pfad (Inventar → Bank → Post) — verlustfrei, wie bei jeder anderen
  //      Rückgabe. Verzauberte Werkzeuge reisen als Instanz mit Affixen und Suffix.
  // Es geht NICHTS verloren (Save-Kompat-Gesetz). Bewusst UNGEGATET statt an `< 87` gehängt: der
  // Lauf ist von Natur aus idempotent (danach trägt kein Kit mehr ein Werkzeug) und heilt so auch
  // Dev-Saves, die in der Umbauphase entstanden sind. Das aktive Kit wird ausgelassen — sein
  // Spiegel wird ohnehin am Ende von sanitizeState frisch aus dem Charakter geschrieben.
  // RNG-frei.
  if (Array.isArray(state.equipKits)) {
    const equip = state.character.equipment;
    const eqInstances = state.character.equippedInstances;
    const freierWerkzeugSlot = (): EquipSlot | null =>
      TOOL_SLOTS.find((slot) => !equip[slot]) ?? null;

    for (let i = 0; i < state.equipKits.length; i++) {
      if (i === state.activeKit) continue;
      const kit = state.equipKits[i];
      if (!kit || typeof kit !== "object") continue;
      const kitEq = kit.equipment as Record<string, ItemId | null> | undefined;
      const kitInst = kit.equippedInstances as Record<string, ItemInstance | undefined> | undefined;
      if (!kitEq || typeof kitEq !== "object") continue;

      for (const slot of TOOL_SLOTS) {
        const id = kitEq[slot];
        if (typeof id !== "string" || !id) continue;
        const inst = kitInst?.[slot];
        const ziel = freierWerkzeugSlot();
        if (ziel) {
          equip[ziel] = id;
          if (inst) eqInstances[ziel] = inst;
        } else if (inst) {
          grantLootInstance(state, content, inst);
        } else {
          grantLoot(state, content, id, 1);
        }
        kitEq[slot] = null;
        if (kitInst) delete kitInst[slot];
      }
    }
  }

  // ── Skill-Split „Schneidern" (SAVE_VERSION 85 → 86, Chef-Entscheid 28.08.2026) ──────────────────
  // Der Skill `leatherworking` (Handwerk) gibt alles aus Stoff an den neuen Skill `tailoring` ab. Die
  // XP werden NACH TATSÄCHLICH HERGESTELLTEM geteilt (s. tailoringXpFromCraftLog): `tailoring.xp =
  // min(Σ craftedById × xp, leatherworking.xp)`, `leatherworking.xp −= tailoring.xp` — die Gesamt-XP
  // des Spielers bleibt exakt erhalten, Handwerk sinkt nie unter 0. Ohne Zähler (oder ohne Handwerk-
  // XP) entsteht `tailoring = { xp: 0 }` und Handwerk bleibt unverändert. Mastery hängt an Aktions-IDs
  // und wandert mit; Meisterweihe-Marker, Erfolge und angelegte Ringe bleiben stehen (Save-Kompat-
  // Gesetz: nichts geht verloren; `meetsRequirements` prüft nur beim Anlegen). Läuft NACH dem
  // Fletching-Merge (v57, oben) — die Handwerk-XP ist dann vollständig. Nur über die Versions-Schranke
  // (ein v86-Save wird nie ein zweites Mal geteilt). sanitizeState klemmt beide Konten wie jeden Skill.
  if ((state.version ?? 0) < 86) {
    if (!state.skills || typeof state.skills !== "object") state.skills = {};
    const lw = state.skills[LEATHERWORKING_SKILL_ID];
    const lwXp = lw ? finiteNonNeg(lw.xp, 0) : 0;
    const prior = finiteNonNeg(state.skills[TAILORING_SKILL_ID]?.xp, 0);
    const moved = Math.min(lwXp, tailoringXpFromCraftLog(state, content));
    state.skills[TAILORING_SKILL_ID] = { xp: prior + moved };
    if (lw) lw.xp = lwXp - moved;
  }

  // ── Prestige-Fundament (SAVE_VERSION 87 → 88, 1.3 Welle B1) ──────────────────────────────────────
  // claude:2026-10-17T23:30:00+02:00 — neues Feld `prestige`: jeder Alt-Save steht im ersten Durchgang
  // (count 0, keine Punkte, keine Historie). Rückwirkend gibt es nichts zu rekonstruieren. Die Härtung
  // für JEDE Version (auch alte Test-Saves, die schon „88" trugen) übernimmt sanitizeState.
  if ((state.version ?? 0) < 88) {
    state.prestige = defaultPrestigeState();
  }

  // ── Mahlzeit-Platz (SAVE_VERSION 88 → 89, 1.4.0 „Feder und Stahl“ Welle 1, Chef 23.10.2026) ──────
  // claude:2026-10-23T16:45:00+02:00 — neue Felder `character.meal` (Buff-Mahlzeit) und `mealKeep`
  // (Standard an). Chef-Entscheid BF-4: Liegt heute eine Mahlzeit (Buff der Kategorie "food") im
  // Essensplatz, wandert sie in den Mahlzeit-Platz, und der Heilplatz bekommt die beste reine Heilnahrung
  // aus Inventar, sonst Bank (oder bleibt leer). „Beste“ = höchste Heilung bei der aktuellen HP als
  // Max-HP-Näherung (Laden passiert außerhalb des Kampfes, dort regeneriert man auf voll).
  if ((state.version ?? 0) < 89) {
    const ch = state.character;
    if (ch.meal === undefined) ch.meal = null;
    if (ch.mealKeep === undefined) ch.mealKeep = true;
    const isMeal = (id: ItemId | null | undefined): boolean =>
      !!id && content.items[id]?.type === "consumable" && content.items[id]?.buff?.category === "food";
    if (isMeal(ch.food)) {
      ch.meal = ch.food;
      ch.food = bestPlainHealFood(state, content);
    }
  }

  // ── Materiallager (SAVE_VERSION 89 → 90, 1.4.0 „Feder und Stahl“ Welle 2 ML, Chef 23.10.2026) ──────────
  // claude:2026-10-23T22:00:00+02:00 — Materialien mit Regal stehen nicht mehr in der Bank-Ansicht, sondern im Lager (gleicher Bestand
  // `state.bank`, kein Bankplatz). Ihre alten Fächer in `bankOrder` werden EINMAL entfernt und die Lücken
  // geschlossen (Goal ML: „Migration verdichtet bankOrder“), damit die Bank nicht mit Löchern startet.
  // Danach gehört die Reihenfolge wieder dem Spieler. Kein Bestand ändert sich.
  if ((state.version ?? 0) < 90 && Array.isArray(state.bankOrder)) {
    const isStore = storagePredicate(content);
    state.bankOrder = state.bankOrder.filter((id): id is ItemId => typeof id === "string" && !isStore(id));
  }

  // ── Bognerei (SAVE_VERSION 90 → 91, 1.4.0 Welle 2 FK, Chef 23.10.2026) ──────────────────────────────────
  // claude:2026-10-24T19:00:00+02:00 — Neuer Skill `bowcraft` startet für alle bei 0 XP (Chef: „alle starten bei Level 1, Handwerk bleibt
  // unangetastet“, keine Umbuchung). Die Bogen-Aktionen wechseln nur den Skill, ihre Mastery hängt an der
  // Aktions-ID und bleibt. Die Altlast `fletching` faltet SKILL_RENAME weiter in Handwerk (oben) und berührt
  // `bowcraft` nicht. Ein fehlendes Skill-Konto liest die Engine als 0 XP (wie bei jedem frischen Spiel), daher
  // braucht es keinen Eintrag. `character.quiver` startet leer, `quiverAutoRefill` an (beides Sanitize).

  // ── Leben im Handwerk (SAVE_VERSION 91 → 92, 1.4.0 Welle 3 EV/AU, Chef 23.10.2026) ─────────────────────
  // claude:2026-10-24T23:55:00+02:00 — neuer Zufallsstrom `eventRng` (aus `state.rng.state` abgeleitet, LIEST nur, verbraucht nichts;
  // Muster eliteRng v72), leere Ereignis- und Auftragslisten. Die erste Ereignis-Chance kommt nach der normalen
  // Abklingzeit. Härtung für jede Version macht sanitizeState.
  if ((state.version ?? 0) < 92) {
    if (state.eventRng === undefined) {
      const seedSource = typeof state.rng?.state === "number" && Number.isFinite(state.rng.state) ? state.rng.state : 1;
      state.eventRng = createRng(deriveEventRngSeed(seedSource));
    }
    if (!state.skillEvents) state.skillEvents = defaultSkillEventState();
    if (!state.workOrders) state.workOrders = defaultWorkOrderState();
  }

  // ── Raid (SAVE_VERSION 92 → 93, 1.4.0 Welle 4, Chef 23.10.2026) ────────────────────────────────────────────
  // claude:2026-10-25T04:40:00+02:00 — neues Feld `raid` (leer: nichts freigeschaltet außer über Drazhan, keine Läufe). Die Härtung jeder
  // Version macht sanitizeState.
  if ((state.version ?? 0) < 93 && !state.raid) state.raid = defaultRaidState();

  // ── Beet-Ernte-Zähler (SAVE_VERSION 93 → 94, QA-Runde 2 Klarheit B1) ─────────────────────────────────────────────────
  // claude:2026-10-24T15:21:04+02:00 — neues Feld `stats.harvestedById`: alte Saves starten bei 0 (leer). `producedById` mischt Beet-Ernte und
  // Sammel-Funde derselben Item-ID und lässt sich nicht aufteilen; nichts wird rückwirkend geschätzt. Härtung macht sanitizeState.
  // Nur wenn das Feld fehlt: so bleibt der Block idempotent, auch wenn ein schon migrierter Stand erneut als Alt-Version geladen wird.
  if ((state.version ?? 0) < 94 && state.stats && typeof state.stats === "object" && !state.stats.harvestedById) state.stats.harvestedById = {};

  // ── Erzeugt je Skill (SAVE_VERSION 94 → 95, Chef-Entscheid QA-Runde 2 Werkstatt B2 „nur die passende Quelle zählt“) ──────────
  // claude:2026-10-24T16:03:31+02:00 — neues Feld `stats.producedBySkill`. Arbeitsaufträge messen ihren Fortschritt jetzt daran statt an `producedById`.
  // Damit kein offener Auftrag Fortschritt verliert, wird der Zähler für Skill und Item jedes offenen Auftrags mit dem bisherigen
  // `producedById`-Stand vorbelegt (sein `baseline` stammt aus genau diesem Zähler); ab jetzt zählen nur Aktionen des Skills. Alles
  // andere startet bei 0. Nur wenn das Feld fehlt (idempotent bei erneutem Laden als Alt-Version). Härtung: sanitizeState.
  if ((state.version ?? 0) < 95 && state.stats && typeof state.stats === "object" && !state.stats.producedBySkill) {
    const seeded: Partial<Record<string, Record<string, number>>> = {};
    const open = Array.isArray(state.workOrders?.open) ? state.workOrders!.open : [];
    for (const o of open) {
      if (!o || typeof o.skill !== "string" || typeof o.itemId !== "string") continue;
      const n = finiteNonNeg(state.stats.producedById?.[o.itemId], 0);
      if (n <= 0) continue;
      const rec = (seeded[o.skill] ??= {});
      rec[o.itemId] = Math.max(rec[o.itemId] ?? 0, n);
    }
    state.stats.producedBySkill = seeded;
  }

  // ── Slayer-Punkte (SAVE_VERSION 95 → 96, 1.4.1, Chef-Freigabe 25.10.2026) ──────────────────────────────────────────────
  // claude:2026-10-25T10:32:00+01:00 — neues Feld `slayerAutoTask` (Aufträge automatisch fortsetzen, Standard aus) und die EINMALIGE
  // Gutschrift für die Halbierung von Jägerkodex und Punkte-Unikaten (S2): je gekauftem Rang die Differenz alter minus neuer
  // Preis, je besessenem Exemplar der drei Unikate die Differenz (Käufe werden nicht protokolliert, also zählt der Besitz an
  // allen Orten, s. `slayerRefundV96`). Ganzzahlig, nie negativ. Idempotent: nur solange das neue Feld fehlt (ein schon auf
  // v96 gehobener Stand trägt es immer), so zahlt auch ein erneut als Alt-Version geladener Stand nicht doppelt.
  if ((state.version ?? 0) < 96 && typeof (state as Partial<GameState>).slayerAutoTask !== "boolean") {
    const refund = slayerRefundV96(state);
    if (refund > 0) {
      const before = typeof state.slayerPoints === "number" && Number.isFinite(state.slayerPoints) ? Math.max(0, state.slayerPoints) : 0;
      state.slayerPoints = before + refund;
    }
    state.slayerAutoTask = false;
  }

  // ── Gestufte Arbeitsaufträge (SAVE_VERSION 96 → 97, 1.4.1, Chef 25.10.2026 „getiert 1–2–3“) ─────────────────────────────────
  // claude:2026-10-25T17:05:00+01:00 — Neue Pflichtfelder `WorkOrder.tier` und `WorkOrderState.tierMs`. Offene Aufträge und ein offenes Angebot
  // stammen aus 1.4.0 und entsprechen Stufe 2; ihr beim Angebot festgeschriebener Lohn (Gold, XP, Menge, Minuten) bleibt unverändert, auch
  // der alte XP-Faktor 1,5 (nichts wird nachträglich gekürzt). Die drei Stufen-Uhren starten deterministisch auf ihren Mittelwerten.
  // Nur fehlende Werte werden gesetzt (idempotent bei erneutem Laden als Alt-Version). Härtung jeder Version: sanitizeWorkOrders.
  if ((state.version ?? 0) < 97 && state.workOrders && typeof state.workOrders === "object" && !Array.isArray(state.workOrders)) {
    const wo = state.workOrders as unknown as Record<string, unknown>;
    const tag = (o: unknown): void => {
      if (o && typeof o === "object" && !Array.isArray(o) && (o as Record<string, unknown>).tier === undefined) (o as Record<string, unknown>).tier = ORDER_LEGACY_TIER;
    };
    if (Array.isArray(wo.open)) for (const o of wo.open) tag(o);
    tag(wo.offer);
    if (wo.tierMs === undefined) wo.tierMs = defaultWorkOrderTierClocks();
  }

  // ── Feste Fächer der Variantenzellen (SAVE_VERSION 97 → 98, 1.4.1, Chef-Report 25.10.2026 „Items verschieben sich nach Restart“) ──
  // claude:2026-10-25T18:02:00+01:00 — Neues Feld `inventory.variantCells`. Ein Stand < 98 kann es nicht tragen; falls eine der Migrationen oben über
  // addItem/addInstance (`syncVariantCells`) schon eines angelegt hat, wird es hier verworfen. Die eigentliche Vorbelegung macht
  // sanitizeState am Ende (alte Anzeige-Logik `legacyVariantCellLayout` auf dem fertig gesäuberten Inventar), damit die Zellen beim
  // ersten Laden exakt dort stehen, wo der alte Client sie zeichnete. Idempotent: ein schon gehobener Stand trägt das Feld.
  if ((state.version ?? 0) < 98 && state.inventory && typeof state.inventory === "object") {
    delete (state.inventory as Partial<InventoryState>).variantCells;
  }

  // State auf die aktuelle Version heben (macht versions-abhängige Migrationen idempotent).
  state.version = SAVE_VERSION;

  // Defensiver Validierungs-/Clamp-Pass (Security-Härtung): manipulierte/beschädigte Werte
  // korrigieren, ohne legitime Saves zu verändern. Läuft NACH allen Rename-/Default-Migrationen,
  // damit Referenzen erst umbenannt und dann gegen den aktuellen Content geprüft werden.
  return sanitizeState(state, content);
}

/**
 * claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2: EINGEFRORENE Jägerkodex-Preise (Baum `slayer`) vor und nach der Halbierung, je Rang.
 * Bewusst NICHT aus dem Content gelesen: der trägt nach dem Update nur noch die neuen Preise, die Gutschrift braucht beide Stände.
 * Nie ändern (Muster RING_MASTER_RENAME); eine spätere Preisänderung bekommt ihre eigene Tabelle und Migration.
 */
export const SLAYER_TALENT_COSTS_V95: Readonly<Record<string, readonly number[]>> = {
  tracking: [250, 500, 900, 1400, 2000],
  trail: [650],
  collar: [3000],
  pace: [250, 500, 900],
  spoils: [400, 750, 1250],
  lore: [400, 750, 1250],
};
export const SLAYER_TALENT_COSTS_V96: Readonly<Record<string, readonly number[]>> = {
  tracking: [125, 250, 450, 700, 1000],
  trail: [325],
  collar: [1500],
  pace: [125, 250, 450],
  spoils: [200, 375, 625],
  lore: [200, 375, 625],
};
/** claude:2026-10-25T10:32:00+01:00 — 1.4.1 S2: Gutschrift je besessenem Exemplar (Punkte-Shop alt minus neu: 1.500→750, 2.500→1.250, 4.000→2.000). */
export const SLAYER_UNIQUE_REFUND_V96: Readonly<Record<string, number>> = {
  slayer_turnkey_ring: 750,
  slayer_predecessor_mantle: 1250,
  slayer_guest_right: 2000,
};

/**
 * claude:2026-10-25T10:32:00+01:00 — Einmalige Slayer-Punkte-Gutschrift der Migration 95→96 (S2). Läuft VOR sanitizeState auf dem
 * rohen State, daher durchgehend defensiv (kaputte Werte zählen 0). Ganzzahlig, nie negativ.
 *
 * Talente: je Knoten aus `talents.slayer` Σ (alt − neu) über die gekauften Ränge 1..rank (Rang ganzzahlig, auf die Tabelle geklemmt).
 * Unikate: jedes Exemplar an jedem Ort, an dem Items leben (gefunden über die Rename-/Sanitize-Pfade dieser Datei):
 *  - Inventar: Stapel-Plätze (`slots[].itemId × qty`; ein Alt-Platz mit `instance` zählt dessen baseItemId einmal) und die
 *    Instanz-Tasche `inventory.instances`,
 *  - Bank (`bank[id]`, Materiallager liegt im selben Record) und Gear-Vault `bankInstances`,
 *  - angelegte Ausrüstung `character.equipment` (eine angelegte Instanz steht dort mit ihrer baseItemId; `equippedInstances`
 *    ist nur ihr Begleiter und wird nicht doppelt gezählt),
 *  - INAKTIVE Ausrüstungs-Kits (`equipKits[k].equipment`, k ≠ activeKit; das aktive Kit ist nur der Spiegel des Charakters),
 *  - Postfach `mailbox[].items`/`instances` (jede Sorte, auch gesperrte Prestige-Post und Rabenfracht).
 * NICHT gezählt: der Rückkauf (`buyBack`, verkauft = nicht besessen, der Spieler hat Gold dafür bekommen). Varianten dieser drei
 * Items gibt es nicht (Raid-Varianten-Suffixe betreffen nur Raid-Teile).
 */
function slayerRefundV96(state: GameState): number {
  const intOf = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
  let refund = 0;

  const ranks = (state.talents as Record<string, unknown> | undefined)?.slayer;
  if (ranks && typeof ranks === "object") {
    for (const [node, rawRank] of Object.entries(ranks as Record<string, unknown>)) {
      const before = SLAYER_TALENT_COSTS_V95[node];
      const after = SLAYER_TALENT_COSTS_V96[node];
      if (!before || !after) continue;
      const rank = Math.min(intOf(rawRank), before.length);
      for (let r = 0; r < rank; r++) refund += Math.max(0, (before[r] ?? 0) - (after[r] ?? 0));
    }
  }

  const owned = new Map<string, number>();
  const add = (id: unknown, qty: number): void => {
    if (typeof id !== "string" || !(id in SLAYER_UNIQUE_REFUND_V96) || !(qty > 0)) return;
    owned.set(id, (owned.get(id) ?? 0) + qty);
  };
  const addInstances = (list: unknown): void => {
    if (!Array.isArray(list)) return;
    for (const inst of list) if (inst && typeof inst === "object") add((inst as ItemInstance).baseItemId, 1);
  };
  const addEquipment = (eq: unknown): void => {
    if (!eq || typeof eq !== "object") return;
    for (const id of Object.values(eq as Record<string, unknown>)) add(id, 1);
  };

  const inv = state.inventory as Partial<GameState["inventory"]> | undefined;
  if (Array.isArray(inv?.slots)) {
    for (const slot of inv!.slots) {
      if (!slot || typeof slot !== "object") continue;
      if (slot.instance && typeof slot.instance === "object") add(slot.instance.baseItemId, 1);
      else add(slot.itemId, intOf(slot.qty));
    }
  }
  addInstances(inv?.instances);
  if (state.bank && typeof state.bank === "object") {
    for (const [id, qty] of Object.entries(state.bank)) add(id, intOf(qty));
  }
  addInstances(state.bankInstances);
  addEquipment(state.character?.equipment);
  if (Array.isArray(state.equipKits)) {
    const active = typeof state.activeKit === "number" ? state.activeKit : 0;
    state.equipKits.forEach((kit, k) => {
      if (k !== active && kit && typeof kit === "object") addEquipment(kit.equipment);
    });
  }
  if (Array.isArray(state.mailbox)) {
    for (const mail of state.mailbox) {
      if (!mail || typeof mail !== "object") continue;
      if (Array.isArray(mail.items)) for (const att of mail.items) if (att && typeof att === "object") add(att.itemId, intOf(att.qty));
      addInstances(mail.instances);
    }
  }

  for (const [id, n] of owned) refund += n * (SLAYER_UNIQUE_REFUND_V96[id] ?? 0);
  return Math.max(0, Math.floor(refund));
}

// claude:2026-10-24T23:55:00+02:00 — Härtung der Ereignis- und Auftragsdaten (SAVE 92, 1.4.0 Welle 3). Alles, was nicht passt, fällt auf
// den Default zurück; nichts davon trägt Besitz (Lohn wird erst bei der Abgabe gezahlt).
function finiteInt(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
}

function sanitizeSkillEvents(state: GameState, content: ContentDB): void {
  const raw = state.skillEvents as unknown;
  const def = defaultSkillEventState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    state.skillEvents = def;
    return;
  }
  const r = raw as Record<string, unknown>;
  const ids = new Set<string>(SKILL_EVENT_IDS);
  const a = r.active as Record<string, unknown> | null | undefined;
  const active =
    a && typeof a === "object" && typeof a.id === "string" && ids.has(a.id) && typeof a.skill === "string" && content.skills[a.skill]
      ? {
          id: a.id as SkillEventId,
          skill: a.skill,
          actionsLeft: finiteInt(a.actionsLeft, 0, 1000, 0),
          msLeft: finiteInt(a.msLeft, 0, EVENT_EXPIRE_MS, 0),
        }
      : null;
  const log: SkillEventLogEntry[] = [];
  if (Array.isArray(r.log)) {
    for (const e of r.log.slice(0, EVENT_LOG_MAX) as Array<Record<string, unknown>>) {
      if (!e || typeof e !== "object" || typeof e.id !== "string" || !ids.has(e.id) || typeof e.skill !== "string") continue;
      const entry: SkillEventLogEntry = {
        seq: finiteInt(e.seq, 0, Number.MAX_SAFE_INTEGER, 0),
        id: e.id as SkillEventId,
        skill: e.skill,
        atMs: finiteInt(e.atMs, 0, Number.MAX_SAFE_INTEGER, 0),
      };
      if (typeof e.itemId === "string" && content.items[e.itemId]) entry.itemId = e.itemId;
      if (entry.itemId) entry.qty = finiteInt(e.qty, 0, 1_000_000_000, 0);
      // claude:2026-10-25T17:05:00+01:00 — Auftragsstufe im Kundschaft-Eintrag (SAVE 97): nur bei „customer“ und nur 1–3, sonst weg.
      if (entry.id === "customer" && isWorkOrderTier(e.orderTier)) entry.orderTier = e.orderTier;
      log.push(entry);
    }
  }
  state.skillEvents = {
    cooldownMs: finiteInt(r.cooldownMs, 0, EVENT_COOLDOWN_MS, EVENT_COOLDOWN_MS),
    active: active && (active.msLeft > 0) ? active : null,
    harvestReady: r.harvestReady === true,
    trailReady: r.trailReady === true,
    log,
    seq: finiteInt(r.seq, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

// claude:2026-10-25T04:40:00+02:00 — Raid-Zustand härten (SAVE 93). Freischaltungen/Zähler sind Fortschritt: Zahlen klemmen, nie erfinden.
const RAID_DIFFS = ["normal", "heroic", "mythic"] as const;
function sanitizeRaid(state: GameState, content: ContentDB): void {
  const raw = state.raid as unknown;
  const def = defaultRaidState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    state.raid = def;
    return;
  }
  const r = raw as Record<string, unknown>;
  const rc = (r.clears ?? {}) as Record<string, unknown>;
  const clears = {
    normal: finiteInt(rc.normal, 0, Number.MAX_SAFE_INTEGER, 0),
    heroic: finiteInt(rc.heroic, 0, Number.MAX_SAFE_INTEGER, 0),
    mythic: finiteInt(rc.mythic, 0, Number.MAX_SAFE_INTEGER, 0),
  };
  const bossKills: Record<string, number> = {};
  if (r.bossKills && typeof r.bossKills === "object" && !Array.isArray(r.bossKills)) {
    for (const [k, v] of Object.entries(r.bossKills as Record<string, unknown>)) {
      const n = finiteInt(v, 0, Number.MAX_SAFE_INTEGER, 0);
      if (n > 0 && /^[\w-]+:(normal|heroic|mythic)$/.test(k)) bossKills[k] = n;
    }
  }
  const rw = (r.weekly ?? {}) as Record<string, unknown>;
  const chests: Record<string, true> = {};
  if (rw.chests && typeof rw.chests === "object" && !Array.isArray(rw.chests)) {
    for (const [k, v] of Object.entries(rw.chests as Record<string, unknown>)) if (v === true) chests[k] = true;
  }
  const fastestMs: Partial<Record<RaidDifficulty, number>> = {};
  const rf = (r.fastestMs ?? {}) as Record<string, unknown>;
  for (const d of RAID_DIFFS) if (typeof rf[d] === "number" && Number.isFinite(rf[d]) && (rf[d] as number) > 0) fastestMs[d] = Math.floor(rf[d] as number);
  const lootList = (v: unknown): { itemId: ItemId; qty: number }[] =>
    Array.isArray(v)
      ? (v as Array<Record<string, unknown>>)
          .filter((e) => e && typeof e.itemId === "string" && content.items[e.itemId as string])
          .slice(0, 200)
          .map((e) => ({ itemId: e.itemId as ItemId, qty: finiteInt(e.qty, 1, 1_000_000_000, 1) }))
      : [];
  let run: RaidRun | null = null;
  const rr = r.run as Record<string, unknown> | null | undefined;
  if (rr && typeof rr === "object") {
    const raidDef = (content.raids ?? []).find((x) => x.id === rr.raidId);
    const diff = rr.difficulty;
    const phase = rr.phase;
    const mod = rr.modifier;
    if (
      raidDef &&
      (diff === "normal" || diff === "heroic" || diff === "mythic") &&
      (phase === "fight" || phase === "rest" || phase === "defeated" || phase === "complete")
    ) {
      run = {
        raidId: raidDef.id,
        difficulty: diff,
        room: finiteInt(rr.room, 0, Math.max(0, raidDef.rooms.length - 1), 0),
        phase,
        feePaid: finiteInt(rr.feePaid, 0, Number.MAX_SAFE_INTEGER, 0),
        restarts: finiteInt(rr.restarts, 0, 1000, 0),
        loot: lootList(rr.loot),
        lastLoot: lootList(rr.lastLoot),
        bossSeq: finiteInt(rr.bossSeq, 0, Number.MAX_SAFE_INTEGER, 0),
        startedAtMs: finiteInt(rr.startedAtMs, 0, Number.MAX_SAFE_INTEGER, 0),
        modifier: typeof mod === "string" && (RAID_WEEKLY_MODIFIERS as readonly string[]).includes(mod) ? (mod as RaidWeeklyModifierId) : "quiet_halls",
        restMs: finiteInt(rr.restMs, 0, 60_000, 0),
      };
      // claude:2026-10-26T02:10:00+02:00 — Rast im letzten Raum gibt es nicht (dort setzt der Raumabschluss „complete“). Nach Content-Schrumpf
      // oder Tamper hinge der Lauf sonst für immer in der Rast und hielte Warteschlange und Aktionen an (QA-Saves #3).
      if (run.phase === "rest" && run.room >= raidDef.rooms.length - 1) run.phase = "complete";
    }
  }
  const lr = r.lastResult as Record<string, unknown> | null | undefined;
  const lastResult =
    lr && typeof lr === "object" && (lr.difficulty === "normal" || lr.difficulty === "heroic" || lr.difficulty === "mythic") &&
    (lr.outcome === "complete" || lr.outcome === "defeated" || lr.outcome === "abandoned")
      ? {
          seq: finiteInt(lr.seq, 0, Number.MAX_SAFE_INTEGER, 0),
          difficulty: lr.difficulty as RaidDifficulty,
          outcome: lr.outcome as "complete" | "defeated" | "abandoned",
          durationMs: finiteInt(lr.durationMs, 0, Number.MAX_SAFE_INTEGER, 0),
          refund: finiteInt(lr.refund, 0, Number.MAX_SAFE_INTEGER, 0),
        }
      : null;
  const rq = r.queue as Record<string, unknown> | null | undefined;
  const queue =
    rq && typeof rq === "object" && (content.raids ?? []).some((x) => x.id === rq.raidId) &&
    (rq.difficulty === "normal" || rq.difficulty === "heroic" || rq.difficulty === "mythic") && run
      ? {
          raidId: rq.raidId as string,
          difficulty: rq.difficulty as RaidDifficulty,
          remaining: rq.remaining === null ? null : finiteInt(rq.remaining, 1, 1_000_000, 1),
          completed: finiteInt(rq.completed, 0, Number.MAX_SAFE_INTEGER, 0),
        }
      : null;
  state.raid = {
    run,
    clears,
    bossKills,
    weekly: { week: finiteInt(rw.week, -1, Number.MAX_SAFE_INTEGER, -1), chests },
    fastestMs,
    feesPaid: finiteInt(r.feesPaid, 0, Number.MAX_SAFE_INTEGER, 0),
    lastResult,
    resultSeq: Math.max(lastResult?.seq ?? 0, finiteInt(r.resultSeq, 0, Number.MAX_SAFE_INTEGER, 0)),
    queue,
  };
}

// claude:2026-10-25T17:05:00+01:00 — SAVE 97 gestufte Aufträge: gültige Stufe 1–3.
function isWorkOrderTier(v: unknown): v is WorkOrderTier {
  return v === 1 || v === 2 || v === 3;
}

/**
 * claude:2026-10-25T17:05:00+01:00 — Stufen-Uhren härten (SAVE 97): nicht endlich oder negativ → Mittelwert der Stufe; sonst ganzzahlig, gedeckelt auf das
 * obere Ende der Neuwurf-Spanne (1,25 × Mittel). Fehlt das Feld, starten alle Uhren auf den Mittelwerten.
 */
function sanitizeWorkOrderClocks(raw: unknown): WorkOrderTierClocks {
  const out = defaultWorkOrderTierClocks();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  for (const t of WORK_ORDER_TIERS) {
    const v = r[t];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) out[t] = Math.min(workOrderTierClockMax(t), Math.floor(v));
  }
  return out;
}

function sanitizeWorkOrder(raw: unknown, content: ContentDB): WorkOrder | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== "produce" && o.kind !== "deliver") return null;
  if (typeof o.skill !== "string" || !content.skills[o.skill]) return null;
  if (typeof o.actionId !== "string" || !content.actions[o.actionId]) return null;
  if (typeof o.itemId !== "string" || !content.items[o.itemId]) return null;
  return {
    id: finiteInt(o.id, 1, Number.MAX_SAFE_INTEGER, 1),
    kind: o.kind,
    tier: isWorkOrderTier(o.tier) ? o.tier : ORDER_LEGACY_TIER, // claude:2026-10-25T17:05:00+01:00 — SAVE 97: fehlt/kaputt → Stufe 2 (1.4.0-Auftrag)
    skill: o.skill,
    actionId: o.actionId,
    itemId: o.itemId,
    count: finiteInt(o.count, 1, 1_000_000, 1),
    minutes: finiteInt(o.minutes, 1, 600, 30),
    band: finiteInt(o.band, 1, TAVERN_BANDS, 1),
    gold: finiteInt(o.gold, 0, 1_000_000_000, 0),
    xp: finiteInt(o.xp, 0, 1_000_000_000, 0),
    customerId: typeof o.customerId === "string" ? o.customerId : "guild",
    baseline: finiteInt(o.baseline, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

function sanitizeWorkOrders(state: GameState, content: ContentDB): void {
  const raw = state.workOrders as unknown;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    state.workOrders = defaultWorkOrderState();
    return;
  }
  const r = raw as Record<string, unknown>;
  const open: WorkOrder[] = [];
  const seen = new Set<number>();
  if (Array.isArray(r.open)) {
    for (const x of r.open) {
      const o = sanitizeWorkOrder(x, content);
      if (!o || seen.has(o.id) || open.length >= ORDER_MAX_OPEN) continue;
      seen.add(o.id);
      open.push(o);
    }
  }
  const offer = sanitizeWorkOrder(r.offer, content);
  // claude:2026-10-25T17:05:00+01:00 — Restzeit höchstens die Laufzeit der Angebots-Stufe (SAVE 97: 10/15/30 min).
  const offerMsLeft = offer ? finiteInt(r.offerMsLeft, 0, ORDER_TIERS[offer.tier].offerTtlMs, 0) : 0;
  const maxId = Math.max(0, ...open.map((o) => o.id), offer?.id ?? 0);
  state.workOrders = {
    open,
    offer: offer && offerMsLeft > 0 ? offer : null,
    offerMsLeft: offer && offerMsLeft > 0 ? offerMsLeft : 0,
    tierMs: sanitizeWorkOrderClocks(r.tierMs), // claude:2026-10-25T17:05:00+01:00 — SAVE 97
    seq: Math.max(maxId, finiteInt(r.seq, 0, Number.MAX_SAFE_INTEGER, 0)),
    delivered: finiteInt(r.delivered, 0, Number.MAX_SAFE_INTEGER, 0),
  };
}

export interface SaveFile {
  version: number;
  /** Epoch-Millisekunden beim Speichern – Basis für Offline-Berechnung. */
  savedAt: number;
  /** Top-Level-Summary, damit das Menü Slots ohne vollen State lesen kann. */
  summary: SaveSummary;
  state: GameState;
}

export function summarize(state: GameState, savedAt: number): SaveSummary {
  return {
    name: state.character.name,
    totalLevel: state.character.totalLevel,
    elapsedMs: state.elapsedMs,
    // Aktiv gespielte Zeit (ohne Offline) — das ist die „played"-Zeit fürs Menü.
    activePlayMs: state.activePlayMs,
    savedAt,
    // Das tatsächlich gewählte Portrait steht in `character.portrait` (die Erstellung setzt nur
    // dieses; `portraitId` blieb null → Menü zeigte nie das Bild). Summary daraus speisen.
    portraitId: state.character.portrait ?? state.character.portraitId,
  };
}

export function serialize(state: GameState, now: number = Date.now()): string {
  // Ausrüstungs-Kits (SAVE_VERSION 85): der Spiegel des aktiven Kits darf zur Laufzeit stale sein —
  // vor dem Schreiben aus der Wahrheit (`character`) nachziehen, damit der Save in sich konsistent ist.
  syncActiveKit(state);
  const save: SaveFile = {
    version: SAVE_VERSION,
    savedAt: now,
    summary: summarize(state, now),
    state,
  };
  return JSON.stringify(save);
}

/** Liest nur die Summary aus einem rohen Save-String (für die Slot-Liste). */
export function parseSummary(json: string): SaveSummary | null {
  try {
    const save = JSON.parse(json) as Partial<SaveFile>;
    return save.summary ?? null;
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: GameState;
  offlineMs: number;
  offlineTicks: number;
  /** Was in der Offline-Zeit passiert ist (für das „Während du weg warst"-Popup). */
  offline: OfflineSummary;
}

function totalXp(state: GameState): number {
  let sum = 0;
  // null-sicher: korrupte Saves können null-Skill-Einträge haben; deserialize darf NIE werfen
  // (Vertrag: beschädigt ⇒ null zurück), daher `skill?.xp ?? 0` statt `skill.xp`.
  for (const skill of Object.values(state.skills)) sum += skill?.xp ?? 0;
  return sum;
}

function inventoryCounts(state: GameState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of state.inventory.slots) {
    if (slot) counts[slot.itemId] = (counts[slot.itemId] ?? 0) + slot.qty;
  }
  // Auch die Bank zählen: bei Default `autoBank=true` fließen Idle-Erträge bei vollem
  // Inventar direkt ins Lager. Ohne dies unterschlägt das „Während du weg warst"-Popup
  // gerade die typischen Langzeit-Offline-Erträge.
  for (const [itemId, qty] of Object.entries(state.bank)) {
    if (qty > 0) counts[itemId] = (counts[itemId] ?? 0) + qty;
  }
  // Auch den Gear-Vault (`bankInstances`) zählen: bei vollem Inventar wandern Instanz-Drops
  // (z. B. verzauberte/gesuffixte Gear-Drops) offline verlustfrei in den Vault. Ohne dies
  // unterschlägt das „Während du weg warst"-Popup gerade diese Gear-Erträge. Je `baseItemId`
  // aggregiert (eine Instanz = ein Exemplar des Basis-Items).
  for (const inst of state.bankInstances) {
    if (inst?.baseItemId) counts[inst.baseItemId] = (counts[inst.baseItemId] ?? 0) + 1;
  }
  // Instanz-Tasche (v53): Instanz-Drops (verzaubert/gesuffixt) liegen jetzt hier statt in `slots` —
  // ohne dies unterschlägt das „Während du weg warst"-Popup die offline gedroppten Gear-Instanzen.
  for (const inst of state.inventory.instances) {
    if (inst?.baseItemId) counts[inst.baseItemId] = (counts[inst.baseItemId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Lädt einen Spielstand und holt versäumte Offline-Zeit nach, indem dieselbe
 * Engine-Funktion (`advance`) im Schnelldurchlauf läuft. Gedeckelt auf das EFFEKTIVE Fenster
 * `effectiveMaxOfflineMs(state, content)` — `MAX_OFFLINE_MS` (8 h) plus die gebauten
 * Wachturm-Stufen (je +1 h, max. 11 h; Das Lager, Task #359). Ohne Wachturm exakt die alten 8 h.
 * Liefert zusätzlich eine Zusammenfassung des Offline-Fortschritts.
 */
export function deserialize(
  json: string,
  content: ContentDB,
  now: number = Date.now(),
): LoadResult | null {
  // Defensiv (Security-Härtung r1, V1.2): ein kaputter/abgeschnittener/manipulierter Save darf
  // beim Laden NICHT mit einer unbehandelten Exception crashen. JSON.parse + Grundstruktur in
  // try/catch; bei Fehler null statt throw (analog zu parseSummary). Der Aufrufer behandelt null
  // als „Spielstand beschädigt" und crasht nicht.
  let save: SaveFile;
  try {
    const parsed = JSON.parse(json) as Partial<SaveFile>;
    if (!parsed || typeof parsed !== "object" || !parsed.state || typeof parsed.state !== "object") {
      return null;
    }
    save = parsed as SaveFile;
  } catch {
    return null;
  }

  let state: GameState;
  try {
    state = migrateState(save.state, content);
  } catch {
    // Selbst wenn ein bösartig geformter State die Migration/Sanitize sprengt: nicht crashen.
    return null;
  }

  const savedAt = typeof save.savedAt === "number" && Number.isFinite(save.savedAt) ? save.savedAt : now;
  // Wachturm (Das Lager, `offlineCapMs`): das Gutschrift-FENSTER wächst mit den gebauten Stufen —
  // die Raten selbst bleiben unverändert (balance.md §5). Muss NACH migrateState stehen: erst dort
  // ist `state.camp` gehärtet und die Gebäude-Stufen sind vertrauenswürdig.
  const offlineMs = Math.min(Math.max(0, now - savedAt), effectiveMaxOfflineMs(state, content));

  // Snapshot vor dem Nachholen, um die Differenz zu bilden.
  const goldBefore = state.character.gold;
  const xpBefore = totalXp(state);
  const itemsBefore = inventoryCounts(state);
  const skillXpBefore: Record<string, number> = {};
  for (const [id, s] of Object.entries(state.skills)) skillXpBefore[id] = s?.xp ?? 0;
  // Offline-Tod/Kampf-Stopp (Chef-Bug: Charakter starb offline, das Popup verschwieg es): Snapshot
  // der Kampf-Lage VOR dem Catch-up. `onPlayerDefeated` (combat.ts) nullt beim Tod monsterId/
  // dungeonId und resettet encounterIndex — der Killer ist aber aus diesen Vorher-Werten plus dem
  // stats.kills-Delta exakt rekonstruierbar (Herleitung unten bei der Auswertung).
  const deathsBefore = state.stats.deaths;
  const killsBefore = state.stats.kills;
  const monsterBefore = state.combat.monsterId;
  const dungeonBefore = state.combat.dungeonId;
  const encounterIndexBefore = state.combat.encounterIndex;
  // Pet-Besitz VOR dem Catch-up (Welle DD „Kein Drop darf je stumm sein"): der Catch-up läuft
  // über `advance` und würfelt Pet-Drops wie live (tick.ts-Skilling, Farming-Ernte, Kill-Pfad).
  const ownedPetsBefore: Record<string, true> = { ...state.character.ownedPets };
  // Achievement-Stand VOR dem Catch-up (Welle LL, Fun-Retest pets-fenn: offline verdiente
  // Achievements blieben lautlos): checkAchievements (advance-Choke-Point) hängt nur AN —
  // die Längen-Differenz plus slice liefert exakt die im Catch-up freigeschalteten IDs in
  // Push- (= chronologischer) Reihenfolge.
  const achievementsBefore = state.achievements.length;
  // Lager-Bau-Stand VOR dem Catch-up (SAVE 76): steigt `camp.buildSeq` im Offline-Fenster, hat
  // der Bautrupp einen Bau fertiggestellt (tickCampBuild, engine/tick.ts) — der Breadcrumb
  // `lastCompletedBuild` trägt dann exakt DIESEN Bau (offline kann kein neuer Auftrag starten:
  // das bräuchte eine Spieler-Aktion + Kosten ⇒ strukturell max. EINE Fertigstellung pro Fenster).
  const campSeqBefore = state.camp.buildSeq;
  // Veredelungs-Produktion VOR dem Catch-up (SAVE 77, „Dein Lager hat gearbeitet"): je Anlage der
  // `produced`-Lebenszeitzähler. Die Differenz nach dem Catch-up IST die Fenster-Produktion — der
  // Rezept-Slot kann sich offline nicht ändern (Rezeptwahl ist eine Spieler-Aktion), also ist der
  // Output eindeutig dem heute gewählten Rezept zuzuordnen.
  const campRefinedBefore: Record<string, number> = {};
  for (const [id, slot] of Object.entries(state.camp.refine ?? {})) {
    campRefinedBefore[id] = slot?.produced ?? 0;
  }
  // claude:2026-10-23T20:00:00+02:00 — Ländereien im Offline-Bericht (1.4.0 LA): Ernte-Stücke je Feldfrucht im Fenster.
  // claude:2026-10-24T15:21:04+02:00 — Quelle ist jetzt `stats.harvestedById` (SAVE 94, nur Beet-Ernte), nicht mehr `producedById`, das auch Sammel-Funde
  // derselben Item-ID zählt (QA-Runde 2 Klarheit B1: Sammeln in den Aschfeldern erschien als „Ländereien: Ernte“).
  const cropYieldIds = [...new Set(Object.values(content.crops ?? {}).map((c) => c.yieldItem))];
  const harvestBefore: Record<string, number> = {};
  for (const id of cropYieldIds) harvestBefore[id] = state.stats.harvestedById?.[id] ?? 0;

  // Offline-Catch-up: `offline: true` → die versäumten Ticks laufen wie sonst, aber `activePlayMs`
  // (angezeigte Spielzeit) zählt NICHT mit. `elapsedMs` (Sim-/Farming-Uhr) läuft weiter.
  // `nowMs: now` (Blessings of the Reach, 2026-07-21): der reale Wall-Clock-Anker fürs Fenster
  // [savedAt..now] — advance() leitet daraus PRO TICK den korrekten lokalen Kalendertag ab (segmentiert
  // also automatisch an einer evtl. dazwischenliegenden lokalen Mitternacht), damit ein Offline-Sprung
  // über mehrere Stunden bit-identisch zum tickweisen Live-Verlauf bleibt (offline==online).
  // Jagen (SAVE 85): Fänge je Monster im Offline-Fenster — der Fallen-Tick (engine/hunting.ts) zählt in
  // diesen Sammler, weil der State selbst nur den JÜNGSTEN Fang je Platz trägt (kein neues Save-Feld nötig).
  const huntTally: HuntCatchTally = {};
  // claude:2026-10-17T20:00:00+02:00 — K4: übersprungene Queue-Einträge im Fenster zählen (transient, kein Save-Feld)
  const skipTally = beginQueueSkipTally(state);
  let offlineTicks: ReturnType<typeof advance>;
  try {
    offlineTicks = advance(state, content, offlineMs, { offline: true, nowMs: now, huntTally });
  } finally {
    endQueueSkipTally(state);
  }

  const itemsAfter = inventoryCounts(state);
  const items: Record<string, number> = {};
  for (const [itemId, qty] of Object.entries(itemsAfter)) {
    const gained = qty - (itemsBefore[itemId] ?? 0);
    if (gained > 0) items[itemId] = gained;
  }

  // XP-Aufschlüsselung je Skill (für die Popup-Zeilen „Smithing: X XP, +X Level").
  const skillXp: Record<string, { xp: number; levels: number }> = {};
  for (const [id, s] of Object.entries(state.skills)) {
    const before = skillXpBefore[id] ?? 0;
    const after = s?.xp ?? 0;
    const gained = after - before;
    if (gained > 0) {
      skillXp[id] = { xp: gained, levels: levelFromXp(after) - levelFromXp(before) };
    }
  }

  const offline: OfflineSummary = {
    ms: offlineMs,
    gold: state.character.gold - goldBefore,
    xp: totalXp(state) - xpBefore,
    items,
    skillXp,
  };

  // ── Offline-Tod & Kampf-Auto-Stopp (nur Summary, transient — der GameState bleibt unverändert) ──
  // deaths-Delta: die EINZIGE Inkrement-Stelle ist onPlayerDefeated (combat.ts:661), und der Tod
  // beendet den Kampf hart (kein Auto-Neustart; offline kann kein neuer Kampf gestartet werden)
  // → das Delta ist 0 oder 1. claude:2026-10-26T02:10:00+02:00 — Ausnahme Raid (1.4.0): offline startet Normal einen Raum bis zu
  //   dreimal neu, Heroisch mit „Neustart automatisch kaufen“ ebenso ⇒ dort bis zu 1 + maxAutoRestarts (QA-Saves #7).
  const deaths = Math.max(0, state.stats.deaths - deathsBefore);
  // Kill-Delta des Catch-ups (transient, fürs Offline-Popup-Medaillon — #306):
  const offlineKills = Math.max(0, state.stats.kills - killsBefore);
  if (offlineKills > 0) offline.kills = offlineKills;
  // stopReason ist transient: migrateState baut `state.combat` OHNE das Feld neu auf (s. o.) — ein
  // nach dem Catch-up gesetzter Wert ist also garantiert WÄHREND des Catch-ups entstanden (kein
  // Alt-Grund aus der letzten Live-Session kann durchsickern).
  const combatStopReason = state.combat.stopReason ?? null;
  if (deaths > 0) {
    // Killer rekonstruieren (der Tod hat monsterId bereits genullt):
    //  • Normalkampf: der Gegner wechselt offline NIE (ein Kill respawnt DENSELBEN Gegner, ein
    //    anderer ist offline nicht wählbar) → der beim Speichern aktive Gegner ist der Killer.
    //  • Dungeon-Run: jeder Kill (stats.kills++) rückt den Run um genau eine Welle vor; ein Clear
    //    beendet den Kampf (kein Auto-Repeat → danach keine Kills/Tode mehr). Die Todes-Welle ist
    //    daher exakt `encounterIndex beim Speichern + Kills im Catch-up`. Fallback auf den
    //    Vorher-Gegner, falls der Dungeon/Index im aktuellen Content nicht (mehr) auflösbar ist.
    let diedAgainst = monsterBefore;
    if (dungeonBefore) {
      const dungeon = content.dungeons.find((d) => d.id === dungeonBefore);
      const killsDelta = Math.max(0, state.stats.kills - killsBefore);
      diedAgainst = dungeon?.encounters[encounterIndexBefore + killsDelta] ?? monsterBefore;
    }
    offline.deaths = deaths;
    offline.diedAgainst = diedAgainst;
  }
  if (combatStopReason) {
    offline.combatStopped = true;
    offline.combatStopReason = combatStopReason;
  }

  // Offline gedroppte Pets (Welle DD): jeder Drop ist ein NEUES Pet (tryPetDrop überspringt
  // Besessenes) → die Diff der ownedPets-Keys in Insertion-Order IST die chronologische
  // Drop-Reihenfolge. Fehlt (statt leerem Array), wenn nichts fiel — Muster kills/deaths.
  const petDrops = Object.keys(state.character.ownedPets).filter((id) => !ownedPetsBefore[id]);
  if (petDrops.length > 0) offline.petDrops = petDrops as PetId[];

  // Offline freigeschaltete Achievements (Welle LL): transient, fehlt (statt 0/[]) wenn nichts
  // verdient wurde — Muster kills/deaths/petDrops.
  const achievementIds = state.achievements.slice(achievementsBefore);
  if (achievementIds.length > 0) {
    offline.achievementsEarned = achievementIds.length;
    offline.achievementIds = achievementIds;
  }

  // Offline veredelt (SAVE 77, „Dein Lager hat gearbeitet"): transient, fehlt (statt leerem
  // Array), wenn nichts produziert wurde — Muster campBuilds. `qty` zählt OUTPUT-STÜCKE
  // (Durchläufe × Rezept-Menge), nicht Durchläufe: das ist die Zahl, die der Spieler im Lager
  // wiederfindet.
  const refined: { buildingId: string; itemId: string; qty: number }[] = [];
  for (const [id, slot] of Object.entries(state.camp.refine ?? {})) {
    if (!slot) continue;
    const runs = slot.produced - (campRefinedBefore[id] ?? 0);
    if (runs <= 0) continue;
    const out = content.actions[slot.recipeId]?.loot[0];
    if (!out) continue;
    refined.push({ buildingId: id, itemId: out.itemId, qty: runs * out.min });
  }
  if (refined.length > 0) offline.campRefined = refined;

  // Offline-Fänge (SAVE 85, „Jagd: Eber ×3, Ziege ×1"): transient, fehlt (statt leerem Array), wenn
  // nichts in die Fallen ging — Muster campRefined. Reihenfolge = erster Fang je Monster.
  const huntCatches = Object.entries(huntTally)
    .filter(([, n]) => n > 0)
    .map(([monsterId, count]) => ({ monsterId, count }));
  if (huntCatches.length > 0) offline.huntCatches = huntCatches;
  const farmHarvests = cropYieldIds
    .map((itemId) => ({ itemId, qty: (state.stats.harvestedById?.[itemId] ?? 0) - (harvestBefore[itemId] ?? 0) })) // claude:2026-10-24T15:21:04+02:00
    .filter((h) => h.qty > 0);
  if (farmHarvests.length > 0) offline.farmHarvests = farmHarvests;
  // claude:2026-10-17T20:00:00+02:00 — K4: Anzahl übersprungener Queue-Einträge (fehlt bei 0)
  if (skipTally.count > 0) offline.queueSkips = skipTally.count;

  // Offline fertiggestellte Lager-Bauten (SAVE 76, „Die Hände haben gearbeitet"): transient,
  // fehlt (statt leerem Array), wenn nichts fertig wurde — Muster kills/deaths/petDrops.
  if (state.camp.buildSeq > campSeqBefore && state.camp.lastCompletedBuild) {
    offline.campBuilds = [
      {
        buildingId: state.camp.lastCompletedBuild.buildingId,
        level: state.camp.lastCompletedBuild.level,
      },
    ];
  }

  // — Bank-Platzierung (SAVE 87): ALLERLETZTER Schritt des Ladens. `sanitizeState` reicht nicht,
  //   weil DANACH noch der Offline-Nachhol-Tick laeuft und dabei Bank-Bestand verbraucht (im
  //   v85-Fixture die Koeder). Gemessen: Sync in sanitizeState ergab beim ersten Laden
  //   `["bait_worm"]`, beim zweiten `[null]` — der Round-Trip war also nicht idempotent, und der
  //   Kompat-Vault hat genau das aufgedeckt. Hier steht er nach allem, was `bank` anfasst. —
  syncBankOrder(state, undefined, storagePredicate(content)); // claude:2026-10-23T22:00:00+02:00 — ohne Lagerware (1.4.0 ML)
  // claude:2026-10-25T18:02:00+01:00 — dasselbe für die Variantenzellen (SAVE 98): der Nachhol-Tick kann Fächer verändert haben; advance() synct nur,
  // wenn wirklich Ticks liefen. Idempotent.
  syncVariantCells(state.inventory);

  return { state, offlineMs, offlineTicks, offline };
}
