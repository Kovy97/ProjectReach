/**
 * 0.4.0-Arena, Logik-Welle 1 (Chef-Entscheid 2026-08-03, s. design/battle-040-arena-produktion.md
 * §1/§5): Zonen-Manifest-Schema + Auto-Discovery-Registry.
 *
 * EIN JSON pro arena-fähiger Zone unter `manifests/<zoneId>.json` (Dateiname = Zone-ID aus dem
 * Content-Katalog, `content.zones[].id`) beschreibt alles, was die 3D-Szene für diese Zone
 * braucht: Boden-/Kulissenbild (Dateiname, aufgelöst über `assets.ts`), Licht-/Nebel-/Grade-Werte
 * und dekorative Props. Fehlt eine Zone hier (kein `<zoneId>.json` ODER eine, die die Validierung
 * nicht besteht), bleibt sie NICHT arena-fähig — Mount-Switch in CombatPage.tsx fällt automatisch
 * auf die klassische 2D-Ansicht zurück (s. `assets.ts` `isZoneArenaCapable`, von `flag.ts`
 * `isArena25dActive` geprüft). Kein Sonderfall pro Zone im Code nötig, rein datengetrieben.
 *
 * Isolationsvertrag (README.md): dieses Modul lebt in `components/arena25d/`, wird ausschließlich
 * von anderen Dateien in diesem Ordner importiert (`assets.ts`, `Arena25DStage.tsx`, `flag.ts`) —
 * in Produktions-Builds ist der komplette Ordner unerreichbar (s. README "Bundle-Beweis"), also
 * auch dieses Modul samt der per `import.meta.glob` eingesammelten Manifest-JSONs (anders als die
 * beiden Bild-Assets in `assets.ts` sind JSON-Importe reine JS-Werte, keine Vite-Asset-Pipeline-
 * Dateien — sie verschwinden mit dem Rest des toten Moduls vollständig, s. Abschlussbericht
 * "Bundle-Grep" für die empirische Verifikation).
 */

/** Sättigung/Farbtemperatur/Lift für den billigen CSS-`filter`-Grade auf dem Canvas-Element
 *  (s. Arena25DStage.tsx `applyGradeFilter`) — KEIN Post-Processing-Pass. */
export interface ZoneManifestGrade {
  /** `saturate()`-Faktor, 1 = neutral (Original), 0 = graustufig, >1 = übersättigt. Muss >= 0 sein. */
  saturation: number;
  /** `hue-rotate()`-Richtung/Stärke, grob "-1 (kühl/blau) .. 0 (neutral) .. 1 (warm/orange)" —
   *  reine Stimmungs-Annäherung (Grad-Zuordnung s. Arena25DStage.tsx), keine physikalische Farbtemperatur. */
  temperature: number;
  /** Optional: `brightness()`-Offset, -1..1, 0 = neutral (Default, falls weggelassen). */
  lift?: number;
}

/** Sonne (DirectionalLight) + Ambient (HemisphereLight) + Fog + Grade — eine Zone, ein Werte-Satz. */
export interface ZoneManifestLighting {
  /** CSS-Hex-Farbe der Sonne, z.B. "#ffd9a0". */
  sunColor: string;
  /** DirectionalLight-Intensität (three.js-Einheiten, kein physikalisches Lumen). */
  sunIntensity: number;
  /** Elevationswinkel über dem Horizont in Grad, 0 = Horizont/Streiflicht, 90 = Zenit. */
  sunAngleDeg: number;
  /** Kompass-Winkel um die Y-Achse in Grad — 0 = von der Kamera-Seite (Frontlicht auf den
   *  zylindrischen Billboards, s. Arena25DStage.tsx "N·L-Herleitung"), 90 = von rechts (+X),
   *  180 = von hinter der Kulisse (würde Figuren silhouettieren — vermeiden), 270/-90 = von links. */
  sunAzimuthDeg: number;
  /** CSS-Hex-Farbe des Himmels-Fülllichts (HemisphereLight-Himmelsfarbe). */
  ambientColor: string;
  /** HemisphereLight-Intensität. */
  ambientIntensity: number;
  /** CSS-Hex-Farbe des Nebels (nur wirksam, wenn `fogDensity > 0`). */
  fogColor: string;
  /** `THREE.FogExp2`-Dichte, 0 = kein Nebel (Default-sicherer Wert für helle Zonen). Muss >= 0 sein. */
  fogDensity: number;
  grade: ZoneManifestGrade;
}

export type ZonePropLayer = "back" | "mid";

/** Rein kosmetische Platzhalter-Silhouette (s. assets.ts `getPlaceholderPropTexture`), NUR wirksam
 *  solange die echte Mira-Datei (`file`) noch nicht unter `assets/arena/` liegt — kein Teil des
 *  Chef-Auftragsschemas (§2 Asset-Vertrag kennt nur `file/x/z/scale/flip/layer`), rein optionale
 *  Erweiterung für den Dev-Fixture-Pfad. Sobald Mira liefert, wird dieses Feld ignoriert. */
