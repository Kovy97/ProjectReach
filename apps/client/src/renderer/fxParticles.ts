/**
 * Kampfeffekte — Partikel-Schicht, ENGINE (Chef-Entscheid 28.08.2026: „Wir wollen ja eh die
 * generierten Partikel-Effekte nutzen", erweitert 28.08.2026 „sofort ALLE implementieren, für
 * alle Waffen"). Reine Laufzeit + Registry — KEINE Rezepte hier (die liegen in
 * `fxParticleLibrary.ts`, die diese Datei importiert und ihre Rezepte per `registerRecipe`
 * einhängt — Trennung Engine/Inhalt, damit die Bibliothek unabhängig wachsen kann, ohne diese
 * Datei anzufassen). Ersetzt Miras gemalte Sprite-Streifen dort, wo ein prozedurales Rezept
 * existiert — Mira-Sprites bleiben der Rückfall für alles ohne Rezept (Konzept
 * design/combat-fx/konzept-kampfeffekte.md §8). Portiert aus den vom Chef abgenommenen Demos
 * `design/combat-fx/demo-partikel-feuer-serie.html`, `demo-partikel-feuer-blitz.html` und
 * `demo-partikel-effektbibliothek.html` — dieselben Helfer (core/flash/ring/ember/spark/smoke/
 * ash/mote/shard/bubble/drop/feather/dust/blood/bone/splinter/glass/rime, Glyphen/Kristalle/
 * Sterne/Leerenkern/Blitzpfade/Säulen/Strahlen/Beams/Risse/Schnittbögen/Pfeile), dieselbe Physik
 * (drag/grav/Anziehung, additives „lighter"-Blending für Glut/Funken/Motes, source-over für
 * Rauch/Staub/Asche/Blut/Splitter), dieselbe Themen-Palette — wo immer möglich 1:1 übernommen
 * statt „ähnlich" nachgebaut.
 *
 * Drei Ebenen:
 * 1) Die REZEPT-REGISTRY (`registerRecipe`/`hasRecipe`/`selectRecipe`) — pur, kein DOM, testbar.
 *    Ein Rezept ist an denselben Schlüssel gebunden wie ein Mira-Sprite (`missile_fire`,
 *    `impact_shock`, `slash_cut`, `blood_red`, `pet_bite`, `miss_whiff`, `impact_block`, künftig
 *    weitere) PLUS die neuen Status-Körpereffekt-Schlüssel (`status_<typ>` = 450ms-Aufflammen,
 *    `statusAmbient_<typ>` = Loop, solange der Status aktiv ist).
 * 2) Die `ParticleStage`-Klasse — verwaltet EIN `<canvas>` als oberste Schicht über der
 *    Kampfbühne (dieselbe Box wie `.arena-fx-layer`), rAF-Loop NUR solange Effekte/Partikel aktiv
 *    sind (Idle-Spiel: keine CPU im Leerlauf), gepoolte Partikel-Arrays ohne Allokation je Frame,
 *    Deckel 2500 Partikel, adaptive Dichte bei Framedrops, `document.hidden` pausiert.
 * 3) Der `ParticleApi`-Werkzeugkasten, den jedes Rezept bekommt — deckt jeden Zeichen-/Spawn-
 *    Helfer der drei Demos ab (s. JSDoc am Interface).
 *
 * `FX_PARTICLES = false` schaltet die gesamte Schicht ab (Vergleich mit dem reinen Sprite-Pfad) —
 * die Registry bleibt dabei gefüllt, nur `ParticleStage.play`/`startAmbient` liefern dann immer
 * `false`.
 */
import type { CombatFxLevel } from "./util/uiPrefs";

export const FX_PARTICLES = true;

/** Deckel über ALLE Partikel einer Stage gemeinsam — Idle-Kampf-Dauerlast darf nie unbegrenzt
 *  wachsen, auch nicht bei mehreren schnell aufeinanderfolgenden Treffern + Status-Ambient-Loops. */
const MAX_PARTICLES = 2500;

export interface Point {
  x: number;
  y: number;
}

/** Bounding-Box eines Kämpfers in Bühnen-Pixeln (dieselbe Form wie `fxRect` in CombatPage) — für
 *  Rezepte, die eine Silhouette brauchen (Status-Ambient am Körper, Leere-Riss/-Nachbild). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Farbe eines Glut-/Funken-/Mote-Partikels über sein Lebensalter: `u` = Alter 0..1, `a` =
 *  gewünschte Deckkraft (der Aufrufer multipliziert bereits mit dem Fade-Out) — liefert eine
 *  fertige `rgba(...)`-Zeichenkette. */
export type ColorFn = (u: number, a: number) => string;

/** Radialgradient-Rezept für `drawCore` (Kern eines Geschosses/einer Ladung): innere Stopps
 *  (Offset 0..1 → rgba) plus ein weicherer Halo-Ring darüber (Demo `core()`). */
export interface CorePalette {
  stops: ReadonlyArray<readonly [number, string]>;
  haloInner: string;
  haloOuter: string;
  /** Vielfaches von `r`, bis zu dem der Halo ausklingt (Demo-Standard 3.2). */
  haloScale?: number;
}

type RGB = readonly [number, number, number];

/** Ein Themen-Farbsatz (Bibliotheks-Demo `TH`): heißer Kern → Akzent → dunkler Saum, plus
 *  Glow-Präfix (für `flash`/`ring`/Halos, `"rgba(r,g,b,"` OHNE Klammer/Alpha) und eine
 *  Rauch-/Nebelfarbe (`"r,g,b"` ohne `rgba()`). Elf Paletten: die sieben Magie-Themen
 *  (`magicThemeFor`-Werte) plus vier neutrale (steel=Nahkampf/Pfeil/Block, gold=Crit/Pilfer/
 *  Aufblitz, crimson=Markierung, teal=Schutzschild). */
export interface ThemeColors {
  hot: RGB;
  mid: RGB;
  dim: RGB;
  glow: string;
  smoke: string;
}

