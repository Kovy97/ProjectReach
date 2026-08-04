import type {
  ActionDef,
  ActionId,
  CampBoostKind,
  CampBuildingId,
  CampRefineSlot,
  CampState,
  ContentDB,
  GameState,
  ItemId,
} from "@hearthforge/shared";
import { CAMP_MAX_BUILDING_LEVEL, campBoostSum } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { itemCount, removeItem, canHold } from "./inventory";
import { canDeposit } from "./bank";
import { grantLoot } from "./mail";
import { campBoostCached, campBuildingLevel } from "./camp";

/**
 * Offline-Veredelung (Schmelzofen / Räucherhaus) — Das Lager Phase 1, Task #359, SAVE_VERSION 77.
 *
 * Bindende Grundlage: design/encampment-balance.md §4 (Spezifikation + Raten-Nachweis) und §7
 * (Guards). Die Anlagen veredeln „nebenher" — LIVE wie OFFLINE, weil `tickCampRefine` PRO TICK in
 * der Tick-Schleife von tick.ts `advance()` läuft (seit Task #335) und damit denselben Pfad wie
 * der Offline-Catch-up nimmt.
 *
 * DIE VIER EISERNEN REGELN DIESES MODULS (balance.md §4.3):
 *  1. KEIN RNG-Zug — nichts hier zieht `state.rng`/`state.eliteRng`. Die RNG-Sequenz bleibt
 *     bit-identisch ⇒ alle bestehenden Determinismus-/Sim-Fixtures sind unberührt.
 *  2. KEIN XP und KEIN Mastery-XP — die Anlage ersetzt kein aktives Skilling, sie spart nur Zeit.
 *     Auch `stats.itemsCrafted`/`craftedById` bleiben unberührt: veredelte Barren zählen nicht als
 *     „geschmiedet" (sonst würden Crafting-Quests/Achievements offline durchlaufen).
 *  3. KEINE Preservation, KEIN Doppelertrag — strikt 1 Rezept-Ausstoß je Durchlauf.
 *  4. KEINE Zeit aus dem Nichts — `accMs` sammelt ausschließlich GETICKTE Spielzeit; ohne
 *     gebautes Gebäude (Rate 0) und ohne gewähltes Rezept passiert gar nichts.
 *
 * DETERMINISMUS offline==online: die Verarbeitung ist reine Akkumulator-Arithmetik
 * (`accMs += dtMs`, dann so viele Durchläufe wie hineinpassen). Bei KONSTANTEM Input/Platz ist sie
 * chunk-invariant (Guard: refine.test.ts „ein 8-h-Sprung == 288 000 Einzel-Ticks"); ändert sich
 * der Bestand IM Fenster (Input entsteht erst aus einer laufenden Aktion), zählt die AUFRUF-Form —
 * darum tickt `advance` die Anlage seit Task #335 PRO TICK statt einmal pro Fenster (Guard:
 * camp-audit-334x.test.ts Test 3, Byte-Gleichheit).
 */

/** Die beiden Veredelungs-Arten. Der Schmelzofen schmilzt, das Räucherhaus räuchert. */
const REFINE_KINDS = ["smeltRate", "smokeRate"] as const;
export type RefineKind = (typeof REFINE_KINDS)[number];

/** Eine Stunde in ms — die Raten aus dem Balance-Doc sind „Stück pro Stunde" (20/40/60). */
const MS_PER_HOUR = 3_600_000;

/**
 * Skill, den ein Gebäude verarbeitet (balance.md §4.1): der Schmelzofen ausschließlich Smithing-
 * Schmelzrezepte, das Räucherhaus ausschließlich 1-Zutat-Kochrezepte.
 */
const REFINE_SKILL: Record<RefineKind, "smithing" | "cooking"> = {
  smeltRate: "smithing",
  smokeRate: "cooking",
};

