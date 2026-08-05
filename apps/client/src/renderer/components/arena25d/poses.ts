/**
 * 0.4.0-Arena, Posen-Pilot (Chef-GO 2026-08-05, s. design/battle-040-pose-pilot.md): Auto-Discovery
 * für Kampf-Posen-Sprites — Sprite-Posen statt Animations-Clips ("3–5 konsistente Einzelbilder pro
 * Kreatur", Bildmodelle halten Charaktere über mehr Frames nicht konsistent, Video hat kein Alpha).
 * Pilot: Chicken (Pastures), Monster-only — Spieler-Posen sind laut Spec ein SPÄTERER Rollout mit
 * demselben Vokabular, hier bewusst noch nicht verdrahtet (kein Player-Ordner gegattet).
 *
 * Gating/Struktur EXAKT nach dem Muster von `assets.ts` (dortiges Moduldoc gilt 1:1): ein
 * `import.meta.glob(..., { eager: true, query: "?url", import: "default" })` über den künftigen
 * Mira-Zielordner — 0 Treffer heute (Mira liefert die echten Dateien noch nicht) ist KEIN Fehler,
 * füllt sich mit jeder Lieferung ohne Codeänderung. Dieselbe akzeptierte Bundle-Ausnahme wie dort:
 * ein Bild-Asset-Import lässt sich nicht als String tarnen, ein echter Produktions-Build enthält bei
 * 0 gelieferten Dateien dadurch aber auch 0 zusätzliche Bytes — sobald echte `*_pose_*.webp`-Dateien
 * existieren, werden nur SIE (inert, unreferenziert von jedem Live-Codepfad außerhalb des ohnehin
 * nur in Dev-Builds erreichbaren arena25d-Moduls) mitkopiert, keine neuen JS-Bezeichner im
 * Produktions-Bundle (s. README.md "Bekannte, bewusst akzeptierte Ausnahme").
 *
 * Schlüssel-Konvention (Auftrag Punkt 1, "System generisch halten — Schlüssel = Sprite-Dateiname"):
 * eine Idle-Textur `<fighterId>.webp` bekommt ihr Posen-Set über EXAKT denselben Dateinamen-Stamm
 * `<fighterId>_pose_{windup,strike,hit}.webp` im selben Ordner zugeordnet. Statt diesen Stamm aus
 * der (im Produktions-Build ggf. gehashten) Idle-Bild-URL zurückzuparsen, baut dieses Modul beide
 * Zuordnungen (Idle-URL UND Posen-URLs) aus dem UNVERÄNDERTEN Glob-`path` (dem Quellpfad, den Vite
 * VOR jeder Asset-Hash-Umschreibung kennt — dasselbe Prinzip wie `monsters.ts` `BY_ID`) und verknüpft
 * sie über den gemeinsamen Stamm zu einer `idle-URL -> PoseSet`-Tabelle. `Arena25DStage.tsx` muss
 * dadurch nie eine Monster-ID kennen (die hat es laut Isolationsvertrag auch nicht als Prop) — es
 * reicht ihm, `getPoseSet(imgSrc)` mit genau der URL aufzurufen, die es ohnehin schon für die
 * Idle-Textur lädt (`getMonsterSrc`/`getEliteMonsterSrc` aus `monsters.ts`, 1:1 durchgereicht von
 * CombatPage.tsx) — funktioniert identisch im Dev-Server (unhashte Pfade) UND im gehashten
 * Produktions-Build, weil beide Tabellen aus DEMSELBEN Vite-Asset-Pipeline-Lauf stammen.
 */

export type PoseName = "windup" | "strike" | "hit";

/** Ein (ggf. unvollständiges) Posen-Set — reflektiert 1:1, was auf der Platte liegt. Die "Fehlt eine
 *  Pose oder das ganze Set ⇒ Fallback"-Entscheidung (Auftrag, bindend) trifft NICHT dieses Modul,
 *  sondern der Preload-Gate in `Arena25DStage.tsx` (erst `posesReady`, wenn alle drei geladen sind)
 *  — hier wird bewusst nur roh gespiegelt, was existiert, keine Vollständigkeits-Policy verdrahtet. */
export interface PoseSet {
  windup?: string;
  strike?: string;
  hit?: string;
}

