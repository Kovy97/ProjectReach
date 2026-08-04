import { useEffect, useRef, useState } from "react";
import { useGameControl, useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPortrait } from "../portraits";
import type { AreaTourStepDef } from "../areaTourSteps";
import { SpotlightGuide } from "./SpotlightGuide";

export interface FeatureTourGuideProps {
  /** Persistenz-Schlüssel in `state.onboarding.toursSeen` (z.B. "featureTourV1"/"featureTourV2"),
   *  s. shared/index.ts `OnboardingState.toursSeen`-Doc. Jede Update-Tour bekommt ihren EIGENEN,
   *  neuen Key statt einen bestehenden wiederzuverwenden (`newGameOnboarding()`-Kommentar). */
  tourKey: string;
  steps: AreaTourStepDef[];
  /** Optional: diese Tour startet erst, wenn `toursSeen[requiresTourKey]` bereits `true` ist —
   *  verkettet Update-Touren hintereinander (s. `areaTourSteps.ts` FEATURE_TOUR_STEPS_V2-Doc). */
  requiresTourKey?: string;
}

/**
 * Versions-„Was ist neu"-Tour (Chef-Auftrag 2026-07-21, generalisiert Release-Fix-Welle Agent B
 * Befund B4-2/B4-3, 2026-08-03) — Vorlage AreaTourGuide.tsx, aber mit drei Unterschieden:
 *  - eigener Persistenz-Key PRO INSTANZ (`tourKey`-Prop statt fest verdrahtet) + global in
 *    App.tsx (MainLayout) gemountet statt seiten-lokal, da die beworbenen Ziele (Action-Queue-
 *    Panel, Sidebar-Resize-Rand, Sidebar-Nav-Einträge) globales Chrome sind. Zwei Instanzen laufen
 *    nebeneinander (v1 + v2, s. App.tsx) — genau EINE kann je Save gleichzeitig sichtbar sein
 *    (`requiresTourKey` verkettet sie: v2 startet erst, wenn v1s `toursSeen`-Marker gesetzt ist).
 *  - die interaktiven Schritte (`requireAction`) verlangen die wirkliche Aktion (Queue aufklappen,
 *    Sidebar-Rand ziehen, New-Haven-Sidebar-Eintrag klicken) statt nur „Weiter" zu drücken.
 *  - **B4-2-Fix**: zusätzliches Gate gegen den Offline-Report — solange `offlineSummary` (aus
 *    `useGameControl()`) gesetzt ist, bleibt JEDE Tour unsichtbar. Vorher konnten Tour-Overlay und
 *    OfflinePopup gleichzeitig feuern (beide reagieren nur auf `onboarding.active`), die Tour lag
 *    dann über der Beute-Liste und blockierte "Einsammeln" bis zum Tour-Skip. Die Tour startet
 *    jetzt automatisch NACH `dismissOffline()` (derselbe Re-Render-Zyklus setzt `offlineSummary`
 *    auf `null`), kein Extra-Verb nötig.
 *
 * Gating: NUR wenn der Haupt-Guide nicht läuft (`!state.onboarding.active`, hat Vorrang, exakt
 * dieselbe Priorität wie AreaTourGuide), der Offline-Report NICHT offen ist, ein optionales
 * `requiresTourKey` bereits erfüllt ist UND diese Tour noch nie gesehen wurde. Abschluss ODER Skip
 * setzen `toursSeen[tourKey] = true` — einmalig für immer.
 *
 * Vorrück-Mechanik pro interaktivem Schritt:
 *  - normale Klick-Ziele (z.B. "feature.queueExpand", "sidebar.newhaven"): SpotlightGuides
 *    eingebauter `onRequireActionClick`-Klick-Listener (Mousedown UND Mouseup auf demselben
 *    Element, kein Drag) reicht hier vollständig aus.
 *  - "feature.sidebarResize" (Rand-Handle, Sidebar.tsx `.sb-resize-handle`): wird per DRAG
 *    bedient — Mousedown auf dem Handle, Mouseup meist weit entfernt (der Rand wird ja gerade
 *    breiter/schmaler gezogen). Browser feuern das nachfolgende `click`-Event dann (falls
 *    überhaupt) auf dem gemeinsamen Vorfahren von Mousedown-/Mouseup-Ziel statt auf dem Handle
 *    selbst — SpotlightGuides Klick-Listener (`target.closest(guideId)`, ausgehend vom
 *    `click`-Event-Target) würde diesen Schritt darum nie zuverlässig auslösen. Der zusätzliche
 *    `mousedown`-Listener unten (capture) auf demselben `data-guide-id`-Ziel umgeht das robust:
 *    Mousedown ist bei JEDER Interaktion (einfacher Klick UND Drag-Start) immer der exakte erste
 *    Event auf dem echten Zielelement, ganz ohne den eigentlichen Resize (Sidebar.tsx
 *    `handleResizeStart`) anzufassen oder zu duplizieren. Guideid-gebunden (nicht tourKey-
 *    gebunden) — funktioniert unverändert für jede Instanz, die diesen Schritt nutzt.
 */
export function FeatureTourGuide({ tourKey, steps, requiresTourKey }: FeatureTourGuideProps): JSX.Element | null {
  const state = useGameState();
  const { offlineSummary } = useGameControl();
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const gateOk = !requiresTourKey || !!state.onboarding.toursSeen[requiresTourKey];
  const visible =
    !state.onboarding.active &&
    !offlineSummary &&
    gateOk &&
    !state.onboarding.toursSeen[tourKey] &&
    step < steps.length;
  const stepDef = visible ? steps[step]! : null;
  const isLast = step === steps.length - 1;

  const finish = (): void => {
    state.onboarding.toursSeen[tourKey] = true;
  };
  const advance = (): void => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  // `advanceRef` hält immer die neueste `advance`-Closure, ohne den Mousedown-Listener unten bei
  // jedem Render neu zu (de)registrieren (gleiches Muster wie `onSkipRef` in SpotlightGuide.tsx).
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  // s. JSDoc oben: robustes Mousedown-Vorrücken NUR für den Sidebar-Resize-Schritt (dessen
  // Interaktion ein Drag ist). Nur aktiv, während genau dieser Schritt sichtbar ist.
  const guideId = stepDef?.guideId ?? null;
  useEffect(() => {
    if (guideId !== "feature.sidebarResize") return;
    const onDocMouseDown = (e: MouseEvent): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(`[data-guide-id="${guideId}"]`)) advanceRef.current();
    };
    document.addEventListener("mousedown", onDocMouseDown, true);
    return () => document.removeEventListener("mousedown", onDocMouseDown, true);
  }, [guideId]);

  if (!stepDef) return null;

  return (
    <SpotlightGuide
      guideId={stepDef.guideId}
      title={t(`${stepDef.textKey}.title`)}
      body={t(`${stepDef.textKey}.body`)}
      requireAction={!!stepDef.requireAction}
      onAdvance={advance}
      onRequireActionClick={advance}
      onSkip={finish}
      skipLabel={t("onboarding.skip")}
      continueLabel={isLast ? t("onboarding.guide.gotIt") : t("onboarding.next")}
      hintLabel={t("onboarding.guide.clickHint")}
      speakerName={t("npc.guide.name")}
      speakerPortraitSrc={getPortrait("npc_warden")}
    />
  );
}