/**
 * Namens-Präfix der zulässigen Rezepte je Art (balance.md §4.1 wörtlich: „Schmelzofen nur
 * `smelt_*` (Erz→Barren), Räucherhaus nur 1-Zutat-Rezepte (`cook_<fisch/fleisch>`)"). Das Präfix
 * schließt zusätzlich zum Skill-Filter artfremde Rezepte desselben Skills aus (z.B. `forge_*`
 * oder `recycle_*` im Smithing).
 */
const REFINE_PREFIX: Record<RefineKind, string> = {
  smeltRate: "smelt_",
  smokeRate: "cook_",
};

// ── Gebäude-Auflösung ───────────────────────────────────────────────────────────────────────────

/**
 * Cache für `refineBuildingId` — reine Funktion der CONTENT-Identität (der Katalog ist zur
 * Laufzeit unveränderlich; Tests mit eigenem `bare`-Katalog bekommen über die WeakMap-Identität
 * automatisch einen frischen Eintrag). Nötig seit dem per-Tick-Umbau (Task #335): der Katalog-Scan
 * lief sonst bis zu ~2 × 300k-mal pro 8-h-Offline-Catch-up.
 */
const buildingIdCache = new WeakMap<ContentDB, Partial<Record<RefineKind, CampBuildingId | null>>>();

/**
 * Die Gebäude-ID zu einer Veredelungs-Art — KATALOG-getrieben (Muster camp.ts `campKindAtMaxLevel`):
 * gesucht wird das Gebäude, dessen Stufen diese Rate liefern. Kein Hardcoding von `camp_smelter`/
 * `camp_smokehouse`; benennt der Content je um, wandert die Anlage automatisch mit. null ohne
 * Katalog / ohne passendes Gebäude (dann ist das Feature komplett inert).
 */
export function refineBuildingId(content: ContentDB, kind: RefineKind): CampBuildingId | null {
  let entry = buildingIdCache.get(content);
  if (!entry) {
    entry = {};
    buildingIdCache.set(content, entry);
  }
  const cached = entry[kind];
  if (cached !== undefined) return cached;
  let found: CampBuildingId | null = null;
  for (const b of content.campBuildings ?? []) {
    if (b.levels.some((l) => l.boost.kind === (kind as CampBoostKind))) {
      found = b.id;
      break;
    }
  }
  entry[kind] = found;
  return found;
}

/**
 * Die Veredelungs-Art eines Gebäudes (Umkehrung von `refineBuildingId`) — null, wenn das Gebäude
 * gar keine Veredelungs-Anlage ist. Der EINE Zulässigkeits-Test für `camp.refine`-Schlüssel
 * (Engine-Verben UND persistence-Sanitize denken in dieser Funktion).
 */
export function refineKindOf(content: ContentDB, buildingId: CampBuildingId): RefineKind | null {
  for (const kind of REFINE_KINDS) {
    if (refineBuildingId(content, kind) === buildingId) return kind;
  }
  return null;
}

/**
 * Durchsatz-Rate eines Veredelungs-Gebäudes in Stück/h (Summe der gebauten Stufen-Deltas:
 * 20/40/60). 0 ohne gebautes Gebäude ⇒ die Anlage ruht (Guard: ohne Lager passiert NICHTS).
 * Seit Task #335 über den GECACHTEN Boost-Pfad (camp.ts `campBoostCached`, der sanktionierte
 * Per-Tick-Lesepfad laut balance.md §7.1 — sein Doc-Kommentar nennt die Veredelung explizit):
 * dieselben Werte, aber ohne Gebäude-Scan pro Tick. Cache-Vertrag beachten: wer `camp.buildings`
 * direkt mutiert (Tests!), muss `camp.buildSeq` mit anfassen.
 */
export function refineRatePerHour(state: GameState, content: ContentDB, kind: RefineKind): number {
  return Math.max(0, campBoostCached(state, content, kind as CampBoostKind));
}

