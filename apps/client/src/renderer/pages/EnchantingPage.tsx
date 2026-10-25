import { useEffect, useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { applyEnchant, collectSpecialEffects, disenchant, enchantPreview } from "@hearthforge/engine";
import type { EnchantPreview, ItemStatView } from "@hearthforge/engine";
import type {
  AffixDef,
  AttributeId,
  EquipBonus,
  EquipSlot,
  ItemDef,
  ItemInstance,
  ItemRarity,
  ItemRef,
  ItemTypeTag,
  LocalizedString,
} from "@hearthforge/shared";
import {
  ATTRIBUTES,
  ATTRIBUTE_IDS,
  EQUIP_SLOT_LABELS,
  affixAppliesToItem,
  disenchantGoldCost,
  enchantGoldCost,
  enchantSlotsFor,
  getItemRarity,
  instanceDisplayName,
  isStatusEffectType,
  runeAffix,
} from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { ItemCell } from "../components/ItemCell";
import { ItemFilterSearch } from "../components/ItemFilterBar";
import { affixEffectParts, fmtBonus } from "../components/ItemTooltip";
import { getItemImage, rarityClass } from "../items";
import { runeFitsHint, runeTargetLabel } from "../runeTargets";
import { getSkillBackground } from "../skillBackgrounds";
import { formatSeconds1 } from "../util/format";
import { weaponEffectProse } from "../util/weaponEffectProse";
import iconEnchantRune from "../assets/icons/icon_enchant_rune.webp";
import "../styles/enchanting.css";

// claude:2026-10-25T14:12:00+01:00 — Verzauberungs-Redesign (Chef 25.10.: „die ist furchtbar“). Aus der flachen
// lila Drei-Spalten-Fläche wird ein Ort: links die Item-Wahl mit Suche und Filter, rechts oben die gemalte
// Altar-Bühne (Runenkunst-Kulisse) mit dem Item groß, seinen Verzauberungsplätzen als Sockel und der Vorher/
// Nachher-Tafel, darunter das Runen-Grimoire als Kartenraster. Engine-Aufrufe (applyEnchant/disenchant/
// enchantPreview), Waffen-/Rüstungs-Runen-Trennung, Lager-Runen, K3-Doppeleffekt-Hinweis und Suffix-Hinweis
// bleiben erhalten; neu sind Sockel mit Runenbild, sichtbare Gründe an unpassenden Runen und der Altar-Moment.

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Zeilen für Vorschau/Affix-Liste: flache Boni + Attribut-Mods + Waffeneffekt-Proc (Feuer/Frost/
 * Sturm etc.), damit `affix_flame/frost/shock` hier nicht nur ihren winzigen Flat-Bonus zeigen und
 * den eigentlichen Kaufgrund (den Proc) verschweigen — nutzt dieselbe Quelle wie der Item-Tooltip.
 */
function affixLines(
  def: AffixDef,
  tier: number,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string[] {
  return affixEffectParts(def, tier, t, tr).filter(Boolean);
}

/** Stabile Reason-Codes, die die Engine direkt liefert — siehe `enchant.reason.*`. */
const ENCHANT_REASON_CODES = new Set([
  "not_enough_gold",
  "affix_mismatch",
  "class_mismatch",
  "duplicate_effect",
  "no_affix_slots",
  "no_affix",
  "not_enchantable",
  "not_found",
]);

/** Die vier Rüstungs-Trinität-Keys, dieselbe Reihenfolge wie `enchant.ts` TRINITY_KEYS. */
const TRINITY_PREVIEW_KEYS = ["armorRating", "evasionRating", "wardCapacity", "blockChance"] as const;

/** Stat-Key → i18n-Label-Key für die Vorher/Nachher-Zeilen (EquipBonus- + Trinity-Keys). */
const PREVIEW_LABEL_KEY: Record<string, string> = {
  meleeDamage: "stat.meleeDamage",
  rangedDamage: "stat.rangedDamage",
  magicDamage: "stat.magicDamage",
  defense: "stat.defense",
  accuracy: "stat.accuracy",
  evasion: "stat.evasion",
  maxHp: "stat.hp",
  hpRegenPerSec: "stat.hpRegen",
  maxMana: "stat.maxMana",
  critChance: "stat.critChance",
  critDamage: "stat.critDamage",
  attackIntervalMs: "itip.attackSpeed",
  armorRating: "stat.armorRating",
  evasionRating: "stat.evasionRating",
  wardCapacity: "stat.wardCapacity",
  blockChance: "stat.blockChance",
};
/** Werte, die als Prozent (0..1 → %) statt als Rohzahl formatiert werden. */
const PREVIEW_PCT_KEYS = new Set(["critChance", "critDamage", "blockChance"]);

function formatPreviewValue(key: string, v: number): string {
  if (PREVIEW_PCT_KEYS.has(key)) return `${v >= 0 ? "+" : ""}${Math.round(v * 100)}%`;
  if (key === "attackIntervalMs") return `${v > 0 ? "+" : ""}${formatSeconds1(v / 1000)}s`;
  return fmtBonus(v);
}

/** attr-id → LocalizedString-Name (für Attribut-Zeilen im Vorher/Nachher-Block). */
const PREVIEW_ATTR_NAME: Record<string, LocalizedString> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, a.name]),
);

