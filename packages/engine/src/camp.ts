import { features } from "./features";
import type {
  CampBoostKind,
  CampBuildingDef,
  CampBuildingId,
  CampBuildingLevelDef,
  CampMapVisual,
  CampPos,
  CampState,
  ContentDB,
  GameState,
  ItemId,
} from "@hearthforge/shared";
import {
  CAMP_BLESSING_BOOST_CAP,
  CAMP_TOWNHALL_ID,
  CAMP_TAVERN_ID,
  CAMP_BUILD_QUEUE_MAX,
  CAMP_MAX_BUILDING_LEVEL,
  CAMP_MAP_VISUAL_SCALE_MAX_PERCENT,
  CAMP_MAP_VISUAL_SCALE_MIN_PERCENT,
  TICK_MS,
  campBoostSum,
  campClampPos,
  campFirstFreeLayoutSlot,
  campFootprint,
  campPositionFitsMap,
  defaultCampState,
} from "@hearthforge/shared";
import { itemCount, removeItem } from "./inventory";
import { bankCount } from "./bank";
import { grantLoot } from "./mail";

/**
 * Das Lager (Encampment Phase 1, 0.3.0 — Task #358, SAVE_VERSION 76).
 *
 * Bindende Grundlagen: design/encampment-konzept.md (eiserne Regeln + Balance-Korrekturen),
 * design/encampment-balance.md (§3 Stücklisten, §7 Guards), design/lore/encampment-lore.md (Namen).
 *
 * DETERMINISMUS-GESETZ: Dieses Modul zieht NIE RNG und liest NIE Date.now. Der Bau-Timer
 * (`camp.buildJob.remainingMs`) zählt in `tickCampBuild` (aufgerufen aus tick.ts `step()`) je Tick
 * um TICK_MS herunter — Live-Loop und Offline-Catch-up laufen über DENSELBEN advance-Pfad und sind
 * damit bit-identisch (offline==online).
 *
 * SEIT WELLE 2 (Task #359, SAVE 77) sind alle boostKinds an ihre Systeme angeschlossen (Übersicht:
 * shared CampBoostKind-Doku). Der Lese-Pfad der Tick-Konsumenten ist `campBoostCached` (memo auf
 * `camp.buildSeq` — Stufen ändern sich AUSSCHLIESSLICH über tickCampBuild/Migration); die
 * Offline-Veredelung lebt in refine.ts. Ohne gebautes Lager ist JEDER Boost exakt 0 ⇒
 * Sim-/Determinismus-Fixtures bleiben bit-identisch (Guard balance.md §7 / camp-envelope.test.ts).
 */

/** Defensiver Zugriff auf den Lager-Zustand (Alt-States aus Hand-Konstruktionen in Tests). */
function campOf(state: GameState): CampState {
  if (!state.camp || typeof state.camp !== "object") state.camp = defaultCampState();
  return state.camp;
}

/** Gebäude-Definition aus dem Katalog — null, wenn der Content kein Lager (oder die ID nicht) kennt. */
export function campBuildingDef(content: ContentDB, buildingId: string): CampBuildingDef | null {
  return content.campBuildings?.find((b) => b.id === buildingId) ?? null;
}

/*
 * KEIN `campUnlocked` MEHR (Task #365, Chef-Entscheid 27.07.): New Haven ist die HEIMATBASIS AB
 * SPIELSTART — der Ort, an dem der Charakter ankommt — statt einer Kapitel-4-Belohnung. Damit
 * entfällt die frühere Freischaltungs-Prüfung ersatzlos (und mit ihr der Grund `locked`).
 *
 * KEIN `quest_required` MEHR (Task #366, Bauteil-System, 27.07.): die früheren Zentralhaus-
 * STUFEN-Gates (Content `requiresQuest`: chronicle_09 für Stufe II, chronicle_14 für Stufe III)
 * sind aus dem Katalog gestrichen — die neuen Bauteil-Materialien (`timber_beam`/`timber_brace`/
 * `timber_anchor`, je Stufe eine Zutat in `levelDef.items`) sind jetzt das EINZIGE Pacing-Gerüst
 * für JEDE Gebäude-Stufe, inkl. Zentralhaus II/III. Damit entfällt der generische Quest-Gate-
 * Check (`questGateMet`, Grund `quest_required`) ersatzlos — kein `campBuildingLevelDef` im
 * gesamten Katalog setzt `requiresQuest` mehr (verifiziert von content-dev per Grep). Das Feld
 * `CampBuildingLevelDef.requiresQuest` selbst bleibt im shared-Typ stehen (generischer, optionaler
 * Mechanismus für eine künftige Stufe) — nur der Engine-seitige Check dafür ist weg, bis wieder
 * Content das Feld setzt.
 */

/**
 * Aktuelle Ausbaustufe eines Gebäudes (0 = ungebaut). Defensiv gegen korrupte Werte.
 *
 * BEWUSST über `state.camp` direkt (nicht `campOf`): LESEN legt kein Feld an — dieselbe Regel wie
 * `campBoost` oben, und die Voraussetzung dafür, dass `campBuildStartReason` ein wirklich REINES
 * Prädikat sein kann (Task #364 Fix 5a). Fehlendes `camp` = Stufe 0 überall.
 */
export function campBuildingLevel(state: GameState, buildingId: string): number {
  const raw = state.camp?.buildings?.[buildingId];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(CAMP_MAX_BUILDING_LEVEL, Math.floor(raw)));
}

/**
 * Aufsummierter Boost-Wert aller GEBAUTEN Stufen einer Wirkungs-Art (Stufen-Deltas, s.
 * CampBuildingLevelDef.boost). Der EINE Lese-Hook für alle Welle-2-Verdrahtungen. Ohne Katalog,
 * ohne gebaute Gebäude oder ohne passende Art exakt 0 (neutral — Guard balance.md §7.1/§7.11).
 * Ein LAUFENDER Bau zählt nicht (nur fertige Stufen wirken).
 */
export function campBoost(state: GameState, content: ContentDB, kind: CampBoostKind): number {
  // Delegiert an den puren shared-Helper (EINE Summier-Logik für Engine, shared-Kapazitäts-
  // Helpers und persistence). BEWUSST über state.camp direkt (nicht campOf): Lesen legt kein
  // Feld an; fehlendes camp = Stufe 0 überall = 0.
  return campBoostSum(state.camp, content.campBuildings, kind);
}

