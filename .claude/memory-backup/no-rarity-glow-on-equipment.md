---
name: no-rarity-glow-on-equipment
description: "Asset-/Prompt-Regel: KEIN Rarity-/Magie-Glow auf Equipment-Art (Rüstung/Waffen/Schmuck)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Stehendes Chef-Prinzip (mehrfach bekräftigt): **Equipment-Art (Rüstung, Waffen, Schmuck) trägt KEINEN
Rarity-/Magie-Glow** — kein „Schimmer", „Glühen", „Leuchten", kein leuchtender Aura-/Rarität-Effekt.
Nur Material, Farbe, Form. Thematische Farbtöne sind ok (z.B. Dämmerleder = dämmerblau), aber NICHT als
Glow formuliert.

**Why:** Rarity wird über Rahmen/Border kommuniziert, nicht über Item-Glow (bewusste Design-Entscheidung,
schon lange). Ein bläulicher „Schimmer" auf Rüstung liest sich wie ein Rarity-Glow → unerwünscht.

**How to apply:** Beim Schreiben der ChatGPT-Icon-Prompts (`design/chatgpt-icon-prompts-*.txt`) für
Equipment-Items KEINE Glow-/Schimmer-/Leucht-Formulierungen. AUSNAHME: magische Reagenzien dürfen glühen —
Runen, Tränke/Tonika, Essenzen, Katalysatoren (das sind keine Equipment-Items). Monster/Trophäen dürfen
thematische Glut/Leuchtaugen haben. Vgl. [[asset-bind-all-references]] [[archive-integrated-assets]].
