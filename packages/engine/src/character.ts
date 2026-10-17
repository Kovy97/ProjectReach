import type {
  AttributeId,
  BoostableCombatSkillId,
  CharacterState,
  CombatStyle,
  RangedStance,
  MagicStance,
  ContentDB,
  DerivedStats,
  EquipBonus,
  EquipSlot,
  GameState,
  ItemDef,
  ItemId,
  SetDef,
  SkillBoostMap,
  WeaponStyle,
} from "@hearthforge/shared";
import {
  ARMOR_PEN_CAP,
  ATTACK_INTERVAL_CEIL_MS,
  ATTACK_INTERVAL_FLOOR_MS,
  ATTRIBUTE_IDS,
  ATTRIBUTE_SKILL_DIVISOR,
  BASE_ATTRIBUTE_VALUE,
  BLOCK_CAP,
  BOOSTABLE_COMBAT_SKILL_IDS,
  CRIT_CHANCE_ATTR_K,
  CRIT_CHANCE_ATTR_MAX,
  CRIT_CHANCE_CAP,
  CRIT_DAMAGE_BASE,
  CRIT_DAMAGE_CAP,
  CRIT_DAMAGE_PER_LCK,
  DEFAULT_PORTRAIT,
  DMG_MAX_HIT_MULT,
  DMG_ROLL_FLOOR,
  DODGE_CAP,
  DODGE_EFF_MAX,
  EQUIP_SLOTS,
  EVASION_ATTR_K,
  EVASION_ATTR_MAX,
  K_DODGE,
  PRECISION_CAP,
  RANGED_CRIT_BONUS,
  RANGED_INTERVAL_FLOOR_MS,
  TEMPO_DEX_K,
  TEMPO_DEX_MS_MAX,
  TEMPO_REDUCTION_CAP,
  WARD_BREAK_CAP,
  WARD_CORE_PER_INT,
  WARDING_DEF_STANCE_MULT,
  WARDING_REGEN_CAP,
  WARDING_REGEN_PER_LEVEL,
  activeStanceMods,
  defaultAutoPotion,
  instanceBonusDelta,
  spellReserveDamageBonus,
  spellReserveWardRegenBonus,
  wisdomStatusResist,
} from "@hearthforge/shared";
import { emptyAttributeRecord } from "./attributes";
import { levelFromXp } from "./leveling";
import {
  petDamageReduction,
  petLifesteal,
  petSkillBoost,
  petSpellReserveMult,
  petStyleDamage,
  petWardCapacityPct,
  secondPet,
} from "./pets";