export type PropPlaceholderKind = "tree" | "bush" | "rock";
export const PLACEHOLDER_KINDS: readonly PropPlaceholderKind[] = ["tree", "bush", "rock"];

export interface ZoneManifestProp {
  /** Ziel-Dateiname unter `assets/arena/` (Mira-Namensschema `arena_<zoneId>_prop_<nn>.webp`,
   *  s. design/battle-040-arena-produktion.md §2) — reine Dateiname, kein Pfad. */
  file: string;
  /** Boden-X-Position (Weltkoordinaten, dieselbe Achse wie PLAYER_X/MONSTER_X in Arena25DStage.tsx). */
  x: number;
  /** Boden-Z-Position (Weltkoordinaten, dieselbe Achse wie PLAYER_Z/MONSTER_Z). */
  z: number;
  /** Größen-Multiplikator gegen `PROP_BASE_HEIGHT` (Arena25DStage.tsx), muss > 0 sein. */
  scale: number;
  /** Horizontal spiegeln (Variation ohne zweites Asset). */
  flip?: boolean;
  /** "back" = an der Kulissen-Naht (kaschiert den Boden→Kulisse-Übergang), "mid" = auf der
   *  Bodenfläche außerhalb der Kampf-Mitte. */
  layer: ZonePropLayer;
  /** s. Modul-JSDoc oben — nur für den Platzhalter-Pfad relevant. */
  placeholderKind?: PropPlaceholderKind;
  /** Neigung des Billboards um die Blickachse in Grad (Scene-Builder-Vorbereitung; optional,
   *  Default 0). Vom gestoppten Builder-Agenten in sceneEnvironment.ts bereits konsumiert —
   *  additiv im Schema nachgezogen (CEO-Integritätsfix 04.08.). */
  rotDeg?: number;
  /** Flach auf den Boden legen (Boden-Clutter-Modus statt aufrechtes Billboard; optional). */
  flat?: boolean;
}

export interface ZoneManifest {
  /** Muss exakt dem Dateinamen (ohne `.json`) entsprechen — Konsistenz-Check in der Registry unten. */
  zoneId: string;
  /** Ziel-Dateiname der Bodentextur unter `assets/arena/` (Mira-Schema `arena_<zoneId>_ground.webp`). */
  ground: string;
  /** Ziel-Dateiname der Kulissentextur unter `assets/arena/` (Mira-Schema `arena_<zoneId>_backdrop.webp`). */
  backdrop: string;
  lighting: ZoneManifestLighting;
  props: ZoneManifestProp[];
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

/**
 * Validiert ein rohes (aus JSON geparstes) Objekt gegen `ZoneManifest`. Strikt: JEDE Abweichung
 * (fehlendes/falsch typisiertes Feld, ungültiger `layer`-Wert, `scale <= 0`, …) macht das GESAMTE
 * Manifest ungültig (kein Teil-Fallback auf "die gültigen Props rendern, den Rest ignorieren") —
 * eine halb-kaputte Zone soll dem Designer laut+früh auffallen (Konsolen-Report mit ALLEN
 * gefundenen Problemen auf einmal), nicht still ein unvollständiges Bild zeigen. Rückgabe `null`
 * bedeutet für den Aufrufer (Registry unten): Zone bleibt NICHT arena-fähig, 2D-Fallback greift.
 */
export function validateZoneManifest(raw: unknown, context: string): ZoneManifest | null {
  const problems: string[] = [];
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    console.error(`[arena25d] Manifest ${context}: Wurzel ist kein Objekt — Zone bleibt 2D.`);
    return null;
  }
  const m = raw as Record<string, unknown>;

  if (!isNonEmptyString(m.zoneId)) problems.push("zoneId fehlt oder ist kein nicht-leerer String");
  if (!isNonEmptyString(m.ground)) problems.push("ground fehlt oder ist kein nicht-leerer String");
  if (!isNonEmptyString(m.backdrop)) problems.push("backdrop fehlt oder ist kein nicht-leerer String");

