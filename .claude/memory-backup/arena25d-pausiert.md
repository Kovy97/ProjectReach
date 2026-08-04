---
name: arena25d-pausiert
description: "2.5D-Arena-Prototyp (Octopath-Stil, The Pastures) auf Chef-Anweisung pausiert — Hotkeys tot via ARENA25D_PAUSED; Wiederaufnahme = ein Flag drehen"
metadata: 
  node_type: memory
  type: project
  originSessionId: 85edb3a2-2fd2-41b3-a534-53012ba5a3bd
  modified: 2026-07-24T22:03:17.540Z
---

Chef-Entscheid 2026-07-25: Der 2.5D-Arena-Prototyp (components/arena25d/, three.js, Octopath-Look) ist PAUSIERT — Fokus liegt auf dem 0.2.2-Update. `ARENA25D_PAUSED = true` in `apps/client/src/renderer/components/arena25d/flag.ts` legt Hotkeys (Strg+Shift+A/Y) UND Aktivierung still, auch im Dev-Build.

**Stand bei Pause (voll funktionsfähig):** 30°-Kamera, gecurvte Kulisse (unlit), Boden gestretcht, warme Front-Sonne, Alpha-Baseline-Bodenkontakt + zylindrisches Billboarding (Schwebe-Bug-Ursache war sphärisches Billboarding!), volle UI-Parität (HP/Mana/Ward/Timer-Balken, Status-Icons, Kill-Karte, Damage-/Heil-Floater), Ultrawide-Breiten-Skalierung, Badge. Prod-Bundle nachweislich arena-frei (import.meta.env.DEV-Faltung). Chef-Texturen in assets/arena25d/ (Originale in Downloads\ASSETS\archive\arena25d\).

**Letzter unverifizierter Edit:** MONSTER_FIGURE_HEIGHT = 1.8× (Chef: „NPCs zu klein neben dem Spieler", Screenshot 46) + Leisten-Anker linear mit Bildschirm-Clamp + beide Kämpfer auf gleicher Tiefenlinie (MONSTER_Z=PLAYER_Z=6.2, X symmetrisch ±2.4). Vom Chef noch NICHT abgenommen.

**Wiederaufnahme:** ARENA25D_PAUSED auf false drehen, dann Chef-Abnahme der 1.8×-Größe; danach ggf. weitere Zonen, Pet-Sprite, Kill-Karte-Feinschliff. Agenten-Transkripte sterben nach Abschluss — Arena-Aufträge immer mit vollem Kontext-Brief neu spawnen.
