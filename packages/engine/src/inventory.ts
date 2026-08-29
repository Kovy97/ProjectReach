import type {
  ContentDB,
  GameState,
  InventorySlot,
  InventoryState,
  ItemId,
  ItemInstance,
} from "@hearthforge/shared";
import { PARAGON_KEY_ITEM_ID, SELL_FRACTION, effectiveBankCapacity, usedBankSlots } from "@hearthforge/shared";
import { unlockParagonTower } from "./dungeon";

/**
 * Maximale Stapelgröße pro Slot für stapelbare Items. Überlauf wandert in weitere Slots.
 * Chef-Entscheid 2026-07-18 (SAVE_VERSION 69): 999 → 9999, „jedes Item braucht maximal
 * 1 Stapel". Die v69-Migration (persistence) legt bestehende Teil-Stapel desselben Items
 * zusammen (erster Stapel behält seine Position, frei werdende Slots werden geleert).
 */
export const MAX_STACK = 9999;
// AMMO_MAX_STACK/maxStackFor: ENTFERNT (#286 Ammo-Removal) — der frühere Munitions-Sonder-Cap
// ist mit dem Munitions-System gestorben; es gilt einheitlich MAX_STACK. Bestehende überfüllte
// Alt-Save-Stacks bleiben unangetastet (sanitize klemmt nur auf QTY_HARD_CAP), nur NEUE Aufnahme
// cappt bei MAX_STACK — verlustfrei.

export function createInventory(baseCapacity: number): InventoryState {
  return {
    baseCapacity,
    // Taschenslot-System entfernt (Task #271, SAVE_VERSION 56): das Legacy-Feld bleibt leer.
    bagSlots: [],
    slots: new Array<InventorySlot | null>(baseCapacity).fill(null),
    instances: [],
  };
}

/**
 * Effektive Kapazität = `baseCapacity` (nur noch per Gold-Shop-Upgrade `buySlotUpgrade` erhöhbar;
 * das Taschenslot-System ist entfernt, Task #271). `content` bleibt für Signatur-Stabilität
 * (App/BankPage/persistence rufen mit content auf) — wird nicht mehr gelesen.
 */
export function effectiveCapacity(inv: InventoryState, content: ContentDB): number {
  void content;
  return inv.baseCapacity;
}

/**
 * Hält `slots.length` auf der effektiven Kapazität. Beim Wachsen werden leere
 * Plätze angehängt; beim Schrumpfen werden Items nach vorne kompaktiert und auf
 * die Zielgröße gekürzt (nie unter die Anzahl belegter Slots).
 */
function syncSlots(inv: InventoryState, content: ContentDB): void {
  const target = effectiveCapacity(inv, content);
  if (inv.slots.length === target) return;

  if (inv.slots.length < target) {
    while (inv.slots.length < target) inv.slots.push(null);
    return;
  }

  const items = inv.slots.filter((s): s is InventorySlot => s !== null);
  const next: Array<InventorySlot | null> = new Array(Math.max(target, items.length)).fill(null);
  items.forEach((item, i) => {
    next[i] = item;
  });
  inv.slots = next;
}

export function itemCount(inv: InventoryState, itemId: ItemId): number {
  let total = 0;
  for (const slot of inv.slots) {
    // Instanz-Slots (modifizierte Items) sind NICHT fungibel — sie zählen nicht als plain Stack.
    if (slot && slot.itemId === itemId && !slot.instance) total += slot.qty;
  }
  return total;
}

export function usedSlots(inv: InventoryState): number {
  let n = 0;
  for (const slot of inv.slots) if (slot) n++;
  return n;
}

export function isFull(inv: InventoryState): boolean {
  return usedSlots(inv) >= inv.slots.length;
}

/** Anzahl freier (leerer) Inventar-Slots. Für Kapazitäts-Vorprüfungen (z.B. Equip-Tausch). */
export function freeSlots(inv: InventoryState): number {
  return inv.slots.length - usedSlots(inv);
}

/**
 * Fügt `qty` eines Items hinzu. Stackables landen in einem vorhandenen oder dem
 * ersten freien Slot; nicht-stapelbare Items belegen je 1 Slot. Gibt die
 * tatsächlich hinzugefügte Menge zurück (< qty bei vollem Inventar = Overflow).
 */
