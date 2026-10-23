import {
  BANK_SLOT_BASE_COST,
  BANK_SLOT_GROWTH,
  BANK_SLOT_PACKAGE,
  MAX_BANK_SLOTS_PURCHASED,
  effectiveBankCapacity,
  usedBankSlots,
  syncBankOrder,
  type ContentDB,
  type GameState,
  type ItemId,
} from "@hearthforge/shared";
import { addInstance, addItem, canHold, hasInstanceRoom, itemCount, removeInstance, removeItem } from "./inventory";
import { isStorageItem, storagePredicate } from "./storage";
import { addGold, effectiveSellPrice } from "./shop"; // claude:2026-10-23T21:50:00+02:00 — Verkauf aus dem Lager // claude:2026-10-23T21:50:00+02:00 — Materiallager (1.4.0 ML)

/** Menge eines Items im Lager. */
export function bankCount(state: GameState, itemId: ItemId): number {
  return state.bank[itemId] ?? 0;
}

/** Belegte Bank-Slots = Anzahl distinkter eingelagerter Item-Arten (nur mit echtem Bestand &gt;0). */
export function bankSlotsUsed(state: GameState, content?: ContentDB): number {
  // claude:2026-10-23T21:50:00+02:00 — Materiallager (1.4.0 ML): mit `content` zählt Lagerware nicht als Bankplatz.
  // Ein 0-qty-Geister-Key (Alt-/Korrupt-Save) darf keinen Slot belegen/die Kapazität blockieren
  // (konsistent zu bankList; Tester-Sweep3 T13). [Sweep6 W2-T5-P3] Zähl-Logik lebt jetzt in
  // shared.usedBankSlots — EINE Quelle für bank.ts, inventory.ts (Auto-Bank), tick.ts, quests.ts.
  return usedBankSlots(state, content ? storagePredicate(content) : undefined);
}

/**
 * Ist die Bank voll? (Alle effektiven Slots durch distinkte Arten belegt.)
 *
 * `content` seit Welle 2 (Task #359) Pflicht: die effektive Kapazität enthält den Lager-Term
 * (Vorratsspeicher `bankSlots`, +4/+4/+6), und der lebt im Gebäude-KATALOG — ohne ContentDB ließe
 * er sich nicht auflösen. Ohne gebauten Vorratsspeicher (oder ohne `content.campBuildings`) ist der Term
 * exakt 0 ⇒ Alt-Verhalten unverändert.
 */
export function isBankFull(state: GameState, content: ContentDB): boolean {
  return bankSlotsUsed(state, content) >= effectiveBankCapacity(state, content);
}

/**
 * Kann diese Item-Art (weiter) eingelagert werden? Bestehende Stacks immer; eine NEUE
 * Art nur, solange noch ein freier Bank-Slot existiert (inkl. Lager-Term, s. `isBankFull`).
 */
export function canDeposit(state: GameState, content: ContentDB, itemId: ItemId): boolean {
  if (state.bank[itemId] !== undefined) return true;
  if (isStorageItem(content, itemId)) return true; // claude:2026-10-23T21:50:00+02:00 — Lagerware braucht keinen Bankplatz
  return !isBankFull(state, content);
}

/** Alle Lager-Einträge als Liste (für die UI), in Content-Reihenfolge der Items. */
export function bankList(state: GameState, content: ContentDB): Array<{ itemId: ItemId; qty: number }> {
  const order = Object.keys(content.items);
  // claude:2026-10-23T21:50:00+02:00 — Materiallager (1.4.0 ML): die Bank-Seite zeigt keine Lagerware mehr (eigene Lager-Seite).
  return order
    .filter((id) => (state.bank[id] ?? 0) > 0 && !isStorageItem(content, id))
    .map((id) => ({ itemId: id, qty: state.bank[id]! }));
}

/**
 * Lagert bis zu `qty` eines Items aus dem Inventar ins Lager ein.
 * Gibt die tatsächlich eingelagerte Menge zurück.
 */
export function depositItem(state: GameState, content: ContentDB, itemId: ItemId, qty: number): number {
  // Nicht-endliche Menge (NaN/Infinity) wie <=0 behandeln: sonst würde NaN den Bank-Bestand
  // vergiften (spiegelt SimPlayer.advanceTime).
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  // Voll-Lager: neue Item-Art belegt keinen Slot mehr → verlustfrei ablehnen.
  if (!canDeposit(state, content, itemId)) return 0;
  const have = itemCount(state.inventory, itemId);
  const move = Math.min(Math.max(0, qty), have);
  if (move <= 0) return 0;
  removeItem(state.inventory, itemId, move);
  state.bank[itemId] = (state.bank[itemId] ?? 0) + move;
  syncBankOrder(state, effectiveBankCapacity(state, content), storagePredicate(content)); // claude:2026-10-17T21:00:00+02:00 Platzierung (SAVE 87): neues Item haengt hinten an
  return move;
}

