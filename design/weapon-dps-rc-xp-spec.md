# Waffen-DPS-&-RC-XP-Retune-Spec (Tasks #231 + #228 + Bulwark-Entscheid)

**Autor:** balance-designer · **Datum:** 2026-07-04 · **Status:** Spec fertig — wartet auf content-dev (+ logic-dev für Bulwark)
**Reviere:** nur `design/*.md`. Ich wende NICHTS an. Alle Zahlen sind mit dem Ist-Content geerdet und per
`computeStats`/`simulateCombat` (headless) nachgerechnet. Die Apply-List (§6) geht an CEO → content-dev/logic-dev.

Methodik: temporäres Mess-Harness im Scratchpad (kein `packages/**`-Write) importiert die echte Engine über
Aliase und rechnet je Tier den effektiven Netto-DPS (`avg_hit · (1 + crit·(critDmg−1)) / interval`) für
1H+Schild vs. jede 2H-Waffe (str5/con5, Tier-Set, `combatLevel=Tier`). Damage-Spannen werden per **fixem
charDamage** rückwärts aufgelöst (Interval bleibt Chef-gesetzt), dann in-memory injiziert und per
`simulateCombat` (Kills/Tode) gegengeprüft.

---

## 0. TL;DR — Kernzahlen

### #231 — 2H-Netto-DPS-Prämie (schwere Trias)
- **Ist-Befund (computeStats, godiron, str5/con5, cl99):** greatsword **×1.067**, greataxe **×0.983**,
  maul **×0.894** relativ zu 1H+Schild — die schwere Trias liegt am oberen Tier **auf oder UNTER** 1H+Schild.
  Der Combat-Depth-§1.3-Zielwert von **+22 %** wird um Größenordnungen verfehlt. Ursache: der große,
  bei jedem Schlag zählende `charDamage`-Anteil (~60 % des Treffers am Endgame) macht das schnelle 1H-Schwert
  überlegen; die vorhandenen 2H-Waffenspannen sind zu klein, um den Tempo-Nachteil auszugleichen.
- **Fix:** `damageMin/Max` der schweren 2H (greatsword/greataxe/maul, **alle 12 Tiers**) so anheben, dass
  Netto-DPS **greatsword/greataxe = ×1.22**, **maul = ×1.15** (roh; Armor-Pen hebt ihn gegen `armor`-Gegner
  auf ~1.22–1.25 — sein Nischenprofil). Interval **unverändert** (Chef-Staffel Spear 2900 / GS 3150 / GA 3450 / Maul 3700).
- **Sim-Validierung (30 min, Tier-Set + Food):** NEW-2H **schlägt 1H+Schild in Kills in ALLEN Bändern**
  (vorher Gleichstand):

  | Band (Gegner) | 1H+Schild | GS CUR | **GS NEW** | Maul CUR | **Maul NEW** |
  |---|--:|--:|--:|--:|--:|
  | mithril (forest_warden) | 39 | 42 (×1.08) | **47 (×1.21)** | 41 (×1.05) | **47 (×1.21)** |
  | runite (frost_hound) | 42 | 42 (×1.00) | **49 (×1.17)** | 46 (×1.10) | **52 (×1.24)** |
  | godiron (idol_warden) | 139 | 142 (×1.02) | **156 (×1.12)** | 141 (×1.01) | **153 (×1.10)** |

  (Kill-Prämie < computeStats-DPS-Prämie, weil ein fixer Respawn/Kill-Cooldown-Overhead je Kill die
  DPS-Differenz verdünnt und Gegner-Mitigation beide staucht — die **Richtung** ist eindeutig positiv.)
- **Glass-Cannon intakt (godiron, idol_warden):** NEW-greatsword **nackt + ohne Food = 44 Tode** (Suizid,
  gewollt); **Platte + Food = 0 Tode, 156 Kills** (Top-DPS, kein Suizid). EHP unverändert niedrig:
  2H `armorRating 125 / block 0 / hp 218` vs. 1H+Schild `armorRating 147 / block 0.50 / hp 242`. Der Buff
  berührt **nur `damageMin/Max`**, keine Defensivwerte → die 2H-Glaskanonen-Identität bleibt exakt wie in
  Combat-Depth §1.2 geeicht.

