# Companion-Neuguss mit Karten- und Kampfserie

`codex:2026-08-24T13:30:00+02:00`

Arbeits- und QA-Verzeichnis fuer den vom Chef angeordneten vollstaendigen Neuguss der 21 Companions. Die freigegebenen Lieferpfade sind `ASSETS/companions-2026-08-23/fertig/card/<id>.png` und `ASSETS/companions-2026-08-23/fertig/fight/<id>.png`.

## Ergebnis

<!-- codex:2026-08-24T14:25:00+02:00 -->

- 21 eigenstaendige Fantasy-Kreaturen, jeweils als Kartenmotiv und referenzgebundene Kampfpose.
- Kartenserie: vollstaendige ikonische Pose, nach links oder bei richtungsloser Anatomie neutral.
- Kampfserie: gleiche Anatomie, Materialien, Palette und Signaturdetails, eindeutig nach rechts.
- Finale: 1024x1024 RGBA-PNG, transparente Ecken, weiches Teilalpha, laengste sichtbare Achse
  innerhalb der 800-Pixel-Normalisierungstoleranz.
- `companion-pairs-final-qa.json`: technische Werte, exakte Dateisaetze und SHA-256 fuer alle 42 PNGs.
- `cards-*-qa.png` und `fights-*-qa.png`: visuelle Abnahme auf Schwarz, Grau und Magenta.
- `rejected-too-natural/`: wiederherstellbares Archiv der vom Chef verworfenen ersten 21 PNGs.

Die Ordnerstruktur ist Staging. Es wurden keine Runtime-Zuordnung und keine Produktdaten geaendert.
