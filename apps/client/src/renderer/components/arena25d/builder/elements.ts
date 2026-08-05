/**
 * Scene-Builder — Element-Datenmodell + reine Manifest-Export/Import-Helfer. Trennung von
 * `SceneBuilderApp.tsx` (React+three.js-Wiring), damit die reine Datenlogik (Klonen/Export/Import)
 * unabhängig testbar/lesbar bleibt — dieselbe Modul-Aufteilungs-Idee wie `choreography.ts` ggü.
 * `Arena25DStage.tsx` (s. dortiges Modul-JSDoc).
 */
import type { ZoneManifest, ZoneManifestBackdropLayout, ZoneManifestProp } from "../manifest";
import { validateZoneManifest } from "../manifest";
import { BACKDROP_HEIGHT, BACKDROP_Z, type ResolvedBackdropLayout } from "../sceneEnvironment";

/** Ein platziertes Prop im Builder — `ZoneManifestProp` PLUS eine synthetische, nur im Builder
 *  gültige `id` (React-Key/Selektions-Handle, landet NIE im exportierten Manifest, s. `stripIds`). */
export interface BuilderElement {
  id: number;
  def: ZoneManifestProp;
}

let idCounter = 1;
/** Monotone, session-weite ID — muss über Undo/Redo/Zonenwechsel hinweg NIE kollidieren (React-Keys
 *  müssen stabil+eindeutig bleiben, selbst wenn ein Undo einen alten Snapshot mit alten IDs zurückholt). */
export function nextElementId(): number {
  idCounter += 1;
  return idCounter;
}

export function makeDefaultPropDef(file: string, x: number, z: number, placeholderKind?: ZoneManifestProp["placeholderKind"]): ZoneManifestProp {
  return { file, x, z, scale: 1, flip: false, layer: "mid", rotDeg: 0, flat: false, placeholderKind };
}

export function cloneElementOffset(el: BuilderElement): BuilderElement {
  return { id: nextElementId(), def: { ...el.def, x: el.def.x + 0.6, z: el.def.z + 0.3 } };
}

/** Reihenfolge fürs Export-JSON: gleiche Feldreihenfolge wie die bestehenden `manifests/*.json`-
 *  Dateien (s. `pastures.json`) — macht einen Diff gegen die von Hand gepflegte Datei lesbar, statt
 *  dass jede Kopieraktion die Feldreihenfolge willkürlich umwürfelt (`JSON.stringify` behält
 *  Insertions-Reihenfolge bei Objekt-Literalen). `placeholderKind` wird NUR mitgeschrieben, wenn
 *  gesetzt (Prod-Manifeste ohne echte Mira-Datei sollen den TODO-Marker-Charakter behalten, s.
 *  `manifest.ts` `PropPlaceholderKind`-JSDoc) — `rotDeg`/`flat` NUR, wenn sie vom Default abweichen,
 *  damit unveränderte Props exakt wie vor dem Scene-Builder aussehen (kein Diff-Rauschen für Props,
 *  die der Chef gar nicht angefasst hat).
 */
