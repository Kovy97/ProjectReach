/**
 * 0.4.0-Arena, Scene-Builder-Welle (Chef-Auftrag "Arena-Scene-Builder", s. design/ für den vollen
 * Auftrag): reine, three.js-lastige aber PROPS-/GAME-STATE-freie Bausteine, die sowohl
 * `Arena25DStage.tsx` (der echte Kampf-Renderer) ALS AUCH `builder/` (das neue Dev-Werkzeug zum
 * Platzieren von Props) identisch brauchen — Kamera-/Boden-/Kulissen-Geometrie, Sonnen-/
 * Fülllicht-Herleitung, Farb-Grade-Filter, Fuß-Baseline-Messung und der Prop-Billboard-Aufbau
 * selbst. Vorher lebte all das ausschließlich in Arena25DStage.tsx (Task #330/#330c/0.4.0-Arena
 * Welle 1) — hierher VERSCHOBEN (nicht neu erfunden, s. Git-Historie dieser Datei für die
 * 1:1-Herkunft jeder Funktion/Konstante), damit der Scene-Builder exakt dieselbe Optik zeigt wie
 * der echte Kampf ("WYSIWYG im echten Renderer", Chef-Zitat) — kein zweiter, potenziell
 * driftender Nachbau derselben Zahlen/Formeln.
 *
 * Arena25DStage.tsx importiert diese Konstanten/Funktionen jetzt statt sie lokal zu duplizieren —
 * s. dortige Import-Zeile. Fighter-/Choreografie-/Combat-Log-Logik bleibt bewusst NICHT hier (die
 * ist Arena25DStage-exklusiv, der Builder kennt keine Kämpfer, nur eine Referenz-Overlay-Anzeige
 * ihrer Standplätze, s. `PLAYER_X`/`MONSTER_X`/`PLAYER_Z`/`MONSTER_Z` unten).
 */
import * as THREE from "three";
import type { PropPlaceholderKind, ZoneManifestBackdropLayout, ZoneManifestLighting, ZoneManifestProp } from "./manifest";
import { makePlaceholderPropTexture, resolveArenaAssetUrl } from "./assets";

// ── Renderer/Kamera (Task #330c Punkt 1, #330d Punkt 1) ─────────────────────────────────────────
export const DPR_CAP = 1.25;
export const CAMERA_FOV = 40;
export const CAMERA_Y = 9.6;
export const CAMERA_Z = 16.7;
export const CAMERA_LOOKAT_Y = 0.9;
export const CAMERA_LOOKAT_Z = 1.6;
/** 1920×1080 ist die Referenz, für die `GROUND_WORLD_WIDTH` kalibriert ist — s. Arena25DStage.tsx
 *  `resize()`-JSDoc für die volle Herleitung des `aspect/REFERENCE_ASPECT`-Skalierungsfaktors. */
export const REFERENCE_ASPECT = 1920 / 1080;

// ── Boden/Kulisse (Task #330c Punkt 2/3, Welle-2-Rock-Skirt) ────────────────────────────────────
export const FLOOR_CENTER_Z = 6.4;
export const GROUND_WORLD_WIDTH = 18;
export const GROUND_WORLD_DEPTH = 9.5;
export const SKIRT_WORLD_WIDTH = 90;
export const SKIRT_WORLD_DEPTH = 60;
export const SKIRT_REPEAT_X = SKIRT_WORLD_WIDTH / GROUND_WORLD_WIDTH;
export const SKIRT_REPEAT_Z = SKIRT_WORLD_DEPTH / GROUND_WORLD_DEPTH;
/* Chef-Experiment 04.08. (Pastures-Workflow, Iteration 1): Kulisse auf DOPPELTE Distanz hinter
   die Kampf-Mitte geschoben („100% weiter nach hinten") → deutlich mehr sichtbarer Ground Floor
   zwischen Kämpfern und Horizont; der Rock-Skirt (gekachelte Bodenkopie) füllt die neue Fläche.
   Höhe von 9 auf 12.2 angehoben, damit der Horizont trotz größerer Entfernung auf ähnlicher
   Bildhöhe bleibt (Kamera-Distanz wächst ~1.35×). Vorher: HEIGHT 9, Z = CENTER − DEPTH/2 − 0.2. */
export const BACKDROP_HEIGHT = 12.2;
export const BACKDROP_Z = FLOOR_CENTER_Z - GROUND_WORLD_DEPTH - 0.4;
export const BACKDROP_CURVE_RADIUS = 28;
export const BACKDROP_CURVE_SEGMENTS = 28;

