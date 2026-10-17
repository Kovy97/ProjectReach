import { useState } from "react";
import { content } from "@hearthforge/content";
import { applyEnchant, collectSpecialEffects, disenchant, enchantPreview, trinityGatePasses } from "@hearthforge/engine";
import type { EnchantPreview, ItemStatView } from "@hearthforge/engine";
import type {
  AffixDef,
  AttributeId,
  EquipBonus,
  EquipSlot,
  ItemDef,
  ItemInstance,
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
import { affixEffectParts, fmtBonus } from "../components/ItemTooltip";
import { rarityClass } from "../items";
import { runeFitsHint, runeTargetLabel } from "../runeTargets";
import { formatSeconds1 } from "../util/format";
import { weaponEffectProse } from "../util/weaponEffectProse";
import "../styles/enchanting.css";

// ── Task #275: Enchanting-Altar-Rework ──────────────────────────────────────
// Der Chef fand die alte Tab-Seite (Bench/Vault/Salvage) "viel zu unspektakulär".
// Salvage + der redundante Instanz-Vault (BankPage deckt Instanz-Verwaltung
// längst über bank.ts ab) sind komplett raus — bleibt EIN einziger, dramatischer
// Altar-Screen: LINKS Item-Wahl, MITTE der Verzauberungs-Altar (Item groß im
// Fokus + aktuelle Verzauberungen + Vorschau/Anwenden), RECHTS das Runen-
// Grimoire. Alle Engine-Calls (applyEnchant/disenchant/enchantPreview) und die
// bestehende Waffen-/Rüstungs-Runen-Trennung + Kompatibilitäts-Logik bleiben
// 1:1 erhalten — nur Layout/Optik sind neu.

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Zeilen für Vorschau/Affix-Liste: flache Boni + Attribut-Mods + Waffeneffekt-Proc (Feuer/Frost/
 * Sturm etc.), damit `affix_flame/frost/shock` hier nicht nur ihren winzigen Flat-Bonus zeigen und
 * den eigentlichen Kaufgrund (den Proc) verschweigen — nutzt dieselbe Quelle wie der Item-Tooltip.
 * Nutzt die Teile direkt (statt den gejointen Summary-String am " · " zu re-splitten), da der
 * Proc-Eintrag ("15% Brand · 4/s") selbst ein inneres " · " enthält und sonst auf zwei Zeilen
 * zerrissen würde.
 */
function affixLines(
  def: AffixDef,
  tier: number,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): string[] {
  return affixEffectParts(def, tier, t, tr).filter(Boolean);
}

/** Stabile Reason-Codes, die die Engine (perspektivisch) direkt liefert — siehe `enchant.reason.*`. */
const ENCHANT_REASON_CODES = new Set([
  "not_enough_gold",
  "affix_mismatch",
  // Trinity-Klassen-Gate (§6.2, applyEnchant): fehlte hier bisher — die Engine kann diesen Reason
  // schon länger liefern, das Feedback-Banner fiel dann durch LEGACY_REASON_MAP durch und leakte
  // den rohen Code "class_mismatch" (kein Legacy-Prosa-Match). Gefixt im Zuge von #219.
  "class_mismatch",
  // Aktiv-Effekt-Runen (Flamme/Frost/Schock) bleiben einmalig, waehrend Stat-Runen stapeln
  // duerfen (Chef-Nachentscheid 25.08.2026) — s. `affixHasActiveEffect` in engine/enchant.ts.
  "duplicate_effect",
  "no_affix_slots",
  "no_affix",
  "not_enchantable",
  "not_found",
]);

// ── Enchant-Preview-Panel (#219): Vorher/Nachher-Item-Stat-Block ────────────────

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
/** attackIntervalMs: NIEDRIGER ist besser (schnellerer Angriff) — hier nur für die Formatierung
 *  relevant (Vorzeichen), die Besser/Schlechter-Färbung nutzt EnchantingPage bewusst nicht (die
 *  Delta-Hervorhebung reicht: gold = geändert, s.u.). */

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
 * `before` ODER `after` einen Wert ≠ 0 trägt (oder in `changedKeys` steht, z.B. ein Stat, der
 * durch die Rune auf 0 fällt — Rand­fall bei einem künftigen Override-Slot), wird eine Zeile.
 * Reine Anzeige-Ableitung, mutiert nichts — `enchantPreview` selbst ist bereits rein/deterministisch.
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
 * Legacy-Fallback: solange `enchant.ts` noch hartkodierte deutsche Prosa statt Reason-Codes liefert,
 * auf denselben i18n-Key mappen — sonst leakt rohes Deutsch ins EN-Locale (Sweep2 F2). Sobald die
 * Engine auf Codes umgestellt ist, greift der erste Zweig in `enchantReasonLabel` direkt.
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

// ── Runen-Tisch-Redesign: Waffen-/Rüstungs-Split fürs Grimoire ─────────────────
//
// Der Chef will die besessenen Runen im Grimoire klar in „Waffen-Runen" (aggressiv, warm) und
// „Rüstungs-Runen" (defensiv, kühl) getrennt sehen, plus eine kleine Restgruppe für Runen, die
// weder eindeutig Waffe noch Rüstung sind (aktuell keine im Content, aber `appliesTo` erlaubt z.B.
// reine Schmuck-Runen oder ein leeres/fehlendes `appliesTo` = überall). `runeCategory` liest NUR
// die grobe Typ-Familie aus `appliesTo` — das feinere Trinity-Klassen-Gate (Schutz nur auf Platte
// etc.) bleibt exklusiv bei `enchantPreview`/`applyEnchant`, hier geht's nur ums Grimoire-Layout.

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
 * Passt diese Rune auf das gewählte Ziel? Spiegelt die Prüfkette von `applyEnchant` — erst der
 * Tag-Filter (`appliesTo`), dann das Trinity-Klassen-Gate (§6.2).
 *
 * Spieler-Report 1.0.2: bis hierher prüfte die Karte NUR den Tag. Eine Ward-Rune auf einer
 * Platte sah damit anwendbar aus und scheiterte erst beim Klick mit "class_mismatch" — der
 * Spieler bekam den Grund also erst NACH dem Fehlversuch, und auch nur als Bannertext.
 */
function runePasst(def: AffixDef, tier: number, ziel: ItemDef): boolean {
  return affixAppliesToItem(def.appliesTo, ziel) && trinityGatePasses(def, tier, ziel);
}

/**
 * Warum passt sie nicht? Der Satz landet im Hover-Text der abgeblendeten Karte. Scheitert es am
 * Trinity-Gate, ist die Rüstungsklasse der eigentliche Grund und gehört genannt — "nur für
 * Rüstung" wäre dort schlicht falsch, das Teil IST ja Rüstung.
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
    if (hint) return hint; // Trinity-Gate: die Klasse ist der Grund, nicht der Item-Typ
  }
  if (category === "weapon") return t("enchant.onlyWeapons");
  if (category === "armor") return t("enchant.onlyArmor");
  return t("enchant.reason.affix_mismatch");
}

/** Item-Typ-Badge fürs Altar (Mitte): Waffenstil bzw. Rüstung/Schild/Schmuck — dieselbe
 *  Ton-Familie (weapon=warm/rot, armor=kühl/blau, other=neutral) wie das Grimoire, damit auf einen
 *  Blick klar ist, welche Runen-Sektion zum aktuellen Ziel passt. */
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

// ── File-level subcomponents (stable references — no remount issues) ─────────

interface SelectRowProps {
  label: string;
  sub?: string;
  selected: boolean;
  onClick: () => void;
  itemId: string;
  instance?: ItemInstance;
}

function SelectRow({ label, sub, selected, onClick, itemId, instance }: SelectRowProps): JSX.Element {
  return (
    <div
      className={`ench-item-row${selected ? " selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
    >
      <ItemCell itemId={itemId} className="shop-cell" instance={instance} />
      <span className="ench-item-text">
        <span className="ench-item-name">{label}</span>
        {sub && <span className="ench-item-sub">{sub}</span>}
      </span>
    </div>
  );
}

interface RuneCardProps {
  itemId: string;
  qty: number;
  name: string;
  tier: number | null;
  effectLine: string;
  category: RuneCategory;
  selected: boolean;
  /** null = kein Ziel gewählt (neutral) · true/false = passt/passt-nicht-zum-Ziel (affixAppliesToItem). */
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
      className={`ench-rune-card ench-rune-card--${category}${selected ? " selected" : ""}${incompatible ? " incompatible" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      title={incompatible ? mismatchHint : undefined}
    >
      <ItemCell itemId={itemId} className="shop-cell ench-rune-cell" />
      <div className="ench-rune-card-body">
        <div className="ench-rune-card-head">
          <span className="ench-rune-card-name">{name}</span>
          {tier !== null && <span className="ench-rune-card-tier muted">T{tier}</span>}
        </div>
        {effectLine && <div className="ench-rune-card-effect muted">{effectLine}</div>}
        <div className="ench-rune-card-foot">
          <span className={`ench-rune-badge ench-rune-badge--${category}`}>{badgeLabel}</span>
          <span className="ench-rune-card-qty muted">
            ×{qty}
            {storedQty > 0 && (
              <span className="ench-rune-card-stored">
                {t("enchant.rune.stored").replace("{n}", String(storedQty))}
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EnchantingPage(): JSX.Element {
  const state = useGameState();
  const { t, tr, locale } = useI18n();
  const [selectedRef, setSelectedRef] = useState<ItemRef | null>(null);
  const [selectedRuneListIdx, setSelectedRuneListIdx] = useState<number | null>(null);
  // Shared enchant/disenchant feedback banner — `feedbackOk` picks the danger/success styling
  // (F4: manuelles Enchanten/Entzaubern gab bisher gar keine positive Rückmeldung).
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);

  // ── Derived ───────────────────────────────────────────────────────────────

  // Runenbestand über die ITEM-ID statt über Inventar-Slots (Spieler-Report 1.0.2: "Allow
  // Enchantment Runes to be applied from Storage"). `applyEnchant` nimmt die Rune inzwischen aus
  // Inventar ODER Lager — das Grimoire zeigte aber weiter nur die Tasche, eine eingelagerte Rune
  // war also anwendbar, aber unsichtbar. Jede Sorte erscheint jetzt EINMAL mit der Gesamtmenge.
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

  // Plain, stapelbare Equipment-Items im Slot-Gitter → per applyEnchant zur Instanz promotbar.
  const invEquipSlots = state.inventory.slots
    .map((slot, idx) => ({ slot, idx }))
    .filter(({ slot }) => slot != null && content.items[slot.itemId]?.type === "equipment");

  // Bereits verzauberte/gesuffixte Instanzen aus der Varianten-Tasche (v53) → per instanceId adressiert.
  const invInstances = state.inventory.instances;

  const equippedSlots = (Object.keys(state.character.equipment) as EquipSlot[]).filter(
    (slot) => state.character.equipment[slot] != null,
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

  const selectedItemDef = selectedItemId ? content.items[selectedItemId] : null;
  const selectedRarity = selectedItemDef ? getItemRarity(selectedItemDef) : "common";
  const maxSlots = enchantSlotsFor(selectedRarity);
  const usedSlots = selectedInstance?.affixes.length ?? 0;
  // Altar-Badge: Waffenstil bzw. Rüstung/Schild/Schmuck, dieselbe Ton-Familie wie das Grimoire
  // rechts — macht sofort klar, welche Rune-Sektion zum Ziel passt.
  const selectedItemBadge = selectedItemDef ? itemTypeBadge(selectedItemDef) : null;

  const previewEntry = selectedRuneListIdx !== null ? (runeSlots[selectedRuneListIdx] ?? null) : null;
  const previewRuneId = previewEntry?.itemId ?? null;
  const previewRA = previewRuneId ? runeAffix(content, previewRuneId) : null;
  const previewAffixDef: AffixDef | null =
    previewRA && content.affixes ? (content.affixes[previewRA.affixId] ?? null) : null;
  const previewCost = previewRA && selectedItemDef
    ? enchantGoldCost(previewRA.tier, selectedRarity) : null;
  const previewBonusLines = previewAffixDef && previewRA
    ? affixLines(previewAffixDef, previewRA.tier, t, tr) : [];

  // Enchant-Preview-Panel (#219): der kanonische Vorschau-Helfer aus der Engine — ersetzt die
  // frühere handgerollte `affixMismatch`-Prüfung (die den Trinity-Klassen-Gate-Fall §6.2 GAR NICHT
  // kannte: ein Ward-Rune-Klick auf Platte war bisher bis zum echten `applyEnchant`-Aufruf aktiv,
  // scheiterte dann erst mit "class_mismatch"). `canApply`/`blockedReason` decken jetzt Rarity-
  // Slot-Cap · Klassen-Gate · Typ-Match in EINER Quelle ab (dieselbe Reihenfolge wie applyEnchant).
  const previewTarget = selectedInstance ?? selectedItemDef;
  const enchantPreviewResult: EnchantPreview | null =
    previewTarget && previewRuneId ? enchantPreview(content, previewTarget, previewRuneId) : null;
  const previewRows = enchantPreviewResult ? buildPreviewRows(enchantPreviewResult, t, tr) : [];

  // claude:2026-10-17T20:00:00+02:00 — K3: Hinweis (kein Verbot), wenn der neue Spezialeffekt schon von einem ANDEREN
  // ausgerüsteten Teil kommt; Kill-Flats summieren sich und bleiben ohne Warnung. Das gewählte Teil wird ausgeblendet.
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

  const canEnchant =
    selectedRef !== null && previewRuneId !== null && previewCost !== null &&
    !!enchantPreviewResult?.canApply && state.character.gold >= previewCost;

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleEnchant(): void {
    if (!selectedRef || !previewRuneId) return;
    const r = applyEnchant(state, content, selectedRef, previewRuneId);
    if (r.ok) {
      setFeedback(t("enchant.feedback.enchanted"));
      setFeedbackOk(true);
      setSelectedRuneListIdx(null);
      // Sweep-Fund T7 (2026-07-11): beim Verzaubern eines PLAIN-Inventar-Items promotet
      // resolveOrPromote es zur Instanz und NULLT den Slot (Regelfall: Equipment qty 1) — der
      // alte inventory-Ref zeigte ins Leere und der Altar wurde nach dem Erfolgs-Banner leer.
      // Die Auswahl folgt jetzt der (neuen bzw. bestehenden) Instanz; equipment-Refs bleiben
      // unverändert gültig (der Slot besteht weiter, equippedInstances trägt die Instanz).
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
    const r = disenchant(state, content, selectedRef, affixIndex);
    if (r.ok) {
      setFeedback(t("enchant.feedback.removed"));
      setFeedbackOk(true);
    } else {
      setFeedback(enchantReasonLabel(r.reason ?? "not_found", t));
      setFeedbackOk(false);
    }
  }

  function selectRef(ref: ItemRef): void { setSelectedRef(ref); setFeedback(null); setFeedbackOk(false); }
  function selectRune(listIdx: number): void {
    setSelectedRuneListIdx(selectedRuneListIdx === listIdx ? null : listIdx);
    setFeedback(null);
    setFeedbackOk(false);
  }

  const hasItems = invEquipSlots.length > 0 || invInstances.length > 0 || equippedSlots.length > 0;
  const hasRunes = runeSlots.length > 0;

  // Grimoire-Gruppierung (Runen-Tisch-Redesign): jede besessene Rune einmal in Waffen-/Rüstungs-/
  // Sonstige-Kategorie einsortiert. `li` bleibt der Index INS ungefilterte `runeSlots`-Array (die
  // bestehende Auswahl-/Preview-Verdrahtung über `selectedRuneListIdx` adressiert genau darüber).
  interface RuneRow {
    li: number;
    itemId: string;
    qty: number;
    /** Wie viele davon im Lager liegen — für den kleinen Vermerk auf der Karte. */
    imLager: number;
    affixDef: AffixDef | null;
    tier: number | null;
    category: RuneCategory;
  }
  const runeRows: RuneRow[] = runeSlots.map(({ itemId, qty, imLager }, li) => {
    const ra = runeAffix(content, itemId);
    const affixDef = ra && content.affixes ? (content.affixes[ra.affixId] ?? null) : null;
    return {
      li,
      itemId,
      qty,
      imLager,
      affixDef,
      tier: ra?.tier ?? null,
      category: affixDef ? runeCategory(affixDef) : "other",
    } satisfies RuneRow;
  });
  const weaponRuneRows = runeRows.filter((r) => r.category === "weapon");
  const armorRuneRows = runeRows.filter((r) => r.category === "armor");
  const otherRuneRows = runeRows.filter((r) => r.category === "other");

  /** Rendert eine Grimoire-Sektion (Überschrift + Karten); `null`, wenn die Kategorie leer ist. */
  function renderRuneSection(rows: RuneRow[], titleKey: string, category: RuneCategory, icon: string): JSX.Element | null {
    if (rows.length === 0) return null;
    return (
      <div className="ench-rune-section">
        <div className={`ench-rune-section-head ench-rune-section-head--${category}`}>
          <span className="ench-rune-section-icon" aria-hidden="true">{icon}</span>
          <span className="ench-rune-section-title">{t(titleKey)}</span>
        </div>
        <div className="ench-rune-card-list">
          {rows.map((row) => {
            const itemDef = content.items[row.itemId];
            const name = row.affixDef ? tr(row.affixDef.prefix) : itemDef ? tr(itemDef.name) : row.itemId;
            const effectLine = row.affixDef && row.tier !== null
              ? affixLines(row.affixDef, row.tier, t, tr).join(", ") : "";
            // Kompatibilität nach DERSELBEN Kette wie applyEnchant (Tag + Trinity-Gate), damit
            // keine Rune anklickbar aussieht, die beim Klick abgewiesen würde.
            const compatible = selectedItemDef && row.affixDef && row.tier !== null
              ? runePasst(row.affixDef, row.tier, selectedItemDef) : null;
            return (
              <RuneCard
                key={row.li}
                itemId={row.itemId}
                qty={row.qty}
                storedQty={row.imLager}
                name={name}
                tier={row.tier}
                effectLine={effectLine}
                category={row.category}
                selected={selectedRuneListIdx === row.li}
                compatible={compatible}
                mismatchHint={runeMismatchHint(row.affixDef, row.tier, selectedItemDef ?? null, row.category, t)}
                // Das echte Ziel statt der groben Kategorie: "Stoffrüstung" sagt mehr als
                // "Rüstung", wenn die Rune nur auf Stoff haftet (Spieler-Report 1.0.2).
                badgeLabel={row.affixDef && row.tier !== null
                  ? runeTargetLabel(row.affixDef, row.tier, t)
                  : t(`enchant.runeBadge.${row.category}`)}
                onClick={() => selectRune(row.li)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="ench-page">
      <div className="ench-body ds-frame">
        {/* ═══ LEFT — Item-Wahl ═══ */}
        <div className="ench-col ench-col-target">
          <div className="shop-section-head">
            <span className="shop-section-orn" aria-hidden="true">◆</span>
            <span className="shop-section-title">{t("enchant.selectItem")}</span>
            <span className="shop-section-line" aria-hidden="true" />
          </div>
          {!hasItems ? (
            <p className="muted">{t("enchant.noItems")}</p>
          ) : (
            <div className="ench-select-list">
              {equippedSlots.length > 0 && (
                <>
                  <div className="ench-section-label muted">{t("enchant.equipped")}</div>
                  {equippedSlots.map((slot) => {
                    const id = state.character.equipment[slot]!;
                    const inst = state.character.equippedInstances[slot];
                    const ref: ItemRef = { kind: "equipment", slot };
                    const isel = selectedRef?.kind === "equipment" && selectedRef.slot === slot;
                    const def = content.items[id];
                    const label = inst && (inst.affixes.length > 0 || inst.suffix)
                      ? instanceDisplayName(inst, content, locale)
                      : def ? tr(def.name) : id;
                    return (
                      <SelectRow key={slot} itemId={id} instance={inst} label={label}
                        sub={tr(EQUIP_SLOT_LABELS[slot])} selected={isel}
                        onClick={() => selectRef(ref)} />
                    );
                  })}
                </>
              )}
              {invEquipSlots.length > 0 && (
                <>
                  <div className="ench-section-label muted">{t("enchant.inventory")}</div>
                  {invEquipSlots.map(({ slot, idx }) => {
                    if (!slot) return null;
                    const ref: ItemRef = { kind: "inventory", index: idx };
                    const isel = selectedRef?.kind === "inventory" && selectedRef.index === idx;
                    const def = content.items[slot.itemId];
                    const label = def ? tr(def.name) : slot.itemId;
                    return (
                      <SelectRow key={`plain-${idx}`} itemId={slot.itemId} label={label}
                        selected={isel} onClick={() => selectRef(ref)} />
                    );
                  })}
                </>
              )}
              {invInstances.length > 0 && (
                <>
                  <div className="ench-section-label muted">{t("enchant.variants")}</div>
                  {invInstances.map((inst) => {
                    const ref: ItemRef = { kind: "inventory_instance", instanceId: inst.instanceId };
                    const isel = selectedRef?.kind === "inventory_instance"
                      && selectedRef.instanceId === inst.instanceId;
                    const def = content.items[inst.baseItemId];
                    const label = inst.affixes.length > 0 || inst.suffix
                      ? instanceDisplayName(inst, content, locale)
                      : def ? tr(def.name) : inst.baseItemId;
                    return (
                      <SelectRow key={inst.instanceId} itemId={inst.baseItemId} instance={inst} label={label}
                        selected={isel} onClick={() => selectRef(ref)} />
                    );
                  })}
                </>
              )}
            </div>
          )}
          <p className="muted ench-suffix-hint">{t("enchant.suffixHint")}</p>
        </div>

        {/* ═══ CENTER — Der Altar: Item groß im Fokus + Verzauberungen + Vorschau ═══ */}
        <div className="ench-col ench-col-altar">
          {feedback && (
            <div className={`ench-feedback ${feedbackOk ? "success" : "danger"}`}>{feedback}</div>
          )}

          {!selectedItemDef ? (
            <div className="ench-altar-empty">
              <div className="ench-altar-socket ench-altar-socket--empty" aria-hidden="true">
                <span className="ench-altar-empty-glyph">✦</span>
              </div>
              <p className="muted">{t("enchant.altar.empty")}</p>
            </div>
          ) : (
            <div className="ench-altar">
              <div className="ench-altar-socket">
                <ItemCell itemId={selectedItemId!} className="ench-altar-cell"
                  instance={selectedInstance ?? undefined} />
              </div>

              <span className={`ench-altar-name ${rarityClass(selectedItemDef.rarity)}`}>
                {selectedInstance && (selectedInstance.affixes.length > 0 || selectedInstance.suffix)
                  ? instanceDisplayName(selectedInstance, content, locale)
                  : tr(selectedItemDef.name)}
              </span>
              {selectedItemBadge && (
                <span className={`ench-altar-badge ench-altar-badge--${selectedItemBadge.tone}`}>
                  {t(selectedItemBadge.labelKey)}
                </span>
              )}

              <div className="ench-altar-slots">
                <span className="muted ench-altar-slots-label">
                  {t("enchant.slots")
                    .replace("{used}", String(usedSlots))
                    .replace("{max}", String(maxSlots))}
                </span>
                <div className="ench-slot-pips" aria-hidden="true">
                  {Array.from({ length: maxSlots }, (_, i) => (
                    <span key={i} className={`ench-slot-pip${i < usedSlots ? " filled" : ""}`} />
                  ))}
                </div>
              </div>

              {/* Aktuelle Verzauberungen */}
              <div className="ench-current-affixes">
                {selectedInstance && selectedInstance.affixes.length > 0 ? (
                  <div className="ench-affix-list">
                    {selectedInstance.affixes.map((a, i) => {
                      const affDef2 = content.affixes?.[a.affixId];
                      const prefixName = affDef2 ? tr(affDef2.prefix) : a.affixId;
                      const baseDef = selectedItemId ? content.items[selectedItemId] : null;
                      const rar = baseDef ? getItemRarity(baseDef) : "common";
                      const remCost = disenchantGoldCost(a.tier, rar);
                      const bonuses = affDef2 ? affixLines(affDef2, a.tier, t, tr) : [];
                      return (
                        <div key={i} className="ench-affix-row">
                          <span className="ench-affix-gem" aria-hidden="true">✦</span>
                          <span className="ench-affix-name">{prefixName}</span>
                          <span className="ench-affix-tier muted">T{a.tier}</span>
                          {bonuses.length > 0 && (
                            <span className="ench-affix-bonus muted">{bonuses.join(", ")}</span>
                          )}
                          <button className="shop-citadel-btn shop-citadel-btn--sm ench-disenchant-btn"
                            disabled={state.character.gold < remCost}
                            onClick={() => handleDisenchant(i)}>
                            {t("enchant.disenchant").replace("{gold}", String(remCost))}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="muted ench-no-affixes">{t("enchant.noAffixes")}</p>
                )}
              </div>

              {/* Kandidat: die im Grimoire gewählte Rune × dieses Ziel */}
              <div className="ench-divider" aria-hidden="true">
                <span className="ench-divider-line" />
                <span className="ench-divider-label">{t("enchant.preview")}</span>
                <span className="ench-divider-line" />
              </div>

              {previewAffixDef && previewRA && previewCost !== null ? (
                <div className="ench-candidate">
                  <div className="ench-candidate-name">
                    ✦ {tr(previewAffixDef.prefix)}{" "}
                    <span className="muted">T{previewRA.tier}</span>
                  </div>
                  {previewBonusLines.length > 0 && (
                    <div className="ench-candidate-bonus">
                      {previewBonusLines.map((line, i) => (
                        <span key={i} className="ench-bonus-line">{line}</span>
                      ))}
                    </div>
                  )}

                  {/* Vorher/Nachher-Item-Stat-Block (#219): der volle Item-eigene Stat-Block mit und
                      ohne die Kandidat-Rune, geänderte Zeilen gold hervorgehoben — nutzt `enchantPreview`
                      1:1 (dieselben Aggregations-Regeln wie ein echtes `applyEnchant`). */}
                  {enchantPreviewResult && previewRows.length > 0 && (
                    <div className="ench-statblock">
                      <div className="ench-statblock-head">
                        <span />
                        <span>{t("enchant.preview.before")}</span>
                        <span />
                        <span>{t("enchant.preview.after")}</span>
                      </div>
                      {previewRows.map((row) => (
                        <div
                          key={row.key}
                          className={`ench-stat-row${row.changed ? " changed" : ""}`}
                        >
                          <span className="ench-stat-label">{row.label}</span>
                          <span className="ench-stat-before">{formatPreviewValue(row.key, row.before)}</span>
                          <span className="ench-stat-arrow" aria-hidden="true">→</span>
                          <span className="ench-stat-after">{formatPreviewValue(row.key, row.after)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* „Neuer Effekt"-Zeilen: Waffeneffekte/Procs, die NUR durch diese Rune hinzukommen. */}
                  {enchantPreviewResult && enchantPreviewResult.addedProcs.length > 0 && (
                    <div className="ench-newfx">
                      <span className="ench-newfx-label">{t("enchant.preview.newEffect")}</span>
                      {enchantPreviewResult.addedProcs.map((e, i) => (
                        <div key={i} className="ench-newfx-line">✦ {weaponEffectProse(e, t)}</div>
                      ))}
                    </div>
                  )}

                  {duplicateEffect && <div className="ench-cost muted">{t("enchant.preview.duplicateEffect")}</div>}

                  {/* Blockiert-Hinweis: WARUM der Enchant-Button unten deaktiviert ist (Rarity-Slot-Cap ·
                      Trinity-Klassen-Gate · Item-Typ-Mismatch) — eigene Vokabeln, s. `enchant.preview.blocked.*`. */}
                  {enchantPreviewResult && !enchantPreviewResult.canApply && enchantPreviewResult.blockedReason && (
                    <div className="ench-feedback danger">
                      {t(`enchant.preview.blocked.${enchantPreviewResult.blockedReason}`)}
                    </div>
                  )}

                  <div className="ench-cost muted">
                    {t("enchant.cost").replace("{gold}", String(previewCost))}
                  </div>
                  <button className={`shop-citadel-btn ench-btn${canEnchant ? " ready" : ""}`}
                    disabled={!canEnchant} onClick={handleEnchant}>
                    {t("enchant.doEnchant")}
                  </button>
                </div>
              ) : (
                <p className="muted ench-pick-hint">{t("enchant.pickRuneHint")}</p>
              )}
            </div>
          )}
        </div>

        {/* ═══ RIGHT — Runen-Grimoire: Waffen-Runen (warm) / Rüstungs-Runen (kühl) / Sonstige ═══ */}
        <div className="ench-col ench-col-grimoire">
          <div className="shop-section-head">
            <span className="shop-section-orn" aria-hidden="true">◆</span>
            <span className="shop-section-title">{t("enchant.selectRune")}</span>
            <span className="shop-section-line" aria-hidden="true" />
          </div>
          {!hasRunes ? (
            <p className="muted ench-empty-hint">{t("enchant.noRunes")}</p>
          ) : (
            <div className="ench-rune-groups">
              {renderRuneSection(weaponRuneRows, "enchant.weaponRunes", "weapon", "⚔")}
              {renderRuneSection(armorRuneRows, "enchant.armorRunes", "armor", "🛡")}
              {renderRuneSection(otherRuneRows, "enchant.otherRunes", "other", "✦")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
