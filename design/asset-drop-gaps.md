# Asset-Drop 2026-06-28 — Content-Lücken & Follow-ups

Großer Asset-Drop (371 PNGs aus `Downloads/ASSETS/resources/done`) via 5 Asset-Agenten eingebunden.
Bilanz: **~364 gebunden**, Rest staged/garbage. Quellen bleiben in `resources/done` (Archivierung nach finalem Verify).

## Staged — Art liegt da, aber Content-ID fehlt (content-dev anlegen → bindet automatisch)
- **`dragonhide_skarn`** — Dragonhide-Schild/Teil (T6). Content hat nur dragonhide_helm/body/legs/vambraces/boots.
- **Basis-Leder-Set vervollständigen:** `leather_boots`, `leather_legs`, `leather_vambraces` (Content hat bisher nur body/helm/cape).

## UI-Follow-up (ui-dev)
- **8 Holz-Baum-Icons** (`icon_ashbarktree`, `icon_ashfentree`, `icon_birchwoodtree`, `icon_blightwoodtree`,
  `icon_grimwoodtree`, `icon_voidwoodtree`, `icon_willowbarktree`, `icon_wraithwoodtree`) liegen in `assets/icons/`,
  haben aber keinen Resolver. Woodcutting braucht eine Baum→Icon-Map (analog FarmPage `CROP_ICON_MAP`) damit sie anzeigen.

## Garbage / ignoriert
- `gpdge,romg.png` — kaputter Dateiname (Komma), nicht zuordenbar. Im Drop liegen gelassen.
- `iron_wanf.png` — Tippfehler-Duplikat von `iron_wand` (saubere Version gebunden).

## Neu gebunden & sofort nutzbar (Auszug)
- **Slayer-Turm 1–5**: Zone-Backgrounds + Battlescreens (alle 5 Etagen) → `getZoneBackground/getBattleScreen("slayer_tower_N")`.
- **Slayer-Master-Portraits**: brenna_ashwick, davorin_coldgrasp, seraphel_mournbane, varek_nameless.
- **Neue Monster** (npc_* + Kreaturen): abyssal_devourer, ashfield_wraith, bone_colossus, bone_stalker, cinder_wretch,
  dreadfang, dread_knight, ember_elemental, forge_demon, gaze_basilisk, hollow_marrow, iron_revenant, plague_grub,
  rot_rat, shambling_carcass, slag_abomination, sorrow_wraith, soul_flayer, void_herald, void_stalker, wailing_shade,
  abyssal_tide_serpent, aether_wraith, charred_doomknight, frost_hexer, frost_hound, gravecliff_specter,
  highland_wyvern, pit_spider, roc_void, slag_kobold, void_titan, voidhusk_crusher, idol_warden, last_idol.
- **Items**: komplette neue Metall-Tier-Waffen (copper→godiron: staff/wand/focus/arrow), Robe-Tiers (apprentice/arcane/
  aether/ember/frost/godspark), Leder-Sets (scaled/studded/hardened/dragonhide/shadowhide/warhide), Runen (flame/frost/
  arcane/hunter/keen/precise/swift I–III + storm/shock/ward/swift/fire/force), Glyphen, Scrolls, Tonics, Seeds, Logs,
  Gems (rough/cut), Essences, Capes, Schmuck. Viele binden bereits an existierende IDs; einige sind „staged" bis die
  zugehörigen neuen Tiers im Content existieren (siehe Smithing-12-Tier-Plan `plans/quirky-snuggling-church.md`).