// ── 1. Idle-Bilder desselben Ordners (Spiegel von monsters.ts' BY_ID, hier lokal statt importiert —
//    monsters.ts exportiert seine BY_ID-Map nicht, ein zweiter kleiner Glob ist günstiger als monsters.ts
//    dafür anzufassen, was außerhalb des Isolations-Vertrags läge). `_pose_`-Dateien werden HIER
//    explizit ausgeschlossen (sie matchen `*.{png,webp}` sonst mit), sonst würde jede Posen-Datei sich
//    selbst fälschlich als eigene "Idle-Identität" eintragen. ─────────────────────────────────────────
const IDLE_IMAGES = import.meta.glob<string>("../../assets/monsters/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const IDLE_URL_BY_FIGHTER_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(IDLE_IMAGES)) {
  const file = path.split("/").pop();
  if (!file || file.includes("_pose_")) continue;
  const id = file.replace(/\.(png|webp)$/, "");
  IDLE_URL_BY_FIGHTER_ID[id] = url;
}

// ── 2. Posen-Bilder: <fighterId>_pose_<windup|strike|hit>.webp ────────────────────────────────────
const POSE_IMAGES = import.meta.glob<string>("../../assets/monsters/*_pose_*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});
const POSE_FILE_RE = /^(.+)_pose_(windup|strike|hit)\.webp$/;
const POSE_SET_BY_FIGHTER_ID: Record<string, PoseSet> = {};
for (const [path, url] of Object.entries(POSE_IMAGES)) {
  const file = path.split("/").pop();
  const match = file ? POSE_FILE_RE.exec(file) : null;
  if (!match) {
    // Dev-only Hinweis auf einen Tippfehler im Dateinamen (z.B. `chicken_pose_windupp.webp`) —
    // gated wie manifest.ts' Registry-Aufbau (s. dortiges Bundle-Beweis-JSDoc): ein ungegateter
    // Top-Level-Seiteneffekt (console.warn) würde Rollups Tree-Shaking-Beweis für dieses Modul
    // brechen, selbst wenn kein einziger Aufrufer mehr übrig bliebe.
    if (import.meta.env.DEV && file) {
      // eslint-disable-next-line no-console
      console.warn(`[arena25d/poses] Datei "${file}" matcht *_pose_*.webp, aber nicht das Schema <fighterId>_pose_{windup|strike|hit}.webp — ignoriert.`);
    }
    continue;
  }
  const [, fighterId, poseName] = match as unknown as [string, string, PoseName];
  const set = (POSE_SET_BY_FIGHTER_ID[fighterId] ??= {});
  set[poseName] = url;
}

// ── 3. Die eigentliche Lookup-Tabelle: Idle-URL -> PoseSet ─────────────────────────────────────────
const POSE_SET_BY_IDLE_URL: Record<string, PoseSet> = {};
for (const [fighterId, idleUrl] of Object.entries(IDLE_URL_BY_FIGHTER_ID)) {
  const set = POSE_SET_BY_FIGHTER_ID[fighterId];
  if (set) POSE_SET_BY_IDLE_URL[idleUrl] = set;
}

/**
 * Posen-Set zu einer bereits aufgelösten Idle-Bild-URL (exakt dieselbe URL, die `Arena25DStage.tsx`
 * für `applyTexture` verwendet — `getMonsterSrc`/`getEliteMonsterSrc`/`getPortrait`). `null`, wenn
 * für diese URL kein einziges Posen-Bild existiert (Fallback-Gesetz: Aufrufer behandelt das exakt
 * wie "Posen-Pilot existiert nicht" — heutiges Einzel-Sprite-Verhalten). Pilot ist monster-only: der
 * Spieler-Bild-Ordner (`getPortrait`) liegt außerhalb von `assets/monsters/`, ein Treffer ist also
 * heute strukturell unmöglich für ihn — sobald künftige Spieler-Posen unter demselben Muster
 * abgelegt werden, greift dieselbe Funktion ohne Änderung.
 */
export function getPoseSet(idleSrc: string | null): PoseSet | null {
  if (!idleSrc) return null;
  return POSE_SET_BY_IDLE_URL[idleSrc] ?? null;
}
