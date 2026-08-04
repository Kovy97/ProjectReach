# Kanal-Eröffnung + Rollenteilung + kleiner Asset-Wunsch
**Von:** Claude · **Datum:** 2026-08-03 · **Priorität:** normal

Hallo Mira — dieser Ordner (`CODEX/inbox/`) ist ab jetzt der offizielle Weg, wie ich dir Aufträge und Koordinationsnotizen übergebe. Ablauf, Rollenteilung und stehende Vereinbarungen: `CODEX/inbox/README.md`. Deine Arbeit der letzten Tage habe ich vollständig gelesen — sauber dokumentiert, die Übergaben sind vorbildlich nachvollziehbar.

## Rollenteilung (Chef-Entscheid heute)
Du bist die Designerin: Assets, Icons, Texturen, UI-Element-Grafiken und visuelle Konzepte/Mockups. Das Grundgerüst — also alle Implementierung in Engine, Content, Persistenz und Renderer — baue ich. Produktiven Spielcode fasst du nur noch auf ausdrücklichen Chef-Einzelauftrag an; Standard ist: du lieferst das Bild, ich verdrahte es. Deine bisherigen Produktivumbauten bleiben natürlich bestehen und in Ehren — das ist eine Regelung nach vorn, keine Kritik.

## Zur Kenntnis (kein Handlungsbedarf)
Ich habe heute deine offene Verifikation nachgezogen: Engine 1323 Tests grün, Persistenz 325 grün, Client 22 grün, Typecheck alle 5 Pakete, Produktions-Build sauber. Drei Vault-Guards waren rot — NICHT dein Fehler: Nach deinen korrekten Bumps v79/v80 fehlte unser hausinternes Release-Pin-Ritual; ich habe `v80-release-0.3.0.json` gepinnt und den Guard erweitert. Falls du künftig doch einmal per Chef-Auftrag einen Save-Bump machst: im HANDOFF bitte deutlich als **„SAVE-BUMP vNN — Vault-Pin durch Claude nötig"** markieren.

## Asset-Wunsch (dein Revier, klein)
Ich baue gerade die Sichtbarkeit der New-Haven-Boosts in Tooltips/Karten (Aufschlüsselungszeilen „+X % aus New Haven"). Dafür wäre ein **kleines New-Haven-Emblem-Icon** schön: transparent, quadratisch, lesbar bei 14–20 px, Ashen-Iron-Sprache (z. B. stilisiertes Wachfeuer/Palisaden-Motiv passend zur Gründungslore), Tag-Fassung reicht. Staging wie üblich unter `CODEX/assets/` bzw. `CODEX/AssetControl/`, Zielpfad schlage ich vor: `apps/client/src/renderer/assets/ui/icon_newhaven.webp` — die Einbindung mache ich. Kein Blocker: bis es da ist, nutze ich einen bestehenden Platzhalter.

## Rückgabe
Kurze HANDOFF-Notiz mit Staging-Pfad + Vorschau, danach diese Datei nach `inbox/done/` verschieben.
