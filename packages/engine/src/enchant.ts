import type {
  AffixDef,
  AttributeId,
  ContentDB,
  EnchantAffix,
  EquipBonus,
  GameState,
  ItemDef,
  ItemId,
  ItemInstance,
  ItemRarity,
  ItemRef,
  TrinityStats,
  WeaponEffect,
} from "@hearthforge/shared";
import {
  ATTRIBUTE_IDS,
  affixAppliesToItem,
  disenchantGoldCost,
  effectiveInstanceWeaponEffects,
  enchantGoldCost,
  enchantSlotsFor,
  getItemRarity,
  instanceBonusDelta,
  runeAffix,
} from "@hearthforge/shared";
import {
  addInstance,
  addInstanceOrBank,
  addItem,
  addItemOrBank,
  getInstance,
  itemCount,
  markItemDiscovered,
  removeInstance,
  removeItem,
} from "./inventory";

/**
 * Stabile Fehlschlag-Codes statt lokalisierter Prosa. Die Engine bleibt sprachneutral &
 * deterministisch testbar; die UI rendert `t("enchant.reason." + code)`.
 *  - `not_enough_gold`  Gold reicht für die Enchant-/Disenchant-Kosten nicht.
 *  - `affix_mismatch`   Der Affix der Rune passt nicht zum Item-Typ (`appliesTo`).
 *  - `class_mismatch`   Trinity-Rune auf einem Teil ohne den passenden Trinity-Stat (§6.2-Klassen-Gate):
 *                       Schutz nur auf Platte (armorRating>0), Ausweich nur auf Leder (evasionRating>0),
 *                       Ward nur auf Stoff (wardCapacity>0), Block nur auf Schild (blockChance>0).
 *  - `duplicate_affix`  Dieselbe Affix-Identität (affixId, tier-unabhängig) sitzt bereits auf der
 *                       Instanz (red-team 2026-07-09 L4: kein Duplikat-Runen-Stacking mehr; für ein
 *                       Tier-Upgrade erst den alten Affix disenchanten). Bestehende Duplikat-
 *                       Instanzen aus Alt-Saves bleiben GEDULDET (laden + wirken via
 *                       instanceBonusDelta weiter) — nur NEUE Anwendungen sind blockiert.
 *  - `no_affix_slots`   Das Item hat für seine Rarity keinen freien Affix-Slot mehr.
 *  - `no_affix`         Die Rune trägt keinen Affix bzw. der Ziel-Affix-Index existiert nicht.
 *  - `not_enchantable`  Kein verzauberbares Equipment (oder kein Platz, um es zur Instanz zu promoten).
 *  - `not_found`        Rune/Item/Instanz am referenzierten Ort nicht vorhanden.
 */
export type EnchantReason =
  | "not_enough_gold"
  | "affix_mismatch"
  | "class_mismatch"
  | "duplicate_affix"
  | "no_affix_slots"
  | "no_affix"
  | "not_enchantable"
  | "not_found";

export interface EnchantResult {
  ok: boolean;
  reason?: EnchantReason;
  /** Die erzeugte/erweiterte Instanz (bei Erfolg). */
  instance?: ItemInstance;
}

/** Vergibt eine deterministische Instanz-ID (kein uuid/Date.now). */
export function mintInstanceId(state: GameState): string {
  const seq = state.nextInstanceSeq++;
  return `inst_${seq.toString(36)}`;
}

/**
 * Löst eine `ItemRef` zu der dahinterliegenden Instanz auf (oder null, wenn der Ref kein
 * modifiziertes Item adressiert). `remove()` entfernt die Instanz vollständig aus dem State.
 */
