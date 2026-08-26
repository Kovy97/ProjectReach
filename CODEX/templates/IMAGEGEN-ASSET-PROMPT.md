<!-- codex:2026-08-23T18:21:18+02:00 -->
# ImageGen-Promptvorlage — Grim-Reach-Spielassets

Diese Vorlage ergänzt `ASSET-BRIEF.md`. Bindende Quelle ist
`design/asset-anforderungen.md`; bei Widerspruch gewinnt dieses Designdokument.

## Vor dem Prompt

| Feld | Pflichtwert |
|---|---|
| Content-ID | `[exakte ID aus Content/Loader]` |
| Finaler Dateiname | `[content_id].png` oder `[content_id].webp` |
| Assettyp | `[Kreatur / Item / Ausrüstung / Icon / Porträt / Kulisse]` |
| Zielauflösung | `[mindestens gemäß Abschnitt 2 der Asset-Anforderungen]` |
| Hintergrundtyp | `[Freisteller mit nativem Alpha / deckende Szene]` |
| Blickrichtung | `[links / nicht anwendbar / ausdrücklich anders]` |

Ohne bestätigte Content-ID beginnt keine Runtime-Asset-Produktion. Ein Modell kann den
Dateinamen nicht verlässlich im Bild festlegen; Codex setzt ihn bei der Speicherung exakt.

## Gemeinsamer Prompt

```text
Use case: stylized-concept
Asset type: Grim Reach <asset type>, runtime game asset
Primary request: <subject and function>
Subject: <complete visual description>
Style/medium: original hand-painted Ashen Iron dark-fantasy art; muted colors; grounded medieval materials; veteran presence; no comic styling
Composition/framing: <camera and angle>; complete silhouette; generous safe padding; no cropped important forms
Lighting/mood: restrained dark-fantasy light with warm gold only as a controlled accent
Color palette: dark iron, ash gray, weathered leather/wood/stone as appropriate; restrained saturation
Constraints: no text, no logo, no watermark, no unrelated props, no foreign brand styling
Avoid: comedy, folklore costume shorthand, beggar/poverty styling, neon saturation, generic mobile-game gloss
```

## Pflichtzusatz für Freisteller

```text
Output requirement: a native transparent PNG/WebP with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fur, feathers, smoke, fog, cloth fibers, glow, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark unless the brief explicitly requires it.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

Der allgemeine ImageGen-Standardweg mit Chroma-Key plus lokaler Entfernung ist für neue
Grim-Reach-Freisteller ausdrücklich nicht zulässig. Wenn der aktuelle Erzeugungsweg natives Alpha
nicht garantieren kann, stoppt die Produktion vor der Generierung und wird auf einen freigegebenen
Native-Alpha-Weg umgestellt.

## Typabhängige Pflichtzeilen

### Kreatur oder Charakter

```text
Full body, isolated, facing left unless the brief explicitly states otherwise.
No implied ground surface and no shadow inside the image.
```

### Ausrüstung oder Item

```text
One isolated object, shown slightly from the front at a useful three-quarter angle, no ground contact.
No shimmer, glow, luminous rim, or magical aura on equipment. Only explicitly approved runes or potions may emit light.
```

### Deckende Kulisse

```text
Opaque environment artwork; no alpha requirement.
Minimum width 1920 px; composition and crop-safe area follow the brief.
```

## Verbindliches Abnahmegate

- [ ] Alphakanal vorhanden und benutzt; kein Karo und kein Vollflächen-Hintergrund
- [ ] Grellrosa-Kontrasttest ohne Farbsaum bestanden
- [ ] Mindestauflösung erreicht
- [ ] Finaler Dateiname entspricht exakt der Content-ID
- [ ] Kein Leuchten auf Ausrüstung
- [ ] Blickrichtung stimmt