export const THEMES: Record<string, ThemeColors> = {
  arcane: { hot: [240, 226, 255], mid: [168, 110, 240], dim: [70, 25, 130], glow: "rgba(150,90,230,", smoke: "30,18,44" },
  fire: { hot: [255, 236, 190], mid: [255, 120, 40], dim: [80, 12, 8], glow: "rgba(255,150,60,", smoke: "40,30,26" },
  frost: { hot: [240, 250, 255], mid: [140, 205, 245], dim: [40, 80, 150], glow: "rgba(150,210,255,", smoke: "120,150,170" },
  shock: { hot: [255, 255, 245], mid: [246, 231, 161], dim: [130, 110, 50], glow: "rgba(246,231,161,", smoke: "40,36,26" },
  poison: { hot: [225, 255, 190], mid: [110, 205, 60], dim: [25, 70, 25], glow: "rgba(120,210,80,", smoke: "22,44,20" },
  void: { hot: [215, 150, 235], mid: [120, 30, 160], dim: [25, 4, 40], glow: "rgba(130,40,180,", smoke: "10,4,14" },
  aether: { hot: [255, 252, 235], mid: [245, 215, 140], dim: [140, 100, 40], glow: "rgba(245,215,140,", smoke: "50,44,30" },
  steel: { hot: [255, 250, 240], mid: [225, 218, 200], dim: [110, 105, 95], glow: "rgba(230,225,210,", smoke: "60,52,44" },
  gold: { hot: [255, 245, 210], mid: [235, 190, 90], dim: [120, 80, 30], glow: "rgba(235,190,90,", smoke: "50,40,24" },
  crimson: { hot: [255, 200, 190], mid: [200, 50, 50], dim: [80, 10, 20], glow: "rgba(200,60,60,", smoke: "40,10,14" },
  teal: { hot: [235, 255, 250], mid: [120, 210, 200], dim: [30, 90, 90], glow: "rgba(120,210,200,", smoke: "20,40,40" },
};

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => {
  const u = clamp01(t);
  return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)];
};
/** `"rgba(r,g,b,a)"` aus einem RGB-Tripel. */
export function rgba(c: RGB, a: number): string {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

/** Farbkurve eines Themas über das Partikelalter (Demo `col(th,u,a)`): Feuer behält seine eigene
 *  Kurve (weißgelb → orange → dunkelrot), alle anderen Themen mischen heiß→Akzent→Saum linear. */
export function themeColorFn(th: ThemeColors): ColorFn {
  if (th === THEMES.fire) {
    return (u, a) => {
      if (u < 0.18) return `rgba(255,236,190,${a})`;
      if (u < 0.5) return `rgba(255,${Math.round(150 - (60 * (u - 0.18)) / 0.32)},40,${a})`;
      return `rgba(${Math.round(190 - (120 * (u - 0.5)) / 0.5)},${Math.round(50 - (40 * (u - 0.5)) / 0.5)},20,${a})`;
    };
  }
  return (u, a) => {
    const c = u < 0.35 ? lerpRgb(th.hot, th.mid, u / 0.35) : lerpRgb(th.mid, th.dim, (u - 0.35) / 0.65);
    return rgba(c, a);
  };
}

/** `CorePalette` aus einem Themen-Farbsatz (Demo `core()`-Gradientstopps 0/0.3/0.6/0.85/1).
 *  `hot=true` (Crit-Kerne) hellt den innersten Stopp auf reines Weiß auf. */
export function themeCorePalette(th: ThemeColors, hot = false): CorePalette {
  return {
    stops: [
      [0, hot ? "rgba(255,255,250,1)" : rgba(th.hot, 1)],
      [0.3, rgba(th.hot, 0.95)],
      [0.6, rgba(th.mid, 0.8)],
      [0.85, rgba(th.dim, 0.35)],
      [1, rgba(th.dim, 0)],
    ],
    haloInner: `${th.glow}0.22)`,
    haloOuter: `${th.glow}0)`,
  };
}

/** Ein laufender, mehrere Frames lebender Effekt (bewegter Kern, Blitzpfad, Flash, Ring, Glutsäule
 *  …) — dieselbe `update(dt)`/`draw(ctx)`/`alive()`-Form wie das `active[]`-Array in den Demos. */
export interface Effect {
  update(dtMs: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
  alive(): boolean;
}

/** Griff auf einen gespawnten Partikel, NUR für `api.pull` gedacht (Leere-/Implosions-Anziehung,
 *  Demo `pull(p,at,force)`) — sonst opak, ein Rezept liest/setzt keine anderen Felder direkt. */
export interface ParticleHandle {
  follow?: Point;
  pull?: number;
}

/** Werkzeugkasten, den ein Rezept bekommt, um seinen Effekt zu bauen — deckt jeden Spawn-/Zeichen-
 *  Helfer der drei Demos ab. `ember/spark/mote/shard/bubble/drop` bekommen eine `ColorFn` (jedes
 *  Thema bringt seine eigene Farbkurve mit, s. `themeColorFn`); `smoke/dust/ash/blood/bone/
 *  splinter/glass/rime` sind gedeckte Materialfarben (rime nutzt eine Theme direkt für
 *  `drawCrystal`, feather ebenso für `drawFeather`). */
export interface ParticleApi {
  ember(x: number, y: number, vx: number, vy: number, life: number, size: number, color: ColorFn, grav?: number, drag?: number): ParticleHandle | null;
  spark(x: number, y: number, vx: number, vy: number, life: number, size: number, color: ColorFn, grav?: number, drag?: number): ParticleHandle | null;
  mote(x: number, y: number, vx: number, vy: number, life: number, size: number, color: ColorFn, grav?: number, drag?: number): ParticleHandle | null;
  shard(x: number, y: number, vx: number, vy: number, life: number, size: number, color: ColorFn, grav?: number): ParticleHandle | null;
  bubble(x: number, y: number, vx: number, vy: number, life: number, size: number, color: ColorFn): ParticleHandle | null;
  drop(x: number, y: number, vx: number, vy: number, life: number, size: number, color: ColorFn, grav?: number): ParticleHandle | null;
  feather(x: number, y: number, vx: number, vy: number, life: number, size: number, theme: ThemeColors): ParticleHandle | null;
  smoke(x: number, y: number, vx: number, vy: number, life: number, size: number, rgbTriplet?: string, alpha?: number, grav?: number): void;
  dust(x: number, y: number, vx: number, vy: number, life: number, size: number): void;
  ash(x: number, y: number, vx: number, vy: number, life: number, size: number): void;
  blood(x: number, y: number, vx: number, vy: number, life: number, size: number, rgbTriplet?: string): void;
  bone(x: number, y: number, vx: number, vy: number, life: number, size: number): void;
  splinter(x: number, y: number, vx: number, vy: number, life: number, size: number): void;
  /** Steinsplitter (Nahkampf 1.4.1, Hammer-/Maul-Bodenriss): dunkelgraue, kantige Brocken. */
  stone(x: number, y: number, vx: number, vy: number, life: number, size: number): void;
  glass(x: number, y: number, vx: number, vy: number, life: number, size: number): void;
  rime(x: number, y: number, life: number, size: number, theme: ThemeColors): void;
  /** Zieht einen bereits gespawnten Partikel physikalisch zu `at` (Leere-Anziehung/Motes-
   *  Implosion, Demo `pull(p,at,force)`) — `force` ist eine Beschleunigung, keine Geschwindigkeit. */
  pull(handle: ParticleHandle | null, at: Point, force: number): void;

  /** Reiner Zeichen-Helfer (kein Partikel-Spawn) — der Aufrufer ruft ihn selbst in seinem eigenen
   *  `Effect.draw(ctx)` mit der aktuellen (ggf. bewegten) Position auf. */
  drawCore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, palette: CorePalette): void;
  /** Schwarzer, licht-schluckender Leerenkern mit purpurnem Saum (Demo `voidCore`). */
  drawVoidCore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void;
  /** Rotierende Rune: zwei Ringe, Dreieck, Kerben (Demo `drawGlyph`). */
  drawGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, th: ThemeColors, a: number): void;
  /** Eiskristall-Stern mit `n` Zacken (Demo `drawCrystal`). */
  drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, th: ThemeColors, a: number, n?: number): void;
  /** Scharfer Stern aus `n` dünnen Strahlen (Demo `drawStar`). */
  drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, th: ThemeColors, a: number, n?: number): void;
  /** Goldene Feder: schmales Blatt mit Kiel (Demo `drawFeather`). */
  drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, a: number, th: ThemeColors): void;
  /** Pfeil mit Fiederung + Spitze (Demo `drawArrow`). */
  drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, k: number, alpha?: number): void;
  /** Mittelpunkt-Verschiebung: erzeugt die Punktkette eines Blitz-/Riss-Pfades (Demo `boltPath`). */
  boltPath(a: Point, b: Point, disp: number, iter?: number): Point[];
  /** `n` Seitenäste entlang eines Pfades (Demo `boltBranches`). */
  boltBranches(pts: readonly Point[], n: number, baseAng: number, len?: number): Point[][];
  /** Zeichnet Pfad + Äste in vier Glüh-Lagen (Demo `drawBolt`). */
  drawBolt(ctx: CanvasRenderingContext2D, pts: readonly Point[], branches: ReadonlyArray<readonly Point[]>, k: number, a: number, th: ThemeColors): void;

  /** Selbstständiger Radial-Aufblitz mit fester Lebensdauer (Demo `flash()`). */
  flash(at: Point, r: number, colorPrefix: string, ms: number): void;
  /** Selbstständiger, sich ausdehnender Ring (Demo `ring()`). `sq` staucht ihn vertikal
   *  (Ellipse statt Kreis), `from` ist der Start-Radius-Anteil. */
  ring(at: Point, r: number, ms: number, colorPrefix?: string, w?: number, sq?: number, from?: number): void;
  /** Senkrechte Lichtsäule (Glutsäule/Lichtsäule, Demo `column()`). */
  column(at: Point, h: number, ms: number, th: ThemeColors, w?: number): void;
  /** Lichtstrahl von oben, wird unten breiter/heller (Demo `rayFromAbove()`). */
  rayFromAbove(x: number, yEnd: number, ms: number, th: ThemeColors, w: number, xTop?: number): void;
  /** Kurzer Strahl mit Kern + wandernden Wellen (Demo `beam()`). */
  beam(a: Point, b: Point, ms: number, th: ThemeColors, w: number): void;
  /** Dünner heller Bogen, der um `(x,y)` fegt (Nahkampf-Schnitt, Demo `slash()`). */
  slashArc(opts: { x: number; y: number; r: number; a0: number; a1: number; ms: number; w: number; th: ThemeColors; tilt?: number }): void;
  /** Bodenriss: dunkle Zacken, kurz mit hellem Saum (Demo `crack()`). */
  crack(at: Point, ms: number, n?: number, len?: number, th?: ThemeColors | null): void;

  /** Registriert einen eigenen mehrere Frames laufenden Effekt (bewegter Kern, Blitzpfad,
   *  Glutsäule, Status-Ambient-Loop …) bei der Stage. */
  addEffect(effect: Effect): void;
  /** Effekt mit fester Lebensdauer `ms`: `draw(ctx,ageMs,u)` jeden Frame, `update(dt,ageMs,u)`
   *  optional (Demo `timed()`). */
  timed(ms: number, draw: (ctx: CanvasRenderingContext2D, ageMs: number, u: number) => void, update?: (dtMs: number, ageMs: number, u: number) => void): void;
  /** Ruft `fn` genau einmal nach `ms` auf (Demo `delay()`) — für mehrphasige Rezepte
   *  (Ladung→Blitz, Blitzregen-Schläge, verzögerte Einschlags-Folgen). */
  delay(ms: number, fn: () => void): void;

  /** Fordert einen kurzen Bildschirm-Wackler an (nur bei `CombatFxLevel==="full"` sichtbar — die
   *  Stage filtert das selbst, das Rezept muss nicht selbst gaten). `amount` = Pixel-Amplitude. */
  shake(amount: number): void;
  /** Partikel-/Burst-Anzahl PRO FRAME für eine Dauer-Emission (Demo `count(base,dt)`) — bereits
   *  mit `density` und der Frame-Zeit normiert, liefert meist 0 oder 1, selten mehr bei Spikes. */
  count(base: number, dtMs: number): number;
  /** Partikel-Anzahl für einen EINMALIGEN Ausbruch (Demo `burst(base)`) — `Math.round(base*density)`. */
  burst(base: number): number;
  rand(a: number, b: number): number;
  pick<T>(arr: readonly T[]): T;
}

// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: Element-Modifikator einer Nahkampfwaffe (eigener Waffeneffekt oder Rune).
/** Element-Überlagerung eines Nahkampf-Treffers (fxParticleMelee.ts): die Status-Effekte der
 *  Mainhand, auf Effekt-Farbwelten abgebildet (burn→fire, frost, shock, poison, bleed, void). */
export type FxElement = "fire" | "frost" | "shock" | "poison" | "bleed" | "void";

/** Kontext, den `ParticleStage.play`/`startAmbient` einem Rezept übergibt. `from`/`to` sind
 *  bereits Bühnen-Pixel (dieselbe Koordinatenbasis wie `.arena-fx-layer`, s. CombatPage `fxRect`).
 *  `dir` ist die horizontale Angriffsrichtung (+1 = Spieler→Gegner, -1 gespiegelt für
 *  Gegnerangriffe, Chef-D5). `density` ist bereits die fertige Multiplikation aus Effektstufe ×
 *  adaptiver Perf-Dichte. */
export interface RecipeContext {
  from: Point;
  to: Point;
  dir: 1 | -1;
  crit: boolean;
  /** Index der gewählten Variante (0-basiert; -1 bei der Crit-Sondervariante). */
  variant: number;
  density: number;
  api: ParticleApi;
  /** Sollzeit bis zum Einschlag (Geschoss-Rezepte) — bei reinen Einschlag-/Ambient-Rezepten
   *  ungenutzt. */
  durationMs?: number;
  /** Nur Geschoss-Rezepte: beim „Ankommen" aufzurufen, damit der Aufrufer (CombatPage) den
   *  Einschlag-Folgeschritt (Blut, `impact_<thema>`-Partikelrezept) auslösen kann. */
  onArrive?: () => void;
  /** Bounding-Box des GETROFFENEN Kämpfers (Status-Ambient am Körper, Leere-Riss/-Nachbild,
   *  Begleiter-Schutzschild-Kuppel um den Spieler). */
  box?: Rect;
  /** Chef 29.08.2026: Status-Ambient folgt dem Koerper auch beim Umlegen/Resizen der Kampf-Panels — Ambient-Rezepte
   *  lesen die Box je Frame ueber diesen Getter neu (Stage-Koordinaten), `box` ist nur der Startwert. */
  getBox?: () => Rect | undefined;
  /** Bodenpunkt unter dem Ziel (Nahkampf-Bodenriss/-Stoßwelle, Blitzregen-Bodenentladung). */
  feet?: Point;
  /** Position des Begleiter-Portraits (Begleiter-Rezepte: Bolzen/Diebesgriff starten hier). */
  petPos?: Point;
  /** Nur Ambient-Rezepte (Status-Loops): `true`, solange der Status noch aktiv ist — das Rezept
   *  registriert einen `Effect`, dessen `alive()` hieran hängt. */
  isActive?: () => boolean;
  // claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: Element-Überlagerung + echter Auslöser in DIESEM Treffer.
  /** Nur Nahkampf-Rezepte (`melee_<waffenart>`): Elemente der Waffe (max. zwei, Reihenfolge =
   *  Vorrang) — Spur und Einschlag bekommen je Element eine Überlagerung. Leer/fehlt = reiner Stahl. */
  elements?: readonly FxElement[];
  /** Nur Nahkampf-Rezepte: Elemente, deren Status in DIESEM Schlag laut Kampflog wirklich ausgelöst
   *  hat (`kind:"status"` vor dem Treffer) — das Rezept setzt dafür einen deutlicheren Moment. */
  procs?: readonly FxElement[];
}

export type RecipeFn = (ctx: RecipeContext) => void;

interface RecipeEntry {
  variants: RecipeFn[];
  critVariant?: RecipeFn;
}

const registry = new Map<string, RecipeEntry>();

