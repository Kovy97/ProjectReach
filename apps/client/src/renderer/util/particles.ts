/**
 * Zonen-Ambient-Partikel im Kampf-Hintergrund (Chef-GO 2026-07-09, "Glut-Partikel"-Technik aus dem
 * Visual Playbook, jetzt thematisch je Zone). Reines Canvas + rAF, KEIN React-State pro Frame — die
 * beiden `Fighter`-Panels (Spieler/Gegner) mounten je einen `<canvas>` über ihrem Zonen-Hintergrund
 * (`.fighter-figure-wrap.has-backdrop`, s. CombatPage.tsx) und lassen `createZoneParticleField`
 * darauf zeichnen. Kein Redraw-Trigger im React-Baum, kein Re-Render bei Partikel-Bewegung.
 */

import type { CombatFxLevel } from "./uiPrefs";

export type ParticleThemeId = "ember" | "frost" | "spore" | "dust" | "void";

interface ThemeConfig {
  /** Basisfarbe als "r,g,b" — Alpha wird pro Partikel gemischt. */
  rgb: string;
  /** Partikel-Budget bei fxLevel="full" (Chef-Vorgabe: Pool ≤ 40 je Canvas — wir bleiben bewusst
   *  deutlich darunter, GPU-schonend, zwei Canvases laufen gleichzeitig: Spieler + Gegner). */
  count: number;
  size: [number, number];
  /** Vertikale Grundgeschwindigkeit in px/s (negativ = nach oben). */
  vy: [number, number];
  /** Horizontaler Grund-Drift in px/s, zusätzlich zum Sway. */
  vx: [number, number];
  alpha: [number, number];
  /** Seitliches Schwanken (Amplitude in px/s bei vollem Sinus-Ausschlag). */
  sway: number;
  /** Void-Funken: hartes Alpha-Flackern statt weichem Fade. */
  twinkle?: boolean;
}

const THEMES: Record<ParticleThemeId, ThemeConfig> = {
  // Glut/Asche aufsteigend — warme Zonen (Schmiede/Vulkan/Asche).
  ember: { rgb: "255,152,60", count: 22, size: [1.6, 3.8], vy: [-34, -14], vx: [-6, 6], alpha: [0.32, 0.82], sway: 10 },
  // Schneetreiben fallend — Frost-Zonen.
  frost: { rgb: "220,238,255", count: 24, size: [1.6, 3.8], vy: [14, 32], vx: [-8, 8], alpha: [0.38, 0.82], sway: 16 },
  // Sporen schwebend grünlich — Moor/Sumpf/Fäulnis/lebender Wald.
  spore: { rgb: "150,210,110", count: 18, size: [2.2, 4.8], vy: [-10, -3], vx: [-5, 5], alpha: [0.22, 0.52], sway: 14 },
  // Staub/Motten neutral-warm — Grüfte/Galgen/Hügelgräber.
  dust: { rgb: "214,190,140", count: 16, size: [1.2, 2.8], vy: [-4, 4], vx: [-6, 6], alpha: [0.18, 0.42], sway: 20 },
  // Funken tief-violett — Void/Götzen/Aether. Sparse + Twinkle, daher höheres Basis-Alpha, sonst
  // gehen die Funken auf den dunklen Void-Hintergründen optisch unter (Screenshot-Beweis Chef-GO).
  void: { rgb: "180,110,240", count: 18, size: [1.6, 3.6], vy: [-16, -4], vx: [-5, 5], alpha: [0.4, 0.9], sway: 8, twinkle: true },
};

/**
 * Zonen-Theme-Mapping — abgeleitet aus der effektiven Hintergrund-ID (dieselbe Priorität wie
 * `backdropBg` in CombatPage.tsx: `cs.dungeonId` > `slayer_tower_<floor>` > `monster.zone`).
 * NUR Zonen mit klarem thematischem Signal (Name/Content) sind gelistet — jede andere Zone bleibt
 * bewusst OHNE Partikel (Chef-Vorgabe: "Zonen ohne klares Thema: KEINE Partikel").
 *
 *  Key              | Ort (DE)                          | Theme  | Begründung
 *  -----------------|------------------------------------|--------|---------------------------------
 *  ashfields        | Die Aschfelder                     | ember  | Zonenname = Asche/Glut
 *  slagpit          | Schlackengrube & Frostkavernen     | frost  | "Frost Caverns" im Namen (die
 *                   |                                     |        | Zone hat auch eine Glut-Hälfte,
 *                   |                                     |        | aber der Zonenname endet auf
 *                   |                                     |        | Frost — eindeutigeres Signal)
 *  idolhall         | Die Götzenhalle                    | void   | "Idol" im Namen
 *  idol_sanctum     | Sanktum des Letzten Götzen (Dungeon)| void   | idolhall-Dungeon, Mob aether_wraith
 *  crypt            | Die Krypta                         | dust   | Krypta = Gruft
 *  crypt_depths     | Tiefen der Krypta (Dungeon)         | dust   | crypt-Dungeon
 *  blackthorn       | Der Schwarzdornwald                | spore  | lebender Wald-Zone (s. Content-
 *                   |                                     |        | Kommentar dort), Moos/Deathmoss/
 *                   |                                     |        | Frostvine-Drops, barrow_chanter
 *  slayer_tower_1   | Die Pestkammern                    | spore  | "Plague", rot_rat/plague_grub
 *  slayer_tower_2   | Die Spiegelhallen                  | dust   | Skelette/Wraith/Shade = Gruft-Vibe
 *  slayer_tower_3   | Die Schmiedeabgründe                | ember  | cinder_wretch/tower_ember_elemental/forge_demon
 *  slayer_tower_4   | Die Flüsternde Leere                | void   | "Void" im Namen
 *  slayer_tower_5   | Der Abyssale Thron                  | void   | "Abyssal", void_herald
 *
 * Unthemed (bewusst KEIN Eintrag → keine Partikel): pastures, borderlands, wildwood, coast,
 * highlands, goblin_warband (Dungeon).
 */
