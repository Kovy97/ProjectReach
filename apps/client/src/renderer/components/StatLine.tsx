import type { ReactNode } from "react";

/**
 * Eine Kampf-Stat-Zeile (HP/ATK/DEF/Accuracy/Evasion/Speed …) — EIN geteiltes Format
 * (Chef-Fix 2026-07-05) statt Einzel-Styling je Ort: der Fight-Screen (Fighter-Footer)
 * und die Monster-Auswahlkarte nutzen dieselbe Komponente + `.stat-line`-CSS, damit
 * Icon-Größe/Grid/Schrift überall identisch sind.
 */
export interface StatLineEntry {
  key: string;
  icon: ReactNode;
  label: string;
  /** Optional — Einträge ohne Wert (z.B. der reine Enrage-Icon-Eintrag) zeigen nur das Icon. */
  value?: ReactNode;
  /** Zusätzliche Klasse für diesen einzelnen Eintrag (z.B. `.fighter-hitrange`-Hook). */
  className?: string;
}

export function StatLine({
  entries,
  className = "",
  showLabels = false,
}: {
  entries: StatLineEntry[];
  /** Zusätzliche Klasse(n) auf dem äußeren Grid — hält bestehende Layout-Hooks
   *  (z.B. `fighter-stats`/`monster-card-stats`) für Abstände zum umgebenden Panel nutzbar. */
  className?: string;
  /**
   * Task #273 Chef-Nachbesserung: zeigt das Label zusätzlich sichtbar an (Icon-Zeile oben, Wert
   * groß darunter) statt nur im `title`-Tooltip — die Monster-Auswahlkarte will erkennbare
   * Stat-Namen wie im Charakter-Bildschirm. Default false hält den Fighter-Footer (Fight-Screen,
   * 8 Einträge auf engem Raum) exakt beim bisherigen kompakten Icon+Wert-Layout.
   */
  showLabels?: boolean;
}): JSX.Element {
  return (
    <div className={`stat-line ${className}`.trim()}>
      {entries.map((e) =>
        showLabels ? (
          <span
            key={e.key}
            className={`stat-line-item stat-line-item-labeled ${e.className ?? ""}`.trim()}
            title={e.label}
          >
            <span className="stat-line-item-icon">{e.icon}</span>
            <span className="stat-line-item-label">{e.label}</span>
            {e.value !== undefined && e.value !== "" && (
              <span className="stat-line-item-value">{e.value}</span>
            )}
          </span>
        ) : (
          <span
            key={e.key}
            className={`stat-line-item ${e.className ?? ""}`.trim()}
            title={e.label}
          >
            {e.icon}
            {e.value !== undefined && e.value !== "" ? <> {e.value}</> : null}
          </span>
        ),
      )}
    </div>
  );
}

/**
 * Immune/Inflict-Zeile mit deutlich größeren Status-Icons (Chef-Fix: bisher kaum erkennbar).
 * Geteilt zwischen Monster-Auswahlkarte und (perspektivisch) weiteren Monster-Stat-Anzeigen.
 */
export function StatLineImmune({
  label,
  children,
  warn = false,
  title,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  /** Rot-Ton statt neutral — für „inflicts" (Gegner verursacht Status) statt „immune". */
  warn?: boolean;
  title?: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={`stat-line-immune${warn ? " warn" : ""} ${className}`.trim()} title={title}>
      <span className="stat-line-immune-label">{label}</span>
      <span className="stat-line-immune-icons">{children}</span>
    </div>
  );
}
