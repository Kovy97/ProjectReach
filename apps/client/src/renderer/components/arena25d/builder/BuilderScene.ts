/**
 * Scene-Builder — die imperative three.js-Welt (Chef-Auftrag "Arena-Scene-Builder"). Bewusst EINE
 * lang lebende Klasse statt eines React-`useEffect`-Monolithen wie `Arena25DStage.tsx`: der Builder
 * braucht (anders als der Kampf-Renderer, der pro Zonenwechsel komplett neu mountet) EINEN einzigen
 * WebGL-Kontext über die gesamte Session (Zonenwechsel im Dropdown bauen nur Boden/Kulisse/Licht/
 * Props neu, s. `loadZone`) — Browser begrenzen die Zahl gleichzeitiger WebGL-Kontexte, ein Redesign
 * mit React-Remounts pro Zonenwechsel wäre unnötig fragil für ein Werkzeug, das der Chef evtl. lange
 * offen lässt und viele Zonen durchklickt.
 *
 * Nutzt für Kamera/Boden/Kulisse/Licht/Grade/Props exakt dieselben Bausteine wie der echte
 * Kampf-Renderer aus `../sceneEnvironment.ts` ("WYSIWYG im echten Renderer", Chef-Zitat) —
 * insbesondere `applyPropTransform`/`makePropInstance`, die geteilte Prop-Mathematik, die der
 * gestoppte Vorgänger-Agent bereits für genau diesen Zweck extrahiert hat.
 *
 * React-Anbindung: `SceneBuilderApp.tsx` hält EINE Instanz dieser Klasse in einem Ref, ruft ihre
 * öffentlichen Methoden aus Event-Handlern auf und liest nach jeder Änderung `getSnapshot()` für
 * die UI (Palette/Inspektor/Elementliste) — kein zweiter, redundanter React-State für Dinge, die
 * hier ohnehin die Wahrheit sind (Elementliste/Auswahl/Licht/Undo-Tiefe).
 */
import * as THREE from "three";
import {
  applyPropTransform,
  buildCurvedBackdropGeometry,
  buildGradeFilter,
  BACKDROP_CURVE_RADIUS,
  BACKDROP_CURVE_SEGMENTS,
  BACKDROP_Z,
  CAMERA_FOV,
  CAMERA_LOOKAT_Y,
  CAMERA_LOOKAT_Z,
  CAMERA_Y,
  CAMERA_Z,
  deriveSunOffset,
  DPR_CAP,
  FILL_GROUND_COLOR,
  FLOOR_CENTER_Z,
  GROUND_WORLD_DEPTH,
  GROUND_WORLD_WIDTH,
  makePropInstance,
  makeSunGlowTexture,
  MONSTER_X,
  MONSTER_Z,
  PLAYER_X,
  PLAYER_Z,
  PROP_BASE_HEIGHT,
  REFERENCE_ASPECT,
  resolveBackdropLayout,
  resolvePropVisual,
  SKIRT_REPEAT_X,
  SKIRT_REPEAT_Z,
  SKIRT_WORLD_DEPTH,
  SKIRT_WORLD_WIDTH,
  type PropInstance,
  type ResolvedBackdropLayout,
  type SpriteBaseline,
} from "../sceneEnvironment";
import { resolveArenaAssetUrl } from "../assets";
import type { PropPlaceholderKind, ZoneManifest, ZoneManifestGrade, ZoneManifestLighting, ZoneManifestProp, ZonePropLayer } from "../manifest";
import { emptyHistory, pushHistory, redoStep, undoStep, type HistoryStack } from "./history";
import { buildFullManifestExport, exportPropsBlockJson, makeDefaultPropDef, nextElementId, parseManifestFile, type BuilderElement } from "./elements";

interface LiveElement {
  def: ZoneManifestProp;
  instance: PropInstance;
  aspect: number;
  baseline: SpriteBaseline;
  ready: boolean;
}

const FALLBACK_BASELINE: SpriteBaseline = { insetFrac: 0, footSpanFrac: 0.55, footCenterFrac: 0.5 };

export interface BuilderSnapshot {
  elements: BuilderElement[];
  selectedId: number | null;
  placingFile: string | null;
  placingKind: PropPlaceholderKind | null;
  canUndo: boolean;
  canRedo: boolean;
  lighting: ZoneManifestLighting;
  backdrop: ResolvedBackdropLayout;
  showOverlay: boolean;
  showGameFrame: boolean;
  camDist: number;
  camPitchDeg: number;
  camIsGame: boolean;
  zoneId: string;
  ground: string;
  backdropFile: string;
  elementCount: number;
}

/* Chef-Feedback 05.08. ("keine Limitierungen, wie weit ich ein Bild wohin ziehen kann"): die
   früheren MIN_X/MAX_X/MIN_Z/MAX_Z/MIN_SCALE/MAX_SCALE-Klemmen sind KOMPLETT entfernt — Props
   dürfen beliebig weit außerhalb der sichtbaren Bodenfläche stehen (der Platzierungs-Raycast lief
   ohnehin schon gegen die unendliche `groundPlane`, nur die Klemmen hielten ihn fest). Einzige
   verbleibende Untergrenze: `scale` muss > 0 bleiben (0/negativ = degenerierte Geometrie). */
const SCALE_FLOOR = 0.01;