/** Vollständig aufgelöste Kulissen-Platzierung — jedes Feld garantiert gesetzt (anders als das
 *  optionale Manifest-Gegenstück `ZoneManifestBackdropLayout`, s. manifest.ts). */
export interface ResolvedBackdropLayout {
  z: number;
  height: number;
  widthScale: number;
  yOffset: number;
}

/**
 * Chef-Auftrag 05.08. ("mehr Kontrolle über den Backdrop"): löst den optionalen `backdropLayout`-
 * Manifest-Block gegen die bisherigen Code-Konstanten auf — EINE gemeinsame Stelle für Kampf-
 * Renderer (`Arena25DStage.tsx`) UND Scene-Builder (`builder/BuilderScene.ts`), damit beide bei
 * fehlendem/teilweisem Block garantiert auf IDENTISCHE Defaults fallen (kein Drift). Ein Manifest
 * ohne Block ⇒ exakt die Werte von vor diesem Feature (Pastures-Experiment-Stand 04.08. ist der
 * Konstanten-Stand und bleibt der Default).
 */
export function resolveBackdropLayout(layout: ZoneManifestBackdropLayout | undefined): ResolvedBackdropLayout {
  return {
    z: layout?.z ?? BACKDROP_Z,
    height: layout?.height ?? BACKDROP_HEIGHT,
    widthScale: layout?.widthScale ?? 1,
    yOffset: layout?.yOffset ?? 0,
  };
}

// ── Kämpfer-Referenzpositionen (Arena25DStage.tsx PLAYER_X/MONSTER_X/PLAYER_Z/MONSTER_Z) — der
//    Builder zeigt diese nur als optionales Referenz-Overlay (Dummies), rührt sie nie an. ─────────
export const PLAYER_X = -2.4;
export const MONSTER_X = 2.4;
export const PLAYER_Z = 6.2;
export const MONSTER_Z = 6.2;

// ── Props (0.4.0-Arena Welle 1) ──────────────────────────────────────────────────────────────────
/** Basishöhe (Weltraum-Einheiten) für Props bei `scale: 1` im Manifest. */
export const PROP_BASE_HEIGHT = 2.6;

// ── Licht-Herleitung (0.4.0-Arena Welle 1) ───────────────────────────────────────────────────────
/** Distanz der Sonne vom Zielpunkt — für ein `DirectionalLight` zählt nur die Richtung, s.
 *  `deriveSunOffset`. Reproduziert exakt die alte Task-#330d-Hartcodierung, s. Arena25DStage.tsx-
 *  Historie für die volle Rückrechnung. */
export const SUN_DISTANCE = 14.53;
/** HemisphereLight-Bodenfarbe (warmer Bounce) — bewusst KEIN Manifest-Feld (Schema hat nur EINE
 *  `ambientColor`), reproduziert den alten Task-#330d-Wert unverändert für alle Zonen. */
export const FILL_GROUND_COLOR = 0x4a3620;

/**
 * Elevation (`angleDeg`, 0=Horizont/90=Zenit) + Azimut (`azimuthDeg`, 0=von der Kamera-Seite,
 * s. manifest.ts `ZoneManifestLighting.sunAzimuthDeg`-JSDoc) → Richtungs-Offset relativ zu
 * `sun.target`. Kugelkoordinaten mit y=Elevation, (x,z) aus Azimut um die Y-Achse.
 */
export function deriveSunOffset(angleDeg: number, azimuthDeg: number): THREE.Vector3 {
  const elevRad = (angleDeg * Math.PI) / 180;
  const azRad = (azimuthDeg * Math.PI) / 180;
  const y = SUN_DISTANCE * Math.sin(elevRad);
  const r = SUN_DISTANCE * Math.cos(elevRad);
  const x = r * Math.sin(azRad);
  const z = r * Math.cos(azRad);
  return new THREE.Vector3(x, y, z);
}

/**
 * Billiger Farb-Grade als CSS-`filter` auf dem `<canvas>`-Element (kein Post-Processing-Pass) —
 * `saturate`/`hue-rotate`/`brightness`. `temperature` ist eine grobe Stimmungs-Annäherung über
 * `hue-rotate` (keine physikalische Farbtemperatur).
 */
export function buildGradeFilter(grade: ZoneManifestLighting["grade"]): string {
  const saturatePct = Math.max(0, grade.saturation) * 100;
  const hueDeg = -grade.temperature * 20;
  const brightnessPct = (1 + (grade.lift ?? 0) * 0.3) * 100;
  return `saturate(${saturatePct}%) hue-rotate(${hueDeg}deg) brightness(${brightnessPct}%)`;
}

