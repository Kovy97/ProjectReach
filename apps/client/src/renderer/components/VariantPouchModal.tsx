import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { content } from "@hearthforge/content";
import type { ItemInstance, LocalizedString } from "@hearthforge/shared";
import { EQUIP_SLOTS, instanceDisplayName, isStatusEffectType } from "@hearthforge/shared";
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

/** Ein Stat-Chip in der Pouch-Zeile — `kind` steuert nur die Farbgebung (Chef: „Suffix-Anteil und
 *  Enchant-Anteil visuell unterscheidbar"), der Text kommt 1:1 aus `affixEffectParts`/
 *  `suffixEffectParts` (dieselbe Quelle wie der volle Tooltip — keine zweite Formel). */
export interface StatChip {
  text: string;
  kind: "enchant" | "suffix";
}

/**
 * Welle VV (Chef: „direkt findet wonach man sucht", „welche Stats betroffen sind"): kompakte
 * Stat-Chips einer Instanz — je EIN Chip pro betroffenem Wert (z.B. „+14 Nahkampf", „+5 Stärke"),
 * damit man die Wirkung einer Variante SIEHT statt sie hinter einem Klick zu erraten. Reine
 * Textzeilen aus `affixEffectParts`/`suffixEffectParts` (identische Quelle wie das volle
 * ItemTooltip, s. dort) — der Filter behält nur numerische Zeilen (`+`/`-`-Präfix via `fmtBonus`)
 * und wirft die Waffeneffekt-Proc-Prosa („[Flammend] …") raus, die für einen kurzen Chip zu lang ist
 * (bleibt im vollen Tooltip weiter sichtbar, nur hier ausgeblendet).
 */
function buildStatChips(
  inst: ItemInstance,
  t: (k: string) => string,
  tr: (v: LocalizedString) => string,
): StatChip[] {
  const chips: StatChip[] = [];
  for (const a of inst.affixes) {
    const def = content.affixes?.[a.affixId];
    if (!def) continue;
    for (const part of affixEffectParts(def, a.tier, t, tr)) {
      if (/^[+-]/.test(part)) chips.push({ text: part, kind: "enchant" });
    }
    // Reine Waffeneffekt-Procs (z.B. "Flammend"/"Frosty" — bonusByTier bleibt für sie leer, s.
    // Content-Katalog) hätten ohne diesen Zweig GAR KEINEN Chip gezeigt (Kernwunsch verfehlt: "man
    // sieht, WAS die Version ausmacht"). Kompakte Kurzform ("15% Brand") statt der vollen
    // Prosa-Zeile aus `affixEffectParts` (die bleibt dem vollen Tooltip vorbehalten, für einen Chip
    // zu lang).
    const eff = def.weaponEffectByTier?.[a.tier - 1];
    if (eff) {
      const pct = Math.round(eff.chance * 100);
      const label = isStatusEffectType(eff.type) ? t(`status.${eff.type}`) : tr(def.prefix);
      chips.push({ text: `${pct}% ${label}`, kind: "enchant" });
    }
  }
  if (inst.suffix) {
    for (const part of suffixEffectParts(inst, content, t, tr)) {
      if (/^[+-]/.test(part)) chips.push({ text: part, kind: "suffix" });
    }
  }
  return chips;
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

/** Ein klickbarer Eintrag (Grundversion ODER ein Varianten-Stack) — pinnt beim Klick das ItemTooltip
 *  (wie `ItemChip`), mit den vom Aufrufer übergebenen kontextabhängigen Aktionen. */
function PouchRow({
  itemId,
  instance,
  qty,
  actions,
  className,
  equipped,
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

  // Welle VV (Chef-Kernwunsch: "welche Stats betroffen sind ... direkt in der Zeile"): kompakte
  // Chips statt des vollen Tooltips, s. buildStatChips-JSDoc.
  const chips = isVariant && instance ? buildStatChips(instance, t, tr) : [];
  // Welle VV (Chef: die rohe "87%"-Zahl war unverständlich): selbsterklärendes Mini-Meter mit
  // Label + Tooltip-Satz statt der nackten Zahl, s. pouch.rollQuality/-Hint.
  const rollPct = instance?.suffix ? Math.round(instance.suffix.roll * 100) : null;

  // codex:2026-08-01T12:18:00+02:00 — Basis und verzauberte Versionen erhalten explizite
  // Layoutklassen: Die breite Desktopliste kann Identität und echte Bonuswerte nebeneinander
  // führen, während kleine Fenster kontrolliert auf eine Spalte zurückfallen.
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
      <div className="pouch-row-main">
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
        <span className={`pouch-row-name ${rarityClass(item?.rarity)}`}>{nameTeile}</span>
        {equipped && <span className="itip-equipped-badge pouch-row-equipped-badge">{t("itip.equipped")}</span>}
        {qty > 1 && <span className="pouch-row-qty">×{qty}</span>}
      </div>
      {chips.length > 0 && (
        <div className="pouch-row-chips">
          {chips.map((c, i) => (
            <span key={i} className={`pouch-chip pouch-chip-${c.kind}`}>
              {c.text}
            </span>
          ))}
        </div>
      )}
      {rollPct !== null && (
        <div className="pouch-roll" title={t("pouch.rollQualityHint")}>
          <span className="pouch-roll-label">{t("pouch.rollQuality")}</span>
          <span className="pouch-roll-track">
            <span className="pouch-roll-fill" style={{ width: `${rollPct}%` }} />
          </span>
          <span className="pouch-roll-pct">{rollPct}%</span>
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
 * Welle VV (Chef-Redesign 2026-07-19): Namen brechen jetzt um statt abzuschneiden, jede Zeile
 * zeigt ihre konkreten Stat-Chips (Suffix/Enchant farblich unterschieden), die Roll-%-Zahl ist ein
 * beschriftetes Mini-Meter statt einer nackten Zahl, die Liste sortiert „beste zuerst" mit der
 * ausgerüsteten Version immer oben, und ab >5 Versionen erscheint eine schlanke Such-/Sortier-Leiste.
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

        {/* 1.1.0 (Chef: "schlecht lesbar und verstaendlich"): Die Chips in den Zeilen tragen
            schon zwei Bedeutungen — gruen kommt aus einer Verzauberung, gold aus dem
            Zufallswurf des Suffix. Nur sagte das nichts, also las man beide als dasselbe.
            Die Legende steht bewusst EINMAL oben statt als Beschriftung in jeder Zeile.
            Sie erscheint nur, wenn ueberhaupt Varianten da sind — bei einer reinen
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
              <PouchRow itemId={itemId} qty={plainQty} actions={plainActions} equipped={plainEquipped} />
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
              />
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
