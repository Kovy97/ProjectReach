# Zonen-Drop-Plan — „Grim Reach" (Stand 2026-06-29, Rev. 3 — DROPRATEN auf 12-h-Volumen kalibriert)

**Autor:** Balance-Designer · **Status:** PLAN (nicht implementiert) · **Owner-Apply:** content-dev via `packages/content/src/index.ts`

Ziel: pro Kampfgebiet **≥15 ausrüstbare Items** über die volle Rarity-Spanne (generisch common/rare →
superRare/epic → 1–2 Highlights epic/legendary/godly). Alle Slots & Stile. Werte je eine Rarity-Stufe
über craftbarem Tier-Gear (craftbar endet **epic**).

> **Rev. 3:** ALLE Gear-Dropraten über das **12-Stunden-Offline-Volumen** neu gerechnet (§0.1). Items,
> Rarities, Effekte, Slots, Werte unverändert — **nur die Dropchancen**. Dungeon-Key-Raten (§12) bleiben
> wie vom Chef gesetzt (NICHT umgerechnet). Rev.-1-Items weiterhin **[R1]**.

---

## 0. Konventionen, Kürzel & Baselines

**Rarity-Skala:** poor < common < magic < rare(grün) < superRare(blau) < epic(lila) < legendary(orange) < godly(gold). Craftbar endet bei **epic**; Drops dürfen darüber.

**Craftbare Rarity je Tier:** copper/bronze (Req 1–5) = common · iron/steel/blacksteel (10–30) = rare · mithril/adamantium/runite/bloodiron (40–70) = superRare · titanium/aetherium/godiron (80–99) = epic.

**Item-Regeln:** Generische (common/rare) = schlichte Stat-Sticks, kein Unique. Mid (superRare/epic) = +15–35 % Primärstat, kleiner Unique. Highlights (epic/legendary/godly) = 1–2/Zone, vom Boss, signifikanter Unique, extrem selten. `value` ≈ 2,5–3,5× vergleichbares craftbares Item. Equipment-Drops mit `suffixChance: 0.30`.

**Bonus-Kürzel:** `def`=defense · `hp`=maxHp · `eva`=evasion · `acc`=accuracy · `mD`=meleeDamage · `rD`=rangedDamage · `magD`=magicDamage · `cC`=critChance · `cD`=critDamage · `aI`=attackIntervalMs (− schneller) · `mana`=maxMana · `mReg`=manaRegen · `hpR`=hpRegenPerSec. **Modifiers:** str/dex/con/int/wis/lck. **weaponEffect:** `burn 0.30/9/5s` = `{type:"burn",chance:0.30,magnitude:9,durationMs:5000}` (frost magnitude=1 → Gegner-Slow; shock magnitude=Aussetz-Chance 0..1).

**Mechanik-Audit:** Ohne neue Mechanik nutzbar → weaponEffect burn/poison/bleed (DoT), frost (Slow), shock (Aussetzer), crit, Tempo (aI−), Mana, **hpRegenPerSec** (Lifesteal-Annäherung), Attribut-Modifiers. NEUE MECHANIK (vermieden): echter %-Lifesteal, „+X% vs Typ", „+Drop/Gold/Rarity". Kein geplanter Effekt braucht eine neue Mechanik.

### 0.1 Dropraten-Modell — 12-Stunden-Offline-Volumen (NEU in Rev. 3)

Idle-Spiel: ein Spieler grindet einen Mob bis zu **12 h = 43.200 s** am Stück. Die Dropchance muss am
**erwarteten Loot-Volumen pro Session** kalibriert sein, nicht „pro Kill gefühlt".

