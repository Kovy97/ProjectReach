/**
 * 0.4.0-Arena, Logik-Welle 1 — Asset-Auflösung fürs Zonen-Manifest-System (s. manifest.ts
 * Modul-JSDoc für den Registry-/Isolations-Hintergrund).
 *
 * Zwei Aufgaben:
 *  1. Ground-/Backdrop-/Prop-Dateinamen aus einem Manifest (Mira-Zielschema
 *     `arena_<zoneId>_ground.webp` etc., s. design/battle-040-arena-produktion.md §2) zu einer
 *     echten Vite-Asset-URL auflösen — Auto-Discovery über `assets/arena/*`, damit eine neue
 *     Mira-Lieferung ohne Codeänderung greift (nur Datei ablegen + Manifest-Dateinamen darauf
 *     zeigen lassen). Für "pastures" existiert die Mira-Datei noch nicht — Fallback auf den
 *     bestehenden `assets/arena25d/pastures_*.webp`-Altbestand (Task #330-Lieferung).
 *  2. Prozedurale Platzhalter-Silhouetten (Canvas, kein Asset) für Props, deren Mira-Datei noch
 *     nicht existiert — s. design/battle-040-arena-produktion.md §Auftrag Punkt 4 ("prozedurale
 *     dunkle Silhouetten-Sprites" als eine der beiden erlaubten Platzhalter-Optionen; hier gewählt
 *     statt eines im Scratchpad erzeugten Freistellers, weil dadurch NICHTS unter
 *     Runtime-Assets committet werden muss und der Platzhalter automatisch verschwindet, sobald
 *     Mira die echte Datei unter dem im Manifest genannten Namen abliefert — kein Zwei-Schritt-
 *     Aufräumen nötig).
 */
import * as THREE from "three";
import legacyPasturesGround from "../../assets/arena25d/pastures_ground.webp";
import legacyPasturesBackdrop from "../../assets/arena25d/pastures_backdrop.webp";
import { getZoneManifest, type PropPlaceholderKind } from "./manifest";

// ── 1. Ground/Backdrop/Prop-URL-Auflösung ───────────────────────────────────────────────────
// Auto-Discovery über den KÜNFTIGEN Mira-Zielordner — heute (2026-08-03) leer (0 Treffer ist
// KEIN Fehler, s. util/audio.ts-Kommentar für dasselbe Muster), füllt sich mit jeder Lieferung
// ohne Codeänderung. `eager:true` + `query:"?url"` = Standardmuster dieses Repos (s. portraits.ts/
// battleScreens.ts) — im Gegensatz zu JSON-Importen (manifest.ts) sind Bild-Importe eine Vite-
// Asset-Pipeline-Datei, die IMMER kopiert wird, sobald sie existiert (s. README.md "Bekannte,
// bewusst akzeptierte Ausnahme") — bei 0 Dateien heute entsteht dadurch noch kein Bundle-Byte.
const ARENA_ASSET_IMAGES = import.meta.glob<string>("../../assets/arena/*.{webp,png}", {
  eager: true,
  query: "?url",
  import: "default",
});
const ARENA_ASSET_BY_FILE: Record<string, string> = {};
for (const [path, url] of Object.entries(ARENA_ASSET_IMAGES)) {
  const file = path.split("/").pop();
  if (file) ARENA_ASSET_BY_FILE[file] = url;
}

// Task #330-Altbestand (2026-07-24-Lieferung) — greift NUR, solange die künftige Mira-Datei unter
// demselben, im Manifest genannten Zielnamen noch nicht existiert. Sobald `assets/arena/
// arena_pastures_ground.webp` auftaucht, gewinnt sie automatisch (s. `resolveArenaAssetUrl` unten,
// Auto-Discovery-Treffer wird VOR diesem Fallback geprüft) — kein Code-Umbau bei der Übergabe.
const LEGACY_FALLBACK_BY_FILE: Record<string, string> = {
  "arena_pastures_ground.webp": legacyPasturesGround,
  "arena_pastures_backdrop.webp": legacyPasturesBackdrop,
};

/** Löst einen im Manifest genannten Dateinamen (z.B. "arena_pastures_ground.webp") zu einer
 *  ladbaren URL auf, oder `null` falls weder eine echte Mira-Lieferung noch ein Legacy-Fallback
 *  existiert. */
export function resolveArenaAssetUrl(file: string | null | undefined): string | null {
  if (!file) return null;
  return ARENA_ASSET_BY_FILE[file] ?? LEGACY_FALLBACK_BY_FILE[file] ?? null;
}

