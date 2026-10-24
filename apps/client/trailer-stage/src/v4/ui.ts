// claude:2026-10-24T12:05:00+02:00 — Trailer v4 „Inventar“: Bausteine für flache Tableaus (Steinhintergrund, Bild-Atlas,
// Kachel-Stapel, Textschilder) und die Zahlen-Einblendungen im Stil des Logos (knochenweißes Cinzel, rote Eisenlinie).
import * as THREE from "three";
import { easeOutCubic, ramp } from "../anim";
import { asset, loadImage } from "../assets";
import { load } from "../kit";
import type { Stage } from "../stage";

// ── Steinhintergrund: gekachelt (nie gestreckt), Texel etwa 1:1 bei Kamera z 10 / 30° ─────────────────
export async function stone(stage: Stage, w = 40, h = 24, z = -0.5, tilePx = 1024): Promise<THREE.Mesh> {
  const { tex } = await load(stage, "bg_tileable_stone_dark.webp");
  const t = tex.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const unitsPerTile = (tilePx / 1080) * 5.36;
  t.repeat.set(w / unitsPerTile, h / unitsPerTile);
  t.needsUpdate = true;
  // abgedunkelt: Inhalt und Einblendungen stehen vorn, der Stein ist nur Grund
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.42, 0.4, 0.38), toneMapped: false }));
  m.position.z = z;
  return m;
}

// ── Atlas: viele Bilder in einer Textur ─────────────────────────────────────────────────────────────
export interface Rect { u0: number; v0: number; u1: number; v1: number }
export interface Atlas { tex: THREE.Texture; rects: Rect[] }
export async function buildAtlas(paths: string[], tile: number, cols: number, trim = false): Promise<Atlas> {
  const rows = Math.ceil(paths.length / cols);
  const c = document.createElement("canvas");
  c.width = cols * tile;
  c.height = rows * tile;
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  const rects: Rect[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < paths.length) {
      const i = next++;
      const img = await loadImage(asset(paths[i]!));
      const x = (i % cols) * tile;
      const y = Math.floor(i / cols) * tile;
      const b = trim ? opaqueBox(img) : { x: 0, y: 0, w: img.width, h: img.height };
      const s = Math.min(tile / b.w, tile / b.h);
      const w = b.w * s;
      const h = b.h * s;
      g.drawImage(img, b.x, b.y, b.w, b.h, x + (tile - w) / 2, y + (tile - h) / 2, w, h);
      rects[i] = { u0: x / c.width, v0: 1 - (y + tile) / c.height, u1: (x + tile) / c.width, v1: 1 - y / c.height };
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex, rects };
}

/** Deckender Bereich eines Freistellers (Alpha > 40), mit 4 % Rand; quadratisch, damit Proportionen bleiben */
function opaqueBox(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const n = 128;
  const c = document.createElement("canvas");
  c.width = c.height = n;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, n, n);
  const d = g.getImageData(0, 0, n, n).data;
  let x0 = n, y0 = n, x1 = 0, y1 = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3]! > 40) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  if (x1 <= x0) return { x: 0, y: 0, w: img.width, h: img.height };
  const side = Math.max(x1 - x0, y1 - y0) * 1.08;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const sx = img.width / n;
  const sy = img.height / n;
  const half = side / 2;
  const bx = Math.max(0, cx - half);
  const by = Math.max(0, cy - half);
  return { x: bx * sx, y: by * sy, w: Math.min(n - bx, side) * sx, h: Math.min(n - by, side) * sy };
}

