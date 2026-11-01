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
  // claude:2026-10-30T20:20:00+01:00 — K1: Laufquellen und Sammlung getrennt; Zwischensumme und Faktor stehen direkt unter den Laufquellen
  // (der Faktor wirkt nur auf sie), die einmaligen Sammlungszeilen folgen danach.
  const once = new Set<string>(["pets", "bestiary", "achievements", "raidFirst"]);
  const firstOnce = ledger.lines.findIndex((l) => once.has(l.key) && l.points > 0);
  const pushFactor = (): void => {
    if (ledger.fromMult <= 0) return;
    rows.push({ key: "subtotal", label: t("prestige.src.runSubtotal"), value: ledger.runSubtotal, kind: "subtotal" });
    rows.push({
      key: "mult",
      label: t("prestige.points.mult").replace("{mult}", formatNum(1 + ledger.mult)),
      value: ledger.fromMult,
      kind: "mult",
    });
  };
  ledger.lines.forEach((line, idx) => {
    if (idx === firstOnce) pushFactor();
    if (line.points <= 0) return;
    rows.push({
      key: line.key,
      label: t(`prestige.points.${line.key}`).replace("{n}", formatNum(line.amount ?? 0)),
      value: line.points,
      kind: "line",
    });
  });
  if (firstOnce < 0) pushFactor();
  rows.push({ key: "total", label: t("prestige.points.total"), value: ledger.total, kind: "total" });
  return rows;
}
