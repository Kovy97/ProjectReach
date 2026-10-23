import { describe, expect, it } from "vitest";
import { content } from "@hearthforge/content";

/**
 * Dauer-Wache: Fernkampfwaffen sind zweihaendig.
 *
 * Vorgeschichte (Spieler-Report 23.08.2026 zu 1.0.0): Ein Spieler konnte Bogen UND Schild
 * gleichzeitig tragen und hat selbst gefragt, ob das so gemeint sei. Ursache war keine
 * Design-Entscheidung, sondern Datendrift: 12 der 47 Fernkampfwaffen trugen `twoHanded: true`
 * (die handgepflegten Unikate), die 35 aus der Tier-Leiter nicht. Dieselbe Waffenklasse hatte
 * damit zwei verschiedene Regeln, je nachdem, welches Exemplar man gerade fand.
 *
 * Die Regel lautet ab 1.0.2: JEDE Fernkampfwaffe belegt beide Haende. Das schliesst die
 * Knechts-Schleuder ein — sie ist mechanisch ein `weaponType: "shortbow"` und wuerde als
 * einzige Ausnahme genau die Inkonsistenz zurueckbringen, die dieser Test verhindern soll.
 * Nahkampf und Magie behalten bewusst ihre Mischung (Einhaender + Schild/Fokus ist dort
 * gewollt), deshalb prueft der Test nur `ranged`.
 */
describe("Haendigkeit der Waffen", () => {
  it("jede Fernkampfwaffe ist zweihaendig", () => {
    const einhaendig = Object.values(content.items)
      // claude:2026-10-24T21:05:00+02:00 — Köcher (1.4.0 FK) sind die Nebenhand der Bögen, keine Fernkampfwaffe für die Haupthand.
      .filter((i) => i.weaponStyle === "ranged" && !i.twoHanded && i.weaponType !== "quiver")
      .map((i) => i.id);
    expect(
      einhaendig,
      `Diese Fernkampfwaffen erlauben eine Schildhand — s. Doku oben:\n${einhaendig.join(", ")}`,
    ).toEqual([]);
  });

  it("keine Fernkampfwaffe sitzt im Schildslot", () => {
    const imOffhand = Object.values(content.items)
      .filter((i) => i.weaponStyle === "ranged" && i.slot === "offhand" && i.weaponType !== "quiver")
      .map((i) => i.id);
    expect(imOffhand).toEqual([]);
  });
});