### #228 — RC/Magiewaffen-XP auf Peer-Niveau
- **Ist:** getierte Magiewaffen-Rezepte laufen **~2–3× über der Zielkurve** und **~2,1–2,3× über den Peer-
  Gathering-Skills** am High-Tier (godiron_focus 320 211 XP/h vs. godwood-Woodcutting 144 900 vs. Zielkurve 104 831).
- **Fix:** High-/Mid-Tier (**steel→godiron**) je Rezept auf das **empirische Peer-Band (~1,3–1,4× Zielkurve**,
  = mining/woodcutting/fishing bei gleichem Level) senken; **copper/bronze/iron unverändert** (sitzen bereits
  auf Peer-Granularität → schützt den frühen kampf-freien Trainings-Ramp). Retune per **`xp`-Absenkung bei
  fixer `durationMs`** (Pacing-Konvention). Betrifft `craft_*_focus` (S1), `craft_*_staff`, `craft_*_wand`.
  **`enchant_*_focus` (S2) bleibt unverändert** (liegt schon unter dem Peer-Band; 2-Stufen-Invariante S2 < S1
  bleibt in allen Tiers gewahrt).

### Bulwark-Rune
- **Empfehlung: ADDITIV.** Die `blockChance` der **Verzauberung** (Rune/Buff) additiv auf die Schild-Basis
  falten (Endclamp `BLOCK_CAP=0.5`), statt `Math.max`. Grund: MAX macht die Bollwerk-Rune auf genau den
  High-Block-Schilden **wirkungslos** (Basis ≥ Rune) — und die drei **anderen** Trinity-Achsen
  (armor/evasion/ward) werden bereits additiv gefaltet. Präzise 2-Zeilen-Änderung in §5.

---

## 1. #231 — Schwere-2H-`damageMin/Max`-Retune

### 1.1 Zielwerte (Netto-DPS vs. 1H+Schild)
Innerhalb einer Tier-Klasse landet jeder schwere-2H-Typ auf dem 2H-Klassenbudget (= 1,22 × 1H+Schild-Netto-DPS),
verteilt über Tempo · Pro-Treffer · Signatur (Combat-Depth §2.2):

| Typ | Netto-DPS-Ziel | Signatur | Begründung |
|---|--:|---|---|
| **greatsword** | **×1.22** | keine | reiner Stat-Stick, höchste unbedingte 2H-DPS (0 Signatur-Tax) |
| **greataxe** | **×1.22** | STR-Bonus (budget-neutral) | gleiche DPS wie GS, aber langsamer → höherer Pro-Treffer |
| **maul** | **×1.15** (roh) | `armorPen 0.30` | zahlt 5-%-Tax; Armor-Pen hebt ihn gegen `armor`-Gegner auf ~1.22–1.25 (Nische), sonst leicht unter GS → nie strikt bester |

Spread je Typ **unverändert** (GS/GA ±30 %, Maul ±40 % — schon Chef-konform). Der Buff skaliert nur den
Mittelwert; `min/max`-Anteile bleiben.

### 1.2 Neue `damageMin/Max` je Tier (Interval unverändert)

**GREATSWORD** (interval-Staffel 3150→…; verifiziert ×1.220–1.224):

