import type {
  ContentDB,
  EquipKit,
  EquipKitIndex,
  EquipSlot,
  GameState,
  ItemId,
  ItemInstance,
} from "@hearthforge/shared";
import { EQUIP_KIT_COUNT, EQUIP_SLOTS, emptyEquipKit } from "@hearthforge/shared";
import { computeStats } from "./character";

export { EQUIP_KIT_COUNT } from "@hearthforge/shared";

/**
 * Ausrüstungs-KITS 1/2/3 (SAVE_VERSION 85 — unveröffentlicht; Chef-Entscheid 28.08.2026 nach
 * Spieler-Feedback „3 separate equipment kits, not unequip/equip modes, just swap").
 *
 * Ersetzt die v75-Loadout-VORLAGEN (saveLoadout/applyLoadout: Snapshots aus itemId/instanceId, beim
 * Anlegen Item für Item aus Inventar/Bank bedient). Jetzt BESITZT jedes Kit seine Teile selbst.
 *
 * GRUNDSÄTZE:
 *  • WAHRHEIT des aktiven Kits ist `character.equipment` + `character.equippedInstances` — alle
 *    bestehenden Pfade (computeStats, Kampf, equipItem/equipInstance/equipTool/unequipItem, Werkzeug-
 *    Tempo) lesen und schreiben weiter dort. Ausrüsten/Ablegen wirkt IMMER auf das aktive Kit.
 *  • `state.equipKits[state.activeKit]` ist nur der SPIEGEL des aktiven Kits und darf zur Laufzeit
 *    stale sein; `syncActiveKit` schreibt ihn beim Umschalten, beim Serialisieren (persistence
 *    `serialize`) und am Ende von `sanitizeState` zurück.
 *  • UMSCHALTEN (`switchEquipKit`) tauscht das GANZE Set inkl. Instanzen (Verzauberung/Suffix reisen
 *    exakt mit): aktives Kit aus `character` in `equipKits[activeKit]` zurückschreiben, Ziel-Kit nach
 *    `character` kopieren, `activeKit` setzen. Verbraucht nichts, verschiebt nichts ins Inventar,
 *    prüft KEINE Requirements (die Teile wurden über den normalen Equip-Pfad ins Kit gelegt, als es
 *    aktiv war — Level sinken nie). Nur AUSSERHALB des Kampfes (`combat.monsterId === null`).
 *  • Stats: computeStats fingerprintet Slot-Belegung + Instanzen des Charakters, der Wechsel
 *    invalidiert den Cache also von selbst. hp/mana/ward werden nach dem Wechsel VOLL aufgefuellt
 *    (Chef 28.08.2026: kein Nachregenerieren nach dem Umziehen; Wechsel nur ausserhalb des Kampfes).
 *  • Alle EQUIP_SLOTS inkl. tool1..tool3 (ganzes Set tauscht — die alte LOADOUT_SLOTS-Ausnahme für
 *    Werkzeuge diente nur dem Inventar-Churn, den es nicht mehr gibt).
 *  • DETERMINISTISCH & RNG-frei: reine Spieler-Aktion (kein Tick-Pfad), zieht nie am RNG-Strom.
 */

/** Ergebnis von `switchEquipKit` (i18n-Mapping macht die UI). */
export type KitSwitchReason = "ok" | "in_combat" | "same" | "invalid";

/** Lese-Sicht auf ein Kit für die UI (Kopie — Mutation wirkt nie auf den State). */
export interface KitSummary {
  /** Anzahl belegter Slots (inkl. Werkzeug-Slots). */
  pieces: number;
  equipment: Record<EquipSlot, ItemId | null>;
  instances: Partial<Record<EquipSlot, ItemInstance>>;
}

/** Gültiger Kit-Index? (0..EQUIP_KIT_COUNT-1, ganzzahlig) */
export function isValidKitIndex(index: number): index is EquipKitIndex {
  return Number.isInteger(index) && index >= 0 && index < EQUIP_KIT_COUNT;
}

/** Tiefe Kopie einer Instanz (Affixe/Suffix), damit Kit und Charakter nie dasselbe Objekt teilen. */
function cloneInstance(inst: ItemInstance): ItemInstance {
  const out: ItemInstance = {
    instanceId: inst.instanceId,
    baseItemId: inst.baseItemId,
    affixes: Array.isArray(inst.affixes) ? inst.affixes.map((a) => ({ ...a })) : [],
  };
  if (inst.suffix) out.suffix = { ...inst.suffix };
  return out;
}