/**
 * Registriert ein oder mehrere Rezepte unter einem Effekt-Schlüssel (dieselbe Namenskonvention wie
 * die Mira-Sprites: `missile_<thema>`, `impact_<thema>`, `slash_<familie>`, `blood_<var>`,
 * `pet_<bild>`, `miss_whiff`, `impact_block`, plus die neuen `status_<typ>`/`statusAmbient_<typ>`).
 * `critVariant` ersetzt bei einem kritischen Treffer die normale Zufallsauswahl komplett (wie
 * `fx_<key>_crit.webp` bei den Sprites) — ohne `critVariant` bekommt ein Crit trotzdem eine
 * normale Pool-Variante, skaliert sich aber typischerweise selbst über `ctx.crit`. Ein zweiter
 * Aufruf mit demselben Schlüssel ÜBERSCHREIBT die vorherige Registrierung.
 */
export function registerRecipe(key: string, variants: RecipeFn[], critVariant?: RecipeFn): void {
  registry.set(key, { variants, critVariant });
}

/** Existiert (mindestens) ein Rezept für diesen Schlüssel? */
export function hasRecipe(key: string): boolean {
  return registry.has(key);
}

/**
 * Wählt das zu spielende Rezept: bei `crit` zuerst die registrierte Crit-Variante (falls
 * vorhanden), sonst zufällig aus dem Varianten-Pool — bei mehr als einer Variante NIE zweimal
 * hintereinander dieselbe (deterministisch: der Pool für die Auswahl schließt den zuletzt
 * gespielten Index aus, statt nur erneut zu würfeln). `lastVariant` ist bewusst von außen
 * übergeben (eine `Map` pro `ParticleStage`-Instanz) statt hier gehalten — hält die Registry
 * zustandslos und die Auswahl pro Kampf-Instanz unabhängig testbar. `null` = kein Rezept
 * registriert ODER ein leerer Varianten-Pool.
 */
export function selectRecipe(
  key: string,
  crit: boolean,
  lastVariant: Map<string, number>,
): { run: RecipeFn; index: number } | null {
  const entry = registry.get(key);
  if (!entry) return null;
  if (crit && entry.critVariant) return { run: entry.critVariant, index: -1 };
  const variants = entry.variants;
  if (variants.length === 0) return null;
  if (variants.length === 1) {
    lastVariant.set(key, 0);
    return { run: variants[0]!, index: 0 };
  }
  const last = lastVariant.get(key);
  const pool = variants.map((_, i) => i).filter((i) => i !== last);
  const idx = pool[Math.floor(Math.random() * pool.length)]!;
  lastVariant.set(key, idx);
  return { run: variants[idx]!, index: idx };
}

// ─── Partikel-Pool (intern) ──────────────────────────────────────────────────────────────────

// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: "stone" (Steinsplitter) ergänzt.
type ParticleKind = "ember" | "spark" | "smoke" | "ash" | "mote" | "shard" | "bubble" | "drop" | "feather" | "dust" | "blood" | "bone" | "splinter" | "stone" | "glass" | "rime";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  kind: ParticleKind;
  grav: number;
  drag: number;
  color?: ColorFn; // ember, spark, mote, shard, bubble, drop
  smokeRgb?: string; // smoke
  smokeAlpha?: number; // smoke Grund-Deckkraft (Demo-Default 0.28/0.34 je Aufrufer)
  bloodRgb?: string; // blood
  rot?: number; // shard/bone/splinter/stone/glass/feather/rime
  spin?: number; // shard/bone/splinter/stone/glass (rot animiert per spin)
  ph?: number; // mote-Twinkle-/Feather-Schwenk-Phase
  ax?: number; // ash-Ankerpunkt X
  th?: ThemeColors; // feather (drawFeather), rime (drawCrystal)
  follow?: Point;
  pull?: number;
}

const rand = (a: number, b: number): number => a + Math.random() * (b - a);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

function drawCore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, palette: CorePalette): void {
  const rr = Math.max(0.01, r);
  const g = ctx.createRadialGradient(x, y, 0, x, y, rr);
  for (const [off, col] of palette.stops) g.addColorStop(off, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.fill();
  const haloR = rr * (palette.haloScale ?? 3.2);
  const h = ctx.createRadialGradient(x, y, rr, x, y, haloR);
  h.addColorStop(0, palette.haloInner);
  h.addColorStop(1, palette.haloOuter);
  ctx.fillStyle = h;
  ctx.beginPath();
  ctx.arc(x, y, haloR, 0, Math.PI * 2);
  ctx.fill();
}

function drawVoidCore(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const th = THEMES.void!;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(0.01, r));
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.6, "rgba(8,2,14,0.95)");
  g.addColorStop(0.85, "rgba(40,8,60,0.5)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.01, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const h = ctx.createRadialGradient(x, y, r * 0.6, x, y, Math.max(0.02, r * 2.4));
  h.addColorStop(0, "rgba(160,60,210,0.55)");
  h.addColorStop(0.35, "rgba(130,40,180,0.3)");
  h.addColorStop(1, "rgba(130,40,180,0)");
  ctx.fillStyle = h;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.02, r * 2.4), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(th.hot, 0.9);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = rgba(th.mid, 0.8);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.95, 0, Math.PI * 2);
  ctx.stroke();
}

function drawGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, th: ThemeColors, a: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = rgba(th.hot, a);
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const t = (i * Math.PI * 2) / 3;
    if (i) ctx.lineTo(Math.cos(t) * r * 0.66, Math.sin(t) * r * 0.66);
    else ctx.moveTo(Math.cos(t) * r * 0.66, Math.sin(t) * r * 0.66);
  }
  ctx.closePath();
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const t = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(Math.cos(t) * r, Math.sin(t) * r);
    ctx.lineTo(Math.cos(t) * r * 1.18, Math.sin(t) * r * 1.18);
    ctx.stroke();
  }
  ctx.fillStyle = rgba(th.hot, a * 0.7);
  for (let i = 0; i < 4; i++) {
    const t = (i * Math.PI * 2) / 4 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(Math.cos(t) * r * 0.85, Math.sin(t) * r * 0.85, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, th: ThemeColors, a: number, n = 6): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const t = (i * Math.PI) / n;
    const rr = i % 2 ? r * 0.38 : r;
    if (i) ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
    else ctx.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(th.mid, a * 0.45);
  ctx.fill();
  ctx.strokeStyle = rgba(th.hot, a);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rot: number, th: ThemeColors, a: number, n = 4): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const t = (i * Math.PI) / n;
    const rr = i % 2 ? r * 0.12 : r;
    if (i) ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr);
    else ctx.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(th.hot, a);
  ctx.fill();
  ctx.restore();
}

function drawFeather(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, rot: number, a: number, th: ThemeColors): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = rgba(th.mid, 0.75 * a);
  ctx.beginPath();
  ctx.ellipse(0, 0, Math.max(0.01, len), Math.max(0.01, len * 0.28), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(th.hot, a);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-len, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(i * len * 0.22, 0);
    ctx.lineTo(i * len * 0.22 - len * 0.12, -len * 0.22);
    ctx.stroke();
  }
  ctx.restore();
}

const STEEL = THEMES.steel!;

function drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, k: number, al = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = `rgba(150,118,80,${al})`;
  ctx.lineWidth = 2.4 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-22 * k, 0);
  ctx.lineTo(16 * k, 0);
  ctx.stroke();
  ctx.fillStyle = `rgba(200,185,150,${al})`;
  ctx.beginPath();
  ctx.moveTo(-22 * k, 0);
  ctx.lineTo(-30 * k, -4 * k);
  ctx.lineTo(-26 * k, 0);
  ctx.lineTo(-30 * k, 4 * k);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = rgba(STEEL.hot, 0.95 * al);
  ctx.beginPath();
  ctx.moveTo(24 * k, 0);
  ctx.lineTo(14 * k, -3 * k);
  ctx.lineTo(14 * k, 3 * k);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function boltPath(a: Point, b: Point, disp: number, iter = 5): Point[] {
  const pts: Point[] = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  let d = disp;
  for (let it = 0; it < iter; it++) {
    for (let i = pts.length - 1; i > 0; i--) {
      const p = pts[i - 1]!;
      const q = pts[i]!;
      const o = rand(-d, d);
      pts.splice(i, 0, { x: (p.x + q.x) / 2 + nx * o, y: (p.y + q.y) / 2 + ny * o });
    }
    d *= 0.55;
  }
  return pts;
}

function boltBranches(pts: readonly Point[], n: number, baseAng: number, len = 6): Point[][] {
  const out: Point[][] = [];
  for (let b = 0; b < n; b++) {
    const i = Math.floor(rand(pts.length * 0.2, pts.length * 0.85));
    const p0 = pts[i]!;
    const br: Point[] = [p0];
    let x = p0.x;
    let y = p0.y;
    let ang = baseAng + rand(-1.2, 1.2);
    for (let j = 0; j < len; j++) {
      x += Math.cos(ang) * rand(10, 30);
      y += Math.sin(ang) * rand(10, 30);
      ang += rand(-0.7, 0.7);
      br.push({ x, y });
    }
    out.push(br);
  }
  return out;
}

function drawBolt(ctx: CanvasRenderingContext2D, pts: readonly Point[], branches: ReadonlyArray<readonly Point[]>, k: number, a: number, th: ThemeColors): void {
  const path = (ps: readonly Point[]): void => {
    ctx.beginPath();
    ctx.moveTo(ps[0]!.x, ps[0]!.y);
    for (let i = 1; i < ps.length; i++) ctx.lineTo(ps[i]!.x, ps[i]!.y);
  };
  const fl = 0.75 + 0.25 * Math.random();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const layers: Array<[number, string]> = [
    [26 * k, `${th.glow}${0.1 * a * fl})`],
    [11 * k, rgba(th.mid, 0.35 * a * fl)],
    [4 * k, rgba(th.hot, 0.95 * a * fl)],
    [1.6, `rgba(255,255,255,${a})`],
  ];
  for (const [w, cc] of layers) {
    ctx.strokeStyle = cc;
    ctx.lineWidth = w;
    path(pts);
    ctx.stroke();
    for (const br of branches) {
      ctx.lineWidth = w * 0.45;
      path(br);
      ctx.stroke();
    }
  }
}

function makeFlashEffect(at: Point, r: number, colorPrefix: string, ms: number): Effect {
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / ms);
      const rr = r * (0.6 + 0.9 * u);
      const g = c.createRadialGradient(at.x, at.y, 0, at.x, at.y, Math.max(0.01, rr));
      g.addColorStop(0, `${colorPrefix}${clamp01(0.9 * (1 - u))})`);
      g.addColorStop(0.5, `${colorPrefix}${clamp01(0.35 * (1 - u))})`);
      g.addColorStop(1, `${colorPrefix}0)`);
      c.fillStyle = g;
      c.beginPath();
      c.arc(at.x, at.y, Math.max(0.01, rr), 0, Math.PI * 2);
      c.fill();
    },
    alive: () => age < ms,
  };
}

function makeRingEffect(at: Point, r: number, ms: number, colorPrefix: string, w: number, sq: number, from: number): Effect {
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / ms);
      c.strokeStyle = `${colorPrefix}${clamp01(0.5 * (1 - u))})`;
      c.lineWidth = w * (1 - u) + 2;
      const rr = r * (from + (1.1 - from) * u);
      c.beginPath();
      c.ellipse(at.x, at.y, Math.max(0.01, rr), Math.max(0.01, rr * sq), 0, 0, Math.PI * 2);
      c.stroke();
    },
    alive: () => age < ms,
  };
}

function makeColumnEffect(at: Point, h: number, ms: number, th: ThemeColors, w: number): Effect {
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / ms);
      const a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      const hgt = h * Math.min(1, age / 160);
      const g = c.createLinearGradient(0, at.y, 0, at.y - hgt);
      g.addColorStop(0, rgba(th.hot, 0.9 * a));
      g.addColorStop(0.5, rgba(th.mid, 0.6 * a));
      g.addColorStop(1, rgba(th.dim, 0));
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(at.x, at.y - hgt / 2, Math.max(0.01, w * (1 + 0.1 * Math.sin(age / 30))), Math.max(0.01, hgt / 2), 0, 0, Math.PI * 2);
      c.fill();
    },
    alive: () => age < ms,
  };
}

function makeRayEffect(x: number, yEnd: number, ms: number, th: ThemeColors, w: number, xTop: number): Effect {
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / ms);
      const a = u < 0.25 ? u / 0.25 : u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      const fl = 0.85 + 0.15 * Math.sin(age / 40);
      const g = c.createLinearGradient(0, 0, 0, yEnd);
      g.addColorStop(0, rgba(th.mid, 0));
      g.addColorStop(0.55, rgba(th.mid, 0.22 * a * fl));
      g.addColorStop(0.88, rgba(th.hot, 0.4 * a * fl));
      g.addColorStop(1, rgba(th.hot, 0));
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(xTop - w * 0.3, -10);
      c.lineTo(xTop + w * 0.3, -10);
      c.lineTo(x + w * 0.7, yEnd + 30);
      c.lineTo(x - w * 0.7, yEnd + 30);
      c.closePath();
      c.fill();
      const h = c.createRadialGradient(x, yEnd, 0, x, yEnd, Math.max(0.02, w * 1.6));
      h.addColorStop(0, rgba(th.hot, 0.5 * a * fl));
      h.addColorStop(1, rgba(th.mid, 0));
      c.fillStyle = h;
      c.beginPath();
      c.arc(x, yEnd, Math.max(0.02, w * 1.6), 0, Math.PI * 2);
      c.fill();
    },
    alive: () => age < ms,
  };
}

function makeBeamEffect(a: Point, b: Point, ms: number, th: ThemeColors, w: number): Effect {
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / ms);
      const al = u < 0.15 ? u / 0.15 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
      const fl = 0.85 + 0.15 * Math.random();
      c.lineCap = "round";
      const layers: Array<[number, string]> = [
        [w * 3, `${th.glow}${0.12 * al})`],
        [w * 1.4, rgba(th.mid, 0.5 * al * fl)],
        [w * 0.5, rgba(th.hot, 0.95 * al)],
        [1.5, `rgba(255,255,255,${0.9 * al})`],
      ];
      for (const [ww, cc] of layers) {
        c.strokeStyle = cc;
        c.lineWidth = ww;
        c.beginPath();
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      for (let i = 0; i < 5; i++) {
        const t = (age / 400 + i / 5) % 1;
        c.fillStyle = rgba(th.hot, 0.5 * al);
        c.beginPath();
        c.arc(a.x + dx * t, a.y + dy * t, w * 0.6, 0, Math.PI * 2);
        c.fill();
      }
    },
    alive: () => age < ms,
  };
}