| Tier | L | cur min/max | **NEU min/max** |
|---|--:|--:|--:|
| copper | 1 | 1.1/2.1 | **1.7 / 3.3** |
| bronze | 5 | 1.7/3.2 | **2.4 / 4.5** |
| iron | 10 | 2.9/5.4 | **3.9 / 7.3** |
| steel | 20 | 3.9/7.2 | **5.3 / 9.7** |
| blacksteel | 30 | 5.3/9.9 | **6.6 / 12.3** |
| mithril | 40 | 6.2/11.6 | **8.1 / 15.2** |
| adamantium | 50 | 7.8/14.5 | **10.1 / 18.8** |
| runite | 60 | 9.1/16.9 | **12.0 / 22.4** |
| bloodiron | 70 | 10.4/19.3 | **13.8 / 25.6** |
| titanium | 80 | 12.5/23.3 | **16.7 / 31.1** |
| aetherium | 90 | 14.5/26.8 | **20.1 / 37.1** |
| godiron | 99 | 17.3/32.1 | **23.7 / 44.0** |

**GREATAXE** (verifiziert ×1.217–1.220):

| Tier | L | cur min/max | **NEU min/max** |
|---|--:|--:|--:|
| copper | 1 | 1.3/2.4 | **2.0 / 3.6** |
| bronze | 5 | 2.0/3.7 | **2.7 / 5.1** |
| iron | 10 | 3.3/6.2 | **4.5 / 8.5** |
| steel | 20 | 4.4/8.2 | **6.2 / 11.6** |
| blacksteel | 30 | 6.1/11.4 | **8.1 / 15.1** |
| mithril | 40 | 7.2/13.4 | **10.2 / 19.0** |
| adamantium | 50 | 9.0/16.7 | **12.7 / 23.5** |
| runite | 60 | 10.5/19.5 | **15.0 / 27.9** |
| bloodiron | 70 | 12.0/22.2 | **17.7 / 32.7** |
| titanium | 80 | 14.4/26.8 | **21.5 / 40.0** |
| aetherium | 90 | 16.6/30.8 | **25.6 / 47.4** |
| godiron | 99 | 19.7/36.7 | **31.0 / 57.8** |

**MAUL** (roh ×1.15; verifiziert ×1.146–1.151 — Armor-Pen liefert die Nischen-Prämie obendrauf):

| Tier | L | cur min/max | **NEU min/max** |
|---|--:|--:|--:|
| copper | 1 | 1.2/2.7 | **1.8 / 4.0** |
| bronze | 5 | 1.8/4.1 | **2.5 / 5.7** |
| iron | 10 | 3.0/7.0 | **3.9 / 9.1** |
| steel | 20 | 4.0/9.4 | **5.4 / 12.7** |
| blacksteel | 30 | 5.5/12.9 | **7.1 / 16.6** |
| mithril | 40 | 6.5/15.2 | **9.1 / 21.3** |
| adamantium | 50 | 8.1/19.0 | **11.2 / 26.2** |
| runite | 60 | 9.5/22.1 | **13.7 / 31.9** |
| bloodiron | 70 | 10.8/25.3 | **16.0 / 37.6** |
| titanium | 80 | 13.0/30.4 | **19.8 / 46.4** |
| aetherium | 90 | 15.0/34.9 | **24.3 / 56.4** |
| godiron | 99 | 17.8/41.4 | **29.8 / 69.4** |

### 1.3 Spear (leichte Polearm) — separat geprüft: KEIN Buff nötig
Der Speer liefert die 2H-Prämie **bereits** (Netto-DPS-Ratio copper ×1.09 → godiron ×1.25) — er ist schnell
(2900 ms), DEX-lastig, hat `precision 0.20`. Er ist der **Referenzpunkt**, zu dem die schwere Trias gehoben wird.

- **copper→bloodiron: UNVERÄNDERT lassen** (×1.09–1.18 = gesundes Leicht-Polearm-Band unter dem GS-Budget,
  passend zur 0.95-Precision-Tax).
