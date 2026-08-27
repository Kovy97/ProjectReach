/**
 * Bild-Auflösung der Taverne (design/1.2.0-alive/taverne-spec-technik.md §6).
 *
 * Kulisse: Mira hat die deckende Szene geliefert (CODEX/assets/taverne-gaeste-2026-08-27,
 * 27.08.2026) — `assets/tavern/tavern_interior.webp` (1672×941, konvertiert aus ihrem
 * `fertig/tavern_interior.png`, q85, volle Größe; Original archiviert unter
 * Downloads/ASSETS/archive/taverne-gaeste-2026-08-27/, ihr CODEX-Ordner blieb unangetastet).
 * TAVERN_SEAT_POS/TAVERN_OBJECT_POS unten sind ihre echten Anker-Koordinaten
 * (qa/scene-coordinates.json), in Prozent der 1672×941-Leinwand umgerechnet — KEINE
 * Platzhalter-Schätzung mehr. TavernPage.tsx hält den Kulisse-Rahmen exakt im 1672:941-
 * Seitenverhältnis (s. dortiger `.tvn-stage`-Kommentar), damit diese Prozentwerte pixelgenau auf
 * die reale Szene treffen, unabhängig von der Fenstergröße.
 *
 * Gäste-Figuren fehlen noch (Miras QA.md: der eingebaute Bildgenerator lieferte bei transparenten
 * Motiven kein natives Alpha, die 19 Gäste-Sprites sind darum NICHT entstanden — offener Blocker,
 * nicht diese Datei). Bis `assets/tavern/tavern_<id>_idle.webp`/`_face.webp` nachgeliefert werden,
 * fällt jeder Gast auf ein passendes Spieler-Roster-Porträt zurück (GUEST_PORTRAIT_FALLBACK, nur
 * für Gäste mit Rasse human/elf — das Roster kennt nur diese zwei, s. playerRoster.ts); Orks/
 * Goblins (kein Roster-Eintrag) zeigen die gezeichnete Silhouette (styles/tavern.css
 * `.tvn-seat-portrait--empty`).
 */
import { getPortrait } from "./portraits";

/** Auto-Discovery wie campArt.ts/items.ts: `assets/tavern/<datei>.webp` — kein Code-Eintrag nötig,
 *  sobald Mira `tavern_<id>_idle.webp`/`tavern_<id>_face.webp`/`tavern_interior.webp` nachliefert. */
