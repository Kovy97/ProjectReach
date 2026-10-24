# Asset-Katalog

<!-- claude:2026-10-24T13:27:50+02:00 -->

Lokaler Katalog aller Spielbilder von Grim Reach: sichten, alte Fassungen und Kandidaten vergleichen, Wünsche festhalten („tausche X gegen Y“, „X neu generieren“, Notiz). **Der Katalog verändert nie ein Asset.** Die Anfragen arbeitet Claude im Hauptchat ab.

## Start

- Doppelklick auf `START.cmd` (startet den Server und öffnet den Browser), oder
- `node tools/asset-katalog/server.mjs` und dann <http://127.0.0.1:5430/> öffnen.

Beim Start wird der Index aktualisiert: beim ersten Mal etwa 1 bis 2 Minuten (alle Bilder werden vermessen), danach wenige Sekunden. Beenden mit Strg+C.

Optionen: `--open` (Browser öffnen), `--rebuild` (alles neu messen), `--no-update` (vorhandenen Index nutzen), `--port <n>` (anderer Port, nicht 5420), `--anfragen-md` (nur `ANFRAGEN.md` neu schreiben). Der Index lässt sich auch allein bauen: `node tools/asset-katalog/build-index.mjs`.

Voraussetzungen: Node 22, Git, Python 3 mit Pillow und numpy (für QA-Markierungen und Vorschaubilder).

## Was drin ist

- **Raster** aller Laufzeit-Assets (`apps/client/src/renderer/assets/**`), nach Ordner gruppiert, mit Suche (ID, Name EN/DE, Ordner) und Filtern (Ordner, Seltenheit, QA, Verlauf, Kandidaten, Prompt, Anfrage).
- **Detail**: große Vorschau (dunkel/hell/Schachbrett, Einpassen/100 %), Spielgrößen, Content-Zuordnung, QA-Messwerte, alle Git-Fassungen und Kandidaten zum Nebeneinander-Vergleichen, gefundene Prompts.
- **Lücken**: Content-IDs (Items, Monster, Eliten, Begleiter, Zonen, Dungeons, Skills) ohne eigene Bilddatei, mit Hinweis auf Ersatzbilder.
- **Anfragen**: Liste mit Bearbeiten und Löschen offener Einträge.

Quellen (nur lesend): Laufzeit-Assets, Content (`packages/content` über tsx), Git-Verlauf, Kandidaten in `Downloads/ASSETS` (inkl. `archive`), `CODEX/assets`, `CODEX/work`, `CODEX/AssetControl` (Abgleich über den Dateinamen), Prompts in den drei CODEX-Ordnern.

## QA-Markierungen (Heuristiken)

Gelten nur in Ordnern mit freigestellten Bildern (items, monsters, pets, icons, sidebar, skills, portraits, actions, camp). Schwellen stehen in `build-index.mjs` (`QA`, `minSize`), Rohwerte in `metrics.py`.

- **Schleier**: große, fast weiße, glatte Fläche im Objekt, deutlich heller als der Rest (Beispiel `items/godgem_ring`). Helle Metalle/Kristalle können Fehlalarm sein.
- **Schachbrett**: eingebackenes Transparenz-Schachbrett in hellen Flächen.
- **Kein Alpha**, **Deckende Ränder** (Hintergrund nicht freigestellt), **Geringe Auflösung** (je Ordner eigene Mindestgröße).

## Anfragen

Gespeichert in `requests.json` (Quelle der Wahrheit), bei jedem Speichern zusätzlich als `ANFRAGEN.md` für Claude. Ein Eintrag hat `id`, `zeitstempel`, `typ` (`tauschen`, `neu-generieren`, `notiz`), `ziel` (Repo-Pfad), `quelle` (Datei mit absolutem Pfad oder Git-Rev + Pfad + Blob), `prompt`, `notiz` und `status` (`offen`). Nach dem Abarbeiten `status` auf `erledigt` oder `abgelehnt` setzen und `node tools/asset-katalog/server.mjs --anfragen-md` ausführen. Die Oberfläche ändert und löscht nur offene Einträge.

## Dateien

`server.mjs` (Server), `build-index.mjs` (Index), `metrics.py` (Bildmetriken, Vorschaubilder), `content-export.ts` (Content-Auszug), `public/` (Oberfläche), `screenshots.mjs` (Abnahme-Screenshots nach `screens/`), `.cache/` (Zwischenspeicher, nicht im Git).

## Grenzen

- Kandidaten werden nur über den Dateinamen gefunden (exakt, Ordnername, Namensvariante, ähnlicher Name); umbenannte Originale ohne ID im Namen fehlen.
- Prompt-Zuordnung ist bestmöglich: „exakt“ (Datei/Überschrift nennt die ID), „ungenau“ (ID in einer längeren Überschrift), „nur erwähnt“ (ID im Fließtext).
- Der Server bindet nur an 127.0.0.1 und liefert nur Dateien aus den freigegebenen Ordnern.
