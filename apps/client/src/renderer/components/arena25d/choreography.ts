/**
 * 0.4.0-Arena, Logik-Welle 2 (Chef-Klarstellung 2026-08-03/04, s. design/battle-040-arena-produktion.md
 * §5 Punkt 2 — "Choreografie IN der Arena = Bewegung im RAUM"): reine Konstanten-/Mathe-Bausteine für
 * die Kampf-Choreografie — Windup→Sprint→Clash→Return (Melee), Lehne+Projektil (Ranged/Magie),
 * Dodge-Sidestep, Schock-Stagger, Idle-Atmen, Einlauf. Bewusst von Arena25DStage.tsx getrennt: reine
 * Zahlen/Funktionen OHNE three.js-Abhängigkeit — Auftrag Punkt 8 verlangt "Gewichtsklassen-Parameter
 * im Code zentral, ggf. später ins Manifest" — ein eigenes, kleines Modul ist der Ort dafür, an dem
 * ein künftiger Manifest-Anschluss (Werte statt Konstanten) am wenigsten anfassen müsste.
 *
 * WICHTIG zur Herkunft der Zahlen: der Auftrag verlangt "Timing-/Kausalitäts-Sprache kommt 1:1 aus
 * dem Motion-Beweis" (design/mockups/battle-autobattler-2026-08-03/script.js) — das gilt für die
 * PHASEN-REIHENFOLGE und die ungefähre Zeit-GRÖSSENORDNUNG (Windup ~350ms/Dash ~120ms/Return ~260ms),
 * NICHT für die dortigen Pixel-Amplituden (der Beweis war ein 2D-DOM-`translateX`-Rig, hier bewegen
 * wir echte three.js-Weltkoordinaten in einer 18×9.5-Einheiten-Bodenfläche — es gibt keine sinnvolle
 * 1:1-Pixel→Welteinheit-Umrechnung). Amplituden sind hier frisch in Welteinheiten kalibriert.
 */

export type WeightClass = "small" | "medium" | "boss";

/**
 * Grobe Gewichtsklasse aus der Gegner-Maximal-HP hergeleitet (rein renderer-seitige Heuristik, KEIN
 * Content-Feld — Auftrag Punkt 8 erlaubt genau das: "im Code zentral, ggf. SPÄTER ins Manifest").
 * Schwellen empirisch gegen die reale Content-HP-Verteilung gewählt (packages/content/src/index.ts
 * `maxHp`, real beobachtete Spanne 3..8700): die meisten frühen Kritter (Huhn/Ratte/…) liegen <50hp,
 * die meisten regulären Zonen-Gegner zwischen 50 und 800hp, echte Bosse/Elite-/Dungeon-Encounter
 * liegen deutlich darüber (734..8700 in der Stichprobe). Rein KOSMETISCH (Atem-/Angriffstempo/
 * Rückstoß/Einlauf-Dauer) — beeinflusst NIE Trefferchance/Schaden/Balance, reiner Lesezugriff auf
 * einen bereits vorhandenen Anzeige-Wert (`Arena25DFighter.hpMax`).
 */
export function classifyMonsterWeight(hpMax: number): WeightClass {
  if (!Number.isFinite(hpMax) || hpMax < 50) return "small";
  if (hpMax >= 800) return "boss";
  return "medium";
}

/** Alle Zeit-/Amplituden-Parameter, die eine Gewichtsklasse (oder der Spieler) für die volle
 *  Choreografie braucht. Bewusst EIN flaches Interface für Monster UND Spieler (statt zweier
 *  Teil-Typen) — Dodge/Lehne-Felder bleiben beim Gegner ungenutzt (Gegner haben laut MonsterDef nie
 *  einen `style`, greifen also nie ranged/magisch an; `missReason:"dodge"` betrifft laut
 *  shared/index.ts JSDoc immer den SPIELER als Ausweichenden), das ist harmlos toter Wert statt
 *  eines zweiten Typs mit mehr Umbau-Fläche. */
