/**
 * Auto-Discovery der Spieler-Portraits: lege `assets/portraits/<id>.png` ab,
 * dann erscheint es automatisch im Portrait-Picker der Charakter-Erstellung.
 * `<id>` = Dateiname ohne Endung (z.B. `char_1`, `char_20_f`).
 *
 * Kein Label, keine Gender-Logik — jedes Bild ist eine eigenständige Auswahl.
 */
const PORTRAIT_IMAGES = import.meta.glob<string>("./assets/portraits/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

// PNG->WebP-Pipeline (2026-07-22): id->url statt Pfad-Rekonstruktion mit hart kodierter Endung
// (schema wie items.ts) — webp gewinnt, falls (Übergang) beide Endungen für dieselbe id vorlägen.
const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(PORTRAIT_IMAGES)) {
  const file = path.split("/").pop() ?? "";
  const id = file.replace(/\.(png|webp)$/, "");
  if (!id) continue;
  if (file.endsWith(".webp") || !BY_ID[id]) BY_ID[id] = url;
}

export interface PortraitEntry {
  id: string;
  url: string;
}

/** Stabil sortierte Liste aller verfügbaren Portraits (Spieler-Auswahl im Picker). */
export function listPortraits(): PortraitEntry[] {
  const entries: PortraitEntry[] = [];
  for (const [id, url] of Object.entries(BY_ID)) {
    // Welle QQ (2026-07-17): NPC-/Slayer-Master-Porträts (npc_*, slayermaster_*) sind Figuren-Art,
    // keine wählbaren Spieler-Portraits — das Spiel selbst zeigt sie direkt per getPortrait(id)
    // (Wächter-Medaillon, Slayer-Seite, Bank/Shop-Begrüßung, …). Ohne diesen Filter tauchten sie
    // im Charakter-Ersteller-/Portrait-Picker-Grid als normale Auswahl auf. `getPortrait()` selbst
    // bleibt UNGEFILTERT — ein Bestands-Save, der vor diesem Fix (versehentlich) ein npc_*-Porträt
    // gewählt hat, rendert unverändert weiter; nur die Auswahl-Liste wird bereinigt.
    if (id.startsWith("npc_") || id.startsWith("slayermaster_")) continue;
    entries.push({ id, url });
  }
  // Stabiles alphanumerisches Sortieren, damit die Reihenfolge deterministisch ist.
  entries.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  return entries;
}

/** Portrait-URL zu einer ID (oder null, falls nicht vorhanden). */
export function getPortrait(id: string | null | undefined): string | null {
  if (!id) return null;
  // Eigenes hochgeladenes Bild (Chef 2026-07-11): `character.portrait` trägt dann direkt eine
  // Data-URL (WebP, ≤640px Kante, s. util/portraitUpload.ts) statt einer Asset-ID — sie wandert
  // im Save mit (auch über Steam Cloud) und wird hier unverändert durchgereicht.
  if (id.startsWith("data:image/")) return id;
  return BY_ID[id] ?? null;
}

// Rückwärts-Compat für alte Aufrufe (portraitId-basiert) — wird nach der Migration entfernt.
/** @deprecated Nutze `getPortrait(character.portrait)` statt `getPortraitSrc(character.portraitId)`. */
export function getPortraitSrc(portraitId: string | null | undefined): string | null {
  return getPortrait(portraitId);
}
