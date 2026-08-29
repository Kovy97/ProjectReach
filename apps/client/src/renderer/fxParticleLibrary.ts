/**
 * Kampfeffekte — Partikel-Schicht, BIBLIOTHEK (Chef-Entscheid 28.08.2026, erweitert 28.08.2026
 * „sofort ALLE implementieren, für alle Waffen"). Reine Rezept-REGISTRIERUNG — importiert nur die
 * Engine (`./fxParticles`) und hängt beim Modul-Import (Seiteneffekt, `registerRecipe`) jedes
 * Rezept unter demselben Schlüssel ein, den auch die Mira-Sprites nutzen (s. `combatFx.ts`).
 * CombatPage.tsx importiert diese Datei EINMAL (nur wegen des Seiteneffekts) neben `fxParticles`.
 *
 * Portiert 1:1 aus `design/combat-fx/demo-partikel-effektbibliothek.html` (886 Zeilen, vom Chef
 * abgenommen): sieben Magie-Themen (je drei Angriffe + Crit + drei Einschläge), vier Nahkampf-
 * Familien (je zwei Varianten + Crit, gespiegelt für den Gegner), Pfeil (zwei Varianten + Crit),
 * Trefferreaktionen (Blut/Ichor/Knochenstaub/Block/Fehlschlag) und Begleiter (sechs Bildfamilien).
 * PLUS neu (Chef-Wunsch 28.08.2026): Status-Körpereffekte — ein kurzes „Aufflammen" beim Auflegen
 * (`status_<typ>`) und ein leiser Ambient-Loop am Körper, solange der Status aktiv ist
 * (`statusAmbient_<typ>`, s. CombatPage `ParticleStage.startAmbient`/`stopAmbient`).
 *
 * Architektur-Vereinfachungen ggü. der Demo (bewusst, s. Bericht an den Chef):
 * - Die Demo verkettet Geschoss→Einschlag in EINEM Aufruf (`o.land()` ruft den gewählten Einschlag
 *   direkt). Hier sind Geschoss (`missile_<x>`) und Einschlag (`impact_<x>`) GETRENNTE Registry-
 *   Einträge (wie bei den Sprites `playMissileFx`→`playImpactFx`) — `ctx.onArrive` meldet nur
 *   „angekommen", CombatPage wählt den Einschlag danach FRISCH aus dem `impact_<x>`-Pool. Optische
 *   Kopplungen der Demo (z.B. Gift-Crit löst zusätzlich verzögert einen zweiten Einschlag aus) sind
 *   dadurch nicht 1:1 übernommen — jeder Einschlag bleibt trotzdem exakt der Demo-Optik treu.
 * - Die Demo tönt/verdunkelt die ganze Szene (`targetFlash`/`darken`, eigene Platzhalter-Figuren).
 *   Das übernimmt im echten Spiel bereits das bestehende Treffer-Flash/Punch-System
 *   (`triggerHitFx`) auf einer ANDEREN Ebene (DOM, nicht Canvas) — hier NICHT erneut gebaut, nur
 *   der Bildschirm-Wackler (`api.shake`, Demo `hit(k)`) ist 1:1 übernommen.
 * - Pfeil „steckt" nach dem Einschlag mit einem angenäherten Winkel (`dir`-basiert) statt dem
 *   exakten Live-Flugwinkel der Demo (der ginge beim Geschoss/Einschlag-Split verloren).
 */
import {
  registerRecipe,
  rgba,
  themeColorFn,
  themeCorePalette,
  THEMES,
  type Effect,
  type Point,
  type RecipeContext,
  type RecipeFn,
  type ThemeColors,
} from "./fxParticles";

const ARCANE_TH = THEMES.arcane!;
const FIRE_TH = THEMES.fire!;
const FROST_TH = THEMES.frost!;
const SHOCK_TH = THEMES.shock!;
const POISON_TH = THEMES.poison!;
const VOID_TH = THEMES.void!;
const AETHER_TH = THEMES.aether!;
const STEEL = THEMES.steel!;
const GOLD = THEMES.gold!;
const CRIMSON = THEMES.crimson!;
const TEAL = THEMES.teal!;

// ─── Kleine gemeinsame Helfer ─────────────────────────────────────────────────────────────────

interface ProjectileState {
  x: number;
  y: number;
  u: number;
  age: number;
}

/** Geschoss-Effekt (Demo `projectile()`): interpoliert `ctx.from`→`ctx.to` über `T` ms mit einem
 *  Bogen-Scheitel `arc`, ruft `update(e,u,dt)` jeden Frame und `arrive()` beim Ankommen. */
function projectile(
  ctx: RecipeContext,
  o: {
    T: number;
    arc?: number;
    update?: (e: ProjectileState, u: number, dt: number) => void;
    draw?: (c: CanvasRenderingContext2D, e: ProjectileState) => void;
    arrive: () => void;
  },
): ProjectileState {
  const { from: s, to: d, api } = ctx;
  let age = 0;
  let done = false;
  const e: ProjectileState = { x: s.x, y: s.y, u: 0, age: 0 };
  const effect: Effect = {
    update(dt) {
      if (done) return;
      age += dt;
      e.age = age;
      const u = Math.min(1, age / o.T);
      e.u = u;
      e.x = s.x + (d.x - s.x) * u;
      e.y = s.y + (d.y - s.y) * u - Math.sin(u * Math.PI) * (o.arc ?? 0);
      o.update?.(e, u, dt);
      if (u >= 1) {
        done = true;
        o.arrive();
      }
    },
    draw(c) {
      if (!done) o.draw?.(c, e);
    },
    alive: () => !done,
  };
  api.addEffect(effect);
  return e;
}

/** Zielrichtungs-Winkel (Demo `ang(dir,a)`): spiegelt für Gegnerangriffe. */
const ang = (dir: 1 | -1, a: number): number => (dir > 0 ? a : Math.PI - a);
/** Radius-Wachstum bei Crit, gedämpft (Demo `kr(k)`) — der Bogen bleibt auf dem Körper. */
const kr = (k: number): number => 1 + (k - 1) * 0.35;

/** Funkenfächer an einem Punkt in Stahlfarbe (Demo `edgeSparks`). */
function edgeSparks(ctx: RecipeContext, at: Point, n: number, spread = 1.2): void {
  const { dir, api } = ctx;
  const m = api.burst(n);
  const color = themeColorFn(STEEL);
  for (let i = 0; i < m; i++) {
    const a = api.rand(-spread, spread);
    api.spark(at.x, at.y, dir * Math.cos(a) * api.rand(60, 260), Math.sin(a) * api.rand(60, 260) - 40, api.rand(150, 380), api.rand(1.2, 2.2), color, 300);
  }
}

/** Luftzug vom Angreifer zum Ziel + Staub am Fuß des Angreifers (Demo `dash`, Nahkampf-
 *  Ausfallschritt — die reale Figuren-Lunge übernimmt bereits die bestehende WAAPI-Animation,
 *  hier nur der Partikel-Anteil). */
function dash(ctx: RecipeContext, ms = 150): void {
  const { from: s, to: d, dir, api } = ctx;
  const a = { x: s.x - dir * 30, y: s.y + 60 };
  const b = { x: s.x + (d.x - s.x) * 0.55, y: d.y };
  api.timed(ms, (c, _age, u) => {
    const al = 0.35 * (1 - u);
    c.lineCap = "round";
    c.strokeStyle = `${STEEL.glow}${al})`;
    c.lineWidth = 14;
    c.beginPath();
    c.moveTo(a.x, a.y);
    c.lineTo(a.x + (b.x - a.x) * Math.min(1, u * 2), a.y + (b.y - a.y) * Math.min(1, u * 2));
    c.stroke();
  });
  const f = api.burst(6);
  for (let i = 0; i < f; i++) api.dust(s.x - dir * api.rand(0, 40), s.y + 78 + api.rand(0, 8), -dir * api.rand(20, 80), api.rand(-40, -10), api.rand(400, 800), api.rand(6, 12));
}

/** Boden-Stoßwelle unter dem Ziel + Staub (Demo `shock(o,r,ms,w)` — hier `groundShock` genannt,
 *  um Verwechslung mit dem Blitz-Thema `shock` zu vermeiden). */
function groundShock(ctx: RecipeContext, r: number, ms = 260, w = 10): void {
  const feet = ctx.feet ?? { x: ctx.to.x, y: ctx.to.y + 130 };
  ctx.api.ring(feet, r, ms, "rgba(200,180,150,", w, 0.28);
  const m = ctx.api.burst(10);
  for (let i = 0; i < m; i++) ctx.api.dust(feet.x + ctx.api.rand(-30, 30), feet.y, ctx.api.rand(-120, 120), ctx.api.rand(-90, -20), ctx.api.rand(500, 900), ctx.api.rand(8, 16));
}

/** Ein Schnittbogen über der Brust des Ziels (Demo `cut`); `cyOff>0` wölbt nach oben, `<0` nach
 *  unten. Kein `onArrive`-Aufruf — Nahkampf-Slashes haben (wie die Sprites) keine separate
 *  Einschlag-Phase, der Aufrufer setzt `onArrive` daher nicht. */