export interface MotionParams {
  /** Größen-Multiplikator ggü. der Rollen-Basishöhe (PLAYER_FIGURE_HEIGHT/MONSTER_FIGURE_HEIGHT in
   *  Arena25DStage.tsx) — verstärkt den Gewichtsklassen-Eindruck leicht, OHNE die Chef-abgenommene
   *  Basis-Größe (Task #330d Punkt 3) zu überschreiben (medium === 1, keine Regression für Pastures). */
  sizeMult: number;
  // ── Idle-Atmen (Auftrag Punkt 2) ────────────────────────────────────────────────────────────
  breathScaleAmp: number;
  breathYAmp: number;
  breathPeriodMs: number;
  // ── Melee-Zyklus: Windup → Sprint → Hold (Kontakt-Dwell) → Return (Auftrag Punkt 3) ─────────
  windupMs: number;
  windupCritMs: number;
  sprintMs: number;
  sprintCritMs: number;
  holdMs: number;
  holdCritMs: number;
  returnMs: number;
  returnCritMs: number;
  /** Rücklehn-Amplitude (Welteinheiten X) am Ende des Windups. */
  windupAmp: number;
  windupCritAmp: number;
  /** Vorlehn-Winkel (Grad) beim Sprint — nur Kosmetik/Rotation, kein Kollisions-Belang. */
  sprintTiltDeg: number;
  // ── Rückstoß, wenn DIESE Gewichtsklasse den Treffer EINSTECKT (Auftrag Punkt 3, "Recoil +
  //    Knockback ENTLANG der Fläche") — Amplitude ist eine Eigenschaft des GETROFFENEN, nicht des
  //    Angreifers (leichte Kreatur fliegt weiter zurück als ein Boss bei gleicher Wucht). ────────
  knockAmp: number;
  knockCritAmp: number;
  /** Dauer des Rückstoß-Impulses (ms, Hin- UND Rückschwung) — leichte Kreaturen taumeln kürzer/
   *  schneller zurück, ein Boss braucht länger, um die Wucht zu absorbieren. */
  knockMs: number;
  knockCritMs: number;
  // ── Schock-Stagger (Auftrag Punkt 7: "kurzes Zucken/Stagger statt Dash") ────────────────────
  staggerMs: number;
  staggerAmp: number;
  // ── Dodge-Sidestep (Auftrag Punkt 7: "seitlicher Ausweich-Step") ────────────────────────────
  dodgeMs: number;
  dodgeAmp: number;
  // ── Ranged/Magie: Lehne + Glow am Standplatz (Auftrag Punkt 4) ──────────────────────────────
  leanMs: number;
  leanCritMs: number;
  leanAmp: number;
  leanCritAmp: number;
  // ── Einlauf (Auftrag Punkt 1) ────────────────────────────────────────────────────────────────
  entranceMs: number;
  /** Schritt-Frequenz (Hz) des Auf-und-ab-„Gehgefühls" während des Einlaufs. */
  entranceStepFreq: number;
  entranceBobAmp: number;
  // ── Idle-Lauern (Chef-Feedback-Punkt 4, 04.08.: "kleine LAUF-Bewegungen ... Kämpfer belauern
  //    sich") — kein Sinus-"Atmen" mehr, sondern ein echter kleiner Positions-Walk um den
  //    Standplatz: alle `wanderStep{Min,Max}Ms` wird ein neuer Zielpunkt innerhalb der Radien
  //    gewählt und dorthin geeast (s. Arena25DStage.tsx `updateWander`). Radius X (entlang der
  //    Duell-Achse) bewusst größer als Z (Tiefe) — seitliches "Umkreisen" liest sich als Belauern,
  //    ein Schritt Richtung/weg vom Gegner zu früh sähe wie ein angebrochener Angriff aus. ───────
  wanderRadiusX: number;
  wanderRadiusZ: number;
  wanderStepMinMs: number;
  wanderStepMaxMs: number;
}