function resolveInstance(
  state: GameState,
  ref: ItemRef,
): { instance: ItemInstance; remove: () => void } | null {
  if (ref.kind === "inventory") {
    // Ein plain Inventar-Slot referenziert seit v53 KEINE Instanz mehr (Instanzen leben in
    // `inventory.instances`) → hier nichts aufzulösen. Existierende Instanzen adressiert die UI
    // über `kind: "inventory_instance"`.
    return null;
  }
  if (ref.kind === "inventory_instance") {
    const instance = getInstance(state.inventory, ref.instanceId);
    if (!instance) return null;
    return { instance, remove: () => void removeInstance(state.inventory, ref.instanceId) };
  }
  if (ref.kind === "equipment") {
    const inst = state.character.equippedInstances[ref.slot];
    if (!inst) return null;
    return {
      instance: inst,
      remove: () => {
        delete state.character.equippedInstances[ref.slot];
        state.character.equipment[ref.slot] = null;
      },
    };
  }
  // vault
  const idx = state.bankInstances.findIndex((i) => i.instanceId === ref.instanceId);
  if (idx === -1) return null;
  return {
    instance: state.bankInstances[idx]!,
    remove: () => state.bankInstances.splice(idx, 1),
  };
}

/**
 * Liefert die (ggf. erst zu erzeugende) Ziel-Instanz eines Refs PLUS die Basis-ItemDef. Promotet ein
 * plain Item deterministisch zur Instanz (vergibt instanceId, löst aus einem Stack > 1 aus). Gibt
 * `null` mit Grund zurück, wenn der Ref nicht enchantbar ist (kein Equipment, kein Platz, …).
 */
function resolveOrPromote(
  state: GameState,
  content: ContentDB,
  ref: ItemRef,
): { instance: ItemInstance; base: ItemDef; rarity: ItemRarity } | { error: EnchantReason } {
  const mk = (baseItemId: ItemId): ItemInstance => ({
    instanceId: mintInstanceId(state),
    baseItemId,
    affixes: [],
  });
  const wrap = (
    instance: ItemInstance,
  ): { instance: ItemInstance; base: ItemDef; rarity: ItemRarity } | { error: EnchantReason } => {
    const base = content.items[instance.baseItemId];
    if (!base || base.type !== "equipment") return { error: "not_enchantable" };
    return { instance, base, rarity: getItemRarity(base) };
  };

  if (ref.kind === "inventory") {
    // Plain Inventar-Slot → ein Exemplar zur Instanz promoten und in die unbegrenzte Tasche legen.
    const slot = state.inventory.slots[ref.index];
    if (!slot) return { error: "not_found" };
    const base = content.items[slot.itemId];
    if (!base || base.type !== "equipment") return { error: "not_enchantable" };
    const instance = mk(slot.itemId);
    addInstance(state.inventory, instance); // unbegrenzte Tasche → immer erfolgreich
    slot.qty -= 1;
    if (slot.qty <= 0) state.inventory.slots[ref.index] = null;
    return wrap(instance);
  }

  if (ref.kind === "inventory_instance") {
    const instance = getInstance(state.inventory, ref.instanceId);
    if (!instance) return { error: "not_found" };
    return wrap(instance);
  }

  if (ref.kind === "equipment") {
    const existing = state.character.equippedInstances[ref.slot];
    if (existing) return wrap(existing);
    const baseId = state.character.equipment[ref.slot];
    if (!baseId) return { error: "not_found" };
    const base = content.items[baseId];
    if (!base || base.type !== "equipment") return { error: "not_enchantable" };
    const instance = mk(baseId);
    state.character.equippedInstances[ref.slot] = instance; // equipment[slot] bleibt baseId
    return wrap(instance);
  }

  // vault
  const inst = state.bankInstances.find((i) => i.instanceId === ref.instanceId);
  if (!inst) return { error: "not_found" };
  return wrap(inst);
}

/**
 * Bringt den Affix der Rune `runeId` an dem über `ref` referenzierten Item an (deterministisch).
 * Promotet plain Items zur Instanz, prüft Slot-Limit nach Rarity, zieht 1 Rune + Gold ab.
 * Welchen Affix eine Rune trägt, liest die Engine aus Content (`item.rune` → `runeAffix`).
 */
