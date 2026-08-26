# Neuguss 2026-08-24 — Abschluss

<!-- codex:2026-08-24T12:35:04+02:00 -->

## Auftrag und Promptquellen

- Bindend: `ASSETS/neuguss-2026-08-23/LIESMICH.md`
- Motive 1–14: `ASSETS/neuguss-2026-08-23/prompts/01-dringend-14-motive.txt`
- Motive 15–17: `ASSETS/neuguss-2026-08-23/prompts/02-nachzug-3-motive.txt`
- Referenzen wurden je Motiv als Basis-/Stilreferenz beziehungsweise als ausdrücklich nachrangige
  Altbild-Gegenprobe verwendet.

## Ergebnis

- Alle 17 exakten IDs liegen in `ASSETS/neuguss-2026-08-23/fertig/`.
- Zielmaß: 1254×1254 PNG, RGBA, transparente Ecken, Teilalpha und vollständige Silhouette.
- Die vom Chef wiederhergestellte weiche Fassung von `mire_wisp.png`, der freigegebene
  `elite_crypt_icemage.png` und die massivere Wyvern-Fassung blieben erhalten.
- `elite_high_roc.png` kam mit nativem Alpha und wurde ohne Keying normalisiert.
- Elf weitere Neugüsse kamen vom eingebauten Werkzeug als dreikanalige PNGs mit gemaltem
  Weiß-/Hellgrau-Schachbrett. Nach der direkten Ergebnisfreigabe des Chefs wurde ausschließlich
  dieses neutrale Raster lokal vermattet; die zweite Fassung entfernt auch eingeschlossene
  Rasterfelder zwischen Tuch, Feuer und Geisterbändern. Kein Magenta-Key wurde verwendet.

## QA

- Roh-/Zwischenstände und Einzelprüfungen: dieser Ordner.
- Mattenwerte: `checker-extraction-qa.json`.
- Kontaktbögen: `black-qa-contact-sheet.png`, `gray-qa-contact-sheet.png`,
  `pink-qa-contact-sheet.png`.
- Gemeinsamer Endscan inklusive SHA-256:
  `CODEX/work/2026-08-24-final-qa/final-asset-qa.json`.
- Endscan: 17 erwartet, 17 vorhanden, keine fehlenden oder unerwarteten Dateien, keine Maß-,
  RGBA-, Alpha- oder Eckenverletzung.

Keine Runtime-Datei wurde ersetzt; `fertig/` bleibt Übergabe-Staging.
