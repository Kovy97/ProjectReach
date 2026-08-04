# UI-Audit Report

Generated: 2026-07-23T07:27:06.244Z
Fixtures: midgame, endgame
Pages visited per fixture: 27
Total screenshots: 54

See README.md for how to read this report and where the screenshots live.

## Summary

- Raw i18n tokens found: 0
- Broken images (naturalWidth 0): 0
- Emoji-fallback icons seen via [class*='fallback'] (informational, narrower — see below): 0
- Emoji found in text nodes (Unicode scan, any className): 55
- Overflow/clipped-text elements: 42 (ellipsis by design: 22, hard-clip: 2, spillover — likely real bugs: 18)
- Off-whitelist font-families: 0
- Console errors/warnings/pageerrors: 0

## Raw i18n tokens

None found.

## Broken images

None found.

## Emoji in text nodes (Sweep 5, Finding 7 — Unicode astral-plane pictograph scan, not just [class*='fallback'])

| fixture | page | emoji | text | selector |
| --- | --- | --- | --- | --- |
| midgame | combat | 🏰 | 🏰 Dungeons | h2.block-heading.dungeon-heading |
| midgame | farming | 🌱 | 🌱 | span.plot-state-icon |
| midgame | stats | 💀 | 💀 | span |
| midgame | options | 🐞 | 🐞 | span.bugreport-entry-icon |
| midgame | options | 🖥 | 🖥 | span.opz-section-icon |
| midgame | options | 🔊 | 🔊 | span.opz-section-icon |
| midgame | options | 🔊 | 🔊 Ton an | button.lang-btn |
| midgame | options | 🎵 | 🎵 Musik an | button.lang-btn.active |
| midgame | options | 🌐 | 🌐 | span.opz-section-icon |
| midgame | options | 💾 | 💾 | span.opz-section-icon |
| midgame | achievements | 🏆 | 🏆 | span.achv-milestone-icon |
| midgame | achievements | 📘 | 📘 | div.achv-emblem.achv-rarity--common |
| midgame | achievements | 📗 | 📗 | div.achv-emblem.achv-rarity--uncommon |
| midgame | achievements | 📙 | 📙 | div.achv-emblem.achv-rarity--rare |
| midgame | achievements | 📕 | 📕 | div.achv-emblem.achv-rarity--rare |
| midgame | achievements | 📚 | 📚 | div.achv-emblem.achv-rarity--epic |
| midgame | achievements | 🏛 | 🏛 | div.achv-emblem.achv-rarity--legendary |
| midgame | achievements | 🌟 | 🌟 | div.achv-emblem.achv-rarity--legendary |
| midgame | achievements | 💫 | 💫 | div.achv-emblem.achv-rarity--legendary |
| midgame | achievements | 🏆 | 🏆 | div.achv-emblem.achv-rarity--legendary |
| midgame | achievements | 🗡 | 🗡 | div.achv-emblem.achv-rarity--common |
| midgame | achievements | 💀 | 💀 | div.achv-emblem.achv-rarity--rare |
| endgame | combat | 🏰 | 🏰 Dungeons | h2.block-heading.dungeon-heading |
| endgame | farming | 🌱 | 🌱 | span.plot-state-icon |
| endgame | enchanting | 🔥 | 🔥 | span.item-cell-emoji |
| endgame | enchanting | 🛡 | 🛡️ | span.item-cell-emoji |
| endgame | enchanting | 👖 | 👖 | span.item-cell-emoji |
| endgame | enchanting | 🧤 | 🧤 | span.item-cell-emoji |
| endgame | enchanting | 💍 | 💍 | span.item-cell-emoji |
| endgame | enchanting | 🛡 | 🛡 | span.ench-rune-section-icon |
| endgame | stats | 💀 | 💀 | span |
| endgame | options | 🐞 | 🐞 | span.bugreport-entry-icon |
| endgame | options | 🖥 | 🖥 | span.opz-section-icon |
| endgame | options | 🔊 | 🔊 | span.opz-section-icon |
| endgame | options | 🔊 | 🔊 Ton an | button.lang-btn |
| endgame | options | 🎵 | 🎵 Musik an | button.lang-btn.active |
| endgame | options | 🌐 | 🌐 | span.opz-section-icon |
| endgame | options | 💾 | 💾 | span.opz-section-icon |
| endgame | character | 🔥 | 🔥 | span.item-cell-emoji |
| endgame | character | 🛡 | 🛡️ | span.item-cell-emoji |
| endgame | character | 👖 | 👖 | span.item-cell-emoji |
| endgame | character | 🧤 | 🧤 | span.item-cell-emoji |
| endgame | character | 💍 | 💍 | span.item-cell-emoji |
| endgame | achievements | 🏆 | 🏆 | span.achv-milestone-icon |
| endgame | achievements | 📘 | 📘 | div.achv-emblem.achv-rarity--common |
| endgame | achievements | 📗 | 📗 | div.achv-emblem.achv-rarity--uncommon |
| endgame | achievements | 📙 | 📙 | div.achv-emblem.achv-rarity--rare |
| endgame | achievements | 📕 | 📕 | div.achv-emblem.achv-rarity--rare |
| endgame | achievements | 📚 | 📚 | div.achv-emblem.achv-rarity--epic |
| endgame | achievements | 🏛 | 🏛 | div.achv-emblem.achv-rarity--legendary |
| endgame | achievements | 🌟 | 🌟 | div.achv-emblem.achv-rarity--legendary |
| endgame | achievements | 💫 | 💫 | div.achv-emblem.achv-rarity--legendary |
| endgame | achievements | 🏆 | 🏆 | div.achv-emblem.achv-rarity--legendary |
| endgame | achievements | 🗡 | 🗡 | div.achv-emblem.achv-rarity--common |
| endgame | achievements | 💀 | 💀 | div.achv-emblem.achv-rarity--rare |