/**
 * Spielzeit EINES Durchlaufs in ms (`3 600 000 / Rate`, aufgerundet auf ganze ms — der Akkumulator
 * rechnet in ganzen ms und darf nie durch eine 0-Dauer in eine Endlosschleife laufen).
 * `Number.POSITIVE_INFINITY` bei Rate 0 (Anlage ruht) — dann schließt NIE ein Durchlauf ab.
 */
export function refineMsPerRun(rate: number): number {
  if (!(rate > 0) || !Number.isFinite(rate)) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.ceil(MS_PER_HOUR / rate));
}

/**
 * Die LÄNGSTE Durchlauf-Dauer, die ein Slot laut Katalog je tragen kann — die Rate der ERSTEN
 * (langsamsten) Stufe. Reiner Katalog-Wert, unabhängig vom Spielstand; Rückfall auf eine Stunde,
 * wenn der Katalog die Anlage gar nicht kennt (nie Infinity: der Wert landet als Klemme in einem
 * Save-Feld).
 */
function slowestMsPerRun(content: ContentDB, kind: RefineKind): number {
  const id = refineBuildingId(content, kind);
  const def = (content.campBuildings ?? []).find((b) => b.id === id);
  const first = def?.levels.find((l) => l.boost.kind === (kind as CampBoostKind));
  const rate = first && Number.isFinite(first.boost.value) ? first.boost.value : 0;
  const perRun = refineMsPerRun(rate);
  return Number.isFinite(perRun) ? perRun : MS_PER_HOUR;
}

/**
 * Obergrenze des Fortschritts-Akkumulators (`CampRefineSlot.accMs`) für die TATSÄCHLICHE
 * Ausbaustufe der Anlage in DIESEM Lager — die Klemme, die persistence-Sanitize auf einen
 * geladenen `accMs` anwendet.
 *
 * Maßgeblich ist `msPerRun` der real gebauten Stufen (Stufe I 20/h ⇒ 180 000 ms, II 40/h ⇒
 * 90 000 ms, III 60/h ⇒ 60 000 ms), NICHT die Bestmarke des Katalogs: die Engine lädt den
 * Akkumulator bis auf GENAU EINEN Durchlauf der eigenen Stufe auf (tickOneRefinery, „verlustfreie
 * Klemme"), ein Stufe-I-Schmelzofen trägt also legitim bis zu 180 000 ms. Gegen die 60 000 ms der
 * Endstufe zu klemmen (Stand vor Task #364) hat genau diesen legitimen Fortschritt bei JEDEM Laden
 * abgeschnitten — bis zu 120 000 ms Spielzeit pro Slot (Audit #363, Befund „Veredelungs-
 * Fortschritt geht beim Laden verloren").
 *
 * Ohne gebaute Anlage (Rate 0, `msPerRun` = Infinity) tickt der Slot gar nicht — statt ihn auf
 * einen willkürlichen Wert zu stutzen, gilt dann die längste je legitime Dauer (`slowestMsPerRun`).
 */
export function refineAccCapMs(
  camp: CampState | null | undefined,
  content: ContentDB,
  kind: RefineKind,
): number {
  const perRun = refineMsPerRun(campBoostSum(camp, content.campBuildings, kind as CampBoostKind));
  return Number.isFinite(perRun) ? perRun : slowestMsPerRun(content, kind);
}

// ── Rezept-Eligibility („beherrschte 1-Input-Basisrezepte") ─────────────────────────────────────