function cut(ctx: RecipeContext, a0: number, a1: number, r: number, w: number, delayMs: number, ms = 300, cyOff = 50): void {
  const { to: d, dir, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const cx = d.x - dir * 40;
  const cy = d.y + cyOff;
  api.delay(delayMs, () => {
    api.slashArc({ x: cx, y: cy, r: r * kr(k), a0: ang(dir, a0), a1: ang(dir, a1), ms, w: w * k, th: STEEL });
    edgeSparks(ctx, { x: cx + Math.cos(ang(dir, a1)) * r * kr(k), y: cy + Math.sin(ang(dir, a1)) * r * kr(k) }, 6 * k);
    api.shake(crit ? 5 : 2); // Demo-Baseline `hit(crit?8:4)`, hier gedämpft (nur ein Bruchteil eines Doppelschnitts)
  });
}

/** Gerader Stich (Demo `thrust`) — helle Linie schießt von der Hand bis zur Brust. */
function thrust(ctx: RecipeContext, yoff: number, over: number, delayMs: number, ms = 260): void {
  const { from: s, to: d, dir, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const a = { x: s.x - dir * 20, y: s.y + 70 + yoff };
  const b = { x: d.x + dir * over, y: d.y + yoff };
  api.delay(delayMs, () => {
    api.timed(ms, (c, _age, u) => {
      const ext = Math.min(1, u / 0.35);
      const fade = u < 0.45 ? 1 : 1 - (u - 0.45) / 0.55;
      const tx = a.x + (b.x - a.x) * ext;
      const ty = a.y + (b.y - a.y) * ext;
      c.lineCap = "round";
      const layers: Array<[number, string]> = [
        [12 * k, `${STEEL.glow}${0.12 * fade})`],
        [4 * k, rgba(STEEL.mid, 0.6 * fade)],
        [1.5, `rgba(255,255,255,${0.95 * fade})`],
      ];
      for (const [w, cc] of layers) {
        c.strokeStyle = cc;
        c.lineWidth = w;
        c.beginPath();
        c.moveTo(a.x + (tx - a.x) * 0.4, a.y + (ty - a.y) * 0.4);
        c.lineTo(tx, ty);
        c.stroke();
      }
    });
    api.delay(ms * 0.35, () => edgeSparks(ctx, { x: d.x, y: d.y + yoff }, 8 * k, 0.9));
  });
}

// =================================================================================================
// FEUER (aus demo-partikel-feuer-serie.html, 1:1) — bereits im ersten Kampfeffekte-Auftrag portiert.
// =================================================================================================

const FIRE_CORE = themeCorePalette(FIRE_TH);
const FIRE_CORE_HOT = themeCorePalette(FIRE_TH, true);
const fireColor = themeColorFn(FIRE_TH);

const fireMissileFireball: RecipeFn = (ctx) => {
  const { dir, api, density, durationMs = 560, onArrive } = ctx;
  const e = projectile(ctx, {
    T: durationMs,
    arc: 60,
    update(ee, u, dt) {
      const n = api.count(14, dt);
      for (let i = 0; i < n; i++) {
        const back = -dir * api.rand(60, 260);
        api.ember(ee.x + api.rand(-8, 8), ee.y + api.rand(-8, 8), back + api.rand(-40, 40), api.rand(-70, 30), api.rand(280, 640), api.rand(5, 13), fireColor, -40, 0.985);
        if (Math.random() < 0.35) api.smoke(ee.x, ee.y, back * 0.5 + api.rand(-30, 30), api.rand(-90, -30), api.rand(500, 1000), api.rand(10, 22));
        if (Math.random() < 0.25) api.spark(ee.x, ee.y, back * 0.3 + api.rand(-160, 160), api.rand(-160, 160), api.rand(200, 450), api.rand(1.5, 3), fireColor, 120);
      }
      void u;
    },
    draw(c, ee) {
      const r = 24 * (1 + 0.12 * Math.sin(ee.age / 28));
      api.drawCore(c, ee.x, ee.y, r, FIRE_CORE);
    },
    arrive: () => onArrive?.(),
  });
  void e;
  void density;
};

const fireMissileLance: RecipeFn = (ctx) => {
  const { dir, api, durationMs = 560, onArrive } = ctx;
  projectile(ctx, {
    T: durationMs * 0.8,
    arc: 12,
    update(ee, u, dt) {
      void u;
      const n = api.count(10 * 0.7, dt);
      for (let i = 0; i < n; i++) {
        const back = -dir * api.rand(220, 520);
        api.spark(ee.x + api.rand(-4, 4), ee.y + api.rand(-4, 4), back, api.rand(-25, 25), api.rand(160, 320), api.rand(1.5, 2.6), fireColor, 0);
        if (Math.random() < 0.4) api.ember(ee.x - dir * api.rand(0, 40), ee.y + api.rand(-5, 5), back * 0.35, api.rand(-30, 10), api.rand(180, 380), api.rand(3, 7), fireColor, -10);
      }
      if (Math.random() < 0.15) api.smoke(ee.x - dir * 30, ee.y, -dir * 60, api.rand(-60, -20), 700, api.rand(8, 14));
    },
    draw(c, ee) {
      c.save();
      c.translate(ee.x, ee.y);
      c.scale(dir * 3.2, 1);
      const g = c.createRadialGradient(4, 0, 0, 0, 0, 16);
      g.addColorStop(0, "rgba(255,255,240,1)");
      g.addColorStop(0.35, "rgba(255,200,120,0.95)");
      g.addColorStop(0.7, "rgba(255,110,30,0.7)");
      g.addColorStop(1, "rgba(120,20,10,0)");
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(0, 0, 16, 16, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
      c.strokeStyle = "rgba(255,240,200,0.9)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(ee.x - dir * 52, ee.y);
      c.lineTo(ee.x + dir * 26, ee.y);
      c.stroke();
    },
    arrive: () => onArrive?.(),
  });
};

const fireMissileSwarm: RecipeFn = (ctx) => {
  const { from: s, to: d, dir, api, durationMs = 560, onArrive } = ctx;
  const sub = [0, 1, 2, 3].map((i) => ({ ph: api.rand(0, 6.28), amp: api.rand(10, 26), sp: api.rand(5, 9), lag: i * 0.04, x: s.x, y: s.y }));
  let age = 0;
  let done = false;
  const effect: Effect = {
    update(dt) {
      if (done) return;
      age += dt;
      const u = Math.min(1, age / durationMs);
      const n = api.count(4, dt);
      for (const b of sub) {
        const uu = Math.max(0, u - b.lag);
        b.x = s.x + (d.x - s.x) * uu + Math.sin(((age / 90) * b.sp) / 7 + b.ph) * b.amp * 0.5;
        b.y = s.y + (d.y - s.y) * uu - Math.sin(uu * Math.PI) * 50 + Math.cos(((age / 90) * b.sp) / 7 + b.ph) * b.amp;
        for (let i = 0; i < n; i++) {
          api.ember(b.x, b.y, -dir * api.rand(40, 160) + api.rand(-20, 20), api.rand(-40, 20), api.rand(200, 460), api.rand(3, 7), fireColor);
          if (Math.random() < 0.4) api.spark(b.x, b.y, -dir * api.rand(60, 200), api.rand(-80, 80), api.rand(150, 350), 1.6, fireColor);
        }
      }
      if (u >= 1 && !done) {
        done = true;
        onArrive?.();
      }
    },
    draw(c) {
      if (done) return;
      for (const b of sub) api.drawCore(c, b.x, b.y, 11 + 2 * Math.sin(age / 40 + b.ph), FIRE_CORE);
    },
    alive: () => !done,
  };
  api.addEffect(effect);
};

const fireMissileCrit: RecipeFn = (ctx) => {
  const { from: s, to: d, dir, api, durationMs = 560, onArrive } = ctx;
  const T = durationMs;
  const k = 1.7;
  let age = 0;
  let done = false;
  let pulsed = false;
  let x = s.x;
  let y = s.y;
  const effect: Effect = {
    update(dt) {
      if (done) return;
      age += dt;
      const u = Math.min(1, age / T);
      x = s.x + (d.x - s.x) * u;
      y = s.y + (d.y - s.y) * u - Math.sin(u * Math.PI) * 60;
      const n = Math.round(14 * ctx.density * k * (dt / 16.7));
      for (let i = 0; i < n; i++) {
        const back = -dir * api.rand(60, 260) * k;
        api.ember(x + api.rand(-8, 8) * k, y + api.rand(-8, 8) * k, back + api.rand(-40, 40), api.rand(-70, 30), api.rand(280, 640), api.rand(5, 13) * k, fireColor, -40, 0.985);
        if (Math.random() < 0.35) api.smoke(x, y, back * 0.5 + api.rand(-30, 30), api.rand(-90, -30), api.rand(500, 1000), api.rand(10, 22) * k);
        if (Math.random() < 0.25) api.spark(x, y, back * 0.3 + api.rand(-160, 160), api.rand(-160, 160), api.rand(200, 450), api.rand(1.5, 3), fireColor, 120);
      }
      if (u > 0.85 && !pulsed) {
        pulsed = true;
        api.flash({ x, y }, 90, "rgba(255,240,200,", 120);
      }
      if (u >= 1 && !done) {
        done = true;
        onArrive?.();
      }
    },
    draw(c) {
      if (done) return;
      const r = 36 * (1 + 0.12 * Math.sin(age / 28));
      api.drawCore(c, x, y, r, FIRE_CORE_HOT);
      c.strokeStyle = "rgba(150,20,10,0.55)";
      c.lineWidth = 6;
      c.beginPath();
      c.arc(x, y, r * 1.15, 0, Math.PI * 2);
      c.stroke();
    },
    alive: () => !done,
  };
  api.addEffect(effect);
};

const fireImpactBurst: RecipeFn = (ctx) => {
  const { to, dir, crit, api } = ctx;
  const k = crit ? 1.7 : 1;
  const n = api.burst(90 * k);
  api.shake(crit ? 9 : 4);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const sp = api.rand(60, 380) * k;
    api.ember(to.x, to.y, Math.cos(a) * sp - dir * 40, Math.sin(a) * sp - 60, api.rand(300, 700), api.rand(4, 11) * k, fireColor, 160, 0.96);
    if (i % 3 === 0) api.spark(to.x, to.y, Math.cos(a) * sp * 1.4, Math.sin(a) * sp * 1.4, api.rand(200, 500), api.rand(1.5, 3), fireColor, 200);
    if (i % 4 === 0) api.smoke(to.x + api.rand(-20, 20), to.y + api.rand(-20, 20), api.rand(-60, 60), api.rand(-140, -40), api.rand(700, 1400), api.rand(16, 34) * k);
  }
  api.flash(to, crit ? 170 : 120, "rgba(255,170,80,", crit ? 240 : 170);
  api.ring(to, crit ? 150 : 100, 260, "rgba(255,120,40,");
};

const fireImpactSpray: RecipeFn = (ctx) => {
  const { to, dir, crit, api } = ctx;
  const k = crit ? 1.7 : 1;
  const n = api.burst(90 * k);
  api.shake(crit ? 7 : 3);
  for (let i = 0; i < n; i++) {
    const a = api.rand(-0.5, 0.5);
    const sp = api.rand(120, 420) * k;
    api.ember(to.x, to.y, dir * Math.cos(a) * sp * 0.9, Math.sin(a) * sp * 0.6 - 30, api.rand(350, 750), api.rand(6, 14) * k, fireColor, 260, 0.975);
    if (i % 2 === 0) {
      const b = api.rand(-1.2, 1.2);
      api.spark(to.x, to.y - 10, Math.sin(b) * api.rand(60, 260), -Math.cos(b) * api.rand(180, 420), api.rand(300, 600), api.rand(1.5, 2.8), fireColor, 320);
    }
    if (i % 5 === 0) api.smoke(to.x + dir * api.rand(0, 40), to.y, dir * api.rand(20, 90), api.rand(-90, -30), api.rand(600, 1100), api.rand(10, 22) * k);
  }
  api.flash(to, crit ? 130 : 90, "rgba(255,150,60,", 150);
};

const fireImpactColumn: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.7 : 1;
  const dur = 380 * (crit ? 1.3 : 1);
  api.shake(crit ? 6 : 3);
  api.flash(to, 90, "rgba(255,140,50,", 140);
  api.column(to, 150 * k, dur, FIRE_TH, 16 * k);
  api.timed(dur, () => {}, (dt, age) => {
    const m = api.count(6 * k, dt);
    for (let i = 0; i < m; i++) {
      const yy = to.y - api.rand(0, 150 * k) * Math.min(1, age / 160);
      api.ember(to.x + api.rand(-14, 14) * k, yy, api.rand(-30, 30), api.rand(-260, -120), api.rand(220, 520), api.rand(5, 12) * k, fireColor, -80, 0.98);
      if (Math.random() < 0.5) api.ash(to.x, yy, 0, api.rand(-90, -40), api.rand(700, 1300), api.rand(2, 4));
      if (Math.random() < 0.12) api.ember(to.x + api.rand(-20, 20), to.y + api.rand(-6, 6), api.rand(-20, 20), api.rand(-20, 0), api.rand(1500, 2600), api.rand(2, 4), fireColor, 10, 0.99);
    }
  });
};

registerRecipe("missile_fire", [fireMissileFireball, fireMissileLance, fireMissileSwarm], fireMissileCrit);
registerRecipe("impact_fire", [fireImpactBurst, fireImpactSpray, fireImpactColumn]);

// =================================================================================================
// BLITZ (shock) — Kettenblitz aus demo-partikel-feuer-blitz.html (Angriff), Kugelblitz + Blitzregen
// + zwei weitere Einschläge aus der Bibliothek.
// =================================================================================================

const boltColor = themeColorFn(SHOCK_TH);

interface BoltSegments {
  pts: Point[];
  branches: Point[][];
}

const shockMissileChain: RecipeFn = (ctx) => {
  const { from, to, crit, api, density, durationMs = 560, onArrive } = ctx;
  const k = crit ? 1.5 : 1;
  const chargeMs = Math.min(180, durationMs * 0.3);
  const boltMs = Math.max(120, durationMs - chargeMs);
  let age = 0;
  let firedArrive = false;
  let segs: BoltSegments | null = null;
  let lastGen = -1000;
  const effect: Effect = {
    update(dt) {
      age += dt;
      if (age < chargeMs) {
        const n = Math.round(3 * density);
        for (let i = 0; i < n; i++) {
          const a = api.rand(0, Math.PI * 2);
          const r = api.rand(18, 46);
          api.spark(from.x + Math.cos(a) * r, from.y + Math.sin(a) * r, -Math.cos(a) * 120, -Math.sin(a) * 120, 260, 2, boltColor, 0, 1);
        }
        return;
      }
      const t = age - chargeMs;
      if (t > boltMs) return;
      if (t - lastGen > 42) {
        const pts = api.boltPath(from, to, 70 * k);
        segs = { pts, branches: api.boltBranches(pts, crit ? 4 : 2, to.x >= from.x ? 0 : Math.PI) };
        lastGen = t;
      }
      if (!firedArrive) {
        firedArrive = true;
        onArrive?.();
      }
    },
    draw(c) {
      if (!segs || age < chargeMs) return;
      const t = age - chargeMs;
      if (t > boltMs) return;
      const u = t / boltMs;
      const a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
      const fl = 0.75 + 0.25 * Math.random();
      api.drawBolt(c, segs.pts, segs.branches, k, a * fl, SHOCK_TH);
    },
    alive: () => age < chargeMs + boltMs + 40,
  };
  api.addEffect(effect);
};

/** Kugelblitz (Demo `BOLT.orb`) — langsame, schlingernde Kugel mit knisternden Kurzbögen. */
const shockMissileOrb: RecipeFn = (ctx) => {
  const { dir, crit, api, density, durationMs = 560, onArrive } = ctx;
  const k = crit ? 1.5 : 1;
  let arcs: Point[][] = [];
  let lastGen = -1;
  projectile(ctx, {
    T: durationMs * 1.6,
    arc: 30,
    update(ee, u, dt) {
      void u;
      ee.y += Math.sin(ee.age / 70) * 6;
      if (ee.age - lastGen > 55) {
        lastGen = ee.age;
        arcs = [];
        for (let i = 0; i < 3 + (crit ? 2 : 0); i++) {
          const a = api.rand(0, Math.PI * 2);
          const r = 18 * k;
          const b = a + api.rand(-0.6, 0.6);
          const p0 = { x: ee.x + Math.cos(a) * r, y: ee.y + Math.sin(a) * r };
          arcs.push(api.boltPath(p0, { x: p0.x + Math.cos(b) * api.rand(18, 44) * k, y: p0.y + Math.sin(b) * api.rand(18, 44) * k }, 10, 3));
        }
      }
      const n = Math.round(3 * k * density * (dt / 16.7));
      for (let i = 0; i < n; i++) api.spark(ee.x + api.rand(-14, 14), ee.y + api.rand(-14, 14), api.rand(-40, 40), api.rand(20, 80), api.rand(200, 450), 1.6, boltColor, 260);
      if (Math.random() < 0.2) api.mote(ee.x, ee.y, -dir * api.rand(20, 80), api.rand(-20, 20), api.rand(300, 600), 2, boltColor);
    },
    draw(c, ee) {
      api.drawCore(c, ee.x, ee.y, 20 * k * (1 + 0.08 * Math.sin(ee.age / 40)), themeCorePalette(SHOCK_TH, true));
      for (const a of arcs) api.drawBolt(c, a, [], 0.4, 0.9, SHOCK_TH);
    },
    arrive: () => onArrive?.(),
  });
};

/** Blitzregen (Demo `BOLT.rain`) — Ladung am Stab, dann vier (Crit sechs) Schläge von oben, der
 *  letzte trifft (`onArrive`). Läuft komplett in der Flugzeit ab. */
const shockMissileRain: RecipeFn = (ctx) => {
  const { from: s, to: d, crit, api, durationMs = 560, onArrive } = ctx;
  const k = crit ? 1.5 : 1;
  const n = crit ? 6 : 4;
  api.timed(160, (c, _age, u) => api.drawCore(c, s.x, s.y, 10 + 14 * u, themeCorePalette(SHOCK_TH, true)), (dt) => {
    const m = Math.round(3 * ctx.density * (dt / 16.7));
    for (let i = 0; i < m; i++) {
      const a = api.rand(0, Math.PI * 2);
      const r = api.rand(20, 50);
      api.spark(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, -Math.cos(a) * 140, -Math.sin(a) * 140, 240, 2, boltColor, 0, 1);
    }
  });
  const spanMs = Math.max(200, durationMs - 160);
  for (let i = 0; i < n; i++) {
    const last = i === n - 1;
    const delayMs = 160 + i * (spanMs / n);
    api.delay(delayMs, () => {
      const to = last ? d : { x: d.x + api.rand(-110, 110), y: d.y + 130 };
      let age = 0;
      let segs: BoltSegments | null = null;
      let lastGen = -1e9;
      let struck = false;
      const from = { x: to.x + api.rand(-90, 90), y: to.y - 260 };
      const hold = last ? 260 : 140;
      const kk = last ? k : 0.6;
      const effect: Effect = {
        update(dt) {
          age += dt;
          if (age - lastGen > 40) {
            const pts = api.boltPath(from, to, 60 * kk);
            segs = { pts, branches: api.boltBranches(pts, 2, Math.PI / 2, 4) };
            lastGen = age;
          }
          if (!struck) {
            struck = true;
            if (last) onArrive?.();
            else {
              api.flash(to, 50, "rgba(246,231,161,", 120);
              const m = api.burst(14);
              for (let j = 0; j < m; j++) {
                const a = api.rand(-Math.PI, 0);
                api.spark(to.x, to.y, Math.cos(a) * api.rand(60, 220), Math.sin(a) * api.rand(60, 220), api.rand(150, 350), 1.6, boltColor, 300);
              }
            }
          }
        },
        draw(c) {
          if (!segs) return;
          const u = age / hold;
          const a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
          api.drawBolt(c, segs.pts, segs.branches, kk, a, SHOCK_TH);
        },
        alive: () => age < hold,
      };
      api.addEffect(effect);
    });
  }
};

const shockImpactSparkStar: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.5 : 1;
  api.shake(crit ? 7 : 3);
  api.flash(to, crit ? 140 : 100, "rgba(246,231,161,", 160);
  const n = api.burst(50 * k);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const sp = api.rand(80, 420);
    api.spark(to.x, to.y, Math.cos(a) * sp, Math.sin(a) * sp, api.rand(180, 420), api.rand(1.5, 3), boltColor, 260, 0.97);
  }
  api.timed(200, (c, _age, u) => {
    api.drawStar(c, to.x, to.y, (30 + 90 * u) * k, u * 0.3, SHOCK_TH, 0.8 * (1 - u), 8);
    api.drawStar(c, to.x, to.y, (20 + 50 * u) * k, -u * 0.5 + 0.4, SHOCK_TH, 0.6 * (1 - u), 4);
  });
};

/** Bodenentladung (Demo Einschlag 2) — Verästelung kriecht über den Boden unter dem Ziel. */
const shockImpactGroundBolt: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.5 : 1;
  const feet = ctx.feet ?? { x: to.x, y: to.y + 130 };
  api.flash(to, 60 * k, "rgba(246,231,161,", 120);
  api.flash(feet, 90 * k, "rgba(246,231,161,", 200);
  let lastGen = -1;
  let segs: Point[][] = [];
  api.timed(340, (c, _age, u) => {
    const a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
    for (const s of segs) api.drawBolt(c, s, [], k * 0.55, a, SHOCK_TH);
  }, (dt, age) => {
    if (age - lastGen > 40) {
      lastGen = age;
      segs = [];
      const m = 3 + Math.round(2 * k);
      for (let i = 0; i < m; i++) {
        const dir = i % 2 ? -1 : 1;
        const L = api.rand(70, 170) * k;
        segs.push(api.boltPath(feet, { x: feet.x + dir * L, y: feet.y + api.rand(-6, 14) }, 14, 4));
      }
    }
    const n = Math.round(4 * k * ctx.density * (dt / 16.7));
    for (let i = 0; i < n; i++) api.spark(feet.x + api.rand(-120, 120) * k, feet.y, api.rand(-60, 60), api.rand(-260, -80), api.rand(200, 450), 1.6, boltColor, 500);
  });
};