// ── Werkzeug-Kamera (Chef-Feedback 05.08. "im Scene Builder kommt man nicht sehr weit nach
//    hinten"): frei fahrbare Orbit-Kamera um den Spiel-Blickpunkt (Dolly + Pitch) — reiner
//    Builder-ZUSTAND, wird NIE exportiert. Die SPIEL-Kamera (CAMERA_*-Konstanten in
//    sceneEnvironment.ts, ≈30°-Pitch) bleibt unangetastet; ihre Werte sind hier nur die
//    Startposition/das Reset-Ziel ("Spiel-Kamera"-Button) und speisen den
//    "Spiel-Ausschnitt"-Rahmen (s. `buildGameFrameGroup`).
const TOOL_CAM_TARGET_Y = CAMERA_LOOKAT_Y;
const TOOL_CAM_TARGET_Z = CAMERA_LOOKAT_Z;
export const GAME_CAM_DIST = Math.hypot(CAMERA_Y - CAMERA_LOOKAT_Y, CAMERA_Z - CAMERA_LOOKAT_Z);
export const GAME_CAM_PITCH_DEG = (Math.atan2(CAMERA_Y - CAMERA_LOOKAT_Y, CAMERA_Z - CAMERA_LOOKAT_Z) * 180) / Math.PI;
/** Dolly-Bereich: bis ~7× weiter draußen als die Spiel-Kamera (≈17.4) — "deutlich weiter raus". */
export const TOOL_CAM_MIN_DIST = 3;
export const TOOL_CAM_MAX_DIST = 120;
/** Pitch-Bereich: knapp über Horizont bis fast senkrecht von oben (89°/0° würden `lookAt` mit dem
 *  Default-Up-Vektor bzw. den Boden-Raycast entarten lassen). */
export const TOOL_CAM_MIN_PITCH_DEG = 3;
export const TOOL_CAM_MAX_PITCH_DEG = 85;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function disposePropInstance(instance: PropInstance): void {
  instance.mesh.geometry.dispose();
  instance.material.map?.dispose();
  instance.material.dispose();
  instance.shadow.geometry.dispose();
  const shadowMat = instance.shadow.material as THREE.MeshBasicMaterial;
  shadowMat.map?.dispose();
  shadowMat.dispose();
}

export class BuilderScene {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private onChange: () => void;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private resizeObserver: ResizeObserver;
  private rafId = 0;
  private running = false;

  private zoneId = "";
  private groundFile = "";
  private backdropFile = "";
  private lighting: ZoneManifestLighting = {
    sunColor: "#ffd9a0",
    sunIntensity: 3.4,
    sunAngleDeg: 46,
    sunAzimuthDeg: 26,
    ambientColor: "#9fb8dd",
    ambientIntensity: 1.1,
    fogColor: "#241e15",
    fogDensity: 0,
    grade: { saturation: 1, temperature: 0, lift: 0 },
  };
  private backdropLayout: ResolvedBackdropLayout = resolveBackdropLayout(undefined);
  private bgCroppedAspect = 1717 / (916 * 0.7);

  // Werkzeug-Kamera-Zustand (s. Konstanten-Block oben) — Start = exakt die Spiel-Kamera.
  private camDist = GAME_CAM_DIST;
  private camPitchDeg = GAME_CAM_PITCH_DEG;
  private gameFrameGroup: THREE.Group;
  private showGameFrame = true;

  private sun: THREE.DirectionalLight;
  private fill: THREE.HemisphereLight;
  private sunGlow: THREE.Sprite;
  private floor: THREE.Mesh;
  private skirt: THREE.Mesh;
  private bgMesh: THREE.Mesh | null = null;

  private elements = new Map<number, LiveElement>();
  private selectedId: number | null = null;
  private placing: { file: string | null; kind: PropPlaceholderKind | null } | null = null;
  private ghost: PropInstance | null = null;
  private selectionRing: THREE.Mesh;
  private overlayGroup: THREE.Group;
  private showOverlay = true;

  private history: HistoryStack<BuilderElement[]> = emptyHistory();
  private dragging: { id: number; historyPushed: boolean } | null = null;
  private lastWheelAt = 0;

  constructor(container: HTMLDivElement, canvas: HTMLCanvasElement, onChange: () => void) {
    this.container = container;
    this.canvas = canvas;
    this.onChange = onChange;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x241e15, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    // Far-Plane 500 statt der 100 des Kampf-Renderers: die Werkzeug-Kamera darf bis
    // TOOL_CAM_MAX_DIST (120) hinausfahren und muss von dort noch die (frei verschiebbare)
    // Kulisse sehen — reine Clipping-Reserve, bei Spiel-Kameraposition optisch identisch.
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 500);
    this.applyToolCamera();