  let lighting: ZoneManifestLighting | null = null;
  if (typeof m.lighting !== "object" || m.lighting === null || Array.isArray(m.lighting)) {
    problems.push("lighting fehlt oder ist kein Objekt");
  } else {
    const l = m.lighting as Record<string, unknown>;
    const lp: string[] = [];
    if (!isNonEmptyString(l.sunColor)) lp.push("lighting.sunColor");
    if (!isFiniteNumber(l.sunIntensity)) lp.push("lighting.sunIntensity");
    if (!isFiniteNumber(l.sunAngleDeg)) lp.push("lighting.sunAngleDeg");
    if (!isFiniteNumber(l.sunAzimuthDeg)) lp.push("lighting.sunAzimuthDeg");
    if (!isNonEmptyString(l.ambientColor)) lp.push("lighting.ambientColor");
    if (!isFiniteNumber(l.ambientIntensity)) lp.push("lighting.ambientIntensity");
    if (!isNonEmptyString(l.fogColor)) lp.push("lighting.fogColor");
    if (!isFiniteNumber(l.fogDensity) || (l.fogDensity as number) < 0) lp.push("lighting.fogDensity (muss Zahl >= 0 sein)");

    let grade: ZoneManifestGrade | null = null;
    if (typeof l.grade !== "object" || l.grade === null || Array.isArray(l.grade)) {
      lp.push("lighting.grade fehlt oder ist kein Objekt");
    } else {
      const g = l.grade as Record<string, unknown>;
      const gp: string[] = [];
      if (!isFiniteNumber(g.saturation) || (g.saturation as number) < 0) gp.push("lighting.grade.saturation (muss Zahl >= 0 sein)");
      if (!isFiniteNumber(g.temperature)) gp.push("lighting.grade.temperature");
      if (g.lift !== undefined && !isFiniteNumber(g.lift)) gp.push("lighting.grade.lift (falls gesetzt, muss es eine Zahl sein)");
      lp.push(...gp);
      if (gp.length === 0) {
        grade = { saturation: g.saturation as number, temperature: g.temperature as number, lift: g.lift as number | undefined };
      }
    }
    problems.push(...lp);
    if (lp.length === 0 && grade) {
      lighting = {
        sunColor: l.sunColor as string,
        sunIntensity: l.sunIntensity as number,
        sunAngleDeg: l.sunAngleDeg as number,
        sunAzimuthDeg: l.sunAzimuthDeg as number,
        ambientColor: l.ambientColor as string,
        ambientIntensity: l.ambientIntensity as number,
        fogColor: l.fogColor as string,
        fogDensity: l.fogDensity as number,
        grade,
      };
    }
  }

  const props: ZoneManifestProp[] = [];
  if (m.props !== undefined) {
    if (!Array.isArray(m.props)) {
      problems.push("props muss (falls gesetzt) ein Array sein");
    } else {
      m.props.forEach((rawProp, i) => {
        if (typeof rawProp !== "object" || rawProp === null || Array.isArray(rawProp)) {
          problems.push(`props[${i}] ist kein Objekt`);
          return;
        }
        const p = rawProp as Record<string, unknown>;
        const pp: string[] = [];
        if (!isNonEmptyString(p.file)) pp.push("file");
        if (!isFiniteNumber(p.x)) pp.push("x");
        if (!isFiniteNumber(p.z)) pp.push("z");
        if (!isFiniteNumber(p.scale) || (p.scale as number) <= 0) pp.push("scale (muss Zahl > 0 sein)");
        if (p.layer !== "back" && p.layer !== "mid") pp.push('layer (muss "back" oder "mid" sein)');
        if (p.flip !== undefined && typeof p.flip !== "boolean") pp.push("flip (falls gesetzt, muss es boolean sein)");
        if (p.placeholderKind !== undefined && !PLACEHOLDER_KINDS.includes(p.placeholderKind as PropPlaceholderKind)) {
          pp.push(`placeholderKind (falls gesetzt, muss es eines von ${PLACEHOLDER_KINDS.join("/")} sein)`);
        }
        // Scene-Builder-Nachtrag (CEO-Integritätsfix 04.08. hatte `rotDeg`/`flat` bereits ins
        // TS-Schema aufgenommen, s. `ZoneManifestProp`-JSDoc — HIER, in der eigentlichen
        // Validierung/Objekt-Konstruktion, fehlten sie aber noch: ein Manifest mit gesetztem
        // `rotDeg`/`flat` hätte diese Felder bis jetzt STUMM verloren, sowohl beim echten
        // Zonen-Laden (Registry-Aufbau unten ruft dieselbe Funktion) als auch beim Scene-Builder-
        // Re-Import — Roundtrip war dadurch fundamental kaputt. Nachgezogen.
        if (p.rotDeg !== undefined && !isFiniteNumber(p.rotDeg)) pp.push("rotDeg (falls gesetzt, muss es eine Zahl sein)");
        if (p.flat !== undefined && typeof p.flat !== "boolean") pp.push("flat (falls gesetzt, muss es boolean sein)");
        if (pp.length > 0) {
          problems.push(`props[${i}]: ${pp.join(", ")}`);
          return;
        }
        props.push({
          file: p.file as string,
          x: p.x as number,
          z: p.z as number,
          scale: p.scale as number,
          flip: p.flip as boolean | undefined,
          layer: p.layer as ZonePropLayer,
          placeholderKind: p.placeholderKind as PropPlaceholderKind | undefined,
          rotDeg: p.rotDeg as number | undefined,
          flat: p.flat as boolean | undefined,
        });
      });
    }
  }

