# Steam Changelog — 0.2.0 "The Champions Update" (EN, for the Steam update post)

*Quelle: `design/patchnotes.md` § „0.2.0 — The Champions Update". Reiner Spieler-Text, alle `_Dev:`-Interna
weggelassen. Ab der ersten `[h2]`-Zeile 1:1 in den Steam-Event-Post kopierbar.*

---

[h2]New: Champions of the Reach[/h2]
[list]
[*] Named elite "Champions" now roam the world on a per-zone schedule, deliberately staggered so activity drifts between zones. A corner alert ("A powerful enemy has been sighted in...") jumps you straight there, the zone gets a pulsing sword banner, and the champion's card sits at the top of the zone with a live countdown — it sticks around for 15 minutes, max.
[*] Champions carry titles ("Greytooth the Famished"), hit noticeably harder than regular monsters, but stay soloable in zone-appropriate gear. Rewards: a fat material bundle, a big boost to that zone's chase-item odds, and a 20% shot at the champion's personal unique — 28 new named items with their own effects, from Hungerfang (heals you on kill) to the Hollowveil Locket (converts damage into your own ward). Every drop is individually rolled. New characters meet their first champion within roughly 20 minutes, and champions only spawn while you're actively playing — going offline costs you nothing.
[*] The Hunt Package builds five systems on top of Champions: Brenna's Bounty Board (Slayer page) shows live champion locations with countdowns and a jump button, plus fresh tracks and quiet zones — every champion kill pays 1 bounty token. Traces & Omens flash a subtle sign on the zone map shortly before a spawn. Blessing synergy: Blood Moon raises champion unique odds from 20% to 25%, Wild Hunt shortens their respawn. The new Champion Codex (Bestiary) tracks sightings, kills, uniques, and fastest kill per champion — unseen ones show as "???". Your first champion kill and first unique find each deliver a letter from Brenna to your mailbox, and a spawn fanfare plays once its audio lands.
[*] Your very first equipment drop on a new save is now guaranteed to roll a suffix, so you see the item-instance system in your first few minutes instead of hour ten. Early champion uniques honor the same guarantee.
[/list]

[h2]New: Blessings & a world that talks back[/h2]
[list]
[*] Blessings of the Reach: the sidebar now shows a card for today's active world blessing. Every weekday brings its own mild bonus — Blood Moon (+15% beast loot, Sat), Ashfall (+15% gathering speed, Tue), Deadstill (+10% crafting speed, Wed), Rotmist (+10% rare drop chance, Sun), Foghold (+10% XP, Mon), Reach's Greed (+20% gold, Thu), Wild Hunt (+10% attack speed, Fri). It changes at local midnight; hover or click for flavor text, the exact effect, and a countdown.
[*] NPCs now comment on what's happening in the world — the Steward, the Merchant, Brenna, and the Warden react to today's blessing, an active champion, your death streak, or your Slayer streak.
[*] The Warden now speaks up at two of the most-seen moments: the offline report opens with a line about what really happened while you were away, and the death popup logs your death into the chronicle by enemy family, with the tone escalating the more often you've died.
[/list]

[h2]Quality of Life[/h2]
[list]
[*] Equipment now has a third tool slot, so pickaxe, axe, and fishing rod/sickle (dual-use weapons like axes included) can all stay equipped at once. Tools still work from your inventory as before — the new slot doesn't change speed.
[*] The elite fight button now clearly shows it's mid-fight instead of silently doing nothing, and an empty enchanting altar explains where runes come from (Runecrafting level 15).
[*] Enemy wards are readable now: a visible shield bar, fully absorbed hits show "Absorbed" instead of a confusing "0", partial absorption is numbered, and a tooltip explains the counter — warded enemies take +20% damage from poison, bleed, and burn.
[*] Guardian/onboarding tutorial boxes are noticeably bigger and easier to read.
[*] New opening sequence: a studio card, rising embers, and the new title theme "The Knight Quiet Forest" (replacing "Crown of Ashes") — click or press any key to skip it. Plus a general feel pass: smoother page transitions, consistent hover/press feedback on every button, softer tooltip fade-ins.
[*] Attribute cards on the character sheet now explain what each stat does on hover or keyboard focus.
[*] Action Queue: chain activities with target amounts (e.g. "mine 100 copper, then 100 iron") and your character works through them automatically, even offline. Every gathering/crafting card now has a 1x/25x/50x/∞ grid that stacks straight into the queue; the running action and matching queued entries collapse into "xN".
[*] Crafting menus now start collapsed, with a search bar that finds recipes instantly and auto-expands the matching categories.
[*] Item Wiki sources are now clickable — a recipe jumps to its skill page and highlights the card, a monster jumps to its zone and flashes the monster card.
[*] The elemental crafting category "Runes" is renamed "Shards" to match the material rename below.
[*] The enchanting window now scrolls its item/rune lists internally instead of stretching the page, and uses a proper arcane background instead of grey rubble.
[*] Tooltips now use the same wooden frame as the rest of the UI.
[*] New Mailbox (4th menu entry, with a counter badge): if your inventory or bank fills up while gathering, crafting, or fighting, the overflow now goes to the mailbox instead of being lost — hit "Claim All" once you've made room.
[*] Axes can now be worn in the tool slot, so a combat weapon in hand, an axe as your tool, and a free inventory slot can all coexist.
[*] Players updating from the previous version get a short "What's New" tour pointing at the (now collapsed by default) action queue and the sidebar resize handle.
[*] Right-click the running queue action to stop it (even an infinite one); right-click a waiting entry to remove it.
[/list]

