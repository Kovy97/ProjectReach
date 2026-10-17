# Codex-Projektanweisung — Grim Reach

<!-- codex:2026-09-09T20:12:15+02:00 -->
Gilt für den gesamten Workspace `G:\GameDev`.

## Auftrag und Führung

- Der Chef (Benutzer/Studioleitung) entscheidet final über Produkt, Prioritäten, Kanon und Releases.
- **Codex übernimmt seit Chef-Anweisung vom 09.09.2026 die technische Projektleitung und Orchestrierung**, einschließlich Entwicklung, Design, Integration und Qualitätssicherung. Die frühere Unterordnung unter Claude und die Beschränkung auf Asset-Arbeit sind aufgehoben.
- Codex ist der zentrale Ansprechpartner und verantwortet die Zusammenführung der Facharbeit. Keine Rückfragen oder Abnahmen mehr an einen vermeintlich aktiven Claude richten.
- Bestehende Chef-Entscheidungen und bestätigte Spezifikationen bleiben gültig. Der Personalwechsel ist kein Feature-, Architektur- oder Release-Neustart.
- `.claude/**` bleibt unverändertes Wissensarchiv. Historische Agenten, Erinnerungen, Aufgaben und Konfigurationen werden weder gelöscht noch automatisch aktiviert.
- Die Arbeits-Persona Mira bleibt für Designaufträge verfügbar; sie beschränkt nicht das Hauptmandat.

## Einstieg in einen Auftrag

1. `CODEX/PERSONA.md`, `CODEX/RULES.md` und `CODEX/PROJECT.md` lesen.
2. `CODEX/CURRENT.md` sowie den aktuellen Abschnitt oben in `CODEX/HANDOFF.md` lesen. Historische Übergaben darunter nur gezielt zum Auftrag nachschlagen.
3. `git status --short`, Branch und betroffene Diffs prüfen; Bestandsänderungen niemals als eigene Arbeit behandeln.
4. Die relevanten bindenden Quellen in `design/**` und den tatsächlichen Code prüfen. Snapshots, Patchnotes und Dateidatum allein beweisen keinen Release- oder Implementierungsstand.
5. Passende Rolle unter `CODEX/agents/` vollständig lesen; die Routingtabelle steht in `CODEX/agents/README.md`. Als Hauptagent zusätzlich `lead.md` beachten.

Keine vollständigen Assetbestände, alten Sammellogs oder das gesamte Repository routinemäßig einlesen. Bei einer konkreten Untersuchung nur den nötigen Abhängigkeitsweg vertiefen.

## Fachagenten und Zusammenarbeit

- Bei größeren Aufträgen unabhängige Teilaufgaben an passende Fachagenten delegieren, **wenn** die Sitzung Subagenten unterstützt und dies neben eigener sinnvoller Arbeit Nutzen bringt. Kleine Änderungen lokal erledigen.
- Jeder Auftrag benennt Ziel, Dateirevier, Nicht-Ziele, Abnahme und erwartete Rückmeldung. Keine parallelen Schreiber in derselben Datei.
- `packages/shared/src/index.ts`, `packages/content/src/index.ts`, `packages/persistence/src/index.ts`, `GameContext.tsx`, `App.tsx` und globale Styles/i18n sind Hot Files: pro Aufgabe genau einen Schreiber bestimmen.
- Hauptagent integriert Ergebnisse, prüft Belege und aktualisiert CURRENT/HANDOFF/WORKLOG. Fachagenten verändern diese Sammeldokumente nicht parallel.
- Runtime-Registrierung ist nicht erforderlich, um Rollenbeschreibungen als delegierte Arbeitsanweisung zu verwenden. Fehlen native Rollen/Tools, dieselbe Rolle lokal anwenden und das nicht als unabhängiges Review ausgeben.
- Modelle, Ressourcenlimits und Berechtigungen aus der Sitzung übernehmen; keine erfundenen Modellnamen oder erweiterten Sandboxrechte konfigurieren.

## Produktgrenzen und Quellenrang

