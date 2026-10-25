import type { ContentDB, EquipSlot, GameState, ItemDef, ItemId } from "@hearthforge/shared";
import { TOOL_SLOTS } from "@hearthforge/shared";
import { levelFromXp } from "./leveling";
import { addInstance, addItem, freeSlots, getInstance, isFull, removeInstance, removeItem, hasInstanceRoom, usedCapacityUnits, effectiveCapacity, slotsFreedByInstanceRemoval } from "./inventory";
import { isBowItem, isQuiverItem, syncQuiverLoad } from "./quiver"; // claude:2026-10-24T18:30:00+02:00 — Köcher-Regel (1.4.0 FK)

/**
 * Legt das aktuell in `slot` getragene Item zurück ins Inventar und leert den Slot — egal ob es
 * eine modifizierte Instanz (→ `equippedInstances`, wandert in die unbegrenzte Instanz-Tasche) oder
 * ein plain Item ist. So geht beim Tauschen KEINE Verzauberung verloren.
 *
 * DATENVERLUST-SICHER: Der Slot wird NUR geleert, wenn das Einlagern wirklich gelingt. Eine Instanz
 * geht immer in die unbegrenzte Tasche (nie „voll"); ein plain Item braucht einen freien Slot — fehlt
 * er (addItem schlägt fehl), bleibt es ausgerüstet und es wird `false` zurückgegeben. Der Aufrufer MUSS
 * das prüfen (bzw. via Kapazitäts-Vorprüfung sicherstellen, dass Platz da ist), sonst würde ein
 * nachfolgendes Überschreiben des Equipment-Slots das Item vernichten.
 */
function stowEquipped(state: GameState, content: ContentDB, slot: EquipSlot): boolean {
  const inst = state.character.equippedInstances[slot];
  const id = state.character.equipment[slot];
  if (!id && !inst) return false;
  if (inst) {
    if (!addInstance(state.inventory, inst)) return false; // unbegrenzte Tasche → nie „voll"
    delete state.character.equippedInstances[slot];
    state.character.equipment[slot] = null;
  } else if (id) {
    if (addItem(state.inventory, content, id, 1) < 1) return false; // kein Platz → ausgerüstet lassen
    state.character.equipment[slot] = null;
  }
  return true;
}

/** Trägt der Slot (plain ODER Instanz) etwas, das beim Tausch zurück ins Inventar müsste? */
function slotOccupied(state: GameState, slot: EquipSlot): boolean {
  return !!state.character.equipment[slot] || !!state.character.equippedInstances[slot];
}

/**
 * Trägt der Slot ein PLAIN Item (keine Instanz)? NUR das braucht beim Verdrängen einen freien
 * Inventar-Slot — eine verdrängte Item-INSTANZ (verzaubert/gesuffixt) geht über `stowEquipped` immer
 * in die unbegrenzte Instanz-Tasche (0 Kapazität nötig). Chef-Bugfix „22/20" (2026-07-23): die
 * Kapazitäts-Vorprüfungen zählten vorher `slotOccupied` (Plain UND Instanz gleich als „1 Stow") —
 * das verweigerte einen eigentlich machbaren Tausch (neues plain Item rein, Instanz raus) fälschlich
 * bei vollem Inventar. `equipInstance` unterschied das schon korrekt (lokales `plainAt`); jetzt
 * gemeinsam für `equipItem`/`equipTool`/`equipInstance`.
 */
function plainOccupied(state: GameState, slot: EquipSlot): boolean {
  return !!state.character.equipment[slot] && !state.character.equippedInstances[slot];
}

/**
 * claude:2026-10-24T18:30:00+02:00 — Darf `off` neben der Haupthand `main` liegen? Köcher (1.4.0 FK, Chef 23.10.: „einzige Nebenhand für
 * Bögen“) nur neben einem Bogen; jede andere Nebenhand nur neben einer Einhandwaffe (bisherige Zweihand-Regel).
 */
export function offhandFitsMain(main: ItemDef | null | undefined, off: ItemDef | null | undefined): boolean {
  if (!off) return true;
  if (isQuiverItem(off)) return !main || isBowItem(main); // leere Haupthand (Bogen abgelegt) lässt den Köcher liegen
  return !main?.twoHanded;
}