1. **killsPro12h = 43.200 / avgKillSek.** `avgKillSek` = grobe Kill-Zeit des Mobs (HP vs. erwarteter
   Spieler-DPS auf Zonenlevel, aus der auditierten Gear-Progression). Richtwerte:
   Starter ~2–3 s · low ~3–4 s · mid ~5–8 s · high ~8–14 s · Endgame ~14–20 s · große Bosse ~25–45 s.
   (Die je Zone angesetzten `avgKillSek` stehen in jeder Zonen-Überschrift unter „killSek-Annahmen".)
2. **chance = Ziel-Stückzahl pro 12 h / killsPro12h.**
3. **Ziel-Stückzahlen pro 12 h** (erwartete Drops beim Dauergrinden GENAU dieses Mobs) — verwendete Werte:

| Rarity | Ziel-Stück/12h | resultierende chance-Range |
|---|---|---|
| common (Stat-Stick) | **40** | 0,19 % – 0,46 % |
| rare | **10** | 0,069 % – 0,28 % |
| superRare | **4** | 0,037 % – 0,13 % |
| epic | **1,4** (≈ 1/Session) | 0,032 % – 0,071 % |
| legendary | **0,2** (1 pro ~5–8 Sessions) | 0,0074 % – 0,016 % (≈ 1/6.000–13.500 Kills) |
| godly | **0,03** (1 pro ~33 Sessions) | 0,0031 % (≈ 1/32.000 Kills) |

> **Worked Example:** Trash-Mob 3 s → 14.400 Kills/12 h → common-Ziel 40 ⇒ chance 40/14.400 = **0,28 %**
> (= 0,0028). Zäher Mob 14 s → 3.086 Kills/12 h → epic-Ziel 1,4 ⇒ chance 1,4/3.086 = **0,045 %**.
> Endgame-Boss 45 s → 960 Kills/12 h → godly-Ziel 0,03 ⇒ chance 0,03/960 = **0,0031 %** (≈ 1/32.000).
>
> **Darstellung:** Zonen-Tabellen zeigen die chance als **Prozent** (Drop%); die Apply-Liste §13 gibt
> denselben Wert als **0..1-Fraktion** für das `chance`-Feld (z. B. 0,28 % = `0.0028`).

**Craftbare Rüstungs-Baselines (Kalibrierung, def/hp bzw. def/eva/hp):**
| Slot | L10 | L20 | L40 | L60 | L99 |
|---|---|---|---|---|---|
| Helm (Platte) | 4/13 | 6/18 | 11/31 | 17/47 | 35/101 |
| Body (Platte) | ~16/40 | 24/60 | 42/105 | 64/160 | 136/340 |
| Legs (Platte) | 11/24 | 15/34 | 26/60 | 40/91 | 84/193 |
| Gloves/Boots (Platte) | 3/5 | 4/7 | 7/12 | 10/18 | 22/38 |
| Shield (kite) def/hp/eva | 8/16/4 | 12/22/4 | 21/39/5 | 32/59/6 | 68/125/9 |
| Leder (eva-stark) | – | – | scaled 12/15/30 (L28) | studded 18/18/42 (L50) | – |
| Robe (Body, magisch) | – | – | arcane 22/20/60 +13magD (L55) | – | godspark 34/28/92 +23magD (L85) |

---

## 1. The Pastures / Die Weiden — L1–10 (Anfangsgebiet, Bauernhof)
Mobs: chicken L1 · cow L3 · boar L6 · **bull_boss L10**. Bestehend (in-game): `boar_tusk_mace` (L4 common mace).
**killSek-Annahmen:** chicken 2 s (21.600/12h) · cow 2,5 s (17.280) · boar 3 s (14.400) · bull_boss 8 s (5.400).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · modifiers · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Pitchfork Spear / Mistgabel|`pitchfork_spear`|mainhand melee `spear` · common|`{mD:14,acc:10}` · req attack 3 · v60|cow 0.23%|–|
|2|Sickle Shiv / Sichel-Schiv|`sickle_shiv`|mainhand melee `dagger` · common|`{mD:12,acc:12,aI:-200}` · req attack 2 · v55|cow 0.23%|–|
|3|Farmhand Sling / Knechts-Schleuder|`farmhand_sling`|mainhand ranged `shortbow` · common|`{rD:5,acc:10,cC:0.05}` ammo iron_arrow · req ranged 3, fletching 2 · v45|chicken 0.19%|–|
|4|Hedge-Witch Twig / Heckenhexen-Zweig|`hedgewitch_twig`|mainhand magic `wand` · common|`{magD:4,acc:8,aI:-300}` manaCost 6 · req magic_off 3 · v50|boar 0.28%|–|
|5|Wattle Shield / Flecht-Schild|`wattle_shield`|offhand `shield` · common|`{def:5,hp:10,eva:2}` · req defence 2 · v35|cow 0.23%|–|
|6|Cowhide Cap / Rinderleder-Kappe|`cowhide_cap`|helmet · common|`{def:2,eva:4,hp:8}` · req leatherworking 1 · v40|chicken 0.19%|–|
|7|Cowhide Jerkin / Rinderleder-Wams|`cowhide_jerkin`|body · rare|`{def:10,eva:6,hp:26}` · req defence 4 · v140|boar 0.069%|–|
|8|Hide Leggings / Fell-Beinlinge|`hide_leggings`|legs · common|`{def:5,eva:6,hp:14}` · req leatherworking 2 · v60|boar 0.28%|–|
|9|Worn Workgloves / Abgenutzte Arbeitshandschuhe|`worn_workgloves`|gloves · common|`{def:2,hp:4}` · req defence 1 · v25|chicken 0.19%|–|
|10|Muckboots / Miststiefel|`muckboots`|boots · common|`{def:2,eva:3,hp:6}` · req defence 1 · v25|cow 0.23%|–|
|11|Tattered Field Cape / Zerschlissener Feldumhang|`field_cape`|cape · common|`{def:3,eva:4,hp:8}` · v50|boar 0.28%|–|
|12|Boar-Tusk Ring / Eberhauer-Ring|`boartusk_ring`|ring · rare|`{mD:4,hp:10}` · v120|bull_boss 0.19%|–|
|13|**[R1]** Gorehorn Cleaver / Hornschlächter|`gorehorn_cleaver`|mainhand melee `sword` · rare|`{mD:34,acc:18,hp:12}` · `bleed 0.25/5/5s` · req attack 8 · v220|bull_boss 0.19%|Blutung|
|14|**[R1]** Drover's Charm / Hirten-Talisman|`drovers_charm`|amulet · rare|`{hp:14,def:3,hpR:0.3}` con+1 · v120|boar 0.069%|Regen|
|15|**Bull's Heart Pendant / Stierherz-Anhänger**|`bulls_heart_pendant`|amulet · **superRare**|`{hp:40,def:8,mD:5,hpR:0.6}` con+2 · v320|bull_boss 0.074%|Früh-Sustain|

---

## 2. The Borderlands / Die Grenzlande — L1–14 (Goblin-Warband)
Mobs: goblin L1 … goblin_butcher L10 · goblin_stormcaller L12 · **goblin_warlock L14**.
**killSek-Annahmen:** goblin 2 s (21.600) · rogue/spearman/archer 3 s (14.400) · crossbower 3,5 s (12.343) · butcher/felmagician/stormcaller 4 s (10.800) · warlock 8 s (5.400).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · modifiers · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Goblin Shank / Goblin-Stecher|`goblin_shank`|mainhand melee `dagger` · common|`{mD:11,acc:12,aI:-250,cC:0.04}` · req attack 2 · v50|goblin 0.19%|–|
|2|Crude Waraxe / Grobe Streitaxt|`crude_waraxe`|mainhand melee `axe` · common|`{mD:18,acc:8,cD:0.10}` · req attack 5 · v70|goblin_spearman 0.28%|–|
|3|Stolen Shortbow / Gestohlener Kurzbogen|`stolen_shortbow`|mainhand ranged `shortbow` · common|`{rD:7,acc:14,cC:0.06}` ammo iron_arrow · req ranged 7, fletching 5 · v90|goblin_archer 0.28%|–|
|4|Goblin Buckler / Goblin-Buckler|`goblin_buckler`|offhand `shield` · common|`{def:6,hp:12,eva:3}` · req defence 4 · v40|goblin_spearman 0.28%|–|
|5|Bonepatch Helm / Knochenflicken-Helm|`bonepatch_helm`|helmet · common|`{def:4,hp:10,eva:2}` · req defence 3 · v45|goblin 0.19%|–|
|6|Warband Hauberk / Kriegsbanden-Panzer|`warband_hauberk`|body · rare|`{def:14,hp:32,eva:4}` · req defence 9 · v180|goblin_crossbower 0.081%|–|
|7|Goblin Warkilt / Goblin-Kriegskilt|`goblin_warkilt`|legs · rare|`{def:11,hp:24,eva:5}` · req defence 8 · v130|goblin_butcher 0.093%|–|
|8|Rivetfist Gloves / Niethand-Handschuhe|`rivetfist_gloves`|gloves · common|`{def:3,hp:6,mD:1}` · req defence 5 · v45|goblin_spearman 0.28%|–|
|9|Scavenger Boots / Aasfresser-Stiefel|`scavenger_boots`|boots · common|`{def:3,eva:5,hp:8}` · req defence 3 · v45|goblin_rogue 0.28%|–|
|10|Tattered Warbanner Cape / Zerfetzter Kriegsbanner-Umhang|`warbanner_cape`|cape · rare|`{def:6,eva:6,hp:18}` · v200|goblin_warlock 0.19%|–|
|11|Cutpurse Ring / Beutelschneider-Ring|`cutpurse_ring`|ring · common|`{eva:6,acc:6}` · v90|goblin_rogue 0.28%|–|
|12|**[R1]** Goblin Cleaver / Goblin-Schlachtbeil|`goblin_cleaver`|mainhand melee `sword` · rare|`{mD:24,acc:14,cC:0.05,aI:-200}` · `bleed 0.20/4/4s` · req attack 9 · v180|goblin_butcher 0.093%|Tempo+Blutung|
|13|**[R1]** Stormcaller Totem / Sturmrufer-Totem|`stormcaller_totem`|offhand `focus` (magic) · rare|`{magD:5,acc:8,mana:12,mReg:0.4}` wis+1 · req magic_off 10 · v220|goblin_stormcaller 0.093%|Mana-Sustain|
|14|**[R1]** Warlock's Felstaff / Felstab des Hexenmeisters|`warlock_felstaff`|mainhand magic `staff` · rare|`{magD:16,acc:24}` · `burn 0.30/6/5s` · manaCost 8 · req magic_off 12, runecrafting 8 · v300|goblin_warlock 0.19%|Fel-Burn|
|15|**Felmagician's Eye / Auge des Felmagiers**|`felmagician_eye`|amulet · **superRare**|`{magD:8,acc:12,mana:15,mReg:0.5}` int+2 · v360|goblin_felmagician 0.037%|Caster-Sustain|

---

## 3. The Ashfields / Die Aschfelder — L2–20
Mobs: ash_rat L2 · dust_vulture L5 · mire_crawler L8 · pitch_beetle L14 · **ash_tyrant L20**. Bestehend (in-game): `ashen_reaper`, `mire_fang_dagger`, `chitin_bulwark`.
**killSek-Annahmen:** ash_rat 2,5 s (17.280) · dust_vulture 3 s (14.400) · mire_crawler 3,5 s (12.343) · pitch_beetle 4,5 s (9.600) · ash_tyrant 10 s (4.320).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Dustblade / Staubklinge|`dustblade`|mainhand melee `sword` · common|`{mD:20,acc:12}` · req attack 6 · v70|ash_rat 0.23%|–|
|2|Cinder Spike / Glut-Spieß|`cinder_spike`|mainhand melee `spear` · rare|`{mD:30,acc:18}` · `burn 0.20/4/4s` · req attack 14 · v260|pitch_beetle 0.10%|Burn|
|3|Ashwood Longbow / Aschholz-Langbogen|`ashwood_longbow`|mainhand ranged `longbow` 2H · rare|`{rD:12,acc:30,cD:0.13}` ammo steel_arrow · req ranged 14, fletching 12 · v280|dust_vulture 0.069%|–|
|4|Mire Hexstaff / Morast-Hexenstab|`mire_hexstaff`|mainhand magic `staff` 2H · rare|`{magD:14,acc:24}` · `poison 0.30/5/5s` · manaCost 8 · req magic_off 14, runecrafting 10 · v320|mire_crawler 0.081%|Gift|
|5|Chitin Helm / Chitin-Helm|`chitin_helm`|helmet · rare|`{def:9,hp:20,eva:3}` · req defence 12 · v150|pitch_beetle 0.10%|–|
|6|Ashplate Cuirass / Aschplatten-Kürass|`ashplate_cuirass`|body · rare|`{def:24,hp:56,mD:2}` · req defence 18 · v380|ash_tyrant 0.23%|–|
|7|Sootscale Greaves / Rußschuppen-Beinschienen|`sootscale_greaves`|legs · rare|`{def:15,hp:32,eva:4}` · req defence 16 · v230|pitch_beetle 0.10%|–|
|8|Ashen Gauntlets / Aschene Stulpen|`ashen_gauntlets`|gloves · common|`{def:4,hp:7,mD:1}` · req defence 10 · v80|ash_rat 0.23%|–|
|9|Dustwalker Boots / Staubgänger-Stiefel|`dustwalker_boots`|boots · common|`{def:4,eva:6,hp:8}` · req defence 8 · v80|dust_vulture 0.28%|–|
|10|Smokeweave Cape / Rauchgewebe-Umhang|`smokeweave_cape`|cape · rare|`{def:6,eva:10,magD:4}` · v220|mire_crawler 0.081%|–|
|11|Cinderloop Ring / Glutschlaufe-Ring|`cinderloop_ring`|ring · rare|`{mD:4,cC:0.04,hp:12}` · v220|ash_tyrant 0.23%|–|
|12|**[R1]** Ashfall Recurve / Aschfall-Recurvebogen|`ashfall_recurve`|mainhand ranged `shortbow` · superRare|`{rD:13,acc:32,cC:0.08,aI:-150}` · `burn 0.25/5/4s` · ammo steel_arrow · req ranged 18, fletching 14 · v420|ash_tyrant 0.093%|Crit+Brand-Pfeile|
|13|**Ash Tyrant's Crown / Krone des Aschtyrann**|`ash_tyrant_crown`|helmet · **epic**|`{def:16,hp:50,mD:6,cC:0.05,cD:0.15}` str+2 · req defence 20 · v900|ash_tyrant 0.032%|Crit-Boss-Helm|

(+ in-game ashen_reaper, mire_fang_dagger, chitin_bulwark = 16 total.)

---

## 4. The Blackthorn Wood / Der Schwarzdornwald — L8–40
Mobs: rootling_grunt L8 … thorn_wolf L20 · moss_golem L24 · spectral_stag L28 · rootling_treemonster L32 · bramble_witch L32 · **forest_warden L40**. Bestehend (in-game): `thornfang_blade`, `moss_plate_body`, `spectral_coif`, `bramble_witchstaff`, `warden_brigandine`.
**killSek-Annahmen:** rootling_grunt 3,5 s (12.343) · thorn_wolf 5 s (8.640) · moss_golem/spectral_stag 6 s (7.200) · rootling_treemonster/bramble_witch 7 s (6.171) · forest_warden 12 s (3.600).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · modifiers · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Rootling Club / Wurzelkeule|`rootling_club`|mainhand melee `mace` · common|`{mD:22,acc:10,hp:8}` · req attack 8 · v90|rootling_grunt 0.32%|–|
|2|Thornvine Whip / Dornenranken-Peitsche|`thornvine_whip`|mainhand melee `sword` · rare|`{mD:36,acc:24,aI:-100}` · `bleed 0.25/6/4.5s` · req attack 20 · v420|thorn_wolf 0.12%|Tempo+Blutung|
|3|Spectral Hunter's Bow / Geisterjäger-Bogen|`spectral_hunter_bow`|mainhand ranged `longbow` 2H · superRare|`{rD:20,acc:56,cD:0.16,eva:6}` ammo mithril_arrow · req ranged 28, fletching 28 · v640|spectral_stag 0.056%|Evasion+Crit|
|4|Witchroot Wand / Hexenwurz-Stab|`witchroot_wand`|mainhand magic `wand` · rare|`{magD:18,acc:36,aI:-300}` · `frost 0.30/1/3.5s` · manaCost 8 · req magic_off 26, runecrafting 22 · v480|bramble_witch 0.16%|Frost-Slow|
|5|Bark Bulwark / Borken-Bollwerk|`bark_bulwark`|offhand `shield` · rare|`{def:18,hp:40,eva:5}` · req defence 24 · v420|moss_golem 0.14%|–|
|6|Mossweave Leggings / Moosgewebe-Beinlinge|`mossweave_leggings`|legs · rare|`{def:16,eva:12,hp:38}` · req defence 24 · v360|moss_golem 0.14%|–|
|7|Thornmail Gauntlets / Dornenpanzer-Stulpen|`thornmail_gauntlets`|gloves · rare|`{def:8,eva:8,hp:18,mD:2}` · req defence 28 · v280|rootling_treemonster 0.16%|–|
|8|Wildwood Treads / Wildwald-Schuhe|`wildwood_treads`|boots · rare|`{def:7,eva:12,hp:16,rD:2}` · req defence 26 · v300|spectral_stag 0.14%|–|
|9|Soulopal Band / Seelenopal-Reif|`soulopal_band`|ring · rare|`{magD:4,mD:4,rD:4,cC:0.03}` · v300|forest_warden 0.28%|–|
|10|**[R1]** Soulthorn Pendant / Seelendorn-Anhänger|`soulthorn_pendant`|amulet · superRare|`{mD:5,rD:5,magD:5,eva:8,hpR:0.5}` lck+1 · v800|forest_warden 0.11%|Hybrid+Regen|
|11|**Warden's Greatcloak / Großumhang des Vogts**|`warden_greatcloak`|cape · **epic**|`{def:12,eva:18,rD:6,magD:6,hpR:0.7}` · v1600|forest_warden 0.039%|Hybrid+Regen|

(+ in-game thornfang_blade, moss_plate_body, spectral_coif, bramble_witchstaff, warden_brigandine = 16 total.)

---

## 5. The Crypt / Die Krypta — L16–45
Mobs: skeleton_warrior L16 · skeleton_archer L18 · skeleton_spearman L20 · skeleton_butcher L24 · skeleton_icemage L30 · skeleton_pyroclasp L36 · **skeleton_nekro L45**.
**killSek-Annahmen:** warrior/archer/spearman 5 s (8.640) · butcher 6 s (7.200) · icemage 7 s (6.171) · pyroclasp 8 s (5.400) · nekro 14 s (3.086).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Boneblade / Knochenklinge|`boneblade`|mainhand melee `sword` · common|`{mD:30,acc:18}` · req attack 16 · v160|skeleton_warrior 0.46%|–|
|2|Bonewrought Spear / Knochengeschmiedeter Speer|`bonewrought_spear`|mainhand melee `spear` · rare|`{mD:40,acc:24}` · req attack 20 · v260|skeleton_spearman 0.12%|–|
|3|Skeletal Longbow / Skelett-Langbogen|`skeletal_longbow`|mainhand ranged `longbow` 2H · rare|`{rD:15,acc:40,cD:0.14}` ammo steel_arrow · req ranged 18, fletching 18 · v300|skeleton_archer 0.12%|–|
|4|Pyre Staff / Scheiterhaufen-Stab|`pyre_staff`|mainhand magic `staff` 2H · superRare|`{magD:28,acc:42}` · `burn 0.35/9/5s` · manaCost 9 · req magic_off 36, runecrafting 32 · v750|skeleton_pyroclasp 0.074%|Starker Burn|
|5|Cryptguard Helm / Kryptawächter-Helm|`cryptguard_helm`|helmet · rare|`{def:10,hp:26,eva:2}` · req defence 16 · v170|skeleton_warrior 0.12%|–|
|6|Gravesteel Cuirass / Grabstahl-Kürass|`gravesteel_cuirass`|body · superRare|`{def:32,hp:78,mD:3}` · req defence 30 · v700|skeleton_pyroclasp 0.074%|–|
|7|Tombplate Greaves / Grabplatten-Beinschienen|`tombplate_greaves`|legs · rare|`{def:20,hp:44,eva:3}` · req defence 24 · v360|skeleton_butcher 0.14%|–|
|8|Boneknuckle Gauntlets / Knochenknöchel-Stulpen|`boneknuckle_gauntlets`|gloves · rare|`{def:6,hp:14,mD:2}` · req defence 20 · v200|skeleton_warrior 0.12%|–|
|9|Gravetread Sabatons / Grabschreiter-Schuhe|`gravetread_sabatons`|boots · rare|`{def:6,hp:14,eva:4}` · req defence 22 · v220|skeleton_spearman 0.12%|–|
|10|Shroud of the Dead / Leichentuch|`shroud_of_the_dead`|cape · superRare|`{def:8,eva:12,magD:6,mana:20}` · req magic_off 30 · v600|skeleton_icemage 0.065%|–|
|11|Bonecharm Amulet / Knochentalisman|`bonecharm_amulet`|amulet · rare|`{mD:5,hp:20,hpR:0.3}` · v300|skeleton_butcher 0.14%|Regen|
|12|**[R1]** Gravewarden Greatshield / Grabwächter-Großschild|`gravewarden_greatshield`|offhand `shield` · superRare|`{def:24,hp:55,eva:4,hpR:0.4}` · req defence 20 · v600|skeleton_spearman 0.046%|Sustain|
|13|**[R1]** Frostbone Scepter / Frostknochen-Zepter|`frostbone_scepter`|mainhand magic `scepter` · superRare|`{magD:24,acc:36,cC:0.03}` · `frost 0.35/1/3.5s` · manaCost 9 · req magic_off 28, runecrafting 24 · v700|skeleton_icemage 0.065%|Frost-Slow|
|14|Necrosignet Ring / Nekrosiegel-Ring|`necrosignet_ring`|ring · superRare|`{magD:6,mD:6,cC:0.04,hp:30}` · v900|skeleton_nekro 0.13%|Hybrid|
|15|**[R1] Necromancer's Reaperblade / Sensenklinge des Nekromanten**|`nekro_reaperblade`|mainhand melee `greatsword` 2H · **epic**|`{mD:74,acc:48,cC:0.05,aI:300,hpR:0.6}` · `poison 0.30/9/5s` · req attack 40 · v1400|skeleton_nekro 0.045%|Nekrose-Gift+Regen|

---

## 6. Tidewater Shoals / Gezeitenuntiefen (Coast) — L8–96 (sehr breit)
Mobs: mud_crab L8 · reef_drowned L20 · tide_siren L38 · **deep_kraken L60** · abyssal_tide_serpent L96.
**killSek-Annahmen:** mud_crab 3,5 s (12.343) · reef_drowned 5 s (8.640) · tide_siren 9 s (4.800) · abyssal_tide_serpent 16 s (2.700) · deep_kraken 22 s (1.964, Boss).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Coral Shiv / Korallen-Schiv|`coral_shiv`|mainhand melee `dagger` · common|`{mD:12,acc:14,aI:-250}` · req attack 8 · v60|mud_crab 0.32%|–|
|2|Driftwood Bow / Treibholz-Bogen|`driftwood_bow`|mainhand ranged `shortbow` · common|`{rD:8,acc:16,cC:0.06}` ammo iron_arrow · req ranged 10, fletching 8 · v100|mud_crab 0.32%|–|
|3|Drowned Sailor's Cutlass / Entermesser des Ertrunkenen|`drowned_cutlass`|mainhand melee `sword` · rare|`{mD:38,acc:30}` · `bleed 0.20/6/4.5s` · req attack 20 · v420|reef_drowned 0.12%|Blutung|
|4|Tidecaller Focus / Gezeitenruf-Fokus|`tidecaller_focus`|offhand `focus` (magic) · rare|`{magD:8,acc:14,mana:18,mReg:0.5}` · req magic_off 20 · v340|reef_drowned 0.12%|Mana-Sustain|
|5|Reefscale Helm / Riffschuppen-Helm|`reefscale_helm`|helmet · rare|`{def:12,eva:10,hp:28}` · req defence 20 · v260|reef_drowned 0.12%|–|
|6|Tidewoven Leggings / Gezeitengewebe-Beinlinge|`tidewoven_leggings`|legs · superRare|`{def:30,eva:16,hp:70,magD:4}` · req defence 50 · v900|tide_siren 0.083%|–|
|7|Barnacle Gauntlets / Seepocken-Stulpen|`barnacle_gauntlets`|gloves · rare|`{def:8,hp:16,eva:6}` · req defence 24 · v220|reef_drowned 0.12%|–|
|8|Tidewalker Boots / Gezeitengänger-Stiefel|`tidewalker_boots`|boots · superRare|`{def:14,eva:18,hp:36,rD:4}` · req defence 50 · v780|tide_siren 0.083%|–|
|9|Mariner's Cloak / Seefahrer-Umhang|`mariner_cloak`|cape · rare|`{def:8,eva:12,rD:4}` · req ranged 30 · v360|tide_siren 0.21%|–|
|10|Krakenhide Cuirass / Krakenhaut-Kürass|`krakenhide_cuirass`|body · epic|`{def:60,hp:150,eva:8}` · req defence 60, leatherworking 55 · v2400|deep_kraken 0.071%|–|
|11|Abyssal Signet / Abyssaler Siegelring|`abyssal_signet`|ring · epic|`{magD:10,rD:8,cC:0.05,hp:50}` · v3500|abyssal_tide_serpent 0.052%|–|
|12|**[R1]** Crabshell Bulwark / Krabbenpanzer-Schild|`crabshell_bulwark`|offhand `shield` · rare|`{def:12,hp:24,eva:4}` · req defence 8 · v180|mud_crab 0.081%|–|
|13|**[R1]** Siren's Shockstaff / Sirenen-Schockstab|`siren_shockstaff`|mainhand magic `staff` 2H · superRare|`{magD:30,acc:48,mana:15}` · `shock 0.25/0.25/4s` · manaCost 10 · req magic_off 36, runecrafting 30 · v850|tide_siren 0.083%|Schock|
|14|**[R1]** Abyssal Tide Bow / Abyssaler Gezeitenbogen|`abyssal_tide_bow`|mainhand ranged `longbow` 2H · epic|`{rD:64,acc:175,cC:0.06,cD:0.22}` · `frost 0.30/1/4s` · ammo godiron_arrow · req ranged 90 · v5500|abyssal_tide_serpent 0.052%|Frost-Slow|
|15|**[R1] Kraken's Maw / Schlund des Kraken**|`kraken_maw`|mainhand melee `greatsword` 2H · **epic**|`{mD:105,acc:96,cC:0.05,aI:100}` · `bleed 0.30/14/6s` · req attack 60 · v2400|deep_kraken 0.071%|Blutung|
|16|**Pearl of the Deep / Perle der Tiefe**|`pearl_of_the_deep`|amulet · **epic**|`{hp:120,def:24,magD:12,mana:30,mReg:1.0,hpR:1.0}` · v4000|deep_kraken 0.071%|Caster/Sustain-Hybrid|

---

## 7. Wildwood Hunting Grounds / Wildwald-Jagdgründe — L12–45
Mobs: forest_hare L12 · gray_wolf L18 · wild_stag L26 · dire_wolf L34 · **forest_bear L45**.
**killSek-Annahmen:** forest_hare 4 s (10.800) · gray_wolf 5 s (8.640) · wild_stag 6 s (7.200) · dire_wolf 8 s (5.400) · forest_bear 14 s (3.086).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · modifiers · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Hunting Knife / Jagdmesser|`hunting_knife`|mainhand melee `dagger` · common|`{mD:16,acc:14,aI:-200,cC:0.05}` · req attack 12 · v90|forest_hare 0.37%|–|
|2|Wolf-Fang Spear / Wolfszahn-Speer|`wolffang_spear`|mainhand melee `spear` · rare|`{mD:34,acc:22}` · `bleed 0.25/6/4.5s` · req attack 18 · v360|gray_wolf 0.12%|Blutung|
|3|Antler Warbow / Geweih-Kriegsbogen|`antler_warbow`|mainhand ranged `longbow` 2H · rare|`{rD:14,acc:36,cD:0.14}` ammo steel_arrow · req ranged 18, fletching 16 · v300|wild_stag 0.14%|–|
|4|Beastcaller Totem / Bestienruf-Totem|`beastcaller_totem`|offhand `focus` (magic) · rare|`{magD:6,acc:12,mana:16,mReg:0.4}` · req magic_off 20 · v300|gray_wolf 0.12%|Mana-Sustain|
|5|Wolfpelt Hood / Wolfsfell-Kapuze|`wolfpelt_hood`|helmet · rare|`{def:8,eva:12,hp:22,rD:2}` · req defence 18 · v240|gray_wolf 0.12%|–|
|6|Stagleather Chaps / Hirschleder-Beinlinge|`stagleather_chaps`|legs · rare|`{def:14,eva:14,hp:36,rD:2}` · req defence 26 · v340|wild_stag 0.14%|–|
|7|Clawguard Gloves / Klauenwächter-Handschuhe|`clawguard_gloves`|gloves · rare|`{def:6,eva:8,hp:16,mD:2}` · req defence 24 · v240|dire_wolf 0.19%|–|
|8|Padfoot Boots / Pfotenschritt-Stiefel|`padfoot_boots`|boots · rare|`{def:6,eva:14,hp:16}` · req defence 22 · v260|forest_hare 0.093%|–|
|9|Pelt Mantle / Fell-Mantel|`pelt_mantle`|cape · rare|`{def:8,eva:12,hp:20}` · v280|wild_stag 0.14%|–|
|10|Fang Pendant / Reißzahn-Anhänger|`fang_pendant`|amulet · rare|`{mD:5,cC:0.04,hp:16}` · v300|dire_wolf 0.19%|–|
|11|Direhide Jerkin / Schreckenfell-Wams|`direhide_jerkin`|body · superRare|`{def:30,eva:14,hp:78}` · req defence 34, leatherworking 30 · v780|dire_wolf 0.074%|–|
|12|**[R1]** Stagstride Longbow / Hirschlauf-Langbogen|`stagstride_longbow`|mainhand ranged `longbow` 2H · superRare|`{rD:18,acc:46,cD:0.16,aI:-100}` ammo mithril_arrow · req ranged 24, fletching 20 · v600|wild_stag 0.056%|Tempo+Crit|
|13|**[R1]** Direfang Maul / Schreckenzahn-Keule|`direfang_maul`|mainhand melee `mace` 2H · superRare|`{mD:60,acc:40,cC:0.05}` · `bleed 0.35/10/5s` · req attack 34 · v1000|dire_wolf 0.074%|Starke Blutung|
|14|**[R1] Bearhide Cuirass / Bärenfell-Kürass**|`bearhide_cuirass`|body · **epic**|`{def:50,hp:130,eva:8,hpR:0.8}` con+2 · req defence 44, leatherworking 38 · v1500|forest_bear 0.045%|Vitalität (Regen)|
|15|**Alpha's Heart Ring / Leitwolf-Herzring**|`alphas_heart_ring`|ring · **epic**|`{mD:10,cC:0.05,hp:60,hpR:0.8}` · v3000|forest_bear 0.045%|Predator-Sustain|

---

## 8. The Highlands / Das Hochland — L35–110 (sehr breit, bis Endgame)
Mobs: roc L35 · roc_hunter L50 · roc_elder L65 · roc_storm L75 · highland_wyvern L79 · roc_void L84 · gravecliff_specter L87 · **void_titan L110**.
**killSek-Annahmen:** roc 8 s (5.400) · roc_hunter 9 s (4.800) · roc_elder 11 s (3.927) · roc_storm 12 s (3.600) · highland_wyvern/roc_void 13 s (3.323) · gravecliff_specter 14 s (3.086) · void_titan 35 s (1.234, großer Boss).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Talon Dagger / Klauen-Dolch|`talon_dagger`|mainhand melee `dagger` · rare|`{mD:48,acc:36,aI:-300,cC:0.06}` · `bleed 0.25/9/4.5s` · req attack 35 · v600|roc 0.19%|Tempo+Blutung|
|2|Skybreaker Greatsword / Himmelsbrecher-Großschwert|`skybreaker_greatsword`|mainhand melee `greatsword` 2H · epic|`{mD:130,acc:100,cD:0.20,aI:200}` · `shock 0.25/0.25/4s` · req attack 65 · v3000|roc_elder 0.036%|Schock|
|3|Stormhide Helm / Sturmhaut-Helm|`stormhide_helm`|helmet · superRare|`{def:24,eva:14,hp:60,rD:4}` · req defence 50 · v900|roc_hunter 0.083%|–|
|4|Skygrip Gauntlets / Himmelsgriff-Stulpen|`skygrip_gauntlets`|gloves · superRare|`{def:14,eva:12,hp:36,rD:4,cC:0.03}` · req defence 55 · v900|roc_hunter 0.083%|–|
|5|Storm Mantle / Sturm-Mantel|`storm_mantle`|cape · superRare|`{def:10,eva:16,rD:6,magD:6,mReg:0.5}` · req ranged 50 · v1400|roc_storm 0.11%|–|
|6|Aetherscale Cuirass / Aetherschuppen-Kürass|`aetherscale_cuirass`|body · epic|`{def:95,hp:240,eva:10,magD:8}` · req defence 75 · v6000|roc_void 0.042%|–|
|7|Wyvernscale Greaves / Wyvernschuppen-Beinschienen|`wyvernscale_greaves`|legs · epic|`{def:60,eva:14,hp:150,rD:6}` · req defence 79, leatherworking 70 · v4000|highland_wyvern 0.042%|–|
|8|Cloudwalker Boots / Wolkengänger-Stiefel|`cloudwalker_boots`|boots · epic|`{def:20,eva:24,hp:60,rD:6}` · req defence 80 · v3000|gravecliff_specter 0.045%|–|
|9|Stormcore Pendant / Sturmkern-Anhänger|`stormcore_pendant`|amulet · epic|`{magD:12,rD:8,cC:0.05,hp:60,mana:25}` · v4500|roc_storm 0.039%|–|
|10|Aetherband Ring / Aetherreif-Ring|`aetherband_ring`|ring · epic|`{magD:10,mD:10,rD:10,cC:0.04,hp:50}` · v4500|roc_void 0.042%|–|
|11|**[R1]** Skytalon Recurve / Himmelsklaue-Recurvebogen|`skytalon_recurve`|mainhand ranged `shortbow` · superRare|`{rD:26,acc:70,cC:0.09,aI:-150}` · `shock 0.20/0.20/3.5s` · ammo runite_arrow · req ranged 50, fletching 45 · v1400|roc_hunter 0.083%|Schock-Pfeile|
|12|**[R1]** Stormcrest Staff / Sturmkamm-Stab|`stormcrest_staff`|mainhand magic `staff` 2H · epic|`{magD:66,acc:120,cC:0.04,mana:20}` · `shock 0.30/0.30/4s` · manaCost 10 · req magic_off 75, runecrafting 70 · v6000|roc_storm 0.039%|Starker Schock|
|13|**[R1]** Wyvernscale Aegis / Wyvernschuppen-Aegis|`wyvernscale_aegis`|body · epic|`{def:100,hp:250,eva:14,rD:8,cC:0.03,hpR:1.0}` · req defence 79, leatherworking 70 · v6500|highland_wyvern 0.042%|Regen|
|14|**[R1] Voidwing Greatbow / Leerenschwingen-Großbogen**|`voidwing_greatbow`|mainhand ranged `longbow` 2H · **legendary**|`{rD:92,acc:245,cC:0.05,cD:0.35}` · `burn 0.40/30/6.5s` · ammo godiron_arrow · req ranged 99 · v26000|void_titan 0.016% (~1/6.170)|Void-Brand|
|15|**Void Titan's Mantle / Mantel des Leerentitanen**|`void_titan_mantle`|cape · **legendary**|`{def:40,eva:20,magD:16,rD:12,mD:12,cC:0.05,mana:30,hpR:1.2}` · v28000|void_titan 0.016% (~1/6.170)|All-Stat + Sustain|

---

## 9. Slag Pit & Frost Caverns / Schlackengrube & Frostkavernen — L42–101
Mobs: pit_spider L42 · slag_kobold L46 · ember_elemental L52 · iron_revenant L58 · frost_hound L62 · frost_hexer L68 · voidhusk_crusher L90 · **charred_doomknight L101**.
**killSek-Annahmen:** slag_kobold 9 s (4.800) · ember_elemental 10 s (4.320) · iron_revenant/frost_hound 11 s (3.927) · frost_hexer 12 s (3.600) · voidhusk_crusher 16 s (2.700) · charred_doomknight 30 s (1.440, großer Boss).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Slagforged Sword / Schlackenschwert|`slagforged_sword`|mainhand melee `sword` · rare|`{mD:70,acc:50}` · req attack 45 · v1000|slag_kobold 0.21%|–|
|2|Cinderfang Dagger / Glutzahn-Dolch|`cinderfang_dagger`|mainhand melee `dagger` · superRare|`{mD:58,acc:60,aI:-350,cC:0.08}` · `burn 0.30/12/5s` · req attack 50 · v1400|ember_elemental 0.093%|Tempo+Crit+Burn|
|3|Frostcaverns Bow / Frostkavernen-Bogen|`frostcaverns_bow`|mainhand ranged `longbow` 2H · epic|`{rD:40,acc:120,cD:0.20}` · `frost 0.30/1/4s` · ammo runite_arrow · req ranged 62, fletching 60 · v3000|frost_hound 0.036%|Frost-Slow|
|4|Revenant's Greatshield / Revenant-Großschild|`revenant_greatshield`|offhand `shield` · epic|`{def:60,hp:150,eva:6}` · req defence 58 · v2400|iron_revenant 0.036%|–|
|5|Emberforge Helm / Glutschmiede-Helm|`emberforge_helm`|helmet · superRare|`{def:28,hp:80,mD:4}` · req defence 50 · v1000|ember_elemental 0.093%|–|
|6|Frostplate Greaves / Frostplatten-Beinschienen|`frostplate_greaves`|legs · epic|`{def:55,hp:130,eva:6}` · req defence 62 · v2600|frost_hexer 0.039%|–|
|7|Moltengrip Gauntlets / Schmelzgriff-Stulpen|`moltengrip_gauntlets`|gloves · superRare|`{def:16,hp:40,mD:4,cC:0.03}` · req defence 55 · v900|ember_elemental 0.093%|–|
|8|Frostward Treads / Frostschutz-Schuhe|`frostward_treads`|boots · epic|`{def:22,eva:16,hp:60}` · req defence 62 · v2600|frost_hound 0.036%|–|
|9|Slagweave Cape / Schlackengewebe-Umhang|`slagweave_cape`|cape · epic|`{def:16,eva:10,mD:6,hpR:0.8}` · v2200|voidhusk_crusher 0.052%|Regen|
|10|Emberheart Amulet / Glutherz-Amulett|`emberheart_amulet`|amulet · epic|`{mD:12,cC:0.05,cD:0.18,hp:60,hpR:0.8}` · v3000|voidhusk_crusher 0.052%|Crit+Regen|
|11|**[R1]** Emberforge Hammer / Glutschmiede-Hammer|`emberforge_hammer`|mainhand melee `mace` 2H · epic|`{mD:88,acc:70,aI:150}` · `burn 0.40/16/5s` · req attack 52 · v2200|ember_elemental 0.032%|Molten-Burn|
|12|**[R1]** Frosthex Wand / Frosthex-Zauberstab|`frosthex_wand`|mainhand magic `wand` · epic|`{magD:48,acc:110,aI:-300,mana:20}` · `frost 0.35/1/4s` · manaCost 8 · req magic_off 68, runecrafting 64 · v4500|frost_hexer 0.039%|Frost-Slow|
|13|**[R1]** Slagcarapace Plate / Schlackenpanzer-Rüstung|`slagcarapace_plate`|body · epic|`{def:80,hp:200,mD:6,hpR:0.8}` · req defence 58 · v2600|iron_revenant 0.036%|Regen|
|14|**[R1] Doomknight's Cinderblade / Aschklinge des Doom-Ritters**|`doomknight_cinderblade`|mainhand melee `greatsword` 2H · **legendary**|`{mD:300,acc:175,cC:0.05,cD:0.30,aI:600,hpR:1.5}` · `burn 0.45/30/7s` · req attack 99 · v24000|charred_doomknight 0.014% (~1/7.200)|Verzehr-Brand+Regen|
|15|**Doomforged Band / Doom-Schmiede-Ring**|`doomforged_band`|ring · **legendary**|`{mD:14,magD:14,cC:0.06,cD:0.25,hp:70,hpR:1.0}` · v26000|charred_doomknight 0.014% (~1/7.200)|All-Offense+Sustain|

---

## 10. The Idol Hall / Die Götzenhalle — L92–120 (ENDGAME)
Mobs: idol_warden L92 · aether_wraith L98 · scale_skarn L104 · **last_idol L120**. Bestehend (in-game): `voidwarden_blade`, `spectral_longbow`, `skarn_idol_staff`, `idol_shroud` (legendary); `last_judgement`/`last_vengeance`/`last_condemnation`, `eye_of_the_idol` (godly).
**killSek-Annahmen:** idol_warden 16 s (2.700) · aether_wraith 17 s (2.541) · scale_skarn 18 s (2.400) · last_idol 45 s (960, finaler Boss).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Crown of the Idol / Krone des Götzen|`idol_crown`|helmet · legendary|`{def:60,hp:180,magD:10,mD:10,rD:10,cC:0.05}` · req defence 99 · v24000|idol_warden 0.0074% (~1/13.500)|All-Stat-Helm|
|2|Aetherweave Leggings / Aethergewebe-Beinlinge|`aetherweave_leggings`|legs · legendary|`{def:90,hp:220,eva:12,magD:12,cC:0.04}` · req defence 99 · v26000|scale_skarn 0.0083% (~1/12.000)|–|
|3|Voidtouched Gauntlets / Leerenberührte Stulpen|`voidtouched_gauntlets`|gloves · legendary|`{def:50,hp:130,cC:0.05,cD:0.20,mD:8,rD:8,magD:8}` · req defence 99 · v24000|aether_wraith 0.0079% (~1/12.705)|Crit-Hybrid|
|4|Idolstep Sabatons / Götzenschritt-Schuhe|`idolstep_sabatons`|boots · legendary|`{def:50,eva:18,hp:130,cC:0.04}` · req defence 99 · v24000|scale_skarn 0.0083% (~1/12.000)|–|
|5|**[R1]** Idolbound Signet / Götzengebundener Siegelring|`idolbound_signet`|ring · legendary|`{mD:8,rD:8,magD:8,acc:18,cC:0.04,hp:60}` · v28000|aether_wraith 0.0079% (~1/12.705)|All-Stat-Ring|
|6|**[R1]** Aegis of the Last Idol / Aegis des Letzten Götzen|`idol_aegis`|offhand `ward` · godly|`{def:120,hp:300,magD:20,eva:14,cC:0.04,mana:30,mReg:1.0,hpR:2.0}` · req defence 99 · v65000|last_idol 0.0031% (~1/32.000)|Massiv-Sustain+Mana|
|7|**Mantle of the Last Idol / Mantel des Letzten Götzen**|`last_idol_mantle`|cape · **godly**|`{def:60,eva:16,magD:18,mD:14,rD:14,cC:0.06,cD:0.25,mana:30,hpR:2.0}` · req defence 99 · v66000|last_idol 0.0031% (~1/32.000)|Godly-All-Stat-Cape|

(+ 8 in-game legendary/godly = 15 total.)

---

## 11. The Slayer Tower / Der Slayer-Turm — L3–96
Eigene Progression: Material-Drops + Slayer-Shop-Gear (punktebasiert). Diese 15 Direct-Drops ergänzen das, ersetzen die Shop-Linie NICHT. Etagen: 1 Plague · 2 Mirror · 3 Forge · 4 Void · 5 Throne.
**killSek-Annahmen:** rot_rat 2,5 s (17.280) · shambling_carcass 4 s (10.800) · hollow_marrow 5 s (8.640) · gaze_basilisk 6 s (7.200) · wailing_shade 7 s (6.171) · slag_abomination 9 s (4.800) · forge_demon 10 s (4.320) · dreadfang/void_stalker/sorrow_wraith 11–12 s (3.927/3.600) · soul_flayer 15 s (2.880) · abyssal_devourer 18 s (2.400).

| # | Item (en / de) | id | Slot · Typ · Rarity | bonus / weaponEffect · req · value | Quelle · Drop% | Unique |
|--|--|--|--|--|--|--|
|1|Rotfang Dagger / Faulzahn-Dolch|`rotfang_dagger`|mainhand melee `dagger` · common|`{mD:14,acc:14}` · `poison 0.20/3/4s` · req attack 5 · v70|rot_rat 0.23%|Gift|
|2|Plaguebone Buckler / Pestknochen-Buckler|`plaguebone_buckler`|offhand `shield` · common|`{def:6,hp:14,eva:2}` · req defence 8 · v60|shambling_carcass 0.37%|–|
|3|Marrow Cap / Mark-Kappe|`marrow_cap`|helmet · common|`{def:5,hp:14}` · req defence 10 · v60|hollow_marrow 0.46%|–|
|4|Basilisk Scale Shield / Basilisken-Schuppenschild|`basilisk_scale_shield`|offhand `shield` · rare|`{def:16,hp:36,eva:6}` · req defence 24 · v420|gaze_basilisk 0.14%|–|
|5|Mirrorglass Bow / Spiegelglas-Bogen|`mirrorglass_bow`|mainhand ranged `longbow` 2H · rare|`{rD:16,acc:44,cD:0.15}` · `frost 0.20/1/3.5s` · ammo steel_arrow · req ranged 28, fletching 26 · v520|gaze_basilisk 0.14%|Frost-Slow|
|6|Shade-Stalker Hood / Schattenpirscher-Kapuze|`shadestalker_hood`|helmet · rare|`{def:10,eva:14,hp:26,rD:2}` · req defence 28 · v360|wailing_shade 0.16%|–|
|7|Wailing Wand / Wehklage-Stab|`wailing_wand`|mainhand magic `wand` · rare|`{magD:19,acc:39,aI:-300}` · `shock 0.25/0.25/3.5s` · manaCost 8 · req magic_off 28, runecrafting 24 · v560|wailing_shade 0.16%|Schock|
|8|Slagheart Cuirass / Schlackenherz-Kürass|`slagheart_cuirass`|body · superRare|`{def:40,hp:100,mD:3}` · req defence 44 · v1000|slag_abomination 0.083%|–|
|9|Cinderwretch Maul / Glutwicht-Keule|`cinderwretch_maul`|mainhand melee `mace` 2H · superRare|`{mD:76,acc:56,aI:150}` · `burn 0.30/12/5s` · req attack 50 · v1300|forge_demon 0.093%|Burn|
|10|Forgeplate Greaves / Schmiedeplatten-Beinschienen|`forgeplate_greaves`|legs · superRare|`{def:30,hp:70,mD:2}` · req defence 50 · v900|forge_demon 0.093%|–|
|11|Dreadfang Glaive / Schreckenzahn-Glefe|`dreadfang_glaive`|mainhand melee `spear` 2H · epic|`{mD:100,acc:90,cC:0.05}` · `bleed 0.35/16/6s` · req attack 70 · v3000|dreadfang 0.036%|Starke Blutung|
|12|Voidstalker Cloak / Leerenpirscher-Umhang|`voidstalker_cloak`|cape · epic|`{def:14,eva:18,rD:6,magD:6}` · req ranged 65 · v2200|void_stalker 0.039%|–|
|13|Sorrow Staff / Kummer-Stab|`sorrow_staff`|mainhand magic `staff` 2H · epic|`{magD:55,acc:110,mana:20}` · `burn 0.35/18/5.5s` · manaCost 10 · req magic_off 72, runecrafting 68 · v4500|sorrow_wraith 0.039%|Starker Burn|
|14|Soulflayer's Amulet / Seelenschinder-Amulett|`soulflayer_amulet`|amulet · **epic**|`{magD:12,mD:12,cC:0.06,cD:0.22,hp:80,hpR:1.0}` · v5000|soul_flayer 0.049%|Hybrid+Sustain|
|15|**[R1] Abyssal Devourer's Fang / Reißzahn des Abyssalen Verschlingers**|`abyssal_devourer_fang`|mainhand melee `dagger` · **epic**|`{mD:95,acc:150,cC:0.10,aI:-400}` · `poison 0.35/25/5s` · req attack 90 · v7000|abyssal_devourer 0.058%|Tempo+Crit+Gift|

---

## 12. Dungeon-Keys — Verteilung auf ALLE Zonen-Mobs (UNVERÄNDERT — vom Chef bewusst gesetzt, NICHT umgerechnet)

**Schema:** Jeder Key droppt von ALLEN Mobs seiner Zone. Gebiets-Boss (apex) ~10 % (schwächere Bosse ~5 %); normale/niedrige Mobs 0,5–1 %. Keys werden verbraucht und dürfen sich ansammeln → bewusst hohe Raten, **NICHT** dem 12-h-Gear-Modell unterworfen.

**5 Dungeon-Keys** (highland_key bedient 2 Dungeons). `smugglers_key` = Thieving-Item, kein Dungeon-Key. Boss-% nach Key-Wert: warband 5 % · wildwood 6 % · crypt 7 % · highland 9 % · idolhall 10 %.

> **Cross-Zone-Bereinigung:** alte Einzeldrops ersetzen; `idolhall_key`@void_titan entfernen (void_titan = highland_key-Apex; idolhall_key kommt nun aus den idolhall-Mobs).

### warband_key — borderlands (Boss goblin_warlock 5 %)
goblin 0.5 % · goblin_shaman 0.5 % · goblin_rogue 0.6 % · goblin_spearman 0.6 % · goblin_archer 0.7 % · goblin_crossbower 0.8 % · goblin_butcher 0.8 % · goblin_felmagician 0.9 % · goblin_stormcaller 1.0 % · **goblin_warlock 5 %**

### crypt_key — crypt (Boss skeleton_nekro 7 %)
skeleton_warrior 0.6 % · skeleton_archer 0.7 % · skeleton_spearman 0.7 % · skeleton_butcher 0.8 % · skeleton_icemage 0.9 % · skeleton_pyroclasp 1.0 % · **skeleton_nekro 7 %**

### wildwood_key — wildwood (Boss forest_bear 6 %)
forest_hare 0.5 % · gray_wolf 0.7 % · wild_stag 0.8 % · dire_wolf 1.0 % · **forest_bear 6 %**

### highland_key — highlands (Apex void_titan 9 %)
roc 0.6 % · roc_hunter 0.7 % · roc_elder 0.8 % · roc_storm 0.9 % · highland_wyvern 1.0 % · roc_void 1.0 % · gravecliff_specter 1.0 % · **void_titan 9 %**

### idolhall_key — idolhall (Boss last_idol 10 %)
idol_warden 0.8 % · aether_wraith 0.9 % · scale_skarn 1.0 % · **last_idol 10 %**

**Zonen ohne Dungeon/Key:** pastures, ashfields, blackthorn, coast, slagpit, slayer_tower.

---

## 13. Apply-Liste für content-dev (vollständig — Chance als 0..1-Fraktion fürs `chance`-Feld)

> Neuen `items`-Eintrag anlegen (Schema §0; `suffixChance: 0.30`), dann Monster-`loot` die Zeile
> `{ itemId, chance:<Wert>, min:1, max:1, suffixChance:0.30 }` hinzufügen. **[R1]** = Item aus Rev. 1
> (Werte unverändert, NUR chance neu). Reiner Content → keine SAVE_VERSION. `content-refs`/`wiring-audit` grün halten.

**1) pastures:** `pitchfork_spear`→cow 0.0023 · `sickle_shiv`→cow 0.0023 · `farmhand_sling`→chicken 0.0019 · `hedgewitch_twig`→boar 0.0028 · `wattle_shield`→cow 0.0023 · `cowhide_cap`→chicken 0.0019 · `cowhide_jerkin`→boar 0.00069 · `hide_leggings`→boar 0.0028 · `worn_workgloves`→chicken 0.0019 · `muckboots`→cow 0.0023 · `field_cape`→boar 0.0028 · `boartusk_ring`→bull_boss 0.0019 · `gorehorn_cleaver`[R1]→bull_boss 0.0019 · `drovers_charm`[R1]→boar 0.00069 · `bulls_heart_pendant`→bull_boss 0.00074

