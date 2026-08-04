import type {
  CombatEvent,
  CombatState,
  ContentDB,
  EliteCodexEntry,
  EliteVariantDef,
  EliteZoneState,
  GameState,
  ItemInstance,
  MonsterDef,
  RngState,
} from "@hearthforge/shared";
import {
  COMBAT_LOG_MAX,
  ELITE_BLOODMOON_UNIQUE_BONUS,
  ELITE_BOUNTY_TOKENS,
  ELITE_UNIQUE_DROP_CHANCE_DEFAULT,
  ELITE_WILDHUNT_COOLDOWN_SPEED_MULT,
  ELITE_WINDOW_MS,
  TICK_MS,
  createPetAbilityRuntime,
  eliteZoneCooldownBand,
} from "@hearthforge/shared";
import { nextFloat, nextInt } from "./rng";
import { mintInstanceId, intakeInstance } from "./enchant";
import { createSuffixInstance, rollSuffix, tryCraftSuffix } from "./suffix";
import { grantLoot, sendLetter } from "./mail";
import { markDropSeen } from "./drops";
import { isZoneUnlocked } from "./zones";
import { blessingForTime, shrineAmplifiedMult } from "./blessing";
import { campShrineBonus } from "./camp";

/**
 * Elite-/World-Spawns („Champions des Reach", design/elite-spawns-concept.md) — Phase 1: das
 * VERHALTENS-NEUTRALE Fundament (logic-dev). `ContentDB.elites` ist Phase 1 LEER, also spawnt hier
 * de facto NICHTS — das komplette Zyklus-/Kill-Fundament ist aber bereits scharf, damit content-dev
 * (Phase 2) nur noch Varianten-Zeilen ergänzen muss und ui-dev (Phase 3) gegen einen stabilen
 * Breadcrumb/State-Contract bauen kann.
 *
 * RNG-Disziplin (KRITISCH, Determinismus-/offline==online-Gesetz): JEDER Zufalls-Zug dieses Moduls
 * läuft über `state.eliteRng` — NIE über `state.rng`. Der Elite-ZYKLUS (`tickEliteSpawns`) läuft
 * ausschließlich online (tick.ts `step()`, hinter dem `offline`-Guard) — würde er `state.rng` ziehen,
 * verschöbe er bei aktivem Spiel die Grind-Loot-Sequenz gegenüber einem rein offline nachgeholten
 * Fenster derselben Dauer. Ein bereits LAUFENDER Elite-Kampf (combatStep/onEliteKilled) ist davon
 * unabhängig: er ist spielerseitig ausgelöst (kein automatischer Tick-Prozess) und darf auch offline
 * zu Ende gekämpft werden (Konzept §1.2 „spielerfreundlich") — sein Basis-Loot (die UNVERÄNDERTE
 * Zonen-Loot-Tabelle des Basis-Monsters) rollt daher ganz normal über `state.rng`, wie jeder andere
 * Kampf auch; NUR die elite-EIGENEN Zusatz-Belohnungen (garantierter Unique, extraLoot) laufen über
 * `eliteRng`.
 *
 * Zyklus je Zone (Muster paragon.ts-Doku-Stil): Ruhe (`{cooldownMs}`) → bei Fälligkeit + Zone
 * freigeschaltet + ≥1 Variante im Content → Aktiv (`{variantId, remainingMs}`) → bei Ablauf ODER
 * Kill → zurück zu Ruhe mit frischem, randomisiertem Cooldown (PER-ZONE-Band, s.
 * `eliteZoneCooldownBand`/`ELITE_ZONE_COOLDOWN_BANDS`, shared — Werte aus
 * design/elite-balance-spec.md §3). Jede Zone rotiert unabhängig. Das Verfügbarkeitsfenster selbst
 * ist FEST `ELITE_WINDOW_MS` (15 Min, keine Varianz) — ein Spawn kostet daher nur EINEN eliteRng-Zug
 * (Varianten-Wahl).
 *
 * „Jagd-Paket"-Erweiterung (selber v72-Bump, Chef-GO 2026-07-22, s. SAVE_VERSION-Changelog „FÜNFTER
 * NACHTRAG" in shared): (S1) Segen-Synergie mit den Tages-Segen (blessing.ts) — bloodmoon hebt die
 * effektive Unique-Drop-Chance an (`ELITE_BLOODMOON_UNIQUE_BONUS`), wildhunt beschleunigt die
 * Zonen-Ruhe-Cooldowns (`ELITE_WILDHUNT_COOLDOWN_SPEED_MULT`) — beide rein über das neue optionale
 * `nowMs`-Argument von `tickEliteSpawns`/`onEliteKilled` (Muster `combatStep`/`skillingStep`: fehlt
 * es, ist der Effekt neutral). (S2/M) Champion-Codex (`state.eliteCodex`) — Sichtungen/Kills/
 * Uniques/schnellster Kill je Variante. (S3) Kopfgeld — jeder Elite-Kill zahlt zusätzlich
 * `ELITE_BOUNTY_TOKENS` Quest-Tokens. (L) Raben-Post — der erste Champion-Kill bzw. der erste
 * Unique-Fund eines Spielstands lösen je EINEN Brief aus (`sendLetter`, engine/mail.ts).
 */