export function canHold(inv: InventoryState, content: ContentDB, itemId: ItemId): boolean {
  void content; // Signatur-Stabilität (Aufrufer übergeben content; seit #286 gilt einheitlich MAX_STACK)
  // Alle Items stapeln (bis MAX_STACK) → ein vorhandener (plain) Stack mit Platz braucht keinen freien Slot.
  if (inv.slots.some((s) => s !== null && s.itemId === itemId && !s.instance && s.qty < MAX_STACK)) return true;
  return inv.slots.some((s) => s === null);
}

export function addItem(
  inv: InventoryState,
  content: ContentDB,
  itemId: ItemId,
  qty: number,
): number {
  // Nicht-endliche Menge (NaN/Infinity aus einem künftigen Freitext-Feld) wie <=0 behandeln:
  // sonst würde `s.qty += NaN` einen Slot-Stack vergiften (spiegelt SimPlayer.advanceTime).
  if (!Number.isFinite(qty) || qty <= 0) return 0;

  // Chef-Entscheid: ALLE Items stapeln bis MAX_STACK (9999) — auch Gear/Werkzeuge. Das frühere
  // `stackable:false` (1-pro-Slot) wird hier bewusst ignoriert. Einzig-Unikate sind Item-INSTANZEN
  // (Suffix/verzaubert) — die laufen über `addInstance` und stapeln nie (Filter `!s.instance`).
  // Einheitlicher Cap seit #286 (der 9999er-Munitions-Sondercap ist mit dem Ammo-System gestorben).
  void content;
  const cap = MAX_STACK;
  let remaining = qty;
  // 1) Bestehende PLAIN Stacks bis zum Cap auffüllen.
  for (const s of inv.slots) {
    if (remaining <= 0) break;
    if (s !== null && s.itemId === itemId && !s.instance && s.qty < cap) {
      const add = Math.min(cap - s.qty, remaining);
      s.qty += add;
      remaining -= add;
    }
  }
  // 2) Rest in neue, freie Slots (je bis zum Cap).
  while (remaining > 0) {
    const idx = inv.slots.findIndex((s) => s === null);
    if (idx === -1) break;
    const add = Math.min(cap, remaining);
    inv.slots[idx] = { itemId, qty: add };
    remaining -= add;
  }
  return qty - remaining;
}

/**
 * Idle-Komfort: Fügt `qty` ins Inventar ein und schiebt den Überlauf (was nicht
 * mehr passt) automatisch ins Lager (Bank) — sofern `settings.autoBank` an ist.
 * So stoppt ein volles Inventar den Sammel-/Loot-Fortschritt nicht mehr; es geht
 * nichts verloren. Stacks werden korrekt zusammengeführt.
 *
 * Gibt zurück, wie viel ins Inventar bzw. ins Lager floss. Bei deaktiviertem
 * Auto-Bank verhält es sich wie `addItem` (Überlauf = Verlust, `toBank = 0`).
 */