/** Nachglühen (Demo Einschlag 3) — weicher Schein klingt ab, kleine Bögen zucken über den Körper. */
const shockImpactAfterglow: RecipeFn = (ctx) => {
  const { to, crit, box, api } = ctx;
  const k = crit ? 1.5 : 1;
  const b = box ?? { x: to.x - 40, y: to.y - 100, w: 80, h: 200 };
  api.flash(to, 110 * k, "rgba(246,231,161,", 180);
  let arcs: Point[][] = [];
  let lastGen = -1;
  api.timed(700, (c, _age, u) => {
    const a = (1 - u) * 0.8;
    const g = c.createRadialGradient(to.x, to.y, 0, to.x, to.y, Math.max(0.02, 90 * k));
    g.addColorStop(0, rgba(SHOCK_TH.hot, 0.35 * a));
    g.addColorStop(1, rgba(SHOCK_TH.mid, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(to.x, to.y, Math.max(0.02, 90 * k), 0, Math.PI * 2);
    c.fill();
    for (const s of arcs) api.drawBolt(c, s, [], 0.35, a, SHOCK_TH);
  }, (dt, age, u) => {
    if (age - lastGen > 70) {
      lastGen = age;
      arcs = [];
      if (Math.random() < 1.2 - u) {
        const p0 = { x: b.x + api.rand(0, b.w), y: b.y + api.rand(0, b.h * 0.6) };
        arcs.push(api.boltPath(p0, { x: p0.x + api.rand(-40, 40), y: p0.y + api.rand(-30, 30) }, 8, 3));
      }
    }
    const n = Math.round(2 * k * (1 - u) * ctx.density * (dt / 16.7));
    for (let i = 0; i < n; i++) api.spark(to.x + api.rand(-40, 40), to.y + api.rand(-60, 60), api.rand(-30, 30), api.rand(-40, 40), api.rand(300, 700), 1.4, boltColor, 60, 0.98);
  });
};

registerRecipe("missile_shock", [shockMissileChain, shockMissileOrb, shockMissileRain]);
registerRecipe("impact_shock", [shockImpactSparkStar, shockImpactGroundBolt, shockImpactAfterglow]);

/** Schock-Überspringen (review-1.2.0 P2, 29.08.2026): eigenes kleines Rezept für den Bonus-Treffer
 *  einer Schock-Waffe — bewusst KEIN zweiter voller Geschoss-/Einschlag-Durchlauf (Chef-Auftrag
 *  „kein zweites volles Geschoss"), nur ein kurzer Blitzbogen von Angreifer zu Ziel (Muster
 *  `shockMissileChain`/`shockImpactGroundBolt`, aber ohne Ladephase und ohne separaten Einschlags-
 *  Schritt) plus ein kleiner Funkenausbruch am Ziel. CombatPage ruft dieses Rezept direkt über
 *  `playParticleShockArc` auf, unabhängig von `missile_<thema>`/`impact_<thema>`. */
const shockArcBolt: RecipeFn = (ctx) => {
  const { from, to, api } = ctx;
  const holdMs = 220;
  let age = 0;
  let segs: BoltSegments | null = null;
  let lastGen = -1000;
  api.flash(to, 50, "rgba(246,231,161,", 140);
  const n = api.burst(14);
  for (let i = 0; i < n; i++) {
    const a = api.rand(-Math.PI, 0);
    api.spark(to.x, to.y, Math.cos(a) * api.rand(50, 160), Math.sin(a) * api.rand(50, 160), api.rand(140, 300), 1.5, boltColor, 260);
  }
  const effect: Effect = {
    update(dt) {
      age += dt;
      if (age - lastGen > 40) {
        segs = { pts: api.boltPath(from, to, 40), branches: [] };
        lastGen = age;
      }
    },
    draw(c) {
      if (!segs) return;
      const u = age / holdMs;
      const a = u < 0.6 ? 1 : Math.max(0, 1 - (u - 0.6) / 0.4);
      api.drawBolt(c, segs.pts, segs.branches, 0.55, a, SHOCK_TH);
    },
    alive: () => age < holdMs,
  };
  api.addEffect(effect);
};

registerRecipe("shock_arc", [shockArcBolt]);

// =================================================================================================
// FROST
// =================================================================================================

const frostColor = themeColorFn(FROST_TH);

/** Eissplitter-Speer (Demo `FROST.spear`) — schneller, gestreckter Splitter. */
const frostMissileSpear: RecipeFn = (ctx) => {
  const { dir, crit, api, durationMs = 560, onArrive } = ctx;
  const k = crit ? 1.5 : 1;
  projectile(ctx, {
    T: durationMs * 0.7,
    arc: 8,
    update(ee, u, dt) {
      void u;
      const n = api.count(6 * k, dt);
      for (let i = 0; i < n; i++) {
        api.shard(ee.x - dir * api.rand(0, 30), ee.y + api.rand(-6, 6), -dir * api.rand(20, 90), api.rand(-30, 30), api.rand(250, 550), api.rand(2, 5) * k, frostColor, 60);
        if (Math.random() < 0.5) api.smoke(ee.x - dir * 20, ee.y, -dir * api.rand(20, 60), api.rand(-20, 10), api.rand(400, 800), api.rand(8, 16), FROST_TH.smoke, 0.14, -5);
        if (Math.random() < 0.4) api.mote(ee.x, ee.y, -dir * api.rand(40, 120), api.rand(-30, 30), api.rand(300, 600), api.rand(1.5, 3), frostColor);
      }
      if (crit) {
        const a = ee.age / 50;
        api.shard(ee.x + Math.cos(a) * 26, ee.y + Math.sin(a) * 26, -dir * 60, Math.sin(a) * 40, 400, 4, frostColor, 0);
      }
    },
    draw(c, ee) {
      c.save();
      c.translate(ee.x, ee.y);
      c.scale(dir, 1);
      const L = 64 * k;
      const w = 9 * k;
      const h = c.createRadialGradient(L * 0.2, 0, 0, L * 0.2, 0, Math.max(0.02, 44 * k));
      h.addColorStop(0, `${FROST_TH.glow}0.35)`);
      h.addColorStop(1, `${FROST_TH.glow}0)`);
      c.fillStyle = h;
      c.fillRect(-70 * k, -50 * k, 150 * k, 100 * k);
      c.beginPath();
      c.moveTo(L * 0.55, 0);
      c.lineTo(-L * 0.45, -w);
      c.lineTo(-L * 0.25, 0);
      c.lineTo(-L * 0.45, w);
      c.closePath();
      c.fillStyle = rgba(FROST_TH.mid, 0.9);
      c.fill();
      c.strokeStyle = rgba(FROST_TH.hot, 0.95);
      c.lineWidth = 1.5;
      c.stroke();
      c.strokeStyle = "rgba(255,255,255,0.9)";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(-L * 0.2, 0);
      c.lineTo(L * 0.5, 0);
      c.stroke();
      c.restore();
    },
    arrive: () => onArrive?.(),
  });
};

/** Kristallstern (Demo `FROST.star`) — zwei gegenläufig rotierende Kristalle. */
const frostMissileStar: RecipeFn = (ctx) => {
  const { dir, api, durationMs = 560, onArrive } = ctx;
  projectile(ctx, {
    T: durationMs * 1.1,
    arc: 40,
    update(ee, u, dt) {
      void u;
      const n = api.count(5, dt);
      for (let i = 0; i < n; i++) {
        const a = api.rand(0, Math.PI * 2);
        const r = 26;
        api.shard(ee.x + Math.cos(a) * r, ee.y + Math.sin(a) * r, Math.cos(a + 1.3) * api.rand(40, 120) - dir * 40, Math.sin(a + 1.3) * api.rand(40, 120), api.rand(300, 600), api.rand(2, 4), frostColor, 120);
        if (Math.random() < 0.5) api.mote(ee.x, ee.y, -dir * api.rand(30, 100), api.rand(-40, 40), api.rand(300, 700), 2, frostColor);
      }
    },
    draw(c, ee) {
      const rot = ee.age / 90;
      api.drawCore(c, ee.x, ee.y, 9, themeCorePalette(FROST_TH));
      api.drawCrystal(c, ee.x, ee.y, 30, rot, FROST_TH, 0.95);
      api.drawCrystal(c, ee.x, ee.y, 18, -rot * 1.4, FROST_TH, 0.9);
    },
    arrive: () => onArrive?.(),
  });
};

/** Frostwelle (Demo `FROST.wave`) — Eiskamm läuft am Boden zum Ziel entlang. */
const frostMissileWave: RecipeFn = (ctx) => {
  const { from: s, to: d, dir, api, durationMs = 560, onArrive } = ctx;
  const g = ctx.feet?.y ?? d.y + 60;
  const ss = { x: s.x + dir * 30, y: g };
  const dd = { x: d.x, y: g };
  let age = 0;
  let done = false;
  const e = { x: ss.x, y: g };
  const effect: Effect = {
    update(dt) {
      if (done) return;
      age += dt;
      const T = durationMs * 1.2;
      const u = Math.min(1, age / T);
      e.x = ss.x + (dd.x - ss.x) * u;
      const n = api.count(10, dt);
      for (let i = 0; i < n; i++) {
        api.shard(e.x + api.rand(-25, 25), g, api.rand(-30, 30) - dir * 20, api.rand(-260, -90), api.rand(300, 600), api.rand(2, 5), frostColor, 500);
        api.smoke(e.x + api.rand(-30, 30), g - 6, -dir * api.rand(10, 40), api.rand(-40, -10), api.rand(500, 900), api.rand(10, 20), FROST_TH.smoke, 0.16, -8);
        if (Math.random() < 0.3) api.mote(e.x, g - api.rand(0, 30), -dir * api.rand(0, 60), api.rand(-60, -20), api.rand(400, 800), 2, frostColor);
      }
      if (Math.random() < 0.35 * ctx.density) api.rime(e.x + api.rand(-10, 10), g + api.rand(-2, 6), api.rand(900, 1500), api.rand(3, 6), FROST_TH);
      if (u >= 1 && !done) {
        done = true;
        onArrive?.();
      }
    },
    draw(c) {
      if (done) return;
      const h = 36 * (0.8 + 0.2 * Math.sin(age / 40));
      const g2 = c.createRadialGradient(e.x, g, 0, e.x, g, Math.max(0.02, 60));
      g2.addColorStop(0, rgba(FROST_TH.hot, 0.6));
      g2.addColorStop(0.5, rgba(FROST_TH.mid, 0.3));
      g2.addColorStop(1, rgba(FROST_TH.mid, 0));
      c.fillStyle = g2;
      c.beginPath();
      c.ellipse(e.x, g - 8, 60, Math.max(0.01, h), 0, Math.PI, Math.PI * 2);
      c.fill();
      c.strokeStyle = rgba(FROST_TH.hot, 0.9);
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(e.x, g - 4, 46, Math.max(0.01, h * 0.9), 0, Math.PI, Math.PI * 2);
      c.stroke();
      api.drawCrystal(c, e.x + dir * 20, g - h * 0.8, 14, age / 200, FROST_TH, 0.8);
    },
    alive: () => !done,
  };
  api.addEffect(effect);
};

const frostImpactShatter: RecipeFn = (ctx) => {
  const { to, dir, crit, api } = ctx;
  const k = crit ? 1.5 : 1;
  const n = api.burst(70 * k);
  api.shake(crit ? 7 : 3);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const sp = api.rand(120, 460) * k;
    api.shard(to.x, to.y, Math.cos(a) * sp - dir * 30, Math.sin(a) * sp - 60, api.rand(350, 750), api.rand(2.5, 6) * k, frostColor, 420);
    if (i % 2 === 0) api.spark(to.x, to.y, Math.cos(a) * sp * 1.3, Math.sin(a) * sp * 1.3, api.rand(150, 350), api.rand(1.2, 2.2), frostColor, 200);
    if (i % 5 === 0) api.smoke(to.x + api.rand(-15, 15), to.y + api.rand(-15, 15), api.rand(-40, 40), api.rand(-60, -10), api.rand(500, 900), api.rand(10, 20) * k, FROST_TH.smoke, 0.14, -6);
  }
  api.flash(to, 100 * k, "rgba(190,230,255,", 130);
  api.timed(220, (c, _age, u) => {
    for (let i = 0; i < 3; i++) api.drawCrystal(c, to.x, to.y, (24 + 70 * u) * k, i * 1.05 + u * 0.5, FROST_TH, 0.5 * (1 - u), 3);
  });
};

const frostImpactRime: RecipeFn = (ctx) => {
  const { to, api } = ctx;
  const k = ctx.crit ? 1.5 : 1;
  const rays: Array<{ a: number; len: number; r: number; rot: number; n: number }> = [];
  for (let i = 0; i < 7; i++) rays.push({ a: api.rand(0, Math.PI * 2), len: api.rand(50, 110) * k, r: api.rand(8, 16) * k, rot: api.rand(0, 6), n: 3 + Math.floor(api.rand(0, 3)) });
  api.timed(900, (c, _age, u) => {
    const grow = Math.min(1, u / 0.45);
    const fade = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
    c.strokeStyle = rgba(FROST_TH.hot, 0.5 * fade);
    c.lineWidth = 1;
    for (const r of rays) {
      c.beginPath();
      c.moveTo(to.x, to.y);
      c.lineTo(to.x + Math.cos(r.a) * r.len * grow, to.y + Math.sin(r.a) * r.len * grow);
      c.stroke();
    }
    for (const r of rays) {
      for (let j = 0; j < r.n; j++) {
        const t = (j + 1) / r.n;
        if (t > grow + 0.05) continue;
        const sz = Math.max(0, Math.min(1, (grow - t + 0.25) / 0.25));
        api.drawCrystal(c, to.x + Math.cos(r.a) * r.len * t, to.y + Math.sin(r.a) * r.len * t, r.r * (1 - t * 0.5) * sz, r.rot + j, FROST_TH, 0.85 * fade);
      }
    }
  }, (dt, _age, u) => {
    if (u >= 0.5) return;
    const n = api.count(3 * k, dt);
    for (let i = 0; i < n; i++) {
      api.smoke(to.x + api.rand(-40, 40) * k, to.y + api.rand(-40, 40) * k, api.rand(-15, 15), api.rand(-30, -5), api.rand(600, 1100), api.rand(10, 18), FROST_TH.smoke, 0.13, -6);
      api.mote(to.x + api.rand(-30, 30), to.y + api.rand(-30, 30), api.rand(-10, 10), api.rand(-40, -10), api.rand(400, 800), 2, frostColor);
    }
  });
  api.flash(to, 70 * k, "rgba(190,230,255,", 160);
};

const frostImpactExplosion: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.5 : 1;
  const n = api.burst(80 * k);
  api.shake(crit ? 6 : 3);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const sp = api.rand(40, 300) * k;
    api.ember(to.x, to.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, api.rand(300, 650), api.rand(4, 10) * k, frostColor, 40, 0.96);
    if (i % 2 === 0) api.smoke(to.x + api.rand(-10, 10), to.y + api.rand(-10, 10), Math.cos(a) * sp * 0.5, Math.sin(a) * sp * 0.4 - 20, api.rand(900, 1600), api.rand(18, 36) * k, "150,180,200", 0.16, -8);
    if (i % 3 === 0) api.shard(to.x, to.y, Math.cos(a) * sp * 1.2, Math.sin(a) * sp * 1.2 - 80, api.rand(400, 800), api.rand(2, 5), frostColor, 380);
  }
  api.flash(to, 150 * k, "rgba(200,235,255,", 220);
  api.ring(to, 130 * k, 420, "rgba(170,220,255,", 12);
};

