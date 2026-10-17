# Arbeitsregeln — Projektleitung und Fachteam

<!-- codex:2026-09-09T20:12:15+02:00 -->

## Mandat und Grenzen

Codex führt die technische Arbeit an Grim Reach im Auftrag des Chefs. Das umfasst Planung,
Code, Content, Design, Assets, Integration und QA innerhalb des erteilten Auftrags.
Die frühere Design-only-Charta ist ersetzt. `AGENTS.md` regelt Führung und Quellenrang.
Claude muss nicht mehr gefragt werden; `.claude/**` bleibt als unveränderte historische Quelle erhalten.

Der Chef entscheidet Produktumfang, Kanon, Termine, Preise und Veröffentlichung. Ein Featureauftrag
erlaubt die erforderlichen normalen Umsetzungsschritte, nicht einen Enginewechsel, Depot-Upload
oder eine ungefragte öffentliche Nachricht. Reine Analyse/Diagnose bleibt lesend.
Keine automatische Wiederaufnahme alter Aufträge, Hintergrundjobs oder pausierter Assetbatches.

## Arbeitsablauf

1. Aktuellen Auftrag abgrenzen; relevante Fachrolle und bindende Quellen lesen.
2. Branch, Dirty-State und betroffene Daten-/Aufrufwege prüfen.
3. Abnahme definieren; bei mehreren Schreibern Dateizuständigkeit vorher festlegen.
4. Klein und zusammenhängend umsetzen, fremde Arbeit und bestehende Konventionen erhalten.
5. Passende headless Checks ausführen; bei wesentlichen Änderungen unabhängiges Review
   durch `kontrolleur`, sofern Delegation verfügbar und sinnvoll.
6. Hauptagent führt Ergebnisse zusammen. HANDOFF nennt Ergebnis, Pfade, Belege, offene Punkte;
   WORKLOG bekommt einen kurzen datierten Eintrag. Nicht geprüfte Teile nicht „fertig geprüft“ nennen.

`CODEX/agents/README.md` enthält Routing; `lead.md` den Übergabe- und Prüfvertrag.
Scope-Grenzen der Rollen sind Arbeitsregeln, keine technisch erzwungenen Dateisandboxen.

## Datensicherheit und Git

- Bestehende Änderungen gehören dem bisherigen Bearbeiter bzw. Chef. Nicht zurücksetzen,
  überschreiben, nebenbei formatieren oder in eigene Commits übernehmen.
- Hot Files haben einen Schreiber. Bei unvermeidlicher Überschneidung erst Diff und Vertrag
  abstimmen, dann klein patchen. Laufende Branches nicht eigenmächtig wechseln.
- Keine automatische Übernahme des historischen Commit-/Push-Rituals. Commit, Push, Merge,
  Tags und Releases nur im aktuellen autorisierten Workflow; niemals Auth-Tokens ausgeben.
- Echte Spielstände niemals für Tests ändern, migrieren oder löschen. Steam-Cloud-Savepfad
  nicht verändern. Fixtures verwenden; neue veröffentlichte Save-Versionen im Vault pinnen.
- Save-Vertragsänderung = eindeutige Version + additive Migration + Sanitize + Tests.
  Alle je ausgelieferten Vault-Fixtures müssen weiter laden. Keine Versionsnummer wiederverwenden.
- Bei IDs/Instanzen sämtliche betroffenen Referenzorte prüfen, nicht eine alte feste Liste kopieren:
  Inventar-/Bankslots, Instanztaschen, Ausrüstung, Kits, Post, Queues, Fortschritt und weitere aktuelle Felder.
- Neue Codeblöcke und materielle Eingriffe erhalten `codex:`-Zeitmarker mit Zeitzone.
  Kommentarlose Datenformate bleiben gültig; Marker und exakten Pfad in HANDOFF nachweisen.

## Architektur und Verifikation

- Shared definiert Verträge; Engine verarbeitet übergebene Daten deterministisch; Content liefert
  Definitionen; Persistenz migriert; der Client zeigt an und kapselt Plattform-I/O.
- Keine Zeit-/Zufalls-/Datei-/Browserzugriffe in Engine-Logik. `advance`, `TICK_MS` und
  serialisierten RNG verwenden. `computeStats` bleibt die zentrale Stats-Aggregation.
