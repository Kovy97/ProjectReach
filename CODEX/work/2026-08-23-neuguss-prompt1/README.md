<!-- codex:2026-08-23T21:24:26+02:00 -->
# Neuguss Promptdatei 1 — Produktionsstand nach Zwischenabnahme

## Lieferstand

In `ASSETS/neuguss-2026-08-23/fertig/` liegen fünf abnahmefähige Dateien:

- `mire_wisp.png` — vom Chef wiederhergestellte, weiche Fassung; unangetastet
- `elite_crypt_icemage.png` — vom Chef abgenommen; unangetastet
- `elite_high_wyvern.png` — nach Chefkorrektur massiver, mit mehr Rückenstacheln
- `elite_slag_revenant.png` — neue referenzgebundene Elite-Fassung
- `elite_coast_crab.png` — neue referenzgebundene Elite-Fassung

Alle fünf sind 1254 x 1254 Pixel große RGBA-PNGs mit transparenten Ecken,
benutztem Alpha und exakter Content-ID als Dateiname. Werte und SHA-256-Pruefsummen
stehen in `batch-qa.json`.

## Nicht ausgelieferte native Versuche

Die folgenden neun Motive wurden mit den Basis- und Elite-Referenzen erzeugt, aber
nicht nach `fertig/` übernommen:

- `elite_slag_hexer`
- `elite_wild_wolf`
- `elite_high_roc`
- `elite_high_specter`
- `elite_black_witch`
- `elite_crypt_pyroclasp`
- `elite_coast_drowned`
- `elite_black_golem`
- `elite_wild_stag`

Das eingebaute ImageGen lieferte trotz wiederholtem RGBA-/Alpha-Pflichtblock jeweils
ein dreikanaliges PNG mit sichtbar eingebranntem Schachbrett oder weißem Hintergrund.
Weil diese Motive Fell, Federn, Haare, Leuchten, Nebel, Feuer, Kelp, Moos oder feine
Geweihkanten enthalten, wurden sie gemäß der direkten Chefkorrektur nicht gekeyt.
Die Rohbilder bleiben ausschließlich als verworfene Arbeitsstände in diesem Ordner.

## Sichere Key-Ausnahmen

Nur zwei farbsichere, überwiegend harte Motive wurden als Notweg gekeyt:

- `elite_slag_revenant`: Rein-Grün, randverbundene Matte, Despill und Kantenkorrektur
- `elite_coast_crab`: Motiv-fremdes Rein-Blau, globale weiche Matte und Despill

Beide wurden auf pinkem Kontrastgrund visuell geprüft; es bleiben keine sichtbaren
Key-Farbreste. Keine Runtime-Datei wurde ersetzt.