registerRecipe("missile_frost", [frostMissileSpear, frostMissileStar, frostMissileWave], frostMissileSpear);
registerRecipe("impact_frost", [frostImpactShatter, frostImpactRime, frostImpactExplosion]);

// =================================================================================================
// GIFT (poison)
// =================================================================================================

const poisonColor = themeColorFn(POISON_TH);

/** Giftphiole (Demo `POISON.vial`) — hoher Bogen, taumelnde Glasphiole, zerplatzt in Glas+Gift. */
const poisonMissileVial: RecipeFn = (ctx) => {
  const { dir, api, durationMs = 560, onArrive } = ctx;
  const kFactor = ctx.crit ? 1.6 : 1;
  projectile(ctx, {
    T: durationMs * 1.15,
    arc: 150,
    update(ee, u, dt) {
      void u;
      void dt;
      if (Math.random() < 0.5 * ctx.density) api.drop(ee.x, ee.y + 8, api.rand(-20, 20), api.rand(0, 40), api.rand(300, 600), api.rand(1.5, 2.5) * kFactor, poisonColor, 380);
      if (Math.random() < 0.3) api.mote(ee.x, ee.y, -dir * api.rand(10, 40), api.rand(-20, 20), api.rand(300, 600), 2, poisonColor);
    },
    draw(c, ee) {
      const rot = (ee.age / 140) * dir;
      c.save();
      c.translate(ee.x, ee.y);
      c.rotate(rot);
      c.scale(kFactor, kFactor);
      c.save();
      c.globalCompositeOperation = "source-over";
      c.fillStyle = "rgba(60,70,60,0.85)";
      c.beginPath();
      c.roundRect(-7, -12, 14, 26, 5);
      c.fill();
      c.fillStyle = "#4a3a2a";
      c.fillRect(-4, -16, 8, 6);
      c.restore();
      c.fillStyle = rgba(POISON_TH.mid, 0.85);
      c.beginPath();
      c.roundRect(-5, 0, 10, 12, 4);
      c.fill();
      c.strokeStyle = "rgba(220,235,225,0.6)";
      c.lineWidth = 1.2;
      c.beginPath();
      c.roundRect(-7, -12, 14, 26, 5);
      c.stroke();
      const h = c.createRadialGradient(0, 4, 0, 0, 4, 26);
      h.addColorStop(0, `${POISON_TH.glow}0.3)`);
      h.addColorStop(1, `${POISON_TH.glow}0)`);
      c.fillStyle = h;
      c.fillRect(-30, -30, 60, 60);
      c.restore();
    },
    arrive() {
      const n = api.burst(14 * kFactor);
      for (let i = 0; i < n; i++) {
        const a = api.rand(0, Math.PI * 2);
        api.glass(ctx.to.x, ctx.to.y, Math.cos(a) * api.rand(60, 260), Math.sin(a) * api.rand(60, 260) - 80, api.rand(300, 600), api.rand(3, 6));
      }
      onArrive?.();
    },
  });
};

/** Sporenwolke (Demo `POISON.spores`) — wabernde Wolke ohne Kern. */
const poisonMissileSpores: RecipeFn = (ctx) => {
  const { dir, api, durationMs = 560, onArrive } = ctx;
  projectile(ctx, {
    T: durationMs * 1.8,
    arc: 20,
    update(ee, u, dt) {
      void u;
      ee.y += Math.sin(ee.age / 120) * 14;
      const n = api.count(5, dt);
      for (let i = 0; i < n; i++) {
        const a = api.rand(0, Math.PI * 2);
        const r = api.rand(0, 34);
        api.smoke(ee.x + Math.cos(a) * r, ee.y + Math.sin(a) * r, api.rand(-20, 20) - dir * 10, api.rand(-25, 10), api.rand(700, 1300), api.rand(14, 26), POISON_TH.smoke, 0.34, -10);
        if (Math.random() < 0.5) api.mote(ee.x + Math.cos(a) * r, ee.y + Math.sin(a) * r, api.rand(-25, 25), api.rand(-30, 10), api.rand(500, 1000), api.rand(1.5, 3), poisonColor, -8);
        if (Math.random() < 0.12) api.bubble(ee.x + api.rand(-20, 20), ee.y + api.rand(-10, 20), api.rand(-10, 10), api.rand(-30, -10), api.rand(400, 800), api.rand(2, 4), poisonColor);
      }
    },
    draw(c, ee) {
      const g = c.createRadialGradient(ee.x, ee.y, 0, ee.x, ee.y, Math.max(0.02, 46));
      g.addColorStop(0, rgba(POISON_TH.mid, 0.22));
      g.addColorStop(1, rgba(POISON_TH.dim, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(ee.x, ee.y, 46, 0, Math.PI * 2);
      c.fill();
    },
    arrive: () => onArrive?.(),
  });
};

/** Säurespucke (Demo `POISON.spit`) — dünner Tropfenstrahl, flacher Bogen. */
const poisonMissileSpit: RecipeFn = (ctx) => {
  const { dir, api, durationMs = 560, onArrive } = ctx;
  const T = durationMs * 0.8;
  projectile(ctx, {
    T,
    arc: 28,
    update(ee, u, dt) {
      void u;
      const n = api.count(6, dt);
      const vx = ((ctx.to.x - ctx.from.x) / T) * 1000;
      for (let i = 0; i < n; i++) {
        api.drop(ee.x - dir * api.rand(0, 14), ee.y + api.rand(-3, 3), vx * api.rand(0.55, 0.85), api.rand(-20, 20), api.rand(220, 420), api.rand(1.5, 3), poisonColor, 90);
        if (Math.random() < 0.25) api.mote(ee.x, ee.y, vx * 0.3, api.rand(-30, 30), api.rand(200, 400), 1.8, poisonColor);
      }
    },
    draw(c, ee) {
      c.strokeStyle = rgba(POISON_TH.hot, 0.9);
      c.lineCap = "round";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(ee.x - dir * 18, ee.y);
      c.lineTo(ee.x + dir * 8, ee.y);
      c.stroke();
      api.drawCore(c, ee.x + dir * 6, ee.y, 6, themeCorePalette(POISON_TH));
    },
    arrive: () => onArrive?.(),
  });
};

const poisonImpactSplashBubbles: RecipeFn = (ctx) => {
  const { to, dir, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const n = api.burst(60 * k);
  api.shake(crit ? 5 : 2);
  for (let i = 0; i < n; i++) {
    const a = api.rand(-1.1, 1.1);
    const sp = api.rand(80, 360) * k;
    api.drop(to.x, to.y, dir * Math.cos(a) * sp * 0.8, Math.sin(a) * sp * 0.7 - 60, api.rand(350, 700), api.rand(1.8, 3.5) * k, poisonColor, 380);
    if (i % 3 === 0) api.bubble(to.x + api.rand(-20, 20), to.y + api.rand(-10, 20), api.rand(-20, 20), api.rand(-60, -20), api.rand(400, 800), api.rand(2, 5) * k, poisonColor);
    if (i % 6 === 0) api.smoke(to.x + api.rand(-15, 15), to.y + api.rand(-15, 15), api.rand(-20, 20), api.rand(-40, -10), api.rand(500, 900), api.rand(10, 18), POISON_TH.smoke, 0.3, -10);
  }
  api.flash(to, 80 * k, "rgba(120,210,80,", 140);
};

const poisonImpactPuddle: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const feet = ctx.feet ?? { x: to.x, y: to.y + 130 };
  const n = api.burst(30 * k);
  for (let i = 0; i < n; i++) api.drop(to.x + api.rand(-24, 24), to.y + api.rand(-10, 30), api.rand(-30, 30), api.rand(40, 160), api.rand(400, 800), api.rand(1.5, 3) * k, poisonColor, 500);
  api.flash(to, 60 * k, "rgba(120,210,80,", 120);
  api.timed(900, (c, _age, u) => {
    const r = 62 * k * (u < 0.3 ? u / 0.3 : 1);
    const a = u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4;
    c.save();
    c.globalCompositeOperation = "source-over";
    c.fillStyle = `rgba(28,70,26,${0.85 * a})`;
    c.beginPath();
    c.ellipse(feet.x, feet.y + 2, Math.max(0.01, r), Math.max(0.01, r * 0.26), 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = rgba(POISON_TH.mid, 0.55 * a);
    c.lineWidth = 1.5;
    c.beginPath();
    c.ellipse(feet.x, feet.y + 2, Math.max(0.01, r * 0.9), Math.max(0.01, r * 0.22), 0, 0, Math.PI * 2);
    c.stroke();
  }, (dt, _age, u) => {
    if (u <= 0.2 || u >= 0.8) return;
    const m = api.count(2.5 * k, dt);
    for (let i = 0; i < m; i++) api.bubble(feet.x + api.rand(-50, 50) * k, feet.y, api.rand(-10, 10), api.rand(-50, -20), api.rand(400, 700), api.rand(2, 4), poisonColor);
  });
};

const poisonImpactCloud: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  api.flash(to, 90 * k, "rgba(120,210,80,", 160);
  api.timed(1000, () => {}, (dt, _age, u) => {
    const n = api.count(6 * k * (1 - u * 0.7), dt);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      const r = api.rand(0, 50) * k;
      api.smoke(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, api.rand(-25, 25), api.rand(-15, 15), api.rand(800, 1500), api.rand(16, 32) * k, POISON_TH.smoke, 0.34, 6);
      if (Math.random() < 0.5) api.mote(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, api.rand(-20, 20), api.rand(-20, 20), api.rand(500, 1000), api.rand(1.5, 3), poisonColor, -4);
      if (Math.random() < 0.1) api.bubble(to.x + api.rand(-30, 30), to.y + api.rand(0, 40), 0, api.rand(-30, -10), api.rand(400, 700), api.rand(2, 4), poisonColor);
    }
  });
};

registerRecipe("missile_poison", [poisonMissileVial, poisonMissileSpores, poisonMissileSpit], poisonMissileVial);
registerRecipe("impact_poison", [poisonImpactSplashBubbles, poisonImpactPuddle, poisonImpactCloud]);

// =================================================================================================
// ARKAN (arcane)
// =================================================================================================

const arcaneColor = themeColorFn(ARCANE_TH);

const arcaneMissileRune: RecipeFn = (ctx) => {
  const { dir, crit, api, durationMs = 560, onArrive } = ctx;
  projectile(ctx, {
    T: durationMs,
    arc: 30,
    update(ee, u, dt) {
      void u;
      const n = api.count(8, dt);
      for (let i = 0; i < n; i++) {
        api.mote(ee.x + api.rand(-10, 10), ee.y + api.rand(-10, 10), -dir * api.rand(30, 140), api.rand(-40, 40), api.rand(350, 750), api.rand(1.5, 3.5), arcaneColor, -10);
        if (Math.random() < 0.3) api.ember(ee.x, ee.y, -dir * api.rand(40, 120), api.rand(-30, 30), api.rand(200, 400), api.rand(3, 6), arcaneColor, 0);
      }
    },
    draw(c, ee) {
      const rot = (ee.age / 160) * dir;
      api.drawCore(c, ee.x, ee.y, 9, themeCorePalette(ARCANE_TH));
      api.drawGlyph(c, ee.x, ee.y, 22, rot, ARCANE_TH, 0.95);
      if (crit) api.drawGlyph(c, ee.x, ee.y, 34, -rot * 0.7, ARCANE_TH, 0.6);
    },
    arrive: () => onArrive?.(),
  });
};

/** Arkanstrahl (Demo `ARCANE.ray`) — Motes sammeln sich, dann ein kurzer Strahl. */
const arcaneMissileRay: RecipeFn = (ctx) => {
  const { from: s, to: d, crit, api, onArrive } = ctx;
  const charge = 130;
  const hold = 240 * (crit ? 1.3 : 1);
  api.timed(charge, (c, _age, u) => api.drawCore(c, s.x, s.y, 6 + 16 * u, themeCorePalette(ARCANE_TH)), (dt) => {
    const n = api.count(4, dt);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      const r = api.rand(24, 60);
      api.pull(api.mote(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r, 0, 0, 320, 2.2, arcaneColor, 0), s, 3200);
    }
  });
  api.delay(charge, () => {
    api.beam(s, d, hold, ARCANE_TH, 10);
    api.timed(hold, () => {}, (dt) => {
      const n = api.count(5, dt);
      for (let i = 0; i < n; i++) {
        const t = Math.random();
        api.mote(s.x + (d.x - s.x) * t, s.y + (d.y - s.y) * t, api.rand(-40, 40), api.rand(-60, 60), api.rand(250, 500), 2, arcaneColor, 0);
      }
    });
  });
  api.delay(charge + 60, () => onArrive?.());
};

/** Orbit-Kugeln (Demo `ARCANE.orbit`) — drei Kugeln kreisen um einen wandernden Punkt. */
const arcaneMissileOrbit: RecipeFn = (ctx) => {
  const { from: s, dir, api, durationMs = 560, onArrive } = ctx;
  const orbs = [0, 1, 2].map((i) => ({ ph: (i * Math.PI * 2) / 3, x: s.x, y: s.y }));
  projectile(ctx, {
    T: durationMs * 1.2,
    arc: 40,
    update(ee, u, dt) {
      const R = 40 * (1 - u * 0.85);
      const w = ee.age / 110;
      for (const b of orbs) {
        b.x = ee.x + Math.cos(w + b.ph) * R;
        b.y = ee.y + Math.sin(w + b.ph) * R * 0.5;
        const n = api.count(3, dt);
        for (let i = 0; i < n; i++) api.mote(b.x, b.y, -dir * api.rand(20, 90), api.rand(-30, 30), api.rand(300, 600), api.rand(1.5, 3), arcaneColor, -6);
      }
      if (Math.random() < 0.3) api.ember(ee.x, ee.y, api.rand(-20, 20), api.rand(-20, 20), 300, 4, arcaneColor, 0);
    },
    draw(c, ee) {
      c.strokeStyle = rgba(ARCANE_TH.mid, 0.35);
      c.lineWidth = 1;
      for (const b of orbs) {
        c.beginPath();
        c.moveTo(ee.x, ee.y);
        c.lineTo(b.x, b.y);
        c.stroke();
      }
      for (const b of orbs) api.drawCore(c, b.x, b.y, 9, themeCorePalette(ARCANE_TH));
    },
    arrive: () => onArrive?.(),
  });
};

