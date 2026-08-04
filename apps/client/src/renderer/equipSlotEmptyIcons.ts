/**
 * Gemeinsame „leerer Slot"-Silhouetten-Icons (Citadel-Charakterblatt-Stil),
 * damit Combat-Loadout und Charakterblatt dieselben Equipment-Slot-Icons nutzen.
 * Keyed by EQUIP_SLOT-ID.
 */
import emptyHelmetImg from "./assets/ui/citadel/box-character-sheet/slots/empty_helmet.webp";
import emptyAmuletImg from "./assets/ui/citadel/box-character-sheet/slots/empty_amulet.webp";
import emptyChestImg from "./assets/ui/citadel/box-character-sheet/slots/empty_chest.webp";
import emptyPantsImg from "./assets/ui/citadel/box-character-sheet/slots/empty_pants.webp";
import emptyGlovesImg from "./assets/ui/citadel/box-character-sheet/slots/empty_gloves.webp";
import emptyBootsImg from "./assets/ui/citadel/box-character-sheet/slots/empty_boots.webp";
import emptyCloakImg from "./assets/ui/citadel/box-character-sheet/slots/empty_cloak.webp";
import emptyHandImg from "./assets/ui/citadel/box-character-sheet/slots/empty_hand.webp";
import emptyArmguardsImg from "./assets/ui/citadel/box-character-sheet/slots/empty_armguards.webp";
import emptyRingImg from "./assets/ui/citadel/box-character-sheet/slots/empty_ring.webp";

export const CITADEL_SLOT_EMPTY: Record<string, string> = {
  helmet:   emptyHelmetImg,
  amulet:   emptyAmuletImg,
  body:     emptyChestImg,
  legs:     emptyPantsImg,
  gloves:   emptyGlovesImg,
  boots:    emptyBootsImg,
  cape:     emptyCloakImg,
  mainhand: emptyHandImg,
  offhand:  emptyArmguardsImg,
  ring1:    emptyRingImg,
  ring2:    emptyRingImg,
};

/** Leeres-Slot-Icon für eine EQUIP_SLOT-ID (oder null). */
export function getSlotEmptyIcon(slotId: string): string | null {
  return CITADEL_SLOT_EMPTY[slotId] ?? null;
}
