import type { BuyBackEntry, ContentDB, GameState, ItemDef, ItemId, ItemInstance, ItemRarity, ShopEntry } from "@hearthforge/shared";
import {
  AUTO_EAT_MAX_TIER,
  AUTO_EAT_TIERS,
  AUTO_REBUFF_UNLOCK_COST,
  BASE_INVENTORY_SLOTS,
  BUYBACK_BANNED_ITEM_IDS,
  BUYBACK_MAX_ENTRIES,
  EQUIP_SLOTS,
  ITEM_RARITIES,
  SELL_BONUS_TOTAL_CAP,
  SELL_FRACTION,
  SLOT_UPGRADE_AMOUNT,
  SLOT_UPGRADE_BASE_COST,
  SLOT_UPGRADE_GROWTH,
  effectiveBankCapacity,
  masterRingItemId,
  syncBankOrder,
} from "@hearthforge/shared";
import { addInstance, addItem, addItemOrBank, canHold, expandBaseCapacity, isFull, itemCount, markItemDiscovered, removeInstance, removeItem } from "./inventory";
import { petSellBonus } from "./pets";
import { campBoost } from "./camp";
import { storagePredicate } from "./storage"; // claude:2026-10-25T10:32:00+01:00 — Sammelverkauf aus der Bank (1.4.1 K1)

/** Kosten des nächsten Auto-Eat-Upgrades (null = bereits maximale Stufe). */
export function autoEatUpgradeCost(state: GameState): number | null {
  const next = (state.character.autoEatTier ?? 0) + 1;
  if (next > AUTO_EAT_MAX_TIER) return null;
  return AUTO_EAT_TIERS[next]!.cost;
}

/** Kauft die nächste Auto-Eat-Stufe (frühere Heilung + höhere Heil-Effizienz). */
export function buyAutoEatUpgrade(state: GameState): boolean {
  const cost = autoEatUpgradeCost(state);
  if (cost === null || state.character.gold < cost) return false;
  state.character.gold -= cost;
  state.stats.goldSpent += cost;
  state.character.autoEatTier = (state.character.autoEatTier ?? 0) + 1;
  return true;
}

/**
 * Kauft Auto-Buff einmalig frei. Der Kauf ist deterministisch, zählt wie andere Goldsenken in
 * `stats.goldSpent` und aktiviert die Funktion noch nicht automatisch.
 */
// codex:2026-08-02T16:20:00+02:00 — Combat-Prep: persistente 50.000-Gold-Freischaltung.
export function unlockAutoRebuffTonics(state: GameState): boolean {
  if (state.character.autoPotion.autoRebuffUnlocked) return true;
  if (state.character.gold < AUTO_REBUFF_UNLOCK_COST) return false;
  state.character.gold -= AUTO_REBUFF_UNLOCK_COST;
  state.stats.goldSpent += AUTO_REBUFF_UNLOCK_COST;
  state.character.autoPotion.autoRebuffUnlocked = true;
  return true;
}

export function addGold(state: GameState, amount: number): void {
  state.character.gold = Math.max(0, state.character.gold + Math.round(amount));
}

/** BASIS-Verkaufspreis eines Items (pro Stück, OHNE Pet-Bonus — Anzeige-/Referenzwert). */
export function sellPrice(content: ContentDB, itemId: ItemId): number {
  return Math.max(1, Math.round((content.items[itemId]?.value ?? 0) * SELL_FRACTION));
}

/**
 * EFFEKTIVER Verkaufspreis pro Stück INKL. Pet-Verkaufsbonus (#276 §4.2 — vellumoth
 * „Appraiser's Eye": +5 % Gold beim Verkauf, `petSellBonus` ≤5 %) UND Händlerposten (Das Lager,
 * `sellBonus` ≤ 6 %, Task #359). Rundung wie bisher pro Stück (min 1). Der Sell-Pfad
 * (sellItem/sellInstance) nutzt DIESEN Preis; er wandert auch als Buy-Back-Preis in die Liste
 * (symmetrisch — kein Gold-Pump).
 *
 * STAPELUNG + KLEMME (encampment-balance.md §6): beide Quellen sind ADDITIV in EINEM Ausdruck (eine
 * Rundung, wie bisher), der Gesamt-Bonus ist hart auf `SELL_BONUS_TOTAL_CAP` (+15 %) geklemmt —
 * heute erreichbar sind max. +11 %, die Klemme schützt vor künftigen Quellen. Ohne Lager exakt der
 * Alt-Pfad (campBoost 0) ⇒ Sim-/Determinismus-Fixtures bit-identisch.
 */