**2) borderlands:** `goblin_shank`→goblin 0.0019 · `crude_waraxe`→goblin_spearman 0.0028 · `stolen_shortbow`→goblin_archer 0.0028 · `goblin_buckler`→goblin_spearman 0.0028 · `bonepatch_helm`→goblin 0.0019 · `warband_hauberk`→goblin_crossbower 0.00081 · `goblin_warkilt`→goblin_butcher 0.00093 · `rivetfist_gloves`→goblin_spearman 0.0028 · `scavenger_boots`→goblin_rogue 0.0028 · `warbanner_cape`→goblin_warlock 0.0019 · `cutpurse_ring`→goblin_rogue 0.0028 · `goblin_cleaver`[R1]→goblin_butcher 0.00093 · `stormcaller_totem`[R1]→goblin_stormcaller 0.00093 · `warlock_felstaff`[R1]→goblin_warlock 0.0019 · `felmagician_eye`→goblin_felmagician 0.00037

**3) ashfields:** `dustblade`→ash_rat 0.0023 · `cinder_spike`→pitch_beetle 0.0010 · `ashwood_longbow`→dust_vulture 0.00069 · `mire_hexstaff`→mire_crawler 0.00081 · `chitin_helm`→pitch_beetle 0.0010 · `ashplate_cuirass`→ash_tyrant 0.0023 · `sootscale_greaves`→pitch_beetle 0.0010 · `ashen_gauntlets`→ash_rat 0.0023 · `dustwalker_boots`→dust_vulture 0.0028 · `smokeweave_cape`→mire_crawler 0.00081 · `cinderloop_ring`→ash_tyrant 0.0023 · `ashfall_recurve`[R1]→ash_tyrant 0.00093 · `ash_tyrant_crown`→ash_tyrant 0.00032