// ── Kachel-Stapel: viele Bildquadrate in einem Netz, je Kachel Ort, Größe, Helligkeit, Deckkraft ──────────
const BATCH_VERT = /* glsl */ `
attribute vec4 aCol;
varying vec2 vUv;
varying vec4 vCol;
void main(){ vUv = uv; vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const BATCH_FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uB;
varying vec2 vUv;
varying vec4 vCol;
void main(){
  vec4 c = texture2D(map, vUv);
  if (c.a * vCol.a < 0.01) discard;
  gl_FragColor = vec4(c.rgb * vCol.rgb * uB, c.a * vCol.a);
}`;
export class Batch {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  private uv: Float32Array;
  private col: Float32Array;
  constructor(readonly n: number, map: THREE.Texture) {
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(n * 12);
    this.uv = new Float32Array(n * 8);
    this.col = new Float32Array(n * 16);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2));
    geo.setAttribute("aCol", new THREE.BufferAttribute(this.col, 4));
    geo.setIndex(idx);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({ vertexShader: BATCH_VERT, fragmentShader: BATCH_FRAG, uniforms: { map: { value: map }, uB: { value: 1 } }, transparent: true, depthWrite: false }),
    );
    this.mesh.frustumCulled = false;
  }
  /** Gesamthelligkeit aller Kacheln */
  brightness(b: number): void {
    (this.mesh.material as THREE.ShaderMaterial).uniforms.uB!.value = b;
  }
  /** Kachel i: Mitte (x, y, z), Breite/Höhe, Ausschnitt, Helligkeit b, Deckkraft a */
  set(i: number, x: number, y: number, z: number, w: number, h: number, r: Rect, b = 1, a = 1): void {
    const hw = w / 2;
    const hh = h / 2;
    this.pos.set([x - hw, y - hh, z, x + hw, y - hh, z, x + hw, y + hh, z, x - hw, y + hh, z], i * 12);
    this.uv.set([r.u0, r.v0, r.u1, r.v0, r.u1, r.v1, r.u0, r.v1], i * 8);
    for (let k = 0; k < 4; k++) this.col.set([b, b, b, a], i * 16 + k * 4);
  }
  commit(): void {
    const g = this.mesh.geometry;
    (g.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("uv") as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute("aCol") as THREE.BufferAttribute).needsUpdate = true;
  }
}