/** Deterministischer Ruhe-Cooldown-Wurf im PER-ZONE-Band (ausschließlich `eliteRng`). */
function rollCooldownMs(rng: RngState, zoneId: string): number {
  const band = eliteZoneCooldownBand(zoneId);
  return nextInt(rng, band.minMs, band.maxMs);
}

/**
 * „Jagd-Paket" S2 — wildhunt-Segen-Multiplikator auf den Zonen-Ruhe-Cooldown-Dekrement (s. shared
 * `ELITE_WILDHUNT_COOLDOWN_SPEED_MULT`-Doku). Ohne `nowMs` (Alt-Aufrufer/Tests/Sim-Läufe) ⇒ 1,
 * bit-identisch zum Vorher-Zustand (Muster `blessingMult`). KEIN RNG-Zug.
 *
 * SCHREIN-ERSATZ (Das Lager, Chef-Entscheid K2 — encampment-konzept.md „Balance-Korrekturen" 2):
 * wildhunt ist ein KAMPF-Segen (+10 % Angriffstempo) und darf vom Schrein NICHT verstärkt werden
 * (Eiserne Regel 3). Damit der Schrein an einem Freitag nicht wirkungslos ist, verstärkt er
 * stattdessen GENAU HIER — die Spawn-FREQUENZ der Elites, kein Kampfwert: 1.25 → 1.275/1.30/1.325
 * (Bonus-Anteil × (1 + Stufe·0.10), exakt die Zahlen aus balance.md §1/K2). Ohne Schrein bzw. an
 * Nicht-wildhunt-Tagen exakt der Alt-Wert (`shrineAmplifiedMult` lässt Basis 1 unverändert).
 */
function wildhuntCooldownMult(
  state: GameState,
  content: ContentDB,
  nowMs: number | undefined,
): number {
  if (nowMs === undefined) return 1;
  if (blessingForTime(nowMs).id !== "wildhunt") return 1;
  return shrineAmplifiedMult(ELITE_WILDHUNT_COOLDOWN_SPEED_MULT, campShrineBonus(state, content));
}

/**
 * „Jagd-Paket" S1 — bloodmoon-Segen-Bonus auf die effektive Unique-Drop-Chance (s. shared
 * `ELITE_BLOODMOON_UNIQUE_BONUS`-Doku). Ohne `nowMs` ⇒ 0 (kein Bonus, bit-identisch zum
 * Vorher-Zustand). KEIN RNG-Zug — der Drop-Chance-WURF selbst feuert davon unabhängig immer
 * (s. `onEliteKilled`-Doku unten).
 */
function bloodmoonUniqueBonus(nowMs: number | undefined): number {
  if (nowMs === undefined) return 0;
  return blessingForTime(nowMs).id === "bloodmoon" ? ELITE_BLOODMOON_UNIQUE_BONUS : 0;
}

/**
 * Champion-Codex-Eintrag einer Variante — lazy angelegt bei Erstzugriff (Muster `eliteZones ??= {}`
 * in `tickEliteSpawns`). Mutiert `state.eliteCodex` direkt (Referenz-Rückgabe, Aufrufer inkrementiert
 * die gewünschten Felder selbst).
 */
function codexEntry(state: GameState, variantId: string): EliteCodexEntry {
  const codex = (state.eliteCodex ??= {});
  let entry = codex[variantId];
  if (!entry) {
    entry = { sightings: 0, kills: 0, uniques: 0, fastestKillMs: null };
    codex[variantId] = entry;
  }
  return entry;
}

/** Summe eines Zählfelds über ALLE Codex-Einträge (für die „war das der ERSTE …?"-Trigger der
 *  Raben-Post, s. `onEliteKilled` — ausgewertet VOR dem Inkrement der laufenden Variante). */
function codexTotal(codex: Record<string, EliteCodexEntry> | undefined, field: "kills" | "uniques"): number {
  if (!codex) return 0;
  let sum = 0;
  for (const entry of Object.values(codex)) sum += entry[field];
  return sum;
}

/**
 * Initialisiert `state.eliteZones` für ALLE `content.zones` über den NORMALEN, staffelnden Band-Roll
 * (Muster: JEDE Zone würfelt unabhängig innerhalb IHRES EIGENEN Cooldown-Bands, `rollCooldownMs`) —
 * die Zonen-Bänder selbst unterscheiden sich bereits je Zone (55–75 Min Pastures bis 100–120 Min
 * Idol Hall, design/elite-balance-spec.md §3), das allein entzerrt die erste Fälligkeit ausreichend
 * (kein zusätzlicher Sub-Band-Trick mehr nötig, anders als beim ursprünglichen globalen [60,120]-
 * Min-Band). Genutzt von der v71→v72-MIGRATION (Alt-Save — „bei Bestandsspielern normal staffeln,
 * kein Früh-Haken", Chef-Nachtrag 2026-07-22) UND vom lazy Content-Drift-Backfill in
 * `tickEliteSpawns`. Nutzt AUSSCHLIESSLICH `rng` (Aufrufer übergibt `state.eliteRng`) — zieht NIE
 * `state.rng` (Determinismus-/offline==online-Gesetz). Frische Saves nutzen STATTDESSEN
 * `initEliteZonesEarlyHook` (s.u.).
 */