export function applyEnchant(
  state: GameState,
  content: ContentDB,
  ref: ItemRef,
  runeId: ItemId,
): EnchantResult {
  const ra = runeAffix(content, runeId);
  if (!ra) return { ok: false, reason: "no_affix" };
  if (itemCount(state.inventory, runeId) < 1) return { ok: false, reason: "not_found" };

  const resolved = resolveOrPromote(state, content, ref);
  if ("error" in resolved) return { ok: false, reason: resolved.error };
  const { instance, base, rarity } = resolved;

  // Affix-Anwendbarkeit (nur prüfen, wenn der Affix-Katalog die Def kennt — sonst defensiv erlauben).
  const def = content.affixes?.[ra.affixId];
  if (def && !affixAppliesToItem(def.appliesTo, base)) {
    return rollback(state, content, ref, instance, "affix_mismatch");
  }

  // Trinity-Klassen-Gate (§6.2): eine Trinity-Rune (armorRating/evasionRating/wardCapacity/blockChance
  // in `trinityByTier`) haftet nur auf einem Basis-Teil, das denselben Trinity-Stat bereits > 0 trägt —
  // Schutz→Platte, Ausweich→Leder, Ward→Stoff, Block→Schild. Kein neues Tag: geprüft am ItemDef-Feld.
  if (def && !trinityGatePasses(def, ra.tier, base)) {
    return rollback(state, content, ref, instance, "class_mismatch");
  }

  // Duplikat-Sperre (red-team L4): dieselbe Affix-Identität (affixId, TIER-unabhängig — ein
  // Tier-Upgrade läuft über disenchant + neu anbringen) darf nicht mehrfach auf einer Instanz
  // sitzen. VOR den Kosten geprüft: der Fehlversuch kostet weder Rune noch Gold. Alt-Save-
  // Instanzen mit bestehenden Duplikaten bleiben geduldet (nur NEUE Anwendungen blockiert).
  if (instance.affixes.some((a) => a.affixId === ra.affixId)) {
    return rollback(state, content, ref, instance, "duplicate_affix");
  }

  // Slot-Limit nach Rarity.
  if (instance.affixes.length >= enchantSlotsFor(rarity)) {
    return rollback(state, content, ref, instance, "no_affix_slots");
  }

  // Kosten: Rune + Gold.
  const cost = enchantGoldCost(ra.tier, rarity);
  if (state.character.gold < cost) {
    return rollback(state, content, ref, instance, "not_enough_gold");
  }

  removeItem(state.inventory, runeId, 1);
  state.character.gold -= cost;
  // Gold-Ausgabe buchen (Sweep6 T10 #3): wie shop.ts/bank.ts — sonst unterzählen
  // `gold_spent`-Achievements/Statistik, sobald Enchanting Gold frisst.
  state.stats.goldSpent += cost;
  instance.affixes.push({ affixId: ra.affixId, tier: ra.tier });
  return { ok: true, instance };
}

/**
 * Macht eine frische Promotion rückgängig, wenn das Anbringen scheitert (kein Stat-/Save-Müll).
 * Eine eben für diesen Aufruf erzeugte, noch affixlose Instanz wird wieder zum plain Item degradiert.
 */
function rollback(
  state: GameState,
  content: ContentDB,
  ref: ItemRef,
  instance: ItemInstance,
  reason: EnchantReason,
): EnchantResult {
  if (instance.affixes.length === 0 && !instance.suffix) degradeToPlain(state, content, ref, instance);
  return { ok: false, reason };
}

/** Degradiert eine Instanz (ohne Affixe/Suffix) zurück zum plain Stack/Item am Ort des Refs. */
function degradeToPlain(state: GameState, content: ContentDB, ref: ItemRef, instance: ItemInstance): void {
  if (ref.kind === "inventory" || ref.kind === "inventory_instance") {
    // Die frisch promotete Instanz aus der Tasche zurücknehmen und als plain Item zurückgeben
    // (merged in einen bestehenden Stack bzw. einen freien Slot — beim Promoten wurde gerade Platz frei).
    if (removeInstance(state.inventory, instance.instanceId)) {
      addItem(state.inventory, content, instance.baseItemId, 1);
    }
  } else if (ref.kind === "equipment") {
    if (state.character.equippedInstances[ref.slot]?.instanceId === instance.instanceId) {
      delete state.character.equippedInstances[ref.slot]; // equipment[slot] bleibt baseId = plain
    }
  }
  // vault: eine eben erzeugte Instanz im Vault gibt es nicht (Vault-Items sind immer schon Instanzen).
}