/** Startwerte "medium" — Basislinie, an die auch der Spieler stark angelehnt ist (s. PLAYER_PARAMS). */
const MEDIUM: MotionParams = {
  sizeMult: 1,
  breathScaleAmp: 0.02,
  breathYAmp: 0.035,
  breathPeriodMs: 2100,
  windupMs: 350,
  windupCritMs: 350,
  sprintMs: 120,
  sprintCritMs: 100,
  holdMs: 70,
  holdCritMs: 90,
  returnMs: 260,
  returnCritMs: 300,
  windupAmp: 0.16,
  windupCritAmp: 0.22,
  sprintTiltDeg: 5,
  knockAmp: 0.2,
  knockCritAmp: 0.34,
  knockMs: 280,
  knockCritMs: 340,
  staggerMs: 230,
  staggerAmp: 0.08,
  dodgeMs: 260,
  dodgeAmp: 0.55,
  leanMs: 380,
  leanCritMs: 340,
  leanAmp: 0.12,
  leanCritAmp: 0.16,
  entranceMs: 780,
  entranceStepFreq: 4.2,
  entranceBobAmp: 0.06,
  wanderRadiusX: 0.42,
  wanderRadiusZ: 0.22,
  wanderStepMinMs: 850,
  wanderStepMaxMs: 1450,
};

/** "small" — leichte/nervöse Kreaturen (Huhn/Ratte-Klasse): knapperer, schnellerer Windup/Sprint,
 *  fliegt bei einem Treffer spürbar weiter zurück (geringe Masse), Atmen schneller/größer. */
const SMALL: MotionParams = {
  ...MEDIUM,
  sizeMult: 0.85,
  breathScaleAmp: 0.035,
  breathYAmp: 0.05,
  breathPeriodMs: 1400,
  windupMs: 260,
  windupCritMs: 260,
  sprintMs: 90,
  sprintCritMs: 75,
  holdMs: 60,
  holdCritMs: 80,
  returnMs: 220,
  returnCritMs: 260,
  windupAmp: 0.12,
  windupCritAmp: 0.17,
  knockAmp: 0.34,
  knockCritAmp: 0.55,
  knockMs: 230,
  knockCritMs: 280,
  staggerMs: 190,
  staggerAmp: 0.1,
  entranceMs: 620,
  entranceStepFreq: 5.6,
  entranceBobAmp: 0.05,
  // Nervös/klein: größerer, schnellerer Wander-Takt als medium — passt zum "possierlich"-Befund
  // des Motion-Beweises (Huhn-Verdikt, README §"Chef-Frage direkt getestet").
  wanderRadiusX: 0.55,
  wanderRadiusZ: 0.3,
  wanderStepMinMs: 550,
  wanderStepMaxMs: 950,
};

/** "boss" — schwere/träge Kreaturen: langsamerer, schwererer Windup/Sprint (Telegraph liest sich
 *  bedrohlicher), steht einen Treffer fast unbewegt durch, Atmen langsam/subtil ("träger als Huhn"). */
const BOSS: MotionParams = {
  ...MEDIUM,
  sizeMult: 1.2,
  breathScaleAmp: 0.012,
  breathYAmp: 0.02,
  breathPeriodMs: 3200,
  windupMs: 430,
  windupCritMs: 430,
  sprintMs: 170,
  sprintCritMs: 145,
  holdMs: 110,
  holdCritMs: 130,
  returnMs: 340,
  returnCritMs: 380,
  windupAmp: 0.2,
  windupCritAmp: 0.27,
  sprintTiltDeg: 3.5,
  knockAmp: 0.1,
  knockCritAmp: 0.18,
  knockMs: 340,
  knockCritMs: 420,
  staggerMs: 260,
  staggerAmp: 0.05,
  entranceMs: 920,
  entranceStepFreq: 3.0,
  entranceBobAmp: 0.09,
  // Träge/schwer: kleinerer Radius, langsamerer Takt — der Boss verlagert kaum Gewicht beim
  // Belauern, im Gegensatz zum nervösen Huhn (s. SMALL-Kommentar).
  wanderRadiusX: 0.24,
  wanderRadiusZ: 0.14,
  wanderStepMinMs: 1500,
  wanderStepMaxMs: 2300,
};

export const WEIGHT_PARAMS: Record<WeightClass, MotionParams> = { small: SMALL, medium: MEDIUM, boss: BOSS };

/** Spieler nutzt eigene, "medium"-nahe Werte statt einer Gewichtsklasse (der Held ist immer derselbe
 *  Archetyp, unabhängig von HP-Wachstum durchs Leveln) — etwas strammerer Windup (liest heroischer)
 *  und ein dezenterer Einlauf (Auftrag Punkt 1: "Spieler-Sprite: dezenter Einlauf beim Kampfstart"). */