/**
 * Gecachter `campBoost`-Lese-Pfad für PRO-TICK-Konsumenten (effectiveActionDurationMs, Schrein-
 * Verstärkung, Veredelung — balance.md §7.1 „Faktor billig cachen"). Cache-Schlüssel:
 * (State-Identität via WeakMap, `camp.buildSeq`, Content-Identität). VERTRAG: Gebäude-Stufen
 * ändern sich im Spiel AUSSCHLIESSLICH über `tickCampBuild` (inkrementiert buildSeq) bzw. über
 * einen frischen Load (neues State-Objekt ⇒ WeakMap-Miss) — wer `camp.buildings` DIREKT mutiert
 * (Tests!), muss `camp.buildSeq` mit anfassen, sonst liest dieser Pfad stale Werte.
 */
const boostCache = new WeakMap<
  GameState,
  { seq: number; content: ContentDB; values: Partial<Record<CampBoostKind, number>> }
>();

export function campBoostCached(state: GameState, content: ContentDB, kind: CampBoostKind): number {
  const seq = state.camp && typeof state.camp === "object" ? state.camp.buildSeq : -1;
  let entry = boostCache.get(state);
  if (!entry || entry.seq !== seq || entry.content !== content) {
    entry = { seq, content, values: {} };
    boostCache.set(state, entry);
  }
  return (entry.values[kind] ??= campBoost(state, content, kind));
}

/**
 * Schrein-Verstärkungs-Anteil (Schrein der Stillen, `blessing`-Boost, balance.md §6): 0..0.30,
 * defensiv geklemmt (CAMP_BLESSING_BOOST_CAP). Anwendung: Bonus-Anteil des aktiven Tages-Segens
 * × (1 + Anteil) — an den NICHT-Kampf-Callsites (tick.ts) sowie der bloodmoon-CHANCE
 * (blessing.ts-Injektion) und dem wildhunt-Ersatz (elites.ts). 0 ohne gebauten Schrein.
 */
export function campShrineBonus(state: GameState, content: ContentDB): number {
  return Math.max(0, Math.min(CAMP_BLESSING_BOOST_CAP, campBoostCached(state, content, "blessing")));
}

/**
 * Ist das Gebäude, das eine Wirkungs-Art liefert, VOLL ausgebaut (Stufe III)? Für Effekte, die an
 * der ENDSTUFE hängen statt am aufsummierten Boost-Wert — heute genau einer: der Tages-Gratis-Skip
 * der Trophäenwand III (engine/slayer.ts `campFreeSkipAvailable`, encampment-balance.md §6).
 *
 * Bewusst KATALOG-getrieben (statt einer zweiten Magic-ID neben CAMP_TOWNHALL_ID): gesucht wird
 * das Gebäude, dessen Stufen `kind` liefern — benennt der Content es je um, wandert der Effekt
 * automatisch mit. false ohne Katalog/ohne gebautes Gebäude.
 */
export function campKindAtMaxLevel(
  state: GameState,
  content: ContentDB,
  kind: CampBoostKind,
): boolean {
  for (const b of content.campBuildings ?? []) {
    if (!b.levels.some((l) => l.boost.kind === kind)) continue;
    const max = Math.min(CAMP_MAX_BUILDING_LEVEL, b.levels.length);
    if (max > 0 && campBuildingLevel(state, b.id) >= max) return true;
  }
  return false;
}

/** Freigeschaltete Gebäudekapazität (Zentralhaus +4/+5/+5). Legacy-Name bleibt API-kompatibel. */
export function campBuildSlots(state: GameState, content: ContentDB): number {
  return campBoost(state, content, "buildSlots");
}

/**
 * Gebäude, die KEINEN Bauplatz belegen: das Zentralhaus (Task-Vorgabe #358) und die Taverne
 * (1.2.0, taverne-spec-technik.md §1 — `CAMP_TAVERN_ID`, Ausnahme wie das Zentralhaus; die
 * Zentralhaus-Kopplung K4 für Stufe II/III bleibt für die Taverne bestehen).
 */
function campBuildingUsesSlot(buildingId: string): boolean {
  return buildingId !== CAMP_TOWNHALL_ID && buildingId !== CAMP_TAVERN_ID;
}

/**
 * Belegte Kapazität = Anzahl GEBAUTER platzbelegender Gebäude (Stufe ≥ 1) + 1, falls gerade ein
 * platzbelegender NEUBAU (Zielstufe 1) läuft (der Bautrupp reserviert den Platz). Zentralhaus und
 * Taverne zählen NIE gegen das Limit (`campBuildingUsesSlot`); Ausbauten (Stufe ≥ 2) belegen keinen
 * neuen Platz.
 */
export function campUsedBuildSlots(state: GameState, content: ContentDB): number {
  const catalog = content.campBuildings ?? [];
  let used = 0;
  for (const b of catalog) {
    if (!campBuildingUsesSlot(b.id)) continue;
    if (campBuildingLevel(state, b.id) >= 1) used++;
  }
  // Lesender Zugriff (nicht `campOf`, s. campBuildingLevel): legt kein Feld an, mutiert nichts.
  const job = state.camp?.buildJob ?? null;
  if (job && campBuildingUsesSlot(job.buildingId) && job.targetLevel === 1) used++;
  return used;
}

/** Maschinenlesbare Ablehnungsgründe von `startCampBuild` (Vertrag für die UI-Welle). */
export type CampBuildStartReason =
  | "ok"
  // KEIN "locked" mehr (Task #365): das Lager steht ab Spielstart offen — s. Block oben.
  | "unknown_building" // ID nicht im Katalog (oder Katalog fehlt)
  | "max_level" // Gebäude ist bereits auf Stufe III
  | "crew_busy" // der EINE Bautrupp arbeitet bereits
  // KEIN "quest_required" mehr (Task #366): kein Katalog-Eintrag setzt `requiresQuest` mehr —
  // Bauteile sind das einzige Stufen-Gate. S. Kommentarblock oben.
  | "townhall_required" // Stufe II/III verlangt Zentralhaus II/III (Balance-K4)
  | "no_slot" // Bauplatz-Limit erreicht (Zentralhaus weiter ausbauen)
  | "cannot_afford"; // Gold oder Materialien reichen nicht

/**
 * codex:2026-07-31T19:00:03+02:00 — flüchtige Aufrufoption für den UI-Debugmodus.
 * Kein State-Feld, keine Save-Persistenz und keine Aufweichung von Crew/Kapazität/Hall-Gates.
 */
export interface CampBuildStartOptions {
  waiveCosts?: boolean;
}

