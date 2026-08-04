import type { ContentDB, GameState, ItemId } from "@hearthforge/shared";
import { createPetAbilityRuntime, PARAGON_DUNGEON_ID, PARAGON_KEY_ITEM_ID } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { isZoneUnlocked } from "./zones";

/**
 * Kampf-Niveau — fokus-belohnend (OSRS-artig) statt stumpfem 7er-Ø.
 *
 * Rolle seit Task #345 (Chef-Entscheid 2026-07-25): KEIN Dungeon-Zutritts-Gate mehr — die CL ist
 * die sichtbare EMPFEHLUNG auf der Dungeon-Karte (requiredLevel-Skala) und treibt weiterhin die
 * Slayer-Systeme (Master-Unlocks, Welt-/Turm-Task-Fenster, slayer.ts).
 *
 * Der frühere Schnitt aller 7 Kampf-Skills bestrafte Single-Style-Builds hart: ein reiner
 * Nahkämpfer/Magier/Schütze trainiert nur 3–4 Skills, die übrigen bleiben L1 und drücken den
 * Schnitt — ein voll gemaxter Melee kam auf max ~57 und konnte highland_aerie (65)/idol_sanctum (99)
 * NIE erreichen. Neue Formel: defensiver Sockel (Defensivfertigkeit + vitality, immer trainiert) plus
 * das BESTE Offensiv-Profil (max aus Nahkampf/Fernkampf/Magie). Ein voll auf EINEN Stil gemaxter
 * Spieler (sein Stil + Defensivfertigkeit + vitality @99 = Skill-Cap) erreicht so 99 und kann
 * idol_sanctum (Gate 99) erreichen; ein frischer Char bleibt niedrig (~1).
 *
 * Defensivfertigkeit = max(defence, warding): `warding` (Armor-Iteration 2 §9.1, Magier-Ward-Regen)
 * ist die Magier-Defensivfertigkeit, symmetrisch zu `defence` (Melee/Fernkampf). Ein Magier trainiert
 * `warding` STATT `defence`, ein Krieger `defence` STATT `warding` → es zählt die RELEVANTE
 * Defensivfertigkeit (das Maximum), nicht die Summe (sonst über-zählte ein Hybrid). Untrainiert bleibt
 * `warding` bei Level 1 → Melee/Fernkampf-Builds unverändert; ein reiner Magier erreicht jetzt Parität
 * (früher fiel `warding` ganz aus der CL → reiner Magier ~11 CL unter gleichem Tier, cappte bei ~75).
 */
export function combatLevel(state: GameState): number {
  const lvl = (id: string): number => levelFromXp(state.skills[id]?.xp ?? 0);
  const meleeOffense = (lvl("attack") + lvl("power")) / 2;
  const rangedOffense = lvl("ranged");
  // Balance-Pass 3 #9a: `magic` ALLEIN (früher (magic_off+magic_def)/2). Der Defensiv-Magie-Skill
  // (jetzt `warding`, Armor-Iteration 2 §9.1) geht NICHT in die Offense ein → symmetrisch zu Ranged
  // (ein Offensiv-Skill treibt die CL); Warding bleibt reiner Defensiv-Skill (Ward-Regen).
  const magicOffense = lvl("magic");
  const bestOffense = Math.max(meleeOffense, rangedOffense, magicOffense);
  // Defensiv-Sockel: die RELEVANTE Defensivfertigkeit (Krieger/Schütze `defence`, Magier `warding`) +
  // vitality. Maximum statt Summe → ein Hybrid wird nicht doppelt gezählt; untrainiertes `warding`
  // (Level 1) fällt für Melee/Fernkampf weg. Ohne warding klemmte ein reiner Magier ~11 CL zu niedrig.
  const defensiveSkill = Math.max(lvl("defence"), lvl("warding"));
  const defensiveBase = defensiveSkill + lvl("vitality");
  return Math.round(0.25 * defensiveBase + 0.5 * bestOffense);
}

