import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CombatEvent, StatusEffect, StatusType, WeaponStyle } from "@hearthforge/shared";
import { useI18n } from "../../i18n";
import { getItemImage } from "../../items";
import { renderEffectIcon, statIcon } from "../../statIcons";
import { formatNum, formatSeconds1, formatStat } from "../../util/format";
import type { CombatFxLevel } from "../../util/uiPrefs";
import { injectArena25dStyles } from "./styles";
// 0.4.0-Arena, Logik-Welle 1 (Chef-Entscheid 2026-08-03, s. design/battle-040-arena-produktion.md):
// Boden/Kulisse/Licht/Nebel/Grade/Props kommen jetzt aus dem Zonen-Manifest statt aus den zwei
// fest verdrahteten Pastures-Importen von Task #330 — s. manifest.ts (Schema+Registry) und
// assets.ts (URL-Auflösung inkl. Legacy-Fallback auf genau die beiden Task-#330-Texturen +
// prozedurale Prop-Platzhalter).
import { getZoneManifest, type ZoneManifest, type ZoneManifestLighting, type ZoneManifestProp } from "./manifest";
import { resolveArenaAssetUrl, makePlaceholderPropTexture } from "./assets";
// 0.4.0-Arena, Posen-Pilot (Chef-GO 2026-08-05, design/battle-040-pose-pilot.md): Auto-Discovery der
// Posen-Sprites (windup/strike/hit) — s. poses.ts Moduldoc für die volle Gating-/Lookup-Begründung.
import { getPoseSet, type PoseName, type PoseSet } from "./poses";
// 0.4.0-Arena, Logik-Welle 2 (Chef-Klarstellung 2026-08-03/04, design/battle-040-arena-produktion.md
// §5 Punkt 2): reine Zeit-/Gewichtsklassen-Tabellen für die Bewegungs-Choreografie im Raum — s.
// choreography.ts Moduldoc für die volle Begründung der Trennung.
import {
  classifyMonsterWeight,
  clamp01,
  easeInCubic,
  easeOutBackSoft,
  easeOutCubic,
  breathPhase as computeBreathPhase,
  randomPointInEllipse,
  PLAYER_PARAMS,
  PROJECTILE_TIMING,
  WEIGHT_PARAMS,
  type MotionParams,
} from "./choreography";
// CEO-Integritätsfix 04.08.: Der Scene-Builder-Agent wurde mitten in der Extraktion dieser
// Konstanten nach sceneEnvironment.ts gestoppt (Chef-Pause) — die Deklarationen waren schon
// verschoben, der Import fehlte noch. Dieser Import vollendet die Extraktion minimal.
import {
  BACKDROP_CURVE_RADIUS,
  BACKDROP_CURVE_SEGMENTS,
  BACKDROP_HEIGHT,
  BACKDROP_Z,
  buildGradeFilter,
  CAMERA_FOV,
  CAMERA_LOOKAT_Y,
  CAMERA_LOOKAT_Z,
  CAMERA_Y,
  CAMERA_Z,
  deriveSunOffset,
  DPR_CAP,
  FILL_GROUND_COLOR,
  FLOOR_CENTER_Z,
  GROUND_WORLD_DEPTH,
  GROUND_WORLD_WIDTH,
  MONSTER_X,
  MONSTER_Z,
  PLAYER_X,
  PLAYER_Z,
  PROP_BASE_HEIGHT,
  REFERENCE_ASPECT,
  SKIRT_REPEAT_X,
  SKIRT_REPEAT_Z,
  SKIRT_WORLD_DEPTH,
  SKIRT_WORLD_WIDTH,
} from "./sceneEnvironment";

// Modul-Level-Seiteneffekt statt `import "./arena25d.css"` — s. styles.ts-JSDoc für den vollen
// Bundle-Beweis-Hintergrund (CSS-Side-Effect-Imports überleben Tree-Shaking, ein gated JS-String
// dagegen nicht).
injectArena25dStyles();

/**
 * Task #330 (Chef-GO "Prototyp einer 2,5D-Kampfarena für 'The Pastures'").
 *
 * Rein PRÄSENTATIONALE Ersatz-Darstellung für die zwei `<Fighter/>`-Hälften + das Zonenbild
 * innerhalb von `.battle-arena` (s. Mount-Switch in CombatPage.tsx `Battle()`) — liest NUR die
 * bereits von `Battle()` berechneten Werte als Props (HP/Ward/Nonces/Level/Bild-URLs), rührt
 * NIEMALS Combat-State/Engine-Funktionen an. Combat-Log, Loadout-Spalte, Flucht-Button, Encounter-
 * Leiste etc. bleiben die bestehenden DOM-Elemente außerhalb dieser Komponente unverändert.
 *
 * Architektur (Lehren aus AmbientCanvas.tsx übernommen, s. dortiges Modul-JSDoc):
 * - EIN `useEffect([props.zoneId])` baut Szene/Renderer/rAF-Loop auf und räumt beim Unmount ODER
 *   Zonenwechsel komplett auf (`dispose()` auf Geometrien/Materialien/Texturen/Renderer) —
 *   Arena25DStage mountet/unmountet mit dem Mount-Switch, ein Kampf-Ende/Flag-Aus/anderer
 *   Zonenwechsel killt den kompletten 3D-Kontext und baut ihn (falls weiter aktiv) sofort neu auf
 *   (0.4.0-Arena Welle 1, Chef-Auftrag "Wechsel der Zone = Manifest-Swap ohne Reload" — s. Effect-
 *   Ende für die volle Abwägung, warum ein voller Rebuild hier der bewusst einfachere Weg ist).
 * - Live-KAMPF-Props (HP/Nonces/Floater/…) laufen weiterhin über `propsRef` (in JEDEM Render
 *   aktualisiert, s.u.) statt über die Effect-Dependency-Liste — der rAF-Loop liest sie pro Frame
 *   frisch, ohne die Three.js-Szene bei jedem 10-Hz-Combat-Tick neu aufzubauen (Kontext-Leck/
 *   Ruckler-Risiko). NUR `zoneId` ist eine echte Dependency (ändert sich nie innerhalb eines Ticks).
 * - DPR auf 1.25 gedeckelt (Chef-Vorgabe Perf-Budget), rAF pausiert bei `document.hidden`.
 * - Priming-Render synchron vor dem ersten rAF-Tick (kein sichtbarer Shader-Kompilier-Ruckler).
 * - Schwebende HP-/Ward-Balken sind KEINE Textur, sondern echte DOM-Elemente (dieselben globalen
 *   `.cbar`/`.cbar-fill`/`.cbar-label`-Klassen wie die klassische Nameplate, s. styles/combat.css)
 *   — pro Frame wird nur ihre Bildschirm-Position (3D→2D-Projektion) imperativ als `transform`
 *   geschrieben, der Balken-FÜLLSTAND selbst kommt aus dem normalen React-Rendern der Props
 *   (Battle() re-rendert ohnehin 10×/s, s. dortiger `useGameSelector(totalTicks)`-Kommentar) —
 *   Text bleibt gestochen scharf, keine Textur-Bastelei, Styling/i18n-Format gratis geerbt.
 *
 * Bewusste Prototyp-Scope-Cuts (s. README.md "Was der Prototyp NICHT kann" für die volle Liste):
 * KEINE Kill-Summary-Karte/Bloom-Postprocessing/Cast-Sonderanimation in der 3D-Szene — das Combat-
 * Log rechts zeigt weiterhin JEDE Zahl unverändert, nur die Arena-Visualisierung selbst ist bewusst
 * schlanker als die volle 2D-Fighter-FX-Palette. Task #330c Punkt 5 hat die Damage-/Heal-Floater
 * NACHGEZOGEN (s. `FloaterList`/`Arena25DFloaterInput` unten) — die einzige Lücke aus der
 * ursprünglichen Scope-Cut-Liste, die inzwischen geschlossen ist.
 */

/**
 * Task #330c (Chef-Punkt 5 "Kampfeffekte ... Damage, Heilung usw."): Struktur-Zwilling von
 * CombatPage.tsx' modul-privatem `Floater` (nicht exportiert — Isolationsvertrag verbietet, dafür
 * dort etwas anzufassen). TypeScript prüft die Prop-Zuweisung strukturell: CombatPage übergibt sein
 * `floaters`-State-Array (gefiltert nach `target`) 1:1 in den Mount-Switch-Props (s. CombatPage.tsx
 * "ARENA25D MOUNT SWITCH") — jedes Feld hier ist ein Teilmengen-Match seines Gegenstücks, das reicht
 * für die Zuweisbarkeit (Excess-Property-Check greift nur bei frischen Objekt-Literalen, nicht hier).
 */
export interface Arena25DFloaterInput {
  id: number;
  amount: number;
  crit: boolean;
  heal: boolean;
  magic: boolean;
  dot?: boolean;
  lifesteal?: boolean;
  healSource?: CombatEvent["source"];
  healItemId?: string;
  miss?: boolean;
  xp?: boolean;
  proc?: boolean;
  wardAbsorb?: boolean;
  label?: string;
  status?: StatusType;
  x: number;
}

export interface Arena25DFighter {
  imgSrc: string | null;
  name: string;
  level?: number;
  hpCur: number;
  hpMax: number;
  wardCur?: number;
  wardMax?: number;
  /** Task #330d Punkt 6 (Chef-Nachtrag "Manabalken fehlt"): NUR gesetzt, wenn die 2D-Ansicht ihn
   *  auch zeigen würde (`showManaBar`-Ableitung aus CombatPage.tsx, unverändert 1:1 übernommen —
   *  s. CombatPage.tsx "ARENA25D MOUNT SWITCH"). `manaMax undefined/0` ⇒ keine Leiste, exakt wie
   *  der 2D-`Fighter()`s `showMana`-Gate. Nur Spieler-Seite wird je gesetzt (Gegner haben kein Mana). */
  manaCur?: number;
  manaMax?: number;
  /** Task #330d Punkt 6 (Chef-Nachtrag "Angriffsbalken fehlt"): derselbe Schwung-/Cast-Timer wie
   *  die 2D-Nameplate (`Fighter`s `timerPct`/`timerRemainingSec`, s. dortiges JSDoc) — BEIDE Seiten
   *  gesetzt, kein optionales Feld (jeder Kämpfer hat einen Angriffstimer). */
  timerPct: number;
  timerRemainingSec: number;
  /** Task #330d Punkt 7 (Chef-Nachtrag "Status-Effekte auf Gegnern fehlt"): dieselbe
   *  `StatusEffect[]`-Quelle wie `cs.playerEffects`/`cs.enemyEffects` in CombatPage.tsx, 1:1 durch-
   *  gereicht — keine eigene Statuslogik, reine Anzeige (s. `StatusEffectRow` unten). */
  effects?: StatusEffect[];
  /** Kill-Cooldown aktiv (nur Gegner-Seite) — dieselbe sanfte Abdunklung wie `.cooldown-blur`. */
  dimmed?: boolean;
  /** Task #330c Punkt 5: dieselbe `floaters`-Event-Quelle wie die 2D-Ansicht, vorgefiltert nach Seite. */
  floaters?: Arena25DFloaterInput[];
}

export interface Arena25DStageProps {
  player: Arena25DFighter;
  monster: Arena25DFighter;
  fxLevel: CombatFxLevel;
  /**
   * 0.4.0-Arena Welle 1: Zone des aktuellen Kampfs (`monster.zone` 1:1 aus CombatPage, s. dortigen
   * Mount-Switch) — bestimmt, welches Manifest (Boden/Kulisse/Licht/Props) geladen wird (s.
   * manifest.ts `getZoneManifest`). Nur GELESEN, keine Engine-Logik. Ändert sich `zoneId` während
   * die Komponente gemountet bleibt (Chef-Auftrag "Wechsel der Zone = Manifest-Swap ohne Reload"),
   * baut der Haupt-Effect die komplette Szene neu auf (s. Effect-Deps am Ende der Komponente) —
   * ein voller Rebuild ist hier bewusst einfacher/sicherer als selektives Nachziehen einzelner
   * Objekte, UND unproblematisch, weil Zonenwechsel selten sind (nicht Teil des 10-Hz-Kampf-Ticks).
   */
  zoneId: string;
  /**
   * Task #330d Punkt 8 (Chef-Zitat "End-Combat-Screen ... MUSS kommen, identisch zur 2D-Ansicht
   * ... gleiche Komponente/gleicher State wie 2D, kein Duplikat der Logik — nur die Platzierung
   * ist arena-spezifisch"): CombatPage rendert `<KillSummaryCard lastKill={cs.lastKill} />`
   * SELBST (dieselbe Funktion/denselben State wie der 2D-Zweig, s. "ARENA25D MOUNT SWITCH") und
   * reicht das fertige Element hier NUR zum Platzieren durch — Arena25DStage kennt `LastKillSummary`
   * nicht einmal (keine Typ-Kopplung nötig, `JSX.Element` reicht als Vertrag). `.a25-root` ist
   * bereits `position:absolute` (s. styles.ts) — `.kill-summary-card`s eigenes
   * `position:absolute; top/left:50%; transform:translate(-50%,-50%)` (combat.css, unverändert)
   * zentriert sich dadurch automatisch über der GESAMTEN Arena-Fläche, ohne einen einzigen neuen
   * CSS-Selektor.
   */
  killSummary?: JSX.Element | null;
  /**
   * 0.4.0-Arena, Logik-Welle 2 (design/battle-040-arena-produktion.md §5 Punkt 2 + Punkt 6
   * "Synchronisation mit der Engine ... KRITISCH"): dasselbe `cs.log` wie die 2D-Ansicht, 1:1
   * durchgereicht — Arena25DStage verarbeitet seine EIGENE `seq`-Diff im rAF-Loop (eigener
   * `lastSeq`-Ref, komplett unabhängig von CombatPage's `lunge`/`hitFx`-State-Machine, die weiter
   * NUR den 2D-Zweig füttert). Ersetzt die alten `attackNonce`/`hitNonce`/`hitCrit`-Felder auf
   * `Arena25DFighter` (Welle-1-Stand) — das rohe Log trägt strikt mehr Information (Angriffsstil,
   * `missReason` für Dodge/Schock, Crit/Miss/Kill in EINEM Strom), die für die Windup→Sprint→Clash→
   * Return-Choreografie + Dodge-Sidestep/Schock-Stagger/Ranged-Magie-Projektil gebraucht wird — s.
   * Moduldoc "Choreografie-Architektur" weiter unten. HP-/Ward-Balken bleiben davon UNBERÜHRT (die
   * kommen weiterhin direkt aus `player.hpCur`/`monster.hpCur` in JEDEM Render, s. NameplateOverlay
   * — "Schaden/HP-Balken bleiben event-exakt", Auftrag Punkt 6).
   */
  log: CombatEvent[];
  /**
   * Angriffsstil des SPIELERS (melee/ranged/magic, aus `stats.style` — dieselbe Quelle wie der
   * 2D-Zweig). Gegner sind im Content-Modell IMMER Nahkämpfer (`MonsterDef` kennt kein `style`-Feld,
   * s. packages/shared/src/index.ts) — die Choreografie behandelt jeden `by:"enemy"`-Angriff daher
   * unbedingt als Melee-Sprint, ohne eigenes Gegner-Stil-Feld zu brauchen.
   */
  playerStyle: WeaponStyle;
}

// DPR_CAP kommt seit der Scene-Builder-Welle aus ./sceneEnvironment (Import oben) — lokale Kopie
// entfernt (identische mechanische Auslagerung wie clamp01/easeOutCubic in Welle 2, s.u.).
const FIGURE_HEIGHT = 3.4; // Weltraum-Einheiten — Basis-Höhe des GEGNER-Billboards (Breite folgt der Bild-Aspect-Ratio)
// Task #330d Punkt 3 (Chef-Zitat "Du darfst auch Spielerkämpfer 2x so groß machen wie jetzt" —
// explizite Freigabe): NUR der Spieler wird verdoppelt, "Gegner-Skala unverändert" (Chef-Vorgabe).
// Eigene Konstante statt eines Boards-weiten Faktors, weil `FIGURE_HEIGHT` an mehreren Stellen
// (Placeholder-Scale, Baseline-Offset, Bar-/Floater-Anker-Höhe) gebraucht wird — s. `Billboard.
// figureHeight` weiter unten, das jedes Board seine EIGENE Höhe durchreichen lässt.
const PLAYER_FIGURE_HEIGHT = FIGURE_HEIGHT * 2;
// Chef-Runde 4 (Screenshot 46, „NPCs sind zu klein neben dem Spieler"): seit beide auf derselben
// Tiefenlinie stehen, wirkte der 3.4er-Gegner neben dem 6.8er-Spieler wie Spielzeug. Gegner auf
// 1.8× — bewusst einen Tick unter dem Spieler (der bleibt die dominante Figur), aber klar
// Duell-Partner statt Beiwerk. Eine Konstante für ALLE Monster (Prototyp-Vereinfachung).
const MONSTER_FIGURE_HEIGHT = FIGURE_HEIGHT * 1.8;
// PLAYER_X/MONSTER_X/PLAYER_Z/MONSTER_Z kommen seit der Scene-Builder-Welle aus ./sceneEnvironment
// (Import oben) — der neue Scene-Builder zeigt dieselben Werte als Referenz-Overlay-Dummies. Chef-
// Runde 3 (24.07. spät, Screenshot 44): Gegner NICHT mehr tiefer im Raum — „Der NPC rechts sollte
// auf die gleiche Höhe wie der Spieler sein, nicht weiter hinten im Hintergrund." Beide Kämpfer
// stehen auf DERSELBEN Tiefenlinie (Duell-Aufstellung); X symmetrisch, weil der Gegner durch die
// nähere Z sonst an den rechten Rand projiziert würde (perspektivische X-Streckung ~×1,29 ggü. der
// alten Tiefe). Werte innerhalb [FLOOR_CENTER_Z ± GROUND_WORLD_DEPTH/2].

// ── 0.4.0-Arena, Logik-Welle 2 (Auftrag Punkt 1 "Einlauf") ──────────────────────────────────────
// Startpositionen für den Einlauf-Walk: der Gegner kommt vom rechten Rand der Bodenfläche
// hereingelaufen ("vom Kulissen-Rand", GROUND_WORLD_WIDTH=18 ⇒ Boden reicht bis X≈±9 — 8.4 sitzt
// knapp innerhalb, sichtbar am Bildrand startend, ohne je außerhalb der Kulisse zu stehen). Der
// Spieler bekommt nur einen KLEINEN Offset (Chef-Vorgabe "dezenter Einlauf") — er wirkt schon vor
// Kampfbeginn präsent, rutscht nur ein kurzes Stück in Position statt sichtbar hereinzulaufen.
const MONSTER_ENTRANCE_FROM_X = 8.4;
const PLAYER_ENTRANCE_OFFSET_X = 1.1;

// ── Melee-Sprint (Auftrag Punkt 3): wie nah der Angreifer an den Gegner heranläuft ────────────
const MELEE_CLASH_GAP = 0.85;
/** Untere Kappung für `MELEE_CLASH_GAP`-Distanzen bei sehr kleinen Boards (Sicherheitsnetz, falls
 *  künftige Gewichtsklassen/Positionen die Lücke enger als die Kontakt-Distanz machen). */
const MELEE_MIN_SPRINT = 0.4;
/** Deckelt die prädiktive Vorlaufzeit (Windup+Sprint bzw. Lehne+Snap+Transit) — s. `updateAttackCycle`
 *  Moduldoc "Auftrag Punkt 6". Kein reales Angriffstempo in diesem Spiel ist so schnell, dass ein
 *  Zyklus länger als das hier bräuchte, aber der Deckel schützt defensiv gegen zukünftige Extrem-
 *  Buffs (Haste), die `attackIntervalMs` unter die Gewichtsklassen-Summe drücken könnten.
 */
const PREDICT_WINDOW_CAP_MS = 650;