**4) blackthorn:** `rootling_club`→rootling_grunt 0.0032 · `thornvine_whip`→thorn_wolf 0.0012 · `spectral_hunter_bow`→spectral_stag 0.00056 · `witchroot_wand`→bramble_witch 0.0016 · `bark_bulwark`→moss_golem 0.0014 · `mossweave_leggings`→moss_golem 0.0014 · `thornmail_gauntlets`→rootling_treemonster 0.0016 · `wildwood_treads`→spectral_stag 0.0014 · `soulopal_band`→forest_warden 0.0028 · `soulthorn_pendant`[R1]→forest_warden 0.0011 · `warden_greatcloak`→forest_warden 0.00039

**5) crypt:** `boneblade`→skeleton_warrior 0.0046 · `bonewrought_spear`→skeleton_spearman 0.0012 · `skeletal_longbow`→skeleton_archer 0.0012 · `pyre_staff`→skeleton_pyroclasp 0.00074 · `cryptguard_helm`→skeleton_warrior 0.0012 · `gravesteel_cuirass`→skeleton_pyroclasp 0.00074 · `tombplate_greaves`→skeleton_butcher 0.0014 · `boneknuckle_gauntlets`→skeleton_warrior 0.0012 · `gravetread_sabatons`→skeleton_spearman 0.0012 · `shroud_of_the_dead`→skeleton_icemage 0.00065 · `bonecharm_amulet`→skeleton_butcher 0.0014 · `gravewarden_greatshield`[R1]→skeleton_spearman 0.00046 · `frostbone_scepter`[R1]→skeleton_icemage 0.00065 · `necrosignet_ring`→skeleton_nekro 0.0013 · `nekro_reaperblade`[R1]→skeleton_nekro 0.00045

