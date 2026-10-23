import type { ContentDB, LocalizedString, SkillEventId, WorkOrder } from "@hearthforge/shared";
import {
  FISH_SHOAL_MS,
  FISH_SHOAL_SPEED,
  FRESH_TRAIL_EXTRA_ROLLS,
  GUARD_CHANGE_MS,
  GUARD_CHANGE_SUCCESS_BONUS,
  INSPIRATION_CRAFTS,
  RICH_VEIN_ACTIONS,
  THRIFTY_HAND_CRAFTS,
  THRIFTY_HAND_MAX_MS,
  THRIFTY_HAND_PRESERVE,
  WILD_GARDEN_ACTIONS,
  WILD_GARDEN_MAX_CHANCE,
} from "@hearthforge/shared";

/**
 * claude:2026-10-25T01:10:00+02:00 — Lese-Helfer für Ereignisse und Arbeitsaufträge (1.4.0 Welle 3). Kunden sind
 * Tavernen-Gäste mit passendem Beruf oder Zusatz-Kunden aus `content.orderCustomers`; ohne Treffer spricht das
 * Gilden-Siegel (i18n `orders.guild.*`).
 */
export interface OrderCustomerView {
  id: string;
  name: LocalizedString | null;
  role: LocalizedString | null;
  line: LocalizedString | null;
}

export function orderCustomer(content: ContentDB, order: WorkOrder): OrderCustomerView {
  const guest = (content.tavernGuests ?? []).find((g) => g.id === order.customerId);
  if (guest) {
    const tpl = (content.tavernTasks ?? []).find((t) => t.guestId === guest.id && t.kind === order.kind)
      ?? (content.tavernTasks ?? []).find((t) => t.guestId === guest.id && (t.kind === "produce" || t.kind === "deliver"));
    return { id: guest.id, name: guest.name, role: guest.role, line: tpl?.line ?? null };
  }
  const extra = (content.orderCustomers ?? []).find((c) => c.id === order.customerId);
  if (extra) {
    return { id: extra.id, name: extra.name, role: extra.role, line: (order.kind === "produce" ? extra.produceLine : extra.deliverLine) ?? null };
  }
  return { id: "guild", name: null, role: null, line: null };
}

/** Zahlen für die Platzhalter der Ereigniskarte ({n} Aktionen/Stück, {min} Minuten, {pct} Prozent). */
export function eventCardValues(id: SkillEventId): { n: number; min: number; pct: number } {
  switch (id) {
    case "rich_vein":
      return { n: RICH_VEIN_ACTIONS, min: 0, pct: 0 };
    case "wild_garden":
      return { n: WILD_GARDEN_ACTIONS, min: 0, pct: Math.round(WILD_GARDEN_MAX_CHANCE * 100) };
    case "inspiration":
      return { n: INSPIRATION_CRAFTS, min: 0, pct: 0 };
    case "thrifty_hand":
      return { n: THRIFTY_HAND_CRAFTS, min: THRIFTY_HAND_MAX_MS / 60_000, pct: Math.round(THRIFTY_HAND_PRESERVE * 100) };
    case "fish_shoal":
      return { n: 0, min: FISH_SHOAL_MS / 60_000, pct: Math.round((FISH_SHOAL_SPEED - 1) * 100) };
    case "guard_change":
      return { n: 0, min: GUARD_CHANGE_MS / 60_000, pct: Math.round(GUARD_CHANGE_SUCCESS_BONUS * 100) };
    case "fresh_trail":
      return { n: FRESH_TRAIL_EXTRA_ROLLS, min: 0, pct: 0 };
    default:
      return { n: 1, min: 0, pct: 0 };
  }
}

/** Füllt {n}, {min}, {count}, {target}, {item}, {qty} in einem Text. */
export function fillEventText(text: string, vals: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vals ? String(vals[k]) : m));
}
