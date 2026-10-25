import { isStorageItem, storagePredicate } from "./storage"; // claude:2026-10-23T21:50:00+02:00 — Materiallager (1.4.0 ML)
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
    variantCells: {}, // claude:2026-10-25T18:00:00+01:00 — feste Fächer der Variantenzellen (SAVE 98)
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

  // claude:2026-10-25T18:00:00+01:00 — SAVE 98: Variantenzellen rücken beim Kompaktieren wie belegte Fächer mit (sonst zeigten
  // ihre Reservierungen nach dem Kürzen auf fremde Fächer).
  kompaktiereMitZellen(inv, target);
}

// ── Feste Fächer für Variantenzellen (SAVE_VERSION 98) ─────────────────────────────────────────────────────────────────
// claude:2026-10-25T18:00:00+01:00 — Chef-Report 25.10.2026: „Items verschieben sich nach Restart von selbst. Habe vom letzten Slot
// ein Item weggezogen, dann ist ein anderes Item hineingesprungen, was nicht mehr draggable ist.“ Reine Variantengruppen
// (verzaubert/gesuffixt, kein Grundstapel in `slots`) hatten kein eigenes Fach; der Client setzte sie bei jedem Rendern hinter das
// letzte belegte Fach. Zog man das letzte Item nach vorne, rückte eine Variantenzelle in die Lücke, und jede Belegungsänderung
// (Beute, Neustart mit Offline-Fortschritt) verschob sie. Jetzt hat jede reine Gruppe ein gespeichertes Fach
// (`inventory.variantCells`); das Fach bleibt in `slots` `null`, gilt aber als belegt. Alles hier ist deterministisch (kein RNG).

/** Ist das Fach leer (`null`/Loch)? */
function fachLeer(inv: InventoryState, i: number): boolean {
  return !inv.slots[i];
}

/**
 * Basis-IDs aller REINEN Variantengruppen: Instanzen in `inv.instances`, aber kein Fach dieser Basis in `slots` (gleiche Definition
 * wie `instanceCellCount` und CharacterPage `orphanInstanceGroups`). Reihenfolge = erstes Auftreten in `inv.instances`
 * (= `groupInstancesByBase`). Rein lesend.
 */
export function pureVariantBases(inv: InventoryState): ItemId[] {
  const list = Array.isArray(inv.instances) ? inv.instances : [];
  if (list.length === 0) return [];
  const inSlots = new Set<ItemId>();
  for (const s of inv.slots) if (s) inSlots.add(s.itemId);
  const seen = new Set<ItemId>();
  const out: ItemId[] = [];
  for (const inst of list) {
    const id = inst?.baseItemId;
    if (typeof id !== "string" || seen.has(id)) continue;
    seen.add(id);
    if (!inSlots.has(id)) out.push(id);
  }
  return out;
}

interface VariantCellPlan {
  /** Basis → Fach, gültig und eindeutig. */
  cells: Record<ItemId, number>;
  /** Belegte Reservierungs-Fächer. */
  reserved: Set<number>;
  /** Reine Gruppen ohne freies Fach (übervolles Inventar). */
  fachlos: ItemId[];
}

/**
 * Berechnet, was `syncVariantCells` schreiben würde, ohne den State anzufassen (Lesepfade wie `canHold`/`freeSlots` sollen nicht
 * mutieren). Regeln:
 *  1. Bestehende Einträge bleiben, wenn die Basis eine reine Gruppe ist, der Index ganzzahlig im Bereich liegt, das Fach leer ist
 *     und kein früherer Eintrag dasselbe Fach hält (Schlüsselreihenfolge entscheidet).
 *  2. Reine Gruppen ohne Eintrag (Reihenfolge s. `pureVariantBases`): zuerst ein gültiger `hint` (das gerade frei gewordene Fach
 *     ihres letzten Grundstapels, s. `removeItem`), sonst das erste freie, nicht reservierte Fach HINTER dem letzten belegten oder
 *     reservierten Fach, sonst das erste freie davor. Kein Platz: kein Eintrag (Zelle steht fachlos hinten).
 */