function clamp(value: number, min: number, max: number): number {
  // NaN-/Infinity-fest: ein nicht-endlicher Wert (z.B. aus einem manipulierten Save, der
  // baseAttributes:{str:NaN} o.ä. eingeschleust hat) würde sonst über Math.max/Math.min als
  // NaN durchschlagen und sämtliche abgeleiteten Stats vergiften (attackIntervalMs=NaN →
  // Spieler greift nie an → Soft-Brick). Defensiv auf die Untergrenze fallen.
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export interface CharacterCreation {
  name: string;
  /**
   * Optionaler innater Attribut-Aufschlag auf die Basis (Test-/Fixture-Seed, KEINE
   * spielerseitige Punktevergabe). Wird additiv auf `BASE_ATTRIBUTE_VALUE` gelegt.
   * Live-Charaktererstellung lässt das weg → reine Hybrid-Progression aus Skills/Gear.
   * Einheit: GANZE Punkte der aktuellen (ganzzahligen) Attributskala — zählen 1:1
   * (Itemization 2.0 §1; der frühere ×0.5-Input-Squish ist entfallen, Alt-Fixtures
   * haben ihre Seeds halbiert bzw. neue Erwartungswerte gepinnt).
   */
  baseAttributes?: Partial<Record<AttributeId, number>>;
  portraitId?: string | null;
  /** Bei der Account-Erstellung gewähltes Portrait (Default DEFAULT_PORTRAIT). */
  portrait?: string;
  /**
   * Bei der Charaktererstellung gewählter Start-Kampfstil. Bestimmt die initiale
   * (sofort ausgerüstete) Waffe in `createGame`: melee→rusty_sword, ranged→cracked_bow,
   * magic→cracked_staff (Munition existiert seit #286 nicht mehr) — plus mit `starterKit`
   * das stilpassende Starter-Rüstungs-Set. Default `"melee"` für Abwärtskompatibilität
   * bestehender Aufrufer/Fixtures, die das Feld weglassen.
   * Lebt nur als Build-Input in `CharacterCreation` — landet NICHT im GameState.
   */
  startingStyle?: WeaponStyle;
  /**
   * Opt-in: gibt dem frischen Charakter ein kleines Start-Nahrungspaket (basales cooked_*-Food)
   * und belegt Auto-Eat damit vor (Schwelle = Auto-Eat-Stufe 0 = 50% HP). BEWUSST opt-in und nicht
   * Default, weil ein automatisch essender Spieler Kämpfe länger überlebt und damit die Balance-Sim
   * und Kampf-Fixtures verschieben würde — diese laufen ohne Flag auf der leeren Baseline. Die echte
   * Charaktererstellung (Renderer) setzt es; Tests/Sim lassen es weg. Lebt nur als Build-Input.
   */
  starterKit?: boolean;
}

/** Baut einen frischen Charakter. HP & totalLevel werden in createGame finalisiert. */
export function createCharacter(input: CharacterCreation, now: number = Date.now()): CharacterState {
  const baseAttributes = emptyAttributeRecord(BASE_ATTRIBUTE_VALUE);
  for (const id of ATTRIBUTE_IDS) {
    // Seed-Punkte zählen 1:1 (ganzzahlige Attributskala, Itemization 2.0 §1).
    baseAttributes[id] += Math.max(0, Math.floor(input.baseAttributes?.[id] ?? 0));
  }

  const equipment = {} as Record<EquipSlot, ItemId | null>;
  for (const slot of EQUIP_SLOTS) equipment[slot] = null;

  return {
    name: input.name.trim() || "Held",
    portraitId: input.portraitId ?? null,
    portrait: input.portrait ?? DEFAULT_PORTRAIT,
    createdAt: now,
    baseAttributes,
    totalLevel: 0,
    combatStyle: "attack",
    rangedStance: "precise",
    magicStance: "offensive",
    hp: 0,
    equipment,
    food: null,
    autoEatTier: 0,
    // Auto-Trank-System (SAVE_VERSION 49): Default AUS — der Spieler konfiguriert es im Kampf-UI.
    autoPotion: defaultAutoPotion(),
    gold: 0,
    // Quest-Tokens (Task #271, SAVE_VERSION 56): Zweit-Währung analog Gold, startet bei 0.
    questTokens: 0,
    mana: 0,
    // Ward-Pool (Rüstungs-Trinität, SAVE_VERSION 50): startet wie hp bei 0 und wird in createGame
    // auf maxWard finalisiert (mirror hp/mana). Der Stoff-Stil lädt ihn im Kampf über Casts nach (A2).
    ward: 0,
    buffs: [],
    companionPetId: null,
    companionPetId2: null, // claude:2026-10-18T00:30:00+02:00 — zweiter Begleiter-Platz (Talent secondPetSlot)
    ownedPets: {},
    equippedInstances: {},
  };
}

/** Setzt den aktiven Nahkampf-Stil (steuert XP-Routing & den passiven Bonus). */
export function setCombatStyle(state: GameState, style: CombatStyle): void {
  state.character.combatStyle = style;
}

/** Setzt die Fernkampf-Stance (Präzise/Schnell/Defensiv). */
export function setRangedStance(state: GameState, stance: RangedStance): void {
  state.character.rangedStance = stance;
}

/** Setzt die Magie-Stance (Offensiv/Defensiv). */
export function setMagicStance(state: GameState, stance: MagicStance): void {
  state.character.magicStance = stance;
}

/** Summe aller Fertigkeits-Level = "Gesamtlevel". */
export function totalLevel(state: GameState, content: ContentDB): number {
  let sum = 0;
  for (const skillId of Object.keys(content.skills)) {
    sum += levelFromXp(state.skills[skillId]?.xp ?? 0);
  }
  return sum;
}

/**
 * TRANSIENTER Stats-Memo (PERF, Offline-Catch-up 2026-07-22): `computeStats` läuft mindestens
 * 1× PRO TICK (Regen in tick.ts/step, zusätzlich in combatStep) und kostete ~14 µs/Aufruf —
 * bei 288k Offline-Ticks (8 h) mehrere Sekunden Lade-Freeze. Da die Eingaben im Tick-Loop fast
 * nie wechseln (Level-Ups/Buff-Wechsel/Umrüsten sind selten gegen 10 Ticks/s), lohnt ein Memo.
 *
 * KORREKTHEITS-GESETZ (offline==online, bit-identisch): der Cache ist ein reiner
 * ERGEBNIS-IDENTISCHER Kurzschluss — er wird über einen vollständigen FINGERPRINT ALLER
 * Eingaben validiert, die die Berechnung liest (kein Dirty-Flag, keine manuelle Invalidierung,
 * nichts davon je im Save). Stimmt auch nur ein Element nicht überein, wird komplett frisch
 * gerechnet. computeStats zieht kein RNG → der Cache kann keine RNG-Sequenz verschieben.
 *
 * Fingerprint-Abdeckung (== Lese-Menge von computeStatsUncached):
 *  - Content-IDENTITÄTEN (skills/sets/affixes/suffixes/pets als Objekt-Referenzen) + je
 *    aufgelöster ItemDef-Referenz für Equipment/Buff-Items/Pet-Def — Content ist zur Laufzeit
 *    unveränderlich (nur Locale-Textfelder, einmalig beim Build); die Referenz-Checks fangen
 *    zusätzlich Test-Muster ab, die Test-Items zur Laufzeit injizieren/löschen/umdefinieren.
 *  - Skill-LEVEL aller Content-Skills + der explizit gelesenen Kampf-Skills (XP fließt
 *    ausschließlich über levelFromXp ein → das Level IST die wirksame Eingabe).
 *  - Ausrüstung (Slot-Belegung), ausgerüstete Instanzen (INHALTLICH via JSON — applyEnchant
 *    mutiert Instanzen in place, eine Referenz-Prüfung wäre stale), aktive Buffs (itemIds in
 *    Reihenfolge — nur die liest computeStats, remainingMs nicht), Basis-Attribute,
 *    Stil/Stances, Begleiter-Pet (+Besitz-Flag).
 * WeakMap auf die GameState-Identität: Klone/Test-States bekommen automatisch eigene Einträge;
 * nichts hält States am Leben. Das gecachte DerivedStats-Objekt wird geteilt zurückgegeben —
 * kein Aufrufer im Repo mutiert das Ergebnis (per Suche verifiziert, 2026-07-22).
 */
type StatsCacheKey = unknown[];
interface StatsCacheEntry {
  content: ContentDB;
  key: StatsCacheKey;
  stats: DerivedStats;
}
const statsCache = new WeakMap<GameState, StatsCacheEntry>();
/** Content-Skill-IDs je ContentDB (statisch) — erspart Object.keys-Allokation pro Tick. */
const contentSkillIdsCache = new WeakMap<ContentDB, string[]>();

function contentSkillIds(content: ContentDB): string[] {
  let ids = contentSkillIdsCache.get(content);
  if (!ids) {
    ids = Object.keys(content.skills);
    contentSkillIdsCache.set(content, ids);
  }
  return ids;
}

/**
 * EIN Walker für Fingerprint-AUFBAU (`match=false`: pusht in `key`) UND -VERGLEICH
 * (`match=true`: vergleicht positionsgenau gegen `key`) — bewusst EINE Funktion, damit
 * Aufbau- und Vergleichsstruktur nie auseinanderlaufen können (ein Struktur-Drift wäre ein
 * Korrektheits-Bug, kein Perf-Detail). Der Vergleichsmodus schreibt nichts (keine
 * Boxing-Allokationen für die XP-Doubles im Hot Loop) und bricht beim ersten Unterschied ab.
 * Gibt im match-Modus zurück, ob der Key VOLLSTÄNDIG übereinstimmt (inkl. exakter Länge).
 */
function walkStatsKey(state: GameState, content: ContentDB, key: StatsCacheKey, match: boolean): boolean {
  let i = 0;
  const visit = (v: unknown): boolean => {
    if (match) return key[i++] === v;
    key.push(v);
    return true;
  };
  const c = state.character;
  // Content-Identitäten (Objekt-Referenzen — Vergleich via ===).
  if (!visit(content.skills)) return false;
  if (!visit(content.sets)) return false;
  if (!visit(content.affixes ?? null)) return false;
  if (!visit(content.suffixes ?? null)) return false;
  if (!visit(content.pets ?? null)) return false;
  // Stil & Stances.
  if (!visit(c.combatStyle)) return false;
  if (!visit(c.rangedStance)) return false;
  if (!visit(c.magicStance)) return false;
  // Basis-Attribute.
  for (const id of ATTRIBUTE_IDS) {
    if (!visit(c.baseAttributes[id])) return false;
  }
  // Skill-Eingaben als ROH-XP (alle Content-Skills + die explizit gelesenen Kampf-Skills —
  // bewusste Duplikate sind harmlos, Aufbau und Vergleich laufen durch dieselbe Struktur).
  // XP fließt in die Berechnung ausschließlich über levelFromXp ein: XP unverändert ⇒ Level
  // unverändert ⇒ Ergebnis identisch. Roh-XP statt Level im Key spart die levelFromXp-Aufrufe
  // im Hot Loop; eine XP-Änderung ohne Level-Up erzeugt lediglich eine (korrekte) Extra-
  // Neuberechnung je Aktions-Abschluss/Kampftreffer — amortisiert unter 1 µs/Tick.
  for (const skillId of contentSkillIds(content)) {
    if (!visit(state.skills[skillId]?.xp ?? 0)) return false;
  }
  for (const skillId of BOOSTABLE_COMBAT_SKILL_IDS) {
    if (!visit(state.skills[skillId]?.xp ?? 0)) return false;
  }
  if (!visit(state.skills["vitality"]?.xp ?? 0)) return false;
  // Ausrüstung: Slot-Belegung + aufgelöste ItemDef-Referenz.
  for (const slot of EQUIP_SLOTS) {
    const itemId = c.equipment[slot];
    if (!visit(itemId ?? null)) return false;
    if (!visit(itemId ? (content.items[itemId] ?? null) : null)) return false;
  }
  // Ausgerüstete Instanzen: INHALTLICH fingerprinten (JSON) — applyEnchant/disenchant mutieren
  // Instanz-Objekte in place, eine reine Referenz-Prüfung würde stale. Ohne Instanzen: 13× null
  // (kein JSON-Aufwand im Normalfall).
  const instances = c.equippedInstances ?? {};
  for (const slot of EQUIP_SLOTS) {
    const inst = instances[slot];
    if (!visit(inst ? JSON.stringify(inst) : null)) return false;
  }
  // Aktive Buffs in Reihenfolge (computeStats liest nur itemId + dessen buff-Def).
  if (!visit(c.buffs.length)) return false;
  for (const b of c.buffs) {
    if (!visit(b.itemId)) return false;
    if (!visit(content.items[b.itemId] ?? null)) return false;
  }
  // Begleiter-Pet (+Besitz — nur besessene Pets wirken) + Pet-Def-Referenz.
  const petId = c.companionPetId ?? null;
  if (!visit(petId)) return false;
  if (!visit(petId && c.ownedPets?.[petId] ? 1 : 0)) return false;
  if (!visit(petId ? (content.pets?.[petId] ?? null) : null)) return false;
  // claude:2026-10-18T00:30:00+02:00 — zweiter Begleiter-Platz: aufgelöstes Pet (Besitz + Talent +
  // ≠ Platz 1 stecken in secondPet) — dessen skillEffect fließt über die pet*-Helfer in die Werte.
  if (!visit(secondPet(state, content))) return false;
  // match-Modus: der gespeicherte Key muss exakt aufgebraucht sein (Längen-Gleichheit).
  return !match || i === key.length;
}

/**
 * Abgeleitete Werte — memoisierter Einstieg (EINZIGE Aggregations-Quelle bleibt
 * computeStatsUncached darunter; dieser Wrapper ist ein ergebnis-identischer Cache).
 */
/**
 * Zauberfokus (Chef-GO 28.08.2026, bewusster Magier-Buff): Multiplikator, um den die Waffenspanne
 * einer MAGIEWAFFE mit der Intelligenz des Trägers wächst — `1 + spellFocus · int`. Liefert 1 für
 * alles andere: keine Waffe, Nicht-Magie-Stil (Nahkampf/Fernkampf bleiben unberührt, selbst wenn
 * ein Item das Feld fälschlich trüge), spellFocus fehlt/0/ungültig. Reine Funktion — computeStats
 * und die UI (ItemTooltip/Item-Wiki „Mit deinem INT") rechnen damit exakt dasselbe.
 */
export function spellFocusMult(
  item: Pick<ItemDef, "weaponStyle" | "spellFocus"> | null | undefined,
  int: number,
): number {
  if (!item || item.weaponStyle !== "magic") return 1;
  const focus = item.spellFocus ?? 0;
  if (!Number.isFinite(focus) || focus <= 0) return 1;
  return 1 + focus * Math.max(0, Number.isFinite(int) ? int : 0);
}

export function computeStats(state: GameState, content: ContentDB): DerivedStats {
  const entry = statsCache.get(state);
  if (entry && entry.content === content && walkStatsKey(state, content, entry.key, true)) {
    return entry.stats;
  }
  const key: StatsCacheKey = [];
  walkStatsKey(state, content, key, false);
  const stats = computeStatsUncached(state, content);
  statsCache.set(state, { content, key, stats });
  return stats;
}

/**
 * Reine Funktion: berechnet alle abgeleiteten Werte aus Attributen (Basis +
 * Skill-Bonus + Ausrüstung). Nichts hiervon wird gespeichert. Reine Hybrid-
 * Progression: keine spielerseitig verteilten Attributpunkte mehr.
 * Alle Formeln sind Platzhalter und später frei justierbar.
 */
function computeStatsUncached(state: GameState, content: ContentDB): DerivedStats {
  const c = state.character;
  const attr = emptyAttributeRecord(0);

  // 1) Innate Basis. Das Wachstum kommt rein aus Skills (Hybrid) + Ausrüstung.
  for (const id of ATTRIBUTE_IDS) {
    attr[id] = c.baseAttributes[id];
  }

  // 2) Hybrid: passiver Zuwachs aus den trainierten Fertigkeiten
  const trained = emptyAttributeRecord(0);
  for (const skill of Object.values(content.skills)) {
    if (!skill.trains) continue;
    trained[skill.trains] += levelFromXp(state.skills[skill.id]?.xp ?? 0);
  }
  for (const id of ATTRIBUTE_IDS) {
    // Itemization 2.0 §1: GANZE Punkte alle ATTRIBUTE_SKILL_DIVISOR (8) Level — identische
    // Rate wie das frühere floor(x/4)·0.5, nur ganzzahlig (Rungs alle 8 statt 4 Level).
    attr[id] += Math.floor(trained[id] / ATTRIBUTE_SKILL_DIVISOR);
  }

  // 3) Ausrüstungs-Boni (Attribut-Mods + flache Kampf-Boni) und aktiver Stil
  const eq = {
    meleeDamage: 0, rangedDamage: 0, magicDamage: 0, defense: 0, accuracy: 0, evasion: 0, maxHp: 0,
    maxMana: 0, hpRegenPerSec: 0, critChance: 0, critDamage: 0, attackIntervalMs: 0,
    lifesteal: 0,
    // Rüstungs-Trinität (Spec §3): Klassen-Schicht-Aggregatoren aus den ItemDef-Top-Level-Feldern
    // (NICHT EquipBonus). armorRating/evasionRating/wardCapacity summiert; blockChance als MAX (ein
    // Schild ⇒ kein Summieren). Der 2H-Melee-armorRating-Bonus wird separat behandelt (§5).
    armorRating: 0, evasionRating: 0, blockChance: 0, wardCapacity: 0,
    // Combat-Depth-Konter-Stats (Spec §3.3): Σ Waffen-Signatur (armorPen/precision/wardBreak) —
    // in der Return-Ableitung je auf ihren Cap geklemmt (ARMOR_PEN_CAP/PRECISION_CAP/WARD_BREAK_CAP).
    armorPen: 0, precision: 0, wardBreak: 0,
  };
  // Skill-Level-Boosts (Itemization 2.0 §4, OSRS-Stil): Σ aus Item-`skillBoost`, Set-`skillBoost`
  // und Suffix-Instanz-Rolls. Wirken NUR auf die Kampfterme unten (effektive Level) — Requirements/
  // combatLevel/XP/Freischaltungen lesen weiterhin die Basis-Level aus state.skills (§4.2).
  const boost: SkillBoostMap = {};
  const addBoost = (b: SkillBoostMap | undefined): void => {
    if (!b) return;
    for (const id of BOOSTABLE_COMBAT_SKILL_IDS) {
      if (b[id]) boost[id] = (boost[id] ?? 0) + (b[id] ?? 0);
    }
  };
  // Waffen 2.0 (itemization-parity-fix §1): trägt die Mainhand-Waffe eine Schadensspanne
  // (damageMin/damageMax), ist sie eine „Range-Form"-Waffe — die Spanne (und ihr ABSOLUTES
  // attackIntervalMs) ersetzt die alten bonus-Flats. Waffen OHNE Spanne (Alt-Content) laufen
  // unverändert über ihre Flats (Übergangs-Kompatibilität, bis der §3-Content-Apply landet).
  const mainhandItem = c.equipment.mainhand ? content.items[c.equipment.mainhand] : undefined;
  const weaponRange =
    mainhandItem &&
    typeof mainhandItem.damageMin === "number" &&
    typeof mainhandItem.damageMax === "number" &&
    Number.isFinite(mainhandItem.damageMin) &&
    Number.isFinite(mainhandItem.damageMax)
      ? {
          min: Math.max(0, mainhandItem.damageMin),
          max: Math.max(mainhandItem.damageMin, mainhandItem.damageMax),
        }
      : null;
  const addBonus = (b: EquipBonus): void => {
    eq.meleeDamage += b.meleeDamage ?? 0;
    eq.rangedDamage += b.rangedDamage ?? 0;
    eq.magicDamage += b.magicDamage ?? 0;
    eq.defense += b.defense ?? 0;
    eq.accuracy += b.accuracy ?? 0;
    eq.evasion += b.evasion ?? 0;
    eq.maxHp += b.maxHp ?? 0;
    eq.maxMana += b.maxMana ?? 0;
    eq.hpRegenPerSec += b.hpRegenPerSec ?? 0;
    eq.critChance += b.critChance ?? 0;
    eq.critDamage += b.critDamage ?? 0;
    eq.attackIntervalMs += b.attackIntervalMs ?? 0;
    eq.lifesteal += b.lifesteal ?? 0;
  };
  for (const slot of EQUIP_SLOTS) {
    const itemId = c.equipment[slot];
    if (!itemId) continue;
    const item = content.items[itemId];
    if (!item) continue;
    if (item.modifiers) {
      for (const id of ATTRIBUTE_IDS) attr[id] += item.modifiers[id] ?? 0;
    }
    if (item.bonus) {
      if (weaponRange && slot === "mainhand") {
        // Range-Form-Waffe: ihre Offensiv-Flats werden IGNORIERT (Doppelzähl-Schutz — der Wert
        // lebt in damageMin/Max bzw. im absoluten Waffentempo). Whitelist-Zeilen wie `lifesteal`
        // (Signatur-Effekte, §1.1) bleiben wirksam. Der Guard erzwingt leere Flats nach dem Apply.
        const {
          meleeDamage: _md,
          rangedDamage: _rd,
          magicDamage: _gd,
          accuracy: _acc,
          attackIntervalMs: _spd,
          ...whitelisted
        } = item.bonus;
        addBonus(whitelisted);
      } else {
        addBonus(item.bonus);
      }
    }
    addBoost(item.skillBoost);
    // Rüstungs-Trinität (Spec §3): Klassen-Schicht je Slot aggregieren. armorRating der MAINHAND wird
    // hier ausgelassen — eine Waffe (auch 2H-Melee) gibt seit Combat-Depth #221 KEINE Rüstungs-
    // Mitigation mehr (der frühere stil-gegatete 2H-Waffen-armorRating-Bonus ist entfernt, §1.1).
    // Schild-armorRating (offhand) zählt hier ganz normal mit. blockChance als MAX (nur der Schild trägt es).
    if (slot !== "mainhand") eq.armorRating += item.armorRating ?? 0;
    eq.evasionRating += item.evasionRating ?? 0;
    eq.wardCapacity += item.wardCapacity ?? 0;
    eq.blockChance = Math.max(eq.blockChance, item.blockChance ?? 0);
    // Combat-Depth-Konter-Signaturen (Spec §3.3): armorPen/precision/wardBreak sind Waffen-Signatur-
    // Felder (Haupt-Quelle = Mainhand-Waffe) → über ALLE Slots summiert (Guard: nur weaponStyle-Träger
    // tragen sie). Anders als armorRating wird die MAINHAND hier NICHT ausgelassen — die Waffe IST die Quelle.
    eq.armorPen += item.armorPen ?? 0;
    eq.precision += item.precision ?? 0;
    eq.wardBreak += item.wardBreak ?? 0;
  }
  // Instanz-Overlay-Pass: Affix-/Suffix-Boni der ausgerüsteten Item-Instanzen aggregieren.
  // Einzige Auflösungsstelle von Affix/Suffix-Stärke → Boni (via reinem instanceBonusDelta);
  // computeStats bleibt die EINZIGE Stat-Aggregations-Quelle. Defensiv: ohne equippedInstances
  // (Alt-Saves vor v38) oder ohne Affix-Content liefert der Delta leere Werte (no-op).
  const equippedInstances = c.equippedInstances ?? {};
  for (const slot of EQUIP_SLOTS) {
    const inst = equippedInstances[slot];
    if (!inst) continue;
    const delta = instanceBonusDelta(inst, content);
    addBonus(delta.bonus);
    addBoost(delta.skillBoost);
    for (const id of ATTRIBUTE_IDS) attr[id] += delta.modifiers[id] ?? 0;
    // Trinity-Overlay der Rüstungs-/Schild-Runen (AffixDef.trinityByTier via instanceBonusDelta):
    // ALLE VIER Achsen additiv auf die Basis (armorRating/evasionRating/wardCapacity/blockChance).
    // blockChance ist die VERZAUBERUNGS-Schicht ÜBER der Schild-Basis (Bollwerk-Rune) → additiv, NICHT
    // MAX (MAX machte die Rune auf einem High-Block-Schild wirkungslos, Basis ≥ Rune-Flat). Der
    // Endclamp BLOCK_CAP (unten) bounded die Summe. Die Basis-Fold (Z. ~265) bleibt MAX (ein Schild ⇒
    // kein Summieren). Das Klassen-Gate (applyEnchant §6.2) stellt sicher, dass eine Trinity-Rune nur auf
    // einem Teil sitzt, das denselben Stat schon trägt (z.B. armorRating-Rune nie auf einer Waffe).
    eq.armorRating += delta.trinity.armorRating;
    eq.evasionRating += delta.trinity.evasionRating;
    eq.wardCapacity += delta.trinity.wardCapacity;
    eq.blockChance += delta.trinity.blockChance;
  }
  // Aktive Buffs (Glyphen/Tränke): flache Kampf-Boni + (Armor-Iteration 2 §10.1) Attribute
  // (`modifiers`) und die Trinity-Defensiv-Schicht (`trinity`). Attribute fließen in die Attribut-
  // Summe, Trinity in die jeweiligen Aggregate (armorRating/evasionRating/wardCapacity/blockChance
  // additiv — das Bollwerk-Tonikum addiert seinen Block auf die Schild-Basis, Endclamp BLOCK_CAP unten,
  // NICHT MAX). Läuft VOR der Trinity-Ableitung unten (armorRating/dodge/block/maxWard),
  // damit ein Trank-Effekt die abgeleiteten Klassen-Werte tatsächlich anhebt.
  for (const buff of c.buffs) {
    const bf = content.items[buff.itemId]?.buff;
    if (!bf) continue;
    addBonus(bf.bonus);
    if (bf.modifiers) {
      for (const id of ATTRIBUTE_IDS) attr[id] += bf.modifiers[id] ?? 0;
    }
    if (bf.trinity) {
      eq.armorRating += bf.trinity.armorRating ?? 0;
      eq.evasionRating += bf.trinity.evasionRating ?? 0;
      eq.wardCapacity += bf.trinity.wardCapacity ?? 0;
      eq.blockChance += bf.trinity.blockChance ?? 0;
    }
  }

  // Set-Boni: genug Teile eines Sets getragen → Bonus zusätzlich.
  const equippedIds = new Set<ItemId>();
  for (const slot of EQUIP_SLOTS) {
    const id = c.equipment[slot];
    if (id) equippedIds.add(id);
  }
  for (const set of content.sets) {
    const count = set.pieces.reduce((n, p) => n + (equippedIds.has(p) ? 1 : 0), 0);
    if (count >= set.minPieces) {
      // LEGACY-Flats (bis zum §6-Content-Umbau) + Itemization-2.0-Attribute/Boost-Krönung.
      addBonus(set.bonus);
      if (set.modifiers) {
        for (const id of ATTRIBUTE_IDS) attr[id] += set.modifiers[id] ?? 0;
      }
      addBoost(set.skillBoost);
    }
  }

  // Pet (skillBoost, #276 §4.2 — ironmaw „Bonecrusher": power +2): GANZE effektive Bonus-Level für
  // EINEN Kampf-Skill, identisch zum Item-Boost-Muster („Ring of Power +2"). Fließt in denselben
  // `boost`-Aggregat wie Gear/Set/Suffix → wirkt NUR auf die Kampfterme unten; Requirements/
  // combatLevel/XP/Freischaltungen lesen weiter die Basis-Level (Anti-Exploit, §4.2-Regeln oben).
  for (const id of BOOSTABLE_COMBAT_SKILL_IDS) {
    const petBoost = petSkillBoost(state, content, id);
    if (petBoost > 0) boost[id] = (boost[id] ?? 0) + petBoost;
  }

  const style: WeaponStyle = mainhandItem?.weaponStyle || "melee";

  // 4) Direkte Kampf-Skill-Boni (zusätzlich zum Attribut-Training).
  // Itemization 2.0 §4.2 „effektives Level": die boostbaren Kampf-Skills lesen hier Basis-Level +
  // Σ Equip-/Set-/Suffix-Boost. Rüstungs-Trinität / Itemization 2.5 (Spec §3): der `defence`- und der
  // `magic_def`-Skill-Term ist aus defense UND evasion ENTFERNT — Defense kommt nur noch aus der
  // Platten-Klassen-Schicht (armorRating). Beide Skills bleiben als Requirement-/XP-Skill (Platten-/
  // Stoff-Tier-Gate) und werden weiterhin in `boost`/`skillBoosts` aggregiert (UI-Anzeige), speisen
  // aber KEINEN computeStats-Kampfterm mehr. `vitality` ist bewusst NICHT boostbar.
  const lvl = (id: string): number => levelFromXp(state.skills[id]?.xp ?? 0);
  const lvlEff = (id: BoostableCombatSkillId): number => lvl(id) + (boost[id] ?? 0);
  const sAttack = lvlEff("attack");
  const sPower = lvlEff("power");
  const sRanged = lvlEff("ranged");
  // Armor-Iteration 2 §9.1: Offensiv-Magie liest jetzt den `magic`-Skill (war `magic_off`).
  const sMagic = lvlEff("magic");
  // Warding-Skill (war `magic_def`) treibt den Ward-Regen (§9.2). Boostbar (effektives Level).
  const sWarding = lvlEff("warding");
  const sVitality = lvl("vitality");

  // Rüstungs-Trinität (Spec §1/§3): Klassen-Defensiv-Schicht ableiten. defMult (Defensiv-Stance) wirkt
  // wie bisher auf die Mitigation; Dodge/Block/Ward sind flache Klassen-Werte (kein Stance-Mult).
  const mainhandTwoHanded = !!mainhandItem?.twoHanded;
  // Combat-Depth #221: 2H-Melee bekommt KEINE Waffen-Rüstung mehr. Der frühere `twoHandMeleeArmorBonus`
  // (`weaponAR · min(1, plateWorn/4)`, an die getragene Platte gekoppelt) ist ENTFERNT — Mitigation
  // kommt jetzt ausschließlich aus der getragenen Platten-/Schild-Klassen-Schicht (`eq.armorRating`,
  // das die Mainhand oben ohnehin auslässt). Damit ist 2H der bewusste Glass-Cannon: nackt = 0 Armor,
  // voll-gepanzert = nur die 5-Teile-Platten-Mitigation, nie ein Waffen-AR-Bonus (§1.1). Der alte
  // `plateWorn/4`-Sonderpfad wird damit obsolet (nackter 2H = wirklich ungepanzert, ohne Sonderlogik).
  const armorRating = eq.armorRating;
  // Armor-Iteration 2 §5.1: Ausweichkurve diminishing (dieselbe Form wie die Mitigation, `x/(x+K)`).
  // E1 (evasion-tempo-taming-spec §3.1, #301): Kurve gestreckt (K 45→60) mit Asymptote DODGE_EFF_MAX
  // (0.5) ÜBER dem gesenkten Cap (0.75→0.40) — der Cap ist mit Voll-Investment (Σevr ≥ 240: Runen +
  // Tonikum) erreichbar, aber nur so; R99-Voll-Leder allein ~34,6 %. Dodge ist Voll-Vermeidung und
  // bleibt damit strikt unter BLOCK_CAP (0.5 bei nur −85 % Reduktion).
  const dodgeChance = Math.min(
    DODGE_CAP,
    (DODGE_EFF_MAX * eq.evasionRating) / (eq.evasionRating + K_DODGE),
  ); // Leder
  const blockChance = mainhandTwoHanded ? 0 : Math.min(BLOCK_CAP, eq.blockChance); // Schild nur bei 1H
  // Armor-Iteration 2 §2: WARD_CORE_PER_INT=0 ⇒ maxWard = Σ wardCapacity (Ward NUR aus Stoffgear,
  // kein INT-Kern mehr). Der Term bleibt konstanten-getrieben (WARD_CORE_PER_INT·int = 0).
  // claude:2026-10-18T02:00:00+02:00 — Frostgroll „Kältepanzer" (wardCapacityPct, 1.3.0): maxWard × (1 + Anteil);
  // ohne Stoff-Pool (0) wirkungslos, ohne Begleiter exakt der Alt-Wert.
  const wardPetPct = petWardCapacityPct(state, content);
  const maxWardBase = WARD_CORE_PER_INT * attr.int + eq.wardCapacity; // Stoff-Absorptionspool
  const maxWard = wardPetPct > 0 ? maxWardBase * (1 + wardPetPct) : maxWardBase;

  // Zauberreserve (Chef-GO 28.08.2026, design/zauberreserve-weisheit.md): Feldname bleibt `maxMana`,
  // Bedeutung ist ein statischer Wert wie Rüstung (kein Verbrauch mehr). Chef 29.08.2026: die Reserve
  // ist das Gegenstück zu Intelligenz und kommt NUR aus Weisheit: 30 + 10·WIS + Σ Boni (Ausrüstung/
  // Sets/Buffs; frühere manaRegen-Boni sind ×10 hier eingefaltet), × Pet-spellReserve. Intelligenz
  // bleibt reiner Zauberschaden (Grundschaden + Zauberfokus). Grund-Pool 30 unverändert. Die beiden
  // Magie-Haltungen lesen den Wert NACH allen Boni (Spec §2): Fokus → Zauberschaden, Abwehr → Ward-Regen.
  const maxMana = (30 + attr.wis * 10 + eq.maxMana) * petSpellReserveMult(state, content);
  const reserveDamageBonus = spellReserveDamageBonus(maxMana);
  const reserveWardRegenBonus = spellReserveWardRegenBonus(maxMana);
  // Weisheit = Status-Widerstand für ALLE Stile (Spec §3): 1 % je effektivem WIS-Punkt, Deckel 40 %.
  // combat.ts wendet ihn beim Anlegen von Gegner-Status auf den Spieler an (applyMonsterInflict).
  const statusResist = wisdomStatusResist(attr.wis);
  // Armor-Iteration 2 §9.2: Warding-Skill → Ward-Regen/s, ×1.5 in der Defensiv-Magie-Stance.
  // combat-dev (Phase B) wendet es pro Tick an (analog hpRegenPerSec); hier nur bereitstellen.
  // Gate-C #1: Cap NACH dem Stance-Mult klemmen — die Defensiv-Stance (×1.5) darf den in Spec §9.2
  // dokumentierten Deckel (WARDING_REGEN_CAP = 2.0/s) nicht überschreiten.
  // Abwehr-Haltung (Zauberreserve §2; Teiler 20 seit Chef 29.08.2026, Reserve aus Weisheit): zusätzlich +1 % Ward-Regen je 20 Reserve (Deckel +30 %) — als
  // Multiplikator NACH dem Warding-Cap, damit der Bonus auch am Endgame (Cap erreicht) sichtbar bleibt
  // (max 2.0 · 1.3 = 2.6/s, weiterhin ≪ Endgame-DPS-in). Nur in der defensiven Haltung angewandt.
  const wardRegenPerSec =
    Math.min(
      WARDING_REGEN_CAP,
      sWarding * WARDING_REGEN_PER_LEVEL * (c.magicStance === "defensive" ? WARDING_DEF_STANCE_MULT : 1),
    ) * (c.magicStance === "defensive" ? 1 + reserveWardRegenBonus : 1);

  // Combat-Stance-Boni (OSRS-artig) je Waffenstil + gewählter Stance — zentral in activeStanceMods.
  const sm = activeStanceMods(style, c);
  const accMult = sm.accMult;
  const dmgMult = sm.dmgMult;
  const defMult = sm.defMult;

  // Treffsicherheit skaliert mit dem OFFENSE-Skill des aktiven Stils (Waffe bestimmt `style`),
  // analog zum stil-abhängigen Schaden. Vorher floss pauschal der Attack-Skill ein, egal welcher
  // Stil — dadurch wuchs die Magie-Accuracy nie mit dem Magie-Skill (Balance-Audit B1, 2026-06-26).
  // Melee→Attack (unverändert), Ranged→Ranged, Magie→Magie-Offense; identisches Gewicht (·2).
  const offenseSkill = style === "ranged" ? sRanged : style === "magic" ? sMagic : sAttack;

  // 5) Abgeleitete Kampfwerte
  // Stat-Squish ÷10 (design/stat-squish-spec.md, S=10): alle INTRINSISCHEN Koeffizienten/Basis-
  // Terme ×0.1. Die eq.*-Terme behalten Koeffizient 1 — ihre Werte kommen bereits vor-gesquisht
  // aus dem Content (zweiseitiges Schema §3, keine Doppel-Teilung).
  // Itemization 2.0 §2: die Attribut-Koeffizienten bleiben auf der (halben) §6.2-Größenordnung —
  // Attribute sind jetzt ganzzahlig (Basis 3, +1 je 8 Trainer-Level). NEU geeicht sind NUR die
  // def/eva-Terme (con·0.3/wis·0.1/defence·0.1 bzw. dex·0.3/defence·0.05): die Gear-def/eva-Flats
  // entfallen im §6-Content-Umbau, CON/DEX tragen die Panzer-/Ausweich-Kurve.
  const meleeDamage = (0.1 + attr.str * 0.3 + sPower * 0.08 + eq.meleeDamage) * dmgMult;
  const rangedDamage = attr.dex * 0.24 + sRanged * 0.1 + eq.rangedDamage;
  // Armor-Iteration 2.1 #4: die Magie-Defensiv-Stance hat jetzt dmgMult 0.85 (−15 % Cast-Schaden,
  // Tradeoff für ×1.5 Ward-Regen). Damit dieser Malus tatsächlich in den Cast-Schaden fließt (charDamage
  // → attackDamageMin/Max, die combat.ts liest), muss magicDamage — wie meleeDamage — mit dmgMult
  // multipliziert werden. Fernkampf-Stances lassen dmgMult stets 1 (Tempo/Acc-Tradeoffs), daher bleibt
  // rangedDamage bewusst ohne dmgMult.
  const magicDamage = (attr.int * 0.34 + sMagic * 0.12 + eq.magicDamage) * dmgMult;
  // Zwei-Effekt-Modell: Pets verändern den Roh-Schaden NICHT mehr in computeStats.
  // Combat-Pet-Boni (armorRend/critDamage/bonusCritChance/…) wendet combat-dev über
  // `petCombatEffect` direkt im Fight an (siehe pets.ts). Nur der spellReserve-Multiplikator (maxMana) bleibt hier.
  // Waffen 2.0 §1.2: der CHARAKTER-Anteil C des aktiven Stils (Formeln unverändert; bei
  // Range-Form-Waffen fließen deren Flats oben nicht mehr in eq.* ein → C ist rein Charakter+Rüstung).
  const charDamage =
    style === "ranged" ? rangedDamage : style === "magic" ? magicDamage : meleeDamage;

  // Munitions-Zuschlag: ENTFERNT (#286 Ammo-Removal). Der Pfeilschaden ist seit dem
  // Waffen-Kurven-Pass (#287) direkt in die damageMin/Max-Spanne der Bögen eingebacken —
  // hier zählt nur noch Charakter-Anteil + Waffenspanne (kein Double-Dip mehr).

  // Schadensspanne des aktiven Stils (Waffen 2.0 §1.2):
  //  - Range-Form: min/max = C + Waffenspanne — die WAFFE definiert die Breite.
  //  - Legacy-Form (Alt-Content ohne damageMin/Max): Spanne aus dem Flat abgeleitet
  //    (max = Flat×DMG_MAX_HIT_MULT, min = max×DMG_ROLL_FLOOR) — bisheriges Wurf-Verhalten,
  //    nur dass der Roll jetzt zentral über attackDamageMin/Max läuft (Übergangs-Kompatibilität).
  //  - Zauberfokus (Chef-GO 28.08.2026): bei aktivem Stil "magic" wächst die WAFFENspanne mit INT —
  //    min UND max × (1 + spellFocus · int), s. spellFocusMult. Teil der Range-Form (die Waffe
  //    definiert die Breite), kein Sonderpfad in combat.ts; der Charakter-Anteil C bleibt unberührt.
  let attackDamageMin: number;
  let attackDamageMax: number;
  if (weaponRange) {
    const focusMult = style === "magic" ? spellFocusMult(mainhandItem, attr.int) : 1;
    attackDamageMin = Math.max(0, charDamage + weaponRange.min * focusMult);
    attackDamageMax = Math.max(attackDamageMin, charDamage + weaponRange.max * focusMult);
  } else {
    attackDamageMax = Math.max(0, charDamage * DMG_MAX_HIT_MULT);
    attackDamageMin = attackDamageMax * DMG_ROLL_FLOOR;
  }
  // Fokus-Haltung (Zauberreserve, Chef-GO 28.08.2026, Spec §2): in der OFFENSIVEN Magie-Haltung
  // wächst der gesamte Zauberschaden (Charakter-Anteil + Waffenspanne) um +1 % je 30 Reserve,
  // Deckel +15 % (spellReserveDamageBonus; Teiler 30 seit Chef 29.08.2026, Reserve aus Weisheit, CL-90-Kit ≈ +12 %). Ersetzt den Wegfall des „schwachen
  // Magiers" (der nie griff) und ist ein bewusster Magie-Buff (Spec §7). Nicht in der Abwehr-Haltung
  // (die hat dmgMult 0.85 + Ward-Regen-Bonus), nie für Nahkampf/Fernkampf.
  if (style === "magic" && c.magicStance !== "defensive" && reserveDamageBonus > 0) {
    attackDamageMin *= 1 + reserveDamageBonus;
    attackDamageMax *= 1 + reserveDamageBonus;
  }
  // claude:2026-10-18T02:00:00+02:00 — Eisenschlund „Eisenkiefer" (styleDamage, 1.3.0): Schaden des passenden Stils
  // × (1 + Anteil). Ersetzt den früheren skillBoost +2 Power. 0 ohne Begleiter ⇒ bit-identisch.
  const petStyleDmg = petStyleDamage(state, content, style);
  if (petStyleDmg > 0) {
    attackDamageMin *= 1 + petStyleDmg;
    attackDamageMax *= 1 + petStyleDmg;
  }
  // Mittel der Spanne = einzige Budget-/Anzeige-Quelle (Legacy: ≈ alter Flat, Abweichung < 0,002 %).
  const attackDamage = (attackDamageMin + attackDamageMax) / 2;

  // Stil-Eigenheiten: Nahkampf=Lebensraub (Kampf), Magie=Zauberreserve/Status, Fernkampf=Krit+Tempo.
  // Crit-Zähmung (design/crit-taming-spec.md §3.1/§5.2, #294): der Attribut-Beitrag lief vorher
  // LINEAR (S/100, ~1 pp je Punkt) gegen einen real erreichten 0.9-Cap → BiS-Endgame krittete mit
  // 90 %/533 % und one-hittete Bosse. Neu: Sättigungskurve `ATTR_MAX·S/(S+K)` (gleiche Form wie
  // Mitigation/Dodge, Asymptote 45 % < Cap), Gear/Suffix/Tonika bleiben additiv via eq.critChance
  // und kaufen den Rest zum harten CRIT_CHANCE_CAP (50 %). S-Definition unverändert.
  const critAttr = Math.max(0, attr.dex * 0.4 + attr.lck * 0.6);
  let critChance = clamp(
    (CRIT_CHANCE_ATTR_MAX * critAttr) / (critAttr + CRIT_CHANCE_ATTR_K) + eq.critChance,
    0,
    CRIT_CHANCE_CAP,
  );
  // Tempo-Modell (Waffen 2.0 §1.4): Range-Form-Waffen tragen ihr Tempo ABSOLUT
  // (`ItemDef.attackIntervalMs`, Default 3000); Legacy-Waffen + alle Nicht-Waffen-Quellen
  // (Suffix „Wolf", Buffs, Rüstung) bleiben DELTAS in eq.attackIntervalMs.
  const weaponBaseMs = weaponRange ? (mainhandItem?.attackIntervalMs ?? 3000) : 3000;
  // T1 (evasion-tempo-taming-spec §3.5 + CHEF-ENTSCHEID −20 %, #301): der DEX-Term läuft auf einer
  // Sättigungskurve (statt linear dex·40 — dex 105 gab −4200 ms, JEDE Waffe klebte am 800er-Boden),
  // und ALLE Flat-Quellen zusammen (DEX-Kurve + Suffixe + Tonika/Buffs via eq.attackIntervalMs)
  // drücken das Intervall max. TEMPO_REDUCTION_CAP (20 %) unter die WAFFEN-Basis — 2H bleibt
  // spürbar 2H (voidwarden_blade 3650 ⇒ nie unter 2920 ms), Dolch bleibt der schnellste Melee.
  // Die Stance-/Stil-Mults (unten) bleiben bewusst AUSSERHALB des relativen Bodens (§3.5).
  const dexTempoMs = (TEMPO_DEX_MS_MAX * attr.dex) / (attr.dex + TEMPO_DEX_K);
  let attackIntervalMs = clamp(
    Math.max(weaponBaseMs * (1 - TEMPO_REDUCTION_CAP), weaponBaseMs - dexTempoMs + eq.attackIntervalMs),
    ATTACK_INTERVAL_FLOOR_MS,
    ATTACK_INTERVAL_CEIL_MS,
  );
  // Basis-Evasion = Accuracy-Contest-Wert (Trefferchance ALLER Stile), rein aus DEX-Kern + Gear —
  // KEIN flacher Stil-Bonus. Rüstungs-Trinität / Itemization 2.5 (Spec §1.3): der `defence`-Skill-Term
  // ist hier ENTFERNT; die Leder-Voll-Vermeidung lebt getrennt in `dodgeChance` (evasionRating), nicht
  // im Accuracy-Contest. Der frühere Fernkampf-`evasion += 5` blieb schon vorher draußen (Glass-Cannon).
  // E3 (evasion-tempo-taming-spec §3.3, #301): DEX-Beitrag auf Sättigungskurve (Asymptote 25) statt
  // linear dex·0.3 — Frühspiel quasi identisch (dex 5: 1,6 statt 1,5), Endgame-dex-Stacking kann den
  // Contest nie mehr ersticken (dex 92: 13,8 statt 27,6). MIN_HIT_CHANCE bleibt reine Degenerate-Rail.
  const evasion = 1 + (EVASION_ATTR_MAX * attr.dex) / (attr.dex + EVASION_ATTR_K) + eq.evasion;
  if (style === "ranged") {
    // höhere Krit-Chance: +RANGED_CRIT_BONUS, auf denselben CRIT_CHANCE_CAP wie Melee/Magie
    // geclampt (Ranged-„höhere-Krit"-Identität, Parität-Fix Tester-Sweep 2026-06-28; #294:
    // unter dem Cap — Normalfall ohne Voll-Suffix-Stack — bleiben die +6 pp voll wirksam).
    critChance = Math.min(CRIT_CHANCE_CAP, critChance + RANGED_CRIT_BONUS);
    attackIntervalMs = Math.max(RANGED_INTERVAL_FLOOR_MS, attackIntervalMs * 0.90); // schnellere Schüsse
  }
  // Stance-Tempo: Präzise/Defensiv langsamer, Schnell schneller (auf alle Stile anwendbar).
  // Stil-/Stance-Mults liegen bewusst AUSSERHALB des relativen T1-Bodens (§3.5) — nur die
  // absoluten Rails (Boden/Deckel) klemmen hier noch.
  attackIntervalMs = clamp(attackIntervalMs * sm.speedMult, ATTACK_INTERVAL_FLOOR_MS, ATTACK_INTERVAL_CEIL_MS);

  return {
    attributes: attr,
    // Aktive Skill-Boosts (bereits in die Terme oben eingerechnet) — für die UI-Anzeige „(+2)".
    skillBoosts: boost,
    style,
    attackDamage,
    attackDamageMin,
    attackDamageMax,
    // Waffen 2.0 §1.2: min/maxHit = die UNGERUNDETE Spanne (Anzeige rundet auf 1 Dezimale, §7.1) —
    // damit ist jeder +1-Boost/-Punkt sichtbar (P3-Fix §8.1). combat.ts rollt in derselben Spanne.
    maxHit: attackDamageMax,
    minHit: attackDamageMin,
    maxHp: 5 + attr.con * 2 + (sVitality - 1) * 0.3 + eq.maxHp,
    // Zauberreserve (s. Herleitung oben; Feldname bleibt `maxMana`, UI-Label „Zauberreserve").
    maxMana,
    // Haltungs-Boni aus der Reserve (immer berechnet für den Tooltip; angewandt je Haltung oben) und
    // der Weisheits-Status-Widerstand (combat.ts liest ihn in applyMonsterInflict).
    spellReserveDamageBonus: reserveDamageBonus,
    spellReserveWardRegenBonus: reserveWardRegenBonus,
    statusResist,
    // manaRegen: ENTFERNT (Zauberreserve 28.08.2026) — Mana wird nicht mehr verbraucht, also auch
    // nicht regeneriert; tickPlayerRegen hält `character.mana` auf maxMana.
    // HP-Regen/Sek rein additiv aus Ausrüstung/Set/Buffs (kein Attribut-Beitrag) → 0 ohne Quelle,
    // damit Bestands-Saves/Fixtures unverändert bleiben. Angewandt pro Tick in tick.ts + combat.ts.
    hpRegenPerSec: eq.hpRegenPerSec,
    meleeDamage,
    rangedDamage,
    magicDamage,
    // Rüstungs-Trinität / Itemization 2.5 (Spec §1.1/§3): Mitigation kommt AUSSCHLIESSLICH aus der
    // Platten-Klassen-Schicht (armorRating + 2H-Melee-Bonus), · defMult (Defensiv-Stance). KEIN
    // Attribut-/Skill-/eq.defense-Term mehr — CON zahlt nur noch auf maxHp. combat.ts rechnet daraus
    // die Reduktion `def/(def+K)` (gedeckelt) wie gehabt.
    defense: armorRating * defMult,
    // Roh-Armor VOR Reduktion (UI/Tooltip) + die drei anderen Klassen-Schichten (Spec §2.3).
    armorRating,
    maxWard,
    dodgeChance,
    blockChance,
    wardRegenPerSec,
    // Accuracy-Umbau (Waffen 2.0 §1.2): offenseSkill·0.2 → 0.35 ersetzt die entfallenden
    // Waffen-acc-Flats (die alten Leitern wuchsen ~0.15·req) UND UNGERUNDET, damit +1-Attack-Boosts
    // nie mehr im round() verschluckt werden (P3 „Rundungs-Schlucker", §8.1). Anzeige rundet (§7.3).
    accuracy: (5 + attr.dex * 0.6 + offenseSkill * 0.35 + eq.accuracy) * accMult,
    evasion,
    critChance,
    // Crit-Zähmung #294: LCK-Faktor 0.04 → 0.01 (LCK double-dippte Chance UND Schaden; 25 lck
    // kauften +100 pp Schaden) und harter Cap 2.5 (vorher UNGECAPPT → 533 % am BiS-Endgame).
    // Untergrenze 1: ein „Krit" darf nie schwächer als ein Normal-Hit werden (negative
    // eq.critDamage-Quellen / Test-Offhands — analoge Hygiene zur critChance-Untergrenze 0).
    critDamage: clamp(CRIT_DAMAGE_BASE + attr.lck * CRIT_DAMAGE_PER_LCK + eq.critDamage, 1, CRIT_DAMAGE_CAP),
    attackIntervalMs,
    // Lebensraub: additiv aus Ausrüstung/Set/Buffs + Pet (lifesteal ≤2 %, #276 §4.2 — gorehound
    // „Blood Tithe"), hart auf 100 % gedeckelt. computeStats bleibt die EINZIGE Aggregations-Stelle.
    lifestealPct: clamp(eq.lifesteal + petLifesteal(state, content), 0, 1),
    // Pet (damageReduction ≤4 %, #276 §4.2 — carapace „Stoneshell" 3 %): multiplikative Schadens-
    // reduktion des Spielers. combat-dev (Schritt 2) wendet sie NACH Armor/Ward/Block an:
    // `damage = max(1, round(damage × (1 − dr)))`. 0 ohne passendes Pet.
    damageReduction: petDamageReduction(state, content),
    // Combat-Depth-Konter-Stats (Spec §3.3): Σ Waffen-Signatur, je auf seinen Cap geklemmt (und
    // NaN-/negativ-fest via clamp). combat.ts (Phase B) wendet sie gegen die Gegner-Trinität an.
    armorPen: clamp(eq.armorPen, 0, ARMOR_PEN_CAP),
    precision: clamp(eq.precision, 0, PRECISION_CAP),
    wardBreak: clamp(eq.wardBreak, 0, WARD_BREAK_CAP),
  };
}

/** Aktuell aktive Sets (genug Teile getragen) — für die Anzeige im Charakterblatt. */
export function activeSets(state: GameState, content: ContentDB): SetDef[] {
  const equipped = new Set(
    Object.values(state.character.equipment).filter((id): id is ItemId => !!id),
  );
  return content.sets.filter(
    (s) => s.pieces.reduce((n, p) => n + (equipped.has(p) ? 1 : 0), 0) >= s.minPieces,
  );
}

/** Hält das Gesamtlevel aktuell. (Attributpunkte gibt es nicht mehr — Werte kommen aus Skills & Items.) */
export function syncProgression(state: GameState, content: ContentDB): void {
  state.character.totalLevel = totalLevel(state, content);
}
