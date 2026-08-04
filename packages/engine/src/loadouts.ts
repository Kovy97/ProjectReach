import type {
  ContentDB,
  EquipLoadout,
  EquipLoadoutEntry,
  EquipSlot,
  GameState,
  ItemId,
} from "@hearthforge/shared";
import { EQUIP_LOADOUT_COUNT, LOADOUT_SLOTS } from "@hearthforge/shared";
import { withdrawInstance, withdrawItem } from "./bank";
import { equipInstance, equipItem, meetsRequirements, unequipItem } from "./equipment";
import { getInstance } from "./inventory";

/**
 * Ausrüstungs-Loadouts 1/2/3 (SAVE_VERSION 75, Task #349 — Spieler-Wunsch „drei Loadout-Slots zum
 * schnellen Stil-Wechsel", passt exakt zum 3-Stile-Design: Waffe bestimmt Stil).
 *
 * GRUNDSÄTZE:
 *  • Ein Loadout ist ein SNAPSHOT der LOADOUT_SLOTS (Kampf-Slots OHNE Werkzeuge — Werkzeuge sind
 *    Skill-Ausrüstung und bleiben beim Stil-Wechsel unangetastet, s. shared LOADOUT_SLOTS-Doku).
 *  • ANLEGEN läuft Item für Item über den NORMALEN Equip-Pfad (equipItem/equipInstance):
 *    Requirements gelten BEIM ANLEGEN (Bestandsschutz-Regel „nur equip prüft" — ein Loadout-Wechsel
 *    IST ein Anlegen, kein Sonderweg), Kapazitäts-/Datenverlust-Schutz der Equip-Funktionen greift
 *    unverändert. Fehlende/verweigerte Teile werden ÜBERSPRUNGEN, der Rest zieht an („X von Y").
 *  • Fehlt ein Teil im Inventar, wird es aus der Bank (withdrawItem) bzw. dem Gear-Vault
 *    (withdrawInstance) abgehoben — ebenfalls Normalpfade, kein Slot-Hexwerk.
 *  • Instanzen (Verzauberung/Suffix) reisen per `instanceId` EXAKT mit; eine verkaufte/zersalvagte
 *    Instanz gilt als fehlend (KEIN stiller Basis-Item-Ersatz — der Spieler soll ehrlich sehen,
 *    dass sein verzaubertes Teil weg ist).
 *  • KEIN Kampf-Gate: manuelles Umziehen ist im Kampf heute erlaubt (weder equipment.ts noch die
 *    UI gaten es) — Konsistenz gewinnt, ein Loadout-Wechsel ist dieselbe Aktion in Serie.
 *  • DETERMINISTISCH & RNG-frei: reine Spieler-Aktion (kein Tick-Pfad), zieht nie am RNG-Strom.
 */

/** Warum ein einzelner Loadout-Slot beim Anlegen übersprungen wurde (i18n-Mapping macht die UI). */
export type LoadoutSkipReason = "missing" | "requirements" | "inventoryFull";

export interface LoadoutSkip {
  slot: EquipSlot;
  itemId: ItemId;
  reason: LoadoutSkipReason;
}

export interface ApplyLoadoutResult {
  /** false NUR bei ungültigem Index/leerem Loadout-Slot — Teil-Erfolge sind ok:true. */
  ok: boolean;
  /** Anzahl der Einträge im Loadout (Y in „X von Y angelegt"). */
  total: number;
  /** Einträge, die nach dem Anlegen tatsächlich getragen werden (X). */
  applied: number;
  skipped: LoadoutSkip[];
}

/** Gültiger Loadout-Index? (0..EQUIP_LOADOUT_COUNT-1, ganzzahlig) */
function validIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < EQUIP_LOADOUT_COUNT;
}

/** Der aktuell in `slot` getragene Inhalt als Loadout-Eintrag (null = leer). */
function currentEntry(state: GameState, slot: EquipSlot): EquipLoadoutEntry | null {
  const itemId = state.character.equipment[slot];
  if (!itemId) return null;
  const inst = state.character.equippedInstances[slot];
  return inst ? { itemId, instanceId: inst.instanceId } : { itemId };
}

/** Referenz-Gleichheit zweier Einträge: gleiches Basis-Item UND gleiche (bzw. keine) Instanz. */
function entriesEqual(a: EquipLoadoutEntry | null, b: EquipLoadoutEntry | null): boolean {
  if (!a || !b) return a === b;
  return a.itemId === b.itemId && (a.instanceId ?? null) === (b.instanceId ?? null);
}

/**
 * Speichert die aktuell getragene Ausrüstung als Loadout `index` (überschreibt kommentarlos —
 * die UI bestätigt per Toast). Snapshot NUR der LOADOUT_SLOTS; leere Slots bekommen KEINEN Key
 * (s. EquipLoadout-Doku in shared). Liefert false nur bei ungültigem Index.
 */
export function saveLoadout(state: GameState, index: number): boolean {
  if (!validIndex(index)) return false;
  const snapshot: EquipLoadout = {};
  for (const slot of LOADOUT_SLOTS) {
    const entry = currentEntry(state, slot);
    if (entry) snapshot[slot] = entry;
  }
  state.equipLoadouts[index] = snapshot;
  return true;
}

/**
 * Versucht, EINEN Loadout-Eintrag über den Normalpfad anzulegen. Beschafft das Teil bei Bedarf
 * aus Bank/Gear-Vault. Liefert "ok" oder den Skip-Grund. Reihenfolge der Prüfungen: Content →
 * Requirements → Besitz → Kapazität — so wird NIE etwas bewegt (Bank-Abhebung!), das danach an
 * einer Anforderung scheitern würde.
 */