function planVariantCells(inv: InventoryState, hints?: ReadonlyMap<ItemId, number>): VariantCellPlan {
  const pure = pureVariantBases(inv);
  const cells: Record<ItemId, number> = {};
  const reserved = new Set<number>();
  const fachlos: ItemId[] = [];
  if (pure.length === 0) return { cells, reserved, fachlos };
  const pureSet = new Set(pure);
  const n = inv.slots.length;
  const gueltig = (idx: unknown): idx is number =>
    typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx < n && fachLeer(inv, idx) && !reserved.has(idx);
  const raw = inv.variantCells as unknown;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    for (const id of Object.keys(rec)) {
      if (id === "__proto__" || !pureSet.has(id)) continue;
      const idx = rec[id];
      if (!gueltig(idx)) continue;
      cells[id] = idx;
      reserved.add(idx);
    }
  }
  let letztes = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (!fachLeer(inv, i) || reserved.has(i)) {
      letztes = i;
      break;
    }
  }
  for (const id of pure) {
    if (Object.prototype.hasOwnProperty.call(cells, id)) continue;
    let idx = -1;
    const hint = hints?.get(id);
    if (gueltig(hint)) idx = hint;
    if (idx === -1) {
      for (let i = letztes + 1; i < n; i++) if (fachLeer(inv, i) && !reserved.has(i)) { idx = i; break; }
    }
    if (idx === -1) {
      for (let i = 0; i < n; i++) if (fachLeer(inv, i) && !reserved.has(i)) { idx = i; break; }
    }
    if (idx === -1) {
      fachlos.push(id);
      continue;
    }
    cells[id] = idx;
    reserved.add(idx);
    if (idx > letztes) letztes = idx;
  }
  return { cells, reserved, fachlos };
}

/**
 * Hält `inv.variantCells` mit Fächern und Instanz-Tasche im Einklang (SAVE 98). Idempotent, deterministisch, verliert nie Bestand
 * (es ordnet nur Zellen zu). Entfernt Einträge ohne reine Gruppe (keine Instanzen mehr oder ein Fach derselben Basis liegt in
 * `slots`), außerhalb des Bereichs, auf belegtem Fach oder doppelt; vergibt neuen reinen Gruppen ein Fach (Regeln s.
 * `planVariantCells`). Läuft nach jeder Inventar-Änderung dieser Datei und einmal pro `advance()` (tick.ts), das fängt auch
 * Stellen ab, die Fächer direkt leeren (enchant/farming/mail/shop). Gibt zurück, ob sich etwas geändert hat.
 */
export function syncVariantCells(inv: InventoryState, hints?: ReadonlyMap<ItemId, number>): boolean {
  const plan = planVariantCells(inv, hints);
  const alt = inv.variantCells as unknown;
  const altRec = alt && typeof alt === "object" && !Array.isArray(alt) ? (alt as Record<string, unknown>) : null;
  const neuKeys = Object.keys(plan.cells);
  let gleich = altRec !== null && Object.keys(altRec).length === neuKeys.length;
  if (gleich) {
    for (const id of neuKeys) {
      if (altRec![id] !== plan.cells[id]) { gleich = false; break; }
    }
  }
  if (gleich) return false;
  // Immer ein NEUES Objekt: Aufrufer (Persistenz) dürfen den rohen Altwert als Referenz behalten.
  inv.variantCells = plan.cells;
  return true;
}

/**
 * Fächer, die eine Variantenzelle zeigen (gültig nach `planVariantCells`, ohne zu schreiben): Fachindex → Basis. Für die UI und
 * Prüfungen; reine Gruppen ohne Fach fehlen hier (s. `pureVariantBases`).
 */
export function variantCellIndex(inv: InventoryState): Map<number, ItemId> {
  const out = new Map<number, ItemId>();
  for (const [id, idx] of Object.entries(planVariantCells(inv).cells)) out.set(idx, id as ItemId);
  return out;
}

