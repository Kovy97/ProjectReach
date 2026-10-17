# Asset-Brief — Status-Icon „Entzug“ (1 Datei)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 28.08.2026. Vorlage `CODEX/templates/ASSET-BRIEF.md`.
> **Hintergrund:** Mit den Elementar-Effekten (Chef-GO 28.08.) gibt es einen neuen Statuseffekt **Entzug** (EN „Drain“, Element Leere): das Ziel macht 15 % weniger Schaden. Die fünf bestehenden Status-Icons sind deine Gemälde; das sechste fehlt und läuft heute über einen Emoji-Rückfall.

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Status-Icon Entzug |
| Zielversion | 1.2.0, Priorität P2 (klein, kein Blocker) |
| Umfang | 1 Datei, exakt wie die Bestandsserie (Maße, Rahmenlogik, Alpha) |
| **Bestandsreferenz (Pflicht)** | `apps/client/src/renderer/assets/icons/icon_status_burn.webp`, `icon_status_frost.webp`, `icon_status_shock.webp`, `icon_status_poison.webp`, `icon_status_bleed.webp` — gleiche Maße, gleicher Bildaufbau, gleiche Lichtführung; das neue Icon muss in der Reihe der fünf als sechstes lesen |
| Motiv | **Entzug**: ein dunkler, purpurschwarzer Sog, der Kraft aus einer Silhouette zieht: nach innen laufende violette Schlieren um einen schwarzen Kern, ein blasser Purpursaum als einziger Akzent (Leere-Palette wie `assets/fx/fx_impact_void.webp`); kein Glühen nach außen, kein Text |
| Lieferung | `CODEX/assets/status-icon-entzug-2026-08-28/fertig/icon_status_void.png` (+ qa/ mit Kontaktbogen: alle sechs Status-Icons in einer Reihe), danach HANDOFF/WORKLOG |
| Nicht anfassen | Renderer; Einbau macht Claude (WebP, Auto-Discovery über den Dateinamen) |

## Regeln (Kurzfassung, s. `CODEX/RULES.md`)

- Stilabgleich mit dem Zielordner: erst die fünf Bestands-Icons ansehen, dann generieren; echtes Alpha, kein Schachbrett.
- Kein Rahmen zusätzlich zum Serien-Look, keine Plakette, kein Schriftzug.

# Teil B – Produktionsplan (Mira)

<!-- codex:2026-08-28T23:27:20+02:00 -->

1. Alle fünf Bestands-Icons visuell und technisch auf Maße, Motivfläche, Licht, Alpha und
   Detailgrad prüfen; `fx/fx_impact_void.webp` ausschließlich als Palettenanker verwenden.
2. Ein einzelnes freistehendes, grob lesbares Motiv mit nativer Transparenz erzeugen: dunkle
   geschlechtslose Brustsilhouette, zentraler schwarzer Sog und nach innen gezogene violette
   Kraftschlieren. Kein eigener Ring, keine Plakette und kein Außenleuchten.
3. Akzeptiertes Raw alphaerhaltend auf exakt 1254 × 1254 normalisieren, Außenrand freihalten
   und RGB unter vollständig transparentem Alpha bereinigen.
4. Automatisch prüfen: exakter Name, RGBA, 1254², Alpha benutzt, Außenrand Alpha 0 und keine
   technische Farbmatte. Visuell auf dunklem sowie grellrosa Grund und bei 64 px prüfen.
5. Kontaktbogen mit den fünf Bestands-Icons und `icon_status_void` in einer Reihe erstellen;
   anschließend HANDOFF und WORKLOG. Renderer und Monster-Neuguss bleiben unangetastet.

# Teil C – Quellen und Promptauflösung (Mira)

<!-- codex:2026-08-28T23:27:20+02:00 -->

- Serienanker: `icon_status_burn`, `frost`, `shock`, `poison`, `bleed`; alle 1254 × 1254
  RGBA, zentraler freistehender Einzelkörper mit großer, bei Icon-Größe lesbarer Silhouette.
- Palettenanker: mittlere Phase aus `fx/fx_impact_void.webp`: purpurschwarzer Kern, dunkles
  Violett und wenige blasspurpurne innere Spitzen. Kein helles flächiges Magenta übernehmen.
- Motivauflösung: eine dunkle Brust-/Schulter-Silhouette wird um einen schwarzen Kern sichtbar
  nach innen gezogen; fünf bis sieben breite violette Schlieren laufen von den Konturen in den
  Kern. Der reduzierte Kopf-/Schulterumriss liefert die Bedeutung „Kraftentzug“ bei 64 px.

# Teil D – Abnahme und Übergabe (Mira)

<!-- codex:2026-08-28T23:27:20+02:00 -->

- `CODEX/assets/status-icon-entzug-2026-08-28/fertig/icon_status_void.png`, exakt 1254 × 1254,
  PNG RGBA mit echtem Alpha und transparentem Außenrand.
- Kein Text, Rahmen, Hintergrund, Schachbrett, Boden, Schatten, nach außen strahlende Aura oder
  zusätzlicher Akzentton.
- Schwarzer Sog, entzogene Silhouette und nach innen gerichtete purpurne Strömung bleiben im
  Sechser-Kontaktbogen sowie bei 64 px eindeutig lesbar.
- Messbericht und Kontaktbogen unter `qa/`; Renderer-Integration bleibt bei Claude.