/** Lagert das gesamte Inventar ein (außer Taschen-/Ausrüstungs-Slots, die separat sind). */
export function depositAll(state: GameState, content: ContentDB): number {
  let total = 0;
  // Snapshot, da removeItem die Slots mutiert.
  const counts: Record<string, number> = {};
  for (const slot of state.inventory.slots) {
    if (slot) counts[slot.itemId] = (counts[slot.itemId] ?? 0) + slot.qty;
  }
  for (const [itemId, qty] of Object.entries(counts)) total += depositItem(state, content, itemId, qty);
  return total;
}

/**
 * „Stack all" (Steam-Forum L1GR, 27.08.2026): lagert NUR die Inventar-Items ein, die im Lager BEREITS liegen
 * (Bestand > 0) — die neuen Stapel fallen auf die bestehenden, das Lager braucht keinen freien Slot, das
 * Inventar wird um genau die Sorten leichter, die man ohnehin sammelt. Alles andere bleibt in der Tasche.
 * Ausrüstungs-/Taschen-Slots und Instanzen unberührt (wie depositAll). Gibt die bewegte Stückzahl zurück.
 */
export function depositStackable(state: GameState, content: ContentDB): number {
  let total = 0;
  const counts: Record<string, number> = {};
  for (const slot of state.inventory.slots) {
    if (slot && (state.bank[slot.itemId] ?? 0) > 0) counts[slot.itemId] = (counts[slot.itemId] ?? 0) + slot.qty;
  }
  for (const [itemId, qty] of Object.entries(counts)) total += depositItem(state, content, itemId, qty);
  return total;
}

/**
 * Hebt bis zu `qty` eines Items aus dem Lager ab — begrenzt durch Lagerbestand
 * UND freien Inventarplatz. Gibt die tatsächlich abgehobene Menge zurück.
 */
export function withdrawItem(state: GameState, content: ContentDB, itemId: ItemId, qty: number): number {
  const stored = state.bank[itemId] ?? 0;
  let move = Math.min(Math.max(0, qty), stored);
  if (move <= 0) return 0;
  // Inventarplatz prüfen: stapelbare Items brauchen nur 1 Slot (falls noch keiner), sonst je 1.
  let added = 0;
  for (let i = 0; i < move; i++) {
    if (!canHold(state.inventory, content, itemId)) break;
    const a = addItem(state.inventory, content, itemId, 1);
    if (a < 1) break;
    added += a;
  }
  if (added <= 0) return 0;
  move = added;
  state.bank[itemId] = stored - move;
  if (state.bank[itemId]! <= 0) delete state.bank[itemId];
  // Leergeraeumtes Fach bleibt LEER stehen (OSRS-Verhalten) — syncBankOrder nullt es, rueckt aber nichts nach.
  syncBankOrder(state, effectiveBankCapacity(state, content), storagePredicate(content)); // claude:2026-10-17T21:00:00+02:00
  return move;
}

// ── Instanz-Vault (Gear-Vault: inventory.instances ↔ bankInstances) ──────────
// Non-stackable Item-Instanzen (verzaubert/gesuffixt) passen NICHT in die fungible Bank
// (`Record<itemId,qty>`). Sie wandern zwischen der unbegrenzten Inventar-Tasche (`inventory.instances`)
// und dem gleichfalls unbegrenzten Gear-Vault (`bankInstances`). Beide ohne Kapazitätslimit → die
// Verschiebung gelingt immer, wenn die Instanz am Quellort existiert.

/**
 * Lagert die Instanz `instanceId` aus der Inventar-Tasche in den Gear-Vault (`bankInstances`) ein.
 * `true` = verschoben; `false` = Instanz nicht in der Tasche.
 */
export function depositInstance(state: GameState, instanceId: string, content?: ContentDB): boolean {
  const inst = removeInstance(state.inventory, instanceId);
  if (!inst) return false;
  state.bankInstances.push(inst);
  syncBankOrder(state, undefined, content ? storagePredicate(content) : undefined); // claude:2026-10-17T21:00:00+02:00 reine Instanz-Basis bekommt ein Fach (claude:2026-10-23T21:50:00+02:00: ohne Lagerware)
  return true;
}

