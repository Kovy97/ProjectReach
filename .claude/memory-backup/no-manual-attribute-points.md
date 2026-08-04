---
name: no-manual-attribute-points
description: Manuelle Attributpunkt-Vergabe wurde bewusst entfernt — Attribute sind hybrid/abgeleitet; nicht wieder einbauen.
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Manuelle Attributpunkt-Vergabe (`unspentPoints` / `allocatedAttributes` / `STARTING_ATTRIBUTE_POINTS`) wurde bewusst ENTFERNT zugunsten der Hybrid-Progression aus [[game-design]] (Attribute leiten sich via `computeStats` aus Skills/Level/Ausrüstung ab). Der übrige `unspentPoints`-State ist VESTIGIAL.

Fehler 2026-06-25: Ein Playtest markierte `unspentPoints` als „toten State"; ich habe daraus eine Vergabe-UI (B5) gebaut UND ein Quest-System gebaut, das Attributpunkte ausschüttet — also ein bewusst entferntes Feature reaktiviert. Chef hat korrigiert.

**Why:** Manuelle Stat-Punkte widersprechen dem Hybrid-Design; sie waren absichtlich raus.

**How to apply:** Ein im Playtest gemeldetes „totes/ungenutztes Feld" ist Kandidat zum LÖSCHEN, nicht zum Aktivieren — immer gegen die Design-Absicht des Chefs prüfen, bevor man vestigialen State verdrahtet. Das Quest-System darf bleiben, aber Belohnungen = Gold/Items (o.Ä.), NICHT Attributpunkte.
