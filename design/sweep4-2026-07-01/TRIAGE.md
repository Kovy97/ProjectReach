# Sweep 4 — Konsolidierte Triage (16 Agenten), 2026-07-01

Noten: Completionist **A**; Mastery/Foraging/Leatherworking **A-**; Cooking/Fletching/Mining/Runecrafting/Fishing **B+**;
Jewelcrafting/Smithing **B**; Thieving/Farming/Skiller/Woodcutting **B-**; Herblore **C+**.
Skills grundmechanisch stark (Kurven monoton, Pets verdrahtet, 0 Walls, 100 % completebar). Ein P1, Rest Politur.

## FIX-BATCH heute Abend

### content-dev (content/index.ts)
- **[P1] Herblore-Skilling-Tonika INVERTIERT** — `tonic_forager_i/ii/harvest/godharvest` `gatherXpMult` 0.05/0.08/0.10/0.12 → **1.05/1.08/1.10/1.12** (Multiplikator-Form; Engine multipliziert direkt → aktuell −95 % XP). Flaggschiff-Bug.
- **[P2] Skilling-Pet-Raten** zu niedrig: witherling 1/105k→~1/15k (Farming hat ~1500 Rolls/Grind → sonst 1,5 %); rotbark/sporewretch/gillrot/cragmaw & Co. ~1/100k→~1/60k (Ziel ~most bei 99).
- **[P3] duskcap-Ernte verwaist** → Abnehmer-Rezept (Herblore/Cooking) ergänzen.
- **[P3]** cake_honey value 18→34; copper_ore/tin_ore `value` setzen; Smelt-Regression bronze/iron xp 2→3; godiron_arrow fletch L95→99; thieving „bold" rewardMult 1.2→1.4; fishing lobster xp 34→42 + duskfin 28→32.
- **[P3, wenn Zeit]** Tool-Leitern verlängern (Spitzhacke adamant/titan/godiron; Sichel+Rute L80); Herblore „Yield-Tonikum" (nutzt das verdrahtete aber ungenutzte `gatherYieldMult`); brew_lesser_heal L12 re-tier (< L1); runecrafting Affix/Glyph-XP anheben.

### combat-dev (combat.ts)
- **[Chef] Defensiv-Style-EP OSRS** — „Defence-EP fürs Getroffen-werden" entfernen; Defensiv-Stance routet ausgeteilte Offense-XP → defence/magic_def (wie attack-Stance → attack). Guard-Tests anpassen.

### logic-dev (tick.ts + shared + consumable.ts)
- **[P2] Mastery-Preserve tot für Sammel-Skills** (3-fach bestätigt: Mining/Foraging/Fishing/Woodcutting haben keine `inputs`) → den 50 %-Pool-Checkpoint für input-lose Aktionen auf einen wirksamen Bonus (Doppel-Ertrag) mappen.
- Guard-Test `buffGatherXpMult`: gebufft ≥ Basis (damit der Herblore-P1 nie zurückkippt).

### ui-dev (renderer + preload + main)
- **[Chef] „Spiel verlassen"-Button** Sidebar unter Main Menu + Main-IPC (app.quit).
- **[Chef] Todes-Popup** „Oh no, you died against: {monster}" — auf `stats.deaths`-Increment + Kampf-Gegner (kein SAVE_VERSION nötig).
- **[Chef/Tan] Tan-Aktion vorne** — `SkillPage.tsx` Ordering (Vorlage `smithingOrderKey`) auf Leatherworking erweitern (tan_/cure_ = 0).
- **[P3] Mastery-UI:** Pool-Text „10 %"→„5 %"; Aktionskarten-Badge zeigt Pool-Checkpoint-Anteil.

## CHEF-ENTSCHEIDUNGEN (nicht autonom — flaggen)
- Woodcutting-Tools sind combat-gegated (Kampf-Äxte), Mining/Fishing skill-gegated → mit „Combat-fundamental" ist WC on-brand; Konsistenz-Entscheidung deinerseits.
- Kampf-Skills bekommen 0 Mastery (Melvor-konform).
- Herblore Combat-Tonika ~2 % Idle-Uptime (Auto-Nachtrinken-Toggle vs längere Dauer).
- ach_quests_100 = 75 kalender-gegated (nur 38 Story-Quests, Rest aus Daily-Pool über Tage).
- scaled_leather ohne Tan-Rezept (nur Kampf-Drop) — per „Combat-fundamental" evtl. intended.
- runecrafting Gear-Crafts 2–3,6× Ziel-XP vs Reagenzien 1× (Reagenz-Content nie XP-optimal).