export function initEliteZonesStaggered(content: ContentDB, rng: RngState): Record<string, EliteZoneState> {
  const out: Record<string, EliteZoneState> = {};
  for (const zone of content.zones) {
    out[zone.id] = { cooldownMs: rollCooldownMs(rng, zone.id) };
  }
  return out;
}

/**
 * Initialisiert `state.eliteZones` für ALLE `content.zones` über die FRÜH-HAKEN-Formel (NUR
 * `createGame`, Konzept §1.4 + Chef-GO 2026-07-22, design/elite-balance-spec.md §3): statt des
 * vollen Ruhe-Cooldown-Bands bekommt JEDE Zone ihren ERSTEN Timer über
 * `15 + offsetMinutes(Zone) + eliteRng·10` Minuten — `offsetMinutes` steigt in fester
 * Zonen-Reihenfolge um 8 Min je Zone (0/8/16/…/72, `ELITE_ZONE_COOLDOWN_BANDS`). Damit fällt das
 * ERSTE Pastures-Fenster eines frischen Saves garantiert nach ~15–25 Min AKTIVER Spielzeit (der
 * Refund-Fenster-Moment, „Whoa, was ist DAS?"), die übrigen Zonen folgen entzerrt bis ~100 Min.
 * NACH diesem allerersten Spawn/Ablauf greift wieder der normale `rollCooldownMs`-Band-Roll
 * (Despawn-Pfade in `tickEliteSpawns`/`onEliteKilled` kennen die Früh-Haken-Formel nicht — sie ist
 * REIN eine Erst-Initialisierungs-Regel). Migrationen von Alt-Saves nutzen STATTDESSEN
 * `initEliteZonesStaggered` (kein Früh-Haken für Bestandsspieler — sie sind längst über die
 * Refund-Phase hinaus). Nutzt AUSSCHLIESSLICH `rng` (Aufrufer übergibt `state.eliteRng`) — zieht NIE
 * `state.rng`.
 */
export function initEliteZonesEarlyHook(content: ContentDB, rng: RngState): Record<string, EliteZoneState> {
  const out: Record<string, EliteZoneState> = {};
  for (const zone of content.zones) {
    const band = eliteZoneCooldownBand(zone.id);
    const minutes = 15 + band.offsetMinutes + nextFloat(rng) * 10;
    out[zone.id] = { cooldownMs: Math.round(minutes * 60_000) };
  }
  return out;
}

const ELITE_RNG_SEED_MIX = 0x454c4954; // "ELIT" als Hex — beliebige Streu-Konstante, keine Bedeutung.

/**
 * Deterministische Ableitung des Elite-RNG-Seeds aus dem Haupt-RNG-Seed/-Zustand — LIEST nur eine
 * bereits vorhandene Zahl (KEIN nextFloat/nextInt-Zug!), verschiebt `state.rng` also NIE (Save-Kompat-
 * /Determinismus-Gesetz). Reine Bit-Mischung (XOR + Konstante, `>>> 0` hält den mulberry32-Zustand
 * im validen uint32-Bereich). Genutzt von `createGame` (aus dem übergebenen Welt-Seed — VOR
 * `createRng`, also identisch zu `state.rng.state`) UND der v72-Migration (aus dem bereits geladenen
 * `state.rng.state` eines Alt-Saves) — dieselbe Formel, damit ein frischer Save und ein „durch
 * Migration nachgerüsteter" Save mit identischem Ausgangs-Seed exakt denselben Elite-RNG-Strom
 * bekämen (kein Sonderfall zwischen den beiden Aufrufern).
 */
export function deriveEliteRngSeed(mainSeed: number): number {
  return (mainSeed ^ ELITE_RNG_SEED_MIX) >>> 0;
}

/**
 * Alle Elite-Varianten einer Zone (deterministisch nach `id` sortiert — Muster `suffixPool`: die
 * Auswahl darf nicht von der Objekt-Einfügereihenfolge in `content.elites` abhängen).
 */
export function eliteVariantsForZone(content: ContentDB, zoneId: string): EliteVariantDef[] {
  const all = content.elites;
  if (!all) return [];
  const out: EliteVariantDef[] = [];
  for (const variant of Object.values(all)) {
    if (variant.zone === zoneId) out.push(variant);
  }
  out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return out;
}