    this.sun = new THREE.DirectionalLight(0xffd9a0, 3.4);
    this.sun.target.position.set(0, 1.1, FLOOR_CENTER_Z);
    this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.HemisphereLight(0x9fb8dd, FILL_GROUND_COLOR, 1.1);
    this.scene.add(this.fill);
    this.sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: makeSunGlowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }),
    );
    this.sunGlow.scale.set(4.2, 4.2, 1);
    this.sunGlow.position.set(5.8, 7.6, BACKDROP_Z + 2.6);
    this.scene.add(this.sunGlow);

    const floorGeo = new THREE.PlaneGeometry(GROUND_WORLD_WIDTH, GROUND_WORLD_DEPTH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMat = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, emissive: new THREE.Color(0x2c2113), emissiveIntensity: 0.3 });
    this.floor = new THREE.Mesh(floorGeo, floorMat);
    this.floor.position.set(0, 0, FLOOR_CENTER_Z);
    this.scene.add(this.floor);

    const skirtGeo = new THREE.PlaneGeometry(SKIRT_WORLD_WIDTH, SKIRT_WORLD_DEPTH);
    skirtGeo.rotateX(-Math.PI / 2);
    const skirtMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, emissive: new THREE.Color(0x241c10), emissiveIntensity: 0.3 });
    this.skirt = new THREE.Mesh(skirtGeo, skirtMat);
    this.skirt.position.set(0, -0.015, FLOOR_CENTER_Z);
    this.scene.add(this.skirt);

    this.selectionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.68, 28),
      new THREE.MeshBasicMaterial({ color: 0xf5c563, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }),
    );
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.renderOrder = 999;
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    this.overlayGroup = this.buildOverlayGroup();
    this.scene.add(this.overlayGroup);

    this.gameFrameGroup = this.buildGameFrameGroup();
    this.scene.add(this.gameFrameGroup);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.renderer.render(this.scene, this.camera);

    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("visibilitychange", this.handleVisibility);

    this.startLoop();
  }

  // ── Referenz-Overlay (Chef-Auftrag Punkt 5) ────────────────────────────────────────────────
  private buildOverlayGroup(): THREE.Group {
    const group = new THREE.Group();
    const playerDummy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 2.2, 10),
      new THREE.MeshBasicMaterial({ color: 0x6fa8ff, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    playerDummy.position.set(PLAYER_X, 1.1, PLAYER_Z);
    const monsterDummy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.36, 1.8, 10),
      new THREE.MeshBasicMaterial({ color: 0xe07a4f, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    monsterDummy.position.set(MONSTER_X, 0.9, MONSTER_Z);
    const axisLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(PLAYER_X, 0.03, PLAYER_Z), new THREE.Vector3(MONSTER_X, 0.03, MONSTER_Z)]),
      new THREE.LineBasicMaterial({ color: 0xf5c563, transparent: true, opacity: 0.6 }),
    );
    group.add(playerDummy, monsterDummy, axisLine);
    group.visible = this.showOverlay;
    return group;
  }

  toggleOverlay(visible: boolean): void {
    this.showOverlay = visible;
    this.overlayGroup.visible = visible;
    this.onChange();
  }

  // ── Werkzeug-Kamera (Chef-Auftrag 05.08. Punkt 1) ──────────────────────────────────────────
  /** Orbit um den Spiel-Blickpunkt: Position aus Distanz (Dolly) + Pitch, Yaw bewusst fest 0
   *  (Blick immer von der Kamera-Seite wie im Kampf — der Builder soll das Spiel-Bild beurteilen,
   *  keine Rundumsicht). Billboards yawen zur Kamera (`applyPropTransform` liest
   *  `camera.position`) — nach jeder Fahrt einmal alle Transforms nachziehen, sonst stünden die
   *  Props schräg zur neuen Blickrichtung. */
  private applyToolCamera(): void {
    const pitchRad = (this.camPitchDeg * Math.PI) / 180;
    this.camera.position.set(0, TOOL_CAM_TARGET_Y + this.camDist * Math.sin(pitchRad), TOOL_CAM_TARGET_Z + this.camDist * Math.cos(pitchRad));
    this.camera.lookAt(0, TOOL_CAM_TARGET_Y, TOOL_CAM_TARGET_Z);
    for (const live of this.elements.values()) this.applyLiveTransform(live);
  }

  setToolCamera(patch: { dist?: number; pitchDeg?: number }): void {
    if (patch.dist !== undefined && Number.isFinite(patch.dist)) this.camDist = clamp(patch.dist, TOOL_CAM_MIN_DIST, TOOL_CAM_MAX_DIST);
    if (patch.pitchDeg !== undefined && Number.isFinite(patch.pitchDeg)) {
      this.camPitchDeg = clamp(patch.pitchDeg, TOOL_CAM_MIN_PITCH_DEG, TOOL_CAM_MAX_PITCH_DEG);
    }
    this.applyToolCamera();
    this.onChange();
  }

  /** Reset-Button "Spiel-Kamera" — zurück auf exakt die Kampf-Renderer-Perspektive. */
  resetToolCamera(): void {
    this.camDist = GAME_CAM_DIST;
    this.camPitchDeg = GAME_CAM_PITCH_DEG;
    this.applyToolCamera();
    this.onChange();
  }

  /**
   * "Spiel-Ausschnitt"-Rahmen (Chef-Auftrag 05.08. Punkt 1): Drahtgitter-Frustum der ECHTEN
   * Spiel-Kamera (CAMERA_*-Konstanten, Seitenverhältnis = 1920×1080-Referenz des Kampf-Viewports,
   * `REFERENCE_ASPECT`) — beim Herauszoomen zeigt es exakt, was im echten Kampf im Bild landet.
   * Steht die Werkzeug-Kamera auf der Spiel-Position, projizieren die vier Kanten-Strahlen exakt
   * auf die Viewport-Ecken und die Querschnitts-Rechtecke auf den Viewport-Rand — der Rahmen
   * entspricht dann dem Vollbild (Auftrags-Soll). Kanten + drei Tiefen-Rechtecke (Kampffeld/
   * Kulissen-Nähe/Endkappe) als Tiefen-Anhaltspunkte; `depthTest:false`, damit der Rahmen nie von
   * Boden/Kulisse verdeckt wird.
   */
  private buildGameFrameGroup(): THREE.Group {
    const gameCam = new THREE.PerspectiveCamera(CAMERA_FOV, REFERENCE_ASPECT, 0.1, 100);
    gameCam.position.set(0, CAMERA_Y, CAMERA_Z);
    gameCam.lookAt(0, CAMERA_LOOKAT_Y, CAMERA_LOOKAT_Z);
    gameCam.updateMatrixWorld(true);
    const origin = gameCam.position.clone();
    const cornerDirs = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([nx, ny]) => new THREE.Vector3(nx!, ny!, 0.5).unproject(gameCam).sub(origin).normalize());
    // Bis knapp hinter die Default-Kulisse (Distanz Spiel-Kamera→BACKDROP_Z entlang der Blickachse
    // ≈ 23) — weit genug, um den kompletten sichtbaren Raum zu umreißen, ohne ins Leere zu laufen.
    const frustumLen = 26;
    const pts: THREE.Vector3[] = [];
    const pushRect = (d: number): void => {
      for (let i = 0; i < 4; i++) {
        pts.push(origin.clone().addScaledVector(cornerDirs[i]!, d), origin.clone().addScaledVector(cornerDirs[(i + 1) % 4]!, d));
      }
    };
    pushRect(frustumLen * 0.4);
    pushRect(frustumLen * 0.7);
    pushRect(frustumLen);
    for (const dir of cornerDirs) pts.push(origin.clone(), origin.clone().addScaledVector(dir, frustumLen));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.55, depthTest: false });
    const lines = new THREE.LineSegments(geo, mat);
    lines.renderOrder = 998;
    const group = new THREE.Group();
    group.add(lines);
    group.visible = this.showGameFrame;
    return group;
  }

  toggleGameFrame(visible: boolean): void {
    this.showGameFrame = visible;
    this.gameFrameGroup.visible = visible;
    this.onChange();
  }

  // ── Zonen-Laden (Boden/Kulisse/Licht/Props aus einem Manifest) ────────────────────────────────
  loadZone(manifest: ZoneManifest): void {
    this.cancelPlacing();
    for (const live of this.elements.values()) this.disposeLive(live);
    this.elements.clear();
    this.selectedId = null;
    this.dragging = null;
    this.history = emptyHistory();

    this.zoneId = manifest.zoneId;
    this.groundFile = manifest.ground;
    this.backdropFile = manifest.backdrop;
    this.lighting = { ...manifest.lighting, grade: { ...manifest.lighting.grade } };
    // Kulissen-Platzierung: seit 05.08. echtes Manifest-Feld (`backdropLayout`) — fehlende
    // Felder/fehlender Block fallen auf die Code-Konstanten zurück (identisch zum Kampf-Renderer,
    // s. `resolveBackdropLayout`). KEINE Werte-Klemmen beim Laden (Roundtrip-Pflicht).
    this.backdropLayout = resolveBackdropLayout(manifest.backdropLayout);

    this.buildGround(manifest.ground);
    this.buildBackdrop(manifest.backdrop);
    this.applyLightingToScene();

    for (const def of manifest.props) this.spawnLiveElement(nextElementId(), { ...def });

    this.updateSelectionRing();
    this.onChange();
  }

  private buildGround(file: string): void {
    const url = resolveArenaAssetUrl(file);
    const tex = url ? new THREE.TextureLoader().load(url) : null;
    if (tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.repeat.set(1, 1);
      tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    } else {
      // eslint-disable-next-line no-console
      console.error(`[scene-builder] Boden-Textur "${file}" nicht auflösbar.`);
    }
    const floorMat = this.floor.material as THREE.MeshStandardMaterial;
    floorMat.map?.dispose();
    floorMat.map = tex;
    floorMat.needsUpdate = true;

    const skirtTex = tex ? tex.clone() : null;
    if (skirtTex) {
      skirtTex.wrapS = THREE.RepeatWrapping;
      skirtTex.wrapT = THREE.RepeatWrapping;
      skirtTex.repeat.set(SKIRT_REPEAT_X, SKIRT_REPEAT_Z);
      skirtTex.needsUpdate = true;
    }
    const skirtMat = this.skirt.material as THREE.MeshStandardMaterial;
    skirtMat.map?.dispose();
    skirtMat.map = skirtTex;
    skirtMat.needsUpdate = true;
  }

  /** 1:1 dieselbe Krümmungs-/Crop-/Fade-Logik wie `Arena25DStage.tsx` (s. dortiges JSDoc "Task
   *  #330c Punkt 2") — die Kulisse ist zonenabhängig (anders als Boden/Skirt-GEOMETRIE), daher wird
   *  hier bei jedem Zonenwechsel ein frisches Mesh gebaut/das alte entsorgt statt nur die Textur zu
   *  tauschen (die gecurvte Breite hängt vom Bild-Seitenverhältnis ab, s. `bgCroppedAspect`). */
  private buildBackdrop(file: string): void {
    if (this.bgMesh) {
      this.scene.remove(this.bgMesh);
      this.bgMesh.geometry.dispose();
      const m = this.bgMesh.material as THREE.MeshBasicMaterial;
      m.map?.dispose();
      m.dispose();
      this.bgMesh = null;
    }
    const url = resolveArenaAssetUrl(file);
    if (!url) {
      // eslint-disable-next-line no-console
      console.error(`[scene-builder] Kulissen-Textur "${file}" nicht auflösbar — Kulisse bleibt leer.`);
      return;
    }
    new THREE.TextureLoader().load(url, (rawTex) => {
      const img = rawTex.image as HTMLImageElement;
      const w = img.naturalWidth || img.width || 1717;
      const h = img.naturalHeight || img.height || 916;
      const CROP_FRACTION = 0.7;
      const cropH = Math.max(1, Math.round(h * CROP_FRACTION));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, cropH, 0, 0, w, cropH);
      const fadeH = Math.round(cropH * 0.22);
      const grad = ctx.createLinearGradient(0, cropH - fadeH, 0, cropH);
      grad.addColorStop(0, "rgba(36,30,21,0)");
      grad.addColorStop(1, "rgba(36,30,21,0.92)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, cropH - fadeH, w, fadeH);
      const backdropTex = new THREE.CanvasTexture(canvas);
      backdropTex.colorSpace = THREE.SRGBColorSpace;
      backdropTex.wrapS = THREE.ClampToEdgeWrapping;
      backdropTex.wrapT = THREE.ClampToEdgeWrapping;
      this.bgCroppedAspect = w / cropH;
      const layout = this.backdropLayout;
      const bgWidth = layout.height * this.bgCroppedAspect * layout.widthScale;
      const bgGeo = buildCurvedBackdropGeometry(bgWidth, layout.height, BACKDROP_CURVE_RADIUS, BACKDROP_CURVE_SEGMENTS);
      const bgMat = new THREE.MeshBasicMaterial({ map: backdropTex, fog: false, side: THREE.DoubleSide });
      const bg = new THREE.Mesh(bgGeo, bgMat);
      bg.position.set(0, layout.height / 2 + layout.yOffset, layout.z);
      this.scene.add(bg);
      this.bgMesh = bg;
      const aspectNow = (this.container.clientWidth || 1) / (this.container.clientHeight || 1);
      bg.scale.set(Math.max(1, aspectNow / REFERENCE_ASPECT), 1, 1);
    });
  }

  // ── Licht/Fog/Grade (live editierbar, Chef-Auftrag Punkt 8) ─────────────────────────────────
  setLighting(patch: Partial<ZoneManifestLighting>): void {
    this.lighting = { ...this.lighting, ...patch };
    this.applyLightingToScene();
    this.onChange();
  }

  setGrade(patch: Partial<ZoneManifestGrade>): void {
    this.lighting = { ...this.lighting, grade: { ...this.lighting.grade, ...patch } };
    this.applyLightingToScene();
    this.onChange();
  }

  private applyLightingToScene(): void {
    this.sun.color.set(this.lighting.sunColor);
    this.sun.intensity = this.lighting.sunIntensity;
    const sunTarget = new THREE.Vector3(0, 1.1, FLOOR_CENTER_Z);
    this.sun.position.copy(sunTarget).add(deriveSunOffset(this.lighting.sunAngleDeg, this.lighting.sunAzimuthDeg));
    this.sun.target.position.copy(sunTarget);
    this.fill.color.set(this.lighting.ambientColor);
    this.fill.intensity = this.lighting.ambientIntensity;
    (this.sunGlow.material as THREE.SpriteMaterial).color.set(this.lighting.sunColor);
    this.scene.fog = this.lighting.fogDensity > 0 ? new THREE.FogExp2(new THREE.Color(this.lighting.fogColor).getHex(), this.lighting.fogDensity) : null;
    this.canvas.style.filter = buildGradeFilter(this.lighting.grade);
  }

  /** Kulissen-Regler (seit 05.08. ein ECHTES Manifest-Feld `backdropLayout`, kein Experiment
   *  mehr) — `z`/`yOffset` sind reine Positionsänderungen, `height`/`widthScale` brauchen eine neue
   *  gecurvte Geometrie (der Zylinder-Bogen hängt an der Breite, s. `buildCurvedBackdropGeometry`),
   *  alles ohne Textur-Neuladung. Untergrenze nur gegen degenerierte Geometrie (>0), keine
   *  Gestaltungs-Klemmen. */
  setBackdropLayout(patch: Partial<ResolvedBackdropLayout>): void {
    const next = { ...this.backdropLayout, ...patch };
    if (!Number.isFinite(next.z)) next.z = this.backdropLayout.z;
    if (!Number.isFinite(next.yOffset)) next.yOffset = this.backdropLayout.yOffset;
    next.height = Number.isFinite(next.height) ? Math.max(SCALE_FLOOR, next.height) : this.backdropLayout.height;
    next.widthScale = Number.isFinite(next.widthScale) ? Math.max(SCALE_FLOOR, next.widthScale) : this.backdropLayout.widthScale;
    this.backdropLayout = next;
    if (this.bgMesh) {
      const bgWidth = next.height * this.bgCroppedAspect * next.widthScale;
      const newGeo = buildCurvedBackdropGeometry(bgWidth, next.height, BACKDROP_CURVE_RADIUS, BACKDROP_CURVE_SEGMENTS);
      this.bgMesh.geometry.dispose();
      this.bgMesh.geometry = newGeo;
      const aspectNow = (this.container.clientWidth || 1) / (this.container.clientHeight || 1);
      this.bgMesh.position.set(0, next.height / 2 + next.yOffset, next.z);
      this.bgMesh.scale.set(Math.max(1, aspectNow / REFERENCE_ASPECT), 1, 1);
    }
    this.onChange();
  }

  // ── Element-Lebenszyklus ─────────────────────────────────────────────────────────────────────
  private spawnLiveElement(id: number, def: ZoneManifestProp): void {
    const instance = makePropInstance(def, this.camera);
    this.scene.add(instance.mesh, instance.shadow);
    const live: LiveElement = { def, instance, aspect: 1, baseline: FALLBACK_BASELINE, ready: false };
    this.elements.set(id, live);
    resolvePropVisual(def.file, def.placeholderKind).then(({ aspect, baseline }) => {
      live.aspect = aspect;
      live.baseline = baseline;
      live.ready = true;
      this.onChange();
    });
  }

  private disposeLive(live: LiveElement): void {
    this.scene.remove(live.instance.mesh, live.instance.shadow);
    disposePropInstance(live.instance);
  }

  private applyLiveTransform(live: LiveElement): void {
    const propHeight = PROP_BASE_HEIGHT * live.def.scale;
    applyPropTransform(live.instance.mesh, live.instance.shadow, live.def, propHeight, live.aspect, live.baseline, this.camera);
  }

  private snapshotElements(): BuilderElement[] {
    return Array.from(this.elements.entries()).map(([id, live]) => ({ id, def: { ...live.def } }));
  }

  private checkpoint(): void {
    this.history = pushHistory(this.history, this.snapshotElements());
  }

  private rebuildElementsFrom(defs: BuilderElement[]): void {
    for (const live of this.elements.values()) this.disposeLive(live);
    this.elements.clear();
    for (const el of defs) this.spawnLiveElement(el.id, { ...el.def });
  }

  undo(): void {
    const result = undoStep(this.history, this.snapshotElements());
    if (!result) return;
    this.history = result.next;
    this.rebuildElementsFrom(result.state);
    this.selectedId = null;
    this.updateSelectionRing();
    this.onChange();
  }

  redo(): void {
    const result = redoStep(this.history, this.snapshotElements());
    if (!result) return;
    this.history = result.next;
    this.rebuildElementsFrom(result.state);
    this.selectedId = null;
    this.updateSelectionRing();
    this.onChange();
  }

  // ── Platzieren (Palette-Klick → Geist → Klick auf Boden, Chef-Auftrag Punkt 3) ────────────────
  startPlacing(file: string | null, kind: PropPlaceholderKind | null): void {
    this.cancelPlacing();
    this.placing = { file, kind };
    const def = makeDefaultPropDef(file ?? this.placeholderFileFor(kind), 0, FLOOR_CENTER_Z, kind ?? undefined);
    const instance = makePropInstance(def, this.camera);
    instance.material.opacity = 0.55;
    (instance.shadow.material as THREE.MeshBasicMaterial).opacity = 0.28;
    // Der Geist darf nie als "echtes" Prop selektierbar/raycastbar sein — no-op-Override statt eines
    // Layer-Systems (einzige Stelle im Builder, an der ein Raycast versehentlich den Geist treffen könnte).
    instance.mesh.raycast = () => {};
    this.scene.add(instance.mesh, instance.shadow);
    this.ghost = instance;
    this.onChange();
  }

  cancelPlacing(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost.mesh, this.ghost.shadow);
      disposePropInstance(this.ghost);
      this.ghost = null;
    }
    this.placing = null;
  }

  private placeholderFileFor(kind: PropPlaceholderKind | null): string {
    return `arena_${this.zoneId || "zone"}_prop_${kind ?? "bush"}_TODO.webp`;
  }

  private finalizePlacement(): void {
    if (!this.placing || !this.ghost) return;
    const x = this.ghost.mesh.position.x;
    const z = this.ghost.mesh.position.z;
    const kind = this.placing.kind ?? undefined;
    const file = this.placing.file ?? this.placeholderFileFor(this.placing.kind);
    this.scene.remove(this.ghost.mesh, this.ghost.shadow);
    disposePropInstance(this.ghost);
    this.ghost = null;
    this.placing = null;

    this.checkpoint();
    const id = nextElementId();
    const def = makeDefaultPropDef(file, x, z, kind);
    this.spawnLiveElement(id, def);
    this.selectedId = id;
    this.updateSelectionRing();
    this.onChange();
  }

  // ── Auswahl/Manipulation ────────────────────────────────────────────────────────────────────
  selectElement(id: number | null): void {
    this.selectedId = id != null && this.elements.has(id) ? id : null;
    this.updateSelectionRing();
    this.onChange();
  }

  private updateSelectionRing(): void {
    if (this.selectedId == null) {
      this.selectionRing.visible = false;
      return;
    }
    const live = this.elements.get(this.selectedId);
    if (!live) {
      this.selectionRing.visible = false;
      return;
    }
    this.selectionRing.visible = true;
    const s = Math.max(0.5, live.def.scale);
    this.selectionRing.scale.set(s, s, 1);
    this.selectionRing.position.set(live.def.x, 0.025, live.def.z);
  }

  deleteElement(id: number): void {
    const live = this.elements.get(id);
    if (!live) return;
    this.checkpoint();
    this.disposeLive(live);
    this.elements.delete(id);
    if (this.selectedId === id) this.selectedId = null;
    this.updateSelectionRing();
    this.onChange();
  }

  deleteSelected(): void {
    if (this.selectedId != null) this.deleteElement(this.selectedId);
  }

  duplicateSelected(): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    this.checkpoint();
    const id = nextElementId();
    const def: ZoneManifestProp = { ...live.def, x: live.def.x + 0.6, z: live.def.z + 0.3 };
    this.spawnLiveElement(id, def);
    this.selectedId = id;
    this.updateSelectionRing();
    this.onChange();
  }

  /** Direkter Feld-Patch (Layer-/Flip-/Flat-Umschalter im Inspektor). EIN diskreter Undo-Schritt
   *  pro Aufruf (anders als Slider/Zahlfelder, die einen Schritt pro GESTE bündeln, s.
   *  `beginElementEdit`/`patchSelectedLive`). */
  updateSelectedDef(patch: Partial<ZoneManifestProp>): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    this.checkpoint();
    Object.assign(live.def, patch);
    live.def.scale = Math.max(SCALE_FLOOR, live.def.scale);
    this.applyLiveTransform(live);
    this.updateSelectionRing();
    this.onChange();
  }

  /** Gesten-Paar für Inspektor-Slider/Zahlfelder (X/Z/Skalierung/Rotation): `beginElementEdit()`
   *  EINMAL beim Fokussieren/Greifen des Reglers (drückt genau EINEN Undo-Checkpoint), danach
   *  beliebig viele `patchSelectedLive()`-Aufrufe OHNE weitere Checkpoints (jeder Slider-`onChange`/
   *  jedes Tastendruck-Ereignis im Zahlfeld während EINER Geste) — verhindert, dass ein einzelner
   *  Slider-Zug oder eine getippte Zahl den Undo-Stack mit einem Checkpoint pro Zwischenwert flutet. */
  beginElementEdit(): void {
    if (this.selectedId == null) return;
    this.checkpoint();
  }

  patchSelectedLive(patch: Partial<ZoneManifestProp>): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    Object.assign(live.def, patch);
    live.def.scale = Math.max(SCALE_FLOOR, live.def.scale);
    this.applyLiveTransform(live);
    this.updateSelectionRing();
    this.onChange();
  }

  rotateSelected(deltaDeg: number): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    this.checkpoint();
    live.def.rotDeg = ((live.def.rotDeg ?? 0) + deltaDeg) % 360;
    this.applyLiveTransform(live);
    this.onChange();
  }

  nudgeSelected(dx: number, dz: number): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    this.checkpoint();
    live.def.x += dx;
    live.def.z += dz;
    this.applyLiveTransform(live);
    this.updateSelectionRing();
    this.onChange();
  }

  toggleFlatSelected(): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    this.checkpoint();
    live.def.flat = !live.def.flat;
    this.applyLiveTransform(live);
    this.onChange();
  }

  toggleFlipSelected(): void {
    if (this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    this.checkpoint();
    live.def.flip = !live.def.flip;
    this.applyLiveTransform(live);
    this.onChange();
  }

  setSelectedLayer(layer: ZonePropLayer): void {
    this.updateSelectedDef({ layer });
  }

  // ── Export/Import (Chef-Auftrag Punkt 7) ────────────────────────────────────────────────────
  exportPropsBlock(): string {
    return exportPropsBlockJson(this.snapshotElements());
  }

  exportFullManifest(): string {
    return buildFullManifestExport(this.zoneId, this.groundFile, this.backdropFile, this.lighting, this.snapshotElements(), this.backdropLayout);
  }

  importManifest(raw: string): boolean {
    const { manifest } = parseManifestFile(raw);
    if (!manifest) return false;
    this.loadZone(manifest);
    return true;
  }

  hasUnsavedElements(): boolean {
    return this.elements.size > 0;
  }

  getSnapshot(): BuilderSnapshot {
    return {
      elements: this.snapshotElements(),
      selectedId: this.selectedId,
      placingFile: this.placing ? (this.placing.file ?? this.placeholderFileFor(this.placing.kind)) : null,
      placingKind: this.placing?.kind ?? null,
      canUndo: this.history.undo.length > 0,
      canRedo: this.history.redo.length > 0,
      lighting: { ...this.lighting, grade: { ...this.lighting.grade } },
      backdrop: { ...this.backdropLayout },
      showOverlay: this.showOverlay,
      showGameFrame: this.showGameFrame,
      camDist: this.camDist,
      camPitchDeg: this.camPitchDeg,
      camIsGame: Math.abs(this.camDist - GAME_CAM_DIST) < 0.01 && Math.abs(this.camPitchDeg - GAME_CAM_PITCH_DEG) < 0.01,
      zoneId: this.zoneId,
      ground: this.groundFile,
      backdropFile: this.backdropFile,
      elementCount: this.elements.size,
    };
  }

  // ── Maus/Tastatur ────────────────────────────────────────────────────────────────────────────
  private groundPointFromEvent(e: { clientX: number; clientY: number }): { x: number; z: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    // Raycast gegen die UNENDLICHE Bodenebene (`this.groundPlane`, THREE.Plane auf y=0) — bewusst
    // NICHT gegen das sichtbare Boden-Mesh: Platzieren/Ziehen funktioniert auch weit jenseits der
    // Bodenfläche (Chef-Feedback 05.08. "keine Limitierungen"). Ergebnis ungeklemmt.
    const point = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, point);
    if (!hit) return null;
    return { x: point.x, z: point.z };
  }

  private raycastElementIdAt(e: { clientX: number; clientY: number }): number | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    const meshes = Array.from(this.elements.entries()).map(([, live]) => live.instance.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return null;
    for (const [id, live] of this.elements.entries()) {
      if (live.instance.mesh === hits[0]!.object) return id;
    }
    return null;
  }

  private handlePointerDown = (e: PointerEvent): void => {
    if (this.placing) {
      this.finalizePlacement();
      return;
    }
    const hitId = this.raycastElementIdAt(e);
    if (hitId != null) {
      this.selectedId = hitId;
      this.dragging = { id: hitId, historyPushed: false };
    } else {
      this.selectedId = null;
      this.dragging = null;
    }
    this.updateSelectionRing();
    this.onChange();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.placing && this.ghost) {
      const p = this.groundPointFromEvent(e);
      if (p) {
        this.ghost.mesh.position.x = p.x;
        this.ghost.mesh.position.z = p.z;
        this.ghost.shadow.position.x = p.x;
        this.ghost.shadow.position.z = p.z;
      }
      return;
    }
    if (this.dragging) {
      const live = this.elements.get(this.dragging.id);
      if (!live) return;
      const p = this.groundPointFromEvent(e);
      if (!p) return;
      if (!this.dragging.historyPushed) {
        this.checkpoint();
        this.dragging.historyPushed = true;
      }
      live.def.x = p.x;
      live.def.z = p.z;
      this.applyLiveTransform(live);
      this.updateSelectionRing();
      this.onChange();
    }
  };

  private handlePointerUp = (): void => {
    this.dragging = null;
  };

  /** Mausrad-Doppelbelegung (Chef-Auftrag 05.08. Punkt 1, im Hotkey-Overlay dokumentiert):
   *  - MIT Strg/Cmd: IMMER Kamera-Dolly (auch bei aktiver Selektion/Platzierung).
   *  - OHNE Modifier: Kamera-Dolly nur, wenn nichts selektiert/im Platzieren ist — sonst behält
   *    das Rad seine bisherige Bedeutung (selektiertes Element skalieren). */
  private handleWheel = (e: WheelEvent): void => {
    const wantDolly = e.ctrlKey || e.metaKey || (!this.placing && this.selectedId == null);
    if (wantDolly) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      this.camDist = clamp(this.camDist * factor, TOOL_CAM_MIN_DIST, TOOL_CAM_MAX_DIST);
      this.applyToolCamera();
      this.onChange();
      return;
    }
    if (this.placing || this.selectedId == null) return;
    const live = this.elements.get(this.selectedId);
    if (!live) return;
    e.preventDefault();
    const now = performance.now();
    if (now - this.lastWheelAt > 500) this.checkpoint();
    this.lastWheelAt = now;
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    live.def.scale = Math.max(SCALE_FLOOR, live.def.scale * factor);
    this.applyLiveTransform(live);
    this.updateSelectionRing();
    this.onChange();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement | null)?.isContentEditable;
    if (e.key === "Escape") {
      if (this.placing) {
        this.cancelPlacing();
        this.onChange();
      } else if (this.selectedId != null) {
        this.selectedId = null;
        this.updateSelectionRing();
        this.onChange();
      }
      return;
    }
    if (typing) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.shiftKey && e.key.toLowerCase() === "z") {
      e.preventDefault();
      this.undo();
      return;
    }
    if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      this.redo();
      return;
    }
    if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      this.duplicateSelected();
      return;
    }
    if (this.selectedId == null) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.deleteSelected();
      return;
    }
    if (e.key.toLowerCase() === "q") {
      this.rotateSelected(-5);
      return;
    }
    if (e.key.toLowerCase() === "e") {
      this.rotateSelected(5);
      return;
    }
    if (e.key.toLowerCase() === "f") {
      this.toggleFlatSelected();
      return;
    }
    if (e.key.toLowerCase() === "m") {
      this.toggleFlipSelected();
      return;
    }
    const step = e.shiftKey ? 0.25 : 0.05;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.nudgeSelected(-step, 0);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.nudgeSelected(step, 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      this.nudgeSelected(0, -step);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.nudgeSelected(0, step);
    }
  };

  private handleVisibility = (): void => {
    if (document.hidden) this.stopLoop();
    else this.startLoop();
  };

  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    const frame = (): void => {
      this.renderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(frame);
    };
    this.rafId = requestAnimationFrame(frame);
  }

  private stopLoop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private resize = (): void => {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const widthScale = Math.max(1, aspect / REFERENCE_ASPECT);
    this.floor.scale.set(widthScale, 1, 1);
    if (this.bgMesh) this.bgMesh.scale.set(widthScale, 1, 1);
  };

  dispose(): void {
    this.stopLoop();
    this.resizeObserver.disconnect();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.cancelPlacing();
    for (const live of this.elements.values()) this.disposeLive(live);
    this.elements.clear();
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          const mat = m as THREE.Material & { map?: THREE.Texture | null };
          mat.map?.dispose();
          mat.dispose();
        }
      } else if (obj instanceof THREE.Sprite) {
        obj.material.map?.dispose();
        obj.material.dispose();
      }
    });
    this.renderer.dispose();
  }
}
