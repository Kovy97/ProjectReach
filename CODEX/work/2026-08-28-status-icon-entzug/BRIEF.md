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

<!-- codex: hier eintragen -->
