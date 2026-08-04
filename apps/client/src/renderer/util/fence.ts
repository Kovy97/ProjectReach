import { content } from "@hearthforge/content";
import type { InventoryState } from "@hearthforge/shared";

/**
 * Set of item IDs consumed as inputs by fence-category thieving actions.
 * Derived at module load time from the content catalog — no hardcoding.
 */
export const FENCE_INPUT_IDS: ReadonlySet<string> = new Set(
  Object.values(content.actions)
    .filter((a) => a.category === "fence")
    .flatMap((a) => (a.inputs ?? []).map((i) => i.itemId)),
);

/** Total qty of fenceable stolen goods across all inventory slots. */
export function countFenceItems(inventory: InventoryState): number {
  let total = 0;
  for (const slot of inventory.slots) {
    if (slot && FENCE_INPUT_IDS.has(slot.itemId)) {
      total += slot.qty;
    }
  }
  return total;
}
