import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import { createGame } from "./state";
import { advanceGuide, finishGuide, restartGuide } from "./onboarding";

function newGame() {
  return createGame({ name: "Held" }, content, 1);
}

describe("onboarding guide state", () => {
  it("neuer Spielstand startet den Guide (active, step 0, nicht done)", () => {
    const s = newGame();
    // Neue Spieler haben die Versions-Touren (`featureTourV1` + `featureTourV2`) vorab als gesehen
    // markiert → „Was ist neu"-Touren feuern nur für Alt-Saves, nicht für frische Spielstände
    // (Chef 2026-07-21; V2 = New-Haven-Rundgang 0.3.0, 2026-08-03).
    expect(s.onboarding).toEqual({
      active: true, step: 0, done: false,
      toursSeen: { featureTourV1: true, featureTourV2: true },
    });
  });

  it("advanceGuide erhöht nur den Schritt", () => {
    const s = newGame();
    advanceGuide(s);
    expect(s.onboarding).toEqual({
      active: true, step: 1, done: false,
      toursSeen: { featureTourV1: true, featureTourV2: true },
    });
    advanceGuide(s);
    expect(s.onboarding.step).toBe(2);
    // active/done unberührt.
    expect(s.onboarding.active).toBe(true);
    expect(s.onboarding.done).toBe(false);
  });

  it("finishGuide beendet + markiert erledigt (active=false, done=true)", () => {
    const s = newGame();
    advanceGuide(s);
    advanceGuide(s);
    finishGuide(s);
    expect(s.onboarding.active).toBe(false);
    expect(s.onboarding.done).toBe(true);
    // step bleibt beim Beenden stehen.
    expect(s.onboarding.step).toBe(2);
  });

  it("restartGuide setzt vollständig zurück (active, step 0, nicht done, Touren frisch)", () => {
    const s = newGame();
    advanceGuide(s);
    s.onboarding.toursSeen["combat"] = true;
    finishGuide(s);
    restartGuide(s);
    // Voller Reset inkl. Bereichs-Touren („Tutorial neu starten" heißt ALLES nochmal) — die Bereichs-
    // Tour „combat" ist wieder frisch. Nur die einmaligen Versions-Touren (`featureTourV1`/`V2`)
    // bleiben als gesehen markiert: sie gehören nicht zum Tutorial, sondern sind „Was ist neu"-Hinweise.
    expect(s.onboarding).toEqual({
      active: true, step: 0, done: false,
      toursSeen: { featureTourV1: true, featureTourV2: true },
    });
  });

  it("advance/finish/restart mutieren in-place und geben denselben State zurück", () => {
    const s = newGame();
    expect(advanceGuide(s)).toBe(s);
    expect(finishGuide(s)).toBe(s);
    expect(restartGuide(s)).toBe(s);
  });
});
