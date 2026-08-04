---
name: archive-integrated-assets
description: Nach erfolgreicher PNG-Einbindung die Quell-Originale in den Archive-Überordner verschieben
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Wenn PNGs erfolgreich aus dem Asset-Ordner ins Spiel eingebunden wurden (in `apps/client/src/renderer/assets/<dir>/<id>.png` kopiert UND der Client-Build grün ist = Auto-Discovery bindet sie), danach die **Quell-Originale** aus ihrem `done`/`DONE-USE-THIS`-Ordner in den Archive-Überordner verschieben: `C:\Users\MSchu\Downloads\ASSETS\archive\` (anlegen, falls nicht vorhanden).

**Why:** Chef-Wunsch (2026-06-24) — so zeigen die `done`-Ordner nur noch nicht-eingebundene Kunst; bereits verarbeitete Assets stören die nächste Integration nicht.

**How to apply:** Nur **verifiziert gebundene** Dateien verschieben (Build grün) — niemals Quellen, deren Binding fehlschlug oder die keine passende Content-ID haben (die bleiben liegen = Content-Lücke). Die Renderer-Kopie im Repo bleibt immer; nur das gelieferte Original wird verschoben (verschoben, nicht gelöscht → nichts geht verloren). Gilt für mich als CEO genauso wie für den [[asset-integrator]]-Agenten, dessen Definition diese Regel ebenfalls enthält.

**Duplikat-Uploads (Chef 2026-06-27):** Wenn der Chef ein Asset hochlädt, das es schon gibt (gleicher Name/Item), IMMER das **NEUE** nehmen und das alte **überschreiben/ersetzen** — er lädt es meist genau deshalb hoch, weil es die alte Version ersetzen soll. Nicht das alte behalten.

**WICHTIG (Lektion 2026-06-27):** „Build grün" reicht NICHT als Beweis fürs Einbinden — Auto-Discovery bindet nur Item-Bilder, die exakt nach `itemId` benannt im `items/`-Ordner liegen; UI-Icons brauchen zusätzlich eine **Code-Referenz** (getUiIcon/Map/CROP_ICON_MAP). Ein Build kann grün sein, obwohl gelieferte Art gar nicht angezeigt wird. Der Chef hat zu Recht moniert, dass Bilder archiviert wurden, die nie sichtbar im Spiel sind (z.B. `icon_attack/power/defence/vitality/offensivemagic/defensivemagic`, `icon_hearthforgecity`). **Vor dem Archivieren prüfen: Datei existiert am Zielort UND wird tatsächlich referenziert/angezeigt** (nicht nur „kopiert + Build grün"). Bei Unsicherheit nicht archivieren.
