/**
 * Auto-Discovery der Pet/Begleiter-Bilder: Lege einfach `assets/pets/<petId>.png`
 * ab — die Datei wird automatisch verknüpft (kein Code-Eintrag nötig). Fehlt ein
 * Bild, rendert die UI den Emoji-Fallback.
 */
const PET_IMAGES = import.meta.glob<string>("./assets/pets/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(PET_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

/** Bild-URL zu einer Pet-ID (oder null, falls keins hinterlegt). */
export function getPetSrc(petId: string | null | undefined): string | null {
  if (!petId) return null;
  return BY_ID[petId] ?? null;
}

/**
 * Chef-Auftrag (2026-07-23): thematisches Zonen-Mapping für die Companion-Karten-Hintergründe
 * (PetGalleryPage) — jedes Pet bekommt das Zonen-Bild der Gegend, zu der sein Herkunfts-Skill
 * bzw. sein Kampf-Flavor am besten passt (s. packages/content/src/index.ts pets-Katalog).
 * Alle 10 nicht-Slayer-Turm-Zonen kommen vor; unbekannte/neue Pet-IDs fallen einfach auf die
 * bisherige Optik zurück (kein Eintrag → kein cardBg, s. PetGalleryPage.tsx).
 */
export const PET_ZONE_ID: Record<string, string> = {
  // ── Sammel-/Gather-Skills ──
  rotbark: "blackthorn", // woodcutting — Blackthorn WOOD, wörtlich ein Wald
  cragmaw: "slagpit", // mining — Erz/Stein passt zur Schlackengrube
  gillrot: "coast", // fishing — Tidewater Shoals
  witherling: "pastures", // farming
  sporewretch: "wildwood", // foraging — Pilze/Unterholz der Wildwald-Jagdgründe
  gloomrat: "borderlands", // thieving — Grenzland-Schmuggel-Flavor
  // ── Verarbeitungs-/Craft-Skills ──
  slagfiend: "slagpit", // smithing — Schlacke = Schmiede-Abfall
  ashgut: "pastures", // cooking — Kochen nahe den Weiden-Höfen
  quillshrike: "highlands", // leatherworking (Feder/Kiel-Räuber) — windige Hochland-Klippen
  flayling: "ashfields", // leatherworking (Häuten/Gerben) — zähes Wesen der Aschfelder
  gemwraith: "idolhall", // jewelcrafting — Edelsteine an Götzenstatuen
  glyphmaw: "idolhall", // runecrafting — Runen/Glyphen in der Götzenhalle
  hemlock: "blackthorn", // herblore — Gift-Vertrauter im Schwarzdornwald
  vellumoth: "crypt", // runecrafting (Pergament-/Sigill-Flavor) — alte Krypta-Schriftrollen
  // ── Kampf-Skills (nach Stil/Flavor) ──
  gorehound: "wildwood", // ranged, Jägerin-Flavor — Wildwald-Jagdgründe
  ironmaw: "highlands", // melee, Wucht/Fels-Flavor — Hochland
  carapace: "coast", // melee, Panzer/Muschel-Flavor — Gezeitenuntiefen
  carrionwing: "ashfields", // ranged, Aasvogel über Schlachtfeldern — Aschfelder
  pyreling: "slagpit", // magic, Feuer — Schlackengrube (Feuer-Hälfte)
  hoarspite: "slagpit", // magic, Frost — Frostkavernen (Frost-Hälfte derselben Zone)
  charnel: "crypt", // magic, Totengräber-Flavor — Krypta
};