/**
 * Ist `action` ein für `kind` zulässiges Veredelungs-Rezept? Die Bedingungen kommen 1:1 aus
 * balance.md §4.1/§4.2 — sie halten Balance UND Determinismus sauber:
 *
 *  (a) richtiger Skill (Schmelzofen Smithing / Räucherhaus Cooking) und richtiges ID-Präfix,
 *  (b) GENAU EIN Haupt-Input („1-Input-Basisrezepte") — mehrzutatige Legierungen (`smelt_bronze`)
 *      und Bankette/Eintöpfe bleiben bewusst aktives Handwerk („das beste Essen bleibt
 *      handgemacht") — PLUS optional `coal` als zweiter, vollständig verbrauchter Input (Sim-
 *      Report §2.1, Task #366 P1: ab `smelt_steel` braucht JEDE Schmelzrezept-Stufe zusätzlich
 *      Kohle; ohne diese Ausnahme qualifizierten nur 2 von 14 `smelt_*`-Rezepten für den
 *      65 000-Gold-Schmelzofen). Zwei Nicht-Kohle-Zutaten oder zwei Kohle-Einträge bleiben
 *      unzulässig — nur GENAU „1 Hauptstoff + optional Kohle" ist erlaubt.
 *  (c) GENAU EIN garantierter, deterministischer Output: ein Loot-Roll mit `chance >= 1` und
 *      `min === max`. Alles andere bräuchte einen RNG-Zug — verboten (Regel 1).
 *  (d) KEINE Erfolgs-/Fehlschlag-Mechanik (`successBase`): auch die bräuchte einen Wurf.
 *
 * Die LEVEL-Anforderung prüft `refineRecipeKnown` separat (sie hängt am Spielstand, nicht am
 * Rezept) — so bleibt diese Funktion eine reine Content-Aussage und ist auch für die UI-Liste
 * („welche Rezepte gibt es überhaupt?") brauchbar.
 */
export function isRefineRecipe(action: ActionDef | undefined, kind: RefineKind): boolean {
  if (!action) return false;
  if (action.skill !== REFINE_SKILL[kind]) return false;
  if (!action.id.startsWith(REFINE_PREFIX[kind])) return false;
  if (!action.inputs || !hasEligibleInputShape(action.inputs)) return false;
  if (action.successBase !== undefined) return false;
  if (!Array.isArray(action.loot) || action.loot.length !== 1) return false;
  const out = action.loot[0]!;
  return !!out.itemId && out.chance >= 1 && out.min === out.max && out.min > 0;
}

/**
 * Prüft die Input-Form (b) oben: entweder genau 1 Eintrag (jede Ware, inkl. Kohle selbst — ein
 * reines Kohle-Rezept ist erlaubt), oder genau 2 Einträge, von denen GENAU EINER `coal` ist und
 * der ANDERE nicht — beide mit `qty > 0`. Alles andere (0, ≥3, zwei Kohle-, zwei Nicht-Kohle-
 * Einträge) ist unzulässig.
 */
function hasEligibleInputShape(inputs: { itemId: ItemId; qty: number }[]): boolean {
  if (inputs.length === 1) {
    const only = inputs[0]!;
    return !!only.itemId && only.qty > 0;
  }
  if (inputs.length === 2) {
    const coalEntries = inputs.filter((i) => i.itemId === "coal");
    const otherEntries = inputs.filter((i) => i.itemId !== "coal");
    if (coalEntries.length !== 1 || otherEntries.length !== 1) return false;
    return inputs.every((i) => !!i.itemId && i.qty > 0);
  }
  return false;
}

/** Beherrscht der Spieler das Rezept? (Skill-Level ≥ `levelRequired`, balance.md §4.2.) */
export function refineRecipeKnown(state: GameState, action: ActionDef): boolean {
  const required = action.levelRequired ?? 1;
  return levelFromXp(state.skills[action.skill]?.xp ?? 0) >= required;
}

/**
 * Alle für dieses Gebäude WÄHLBAREN Rezepte (zulässig + beherrscht), in Katalog-Reihenfolge —
 * die Datenquelle der Rezeptwahl-UI (Karten-UI-Anforderung, s. Task-Abgabe).
 */
export function availableRefineRecipes(
  state: GameState,
  content: ContentDB,
  buildingId: CampBuildingId,
): ActionDef[] {
  const kind = refineKindOf(content, buildingId);
  if (!kind) return [];
  const out: ActionDef[] = [];
  for (const action of Object.values(content.actions)) {
    if (isRefineRecipe(action, kind) && refineRecipeKnown(state, action)) out.push(action);
  }
  return out;
}