**6) coast:** `coral_shiv`→mud_crab 0.0032 · `driftwood_bow`→mud_crab 0.0032 · `drowned_cutlass`→reef_drowned 0.0012 · `tidecaller_focus`→reef_drowned 0.0012 · `reefscale_helm`→reef_drowned 0.0012 · `tidewoven_leggings`→tide_siren 0.00083 · `barnacle_gauntlets`→reef_drowned 0.0012 · `tidewalker_boots`→tide_siren 0.00083 · `mariner_cloak`→tide_siren 0.0021 · `krakenhide_cuirass`→deep_kraken 0.00071 · `abyssal_signet`→abyssal_tide_serpent 0.00052 · `crabshell_bulwark`[R1]→mud_crab 0.00081 · `siren_shockstaff`[R1]→tide_siren 0.00083 · `abyssal_tide_bow`[R1]→abyssal_tide_serpent 0.00052 · `kraken_maw`[R1]→deep_kraken 0.00071 · `pearl_of_the_deep`→deep_kraken 0.00071

**7) wildwood:** `hunting_knife`→forest_hare 0.0037 · `wolffang_spear`→gray_wolf 0.0012 · `antler_warbow`→wild_stag 0.0014 · `beastcaller_totem`→gray_wolf 0.0012 · `wolfpelt_hood`→gray_wolf 0.0012 · `stagleather_chaps`→wild_stag 0.0014 · `clawguard_gloves`→dire_wolf 0.0019 · `padfoot_boots`→forest_hare 0.00093 · `pelt_mantle`→wild_stag 0.0014 · `fang_pendant`→dire_wolf 0.0019 · `direhide_jerkin`→dire_wolf 0.00074 · `stagstride_longbow`[R1]→wild_stag 0.00056 · `direfang_maul`[R1]→dire_wolf 0.00074 · `bearhide_cuirass`[R1]→forest_bear 0.00045 · `alphas_heart_ring`→forest_bear 0.00045