  if (problems.length > 0) {
    console.error(
      `[arena25d] Manifest ${context} ungueltig -- Zone bleibt NICHT arena-faehig (2D-Fallback):\n  - ${problems.join("\n  - ")}`,
    );
    return null;
  }

  return {
    zoneId: m.zoneId as string,
    ground: m.ground as string,
    backdrop: m.backdrop as string,
    lighting: lighting!,
    props,
  };
}

// ── Auto-Discovery-Registry (Muster: zoneMaps.ts `ZONE_MAP_JSONS`, s. dortiges Modul-JSDoc) ────
// Neue Zone = neues `manifests/<zoneId>.json` ablegen, sonst nichts — kein Registrierungscode
// pro Zone. `eager: true` bündelt den JSON-Inhalt als reinen JS-Wert (KEIN Asset-Pipeline-Byte,
// anders als die Bild-Importe in assets.ts) direkt in dieses Modul.
const RAW_MANIFESTS = import.meta.glob<unknown>("./manifests/*.json", { eager: true, import: "default" });

const REGISTRY: Record<string, ZoneManifest> = {};
// Bundle-Beweis-kritisch, s. README.md "Bundle-Beweis": DIESES `if` ist NICHT optional. Anders als
// die geschützten Funktionsaufrufe in flag.ts/styles.ts (`installDevHotkeyOnce`/
// `injectArena25dStyles`, die INTERN früh zurückkehren, aber von außen unbedingt aufgerufen
// werden) ist der Registry-Aufbau reiner TOP-LEVEL-Modul-Code mit echten Seiteneffekten
// (`console.error`). Ohne dieses Gate würde er in JEDEM Build laufen, sobald irgendein Code diese
// Datei importiert — UNABHÄNGIG davon, ob `getZoneManifest` je aufgerufen wird (ES-Module führen
// Top-Level-Code beim ERSTEN Import aus, nicht erst bei Nutzung der Exporte). Rollup könnte den
// Aufbau dann NICHT als tot erkennen (ein Codeblock mit Seiteneffekten blockiert Tree-Shaking,
// selbst wenn sein Ergebnis nirgends mehr gelesen wird) — empirisch bestätigt: eine frühere
// Fassung OHNE dieses Gate hinterließ echte JSON-Inhalte (u.a. `arena_pastures_prop_01`) UND
// diese `console.error`-Strings im Produktions-Bundle, trotz `ARENA25D_SUPPORTED` an jeder
// Aufrufstelle. Mit dem Gate faltet Vite `import.meta.env.DEV` in Produktions-Builds zur
// literalen Konstante `false` zusammen (identischer Mechanismus wie `ARENA25D_SUPPORTED` in
// flag.ts, direkt statt über einen Re-Export gelesen, um KEINEN Zyklus zu diesem von flag.ts
// importierten Modul zu erzeugen) — der komplette Block samt der geglobbten JSON-Importe wird
// dadurch nachweislich toter Code (s. Abschlussbericht "Bundle-Grep" für die Verifikation).
if (import.meta.env.DEV) {
  for (const [path, data] of Object.entries(RAW_MANIFESTS)) {
    const fileId = path.split("/").pop()?.replace(/\.json$/, "");
    if (!fileId) continue;
    const parsed = validateZoneManifest(data, path);
    if (!parsed) continue;
    if (parsed.zoneId !== fileId) {
      console.error(
        `[arena25d] Manifest ${path}: zoneId "${parsed.zoneId}" passt nicht zum Dateinamen "${fileId}.json" -- ` +
          `Datei wird ignoriert (2D-Fallback fuer "${fileId}").`,
      );
      continue;
    }
    REGISTRY[fileId] = parsed;
  }
}

/** Manifest einer Zone, oder `null` falls keins hinterlegt/gueltig ist (⇒ 2D-Fallback). */
export function getZoneManifest(zoneId: string | null | undefined): ZoneManifest | null {
  return zoneId ? (REGISTRY[zoneId] ?? null) : null;
}

/** Scene-Builder-Bedarf (Chef-Auftrag "Arena-Scene-Builder"): alle aktuell registrierten, GÜLTIGEN
 *  Zonen-IDs für das Zonen-Dropdown des Builders — derselbe `REGISTRY`-Lesezugriff wie
 *  `getZoneManifest`, keine zweite Datenquelle/kein doppeltes Einlesen der JSONs. Leer außerhalb von
 *  Dev-Builds (Registry bleibt dann ungefüllt, s. `if (import.meta.env.DEV)`-Gate oben). */
export function listZoneManifestIds(): string[] {
  return Object.keys(REGISTRY).sort();
}
