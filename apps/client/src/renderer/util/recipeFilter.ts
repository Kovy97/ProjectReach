// claude:2026-10-31T16:34:28+01:00 — Ideen-Welle 1.4.2: Rezeptseiten-Filter (Herstellbar/Freigeschaltet) + Freischaltungs-Text.
// Eigener kleiner localStorage-Schlüssel (nicht uiPrefs.ts); jeder Zugriff in try/catch.

const KEY = "gr.recipeFilter.v1";

export interface RecipeFilter {
  craftable: boolean;
  unlocked: boolean;
}

export function readRecipeFilter(): RecipeFilter {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { craftable: false, unlocked: false };
    const o = JSON.parse(raw) as Partial<RecipeFilter>;
    return { craftable: o.craftable === true, unlocked: o.unlocked === true };
  } catch {
    return { craftable: false, unlocked: false };
  }
}

export function writeRecipeFilter(f: RecipeFilter): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(f));
  } catch {
    /* Speicher gesperrt: Filter gilt nur für diese Sitzung */
  }
}

/** „A, B, C und 2 weitere“: höchstens `max` Namen, der Rest als Zähler (Key `unlock.andMore`). */
export function unlockNamesText(ids: string[], nameOf: (id: string) => string, t: (key: string) => string, max = 3): string {
  const names = ids.slice(0, max).map(nameOf).join(", ");
  const rest = ids.length - max;
  return rest > 0 ? `${names} ${t("unlock.andMore").replace("{n}", String(rest))}` : names;
}
