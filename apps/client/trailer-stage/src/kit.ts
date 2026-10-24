// claude:2026-10-24T10:24:00+02:00 — Trailer-Bühne: Baukasten für Shots (Kulissen, Figuren, Karten, Kamera, Duell, Platzhalter).
import * as THREE from "three";
import { easeOutCubic, pulse, ramp, wobble, type Vec3 } from "./anim";
import { asset, loadImage } from "./assets";
import { Atmosphere, buildBackdrop, type PainterCam } from "./env";
import { Burst, DamageNumber, Glow, Ring, SlashArc } from "./fx";
import { Puppet, type PuppetOpts } from "./puppet";
import type { Grade, Stage } from "./stage";

/** Ein Shot im Gesamt-Trailer: eigene Gruppe, Zeitfenster in Musikzeit, lokale Zeit t = τ − t0. */
export interface Shot {
  id: string;
  t0: number;
  t1: number;
  group: THREE.Group;
  setup(stage: Stage): Promise<void>;
  update(t: number, stage: Stage, tau: number): void;
  grade?(t: number): Partial<Grade>;
}

const cache = new Map<string, Promise<{ tex: THREE.Texture; img: HTMLImageElement }>>();
export function load(stage: Stage, path: string): Promise<{ tex: THREE.Texture; img: HTMLImageElement }> {
  let p = cache.get(path);
  if (!p) {
    p = (async () => ({ tex: await stage.texture(asset(path)), img: await loadImage(asset(path)) }))();
    cache.set(path, p);
  }
  return p;
}

// claude:2026-10-24T10:24:00+02:00 — Malerposition z 6,2: die Grundkamera steht genau dort (CAM0, Bildwinkel 40°), das Gemälde erscheint in voller Breite
// ohne Vergrößerung, Figuren bei z ≈ 0 füllen etwa die halbe Bildhöhe wie im Kampfbildschirm. Fahrten bleiben nah an CAM0.
export const PAINTER: PainterCam = { eye: 1.6, z: 6.2, horizon: 0.41, nearDist: 4, wallDist: 26 };
export const CAM0: Vec3 = [0, 1.6, 6.2];
export const FOV0 = 40;

export async function backdrop(stage: Stage, path: string, pc: Partial<PainterCam> = {}): Promise<THREE.Mesh> {
  const { tex, img } = await load(stage, path);
  return buildBackdrop(tex, img.width / img.height, { ...PAINTER, ...pc });
}

export async function figure(stage: Stage, path: string, opts: Omit<PuppetOpts, "url">): Promise<Puppet> {
  const { tex, img } = await load(stage, path);
  return new Puppet({ url: path, ...opts }, tex, img);
}

/** Flaches Bild als Puppe (Items, Karten, Logo): erbt Blitz, Auflösung, Deckkraft; Ursprung in der Bildmitte. */
export async function card(stage: Stage, path: string, height: number): Promise<Puppet> {
  const p = await figure(stage, path, { height });
  p.mesh.geometry.translate(0, -height / 2 + p.baseline * height, 0);
  p.shadow.visible = false;
  return p;
}

export function setCam(stage: Stage, pos: Vec3, look: Vec3, fov = 32, roll = 0): void {
  const c = stage.camera;
  c.fov = fov;
  c.updateProjectionMatrix();
  c.position.set(...pos);
  c.up.set(Math.sin(roll), Math.cos(roll), 0);
  c.lookAt(new THREE.Vector3(...look));
}

export function shake(pos: Vec3, amount: number, t: number, seed = 1): Vec3 {
  return [pos[0] + wobble(t * 3, seed) * amount, pos[1] + wobble(t * 3, seed + 1) * amount, pos[2]];
}

export function atmosphere(group: THREE.Group, seed: number, ashColor?: [number, number, number], emberColor?: [number, number, number], nAsh = 600, nEmber = 120): Atmosphere {
  const a = new Atmosphere({ x: [-7, 7], y: [0, 5.5], z: [-5, 7] }, nAsh, nEmber, seed, ashColor, emberColor);
  group.add(a.ash.points, a.embers.points);
  return a;
}
export function runAtmo(a: Atmosphere, stage: Stage, t: number, intensity = 1): void {
  a.ash.setCamera(stage.camera);
  a.embers.setCamera(stage.camera);
  a.update(t, stage.camera.position.z, intensity);
}

/** Schwarzes Zwischenbild mit Beschriftung für Shots, deren Assets noch fehlen. */
export function slate(id: string, t0: number, t1: number, label: string): Shot {
  const group = new THREE.Group();
  let sprite!: THREE.Sprite;
  return {
    id, t0, t1, group,
    async setup() {
      const c = document.createElement("canvas");
      c.width = 2048;
      c.height = 256;
      const g = c.getContext("2d")!;
      g.fillStyle = "rgba(200,190,170,0.75)";
      g.font = "64px Cinzel, Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(label, 1024, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, toneMapped: false }));
      sprite.scale.set(8, 1, 1);
      group.add(sprite);
    },
    update(_t, stage) {
      setCam(stage, [0, 0, 10], [0, 0, 0], 32);
      sprite.position.set(0, 0, 0);
    },
    grade: () => ({ vignette: 0.2, grain: 0.02, bloom: 0 }),
  };
}

