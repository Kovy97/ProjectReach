import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";
import type { GameState } from "@hearthforge/shared";
import { createGame } from "@hearthforge/engine";
import { deserialize, serialize } from "./index";

/**
 * Früh-Garantie-Suffix-Persistenz (SAVE_VERSION 72, selber Bump — Chef-GO 2026-07-22 „Identitäts-
 * Paket" + Save-Kompat-GESETZ):
 *  - Alt-Saves (< 72, Feld fehlt) erhalten `firstSuffixGranted: true` (KEINE nachträgliche
 *    Garantie für Bestandsspieler).
 *  - Frische Saves (`createGame`) starten mit `false` (die Garantie ist scharf).
 *  - sanitize härtet STRIKT auf boolean; jeder Nicht-boolesche Wert (Save-Edit/Korruption) fällt
 *    KONSERVATIV auf `true` zurück (kein Wiederhol-Exploit über editierte Saves).
 */

/** Fester Zeitstempel für serialize UND deserialize — kein Offline-Catch-up-Tick im Test. */
function roundTrip(s: GameState): GameState {
  const now = 1_000_000;
  const r = deserialize(serialize(s, now), content, now);
  expect(r).not.toBeNull();
  return r!.state;
}

describe("Früh-Garantie-Suffix-Persistenz (SAVE 72)", () => {
  it("Migration (Feld fehlt, Alt-Save-Shape): erhält firstSuffixGranted true (keine nachträgliche Garantie)", () => {
    const s = createGame({ name: "Alt" }, content, 42);
    delete (s as Partial<GameState>).firstSuffixGranted; // v71-Shape simulieren
    const loaded = roundTrip(s);
    expect(loaded.firstSuffixGranted).toBe(true);
  });

  it("frischer Save (createGame): startet mit false und bleibt es über einen unveränderten Round-Trip", () => {
    const s = createGame({ name: "Neu" }, content, 42);
    expect(s.firstSuffixGranted).toBe(false);
    const loaded = roundTrip(s);
    expect(loaded.firstSuffixGranted).toBe(false);
    expect(roundTrip(loaded).firstSuffixGranted).toBe(false);
  });

  it("Round-Trip erhält ein bereits gewährtes true verlustfrei (idempotent)", () => {
    const s = createGame({ name: "Beschenkt" }, content, 42);
    s.firstSuffixGranted = true;
    const loaded = roundTrip(s);
    expect(loaded.firstSuffixGranted).toBe(true);
    expect(roundTrip(loaded).firstSuffixGranted).toBe(true);
  });

  it("sanitize STRIKT: Nicht-boolesche Werte (Save-Edit/Korruption) fallen KONSERVATIV auf true zurück", () => {
    for (const bad of ["false", 0, null, undefined, {}, []]) {
      const s = createGame({ name: "Editor" }, content, 42);
      (s as unknown as Record<string, unknown>).firstSuffixGranted = bad;
      const loaded = roundTrip(s);
      expect(loaded.firstSuffixGranted, `Wert ${JSON.stringify(bad)}`).toBe(true);
    }
  });

  it("ein legitimes false übersteht sanitize unangetastet (kein Downgrade auf true ohne Grund)", () => {
    const s = createGame({ name: "Neu" }, content, 42);
    (s as unknown as Record<string, unknown>).firstSuffixGranted = false;
    const loaded = roundTrip(s);
    expect(loaded.firstSuffixGranted).toBe(false);
  });
});
