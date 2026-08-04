import { useEffect } from "react";
import { advanceGuide, finishGuide } from "@hearthforge/engine";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPortrait } from "../portraits";
import { ONBOARDING_STEPS } from "../onboarding-steps";
import { SpotlightGuide } from "./SpotlightGuide";

/**
 * Spotlight-Guide (Etappe 1: System + Topbar). Ersetzt das alte 21-Schritt-Modal
 * (`components/Onboarding.tsx`, bleibt unangetastet im Baum liegen, wird aber nicht mehr
 * gerendert). Nur innerhalb von `MainLayout` gemountet (App.tsx) — kein App-Root-Risiko.
 *
 * Ablauf: `state.onboarding.active` steuert Sichtbarkeit, `state.onboarding.step` indiziert
 * `ONBOARDING_STEPS`. Die eigentliche Spotlight-/Sprechblasen-Darstellung + Positionierungs-
 * Mathematik sitzt seit Welle B (Chef-Auftrag „Onboarding fertig machen", 2026-07-13) in
 * `SpotlightGuide` (geteilt mit den drei Bereichs-Erst-Touren, s. AreaTourGuide.tsx) — dieser
 * Component hält nur noch den Schritt-Fortschritt (`state.onboarding`, Engine-Verben
 * advanceGuide/finishGuide) und übersetzt ihn in SpotlightGuide-Props. Schritt-Registry/Spotlight-
 * Ziele unverändert (nur die Präsentation der Sprechertexte zog um): Sprecherin ist jetzt Brenna
 * (Platzhalter-Porträt + -Name, s. game-design.md „Brenna als Platzhalter-Charakter").
 */
export interface OnboardingGuideProps {
  /** Öffnet den Bug-Report-Dialog (Report-Bug-Feature, Chef-Auftrag 2026-07-18) — der Dialog selbst
   *  lebt bewusst EINE Ebene höher (MainLayout, s. App.tsx), damit ein Escape/Skip, das den Guide
   *  schließt (`active` → false, dieser Component gibt dann `null` zurück), einen bereits offenen
   *  Dialog NICHT mit unmountet. Nur am letzten Schritt verdrahtet (s. `secondaryAction` unten). */
  onOpenBugReport?: () => void;
}

export function OnboardingGuide({ onOpenBugReport }: OnboardingGuideProps): JSX.Element | null {
  const state = useGameState();
  const { t } = useI18n();
  const { active, step } = state.onboarding;
  const stepDef = active ? ONBOARDING_STEPS[step] ?? null : null;

  // Defensiv: aktiver Guide zeigt auf einen Schritt-Index außerhalb der Registry (z.B. ein
  // Spielstand, dessen Fortschritt vor einer künftigen Registry-Kürzung lag) → sauber beenden
  // statt auf einen leeren/kaputten Schritt zu rendern.
  useEffect(() => {
    if (active && !stepDef) finishGuide(state);
  }, [active, stepDef, state]);

  if (!active || !stepDef) return null;

  const isLast = step === ONBOARDING_STEPS.length - 1;
  const onAdvance = (): void => {
    if (isLast) finishGuide(state);
    else advanceGuide(state);
  };

  return (
    <SpotlightGuide
      guideId={stepDef.guideId}
      title={t(`${stepDef.textKey}.title`)}
      body={t(`${stepDef.textKey}.body`)}
      requireAction={!!stepDef.requireAction}
      onAdvance={onAdvance}
      onRequireActionClick={() => advanceGuide(state)}
      onSkip={() => finishGuide(state)}
      skipLabel={t("onboarding.skip")}
      continueLabel={isLast ? t("onboarding.guide.gotIt") : t("onboarding.next")}
      hintLabel={t("onboarding.guide.clickHint")}
      speakerName={t("npc.guide.name")}
      speakerPortraitSrc={getPortrait("npc_warden")}
      secondaryAction={
        isLast && onOpenBugReport ? { label: t("about.bugReport"), onClick: onOpenBugReport } : undefined
      }
    />
  );
}