/**
 * Ob eine Zone HEUTE tatsächlich als 3D-Arena darstellbar ist: Manifest muss existieren/gültig
 * sein UND Boden+Kulisse müssen zu einer echten URL auflösen (Mira-Lieferung ODER Legacy-
 * Fallback). Props sind NICHT Teil dieser Prüfung (fehlende Prop-Dateien fallen auf die
 * prozedurale Platzhalter-Silhouette zurück, s.u. — rein kosmetisch, blockiert die Zone nicht).
 * Dies ist die einzige Stelle, die `flag.ts` `isArena25dActive` befragt (s. dort) — ersetzt den
 * alten hartkodierten `zoneId === ARENA25D_ZONE_ID`-Vergleich aus Task #330.
 */
export function isZoneArenaCapable(zoneId: string | null | undefined): boolean {
  const manifest = getZoneManifest(zoneId);
  if (!manifest) return false;
  return !!resolveArenaAssetUrl(manifest.ground) && !!resolveArenaAssetUrl(manifest.backdrop);
}

// ── 2. Prozedurale Platzhalter-Silhouetten für Props ────────────────────────────────────────
export interface PlaceholderPropTexture {
  texture: THREE.CanvasTexture;
  /** Breite/Höhe der gezeichneten Silhouette — ersetzt die Bild-Aspect-Ratio eines echten Assets. */
  aspect: number;
  /** Alle drei Silhouetten sind bewusst BODENBÜNDIG gezeichnet (unterste Canvas-Zeile trägt
   *  bereits Alpha) — kein `measureSpriteBaseline`-Aufruf nötig, `insetFrac` ist exakt 0. */
  insetFrac: 0;
  footSpanFrac: number;
  footCenterFrac: 0.5;
}

function drawTreeSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#1c2415";
  const trunkW = w * 0.12;
  ctx.fillRect(w / 2 - trunkW / 2, h * 0.7, trunkW, h * 0.3);
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.4, w * 0.36, 0, Math.PI * 2);
  ctx.arc(w * 0.3, h * 0.54, w * 0.26, 0, Math.PI * 2);
  ctx.arc(w * 0.7, h * 0.54, w * 0.26, 0, Math.PI * 2);
  ctx.fill();
}
function drawBushSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#22301a";
  ctx.beginPath();
  ctx.arc(w * 0.28, h * 0.76, w * 0.3, 0, Math.PI * 2);
  ctx.arc(w * 0.56, h * 0.64, w * 0.34, 0, Math.PI * 2);
  ctx.arc(w * 0.8, h * 0.78, w * 0.24, 0, Math.PI * 2);
  ctx.fill();
}
function drawRockSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = "#3a352c";
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h);
  ctx.lineTo(w * 0.04, h * 0.6);
  ctx.lineTo(w * 0.32, h * 0.36);
  ctx.lineTo(w * 0.58, h * 0.26);
  ctx.lineTo(w * 0.84, h * 0.44);
  ctx.lineTo(w * 0.96, h * 0.7);
  ctx.lineTo(w * 0.9, h);
  ctx.closePath();
  ctx.fill();
}

/**
 * Baut je Aufruf eine FRISCHE prozedurale Silhouette — bewusst KEIN modulweiter Cache (anders
 * abgewogen als z.B. die Bild-URL-Lookup-Maps oben): Arena25DStage.tsx' bestehende Aufräum-Routine
 * (`scene.traverse` im Effect-Cleanup, s. dortiges JSDoc) disposed JEDE Mesh-Textur beim Unmount
 * generisch — ein gecachtes, modulweit GETEILTES Texture-Objekt würde dabei nach dem ersten
 * Unmount für alle weiteren Mounts kaputtgehen (disposed GPU-Handle, aber weiterhin im Cache
 * zurückgegeben). Genau das bestehende Muster von `makeShadowTexture`/`makeSunGlowTexture` in
 * Arena25DStage.tsx (dort ebenfalls fresh-per-mount, nicht gecacht) — hier übernommen statt neu
 * erfunden. Kosten: ein kleiner Canvas-Draw pro Prop pro Mount (selten, kein Kampf-Tick-Pfad).
 */
export function makePlaceholderPropTexture(kind: PropPlaceholderKind): PlaceholderPropTexture {
  const w = 256;
  const h = kind === "tree" ? 384 : 224;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  if (kind === "tree") drawTreeSilhouette(ctx, w, h);
  else if (kind === "bush") drawBushSilhouette(ctx, w, h);
  else drawRockSilhouette(ctx, w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  const footSpanFrac = kind === "tree" ? 0.14 : kind === "bush" ? 0.72 : 0.86;
  return { texture, aspect: w / h, insetFrac: 0, footSpanFrac, footCenterFrac: 0.5 };
}
