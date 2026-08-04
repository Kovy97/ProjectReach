const MAX_LEVEL = 99;

/**
 * Vorberechnete XP-Schwellen (RuneScape/Melvor-Stil). Index = Level, Wert =
 * Gesamt-XP, um dieses Level zu erreichen. Einmal beim Laden gebaut → O(1)-Zugriff.
 */
const XP_TABLE: number[] = buildXpTable();

function buildXpTable(): number[] {
  const table: number[] = [0, 0]; // Level 0 & 1 = 0 XP
  let acc = 0;
  for (let n = 1; n < MAX_LEVEL; n++) {
    acc += Math.floor(n + 300 * Math.pow(2, n / 7));
    table[n + 1] = Math.floor(acc / 4);
  }
  return table;
}

/** Gesamt-XP, um `level` gerade erreicht zu haben (Level 1 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return XP_TABLE[MAX_LEVEL]!;
  return XP_TABLE[level]!;
}

/**
 * Aktuelles Level aus gesammelter XP. Hard-Cap bei MAX_LEVEL.
 * PERF (Offline-Catch-up 2026-07-22): Binärsuche statt Linearsuche — levelFromXp läuft im
 * Tick-Hot-Loop dutzendfach (computeStats/Mastery/completeAction); bei hohen Leveln lief die
 * alte Schleife ~90 Iterationen. SEMANTISCH EXAKT identisch: größtes `level` mit
 * `XP_TABLE[level] <= xp` (min. 1, Cap MAX_LEVEL); nicht-endliche/negative XP → 1 wie zuvor
 * (jeder Vergleich mit NaN ist false → der Guard fällt auf Level 1). Per Vollvergleich gegen
 * die alte Implementierung über alle Tabellen-Grenzwerte ±1 abgesichert (leveling.test.ts).
 */
export function levelFromXp(xp: number): number {
  // Guard: unterhalb der Level-2-Schwelle (auch NaN/negativ) → Level 1, wie die alte Schleife.
  if (!(XP_TABLE[2]! <= xp)) return 1;
  let lo = 2; // Invariante: XP_TABLE[lo] <= xp
  let hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (XP_TABLE[mid]! <= xp) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