// ───────────────────────────────────────────────────────────────────────────
// Quest-basierter Dungeon-Unlock (CHEF-DIREKTIVE 2026-07-13, ceo-run Welle J, SAVE_VERSION 64):
// „Keine Dungeon keys mehr, sondern quest based unlock." Das Gate ist `DungeonDef.requiresQuest`
// (analog ZoneDef/isZoneUnlocked, Welle C); zusätzlich muss die Trägerzone (`DungeonDef.zone`)
// offen sein (Kohärenz: Dungeon in gesperrter Zone bleibt gesperrt). `state.dungeonsUnlocked`
// bleibt als Legacy-BESTANDSSCHUTZ bestehen (SAVE 60; ein Eintrag überstimmt beide Gates — ein
// Alt-Save verliert NIE Zugriff) und als Träger des Paragonturm-Systems: NUR der paragon_key
// behält seinen addItemOrBank-Intercept (der Turm bleibt eigenes Einmal-Unlock-System). Die
// Story-Schlüssel (`keyItem` der übrigen Dungeons) sind deprecated — die Engine wertet sie
// nirgends mehr aus; Alt-Bestände räumt die v64-Migration (persistence).
// ───────────────────────────────────────────────────────────────────────────

/**
 * Ist der Dungeon betretbar (Gate-Sicht, OHNE Kampf-Niveau — das prüft canEnterDungeon)?
 * true, wenn
 *  (a) der Spielstand einen Legacy-/Paragon-Unlock trägt (`state.dungeonsUnlocked[dungeonId]`,
 *      Bestandsschutz seit SAVE 60 — überstimmt Quest- UND Zonen-Gate: nie Zugriff verlieren), SONST
 *  (b) beim Paragonturm: NIE (eigenes Einmal-Unlock-System — nur der dungeonsUnlocked-Eintrag
 *      aus dem paragon_key-Fund öffnet ihn; die Quest-/Übergangsregeln gelten dort nicht), SONST
 *  (c) die Trägerzone offen ist (isZoneUnlocked; Dungeon ohne `zone` = kein Zonen-Gate) UND
 *      (c1) der Dungeon KEIN `requiresQuest` trägt (Übergangsregel bis Welle K die Gates in den
 *           Content einträgt: solche Dungeons sind FREI, sobald die Trägerzone offen ist —
 *           bewusste kurze Zwischenphase, s. dungeon.test.ts), ODER
 *      (c2) die Gate-Quest abgeschlossen ist: eingelöst (`quests.claimed`) ODER erfüllt-claimbar
 *           (`quests.completed`) — gleiche Großzügigkeit wie isZoneUnlocked (der Story-Beat
 *           zählt, nicht der Klick auf „Einlösen").
 * Unbekannte Dungeon-IDs sind gesperrt. Rein & deterministisch, kein RNG, kein Schreibzugriff.
 *
 * Die 2-Argument-Altsignatur (state, dungeonId) ist deprecated (UI-Übergang bis die UI-Welle
 * nachzieht) und liefert NUR den rohen Bestandsschutz-Check.
 */
export function isDungeonUnlocked(state: GameState, content: ContentDB, dungeonId: string): boolean;
/** @deprecated Alt-Signatur (roher `dungeonsUnlocked`-Check) — neue Aufrufer nutzen (state, content, dungeonId). */
export function isDungeonUnlocked(state: GameState, dungeonId: string): boolean;
export function isDungeonUnlocked(state: GameState, contentOrId: ContentDB | string, maybeId?: string): boolean {
  const dungeonId = typeof contentOrId === "string" ? contentOrId : (maybeId as string);
  // (a) Legacy-Bestandsschutz / Paragon-Unlock — Optional-Chaining defensiv gegen handgebaute Alt-States.
  if (state.dungeonsUnlocked?.[dungeonId] === true) return true;
  if (typeof contentOrId === "string") return false; // Alt-Signatur: nur der rohe Check.
  const content = contentOrId;
  // (b) Paragonturm: eigenes System — quest-/zonenbasierte Regeln gelten hier bewusst NICHT.
  if (dungeonId === PARAGON_DUNGEON_ID) return false;
  const d = content.dungeons.find((x) => x.id === dungeonId);
  if (!d) return false;
  // (c) Kohärenz: ein Dungeon in gesperrter Trägerzone bleibt gesperrt.
  if (d.zone && !isZoneUnlocked(state, content, d.zone)) return false;
  const req = d.requiresQuest;
  if (!req) return true; // (c1) Übergangsregel — Welle K trägt die Quest-Gates nach.
  return state.quests.claimed.includes(req) || state.quests.completed.includes(req); // (c2)
}