export function addItemOrBank(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
  qty: number,
): { toInventory: number; toBank: number } {
  // Nicht-endliche Mengen hart abweisen (Robustness): vorher lief NaN am `qty <= 0`-Guard vorbei,
  // addItem gab 0 zurück und der Overflow-Zweig vergiftete die Bank mit `bank[id] += NaN`.
  if (!Number.isFinite(qty) || qty <= 0) return { toInventory: 0, toBank: 0 };
  // ── Paragon-Schlüssel-Intercept (Einmal-Unlock; SEIT Welle J/SAVE 64 der EINZIGE Schlüssel-
  // Pfad) ── CHEF-DIREKTIVE 2026-07-13 („Keine Dungeon keys mehr, sondern quest based unlock"):
  // der generische keyItem-Intercept ist ENTFERNT — Story-Dungeon-Schlüssel sind gewöhnliche
  // Items ohne Funktion (Alt-Bestände räumt die v64-Migration). NUR der Paragonturm bleibt sein
  // eigenes Einmal-Unlock-System (harter ID-Vergleich, kein Content-Mapping als Gate): der
  // paragon_key landet NIE im Besitz — Fund ⇒ Turm permanent entsperren (`unlockParagonTower`
  // setzt den UI-Breadcrumb `lastDungeonUnlock`); der entsperrende Schlüssel geht im Unlock auf.
  // Überzählige Stücke bzw. Funde bei bereits entsperrtem Turm werden zum Verkaufswert erstattet
  // (floor(value × SELL_FRACTION) je Stück, Köcher-Präzedenz #286 — kein toter Vendor-Trash,
  // kein stiller Verlust). Zieht KEIN RNG (determinismus-neutral); der Rückgabewert meldet die
  // Menge als „angekommen", damit Loot-Log/itemsGathered den Fund normal ausweisen. Direktpfade
  // vorbei an addItemOrBank (Alt-UI/Save-Edit) heilt der Paragon-Sweep der Persistenz beim
  // nächsten Load mit identischen Regeln.
  if (itemId === PARAGON_KEY_ITEM_ID) {
    markItemDiscovered(state, itemId); // der Fund IST Erst-Besitz (Collection-Log/Bestiarium)
    const surplus = Math.floor(qty) - (unlockParagonTower(state) ? 1 : 0);
    if (surplus > 0) {
      const unitRefund = Math.floor((content.items[itemId]?.value ?? 0) * SELL_FRACTION);
      if (unitRefund > 0 && Number.isFinite(state.character.gold)) {
        state.character.gold += unitRefund * surplus;
      }
    }
    return { toInventory: qty, toBank: 0 };
  }
  const toInventory = addItem(state.inventory, content, itemId, qty);
  // Erst-Besitz-Marker (Bestiarium/Item-Wiki, SAVE 58): dies ist der ZENTRALE Stack-Zugangs-Pfad
  // (Combat-Loot, Aktions-/Craft-Output, Farming-Ernte, Quest-/Token-Belohnungen laufen hier durch).
  // Nur markieren, wenn wirklich etwas ankam (volles Inventar + Auto-Bank aus = kein Besitz).
  if (toInventory > 0) markItemDiscovered(state, itemId);
  const overflow = qty - toInventory;
  if (overflow <= 0) return { toInventory, toBank: 0 };
  if (!state.settings.autoBank) return { toInventory, toBank: 0 };
  // Bank-Kapazität wahren: eine NEUE Item-Art belegt einen Slot; ist die Bank voll
  // (effektive Kapazität = Basis + gekaufte Slots distinkter Arten) und die Art noch nicht
  // im Lager, nicht einlagern. [Sweep6 W2-T5-P3] usedBankSlots (nur qty>0) statt
  // Object.keys().length — 0-qty-Geister-Keys blockierten Auto-Bank, obwohl manuelles
  // Einlagern (bank.ts zählt qty>0) noch ging.
  const isNewKind = state.bank[itemId] === undefined;
  if (isNewKind && usedBankSlots(state) >= effectiveBankCapacity(state, content)) {
    return { toInventory, toBank: 0 };
  }
  state.bank[itemId] = (state.bank[itemId] ?? 0) + overflow;
  // Auch reiner Bank-Zufluss (Inventar voll, toInventory 0) ist Erst-Besitz.
  markItemDiscovered(state, itemId);
  return { toInventory, toBank: overflow };
}

// ── Erst-Besitz / Item-Entdeckung (Bestiarium-/Item-Wiki-Fundament, SAVE_VERSION 58) ──────────
// `state.discoveredItems` ist ein Set als Record (JSON-freundlich). Markiert wird NUR an den
// zentralen Zugangs-Pfaden: `addItemOrBank` (oben — Loot/Craft/Ernte/Quests/Token-Shop),
// `intakeInstance` (enchant.ts — Suffix-/Instanz-Drops), Shop-Kauf/Buy-Back (shop.ts) und
// `createGame` (Starterbesitz via `discoverPossessedItems`). Bank-Entnahme/Unequip/Disenchant
// markieren bewusst NICHT — dort ist das Item per Definition bereits besessen (Alt-Bestände
// deckt der sanitize-Backfill in persistence ab).

/** Markiert ein Item als jemals besessen (idempotent, zieht KEIN RNG — determinismus-neutral). */
export function markItemDiscovered(state: GameState, itemId: ItemId): void {
  if (!itemId) return;
  // Defensiv gegen handgebaute Test-/Alt-States ohne Feld (Muster pushBuyBack, shop.ts).
  (state.discoveredItems ??= {})[itemId] = true;
}

/** Selektor für die UI: wurde dieses Item jemals besessen? (nie raw in den Record greifen) */
export function isItemDiscovered(state: GameState, itemId: ItemId): boolean {
  return state.discoveredItems?.[itemId] === true;
}

