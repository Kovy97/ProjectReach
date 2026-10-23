import { useRef, useState } from "react";
import { content } from "@hearthforge/content";
import { meetsRequirements, itemTier } from "@hearthforge/engine";
import type { ItemInstance } from "@hearthforge/shared";
import { useGameStateMaybe } from "../game/GameContext";
import { useI18n } from "../i18n";
import { getItemImage, rarityClass } from "../items";
import { TierStars } from "./TierStars";
import { getUiIcon } from "../uiIcons";
import { consumeSparkleOnce } from "../util/discoveryBadge";
import { effectiveFxLevel } from "../util/fxLevel";
import { useItemTooltip, type ItemAction } from "./ItemTooltip";

// Chef 2026-07-21: Hover-Tooltip snappier (max. ≤1s → 500ms). Shift+Hover = 0ms (sofort), da der
// Spieler mit Shift bewusst vergleichen will (der WoW-Vergleich im Overlay reagiert ohnehin auf Shift).
const HOVER_DELAY_MS = 500;

interface ItemCellProps {
  itemId: string;
  qty?: number;
  actions?: ItemAction[];
  /** Als Drag-Quelle nutzbar (z.B. Inventar → Paperdoll). */
  draggable?: boolean;
  /** Meldet die gezogene Item-ID (für Slot-Glow am Drop-Ziel); null beim Ende. */
  onDragItem?: (itemId: string | null) => void;
  /** Zusätzliche Klassen (z.B. Slot-Layout). */
  className?: string;
  /** Optional: Item-Instanz für Verzauberungen — zeigt Instanz-Namen + Affix-Liste im Tooltip. */
  instance?: ItemInstance;
  /** Shift+Klick — Schnellaktion (z.B. Bank: ganzen Stack ein-/auszahlen) statt Tooltip-Pin. */
  onShiftClick?: () => void;
  /**
   * Varianten-Container (Task #246 Phase C): erzwingt den Stern-Badge auch OHNE `instance` (die
   * Zelle zeigt die schlichte Grundmenge, hat aber ≥1 verzauberte Variante in der Instanz-Tasche).
   * Nur die Anzeige — die eigentliche Gruppierung übernimmt `VariantContainerCell`.
   */
  hasVariants?: boolean;
  /**
   * Öffnet die Varianten-Tasche (Modal) statt des gepinnten Tooltips (nur gesetzt, wenn diese
   * Zelle als Container fungiert — `VariantContainerCell` reicht das durch). Shift-Klick bleibt
   * unberührt (feuert weiterhin `onShiftClick`, falls gesetzt).
   */
  onOpenPouch?: () => void;
  /**
   * Sammel-Funkel (Welle PP): zeigt einen kleinen „NEU"-Punkt oben rechts — nur vom Inventar
   * gesetzt (CharacterPage), wenn der Spieler dieses Basis-Item zum ersten Mal überhaupt besitzt
   * (`state.discoveredItems`) UND die Zelle noch nicht gehovert/geklickt wurde (localStorage,
   * s. util/discoveryBadge.ts). Andere Aufrufer (Shop/Bank/Paperdoll/Tooltip) lassen dies
   * unverändert `undefined` — kein Verhaltensunterschied dort.
   */
  newBadge?: boolean;
  /** Quittiert den „NEU"-Badge (Hover/Klick) — nur relevant, wenn `newBadge` true ist. */
  onNewBadgeSeen?: () => void;
  /**
   * Task #323 (Mass-Sell): Auswahl-Modus-Override — ERSETZT bei Klick komplett das normale
   * Tooltip-Pin-/Pouch-Verhalten (Checkbox-Auswahl statt Item-Inspektion) und unterdrückt zusätzlich
   * den Hover-Tooltip (sonst poppt er während schnellem Auswahl-Klicken störend auf). Rein additiv —
   * ohne gesetzten Prop verhält sich die Zelle 1:1 wie bisher (alle bestehenden Aufrufer unberührt).
   */
  onCellClick?: (e: React.MouseEvent) => void;
  /** Task #323: goldener Auswahl-Glow, wenn diese Zelle im Mass-Sell-Modus angehakt ist. */
  selected?: boolean;
  /** Task #323: zusätzlicher Inhalt (Checkbox + Mengen-Badge), oben auf der Zelle gerendert — die
   *  Positionierung übernimmt der Aufrufer per eigenem CSS (freie obere-rechte/untere-rechte Ecke,
   *  s. mass-sell.css), ItemCell selbst bleibt dazu agnostisch. */
  overlay?: React.ReactNode;
}

