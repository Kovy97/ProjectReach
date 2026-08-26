# Companion-Batch 2026-08-24 — Abschluss

<!-- codex:2026-08-24T12:35:04+02:00 -->

## Auftrag und Promptquellen

- Bindend: `ASSETS/companions-2026-08-23/LIESMICH.md`
- Tätigkeiten, 14 Motive: `ASSETS/companions-2026-08-23/prompts/01-taetigkeiten-14-begleiter.txt`
- Kampf, 7 Motive: `ASSETS/companions-2026-08-23/prompts/02-kampf-7-begleiter.txt`
- Serienvertrag: `CODEX/AssetControl/CompanionPets-2026-08-01/SERIES-CONTRACT.md`

Gemeinsamer Produktionsblock: ein vollständiger Begleiter, ruhige Idle-Pose, Blick nach links,
orthografisch wirkende Dreiviertelansicht ungefähr 20 Grad von links vorne, Tieraugenhöhe mit nur
leichter Aufsicht, weiches warmes Hauptlicht links oben und kühle Füllung rechts, handgemaltes
2.5D-Ashen-Iron-Material, gedeckte Naturpalette plus genau ein kontrollierter Akzent, kein Boden,
kein Schatten, kein Text und echtes RGBA-Alpha.

## Ergebnis

- Alle 21 exakten IDs liegen in `ASSETS/companions-2026-08-23/fertig/`.
- Alle Quellen kamen mit nativem RGBA-Alpha; kein Chroma-Key und keine Hintergrundextraktion.
- Niedrig deckende rot-gelb-grüne Render-Randpixel wurden nur aus benachbarten Motivfarben
  rekonstruiert. Fell, Federn, Flammen, Membranen und feine Glieder behalten Teilalpha.
- Finalformat: 1024×1024 PNG, längste sichtbare Achse 800 Pixel, zentriert, transparente Ecken.

## QA

- Einzelwerte: `companion-qa.json`.
- Kontaktbögen: `black-qa-contact-sheet.png`, `gray-qa-contact-sheet.png`,
  `pink-qa-contact-sheet.png`.
- Gemeinsamer Endscan inklusive SHA-256:
  `CODEX/work/2026-08-24-final-qa/final-asset-qa.json`.
- Endscan: 21 erwartet, 21 vorhanden, keine fehlenden oder unerwarteten Dateien, keine Maß-,
  RGBA-, Alpha- oder Eckenverletzung.

Keine Runtime-Datei wurde ersetzt; `fertig/` bleibt Übergabe-Staging.