## Overflow — spillover (overflow:visible, content likely pokes out of its box — investigate first)

| fixture | page | selector | scrollWidth | clientWidth |
| --- | --- | --- | --- | --- |
| midgame | enchanting | div.ench-altar-socket.ench-altar-socket--empty | 140 | 104 |
| midgame | achievements | div.achv-body | 208 | 191 |
| midgame | achievements | div.achv-head | 208 | 191 |
| midgame | achievements | div.achv-body | 206 | 191 |
| midgame | achievements | div.achv-head | 206 | 191 |
| midgame | achievements | div.achv-body | 204 | 191 |
| midgame | achievements | div.achv-head | 204 | 191 |
| midgame | achievements | div.achv-body | 205 | 191 |
| midgame | achievements | div.achv-head | 205 | 191 |
| endgame | enchanting | div.ench-altar-socket.ench-altar-socket--empty | 140 | 104 |
| endgame | achievements | div.achv-body | 208 | 191 |
| endgame | achievements | div.achv-head | 208 | 191 |
| endgame | achievements | div.achv-body | 206 | 191 |
| endgame | achievements | div.achv-head | 206 | 191 |
| endgame | achievements | div.achv-body | 204 | 191 |
| endgame | achievements | div.achv-head | 204 | 191 |
| endgame | achievements | div.achv-body | 205 | 191 |
| endgame | achievements | div.achv-head | 205 | 191 |

## Overflow — hard-clip (text silently cut off, no ellipsis — worth a look)

| fixture | page | selector | scrollWidth | clientWidth |
| --- | --- | --- | --- | --- |
| midgame | character | div.cs-portrait-wrap | 354 | 337 |
| endgame | character | div.cs-portrait-wrap | 354 | 337 |

## Overflow — ellipsis (graceful truncation by design, informational only)

| fixture | page | selector | scrollWidth | clientWidth |
| --- | --- | --- | --- | --- |
| midgame | farming | span.farm-cat-name | 132 | 113 |
| midgame | farming | span.farm-cat-name | 116 | 101 |
| midgame | farming | span.farm-cat-name | 138 | 103 |
| midgame | farming | span.farm-cat-name | 119 | 102 |
| midgame | farming | span.farm-cat-name | 115 | 101 |
| midgame | farming | span.farm-cat-name | 114 | 101 |
| midgame | farming | span.farm-cat-name | 163 | 101 |
| midgame | farming | span.farm-cat-name | 115 | 102 |
| midgame | enchanting | span.ench-item-name | 209 | 175 |
| midgame | enchanting | span.ench-item-name | 230 | 175 |
| endgame | farming | span.farm-cat-name | 132 | 113 |
| endgame | farming | span.farm-cat-name | 116 | 101 |
| endgame | farming | span.farm-cat-name | 138 | 103 |
| endgame | farming | span.farm-cat-name | 119 | 102 |
| endgame | farming | span.farm-cat-name | 115 | 101 |
| endgame | farming | span.farm-cat-name | 114 | 101 |
| endgame | farming | span.farm-cat-name | 163 | 101 |
| endgame | farming | span.farm-cat-name | 115 | 102 |
| endgame | enchanting | span.ench-item-name | 189 | 175 |
| endgame | enchanting | span.ench-item-name | 214 | 175 |
| endgame | enchanting | span.ench-item-name | 209 | 175 |
| endgame | enchanting | span.ench-item-name | 219 | 175 |

## Font-family drift (not in styles/base.css whitelist)

None found.

## Console errors / warnings / pageerrors

None found.

## Button class census (informational — Citadel design system rollout is gradual)

