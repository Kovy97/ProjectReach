// claude:2026-10-24T10:30:00+02:00 — Trailer-Bühne: Effekte. Jeder Effekt ist eine reine Funktion seiner Handlungszeit
// (ballistisch mit Luftwiderstand, geschlossene Form), damit Unterframes und Zeitlupen exakt stimmen.
import * as THREE from "three";
import { clamp, easeOutCubic, rng, smooth } from "./anim";

// ── Texturen ─────────────────────────────────────────────────────────────────────────────────────
function canvasTex(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const TEX = {
  soft: () =>
    canvasTex(128, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, "rgba(255,255,255,1)");
      r.addColorStop(0.35, "rgba(255,255,255,0.45)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, s, s);
    }),
  streak: () =>
    canvasTex(64, (g, s) => {
      const r = g.createLinearGradient(0, 0, s, 0);
      r.addColorStop(0, "rgba(255,255,255,0)");
      r.addColorStop(0.75, "rgba(255,255,255,0.9)");
      r.addColorStop(1, "rgba(255,255,255,1)");
      g.fillStyle = r;
      g.beginPath();
      g.moveTo(0, s / 2);
      g.lineTo(s, s * 0.2);
      g.lineTo(s, s * 0.8);
      g.closePath();
      g.fill();
    }),
  ring: () =>
    canvasTex(256, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, s * 0.3, s / 2, s / 2, s / 2);
      r.addColorStop(0, "rgba(255,255,255,0)");
      r.addColorStop(0.72, "rgba(255,255,255,0)");
      r.addColorStop(0.9, "rgba(255,255,255,0.9)");
      r.addColorStop(0.95, "rgba(255,255,255,0.3)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, s, s);
    }),
  shard: () =>
    canvasTex(64, (g, s) => {
      g.fillStyle = "rgba(235,248,255,1)";
      g.beginPath();
      g.moveTo(0, s / 2);
      g.lineTo(s * 0.7, s * 0.3);
      g.lineTo(s, s / 2);
      g.lineTo(s * 0.7, s * 0.7);
      g.closePath();
      g.fill();
    }),
};

// ── Funken / Splitter als ausgerichtete Schweife ─────────────────────────────────────────────────
export interface BurstOpts {
  seed: number;
  count: number;
  origin: THREE.Vector3;
  /** Grundrichtung und Streuung (Kegel) */
  dir: THREE.Vector3;
  spread: number;
  speed: [number, number];
  life: [number, number];
  gravity: number;
  drag: number;
  /** Länge = Geschwindigkeit · stretch */
  stretch: number;
  width: number;
  /** Farbe über die Lebenszeit (HDR erlaubt) */
  colors: [THREE.Color, THREE.Color];
  additive?: boolean;
  tex?: THREE.Texture;
  /** Ausstoß über diese Zeit verteilen (Riser, Nebel); Standard fast gleichzeitig */
  emitOver?: number;
  /** zufälliger Versatz des Startpunkts je Achse (± Hälfte) */
  originSpread?: THREE.Vector3;
}

