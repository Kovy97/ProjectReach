# Playtest: Der Nahkampf-Haudegen

**Persona & Spielstil:** Ich will mich durch Monster prügeln, fettes Gear erbeuten und Bosse/Dungeons
legen. Skilling nur so viel wie nötig (Schmieden für Waffen, Kochen für Food). Ich spiele Nahkampf
(`setCombatStyle("power")`), Auto-Battle + Auto-Eat, und werde genervt, wenn Kampf zäh/unfair wird
oder der Gear-Fortschritt stockt.

## Was ich gespielt habe
Engine-Sim, Seed 7/11, deterministisch. Verlauf: Frischer Charakter (str 6 / con 4) → Goblin-Grind →
Bronze→Iron-Gear → Dauergrind über Pitch Beetle / Ash Tyrant / Thorn Wolf / Elder Treant → Versuche
auf alle 5 Dungeons. Zeitsteuerung via `advance` in 1-Min- bis 5-Sek-Häppchen, bis zu **14 Sim-Tage**
am Stück durchgespult.

## Pacing-Messungen (konkrete Zahlen)

### Grind-Raten (1 h, Bronze-Schwert + Leder, power-Stil)
| Monster | Lv | kills/h | gold/h | KampfXP/h | deaths |
|---|---|---|---|---|---|
| goblin | 1 | 1121 | 6.672 | 21.842 | 0 |
| goblin_butcher | 10 | 506 | 11.064 | 26.715 | 0 |
| ash_tyrant | 20 | 235 | **16.875** | 23.422 | 0 |
| thorn_wolf | 20 | 306 | 7.359 | 22.285 | 0 |

### Zeit bis Combat-Level (power-Dauergrind, immer Food)
- **Combat-L20: 12,7 h** Sim-Zeit
- **Combat-L40: NIE erreicht** — selbst nach **7 Sim-Tagen** und **99.090 Kills** bei combatLevel **31** stehengeblieben.
- **Combat-L60: NIE erreicht.**

Skill-Breakdown nach 7 Tagen power-Grind: `power L83` · `defence L56` · `vitality L71` ·
`attack L1` · `ranged L1` · `magic_off L1` · `magic_def L1`.

> **combatLevel = Ø der 7 Kampf-Skills.** Ein reiner Nahkämpfer trainiert nur `power` (+ passiv
> `defence`/`vitality`). Die anderen 4 Skills bleiben auf **L1** → der Durchschnitt klemmt. Mit
> `power 83` ist der combatLevel rechnerisch (83+56+1+1+1+71+1)/7 ≈ **31**. **Theoretisches Maximum
> eines reinen Melee-Spielers (alles relevante auf L99, ranged/magic L1): (99·4+1·3)/7 = combatLevel 57.**

### Style-Cycling (attack/power/defensive im Wechsel)
- L20: 3,7 h · L40: **4,4 Tage** · L60: **nie** (nach 14 Tagen combatLevel **47**).
- Skills: `attack 82 power 83 defence 84 vitality 80` aber `ranged 1 magic_off 1 magic_def 1`.

### Gear-Erreichbarkeit (Shop)
- Bronze-Schwert 80 g, Iron-Schwert 240 g, Iron-Brust 320 g — bei 6.600–16.800 gold/h **in <2 Min Grind
  bezahlt**. Gold ist faktisch nie ein Engpass.

### Metall-Drop-Quellen (für Schmieden höherer Waffen)
- `iron_ore`: goblin_crossbower / pitch_beetle / skeleton_warrior (je 20 %) ✅
- `iron_bar`: ash_tyrant (40 %) · `steel_bar`: iron_revenant (35 %)
- `runite_bar`: **KEIN Monster-Drop** (nur crypt_depths-Dungeon-Loot, 50 %)
- `godiron_bar`: **KEIN Monster-Drop** (nur idol_sanctum-Dungeon-Loot)