/**
 * „Stack einlagern" für ein Basis-Item: lagert den GESAMTEN fungiblen Stapel ein UND nimmt alle
 * verzauberten/gesuffixten Varianten (Instanzen mit `baseItemId === itemId`) gleich mit in den
 * Gear-Vault. Ein Klick lagert also Grundmenge + alle Varianten ein (Chef-Vorgabe).
 *
 * (a) Fungibler Stack: gesamte Inventarmenge via `depositItem` — respektiert das Bank-Slot-Limit
 *     für NEUE Arten genau wie der Einzel-Deposit.
 * (b) Instanzen: ALLE passenden Instanzen aus `inventory.instances` via `depositInstance` in den
 *     (unbegrenzten) `bankInstances`-Vault. Deshalb wandern Varianten IMMER mit, auch wenn die
 *     fungible Bank voll ist und der Stack selbst abgelehnt würde.
 *
 * `content` wird seit Welle 2 (Task #359) ECHT gelesen: die Bank-Kapazität in `depositItem` enthält
 * den Lager-Term (Vorratsspeicher). Rückgabe: eingelagerte fungible Menge + Anzahl bewegter Instanzen.
 * Nach dem Aufruf ist `inventory.instances` frei von dieser Basis-Art.
 */
export function depositBaseWithVariants(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): { deposited: number; instancesMoved: number } {
  const deposited = depositItem(state, content, itemId, itemCount(state.inventory, itemId));
  // Snapshot der passenden Instanz-IDs, da depositInstance `inventory.instances` mutiert.
  const ids = state.inventory.instances
    .filter((inst) => inst.baseItemId === itemId)
    .map((inst) => inst.instanceId);
  let instancesMoved = 0;
  for (const id of ids) if (depositInstance(state, id, content)) instancesMoved++;
  return { deposited, instancesMoved };
}

/**
 * Hebt die Instanz `instanceId` aus dem Gear-Vault zurück in die (unbegrenzte) Inventar-Tasche.
 * `true` = verschoben; `false` = Instanz nicht im Vault.
 */
export function withdrawInstance(state: GameState, instanceId: string, content?: ContentDB): boolean {
  const idx = state.bankInstances.findIndex((i) => i.instanceId === instanceId);
  if (idx === -1) return false;
  addInstance(state.inventory, state.bankInstances[idx]!);
  state.bankInstances.splice(idx, 1);
  syncBankOrder(state, undefined, content ? storagePredicate(content) : undefined); // claude:2026-10-17T21:00:00+02:00 (claude:2026-10-23T21:50:00+02:00: ohne Lagerware)
  return true;
}

// ── Atomare Gruppen-Ops (Task #314, Chef-GO "Bank-Sanierung") ────────────────────────────────
// Chef-Zitat: "Gestackte Items wie Waffen und Rüstungen mit mehreren Versionen lassen sich auch
// nicht drag and droppen. Man sollte aber den ganzen Stapel verschieben können." `depositBaseWithVariants`
// (oben) bewegt Stack + Instanzen zwar BEIDE, aber UNABHÄNGIG voneinander — bei voller Bank wandern
// die Instanzen trotzdem (unbegrenzter Vault), der Stack wird derweil abgelehnt: ein bewusster
// Teiltransfer (s. dortiges JSDoc/Testfall). Die beiden Funktionen hier sind das Gegenteil: ATOMAR
// (ganz oder gar nicht) — für Drag&Drop und die "ganzen Stapel"-Aktionen der Bank-UI (deposit-all/
// withdraw-all/Shift-Klick), wo ein stiller Teiltransfer verwirrend wäre ("wohin ist die eine
// Variante verschwunden, während der Rest noch im Inventar liegt?").
//
// Kapazitäts-Semantik: "sichtbare Zelle = Einheit" (spiegelt `hasInstanceRoom`/`instanceCellCount`,
// inventory.ts). Hat das ZIEL bereits eine Zelle dieses Basis-Items (fungibler Bestand ODER
// mindestens eine bestehende Instanz), passt die ankommende Gruppe IMMER, egal wie viele Exemplare.
// Ist die Art komplett NEU für das Ziel, braucht sie genau EINE freie Zelle — fehlt die, schlägt der
// GESAMTE Transfer fehl (nichts bewegt sich, State bleibt exakt wie vorher).

