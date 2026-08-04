---
name: ui-bigger-and-real-icons
description: Chef will UI durchgängig etwas größer (Sichtbarkeit) + echte Icons statt Emojis
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Vorgabe (2026-06-26): UI-Elemente durchgängig **etwas größer** für bessere Sichtbarkeit — explizit Achievement-Karten, Mastery- und Skills-Overview-Seite vergrößert. Außerdem: **keine Emojis als Icons**, sondern die echten Art-Icons.

**Why:** Bessere Lesbarkeit/Sichtbarkeit und professionellerer Look; Emojis wirken billig ("keine scheiß Emojis").

**How to apply:** Bei neuen/überarbeiteten UI-Seiten großzügig dimensionieren (Karten, Medaillons, Schrift). Für Skill-/Kategorie-Icons die vorhandenen PNG-Sets nutzen statt Emoji:
- Skilling-Skills: `getSidebarIcon(skillId)` → `assets/sidebar/sidebaricon_<skillId>.png` (volle Abdeckung aller Skilling-Skills).
- Kampf-Skills: `getSkillIcon(skillId)` → `assets/skills/<skillId>.png`.
Emoji nur als Fallback, wenn kein PNG existiert. Siehe [[stack-and-architecture]].
