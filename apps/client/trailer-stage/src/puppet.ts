// claude:2026-10-24T10:20:00+02:00 — Trailer-Bühne: Puppen-Morphs für freigestellte 2D-Gemälde. Das Bild liegt auf einem
// Gitter; Verformer (Biegen, Lehnen, Atmen, Stauchen, Mantel-Schwung) laufen im Vertex-Shader. Dazu Treffer-Blitz, Frost-Überzug,
// Randlicht und Bodenkontakt über die unterste deckende Bildzeile.
import * as THREE from "three";

const VERT = /* glsl */ `
uniform float uH, uBend, uLean, uHip, uBreath, uChest, uSway, uTime;
uniform vec2 uScale, uCapeC, uCapeR;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  float h = uv.y;
  p.x *= uScale.x;
  p.y *= uScale.y;
  p.x += uBend * h * h * uH;
  p.x += uLean * max(0.0, h - uHip) * uH;
  float band = exp(-pow((h - uChest) / 0.14, 2.0));
  p.x *= 1.0 + uBreath * band;
  p.y += uBreath * band * uH * 0.15;
  float m = smoothstep(1.0, 0.0, length((uv - uCapeC) / uCapeR));
  p.x += m * uSway * (1.0 - h) * uH * 0.08;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
uniform float uFlash, uFrost, uOpacity, uRim, uTime, uDark;
uniform vec3 uTint, uRimColor, uFlashColor;
uniform vec2 uRimDir, uTexel;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec4 c = texture2D(map, vUv);
  // halbtransparente Freisteller-Säume tragen oft hellen Hintergrund mit: unter 0,3 verwerfen, darüber weich ausblenden
  if (c.a < 0.3) discard;
  c.a = smoothstep(0.3, 0.75, c.a);
  vec3 col = c.rgb * uTint * (1.0 - uDark);
  // Randlicht: wo in Lichtrichtung Transparenz beginnt
  float a2 = texture2D(map, vUv + uRimDir * uTexel * 10.0).a;
  float a3 = texture2D(map, vUv + uRimDir * uTexel * 22.0).a;
  float rim = clamp(c.a - min(a2, a3), 0.0, 1.0);
  col += min(uRimColor, vec3(1.0)) * rim * uRim * 0.35;
  // Frost: entsättigt, kalt, kristallines Glitzern
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 ice = vec3(l) * vec3(0.8, 0.95, 1.2) * 1.35 + vec3(0.04, 0.07, 0.11);
  float cell = hash(floor(vUv * 180.0));
  float sparkle = step(0.985, cell) * (0.5 + 0.5 * sin(uTime * 14.0 + cell * 60.0));
  col = mix(col, ice * 0.85 + sparkle * 0.9 * vec3(0.8, 0.95, 1.2), uFrost);
  col += uFrost * rim * vec3(0.5, 0.75, 1.0) * 0.3;
  col = mix(col, uFlashColor, uFlash);
  gl_FragColor = vec4(col, c.a * uOpacity);
}`;

export interface PuppetOpts {
  url: string;
  /** Höhe des Bildes in Welteinheiten */
  height: number;
  /** Bild spiegeln (Figur blickt dann in die andere Richtung) */
  mirror?: boolean;
  capeC?: [number, number];
  capeR?: [number, number];
  chest?: number;
  hip?: number;
}

export class Puppet {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  readonly shadow: THREE.Mesh;
  /** Abstand der untersten deckenden Zeile zum Bildrand (0..1), für Bodenkontakt */
  baseline = 0;
  width = 1;
  constructor(readonly opts: PuppetOpts, tex: THREE.Texture, img: HTMLImageElement) {
    const aspect = img.width / img.height;
    this.width = opts.height * aspect;
    this.baseline = findBaseline(img);
    const geo = new THREE.PlaneGeometry(this.width, opts.height, 18, 28);
    geo.translate(0, opts.height / 2 - this.baseline * opts.height, 0);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      uniforms: {
        map: { value: tex },
        uH: { value: opts.height },
        uBend: { value: 0 },
        uLean: { value: 0 },
        uHip: { value: opts.hip ?? 0.45 },
        uBreath: { value: 0 },
        uChest: { value: opts.chest ?? 0.68 },
        uSway: { value: 0 },
        uTime: { value: 0 },
        uScale: { value: new THREE.Vector2(1, 1) },
        uCapeC: { value: new THREE.Vector2(...(opts.capeC ?? [0.5, 0.35])) },
        uCapeR: { value: new THREE.Vector2(...(opts.capeR ?? [0.001, 0.001])) },
        uFlash: { value: 0 },
        uFlashColor: { value: new THREE.Color(1.0, 0.96, 0.9) },
        uFrost: { value: 0 },
        uOpacity: { value: 1 },
        uRim: { value: 0.0 },
        uRimColor: { value: new THREE.Color(1.4, 0.9, 0.55) },
        uRimDir: { value: new THREE.Vector2(1, 0.3) },
        uTexel: { value: new THREE.Vector2(1 / img.width, 1 / img.height) },
        uTint: { value: new THREE.Color(1, 1, 1) },
        uDark: { value: 0 },
      },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    if (opts.mirror) this.mesh.scale.x = -1;
    this.group.add(this.mesh);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width * 0.9, this.width * 0.32),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.75, toneMapped: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.005;
    this.group.add(this.shadow);
  }
  u(name: string): THREE.IUniform {
    return this.mat.uniforms[name]!;
  }
  /** Zylindrisches Billboard: die Figur dreht sich um die Hochachse zur Kamera. */
  face(cam: THREE.Vector3): void {
    const p = this.group.position;
    this.mesh.rotation.y = Math.atan2(cam.x - p.x, cam.z - p.z);
  }
}

/** Unterste Bildzeile mit deckenden Pixeln (Füße) als Anteil der Bildhöhe von unten. */
function findBaseline(img: HTMLImageElement): number {
  const c = document.createElement("canvas");
  const w = 256;
  const h = Math.round((256 * img.height) / img.width);
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let y = h - 1; y >= 0; y--) {
    let n = 0;
    for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3]! > 160) n++;
    if (n >= 3) return (h - 1 - y) / h;
  }
  return 0;
}

let shadowTex: THREE.Texture | null = null;
function shadowTexture(): THREE.Texture {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}
