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
/**
 * Wie stark das Kartenbild vergroessert werden muss, damit das Gebaeude die Karte fuellt —
 * je Gebaeude und Stufe `[Massstab, vertikaler Bezugspunkt in %]`.
 *
 * Warum eine Tabelle und keine Zahl: Die Encampment-Sprites haben eine grosszuegige
 * transparente Sicherheitsflaeche, und die faellt VOELLIG unterschiedlich aus. Gemessen
 * ueber den undurchsichtigen Bildausschnitt jeder Datei belegt das Gebaeude zwischen 21 %
 * und 57 % der Bildbreite. Der noetige Massstab reicht darum von 1,50x bis 3,26x, waehrend
 * in der CSS pauschal 1,65x stand — dadurch waren fast alle Gebaeude in ihrer Karte zu
 * klein, Stufe-1-Bauten am staerksten. Das war der Chef-Fund "Bilder nicht zentriert und
 * viel zu klein" (24.08.2026).
 *
 * Der Bezugspunkt ist die Mitte des tatsaechlichen Motivs (durchweg 60-77 % der Bildhoehe,
 * weil die Sprites unten sitzen). Er sorgt dafuer, dass das Vergroessern das Gebaeude
 * mittig haelt, statt es aus dem Rahmen zu schieben.
 *
 * Erzeugt aus den Bilddateien, nicht geschaetzt. Neue oder ersetzte Sprites brauchen eine
 * neue Messung — sonst stimmt die Zahl hier still nicht mehr.
 */
const CAMP_CARD_FIT: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  camp_fence_tent: [[3.26, 77], [3.03, 75], [2.46, 74]],
  camp_fishing_hut: [[3.13, 76], [2.67, 74], [2.36, 74]],
  camp_mine_adit: [[2.65, 75], [2.12, 73], [2.26, 71]],
  camp_sawpit: [[2.62, 77], [2.48, 75], [2.28, 73]],
  camp_scrivener_tent: [[2.45, 75], [2.06, 73], [2.02, 71]],
  camp_seed_garden: [[2.41, 77], [2.59, 75], [2.01, 73]],
  camp_smelter: [[2.54, 72], [2.71, 78], [2.08, 70]],
  camp_smokehouse: [[2.59, 72], [2.13, 72], [1.88, 69]],
  camp_storehouse: [[2.64, 72], [2.3, 69], [1.89, 67]],
  camp_townhall: [[1.87, 69], [1.6, 66], [1.61, 63]],
  camp_trade_post: [[2.34, 74], [1.92, 72], [1.69, 70]],
  camp_trophy_wall: [[3.15, 74], [2.43, 72], [1.71, 70]],
  camp_warden_shrine: [[2.64, 72], [2.3, 69], [2.3, 69]],
  camp_watchtower: [[1.74, 63], [1.68, 63], [1.55, 60]],
  camp_workyard: [[1.98, 72], [1.67, 69], [1.5, 67]],
};

/** Massstab und Bezugspunkt fuer die Listen-/Detailkarte eines Gebaeudes. */
export function getCampCardFit(buildingId: string, level: number): { scale: number; originY: number } {
  const stufen = CAMP_CARD_FIT[buildingId];
  if (!stufen || stufen.length === 0) return { scale: 1.65, originY: 72 };
  const i = Math.max(0, Math.min(stufen.length - 1, Math.floor(level) - 1));
  const eintrag = stufen[i] ?? stufen[0];
  if (!eintrag) return { scale: 1.65, originY: 72 };
  return { scale: eintrag[0], originY: eintrag[1] };
}

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
