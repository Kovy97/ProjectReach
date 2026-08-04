# Asset-Brief — Sidebar-Button-Neuausrichtung

## Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Auftraggeber | Chef |
| Projekt | Grim Reach |
| Auftrag | Zwei Auswahlrunden für eine neue universelle Sidebar-Button-Familie |
| Ausgangslage | Aktives Set `button_new`, `button_new_hover`, `button_new_pressed`; rote Flächen gefallen nicht mehr |
| Lieferform | Runde 1: fünf Tafeln mit drei Zuständen; Runde 2: fünf mittelalterliche Einzelassets im Standardzustand |
| Hintergrund | Final transparent gemäß Dauerregel |
| Text / Icons | Keine; reine Button- und State-Bewertung |
| Status | Konzeptauswahl, keine Integration |

## Teil B – Designauflösung durch Mira

**Gemeinsame Leitplanken**

- breites horizontales 9-Slice-taugliches Buttonfeld
- identische Geometrie innerhalb der drei Zustände
- ruhiger Normalzustand, klarer aber kontrollierter Hover, stabiler ausgewählter Aktivzustand
- weißer Text und große Sidebar-Icons müssen später klar lesbar bleiben
- Dark Fantasy / Ashen Iron, hochwertig und materialglaubwürdig
- keine rote Vollflächen-Alarmwirkung
- keine Schrift, Symbole, Logos, Icons oder Szenen
- drei Buttonplatten vertikal auf einer transparenten Konzepttafel

**Runde 1 — drei Zustände**

1. **Ashen Iron** — geschwärztes Eisen, Anthrazit-Leder, kontrolliertes Kupfer
2. **Cold Citadel** — kalter Stahl, Schieferblau, blasses Eislicht
3. **Warden Bronze** — dunkle Bronze, Rauchleder, warmes Altgold
4. **Blackwood Forge** — verkohltes Holz, Eisenklammern, gedämpftes Bernstein
5. **Runed Basalt** — dunkler Basalt, feine Stahlkante, kühles Runen-Cyan
**Runde 2 — nur Standardzustand, stärker Medieval**

6. **Cathedral Iron** — gehämmertes Schwarzeisen, Leder und gotische Eckbeschläge
7. **Blackthorn Oak** — dunkle Eiche, handgeschmiedetes Eisen und Dornrelief
8. **Ironbound Leather** — vernähtes Leder, Eisen und altes Messing
9. **Cryptstone** — gemeißelter Grabstein, Spitzbogenmotive und Eisenbeschläge
10. **Tarnished Reliquary** — gehämmertes Schwarzeisen und angelaufene Messingfassung

## Teil C – Lieferung und QA

**Geliefert:** fünf statt ursprünglich zehn Richtungen; Chef stoppte den Umfang nach Konzept 05.

| # | Richtung | Datei | Status |
|---:|---|---|---|
| 01 | Ashen Iron | `CODEX/assets/sidebar-button-concepts/01-ashen-iron.png` | Finales Auswahl-Demo |
| 02 | Cold Citadel | `CODEX/assets/sidebar-button-concepts/02-cold-citadel.png` | Finales Auswahl-Demo |
| 03 | Warden Bronze | `CODEX/assets/sidebar-button-concepts/03-warden-bronze.png` | Finales Auswahl-Demo |
| 04 | Blackwood Forge | `CODEX/assets/sidebar-button-concepts/04-blackwood-forge.png` | Finales Auswahl-Demo |
| 05 | Runed Basalt | `CODEX/assets/sidebar-button-concepts/05-runed-basalt.png` | Finales Auswahl-Demo |

**Vergleich:** `CODEX/assets/sidebar-button-concepts/comparison-board.png`

**Zweite Auswahlrunde nach Chef-Feedback:** fünf zusätzliche, ausdrücklich mittelalterliche Richtungen ohne futuristische Leucht- oder Technikformen; jeweils nur ein Standardzustand.

| # | Richtung | Datei | Status |
|---:|---|---|---|
| 06 | Cathedral Iron | `CODEX/assets/sidebar-button-concepts/06-cathedral-iron.png` | Finales Auswahl-Demo |
| 07 | Blackthorn Oak | `CODEX/assets/sidebar-button-concepts/07-blackthorn-oak.png` | Finales Auswahl-Demo |
| 08 | Ironbound Leather | `CODEX/assets/sidebar-button-concepts/08-ironbound-leather.png` | Finales Auswahl-Demo |
| 09 | Cryptstone | `CODEX/assets/sidebar-button-concepts/09-cryptstone.png` | Finales Auswahl-Demo |
| 10 | Tarnished Reliquary | `CODEX/assets/sidebar-button-concepts/10-tarnished-reliquary.png` | Finales Auswahl-Demo |

**Vergleich Runde 2:** `CODEX/assets/sidebar-button-concepts/comparison-board-medieval.png`

**QA:**

- alle fünf Tafeln 1254 × 1254 px
- jedes Konzept enthält drei konsistente Zustände
- finale Konzeptdateien besitzen Alpha; alle vier Ecken transparent geprüft
- Chroma-Quellen unter `sources/` erhalten
- keine automatische Spielintegration
- Promptset unter `CODEX/assets/sidebar-button-concepts/PROMPTS.md`
- Runde 2: alle fünf Einzelassets besitzen Alpha; alle vier Ecken transparent geprüft
- Runde 2: farberhaltende Freistellung ohne RGB-Despill auf dem Motiv
- Runde 2: Chroma-Quellen ebenfalls unter `sources/` erhalten

## Teil D – Abnahme

**Chef-Auswahl:** 08 — Ironbound Leather.

## Teil E – Produktionsauflösung 08

- drei getrennte States: Normal, Hover, Pressed / Active
- identische Ausgabegröße `1826 × 331 px`
- identische Alpha-Maske in allen drei States
- Slice-Grenzen: Top 90 / Right 150 / Bottom 90 / Left 150
- PNG und WebP mit transparentem Hintergrund
- Laufzeittest bei `240 × 42 px` und `420 × 76 px`
- Lieferung unter `CODEX/assets/sidebar-button-ironbound-leather/`
- keine automatische Integration in `apps/client`
