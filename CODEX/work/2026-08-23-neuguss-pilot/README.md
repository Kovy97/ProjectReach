<!-- codex:2026-08-23T20:47:23+02:00 -->
# Neuguss-Pilot — erste drei Motive

## Lieferstand

Die drei Zwischenabnahme-Dateien liegen mit exakten Content-IDs unter
`ASSETS/neuguss-2026-08-23/fertig/`:

- `mire_wisp.png`
- `elite_crypt_icemage.png`
- `elite_high_wyvern.png`

Erzeugt wurde mit dem eingebauten ImageGen-Weg und den im Promptpaket genannten Referenzbildern.
Der Hintergrund der Quellen war flaches Grün. Die Finaldateien verwenden echtes RGBA-Alpha.

## Freistellung

Die erste globale Grün-Dominanz-Matte wurde beim blaugrünen `mire_wisp` nach visueller Prüfung
verworfen, weil sie echte Binnenzeichnung halbtransparent machte. Die Lieferfassung verwendet
randverbundenes Keying: Nur vom Bildrand aus zusammenhängendes Key-Grün und innenliegende nahezu
reine Key-Flächen werden entfernt. Eine weiche Silhouettenmatte, Despill und eine Kantenkontraktion
um einen Pixel folgen anschließend. Sieben isolierte Rein-Grün-Pixel im Irrlicht wurden vor der
Lieferung zusätzlich transparent gesetzt.

## QA

Alle drei Dateien sind `1254 × 1254` RGBA-PNGs mit transparenten Ecken, volltransparenten und
teiltransparenten Pixeln. Der technische Scan meldet jeweils null sichtbare Magenta-Pixel, null
helle Rein-Grün-Pixel und null grün-dominante Teilalpha-Kanten. Die vollständigen Werte und
SHA-256-Prüfsummen stehen in `pilot-qa.json`; dieser README- und der HANDOFF-Eintrag sind der
`codex:`-Nachweis für die kommentarfreie JSON-Datei und die PNG-Binärdateien.

Die pinken Kontrasttafeln liegen nur hier im Arbeitsordner. Keine Runtime-Datei wurde ersetzt.
Die übrigen elf Motive aus Promptdatei 1 warten auf die Zwischenabnahme des Chefs.

