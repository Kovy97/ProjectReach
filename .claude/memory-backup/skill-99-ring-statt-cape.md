---
name: skill-99-ring-statt-cape
description: "Level-99-Skill-Belohnung wird ein legendärer thematischer RING je Beruf, nicht mehr das Meister-Cape (Chef-Entscheid 2026-07-17)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Entscheid (2026-07-17): Die Level-99-Meister-Belohnung je Skill ist ein **legendärer thematischer Ring** („anstelle eines Umhangs einen legendären Ring für 99"). Betroffen: die 21 `cape_master_<skill>`-Items im Content (existieren bereits, ~43 Referenzen) und die 21 zugehörigen Asset-Prompts (waren als Umhänge formuliert).

**Why:** Ringe sind als Icon klarer generierbar/lesbarer, und der Cape-Slot bleibt für Drop-/Chase-Capes frei (Slayer-Unique-Nische).

**How to apply:** (a) Content-Umbau cape_master_* → Ring-Items (Slot-Wechsel cape→ring; Save-Kompat beachten: Bestands-Saves können Capes besitzen/tragen → Migration nach [[save-compat-law]]); (b) die 21 Prompts als detaillierte Ring-Beschreibungen je Beruf neu schreiben (ohne Referenz-Icons nötig, mit [[chatgpt-prompt-chroma-key]]-Klausel, kein Glühen — [[no-rarity-glow-on-equipment]]).
