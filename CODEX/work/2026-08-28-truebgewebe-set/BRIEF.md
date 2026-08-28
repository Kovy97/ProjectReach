# Asset-Brief — Trübgewebe-Set (Dimweave), 5 Item-Icons, komplett neu

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 28.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Hintergrund:** Das Trübgewebe-Set (Magier, Stufe 8–12, Schneidern) bestand nur aus Kapuze, Robe und Sandalen. Chef: „Das sollte ein ganzes Set sein, komplett neu designen als zweites Anfänger-Set.“ Es wird auf fünf Teile ergänzt (neu: Beinkleid und Binden) und alle fünf werden **neu gemalt**, damit sie als EIN Set lesen. Die drei alten Bilder wandern ins Archiv.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Trübgewebe-Set (Dimweave), zweites Anfänger-Set der Magier |
| Zielversion | 1.2.0, Priorität P1 |
| Umfang | 5 Freisteller à **1254 × 1254, echtes Alpha** |
| **Bestandsreferenz (Pflicht)** | Serien-Nachbarn: `apps/client/src/renderer/assets/items/apprentice_robe_hat.webp`, `apprentice_robe_body.webp`, `apprentice_robe_legs.webp`, `apprentice_mitts.webp`, `apprentice_slippers.webp` (erstes Anfänger-Set: Größe im Bild, Perspektive, Licht, Malgrad) sowie ein höheres Roben-Set aus demselben Ordner (Frost-Roben) als Gegenpol. Die alten `dimweave_*.webp` NICHT als Vorlage nehmen, sie werden ersetzt. |
| Setidee | **Trübgewebe** = grobes Nesselgewebe in Dämmergrau mit einem Schimmer von Abendblau, ausgefranste Säume, einfache Lederkordeln und Holzknebel statt Schnallen, an jedem Teil eine schwache, eingenähte Zwielicht-Rune (dunkelblau, kein Leuchten). Deutlich ärmlicher-mystischer als das Lehrlings-Set, aber klar magisch; kein Comic, kein Glühen, kein Rarity-Schimmer (Regel) |
| Lieferung | `CODEX/assets/truebgewebe-set-2026-08-28/fertig/` (+ raw/, qa/ mit Kontaktbogen: die fünf Teile in einer Reihe, darunter das Lehrlings-Set zum Vergleich), danach HANDOFF/WORKLOG |
| Nicht anfassen | Renderer, Content; Einbau macht Claude (WebP q92, Auto-Discovery über Item-IDs) |

## Die fünf Dateien (Namen exakt = Item-IDs)

| Datei | Teil | Motiv |
|---|---|---|
| `dimweave_hood.png` | Kapuze (Kopf) | tief hängende Kapuze aus Trübgewebe, Rune an der Stirnkante, Kordelverschluss |
| `dimweave_robe.png` | Robe (Körper) | knöchellange Robe mit weiten Ärmeln, ausgefranster Saum, Lederkordel als Gürtel, Rune auf der Brust |
| `dimweave_leggings.png` | Beinkleid (Beine) | gewickelte Beinlinge aus demselben Gewebe, Kordeln an den Waden |
| `dimweave_wraps.png` | Binden (Hände) | Handbinden aus Trübgewebe mit freien Fingern, Rune auf dem Handrücken |
| `dimweave_sandals.png` | Sandalen (Füße) | Riemensandalen mit Gewebestreifen über dem Spann |

Alle fünf aus demselben Licht (oben links), gleicher Materialmaßstab, sodass die Reihe wie ein Set aus einer Werkstatt liest.

## Regeln (Kurzfassung, s. `CODEX/RULES.md`)

- Stilabgleich mit dem Zielordner: erst das Lehrlings-Set und ein höheres Roben-Set ansehen, dann generieren; Freisteller mit echtem Alpha, kein Schachbrett, kein Boden, kein Schatten.
- Item = Karte: Objekt freistehend, kein Rahmen, keine Plakette, kein Text.

# Teil B – Produktionsplan (Mira)

<!-- codex: hier eintragen -->