// ── Textschild (Cinzel) als Fläche im Raum ──────────────────────────────────────────────────────────
export function label(text: string, opts: { px?: number; color?: string; height?: number; spacing?: number } = {}): THREE.Mesh {
  const px = opts.px ?? 64;
  const c = document.createElement("canvas");
  const g0 = c.getContext("2d")!;
  g0.font = `${px}px Cinzel, Georgia, serif`;
  g0.letterSpacing = `${opts.spacing ?? px * 0.08}px`;
  const w = Math.ceil(g0.measureText(text).width + px);
  c.width = w;
  c.height = Math.ceil(px * 1.6);
  const g = c.getContext("2d")!;
  g.font = `${px}px Cinzel, Georgia, serif`;
  g.letterSpacing = `${opts.spacing ?? px * 0.08}px`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.shadowColor = "rgba(0,0,0,0.9)";
  g.shadowBlur = px * 0.25;
  g.fillStyle = opts.color ?? "#e9e0cc";
  g.fillText(text, w / 2, c.height / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const h = opts.height ?? 0.2;
  return new THREE.Mesh(new THREE.PlaneGeometry((h * c.width) / c.height, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
}

// ── Zahlen-Einblendung ──────────────────────────────────────────────────────────────────────────────
/** Gerundet mit „+“: unter 100 exakt, 100–199 auf Zehner, ab 200 auf Fünfziger, ab 1.000 auf Hunderter (abgerundet). */
export function plus(n: number): string {
  const f = n < 100 ? n : n < 200 ? Math.floor(n / 10) * 10 : n < 1000 ? Math.floor(n / 50) * 50 : Math.floor(n / 100) * 100;
  return f === n ? f.toLocaleString("en-US") : `${f.toLocaleString("en-US")}+`;
}
export interface CaptionSpec {
  t0: number;
  t1: number;
  /** Zahl zählt beim Einsatz hoch; ohne Zahl nur Wort */
  value?: number;
  exact?: boolean;
  word: string;
  sub?: string;
  subAt?: number;
  pos?: "top" | "center" | "low";
}

/** Eine Bildschirm-Ebene vor der Kamera; zeigt die aktive Einblendung (Zeiten in Musikzeit τ). */
export class CaptionTrack {
  private c = document.createElement("canvas");
  private g: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private mesh: THREE.Mesh;
  private key = "";
  constructor(private specs: CaptionSpec[]) {
    this.c.width = 1920;
    this.c.height = 1080;
    this.g = this.c.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.c);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
    this.mesh.renderOrder = 999;
    this.mesh.frustumCulled = false;
  }
  attach(stage: Stage): void {
    if (!stage.camera.parent) stage.scene.add(stage.camera);
    stage.camera.add(this.mesh);
  }
  update(tau: number, stage: Stage): void {
    const cam = stage.camera;
    const d = 0.5;
    const h = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    this.mesh.position.set(0, 0, -d);
    this.mesh.scale.set(h * cam.aspect, h, 1);
    const s = this.specs.find((x) => tau >= x.t0 && tau < x.t1);
    if (!s) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    const lt = tau - s.t0;
    const inK = ramp(lt, 0, 0.18, easeOutCubic);
    const outK = 1 - ramp(tau, s.t1 - 0.12, s.t1);
    const count = s.value !== undefined ? ramp(lt, 0, 0.45, easeOutCubic) : 1;
    const subK = s.sub ? ramp(tau, s.subAt ?? s.t0 + 0.25, (s.subAt ?? s.t0 + 0.25) + 0.25, easeOutCubic) : 0;
    const key = [s.word, Math.round(count * 400), Math.round(inK * 40), Math.round(outK * 40), Math.round(subK * 40)].join("|");
    if (key === this.key) return;
    this.key = key;
    this.draw(s, count, inK * outK, subK * outK);
  }
  private draw(s: CaptionSpec, count: number, a: number, subA: number): void {
    const g = this.g;
    g.clearRect(0, 0, 1920, 1080);
    const y = s.pos === "center" ? 520 : s.pos === "low" ? 900 : 150;
    let num = "";
    if (s.value !== undefined) num = count >= 1 ? (s.exact ? s.value.toLocaleString("en-US") : plus(s.value)) : Math.round(s.value * count).toLocaleString("en-US");
    g.save();
    g.globalAlpha = a;
    // dunkler, weicher Halt hinter dem Text (lesbar auch über dichten Rastern)
    const band = g.createRadialGradient(960, y - 30, 40, 960, y - 30, 760);
    band.addColorStop(0, "rgba(6,5,4,0.62)");
    band.addColorStop(0.55, "rgba(6,5,4,0.4)");
    band.addColorStop(1, "rgba(6,5,4,0)");
    g.fillStyle = band;
    g.save();
    g.translate(960, y - 30);
    g.scale(1, s.sub ? 0.32 : 0.24);
    g.translate(-960, -(y - 30));
    g.fillRect(0, y - 800, 1920, 1600);
    g.restore();
    g.textBaseline = "alphabetic";
    g.textAlign = "left";
    // Zahl groß, Wort kleiner und gesperrt, zusammen mittig
    g.font = "128px Cinzel, Georgia, serif";
    g.letterSpacing = "2px";
    const wNum = num ? g.measureText(num + " ").width : 0;
    g.font = "84px Cinzel, Georgia, serif";
    g.letterSpacing = "10px";
    const wWord = g.measureText(s.word).width;
    const x0 = 960 - (wNum + wWord) / 2;
    const fill = g.createLinearGradient(0, y - 110, 0, y + 10);
    fill.addColorStop(0, "#f6efe0");
    fill.addColorStop(1, "#c9b996");
    g.shadowColor = "rgba(0,0,0,0.9)";
    g.shadowBlur = 22;
    g.lineWidth = 7;
    g.strokeStyle = "rgba(12,9,7,0.85)";
    g.fillStyle = fill;
    if (num) {
      g.font = "128px Cinzel, Georgia, serif";
      g.letterSpacing = "2px";
      g.strokeText(num, x0, y);
      g.fillText(num, x0, y);
    }
    g.font = "84px Cinzel, Georgia, serif";
    g.letterSpacing = "10px";
    g.strokeText(s.word, x0 + wNum, y);
    g.fillText(s.word, x0 + wNum, y);
    // rote Eisenlinie wie im Logo
    g.shadowBlur = 0;
    const lw = (wNum + wWord) * 0.55 * a;
    g.fillStyle = "rgba(150,22,26,0.95)";
    g.fillRect(960 - lw / 2, y + 22, lw, 3);
    g.fillStyle = "rgba(230,220,200,0.35)";
    g.fillRect(960 - lw / 2, y + 26, lw, 1);
    if (s.sub && subA > 0) {
      g.globalAlpha = subA;
      g.font = "40px Cinzel, Georgia, serif";
      g.letterSpacing = "6px";
      g.textAlign = "center";
      g.shadowColor = "rgba(0,0,0,0.9)";
      g.shadowBlur = 14;
      g.fillStyle = "#ddd2bb";
      g.fillText(s.sub, 960, y + 80);
    }
    g.restore();
    this.tex.needsUpdate = true;
  }
}
