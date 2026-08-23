import { useEffect, useState } from "react";
import { content } from "@hearthforge/content";
import {
  autoEatUpgradeCost,
  buyAutoEatUpgrade,
  buyBack,
  buyItem,
  buyMasterRing,
  buySlotUpgrade,
  campBoost,
  canHold,
  effectiveSellPrice,
  groupInstancesByBase,
  itemCount,
  masterRingShopEntries,
  sellInstance,
  sellBaseWithVariants,
  sellItem,
  sellStack,
  slotUpgradeCost,
} from "@hearthforge/engine";
import { AUTO_EAT_MAX_TIER, AUTO_EAT_TIERS, SLOT_UPGRADE_AMOUNT } from "@hearthforge/shared";
import type { ItemInstance, ShopEntry } from "@hearthforge/shared";
import { useGameState } from "../game/GameContext";
import { useI18n } from "../i18n";
import { AreaTourGuide } from "../components/AreaTourGuide";
import { ItemCell } from "../components/ItemCell";
import { ConfirmModal } from "../components/ConfirmModal";
import type { ConfirmRequest } from "../components/ConfirmModal";
import { HoverTip } from "../components/CitadelTip";
import {
  ContainerModePopup,
  MassSellBar,
  MassSellResultBanner,
  StackQtyPopup,
  VariantListPopup,
} from "../components/MassSellPopups";
import { NpcGreeting } from "../components/NpcGreeting";
import { activeEliteZoneName, resolveNpcVoiceKey } from "../util/npcVoice";
import { QTY_PRESETS, QuantityPicker } from "../components/QuantityPicker";
import { VariantContainerCell } from "../components/VariantContainerCell";
import { SHOP_TOUR_STEPS } from "../areaTourSteps";
import { registerEscCloser } from "../util/escStack";
import { getPortrait } from "../portraits";
import { getUiIcon } from "../uiIcons";
import { getItemImage, rarityClass } from "../items";
import { formatNum } from "../util/format";
import { CampBoostNote } from "../components/CampBoostNote";
import { useAnimatedNumber } from "../util/useAnimatedNumber";
import "../styles/shop.css";

// ─── Task #269: Buy/Sell-Tab-Rework ───────────────────────────────────────
// Der Shop war ein ungeordnetes Zwei-Spalten-Chaos (Chef-Zitat). Jetzt: EIN
// großer Container, zwei Haupt-Tabs (Buy/Sell — je den GANZEN Platz nutzend).
// Buy gliedert die 73 Shop-Einträge über Item-Feld-Heuristiken (type/slot/
// weaponStyle/id-Suffix — die Content-Daten selbst tragen keine
// Kategorie) in 6 Warenkategorien + eine eigene "Upgrades"-Kachel; Chips oben
// filtern, "Alle" zeigt gruppierte Sektionen. Sell bekommt den vollen
// Inventar-Grid-Bereich (cs-inv-grid) + eine Detail-/Rückkauf-Seitenspalte.
// Bestehende Engine-Calls/Mechaniken (buyItem, sellItem, sellStack,
// sellInstance, sellBaseWithVariants, buyBack, Shift-Klick, VariantContainerCell)
// bleiben 1:1 erhalten — nur die Präsentation ist neu.

// Task #314 B2 (Chef-GO "Bank-Sanierung"): eigene Preset-Reihe entfernt zugunsten des gemeinsamen
// `QTY_PRESETS` (QuantityPicker.tsx) — vereinheitlicht mit dem Verkaufs-Widget unten (UI-Brainstorm
// 3.1: Kauf [1,5,25,100] vs. Verkauf [1,10,100] fühlten sich wie zwei verschiedene Spiele an).

// ─── Kategorisierung (rein UI-seitig, aus ItemDef-Feldern abgeleitet) ──────
const CATEGORY_ORDER = ["weapons", "armor", "tools", "food", "seeds", "materials"] as const;
type ShopCategory = (typeof CATEGORY_ORDER)[number];
type BuyFilter = "all" | "upgrades" | ShopCategory;

function categoryOf(itemId: string): ShopCategory {
  const item = content.items[itemId];
  if (!item) return "materials";
  if (item.type === "tool") return "tools";
  if (item.type === "equipment") return item.weaponStyle ? "weapons" : "armor";
  if (item.type === "consumable") return "food";
  if (itemId.endsWith("_seed")) return "seeds";
  return "materials";
}

// Einmal beim Modul-Load berechnet — content.shop ist ein statischer Import, ändert sich nie zur Laufzeit.
const SHOP_BY_CATEGORY: Record<ShopCategory, ShopEntry[]> = (() => {
  const map = { weapons: [], armor: [], tools: [], food: [], seeds: [], materials: [] } as Record<ShopCategory, ShopEntry[]>;
  for (const entry of content.shop) {
    map[categoryOf(entry.itemId)].push(entry);
  }
  return map;
})();

// [Shop-Purge 2026-07-11] Kategorien ohne Bestand (z. B. „Essen" — gekochtes Essen ist jetzt
// Cooking-exklusiv, keine Shortcuts) tauchen weder als Chip noch als Sektion auf.
const ACTIVE_CATEGORIES: ShopCategory[] = CATEGORY_ORDER.filter((c) => SHOP_BY_CATEGORY[c].length > 0);

// Repräsentatives Item je Kategorie — liefert das Chip-Icon (echtes Item-Bild statt Emoji-Suppe).
// Nach der Shop-Purge auf Items umgestellt, die WIRKLICH noch im Sortiment liegen.
const CATEGORY_ICON_ITEM: Record<ShopCategory, string> = {
  weapons: "rusty_sword",
  armor: "wooden_shield",
  tools: "bronze_pickaxe",
  food: "cooked_shrimp",
  seeds: "graywort_seed",
  materials: "magic_binder",
};

// ─── Icon-Helfer ─────────────────────────────────────────────────────────────

function GoldIcon({ size = 16 }: { size?: number }): JSX.Element {
  const src = getUiIcon("icon_goldcoin");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shopv2-price-icon" style={{ width: size, height: size }} />
    : <span>🪙</span>;
}

function BagIcon({ size = 22 }: { size?: number }): JSX.Element {
  const src = getUiIcon("icon_inventory");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shopv2-upgrade-icon" style={{ width: size, height: size }} />
    : <span>🎒</span>;
}

function AutoEatIcon({ size = 22 }: { size?: number }): JSX.Element {
  const src = getUiIcon("icon_autoeat");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shopv2-upgrade-icon" style={{ width: size, height: size }} />
    : <span>🍗</span>;
}

