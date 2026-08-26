import { useState } from "react";
import type { ReactNode } from "react";
import { useI18n } from "../i18n";
// Direkt importiert statt über styles/index.css eingehängt — Kollisions-Schutz, gleiches Muster
// wie components/ActionQueuePanel.tsx + styles/action-queue.css.
import "../styles/quantity-picker.css";

/**
 * Einheitliche Mengen-Presets (Task #314 B2, ergänzt UI-Brainstorm 3.1 "Drei verschiedene
 * Mengen-Presets für dieselbe 'Wie viele?'-Frage"): Shop-Kauf hatte [1,5,25,100], Shop-Verkauf
 * [1,10,100] — jetzt EINE gemeinsame Reihe für beide. Bewusst NICHT für die Skill-/Kampf-Queue
 * verwendet (`CRAFT_TARGET_PRESETS` bleibt in packages/shared, kommt separat in Welle #315).
 */
export const QTY_PRESETS = [1, 10, 25, 100] as const;

export interface QuantityPickerProps {
  /** Feste Mengenknöpfe (z.B. `QTY_PRESETS`) — sofort ausgeführt bei Klick. */
  presets: readonly number[];
  /**
   * Wird für einen Preset-Klick UND eine bestätigte freie Eingabe aufgerufen. `atFront` (Task
   * #327, Priority-UI): true bei Shift-Klick (bzw. Shift-Enter im Freitext-Feld) — reines
   * Signal-Durchreichen des Klick-Events, kein neuer State/Tick-Abo. Aufrufer, die eine
   * "sofort starten"-Variante kennen (z.B. MonsterCard → `enqueueFightAtFront`), werten es aus;
   * Aufrufer ohne dieses Konzept (Shop-Kauf/-Verkauf, Bank) ignorieren den zweiten Parameter
   * einfach — bestehender Code bleibt unverändert kompatibel (TS erlaubt Callbacks mit weniger
   * Parametern als der Funktionstyp deklariert).
   */
  onPick: (qty: number, atFront: boolean) => void;
  /** Deckelt sichtbare Presets (nur ≤max) + klemmt die freie Eingabe. `undefined` = kein Deckel
   *  (z.B. Shop-Kauf, wo allein das Gold begrenzt — `buyItem` kauft ohnehin nur, was leistbar ist). */
  max?: number;
  /** Zusätzlicher Rundum-Knopf, der `max` in einem Klick wählt (z.B. "Alles verkaufen"/"Alle
   *  entnehmen") — nur sichtbar, wenn `max` gesetzt UND > 0. */
  maxLabel?: string;
  /**
   * Task #315 (Kampf-Queue-UI) — eigenständiger "unbegrenzt"-Knopf (z.B. "∞" für eine endlos
   * laufende Kampf-Queue), unabhängig von `max`/`maxLabel` (die "kompletten Bestand aufbrauchen"
   * meinen, nicht "für immer weiterlaufen"). Beide Props müssen gesetzt sein, sonst kein Button —
   * rein additiv, ändert nichts an den bestehenden Shop-/Bank-Aufrufern.
   */
  infiniteLabel?: string;
  /** s. `onPick`-JSDoc — `atFront` ist dasselbe Shift-Signal, nur für den ∞-Knopf. */
  onInfinite?: (atFront: boolean) => void;
  /** Pro Preset zusätzlich deaktivieren (z.B. zu wenig Gold). */
  isPresetDisabled?: (qty: number) => boolean;
  /** Eigener Button-Inhalt je Preset (z.B. Kosten-Zeile im Shop); Standard: "{n}×". */
  renderPreset?: (qty: number) => ReactNode;
  /** Optionaler Hover-Titel je Preset (z.B. "5× 5 = 25"). */
  presetTitle?: (qty: number) => string;
  /** Deaktiviert das gesamte Widget (z.B. volles Inventar/nichts zu verkaufen). */
  disabled?: boolean;
  className?: string;
}

/**
 * Wiederverwendbares "Wie viele?"-Mengen-Widget (Task #314, Chef-GO "Bank-Sanierung" B2): feste
 * Presets + FREIE Zahleneingabe an EINER Stelle gepflegt, statt an drei bisher unterschiedlichen
 * Interaktionen (Shop-Kauf/-Verkauf hatten je eigene Preset-Reihen und KEINE freie Eingabe; die
 * Bank kannte nur "1" oder "alles", keine Zwischenmenge). Reine Anzeige-/Eingabe-Komponente — führt
 * selbst nichts aus außer `onPick(qty)` zu rufen, der Aufrufer entscheidet was das bedeutet
 * (kaufen/verkaufen/einlagern/entnehmen). Exportiert generisch (keine Shop-/Bank-Annahmen), damit
 * Welle #315 (Skill-/Kampf-Queue-Mengen) es später ebenfalls nutzen kann.
 */
export function QuantityPicker({
  presets,
  onPick,
  max,
  maxLabel,
  infiniteLabel,
  onInfinite,
  isPresetDisabled,
  renderPreset,
  presetTitle,
  disabled = false,
  className,
}: QuantityPickerProps): JSX.Element {
  const { t } = useI18n();
  const [custom, setCustom] = useState("");

  const visiblePresets = max === undefined ? presets : presets.filter((p) => p <= max);

  const confirmCustom = (atFront: boolean): void => {
    const n = Math.floor(Number(custom));
    if (!Number.isFinite(n) || n <= 0) return;
    onPick(max !== undefined ? Math.min(n, max) : n, atFront);
    setCustom("");
  };

  return (
    <div className={`qty-picker${className ? ` ${className}` : ""}`}>
      <div className="qty-picker-presets">
        {visiblePresets.map((q) => (
          <button
            key={q}
            type="button"
            className="btn-iron btn-iron--sm qty-btn"
            disabled={disabled || !!isPresetDisabled?.(q)}
            title={presetTitle?.(q)}
            onClick={(e) => onPick(q, e.shiftKey)}
          >
            {renderPreset ? renderPreset(q) : `${q}×`}
          </button>
        ))}
        {maxLabel !== undefined && max !== undefined && max > 0 && (
          <button
            type="button"
            className="btn-iron btn-iron--sm qty-btn"
            disabled={disabled}
            onClick={(e) => onPick(max, e.shiftKey)}
          >
            {maxLabel}
          </button>
        )}
        {infiniteLabel !== undefined && onInfinite && (
          <button
            type="button"
            className="btn-iron btn-iron--sm qty-btn qty-btn--infinite"
            disabled={disabled}
            onClick={(e) => onInfinite(e.shiftKey)}
          >
            {infiniteLabel}
          </button>
        )}
      </div>
      <div className="qty-picker-custom">
        <input
          type="number"
          min={1}
          max={max}
          className="qty-picker-input"
          placeholder={t("qty.customPlaceholder")}
          aria-label={t("qty.customPlaceholder")}
          value={custom}
          disabled={disabled}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmCustom(e.shiftKey);
          }}
        />
        <button
          type="button"
          className="btn-iron btn-iron--sm qty-picker-confirm"
          disabled={disabled || custom.trim() === ""}
          onClick={(e) => confirmCustom(e.shiftKey)}
        >
          {t("qty.confirm")}
        </button>
      </div>
    </div>
  );
}