// ── Posen-Pilot (design/battle-040-pose-pilot.md "Technik"): feste WALL-CLOCK-Fenster ab dem
// Kontakt-Event, NICHT an `AttackCycle.phase`/`holdMs`/`returnMs` gekoppelt (die variieren je
// Gewichtsklasse/Crit) — "ab Kontakt-Event strike für ~200ms (Angreifer) bzw. hit für ~250ms
// (Verteidiger)" gilt laut Auftrag wörtlich für JEDE Gewichtsklasse gleich. s. `resolveAttackContact`
// (setzt die Deadlines) + `computeActivePoseKey` (liest sie).
const POSE_STRIKE_MS = 200;
const POSE_HIT_MS = 250;

const BAR_ANCHOR_Y_FACTOR = 1.08; // etwas über dem Kopf der Figur
/**
 * Chef-Runde 3 (Screenshot 44, „Die Leisten sollten aber weiter über den Spielercharakter"):
 * zurück zur LINEAREN Anker-Formel — die Plakette sitzt wieder klar ÜBER dem Kopf, auch beim
 * 2x-Spieler. Die #330d-Dämpfung (0,6-Faktor, Schulterhöhe) ist damit bewusst rückgebaut; gegen
 * das dort vermessene Clipping-Problem (~230px über Canvas-Rand bei 1080p) schützt jetzt statt-
 * dessen ein Bildschirm-Clamp DIREKT an der Projektionsstelle im Frame-Loop (s. clampPlateY):
 * die Plakette darf nie höher rutschen, als ihre eigene Höhe + Marge erlaubt — im Extremfall
 * „pinnt" sie am oberen Canvas-Rand, statt abgeschnitten zu werden.
 */
function barAnchorHeight(figureHeight: number): number {
  return figureHeight * BAR_ANCHOR_Y_FACTOR;
}
// Task #330c Punkt 5: Floater-Anker sitzt tiefer als der HP-Balken-Anker (Brusthöhe statt Kopf) —
// spiegelt die 2D-Ansicht, wo `.dmg-number` mittig über dem Porträt startet (top:46%), nicht über
// der Nameplate.
const FLOATER_ANCHOR_Y_FACTOR = 0.66;

// ── Boden (Task #330c Punkt 3, Chef-Vorgabe explizit "STRETCHEN statt kacheln"): die
// 1536×1024-Textur wird EINMAL über die komplette Bodenfläche gespannt (UV 0..1, ClampToEdge,
// KEIN RepeatWrapping) — ersetzt das MirroredRepeatWrapping-Kachelmuster aus #330b. Verzerrung
// (Bodenfläche ≠ Textur-Aspect) ist hier explizit vom Chef akzeptiert, nicht versehentlich.
// Anisotropie bleibt auf Maximum (Bildqualität-Standing-Rule).

// ── Kamera-/Boden-/Kulissen-Geometrie-Konstanten UND `deriveSunOffset`/`buildGradeFilter` kommen
//    seit der Scene-Builder-Welle (Chef-Auftrag "Arena-Scene-Builder") aus ./sceneEnvironment
//    (Import oben) — mechanische Auslagerung, IDENTISCHE Werte/Formeln (s. dortiges Modul-JSDoc),
//    damit das neue Dev-Werkzeug exakt dieselbe Kamera/denselben Boden/dieselbe Kulisse/Sonnen-
//    Herleitung/Farb-Grade zeigt wie dieser Kampf-Renderer, statt eines zweiten, potenziell
//    driftenden Nachbaus ("WYSIWYG im echten Renderer", Chef-Zitat). Betroffen: CAMERA_FOV/
//    CAMERA_Y/CAMERA_Z/CAMERA_LOOKAT_Y/CAMERA_LOOKAT_Z, FLOOR_CENTER_Z/GROUND_WORLD_WIDTH/
//    GROUND_WORLD_DEPTH/REFERENCE_ASPECT, SKIRT_WORLD_WIDTH/SKIRT_WORLD_DEPTH/SKIRT_REPEAT_X/
//    SKIRT_REPEAT_Z, BACKDROP_HEIGHT/BACKDROP_Z/BACKDROP_CURVE_RADIUS/BACKDROP_CURVE_SEGMENTS,
//    PROP_BASE_HEIGHT, SUN_DISTANCE, FILL_GROUND_COLOR. Alle Herleitungs-Kommentare (Kamera-Pitch,
//    Skirt-Zweck, Sonnen-Rückrechnung, Grade-Näherung) leben jetzt in sceneEnvironment.ts.

/**
 * Rein defensiver Rückfall — sollte praktisch NIE greifen, weil `isArena25dActive`/
 * `isZoneArenaCapable` (flag.ts/assets.ts) eine Zone ohne gültiges, auflösbares Manifest gar nicht
 * erst mounten lassen. Reproduziert 1:1 die alte Task-#330d-Hartcodierung (Pastures-Baseline),
 * falls diese Komponente dennoch ohne Manifest gerendert wird (z.B. ein Bug an der Aufrufstelle).
 */
const FALLBACK_MANIFEST: ZoneManifest = {
  zoneId: "__fallback__",
  ground: "arena_pastures_ground.webp",
  backdrop: "arena_pastures_backdrop.webp",
  lighting: {
    sunColor: "#ffd9a0",
    sunIntensity: 3.4,
    sunAngleDeg: 46,
    sunAzimuthDeg: 26,
    ambientColor: "#9fb8dd",
    ambientIntensity: 1.1,
    fogColor: "#241e15",
    fogDensity: 0,
    grade: { saturation: 1, temperature: 0, lift: 0 },
  },
  props: [],
};

// clamp01 kommt seit Welle 2 aus ./choreography (Import oben) — lokale Kopie entfernt
// (CEO-Hotfix 04.08.: Duplicate-declaration brach die laufende Dev-Instanz des Chefs).

// easeOutCubic kommt seit Welle 2 ebenfalls aus ./choreography (Import oben) — lokale Kopie
// entfernt (CEO-Hotfix 04.08., zweites Duplikat nach clamp01).

/** Weicher elliptischer Kontaktschatten unter einer Figur — analog zum bestehenden 2D-Pet-Schatten
 *  (`.battle-pet-sprite::before` in combat.css), hier als echte Boden-Textur statt CSS-Gradient.
 *  0.4.0-Arena Welle 2, Chef-Feedback-Punkt 2 (04.08., Screenshot 53 "Schatten = harter dunkel-
 *  grüner Klecks"): NOCHMAL deutlich weicher/kleiner als der #330c-Ausgangswert — Max-Opazität von
 *  0.6→0.32 (Chef-Vorgabe "~0.25-0.35 Opazität"), UND der Falloff beginnt jetzt schon bei 35 % vom
 *  Radius (statt 50 %) mit einer zusätzlichen Zwischenstufe bei 78 % — der alte Zwei-Stopp-Verlauf
 *  hatte im mittleren Bereich noch zu viel Volltonfläche, was zusammen mit der (unverändert)
 *  dunklen Boden-Emissive als harter Fleck statt einer weich auslaufenden Ellipse las. Reine Alpha-
 *  Textur — die frühere "grüne" Anmutung im Chef-Screenshot war reines Alpha-Blending gegen den
 *  warmen Gras-Grund darunter, kein Farbstich in der Textur selbst; die reduzierte Opazität nimmt
 *  dieser Illusion den Großteil ihrer Kraft. */
function makeShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, "rgba(8,7,4,0.32)");
  grad.addColorStop(0.35, "rgba(8,7,4,0.24)");
  grad.addColorStop(0.78, "rgba(8,7,4,0.08)");
  grad.addColorStop(1, "rgba(8,7,4,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Task #330c Punkt 4 (Chef: "künstliche warme Sonne ... optional kleine Sonnenscheibe/Glow, wenn
 *  billig machbar"): Radial-Gradient-Glow, additiv geblendet — kein Asset, ein Sprite. */
function makeSunGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,244,214,0.95)");
  grad.addColorStop(0.35, "rgba(255,217,160,0.55)");
  grad.addColorStop(1, "rgba(255,217,160,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Task #330c Punkt 2 (Chef: "Backdrop curven wie ein Curved-Monitor"): baut einen vertikalen
 * Zylinder-Ausschnitt STATT einer flachen Plane, per Hand aufgebaute BufferGeometry (nicht
 * `THREE.CylinderGeometry` — hier volle Kontrolle über Normalen/Winding/UV nötig, um Verzerrung
 * und Backface-Culling-Überraschungen auszuschließen).
 *
 * Parametrisierung: Kreis in der XZ-Ebene, Mittelpunkt der Kurve (θ=0) liegt exakt auf lokalem
 * z=0 (die alte Flachwand-Tiefe) — die Enden (θ=±halfArc) biegen sich Richtung +z (zur Kamera) vor,
 * um `radius·(1−cos(halfArc))` Welteinheiten ("Enden kommen leicht auf die Kamera zu", Chef-Vorgabe).
 * `halfArc` wird so gelöst, dass die Sehne (gerade X-Spannweite an den Enden) exakt `width` ergibt
 * — die sichtbare Gesamtbreite bleibt damit identisch zur vorherigen Flachwand, nur die Tiefe variiert.
 * UV folgt exakt der PlaneGeometry-Konvention (u:0..1 links→rechts, v:0..1 unten→oben) — dieselbe
 * Textur/derselbe Crop wie zuvor lässt sich also unverändert weiterverwenden, kein Seitenverhältnis-
 * Umbau nötig (Standing Rule "nie strecken" bleibt für die Kulisse unverändert in Kraft).
 */
function buildCurvedBackdropGeometry(width: number, height: number, radius: number, segments: number): THREE.BufferGeometry {
  const halfArc = Math.asin(Math.min(0.96, width / 2 / radius));
  const cols = segments + 1;
  const positions = new Float32Array(cols * 2 * 3);
  const normals = new Float32Array(cols * 2 * 3);
  const uvs = new Float32Array(cols * 2 * 2);
  for (let i = 0; i < cols; i++) {
    const f = i / segments; // 0..1 links→rechts
    const theta = -halfArc + f * (2 * halfArc);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const x = radius * sinT;
    const zLocal = radius * (1 - cosT); // 0 in der Mitte, positiv (Richtung Kamera) an den Enden
    const nx = -sinT;
    const nz = cosT; // Normalen-Richtung Richtung Kamera (+z bei θ=0), s. Moduldoc-Herleitung
    for (let row = 0; row < 2; row++) {
      const vi = (i * 2 + row) * 3;
      const y = row === 0 ? -height / 2 : height / 2;
      positions[vi] = x;
      positions[vi + 1] = y;
      positions[vi + 2] = zLocal;
      normals[vi] = nx;
      normals[vi + 1] = 0;
      normals[vi + 2] = nz;
      const ui = (i * 2 + row) * 2;
      uvs[ui] = f;
      uvs[ui + 1] = row;
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c2 = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    // Winding so gewählt, dass die berechnete Flächen-Normale mit den Vertex-Normalen oben
    // übereinstimmt (Richtung Kamera) — s. Moduldoc. `side: THREE.DoubleSide` auf dem Material
    // (s. Aufrufstelle) bleibt trotzdem als billige Absicherung gesetzt.
    indices.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geo;
}

interface SpriteBaseline {
  /** Anteil der Bildhöhe (0..1), der von der UNTEREN PNG-Kante aus komplett transparent ist.
   *  Wird als Y-Korrektur verrechnet, damit die GEMESSENE Fuß-Pixelzeile (nicht die Bildkante,
   *  die bei praktisch jedem Sprite transparentes Padding hat) auf y=0 der Bodenebene landet. */
  insetFrac: number;
  /** Horizontale Spanne der nicht-transparenten Pixel innerhalb der untersten Fuß-Region, als
   *  Bruchteil der Bildbreite — bestimmt die Breite der Kontaktschatten-Ellipse. */
  footSpanFrac: number;
  /** Horizontales Zentrum dieser Fuß-Region (0.5 = Bildmitte) — bei asymmetrischer Pose sitzt der
   *  Schatten dann exakt unter den Füßen statt unter der Bild-Mitte. */
  footCenterFrac: number;
}

const spriteBaselineCache = new Map<string, SpriteBaseline>();

/** Chef-Anordnung (Task #330b-Nachtrag, ausgelöst durch Screenshot "Ritter/Huhn schweben, Schatten
 *  liegt isoliert weit unter den Füßen"): NICHT die PNG-Bildkante als Boden-Referenz nehmen —
 *  stattdessen einmalig (pro Bild-URL gecacht, s. `spriteBaselineCache`) die TATSÄCHLICH unterste
 *  Pixelzeile mit nennenswertem Alpha suchen ("in welcher untersten Reihe der erste Pixel anfängt,
 *  so dass dieser Pixel Kontakt mit dem Boden hat"). Generisch über jede Sprite-Quelle (Spieler-
 *  Archetyp UND jedes Monster) — keine Hardcode-Offsets pro Kreatur. Alpha-Schwelle 16 (statt 0)
 *  ignoriert Anti-Aliasing-/Glow-Reste am äußersten Rand, die die Baseline sonst um 1-2px verfälschen. */
function measureSpriteBaseline(img: HTMLImageElement, url: string): SpriteBaseline {
  const cached = spriteBaselineCache.get(url);
  if (cached) return cached;
  const fallback: SpriteBaseline = { insetFrac: 0, footSpanFrac: 0.55, footCenterFrac: 0.5 };
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return fallback;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, w, h);
    const ALPHA_THRESHOLD = 16;
    const data = ctx.getImageData(0, 0, w, h).data;
    let baselineRow = -1;
    for (let y = h - 1; y >= 0; y--) {
      const rowStart = y * w * 4;
      let hit = false;
      for (let x = 0; x < w; x++) {
        if (data[rowStart + x * 4 + 3]! > ALPHA_THRESHOLD) {
          hit = true;
          break;
        }
      }
      if (hit) {
        baselineRow = y;
        break;
      }
    }
    if (baselineRow < 0) return fallback; // komplett leeres Bild — sollte nie vorkommen
    const insetFrac = (h - 1 - baselineRow) / h;
    // Fuß-Spanne: horizontale Ausdehnung der nicht-transparenten Pixel in den untersten ~8% der
    // sichtbaren Höhe (Chef-Vorgabe "unterste ~5-10% des sichtbaren Inhalts").
    const bandRows = Math.max(1, Math.round(h * 0.08));
    let left = w;
    let right = -1;
    for (let y = baselineRow; y > baselineRow - bandRows && y >= 0; y--) {
      const rowStart = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (data[rowStart + x * 4 + 3]! > ALPHA_THRESHOLD) {
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    const result: SpriteBaseline =
      right >= left
        ? { insetFrac, footSpanFrac: Math.max(0.12, (right - left) / w), footCenterFrac: (left + right) / 2 / w }
        : { ...fallback, insetFrac };
    spriteBaselineCache.set(url, result);
    return result;
  } catch (err) {
    // getImageData kann bei getainteten Canvases werfen (Cross-Origin) — Vite-Assets sind
    // same-origin, defensiv trotzdem: kein Crash, konservativer Fallback ohne Offset.
    // eslint-disable-next-line no-console
    console.error(`[a25-debug] measureSpriteBaseline THREW for ${url}:`, err);
    return fallback;
  }
}

// ── 0.4.0-Arena, Posen-Pilot — vorgeladene Posen-Textur ─────────────────────────────────────────────
/** Eine EINZELNE vorgeladene Posen- (oder Idle-)Textur samt ihrer EIGENEN Baseline/Aspect (Auftrag
 *  Punkt 3: "pro Pose eigene Alpha-Baseline ... Schatten/Bodenkontakt folgen der aktiven Pose") —
 *  strukturelles Geschwister dessen, was `applyTexture` bislang inline nur für die Idle-Textur hielt. */
interface PoseTextureEntry {
  texture: THREE.Texture;
  baseline: SpriteBaseline;
  /** Bildbreite/-höhe — JEDE Pose kann ihr eigenes Seitenverhältnis haben (unterschiedliche Silhouette),
   *  `baseScaleX` wird bei jedem Posenwechsel frisch aus diesem Wert × `figureHeight` abgeleitet. */
  aspect: number;
}
type PoseKey = "idle" | PoseName;
const POSE_NAMES: PoseName[] = ["windup", "strike", "hit"];

// ── 0.4.0-Arena, Logik-Welle 2 — Choreografie-Zustandstypen ───────────────────────────────────────
// Ein Angriffs-Zyklus durchläuft strikt windup → sprint → (Event löst Clash-FX aus, s.
// `resolveAttackCycle`) → hold → return, ODER windup → stagger → return bei Schock (Auftrag Punkt 7).
// "sprint" bedeutet beim Melee-Stil eine echte Positions-Bewegung des Angreifers; bei Ranged/Magie
// bleibt der Angreifer am Platz (Lehne), "sprint" markiert dort die Projektil-Flugphase (s.
// `updateAttackCycle`/`spawnOrAdvanceProjectile`) — dieselbe Phasen-Maschine trägt beide Stile ohne
// Verzweigung, nur die POSITIONS-INTERPRETATION unterscheidet sich je `style`.
type AttackPhase = "windup" | "sprint" | "hold" | "return" | "stagger";
type AttackOutcome = "hit" | "whiff" | "shockSkip";
type AttackStyle = "melee" | "ranged" | "magic";

interface AttackCycle {
  phase: AttackPhase;
  /** performance.now() beim Eintritt in die AKTUELLE Phase (Basis für Phasen-interne Fortschritts-Berechnung). */
  phaseStart: number;
  /** performance.now() beim Zyklus-START (windup-Beginn) — Basis der PRÄDIKTIVEN Fortschritts-Schätzung,
   *  s. `updateAttackCycle` "Auftrag Punkt 6". */
  cycleStart: number;
  /** true, sobald das ECHTE CombatEvent eingetroffen ist (Clash-FX ausgelöst) — vor `resolved` ist
   *  JEDE Positions-/Projektil-Berechnung reine Vorhersage aus `timerRemainingSec`, danach eine
   *  deterministische Phasen-Uhr ab `phaseStart` (kein Rate-Raten mehr nötig). */
  resolved: boolean;
  style: AttackStyle;
  crit: boolean;
  /** Richtung zum Gegner (+1/-1 entlang X) — beim Zyklus-Start eingefroren. */
  dir: 1 | -1;
  outcome: AttackOutcome;
  /** Ziel-X beim Melee-Sprint (Kontaktpunkt kurz vor dem Gegner) — bei Ranged/Magie === `homeX`
   *  (Angreifer bewegt sich nicht). */
  clashX: number;
  homeX: number;
  motion: MotionParams;
  /** Gedeckelte Vorhersage-Vorlaufzeit (ms) dieses Zyklus — s. `updateAttackCycle`. */
  predictWindow: number;
  /** Nur Ranged/Magie: ob das Projektil für DIESEN Zyklus bereits gespawnt wurde (verhindert
   *  Mehrfach-Spawns während der prädiktiven Annäherungs-Frames). */
  projectileSpawned: boolean;
}

/** Rückstoß (Knockback) ODER Ausweich-Sidestep — beide sind eine REAKTION auf ein fremdes Ereignis,
 *  strukturell unabhängig vom eigenen `attack`-Zyklus des Boards (ein Kämpfer kann mitten im eigenen
 *  Rückzug stehen UND gleichzeitig vom Gegner getroffen werden, s. Auftrag "Beide Seiten in ihrem
 *  echten Angriffs-Takt"). Additiv auf die `attack`-Positionsberechnung aufgeschlagen. */
interface ReactionCycle {
  start: number;
  duration: number;
  amp: number;
}

/** Reiner Weltraum-Bewegungs-Versatz, den EINE Choreografie-Phase für dieses Frame beisteuert —
 *  Breathing/Reaktionen/Einlauf/Dissolve kommen in `updateBoardVisual` additiv/exklusiv dazu, s.
 *  dortiges JSDoc. `tiltZRad` ist eine rein kosmetische Roll-Rotation (Vor-/Rücklehnen), NICHT die
 *  Billboard-Gier (die bleibt `Math.atan2`-Kamera-Tracking, unverändert seit Task #330c Punkt 6). */
interface PoseOffset {
  dx: number;
  dz: number;
  tiltZRad: number;
  scaleMult: number;
}
const REST_POSE: PoseOffset = { dx: 0, dz: 0, tiltZRad: 0, scaleMult: 1 };

interface Billboard {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  baseColor: THREE.Color;
  shadow: THREE.Mesh;
  /** Separat getypte Referenz auf `shadow.material` (Mesh.material ist generisch `Material |
   *  Material[]` typisiert — dieselbe Zwei-Felder-Strategie wie `material` oben für die Figur
   *  selbst) — Welle 2 braucht `.opacity` fürs Ein-/Ausblenden bei Einlauf/Dissolve. */
  shadowMaterial: THREE.MeshBasicMaterial;
  baseX: number;
  baseZ: number;
  /** Y-Korrektur (≤0, Weltraum-Einheiten) aus der gemessenen Alpha-Baseline — s. `measureSpriteBaseline`.
   *  0 bis die Textur geladen/vermessen ist (kein Sprung: Bild ist bis dahin ohnehin unsichtbar). */
  feetOffset: number;
  /** X-Korrektur (Weltraum-Einheiten) für den Schatten, falls die Fuß-Region nicht exakt unter der
   *  Bildmitte liegt (asymmetrische Pose). */
  footCenterOffsetX: number;
  /** Basis-Skalierung (Bild-Aspect × figureHeight) — Breathing/Knockback/Windup multiplizieren
   *  DARAUF, statt die Basis zu überschreiben (s. `applyTexture`). */
  baseScaleX: number;
  baseScaleY: number;
  flash: { start: number; duration: number; color: THREE.Color } | null;
  /** true = Bild/Wechsel ist der ALLERERSTE Mount (Kampfstart) statt eines Monsterwechsels — steuert
   *  nur die Einlauf-AMPLITUDE (Spieler: "dezent", s. `applyTexture`). */
  attack: AttackCycle | null;
  /** Zuletzt gesehener `timerRemainingSec`-Wert (ms) — Flanken-Erkennung fürs prädiktive Scharfstellen
   *  (steigend→fallend-Kreuzung unter `predictWindow`, s. `updateAttackCycle`). */
  lastRemainMs: number;
  knockback: ReactionCycle | null;
  dodge: ReactionCycle | null;
  entrance: { start: number; duration: number; fromX: number; toX: number; stepFreq: number; bobAmp: number } | null;
  /** Hält NACH Ablauf der Dissolve-Dauer weiter (Material bleibt ausgeblendet/entsättigt), bis
   *  `applyTexture` für dasselbe Board eine NEUE Textur lädt (s. dort "Auftrag Punkt 5 Kill"). */
  dying: { start: number; duration: number } | null;
  victory: { start: number; duration: number } | null;
  isPlayer: boolean;
  /** Deterministische Atem-Phasenverschiebung (s. choreography.ts `breathPhase`). */
  breathPhaseOffset: number;
  /** Zuletzt geladene Bild-URL — Wechsel (nach dem ersten Mount) triggert den Einlauf (Auftrag Punkt 1).
   *  Verglichen gegen `props.player/monster.imgSrc` JEDEN Frame (s. `frame()` "Bild-Wechsel
   *  erkennen") — das war die fehlende Konsumenten-Seite dieses Felds: bislang wurde `applyTexture`
   *  nur EINMAL synchron beim Mount aufgerufen, ein Monsterwechsel INNERHALB der gemounteten
   *  Komponente (Dungeon-Welle, andere Monster-Karte, Elite-Variante) lud nie eine neue Textur nach
   *  — Chef-Repro 04.08. ("Sprite-Wechsel zeigt altes Bild/verzerrte Skalierung weiter"). */
  lastImgSrc: string | null;
  /** Chef-Repro 04.08. ("Chicken: Textur erscheint nur beim Sterben ... intermittierend je Spawn"):
   *  Guard gegen das Fenster ZWISCHEN Board-Erzeugung und dem Ende des asynchronen Textur-Ladens
   *  (`TextureLoader.load`s Callback) — bis dahin trägt das Mesh weder die richtige Textur noch die
   *  aus der Baseline-Messung abgeleitete Skalierung/Fuß-Position. `false` ab JEDEM `applyTexture`-
   *  Aufruf (auch bei einem Monsterwechsel — die ALTE Textur darf nicht einfach stehen bleiben),
   *  `true` erst, wenn Textur UND Baseline-Messung beide fertig sind (s. `applyTexture`
   *  Callback-Ende). `updateBoardVisual` blendet das Board komplett aus (`mesh.visible = false`),
   *  solange dieses Flag `false` ist — "Billboard niemals rendern lassen bevor Textur+Baseline
   *  stehen, dann aber GARANTIERT nachziehen" (Chef-Auftrag wörtlich). */
  textureReady: boolean;
  /** Rollen-Basishöhe VOR der Gewichtsklassen-Skalierung (`PLAYER_FIGURE_HEIGHT`/`MONSTER_FIGURE_HEIGHT`,
   *  unverändert seit Task #330d) — `figureHeight` unten wird bei jedem `applyTexture`-Aufruf FRISCH
   *  aus diesem Wert × `MotionParams.sizeMult` neu berechnet (nicht kumulativ multipliziert), damit
   *  ein Monsterwechsel innerhalb eines Kampfes (Dungeon-Welle/Flucht+neuer Gegner) die Größe korrekt
   *  NEU auflöst statt sie fortlaufend zu verzerren. */
  roleBaseHeight: number;
  /** Task #330d Punkt 3 (Chef-Freigabe "Spielerkämpfer 2x so groß machen"): jedes Board trägt
   *  jetzt seine EIGENE Zielhöhe statt der gemeinsamen `FIGURE_HEIGHT`-Konstante — Spieler bekommt
   *  `PLAYER_FIGURE_HEIGHT`, Gegner bleibt bei `FIGURE_HEIGHT` ("Gegner-Skala unverändert"). Wird
   *  für Placeholder-/Texture-Scale, den Baseline-Fußoffset UND die Bar-/Floater-Ankerhöhe gebraucht
   *  (s. jeweilige Verwendungsstellen unten). Welle 2: zusätzlich mit `MotionParams.sizeMult`
   *  (Gewichtsklasse) multipliziert, s. `applyTexture`.
   */
  figureHeight: number;
  /** Welle 2: die volle Zeit-/Amplituden-Tabelle dieser Rolle (Spieler: `PLAYER_PARAMS`, Gegner:
   *  aus der aktuellen `hpMax` klassifiziert) — am Board gecacht bei jedem `applyTexture`-Aufruf,
   *  s. dortiges JSDoc. Startwert "medium", bevor die erste Textur geladen ist (kurzzeitig
   *  irrelevant, das Board ist in diesem Fenster ohnehin noch nicht animiert). */
  motion: MotionParams;
  // ── Idle-Wander (Auftrag Punkt 4) — s. choreography.ts `MotionParams.wanderRadius{X,Z}`-JSDoc
  //    für die Design-Begründung. `wanderX`/`wanderZ` sind der AKTUELLE, interpolierte Versatz
  //    (das, was `updateBoardVisual` tatsächlich auf `baseX`/`baseZ` addiert); `wanderFrom`/
  //    `wanderTarget` + `wanderStart`/`wanderDuration` beschreiben den laufenden Eased-Sprung
  //    zwischen zwei Wander-Wegpunkten (s. `updateWander`). ──────────────────────────────────────
  wanderX: number;
  wanderZ: number;
  wanderFrom: { x: number; z: number };
  wanderTarget: { x: number; z: number };
  wanderStart: number;
  wanderDuration: number;
  // ── Posen-Pilot (design/battle-040-pose-pilot.md) — s. `applyTexture`/`preloadPoseSet`/
  //    `computeActivePoseKey`/`applyActivePose` für die volle Ablauf-Begründung. ─────────────────
  /** Posen-Set für die AKTUELL geladene Idle-Textur dieses Boards (s. `poses.ts` `getPoseSet`) —
   *  `null`, solange kein einziges Posen-Bild für diese Identität existiert (Fallback-Gesetz: Board
   *  bleibt dann exakt beim heutigen Einzel-Sprite-Verhalten, nie ein Teil-Swap). */
  poseSet: PoseSet | null;
  /** Vorgeladene Textur+Baseline+Aspect je Pose — wird ERST befüllt, wenn ALLE DREI (windup/strike/
   *  hit) fertig geladen sind (s. `posesReady`), nie ein Teilzustand. */
  poseTextures: Partial<Record<PoseName, PoseTextureEntry>>;
  /** true erst, wenn `poseSet` vollständig UND alle drei Posen-Texturen+Baselines geladen sind —
   *  bis dahin bleibt das Board strikt bei der Idle-Textur (dasselbe "nie eine ungeladene Textur auf
   *  ein sichtbares Billboard"-Prinzip wie `textureReady`, nur fürs Posen-Set). */
  posesReady: boolean;
  /** Idle-Textur + eigene Baseline/Aspect als EIGENER Slot (nicht nur `material.map`) — erlaubt einen
   *  harten Rück-Swap zu "idle" jederzeit, ohne die Textur erneut zu laden. */
  idlePose: PoseTextureEntry | null;
  /** Zuletzt tatsächlich AUFGETRAGENE Pose (nicht nur berechnete) — `applyActivePose` swapped nur bei
   *  einer echten Änderung, s. dort. Auch das QA-Anker-Attribut `a25Pose{Player,Monster}` spiegelt
   *  diesen Wert. */
  activePoseKey: PoseKey;
  /** performance.now()-Deadline (0 = inaktiv): bis wann die "strike"-Pose gilt — gesetzt bei JEDEM
   *  Kontakt-Event für den ANGREIFER (unabhängig von Hit/Miss, "der Angreifer schwingt trotzdem"),
   *  s. `resolveAttackContact`. Feste Wall-Clock-Dauer (`POSE_STRIKE_MS`), NICHT an die variable
   *  hold/return-Phasendauer gekoppelt. */
  strikePoseUntil: number;
  /** Dieselbe Deadline-Mechanik für die "hit"-Pose des VERTEIDIGERS — NUR beim Ausgang "hit" gesetzt
   *  (kausal am tatsächlichen Kontakt, exakt wie `knockback`, s. `resolveAttackContact`). */
  hitPoseUntil: number;
}

function makeBillboard(baseX: number, baseZ: number, figureHeight: number, isPlayer: boolean): Billboard {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0); // Pivot am Fuß der Figur (steht auf dem Boden bei y=0)
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(figureHeight * 0.72, figureHeight, 1);
  mesh.position.set(baseX, 0, baseZ);
  // Chef-Repro 04.08. ("Textur erscheint nur beim Sterben"): unsichtbar bis `applyTexture`s
  // Callback Textur+Baseline fertig aufgelöst hat (s. `textureReady`-JSDoc) — verhindert selbst den
  // EINEN Frame Placeholder-Weiß/Platzhalterfarbe des synchronen Priming-Renders vor dem ersten
  // rAF-Tick.
  mesh.visible = false;

  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: makeShadowTexture(),
    transparent: true,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.scale.set(1.15, 1, 0.55);
  shadow.position.set(baseX, 0.01, baseZ);
  shadow.visible = false; // s. mesh.visible-Kommentar oben — Figur+Schatten blenden gemeinsam ein.

  return {
    mesh,
    material,
    baseColor: new THREE.Color(0xffffff),
    shadow,
    shadowMaterial: shadowMat,
    baseX,
    baseZ,
    feetOffset: 0,
    footCenterOffsetX: 0,
    baseScaleX: figureHeight * 0.72,
    baseScaleY: figureHeight,
    flash: null,
    attack: null,
    lastRemainMs: Infinity,
    knockback: null,
    dodge: null,
    entrance: null,
    dying: null,
    victory: null,
    isPlayer,
    breathPhaseOffset: computeBreathPhase(baseX),
    lastImgSrc: null,
    textureReady: false,
    roleBaseHeight: figureHeight,
    figureHeight,
    motion: isPlayer ? PLAYER_PARAMS : WEIGHT_PARAMS.medium,
    wanderX: 0,
    wanderZ: 0,
    wanderFrom: { x: 0, z: 0 },
    wanderTarget: { x: 0, z: 0 },
    wanderStart: 0,
    wanderDuration: 1,
    poseSet: null,
    poseTextures: {},
    posesReady: false,
    idlePose: null,
    activePoseKey: "idle",
    strikePoseUntil: 0,
    hitPoseUntil: 0,
  };
}

// ── 0.4.0-Arena, Posen-Pilot — Vorladen + Auswahl + harter Swap ─────────────────────────────────
/** Lädt alle vorhandenen Posen EINER Identität VOR (Auftrag Punkt 3: "Alle Posen-Texturen beim
 *  Kampfstart vorladen") — committet `board.poseTextures`/`board.posesReady` ERST, wenn ALLE DREI
 *  (windup/strike/hit) fertig UND erfolgreich geladen sind (Fallback-Gesetz: "Fehlt eine Pose oder
 *  das ganze Set ⇒ Fallback auf den Einzel-Sprite" — ein Teilzustand wird NIE aktiv genutzt, s.
 *  `computeActivePoseKey`s `posesReady`-Gate). Baut das Ergebnis in einer LOKALEN Tabelle und
 *  committet erst am Ende, UND nur, falls `board.poseSet` inzwischen nicht durch einen weiteren
 *  Texturwechsel ersetzt wurde (derselbe Race-Schutz-Gedanke wie an jeder anderen
 *  `TextureLoader`-Callback-Stelle dieses Moduls — hier explizit geprüft, weil ein verspäteter
 *  Callback sonst `poseTextures` eines inzwischen längst anderen Monsters überschreiben könnte). */
function preloadPoseSet(board: Billboard, poseSet: PoseSet): void {
  const entries: Partial<Record<PoseName, PoseTextureEntry>> = {};
  let pending = POSE_NAMES.length;
  let failed = false;
  const settle = (): void => {
    pending -= 1;
    if (pending > 0) return;
    if (failed || board.poseSet !== poseSet) return; // unvollständig oder stale — Board bleibt idle-only.
    board.poseTextures = entries;
    board.posesReady = POSE_NAMES.every((name) => !!entries[name]);
  };
  for (const name of POSE_NAMES) {
    const url = poseSet[name];
    if (!url) {
      failed = true;
      settle();
      continue;
    }
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image as HTMLImageElement | undefined;
        if (img?.width && img.height) {
          entries[name] = { texture: tex, baseline: measureSpriteBaseline(img, url), aspect: img.width / img.height };
        } else {
          failed = true;
        }
        settle();
      },
      undefined,
      () => {
        failed = true;
        settle();
      },
    );
  }
}

/** Welche Pose JETZT gelten soll — reine Berechnung (keine Mutation). Präzedenz "hit" > "strike" >
 *  "windup" > "idle" (ein Board kann rein theoretisch gleichzeitig treffen UND selbst einen neuen
 *  Angriff anwinden, s. `Billboard.strikePoseUntil`/`hitPoseUntil`-JSDoc) — "getroffen werden" liest
 *  sich als das dringlichere visuelle Signal. Liefert IMMER "idle", solange `posesReady` nicht steht
 *  (Fallback-Gesetz) — Aufrufer müssen dieses Gate nicht separat prüfen. */
function computeActivePoseKey(board: Billboard, now: number): PoseKey {
  if (!board.posesReady) return "idle";
  if (board.hitPoseUntil > now) return "hit";
  if (board.strikePoseUntil > now) return "strike";
  if (board.attack && !board.attack.resolved) return "windup";
  return "idle";
}

/** Harter Textur-Swap — KEIN Crossfade (Auftrag, bindend: "Posenwechsel exakt am Choreographie-
 *  Event ... kein zweites Plane-Material, kein Opacity-Blending", dieselbe alphaTest-Cutout-Falle
 *  wie beim unsichtbaren-Chicken-Bug). Läuft nur bei einer ECHTEN Schlüssel-Änderung (kein
 *  redundantes Neu-Setzen pro Frame). Skalierung/Fuß-Offset/Schatten-Ellipse werden bei jedem
 *  Wechsel aus der `PoseTextureEntry` der neuen Pose neu abgeleitet — dieselbe Formel wie
 *  `applyTexture` für die Idle-Textur (Faktor 0.92/0.38 dort wörtlich gespiegelt, s. Kommentar
 *  dort für die Chef-Feedback-Herleitung dieser beiden Werte). */
function applyActivePose(board: Billboard, poseKey: PoseKey): void {
  if (poseKey === board.activePoseKey) return;
  const entry = poseKey === "idle" ? board.idlePose : (board.poseTextures[poseKey] ?? null);
  if (!entry) return; // sollte dank posesReady-Gate nie eintreten — defensiv trotzdem kein Absturz.
  board.activePoseKey = poseKey;
  board.material.map = entry.texture;
  board.material.needsUpdate = true;
  board.baseScaleX = board.figureHeight * entry.aspect;
  board.baseScaleY = board.figureHeight;
  board.feetOffset = -entry.baseline.insetFrac * board.figureHeight;
  board.footCenterOffsetX = (entry.baseline.footCenterFrac - 0.5) * board.baseScaleX;
  const shadowWidth = board.baseScaleX * entry.baseline.footSpanFrac * 0.92;
  board.shadow.scale.set(shadowWidth, 1, shadowWidth * 0.38);
}

// ── 0.4.0-Arena Welle 1, Auftrag Punkt 2 ("Prop-Billboard-Layer") ──────────────────────────────
/** Ein statisches, rein dekoratives Prop-Billboard aus einem Manifest-Eintrag — strukturelles
 *  Geschwister von `Billboard`, aber ohne Lunge/Flash/Hit-Nonce (Props bewegen sich nie) und ohne
 *  eigenen Nameplate-/Floater-Anker. `pointer-events` sind hier kein Thema (WebGL-Canvas hat
 *  ohnehin keine DOM-Klickziele pro Objekt) — "keine Klickziele" (Auftrag Punkt 2) ist damit
 *  automatisch erfüllt, ohne einen Handler extra zu unterlassen. */
interface PropInstance {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  shadow: THREE.Mesh;
}

/** Gemeinsame Größen-/Positionslogik für Fern- (Bild geladen) und Sofort-Pfad (Platzhalter) —
 *  identische Formeln wie `applyTexture` für die Kämpfer-Billboards (Baseline-Fußoffset,
 *  Fuß-Zentrum-Offset, Kontaktschatten-Ellipse), nur ohne die Lunge-/Hit-Felder, die Props nicht
 *  besitzen. `def.flip` spiegelt per negativer X-Skalierung (billige Varianz ohne Zweit-Asset). */
function applyPropVisual(
  mesh: THREE.Mesh,
  shadow: THREE.Mesh,
  def: ZoneManifestProp,
  propHeight: number,
  aspect: number,
  baseline: { insetFrac: number; footSpanFrac: number; footCenterFrac: number },
): void {
  const baseWidth = propHeight * aspect;
  mesh.scale.set(def.flip ? -baseWidth : baseWidth, propHeight, 1);
  const feetOffset = -baseline.insetFrac * propHeight;
  const footCenterOffsetX = (baseline.footCenterFrac - 0.5) * baseWidth;
  mesh.position.set(def.x + footCenterOffsetX, feetOffset, def.z);
  const shadowWidth = baseWidth * baseline.footSpanFrac * 1.15;
  shadow.scale.set(shadowWidth, 1, shadowWidth * 0.42);
  shadow.position.set(def.x + footCenterOffsetX, 0.01, def.z);
}

/**
 * Baut EIN Prop-Billboard. Tiefensortierung MIT den Kämpfern (Auftrag Punkt 2, "Props zwischen/
 * hinter Kämpfern korrekt verdeckt") ist GRATIS: dieselbe alphaTest-Cutout-Strategie wie die
 * Kämpfer-Billboards (`transparent:true, alphaTest:0.35`, Depth-Write bleibt Default-`true`) lässt
 * den normalen WebGL-Z-Buffer korrekt zwischen Props/Kämpfern/Boden sortieren — kein manuelles
 * `renderOrder`, keine Sortierung nach Kamera-Distanz nötig (s. Abschlussbericht Screenshot-Beweis
 * "b" für die Gegenprobe). Billboard-Rotation (Y-Gier Richtung Kamera, wie die Kämpfer) wird
 * EINMALIG bei Aufbau aus der (zu diesem Zeitpunkt bereits final positionierten) Kamera berechnet,
 * NICHT pro Frame nachgeführt — Props bewegen sich nie, und die einzige Kamerabewegung (dezenter
 * Idle-Sinus-Drift, s. `fxMotion`-Block im Frame-Loop) ist so klein, dass eine Neuberechnung pro
 * Frame keinen sichtbaren Unterschied machen würde, nur unnötige `atan2`-Aufrufe im Kampf-Tick.
 */