function previewValueOf(view: ItemStatView, key: string): number {
  if (key in view.bonus) return (view.bonus as Record<string, number | undefined>)[key] ?? 0;
  if (key in view.modifiers) return (view.modifiers as Record<string, number | undefined>)[key] ?? 0;
  if (key in view.trinity) {
    return (view.trinity as unknown as Record<string, number | undefined>)[key] ?? 0;
  }
  return 0;
}

interface PreviewRow {
  key: string;
  label: string;
  before: number;
  after: number;
  changed: boolean;
}

/**
 * Baut die Vorher/Nachher-Zeilen aus einem `EnchantPreview`-Ergebnis: jeder Stat-Key, der in
 * `before` ODER `after` einen Wert ≠ 0 trägt (oder in `changedKeys` steht), wird eine Zeile.
 * Reine Anzeige-Ableitung, mutiert nichts.
 */
function buildPreviewRows(
  preview: EnchantPreview,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): PreviewRow[] {
  const changed = new Set(preview.changedKeys);
  const keys = new Set<string>(preview.changedKeys);
  const collect = (view: ItemStatView): void => {
    for (const [k, v] of Object.entries(view.bonus) as [keyof EquipBonus, number | undefined][]) {
      if (v) keys.add(k);
    }
    for (const id of ATTRIBUTE_IDS) {
      if (view.modifiers[id]) keys.add(id);
    }
    for (const k of TRINITY_PREVIEW_KEYS) {
      if (view.trinity[k]) keys.add(k);
    }
  };
  collect(preview.before);
  collect(preview.after);
  return [...keys].map((key) => {
    const labelKey = PREVIEW_LABEL_KEY[key];
    const attrName = PREVIEW_ATTR_NAME[key as AttributeId];
    const label = labelKey ? t(labelKey) : attrName ? tr(attrName) : key;
    return {
      key,
      label,
      before: previewValueOf(preview.before, key),
      after: previewValueOf(preview.after, key),
      changed: changed.has(key),
    };
  });
}

/**
 * Legacy-Fallback: alte deutsche Prosa-Gründe auf denselben i18n-Key mappen — sonst leakt rohes
 * Deutsch ins EN-Locale (Sweep2 F2).
 */
const LEGACY_REASON_MAP: Record<string, string> = {
  "Nicht genug Gold": "not_enough_gold",
  "Affix passt nicht zum Item": "affix_mismatch",
  "Keine Enchant-Slots frei": "no_affix_slots",
  "Keine Rune": "no_affix",
  "Nicht verzauberbar": "not_enchantable",
  "Rune nicht im Inventar": "not_found",
  "Slot leer": "not_found",
  "Inventar voll": "not_found",
  "Keine Instanz": "not_found",
  "Affix-Index ungültig": "not_found",
  "Nicht im Vault": "not_found",
};

function enchantReasonLabel(reason: string, t: (k: string) => string): string {
  const code = ENCHANT_REASON_CODES.has(reason) ? reason : LEGACY_REASON_MAP[reason];
  return code ? t(`enchant.reason.${code}`) : reason;
}

// ── Waffen-/Rüstungs-Split fürs Grimoire (Chef-Wunsch, bleibt) ────────────────

type RuneCategory = "weapon" | "armor" | "other";

const WEAPON_APPLIES_TAGS = new Set<ItemTypeTag>(["weapon_melee", "weapon_ranged", "weapon_magic", "any_weapon"]);
const ARMOR_APPLIES_TAGS = new Set<ItemTypeTag>(["armor", "shield"]);

function runeCategory(def: AffixDef): RuneCategory {
  const tags = def.appliesTo;
  if (!tags || tags.length === 0) return "other";
  const isWeapon = tags.some((tag) => WEAPON_APPLIES_TAGS.has(tag));
  const isArmor = tags.some((tag) => ARMOR_APPLIES_TAGS.has(tag));
  if (isWeapon && !isArmor) return "weapon";
  if (isArmor && !isWeapon) return "armor";
  return "other";
}

/**
 * Warum passt sie nicht? Scheitert es am Trinity-Gate, ist die Rüstungsklasse der eigentliche Grund
 * und gehört genannt — "nur für Rüstung" wäre dort falsch, das Teil IST ja Rüstung.
 */
function runeMismatchHint(
  def: AffixDef | null,
  tier: number | null,
  ziel: ItemDef | null,
  category: RuneCategory,
  t: (k: string) => string,
): string {
  if (def && tier !== null && ziel && affixAppliesToItem(def.appliesTo, ziel)) {
    const hint = runeFitsHint(def, tier, t);
    if (hint) return hint;
  }
  if (category === "weapon") return t("enchant.onlyWeapons");
  if (category === "armor") return t("enchant.onlyArmor");
  return t("enchant.reason.affix_mismatch");
}

/** Item-Typ-Badge: Waffenstil bzw. Rüstung/Schild/Schmuck — dieselbe Ton-Familie wie das Grimoire. */
interface ItemTypeBadge {
  labelKey: string;
  tone: RuneCategory;
}

function itemTypeBadge(def: ItemDef): ItemTypeBadge {
  if (def.weaponStyle === "melee") return { labelKey: "enchant.itemType.weapon_melee", tone: "weapon" };
  if (def.weaponStyle === "ranged") return { labelKey: "enchant.itemType.weapon_ranged", tone: "weapon" };
  if (def.weaponStyle === "magic") return { labelKey: "enchant.itemType.weapon_magic", tone: "weapon" };
  if (def.slot === "offhand") return { labelKey: "enchant.itemType.shield", tone: "armor" };
  if (def.slot === "ring1" || def.slot === "ring2" || def.slot === "amulet" || def.slot === "cape") {
    return { labelKey: "enchant.itemType.jewelry", tone: "other" };
  }
  return { labelKey: "enchant.itemType.armor", tone: "armor" };
}

