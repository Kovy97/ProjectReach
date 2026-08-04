# Asset-Lücken (Stand Session 2, ~13:20)

Auto-Discovery ist aktiv: Eine PNG mit `<id>.png` im passenden Ordner wird automatisch gebunden, **kein Code nötig**.
- Monster: `apps/client/src/renderer/assets/monsters/<monster_id>.png`
- Items: `apps/client/src/renderer/assets/items/<item_id>.png`

Fehlt ein Bild, zeigt die UI das Emoji-Fallback des Items/Monsters — funktioniert, aber weniger schön.

**Stand:** Monster 29/58 bebildert · Items 28/158 bebildert.

## Priorität 1 — Fehlende Monster (29), nach Zone
Monster sind im Kampf/Bestiarium groß sichtbar → höchster visueller Gewinn.

- **pastures:** boar
- **ashfields:** dust_vulture, mire_crawler, pitch_beetle, ash_tyrant
- **blackthorn:** thorn_wolf, moss_golem, spectral_stag, bramble_witch, forest_warden
- **coast:** mud_crab, reef_drowned, tide_siren, deep_kraken
- **wildwood:** forest_hare, gray_wolf, wild_stag, dire_wolf, forest_bear
- **slagpit:** pit_spider, slag_kobold, ember_elemental, iron_revenant, frost_hound, frost_hexer
- **idolhall:** idol_warden, aether_wraith, scale_skarn, last_idol

## Priorität 2 — Fehlende Ausrüstung (32)
Ausrüstung erscheint im Charakterblatt, Tooltips und als Skill-Card-Banner.

- **Waffen/Schilde (Start/Bronze):** rusty_sword, bronze_sword, wooden_shield, short_bow, gnarled_staff
- **Leder-Rüstung:** leather_helm, leather_body, cured_leather_cap, cured_leather_body, scaled_leather_body
- **Iron-Set:** iron_sword, iron_helm, iron_body, iron_legs, iron_shield
- **Steel-Set:** steel_warblade, steel_helm, steel_body
- **Bögen:** grimoak_longbow, blackthorn_warbow
- **Magie-Foki:** dim_focus, frost_scepter, aether_runestaff
- **Schmuck (Jewelcrafting):** fang_necklace, garnet_ring, garnet_amulet, sapphire_ring, sapphire_amulet,
  ruby_ring, ruby_amulet, diamond_ring, diamond_amulet

> Kupfer-Set (17 Teile) ist bereits vollständig bebildert.

## Priorität 3 — Materialien & Sonstige (98)
Materialien tragen funktionierende Emojis; Bilder sind „nice to have". Sinnvolle Cluster, falls gewünscht:

- **Barren (12):** copper_bar … godiron_bar (copper/iron/steel/blacksteel/mithril/adamantium/runite/bloodiron/
  titanium/aetherium/godiron)
- **Spitzhacken (5):** bronze/iron/steel/mithril/runite_pickaxe
- **Munition (10):** arrow_shaft, iron_arrow, copper/steel/mithril/runite_arrow, iron/steel/mithril/runite_arrowheads
- **Edelsteine (8):** rough_garnet/sapphire/ruby/diamond + garnet/sapphire/ruby/diamond (geschliffen)
- **Fisch (10):** raw/cooked × shrimp/trout/cod/salmon/lobster
- **Leder/Häute (4):** raw_hide, scarred_hide, cured_leather, scaled_leather
- **Tier-Drops:** feather, fang, raw_beef, cooked_beef, raw_chicken, cooked_chicken, birds_nest, goblin_ear,
  crude_bone, shaman_totem, chitin_plate, spider_silk, frost_pelt, soulopal
- **Tränke/Glyphen/Essenzen/Runen, Thieving-Wertsachen, Kräuter & Samen, Holz** — Rest der Liste.

## Pipeline-Hinweis (Quick Win, separat)
Die vorhandenen Item-Renders sind ~2 MB/PNG (z.B. ore-Renders 2 MB im Build-Log). Ein Downscale auf ~256 px /
~20 KB würde Build & Speicher deutlich entlasten (Backlog: „Asset-Downscale-Pipeline").
