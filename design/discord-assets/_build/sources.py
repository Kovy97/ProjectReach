# Grim Reach Discord-Grafiken - gemeinsame Quellenliste (Emojis, Rollen-Symbole, Sticker).
# claude:2026-10-25T13:05:00+01:00 - Chef-Auftrag 25.10.: Discord-Server "Heartforge Studios", nur Bestandsbilder.
# Pfade relativ zu apps/client/src/renderer/assets/. Wird von qa_alpha.py und build_icons.py gelesen.

A = "G:/GameDev/apps/client/src/renderer/assets/"
F = "G:/GameDev/apps/client/src/renderer/fonts/"

# Emojis 128x128 (Name im Discord-Stil -> Quelle)
EMOJIS = {
    "gr_gold": "icons/icon_goldcoin.webp",
    "gr_loot": "icons/icon_ach_gold.webp",
    "gr_raidchest": "ui/raid/raid_chest_closed.webp",
    "gr_raidloot": "ui/raid/raid_chest_open.webp",
    "gr_slayer": "skills/slayer.webp",
    "gr_trophy": "icons/icon_ach_trophy.webp",
    "gr_crown": "icons/icon_tier_crown.webp",
    "gr_xp": "icons/icon_xp.webp",
    "gr_heroic": "icons/icon_rarity_heroic.webp",
    "gr_mythic": "icons/icon_rarity_mythic.webp",
    "gr_potion": "icons/icon_potion.webp",
    "gr_heart": "skills/vitality.webp",
    "gr_fire": "icons/icon_status_burn.webp",
    "gr_frost": "icons/icon_status_frost.webp",
    "gr_poison": "icons/icon_status_poison.webp",
    "gr_shock": "icons/icon_status_shock.webp",
    "gr_bleed": "icons/icon_status_bleed.webp",
    "gr_rage": "icons/icon_enrage.webp",
    "gr_dice": "icons/icon_dice.webp",
    "gr_combat": "icons/icon_ach_combat.webp",
    "gr_melee": "skills/attack.webp",
    "gr_ranged": "skills/ranged.webp",
    "gr_magic": "skills/magic.webp",
    "gr_gathering": "icons/icon_gathering.webp",
    "gr_crafting": "icons/icon_crafting.webp",
    "gr_quest": "icons/icon_quests.webp",
    "gr_hearth": "sidebar/sidebaricon_newhaven.webp",
    "gr_fist": "icons/icon_attribute_strength.webp",
    "gr_bug": "pets/silkweaver.webp",
    # gr_gg wird aus Cinzel-Schrift gesetzt (keine Bildquelle), siehe build_icons.py
}

# Rollen-Symbole 64x64 (Rolle -> Quelle)
ROLES = {
    "role_heartforge": "sidebar/sidebaricon_newhaven.webp",
    "role_admin": "icons/icon_tier_crown.webp",
    "role_moderator": "skills/defence.webp",
    "role_game_moderator": "icons/icon_ach_combat.webp",
    "role_helper": "icons/icon_potion.webp",
    "role_beta_tester": "sidebar/sidebaricon_runecrafting.webp",
    "role_content_creator": "sidebar/sidebaricon_inscription.webp",
    "role_member": "icons/icon_xp.webp",
}

# Alternativen, die nur in der QA mitlaufen (Vergleich bei 16-20 px)
ROLE_ALTS = {
    "alt_moderator_ward": "skills/warding.webp",
    "alt_member_sword": "icons/icon_attack.webp",
    "alt_member_paw": "icons/icon_paw.webp",
    "alt_heartforge_anvil": "sidebar/sidebaricon_smithing.webp",
    "alt_beta_dice": "icons/icon_dice.webp",
}

# Aussortiert nach Messung/Sichtpruefung oder als Doppelung (nicht gebaut):
# icons/icon_mana.webp (binaere Treppenkante 56 %), icons/icon_wealth.webp + icon_ach_gift.webp (Doppelung zu Gold/Beute),
# icons/icon_mastery_star.webp + icon_paw.webp (harte Kante 36 %, bei 22 px nur Scheibe), pets/hoarspite.webp (heller Saum 7,3 %).

# Kopfbild-Medaillons (Kanal -> Icon) und Sticker-Figuren
HEADER_ICONS = {
    "welcome": "sidebar/sidebaricon_newhaven.webp",
    "rules": "icons/icon_ach_scroll.webp",
    "faq": "sidebar/sidebaricon_save.webp",
    "announcements": "icons/icon_tier_crown.webp",
    "patch-notes": "sidebar/sidebaricon_smithing.webp",
    "dev-log": "sidebar/sidebaricon_inscription.webp",
    "guides-and-builds": "icons/icon_ach_compass.webp",
    "suggestions": "icons/icon_quests.webp",
    "bug-reports": "pets/silkweaver.webp",
    "beta-news": "sidebar/sidebaricon_runecrafting.webp",
}
STICKERS = {
    "sticker_gg": "pets/pyreling.webp",
    "sticker_loot": "ui/raid/raid_chest_open.webp",
    "sticker_afk": "pets/booted_tomcat.webp",
}
