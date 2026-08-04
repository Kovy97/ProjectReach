---
name: citadel-apply-not-hallucinate
description: "Citadel-UI maximal auf bestehende Features anwenden, aber KEINE neuen Features erfinden"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Chef-Vorgabe (2026-06-26): Beim Citadel-UI-Rollout **so viel vom Kit nutzen wie auf unsere BESTEHENDEN Features applizierbar** ist — aber **keine neuen Features halluzinieren**, nur weil das Kit Assets dafür hat.

**Why:** Das Kit ist ein MMO-GUI mit vielen Elementen, die wir nicht brauchen. Es geht um Politur unseres echten Spiels, nicht um Feature-Wildwuchs.

**How to apply:**
- **Anwenden (haben wir):** Frames/Boxen, Buttons (mit States), Close-Button, Tooltip, Section-Header, `character-frame-player`/`-target` (Kampf-HP/Mana-Frames), `player-/target-buff-debuff` (Status-Icons), `player-/target-cast-bar`, `action-bar`-XP-Bar, Equip-/Inventar-/Ammo-Slots, `Box - Loot`/`Crafting`/`Merchant`(Shop)/`Player Stash`(Bank)/`Quest Log`/`Main Menu`/`Are You Sure`(Confirm)/`Big Map`(Stadt/Zonen), Münz-Icons (copper/silver/gold), **Aktivitäts-Cursor** (mining/woodcutting/smithing/cooking/…), Announcement(Toasts), Content-Box-Slices/Header-Varianten.
- **NICHT erfinden (haben wir nicht):** `minimap`, `Box - Friends`/`Add Friend`, `chat-system`, `party-frames`, `Box - Server Select`, `Box - Ability Book`, `small-npc-frame`. Solche Assets liegen lassen — kein Feature dafür bauen.
- Vgl. [[sidebar-style-is-design-system]], `design/citadel-integration-plan.md`.