/**
 * Synthetische, formel-skalierte Monster-Instanz einer Elite-Variante (Muster `paragonScaledMonster`,
 * engine/paragon.ts): `{ ...base, maxHp/damage/accuracy?/defense?/evasion?/wardCapacity?/xp/gold ×
 * statMults/xpMult/goldMult }`, plus die optionalen Achsen `regenMult`/`inflictOverride`/
 * `enrageDamageMultOverride`. JEDE Achse ist NUR wirksam, wenn die Variante sie EXPLIZIT setzt UND
 * (bei wardCapacity/regen/enrage) der Basis-Mob das Feld überhaupt trägt — sonst bleibt exakt der
 * vom `...base`-Spread übernommene Basis-Wert stehen (Phase-1.5-Vertrag, Chef-Auftrag 2026-07-22:
 * „Achsen nur anwenden, wo gesetzt; Basis-Verhalten sonst unverändert").
 * `loot` bleibt BEWUSST die UNVERÄNDERTE Basis-Zonen-Loot-Tabelle (Konzept §3.3 „↑ Chance auf
 * reguläre Chase-Items der Zone") — sie rollt im normalen Kill-Pfad ganz normal über `state.rng`
 * (kein Doppel-Ertrag-Leck wie beim Paragonturm, weil ein Elite-Kampf spielerseitig ausgelöst ist,
 * kein automatischer Tick-Prozess; s. Moduldoku oben). Identität (id/Name/level/resist/family/
 * interval/Art) bleibt das Basis-Monster — `id` unverändert hält Kill-Credit (monsterKills/Slayer/
 * Bestiarium) automatisch konsistent (Muster Paragon/Dungeon-Varianten). Rein lesend, KEIN RNG.
 * `null` bei fehlender Variante/fehlendem Basis-Monster (Content-Drift/Save-Edit).
 */
export function eliteScaledMonster(content: ContentDB, variantId: string): MonsterDef | null {
  const variant = content.elites?.[variantId];
  if (!variant) return null;
  const base = content.monsters[variant.baseMonsterId];
  if (!base) return null;
  const m = variant.statMults;
  const scaled: MonsterDef = {
    ...base,
    maxHp: Math.max(1, Math.round(base.maxHp * m.hp)),
    damage: base.damage * m.damage,
    accuracy: m.accuracy ? base.accuracy * m.accuracy : base.accuracy,
    defense: m.defense ? Math.round(base.defense * m.defense) : base.defense,
    evasion: m.evasion ? Math.round(base.evasion * m.evasion) : base.evasion,
    xp: variant.xpMult ? Math.round(base.xp * variant.xpMult) : base.xp,
    gold: variant.goldMult ? Math.round(base.gold * variant.goldMult) : base.gold,
  };
  // Ward-Multiplikator (Phase-1.5, elite-balance-spec.md §0/§1 — für Caster-Basen essenziell, s.
  // Feld-Doku EliteVariantDef.statMults in shared): NUR wirksam, wenn die Variante ihn setzt UND
  // der Basis-Mob überhaupt Ward trägt (sonst gäbe `undefined * mult` NaN — kein Basis-Ward heißt
  // nichts zu skalieren, No-op).
  if (m.wardCapacity && base.wardCapacity) {
    scaled.wardCapacity = Math.round(base.wardCapacity * m.wardCapacity);
  }
  // Regen-Multiplikator (Phase-1.5, elite-balance-spec.md §1 „Zäh"/„Chor"-Varianten): wirkungslos
  // ohne Basis-`regen` (nichts zu skalieren, Muster wardCapacity/enrage).
  if (variant.regenMult !== undefined && base.regen !== undefined) {
    scaled.regen = base.regen * variant.regenMult;
  }
  // Enrage-Override (Chef-Nachtrag „Spike-Kill-Schutz", elite-balance-spec.md §7 P4): NUR
  // damageMult wird ersetzt (belowHpPct bleibt Identität, vom Basis-Mob vererbt). Ohne das Feld
  // bleibt exakt der vom `...base`-Spread bereits übernommene Basis-enrage unangetastet. Wirkungslos
  // ohne Basis-`enrage` (nichts zu überschreiben).
  if (base.enrage && variant.enrageDamageMultOverride !== undefined) {
    scaled.enrage = { belowHpPct: base.enrage.belowHpPct, damageMult: variant.enrageDamageMultOverride };
  }
  // Inflict-Override (Phase-1.5, elite-balance-spec.md §1): ERSETZT das komplette inflict-Objekt
  // (Ersatz eines vererbten ODER Neuzugang, falls die Basis gar keinen inflict trägt) — kein
  // Teil-Merge. Ohne das Feld bleibt der vom `...base`-Spread übernommene Basis-inflict (auch
  // „keiner") unverändert.
  if (variant.inflictOverride) {
    scaled.inflict = { ...variant.inflictOverride };
  }
  return scaled;
}

/**
 * Auflösung des Gegners eines LAUFENDEN Elite-Kampfs (Andockstelle für combatStep, Muster
 * `paragonCombatMonster`): rekonstruiert die skalierte Instanz deterministisch aus `eliteVariantId`.
 * Liefert `undefined`, wenn die Variante/das Basis-Monster nicht mehr existiert ODER die skalierte
 * Id nicht mehr zur persistierten `monsterId` passt (Content-Änderung/Save-Edit) — combatStep beendet
 * den Kampf dann sauber.
 */
export function eliteCombatMonster(state: GameState, content: ContentDB): MonsterDef | undefined {
  const variantId = state.combat.eliteVariantId;
  if (!variantId) return undefined;
  const scaled = eliteScaledMonster(content, variantId);
  return scaled && scaled.id === state.combat.monsterId ? scaled : undefined;
}

/** Zone zurück in Ruhe mit einem frischen, über `eliteRng` im PER-ZONE-Band gewürfelten Cooldown. */
function despawnEliteZone(state: GameState, zoneId: string): void {
  state.eliteZones[zoneId] = { cooldownMs: rollCooldownMs(state.eliteRng, zoneId) };
}