/** Sind Gold + alle Materialien (Inventar + Bank gemeinsam, wie Craft-Inputs) vorhanden? */
function canAfford(state: GameState, levelDef: CampBuildingLevelDef): boolean {
  if (state.character.gold < levelDef.gold) return false;
  for (const cost of levelDef.items) {
    if (itemCount(state.inventory, cost.itemId) + bankCount(state, cost.itemId) < cost.qty) {
      return false;
    }
  }
  return true;
}

/**
 * Verbraucht `qty` eines Materials: ZUERST aus dem Inventar, der Rest aus der Bank — exakt die
 * Craft-Kosten-Semantik (tick.ts `consumeInput`): man muss Baumaterial nicht erst manuell abheben.
 */
function consumeCampInput(state: GameState, itemId: ItemId, qty: number): void {
  const fromInv = Math.min(qty, itemCount(state.inventory, itemId));
  if (fromInv > 0) removeItem(state.inventory, itemId, fromInv);
  const rest = qty - fromInv;
  if (rest > 0) {
    const inBank = state.bank[itemId] ?? 0;
    const take = Math.min(rest, inBank);
    if (take > 0) {
      state.bank[itemId] = inBank - take;
      if (state.bank[itemId]! <= 0) delete state.bank[itemId];
    }
  }
}

/**
 * REINES PRÄDIKAT (Task #364 Fix 5a): Was WÜRDE `startCampBuild` zu diesem Gebäude sagen?
 *
 * Prüft in fester Reihenfolge: Katalog → Stufe+1 gültig → EIN-Bautrupp-Regel → Zentralhaus-
 * Kopplung (Stufe II/III braucht Zentralhaus II/III, Balance-K4) → Bauplatz-Limit (nur NEUBAU
 * eines Nicht-Zentralhaus-Gebäudes; das Zentralhaus zählt nicht gegen das Limit) → Kosten.
 * KEIN Stufen-Quest-Gate mehr (Task #366, s. Kommentarblock oben) — die Bauteile sind Teil der
 * normalen Kosten-Prüfung (`canAfford`/`levelDef.items`), kein eigener Ablehnungsgrund.
 *
 * SEIT TASK #365 OHNE ZUGANGS-GATE: es gibt keine „Lager-Freischaltung" mehr (New Haven ab
 * Spielstart). Der ERSTE Grund, den ein frischer Charakter am Zentralhaus I sehen kann, ist damit
 * `cannot_afford` — nichts sperrt ihn strukturell aus.
 *
 * MUTIERT NICHTS: kein `campOf` (das würde ein fehlendes `state.camp` anlegen), keine Kosten,
 * kein Job. Alle Lese-Helfer auf diesem Pfad (`campBuildingLevel`, `campUsedBuildSlots`,
 * `campBuildSlots`) sind bewusst ebenfalls rein. Damit ist dies die EINE Wahrheit über die
 * Bau-Erlaubnis: `startCampBuild` ruft sie selbst auf, die UI (NewHavenPage) fragt sie für ihre
 * Sperr-Zeile/`disabled`-Logik ab — vorher spiegelte die UI die Reihenfolge in eigenem Code
 * (Audit #363 bestätigte die Spiegelung mit 30 000 Fuzz-Prüfungen als identisch; dieser Export
 * macht ein Auseinanderdriften strukturell unmöglich).
 */
export function campBuildStartReason(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  options: Readonly<CampBuildStartOptions> = {},
): CampBuildStartReason {
  // Release-Schalter (shared TAVERN_ENABLED / engine features.tavern): ohne Taverne ist camp_tavern nicht baubar.
  if (buildingId === CAMP_TAVERN_ID && !features.tavern) return "unknown_building";
  const def = campBuildingDef(content, buildingId);
  if (!def) return "unknown_building";

  const targetLevel = campBuildingLevel(state, buildingId) + 1;
  if (targetLevel > CAMP_MAX_BUILDING_LEVEL || targetLevel > def.levels.length) return "max_level";
  if (state.camp?.buildJob) return "crew_busy";

  const levelDef = def.levels[targetLevel - 1]!;

  // Zentralhaus-Kopplung (Balance-K4): Nicht-Zentralhaus-Gebäude Stufe II/III verlangen Zentralhaus II/III.
  if (buildingId !== CAMP_TOWNHALL_ID && targetLevel >= 2) {
    if (campBuildingLevel(state, CAMP_TOWNHALL_ID) < targetLevel) return "townhall_required";
  }

  // Bauplatz-Limit: nur der NEUBAU (Stufe 0→1) eines platzbelegenden Gebäudes (nicht Zentralhaus,
  // nicht Taverne — s. campBuildingUsesSlot) belegt einen Platz.
  if (campBuildingUsesSlot(buildingId) && targetLevel === 1) {
    if (campUsedBuildSlots(state, content) >= campBuildSlots(state, content)) return "no_slot";
  }

  // codex:2026-07-31T19:00:03+02:00 — nur Kosten dürfen im Debugmodus entfallen.
  if (!options.waiveCosts && !canAfford(state, levelDef)) return "cannot_afford";
  return "ok";
}

/**
 * Startet den Bau der NÄCHSTEN Stufe eines Lager-Gebäudes. Die Erlaubnis-Prüfung (inkl. der festen
 * Reihenfolge der Ablehnungsgründe) liegt vollständig in `campBuildStartReason` — hier steht nur
 * noch die Buchung.
 *
 * Abbuchung über die NORMALEN Pfade: Gold direkt (inkl. `stats.goldSpent`, Muster shop.ts),
 * Materialien Inventar-zuerst-dann-Bank (Craft-Kosten-Semantik). Kein RNG-Zug.
 *
 * Schreibzelt (`buildSpeed`, Balance-K1): verkürzt die Bauzeit MULTIPLIKATIV — aber nur für
 * Jobs, die NACH dem Ausbau starten (remainingMs wird hier EINMAL beim Start berechnet und
 * danach nur noch heruntergezählt; ein laufender Job profitiert bewusst NICHT rückwirkend).
 *
 * VERHÄLTNIS ZUR DORFKARTE (Task #370, ENTSCHEIDUNG): `startCampBuild` bleibt für BEIDE Fälle
 * gültig — Ausbau (Stufe II/III, die Position ändert sich dabei nie) UND Neubau. `placeCampBuilding`
 * löst es beim Neubau NICHT ab, sondern ist der Weg mit EXPLIZIT gewählter Position; wer über die
 * Listen-Ansicht (0.3.0-Karten-Grid, spec §5 „bleibt funktional gültig") ohne Positionswahl baut,
 * bekommt hier automatisch den ersten freien RASTERPLATZ (`campFirstFreeLayoutSlot` — dieselbe
 * Quelle wie Migration und sanitize-Reparatur). Begründung: (a) kein Regressionsrisiko für die
 * ausgelieferte Listen-Ansicht mitten in 0.3.0, (b) Verschieben ist kostenlos und jederzeit
 * möglich, ein Auto-Platz ist also nie eine Sackgasse, (c) die Karte bleibt strukturell
 * konsistent — JEDES Gebäude auf ihr hat eine Position, ohne Sonderfall „ohne Standort".
 */
