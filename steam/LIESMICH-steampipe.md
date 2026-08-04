# Build zu Steam hochladen — Grim Reach (AppID 4915450, Depot 4915451)

Es gibt zwei Wege. **Weg A (ZIP im Browser) ist der einfachste** und für uns ausreichend.

## Weg A — ZIP-Upload im Browser (EMPFOHLEN)
Funktioniert, weil unser komprimierter Build < 2048 MB ist.
- **Fertige Datei:** `G:\GameDev\steam\grimreach_depot_4915451.zip` (~746 MB, `Grim Reach.exe` im ZIP-Root).
- In Steamworks auf der Seite **„Depots per HTTP hochladen"** (Depot 4915451 „Grim Reach Content"):
  1. **Datei auswählen** → die ZIP oben wählen.
  2. Modus **„Standard"** (voller Ersatz — richtig für den Erst-Upload).
  3. **Hochladen** klicken, warten bis fertig.
- Kein steamcmd, kein SDK, kein Login nötig — das Depot ist auf der Seite schon gewählt.

## Weg B — steamcmd (nur nötig bei Builds > 2 GB)
- Skripte: `app_build_4915450.vdf` + `depot_build_4915451.vdf` (contentroot zeigt auf `win-unpacked`).
- `steamcmd.exe` aus dem Steamworks SDK (`sdk\tools\ContentBuilder\builder\`):
  ```
  "C:\...\steamcmd.exe" +login DEIN_PARTNER_ACCOUNT +run_app_build "G:\GameDev\steam\app_build_4915450.vdf" +quit
  ```

## Danach (beide Wege gleich)
1. **Build live schalten:** Steamworks → *SteamPipe → Builds* → neuer Build → Branch-Dropdown auf **`default`** → live setzen.
2. **Installation → Startoptionen:** `Grim Reach.exe`, Windows.
3. **Steam Cloud:** Byte-Kontingent `104857600`, Dateien `100`, Auto-Cloud (`WinAppDataRoaming` / `Grim Reach/saves` / `*.json` / Windows).
4. **Anwendung → Veröffentlichen:** „Auf Steam veröffentlichen".

## Neuen Build später bauen
`pnpm --filter @hearthforge/client build` + `pnpm --filter @hearthforge/client exec electron-builder --win --dir`,
dann die `win-unpacked` neu zippen (Inhalt im Root!) und wieder per Weg A hochladen.
