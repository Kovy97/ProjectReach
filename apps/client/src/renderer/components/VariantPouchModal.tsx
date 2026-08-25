import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { content } from "@hearthforge/content";
import { meetsRequirements } from "@hearthforge/engine";
import type { GameState, ItemDef, ItemInstance } from "@hearthforge/shared";
import { EQUIP_SLOTS, enchantSlotsFor, getItemRarity, instanceDisplayName, RARITY_LABEL } from "@hearthforge/shared";
import { useGameStateMaybe } from "../game/GameContext";
import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { registerEscCloser } from "../util/escStack";
import { getItemImage, rarityClass } from "../items";
import { getUiIcon } from "../uiIcons";
import type { ItemAction } from "./ItemTooltip";
import { affixEffectParts, suffixEffectParts, useItemTooltip } from "./ItemTooltip";

const STAR_ICON_URL = getUiIcon("icon_suffix_star");
// icon_dice (Welle QQ) war ausschließlich der Reroll-Button-Icon-Konsument — Chef-Entscheid
// 2026-07-18 "Suffixe sollen nicht rerollbar sein" entfernt das Feature UI-seitig komplett.
// Datei bleibt als Reserve-Asset liegen (s. Memory "Reroll-Entfernung"), hier nur kein Verbraucher mehr.

/**
 * Kanonische Signatur einer Item-Instanz (Task #246 Phase C, Chef-Vorgabe): identische Varianten
 * (gleiche Basis + gleiche Affix-MENGE [affixId+tier] + gleicher Suffix [suffixId+roll]) teilen sich
 * dieselbe Signatur und werden im Pouch zu EINEM Eintrag gestapelt. Affixe werden vor dem Bauen des
 * Schlüssels kanonisch sortiert (affixId, dann tier) — sonst würden zwei Instanzen mit denselben zwei
 * Affixen in unterschiedlicher Array-Reihenfolge fälschlich als zwei verschiedene Stacks gezählt.
 * Reine Funktion (kein State/Content-Zugriff nötig) — leicht testbar, falls je ein Unit-Test kommt.
 */
export function sig(inst: ItemInstance): string {
  const affixPart = [...inst.affixes]
    .sort((a, b) => (a.affixId === b.affixId ? a.tier - b.tier : a.affixId.localeCompare(b.affixId)))
    .map((a) => `${a.affixId}:${a.tier}`)
    .join(",");
  const suffixPart = inst.suffix ? `${inst.suffix.suffixId}:${JSON.stringify(inst.suffix.roll)}` : "";
  return `${inst.baseItemId}|${affixPart}|${suffixPart}`;
}

/** Eine gestapelte Varianten-Gruppe innerhalb des Pouches: N Instanzen mit identischer Signatur. */
export interface VariantStack {
  key: string;
  /** Eine repräsentative Instanz des Stacks (alle N sind stat-identisch) — Aktionen wirken auf sie. */
  representative: ItemInstance;
  count: number;
}

/** Gruppiert eine flache Instanz-Liste nach `sig()`, Eingabereihenfolge je Gruppe erhalten. */
export function groupBySig(instances: ItemInstance[]): VariantStack[] {
  const map = new Map<string, VariantStack>();
  for (const inst of instances) {
    const key = sig(inst);
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { key, representative: inst, count: 1 });
  }
  return [...map.values()];
}

/**
 * Grobe „wie gut ist diese Version"-Rangfolge NUR für die Standard-Sortierung im Pouch (Chef:
 * „Sortierung — beste zuerst — nach Gesamt-Stat-Wert oder Wurfgüte"): Affix-Tiers zählen dominant
 * (jede Tier-Stufe ist strikt stärker, s. `AffixDef.bonusByTier`), der Suffix-Roll (0..1) bricht
 * Gleichstände fein auf. Bewusst KEINE echte Power-Formel (die bleibt `computeStats` vorbehalten,
 * analog `dualSlotWeight` in ItemTooltip.tsx) — nur eine plausible Rangfolge zwischen Varianten
 * DESSELBEN Basis-Items.
 */
