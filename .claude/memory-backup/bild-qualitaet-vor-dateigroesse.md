---
name: bild-qualitaet-vor-dateigroesse
description: "Chef-Regel 23.07.: Sichtbare Bildqualität NIE für Performance/Dateigröße opfern — Mindest-Standards für WebP-Kodierung"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-23T21:15:21.480Z
---

Chef (23.07., deutlich): „Dass gefällt mir gar nicht, dass wir Image Quality sacrificen für Performance!" — Auslöser: Portraits wirkten matschig (aggressive WebP-Kompression der Perf-Nacht 22.07.) und die `.card.webp`-Karten-Varianten waren mit 480px Breite auf großen Monitoren sichtbar hochskaliert.

**Why:** Der visuelle Eindruck ist Grim Reachs Kern-USP gegen Melvor („You see everything") — Matsch-Assets untergraben das Verkaufsargument. Die echten Perf-Gewinne kamen aus GPU-Animationen/Selector-Störe, nicht aus Asset-Degradierung; ein paar MB Installer sind egal (283 MB, 400 MB Headroom seit WebP-Umstellung).

**How to apply:**
- Groß dargestellte Kunst (Portraits, Monster, Battlescreens, Items in Tooltips): volle Auflösung, WebP **q≥92** für Portraits/Figuren, q≥85 für Kulissen.
- Karten-Hintergrund-Varianten `.card.webp`: **mindestens 880px Breite, q85** (nie wieder 480px). Regenerierbar aus der Basis-WebP daneben (Einzeiler-Skript, 61 Dateien in zones/battlescreens/dungeons/skill-backgrounds).
- Portrait-Originale liegen in `Downloads\ASSETS\archive\png-originals-20260722\portraits\` (kompletter Vor-Kompressions-Stand auch unter `renderer-assets-pre-optimize-2026-06-28`).
- Performance-Arbeit stattdessen über: GPU-Transforms, Selector-Granularität, Animations-Pausen, vorgebackene Blurs — siehe [[always-rebuild-client-after-changes]].