**8) highlands:** `talon_dagger`→roc 0.0019 · `skybreaker_greatsword`→roc_elder 0.00036 · `stormhide_helm`→roc_hunter 0.00083 · `skygrip_gauntlets`→roc_hunter 0.00083 · `storm_mantle`→roc_storm 0.0011 · `aetherscale_cuirass`→roc_void 0.00042 · `wyvernscale_greaves`→highland_wyvern 0.00042 · `cloudwalker_boots`→gravecliff_specter 0.00045 · `stormcore_pendant`→roc_storm 0.00039 · `aetherband_ring`→roc_void 0.00042 · `skytalon_recurve`[R1]→roc_hunter 0.00083 · `stormcrest_staff`[R1]→roc_storm 0.00039 · `wyvernscale_aegis`[R1]→highland_wyvern 0.00042 · `voidwing_greatbow`[R1]→void_titan 0.00016 · `void_titan_mantle`→void_titan 0.00016

**9) slagpit:** `slagforged_sword`→slag_kobold 0.0021 · `cinderfang_dagger`→ember_elemental 0.00093 · `frostcaverns_bow`→frost_hound 0.00036 · `revenant_greatshield`→iron_revenant 0.00036 · `emberforge_helm`→ember_elemental 0.00093 · `frostplate_greaves`→frost_hexer 0.00039 · `moltengrip_gauntlets`→ember_elemental 0.00093 · `frostward_treads`→frost_hound 0.00036 · `slagweave_cape`→voidhusk_crusher 0.00052 · `emberheart_amulet`→voidhusk_crusher 0.00052 · `emberforge_hammer`[R1]→ember_elemental 0.00032 · `frosthex_wand`[R1]→frost_hexer 0.00039 · `slagcarapace_plate`[R1]→iron_revenant 0.00036 · `doomknight_cinderblade`[R1]→charred_doomknight 0.00014 · `doomforged_band`→charred_doomknight 0.00014

