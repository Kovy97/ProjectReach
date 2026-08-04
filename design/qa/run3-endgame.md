# QA Run 3 — Endgame L60–99 (hard 99-cap)

**Playtester:** read-only data audit (content/index.ts, engine, leveling/combat sim)
**Date:** 2026-06-27
**Focus:** Endgame fullness per skill, pacing to 99, walls, combat scaling, top gear tiers (Godiron/Godgem/Dragonhide/Shadowhide), Slayer-Tower endgame, dungeons.

## Fun-Score: 7 / 10

A genuinely deep, content-rich endgame on the *skilling* and *gear-collection* side — clean tier ladders all the way to 99, a real capstone boss, layered meta-goals. The score is held back by a thin and funnel-shaped **combat** endgame: the 90→99 stretch (which is ~59% of the entire game's XP) routes every combat style into farming the same ~4 monsters in a single zone, with a content vacuum at L84–91 for non-Slayer players. Fix the L85–99 monster variety and this is an 8.5+.

---

## Data snapshot (real catalog)

- 22 skills · 793 items · 79 monsters · 678 actions · 11 zones · 6 dungeons · 24 sets · 21 pets · 461 achievements · 88 quests
- XP curve (RS/Melvor, ÷4, hard cap 99): **total to 99 = 13,034,431**
  - 1→60 = 273k (**2.1%**) · 60→99 = 12.76M (**97.9%**) · **90→99 = 7.69M (59.0%)** · 95→99 = 4.26M · 98→99 = 1.23M
  - Endgame *is* the game by design. Pacing therefore lives or dies on L60–99 target density.
- Combat XP model: dmg×0.13 (melee; ranged/magic ×1.2) + `monster.xp` kill bonus, both damped by `combatXpLevelMult`: full XP while skill ≤ mob+5, linear to **0 once skill ≥ mob+15**. Loot/gold are never damped. Vitality XP is undamped.

## Top strengths

1. **Skilling endgame is genuinely full.** All 13 non-combat skills have well-spaced actions up to L99. Smithing has 254 actions (104 at L60+, 62 at L80+), runecrafting 66, leatherworking 80, fletching/cooking/fishing/etc. each carry L60/70/80/90/95/99 tiers. No skill "runs out" before 99.
2. **Clean melee gear ladder to the cap.** Runite(60) → Bloodiron(70) → Titanium(80) → Aetherium(90) → **Godiron(99)**, each a full 9-piece set + complete weapon family (dagger→maul + bows + staves/wands), plus Godgem jewelry (95/99). Stats scale coherently (Godiron platebody 136 def / 340 HP). 24 sets with bonuses.
3. **Real capstone fight + dungeon.** `last_idol` L120 (1400 HP, enrage <30% HP ×1.75 dmg, regen 14, resists shock+poison) anchors the Idol Hall zone and the req-99 `idol_sanctum` dungeon (9000 XP / 8000 gold per run). Idol Hall mobs carry resists/regen — meaningfully harder than a stat-bump.
4. **Layered meta-goals.** Slayer Tower (5 floors, thresholds 1/20/40/60/80), 3 endgame dungeons (Highland Aerie 65, Wyvern Lair 82, Idol Sanctum 99), 21 pets, maxing 22 skills, total-level 1000/1500 ("Ascendant"/"Eternal Scholar"), 1k-kill achievements per monster. Plenty to chase beyond a single XP bar.

---

## Findings

### [P1] Combat XP funnels into 4 mobs in 1 zone for the back 59% of the game
At skill 90+, only **4 non-Slayer-Tower monsters give full XP** — and all 4 are in the single **Idol Hall** zone: `idol_warden` L92, `aether_wraith` L98, `scale_skarn` L104, `last_idol` L120. At skill 99 only 3 do. Because 90→99 is 59% of all XP, every melee/ranged/magic player spends the longest grind of the game on the same handful of mobs in one room. Concretely: 98→99 on one offensive skill ≈ 553 kills of aether_wraith (or ~76 last_idol) — repeated for attack/power **or** ranged **or** magic_off, plus defence/magic_def.
**Fix:** Add 3–5 open-world monsters in the **L88–L115** band spread across highlands/coast/slagpit (or a second high-tier zone) so L85–99 has rotation instead of one farm spot. Even reskinned variants with distinct resists would break the monotony.

### [P1] Open-world content vacuum at L84 → L92 (non-Slayer players)
After `roc_void` (L84, Highlands) the next open-world mob is `idol_warden` (L92). The L85–L91 band exists **only inside the Slayer Tower** (`soul_flayer` 86, `void_herald` 90), which is RNG-gated by task assignment. A player not actively running Slayer hits a dead zone right where the grind is steepest.
**Fix:** Seed 1–2 mobs at **L86–L90** into Highlands or Slagpit (open-world, no Slayer gate) to bridge 84→92.

### [P2] Style parity breaks at the ceiling — only melee has L99 armor
Weapons exist at L99 for all three styles (godiron shortbow/longbow/staff/wand), but **armor** tops out unevenly: melee gets the full L99 **Godiron** 9-piece set, while ranged caps at **Shadowhide L95** and magic at **Godspark L88**. Ranged/magic players reach BiS armor well before 99 and have no L99 armor chase to mirror Godiron.
**Fix:** Add a L99 ranged hide set and a L99 magic vestment set (or add a tier above Shadowhide/Godspark at 99).

### [P2] No dedicated endgame quest line; quests are front/mid-loaded
Quests are objective-gated (kill/gather counts), not level-gated, and only **3 of 88** reference any endgame content (top is L62 frost_hound). The remainder are early/mid + repeatable dailies. Quests provide essentially **no L60–99 goal structure** — the endgame leans entirely on achievements + collection.
**Fix:** Add a short L70/85/99 quest arc tied to Idol Hall / Godiron / the Last Idol (kill `last_idol`, forge a Godiron piece, clear Idol Sanctum) for narrative pull through the grind.

### [P3] Slayer shop & point-sink stall before the top
Slayer Tower Floor 5 requires Slayer 80, but the Slayer Shop's last item unlocks at Slayer **60** (`void_anchor`, 500 pts) — nothing new to spend points on for Slayer 60–99, and only 5 shop items / 4 masters total.
**Fix:** Add 2–3 shop entries at Slayer 75/90 (XP/drop boosts, a unique pet or cosmetic, a gear unlock) so points stay meaningful into the endgame.

### [P3] No post-99 / post-max engagement loop
Once a skill hits the hard 99 cap, and once mobs fall ≥15 levels below the player (XP→0), there's no combat/skill reward left but loot. Remaining goals are pure achievements (total level 1000/1500, kill counts, collection). The 99-cap is an acknowledged design choice (memory: hard-cap intended), but "after max" engagement is thin for an idle game.
**Fix (later milestone):** a lightweight post-cap sink — mastery currency, drop-rate prestige, or relic track — to keep maxed accounts active.

---

## Verdict
Skilling and gear endgame: **excellent, ship-ready**. Combat endgame: **structurally thin at the top** — the two P1 monster-variety/spacing gaps are the highest-leverage fixes for L60–99 fun. Address those (and the P2 ranged/magic L99 armor parity) and the endgame is strong.
