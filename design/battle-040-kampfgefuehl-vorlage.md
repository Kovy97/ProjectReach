# 0.4.0 „Kampfgefühl" — Entscheidungs- und Phasenvorlage (Synthese, 2026-08-03)

*Synthese aus drei Perspektiv-Docs (alle 03.08., alle gegen echten Code/Assets erhoben):*
- `design/battle-040-juice.md` (2D-Juice, Perf-Budget, Nicht-tun-Liste)
- `design/battle-040-dramaturgie.md` (Mechanik sichtbar machen; **Chef 03.08.: P+E+ freigegeben, Mechanik-Ideen ABGELEHNT**)
- `design/battle-040-25d-assessment.md` (Arena-Prototyp real bewertet, 2.5D-light-Beweis gebaut)
- Klickbarer Light-Beweis: `design/mockups/battle-25d-light-2026-08-03/index.html`

*Chef-Rahmen: 0.4.0 verbessert das Kampfgefühl. Steam-Achievements geparkt (Backlog).*

## 1. Diagnose (alle drei Docs konvergieren)

Der Kampf ist mechanisch reich und hat MEHR Effekte als gedacht (Task-#296-Bestand: Hit-Flash,
Recoil, Partikel, 10 Floater-Typen, Kill-Flourish, fxLevel-System). Was fehlt, sind drei Dinge:
1. **Choreografie in der Zeit** — alles feuert simultan im Event-Frame; es gibt kein Ausholen,
   keinen Einschlag-Moment, keinen Nachklang.
2. **Sichtbarkeit der Mechanik** — ~90 % der Engine-Dramaturgie (Status, Enrage, Ward, Auto-Eat-
   Rettungen, Blutmond-Procs, Erst-Kills) erreicht die Bühne nicht; das Boss-Intro-Fenster
   existiert mechanisch und liegt brach.
3. **Tiefe** — die Bühne ist flach; beide 2.5D-Wege teilen denselben Engpass (eigene Boden-Art je
   Schauplatz, ~24 Battlescreens existieren), und der DOM/CSS-Light-Weg bringt auf gemalter
   Boden-Art beweisbar zu wenig („3D-Gefühl überraschend subtil", Ceiling-Leak im Fallback).

## 2. Phasenplan (Empfehlung)

### Phase 1 — „Lesbarer Schlagabtausch" (Kern von 0.4.0, KEINE offene Entscheidung)
| Paket | Inhalt (Details in den Quell-Docs) | Aufwand |
|---|---|---|
| **Windup-Tell** | Ausholen ~0,35s vor jedem Schlag aus `timerRemainingSec` — DAS Einzel-Feature | S |
| Juice-Kernpaket (§7 Juice-Doc) | Impact-Frames + Crit-Squash, Floater-Lanes + Cap (auch Perf-Fix!), Kill-Upgrade (Blitz/Asche/Mikro-Zeitlupe via Keyframe-Plateau), Gegner-Einzug, Boss-Kamera-Punch + Elite-Spawn-Blitz, Querformat-Drift, Richtungs-/Material-Partikel (macht die Rüstungs-Trinität ablesbar) | 6×S+4×M |
| Dramaturgie-P-Top10 | Status-Overlays am Sprite (burn/frost/bleed/shock/poison aus Live-State), Enrage-Aura ab Schwelle, Regen-Pulse, Auto-Eat-Biss + Potion-Schluck, Ward-Bruch/-Aufbau, Lifesteal-Funken, Boss-Intro-Fenster AKTIVIEREN, Erst-Kill-Moment, Rare-Drop leuchtet am Gegner + fliegt zur Tasche, Blutmond-Proc-Inszenierung | überw. S |
| **E+-Events** | Bleed/Poison-Ticks, Schock/Dodge unterscheidbar, Melee-Lifesteal geloggt — **LÄUFT bereits** | in Arbeit |

### Phase 2 — „Tiefe für alle" (assessment Tier 1, entscheidungsfrei)
Tiefen-Staffelung + echte Kontaktschatten in der BESTEHENDEN 2D-Ansicht für alle Zonen (Sprites
leicht versetzt/skaliert, Schatten-Ellipsen mit der bereits gelösten Alpha-Baseline-Messung).
Kostenlos in Assets, S/M in Arbeit, hebt jede Zone sofort.

### Phase 3 — Arena-Beta (ENTSCHEIDUNG 1)
three.js-Arena (Prototyp existiert, pausiert) als **Options-Toggle-Beta für 2-3 Zonen** mit
budgetierter Boden-/Kulissen-Art je Zone. Empirisch geklärt: Prod-Bundle heute 0 Bytes (auch
three.js tree-shaked — README-Behauptung überholt); Dungeons sind sequentielle 1-gegen-1, also
KEIN Multi-Monster-Problem; Kostentreiber ist rein die Art-Pipeline. DOM/CSS-Light wird NICHT
produktisiert (Beweis bleibt als dokumentiertes Learning).

## 3. Verworfen / Nicht tun
Mechanik-Ideen (Chef 03.08.) · DOM/CSS-Light als eigenes System (Assessment) · Fullscreen-Post-FX,
Shake bei Normal-Hits, Partikel in unthemed Zonen, Engine-Pause/echte Slow-Mo, Engine-RNG für
Optik (Nicht-tun-Listen der Quell-Docs) · Floater unbegrenzt (Cap kommt).

## 4. Offene Chef-Entscheide
| # | Entscheid | Empfehlung |
|---|---|---|
| 1 | ~~Arena-Beta?~~ **ENTSCHIEDEN (Chef 03.08.): Arena wird produktiv, ALLE Zonen** — Claude baut die Logik, Mira liefert alle Assets (Boden/Kulisse/Props/Sonne/Filter je Zone). Spec: `design/battle-040-arena-produktion.md`; Pilot-Dreier Pastures+Crypt+Slagpit, dann Serie. | — umgesetzt als Auftrag |
| 2 | **Kampf-AUDIO im Paket?** Kampfgefühl ist halb Ton: Treffer/Crit/Kill/Boss-SFX + 1-2 Kampf-Ambient-Layer. Voraussetzung: Musik-/SFX-Quellfrage (Lizenz offen seit Juli) | JA — größter Gefühls-Multiplikator pro Aufwand; Quellfrage zuerst klären |
| 3 | Reihenfolge: Phase 1+2 zusammen als eine große Welle oder 1 zuerst shippen? | 1+2 zusammen bauen, EIN 0.4.0 |

## 5. Nächste Schritte nach Chef-Entscheid
Je Phase: Implementierungs-Wellen nach Arbeitsregeln (Design steht ja bereits — direkt Wellen +
Verifikations-Gates). Perf-Gate je Welle: 60fps@3440×1440, juice-check-Zähler, Reduced-Motion-
Matrix aus dem Juice-Doc.