// claude:2026-10-25T14:12:00+01:00 — Stufe als römische Zahl wie in den Runennamen („Rune der Schärfe III“).
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function roman(n: number): string {
  return ROMAN[n] ?? String(n);
}

// claude:2026-10-25T14:12:00+01:00 — Affix+Stufe → Runen-Item (für das Runenbild im belegten Sockel). Einmal
// aus dem Katalog aufgebaut; fehlt eine Rune, zeigt der Sockel das Runen-Symbol.
let runeByAffix: Map<string, string> | null = null;
function runeItemFor(affixId: string, tier: number): string | null {
  if (!runeByAffix) {
    runeByAffix = new Map();
    for (const it of Object.values(content.items)) {
      if (it.rune) runeByAffix.set(`${it.rune.affixId}|${it.rune.tier}`, it.id);
    }
  }
  return runeByAffix.get(`${affixId}|${tier}`) ?? null;
}

// ── File-level subcomponents ──────────────────────────────────────────────────

/** Runenbild ohne Zellenrahmen (Sockel, Vorschau-Kopf). Runen dürfen leuchten, das macht die CSS. */
function RuneGlyph({ runeId, tier, className = "" }: { runeId: string | null; tier: number | null; className?: string }): JSX.Element {
  const src = runeId ? getItemImage(runeId) : null;
  return (
    <span className={`ench-glyph ${className}`}>
      <img src={src ?? iconEnchantRune} alt="" className="ench-glyph-img" loading="lazy" decoding="async" />
      {tier !== null && <span className="ench-glyph-tier">{roman(tier)}</span>}
    </span>
  );
}

type ItemGroup = "equipped" | "inventory" | "variants";

interface AltarEntry {
  key: string;
  ref: ItemRef;
  itemId: string;
  instance?: ItemInstance;
  group: ItemGroup;
  label: string;
  sub: string;
  rarity: ItemRarity;
  tone: RuneCategory;
  used: number;
  max: number;
}

function sameRef(a: ItemRef | null, b: ItemRef): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === "equipment" && b.kind === "equipment") return a.slot === b.slot;
  if (a.kind === "inventory" && b.kind === "inventory") return a.index === b.index;
  if (a.kind === "inventory_instance" && b.kind === "inventory_instance") return a.instanceId === b.instanceId;
  return false;
}

interface RuneCardProps {
  itemId: string;
  qty: number;
  name: string;
  tier: number | null;
  effectLine: string;
  category: RuneCategory;
  selected: boolean;
  /** null = kein Ziel gewählt (neutral) · true/false = passt/passt nicht zum Ziel. */
  compatible: boolean | null;
  mismatchHint: string;
  badgeLabel: string;
  /** Wie viele der `qty` im Lager liegen (Spieler-Report 1.0.2: Runen aus dem Lager anwendbar). */
  storedQty?: number;
  onClick: () => void;
}