/**
 * Alte Anzeige-Logik (bis SAVE 97, Client `inventarRaster` vom 24.10.2026) als Vorbelegung für die Migration < 98: Variantengruppen
 * nahmen die ersten freien Fächer HINTER dem letzten belegten Fach, reichte das nicht, die LETZTEN freien davor; ohne freies Fach
 * blieben sie fachlos. Exakt nachgebaut, damit beim ersten Laden mit SAVE 98 keine Zelle springt. Nicht für neue Vergaben nutzen
 * (dafür gilt `syncVariantCells`).
 */
export function legacyVariantCellLayout(inv: InventoryState): Record<ItemId, number> {
  const gruppen = pureVariantBases(inv);
  const out: Record<ItemId, number> = {};
  if (gruppen.length === 0) return out;
  const frei: number[] = [];
  let letztesBelegt = -1;
  inv.slots.forEach((sl, i) => {
    if (sl === null || sl === undefined) frei.push(i);
    else letztesBelegt = i;
  });
  const dahinter = frei.filter((i) => i > letztesBelegt);
  const fehlen = Math.max(0, gruppen.length - dahinter.length);
  const davor = fehlen > 0 ? frei.filter((i) => i < letztesBelegt).slice(-fehlen) : [];
  const plaetze = [...davor, ...dahinter];
  gruppen.forEach((id, k) => {
    const fach = plaetze[k];
    if (fach !== undefined) out[id] = fach;
  });
  return out;
}

/**
 * Kompaktiert Stapel UND Variantenzellen gemeinsam nach vorne (Reihenfolge erhalten, optional neu sortiert) auf die Länge
 * `max(ziel, Einträge)`. Gemeinsamer Kern von `syncSlots`-Schrumpfen, `compactInventory` und `sortInventory`.
 */
function kompaktiereMitZellen(
  inv: InventoryState,
  zielLaenge: number,
  vergleich?: (a: ItemId, b: ItemId) => number,
): boolean {
  const zellen = variantCellIndex(inv);
  type Eintrag = { id: ItemId; slot: InventorySlot | null };
  const eintraege: Eintrag[] = [];
  for (let i = 0; i < inv.slots.length; i++) {
    const s = inv.slots[i];
    if (s) eintraege.push({ id: s.itemId, slot: s });
    else if (zellen.has(i)) eintraege.push({ id: zellen.get(i)!, slot: null });
  }
  // Kürzen (nur `syncSlots`): Stapel gehen nie verloren; passen nicht alle Zellen dazu, fallen die hintersten Reservierungen weg
  // (ihre Gruppen stehen dann fachlos hinten, bis ein Fach frei wird). Beim Kompaktieren/Sortieren in voller Länge passt immer alles.
  const stapel = eintraege.filter((e) => e.slot !== null).length;
  const laenge = Math.max(zielLaenge, stapel);
  let ueber = eintraege.length - laenge;
  for (let k = eintraege.length - 1; k >= 0 && ueber > 0; k--) {
    if (eintraege[k]!.slot === null) {
      eintraege.splice(k, 1);
      ueber--;
    }
  }
  if (vergleich) eintraege.sort((a, b) => vergleich(a.id, b.id)); // stabil: gleiche Schlüssel behalten ihre Reihenfolge
  const next: Array<InventorySlot | null> = new Array(laenge).fill(null);
  const cells: Record<ItemId, number> = {};
  eintraege.forEach((e, i) => {
    if (e.slot) next[i] = e.slot;
    else cells[e.id] = i;
  });
  let veraendert = next.length !== inv.slots.length;
  for (let i = 0; i < next.length && !veraendert; i++) if ((inv.slots[i] ?? null) !== next[i]) veraendert = true;
  const altZellen = planVariantCells(inv).cells;
  if (Object.keys(altZellen).length !== Object.keys(cells).length) veraendert = true;
  for (const [id, idx] of Object.entries(cells)) if (altZellen[id] !== idx) veraendert = true;
  if (inv.slots.length === laenge) {
    for (let i = 0; i < laenge; i++) inv.slots[i] = next[i]!;
  } else {
    inv.slots = next;
  }
  inv.variantCells = cells;
  syncVariantCells(inv);
  return veraendert;
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
  return freeSlots(inv) <= 0; // claude:2026-10-25T18:00:00+01:00 — reservierte Fächer (SAVE 98) zählen als belegt
}