- **titanium/aetherium/godiron: OPTIONALER Trim** — dort liegt der Speer bei ×1.21–1.25, also **über** dem
  neuen greatsword-Budget, und mit Precision-Upside gegen `evasion`-Gegner effektiv am/über dem +25-%-Deckel.
  Trim auf roh ×1.16, damit „greatsword = höchste 2H-DPS" strikt gilt:

  | Tier | L | cur min/max | Trim-Ziel (optional) |
  |---|--:|--:|--:|
  | titanium | 80 | 11.2/18.6 | 9.8 / 16.3 |
  | aetherium | 90 | 12.9/21.5 | 11.3 / 18.8 |
  | godiron | 99 | 15.5/25.8 | 12.3 / 20.6 |

  **Default: Trim anwenden** (kohärent mit „kein 2H strikt bester"). Verwirft der Chef den Trim, ist der
  Speer nur am obersten Rand leicht heiß — kein Blocker.

### 1.4 Unique-2H-Drops (Chase-Items) — Greatsword-Linie ×1.37
Die einzigen schweren-2H-Uniques sind **greatsword-Typ** (kein Unique-greataxe/maul im Katalog). Sie erben die
neue 2H-Budget-Größe über den **godiron-greatsword-Waffen-Avg-Faktor ×1.37** (roh gemessen: greatsword-Lift ist
über alle Tiers ~×1.35–1.37 konstant). Interval + `bonus` (Lifesteal etc.) **unverändert** — nur `damageMin/Max`
skalieren. So bleibt die Chase-Prämie (legendary +10–15 %, godly +25–30 % über godiron-epic) erhalten.

| id | cur min/max | **NEU min/max** (×1.37) |
|---|--:|--:|
| `skybreaker_greatsword` | 12.4/24.0 | **17.0 / 32.9** |
| `kraken_maw` | 8.3/16.1 | **11.4 / 22.1** |
| `nekro_reaperblade` | 7.8/15.2 | **10.7 / 20.8** |
| `doomknight_cinderblade` | 19.4/37.6 | **26.6 / 51.5** |
| `voidwarden_blade` | 23.3/45.1 | **31.9 / 61.8** |
| `last_judgement` | 25.0/48.6 | **34.3 / 66.6** |

*(Falls kontrolleur ein weiteres schweres-2H-Unique findet: greatsword-Typ ×1.37, greataxe-Typ ×1.57,
maul-Typ ×1.68 — die gemessenen godiron-Waffen-Avg-Lifts. Speer-Typ-Uniques* (`pitchfork_spear`,
`cinder_spike`, `bonewrought_spear`, `wolffang_spear`, `dreadfang_glaive`) *bleiben unangetastet — analog
§1.3 zur Speer-Linie.)*

---

## 2. #228 — RC-/Magiewaffen-XP-Kurven-Retune

### 2.1 Referenz: Zielkurve & empirisches Peer-Band
`target_xph(L) = 90·√(xpForLevel(L+1) − xpForLevel(L))` (L99 uncapped = 104 831).

Peer-Gathering (Sim-XP/h, Ratio zur Zielkurve) — der **Boden**, den alle Live-Skills teilen:

| Skill-Aktion | reqL | Sim XP/h | ×Ziel |
|---|--:|--:|--:|
| mine_mithril | 35 | 5 760 | ×1.30 |
| mine_runite | 55 | 15 066 | ×1.27 |
| mine_bloodiron | 70 | 32 364 | ×1.30 |
| mine_titanium | 80 | 53 820 | ×1.32 |
| catch_voidray | 85 | 67 860 | ×1.29 |
| mine_aetherite | 90 | 88 560 | ×1.32 |
| catch_soulfish | 97 | 118 776 | ×1.25 |
| cut_godwood_tree | 99 | 144 900 | ×1.38 |

→ **Peer-Band = ~1,3–1,4× Zielkurve** ab L35. (Ausreißer `mine_godiron` ×2.19 und `catch_lobster` ×1.61 sind
selbst heiß und **nicht** als Anker genutzt.) Die RC-Rezepte werden auf dieses Band gesenkt.

### 2.2 FOCUS Stufe 1 — `craft_<tier>_focus` (kampf-freie Trainings-Route)

| Tier | L | dur (ms) | xp alt | xph alt | ×Ziel alt | **xp NEU** | **xph NEU** | ×Ziel neu |
|---|--:|--:|--:|--:|--:|--:|--:|--:|
| copper | 1 | 4500 | 3 | 2 400 | ×2.93 | **3** (keep) | 2 400 | ×2.93 |
| bronze | 5 | 6000 | 5 | 3 000 | ×2.99 | **5** (keep) | 3 000 | ×2.99 |
| iron | 10 | 5500 | 6 | 3 927 | ×3.06 | **6** (keep) | 3 927 | ×3.06 |
| steel | 20 | 9000 | 15 | 6 000 | ×2.85 | **10** | 4 000 | ×1.90 |
| blacksteel | 30 | 11000 | 28 | 9 164 | ×2.66 | **16** | 5 236 | ×1.52 |
| mithril | 40 | 11000 | 36 | 11 782 | ×2.08 | **23** | 7 527 | ×1.33 |
| adamantium | 50 | 13000 | 68 | 18 831 | ×2.03 | **44** | 12 185 | ×1.31 |
| runite | 60 | 14000 | 128 | 32 914 | ×2.16 | **81** | 20 829 | ×1.37 |
| bloodiron | 70 | 15000 | 240 | 57 600 | ×2.31 | **135** | 32 400 | ×1.30 |
| titanium | 80 | 16000 | 555 | 124 875 | ×3.05 | **239** | 53 775 | ×1.31 |
| aetherium | 90 | 17000 | 870 | 184 235 | ×2.74 | **418** | 88 518 | ×1.32 |
| godiron | 99 | 19000 | 1690 | 320 211 | ×3.05 | **765** | 144 947 | ×1.38 |

**Trainbarkeit gewahrt:** godiron-S1 landet auf **144 947 XP/h = exakt godwood-Woodcutting** → RC-bis-99 dauert
danach genau so lang wie Woodcutting-bis-99 (vorher war RC mit ×2,2 der **schnellste** Skill im Spiel). Kein Slog,
sondern Peer-Angleichung. Die frühe kampf-freie Route (copper/bronze/iron) bleibt völlig unangetastet.

### 2.3 STAFF — `craft_<tier>_staff`

| Tier | L | dur | xp alt | **xp NEU** | xph NEU | ×Ziel |
|---|--:|--:|--:|--:|--:|--:|
| copper | 1 | 6500 | 4 | **4** (keep) | 2 215 | ×2.70 |
| bronze | 5 | 8000 | 7 | **7** (keep) | 3 150 | ×3.14 |
| iron | 10 | 9500 | 9 | **9** (keep) | 3 411 | ×2.65 |
| steel | 20 | 15000 | 23 | **17** | 4 080 | ×1.94 |
| blacksteel | 30 | 17000 | 42 | **24** | 5 082 | ×1.47 |
| mithril | 40 | 17000 | 54 | **35** | 7 412 | ×1.31 |
| adamantium | 50 | 19000 | 102 | **64** | 12 126 | ×1.31 |
| runite | 60 | 21000 | 192 | **122** | 20 914 | ×1.38 |
| bloodiron | 70 | 23000 | 360 | **207** | 32 400 | ×1.30 |
| titanium | 80 | 25000 | 835 | **374** | 53 856 | ×1.32 |
| aetherium | 90 | 27000 | 1305 | **664** | 88 533 | ×1.32 |
| godiron | 95 | 31000 | 2535 | **919** | 106 723 | ×1.24 |

### 2.4 WAND — `craft_<tier>_wand`

| Tier | L | dur | xp alt | **xp NEU** | xph NEU | ×Ziel |
|---|--:|--:|--:|--:|--:|--:|
| copper | 1 | 4500 | 3 | **3** (keep) | 2 400 | ×2.93 |
| bronze | 5 | 6000 | 5 | **5** (keep) | 3 000 | ×2.99 |
| iron | 10 | 6500 | 6 | **6** (keep) | 3 323 | ×2.59 |
| steel | 20 | 9000 | 15 | **10** | 4 000 | ×1.90 |
| blacksteel | 30 | 11000 | 28 | **16** | 5 236 | ×1.52 |
| mithril | 40 | 11000 | 36 | **23** | 7 527 | ×1.33 |
| adamantium | 50 | 13000 | 68 | **44** | 12 185 | ×1.31 |
| runite | 60 | 14000 | 128 | **81** | 20 829 | ×1.37 |
| bloodiron | 70 | 15000 | 240 | **135** | 32 400 | ×1.30 |
| titanium | 80 | 16000 | 555 | **239** | 53 775 | ×1.31 |
| aetherium | 90 | 17000 | 870 | **418** | 88 518 | ×1.32 |
| godiron | 97 | 19000 | 1690 | **627** | 118 800 | ×1.25 |

### 2.5 FOCUS Stufe 2 — `enchant_<tier>_focus`: UNVERÄNDERT
S2 liegt bereits **unter** dem Peer-Band (xph ×0.58–1.46 der Zielkurve, ×0.40–0.69 der Peers) → kein Retune.
**2-Stufen-Invariante bleibt gewahrt:** nach der S1-Absenkung ist S2 in jedem Tier weiterhin langsamer als S1
(z. B. godiron S2 96 253 < S1 144 947 = 66 %; runite S2 9 771 < S1 20 829 = 47 %). S1 bleibt die schnellste
reine-XP-Route → der reine Skiller trainiert weiter kampf-frei über S1, die essenz-gegatete S2 wird nie zum
Grind-Weg (die #227-Entkopplung bleibt intakt). Der S2/S1-Abstand verengt sich (30 %→47–69 %), bleibt aber
S1-favorisierend — kein Eingriff nötig.

> **Retune per xp bei fixer duration** (Pacing-Konvention `balance-xp-table §1.1`). Äquivalent-Alternative:
> `durationMs` proportional erhöhen (xp behalten) — gleiche XP/h, aber langsamere Aktionen + geringerer
> Material-/Gold-Durchsatz. Empfehlung: **xp senken** (schlankster Eingriff, hält das Aktions-Tempo/„Feel").

---

## 3. Bulwark-Rune — MAX vs. additiv

**Problem:** `computeStats` faltet `blockChance` durchgängig per `Math.max`. Für die **Basis** ist das korrekt
(nur der Schild trägt Block, ein Slot → MAX = der Schild). Für die **Verzauberung** (Bulwark-Rune `affix_bulwark`,
`tonic_bulwark`) bedeutet MAX aber: sitzt die Rune auf einem Schild, dessen Basis-`blockChance` bereits ≥ dem
Rune-Flat ist (bei jedem Mid-/High-Schild der Fall: Basis 0.223→0.33+), ist die Rune **wirkungslos** — genau auf
den Items, die man verzaubern will.

**Empfehlung: ADDITIV** (die Verzauberungs-`blockChance` auf die Basis addieren, Endclamp `BLOCK_CAP=0.5`).

Begründung:
1. **Nutzen garantiert:** die Bollwerk-Rune/das Bollwerk-Tonikum liefert immer Block-Zuwachs (bis zum Cap),
   statt „no-op auf gutem Schild".
2. **Konsistenz:** die drei anderen Trinity-Achsen (`armorRating`/`evasionRating`/`wardCapacity`) werden aus
   Runen/Buffs **bereits additiv** gefaltet (character.ts Z. 289–291, 307–309). `blockChance` ist der einzige
   MAX-Ausreißer — additiv bringt Block in Linie.
3. **Sicher gedeckelt:** `BLOCK_CAP=0.5` bounded die Summe hart; kein Runaway (max. 50 % Block, wie heute).
4. **Semantik:** MAX ist die Basis-Slot-Regel (mutually-exclusive Gear). Eine Verzauberung ist eine **Schicht
   DARÜBER** — additiv-auf-Basis ist die richtige Faltung, nicht MAX-mit-Basis.

**Logic-Änderung (logic-dev, `packages/engine/src/character.ts`):** Basis-Fold (Z. 265) **bleibt MAX**. Nur die
zwei Verzauberungs-Folds additiv machen:
- Z. 292 (Instanz-/Rune-Trinity): `eq.blockChance = Math.max(eq.blockChance, delta.trinity.blockChance)`
  → **`eq.blockChance += delta.trinity.blockChance ?? 0;`**
- Z. 310 (Buff-Trinity, `tonic_bulwark`): `eq.blockChance = Math.max(eq.blockChance, bf.trinity.blockChance ?? 0)`
  → **`eq.blockChance += bf.trinity.blockChance ?? 0;`**

Der Endclamp `blockChance = Math.min(BLOCK_CAP, …)` (Z. 365) fängt die Summe bereits ab — keine weitere Änderung.
Guard/Tests: `mitigation.test.ts` unberührt; ein neuer Assert „Bulwark-Rune auf High-Block-Schild hebt
blockChance (bis Cap)" wäre sinnvoll. **Alt-Rune-Balance:** da Bulwark-Runen bisher meist wirkungslos waren,
prüft kontrolleur nach der Umstellung, dass ein voll bulwark-verzauberter Schild nicht dauerhaft am 0.5-Cap
klebt (bei Bedarf Rune-Flats leicht senken — Rune-Spec-Scope, nicht diese Spec).

---

## 4. Zusammenspiel & Konstanten (unverändert)
- Der #231-Buff berührt **nur `damageMin/Max`** der schweren 2H (+ 6 greatsword-Uniques). Interval,
  `armorPen`/`precision`, `modifiers`, `armorRating`-Abwesenheit (2H = 0 seit #221) bleiben. Die
  Glass-Cannon-EHP-Eichung (Combat-Depth §1.2) ist unangetastet.
- #228 ändert nur `xp` von RC-Rezepten; keine Rezept-Inputs/Outputs, keine Item-Stats, kein SAVE_VERSION-Bump
  (Mastery-XP-Referenzen bleiben, ids unverändert).
- Bulwark: additiver Fold + `BLOCK_CAP=0.5`-Clamp (bestehend). Kein SAVE-Bump.

---

## 5. Apply-List (geordnet, Single-Writer je Datei)

### content-dev — `packages/content/src/index.ts`
1. **#231 schwere-2H `damageMin/Max`** je Tier setzen (§1.2): 12× greatsword, 12× greataxe, 12× maul
   (36 Waffen). Interval NICHT anfassen.
2. **#231 Unique-Greatswords** (§1.4): `skybreaker_greatsword`, `kraken_maw`, `nekro_reaperblade`,
   `doomknight_cinderblade`, `voidwarden_blade`, `last_judgement` — `damageMin/Max` auf die ×1.37-Werte;
   `bonus`/Interval unverändert.
3. **#231 Speer (optional, empfohlen)** (§1.3): nur titanium/aetherium/godiron-Speer auf die Trim-Werte;
   copper→bloodiron unverändert.
4. **#228 RC-XP** (§2.2–2.4): `craft_<tier>_focus` (steel→godiron), `craft_<tier>_staff` (steel→godiron),
   `craft_<tier>_wand` (steel→godiron) auf die neuen `xp`; **`durationMs` unverändert**; copper/bronze/iron
   unverändert; **`enchant_<tier>_focus` NICHT anfassen** (§2.5).
5. **Copy-Nit `bloodmend_draught`** (Z. 428): `healAmount: 22` widerspricht dem eigenen Kommentar
   („heal 130→220 (> gallows L50=188)"). Der Wert hat offenbar eine Null verloren. **Empfehlung: `healAmount: 220`**
   (passt zur dokumentierten Intention + Tier-Ordnung) — oder den Kommentar korrigieren, falls 22 gewollt ist.
6. **Copy-Nit `affix_aegis`** (Z. 15150): `prefix.de: "Ägiden-"` liest sich holprig (en „Aegis-Bound").
   Vorschlag „**Ägis-**" oder „**Ägidengebundene-**" (finales Wording = content-dev/Chef).

### logic-dev — `packages/engine/src/character.ts` (Bulwark)
7. Z. 292 + Z. 310: `blockChance`-Verzauberungs-Fold von `Math.max(...)` auf `+= ...` (§3). Basis-Fold Z. 265
   (MAX) bleibt. Endclamp Z. 365 bleibt.

### kontrolleur — Re-Gate (§6).

---

## 6. Gate-Kriterien (headless, echtes computeStats/simulateCombat)

**#231:**
1. Je Tier (computeStats, str5/con5, Tier-Set, cl=Tier): greatsword/greataxe Netto-DPS ×1.22 ±0.01,
   maul ×1.15 ±0.01 vs. 1H+Schild. Speer (falls getrimmt) ≤ greatsword.
2. `simulateCombat` (Tier-Set + Food): **NEW-2H Kills > 1H+Schild-Kills** in ≥3 Bändern; NEW-2H-Kills >
   CUR-2H-Kills. Maul-Kills gegen `armor`-Gegner ≥ greatsword-Kills (Nische wirkt).
3. **Glass-Cannon:** nackt+ohne-Food NEW-2H **stirbt** (Suizid-Constraint); Platte+Food NEW-2H **0 Tode +
   Top-DPS**. EHP (armorRating/block/hp) unverändert = kein Waffen-Defensiv-Term.
4. Deckel: kein schwerer-2H-Netto-DPS > ×1.25 vs. 1H+Schild (Maul-Nische gegen `armor` bis ~×1.25 ok).

**#228:**
5. `pnpm test`-Sim: kein `craft_*_focus/staff/wand` mit `0 XP/h`; die retuneten High-Tier-Rezepte liegen
   ~1,3–1,4× Zielkurve (= Peer-Band), nicht mehr ×2–3.
6. RC 1→99 **kampf-frei über S1** in Peer-Zeit erreichbar (godiron-S1 ≈ godwood-Woodcutting XP/h). S2 in
   jedem Tier langsamer als S1 (2-Stufen-Invariante).

**Bulwark:**
7. Bulwark-Rune auf einem High-Block-Schild **erhöht** `blockChance` (bis `BLOCK_CAP`); `mitigation.test.ts`
   grün; kein Dauer-Kleben am Cap ohne mehrfach-Verzauberung.

**Allgemein:** `pnpm typecheck` + Engine/Persistence-Tests + Client-Build grün; Itemization-Guards grün
(2H trägt weiter kein `armorRating`; Signaturen nur auf `weaponStyle`-Trägern).

---

## Anhang — Referenzen
- Katalog: `G:\GameDev\packages\content\src\index.ts` — schwere 2H je Tier (copper 1058–1077 … godiron 2574–2605);
  Unique-Greatswords (voidwarden_blade 2617, last_judgement 2687, nekro_reaperblade 5131, kraken_maw 5276,
  skybreaker_greatsword 5407, doomknight_cinderblade 5607); RC-Rezepte staff 9014–9025 / wand 9028–9039 /
  focus-S1 9046–9057 / focus-S2 9063–9074; `bloodmend_draught` 428; `affix_aegis` 15148.
- Engine: `computeStats` (character.ts 155–517; Block-Fold 265/292/310/365); `simulateCombat` (sim.ts 106);
  Zielkurve `xpForLevel` (leveling.ts, Cap 99 → L99-Delta uncapped nachgerechnet).
- Combat-Depth-Grundlage: `design/combat-depth-spec.md` §1.2/§1.3/§2.2/§2.4. RC-Vorlauf: `design/runecrafting-focus-spec.md` §7 (der hier eingelöste Out-of-scope-Befund).