function RuneCard({
  itemId, qty, storedQty = 0, name, tier, effectLine, category, selected, compatible, mismatchHint, badgeLabel, onClick,
}: RuneCardProps): JSX.Element {
  const { t } = useI18n();
  const incompatible = compatible === false;
  return (
    <div
      className={`ench-rune-card ench-rune-card--${category}${selected ? " selected" : ""}${incompatible ? " incompatible" : ""}${compatible === true ? " fits" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      title={incompatible ? mismatchHint : undefined}
    >
      <span className="ench-rune-icon">
        <ItemCell itemId={itemId} className="shop-cell ench-rune-cell" />
        {tier !== null && <span className="ench-glyph-tier">{roman(tier)}</span>}
      </span>
      <div className="ench-rune-card-body">
        <span className="ench-rune-card-head">
          <span className="ench-rune-card-name">{name}</span>
          <span className="ench-rune-card-qty">×{qty}</span>
        </span>
        {effectLine && <span className="ench-rune-card-effect">{effectLine}</span>}
        <span className="ench-rune-card-foot">
          {incompatible ? (
            <span className="ench-rune-card-why">{mismatchHint}</span>
          ) : (
            <span className={`ench-rune-badge ench-rune-badge--${category}`}>{badgeLabel}</span>
          )}
          {storedQty > 0 && (
            <span className="ench-rune-card-stored">
              {t("enchant.rune.stored").replace("{n}", String(storedQty))}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EnchantingPage(): JSX.Element {
  const state = useGameState();
  const { t, tr, locale } = useI18n();
  const [selectedRef, setSelectedRef] = useState<ItemRef | null>(null);
  // claude:2026-10-25T14:12:00+01:00 — Rune per Item-ID statt Listenindex: verbraucht eine Verzauberung die letzte
  // Rune einer Sorte, verschiebt sich die Liste, und ein Index zeigte dann auf eine fremde Rune.
  const [selectedRuneId, setSelectedRuneId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [itemFilter, setItemFilter] = useState<"all" | RuneCategory>("all");
  const [onlyFitting, setOnlyFitting] = useState(false);
  // claude:2026-10-25T14:12:00+01:00 — Altar-Moment nach dem Verzaubern: neuer Sockel leuchtet auf, Runenkreis
  // läuft einmal, der Name der gebundenen Rune steigt auf. `seq` startet die Animation bei Wiederholung neu.
  const [flash, setFlash] = useState<{ seq: number; socket: number; runeId: string } | null>(null);
  const flashSeq = useRef(0);
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(null), 2000);
    return () => window.clearTimeout(id);
  }, [flash]);
  // claude:2026-10-25T14:24:00+01:00 — Die Bühne klebt beim Scrollen durch das Grimoire nur, solange sie höchstens 60 % der Spalte
  // belegt. Bei 1366×768 mit 125 % Text wäre sonst kaum eine Runenreihe sichtbar; dann scrollt die Bühne mit.
  const mainRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const [stageFloats, setStageFloats] = useState(false);
  useEffect(() => {
    const main = mainRef.current;
    const stage = stageRef.current;
    if (!main || !stage || typeof ResizeObserver === "undefined") return;
    const check = (): void => setStageFloats(stage.offsetHeight > main.clientHeight * 0.6);
    const ro = new ResizeObserver(check);
    ro.observe(main);
    ro.observe(stage);
    check();
    return () => ro.disconnect();
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  // Runenbestand über die ITEM-ID aus Inventar UND Lager (Spieler-Report 1.0.2) — jede Sorte einmal.
  const runeSlots: Array<{ itemId: string; qty: number; imLager: number }> = (() => {
    const summe = new Map<string, { itemId: string; qty: number; imLager: number }>();
    const zaehle = (itemId: string, qty: number, ausLager: boolean): void => {
      if (qty <= 0 || content.items[itemId]?.rune == null) return;
      const e = summe.get(itemId) ?? { itemId, qty: 0, imLager: 0 };
      e.qty += qty;
      if (ausLager) e.imLager += qty;
      summe.set(itemId, e);
    };
    for (const slot of state.inventory.slots) if (slot) zaehle(slot.itemId, slot.qty, false);
    for (const [itemId, qty] of Object.entries(state.bank)) zaehle(itemId, qty ?? 0, true);
    return [...summe.values()];
  })();

  // Altar-Kandidaten: angelegt, plain im Inventar (per applyEnchant zur Instanz promotbar), Varianten-Tasche.
  const entries: AltarEntry[] = [];
  const pushEntry = (
    key: string, ref: ItemRef, itemId: string, group: ItemGroup, inst: ItemInstance | undefined, slotSub?: string,
  ): void => {
    const def = content.items[itemId];
    if (!def) return;
    const rarity = getItemRarity(def);
    const badge = itemTypeBadge(def);
    const label = inst && (inst.affixes.length > 0 || inst.suffix)
      ? instanceDisplayName(inst, content, locale)
      : tr(def.name);
    entries.push({
      key, ref, itemId, instance: inst, group, label,
      sub: slotSub ?? t(badge.labelKey),
      rarity, tone: badge.tone,
      used: inst?.affixes.length ?? 0,
      max: enchantSlotsFor(rarity),
    });
  };
  for (const slot of Object.keys(state.character.equipment) as EquipSlot[]) {
    const id = state.character.equipment[slot];
    if (id == null) continue;
    pushEntry(`eq-${slot}`, { kind: "equipment", slot }, id, "equipped",
      state.character.equippedInstances[slot] ?? undefined, tr(EQUIP_SLOT_LABELS[slot]));
  }
  state.inventory.slots.forEach((slot, idx) => {
    if (slot && content.items[slot.itemId]?.type === "equipment") {
      pushEntry(`plain-${idx}`, { kind: "inventory", index: idx }, slot.itemId, "inventory", undefined);
    }
  });
  for (const inst of state.inventory.instances) {
    pushEntry(inst.instanceId, { kind: "inventory_instance", instanceId: inst.instanceId }, inst.baseItemId, "variants", inst);
  }

  const searchNorm = itemSearch.trim().toLowerCase();
  const visibleEntries = entries.filter((e) =>
    (itemFilter === "all" || e.tone === itemFilter) &&
    (!searchNorm || e.label.toLowerCase().includes(searchNorm) || e.itemId.includes(searchNorm) || e.sub.toLowerCase().includes(searchNorm)),
  );

  let selectedItemId: string | null = null;
  let selectedInstance: ItemInstance | null = null;
  if (selectedRef?.kind === "inventory") {
    const s = state.inventory.slots[selectedRef.index];
    if (s) { selectedItemId = s.itemId; selectedInstance = null; }
  } else if (selectedRef?.kind === "inventory_instance") {
    const inst = state.inventory.instances.find((i) => i.instanceId === selectedRef.instanceId);
    if (inst) { selectedItemId = inst.baseItemId; selectedInstance = inst; }
  } else if (selectedRef?.kind === "equipment") {
    const id = state.character.equipment[selectedRef.slot];
    if (id) {
      selectedItemId = id;
      selectedInstance = state.character.equippedInstances[selectedRef.slot] ?? null;
    }
  }

  const selectedItemDef = selectedItemId ? content.items[selectedItemId] ?? null : null;
  const selectedRarity = selectedItemDef ? getItemRarity(selectedItemDef) : "common";
  const maxSlots = enchantSlotsFor(selectedRarity);
  const usedSlots = selectedInstance?.affixes.length ?? 0;
  const selectedItemBadge = selectedItemDef ? itemTypeBadge(selectedItemDef) : null;
  const previewTarget = selectedInstance ?? selectedItemDef;

  const previewEntry = selectedRuneId ? runeSlots.find((r) => r.itemId === selectedRuneId) ?? null : null;
  const previewRuneId = previewEntry?.itemId ?? null;
  const previewRA = previewRuneId ? runeAffix(content, previewRuneId) : null;
  const previewAffixDef: AffixDef | null =
    previewRA && content.affixes ? (content.affixes[previewRA.affixId] ?? null) : null;
  const previewCost = previewRA && selectedItemDef
    ? enchantGoldCost(previewRA.tier, selectedRarity) : null;

  // Kanonische Vorschau aus der Engine (Rarity-Slot-Cap · Klassen-Gate · Typ · Köcher · Doppeleffekt).
  const enchantPreviewResult: EnchantPreview | null =
    previewTarget && previewRuneId ? enchantPreview(content, previewTarget, previewRuneId) : null;
  const previewRows = enchantPreviewResult ? buildPreviewRows(enchantPreviewResult, t, tr) : [];
  // claude:2026-10-25T14:12:00+01:00 — Aktuelle Werte ohne Rune: dieselbe Engine-Vorschau ohne Kandidat (kein Runen-
  // Item → before == after), damit die Tafel schon vor der Runenwahl zeigt, was das Item heute kann.
  const currentRows = previewTarget && !enchantPreviewResult
    ? buildPreviewRows(enchantPreview(content, previewTarget, ""), t, tr) : [];

  // K3: Hinweis (kein Verbot), wenn der neue Spezialeffekt schon von einem ANDEREN ausgerüsteten Teil kommt.
  let duplicateEffect = false;
  if (enchantPreviewResult && enchantPreviewResult.addedProcs.length > 0) {
    const ownSlot = selectedRef?.kind === "equipment" ? selectedRef.slot : null;
    const others = ownSlot
      ? { ...state, character: { ...state.character, equipment: { ...state.character.equipment, [ownSlot]: null } } }
      : state;
    const fxOther = collectSpecialEffects(others, content);
    duplicateEffect = enchantPreviewResult.addedProcs.some(
      (e) => !isStatusEffectType(e.type) && !["healOnKill", "wardOnKill", "cooldownOnKill"].includes(e.type) && !!fxOther[e.type],
    );
  }

  const goldShort = previewCost !== null && state.character.gold < previewCost;
  const canEnchant =
    selectedRef !== null && previewRuneId !== null && previewCost !== null &&
    !!enchantPreviewResult?.canApply && !goldShort;
  const slotsFull = !!selectedItemDef && usedSlots >= maxSlots;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleEnchant(): void {
    if (!selectedRef || !previewRuneId) return;
    const runeId = previewRuneId;
    const r = applyEnchant(state, content, selectedRef, runeId);
    if (r.ok) {
      setFeedback(t("enchant.feedback.enchanted"));
      setFeedbackOk(true);
      setSelectedRuneId(null);
      flashSeq.current += 1;
      setFlash({ seq: flashSeq.current, socket: (r.instance?.affixes.length ?? 1) - 1, runeId });
      // Sweep-Fund T7: ein plain Inventar-Item wird beim Verzaubern zur Instanz — die Auswahl folgt ihr.
      if (r.instance && selectedRef.kind !== "equipment") {
        setSelectedRef({ kind: "inventory_instance", instanceId: r.instance.instanceId });
      }
    } else {
      setFeedback(enchantReasonLabel(r.reason ?? "not_found", t));
      setFeedbackOk(false);
    }
  }

  function handleDisenchant(affixIndex: number): void {
    if (!selectedRef) return;
    const baseId = selectedItemId;
    const r = disenchant(state, content, selectedRef, affixIndex);
    if (r.ok) {
      setFeedback(t("enchant.feedback.removed"));
      setFeedbackOk(true);
      setFlash(null);
      // claude:2026-10-25T14:12:00+01:00 — Letzte Verzauberung einer Varianten-Instanz entfernt: die Engine legt das
      // Grund-Item zurück ins Inventar. Die Auswahl folgt ihm, statt den Altar leer zu räumen.
      if (selectedRef.kind === "inventory_instance" && baseId
        && !state.inventory.instances.some((i) => i.instanceId === selectedRef.instanceId)) {
        const idx = state.inventory.slots.findIndex((s) => s?.itemId === baseId);
        setSelectedRef(idx >= 0 ? { kind: "inventory", index: idx } : null);
      }
    } else {
      setFeedback(enchantReasonLabel(r.reason ?? "not_found", t));
      setFeedbackOk(false);
    }
  }

  function selectRef(ref: ItemRef): void {
    setSelectedRef(ref);
    setFeedback(null);
    setFeedbackOk(false);
    setFlash(null);
  }
  function selectRune(runeId: string): void {
    setSelectedRuneId(selectedRuneId === runeId ? null : runeId);
    setFeedback(null);
    setFeedbackOk(false);
  }

  const hasItems = entries.length > 0;
  const hasRunes = runeSlots.length > 0;

  // Grimoire: jede besessene Rune einmal, mit Passung gegen das Altar-Item (Engine-Vorschau).
  interface RuneRow {
    itemId: string;
    qty: number;
    imLager: number;
    affixDef: AffixDef | null;
    tier: number | null;
    category: RuneCategory;
    compatible: boolean | null;
    why: string;
  }
  const runeRows: RuneRow[] = runeSlots.map(({ itemId, qty, imLager }) => {
    const ra = runeAffix(content, itemId);
    const affixDef = ra && content.affixes ? (content.affixes[ra.affixId] ?? null) : null;
    const category: RuneCategory = affixDef ? runeCategory(affixDef) : "other";
    // claude:2026-10-25T14:12:00+01:00 — Passung über dieselbe Engine-Vorschau wie der Knopf (Typ, Klasse, Köcher,
    // Doppeleffekt). Ein voller Altar macht keine Rune „unpassend“, das sagt der Sockel-Hinweis.
    let compatible: boolean | null = null;
    let why = "";
    if (previewTarget) {
      const pv = enchantPreview(content, previewTarget, itemId);
      compatible = pv.canApply || pv.blockedReason === "slot_full";
      if (!compatible) {
        why = pv.blockedReason === "duplicate_effect"
          ? t("enchant.rune.alreadyOn")
          : runeMismatchHint(affixDef, ra?.tier ?? null, selectedItemDef, category, t);
      }
    }
    return { itemId, qty, imLager, affixDef, tier: ra?.tier ?? null, category, compatible, why };
  });
  const fittingCount = runeRows.filter((r) => r.compatible === true).length;
  const shownRuneRows = runeRows
    .filter((r) => !(onlyFitting && previewTarget && r.compatible === false))
    // passende zuerst, sonst Bestandsreihenfolge (stabil)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => Number(a.r.compatible === false) - Number(b.r.compatible === false) || a.i - b.i)
    .map(({ r }) => r);

  // claude:2026-10-25T14:22:00+01:00 — Abschnitte mit passenden Runen für das Altar-Item stehen oben (sonst
  // stünden bei einer Rüstung zuerst zwölf ausgegraute Waffenrunen vor den drei passenden).
  const runeSections = ([
    ["weapon", "enchant.weaponRunes"],
    ["armor", "enchant.armorRunes"],
    ["other", "enchant.otherRunes"],
  ] as Array<[RuneCategory, string]>)
    .map((sec, i) => ({ sec, i, fit: runeRows.some((r) => r.category === sec[0] && r.compatible === true) }))
    .sort((a, b) => Number(b.fit) - Number(a.fit) || a.i - b.i)
    .map(({ sec }) => sec);

  function renderRuneSection(category: RuneCategory, titleKey: string): JSX.Element | null {
    const rows = shownRuneRows.filter((r) => r.category === category);
    if (rows.length === 0) return null;
    return (
      <div className="ench-rune-section">
        <div className={`ench-rune-section-head ench-rune-section-head--${category}`}>
          <span className="ench-rune-section-title">{t(titleKey)}</span>
          <span className="ench-rune-section-count">{rows.length}</span>
          <span className="ench-rune-section-line" aria-hidden="true" />
        </div>
        <div className="ench-rune-card-list">
          {rows.map((row) => {
            const itemDef = content.items[row.itemId];
            const name = itemDef ? tr(itemDef.name) : row.affixDef ? tr(row.affixDef.prefix) : row.itemId;
            const effectLine = row.affixDef && row.tier !== null
              ? affixLines(row.affixDef, row.tier, t, tr).join(", ") : "";
            return (
              <RuneCard
                key={row.itemId}
                itemId={row.itemId}
                qty={row.qty}
                storedQty={row.imLager}
                name={name}
                tier={row.tier}
                effectLine={effectLine}
                category={row.category}
                selected={selectedRuneId === row.itemId}
                compatible={row.compatible}
                mismatchHint={row.why}
                // Das echte Ziel statt der groben Kategorie: "Stoffrüstung" sagt mehr als "Rüstung".
                badgeLabel={row.affixDef && row.tier !== null
                  ? runeTargetLabel(row.affixDef, row.tier, t)
                  : t(`enchant.runeBadge.${row.category}`)}
                onClick={() => selectRune(row.itemId)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  function renderItemGroup(group: ItemGroup, labelKey: string): JSX.Element | null {
    const rows = visibleEntries.filter((e) => e.group === group);
    if (rows.length === 0) return null;
    return (
      <>
        <div className="ench-section-label">{t(labelKey)}</div>
        {rows.map((e) => {
          const isSel = sameRef(selectedRef, e.ref);
          return (
            <div
              key={e.key}
              className={`ench-item-row${isSel ? " selected" : ""}`}
              onClick={() => selectRef(e.ref)}
              role="button"
              tabIndex={0}
              aria-pressed={isSel}
              onKeyDown={(ev) => ev.key === "Enter" && selectRef(e.ref)}
            >
              <ItemCell itemId={e.itemId} className="shop-cell" instance={e.instance} />
              <span className="ench-item-text">
                <span className={`ench-item-name ${rarityClass(e.rarity)}`}>{e.label}</span>
                <span className="ench-item-subrow">
                  <span className="ench-item-sub">{e.sub}</span>
                  <span className="ench-item-pips" title={t("enchant.slots").replace("{used}", String(e.used)).replace("{max}", String(e.max))}>
                    {Array.from({ length: e.max }, (_, i) => (
                      <span key={i} className={`ench-slot-pip${i < e.used ? " filled" : ""}`} />
                    ))}
                  </span>
                </span>
              </span>
            </div>
          );
        })}
      </>
    );
  }

  const altarArt = getSkillBackground("runecrafting");
  const candidateGhost = enchantPreviewResult?.canApply ? previewRuneId : null;
  const itemFilters: Array<{ id: "all" | RuneCategory; label: string }> = [
    { id: "all", label: t("inv.filter.all") },
    { id: "weapon", label: t("inv.filter.weapons") },
    { id: "armor", label: t("inv.filter.armor") },
    { id: "other", label: t("enchant.itemType.jewelry") },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ench-page">
      {/* ═══ 1 · Item wählen ═══ */}
      <section className="ench-panel ench-items ds-frame" aria-label={t("enchant.selectItem")}>
        <div className="shop-section-head" title={t("enchant.suffixHint")}>
          <span className="ench-step" aria-hidden="true">1</span>
          <span className="shop-section-title">{t("enchant.selectItem")}</span>
          <span className="shop-section-line" aria-hidden="true" />
        </div>
        {hasItems && (
          <div className="ench-item-tools">
            <ItemFilterSearch search={itemSearch} onSearchChange={setItemSearch} className="ench-item-search" />
            <div className="invf-chiprow ench-item-chips">
              {itemFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`invf-chip${itemFilter === f.id ? " active" : ""}`}
                  onClick={() => setItemFilter(f.id)}
                >
                  <span className="invf-chip-label">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {!hasItems ? (
          <p className="muted">{t("enchant.noItems")}</p>
        ) : visibleEntries.length === 0 ? (
          <p className="muted">{t("enchant.items.noMatch")}</p>
        ) : (
          <div className="ench-select-list">
            {renderItemGroup("equipped", "enchant.equipped")}
            {renderItemGroup("inventory", "enchant.inventory")}
            {renderItemGroup("variants", "enchant.variants")}
          </div>
        )}
      </section>

      <div className="ench-main" ref={mainRef}>
        {/* ═══ 2 · Der Altar ═══ */}
        <section ref={stageRef} className={`ench-panel ench-stage ds-frame${flash ? " is-flashing" : ""}${stageFloats ? " is-floating" : ""}`}>
          {altarArt && (
            <div className="ench-stage-art" style={{ backgroundImage: `url("${altarArt}")` }} aria-hidden="true" />
          )}
          {!selectedItemDef ? (
            <div className="ench-stage-empty">
              <div className="ench-pedestal ench-pedestal--empty" aria-hidden="true">
                <img src={iconEnchantRune} alt="" className="ench-pedestal-rune" />
              </div>
              <p className="ench-stage-empty-title">{t("enchant.altar.empty")}</p>
              <ol className="ench-steps">
                <li><span className="ench-step">1</span>{t("enchant.selectItem")}</li>
                <li><span className="ench-step">2</span>{t("enchant.selectRune")}</li>
                <li><span className="ench-step">3</span>{t("enchant.doEnchant")}</li>
              </ol>
              <p className="ench-stage-note">{t("enchant.suffixHint")}</p>
            </div>
          ) : (
            <div className="ench-stage-grid">
              {/* Das Item auf dem Altar mit seinen Verzauberungsplätzen */}
              <div className="ench-altar">
                <div className="ench-pedestal">
                  {flash && <span key={flash.seq} className="ench-flash-ring" aria-hidden="true" />}
                  <ItemCell itemId={selectedItemId!} className="ench-altar-cell" instance={selectedInstance ?? undefined} />
                </div>
                <span className={`ench-altar-name ${rarityClass(selectedItemDef.rarity)}`}>
                  {selectedInstance && (selectedInstance.affixes.length > 0 || selectedInstance.suffix)
                    ? instanceDisplayName(selectedInstance, content, locale)
                    : tr(selectedItemDef.name)}
                </span>
                <div className="ench-altar-meta">
                  {selectedItemBadge && (
                    <span className={`ench-altar-badge ench-altar-badge--${selectedItemBadge.tone}`}>
                      {t(selectedItemBadge.labelKey)}
                    </span>
                  )}
                  <span className="ench-altar-slots-label">
                    {t("enchant.slots").replace("{used}", String(usedSlots)).replace("{max}", String(maxSlots))}
                  </span>
                </div>

                <div className="ench-sockets">
                  {Array.from({ length: maxSlots }, (_, i) => {
                    const a = selectedInstance?.affixes[i];
                    if (!a) {
                      const ghost = candidateGhost && i === usedSlots ? candidateGhost : null;
                      return (
                        <div key={i} className={`ench-socket ench-socket--free${ghost ? " is-candidate" : ""}`}>
                          <span className="ench-socket-ring">
                            {ghost ? <RuneGlyph runeId={ghost} tier={previewRA?.tier ?? null} /> : <span className="ench-socket-dot" />}
                          </span>
                          <span className="ench-socket-name">{t("enchant.socket.free")}</span>
                        </div>
                      );
                    }
                    const affDef = content.affixes?.[a.affixId];
                    const runeId = runeItemFor(a.affixId, a.tier);
                    const runeDef = runeId ? content.items[runeId] : null;
                    const name = runeDef ? tr(runeDef.name) : affDef ? `${tr(affDef.prefix)} ${roman(a.tier)}` : a.affixId;
                    const remCost = disenchantGoldCost(a.tier, selectedRarity);
                    const bonuses = affDef ? affixLines(affDef, a.tier, t, tr) : [];
                    const isNew = flash?.socket === i;
                    return (
                      <div key={`${i}-${a.affixId}`} className={`ench-socket ench-socket--filled${isNew ? " is-new" : ""}`}>
                        <span className="ench-socket-ring">
                          <RuneGlyph runeId={runeId} tier={a.tier} />
                        </span>
                        <span className="ench-socket-name">{name}</span>
                        {bonuses.length > 0 && <span className="ench-socket-effect">{bonuses.join(", ")}</span>}
                        <button
                          type="button"
                          className="shop-citadel-btn shop-citadel-btn--sm ench-disenchant-btn"
                          disabled={state.character.gold < remCost}
                          title={state.character.gold < remCost ? t("enchant.reason.not_enough_gold") : t("enchant.removeNote")}
                          onClick={() => handleDisenchant(i)}
                        >
                          {t("enchant.disenchant").replace("{gold}", String(remCost))}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {usedSlots > 0 && <p className="ench-stage-note">{t("enchant.removeNote")}</p>}
                {flash && (
                  <span key={`t${flash.seq}`} className="ench-flash-text" aria-live="polite">
                    {t("enchant.flash").replace("{rune}", content.items[flash.runeId] ? tr(content.items[flash.runeId]!.name) : flash.runeId)}
                  </span>
                )}
              </div>

              {/* Vorher → Nachher, Kosten, Verzaubern */}
              <div className="ench-tablet">
                {feedback && (
                  <div className={`ench-feedback ${feedbackOk ? "success" : "danger"}`}>{feedback}</div>
                )}
                {previewAffixDef && previewRA && previewCost !== null && enchantPreviewResult ? (
                  <>
                    <div className="ench-tablet-head">
                      <RuneGlyph runeId={previewRuneId} tier={previewRA.tier} className="ench-glyph--head" />
                      <span className="ench-tablet-title">
                        <span className="ench-tablet-kicker">{t("enchant.preview")}</span>
                        <span className="ench-candidate-name">
                          {previewRuneId && content.items[previewRuneId] ? tr(content.items[previewRuneId]!.name) : tr(previewAffixDef.prefix)}
                        </span>
                      </span>
                    </div>
                    {previewRows.length > 0 && (
                      <div className="ench-statblock">
                        <div className="ench-statblock-head">
                          <span />
                          <span>{t("enchant.preview.before")}</span>
                          <span />
                          <span>{t("enchant.preview.after")}</span>
                        </div>
                        {previewRows.map((row) => (
                          <div key={row.key} className={`ench-stat-row${row.changed ? " changed" : ""}`}>
                            <span className="ench-stat-label">{row.label}</span>
                            <span className="ench-stat-before">{formatPreviewValue(row.key, row.before)}</span>
                            <span className="ench-stat-arrow" aria-hidden="true">→</span>
                            <span className="ench-stat-after">{formatPreviewValue(row.key, row.after)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {enchantPreviewResult.addedProcs.length > 0 && (
                      <div className="ench-newfx">
                        <span className="ench-newfx-label">{t("enchant.preview.newEffect")}</span>
                        {enchantPreviewResult.addedProcs.map((e, i) => (
                          <div key={i} className="ench-newfx-line">{weaponEffectProse(e, t)}</div>
                        ))}
                      </div>
                    )}
                    {duplicateEffect && <div className="ench-hint">{t("enchant.preview.duplicateEffect")}</div>}
                    {!enchantPreviewResult.canApply && enchantPreviewResult.blockedReason && (
                      <div className="ench-feedback danger">
                        {t(`enchant.preview.blocked.${enchantPreviewResult.blockedReason}`)}
                      </div>
                    )}
                    {enchantPreviewResult.canApply && goldShort && (
                      <div className="ench-feedback danger">{t("enchant.reason.not_enough_gold")}</div>
                    )}
                    <div className="ench-tablet-foot">
                      <span className={`ench-cost${goldShort ? " is-short" : ""}`}>
                        {t("enchant.cost").replace("{gold}", String(previewCost))}
                      </span>
                      <button
                        type="button"
                        className={`btn-iron ench-btn${canEnchant ? " ready" : ""}`}
                        disabled={!canEnchant}
                        onClick={handleEnchant}
                      >
                        {t("enchant.doEnchant")}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="ench-tablet-head">
                      <span className="ench-tablet-title">
                        <span className="ench-tablet-kicker">{t("enchant.values")}</span>
                      </span>
                    </div>
                    {currentRows.length > 0 ? (
                      <div className="ench-statblock ench-statblock--current">
                        {currentRows.map((row) => (
                          <div key={row.key} className="ench-stat-row">
                            <span className="ench-stat-label">{row.label}</span>
                            <span className="ench-stat-after">{formatPreviewValue(row.key, row.after)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="muted">{t("enchant.noAffixes")}</p>
                    )}
                    <p className="ench-pick-hint">
                      {slotsFull ? t("enchant.reason.no_affix_slots") : t("enchant.pickRuneHint")}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ═══ 3 · Runen-Grimoire ═══ */}
        <section className="ench-panel ench-grimoire ds-frame" aria-label={t("enchant.selectRune")}>
          <div className="shop-section-head">
            <span className="ench-step" aria-hidden="true">2</span>
            <span className="shop-section-title">{t("enchant.selectRune")}</span>
            <span className="shop-section-line" aria-hidden="true" />
            {hasRunes && previewTarget && (
              <button
                type="button"
                className={`invf-chip ench-fit-chip${onlyFitting ? " active" : ""}`}
                onClick={() => setOnlyFitting(!onlyFitting)}
                aria-pressed={onlyFitting}
              >
                <span className="invf-chip-label">{t("enchant.runes.onlyFitting")}</span>
                <span className="invf-chip-count">{fittingCount}</span>
              </button>
            )}
          </div>
          {!hasRunes ? (
            <p className="muted ench-empty-hint">{t("enchant.noRunes")}</p>
          ) : (
            <div className="ench-rune-groups">
              {runeSections.map(([cat, key]) => <div key={cat} className="ench-rune-section-slot">{renderRuneSection(cat, key)}</div>)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
