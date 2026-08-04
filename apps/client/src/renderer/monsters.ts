/**
 * Auto-Discovery der Monster-Bilder: Lege einfach `assets/monsters/<monsterId>.png`
 * ab — die Datei wird automatisch verknüpft (kein Code-Eintrag nötig). Fehlt ein
 * Bild, rendert der Kampf den Platzhalter.
 */
const MONSTER_IMAGES = import.meta.glob<string>("./assets/monsters/*.{png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
});

const BY_ID: Record<string, string> = {};
for (const [path, url] of Object.entries(MONSTER_IMAGES)) {
  const id = path.split("/").pop()?.replace(/\.(png|webp)$/, "");
  if (id) BY_ID[id] = url;
}

/** Bild-URL zu einer Monster-ID (oder null, falls keins hinterlegt). */
export function getMonsterSrc(monsterId: string | null): string | null {
  if (!monsterId) return null;
  // Slayer-Tower-Duplikate (tower_<x>) sind Kopien eines Zonen-Monsters und nutzen dessen Art.
  // Dungeon-Rework-Spec §5.4/§5.6: dg_<x>-Varianten (Dungeon-Aufschlag für warband/crypt) teilen
  // ebenso die Art ihrer Basis — dasselbe Alias-Muster, nur der andere Präfix.
  return BY_ID[monsterId] ?? BY_ID[monsterId.replace(/^tower_/, "")] ?? BY_ID[monsterId.replace(/^dg_/, "")] ?? null;
}

/**
 * Elite-/World-Spawn-Kunst (design/elite-spawns-concept.md §2.1/§4, „volle eigene Elite-Art wie bei
 * allen anderen Kreaturen"): die vom Engine-Contract synthetisierte `MonsterDef` behält bewusst die
 * `id` des Basis-Monsters (Kill-Credit-Konsistenz, s. engine/elites.ts `eliteScaledMonster`-JSDoc) —
 * eine eigene Elite-Grafik kann sich also NICHT über `monster.id` auflösen. Dieselbe Auto-Discovery
 * wie überall (einfach `assets/monsters/<variantId>.png` ablegen), nur zweistufig: Varianten-Kunst
 * zuerst, Fallback auf die Basis-Monster-Art, solange der Asset-Pipeline-Schritt noch aussteht —
 * genau das „leuchtet automatisch auf, sobald der Content landet"-Verhalten, das Phase 3 (UI) gegen
 * den noch leeren `content.elites`-Katalog braucht.
 */
export function getEliteMonsterSrc(variantId: string, baseMonsterId: string | null): string | null {
  return getMonsterSrc(variantId) ?? getMonsterSrc(baseMonsterId);
}