function makePropInstance(def: ZoneManifestProp, camera: THREE.Camera): PropInstance {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0); // Pivot am Fuß, wie bei den Kämpfer-Billboards
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const dxCam = camera.position.x - def.x;
  const dzCam = camera.position.z - def.z;
  mesh.rotation.set(0, Math.atan2(dxCam, dzCam), 0);

  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);

  const propHeight = PROP_BASE_HEIGHT * def.scale;
  const resolvedUrl = resolveArenaAssetUrl(def.file);
  if (resolvedUrl) {
    new THREE.TextureLoader().load(resolvedUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      material.map = tex;
      material.needsUpdate = true;
      const img = tex.image as HTMLImageElement | undefined;
      if (img?.width && img.height) {
        const aspect = img.width / img.height;
        const baseline = measureSpriteBaseline(img, resolvedUrl);
        applyPropVisual(mesh, shadow, def, propHeight, aspect, baseline);
      }
    });
  } else {
    // Mira-Datei noch nicht geliefert (Auto-Discovery-Treffer 0) — prozedurale Silhouette statt
    // eines fehlenden/kaputten Bildes, s. assets.ts Modul-JSDoc Punkt 2 + TODO-Marker im Manifest.
    const placeholder = makePlaceholderPropTexture(def.placeholderKind ?? "bush");
    material.map = placeholder.texture;
    material.needsUpdate = true;
    applyPropVisual(mesh, shadow, def, propHeight, placeholder.aspect, placeholder);
  }

  return { mesh, material, shadow };
}

/** Kleine, budgetierte Funken-Burst-Partikelwolke (ein einziges Points-System für BEIDE Seiten,
 *  Slots werden round-robin recycelt — dasselbe Pool-Prinzip wie FX_POOL_SIZE im 2D-System,
 *  s. CombatPage.tsx). Tote Partikel werden weit unter den Boden geparkt (unsichtbar, kein
 *  Alpha-Fade nötig) statt einzeln aus dem Buffer entfernt zu werden. */
