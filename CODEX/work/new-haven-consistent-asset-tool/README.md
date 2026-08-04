<!-- codex:2026-08-02T10:44:59+02:00 -->
# New Haven — Consistent Asset Tool

Lokales, API-key-freies Produktions- und Prüfwerkzeug für die 15 Gebäudefamilien von New Haven.
Es ersetzt keine Bildgenerierung, sondern verhindert, dass jede Generierung Kamera, Maßstab, Licht,
Padding oder Boden neu erfindet.

## Status

- **Werkzeug:** arbeitsfähig, lokal und ohne Produktionsbindung.
- **Kalibrierungsset:** als verbindliche Arbeitsdefinition vorbereitet, noch **nicht generiert oder
  vom Chef freigegeben**.
- **Alte V2-Groundless-Serie:** ausdrücklich verworfen; sie ist weder Referenz noch freigabefähig.
- **Produktionsassets:** keine neuen Gebäude erzeugt, keine Renderer-Assets überschrieben.

## Start

Am zuverlässigsten aus diesem Ordner mit einem beliebigen statischen Server öffnen:

```powershell
python -m http.server 4173
```

Danach `http://localhost:4173/` öffnen. `index.html` funktioniert auch direkt per Doppelklick;
Manifest-Download, Prompt-Kopie, lokale PNG-Analyse und Preview benötigen keinen Server.

## Ordner

- `index.html`, `styles.css`, `app.js` — Produktionscockpit, Promptansicht, Upload-QA und Map-Preview.
- `production-spec.md` — die sechs Schritte als verbindliche Arbeitsinstruktion.
- `manifest.json` — Kamera, Licht, Canvas, Größenklassen, 15 Familien und drei Ränge.
- `scripts/generate-packets.mjs` — schreibt reproduzierbare Promptpakete aus dem Manifest.
- `scripts/qa-assets.mjs` — headless QA für PNG-Intake mit `sharp`.
- `calibration/README.md` — Freigabevertrag für die vier Kalibrierungsgebäude.
- `intake/README.md` — Ablagekonvention für noch ungeprüfte Bilder.
- `out/README.md` — Ausgabeformat für Promptpakete und QA-Berichte.

## Kommandozeile

```powershell
node scripts/generate-packets.mjs calibration
node scripts/generate-packets.mjs all
node scripts/qa-assets.mjs intake
```

`generate-packets.mjs calibration` erzeugt ausschließlich die vier Rank-I-Kalibrierungsprompts.
`all` erzeugt 45 Textpakete, aber **keine Bilder**. Der zweite Befehl darf erst nach Abnahme des
Kalibrierungssets als Produktionsübergabe benutzt werden.

`qa-assets.mjs` erwartet transparente PNGs nach dem Schema `camp_<id>_<rank>.png`. Nachtfassungen
werden bewusst nicht separat generiert: dieselbe Geometrie wird im Spiel bzw. in der Preview
kosmetisch umgeleuchtet.

## Abnahmefolge

1. Karte und Kamera gegen `production-spec.md` bestätigen.
2. Nur Town Hall I, Fisher's Hut I, Watchtower I und Seed Garden I generieren.
3. Vier Bilder in `intake/` legen und Browser- oder CLI-QA ausführen.
4. Gemeinsam auf der 1920×1080- und 3440×1440-Bühne prüfen.
5. Freigegebene Bilder nach `calibration/approved/` kopieren und als echte Referenzen an jede
   folgende Generierung anhängen.
6. Erst danach die restlichen Ränge/Familien in kleinen Wellen produzieren.

## Wichtige Grenze

Die automatische QA kann Alpha, Canvas, Bounding Box, Baseline, Zentrum, Größenabweichung und
verdächtige bodenartige Alpha-Flächen messen. Sie kann nicht zuverlässig beurteilen, ob ein
Gebäude stilistisch schön oder die Kamera optisch wirklich identisch ist. Diese beiden Gates
bleiben eine visuelle Chef-/Designabnahme.