export function effectiveSellPrice(state: GameState, content: ContentDB, itemId: ItemId): number {
  const bonus = Math.min(
    SELL_BONUS_TOTAL_CAP,
    petSellBonus(state, content) + Math.max(0, campBoost(state, content, "sellBonus")),
  );
  return Math.max(1, Math.round(sellPrice(content, itemId) * (1 + bonus)));
}

/** Kosten des nächsten Inventar-Slot-Upgrades (steigt mit jedem Kauf). */
export function slotUpgradeCost(state: GameState): number {
  const bought = Math.max(0, (state.inventory.baseCapacity - BASE_INVENTORY_SLOTS) / SLOT_UPGRADE_AMOUNT);
  return Math.round(SLOT_UPGRADE_BASE_COST * Math.pow(SLOT_UPGRADE_GROWTH, bought));
}

/** Kauft ein Item aus dem Laden. */
/**
 * Kauft bis zu `qty` Stück eines Items. Kauft so viele, wie Gold UND Platz erlauben (partiell: „Kaufe 50"
 * mit Gold für 30 → kauft 30). Gibt die tatsächlich gekaufte Anzahl zurück (0 = nichts gekauft).
 */
export function buyItem(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
  cost: number,
  qty = 1,
): number {
  // Nicht-endliche Menge (NaN/Infinity) wie <=0 behandeln → kein Kauf (spiegelt SimPlayer.advanceTime).
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  let bought = 0;
  for (let i = 0; i < qty; i++) {
    if (state.character.gold < cost) break;
    // Alle Items stapeln → Kauf nur blocken, wenn wirklich kein Platz (kein freier Slot UND kein Stack mit Raum).
    if (!canHold(state.inventory, content, itemId)) break;
    if (addItem(state.inventory, content, itemId, 1) < 1) break;
    state.character.gold -= cost;
    state.stats.goldSpent += cost;
    bought++;
  }
  // Erst-Besitz-Marker (SAVE 58): Kauf ist ein Zugangs-Pfad, der NICHT über addItemOrBank läuft.
  if (bought > 0) markItemDiscovered(state, itemId);
  return bought;
}

/**
 * Schiebt einen Verkauf vorne in die Buy-Back-Liste (FIFO) und kappt sie auf `BUYBACK_MAX_ENTRIES`.
 * Ein Aufruf = EIN Eintrag (auch für einen Stapel von N). Defensiv gegen ein fehlendes Feld (z.B.
 * ein Alt-/Test-State, der nicht durch createGame/migrateState lief).
 */
function pushBuyBack(state: GameState, entry: BuyBackEntry): void {
  // Dungeon-Schlüssel landen NIE im Regal (Tester-Sweep 2 T6, 2026-07-13 — Defense-in-depth zum
  // persistence-Load-Strip, DIESELBE geteilte Sperr-Menge BUYBACK_BANNED_ITEM_IDS aus shared):
  // eine Live-Injection (Save-Edit/Devtools mitten in der Session) könnte sonst z.B. einen
  // paragon_key verkaufen und per Rückkauf (rohes addItem, am addItemOrBank-Intercept vorbei)
  // zurück in die Welt holen — der Load-Sanitize deckt nur den NÄCHSTEN Load. Der Verkauf selbst
  // bleibt gültig (Gold ist geflossen), nur der Regal-Eintrag entfällt still.
  if (BUYBACK_BANNED_ITEM_IDS.has(entry.itemId)) return;
  if (!Array.isArray(state.buyBack)) state.buyBack = [];
  state.buyBack.unshift(entry);
  if (state.buyBack.length > BUYBACK_MAX_ENTRIES) state.buyBack.length = BUYBACK_MAX_ENTRIES;
}

