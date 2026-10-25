/**
 * Kampfeffekte — NAHKAMPF 1.4.1 (Chef 25.10.2026: „Für 1.4.1 möchte ich auch den Melee-Animationen
 * etwas mehr Liebe geben, wie wir es schon bei Magie taten. Für jede Waffenart passende Angriffs-
 * und Impact-Effekte, auch mit möglichen Elementar-Modifiern wie z. B. Feuer, Bleed etc.").
 *
 * Ersetzt für den SPIELER die vier groben Familien (`slash_cut/heavy/blunt/thrust` in
 * fxParticleLibrary.ts — bleiben als Rückfall und für Gegnerangriffe registriert) durch je ein
 * eigenes Rezept pro Nahkampf-Waffenart: `melee_<weaponType>` (zehn Arten, je zwei Varianten plus
 * eine Crit-Variante). Jedes Rezept bringt seine eigene Angriffsspur UND seinen eigenen Einschlag
 * mit (Dolch-Funkenglanz, Streitkolben-Stauchring, Maul-Bodenriss mit Steinsplittern …).
 *
 * Element-Modifikatoren: `ctx.elements` (CombatPage: Status-Effekte der Mainhand inkl. Runen, s.
 * `meleeElementsFor`) legt über Spur und Einschlag eine Überlagerung in den Magie-Paletten
 * (FIRE/FROST/SHOCK/POISON/CRIMSON/VOID). `ctx.procs` (Status, die laut Kampflog in DIESEM Schlag
 * wirklich ausgelöst haben) setzt einen deutlicheren Moment obendrauf; das bestehende
 * `status_<typ>`-Aufflammen plus Ambient-Loop schließt im CombatPage-Log-Diff ohnehin an.
 *
 * Reine Client-Darstellung: Zufall wie in der übrigen Bibliothek über `api.rand`/`Math.random`,
 * die Engine bleibt unberührt. Leistung: dieselben Werkzeuge wie die Magie-Rezepte (`api.burst`/
 * `api.count` skalieren mit Effektstufe × adaptiver Dichte, Deckel 2500 Partikel in der Stage);
 * Spuren sind ein paar Pfade je Frame ohne Partikel. Effektstufe „aus" erreicht diese Datei nie
 * (`ParticleStage.play` liefert vorher `false`).
 *
 * Diese Datei importiert NUR die Engine (`./fxParticles`) und Typen aus `@hearthforge/shared`
 * (type-only, zur Laufzeit gelöscht) — damit sie sich für die Demo-Seite
 * (design/combat-fx/demo-nahkampf.html) unverändert bündeln lässt.
 */
// claude:2026-10-25T14:48:00+01:00 — Nahkampf 1.4.1: neue Datei (Zuordnung, Bewegung, Spuren, Einschläge, Element-Überlagerungen).
import type { StatusType, WeaponEffect, WeaponType } from "@hearthforge/shared";
import {
  registerRecipe,
  rgba,
  themeColorFn,
  THEMES,
  type ColorFn,
  type FxElement,
  type Point,
  type RecipeContext,
  type RecipeFn,
  type ThemeColors,
} from "./fxParticles";

const STEEL = THEMES.steel!;
const GOLD = THEMES.gold!;
const FIRE_TH = THEMES.fire!;
const FROST_TH = THEMES.frost!;
const SHOCK_TH = THEMES.shock!;
const POISON_TH = THEMES.poison!;
const VOID_TH = THEMES.void!;
const CRIMSON = THEMES.crimson!;

const steelColor = themeColorFn(STEEL);
const goldColor = themeColorFn(GOLD);
const fireColor = themeColorFn(FIRE_TH);
const frostColor = themeColorFn(FROST_TH);
const boltColor = themeColorFn(SHOCK_TH);
const poisonColor = themeColorFn(POISON_TH);
const voidColor = themeColorFn(VOID_TH);

// =================================================================================================
// ZUORDNUNG (pur, testbar) — Waffenart → Rezept, Waffeneffekte → Element, Waffenart → Bewegung
// =================================================================================================

/** Alle Nahkampf-Waffenarten des Contents (Bögen/Magie laufen über Geschoss-Rezepte). */
export const MELEE_WEAPON_TYPES = ["dagger", "sword", "scimitar", "mace", "axe", "battleaxe", "spear", "greataxe", "greatsword", "maul"] as const satisfies readonly WeaponType[];
export type MeleeWeaponType = (typeof MELEE_WEAPON_TYPES)[number];

const MELEE_TYPE_SET: ReadonlySet<string> = new Set(MELEE_WEAPON_TYPES);

/** Rezept-Schlüssel der Waffenart (`melee_<weaponType>`), `null` für Fernkampf/Magie/unbekannt —
 *  der Aufrufer fällt dann auf die alte Familie (`slash_<familie>`, combatFx.ts) zurück. */
export function meleeRecipeKeyFor(weaponType: WeaponType | null | undefined): string | null {
  return weaponType && MELEE_TYPE_SET.has(weaponType) ? `melee_${weaponType}` : null;
}

const STATUS_ELEMENT: Readonly<Record<StatusType, FxElement>> = {
  burn: "fire",
  frost: "frost",
  shock: "shock",
  poison: "poison",
  bleed: "bleed",
  void: "void",
};

/** Element eines geloggten Status (`kind:"status"`), `null` für Nicht-Status. */
export function meleeElementForStatus(status: string | null | undefined): FxElement | null {
  return (status && (STATUS_ELEMENT as Readonly<Record<string, FxElement>>)[status]) || null;
}

/**
 * Element-Überlagerungen aus der effektiven Waffeneffekt-Liste der Mainhand (Basis + Runen, so wie
 * die Engine sie würfelt: `effectiveInstanceWeaponEffects`). Spezial-Effekte (execute, momentum …)
 * fallen heraus. Höchstens ZWEI Elemente, damit die Spur lesbar bleibt: echte Elemente zuerst in
 * Listenreihenfolge (Waffe vor Rune), Blutung zuletzt — ein Blutungs-Schwert mit Flammen-Rune
 * zeigt also Glut UND kräftigeres Blut, Feuer führt.
 */
export function meleeElementsFor(effects: ReadonlyArray<Pick<WeaponEffect, "type">>): FxElement[] {
  const out: FxElement[] = [];
  for (const e of effects) {
    const el = meleeElementForStatus(e.type);
    if (el && !out.includes(el)) out.push(el);
  }
  const elemental: FxElement[] = out.filter((el) => el !== "bleed");
  if (out.includes("bleed")) elemental.push("bleed");
  return elemental.slice(0, 2);
}

/** Kurzbewegung der Spielfigur je Waffenklasse: schneller Stich (Dolch, Speer), Schnitt (Einhand-
 *  Klingen, Axt = bisherige Lunge), weiter Schwung (Zweihänder, Kampfaxt), Überkopf (Streitkolben,
 *  Maul). */
export type MeleeMotion = "stab" | "slash" | "sweep" | "overhead";

const WEAPON_MOTION: Readonly<Record<MeleeWeaponType, MeleeMotion>> = {
  dagger: "stab",
  spear: "stab",
  sword: "slash",
  scimitar: "slash",
  axe: "slash",
  battleaxe: "sweep",
  greatsword: "sweep",
  greataxe: "sweep",
  mace: "overhead",
  maul: "overhead",
};

export function meleeMotionFor(weaponType: WeaponType | null | undefined): MeleeMotion {
  return weaponType && MELEE_TYPE_SET.has(weaponType) ? WEAPON_MOTION[weaponType as MeleeWeaponType] : "slash";
}

/**
 * WAAPI-Keyframes der Spielfigur (Blickrichtung rechts, `figureRef` in CombatPage) — dezent, reine
 * Transforms, kein Layout-Sprung. „slash" ist exakt die bisherige `LUNGE_RIGHT`-Lunge. Der
 * Schlagmoment (größter Ausschlag) liegt grob auf dem Einschlag-Delay der Rezepte unten.
 */