function PowerIcon({ size = 22 }: { size?: number }): JSX.Element {
  const src = getUiIcon("icon_power");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shopv2-chip-icon-img" style={{ width: size, height: size }} />
    : <span>⚡</span>;
}

function PouchIcon({ size = 22 }: { size?: number }): JSX.Element {
  const src = getItemImage("small_pouch");
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shopv2-tab-icon pixelart" style={{ width: size, height: size }} />
    : <span>👛</span>;
}

/** Kategorie-Chip-Icon: echtes Item-Bild (Auto-Discovery) mit Emoji-Fallback. */
function CategoryIcon({ itemId }: { itemId: string }): JSX.Element {
  const src = getItemImage(itemId);
  const item = content.items[itemId];
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="shopv2-chip-icon-img pixelart" />
    : <span className="shopv2-chip-icon-emoji">{item?.icon ?? "◆"}</span>;
}

interface SectionHeadProps { title: string; count?: number }
function SectionHead({ title, count }: SectionHeadProps): JSX.Element {
  return (
    <div className="shopv2-section-head">
      <span className="shopv2-section-orn" aria-hidden="true">◆</span>
      <span className="shopv2-section-title">{title}</span>
      {count !== undefined && <span className="shopv2-section-count">{count}</span>}
      <span className="shopv2-section-line" aria-hidden="true" />
    </div>
  );
}

interface CatChipProps { active: boolean; icon: JSX.Element; label: string; count?: number; onClick: () => void }
function CatChip({ active, icon, label, count, onClick }: CatChipProps): JSX.Element {
  return (
    <button className={`shopv2-chip${active ? " active" : ""}`} onClick={onClick}>
      <span className="shopv2-chip-icon">{icon}</span>
      <span className="shopv2-chip-label">{label}</span>
      {count !== undefined && <span className="shopv2-chip-count">{count}</span>}
    </button>
  );
}

/**
 * codex:2026-08-01T19:42:00+02:00 — Mux'-Counter-Warenkarte: Die Karte ist jetzt bewusst nur
 * Auswahl/Überblick. Menge, Gesamtkosten und Sperrgrund leben stabil im rechten Handelstresen,
 * damit unterschiedlich lange Mengenreihen das Warenraster nicht mehr verformen.
 */
