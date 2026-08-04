# Playtest-ZIP — Plan (Build für einen Freund per ZIP)

Ziel: Eine `.zip` erstellen, die der Freund auspackt und per Doppelklick startet — **ohne Installation,
ohne Steam, ohne Node/Dev-Setup**.

## 1) Build-Target
electron-builder ist bereits konfiguriert (`apps/client/electron-builder.json`):
- `productName: "Grim Reach"`, `appId: com.hearthforge.idle`
- Windows-Targets: **nsis** (Installer) + **portable** (Einzel-.exe)
- `win.icon: resources/icon.png` (Grim-Reach-Icon, 256×256) ✓
- `directories.output: release`

Für den ZIP-Versand nutzen wir das **portable**-Target → eine einzelne `Grim Reach <version>.exe`,
die ohne Installation läuft (entpackt sich beim Start in ein Temp-Verzeichnis).

## 2) Build-Befehle
```
pnpm --filter @hearthforge/client build        # electron-vite: renderer+main+preload nach out/
pnpm --filter @hearthforge/client exec electron-builder --win portable
```
Ergebnis: `apps/client/release/Grim Reach <version>.exe`

> Falls electron-builder nicht als Script vorhanden ist, ergänzen wir in `apps/client/package.json`
> ein `"dist": "electron-vite build && electron-builder"`-Script.

## 3) ZIP packen
Die portable `.exe` + eine kurze `LIESMICH.txt` in eine ZIP:
- `Grim Reach.exe`
- `LIESMICH.txt` (Start-Hinweis + SmartScreen-Hinweis, s.u.)

## 4) Wichtige Hinweise für den Tester (in LIESMICH.txt)
- **SmartScreen-Warnung**: Der Build ist (noch) **nicht signiert**. Windows zeigt beim Start evtl.
  „Windows hat Ihren PC geschützt" → auf **„Weitere Informationen" → „Trotzdem ausführen"** klicken.
  (Erst ein Code-Signing-Zertifikat oder genug Reputation lässt die Warnung verschwinden — für einen
  privaten Tester unkritisch.)
- **Speicherstände** liegen unter `%APPDATA%\Grim Reach\saves\` (frischer Account beim ersten Start —
  der New-Player-Guide erscheint automatisch).
- **Vollbild**: startet im Vollbild; `F11` schaltet Fenster/Vollbild um, alternativ in den Optionen.
- **Beenden**: `Alt+F4` oder Fenster schließen (Autosave läuft alle paar Sekunden + beim Verlassen).

## 5) Offene Punkte / Empfehlungen
- **Größe**: Aktuell ~240 MB Assets (viele 2–3 MB-PNGs, teils überdimensioniert — z.B. Item-Icons
  1254×1254, angezeigt mit ~170px). **Empfehlung vor dem Versand: Bild-Optimierungs-Pass** (Item-Icons
  auf ~256px, Hintergründe auf max. ~1920px, PNG-Recompression). Schrumpft die ZIP drastisch (geschätzt
  ~10–20 MB statt 200+ MB) **und** beschleunigt die Ladezeiten/Seitenwechsel weiter. Originale werden
  vorher nach `…ASSETS\archive\` gesichert. → **Chef-Entscheidung ausstehend.**
- **appId** bleibt vorerst `com.hearthforge.idle` (interner Scope unverändert; rein technisch).
- Optional: später signieren (Code-Signing-Zertifikat) um die SmartScreen-Warnung zu entfernen.

## 6) Reihenfolge zum Versand
1. (optional, empfohlen) Bild-Optimierungs-Pass.
2. `build` + `electron-builder --win portable`.
3. portable `.exe` + `LIESMICH.txt` zippen.
4. ZIP an den Freund schicken.
