# UI-Fundament Runde 2: sauber strukturiert (Chef 18.10.2026)

<!-- claude:2026-10-18T10:45:00+02:00 -->

Chef: „Wieso sieht das Design technisch noch so schlecht aus? Komische Layer-Probleme, z. B. bei jedem
Container im Slayer-Auftrag. Mach überall das UI sauberer strukturiert.“
Branch `test-ui-fundament`. Nur Renderer. Vorgänger-Brief: `design/ui-fundament/BRIEF.md` (gilt weiter).

## Befund (Claude, gemessen)

1. **Ebenenversatz:** Panels mit `border-image`-Rahmen, dessen Innenkante transparent ist
   (`gravewood/v3/frames/panel-frame.webp`, Slice 48 auf 11 px), legten ihren Abdunklungs-Verlauf nur auf
   die padding-box. Im Rahmenstreifen lag roher Basalt ⇒ heller Ring, der wie eine verrutschte zweite
   Ebene wirkt. Für Slayer behoben (`slayer.css`, `background-origin/clip: border-box`).
2. **Rahmen in Rahmen in Rahmen:** Seitenrahmen → Sektion → Karte → gerahmte Unterbox → Eisenknopf.
   Beispiel Begleiter-Detail: Passiv/Aktiv/Echo als drei eigene Eisenrahmen in einem Panel.
3. **Drei Rahmenfamilien auf einer Seite gemischt:** Holz (`wooden_frame_with_corners_seamless`),
   Gravewood (`panel-frame.webp`), Eisen (`nav-bronze-lipped-iron-9slice`) plus `card-frame.webp`.
4. **Kopfzeilen je Seite anders gebaut** (Slayer, Laden, Bank, Aufgaben, Begleiter, Bestiarium …).

## Regeln

- **R1 Kein Versatz.** Jede Fläche mit `border-image` deckt alle Hintergrund-Schichten über die ganze Box
  (`background-origin: border-box; background-clip: border-box`, Vorbild `bestiary.css:147`). Kein
  `::before/::after`-Overlay mit abweichendem Inset, keine doppelten Linien durch Rahmen + `border`/
  `box-shadow inset` am selben Element. Prüfen per Zoom auf Ecken (Ausschnitt ×4).
- **R2 Höchstens drei Rahmenebenen:** Sektion → Karte → Bedienelement (`.btn-iron` / `.shop-citadel-btn`).
  Innerhalb einer Karte keine gerahmten Unterboxen: Unterteilung über Trennlinie (1 px, Gold ~18 %
  Deckkraft), Abstand oder einen leicht anderen Flächenton.
- **R3 Eine Rahmenfamilie je Ebene und Seite.** Alle Sektionen einer Seite nutzen dasselbe Rezept, alle
  Karten einer Seite dasselbe. Keine Holz-Sektion neben einer Basalt-Sektion.
- **R4 Kopfzeile einheitlich:** links NPC-Begrüßung (`NpcGreeting`), rechts Kennzahl (Währung/Zähler)
  und Seitenaktionen, eine Zeile, gleiche Höhe und Abstände wie die Slayer-Kopfzeile
  (`slayer.css .slayer-head`). Seiten ohne NPC: Titel links, Rest gleich.
- **R5 Raster und Abstände:** nur `--sp-*`/`--fs-*` aus `base.css`. Sektionen untereinander gleicher
  Abstand; Karten in einem Raster gleich hoch; Text und Knöpfe auf gemeinsamen Achsen.
- **R6 Nicht steril (Chef 17.10.):** Texturen, Eisenrahmen, Ränder, Materialien bleiben. Platz und Ruhe
  kommen aus weniger Verschachtelung, nie aus Materialentzug. Entfernte Rahmen einzeln begründen.

## Grenzen

- Nur eigene Dateien (Revier unten). Tabu für alle: `base.css`, `components.css`, `design-system.css`,
  `index.css`, `chrome*.css`, `sidebar.css`, `topbar.css`, `App.tsx`, `GameContext.tsx`, i18n, Engine,
  Content, Persistence. Braucht ihr dort etwas: im Bericht melden, nicht ändern.
- Keine neuen Spielertexte (sonst 7 Sprachen). Keine Funktionsänderung, keine Feature-Ideen.
- Jede geänderte Regel/Codestelle: Kommentar `claude:<ISO-Zeitstempel+02:00>` mit kurzem Grund.
- `.muted` bleibt 19 px; Schrift nicht verkleinern (Chef will große UI).

## Prüfung (sparsam, Chef 17.10.)

- Einmal vorher, einmal nachher: je Seite `de` bei 1366×768 und 1920×1080 (Harness
  `apps/client/ui-audit/sim-harness.mjs`, Fixture `endgame`, eigener Port). Zum Schluss einmal `ru` bei
  1366×768 für eure Seiten. Keine Render-Schleifen.
- `pnpm --filter @hearthforge/client typecheck` und `pnpm --filter @hearthforge/client test` einmal am Ende.
- Nicht committen. Keine Electron-Starts.

## Rückmeldung

Kurz: je Seite was geändert wurde (R1–R6), Pfade der Nachher-Bilder, offene Punkte, Prüfergebnisse.
