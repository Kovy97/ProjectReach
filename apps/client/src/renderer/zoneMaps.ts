/**
 * Auto-Discovery der Zonen-Hotspot-Maps: Lege `assets/zonemaps/<zoneId>.json` ab,
 * dann steht die Map-Ansicht in der Zonen-Gegnerauswahl automatisch zur Verfügung.
 * `<zoneId>` = die Zone-ID aus content.zones (lowercase). Fehlt eine JSON, bleibt
 * die bisherige Kartenlisten-Ansicht erhalten.
 */

export interface ZoneHotspot {
  /** Monster-ID (entspricht einem Schlüssel aus content.monsters). */
  monsterId: string;
  /** Horizontale Position in Prozent der Map-Fläche (Mittelpunkt des Tokens), 0–100. */
  x: number;
  /** Vertikale Position in Prozent der Map-Fläche (Mittelpunkt des Tokens), 0–100. */
  y: number;
  /**
   * Optionaler Skalierungsfaktor des Mob-Tokens (Default 1.0).
   * Sinnvoller Bereich: 0.4–3.0. Wird in Editor und Spieler-View identisch angewendet.
   * Fehlt der Wert, wird 1.0 angenommen (backward-compatible).
   */
  size?: number;
}

export interface ZoneMap {
  zoneId: string;
  hotspots: ZoneHotspot[];
}

const ZONE_MAP_JSONS = import.meta.glob<ZoneMap>("./assets/zonemaps/*.json", {
  eager: true,
  import: "default",
});

const BY_ID: Record<string, ZoneMap> = {};
for (const [path, data] of Object.entries(ZONE_MAP_JSONS)) {
  const id = path.split("/").pop()?.replace(/\.json$/, "");
  if (id && data) BY_ID[id] = data;
}

/**
 * Gibt die ZoneMap einer Zone zurück, oder null wenn noch keine JSON hinterlegt wurde.
 * null-Rückgabe bedeutet: bestehende Kartenlisten-Ansicht verwenden.
 */
export function getZoneMap(zoneId: string | null | undefined): ZoneMap | null {
  return zoneId ? BY_ID[zoneId] ?? null : null;
}