/**
 * Wählt eine Variante (eliteRng) und setzt die Zone auf „Aktiv" + stempelt den Toast-Breadcrumb.
 * Das Fenster ist FEST `ELITE_WINDOW_MS` (kein Zufalls-Zug mehr, s. Moduldoku) — ein Spawn kostet
 * damit genau EINEN eliteRng-Zug (die Varianten-Wahl). Zählt zusätzlich die Champion-Codex-Sichtung
 * dieser Variante (§Champion-Codex, „Jagd-Paket" S2/M).
 */
function spawnElite(state: GameState, zoneId: string, variants: EliteVariantDef[]): void {
  const chosen = variants[nextInt(state.eliteRng, 0, variants.length - 1)]!;
  state.eliteZones[zoneId] = { variantId: chosen.id, remainingMs: ELITE_WINDOW_MS };
  state.eliteSpawnSeq += 1;
  state.lastEliteSpawn = { zoneId, variantId: chosen.id, seq: state.eliteSpawnSeq };
  codexEntry(state, chosen.id).sightings += 1;
}

/**
 * Elite-Zyklus — EIN Tick (Andockstelle: tick.ts `step()`, NUR wenn `!offline`; s. Moduldoku).
 * Pro Zone unabhängig: Ruhe zählt Cooldown runter, Aktiv zählt das Fenster runter.
 *
 * „Player-friendly grace" (Konzept §1.2 „Läuft das Fenster mitten im Kampf ab, darf der laufende
 * Kampf zu Ende geführt werden"): läuft das Fenster GENAU der Zone ab, gegen deren Elite der Spieler
 * GERADE kämpft (`state.combat.eliteVariantId` matcht), friert das Fenster bei 0 ein STATT zu
 * despawnen — der laufende Kampf (combatStep/onEliteKilled) ist davon ohnehin unabhängig (er
 * rekonstruiert seinen Gegner rein aus `eliteVariantId`, nicht aus `eliteZones`) und bekommt so die
 * Chance, sauber zu Ende zu laufen. Endet der Kampf (Kill → `onEliteKilled` despawnt EXPLIZIT+sofort;
 * Flucht/Tod → `eliteVariantId` wird geräumt), greift der reguläre Despawn-Zweig ab dem NÄCHSTEN Tick
 * wieder normal (kein Doppel-Reroll: der Kill-Pfad despawnt die Zone selbst, DANACH ist ihr Eintrag
 * nicht mehr „Aktiv" und der Zweig hier läuft für sie gar nicht mehr an).
 *
 * Gesperrte/varianten-lose Zonen (Fälligkeit ohne Spawn-Möglichkeit): der Cooldown bleibt EINFACH auf
 * 0 stehen (kein Reroll, kein RNG-Zug) — das ist die „einfachste saubere Lösung" für „kein Busy-Loop":
 * jeder Tick prüft höchstens 1× (inhärent, da genau ein Durchlauf je Zone je Tick), und sobald Zone/
 * Content bereitstehen, spawnt SOFORT (kein künstliches Nachwarten mehr nötig).
 *
 * „Jagd-Paket" S1 (optionales `nowMs`, Muster `combatStep`/`skillingStep`): an einem wildhunt-Tag
 * ticken die RUHE-Cooldowns `ELITE_WILDHUNT_COOLDOWN_SPEED_MULT`× schneller herunter
 * (`wildhuntCooldownMult` — reiner Multiplikator auf den `TICK_MS`-Dekrement, KEIN RNG-Zug, wirkt
 * NICHT auf das aktive Fenster). Ohne `nowMs` bit-identisch zum Vorher-Zustand.
 */
export function tickEliteSpawns(state: GameState, content: ContentDB, nowMs?: number): void {
  const zones = content.zones;
  if (zones.length === 0) return;
  const eliteZones = (state.eliteZones ??= {});
  const activeFightVariantId =
    state.combat.monsterId !== null ? (state.combat.eliteVariantId ?? null) : null;
  const cooldownTick = TICK_MS * wildhuntCooldownMult(state, content, nowMs);

  for (const zone of zones) {
    let entry = eliteZones[zone.id];
    if (!entry) {
      // Content-Drift: eine Zone, die bei der letzten Migration/Init noch nicht existierte, lazy mit
      // einem frischen Ruhe-Cooldown nachrüsten (eine einzelne neue Zone kann nicht „clustern").
      entry = { cooldownMs: rollCooldownMs(state.eliteRng, zone.id) };
      eliteZones[zone.id] = entry;
    }
    if ("variantId" in entry) {
      if (entry.variantId === activeFightVariantId) {
        entry.remainingMs = Math.max(0, entry.remainingMs - TICK_MS); // Grace: friert bei 0 ein
        continue;
      }
      entry.remainingMs -= TICK_MS;
      if (entry.remainingMs <= 0) despawnEliteZone(state, zone.id);
      continue;
    }
    entry.cooldownMs -= cooldownTick;
    if (entry.cooldownMs > 0) continue;
    const variants = eliteVariantsForZone(content, zone.id);
    if (variants.length === 0 || !isZoneUnlocked(state, content, zone.id)) {
      entry.cooldownMs = 0; // fällig, aber (noch) nicht spawnbar — bleibt fällig stehen, s. Doku oben
      continue;
    }
    spawnElite(state, zone.id, variants);
  }
}

