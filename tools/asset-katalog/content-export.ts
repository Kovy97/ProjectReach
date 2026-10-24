// claude:2026-10-24T13:08:29+02:00 — Asset-Katalog: liest den Content-Katalog (nur lesend) und schreibt
// eine kleine JSON-Übersicht für die Index-Erstellung (Namen, Seltenheit, Slot, Zuordnung Bild ↔ Content-ID).
// Aufruf (aus apps/client): node node_modules/tsx/dist/cli.mjs ../../tools/asset-katalog/content-export.ts <ausgabe.json>
import { writeFileSync } from "node:fs";
import { content } from "../../packages/content/src/index.ts";
import { RARITY_LABEL } from "../../packages/shared/src/index.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const c = content as any;
type Named = { en?: string; de?: string } | undefined;
const nm = (n: Named) => ({ en: n?.en ?? "", de: n?.de ?? "" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vals = (o: any): any[] => (Array.isArray(o) ? o : o && typeof o === "object" ? Object.values(o) : []);

const out = {
  items: vals(c.items).map((i) => ({
    id: i.id,
    name: nm(i.name),
    rarity: i.rarity ?? null,
    slot: i.slot ?? null,
    type: i.type ?? null,
    variantOf: i.variantOf ?? null,
  })),
  monsters: vals(c.monsters).map((m) => ({ id: m.id, name: nm(m.name), zone: m.zone ?? null, family: m.family ?? null, level: m.level ?? null })),
  elites: vals(c.elites).map((e) => ({ id: e.id, name: nm(e.name), zone: e.zone ?? null, baseMonsterId: e.baseMonsterId ?? null })),
  pets: vals(c.pets).map((p) => ({ id: p.id, name: nm(p.name) })),
  zones: vals(c.zones).map((z) => ({ id: z.id, name: nm(z.name) })),
  dungeons: vals(c.dungeons).map((d) => ({ id: d.id, name: nm(d.name), zone: d.zone ?? null })),
  skills: vals(c.skills).map((s) => ({ id: s.id, name: nm(s.name) })),
  sets: vals(c.sets).map((s) => ({ id: s.id, name: nm(s.name), pieces: s.pieces ?? [] })),
  // claude:2026-10-24T13:21:53+02:00 — Seltenheitsnamen aus dem Spiel (Reihenfolge = Rang)
  rarities: Object.entries(RARITY_LABEL).map(([id, n]) => ({ id, name: nm(n as Named) })),
};

const file = process.argv[2];
if (!file) {
  console.error("Ausgabedatei fehlt");
  process.exit(2);
}
writeFileSync(file, JSON.stringify(out));
console.log(`content: ${out.items.length} items, ${out.monsters.length} monster, ${out.elites.length} eliten, ${out.pets.length} begleiter`);