/** Kopie von equipment + equippedInstances in Kit-Form (alle EQUIP_SLOTS-Keys, Instanzen geklont). */
function snapshotKit(
  equipment: Partial<Record<EquipSlot, ItemId | null>> | undefined,
  instances: Partial<Record<EquipSlot, ItemInstance>> | undefined,
): EquipKit {
  // Tolerant gegen fehlende Records (serialize läuft auch über hand-korrumpierte Alt-Saves in Tests —
  // die strikte Härtung macht sanitizeState; hier darf nichts werfen).
  const eq = equipment ?? {};
  const inst = instances ?? {};
  const kit = emptyEquipKit();
  for (const slot of EQUIP_SLOTS) {
    kit.equipment[slot] = eq[slot] ?? null;
    const i = inst[slot];
    if (i && typeof i === "object") kit.equippedInstances[slot] = cloneInstance(i);
  }
  return kit;
}

/**
 * Schreibt die Wahrheit des aktiven Kits (`character.equipment`/`equippedInstances`) in
 * `equipKits[activeKit]` zurück. Idempotent; wird beim Umschalten, Serialisieren und im Sanitize
 * gerufen. Repariert nebenbei eine fehlende/zu kurze Kit-Liste (Engine-Pfad ist tolerant, die
 * strikte Härtung macht sanitizeState).
 */
export function syncActiveKit(state: GameState): void {
  if (!Array.isArray(state.equipKits)) state.equipKits = [];
  while (state.equipKits.length < EQUIP_KIT_COUNT) state.equipKits.push(emptyEquipKit());
  if (!isValidKitIndex(state.activeKit)) state.activeKit = 0;
  state.equipKits[state.activeKit] = snapshotKit(state.character.equipment, state.character.equippedInstances);
}

/**
 * Lese-Sicht auf Kit `index` für die UI. Für das AKTIVE Kit wird aus `character` gelesen (Wahrheit —
 * der Spiegel darf stale sein), sonst aus `equipKits[index]`. Ungültiger Index → leeres Kit.
 */
export function kitSummary(state: GameState, index: number): KitSummary {
  let source: EquipKit;
  if (!isValidKitIndex(index)) {
    source = emptyEquipKit();
  } else if (index === state.activeKit) {
    source = snapshotKit(state.character.equipment, state.character.equippedInstances);
  } else {
    const kit = state.equipKits[index];
    source = kit ? snapshotKit(kit.equipment, kit.equippedInstances) : emptyEquipKit();
  }
  let pieces = 0;
  for (const slot of EQUIP_SLOTS) if (source.equipment[slot]) pieces++;
  return { pieces, equipment: source.equipment, instances: source.equippedInstances };
}

/**
 * Schaltet auf Kit `index` um (ganzes Set tauscht). Reihenfolge der Prüfungen:
 * ungültiger Index → "invalid"; bereits aktiv → "same" (No-op, auch im Kampf);
 * laufender Kampf (`combat.monsterId !== null`) → "in_combat"; sonst "ok".
 * Bei "ok": Spiegel des bisherigen Kits zurückschreiben, Ziel-Kit nach `character` kopieren,
 * `activeKit` setzen, hp/mana/ward voll auffuellen. Kein RNG, keine Inventar-Bewegung.
 */
export function switchEquipKit(state: GameState, content: ContentDB, index: number): KitSwitchReason {
  if (!isValidKitIndex(index)) return "invalid";
  if (index === state.activeKit) return "same";
  if (state.combat.monsterId !== null) return "in_combat";

  syncActiveKit(state);
  const target = state.equipKits[index] ?? emptyEquipKit();
  const next = snapshotKit(target.equipment, target.equippedInstances);
  state.character.equipment = next.equipment;
  state.character.equippedInstances = next.equippedInstances;
  state.activeKit = index;

  // Vitals an die neuen Maxima klemmen (Muster sanitize-HP-/Ward-Deckel): ein Tank-Kit → Glaskanone
  // Chef 28.08.2026: Der Wechsel ist nur ausserhalb des Kampfes moeglich; danach sollen Leben, Mana und Ward
  // VOLL sein (kein Nachregenerieren nach dem Umziehen). Das ist kein Kampfvorteil, weil der Wechsel im Kampf gesperrt ist.
  const stats = computeStats(state, content);
  if (Number.isFinite(stats.maxHp)) state.character.hp = stats.maxHp;
  if (Number.isFinite(stats.maxMana)) state.character.mana = stats.maxMana;
  if (Number.isFinite(stats.maxWard)) state.character.ward = stats.maxWard;
  return "ok";
}