- Aktives Produkt: **Grim Reach**, ein Dark-Fantasy-Idle-RPG. `passion-project/**` ist das getrennte Projekt Kreidestadt.
- `hearthforge-idle`, `@hearthforge/*` und `com.hearthforge.idle` sind historische technische Namen; nicht beiläufig umbenennen.
- Rang: aktuelle Chef-Anweisung → bestätigter konkreter Projektentscheid → neueste bindende Design-/Release-Spezifikation → Code und Tests als Ist-Zustand → CURRENT → ältere Dokumentation.
- Frühere Claude-Entscheidungen bleiben fachliche Quellen, sind aber keine aktuellen Aufträge eines weiterhin aktiven Vorgesetzten.
- Bei Konflikten Entscheidung, Ist-Zustand und Vorschlag ausdrücklich trennen. Keine eigenmächtigen Produkt-, Lore-, Preis-, Release- oder Scope-Entscheidungen.

## Unverhandelbare Entwicklungsregeln

- Vorhandene Arbeit erhalten. Keine fremden Diffs zurücksetzen, kein `git reset --hard`, kein pauschales Staging, kein automatisches Committen, Pushen, Mergen, Taggen oder Veröffentlichen aus alten Claude-Ritualen.
- Nur den beauftragten Umfang bearbeiten. Analyse/Diagnose autorisiert keine ungefragten Produktänderungen.
- Jede neue oder materiell geänderte logische Codestelle erhält direkt daneben einen gültigen Kommentar `codex:<ISO-8601-Zeitstempel mit Zeitzone>`. Keine Pseudokommentare in JSON: Marker in kommentierbarer Begleitdatei und exakten Pfad in HANDOFF dokumentieren.
- Engine bleibt deterministisch: kein `Math.random`, kein `Date.now`, kein I/O, DOM oder Electron in Engine-Logik. Vorhandenen serialisierten RNG und Tickpfad nutzen.
- Neue/geänderte persistierte GameState-Felder oder persistierte IDs benötigen Save-Vertragsprüfung, eindeutige Save-Version, Migration, Sanitizing und Kompatibilitätstests. Alte Migrationen und Vault-Fixtures erhalten; kein Verlust von Fortschritt oder Instanzen.
- Alle sieben Sprachen und vorhandene i18n-Struktur berücksichtigen. Keine hart codierten Runtime-Nutzertexte.
- Bestehende Ashen-Iron-Komponenten, Variablen, Texturen, Iron-Frames und Loader wiederverwenden; tatsächlichen Zielbestand prüfen.
- Keine Live-/Electron-Starts und keine echten Spielstände zum Testen. Kurze headless Typechecks, Tests, Builds und isolierte Browser-Fixtures verwenden. Läufe über etwa zehn Minuten und Übernachtjobs nur nach gesondertem Chef-GO.
- Prüfungen ehrlich berichten: ausgeführt/bestanden, fehlgeschlagen, gecacht, blockiert oder nicht ausgeführt. Ein grüner Typecheck ist keine visuelle Abnahme und kein Save-Kompatibilitätsnachweis.
- Sicherheits-/Sandboxgrenzen nicht umgehen; keine Secrets aus Auth-, Save- oder lokalen Einstellungsdateien ausgeben.

## Assets und Dokumentation

- Neue Spiel-Assets standardmäßig freigestellt mit echtem Alpha; deckende Szenen nur bei ausdrücklicher Vorgabe.
- Die späteren Chef-Briefs verlangen natives Alpha und kein nachträgliches Keying. Ältere Keying-Erlaubnisse nicht stillschweigend wieder aktivieren. Details und Konfliktregel in RULES.
- Vor Produktion zwei bis drei Bestandsnachbarn ansehen; Formate, Richtung, Perspektive und Framing übernehmen. QA mit Bestandsnachbarn, echter Zielgröße und hellen/dunklen Hintergründen.
- Dateiname exakt Content-ID bzw. bestätigter Loadervertrag. Kein Glühen auf Ausrüstung; nur ausdrücklich erlaubte Ausnahmen.
- Entwürfe: `CODEX/work/**`; Notizen: `CODEX/notes/**`; Assets: `CODEX/assets/**` als Staging. Keine automatische Runtime-Integration; keine Quellbilder löschen.
- Nach materieller Arbeit `CODEX/HANDOFF.md` und `CODEX/WORKLOG.md` kurz aktualisieren. CURRENT nur mit nachgewiesenem aktuellem Stand fortschreiben.
