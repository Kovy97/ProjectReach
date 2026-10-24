# Trailer-Bühne (Trailer v3 „Gehalten“)

<!-- claude:2026-10-24T12:00:00+02:00 -->

Eigener Vite-Einstieg außerhalb von `src/`, nie Teil des Spiel-Builds und nicht im Client-Typecheck. Rendert Szenen
**Bild für Bild** (60 fps, 4 Unterframes je Bild für echte Bewegungsunschärfe), damit Zeitlupen sauber und Aufnahmen
exakt wiederholbar sind. Storyboard: `design/trailer-v3/storyboard.md`.

## Aufruf (aus `apps/client`)

```text
node trailer-stage/render.mjs firstStrike                 # ganzes MP4 nach marketing/trailer-v3/tests/
node trailer-stage/render.mjs frostMoment --still 0.3,1.9 # nur Standbilder bei τ = 0,3 s und 1,9 s
npx vite --config trailer-stage/vite.config.ts            # Vorschau: http://localhost:5420/?scene=firstStrike&preview=1
```

Optionen: `--sub <n>` Unterframes, `--frames a-b` Bildbereich, `--out <ordner>`, `--music <mp3>` (Standard
`Downloads/settings.mp3`). Einzelbilder landen im System-Temp und werden bei jedem Lauf ersetzt.

## Aufbau

| Datei | Inhalt |
|---|---|
| `src/stage.ts` | Renderer, Bloom, Unterframe-Akkumulation, Farbkorrektur (Vignette, Korn, Blitz, Aberration) |
| `src/env.ts` | Kulisse als Kamera-Projektion (Boden + zylindrische Rückwand aus einem Gemälde), Asche/Glut |
| `src/puppet.ts` | Puppen-Morphs für freigestellte Gemälde: Biegen, Lehnen, Atmen, Stauchen, Mantel, Blitz, Frost, Randlicht |
| `src/fx.ts` | Funken/Splitter, Schockwelle, Schwerthieb-Bogen, Blitzkette, Schadenszahl (alles reine Funktionen der Zeit) |
| `src/anim.ts` | Easing, Keyframes, Zeit-Umbildung (Zeitlupe, Treffer-Stopp), deterministischer Zufall |
| `src/scenes/*.ts` | Szenen: `update(τ)` setzt alles für die Musikzeit τ, `grade(τ)` die Farbkorrektur |
| `render.mjs` | Startet Vite + Chromium (GPU), nimmt Bild für Bild auf, ffmpeg mit Musik-Ausschnitt |

## Regeln

- Spieler-Gemälde (`portraits/*`) blicken im Original nach **rechts**, Monster nach **links**: nicht spiegeln.
- Ausrüstung glüht nie: Randlicht und Blitze bleiben unter Normalhelligkeit, nur Effekte dürfen überhell sein.
- Keine echten Spielstände, keine Spiel-Builds; die Bühne liest nur Bilder aus `src/renderer/assets`.