/** Bank-Pendant zu `hasInstanceRoom` (inventory.ts): hat dieses Basis-Item bereits IRGENDeine Zelle
 *  im Lager (fungibler Bestand ODER mindestens eine Instanz im Gear-Vault)? Nur für die beiden
 *  atomaren Gruppen-Ops unten relevant — der bestehende Einzel-Instanz-Pfad (`depositInstance`)
 *  bleibt bewusst unbegrenzt/unconditional (s. dortiges JSDoc). */
function bankHasCell(state: GameState, itemId: ItemId): boolean {
  if ((state.bank[itemId] ?? 0) > 0) return true;
  return state.bankInstances.some((i) => i.baseItemId === itemId);
}

/**
 * Lagert den KOMPLETTEN Bestand eines Basis-Items — fungibler Stapel + ALLE verzauberten/
 * gesuffixten Varianten-Instanzen aus der Inventar-Tasche — in EINEM atomaren Zug ins Lager ein
 * (Task #314, "ganzer Stapel"-Vorgabe). Leere Gruppe (nichts von dieser Art im Inventar) ist ein
 * No-op. Kapazität s. Datei-Kopfkommentar oben; bei Ablehnung bewegt sich NICHTS (kein
 * Teiltransfer, anders als `depositBaseWithVariants`). Gibt die bewegte fungible Menge + Anzahl
 * bewegter Instanzen zurück (beide 0 bei No-op/Ablehnung).
 */
export function depositItemGroup(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): { deposited: number; instancesMoved: number } {
  const qty = itemCount(state.inventory, itemId);
  const instanceIds = state.inventory.instances
    .filter((inst) => inst.baseItemId === itemId)
    .map((inst) => inst.instanceId);
  if (qty <= 0 && instanceIds.length === 0) return { deposited: 0, instancesMoved: 0 }; // leere Gruppe
  if (!bankHasCell(state, itemId) && isBankFull(state, content)) return { deposited: 0, instancesMoved: 0 }; // atomar abgelehnt

  if (qty > 0) {
    removeItem(state.inventory, itemId, qty);
    state.bank[itemId] = (state.bank[itemId] ?? 0) + qty;
  }
  let instancesMoved = 0;
  for (const id of instanceIds) {
    const inst = removeInstance(state.inventory, id);
    if (inst) {
      state.bankInstances.push(inst);
      instancesMoved++;
    }
  }
  return { deposited: qty, instancesMoved };
}

/**
 * Gegenstück zu `depositItemGroup`: hebt den KOMPLETTEN Lager-Bestand eines Basis-Items — fungiblen
 * Stapel + ALLE Gear-Vault-Instanzen — in EINEM atomaren Zug in die Inventar-Tasche zurück (Task
 * #314). Vorher gab es dafür KEINE Entsprechung — `withdrawItem` bewegte nur den fungiblen Anteil,
 * Varianten mussten einzeln über `withdrawInstance` geholt werden (genau die Lücke, die Drag&Drop
 * für gestapelte Waffen/Rüstungen mit mehreren Versionen unbenutzbar machte). Leere Gruppe ist ein
 * No-op. Kapazität s. Datei-Kopfkommentar oben (Inventar-Zellen-Semantik via `hasInstanceRoom`);
 * bei Ablehnung bewegt sich NICHTS. Gibt die abgehobene fungible Menge + Anzahl bewegter Instanzen
 * zurück (beide 0 bei No-op/Ablehnung — z.B. volle Taschen).
 */
export function withdrawItemGroup(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
): { withdrawn: number; instancesMoved: number } {
  const stored = state.bank[itemId] ?? 0;
  const instanceIds = state.bankInstances
    .filter((inst) => inst.baseItemId === itemId)
    .map((inst) => inst.instanceId);
  if (stored <= 0 && instanceIds.length === 0) return { withdrawn: 0, instancesMoved: 0 }; // leere Gruppe
  if (!hasInstanceRoom(state.inventory, content, itemId)) return { withdrawn: 0, instancesMoved: 0 }; // atomar abgelehnt

  if (stored > 0) {
    delete state.bank[itemId];
    addItem(state.inventory, content, itemId, stored);
  }
  let instancesMoved = 0;
  for (const id of instanceIds) {
    const idx = state.bankInstances.findIndex((i) => i.instanceId === id);
    if (idx === -1) continue;
    addInstance(state.inventory, state.bankInstances[idx]!);
    state.bankInstances.splice(idx, 1);
    instancesMoved++;
  }
  return { withdrawn: stored, instancesMoved };
}

