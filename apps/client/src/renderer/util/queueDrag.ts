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