export const MELEE_MOTION_KEYFRAMES: Readonly<Record<MeleeMotion, { frames: Keyframe[]; duration: number; easing: string }>> = {
  stab: {
    frames: [
      { transform: "translateX(0) rotate(0)" },
      { transform: "translateX(-6px) rotate(-1deg)", offset: 0.14 },
      { transform: "translateX(66px) scale(1.06) rotate(1.5deg)", offset: 0.38 },
      { transform: "translateX(60px) scale(1.06) rotate(1.5deg)", offset: 0.52 },
      { transform: "translateX(0) rotate(0)" },
    ],
    duration: 320,
    easing: "ease-out",
  },
  slash: {
    frames: [
      { transform: "translateX(0) rotate(0)" },
      { transform: "translateX(55px) scale(1.1) rotate(4deg)", offset: 0.45 },
      { transform: "translateX(55px) scale(1.1) rotate(4deg)", offset: 0.6 },
      { transform: "translateX(0) rotate(0)" },
    ],
    duration: 400,
    easing: "ease-out",
  },
  sweep: {
    frames: [
      { transform: "translateX(0) rotate(0)" },
      { transform: "translateX(-12px) rotate(-7deg) scale(1.02)", offset: 0.2 },
      { transform: "translateX(52px) rotate(8deg) scale(1.1)", offset: 0.42 },
      { transform: "translateX(48px) rotate(6deg) scale(1.1)", offset: 0.6 },
      { transform: "translateX(0) rotate(0)" },
    ],
    duration: 470,
    easing: "ease-in-out",
  },
  overhead: {
    frames: [
      { transform: "translateX(0) translateY(0) rotate(0)" },
      { transform: "translateX(6px) translateY(-14px) rotate(-6deg) scale(1.05)", offset: 0.24 },
      { transform: "translateX(50px) translateY(6px) rotate(7deg) scale(1.1)", offset: 0.44 },
      { transform: "translateX(46px) translateY(4px) rotate(6deg) scale(1.1)", offset: 0.6 },
      { transform: "translateX(0) translateY(0) rotate(0)" },
    ],
    duration: 450,
    easing: "ease-in-out",
  },
};

// =================================================================================================
// KLEINE HELFER
// =================================================================================================

/** Zielrichtungs-Winkel: spiegelt für Gegnerangriffe (wie `ang` in fxParticleLibrary.ts). */
const ang = (dir: 1 | -1, a: number): number => (dir > 0 ? a : Math.PI - a);
/** Crit-Faktor, gedämpft für Radien (Bogen bleibt auf dem Körper). */
const kr = (k: number): number => 1 + (k - 1) * 0.35;
const critK = (ctx: RecipeContext): number => (ctx.crit ? 1.5 : 1);
const feetOf = (ctx: RecipeContext): Point => ctx.feet ?? { x: ctx.to.x, y: ctx.to.y + 130 };
// claude:2026-10-25T15:09:00+01:00 — Im-Spiel-Prüfung: Spuren wirkten am großen Bullen etwas klein → mit der Bühnengröße
// skalieren, aber knapp gedeckelt: die Ankerbox (`.fighter-figure-art`) ist ein Rahmen, nicht die Silhouette — bei 1,5×
// liefen die Bögen über dem Rücken des Bullen in den Himmel (Kontaktbogen im-spiel, zweiter Lauf).
/** Größe der Ankerbox relativ zur Demo-Referenz (220 px hoch), gedeckelt auf 0,9…1,2. */
const sizeOf = (ctx: RecipeContext): number => (ctx.box?.h ? Math.min(1.2, Math.max(0.9, ctx.box.h / 220)) : 1);
/** Punkt relativ zur Brust des Ziels; `dx` zeigt in Angriffsrichtung. */
const at = (ctx: RecipeContext, dx: number, dy: number): Point => ({ x: ctx.to.x + ctx.dir * dx, y: ctx.to.y + dy });

const ELEMENT_THEME: Readonly<Record<FxElement, ThemeColors>> = {
  fire: FIRE_TH,
  frost: FROST_TH,
  shock: SHOCK_TH,
  poison: POISON_TH,
  bleed: CRIMSON,
  void: VOID_TH,
};

/** Funkenfächer in Stahlfarbe; `base` = Mittelwinkel (0 = Angriffsrichtung), `spread` = halbe Öffnung. */
function steelSparks(ctx: RecipeContext, p: Point, n: number, o: { spread?: number; base?: number; v0?: number; v1?: number; s0?: number; s1?: number; grav?: number; color?: ColorFn } = {}): void {
  const { dir, api } = ctx;
  const m = api.burst(n);
  const spread = o.spread ?? 1.1;
  const base = o.base ?? 0;
  for (let i = 0; i < m; i++) {
    const a = base + api.rand(-spread, spread);
    const v = api.rand(o.v0 ?? 70, o.v1 ?? 280);
    api.spark(p.x, p.y, dir * Math.cos(a) * v, Math.sin(a) * v - 30, api.rand(140, 360), api.rand(o.s0 ?? 1.1, o.s1 ?? 2.1), o.color ?? steelColor, o.grav ?? 320);
  }
}

/** Ein heller Schnitt-Strich quer über den Körper, öffnet sich von der Mitte aus (Klingen-Treffer). */
function cutMark(ctx: RecipeContext, a: Point, b: Point, ms: number, w: number, th: ThemeColors = STEEL): void {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  ctx.api.timed(ms, (c, _age, u) => {
    const open = Math.min(1, u / 0.25);
    const fade = u < 0.3 ? 1 : 1 - (u - 0.3) / 0.7;
    const ax = mx + (a.x - mx) * open;
    const ay = my + (a.y - my) * open;
    const bx = mx + (b.x - mx) * open;
    const by = my + (b.y - my) * open;
    c.lineCap = "round";
    const layers: Array<[number, string]> = [
      [w * 4, `${th.glow}${0.14 * fade})`],
      [w * 1.6, rgba(th.mid, 0.55 * fade)],
      [Math.max(1, w * 0.45), `rgba(255,255,255,${0.95 * fade})`],
    ];
    for (const [lw, cc] of layers) {
      c.strokeStyle = cc;
      c.lineWidth = lw;
      c.beginPath();
      c.moveTo(ax, ay);
      c.lineTo(bx, by);
      c.stroke();
    }
  });
}

/** Kurzer Glanz-Stern (Dolch-Spitze, Crit-Glint). */
function glint(ctx: RecipeContext, p: Point, r: number, ms: number, th: ThemeColors = STEEL): void {
  const rot = ctx.api.rand(0, Math.PI);
  ctx.api.timed(ms, (c, _age, u) => {
    const s = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
    ctx.api.drawStar(c, p.x, p.y, r * (0.5 + 0.5 * s), rot + u * 0.6, th, 0.95 * s, 4);
  });
}

/** Staub + Steinsplitter + Ring + Riss am Boden (Hammer/Maul/Großaxt). */
function groundSlam(ctx: RecipeContext, k: number, o: { crack?: number; len?: number; ring?: number; stones?: number; dust?: number } = {}): void {
  const { api } = ctx;
  const f = feetOf(ctx);
  api.ring(f, (o.ring ?? 110) * k, 340, "rgba(165,145,115,", 8, 0.26);
  api.crack(f, 900, o.crack ?? 3, (o.len ?? 120) * kr(k));
  const d = api.burst((o.dust ?? 14) * k);
  for (let i = 0; i < d; i++) api.dust(f.x + api.rand(-40, 40), f.y, api.rand(-170, 170), api.rand(-150, -30), api.rand(600, 1100), api.rand(9, 20));
  const s = api.burst((o.stones ?? 10) * k);
  for (let i = 0; i < s; i++) api.stone(f.x + api.rand(-24, 24), f.y - 4, api.rand(-230, 230), api.rand(-420, -180), api.rand(500, 900), api.rand(2.4, 5.2));
}

/** Stauchring (Streitkolben): zwei kurz versetzte, gestauchte Ringe um den Aufschlagpunkt. */
function compressionRing(ctx: RecipeContext, p: Point, k: number): void {
  const { api } = ctx;
  api.ring(p, 44 * k, 200, STEEL.glow, 10, 0.6, 0.1);
  api.delay(40, () => api.ring(p, 72 * k, 300, "rgba(200,180,150,", 4, 0.6, 0.35));
  api.flash(p, 42 * k, STEEL.glow, 110);
}

/** Druckwelle an der Speerspitze: senkrechte Ellipse (Scheibe von der Seite) + Luftstriche. */
function pressureWave(ctx: RecipeContext, p: Point, k: number): void {
  const { dir, api } = ctx;
  api.ring(p, 24 * k, 260, STEEL.glow, 6, 2.3, 0.25);
  api.timed(220, (c, _age, u) => {
    const a = 0.4 * (1 - u);
    c.strokeStyle = `${STEEL.glow}${a})`;
    c.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      const y = p.y + i * 9 * k;
      const x0 = p.x + dir * (10 + 40 * u);
      c.beginPath();
      c.moveTo(x0, y);
      c.lineTo(x0 + dir * (26 + 30 * u) * k * (1 - Math.abs(i) * 0.2), y);
      c.stroke();
    }
  });
}