// ── Rezeptwahl (das EINE Schreib-Verb für `camp.refine`) ────────────────────────────────────────

/** Maschinenlesbare Ablehnungsgründe von `setCampRefineRecipe` (Vertrag für die UI-Welle). */
export type CampRefineSetReason =
  | "ok"
  | "not_a_refinery" // Gebäude existiert nicht oder ist keine Veredelungs-Anlage
  | "not_built" // Anlage steht noch nicht (Stufe 0)
  | "unknown_recipe" // ActionId nicht im Katalog
  | "ineligible_recipe" // kein 1-Input-Basisrezept dieser Anlage
  | "recipe_not_known"; // Skill-Level zu niedrig

/**
 * Setzt (oder löscht, mit `recipeId = null`) das aktive Rezept einer Veredelungs-Anlage. Das EINE
 * Schreib-Verb für `camp.refine` — die UI mutiert den Slot NIE direkt.
 *
 * REZEPTWECHSEL nullt `accMs` (angefangener Durchlauf verfällt — verhindert „Fortschritt auf
 * teurem Rezept sammeln, kurz vor Abschluss auf billiges umschalten"), lässt `produced` aber
 * stehen: der Zähler ist die Lebenszeit-Bilanz DIESER Anlage und die Diff-Basis des
 * Offline-Reports. `recipeId = null` löscht den Slot komplett (Anlage ruht, `produced` verfällt).
 */
export function setCampRefineRecipe(
  state: GameState,
  content: ContentDB,
  buildingId: CampBuildingId,
  recipeId: ActionId | null,
): CampRefineSetReason {
  const kind = refineKindOf(content, buildingId);
  if (!kind) return "not_a_refinery";
  const camp = state.camp;
  if (!camp || typeof camp !== "object") return "not_a_refinery";
  if (!camp.refine || typeof camp.refine !== "object") camp.refine = {};

  if (recipeId === null) {
    delete camp.refine[buildingId];
    return "ok";
  }
  if (campBuildingLevel(state, buildingId) < 1) return "not_built";
  const action = content.actions[recipeId];
  if (!action) return "unknown_recipe";
  if (!isRefineRecipe(action, kind)) return "ineligible_recipe";
  if (!refineRecipeKnown(state, action)) return "recipe_not_known";

  const prev = camp.refine[buildingId];
  camp.refine[buildingId] = {
    recipeId,
    // Wechsel auf ein ANDERES Rezept nullt den Fortschritt; dasselbe Rezept erneut zu setzen ist
    // ein No-op (kein stiller Fortschritts-Verlust durch versehentliches Doppel-Klicken).
    accMs: prev && prev.recipeId === recipeId ? prev.accMs : 0,
    produced: prev?.produced ?? 0,
  };
  return "ok";
}

// ── Verarbeitung ────────────────────────────────────────────────────────────────────────────────

/** Gesamtbestand eines Materials über Inventar UND Bank (Craft-Semantik, Muster tick.ts `hasInputs`). */
function totalAvailable(state: GameState, itemId: ItemId): number {
  return itemCount(state.inventory, itemId) + (state.bank[itemId] ?? 0);
}

/**
 * Verbraucht `qty` eines Materials: ZUERST aus dem Inventar, der Rest aus der Bank — exakt die
 * Craft-Kosten-Semantik von tick.ts `consumeInput`/camp.ts `consumeCampInput`. Der Spieler muss
 * sein Erz also nicht erst manuell abheben, damit die Anlage es findet.
 */