/** Lokaler pushLog-Spiegel (combat.ts hält seins privat; Format/Seq/Deckel identisch, Muster paragon.ts). */
function pushEliteLog(cs: CombatState, event: Omit<CombatEvent, "seq">): void {
  cs.log.push({ ...event, seq: cs.eventCount++ });
  if (cs.log.length > COMBAT_LOG_MAX) cs.log.shift();
}

/**
 * Startet einen Elite-Kampf in `zoneId` (nur wenn die Zone GERADE aktiv einen Elite trägt + die Zone
 * freigeschaltet ist — canFightMonster-Analogie, Konzept-Auftrag). Baut den skalierten Gegner nach
 * dem `paragonScaledMonster`-Muster und legt ihn im CombatState ab (`eliteVariantId`), damit
 * combatStep ihn über `eliteCombatMonster` wiederfindet. Gate: kein anderer Kampf aktiv
 * (`monsterId === null`, Muster `startParagonFloor` — ein Elite-Encounter ersetzt bewusst KEINEN
 * laufenden Kampf). Deterministisch, KEIN RNG-Zug. `false` bei fehlender/abgelaufener Variante,
 * gesperrter Zone oder laufendem Fremdkampf.
 */
export function startEliteCombat(state: GameState, content: ContentDB, zoneId: string): boolean {
  const entry = state.eliteZones?.[zoneId];
  if (!entry || !("variantId" in entry)) return false;
  if (!isZoneUnlocked(state, content, zoneId)) return false;
  if (state.combat.monsterId !== null) return false;
  const monster = eliteScaledMonster(content, entry.variantId);
  if (!monster) return false;
  state.activeActionId = null;
  state.actionProgressMs = 0;
  state.actionTarget = null;
  state.lastStop = null;
  state.stunMs = 0;
  state.combat = {
    monsterId: monster.id,
    enemyHp: monster.maxHp,
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
    eliteVariantId: entry.variantId,
    // Champion-Codex-Messgrundlage (§Champion-Codex, „Jagd-Paket" S2/M): TRANSIENT (s.
    // CombatState.eliteFightStartMs-Doku, shared) — überlebt einen Reload mitten im Kampf NICHT,
    // das ist bewusst so (fastestKillMs bleibt für diesen einen Kill dann unverändert).
    eliteFightStartMs: state.elapsedMs,
    // Kill-Cooldown-Übernahme (Muster startCombat/startParagonFloor): ein laufender Rest-Cooldown
    // wird NICHT abgebrochen — der Elite steht sofort im State, kämpft aber erst nach Ablauf.
    cooldownRemainingMs: state.combat.cooldownRemainingMs,
    lastKill: state.combat.lastKill,
  };
  return true;
}