export class Burst {
  readonly mesh: THREE.InstancedMesh;
  private parts: { v: THREE.Vector3; life: number; delay: number; w: number; off: THREE.Vector3 }[] = [];
  private color = new THREE.Color();
  constructor(private o: BurstOpts) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(-0.5, 0, 0); // Kopf am Ursprung, Schweif nach hinten
    const mat = new THREE.MeshBasicMaterial({
      map: o.tex ?? TEX.streak(),
      transparent: true,
      depthWrite: false,
      blending: o.additive === false ? THREE.NormalBlending : THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, o.count);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(o.count * 3), 3);
    const r = rng(o.seed);
    const base = o.dir.clone().normalize();
    for (let i = 0; i < o.count; i++) {
      // zufällige Richtung im Kegel um base
      const u = r() * 2 - 1;
      const phi = r() * Math.PI * 2;
      const cone = new THREE.Vector3(Math.cos(phi) * Math.sqrt(1 - u * u), u, Math.sin(phi) * Math.sqrt(1 - u * u));
      const v = base.clone().lerp(cone, o.spread).normalize().multiplyScalar(o.speed[0] + r() * (o.speed[1] - o.speed[0]));
      const sp = o.originSpread;
      const off = sp ? new THREE.Vector3((r() - 0.5) * sp.x, (r() - 0.5) * sp.y, (r() - 0.5) * sp.z) : new THREE.Vector3();
      this.parts.push({ v, life: o.life[0] + r() * (o.life[1] - o.life[0]), delay: r() * (o.emitOver ?? 0.03), w: 0.6 + r() * 0.8, off });
    }
  }
  /** a = Handlungszeit seit Auslösung (s); cam = Kameraposition. */
  update(a: number, cam: THREE.Vector3): void {
    const o = this.o;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const vel = new THREE.Vector3();
    const toCam = new THREE.Vector3();
    const xA = new THREE.Vector3();
    const yA = new THREE.Vector3();
    const zA = new THREE.Vector3();
    this.parts.forEach((q, i) => {
      const t = a - q.delay;
      if (t < 0 || t > q.life) {
        m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, m);
        return;
      }
      const k = o.drag;
      const e = Math.exp(-k * t);
      // Position mit Luftwiderstand (geschlossen) und Schwerkraft
      const f = k > 0 ? (1 - e) / k : t;
      p.copy(o.origin).add(q.off).addScaledVector(q.v, f);
      p.y += 0.5 * o.gravity * t * t;
      vel.copy(q.v).multiplyScalar(e);
      vel.y += o.gravity * t;
      const sp = vel.length();
      xA.copy(vel).normalize();
      toCam.copy(cam).sub(p).normalize();
      yA.crossVectors(toCam, xA).normalize();
      zA.crossVectors(xA, yA);
      const len = Math.max(0.02, sp * o.stretch);
      const life = t / q.life;
      const w = o.width * q.w * (1 - life * 0.6);
      m.makeBasis(xA.multiplyScalar(len), yA.multiplyScalar(w), zA);
      m.setPosition(p);
      this.mesh.setMatrixAt(i, m);
      this.color.copy(o.colors[0]).lerp(o.colors[1], smooth(life)).multiplyScalar(1 - smooth((life - 0.6) / 0.4));
      this.mesh.setColorAt(i, this.color);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

// ── Leuchtpunkt / Schockwelle ────────────────────────────────────────────────────────────────────
export class Glow {
  readonly sprite: THREE.Sprite;
  constructor(color: THREE.Color, tex = TEX.soft()) {
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  }
  set(pos: THREE.Vector3, size: number, opacity: number): void {
    this.sprite.position.copy(pos);
    this.sprite.scale.set(size, size, 1);
    (this.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, opacity);
    this.sprite.visible = opacity > 0.001;
  }
}

export class Ring {
  readonly mesh: THREE.Mesh;
  constructor(color: THREE.Color, horizontal: boolean) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: TEX.ring(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    );
    if (horizontal) this.mesh.rotation.x = -Math.PI / 2;
  }
  /** a = Zeit seit Auslösung, dur = Dauer, maxR = Endradius */
  update(a: number, dur: number, maxR: number, pos: THREE.Vector3, cam?: THREE.Vector3, peak = 1): void {
    const k = a / dur;
    const vis = a >= 0 && k <= 1;
    this.mesh.visible = vis;
    if (!vis) return;
    const r = Math.max(0.01, maxR * easeOutCubic(k));
    this.mesh.position.copy(pos);
    this.mesh.scale.set(r * 2, r * 2, 1);
    if (cam) this.mesh.lookAt(cam);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = peak * (1 - smooth(k));
  }
}

// ── Schwerthieb-Bogen ────────────────────────────────────────────────────────────────────────────
const ARC_FRAG = /* glsl */ `
uniform float uHead, uTail, uAlpha;
uniform vec3 uCore, uEdge;
varying vec2 vUv;
void main(){
  float along = vUv.x;
  if (along > uHead || along < uTail) discard;
  float k = (along - uTail) / max(0.001, uHead - uTail);
  float across = abs(vUv.y - 0.5) * 2.0;
  float core = smoothstep(1.0, 0.0, across);
  vec3 col = mix(uEdge, uCore, core * core) * (0.25 + 0.75 * k);
  float a = core * smoothstep(0.0, 0.25, k) * uAlpha;
  gl_FragColor = vec4(col * a, a);
}`;
export class SlashArc {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  /** Bogen in der lokalen XY-Ebene: Mitte, Radius, Start-/Endwinkel, Breite */
  constructor(radius: number, a0: number, a1: number, width: number, core: THREE.Color, edge: THREE.Color) {
    const N = 48;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= N; i++) {
      const k = i / N;
      const ang = a0 + (a1 - a0) * k;
      const w = width * Math.sin(Math.PI * Math.min(1, k * 1.15)) + 0.01;
      for (const s of [-1, 1]) {
        const rr = radius + (s * w) / 2;
        pos.push(Math.cos(ang) * rr, Math.sin(ang) * rr, 0);
        uv.push(k, s < 0 ? 0 : 1);
      }
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: ARC_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uHead: { value: 0 }, uTail: { value: 0 }, uAlpha: { value: 1 }, uCore: { value: core }, uEdge: { value: edge } },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
  }
  /** a = Zeit seit Hiebbeginn; sweep = Dauer des Durchzugs; fade = Nachglühen */
  update(a: number, sweep: number, fade: number): void {
    const head = clamp(a / sweep);
    const tail = clamp((a - sweep * 0.35) / sweep) * 0.9 + clamp((a - sweep) / fade) * 0.1;
    this.mesh.visible = a > 0 && a < sweep + fade;
    this.mat.uniforms.uHead!.value = easeOutCubic(head);
    this.mat.uniforms.uTail!.value = tail;
    this.mat.uniforms.uAlpha!.value = 1 - smooth((a - sweep) / fade);
  }
}