**10) idolhall:** `idol_crown`→idol_warden 0.000074 · `aetherweave_leggings`→scale_skarn 0.000083 · `voidtouched_gauntlets`→aether_wraith 0.000079 · `idolstep_sabatons`→scale_skarn 0.000083 · `idolbound_signet`[R1]→aether_wraith 0.000079 · `idol_aegis`[R1]→last_idol 0.000031 · `last_idol_mantle`→last_idol 0.000031

**11) slayer_tower:** `rotfang_dagger`→rot_rat 0.0023 · `plaguebone_buckler`→shambling_carcass 0.0037 · `marrow_cap`→hollow_marrow 0.0046 · `basilisk_scale_shield`→gaze_basilisk 0.0014 · `mirrorglass_bow`→gaze_basilisk 0.0014 · `shadestalker_hood`→wailing_shade 0.0016 · `wailing_wand`→wailing_shade 0.0016 · `slagheart_cuirass`→slag_abomination 0.00083 · `cinderwretch_maul`→forge_demon 0.00093 · `forgeplate_greaves`→forge_demon 0.00093 · `dreadfang_glaive`→dreadfang 0.00036 · `voidstalker_cloak`→void_stalker 0.00039 · `sorrow_staff`→sorrow_wraith 0.00039 · `soulflayer_amulet`→soul_flayer 0.00049 · `abyssal_devourer_fang`[R1]→abyssal_devourer 0.00058