/** Luftverdrängung (Großschwert): mehrere dünne Bögen laufen außerhalb der Klinge weiter nach
 *  außen, dazu Staub, der am Boden vom Angreifer weggedrückt wird. */
function airDisplacement(ctx: RecipeContext, cx: number, cy: number, r: number, a0: number, a1: number, k: number, tilt = 1): void {
  const { dir, api } = ctx;
  const ccw = a1 < a0;
  api.timed(380, (c, _age, u) => {
    c.save();
    c.translate(cx, cy);
    c.scale(1, tilt);
    for (let i = 0; i < 3; i++) {
      const uu = Math.max(0, u - i * 0.12);
      if (uu <= 0) continue;
      const rr = r * (1.06 + 0.32 * uu + i * 0.07);
      c.strokeStyle = `${STEEL.glow}${0.22 * (1 - uu) * (1 - i * 0.25)})`;
      c.lineWidth = 2.2 - i * 0.5;
      c.beginPath();
      c.arc(0, 0, rr, a0 + (a1 - a0) * 0.15, a1, ccw);
      c.stroke();
    }
    c.restore();
  });
  const f = feetOf(ctx);
  const m = api.burst(10 * k);
  for (let i = 0; i < m; i++) api.dust(f.x - dir * api.rand(0, 60), f.y + api.rand(-4, 4), dir * api.rand(60, 200), api.rand(-50, -10), api.rand(500, 900), api.rand(8, 15));
}

// =================================================================================================
// KLINGENSPUR (Bogen mit Schweif) + STOSSSPUR — beide tragen die Element-Spur automatisch
// =================================================================================================

interface TrailSpec {
  /** Drehpunkt des Bogens (bereits in Bühnen-Pixeln). */
  cx: number;
  cy: number;
  /** Radius am Anfang der Spur; `r1` am Ende (Sichel/Spirale), sonst konstant. */
  r: number;
  r1?: number;
  /** Start-/Endwinkel, bereits über `ang(dir, …)` gespiegelt. */
  a0: number;
  a1: number;
  ms: number;
  /** Maximale Klingenbreite am Kopf der Spur. */
  w: number;
  /** Anteil der Lebensdauer, in dem der Kopf den Bogen durchläuft (Default 0.45). */
  sweep?: number;
  /** Sichtbarer Schweif als Anteil des Bogens (0.5 = kurzer Hieb, 1 = volle Nachzieh-Spur). */
  tail?: number;
  /** Vertikale Stauchung (Perspektive flacher Schwünge). */
  tilt?: number;
  /** Gesamt-Deckkraft (Nachzieh-Geisterspur < 1). */
  alpha?: number;
  /** Element-Spur an dieser Spur unterdrücken (Geisterspur, Zwischenhiebe). */
  noElements?: boolean;
  /** Eigene Zusatz-Partikel am Kopf (Staub am Boden, Funken). */
  onHead?: (x: number, y: number, tangent: number, dt: number) => void;
}

const TRAIL_SEGMENTS = 18;

/** Sichelförmige, sich verjüngende Klingenspur (Glow → Körper → weiße Schneide) entlang eines
 *  Bogens; der Kopf läuft in `sweep` durch, danach zieht der Schweif nach und verblasst. */
function bladeTrail(ctx: RecipeContext, spec: TrailSpec): void {
  const { api, to: d } = ctx;
  // Spur um die Brust des Ziels mit der Zielgröße skalieren (Drehpunkt, Radien, Breite gedämpft).
  const S = sizeOf(ctx);
  const o: TrailSpec = { ...spec, cx: d.x + (spec.cx - d.x) * S, cy: d.y + (spec.cy - d.y) * S, r: spec.r * S, r1: (spec.r1 ?? spec.r) * S, w: spec.w * (0.5 + 0.5 * S) };
  const sweep = o.sweep ?? 0.45;
  const tail = o.tail ?? 0.55;
  const tilt = o.tilt ?? 1;
  const r1 = o.r1 ?? o.r;
  const alpha = o.alpha ?? 1;
  const els = o.noElements ? [] : (ctx.elements ?? []);
  const k = critK(ctx);
  const radAt = (t: number): number => o.r + (r1 - o.r) * t;
  const angAt = (t: number): number => o.a0 + (o.a1 - o.a0) * t;
  const px = (t: number, rad: number): number => o.cx + Math.cos(angAt(t)) * rad;
  const py = (t: number, rad: number): number => o.cy + Math.sin(angAt(t)) * rad * tilt;
  const outer: Point[] = [];
  const inner: Point[] = [];
  for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
    outer.push({ x: 0, y: 0 });
    inner.push({ x: 0, y: 0 });
  }
  let age = 0;
  let lastHead = 0;
  api.addEffect({
    update(dt) {
      age += dt;
      const u = Math.min(1, age / o.ms);
      const head = Math.min(1, u / sweep);
      if (head > lastHead) {
        const rad = radAt(head);
        const hx = px(head, rad);
        const hy = py(head, rad);
        const bx = px(lastHead, radAt(lastHead));
        const by = py(lastHead, radAt(lastHead));
        const tangent = Math.atan2(hy - by, hx - bx);
        for (const el of els) trailElement(ctx, el, hx, hy, tangent, dt, k / els.length);
        o.onHead?.(hx, hy, tangent, dt);
        lastHead = head;
      }
    },
    draw(c) {
      const u = Math.min(1, age / o.ms);
      const head = Math.min(1, u / sweep);
      const fade = (u < sweep ? 1 : 1 - (u - sweep) / (1 - sweep)) * alpha;
      const tailStart = Math.max(0, head - tail);
      // Nach dem Durchschwung zieht der Schweif zum Kopf nach (Spur „läuft aus").
      const t0 = u > sweep ? tailStart + (head - tailStart) * ((u - sweep) / (1 - sweep)) * 0.7 : tailStart;
      if (head - t0 < 0.01 || fade <= 0.01) return;
      for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
        const s = i / TRAIL_SEGMENTS;
        const t = t0 + (head - t0) * s;
        const thick = o.w * Math.pow(s, 1.3) * (0.55 + 0.45 * fade);
        const rad = radAt(t);
        const ox = outer[i]!;
        const ix = inner[i]!;
        ox.x = px(t, rad + thick * 0.5);
        ox.y = py(t, rad + thick * 0.5);
        ix.x = px(t, rad - thick * 0.5);
        ix.y = py(t, rad - thick * 0.5);
      }
      c.lineCap = "round";
      c.lineJoin = "round";
      // 1) breiter Glow entlang der Mittellinie (Element-Tönung zuerst, Stahl darüber)
      const centerline = (): void => {
        c.beginPath();
        for (let i = 0; i <= TRAIL_SEGMENTS; i++) {
          const mx = (outer[i]!.x + inner[i]!.x) / 2;
          const my = (outer[i]!.y + inner[i]!.y) / 2;
          if (i) c.lineTo(mx, my);
          else c.moveTo(mx, my);
        }
      };
      for (const el of els) {
        c.strokeStyle = `${ELEMENT_THEME[el].glow}${0.2 * fade})`;
        c.lineWidth = o.w * 2.4;
        centerline();
        c.stroke();
      }
      c.strokeStyle = `${STEEL.glow}${0.08 * fade})`;
      c.lineWidth = o.w * 2.2;
      centerline();
      c.stroke();
      // 2) Klingenkörper (gefüllte Sichel)
      c.beginPath();
      c.moveTo(outer[0]!.x, outer[0]!.y);
      for (let i = 1; i <= TRAIL_SEGMENTS; i++) c.lineTo(outer[i]!.x, outer[i]!.y);
      for (let i = TRAIL_SEGMENTS; i >= 0; i--) c.lineTo(inner[i]!.x, inner[i]!.y);
      c.closePath();
      const bodyTh = els.length && els[0] !== "bleed" ? ELEMENT_THEME[els[0]!] : STEEL;
      c.fillStyle = rgba(bodyTh.mid, 0.26 * fade);
      c.fill();
      // 3) Schneide: heller Saum auf der Außenkante, nur zum Kopf hin
      const from = Math.floor(TRAIL_SEGMENTS * 0.3);
      c.strokeStyle = rgba(bodyTh.hot, 0.6 * fade);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(outer[from]!.x, outer[from]!.y);
      for (let i = from + 1; i <= TRAIL_SEGMENTS; i++) c.lineTo(outer[i]!.x, outer[i]!.y);
      c.stroke();
      c.strokeStyle = `rgba(255,255,255,${0.9 * fade})`;
      c.lineWidth = 1.3;
      c.stroke();
      // 4) Blitz: Lichtbogen springt entlang der Schneide
      if (els.includes("shock") && fade > 0.25 && Math.random() < 0.7) {
        const pts: Point[] = [];
        for (let i = from; i <= TRAIL_SEGMENTS; i += 2) pts.push({ x: outer[i]!.x + api.rand(-5, 5), y: outer[i]!.y + api.rand(-5, 5) });
        if (pts.length > 1) api.drawBolt(c, pts, [], 0.35, 0.75 * fade, SHOCK_TH);
      }
    },
    alive: () => age < o.ms,
  });
}