const arcaneImpactGlyphCircle: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  api.shake(crit ? 5 : 2);
  api.flash(to, 90 * k, "rgba(150,90,230,", 160);
  api.timed(520, (c, age, u) => {
    const a = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
    api.drawGlyph(c, to.x, to.y, (50 + 40 * u) * k, age / 300, ARCANE_TH, a);
    api.drawGlyph(c, to.x, to.y, (30 + 20 * u) * k, -age / 220, ARCANE_TH, a * 0.7);
  }, (dt, _age, u) => {
    const n = api.count(4 * k * (1 - u), dt);
    for (let i = 0; i < n; i++) {
      const a = api.rand(0, Math.PI * 2);
      const r = api.rand(30, 80) * k;
      api.mote(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, api.rand(-10, 10), api.rand(-80, -30), api.rand(400, 800), api.rand(1.5, 3), arcaneColor, -20);
    }
  });
};

const arcaneImpactRift: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const pts = api.boltPath({ x: to.x, y: to.y - 90 * k }, { x: to.x, y: to.y + 90 * k }, 22, 4);
  api.shake(crit ? 5 : 2);
  api.flash(to, 70 * k, "rgba(150,90,230,", 120);
  api.timed(320, (c, _age, u) => {
    const a = u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85;
    const open = Math.min(1, u / 0.15);
    c.save();
    c.translate(to.x, to.y);
    c.scale(1, Math.max(0.001, open));
    c.translate(-to.x, -to.y);
    api.drawBolt(c, pts, [], k * 0.7, a, ARCANE_TH);
    c.restore();
  }, (dt, _age, u) => {
    if (u >= 0.6) return;
    const n = api.count(8 * k, dt);
    for (let i = 0; i < n; i++) {
      const p = api.pick(pts);
      const dir = Math.random() < 0.5 ? -1 : 1;
      api.mote(p.x, p.y, dir * api.rand(80, 260), api.rand(-30, 30), api.rand(250, 550), api.rand(1.5, 3), arcaneColor, 0, 0.96);
    }
  });
};

const arcaneImpactImplosion: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const n = api.burst(70 * k);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const r = api.rand(70, 130) * k;
    api.pull(api.mote(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, 0, 0, 420, api.rand(2, 3.5), arcaneColor, 0, 1), to, 5000);
  }
  api.timed(260, (c, _age, u) => {
    c.strokeStyle = rgba(ARCANE_TH.mid, 0.5 * u);
    c.lineWidth = 1.5;
    c.beginPath();
    c.arc(to.x, to.y, Math.max(0.01, 110 * k * (1 - u)), 0, Math.PI * 2);
    c.stroke();
  });
  api.delay(250, () => {
    api.shake(crit ? 6 : 3);
    api.flash(to, 120 * k, "rgba(190,150,255,", 180);
    api.ring(to, 90 * k, 300, "rgba(150,90,230,", 8);
    const m = api.burst(25 * k);
    for (let i = 0; i < m; i++) {
      const a = api.rand(0, Math.PI * 2);
      api.mote(to.x, to.y, Math.cos(a) * api.rand(100, 300), Math.sin(a) * api.rand(100, 300), api.rand(300, 600), 2.5, arcaneColor, 0, 0.95);
    }
  });
};

registerRecipe("missile_arcane", [arcaneMissileRune, arcaneMissileRay, arcaneMissileOrbit], arcaneMissileRune);
registerRecipe("impact_arcane", [arcaneImpactGlyphCircle, arcaneImpactRift, arcaneImpactImplosion]);

// =================================================================================================
// LEERE (void)
// =================================================================================================

const voidColor = themeColorFn(VOID_TH);

/** Leerenkern (Demo `VOID.core`) — schwarzer, licht-schluckender Kern, Motes fließen hinein. */
const voidMissileCore: RecipeFn = (ctx) => {
  const { dir, crit, api, durationMs = 560, onArrive } = ctx;
  projectile(ctx, {
    T: durationMs * 1.1,
    arc: 20,
    update(ee, u, dt) {
      void u;
      const n = api.count(9, dt);
      for (let i = 0; i < n; i++) {
        const a = api.rand(0, Math.PI * 2);
        const r = api.rand(40, 90);
        api.pull(api.mote(ee.x + Math.cos(a) * r + dir * 30, ee.y + Math.sin(a) * r, 0, 0, 380, api.rand(1.5, 3), voidColor, 0, 1), ee, 3600);
      }
      if (Math.random() < 0.5) api.smoke(ee.x - dir * 10, ee.y, -dir * api.rand(20, 60), api.rand(-20, 20), api.rand(500, 900), api.rand(14, 24), VOID_TH.smoke, 0.3, -4);
    },
    draw(c, ee) {
      api.drawVoidCore(c, ee.x, ee.y, (crit ? 30 : 20) * (1 + 0.06 * Math.sin(ee.age / 35)));
    },
    arrive: () => onArrive?.(),
  });
};

/** Leerenriss (Demo `VOID.rift`) — ein Spalt reißt zum Ziel auf, schnappt dann zu. */
const voidMissileRift: RecipeFn = (ctx) => {
  const { from: s, to: d, api, durationMs = 560, onArrive } = ctx;
  const k = ctx.crit ? 1.5 : 1;
  const T = durationMs;
  const pts = api.boltPath(s, d, 26 * k, 5);
  const hold = 140;
  let age = 0;
  let struck = false;
  const effect: Effect = {
    update(dt) {
      age += dt;
      const u = Math.min(1, age / (T * 0.8));
      const n = api.count(6 * k, dt);
      const lim = Math.floor(u * (pts.length - 1));
      for (let i = 0; i < n; i++) {
        const p = pts[Math.floor(api.rand(0, lim + 1))]!;
        const side = Math.random() < 0.5 ? -1 : 1;
        api.pull(api.mote(p.x + api.rand(-10, 10), p.y + side * api.rand(20, 50), 0, 0, 300, 2, voidColor, 0, 1), p, 2600);
      }
      if (u >= 1 && !struck) {
        struck = true;
        onArrive?.();
      }
    },
    draw(c) {
      const u = Math.min(1, age / (T * 0.8));
      const lim = Math.max(1, Math.floor(u * (pts.length - 1)));
      const post = struck ? Math.min(1, (age - T * 0.8) / hold) : 0;
      const wdt = (1 - post) * k;
      const path = (): void => {
        c.beginPath();
        c.moveTo(pts[0]!.x, pts[0]!.y);
        for (let i = 1; i <= lim; i++) c.lineTo(pts[i]!.x, pts[i]!.y);
      };
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = `${VOID_TH.glow}${0.18 * (1 - post)})`;
      c.lineWidth = 18 * wdt;
      path();
      c.stroke();
      c.strokeStyle = rgba(VOID_TH.mid, 0.8 * (1 - post));
      c.lineWidth = 6 * wdt;
      path();
      c.stroke();
      c.save();
      c.globalCompositeOperation = "source-over";
      c.strokeStyle = `rgba(0,0,0,${0.95 * (1 - post)})`;
      c.lineWidth = 3.5 * wdt;
      path();
      c.stroke();
      c.restore();
      c.strokeStyle = rgba(VOID_TH.hot, 0.8 * (1 - post));
      c.lineWidth = 1;
      path();
      c.stroke();
    },
    alive: () => age < T * 0.8 + hold,
  };
  api.addEffect(effect);
};

/** Tentakel-Schlieren (Demo `VOID.tendrils`) — drei bis vier dunkle Schlieren winden sich zum Ziel. */
const voidMissileTendrils: RecipeFn = (ctx) => {
  const { from: s, to: d, dir, crit, api, durationMs = 560, onArrive } = ctx;
  const k = crit ? 1.5 : 1;
  const n = crit ? 5 : 3 + Math.floor(api.rand(0, 2));
  const ts = Array.from({ length: n }, (_, i) => ({ lag: i * 0.08, amp: api.rand(30, 70) * (i % 2 ? 1 : -1), ph: api.rand(0, 6), sp: api.rand(4, 7), hx: s.x, hy: s.y, cx: s.x, cy: s.y }));
  projectile(ctx, {
    T: durationMs * 1.15,
    arc: 0,
    update(ee, u, dt) {
      void dt;
      const L = Math.hypot(d.x - s.x, d.y - s.y) || 1;
      const nx = -(d.y - s.y) / L;
      const ny = (d.x - s.x) / L;
      for (const t of ts) {
        const uu = Math.max(0, Math.min(1, (u - t.lag) / (1 - t.lag)));
        const off = Math.sin((ee.age / 1000) * t.sp + t.ph) * t.amp * (1 - uu * 0.6);
        t.hx = s.x + (d.x - s.x) * uu + nx * off * 0.3;
        t.hy = s.y + (d.y - s.y) * uu + ny * off * 0.3;
        t.cx = s.x + (d.x - s.x) * uu * 0.5 + nx * off;
        t.cy = s.y + (d.y - s.y) * uu * 0.5 + ny * off;
        if (Math.random() < 0.6 * ctx.density) api.smoke(t.hx, t.hy, -dir * api.rand(10, 40), api.rand(-20, 20), api.rand(400, 800), api.rand(12, 20) * k, VOID_TH.smoke, 0.35, -3);
        if (Math.random() < 0.3 * ctx.density) api.mote(t.hx, t.hy, api.rand(-30, 30), api.rand(-30, 30), api.rand(200, 450), 2, voidColor, 0);
      }
    },
    draw(c) {
      c.lineCap = "round";
      for (const t of ts) {
        const drawStroke = (w: number, cc: string): void => {
          c.strokeStyle = cc;
          c.lineWidth = w;
          c.beginPath();
          c.moveTo(s.x, s.y);
          c.quadraticCurveTo(t.cx, t.cy, t.hx, t.hy);
          c.stroke();
        };
        drawStroke(14 * k, `${VOID_TH.glow}0.14)`);
        c.save();
        c.globalCompositeOperation = "source-over";
        drawStroke(7 * k, "rgba(6,2,10,0.9)");
        c.restore();
        drawStroke(1.5, rgba(VOID_TH.mid, 0.8));
        api.drawCore(c, t.hx, t.hy, 5 * k, themeCorePalette(VOID_TH));
      }
    },
    arrive: () => onArrive?.(),
  });
};

const voidImpactImplosion: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.5 : 1;
  const n = api.burst(80 * k);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const r = api.rand(80, 150) * k;
    api.pull(api.mote(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, 0, 0, 380, api.rand(2, 3.5), voidColor, 0, 1), to, 6000);
  }
  api.timed(300, (c, _age, u) => {
    c.strokeStyle = rgba(VOID_TH.mid, 0.6 * u);
    c.lineWidth = 3 + 6 * u;
    c.beginPath();
    c.arc(to.x, to.y, Math.max(0.01, 130 * k * (1 - u)), 0, Math.PI * 2);
    c.stroke();
    api.drawVoidCore(c, to.x, to.y, Math.max(0.01, 34 * k * u));
  });
  api.delay(290, () => {
    api.shake(crit ? 7 : 3);
    api.flash(to, 100 * k, "rgba(130,40,180,", 200);
    const m = api.burst(20 * k);
    for (let i = 0; i < m; i++) api.smoke(to.x + api.rand(-20, 20), to.y + api.rand(-20, 20), api.rand(-80, 80), api.rand(-80, 40), api.rand(600, 1100), api.rand(12, 24) * k, VOID_TH.smoke, 0.6, -6);
  });
};

/** Riss am Ziel (Demo `VOID.impacts[1]`) — dunkle Risse ziehen sich über die Silhouette. */
const voidImpactBodyRift: RecipeFn = (ctx) => {
  const { to, crit, box, api } = ctx;
  const k = crit ? 1.5 : 1;
  const b = box ?? { x: to.x - 60, y: to.y - 140, w: 120, h: 280 };
  const lines: Point[][] = [];
  for (let i = 0; i < 3; i++) {
    const y0 = b.y + b.h * api.rand(0.15, 0.7);
    lines.push(api.boltPath({ x: b.x + api.rand(-10, 10), y: y0 }, { x: b.x + b.w + api.rand(-10, 10), y: y0 + api.rand(-50, 50) }, 18, 4));
  }
  api.shake(crit ? 5 : 2);
  api.flash(to, 70 * k, "rgba(130,40,180,", 140);
  api.timed(520, (c, _age, u) => {
    const a = u < 0.1 ? u / 0.1 : 1 - (u - 0.1) / 0.9;
    for (const l of lines) {
      api.drawBolt(c, l, [], 0.45 * k, a * 0.7, VOID_TH);
      c.save();
      c.globalCompositeOperation = "source-over";
      c.strokeStyle = `rgba(0,0,0,${0.9 * a})`;
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(l[0]!.x, l[0]!.y);
      for (let i = 1; i < l.length; i++) c.lineTo(l[i]!.x, l[i]!.y);
      c.stroke();
      c.restore();
    }
  }, (dt, _age, u) => {
    if (u >= 0.6) return;
    const n = api.count(3 * k, dt);
    for (let i = 0; i < n; i++) {
      const p = api.pick(api.pick(lines));
      api.smoke(p.x, p.y, api.rand(-20, 20), api.rand(-30, 10), api.rand(500, 900), api.rand(8, 14), VOID_TH.smoke, 0.55, -5);
      if (Math.random() < 0.4) api.mote(p.x, p.y, api.rand(-40, 40), api.rand(-40, 20), api.rand(300, 600), 2, voidColor);
    }
  });
};

/** Schatten-Nachbild (Demo `VOID.impacts[2]`) — ein dunkles Abbild löst sich und zerfällt. */
const voidImpactShadowClone: RecipeFn = (ctx) => {
  const { to, dir, crit, box, api } = ctx;
  const k = crit ? 1.5 : 1;
  const b = box ?? { x: to.x - 60, y: to.y - 140, w: 120, h: 280 };
  api.shake(crit ? 4 : 2);
  api.flash(to, 60 * k, "rgba(130,40,180,", 120);
  api.timed(650, (c, _age, u) => {
    const a = (1 - u) * 0.85;
    const off = -dir * (10 + 50 * u) * k;
    const dy = -20 * u;
    c.save();
    c.globalCompositeOperation = "source-over";
    c.fillStyle = `rgba(4,1,8,${a})`;
    c.beginPath();
    c.roundRect(b.x + off, b.y + dy, b.w, b.h, Math.min(30, b.w / 3));
    c.fill();
    c.restore();
    c.strokeStyle = rgba(VOID_TH.mid, a * 0.9);
    c.lineWidth = 2;
    c.beginPath();
    c.roundRect(b.x + off, b.y + dy, b.w, b.h, Math.min(30, b.w / 3));
    c.stroke();
  }, (dt, _age, u) => {
    const n = api.count(4 * k, dt);
    const off = -dir * (10 + 50 * u) * k;
    for (let i = 0; i < n; i++) api.mote(b.x + off + api.rand(0, b.w), b.y + api.rand(0, b.h), -dir * api.rand(10, 50), api.rand(-40, 10), api.rand(400, 800), api.rand(1.5, 3), voidColor, -10);
  });
};

registerRecipe("missile_void", [voidMissileCore, voidMissileRift, voidMissileTendrils], voidMissileCore);
registerRecipe("impact_void", [voidImpactImplosion, voidImpactBodyRift, voidImpactShadowClone]);

// =================================================================================================
// AETHER
// =================================================================================================

const aetherColor = themeColorFn(AETHER_TH);

