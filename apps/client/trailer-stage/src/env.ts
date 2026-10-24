// claude:2026-10-24T09:00:00+02:00 — Trailer-Bühne: Kulisse als Projektion (Camera Mapping) und Atmosphäre.
// Jeder Bildpunkt der gemalten Kulisse wird entlang seines Sehstrahls aus der „Malerkamera“ auf den Boden (y = 0) oder eine
// zylindrische Rückwand gelegt. Aus der Malerkamera sieht das Bild exakt aus wie gemalt; jede andere Kamera bekommt echte
// Parallaxe zwischen Vordergrund-Boden und Hintergrund.
import * as THREE from "three";
import { rng } from "./anim";

export interface PainterCam {
  /** Augenhöhe der Malerkamera */
  eye: number;
  /** z-Position der Malerkamera (sie blickt nach −z) */
  z: number;
  /** Horizontzeile im Bild (v von unten, 0..1) */
  horizon: number;
  /** Bildzeile v = 0 trifft den Boden in dieser Entfernung */
  nearDist: number;
  /** Radius der Rückwand um die Malerkamera */
  wallDist: number;
}

export function buildBackdrop(tex: THREE.Texture, imgAspect: number, pc: PainterCam): THREE.Mesh {
  const F = (pc.horizon * pc.nearDist) / pc.eye; // Brennweite in Bildhöhen-Einheiten
  const NU = 160;
  const NV = 180;
  // claude:2026-10-24T10:24:00+02:00 — Rand: links/rechts 12 %, oben 12 %, unten 10 % gespiegelt angesetzt (MirroredRepeat), statt Schwarz am Bildrand
  const EU = 0.12;
  const EVT = 0.12;
  const EVB = 0.1;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  for (let j = 0; j <= NV; j++) {
    const v = -EVB + ((1 + EVB + EVT) * j) / NV;
    for (let i = 0; i <= NU; i++) {
      const u = -EU + ((1 + 2 * EU) * i) / NU;
      const X = ((u - 0.5) * imgAspect) / F;
      const Y = (v - pc.horizon) / F;
      const tWall = pc.wallDist / Math.sqrt(X * X + 1);
      const tGround = Y < 0 ? pc.eye / -Y : Infinity;
      const t = Math.min(tWall, tGround);
      pos.push(t * X, pc.eye + t * Y, pc.z - t);
      uvs.push(u, v);
    }
  }
  for (let j = 0; j < NV; j++) {
    for (let i = 0; i < NU; i++) {
      const a = j * (NU + 1) + i;
      const b = a + 1;
      const c = a + NU + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
  tex.needsUpdate = true;
  const img = tex.image as { width: number; height: number };
  const mat = new THREE.ShaderMaterial({
    vertexShader: BD_VERT,
    fragmentShader: BD_FRAG,
    side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uSize: { value: new THREE.Vector2(img.width, img.height) }, uTint: { value: new THREE.Color(1, 1, 1) } },
  });
  return new THREE.Mesh(geo, mat);
}

/** claude:2026-10-24T10:24:00+02:00 — Kulisse abdunkeln/einfärben (z. B. Gegenlicht-Silhouette) */
export function tintBackdrop(mesh: THREE.Mesh, r: number, g: number, b: number): void {
  ((mesh.material as THREE.ShaderMaterial).uniforms.uTint!.value as THREE.Color).setRGB(r, g, b);
}

// claude:2026-10-24T10:24:00+02:00 — bikubische Catmull-Rom-Abtastung (9 bilineare Zugriffe): bei Vergrößerung deutlich schärfer als bilinear
const BD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BD_FRAG = /* glsl */ `
uniform sampler2D map;
uniform vec2 uSize;
uniform vec3 uTint;
varying vec2 vUv;
vec4 catmullRom(vec2 uv){
  vec2 sp = uv * uSize;
  vec2 t1 = floor(sp - 0.5) + 0.5;
  vec2 f = sp - t1;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  vec2 w12 = w1 + w2;
  vec2 t0 = (t1 - 1.0) / uSize;
  vec2 t3 = (t1 + 2.0) / uSize;
  vec2 t12 = (t1 + w2 / w12) / uSize;
  vec4 c = texture2D(map, vec2(t0.x, t0.y)) * w0.x * w0.y
    + texture2D(map, vec2(t12.x, t0.y)) * w12.x * w0.y
    + texture2D(map, vec2(t3.x, t0.y)) * w3.x * w0.y
    + texture2D(map, vec2(t0.x, t12.y)) * w0.x * w12.y
    + texture2D(map, vec2(t12.x, t12.y)) * w12.x * w12.y
    + texture2D(map, vec2(t3.x, t12.y)) * w3.x * w12.y
    + texture2D(map, vec2(t0.x, t3.y)) * w0.x * w3.y
    + texture2D(map, vec2(t12.x, t3.y)) * w12.x * w3.y
    + texture2D(map, vec2(t3.x, t3.y)) * w3.x * w3.y;
  return max(c, 0.0);
}
void main(){
  gl_FragColor = vec4(catmullRom(vUv).rgb * uTint, 1.0);
}`;

/** Weich gezeichnete Kopie einer Textur (für Schärfentiefe in Nahaufnahmen). */
export function blurredTexture(img: HTMLImageElement | ImageBitmap, px: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = (img as HTMLImageElement).width;
  c.height = (img as HTMLImageElement).height;
  const ctx = c.getContext("2d")!;
  ctx.filter = `blur(${px}px)`;
  ctx.drawImage(img as CanvasImageSource, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const POINT_VERT = /* glsl */ `
attribute float aSize;
attribute vec4 aColor;
varying vec4 vColor;
uniform float uScale;
void main(){
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;
const POINT_FRAG = /* glsl */ `
varying vec4 vColor;
uniform float uSoft;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float a = smoothstep(1.0, uSoft, r);
  if (a <= 0.001) discard;
  gl_FragColor = vec4(vColor.rgb, vColor.a * a);
}`;

/** Punktwolke mit frei gesetzten Positionen/Farben/Größen je Bild (Asche, Glut, Nebel, Funken-Köpfe). */
export class PointCloud {
  readonly points: THREE.Points;
  readonly pos: Float32Array;
  readonly col: Float32Array;
  readonly size: Float32Array;
  constructor(readonly count: number, additive: boolean, soft = 0.0) {
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 4);
    this.size = new Float32Array(count);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(this.col, 4));
    geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1));
    const mat = new THREE.ShaderMaterial({
      vertexShader: POINT_VERT,
      fragmentShader: POINT_FRAG,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 1080 * 0.5 }, uSoft: { value: soft } },
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }
  /** Punktgröße in Weltmaßen: Pixel pro Welteinheit in Abstand 1 aus der Kamera-Brennweite. */
  setCamera(cam: THREE.PerspectiveCamera, heightPx = 1080): void {
    const s = heightPx / 2 / Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    ((this.points.material as THREE.ShaderMaterial).uniforms.uScale!.value as number) = s;
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale!.value = s;
  }
  commit(): void {
    const g = this.points.geometry;
    (g.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aColor") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aSize") as THREE.BufferAttribute).needsUpdate = true;
  }
}

/** Treibende Asche (fällt, driftet) und aufsteigende Glut in einem Kasten um die Szene; rein zeitabhängig, endlos. */
export class Atmosphere {
  readonly ash: PointCloud;
  readonly embers: PointCloud;
  private ashSeed: { x: number; y: number; z: number; s: number; ph: number; sp: number }[] = [];
  private emberSeed: { x: number; y: number; z: number; s: number; ph: number; sp: number }[] = [];
  constructor(
    private box: { x: [number, number]; y: [number, number]; z: [number, number] },
    nAsh = 700,
    nEmber = 140,
    seed = 7,
    private ashColor: [number, number, number] = [0.62, 0.6, 0.58],
    private emberColor: [number, number, number] = [2.4, 1.0, 0.35],
  ) {
    const r = rng(seed);
    this.ash = new PointCloud(nAsh, false, 0.2);
    this.embers = new PointCloud(nEmber, true, 0.0);
    for (let i = 0; i < nAsh; i++) this.ashSeed.push({ x: r(), y: r(), z: r(), s: 0.5 + r() * 1.6, ph: r() * 6.28, sp: 0.15 + r() * 0.35 });
    for (let i = 0; i < nEmber; i++) this.emberSeed.push({ x: r(), y: r(), z: r(), s: 0.6 + r() * 1.2, ph: r() * 6.28, sp: 0.25 + r() * 0.6 });
  }
  update(t: number, camZ: number, intensity = 1): void {
    const { x, y, z } = this.box;
    const H = y[1] - y[0];
    this.ashSeed.forEach((p, i) => {
      const yy = y[1] - (((p.y * H + t * p.sp) % H) + H) % H;
      const xx = x[0] + p.x * (x[1] - x[0]) + Math.sin(t * 0.7 + p.ph) * 0.35 + t * 0.12;
      const zz = z[0] + p.z * (z[1] - z[0]);
      this.ash.pos.set([((xx - x[0]) % (x[1] - x[0]) + (x[1] - x[0])) % (x[1] - x[0]) + x[0], yy, zz], i * 3);
      // Bokeh: nahe an der Kamera groß und weich
      const near = Math.max(0, 1 - (camZ - zz) / 2.2);
      const flick = 0.75 + 0.25 * Math.sin(t * 3 + p.ph);
      // claude:2026-10-24T10:24:00+02:00 — Asche dezenter: keine großen Bokeh-Flecken vor der Linse
      this.ash.col.set([this.ashColor[0], this.ashColor[1], this.ashColor[2], (0.32 - near * 0.3) * flick * intensity], i * 4);
      this.ash.size[i] = p.s * (0.03 + near * 0.012);
    });
    this.emberSeed.forEach((p, i) => {
      const yy = y[0] + (((p.y * H + t * p.sp) % H) + H) % H;
      const xx = x[0] + p.x * (x[1] - x[0]) + Math.sin(t * 1.3 + p.ph) * 0.25;
      const zz = z[0] + p.z * (z[1] - z[0]);
      this.embers.pos.set([xx, yy, zz], i * 3);
      const life = Math.sin(((((p.y * H + t * p.sp) % H) + H) % H) / H * Math.PI);
      const flick = 0.6 + 0.4 * Math.sin(t * 9 + p.ph * 3);
      this.embers.col.set([this.emberColor[0], this.emberColor[1], this.emberColor[2], life * flick * intensity], i * 4);
      this.embers.size[i] = p.s * 0.035;
    });
    this.ash.commit();
    this.embers.commit();
  }
}
