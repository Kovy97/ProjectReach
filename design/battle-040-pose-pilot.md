# 0.4.0 Posen-Pilot: Sprite-Posen statt Animations-Clips (Chef-GO 2026-08-05)

## Entscheidung
Kampf-„Animation" in der 2.5D-Arena entsteht aus **Posen-Sets** (3–5 konsistente Einzelbilder pro
Kreatur), NICHT aus Video-Clips oder generierten Frame-Zyklen (Bildmodelle halten Charaktere über
8+ Frames nicht konsistent; Video hat kein Alpha). Pilot: **Chicken** (Pastures). Nach Chef-Abnahme
Rollout **Zone für Zone** — Pastures zuerst, danach je Zone gebündelt mit Miras Szenen-Assets
(Runde-2-Aufträge = Szene + Posen-Sets der Zonen-Monster in EINER Nachricht).

## Rollenteilung
- **Mira:** Posen-Assets (Master als Bild-Edit-Referenz, 4er-Kontrolltafel zur Chef-Abnahme, dann
  Feinschliff). Auftrag: `CODEX/inbox/2026-08-05-01-chicken-pose-pilot.md`.
- **Claude:** Posen-Wechsel-System in der Arena (dieses Dokument, §Technik).

## Posen-Vokabular (v1)
| Pose | Datei | Choreographie-Moment |
|---|---|---|
| idle | `<monsterId>.webp` (bestehender Master) | Default: Einlaufen, Wandern, Lauern, Rückkehr |
| windup | `<monsterId>_pose_windup.webp` | Windup-Phase (aus timerRemainingSec) bis Sprint-Start |
| strike | `<monsterId>_pose_strike.webp` | Sprint + Clash-Moment, ~200 ms ab Kontakt-Event |
| hit | `<monsterId>_pose_hit.webp` | Verteidiger ab Kontakt (Knockback), ~250 ms |

Spieler-Charakter nutzt später dasselbe Vokabular (`player_*` analog); Pilot ist monster-only.

## Technik (bindend)
- **Auto-Discovery:** `import.meta.glob` über `assets/monsters/*_pose_*.webp` → Map
  `monsterId → PoseSet`. Fehlt eine Pose oder das ganze Set ⇒ nahtloser Fallback auf den
  Einzel-Sprite (heutiges Verhalten byte-identisch). KEIN Content-/Engine-Eintrag nötig — reine
  Renderer-Konvention, damit der Zone-für-Zone-Rollout ein reiner Asset-Drop ist.
- **Harter Swap, kein Crossfade:** Posenwechsel exakt am Choreographie-Event (Sprite-/
  Octopath-Ästhetik). Kein zweites Plane-Material, kein Opacity-Blending (alphaTest-Cutout-Falle —
  s. unsichtbares-Chicken-Bug: Opacity-Floor 0,55 bleibt unangetastet).
- **Baseline pro Pose:** jede Pose läuft durch `measureSpriteBaseline` (eigener Fußpixel!); Schatten
  + Bodenkontakt folgen der aktiven Pose. Alle Posen-Texturen beim Kampfstart vorladen
  (textureReady-Guard wie gehabt — nie eine ungeladene Textur auf ein sichtbares Billboard).
- **Parität unberührt:** Posen sind reine Visualisierung im Presentation-Layer; Engine/RNG/State
  bleiben byte-identisch (Paritäts-Gesetz aus battle-040-arena-produktion.md §5.2 / Welle-3-Plan).
- Kein Save-Touch, kein i18n-Touch.

## Verifikation Pilot
1. Suiten + Typecheck grün; Bundle unverändert für Nicht-Arena-Pfade.
2. Headless-GPU-Lauf (Playwright, angle/d3d11): Chicken-Kampf mit Posen-Set → webm/Screenshots der
   4 Momente; Chicken OHNE Posen-Set (Dateien temporär umbenannt) → Verhalten wie heute.
3. Chef-Abnahme im Live-Spiel (Pastures, Ctrl+Shift+A) entscheidet den Zonen-Rollout.