export function startCampBuild(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  options: Readonly<CampBuildStartOptions> = {},
): CampBuildStartReason {
  const reason = campBuildStartReason(state, content, buildingId, options);
  if (reason !== "ok") return reason;

  // Ab hier ist alles geprüft (Katalog-Treffer, gültige Zielstufe, freier Bautrupp, bezahlbar).
  const def = campBuildingDef(content, buildingId)!;
  const camp = campOf(state);
  const targetLevel = campBuildingLevel(state, buildingId) + 1;
  const levelDef = def.levels[targetLevel - 1]!;

  // codex:2026-07-31T19:00:03+02:00 — Debug-Free bleibt buchungsfrei und nicht persistent.
  if (!options.waiveCosts) {
    state.character.gold -= levelDef.gold;
    state.stats.goldSpent += levelDef.gold;
    for (const cost of levelDef.items) consumeCampInput(state, cost.itemId, cost.qty);
  }

  // Schreibzelt-Tempo: NUR hier, beim Start (nie rückwirkend). Defensiv auf [0, 0.9] geklemmt —
  // der Katalog liefert max. 0.30; die Klemme schützt vor künftigen Content-Fehlern (nie 0 ms).
  const speedCut = Math.max(0, Math.min(0.9, campBoost(state, content, "buildSpeed")));
  const remainingMs = Math.max(TICK_MS, Math.round(levelDef.buildMs * (1 - speedCut)));
  camp.buildJob = { buildingId, targetLevel, remainingMs };

  // Karten-Platz eines NEUBAUS sichern (Task #370, s. Funktions-Doku): hat der Aufrufer die
  // Position nicht schon gesetzt (`placeCampBuilding` tut das), nimmt der Bautrupp den ersten
  // freien Rasterplatz. Ausbauten (targetLevel ≥ 2) stehen bereits — ihre Position bleibt unberührt.
  if (targetLevel === 1) ensureCampPosition(state, buildingId);
  return "ok";
}

/**
 * Bricht den laufenden Bau-Auftrag ab. ERSTATTUNGS-REGEL (Task #358, bewusst die einfachste):
 * 100 % der Kosten kommen zurück — das Gold direkt (inkl. `stats.goldSpent`-Korrektur, damit die
 * Lebenszeit-Statistik nur ECHTE Ausgaben zählt) und die Materialien über `grantLoot`
 * (Inventar → Auto-Bank → Postfach-Überlauf: nichts geht verloren). Kein Exploit-Raum: der
 * Abbruch liefert exakt das Eingezahlte zurück, die investierte Bauzeit verfällt ersatzlos.
 * Liefert false, wenn kein Auftrag läuft (oder das Gebäude im Content nicht mehr existiert —
 * dann wird der Job verworfen, ohne zu erstatten; sanitize räumt solche Jobs beim Load ohnehin).
 */
export function cancelCampBuild(state: GameState, content: ContentDB): boolean {
  const camp = campOf(state);
  const job = camp.buildJob;
  if (!job) return false;
  camp.buildJob = null;
  // Der reservierte Karten-Platz eines abgebrochenen NEUBAUS wird wieder frei (Task #370) — das
  // Gebäude hat nie gestanden. Ein abgebrochener AUSBAU lässt die Position selbstverständlich
  // stehen: das Gebäude steht ja weiterhin auf Stufe I/II.
  // codex:2026-08-03T12:45:00+02:00 — Ein nie fertiggestellter Neubau hinterlässt auch keine
  // visuelle Spieler-Anpassung im Save.
  if (job.targetLevel === 1) {
    if (camp.positions) delete camp.positions[job.buildingId];
    if (camp.mapVisuals) delete camp.mapVisuals[job.buildingId];
  }
  const def = campBuildingDef(content, job.buildingId);
  const levelDef = def?.levels[job.targetLevel - 1];
  if (!levelDef) return false;
  state.character.gold += levelDef.gold;
  state.stats.goldSpent = Math.max(0, state.stats.goldSpent - levelDef.gold);
  for (const cost of levelDef.items) grantLoot(state, content, cost.itemId, cost.qty);
  return true;
}

// ──────────────────────────────────────────────────────────────────────
// Bauwarteschlange (SAVE_VERSION 81, Spieler-Report 1.0.2)
//
// New Haven hat EINEN Bautrupp (encampment-konzept.md Regel 4). Bis hierher hiess das: wer den
// naechsten Bau nicht verpassen wollte, musste zum richtigen Moment wieder reinschauen. Die
// Warteschlange nimmt vor, was danach drankommt.
//
// KOSTEN werden beim START abgebucht, nicht beim Einreihen — eine Warteschlange, die stundenlang
// steht, soll kein Material binden, das der Spieler bis dahin noch braucht. Deshalb kostet auch
// das Entfernen eines Eintrags nichts und erstattet nichts.
// ──────────────────────────────────────────────────────────────────────

/** Ablehnungsgruende beim Einreihen — stabile Codes, die UI rendert `newhaven.queue.reason.*`. */
export type CampQueueReason = "ok" | "unknown_building" | "queue_full" | "max_level_planned";

/**
 * Wie hoch stuende dieses Gebaeude, wenn der laufende Auftrag UND alles bereits Eingereihte fertig
 * waeren? Genau diese Zahl entscheidet, ob ein weiterer Eintrag ueberhaupt Sinn ergibt — dreimal
 * dieselbe Huette einzureihen, wenn sie nur drei Stufen hat, ist eine Sackgasse, keine Planung.
 */
export function campPlannedLevel(state: GameState, buildingId: string): number {
  const camp = state.camp;
  let level = campBuildingLevel(state, buildingId);
  if (camp?.buildJob?.buildingId === buildingId) level = Math.max(level, camp.buildJob.targetLevel);
  for (const id of camp?.buildQueue ?? []) if (id === buildingId) level += 1;
  return level;
}

