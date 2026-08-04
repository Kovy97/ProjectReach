---
name: bg-texture-palette
description: Farb-Textur-Palette (1672×941 PNGs) für App-Hintergrund + künftiges Element/Tier-Theming
metadata: 
  node_type: memory
  type: reference
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef hat eine **Textur-Palette** geliefert (alle 1672×941 PNG, Schiefer-/Stein-Look) in
`C:\Users\MSchu\Downloads\ASSETS\resources\done\`: `bg_grey`, `bg_grey2`, `bg_blue`, `bg_copper`,
`bg_green`, `bg_purple`, `gr_red`, `bg_black`.

- **`bg_grey`** ist der **App-Haupthintergrund**: liegt als `apps/client/src/renderer/assets/bg_grey.png`,
  in `styles.css` auf `body` als **gekacheltes** (`repeat fixed`, native Auflösung, KEIN Stretch) BG mit
  leichtem Dark-Overlay (~0.3). Character-Equipment/-Inventory-Panels sind transparent → Textur scheint durch.
- Die übrigen Farbtexturen sind als **Element-/Tier-/Rarity-Hintergründe** gedacht (z. B. bg_copper für
  Kupfer-Tier, bg_blue für Frost/Magie, gr_red für Feuer). Noch nicht eingebunden — bei Bedarf nach
  `assets/` kopieren und referenzieren.

Chef-Vorgabe: **immer kacheln, nie stretchen** (Schärfe). Siehe [[ui-bigger-and-real-icons]].