/** Lichtfeder (Demo `AETHER.feather`) — zwei (Crit fünf) goldene Federn in S-Kurve. */
const aetherMissileFeather: RecipeFn = (ctx) => {
  const { from: s, to: d, dir, crit, api, durationMs = 560, onArrive } = ctx;
  const n = crit ? 5 : 2;
  const fs = Array.from({ length: n }, (_, i) => ({ lag: i * 0.06, amp: api.rand(30, 60) * (i % 2 ? 1 : -1), ph: api.rand(0, 3), x: s.x, y: s.y, rot: 0 }));
  projectile(ctx, {
    T: durationMs * 1.2,
    arc: 50,
    update(ee, u, dt) {
      for (const f of fs) {
        const uu = Math.max(0, Math.min(1, (u - f.lag) / (1 - f.lag)));
        const px = f.x;
        const py = f.y;
        f.x = s.x + (d.x - s.x) * uu;
        f.y = s.y + (d.y - s.y) * uu - Math.sin(uu * Math.PI) * 50 + Math.sin(uu * Math.PI * 2 + f.ph) * f.amp;
        f.rot = Math.atan2(f.y - py, f.x - px || dir * 0.001);
        const m = api.count(3, dt);
        for (let i = 0; i < m; i++) api.mote(f.x, f.y, -dir * api.rand(10, 60), api.rand(-30, 30), api.rand(500, 1000), api.rand(1.5, 3), aetherColor, -18, 0.985);
      }
    },
    draw(c) {
      for (const f of fs) {
        api.drawFeather(c, f.x, f.y, 22, f.rot, 0.95, AETHER_TH);
        const g = c.createRadialGradient(f.x, f.y, 0, f.x, f.y, Math.max(0.02, 30));
        g.addColorStop(0, `${AETHER_TH.glow}0.3)`);
        g.addColorStop(1, `${AETHER_TH.glow}0)`);
        c.fillStyle = g;
        c.beginPath();
        c.arc(f.x, f.y, 30, 0, Math.PI * 2);
        c.fill();
      }
    },
    arrive: () => onArrive?.(),
  });
};

/** Strahlenbündel (Demo `AETHER.rays`) — drei (Crit fünf) Lichtstrahlen bündeln sich auf dem Ziel. */
const aetherMissileRays: RecipeFn = (ctx) => {
  const { from: s, to: d, crit, api, onArrive } = ctx;
  const n = crit ? 5 : 3;
  const hold = 520;
  api.timed(160, (c, _age, u) => api.drawCore(c, s.x, s.y, 6 + 14 * u, themeCorePalette(AETHER_TH)));
  for (let i = 0; i < n; i++) api.delay(140 + i * 60, () => api.rayFromAbove(d.x, d.y + 30, hold, AETHER_TH, 26 + 10, d.x + (i - (n - 1) / 2) * 140));
  api.timed(140 + hold, () => {}, (dt, age) => {
    if (age <= 140) return;
    const m = api.count(4, dt);
    for (let i = 0; i < m; i++) api.mote(d.x + api.rand(-40, 40), d.y + api.rand(-80, 60), api.rand(-8, 8), api.rand(-70, -25), api.rand(500, 1000), api.rand(1.5, 3), aetherColor, -25);
  });
  api.delay(340, () => onArrive?.());
};

/** Segensring (Demo `AETHER.ring`) — ein goldener Ring wandert zum Ziel und weitet sich. */
const aetherMissileRing: RecipeFn = (ctx) => {
  const { dir, api, durationMs = 560, onArrive } = ctx;
  projectile(ctx, {
    T: durationMs * 0.9,
    arc: 10,
    update(ee, u, dt) {
      const R = 30 + 40 * u;
      const n = api.count(6, dt);
      for (let i = 0; i < n; i++) {
        const a = api.rand(0, Math.PI * 2);
        api.mote(ee.x + Math.cos(a) * 6, ee.y + Math.sin(a) * R, -dir * api.rand(20, 80), api.rand(-20, 20), api.rand(400, 800), api.rand(1.5, 3), aetherColor, -10);
      }
    },
    draw(c, ee) {
      const R = 30 + 40 * ee.u;
      c.strokeStyle = `${AETHER_TH.glow}0.25)`;
      c.lineWidth = 12;
      c.beginPath();
      c.ellipse(ee.x, ee.y, Math.max(0.01, R * 0.22), Math.max(0.01, R), 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = rgba(AETHER_TH.mid, 0.8);
      c.lineWidth = 4;
      c.beginPath();
      c.ellipse(ee.x, ee.y, Math.max(0.01, R * 0.22), Math.max(0.01, R), 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = rgba(AETHER_TH.hot, 0.95);
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(ee.x, ee.y, Math.max(0.01, R * 0.22), Math.max(0.01, R), 0, 0, Math.PI * 2);
      c.stroke();
    },
    arrive: () => onArrive?.(),
  });
};

const aetherImpactBurst: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const n = api.burst(50 * k);
  api.shake(crit ? 5 : 2);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const sp = api.rand(60, 280) * k;
    api.mote(to.x, to.y, Math.cos(a) * sp, Math.sin(a) * sp, api.rand(300, 700), api.rand(2, 4), aetherColor, -20, 0.96);
    if (i % 3 === 0) api.spark(to.x, to.y, Math.cos(a) * sp * 1.3, Math.sin(a) * sp * 1.3, api.rand(150, 350), 1.6, aetherColor, 80);
  }
  api.flash(to, 140 * k, "rgba(245,215,140,", 220);
  api.timed(260, (c, _age, u) => api.drawStar(c, to.x, to.y, (30 + 90 * u) * k, u * 0.4, AETHER_TH, 0.7 * (1 - u), 6));
};

const aetherImpactFeatherfall: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const n = api.burst(14 * k);
  api.flash(to, 70 * k, "rgba(245,215,140,", 160);
  for (let i = 0; i < n; i++) api.feather(to.x + api.rand(-70, 70) * k, to.y - api.rand(60, 140), api.rand(-20, 20), api.rand(10, 40), api.rand(1100, 1800), api.rand(8, 14), AETHER_TH);
  api.timed(700, () => {}, (dt) => {
    const m = api.count(2 * k, dt);
    for (let i = 0; i < m; i++) api.mote(to.x + api.rand(-70, 70) * k, to.y + api.rand(-100, 60), api.rand(-8, 8), api.rand(-20, -5), api.rand(600, 1100), api.rand(1.5, 3), aetherColor, -6);
  });
};

const aetherImpactReverbRing: RecipeFn = (ctx) => {
  const { to, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  api.flash(to, 90 * k, "rgba(245,215,140,", 200);
  for (let i = 0; i < 3; i++) api.delay(i * 130, () => api.ring(to, (90 + i * 30) * k, 420, "rgba(245,215,140,", 8 - i * 2));
  api.timed(600, () => {}, (dt, _age, u) => {
    const m = api.count(3 * k * (1 - u), dt);
    for (let i = 0; i < m; i++) {
      const a = api.rand(0, Math.PI * 2);
      const r = api.rand(20, 90) * k;
      api.mote(to.x + Math.cos(a) * r, to.y + Math.sin(a) * r, 0, api.rand(-60, -20), api.rand(400, 900), api.rand(1.5, 3), aetherColor, -15);
    }
  });
};

registerRecipe("missile_aether", [aetherMissileFeather, aetherMissileRays, aetherMissileRing], aetherMissileFeather);
registerRecipe("impact_aether", [aetherImpactBurst, aetherImpactFeatherfall, aetherImpactReverbRing]);

// =================================================================================================
// NAHKAMPF (kein Geschoss — Ausfallschritt läuft bereits über die bestehende WAAPI-Lunge, hier nur
// Luftzug/Schnittbogen/Funken/Bodenriss). `slash_cut`/`slash_heavy`/`slash_blunt`/`slash_thrust`.
// =================================================================================================

const meleeCut1: RecipeFn = (ctx) => {
  dash(ctx);
  cut(ctx, -1.9, -0.3, 90, 3, 110);
};
const meleeCut2: RecipeFn = (ctx) => {
  dash(ctx, 170);
  cut(ctx, -1.9, -0.3, 90, 3, 100);
  cut(ctx, 1.9, 0.3, 88, 3, 200, 300, -50);
};
const meleeCutCrit: RecipeFn = (ctx) => {
  dash(ctx, 190);
  cut(ctx, -1.9, -0.3, 96, 3.5, 90, 260);
  cut(ctx, 1.9, 0.3, 92, 3.5, 180, 260, -50);
  cut(ctx, -1.2, -2.6, 100, 4, 270, 280);
  ctx.api.delay(250, () => {
    ctx.api.flash(ctx.to, 90, "rgba(230,225,210,", 140);
    ctx.api.shake(8);
  });
};
registerRecipe("slash_cut", [meleeCut1, meleeCut2], meleeCutCrit);

const meleeHeavy1: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const k = ctx.crit ? 1.6 : 1;
  dash(ctx, 200);
  api.delay(120, () => {
    api.slashArc({ x: d.x - dir * 70, y: d.y, r: 85 * kr(k), a0: ang(dir, -1.4), a1: ang(dir, 0.9), ms: 300, w: 5 * k, th: STEEL });
    groundShock(ctx, 60 * k);
    api.shake(5);
  });
};
const meleeHeavy2: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const k = ctx.crit ? 1.6 : 1;
  dash(ctx, 200);
  api.delay(120, () => {
    api.slashArc({ x: d.x - dir * 30, y: d.y - 40, r: 90 * kr(k), a0: ang(dir, -2.2), a1: ang(dir, 0.9), ms: 300, w: 6 * k, th: STEEL });
    groundShock(ctx, 50 * k, 260, 6);
    edgeSparks(ctx, d, 8, 0.8);
    api.shake(5);
  });
};
const meleeHeavyCrit: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const k = 1.6;
  dash(ctx, 220);
  api.delay(130, () => {
    api.slashArc({ x: d.x - dir * 70, y: d.y, r: 100 * kr(k), a0: ang(dir, -1.5), a1: ang(dir, 1.0), ms: 330, w: 7 * k, th: STEEL });
    groundShock(ctx, 90 * k, 340, 14);
    api.crack(ctx.feet ?? { x: d.x, y: d.y + 130 }, 900, 3, 110);
    api.flash(d, 90, "rgba(230,225,210,", 140);
    api.shake(9);
  });
};
registerRecipe("slash_heavy", [meleeHeavy1, meleeHeavy2], meleeHeavyCrit);

const meleeBlunt1: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const k = ctx.crit ? 1.6 : 1;
  dash(ctx, 220);
  api.delay(130, () => {
    api.slashArc({ x: d.x - dir * 20, y: d.y + 20, r: 75 * kr(k), a0: ang(dir, -2.6), a1: ang(dir, -0.2), ms: 320, w: 9 * k, th: STEEL, tilt: 0.8 });
    groundShock(ctx, 100 * k, 340, 14);
    api.crack(ctx.feet ?? { x: d.x, y: d.y + 130 }, 800, 2, 100);
    api.shake(8);
  });
};
const meleeBlunt2: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const k = ctx.crit ? 1.6 : 1;
  dash(ctx, 220);
  api.delay(140, () => {
    api.slashArc({ x: d.x - dir * 60, y: d.y - 30, r: 70 * kr(k), a0: ang(dir, -1.6), a1: ang(dir, 1.2), ms: 300, w: 10 * k, th: STEEL });
    groundShock(ctx, 130 * k, 400, 18);
    api.crack(ctx.feet ?? { x: d.x, y: d.y + 130 }, 900, 3, 120);
    const feet = ctx.feet ?? { x: d.x, y: d.y + 130 };
    const m = api.burst(16);
    for (let i = 0; i < m; i++) api.dust(feet.x + api.rand(-40, 40), feet.y, api.rand(-160, 160), api.rand(-140, -40), api.rand(600, 1100), api.rand(10, 20));
    api.shake(10);
  });
};
const meleeBluntCrit: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const feet = ctx.feet ?? { x: d.x, y: d.y + 130 };
  dash(ctx, 260);
  api.delay(150, () => {
    api.slashArc({ x: d.x - dir * 20, y: d.y + 20, r: 85 * kr(1.6), a0: ang(dir, -2.7), a1: ang(dir, -0.1), ms: 340, w: 11 * 1.6, th: STEEL, tilt: 0.8 });
    groundShock(ctx, 150 * 1.6, 440, 20);
    api.delay(90, () => groundShock(ctx, 190 * 1.6, 460, 12));
    api.crack(feet, 1100, 5, 150);
    api.flash(d, 110, "rgba(230,225,210,", 160);
    const m = api.burst(24);
    for (let i = 0; i < m; i++) api.dust(feet.x + api.rand(-60, 60), feet.y, api.rand(-200, 200), api.rand(-180, -40), api.rand(700, 1300), api.rand(10, 22));
    api.shake(14);
  });
};
registerRecipe("slash_blunt", [meleeBlunt1, meleeBlunt2], meleeBluntCrit);

const meleeThrust1: RecipeFn = (ctx) => {
  dash(ctx, 100);
  thrust(ctx, 0, 0, 90);
};
const meleeThrust2: RecipeFn = (ctx) => {
  dash(ctx, 100);
  thrust(ctx, -14, 0, 80);
  thrust(ctx, 14, 0, 190);
};
const meleeThrustCrit: RecipeFn = (ctx) => {
  dash(ctx, 110);
  thrust(ctx, 0, 90, 100, 260);
  ctx.api.delay(150, () => {
    ctx.api.flash(ctx.to, 80, "rgba(230,225,210,", 140);
    edgeSparks(ctx, { x: ctx.to.x + ctx.dir * 60, y: ctx.to.y }, 12, 0.7);
    ctx.api.shake(8);
  });
};
registerRecipe("slash_thrust", [meleeThrust1, meleeThrust2], meleeThrustCrit);

// =================================================================================================
// PFEIL (missile_arrow / impact_arrow)
// =================================================================================================

const steelColor = themeColorFn(STEEL);

function arrowFlightRecipe(Tm: number, arc: number): RecipeFn {
  return (ctx) => {
    const { dir, crit, api, durationMs = 560, onArrive } = ctx;
    const k = crit ? 1.5 : 1;
    let px = ctx.from.x;
    let py = ctx.from.y;
    let angle = 0;
    projectile(ctx, {
      T: durationMs * Tm,
      arc,
      update(ee, u, dt) {
        void u;
        angle = Math.atan2(ee.y - py, ee.x - px || dir * 0.001);
        px = ee.x;
        py = ee.y;
        const n = api.count(3, dt);
        for (let i = 0; i < n; i++) api.spark(ee.x - dir * api.rand(10, 40), ee.y + api.rand(-2, 2), -dir * api.rand(40, 120), api.rand(-10, 10), api.rand(120, 240), 1.2, steelColor, 0, 0.98);
      },
      draw(c, ee) {
        api.drawArrow(c, ee.x, ee.y, angle, k);
        c.strokeStyle = `${STEEL.glow}0.25)`;
        c.lineWidth = 3 * k;
        c.beginPath();
        c.moveTo(ee.x, ee.y);
        c.lineTo(ee.x - Math.cos(angle) * 60 * k, ee.y - Math.sin(angle) * 60 * k);
        c.stroke();
      },
      arrive: () => onArrive?.(),
    });
  };
}
registerRecipe("missile_arrow", [arrowFlightRecipe(0.55, 30), arrowFlightRecipe(0.95, 220)], arrowFlightRecipe(0.42, 20));

