import type { BuyBackEntry, ContentDB, GameState, ItemId, ShopEntry } from "@hearthforge/shared";
import {
  AUTO_EAT_MAX_TIER,
  AUTO_EAT_TIERS,
  AUTO_REBUFF_UNLOCK_COST,
  BASE_INVENTORY_SLOTS,
  BUYBACK_BANNED_ITEM_IDS,
  BUYBACK_MAX_ENTRIES,
  EQUIP_SLOTS,
  SELL_BONUS_TOTAL_CAP,
  SELL_FRACTION,
  SLOT_UPGRADE_AMOUNT,
  SLOT_UPGRADE_BASE_COST,
  SLOT_UPGRADE_GROWTH,
  masterRingItemId,
} from "@hearthforge/shared";
import { addInstance, addItem, addItemOrBank, canHold, expandBaseCapacity, isFull, itemCount, markItemDiscovered, removeInstance, removeItem } from "./inventory";
import { petSellBonus } from "./pets";
import { campBoost } from "./camp";

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