function BuyCard({
  entry,
  selected,
  onSelect,
}: {
  entry: ShopEntry;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element | null {
  const state = useGameState();
  const { tr } = useI18n();
  const item = content.items[entry.itemId];
  if (!item) return null;
  const gold = state.character.gold;
  const noSpace = !canHold(state.inventory, content, entry.itemId);
  return (
    <div
      className={`shopv2-card ${rarityClass(item.rarity)}${selected ? " selected" : ""}${noSpace || gold < entry.cost ? " unavailable" : ""}`}
      role="button"
      tabIndex={0}
      aria-selected={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="shopv2-card-image-area">
        {/* codex:2026-08-02T11:24:00+02:00 — ItemCell nutzt den zentralen Bildalias; Shop-ID und Kaufvertrag bleiben unverändert. */}
        <ItemCell itemId={entry.itemId} className="shopv2-cell" />
      </div>
      <span className="shopv2-card-name">{tr(item.name)}</span>
      <span className="shopv2-card-unit-price">
        {formatNum(entry.cost)} <GoldIcon size={13} />
      </span>
    </div>
  );
}

/**
 * codex:2026-08-01T19:42:00+02:00 — Fester Handelstresen des freigegebenen Mockups 01. Alle
 * Kaufmengen greifen weiterhin ausschließlich auf `buyItem`/`QuantityPicker` zurück; die neue
 * Struktur ist Präsentation, keine parallele Handelslogik.
 */
function BuyCounter({ entry }: { entry: ShopEntry | undefined }): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  if (!entry) {
    return <p className="shopv2-counter-empty muted">{t("shop.counter.selectHint")}</p>;
  }
  const item = content.items[entry.itemId];
  if (!item) {
    return <p className="shopv2-counter-empty muted">{t("shop.counter.selectHint")}</p>;
  }
  const gold = state.character.gold;
  const noSpace = !canHold(state.inventory, content, entry.itemId);
  const maxAffordable = Math.floor(gold / entry.cost);
  const reason = noSpace
    ? t("shop.counter.inventoryFull")
    : maxAffordable <= 0
      ? t("shop.counter.notEnoughGold")
      : null;

  return (
    <div className="shopv2-counter">
      <SectionHead title={t("shop.counter.title")} />
      <div className="shopv2-counter-item">
        {/* codex:2026-08-02T11:24:00+02:00 — Derselbe zentrale Bildpfad hält Warenkarte und Handelstresen deckungsgleich. */}
        <ItemCell itemId={entry.itemId} className="shopv2-counter-cell" />
        <div className="shopv2-counter-copy">
          <span className={`shopv2-counter-name ${rarityClass(item.rarity)}`}>{tr(item.name)}</span>
          <span className="shopv2-counter-stock">{t("shop.counter.unlimited")}</span>
          {item.description && <p>{tr(item.description)}</p>}
        </div>
      </div>
      <div className="shopv2-counter-ledger">
        <span>{t("shop.counter.unitPrice")}</span>
        <strong>{formatNum(entry.cost)} <GoldIcon size={14} /></strong>
      </div>
      <span className="shopv2-counter-qty-label">{t("shop.counter.chooseAmount")}</span>
      <QuantityPicker
        className="shopv2-counter-quantity"
        presets={QTY_PRESETS}
        max={Math.max(0, maxAffordable)}
        disabled={noSpace || maxAffordable <= 0}
        presetTitle={(q) => `${q}× ${entry.cost} = ${entry.cost * q}`}
        renderPreset={(q) => (
          <>
            <span className="shopv2-buyqty-n">{q}×</span>
            <span className="shopv2-buyqty-cost">
              {formatNum(entry.cost * q)} <GoldIcon size={12} />
            </span>
          </>
        )}
        onPick={(q) => buyItem(state, content, entry.itemId, entry.cost, q)}
      />
      {reason && <p className="shopv2-counter-reason">{reason}</p>}
    </div>
  );
}

// ─── Meisterring-Sicherheitsnetz (Welle SS, Chef-Auftrag 2026-07-18) ────────
// `masterRingShopEntries` liefert NUR Ringe zurück, deren Weihe schon verliehen wurde, die der
// Spieler aber gerade NIRGENDS mehr besitzt (verkauft, anderweitig verloren) — leer im Normalfall,
// die Sektion blendet sich dann komplett aus (s. `MasterRingSection` return null). Preis ist der
// volle Item-`value` (viel Gold!), daher eine Rückfrage vor dem Kauf — seit 1.0.1 über
// `ConfirmModal` statt `window.confirm()`: der native Dialog erscheint im Vollbild nicht
// zuverlässig (Spieler-Report „Unable to overwrite character", s. ConfirmModal.tsx).
function MasterRingRow({ entry }: { entry: ShopEntry }): JSX.Element | null {
  const state = useGameState();
  const { t, tr } = useI18n();
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmRequest | null>(null);
  const item = content.items[entry.itemId];
  if (!item) return null;
  const gold = state.character.gold;
  const name = tr(item.name);
  return (
    <div className="shopv2-buyback-row">
      <ItemCell itemId={entry.itemId} className="inv-slot filled shopv2-buyback-icon" />
      <div className="shopv2-buyback-info">
        <span className={`shopv2-buyback-name ${rarityClass(item.rarity)}`}>{name}</span>
        <span className="shopv2-buyback-price muted">
          {formatNum(entry.cost)} <GoldIcon size={12} />
        </span>
      </div>
      <button
        className="ds-button ds-button--sm"
        disabled={gold < entry.cost}
        onClick={() =>
          setPendingConfirm({
            title: t("shop.masterRings.title"),
            body: t("shop.masterRings.confirmBody")
              .replace("{name}", name)
              .replace("{cost}", formatNum(entry.cost)),
            confirmLabel: t("shop.buy"),
            onConfirm: () => buyMasterRing(state, content, entry.itemId),
          })
        }
      >
        {t("shop.buy")}
      </button>
      <ConfirmModal request={pendingConfirm} onClose={() => setPendingConfirm(null)} />
    </div>
  );
}

/** Nur sichtbar, wenn der Spieler mindestens einen bereits verliehenen 99er-Ring verloren hat. */
function MasterRingSection(): JSX.Element | null {
  const state = useGameState();
  const { t } = useI18n();
  const entries = masterRingShopEntries(state, content);
  if (entries.length === 0) return null;
  return (
    <section className="shopv2-section" data-guide-id="shop.masterRings">
      <SectionHead title={t("shop.masterRings.title")} count={entries.length} />
      <p className="shopv2-hint muted">{t("shop.masterRings.hint")}</p>
      <div className="shopv2-masterring-list">
        {entries.map((entry) => (
          <MasterRingRow key={entry.itemId} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// ─── Buy-Tab ─────────────────────────────────────────────────────────────────

function BuyTab(): JSX.Element {
  const state = useGameState();
  const { t } = useI18n();
  const gold = state.character.gold;
  const upgradeCost = slotUpgradeCost(state);
  const autoEatTier = state.character.autoEatTier ?? 0;
  const autoEatCost = autoEatUpgradeCost(state);
  const autoEatNext = autoEatCost !== null ? AUTO_EAT_TIERS[autoEatTier + 1] : null;
  const [activeCat, setActiveCat] = useState<BuyFilter>("all");
  // codex:2026-08-01T19:42:00+02:00 — Auswahlzustand für den festen rechten Mux'-Tresen.
  const [selectedBuyId, setSelectedBuyId] = useState<string | null>(content.shop[0]?.itemId ?? null);

  const CATEGORY_LABEL: Record<ShopCategory, string> = {
    weapons: t("shop.cat.weapons"),
    armor: t("shop.cat.armor"),
    tools: t("shop.cat.tools"),
    food: t("shop.cat.food"),
    seeds: t("shop.cat.seeds"),
    materials: t("shop.cat.materials"),
  };

  const showUpgrades = activeCat === "all" || activeCat === "upgrades";
  const visibleCats: ShopCategory[] =
    activeCat === "all" ? [...ACTIVE_CATEGORIES]
    : activeCat === "upgrades" ? []
    : [activeCat];

  const selectedEntry = content.shop.find((entry) => entry.itemId === selectedBuyId) ?? content.shop[0];
  const selectCategory = (next: BuyFilter): void => {
    setActiveCat(next);
    if (next === "upgrades") return;
    if (next === "all") {
      if (!selectedBuyId) setSelectedBuyId(content.shop[0]?.itemId ?? null);
      return;
    }
    setSelectedBuyId(SHOP_BY_CATEGORY[next][0]?.itemId ?? null);
  };

  return (
    // codex:2026-08-01T19:42:00+02:00 — Produktionsstruktur des freigegebenen „Mux' Counter“:
    // Navigation links, scrollbarer Warenbestand mittig, stabiler Handelstresen rechts.
    <div className="shopv2-buy-layout">
      <aside className="shopv2-category-rail">
        <SectionHead title={t("shop.counter.departments")} />
        <div className="shopv2-chiprow">
        <CatChip
          active={activeCat === "all"}
          icon={<span className="shopv2-chip-icon-emoji">◆</span>}
          label={t("shop.cat.all")}
          onClick={() => selectCategory("all")}
        />
        <CatChip
          active={activeCat === "upgrades"}
          icon={<PowerIcon size={20} />}
          label={t("shop.upgrades")}
          onClick={() => selectCategory("upgrades")}
        />
        {ACTIVE_CATEGORIES.map((cat) => (
          <CatChip
            key={cat}
            active={activeCat === cat}
            icon={<CategoryIcon itemId={CATEGORY_ICON_ITEM[cat]} />}
            label={CATEGORY_LABEL[cat]}
            count={SHOP_BY_CATEGORY[cat].length}
            onClick={() => selectCategory(cat)}
          />
        ))}
        </div>
        {activeCat === "all" && <MasterRingSection />}
      </aside>

      <main className="shopv2-buy-scroll">
        {showUpgrades && (
          <section className="shopv2-section">
            <SectionHead title={t("shop.upgrades")} />
            <div className="shopv2-upgrade-row" data-guide-id="shop.upgrades">
              <div className="shopv2-upgrade-card">
                <span className="shopv2-upgrade-text">
                  <BagIcon /> {t("shop.slotUpgrade").replace("{n}", String(SLOT_UPGRADE_AMOUNT))}
                </span>
                <button
                  className="ds-button shopv2-upgrade-btn"
                  disabled={gold < upgradeCost}
                  onClick={() => buySlotUpgrade(state, content)}
                >
                  {upgradeCost} <GoldIcon />
                </button>
              </div>

              <div className="shopv2-upgrade-card">
                <span className="shopv2-upgrade-text" title={t("shop.autoEatHint")}>
                  <AutoEatIcon />{" "}
                  {autoEatCost !== null && autoEatNext
                    ? t("shop.autoEatUpgrade")
                        .replace("{tier}", String(autoEatTier + 1))
                        .replace("{pct}", String(Math.round(autoEatNext.threshold * 100)))
                    : t("shop.autoEatMaxed").replace("{tier}", String(AUTO_EAT_MAX_TIER))}
                </span>
                <button
                  className="ds-button shopv2-upgrade-btn"
                  disabled={autoEatCost === null || gold < autoEatCost}
                  onClick={() => buyAutoEatUpgrade(state)}
                >
                  {autoEatCost === null ? `★ ${autoEatTier}` : <>{autoEatCost} <GoldIcon /></>}
                </button>
              </div>
            </div>
          </section>
        )}

        {visibleCats.map((cat) => (
          <section className="shopv2-section" key={cat}>
            <SectionHead title={CATEGORY_LABEL[cat]} count={SHOP_BY_CATEGORY[cat].length} />
            <div className="shopv2-grid">
              {SHOP_BY_CATEGORY[cat].map((entry) => (
                <BuyCard
                  key={entry.itemId}
                  entry={entry}
                  selected={entry.itemId === selectedEntry?.itemId}
                  onSelect={() => setSelectedBuyId(entry.itemId)}
                />
              ))}
            </div>
          </section>
        ))}
      </main>

      <aside className="shopv2-buy-counter">
        <BuyCounter entry={activeCat === "upgrades" ? undefined : selectedEntry} />
      </aside>
    </div>
  );
}

// ─── Sell-Tab ────────────────────────────────────────────────────────────────

// Verkaufbare Einträge: EIN Eintrag je Basis-Item (Task #246 Phase C, Chef-Vorgabe „Main Item =
// Container"). Schlichte Stacks bleiben wie bisher; hat ein Basis-Item verzauberte Varianten in der
// Instanz-Tasche, wird sein Eintrag zur Container-Zelle (Stern + Pouch-Modal statt Mengen-Auswahl).
// Modul-Ebene (statt lokal in SellTab), damit MassSellCell (Task #323) denselben Typ nutzen kann.
type SellEntry =
  | { key: string; kind: "stack"; itemId: string; qty: number }
  | { key: string; kind: "container"; itemId: string; qty: number; instances: ItemInstance[] };

// ─── Task #323 (Chef-Feature „Mass-Sell im Shop") ───────────────────────────
// Häkchen-Auswahlmodus fürs Verkaufs-Grid: einfache Items direkt an-/abhaken, gestapelte Fungibles
// über einen Mengen-Slider (Default = Max, StackQtyPopup), Varianten-Container über eine Stack-/
// Single-Wahl (ContainerModePopup) — Stack = ganze Gruppe (Grundmenge + alle Instanzen), Single =
// feine Häkchenliste (VariantListPopup). EIN Klick auf "Verkaufen" führt die komplette Auswahl über
// die BESTEHENDEN Engine-Verben aus (sellItem/sellInstance/sellBaseWithVariants) — keine neue
// Engine-API nötig. Auswahl/Popups sind reiner Session-UI-State (wie `selectedSell` unten), landen
// nicht im Save.
type MassSellSelection =
  | { kind: "stack"; qty: number }
  | { kind: "container"; mode: "stack" }
  | { kind: "container"; mode: "single"; baseQty: number; instanceIds: Set<string> };

type MassSellPopupState =
  | { type: "qty"; entryKey: string; itemId: string; max: number; initialQty: number }
  | { type: "containerMode"; entryKey: string; itemId: string }
  | {
      type: "variantList";
      entryKey: string;
      itemId: string;
      plainQty: number;
      instances: ItemInstance[];
      initialBaseQty: number;
      initialInstanceIds: Set<string>;
    };

// ─── 1.0.1-Spielerfeedback (Aldric, 54h54m): „Selling enchanted items is a real pain right now.
// needs to be a way to select all or something." — Task #323 löst das schon FAST vollständig
// (Ganzer-Stapel-Popup pro Basis-Item), aber wer verzauberte Varianten über VIELE verschiedene
// Basis-Items verteilt hat, braucht weiter einen Popup-Klickzyklus je Item-Art. Ergänzung: die
// „volle" Default-Auswahl eines Eintrags (Stack = ganze Menge, Container = ganzer Stapel — exakt
// das, was ein Klick auf "Ganzer Stapel" heute manuell erzeugt), wiederverwendet von "Alle
// auswählen" UND vom Shift-Klick-Bereich unten.
function defaultSelectionFor(entry: SellEntry): MassSellSelection {
  return entry.kind === "stack" ? { kind: "stack", qty: entry.qty } : { kind: "container", mode: "stack" };
}

/** EINE Zelle im Mass-Sell-Auswahlmodus — reuses ItemCell (Checkbox-Overlay + Auswahl-Glow über die
 *  additiven `onCellClick`/`selected`/`overlay`-Props, s. ItemCell.tsx), Klick-Verhalten bewusst
 *  komplett anders als im normalen Sell-Grid (Auswahl statt Tooltip-Pin/Pouch-Öffnen). */
function MassSellCell({
  entry,
  selection,
  onClick,
}: {
  entry: SellEntry;
  selection: MassSellSelection | undefined;
  // 1.0.1: nimmt jetzt das MouseEvent entgegen (statt es zu verschlucken) — SellTab braucht
  // `e.shiftKey` fürs Bereichs-Markieren (s. onMassSellCellClick).
  onClick: (e: React.MouseEvent) => void;
}): JSX.Element {
  const { t } = useI18n();
  const selected = !!selection;
  const totalAvailable = entry.kind === "container" ? entry.qty + entry.instances.length : entry.qty;
  let badge: string | null = null;
  if (selection?.kind === "stack") {
    badge = `${selection.qty}/${entry.qty}`;
  } else if (selection?.kind === "container" && selection.mode === "stack") {
    badge = t("shop.massSell.allBadge").replace("{n}", String(totalAvailable));
  } else if (selection?.kind === "container" && selection.mode === "single") {
    badge = `${selection.baseQty + selection.instanceIds.size}/${totalAvailable}`;
  } else if (totalAvailable > 1) {
    badge = String(totalAvailable);
  }
  return (
    <div className="shopv2-sell-cell">
      <ItemCell
        itemId={entry.itemId}
        hasVariants={entry.kind === "container"}
        className="inv-slot filled"
        selected={selected}
        onCellClick={onClick}
        overlay={
          <>
            <span className={`mshop-checkbox${selected ? " checked" : ""}`} aria-hidden="true">
              {selected ? "✓" : ""}
            </span>
            {badge && <span className="mshop-sel-badge">{badge}</span>}
          </>
        }
      />
    </div>
  );
}

function SellTab(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();

  // Ausgewählter Verkaufs-Eintrag (Schlüssel: "stack:<itemId>"). Container-Zellen ("cont:<itemId>",
  // Basis-Items mit verzauberten Varianten, Task #246) setzen dies nie — sie öffnen stattdessen ihr
  // eigenes Pouch-Modal per Klick.
  const [selectedSell, setSelectedSell] = useState<string | null>(null);

  const stackMap = new Map<string, number>();
  state.inventory.slots.forEach((slot) => {
    if (!slot) return;
    stackMap.set(slot.itemId, (stackMap.get(slot.itemId) ?? 0) + slot.qty);
  });
  const instanceGroups = groupInstancesByBase(state.inventory.instances);
  // Basis-Item-Reihenfolge: erst die bekannten Stacks (Slot-Reihenfolge), danach Basis-Items, die
  // ausschließlich als Varianten existieren (kein schlichter Stack).
  const sellItemIds = [
    ...stackMap.keys(),
    ...[...instanceGroups.keys()].filter((id) => !stackMap.has(id)),
  ];
  const sellEntries: SellEntry[] = sellItemIds.map((itemId): SellEntry => {
    const group = instanceGroups.get(itemId) ?? [];
    const qty = stackMap.get(itemId) ?? 0;
    return group.length > 0
      ? { key: `cont:${itemId}`, kind: "container", itemId, qty, instances: group }
      : { key: `stack:${itemId}`, kind: "stack", itemId, qty };
  });
  // Verkaufsaktion für einen Varianten-Stack im Pouch-Modal — wirkt auf EINE Instanz je Klick.
  const sellVariantActions = (inst: ItemInstance) => [
    { key: "sell", label: t("shop.sellOne"), onClick: () => sellInstance(state, content, inst.instanceId) },
  ];

  // ── Task #323: Mass-Sell-Auswahlmodus ──────────────────────────────────────
  const [massSellMode, setMassSellMode] = useState(false);
  const [massSelection, setMassSelection] = useState<Map<string, MassSellSelection>>(new Map());
  // Rückfrage vor dem Massenverkauf (1.0.1) — s. `askMassSell` weiter unten.
  const [pendingMassSell, setPendingMassSell] = useState<ConfirmRequest | null>(null);
  const [massPopup, setMassPopup] = useState<MassSellPopupState | null>(null);
  const [massResult, setMassResult] = useState<{ count: number; gold: number } | null>(null);
  // 1.0.1: letzte angeklickte Grid-Position — Basis für den Shift-Klick-Bereich unten
  // (Datei-Explorer-Konvention: Shift+Klick markiert von hier bis zur neuen Position).
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const exitMassSellMode = (): void => {
    setMassSellMode(false);
    setMassSelection(new Map());
    setMassPopup(null);
    setLastClickedIndex(null);
  };

  // Esc verlässt den Modus (Chef-Vorgabe, Auswahl verwerfen) — nur solange kein Popup offen ist:
  // ein offenes Popup registriert sich SPÄTER (s. seine eigene registerEscCloser-Nutzung) und ist
  // damit laut escStack-LIFO das erste Ziel eines Escape-Drucks, dieser Closer greift erst danach.
  useEffect(() => {
    if (!massSellMode) return undefined;
    return registerEscCloser("modal", exitMassSellMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [massSellMode]);

  const massSellSummary = (() => {
    let count = 0;
    let gold = 0;
    for (const entry of sellEntries) {
      const sel = massSelection.get(entry.key);
      if (!sel) continue;
      const unit = effectiveSellPrice(state, content, entry.itemId);
      if (entry.kind === "stack" && sel.kind === "stack" && sel.qty > 0) {
        count++;
        gold += unit * sel.qty;
      } else if (entry.kind === "container" && sel.kind === "container") {
        if (sel.mode === "stack") {
          const units = entry.qty + entry.instances.length;
          if (units > 0) {
            count++;
            gold += unit * units;
          }
        } else {
          const units = sel.baseQty + sel.instanceIds.size;
          if (units > 0) {
            count++;
            gold += unit * units;
          }
        }
      }
    }
    return { count, gold };
  })();

  // 1.0.1: "Alle auswählen"-Schalter bezieht sich auf die aktuell GEFILTERTE Ansicht — der Sell-
  // Tab kennt (Stand heute) keinen eigenen Kategorie-/Textfilter, `sellEntries` IST also bereits
  // die vollständige aktuell sichtbare Liste. Jeder Eintrag bekommt seine "volle" Default-Auswahl
  // (dieselbe, die "Ganzer Stapel" manuell erzeugen würde) — kein Datenverlust möglich: angelegte
  // Ausrüstung taucht strukturell nie in `sellEntries` auf (equipInstance/equipItem ziehen die
  // Instanz/den Stack aus `inventory` heraus, s. equipment.ts), ein Favoriten-/Sperrsystem gibt es
  // im Spiel nicht (keins erfunden — Chef-Vorgabe). Bestätigungs-Dialog vor dem echten Verkauf
  // (s. executeMassSell) bleibt das Sicherheitsnetz gegen einen Fehlklick.
  const allEntriesSelected = sellEntries.length > 0 && sellEntries.every((e) => massSelection.has(e.key));
  const toggleSelectAll = (): void => {
    setMassSelection(() => {
      if (allEntriesSelected) return new Map();
      const next = new Map<string, MassSellSelection>();
      for (const e of sellEntries) next.set(e.key, defaultSelectionFor(e));
      return next;
    });
  };

  const onMassSellCellClick = (entry: SellEntry, index: number, mouseEvent: React.MouseEvent): void => {
    // Umschalt+Klick markiert einen ZUSAMMENHÄNGENDEN Bereich (Datei-Explorer-Konvention) statt
    // eines einzelnen Eintrags — jeder Eintrag im Bereich bekommt seine volle Default-Auswahl
    // (kein Popup, dieselbe Logik wie "Alle auswählen"). Kein offener Anker (allererster Klick im
    // Modus) → Shift wird wie ein normaler Klick behandelt.
    if (mouseEvent.shiftKey && lastClickedIndex !== null) {
      const from = Math.min(lastClickedIndex, index);
      const to = Math.max(lastClickedIndex, index);
      setMassSelection((prev) => {
        const next = new Map(prev);
        for (let i = from; i <= to; i++) {
          const rangeEntry = sellEntries[i];
          if (rangeEntry) next.set(rangeEntry.key, defaultSelectionFor(rangeEntry));
        }
        return next;
      });
      setLastClickedIndex(index);
      return;
    }
    setLastClickedIndex(index);
    const current = massSelection.get(entry.key);
    if (entry.kind === "stack") {
      if (entry.qty <= 1) {
        setMassSelection((prev) => {
          const next = new Map(prev);
          if (next.has(entry.key)) next.delete(entry.key);
          else next.set(entry.key, { kind: "stack", qty: entry.qty });
          return next;
        });
        return;
      }
      setMassPopup({
        type: "qty",
        entryKey: entry.key,
        itemId: entry.itemId,
        max: entry.qty,
        initialQty: current?.kind === "stack" ? current.qty : entry.qty,
      });
      return;
    }
    // Varianten-Container.
    if (!current) {
      setMassPopup({ type: "containerMode", entryKey: entry.key, itemId: entry.itemId });
      return;
    }
    if (current.kind === "container" && current.mode === "stack") {
      // Erneuter Klick auf eine "ganzer Stapel"-Auswahl hakt direkt wieder ab (symmetrisch zum
      // einfachen Item-Toggle) — kein Popup nötig, es gibt nichts zum Nachjustieren.
      setMassSelection((prev) => {
        const next = new Map(prev);
        next.delete(entry.key);
        return next;
      });
      return;
    }
    if (current.kind === "container" && current.mode === "single") {
      setMassPopup({
        type: "variantList",
        entryKey: entry.key,
        itemId: entry.itemId,
        plainQty: entry.qty,
        instances: entry.instances,
        initialBaseQty: current.baseQty,
        initialInstanceIds: current.instanceIds,
      });
    }
  };

  const performMassSell = (): void => {
    let totalGold = 0;
    let soldPositions = 0;
    for (const entry of sellEntries) {
      const sel = massSelection.get(entry.key);
      if (!sel) continue;
      if (entry.kind === "stack" && sel.kind === "stack" && sel.qty > 0) {
        const g = sellItem(state, content, entry.itemId, sel.qty);
        if (g > 0) {
          totalGold += g;
          soldPositions++;
        }
      } else if (entry.kind === "container" && sel.kind === "container") {
        if (sel.mode === "stack") {
          const res = sellBaseWithVariants(state, content, entry.itemId);
          if (res.gold > 0) {
            totalGold += res.gold;
            soldPositions++;
          }
        } else {
          let g = sel.baseQty > 0 ? sellItem(state, content, entry.itemId, sel.baseQty) : 0;
          for (const id of sel.instanceIds) g += sellInstance(state, content, id);
          if (g > 0) {
            totalGold += g;
            soldPositions++;
          }
        }
      }
    }
    // Modus bleibt an (Chef-Vorgabe „für die nächste Runde"), nur die Auswahl leert sich — EIN
    // Ergebnis-Banner statt N Einzel-Toasts (Toasts.tsx ist ein reines Diff-System ohne
    // imperative Push-API für beliebige Seiten, s. Kommentar am Banner unten).
    setMassSelection(new Map());
    setMassResult({ count: soldPositions, gold: totalGold });
    window.setTimeout(() => setMassResult(null), 4000);
  };

  // 1.0.1-Sicherheitsnetz gegen Fehlverkäufe: bevor der Massenverkauf wirklich bucht, eine kurze
  // Rückfrage mit Anzahl + Gesamterlös. BEWUSST über `ConfirmModal` und NICHT `window.confirm()` —
  // im Vollbild kommt der native Dialog nicht zuverlässig durch (s. ConfirmModal.tsx), der
  // Verkaufen-Knopf sähe für den Spieler dann schlicht tot aus. Angelegte Ausrüstung kann
  // strukturell nie in `massSelection` landen (s. Kommentar bei `allEntriesSelected`), ein
  // Favoriten-/Sperrsystem existiert nicht. Bricht der Spieler ab, bleibt die Auswahl stehen.
  const askMassSell = (): void => {
    if (massSellSummary.count === 0) return;
    setPendingMassSell({
      title: t("shop.massSell.toggle"),
      body: t("shop.massSell.confirmBody")
        .replace("{n}", String(massSellSummary.count))
        .replace("{gold}", formatNum(massSellSummary.gold)),
      confirmLabel: t("shop.massSell.confirm"),
      onConfirm: performMassSell,
    });
  };

  return (
    <>
    <div className="shopv2-sell-layout">
      <div className="shopv2-sell-main">
        <div className="mshop-toolbar">
          <button
            className={`ds-button ds-button--sm mshop-toggle-btn${massSellMode ? " active" : ""}`}
            disabled={sellEntries.length === 0 && !massSellMode}
            onClick={() => (massSellMode ? exitMassSellMode() : setMassSellMode(true))}
          >
            {t("shop.massSell.toggle")}
          </button>
          {!massSellMode && <p className="shopv2-hint muted mshop-hint-inline">{t("shop.shiftSellHint")}</p>}
        </div>

        {massSellMode && (
          <MassSellBar
            count={massSellSummary.count}
            gold={massSellSummary.gold}
            allSelected={allEntriesSelected}
            onToggleSelectAll={toggleSelectAll}
            onSell={askMassSell}
            onCancel={exitMassSellMode}
          />
        )}

        {sellEntries.length === 0 ? (
          <p className="muted shopv2-empty">{t("shop.nothingToSell")}</p>
        ) : massSellMode ? (
          <div className="shopv2-sell-grid cs-inv-grid">
            {sellEntries.map((e, i) => (
              <MassSellCell
                key={e.key}
                entry={e}
                selection={massSelection.get(e.key)}
                onClick={(ev) => onMassSellCellClick(e, i, ev)}
              />
            ))}
          </div>
        ) : (
          <div className="shopv2-sell-grid cs-inv-grid">
            {sellEntries.map((e) =>
              e.kind === "container" ? (
                  <div key={e.key} className="shopv2-sell-cell">
                    <VariantContainerCell
                      itemId={e.itemId}
                      qty={e.qty}
                      instances={e.instances}
                      plainActions={
                        e.qty > 0
                          ? [{ key: "sell1", label: t("shop.sell1"), onClick: () => sellItem(state, content, e.itemId, 1) }]
                          : []
                      }
                      variantActionsFor={sellVariantActions}
                      // Chef-Bug 2026-07-05: Shift+Linksklick verkauft den GANZEN Stack SOFORT —
                      // schlichte Grundmenge UND alle verzauberten Suffix/Affix-Varianten (statt
                      // nur das Modal zu öffnen / 1er zu verkaufen).
                      onShiftClick={() => sellBaseWithVariants(state, content, e.itemId)}
                      className="inv-slot filled"
                    />
                  </div>
                ) : (
                  <div
                    key={e.key}
                    className={`shopv2-sell-cell${selectedSell === e.key ? " selected" : ""}`}
                    title={t("shop.shiftSellHint")}
                    onMouseDown={(ev) => {
                      // Shift = Schnellverkauf (Task #245) — von ItemCell.onShiftClick abgewickelt;
                      // hier NUR die Auswahl NICHT umschalten. Ohne Shift: normales Auswahl-Toggle.
                      if (ev.shiftKey) return;
                      setSelectedSell(e.key === selectedSell ? null : e.key);
                    }}
                  >
                    <ItemCell
                      itemId={e.itemId}
                      qty={e.qty}
                      className="inv-slot filled"
                      onShiftClick={() => {
                        // Shift+Linksklick verkauft den GANZEN Stapel sofort (nicht 1er).
                        sellStack(state, content, e.itemId);
                        if (selectedSell === e.key && itemCount(state.inventory, e.itemId) <= 0) {
                          setSelectedSell(null);
                        }
                      }}
                    />
                  </div>
                ),
              )}
            </div>
        )}
      </div>

      <aside className="shopv2-sell-aside">
        <div className="shopv2-detail-box shopv2-sell-detail-panel">
          {/* Detail-Menü: Stacks → Mengen-Buttons. Container-Zellen (Varianten) öffnen stattdessen
              ihr eigenes Pouch-Modal (Klick auf die Zelle oben) und setzen nie `selectedSell` —
              dieses Menü zeigt also nur je einen reinen Stack. */}
          {(() => {
            const entry = sellEntries.find((e) => e.key === selectedSell && e.kind === "stack");
            if (!entry) {
              return <p className="shopv2-hint muted">{t("shop.sellSelectHint")}</p>;
            }
            const item = content.items[entry.itemId];
            // #276 Schritt 4: effektiver Verkaufspreis inkl. Pet-sellBonus (vellumoth +5%), sonst
            // zeigt der Detail-Kasten den Basis-Preis, obwohl der Verkauf selbst schon den Bonus zahlt.
            const unit = effectiveSellPrice(state, content, entry.itemId);
            const displayName = item ? tr(item.name) : entry.itemId;
            // Task #334 (UI-Welle 2 "Boosts sichtbar"): der Händlerposten-Anteil an `unit` steckte
            // bisher unsichtbar in der Summe — derselbe Engine-Hook, den `effectiveSellPrice` selbst
            // aufruft, keine zweite Bonus-Mathe.
            const sellCampBonus = Math.max(0, campBoost(state, content, "sellBonus"));

            return (
              <div className="shopv2-sell-detail">
                <div className="shopv2-sell-detail-head">
                  <ItemCell
                    itemId={entry.itemId}
                    className="inv-slot filled shopv2-sell-detail-icon"
                  />
                  <div className="shopv2-sell-detail-info">
                    <span className={`shopv2-sell-detail-name ${rarityClass(item?.rarity)}`}>
                      {displayName}
                    </span>
                    {sellCampBonus > 0 ? (
                      <HoverTip
                        as="span"
                        className="shopv2-sell-detail-meta muted"
                        content={<div className="ct-tip-desc"><CampBoostNote kind="sellBonus" value={sellCampBonus} t={t} /></div>}
                      >
                        {t("shop.owned").replace("{n}", String(entry.qty))} · {unit}{" "}
                        <GoldIcon /> {t("shop.each")}
                      </HoverTip>
                    ) : (
                      <span className="shopv2-sell-detail-meta muted">
                        {t("shop.owned").replace("{n}", String(entry.qty))} · {unit}{" "}
                        <GoldIcon /> {t("shop.each")}
                      </span>
                    )}
                  </div>
                </div>
                {/* Task #314 B2: gemeinsames QuantityPicker-Widget statt eigener sell1/10/100 +
                    separatem "Alles verkaufen"-Button — `max`=Bestand vereint beides (Presets >
                    Bestand blenden sich aus, der MAX-Knopf ÜBERNIMMT die alte "Alles verkaufen"-Rolle). */}
                <QuantityPicker
                  className="shopv2-sell-detail-actions"
                  presets={QTY_PRESETS}
                  max={entry.qty}
                  maxLabel={t("shop.sellAll")}
                  onPick={(q) => {
                    sellItem(state, content, entry.itemId, Math.min(q, itemCount(state.inventory, entry.itemId)));
                    if (itemCount(state.inventory, entry.itemId) <= 0) setSelectedSell(null);
                  }}
                />
              </div>
            );
          })()}
        </div>

        {/* ── Buy-Back: zuletzt verkaufte Items/Instanzen zum Verkaufspreis zurückkaufen ── */}
        <div className="shopv2-detail-box shopv2-buyback-panel">
          <SectionHead title={t("shop.buyBack")} />
          {state.buyBack.length === 0 ? (
            <p className="shopv2-hint muted">{t("shop.buyBackEmpty")}</p>
          ) : (
            <div className="shopv2-buyback-list">
              {state.buyBack.map((b, i) => {
                const item = content.items[b.itemId];
                const isInstance = !!b.instance;
                const units = isInstance ? 1 : b.qty;
                const total = units * b.price;
                const displayName = item ? tr(item.name) : b.itemId;
                return (
                  <div key={`bb-${i}`} className="shopv2-buyback-row">
                    <ItemCell
                      itemId={b.itemId}
                      qty={isInstance ? undefined : b.qty}
                      instance={b.instance}
                      className="inv-slot filled shopv2-buyback-icon"
                    />
                    <div className="shopv2-buyback-info">
                      <span className={`shopv2-buyback-name ${rarityClass(item?.rarity)}`}>
                        {displayName}
                        {!isInstance && b.qty > 1 ? ` ×${b.qty}` : ""}
                      </span>
                      <span className="shopv2-buyback-price muted">
                        {total} <GoldIcon />
                      </span>
                    </div>
                    <button
                      className="ds-button ds-button--sm"
                      disabled={state.character.gold < total}
                      onClick={() => buyBack(state, content, i)}
                    >
                      {t("shop.buyBackAction")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>

    {massPopup?.type === "qty" && (
      <StackQtyPopup
        itemId={massPopup.itemId}
        max={massPopup.max}
        initialQty={massPopup.initialQty}
        showRemove={massSelection.has(massPopup.entryKey)}
        onConfirm={(qty) => {
          setMassSelection((prev) => {
            const next = new Map(prev);
            if (qty <= 0) next.delete(massPopup.entryKey);
            else next.set(massPopup.entryKey, { kind: "stack", qty });
            return next;
          });
          setMassPopup(null);
        }}
        onRemove={() => {
          setMassSelection((prev) => {
            const next = new Map(prev);
            next.delete(massPopup.entryKey);
            return next;
          });
          setMassPopup(null);
        }}
        onClose={() => setMassPopup(null)}
      />
    )}

    {massPopup?.type === "containerMode" && (
      <ContainerModePopup
        itemId={massPopup.itemId}
        onStack={() => {
          setMassSelection((prev) => {
            const next = new Map(prev);
            next.set(massPopup.entryKey, { kind: "container", mode: "stack" });
            return next;
          });
          setMassPopup(null);
        }}
        onSingle={() => {
          const entry = sellEntries.find((e) => e.key === massPopup.entryKey);
          if (!entry || entry.kind !== "container") {
            setMassPopup(null);
            return;
          }
          setMassPopup({
            type: "variantList",
            entryKey: entry.key,
            itemId: entry.itemId,
            plainQty: entry.qty,
            instances: entry.instances,
            initialBaseQty: 0,
            initialInstanceIds: new Set(),
          });
        }}
        onClose={() => setMassPopup(null)}
      />
    )}

    {massPopup?.type === "variantList" && (
      <VariantListPopup
        itemId={massPopup.itemId}
        plainQty={massPopup.plainQty}
        instances={massPopup.instances}
        initialBaseQty={massPopup.initialBaseQty}
        initialInstanceIds={massPopup.initialInstanceIds}
        onClose={(baseQty, instanceIds) => {
          setMassSelection((prev) => {
            const next = new Map(prev);
            if (baseQty <= 0 && instanceIds.size === 0) next.delete(massPopup.entryKey);
            else next.set(massPopup.entryKey, { kind: "container", mode: "single", baseQty, instanceIds });
            return next;
          });
          setMassPopup(null);
        }}
      />
    )}

    {massResult && <MassSellResultBanner count={massResult.count} gold={massResult.gold} />}
    <ConfirmModal request={pendingMassSell} onClose={() => setPendingMassSell(null)} />
    </>
  );
}

// ─── ShopPage ────────────────────────────────────────────────────────────────

export function ShopPage(): JSX.Element {
  const state = useGameState();
  const { t, tr } = useI18n();
  const gold = state.character.gold;
  // Welle OO (Chef-GO "UI-Juice Stufe 1", Moment 4 "Odometer"): die Gold-Anzeige tickt bei
  // Kauf/Verkauf sichtbar hoch/runter statt zu springen — dieselbe Tween-Technik wie die Topbar
  // (App.tsx `animatedGold`). Respektiert fxLevel/prefers-reduced-motion selbst (s.
  // util/useAnimatedNumber.ts `shouldAnimateNumbers`) → hier kein weiteres Gating nötig.
  const animatedGold = useAnimatedNumber(gold, 400);
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  // Chef-GO Hotkeys (2026-07-09): Buy/Sell-Wechsel per Pfeiltasten links/rechts oder Q/E — BEWUSST
  // NICHT Tab (Accessibility: Tab muss frei für Fokus-Navigation bleiben). Nur aktiv, solange die
  // ShopPage gemountet ist (eigener Listener, kein globaler Konflikt) und kein Eingabefeld
  // fokussiert ist. Nur zwei Tabs → links/Q wählt immer Buy, rechts/E immer Sell (kein Umlauf nötig).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (e.key === "ArrowLeft" || key === "q") setActiveTab("buy");
      else if (e.key === "ArrowRight" || key === "e") setActiveTab("sell");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Persönlichkeits-Paket §C.2 (design/lore/waechter-stimme-pack.md): Weltzustand-Vorrangs-Zeile
  // für den Händler — Elite > Segen (rotmist/greed). Die vierte Paket-Zeile ("chapter", ein
  // frisch abgeschlossenes Chronik-Kapitel) ist NICHT verdrahtet — kein sauberes vorhandenes
  // Signal, s. util/npcVoice.ts-Kopfkommentar.
  const shopVoiceKey = resolveNpcVoiceKey("shop", state);

  return (
    <div className="shopv2-page">
      {/* Bereichs-Erst-Tour (Chef-Auftrag Welle B, 2026-07-13): läuft nur beim allerersten Besuch
          dieser Seite, danach für immer aus (state.onboarding.toursSeen.shop). */}
      <AreaTourGuide tourKey="shop" steps={SHOP_TOUR_STEPS} />
      {/* NPC-Begrüßung („Speaking Head", Chef-GO 2026-07-13). Welle QQ (2026-07-17): echtes
          Porträt — Mux der Abtrünnige, laut Lore-Bibel §3.5/§3.2 der Händler ("der Shop ist
          Mux' Plane"). Name-Label bleibt bewusst der bestehende rollenneutrale Titel
          ("The Merchant"/"Der Händler") — reine Bild-Verdrahtung, kein Text-Change. */}
      <NpcGreeting
        portraitSrc={getPortrait("npc_mux")}
        name={t("npc.shop.name")}
        lines={[t("npc.shop.greet1"), t("npc.shop.greet2"), t("npc.shop.greet3")]}
        priorityLine={
          shopVoiceKey
            ? t(shopVoiceKey).replace("{zone}", activeEliteZoneName(state, tr) ?? "")
            : null
        }
      />
      <div className="shopv2-topbar">
        <div className="shopv2-balance">
          <span className="shopv2-balance-icon"><GoldIcon size={24} /></span>
          <span className="shopv2-balance-amount">{formatNum(Math.round(animatedGold))}</span>
          <span className="shopv2-balance-label">{t("sidebar.gold")}</span>
        </div>
        <div className="shopv2-maintabs-wrap">
          <div className="shopv2-maintabs" data-guide-id="shop.tabs">
            <button
              className={`shopv2-maintab${activeTab === "buy" ? " active" : ""}`}
              onClick={() => setActiveTab("buy")}
            >
              <GoldIcon size={20} /> {t("shop.buy")}
            </button>
            <button
              className={`shopv2-maintab${activeTab === "sell" ? " active" : ""}`}
              onClick={() => setActiveTab("sell")}
            >
              <PouchIcon size={20} /> {t("shop.sell")}
            </button>
          </div>
          {/* Dezenter Hotkey-Hinweis (Chef-GO) — unsichtbar-für-Casuals, aber auffindbar für
              Power-User: kleine Pfeile unter den Haupt-Tabs + Tooltip mit Q/E-Alternative. */}
          <span className="shopv2-tab-hotkey-hint" title={t("shop.tabHotkeyTitle")} aria-hidden="true">
            ◂ ▸
          </span>
        </div>
      </div>

      <div className="shopv2-body ds-frame">
        {activeTab === "buy" ? <BuyTab /> : <SellTab />}
      </div>
    </div>
  );
}
