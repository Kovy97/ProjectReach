// claude:2026-10-24T10:05:00+02:00 — Trailer-Bühne: Renderer, Kamera und Bild-Pipeline (Bloom → Unterframe-Akkumulation für echte
// Bewegungsunschärfe → Farbkorrektur mit Vignette, Korn, Blitz, Abblende). Gerendert wird Bild für Bild, nie in Echtzeit.
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export const WIDTH = 1920;
export const HEIGHT = 1080;

export interface Grade {
  exposure: number;
  saturation: number;
  contrast: number;
  /** warme Lichter / kühle Schatten, 0..1 */
  split: number;
  vignette: number;
  grain: number;
  /** additiver Weißblitz 0..1 */
  flash: number;
  /** Abblende auf Schwarz 0..1 */
  fade: number;
  /** chromatische Aberration in Pixeln */
  aberration: number;
  bloom: number;
  /** Farbton der Lichter (für Frost: kühler) */
  tint: [number, number, number];
}

export const DEFAULT_GRADE: Grade = {
  exposure: 1,
  saturation: 0.92,
  contrast: 1.08,
  split: 0.5,
  vignette: 0.55,
  grain: 0.045,
  flash: 0,
  fade: 0,
  aberration: 0,
  bloom: 0.35,
  tint: [1, 1, 1],
};

export interface TrailerScene {
  id: string;
  /** Länge in Sekunden (Musikzeit) */
  duration: number;
  /** Startpunkt im Track settings.mp3 */
  audioStart: number;
  setup(stage: Stage): Promise<void>;
  /** setzt alles für die Musikzeit τ (rein, ohne Zustand) */
  update(tau: number, stage: Stage): void;
  grade(tau: number): Partial<Grade>;
}

const GRADE_FRAG = /* glsl */ `
uniform sampler2D tAcc;
uniform vec2 uRes;
uniform float uSeed, uExposure, uSat, uContrast, uSplit, uVignette, uGrain, uFlash, uFade, uAberr;
uniform vec3 uTint;
varying vec2 vUv;
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
void main(){
  vec2 d = (vUv-0.5);
  vec2 off = d * uAberr / uRes * 2.0;
  vec3 c;
  c.r = texture2D(tAcc, vUv + off).r;
  c.g = texture2D(tAcc, vUv).g;
  c.b = texture2D(tAcc, vUv - off).b;
  c *= uExposure * uTint;
  c = aces(c * 1.15);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContrast + 0.5;
  // Split-Toning: warme Lichter, kühle Schatten
  vec3 warm = vec3(1.06, 1.0, 0.9), cool = vec3(0.9, 0.97, 1.08);
  c *= mix(vec3(1.0), mix(cool, warm, smoothstep(0.15, 0.75, l)), uSplit);
  float v = smoothstep(0.85, 0.2, length(d * vec2(1.0, 0.82)));
  c *= mix(1.0, v, uVignette);
  c += uFlash;
  c = clamp(c, 0.0, 1.0);
  c = toSRGB(c);
  float g = hash(vUv * uRes + uSeed) - 0.5;
  c += g * uGrain;
  c *= 1.0 - uFade;
  gl_FragColor = vec4(c, 1.0);
}`;

const QUAD_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, WIDTH / HEIGHT, 0.05, 200);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private acc: THREE.WebGLRenderTarget;
  private accScene = new THREE.Scene();
  private accMat: THREE.MeshBasicMaterial;
  private gradeScene = new THREE.Scene();
  private gradeMat: THREE.ShaderMaterial;
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private loader = new THREE.TextureLoader();
  /** für Billboards: aktuelle Kameraposition */
  readonly camPos = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(WIDTH, HEIGHT, false);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.scene.background = new THREE.Color(0x000000);

    const rt = () => new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt());
    this.composer.renderToScreen = false;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(WIDTH, HEIGHT), 0.35, 0.42, 1.0);
    this.composer.addPass(this.bloom);

    this.acc = new THREE.WebGLRenderTarget(WIDTH, HEIGHT, { type: THREE.FloatType });
    this.accMat = new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false });
    this.accScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.accMat));

    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERT,
      fragmentShader: GRADE_FRAG,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tAcc: { value: this.acc.texture },
        uRes: { value: new THREE.Vector2(WIDTH, HEIGHT) },
        uSeed: { value: 0 },
        uExposure: { value: 1 },
        uSat: { value: 1 },
        uContrast: { value: 1 },
        uSplit: { value: 0.5 },
        uVignette: { value: 0.5 },
        uGrain: { value: 0.04 },
        uFlash: { value: 0 },
        uFade: { value: 0 },
        uAberr: { value: 0 },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
      },
    });
    this.gradeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.gradeMat));
  }

  async texture(url: string, srgb = true): Promise<THREE.Texture> {
    const tex = await this.loader.loadAsync(url);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }

  /** Ein Ausgabebild: `sub` Unterframes über den Verschluss (Anteil `shutter` des Bildabstands) mitteln. */
  renderFrame(scene: TrailerScene, tau: number, frame: number, fps = 60, sub = 4, shutter = 0.5): void {
    const r = this.renderer;
    r.setRenderTarget(this.acc);
    r.setClearColor(0x000000, 1);
    r.clear();
    for (let k = 0; k < sub; k++) {
      const t = tau + ((k + 0.5) / sub - 0.5) * (shutter / fps);
      scene.update(Math.max(0, t), this);
      this.camPos.copy(this.camera.position);
      const g = { ...DEFAULT_GRADE, ...scene.grade(Math.max(0, t)) };
      this.bloom.strength = g.bloom;
      this.composer.render();
      this.accMat.map = this.composer.readBuffer.texture;
      this.accMat.opacity = 1 / sub;
      this.accMat.needsUpdate = true;
      r.setRenderTarget(this.acc);
      r.autoClear = false;
      r.render(this.accScene, this.quadCam);
      r.autoClear = true;
    }
    const g = { ...DEFAULT_GRADE, ...scene.grade(tau) };
    const u = this.gradeMat.uniforms;
    u.uSeed!.value = (frame * 7.13) % 97;
    u.uExposure!.value = g.exposure;
    u.uSat!.value = g.saturation;
    u.uContrast!.value = g.contrast;
    u.uSplit!.value = g.split;
    u.uVignette!.value = g.vignette;
    u.uGrain!.value = g.grain;
    u.uFlash!.value = g.flash;
    u.uFade!.value = g.fade;
    u.uAberr!.value = g.aberration;
    (u.uTint!.value as THREE.Vector3).set(g.tint[0], g.tint[1], g.tint[2]);
    r.setRenderTarget(null);
    r.render(this.gradeScene, this.quadCam);
  }
}