interface StabSpec {
  a: Point;
  b: Point;
  ms: number;
  w: number;
  /** Anteil der Lebensdauer bis zur vollen Ausfahrt (Default 0.32). */
  reach?: number;
  noElements?: boolean;
}

/** Stoßspur (Speer/Dolchstich): schmaler Keil schießt von `a` nach `b`, hell an der Spitze, mit
 *  zwei parallelen Fahrtlinien; die Spitze zieht die Element-Spur hinter sich her. */
function stabTrail(ctx: RecipeContext, spec: StabSpec): void {
  const { api, to: d } = ctx;
  const S = sizeOf(ctx);
  const o: StabSpec = { ...spec, a: { x: d.x + (spec.a.x - d.x) * S, y: d.y + (spec.a.y - d.y) * S }, b: { x: d.x + (spec.b.x - d.x) * S, y: d.y + (spec.b.y - d.y) * S } };
  const reach = o.reach ?? 0.32;
  const els = o.noElements ? [] : (ctx.elements ?? []);
  const k = critK(ctx);
  const dx = o.b.x - o.a.x;
  const dy = o.b.y - o.a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const tangent = Math.atan2(dy, dx);
  let age = 0;
  let lastExt = 0;
  api.addEffect({
    update(dt) {
      age += dt;
      const ext = Math.min(1, age / o.ms / reach);
      if (ext > lastExt) {
        const tx = o.a.x + dx * ext;
        const ty = o.a.y + dy * ext;
        for (const el of els) trailElement(ctx, el, tx, ty, tangent, dt, (k * 0.8) / els.length);
        lastExt = ext;
      }
    },
    draw(c) {
      const u = Math.min(1, age / o.ms);
      const ext = Math.min(1, u / reach);
      const fade = u < reach + 0.1 ? 1 : 1 - (u - reach - 0.1) / (0.9 - reach);
      if (fade <= 0.01) return;
      const tx = o.a.x + dx * ext;
      const ty = o.a.y + dy * ext;
      const bx = o.a.x + dx * Math.max(0, ext - 0.75);
      const by = o.a.y + dy * Math.max(0, ext - 0.75);
      const bodyTh = els.length && els[0] !== "bleed" ? ELEMENT_THEME[els[0]!] : STEEL;
      for (const el of els) {
        c.strokeStyle = `${ELEMENT_THEME[el].glow}${0.2 * fade})`;
        c.lineWidth = o.w * 2.4;
        c.lineCap = "round";
        c.beginPath();
        c.moveTo(bx, by);
        c.lineTo(tx, ty);
        c.stroke();
      }
      // Keil: hinten haarfein, an der Spitze breit, dann spitz
      const hw = o.w * 0.5 * (0.6 + 0.4 * fade);
      c.beginPath();
      c.moveTo(bx, by);
      c.lineTo(tx - dx / L * 18 + nx * hw, ty - dy / L * 18 + ny * hw);
      c.lineTo(tx + (dx / L) * 6, ty + (dy / L) * 6);
      c.lineTo(tx - dx / L * 18 - nx * hw, ty - dy / L * 18 - ny * hw);
      c.closePath();
      c.fillStyle = rgba(bodyTh.mid, 0.45 * fade);
      c.fill();
      c.strokeStyle = `rgba(255,255,255,${0.9 * fade})`;
      c.lineWidth = 1.4;
      c.beginPath();
      c.moveTo(bx + (tx - bx) * 0.35, by + (ty - by) * 0.35);
      c.lineTo(tx, ty);
      c.stroke();
      // Fahrtlinien
      c.strokeStyle = `${STEEL.glow}${0.28 * fade})`;
      c.lineWidth = 1.2;
      for (const side of [-1, 1]) {
        const off = side * (hw + 7);
        c.beginPath();
        c.moveTo(bx + (tx - bx) * 0.2 + nx * off, by + (ty - by) * 0.2 + ny * off);
        c.lineTo(tx - (dx / L) * 26 + nx * off, ty - (dy / L) * 26 + ny * off);
        c.stroke();
      }
      if (els.includes("shock") && Math.random() < 0.6) {
        api.drawBolt(c, api.boltPath({ x: bx + (tx - bx) * 0.3, y: by + (ty - by) * 0.3 }, { x: tx, y: ty }, 9, 3), [], 0.35, 0.7 * fade, SHOCK_TH);
      }
    },
    alive: () => age < o.ms,
  });
}

// =================================================================================================
// ELEMENT-ÜBERLAGERUNGEN — Spur (je Frame am Kopf), Einschlag (Zusatz), Auslöser (deutlich)
// =================================================================================================

/** Partikel am Kopf einer Spur, je Frame (`api.count` = dichte- und framezeit-normiert). */
function trailElement(ctx: RecipeContext, el: FxElement, x: number, y: number, tangent: number, dt: number, k: number): void {
  const { api } = ctx;
  const back = tangent + Math.PI;
  if (el === "fire") {
    const n = api.count(1.8 * k, dt);
    for (let i = 0; i < n; i++) api.ember(x + api.rand(-4, 4), y + api.rand(-4, 4), Math.cos(back) * api.rand(10, 50), api.rand(-70, -25), api.rand(320, 600), api.rand(2.5, 5.5), fireColor, -70, 0.965);
    if (Math.random() < 0.08 * k) api.smoke(x, y, api.rand(-10, 10), api.rand(-30, -10), api.rand(500, 800), api.rand(8, 13), FIRE_TH.smoke, 0.18, -8);
  } else if (el === "frost") {
    const n = api.count(0.9 * k, dt);
    for (let i = 0; i < n; i++) api.rime(x + api.rand(-6, 6), y + api.rand(-6, 6), api.rand(360, 620), api.rand(2.4, 4.4), FROST_TH);
    const m = api.count(0.9 * k, dt);
    for (let i = 0; i < m; i++) api.mote(x, y, Math.cos(back) * api.rand(10, 40), api.rand(-25, 5), api.rand(400, 700), api.rand(1.2, 2.2), frostColor, -4);
  } else if (el === "shock") {
    const n = api.count(1.3 * k, dt);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      api.spark(x, y, Math.cos(a) * api.rand(60, 200), Math.sin(a) * api.rand(60, 200), api.rand(110, 230), api.rand(1.1, 1.9), boltColor, 0, 0.93);
    }
  } else if (el === "poison") {
    const n = api.count(1.1 * k, dt);
    for (let i = 0; i < n; i++) api.drop(x + api.rand(-4, 4), y, Math.cos(back) * api.rand(10, 40), api.rand(0, 50), api.rand(320, 520), api.rand(1.6, 2.6), poisonColor, 420);
    if (Math.random() < 0.12 * k) api.smoke(x, y, api.rand(-8, 8), api.rand(-20, -4), api.rand(500, 850), api.rand(9, 14), POISON_TH.smoke, 0.22, -4);
  } else if (el === "bleed") {
    const n = api.count(1.2 * k, dt);
    for (let i = 0; i < n; i++) {
      const v = api.rand(60, 170);
      api.blood(x, y, Math.cos(tangent) * v * 0.6 + api.rand(-20, 20), Math.sin(tangent) * v * 0.6 - api.rand(10, 60), api.rand(320, 560), api.rand(1.5, 2.6), "150,22,28");
    }
  } else {
    const n = api.count(1 * k, dt);
    for (let i = 0; i < n; i++) api.mote(x + api.rand(-5, 5), y + api.rand(-5, 5), Math.cos(back) * api.rand(5, 30), api.rand(-30, -8), api.rand(420, 720), api.rand(1.6, 2.8), voidColor, -10, 0.97);
    if (Math.random() < 0.1 * k) api.smoke(x, y, 0, api.rand(-14, -4), api.rand(500, 800), api.rand(8, 12), VOID_TH.smoke, 0.32, -4);
  }
}

/** Element-Zusatz zum Einschlag. `s` skaliert Zwischenhiebe herunter (0.5) — der letzte Treffer
 *  eines Rezepts bekommt die volle Überlagerung. */
