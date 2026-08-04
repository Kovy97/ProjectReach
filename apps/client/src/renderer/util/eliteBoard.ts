import type { ContentDB, EliteVariantDef, EliteZoneState } from "@hearthforge/shared";

/**
 * Jagd-Paket (Chef-GO, Champions-des-Reach-Folgeauftrag): geteilte Ableitungs-Logik für
 * "Spuren"/"Vorzeichen" — rein aus dem bestehenden `state.eliteZones`-Ruhezustand gelesen, KEIN
 * neues State-Feld. Genutzt vom Zonen-Karten-Badge (CombatPage.tsx, dezent, kein Pulsieren) UND
 * vom Kopfgeld-Brett (BountyBoard.tsx, SlayerPage) — eine Quelle für "was zählt als frische Spur",
 * damit beide Stellen nie auseinanderlaufen.
 *
 * Bewusst deutlich unter dem kürzesten Zonen-Cooldown-Band (55 Min, ELITE_ZONE_COOLDOWN_BANDS.
 * pastures, shared/index.ts) — eine kurze Vorwarnung, kein halbes Zeitfenster im Voraus.
 */
export const ELITE_TRACKS_THRESHOLD_MS = 5 * 60_000;

/** Ruht die Zone gerade MIT frischer Spur (`cooldownMs` unter der Schwelle)? */
export function hasFreshTracks(entry: EliteZoneState | undefined): boolean {
  return !!entry && "cooldownMs" in entry && entry.cooldownMs < ELITE_TRACKS_THRESHOLD_MS;
}

/**
 * Drei-Zustands-Statusfür das Kopfgeld-Brett (Task 1): "aktiv" (gespawnter Champion + Variante +
 * Restzeit), "tracks" (frische Spur, s.o.) oder "quiet" (weder noch — inkl. des Content-Drift-
 * Schutzfalls: ein aktiver Eintrag mit einer inzwischen aus dem Katalog entfernten `variantId`
 * degradiert zu "quiet" statt zu crashen, Muster `zoneEliteActive`/`eliteVariant` in CombatPage.tsx).
 */
export type EliteBoardStatus =
  | { kind: "active"; variant: EliteVariantDef; remainingMs: number }
  | { kind: "tracks" }
  | { kind: "quiet" };

export function eliteBoardStatusForZone(
  content: ContentDB,
  entry: EliteZoneState | undefined,
): EliteBoardStatus {
  if (entry && "variantId" in entry) {
    const variant = content.elites?.[entry.variantId];
    if (variant) return { kind: "active", variant, remainingMs: entry.remainingMs };
    return { kind: "quiet" };
  }
  if (hasFreshTracks(entry)) return { kind: "tracks" };
  return { kind: "quiet" };
}