/**
 * Anzahl freier Inventar-Slots, in die `addItem` einen NEUEN Stapel legen kann. Für Kapazitäts-Vorprüfungen (z.B. Equip-Tausch,
 * Quest-Belohnung). claude:2026-10-25T18:00:00+01:00 — SAVE 98: Fächer mit Variantenzelle sind nicht frei (vorher zählten sie
 * mit, und eine Quest-Belohnung passte rechnerisch, obwohl `addItem` sie dort nicht ablegt). Reine Gruppen, die noch kein Fach
 * haben, verbrauchen zuerst ein freies Fach (wie `syncVariantCells` es vergeben würde).
 */
export function freeSlots(inv: InventoryState): number {
  const plan = planVariantCells(inv);
  return Math.max(0, inv.slots.length - usedSlots(inv) - plan.reserved.size);
}

/**
 * Wie viele Fächer für neue Stapel frei werden, wenn die Instanz `instanceId` die Tasche verlässt: 1, wenn sie die letzte ihrer
 * reinen Variantengruppe ist und diese Gruppe ein Fach hält, sonst 0. Ergänzt `freeSlots` bei Vorprüfungen, die zuerst eine Instanz
 * entnehmen (`equipInstance`: verzaubertes Teil aus vollem Inventar anlegen, das getragene schlichte Teil nimmt ihr Fach).
 * claude:2026-10-25T18:00:00+01:00 — SAVE 98.
 */
