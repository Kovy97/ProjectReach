# Steam-Deploy von null — Grim Reach (AppID 4915450)

Anleitung für die **allererste** SteamPipe-Einrichtung + jeden späteren Upload. SteamPipe =
Steams Upload-Tool: es lädt die Spieldateien hoch, macht daraus einen „Build", den du dann
live schaltest. Kein manueller Zip-Upload über die Website.

**Was der CEO liefert (steht bereit):** die Spieldateien in
`G:\GameDev\apps\client\release\win-unpacked\` (mit `Grim Reach.exe`) — darauf zeigt SteamPipe.
Das fertige Build-Script liegt schon in `G:\GameDev\steam-build\scripts\app_build_4915450.vdf`.

---

## Schritt 0 — SDK entpacken, steamcmd finden

Du hast das Steamworks-SDK-Zip. Entpack es irgendwohin ohne Leerzeichen/Umlaute im Pfad,
z. B. `C:\steamworks_sdk\`. Das Upload-Tool steckt darin unter:

```
…\sdk\tools\ContentBuilder\builder\steamcmd.exe
```

Das ist `steamcmd.exe` — das brauchst du gleich. (Beim ersten Start aktualisiert es sich
selbst, ein paar Sekunden Konsole-Gescrolle ist normal.)

---

## Schritt 1 — Depot-ID nachsehen (einmalig)

Die **AppID** ist `4915450`. Ein **Depot** ist ein separater Container mit einer EIGENEN
Nummer. So findest du sie:

1. https://partner.steamgames.com → einloggen → deine App **Grim Reach (4915450)**.
2. Reiter **„SteamPipe" → „Depots"**.
3. Dort steht deine Depot-ID. Bei frisch angelegten Apps ist das fast immer **4915451**
   (AppID + 1).

**Wenn dort 4915451 steht:** nichts zu tun, das Script passt schon.
**Wenn eine andere Nummer steht:** öffne `steam-build\scripts\app_build_4915450.vdf` und
ersetze die `"4915451"` durch deine echte Nummer. (Sag mir Bescheid, ich mach's auch.)

---

## Schritt 2 — steamcmd einloggen (einmalig, wegen Steam Guard)

Damit spätere Uploads ohne Nachfrage laufen, meldest du dich EINMAL interaktiv an, damit
Steam Guard die Anmeldung merkt. Öffne PowerShell und:

```powershell
& "C:\steamworks_sdk\sdk\tools\ContentBuilder\builder\steamcmd.exe" +login DEIN_STEAM_ACCOUNT
```

(Pfad an deinen SDK-Ort anpassen, `DEIN_STEAM_ACCOUNT` = dein Steam-**Login-Name**, nicht
die E-Mail.) Es fragt nach Passwort und dann nach dem **Steam-Guard-Code** (aus der
Steam-Mobile-App oder E-Mail). Nach `Waiting for user info...OK` bist du drin — tipp `quit`
+ Enter. Ab jetzt sind die Zugangsdaten gecacht.

> Hinweis: Der Account braucht in Steamworks Zugriff auf die App. Dein Partner-Hauptaccount
> hat das. (Für später kann man einen dedizierten Builder-Account anlegen — für den Launch
> unnötig.)

---

## Schritt 3 — Build hochladen

Ein Befehl, jetzt mit dem Build-Script:

```powershell
& "C:\steamworks_sdk\sdk\tools\ContentBuilder\builder\steamcmd.exe" +login DEIN_STEAM_ACCOUNT +run_app_build "G:\GameDev\steam-build\scripts\app_build_4915450.vdf" +quit
```

SteamPipe lädt jetzt `win-unpacked\` hoch (~1,1 GB beim ersten Mal — dauert je nach Upload
ein paar Minuten; künftige Updates laden nur die Unterschiede und sind klein). Am Ende
steht sinngemäß **`Successfully finished appID 4915450 build`** und eine BuildID.

**Wenn's klemmt** (häufigste Fehler):
- `Depot 4915451 not found` → falsche Depot-ID im Script (Schritt 1).
- `Login Failure` / erneut Guard-Abfrage → Schritt 2 nochmal interaktiv.
- `ContentRoot … does not exist` → der `win-unpacked`-Ordner fehlt; sag mir Bescheid, dann
  baue ich das Depot neu.

---

## Schritt 4 — Build live schalten (im Web, nicht im Script)

Der Upload macht den Build NUR verfügbar, nicht automatisch spielbar. Deshalb:

1. Steamworks → App 4915450 → **„SteamPipe" → „Builds"**.
2. Dein neuer Build steht oben in der Liste (mit der BuildID von eben).
3. In der Spalte **„Set build live on branch"** einen Branch wählen:
   - **Empfohlen zuerst:** einen **Beta-Branch** (z. B. `beta` — vorher unter „Builds" bzw.
     „Betas" einmalig anlegen, Passwort optional). Dann kannst DU über Steam → Grim Reach →
     Eigenschaften → Betas den Branch wählen und selbst testen, bevor alle ihn kriegen.
   - **Zum echten Launch:** Branch **`default`** wählen.
4. Auf **„Set build live"** klicken und mit **„Publish"** (oben, Änderungen veröffentlichen)
   bestätigen. Erst nach dem Publish greift es.

---

## Für JEDES spätere Update (die Kurzschleife)

1. CEO baut neu und packt das Depot (`win-unpacked` wird frisch erzeugt) — auf deinen Zuruf.
2. `desc`-Zeile im Script auf die Update-Notiz anpassen (oder mich fragen).
3. Schritt 3 (der eine steamcmd-Befehl) laufen lassen.
4. Schritt 4: erst Beta-Branch testen, dann auf `default` live.

---

## Dauerhafte Fallstricke (wichtig)

- **`setlive` im Script LEER lassen** und im Web schalten — so testest du erst auf Beta.
  Nie blind direkt auf `default` pushen.
- **Save-Kompat (hartes Gesetz):** Jeder Build muss den Vault-Guard grün haben (prüfe ich
  vor jedem Packaging). Alte Spielstände MÜSSEN mit dem neuen Build laden — sonst kein Upload.
- **Exe ist nicht codesigniert** — für Steam ok (Steam ist der vertrauenswürdige Starter).
  Eigenes Code-Signing-Zertifikat ist Post-Launch-Kür.
- **appId `com.hearthforge.idle`** (intern) NIE ändern — Update-/Installer-Identität.
- **Depot-Inhalt = `win-unpacked`** direkt, kein Zip. Das Zip in Downloads ist nur Backup.