const SPARK_COUNT = 30;
interface SparkPool {
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array[];
  life: number[];
  next: number;
}
function makeSparkPool(): SparkPool {
  const positions = new Float32Array(SPARK_COUNT * 3);
  const velocities: Float32Array[] = [];
  const life: number[] = [];
  for (let i = 0; i < SPARK_COUNT; i++) {
    positions[i * 3 + 1] = -50; // geparkt
    velocities.push(new Float32Array(3));
    life.push(0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffcf87,
    size: 0.07,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  return { points, positions, velocities, life, next: 0 };
}
function spawnSparks(pool: SparkPool, origin: THREE.Vector3, count: number): void {
  for (let i = 0; i < count; i++) {
    const idx = pool.next % SPARK_COUNT;
    pool.next += 1;
    const ang = Math.random() * Math.PI * 2;
    const speed = 0.9 + Math.random() * 1.4;
    pool.positions[idx * 3] = origin.x + (Math.random() - 0.5) * 0.15;
    pool.positions[idx * 3 + 1] = origin.y + (Math.random() - 0.5) * 0.15;
    pool.positions[idx * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.15;
    pool.velocities[idx]![0] = Math.cos(ang) * speed;
    pool.velocities[idx]![1] = 0.6 + Math.random() * 1.1;
    pool.velocities[idx]![2] = Math.sin(ang) * speed * 0.4;
    pool.life[idx] = 0.32 + Math.random() * 0.18;
  }
}
function updateSparks(pool: SparkPool, dt: number): void {
  let dirty = false;
  for (let i = 0; i < SPARK_COUNT; i++) {
    if (pool.life[i]! <= 0) continue;
    dirty = true;
    pool.life[i]! -= dt;
    const v = pool.velocities[i]!;
    v[1]! -= dt * 2.4; // Schwerkraft
    pool.positions[i * 3] = pool.positions[i * 3]! + v[0]! * dt;
    pool.positions[i * 3 + 1] = pool.positions[i * 3 + 1]! + v[1]! * dt;
    pool.positions[i * 3 + 2] = pool.positions[i * 3 + 2]! + v[2]! * dt;
    if (pool.life[i]! <= 0) pool.positions[i * 3 + 1] = -50; // parken
  }
  if (dirty) pool.points.geometry.attributes.position!.needsUpdate = true;
}

function worldToScreen(v: THREE.Vector3, camera: THREE.Camera, width: number, height: number): { x: number; y: number } {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height };
}

/** Reine Darstellungs-Kopie von Bar() aus CombatPage.tsx (s. Modul-JSDoc "kein Export nötig") —
 *  identische Klassen (`.cbar`/`.cbar-fill`/`.cbar-label`), damit combat.css sie 1:1 stylt.
 *  Task #330d Punkt 6: `label` nimmt jetzt auch reinen Text an (Angriffstimer-Label ist ein
 *  String, `${sekunden}s`, s. 2D-`Bar()`-Pendant, das dieselbe Union akzeptiert). */
function MiniBar({ pct, kind, label }: { pct: number; kind: string; label: JSX.Element | string }): JSX.Element {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className={`cbar cbar-${kind.split(" ")[0]}`}>
      <div className={`cbar-fill ${kind}`} style={{ transform: `scaleX(${clamped / 100})` }} />
      <span className="cbar-label">{label}</span>
    </div>
  );
}

/**
 * Task #330d Punkt 7 (Chef-Nachtrag "Status-Effekte auf Gegnern fehlt auch"): Darstellungs-Kopie
 * des `.fighter-effects-overlay`-Zweigs aus CombatPage.tsx' `Fighter()` — dieselbe Icon-Quelle
 * (`renderEffectIcon`) und derselbe i18n-Tooltip-Text (`status.<type>`/`status.<type>.desc`,
 * BEREITS existierende Keys der 2D-Ansicht, s. Sperrzone-Notiz "i18n gar nicht" — hier wird KEIN
 * neuer Key angelegt, nur ein vorhandener über den ganz normalen `useI18n()`-Hook gelesen). Anders
 * als das 2D-Original (eigenes Eck-Overlay oben rechts AN der Figur, s. dortiges "Ecken-Disziplin"-
 * JSDoc) sitzt die Reihe hier INNERHALB derselben schwebenden Karte wie HP/Mana/Ward/Timer — die
 * 3D-Szene hat nur einen einzigen projizierten Anker pro Kämpfer (s. Modul-JSDoc "Architektur"),
 * ein zweiter Eck-Anker wäre ein eigener Projektions-/Anker-Ref-Satz für einen reinen Polish-Fall.
 * `.effect-badge` selbst (Chip-Optik: Hintergrund/Rahmen/Radius) ist dieselbe globale Klasse aus
 * combat.css — nur der positionierende `.fighter-effects-overlay`-Wrapper wird NICHT wiederverwendet
 * (der ist auf absolute Positionierung relativ zu `.fighter` zugeschnitten, passt nicht in den
 * Karten-Fluss hier), s. `.a25-status-row` in styles.ts für den schlanken Ersatz-Wrapper.
 */
function StatusEffectRow({ effects, t }: { effects: StatusEffect[]; t: (key: string) => string }): JSX.Element | null {
  if (effects.length === 0) return null;
  return (
    <div className="a25-status-row">
      {effects.map((e, i) => (
        <span
          key={i}
          className="effect-badge"
          title={`${t(`status.${e.type}`)} — ${t(`status.${e.type}.desc`)} (${Math.ceil(e.remainingMs / 1000)}s)`}
        >
          {renderEffectIcon(e.type)} {Math.ceil(e.remainingMs / 1000)}s
        </span>
      ))}
    </div>
  );
}

function NameplateOverlay({ fighter, hpKind, dimmed }: { fighter: Arena25DFighter; hpKind: string; dimmed?: boolean }): JSX.Element {
  const { t } = useI18n();
  const showMana = (fighter.manaMax ?? 0) > 0;
  const manaEmpty = showMana && (fighter.manaCur ?? 0) === 0;
  const showWard = (fighter.wardMax ?? 0) > 0;
  return (
    <div className={dimmed ? "a25-dimmed" : undefined}>
      <div className="a25-bar-card">
        <div className="a25-bar-name">
          {fighter.name}
          {fighter.level !== undefined && <span className="fighter-level-badge">{fighter.level}</span>}
        </div>
        {fighter.effects && <StatusEffectRow effects={fighter.effects} t={t} />}
        <MiniBar
          pct={(fighter.hpCur / Math.max(1, fighter.hpMax)) * 100}
          kind={hpKind}
          label={<>{statIcon("hp")} {formatNum(Math.max(0, Math.round(fighter.hpCur)))} / {formatStat(fighter.hpMax)}</>}
        />
        {showMana && (
          <MiniBar
            pct={((fighter.manaCur ?? 0) / (fighter.manaMax ?? 1)) * 100}
            kind={manaEmpty ? "mana depleted" : "mana"}
            label={
              <span className={manaEmpty ? "cbar-label-dim" : undefined}>
                ✦ {formatNum(Math.round(fighter.manaCur ?? 0))} / {formatStat(fighter.manaMax ?? 0)}
              </span>
            }
          />
        )}
        {showWard && (
          <MiniBar
            pct={((fighter.wardCur ?? 0) / (fighter.wardMax ?? 1)) * 100}
            kind="ward"
            label={<>{statIcon("ward")} {formatNum(Math.round(fighter.wardCur ?? 0))} / {formatStat(fighter.wardMax ?? 0)}</>}
          />
        )}
        <MiniBar pct={fighter.timerPct} kind="timer" label={`${formatSeconds1(Math.max(0, fighter.timerRemainingSec))}s`} />
      </div>
    </div>
  );
}

// Task #330c Punkt 5 ("Kampfeffekte ... Damage, Heilung usw."): 1:1-Darstellungs-Kopie der
// `.floaters`-Rendering-Zweige aus CombatPage.tsx' `Fighter()` (gleiche globale `.dmg-number`-
// Klassen aus combat.css, s. Moduldoc "kein Export nötig" bei NameplateOverlay für dasselbe Muster)
// — NUR Anzeige, liest ausschließlich die von CombatPage vorbefüllten `floaters`-Props, KEIN
// Engine-Zugriff. Der Quell-Icon-Zweig (Trank/Food-Item-Bild) ist bewusst schlanker als das 2D-
// Original (kein `content.items`-Namens-Lookup nötig, nur das Bild) — reicht für den Prototyp.
const ARENA_HEAL_SOURCE_EMOJI: Record<string, string> = { lifesteal: "🩸", kill: "💀", effect: "✨" };

function floaterHealIcon(source: CombatEvent["source"], itemId?: string): JSX.Element | string | null {
  if (!source) return null;
  if ((source === "potion" || source === "food") && itemId) {
    const img = getItemImage(itemId);
    if (img) return <img loading="lazy" decoding="async" src={img} alt="" className="heal-source-icon-img pixelart" />;
    return source === "potion" ? "🧪" : "🍖";
  }
  if (source === "ward") return statIcon("ward");
  // "meleeLifesteal" (E+-Paket §E+, Stil-Lebensraub des Nahkampfs) teilt das Lebensraub-Icon.
  if (source === "lifesteal" || source === "meleeLifesteal") return renderEffectIcon("bleed");
  return ARENA_HEAL_SOURCE_EMOJI[source] ?? "✨";
}

function FloaterList({ floaters }: { floaters: Arena25DFloaterInput[] }): JSX.Element {
  return (
    <div className="floaters">
      {floaters.map((f) => {
        if (f.proc) {
          return (
            <span key={f.id} className="dmg-number proc" style={{ left: `calc(50% + ${f.x}px)` }}>
              <span className="dmg-dot-icon">{renderEffectIcon(f.status ?? "bleed")}</span>
              {f.label}
            </span>
          );
        }
        if (f.wardAbsorb) {
          return (
            <span
              key={f.id}
              className={`dmg-number dot ward-absorb${f.label ? " ward-absorb-full" : ""}`}
              style={{ left: `calc(50% + ${f.x}px)` }}
            >
              <span className="dmg-dot-icon">{statIcon("ward")}</span>
              {f.label ?? `-${formatStat(f.amount)}`}
            </span>
          );
        }
        if (f.lifesteal) {
          return (
            <span key={f.id} className="dmg-number dot lifesteal" style={{ left: `calc(50% + ${f.x}px)` }}>
              <span className="dmg-dot-icon">{renderEffectIcon(f.status ?? "bleed")}</span>
              +{formatStat(f.amount)}
            </span>
          );
        }
        if (f.dot) {
          return (
            <span key={f.id} className={`dmg-number dot dot-${f.status ?? "burn"}`} style={{ left: `calc(50% + ${f.x}px)` }}>
              <span className="dmg-dot-icon">{renderEffectIcon(f.status ?? "burn")}</span>
              {formatStat(f.amount)}
            </span>
          );
        }
        if (f.xp) {
          return (
            <span key={f.id} className="dmg-number xp-drop" style={{ left: `calc(50% + ${f.x}px)` }}>
              +{f.amount} XP
            </span>
          );
        }
        if (f.miss) {
          return (
            <span key={f.id} className="dmg-number miss" style={{ left: `calc(50% + ${f.x}px)` }}>
              0
            </span>
          );
        }
        const cls = f.heal ? "dmg-number heal" : f.crit ? "dmg-number crit" : f.magic ? "dmg-number magic" : "dmg-number";
        const healIcon = f.heal ? floaterHealIcon(f.healSource, f.healItemId) : null;
        return (
          <span key={f.id} className={cls} style={{ left: `calc(50% + ${f.x}px)` }}>
            {healIcon && <span className="heal-source-icon">{healIcon}</span>}
            {f.heal ? `+${formatStat(f.amount)}` : `${f.amount}${f.crit ? "!" : ""}`}
          </span>
        );
      })}
    </div>
  );
}

export function Arena25DStage(props: Arena25DStageProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerAnchorRef = useRef<HTMLDivElement | null>(null);
  const monsterAnchorRef = useRef<HTMLDivElement | null>(null);
  const playerFloaterAnchorRef = useRef<HTMLDivElement | null>(null);
  const monsterFloaterAnchorRef = useRef<HTMLDivElement | null>(null);

  // Live-Props für den rAF-Loop — s. Modul-JSDoc "Architektur". Plain-Zuweisung im Render-Body
  // (kein Effect nötig, reiner Ref-Schreibvorgang löst nichts aus).
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
    } catch {
      // Kein WebGL (kaputte/uralte GPU-Treiber) — stiller Verzicht statt Crash, identisch zu
      // AmbientCanvas.tsx. Der Mount-Switch bleibt aktiv, die Szene rendert dann einfach nie
      // etwas — akzeptabel für einen Chef-Prototyp (kein Spieler sieht diesen Zweig je).
      return;
    }
    // 0.4.0-Arena Welle 1: Manifest EINMAL pro Effect-Durchlauf auflösen (Effect hängt jetzt an
    // `props.zoneId`, s. Deps am Ende dieser Komponente — ein Zonenwechsel baut die komplette
    // Szene neu auf). `FALLBACK_MANIFEST` sollte praktisch nie greifen (s. dortiges JSDoc).
    const manifest = getZoneManifest(props.zoneId) ?? FALLBACK_MANIFEST;
    if (manifest === FALLBACK_MANIFEST) {
      // eslint-disable-next-line no-console
      console.error(
        `[arena25d] Arena25DStage ohne gültiges Manifest für Zone "${props.zoneId}" gemountet — ` +
          `sollte durch isArena25dActive()/isZoneArenaCapable() bereits ausgeschlossen sein. Nutze Pastures-Fallback-Werte.`,
      );
    }
    // Warmer, dem Backdrop-Horizont angeglichener Ton statt des alten Fast-Schwarz — Task #330b-
    // Nachtrag (Chef-Feedback "Boden/Kulisse wirken wie zwei verschiedene Orte"). Greift nur an
    // Kanten/Lücken (die Backdrop-Plane deckt den Frame normalerweise voll ab), macht diese aber
    // im Zweifel zu einer plausiblen Dunst-Fortsetzung statt einem harten Schwarz-Rand.
    renderer.setClearColor(0x241e15, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    // Task #330d Punkt 2 (Chef-Zitat "wir haben einen komischen Nebelschleier bei der Naht von
    // Boden zur Wand, den bitte entfernen ... Fog ganz raus oder so weit nach hinten, dass er
    // unsichtbar ist"): DAMALS komplett entfernt (war #330c: Fog 0x241e15, 13..26 als Tiefen-Cue).
    // 0.4.0-Arena Welle 1: Nebel ist jetzt ein Zonen-Manifest-Wert (`lighting.fogDensity`,
    // `THREE.FogExp2` statt der alten linearen `Fog` — blendet weich über die GESAMTE Tiefe statt
    // eines harten Nah/Fern-Bandes, s. `manifest.ts` JSDoc). Pastures bleibt bei `fogDensity: 0`
    // (0-Effekt = exakt der von #330d abgenommene Zustand, KEINE Regression) — andere, düsterere
    // Zonen (Crypt/Slagpit, Chef-Pilot-Dreier laut design/battle-040-arena-produktion.md §4) können
    // das Feld ohne Codeänderung hochdrehen. Die Kulisse bleibt bewusst `fog:false` (s. `bgMat`
    // unten, unverändert aus #330b) — sie ist eine fertig gemalte Fläche wie eine Skybox, nicht Teil
    // der neblig zu machenden "Welt"; das war vermutlich die eigentliche Ursache der #330d-Naht
    // (Boden neblig, Kulisse nicht ⇒ sichtbarer Ton-Sprung genau an der Grenze).
    scene.fog =
      manifest.lighting.fogDensity > 0 ? new THREE.FogExp2(new THREE.Color(manifest.lighting.fogColor).getHex(), manifest.lighting.fogDensity) : null;
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
    camera.position.set(0, CAMERA_Y, CAMERA_Z);
    camera.lookAt(0, CAMERA_LOOKAT_Y, CAMERA_LOOKAT_Z);

    // ── Licht (Task #330c Punkt 4, Chef: "mir fehlt eine Lichtquelle, eine künstliche warme
    //    Sonne"; Task #330d Punkt 4, Chef-Zitat: "Sonnenlichtquelle von uns aus kommen, dass die
    //    PNGs von vorne belichtet werden"; 0.4.0-Arena Welle 1: Werte kommen jetzt aus dem Zonen-
    //    Manifest statt Hartcodierung, s. `deriveSunOffset`/`FALLBACK_MANIFEST` oben) ───────────
    // Warum #330c silhouettenhaft wirkte: die Kämpfer sind ZYLINDRISCHE Billboards, deren Normale
    // horizontal IMMER exakt zur Kamera zeigt (s. `Math.atan2`-Billboarding im Frame-Loop unten) —
    // eine flache Fläche mit konstanter Normale hat KEINE Selbstverschattung, ihre Helligkeit ist
    // rein `N·L`. Ein Azimut nah an 180° (Sonne hinter der Kulisse) würde denselben Silhouetten-
    // Effekt reproduzieren — s. `sunAzimuthDeg`-JSDoc in manifest.ts ("vermeiden"), reine Designer-
    // Verantwortung im Manifest, keine Code-Guard (ein bewusst dramatisches Gegenlicht ist ein
    // legitimer Stimmungs-Fall, kein Bug). Pastures' Werte (`sunAngleDeg:46, sunAzimuthDeg:26`)
    // reproduzieren exakt die alte Task-#330d-Abnahme (`N·L`≈0,55-0,63 auf den Billboards,
    // `N·L`≈0,7 auf der Boden-Normalen) — s. `SUN_DISTANCE`-JSDoc für die Rückrechnung.
    const sun = new THREE.DirectionalLight(new THREE.Color(manifest.lighting.sunColor), manifest.lighting.sunIntensity);
    const sunTarget = new THREE.Vector3(0, 1.1, FLOOR_CENTER_Z);
    sun.position.copy(sunTarget).add(deriveSunOffset(manifest.lighting.sunAngleDeg, manifest.lighting.sunAzimuthDeg));
    sun.target.position.copy(sunTarget);
    scene.add(sun, sun.target);
    const fill = new THREE.HemisphereLight(new THREE.Color(manifest.lighting.ambientColor), FILL_GROUND_COLOR, manifest.lighting.ambientIntensity);
    scene.add(fill);
    // Kleine warme Sonnenscheibe/Glow (Punkt 4, "optional ... wenn billig machbar") — additiv
    // geblendetes Sprite, hoch am Himmel rechts, deutlich NÄHER an der Kamera als die Kulisse
    // (BACKDROP_Z + Marge) — sitzt so immer sichtbar VOR der gebogenen Backdrop-Wand (Punkt 2),
    // statt von ihr verdeckt zu werden. 0.4.0-Arena §2 Asset-Vertrag nennt EIN wiederverwendbares
    // `arena_sun_glow.webp`-Sprite über alle Zonen — Auto-Discovery-Versuch zuerst, Fallback auf
    // die bestehende prozedurale Canvas-Textur (Task #330c), solange Mira es nicht geliefert hat.
    // Tint kommt jetzt aus `sunColor` (statt hartkodiertem `0xffe3b0`) — der Glow soll je Zone
    // dieselbe Sonnenfarbe tragen wie das eigentliche Licht (glühend-orange in Slagpit etc.).
    const sunGlowUrl = resolveArenaAssetUrl("arena_sun_glow.webp");
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sunGlowUrl ? new THREE.TextureLoader().load(sunGlowUrl) : makeSunGlowTexture(),
        color: new THREE.Color(manifest.lighting.sunColor),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    sunGlow.scale.set(4.2, 4.2, 1);
    sunGlow.position.set(5.8, 7.6, BACKDROP_Z + 2.6);
    scene.add(sunGlow);
    const flicker = new THREE.PointLight(0xffb060, 0, 9, 2);
    flicker.position.set(0, 2.2, 2.6);
    scene.add(flicker);

    // 0.4.0-Arena Welle 1, Auftrag Punkt 3 ("Farb-Grade so BILLIG wie möglich ... CSS-`filter` auf
    // dem Canvas-Element"): EINMAL pro Zonen-Mount gesetzt (kein Post-Processing-Pass, keine
    // Pro-Frame-Kosten), s. `buildGradeFilter`-JSDoc oben für die Begründung/Grenzen der Näherung.
    canvas.style.filter = buildGradeFilter(manifest.lighting.grade);

    // ── Raum aus den Arena-Texturen des Zonen-Manifests (0.4.0-Arena Welle 1 — Auflösung inkl.
    //    Mira-Auto-Discovery + Legacy-Fallback s. assets.ts `resolveArenaAssetUrl`) ─────────────
    // Boden: Task #330c Punkt 3 (Chef-Vorgabe explizit "STRETCHEN statt kacheln") — die Textur
    // wird EINMAL über die komplette Fläche gespannt (UV 0..1, ClampToEdge, kein Repeat mehr).
    const groundUrl = resolveArenaAssetUrl(manifest.ground);
    if (!groundUrl) {
      // Sollte durch `isZoneArenaCapable` (assets.ts) bereits ausgeschlossen sein — defensiv statt
      // eines Crashs: Boden bleibt ein einfarbiges Material (s. `floorMat` unten, `map: undefined`).
      // eslint-disable-next-line no-console
      console.error(`[arena25d] Boden-Textur "${manifest.ground}" für Zone "${manifest.zoneId}" nicht auflösbar.`);
    }
    const groundTex = groundUrl ? new THREE.TextureLoader().load(groundUrl) : null;
    if (groundTex) {
      groundTex.colorSpace = THREE.SRGBColorSpace;
      groundTex.wrapS = THREE.ClampToEdgeWrapping;
      groundTex.wrapT = THREE.ClampToEdgeWrapping;
      groundTex.repeat.set(1, 1);
      groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const floorGeo = new THREE.PlaneGeometry(GROUND_WORLD_WIDTH, GROUND_WORLD_DEPTH);
    floorGeo.rotateX(-Math.PI / 2);
    // Task #330c: `emissiveIntensity` deutlich reduziert ggü. #330b (0.75→0.3) — mit echtem
    // Sonnen-/Hemisphere-Licht (s.o.) übernimmt jetzt die Beleuchtung selbst die Aufhellung, der
    // Emissive-Tint ist nur noch ein kleiner Sockel-Boost, kein Ersatz für fehlendes Licht mehr.
    const floorMat = new THREE.MeshStandardMaterial({
      map: groundTex ?? undefined,
      roughness: 0.92,
      metalness: 0,
      emissive: new THREE.Color(0x2c2113),
      emissiveIntensity: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, 0, FLOOR_CENTER_Z);
    scene.add(floor);

    // Welle 2, Chef-Feedback-Punkt 3: großzügige gekachelte "Rock"-Plane knapp unter dem scharfen
    // Kern-Boden — s. `SKIRT_*`-Konstanten-JSDoc oben für die volle Begründung. Eigene Textur-
    // INSTANZ (`groundTex.clone()`) nötig, weil Wrap/Repeat pro Textur-Objekt gelten und die
    // Kern-Plane weiterhin `ClampToEdge`+`repeat(1,1)` (Chef-Vorgabe "stretchen statt kacheln")
    // braucht — ein gemeinsames Textur-Objekt könnte nur EINEN der beiden Modi zugleich haben.
    // `clone()` teilt das zugrundeliegende Bild (kein zweiter Netzwerk-/Decode-Kosten).
    const skirtTex = groundTex ? groundTex.clone() : null;
    if (skirtTex) {
      skirtTex.wrapS = THREE.RepeatWrapping;
      skirtTex.wrapT = THREE.RepeatWrapping;
      skirtTex.repeat.set(SKIRT_REPEAT_X, SKIRT_REPEAT_Z);
      skirtTex.needsUpdate = true;
    }
    const skirtGeo = new THREE.PlaneGeometry(SKIRT_WORLD_WIDTH, SKIRT_WORLD_DEPTH);
    skirtGeo.rotateX(-Math.PI / 2);
    const skirtMat = new THREE.MeshStandardMaterial({
      map: skirtTex ?? undefined,
      roughness: 0.95,
      metalness: 0,
      emissive: new THREE.Color(0x241c10),
      emissiveIntensity: 0.3,
    });
    const skirt = new THREE.Mesh(skirtGeo, skirtMat);
    skirt.position.set(0, -0.015, FLOOR_CENTER_Z);
    scene.add(skirt);

    // Task #330d Punkt 1: die Kulisse (unten, `bgMesh`) bekommt bei Resize dieselbe Breiten-
    // Skalierung wie der Boden (s. `resize()` weiter unten) — Referenz erst gesetzt, sobald die
    // Textur geladen ist (Mesh existiert vorher noch nicht).
    let bgMesh: THREE.Mesh | null = null;

    // Hintergrund: NICHT mehr die volle Kulisse (Task #330b-Nachtrag, Chef-Feedback "Kulisse hat
    // selbst ~60% gemalten Boden, der mit unserer 3D-Bodenebene kollidiert — zwei Böden
    // übereinander, schwarzes Loch dazwischen"). Stattdessen wird nur der OBERE Bildanteil
    // (Himmel/Hügel/Zaun/Gehöft) per Canvas-Crop verwendet — der untere gemalte Feldweg entfällt
    // komplett, unsere 3D-Bodenebene liefert jetzt den einzigen "Boden" im Bild. Ein Canvas-Crop
    // (statt UV-`repeat`/`offset` auf der Textur) macht den Aspect-Ratio-Umbau explizit und lässt
    // sich zugleich mit einem weichen Unterkanten-Fade in Richtung Boden-Ton kombinieren (kaschiert
    // den Schnitt zusätzlich zum fogSeam-Streifen). Lädt asynchron — die Plane-Geometrie wird nach
    // Bildload mit dem ECHTEN (gecroppten) Seitenverhältnis neu aufgebaut, nie gestreckt.
    const backdropUrl = resolveArenaAssetUrl(manifest.backdrop);
    if (!backdropUrl) {
      // eslint-disable-next-line no-console
      console.error(`[arena25d] Kulissen-Textur "${manifest.backdrop}" für Zone "${manifest.zoneId}" nicht auflösbar — Kulisse bleibt leer.`);
    }
    const backdropLoader = new THREE.TextureLoader();
    if (backdropUrl) backdropLoader.load(backdropUrl, (rawTex) => {
      const img = rawTex.image as HTMLImageElement;
      const w = img.naturalWidth || img.width || 1717;
      const h = img.naturalHeight || img.height || 916;
      // Kulisse behält nur die oberen ~70% (Himmel/Hügel/Zaun/Gehöft) — der Feldweg im unteren
      // Drittel ist exakt der Teil, der mit der 3D-Bodenebene konkurrierte. Per Screenshot gegen
      // die echte Chef-Textur verifiziert (Zaunlinie bleibt sichtbar, Matsch-Streifen fällt weg).
      const CROP_FRACTION = 0.7;
      const cropH = Math.max(1, Math.round(h * CROP_FRACTION));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, cropH, 0, 0, w, cropH);
      // Weicher Fade an der neuen Unterkante Richtung Boden-Ton — verhindert eine harte Schnittkante
      // zwischen "letzter Bildzeile der Kulisse" und der 3D-Bodenebene dahinter.
      const fadeH = Math.round(cropH * 0.22);
      const grad = ctx.createLinearGradient(0, cropH - fadeH, 0, cropH);
      grad.addColorStop(0, "rgba(36,30,21,0)");
      grad.addColorStop(1, "rgba(36,30,21,0.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, cropH - fadeH, w, fadeH);
      const backdropTex = new THREE.CanvasTexture(canvas);
      backdropTex.colorSpace = THREE.SRGBColorSpace;
      backdropTex.wrapS = THREE.ClampToEdgeWrapping;
      backdropTex.wrapT = THREE.ClampToEdgeWrapping;
      const croppedAspect = w / cropH;
      const bgWidth = BACKDROP_HEIGHT * croppedAspect;
      // Task #330c Punkt 2: gebogene Kulisse statt flacher Plane (s. `buildCurvedBackdropGeometry`
      // Moduldoc) — dieselbe Textur/derselbe Crop, nur die Geometrie ist jetzt ein Zylinder-
      // Ausschnitt. `side: THREE.DoubleSide` als billige Absicherung gegen Normalen-/Winding-
      // Überraschungen (eine einzelne Kulissen-Mesh, Kosten vernachlässigbar).
      const bgGeo = buildCurvedBackdropGeometry(bgWidth, BACKDROP_HEIGHT, BACKDROP_CURVE_RADIUS, BACKDROP_CURVE_SEGMENTS);
      // Task #330c: UNLIT (MeshBasicMaterial) statt MeshStandardMaterial — die Kulisse ist eine
      // fertig gemalte "Himmel+Hügel"-Fläche (wie eine Skybox), kein physisches Objekt. Mit einem
      // lichtempfindlichen Material reagierte die gekrümmte Fläche (variierende Normalen über die
      // Biegung, s. Punkt 2) ungleichmäßig auf die neue gerichtete Sonne (Punkt 4) und kippte
      // insgesamt kühl/stürmisch statt den warmen gemalten Ton unverändert zu zeigen (Screenshot-
      // Befund beim ersten Licht-Pass). Unlit zeigt immer die Originalfarben der Textur, unabhängig
      // vom Sonnenwinkel — konsistent mit "Boden UND Sprites stehen im selben [Sonnen-]Licht", die
      // Kulisse selbst braucht dieses Licht nicht, sie IST die Lichtquelle der Szene (gemalter Himmel).
      const bgMat = new THREE.MeshBasicMaterial({
        map: backdropTex,
        fog: false,
        side: THREE.DoubleSide,
      });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      // Unterkante der Kulisse sitzt auf y=0 (Bodenhöhe) am fernen Boden-Rand — Unterkante exakt
      // am Horizont. `fog: false` auf dem Material, weil die Wand bereits als Ganzes weit hinten
      // sitzt (der Fog würde sie sonst zusätzlich zur eigenen Fade-Kante nochmal grau verwaschen —
      // der Canvas-Fade übernimmt die Tiefenwirkung hier gezielter). Die Geometrie selbst ist
      // bereits in Lokalkoordinaten um die Mitte (θ=0) zentriert (s. Builder), `position` platziert
      // nur noch die Mitte an BACKDROP_Z, exakt wie zuvor bei der Flachwand.
      bg.position.set(0, BACKDROP_HEIGHT / 2, BACKDROP_Z);
      scene.add(bg);
      bgMesh = bg;
      // Task #330d Punkt 1: falls der erste `resize()`-Aufruf VOR dem asynchronen Textur-Load lief
      // (Normalfall — s. Aufrufreihenfolge unten), hat die Kulisse hier ihre initiale Skalierung
      // verpasst. Einmalig mit der AKTUELLEN Containergröße nachholen, ab da hält `resize()` sie
      // aktuell (s. dort).
      const aspectNow = (container!.clientWidth || 1) / (container!.clientHeight || 1);
      bgMesh.scale.set(Math.max(1, aspectNow / REFERENCE_ASPECT), 1, 1);
    });

    // ── Kämpfer als Billboards (Punkt 3) ────────────────────────────────────────────────────
    const playerBoard = makeBillboard(PLAYER_X, PLAYER_Z, PLAYER_FIGURE_HEIGHT, true);
    const monsterBoard = makeBillboard(MONSTER_X, MONSTER_Z, MONSTER_FIGURE_HEIGHT, false);
    scene.add(playerBoard.mesh, playerBoard.shadow, monsterBoard.mesh, monsterBoard.shadow);

    // ── 0.4.0-Arena Welle 1, Auftrag Punkt 2 ("Prop-Billboard-Layer") ──────────────────────────
    // Aus dem Zonen-Manifest, NACH der Kamera-Positionierung gebaut (billboard-Rotation braucht
    // die finale Kameraposition, s. `makePropInstance`-JSDoc) — kein per-Frame-Update nötig (Props
    // sind statisch), die generische `scene.traverse`-Aufräumroutine im Effect-Cleanup (s.u.) räumt
    // sie beim Unmount mit auf, wie jedes andere `THREE.Mesh` in der Szene.
    const propInstances = manifest.props.map((def) => makePropInstance(def, camera));
    for (const p of propInstances) scene.add(p.mesh, p.shadow);

    /**
     * Welle 2, Auftrag Punkt 1 ("Einlauf"): JEDER Aufruf (Kampfstart-Mount UND jeder spätere
     * Monsterwechsel — Kill+Respawn/Dungeon-Welle/Flucht+neuer Gegner, erkannt über den
     * `lastImgSrc`-Vergleich im Frame-Loop unten) lässt die Figur vom Kulissen-Rand zur
     * Standposition LAUFEN statt zu poppen. `board.lastImgSrc` wird SYNCHRON gesetzt (nicht erst im
     * async Callback) — verhindert einen doppelten Texture-Load, falls `frame()` zwischen Aufruf und
     * Callback erneut denselben (noch ladenden) Wechsel erkennen würde.
     */
    /**
     * Räumt jeden laufenden Choreografie-Zustand ab und startet einen frischen Einlauf — der
     * gemeinsame "neues Leben"-Reset für ZWEI Auslöser: (1) `applyTexture`s erfolgreicher Textur-
     * Load (neue Identität, s. Aufrufstelle dort) UND (2) Chef-Repro 04.08. ("Chicken: Textur
     * erscheint nur beim Sterben"): der bislang FEHLENDE Reset beim Respawn DESSELBEN Monsters
     * (normaler Farm-Loop in einer offenen Zone — `monster.imgSrc` ändert sich dabei NICHT, ein
     * reiner Bild-Vergleich wie in `frame()` "Bild-Wechsel erkennen" hätte diesen Fall nie erkannt).
     * Ausgelagert, damit beide Auslöser garantiert denselben vollständigen Reset fahren (kein
     * Feld vergessen an einer der beiden Stellen).
     */
    function resetChoreographyForFreshEntrance(board: Billboard, motion: MotionParams, now: number): void {
      board.material.opacity = 1;
      board.dying = null;
      board.victory = null;
      board.knockback = null;
      board.dodge = null;
      board.attack = null;
      // Posen-Pilot: eine frische Identität (Kampfstart/Monsterwechsel) UND ein Respawn DESSELBEN
      // Monsters (der zweite Aufrufer, s.u. `frame()`s Dimmed-Übergang) starten IMMER auf "idle" —
      // ohne diesen Reset würde ein Gegner, der im letzten Moment vor dem Tod gerade "hit" zeigte,
      // mit genau dieser (falsch skalierten) Pose in seinen nächsten Einlauf laufen.
      board.strikePoseUntil = 0;
      board.hitPoseUntil = 0;
      if (board.idlePose) applyActivePose(board, "idle");
      const fromX = board.isPlayer ? board.baseX - PLAYER_ENTRANCE_OFFSET_X : MONSTER_ENTRANCE_FROM_X;
      board.entrance = {
        start: now,
        duration: motion.entranceMs,
        fromX,
        toX: board.baseX,
        stepFreq: motion.entranceStepFreq,
        bobAmp: motion.entranceBobAmp,
      };
      // Wander-Zustand für den NEUEN Kämpfer bei (0,0) relativ zum Standplatz beginnen (s.
      // `updateWander`) — sonst könnte ein Rest-Versatz vom Vorgänger-Zustand einen sichtbaren Pop
      // erzeugen, sobald der Einlauf endet und Wander übernimmt.
      board.wanderFrom = { x: 0, z: 0 };
      board.wanderTarget = { x: 0, z: 0 };
      board.wanderStart = now;
      board.wanderDuration = motion.entranceMs;
      board.wanderX = 0;
      board.wanderZ = 0;
    }

    function applyTexture(board: Billboard, url: string | null): void {
      board.lastImgSrc = url;
      // Chef-Repro 04.08. ("Textur erscheint nur beim Sterben ... intermittierend"): SOFORT
      // unsichtbar machen, bis Textur+Baseline dieses Aufrufs fertig sind (s. `textureReady`-
      // JSDoc) — sowohl beim allerersten Laden als auch bei einem Monsterwechsel (die ALTE Textur
      // darf nicht einfach weiter stehen bleiben, während die neue lädt). `updateBoardVisual`
      // liest dieses Flag JEDEN Frame und blendet das Mesh entsprechend.
      board.textureReady = false;
      // Posen-Pilot: JEDER `applyTexture`-Aufruf beginnt eine frische Identität — das alte Posen-Set
      // (falls vorhanden) gehört zum VORHERIGEN Sprite und darf nie auf dem neuen weiterleben (s.
      // `preloadPoseSet`s Race-Schutz, der genau auf `board.poseSet !== poseSet` prüft, um einen
      // verspäteten alten Callback zu erkennen).
      board.poseSet = null;
      board.poseTextures = {};
      board.posesReady = false;
      board.idlePose = null;
      board.activePoseKey = "idle";
      board.strikePoseUntil = 0;
      board.hitPoseUntil = 0;
      if (!url) {
        board.material.map = null;
        board.material.color.set(0x4a4038);
        board.material.needsUpdate = true;
        board.textureReady = true; // bewusster Platzhalter-Endzustand, kein Lade-Fenster mehr offen
        return;
      }
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        board.material.map = tex;
        board.material.color.set(0xffffff);
        board.material.needsUpdate = true;
        const img = tex.image as HTMLImageElement | undefined;
        if (img?.width && img.height) {
          const aspect = img.width / img.height;
          // Welle 2, Auftrag Punkt 8: Gewichtsklasse aus der AKTUELLEN Gegner-hpMax ableiten
          // (Spieler bleibt "medium"/sizeMult 1, s. choreography.ts PLAYER_PARAMS) — frisch
          // aufgelöst bei JEDEM Texturwechsel statt gecacht, s. Billboard.roleBaseHeight-JSDoc
          // (verhindert kumulative Verzerrung bei mehrfachem Monsterwechsel in einer Session).
          const motion = board.isPlayer ? PLAYER_PARAMS : WEIGHT_PARAMS[classifyMonsterWeight(propsRef.current.monster.hpMax)];
          // Welle 2: die volle Parameter-Tabelle (nicht nur `sizeMult`) bleibt am Board hängen —
          // der Frame-Loop braucht Windup-/Sprint-/Wander-/Knockback-Zeiten dieser Rolle JEDEN
          // Frame, ohne bei jedem Zugriff erneut `classifyMonsterWeight` gegen die aktuelle
          // `hpMax` aufzulösen (die sich zwischen zwei Texturwechseln ohnehin nicht ändert).
          board.motion = motion;
          board.figureHeight = board.roleBaseHeight * motion.sizeMult;
          board.baseScaleX = board.figureHeight * aspect;
          board.baseScaleY = board.figureHeight;
          board.mesh.scale.set(board.baseScaleX, board.baseScaleY, 1);
          // Chef-Anordnung: Fuß-Baseline MESSEN statt die Bildkante anzunehmen (s. `measureSpriteBaseline`
          // Moduldoc) — sonst schwebt jedes Sprite mit transparentem Fuß-Padding über dem Boden.
          const baseline = measureSpriteBaseline(img, url);
          board.feetOffset = -baseline.insetFrac * board.figureHeight;
          board.footCenterOffsetX = (baseline.footCenterFrac - 0.5) * board.mesh.scale.x;
          // Schatten-Ellipse aus der gemessenen Fuß-Spanne. Task #330c: Faktor 1.5→1.15 gesenkt —
          // der breitere #330b-Wert ließ die Ellipse (kombiniert mit dem dunklen Boden) wie einen
          // "Pit" statt eines knappen Kontaktschattens wirken (s. Abschlussbericht Punkt 6). Welle 2,
          // Chef-Feedback-Punkt 2 (04.08.): nochmal auf 0.92 verengt + Tiefe 0.42→0.38 — zusammen mit
          // der weicheren/dunkleren `makeShadowTexture` (s. dort) liest sich das jetzt als knappe,
          // weiche Ellipse statt eines Kleckses.
          const shadowWidth = board.mesh.scale.x * baseline.footSpanFrac * 0.92;
          board.shadow.scale.set(shadowWidth, 1, shadowWidth * 0.38);
          board.shadow.position.set(board.baseX + board.footCenterOffsetX, 0.01, board.baseZ);

          // Posen-Pilot (design/battle-040-pose-pilot.md): Idle-Textur als EIGENER Slot halten (nicht
          // nur `material.map`) — erlaubt `applyActivePose` einen harten Rück-Swap zu "idle" jederzeit
          // ohne erneutes Laden. `getPoseSet` matcht auf DERSELBEN Vite-URL, die diese Idle-Textur
          // gerade geladen hat (s. poses.ts Moduldoc) — 0 Treffer (heutiger Normalfall, Mira liefert
          // noch keine Posen) lässt das Board exakt beim bisherigen Einzel-Sprite-Verhalten.
          board.idlePose = { texture: tex, baseline, aspect };
          const poseSet = getPoseSet(url);
          board.poseSet = poseSet;
          if (poseSet) preloadPoseSet(board, poseSet);

          // Neue Identität (Kampfstart oder Monsterwechsel) räumt jeden laufenden Choreografie-
          // Zustand ab (s. `resetChoreographyForFreshEntrance`-JSDoc) — ein frischer Gegner startet
          // nie mitten in der Dissolve-/Rückstoß-Pose des Vorgängers.
          //
          // Chef-Feedback-Punkt 1 (04.08., Screenshot 53 "Chicken hatte Nameplate+Schatten, kein
          // Sprite"): der Vorgänger blendete den Gegner hier per `opacity=0` unsichtbar EIN, verließ
          // sich darauf, dass der (nie geschriebene) Frame-Loop die Opazität während des Einlaufs
          // wieder auf 1 hochfährt — passierte nie, das Monster blieb dauerhaft unsichtbar. Fix:
          // GAR KEIN Opacity-Trick mehr. Die Figur ist immer voll sichtbar (`opacity` bleibt 1,
          // Standard); die "Einlauf"-Wirkung kommt AUSSCHLIESSLICH aus der Position (`fromX` sitzt
          // knapp innerhalb des Bodens am Kulissen-Rand, s. `MONSTER_ENTRANCE_FROM_X`-Kommentar) —
          // robuster (kein zweiter Zustand, der synchron gehalten werden muss) UND vermeidet einen
          // zweiten, unabhängigen Bug: `alphaTest:0.35` auf einem cutout-Material lässt einen
          // opacity-Fade unterhalb der Schwelle KOMPLETT verschwinden statt sanft einzublenden
          // (Alpha = Textur-Alpha × opacity; erst bei opacity>0.35 wird überhaupt etwas gezeichnet).
          resetChoreographyForFreshEntrance(board, motion, performance.now());
          // Erst JETZT ist alles (Textur, Skalierung, Fuß-Baseline, Schatten, Einlauf) konsistent
          // gesetzt — "GARANTIERT nachziehen" (Chef-Auftrag): dieser Frame-Wechsel ist der einzige
          // Ort, an dem `textureReady` auf `true` kippt.
          board.textureReady = true;
        } else {
          // img ohne width/height NACH erfolgreichem Load sollte praktisch nie passieren (Browser
          // liefert den onLoad-Callback erst, wenn das Bild dekodiert ist) — defensiv trotzdem: das
          // Board bleibt sonst für immer unsichtbar (schlimmer als der Ausgangszustand). Zeigt den
          // Platzhalter-Fallback-Ton statt eines für immer leeren Boards.
          // eslint-disable-next-line no-console
          console.error(`[arena25d] Textur "${url}" geladen, aber ohne width/height — Board bleibt auf Platzhalter-Farbe.`);
          board.material.map = null;
          board.material.color.set(0x4a4038);
          board.material.needsUpdate = true;
          board.textureReady = true;
        }
      });
    }
    applyTexture(playerBoard, propsRef.current.player.imgSrc);
    applyTexture(monsterBoard, propsRef.current.monster.imgSrc);

    const sparkPool = makeSparkPool();
    scene.add(sparkPool.points);

    // ── 0.4.0-Arena, Logik-Welle 2, Auftrag Punkt 4 ("Ranged/Magie räumlich") ─────────────────
    // EIN wiederverwendbares Projektil-Sprite (nur der Spieler führt je Ranged/Magie, s.
    // Moduldoc "MonsterDef kennt kein style-Feld" — ein einzelnes Objekt reicht, es kann nie zwei
    // gleichzeitig geben). `makeSunGlowTexture` (Task #330c) liefert einen billigen weichen
    // Radial-Glow, hier zweitverwertet statt einer dritten Canvas-Textur — additiv geblendet,
    // Farbe je Angriffsstil eingefärbt (`launchProjectile`).
    const projectileMat = new THREE.SpriteMaterial({
      map: makeSunGlowTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    });
    const projectileSprite = new THREE.Sprite(projectileMat);
    projectileSprite.visible = false;
    scene.add(projectileSprite);
    let projectileFlight: { from: THREE.Vector3; to: THREE.Vector3; start: number; duration: number; magic: boolean; crit: boolean } | null = null;

    /** Startet den Flug (Auftrag Punkt 4: "Bogenkurve bei Ranged, direkter Puls bei Magie") — wird
     *  aus `updateAttackCycle` beim Erreichen der Release-Schwelle aufgerufen, s. dortiges JSDoc. */
    function launchProjectile(from: THREE.Vector3, to: THREE.Vector3, magic: boolean, crit: boolean, duration: number, now: number): void {
      projectileFlight = { from: from.clone(), to: to.clone(), start: now, duration, magic, crit };
      projectileSprite.visible = true;
      projectileMat.color.set(magic ? 0x9b6bff : 0xd9a15c);
    }
    /** Auftrag Punkt 6 ("nie den Event-Zeitpunkt verschieben"): falls das echte Event VOR dem
     *  vorhergesagten Eintreffen kam, verschwindet das Projektil sofort statt sichtbar nachzuziehen
     *  — die Verteidiger-Reaktion feuert in jedem Fall exakt im selben Frame. */
    function forceArriveProjectile(): void {
      projectileFlight = null;
      projectileSprite.visible = false;
    }
    function updateProjectile(now: number): void {
      if (!projectileFlight) return;
      const p = clamp01((now - projectileFlight.start) / projectileFlight.duration);
      const arcH = projectileFlight.magic ? 0.08 : 0.85; // Bogenkurve Ranged, fast direkter Puls Magie
      const x = THREE.MathUtils.lerp(projectileFlight.from.x, projectileFlight.to.x, p);
      const y = THREE.MathUtils.lerp(projectileFlight.from.y, projectileFlight.to.y, p) + Math.sin(p * Math.PI) * arcH;
      const z = THREE.MathUtils.lerp(projectileFlight.from.z, projectileFlight.to.z, p);
      projectileSprite.position.set(x, y, z);
      const scale = (projectileFlight.crit ? 0.5 : 0.38) + Math.sin(p * Math.PI) * 0.14;
      projectileSprite.scale.set(scale, scale, 1);
      if (p >= 1) {
        projectileFlight = null;
        projectileSprite.visible = false;
      }
    }

    function resize(): void {
      const w = container!.clientWidth || 1;
      const h = container!.clientHeight || 1;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      // Task #330d Punkt 1 (Chef-Zitat "im Widescreen brauchen wir mehr Platz links und rechts.
      // In 1920×1080 reicht es"): bei FESTEM vertikalen FOV (`CAMERA_FOV`) wächst das horizontale
      // Sichtfeld mit dem Seitenverhältnis über `tan(hFov/2) = aspect · tan(vFov/2)` — die für einen
      // WELTPUNKT nötige NDC-Bildschirmabdeckung schrumpft dadurch für JEDEN Weltpunkt (unabhängig
      // von seiner Tiefe/Kamera-Distanz) um exakt denselben Faktor `1/aspect`. Eine feste
      // `GROUND_WORLD_WIDTH` reicht deshalb nur für DAS Seitenverhältnis, für das sie kalibriert
      // wurde (16:9/1920×1080, die Chef-Referenz) — bei größerem `aspect` (Ultrawide) bleibt links/
      // rechts eine Lücke zur Clear-Color (s. Chef-Screenshot 3440×1440: dunkle Keile unten links/
      // rechts neben dem Boden-Trapez). Ein einziger Skalierungsfaktor relativ zur Referenz behebt
      // das exakt (keine erneute Vermessung/Raycast nötig, die Beziehung ist linear in `aspect`):
      // bei `aspect === REFERENCE_ASPECT` ist der Faktor GENAU 1 → 1920×1080 bleibt Pixel-identisch
      // zum #330c-Stand (Chef-Vorgabe "1920×1080 darf sich nicht verändern"). `Math.max(1, …)`
      // clampt schmalere-als-Referenz-Seitenverhältnisse auf den Referenz-Wert (nicht schmaler
      // machen als bisher, nur breiteren Frames mehr Bodenbreite geben). Die Kulisse (`bgMesh`,
      // s.o.) bekommt denselben Faktor — ihre feste, aus dem Bild-Seitenverhältnis abgeleitete Breite
      // unterliegt derselben Frustum-Wachstumslogik und würde sonst am Horizont dieselbe Lücke
      // zeigen, nur später sichtbar (die Naht war bisher vom jetzt entfernten Nebelschleier
      // kaschiert, s. Punkt 2 weiter oben in diesem Modul).
      const widthScale = Math.max(1, aspect / REFERENCE_ASPECT);
      floor.scale.set(widthScale, 1, 1);
      if (bgMesh) bgMesh.scale.set(widthScale, 1, 1);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    // Priming-Render (synchron, vor dem ersten rAF-Tick) — s. Modul-JSDoc / AmbientCanvas-Vorbild.
    renderer.render(scene, camera);

    let rafId = 0;
    let running = false;
    let shake: { start: number; duration: number; seed: number } | null = null;
    let hitCount = 0; // reines QA-Anker-Attribut, s. triggerHit
    // Welle 2, Auftrag Punkt 6 ("Engine-Synchronisation KRITISCH"): letzte verarbeitete `log`-seq.
    // `null` = "noch nie initialisiert" — beim ALLERERSTEN Frame wird NUR der aktuelle Stand
    // übernommen (nicht die komplette bisherige Kampf-Historie als Bewegungs-Burst nachgespielt),
    // exakt dasselbe Init-Muster wie CombatPage.tsx `lastSeqRef` (s. dortige "Neue Treffer..."-
    // useEffect). `seq` bleibt über Log-`shift()` (COMBAT_LOG_MAX-Deckel, s. packages/engine/
    // combat.ts) hinweg monoton — ein reiner `>`-Vergleich funktioniert daher auch dann noch
    // korrekt, wenn ältere Einträge längst aus dem Array gefallen sind.
    let lastSeq: number | null = null;
    // Chef-Repro 04.08. ("Chicken: Textur erscheint nur beim Sterben ... intermittierend je
    // Spawn"): Respawn-Erkennung für den Fall "DASSELBE Monster respawnt" (normaler Farm-Loop in
    // einer offenen Zone) — `monster.imgSrc` ändert sich dabei NICHT (s. "Bild-Wechsel erkennen"
    // oben, das deckt nur ECHTE Monsterwechsel ab), OHNE eigenen Reset bliebe `monsterBoard.dying`
    // nach dem ERSTEN Kill der Session für den Rest der Session gesetzt (20 % Opazität, abgedunkelt
    // — genau das gemeldete "fast unsichtbar"-Bild). `dimmed` (= `cs.cooldownRemainingMs > 0`)
    // kippt true→false GENAU dann, wenn der Respawn-Cooldown abläuft und der neue/respawnte Gegner
    // wieder ins Spiel kommt — der zuverlässigste vorhandene Signal-Kandidat dafür. `null` = "noch
    // nie gesehen" (erster Frame, kein False-Trigger beim Mount).
    let lastMonsterDimmed: boolean | null = null;

    /** Löst Treffer-Feedback auf EINER Seite aus: Weißblitz + PointLight-Flacker + Funken + Crit-
     *  Kamera-Punch (alle NUR bei fxLevel "full"/"reduced" je nach Wirkung, s. Gates unten) —
     *  gespiegelt vom 2D-Pendant in CombatPage.tsx. Welle 2: reine FX-Funktion OHNE Positions-
     *  Anteil mehr (der Recoil/Knockback lebt jetzt in `board.knockback`, s. `resolveAttackContact`
     *  weiter unten) — unverändert aus Welle 1 wiederverwendet. */
    function triggerHit(board: Billboard, crit: boolean, fx: CombatFxLevel): void {
      const now = performance.now();
      if (fx !== "off") {
        board.flash = { start: now, duration: crit ? 220 : 150, color: new THREE.Color(crit ? 0xfff4c2 : 0xffffff) };
        flicker.intensity = crit ? 4.2 : 2.6;
        flicker.color.set(crit ? 0xffd27a : 0xffb060);
        flicker.position.set(board.mesh.position.x, 1.6, board.mesh.position.z + 0.3);
      }
      if (fx === "full") {
        spawnSparks(sparkPool, new THREE.Vector3(board.mesh.position.x, 1.3, board.mesh.position.z), crit ? 10 : 6);
        // Auftrag "Crit ... SEHR dezenter Kamera-Punch": Amplitude bewusst unverändert klein
        // (0.05 Welteinheiten, s. Kamera-Block unten) — keine Verstärkung trotz Welle-2-Umbau.
        if (crit) shake = { start: now, duration: 160, seed: Math.random() * Math.PI * 2 };
      }
      // Reines QA-Anker-Attribut (kein Gameplay/Rendering-Effekt) — analog dem `data-<name>`-
      // Assertion-Muster von `.arena-fx-layer` im 2D-System (s. CombatPage.tsx `bumpFx`): erlaubt
      // ui-audit-Playwright-Skripten, per `waitForFunction` zuverlässig einen Treffer-/Licht-Moment
      // abzupassen, statt auf eine feste Wartezeit zu raten. Verschwindet mit dem Ordner.
      hitCount += 1;
      container!.dataset.a25Hits = String(hitCount);
      if (crit) container!.dataset.a25Crits = String((Number(container!.dataset.a25Crits) || 0) + 1);
    }

    /** FX-Parität "Bleed/Poison-Ticks" (Auftrag, Rest-Liste): ein DoT-Tick ist spürbar, aber KEIN
     *  voller Schwert-/Pfeiltreffer — kein Anlauf, kein Knockback, das Ziel hat sich nicht bewegt,
     *  nur ein kurzer status-eingefärbter Flash direkt auf der Figur. */
    function triggerDotPulse(board: Billboard, status: StatusType | undefined, fx: CombatFxLevel): void {
      if (fx === "off") return;
      const color = status === "poison" ? 0xb98cff : status === "burn" ? 0xff8a4a : status === "frost" ? 0x8fd0ff : 0xd6455c;
      board.flash = { start: performance.now(), duration: 260, color: new THREE.Color(color) };
    }

    // ── Idle-Wander (Auftrag Punkt 4, "kleine LAUF-Bewegungen ... Kämpfer belauern sich") ───────
    /** Zieht bei Bedarf einen NEUEN Wander-Wegpunkt (`choreography.ts randomPointInEllipse`) und
     *  eased `board.wanderX/Z` dorthin — läuft NUR, solange das Board frei ist (kein Angriffs-/
     *  Reaktions-/Einlauf-/Sterbe-Zyklus überlagert, s. Aufrufstelle in `updateBoardVisual`), damit
     *  ein Angriffs-Sprint nie gegen einen zeitgleich wandernden Untergrund ankämpft. `elapsed` wird
     *  auf 10s gedeckelt — schützt gegen eine Endlosschleife, falls der Tab lange im Hintergrund war
     *  (rAF pausiert dann, `now` springt beim Zurückkehren um den ganzen Pausen-Zeitraum). */
    function updateWander(board: Billboard, now: number): void {
      let elapsed = Math.min(now - board.wanderStart, 10000);
      while (elapsed >= board.wanderDuration) {
        const consumed = board.wanderDuration;
        board.wanderFrom = board.wanderTarget;
        board.wanderTarget = randomPointInEllipse(board.motion.wanderRadiusX, board.motion.wanderRadiusZ);
        board.wanderStart += consumed;
        board.wanderDuration = THREE.MathUtils.lerp(board.motion.wanderStepMinMs, board.motion.wanderStepMaxMs, Math.random());
        elapsed = Math.min(now - board.wanderStart, 10000);
      }
      const eased = easeOutCubic(clamp01(elapsed / board.wanderDuration));
      board.wanderX = THREE.MathUtils.lerp(board.wanderFrom.x, board.wanderTarget.x, eased);
      board.wanderZ = THREE.MathUtils.lerp(board.wanderFrom.z, board.wanderTarget.z, eased);
    }

    /** Melee-Kontaktpunkt: wie nah der Angreifer an den Standplatz des Verteidigers heranläuft
     *  (`MELEE_CLASH_GAP` vor ihm stehenbleibend), mit `MELEE_MIN_SPRINT` als Sicherheitsnetz gegen
     *  einen unsichtbar kurzen Anlauf, falls die Standplätze sich je annähern sollten. */
    function computeClashX(attackerHomeX: number, defenderHomeX: number, dir: 1 | -1): number {
      const raw = defenderHomeX - dir * MELEE_CLASH_GAP;
      const travel = (raw - attackerHomeX) * dir;
      return travel < MELEE_MIN_SPRINT ? attackerHomeX + dir * MELEE_MIN_SPRINT : raw;
    }

    /**
     * Auftrag Punkt 6: der Windup wird PRÄDIKTIV aus `timerRemainingSec` gestartet, nicht erst wenn
     * das echte CombatEvent eintrifft — sonst läge die komplette Anlauf-Choreografie zeitlich HINTER
     * dem Moment, in dem HP/Log sich schon geändert haben. `predictWindow` ist die geschätzte
     * Windup+Sprint- (bzw. Lehne+Snap+Transit-)Dauer bei NORMALEM (nicht-Crit-)Tempo — Crit ist zu
     * diesem Zeitpunkt naturgemäß unbekannt (der Ausgang des Angriffs steht erst beim echten Event
     * fest), s. `resolveAttackContact` für die Kontakt-/Rückzugs-Phasen, die crit-scharf reagieren
     * können. Startet nur auf einem freien Board (kein laufender Zyklus/Einlauf/Sterben/Sieg) UND
     * nur, wenn der GEGNER nicht gerade zerfällt (kein Angriff auf eine Leiche).
     */
    function maybeStartPredictiveCycle(board: Billboard, other: Billboard, style: AttackStyle, dir: 1 | -1, timerRemainingSec: number, now: number): void {
      if (board.attack || board.entrance || board.dying || board.victory || other.dying) return;
      const motion = board.motion;
      const leadMs = style === "melee" ? motion.windupMs : motion.leanMs;
      const followMs = style === "melee" ? motion.sprintMs : PROJECTILE_TIMING.snapMs + PROJECTILE_TIMING.transitMs;
      const predictWindow = Math.min(PREDICT_WINDOW_CAP_MS, leadMs + followMs);
      if (Math.max(0, timerRemainingSec * 1000) > predictWindow) return;
      const homeX = board.baseX + board.wanderX;
      const otherHomeX = other.baseX + other.wanderX;
      board.attack = {
        phase: "windup",
        phaseStart: now,
        cycleStart: now,
        resolved: false,
        style,
        crit: false,
        dir,
        outcome: "hit",
        clashX: style === "melee" ? computeClashX(homeX, otherHomeX, dir) : homeX,
        homeX,
        motion,
        predictWindow,
        projectileSpawned: false,
      };
    }

    /** Zeit-gesteuerte Phasenübergänge EINES Zyklus — läuft jeden Frame, unabhängig davon, ob das
     *  echte Event schon eingetroffen ist. "windup"→"sprint" passiert IMMER nach Ablauf (die Figur
     *  läuft prädiktiv weiter); "sprint" bleibt bei Melee unverändert (per `clamp01` in
     *  `advanceAttackPose` "eingefroren") bis `resolveAttackContact` explizit auf "hold"/"return"/
     *  "stagger" weiterschaltet (Auftrag "Events nie verschieben") — DAS ist bewusst KEIN
     *  automatischer Übergang hier. "hold"→"return" und "return"/"stagger"→Ende (Zyklus löschen)
     *  sind dagegen wieder reine Zeitabläufe, die nach dem Auflösen ganz normal weiterlaufen. */
    function progressAttackPhase(board: Billboard, now: number): void {
      const cycle = board.attack;
      if (!cycle) return;
      const motion = cycle.motion;
      if (cycle.phase === "windup") {
        const dur = cycle.style === "melee" ? motion.windupMs : motion.leanMs;
        if (now - cycle.phaseStart >= dur) {
          cycle.phase = "sprint";
          cycle.phaseStart = now;
        }
      } else if (cycle.phase === "hold") {
        const dur = cycle.crit ? motion.holdCritMs : motion.holdMs;
        if (now - cycle.phaseStart >= dur) {
          cycle.phase = "return";
          cycle.phaseStart = now;
        }
      } else if (cycle.phase === "return") {
        const dur =
          cycle.style === "melee"
            ? cycle.crit
              ? motion.returnCritMs
              : motion.returnMs
            : cycle.crit
              ? PROJECTILE_TIMING.returnCritMs
              : PROJECTILE_TIMING.returnMs;
        if (now - cycle.phaseStart >= dur) board.attack = null; // Zyklus fertig — zurück in den Idle-Wander
      } else if (cycle.phase === "stagger") {
        if (now - cycle.phaseStart >= motion.staggerMs) board.attack = null;
      }
      // "sprint": kein Zeit-Ausstieg hier, s. JSDoc oben.
    }

    /** Reine Pose-Berechnung (keine Mutation) für die AKTUELLE Phase eines Zyklus — Melee bewegt den
     *  Angreifer entlang X (Windup zurück → Sprint zum Kontaktpunkt → Hold-Dwell → federnder
     *  Rückzug, s. `easeOutBackSoft`-JSDoc in choreography.ts für die Überschwung-Herleitung),
     *  Ranged/Magie bleibt am Platz und lehnt nur (Auftrag Punkt 4 "halten Distanz"), Stagger ist
     *  ein reines Zucken ohne Nettoversatz (Auftrag Punkt 7 "Schock = Zucken/Stagger statt Dash"). */
    function advanceAttackPose(cycle: AttackCycle, now: number): PoseOffset {
      const motion = cycle.motion;
      const dir = cycle.dir;
      if (cycle.phase === "stagger") {
        const p = clamp01((now - cycle.phaseStart) / motion.staggerMs);
        const decay = 1 - p;
        return {
          dx: Math.sin(p * Math.PI * 6) * motion.staggerAmp * decay,
          dz: Math.cos(p * Math.PI * 5) * motion.staggerAmp * 0.4 * decay,
          tiltZRad: 0,
          scaleMult: 1,
        };
      }
      if (cycle.style !== "melee") {
        // Ranged/Magie: dieselben Phasennamen wie Melee, andere Bedeutung — "windup" = Spann-/Cast-
        // Lehne aufbauen, "sprint" = Lehne halten + Snap + Projektil-Transit (Spawn s.
        // `maybeSpawnProjectile`), "return" = Rücklehnen (Auftrag "Windup ... aus timerRemainingSec
        // getimt" gilt hier für die Lehne).
        const leanAmp = cycle.crit ? motion.leanCritAmp : motion.leanAmp;
        if (cycle.phase === "windup") {
          const p = clamp01((now - cycle.phaseStart) / motion.leanMs);
          return { dx: dir * leanAmp * easeOutCubic(p), dz: 0, tiltZRad: 0, scaleMult: 1 + 0.03 * p };
        }
        if (cycle.phase === "sprint") {
          const p = clamp01((now - cycle.phaseStart) / (PROJECTILE_TIMING.snapMs + PROJECTILE_TIMING.transitMs));
          return { dx: dir * leanAmp * (1 - 0.5 * p), dz: 0, tiltZRad: 0, scaleMult: 1.03 - 0.03 * p };
        }
        // "return"
        const dur = cycle.crit ? PROJECTILE_TIMING.returnCritMs : PROJECTILE_TIMING.returnMs;
        const p = clamp01((now - cycle.phaseStart) / dur);
        return { dx: dir * leanAmp * 0.5 * (1 - easeOutCubic(p)), dz: 0, tiltZRad: 0, scaleMult: 1 };
      }
      // Melee.
      const windupAmp = cycle.crit ? motion.windupCritAmp : motion.windupAmp;
      const travel = cycle.clashX - cycle.homeX;
      if (cycle.phase === "windup") {
        const p = clamp01((now - cycle.phaseStart) / motion.windupMs);
        const e = easeOutCubic(p);
        return { dx: -dir * windupAmp * e, dz: 0, tiltZRad: -dir * 0.05 * e, scaleMult: 1 - 0.03 * e };
      }
      if (cycle.phase === "sprint") {
        // `clamp01` friert die Position am Kontaktpunkt EIN, sobald die geschätzte Sprint-Dauer um
        // ist, aber `resolved` noch fehlt — genau das "kurz gelockte Klingen"-Warten aus dem Auftrag,
        // bis das echte Event den Ausgang liefert.
        const p = clamp01((now - cycle.phaseStart) / motion.sprintMs);
        const e = easeInCubic(p);
        const tiltRad = (motion.sprintTiltDeg * Math.PI) / 180;
        return {
          dx: THREE.MathUtils.lerp(-dir * windupAmp, travel, e),
          dz: 0,
          tiltZRad: dir * tiltRad * e,
          scaleMult: THREE.MathUtils.lerp(0.97, cycle.crit ? 1.1 : 1.06, e),
        };
      }
      if (cycle.phase === "hold") {
        const holdMs = cycle.crit ? motion.holdCritMs : motion.holdMs;
        const p = clamp01((now - cycle.phaseStart) / holdMs);
        const tiltRad = (motion.sprintTiltDeg * Math.PI) / 180;
        return {
          dx: travel,
          dz: 0,
          tiltZRad: dir * tiltRad * (1 - 0.3 * p),
          scaleMult: THREE.MathUtils.lerp(cycle.crit ? 1.1 : 1.06, cycle.crit ? 1.04 : 1.02, p),
        };
      }
      // "return" — federnder Rückzug (s. easeOutBackSoft-JSDoc "spring = 1 - easeOutBackSoft(rp)").
      const returnMs = cycle.crit ? motion.returnCritMs : motion.returnMs;
      const rp = clamp01((now - cycle.phaseStart) / returnMs);
      const spring = 1 - easeOutBackSoft(rp);
      return { dx: travel * spring, dz: 0, tiltZRad: 0, scaleMult: 1 + (cycle.crit ? 0.04 : 0.02) * spring };
    }

    /** Startet das Projektil (Auftrag Punkt 4: "Bogenkurve bei Ranged, direkter Puls bei Magie")
     *  exakt `PROJECTILE_TIMING.snapMs` NACH Eintritt in die "sprint"-Phase (Ranged/Magie) — einmalig
     *  je Zyklus (`projectileSpawned`-Flag, s. AttackCycle-JSDoc). Nutzt die Brusthöhen-Anker beider
     *  Boards (dieselbe `FLOATER_ANCHOR_Y_FACTOR`-Höhe wie die Schadens-Floater) als Start-/Zielpunkt.
     */
    function maybeSpawnProjectile(board: Billboard, other: Billboard, cycle: AttackCycle, now: number): void {
      if (cycle.style === "melee" || cycle.phase !== "sprint" || cycle.projectileSpawned) return;
      if (now - cycle.phaseStart < PROJECTILE_TIMING.snapMs) return;
      cycle.projectileSpawned = true;
      const from = new THREE.Vector3(board.mesh.position.x, board.figureHeight * FLOATER_ANCHOR_Y_FACTOR, board.mesh.position.z);
      const to = new THREE.Vector3(other.baseX + other.wanderX, other.figureHeight * FLOATER_ANCHOR_Y_FACTOR, other.baseZ + other.wanderZ);
      const transitMs = cycle.crit ? PROJECTILE_TIMING.transitCritMs : PROJECTILE_TIMING.transitMs;
      launchProjectile(from, to, cycle.style === "magic", cycle.crit, transitMs, now);
    }

    /** Seitlicher Ausweich-Step (Auftrag Punkt 7 "Dodge = seitlicher Ausweich-Step") — Richtung
     *  zufällig (kein Vorzugs-links/rechts), Achse bewusst Z (quer zur Duell-Achse X), damit sich
     *  der Schritt optisch von einem Knockback (immer entlang X) unterscheidet. */
    function triggerDodge(board: Billboard, now: number): void {
      const dirSign = Math.random() < 0.5 ? 1 : -1;
      board.dodge = { start: now, duration: board.motion.dodgeMs, amp: board.motion.dodgeAmp * dirSign };
    }

    /** Auftrag "Kill = Verlierer kippt/zerfällt, Sieger-Pose": wird DIREKT beim Verarbeiten des
     *  `kind:"kill"`/`"defeat"`-Log-Eintrags aufgerufen (s. `processNewCombatEvents`) — der
     *  vorangehende tödliche Treffer hat im SELBEN oder vorherigen Frame bereits über
     *  `resolveAttackContact` seinen eigenen Kontakt-Moment (Flash/Knockback) ausgelöst, Dissolve/
     *  Sieg-Hop setzen also praktisch zeitgleich mit dem letzten Einschlag ein — keine zusätzliche
     *  Verzögerungs-Logik nötig, die Log-Reihenfolge (Treffer-Event VOR Kill/Defeat-Event, s.
     *  packages/engine/combat.ts) erledigt die Kausalität von selbst. */
    function triggerDyingAndVictory(loserBoard: Billboard, winnerBoard: Billboard, now: number): void {
      loserBoard.dying = { start: now, duration: 650 };
      loserBoard.attack = null;
      loserBoard.knockback = null;
      loserBoard.dodge = null;
      winnerBoard.victory = { start: now, duration: 620 };
    }

    /**
     * Diff-Verarbeitung des Kampf-Logs (Auftrag Punkt 6, "alles aus echten CombatEvents ...
     * interpoliert") — läuft JEDEN Frame, komplett unabhängig von CombatPage's eigener
     * `lunge`/`hitFx`-State-Machine (die weiter nur den 2D-Zweig füttert, s. Modul-JSDoc oben).
     * `missReason:"dodge"` betrifft laut shared/index.ts JSDoc immer den SPIELER als Ausweichenden
     * (also `by:"enemy"`-Events) — der Angreifer (Gegner) bekommt trotzdem seinen vollen Anlauf-
     * Zyklus (Ausgang "whiff"), der Spieler zusätzlich den Sidestep.
     */
    function processNewCombatEvents(events: CombatEvent[], now: number, fx: CombatFxLevel, playerStyle: WeaponStyle): void {
      if (lastSeq === null) {
        lastSeq = events.length ? events[events.length - 1]!.seq : 0;
        return;
      }
      for (const e of events) {
        if (e.seq <= lastSeq) continue;
        lastSeq = e.seq;
        if (e.kind === "hit" || e.kind === "crit" || e.kind === "miss") {
          const attackerBoard = e.by === "player" ? playerBoard : monsterBoard;
          const defenderBoard = e.by === "player" ? monsterBoard : playerBoard;
          const style: AttackStyle = e.by === "player" ? playerStyle : "melee";
          const dir: 1 | -1 = e.by === "player" ? 1 : -1;
          const outcome: AttackOutcome = e.kind === "miss" ? (e.missReason === "shock" ? "shockSkip" : "whiff") : "hit";
          resolveAttackContact(attackerBoard, defenderBoard, style, dir, e.kind === "crit", outcome, now, fx);
          if (outcome === "whiff" && e.missReason === "dodge") triggerDodge(defenderBoard, now);
        } else if (e.kind === "kill") {
          triggerDyingAndVictory(monsterBoard, playerBoard, now);
        } else if (e.kind === "defeat") {
          triggerDyingAndVictory(playerBoard, monsterBoard, now);
        } else if (e.kind === "dot" && e.amount > 0) {
          triggerDotPulse(e.by === "player" ? monsterBoard : playerBoard, e.status, fx);
        } else if (e.kind === "lifesteal" && e.amount > 0 && e.source === "meleeLifesteal" && fx === "full") {
          // Auftrag Rest-Liste "Melee-Lifesteal-Funken": kleiner Funken-Flourish AM SPIELER (das
          // Leben fließt zu ihm zurück) — die rote Tropfen-Zahl kommt bereits gratis aus FloaterList.
          spawnSparks(sparkPool, new THREE.Vector3(playerBoard.mesh.position.x, playerBoard.figureHeight * FLOATER_ANCHOR_Y_FACTOR, playerBoard.mesh.position.z), 4);
        }
      }
    }

    /**
     * Auftrag Punkt 6: das ECHTE CombatEvent trifft ein — schaltet einen (ggf. prädiktiv bereits
     * laufenden) Zyklus auf "resolved" und startet Kontakt-/Rückzugsphasen. Fehlt ein prädiktiver
     * Zyklus (Angriffstempo schneller als Windup+Sprint, oder der vorherige Zyklus war schon fertig
     * ausgelaufen), wird HIER sofort ein neuer, bereits am Kontaktpunkt stehender Zyklus eingesetzt
     * — "Animation kürzen" statt den Event-Zeitpunkt zu verschieben (Auftrag, wörtlich).
     */
    function resolveAttackContact(
      attackerBoard: Billboard,
      defenderBoard: Billboard,
      style: AttackStyle,
      dir: 1 | -1,
      crit: boolean,
      outcome: AttackOutcome,
      now: number,
      fx: CombatFxLevel,
    ): void {
      const motion = attackerBoard.motion;
      let cycle = attackerBoard.attack;
      if (!cycle || cycle.resolved) {
        const homeX = attackerBoard.baseX + attackerBoard.wanderX;
        const otherHomeX = defenderBoard.baseX + defenderBoard.wanderX;
        cycle = {
          phase: outcome === "shockSkip" ? "stagger" : style === "melee" ? "hold" : "return",
          phaseStart: now,
          cycleStart: now,
          resolved: true,
          style,
          crit,
          dir,
          outcome,
          clashX: style === "melee" ? computeClashX(homeX, otherHomeX, dir) : homeX,
          homeX,
          motion,
          predictWindow: 0,
          projectileSpawned: true, // nichts mehr nachzuholen, der Kontakt ist schon da
        };
        attackerBoard.attack = cycle;
      } else {
        cycle.resolved = true;
        cycle.crit = crit;
        cycle.outcome = outcome;
        cycle.phase = outcome === "shockSkip" ? "stagger" : style === "melee" ? "hold" : "return";
        cycle.phaseStart = now;
      }
      if (style !== "melee") forceArriveProjectile(); // Auftrag Punkt 6: nie nachhinken lassen
      // Posen-Pilot (design/battle-040-pose-pilot.md): "ab Kontakt-Event strike für ~200ms
      // (Angreifer)" — DAS hier ist der Kontakt-Event-Moment, unabhängig vom Ausgang (der Angreifer
      // schwingt/schießt/castet auch bei einem Fehlschlag, s. `computeActivePoseKey`-Präzedenz).
      attackerBoard.strikePoseUntil = now + POSE_STRIKE_MS;
      if (outcome === "hit") {
        triggerHit(defenderBoard, crit, fx);
        const knockAmp = (crit ? motion.knockCritAmp : motion.knockAmp) * dir;
        const knockMs = crit ? motion.knockCritMs : motion.knockMs;
        defenderBoard.knockback = { start: now, duration: knockMs, amp: knockAmp };
        // "hit für ~250ms (Verteidiger, kausal am Kontakt)" — bewusst NUR bei echtem Treffer gesetzt,
        // exakt derselbe Gate wie `knockback` direkt darüber (kein Kontakt = kein Reaktions-Feedback).
        defenderBoard.hitPoseUntil = now + POSE_HIT_MS;
      }
      // "whiff"/"shockSkip": kein Kontakt-FX am Verteidiger — der Schlag geht ins Leere.
    }

    /**
     * Welle 2 — vereint Wander/Einlauf/Sterben/Sieg/Angriffs-Choreografie/Reaktionen/Atmen zu EINER
     * finalen Board-Pose pro Frame. `fx==="off"|"reduced"` lässt jede POSITIONS-Bewegung aus (nur
     * `triggerHit`s Flash/Sparks/Shake bleiben je nach Stufe aktiv, s. dortige Gates) — Board bleibt
     * auf seinem Standplatz stehen, exakt wie die Reduced-Motion-Antwort des Auto-Battler-Motion-
     * Beweises ("fällt auf reinen Flash+Floater zurück, keine Bewegung"). Sterben/Einlauf bleiben
     * auch unter reduziertem FX als ZUSTAND bestehen (sonst bliebe ein besiegter Gegner für immer
     * voll sichtbar stehen) — sie springen dort nur OHNE Zwischenschritte sofort ans Ziel
     * (`p = fxMotion ? … : 1`), statt zu animieren.
     */
    function updateBoardVisual(board: Billboard, other: Billboard, now: number, fx: CombatFxLevel): void {
      const fxMotion = fx === "full";

      // Chef-Repro 04.08. ("Textur erscheint nur beim Sterben ... intermittierend je Spawn"):
      // "Billboard niemals rendern lassen bevor Textur+Baseline stehen" — solange `applyTexture`s
      // asynchroner Callback für DIESES Board noch nicht durch ist, bleibt es explizit unsichtbar
      // (statt mit Platzhalter-Skalierung/-Farbe zu rendern) UND jede Choreografie-Verarbeitung
      // (Wander/Angriff/Reaktionen) wird für diesen Frame übersprungen — sonst könnte z.B. ein
      // `board.attack`-Zyklus starten, bevor `board.motion`/`board.baseScaleX` aus der neuen Textur
      // aufgelöst sind. Sobald `applyTexture` fertig ist, kippt `textureReady` auf `true` und DER
      // NÄCHSTE Frame zeigt die Figur garantiert (kein zweiter Trigger/Zustand nötig).
      if (!board.textureReady) {
        board.mesh.visible = false;
        board.shadow.visible = false;
        return;
      }
      board.mesh.visible = true;
      board.shadow.visible = true;

      const dxCam = camera.position.x - board.mesh.position.x;
      const dzCam = camera.position.z - board.mesh.position.z;
      const yaw = Math.atan2(dxCam, dzCam);

      if (board.dying) {
        const p = fxMotion ? clamp01((now - board.dying.start) / board.dying.duration) : 1;
        const x = board.baseX + board.wanderX;
        const z = board.baseZ + board.wanderZ;
        board.mesh.position.set(x, board.feetOffset - p * 0.55, z);
        board.mesh.scale.set(board.baseScaleX, board.baseScaleY, 1);
        board.mesh.rotation.set(0, yaw, 0);
        // KRITISCH (Chef-Repro 04.08. Root-Cause, live per Debug-Attribute verifiziert — s.
        // Abschlussbericht "Diagnose"): das Material trägt `alphaTest: 0.35` (Cutout gegen den
        // transparenten Sprite-Rand, s. `makeBillboard`). Effektive Alpha pro Pixel = Textur-Alpha
        // × `material.opacity` — bei `opacity` UNTER 0.35 verwirft die GPU JEDEN Pixel, auch die
        // vollständig deckenden (Textur-Alpha=1 × 0.2 = 0.2 < 0.35), das Mesh wird KOMPLETT
        // unsichtbar statt nur transparenter zu wirken. Der alte Zielwert 0.2 unterschritt diese
        // Schwelle klar → genau das gemeldete "Chicken erst beim Sterben/danach unsichtbar" (die
        // ~600-900ms lange "gehaltene Leiche" VOR dem nächsten Einlauf waren komplett ausgeblendet).
        // Boden 0.55 statt 0.2 hält deutlichen Sicherheitsabstand zur 0.35-Schwelle (0.55 > 0.35 +
        // Marge), das Verblassen liest sich weiterhin klar über Farb-Abdunklung + Y-Sink.
        board.material.opacity = THREE.MathUtils.lerp(1, 0.55, p);
        board.material.color.copy(board.baseColor).lerp(new THREE.Color(0x2a2620), p * 0.85);
        // Schatten-Material trägt KEIN alphaTest (reines Alpha-Blending) — 0 ist hier unproblematisch.
        board.shadowMaterial.opacity = THREE.MathUtils.lerp(1, 0, p);
        board.shadow.position.set(x + board.footCenterOffsetX, 0.01, z);
        return;
      }

      if (board.entrance) {
        const p = fxMotion ? clamp01((now - board.entrance.start) / board.entrance.duration) : 1;
        const e = easeOutCubic(p);
        const x = THREE.MathUtils.lerp(board.entrance.fromX, board.entrance.toX, e);
        const bob = Math.abs(Math.sin(p * Math.PI * board.entrance.stepFreq * 2)) * board.entrance.bobAmp * (1 - p);
        board.mesh.position.set(x, board.feetOffset + bob, board.baseZ);
        board.mesh.scale.set(board.baseScaleX, board.baseScaleY, 1);
        board.mesh.rotation.set(0, yaw, 0);
        board.shadow.position.set(x + board.footCenterOffsetX, 0.01, board.baseZ);
        board.shadowMaterial.opacity = 1;
        if (p >= 1) board.entrance = null;
        return;
      }

      // Posen-Pilot (design/battle-040-pose-pilot.md): harter Textur-Swap NACH den Sterben-/Einlauf-
      // Sonderpfaden (die oben früh zurückkehren — "Sterben bleibt unverändert" ist dadurch
      // AUTOMATISCH erfüllt: `applyActivePose` wird für ein sterbendes/einlaufendes Board nie
      // erreicht) und VOR der finalen `mesh.scale.set`-Zeile unten, damit derselbe Frame schon die
      // NEUE Baseline/Aspect zeigt. Unter `fx==="off"` bleibt die Pose hart auf "idle" (spiegelt den
      // bestehenden "komplett aus"-Vertrag der fxLevel-Stufen, s. `CombatFxLevel`-JSDoc).
      applyActivePose(board, fx !== "off" ? computeActivePoseKey(board, now) : "idle");

      let dx = REST_POSE.dx;
      let dz = REST_POSE.dz;
      let tiltZRad = REST_POSE.tiltZRad;
      let scaleMult = REST_POSE.scaleMult;
      let extraY = 0;

      if (fxMotion) {
        if (!board.attack) updateWander(board, now);
        if (board.attack) {
          progressAttackPhase(board, now);
          // Lokales `const`-Alias statt wiederholtem `board.attack`-Zugriff: TS verwirft die
          // Nicht-null-Verengung eines Objekt-FELDS nach jedem Funktionsaufruf (der Aufruf könnte
          // es ja mutiert haben — `progressAttackPhase` tut das sogar tatsächlich, s. dortiges
          // JSDoc). Eine lokale Variable bleibt dagegen über Funktionsaufrufe hinweg verengt.
          const cycle = board.attack;
          if (cycle) {
            const pose = advanceAttackPose(cycle, now);
            dx += pose.dx;
            dz += pose.dz;
            tiltZRad += pose.tiltZRad;
            scaleMult *= pose.scaleMult;
            maybeSpawnProjectile(board, other, cycle, now);
          }
        }
        if (board.knockback) {
          const k = board.knockback;
          const kp = clamp01((now - k.start) / k.duration);
          if (kp >= 1) board.knockback = null;
          else dx += k.amp * Math.sin(kp * Math.PI);
        }
        if (board.dodge) {
          const d = board.dodge;
          const dp = clamp01((now - d.start) / d.duration);
          if (dp >= 1) board.dodge = null;
          else dz += d.amp * Math.sin(dp * Math.PI);
        }
        if (board.victory) {
          const v = board.victory;
          const vp = clamp01((now - v.start) / v.duration);
          if (vp >= 1) {
            board.victory = null;
          } else {
            const hop = Math.sin(vp * Math.PI);
            extraY += hop * 0.45;
            scaleMult *= 1 + hop * 0.08;
          }
        }
        // Idle-Atmen ENTFERNT (Chef-Entscheid 04.08.: „dieses Idle Breathing raus" — der Puls
        // wirkte auf den statischen Sprites unnatürlich). Das Idle-LAUERN (wanderX/wanderZ,
        // kleine Schritte im Radius) bleibt bewusst erhalten. breath*-Parameter in choreography.ts
        // bleiben als tote Werte stehen, falls der Chef es je zurückwill — hier ist der einzige
        // Anwendungsort.
      }

      const x = board.baseX + board.wanderX + dx;
      const z = board.baseZ + board.wanderZ + dz;
      board.mesh.position.set(x, board.feetOffset + extraY, z);
      board.mesh.scale.set(board.baseScaleX * scaleMult, board.baseScaleY * scaleMult, 1);
      board.mesh.rotation.set(0, yaw, tiltZRad);
      board.shadow.position.set(x + board.footCenterOffsetX, 0.01, z);
      board.shadowMaterial.opacity = 1;
      board.material.opacity = 1;

      if (board.flash) {
        const fp = clamp01((now - board.flash.start) / board.flash.duration);
        if (fp >= 1) {
          board.flash = null;
          board.material.color.copy(board.baseColor);
        } else {
          const intensity = Math.sin(fp * Math.PI); // ein-/ausschwingender Puls
          board.material.color.copy(board.baseColor).lerp(board.flash.color, intensity * 0.85);
        }
      } else {
        board.material.color.copy(board.baseColor);
      }
    }

    function frame(now: number): void {
      if (document.hidden) {
        running = false;
        return;
      }
      const dt = Math.min(0.05, (frame.lastT ? now - frame.lastT : 16) / 1000);
      frame.lastT = now;

      const p = propsRef.current;
      const fx = p.fxLevel;
      const fxMotion = fx === "full";
      const t = now * 0.001;

      // ── Bild-Wechsel erkennen (Auftrag Punkt 1 + Chef-Repro 04.08.) ──────────────────────────
      // Das war die fehlende Konsumenten-Seite von `Billboard.lastImgSrc` (s. dortiges JSDoc):
      // `applyTexture` lief bislang NUR einmal synchron beim Komponenten-Mount — ein Monsterwechsel
      // INNERHALB derselben gemounteten Arena (Dungeon-Welle, andere Monster-Karte/Elite-Variante)
      // lud nie eine neue Textur nach, das Board zeigte weiter die ALTE Figur (falsche Skalierung/
      // Fuß-Baseline für die neue Kreatur, im Extremfall ein für immer eingefrorenes totes Bild).
      // Ein simpler `!==`-Stringvergleich reicht (Vite-Asset-URLs sind stabile Strings pro Bild,
      // s. `getMonsterSrc`/`getPortrait` — keine neue Objektidentität pro Render).
      if (p.player.imgSrc !== playerBoard.lastImgSrc) applyTexture(playerBoard, p.player.imgSrc);
      if (p.monster.imgSrc !== monsterBoard.lastImgSrc) applyTexture(monsterBoard, p.monster.imgSrc);

      // ── Respawn DESSELBEN Monsters erkennen (Chef-Repro 04.08.) ─────────────────────────────
      // `dimmed` true→false = Kill-Cooldown gerade abgelaufen, der (evtl. identische) Gegner ist
      // wieder da — nur relevant, wenn textureReady bereits stand (sonst läuft applyTexture noch
      // sein eigenes Erst-Setup, ein zusätzlicher Reset hier wäre redundant/könnte race).
      const monsterDimmed = !!p.monster.dimmed;
      if (lastMonsterDimmed === true && monsterDimmed === false && monsterBoard.textureReady) {
        resetChoreographyForFreshEntrance(monsterBoard, monsterBoard.motion, now);
      }
      lastMonsterDimmed = monsterDimmed;

      // ── Kampf-Log-Diff (Auftrag Punkt 6) — treibt Angriffs-/Kontakt-/Kill-Choreografie ───────
      processNewCombatEvents(p.log, now, fx, p.playerStyle);
      if (fxMotion) {
        maybeStartPredictiveCycle(playerBoard, monsterBoard, p.playerStyle, 1, p.player.timerRemainingSec, now);
        maybeStartPredictiveCycle(monsterBoard, playerBoard, "melee", -1, p.monster.timerRemainingSec, now);
      }

      // ── Kamera: dezente Idle-Drift + Crit-Kick (beide NUR bei fxLevel "full") ───────────────
      let camX = 0;
      let camY = CAMERA_Y;
      if (fxMotion) {
        camX += Math.sin(t * 0.09) * 0.06;
        camY += Math.cos(t * 0.07) * 0.035;
        if (shake) {
          const sp = clamp01((now - shake.start) / shake.duration);
          if (sp >= 1) {
            shake = null;
          } else {
            const amp = (1 - sp) * 0.05;
            camX += Math.cos(shake.seed + sp * 30) * amp;
            camY += Math.sin(shake.seed + sp * 26) * amp * 0.6;
          }
        }
      }
      camera.position.set(camX, camY, CAMERA_Z);
      camera.lookAt(camX, CAMERA_LOOKAT_Y, CAMERA_LOOKAT_Z);

      // ── Figuren: eine Board-Pose pro Frame (Wander/Angriff/Reaktionen/Einlauf/Sterben/Atmen) ──
      updateBoardVisual(playerBoard, monsterBoard, now, fx);
      updateBoardVisual(monsterBoard, playerBoard, now, fx);

      // Reines QA-Anker-Attribut (s. `triggerHit`-JSDoc) — erlaubt Playwright, exakte Phasen
      // (Windup/Sprint/Hold/Return/Stagger/Entrance/Dying/Victory/Idle) abzuwarten statt zu raten.
      container!.dataset.a25PhasePlayer =
        playerBoard.attack?.phase ?? (playerBoard.dying ? "dying" : playerBoard.victory ? "victory" : playerBoard.entrance ? "entrance" : "idle");
      container!.dataset.a25PhaseMonster =
        monsterBoard.attack?.phase ?? (monsterBoard.dying ? "dying" : monsterBoard.victory ? "victory" : monsterBoard.entrance ? "entrance" : "idle");
      // Posen-Pilot: dasselbe QA-Anker-Prinzip für die AUFGETRAGENE Posen-Textur (nicht nur die
      // Choreographie-Phase) — erlaubt Playwright, `idle`→`windup`→`strike`/`hit`→`idle` exakt
      // abzuwarten statt eine feste Wartezeit zu raten (s. `Billboard.activePoseKey`-JSDoc).
      container!.dataset.a25PosePlayer = playerBoard.activePoseKey;
      container!.dataset.a25PoseMonster = monsterBoard.activePoseKey;

      // PointLight-Flacker klingt exponentiell ab.
      if (flicker.intensity > 0.01) flicker.intensity *= 0.88;
      else flicker.intensity = 0;

      if (fxMotion) {
        updateProjectile(now);
        updateSparks(sparkPool, dt);
      }

      // ── Schwebende HP-/Ward-Balken: 3D-Kopf-Position auf den Bildschirm projizieren ─────────
      const w = container!.clientWidth || 1;
      const h = container!.clientHeight || 1;
      // Kopf-Y relativ zur AKTUELLEN Fuß-Position (mesh.position.y trägt bereits feetOffset + Bob
      // aus dem Block oben) statt einer absoluten Konstante, die "Füße bei y=0" annahm — sonst
      // würden die Balken beim gemessenen Fuß-Offset (s. Chef-Anordnung oben) nicht mehr über dem
      // tatsächlich gezeichneten Kopf schweben.
      const playerHead = new THREE.Vector3(
        playerBoard.mesh.position.x,
        playerBoard.mesh.position.y + barAnchorHeight(playerBoard.figureHeight),
        playerBoard.mesh.position.z,
      );
      const monsterHead = new THREE.Vector3(
        monsterBoard.mesh.position.x,
        monsterBoard.mesh.position.y + barAnchorHeight(monsterBoard.figureHeight),
        monsterBoard.mesh.position.z,
      );
      const ps = worldToScreen(playerHead, camera, w, h);
      const ms = worldToScreen(monsterHead, camera, w, h);
      // Chef-Runde 3: Bildschirm-Clamp statt Anker-Dämpfung (s. barAnchorHeight-JSDoc) — die
      // Plakette hängt per translate(-50%,-100%) ÜBER dem Ankerpunkt, ihre reale Höhe kommt aus
      // dem DOM (offsetHeight liest kein Layout neu an, das Element bewegt sich nur per
      // transform). y darf nie kleiner werden als Plakettenhöhe + Marge.
      const clampPlateY = (anchorEl: HTMLDivElement | null, y: number): number => {
        const plateH = (anchorEl?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
        return Math.max(plateH + 6, y);
      };
      if (playerAnchorRef.current) {
        playerAnchorRef.current.style.transform = `translate(${ps.x}px, ${clampPlateY(playerAnchorRef.current, ps.y)}px)`;
      }
      if (monsterAnchorRef.current) {
        monsterAnchorRef.current.style.transform = `translate(${ms.x}px, ${clampPlateY(monsterAnchorRef.current, ms.y)}px)`;
      }

      // Task #330c Punkt 5: zweiter Anker-Satz auf Brusthöhe für die Schadens-/Heil-Floater
      // (dieselbe Projektions-Logik wie die HP-Balken, nur tiefer angesetzt — s.
      // FLOATER_ANCHOR_Y_FACTOR-Kommentar oben).
      const playerChest = new THREE.Vector3(
        playerBoard.mesh.position.x,
        playerBoard.mesh.position.y + playerBoard.figureHeight * FLOATER_ANCHOR_Y_FACTOR,
        playerBoard.mesh.position.z,
      );
      const monsterChest = new THREE.Vector3(
        monsterBoard.mesh.position.x,
        monsterBoard.mesh.position.y + monsterBoard.figureHeight * FLOATER_ANCHOR_Y_FACTOR,
        monsterBoard.mesh.position.z,
      );
      const pfs = worldToScreen(playerChest, camera, w, h);
      const mfs = worldToScreen(monsterChest, camera, w, h);
      if (playerFloaterAnchorRef.current) playerFloaterAnchorRef.current.style.transform = `translate(${pfs.x}px, ${pfs.y}px)`;
      if (monsterFloaterAnchorRef.current) monsterFloaterAnchorRef.current.style.transform = `translate(${mfs.x}px, ${mfs.y}px)`;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(frame);
    }
    frame.lastT = 0;

    function startLoop(): void {
      if (running || document.hidden) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    }
    startLoop();

    function onVisibilityChange(): void {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        running = false;
      } else {
        frame.lastT = 0;
        startLoop();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            const mat = m as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.PointsMaterial;
            mat.map?.dispose();
            mat.dispose();
          }
        } else if (obj instanceof THREE.Sprite) {
          // Task #330c: sunGlow-Sprite (Punkt 4) ist kein Mesh/Points — eigener Zweig, sonst leakt
          // seine CanvasTexture bei jedem Mount/Unmount (StrictMode-Dev-Doppelaufruf macht das
          // sichtbar häufig).
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      renderer.dispose();
    };
    // Bewusst NUR `props.zoneId` als Dependency (nicht `[]` mehr seit 0.4.0-Arena Welle 1) —
    // Live-Kampf-Werte laufen weiterhin über propsRef (s. Modul-JSDoc), ein Neuaufbau der ganzen
    // Three.js-Szene bei jedem Combat-Tick (10×/s) wäre nach wie vor ein Kontext-Leck/Ruckler.
    // `zoneId` ändert sich dagegen NIE innerhalb eines Kampf-Ticks, nur wenn der Spieler tatsächlich
    // in einer anderen (ebenfalls arena-fähigen) Zone kämpft — das ist selten genug, dass ein
    // kompletter Cleanup+Rebuild (identischer Code-Pfad wie ein normaler Mount/Unmount, s.
    // Cleanup-Funktion oben) die einfachste UND sicherste Art ist, den Chef-Auftrag "Wechsel der
    // Zone = Manifest-Swap ohne Reload" zu erfüllen — kein zweiter, fein-granularer Diff-Effect
    // nötig, der Boden/Kulisse/Licht/Props separat nachziehen müsste (mehr Fläche für Bugs).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.zoneId]);

  return (
    <div className="a25-root" ref={containerRef}>
      {/* Task #330b: Chef stand vor der klassischen 2D-Ansicht und hielt das geänderte
          Hintergrundbild für den Prototyp — dieses Badge macht "3D-Szene ist aktiv" auf einen
          Blick erkennbar. Dev-only (dieser ganze Ordner mountet nie in einem Produktions-Build,
          s. flag.ts ARENA25D_SUPPORTED), bewusst kein i18n-Key (Prototyp-Instrumentierung,
          verschwindet mit dem Ordner). */}
      <div className="a25-badge">2.5D ARENA — PROTOTYP [Strg+Umschalt+A / Strg+Umschalt+Y]</div>
      <canvas className="a25-canvas" ref={canvasRef} />
      <div className="a25-bar-anchor" ref={playerAnchorRef}>
        <NameplateOverlay fighter={props.player} hpKind="hp" />
      </div>
      <div className="a25-bar-anchor" ref={monsterAnchorRef}>
        <NameplateOverlay fighter={props.monster} hpKind="enemy-hp" dimmed={props.monster.dimmed} />
      </div>
      {/* Task #330c Punkt 5: eigene Anker-Ebene für die Schadens-/Heil-Floater — NACH den HP-Ankern
          im DOM, damit sie im Zweifel darüber liegen (Stacking-Reihenfolge = DOM-Reihenfolge, s.
          styles.ts, `.a25-root` selbst setzt nur den gemeinsamen z-index:2 gegen den Rest der Seite). */}
      <div className="a25-bar-anchor" ref={playerFloaterAnchorRef}>
        <FloaterList floaters={props.player.floaters ?? []} />
      </div>
      <div className="a25-bar-anchor" ref={monsterFloaterAnchorRef}>
        <FloaterList floaters={props.monster.floaters ?? []} />
      </div>
      {/* Task #330d Punkt 8: dieselbe `KillSummaryCard`-Instanz wie die 2D-Ansicht, von CombatPage
          fertig gerendert durchgereicht (s. `Arena25DStageProps.killSummary`-JSDoc) — `.a25-root`
          ist bereits `position:absolute`, die Karte zentriert sich über ihr eigenes CSS selbst. */}
      {props.killSummary}
    </div>
  );
}
