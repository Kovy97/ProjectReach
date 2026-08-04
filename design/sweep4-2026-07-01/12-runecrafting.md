# Sweep 4 — 12 · Runecrafting (Runenkunst) — L1→99 Deep-Dive + Grade

**Tester:** Kontrolleur (QA)  ·  **Date:** 2026-07-01  ·  **Method:** headless `SimPlayer`/engine driver, temp vitest script (created, run, deleted).
Seed 1, per-action 20-min window normalized to /h with inputs supplied via the real `addItem`/`advance` path (fresh mastery). Pet reachability via real `tryPetDrop(skill:"runecrafting")` loop, seed 3.

## TL;DR — Grade: **B+**
A content-*rich* (92 actions), well-wired, bug-free skill: XP curve is strictly monotone with no dead bands, the unlock cadence is excellent (a new action almost every 2–5 levels), both skill-pets drop over the real path, mastery works, and the whole supply chain (essences → runes → magic weapons + affix-runes → Enchanting + glyphs/scrolls → buffs) is coherently consumed with **no dead outputs**. What holds it back from an A is a **reward-structure calibration problem**: the tier gear-crafts (foci/wands/staves) run at **2.5–3.6× the target XP/h** (RC's median ratio 3.37 is the *highest of any skill*), so they dominate every band and make RC's own deliberately-tuned affix-runes/glyphs/scrolls (all ~1.0× target) never the XP-optimal — and simultaneously a gold sink. Plus two vestigial "enchant" recipes are XP-traps and a couple of recipes unlock ~10–15 levels before their gated input is farmable.

---

## 1. XP/h curve L1→99 — monotone, no regressive tiers ✅
Best-available line (always craft the highest-XP/h unlocked action) is **strictly monotone non-decreasing L1→99 — 0 breaks**:

```
L 1 craft_copper_focus     2412   L40 craft_mithril_focus    11880   L80 craft_titanium_focus  129870
L 5 craft_bronze_staff     3150   L50 craft_adamantium_staff 19584   L90 craft_aetherium_focus 193140
L20 craft_steel_focus      6030   L60 craft_runite_focus     33792   L95 craft_godiron_staff   311805
L30 craft_blacksteel_focus 9240   L70 craft_bloodiron_focus  59040   L97 craft_godiron_wand    339690
```

- **Best per band = always the current-tier focus or wand.** Worst per band = the special "enchant_*" single-item recipes (see F2) and the affix-runes.
- **Time-to-99 ≈ 111 game-hours** (analytic upper bound on the best-available fresh-mastery rate; mastery speed + pool checkpoints shave it, and gathering the combat-sourced essences adds wall-clock on top).
- No stalled/zero-XP actions (all 92 produce output).

## 2. Freischalt-Takt — excellent ✅
`levelRequired` distribution: new RC action at **1,5,10,15,18,20,22,25,28,30,35,38,40,42,45,48,50,52,55,60,62,65,68,70,72,74,75,80,85,88,90,95,97,99.** Largest gap is 5 levels. The best-available XP/h steps up at 5/10/20/30/40/50/60/70/80/90/95 — a fresh, felt jump every ~tier. No leerlauf.

## 3. Werkzeug/Upgrade-Progression ✅ (material-tiered, no tool)
RC has no gathering-tool (correct for a pure crafting skill). Progression is the **essence/rune tier ladder** (dim→ember/frost→storm→aether→void) feeding 12-tier Staff/Wand/Focus lines + 3-tier affix runes (I/II/III). Staged cleanly and legible.

## 4. Drops + Skill-Pet — both pets confirmed droppable ✅ (notable: RC is the only non-combat skill with **two** pets)
- `glyphmaw` (content:13519, `bonusRunes 0.045` + `manaRestore`, dropChance **1/120000**) — real-path first drop @ **action #106,370**.
- `vellumoth` (content:13551, `skillXp 0.04` + `shield`, dropChance **1/90000**) — real-path first drop @ **action #567,061** (seed-3 tail; E[≈90k]).
- Both are `source:{kind:"skill",skill:"runecrafting"}`, both roll every completed RC action (tick.ts:193 → `tryPetDrop`), combined ≈ 1/51k/action. `pet-integrity.test.ts` allows >1 pet/skill → intentional, not a bug. `bonusRunes` on glyphmaw is thematically perfect. Confirms **ach_pets_all** reachability for both.

## 5. Gold/Ökonomie — very profitable, arguably too much
Net material-margin (sold at full `item.value`, upper bound; real vendor rate is a fraction):

| category | Ø XP/h | Ø gold/h |
|---|--:|--:|
| rune_foci (17) | 54,144 | **451,398** |
| rune_wands (12) | 67,551 | 209,403 |
| rune_staves (17) | 52,583 | 172,538 |
| rune_scrolls (3) | 22,547 | 27,688 |
| rune_runes (7) | 6,596 | 8,445 |
| rune_glyphs (7) | 5,163 | 5,734 |
| **rune_affixes (24)** | 11,604 | **−31,440** |

Gear-crafts are a strong money-maker even mid-game (steel_focus L20 ~108k g/h at full value; blacksteel_focus L30 ~160k). Essences are combat-gated, so it is not a free loop — falls under the accepted "endgame gold inflation," but the *mid-game* value-add is on the high side. **Affix-runes are a net gold sink** (reagents worth more than the rune) — expected for a utility reagent, but combined with their lower XP it means a leveller never crafts them for their own sake.

## 6. Mastery — present & rewarding ✅
Standard curve (double→cap, speed→14.7% cap @99, preserve→39% cap @99; skill-pool checkpoints 5/25/50/95%). Empirical: **8 h on one action → action-mastery ~L48 (77,504 xp), skill-pool 19.7%** (first checkpoint +3% double reached fast; +speed at 25% is a mid-term goal; full pool = avg mastery L20 across all 92 actions = a long-haul anchor). Preservation is genuinely valuable on the expensive void-tier crafts (saves 4× void_essence).

## 7. Zulieferung (magic weapons + Enchanting) — coherent ✅
- **Magic weapons:** staves/wands/foci are real `type:"equipment"` `weaponStyle:"magic"` items with `magic_off` reqs (e.g. runite_staff content:3229) — RC supplies the *entire* magic-weapon tree + the `stormcaller_rod`/`voidcaller_staff`/`godspark_staff`/`god_focus` specials.
- **Enchanting:** affix-runes (`rune.affixId`, content:640+) are consumed by `applyEnchant` (engine/enchant.ts:170-205); affix defs complete with `bonusByTier`/`weaponEffectByTier`/`appliesTo` (content:14108+).
- **Buffs:** glyphs/scrolls carry real `buff` blocks applied by `useConsumable` (engine/consumable.ts) and read by `computeStats` — not dead fields.
- **Elemental runes** all have consumers (force 9, frost 17, fire 8, shock 6, aether 26, void 37 input-refs). No dead runes.

## 8. aether_essence gate (briefing-requested) — Sweep-3 fix confirmed, one residue remains
- ✅ Confirmed: aether_essence is now sourced **on-level** from L45 combat (`ash_tyrant` L45, content:9781, 0.15) and L51 (`rootling_gimp2`, content:9815) — feeds the L45–52 recipes (enchant_aether_orb L45, craft_aether_rune L50, craft_rune_arcane_ii L52) correctly. The "früher" fix landed.
- ⚠️ **Residue (F3):** `craft_rune_arcane_i` unlocks at **RC L30** (content:8526) but needs `aether_essence` (earliest farm L45) — recipe is ~15 levels ahead of its input. Same pattern: `craft_copper_wand` (RC L1, content:8459) needs `frost_rune` → `frost_essence` (combat L10). Not walls (6 other Tier-I affix runes + all gear crafts are available those bands), but an unlock-before-supply papercut.

---

## Top-3 Findings
1. **[P2][balance/feel] Tier gear-crafts out-XP everything by 2.5–3.6× and dominate every band.** RC's foci/wands/staves run at x2.0–x3.6 of target (median **3.37** — the highest ratio of any skill; game norm ~1.3× gathering, ~2.3× smithing/fletching), while RC's *own* curve-tuned affix-runes (x0.93–1.07), glyphs (x0.93–1.03) and scrolls (x1.01) sit at ~1.0×. Result: the "interesting" reagent/enchant content is **never** the XP-optimal choice and is additionally a gold sink (rune_affixes Ø −31k g/h) → a min-maxer ignores the affix/glyph systems entirely. *Confirmed* (sim per-action table). Owner: content-dev / balance-designer.
2. **[P3][balance] Two vestigial "enchant" single-item recipes are XP-traps.** `enchant_aether_runestaff` L45 = **x0.45** (3,270 vs tgt 7,240; content:8397) and `enchant_frost_scepter` L25 = **x0.67** (1,800 vs 2,697; content:8383) are the lowest XP/h in their bands, superseded by the tier system. They're high-gold (~100k g/h) so they read as gold/gear plays, but as XP they're pure traps. *Confirmed.* Owner: content-dev.
3. **[P3][ux/supply] Recipes unlock ahead of their gated input.** `craft_rune_arcane_i` RC L30 needs aether_essence (farm L45); `craft_copper_wand` RC L1 needs frost_rune (frost_essence combat L10). Not blockers (alternatives every band) but a discoverability papercut for a pure/early runecrafter. *Confirmed.* Owner: content-dev.

## Top-3 Improvements (Soll-Werte; balance = Chef-approved)
1. **Close the XP gap between gear-crafts and reagents.** Preferred (keeps RC's magic-weapon identity as the main line): raise affix-rune / glyph / scroll xp by **~1.6–2×** so they become a viable alternate training line (e.g. `craft_rune_keen_ii` xp 16→28, `craft_glyph_of_ruin` xp 59→~100). Alternatively pull foci/wand/staff xp down toward the ~2.0–2.3× band (roughly ×0.65) to match smithing/fletching. Either removes the "reagents are strictly worse" trap.
2. **Fix the two XP-trap enchants:** bump `enchant_aether_runestaff` xp 10→~30 (→ ~x1.1) and `enchant_frost_scepter` xp 4→~9 (→ ~x1.0) so they're not the worst choice in-band — or explicitly retire them behind the tier staves.
3. **Align unlock levels with input availability:** raise `craft_rune_arcane_i` to RC L45 (matching aether_essence) or add a small pre-L45 aether_essence trickle; nudge `craft_copper_wand` to require force_rune-only (drop the frost_rune) so the L1 wand is craftable from L1 dim_essence.

## Confirmations (Sweep-3 items touched here — not re-reported)
- Balance-parität band, witherling, dim_essence loop, duskcap/gemstone: not in RC scope.
- **aether_essence "früher": confirmed landed** for the L45–52 band (residual L30 arcane-I noted above as a papercut, not a regression).
- Both RC pets droppable → **ach_pets_all** unaffected.

## Verdict
**fix-then-ship (non-blocking).** No bugs, no walls, monotone curve, dense cadence, coherent wiring, working pets+mastery. The one substantive item is a balance calibration pass so RC's affix/glyph/scroll content (and its gold economy) isn't strictly dominated by the tier gear-crafts. Ship EA as-is; schedule the XP/gold re-tune for a balance pass.