**12) Dungeon-Keys:** UNVERÄNDERT (§12). Alte Einzeldrops ersetzen; `idolhall_key`@void_titan entfernen.

**Asset-Hinweis (asset-bind-all-references):** ~124 neue Items brauchen je ein Icon/Bild — CEO/content-dev muss Generierung anstoßen, sonst nur Emoji-Fallback.

---

## 14. Übersicht — neue Chance-Ranges je Rarity (12-h-Modell)

| Rarity | Ziel-Stück/12h | Chance-Range | Beispiel (Mob · avgKillSek · kills/12h · chance · erwartet/12h) |
|---|---|---|---|
| common | 40 | 0,19 % – 0,46 % | boneblade · skeleton_warrior 5 s · 8.640 · **0,46 %** · 40 |
| rare | 10 | 0,069 % – 0,28 % | thornvine_whip · thorn_wolf 5 s · 8.640 · **0,12 %** · 10 |
| superRare | 4 | 0,037 % – 0,13 % | felmagician_eye · goblin_felmagician 4 s · 10.800 · **0,037 %** · 4 |
| epic | 1,4 | 0,032 % – 0,071 % | bearhide_cuirass · forest_bear 14 s · 3.086 · **0,045 %** · 1,4 |
| legendary | 0,2 | 0,0074 % – 0,016 % | voidwing_greatbow · void_titan 35 s · 1.234 · **0,016 %** (~1/6.170) · 0,2 |
| godly | 0,03 | 0,0031 % | idol_aegis · last_idol 45 s · 960 · **0,0031 %** (~1/32.000) · 0,03 |

Item-Anzahl/Slots/Rarities/Effekte je Zone unverändert (≥15/Zone, ~168 Items gesamt). Dungeon-Keys (§12) bewusst NICHT umgerechnet. Höherstufige/zähere Mobs erhalten bei gleicher Ziel-Stückzahl die höhere % (weniger Kills/12h).
