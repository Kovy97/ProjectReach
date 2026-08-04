/**
 * Auto-Discovery der Lager-Gebäudebilder für den New-Haven-Screen (Muster items.ts/pets.ts, mit
 * dem Suffix-Schlüssel der Karten-Backdrops aus zoneBackgrounds.ts/battleScreens.ts).
 *
 * KONVENTION: `assets/camp/<buildingId>_<level>.webp` für Tag und
 * `assets/camp/<buildingId>_<level>_night.webp` für Nacht — die Gebäude-ID kommt aus
 * `content.campBuildings`, `<level>` ist die Ausbaustufe 1..3.
 * Kein Code-Eintrag nötig, die Datei wird beim Ablegen automatisch verknüpft.
 *
 * FALLBACK-TREPPE (damit Teil-Lieferungen sofort etwas zeigen): gesucht wird zuerst die exakte
 * Stufe, danach die nächstniedrigere VORHANDENE Stufe ≥ 1 — wer nur `<id>_1.webp` liefert, dessen
 * Gebäude sieht auf Stufe II/III eben noch aus wie auf Stufe I, statt in den Platzhalter zu
 * fallen. Stufe 0 (ungebaut) greift bewusst NICHT auf die gebauten Bilder zurück: ein leerer
 * Bauplatz darf nie wie ein fertiges Haus aussehen. Fehlt alles, liefert die Funktion null und die
 * Karte rendert ihren gezeichneten Platzhalter (styles/newhaven.css `.nh-art--empty`) — nie ein Emoji.
 * Bei fehlender Nachtfassung fällt jede Stufe zuerst auf ihre Tagfassung zurück.
 */
const CAMP_IMAGES = import.meta.glob<string>("./assets/camp/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(CAMP_IMAGES)) {
  const file = path.split("/").pop() ?? "";
  const key = file.replace(/\.(png|webp)$/, "");
  if (!key) continue;
  // .webp gewinnt gegen ein evtl. daneben liegendes .png derselben Stufe (Muster items.ts).
  if (file.endsWith(".webp") || !BY_KEY[key]) BY_KEY[key] = url;
}

// codex:2026-07-30T22:30:00+02:00 — freigegebene Tag-/Nacht-Familien mit stufenweisem Fallback.
export type CampLightPhase = "day" | "night";

function campImageAt(buildingId: string, level: number, phase: CampLightPhase): string | null {
  const suffix = phase === "night" ? "_night" : "";
  return BY_KEY[`${buildingId}_${level}${suffix}`] ?? null;
}

/** Bild-URL für ein Lager-Gebäude auf einer Ausbaustufe (oder null, wenn kein Bild hinterlegt ist). */
export function getCampImage(
  buildingId: string,
  level: number,
  phase: CampLightPhase = "day",
): string | null {
  const lvl = Math.max(0, Math.floor(level));
  const exact = campImageAt(buildingId, lvl, phase) ??
    (phase === "night" ? campImageAt(buildingId, lvl, "day") : null);
  if (exact) return exact;
  if (lvl <= 0) return null; // leerer Bauplatz: kein Rückgriff auf die gebauten Stufen
  for (let l = lvl - 1; l >= 1; l--) {
    const hit = campImageAt(buildingId, l, phase) ??
      (phase === "night" ? campImageAt(buildingId, l, "day") : null);
    if (hit) return hit;
  }
  return null;
}

/**
 * codex:2026-07-31T20:21:01+02:00 — Visuelle Größenhierarchie der 640×640-Kartenassets.
 * Town Hall ist der vom Chef bestätigte 1,0-Maßstab. Kleine Arbeitsstellen beginnen bewusst
 * kleiner und wachsen mit ihrer Architektur; die gemeinsame Kollisionsbühne bleibt konservativ
 * auf Town-Hall-Größe, sodass unterschiedliche Silhouetten niemals ineinanderragen können.
 */
const CAMP_MAP_VISUAL_SCALE: Readonly<Record<string, readonly [number, number, number]>> = {
  camp_townhall: [1, 1, 1],
  camp_fishing_hut: [0.64, 0.76, 0.86],
  camp_fence_tent: [0.72, 0.84, 0.94],
  camp_mine_adit: [0.78, 0.88, 0.96],
  camp_sawpit: [0.64, 0.8, 0.9],
  camp_scrivener_tent: [0.58, 0.75, 0.88],
  camp_seed_garden: [0.7, 0.83, 0.92],
  camp_smelter: [0.72, 0.84, 0.92],
  camp_smokehouse: [0.64, 0.78, 0.9],
  camp_storehouse: [0.68, 0.79, 0.9],
  camp_trade_post: [0.72, 0.84, 0.93],
  camp_trophy_wall: [0.52, 0.72, 0.9],
  camp_warden_shrine: [0.62, 0.7, 0.8],
  camp_watchtower: [0.64, 0.8, 0.95],
  camp_workyard: [0.62, 0.78, 0.9],
};

// codex:2026-08-03T09:46:00+02:00 — Vom Chef im Karten-Kalibriermodus abgenommene
// stufenspezifische Prozentwerte. Sie multiplizieren die bestehende Familienhierarchie und sind
// bewusst reine Renderer-Defaults: Positionen, Engine-Footprints und Save-State bleiben unberührt.
const CAMP_MAP_DEFAULT_CALIBRATION_PERCENT: Readonly<Record<string, readonly [number, number, number]>> = {
  camp_fishing_hut: [165, 100, 100],
  camp_seed_garden: [155, 100, 100],
  camp_smelter: [140, 180, 100],
  camp_trade_post: [137, 100, 120],
  camp_fence_tent: [185, 100, 100],
};

export function getCampMapDefaultCalibrationPercent(buildingId: string, level: number): number {
  const stages = CAMP_MAP_DEFAULT_CALIBRATION_PERCENT[buildingId];
  const index = Math.max(0, Math.min(2, Math.floor(level) - 1));
  return stages?.[index] ?? 100;
}

export function getCampMapVisualScale(buildingId: string, level: number): number {
  const stages = CAMP_MAP_VISUAL_SCALE[buildingId];
  // codex:2026-08-02T21:42:00+02:00 — Chef-Abnahme auf der 1672:941-Karte: Die bisherigen
  // Sprites lasen sich nur wie Miniaturen. Die familien-/rangabhängige Hierarchie bleibt exakt
  // erhalten, wird für die Kartenansicht aber geschlossen auf die doppelte Sichtgröße angehoben.
  if (!stages) return 1.7;
  const index = Math.max(0, Math.min(2, Math.floor(level) - 1));
  return (stages[index] ?? stages[0] ?? 0.85) * 2;
}