function elementImpact(ctx: RecipeContext, p: Point, k: number, s = 1): void {
  const els = ctx.elements ?? [];
  if (!els.length) return;
  const share = (k * s) / Math.max(1, els.length * 0.8);
  for (const el of els) elementBurst(ctx, el, p, share, false);
}

/** Auslöser in DIESEM Schlag (Kampflog): deutlicherer Moment, einmal je Rezept am letzten Treffer. */
function elementProcs(ctx: RecipeContext, p: Point, k: number): void {
  for (const el of ctx.procs ?? []) elementBurst(ctx, el, p, k, true);
}

function elementBurst(ctx: RecipeContext, el: FxElement, p: Point, k: number, strong: boolean): void {
  const { dir, api } = ctx;
  const th = ELEMENT_THEME[el];
  const big = strong ? 1.8 : 1;
  if (el === "fire") {
    // Flammenzungen: große, schnell steigende Glut + Funken nach vorn + Rauch
    api.flash(p, 44 * k * big, th.glow, strong ? 220 : 160);
    const t = api.burst(10 * k * big);
    for (let i = 0; i < t; i++) api.ember(p.x + api.rand(-16, 16), p.y + api.rand(-12, 12), dir * api.rand(0, 70) + api.rand(-30, 30), api.rand(-170, -60) * (strong ? 1.25 : 1), api.rand(280, 540), api.rand(5, 10) * (strong ? 1.4 : 1), fireColor, -90, 0.96);
    const sp = api.burst(8 * k);
    for (let i = 0; i < sp; i++) {
      const a = api.rand(-1, 1);
      api.spark(p.x, p.y, dir * Math.cos(a) * api.rand(80, 240), Math.sin(a) * api.rand(80, 200) - 40, api.rand(200, 420), api.rand(1.3, 2.2), fireColor, 180);
    }
    for (let i = 0; i < (strong ? 4 : 2); i++) api.smoke(p.x + api.rand(-10, 10), p.y + api.rand(-10, 6), api.rand(-14, 14), api.rand(-40, -14), api.rand(600, 1000), api.rand(10, 18), th.smoke, 0.22, -10);
    if (strong) {
      api.ring(p, 64 * k, 320, th.glow, 8, 0.8, 0.25);
      api.shake(4);
    }
  } else if (el === "frost") {
    // Reifkristalle + Splitterring
    api.flash(p, 36 * k * big, th.glow, 150);
    const n = api.burst(10 * k * big);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      const v = api.rand(80, 230) * (strong ? 1.2 : 1);
      api.shard(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v - 30, api.rand(260, 480), api.rand(2, 4), frostColor, 260);
    }
    const r = api.burst(4 * big);
    for (let i = 0; i < r; i++) api.rime(p.x + api.rand(-26, 26), p.y + api.rand(-30, 30), api.rand(500, 900), api.rand(3, 6), th);
    const rot = api.rand(0, 1);
    api.timed(strong ? 300 : 220, (c, _age, u) => {
      api.drawCrystal(c, p.x, p.y, (10 + 24 * u) * big, rot + u * 0.5, th, 0.6 * (1 - u), 6);
    });
    if (strong) {
      api.ring(p, 70 * k, 340, "rgba(170,220,255,", 6, 0.75, 0.3);
      const g = api.burst(6);
      for (let i = 0; i < g; i++) api.glass(p.x, p.y, api.rand(-160, 160), api.rand(-200, -60), api.rand(400, 700), api.rand(3, 5));
      api.shake(3);
    }
  } else if (el === "shock") {
    // Funkenstern + kurze Entladungen
    const rot = api.rand(0, Math.PI);
    api.timed(strong ? 220 : 160, (c, _age, u) => {
      const s = u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75;
      api.drawStar(c, p.x, p.y, (18 + 18 * s) * big, rot, th, 0.95 * s, 6);
    });
    const n = api.burst(12 * k * big);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      const v = api.rand(120, 320);
      api.spark(p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, api.rand(120, 260), api.rand(1.2, 2.1), boltColor, 0, 0.94);
    }
    const bolts = strong ? 4 : 1;
    for (let b = 0; b < bolts; b++) {
      const a = api.rand(0, Math.PI * 2);
      const len = api.rand(45, 80) * (strong ? 1.4 : 1);
      const pts = api.boltPath(p, { x: p.x + Math.cos(a) * len, y: p.y + Math.sin(a) * len }, 12, 4);
      const brs = strong ? api.boltBranches(pts, 1, a, 3) : [];
      api.timed(130, (c, _age, u) => api.drawBolt(c, pts, brs, 0.55, 1 - u, th));
    }
    if (strong) {
      api.flash(p, 70 * k, th.glow, 160);
      api.shake(4);
    }
  } else if (el === "poison") {
    // grüne Tropfen + Dunst + Bläschen
    const n = api.burst(12 * k * big);
    for (let i = 0; i < n; i++) api.drop(p.x + api.rand(-6, 6), p.y + api.rand(-6, 6), dir * api.rand(10, 150) + api.rand(-40, 40), api.rand(-160, -40), api.rand(420, 720), api.rand(1.8, 3.2), poisonColor, 460);
    const m = strong ? 7 : 3;
    for (let i = 0; i < m; i++) api.smoke(p.x + api.rand(-18, 18), p.y + api.rand(-14, 14), api.rand(-20, 20), api.rand(-26, -6), api.rand(700, 1200), api.rand(12, 22) * (strong ? 1.3 : 1), th.smoke, 0.3, -4);
    const b = api.burst(4 * big);
    for (let i = 0; i < b; i++) api.bubble(p.x + api.rand(-14, 14), p.y + api.rand(-10, 10), api.rand(-10, 10), api.rand(-40, -14), api.rand(400, 700), api.rand(1.8, 3.2), poisonColor);
    if (strong) {
      api.ring(p, 54 * k, 320, th.glow, 6, 0.6, 0.3);
      api.flash(p, 50 * k, th.glow, 180);
    }
  } else if (el === "bleed") {
    // kräftigerer Blutsprühnebel (zusätzlich zur normalen Trefferreaktion `blood_red`)
    const n = api.burst(16 * k * big);
    for (let i = 0; i < n; i++) {
      const a = api.rand(-0.8, 0.8);
      const v = api.rand(90, 300) * (strong ? 1.25 : 1);
      api.blood(p.x + api.rand(-4, 4), p.y + api.rand(-10, 10), dir * Math.cos(a) * v, Math.sin(a) * v - 50, api.rand(340, 640), api.rand(2, 3.8), "150,22,28");
    }
    for (let i = 0; i < (strong ? 5 : 3); i++) api.smoke(p.x + dir * api.rand(4, 30), p.y + api.rand(-12, 12), dir * api.rand(20, 60), api.rand(-14, 10), api.rand(380, 640), api.rand(10, 18), "110,10,16", 0.3, 0);
    if (strong) {
      // arterieller Strahl: zwei dünne rote Bögen in Angriffsrichtung
      api.timed(260, (c, _age, u) => {
        c.save();
        c.globalCompositeOperation = "source-over";
        c.strokeStyle = `rgba(150,20,26,${0.75 * (1 - u)})`;
        c.lineCap = "round";
        for (let i = 0; i < 2; i++) {
          const len = (50 + 40 * i) * Math.min(1, u * 3);
          c.lineWidth = 3 - i;
          c.beginPath();
          c.moveTo(p.x, p.y + i * 8);
          c.quadraticCurveTo(p.x + dir * len * 0.6, p.y - 24 + i * 8, p.x + dir * len, p.y + 10 + i * 14 + 40 * u);
          c.stroke();
        }
        c.restore();
      });
      api.flash(p, 40, CRIMSON.glow, 160);
    }
  } else {
    // Entzug: purpurne Motes werden in den Einschlag gezogen, dunkler Kern
    const n = api.burst(12 * k * big);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      const r = api.rand(40, 80) * (strong ? 1.3 : 1);
      api.pull(api.mote(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 0, 0, 520, api.rand(2, 3.4), voidColor, 0, 1), p, 2400);
    }
    api.flash(p, 34 * k * big, th.glow, 160);
    if (strong) {
      api.timed(320, (c, _age, u) => {
        const s = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
        api.drawVoidCore(c, p.x, p.y, 4 + 14 * s * k);
      });
      api.ring(p, 60 * k, 320, th.glow, 6, 0.8, 0.9);
    }
  }
}

/** Schluss-Treffer eines Rezepts: waffeneigener Einschlag + Element-Zusatz + Auslöser-Moment. */
function land(ctx: RecipeContext, p: Point, k: number, impact: (p: Point, k: number) => void): void {
  impact(p, k);
  elementImpact(ctx, p, k);
  elementProcs(ctx, p, k);
}

