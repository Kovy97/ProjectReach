// codex:2026-09-10T10:35:24+02:00 — Presentation geometry only: offsets/heights share the
// queue scroll body's coordinate space. Reforged rows have zero inter-row gap.
export interface QueueDragGeometry {
  fromVi: number;
  overVi: number;
  rowTops: readonly number[];
  rowHeights: readonly number[];
}

// codex:2026-09-10T10:35:24+02:00 — Moving down removes the source height before the target
// and inserts AFTER the target row. Its old top is correct only for equal-height rows.
// Both the insertion marker and release animation consume this same destination.
export function queueDropTop({ fromVi, overVi, rowTops, rowHeights }: QueueDragGeometry): number {
  const count = Math.min(rowTops.length, rowHeights.length);
  if (count === 0) return 0;
  const bound = (index: number): number => Math.max(0, Math.min(count - 1, Number.isFinite(index) ? Math.trunc(index) : 0));
  const from = bound(fromVi);
  const to = bound(overVi);
  const top = rowTops[to]!;
  return from < to ? top + rowHeights[to]! - rowHeights[from]! : top;
}

// claude:2026-10-25T16:48:00+01:00 — Spieler-Report 25.10. („präzise Anpassungen nicht möglich“): Zielplatz aus der MITTE der gezogenen
// Zeile statt aus der Zeigerposition, symmetrisch für beide Richtungen. Vorher sprang die Zeile beim Hochziehen schon um
// einen Platz, sobald der Zeiger die eigene Zeilenmitte verließ (Ziel = letzte Zeile mit Mitte ≤ Zeiger, das ist nach
// oben eins zu weit), und je nach Griffpunkt lag das Ziel bis zu eine halbe Zeile neben der sichtbaren Zeile.
// Ziel = Anzahl der ANDEREN Zeilen, deren Mitte über der Mitte der gezogenen Zeile liegt; genau das ist der Index nach
// `moveQueueItem(from, to)` (splice raus, splice rein).
export interface QueueDropIndexInput {
  fromVi: number;
  rowTops: readonly number[];
  rowHeights: readonly number[];
  /** Verschiebung der gezogenen Zeile seit dem Griff (Zeigerweg plus Scrollweg der Liste), in px. */
  deltaY: number;
}

export function queueDropIndex({ fromVi, rowTops, rowHeights, deltaY }: QueueDropIndexInput): number {
  const count = Math.min(rowTops.length, rowHeights.length);
  if (count === 0) return 0;
  const from = Math.max(0, Math.min(count - 1, Number.isFinite(fromVi) ? Math.trunc(fromVi) : 0));
  const center = rowTops[from]! + rowHeights[from]! / 2 + (Number.isFinite(deltaY) ? deltaY : 0);
  let to = 0;
  for (let i = 0; i < count; i++) {
    if (i !== from && rowTops[i]! + rowHeights[i]! / 2 < center) to++;
  }
  return to;
}