export const PLAYER_PARAMS: MotionParams = {
  ...MEDIUM,
  sizeMult: 1,
  windupAmp: 0.14,
  windupCritAmp: 0.19,
  entranceMs: 520,
  entranceStepFreq: 4.6,
  entranceBobAmp: 0.035,
  // Der Held bleibt etwas geerdeter als ein "medium"-Monster (kleinerer Wander-Radius) — er ist
  // die dominante Figur (s. PLAYER_FIGURE_HEIGHT-Kommentar in Arena25DStage.tsx), soll aber laut
  // Auftrag Punkt 4 ausdrücklich MIT belauern, nicht regungslos stehen.
  wanderRadiusX: 0.34,
  wanderRadiusZ: 0.18,
  wanderStepMinMs: 900,
  wanderStepMaxMs: 1500,
};

/** Snap (Loslassen/Release) + Projektil-Flugzeit — beide Werte NICHT gewichtsklassen-abhängig
 *  (nur der Spieler führt je Ranged/Magie, s. Arena25DStage.tsx Moduldoc "MonsterDef kennt kein
 *  style-Feld"), daher genügt ein einziger globaler Satz statt einer dritten Tabellen-Dimension. */
export const PROJECTILE_TIMING = {
  snapMs: 20,
  transitMs: 190,
  transitCritMs: 150,
  returnMs: 160,
  returnCritMs: 200,
};

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/** ease-out-cubic — Anschwungphasen (Windup-Rücklehnen, Lehne, Stagger-Einsatz). */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** ease-in-cubic — Abschwungphasen (Sprint-Anlauf beschleunigt in den Kontakt). */
export function easeInCubic(t: number): number {
  return t * t * t;
}

/** Leicht federnder Ausschwung für die Return-Phase (dezentes Überschwingen, dann Ruhe) — spiegelt
 *  den `cubic-bezier(.34,1.56,.64,1)`-Charakter des Motion-Beweises (README "leicht federnd").
 *  Standard-"easeOutBack"-Form: 0 bei t=0, 1 bei t=1, mit einem kurzen Überschwung >1 kurz davor
 *  (verifiziert: bei c1=1.4 ist c3=c1+1 der KUBISCHE, c1 der QUADRATISCHE Koeffizient — vertauscht
 *  ergäbe einen Wert ungleich 0 bei t=0, s. Aufrufer `Arena25DStage.tsx` `spring = 1 - easeOutBackSoft(rp)`,
 *  der bei rp=0 exakt 1 (volle Auslenkung) erwarten muss). */
export function easeOutBackSoft(t: number): number {
  const c1 = 1.4;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

/** Deterministische Phasenverschiebung fürs Idle-Atmen aus der Standplatz-X-Koordinate — zwei
 *  Kämpfer atmen dadurch NIE exakt synchron (Auftrag Punkt 2 "phasenversetzt"), ohne Zufalls-
 *  zustand zu brauchen (stabil über Re-Mounts, kein Flackern beim Zonenwechsel). */
export function breathPhase(baseX: number): number {
  return (Math.abs(baseX) * 37) % (Math.PI * 2);
}

/** Gleichverteilter Zufallspunkt innerhalb einer Ellipse mit den Halbachsen `radiusX`/`radiusZ`
 *  (Flächen-korrekt via `sqrt(random())`, nicht nur Rand-Bias wie ein naives `random()*radius`) —
 *  Basis für den Idle-Wander-Zielpunkt (Auftrag Punkt 4, s. Arena25DStage.tsx `updateWander`). Kein
 *  Determinismus nötig (reine Bewegungs-Würze, kein Save-/Replay-Bezug wie `breathPhase`), daher
 *  simples `Math.random()` statt einer eigenen PRNG-Instanz. */
export function randomPointInEllipse(radiusX: number, radiusZ: number): { x: number; z: number } {
  const r = Math.sqrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  return { x: Math.cos(theta) * r * radiusX, z: Math.sin(theta) * r * radiusZ };
}