/**
 * Darf `buildingId` eingereiht werden? Bewusst NUR die Pruefungen, die sich bis zum Anlauf nicht
 * mehr aendern koennen (Katalog-Treffer, Deckel, erreichbare Stufe). Material, Gold, Bauplatz und
 * Zentralhaus-Kopplung werden NICHT vorab geprueft: Planung heisst, dass man das Fehlende bis
 * dahin noch beschafft. Der Anlauf prueft es (`campBuildStartReason`), und die UI zeigt beim
 * wartenden Eintrag an, was ihm heute fehlen wuerde.
 */
export function campEnqueueReason(
  state: GameState,
  content: ContentDB,
  buildingId: string,
): CampQueueReason {
  if (buildingId === CAMP_TAVERN_ID && !features.tavern) return "unknown_building";
  const def = campBuildingDef(content, buildingId);
  if (!def) return "unknown_building";
  const camp = campOf(state);
  if (camp.buildQueue.length >= CAMP_BUILD_QUEUE_MAX) return "queue_full";
  const geplant = campPlannedLevel(state, buildingId);
  if (geplant >= Math.min(CAMP_MAX_BUILDING_LEVEL, def.levels.length)) return "max_level_planned";
  return "ok";
}

/** Haengt ein Gebaeude hinten an die Bauwarteschlange. Kostet nichts (s. Abschnitts-Kopf). */
export function enqueueCampBuild(
  state: GameState,
  content: ContentDB,
  buildingId: string,
): CampQueueReason {
  const reason = campEnqueueReason(state, content, buildingId);
  if (reason !== "ok") return reason;
  campOf(state).buildQueue.push(buildingId);
  return "ok";
}

/** Nimmt den Eintrag an `index` aus der Warteschlange. false = kein solcher Eintrag. */
export function dequeueCampBuild(state: GameState, index: number): boolean {
  const camp = state.camp;
  if (!camp || !Array.isArray(camp.buildQueue)) return false;
  if (!Number.isInteger(index) || index < 0 || index >= camp.buildQueue.length) return false;
  camp.buildQueue.splice(index, 1);
  return true;
}

/**
 * Verschiebt einen Eintrag innerhalb der Warteschlange (Muster `moveQueueItem`, actions.ts).
 * Beide Indizes werden an die Grenzen geklemmt; gleiche Position ist ein No-op.
 */
export function moveCampQueueItem(state: GameState, from: number, to: number): void {
  const camp = state.camp;
  if (!camp || !Array.isArray(camp.buildQueue)) return;
  const n = camp.buildQueue.length;
  if (n < 2 || !Number.isInteger(from) || !Number.isInteger(to)) return;
  const a = Math.max(0, Math.min(n - 1, from));
  const b = Math.max(0, Math.min(n - 1, to));
  if (a === b) return;
  const [eintrag] = camp.buildQueue.splice(a, 1);
  if (eintrag === undefined) return;
  camp.buildQueue.splice(b, 0, eintrag);
}

/**
 * Laesst den naechsten Warteschlangen-Eintrag anlaufen, sobald der Bautrupp frei ist. Liefert den
 * Grund des Startversuchs zurueck, oder null, wenn es nichts zu tun gab (Bautrupp belegt oder
 * Warteschlange leer).
 *
 * Ein FEHLGESCHLAGENER Start konsumiert den Eintrag NICHT — er bleibt vorn stehen und wartet.
 * Das ist die bewusste Gegenentscheidung zur Aktions-Warteschlange, die gesperrte Kampf-Eintraege
 * mit Grund verwirft: dort folgt sofort der naechste Eintrag, hier waere der Bau schlicht weg,
 * obwohl der Spieler ihn geplant hat. Ist der Eintrag dagegen UNMOEGLICH geworden (Gebaeude aus
 * dem Katalog verschwunden, Stufe inzwischen anderweitig erreicht), faellt er raus — sonst
 * blockierte er die Warteschlange fuer immer.
 *
 * Aufgerufen nach jedem Bau-Abschluss (`tickCampBuild`) und aus der New-Haven-Seite, wenn der
 * Bautrupp leer steht. BEWUSST nicht jeden Tick: solange kein Bau fertig wird und der Spieler
 * nichts tut, aendert sich am Ergebnis nichts, und beim Offline-Aufholen waeren es zehntausende
 * Laeufe umsonst.
 */
export function advanceCampQueue(state: GameState, content: ContentDB): CampBuildStartReason | null {
  const camp = state.camp;
  if (!camp || camp.buildJob || !Array.isArray(camp.buildQueue) || camp.buildQueue.length === 0) {
    return null;
  }
  const buildingId = camp.buildQueue[0]!;
  const reason = startCampBuild(state, content, buildingId);
  if (reason === "ok") {
    camp.buildQueue.shift();
    return "ok";
  }
  // Dauerhaft unmoeglich ⇒ raus, sonst steht die Warteschlange fuer immer.
  if (reason === "unknown_building" || reason === "max_level") camp.buildQueue.shift();
  return reason;
}

/**
 * Tick-Integration (aufgerufen aus tick.ts `step()` — VOR dem Kampf-Zweig, damit der Bautrupp
 * auch während Kampf/Betäubung/Offline-Catch-up weiterarbeitet): zählt `remainingMs` um TICK_MS
 * herunter; bei ≤ 0 wird die Zielstufe gutgeschrieben, der Bautrupp frei und der Breadcrumb
 * (`lastCompletedBuild` + monotones `buildSeq`) für UI-Toast/Offline-Report gesetzt.
 * Rein arithmetisch, KEIN RNG, kein Content-Zugriff — bit-identisch offline==online.
 */
export function tickCampBuild(state: GameState): void {
  const camp = state.camp;
  if (!camp || typeof camp !== "object") return;
  const job = camp.buildJob;
  if (!job) return;
  job.remainingMs -= TICK_MS;
  if (job.remainingMs > 0) return;
  camp.buildJob = null;
  camp.buildings[job.buildingId] = job.targetLevel;
  camp.buildSeq += 1;
  camp.lastCompletedBuild = {
    buildingId: job.buildingId,
    level: job.targetLevel,
    seq: camp.buildSeq,
  };
}

/**
 * Bautrupp-Schritt inklusive Warteschlange (SAVE_VERSION 81): schliesst den laufenden Auftrag ab
 * (`tickCampBuild`) und laesst danach den naechsten geplanten Bau anlaufen. Genau so haengt die
 * Kette auch beim Offline-Aufholen durch — jeder Abschluss startet den folgenden Bau.
 *
 * Getrennt von `tickCampBuild` gehalten, weil DIESE Funktion den Content braucht (Kosten,
 * Bauzeit, Katalog) und `tickCampBuild` bewusst rein arithmetisch bleibt.
 */