/**
 * Unioniert den IST-Bestand in `discoveredItems`: Inventar-Slots, Instanz-Tasche, Bank (qty > 0),
 * Gear-Vault (`bankInstances`), angelegte Ausrüstung UND die Ausrüstungs-Kits (`equipKits`, SAVE 85 —
 * inaktive Kits BESITZEN ihre Teile, sie sind aus dem Inventar entnommen; review-1.2.0 P2 29.08.2026:
 * vorher galt ein Item, das nur in einem inaktiven Kit lag, als nie besessen). Idempotent & monoton
 * (entfernt nie Einträge), zieht kein RNG. Zwei Aufrufer: `createGame` (Starterbesitz inkl. direkt
 * ausgerüsteter Startwaffe/-rüstung) und der sanitize-Pass in persistence (Alt-Save-Backfill +
 * Selbstheilung für Pfade, die am zentralen Marker vorbeilaufen — z.B. Alt-UI-Direktaufrufe von addItem).
 */
export function discoverPossessedItems(state: GameState): void {
  const d = (state.discoveredItems ??= {});
  for (const slot of state.inventory.slots) if (slot) d[slot.itemId] = true;
  for (const inst of state.inventory.instances) if (inst?.baseItemId) d[inst.baseItemId] = true;
  for (const [id, qty] of Object.entries(state.bank)) if (qty > 0) d[id as ItemId] = true;
  for (const inst of state.bankInstances) if (inst?.baseItemId) d[inst.baseItemId] = true;
  for (const id of Object.values(state.character.equipment)) if (id) d[id] = true;
  // Kits: `equipKits[activeKit]` spiegelt den Charakter (darf stale sein — die Union ist monoton, doppelt
  // schadet nicht); die inaktiven Kits tragen Teile, die sonst nirgends im State liegen. Defensiv gegen
  // handgebaute Test-/Alt-States ohne Feld (Sanitize legt es vor diesem Aufruf an).
  for (const kit of state.equipKits ?? []) {
    if (!kit) continue;
    for (const id of Object.values(kit.equipment ?? {})) if (id) d[id] = true;
    for (const inst of Object.values(kit.equippedInstances ?? {})) if (inst?.baseItemId) d[inst.baseItemId] = true;
  }
}

/**
 * Legt eine non-stackable Item-Instanz (verzaubert/gesuffixt) in die Instanz-Tasche (`inv.instances`,
 * #246). Stapelt nie, schlägt NIE fehl — der `boolean`-Rückgabewert bleibt nur signatur-kompatibel zu
 * den bestehenden Aufrufern (er ist immer `true`). BEWUSST UNCONDITIONAL: dieser Pfad verschiebt nur
 * BESTEHENDEN Bestand innerhalb des States um (Ausrüstungs-Tausch-Stow, Bank-Withdraw, Mail-Collect,
 * Enchant-Promotion) — diese Aufrufer verlassen sich darauf, dass er NIE fehlschlägt, sonst ginge bei
 * einem atomaren Ausrüstungs-Tausch eine Verzauberung verloren. Für FRISCHEN Zugang (Loot/Craft-Suffix)
 * NICHT direkt nutzen — dafür gibt es `addInstanceOrBank` (Kapazitäts-Gate, Chef-Bugfix „22/20").
 */
export function addInstance(inv: InventoryState, instance: ItemInstance): boolean {
  inv.instances.push(instance);
  return true;
}

/**
 * Anzahl der ZUSÄTZLICHEN Instanz-Container-Zellen (Chef-Design „Varianten-Container", #246 Phase C):
 * pro Basis-Item genau EINE Zelle — Instanzen eines Basis-Items, das bereits einen plain Stack-Slot
 * belegt, teilen sich dessen Zelle (kosten 0 zusätzliche Einheiten); NUR Basis-Items, die
 * AUSSCHLIESSLICH als Instanz existieren (kein Slot), bekommen eine eigene „orphan"-Zelle — und zwar
 * GENAU EINE, egal wie viele Instanzen dieser Basis-Art in der Tasche liegen (mehrere Exemplare in
 * einer Zelle sind gewollt günstig, s. `addInstanceOrBank`).
 *
 * MUSS deckungsgleich mit der Render-Logik bleiben (CharacterPage.tsx' `orphanInstanceGroups`: dieselbe
 * `groupInstancesByBase` + derselbe `slotItemIds`-Filter) — deshalb hier als geteilter Helper, den die
 * UI importieren kann/soll, statt die Gruppierung ein zweites Mal nachzubauen (Chef-Follow-up 23.07.,
 * Fund „21/20 Anzeige bei 19 sichtbaren Zellen").
 */
export function instanceCellCount(inv: InventoryState): number {
  if (inv.instances.length === 0) return 0;
  const slotItemIds = new Set<ItemId>();
  for (const s of inv.slots) if (s) slotItemIds.add(s.itemId);
  let orphanCells = 0;
  for (const baseId of groupInstancesByBase(inv.instances).keys()) {
    if (!slotItemIds.has(baseId)) orphanCells++;
  }
  return orphanCells;
}

