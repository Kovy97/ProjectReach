import { content } from "@hearthforge/content";
import { useI18n } from "../i18n";
import { getItemImage, FILTER_CATEGORIES, type FilterCategory } from "../items";
import "../styles/inv-filter.css";

// ─── Chip-Repräsentant je Kategorie (echtes Item-Bild statt Emoji-Suppe) ───────────────────
// Analog ShopPage.CATEGORY_ICON_ITEM — eigene Konstante, weil die Kategorien hier abweichen
// (Tränke statt Samen, s. items.ts filterCategoryOf).
const CATEGORY_ICON_ITEM: Record<Exclude<FilterCategory, "all">, string> = {
  weapons: "bronze_sword",
  armor: "leather_body",
  tools: "iron_pickaxe",
  food: "cooked_trout",
  potions: "potion_heal",
  materials: "iron_bar",
};

function ChipIcon({ itemId }: { itemId: string }): JSX.Element {
  const src = getItemImage(itemId);
  const item = content.items[itemId];
  return src
    ? <img loading="lazy" decoding="async" src={src} alt="" className="invf-chip-icon-img pixelart" />
    : <span className="invf-chip-icon-emoji">{item?.icon ?? "◆"}</span>;
}

export interface ItemFilterBarProps {
  search: string;
  onSearchChange: (v: string) => void;
  category: FilterCategory;
  onCategoryChange: (v: FilterCategory) => void;
  /** Optionale Treffer-Zählung je Kategorie (Chip-Badge) — "all" = Gesamtzahl. */
  counts?: Partial<Record<FilterCategory, number>>;
  /** Kompakt-Variante fürs Charakter-Inventar (schmalere Spalte). */
  compact?: boolean;
}

export interface ItemFilterSearchProps {
  search: string;
  onSearchChange: (v: string) => void;
  /** Kompakt-Variante (schmalere Spalte) — s. ItemFilterBarProps.compact. */
  compact?: boolean;
  /** Zusätzliche Klasse(n) am <input> (z.B. eine seiten-eigene Größen-/Look-Variante). */
  className?: string;
}

/** Reines Such-Feld, extrahiert aus ItemFilterBar (Chef-Umbau Inventar-Header 2026-07-23):
 *  CharacterPage braucht Suche und Kategorie-Chips getrennt platziert (Suche volle Breite unter
 *  einer Zeile aus Chips+Sortierung), BankPage nutzt weiterhin die kombinierte ItemFilterBar. */
export function ItemFilterSearch({ search, onSearchChange, compact, className }: ItemFilterSearchProps): JSX.Element {
  const { t } = useI18n();
  return (
    <input
      className={`invf-search${compact ? " invf-search--compact" : ""}${className ? ` ${className}` : ""}`}
      type="search"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder={t("inv.filter.searchPlaceholder")}
      aria-label={t("inv.filter.searchPlaceholder")}
    />
  );
}

export interface ItemFilterChipsProps {
  category: FilterCategory;
  onCategoryChange: (v: FilterCategory) => void;
  counts?: Partial<Record<FilterCategory, number>>;
  compact?: boolean;
  /** Zusätzliche Klasse(n) am Chip-Reihen-Container. */
  className?: string;
}

/** Reine Kategorie-Chip-Reihe, extrahiert aus ItemFilterBar (s. ItemFilterSearch-Kommentar). */
export function ItemFilterChips({ category, onCategoryChange, counts, compact, className }: ItemFilterChipsProps): JSX.Element {
  const { t } = useI18n();
  const LABELS: Record<FilterCategory, string> = {
    all: t("inv.filter.all"),
    weapons: t("inv.filter.weapons"),
    armor: t("inv.filter.armor"),
    tools: t("inv.filter.tools"),
    food: t("inv.filter.food"),
    potions: t("inv.filter.potions"),
    materials: t("inv.filter.materials"),
  };

  return (
    <div className={`invf-chiprow${compact ? " invf-chiprow--compact" : ""}${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className={`invf-chip${category === "all" ? " active" : ""}`}
        onClick={() => onCategoryChange("all")}
        title={LABELS.all}
      >
        <span className="invf-chip-icon"><span className="invf-chip-icon-emoji">◆</span></span>
        <span className="invf-chip-label">{LABELS.all}</span>
        {counts?.all !== undefined && <span className="invf-chip-count">{counts.all}</span>}
      </button>
      {FILTER_CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`invf-chip${category === cat ? " active" : ""}`}
          onClick={() => onCategoryChange(cat)}
          title={LABELS[cat]}
        >
          <span className="invf-chip-icon"><ChipIcon itemId={CATEGORY_ICON_ITEM[cat]} /></span>
          <span className="invf-chip-label">{LABELS[cat]}</span>
          {counts?.[cat] !== undefined && <span className="invf-chip-count">{counts[cat]}</span>}
        </button>
      ))}
    </div>
  );
}

/** Such-/Typ-Filter-Leiste (kombiniert) — von BankPage genutzt (volle Breite, Suche+Chips in
 *  einer Zeile). CharacterPage verwendet stattdessen ItemFilterSearch/ItemFilterChips getrennt
 *  (eigenes Zwei-Zeilen-Layout, s. CharacterPage.tsx cs-inv-toolbar/cs-inv-searchrow). */
export function ItemFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  counts,
  compact,
}: ItemFilterBarProps): JSX.Element {
  return (
    <div className={`invf-bar${compact ? " invf-bar--compact" : ""}`}>
      <ItemFilterSearch search={search} onSearchChange={onSearchChange} compact={compact} />
      <ItemFilterChips category={category} onCategoryChange={onCategoryChange} counts={counts} compact={compact} />
    </div>
  );
}
