# Aktueller Projektstand

<!-- claude:2026-10-17T16:40:00+02:00 -->

**17.10.2026: Chef arbeitet mit Claude. Aktiver Branch `test-ui-fundament` (Test, nicht gemergt).**
UI-Fundament umgesetzt und geprüft (Details HANDOFF oben). 1.3 ist offen; Sammelliste und
Chef-Entscheide in `design/plan-1.3.md` (1.2.4 geht in 1.3.0 auf, kein Hotfix, Dual Wield auf Eis,
Taverne/„Alive“ nur Test). Version weiter 1.2.3 im Manifest, SAVE 88 unveröffentlicht.

<!-- codex:2026-09-10T11:34:00+02:00 -->

**Branch `1.3`: Navigation nach Chefkritik nachgebessert; seitenweite Skalierungsanalyse fertig.**
Sidebar wieder kräftiger/zentriert (58px Buttons,32px Icons,19px Namensziel mit14px
Untergrenze und Umbruch), Topbar größere goldene Spielreiter, sichtbare Iron-/Materialflächen.
Quellcode und statische Checks/Client-Typecheck bestanden; visuelle Abnahme ausdrücklich offen.
Analyse: `CODEX/notes/2026-09-10-ui-skalierung-ru-analyse.md`. Hauptursache: Viewport-
Breakpoints trotz viel schmalerer Seitenfläche zwischen Sidebar und Queue. Folgeumbau
von Kampf/Enchanting/Shop/Quests/Pets/Achievements vorgeschlagen, noch nicht beauftragt/umgesetzt.

Chef erlaubt direkten Electron-Start zur Prüfung. Direkte EXE meldet32.3.3; isolierter
Spielstart versucht, Main erreicht, dann `platform_channel: Zugriff verweigert (0x5)`;
kein Screenshot. Kein echter Save geladen, Steam aus. Build weiter `esbuild spawn EPERM`.
Vorhandener Renderer vom01.09. ist kein Nachweis aktueller UI. Keine Sicherheitsumgehung.
Details/Rest-QA: `CODEX/work/2026-09-10-interface-reforged/IMPLEMENTATION.md`, neuer Nachtrag oben.
Frühere Aussagen über42px/linksbuendige Navigation und generelles Electron-Startverbot
gelten für diesen Auftrag nicht mehr. Fremddiffs und56 Assetintegrationen erhalten.

<!-- codex:2026-09-10T10:40:00+02:00 -->

**Aktuell: Branch `1.3`, Interface Reforged im Runtime-Code eingebaut.** Sidebar, Topbar und
Action Queue teilen kompakte Bestands-Ironframes, ruhige Flächen und lesbarere Hierarchien.
Header reagiert auf verfügbare Containerbreite; Queue mit einem Scrollviewport, sichtbarem
Stop/Materialstatus und korrigierter Drag-Geometrie für unterschiedliche Zeilenhöhen.
Alle sieben Sprachen ergänzt. Kein Asset-/Save-/Engine-/Paketversionswechsel oder Commit.
Client-Typecheck und statische Scope/i18n/Fixture-Prüfungen plus 20 reine Geometriechecks bestanden.
**Abnahmegrenzen:** Build `esbuild spawn EPERM`, Vitest Worker `spawn EPERM` (0 Tests),
Browser-Skill ohne verbundenen Browser; kein frischer Render-/Interaktionsnachweis.
Umsetzung/QA/Restprüfung: `CODEX/work/2026-09-10-interface-reforged/IMPLEMENTATION.md`.
Die vorher integrierten 56 Asset-Ersetzungen bleiben unverändert. Die folgenden Abschnitte
sind frühere Checkpoints; der neue Header ergänzt, nicht verwirft, ihren bestätigten Stand.

<!-- codex:2026-09-10T09:46:12+02:00 -->

**Aktuell: Branch `1.3`, erste beauftragte Änderung integriert — 56 Asset-Ersetzungen.**
Chef hat selbst gewechselt; Branch vor und nach Integration geprüft. 30 Items, 20 Monster,
1 Pet, 2 Slayer-Consumer und 3 Camp-Tagesbilder unter bestehenden WebP-IDs ersetzt.
56 bytegenaue Original-Backups, unveränderte Review-/Raw-Master, q92/verlustfreies
WebP-Alpha; acht ganze Leinwände proportional auf Bestandsmaße gebracht. Vollständiger
technischer Gate und unabhängige Gegenprüfung bestanden. Sonstige Diffs erhalten.
**Build offen:** Headless Client-Build versucht, `esbuild: spawn EPERM` vor Kompilierung.
Keine Live-App, kein Commit/Push/Release, keine Paket-/Saveversionsänderung.
Details: `CODEX/work/2026-09-09-ausbesserungswelle/INTEGRATION-1.3.md`.
Sicherungen, Installationsmanifest und QA:
`CODEX/assets/ausbesserungswelle-2026-09-09/integration-1.3/`.
Nächster technischer Prüfschritt: headless Client-Build bei erlaubtem esbuild-Prozessstart.
Die folgenden Blocker-/Review-/Produktionsnotizen sind historische Snapshots.