/**
 * Selektor für die UI: das LEGACY-Schlüssel-Item eines Dungeons (null = Dungeon unbekannt/ohne).
 * @deprecated seit Welle J (2026-07-13): Schlüssel sind ohne Funktion (quest-based unlock);
 * relevant bleibt nur der Paragonturm (PARAGON_KEY_ITEM_ID). Bleibt für den UI-Übergang stehen.
 */
export function dungeonKeyItemId(content: ContentDB, dungeonId: string): ItemId | null {
  return content.dungeons.find((d) => d.id === dungeonId)?.keyItem ?? null;
}

/**
 * Alle Dungeon-IDs, deren (Legacy-)`keyItem` dieses Item ist (leer = kein Dungeon-Schlüssel).
 * Seit Welle J (2026-07-13) nur noch die Basis des PARAGON-Intercepts (inventory.ts) und des
 * Paragon-Sweeps der Persistenz — für Story-Dungeons wertet die Engine Schlüssel nicht mehr aus.
 */
export function keyUnlocksDungeons(content: ContentDB, itemId: ItemId): string[] {
  return content.dungeons.filter((d) => d.keyItem === itemId).map((d) => d.id);
}

/**
 * Entsperrt alle zum Schlüssel-Item gehörenden Dungeons und liefert die dabei NEU entsperrten
 * IDs (leer = alles war schon offen bzw. kein Dungeon-Schlüssel). Monoton & idempotent, zieht
 * KEIN RNG. Bei ≥ 1 neuem Unlock wird der UI-Breadcrumb `lastDungeonUnlock` gesetzt (Muster
 * lastPetDrop: seq monoton, UI quittiert mit null). Seit Welle J (2026-07-13) ruft das im
 * Live-Betrieb nur noch der paragon_key-Intercept (addItemOrBank) bzw. der Paragon-Sweep der
 * Persistenz — der Paragonturm bleibt eigenes Einmal-Unlock-System.
 */
export function unlockDungeonsForKey(state: GameState, content: ContentDB, itemId: ItemId): string[] {
  const newly: string[] = [];
  for (const id of keyUnlocksDungeons(content, itemId)) {
    if (state.dungeonsUnlocked?.[id] === true) continue;
    (state.dungeonsUnlocked ??= {})[id] = true;
    newly.push(id);
  }
  if (newly.length > 0) {
    const seq = (state.lastDungeonUnlock?.seq ?? 0) + 1;
    state.lastDungeonUnlock = { dungeonIds: newly, itemId, seq };
  }
  return newly;
}

/**
 * Paragonturm-Unlock (eigenes Einmal-Unlock-System, Welle J unberührt): entsperrt
 * PARAGON_DUNGEON_ID hart — bewusst OHNE Content-Mapping (übersteht Content-Drift am
 * deprecated `keyItem`-Feld) und setzt bei NEUEM Unlock den UI-Breadcrumb `lastDungeonUnlock`
 * (itemId = PARAGON_KEY_ITEM_ID). Monoton & idempotent, zieht KEIN RNG. Liefert true nur beim
 * ersten (neu entsperrenden) Aufruf. Aufrufer: der paragon_key-Intercept (inventory.ts,
 * addItemOrBank) und der Paragon-Sweep der Persistenz.
 */
export function unlockParagonTower(state: GameState): boolean {
  if (state.dungeonsUnlocked?.[PARAGON_DUNGEON_ID] === true) return false;
  (state.dungeonsUnlocked ??= {})[PARAGON_DUNGEON_ID] = true;
  const seq = (state.lastDungeonUnlock?.seq ?? 0) + 1;
  state.lastDungeonUnlock = { dungeonIds: [PARAGON_DUNGEON_ID], itemId: PARAGON_KEY_ITEM_ID, seq };
  return true;
}