const TAVERN_IMAGES = import.meta.glob<string>("./assets/tavern/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_KEY: Record<string, string> = {};
for (const [path, url] of Object.entries(TAVERN_IMAGES)) {
  const file = path.split("/").pop() ?? "";
  const key = file.replace(/\.(png|webp)$/, "");
  if (!key) continue;
  if (file.endsWith(".webp") || !BY_KEY[key]) BY_KEY[key] = url;
}

/** Die Kulisse (Mira, 27.08.2026: `tavern_interior.webp`) — null nur, falls die Datei je fehlt. */
export function getTavernInteriorImage(): string | null {
  return BY_KEY["tavern_interior"] ?? null;
}

export function getTavernGuestIdleImage(guestId: string): string | null {
  return BY_KEY[`tavern_${guestId}_idle`] ?? null;
}

export function getTavernGuestFaceImage(guestId: string): string | null {
  // Platzhalter = Idle-Bild (Spec §6), solange keine eigene Gesichtskarte vorliegt.
  return BY_KEY[`tavern_${guestId}_face`] ?? BY_KEY[`tavern_${guestId}_idle`] ?? null;
}

/**
 * Spieler-Roster-Fallback je Gast (nur die Gäste, deren Content-Rasse human/elf ist — s.
 * Dateikopf). Reiner Anzeige-Platzhalter, unabhängig von echten Content-Feldern; sobald ein
 * echtes `tavern_<id>_idle.webp` existiert, gewinnt es automatisch (s. getTavernGuestIdleImage).
 */
const GUEST_PORTRAIT_FALLBACK: Readonly<Record<string, string>> = {
  halvard: "human_paladin_m",
  viktor: "human_slayer_m",
  billy: "human_farmer_m",
  nessa: "human_fisher_f",
  tamsin: "elf_forager_f",
  ilvara: "elf_herbalist_f",
  odo: "human_cook_m",
  sefra: "elf_jeweler_f",
  orin: "elf_runecrafter_m",
  wenna: "human_enchanter_f",
  torvald: "human_builder_m",
  // Ork-Roster (27.08.2026): die vier Ork-Gäste zeigen bis zu Miras Figuren Ork-Porträts statt Silhouetten.
  grumm: "orc_miner_m",
  brakka: "orc_woodcutter_f",
  dashk: "orc_blacksmith_m",
  kell: "orc_leatherworker_m",
  ashka: "human_ranger_f",
};

/** Bestes verfügbares Bild für einen sitzenden Gast: echtes Sprite → Roster-Fallback → null
 *  (die Seite zeichnet dann die Silhouette, s. styles/tavern.css). */
export function resolveTavernGuestSeatImage(guestId: string): string | null {
  return getTavernGuestIdleImage(guestId) ?? getPortrait(GUEST_PORTRAIT_FALLBACK[guestId] ?? null);
}

/** Bestes verfügbares Bild für die Gäste-Karte (Modal): echte Gesichtskarte/Idle → derselbe
 *  Roster-Fallback wie am Platz. */
export function resolveTavernGuestFaceImage(guestId: string): string | null {
  return getTavernGuestFaceImage(guestId) ?? getPortrait(GUEST_PORTRAIT_FALLBACK[guestId] ?? null);
}

// ── Szenen-Koordinaten (Mira, qa/scene-coordinates.json, Leinwand 1672×941) ─────────────────────
//
// guestFootpoints → TAVERN_SEAT_POS: Fußpunkt der stehenden/sitzenden Figur (die Figur wird UNTEN
// MITTIG auf diesen Punkt gesetzt, transform: translate(-50%, -100%)). Reihenfolge = Sitzplatz-
// Index 0..3 (TavernSeat[i]) — Tisch 1 (vorne links), Tisch 2 (Mitte links), Tisch 3 (Mitte
// rechts), Tresenplatz.
export interface TavernPoint {
  /** Prozent der Kulissenbreite (0..100). */
  xPct: number;
  /** Prozent der Kulissenhöhe (0..100). */
  yPct: number;
}

export const TAVERN_SEAT_POS: readonly TavernPoint[] = [
  { xPct: 23.44, yPct: 89.27 }, // Tischplatz 1 — Vordergrund links
  { xPct: 38.88, yPct: 63.12 }, // Tischplatz 2 — Mitte links
  { xPct: 60.89, yPct: 63.12 }, // Tischplatz 3 — Mitte rechts
  { xPct: 76.67, yPct: 78.43 }, // Tresenplatz
];

// interactiveObjects → Klickanker (Objekt-Mittelpunkt, transform: translate(-50%, -50%)).
export const TAVERN_OBJECT_POS: Readonly<Record<"counter" | "noticeBoard" | "fireplace" | "door", TavernPoint>> = {
  counter: { xPct: 79.13, yPct: 53.67 },
  noticeBoard: { xPct: 10.95, yPct: 35.18 },
  fireplace: { xPct: 45.28, yPct: 40.81 },
  door: { xPct: 94.56, yPct: 47.08 },
};

/** Seitenverhältnis der Kulisse (Breite/Höhe) — TavernPage hält ihren Bühnen-Rahmen exakt darauf,
 *  damit die Prozent-Anker oben nie unter `background-size:cover`-Beschnitt wegdriften. */
export const TAVERN_SCENE_ASPECT = 1672 / 941;
