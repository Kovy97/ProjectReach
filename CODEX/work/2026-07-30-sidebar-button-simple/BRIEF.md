# Asset-Brief — Simple Sidebar-/Topbar-Buttons

## Auftrag

Nach dem Live-Test des integrierten Ironbound-Leather-Sets sind dessen Naht, mehrfache Metallkanten und Eckbeschläge bei kleiner Sidebar-Auflösung zu detailreich. Gewünscht sind fünf simplere Dark-Fantasy-/Medieval-Richtungen.

## Feste Vorgaben

- fünf Auswahlentwürfe, zunächst nur Normalzustand
- für Sidebar und Topbar geeignet
- Detailgrad gezielt für kleine Laufzeitgrößen reduzieren
- transparent gemäß Dauerregel
- oben und unten exakt `2 px` transparenter Rand
- bestehendes Ironbound-Set bleibt bis zur neuen Chef-Auswahl vorläufig integriert

## Lieferung

| # | Richtung | PNG | WebP |
|---:|---|---|---|
| 11 | Plain Riveted Iron | `11-plain-riveted-iron.png` | `11-plain-riveted-iron.webp` |
| 12 | Black Oak Band | `12-black-oak-band.png` | `12-black-oak-band.webp` |
| 13 | Quiet Leather | `13-quiet-leather.png` | `13-quiet-leather.webp` |
| 14 | Basalt Ledger | `14-basalt-ledger.png` | `14-basalt-ledger.webp` |
| 15 | Tarnished Copper Line | `15-tarnished-copper-line.png` | `15-tarnished-copper-line.webp` |

Zielordner: `CODEX/assets/sidebar-button-simple-concepts/`

## QA

- alle PNG- und WebP-Dateien `1826 × 331 px`
- Alpha vorhanden
- Pixelreihen 0 und 1 sowie 329 und 330 vollständig transparent
- Motiv beginnt in Reihe 2 und endet in Reihe 328
- gemeinsame Runtime-Prüfung mit Slice `90 / 150 / 90 / 150`
- geprüft bei `240 × 42 px` und `230 × 54 px`
- Vergleich: `comparison-board-simple.png`
- noch keine der fünf neuen Richtungen produktiv integriert

## Designerinnen-Empfehlung

**13 Quiet Leather** skaliert am ruhigsten und lässt den goldenen Labels am meisten Raum.  
**11 Plain Riveted Iron** ist die rauere, dunklere Alternative.  
**15 Tarnished Copper Line** bietet mehr Wärme, ohne wieder ornamental zu werden.