export function propToExportJson(def: ZoneManifestProp): Record<string, unknown> {
  const out: Record<string, unknown> = { file: def.file, x: round3(def.x), z: round3(def.z), scale: round3(def.scale) };
  if (def.flip) out.flip = true;
  out.layer = def.layer;
  if (def.placeholderKind) out.placeholderKind = def.placeholderKind;
  if (def.rotDeg) out.rotDeg = round3(def.rotDeg);
  if (def.flat) out.flat = true;
  return out;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Nur der `props`-Block, formatiert — für den "Manifest kopieren"-Button (Chef-Auftrag Punkt 7). */
export function exportPropsBlockJson(elements: BuilderElement[]): string {
  return JSON.stringify(elements.map((e) => propToExportJson(e.def)), null, 2);
}

/** Kulissen-Platzierung → Export-Block. Seit dem Chef-Auftrag 05.08. ein ECHTES Schema-Feld
 *  (`backdropLayout`, s. manifest.ts — löst das frühere informelle `_backdropExperimental`-
 *  Kommentarfeld ab). Analog zu `propToExportJson`s rotDeg/flat-Regel werden nur Felder
 *  geschrieben, die vom Default (Code-Konstanten) abweichen — steht ALLES auf Default, entfällt
 *  der Block komplett (die 3 Bestands-Manifeste ohne Block bleiben beim Roundtrip blockfrei,
 *  kein Diff-Rauschen). */
export function backdropLayoutToExportJson(layout: ResolvedBackdropLayout): ZoneManifestBackdropLayout | null {
  const out: ZoneManifestBackdropLayout = {};
  if (round3(layout.z) !== round3(BACKDROP_Z)) out.z = round3(layout.z);
  if (round3(layout.height) !== round3(BACKDROP_HEIGHT)) out.height = round3(layout.height);
  if (round3(layout.widthScale) !== 1) out.widthScale = round3(layout.widthScale);
  if (round3(layout.yOffset) !== 0) out.yOffset = round3(layout.yOffset);
  return Object.keys(out).length > 0 ? out : null;
}

/** Das VOLLE Zonen-Manifest (inkl. evtl. live editierter Licht-/Kulissen-Werte) — für den
 *  Download-Button. Feldreihenfolge = Schema-Reihenfolge der Bestands-Manifeste, `backdropLayout`
 *  direkt nach `backdrop` (Datei ↔ Platzierung nebeneinander lesbar). */
export function buildFullManifestExport(
  zoneId: string,
  ground: string,
  backdrop: string,
  lighting: ZoneManifest["lighting"],
  elements: BuilderElement[],
  backdropLayout?: ResolvedBackdropLayout,
): string {
  const manifest: Record<string, unknown> = { zoneId, ground, backdrop };
  const layoutBlock = backdropLayout ? backdropLayoutToExportJson(backdropLayout) : null;
  if (layoutBlock) manifest.backdropLayout = layoutBlock;
  manifest.lighting = lighting;
  manifest.props = elements.map((e) => propToExportJson(e.def));
  return JSON.stringify(manifest, null, 2);
}

/** Re-Import-Pfad (Roundtrip-Beweis, Chef-Auftrag Punkt 7): parst rohen JSON-Text und validiert
 *  STRIKT gegen dasselbe `validateZoneManifest`, das auch die Auto-Discovery-Registry beim
 *  Zonen-Laden benutzt — ein Export, der hier durchfällt, würde auch als `<zoneId>.json` im echten
 *  Ordner NICHT geladen, der Builder ist also seine eigene Schema-Kontrollinstanz. Gibt bei Fehlern
 *  `manifest: null` zurück (Fehlerdetails in der Konsole, s. `validateZoneManifest`).
 *
 *  Legacy-Brücke: VOR dem Schema-Feld `backdropLayout` (05.08.) exportierte der Builder die
 *  Kulissen-Regler als informelles `_backdropExperimental`-Feld — alte Chef-Downloads sollen
 *  weiterhin importierbar bleiben, daher wird es hier (nur falls noch KEIN `backdropLayout`
 *  vorhanden ist) in den echten Block übersetzt und dann abgetrennt. */
export function parseManifestFile(raw: string): { manifest: ZoneManifest | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scene-builder] Import: kein gültiges JSON.", err);
    return { manifest: null };
  }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const be = obj._backdropExperimental;
    if (obj.backdropLayout === undefined && be && typeof be === "object" && !Array.isArray(be)) {
      const b = be as Record<string, unknown>;
      if (typeof b.z === "number" && typeof b.height === "number") obj.backdropLayout = { z: b.z, height: b.height };
    }
    delete obj._backdropExperimental;
  }
  const manifest = validateZoneManifest(parsed, "scene-builder-import");
  return { manifest };
}

export function elementsFromManifest(manifest: ZoneManifest): BuilderElement[] {
  return manifest.props.map((def) => ({ id: nextElementId(), def }));
}