/**
 * Task #330c Punkt 2 (Chef: "Backdrop curven wie ein Curved-Monitor"): baut einen vertikalen
 * Zylinder-Ausschnitt statt einer flachen Plane, per Hand aufgebaute BufferGeometry (volle
 * Kontrolle über Normalen/Winding/UV). Kreis in der XZ-Ebene, Mittelpunkt der Kurve (θ=0) liegt
 * exakt auf lokalem z=0 — die Enden (θ=±halfArc) biegen sich Richtung +z (zur Kamera) vor. UV
 * folgt exakt der PlaneGeometry-Konvention (u:0..1 links→rechts, v:0..1 unten→oben).
 */
export function buildCurvedBackdropGeometry(width: number, height: number, radius: number, segments: number): THREE.BufferGeometry {
  const halfArc = Math.asin(Math.min(0.96, width / 2 / radius));
  const cols = segments + 1;
  const positions = new Float32Array(cols * 2 * 3);
  const normals = new Float32Array(cols * 2 * 3);
  const uvs = new Float32Array(cols * 2 * 2);
  for (let i = 0; i < cols; i++) {
    const f = i / segments;
    const theta = -halfArc + f * (2 * halfArc);
    const sinT = Math.sin(theta);
    const cosT = Math.cos(theta);
    const x = radius * sinT;
    const zLocal = radius * (1 - cosT);
    const nx = -sinT;
    const nz = cosT;
    for (let row = 0; row < 2; row++) {
      const vi = (i * 2 + row) * 3;
      const y = row === 0 ? -height / 2 : height / 2;
      positions[vi] = x;
      positions[vi + 1] = y;
      positions[vi + 2] = zLocal;
      normals[vi] = nx;
      normals[vi + 1] = 0;
      normals[vi + 2] = nz;
      const ui = (i * 2 + row) * 2;
      uvs[ui] = f;
      uvs[ui + 1] = row;
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c2 = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(indices);
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  return geo;
}

/** Weicher elliptischer Kontaktschatten unter einer Figur/einem Prop — echte Boden-Textur statt
 *  CSS-Gradient (s. Arena25DStage.tsx-Historie Welle 2 Punkt 2 für die Opazitäts-/Falloff-Feinjustage). */
export function makeShadowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, "rgba(8,7,4,0.32)");
  grad.addColorStop(0.35, "rgba(8,7,4,0.24)");
  grad.addColorStop(0.78, "rgba(8,7,4,0.08)");
  grad.addColorStop(1, "rgba(8,7,4,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

/** Task #330c Punkt 4: Radial-Gradient-Glow, additiv geblendet — kein Asset, ein Sprite. */
export function makeSunGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,244,214,0.95)");
  grad.addColorStop(0.35, "rgba(255,217,160,0.55)");
  grad.addColorStop(1, "rgba(255,217,160,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

// ── Fuß-Baseline-Messung (Task #330b-Nachtrag) ───────────────────────────────────────────────────
export interface SpriteBaseline {
  /** Anteil der Bildhöhe (0..1), der von der UNTEREN PNG-Kante aus komplett transparent ist. */
  insetFrac: number;
  /** Horizontale Spanne der nicht-transparenten Pixel innerhalb der untersten Fuß-Region. */
  footSpanFrac: number;
  /** Horizontales Zentrum dieser Fuß-Region (0.5 = Bildmitte). */
  footCenterFrac: number;
}

const spriteBaselineCache = new Map<string, SpriteBaseline>();

/** Sucht die TATSÄCHLICH unterste Pixelzeile mit nennenswertem Alpha (statt die PNG-Bildkante
 *  anzunehmen) — einmalig pro Bild-URL gecacht. Generisch über jede Sprite-Quelle (Kämpfer UND
 *  Props) — keine Hardcode-Offsets pro Bild. */
export function measureSpriteBaseline(img: HTMLImageElement, url: string): SpriteBaseline {
  const cached = spriteBaselineCache.get(url);
  if (cached) return cached;
  const fallback: SpriteBaseline = { insetFrac: 0, footSpanFrac: 0.55, footCenterFrac: 0.5 };
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return fallback;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    ctx.drawImage(img, 0, 0, w, h);
    const ALPHA_THRESHOLD = 16;
    const data = ctx.getImageData(0, 0, w, h).data;
    let baselineRow = -1;
    for (let y = h - 1; y >= 0; y--) {
      const rowStart = y * w * 4;
      let hit = false;
      for (let x = 0; x < w; x++) {
        if (data[rowStart + x * 4 + 3]! > ALPHA_THRESHOLD) {
          hit = true;
          break;
        }
      }
      if (hit) {
        baselineRow = y;
        break;
      }
    }
    if (baselineRow < 0) return fallback;
    const insetFrac = (h - 1 - baselineRow) / h;
    const bandRows = Math.max(1, Math.round(h * 0.08));
    let left = w;
    let right = -1;
    for (let y = baselineRow; y > baselineRow - bandRows && y >= 0; y--) {
      const rowStart = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (data[rowStart + x * 4 + 3]! > ALPHA_THRESHOLD) {
          if (x < left) left = x;
          if (x > right) right = x;
        }
      }
    }
    const result: SpriteBaseline =
      right >= left
        ? { insetFrac, footSpanFrac: Math.max(0.12, (right - left) / w), footCenterFrac: (left + right) / 2 / w }
        : { ...fallback, insetFrac };
    spriteBaselineCache.set(url, result);
    return result;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[a25-debug] measureSpriteBaseline THREW for ${url}:`, err);
    return fallback;
  }
}

// ── Prop-Billboard-Layer (0.4.0-Arena Welle 1, erweitert um rotDeg/flat für den Scene-Builder) ──
/** Ein statisches, rein dekoratives Prop-Billboard aus einem Manifest-Eintrag. */
export interface PropInstance {
  mesh: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  shadow: THREE.Mesh;
}

/**
 * Gemeinsame Größen-/Positions-/Rotationslogik für Fern- (Bild geladen) und Sofort-Pfad
 * (Platzhalter) — identische Formeln wie im Kämpfer-Billboard (Baseline-Fußoffset, Fuß-Zentrum-
 * Offset, Kontaktschatten-Ellipse). `def.flip` spiegelt per negativer X-Skalierung.
 *
 * Scene-Builder-Erweiterung (`rotDeg`/`flat`, additiv zum bisherigen Schema — s. manifest.ts):
 * - Stehend (Default, `flat` falsch/fehlt): das Billboard yawt Richtung Kamera (wie bisher, jetzt
 *   HIER statt separat bei der Objekt-Erzeugung berechnet, s. `makePropInstance`), `rotDeg` rollt
 *   danach zusätzlich um die (nach dem Yaw fast blickachsen-parallele) lokale Z-Achse — "Billboard-
 *   Neigung um die Blickachse" (Chef-Auftrag wörtlich), z.B. ein schräg stehender Grabstein.
 * - Flach (`flat: true`, Boden-Clutter): das Billboard wird um die Welt-X-Achse gekippt (Normale
 *   zeigt nach oben statt zur Kamera) und liegt knapp über dem Boden — `rotDeg` dreht es dann um
 *   die (jetzt vertikale) Welt-Y-Achse, wie ein gedrehter Teppich. Der eigene Kontaktschatten wird
 *   ausgeblendet (das Objekt IST bereits auf dem Boden, kein zusätzlicher Schlagschatten nötig).
 */
export function applyPropTransform(
  mesh: THREE.Mesh,
  shadow: THREE.Mesh,
  def: ZoneManifestProp,
  propHeight: number,
  aspect: number,
  baseline: SpriteBaseline,
  camera: THREE.Camera,
): void {
  const baseWidth = propHeight * aspect;
  mesh.scale.set(def.flip ? -baseWidth : baseWidth, propHeight, 1);
  const footCenterOffsetX = (baseline.footCenterFrac - 0.5) * baseWidth;
  const rotRad = THREE.MathUtils.degToRad(def.rotDeg ?? 0);
  if (def.flat) {
    const tip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotRad);
    mesh.quaternion.copy(spin).multiply(tip);
    mesh.position.set(def.x + footCenterOffsetX, 0.015, def.z);
  } else {
    const feetOffset = -baseline.insetFrac * propHeight;
    const dxCam = camera.position.x - (def.x + footCenterOffsetX);
    const dzCam = camera.position.z - def.z;
    mesh.rotation.set(0, Math.atan2(dxCam, dzCam), 0);
    mesh.rotateZ(rotRad);
    mesh.position.set(def.x + footCenterOffsetX, feetOffset, def.z);
  }
  const shadowWidth = baseWidth * baseline.footSpanFrac * 1.15;
  shadow.scale.set(shadowWidth, 1, shadowWidth * 0.42);
  shadow.position.set(def.x + footCenterOffsetX, 0.01, def.z);
  shadow.visible = !def.flat;
}

/**
 * Baut EIN Prop-Billboard. Tiefensortierung MIT den Kämpfern ist GRATIS (dieselbe alphaTest-
 * Cutout-Strategie lässt den normalen WebGL-Z-Buffer korrekt sortieren, kein manuelles
 * `renderOrder`). `camera` wird nur für den initialen Yaw gebraucht (s. `applyPropTransform`) — der
 * Scene-Builder ruft `applyPropTransform` zusätzlich bei JEDER interaktiven Änderung (Drag/Skalieren/
 * Rotieren/Flach-Toggle) erneut auf, ohne die Textur neu zu laden.
 */
export function makePropInstance(def: ZoneManifestProp, camera: THREE.Camera): PropInstance {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.translate(0, 0.5, 0); // Pivot am Fuß, wie bei den Kämpfer-Billboards
  const material = new THREE.MeshStandardMaterial({
    transparent: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide,
    roughness: 1,
    metalness: 0,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geometry, material);

  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ map: makeShadowTexture(), transparent: true, depthWrite: false });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);

  const propHeight = PROP_BASE_HEIGHT * def.scale;
  const resolvedUrl = resolveArenaAssetUrl(def.file);
  if (resolvedUrl) {
    new THREE.TextureLoader().load(resolvedUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      material.map = tex;
      material.needsUpdate = true;
      const img = tex.image as HTMLImageElement | undefined;
      if (img?.width && img.height) {
        const aspect = img.width / img.height;
        const baseline = measureSpriteBaseline(img, resolvedUrl);
        applyPropTransform(mesh, shadow, def, propHeight, aspect, baseline, camera);
      }
    });
  } else {
    // Mira-Datei noch nicht geliefert (Auto-Discovery-Treffer 0) — prozedurale Silhouette statt
    // eines fehlenden/kaputten Bildes, s. assets.ts Modul-JSDoc Punkt 2 + TODO-Marker im Manifest.
    const placeholder = makePlaceholderPropTexture(def.placeholderKind ?? "bush");
    material.map = placeholder.texture;
    material.needsUpdate = true;
    applyPropTransform(mesh, shadow, def, propHeight, placeholder.aspect, placeholder, camera);
  }

  return { mesh, material, shadow };
}

/**
 * Scene-Builder-Bedarf (Chef-Auftrag "Arena-Scene-Builder"): löst Aspect+Baseline EINES Prop-Bildes
 * eigenständig auf, unabhängig vom Mesh-Aufbau in `makePropInstance`. `makePropInstance` misst diese
 * Werte zwar auch, aber NUR intern in seinem eigenen Textur-Lade-Callback (nicht nach außen
 * gereicht) — der Builder braucht sie zusätzlich griffbereit für JEDE folgende interaktive Transform-
 * Anwendung (Drag/Skalieren/Rotieren/Flach-Toggle ruft `applyPropTransform` erneut auf, OHNE die
 * Textur neu zu laden oder das Billboard neu zu bauen). Ein zweites `Image`-Element statt eines
 * zweiten `THREE.TextureLoader` — dieselbe URL trifft den Browser-HTTP-Cache, keine echten
 * Zweit-Netzwerkkosten; `measureSpriteBaseline` ist ohnehin pro URL gecacht (s.o.).
 */
export function resolvePropVisual(
  file: string | null | undefined,
  placeholderKind: PropPlaceholderKind | undefined,
): Promise<{ aspect: number; baseline: SpriteBaseline }> {
  const url = resolveArenaAssetUrl(file);
  if (!url) {
    const placeholder = makePlaceholderPropTexture(placeholderKind ?? "bush");
    return Promise.resolve({ aspect: placeholder.aspect, baseline: placeholder });
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const aspect = (img.naturalWidth || img.width || 1) / (img.naturalHeight || img.height || 1);
      resolve({ aspect, baseline: measureSpriteBaseline(img, url) });
    };
    img.onerror = () => {
      // Datei existiert laut Auto-Discovery, ist aber nicht ladbar (kaputtes Bild o.ä.) — defensiver
      // Fallback statt einer hängenden Promise, s. `SpriteBaseline`-Fallback-Konstante oben.
      resolve({ aspect: 1, baseline: { insetFrac: 0, footSpanFrac: 0.55, footCenterFrac: 0.5 } });
    };
    img.src = url;
  });
}