// =================================================================================================
// WAFFENARTEN — je zwei Varianten + Crit. Winkel in Blickrichtung rechts, `ang(dir, …)` spiegelt.
// =================================================================================================

// ─── Dolch: schnelle, schmale Doppelschnitte, feine Funken ────────────────────────────────────────

const daggerImpact = (ctx: RecipeContext) => (p: Point, k: number): void => {
  glint(ctx, p, 14 * k, 150);
  steelSparks(ctx, p, 9 * k, { spread: 1.3, v0: 120, v1: 340, s0: 0.8, s1: 1.4, grav: 200 });
  ctx.api.shake(ctx.crit ? 4 : 1.5);
};

function daggerCut(ctx: RecipeContext, delay: number, up: boolean, r = 56, w = 5, final = false): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    const cy = d.y + (up ? -26 : 26);
    bladeTrail(ctx, { cx: d.x - dir * 8, cy, r: r * kr(k), a0: ang(dir, up ? 2.3 : -2.3), a1: ang(dir, up ? 0.5 : -0.5), ms: 190, sweep: 0.4, w: w * k, tail: 0.5 });
    api.delay(60, () => {
      const p = at(ctx, 22, up ? -12 : 12);
      if (final) land(ctx, p, k, daggerImpact(ctx));
      else {
        steelSparks(ctx, p, 5 * k, { spread: 1.2, v0: 100, v1: 300, s0: 0.8, s1: 1.3, grav: 200 });
        elementImpact(ctx, p, k, 0.4);
      }
    });
  });
}

const daggerDouble: RecipeFn = (ctx) => {
  daggerCut(ctx, 50, false);
  daggerCut(ctx, 130, true, 56, 5, true);
};
const daggerStabCut: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(50, () => {
    stabTrail(ctx, { a: { x: d.x - dir * 90, y: d.y - 6 }, b: { x: d.x + dir * 8, y: d.y - 6 }, ms: 170, w: 7 * k, reach: 0.35 });
    api.delay(55, () => {
      steelSparks(ctx, at(ctx, 6, -6), 6 * k, { spread: 0.6, v0: 120, v1: 320, s0: 0.8, s1: 1.3, grav: 160 });
      elementImpact(ctx, at(ctx, 6, -6), k, 0.4);
    });
  });
  daggerCut(ctx, 150, false, 52, 5, true);
};
const daggerCrit: RecipeFn = (ctx) => {
  daggerCut(ctx, 40, false, 50, 5);
  daggerCut(ctx, 95, true, 52, 5);
  daggerCut(ctx, 150, false, 58, 6);
  daggerCut(ctx, 205, true, 62, 6, true);
  ctx.api.delay(270, () => {
    glint(ctx, at(ctx, 10, 0), 30, 220, GOLD);
    ctx.api.flash(ctx.to, 70, STEEL.glow, 140);
    steelSparks(ctx, ctx.to, 18, { spread: Math.PI, v0: 120, v1: 360, s0: 0.8, s1: 1.5, grav: 160, color: goldColor });
    ctx.api.shake(6);
  });
};
registerRecipe("melee_dagger", [daggerDouble, daggerStabCut], daggerCrit);

// ─── Schwert: saubere Bogenklinge ─────────────────────────────────────────────────────────────────

const swordImpact = (ctx: RecipeContext, rising: boolean) => (p: Point, k: number): void => {
  const { dir } = ctx;
  const a = { x: p.x - dir * 34 * k, y: p.y + (rising ? 30 : -30) * k };
  const b = { x: p.x + dir * 34 * k, y: p.y + (rising ? -30 : 30) * k };
  cutMark(ctx, a, b, 230, 2.4 * k);
  steelSparks(ctx, b, 10 * k, { spread: 0.9, base: rising ? -0.7 : 0.6 });
  ctx.api.shake(ctx.crit ? 5 : 2.5);
};

function swordArc(ctx: RecipeContext, delay: number, rising: boolean, final: boolean, o: { r?: number; w?: number; cxOff?: number; cyOff?: number; a0?: number; a1?: number } = {}): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    const cy = d.y + (o.cyOff ?? (rising ? -44 : 44));
    bladeTrail(ctx, {
      cx: d.x - dir * (o.cxOff ?? 48),
      cy,
      r: (o.r ?? 100) * kr(k),
      a0: ang(dir, o.a0 ?? (rising ? 2.05 : -2.05)),
      a1: ang(dir, o.a1 ?? (rising ? 0.1 : -0.1)),
      ms: 300,
      w: (o.w ?? 11) * k,
      tail: 0.6,
    });
    api.delay(95, () => {
      if (final) land(ctx, ctx.to, k, swordImpact(ctx, rising));
      else {
        steelSparks(ctx, ctx.to, 6 * k);
        elementImpact(ctx, ctx.to, k, 0.5);
      }
    });
  });
}

const swordDown: RecipeFn = (ctx) => swordArc(ctx, 90, false, true);
const swordUp: RecipeFn = (ctx) => swordArc(ctx, 90, true, true);
const swordCrit: RecipeFn = (ctx) => {
  swordArc(ctx, 80, false, false, { w: 12 });
  swordArc(ctx, 210, false, true, { cxOff: 72, cyOff: 4, r: 112, a0: -1.25, a1: 1.05, w: 13 });
  ctx.api.delay(300, () => {
    ctx.api.flash(ctx.to, 90, STEEL.glow, 150);
    glint(ctx, at(ctx, 30, -20), 26, 200, GOLD);
    ctx.api.shake(7);
  });
};
registerRecipe("melee_sword", [swordDown, swordUp], swordCrit);

// ─── Krummsäbel: geschwungene Sichel-Spur ─────────────────────────────────────────────────────────

const scimitarImpact = (ctx: RecipeContext, low: boolean) => (p: Point, k: number): void => {
  const { dir, api } = ctx;
  // gebogener Schnitt auf dem Körper (kurzer Sichelbogen) + Funken entlang der Tangente
  const cx = p.x - dir * 30;
  const cy = p.y + (low ? -40 : 40);
  const a0 = ang(dir, low ? 0.9 : -0.9);
  const a1 = ang(dir, low ? 2.0 : -2.0);
  api.timed(220, (c, _age, u) => {
    const fade = u < 0.3 ? 1 : 1 - (u - 0.3) / 0.7;
    c.lineCap = "round";
    c.strokeStyle = rgba(STEEL.mid, 0.55 * fade);
    c.lineWidth = 3.5 * k;
    c.beginPath();
    c.arc(cx, cy, 48 * k, Math.min(a0, a1), Math.max(a0, a1));
    c.stroke();
    c.strokeStyle = `rgba(255,255,255,${0.9 * fade})`;
    c.lineWidth = 1.2;
    c.stroke();
  });
  steelSparks(ctx, p, 11 * k, { spread: 0.5, base: low ? 0.5 : -0.5, v0: 120, v1: 320, s0: 1, s1: 1.8 });
  api.shake(ctx.crit ? 5 : 2.5);
};

function sickle(ctx: RecipeContext, delay: number, low: boolean, final: boolean, o: { r?: number; r1?: number; a0?: number; a1?: number; w?: number; ms?: number } = {}): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    bladeTrail(ctx, {
      cx: d.x - dir * 22,
      cy: d.y + (low ? 22 : -8),
      r: (o.r ?? 56) * kr(k),
      r1: (o.r1 ?? 112) * kr(k),
      a0: ang(dir, o.a0 ?? (low ? 2.6 : -2.6)),
      a1: ang(dir, o.a1 ?? (low ? -0.3 : 0.45)),
      ms: o.ms ?? 300,
      sweep: 0.42,
      w: (o.w ?? 10) * k,
      tail: 0.8,
      tilt: 0.9,
    });
    api.delay(100, () => {
      if (final) land(ctx, ctx.to, k, scimitarImpact(ctx, low));
      else {
        steelSparks(ctx, ctx.to, 6 * k, { spread: 0.5, base: low ? 0.5 : -0.5 });
        elementImpact(ctx, ctx.to, k, 0.5);
      }
    });
  });
}

const scimitarSweep: RecipeFn = (ctx) => sickle(ctx, 90, false, true);
const scimitarS: RecipeFn = (ctx) => {
  sickle(ctx, 80, false, false, { r: 48, r1: 92, ms: 240 });
  sickle(ctx, 170, true, true, { r: 48, r1: 96, ms: 260 });
};
const scimitarCrit: RecipeFn = (ctx) => {
  sickle(ctx, 80, false, true, { r: 44, r1: 126, a0: -3.0, a1: 1.7, w: 13, ms: 400 });
  ctx.api.delay(230, () => {
    ctx.api.flash(ctx.to, 85, STEEL.glow, 150);
    glint(ctx, at(ctx, 20, 30), 24, 200, GOLD);
    steelSparks(ctx, ctx.to, 14, { spread: Math.PI, v0: 100, v1: 320, color: goldColor });
    ctx.api.shake(7);
  });
};
registerRecipe("melee_scimitar", [scimitarSweep, scimitarS], scimitarCrit);