/** Verkauft `qty` eines Items für Gold. Der Verkauf wandert als ein Eintrag in die Buy-Back-Liste. */
export function sellItem(state: GameState, content: ContentDB, itemId: ItemId, qty = 1): number {
  // Nicht-endliche Menge (NaN/Infinity) wie <=0 behandeln: sonst schlüge NaN bis in `addGold` durch
  // und würde `gold` vergiften (spiegelt SimPlayer.advanceTime).
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  const have = itemCount(state.inventory, itemId);
  const amount = Math.min(qty, have);
  if (amount <= 0) return 0;
  const removed = removeItem(state.inventory, itemId, amount);
  if (removed <= 0) return 0;
  const unit = effectiveSellPrice(state, content, itemId); // inkl. Pet-sellBonus (#276)
  const gold = removed * unit;
  addGold(state, gold);
  pushBuyBack(state, { itemId, qty: removed, price: unit });
  return gold;
}

/**
 * Schnellverkauf des GESAMTEN Stapels eines Items auf einmal (Shift+Linksklick, Task #245). `qty`
 * begrenzt die Menge optional; ohne Angabe (bzw. ≥ Bestand) wandert der ganze Stapel in Gold. Ein
 * einziger Buy-Back-Eintrag je Aufruf (delegiert an `sellItem`). Gibt das erlöste Gold zurück.
 */
export function sellStack(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
  qty: number = Number.POSITIVE_INFINITY,
): number {
  const have = itemCount(state.inventory, itemId);
  const amount = Number.isFinite(qty) ? Math.min(qty, have) : have;
  if (amount <= 0) return 0;
  return sellItem(state, content, itemId, amount);
}

/**
 * Verkauft eine EINZELNE Item-Instanz (Suffix-/verzaubertes Gear, per `instanceId`) aus der Inventar-
 * Tasche (`inventory.instances`). Instanzen sind Unikate und werden von `removeItem`/`sellItem` bewusst
 * übersprungen, daher dieser eigene Pfad: aus der Tasche entfernen + Gold gutschreiben. Gibt das erlöste
 * Gold zurück (0, wenn die Instanz nicht in der Tasche liegt).
 *
 * Preis = Basis-Item-Verkaufspreis. Ein Enchant-Aufschlag ist bewusst (noch) 0 — reine Balance-Domäne
 * (balance-designer); der Hook (`inst.affixes`/`inst.suffix`) liegt hier bereit, falls er kommen soll.
 */
export function sellInstance(state: GameState, content: ContentDB, instanceId: string): number {
  const inst = removeInstance(state.inventory, instanceId);
  if (!inst) return 0;
  const gold = effectiveSellPrice(state, content, inst.baseItemId); // inkl. Pet-sellBonus (#276)
  addGold(state, gold);
  // Die verkaufte Instanz (verzaubert/gesuffixt) komplett puffern, damit der Rückkauf sie identisch
  // (Affixe + Suffix) zurückgibt. qty immer 1 (Instanzen sind Unikate), price = Basis-Verkaufspreis.
  pushBuyBack(state, { itemId: inst.baseItemId, qty: 1, price: gold, instance: inst });
  return gold;
}

/**
 * „Stack verkaufen" für ein Basis-Item MIT Varianten (#246, Schnellverkauf via Shift+Linksklick):
 * verkauft den GESAMTEN fungiblen Stapel UND alle verzauberten/gesuffixten Varianten (Instanzen mit
 * `baseItemId === itemId`) in EINEM Rutsch. Analog zu `depositBaseWithVariants` in bank.ts.
 *
 * (a) Fungibler Stack: gesamte Inventarmenge via `sellStack` (delegiert an `sellItem` → ein
 *     Buy-Back-Eintrag für den Stapel).
 * (b) Instanzen: ALLE passenden Instanzen aus `inventory.instances` einzeln via `sellInstance` — jede
 *     wandert als eigener Buy-Back-Eintrag (mit voller Instanz) zurück-kaufbar in die Liste.
 *
 * Gold beider Teile wird summiert. Jeder Sell-Aufruf puffert selbst in `buyBack` und kappt die Länge
 * (`pushBuyBack`). Nach dem Aufruf ist `inventory.instances` frei von dieser Basis-Art (keine verwaisten
 * Instanzen). Rückgabe: `gold` (Summe), `soldStack` (verkaufte fungible Menge), `soldInstances` (Anzahl
 * verkaufter Instanzen).
 */