function stackPower(inst: ItemInstance): number {
  const tierSum = inst.affixes.reduce((sum, a) => sum + a.tier, 0);
  const rollPct = inst.suffix ? inst.suffix.roll : 0;
  return tierSum * 1000 + rollPct * 100;
}

/**
 * 1.1.0 Redesign (Chef-Fund „Modal für die verzauberten Items liest sich zu beschissen"): statt
 * loser Stat-Chips zeigt jede Varianten-Zeile jetzt klar zurechenbare Zeilen je Verzauberung
 * (Rune-Symbol + Name + Tier + Effekt), die Slot-Belegung „n/m" (`enchantSlotsFor` — dieselbe
 * Quelle wie der Verzauberungstisch/ItemTooltip.tsx' `EnchantGroup`) und die Anforderungen
 * (`meetsRequirements`, dieselbe Quelle wie ItemTooltip.tsx' `RequirementsSection`). Layout: links
 * Bild+Name+Rarity (`.pouch-row-left`), rechts diese Detailspalte (`.pouch-row-right`), darunter die
 * Aktionsknöpfe (`.it-actions`/`.it-action-btn` — dieselbe app-weite 9-Slice-Knopf-Familie wie das
 * gepinnte ItemTooltip, Task #332).
 */
function PouchRowDetail({
  item,
  instance,
  state,
}: {
  item: ItemDef | undefined;
  instance?: ItemInstance;
  state: GameState | null;
}): JSX.Element | null {
  const { t, tr } = useI18n();
  const isVariant = !!instance && (instance.affixes.length > 0 || !!instance.suffix);
  const enchantSlots = item ? enchantSlotsFor(getItemRarity(item)) : 0;
  const affixCount = instance?.affixes.length ?? 0;
  const totalSlots = Math.max(enchantSlots, affixCount);
  const showEnchant = isVariant && instance && totalSlots > 0;
  const rollPct = instance?.suffix ? Math.round(instance.suffix.roll * 100) : null;
  const suffixDef = instance?.suffix ? content.suffixes?.[instance.suffix.suffixId] : undefined;
  const suffixParts = instance ? suffixEffectParts(instance, content, t, tr) : [];
  const reqEntries = item?.requirements ? Object.entries(item.requirements) : [];
  const reqOk = state && item ? meetsRequirements(state, item) : null;

  if (!showEnchant && reqEntries.length === 0) return null;

  return (
    <div className="pouch-row-right">
      {showEnchant && instance && (
        <>
          <div className="pouch-enchant-header">
            {t("itip.group.enchantment")} <span className="pouch-enchant-count">{affixCount}/{totalSlots}</span>
          </div>
          <div className="pouch-enchant-lines">
            {instance.affixes.map((a, i) => {
              const def = content.affixes?.[a.affixId];
              const prefixName = def ? tr(def.prefix) : a.affixId;
              const parts = def ? affixEffectParts(def, a.tier, t, tr) : [];
              return (
                <div key={i} className="pouch-enchant-line">
                  <span className="pouch-enchant-gem" aria-hidden="true">✦</span>
                  <span className="pouch-enchant-name">{prefixName}</span>
                  <span className="pouch-enchant-tier muted">T{a.tier}</span>
                  {parts.length > 0 && <span className="pouch-enchant-effect">{parts.join(" · ")}</span>}
                </div>
              );
            })}
            {instance.suffix && (
              <div className="pouch-enchant-line pouch-enchant-line-suffix">
                <span className="pouch-enchant-gem pouch-enchant-gem-suffix" aria-hidden="true">✦</span>
                <span className="pouch-enchant-name">
                  {suffixDef ? tr(suffixDef.suffix) : instance.suffix.suffixId}
                </span>
                {suffixParts.length > 0 && <span className="pouch-enchant-effect">{suffixParts.join(" · ")}</span>}
              </div>
            )}
          </div>
          {rollPct !== null && (
            <div className="pouch-roll" title={t("pouch.rollQualityHint")}>
              <span className="pouch-roll-label">{t("pouch.rollQuality")}</span>
              <span className="pouch-roll-track">
                <span className="pouch-roll-fill" style={{ width: `${rollPct}%` }} />
              </span>
              <span className="pouch-roll-pct">{rollPct}%</span>
            </div>
          )}
        </>
      )}
      {reqEntries.length > 0 && (
        <div className="pouch-req-lines">
          {reqEntries.map(([skillId, lvl]) => {
            const skill = content.skills[skillId];
            const skillName = skill ? tr(skill.name) : skillId;
            const unmet = reqOk === false;
            return (
              <div key={skillId} className={`pouch-req-line${unmet ? " pouch-req-unmet" : ""}`}>
                {t("itip.requires")} <span className="pouch-req-skill">{skillName}</span>: {lvl}
                {unmet && <span className="pouch-req-x"> ✗</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Ein klickbarer Eintrag (Grundversion ODER ein Varianten-Stack) — pinnt beim Klick das ItemTooltip
 *  (wie `ItemChip`), mit den vom Aufrufer übergebenen kontextabhängigen Aktionen. */
function PouchRow({
  itemId,
  instance,
  qty,
  actions,
  className,
  equipped,
  state,
}: {
  itemId: string;
  /** Fehlt bei der Grundversion (schlichtes Item, keine Affixe/Suffix). */
  instance?: ItemInstance;
  qty: number;
  actions: ItemAction[];
  className?: string;
  /** Welle VV (Chef: „ausgerüstete Version klar markiert und immer zuoberst"): true, wenn genau
   *  diese Version (Grundversion ODER Varianten-Signatur) gerade in einem Ausrüstungs-Slot steckt. */
  equipped?: boolean;
  /** Für die Anforderungs-Zeilen (`meetsRequirements`) — von `VariantPouchModal` einmal geholt und
   *  durchgereicht, statt in jeder Zeile erneut `useGameStateMaybe()` zu abonnieren. */
  state: GameState | null;
}): JSX.Element {
  const { t, tr, locale } = useI18n();
  const tooltip = useItemTooltip();
  const item = content.items[itemId];
  const img = getItemImage(itemId);
  const isVariant = !!instance && (instance.affixes.length > 0 || !!instance.suffix);
  const name = isVariant && instance ? instanceDisplayName(instance, content, locale) : item ? tr(item.name) : itemId;
  // 1.1.0 (Chef: "schlecht lesbar und verstaendlich"): Der Basisname steht in JEDER Zeile —
  // "Flammend Rostiges Schwert", "Eisig Rostiges Schwert", "Sturm Rostiges Schwert des Wolfes".
  // Er steht aber schon in der Kopfzeile des Modals, und in der Liste ist er die einzige
  // Information, die alle Zeilen TEILEN. Das Auge muss ihn also in jeder Zeile ueberspringen, um
  // den Unterschied zu finden — genau umgekehrt zu dem, wofuer die Liste da ist.
  // Darum wird er gedaempft und die unterscheidenden Woerter tragen die Farbe. Faellt die
  // Aufteilung aus (Sprache, in der der Basisname nicht woertlich im Variantennamen steckt),
  // steht einfach der volle Name da — nie weniger Information als vorher.
  const basisName = item ? tr(item.name) : itemId;
  const nameTeile: ReactNode = (() => {
    if (!isVariant || !name.includes(basisName) || name === basisName) return name;
    const [vorne, ...rest] = name.split(basisName);
    const hinten = rest.join(basisName);
    return (
      <>
        {vorne}
        <span className="pouch-row-name-basis">{basisName}</span>
        {hinten}
      </>
    );
  })();

  const rarityLabel = tr(RARITY_LABEL[item?.rarity ?? "common"]);

  return (
    <div
      className={`pouch-row ${isVariant ? "pouch-row--variant" : "pouch-row--base"} ${rarityClass(item?.rarity)}${equipped ? " pouch-row-equipped" : ""}${className ? ` ${className}` : ""}`}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        tooltip.pin(itemId, e.clientX, e.clientY, actions, instance);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.pin(itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, actions, instance);
      }}
    >
      <div className="pouch-row-top">
        <div className="pouch-row-left">
          <span className="pouch-row-icon">
            {img ? (
              <img src={img} alt="" className="pouch-row-img pixelart" loading="lazy" decoding="async" />
            ) : item?.icon ? (
              <span className="pouch-row-emoji">{item.icon}</span>
            ) : null}
            {isVariant && (
              <span className="pouch-row-star" aria-hidden="true">
                {STAR_ICON_URL ? <img src={STAR_ICON_URL} alt="" className="pouch-row-star-img" /> : "✦"}
              </span>
            )}
          </span>
          <div className="pouch-row-identity">
            <span className={`pouch-row-name ${rarityClass(item?.rarity)}`}>{nameTeile}</span>
            <span className={`pouch-row-rarity-label ${rarityClass(item?.rarity)}`}>{rarityLabel}</span>
            <div className="pouch-row-badges">
              {equipped && <span className="itip-equipped-badge pouch-row-equipped-badge">{t("itip.equipped")}</span>}
              {qty > 1 && <span className="pouch-row-qty">×{qty}</span>}
            </div>
          </div>
        </div>
        <PouchRowDetail item={item} instance={instance} state={state} />
      </div>
      {actions.length > 0 && (
        <div className="pouch-row-actions it-actions">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              className="it-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface VariantPouchModalProps {
  /** Basis-Item, für das dieser Pouch alle Versionen zeigt. */
  itemId: string;
  /** Menge der schlichten (unverzauberten) Version, 0 = keine Grundversion im Besitz. */
  plainQty: number;
  /** Rohe (ungruppierte) Varianten-Instanzen dieses Basis-Items — wird intern per `sig()` gestapelt. */
  instances: ItemInstance[];
  /** Aktionen für die Grundversions-Zeile (z.B. Ausrüsten/Benutzen/Verkaufen/Einlagern). */
  plainActions: ItemAction[];
  /** Baut die Aktionsliste für einen Varianten-Stack (wirkt auf `representative`, eine Instanz je Klick). */
  variantActionsFor: (inst: ItemInstance) => ItemAction[];
  onClose: () => void;
}

/** Ab wie vielen Versionen die schlanke Filter-/Sortier-Leiste erscheint (Chef: „nur wenn >5
 *  Versionen — keine UI-Last im Normalfall"). */
const TOOLBAR_THRESHOLD = 5;

type SortMode = "best" | "roll" | "name";

/**
 * Varianten-Tasche (Task #246 Phase C): Modal für EIN Basis-Item — zeigt zuerst die Grundversion
 * (falls im Besitz), danach alle verzauberten Varianten, identische Varianten zu einem Stack
 * zusammengefasst (`groupBySig`). Schließt bei `onMouseLeave` (Chef-Vorgabe: Hover-Popover-Verhalten,
 * kein klassischer Klick-außerhalb-Dialog) — der Overlay-Klick bleibt zusätzlich als Fallback.
 * AUSNAHME seit 1.0.2: während die Suche benutzt wird, gilt nur noch Klick/Escape (s. `suchFokus`).
 * Ein Linksklick auf eine Zeile pinnt das große `ItemTooltip` (wie `ItemChip`) mit den
 * kontextabhängigen Aktionen des Aufrufers (Inventar/Shop/Bank unterscheiden sich nur in den
 * übergebenen `plainActions`/`variantActionsFor`, das Modal selbst bleibt kontextfrei).
 *
 * Welle VV (Chef-Redesign 2026-07-19): Namen brechen jetzt um statt abzuschneiden, die Roll-%-Zahl
 * ist ein beschriftetes Mini-Meter statt einer nackten Zahl, die Liste sortiert „beste zuerst" mit
 * der ausgerüsteten Version immer oben, und ab >5 Versionen erscheint eine schlanke Such-/Sortier-
 * Leiste. (Die Stat-Chips dieser Welle sind seit dem 1.1.0-Redesign unten den klaren Verzauberungs-
 * Zeilen gewichen, s. `PouchRowDetail`.)
 *
 * 1.1.0 Redesign (Chef-Fund „liest sich zu beschissen"): deutlich breiteres Modal (wie das Item-
 * Wiki-Modal), größere Bilder/Schrift, und jede Zeile zeigt jetzt klar zurechenbare Verzauberungs-
 * Zeilen + Slots „n/m" + Anforderungen statt der alten losen Chip-Wolke (s. `PouchRowDetail`).
 * Der Hintergrund ist jetzt dieselbe ruhige Parchment-Fläche wie das Wiki-Modal statt der bisherigen
 * Stein-Textur (Chef: „nicht gut, um darauf zu lesen") — s. variant-pouch.css.
 */
export function VariantPouchModal({
  itemId,
  plainQty,
  instances,
  plainActions,
  variantActionsFor,
  onClose,
}: VariantPouchModalProps): JSX.Element {
  const { t, tr, locale } = useI18n();
  const state = useGameStateMaybe();
  const item = content.items[itemId];
  const img = getItemImage(itemId);
  const stacks = groupBySig(instances);
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [search, setSearch] = useState("");
  // Spieler-Report 1.0.2: Sobald die Suche benutzt wird, darf das Modal NICHT mehr bei
  // `mouseleave` schliessen. Beim Tippen schrumpft die Liste, der Kasten wird kuerzer, und der
  // Zeiger liegt schlagartig ausserhalb — das Modal verschwand mitten im Suchen ("it just closes
  // the box and makes you start over"). Wer nur schaut, behaelt das Hover-Popover-Verhalten.
  const [suchFokus, setSuchFokus] = useState(false);

  // Welle VV (Chef: „ausgerüstete Version klar markiert und immer zuoberst"): über ALLE Slots
  // prüfen, ob dieses Basis-Item gerade getragen wird — `equipment[slot]` bleibt bei einer Variante
  // auf der Basis-ID stehen (Arch B, s. equipment.ts-Kommentar „equipment[slot] bleibt baseId"),
  // `equippedInstances[slot]` trägt dann zusätzlich die Affix-/Suffix-Instanz. Fehlt sie, ist die
  // schlichte Grundversion angelegt. Mehrere Treffer sind möglich (Ring1+Ring2/Tool1+Tool2 mit
  // demselben Basis-Item) — deshalb ein Set statt eines einzelnen Werts.
  let plainEquipped = false;
  const equippedSigs = new Set<string>();
  if (state) {
    for (const slot of EQUIP_SLOTS) {
      if (state.character.equipment[slot] !== itemId) continue;
      const eqInst = state.character.equippedInstances[slot];
      if (eqInst) equippedSigs.add(sig(eqInst));
      else plainEquipped = true;
    }
  }

  const totalVersions = (plainQty > 0 ? 1 : 0) + stacks.length;
  const showToolbar = totalVersions > TOOLBAR_THRESHOLD;

  // Suche wirkt nur auf die Varianten (die Grundversion hat keinen eigenen Namen zum Filtern) —
  // Sortierung („beste zuerst") gilt IMMER, die Leiste schaltet nur zusätzliche Sortier-Modi frei.
  const query = showToolbar ? search.trim().toLowerCase() : "";
  const visibleStacks = query
    ? stacks.filter((s) => instanceDisplayName(s.representative, content, locale).toLowerCase().includes(query))
    : stacks;
  const sortedStacks = [...visibleStacks].sort((a, b) => {
    const aEq = equippedSigs.has(a.key);
    const bEq = equippedSigs.has(b.key);
    if (aEq !== bEq) return aEq ? -1 : 1;
    if (sortMode === "name") {
      return instanceDisplayName(a.representative, content, locale).localeCompare(
        instanceDisplayName(b.representative, content, locale),
      );
    }
    if (sortMode === "roll") {
      return (b.representative.suffix?.roll ?? -1) - (a.representative.suffix?.roll ?? -1);
    }
    return stackPower(b.representative) - stackPower(a.representative);
  });

  // Sweep-Fund T7 (2026-07-11): Escape schloss die Tasche nicht (einziges Modal ohne
  // escStack-Anmeldung) — Tastatur-Trap + inkonsistent zu Wiki/Galerie/Zeremonie.
  useEffect(() => registerEscCloser("modal", onClose), [onClose]);

  // Spieler-Report 1.0.0 ("Popup liegt hinter der Bank-Box"): dieses Modal saß bisher als
  // gewöhnliches DOM-Kind INNERHALB der Inventar-Spalte. Sowohl Bank- als auch Shop-Spalten
  // rufen `.shop-panel` (pages.css) auf, das `isolation: isolate` trägt — jede Spalte bekommt
  // dadurch ihren EIGENEN Stacking-Context. `position:fixed; z-index:200` auf `.modal-overlay`
  // wirkt dann nur INNERHALB dieses Contexts, nicht global: die spätere (rechte) Bank-/Nachbar-
  // spalte malt beim Rendern komplett ÜBER der gesamten Inventar-Spalte inkl. dieses Modals, egal
  // wie hoch dessen lokaler z-index ist. Portal an document.body (gleiches Muster wie
  // CitadelTip.tsx und der Quit-Dialog in Sidebar.tsx) löst das Modal aus JEDEM Panel-Stacking-
  // Context heraus — betrifft alle drei Aufrufer (Bank/Shop/Charakter), da sie sich diese
  // Komponente teilen.
  return createPortal(
    <div className="modal-overlay pouch-overlay" onClick={onClose}>
      <div
        className="modal pouch-modal"
        onClick={(e) => e.stopPropagation()}
        onMouseLeave={suchFokus || search.length > 0 ? undefined : onClose}
      >
        <button className="modal-close ds-close-button" onClick={onClose} aria-label={t("pouch.close")} />

        <div className="pouch-head">
          <span className={`pouch-head-icon ${rarityClass(item?.rarity)}`}>
            {img ? (
              <img src={img} alt="" className="pixelart" loading="lazy" decoding="async" />
            ) : item?.icon ? (
              <span className="pouch-head-emoji">{item.icon}</span>
            ) : null}
          </span>
          <div className="pouch-head-text">
            <div className="pouch-head-name">{item ? tr(item.name) : itemId}</div>
            <div className="pouch-head-count muted">
              {t("pouch.variantCount").replace("{n}", String(instances.length))}
            </div>
          </div>
        </div>

        {/* 1.1.0 (Chef: "schlecht lesbar und verstaendlich"): grün kommt aus einer Verzauberung,
            gold aus dem Zufallswurf des Suffix — dieselbe Farbsprache trägt jetzt das
            Runen-Symbol vor jeder Verzauberungs-/Suffix-Zeile (s. `PouchRowDetail`) statt der
            früheren losen Chips. Die Legende steht bewusst EINMAL oben statt als Beschriftung in
            jeder Zeile. Sie erscheint nur, wenn ueberhaupt Varianten da sind — bei einer reinen
            Grundversion gaebe es nichts zu erklaeren. */}
        {stacks.length > 0 && (
          <div className="pouch-legend">
            <span className="pouch-legend-item">
              <span className="pouch-chip pouch-chip-enchant pouch-legend-dot" aria-hidden="true" />
              {t("pouch.legendEnchant")}
            </span>
            <span className="pouch-legend-item">
              <span className="pouch-chip pouch-chip-suffix pouch-legend-dot" aria-hidden="true" />
              {t("pouch.legendSuffix")}
            </span>
          </div>
        )}

        {showToolbar && (
          <div className="pouch-toolbar">
            <input
              type="text"
              className="pouch-search-input"
              placeholder={t("pouch.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSuchFokus(true)}
              onBlur={() => setSuchFokus(false)}
            />
            <select
              className="pouch-sort-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label={t("pouch.sortLabel")}
            >
              <option value="best">{t("pouch.sortBest")}</option>
              <option value="roll">{t("pouch.rollQuality")}</option>
              <option value="name">{t("pouch.sortName")}</option>
            </select>
          </div>
        )}

        <div className="pouch-list">
          {plainQty > 0 && (
            <>
              <div className="pouch-section-title">{t("pouch.baseVersion")}</div>
              <PouchRow itemId={itemId} qty={plainQty} actions={plainActions} equipped={plainEquipped} state={state} />
            </>
          )}
          <div className="pouch-section-title">{t("pouch.variantsHeading")}</div>
          {sortedStacks.length === 0 && query ? (
            <div className="pouch-empty muted">{t("pouch.noMatches")}</div>
          ) : (
            sortedStacks.map((s) => (
              <PouchRow
                key={s.key}
                itemId={itemId}
                instance={s.representative}
                qty={s.count}
                actions={variantActionsFor(s.representative)}
                equipped={equippedSigs.has(s.key)}
                state={state}
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