// ─── Speer: lineare Stoßlinie mit Druckwelle an der Spitze ───────────────────────────────────────

const spearImpact = (ctx: RecipeContext) => (p: Point, k: number): void => {
  pressureWave(ctx, p, k);
  steelSparks(ctx, p, 10 * k, { spread: 0.35, v0: 140, v1: 380, grav: 140 });
  ctx.api.shake(ctx.crit ? 5 : 2.5);
};

function spearThrust(ctx: RecipeContext, delay: number, yoff: number, over: number, final: boolean, w = 9): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    stabTrail(ctx, { a: { x: d.x - dir * 230, y: d.y + yoff }, b: { x: d.x + dir * over, y: d.y + yoff }, ms: 250, w: w * k });
    api.delay(80, () => {
      const p = { x: d.x, y: d.y + yoff };
      if (final) land(ctx, p, k, spearImpact(ctx));
      else {
        pressureWave(ctx, p, k * 0.8);
        elementImpact(ctx, p, k, 0.5);
      }
    });
  });
}

const spearThrust1: RecipeFn = (ctx) => spearThrust(ctx, 75, 0, 14, true);
const spearDouble: RecipeFn = (ctx) => {
  spearThrust(ctx, 70, -16, 10, false);
  spearThrust(ctx, 175, 16, 14, true);
};
const spearCrit: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  spearThrust(ctx, 80, 0, 120, true, 11);
  api.delay(200, () => {
    const exit = { x: d.x + dir * 70, y: d.y };
    pressureWave(ctx, exit, 1.8);
    steelSparks(ctx, exit, 20, { spread: 0.5, v0: 180, v1: 460, grav: 120, color: goldColor });
    api.flash(d, 80, STEEL.glow, 140);
    api.shake(8);
  });
};
registerRecipe("melee_spear", [spearThrust1, spearDouble], spearCrit);

// ─── Streitkolben: kurzer Hieb mit Stauchring und Metallfunken ───────────────────────────────────

const maceImpact = (ctx: RecipeContext) => (p: Point, k: number): void => {
  compressionRing(ctx, p, k);
  steelSparks(ctx, p, 16 * k, { spread: 1.5, v0: 120, v1: 380, s0: 1.3, s1: 2.4, grav: 620 });
  ctx.api.shake(ctx.crit ? 8 : 4.5);
};

function maceSwing(ctx: RecipeContext, delay: number, side: boolean, final: boolean, o: { r?: number; w?: number } = {}): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    bladeTrail(ctx, side
      ? { cx: d.x - dir * 64, cy: d.y + 6, r: (o.r ?? 80) * kr(k), a0: ang(dir, -1.35), a1: ang(dir, 0.35), ms: 230, sweep: 0.36, w: (o.w ?? 14) * k, tail: 0.45, tilt: 0.8 }
      : { cx: d.x - dir * 34, cy: d.y + 6, r: (o.r ?? 72) * kr(k), a0: ang(dir, -2.25), a1: ang(dir, -0.2), ms: 230, sweep: 0.36, w: (o.w ?? 14) * k, tail: 0.45 });
    api.delay(80, () => {
      const p = at(ctx, side ? 12 : 4, side ? 0 : -12);
      if (final) land(ctx, p, k, maceImpact(ctx));
      else {
        compressionRing(ctx, p, k * 0.7);
        elementImpact(ctx, p, k, 0.5);
      }
    });
  });
}

const maceOverhead: RecipeFn = (ctx) => maceSwing(ctx, 120, false, true);
const maceSide: RecipeFn = (ctx) => maceSwing(ctx, 110, true, true);
const maceCrit: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  api.delay(120, () => {
    bladeTrail(ctx, { cx: d.x - dir * 20, cy: d.y + 24, r: 98, a0: ang(dir, -2.65), a1: ang(dir, -0.25), ms: 260, sweep: 0.36, w: 20, tail: 0.5 });
    api.delay(85, () => {
      land(ctx, at(ctx, 4, -14), 1.5, maceImpact(ctx));
      api.delay(60, () => compressionRing(ctx, at(ctx, 4, -14), 1.9));
      groundSlam(ctx, 0.7, { crack: 2, len: 90, ring: 90, stones: 5, dust: 8 });
      api.flash(d, 90, STEEL.glow, 150);
      steelSparks(ctx, d, 12, { spread: Math.PI, v0: 150, v1: 400, grav: 600, color: goldColor });
      api.shake(10);
    });
  });
};
registerRecipe("melee_mace", [maceOverhead, maceSide], maceCrit);

// ─── Hammer/Maul: Überkopf-Schmettern mit Bodenriss, Staub und Steinsplittern ─────────────────────

const maulImpact = (ctx: RecipeContext, after: boolean) => (p: Point, k: number): void => {
  const { api } = ctx;
  compressionRing(ctx, p, k * 0.8);
  groundSlam(ctx, k, { crack: ctx.crit ? 5 : 3, len: ctx.crit ? 165 : 120, ring: 115, stones: 11, dust: 15 });
  if (after) api.delay(110, () => {
    api.ring(feetOf(ctx), 170 * k, 420, "rgba(165,145,115,", 6, 0.26, 0.4);
    api.crack(feetOf(ctx), 800, 2, 90 * k);
  });
  api.shake(ctx.crit ? 13 : 8);
};

function maulSlam(ctx: RecipeContext, delay: number, after: boolean, o: { r?: number; w?: number } = {}): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    bladeTrail(ctx, { cx: d.x - dir * 92, cy: d.y + 34, r: (o.r ?? 128) * kr(k), a0: ang(dir, -1.95), a1: ang(dir, 0.62), ms: 300, sweep: 0.36, w: (o.w ?? 18) * k, tail: 0.7 });
    api.delay(105, () => land(ctx, at(ctx, 16, 6), k, maulImpact(ctx, after)));
  });
}

const maulSmash: RecipeFn = (ctx) => maulSlam(ctx, 150, false);
const maulAftershock: RecipeFn = (ctx) => maulSlam(ctx, 150, true, { r: 120, w: 17 });
const maulCrit: RecipeFn = (ctx) => {
  maulSlam(ctx, 160, true, { r: 134, w: 22 });
  ctx.api.delay(270, () => {
    const f = feetOf(ctx);
    ctx.api.flash({ x: f.x, y: f.y - 20 }, 85, "rgba(220,195,150,", 170);
    groundSlam(ctx, 1.4, { crack: 2, len: 190, ring: 170, stones: 10, dust: 12 });
  });
};
registerRecipe("melee_maul", [maulSmash, maulAftershock], maulCrit);

// ─── Axt: hackender Schnitt mit Splittern ─────────────────────────────────────────────────────────

const axeImpact = (ctx: RecipeContext, steep: number) => (p: Point, k: number): void => {
  const { dir, api } = ctx;
  // Kerbe: kurzer, dicker Keil in Hiebrichtung
  const a = { x: p.x - dir * 22 * k * Math.cos(steep), y: p.y - 22 * k * Math.sin(steep) };
  const b = { x: p.x + dir * 18 * k * Math.cos(steep), y: p.y + 18 * k * Math.sin(steep) };
  cutMark(ctx, a, b, 200, 4.2 * k);
  const n = api.burst(8 * k);
  for (let i = 0; i < n; i++) {
    const ang2 = api.rand(-1.4, 0.4);
    api.bone(p.x, p.y, dir * Math.cos(ang2) * api.rand(60, 220), Math.sin(ang2) * api.rand(60, 200) - 70, api.rand(400, 750), api.rand(1.8, 3.6));
  }
  const m = api.burst(5 * k);
  for (let i = 0; i < m; i++) api.splinter(p.x, p.y, dir * api.rand(-60, 200), api.rand(-240, -60), api.rand(400, 700), api.rand(3, 6));
  steelSparks(ctx, p, 6 * k, { spread: 0.8, base: 0.4 });
  api.shake(ctx.crit ? 7 : 3.5);
};