export interface EquipResult {
  ok: boolean;
  reason?: string;
}

/** Prüft, ob alle Skill-Anforderungen eines Items erfüllt sind. */
export function meetsRequirements(state: GameState, item: ItemDef): boolean {
  if (!item.requirements) return true;
  for (const [skillId, level] of Object.entries(item.requirements)) {
    if (level === undefined) continue;
    if (levelFromXp(state.skills[skillId]?.xp ?? 0) < level) return false;
  }
  return true;
}

/**
 * Rüstet ein Item aus dem Inventar aus. Tauscht ein bereits getragenes Item im
 * selben Slot zurück ins Inventar. Prüft Typ & Skill-Anforderungen.
 */
export function equipItem(state: GameState, content: ContentDB, itemId: ItemId): EquipResult {
  const item = content.items[itemId];
  // Munition/Köcher: ENTFERNT (#286 Ammo-Removal) — es gibt keinen ammo-Slot mehr; Pfeile
  // (bis Stage B noch im Katalog) sind schlicht nicht ausrüstbar und fallen unten durch.
  // Werkzeuge (Spitzhacke, Angel, Sichel …): in einen freien Werkzeug-Slot. Sie wirken zwar AUCH
  // passiv aus dem Inventar (bestToolSpeed liest beides), aber Ausrüsten hält das Inventar frei.
  if (item && item.type === "tool") {
    return equipTool(state, content, itemId);
  }
  if (!item || item.type !== "equipment" || !item.slot) {
    return { ok: false, reason: "Nicht ausrüstbar" };
  }
  if (!meetsRequirements(state, item)) {
    return { ok: false, reason: "Skill-Anforderung nicht erfüllt" };
  }
  const slot = item.slot;
  // Ringe deklarieren kanonisch "ring1", dürfen aber beide Ring-Slots belegen:
  // bevorzugt den ersten freien Slot, sonst wird ring1 ersetzt.
  let target = slot;
  if (slot === "ring1" && state.character.equipment.ring1 && !state.character.equipment.ring2) {
    target = "ring2";
  }
  // Zweihandwaffe ↔ Schild: schließen sich gegenseitig aus → zusätzliche Verdrängung bestimmen.
  // claude:2026-10-24T18:30:00+02:00 — Köcher (1.4.0 FK): ein Bogen behält den Köcher, jede andere Haupthand verdrängt ihn; ein Köcher
  // braucht einen Bogen und verdrängt ihn nie.
  const offId = state.character.equipment.offhand;
  const displacesOffhand =
    slot === "mainhand" && slotOccupied(state, "offhand") && !offhandFitsMain(item, offId ? content.items[offId] : undefined);
  const main = state.character.equipment.mainhand;
  if (slot === "offhand" && isQuiverItem(item) && !isBowItem(main ? content.items[main] : undefined)) {
    return { ok: false, reason: "Köcher nur mit Bogen" };
  }
  const displacesMain =
    slot === "offhand" && !isQuiverItem(item) && !!main && !!content.items[main]?.twoHanded && slotOccupied(state, "mainhand");
  // DATENVERLUST-SCHUTZ: so viele getragene PLAIN Items müssen zurück in einen freien Inventar-Slot
  // (Stows) — eine verdrängte Instanz braucht KEINEN (geht in die unbegrenzte Tasche, `plainOccupied`).
  // Das Entnehmen der neuen Ausrüstung gibt nur dann einen Slot frei, wenn ihr Quell-Stack genau 1
  // Stück groß war.
  const targetPlain = plainOccupied(state, target);
  const offhandPlain = displacesOffhand && plainOccupied(state, "offhand");
  const mainPlain = displacesMain && plainOccupied(state, "mainhand");
  const stows = (targetPlain ? 1 : 0) + (offhandPlain ? 1 : 0) + (mainPlain ? 1 : 0);
  const srcIdx = state.inventory.slots.findIndex((s) => s !== null && s.itemId === itemId && !s.instance);
  const sourceFrees = srcIdx >= 0 && state.inventory.slots[srcIdx]!.qty === 1 ? 1 : 0;
  if (freeSlots(state.inventory) + sourceFrees < stows) {
    return { ok: false, reason: "Inventar voll" };
  }
  if (removeItem(state.inventory, itemId, 1) < 1) {
    return { ok: false, reason: "Nicht im Inventar" };
  }
  // ATOMAR (Chef-Bugfix „22/20"): der frei gewordene Inventar-Slot nimmt das vorher getragene Item auf
  // (Instanz ODER plain) — `stowEquipped`s Rückgabe wird geprüft. Schlägt sie TROTZ der obigen
  // Vorprüfung fehl (sollte dank `plainOccupied` nie mehr passieren — Verteidigungslinie), rollen wir
  // das entnommene Item zurück statt es beim Überschreiben von `equipment[target]` zu vernichten.
  const targetStowed = stowEquipped(state, content, target);
  if (targetPlain && !targetStowed) {
    addItem(state.inventory, content, itemId, 1);
    return { ok: false, reason: "Inventar voll" };
  }
  state.character.equipment[target] = itemId;
  if (displacesOffhand) {
    const stowed = stowEquipped(state, content, "offhand");
    if (offhandPlain && !stowed) return { ok: false, reason: "Inventar voll" };
  } else if (displacesMain) {
    const stowed = stowEquipped(state, content, "mainhand");
    if (mainPlain && !stowed) return { ok: false, reason: "Inventar voll" };
  }
  syncQuiverLoad(state, content); // claude:2026-10-24T18:30:00+02:00 — ohne Köcher gehen geladene Pfeile ins Lager
  return { ok: true };
}