- Runtime-Nutzertexte über vorhandene i18n: en, de, zh, ru, es, pt-BR, fr. UI- und
  Content-Übersetzungen sind getrennte Quellen; Glossar beachten.
- Kein `pnpm dev`, `electron-vite dev`, Electron oder reales Spiel beim Testen starten.
  Browserchecks nur headless und mit isolierten Fixtures, ohne reale Saves/Steam.
- Kurze gezielte Tests zuerst. Root-Typecheck für paketübergreifende Verträge; nach
  Runtime-UI-/Contentänderungen auch Client-Build. UI zusätzlich visuell/responsiv prüfen.
- Lange Simulationen/Soaks über etwa zehn Minuten nur nach Chef-GO; vollständige Releaseprüfung
  separat planen, nicht aus einer Statusfrage ableiten.
- Bei zweifelhafter Cacheausgabe direkt Pakettests oder `pnpm exec turbo run test --force`
  verwenden; keine pauschale Cache-Löschung. Nicht `pnpm test --force` als Nachweis verwenden.
- Fehlende Testwerkzeuge/Prozessrechte konkret melden. Keine stillen Installationen oder
  Sandbox-Umgehungen. Typecheck, Tests, Build und visuelle QA sind unterschiedliche Belege.

## Art Direction und Assetvertrag

- Ashen Iron: gemalte düstere Fantasy, gedeckte Materialien, Eisen/Stein/Leder/Holz,
  sparsame Gold-/Kupferakzente. Lesbarkeit in tatsächlicher UI-Größe ist die Abnahme.
- Zuerst zwei bis drei Bestandsdateien im Zielordner **ansehen** und den Loader prüfen.
  Format, Perspektive, Licht, Skalierung, Blickrichtung und Rahmenverwendung daraus übernehmen.
- Bestands-UI-Icons sind häufig freistehend, keine automatisch erfundene Plakette.
  Einzelergebnis-Aktionen verwenden ggf. das Itembild; keine unnötige Szenenkarte liefern.
- `design/asset-anforderungen.md` als Grundvertrag lesen. **Bekannter Alttext-Konflikt:**
  Dort steht noch eine Keying-Erlaubnis und eine pauschale Figurenausrichtung. Die späteren
  Chef-Aufträge verlangen natives Alpha ohne nachträgliches Keying und unterscheiden
  rechtsblickende Spieler/Pets von linksblickenden Gegnern. Aktuellen Brief und tatsächlichen
  Consumer prüfen, Konflikt melden; niemals einen nativen weichen Rand nachkeyen.
- Freisteller: natives echtes Alpha, keine gemalte Transparenz, kein Chroma-Key und kein
  nachträgliches Ausschneiden. Ist das nicht lieferbar, vor Produktion stoppen und benennen.
  Ausdrücklich deckende Kulissen und Steam-JPGs sind ausgenommen.
- Keine Ausrüstungs-Aura, kein Glühen/Partikelrand. Runen/Tränke oder andere ausdrücklich
  freigegebene Effekte sind Ausnahmen, keine allgemeine Materialregel.
- ID und Lieferformat vorab bestätigen: Dateiname exakt ID bzw. bestehender Loadervertrag.
  Vorhandene Schreibweisen/Sondernamen bewahren; keine `final`-/`v2`-Suffixe in Runtime.
- Keine Quellbilder löschen; Raw, Lieferung und QA nachvollziehbar halten. WebP-Itemqualität q92
  verwenden, wenn der aktuelle Brief nichts anderes bindend festlegt.
- QA: Maße/Format, Alpha wirklich benutzt, kein weißer oder farbiger Saum auch in Rauch/Fell,
  keine Karoartefakte, vollständige Silhouette, anatomisch/funktional plausible Waffen.
  Kontaktbogen mit mindestens zwei Bestandsnachbarn und Prüfung auf hell/dunkel/Signalfarbe.
- `CODEX/assets/**` ist Staging, keine automatische Produktion. Integration nur bei Freigabe,
  Loader-/ID-Abgleich und QA; für freie Aufträge `CODEX/templates/ASSET-BRIEF.md` nutzen.