const arrowImpact: RecipeFn = (ctx) => {
  const { to: d, dir, crit, api } = ctx;
  const k = crit ? 1.6 : 1;
  const angle = dir > 0 ? 0 : Math.PI;
  api.timed(crit ? 420 : 340, (c, age, u) => {
    const vib = Math.sin(age / 18) * (1 - u) * 0.08;
    api.drawArrow(c, d.x, d.y, angle + vib, k, 1 - u * u);
  });
  const m = api.burst(crit ? 24 : 12 * k);
  for (let i = 0; i < m; i++) {
    const a = api.rand(-1.4, 1.4);
    api.splinter(d.x, d.y, -dir * Math.cos(a) * api.rand(40, 200), Math.sin(a) * api.rand(40, 200) - 60, api.rand(350, 700), api.rand(3, 7));
  }
  edgeSparks(ctx, d, crit ? 10 : 4, 0.6);
  if (crit) {
    api.flash(d, 70, "rgba(230,225,210,", 120);
    edgeSparks(ctx, { x: d.x + dir * 40, y: d.y }, 10, 0.6);
    api.shake(7);
  } else {
    api.shake(3);
  }
};
registerRecipe("impact_arrow", [arrowImpact]);

// =================================================================================================
// TREFFERREAKTIONEN (Blut/Ichor/Knochenstaub/Block/Fehlschlag) — gedeckt, kein Gore.
// =================================================================================================

const bloodRed: RecipeFn = (ctx) => {
  const { to: d, dir, crit, api } = ctx;
  const k = crit ? 1.4 : 1;
  api.shake(3);
  const n = api.burst(22 * k);
  for (let i = 0; i < n; i++) {
    const a = api.rand(-0.9, 0.9);
    api.blood(d.x + api.rand(-6, 6), d.y + api.rand(-14, 14), dir * Math.cos(a) * api.rand(60, 240) * k, Math.sin(a) * api.rand(60, 200) - 40, api.rand(320, 620), api.rand(2, 4) * k, "150,22,28");
  }
  for (let i = 0; i < 3; i++) api.smoke(d.x + dir * api.rand(0, 20), d.y + api.rand(-10, 10), dir * api.rand(10, 40), api.rand(-20, 10), api.rand(300, 500), api.rand(8, 14), "60,8,12", 0.3, 0);
};
registerRecipe("blood_red", [bloodRed]);

const bloodIchor: RecipeFn = (ctx) => {
  const { to: d, dir, crit, api } = ctx;
  const k = crit ? 1.4 : 1;
  api.shake(3);
  const n = api.burst(14 * k);
  for (let i = 0; i < n; i++) {
    const a = api.rand(-0.7, 0.7);
    api.blood(d.x + api.rand(-6, 6), d.y + api.rand(-14, 14), dir * Math.cos(a) * api.rand(30, 140) * k, Math.sin(a) * api.rand(20, 120) - 20, api.rand(450, 800), api.rand(3, 5.5) * k, "58,96,44");
  }
  for (let i = 0; i < 4; i++) api.smoke(d.x + dir * api.rand(0, 20), d.y + api.rand(-10, 10), dir * api.rand(10, 30), api.rand(-25, 5), api.rand(400, 700), api.rand(10, 16), "20,40,18", 0.35, -4);
};
registerRecipe("blood_ichor", [bloodIchor]);

const bloodBone: RecipeFn = (ctx) => {
  const { to: d, dir, crit, api } = ctx;
  const k = crit ? 1.4 : 1;
  api.shake(3);
  const n = api.burst(10 * k);
  for (let i = 0; i < n; i++) {
    const a = api.rand(-1.2, 1.2);
    api.bone(d.x, d.y + api.rand(-20, 20), dir * Math.cos(a) * api.rand(40, 180), Math.sin(a) * api.rand(40, 160) - 80, api.rand(400, 800), api.rand(2, 5) * k);
  }
  const m = Math.round(8 * k);
  for (let i = 0; i < m; i++) api.smoke(d.x + api.rand(-14, 14), d.y + api.rand(-20, 20), dir * api.rand(10, 60), api.rand(-40, -5), api.rand(500, 1000), api.rand(12, 22), "190,180,160", 0.22, -8);
};
registerRecipe("blood_bone", [bloodBone]);

// P2-Fix (Review 1.2.0, Chef-Auftrag): Magie-Treffer spielten die Trefferreaktion noch als
// Blut-Sprite (`blood_red`/`ichor`/`bone` gab es dafür kein Rezept, s. CombatPage.tsx
// `playParticleMagicBlood`) — anders als Nah-/Fernkampf, die hier längst Partikel bekommen.
// Statt buchstäblichem Blut/Ichor/Knochenstaub (ein arkaner Stab lässt niemanden bluten) ist das
// eine gedämpfte Funken-/Motes-Reaktion in der Themenfarbe der Waffe: ein kleiner Funkenkranz
// (spark, wie Blut kurzlebig und materiell) plus ein paar treibende Lichtmotten (mote, langsam
// aufsteigend/verwehend), spürbar leiser als der volle `impact_<thema>`-Einschlag daneben. Ein
// generisches Rezept je der sieben `MagicTheme`-Werte (combatFx.ts).
function magicHitReaction(th: ThemeColors): RecipeFn {
  const color = themeColorFn(th);
  return (ctx) => {
    const { to: d, dir, crit, api } = ctx;
    const k = crit ? 1.4 : 1;
    api.shake(2);
    const sparks = api.burst(9 * k);
    for (let i = 0; i < sparks; i++) {
      const a = api.rand(-1.1, 1.1);
      api.spark(
        d.x + api.rand(-6, 6),
        d.y + api.rand(-14, 14),
        dir * Math.cos(a) * api.rand(40, 160) * k,
        Math.sin(a) * api.rand(40, 140) - 30,
        api.rand(260, 460),
        api.rand(1.4, 2.6) * k,
        color,
        0,
        0.97,
      );
    }
    const motes = api.burst(7 * k);
    for (let i = 0; i < motes; i++) {
      api.mote(
        d.x + api.rand(-10, 10),
        d.y + api.rand(-16, 10),
        api.rand(-30, 30),
        api.rand(-60, -15),
        api.rand(500, 900),
        api.rand(2, 4) * k,
        color,
        -10,
        0.985,
      );
    }
  };
}
registerRecipe("blood_magic_arcane", [magicHitReaction(ARCANE_TH)]);
registerRecipe("blood_magic_fire", [magicHitReaction(FIRE_TH)]);
registerRecipe("blood_magic_frost", [magicHitReaction(FROST_TH)]);
registerRecipe("blood_magic_shock", [magicHitReaction(SHOCK_TH)]);
registerRecipe("blood_magic_poison", [magicHitReaction(POISON_TH)]);
registerRecipe("blood_magic_void", [magicHitReaction(VOID_TH)]);
registerRecipe("blood_magic_aether", [magicHitReaction(AETHER_TH)]);

const impactBlock: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const at = { x: d.x - dir * 55, y: d.y };
  api.shake(2);
  const m = api.burst(22);
  for (let i = 0; i < m; i++) {
    const a = api.rand(-1.3, 1.3);
    api.spark(at.x, at.y, -dir * Math.cos(a) * api.rand(80, 320), Math.sin(a) * api.rand(80, 320) - 60, api.rand(180, 420), api.rand(1.3, 2.4), steelColor, 320);
  }
  api.flash(at, 50, "rgba(230,225,210,", 110);
  api.timed(200, (c, _age, u) => {
    const a = 1 - u;
    c.strokeStyle = rgba(STEEL.hot, 0.9 * a);
    c.lineWidth = 3;
    c.beginPath();
    c.arc(at.x + dir * 30, at.y, 48, ang(dir, Math.PI - 0.9), ang(dir, Math.PI + 0.9), dir < 0);
    c.stroke();
    c.strokeStyle = `${STEEL.glow}${0.25 * a})`;
    c.lineWidth = 12;
    c.stroke();
  });
};
registerRecipe("impact_block", [impactBlock]);

const missWhiff: RecipeFn = (ctx) => {
  const { to: d, dir, api } = ctx;
  const a = { x: d.x - dir * 90, y: d.y - 30 };
  const b = { x: d.x + dir * 130, y: d.y + 20 };
  api.timed(260, (c, _age, u) => {
    const al = (u < 0.5 ? u / 0.5 : 1 - (u - 0.5) / 0.5) * 0.35;
    const hx = a.x + (b.x - a.x) * Math.min(1, u * 1.6);
    const hy = a.y + (b.y - a.y) * Math.min(1, u * 1.6);
    c.lineCap = "round";
    c.strokeStyle = `${STEEL.glow}${al})`;
    c.lineWidth = 16;
    c.beginPath();
    c.moveTo(hx - dir * 110, hy - 6);
    c.quadraticCurveTo(hx - dir * 40, hy - 18, hx, hy);
    c.stroke();
    c.strokeStyle = `${STEEL.glow}${al * 0.8})`;
    c.lineWidth = 3;
    c.stroke();
  });
  const feetY = ctx.feet?.y ?? d.y + 130;
  const m = api.burst(5);
  for (let i = 0; i < m; i++) api.dust(d.x + dir * api.rand(20, 90), feetY + api.rand(0, 6), dir * api.rand(30, 90), api.rand(-30, -8), api.rand(400, 700), api.rand(6, 12));
};
registerRecipe("miss_whiff", [missWhiff]);

// =================================================================================================
// BEGLEITER (pet_bite/bolt/mark/ward/critstar/pilfer)
// =================================================================================================

const petBite: RecipeFn = (ctx) => {
  const { to: d, api } = ctx;
  api.timed(320, (c, age, u) => {
    const gap = 30 * (1 - Math.min(1, u / 0.5));
    const a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    const r = 30;
    c.strokeStyle = `rgba(230,220,200,${0.95 * a})`;
    c.lineWidth = 3;
    c.fillStyle = `rgba(230,220,200,${0.9 * a})`;
    for (const sgn of [-1, 1]) {
      const cy = d.y + sgn * gap;
      c.beginPath();
      c.arc(d.x, cy, r, sgn > 0 ? 0.15 : Math.PI + 0.15, sgn > 0 ? Math.PI - 0.15 : Math.PI * 2 - 0.15);
      c.stroke();
      for (let i = 0; i < 4; i++) {
        const t = 0.4 + i * 0.75;
        const tx = d.x + Math.cos(sgn > 0 ? t : Math.PI + t) * r;
        const ty = cy + Math.sin(sgn > 0 ? t : Math.PI + t) * r;
        c.beginPath();
        c.moveTo(tx - 4, ty);
        c.lineTo(tx, ty - sgn * 9);
        c.lineTo(tx + 4, ty);
        c.closePath();
        c.fill();
      }
    }
    void age;
  });
  api.delay(160, () => {
    api.shake(3);
    const m = api.burst(6);
    for (let i = 0; i < m; i++) api.blood(d.x + api.rand(-10, 10), d.y + api.rand(-10, 10), api.rand(-80, 80), api.rand(-60, 20), api.rand(300, 500), api.rand(1.5, 2.5));
  });
};
registerRecipe("pet_bite", [petBite]);

const petBolt: RecipeFn = (ctx) => {
  const { to: d, dir, petPos, api } = ctx;
  const p = petPos ?? { x: ctx.from.x - dir * 60, y: ctx.from.y };
  const from = { x: p.x + dir * 30, y: p.y - 10 };
  let angle = 0;
  const eLocal = { x: from.x, y: from.y, u: 0, age: 0 };
  const T = 220;
  let age = 0;
  let done = false;
  const effect: Effect = {
    update(dt) {
      if (done) return;
      age += dt;
      const u = Math.min(1, age / T);
      eLocal.x = from.x + (d.x - from.x) * u;
      eLocal.y = from.y + (d.y - from.y) * u - Math.sin(u * Math.PI) * 10;
      angle = Math.atan2(d.y - p.y + 10, d.x - p.x);
      const n = api.count(2, dt);
      for (let i = 0; i < n; i++) api.spark(eLocal.x, eLocal.y, -dir * api.rand(30, 90), api.rand(-8, 8), api.rand(100, 200), 1, steelColor, 0, 0.98);
      if (u >= 1 && !done) {
        done = true;
        api.shake(2);
        edgeSparks(ctx, d, 8, 1.0);
        api.flash(d, 34, "rgba(230,225,210,", 100);
      }
    },
    draw(c) {
      if (done) return;
      c.save();
      c.translate(eLocal.x, eLocal.y);
      c.rotate(angle);
      c.strokeStyle = `${STEEL.glow}0.3)`;
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(-40, 0);
      c.lineTo(0, 0);
      c.stroke();
      c.strokeStyle = "rgba(170,140,95,0.95)";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(-16, 0);
      c.lineTo(10, 0);
      c.stroke();
      c.fillStyle = rgba(STEEL.hot, 0.95);
      c.beginPath();
      c.moveTo(16, 0);
      c.lineTo(8, -3.5);
      c.lineTo(8, 3.5);
      c.closePath();
      c.fill();
      c.restore();
    },
    alive: () => !done,
  };
  api.addEffect(effect);
};
registerRecipe("pet_bolt", [petBolt]);

