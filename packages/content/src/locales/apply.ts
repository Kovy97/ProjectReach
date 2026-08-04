import type { ContentDB, Locale, LocalizedString } from "@hearthforge/shared";
import { es } from "./es";
import { ptBR } from "./ptBR";
import { fr } from "./fr";
import { ru } from "./ru";
import { zh } from "./zh";

/**
 * Content-Lokalisierungs-Overlay (Task: 5-Sprachen-Fundament, 2026-07).
 *
 * `en`+`de` bleiben WEITERHIN direkt im Content-Katalog (`packages/content/src/index.ts`)
 * gepflegt — das ist die einzige Pflicht (`LocalizedString = { en } & Partial<Record<Locale,…>>`,
 * siehe `packages/shared/src/index.ts`). Die 5 übrigen Locales (es/pt-BR/fr/ru/zh) leben als
 * SCHLANKE Overlay-Tabellen unter `locales/<lang>.ts` (Key-Schema `"<collection>:<id>:<field>"`),
 * damit die ~2600-Zeilen-`index.ts` nicht um Faktor 7 aufgebläht wird. `applyContentLocales`
 * schreibt beim Content-Bootstrap jeden vorhandenen Overlay-Wert in `entity[field][locale]`;
 * fehlende Keys werden übersprungen (→ `resolveText` fällt weiterhin sauber auf `en` zurück).
 *
 * Quelle für Übersetzer: `design/content-strings-en.json` (per `tools/extract-content-strings.mjs`
 * aus genau derselben Feld-Liste unten erzeugt — `collectEnglishStrings` ist deren Read-Pendant,
 * damit Extraktion und Overlay-Anwendung garantiert dasselbe Key-Schema benutzen).
 */

/** Registry: Locale-Code (wie im `Locale`-Unionstyp) → flache Key→Text-Overlay-Tabelle. */
const OVERLAYS: Partial<Record<Locale, Record<string, string>>> = {
  es,
  "pt-BR": ptBR,
  fr,
  ru,
  zh,
};

/**
 * Besucht jedes lokalisierte `name`/`description`(/`prefix`/`suffix`)-Feld jeder Content-Entity
 * genau einmal. Einzige Quelle der Wahrheit für das Key-Schema — sowohl `applyContentLocales`
 * (Schreiben) als auch `collectEnglishStrings` (Lesen, für die Übersetzer-Quell-Liste) laufen
 * hierüber, damit beide niemals auseinanderdriften können.
 */
function forEachLocalizableField(
  db: ContentDB,
  visit: (entity: object, field: string, collection: string, id: string) => void,
): void {
  for (const s of Object.values(db.skills)) visit(s, "name", "skills", s.id);
  for (const a of Object.values(db.actions)) visit(a, "name", "actions", a.id);
  for (const it of Object.values(db.items)) {
    visit(it, "name", "items", it.id);
    visit(it, "description", "items", it.id);
  }
  for (const m of Object.values(db.monsters)) visit(m, "name", "monsters", m.id);
  // Elite-/World-Spawns Phase 2 (design/elite-balance-spec.md): 28 Varianten-Titel, gleiches
  // Muster wie Monster-Namen oben. `db.elites` ist optional (Phase 1 kannte das Feld noch nicht).
  if (db.elites) for (const e of Object.values(db.elites)) visit(e, "name", "elites", e.id);
  for (const a of db.achievements) {
    visit(a, "name", "achievements", a.id);
    visit(a, "description", "achievements", a.id);
  }
  for (const z of db.zones) visit(z, "name", "zones", z.id);
  for (const d of db.dungeons) {
    visit(d, "name", "dungeons", d.id);
    // Dungeon-Rework-Spec §5.4/§5.6: Wellen-Dramaturgie-Namen (waveMeta[i].name), index-parallel
    // zu encounters. Rein additiv — Dungeons ohne waveMeta (oder Wellen ohne name) werden übersprungen.
    d.waveMeta?.forEach((w, i) => {
      if (w.name) visit(d, `waveMeta.${i}.name`, "dungeons", d.id);
    });
  }
  for (const c of db.categories) visit(c, "name", "categories", c.id);
  for (const st of db.sets) visit(st, "name", "sets", st.id);
  for (const q of db.quests) {
    visit(q, "name", "quests", q.id);
    visit(q, "description", "quests", q.id);
    // Aschechronik (Welle D2): loreText ist optional (nur die chronicle_*-Quests tragen es) —
    // applyOne überspringt Quests ohne das Feld defensiv (current === undefined), also unbedenklich
    // für ALLE Quests zu besuchen.
    if (q.loreText) visit(q, "loreText", "quests", q.id);
  }
  for (const p of Object.values(db.pets)) {
    visit(p, "name", "pets", p.id);
    visit(p, "description", "pets", p.id);
    // Pet-Redesign #276: der Kampf-Fähigkeits-Name ist ein Pflicht-LocalizedString EINE Ebene
    // tiefer — als Punkt-Pfad besucht (Key: "pets:<id>:combatAbility.name", s. resolveHost).
    if (p.combatAbility) visit(p, "combatAbility.name", "pets", p.id);
  }
  if (db.crops) for (const c of Object.values(db.crops)) visit(c, "name", "crops", c.id);
  if (db.slayerMasters) {
    for (const sm of db.slayerMasters) {
      visit(sm, "name", "slayerMasters", sm.id);
      visit(sm, "description", "slayerMasters", sm.id);
    }
  }
  // SlayerTowerFloor hat keine `id` (nur `floor`, 1..5) — die Etagen-Nummer dient als Schlüssel.
  if (db.slayerTower) for (const f of db.slayerTower) visit(f, "name", "slayerTower", String(f.floor));
  if (db.affixes) for (const a of Object.values(db.affixes)) visit(a, "prefix", "affixes", a.id);
  if (db.suffixes) for (const su of Object.values(db.suffixes)) visit(su, "suffix", "suffixes", su.id);
  // Das Lager (Encampment Phase 1, 0.3.0): 15 Gebäude-Namen + Flavor-Zeilen (description),
  // gleiches Muster wie achievements. `db.campBuildings` ist optional (Alt-/Test-Fixtures).
  if (db.campBuildings) {
    for (const cb of db.campBuildings) {
      visit(cb, "name", "campBuildings", cb.id);
      visit(cb, "description", "campBuildings", cb.id);
    }
  }
  // NICHT lokalisiert (kein name/description-Feld im Shape): shop, slayerShop.
}