function tryEquipEntry(
  state: GameState,
  content: ContentDB,
  entry: EquipLoadoutEntry,
): "ok" | LoadoutSkipReason {
  const item = content.items[entry.itemId];
  // Loadout-Einträge sind immer Equipment mit Slot (Snapshot der LOADOUT_SLOTS); alles andere
  // (Content-Drift/Save-Edit) gilt als fehlend.
  if (!item || item.type !== "equipment" || !item.slot) return "missing";
  if (!meetsRequirements(state, item)) return "requirements";

  if (entry.instanceId) {
    // EXAKTE Instanz: Inventar-Tasche → Gear-Vault → sonst fehlend (verkauft/zersalvagt).
    const inBag = getInstance(state.inventory, entry.instanceId);
    if (inBag) {
      if (inBag.baseItemId !== entry.itemId) return "missing"; // defensiv: ID-Drift
    } else {
      const vaultInst = state.bankInstances.find((i) => i.instanceId === entry.instanceId);
      if (!vaultInst || vaultInst.baseItemId !== entry.itemId) return "missing";
      // Vault → unbegrenzte Inventar-Tasche (withdrawInstance schlägt strukturell nie fehl).
      if (!withdrawInstance(state, entry.instanceId)) return "missing";
    }
    const r = equipInstance(state, content, entry.instanceId);
    // Nach Content-/Requirements-/Besitz-Vorprüfung bleibt als Fehlgrund nur die Kapazität
    // (verdrängtes PLAIN Item braucht einen freien Inventar-Slot). Die evtl. aus dem Vault
    // geholte Instanz bleibt dann in der unbegrenzten Tasche liegen — kein Verlust.
    return r.ok ? "ok" : "inventoryFull";
  }

  // Plain Item: Inventar → sonst aus der Bank abheben (braucht einen freien Slot).
  const inInv = state.inventory.slots.some((s) => s !== null && s.itemId === entry.itemId && !s.instance);
  if (!inInv) {
    if ((state.bank[entry.itemId] ?? 0) < 1) return "missing";
    if (withdrawItem(state, content, entry.itemId, 1) < 1) return "inventoryFull";
  }
  const r = equipItem(state, content, entry.itemId);
  return r.ok ? "ok" : "inventoryFull";
}

/**
 * Legt Loadout `index` an — Item für Item über den normalen Equip-Pfad:
 *  1. Slots, deren Ist-Inhalt vom Soll abweicht, werden erst abgelegt (unequipItem, best effort —
 *     schlägt das Ablegen bei vollem Inventar fehl, übernimmt der atomare Tausch in equipItem den
 *     Rest); Slots, die bereits exakt stimmen, bleiben unangetastet (kein Churn).
 *  2. Danach wird jeder Soll-Eintrag angelegt; fehlende Teile/verfehlte Requirements/volle
 *     Kapazität überspringen NUR diesen Slot (Skip-Liste), der Rest zieht an.
 *  RINGE laufen als PAAR (Multiset itemId+instanceId): equipItem füllt Ringe kanonisch
 *  ring1→ring2 auf, die konkrete Slot-Position eines Rings ist daher kosmetisch — ohne die
 *  Paar-Betrachtung würde ein „nur Position getauscht"-Zustand sinnlos ab- und wieder anlegen.
 *  Reihenfolge LOADOUT_SLOTS (mainhand vor offhand — Zweihand-Verdrängung greift zuerst).
 */
export function applyLoadout(state: GameState, content: ContentDB, index: number): ApplyLoadoutResult {
  if (!validIndex(index)) return { ok: false, total: 0, applied: 0, skipped: [] };
  const loadout = state.equipLoadouts[index];
  if (!loadout) return { ok: false, total: 0, applied: 0, skipped: [] };

  const skipped: LoadoutSkip[] = [];
  let applied = 0;
  let total = 0;

  // ── Nicht-Ring-Slots: exakter Slot-Abgleich in Vertrags-Reihenfolge ────────────────────────
  for (const slot of LOADOUT_SLOTS) {
    if (slot === "ring1" || slot === "ring2") continue; // Ringe unten als Paar
    const desired = loadout[slot] ?? null;
    if (desired) total++;
    const current = currentEntry(state, slot);
    if (entriesEqual(current, desired)) {
      if (desired) applied++;
      continue;
    }
    if (current) unequipItem(state, content, slot); // best effort — s. Funktions-Doku
    if (!desired) continue;
    const r = tryEquipEntry(state, content, desired);
    if (r === "ok") applied++;
    else skipped.push({ slot, itemId: desired.itemId, reason: r });
  }

  // ── Ringe als Paar (Multiset-Abgleich, Positions-Drift ist kosmetisch) ─────────────────────
  const RING_SLOTS: readonly EquipSlot[] = ["ring1", "ring2"];
  const desiredRings: EquipLoadoutEntry[] = [];
  for (const slot of RING_SLOTS) {
    const d = loadout[slot];
    if (d) desiredRings.push(d);
  }
  total += desiredRings.length;
  const unmatched = [...desiredRings];
  for (const slot of RING_SLOTS) {
    const cur = currentEntry(state, slot);
    if (!cur) continue;
    const matchIdx = unmatched.findIndex((d) => entriesEqual(d, cur));
    if (matchIdx >= 0) {
      unmatched.splice(matchIdx, 1);
      applied++;
    } else {
      unequipItem(state, content, slot); // best effort
    }
  }
  for (const d of unmatched) {
    const r = tryEquipEntry(state, content, d);
    if (r === "ok") applied++;
    else skipped.push({ slot: "ring1", itemId: d.itemId, reason: r });
  }

  return { ok: true, total, applied, skipped };
}
