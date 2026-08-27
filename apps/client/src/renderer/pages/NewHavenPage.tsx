import { memo, useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { content } from "@hearthforge/content";
import {
  availableRefineRecipes,
  bankCount,
  campBoost,
  campBuildSlots,
  advanceCampQueue,
  campBuildStartReason,
  campEnqueueReason,
  campBuildingLevel,
  campDemolishReason,
  campDemolishRefund,
  campOccupiedPositions,
  campPlacementReason,
  campPositionReason,
  campRefineProgress,
  campUsedBuildSlots,
  cancelCampBuild,
  dequeueCampBuild,
  enqueueCampBuild,
  moveCampQueueItem,
  debugCompleteCampBuild,
  demolishCampBuilding,
  itemCount,
  moveCampBuilding,
  placeCampBuilding,
  refineKindOf,
  refineRatePerHour,
  setCampRefineRecipe,
  resetCampMapVisual,
  setCampMapVisual,
  startCampBuild,
} from "@hearthforge/engine";
import type {
  CampBuildStartReason,
  CampQueueReason,
  CampDemolishRefund,
  CampPlacementReason,
} from "@hearthforge/engine";
import {
  CAMP_TAVERN_ID,
  TAVERN_ENABLED,
  CAMP_TOWNHALL_ID,
  CAMP_MAP_VISUAL_SCALE_MAX_PERCENT,
  CAMP_MAP_VISUAL_SCALE_MIN_PERCENT,
  CAMP_MAX_BUILDING_LEVEL,
  TICK_MS,
  campFootprint,
} from "@hearthforge/shared";
import type {
  ActionDef,
  CampBoostKind,
  CampBuildingDef,
  CampBuildingLevelDef,
  CampMapVisual,
  CampPos,
  GameState,
  LocalizedString,
} from "@hearthforge/shared";
import { tupleEquals, useGameSelector, useGetGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { formatNum } from "../util/format";
import { campBoostLine } from "../util/campBoostText";
import { CampBoostNote } from "../components/CampBoostNote";
import { formatEta } from "../util/actionRate";
import { registerEscCloser } from "../util/escStack";
import { openItemWikiModal } from "../components/ItemWikiModal";
import { useItemTooltip } from "../components/ItemTooltip";
import {
  getCampImage,
  getCampCardFit,
  getCampMapDefaultCalibrationPercent,
  getCampMapVisualScale,
} from "../campArt";
import type { CampLightPhase } from "../campArt";
import {
  getCampMapBackground,
  getCampScaffoldArt,
  getCampSiteArt,
} from "../campMapArt";
import { getItemImage } from "../items";
import { getUiIcon } from "../uiIcons";
import { getSidebarIcon } from "../sidebarIcons";
import { HoverTip } from "../components/CitadelTip";
import { pushUiToast } from "../util/toastBus";
import "../styles/newhaven.css";

/**
 * New Haven — der Lager-Screen (0.3.0 „Das Lager", Task #361, UI-Welle zu Engine-Welle 1+2).
 *
 * Chef-Entwurf, bewusst SIMPEL: Karten-Grid, eine Karte je Gebäude, mit Bild, aktueller Wirkung
 * und Ausbaukosten. Der Siedlungsname „New Haven" bleibt in allen sieben Sprachen unübersetzt
 * (Chef-Entscheid).
 *
 * DORFKARTE (Task #371, Engine-Vertrag aus Task #370/SAVE 78 fertig): die Karte ist jetzt die
 * STANDARD-Ansicht, das Karten-Grid bleibt vollständig erhalten als zweite Ansicht („Karte |
 * Liste"-Umschalter, `view`-State weiter unten) — es ist getestet und die Rückfallebene, falls die
 * freie Platzierung mal hakt. Beide Ansichten lesen exakt denselben Spielstand über dieselben
 * Engine-Verben; nur die Anordnung der Gebäude unterscheidet sich. Die Karten-Geometrie
 * (`campFootprint`, Kartenrand, Kollision) lebt komplett in shared/engine — diese Datei
 * zeichnet nur, was `campPositionReason`/`campPlacementReason`/`campMoveReason` ihr sagen.
 *
 * ZWEI EISERNE REGELN DIESER SEITE:
 *  1. KEINE Gebäude-ID-Literale. Die Karten entstehen ausschließlich aus `content.campBuildings`;
 *     die Sonderrolle des Zentralhauses kommt über die shared-Konstante `CAMP_TOWNHALL_ID`
 *     (dieselbe Quelle, aus der `startCampBuild` seine Bauplatz-/Kopplungs-Logik speist), die
 *     Veredelungs-Anlagen über den katalog-getriebenen `refineKindOf`. Benennt der Content ein
 *     Gebäude um, merkt diese Datei davon nichts.
 *  2. KEINE eigene Spielrechnung. Bauen/Abbrechen/Rezeptwahl laufen über die Engine-Verben
 *     (`startCampBuild`/`cancelCampBuild`/`setCampRefineRecipe`), Fortschritt und Raten über die
 *     Engine-Lesehelfer (`campRefineProgress`/`refineRatePerHour`). Die UI rechnet keine Boosts.
 *
 * Seit Task #364 gilt Regel 2 OHNE Ausnahme: die Sperr-Gründe der Bau-Buttons kommen aus dem
 * reinen Engine-Prädikat `campBuildStartReason` — derselben Funktion, die `startCampBuild` intern
 * befragt. Vorher spiegelte diese Datei die Prüf-Reihenfolge in eigenem Code (`previewStartReason`);
 * der Audit #363 hat die Spiegelung mit 30 000 Fuzz-Prüfungen als noch identisch bestätigt, aber
 * zwei Wahrheiten für dieselbe Regel sind eine Frage der Zeit, keine der Korrektheit.
 *
 * KEIN „Gesperrt"-Zustand mehr (Task #365, Chef-Entscheid 27.07.): New Haven ist die Heimatbasis ab
 * SPIELSTART, nicht mehr eine Kapitel-4-Belohnung. Diese Seite zeigt darum IMMER das Bau-Grid; der
 * Grund `locked`, die Sperr-Karte und ihre i18n-Schlüssel sind ersatzlos entfallen. Die
 * Pacing-Gates der Zentralhaus-Stufen II/III (chronicle_09/14) laufen unverändert über
 * `quest_required`.
 */

const GOLD_ICON_URL = getUiIcon("icon_goldcoin");

/** Katalog-Reihenfolge, aber das Zentralhaus immer zuerst — es schaltet alles andere frei. */
const BUILDINGS: CampBuildingDef[] = (() => {
  // Release-Schalter: ohne Taverne (1.1.2) erscheint camp_tavern weder als Karte noch im Baumenü/auf der Karte.
  const all = (content.campBuildings ?? []).filter((b) => TAVERN_ENABLED || b.id !== CAMP_TAVERN_ID);
  const hall = all.filter((b) => b.id === CAMP_TOWNHALL_ID);
  return [...hall, ...all.filter((b) => b.id !== CAMP_TOWNHALL_ID)];
})();

const ROMAN = ["", "I", "II", "III", "IV", "V"] as const;

// codex:2026-07-30T22:30:00+02:00 — rein kosmetischer lokaler Lichtzyklus; kein Engine-/Save-State.
function currentCampLightPhase(): CampLightPhase {
  const hour = new Date().getHours();
  return hour >= 7 && hour < 19 ? "day" : "night";
}

function useCampLightPhase(): CampLightPhase {
  const [phase, setPhase] = useState<CampLightPhase>(currentCampLightPhase);
  useEffect(() => {
    const update = (): void => setPhase(currentCampLightPhase());
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return phase;
}

/** Ausbaustufe als römische Ziffer (I..III) — sprachneutral, in allen sieben Locales gleich. */
function roman(level: number): string {
  return ROMAN[Math.max(0, Math.min(ROMAN.length - 1, Math.floor(level)))] ?? String(level);
}


// ── Wirkungs-Texte ──────────────────────────────────────────────────────────────────────────────
//
// codex:2026-08-03T15:00:00+02:00 (Task #334) — die Formatierung (`formatBoostValue`/`boostLine`)
// lebt jetzt in `util/campBoostText.ts` (`formatCampBoostValue`/`campBoostLine`): Bank/Skill-
// Karten/Slayer/Shop/Segen-Panel/Offline-Bühne brauchen ab UI-Welle 2 dieselbe Zeile, um den
// New-Haven-Anteil AUSSERHALB dieser Seite auszuweisen — EINE Formatierungs-Quelle statt sechs
// Kopien. Diese Seite selbst nutzt `campBoostLine` unverändert weiter (kein Verhaltens-Unterschied).

/**
 * Die Wirkungs-Art eines Gebäudes (alle Stufen im Katalog teilen sie sich) + die Summe der Deltas
 * bis einschließlich `level`. Bewusst über die tatsächlich passenden Stufen summiert statt blind
 * über alle — exakt die Semantik von shared `campBoostSum`, nur auf EIN Gebäude eingeschränkt.
 */
function boostOf(def: CampBuildingDef, level: number): { kind: CampBoostKind | null; sum: number } {
  const kind = def.levels[0]?.boost.kind ?? null;
  if (!kind) return { kind: null, sum: 0 };
  let sum = 0;
  for (let i = 0; i < Math.min(level, def.levels.length); i++) {
    const lvl = def.levels[i]!;
    if (lvl.boost.kind === kind && Number.isFinite(lvl.boost.value)) sum += lvl.boost.value;
  }
  return { kind, sum };
}

// ── Sperr-Gründe ────────────────────────────────────────────────────────────────────────────────
//
// Kein eigener Code mehr (Task #364 Fix 5a): die Vorschau kommt aus dem REINEN Engine-Prädikat
// `campBuildStartReason(state, content, buildingId)` — exakt dieselbe Funktion, die
// `startCampBuild` intern selbst befragt. Die frühere UI-Spiegelung (`previewStartReason` samt
// eigenem `questBeatMet`/`canAfford`) ist damit ersatzlos gestrichen: EINE Wahrheit, kein
// Auseinanderdriften mehr möglich.

/**
 * Gesamtdauer des LAUFENDEN Auftrags in ms — der Nenner des Fortschrittsbalkens. `camp.buildJob`
 * speichert nur `remainingMs`; die Startdauer war `buildMs × (1 − buildSpeed)` (engine/camp.ts
 * `startCampBuild`, Klemme 0..0.9, mindestens ein Tick). Diese Nachrechnung ist EXAKT und nicht
 * bloß eine Schätzung: `buildSpeed` kann sich während eines Auftrags gar nicht ändern, weil
 * Gebäude-Stufen ausschließlich beim ABSCHLUSS eines Auftrags steigen und es nur EINEN Bautrupp
 * gibt. Der Anteil selbst kommt aus dem Engine-Lesehook `campBoost`, nicht aus eigener Boost-Mathe.
 * (Sauberer wäre ein Engine-Export `campBuildJobTotalMs` — an den CEO gemeldet.)
 */
function buildJobTotalMs(state: GameState, baseMs: number): number {
  const speedCut = Math.max(0, Math.min(0.9, campBoost(state, content, "buildSpeed")));
  return Math.max(TICK_MS, Math.round(baseMs * (1 - speedCut)));
}

/**
 * Sperr-Grund als Klartext-Zeile. `{name}`/`{level}` werden je nach Grund gefüllt.
 *
 * Nimmt bewusst `CampPlacementReason` (Obermenge von `CampBuildStartReason` + der Karten-Grund
 * `already_built` + `CampPositionReason` = `out_of_bounds`, s. camp.ts) statt nur
 * `CampBuildStartReason` — dieselbe Zeile bedient damit sowohl das Grid (Bau-/Ausbau-Sperre) als
 * auch den Platzierungs-Modus der Karte (Task #371), ohne eine zweite Text-Funktion zu brauchen.
 * `t()` selbst ist lose auf `string` getippt (kein Literal-Zwang je Schlüssel) — die
 * Vollständigkeit der `newhaven.reason.*`-Keys sichert stattdessen die `en`/`de`-Paritäts-Prüfung
 * in translations.ts (`Record<keyof typeof en, string>`): fehlt einer in `de`, bricht `tsc` dort.
 * (Release-Fix-Welle 0.3.0 Fix 7: `overlap` war bis 31.07. ein dritter Karten-Grund neben
 * `already_built`/`out_of_bounds` — Gebäude besitzen seither keine gegenseitige Hitbox mehr,
 * `CampPositionReason` kennt nur noch `out_of_bounds`. Der Kommentar hier zeigte noch die alte
 * Dreiheit; der verwaiste `newhaven.reason.overlap`-i18n-Key ist entfernt, s. translations.ts.)
 *
 * Release-Fix-Welle 0.3.0 Fix 3: `reason` allein reicht bei `no_slot` nicht mehr aus, um dem
 * Spieler zu sagen, WAS zu tun ist — braucht er das Zentralhaus (noch nie gebaut) oder muss er es
 * nur ausbauen (schon Stufe I+, aber Kapazität voll)? Deshalb bekommt diese Funktion jetzt `state`:
 * bei `no_slot` UND Zentralhaus-Stufe 0 zeigt sie die eigene Zeile `townhall_first` statt der
 * generischen Kapazitäts-Zeile, und füllt `{used}`/`{total}` mit denselben reinen Engine-Lesehelfern
 * (`campUsedBuildSlots`/`campBuildSlots`), die auch die Kopfzeilen-Pille (`newhaven.header.slots`)
 * speist — keine neue Spielrechnung, nur dieselbe Zahl an zwei Stellen gelesen.
 */
function reasonText(
  state: GameState,
  reason: CampPlacementReason,
  targetLevel: number,
  hallName: string,
  busyName: string,
  questName: string,
  t: (key: string) => string,
): string {
  const key =
    reason === "no_slot" && campBuildingLevel(state, CAMP_TOWNHALL_ID) === 0
      ? "newhaven.reason.townhall_first"
      : `newhaven.reason.${reason}`;
  return t(key)
    .replace("{name}", reason === "crew_busy" ? busyName : hallName)
    .replace("{level}", roman(targetLevel))
    .replace("{quest}", questName)
    .replace("{used}", String(campUsedBuildSlots(state, content)))
    .replace("{total}", String(campBuildSlots(state, content)));
}

// ── Karten-Bild ─────────────────────────────────────────────────────────────────────────────────

/**
 * Gebäude-Bild der aktuellen Ausbaustufe. Bis die Chef-PNGs liegen: gezeichneter Platzhalter
 * (Silhouette im Holzrahmen + Stufen-Ziffer, s. newhaven.css) — bewusst KEIN Emoji.
 */
// codex:2026-07-31T19:00:03+02:00 — keine Slot-Grafik mehr: ungebaut zeigt die echte Stufe-I-Vorschau.
function BuildingArt({
  def,
  level,
}: {
  def: CampBuildingDef;
  level: number;
}): JSX.Element {
  // codex:2026-08-02T23:02:00+02:00 — Karten, Listen und Modale sind neutrale Katalogansichten:
  // nur die frei platzierbare Weltkarte wechselt ihre Gebäudesprites mit der Lichtphase.
  const src = getCampImage(def.id, Math.max(1, level), "day");
  if (src) {
    return (
      <div className="nh-art">
        {/* Massstab und Bezugspunkt kommen aus der GEMESSENEN Tabelle in campArt.ts, nicht
            aus einer pauschalen CSS-Zahl: die transparente Sicherheitsflaeche der Sprites
            faellt je Gebaeude voellig unterschiedlich aus (Motiv 21-57 % der Bildbreite),
            eine feste Zahl laesst darum fast alle Gebaeude zu klein erscheinen. */}
        <img
          loading="lazy"
          decoding="async"
          src={src}
          alt=""
          className="nh-art-img"
          style={
            {
              "--nh-art-scale": String(getCampCardFit(def.id, Math.max(1, level)).scale),
              "--nh-art-origin": `${getCampCardFit(def.id, Math.max(1, level)).originY}%`,
            } as CSSProperties
          }
        />
        <span className="nh-art-level" aria-hidden="true">{level > 0 ? roman(level) : ""}</span>
      </div>
    );
  }
  return (
    <div className={`nh-art nh-art--empty${level > 0 ? " is-built" : ""}`}>
      <span className="nh-art-silhouette" aria-hidden="true" />
      {level > 0 && <span className="nh-art-level" aria-hidden="true">{roman(level)}</span>}
    </div>
  );
}

// ── Rezeptwahl der Veredelungs-Anlagen ──────────────────────────────────────────────────────────

/**
 * Rezept-Wähler für Schmelzofen/Räucherhaus. OHNE ihn sind beide Anlagen unbenutzbar — sie ruhen,
 * solange `camp.refine[<id>]` leer ist. Die Liste kommt komplett aus der Engine
 * (`availableRefineRecipes` = zulässig + beherrscht); gesetzt wird ausschließlich über
 * `setCampRefineRecipe`, dessen Ablehnungs-Enum `CampRefineSetReason` die Fehlerzeile speist.
 */
function RefinePanel({
  def,
  level,
  state,
  onDirty,
}: {
  def: CampBuildingDef;
  level: number;
  state: GameState;
  onDirty: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = refineKindOf(content, def.id);
  const slot = kind ? state.camp?.refine?.[def.id] ?? null : null;
  const recipe = slot ? content.actions[slot.recipeId] : undefined;
  const rate = kind ? refineRatePerHour(state, content, kind) : 0;
  const progress = campRefineProgress(state, content, def.id);
  const recipes: ActionDef[] = level >= 1 ? availableRefineRecipes(state, content, def.id) : [];
  // Fix #368-3: Zutaten des LAUFENDEN Rezepts + ob mindestens eine davon fehlt (dieselbe
  // itemCount+bankCount-Rechnung wie die Rezept-Auswahlzeile und die Bau-Kosten-Chips auf dieser
  // Seite — kein neuer Engine-Aufruf, nur dieselbe Bestandsfrage für ein anderes Rezept gestellt).
  const refineInputs = recipe?.inputs ?? [];
  const refineStalled = refineInputs.some(
    (input) => itemCount(state.inventory, input.itemId) + bankCount(state, input.itemId) < input.qty,
  );

  function choose(recipeId: string | null): void {
    const reason = setCampRefineRecipe(state, content, def.id, recipeId);
    if (reason !== "ok") {
      setError(t(`newhaven.refineReason.${reason}`));
      return;
    }
    setError(null);
    setOpen(false);
    onDirty();
  }

  return (
    <div className="nh-refine">
      <div className="nh-refine-head">
        <span className="nh-refine-title">{t("newhaven.refine.title")}</span>
        {rate > 0 && (
          <span className="nh-refine-rate">{t("newhaven.refine.rate").replace("{n}", formatNum(rate))}</span>
        )}
      </div>

      {level < 1 ? (
        <p className="nh-refine-idle muted">{t("newhaven.refine.notBuilt")}</p>
      ) : recipe ? (
        <>
          <div className="nh-refine-active">
            {getItemImage(recipe.loot[0]?.itemId ?? "") ? (
              <img
                loading="lazy"
                decoding="async"
                src={getItemImage(recipe.loot[0]!.itemId)!}
                alt=""
                className="nh-refine-icon pixelart"
              />
            ) : null}
            <span className="nh-refine-name">{tr(recipe.name)}</span>
          </div>
          {/* Fix #368-3: die laufende Anlage zeigte bisher NUR Name/Rate/Balken/"Bisher veredelt" —
              geht der Anlage die Kohle aus, stoppt sie laut Engine (refine.ts `tickOneRefinery`,
              Zeile "reicht auch nur EINER nicht, stoppt der Durchlauf sauber") SAUBER UND STILL,
              der Spieler sah einen ruhenden Ofen ohne jeden Hinweis warum. Dieselben Zutaten-Chips
              wie in der Auswahlzeile oben (Bestand/Bedarf, `lacking` bei Mangel) — dieselbe
              itemCount+bankCount-Rechnung, kein neuer Engine-Zugriff. */}
          {refineInputs.length > 0 && (
            <div className="nh-refine-mats">
              {refineInputs.map((input) => {
                const have = itemCount(state.inventory, input.itemId) + bankCount(state, input.itemId);
                const img = getItemImage(input.itemId);
                return (
                  <span
                    key={input.itemId}
                    className={have >= input.qty ? "mat-chip nh-recipe-mat" : "mat-chip lacking nh-recipe-mat"}
                  >
                    {img ? (
                      <img loading="lazy" decoding="async" src={img} alt="" className="mat-img pixelart" />
                    ) : null}
                    <span className="mat-count">
                      <b>{formatNum(have)}</b>/{input.qty}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          {/* Kein eigener Engine-Zustand für "ruht mangels Zutat" (refine.ts kennt nur den stillen
              Zähler-Stopp, keinen Reason/Enum) — diese Zeile ist eine reine UI-Ableitung aus
              denselben Bestandsdaten wie die Chips oben, kein erfundener Engine-Zustand. An den
              CEO gemeldet: ein echter `CampRefineStallReason`-Export wäre robuster als diese
              Ableitung, falls die Zutatenliste mal Sonderfälle bekommt. */}
          {refineStalled && (
            <p className="nh-refine-stalled">{t("newhaven.refine.waitingForInput")}</p>
          )}
          <div className="bar nh-refine-bar">
            <div className="bar-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <p className="nh-refine-produced muted">
            {t("newhaven.refine.produced").replace("{n}", formatNum(slot?.produced ?? 0))}
          </p>
        </>
      ) : (
        <p className="nh-refine-idle muted">{t("newhaven.refine.none")}</p>
      )}

      {level >= 1 && (
        <div className="nh-refine-actions">
          <button type="button" className="shop-citadel-btn nh-refine-btn" onClick={() => setOpen((o) => !o)}>
            {recipe ? t("newhaven.refine.change") : t("newhaven.refine.choose")}
          </button>
          {recipe && (
            <button type="button" className="shop-citadel-btn nh-refine-btn" onClick={() => choose(null)}>
              {t("newhaven.refine.stop")}
            </button>
          )}
        </div>
      )}

      {open && (
        <div className="nh-recipe-list">
          {recipes.length === 0 ? (
            <p className="muted nh-recipe-empty">{t("newhaven.refine.empty")}</p>
          ) : (
            recipes.map((action) => {
              const out = action.loot[0]!;
              // Seit der Schmelzofen-Korrektur (Task #366) sind 12 von 14 Barren-Rezepten
              // ZWEIzutatig (Erz + Kohle). Vorher zeigte die Zeile hart inputs[0] — die Kohle
              // fehlte in der Anzeige, obwohl sie mitverbraucht wird. Jetzt alle Zutaten.
              const inputs = action.inputs ?? [];
              const outImg = getItemImage(out.itemId);
              const active = slot?.recipeId === action.id;
              return (
                <button
                  key={action.id}
                  type="button"
                  className={`nh-recipe-row${active ? " is-active" : ""}`}
                  onClick={() => choose(action.id)}
                >
                  <span className="nh-recipe-icon">
                    {outImg && <img loading="lazy" decoding="async" src={outImg} alt="" className="pixelart" />}
                  </span>
                  <span className="nh-recipe-name">{tr(action.name)}</span>
                  {/* Fix #368-1: eigene Zutaten-Zeile statt Chips inline neben dem Namen — bei
                      EINER Zutat war das Zeile schon knapp, seit Task #366 haben 11 von 13
                      Schmelz-Rezepten ZWEI (Erz + Kohle), die zweite Zutat wurde dadurch bei
                      1920×1080 abgeschnitten und bei 2560×1440/6-Spalten-Ansicht komplett
                      verdeckt (`.nh-recipe-row` war `display:flex` ohne `flex-wrap`, s.
                      Bot-Sweep #367). `flex: 1 1 100%` erzwingt IMMER einen Umbruch (statt sich
                      auf organisches Wrapping zu verlassen, das einzelne Chips bei sehr schmalen
                      Karten uneinheitlich verteilen könnte) — verhält sich bei 1 UND 2 Zutaten
                      gleich vorhersehbar. */}
                  <span className="nh-recipe-mats">
                    {inputs.map((input) => {
                      const have = itemCount(state.inventory, input.itemId) + bankCount(state, input.itemId);
                      return (
                        <span
                          key={input.itemId}
                          className={have >= input.qty ? "mat-chip nh-recipe-mat" : "mat-chip lacking nh-recipe-mat"}
                        >
                          {getItemImage(input.itemId) ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={getItemImage(input.itemId)!}
                              alt=""
                              className="mat-img pixelart"
                            />
                          ) : null}
                          <span className="mat-count">
                            <b>{formatNum(have)}</b>/{input.qty}
                          </span>
                        </span>
                      );
                    })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}

      {error && <p className="nh-refine-error">{error}</p>}
    </div>
  );
}

// ── Gebäude-Karte ───────────────────────────────────────────────────────────────────────────────

interface CardProps {
  def: CampBuildingDef;
  level: number;
  /** Verbleibende Bauzeit in ms, wenn GENAU DIESES Gebäude gerade gebaut wird — sonst -1. */
  jobRemainingMs: number;
  /** Zielstufe des laufenden Auftrags auf DIESER Karte (sonst 0). */
  jobTargetLevel: number;
  /** Basis-Bauzeit des laufenden Auftrags (für den Fortschrittsbalken; sonst 0). */
  jobTotalMs: number;
  reason: CampBuildStartReason;
  /**
   * Darf dieses Gebaeude in die Bauwarteschlange (Spieler-Report 1.0.2)? Eigenes Praedikat, weil
   * es ANDERE Fragen stellt als `reason`: Material und Bautrupp sind beim Planen egal, die
   * erreichbare Stufe und der Laengen-Deckel nicht.
   */
  queueReason: CampQueueReason;
  /** Bestand je Material der NÄCHSTEN Stufe, in der Reihenfolge von `levelDef.items`. */
  have: readonly number[];
  /**
   * Signatur des Veredelungs-Slots (Rezept, Durchläufe, Fortschritt in Prozentpunkten) — leer bei
   * Nicht-Anlagen. OHNE dieses Prop würde der `memo`-Vergleich unten die Karte einfrieren, sobald
   * sich NUR der Veredelungs-Fortschritt bewegt (alle anderen Props blieben ja gleich).
   */
  refineSig: string;
  gold: number;
  hallName: string;
  busyName: string;
  state: GameState;
  /** Flüchtiger UI-Debugmodus: nur Ressourcen-Kosten entfallen, niemals persistiert. */
  debugFreeBuild: boolean;
  onDirty: () => void;
  onRequestCancel: () => void;
  /**
   * Chef-Bug 27.08.2026 (Bau-Container-Modal): ersetzt bei GENAU DIESER Karte, was der „Bauen"-
   * Knopf tut. Ohne gesetzten Wert (Listenkarte, Popup eines bereits platzierten Gebäudes)
   * bleibt es beim direkten `startCampBuild` von heute — unverändert. Das neue Info-Modal des
   * Bau-Menüs (noch nicht platziertes Gebäude) reicht hier stattdessen den Wechsel in den
   * bestehenden Platzierungs-Modus durch: der heutige Erstklick-Ablauf bleibt so als Zweitschritt
   * (nach dem Modal) vollständig erhalten, nur der Anlauf verschiebt sich um einen Klick.
   */
  onBuildOverride?: () => void;
  /** Taverne (1.2.0 „Alive", taverne-spec-technik.md §6): NUR für die camp_tavern-Karte —
   *  „Betreten"-Knopf ab Stufe 1 (s. nh-card-function-slot unten). `setActivePageId` aus
   *  App.tsx, referenziell stabil (useState-Setter) — kostet den memo-Vergleich unten nichts. */
  onNavigate: (id: string) => void;
}

/** Das nicht-statische Kernstück von `CardProps` — alles außer `def`/`gold`/`hallName`/`busyName`/
 *  `state`/`onDirty`/`onRequestCancel`, die der jeweilige Aufrufer ohnehin schon hat. */
type CampCardCore = Pick<CardProps, "level" | "jobRemainingMs" | "jobTargetLevel" | "jobTotalMs" | "reason" | "queueReason" | "have" | "refineSig">;

/**
 * Berechnet `CampCardCore` für EIN Gebäude — extrahiert aus der Grid-Schleife (Task #371), damit
 * die Dorfkarte (Gebäude-Popup, `BuildingPopup` weiter unten) exakt dieselbe Rechnung nutzt wie das
 * Karten-Grid, statt sie zu duplizieren (Chef-Vorgabe „aus dem Grid übernehmen, nicht
 * duplizieren"). Reine Ableitung aus State/Content, mutiert nichts.
 */
function campCardCore(
  state: GameState,
  def: CampBuildingDef,
  job: { buildingId: string; targetLevel: number; remainingMs: number } | null,
  debugFreeBuild: boolean,
): CampCardCore {
  const level = campBuildingLevel(state, def.id);
  const onThis = job?.buildingId === def.id;
  const targetLevel = onThis ? job!.targetLevel : level + 1;
  const levelDef = def.levels[targetLevel - 1] ?? null;
  const have = levelDef
    ? levelDef.items.map((c) => itemCount(state.inventory, c.itemId) + bankCount(state, c.itemId))
    : [];
  const slot = refineKindOf(content, def.id) ? state.camp?.refine?.[def.id] ?? null : null;
  const refineSig = refineKindOf(content, def.id)
    ? `${slot?.recipeId ?? "-"}:${slot?.produced ?? 0}:${Math.round(campRefineProgress(state, content, def.id) * 100)}`
    : "";
  return {
    level,
    jobRemainingMs: onThis ? job!.remainingMs : -1,
    jobTargetLevel: onThis ? job!.targetLevel : 0,
    jobTotalMs: onThis && levelDef ? buildJobTotalMs(state, levelDef.buildMs) : 0,
    // codex:2026-07-31T19:00:03+02:00 — List/Popup fragen dasselbe Engine-Prädikat wie die Karte.
    reason: campBuildStartReason(state, content, def.id, { waiveCosts: debugFreeBuild }),
    queueReason: campEnqueueReason(state, content, def.id),
    have,
    refineSig,
  };
}

function BuildingCardImpl({
  def,
  level,
  jobRemainingMs,
  jobTargetLevel,
  jobTotalMs,
  reason,
  queueReason,
  have,
  gold,
  hallName,
  busyName,
  state,
  debugFreeBuild,
  onDirty,
  onRequestCancel,
  onBuildOverride,
  onNavigate,
}: CardProps): JSX.Element {
  // Steam-Forum 27.08.2026 (L1GR): Kosten-Chips zeigen die STANDARD-Item-Karte (mit Wiki-Knopf).
  const tooltip = useItemTooltip();
  const { t, tr } = useI18n();
  const building = jobRemainingMs >= 0;
  const targetLevel = building ? jobTargetLevel : level + 1;
  const maxed = targetLevel > Math.min(CAMP_MAX_BUILDING_LEVEL, def.levels.length);
  const levelDef = maxed ? null : def.levels[targetLevel - 1] ?? null;

  const current = boostOf(def, level);
  const next = boostOf(def, targetLevel);
  const isRefinery = refineKindOf(content, def.id) !== null;
  const isTavern = def.id === CAMP_TAVERN_ID;

  const questDef = levelDef?.requiresQuest
    ? content.quests.find((q) => q.id === levelDef.requiresQuest)
    : undefined;
  const questName = questDef ? tr(questDef.name) : levelDef?.requiresQuest ?? "";

  const buildPct = building && jobTotalMs > 0
    ? Math.max(0, Math.min(1, 1 - jobRemainingMs / jobTotalMs))
    : 0;
  // Task #334 (UI-Welle 2 „Boosts sichtbar"): der laufende Bautrupp-Auftrag profitiert selbst vom
  // Schreibzelt-Ausbau (`buildSpeed`) — bisher stand nur die verkürzte ETA da, ohne dass sichtbar
  // war, WARUM sie kürzer ist als `def.levels[...].buildMs`. Derselbe Engine-Lesehook wie
  // `buildJobTotalMs` oben (keine zweite Boost-Mathe), nur hier zusätzlich als Anzeige-Zeile.
  const buildSpeedCut = building
    ? Math.max(0, Math.min(0.9, campBoost(state, content, "buildSpeed")))
    : 0;

  return (
    <div className={`nh-card${building ? " is-building" : ""}${level > 0 ? " is-built" : ""}${isRefinery ? " is-refinery" : ""}`}>
      {/* codex:2026-08-02T23:02:00+02:00 — Kartenansichten bleiben unabhängig von der Nachtphase klar lesbar. */}
      <BuildingArt def={def} level={level} />

      <div className="nh-card-head">
        <span className="nh-card-name">{tr(def.name)}</span>
        <span className={`nh-card-level${level > 0 ? "" : " is-none"}`}>
          {level > 0 ? t("newhaven.level.label").replace("{n}", roman(level)) : t("newhaven.level.none")}
        </span>
      </div>

      {def.description && <p className="nh-card-flavor muted">{tr(def.description)}</p>}

      <div className="nh-effects">
        <div className="nh-effect">
          <span className="nh-effect-label muted">{t("newhaven.effect.current")}</span>
          <span className="nh-effect-value">
            {current.kind && level > 0
              ? campBoostLine(current.kind, current.sum, t)
              : t("newhaven.effect.none")}
          </span>
        </div>
        <div className="nh-effect">
          <span className="nh-effect-label muted">{t("newhaven.effect.next")}</span>
          <span className="nh-effect-value nh-effect-value--next">
            {maxed || !next.kind ? t("newhaven.effect.max") : campBoostLine(next.kind, next.sum, t)}
          </span>
        </div>
      </div>

      {/* codex:2026-07-31T23:42:00+02:00 — Fester Aktions-Dock: Kosten, laufender Bau und Max-Stufe
          belegen dieselbe Zone. Dadurch ändert kein zustandsabhängiger Button mehr die Kartenhöhe. */}
      <div className="nh-card-action-slot">
        {building ? (
          <div className="nh-progress">
          <div className="nh-progress-label">
            <span>{t("newhaven.build.inProgress").replace("{n}", roman(targetLevel))}</span>
            <span className="muted">{formatEta(jobRemainingMs, t)}</span>
          </div>
          {buildSpeedCut > 0 && (
            <div className="nh-progress-speednote muted">
              <CampBoostNote kind="buildSpeed" value={buildSpeedCut} t={t} />
            </div>
          )}
          {/* Bewusst der schlichte `.bar`/`.bar-fill`-Balken (Muster SlayerPage/QuestsPage) statt
              des texturierten `.plot-bar`: dessen Füll-Textur `xp_bar_fill.webp` fehlt im Repo,
              die Regel fällt daher auf `var(--accent)` zurück und die Grün-Drehung macht daraus
              Magenta (betrifft auch das Farm-Beet — an den CEO gemeldet, liegt nicht in dieser
              Datei). `scaleX` statt `clipPath`, weil hier keine Kachel-Textur zu stauchen ist. */}
          <div className="bar tall nh-progress-bar">
            <div className="bar-fill" style={{ transform: `scaleX(${buildPct})` }} />
          </div>
          <button type="button" className="btn-iron btn-iron--danger nh-cancel-btn" onClick={onRequestCancel}>
            {t("newhaven.build.cancel")}
          </button>
          </div>
        ) : levelDef ? (
          <>
          <div className="nh-costs">
            <div className="nh-cost-head">
              <span className="nh-cost-title muted">{t("newhaven.cost.title")}</span>
              <span className={`nh-cost-gold${debugFreeBuild || gold >= levelDef.gold ? "" : " lacking"}`}>
                {GOLD_ICON_URL ? (
                  <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="nh-cost-gold-icon" />
                ) : null}
                <b>{formatNum(levelDef.gold)}</b>
              </span>
            </div>
            <div className="mats-list nh-mats">
              {levelDef.items.map((cost, i) => {
                const owned = have[i] ?? 0;
                const item = content.items[cost.itemId];
                const img = getItemImage(cost.itemId);
                return (
                  <div
                    key={cost.itemId}
                    className={debugFreeBuild || owned >= cost.qty ? "mat-chip" : "mat-chip lacking"}
                    role="button"
                    tabIndex={0}
                    // Steam-Forum 27.08.2026 (L1GR, 1.1.1): „there is a popup, but not that one with the ? mark“ —
                    // die Bau-Materialien zeigten den Flavor-Tooltip (CitadelTip) statt der Item-Karte. Jetzt beim
                    // Hover die STANDARD-Item-Karte wie überall (mit Wiki-Knopf); Klick öffnet weiterhin direkt
                    // das Item-Wiki (Chef-Bug 27.08.2026).
                    onMouseEnter={(e) => tooltip.show(cost.itemId, e.clientX, e.clientY, [])}
                    onMouseLeave={() => tooltip.hide()}
                    onClick={() => {
                      tooltip.hide();
                      openItemWikiModal(cost.itemId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      openItemWikiModal(cost.itemId);
                    }}
                  >
                    {img ? (
                      <img loading="lazy" decoding="async" src={img} alt="" className="mat-img pixelart" />
                    ) : (
                      <span className="mat-emoji">{item?.icon ?? "▪"}</span>
                    )}
                    <span className="mat-count">
                      <b>{formatNum(owned)}</b>/{cost.qty}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="nh-cost-time muted">
              {t("newhaven.cost.time").replace("{time}", formatEta(levelDef.buildMs, t))}
            </p>
            {debugFreeBuild && <p className="nh-debug-free-note">{t("newhaven.debug.freeActive")}</p>}
          </div>

          <button
            type="button"
            className="btn-iron nh-build-btn"
            disabled={reason !== "ok"}
            onClick={() => {
              // Chef-Bug 27.08.2026 (Bau-Container-Modal): Info-Modal für noch nicht platzierte
              // Gebäude reicht hier den Wechsel in den Platzierungs-Modus durch, statt direkt zu
              // bauen — s. `onBuildOverride`-JSDoc oben.
              if (onBuildOverride) {
                onBuildOverride();
                return;
              }
              // codex:2026-07-31T19:00:03+02:00 — Debug-Free beeinflusst nur diese Buchung.
              if (startCampBuild(state, content, def.id, { waiveCosts: debugFreeBuild }) === "ok") onDirty();
            }}
          >
            {level === 0
              ? t("newhaven.build.new")
              : t("newhaven.build.upgrade").replace("{n}", roman(targetLevel))}
          </button>

          {/* Spieler-Report 1.0.2: "New Haven, ability to queue up what would start next after the
              current project ends." Der Knopf steht genau dann da, wenn Einreihen etwas bringt —
              vor allem waehrend der Bautrupp arbeitet und der Bau-Knopf deshalb gesperrt ist.
              Einreihen kostet nichts; bezahlt wird beim Anlauf (engine/camp.ts). */}
          {queueReason === "ok" && reason !== "ok" && (
            <button
              type="button"
              className="shop-citadel-btn nh-queue-btn"
              onClick={() => {
                if (enqueueCampBuild(state, content, def.id) === "ok") onDirty();
              }}
            >
              {t("newhaven.queue.add")}
            </button>
          )}

          {reason !== "ok" && (
            <p className="nh-blocked">
              {reasonText(state, reason, targetLevel, hallName, busyName, questName, t)}
            </p>
          )}
          </>
        ) : (
          <p className="nh-maxed">{t("newhaven.reason.max_level")}</p>
        )}
      </div>

      {/* codex:2026-07-31T23:42:00+02:00 — Die Funktionszone ist in jeder Listenkarte reserviert.
          Refineries dürfen darin intern scrollen; normale Gebäude behalten dieselbe Außenhöhe. */}
      <div className={`nh-card-function-slot${isRefinery || isTavern ? "" : " is-empty"}`}>
        {isRefinery && <RefinePanel def={def} level={level} state={state} onDirty={onDirty} />}
        {/* Taverne (1.2.0 „Alive", taverne-spec-technik.md §6): ab Stufe 1 „Betreten" statt der
            Veredelungs-Anlage — die Taverne ist keine Refinery, braucht aber denselben Sprung-Knopf-
            Slot. `def.id === CAMP_TAVERN_ID` ist die einzige Stelle dieser Datei, die die Taverne
            überhaupt kennt (Regel 1 der Datei: keine Gebäude-ID-Literale sonst). */}
        {isTavern && level >= 1 && (
          <button type="button" className="btn-iron nh-tavern-enter-btn" onClick={() => onNavigate("tavern")}>
            {t("tavern.newhaven.enter")}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Perf: Der Screen darf im Leerlauf nicht durchrendern. Die Seite selbst hängt an einem schmalen
 * Signatur-Gate (s. `newHavenGate`), diese Karten zusätzlich an ihren eigenen Props — läuft
 * irgendwo ein Bau, rendert pro Sekunde nur noch DIE Karte neu, deren `jobRemainingMs` tickt
 * (Muster CombatPage `MonsterSelect`). `have` ist das einzige nicht-primitive Prop und wird
 * elementweise verglichen (`tupleEquals`), `def`/`state` sind stabile Referenzen.
 */
const BuildingCard = memo(BuildingCardImpl, (a, b) =>
  a.def === b.def &&
  // codex:2026-08-02T23:08:00+02:00 — Katalogkarten sind dauerhaft Tag und rendern deshalb bei
  // einem rein kosmetischen Karten-Phasenwechsel nicht länger unnötig neu.
  a.level === b.level &&
  a.jobRemainingMs === b.jobRemainingMs &&
  a.jobTargetLevel === b.jobTargetLevel &&
  a.jobTotalMs === b.jobTotalMs &&
  a.reason === b.reason &&
  a.queueReason === b.queueReason &&
  a.refineSig === b.refineSig &&
  a.gold === b.gold &&
  a.hallName === b.hallName &&
  a.busyName === b.busyName &&
  a.state === b.state &&
  a.debugFreeBuild === b.debugFreeBuild &&
  a.onDirty === b.onDirty &&
  a.onRequestCancel === b.onRequestCancel &&
  a.onBuildOverride === b.onBuildOverride &&
  a.onNavigate === b.onNavigate &&
  tupleEquals(a.have, b.have),
);

// ── Abbruch-Bestätigung ─────────────────────────────────────────────────────────────────────────

function CancelConfirm({
  name,
  level,
  onConfirm,
  onClose,
}: {
  name: string;
  level: number;
  onConfirm: () => void;
  onClose: () => void;
}): JSX.Element {
  const { t } = useI18n();
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal nh-confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="nh-confirm-title">{t("newhaven.cancel.title")}</h2>
        <p className="nh-confirm-body">
          {t("newhaven.cancel.body").replace("{name}", name).replace("{level}", roman(level))}
        </p>
        <div className="nh-confirm-actions">
          <button type="button" className="shop-citadel-btn" onClick={onClose}>
            {t("newhaven.cancel.no")}
          </button>
          <button type="button" className="btn-iron btn-iron--danger" onClick={onConfirm}>
            {t("newhaven.cancel.yes")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Abriss-Bestätigung ──────────────────────────────────────────────────────────────────────────

/**
 * Abriss-Rückfrage mit Erstattungs-Vorschau (spec §4/newhaven-karte-spec.md): `refund` kommt
 * FERTIG gerundet aus `campDemolishRefund` (Regel 2 — diese Datei rechnet nichts nach, sie zeigt
 * nur die Chips, exakt wie `.nh-costs`/`.mats-list` es für Baukosten schon tun).
 */
function DemolishConfirm({
  def,
  level,
  refund,
  onConfirm,
  onClose,
}: {
  def: CampBuildingDef;
  level: number;
  refund: CampDemolishRefund;
  onConfirm: () => void;
  onClose: () => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);
  const hasRefund = refund.gold > 0 || refund.items.length > 0;
  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal nh-confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="nh-confirm-title">{t("newhaven.demolish.title").replace("{name}", tr(def.name))}</h2>
        <p className="nh-confirm-body">
          {t("newhaven.demolish.body").replace("{name}", tr(def.name)).replace("{level}", roman(level))}
        </p>
        <div className="nh-demolish-refund">
          <span className="nh-demolish-refund-title muted">{t("newhaven.demolish.refundTitle")}</span>
          {hasRefund ? (
            <div className="mats-list nh-demolish-refund-list">
              {refund.gold > 0 && (
                <span className="mat-chip">
                  {GOLD_ICON_URL ? (
                    <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="mat-img" />
                  ) : null}
                  <span className="mat-count"><b>{formatNum(refund.gold)}</b></span>
                </span>
              )}
              {refund.items.map((it) => {
                const item = content.items[it.itemId];
                const img = getItemImage(it.itemId);
                return (
                  <HoverTip
                    key={it.itemId}
                    className="mat-chip"
                    focusable={false}
                    content={item ? tr(item.name) : it.itemId}
                  >
                    {img ? (
                      <img loading="lazy" decoding="async" src={img} alt="" className="mat-img pixelart" />
                    ) : (
                      <span className="mat-emoji">{item?.icon ?? "▪"}</span>
                    )}
                    <span className="mat-count"><b>{formatNum(it.qty)}</b></span>
                  </HoverTip>
                );
              })}
            </div>
          ) : (
            <p className="muted nh-demolish-refund-none">{t("newhaven.demolish.refundNone")}</p>
          )}
        </div>
        <div className="nh-confirm-actions">
          <button type="button" className="shop-citadel-btn" onClick={onClose}>
            {t("newhaven.demolish.no")}
          </button>
          <button type="button" className="btn-iron btn-iron--danger" onClick={onConfirm}>
            {t("newhaven.demolish.yes")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Gebäude-Popup (Dorfkarte) ───────────────────────────────────────────────────────────────────

/**
 * Klick auf ein platziertes Gebäude öffnet dieses Popup — Task #371, Chef-Vorgabe „aus dem Grid
 * übernehmen, nicht duplizieren": der Inhalt ist exakt dieselbe `BuildingCard`, die auch das
 * Karten-Grid zeichnet (Name/Stufe, Effekt jetzt/nächste Stufe, Kosten ODER Baufortschritt,
 * Veredelungs-Rezeptwahl bei Anlagen, Ausbau-/Abbrechen-Knopf — alles bereits dort gebaut). Neu ist
 * nur der Rahmen (Modal) und der Abreißen-Knopf, der auf einen zweiten Unter-Zustand
 * (`confirmingDemolish`) umschaltet statt ein zweites Overlay darüberzulegen.
 */
function BuildingPopup({
  buildingId,
  state,
  hallName,
  busyName,
  debugFreeBuild,
  onStartMove,
  onClose,
  onDirty,
  onRequestCancel,
  onBuildNew,
  onNavigate,
}: {
  buildingId: string;
  state: GameState;
  hallName: string;
  busyName: string;
  debugFreeBuild: boolean;
  onStartMove: () => void;
  onClose: () => void;
  onDirty: () => void;
  onRequestCancel: () => void;
  onNavigate: (id: string) => void;
  /**
   * Chef-Bug 27.08.2026: gesetzt, wenn dieses Popup als Gebäude-Infokarte aus dem Bau-Menü der
   * Dorfkarte kommt (Gebäude noch NICHT platziert) statt aus einem Klick auf eine bereits
   * stehende Kachel. Reicht den Wechsel in den bestehenden Platzierungs-Modus durch (die Karte
   * merkt sich selbst, WO gebaut wird) — unverändert `undefined` bei einer bereits platzierten
   * Karte, deren „Bauen"/„Ausbau"-Knopf direkt baut wie bisher.
   */
  onBuildNew?: () => void;
}): JSX.Element | null {
  const { t, tr } = useI18n();
  const [confirmingDemolish, setConfirmingDemolish] = useState(false);
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  const def = BUILDINGS.find((b) => b.id === buildingId);
  if (!def) return null; // defensiv — der Aufrufer reicht nur IDs durch, die gerade auf der Karte stehen

  const job = state.camp?.buildJob ?? null;
  const core = campCardCore(state, def, job, debugFreeBuild);
  const demolishReason = campDemolishReason(state, content, buildingId);

  if (confirmingDemolish) {
    return (
      <DemolishConfirm
        def={def}
        level={core.level}
        refund={campDemolishRefund(state, content, buildingId)}
        onClose={() => setConfirmingDemolish(false)}
        onConfirm={() => {
          demolishCampBuilding(state, content, buildingId);
          setConfirmingDemolish(false);
          onClose();
          onDirty();
          // Kein Breadcrumb für „abgerissen" in der Engine (bewusst — s. `demolishCampBuilding`-
          // Doku: `lastCompletedBuild` bleibt unangetastet, das ist kein Bau-fertig-Ereignis).
          // Toast direkt aus dem Klick-Handler, Muster des Abbruch-Toasts unten in `NewHavenPageImpl`.
          pushUiToast({
            icon: "✖",
            iconUrl: getSidebarIcon("newhaven"),
            title: t("newhaven.toast.demolished.title"),
            detail: t("newhaven.toast.demolished.detail").replace("{name}", tr(def.name)),
          });
        }}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal nh-popup" onClick={(e) => e.stopPropagation()}>
        {/* codex:2026-08-01T09:30:10+02:00 — Eigenständiger New-Haven-Schließenknopf: Die visuelle
            Fassung kommt aus newhaven.css statt aus dem projektfremden roten Citadel-X-Asset. */}
        <button className="modal-close nh-popup-close" onClick={onClose} aria-label={t("common.close")} />
        {/* codex:2026-08-02T23:08:00+02:00 — Popup bleibt als lesbare Katalogansicht dauerhaft Tag. */}
        <BuildingCard
          def={def}
          {...core}
          gold={state.character.gold}
          hallName={hallName}
          busyName={busyName}
          state={state}
          debugFreeBuild={debugFreeBuild}
          onDirty={onDirty}
          onRequestCancel={onRequestCancel}
          onBuildOverride={onBuildNew}
          onNavigate={onNavigate}
        />
        {/* codex:2026-07-31T23:42:00+02:00 — Verschieben ist eine kostenlose Kartenaktion und
            deshalb als gleichwertiger, sichtbarer Befehl vorhanden statt als versteckte Geste. */}
        <div className="nh-popup-actions">
          {core.level > 0 && core.jobRemainingMs < 0 && (
            <button type="button" className="btn-iron nh-move-btn" onClick={onStartMove}>
              {t("newhaven.move.button")}
            </button>
          )}
          {demolishReason === "ok" && (
            <button type="button" className="btn-iron btn-iron--danger nh-demolish-btn" onClick={() => setConfirmingDemolish(true)}>
              {t("newhaven.demolish.button")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bau-Menü (Dorfkarte) ────────────────────────────────────────────────────────────────────────

/** Noch nicht gebaute Gebäude, auswählbar für den Platzierungs-Modus. Reine Anzeige — Kosten der
 *  Stufe I, damit der Spieler vor der Auswahl weiß, ob er sich das leisten kann. */
function BuildMenu({
  buildings,
  activeId,
  state,
  hallName,
  busyName,
  debugFreeBuild,
  onSelect,
}: {
  buildings: readonly CampBuildingDef[];
  activeId: string | null;
  state: GameState;
  hallName: string;
  busyName: string;
  debugFreeBuild: boolean;
  onSelect: (id: string) => void;
}): JSX.Element {
  // Steam-Forum 27.08.2026 (L1GR): Kosten-Chips zeigen die STANDARD-Item-Karte (mit Wiki-Knopf).
  const tooltip = useItemTooltip();
  const { t, tr } = useI18n();
  return (
    <div className="nh-buildmenu">
      <h3 className="nh-buildmenu-title">{t("newhaven.map.buildMenu.title")}</h3>
      {buildings.length === 0 ? (
        <p className="muted nh-buildmenu-empty">{t("newhaven.map.buildMenu.empty")}</p>
      ) : (
        <div className="nh-buildmenu-list" role="list" aria-label={t("newhaven.map.buildMenu.ariaLabel")}>
          {buildings.map((def) => {
            const levelDef = def.levels[0];
            if (!levelDef) return null;
            // codex:2026-07-31T19:00:03+02:00 — dieselben Gates und Vollkosten wie die Listenkarte.
            const reason = campBuildStartReason(state, content, def.id, { waiveCosts: debugFreeBuild });
            const goldAffordable = debugFreeBuild || state.character.gold >= levelDef.gold;
            // codex:2026-08-02T23:02:00+02:00 — das Baumenü zeigt die klare Tag-Stufe-I-Art;
            // die Nachtfassung ist ausschließlich der eigentlichen Kartenwelt vorbehalten.
            const art = getCampImage(def.id, 1, "day");
            return (
              <button
                key={def.id}
                type="button"
                role="listitem"
                // Chef-Bug 27.08.2026: auch ein (noch) nicht baubares Gebäude muss anklickbar
                // bleiben — der Klick öffnet jetzt IMMER erst die Infokarte (kein `disabled` mehr,
                // `is-locked` übernimmt stattdessen die abgedunkelte Optik, s. newhaven.css).
                className={`nh-buildmenu-item${activeId === def.id ? " is-active" : ""}${reason !== "ok" ? " is-locked" : ""}`}
                onClick={() => onSelect(def.id)}
              >
                <span className="nh-buildmenu-art" aria-hidden="true">
                  {art ? (
                    /* Ohne Massstab war hier von einem 1536er Sprite, dessen Motiv nur 21-57 %
                       der Flaeche belegt, in einem 34-px-Feld ein 7-19 px grosser Fleck uebrig —
                       praktisch unsichtbar. Dieselbe gemessene Tabelle wie bei den Karten. */
                    <img
                      loading="lazy"
                      decoding="async"
                      src={art}
                      alt=""
                      style={
                        {
                          "--nh-art-scale": String(getCampCardFit(def.id, 1).scale),
                          "--nh-art-origin": `${getCampCardFit(def.id, 1).originY}%`,
                        } as CSSProperties
                      }
                    />
                  ) : (
                    <span className="nh-buildmenu-silhouette" />
                  )}
                </span>
                <span className="nh-buildmenu-info">
                  <span className="nh-buildmenu-name">{tr(def.name)}</span>
                  <span className="nh-buildmenu-costs">
                    <span className={`nh-buildmenu-cost${goldAffordable ? "" : " lacking"}`}>
                      {GOLD_ICON_URL ? (
                        <img loading="lazy" decoding="async" src={GOLD_ICON_URL} alt="" className="nh-cost-gold-icon" />
                      ) : null}
                      {formatNum(levelDef.gold)}
                    </span>
                    {levelDef.items.map((cost) => {
                      const owned = itemCount(state.inventory, cost.itemId) + bankCount(state, cost.itemId);
                      const img = getItemImage(cost.itemId);
                      return (
                        // Release-Fix-Welle 0.3.0 Fix 1: das Baumenü ist die Default-Ansicht, zeigte
                        // seine Kosten-Chips bisher aber ohne Tooltip — nur die Listenkarte (oben)
                        // hatte den Erstkontakt-Hinweis. `matChipTip` bedient jetzt beide Stellen.
                        <span
                          key={cost.itemId}
                          className={`nh-buildmenu-cost${debugFreeBuild || owned >= cost.qty ? "" : " lacking"}`}
                          // Steam-Forum 27.08.2026 (L1GR): Standard-Item-Karte beim Hover statt Flavor-Tooltip.
                          onMouseEnter={(e) => tooltip.show(cost.itemId, e.clientX, e.clientY, [])}
                          onMouseLeave={() => tooltip.hide()}
                        >
                          {img ? <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" /> : null}
                          {formatNum(owned)}/{formatNum(cost.qty)}
                        </span>
                      );
                    })}
                  </span>
                  {reason !== "ok" && reason !== "cannot_afford" && (
                    <span className="nh-buildmenu-reason">
                      {reasonText(state, reason, 1, hallName, busyName, "", t)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Gebäude-Kachel (Dorfkarte) ──────────────────────────────────────────────────────────────────

// codex:2026-08-03T12:45:00+02:00 — Die Kartenkalibrierung ist jetzt Teil des zentralen Save-State.
// Der lokale Name bleibt als UI-Alias erhalten; Werte ohne Override fallen auf den Rang-Default.
type CampMapCalibration = CampMapVisual;

function defaultCampMapCalibration(buildingId: string, level: number): CampMapCalibration {
  return {
    scalePercent: getCampMapDefaultCalibrationPercent(buildingId, level),
    flipped: false,
  };
}

function campMapCalibration(
  state: GameState,
  buildingId: string,
  level: number,
): CampMapCalibration {
  return state.camp?.mapVisuals?.[buildingId] ?? defaultCampMapCalibration(buildingId, level);
}

/**
 * Ein platziertes Gebäude auf der Karte. Position/Größe kommen 1:1 aus `pos`/`campFootprint` (0..1
 * → Prozent, s. `CampPos`-Doku „bewusst nicht in Pixeln") — nie eine eigene Pixel-Rechnung. Im Bau
 * (Neubau ODER Ausbau) zeigt die Kachel den Baustellen-/Gerüst-Platzhalter samt Fortschrittsbalken;
 * das im Bau befindliche Gebäude bekommt bewusst KEINEN `onPointerDown` (nicht ziehbar, s.
 * `campMoveReason` → `under_construction`).
 */
function MapTile({
  def,
  pos,
  lightPhase,
  level,
  isBuilding,
  jobTargetLevel,
  jobRemainingMs,
  jobTotalMs,
  moveMode,
  calibration,
  selected,
  onOpen,
  onSelect,
  onCalibrationChange,
  onCalibrationReset,
  onDragStart,
}: {
  def: CampBuildingDef;
  pos: CampPos;
  lightPhase: CampLightPhase;
  level: number;
  isBuilding: boolean;
  jobTargetLevel: number;
  jobRemainingMs: number;
  jobTotalMs: number;
  moveMode: boolean;
  calibration: CampMapCalibration;
  selected: boolean;
  onOpen: () => void;
  onSelect: () => void;
  onCalibrationChange: (patch: Partial<CampMapCalibration>) => void;
  onCalibrationReset: () => void;
  onDragStart: (e: ReactPointerEvent<HTMLDivElement>) => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const fp = campFootprint(def.id);
  const visualScale = getCampMapVisualScale(def.id, Math.max(1, level)) * calibration.scalePercent / 100;
  // codex:2026-08-03T09:30:00+02:00 — Isometrische Tiefensortierung folgt der unteren
  // Footprint-Kante: je näher sie dem unteren Kartenrand liegt, desto weiter vorn wird das
  // Gebäude gezeichnet. Eine aktive Auswahl liegt nur für die lokale Bedienung darüber.
  const depthOrder = Math.round(Math.max(0, Math.min(1.5, pos.y + fp.halfH)) * 10_000);
  const style: CSSProperties = {
    // codex:2026-07-31T23:59:00+02:00 — Position UND Bühne bleiben Prozentwerte der unveränderlichen
    // 1672:941-Weltfläche. Dadurch skalieren X/Y, Footprint und Sprite bei jeder Auflösung gemeinsam.
    left: `${pos.x * 100}%`,
    top: `${pos.y * 100}%`,
    width: `${fp.halfW * 200}%`,
    height: `${fp.halfH * 200}%`,
    "--nh-map-sprite-scale": String(visualScale),
    "--nh-map-sprite-flip": calibration.flipped ? "-1" : "1",
    zIndex: selected ? depthOrder + 20_000 : depthOrder,
  } as CSSProperties;
  const isSite = isBuilding && level === 0; // Neubau: noch keine Gebäude-Stufe, generischer Platzhalter
  const isScaffold = isBuilding && level >= 1; // Ausbau: das bestehende Gebäude steht schon, plus Gerüst
  // codex:2026-07-30T22:30:00+02:00 — Gebäude, Baustelle und Gerüst wechseln als deckungsgleiches Paar.
  const img = getCampImage(def.id, level, lightPhase);
  const siteArt = getCampSiteArt(lightPhase);
  const scaffoldArt = getCampScaffoldArt(lightPhase);
  const buildPct = isBuilding && jobTotalMs > 0
    ? Math.max(0, Math.min(1, 1 - jobRemainingMs / jobTotalMs))
    : 0;
  const title = isBuilding
    ? `${tr(def.name)} · ${t("newhaven.build.inProgress").replace("{n}", roman(jobTargetLevel))}`
    : `${tr(def.name)} · ${t("newhaven.level.label").replace("{n}", roman(level))}`;
  const scaleInputId = `nh-map-scale-${def.id}`;
  const toolPlacement = `${pos.y > 0.68 ? " is-above" : " is-below"}${pos.x < 0.2 ? " is-left-edge" : pos.x > 0.8 ? " is-right-edge" : ""}`;

  return (
    <div
      className={`nh-map-tile${isBuilding ? " is-building" : ""}${isScaffold ? " is-scaffold" : ""}${moveMode && !isBuilding ? " is-movable" : ""}${selected ? " is-selected" : ""}`}
      style={style}
      role="button"
      tabIndex={0}
      title={title}
      onClick={moveMode ? onSelect : onOpen}
      onKeyDown={(e: ReactKeyboardEvent<HTMLDivElement>) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (moveMode) onSelect();
        else onOpen();
      }}
      onPointerDown={isBuilding || !moveMode ? undefined : (e) => {
        onSelect();
        onDragStart(e);
      }}
    >
      {isSite ? (
        siteArt ? (
          <img className="nh-map-tile-img" src={siteArt} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="nh-map-tile-site-placeholder" aria-hidden="true" />
        )
      ) : img ? (
        <img className="nh-map-tile-img" src={img} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="nh-map-tile-placeholder" aria-hidden="true" />
      )}
      {isScaffold && (
        scaffoldArt ? (
          <img className="nh-map-tile-scaffold-img" src={scaffoldArt} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="nh-map-tile-scaffold-placeholder" aria-hidden="true" />
        )
      )}
      <span className="nh-map-tile-label">{tr(def.name)}</span>
      {/* codex:2026-08-03T09:30:00+02:00 — Objektbezogene Kalibrierung bleibt direkt am
          ausgewählten Gebäude. Sie ist vom Sprite-Transform getrennt, damit Titel, Slider und
          Knöpfe bei 1–300 % unverändert groß und bedienbar bleiben. */}
      {moveMode && selected && !isBuilding && (
        <div
          className={`nh-map-object-tools${toolPlacement}`}
          role="group"
          aria-label={`${t("newhaven.move.selected")} ${tr(def.name)}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="nh-map-object-tools-head">
            <label htmlFor={scaleInputId}>{t("newhaven.move.scale")}</label>
            <output htmlFor={scaleInputId}>{calibration.scalePercent}%</output>
          </div>
          <input
            id={scaleInputId}
            className="nh-map-object-tools-slider"
            type="range"
            min={CAMP_MAP_VISUAL_SCALE_MIN_PERCENT}
            max={CAMP_MAP_VISUAL_SCALE_MAX_PERCENT}
            step={1}
            value={calibration.scalePercent}
            onChange={(e) => onCalibrationChange({ scalePercent: Number(e.currentTarget.value) })}
          />
          <div className="nh-map-object-tools-foot">
            <span>{t("newhaven.move.effectiveScale").replace("{value}", visualScale.toFixed(2))}</span>
            <button
              type="button"
              className={`shop-citadel-btn${calibration.flipped ? " is-active" : ""}`}
              aria-pressed={calibration.flipped}
              aria-label={t("newhaven.move.flip")}
              title={t("newhaven.move.flip")}
              onClick={() => onCalibrationChange({ flipped: !calibration.flipped })}
            >
              <span aria-hidden="true">↔</span>
            </button>
            <button
              type="button"
              className="shop-citadel-btn"
              aria-label={t("newhaven.move.reset")}
              title={t("newhaven.move.reset")}
              onClick={onCalibrationReset}
            >
              <span aria-hidden="true">↺</span>
            </button>
          </div>
        </div>
      )}
      {isBuilding && (
        <div className="nh-map-tile-progress">
          <div className="nh-map-tile-progress-fill" style={{ transform: `scaleX(${buildPct})` }} />
        </div>
      )}
    </div>
  );
}

// ── Dorfkarte ───────────────────────────────────────────────────────────────────────────────────

/**
 * Die freie Platzierung (Task #371). Zwei eigenständige Zeige-/Zieh-Verfahren, beide nach dem
 * Vorbild des 0.2.2-sanierten Bank-Drag-&-Drop (Geist-Bild via `document.body`-Append statt eines
 * React-verwalteten Elements, Fenster-Listener statt Element-Capture, Escape-Abbruch, Aufräumen
 * beim Unmount — s. BankPage.tsx `beginBankDrag`):
 *
 *  - PLATZIEREN (neues Gebäude): Bau-Menü-Klick schaltet in den Modus, ein Geist folgt der Maus
 *    (Fenster-`pointermove`), ein Klick AUF DIE KARTE versucht `placeCampBuilding`. Der Geist bleibt
 *    absichtlich außerhalb von React (kein Re-Render pro Pixel, Perf-Vorgabe „kein Durchrendern im
 *    Leerlauf" gilt sinngemäß auch für aktive Ziehgesten) — nur der GRUND (`placeReason`) ist
 *    React-State, und der ändert sich nur, wenn er sich wirklich ändert (Bank-Vorbild: `overZone`).
 *  - VERSCHIEBEN (bestehendes Gebäude): klassisches Press-Move-Release. Bewusst KEIN direktes
 *    Verschieben des React-gerenderten Kachel-Elements per `style.left/top` — React „vergisst"
 *    einen so mutierten Wert nicht zuverlässig, wenn der nächste Render zufällig denselben
 *    Ziel-Wert wie vor dem Zug hätte (React diffed gegen seinen ZULETZT GERENDERTEN virtuellen
 *    Wert, nicht gegen den echten DOM-Wert). Ein eigenständiger Geist umgeht das strukturell — die
 *    echte Kachel bleibt während des Zugs unangetastet liegen, nur optisch abgedunkelt
 *    (`.nh-map-tile--dragging`, in `cleanup()` explizit wieder entfernt statt auf React zu hoffen).
 *
 * Authoritative Grund für BEIDE Geister ist EIN Engine-Aufruf (`campPlacementReason` bzw.
 * `campPositionReason`) — keine eigene Kopie der Gate-Reihenfolge (Regel 2 des Datei-Kopfs, Task
 * #364-Präzedenz: eine gespiegelte Regel ist irgendwann falsch, ein direkter Aufruf nie).
 */
function CampMapView({
  state,
  lightPhase,
  hallName,
  busyName,
  debugFreeBuild,
  moveMode,
  onMoveModeChange,
  onDirty,
  onRequestCancel,
  onNavigate,
}: {
  state: GameState;
  lightPhase: CampLightPhase;
  hallName: string;
  busyName: string;
  debugFreeBuild: boolean;
  moveMode: boolean;
  onMoveModeChange: (active: boolean) => void;
  onDirty: () => void;
  onRequestCancel: () => void;
  onNavigate: (id: string) => void;
}): JSX.Element {
  const { t, tr } = useI18n();
  const mapRef = useRef<HTMLDivElement>(null);
  const dragActiveRef = useRef(false);
  const dragCleanupRef = useRef<(() => void) | null>(null);

  const [placingId, setPlacingId] = useState<string | null>(null);
  const [placeReason, setPlaceReason] = useState<CampPlacementReason>("out_of_bounds");
  const [popupId, setPopupId] = useState<string | null>(null);
  // Chef-Bug 27.08.2026: Klick auf eine Bau-Menü-Karte (noch nicht platziertes Gebäude) öffnet
  // jetzt erst die Infokarte statt sofort den Platzierungs-Modus zu starten — s. `BuildingPopup`s
  // `onBuildNew`-JSDoc weiter unten.
  const [menuInfoId, setMenuInfoId] = useState<string | null>(null);
  // codex:2026-08-03T12:45:00+02:00 — Nur die aktuelle Auswahl ist flüchtig; visuelle Werte liegen
  // im zentralen Camp-State und laufen über dieselbe Dirty-/Save-Pipeline wie Positionen.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const job = state.camp?.buildJob ?? null;
  const occupied = campOccupiedPositions(state);
  const notBuilt = BUILDINGS.filter((b) => campBuildingLevel(state, b.id) === 0 && job?.buildingId !== b.id);
  const placingDef = placingId ? BUILDINGS.find((b) => b.id === placingId) ?? null : null;
  const selectedIsPlaced = selectedId === null || occupied.some(({ buildingId }) => buildingId === selectedId);
  // codex:2026-07-30T22:30:00+02:00 — Kartengrund und alle Overlays werden atomar umgeschaltet.
  const mapBg = getCampMapBackground(lightPhase);

  // Aufräumen beim Unmount (z.B. Seitenwechsel über die Sidebar mitten im Zug): sonst blieben
  // Fenster-Listener und ein Geist-Element hängen (Chef-Vorgabe, s. Datei-Kopf dieser Sektion).
  useEffect(() => () => dragCleanupRef.current?.(), []);

  useEffect(() => {
    if (!moveMode || !selectedIsPlaced) {
      setSelectedId(null);
    }
  }, [moveMode, selectedIsPlaced]);

  function updateCalibration(buildingId: string, level: number, patch: Partial<CampMapCalibration>): void {
    const current = campMapCalibration(state, buildingId, level);
    if (setCampMapVisual(state, content, buildingId, { ...current, ...patch })) onDirty();
  }

  function resetCalibration(buildingId: string): void {
    if (resetCampMapVisual(state, content, buildingId)) onDirty();
  }

  function pointFromClient(clientX: number, clientY: number): CampPos {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0.5, y: 0.5 };
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  }

  // ── Platzierungs-Modus ───────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!placingId) return;
    return registerEscCloser("modal", () => setPlacingId(null));
  }, [placingId]);

  useEffect(() => {
    if (!placingId) return;
    const pid = placingId;
    const fp = campFootprint(pid);
    const ghost = document.createElement("div");
    ghost.className = "nh-map-ghost";
    // codex:2026-07-30T22:30:00+02:00 — freigegebener Leerplatz markiert die geplante Grundfläche.
    const previewArt = getCampImage(pid, 1, lightPhase);
    if (previewArt) {
      const imgEl = document.createElement("img");
      imgEl.src = previewArt;
      imgEl.alt = "";
      ghost.appendChild(imgEl);
    }
    document.body.appendChild(ghost);

    const sizeGhost = (): void => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      ghost.style.width = `${fp.halfW * 2 * rect.width}px`;
      ghost.style.height = `${fp.halfH * 2 * rect.height}px`;
    };
    sizeGhost();

    const onMove = (ev: PointerEvent): void => {
      sizeGhost();
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%)`;
      const p = pointFromClient(ev.clientX, ev.clientY);
      const reason = campPlacementReason(state, content, pid, p.x, p.y, { waiveCosts: debugFreeBuild });
      ghost.classList.toggle("nh-map-ghost--valid", reason === "ok");
      ghost.classList.toggle("nh-map-ghost--invalid", reason !== "ok");
      setPlaceReason((prev) => (prev === reason ? prev : reason));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("resize", sizeGhost);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", sizeGhost);
      ghost.remove();
    };
  }, [debugFreeBuild, lightPhase, placingId, state]);

  function handleMapClick(e: ReactMouseEvent<HTMLDivElement>): void {
    if (!placingId) return;
    const p = pointFromClient(e.clientX, e.clientY);
    // codex:2026-07-31T19:00:03+02:00 — Platzierung nutzt denselben flüchtigen Kostenmodus.
    if (placeCampBuilding(state, content, placingId, p.x, p.y, { waiveCosts: debugFreeBuild }) === "ok") {
      setPlacingId(null);
      onDirty();
    }
    // Sonst: im Platzierungs-Modus bleiben — der Grund steht schon in der Banner-Zeile
    // (`placeReason`, live über dieselbe `campPlacementReason` aus dem Pointermove oben).
  }

  // ── Verschieben ──────────────────────────────────────────────────────────────────────────────
  function beginMoveDrag(buildingId: string, e: ReactPointerEvent<HTMLDivElement>): void {
    if (e.button !== 0 || dragActiveRef.current || placingId || !moveMode) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const tileEl = e.currentTarget;
    const fp = campFootprint(buildingId);
    const buildingLevel = Math.max(1, campBuildingLevel(state, buildingId));
    const calibration = campMapCalibration(state, buildingId, buildingLevel);
    const visualScale = getCampMapVisualScale(buildingId, buildingLevel)
      * calibration.scalePercent / 100;

    const ghost = document.createElement("div");
    ghost.className = "nh-map-ghost nh-map-ghost--move";
    // codex:2026-07-30T22:30:00+02:00 — Verschiebegeist bleibt in der sichtbaren Lichtfassung.
    const art = getCampImage(buildingId, campBuildingLevel(state, buildingId), lightPhase);
    if (art) {
      const imgEl = document.createElement("img");
      imgEl.src = art;
      imgEl.alt = "";
      imgEl.style.transform = `scaleX(${calibration.flipped ? -1 : 1}) scale(${visualScale})`;
      imgEl.style.transformOrigin = "center bottom";
      ghost.appendChild(imgEl);
    }
    ghost.style.display = "none";
    document.body.appendChild(ghost);

    let moved = false;

    const sizeGhost = (): void => {
      const rect = mapRef.current?.getBoundingClientRect();
      if (!rect) return;
      ghost.style.width = `${fp.halfW * 2 * rect.width}px`;
      ghost.style.height = `${fp.halfH * 2 * rect.height}px`;
    };

    const cleanup = (): void => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey);
      ghost.remove();
      tileEl.classList.remove("nh-map-tile--dragging");
      document.body.classList.remove("bank-dragging-noselect");
      dragActiveRef.current = false;
      dragCleanupRef.current = null;
    };

    const onMove = (ev: PointerEvent): void => {
      if (!moved) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        moved = true;
        dragActiveRef.current = true;
        ghost.style.display = "";
        tileEl.classList.add("nh-map-tile--dragging");
        document.body.classList.add("bank-dragging-noselect");
      }
      sizeGhost();
      ghost.style.transform = `translate(${ev.clientX}px, ${ev.clientY}px) translate(-50%, -50%)`;
      const p = pointFromClient(ev.clientX, ev.clientY);
      const reason = campPositionReason(state, buildingId, p.x, p.y);
      ghost.classList.toggle("nh-map-ghost--valid", reason === "ok");
      ghost.classList.toggle("nh-map-ghost--invalid", reason !== "ok");
    };
    const onUp = (ev: PointerEvent): void => {
      cleanup();
      if (!moved) return;
      const p = pointFromClient(ev.clientX, ev.clientY);
      if (moveCampBuilding(state, content, buildingId, p.x, p.y) === "ok") onDirty();
    };
    const onCancel = (): void => cleanup();
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.key === "Escape") cleanup();
    };

    dragCleanupRef.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey);
  }

  return (
    <div className="nh-map-layout">
      {/* codex:2026-07-31T23:59:00+02:00 — Die Stage nimmt den verfügbaren Raum ein; nur die
          innere Weltfläche ist interaktiv und bleibt stets im exakten Quellbild-Seitenverhältnis. */}
      <div className="nh-map-stage">
        {/* codex:2026-07-31T23:42:00+02:00 — Move ist ein expliziter Modus. Normale Kartenklicks
            öffnen Popups; nur im Move-Modus greifen und ziehen sie ein fertiges Gebäude. */}
        {/* codex:2026-08-02T21:42:00+02:00 — rein kosmetische Phase für kohärenten
            Bodenkontaktschatten; die deterministische Engine bleibt davon unberührt. */}
        <div
          ref={mapRef}
          className={`nh-map${placingId ? " is-placing" : ""}${moveMode ? " is-move-mode" : ""}`}
          data-light-phase={lightPhase}
          onClick={handleMapClick}
        >
          <div className="nh-map-bg" style={mapBg ? { backgroundImage: `url("${mapBg}")` } : undefined}>
            {!mapBg && (
              <>
                <span className="nh-map-edge nh-map-edge--forest-n" aria-hidden="true" />
                <span className="nh-map-edge nh-map-edge--forest-s" aria-hidden="true" />
                <span className="nh-map-edge nh-map-edge--forest-w" aria-hidden="true" />
                <span className="nh-map-edge nh-map-edge--creek" aria-hidden="true" />
                <span className="nh-map-edge nh-map-edge--rock" aria-hidden="true" />
              </>
            )}
          </div>

          {occupied.length === 0 && !placingId && (
            <p className="nh-map-empty-hint">{t("newhaven.map.empty")}</p>
          )}

          {occupied.map(({ buildingId, pos }) => {
            const def = BUILDINGS.find((b) => b.id === buildingId);
            if (!def) return null;
            const isBuilding = job?.buildingId === buildingId;
            const level = campBuildingLevel(state, buildingId);
            const jobTargetLevel = isBuilding ? job!.targetLevel : 0;
            const jobRemainingMs = isBuilding ? job!.remainingMs : 0;
            const levelDef = isBuilding ? def.levels[jobTargetLevel - 1] ?? null : null;
            const jobTotalMs = isBuilding && levelDef ? buildJobTotalMs(state, levelDef.buildMs) : 0;
            return (
              <MapTile
                key={buildingId}
                def={def}
                pos={pos}
                lightPhase={lightPhase}
                level={level}
                isBuilding={isBuilding}
                jobTargetLevel={jobTargetLevel}
                jobRemainingMs={jobRemainingMs}
                jobTotalMs={jobTotalMs}
                moveMode={moveMode}
                calibration={campMapCalibration(state, buildingId, Math.max(1, level))}
                selected={moveMode && selectedId === buildingId}
                onOpen={() => { if (!placingId) setPopupId(buildingId); }}
                onSelect={() => setSelectedId(buildingId)}
                onCalibrationChange={(patch) => updateCalibration(buildingId, Math.max(1, level), patch)}
                onCalibrationReset={() => resetCalibration(buildingId)}
                onDragStart={(e) => beginMoveDrag(buildingId, e)}
              />
            );
          })}
        </div>
      </div>

      <aside className="nh-map-side">
        {moveMode && !placingId && (
          <div className="nh-move-banner">
            <p>{t("newhaven.move.hint")}</p>
            <p className="nh-map-calibration-empty">{t("newhaven.move.selectHint")}</p>
            <button type="button" className="shop-citadel-btn" onClick={() => onMoveModeChange(false)}>
              {t("newhaven.move.done")}
            </button>
          </div>
        )}
        {placingId && placingDef && (
          <div className="nh-place-banner">
            <p className="nh-place-hint">{t("newhaven.map.placing.hint").replace("{name}", tr(placingDef.name))}</p>
            {placeReason !== "ok" && (
              <p className="nh-place-reason">{reasonText(state, placeReason, 1, hallName, busyName, "", t)}</p>
            )}
            <button type="button" className="shop-citadel-btn nh-place-cancel" onClick={() => setPlacingId(null)}>
              {t("newhaven.map.placing.cancel")}
            </button>
          </div>
        )}
        <BuildMenu
          buildings={notBuilt}
          activeId={placingId ?? menuInfoId}
          state={state}
          hallName={hallName}
          busyName={busyName}
          debugFreeBuild={debugFreeBuild}
          // Chef-Bug 27.08.2026: Erstklick öffnet nur noch die Infokarte (`BuildingPopup` unten,
          // `onBuildNew`) — der bisherige Sofort-Wechsel in den Platzierungs-Modus lebt dort als
          // Zweitschritt hinter dem „Bauen"-Knopf weiter.
          onSelect={(id) => setMenuInfoId((cur) => (cur === id ? null : id))}
        />
      </aside>

      {popupId && (
        <BuildingPopup
          buildingId={popupId}
          state={state}
          hallName={hallName}
          busyName={busyName}
          debugFreeBuild={debugFreeBuild}
          onStartMove={() => {
            // codex:2026-07-31T23:42:00+02:00 — Popup schließt und übergibt an den freien Move-Modus.
            setPopupId(null);
            setPlacingId(null);
            onMoveModeChange(true);
          }}
          onClose={() => setPopupId(null)}
          onDirty={onDirty}
          onRequestCancel={onRequestCancel}
          onNavigate={onNavigate}
        />
      )}

      {/* Chef-Bug 27.08.2026: dieselbe Infokarte wie oben, jetzt für ein noch NICHT platziertes
          Gebäude aus dem Bau-Menü — Bild, Beschreibung, Effekt, Kosten mit klickbaren Material-
          Zellen und Bauzeit sind identisch (`BuildingPopup` fragt für Stufe 0 automatisch dieselben
          Engine-Prädikate ab, „Verschieben"/„Abreißen" bleiben durch `core.level`/`demolishReason`
          von selbst verborgen). Einzig `onBuildNew` weicht vom Popup einer stehenden Kachel ab. */}
      {menuInfoId && (
        <BuildingPopup
          buildingId={menuInfoId}
          state={state}
          hallName={hallName}
          busyName={busyName}
          debugFreeBuild={debugFreeBuild}
          onStartMove={() => {}} // unerreichbar: Stufe 0 zeigt nie den „Verschieben"-Knopf
          onClose={() => setMenuInfoId(null)}
          onDirty={onDirty}
          onRequestCancel={onRequestCancel}
          onBuildNew={() => {
            // Zweitschritt = der bisherige Erstklick: Info-Modal schließt, der bestehende
            // Platzierungs-Modus (Geist folgt der Maus, Klick auf die Karte platziert) startet.
            setMenuInfoId(null);
            setPlacingId(menuInfoId);
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

// ── Seite ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Re-Render-Gate der Seite. Ein einziger Signatur-String (ein Primitiv — `Object.is` vergleicht
 * ihn wertgleich, s. GameContext „DIE EINE FOOTGUN"), der GENAU das enthält, was diesen Screen
 * sichtbar verändert:
 *  - `buildSeq` (eine Stufe wurde fertig) und der laufende Auftrag auf SEKUNDEN-Granularität
 *    (Countdown 1 Hz statt 10 Hz; ein Bau dauert Stunden, feiner wäre reine Verschwendung),
 *  - die Rezept-Slots (Fortschrittsbalken + „bisher veredelt"), ebenfalls sekundengenau,
 *  - Gold,
 *  - eine Material-Frische-Marke: NUR während eine Aktion läuft oder ein Kampf tickt, ändern sich
 *    Inventar/Bank überhaupt — dann alle 2 s, sonst konstant.
 * Ergebnis: Lager ruht + Spieler ruht ⇒ konstante Signatur ⇒ NULL Re-Render pro Tick.
 */
function newHavenGate(s: GameState): string {
  const camp = s.camp;
  const job = camp?.buildJob ?? null;
  let sig = `${camp?.buildSeq ?? 0}|${
    job ? `${job.buildingId}:${job.targetLevel}:${Math.floor(job.remainingMs / 1000)}` : "-"
  }|${s.character.gold}`;
  const refine = camp?.refine;
  if (refine) {
    for (const id of Object.keys(refine).sort()) {
      const slot = refine[id]!;
      sig += `|${id}:${slot.recipeId}:${slot.produced}:${Math.floor(slot.accMs / 1000)}`;
    }
  }
  sig += s.activeActionId || s.combat.monsterId != null ? `|${Math.floor(s.totalTicks / 20)}` : "|i";
  return sig;
}

/**
 * Der Planungs-Streifen (Spieler-Report 1.0.2: "New Haven, ability to queue up what would start
 * next after the current project ends"). Zeigt, was nach dem laufenden Bau drankommt.
 *
 * Der erste Eintrag traegt eine Zusatz-Zeile, wenn er gerade NICHT anlaufen koennte — fast immer,
 * weil Material fehlt. Das ist die einzige Information, die der Spieler zum Handeln braucht; bei
 * den hinteren Eintraegen waere sie nur Rauschen, weil sich bis dahin ohnehin alles aendert.
 */
function BuildQueueStrip({
  state,
  onDirty,
}: {
  state: GameState;
  onDirty: () => void;
}): JSX.Element | null {
  const { t, tr } = useI18n();
  const queue = state.camp?.buildQueue ?? [];
  if (queue.length === 0) return null;

  const crewBusy = state.camp?.buildJob != null;
  // Grund des NAECHSTEN Anlaufs — nur interessant, solange der Bautrupp frei ist und trotzdem
  // nichts passiert. Arbeitet er, ist "crew_busy" die banale Antwort und braucht keine Zeile.
  const ersterGrund = !crewBusy && queue[0]
    ? campBuildStartReason(state, content, queue[0])
    : "ok";

  return (
    <div className="nh-queue-strip">
      <span className="nh-queue-strip-title">{t("newhaven.queue.title")}</span>
      <ol className="nh-queue-list">
        {queue.map((id, i) => {
          const def = BUILDINGS.find((b) => b.id === id) ?? null;
          // Zielstufe dieses Eintrags: aktueller Stand + laufender Auftrag + alles, was DAVOR in
          // der Warteschlange steht. Genau die Stufe, die dieser Eintrag bauen wird.
          const stufe =
            campBuildingLevel(state, id) +
            (state.camp?.buildJob?.buildingId === id ? 1 : 0) +
            queue.slice(0, i + 1).filter((q) => q === id).length;
          return (
            <li key={`${id}-${i}`} className="nh-queue-item">
              <span className="nh-queue-pos" aria-hidden>{i + 1}.</span>
              <span className="nh-queue-name">
                {def ? tr(def.name) : id} {roman(stufe)}
              </span>
              <span className="nh-queue-actions">
                <button
                  type="button"
                  className="nh-queue-mini"
                  disabled={i === 0}
                  title={t("newhaven.queue.moveUp")}
                  onClick={() => { moveCampQueueItem(state, i, i - 1); onDirty(); }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="nh-queue-mini"
                  disabled={i === queue.length - 1}
                  title={t("newhaven.queue.moveDown")}
                  onClick={() => { moveCampQueueItem(state, i, i + 1); onDirty(); }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="nh-queue-mini nh-queue-remove"
                  title={t("newhaven.queue.remove")}
                  onClick={() => { dequeueCampBuild(state, i); onDirty(); }}
                >
                  ×
                </button>
              </span>
            </li>
          );
        })}
      </ol>
      {ersterGrund !== "ok" && (
        <p className="nh-queue-waiting">{t(`newhaven.reason.${ersterGrund}`)}</p>
      )}
    </div>
  );
}

function NewHavenPageImpl({ onNavigate }: { onNavigate: (id: string) => void }): JSX.Element {
  useGameSelector(newHavenGate);
  const getState = useGetGameState();
  const state = getState()!;
  const { t, tr } = useI18n();
  // codex:2026-08-03T12:10:00+02:00 — der echte lokale Lichtzyklus bleibt die Quelle; der
  // Debug-Override ist rein flüchtig und berührt weder Engine noch Savegame.
  const ambientLightPhase = useCampLightPhase();
  const [debugLightPhase, setDebugLightPhase] = useState<CampLightPhase | null>(null);
  const lightPhase = debugLightPhase ?? ambientLightPhase;

  // Karte | Liste (Task #371, Muster CharacterPage `midTab`: reiner UI-State, kein Save-Feld).
  // Default „Karte" (Chef-Vorgabe „Kartenansicht als Standard") — das Grid bleibt vollständig
  // funktionsfähig als zweite Ansicht, s. Datei-Kopf.
  const [view, setView] = useState<"map" | "list">("map");
  // codex:2026-07-31T19:00:03+02:00 — bewusst UI-lokal: Reload/Seiten-Remount setzt Debug zurück.
  const [debugFreeBuild, setDebugFreeBuild] = useState(false);
  // codex:2026-07-31T23:42:00+02:00 — flüchtiger, kostenloser Kartenmodus; Positionen bleiben
  // weiterhin ausschließlich die vorhandenen Prozentwerte in camp.positions.
  const [moveMode, setMoveMode] = useState(false);

  const [confirmCancel, setConfirmCancel] = useState(false);
  // Engine-Verben mutieren den State IN-PLACE; der nächste Tick trägt die Änderung ohnehin ins
  // Gate — dieser Zähler macht die Reaktion SOFORT sichtbar, statt bis zu 100 ms zu warten.
  // Beide Callbacks sind `useCallback`-stabil, sonst könnte der Karten-`memo`-Vergleich unten
  // nie greifen (frische Closures pro Render wären immer „ungleich").
  const [, setDirty] = useState(0);
  const onDirty = useCallback((): void => setDirty((n) => n + 1), []);
  const onRequestCancel = useCallback((): void => setConfirmCancel(true), []);

  const job = state.camp?.buildJob ?? null;

  // Spieler-Report 1.0.2: Ein wartender Eintrag laeuft normalerweise beim Bau-Abschluss an
  // (engine `tickCampCrew`). Blieb er damals stehen — weil Material fehlte —, braucht er einen
  // zweiten Anstoss, sobald sich die Lage geaendert hat. Der Tick prueft das bewusst NICHT jeden
  // Schlag (offline waeren das zehntausende Laeufe umsonst), also tut es die Seite: wer hier
  // hinschaut, will genau das wissen.
  useEffect(() => {
    if (!job && (state.camp?.buildQueue?.length ?? 0) > 0) {
      if (advanceCampQueue(state, content) === "ok") onDirty();
    }
  });

  const hallDef = BUILDINGS.find((b) => b.id === CAMP_TOWNHALL_ID) ?? null;
  const hallName = hallDef ? tr(hallDef.name) : "";
  const jobDef = job ? BUILDINGS.find((b) => b.id === job.buildingId) ?? null : null;
  const busyName = jobDef ? tr(jobDef.name) : "";

  // KEINE „Gesperrt"-Karte mehr (Task #365): New Haven ist ab Spielstart die Heimatbasis — der
  // Screen zeigt IMMER das Bau-Grid. Ein frischer Charakter sieht einen leeren Rastplatz mit dem
  // Zentralhaus I als einzigem bezahlbaren Ziel; alles Weitere hängt an Kosten und Kapazität.
  const usedCapacity = campUsedBuildSlots(state, content);
  const totalCapacity = campBuildSlots(state, content);
  // Release-Fix-Welle 0.3.0: campBuildSlots liefert vor dem ersten Zentralhaus-Bau 0 — die Pille
  // zeigte frischen Chars also "0 / 0", obwohl das Baumenü bereits "Erst das Zentralhaus errichten"
  // sagt (s. reasonText townhall_first). Die Pille bleibt bis Zentralhaus-Stufe 1 einfach weg statt
  // eine zweite, verwirrende Null-Aussage danebenzustellen — kein neuer Text nötig.
  const hallLevel = campBuildingLevel(state, CAMP_TOWNHALL_ID);

  return (
    <div className="newhaven-page">
      {/* codex:2026-07-31T19:00:03+02:00 — Intro-/Townhall-/Crew-Block auf Chefentscheid entfernt. */}
      <div className="nh-view-controls">
        <div className="nh-view-tabbar" role="tablist" aria-label={t("newhaven.view.ariaLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={view === "map"}
            tabIndex={view === "map" ? 0 : -1}
            className={`nh-view-tab${view === "map" ? " active" : ""}`}
            onClick={() => setView("map")}
          >
            {t("newhaven.view.map")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "list"}
            tabIndex={view === "list" ? 0 : -1}
            className={`nh-view-tab${view === "list" ? " active" : ""}`}
            onClick={() => {
              // codex:2026-07-31T23:42:00+02:00 — Move gehört ausschließlich zur Kartenansicht.
              setMoveMode(false);
              setView("list");
            }}
          >
            {t("newhaven.view.list")}
          </button>
        </div>
        <button
          type="button"
          className={`nh-view-tab nh-move-toggle${moveMode ? " active" : ""}`}
          aria-pressed={moveMode}
          title={t("newhaven.move.hint")}
          onClick={() => {
            setView("map");
            setMoveMode((active) => !active);
          }}
        >
          {t("newhaven.move.button")}
        </button>
        {/* Release-Fix-Welle 0.3.0 Fix 1 (BLOCKER): „Debug: Gratis"/„Debug: Fertig" waren bisher
            bedingungslos sichtbar — jeder Spieler konnte sich Gebäude gratis/instant hochziehen.
            Gated auf `import.meta.env.DEV` (Muster `game/fixtureLoader.ts`/`devtools.ts`): Vite
            faltet die Prüfung in Prod-Builds zur literalen `false` und shaked den ganzen Zweig
            samt Klick-Handlern aus dem Bundle — `debugFreeBuild` bleibt im Prod-Pfad zwangsläufig
            tot, weil der einzige Setter (der Toggle-Button) gar nicht mehr existiert. */}
        {import.meta.env.DEV && (
          <>
            {/* codex:2026-07-31T19:00:03+02:00 — Debug ist ein Switch neben, aber nicht IN der Tablist. */}
            <button
              type="button"
              className={`nh-view-tab nh-debug-toggle${debugFreeBuild ? " active" : ""}`}
              aria-pressed={debugFreeBuild}
              title={t("newhaven.debug.freeHint")}
              onClick={() => setDebugFreeBuild((active) => !active)}
            >
              {t("newhaven.debug.freeButton")}
            </button>
            {/* codex:2026-07-31T20:21:01+02:00 — Aktion statt persistiertem Modus: Es kann nur einen
                Bautrupp-Job geben; der Button beendet genau diesen über den Engine-Abschlussweg. */}
            <button
              type="button"
              className="nh-view-tab nh-debug-complete"
              disabled={!job}
              title={job ? t("newhaven.debug.completeHint") : t("newhaven.debug.completeIdle")}
              onClick={() => {
                if (debugCompleteCampBuild(state)) onDirty();
              }}
            >
              {t("newhaven.debug.completeButton")}
            </button>
          </>
        )}
        {/* codex:2026-08-03T12:10:00+02:00 — flüchtige Renderer-Vorschau für visuelle Tag-/Nacht-QA.
            Chef-Nachentscheid 03.08. (überschreibt Release-Fix-Welle Fix 1): der Umschalter ist für
            Spieler KOMPLETT raus — Tag/Nacht folgt der echten Ortszeit, ein manueller Knopf bricht
            die Fiktion. Bleibt als reines DEV-Werkzeug (Muster wie Gratis/Fertig oben). */}
        {import.meta.env.DEV && (
          <button
            type="button"
            className={`nh-view-tab nh-debug-light${debugLightPhase !== null ? " active" : ""}`}
            aria-pressed={debugLightPhase !== null}
            title={t("newhaven.view.lightHint")}
            onClick={() => {
              setDebugLightPhase((phase) => (phase ?? ambientLightPhase) === "day" ? "night" : "day");
            }}
          >
            {t("newhaven.view.lightButton").replace(
              "{phase}",
              t(lightPhase === "day" ? "newhaven.view.lightDay" : "newhaven.view.lightNight"),
            )}
          </button>
        )}
        {hallLevel > 0 && (
          <span className="nh-capacity" aria-live="polite">
            {t("newhaven.header.slots")
              .replace("{used}", String(usedCapacity))
              .replace("{total}", String(totalCapacity))}
          </span>
        )}
      </div>

      <BuildQueueStrip state={state} onDirty={onDirty} />

      {view === "map" ? (
        <CampMapView
          state={state}
          lightPhase={lightPhase}
          hallName={hallName}
          busyName={busyName}
          debugFreeBuild={debugFreeBuild}
          moveMode={moveMode}
          onMoveModeChange={setMoveMode}
          onDirty={onDirty}
          onRequestCancel={onRequestCancel}
          onNavigate={onNavigate}
        />
      ) : (
        <div className="nh-grid">
          {BUILDINGS.map((def) => (
            <BuildingCard
              key={def.id}
              def={def}
              {...campCardCore(state, def, job, debugFreeBuild)}
              gold={state.character.gold}
              hallName={hallName}
              busyName={busyName}
              state={state}
              debugFreeBuild={debugFreeBuild}
              onDirty={onDirty}
              onRequestCancel={onRequestCancel}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}

      {confirmCancel && job && (
        <CancelConfirm
          name={busyName}
          level={job.targetLevel}
          onClose={() => setConfirmCancel(false)}
          onConfirm={() => {
            cancelCampBuild(state, content);
            setConfirmCancel(false);
            onDirty();
            // Fix #368-7 (Bot-Sweep #367): nach dem Bestätigen passierte sichtbar NICHTS — bei
            // vollem Inventar landete das erstattete Material sogar still in Bank/Post, ohne
            // jede Rückmeldung. `cancelCampBuild` selbst meldet keinen Breadcrumb (reiner
            // Sofort-Effekt, kein Tick-Ereignis) — der Toast kommt daher direkt aus diesem
            // Klick-Handler über den UI-lokalen Toast-Bus (util/toastBus.ts), nicht aus einem
            // Engine-State-Diff wie die übrigen New-Haven-Toasts in Toasts.tsx.
            pushUiToast({
              icon: "↩",
              iconUrl: getSidebarIcon("newhaven"),
              title: t("newhaven.toast.cancelled.title"),
              detail: t("newhaven.toast.cancelled.detail"),
            });
          }}
        />
      )}
    </div>
  );
}

/** `memo` ohne Props: entkoppelt die Seite vom Render-Takt ihres Elternteils (Muster CombatPage
 *  `MonsterSelect`) — ohne das würde sie trotz eigenem Gate mit jedem Tick mitgerissen. */
export const NewHavenPage = memo(NewHavenPageImpl);