/*
 * Werkzeug-Slots in Vorzugsreihenfolge (erster freier wird belegt, sonst tool1 ersetzt) — die Liste
 * kommt seit SAVE 87 aus shared (`TOOL_SLOTS`), damit Engine, Sanitize-Whitelist, Tooltip und
 * Ausrüstungspuppe nie auseinanderlaufen. Vierter Slot `tool4` (Spieler-Vorschlag, Chef-GO
 * 31.08.2026): es gibt vier Werkzeug-Berufe, es gab aber nur drei Plätze. Reines Ordnungs-Feature —
 * `bestToolSpeed` (tools.ts) scannt ohnehin das GESAMTE Equipment-Record UND das Inventar, ein
 * zusätzliches ausgerüstetes Werkzeug wirkt exakt wie eines lose im Inventar (keine Tempo-Verdopplung).
 */

/**
 * Rüstet ein Werkzeug in einen freien Werkzeug-Slot aus. Akzeptiert reine Werkzeuge (type "tool")
 * UND dual-use-Items mit `tool`-Feld (z.B. Äxte — Waffe in Mainhand ODER Holzfäll-Werkzeug im Slot;
 * Chef 2026-07-21). Prüft die Skill-Anforderung; das vorher dort getragene Werkzeug wandert zurück ins
 * Inventar. Exportiert, damit die UI beim Drop auf einen Werkzeug-Slot gezielt hierher routet — der
 * generische `equipItem` schickt eine Axt weiterhin per `item.slot` in die Mainhand.
 */
