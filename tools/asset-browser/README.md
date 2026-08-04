# Asset-Browser

Statische HTML-Galerie über alle Renderer-Assets (`apps/client/src/renderer/assets/**`) — zum Sichten, Zuweisen und Referenzieren von Spiel-Assets. Nach jeder Asset-Änderung (neue/gelöschte/umbenannte Bilder) neu generieren mit `pnpm asset-browser` (führt `node tools/asset-browser/generate.mjs` aus), dann `index.html` im Browser öffnen. **`index.html` ist ein Generat — nicht von Hand editieren**, Änderungen gehören in `generate.mjs`. Die Galerie verlinkt die Original-Dateien relativ (keine Kopien); „Pfad kopieren" liefert den Repo-Pfad eines Assets als exakte Referenz.