const ZONE_KEY_THEME_MAP: Record<string, ParticleThemeId> = {
  ashfields: "ember",
  slagpit: "frost",
  idolhall: "void",
  idol_sanctum: "void",
  crypt: "dust",
  crypt_depths: "dust",
  blackthorn: "spore",
  slayer_tower_1: "spore",
  slayer_tower_2: "dust",
  slayer_tower_3: "ember",
  slayer_tower_4: "void",
  slayer_tower_5: "void",
};

/** Löst den Partikel-Theme für einen effektiven Hintergrund-Schlüssel auf, `null` = keine Partikel. */
export function getZoneParticleTheme(zoneKey: string | null | undefined): ParticleThemeId | null {
  if (!zoneKey) return null;
  return ZONE_KEY_THEME_MAP[zoneKey] ?? null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
}

/**
 * Startet eine leichtgewichtige Ambient-Partikel-Animation auf `canvas` (rein Vanilla/rAF, kein
 * React-Redraw). Größe folgt `canvas.parentElement` via ResizeObserver. Pausiert automatisch bei
 * verstecktem Tab (`visibilitychange`); der Aufrufer muss beim Unmount `stop()` rufen.
 * `fxLevel="reduced"` halbiert das Partikel-Budget und verlangsamt die Bewegung; `"off"` sollte vom
 * Aufrufer bereits vorher abgefangen werden (kein Canvas mounten).
 */
export function createZoneParticleField(
  canvas: HTMLCanvasElement,
  themeId: ParticleThemeId,
  fxLevel: CombatFxLevel,
): { stop: () => void } {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { stop: () => {} };
  const cfg = THEMES[themeId];

  const reduced = fxLevel === "reduced";
  const speedMult = reduced ? 0.6 : 1;
  const count = Math.max(4, Math.round(cfg.count * (reduced ? 0.5 : 1)));

  let width = 0;
  let height = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const rand = (a: number, b: number): number => a + Math.random() * (b - a);

  const spawn = (p: Particle, initial: boolean): void => {
    p.x = rand(0, width);
    p.size = rand(cfg.size[0], cfg.size[1]);
    p.alpha = rand(cfg.alpha[0], cfg.alpha[1]);
    p.vy = rand(cfg.vy[0], cfg.vy[1]) * speedMult;
    p.vx = rand(cfg.vx[0], cfg.vx[1]) * speedMult;
    p.phase = Math.random() * Math.PI * 2;
    // Re-entry am passenden Rand: aufsteigende Partikel (vy<0) kommen von unten, fallende von oben —
    // beim allerersten Spawn stattdessen über die volle Höhe verteilt (kein "Anlauf"-Moment).
    p.y = initial ? rand(0, height) : p.vy < 0 ? height + 6 : -6;
  };

  const particles: Particle[] = Array.from({ length: count }, () => {
    const p: Particle = { x: 0, y: 0, vx: 0, vy: 0, size: 0, alpha: 0, phase: 0 };
    return p;
  });

  const resize = (): void => {
    const rect = canvas.parentElement?.getBoundingClientRect();
    width = rect?.width ?? canvas.clientWidth ?? 0;
    height = rect?.height ?? canvas.clientHeight ?? 0;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  particles.forEach((p) => spawn(p, true));

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  if (ro && canvas.parentElement) ro.observe(canvas.parentElement);

  let raf = 0;
  let last = performance.now();
  let running = true;

  const frame = (t: number): void => {
    if (!running) return;
    const dt = Math.min(64, t - last); // Deckel gegen Sprünge nach Tab-Wechsel/Ruckler
    last = t;
    ctx.clearRect(0, 0, width, height);
    for (const p of particles) {
      p.y += (p.vy * dt) / 1000;
      p.x += (p.vx * dt) / 1000 + Math.sin(t / 1400 + p.phase) * cfg.sway * (dt / 1000);
      if (p.y < -8 || p.y > height + 8 || p.x < -8 || p.x > width + 8) spawn(p, false);
      const a = cfg.twinkle ? p.alpha * (0.4 + 0.6 * Math.abs(Math.sin(t / 500 + p.phase * 3))) : p.alpha;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${cfg.rgb},${a.toFixed(3)})`;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = (): void => {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  return {
    stop: () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      ro?.disconnect();
    },
  };
}
