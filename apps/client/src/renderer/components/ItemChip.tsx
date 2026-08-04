import { content } from "@hearthforge/content";
import { getItemImage, rarityClass } from "../items";
import { useItemTooltip } from "./ItemTooltip";
import { useI18n } from "../i18n";

/**
 * Wiederverwendbarer Item-Referenz-Chip: PNG-Icon (Emoji-Fallback) + optionaler Name.
 * Klick öffnet den gepinnten Item-Tooltip. Verwendet überall wo Items referenziert werden
 * (produces, drops, quest-rewards, …).
 */
export function ItemChip({
  itemId,
  showName = false,
  className = "",
}: {
  itemId: string;
  /** Zeigt den lokalisierten Item-Namen neben dem Icon (default: false). */
  showName?: boolean;
  className?: string;
}): JSX.Element {
  const { tr } = useI18n();
  const tooltip = useItemTooltip();
  const item = content.items[itemId];
  const img = getItemImage(itemId);
  const name = item ? tr(item.name) : itemId;

  return (
    <span
      className={`item-chip ${rarityClass(item?.rarity)} ${className}`.trim()}
      title={name}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        tooltip.pin(itemId, e.clientX, e.clientY, []);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.pin(itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, []);
      }}
    >
      {img ? (
        <img loading="lazy" decoding="async" src={img} alt="" className="item-chip-img pixelart" />
      ) : (
        <span className="item-chip-emoji">{item?.icon ?? "▪"}</span>
      )}
      {showName && <span className="item-chip-name">{name}</span>}
    </span>
  );
}
