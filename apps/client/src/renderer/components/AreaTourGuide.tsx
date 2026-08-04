import { useState } from "react";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getPortrait } from "../portraits";
import type { AreaTourStepDef } from "../areaTourSteps";
import { SpotlightGuide } from "./SpotlightGuide";

export interface AreaTourGuideProps {
  /** Persistenz-Schlüssel in `state.onboarding.toursSeen` (z.B. "combat"/"shop"/"bank"). */
  tourKey: string;
  steps: AreaTourStepDef[];
}

/**
 * Bereichs-Erst-Tour (Chef-Auftrag „Onboarding fertig machen" Welle B, 2026-07-13): kurzer
 * Spotlight-Rundgang, der beim JEWEILS ERSTEN Besuch von Kampf/Shop/Bank läuft — auf demselben
 * Spotlight-System wie der Haupt-Guide (SpotlightGuide.tsx), aber mit eigenem, rein lokalem
 * Schritt-Fortschritt (kein Engine-State nötig — die Tour ist kurz genug, dass ein Verlassen der
 * Seite mitten in der Tour sie einfach von vorn beginnen lässt statt einen Fortschritt zu
 * persistieren).
 *
 * Trigger/Gating: NUR wenn der Haupt-Guide gerade NICHT läuft (`!state.onboarding.active` — der
 * hat Vorrang, keine zwei Spotlights gleichzeitig) UND diese Tour noch nie gesehen wurde
 * (`!state.onboarding.toursSeen[tourKey]`). Abschluss (letzter „Weiter"-Klick) ODER Skip setzen
 * `toursSeen[tourKey] = true` — einmalig für immer, per Chef-Vorgabe direkt gesetzt (kein
 * eigenes Engine-Verb nötig, s. shared/index.ts OnboardingState.toursSeen-Doc). Die Mutation
 * greift wie jede andere State-Mutation erst beim nächsten Game-Loop-Tick (~100ms, s.
 * GameContext.tsx) — exakt dasselbe Timing wie der bestehende Haupt-Guide-Skip
 * (OnboardingGuide.tsx `finishGuide`), kein Sonderfall.
 */
export function AreaTourGuide({ tourKey, steps }: AreaTourGuideProps): JSX.Element | null {
  const state = useGameState();
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const visible = !state.onboarding.active && !state.onboarding.toursSeen[tourKey] && step < steps.length;
  if (!visible) return null;

  const stepDef = steps[step]!;
  const isLast = step === steps.length - 1;

  const finish = (): void => {
    state.onboarding.toursSeen[tourKey] = true;
  };
  const onAdvance = (): void => {
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  return (
    <SpotlightGuide
      guideId={stepDef.guideId}
      title={t(`${stepDef.textKey}.title`)}
      body={t(`${stepDef.textKey}.body`)}
      requireAction={false}
      onAdvance={onAdvance}
      onSkip={finish}
      skipLabel={t("onboarding.skip")}
      continueLabel={isLast ? t("onboarding.guide.gotIt") : t("onboarding.next")}
      hintLabel={t("onboarding.guide.clickHint")}
      speakerName={t("npc.guide.name")}
      speakerPortraitSrc={getPortrait("npc_warden")}
    />
  );
}