### Dungeons (5 Stück)
| Dungeon | reqLv | Wellen | Key-Quelle | xp / gold |
|---|---|---|---|---|
| goblin_warband | 12 | 5 | goblin_warlock 10 % | 180 / 320 |
| crypt_depths | 30 | 5 | skeleton_nekro 8 % | 600 / 1.200 |
| wildwood_hunt | 34 | 4 | forest_bear 8 % | 950 / 900 |
| highland_aerie | 65 | 4 | roc_storm 7 % | 3.200 / 3.000 |
| idol_sanctum | 100 | 4 | last_idol 6 % | 9.000 / 8.000 |

Clear-Versuche (mit passendem combatLevel künstlich gesetzt + Gear): goblin_warband, crypt_depths
clearen sich **flott und ohne Tode** (0,3–1,1 min Sim-Zeit). Das **Kampf-Gameplay selbst ist
solide** — sobald man drin ist.

### Schaden-Skalierung (computeStats, Level je gleichgesetzt)
| Setup | dmg | acc | def | hp | crit | interval |
|---|---|---|---|---|---|---|
| L5 bronze | 38 | 96 | 14 | 222 | 3 % | 2840 ms |
| L20 iron | 65 | 153 | 46 | 381 | 5 % | 2900 ms |
| L50 runite-Set | 88 | 240 | 58 | 577 | 8 % | 2400 ms |
| L90 godiron-Set | 141 | 380 | 97 | 897 | 12 % | 2000 ms |

Tiers fühlen sich **wertig gestaffelt** an (Schaden ~3,7×, HP ~4× von Bronze→Godiron, Crit + Tempo
steigen mit). Waffen-Tiers haben sinnvolle attack-Requirements (3 → 105) und Bleed/Burn-Effekte.

### Auto-Eat / Food-Loop
- ash_tyrant vs L20, cooked_trout (35 hp), aeTier0: **7 Food/h**. Mit cooked_lobster (80 hp): **2/h**.
- thorn_wolf vs L25, lobster: **1 Food/h**. Auto-Eat-Tier 0→2 ändert bei diesem Mob **nichts** (kaum Schaden).
- Auto-Eat funktioniert robust, **0 Tode** in allen Grind-Läufen. Food-Verbrauch ist extrem niedrig.

## Was sich gut anfühlt ✅
- **Kampf-Gameplay & Gefühl:** Auto-Battle läuft sauber, deterministisch, kein einziger Crash. Bleed/Burn,
  Crit, Enrage, Resists sind alle da → mechanische Tiefe ist vorhanden.
- **Waffen-/Rüstungs-Tiers:** 12 Metall-Tiers Bronze→Godiron, klare Schaden-Staffelung, Set-Boni,
  Weapon-Effects. Als Haudegen freue ich mich auf jede neue Klinge.
- **Monster-Vielfalt:** 58 Monster über 10 Zonen, thematisch gruppiert (Goblin-Warband, Rootlinge,
  Skelette …). Das ist viel Abwechslung.
- **Auto-Eat ist sorgenfrei** und Food ist billig — der Survival-Loop nervt nie.
- **Gold ist nie der Flaschenhals** — Shop-Upgrades sofort leistbar.

## Was sich zäh/unfair/falsch anfühlt ⚠️ (mit Zahlen)

### ⛔ DER KILLER: Single-Style ist eine Sackgasse beim combatLevel-Gate
Das ist mein **größter Frust** und für meine Persona ein echter Spiel-Stopper:
- combatLevel = **Durchschnitt aller 7 Kampf-Skills**, aber Nahkampf trainiert nur ~3 davon.
- Nach **99.090 Kills / 7 Tagen** power-Grind: `power L83`, aber **combatLevel hängt bei 31** fest.
- **crypt_depths (reqLv30)** kriege ich gerade so. **wildwood_hunt (34)** schon kaum, **highland_aerie
  (65)** und **idol_sanctum (100)** sind als reiner Melee **mathematisch unerreichbar** (Hard-Cap ~57).
- Die Engine bestraft also genau meinen Spielstil. Ich „mache alles richtig" (prügle Monster, werde in
  meiner Waffe extrem stark) und werde trotzdem von Content ausgesperrt. Das fühlt sich nicht wie
  Herausforderung an, sondern wie ein **versteckter Mathe-Trick gegen mich**.

