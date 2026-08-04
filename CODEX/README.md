# CODEX-Arbeitsplatz

Dieser Ordner ist Codex' abgegrenzter Studio-Arbeitsbereich für Grim Reach. Er ergänzt Claudes bestehende Struktur, ersetzt sie aber nicht.

## Aufbau

- `RULES.md` — Rolle, Grenzen und Arbeitsweise
- `PERSONA.md` — Aussehen, Stimme und Charakter der Mitarbeiterin Mira Falk
- `PROJECT.md` — stabile Projektanalyse und technische Landkarte
- `CURRENT.md` — zeitgebundener Projekt-Snapshot; vor Nutzung aktualisieren
- `HANDOFF.md` — aktuelle Übergabe an Claude
- `WORKLOG.md` — knapper, fortlaufender Arbeitsnachweis
- `notes/` — interne Analysen und Recherche-Notizen
- `work/` — laufende Entwürfe
- `assets/` — Asset-Staging, noch nicht automatisch im Spiel eingebunden
- `outbox/` — abgeschlossene, von Claude abholbare Lieferpakete
- `templates/ASSET-BRIEF.md` — definitive Übergabevorlage Chef/Claude → Codex für Asset-Aufträge

## Start

Am zuverlässigsten aus dem Projektroot über `START-CODEX.bat`. Der Launcher wechselt nach `G:\GameDev`, prüft `AGENTS.md` und `CODEX/RULES.md` und startet dann Codex.

Die eigentliche dauerhafte Projektrolle steht in der Root-Datei `AGENTS.md`, damit auch ein normal in diesem Ordner gestarteter Codex sie erhält.