/**
 * Kapazitäts-Verbrauch der regulären Inventar-Tasche in SICHTBAREN Zellen: belegte Slots (Stacks) +
 * zusätzliche Instanz-Container-Zellen (`instanceCellCount`) — NICHT die rohe Instanz-Anzahl (mehrere
 * Instanzen desselben Basis-Items teilen sich eine Zelle, s. `instanceCellCount`-Doku). Das ist die
 * EHRLICHE Zahl, die die UI dem Spieler zeigt (Chef-Follow-up 23.07.: die rohe Instanz-Zählung zeigte
 * „21/20" bei nur 19 sichtbaren Zellen). NUR für den Intake-Gate (`hasInstanceRoom`) und UI-Anzeige
 * relevant.
 */
export function usedCapacityUnits(inv: InventoryState): number {
  return usedSlots(inv) + instanceCellCount(inv);
}

/**
 * Ist beim INTAKE einer FRISCHEN Instanz von `baseItemId` noch Kapazität in der regulären Inventar-
 * Tasche? Trägt `baseItemId` BEREITS eine Zelle (ein plain Stack-Slot ODER schon mind. eine Instanz
 * derselben Basis-Art in `inv.instances`), teilt sich die neue Instanz diese Zelle — IMMER erlaubt,
 * unabhängig vom Füllstand (Zelle = Kapazitätseinheit, nicht Instanz = Kapazitätseinheit). Nur eine
 * BRAND NEUE Basis-Art (weder Slot noch bestehende Instanz-Gruppe) bräuchte eine zusätzliche Zelle —
 * dafür gilt das normale Kapazitäts-Limit. `false` heißt: der Aufrufer muss in den Gear-Vault ausweichen
 * (`addInstanceOrBank`). Reine Lese-Prüfung, kein Seiteneffekt.
 */
export function hasInstanceRoom(inv: InventoryState, content: ContentDB, baseItemId: ItemId): boolean {
  const hasExistingCell =
    inv.slots.some((s) => s !== null && s.itemId === baseItemId) ||
    inv.instances.some((i) => i.baseItemId === baseItemId);
  if (hasExistingCell) return true; // teilt sich eine bestehende Zelle → braucht 0 zusätzliche Einheiten
  return usedCapacityUnits(inv) < effectiveCapacity(inv, content); // bräuchte eine NEUE Zelle
}

/**
 * Kanonischer Kapazitäts-Gate für eine FRISCH erzeugte Instanz (Loot-/Craft-Suffix-Eingang, Chef-Bugfix
 * „22/20" 2026-07-23): vorher lief jeder Instanz-Eingang bedingungslos in die unbegrenzte Inventar-
 * Tasche (`addInstance`) — auch wenn Slots+Tasche die effektive Kapazität längst überschritten hatten.
 * Das Inventar-Grid konnte dadurch optisch beliebig über die Kapazität hinaus „überlaufen" (die UI
 * rendert je Basis-Item-Art ohne plain Stack-Sibling eine ZUSÄTZLICHE Container-Zelle, s.
 * `groupInstancesByBase`/`CharacterPage.tsx`).
 *
 * Jetzt: passt sie noch in die reguläre Tasche (`hasInstanceRoom`, Zellen-Semantik s. dort), landet sie
 * dort — sonst geht sie in den (unbegrenzten) Gear-Vault `bankInstances`, GENAU wie `addItemOrBank` es
 * für stapelbare Items via Bank-Overflow macht. NIE verloren, aber neuer Zugang wächst nie mehr über
 * die Kapazität hinaus. Bestehende Alt-Saves, deren Slots+Zellen die Kapazität schon überschreiten,
 * bleiben unverändert ladbar (kein Sanitize-Wegräumen) — sie normalisieren sich einfach durchs
 * Weiterspielen.
 *
 * `addInstance` selbst bleibt bewusst UNCONDITIONAL (s. dort) — dieser Gate gilt NUR für frischen Zugang.
 *
 * Gibt zurück, wohin die Instanz floss (für Erst-Besitz-Markierung/Analytics beim Aufrufer).
 */