/**
 * Kann der Spieler den Dungeon betreten? Einziges Gate ist `isDungeonUnlocked`
 * (Quest-Gate + Trägerzonen-Kohärenz bzw. Legacy-Bestandsschutz — Welle J, 2026-07-13).
 * Es wird nichts gezählt oder verbraucht.
 *
 * KEIN Kampfstufen-Gate mehr (Task #345, Chef-Entscheid 2026-07-25): „Dungeons sollten nur durch
 * Quests gelocked sein! … Wenn Spieler sterben, merken sie es selber und trainieren." —
 * `DungeonDef.requiredLevel` ist seither reine EMPFEHLUNG/Anzeige (UI-Karte „Empfohlen:
 * Kampfstufe {n}", Leiter-Monotonie-Guard in progression-band.test.ts bleibt bestehen). Die
 * gewollte Härte liegt in den Kreaturen-Stats selbst: ein Unterlevelter darf rein, stirbt dort
 * aber schnell (Tod = harter Run-Abbruch ohne Verlust, s. onPlayerDefeated in combat.ts).
 * Nicht betroffen: Slayer-Turm-Etagen (Slayer-Level-Gate, slayer.ts) und der Paragonturm
 * (Einmal-Unlock per paragon_key, startParagonFloor in paragon.ts) — eigene Gate-Systeme.
 */
export function canEnterDungeon(state: GameState, content: ContentDB, dungeonId: string): boolean {
  const d = content.dungeons.find((x) => x.id === dungeonId);
  if (!d) return false;
  if (!isDungeonUnlocked(state, content, dungeonId)) return false;
  return true;
}

/**
 * Startet einen Dungeon-Run mit der ersten Gegner-Welle. Guard ist ausschließlich
 * `canEnterDungeon` (= isDungeonUnlocked: Quest-Gate/Trägerzone/Bestandsschutz) — KEINE
 * Schlüssel-Logik mehr (Welle J, 2026-07-13: kein keyItem-Check, kein Verbrauch) und KEIN
 * Kampfstufen-Gate mehr (Task #345, Chef-Entscheid 2026-07-25, s. canEnterDungeon-JSDoc).
 * Die Wellen-Progression + Abschluss-Belohnung passiert in combat.ts (onEnemyDefeated).
 */
export function startDungeon(state: GameState, content: ContentDB, dungeonId: string): boolean {
  const d = content.dungeons.find((x) => x.id === dungeonId);
  if (!d || !canEnterDungeon(state, content, dungeonId)) return false;
  const firstId = d.encounters[0];
  const first = firstId ? content.monsters[firstId] : undefined;
  if (!first) return false;

  state.activeActionId = null;
  state.actionProgressMs = 0;
  state.lastStop = null;
  state.stunMs = 0;
  state.combat = {
    monsterId: first.id,
    enemyHp: first.maxHp,
    playerTimerMs: 0,
    enemyTimerMs: 0,
    kills: 0,
    eventCount: 0,
    enemyEffects: [],
    playerEffects: [],
    log: [],
    dungeonId: d.id,
    encounterIndex: 0,
    petAbility: createPetAbilityRuntime(),
    // Kill-Cooldown-Übernahme (analog startCombat in combat.ts): ein Dungeon-Start während eines
    // laufenden Kill-Cooldowns bricht ihn NICHT ab (sonst überspringt Kill → sofort startDungeon
    // den Rest). Die erste Welle steht sofort im State (UI zeigt sie), kämpft aber erst nach Ablauf
    // des Rest-Cooldowns; `lastKill` (Summary) wandert mit und läuft normal ab. Läuft KEIN Cooldown,
    // sind beide Felder undefined → Verhalten wie bisher (sofortiger Kampfbeginn).
    cooldownRemainingMs: state.combat.cooldownRemainingMs,
    lastKill: state.combat.lastKill,
  };
  return true;
}