export function sellBaseWithVariants(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): { gold: number; soldStack: number; soldInstances: number } {
  // (a) Fungibler Stack: Menge VOR dem Verkauf festhalten (sellStack liefert nur das Gold zurück).
  const soldStack = itemCount(state.inventory, itemId);
  let gold = sellStack(state, content, itemId);
  // (b) Instanzen: Snapshot der passenden IDs, da sellInstance→removeInstance die Liste mutiert.
  const ids = state.inventory.instances
    .filter((inst) => inst.baseItemId === itemId)
    .map((inst) => inst.instanceId);
  let soldInstances = 0;
  for (const id of ids) {
    const g = sellInstance(state, content, id);
    if (g > 0) {
      gold += g;
      soldInstances++;
    }
  }
  return { gold, soldStack, soldInstances };
}

/**
 * Kauft den Buy-Back-Eintrag an Position `index` zurück (Task #245): zieht `qty*price` Gold ab und
 * legt Item/Instanz zurück ins Inventar, dann entfernt es den Eintrag aus der Liste. All-or-nothing —
 * reicht das Gold nicht ODER passt der volle Stapel nicht ins Inventar, passiert nichts (`false`).
 * Instanzen kehren über `addInstance` in die (unbegrenzte) Instanz-Tasche zurück; schlichte Stacks
 * über `addItem`. Gibt `true` bei erfolgreichem Rückkauf zurück.
 */
export function buyBack(state: GameState, content: ContentDB, index: number): boolean {
  if (!Array.isArray(state.buyBack)) return false;
  const entry = state.buyBack[index];
  if (!entry) return false;
  const qty = entry.instance ? 1 : entry.qty;
  const totalCost = qty * entry.price;
  if (!Number.isFinite(totalCost) || totalCost < 0) return false;
  if (state.character.gold < totalCost) return false;

  if (entry.instance) {
    // Instanz-Tasche ist unbegrenzt → kein Platz-Check nötig.
    addInstance(state.inventory, entry.instance);
  } else {
    // Nur zurückkaufen, wenn der GANZE Stapel ins Inventar passt (kein Teilkauf → kein Verlust).
    const added = addItem(state.inventory, content, entry.itemId, qty);
    if (added < qty) {
      if (added > 0) removeItem(state.inventory, entry.itemId, added); // Teil-Add zurückrollen
      return false;
    }
  }
  state.character.gold -= totalCost;
  state.stats.goldSpent += totalCost;
  state.buyBack.splice(index, 1);
  // Erst-Besitz-Marker (SAVE 58): deckt den Rückkauf eines VOR dem Feature verkauften Items ab
  // (der sanitize-Backfill sah es nie im Bestand). entry.itemId === instance.baseItemId (sanitize).
  markItemDiscovered(state, entry.itemId);
  return true;
}