function makeSlashArcEffect(o: { x: number; y: number; r: number; a0: number; a1: number; ms: number; w: number; th: ThemeColors; tilt?: number }): Effect {
  const th = o.th;
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / o.ms);
      const sweep = Math.min(1, u / 0.5);
      const fade = u < 0.5 ? 1 : 1 - (u - 0.5) / 0.5;
      const aEnd = o.a0 + (o.a1 - o.a0) * sweep;
      const ccw = o.a1 < o.a0;
      c.save();
      c.translate(o.x, o.y);
      if (o.tilt) c.scale(1, o.tilt);
      c.lineCap = "round";
      const arc = (a0: number, a1: number, w: number, cc: string): void => {
        c.strokeStyle = cc;
        c.lineWidth = w;
        c.beginPath();
        c.arc(0, 0, Math.max(0.01, o.r), a0, a1, ccw);
        c.stroke();
      };
      arc(o.a0, aEnd, o.w * 5, `${th.glow}${0.1 * fade})`);
      arc(o.a0, aEnd, o.w * 2.2, rgba(th.mid, 0.3 * fade));
      arc(aEnd - (aEnd - o.a0) * 0.45, aEnd, o.w, rgba(th.hot, 0.95 * fade));
      arc(o.a0, aEnd, 1.2, `rgba(255,255,255,${0.85 * fade})`);
      c.restore();
    },
    alive: () => age < o.ms,
  };
}

function makeCrackEffect(at: Point, ms: number, n: number, len: number, th: ThemeColors | null): Effect {
  const lines: Point[][] = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? -1 : 1;
    const pts: Point[] = [{ x: at.x, y: at.y }];
    let x = at.x;
    let y = at.y;
    let ang = dir > 0 ? rand(-0.3, 0.3) : Math.PI + rand(-0.3, 0.3);
    for (let j = 0; j < 6; j++) {
      x += ((Math.cos(ang) * len) / 6) * rand(0.6, 1.4);
      y += Math.sin(ang) * 6 + rand(-5, 5);
      ang += rand(-0.5, 0.5) * 0.6;
      pts.push({ x, y });
    }
    lines.push(pts);
  }
  let age = 0;
  return {
    update(dt) {
      age += dt;
    },
    draw(c) {
      const u = Math.min(1, age / ms);
      const a = 1 - u * u;
      c.save();
      c.globalCompositeOperation = "source-over";
      c.lineCap = "round";
      c.lineJoin = "round";
      for (const ps of lines) {
        c.beginPath();
        c.moveTo(ps[0]!.x, ps[0]!.y);
        for (let i = 1; i < ps.length; i++) c.lineTo(ps[i]!.x, ps[i]!.y);
        c.strokeStyle = `rgba(4,3,2,${0.9 * a})`;
        c.lineWidth = 3.5;
        c.stroke();
      }
      c.restore();
      if (th && u < 0.45) {
        c.strokeStyle = rgba(th.mid, 0.6 * (1 - u / 0.45));
        c.lineWidth = 1.2;
        for (const ps of lines) {
          c.beginPath();
          c.moveTo(ps[0]!.x, ps[0]!.y);
          for (let i = 1; i < ps.length; i++) c.lineTo(ps[i]!.x, ps[i]!.y);
          c.stroke();
        }
      }
    },
    alive: () => age < ms,
  };
}

function drawEmberParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  const r = Math.max(0.01, p.size * (1 - u * 0.8));
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  const col = p.color!;
  g.addColorStop(0, col(u, 0.9 * (1 - u)));
  g.addColorStop(1, col(u, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSparkParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.strokeStyle = p.color!(Math.min(0.45, u), 0.9 * (1 - u));
  ctx.lineWidth = p.size;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
  ctx.stroke();
}

function drawMoteParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  const tw = 0.6 + 0.4 * Math.sin(p.age / 45 + (p.ph ?? 0));
  ctx.fillStyle = p.color!(u * 0.6, 0.85 * (1 - u) * tw);
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.01, p.size * (1 - u * 0.5)), 0, Math.PI * 2);
  ctx.fill();
}

function drawShardParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot ?? 0);
  const a = 1 - u;
  ctx.fillStyle = p.color!(u * 0.5, 0.8 * a);
  ctx.beginPath();
  ctx.moveTo(p.size * 1.6, 0);
  ctx.lineTo(0, -p.size * 0.55);
  ctx.lineTo(-p.size * 1.6, 0);
  ctx.lineTo(0, p.size * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBubbleParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.strokeStyle = p.color!(0.2, 0.7 * (1 - u));
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.01, p.size * (1 + 0.4 * u)), 0, Math.PI * 2);
  ctx.stroke();
}

function drawDropParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.strokeStyle = p.color!(0.25, 0.9 * (1 - u));
  ctx.lineWidth = p.size;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.01, p.y - p.vy * 0.01);
  ctx.stroke();
}

function drawFeatherParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  drawFeather(ctx, p.x, p.y, p.size, (p.rot ?? 0) + Math.sin(p.age / 300 + (p.ph ?? 0)) * 0.5, 0.9 * (1 - u), p.th!);
}

function drawRimeParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  drawCrystal(ctx, p.x, p.y, p.size, p.rot ?? 0, p.th!, 0.7 * (1 - u), 4);
}

function drawSmokeParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  const a = (p.smokeAlpha ?? 0.28) * (1 - u);
  const r = Math.max(0.01, p.size * (0.6 + u));
  ctx.fillStyle = `rgba(${p.smokeRgb ?? "40,30,26"},${a * 0.45})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(${p.smokeRgb ?? "40,30,26"},${a * 0.55})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawDustParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.fillStyle = `rgba(110,92,72,${0.32 * (1 - u)})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, Math.max(0.01, p.size * (0.5 + 1.2 * u)), 0, Math.PI * 2);
  ctx.fill();
}

function drawAshParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.fillStyle = `rgba(120,110,100,${0.7 * (1 - u)})`;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawBloodParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const u = clamp01(p.age / p.life);
  ctx.strokeStyle = `rgba(${p.bloodRgb ?? "150,22,28"},${0.9 * (1 - u * u)})`;
  ctx.lineWidth = p.size;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.vx * 0.012, p.y - p.vy * 0.012);
  ctx.stroke();
}

function drawBoneSplinterGlassParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot ?? 0);
  const a = 1 - clamp01(p.age / p.life);
  if (p.kind === "bone") {
    ctx.fillStyle = `rgba(205,195,175,${0.9 * a})`;
    ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8);
  } else if (p.kind === "splinter") {
    ctx.fillStyle = `rgba(150,115,70,${0.9 * a})`;
    ctx.fillRect(-p.size, -p.size * 0.22, p.size * 2, p.size * 0.44);
  } else if (p.kind === "stone") {
    // claude:2026-10-25T14:48:00+01:00 — Steinsplitter: kantiges Viereck, dunkles Grau mit hellerer Bruchkante.
    ctx.fillStyle = `rgba(88,82,74,${0.95 * a})`;
    ctx.beginPath();
    ctx.moveTo(-p.size, -p.size * 0.5);
    ctx.lineTo(p.size * 0.7, -p.size * 0.7);
    ctx.lineTo(p.size, p.size * 0.4);
    ctx.lineTo(-p.size * 0.5, p.size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(160,150,135,${0.7 * a})`;
    ctx.fillRect(-p.size * 0.6, -p.size * 0.55, p.size * 1.1, p.size * 0.25);
  } else {
    ctx.strokeStyle = `rgba(210,235,240,${0.8 * a})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-p.size, 0);
    ctx.lineTo(p.size * 0.5, -p.size * 0.6);
    ctx.lineTo(p.size * 0.6, p.size * 0.5);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Verwaltet EIN `<canvas>` als oberste Schicht über der Kampfbühne (an `container` angehängt,
 * `position:absolute; inset:0` über CSS-Klasse `.arena-particle-layer`, dieselbe Box wie
 * `.arena-fx-layer`). Ein `ParticleStage` pro Battle-Mount (CombatPage legt sie in einem
 * `useEffect(() => {...}, [])` an und ruft `destroy()` beim Unmount).
 */
export class ParticleStage {
  private readonly container: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly ro: ResizeObserver | null;
  private readonly onVisibility: () => void;

  private particles: Particle[] = [];
  private active: Effect[] = [];
  private readonly lastVariant = new Map<string, number>();
  private readonly ambientFlags = new Map<string, { active: boolean }>();

  private raf = 0;
  private running = false;
  private last = 0;
  private level: CombatFxLevel = "full";
  /** Adaptive Perf-Dichte 0.5..1 — sinkt schrittweise bei Frame-Zeiten > 22ms, erholt sich
   *  langsam (asymmetrisch: schnell runter, langsam wieder rauf). */
  private densityMult = 1;
  private wobble = 0;

  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(container: HTMLElement) {
    this.container = container;
    this.canvas = document.createElement("canvas");
    this.canvas.className = "arena-particle-layer";
    this.canvas.setAttribute("aria-hidden", "true");
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d");
    this.ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => this.resize()) : null;
    this.ro?.observe(container);
    this.resize();
    this.onVisibility = (): void => {
      if (document.hidden) {
        this.running = false;
        cancelAnimationFrame(this.raf);
      } else {
        this.ensureRunning();
      }
    };
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  /** `CombatFxLevel` aus den Optionen (bzw. `prefers-reduced-motion` → bereits vom Aufrufer auf
   *  "reduced" abgebildet, s. CombatPage `spriteFxLevel`). "off" räumt sofort auf (inkl. laufender
   *  Status-Ambient-Loops) und stoppt die Schleife; "reduced" halbiert die Dichte und unterdrückt
   *  `shake` (kein Wackler). */
  setLevel(level: CombatFxLevel): void {
    this.level = level;
    if (level === "off") {
      this.particles.length = 0;
      this.active.length = 0;
      this.ambientFlags.clear();
      this.running = false;
      cancelAnimationFrame(this.raf);
      if (this.ctx) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  /** Spielt das Rezept unter `key` (falls eines registriert ist) als EINMALIGEN Effekt. `false` =
   *  kein Rezept (oder Level "off"/`FX_PARTICLES=false`) — der Aufrufer fällt dann auf den
   *  Sprite-Pfad zurück. */
  // claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: `elements`/`procs` werden ans Rezept durchgereicht.
  play(key: string, opts: { from: Point; to: Point; crit?: boolean; dir?: 1 | -1; durationMs?: number; onArrive?: () => void; box?: Rect; feet?: Point; petPos?: Point; elements?: readonly FxElement[]; procs?: readonly FxElement[] }): boolean {
    if (!FX_PARTICLES || this.level === "off" || !this.ctx) return false;
    const picked = selectRecipe(key, !!opts.crit, this.lastVariant);
    if (!picked) return false;
    const dir: 1 | -1 = opts.dir ?? (opts.to.x >= opts.from.x ? 1 : -1);
    picked.run({
      from: opts.from,
      to: opts.to,
      dir,
      crit: !!opts.crit,
      variant: picked.index,
      density: this.currentDensity(),
      api: this.buildApi(),
      durationMs: opts.durationMs,
      onArrive: opts.onArrive,
      box: opts.box,
      feet: opts.feet,
      petPos: opts.petPos,
      elements: opts.elements,
      procs: opts.procs,
    });
    this.ensureRunning();
    return true;
  }

  /** Startet einen DAUERHAFTEN Ambient-Loop unter `key` (Status-Körpereffekte) — idempotent über
   *  `id` (z.B. `"enemy:burn"`): ein zweiter Aufruf mit derselben `id`, während sie noch läuft,
   *  tut nichts. `false` = kein Rezept/Level "off". Der Aufrufer merkt sich KEINEN Rückgabewert
   *  fürs Beenden — dafür `stopAmbient(id)`. */
  startAmbient(key: string, id: string, opts: { at: Point; dir?: 1 | -1; box?: Rect; getBox?: () => Rect | undefined }): boolean {
    if (!FX_PARTICLES || this.level === "off" || !this.ctx) return false;
    if (this.ambientFlags.has(id)) return true;
    const picked = selectRecipe(key, false, this.lastVariant);
    if (!picked) return false;
    const flag = { active: true };
    this.ambientFlags.set(id, flag);
    picked.run({
      from: opts.at,
      to: opts.at,
      dir: opts.dir ?? 1,
      crit: false,
      variant: picked.index,
      density: this.currentDensity(),
      api: this.buildApi(),
      box: opts.box,
      getBox: opts.getBox,
      isActive: () => flag.active,
    });
    this.ensureRunning();
    return true;
  }

  /** Beendet einen per `startAmbient` gestarteten Loop (Status abgelaufen) — no-op, wenn `id`
   *  nicht (mehr) läuft. */
  stopAmbient(id: string): void {
    const flag = this.ambientFlags.get(id);
    if (flag) flag.active = false;
    this.ambientFlags.delete(id);
  }

  /** Beendet alle Ambient-Loops, deren `id` mit `prefix` beginnt (z. B. `"enemy:"` beim Tod des Gegners,
   *  Chef-Report 28.08.2026: Brand lief ueber den Tod hinaus weiter). */
  stopAmbientPrefix(prefix: string): void {
    for (const [id, flag] of this.ambientFlags) {
      if (!id.startsWith(prefix)) continue;
      flag.active = false;
      this.ambientFlags.delete(id);
    }
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.ro?.disconnect();
    this.particles.length = 0;
    this.active.length = 0;
    this.ambientFlags.clear();
    this.canvas.remove();
  }

  private currentDensity(): number {
    return (this.level === "reduced" ? 0.5 : 1) * this.densityMult;
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(this.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.height * this.dpr));
  }

  private spawnParticle(p: Particle): Particle | null {
    if (this.particles.length >= MAX_PARTICLES) return null;
    this.particles.push(p);
    return p;
  }

  private buildApi(): ParticleApi {
    const density = this.currentDensity();
    return {
      ember: (x, y, vx, vy, life, size, color, grav = -40, drag = 0.985) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "ember", color, grav, drag }),
      spark: (x, y, vx, vy, life, size, color, grav = 120, drag = 0.99) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "spark", color, grav, drag }),
      mote: (x, y, vx, vy, life, size, color, grav = -15, drag = 0.98) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "mote", color, grav, drag, ph: rand(0, 6) }),
      shard: (x, y, vx, vy, life, size, color, grav = 220) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "shard", color, grav, drag: 0.985, rot: rand(0, 6), spin: rand(-8, 8) }),
      bubble: (x, y, vx, vy, life, size, color) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "bubble", color, grav: -45, drag: 0.97 }),
      drop: (x, y, vx, vy, life, size, color, grav = 320) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "drop", color, grav, drag: 0.995 }),
      feather: (x, y, vx, vy, life, size, theme) => this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "feather", grav: 22, drag: 0.975, rot: rand(-0.6, 0.6), ph: rand(0, 6), th: theme }),
      smoke: (x, y, vx, vy, life, size, rgbTriplet = "40,30,26", alpha = 0.28, grav = -20) =>
        void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "smoke", smokeRgb: rgbTriplet, smokeAlpha: alpha, grav, drag: 0.97 }),
      dust: (x, y, vx, vy, life, size) => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "dust", grav: 12, drag: 0.96 }),
      ash: (x, y, vx, vy, life, size) => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "ash", grav: -12, drag: 0.985, spin: rand(2, 5), ax: x }),
      blood: (x, y, vx, vy, life, size, rgbTriplet = "150,22,28") => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "blood", bloodRgb: rgbTriplet, grav: 420, drag: 0.985 }),
      bone: (x, y, vx, vy, life, size) => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "bone", grav: 380, drag: 0.985, rot: rand(0, 6), spin: rand(-9, 9) }),
      splinter: (x, y, vx, vy, life, size) => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "splinter", grav: 380, drag: 0.985, rot: rand(0, 6), spin: rand(-12, 12) }),
      stone: (x, y, vx, vy, life, size) => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "stone", grav: 520, drag: 0.985, rot: rand(0, 6), spin: rand(-7, 7) }),
      glass: (x, y, vx, vy, life, size) => void this.spawnParticle({ x, y, vx, vy, age: 0, life, size, kind: "glass", grav: 400, drag: 0.985, rot: rand(0, 6), spin: rand(-10, 10) }),
      rime: (x, y, life, size, theme) => void this.spawnParticle({ x, y, vx: 0, vy: 0, age: 0, life, size, kind: "rime", grav: 0, drag: 1, rot: rand(0, 6), th: theme }),
      pull: (handle, at, force) => {
        if (handle) {
          handle.follow = at;
          handle.pull = force;
        }
      },
      drawCore,
      drawVoidCore,
      drawGlyph,
      drawCrystal,
      drawStar,
      drawFeather,
      drawArrow,
      boltPath,
      boltBranches,
      drawBolt,
      flash: (at, r, colorPrefix, ms) => this.active.push(makeFlashEffect(at, r, colorPrefix, ms)),
      ring: (at, r, ms, colorPrefix = "rgba(255,120,40,", w = 10, sq = 1, from = 0.2) => this.active.push(makeRingEffect(at, r, ms, colorPrefix, w, sq, from)),
      column: (at, h, ms, th, w = 16) => this.active.push(makeColumnEffect(at, h, ms, th, w)),
      rayFromAbove: (x, yEnd, ms, th, w, xTop = x) => this.active.push(makeRayEffect(x, yEnd, ms, th, w, xTop)),
      beam: (a, b, ms, th, w) => this.active.push(makeBeamEffect(a, b, ms, th, w)),
      slashArc: (o) => this.active.push(makeSlashArcEffect(o)),
      crack: (at, ms, n = 3, len = 120, th = null) => this.active.push(makeCrackEffect(at, ms, n, len, th)),
      addEffect: (effect) => this.active.push(effect),
      timed: (ms, draw, update) => {
        let age = 0;
        this.active.push({
          update: (dt) => {
            age += dt;
            update?.(dt, age, Math.min(1, age / ms));
          },
          draw: (c) => draw(c, age, Math.min(1, age / ms)),
          alive: () => age < ms,
        });
      },
      delay: (ms, fn) => {
        let age = 0;
        let fired = false;
        this.active.push({
          update: (dt) => {
            age += dt;
            if (!fired && age >= ms) {
              fired = true;
              fn();
            }
          },
          draw: () => {},
          alive: () => !fired,
        });
      },
      shake: (amount) => {
        if (this.level === "full") this.wobble = Math.max(this.wobble, amount);
      },
      count: (base, dtMs) => {
        const n = base * density * (dtMs / 16.7);
        const f = Math.floor(n);
        return f + (Math.random() < n - f ? 1 : 0);
      },
      burst: (base) => Math.round(base * density),
      rand,
      pick,
    };
  }

  private ensureRunning(): void {
    if (this.running || document.hidden) return;
    if (this.particles.length === 0 && this.active.length === 0) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private readonly frame = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(48, now - this.last);
    this.last = now;

    // Adaptive Dichte: schrittweise runter bei Framedrops (>22ms), langsam wieder rauf.
    this.densityMult = dt > 22 ? Math.max(0.5, this.densityMult - 0.04) : Math.min(1, this.densityMult + 0.01);

    for (const e of this.active) e.update(dt);
    if (this.active.some((e) => !e.alive())) this.active = this.active.filter((e) => e.alive());

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.age += dt;
      if (p.age >= p.life) {
        this.particles[i] = this.particles[this.particles.length - 1]!;
        this.particles.pop();
        continue;
      }
      const s = dt / 1000;
      if (p.follow && p.pull) {
        const dx = p.follow.x - p.x;
        const dy = p.follow.y - p.y;
        const L = Math.hypot(dx, dy) || 1;
        p.vx += (dx / L) * p.pull * s;
        p.vy += (dy / L) * p.pull * s;
        if (L < 7) {
          p.age = p.life; // am Ziel angekommen — nächster Aufräum-Durchlauf entfernt sie
          continue;
        }
      }
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.grav * s;
      p.x += p.vx * s;
      p.y += p.vy * s;
      if (p.kind === "ember") p.x += Math.sin(p.age / 60 + p.size) * 18 * s;
      else if (p.kind === "ash" && p.ax !== undefined && p.spin !== undefined) p.x = p.ax + Math.sin((p.age / 1000) * p.spin) * 22;
      else if (p.kind === "feather") p.x += Math.sin(p.age / 260 + (p.ph ?? 0)) * 45 * s;
      else if (p.spin !== undefined) p.rot = (p.rot ?? 0) + p.spin * s;
    }

    this.wobble = Math.max(0, this.wobble - dt / 25);
    this.draw();

    if (this.particles.length > 0 || this.active.length > 0) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.running = false;
    }
  };

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.save();
    if (this.wobble > 0.05) ctx.translate(rand(-this.wobble, this.wobble), rand(-this.wobble, this.wobble));

    // Erste Lage (Demo-Reihenfolge): source-over — gedeckte Materialien, keine additive Glut.
    ctx.globalCompositeOperation = "source-over";
    for (const p of this.particles) {
      if (p.kind === "smoke") drawSmokeParticle(ctx, p);
      else if (p.kind === "dust") drawDustParticle(ctx, p);
      else if (p.kind === "ash") drawAshParticle(ctx, p);
      else if (p.kind === "blood") drawBloodParticle(ctx, p);
      else if (p.kind === "bone" || p.kind === "splinter" || p.kind === "stone" || p.kind === "glass") drawBoneSplinterGlassParticle(ctx, p);
    }

    // Zweite Lage: "lighter" (additiv) — Glut/Funken/Motes/Splitter/Rime/Blasen/Tropfen/Federn,
    // PLUS die laufenden Effekte (bewegter Kern, Blitzpfad, Flash, Ring, Glutsäule …) — dieselbe
    // additive Ebene wie in den Demos, damit sie den Hintergrund aufhellen statt flach zu decken.
    ctx.globalCompositeOperation = "lighter";
    for (const p of this.particles) {
      if (p.kind === "ember") drawEmberParticle(ctx, p);
      else if (p.kind === "spark") drawSparkParticle(ctx, p);
      else if (p.kind === "mote") drawMoteParticle(ctx, p);
      else if (p.kind === "shard") drawShardParticle(ctx, p);
      else if (p.kind === "rime") drawRimeParticle(ctx, p);
      else if (p.kind === "bubble") drawBubbleParticle(ctx, p);
      else if (p.kind === "drop") drawDropParticle(ctx, p);
      else if (p.kind === "feather") drawFeatherParticle(ctx, p);
    }
    for (const e of this.active) e.draw(ctx);
    ctx.restore();
  }
}