// ── Blitz (Schock-Kette) ─────────────────────────────────────────────────────────────────────────
export class Bolt {
  readonly mesh: THREE.Mesh;
  private geo = new THREE.BufferGeometry();
  constructor(color: THREE.Color) {
    this.mesh = new THREE.Mesh(
      this.geo,
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }),
    );
    this.mesh.frustumCulled = false;
  }
  /** Neu zeichnen: Zickzack zwischen a und b, flackert in 30 Varianten pro Sekunde. */
  update(from: THREE.Vector3, to: THREE.Vector3, t: number, cam: THREE.Vector3, opacity: number, width = 0.05, seed = 1): void {
    this.mesh.visible = opacity > 0.01;
    if (!this.mesh.visible) return;
    const r = rng(seed * 1000 + Math.floor(t * 30));
    const pts: THREE.Vector3[] = [from.clone(), to.clone()];
    let jag = from.distanceTo(to) * 0.18;
    for (let lvl = 0; lvl < 5; lvl++) {
      const next: THREE.Vector3[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i]!;
        const b = pts[i + 1]!;
        const m = a.clone().lerp(b, 0.5);
        m.x += (r() - 0.5) * jag;
        m.y += (r() - 0.5) * jag;
        m.z += (r() - 0.5) * jag * 0.5;
        next.push(a, m);
      }
      next.push(pts[pts.length - 1]!);
      pts.splice(0, pts.length, ...next);
      jag *= 0.55;
    }
    const pos: number[] = [];
    const idx: number[] = [];
    const side = new THREE.Vector3();
    const dir = new THREE.Vector3();
    const view = new THREE.Vector3();
    pts.forEach((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)]!;
      const o = pts[Math.max(0, i - 1)]!;
      dir.copy(q).sub(o).normalize();
      view.copy(cam).sub(p).normalize();
      side.crossVectors(dir, view).normalize().multiplyScalar(width * (0.6 + 0.4 * Math.sin(i * 1.7)));
      pos.push(p.x - side.x, p.y - side.y, p.z - side.z, p.x + side.x, p.y + side.y, p.z + side.z);
      if (i < pts.length - 1) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    });
    this.geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    this.geo.setIndex(idx);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
  }
}

// ── Schadenszahl im Raum ─────────────────────────────────────────────────────────────────────────
export class DamageNumber {
  readonly sprite: THREE.Sprite;
  constructor(text: string, opts: { crit?: boolean } = {}) {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 256;
    const g = c.getContext("2d")!;
    g.font = `700 ${opts.crit ? 190 : 150}px Cinzel, Georgia, serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineJoin = "round";
    g.lineWidth = 22;
    g.strokeStyle = "rgba(10,6,4,0.95)";
    g.strokeText(text, 512, 132);
    const grad = g.createLinearGradient(0, 40, 0, 220);
    if (opts.crit) {
      grad.addColorStop(0, "#fff3c4");
      grad.addColorStop(0.5, "#ffb648");
      grad.addColorStop(1, "#e2552a");
    } else {
      grad.addColorStop(0, "#ffd9c9");
      grad.addColorStop(1, "#ff4d3d");
    }
    g.fillStyle = grad;
    g.fillText(text, 512, 132);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.sprite.renderOrder = 10;
  }
  /** a = Zeit seit Treffer; pos = Treffpunkt; size = Grundbreite */
  update(a: number, pos: THREE.Vector3, size: number, life = 1.1): void {
    const vis = a >= 0 && a < life;
    this.sprite.visible = vis;
    if (!vis) return;
    const punch = a < 0.08 ? 0.4 + (a / 0.08) * 1.0 : 1.4 - easeOutCubic((a - 0.08) / 0.22) * 0.4;
    const s = size * Math.max(0.4, punch);
    this.sprite.scale.set(s, s / 4, 1);
    this.sprite.position.set(pos.x, pos.y + 0.45 * easeOutCubic(a / life), pos.z + 0.3 * easeOutCubic(a / life));
    (this.sprite.material as THREE.SpriteMaterial).opacity = 1 - smooth((a - life * 0.7) / (life * 0.3));
  }
}
