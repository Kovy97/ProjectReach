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

<!-- codex:2026-08-28T23:41:03+02:00 -->

1. Alle fünf Lehrlings-Slots und die Frost-Roben als Obergrenze visuell sowie technisch prüfen.
   Alte `dimweave_*` weder laden noch als Promptreferenz verwenden.
2. Einen verbindlichen Serienkern für Material, Palette, Licht und Detailgrad setzen; danach
   jeden Slot einzeln mit seinem Bestandswinkel erzeugen. Ein nativer Alpha-Wurf pro Final,
   keine gemalte Matte und kein Keying.
3. Je Teil prüfen: grobe Nesselstruktur, Dämmergrau/Abendblau, ausgefranste Kante, Lederkordel
   oder Holzknebel und genau eine dunkelblau eingenähte Zwielicht-Rune ohne Lichtwirkung.
4. Akzeptierte Raws alphaerhaltend auf 1254² mit einheitlichem Sicherheitsrand normalisieren.
   Exakte Namen, Alpha, Außenrand, verstecktes RGB und Motivbox automatisch messen.
5. Zweizeiligen Kontaktbogen erstellen: oben alle fünf Dimweave-Teile, darunter das komplette
   Lehrlings-Set in derselben Slot-Reihenfolge. Zusätzlich Alpha-/Magenta-Test und 64-px-Reihe.
6. HANDOFF und WORKLOG abschließen; Renderer, Content und alte Dimweave-Dateien unangetastet
   lassen.

# Teil C – Quellen und Promptauflösung (Mira)

<!-- codex:2026-08-28T23:41:03+02:00 -->

- Primärer Serienanker: `apprentice_robe_hat`, `apprentice_robe_body`,
  `apprentice_robe_legs`, `apprentice_mitts`, `apprentice_slippers`; Maßstab, Slotwinkel,
  Licht von oben links und freistehende Produktdarstellung werden übernommen.
- Obergrenze: Frost-Kapuze, -Robe, -Beinkleid und -Handbinden zeigen die deutlich höhere
  Verarbeitungsstufe. Trübgewebe erhält weder Fell, Metallornament, Edelstein noch Eiseffekt.
- Gemeinsamer Serienkern: grob sichtbare Nesselbindung, aschiges Dämmergrau mit sehr
  zurückhaltendem Abendblau, stumpfes braunes Leder, helle Holzknöpfe/-knebel, handgenähte
  Reparaturen und unregelmäßig ausgefranste Säume.
- Magische Lesbarkeit: genau eine einfache Zwielicht-Rune pro Teil, als dunkelblaue Naht im
  Stoff. Sie reflektiert kein Licht und erzeugt weder Aura noch Partikel.

# Teil D – Abnahme und Übergabe (Mira)

<!-- codex:2026-08-28T23:41:03+02:00 -->

- Fünf exakt benannte 1254 × 1254 PNG-RGBA-Finals unter
  `CODEX/assets/truebgewebe-set-2026-08-28/fertig/`, echtes Alpha und Außenrand Alpha 0.
- Jedes Teil ist ohne Figur, Hand, Fuß, Ständer, Boden, Rahmen, Text oder Schlagschatten als
  einzelnes Slotobjekt freigestellt.
- Alle fünf lesen über Nesselstruktur, Palette, Kordeln, Holzknebel und Runennaht als ein Set;
  ärmer als Lehrling in der Verarbeitung, aber eindeutig magisch.
- QA: zweizeiliger Setvergleich, Dunkel-/Magenta-Kantenprüfung, 64-px-Reihe und maschinenlesbare
  Messwerte. Anschließend Übergabe an Claude, keine Integration durch Codex.

## Chef-Korrektur — Robe ohne Kapuze

<!-- codex:2026-08-28T23:56:07+02:00 -->

`dimweave_robe` ist ausschließlich der Körperslot und darf keine Kapuze, Gugel oder sonstiges
Kopfteil enthalten. Verbindliche Neufassung mit flachem, offenem V-Ausschnitt und niedrigem
ausgefranstem Stoffkragen; die separate `dimweave_hood` bleibt der einzige Kopfslot.
