import type { ContentDB, GameState } from "@hearthforge/shared";
import { BASE_INVENTORY_SLOTS, DEFAULT_THIEVING_RISK, SAVE_VERSION, defaultCampState, defaultEquipKits, defaultFarmPlots, defaultTavernState, defaultHuntTraps, defaultParagonState, defaultPrestigeState, defaultQuestState, defaultSettings, newGameOnboarding } from "@hearthforge/shared";
import { createRng } from "./rng";
import { syncActiveKit } from "./loadouts";
import { addItem, createInventory, discoverPossessedItems } from "./inventory";
import { createCombat } from "./combat";
import { computeStats, createCharacter, totalLevel } from "./character";
import type { CharacterCreation } from "./character";
import { deriveEliteRngSeed, initEliteZonesEarlyHook } from "./elites";

function randomSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}

/**
 * Erzeugt einen frischen Spielstand inkl. Charakter. Benötigt `content`, um das
 * Start-Gesamtlevel und die anfänglichen HP korrekt aus den Stats abzuleiten.
 */
export function createGame(
  creation: CharacterCreation,
  content: ContentDB,
  seed: number = randomSeed(),
): GameState {
  // Elite-/World-Spawns (SAVE 72): eigener, vom Haupt-Seed ABGELEITETER RNG-Strom (deriveEliteRngSeed
  // liest nur — konsumiert `seed`/`state.rng` nicht). Dieselbe Objekt-Referenz wird unten sowohl in
  // `eliteRng` gespeichert ALS AUCH von `initEliteZonesEarlyHook` mutiert (die Früh-Haken-Timer
  // ziehen ihre Würfe daraus) — der State startet also bereits mit einem vorgerückten Elite-RNG-Zustand.
  const eliteRng = createRng(deriveEliteRngSeed(seed));
  const state: GameState = {
    version: SAVE_VERSION,
    rng: createRng(seed),
    totalTicks: 0,
    elapsedMs: 0,
    activePlayMs: 0,
    accumulatorMs: 0,
    activeActionId: null,
    actionProgressMs: 0,
    actionTarget: null,
    // Action-Queue (SAVE_VERSION 70): frisch leer — der Spieler plant Aktivitäten selbst vor.
    actionQueue: [],
    // Kampf-Queue (SAVE_VERSION 73, Task #312): kein laufender Queue-Kampf, nichts pausiert,
    // kein Skip-Breadcrumb.
    queueFight: null,
    // Dungeon-Queue (SAVE_VERSION 83): kein laufender Queue-Dungeon-Lauf.
    queueDungeon: null,
    queuePaused: false,
    lastQueueSkip: null,
    character: createCharacter(creation),
    combat: createCombat(),
    skills: {},
    inventory: createInventory(BASE_INVENTORY_SLOTS),
    stats: {
      kills: 0,
      deaths: 0,
      itemsGathered: 0,
      itemsCrafted: 0,
      craftedById: {},
      goldSpent: 0,
      dailyStreak: 0,
      lastDailyDay: 0,
      // Taverne (SAVE 84): Baseline-Zähler der run/produce-Aufgaben (taverne-spec-technik.md §2).
      actionRunsById: {},
      producedById: {},
      huntCatches: 0,
      huntCatchesById: {},
    },
    achievements: [],
    // AP-Meilensteine (SAVE 66, Welle GG): frisch = nichts vergeben; die Zähler starten bei 0
    // und werden NIE genullt/gesenkt (Muster petDropSeq).
    claimedApMilestones: [],
    apMilestoneSeq: 0,
    lastApMilestone: null,
    apCeremonyPending: false,
    monsterKills: {},
    dungeonsCleared: {},
    // Einmal-Unlock (SAVE 60): frische Spielstände haben keine entsperrten Dungeons; der erste
    // Schlüsselfund (addItemOrBank-Intercept) trägt sie ein und setzt den UI-Breadcrumb.
    dungeonsUnlocked: {},
    lastDungeonUnlock: null,
    // Story-Zonen-Gating (SAVE 63): frische Spielstände haben KEINE Bestandsschutz-Grants —
    // sie spielen die Chronik-Gates (ZoneDef.requiresQuest, Welle D2) regulär frei. Nur die
    // v63-Migration füllt das Feld (Alt-Saves: alle v62-Zonen).
    legacyZoneGrants: {},
    // Paragonturm (SAVE 61): frischer Aufstieg — Checkpoint 0 (nächste Etage = 1), Rekord 0.
    paragon: defaultParagonState(),
    // Paragon-Truhen-Breadcrumb (SAVE 68, Welle LL): noch keine Truhe; seq monoton ab 0
    // (Muster petDropSeq — wird NIE genullt/gesenkt).
    paragonChestSeq: 0,
    lastParagonChest: null,
    lastStop: null,
    stunMs: 0,
    thievingRisk: DEFAULT_THIEVING_RISK,
    mastery: {},
    bank: {},
    // Bank-Platzierung (SAVE 87): leer starten, `syncBankOrder` fuellt beim ersten Einlagern.
    bankOrder: [],
    bankSlotsPurchased: 0,
    seenDrops: {},
    seenActionDrops: {},
    // Erst-Besitz-Marker (SAVE 58): startet leer; der Starterbesitz (Waffe/Rüstung/Food/Saat)
    // wird unten via discoverPossessedItems nachgetragen.
    discoveredItems: {},
    // Meisterweihe (SAVE 59): frische Spielstände haben weder Weihen noch Capes noch Zeremonien.
    masteryCapes: {},
    capeGranted: {},
    capeCeremonySeen: {},
    settings: defaultSettings(),
    quests: defaultQuestState(),
    // Monotoner Pet-Drop-Zähler (SAVE 65, Welle DD): startet bei 0, wird NIE genullt/gesenkt.
    petDropSeq: 0,
    lastPetDrop: null,
    farmPlots: defaultFarmPlots(),
    slayerTask: null,
    slayerPoints: 0,
    slayerTasksCompleted: 0,
    // Slayer-Streak (SAVE 66, Welle GG): frische Serie 0; seq monoton (Muster petDropSeq).
    slayerStreak: 0,
    slayerStreakSeq: 0,
    lastSlayerStreakBonus: null,
    // Trophäenwand III „1 Gratis-Skip/Tag" (SAVE 77, Task #359): 0 = an keinem Tag verbraucht.
    // Der Stempel ist ein lokaler Kalendertag (YYYYMMDD, Muster quests.daily.day) — s.
    // engine/slayer.ts `campFreeSkipDay`.
    slayerFreeSkipDay: 0,
    // claude:2026-10-18T00:30:00+02:00 — Talentbäume (Jagdbuch) + Pech-Schutz-Zähler: frisch leer.
    talents: {},
    petPity: {},
    bankInstances: [],
    nextInstanceSeq: 0,
    buyBack: [],
    // Neuer Spielstand → Onboarding-Guide startet automatisch bei Schritt 0.
    onboarding: newGameOnboarding(),
    // Postfach/Mailbox (SAVE_VERSION 71): frisch leer; der Sequenzzähler startet bei 0
    // (deterministische Mail-ID-Vergabe, Muster nextInstanceSeq — wird NIE genullt/gesenkt).
    mailbox: [],
    mailSeq: 0,
    // Elite-/World-Spawns (SAVE 72, design/elite-spawns-concept.md + elite-balance-spec.md §3):
    // eigener RNG-Strom + je Zone der FRÜH-HAKEN-Timer (initEliteZonesEarlyHook — NUR frische Saves;
    // Alt-Save-Migration nutzt stattdessen initEliteZonesStaggered, kein Früh-Haken für
    // Bestandsspieler). Noch nichts gespawnt (Content ist Phase 1 leer): Zähler 0, Breadcrumb null.
    eliteRng,
    eliteZones: initEliteZonesEarlyHook(content, eliteRng),
    eliteSpawnSeq: 0,
    lastEliteSpawn: null,
    // Früh-Garantie-Suffix (SAVE 72, selber Bump, Chef-GO 2026-07-22): ein frischer Spielstand hat
    // noch KEINE Suffix-Instanz gesehen → die Garantie in tryCraftSuffix (suffix.ts) ist scharf.
    firstSuffixGranted: false,
    // Champion-Codex (SAVE 72, selber Bump, „Jagd-Paket" S2/M): frischer Spielstand hat noch keine
    // Elite-Sichtungen/-Kills/-Uniques — der Codex startet leer, Einträge entstehen lazy
    // (spawnElite/onEliteKilled, engine/elites.ts).
    eliteCodex: {},
    // Elite-Sieg-Breadcrumb (SAVE 74, Task #324): noch kein Elite-Kill — Zähler 0, Breadcrumb null
    // (Muster eliteSpawnSeq/lastEliteSpawn; Schreib-Ort ist onEliteKilled, engine/elites.ts).
    eliteKillSeq: 0,
    lastEliteKill: null,
    // Ausrüstungs-Kits 1/2/3 (SAVE 85, Chef-Entscheid 28.08.2026): drei leere Kits, Kit 0 aktiv —
    // der Spiegel von Kit 0 wird unten (nach der Start-Ausrüstung) via syncActiveKit geschrieben.
    // Umschalten ausschließlich über engine/loadouts.ts `switchEquipKit`.
    equipKits: defaultEquipKits(),
    activeKit: 0,
    // Das Lager (SAVE 76, Task #358): frisch nichts gebaut, Bautrupp frei. SEIT TASK #365 steht
    // New Haven ab Spielstart offen (kein Freischaltungs-Gate mehr) — der leere Lager-Zustand IST
    // der Startzustand: ein karger Rastplatz an der Furt, den der Spieler von hier aus aufbaut.
    camp: defaultCampState(),
    // Taverne (SAVE 84): ungebaut, keine Plätze — tavernRefresh besetzt erst nach dem Bau.
    tavern: defaultTavernState(),
    // Jagen (SAVE 85): sechs leere Fallenplätze, Fang-Nummer 0.
    huntTraps: defaultHuntTraps(),
    huntCatchSeq: 0,
    // claude:2026-10-17T23:30:00+02:00 — Prestige (SAVE 88): erster Durchgang, keine Punkte, keine Historie.
    // engine/prestige.ts `ascend` überschreibt das Feld im Neustand mit dem fortgeschriebenen Zustand.
    prestige: defaultPrestigeState(),
  };

  // Start-Ausrüstung an den gewählten Stil koppeln und sofort ausrüsten, damit der
  // neue Spieler direkt mit seinem Stil kämpfen kann. Default melee (Abwärtskompat:
  // bestehende Aufrufer ohne `startingStyle`). Jeweils mit Content-Guard wie bisher.
  const startingStyle = creation.startingStyle ?? "melee";
  const weaponByStyle = {
    melee: "rusty_sword",
    ranged: "cracked_bow",
    magic: "cracked_staff",
  } as const;
  const weaponId = weaponByStyle[startingStyle];
  if (content.items[weaponId]) {
    // Direkt in den Mainhand-Slot legen (wie beim Laden eines Saves); Combat liest die
    // Waffe aus equipment.mainhand, ein Inventarbesitz ist dafür nicht nötig.
    state.character.equipment.mainhand = weaponId;
    // Start-Munition: ENTFERNT (#286 Ammo-Removal) — Bögen feuern ohne Pfeile (Schaden eingebacken).
  }

  // Start-Nahrung + Auto-Eat-Vorbelegung (OPT-IN über creation.starterKit): ein echter neuer Spieler
  // startet mit etwas basaler, essbarer Heil-Nahrung UND vorbelegter Auto-Eat-Auswahl (Schwelle =
  // Auto-Eat-Stufe 0 = 50% HP), damit frühe Dauerkämpfe gegen härtere Mobs nicht allein am noFood-Hint
  // hängen (HP regenerieren NICHT natürlich — Chef-Entscheid 2026-07-02: Heilung nur über
  // Food/Tränke/`hpRegenPerSec`-Effekte). BEWUSST opt-in und NICHT Default: ein
  // automatisch essender Spieler überlebt Kämpfe länger, was die Balance-Sim und zahlreiche
  // Kampf-Fixtures (z.B. ranged-vs-magic-Profil) verschiebt — die Sim/Tests laufen daher weiter auf
  // der leeren Baseline (kein Flag). Die echte Charaktererstellung im Renderer setzt das Flag.
  // Determinismus-sicher: addItem zieht KEIN RNG. Mit Content-Guard wie die Waffe.
  if (creation.starterKit) {
    const STARTER_FOOD = "cooked_shrimp"; // basales Low-Level-Koch-Food (healAmount 1, Squish-Skala)
    if (content.items[STARTER_FOOD]) {
      // Start-Nahrung (Fix run5 #3): 10 → 20, etwas mehr Puffer für die ersten Dauerkämpfe.
      addItem(state.inventory, content, STARTER_FOOD, 20);
      state.character.food = STARTER_FOOD;
    }
    // Start-Saatgut (Fix run5 #3): 3× graywort_seed, damit der erste Farm-Besuch nicht leer ist.
    // Content-Guard wie überall; addItem zieht kein RNG (determinismus-sicher).
    if (content.items.graywort_seed) {
      addItem(state.inventory, content, "graywort_seed", 3);
    }
    // Starter-Rüstungs-Set (#286, Chef-GO: „dass man sofort anfangen könnte Hühner zu töten ohne
    // zu sterben"): je Startstil das unterste passende Rüstungsklassen-Set, DIREKT AUSGERÜSTET
    // (wie die Startwaffe; kein Inventarbesitz nötig, addItem/RNG-frei → determinismus-sicher).
    // Balance-Signal (Sim 2026-07-08): Frisch-Melee starb on-level an ALLEM (16 Tode/8h an
    // Hühnern/Ratten; Peak-Food-Sustain 2,7 %/s vs. naked-Inflow ~5 %/s) — das Set ist nötig.
    // Requirements-Check: alle gewählten IDs sind auf Level 1 tragbar (melee: defence 1,
    // magic: magic 1, ranged: req-frei) — kein Unequip-Trap (Wieder-Anlegen geht immer).
    // Task #286 Stage B (content-dev): Lücke geschlossen — leather_legs/leather_boots (t0,
    // requirements-frei) liefern jetzt das vierte/fünfte Ranged-Starter-Teil, analog zu
    // melee/magic (jeweils 3 Rüstungsteile).
    const STARTER_ARMOR: Record<typeof startingStyle, Partial<Record<"helmet" | "body" | "legs" | "boots", string>>> = {
      melee: { body: "copper_platebody", legs: "copper_platelegs", boots: "copper_sabatons" },
      ranged: { body: "leather_body", helmet: "leather_helm", legs: "leather_legs", boots: "leather_boots" },
      magic: { body: "apprentice_robe_body", legs: "apprentice_robe_legs", boots: "apprentice_slippers" },
    };
    for (const [slot, itemId] of Object.entries(STARTER_ARMOR[startingStyle])) {
      if (itemId && content.items[itemId]) {
        state.character.equipment[slot as "helmet" | "body" | "legs" | "boots"] = itemId;
      }
    }
  }

  // Starterbesitz als „entdeckt" markieren (SAVE 58): deckt auch die DIREKT ausgerüstete
  // Startwaffe/-rüstung ab (die nie durch addItem lief). RNG-frei → determinismus-neutral.
  discoverPossessedItems(state);

  state.character.totalLevel = totalLevel(state, content);
  const startStats = computeStats(state, content);
  state.character.hp = startStats.maxHp;
  state.character.mana = startStats.maxMana;
  // Ward-Pool (Rüstungs-Trinität, SAVE_VERSION 50): frisch auf maxWard finalisieren (mirror hp/mana).
  state.character.ward = startStats.maxWard;
  // Kit-0-Spiegel = die soeben direkt ausgerüstete Start-Ausrüstung (RNG-frei; ein frischer State ist
  // damit exakt die Form, die auch ein Load liefert — Round-Trip-stabil ab dem ersten Tick).
  syncActiveKit(state);
  return state;
}