/**
 * Kill-Abschluss eines Elite-Kampfs (Andockstelle für combat.ts `onEnemyDefeated`, NACH den
 * normalen Kill-Belohnungen — die Basis-XP/-Gold/-Loot der SKALIERTEN Instanz sind oben bereits
 * über den unveränderten Kill-Pfad geflossen, s. `eliteScaledMonster`-Doku):
 *  1. Kampf sauber beenden (Muster Dungeon-Ende/Paragon-Etagen-Abschluss) — `eliteVariantId` +
 *     `monsterId` geräumt, transienter Kampf-Zustand zurückgesetzt. KEIN Kill-Cooldown/Respawn
 *     (Konzept-Auftrag „kein Respawn desselben Elites" — der Spieler fällt sauber aus dem Kampf,
 *     die Action-Queue-Nachzieh-Logik in step() greift danach von selbst).
 *  2. Champion-Codex + Kopfgeld („Jagd-Paket" S2/M/S3): `kills` + Kopfgeld-Tokens
 *     (`ELITE_BOUNTY_TOKENS`, `character.questTokens`) für JEDEN Elite-Kill, unabhängig vom
 *     Unique-Drop. BEWUSST OHNE eigenen `cs.log`-Eintrag (Kill-Log-`kind` ist ein UI-Renderer-
 *     Vertrag außerhalb des Engine-Reviers — `CombatPage.tsx eventText` schaltet exhaustiv über
 *     `kind`, s. shared SAVE_VERSION-Changelog „FÜNFTER NACHTRAG"/S3); das Kopfgeld-Brett
 *     (BountyBoard.tsx) informiert bereits proaktiv, der HUD-Token-Zähler steigt sofort sichtbar.
 *     War das der ALLERERSTE Champion-Kill dieses Spielstands (Summe `eliteCodex[*].kills` war 0
 *     VOR diesem Kill), löst er zusätzlich den Brenna-Brief der Raben-Post aus.
 *  3. Unique-Drop (Chef-Korrektur 2026-07-22: KEIN Garantie-Drop mehr) — `uniqueDropChance`
 *     (Default `ELITE_UNIQUE_DROP_CHANCE_DEFAULT`, an einem bloodmoon-Tag +`ELITE_BLOODMOON_
 *     UNIQUE_BONUS`, „Jagd-Paket" S1) wird über `eliteRng` gewürfelt. WICHTIG (Sequenz-Stabilitäts-
 *     Disziplin): dieser Wurf feuert IMMER, sobald das Unique-Item strukturell existiert
 *     (`content.items[uniqueItemId]` bekannt) — UNABHÄNGIG vom konkreten Chance-Wert (auch 0 oder 1
 *     ziehen den nextFloat, UNABHÄNGIG vom bloodmoon-Bonus). Das ist eine BEWUSSTE Ausnahme vom
 *     sonstigen Muster „kein RNG-Zug, wenn die Chance 0 ist" (rollSuffix/tryCraftSuffix/Loot-Rolls):
 *     die eliteRng-Sequenz darf NICHT vom Chance-WERT selbst abhängen, sonst verschiebt jede spätere
 *     Balance-Anpassung (`uniqueDropChance` 0,2→0,25 o. ä. — oder der Wochentag selbst) alle
 *     NACHFOLGENDEN eliteRng-Züge (extraLoot, künftige Spawns) relativ zueinander —
 *     Determinismus-Fixtures blieben sonst an einen exakten Chance-Wert/Wochentag gekettet. Fällt
 *     der Drop, ist der Suffix selbst wieder normal chance-gated (`uniqueSuffixChance`, Default 1 =
 *     garantiert bei einem gefallenen Unique, sofern Equipment + Suffix-Pool). Zählt zusätzlich den
 *     Champion-Codex-`uniques`-Eintrag; war das der ALLERERSTE Unique-Fund dieses Spielstands, löst
 *     er den Warden-Brief der Raben-Post aus. `extraLoot` läuft über den normalen Loot-Roll-Pfad
 *     (Chance→Menge→optionaler Suffix, explicit-only wie `rollParagonChest`/`rollDungeonLootTable`).
 *  4. Sieg-Breadcrumb (`state.lastEliteKill` + `eliteKillSeq`, SAVE 74, Task #324): die in 2./3.
 *     BEREITS vergebenen Belohnungen werden für die kommende UI-Sieg-Zeremonie („Fanfare +
 *     Loot-Übersicht", separate ui-dev-Welle) zusätzlich AUFGEZEICHNET — Material-Bundle
 *     (exakt die vergebenen extraLoot-Items/-Mengen), Unique (falls gefallen, inkl. ob Suffix),
 *     Kopfgeld. WICHTIG (Determinismus-GESETZ): reine Mitschrift bereits gewürfelter Ergebnisse —
 *     KEIN zusätzlicher RNG-Zug, KEINE Reihenfolge-Änderung; ein offline zu Ende gekämpfter
 *     Elite-Kill schreibt identisch (letzter Kill gewinnt). Vertrag s. `EliteKillSummary` (shared).
 *  5. Zone zurück in Ruhe mit frischem Cooldown.
 * ALLE Würfe hier über `state.eliteRng` — KEIN zusätzlicher `state.rng`-Zug (Determinismus-Gesetz).
 * `nowMs` (optional, Muster `combatStep`) treibt AUSSCHLIESSLICH den bloodmoon-Bonus — ohne `nowMs`
 * bit-identisch zum Vorher-Zustand. Ein bereits verwaister Kampf (Variante aus dem Content entfernt,
 * während der Kampf lief) beendet sauber ohne Belohnung/Codex/Brief, statt zu crashen.
 */