export function slotsFreedByInstanceRemoval(inv: InventoryState, instanceId: string): number {
  const inst = inv.instances.find((i) => i.instanceId === instanceId);
  if (!inst) return 0;
  if (inv.instances.some((i) => i !== inst && i.baseItemId === inst.baseItemId)) return 0;
  return Object.prototype.hasOwnProperty.call(planVariantCells(inv).cells, inst.baseItemId) ? 1 : 0;
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
  // claude:2026-10-25T18:00:00+01:00 — SAVE 98, deckungsgleich mit `addItem`: die eigene Variantenzelle nimmt den Grundstapel auf,
  // fremde Variantenzellen sind belegt.
  const plan = planVariantCells(inv);
  if (Object.prototype.hasOwnProperty.call(plan.cells, itemId)) return true;
  return inv.slots.some((s, i) => !s && !plan.reserved.has(i));
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
  //
  // Chef-Report 31.08.2026: "neue items kommen nicht an den naechsten Slot sondern irgendwo
  // dazwischen - fuehlt sich nicht an wie ein Spiel Inventar." Vorher nahm die Suche IMMER die
  // erste Luecke; wer sein Erz aus Fach 3 nahm, bekam den naechsten Fund dort hinein, waehrend
  // die Reihe weiter hinten weiterlief. Neu: Beute haengt sich HINTEN an die belegte Reihe an.
  // Erst wenn dahinter nichts mehr frei ist, fuellt sie die Luecken davor — sonst ginge sie bei
  // fast vollem Inventar verloren, und der Ueberlauf ins Lager/Postfach wuerde faelschlich greifen.
  //
  // claude:2026-10-25T18:00:00+01:00 — SAVE 98 (Chef-Report 25.10.2026): Fächer mit Variantenzelle gelten als belegt, Beute
  // überspringt sie (auch beim Ermitteln des letzten belegten Fachs). Ausnahme: die EIGENE Variantenzelle des Items nimmt den
  // ersten neuen Grundstapel auf, so bleibt die Zelle an ihrem Platz (danach ist die Gruppe nicht mehr „rein“, die Reservierung
  // entfällt). Vorher einmal synchronisieren, damit Gruppen ohne Fach zuerst ihres bekommen und nicht von Beute verdrängt werden.
  syncVariantCells(inv);
  const zellen = inv.variantCells ?? {};
  const reserviert = new Set<number>(Object.values(zellen));
  let eigenesFach = Object.prototype.hasOwnProperty.call(zellen, itemId) ? zellen[itemId]! : -1;
  let letzterBelegt = -1;
  for (let i = inv.slots.length - 1; i >= 0; i--) {
    if (inv.slots[i] !== null || reserviert.has(i)) { letzterBelegt = i; break; }
  }
  const naechsterFreier = (): number => {
    if (eigenesFach >= 0 && inv.slots[eigenesFach] === null) {
      const f = eigenesFach;
      eigenesFach = -1;
      return f;
    }
    for (let i = letzterBelegt + 1; i < inv.slots.length; i++) if (inv.slots[i] === null && !reserviert.has(i)) return i;
    return inv.slots.findIndex((s, i) => s === null && !reserviert.has(i)); // Rueckfall: Luecke davor
  };
  while (remaining > 0) {
    const idx = naechsterFreier();
    if (idx === -1) break;
    if (idx > letzterBelegt) letzterBelegt = idx;
    const add = Math.min(cap, remaining);
    inv.slots[idx] = { itemId, qty: add };
    remaining -= add;
  }
  syncVariantCells(inv); // claude:2026-10-25T18:00:00+01:00 — Reservierung der eigenen Zelle aufräumen
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
  // claude:2026-10-23T21:50:00+02:00 — Materiallager (1.4.0 ML, Chef 23.10.: „Direkt ins Lager, in den Optionen abschaltbar“): Materialien
  // mit Regal gehen ohne Umweg ins Lager (= Bankbestand ohne Bankplatz, unbegrenzt). Aus: wie früher.
  if (state.settings.materialsToStorage !== false && isStorageItem(content, itemId)) {
    state.bank[itemId] = (state.bank[itemId] ?? 0) + qty;
    markItemDiscovered(state, itemId);
    return { toInventory: 0, toBank: qty };
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
  // claude:2026-10-23T21:50:00+02:00 — Lagerware belegt keinen Bankplatz (Überlauf ins Lager auch bei voller Bank).
  if (isNewKind && !isStorageItem(content, itemId) && usedBankSlots(state, storagePredicate(content)) >= effectiveBankCapacity(state, content)) {
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
  syncVariantCells(inv); // claude:2026-10-25T18:00:00+01:00 — neue reine Variantengruppe bekommt ihr festes Fach (SAVE 98)
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
  const removed = inv.instances.splice(idx, 1)[0]!;
  syncVariantCells(inv); // claude:2026-10-25T18:00:00+01:00 — leere Gruppe gibt ihr Fach frei (SAVE 98)
  return removed;
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
  let freiGeworden = -1; // claude:2026-10-25T18:00:00+01:00 — erstes geleertes Fach (SAVE 98, s. unten)
  for (let i = 0; i < inv.slots.length && remaining > 0; i++) {
    const slot = inv.slots[i];
    // Instanz-Slots überspringen — Instanzen werden NUR über die Instanz-API entfernt (nie als
    // fungibler Stack), sonst würde Equippen/Verkaufen eine Verzauberung versehentlich zerstören.
    if (!slot || slot.itemId !== itemId || slot.instance) continue;
    const take = Math.min(slot.qty, remaining);
    slot.qty -= take;
    remaining -= take;
    if (slot.qty <= 0) {
      inv.slots[i] = null;
      if (freiGeworden === -1) freiGeworden = i;
    }
  }
  // claude:2026-10-25T18:00:00+01:00 — SAVE 98: War das der letzte Grundstapel eines Items mit Varianten in der Tasche, wird die
  // Gruppe „rein“ und behält genau dieses Fach (die Zelle bleibt stehen, statt nach hinten zu springen).
  syncVariantCells(inv, freiGeworden >= 0 ? new Map([[itemId, freiGeworden]]) : undefined);
  return qty - remaining;
}

/**
 * Raeumt das Inventar auf: alle belegten Faecher rutschen in ihrer bisherigen Reihenfolge nach
 * vorne, die Luecken sammeln sich hinten. Aendert NICHTS am Bestand, nur an der Platzierung.
 *
 * Zwei Aufrufer:
 *  1. Die Migration auf SAVE 87 (einmalig). Vorher legte jeder Fund sich in die ERSTE Luecke, und
 *     beim Verbrauchen blieb ein leeres Fach zurueck — ueber Wochen entsteht ein Flickenteppich.
 *     Die alte Ansicht hat den versteckt, indem sie belegte Faecher zusammenhaengend zeichnete;
 *     seit die Faecher an ihrer echten Position stehen, saehe man ihn. Ein Spielstand soll aber
 *     nicht mit fremdem Chaos in das neue System starten, deshalb einmal geradeziehen.
 *  2. Der "Aufraeumen"-Knopf im Inventar, wenn der Spieler es spaeter selbst will.
 *
 * Danach gehoeren die Luecken dem Spieler: Wer sein Erz aus Fach 3 nimmt, behaelt Fach 3 leer.
 */
export function compactInventory(inv: InventoryState): boolean {
  // claude:2026-10-25T18:00:00+01:00 — SAVE 98: Variantenzellen zählen als belegte Fächer und rücken in ihrer Reihenfolge mit.
  return kompaktiereMitZellen(inv, inv.slots.length);
}

/**
 * Sortier-AKTION des Inventars (Knopf „Sortieren“, Chef 31.08.2026: einmaliges Verschieben, kein Zustand). Stapel UND
 * Variantenzellen rücken nach vorne, Lücken sammeln sich hinten. Ohne `vergleich` bleibt die bisherige Reihenfolge
 * (= `compactInventory`); mit `vergleich` werden Variantenzellen nach ihrer Basis-Item-ID einsortiert wie Stapel (stabil).
 * claude:2026-10-25T18:00:00+01:00 — aus CharacterPage `sortiereJetzt` in die Engine gezogen, damit Reservierungen mitwandern.
 */
export function sortInventory(inv: InventoryState, vergleich?: (a: ItemId, b: ItemId) => number): boolean {
  return kompaktiereMitZellen(inv, inv.slots.length, vergleich);
}

/**
 * Tauscht zwei Fächer (Drag & Drop). Ein Fach ist ein Stapel, eine Variantenzelle (SAVE 98) oder leer; der Inhalt beider Fächer
 * wird getauscht, Reservierungen wandern mit: Zelle → leeres Fach zieht um, Zelle ↔ Stapel und Zelle ↔ Zelle tauschen,
 * Stapel → Zellenfach tauscht. No-op bei gleichen/ungültigen Indizes. Reine Umordnung; verändert keine Mengen/Items.
 */
export function moveInventorySlot(inv: InventoryState, fromIdx: number, toIdx: number): boolean {
  const n = inv.slots.length;
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= n || toIdx >= n) return false;
  // claude:2026-10-25T18:00:00+01:00 — SAVE 98: Reservierungen erst bereinigen, dann mit den Fächern tauschen.
  syncVariantCells(inv);
  const zellen = variantCellIndex(inv);
  const zelleVon = zellen.get(fromIdx);
  const zelleNach = zellen.get(toIdx);
  const tmp = inv.slots[fromIdx] ?? null;
  inv.slots[fromIdx] = inv.slots[toIdx] ?? null;
  inv.slots[toIdx] = tmp;
  if (zelleVon !== undefined || zelleNach !== undefined) {
    const cells: Record<ItemId, number> = { ...(inv.variantCells ?? {}) };
    if (zelleVon !== undefined) cells[zelleVon] = toIdx;
    if (zelleNach !== undefined) cells[zelleNach] = fromIdx;
    inv.variantCells = cells;
  }
  syncVariantCells(inv);
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
