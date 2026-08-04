---
name: asset-browser-tool
description: Gepflegter Asset-Browser (tools/asset-browser) — nach Asset-Änderungen neu generieren
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Projekt (2026-07-02): **Asset-Browser** in `G:\GameDev\tools\asset-browser\` — Generator (`generate.mjs`, npm-Script `asset-browser` im Root) scannt `apps/client/src/renderer/assets/**` und erzeugt eine statische HTML-Galerie (Kategorien je Ordner, Suche, Maße, Pfad-kopieren, Hell/Dunkel-Toggle). Der Chef nutzt ihn, um Assets zuzuweisen („nimm das für X") und den Bestand zu sehen.

**How to apply:** Nach jedem Asset-Einbinde-Pass (neue PNGs in renderer/assets) den Browser **neu generieren** (`pnpm asset-browser` bzw. `node tools/asset-browser/generate.mjs`) — er ist „gepflegt", d.h. er soll nie veralten. Wenn der Chef Assets per Name/Pfad referenziert, stammt das vermutlich aus diesem Browser. `index.html` ist Generat — nie von Hand editieren. Vgl. [[archive-integrated-assets]] [[asset-bind-all-references]].
