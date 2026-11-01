/**
 * Auto-Discovery der Sidebar-Nav-Icons: `assets/sidebar/sidebaricon_<name>.png`.
 * `<name>` entspricht der Nav-Seiten-ID (Alias: skills-overview → overall).
 * Fehlt ein Bild, fällt die Sidebar auf das Emoji aus `navigation.ts` zurück.
 */
const SIDEBAR_IMAGES = import.meta.glob<string>("./assets/sidebar/sidebaricon_*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_NAME: Record<string, string> = {};
for (const [path, url] of Object.entries(SIDEBAR_IMAGES)) {
  const name = path
    .split("/")
    .pop()
    ?.replace(/^sidebaricon_/, "")
    .replace(/\.(png|webp)$/, "");
  if (name) BY_NAME[name] = url;
}

/**
 * Ausweich-Namen, falls für eine Seiten-ID (noch) kein eigenes Icon existiert.
 * - skills-overview → overall (historischer Dateiname).
 * - newhaven → city: der Lager-Screen erbt vorerst das Stadt-Icon der stillgelegten City-Seite —
 *   thematisch passend (Siedlung) und im Citadel-Stil, statt eines Emoji-Bruchs in der Sidebar.
 *   Legt der Chef `sidebaricon_newhaven.webp` ab, gewinnt es automatisch (Direkt-Treffer zuerst).
 */
// claude:2026-10-30T20:31:00+01:00 — hub → city: Hauptmenü-Eintrag nutzt das Stadt-Symbol, bis ein eigenes `sidebaricon_hub` liegt.
const ALIAS: Record<string, string> = { "skills-overview": "overall", newhaven: "city", hub: "city" };

/** Bild-URL für eine Nav-Seiten-ID (oder null, falls keins hinterlegt). Direkter Dateiname zuerst,
 *  danach der Alias — so übernimmt ein nachgeliefertes Icon ohne Code-Änderung. */
export function getSidebarIcon(pageId: string): string | null {
  const alias = ALIAS[pageId];
  return BY_NAME[pageId] ?? (alias ? BY_NAME[alias] ?? null : null);
}