export function equipTool(
  state: GameState,
  content: ContentDB,
  itemId: ItemId,
  targetSlot?: EquipSlot,
): EquipResult {
  const item = content.items[itemId];
  if (!item || !item.tool) return { ok: false, reason: "Nicht ausrüstbar" };
  if (!meetsRequirements(state, item)) {
    return { ok: false, reason: "Skill-Anforderung nicht erfüllt" };
  }
  // claude:2026-10-17T21:00:00+02:00 Zielwahl: ausdruecklich genannter Werkzeug-Slot > erster freier Slot >
  // bei vollen Slots zuerst das Werkzeug DESSELBEN Berufs ersetzen > tool1.
  const explicit = targetSlot && (TOOL_SLOTS as readonly string[]).includes(targetSlot) ? targetSlot : null;
  const target: EquipSlot =
    explicit ??
    TOOL_SLOTS.find((s) => !state.character.equipment[s]) ??
    TOOL_SLOTS.find((s) => {
      const worn = state.character.equipment[s];
      return !!worn && content.items[worn]?.tool?.skill === item.tool!.skill;
    }) ??
    "tool1";
  // DATENVERLUST-SCHUTZ: ist der Ziel-Werkzeug-Slot mit einem PLAIN Werkzeug belegt, muss es zurück in
  // einen freien Inventar-Slot — eine (theoretisch mögliche) verzauberte Instanz braucht keinen
  // (Muster equipItem, Chef-Bugfix „22/20").
  const targetPlain = plainOccupied(state, target);
  const stows = targetPlain ? 1 : 0;
  const srcIdx = state.inventory.slots.findIndex((s) => s !== null && s.itemId === itemId && !s.instance);
  const sourceFrees = srcIdx >= 0 && state.inventory.slots[srcIdx]!.qty === 1 ? 1 : 0;
  if (freeSlots(state.inventory) + sourceFrees < stows) {
    return { ok: false, reason: "Inventar voll" };
  }
  if (removeItem(state.inventory, itemId, 1) < 1) {
    return { ok: false, reason: "Nicht im Inventar" };
  }
  // ATOMAR: der frei gewordene Inventar-Slot nimmt das bisher getragene Werkzeug auf — Rückgabe
  // geprüft (Verteidigungslinie, s. equipItem).
  const targetStowed = stowEquipped(state, content, target);
  if (targetPlain && !targetStowed) {
    addItem(state.inventory, content, itemId, 1);
    return { ok: false, reason: "Inventar voll" };
  }
  state.character.equipment[target] = itemId;
  return { ok: true };
}

/**
 * Rüstet eine modifizierte Item-Instanz aus der Inventar-Tasche (`inventory.instances`, per
 * `instanceId`) aus. Die Modifikation reist mit: `equipment[slot] = baseItemId` UND
 * `equippedInstances[slot] = instance` (Architektur-B-Kern). Der bisherige Slot-Inhalt wandert zurück
 * ins Inventar (eine Instanz in die unbegrenzte Tasche, ein plain Item in einen freien Slot).
 */
export function equipInstance(
  state: GameState,
  content: ContentDB,
  instanceId: string,
): EquipResult {
  const instance = getInstance(state.inventory, instanceId);
  if (!instance) return { ok: false, reason: "Keine Instanz gefunden" };
  const item = content.items[instance.baseItemId];
  if (!item || item.type !== "equipment" || !item.slot) {
    return { ok: false, reason: "Nicht ausrüstbar" };
  }
  if (!meetsRequirements(state, item)) {
    return { ok: false, reason: "Skill-Anforderung nicht erfüllt" };
  }
  const slot = item.slot;
  let target = slot;
  if (slot === "ring1" && state.character.equipment.ring1 && !state.character.equipment.ring2) {
    target = "ring2";
  }
  // claude:2026-10-24T18:30:00+02:00 — Köcher (1.4.0 FK): ein Bogen behält den Köcher, jede andere Haupthand verdrängt ihn; ein Köcher
  // braucht einen Bogen und verdrängt ihn nie.
  const offId = state.character.equipment.offhand;
  const displacesOffhand =
    slot === "mainhand" && slotOccupied(state, "offhand") && !offhandFitsMain(item, offId ? content.items[offId] : undefined);
  const main = state.character.equipment.mainhand;
  if (slot === "offhand" && isQuiverItem(item) && !isBowItem(main ? content.items[main] : undefined)) {
    return { ok: false, reason: "Köcher nur mit Bogen" };
  }
  const displacesMain =
    slot === "offhand" && !isQuiverItem(item) && !!main && !!content.items[main]?.twoHanded && slotOccupied(state, "mainhand");
  // DATENVERLUST-SCHUTZ: NUR verdrängte PLAIN Items brauchen je einen freien Inventar-Slot; verdrängte
  // Instanzen wandern in die unbegrenzte Tasche. Die Quell-Instanz kommt selbst aus der Tasche (belegt
  // keinen Slot), daher — anders als bei `equipItem` — KEIN „+1" für einen frei werdenden Quell-Slot.
  const targetPlain = plainOccupied(state, target);
  const offhandPlain = displacesOffhand && plainOccupied(state, "offhand");
  const mainPlain = displacesMain && plainOccupied(state, "mainhand");
  const plainStows = (targetPlain ? 1 : 0) + (offhandPlain ? 1 : 0) + (mainPlain ? 1 : 0);
  // claude:2026-10-25T18:00:00+01:00 — SAVE 98: das Fach ihrer Variantenzelle wird frei, wenn sie die letzte ihrer Gruppe ist
  // (`freeSlots` zählt reservierte Fächer nicht mehr als frei; ohne diesen Ausgleich scheiterte der Tausch bei vollem Inventar).
  if (freeSlots(state.inventory) + slotsFreedByInstanceRemoval(state.inventory, instanceId) < plainStows) {
    return { ok: false, reason: "Inventar voll" };
  }
  // Quell-Instanz aus der Tasche nehmen (das Slot-Gitter bleibt unberührt).
  removeInstance(state.inventory, instanceId);
  // ATOMAR: Rückgabe geprüft — schlägt der Stow trotz Vorprüfung fehl (Verteidigungslinie), Instanz
  // zurück in die Tasche statt sie beim Überschreiben des Equipment-Slots zu vernichten.
  const targetStowed = stowEquipped(state, content, target);
  if (targetPlain && !targetStowed) {
    addInstance(state.inventory, instance);
    return { ok: false, reason: "Inventar voll" };
  }
  state.character.equipment[target] = instance.baseItemId;
  state.character.equippedInstances[target] = instance;
  if (displacesOffhand) {
    const stowed = stowEquipped(state, content, "offhand");
    if (offhandPlain && !stowed) return { ok: false, reason: "Inventar voll" };
  } else if (displacesMain) {
    const stowed = stowEquipped(state, content, "mainhand");
    if (mainPlain && !stowed) return { ok: false, reason: "Inventar voll" };
  }
  syncQuiverLoad(state, content); // claude:2026-10-24T18:30:00+02:00 — ohne Köcher gehen geladene Pfeile ins Lager
  return { ok: true };
}