export function tickCampCrew(state: GameState, content: ContentDB): void {
  const lief = state.camp?.buildJob != null;
  tickCampBuild(state);
  // Nur wenn gerade wirklich etwas fertig geworden ist — sonst prueft der Tick bei leerer
  // Baustelle jedes Mal die Warteschlange durch (offline zehntausende Male umsonst).
  if (lief && state.camp?.buildJob == null) advanceCampQueue(state, content);
}

/**
 * codex:2026-07-31T20:21:01+02:00 — Flüchtiger New-Haven-Debugbefehl: schließt den EINEN
 * möglichen laufenden Bau über denselben Abschlussweg wie der reguläre Tick ab. Keine Kosten-,
 * Kapazitäts- oder Platzierungsregel wird umgangen; ohne Auftrag bleibt der State unverändert.
 */
export function debugCompleteCampBuild(state: GameState): boolean {
  const job = state.camp?.buildJob;
  if (!job) return false;
  job.remainingMs = 0;
  tickCampBuild(state);
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// NEW-HAVEN-DORFKARTE — FREIE PLATZIERUNG (Task #370, SAVE_VERSION 78)
//
// Grundlage: design/newhaven-karte-spec.md §2 (Kernmechanik) + §4 (Logik-Umfang), Chef-Entscheid
// 28.07. (Karte kommt in 0.3.0 mit Platzhalter-Grafik; freie Platzierung statt fester Bauslots).
//
// GEOMETRIE LEBT IN SHARED (CAMP_MAP_BUILDABLE, campFootprint, campPointInBuildable,
// campBoxesOverlap, campLayoutSlots, campRepairPositions) — dieselben Konstanten benutzen Engine,
// persistence-Sanitize UND die UI, damit „was die Karte hell zeichnet" und „was die Engine
// erlaubt" strukturell nicht auseinanderlaufen können. Hier stehen nur die SPIELSTAND-abhängigen
// Prädikate und die Verben. Alles rein arithmetisch: kein RNG, keine Zeitquelle.
// ═══════════════════════════════════════════════════════════════════════════════════════════════

/** Ein Gebäude mit seinem Standort auf der Karte (Lese-Form für die UI). */
export interface CampPlacedBuilding {
  buildingId: CampBuildingId;
  pos: CampPos;
}

/**
 * Standort eines Gebäudes auf der Karte (normalisiert 0..1) oder null, wenn es nicht auf der Karte
 * steht. LESEND (kein `campOf`): legt kein `camp`-Feld an.
 */
export function campBuildingPosition(state: GameState, buildingId: string): CampPos | null {
  const raw = state.camp?.positions?.[buildingId];
  if (!raw || typeof raw !== "object") return null;
  if (!Number.isFinite(raw.x) || !Number.isFinite(raw.y)) return null;
  return { x: raw.x, y: raw.y };
}

/**
 * ALLE belegten Standorte (gebaute Gebäude + der reservierte Platz eines laufenden Neubaus), in
 * der Reihenfolge, in der sie im Save stehen (nach einem Load = Katalog-Reihenfolge). Die UI
 * zeichnet daraus die Karte; die Kollisionsprüfung unten liest dieselbe Quelle.
 */
export function campOccupiedPositions(state: GameState): CampPlacedBuilding[] {
  const positions = state.camp?.positions;
  if (!positions || typeof positions !== "object") return [];
  const out: CampPlacedBuilding[] = [];
  for (const [buildingId, pos] of Object.entries(positions)) {
    if (!pos || typeof pos !== "object") continue;
    if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) continue;
    out.push({ buildingId, pos: { x: pos.x, y: pos.y } });
  }
  return out;
}

/** Rein geometrische Ablehnungsgründe einer Wunschposition. */
export type CampPositionReason =
  | "ok"
  | "out_of_bounds"; // nicht endlich, außerhalb 0..1 oder mit der vollen Bühne über dem Kartenrand

/**
 * REINES PRÄDIKAT der Geometrie: Darf `buildingId` seinen Mittelpunkt auf (x, y) haben?
 *
 * Die Eingabe wird ZUERST geklemmt/gerundet (`campClampPos`) — exakt auf die Zahl, die die Verben
 * anschließend speichern. Damit sagt das Prädikat nie „ok" zu einem Wert, der gespeichert dann
 * woanders läge (und umgekehrt).
 *
 * codex:2026-07-31T23:56:00+02:00 — Gebäude besitzen keine gegenseitige Hitbox mehr. Die Bühne muss
 * vollständig innerhalb der Karte bleiben, darf aber beliebig viele andere Bühnen überlagern.
 * MUTIERT NICHTS (die UI ruft das pro Mausbewegung im Ziehen auf).
 */
export function campPositionReason(
  state: GameState,
  buildingId: string,
  x: number,
  y: number,
): CampPositionReason {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "out_of_bounds";
  if (x < 0 || x > 1 || y < 0 || y > 1) return "out_of_bounds";
  const pos = campClampPos({ x, y });
  // codex:2026-07-31T23:56:00+02:00 — keine Sperrpolygone, Slots oder Gebäude-Kollision; nur Kartenrand.
  if (!campPositionFitsMap(buildingId, pos)) return "out_of_bounds";
  return "ok";
}

/**
 * Maschinenlesbare Ablehnungsgründe von `placeCampBuilding` (Vertrag für die UI-Welle). Obermenge
 * von `CampBuildStartReason` — die Bau-Gates werden unverändert von `campBuildStartReason`
 * übernommen (EINE Wahrheit, kein zweiter Regelsatz), dazu kommen die Karten-Gründe.
 *
 * In der Praxis erreichbar sind: unknown_building, already_built, out_of_bounds,
 * crew_busy, no_slot, cannot_afford. `max_level`/`townhall_required` können hier NICHT auftreten
 * (sie setzen eine bereits gebaute Stufe voraus — das fängt `already_built` vorher ab); sie stehen
 * nur in der Union, weil der Bau-Grund unverändert durchgereicht wird.
 */
export type CampPlacementReason = CampBuildStartReason | "already_built" | CampPositionReason;

/**
 * REINES PRÄDIKAT (Muster `campBuildStartReason`, Task #364 Fix 5a): Was WÜRDE
 * `placeCampBuilding` zu dieser Position sagen? Feste Reihenfolge (Task-Vorgabe #370):
 *
 *   Katalog → noch nicht gebaut → Kartenrand → [Bau-Gates: EIN Bautrupp →
 *   Zentralhaus-Kopplung → Bauplatz-Limit → Kosten]
 *
 * Die vier Bau-Gates in Klammern stammen 1:1 aus `campBuildStartReason` — inklusive der Tatsache,
 * dass es seit Task #366 KEIN Quest-Gate der Stufe mehr gibt (die Bauteil-Materialien sind das
 * alleinige Pacing und laufen über die normale Kosten-Prüfung). Käme je wieder eines, wirkte es
 * hier automatisch mit.
 *
 * `buildSlots` bleibt die reine ANZAHL-Grenze (spec §2.1): WO gebaut wird, entscheidet die Fläche,
 * WIE VIELE gleichzeitig, entscheidet das Zentralhaus.
 */
