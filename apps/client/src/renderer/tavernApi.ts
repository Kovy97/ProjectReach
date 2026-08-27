/**
 * Bindeglied zur Taverne-Engine (design/1.2.0-alive/taverne-spec-technik.md §5).
 *
 * STAND 27.08.2026: `packages/engine/src/tavern.ts` ist gelandet und aus
 * `packages/engine/src/index.ts` exportiert (logic-dev, gleicher Tag) — genauso `content.tavernGuests`/
 * `content.tavernTasks`/`camp_tavern`/`black_market_crate_*` (content-dev). Diese Datei ist darum ein
 * REINER Re-Export, kein Stub mehr: TavernPage/TavernGuestModal/CrateOpenModal importieren
 * ausschließlich von hier statt direkt von "@hearthforge/engine" für Taverne-Belange (ein einziger
 * Anpassungspunkt, falls sich die Engine-API mal verschiebt).
 */
export {
  acceptTavernTask,
  deliverTavernTask,
  enqueueAction,
  openBlackMarketCrate,
  rollCrateContents,
  swapTavernGuest,
  tavernBandFor,
  tavernBuilt,
  tavernCrateItemId,
  tavernCrateTier,
  tavernFreeSwaps,
  tavernGuestDef,
  tavernHash,
  tavernHashFloat,
  tavernLevel,
  tavernRefresh,
  tavernSeatSummary,
  tavernSeats,
  tavernSwapCost,
  tavernTaskProgress,
  tavernTemplateDef,
} from "@hearthforge/engine";
export type {
  CrateResult,
  TavernDeliverReason,
  TavernSeatSummary,
  TavernSwapReason,
  TavernTaskProgress,
} from "@hearthforge/engine";

export { CAMP_TAVERN_ID, TAVERN_SEATS } from "@hearthforge/shared";
export type {
  TavernDelivery,
  TavernGuestDef,
  TavernGuestId,
  TavernSeat,
  TavernState,
  TavernTask,
  TavernTaskKind,
  TavernTaskTemplateDef,
} from "@hearthforge/shared";