// ── Bank-Ausbau (Gold-Sink) ─────────────────────────────────────────────────
// Bank-Slots sind per Gold ausbaubar: jeder Kauf erweitert die effektive Kapazität um ein Paket
// (`BANK_SLOT_PACKAGE`) zu einem ESKALIERENDEN Preis. Damit wird die Bank ein endloser, mit dem
// Reichtum mitwachsender Gold-Sink (statt eines harten Deckels) — siehe Tester-Funde #10/#11.

/**
 * Kosten des NÄCHSTEN Bank-Slot-Pakets in Gold (eskalierend mit jedem bereits gekauften Paket).
 * `null` = Cap (`MAX_BANK_SLOTS_PURCHASED`) erreicht, kein weiterer Ausbau möglich. Preis =
 * round(`BANK_SLOT_BASE_COST` · `BANK_SLOT_GROWTH`^gekaufte_Pakete). Exportiert für die UI
 * (Preis-Anzeige + „Slots kaufen"-Button). Rein lesend (mutiert den State nicht).
 */
export function nextBankSlotCost(state: GameState): number | null {
  const purchased = Math.max(0, state.bankSlotsPurchased ?? 0);
  if (purchased >= MAX_BANK_SLOTS_PURCHASED) return null;
  const packagesBought = Math.floor(purchased / BANK_SLOT_PACKAGE);
  return Math.round(BANK_SLOT_BASE_COST * Math.pow(BANK_SLOT_GROWTH, packagesBought));
}

/**
 * Kauft EIN Paket Bank-Slots (+`BANK_SLOT_PACKAGE`) gegen Gold. Defensive: kein Kauf bei erreichtem
 * Cap oder zu wenig Gold (gibt `false` zurück, State unverändert). Bei Erfolg: Gold abziehen,
 * `stats.goldSpent` mitzählen, `bankSlotsPurchased` um ein Paket erhöhen (auf den Cap geklemmt).
 * Liefert `true` bei Erfolg.
 */
export function buyBankSlots(state: GameState): boolean {
  const cost = nextBankSlotCost(state);
  if (cost === null) return false; // Cap erreicht
  if (state.character.gold < cost) return false; // zu wenig Gold
  state.character.gold -= cost;
  state.stats.goldSpent += cost;
  const purchased = Math.max(0, state.bankSlotsPurchased ?? 0);
  state.bankSlotsPurchased = Math.min(MAX_BANK_SLOTS_PURCHASED, purchased + BANK_SLOT_PACKAGE);
  return true;
}

// ── Materiallager (1.4.0 „Feder und Stahl“ ML, claude:2026-10-23T21:50:00+02:00) ──────────────────────────
// Das Lager ist ein Bereich der Bank (Lagerware in `state.bank`, ohne Bankplatz). Diese zwei Helfer gehören zur
// Lager-Seite: alles Lagerbare aus dem Inventar einlagern und direkt aus dem Lager verkaufen.

/** Lagert jedes Material mit Regal aus dem Inventar ins Lager ein. Gibt die bewegte Stückzahl zurück. */
export function depositStorageMaterials(state: GameState, content: ContentDB): number {
  const counts = new Map<ItemId, number>();
  for (const slot of state.inventory.slots) {
    if (!slot || slot.instance) continue;
    if (!isStorageItem(content, slot.itemId)) continue;
    counts.set(slot.itemId, (counts.get(slot.itemId) ?? 0) + slot.qty);
  }
  let moved = 0;
  for (const [id, qty] of counts) {
    const removed = removeItem(state.inventory, id, qty);
    if (removed <= 0) continue;
    state.bank[id] = (state.bank[id] ?? 0) + removed;
    moved += removed;
  }
  return moved;
}

/**
 * Verkauft `qty` eines Lager-Materials direkt aus dem Lager (ohne Umweg über das Inventar), zum selben Stückpreis
 * wie `sellItem` (inkl. Begleiter-/Lager-Bonus). Kein Rückkauf-Eintrag: Rohstoffe sind jederzeit nachsammelbar,
 * und der Rückkauf landet im Inventar, das dafür evtl. keinen Platz hat. Gibt das erlöste Gold zurück.
 */
export function sellFromStorage(state: GameState, content: ContentDB, itemId: ItemId, qty: number): number {
  if (!Number.isFinite(qty) || qty <= 0) return 0;
  if (!isStorageItem(content, itemId)) return 0;
  const have = state.bank[itemId] ?? 0;
  const n = Math.min(Math.floor(qty), have);
  if (n <= 0) return 0;
  const gold = n * effectiveSellPrice(state, content, itemId);
  if (n >= have) delete state.bank[itemId];
  else state.bank[itemId] = have - n;
  addGold(state, gold);
  return gold;
}