### ⚠️ Combat ist „zu leicht", nicht „zu schwer"
- In **keinem** Grind-Lauf bin ich gestorben (0 Tode bei 99k Kills). Selbst Bosse (ash_tyrant 180 hp,
  enrage-Mobs) fallen ohne Druck. Die Spannung „schaffe ich diesen Gegner?" fehlt komplett.
- Dungeons clearen sich in **<1 Min** ohne Risiko. Es gibt keinen Boss-Moment, der weh tut.

### ⚠️ XP-Tempo entkoppelt von Fortschritt
- Ich generiere **~22.000 KampfXP/h**, mein power-Skill rast auf L83 — aber der *spürbare* Fortschritt
  (combatLevel, Dungeon-Zugang) bewegt sich kaum. Riesige Zahlen, null Tür-Öffnung = frustrierende
  Leere.

### ⚠️ Higher-Tier-Mats hängen hinter Dungeons, die ich nicht betreten kann
- `runite_bar`/`godiron_bar` droppen **nur** in crypt_depths/idol_sanctum. Wenn ich als Melee den
  Dungeon-reqLv nicht packe, komme ich auch ans Schmiede-Material für die Top-Waffen **nicht ran**.
  Doppelte Mauer.

## Reibungspunkte & Frust (konkret)
1. **Ich grinde 7 Tage und mein combatLevel steht still.** Kein Feedback im Spiel sagt mir „du musst
   auch ranged/magic leveln". Ich würde das als Bug empfinden, nicht als Design.
2. **Keine Gefahr = keine Belohnungs-Befriedigung.** 0 Tode entwerten Food, Auto-Eat-Upgrades und
   „harte" Bosse.
3. **Drops zum Aufrüsten kommen kaum vom Monster-Grind selbst** — Iron ja, aber das wirklich geile
   Gear (runite/godiron) ist Dungeon-gated → und der Dungeon ist Style-gated.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)

**P0 — combatLevel-Gate für Single-Style-Spieler reparieren** (größter Hebel):
- Option A: combatLevel als **gewichtetes Max statt stumpfer Ø** — z. B. `max(melee, ranged, magic)`-
  Block + defence/vitality, damit ein Melee-Fokus allein zählt (OSRS macht das so: Melee-Spieler
  kommen über reines Melee aufs Combat-Level).
- Option B: Dungeon-Gate nicht auf combatLevel, sondern auf **dein bestes Offensiv-Skill-Level**
  prüfen.
- Egal welche: Ein reiner Nahkämpfer **muss** highland_aerie & idol_sanctum erreichen können.

**P1 — Schwierigkeit/Spannung rauf:**
- Monster-Schaden/Accuracy in Mid/Endgame anziehen, sodass Food & Auto-Eat-Tier *gebraucht* werden;
  Ziel: gelegentliche Tode bei untergeartetem Spieler. Bosse mit Mechaniken (Heilphasen, Spike-Hits),
  die ohne richtiges Gear töten.

**P2 — Belohnungs-Feedback & Drop-Pfade:**
- Höhere Metall-Tiers (runite/godiron) auch als **seltenen Monster-Drop** in passenden Zonen, damit
  Melee-Grind direkt aufrüstet — nicht nur Dungeon-exklusiv.
- Sichtbares „du brauchst combatLevel X / Skill Y" am Dungeon-Eingang.

**P3 — Persona-Wünsche:**
- Mehr Boss-Monster mit eigenem Loot-Pool außerhalb von Dungeons. Slayer-/Bounty-artige Kill-Aufträge
  für gerichteten Fortschritt. Waffen-„Feel" (twoHanded vs. Schild+1H) spürbarer machen.

## Spaß-Bewertung: **5/10**
Das Kampf-Fundament (Tiers, Effekte, Vielfalt, sauberer Auto-Loop) macht Lust — aber als reiner
Nahkampf-Haudegen werde ich durch das combatLevel-Ø-Gate vom halben Endgame ausgesperrt und sterbe
nie, sodass weder Fortschritt noch Gefahr sich lohnend anfühlen.