export function onEliteKilled(state: GameState, content: ContentDB, monster: MonsterDef, nowMs?: number): void {
  const cs = state.combat;
  const variantId = cs.eliteVariantId;
  const fightStartMs = cs.eliteFightStartMs;
  cs.eliteVariantId = undefined;
  cs.eliteFightStartMs = undefined;
  cs.monsterId = null;
  cs.playerTimerMs = 0;
  cs.enemyTimerMs = 0;
  cs.enemyEffects = [];
  cs.playerEffects = [];
  cs.petAbility = createPetAbilityRuntime();
  cs.encounterXp = undefined;
  cs.effectCounters = undefined;

  const variant = variantId ? content.elites?.[variantId] : undefined;
  if (!variant) return; // Content-Drift/Save-Edit — Kampf ist sauber beendet, es gibt nichts zu vergeben

  // Champion-Codex (S2/M) + Kopfgeld (S3) + Brenna-Brief-Trigger — für JEDEN Elite-Kill, unabhängig
  // vom Unique-Drop unten. `codexTotal` wird VOR dem Inkrement dieser Variante ausgewertet (s.
  // Funktionsdoku).
  const isFirstChampionKillEver = codexTotal(state.eliteCodex, "kills") === 0;
  const codex = codexEntry(state, variantId!); // variantId ist hier garantiert gesetzt (variant existiert)
  codex.kills += 1;
  if (fightStartMs !== undefined) {
    const durationMs = Math.max(0, state.elapsedMs - fightStartMs);
    codex.fastestKillMs = codex.fastestKillMs === null ? durationMs : Math.min(codex.fastestKillMs, durationMs);
  }
  state.character.questTokens += ELITE_BOUNTY_TOKENS;
  if (isFirstChampionKillEver) {
    sendLetter(state, "brenna", "mail.letter.brenna.firstChampion", [{ itemId: "cooked_trout", qty: 5 }]);
  }

  // Sieg-Breadcrumb-Mitschrift (Schritt 4 der Funktionsdoku): sammelt UNTERWEGS, was die
  // bestehenden Vergabe-Pfade unten OHNEHIN vergeben — kein eigener Wurf, keine Umordnung.
  let uniqueDroppedItemId: string | null = null;
  let uniqueSuffixRolled = false;
  const bundleDrops: Array<{ itemId: string; qty: number }> = [];

  const baseItem = content.items[variant.uniqueItemId];
  if (baseItem) {
    // Drop-Chance-Wurf: IMMER gezogen (s. Funktionsdoku „Sequenz-Stabilitäts-Disziplin"). bloodmoon
    // hebt NUR den Vergleichswert an, gedeckelt auf 1 (Save-Edit-/Content-Robustheit gegen eine
    // absurd hohe `uniqueDropChance` + Bonus).
    const dropChance = Math.min(
      1,
      (variant.uniqueDropChance ?? ELITE_UNIQUE_DROP_CHANCE_DEFAULT) + bloodmoonUniqueBonus(nowMs),
    );
    const dropped = nextFloat(state.eliteRng) <= dropChance;
    if (dropped) {
      const suffixChance = variant.uniqueSuffixChance ?? 1;
      const suffix =
        baseItem.type === "equipment" && suffixChance > 0
          ? rollSuffix(state, content, baseItem, monster.level, suffixChance, state.eliteRng)
          : undefined;
      const instance: ItemInstance = suffix
        ? createSuffixInstance(state, suffix, variant.uniqueItemId)
        : { instanceId: mintInstanceId(state), baseItemId: variant.uniqueItemId, affixes: [] };
      intakeInstance(state, content, instance);
      // QA-Befund 2 (Ship-Abnahme 2026-07-22): Ein früher Elite-Unique MIT Suffix erfüllt die
      // Früh-Suffix-Garantie bereits im Geiste — Flag mitschalten, sonst bekäme ein frischer Save
      // zwei „erste" Suffixe (Elite-Pfad läuft an tryCraftSuffix vorbei, das das Flag sonst setzt).
      if (suffix) state.firstSuffixGranted = true;
      uniqueDroppedItemId = variant.uniqueItemId;
      uniqueSuffixRolled = suffix !== undefined;
      state.stats.itemsGathered += 1;
      markDropSeen(state, monster.id, variant.uniqueItemId);
      pushEliteLog(cs, { by: "player", kind: "loot", amount: 1, itemId: variant.uniqueItemId });
      // Champion-Codex `uniques` + Warden-Brief-Trigger (s. Funktionsdoku) — VOR dem Inkrement
      // ausgewertet, exakt wie beim Champion-Kill-Trigger oben.
      const isFirstUniqueEver = codexTotal(state.eliteCodex, "uniques") === 0;
      codex.uniques += 1;
      if (isFirstUniqueEver) sendLetter(state, "warden", "mail.letter.warden.firstUnique");
    }
  }

  for (const roll of variant.extraLoot ?? []) {
    if (nextFloat(state.eliteRng) <= roll.chance) {
      let qty = nextInt(state.eliteRng, roll.min, roll.max);
      let instanceMade = 0;
      const rowSuffixChance = roll.suffixChance ?? 0; // explicit-only, Muster rollParagonChest
      if (qty > 0 && rowSuffixChance > 0) {
        const res = tryCraftSuffix(state, content, roll.itemId, monster.level, rowSuffixChance, state.eliteRng);
        if (res) {
          qty -= 1;
          instanceMade = 1;
        }
      }
      grantLoot(state, content, roll.itemId, qty);
      const dropped = qty + instanceMade;
      state.stats.itemsGathered += dropped;
      if (dropped > 0) {
        markDropSeen(state, monster.id, roll.itemId);
        pushEliteLog(cs, { by: "player", kind: "loot", amount: dropped, itemId: roll.itemId });
        // Breadcrumb-Mitschrift: exakt die Menge, die dieser Kill vergeben hat (Stack + evtl.
        // Suffix-Instanz — identisch zum Loot-Log-Eintrag darüber).
        bundleDrops.push({ itemId: roll.itemId, qty: dropped });
      }
    }
  }

  // Sieg-Breadcrumb schreiben (Schritt 4 der Funktionsdoku — NACH allen Vergabe-Würfen, damit die
  // Mitschrift vollständig ist; die Position ist RNG-neutral, hier fällt kein Wurf mehr). `atMs` ist
  // SPIELZEIT (`elapsedMs`, deterministisch — NIE Date.now()/nowMs: nowMs ist Wanduhrzeit und würde
  // offline==online brechen). Läuft auch bei einem offline beendeten Kampf — letzter Kill gewinnt.
  state.eliteKillSeq += 1;
  state.lastEliteKill = {
    variantId: variant.id,
    atMs: state.elapsedMs,
    drops: bundleDrops,
    uniqueItemId: uniqueDroppedItemId,
    suffixRolled: uniqueSuffixRolled,
    bountyTokens: ELITE_BOUNTY_TOKENS,
    seq: state.eliteKillSeq,
  };

  despawnEliteZone(state, variant.zone);
}