/** Kauft ein Inventar-Slot-Upgrade. */
export function buySlotUpgrade(state: GameState, content: ContentDB): boolean {
  const cost = slotUpgradeCost(state);
  if (state.character.gold < cost) return false;
  state.character.gold -= cost;
  state.stats.goldSpent += cost;
  expandBaseCapacity(state.inventory, content, SLOT_UPGRADE_AMOUNT);
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// Meisterring-Wiederbeschaffung (Chef-Auftrag 2026-07-18, Live-Fund am eigenen Save:
// „sollte mit Max-Level immer neu zu kaufen sein falls man es verliert, also im Shop").
//
// Sicherheitsnetz UNTER der Vergabe-Härtung (grantPendingCapes stellt seit SAVE 69 garantiert
// zu): wer seinen Meisterring VERKAUFT oder anderweitig verloren hat, kann ihn im Laden
// wiederbeschaffen — Bedingungen je Ring:
//  (a) die Weihe wurde erreicht UND der Ring wurde je verliehen (`capeGranted[skill] === true`;
//      bewusst der Verleihungs- statt der Weihe-Marker: solange die Erst-Verleihung noch
//      aussteht, würde ein Shop-Kauf plus Nachreichung ein Duplikat erzeugen);
//  (b) der Spieler besitzt das Item NIRGENDS mehr (Inventar-Stacks + Instanz-Tasche, Bank +
//      Gear-Vault, angelegt, Buy-Back-Regal — das Regal zählt als Besitz: dort ist der
//      reguläre, günstigere Rückkauf-Pfad).
//
// PREIS = voller Item-`value` (50 000; Krönung 100 000) — Wiederbeschaffung, keine Strafe,
// aber exploit-fest: der Verkauf zahlt maximal round(value·SELL_FRACTION)·1,05 (Pet-Bonus
// „Appraiser's Eye" ≤ 5 %) = 0,525·value < value ⇒ Verkaufen+Wiederkaufen ist immer ein
// Verlustgeschäft, nie eine Gold-Pumpe (Guard in master-ring-shop.test.ts). Kein RNG.
// ───────────────────────────────────────────────────────────────────────────

/** Wiederbeschaffungspreis eines Meisterrings (voller Item-value; s. Exploit-Rechnung oben). */
export function masterRingShopCost(content: ContentDB, itemId: ItemId): number {
  return Math.max(1, Math.floor(content.items[itemId]?.value ?? 0));
}

/**
 * Besitzt der Spieler das Item IRGENDWO? (Inventar-Stacks, Instanz-Tasche, Bank, Gear-Vault,
 * angelegt, Buy-Back-Regal — Instanzen zählen über ihre `baseItemId`.) Rein lesend.
 */
function ownsItemAnywhere(state: GameState, itemId: ItemId): boolean {
  if (itemCount(state.inventory, itemId) > 0) return true;
  for (const inst of state.inventory.instances ?? []) {
    if (inst?.baseItemId === itemId) return true;
  }
  if ((state.bank[itemId] ?? 0) > 0) return true;
  for (const inst of state.bankInstances ?? []) {
    if (inst?.baseItemId === itemId) return true;
  }
  for (const slot of EQUIP_SLOTS) {
    if (state.character.equipment[slot] === itemId) return true;
  }
  for (const entry of state.buyBack ?? []) {
    if (entry?.itemId === itemId) return true;
  }
  return false;
}

/**
 * Aktuell WIEDERBESCHAFFBARE Meisterringe als Shop-Einträge (leer, wenn nichts fehlt). Pure
 * Lese-Funktion für die Shop-UI: je verlorenem Ring ein `{ itemId, cost }` (Preis =
 * `masterRingShopCost`). Deterministische Reihenfolge (Einfüge-Reihenfolge der Weihen in
 * `capeGranted` — praktisch Erreichens-Reihenfolge). Der Kauf läuft über `buyMasterRing`.
 */
export function masterRingShopEntries(state: GameState, content: ContentDB): ShopEntry[] {
  const entries: ShopEntry[] = [];
  const granted = state.capeGranted ?? {};
  for (const skillId of Object.keys(granted)) {
    if (granted[skillId] !== true) continue;
    const itemId = masterRingItemId(skillId);
    if (!content.items[itemId]) continue; // Content-Guard (Muster grantPendingCapes)
    if (ownsItemAnywhere(state, itemId)) continue;
    entries.push({ itemId, cost: masterRingShopCost(content, itemId) });
  }
  return entries;
}

/**
 * Kauft einen verlorenen Meisterring zurück (Sicherheitsnetz-Verb für die Shop-UI). Validiert
 * die Berechtigung LIVE gegen `masterRingShopEntries`-Bedingungen (Weihe verliehen && nirgends
 * besessen) und das Gold; die Zustellung nutzt addItemOrBank mit derselben Bank-Garantie wie
 * die Erst-Verleihung (ein Kauf bei vollem Inventar schlägt nie fehl und verliert nie das
 * Item). Gibt `true` bei erfolgreichem Kauf zurück. Kein RNG.
 */
export function buyMasterRing(state: GameState, content: ContentDB, itemId: ItemId): boolean {
  const offered = masterRingShopEntries(state, content).find((e) => e.itemId === itemId);
  if (!offered) return false;
  if (state.character.gold < offered.cost) return false;
  state.character.gold -= offered.cost;
  state.stats.goldSpent += offered.cost;
  const { toInventory, toBank } = addItemOrBank(state, content, itemId, 1);
  if (toInventory + toBank <= 0) {
    // Zustell-Garantie (Muster grantPendingCapes): direkt in die Bank, Record hat immer Platz.
    state.bank[itemId] = (state.bank[itemId] ?? 0) + 1;
    markItemDiscovered(state, itemId);
  }
  return true;
}

// ───────────────────────────────────────────────────────────────────────────
// claude:2026-10-25T10:32:00+01:00 — Sammelverkauf von Ausrüstung (1.4.1 K1, Chef-Freigabe nach Steam-Wunsch:
// „Can we have the sell-all button for weapon selling? … when you have thousands of weapon items to sell.“).
//
// Vorbild ist der Bergungs-Sammelknopf (salvage.ts `salvagePlan`/`salvageBatch`): erst eine reine Vorschau, dann
// genau dieser Plan als Ausführung. Der Spieler wählt die Art (Waffen, Rüstung, Schmuck, alles) und die Seltenheit
// „bis einschließlich X“; Quelle ist das Inventar (Laden) oder die Bank (Bankseite).
//
// Nie verkauft werden:
//  • angelegte Ausrüstung, Teile in Ausrüstungs-Kits und Werkzeuge im Werkzeugplatz: strukturell, sie liegen
//    weder im Inventar noch in der Bank (equipItem/equipInstance/equipTool ziehen sie heraus);
//  • gesperrte Items (dasselbe Schloss wie Bergung und Arbeitsaufträge: Item-ID sperrt Stapel UND alle
//    Einzelstücke dieses Items, Instanz-ID sperrt das Einzelstück);
//  • Einzelstücke mit Runen (Verzauberungen), wie bei der Bergung eine bewusste Einzel-Entscheidung;
//  • Werkzeuge mit Ausrüstungsslot (die Äxte): sie wirken auch lose aus dem Inventar (`bestToolSpeed`);
//  • Meisterringe (Weihe-Belohnung, Wiederkauf kostet den vollen Wert);
//  • Items, die ein offener Arbeitsauftrag noch verlangt (sonst scheitert die Abgabe am Bestand).
// Quest-Ziele zählen Kills, Level und Zugänge (gather/craft), nie Besitz; dafür ist kein Ausschluss nötig.
//
// Rückkauf: ein Sammelverkauf legt KEINE Einträge ins Rückkaufregal. Das Regal fasst BUYBACK_MAX_ENTRIES (12);
// tausende Einzelstücke würden es fluten und die echten letzten Einzelverkäufe verdrängen (Präzedenz:
// bank.ts `sellFromStorage` verkauft ebenfalls ohne Regal-Eintrag). Die Vorschau mit Bestätigung ist das Netz.
//
// Leistung: je Quelle EIN Durchlauf über Fächer bzw. Einzelstücke für den Plan und EIN Durchlauf fürs Entfernen
// (Kompaktieren an Ort und Stelle), kein removeItem/removeInstance je Teil (die wären O(n) je Aufruf ⇒ O(n²)).
// Preis = `effectiveSellPrice` je Basis-Item, exakt wie sellItem/sellInstance. Kein RNG, keine Uhr.
// ───────────────────────────────────────────────────────────────────────────

/** Art eines Ausrüstungsteils für den Sammelverkauf. */
export type EquipmentSellKind = "weapons" | "armor" | "jewelry";
/** Filter im Dialog: eine Art oder alles. */
export type EquipmentSellFilter = EquipmentSellKind | "all";
/** Woraus verkauft wird: Inventar (Laden) oder Bank (Bankseite). */
export type EquipmentSellSource = "inventory" | "bank";

export const EQUIPMENT_SELL_KINDS: readonly EquipmentSellKind[] = ["weapons", "armor", "jewelry"];

export interface EquipmentSellOptions {
  kind: EquipmentSellFilter;
  /** Höchste Seltenheit, die noch verkauft wird (einschließlich). */
  maxRarity: ItemRarity;
  source: EquipmentSellSource;
}

/** Eine Zeile der Vorschau: ein Basis-Item mit ganzem Stapel und/oder Einzelstücken ohne Runen. */
export interface EquipmentSellPlanEntry {
  itemId: ItemId;
  kind: EquipmentSellKind;
  /** Fungible Menge (der ganze Stapel). */
  stackQty: number;
  /** Einzelstücke ohne Runen, die mitverkauft werden. */
  instanceIds: string[];
  /** Stückpreis wie beim Einzelverkauf (`effectiveSellPrice`). */
  unitPrice: number;
  /** stackQty + instanceIds.length */
  pieces: number;
  /** pieces × unitPrice */
  gold: number;
}

/** Teile, die Art und Seltenheit erfüllen, aber geschützt bleiben (für den Hinweis im Dialog). */
export interface EquipmentSellSkipped {
  locked: number;
  runes: number;
  tools: number;
  masterRings: number;
  orders: number;
}

export interface EquipmentSellTotals {
  pieces: number;
  gold: number;
}

export interface EquipmentSellPlan extends EquipmentSellTotals {
  entries: EquipmentSellPlanEntry[];
  byKind: Record<EquipmentSellKind, EquipmentSellTotals>;
  skipped: EquipmentSellSkipped;
}

export interface EquipmentSellResult extends EquipmentSellTotals {
  /** Anzahl verkaufter Item-Arten (Basis-Items). */
  kinds: number;
  byKind: Record<EquipmentSellKind, EquipmentSellTotals>;
}

/** Art eines Items für den Sammelverkauf; null = keine Ausrüstung (Material, Werkzeug-Typ, Verbrauchsgut). */
export function equipmentSellKind(item: ItemDef | undefined): EquipmentSellKind | null {
  if (!item || item.type !== "equipment" || !item.slot) return null;
  if (item.slot === "ring1" || item.slot === "ring2" || item.slot === "amulet") return "jewelry";
  // Wie die Laden-Kategorie (weaponStyle ⇒ Waffe), dazu Haupthand und Foki/Totems mit Waffentyp ohne Stil.
  if (item.weaponStyle || item.weaponType || item.slot === "mainhand") return "weapons";
  return "armor";
}

function sellRarityRank(r: ItemRarity | undefined): number {
  return ITEM_RARITIES.indexOf(r ?? "common");
}

function emptyKindTotals(): Record<EquipmentSellKind, EquipmentSellTotals> {
  return { weapons: { pieces: 0, gold: 0 }, armor: { pieces: 0, gold: 0 }, jewelry: { pieces: 0, gold: 0 } };
}

/**
 * Vorschau des Sammelverkaufs: alle passenden, nicht geschützten Ausrüstungsteile der Quelle, je Basis-Item eine
 * Zeile (ganzer Stapel + Einzelstücke ohne Runen). Reine Lese-Funktion; Reihenfolge deterministisch (Inventar:
 * Fachreihenfolge, danach reine Einzelstück-Arten; Bank: Einfügereihenfolge des Bestands, danach der Gear-Vault).
 */
export function equipmentSellPlan(state: GameState, content: ContentDB, opts: EquipmentSellOptions): EquipmentSellPlan {
  const maxRank = sellRarityRank(opts.maxRarity);
  const locked = state.lockedItems ?? {};
  const orderItems = new Set<ItemId>();
  for (const o of state.workOrders?.open ?? []) if (o?.itemId) orderItems.add(o.itemId);

  // Bestand der Quelle einsammeln: Stapelmengen und Einzelstücke je Basis-Item (je ein Durchlauf).
  const stacks = new Map<ItemId, number>();
  const instances = new Map<ItemId, ItemInstance[]>();
  if (opts.source === "inventory") {
    for (const slot of state.inventory.slots) {
      if (!slot || slot.instance || slot.qty <= 0) continue;
      stacks.set(slot.itemId, (stacks.get(slot.itemId) ?? 0) + slot.qty);
    }
  } else {
    for (const [id, qty] of Object.entries(state.bank)) {
      if (typeof qty === "number" && qty > 0) stacks.set(id, qty);
    }
  }
  const instList = opts.source === "inventory" ? state.inventory.instances : state.bankInstances;
  for (const inst of instList ?? []) {
    if (!inst?.baseItemId) continue;
    const arr = instances.get(inst.baseItemId);
    if (arr) arr.push(inst);
    else instances.set(inst.baseItemId, [inst]);
  }

  const ids: ItemId[] = [...stacks.keys()];
  for (const id of instances.keys()) if (!stacks.has(id)) ids.push(id);

  const entries: EquipmentSellPlanEntry[] = [];
  const byKind = emptyKindTotals();
  const skipped: EquipmentSellSkipped = { locked: 0, runes: 0, tools: 0, masterRings: 0, orders: 0 };
  let pieces = 0;
  let gold = 0;
  for (const itemId of ids) {
    const item = content.items[itemId];
    const kind = equipmentSellKind(item);
    if (!item || !kind) continue;
    if (opts.kind !== "all" && opts.kind !== kind) continue;
    if (sellRarityRank(item.rarity) > maxRank) continue;
    const stackQty = stacks.get(itemId) ?? 0;
    const group = instances.get(itemId) ?? [];
    const all = stackQty + group.length;
    // Geschützte Arten: die ganze Gruppe bleibt liegen (Reihenfolge = Vorrang beim Zählen).
    if (itemId.startsWith("ring_master_")) { skipped.masterRings += all; continue; }
    if (item.tool) { skipped.tools += all; continue; }
    if (orderItems.has(itemId)) { skipped.orders += all; continue; }
    if (locked[itemId] === true) { skipped.locked += all; continue; }
    const instanceIds: string[] = [];
    for (const inst of group) {
      if (locked[inst.instanceId] === true) skipped.locked++;
      else if ((inst.affixes?.length ?? 0) > 0) skipped.runes++;
      else instanceIds.push(inst.instanceId);
    }
    const n = stackQty + instanceIds.length;
    if (n <= 0) continue;
    const unitPrice = effectiveSellPrice(state, content, itemId);
    const g = n * unitPrice;
    entries.push({ itemId, kind, stackQty, instanceIds, unitPrice, pieces: n, gold: g });
    byKind[kind].pieces += n;
    byKind[kind].gold += g;
    pieces += n;
    gold += g;
  }
  return { entries, byKind, skipped, pieces, gold };
}

/**
 * Führt den Sammelverkauf aus (`equipmentSellPlan` mit denselben Optionen, frisch auf dem aktuellen Stand). Entfernt
 * Stapel und Einzelstücke in je einem Durchlauf, schreibt das Gold in einer Summe gut und legt bewusst keinen
 * Rückkauf-Eintrag an (s. Kopf). Bank: geleerte Fächer bleiben leer stehen wie beim Abheben (`syncBankOrder`).
 */
export function sellEquipmentBatch(state: GameState, content: ContentDB, opts: EquipmentSellOptions): EquipmentSellResult {
  const plan = equipmentSellPlan(state, content, opts);
  const byKind = emptyKindTotals();
  if (plan.entries.length === 0) return { pieces: 0, gold: 0, kinds: 0, byKind };

  const entryById = new Map<ItemId, EquipmentSellPlanEntry>();
  const instanceIds = new Set<string>();
  for (const e of plan.entries) {
    entryById.set(e.itemId, e);
    for (const id of e.instanceIds) instanceIds.add(id);
  }
  // Tatsächlich entfernte Stückzahl je Basis-Item (das Gold folgt dem Entfernten, nicht nur dem Plan).
  const sold = new Map<ItemId, number>();
  const bump = (id: ItemId, n: number): void => {
    sold.set(id, (sold.get(id) ?? 0) + n);
  };

  if (opts.source === "inventory") {
    const slots = state.inventory.slots;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot || slot.instance || slot.qty <= 0) continue;
      const e = entryById.get(slot.itemId);
      if (!e || e.stackQty <= 0) continue;
      bump(slot.itemId, slot.qty);
      slots[i] = null;
    }
  } else {
    for (const e of plan.entries) {
      const have = state.bank[e.itemId] ?? 0;
      if (e.stackQty <= 0 || have <= 0) continue;
      bump(e.itemId, have);
      delete state.bank[e.itemId];
    }
  }

  // Einzelstücke an Ort und Stelle kompaktieren (ein Durchlauf, Reihenfolge der übrigen bleibt).
  const list = opts.source === "inventory" ? state.inventory.instances : state.bankInstances;
  if (instanceIds.size > 0 && Array.isArray(list)) {
    let w = 0;
    for (let r = 0; r < list.length; r++) {
      const inst = list[r]!;
      if (inst && instanceIds.has(inst.instanceId)) {
        bump(inst.baseItemId, 1);
        continue;
      }
      list[w++] = inst;
    }
    list.length = w;
  }
  if (opts.source === "bank") syncBankOrder(state, effectiveBankCapacity(state, content), storagePredicate(content));

  let pieces = 0;
  let gold = 0;
  for (const [id, n] of sold) {
    const e = entryById.get(id)!;
    const g = n * e.unitPrice;
    byKind[e.kind].pieces += n;
    byKind[e.kind].gold += g;
    pieces += n;
    gold += g;
  }
  addGold(state, gold);
  return { pieces, gold, kinds: sold.size, byKind };
}
