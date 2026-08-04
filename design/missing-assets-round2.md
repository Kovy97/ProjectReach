# Fehlende Assets — Scan 2026-06-28 (Runde 2)

Autoritativer Scan: alle Item-/Monster-IDs im Content vs. vorhandene PNGs in
`apps/client/src/renderer/assets/{items,monsters}/`.

**Ergebnis:** 788 Item-IDs / 84 Monster-IDs → **103 Items + 1 Monster ohne Art.**
Alle bereits gelieferten Assets sind eingebunden (Build grün, 371 Originale archiviert).
Diese hier brauchen NEUE Art (→ ChatGPT-Prompt-Liste Runde 2).

## Fehlende Monster (1)
- scale_skarn

## Fehlende Items (103)

### Bögen (Metall-Tier-Leiter, je Longbow + Shortbow)
copper_longbow, copper_shortbow, bronze_longbow, bronze_shortbow, iron_longbow, iron_shortbow,
steel_longbow, steel_shortbow, blacksteel_longbow, blacksteel_shortbow, mithril_longbow, mithril_shortbow,
adamantium_longbow, adamantium_shortbow, runite_longbow, runite_shortbow, bloodiron_longbow, bloodiron_shortbow,
titanium_longbow, titanium_shortbow, aetherium_longbow, aetherium_shortbow, godiron_longbow, godiron_shortbow

### Zauberstäbe / Magie-Fokus (Tiers)
bronze_focus, copper_focus, mithril_wand, runite_wand, bloodiron_wand, titanium_wand, aetherium_wand, godiron_wand

### Magie-Robe-Sets (vestment/skirt/mitre/handwraps/sandals bzw. cowl/treads/body/legs)
godspark_vestment, godspark_skirt, godspark_mitre, godspark_handwraps, godspark_sandals,
voidweave_vestment, voidweave_skirt, voidweave_mitre, voidweave_handwraps, voidweave_sandals,
runewoven_robe_body, runewoven_robe_legs, runewoven_cowl, runewoven_handwraps, runewoven_treads,
arcane_slippers

### Ranged-Rüstungs-Sets (helm/body/legs/boots/vambraces)
ironhide_helm, ironhide_body, ironhide_legs, ironhide_boots, ironhide_vambraces,
voidhide_helm, voidhide_body, voidhide_legs, voidhide_boots, voidhide_vambraces

### Schilde
ashfen_buckler, grimwood_shield, iron_towershield, voidwood_pavise, willowbark_shield

### Umhänge / Capes
hardened_warcape, leather_warcape

### Nahkampfwaffen
murkvein_longsword, steel_warblade

### Slayer-Ausrüstung & -Verbrauch
slayer_helm, slayer_vambraces, slayer_greaves, slayer_amulet,
plague_mask, ear_plugs, mirror_ward, soul_veil, void_anchor, abyssal_core,
slayer_combat_draught, slayer_hunters_elixir, slayer_war_brew

### Materialien / Monster-Drops
murkvein_ore, murkvein_bar, forge_ember, alpha_fang, basilisk_scale, blighted_bone, dread_fang_shard,
rot_gland, slag_carapace, soul_flayer_fang, void_herald_shard, void_thread, gemstone_ring

### Samen (Farming)
ironvine_seed, nightshade_seed

### Kräuter / Reagenzien
mandrake_root

### Runen
rune_storm_iii

### Nahrung / Tränke (Koch-/Herblore-Output)
cooked_crypteel, spellflare_tisane, steelshot_bisque, witherleek_arcane_broth, witherleek_sharpshooters_pie