/**
 * Entfernt EINEN Affix (per Index) von der über `ref` referenzierten Instanz. Die Rune ist weg
 * (kein Refund) + Gold-Kosten. Bleibt die Instanz danach ohne Affixe UND ohne Suffix, degradiert
 * sie zurück zum plain Item (re-stackable).
 */
export function disenchant(
  state: GameState,
  content: ContentDB,
  ref: ItemRef,
  affixIndex: number,
): EnchantResult {
  const resolved = resolveInstance(state, ref);
  if (!resolved) return { ok: false, reason: "not_found" };
  const { instance } = resolved;
  const affix = instance.affixes[affixIndex];
  if (!affix) return { ok: false, reason: "no_affix" };

  const base = content.items[instance.baseItemId];
  const rarity = base ? getItemRarity(base) : "common";
  const cost = disenchantGoldCost(affix.tier, rarity);
  if (state.character.gold < cost) return { ok: false, reason: "not_enough_gold" };

  state.character.gold -= cost;
  state.stats.goldSpent += cost; // Gold-Ausgabe buchen (Sweep6 T10 #3, Muster shop.ts)
  instance.affixes.splice(affixIndex, 1);

  if (instance.affixes.length === 0 && !instance.suffix) {
    // Letzte Modifikation entfernt → zurück zum plain Item.
    if (ref.kind === "equipment") {
      degradeToPlain(state, content, ref, instance); // Basis bleibt ausgerüstet
    } else {
      // Eigenständige Instanz (inventory_instance ODER vault): aus ihrem Träger lösen und das
      // Basis-Item re-stackable zurückgeben (ins Inventar, Overflow ins Lager).
      resolved.remove();
      addItemOrBank(state, content, instance.baseItemId, 1);
    }
  }
  return { ok: true, instance };
}

// salvageInstance/salvagePayout/SalvageResult: GELÖSCHT (Task #278) — „Es soll kein Salvage geben,
// ungewollte Items werden verkauft" (Chef); die Salvage-UI ist seit #275 entfernt.

export interface IntakeResult {
  /**
   * Seit Task #271 (Auto-Salvage entfernt) IMMER `true` — der Eingang behält jede Instanz.
   * Das Feld bleibt für Signatur-/Aufrufer-Stabilität (suffix.ts reicht es durch).
   */
  kept: boolean;
}

/**
 * Kanonischer Eingang für eine FRISCH erzeugte Loot-/Craft-Instanz, die ins Inventar fließen soll.
 * Kapazitäts-Gate (Chef-Bugfix „22/20" 2026-07-23): passt sie noch in die reguläre Inventar-Tasche
 * (`hasInstanceRoom`), landet sie via `addInstanceOrBank` dort — sonst geht sie in den unbegrenzten
 * Gear-Vault (`bankInstances`). NIE verloren (`kept` bleibt immer `true`), aber neuer Zugang wächst
 * nie mehr über die Kapazität hinaus (vorher: bedingungslos `addInstance`, unabhängig von Slots/
 * Kapazität — das ließ das Inventar-Grid optisch beliebig überlaufen). Der frühere Auto-Salvage-Filter
 * ist ENTFERNT (Task #271, SAVE_VERSION 56): ungewollte Instanzen verkauft der Spieler.
 * Deterministisch; ausgerüstete (`equippedInstances`) Instanzen passieren diesen Eingang nie.
 */
export function intakeInstance(
  state: GameState,
  content: ContentDB,
  instance: ItemInstance,
): IntakeResult {
  addInstanceOrBank(state, content, instance); // Tasche, sonst (unbegrenzter) Gear-Vault → nie verloren
  // Erst-Besitz-Marker (SAVE 58): zentraler INSTANZ-Zugangs-Pfad — Suffix-Drops (Kampf) und
  // Suffix-Crafts (tick) laufen hier durch, bevor das Basis-Item je als Stack besessen sein muss.
  markItemDiscovered(state, instance.baseItemId);
  return { kept: true };
}

// vaultDeposit/vaultWithdraw: GELÖSCHT (Task #278) — Instanz-Einlagerung läuft ausschließlich über
// die BankPage (`bank.depositInstance`/`withdrawInstance`); die Vault-UI ist seit #275 entfernt.

