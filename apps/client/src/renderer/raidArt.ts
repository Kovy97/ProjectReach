// claude:2026-10-25T10:10:00+02:00 — Raid-Kulissen (1.4.0 Welle 4): Raum-ID gk_room_N über die Dungeon-/Kampfbild-Lader.
// Bis die fünf Raum-Bilder da sind (Asset-Liste), greift die Goblin-Kriegsbande als Rückfall.
import { getBattleScreen, getBattleScreenCard } from "./battleScreens";
import { getDungeonBackground, getDungeonBackgroundCard } from "./dungeonBackgrounds";

const FALLBACK_ROOM = "goblin_warband";

/** Kleine Karten-Kulisse eines Raid-Raums (Zonenwahl, Rast). */
export function raidRoomCard(dungeonId: string | null | undefined): string | null {
  return getBattleScreenCard(dungeonId) ?? getDungeonBackgroundCard(dungeonId) ?? getDungeonBackgroundCard(FALLBACK_ROOM);
}

/** Große Kampf-Kulisse eines Raid-Raums. */
export function raidRoomBackdrop(dungeonId: string | null | undefined): string | null {
  return getBattleScreen(dungeonId) ?? getDungeonBackground(dungeonId) ?? getDungeonBackground(FALLBACK_ROOM);
}

// claude:2026-10-25T12:50:00+02:00 — Raid-Truhe (Asset-Liste 1.4.0 Gruppe E): `assets/ui/raid/raid_chest_closed|open.webp`, Auto-Discovery wie huntingArt.ts.
const RAID_UI_IMAGES = import.meta.glob<string>("./assets/ui/raid/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});
const RAID_UI_BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(RAID_UI_IMAGES)) {
  const name = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (name) RAID_UI_BY_NAME[name] = url;
}

/** Truhenbild zu/offen (null, bis geliefert: Inline-SVG). Fehlt nur die offene Fassung, bleibt die geschlossene stehen. */
export function raidChestArt(open: boolean): string | null {
  return (open ? RAID_UI_BY_NAME.raid_chest_open : undefined) ?? RAID_UI_BY_NAME.raid_chest_closed ?? null;
}

/** Karten-Kulisse des Raids in der Zonenwahl (`assets/dungeons/<raidId>.card.webp`), sonst die Kulisse von Raum 1. */
export function raidCardArt(raidId: string, firstRoomId: string | null | undefined): string | null {
  return getDungeonBackgroundCard(raidId) ?? raidRoomCard(firstRoomId);
}

export function isRaidRoomId(dungeonId: string | null | undefined): boolean {
  return !!dungeonId && dungeonId.startsWith("gk_room_");
}