/**
 * Einheitliche Item-Darstellung: Pixelart-Bild → Emoji-Fallback → Platzhalter,
 * mit seltenheits-farbigem Rahmen. Hover ~0,5s (mit Shift sofort, inkl. Vergleich) oder Linksklick
 * öffnet das große RPG-Tooltip am Cursor; optional Drag-Quelle.
 */
export function ItemCell({
  itemId,
  qty,
  actions = [],
  draggable = false,
  onDragItem,
  className = "",
  instance,
  onShiftClick,
  hasVariants = false,
  onOpenPouch,
  newBadge = false,
  onNewBadgeSeen,
  onCellClick,
  selected = false,
  overlay,
}: ItemCellProps): JSX.Element | null {
  const { t, tr } = useI18n();
  const tooltip = useItemTooltip();
  const state = useGameStateMaybe();
  const timerRef = useRef<number | null>(null);
  const posRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Einmaliges kurzes Funkeln beim ersten Erscheinen dieser Zelle in „NEU"-Zustand (danach nur
  // noch der statische Punkt) — s. util/discoveryBadge.ts `consumeSparkleOnce` (Session-Flag,
  // wie Toasts.tsx' `hasFiredFenceToast`). Lazy-Init: läuft genau einmal pro Mount.
  const [sparkle] = useState(() => newBadge && effectiveFxLevel() !== "off" && consumeSparkleOnce(itemId));

  const item = content.items[itemId];
  if (!item) return null;
  const img = getItemImage(itemId);
  const tier = itemTier(content, itemId);
  // Chef-Test 25.08.2026: "Wenn Requirements fehlen für ein Item im Inventar oder Bank, sollte
  // unten links ein Verbotssymbol sein." Bisher stand die Anforderung nur rot im Tooltip; wer im
  // Lager nach tragbarer Ausrüstung suchte, musste jedes Teil einzeln anfassen. Unten LINKS ist die
  // freie Ecke (Stern oben links, NEU-Punkt oben rechts, Menge unten rechts). Nur Ausrüstung mit
  // Anforderungen, und nur mit Spielstand im Kontext (Zeremonien/Vorschauen ohne State: kein Badge).
  const gesperrt = state !== null && item.type === "equipment" && !!item.requirements && !meetsRequirements(state, item);

  const clearTimer = (): void => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      className={`item-cell ${rarityClass(item.rarity)}${selected ? " item-cell-selected" : ""} ${className}`.trim()}
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/hearthforge-item", itemId);
        e.dataTransfer.effectAllowed = "move";
        clearTimer();
        tooltip.hide();
        onDragItem?.(itemId);
      }}
      onDragEnd={() => onDragItem?.(null)}
      onMouseMove={(e) => {
        posRef.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseEnter={(e) => {
        posRef.current = { x: e.clientX, y: e.clientY };
        clearTimer();
        // Task #323: im Mass-Sell-Auswahlmodus (onCellClick gesetzt) KEIN Hover-Tooltip — würde
        // beim schnellen Durchklicken der Auswahl nur stören.
        if (!onCellClick) {
          // Shift+Hover = bewusster Vergleichs-Wunsch → Tooltip (mit WoW-Vergleich, s. ItemTooltipOverlay
          // `showCompare = shift && …`) SOFORT; normaler Hover mit kurzem Delay (≤1s).
          const delay = e.shiftKey ? 0 : HOVER_DELAY_MS;
          timerRef.current = window.setTimeout(() => {
            tooltip.show(itemId, posRef.current.x, posRef.current.y, actions, instance);
          }, delay);
        }
        // Sammel-Funkel: ein bloßes Hover reicht schon, um den „NEU"-Badge zu quittieren (kein
        // Warten auf den 1s-Tooltip-Delay nötig).
        if (newBadge) onNewBadgeSeen?.();
      }}
      onMouseLeave={() => {
        clearTimer();
        tooltip.hide();
      }}
      onClick={(e) => {
        clearTimer();
        if (onCellClick) {
          onCellClick(e);
          return;
        }
        if (newBadge) onNewBadgeSeen?.();
        if (e.shiftKey && onShiftClick) {
          tooltip.hide();
          onShiftClick();
          return;
        }
        if (onOpenPouch) {
          tooltip.hide();
          onOpenPouch();
          return;
        }
        tooltip.pin(itemId, e.clientX, e.clientY, actions, instance);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        clearTimer();
        if (onCellClick) {
          onCellClick(e as unknown as React.MouseEvent);
          return;
        }
        if (newBadge) onNewBadgeSeen?.();
        if (e.shiftKey && onShiftClick) {
          tooltip.hide();
          onShiftClick();
          return;
        }
        if (onOpenPouch) {
          tooltip.hide();
          onOpenPouch();
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        tooltip.pin(itemId, rect.left + rect.width / 2, rect.top + rect.height / 2, actions, instance);
      }}
    >
      {img ? (
        <img src={img} alt="" className="item-cell-img pixelart" draggable={false} loading="lazy" decoding="async" />
      ) : item.icon ? (
        <span className="item-cell-emoji">{item.icon}</span>
      ) : (
        <span className="item-cell-name">{tr(item.name)}</span>
      )}
      {qty !== undefined && qty > 1 && (
        // Stack-Cap ist jetzt 9999 (RR-Befund, Welle SS): eine vierstellige Zahl in der winzigen
        // Zell-Ecke braucht etwas mehr Luft als 1-3 Stellen — eigener Modifier statt Kürzung
        // ("9,9k" ist ausdrücklich NICHT gewünscht, echte Zahlen bleiben echte Zahlen).
        <span className={`item-cell-qty${qty >= 1000 ? " item-cell-qty--wide" : ""}`}>{qty}</span>
      )}
      {(hasVariants || (instance && (instance.affixes.length > 0 || !!instance.suffix))) && (
        <span className="item-cell-inst-badge" aria-hidden="true">
          {/* claude:2026-10-23T18:20:00+02:00 — 1.4.0 A12: Runen-Zeichen statt Stern (Sterne zeigen jetzt die Stufe).
              Bis das Bild `icon_enchant_rune` geliefert ist, ein CSS-Rautenzeichen. */}
          {getUiIcon("icon_enchant_rune")
            ? <img src={getUiIcon("icon_enchant_rune")!} alt="" className="item-cell-inst-badge-img" loading="lazy" decoding="async" />
            : <span className="item-cell-rune-mark" />}
        </span>
      )}
      {/* claude:2026-10-23T18:20:00+02:00 — 1.4.0 ST: Stufen-Sterne oben mittig (Chef: Sterne, halbe Sterne). */}
      {tier !== null && <TierStars tier={tier} className="item-cell-stars" color={tier >= 13 ? `var(--rar-${item.rarity ?? "godly"})` : undefined} />}
      {gesperrt && <span className="item-cell-req-badge" aria-hidden="true" />}
      {/* claude:2026-10-23T17:30:00+02:00 — 1.4.0 ZH (Chef 23.10.): Textmarke „2H“ unten links für Zweihandwaffen;
          die Anforderungs-Warnung belegt dieselbe Ecke und hat Vorrang. */}
      {!gesperrt && item.twoHanded && (
        <span className="item-cell-2h-badge" title={t("item.twoHanded")}>
          {t("item.twoHandedShort")}
        </span>
      )}
      {newBadge && (
        <span className="item-cell-new-badge" title={t("inv.newBadge.title")}>
          {sparkle && <span className="item-cell-new-sparkle" aria-hidden="true" />}
        </span>
      )}
      {overlay}
    </div>
  );
}
