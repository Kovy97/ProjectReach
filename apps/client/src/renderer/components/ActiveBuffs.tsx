import { content } from "@hearthforge/content";
import type { ActiveBuff } from "@hearthforge/shared";
import { useI18n } from "../i18n";
import { getItemImage } from "../items";
import { getUiIcon } from "../uiIcons";
import { useItemTooltip } from "./ItemTooltip";

// Welle QQ (2026-07-17): echtes Buff-Icon statt ✨-Emoji, falls ein Buff-Item weder Bild noch
// eigenes content.icon hat.
const BUFF_ICON_URL = getUiIcon("icon_buff");

/**
 * Citadel-gerahmte Leiste aktiver Tränke-/Runen-Buffs (Chef-Feedback #239): vorher zeigte jeder
 * Buff-Chip NUR Icon + Restzeit („✦ 53s") — man sah nicht, was der Effekt überhaupt ist. Jetzt
 * trägt der Chip zusätzlich den Item-Namen; der VOLLE Effekt (Bonus/Trinity/Attribut-Modifier,
 * s. ItemTooltip-Fix #239 „item.buff") erscheint per Hover im selben großen Item-Tooltip wie
 * überall sonst im Spiel — eine einzige Quelle für „was macht dieser Buff", keine zweite
 * Formatierungslogik hier. Gemeinsam von CharacterPage UND CombatPage genutzt, damit aktive
 * Buffs auf beiden Screens identisch aussehen.
 */
export function ActiveBuffsBar({ buffs }: { buffs: ActiveBuff[] }): JSX.Element | null {
  const { tr } = useI18n();
  const tooltip = useItemTooltip();
  if (buffs.length === 0) return null;
  return (
    <div className="active-buffs-bar">
      {buffs.map((b, i) => {
        const item = content.items[b.itemId];
        const img = item ? getItemImage(item.id) : null;
        const name = item ? tr(item.name) : b.itemId;
        return (
          <span
            key={i}
            className="active-buff-chip"
            role="button"
            tabIndex={0}
            onMouseEnter={(e) => tooltip.show(b.itemId, e.clientX, e.clientY, [])}
            onMouseLeave={() => tooltip.hide()}
            onClick={(e) => {
              e.stopPropagation();
              tooltip.pin(b.itemId, e.clientX, e.clientY, []);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              tooltip.pin(b.itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, []);
            }}
          >
            <span className="active-buff-icon" aria-hidden="true">
              {img ? (
                <img loading="lazy" decoding="async" src={img} alt="" className="pixelart" />
              ) : (
                item?.icon ?? (BUFF_ICON_URL ? <img loading="lazy" decoding="async" src={BUFF_ICON_URL} alt="" className="ui-icon" /> : "✨")
              )}
            </span>
            <span className="active-buff-name">{name}</span>
            <span className="active-buff-timer">{Math.ceil(b.remainingMs / 1000)}s</span>
          </span>
        );
      })}
    </div>
  );
}