// shouldAutoSalvage: ENTFERNT (Task #271, SAVE_VERSION 56) — es gibt kein Auto-Salvage mehr;
// `intakeInstance` behält jede Instanz. `settings.autoSalvage` wird von migrateState gelöscht.

// ───────────────────────────────────────────────────────────────────────────
// Trinity-Klassen-Gate + Enchant-Vorschau (§6.2 / §8.2)
// ───────────────────────────────────────────────────────────────────────────

/** Die vier Trinity-Achsen (Reihenfolge = Prüf- & changedKeys-Anzeigereihenfolge). */
const TRINITY_KEYS: readonly (keyof TrinityStats)[] = [
  "armorRating",
  "evasionRating",
  "wardCapacity",
  "blockChance",
];

/**
 * Trinity-Klassen-Gate (§6.2): true, wenn `def` an `base` angebracht werden darf. Trägt der Affix bei
 * `tier` einen Trinity-Stat > 0, muss das Basis-Item denselben Stat bereits > 0 tragen — Schutz→Platte
 * (armorRating>0), Ausweich→Leder (evasionRating>0), Ward→Stoff (wardCapacity>0), Block→Schild
 * (blockChance>0). Ohne `trinityByTier` (Waffen-/Attribut-Runen) immer true. Rein lesend & deterministisch,
 * KEIN neues Tag — geprüft direkt am ItemDef-Feld. Von `applyEnchant` UND `enchantPreview` genutzt.
 */
export function trinityGatePasses(def: AffixDef, tier: number, base: ItemDef): boolean {
  const tri = def.trinityByTier?.[tier - 1];
  if (!tri) return true;
  for (const key of TRINITY_KEYS) {
    if ((tri[key] ?? 0) > 0 && (base[key] ?? 0) <= 0) return false;
  }
  return true;
}

/**
 * Item-EIGEN-Stat-Aggregat (NICHT der ganze Character): Basis-`bonus`/`modifiers`/Trinity + Σ der
 * vorhandenen Affixe/Suffix (via `instanceBonusDelta`) + Waffeneffekte. Kein computeStats-Kontext
 * (keine Stance/Set/Buffs/Range-Whitelist) — der reine Item-Beitrag, den die Enchant-Vorschau diff't.
 */
export interface ItemStatView {
  bonus: EquipBonus;
  modifiers: Partial<Record<AttributeId, number>>;
  trinity: TrinityStats;
  procs: WeaponEffect[];
}

/**
 * Vorher/Nachher-Vorschau einer Verzauberung (§8.2, für ui-devs Enchant-Preview-Panel). REINER,
 * deterministischer Diff — mutiert NICHTS. `before`/`after` sind der Item-Eigen-Stat-Block OHNE bzw.
 * MIT der Kandidat-Rune; das `after` spiegelt EXAKT den Beitrag, den `applyEnchant` + `instanceBonusDelta`
 * (und damit computeStats) nach dem echten Anbringen liefern würden (dieselben Aggregations-Regeln:
 * Trinity additiv, blockChance MAX, Suffix identisch in before/after ⇒ hebt sich im Delta auf).
 */
export interface EnchantPreview {
  before: ItemStatView;
  after: ItemStatView;
  /** Stat-Keys mit geändertem Wert (EquipBonus-Keys ∪ AttributeIds ∪ Trinity-Keys) → ui hebt genau diese hervor. */
  changedKeys: string[];
  /** Neue Waffeneffekte durch die Rune (für die „Neuer Effekt"-Zeilen; kein Zahlen-Delta). */
  addedProcs: WeaponEffect[];
  /** Locale-NEUTRALE Effekt-Tokens der Rune allein (z.B. "+10 str", "+20 armorRating", "burn 25% 1.4/5000ms").
   *  Anzeige-Prosa lokalisiert ui-dev über `affixEffectParts` (§8.4/§8.6); dies ist die neutrale Quelle. */
  effectParts: string[];
  canApply: boolean;
  blockedReason?: "slot_full" | "class_mismatch" | "wrong_item_type" | "duplicate_affix";
}

const emptyTrinity = (): TrinityStats => ({
  armorRating: 0,
  evasionRating: 0,
  wardCapacity: 0,
  blockChance: 0,
});

