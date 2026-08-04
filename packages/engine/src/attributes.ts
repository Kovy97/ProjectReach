import type { AttributeId } from "@hearthforge/shared";
import { ATTRIBUTE_IDS } from "@hearthforge/shared";

/** Erzeugt einen vollständigen Attribut-Record, alle auf `value` gesetzt. */
export function emptyAttributeRecord(value = 0): Record<AttributeId, number> {
  const rec = {} as Record<AttributeId, number>;
  for (const id of ATTRIBUTE_IDS) rec[id] = value;
  return rec;
}