[h2]Performance[/h2]
[list]
[*] Download size cut from ~684 MB to ~130 MB — the entire art pipeline moved to modern WebP, cut-out items included (and fixed 7 bronze armor pieces that had shown as white boxes since launch).
[*] Save loading after time away: 14.5s down to 1.5s. Even a full 8-hour offline catch-up now loads in under 2 seconds instead of freezing the game.
[*] The Achievements page now opens in 0.2s instead of 0.9s.
[*] Gathering and brewing pages (Cooking, Herblore, Foraging) are now categorized and open instantly.
[*] Combat animations now run on the GPU — no more micro-stutter from health bars and damage numbers.
[*] The main menu now idles at effectively zero CPU cost, and the game window only appears once the first frame is ready instead of flashing up blank.
[/list]

[h2]Bug Fixes[/h2]
[list]
[*] Fixed missing background images on many installs — zone, monster-card, skill-card, and main menu backgrounds could vanish entirely when the game was installed to a path containing parentheses, including the default Steam path (C:\Program Files (x86)\Steam). This likely affected the majority of Steam players.
[*] The second ring slot can now be filled by drag-and-drop (previously only the first ring slot accepted drops).
[*] Item tooltips no longer get stuck under your cursor near the screen edge — they now flip to the other side.
[*] Crafted bows (shortbow/longbow) are now grouped under their wood tier instead of under metal tiers.
[*] Elemental weapon-crafting materials renamed from "...rune" to "...shard" (Force Shard, Frost Shard, Fire Shard, Storm Shard, Aether Shard, Void Shard), so they're no longer confused with enchanting runes.
[*] The action queue now starts itself the moment nothing else is running, instead of sitting idle.
[*] Fixed a wand + off-hand focus exploit: five wands (including both starting wands) weren't flagged two-handed, letting you equip a focus in the off-hand for a double bonus. All wands are now consistently two-handed; existing saves are cleaned up automatically on load, with the freed-up focus returned to your inventory.
[*] Auto-Eat now automatically switches to your next available food when the selected food runs out mid-fight, instead of silently stopping and leaving the depleted item selected.
[*] Auto-Potion no longer chain-drinks healing-over-time potions at full HP — the auto-rebuff now only applies to real combat/regen buffs, and healing is governed purely by the auto-potion HP threshold.
[*] Combat pets now only drop for their matching combat style (melee/ranged/magic) instead of all 7 rolling on every kill, fixing the first pet dropping roughly 7x too often.
[*] Attribute descriptions corrected to match what stats actually do: STR = melee damage, CON = max HP, WIS = mana regen & max mana, LCK = crit chance & crit damage, and DEX now also lists ranged damage.
[/list]

---

[h3]TL;DR (for the event post attachment)[/h3]
[list]
[*] Champions of the Reach: 28 named elite monsters now roam the world, each with a shot at its own personal unique item.
[*] Blessings of the Reach: a different world-wide bonus every weekday, shown right in the sidebar.
[*] NPCs and the Warden now comment on what's happening in the world and in your journey.
[*] Your first equipment drop is now guaranteed to roll a suffix.
[*] Action Queue: chain up activities (e.g. "100x copper, then 100x iron") and your character works through them, even offline.
[*] Mailbox: a full inventory or bank no longer blocks progress — overflow is saved for later.
[*] Download size cut from ~684 MB to ~130 MB.
[*] Save loading after time away: 14.5s down to 1.5s.
[*] Combat animations now run on the GPU for smoother fights.
[*] Dozens of bug fixes, including missing backgrounds on the default Steam install path and a wand/focus stat exploit.
[/list]
