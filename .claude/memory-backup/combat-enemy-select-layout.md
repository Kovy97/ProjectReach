---
name: combat-enemy-select-layout
description: "Combat-Gegnerauswahl — 4 Spalten; Karten-Artwork ENDGÜLTIG background-size 100% auto + bottom center, NIEMALS cover (3× verkackt, Chef sauer)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
  modified: 2026-07-25T07:19:11.087Z
---

Monster-Karten-Grid in der Combat-Gegnerauswahl: **4 Spalten** (Chef-Update 22.07., ersetzt das frühere „max. 3"), kompaktere Karten gewollt.

**Karten-Artwork-Formel (ENDGÜLTIG, 25.07., von Chef abgesegnete Semantik):** Das BG-Bild hängt am **Artwork-FENSTER** (`.monster-card.has-bg .monster-card-artwork`, JSX setzt backgroundImage auf dem Artwork-Div!), NIE an der ganzen Karte. Im Fenster: `background-size: cover; background-position: bottom center; background-color: #100c08` — Chef-Vorgabe wörtlich: „Horizontales Bild → Ober- und Unterkante komplett befüllt (Seiten beschnitten); vertikales Bild → links und rechts befüllt (oben beschnitten)" = exakt cover+bottom. cover ist NUR am sichtbaren Fenster erlaubt — am Karten-Root zoomt es brutal (Kartenhöhe ≫ Bildhöhe), dort ist JEDE Formel falsch. Kreatur-PNG: `.monster-card-artwork img` mit `object-position: bottom center; height: 86%; align-self: flex-end` — unten verankert, 86%-Deckel hält Kopffreiheit unter den XP-/Level-Badges.

**Why:** Fünf Korrekturrunden („Verstehe nicht wie du dass so oft verkacken kannst") — Wurzelursache war immer das falsche Element (Karte statt sichtbares Fenster), nicht die Formel. Erst Fenster fixieren, dann ist cover richtig.

**How to apply:** Formeln stehen mit Genese-Kommentar in `combat.css` (`.monster-card.has-bg .monster-card-artwork` + `.monster-card-artwork img`). Bei JEDER Karten-/Container-Umgestaltung mit Hintergrund-Art: erst fragen „an welchem Element ist das sichtbare Fenster?" — cover gehört ans Fenster, niemals an einen Container, der auch Nicht-Bild-Bereiche (Footer!) umfasst.
