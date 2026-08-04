# Launch-Runbook 0.2.0 „The Champions Update" (2026-07-23)

## 0. Voraussetzung
Warte auf meine Meldung „Paket fertig" — der Depot-Inhalt ist der Ordner
`G:\GameDev\apps\client\release\win-unpacked\` (NICHT das Zip; das Zip ist nur unser Archiv-Artefakt).
Steam-Authenticator bereithalten.

## 1. Depot hochladen (SteamPipe)
PowerShell öffnen und ausführen (Login-Name einsetzen):

```
G:\GameDev\SDK\sdk\tools\ContentBuilder\builder\steamcmd.exe +login DEIN_LOGIN +run_app_build G:\GameDev\steam\app_build_4915450.vdf +quit
```

- Steam-Guard-Code eingeben, falls gefragt.
- Das Skript packt `win-unpacked` in Depot 4915451 und lädt hoch.
- Erfolg erkennst du an „Successfully finished AppID 4915450 build".
- Der Build heißt jetzt **„Grim Reach 0.2.0 The Champions Update"** (desc frisch angepasst).

## 2. Build live schalten
Steamworks → App 4915450 → **SteamPipe → Builds**:
- Neuen Build in der Liste finden (Beschreibung „0.2.0 The Champions Update", heutiges Datum).
- Dropdown „Set build live on branch" → **default** → bestätigen (2FA).
- Ab diesem Moment verteilt Steam das Update an alle Spieler.

## 3. Kurz-Verifikation (5 Min)
Eigenen Steam-Client updaten lassen → Spiel starten:
- Intro/Vollbild ok, Version im Hauptmenü
- Ein Elite mit echter Champion-Art auf der Karte
- Kein Save-Problem (Slot lädt)

## 4. Store-Änderungen veröffentlichen
Die gespeicherten Shop-Sachen (Texte 7 Sprachen, Panels, Screenshots):
Steamworks → Store-Seite bearbeiten → Tab **„Veröffentlichen/Publish"** →
„Prepare for publishing" → **„Publish to public"** (2FA). Erst jetzt sind sie live.

## 5. Event veröffentlichen („Patch #1"-Framing)
Alles Copy-Paste-fertig in **`design/steam-event-patch1.txt`** (Titel, Untertitel, Body).
Klick-für-Klick:
1. Steamworks → App 4915450 → **Community → Events & Announcements** → „Create a new Event or Announcement".
2. Typ: **„Game Update"** (bzw. „Patch Notes") wählen.
3. Titel: `Patch #1 — Champions of the Reach (0.2.0)` · Untertitel aus der Datei.
4. Body-Feld: kompletten BBCode-Block aus der Datei einfügen —
   **`[Studio / dev name here]` am Ende ERSETZEN!**
5. Artwork-Tab: `design/marketing/event-assets/event_cover.png` → Slot „Cover Image",
   `event_header.png` → Slot „Header Image". Steams Titel-Overlay auf dem Cover AUS
   (Titel steckt schon in der Grafik, jetzt im Patch-#1-Branding).
6. Vorschau prüfen (Desktop + klein) → **veröffentlichen, sobald der Build live ist**
   (Reihenfolge: erst Build auf default, dann Event — der Post soll auf die live-Version zeigen).

## 6. Außenwirkung (gleich danach)
- Reddit r/incremental_games: `design/marketing/reddit-post-draft.md` ([LINK] einsetzen)
- Key-Mails an Top 5: `design/marketing/influencer-liste.md` (Vorlage unten in der Datei)

## 7. In ~1 Woche
Steamworks → Marketing → **Update Visibility Round** für das Champions-Event starten
(30 Tage / 1 Mio. Impressionen; Event aus Schritt 5 erfüllt die Ankündigungs-Pflicht).

## 8. Rückmeldung an Claude
Nach dem Upload kurz Bescheid geben → Patchnotes-Ritual (0.2.0 als released markieren,
neue „Unveröffentlicht"-Sektion) + Wechsel in den Launch-Beobachtungsmodus.
