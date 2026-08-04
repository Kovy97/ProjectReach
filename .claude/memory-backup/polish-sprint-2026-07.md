---
name: polish-sprint-2026-07
description: "Steam-Page LIVE (Grim Reach) — 2-Wochen-Polish-Sprint bis ~2026-07-24, dann Verkaufsstart; Chef-Entscheidungen des Sprints"
metadata: 
  node_type: memory
  type: project
  originSessionId: 553d2095-3a73-4795-9782-0fe746a25f13
---

Stand 2026-07-10: Steam-Store-Page ist offiziell live unter „Grim Reach". **~2 Wochen Polish bis Verkaufsstart (~24.07.2026).** Chef erlaubt bis zu 3 parallele Subagents.

**Sprint-Entscheidungen des Chefs (bindend):**
- **Kein Salvage, kein Gear Vault** — ungewollte Items werden verkauft. Auto-Salvage + Vault komplett raus.
- **Pouch-System raus**: Taschenslots im Inventar + Item small_pouch entfernen; Inventar-Upgrades NUR noch via Shop gegen Gold.
- **Kein Raw-Gold-Drop von Kreaturen** — Gold kommt ausschließlich vom Verkaufen.
- **UI-Scale-Funktion komplett raus** — immer 100 % (auch Options-Regler weg).
- **Quests**: Belohnungen → **Quest-Tokens** + eigener Token-Reward-Shop (Struktur zuerst, Items später); Claim-Notification-Punkt am Quest-Button; Quests in die **Topbar**, Skills-Overview in die Sidebar ganz oben über Combat.
- **Pets/Companions**: je Pet 1 cooler AKTIVER Kampf-Skill + 1 nützlicher, nicht-OP PASSIVER Effekt — **niemals +x% XP** (Pets kommen meist erst nach Max-Level). Erhalte-Popup in Citadel-Stil. Jewelcrafting-Pet referenziert nicht-existente „perfect cut gems" (Bug).
- **Item-Bilder**: Full-Res statt komprimiert (Tooltip-3D-Betrachtung verpixelt); Ladezeit anders optimieren (z. B. WebP hohe Qualität). Originale liegen in Downloads\ASSETS\archive\renderer-assets-pre-optimize-2026-06-28\.
- **Main Menu**: rechts default NICHTS offen (Overwrite-Unfallgefahr).
- UI-Reworks gewünscht: Shop (Buy/Sell-Tabs, ganzer Container), Achievements, Options, Enchanting (alle Citadel-Stil), Monster-Karten (6 Stats in 2×3 wie Character-Screen, Indikatoren oben links im Porträt, XP unten rechts, Drops einzeilig ohne „Drops: x/x", Details-Button weg), Combat-Back-Button flach, Combat-XP-Leiste trackt aktiven Kampf-Skill.

**STATUS-UPDATE (2026-07-10, Tag 1 des Sprints): ALLE 14 Chef-Punkte ERLEDIGT.** Menü-Default, UI-Scale raus, Back-Button, Kampf-XP-Leiste, Shop-Tabs, Achievements/Options, Pouches/Salvage/Vault raus, Monster-Gold 0, Quest-Tokens (+Topbar-Move+Dot+Token-Shop-Gerüst), Monster-Karten 2×3, Enchanting-Altar, Companions-Komplett (Spec design/pet-redesign-spec.md: 21 benannte Abilities, 6 neue Passive, XP-Verbots-Guard, %-DoTs, stealDrop-Bindung, Citadel-Popup, effectiveSellPrice), Full-Res-Item-WebP (711 Stück; 336 ohne Archiv-Original offen). Test-Save „PET TEST" Slot 5 (alle 21 Pets; Generator ui-audit/gen-pet-test-save.mjs). Screenshot-Selbstverifikations-Pipeline etabliert: ui-audit/menu-shot.mjs-Muster + ?fixture= + eigene Ports je Agent. Offene Kür: Ability-Namen-Lokalisierung (5 Nicht-EN/DE-Sprachen), Icon-Wunsch icon_quest_token.png an Chef.
