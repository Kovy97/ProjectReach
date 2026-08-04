---
name: ygojourney-map-editor-reference
description: Referenz — YGOJourney-Projekt & sein Map-/Szenen-Editor-Devtool als Vorlage für den Hearthforge-Kampfgebiets-Map-Editor
metadata: 
  node_type: memory
  type: reference
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chefs anderes Projekt **YGOJourney** (YuGiOh) liegt unter `C:\Users\MSchu\Documents\YGOJourney` (Python-Backend `src/ygojourney/` + `server/`, Web-Frontend `frontend/app.js` ~14.8k Zeilen, Szenen-Daten `data/scenes/*.json`). Git-Branches `feat/devtools-*` zeigen mehrere Dev-Editoren: `maps-editor`, `scenes-editor`, `npcs-editor`, `stories-editor`, `quests-editor` — nur für Admin-Accounts sichtbar.

**Das übertragbare Muster (Vorlage für Hearthforge-Kampfgebiete):**
- `buildMapScene({imageName, hotspots})` rendert ein **Hintergrundbild + prozentual positionierte klickbare Hotspots** (resolution-unabhängig) + Live-Koordinaten-HUD unterm Cursor. Wird für City-Map, Räume „und alle zukünftigen Szenen" genutzt.
- Szenen-JSON-Format (`data/scenes/<id>.json`):
  ```json
  { "id": "...", "title": "...", "hotspots": [
    { "label": "...", "shape": "rect", "x": %, "y": %, "w": %, "h": %,
      "portrait": "optional NPC", "action": { "type": "navigate|story|open_*", ... } } ] }
  ```
- Der **maps-editor** ist das Dev-Tool, mit dem der Chef Hotspots **im Spiel visuell platziert/zieht** (Live-Coord-HUD) und in die JSON speichert.

**Chef-Wunsch für Hearthforge (Zukunft):** Kampfgebiet „betreten" → Overworld-Map (unser `assets/zones/<zoneId>.png`) → Mobs als immersiv platzierte, klickbare Hotspots → Klick = Kampf. Plus ein **Zonen-Map-Editor** als Dev-Tool (analog maps-editor), um Mob-Positionen in % zu setzen und zu speichern. Hotspot.action = `{ type:"fight", monsterId }`. Verweist auf [[combat-enemy-select-layout]] (löst es immersiver ab) und das Dev-Tools-Layer (Item-Browser ist das erste Dev-Tool).
