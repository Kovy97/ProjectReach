/**
 * Scene-Builder — Element-Datenmodell + reine Manifest-Export/Import-Helfer. Trennung von
 * `SceneBuilderApp.tsx` (React+three.js-Wiring), damit die reine Datenlogik (Klonen/Export/Import)
 * unabhängig testbar/lesbar bleibt — dieselbe Modul-Aufteilungs-Idee wie `choreography.ts` ggü.
 * `Arena25DStage.tsx` (s. dortiges Modul-JSDoc).
 */
import type { ZoneManifest, ZoneManifestProp } from "../manifest";
import { validateZoneManifest } from "../manifest";

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

/** Das VOLLE Zonen-Manifest (inkl. evtl. live editierter Licht-Werte) — für den Download-Button.
 *  `BACKDROP_Z`/`BACKDROP_HEIGHT` sind laut Auftrag "experimentell, Export vermerkt sie als
 *  Kommentar" — echtes JSON kennt keine Kommentare, daher als zusätzliches `"_backdropExperimental"`-
 *  Feld (führender Unterstrich signalisiert "kein Schema-Feld, informell") statt eines echten
 *  Schema-Eintrags; `validateZoneManifest` ignoriert unbekannte Top-Level-Felder ohnehin nicht
 *  (strikt!) — deshalb wird dieses Feld vor dem Re-Import wieder abgetrennt, s. `parseManifestFile`. */
export function buildFullManifestExport(
  zoneId: string,
  ground: string,
  backdrop: string,
  lighting: ZoneManifest["lighting"],
  elements: BuilderElement[],
  backdropExperimental?: { z: number; height: number },
): string {
  const manifest: Record<string, unknown> = {
    zoneId,
    ground,
    backdrop,
    lighting,
    props: elements.map((e) => propToExportJson(e.def)),
  };
  if (backdropExperimental) {
    manifest._backdropExperimental = {
      note: "Scene-Builder-Live-Regler, KEIN Schema-Feld — Chef-Entscheid nötig, ob BACKDROP_Z/HEIGHT ins Manifest aufgenommen werden (s. sceneEnvironment.ts).",
      z: round3(backdropExperimental.z),
      height: round3(backdropExperimental.height),
    };
  }
  return JSON.stringify(manifest, null, 2);
}

export interface ImportResult {
  manifest: ZoneManifest | null;
  backdropExperimental: { z: number; height: number } | null;
}

/** Re-Import-Pfad (Roundtrip-Beweis, Chef-Auftrag Punkt 7): parst rohen JSON-Text, trennt das
 *  informelle `_backdropExperimental`-Feld ab (s.o.) und validiert den Rest STRIKT gegen dasselbe
 *  `validateZoneManifest`, das auch die Auto-Discovery-Registry beim Zonen-Laden benutzt — ein
 *  Export, der hier durchfällt, würde auch als `<zoneId>.json` im echten Ordner NICHT geladen, der
 *  Builder ist also seine eigene Schema-Kontrollinstanz. Gibt bei Fehlern `manifest: null` zurück
 *  (Fehlerdetails landen wie gewohnt in der Konsole, s. `validateZoneManifest`). */
export function parseManifestFile(raw: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[scene-builder] Import: kein gültiges JSON.", err);
    return { manifest: null, backdropExperimental: null };
  }
  let backdropExperimental: { z: number; height: number } | null = null;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const be = obj._backdropExperimental;
    if (be && typeof be === "object") {
      const b = be as Record<string, unknown>;
      if (typeof b.z === "number" && typeof b.height === "number") backdropExperimental = { z: b.z, height: b.height };
    }
    delete obj._backdropExperimental;
  }
  const manifest = validateZoneManifest(parsed, "scene-builder-import");
  return { manifest, backdropExperimental };
}

export function elementsFromManifest(manifest: ZoneManifest): BuilderElement[] {
  return manifest.props.map((def) => ({ id: nextElementId(), def }));
}
