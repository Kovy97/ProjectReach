---
name: sidebar-button-family
description: Sidebar-Button-Asset (3 States) = Standard-Button-Familie; Technik gegen weiße Kanten
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef (2026-07-02): Das rote Sidebar-Button-Asset (`assets/ui/buttons/sidebar_btn_{normal,hover,active}.png`) soll **vermehrt als Standard-Button** verwendet werden — mit seinen 3 States (normal/hover/active als background-image-Wechsel).

**Why:** Einheitliche Button-Sprache spielweit; der Chef hat die Assets dafür generiert.

**How to apply:** Bei Wiederverwendung IMMER die Sidebar-Technik übernehmen: `background-size: 100% 125%; background-position: 50% 44%` (croppt die transparenten Asset-Margins — bei `100% 100%` auf kleine Höhen entstehen sonst sichtbare Kanten-Streifen). Die Assets sind alpha-premultipliziert (weiße Keying-Halos entfernt) — nach Asset-Neuanlieferung Premultiply wiederholen. Kleine Höhen (~46px) funktionieren damit. Nicht für Mini-Controls (Toggles/Selects) — dort feine Citadel-Sprache (ds-button). Vgl. [[bg-texture-palette]] [[sidebar-style-is-design-system]].