export function campPlacementReason(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  x: number,
  y: number,
  options: Readonly<CampBuildStartOptions> = {},
): CampPlacementReason {
  const def = campBuildingDef(content, buildingId);
  if (!def) return "unknown_building";
  if (campBuildingLevel(state, buildingId) >= 1) return "already_built";
  const geo = campPositionReason(state, buildingId, x, y);
  if (geo !== "ok") return geo;
  return campBuildStartReason(state, content, buildingId, options);
}

/**
 * PLATZIERUNG + BAUSTART IN EINEM SCHRITT (spec §4): setzt den Standort und startet sofort den
 * Neubau (Stufe I). Die Erlaubnis-Prüfung liegt vollständig in `campPlacementReason`, die
 * Kosten-Buchung unverändert in `startCampBuild` — hier steht nur die Reihenfolge.
 *
 * Die Position wird VOR dem Baustart gesetzt, damit `startCampBuild` sie vorfindet und nicht
 * automatisch einen Rasterplatz vergibt. Scheitert der Start wider Erwarten doch (kann nach dem
 * Prädikat nicht passieren — defensiv), wird die Reservierung zurückgenommen: kein halber Zustand.
 */
export function placeCampBuilding(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  x: number,
  y: number,
  options: Readonly<CampBuildStartOptions> = {},
): CampPlacementReason {
  const reason = campPlacementReason(state, content, buildingId, x, y, options);
  if (reason !== "ok") return reason;
  const camp = campOf(state);
  if (!camp.positions || typeof camp.positions !== "object") camp.positions = {};
  camp.positions[buildingId] = campClampPos({ x, y });
  const started = startCampBuild(state, content, buildingId, options);
  if (started !== "ok") {
    delete camp.positions[buildingId];
    return started;
  }
  return "ok";
}

/** Maschinenlesbare Ablehnungsgründe von `moveCampBuilding` (Vertrag für die UI-Welle). */
export type CampMoveReason =
  | "unknown_building" // ID nicht im Katalog (oder Katalog fehlt)
  | "not_placed" // steht gar nicht auf der Karte (nie gebaut)
  | "under_construction" // GENAU DIESES Gebäude wird gerade gebaut/ausgebaut — der Bautrupp zieht nicht um
  | CampPositionReason; // "ok" | "out_of_bounds"

/**
 * REINES PRÄDIKAT: Was WÜRDE `moveCampBuilding` sagen? Gates in fester Reihenfolge:
 * Katalog → nicht im Bau → steht überhaupt auf der Karte → Kartenrand.
 * KEINE Kosten, KEIN Bautrupp, KEIN Bauplatz-Limit — Verschieben ist reine Anordnung.
 */
export function campMoveReason(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  x: number,
  y: number,
): CampMoveReason {
  if (!campBuildingDef(content, buildingId)) return "unknown_building";
  if (state.camp?.buildJob?.buildingId === buildingId) return "under_construction";
  if (campBuildingLevel(state, buildingId) < 1) return "not_placed";
  if (!campBuildingPosition(state, buildingId)) return "not_placed";
  return campPositionReason(state, buildingId, x, y);
}

/**
 * VERSCHIEBEN (spec §4, Chef-Entscheid 28.07.): kostenlos, jederzeit, keine Bauzeit, keine
 * Progression — reine Anordnung. Das gerade im Bau/Ausbau befindliche Gebäude ist gesperrt
 * (der Bautrupp zieht nicht mit um). Ändert AUSSCHLIESSLICH `camp.positions[buildingId]`:
 * keine Stufe, kein Gold, kein Material, kein Boost, kein `buildSeq`.
 */
export function moveCampBuilding(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  x: number,
  y: number,
): CampMoveReason {
  const reason = campMoveReason(state, content, buildingId, x, y);
  if (reason !== "ok") return reason;
  const camp = campOf(state);
  camp.positions[buildingId] = campClampPos({ x, y });
  return "ok";
}

/**
 * codex:2026-08-03T12:45:00+02:00 — Speichert die rein visuelle Karten-Anpassung eines stehenden
 * Gebäudes. Sie verändert weder Position noch Progression und bleibt deshalb über Ausbauten hinweg
 * erhalten. Werte werden an derselben Shared-Grenze geklemmt, die Persistence und UI verwenden.
 */
export function setCampMapVisual(
  state: GameState,
  content: ContentDB,
  buildingId: string,
  visual: CampMapVisual,
): boolean {
  if (!campBuildingDef(content, buildingId)) return false;
  if (!campBuildingPosition(state, buildingId)) return false;
  if (!Number.isFinite(visual.scalePercent)) return false;
  const camp = campOf(state);
  camp.mapVisuals ??= {};
  camp.mapVisuals[buildingId] = {
    scalePercent: Math.max(
      CAMP_MAP_VISUAL_SCALE_MIN_PERCENT,
      Math.min(CAMP_MAP_VISUAL_SCALE_MAX_PERCENT, Math.round(visual.scalePercent)),
    ),
    flipped: visual.flipped === true,
  };
  return true;
}

/** Entfernt den Override; der Renderer verwendet wieder den rangabhängigen Standard. */
export function resetCampMapVisual(
  state: GameState,
  content: ContentDB,
  buildingId: string,
): boolean {
  if (!campBuildingDef(content, buildingId)) return false;
  const camp = campOf(state);
  if (!camp.mapVisuals?.[buildingId]) return false;
  delete camp.mapVisuals[buildingId];
  return true;
}

/** Maschinenlesbare Ablehnungsgründe von `demolishCampBuilding` (Vertrag für die UI-Welle). */
export type CampDemolishReason =
  | "ok"
  | "unknown_building" // ID nicht im Katalog (oder Katalog fehlt)
  | "not_built" // steht nicht (Stufe 0) — es gibt nichts abzureißen
  | "under_construction"; // an DIESEM Gebäude arbeitet der Bautrupp gerade (erst abbrechen)

