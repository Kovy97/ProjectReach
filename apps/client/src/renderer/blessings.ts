import type { BlessingId } from "@hearthforge/shared";

/**
 * Blessings of the Reach (Welt-Segen, 2026-07-21): Kartengrafiken für die 7 Welt-Segen, eine je
 * Wochentag (s. packages/engine/src/blessing.ts `blessingForTime`). Lege `assets/blessings/
 * blessing_<id>.png` ab — `<id>` = BlessingId. Auto-Discovery wie skillBackgrounds.ts/monsters.ts;
 * alle 7 IDs sind bereits geliefert (1536×1024, 3:2, unteres Drittel dunkel auslaufend).
 */
const BLESSING_IMAGES = import.meta.glob<string>("./assets/blessings/blessing_*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(BLESSING_IMAGES)) {
  const id = path.split("/").pop()?.replace(/^blessing_/, "").replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

/** Kartengrafik-URL für eine Blessing-ID (oder null, falls keine hinterlegt — sollte nicht
 *  vorkommen, alle 7 IDs haben ein Bild). */
export function getBlessingImage(id: BlessingId): string | null {
  return BY_ID[id] ?? null;
}
