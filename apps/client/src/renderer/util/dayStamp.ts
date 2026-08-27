/**
 * Lokaler Tagesstempel + Mitternachts-Countdown — gezogen aus QuestsPage.tsx (die Dailies
 * brauchten das seit 0.2.0 als einzige Aufrufer), jetzt geteilt mit der Taverne
 * (design/1.2.0-alive/taverne-spec-technik.md §6: „todayStamp/msUntilMidnight aus QuestsPage in
 * ein util/dayStamp.ts ziehen, beide Aufrufer"). Reine Funktionen, kein State/Content-Zugriff.
 */

/** Returns today as a YYYYMMDD number in local time. */
export function todayStamp(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Milliseconds until the next local midnight. */
export function msUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}