/** Baut den Item-Eigen-Stat-Block aus Basis-Item + gegebener Affix-Liste (+ Suffix). */
function itemStatView(
  base: ItemDef,
  affixes: EnchantAffix[],
  suffix: ItemInstance["suffix"],
  content: ContentDB,
): ItemStatView {
  const inst: ItemInstance = {
    instanceId: "__preview__",
    baseItemId: base.id,
    affixes,
    ...(suffix ? { suffix } : {}),
  };
  const delta = instanceBonusDelta(inst, content);
  const bonus: EquipBonus = { ...(base.bonus ?? {}) };
  for (const key of Object.keys(delta.bonus) as (keyof EquipBonus)[]) {
    bonus[key] = (bonus[key] ?? 0) + (delta.bonus[key] ?? 0);
  }
  const modifiers: Partial<Record<AttributeId, number>> = { ...(base.modifiers ?? {}) };
  for (const id of ATTRIBUTE_IDS) {
    if (delta.modifiers[id]) modifiers[id] = (modifiers[id] ?? 0) + (delta.modifiers[id] ?? 0);
  }
  // Trinity-Faltung EXAKT wie computeStats/Gear: additiv, blockChance als MAX (Basis vs. Rune).
  const trinity: TrinityStats = {
    armorRating: (base.armorRating ?? 0) + delta.trinity.armorRating,
    evasionRating: (base.evasionRating ?? 0) + delta.trinity.evasionRating,
    wardCapacity: (base.wardCapacity ?? 0) + delta.trinity.wardCapacity,
    blockChance: Math.max(base.blockChance ?? 0, delta.trinity.blockChance),
  };
  return { bonus, modifiers, trinity, procs: effectiveInstanceWeaponEffects(inst, base, content) };
}

const procKey = (e: WeaponEffect): string =>
  `${e.type}|${e.chance}|${e.magnitude}|${e.durationMs}|${e.threshold ?? ""}|${e.stacks ?? ""}|${e.targetFamily ?? ""}`;

/** Locale-neutrale Effekt-Tokens der Kandidat-Rune bei `tier` (nur die Rune selbst). */
function affixEffectPartsNeutral(def: AffixDef, tier: number): string[] {
  const parts: string[] = [];
  const sign = (v: number): string => (v >= 0 ? `+${v}` : `${v}`);
  const b = def.bonusByTier?.[tier - 1];
  if (b) for (const key of Object.keys(b) as (keyof EquipBonus)[]) {
    const v = b[key];
    if (v) parts.push(`${sign(v)} ${key}`);
  }
  const mods = def.modifiersByTier?.[tier - 1];
  if (mods) for (const id of ATTRIBUTE_IDS) {
    const v = mods[id];
    if (v) parts.push(`${sign(v)} ${id}`);
  }
  const tri = def.trinityByTier?.[tier - 1];
  if (tri) for (const key of TRINITY_KEYS) {
    const v = tri[key];
    if (v) parts.push(`${sign(v)} ${key}`);
  }
  const eff = def.weaponEffectByTier?.[tier - 1];
  if (eff) parts.push(`${eff.type} ${Math.round(eff.chance * 100)}% ${eff.magnitude}/${eff.durationMs}ms`);
  return parts;
}

/**
 * Enchant-Vorschau (§8.2, für das Preview-Panel). Liefert den resultierenden Item-Stat-Block MIT
 * angewandter Rune vs. OHNE, plus die geänderten Keys, neue Procs, neutrale Effekt-Tokens und den
 * Anwendbarkeits-Status (Rarity-Slot-Cap · Klassen-Gate §6.2 · appliesTo-Typ-Match — Reihenfolge wie
 * `applyEnchant`, OHNE Gold-Prüfung: Gold prüft erst der Klick-Pfad). Rein & deterministisch, kein
 * State-Mutieren. `target` = bestehende Instanz (mit Affixen/Suffix) ODER ein plain ItemDef;
 * `overrideSlotIndex` gesetzt ⇒ Delta gegen den in diesem Slot belegten Affix statt „leer".
 */