<!-- codex:2026-09-10T09:26:52+02:00 -->

**Neuer Chefentscheid: alle56 Bilder abgenommen; Integration als erste Änderung auf neuem
Branch `1.3` beauftragt. Branch-Erstellung derzeit blockiert:** `git switch -c 1.3` scheitert
beim Schreiben von `.git/refs/heads/1.3.lock` mit Permission denied. Branch weiterhin
`1.2.4CL`, `1.3` nicht angelegt; keine Runtimebilder ersetzt. Keine Umgehung versucht.
Nächster Schritt: Chef legt `1.3` lokal an, dann Integration fortsetzen. Checkpoint:
`CODEX/work/2026-09-09-ausbesserungswelle/INTEGRATION-1.3.md`.
Die folgende Aussage "Chef-Review offen" ist damit durch die Annahme überholt.

<!-- codex:2026-09-10T09:18:36+02:00 -->

**Aktuell: Asset-Ausbesserungswelle vollständig zur Chef-Review bereit.** Die Pause wurde
aufgehoben, alle15 markierten Motive nachgebessert. 56/56 nativePNG-Reviewmaster vorhanden,
56 gesichtet/als Reviewkandidaten ausgewählt, keine offenen Nacharbeitsflags. Acht abweichende
Pixelmaße und Restunterschiede ausdrücklich dokumentiert; keine exakten Kopien/Drop-ins behauptet.
Strikte Abschlussprüfung bestanden:56 unveränderte Runtimequellen,56 native Reviewmaster
hashgleich mit Raw/Generatorausgabe,424 gültige Galerielinks. Keine Runtimeintegration.
Einstieg: `CODEX/assets/ausbesserungswelle-2026-09-09/REVIEW.html`.
Endbericht: dort `status/revision-2026-09-10-root.md`; Phase im Manifest
`review_ready_with_documented_differences`. Alle Bild-Agenten fertig, keine Hintergrundproduktion.
Nächster Schritt ist Chef-Review; Einbau erst nach gesondertem Auftrag.

Die nachstehenden Asset-Pausen-/Produktionsstände sind historische Snapshots und werden
durch den vorstehenden geprüften Abschluss ersetzt; sonstige Produktstände nicht neu geprüft.

<!-- codex:2026-09-10T00:39:20+02:00 -->

**Aktueller Chefentscheid: PAUSE.** Asset-Neuguss hat56 native Review-PNGs gesichert,
41 Kandidaten und15 revisionsbedürftige Vorschläge; acht Dateien mit Maßabweichungen.
Keine Bild-Agenten mehr aktiv. Finaler Galerie-/Hashlauf unterbrochen, nicht als beendet
werten. Fortsetzung erst nach Chef-GO; Einstieg:
`CODEX/work/2026-09-09-ausbesserungswelle/PAUSE-2026-09-10.md`.
Die nachstehenden Produktions-/Blockermeldungen sind ältere Snapshots.

<!-- codex:2026-09-09T20:12:15+02:00 -->
**Geprüft am 09.09.2026.** Snapshot, keine Behauptung über den veröffentlichten Steam-Stand.

## Führung und aktueller Auftrag