const petMark: RecipeFn = (ctx) => {
  const { to: d, api } = ctx;
  const at = { x: d.x, y: d.y - 120 };
  api.timed(800, (c, age, u) => {
    const sc = u < 0.15 ? u / 0.15 : 1;
    const a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    const pulse = 1 + 0.08 * Math.sin(age / 60);
    const r = 22 * sc * pulse;
    c.strokeStyle = rgba(CRIMSON.mid, 0.9 * a);
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(at.x, at.y, Math.max(0.01, r), 0, Math.PI * 2);
    c.stroke();
    c.save();
    c.translate(at.x, at.y);
    c.rotate(age / 400);
    for (let i = 0; i < 3; i++) {
      const t = (i * Math.PI * 2) / 3;
      c.beginPath();
      c.moveTo(Math.cos(t) * r * 0.8, Math.sin(t) * r * 0.8);
      c.lineTo(Math.cos(t) * r * 1.35, Math.sin(t) * r * 1.35);
      c.stroke();
    }
    c.restore();
    c.fillStyle = rgba(CRIMSON.hot, 0.9 * a);
    c.beginPath();
    c.arc(at.x, at.y, 4, 0, Math.PI * 2);
    c.fill();
    const g = c.createRadialGradient(at.x, at.y, 0, at.x, at.y, Math.max(0.02, r * 2));
    g.addColorStop(0, `${CRIMSON.glow}${0.25 * a})`);
    g.addColorStop(1, `${CRIMSON.glow}0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(at.x, at.y, Math.max(0.02, r * 2), 0, Math.PI * 2);
    c.fill();
  }, (dt) => {
    const n = api.count(1.5, dt);
    for (let i = 0; i < n; i++) api.mote(at.x + api.rand(-16, 16), at.y + 10, api.rand(-5, 5), api.rand(30, 70), api.rand(500, 900), 2, themeColorFn(CRIMSON), 20, 0.995);
  });
};
registerRecipe("pet_mark", [petMark]);

const petWard: RecipeFn = (ctx) => {
  const { box, api } = ctx;
  const b = box ?? { x: ctx.to.x - 70, y: ctx.to.y - 140, w: 140, h: 280 };
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const rx = b.w * 0.62;
  const ry = b.h * 0.55;
  const hexes = Array.from({ length: 9 }, () => ({ a: api.rand(0, Math.PI * 2), r: api.rand(0.55, 0.95), t0: api.rand(0, 500), sz: api.rand(7, 12) }));
  api.timed(900, (c, age, u) => {
    const a = u < 0.15 ? u / 0.15 : u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
    const g = c.createRadialGradient(cx, cy, Math.max(0.02, ry * 0.5), cx, cy, Math.max(0.03, ry));
    g.addColorStop(0, `${TEAL.glow}0)`);
    g.addColorStop(0.85, `${TEAL.glow}${0.1 * a})`);
    g.addColorStop(1, `${TEAL.glow}${0.35 * a})`);
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(cx, cy, Math.max(0.02, rx), Math.max(0.02, ry), 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = rgba(TEAL.hot, 0.8 * a);
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(cx, cy, Math.max(0.02, rx), Math.max(0.02, ry), 0, 0, Math.PI * 2);
    c.stroke();
    for (const h of hexes) {
      const ha = Math.max(0, Math.sin(((age - h.t0) / 300) * Math.PI)) * a;
      if (ha <= 0) continue;
      const hx = cx + Math.cos(h.a) * rx * h.r;
      const hy = cy + Math.sin(h.a) * ry * h.r;
      c.strokeStyle = rgba(TEAL.hot, 0.7 * ha);
      c.lineWidth = 1.2;
      c.beginPath();
      for (let i = 0; i < 6; i++) {
        const t = (i * Math.PI * 2) / 6;
        if (i) c.lineTo(hx + Math.cos(t) * h.sz, hy + Math.sin(t) * h.sz);
        else c.moveTo(hx + Math.cos(t) * h.sz, hy + Math.sin(t) * h.sz);
      }
      c.closePath();
      c.stroke();
    }
  }, (dt, _age, u) => {
    if (u >= 0.7) return;
    const n = api.count(2, dt);
    for (let i = 0; i < n; i++) api.mote(cx + api.rand(-rx, rx) * 0.9, b.y + b.h - api.rand(0, 20), api.rand(-5, 5), api.rand(-60, -25), api.rand(500, 900), 2, themeColorFn(TEAL), -10);
  });
  api.flash({ x: cx, y: cy }, 60, "rgba(120,210,200,", 200);
};
registerRecipe("pet_ward", [petWard]);

const petCritstar: RecipeFn = (ctx) => {
  const { to: d, api } = ctx;
  api.shake(6);
  api.flash(d, 90, "rgba(235,190,90,", 160);
  const m = api.burst(20);
  for (let i = 0; i < m; i++) {
    const a = api.rand(0, Math.PI * 2);
    api.spark(d.x, d.y, Math.cos(a) * api.rand(80, 300), Math.sin(a) * api.rand(80, 300), api.rand(150, 350), api.rand(1.3, 2.4), themeColorFn(GOLD), 200);
  }
  api.timed(280, (c, _age, u) => {
    const a = u < 0.2 ? u / 0.2 : 1 - (u - 0.2) / 0.8;
    api.drawStar(c, d.x, d.y, (20 + 70 * Math.min(1, u / 0.3)), 0.2 + u * 0.4, GOLD, 0.9 * a, 4);
    api.drawStar(c, d.x, d.y, (12 + 40 * Math.min(1, u / 0.3)), 0.2 + u * 0.4 + Math.PI / 4, GOLD, 0.7 * a, 4);
  });
};
registerRecipe("pet_critstar", [petCritstar]);

const petPilfer: RecipeFn = (ctx) => {
  const { to: d, dir, petPos, api } = ctx;
  const p = petPos ?? { x: ctx.from.x - dir * 60, y: ctx.from.y };
  const from = { x: p.x + dir * 30, y: p.y - 14 };
  api.timed(420, (c, _age, u) => {
    const out = u < 0.4 ? u / 0.4 : 1 - (u - 0.4) / 0.6;
    const hx = from.x + (d.x - from.x) * out;
    const hy = from.y + (d.y - from.y) * out;
    const open = u < 0.4 ? 1 : 0.35;
    c.lineCap = "round";
    c.strokeStyle = "rgba(90,80,70,0.95)";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(hx, hy);
    c.stroke();
    c.strokeStyle = rgba(STEEL.mid, 0.95);
    c.lineWidth = 2;
    for (const s of [-1, 0, 1]) {
      c.beginPath();
      c.moveTo(hx, hy);
      c.quadraticCurveTo(hx + dir * 10, hy + s * 12 * open, hx + dir * 16, hy + s * 6 * open);
      c.stroke();
    }
  });
  api.delay(170, () => {
    api.flash(d, 40, "rgba(235,190,90,", 120);
    const m = api.burst(10);
    for (let i = 0; i < m; i++) api.pull(api.mote(d.x + api.rand(-10, 10), d.y + api.rand(-10, 10), -dir * api.rand(100, 200), api.rand(-120, -40), 700, api.rand(2.5, 4), themeColorFn(GOLD), 0, 0.99), from, 2400);
  });
};
registerRecipe("pet_pilfer", [petPilfer]);

// =================================================================================================
// STATUS-KÖRPEREFFEKTE (neu, Chef-Wunsch 28.08.2026) — Aufflammen (450ms, `status_<typ>`) +
// Ambient-Loop, solange der Status aktiv ist (`statusAmbient_<typ>`, `ctx.isActive`).
// =================================================================================================

const defaultStatusBox = (ctx: RecipeContext) => ctx.box ?? { x: ctx.to.x - 40, y: ctx.to.y - 100, w: 80, h: 200 };

// `scale` (Chef 28.08.2026: "die Flammen sind zu klein"): Brand laeuft mit 2,0, die anderen Status mit 1,0.
function makeStatusFlare(th: ThemeColors, flashPrefix: string, scale = 1): RecipeFn {
  const color = themeColorFn(th);
  return (ctx) => {
    const { to: d, api } = ctx;
    const b = defaultStatusBox(ctx);
    api.flash(d, 60 * scale, flashPrefix, 220);
    api.timed(450 + 150 * (scale - 1), () => {}, (dt) => {
      const n = api.count(9 * scale, dt);
      for (let i = 0; i < n; i++) {
        api.ember(b.x + api.rand(b.w * 0.05, b.w * 0.95), b.y + api.rand(b.h * 0.1, b.h), api.rand(-16, 16), api.rand(-95, -45) * scale, api.rand(300, 620) * scale, api.rand(4, 9) * scale, color, -28, 0.98);
        if (Math.random() < 0.3) api.mote(b.x + api.rand(0, b.w), b.y + api.rand(0, b.h), api.rand(-10, 10), api.rand(-40, -10), api.rand(400, 700), api.rand(1.5, 3), color, -10);
      }
    });
  };
}

function makeStatusAmbient(th: ThemeColors, kind: "flame" | "frost" | "spark" | "poison" | "drip", scale = 1): RecipeFn {
  const color = themeColorFn(th);
  return (ctx) => {
    const { api, isActive } = ctx;
    let b = defaultStatusBox(ctx);
    let acc = 0;
    let crystalPhase = 0;
    const effect: Effect = {
      update(dt) {
        // Chef 29.08.2026: Koerper-Box je Frame neu lesen (Panels umlegen/resizen), sonst brennt die Luft
        const nb = ctx.getBox?.();
        if (nb) b = nb;
        acc += dt;
        crystalPhase += dt;
        if (acc < 190 / scale) return;
        acc = 0;
        const n = api.burst(Math.round(2 * scale));
        for (let i = 0; i < n; i++) {
          const x = b.x + api.rand(b.w * 0.12, b.w * 0.88);
          const y = b.y + b.h * api.rand(0.35, 0.98);
          if (kind === "flame") {
            // Flammenzungen: gross, langsam aufsteigend, dazu Glut und Rauch (Chef 28.08.: deutlich groesser)
            api.ember(x, y, api.rand(-10, 10), api.rand(-75, -35) * scale, api.rand(400, 700) * scale, api.rand(3, 6) * scale, color, -25, 0.98);
            if (Math.random() < 0.45) api.ember(x + api.rand(-8, 8), y, api.rand(-6, 6), api.rand(-120, -70), api.rand(500, 800), api.rand(10, 18), color, -40, 0.985);
            if (Math.random() < 0.35) api.smoke(x, y, api.rand(-8, 8), api.rand(-30, -10), api.rand(600, 1000), api.rand(8, 14) * scale, th.smoke, 0.2, -6);
          } else if (kind === "frost") {
            if (Math.random() < 0.5) api.rime(x, y, api.rand(500, 900), api.rand(3, 6), th);
            api.mote(x, y, api.rand(-6, 6), api.rand(-30, -10), api.rand(500, 900), api.rand(1.3, 2.4), color, -6);
          } else if (kind === "spark") {
            api.spark(x, y, api.rand(-40, 40), api.rand(-30, 30), api.rand(160, 320), api.rand(1.2, 2), color, 0, 0.96);
          } else if (kind === "poison") {
            api.bubble(x, y, api.rand(-6, 6), api.rand(-30, -12), api.rand(400, 700), api.rand(1.6, 3), color);
            if (Math.random() < 0.4) api.smoke(x, y, api.rand(-6, 6), api.rand(-20, -6), api.rand(500, 850), api.rand(8, 14), th.smoke, 0.22, -4);
          } else {
            api.drop(x, b.y + b.h * 0.9, api.rand(-4, 4), api.rand(20, 60), api.rand(350, 600), api.rand(1.4, 2.2), color, 420);
          }
        }
      },
      draw(c) {
        if (kind === "spark" && Math.random() < 0.06) {
          const p0 = { x: b.x + Math.random() * b.w, y: b.y + b.h * (0.2 + Math.random() * 0.6) };
          const arc = [p0, { x: p0.x + (Math.random() - 0.5) * 30, y: p0.y + (Math.random() - 0.5) * 24 }];
          api.drawBolt(c, arc, [], 0.3, 0.6, th);
        }
        void crystalPhase;
      },
      alive: () => !!isActive?.(),
    };
    api.addEffect(effect);
  };
}

// Chef 29.08.2026: "Feuer-Effekt zu krass, um 50 % kleiner" -> Skalierung 2,0 -> 1,0 (Flammenzungen bleiben)
registerRecipe("status_burn", [makeStatusFlare(FIRE_TH, "rgba(255,150,60,", 1)]);
registerRecipe("statusAmbient_burn", [makeStatusAmbient(FIRE_TH, "flame", 1)]);
registerRecipe("status_frost", [makeStatusFlare(FROST_TH, "rgba(150,210,255,")]);
registerRecipe("statusAmbient_frost", [makeStatusAmbient(FROST_TH, "frost")]);
registerRecipe("status_shock", [makeStatusFlare(SHOCK_TH, "rgba(246,231,161,")]);
registerRecipe("statusAmbient_shock", [makeStatusAmbient(SHOCK_TH, "spark")]);
registerRecipe("status_poison", [makeStatusFlare(POISON_TH, "rgba(120,210,80,")]);
registerRecipe("statusAmbient_poison", [makeStatusAmbient(POISON_TH, "poison")]);
registerRecipe("status_bleed", [makeStatusFlare(THEMES.crimson!, "rgba(200,60,60,")]);
registerRecipe("statusAmbient_bleed", [makeStatusAmbient(THEMES.crimson!, "drip")]);

// Entzug (void, Elementar-Effekte 28.08.2026 — Chef-Auftrag CombatPage-Bericht): dunkle purpurne
// Schlieren, die vom Körper nach INNEN ziehen (Drain-Gefühl), statt wie die übrigen fünf Status
// nach außen/oben wegzudriften — nutzt denselben `api.pull`-Implosionsgriff wie `voidImpactImplosion`
// oben (dort für einen Punkteinschlag, hier über die Körper-Box `defaultStatusBox`), plus ein
// schwacher violetter Saum (dünne Ellipse in VOID_TH.mid). Eigene Flare/Ambient-Funktionen statt
// makeStatusFlare/makeStatusAmbient (deren fixe Auswärts-/Aufwärtsdrift zum Drain-Gefühl passt nicht),
// gleiches Registry-Muster (status_void/statusAmbient_void) wie die übrigen fünf Status.
const statusFlareVoid: RecipeFn = (ctx) => {
  const { to: d, api } = ctx;
  const b = defaultStatusBox(ctx);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h * 0.42;
  const n = api.burst(16);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const r = Math.max(b.w, b.h * 0.5) * api.rand(0.5, 0.75);
    api.pull(api.mote(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 0, 0, 480, api.rand(2, 3.5), voidColor, 0, 1), { x: cx, y: cy }, 2600);
  }
  api.timed(280, (c, _age, u) => {
    c.strokeStyle = rgba(VOID_TH.mid, 0.35 * (1 - u));
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(cx, cy, Math.max(0.01, b.w * 0.42 * (1 - u * 0.5)), Math.max(0.01, b.h * 0.3 * (1 - u * 0.5)), 0, 0, Math.PI * 2);
    c.stroke();
  });
  api.flash(d, 40, VOID_TH.glow, 200);
};

const statusAmbientVoid: RecipeFn = (ctx) => {
  const { api, isActive } = ctx;
  let b = defaultStatusBox(ctx);
  let cx = b.x + b.w / 2;
  let cy = b.y + b.h * 0.5;
  let acc = 0;
  const effect: Effect = {
    update(dt) {
      const nb = ctx.getBox?.();
      if (nb) { b = nb; cx = b.x + b.w / 2; cy = b.y + b.h * 0.5; }
      acc += dt;
      if (acc < 240) return;
      acc = 0;
      const n = api.burst(2);
      for (let i = 0; i < n; i++) {
        const a = api.rand(0, Math.PI * 2);
        const r = Math.max(b.w, b.h * 0.5) * api.rand(0.45, 0.7);
        api.pull(api.mote(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.6, 0, 0, 620, api.rand(1.6, 2.6), voidColor, 0, 1), { x: cx, y: cy }, 1400);
      }
    },
    draw(c) {
      c.strokeStyle = rgba(VOID_TH.mid, 0.16);
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(cx, cy, b.w * 0.4, b.h * 0.28, 0, 0, Math.PI * 2);
      c.stroke();
    },
    alive: () => !!isActive?.(),
  };
  api.addEffect(effect);
};

registerRecipe("status_void", [statusFlareVoid]);
registerRecipe("statusAmbient_void", [statusAmbientVoid]);

// Einfrieren (frost, 3. Anwendung in Folge): kurzes Eiskristall-Platzen am ausgesetzten Ziel, wenn
// ein Angriff wegen `missReason:"frozen"` ausfällt (Trigger im Log-Diff, CombatPage.tsx, getrennt
// vom laufenden `statusAmbient_frost`-Loop). Kleiner/kürzer als die Waffen-Einschläge
// `frostImpactShatter`/-`Rime` oben (reiner Momenteffekt, kein Treffer), gleiche Primitive/Palette.
const statusFrozenBurst: RecipeFn = (ctx) => {
  const { to: d, api } = ctx;
  api.flash(d, 70, "rgba(200,235,255,", 180);
  api.ring(d, 46, 320, "rgba(170,220,255,", 6, 0.75, 0.35);
  const n = api.burst(16);
  for (let i = 0; i < n; i++) {
    const a = api.rand(0, Math.PI * 2);
    const sp = api.rand(70, 220);
    api.shard(d.x, d.y, Math.cos(a) * sp, Math.sin(a) * sp - 30, api.rand(280, 480), api.rand(2, 4), frostColor, 260);
  }
  api.timed(240, (c, _age, u) => {
    for (let i = 0; i < 2; i++) api.drawCrystal(c, d.x, d.y, 14 + 34 * u, i * 1.4 + u * 0.6, FROST_TH, 0.55 * (1 - u), 5);
  });
};
registerRecipe("status_frozen", [statusFrozenBurst]);