export function enchantPreview(
  content: ContentDB,
  target: ItemInstance | ItemDef,
  runeItemId: ItemId,
  overrideSlotIndex?: number,
): EnchantPreview {
  const inst = "baseItemId" in target ? (target as ItemInstance) : null;
  const base = inst ? content.items[inst.baseItemId] : (target as ItemDef);
  const existingAffixes: EnchantAffix[] = inst ? inst.affixes : [];
  const suffix = inst ? inst.suffix : undefined;

  // Unbekanntes Basis-Item → nichts darstellbar.
  if (!base) {
    const empty: ItemStatView = { bonus: {}, modifiers: {}, trinity: emptyTrinity(), procs: [] };
    return {
      before: empty,
      after: empty,
      changedKeys: [],
      addedProcs: [],
      effectParts: [],
      canApply: false,
      blockedReason: "wrong_item_type",
    };
  }

  const ra = runeAffix(content, runeItemId);
  const def = ra ? content.affixes?.[ra.affixId] : undefined;
  const effectParts = def && ra ? affixEffectPartsNeutral(def, ra.tier) : [];

  const before = itemStatView(base, existingAffixes, suffix, content);

  const isOverride =
    typeof overrideSlotIndex === "number" &&
    overrideSlotIndex >= 0 &&
    overrideSlotIndex < existingAffixes.length;

  let afterAffixes = existingAffixes;
  if (ra) {
    const candidate: EnchantAffix = { affixId: ra.affixId, tier: ra.tier };
    afterAffixes = isOverride
      ? existingAffixes.map((a, i) => (i === overrideSlotIndex ? candidate : a))
      : [...existingAffixes, candidate];
  }
  const after = itemStatView(base, afterAffixes, suffix, content);

  // changedKeys: EquipBonus-Keys ∪ AttributeIds ∪ Trinity-Keys, deren Wert sich ändert.
  const changedKeys: string[] = [];
  const bonusKeys = new Set<keyof EquipBonus>([
    ...(Object.keys(before.bonus) as (keyof EquipBonus)[]),
    ...(Object.keys(after.bonus) as (keyof EquipBonus)[]),
  ]);
  for (const key of bonusKeys) {
    if ((before.bonus[key] ?? 0) !== (after.bonus[key] ?? 0)) changedKeys.push(key);
  }
  for (const id of ATTRIBUTE_IDS) {
    if ((before.modifiers[id] ?? 0) !== (after.modifiers[id] ?? 0)) changedKeys.push(id);
  }
  for (const key of TRINITY_KEYS) {
    if (before.trinity[key] !== after.trinity[key]) changedKeys.push(key);
  }

  const beforeProcKeys = new Set(before.procs.map(procKey));
  const addedProcs = after.procs.filter((e) => !beforeProcKeys.has(procKey(e)));

  // Anwendbarkeit (Reihenfolge wie applyEnchant, OHNE Gold).
  let canApply = true;
  let blockedReason: EnchantPreview["blockedReason"];
  if (base.type !== "equipment" || !ra) {
    canApply = false;
    blockedReason = "wrong_item_type";
  } else if (def && !affixAppliesToItem(def.appliesTo, base)) {
    canApply = false;
    blockedReason = "wrong_item_type";
  } else if (def && !trinityGatePasses(def, ra.tier, base)) {
    canApply = false;
    blockedReason = "class_mismatch";
  } else if (existingAffixes.some((a, i) => a.affixId === ra.affixId && !(isOverride && i === overrideSlotIndex))) {
    // Duplikat-Sperre (red-team L4, Spiegel von applyEnchant): dieselbe Affix-Identität sitzt schon
    // auf der Instanz. Beim Slot-Override zählt der ÜBERSCHRIEBENE Slot nicht mit (dieselbe Rune in
    // denselben Slot erneut zu legen ist kein Duplikat — after == before, aber legal darstellbar).
    canApply = false;
    blockedReason = "duplicate_affix";
  } else if (!isOverride && existingAffixes.length >= enchantSlotsFor(getItemRarity(base))) {
    canApply = false;
    blockedReason = "slot_full";
  }

  return { before, after, changedKeys, addedProcs, effectParts, canApply, blockedReason };
}