// ── Duell: Held + Gegner, Treffer zu festen Handlungszeiten ─────────────────────────────────────────
export interface HitSpec {
  /** Handlungszeit des Einschlags */
  at: number;
  /** Musikzeit des Einschlags (für Blitz/Wackeln, die in Echtzeit ablaufen) */
  tau: number;
  point: THREE.Vector3;
  dmg?: string;
  crit?: boolean;
  /** Bogen-Ausrichtung (Start-/Endwinkel) */
  arc?: [number, number];
  sparks?: number;
  seed: number;
}

export class HitFx {
  readonly sparks: Burst;
  // claude:2026-10-24T10:24:00+02:00 — Treffer gedämpft: Leuchtkern, Bogen und Bildblitz überstrahlten das Bild
  readonly glow = new Glow(new THREE.Color(1.6, 1.2, 0.75));
  readonly ring = new Ring(new THREE.Color(1.3, 1.05, 0.8), false);
  readonly arc: SlashArc;
  readonly dmg: DamageNumber | null;
  constructor(readonly h: HitSpec, group: THREE.Group, colors?: [THREE.Color, THREE.Color]) {
    const hot = colors?.[0] ?? new THREE.Color(3.6, 2.6, 1.3);
    const cold = colors?.[1] ?? new THREE.Color(1.7, 0.4, 0.08);
    this.sparks = new Burst({ seed: h.seed, count: h.sparks ?? 110, origin: h.point, dir: new THREE.Vector3(1, 0.45, 0.35), spread: 0.8, speed: [3, 10], life: [0.4, 1.1], gravity: -9, drag: 1.3, stretch: 0.03, width: 0.022, colors: [hot, cold], birthFade: 0.06 });
    const [a0, a1] = h.arc ?? [2.5, -0.85];
    this.arc = new SlashArc(0.9, a0, a1, 0.3, new THREE.Color(2.2, 2.0, 1.7), new THREE.Color(1.2, 0.55, 0.18));
    this.dmg = h.dmg ? new DamageNumber(h.dmg, { crit: h.crit }) : null;
    group.add(this.sparks.mesh, this.glow.sprite, this.ring.mesh, this.arc.mesh);
    if (this.dmg) group.add(this.dmg.sprite);
  }
  update(a: number, tau: number, cam: THREE.Vector3): void {
    const h = this.h;
    const da = a - h.at;
    this.sparks.mesh.visible = da >= 0;
    this.sparks.update(da, cam);
    this.glow.set(h.point, 0.5, 0.35 * pulse(tau, h.tau, 0.0001, 0.2));
    this.ring.update(da, 0.3, 1.2, h.point, cam, 0.5);
    this.arc.mesh.position.copy(h.point).add(new THREE.Vector3(-0.1, 0.05, 0.05));
    this.arc.mesh.lookAt(cam);
    this.arc.update(da + 0.05, 0.09, 0.28);
    this.dmg?.update(da, new THREE.Vector3(h.point.x + 0.35, h.point.y + 0.3, h.point.z + 0.3), h.crit ? 1.05 : 0.8, 1.2);
  }
  /** Blitz und Aberration für die Farbkorrektur */
  grade(tau: number): { flash: number; aberration: number } {
    const k = this.h.crit ? 1 : 0.6;
    return { flash: 0.3 * k * pulse(tau, this.h.tau, 0.0001, 0.08), aberration: 6 * k * pulse(tau, this.h.tau, 0.0001, 0.3) };
  }
}

/** Ausfallschritt-Profil: steht bei x0, stößt zur Handlungszeit `at` auf x1 vor, kehrt bis `back` zurück. */
export function lungeX(a: number, at: number, x0: number, x1: number, back = 0.45): number {
  return x0 + (x1 - x0) * (ramp(a, at - 0.05, at, easeOutCubic) * (1 - ramp(a, at + 0.15, at + back)));
}
export function lungeBend(a: number, at: number, amount = 0.11): number {
  return amount * ramp(a, at - 0.05, at, easeOutCubic) * (1 - ramp(a, at + 0.12, at + 0.45)) - 0.06 * ramp(a, at - 0.25, at - 0.07) * (1 - ramp(a, at - 0.07, at - 0.02));
}
/** Rückstoß des Getroffenen */
export function recoil(a: number, at: number, dist = 0.45): number {
  return dist * easeOutCubic(Math.max(0, Math.min(1, (a - at) / 0.35))) * (a >= at ? 1 : 0);
}