Chef hat Codex als technische Projektleitung und Orchestrator eingesetzt.
<!-- codex:2026-09-09T23:29:00+02:00 -->
**Neuester Stand: Produktion wieder aufgenommen.** Reiner Neuguss im eingebauten
Imagegen, nur mit detailliertem Prompt ohne Bild-Edit-Argumente, liefert wieder native RGBA.
Am Talisman zweimal gemessen, außerdem vom Agenten an abyssal_feast bestätigt.
Vorlagen werden weiterhin visuell geprüft und detailliert beschrieben. Erste korrigierte
Talisman-Fassung zur Review gespeichert; geringe Formabweichungen ausdrücklich dokumentiert.
Drei Agenten arbeiten aktuell an Los01,02,03; Lose04,05 anschließend. Kein API-Key/Keying.
Die nachfolgenden Blockerangaben beschreiben den vorherigen, inzwischen abgelösten Stand.
<!-- codex:2026-09-09T23:10:49+02:00 -->
Neuester Chefentscheid: **eingebautes Bildwerkzeug, kein API-Key/CLI-Fallback**.
Zwei neue echte Aufrufe ausgeführt: Geier direkt aus Original-WebP mit kurzem Prompt,
danach Hintergrundkorrektur im Bildwerkzeug aus der erzeugten PNG. Beide erneut RGB,
1254², ohne Alpha, eingebranntes Karo. Insgesamt zehn Raw-Ausgaben, weiterhin 0/56
brauchbare Reviewdateien. `FALLBACK-CLI.md` ist nur Historie, keine offene Nutzerpflicht.
Aktuelle Wiederholungen: `CODEX/work/2026-09-09-ausbesserungswelle/RETRY-2026-09-09.md`.
<!-- codex:2026-09-09T22:48:35+02:00 -->
Aktueller Chefauftrag: referenznahe Neugenerierung der **56 bestätigten Auditfehler für Review**.
56 individuelle Analysen und Prompts vollständig, Quellenhashes und Referenzen geprüft;
fünf Bild-Agenten tatsächlich eingesetzt. **Produktion blockiert: 0/56 brauchbare Reviewdateien.**
Zehn tatsächliche Generatorausgaben für fünf Motive lieferten RGB ohne Alpha mit eingebranntem
Karo, auch nach gezielten Neuversuchen und einfacheren Gegenproben. Rest nicht blind gestartet.
Arbeitsunterlagen: `CODEX/work/2026-09-09-ausbesserungswelle/`.
Review-Staging: `CODEX/assets/ausbesserungswelle-2026-09-09/`; natives Alpha, kein Keying,
keine Runtimeintegration. 55 einzigartige Motive, ein neuer Slayer-Master für zwei Pfade.
Der vorausgehende Audit sichtete 2.069 Runtime-WebPs und fand zusätzlich 44 getrennte
Watch-Fälle; diese bleiben außerhalb der Produktion. Keine neuen Bilder zählen, bevor
Generatorausgabe und Einzelstatus tatsächlich vorhanden und geeignet sind. Zehn ungeeignete
Raw-Bilder separat zum Nachvollziehen gesichert. `PRODUKTIONSSTATUS.md` dokumentiert die
Fortsetzung; anderer CLI-/API-Weg erst nach ausdrücklicher Freigabe, kein Keying-Fallback.
Keine neue Gameplay-/Releaseentscheidung, keine automatische Wiederaufnahme alter Aufgaben.

## Verifizierter Ist-Zustand

- Branch: `1.2.4CL`; HEAD: `053d4c9` (Bestiarium-Erfolge/Dungeonvarianten).
- Client-Paketversion: **1.2.3**; Ankündigungstext für **1.2.4** vorhanden.
  Branchname, Manifestversion und geplanter Release sind getrennte Informationen.
- `SAVE_VERSION = 88`, `TICK_MS = 100`, sieben Locales.
- Fünf Workspace-Pakete; 160 Engine-Testdateien, 23 Persistenz-Testdateien,
  30 Renderer-Seiten. Dateizählung ist kein ausgeführter Testnachweis.
- Taverne im Code vorhanden, `TAVERN_ENABLED = false`.
- Worktree bereits vor Übernahme umfangreich verändert, unter anderem Inventar/Bank,
  Ausrüstung/Kits, Mailtransfer, Combat-HUD, Persistenz und i18n. Nicht bereinigen oder pauschal committen.

## Prüfstand der Übernahme

- `pnpm typecheck`: **5/5 erfolgreich**, davon 1 Turbo-Cachetreffer, 4 neu ausgeführt.
- Save-Vault **blockiert, null Tests ausgeführt**: Der erste pnpm-exec-Aufruf konnte
  `vitest` nicht auflösen. Vitest 2.1.9 ist jedoch installiert; der direkte lokale
  `.cmd`-Aufruf startet den Runner und scheitert vor Sammlung am Workerstart (`spawn EPERM`).
  Keine Neuinstallation oder Umgehung der Prozessberechtigung vorgenommen.
- Keine vollständige Testsuite, keine Simulation, kein Runtime-Build und kein Live-/Electron-Start
  in diesem Aufnahmeauftrag. Keine Releasefreigabe.
- Agentenstruktur-/TOML-/Linkprüfung bestanden. Unabhängiger Kontrolleur-Nachcheck
  der Organisationsstruktur unauffällig; keine native Discovery oder Gameplayabnahme.

## Arbeitsfähigkeit und nächste Schritte

Rollen und Routing stehen in `CODEX/agents/`; Hauptagent kann sie direkt lesen und bei
verfügbarer Delegation als Fachauftrag verwenden. Native TOML-Vorlagen liegen in
`CODEX/agents/native/`. Automatische Registrierung unter `.codex/agents/` ist in dieser
Sitzung wegen Schreibschutz **nicht installiert**. Keine Sandboxumgehung.

Vor der nächsten betroffenen Codeänderung den Testausführungsblocker klären und passende
Regressionen ausführen. Produktpriorität kommt aus dem nächsten Chefauftrag, nicht aus alten Logs.

Die vorherige CURRENT-Sammlung vom Juli/August ist unter
`CODEX/archive/2026-09-09-lead-transition/CURRENT.md` unverändert erhalten.
