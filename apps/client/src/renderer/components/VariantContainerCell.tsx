import { useState } from "react";
import type { ItemInstance } from "@hearthforge/shared";
import { ItemCell } from "./ItemCell";
import type { ItemAction } from "./ItemTooltip";
import { VariantPouchModal, groupBySig } from "./VariantPouchModal";

export interface VariantContainerCellProps {
  itemId: string;
  /** Menge der schlichten Grundversion (Stack-Anzahl); `undefined`/`0` = keine im Besitz. */
  qty?: number;
  /** Verzauberte Varianten-Instanzen dieses Basis-Items (`groupInstancesByBase`-Ergebnis). Leer →
   *  diese Zelle verhält sich wie eine normale `ItemCell` (kein Stern, kein Modal). */
  instances: ItemInstance[];
  /** Aktionen für die Grundversion (im Modal UND — solange keine Varianten existieren — direkt am
   *  gepinnten Tooltip der schlichten Zelle). */
  plainActions?: ItemAction[];
  /** Baut die Aktionsliste für einen Varianten-Stack im Modal (Equip/Verkaufen/Einlagern/Entnehmen,
   *  kontextabhängig vom Aufrufer — Inventar/Shop/Bank). */
  variantActionsFor: (inst: ItemInstance) => ItemAction[];
  draggable?: boolean;
  onDragItem?: (itemId: string | null) => void;
  onShiftClick?: () => void;
  className?: string;
  /** Sammel-Funkel (Welle PP) — durchgereicht an die zugrundeliegende `ItemCell`, s. dortiges JSDoc. */
  newBadge?: boolean;
  onNewBadgeSeen?: () => void;
}

/**
 * Container-Zelle je Basis-Item (Task #246 Phase C, Chef-Vorgabe): zeigt die schlichte Grundmenge
 * wie eine normale `ItemCell` — trägt aber einen STERN oben links, sobald es ≥1 verzauberte Variante
 * in der Instanz-Tasche gibt (kein eigener Container-Rahmen nötig). Ein Klick öffnet dann NICHT den
 * gepinnten Tooltip, sondern die `VariantPouchModal` (Grundversion + gestapelte Varianten, jede
 * Zeile einzeln anklickbar). Ohne Varianten verhält sich diese Zelle 1:1 wie eine normale `ItemCell`
 * (kein Verhaltensunterschied) — Aufrufer können sie also überall dort einsetzen, wo bisher eine
 * plain `ItemCell` für ein potenziell varianten-tragendes Basis-Item stand.
 */
export function VariantContainerCell({
  itemId,
  qty,
  instances,
  plainActions = [],
  variantActionsFor,
  draggable,
  onDragItem,
  onShiftClick,
  className,
  newBadge,
  onNewBadgeSeen,
}: VariantContainerCellProps): JSX.Element | null {
  const [pouchOpen, setPouchOpen] = useState(false);

  // Keine Varianten → ganz normale Zelle (schlichte Grundmenge).
  if (instances.length === 0) {
    return (
      <ItemCell
        itemId={itemId}
        qty={qty}
        actions={plainActions}
        draggable={draggable}
        onDragItem={onDragItem}
        onShiftClick={onShiftClick}
        className={className}
        newBadge={newBadge}
        onNewBadgeSeen={onNewBadgeSeen}
      />
    );
  }

  // Chef-Fix: die Varianten-Tasche (Modal) soll NUR bei mehr als EINER Variation aufgehen. Anzahl
  // distinkter Versionen = schlichte Grundmenge (falls im Besitz) + unique Varianten-Signaturen
  // (`groupBySig` fasst identische Varianten zu einer zusammen). Bei genau EINER Version — d.h. nur
  // eine einzelne Varianten-Signatur ohne Grundmenge — verhält sich die Zelle wie eine normale
  // `ItemCell` mit dieser Instanz (Klick pinnt direkt ihren Tooltip, kein Modal).
  const variantStacks = groupBySig(instances);
  const versionCount = ((qty ?? 0) > 0 ? 1 : 0) + variantStacks.length;
  if (versionCount <= 1) {
    const only = variantStacks[0]!;
    return (
      <ItemCell
        itemId={itemId}
        qty={only.count}
        instance={only.representative}
        actions={variantActionsFor(only.representative)}
        draggable={draggable}
        onDragItem={onDragItem}
        onShiftClick={onShiftClick}
        className={className}
        newBadge={newBadge}
        onNewBadgeSeen={onNewBadgeSeen}
      />
    );
  }

  return (
    <>
      <ItemCell
        itemId={itemId}
        // Chef-Fix 2026-07-13: Container-Zelle zeigt die GESAMT-Stückzahl (Grundmenge + jede
        // Instanz zählt 1) — vorher stand bei reinen Varianten-Beständen (qty 0) gar keine Zahl.
        qty={(qty ?? 0) + instances.length}
        hasVariants
        onOpenPouch={() => setPouchOpen(true)}
        draggable={draggable}
        onDragItem={onDragItem}
        onShiftClick={onShiftClick}
        className={className}
        newBadge={newBadge}
        onNewBadgeSeen={onNewBadgeSeen}
      />
      {pouchOpen && (
        <VariantPouchModal
          itemId={itemId}
          plainQty={qty ?? 0}
          instances={instances}
          plainActions={plainActions}
          variantActionsFor={variantActionsFor}
          onClose={() => setPouchOpen(false)}
        />
      )}
    </>
  );
}