function consumeRefineInput(state: GameState, itemId: ItemId, qty: number): void {
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
 * Ist für den Ausstoß Platz? Inventar (freier Slot ODER Stack mit Luft) ODER — bei aktivem
 * Auto-Bank — eine Bank-Zelle. VOR dem Input-Verbrauch geprüft: die Anlage soll bei vollem Ziel
 * SAUBER STOPPEN (Material bleibt liegen), nicht ins Überlauf-Postfach spammen. Genau deshalb
 * fasst dieser Pfad `grantLoot` erst an, nachdem hier grünes Licht kam.
 */
function hasOutputRoom(state: GameState, content: ContentDB, itemId: ItemId): boolean {
  if (canHold(state.inventory, content, itemId)) return true;
  return state.settings.autoBank && canDeposit(state, content, itemId);
}

/**
 * Ein Verarbeitungs-Schritt für EINE Anlage. Gibt zurück, wie viele Durchläufe wirklich fertig
 * wurden (für den Offline-Report / die Tests).
 *
 * Ablauf je Durchlauf: Platz prüfen → Input prüfen → Input verbrauchen → Output gutschreiben.
 * Bricht die Schleife ab (leerer Input oder volles Ziel), bleibt `accMs` verlustfrei auf GENAU
 * EINEM Durchlauf stehen (`msPerRun`): der Spieler verliert keine gesammelte Zeit, kann aber auch
 * keinen unbegrenzten Zeitvorrat horten und nach dem Nachfüllen schlagartig einlösen.
 */
function tickOneRefinery(
  state: GameState,
  content: ContentDB,
  kind: RefineKind,
  dtMs: number,
): number {
  const buildingId = refineBuildingId(content, kind);
  if (!buildingId) return 0;
  const camp = state.camp;
  if (!camp || typeof camp !== "object" || !camp.refine) return 0;
  const slot: CampRefineSlot | undefined = camp.refine[buildingId];
  if (!slot) return 0; // kein Rezept gewählt → Anlage ruht

  const rate = refineRatePerHour(state, content, kind);
  const msPerRun = refineMsPerRun(rate);
  if (!Number.isFinite(msPerRun)) return 0; // Anlage nicht gebaut (Rate 0)

  const action = content.actions[slot.recipeId];
  // Content-Drift (Rezept entfernt) oder nachträglich unzulässig geworden: Slot ruht still — der
  // Load-Sanitize räumt ihn beim nächsten Speichern weg, hier wird nichts kaputt gemacht.
  if (!action || !isRefineRecipe(action, kind) || !refineRecipeKnown(state, action)) return 0;

  const inputs = action.inputs!;
  const out = action.loot[0]!;

  slot.accMs += dtMs;
  let runs = 0;
  while (slot.accMs >= msPerRun) {
    if (!hasOutputRoom(state, content, out.itemId)) break; // volles Ziel → sauberer Stopp
    // ALLE deklarierten Inputs müssen reichen (Task #366: Haupt-Erz UND — falls im Rezept — die
    // Kohle) — reicht auch nur EINER nicht, stoppt der Durchlauf sauber, ohne irgendetwas
    // anzutasten (kein Teil-Verbrauch der anderen Zutat).
    if (inputs.some((input) => totalAvailable(state, input.itemId) < input.qty)) break;
    slot.accMs -= msPerRun;
    for (const input of inputs) consumeRefineInput(state, input.itemId, input.qty);
    // `min === max` ist per Eligibility garantiert ⇒ deterministische Menge, KEIN nextInt.
    // grantLoot ist hier die reine Ablage-Primitive (Inventar → Auto-Bank); der Postfach-Zweig
    // ist durch die `hasOutputRoom`-Vorprüfung praktisch unerreichbar und bleibt nur als
    // Nichts-geht-verloren-Garantie stehen.
    grantLoot(state, content, out.itemId, out.min);
    slot.produced += 1;
    runs++;
  }
  // Verlustfreie Klemme: höchstens EIN Durchlauf bleibt „aufgeladen".
  if (slot.accMs > msPerRun) slot.accMs = msPerRun;
  return runs;
}

/**
 * Tick-Integration der Offline-Veredelung — aufgerufen PRO TICK aus der Tick-Schleife von tick.ts
 * `advance` (direkt nach `step()`, mit `TICK_MS`). Live UND Offline-Catch-up sehen so exakt
 * dieselbe Abfolge (offline==online bit-identisch, Task #335): die frühere 1×-pro-advance-Form
 * mit dem Gesamtfenster lief auseinander, sobald der Rezept-Input erst IM Fenster entstand
 * (Audit-Befund 334x-1 — der Catch-up verrechnete das ganze Fenster gegen den END-Bestand, der
 * Live-Loop verbrauchte die Aufladung beim ERSTEN Erz). Die per-Fenster-Signatur (`dtMs`) bleibt
 * bewusst erhalten — refine.test.ts nutzt sie weiterhin direkt, denn die reine Akkumulator-
 * Arithmetik ist bei KONSTANTEM Input/Platz chunk-invariant.
 *
 * Reine Arithmetik + Bestandsbuchungen: KEIN RNG, KEIN XP, KEIN `Date.now`. Ohne gebaute Anlagen
 * bzw. ohne gewähltes Rezept ein vollständiger No-op ⇒ bestehende Sim-/Determinismus-Fixtures
 * bleiben bit-identisch (Guard camp-envelope.test.ts).
 */
export function tickCampRefine(state: GameState, content: ContentDB, dtMs: number): void {
  if (!Number.isFinite(dtMs) || dtMs <= 0) return;
  const camp = state.camp;
  if (!camp || typeof camp !== "object") return;
  if (!camp.refine || typeof camp.refine !== "object") return;
  // Early-Out für den Normalfall (Task #335, Perf-Pflicht des per-Tick-Umbaus): KEIN Rezept-Slot
  // gesetzt → sofort raus, BEVOR die Katalog-Scans in `refineBuildingId` laufen. `for..in` mit
  // sofortigem break statt `Object.keys(...)` — keine Array-Allokation auf dem heißen Pfad
  // (bis zu ~300k Aufrufe in einem 8-h-Offline-Catch-up).
  let hasSlot = false;
  for (const _key in camp.refine) {
    hasSlot = true;
    break;
  }
  if (!hasSlot) return;
  for (const kind of REFINE_KINDS) tickOneRefinery(state, content, kind, dtMs);
}

/**
 * Lese-Helfer für UI/Report: Fortschritt der Anlage als 0..1 (Anteil des laufenden Durchlaufs).
 * 0, wenn die Anlage ruht (nicht gebaut / kein Rezept). Teilt DIESELBE `msPerRun`-Quelle wie die
 * Verarbeitung — die Anzeige läuft also nie gegen eine andere Uhr als die Engine (Muster
 * `effectiveActionDurationMs`/`plotProgress`).
 */
export function campRefineProgress(
  state: GameState,
  content: ContentDB,
  buildingId: CampBuildingId,
): number {
  const kind = refineKindOf(content, buildingId);
  if (!kind) return 0;
  const slot = state.camp?.refine?.[buildingId];
  if (!slot) return 0;
  const msPerRun = refineMsPerRun(refineRatePerHour(state, content, kind));
  if (!Number.isFinite(msPerRun)) return 0;
  return Math.max(0, Math.min(1, slot.accMs / msPerRun));
}

/**
 * Lese-Helfer für die Karten-UI: die Ausbaustufe einer Veredelungs-Anlage (0 = ungebaut), geklemmt
 * auf `CAMP_MAX_BUILDING_LEVEL`. Dünner Wrapper um `campBuildingLevel`, damit die UI-Welle nicht
 * zwei Module importieren muss.
 */
export function refineryLevel(
  state: GameState,
  content: ContentDB,
  kind: RefineKind,
): number {
  const id = refineBuildingId(content, kind);
  if (!id) return 0;
  return Math.min(CAMP_MAX_BUILDING_LEVEL, campBuildingLevel(state, id));
}