| fixture | page | total buttons | citadel-class | other |
| --- | --- | --- | --- | --- |
| midgame | skills-overview | 52 | 18 | 34 |
| midgame | combat | 54 | 18 | 36 |
| midgame | woodcutting | 63 | 18 | 45 |
| midgame | mining | 72 | 18 | 54 |
| midgame | fishing | 64 | 18 | 46 |
| midgame | smithing | 47 | 18 | 29 |
| midgame | cooking | 36 | 18 | 18 |
| midgame | farming | 39 | 18 | 21 |
| midgame | foraging | 36 | 18 | 18 |
| midgame | thieving | 36 | 18 | 18 |
| midgame | leatherworking | 71 | 18 | 53 |
| midgame | jewelcrafting | 36 | 18 | 18 |
| midgame | runecrafting | 40 | 18 | 22 |
| midgame | herblore | 35 | 18 | 17 |
| midgame | slayer | 49 | 34 | 15 |
| midgame | enchanting | 32 | 18 | 14 |
| midgame | stats | 32 | 18 | 14 |
| midgame | mail | 32 | 18 | 14 |
| midgame | options | 56 | 18 | 38 |
| midgame | bestiary | 55 | 18 | 37 |
| midgame | quests | 36 | 18 | 18 |
| midgame | mastery | 48 | 18 | 30 |
| midgame | character | 41 | 18 | 23 |
| midgame | companions | 33 | 18 | 15 |
| midgame | shop | 103 | 80 | 23 |
| midgame | bank | 41 | 20 | 21 |
| midgame | achievements | 48 | 18 | 30 |
| endgame | skills-overview | 52 | 18 | 34 |
| endgame | combat | 52 | 18 | 34 |
| endgame | woodcutting | 93 | 18 | 75 |
| endgame | mining | 116 | 18 | 98 |
| endgame | fishing | 100 | 18 | 82 |
| endgame | smithing | 47 | 18 | 29 |
| endgame | cooking | 36 | 18 | 18 |
| endgame | farming | 44 | 18 | 26 |
| endgame | foraging | 36 | 18 | 18 |
| endgame | thieving | 36 | 18 | 18 |
| endgame | leatherworking | 71 | 18 | 53 |
| endgame | jewelcrafting | 36 | 18 | 18 |
| endgame | runecrafting | 40 | 18 | 22 |
| endgame | herblore | 35 | 18 | 17 |
| endgame | slayer | 49 | 34 | 15 |
| endgame | enchanting | 32 | 18 | 14 |
| endgame | stats | 32 | 18 | 14 |
| endgame | mail | 32 | 18 | 14 |
| endgame | options | 56 | 18 | 38 |
| endgame | bestiary | 78 | 18 | 60 |
| endgame | quests | 36 | 18 | 18 |
| endgame | mastery | 48 | 18 | 30 |
| endgame | character | 41 | 18 | 23 |
| endgame | companions | 40 | 18 | 22 |
| endgame | shop | 103 | 80 | 23 |
| endgame | bank | 41 | 20 | 21 |
| endgame | achievements | 48 | 18 | 30 |

## Screenshots

### midgame

- skills-overview: `shots/midgame/skills-overview.png`
- combat: `shots/midgame/combat.png`
- woodcutting: `shots/midgame/woodcutting.png`
- mining: `shots/midgame/mining.png`
- fishing: `shots/midgame/fishing.png`
- smithing: `shots/midgame/smithing.png`
- cooking: `shots/midgame/cooking.png`
- farming: `shots/midgame/farming.png`
- foraging: `shots/midgame/foraging.png`
- thieving: `shots/midgame/thieving.png`
- leatherworking: `shots/midgame/leatherworking.png`
- jewelcrafting: `shots/midgame/jewelcrafting.png`
- runecrafting: `shots/midgame/runecrafting.png`
- herblore: `shots/midgame/herblore.png`
- slayer: `shots/midgame/slayer.png`
- enchanting: `shots/midgame/enchanting.png`
- stats: `shots/midgame/stats.png`
- mail: `shots/midgame/mail.png`
- options: `shots/midgame/options.png`
- bestiary: `shots/midgame/bestiary.png`
- quests: `shots/midgame/quests.png`
- mastery: `shots/midgame/mastery.png`
- character: `shots/midgame/character.png`
- companions: `shots/midgame/companions.png`
- shop: `shots/midgame/shop.png`
- bank: `shots/midgame/bank.png`
- achievements: `shots/midgame/achievements.png`

### endgame

- skills-overview: `shots/endgame/skills-overview.png`
- combat: `shots/endgame/combat.png`
- woodcutting: `shots/endgame/woodcutting.png`
- mining: `shots/endgame/mining.png`
- fishing: `shots/endgame/fishing.png`
- smithing: `shots/endgame/smithing.png`
- cooking: `shots/endgame/cooking.png`
- farming: `shots/endgame/farming.png`
- foraging: `shots/endgame/foraging.png`
- thieving: `shots/endgame/thieving.png`
- leatherworking: `shots/endgame/leatherworking.png`
- jewelcrafting: `shots/endgame/jewelcrafting.png`
- runecrafting: `shots/endgame/runecrafting.png`
- herblore: `shots/endgame/herblore.png`
- slayer: `shots/endgame/slayer.png`
- enchanting: `shots/endgame/enchanting.png`
- stats: `shots/endgame/stats.png`
- mail: `shots/endgame/mail.png`
- options: `shots/endgame/options.png`
- bestiary: `shots/endgame/bestiary.png`
- quests: `shots/endgame/quests.png`
- mastery: `shots/endgame/mastery.png`
- character: `shots/endgame/character.png`
- companions: `shots/endgame/companions.png`
- shop: `shots/endgame/shop.png`
- bank: `shots/endgame/bank.png`
- achievements: `shots/endgame/achievements.png`