function axeChop(ctx: RecipeContext, delay: number, steep: number, final: boolean, w = 12): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  api.delay(delay, () => {
    bladeTrail(ctx, { cx: d.x - dir * 58, cy: d.y - 34, r: 86 * kr(k), a0: ang(dir, -1.55 + steep * 0.3), a1: ang(dir, 0.4 + steep * 0.3), ms: 220, sweep: 0.34, w: w * k, tail: 0.42 });
    api.delay(70, () => {
      if (final) land(ctx, ctx.to, k, axeImpact(ctx, 0.75 + steep * 0.3));
      else {
        axeImpact(ctx, 0.75 + steep * 0.3)(ctx.to, k * 0.6);
        elementImpact(ctx, ctx.to, k, 0.5);
      }
    });
  });
}

const axeHack: RecipeFn = (ctx) => axeChop(ctx, 100, 0, true);
const axeDouble: RecipeFn = (ctx) => {
  axeChop(ctx, 90, -0.4, false, 11);
  axeChop(ctx, 200, 0.5, true, 12);
};
const axeCrit: RecipeFn = (ctx) => {
  axeChop(ctx, 100, 0, true, 16);
  ctx.api.delay(175, () => {
    ctx.api.flash(ctx.to, 85, STEEL.glow, 140);
    const n = ctx.api.burst(14);
    for (let i = 0; i < n; i++) ctx.api.bone(ctx.to.x, ctx.to.y, ctx.dir * ctx.api.rand(-60, 260), ctx.api.rand(-280, -60), ctx.api.rand(500, 850), ctx.api.rand(2, 4));
    glint(ctx, at(ctx, 16, -10), 22, 180, GOLD);
    ctx.api.shake(9);
  });
};
registerRecipe("melee_axe", [axeHack, axeDouble], axeCrit);

// ─── Kampfaxt / Großaxt: weiter, schwerer Bogen mit Nachzieh-Spur ─────────────────────────────────

const heavyAxeImpact = (ctx: RecipeContext, ground: boolean) => (p: Point, k: number): void => {
  axeImpact(ctx, 0.6)(p, k * 1.1);
  if (ground) groundSlam(ctx, k * 0.7, { crack: 2, len: 90, ring: 90, stones: 6, dust: 10 });
  ctx.api.shake(ctx.crit ? 10 : 5.5);
};

/** Schwerer Bogen + Geisterspur (Nachzieh-Spur) 55ms dahinter; `dustTrail` schleift Staub am Boden. */
function heavyArc(ctx: RecipeContext, delay: number, o: { cxOff: number; cyOff: number; r: number; a0: number; a1: number; w: number; ms: number; tilt?: number; ground: boolean; dustTrail?: boolean }): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  const feetY = feetOf(ctx).y;
  const spec: TrailSpec = {
    cx: d.x - dir * o.cxOff,
    cy: d.y + o.cyOff,
    r: o.r * kr(k),
    a0: ang(dir, o.a0),
    a1: ang(dir, o.a1),
    ms: o.ms,
    sweep: 0.42,
    w: o.w * k,
    tail: 1,
    tilt: o.tilt,
    onHead: o.dustTrail
      ? (x, y, _t, dt) => {
          if (y < feetY - 70) return;
          const n = api.count(1.4, dt);
          for (let i = 0; i < n; i++) api.dust(x, Math.min(feetY, y + 30), dir * api.rand(20, 90), api.rand(-50, -10), api.rand(500, 900), api.rand(8, 15));
        }
      : undefined,
  };
  api.delay(delay, () => {
    bladeTrail(ctx, spec);
    api.delay(55, () => bladeTrail(ctx, { ...spec, w: spec.w * 0.7, alpha: 0.45, noElements: true, onHead: undefined }));
    api.delay(o.ms * 0.42 * 0.72, () => land(ctx, ctx.to, k, heavyAxeImpact(ctx, o.ground)));
  });
}

const battleaxeWide: RecipeFn = (ctx) => heavyArc(ctx, 130, { cxOff: 72, cyOff: 18, r: 118, a0: -2.5, a1: 0.55, w: 14, ms: 380, ground: false });
const battleaxeRising: RecipeFn = (ctx) => heavyArc(ctx, 130, { cxOff: 72, cyOff: -16, r: 116, a0: 2.45, a1: -0.5, w: 14, ms: 380, ground: false });
const battleaxeCrit: RecipeFn = (ctx) => {
  heavyArc(ctx, 130, { cxOff: 78, cyOff: 20, r: 124, a0: -2.6, a1: 0.65, w: 17, ms: 400, ground: true });
  ctx.api.delay(255, () => {
    ctx.api.flash(ctx.to, 95, STEEL.glow, 150);
    glint(ctx, at(ctx, 24, 10), 24, 200, GOLD);
    ctx.api.shake(10);
  });
};
registerRecipe("melee_battleaxe", [battleaxeWide, battleaxeRising], battleaxeCrit);

const greataxeCleave: RecipeFn = (ctx) => heavyArc(ctx, 150, { cxOff: 80, cyOff: 36, r: 134, a0: -2.2, a1: 0.85, w: 17, ms: 420, ground: true, dustTrail: true });
const greataxeReap: RecipeFn = (ctx) => heavyArc(ctx, 150, { cxOff: 96, cyOff: 70, r: 150, a0: -1.25, a1: 0.95, w: 16, ms: 420, tilt: 0.55, ground: false, dustTrail: true });
const greataxeCrit: RecipeFn = (ctx) => {
  heavyArc(ctx, 150, { cxOff: 84, cyOff: 38, r: 140, a0: -2.35, a1: 0.9, w: 21, ms: 440, ground: true, dustTrail: true });
  ctx.api.delay(285, () => {
    ctx.api.flash(ctx.to, 105, STEEL.glow, 160);
    groundSlam(ctx, 1.2, { crack: 4, len: 150, ring: 140, stones: 10, dust: 12 });
    ctx.api.shake(12);
  });
};
registerRecipe("melee_greataxe", [greataxeCleave, greataxeReap], greataxeCrit);

// ─── Großschwert: breiter Sweep mit Luftverdrängung ───────────────────────────────────────────────

const greatswordImpact = (ctx: RecipeContext, diagonal: boolean) => (p: Point, k: number): void => {
  const { dir } = ctx;
  const a = { x: p.x - dir * 46 * k, y: p.y + (diagonal ? -34 : 6) * k };
  const b = { x: p.x + dir * 46 * k, y: p.y + (diagonal ? 34 : -6) * k };
  cutMark(ctx, a, b, 260, 3.4 * k);
  steelSparks(ctx, b, 12 * k, { spread: 0.8, base: diagonal ? 0.5 : -0.1, v0: 100, v1: 320 });
  ctx.api.shake(ctx.crit ? 9 : 5);
};

function greatSweep(ctx: RecipeContext, delay: number, diagonal: boolean, final: boolean, o: { w?: number; r?: number } = {}): void {
  const { to: d, dir, api } = ctx;
  const k = critK(ctx);
  const cx = d.x - dir * 84;
  const cy = d.y + (diagonal ? 52 : 12);
  const r = (o.r ?? (diagonal ? 128 : 136)) * kr(k);
  const a0 = ang(dir, diagonal ? -2.2 : -1.95);
  const a1 = ang(dir, diagonal ? -0.05 : 0.95);
  const tilt = diagonal ? 1 : 0.72;
  api.delay(delay, () => {
    bladeTrail(ctx, { cx, cy, r, a0, a1, ms: 360, sweep: 0.42, w: (o.w ?? 20) * k, tail: 0.8, tilt });
    api.delay(70, () => airDisplacement(ctx, cx, cy, r, a0, a1, k, tilt));
    api.delay(110, () => {
      if (final) land(ctx, ctx.to, k, greatswordImpact(ctx, diagonal));
      else {
        steelSparks(ctx, ctx.to, 8 * k);
        elementImpact(ctx, ctx.to, k, 0.5);
      }
    });
  });
}

const greatswordBroad: RecipeFn = (ctx) => greatSweep(ctx, 140, false, true);
const greatswordDiagonal: RecipeFn = (ctx) => greatSweep(ctx, 140, true, true);
const greatswordCrit: RecipeFn = (ctx) => {
  greatSweep(ctx, 130, true, false, { w: 21 });
  greatSweep(ctx, 260, false, true, { w: 23, r: 142 });
  ctx.api.delay(380, () => {
    ctx.api.flash(ctx.to, 110, STEEL.glow, 160);
    const f = feetOf(ctx);
    ctx.api.ring(f, 180, 420, "rgba(200,180,150,", 8, 0.26, 0.3);
    glint(ctx, at(ctx, 30, -24), 28, 220, GOLD);
    ctx.api.shake(11);
  });
};
registerRecipe("melee_greatsword", [greatswordBroad, greatswordDiagonal], greatswordCrit);
