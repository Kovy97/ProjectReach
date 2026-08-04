# Inbox — Nachrichten von Claude an Mira

Dieser Ordner ist der offizielle Kommunikationskanal **Claude → Codex/Mira** (eingerichtet 2026-08-03 auf Chef-Anweisung).

## Ablauf
1. Claude legt hier eine Nachricht ab: `YYYY-MM-DD-NN-<slug>.md` (NN = Tageslaufnummer).
2. Claude meldet dem Chef: „Neue Nachricht für Mira: `<Dateiname>`". Der Chef gibt Mira den Dateinamen.
3. Mira liest die Datei vollständig, arbeitet den Auftrag ab und dokumentiert wie gewohnt in `CODEX/HANDOFF.md` (+ `WORKLOG.md`, Outbox-Backups, `codex:`-Marker).
4. Nach Abschluss verschiebt Mira die Nachricht nach `CODEX/inbox/done/`. Offene Rückfragen notiert sie als **„Rückfrage an Claude"**-Block in ihrer HANDOFF-Sektion — der Chef trägt sie zurück.
5. Rückweg Mira → Claude bleibt unverändert: HANDOFF.md ist die Wahrheit, Claude liest sie zu Beginn jeder Sitzung bzw. nach Chef-Hinweis.

## Nachrichten-Template
```
# <Titel>
**Von:** Claude · **Datum:** … · **Priorität:** hoch/normal/niedrig

## Auftrag
Was gebaut/geprüft/geliefert werden soll — mit Abnahmekriterien.

## Kontext
Warum; Verweise auf bindende Docs/Entscheide.

## Sperrzonen
Dateien/Bereiche, in denen Claude-Agenten aktuell arbeiten (nicht anfassen), plus die Dauer-Tabus aus CODEX/RULES.md.

## Rückgabe
Was in HANDOFF.md stehen soll; ob Claude danach verifiziert (Tests/Build laufen bei Mira nicht — spawn EPERM).
```

## Rollenteilung (Chef-Entscheid 2026-08-03, bindend)
- **Claude baut das Grundgerüst:** sämtliche Implementierung — Engine, Content, Persistenz, React/TSX, CSS-Verdrahtung, i18n, Tests, Releases.
- **Mira ist Designerin:** Assets (Art, Icons, Texturen, Rahmen, UI-Element-Grafiken) und deren Generierung/QA/Staging, dazu visuelle Konzepte/Mockups als Referenz für Claude. Produktiver Spielcode nur auf ausdrücklichen Chef-Einzelauftrag — Standard ist: Mira liefert das Bild, Claude verdrahtet es.
- Aufträge in dieser Inbox sind entsprechend IMMER Design-/Asset-Aufträge, keine Implementierungsaufträge.

## Stehende Vereinbarungen (gelten ohne erneute Erwähnung)
- **Git (seit 04.08.):** Das Projekt liegt auf GitHub (Kovy97/ProjectReach, Branch main). Mira committet selbst NICHT — Claude committet verifizierte Stände (inkl. Miras gelandeter Arbeit, ihre `codex:`-Marker bleiben als Urheber-Kennzeichnung). Die schweren CODEX-Binär-Staging-Ordner (assets/AssetControl/…) sind bewusst NICHT versioniert; Dokumente (HANDOFF/WORKLOG/inbox/notes/work-Docs) schon. Miras Prechange-Outbox-Backups sind ab jetzt optional — Git übernimmt die Sicherung.
- **Verifikations-Vertrag:** Miras Sandbox kann keine Prozesse starten. Nach jeder materiellen Lieferung übernimmt Claude: Vitest-Suiten, Typecheck-Gegenlauf, Produktions-Build, bei SAVE_VERSION-Bumps das Vault-Neu-Pin-Ritual (`packages/persistence/fixtures/save-compat/`). Mira markiert Save-Bumps in HANDOFF deutlich als **„SAVE-BUMP vNN — Vault-Pin durch Claude nötig"**.
- **Hot Files** (`packages/content/src/index.ts`, `packages/shared/src/index.ts`, Persistenz, i18n-Dateien): nur mit exakten Ankern editieren und im HANDOFF einzeln ausweisen.
- Claude überschreibt Codex-Stände nie pauschal; Codex überschreibt Claude-Stände nie pauschal — bei Konflikt entscheidet der neueste Chef-Entscheid, sonst der Chef.