// equipAmmo: ENTFERNT (#286 Ammo-Removal) — der Köcher-Slot existiert nicht mehr.

/** Legt das Item eines Slots ab (zurück ins Inventar, falls Platz). */
/**
 * Darf der Slot ins Inventar abgelegt werden, ohne die Kapazität zu überschreiten? Chef-Report
 * 26.08.2026: „Warum darf ich Items unequippen, wenn mein Inventar 48/48 ist? Es darf kein Overflow
 * geben." Zwei Lücken vorher: (1) `isFull` zählte physische Slots statt Kapazitäts-EINHEITEN
 * (Slots + Instanz-Zellen, s. usedCapacityUnits) — bei freiem Null-Slot, aber vollen Einheiten lief
 * das Inventar auf 49/48; (2) verzauberte Instanzen wurden GAR NICHT geprüft (unbegrenzte Tasche).
 * Jetzt: Instanz → nur wenn ihre Basis-Art schon eine Zelle hat (teilt sie) oder eine Einheit frei ist
 * (hasInstanceRoom); schlichtes Item → nur mit freier Einheit. Beute geht weiter Bank → Post, das
 * bleibt der einzige Überlauf-Pfad.
 */
export function canUnequip(state: GameState, content: ContentDB, slot: EquipSlot): boolean {
  const inst = state.character.equippedInstances[slot];
  const itemId = state.character.equipment[slot];
  if (!itemId && !inst) return false;
  if (inst) return hasInstanceRoom(state.inventory, content, inst.baseItemId);
  return usedCapacityUnits(state.inventory) < effectiveCapacity(state.inventory, content);
}

export function unequipItem(state: GameState, content: ContentDB, slot: EquipSlot): boolean {
  const itemId = state.character.equipment[slot];
  if (!itemId) return false;
  if (!canUnequip(state, content, slot)) return false;
  const ok = stowEquipped(state, content, slot);
  if (ok) syncQuiverLoad(state, content); // claude:2026-10-24T18:30:00+02:00 — Köcher abgelegt ⇒ Pfeile zurück ins Lager
  return ok;
}