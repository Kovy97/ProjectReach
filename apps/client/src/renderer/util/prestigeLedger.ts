import type { PrestigePointsLedger } from "@hearthforge/engine";
import { formatNum } from "./format";

// claude:2026-10-18T20:30:00+02:00 — Gemeinsame Zeilen der Narben-Aufschlüsselung (Prestige Welle E2): Altar-Vorschau
// und Bilanz-Fenster lesen dieselben Zeilen mit denselben Texten (`prestige.points.<key>`).

export interface LedgerRow {
  key: string;
  label: string;
  value: number;
  kind: "line" | "subtotal" | "mult" | "total";
}

/** Zeilen in Anzeige-Reihenfolge; Zeilen mit 0 Narben entfallen, Zwischensumme und Zuschlag nur mit Multiplikator. */
export function buildLedgerRows(ledger: PrestigePointsLedger, t: (key: string) => string): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const line of ledger.lines) {
    if (line.points <= 0) continue;
    rows.push({
      key: line.key,
      label: t(`prestige.points.${line.key}`).replace("{n}", formatNum(line.amount ?? 0)),
      value: line.points,
      kind: "line",
    });
  }
  if (ledger.fromMult > 0) {
    rows.push({ key: "subtotal", label: t("prestige.points.subtotal"), value: ledger.subtotal, kind: "subtotal" });
    rows.push({
      key: "mult",
      label: t("prestige.points.mult").replace("{mult}", formatNum(1 + ledger.mult)),
      value: ledger.fromMult,
      kind: "mult",
    });
  }
  rows.push({ key: "total", label: t("prestige.points.total"), value: ledger.total, kind: "total" });
  return rows;
}
