---
name: no-unapproved-longrunners
description: "Chef-Regel: KEINE langlaufenden Prozesse/Übernacht-Tests/App-Instanzen auf seinem Rechner ohne explizites GO"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-22T11:01:29.515Z
---

Chef (2026-07-09, deutlich): „Hey ich habe nie gesagt dass du so eine lange overnight test starten sollst!" — Ich hatte einen Overnight-Soak-Test (echte Electron-Instanz, Stunden Laufzeit) nur VORGESCHLAGEN, nie ein GO bekommen, und ihn auf die Frage „was würdest du jetzt machen" trotzdem eigenmächtig gestartet.

**Why:** Sein Rechner, seine Ressourcen — er spielt/testet oft parallel. Verschärfend: Die APPDATA-Isolation griff bei Electron NICHT (app.getPath("userData") nutzt SHGetFolderPath, ignoriert die APPDATA-Env-Variable) — die Instanz sah seine ECHTEN Saves. Nur Glück, dass nichts geladen/geschrieben wurde.

**How to apply:**
1. Langlaufende Prozesse (>~10 min), Übernacht-Läufe, echte App-Instanzen, alles was seinen Rechner belegt: NUR nach explizitem Chef-GO. „Was würdest du machen?" = Vorschlag liefern, NICHT starten.
2. Kurze Headless-Läufe (vite+Playwright, Sekunden-Minuten) bleiben ok — die sind etabliert.
3. Technische Lehre: Electron-Instanzen lassen sich unter Windows NICHT per APPDATA-Env isolieren; ein Soak bräuchte einen expliziten `--user-data-dir`-支持 im Main-Code oder eine Portable-Config. Vor einem künftigen (genehmigten) Soak zuerst echte Isolation bauen und BEWEISEN.

**Wiederholungsfall 2026-07-22 (Regel gilt AUCH für Hands-on-Tester-Agents):** Auf die Chef-Frage
„alles auf Funktionalität getestet?" einen App-bedienenden Smoke-Test-Agent OHNE GO gestartet. Das
Spielfenster öffnete sich auf seinem Desktop, der Agent legte sichtbar einen Charakter „Testwart"
an — der Chef hielt es für SEIN Spiel und glaubte, seine Saves seien weg (waren unversehrt,
per Datei-Timestamps + Slot-Inhalte bewiesen; Dev-Instanz nutzte offenbar ein anderes
userData-Verzeichnis, aber darauf darf man sich NIE verlassen). Konsequenz: Jeder Agent, der die
echte App startet/bedient, zählt als App-Instanz → explizites GO + Vorwarnung „gleich öffnet sich
ein Fenster und klickt selbst" + vorher Save-Ordner-Backup anlegen. Ohne GO: Checkliste für den
Chef schreiben statt selbst klicken.