/**
 * Löst einen Feld-Pfad mit BELIEBIG vielen Punkt-Ebenen auf (z.B. "combatAbility.name" →
 * Host = entity.combatAbility, Leaf = "name"; oder "waveMeta.2.name" → Host = entity.waveMeta[2],
 * Leaf = "name" — numerische Segmente indizieren Arrays genau wie String-Keys, JS erlaubt beides).
 * Flache Felder (kein Punkt) bleiben unverändert flach. null, wenn ein Zwischen-Host an dieser
 * Entity fehlt (z.B. optionales Objekt/kürzeres waveMeta-Array).
 */
function resolveHost(entity: object, field: string): { host: Record<string, unknown>; leaf: string } | null {
  const parts = field.split(".");
  let host = entity as Record<string, unknown>;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = host[parts[i]!];
    if (!next || typeof next !== "object") return null;
    host = next as Record<string, unknown>;
  }
  return { host, leaf: parts[parts.length - 1]! };
}

/** Schreibt `translated` in `entity[field][locale]` (Punkt-Pfade via resolveHost), ohne einen evtl.
 *  vorhandenen einsprachigen `en`-String-Shorthand zu zerstören (hebt ihn dabei in die Objekt-Form). */
function applyOne(
  entity: object,
  field: string,
  collection: string,
  id: string,
  locale: Locale,
  overlay: Record<string, string>,
): void {
  const target = resolveHost(entity, field);
  if (!target) return; // Zwischen-Host fehlt (optionales verschachteltes Objekt)
  const current = target.host[target.leaf] as LocalizedString | undefined;
  if (current === undefined) return; // Feld existiert an dieser Entity nicht (z.B. optionale description)
  const translated = overlay[`${collection}:${id}:${field}`];
  if (translated === undefined) return; // kein Overlay-Eintrag → en-Fallback bleibt über resolveText
  target.host[target.leaf] =
    typeof current === "string" ? { en: current, [locale]: translated } : { ...current, [locale]: translated };
}

/**
 * Wendet ALLE registrierten Sprach-Overlays auf den geladenen Content an. Muss NACH dem Aufbau
 * des `content`-Objektliterals aufgerufen werden (mutiert die Entities in-place; `content` ist
 * nicht eingefroren). Robust gegen fehlende Overlay-Keys — überspringt sie einfach.
 */
export function applyContentLocales(db: ContentDB): void {
  for (const [locale, overlay] of Object.entries(OVERLAYS) as Array<[Locale, Record<string, string>]>) {
    forEachLocalizableField(db, (entity, field, collection, id) => applyOne(entity, field, collection, id, locale, overlay));
  }
}

/**
 * Liest den englischen Quelltext jedes lokalisierbaren Feldes als flache
 * `"<collection>:<id>:<field>"` → `en`-Text Map. Wird von
 * `tools/extract-content-strings.mjs` genutzt, um die Übersetzer-Quell-Liste
 * (`design/content-strings-en.json`) zu erzeugen — bewusst dieselbe Traversierung wie
 * `applyContentLocales`, damit Keys 1:1 übereinstimmen.
 */
export function collectEnglishStrings(db: ContentDB): Record<string, string> {
  const out: Record<string, string> = {};
  forEachLocalizableField(db, (entity, field, collection, id) => {
    const target = resolveHost(entity, field);
    if (!target) return;
    const current = target.host[target.leaf] as LocalizedString | undefined;
    if (current === undefined) return;
    out[`${collection}:${id}:${field}`] = typeof current === "string" ? current : current.en;
  });
  return out;
}