export function addInstanceOrBank(
  state: GameState,
  content: ContentDB,
  instance: ItemInstance,
): { toInventory: boolean; toBank: boolean } {
  if (hasInstanceRoom(state.inventory, content, instance.baseItemId)) {
    addInstance(state.inventory, instance);
    return { toInventory: true, toBank: false };
  }
  // Gear-Vault ist unbegrenzt (Muster depositInstance/withdrawInstance, bank.ts) → nie „voll".
  state.bankInstances.push(instance);
  return { toInventory: false, toBank: true };
}

/**
 * Entfernt die Instanz mit `instanceId` aus der Tasche und gibt sie zurück (oder `null`, wenn sie
 * nicht (mehr) in der Tasche liegt). Einziger Weg, eine Instanz aus dem Inventar zu lösen
 * (Ausrüsten/Verkaufen/Einlagern) — Instanzen sind Unikate und laufen nie über `removeItem`.
 */
export function removeInstance(inv: InventoryState, instanceId: string): ItemInstance | null {
  const idx = inv.instances.findIndex((i) => i.instanceId === instanceId);
  if (idx === -1) return null;
  return inv.instances.splice(idx, 1)[0]!;
}

/** Liest die Instanz `instanceId` aus der Tasche (ohne sie zu entfernen). */
export function getInstance(inv: InventoryState, instanceId: string): ItemInstance | undefined {
  return inv.instances.find((i) => i.instanceId === instanceId);
}

/**
 * Gruppiert eine Instanz-Liste nach Basis-Item-ID — je Basis-Item eine Varianten-Gruppe (für die
 * Container-Zelle „×N"). Erhält die Eingabereihenfolge innerhalb jeder Gruppe. Rein lesend; Renderer
 * für Inventar, Shop und Bank teilen sich diesen Helfer, damit die Gruppierung überall identisch ist.
 */
export function groupInstancesByBase(list: ItemInstance[]): Map<ItemId, ItemInstance[]> {
  const map = new Map<ItemId, ItemInstance[]>();
  for (const inst of list) {
    const arr = map.get(inst.baseItemId);
    if (arr) arr.push(inst);
    else map.set(inst.baseItemId, [inst]);
  }
  return map;
}

/** Entfernt bis zu `qty` eines Items. Gibt die tatsächlich entfernte Menge zurück. */
export function removeItem(inv: InventoryState, itemId: ItemId, qty: number): number {
  if (qty <= 0) return 0;
  let remaining = qty;
  for (let i = 0; i < inv.slots.length && remaining > 0; i++) {
    const slot = inv.slots[i];
    // Instanz-Slots überspringen — Instanzen werden NUR über die Instanz-API entfernt (nie als
    // fungibler Stack), sonst würde Equippen/Verkaufen eine Verzauberung versehentlich zerstören.
    if (!slot || slot.itemId !== itemId || slot.instance) continue;
    const take = Math.min(slot.qty, remaining);
    slot.qty -= take;
    remaining -= take;
    if (slot.qty <= 0) inv.slots[i] = null;
  }
  return qty - remaining;
}

/**
 * Vertauscht zwei Inventar-Slots (manuelles Umsortieren per Drag & Drop). Tauscht den Inhalt von
 * `fromIdx` und `toIdx` — funktioniert für besetzt↔besetzt (Swap) wie besetzt↔leer (Verschieben).
 * No-op bei gleichen/ungültigen Indizes. Reine Umordnung; verändert keine Mengen/Items.
 */
export function moveInventorySlot(inv: InventoryState, fromIdx: number, toIdx: number): boolean {
  const n = inv.slots.length;
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= n || toIdx >= n) return false;
  const tmp = inv.slots[fromIdx] ?? null;
  inv.slots[fromIdx] = inv.slots[toIdx] ?? null;
  inv.slots[toIdx] = tmp;
  return true;
}

// ── Taschenslot-System: ENTFERNT (Task #271, SAVE_VERSION 56) ────────────────
// Kapazitäts-Upgrades laufen NUR noch über den Gold-Shop (`buySlotUpgrade`). `equipBag`/`unequipBag`/
// `installBag`/`uninstallBag` sind gelöscht (#278; die CharacterPage-Taschen-Leiste fiel mit #275).
// `inventory.bagSlots` bleibt als leeres Legacy-Feld im Save-Shape (Migration schreibt []).

/** Erhöht die Basis-Kapazität (z.B. durch ein gekauftes Slot-Upgrade). */
export function expandBaseCapacity(
  inv: InventoryState,
  content: ContentDB,
  extraSlots: number,
): void {
  if (extraSlots <= 0) return;
  inv.baseCapacity += extraSlots;
  syncSlots(inv, content);
}