/** REINES PRÄDIKAT: Was WÜRDE `demolishCampBuilding` sagen? Katalog → nicht im Bau → steht. */
export function campDemolishReason(
  state: GameState,
  content: ContentDB,
  buildingId: string,
): CampDemolishReason {
  if (!campBuildingDef(content, buildingId)) return "unknown_building";
  if (state.camp?.buildJob?.buildingId === buildingId) return "under_construction";
  if (campBuildingLevel(state, buildingId) < 1) return "not_built";
  return "ok";
}

/** Erstattung eines Abrisses: Gold + Materialien (bereits halbiert und abgerundet). */
export interface CampDemolishRefund {
  gold: number;
  items: { itemId: ItemId; qty: number }[];
}

/**
 * ERSTATTUNGS-MATHEMATIK des Abrisses (spec §4-Tabelle, REINE Vorschau — mutiert nichts, die UI
 * zeigt sie im Bestätigungs-Dialog):
 *
 *   Erst über ALLE GEBAUTEN Stufen summieren, dann halbieren und abrunden — je Posten einzeln
 *   (Gold für sich, jedes Material für sich; Bauteile `timber_*` zählen wie jedes andere Material).
 *
 * Bewusst „summieren, dann halbieren" (nicht „je Stufe halbieren, dann summieren"): sonst wäre
 * Abreißen auf hoher Stufe eine Falle, weil jede Stufe einzeln abgerundet würde. Beispiel
 * Fischerhütte (Katalog): Stufe I 300 Gold, Stufe II 1 500 Gold ⇒ Σ 1 800 ⇒ zurück 900.
 * Ungerade Summen fallen zugunsten des Spiels: 5 + 8 = 13 Bretter ⇒ 6 zurück.
 *
 * Posten mit Erstattung 0 (z.B. ein einzelnes Bauteil einer Stufe-I-Hütte) entfallen ganz.
 */
export function campDemolishRefund(
  state: GameState,
  content: ContentDB,
  buildingId: string,
): CampDemolishRefund {
  const def = campBuildingDef(content, buildingId);
  const level = campBuildingLevel(state, buildingId);
  if (!def || level < 1) return { gold: 0, items: [] };
  let gold = 0;
  const totals = new Map<ItemId, number>();
  for (let i = 0; i < level && i < def.levels.length; i++) {
    const levelDef = def.levels[i]!;
    if (Number.isFinite(levelDef.gold)) gold += levelDef.gold;
    for (const cost of levelDef.items) {
      if (!Number.isFinite(cost.qty)) continue;
      totals.set(cost.itemId, (totals.get(cost.itemId) ?? 0) + cost.qty);
    }
  }
  const items: { itemId: ItemId; qty: number }[] = [];
  for (const [itemId, qty] of totals) {
    const half = Math.floor(qty / 2);
    if (half > 0) items.push({ itemId, qty: half });
  }
  return { gold: Math.max(0, Math.floor(gold / 2)), items };
}

/**
 * ABREISSEN (spec §4): entfernt das Gebäude vollständig — Stufe auf 0, Karten-Platz frei,
 * Bauplatz-Limit wieder offen — und erstattet 50 % der Summe aller gebauten Stufen, abgerundet
 * (`campDemolishRefund`).
 *
 * Erstattung über EXAKT dieselben Normalpfade wie `cancelCampBuild`: Gold direkt (inkl.
 * `stats.goldSpent`-Korrektur um den erstatteten Anteil — die Lebenszeit-Statistik zählt damit die
 * ECHTEN Netto-Ausgaben; ohne die Korrektur würde eine Bau-/Abriss-Schleife die Statistik
 * aufblähen), Materialien über `grantLoot` (Inventar → Auto-Bank → Postfach-Überlauf: nichts geht
 * verloren, auch bei vollem Inventar).
 *
 * Nebenwirkungen, die zwingend mitmüssen:
 *  • `camp.refine[buildingId]` wird gelöscht — eine abgerissene Anlage hat kein Rezept mehr laufen.
 *  • `camp.buildSeq` wird erhöht: es ist der Cache-Schlüssel von `campBoostCached` (s. dortige
 *    Doku „wer camp.buildings direkt mutiert, muss buildSeq mit anfassen"). Ohne den Schritt läsen
 *    alle Tick-Konsumenten die Boosts des abgerissenen Gebäudes weiter. Der Breadcrumb
 *    `lastCompletedBuild` bleibt unangetastet (ein Abriss ist keine Fertigstellung) — der
 *    Bau-fertig-Toast der UI hängt allein an ihm und meldet sich deshalb nicht.
 */
export function demolishCampBuilding(
  state: GameState,
  content: ContentDB,
  buildingId: string,
): CampDemolishReason {
  const reason = campDemolishReason(state, content, buildingId);
  if (reason !== "ok") return reason;
  const refund = campDemolishRefund(state, content, buildingId);
  const camp = campOf(state);

  delete camp.buildings[buildingId];
  if (camp.positions) delete camp.positions[buildingId];
  // codex:2026-08-03T12:45:00+02:00 — Ein Abriss entfernt die persönliche Karten-Darstellung.
  if (camp.mapVisuals) delete camp.mapVisuals[buildingId];
  if (camp.refine) delete camp.refine[buildingId];
  camp.buildSeq += 1;

  state.character.gold += refund.gold;
  state.stats.goldSpent = Math.max(0, state.stats.goldSpent - refund.gold);
  for (const item of refund.items) grantLoot(state, content, item.itemId, item.qty);
  return "ok";
}

/**
 * Sichert dem Gebäude einen Karten-Platz, falls es noch keinen hat: erster freier Rasterplatz
 * (`campFirstFreeLayoutSlot` — dieselbe Quelle wie Migration und sanitize-Reparatur). Ist das
 * Raster voll (nur mit einem von Hand verbogenen Save erreichbar), fällt es auf den ersten
 * Rasterplatz bzw. die Kartenmitte zurück: kosmetische Überlappung statt „Gebäude ohne Standort".
 * Intern — der Aufruf sitzt in `startCampBuild` (Neubau ohne vorherige Positionswahl).
 */
function ensureCampPosition(state: GameState, buildingId: string): void {
  const camp = campOf(state);
  if (!camp.positions || typeof camp.positions !== "object") camp.positions = {};
  if (campBuildingPosition(state, buildingId)) return;
  const taken = campOccupiedPositions(state)
    .filter((p) => p.buildingId !== buildingId)
    .map((p) => ({ id: p.buildingId, pos: p.pos }));
  const slot = campFirstFreeLayoutSlot(taken, buildingId);
  camp.positions[buildingId] = slot ?? { x: 0.5, y: 0.5 };
}
