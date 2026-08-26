# Stil-Parität 2026-08-26 — Zählmatrix, Ursachen, Langzeitplan (Nahkampf / Fernkampf / Magie)

**balance-designer, 26.08.2026 · Chef-Auftrag: „Es kommen immer noch Beschwerden, dass viele Items, Drops etc. viel zu Melee-orientiert sind. Auch das Crafting soll wohl Melee-favored sein. Wir brauchen eine Langzeitlösung, damit alle drei Kampfarten Spaß machen." Nachtrag: „Auch Enchantment Runes sind wohl angeblich mehr auf Melee ausgelegt, kontrolliere das auch."**
**Reine Analyse + Spec. Nichts davon ist angewendet. Zahlen der Sofortmaßnahmen (§4a) übernimmt content-dev nach Chef-Freigabe 1:1.**

Datenbasis: `packages/content/src/index.ts` (Stand 26.08., nach 1.1.0-Fixblock bis f9d734b), `packages/shared/src/index.ts` (ItemDef/AffixDef/SuffixDef/itemTypeTags), Engine `character.ts` (computeStats), `balance-envelope-helpers.ts` (BiS-Bauer), TTK-Formel aus `balance-envelope.test.ts` §5 (`expectedTtk`), G1/G2/G3 aus `content-integrity.test.ts`, `design/magier-material-parity-audit.md` (23.07.), `design/itemization-2-spec.md` §3/§5 (Attribut-Budget), `design/runen-tier-iv.html` §7. Zählung per Wegwerf-Skript `packages/engine/src/_parity.test.ts` (gelöscht). Kein `pnpm test`, kein Commit.

Bänder: 1–20 (Req 0–19), 20–40, 40–60, 60–80, 80–99. „Drop-only" = Ausrüstung, die weder craftbar noch im Shop/Slayer-/Token-Shop ist (nur Monster/Turm/Dungeon/Elite/Paragon). Stil eines Nicht-Waffen-Teils: Platte/Schild = Nahkampf, Leder = Fernkampf, Stoff/Fokus = Magie; Schmuck nach Requirement, sonst nach Attributen (str→Nahkampf, dex→Fernkampf, int/wis/Mana→Magie; mehrere = „gemischt").

---

## 0. Kurzfassung

1. **Die Drop-Tabellen sind Nahkampf-Tabellen.** 120 Drop-only-Uniques tragen Nahkampf-Stil, 39 Fernkampf, 36 Magie. Von 89 Monstern mit Ausrüstungs-Drops droppen 60 keine Fernkampf- und 72 keine Magie-Ausrüstung; 46 droppen ausschließlich Nahkampf. Drop-Rüstung: Platte 48 Teile, Leder 15, Stoff 4 (alle vier sind Elite-Uniques, von normalen Monstern fällt im ganzen Spiel kein einziges Stoffteil). Band 40–60: 36 Nahkampf-Uniques, 9 Fernkampf, 8 Magie.
2. **Handwerk: Schmieden allein hat mehr Ausrüstungsrezepte als Fernkampf und Magie zusammen.** 235 Schmiede-Rezepte (123 Waffen in 10 Typen × 12 Stufen, 87 Platte, 25 Schilde) gegen 89 Fernkampf-Rezepte (24 Bögen in 2 Typen, 65 Leder) und 99 Magie-Rezepte, verteilt auf ZWEI Skills (29 Stäbe/Zauberstäbe + 17 Foki in Runenkunst, 53 Stoff in Handwerk). Es gibt keinen Stoff-Skill; Stoff ist ein Nebenzweig von „Handwerk" (leatherworking), demselben Skill, der Leder und Bögen baut. Platte-Sets haben 9 Teile (7 + 2 Schilde) und Set-Boni bis str 16 / con 17 / lck 7 + Wucht 5; das Leder-Endset gibt dex 1 / con 2 / lck 6, das Stoff-Endset int 6 / wis 3 / lck 3.
3. **Die Kraft folgt der Menge: Fernkampf-BiS liegt 13–39 % unter Nahkampf, Magie 8–21 %.** DPS-Schätzer der Balance-Hülle (damage-Build, alle Buffs) gegen den Band-Boss: CL 20 Fernkampf 0,61 des Nahkampfs, CL 40 0,87, CL 60 0,71, CL 80 0,76, CL 99 vs Götzenwächter 0,65 (Magie 0,81). Gleichzeitig überlebt der Fernkämpfer den Götzenwächter am kürzesten (17,3 s; Nahkampf 22,5 s; Magie 29,4 s): Leder-Ausweichen läuft am Boss in den Boden, Platte-Mitigation nicht. Der Fernkampf-BiS-Bogen ist auf allen fünf Stufen ein Drop, der Nahkampf-BiS auf vier von fünf ein Craft-Teil: die Bogen-Craft-Leiter ist das schwächste Glied.
4. **Runen (Chef-Nachtrag):** In der Anzahl sind Waffen-Runen symmetrisch (je Stil 2 exklusive Affixe: Stat-Rune I–III + Tier-IV-Rune) und Rüstungs-Tier-IV 1:1:1. Aber (a) die Fernkampf-Stat-Rune „Jägerisch" gibt lck 2 / dex 1+lck 3 / lck 4 gegen str 3/6/10 („Scharf") und int 3/6/10 („Arkan") — nach der Itemization-2-Äquivalenz ein Drittel des Werts, und sie kommt 13 Runenkunst-Level später (28/40/74 gegen 15/38/62); (b) der Schild ist ein vierter Runen-Träger, den nur Nahkampf hat (Ägis/Bollwerk/Eiserne Antwort/Ungebrochene Mauer), Fernkampf hat keine Nebenhand und damit bis zu 4 Runenslots weniger als beide anderen Stile; (c) die Tier-IV-Waffenrunen sind gegen Bosse +23 % (Kriegspfad) / +12 % (Zweiter Pfeil) / +8 % (Dünner Schleier) wert; (d) „Auszehrend" (+35 % eigene DoT-Ticks) hat für Fernkampf fast keine Quelle (3 Blutungs-, 2 Brand-Bögen gegen 22 Blutungs-Nahkampfwaffen und 23 Brand-Stäbe); (e) die Bewahrende-Rune III trägt am Endgame 31 % des Stoff-Ward-Kits, Ägis III 53 % des Platten-Kits, Ausweichend III 59 % des Leder-Kits.
5. **Plan:** (a) 1.1.x, content-only, kein Save-Bump: 45 Spiegel-Uniques (16 Waffen, 2 Foki, 11 Leder, 16 Stoff) an Monstern, die heute nur Nahkampf droppen, plus Jäger-Rune/Bewahrende-Rune-Werte, Stat-Runen-Level, 2 Tonika, 1 Suffix-Tausch, 1 Magie-Tempo-Suffix — 47 Bilder für Mira. (b) 1.2.0 „Alive": eigene Chase-Linien je Stil und Zone, Waffentypen 10:2:2 → 10:4:4, Stoff-Tiefe (eigener Skill oder Handwerk-Ausbau, Chef-Entscheid), Zweihand-Runenslot, Slayer-Rüstung in drei Klassen, Sim-Stil-Parität. (c) Sieben Wächter-Regeln, die Parität je Band erzwingen (Drop-Floor je Stil, Craft-Sprosse je Klasse je Slot, Effekt-Spiegel, Runen-Spiegel, Support-Spiegel, Kraft-Hülle je Band, Sim-Report).

---

## 1. Zählmatrix

### 1.1 Waffen (Haupthand) je Band × Stil × Quelle

| Band | Stil | craft | Shop | Drop Welt | Turm | Dungeon | Elite | drop-only Σ | davon Chase (≤0,1 % / Elite) | gesamt |
|---|---|---|---|---|---|---|---|---|---|---|
| 1–20 | Nahkampf | 30 | 1 | 5 | 2 | 0 | 2 | **8** | 2 | 39 |
| 1–20 | Fernkampf | 6 | 2 | 1 | 0 | 0 | 0 | **1** | 1 | 9 |
| 1–20 | Magie | 6 | 2 | 1 | 0 | 0 | 1 | **2** | 1 | 10 |
| 20–40 | Nahkampf | 22 | 0 | 3 | 1 | 0 | 0 | **3** | 1 | 25 |
| 20–40 | Fernkampf | 4 | 0 | 2 | 2 | 0 | 0 | **3** | 2 | 7 |
| 20–40 | Magie | 5 | 0 | 1 | 1 | 1 | 0 | **2** | 0 | 7 |
| 40–60 | Nahkampf | 20 | 0 | 11 | 3 | 1 | 2 | **15** | 7 | 35 |
| 40–60 | Fernkampf | 4 | 0 | 3 | 0 | 0 | 0 | **3** | 3 | 7 |
| 40–60 | Magie | 6 | 0 | 6 | 0 | 0 | 0 | **6** | 2 | 12 |
| 60–80 | Nahkampf | 21 | 0 | 3 | 3 | 1 | 1 | **7** | 3 | 28 |
| 60–80 | Fernkampf | 4 | 0 | 1 | 1 | 0 | 0 | **1** | 1 | 5 |
| 60–80 | Magie | 5 | 0 | 3 | 1 | 0 | 1 | **5** | 4 | 10 |
| 80–99 | Nahkampf | 30 | 0 | 11 | 1 | 4 | 1 | **16** | 11 | 46 |
| 80–99 | Fernkampf | 6 | 0 | 7 | 2 | 2 | 2 | **13** | 8 | 19 |
| 80–99 | Magie | 7 | 0 | 2 | 0 | 3 | 0 | **5** | 2 | 12 |
| **Σ** | **Nahkampf** | **123** | 1 | 33 | 10 | 6 | 6 | **49** | 24 | 173 |
| **Σ** | **Fernkampf** | **24** | 2 | 14 | 5 | 2 | 2 | **21** | 15 | 47 |
| **Σ** | **Magie** | **29** | 2 | 13 | 2 | 4 | 2 | **20** | 9 | 51 |

Waffentypen: Nahkampf 10 (Dolch, Schwert, Krummsäbel, Streitkolben, Axt, Kriegsaxt, Speer, Großaxt, Großschwert, Hammer — jede mit eigener Spezialität und eigener 12-Stufen-Leiter), Fernkampf 2 (Kurzbogen, Langbogen), Magie 2 + Nebenhand (Stab, Zauberstab; Szepter existiert als Typ, aber nur 2 Craft-Einzelstücke; Fokus). Jede Nahkampf-Craft-Stufe hat 10 Waffen, jede Fernkampf-/Magie-Stufe 2.

### 1.2 Nebenhand (Schild = Nahkampf, Fokus = Magie; Fernkampf hat per Chef-Entscheid 23.08. keine — alle Bögen sind zweihändig)

| Band | Schild craft | Schild drop-only | Fokus craft | Fokus drop-only |
|---|---|---|---|---|
| 1–20 | 7 | 2 | 4 | 2 (stormcaller_totem, ashtongue_fetish/Elite) |
| 20–40 | 6 | 2 | 3 | 0 |
| 40–60 | 5 | 4 | 3 | 1 (briarbound_conduit) |
| 60–80 | 4 | 1 | 3 | 0 |
| 80–99 | 7 | 3 | 4 | 3 (tidecaller_focus, beastcaller_totem, furnaceheart_core/Elite) |
| Σ | 29 | 12 | 17 | 6 |

### 1.3 Rüstung je Klasse × Band (craft / drop-only / gesamt, 5 Slots)

| Band | Platte | Leder | Stoff |
|---|---|---|---|
| 1–20 | 22 / 6 / 28 | 14 / 3 / 17 | 8 / **0** / 8 |
| 20–40 | 15 / 6 / 21 | 10 / **0** / 10 | 10 / **0** / 10 |
| 40–60 | 15 / **17** / 32 | 11 / 5 / 16 | 10 / 1 (Elite) / 11 |
| 60–80 | 15 / 4 / 19 | 10 / 1 / 11 | 10 / 1 (Elite) / 11 |
| 80–99 | 22 / 15 / 37 | 20 / 6 / 26 | 15 / 2 (Elite) / 17 |
| **Σ** | **89 / 48 / 137** | **65 / 15 / 80** | **53 / 4 / 57** |

Drop-Rüstung je Slot (drop-only, nur Welt/Turm/Dungeon, ohne Elite): Platte Helm 10 / Körper 9 / Beine 9 / Hände 10 / Füße 8; Leder Helm 3 / Körper 5 / Beine 2 / Hände 1 / Füße 2 — davon drei Leder-Teile mit R50 an Monstern L138–208 (tidewalker_boots, stormhide_helm, skygrip_gauntlets an tide_siren/roc_hunter), im Band also nicht erreichbar; Stoff 0 / 0 / 0 / 0 / 0. Stoff-Drops im Spiel: thorncrown (R45), pyrebound_vestment (R70), tideterror_grip (R88), rimebound_leggings (R92) — alle Elite-Signaturen mit 15-Minuten-Fenster.

Craft-Sprossen je Klasse (Req-Level, Körper-Slot): Platte 1/5/10/20/25/30/40/50/60/70/80/90/99 (13, je zwei Varianten Platte/Kette), Leder 0/5/10/20/22/40/50/62/70/82/90/95/99 (13), Stoff 1/10/22/30/40/55/64/70/85/92/99 (11; Beine und Hände ohne L10-Sprosse: 1→22 = 21 Level Lücke, vom G3-Wächter nicht gesehen, weil er nur den Körper-Slot prüft).

### 1.4 Drop-only-Uniques je Band × Stil (Waffe + Nebenhand + Rüstung + Stil-Schmuck)

| Band | Nahkampf | Fernkampf | Magie | neutral / gemischt (Schmuck) |
|---|---|---|---|---|
| 1–20 | **25** (8 W, 2 N, 6 R, 9 S) | 4 (1 W, 3 R) | 9 (2 W, 2 N, 5 S) | 7 / 13 |
| 20–40 | **11** (3 W, 2 N, 6 R) | 4 (3 W, 1 S) | 3 (2 W, 1 S) | 0 / 0 |
| 40–60 | **36** (15 W, 4 N, 17 R) | 9 (3 W, 5 R, 1 S) | 8 (6 W, 1 N, 1 R) | 0 / 0 |
| 60–80 | **12** (7 W, 1 N, 4 R) | 3 (1 W, 1 R, 1 S) | 6 (5 W, 1 R) | 0 / 0 |
| 80–99 | **36** (16 W, 3 N, 15 R, 2 S) | 19 (13 W, 6 R) | 10 (5 W, 3 N, 2 R) | 0 / 0 |
| **Σ** | **120** | **39** | **36** | 7 / 13 |

Alle Drop-only-Uniques tragen seit Rezension #8 einen Effekt. Chase-Anteil (≤0,1 % oder Elite): Nahkampf 65, Fernkampf 25, Magie 24.

**Effekt-Kinds auf Drop-only-Ausrüstung (Nahkampf / Fernkampf / Magie):** giantSlayer **13/0/0**, vengeance **12/0/0**, execute **6/0/0**, healOnKill **16/1/1**, desperation **10/2/0**, bleed **21/3/0**, cooldownOnKill 7/6/0, firstStrike 4/2/0, firstBlood 2/5/0, momentum 2/2/0, everyNth 3/0/0, packLeader 3/0/0, plaguebearer 2/0/0, overkillCarry 1/0/0, thorns 1/0/0, antiRegen 9/0/4, burn 6/2/7, frost 0/3/4, frostbite 0/2/4, shock 1/2/4, poison 3/0/2, eagleEye 0/11/0, bounty 3/1/0, lootChance 0/2/0, manaOnKill 1/0/6, manaDrain 0/0/2, surplus 0/0/5, catalyst 1/1/3, wardSiphon 1/0/1, gutter 2/0/2, critBurst 2/0/1. Fünf stil-neutrale Kinds (giantSlayer, vengeance, execute, everyNth, packLeader) sitzen auf 37 Nahkampf-Teilen und auf keinem einzigen Fern-/Magie-Teil.

Elite-Uniques (28): Nahkampf 11, Fernkampf **4**, Magie 11, neutral/gemischt 2. Dungeon-Truhen (22 Ausrüstungszeilen): Nahkampf/gemischt 15, Fernkampf 5, Magie 2.

### 1.5 Runen (Verzauberungen) — Chef-Nachtrag

Bestand: 26 Affixe, 50 Runen-Items (12 Affixe × Tier I–III = 36, 14 Tier-IV-Runen). Legalität = `appliesTo ∩ itemTypeTags(item)` + `requiresTrinity`-Gate; seit 25.08. stapeln Stat-Runen, Aktiv-Effekt-Runen nicht.

| Gruppe | Affix | appliesTo | Tiers / Runenkunst-Level | Wert je Tier | Nur für |
|---|---|---|---|---|---|
| Stat Waffe | affix_keen (Scharf) | weapon_melee | I–III @ **15 / 38 / 62** | str **3 / 6 / 10** | Nahkampf |
| Stat Waffe | affix_hunter (Jägerisch) | weapon_ranged | I–III @ **28 / 40 / 74** | **lck 2 / dex 1+lck 3 / lck 4** | Fernkampf |
| Stat Waffe | affix_arcane (Arkan) | weapon_magic | I–III @ **30 / 42 / 75** | int **3 / 6 / 10** | Magie |
| Stat Waffe | affix_precise / affix_swift | any_weapon | 22/45/70 · 25/48/72 | lck 2/4/6 · dex 1/2/3 | alle |
| Proc Waffe | affix_flame / affix_frost / affix_shock | any_weapon | 18/40/65 · 20/42/68 · 20/42/68 | burn 3/6/10 · frost · shock 0,15–0,30 | alle |
| Tier IV Waffe | affix_warpath (Kriegspfad) | weapon_melee | IV @ 85 | momentum 12 × 2 % | Nahkampf |
| Tier IV Waffe | affix_second_arrow (Zweiter Pfeil) | weapon_ranged | IV @ 85 | doubleStrike 12 % | Fernkampf |
| Tier IV Waffe | affix_thin_veil (Dünner Schleier) | weapon_magic | IV @ 85 | surplus 20 % ab 80 % Mana | Magie |
| Tier IV Waffe | affix_wasting (Auszehrend) / affix_judgement (Richtend) | any_weapon | 89 / 92 | gutter 35 % · execute 30 % <25 % HP | alle (Auszehrend nur mit DoT-Quelle) |
| Stat Rüstung | affix_aegis / affix_evasion / affix_warding | armor (kein Trinity-Gate) | 16/39/63 · 19/44/67 · 23/49/73 | AR 6/12/20 · EV 5/10/16 · Ward 12/25/40 | alle Klassen |
| Stat Schild | affix_bulwark (Bollwerk) | shield | 27/53/79 | block 3/5/8 % | **nur Nahkampf-Nebenhand** |
| Tier IV Rüstung | iron_answer / ambush / veil_drinker | armor + requiresTrinity AR / EV / Ward | 87 / 87 / 87 | thorns 2,5 · firstStrike · wardSiphon 10 % | Platte / Leder / Stoff |
| Tier IV Schild | affix_unbroken_wall | shield + blockChance | 91 | blockRestore 2 % | **nur Nahkampf-Nebenhand** |
| Tier IV Schmuck | bounty / tallyman / restless / chronicle / gleaning | jewelry | 88–95 | Idle-Rider | alle |

**Legale Affixe je Kit-Teil (Endgame-Craft, Tier-Max):** Nahkampfwaffe 9, Bogen 9, Stab 9, Fokus 9 (Waffen-Runen), Schild 4, Platte-/Leder-/Stoff-Teil je 2, Schmuck je 5. **Je Voll-Kit:** Nahkampf 43 Affix-Optionen auf 12 Teilen, Fernkampf **39 auf 11 Teilen**, Magie 48 auf 12 Teilen. Runen-SLOTS (Rarity-abhängig, legendär 4/Teil): Nahkampf 48, Fernkampf **44**, Magie 48.

**Bewertung:**
1. **Jägerisch ist ein Drittel-Wert.** Itemization-2 §5.1: 1 str = 0,30 Roh (+1,2 % Nahkampf-DPS), 1 int = 0,34 Roh, 1 lck ≈ +1,0 % DPS, 1 dex ≈ 0,85 Roh-Äquivalent (Schaden + Tempo + Krit + Treffsicherheit). Scharf III = 10 str ≈ +12 % DPS; Arkan III = 10 int ≈ +12 %; Jägerisch III = 4 lck ≈ **+4 %**. Gestapelt auf 4 Slots: +48 % gegen +16 %. Dazu bekommt Nahkampf seine Stat-Rune bei Runenkunst 15, Fernkampf bei 28, Magie bei 30.
2. **Der Schild ist ein vierter Runen-Träger nur für Nahkampf** (Ägis I–III, Bollwerk I–III, Eiserne Antwort, Ungebrochene Mauer = 4 Affixe, bis zu 4 Slots). Magie bekommt über den Fokus 9 Waffen-Affixe (inkl. Arkan ein zweites Mal). Fernkampf: nichts — strukturelle Folge der Zweihand-Regel.
3. **Tier IV gegen Bosse: Kriegspfad +23 %, Zweiter Pfeil +12 %, Dünner Schleier +8 %** (design/runen-tier-iv.html §7.3, eigene Tabelle). Bewusst als „Boss-Runen" gebaut, aber die Boss-Wirkung ist 3:1,5:1.
4. **Auszehrend nützt Fernkampf kaum.** Eigene DoT-Quellen: Nahkampf 22 Blutungs-Waffen (+3 Gift), Magie 23 Brand-Stäbe (+9 Frost, +2 Gift), Fernkampf 3 Blutung + 2 Brand. Ohne Flammen-Rune ist die Rune für Bögen wertlos.
5. **Bewahrende (Ward) skaliert relativ am schlechtesten.** T3 × 5 Slots gegen das Craft-Kit: Platte 100 AR / 187,5 = **53 %**, Leder 80 EV / 135 = **59 %**, Stoff 200 Ward / 640 = **31 %** (bei L40 noch 93 / 129 / 145 %).
6. Symmetrisch und in Ordnung: Proc-Runen (Flamme/Frost/Sturm) auf allen Waffen; Rüstungs-Stat-Runen ohne Klassen-Gate (jede Klasse kann jede der drei tragen); Rüstungs-Tier-IV 1:1:1; Schmuck-Linie stilneutral. Es gibt keine Rune, die auf Fern- oder Magie-Waffen passt, aber nicht auf Nahkampfwaffen — und umgekehrt genau eine Familie (Schild-Runen), die nur Nahkampf nutzen kann.

### 1.6 Suffixe je Klasse (Pool des Endgame-Craft-Teils; Σw = Summe der Gewichte)

| Teil | Pool | Σw | Suffixe |
|---|---|---|---|
| Nahkampfwaffe | **9** | 521 | bear, bull, wolf (Tempo), berserker (critDamage), carnage (critChance), tiger, fox, eagle, executioner |
| Bogen | 8 | 456 | tiger, hawk, viper (Tempo), lynx, phantom (critChance), fox, eagle, executioner |
| Stab / Fokus | **7** | 396 | magus, owl, sage, oracle, warlock (critChance), fox, executioner — **kein Tempo-Suffix, kein eagle** |
| Platte-Körper | 5 | 335 | bear, boar, tortoise, colossus, phoenix |
| Leder-Körper | 8 | 430 | tiger, lynx, phantom, boar, tortoise, sentinel, colossus, phoenix |
| Stoff-Körper | 7 | 455 | owl, sage, oracle, boar, tortoise, colossus, phoenix |
| Schmuck | 14 | 855 | bear, tiger, owl, sage, oracle, boar, tortoise, colossus, phoenix, duelist (attack), brute (power), sniper (ranged), archon (magic), **bulwark (defence — toter Boost, Chef-Entscheid E1 25.08.: skillBoost.defence speist keinen Kampfterm)** |

Schmuck: Nahkampf 2 lebende Skill-Suffixe (duelist, brute) + 1 toter (bulwark, w 40 = 4,7 % jeder Schmuck-Rolle ist ein Blindroll), Fernkampf 1, Magie 1. Nach #14 (Klassen-Trennung) sind die Rüstungspools sauber; die Magie-Waffe hat als einzige keinen Tempo- und keinen Krit-Chance+Tempo-Suffix.

### 1.7 Speisen und Tränke mit Stil-Bezug (Skill-Level der Herstellung)

| Art | Nahkampf | Fernkampf | Magie |
|---|---|---|---|
| Trinity-Tonikum (Kräuterkunde) | Steinhaut **16** (AR 35), Bollwerk 40 (Block 10 %) | Scharfauge **26** (EV 20) | Schutz-Elixier **72** (Ward 80) |
| Attribut-Tonikum | Blutrausch **38** (str 6) | **keins** | Arkan-Surge **52** (int 6, Mana) |
| Stil-Speisen (Kochen) | 38 / 58 / 75 / 86 | 48 / 63 / 76 / 93 | 52 / 65 / 77 / 90 |
| Σ stilgebundene Buff-Items | **7** | **5** | **6** |

Neutral (28 Items: Tempo-/Krit-Tonika, Regeneration, Slayer-Tränke) sind stilfrei. Token-Shop: je Regal ein Gericht je Stil — symmetrisch. Nahkampf bekommt sein erstes Stil-Gericht 10–14 Level früher als die anderen beiden.

### 1.8 Slayer-Shop / Token-Shop

Slayer-Shop-Ausrüstung: Slayer-Helm (Platte, AR 24,4, bounty), Slayer-Beinschienen (Platte, AR 21,8, giantSlayer), Slayer-Armschienen (Leder, EV 11,8, healOnKill), Amulett/Umhang gemischt. **Platte 2 / Leder 1 / Stoff 0.** Tränke stilneutral. Token-Shop: 12 Stil-Konsumgüter, exakt 4 je Stil — symmetrisch (Referenz-Design für alles andere).

### 1.9 Sets und Attribut-Summen der Craft-Kits (5 Rüstungsslots + Set-Bonus)

| Stufe | Platte (Teile Σ + Set) | Leder (Teile Σ + Set) | Stoff (Teile Σ + Set) |
|---|---|---|---|
| R20/22 | str 14 con 19 + str 2 con 2, Wucht 1 | con 11 + con 1 | int 6 con 7 + int 1, Magie 1 |
| R40 | str 24 con 23 + str 2 con 3 lck 1, Wucht 2 | dex 5 con 16 + dex 1 con 2, Fernkampf 1 | int 16 wis 4 con 13 + int 4 wis 1 lck 1, Magie 2 |
| R60/62 | str 33 con 30 + str 5 con 6 lck 3, Wucht 3 | dex 5 con 23 + dex 1 con 1 lck 1, Fernkampf 2 | int 24 wis 5 con 16 + int 5 wis 1 lck 1, Magie 3 |
| R80–85 | str 47 con 44 + str 8 con 10 lck 5, Wucht 4 | dex 7 con 32 + dex 1 con 1 lck 1, Fernkampf 3 | int 37 wis 16 con 23 + int 5 wis 3 lck 2, Magie 4 |
| R99 | **str 75 con 61 + str 16 con 17 lck 7, Wucht 5** | **dex 11 con 42 + dex 1 con 2 lck 6, Fernkampf 5** | **int 48 wis 22 con 29 + int 6 wis 3 lck 3, Magie 5** |

Offensiv-Attribut aus dem Rüstungs-Kit am Endgame: Nahkampf **91 str** (≈ 27 Roh), Fernkampf **12 dex** (≈ 10 Roh-Äquivalent nach §5.1-Rate), Magie **54 int** (≈ 18 Roh). Itemization-2 §3 hat das so entschieden („Leder dex 12 / con 33; eva→dex hätte Ranged-DPS +80 % inflationiert") — mit der heutigen Krit-/Tempo-Deckelung (beide binden ab CL 60, Hülle §3) ist der Rider-Discount aber überholt: dex über dem Deckel zahlt nur noch 0,24 Roh, also weniger als str.

### 1.10 Handwerk: Rezepte, Tiefe, Material-Gates

| Skill | Ausrüstungs-Rezepte | Nahkampf | Fernkampf | Magie | Level-Spanne |
|---|---|---|---|---|---|
| Schmieden | **235** (261 gesamt) | 123 Waffen, 87 Platte, 25 Schilde | 0 | 0 | 1–99 |
| Handwerk (leatherworking) | 156 (172) | 2 Platte-Sonderteile, 4 Holzschilde | 24 Bögen, 65 Leder | 53 Stoff | 1–99 |
| Runenkunst | 46 (116) | 0 | 0 | 29 Stäbe/Zauberstäbe, 17 Foki | 1–99 |
| Juwelierskunst | 27 (36) | 7 | 5 | 4 | 1–99 |
| **Σ je Stil** | | **248** | **94** | **103** | |

Material-Kampf-Gates (G1-Replik, craftbare Ausrüstung ohne Schmuck): nach den Audit-Fixes F1–F7 vom Juli sind die Deltas über dem eigenen Requirement fast überall ≤ 10 Level. Rest-Ausreißer: Fernkampf 80–99 (shadowhide_*/voidhide_* ← raw_shadowhide nur von idol_warden/aether_wraith, Gate 245 — Stoff hat für dieselbe Stufe den Götzensplitter aus der Sanktum-Truhe bei Gate 95), Slayer-Craft-Rezepte (bekannt, §7.2 Slayer-Doc), chitin_coif, frost_pelt_hood. Der Anteil „irgendwie kampf-gegatet" je Band: Nahkampf 2–5 %, Fernkampf 29–100 % (meist trivial: Bogensehne ← Kuh L5), Magie 0–100 % (Frost-/Glut-/Leeren-Essenz, band-fair). **Der Material-Zugang ist seit Juli repariert; das Problem ist nicht mehr das Gate, sondern was am Ende der Kette herauskommt.**

---

## 2. Qualität: BiS-Kraft und TTK je Band

Methode: `buildBisCharacter(content, stil, CL, "damage", { allBuffs: true })` (stat-maximaler legaler Build inkl. Suffix-Max, gestapelter Runen, bester Buffs, Pet) → `computeStats` → TTK-Formel aus `balance-envelope.test.ts` §5 (Trefferchance-Contest, Mitigation, Krit, Ward-Bruch; **ohne** Procs/Effekte, Stances, Essen-Heilung). Gleiche Formel wie die gepinnte Matrix; die §5-Pins (CL 90) reproduzieren sich: Nahkampf 56,9 / Fernkampf 87,2 / Magie 74,0 s gegen den Götzenwächter.

| CL | Boss | DPS Nahkampf | DPS Fernkampf | DPS Magie | Fern/Nah | Magie/Nah | Überleben Nah / Fern / Magie (s) |
|---|---|---|---|---|---|---|---|
| 20 | goblin_warlock L30 | 19,3 | 11,7 | 19,4 | **0,61** | 1,01 | 86 / 97 / 46 |
| 40 | ash_tyrant L45 | 25,4 | 22,2 | 24,5 | 0,87 | 0,96 | 91 / 117 / 66 |
| 60 | forest_warden L65 | 28,6 | 20,4 | 25,7 | **0,71** | 0,90 | 78 / 84 / 56 |
| 80 | skeleton_nekro L90 | 34,0 | 25,9 | 31,2 | **0,76** | 0,92 | 73 / 81 / 61 |
| 99 | idol_warden L245 | 39,7 | 25,8 | 32,0 | **0,65** | 0,81 | 22,5 / **17,3** / 29,4 |
| 99 | last_idol L295 | 35,7 | 23,0 | 28,0 | **0,65** | 0,79 | 16,0 / 14,0 / 31,7 |

BiS-Waffe je Stufe (drop-only mit *): CL 20 steel_maul / stolen_shortbow* / warlock_felstaff*; CL 40 mithril_maul / ashfall_recurve* / mire_hexstaff*; CL 60 runite_maul / spectral_hunter_bow* / bramble_witchstaff*; CL 80 colossus_marrowaxe* / driftwood_bow* / choirbound_relic*; CL 99 godiron_maul / skyfather_recurve* / godiron_staff. **Fernkampf hängt auf jeder Stufe an einem Drop, Nahkampf auf vier von fünf Stufen an Schmieden.** Craft-only-Build (ohne jeden Kampf-Drop) erreicht 79–96 % des Voll-Builds bei Nahkampf, 81–98 % bei Fernkampf, 71–94 % bei Magie — die Abhängigkeit von Drops ist ähnlich, aber Fernkampf und Magie fehlen die Drops (§1.4).

Rohe Waffen-Leiter (Schadensmittel je Sekunde, ohne Charakteranteil): R50 Adamantium-Hammer 6,2 · Adamantium-Kurzbogen 2,1 · Adamantium-Stab 1,4; R99 Götteneisen-Hammer 13,4 · -Kurzbogen 5,7 · -Stab 4,7. Fernkampf kompensiert über dex (0,24/Punkt), +6 pp Krit und ×0,90 Tempo; Magie über int (0,34) und Ward — aber beide Kits liefern 12 bzw. 54 Offensiv-Punkte gegen 91 (§1.9).

Deutung: Die Stil-Identität („Fernkampf = Krit + Tempo + Ausweichen, etwas weniger Roh ist in Ordnung") rechtfertigt vielleicht 0,90, nicht 0,65. Am Endgame-Anker ist Fernkampf zugleich der schwächste Angreifer UND der kürzeste Überlebende (Leder-Ausweichen läuft gegen Boss-Treffsicherheit in den Kombiboden, Platte-Mitigation ist unbedingt, Stoff-Ward addiert 670 EHP). Das ist der Kern von „Fernkampf macht keinen Spaß". Magie liegt mit 0,80–1,00 im tolerierbaren Fenster, verliert aber im Frühspiel am meisten Überlebenszeit (46 s gegen 86 s bei CL 20).

---

## 3. Die drei Hauptursachen (mit Zahlen)

**Ursache 1 — Drop-Tabellen sind Nahkampf-Tabellen (Menge).** 120 Nahkampf-Uniques gegen 39 Fernkampf und 36 Magie (3,1 : 1 : 0,9). 46 von 89 Monstern mit Ausrüstungs-Drops droppen NUR Nahkampf; ein Goblin-Armbrustschütze droppt einen Platten-Harnisch und keinen Bogen, ein Goblin-Schamane ein Holzschild und keinen Stab, der Imp gar nichts. Drop-Rüstung Platte 48 / Leder 15 / Stoff 4 (nur Elite). Band 40–60 = 36 / 9 / 8. Fünf stil-neutrale Effekt-Kinds (giantSlayer 13, vengeance 12, execute 6, everyNth 3, packLeader 3) existieren nur auf Nahkampf-Teilen. Die Rare-Drop-Philosophie hat 1.1.0 149 Uniques aufgewertet — aber 65 Nahkampf-Chase gegen 25 / 24.

**Ursache 2 — Handwerkstiefe 10 : 2 : 2.** Schmieden = 235 Ausrüstungsrezepte, alle Nahkampf (10 Waffentypen × 12 Stufen, zwei Rüstungs-Varianten je Stufe, 9-teilige Sets mit Schild). Fernkampf 94 Rezepte (2 Bogentypen), Magie 103 Rezepte über zwei Skills (Stab/Zauberstab/Fokus in Runenkunst, Stoff in Handwerk). Kein Stoff-Skill; Stoff-Beine/-Hände ohne L10-Sprosse. Set-Boni am Endgame: Platte str 16 / con 17 / lck 7, Leder dex 1 / con 2 / lck 6, Stoff int 6 / wis 3 / lck 3; Offensiv-Attribut aus dem Kit 91 / 12 / 54. Slayer-Shop-Rüstung 2 Platte / 1 Leder / 0 Stoff.

**Ursache 3 — Support-Systeme (Runen, Suffixe, Tonika, Speisen) kommen für Nahkampf früher, tiefer, stärker — und die Kraft folgt.** Jäger-Rune = 1/3 der Scharf-/Arkan-Rune, 13 Level später; Schild-Runen (4 Affixe) nur für Nahkampf; Tier-IV-Boss-Wert 23 / 12 / 8 %; Bewahrende III relativ 31 % gegen 53 / 59 %. Steinhaut-Tonikum Kräuterkunde 16, Scharfauge 26, Schutz-Elixier 72; Attribut-Tonikum str 38, int 52, dex nie. Stil-Gerichte Nahkampf 38/58/75/86 gegen 48/63/76/93 und 52/65/77/90. Schmuck-Suffixe 2 lebende + 1 toter Nahkampf-Skill gegen je 1. Ergebnis in der Hülle: Fernkampf-BiS 0,61–0,87 des Nahkampfs, Magie 0,79–1,01; am Götzenwächter überlebt der Fernkämpfer 17 s, der Krieger 22,5 s, der Magier 29 s.

---

## 4. Langzeitplan

### 4a. Sofortmaßnahmen 1.1.x — content-only, kein Save-Bump, keine Engine-Änderung

Alle neuen Item-IDs sind additiv (keine Migration). Neue Drop-Rüstung kommt in `LADDER_EXEMPT_DROP_UNIQUES` (content-integrity) und läuft automatisch durch `drop-gear-beats-craft.test.ts` (Kernwert ≥ nächstes Craft-Tier, Effekt vorhanden, Chance ≤ 15 %, Req ≤ Quell-Level). Pins in `suffix-class-fit.test.ts` (Klassen-Tag-Zählung 178/85/…) werden neu gepinnt.

**Regel für alle Drop-Werte (Rare-Drop-Philosophie, wie #8):** Kernwert = Craft-Gegenstück der NÄCHSTEN Familie desselben Slots (≥ +8 Level über dem eigenen Req; wo die nächste Familie nur 2 Level entfernt liegt — Leder R20→R22, Stoff R50→R55 — die darauffolgende), Requirement = aktuelle Stufe, Effekt aus der bestehenden Palette mit den heutigen Magnituden (giantSlayer 0,15 · vengeance 0,25 · desperation 0,2/th 0,3 · execute 0,25/th 0,2 · healOnKill 2–4 · cooldownOnKill 1000–1500 ms · firstStrike 1 · firstBlood 0,25 · surplus 0,2/th 0,8 · catalyst 1500 ms · wardSiphon 0,08 · manaOnKill 2–4), Chance in der Größenordnung der bestehenden Zeile desselben Monsters, Rarity nach Band (common/rare ≤ 30, superRare 40–70, epic 80+). Requirement-Skill: Bögen/Leder `ranged`, Stäbe/Zauberstäbe/Foki/Stoff `magic`. Bögen `twoHanded: true`, Stäbe `twoHanded: true`, Szepter einhändig.

#### A1 — Spiegel-Uniques: Fernkampf-Waffen (10)

| id | Name EN / DE | Typ | Req | Schaden @ Intervall | mods | Effekt | Quelle (Level) · Chance | value · Rarity |
|---|---|---|---|---|---|---|---|---|
| drovers_shortbow | Drover's Shortbow / Treiber-Kurzbogen | shortbow | ranged 5 | 1,6–2,2 @ 2650 | lck 1 | firstStrike 1 | cow (5) · 0,0023 | 120 · common |
| bullhorn_longbow | Bullhorn Longbow / Stierhorn-Langbogen | longbow | ranged 10 | 2,1–3,1 @ 3000 | lck 1 | giantSlayer 0,15 | bull_boss (15) · 0,0019 | 230 · rare |
| marrow_shortbow | Marrow Shortbow / Knochenmark-Kurzbogen | shortbow | ranged 15 | 2,1–2,9 @ 2650 | lck 1 | healOnKill 2 | hollow_marrow (16, Turm F1) · 0,0044 | 230 · rare |
| crossbower_warbow | Crossbower's Warbow / Kriegsbogen des Armbrustschützen | longbow | ranged 24 | 2,6–4,0 @ 3000 | lck 1 | vengeance 0,25 | goblin_crossbower (24) · 0,0009 | 390 · rare |
| chitin_recurve | Chitin Recurve / Chitin-Recurvebogen | shortbow | ranged 40 | 4,0–5,6 @ 2650 | lck 1 | desperation 0,2 / th 0,3 | pitch_beetle (42) · 0,0010 | 900 · superRare |
| mossbound_longbow | Mossbound Longbow / Moosgebundener Langbogen | longbow | ranged 50 | 5,0–7,6 @ 3000 | lck 2 | execute 0,25 / th 0,2 | moss_golem (56) · 0,0009 | 1200 · superRare |
| emberglass_shortbow | Emberglass Shortbow / Glutglas-Kurzbogen | shortbow | ranged 50 | 5,0–6,9 @ 2650 | lck 2 | giantSlayer 0,15 | tower_ember_elemental (50, F3) + ember_elemental (168) · 0,00093 | 1200 · superRare |
| colossus_ribbow | Colossus Ribbow / Kolossrippen-Bogen | shortbow | ranged 68 | 6,3–8,8 @ 2650 | lck 2 | giantSlayer 0,15 | bone_colossus (76, F4) · 0,0015 | 1500 · superRare |
| bonewrought_longbow | Bonewrought Longbow / Knochengeschmiedeter Langbogen | longbow | ranged 70 | 7,8–11,8 @ 3000 | dex 1, lck 1 | firstBlood 0,25 | skeleton_spearman (71) · 0,0005 | 1900 · superRare |
| butchers_hookbow | Butcher's Hookbow / Hakenbogen des Fleischhauers | shortbow | ranged 70 | 7,8–10,8 @ 2650 | lck 2 | healOnKill 4 | skeleton_butcher (75) · 0,0008 | 1900 · superRare |

#### A2 — Spiegel-Uniques: Magie-Waffen (6) und Foki (2)

| id | Name EN / DE | Typ | Req | Schaden @ Intervall · Mana | mods | Effekt | Quelle (Level) · Chance | value · Rarity |
|---|---|---|---|---|---|---|---|---|
| impfire_wand | Impfire Wand / Impfeuer-Zauberstab | wand | magic 10 | 1,3–1,6 @ 2700 · 5 | — | burn 0,2 / 2 / 3000 | the_imp (11) · 0,003 | 230 · rare |
| shaman_gnarlstaff | Shaman's Gnarlstaff / Knorrenstab des Schamanen | staff (2H) | magic 15 | 1,7–2,6 @ 3000 · 6 | — | giantSlayer 0,15 | goblin_shaman (18) · 0,004 | 230 · rare |
| felmagician_rod | Felmagician's Rod / Rute des Felmagiers | scepter (1H) | magic 25 | 2,1–3,2 @ 3000 · 7 (Szepter liegt auf der Stab-Kurve, #287) | — | execute 0,25 / th 0,2 | goblin_felmagician (27) · 0,0012 | 390 · rare |
| stalker_bonewand | Stalker's Bonewand / Knochenstab des Pirschers | wand | magic 30 | 2,0–2,6 @ 2700 · 6 | — | desperation 0,2 / th 0,3 | bone_stalker (34, F2) · 0,0013 | 530 · rare |
| drowned_choirstaff | Drowned Choirstaff / Chorstab der Ertrunkenen | staff (2H) | magic 80 | 8,1–12,2 @ 2730 · 8 | int 1 | execute 0,25 / th 0,2 | reef_drowned (128) · 0,0005 | 2500 · epic |
| sentinel_core_wand | Sentinel Core Wand / Wächterkern-Zauberstab | wand | magic 90 | 7,9–9,9 @ 2580 · 7 | — | vengeance 0,25 | iron_sentinel (90) · 0,0012 | 3600 · epic |
| felglass_orb | Felglass Orb / Felglas-Kugel | focus (offhand) | magic 30 | — | int 2, wis 3, lck 1 | catalyst 1500 ms | ashfield_wraith (38, F2) · 0,0012 | 640 · rare |
| dreadfang_fetish | Dreadfang Fetish / Schreckenszahn-Fetisch | focus (offhand) | magic 60 | — | int 3, wis 5, lck 2 | wardSiphon 0,08 | dreadfang (62, F4) · 0,0006 | 2700 · superRare |

#### A3 — Spiegel-Uniques: Leder-Rüstung (11)

| id | Name EN / DE | Slot | Req | evasionRating | mods | Effekt | Quelle (Level) · Chance | value · Rarity |
|---|---|---|---|---|---|---|---|---|
| goat_hide_jerkin | Goat-Hide Jerkin / Ziegenleder-Wams | body | ranged 10 | 13,5 | con 2 | firstBlood 0,25 | feral_goat (12) · 0,0018 | 260 · common |
| rogue_hide_vambraces | Rogue's Hide Vambraces / Armschienen des Halunken | gloves | ranged 10 | 6,3 | con 2 | firstStrike 1 | goblin_rogue + tower_goblin_rogue (19) · 0,0023 | 130 · common |
| skirmisher_hide_jerkin | Skirmisher's Jerkin / Plänkler-Lederwams | body | ranged 20 | 18,6 | dex 1, con 4 | vengeance 0,25 | goblin_spearman (20) · 0,0008 | 720 · rare |
| butchers_hide_boots | Butcher's Hide Boots / Lederstiefel des Schlächters | boots | ranged 20 | 7,3 | con 3 | giantSlayer 0,15 | goblin_butcher (26) · 0,0009 | 150 · rare |
| ratpelt_cap | Ratpelt Cap / Rattenfell-Kappe | helmet | ranged 30 | 12,4 | dex 1, con 3 | desperation 0,2 / th 0,3 | ash_rat (30) · 0,0014 | 450 · rare |
| chitinweave_leggings | Chitinweave Leggings / Chitingeflecht-Beinlinge | legs | ranged 40 | 16,1 | dex 1, con 3 | giantSlayer 0,15 | pitch_beetle (42) · 0,0010 | 750 · superRare |
| thornwolf_pelt_hood | Thornwolf Pelt Hood / Dornenwolf-Fellkapuze | helmet | ranged 50 | 16,8 | dex 1, con 4 | healOnKill 4 | thorn_wolf (54) · 0,0009 | 1100 · superRare |
| mossbound_treads | Mossbound Treads / Moosgebundene Tritte | boots | ranged 50 | 11,8 | dex 1, con 5 | cooldownOnKill 1500 | moss_golem (56) · 0,0010 | 800 · superRare |
| cryptstalker_vambraces | Cryptstalker Vambraces / Gruftpirscher-Armschienen | gloves | ranged 60 | 13,3 | dex 1, con 5 | desperation 0,2 / th 0,3 | skeleton_warrior + tower_skeleton_warrior (65/36) · 0,0010 | 1150 · superRare |
| butchers_hide_leggings | Butcher's Hide Leggings / Lederbeinlinge des Fleischhauers | legs | ranged 70 | 23,6 | dex 2, con 6 | giantSlayer 0,15 | skeleton_butcher (75) · 0,0008 | 5300 · superRare |
| roc_feather_cap | Roc-Feather Cap / Rochfeder-Kappe | helmet | ranged 90 | 25,3 | dex 2, con 6 | vengeance 0,25 | roc (200) · 0,0005 | 7000 · epic |

#### A4 — Spiegel-Uniques: Stoff-Rüstung (16) — die ersten Stoff-Drops von normalen Monstern überhaupt

| id | Name EN / DE | Slot | Req | wardCapacity | mods | Effekt | Quelle (Level) · Chance | value · Rarity |
|---|---|---|---|---|---|---|---|---|
| shamans_cowl | Shaman's Cowl / Schamanen-Kapuze | helmet | magic 10 | 15,0 | con 1, int 1 | manaOnKill 2 | goblin_shaman (18) · 0,004 | 400 · rare |
| imp_hide_slippers | Imp-Hide Slippers / Impleder-Schlappen | boots | magic 10 | 10,5 | con 1, int 1 | cooldownOnKill 1000 | the_imp (11) · 0,003 | 470 · rare |
| goblin_ragged_robe | Ragged Goblin Robe / Zerlumpte Goblinrobe | body | magic 10 | 22,5 | con 2, int 2 | desperation 0,2 / th 0,3 | goblin + tower_goblin (15) · 0,0016 | 600 · rare |
| felmagician_robe | Felmagician's Robe / Robe des Felmagiers | body | magic 22 | 30,9 | con 3, int 3, wis 1 | vengeance 0,25 | goblin_felmagician (27) · 0,0008 | 1250 · rare |
| stormcaller_sandals | Stormcaller Sandals / Sturmrufer-Sandalen | boots | magic 22 | 14,4 | con 2, int 1 | cooldownOnKill 1000 | goblin_stormcaller (28) · 0,0009 | 490 · rare |
| warlock_handwraps | Warlock's Handwraps / Handwickel des Hexers | gloves | magic 30 | 19,3 | con 2, int 2, wis 1 | desperation 0,2 / th 0,3 | goblin_warlock (30) · 0,0010 | 1250 · rare |
| ashtyrant_cinder_robe | Ash Tyrant's Cinder Robe / Aschenrobe des Aschtyrannen | body | magic 40 | 64,8 | con 4, int 6, wis 2 | vengeance 0,25 | ash_tyrant (45) · 0,0016 | 2200 · superRare |
| emberweave_cowl | Emberweave Cowl / Glutgewebe-Kapuze | helmet | magic 50 | 43,2 | con 3, int 3, wis 1 | healOnKill 4 | tower_ember_elemental (50, F3) + ember_elemental (168) · 0,0009 | 1450 · superRare |
| chanters_skirt | Chanter's Skirt / Rock des Grabsängers | legs | magic 50 | 47,5 | con 3, int 4, wis 1 | giantSlayer 0,15 | barrow_chanter (55) · 0,0010 | 1900 · superRare |
| rootling_sap_sandals | Rootling-Sap Sandals / Wurzelsaft-Sandalen | boots | magic 50 | 30,2 | con 3, int 3 | cooldownOnKill 1500 | rootling_gimp2 (51) · 0,0010 | 1700 · superRare |
| treemonster_bark_sandals | Bark Sandals of the Treemonster / Rindensandalen des Baumungetüms | boots | magic 60 | 47,0 | con 4, int 5 | cooldownOnKill 1500 | rootling_treemonster (62) · 0,0011 | 2730 · superRare |
| gravechant_vestment | Gravechant Vestment / Grabgesang-Gewand | body | magic 70 | 142,8 | con 6, int 10, wis 5, lck 2 | vengeance 0,25 | skeleton_spearman (71) · 0,0007 | 8600 · superRare |
| hexed_bone_gloves | Hexed Bone Gloves / Verhexte Knochenhandschuhe | gloves | magic 70 | 66,7 | con 4, int 7, wis 3 | execute 0,25 / th 0,2 | skeleton_butcher (75) · 0,0008 | 5600 · superRare |
| drowned_choir_mitre | Drowned Choir Mitre / Mitra des Ertrunkenenchors | helmet | magic 80 | 95,2 | con 4, int 7, wis 4, lck 1 | healOnKill 4 | reef_drowned (128) · 0,0006 | 4550 · epic |
| emberheart_robe | Emberheart Robe / Glutherz-Robe | body | magic 90 | 192,0 | con 8, int 13, wis 7, lck 2 | surplus 0,2 / th 0,8 | ember_elemental (168) · 0,0009 | 12600 · epic |
| hexer_frostweave_gloves | Hexer's Frostweave Gloves / Frostgewebe-Handschuhe des Hexers | gloves | magic 90 | 89,6 | con 5, int 9, wis 4, lck 1 | frostbite 0,25 | frost_hexer (188) · 0,0004 | 6500 · epic |

Ergebnis nach A1–A4 (drop-only je Band Nahkampf / Fernkampf / Magie): 1–20 25 / 9 / 14 · 20–40 11 / 8 / 9 · 40–60 36 / 15 / 12 · 60–80 12 / 8 / 10 · 80–99 36 / 20 / 15. Drop-Rüstung Platte 48 / Leder 26 / Stoff 20 — jede Klasse je Band ≥ 3 Teile aus regulären Quellen, davon ein Körperteil. Nur-Nahkampf-Monster 46 → 22. Die fünf Nahkampf-exklusiven Effekt-Kinds tragen danach je ≥ 2 Fern- und ≥ 2 Magie-Teile. Die Fernkampf-Waffenlücke 60–80 (heute 1 Drop) ist mit 3 Bögen geschlossen.

#### A5 — Runen (Werte, Level; keine neuen Items)

| Affix | heute | neu | Begründung |
|---|---|---|---|
| affix_hunter modifiersByTier | lck 2 / dex 1 + lck 3 / lck 4 | **dex 1 + lck 1 / dex 2 + lck 1 / dex 3 + lck 2** | Roh-Äquivalent nach Itemization-2 §5.1 (dex 0,85, lck ≈ 0,25): 1,1 / 1,95 / 3,05 gegen Scharf 0,9 / 1,8 / 3,0 und Arkan 1,0 / 2,0 / 3,4. Reiner dex-Spiegel (3/6/10) wäre mit 8,5 Roh-Äquivalent 2,8× zu stark (Rider), darum der Mix. |
| Runenkunst-Level der Stat-Runen | Scharf 15/38/62 · Jägerisch 28/40/74 · Arkan 30/42/75 | **alle drei 15 / 38 / 62** (craft_rune_hunter_i/ii/iii, craft_rune_arcane_i/ii/iii `levelRequired`; XP nach Zielkurve `round(target_xph(L)·durationMs/3 600 000)`) | Gleicher Einstieg je Stil. Zutaten bleiben (Jägerisch: essence_mire/grave/divine; Arkan: aether_essence — aether_essence hat Gate 0 über Diebeskunst/ash_tyrant L45, für ein L15-Rezept content-dev-Wahl: Tier I auf `dim_essence`/`ember_essence` umstellen, Gate ≤ 30). |
| affix_warding trinityByTier | 12 / 25 / 40 | **12 / 35 / 60** | Relativwert am Endgame 31 % → 47 % (Platte 53 %, Leder 59 %). Hüllen-Pin „Ward-Schiene 1179,5 (CL 90)" steigt um ≈ +100 (5 Slots × 20) → neu pinnen. |

Keine Rune fehlt als Spiegel im Sinne von „passt auf Nahkampf, aber nicht auf die anderen"; die Schild-Linie ist ein Slot-, kein Runen-Problem (→ 4b, Zweihand-Slot). **Optional (Chef-Entscheid 2, Variante B):** Spiegelpaar der Schild-Stat-Rune für die beiden Nebenhand-losen bzw. Fokus-Stile — `affix_windrunner` (Windläufer, weapon_ranged, trinityByTier evasionRating 5 / 10 / 16, Runen `rune_windrunner_i..iii` @ Runenkunst 27 / 53 / 79, Zutaten wie Bollwerk mit reed_* statt pigment) und `affix_veilthread` (Schleierfaden, weapon_magic, wardCapacity 12 / 25 / 40, `rune_veilthread_i..iii` @ 27 / 53 / 79, aether_essence statt reed). 6 Runen-Items, 6 Rezepte, 6 Bilder (Runen dürfen glühen). Voraussetzung: logic-dev bestätigt, dass Instanz-Trinity auf der Haupthand in computeStats zählt (armorRating der Haupthand ist per #221 ausgenommen — evasion/ward sind es heute nicht, muss aber gegen den Ward-Pfad geprüft werden).

#### A6 — Suffixe

| Änderung | Werte |
|---|---|
| `suffix_bulwark` (Schmuck, boost defence 0,15 = toter Roll) | boostPerIlvl → `{}`; `attrPerIlvl: { con: 0.2 }`; Phrase bleibt „of the Bulwark / des Bollwerks"; w 40, minIlvl 15 unverändert. Alternativ streichen — dann sinkt die Schmuck-Gewichtssumme 855 → 815 und die Stil-Suffixe (sniper/archon/duelist/brute) steigen anteilig. Empfehlung: umwidmen (kein Save-Belang, bestehende Instanzen zeigen ab sofort con statt „+0 defence"). |
| neu `suffix_zephyr` (of the Zephyr / des Zephyrs) | appliesTo weapon_magic; attrPerIlvl int 0,15; softStats [attackIntervalMs]; w 60; minIlvl 10 — Spiegel von wolf/viper. Magie-Waffenpool 7 → 8, Σw 396 → 456 (= Bogen). |

#### A7 — Tonika und Speisen (Kräuterkunde/Kochen)

| id | Name EN / DE | Buff | Rezept (Spiegelvorlage) | Bild |
|---|---|---|---|---|
| tonic_windstride | Windstride Tonic / Windschritt-Tonikum | category attribute, 90 000 ms, modifiers dex 6 | `brew_windstride_tonic`, herblore@38, 8000 ms, XP 76, inputs herb_bloodthistle 2 + essence_mire 1 + clear_oil 1 (= Blutrausch), value 110, superRare | 1 (Tränke dürfen glühen) |
| tonic_wardveil | Wardveil Tonic / Schleierhaut-Tonikum | category defense, 150 000 ms, trinity wardCapacity 35 | `brew_wardveil_tonic`, herblore@18, 6000 ms, XP 21, inputs herb_marshroot 2 + essence_ash 1 + clear_oil 1 (= Steinhaut), value 60, rare | 1 |
| brew_arcane_surge | — | — | levelRequired 52 → **42**, XP nach Zielkurve (Blutrausch liegt bei 38) | — |
| cook duskfin_rangers_stew / spellwarden_bisque | — | — | Kochen 48 → **40**, 52 → **40** (Nahkampf-Eintopf liegt bei 38), XP nach Zielkurve; food-portions-Pins prüfen | — |

Relativwert der drei Trinity-Tonika am L20-Kit: Steinhaut 35 / 85 AR = 41 %, Scharfauge 20 / 45 EV = 44 %, Schleierhaut 35 / 75 Ward = 47 %.

#### Umfang 4a

45 Ausrüstungs-Items (10 Bögen, 6 Magie-Waffen, 2 Foki, 11 Leder, 16 Stoff) + 50 Loot-Zeilen (fünf Teile mit Welt- und Turm-Doppelquelle) + 2 Tonika + 2 Rezepte + 1 neuer Suffix + 1 Suffix-Umwidmung + 3 Affix-Wert-Änderungen + 6 Rezept-Level + 3 Rezept-Level-Verschiebungen. **Bilderbedarf Mira: 47 (45 Ausrüstung ohne Glow nach Prompt-Regel + 2 Tränke), optional +6 Runen-Bilder bei Variante B.** Aufwand content-dev ≈ 3 Tage inkl. Allowlists und Pin-Updates; kontrolleur ≈ 0,5 Tag Hüllen-Re-Pin (§6).

### 4b. 1.2.0 „Alive" — strukturell (Engine + Content, teils Save-Bump)

| # | Maßnahme | Was | Wer | Save |
|---|---|---|---|---|
| B1 | **Eigene Chase-Linien je Stil und Zone** | Jede Kampfzone (Weiden, Grenzland, Aschefelder, Schwarzdornwald, Gruft, Küste, Hochland, Schlackengrube, Götzenhalle) bekommt je Stil eine benannte Drop-Linie mit 3–4 Teilen (Waffe + 2–3 Rüstungsteile), thematisch an das Zonen-Motiv gebunden (Küste: „Gezeiten"-Bogen-Linie, „Sirenen"-Stoff-Linie; Gruft: „Grabgesang" Stoff, „Knochenschütze" Leder …). A1–A4 sind der erste Zug dieser Linien; 1.2.0 füllt auf je ≥ 5 Teile je Stil je Zone auf. Elite-Signaturen 11 / 4 / 11 → je Zone eine Signatur je Stil (heute 4 Fernkampf-Elites → 9). Dungeon-Truhen: je Truhe ≥ 1 Zeile je Stil. | content-dev, lore-dev (Namen/Flavor), Mira (Bilder ~60) | nein |
| B2 | **Waffentypen 10 : 2 : 2 → 10 : 4 : 4** | Fernkampf: Armbrust (langsam 3400 ms, hoher Einzelschaden, armorPen 0,3 — der Fernkampf-Hammer), Wurfmesser (schnell 2200 ms, Krit, precision — der Fernkampf-Dolch). Magie: Szepter-Craft-Linie 1H + Fokus (Typ existiert bereits; 12 Rezepte in Runenkunst), Grimoire/Kodex (2H, Ward-Anteil auf der Waffe, langsam, Status-Dauer). Zwei neue `WeaponType`-Einträge + `WEAPON_TYPE_SPECIALTY`, Tooltip. 4 neue Leitern × 12 Stufen = 48 Craft-Items. | combat-dev (Typen), content-dev, Mira (~48 Bilder) | nein (Typ ist Item-Feld) |
| B3 | **Stoff-Tiefe** — Chef-Entscheid 4: (a) „Schneidern" als eigener Skill (Stoff aus Handwerk herauslösen, XP-Split-Migration, SAVE-Bump, Sidebar-Icon) oder (b) Handwerk bleibt, bekommt je Stoff-Stufe eine zweite Variante (Robe/Gewand analog Platte/Kette, +50 Rezepte) und die fehlenden L10-Sprossen (dimweave_leggings/_handwraps). | logic-dev (a), content-dev | (a) ja / (b) nein |
| B4 | **Zweihand-Runenslot** — Chef-Entscheid 2: `enchantSlotsFor(rarity, item)` gibt zweihändigen Waffen (alle Bögen, alle Stäbe, Nahkampf-Zweihänder) +1 Slot. Gleicht die fehlende Nebenhand aus (Fernkampf 44 → 48 Slots; Magie mit Stab statt Zauberstab+Fokus verliert nichts). Instanzen mit mehr Affixen als Slots gibt es nicht rückwärts → kein Migrationszweig. | logic-dev, kontrolleur (Hülle) | nein |
| B5 | **Set-Boni angleichen** | Leder-Sets dex 1 → dex 3 / 4 / 5 / 6 / 8 (R40 / 50 / 62 / 70 / 82+), lck unverändert; Stoff-Sets int +2 je Stufe ab R55; Platte unverändert. Ziel (Chef-Entscheid 3): Fernkampf-BiS ≥ 0,85 · Nahkampf, Magie ≥ 0,90 an allen fünf Ankern; verbleibende Lücke über die Bogen-Craft-Leiter (+12–15 % Schaden, 24 Items) schließen, nicht über Nahkampf-Senkung. | balance-designer (Tabelle folgt nach GO), content-dev | nein |
| B6 | **Slayer-Rüstung in drei Klassen** | Slayer-Helm/-Beinschienen/-Armschienen je als Platte / Leder / Stoff (9 Items statt 3, Set `pieces` listet alle Varianten, `minPieces` bleibt), gleiche Punkte, gleiche Slayer-Effekte (bounty/giantSlayer/healOnKill), Trinity-Wert der nächsten Craft-Stufe der jeweiligen Klasse. | content-dev, Mira (6 Bilder) | nein |
| B7 | **Drop-Tabellen-Regel je Monster** | Jedes Monster mit ≥ 2 Ausrüstungs-Zeilen trägt ≥ 1 Nicht-Nahkampf-Zeile (Wächter G5b). Bestehende 46 Nur-Nahkampf-Monster werden über B1 aufgefüllt. | content-dev | nein |
| B8 | **Sim-Stil-Parität (G4 aus dem Juli-Audit, nie umgesetzt)** | `sim.test.ts` fährt die Bronze-Baseline als Fernkampf- und Magie-Variante mit; Report druckt CL-Fortschritt/Kills/Tode nebeneinander; Warnung bei > 30 % Rückstand. Zusätzlich ein `procs`-Ziel im BiS-Bauer (Uptime × Magnitude), damit Zweiter Pfeil/Kriegspfad/Dünner Schleier in der Hülle sichtbar werden (runen-tier-iv §7.3). | logic-dev / kontrolleur | nein |

Aufwand 4b: content-dev ≈ 8–10 Tage (B1 60 Items, B2 48 Items, B5/B6/B7), combat-dev 1 Tag (B2 Typen), logic-dev 1 Tag (B4) bzw. 3 Tage (B3a mit Migration + Vault-Fixture), kontrolleur 2 Tage (Hülle, Sim), Mira ≈ 110–120 Bilder. B3a ist der einzige Save-Bump; alles andere ist additiv.

### 4c. Wächter-Regeln — damit es nicht wieder abrutscht

Neue Datei `packages/content/src/style-parity.test.ts` (content-dev, rein lesend), Hüllen-Erweiterung in `balance-envelope.test.ts` (kontrolleur). Bänder und Stil-Zuordnung wie in diesem Dokument (§ Kopf); Referenz-Implementierung des Wegwerf-Skripts liegt in §8.

| # | Regel | Schwelle heute (rot) | nach 4a | Härte |
|---|---|---|---|---|
| G5a | **Drop-Floor Waffen je Band je Stil:** drop-only-Haupthand-Uniques(Stil, Band) ≥ 4 UND ≥ 40 % des Maximums über die Stile im selben Band | Fernkampf 1–20 (1), 60–80 (1); Magie 1–20 (2), 20–40 (2); 40–60 Fern 3 < 6 | grün | hart |
| G5b | **Drop-Floor Rüstung je Klasse je Band:** drop-only-Teile (Welt/Turm/Dungeon, ohne Elite) je Klasse je Band ≥ 3, davon ≥ 1 Körper; jedes Monster mit ≥ 2 Ausrüstungs-Zeilen hat ≥ 1 Nicht-Nahkampf-Zeile (Teil 2 erst 1.2.0) | Stoff überall 0; Leder 20–40 0 | Teil 1 grün | hart / Teil 2 weich bis 1.2.0 |
| G5c | **Effekt-Spiegel:** jedes stil-neutrale Kind (nicht in {eagleEye, manaOnKill, manaDrain, surplus, wardSiphon, catalyst, blockRestore, plaguebearer, gutter}) mit ≥ 3 Trägern auf einem Stil hat ≥ 1 Träger auf jedem anderen Stil | giantSlayer, vengeance, execute, everyNth, packLeader, desperation, healOnKill | giantSlayer/vengeance/execute/desperation/healOnKill grün; everyNth, packLeader offen (1.2.0) | hart ab 1.2.0 |
| G6 | **Craft-Sprosse je Klasse je Slot** (Erweiterung G3 auf alle 5 Slots + Nebenhand Schild/Fokus): keine Lücke > 20 Level, erste Sprosse ≤ 10 | Stoff Beine/Hände 1 → 22 | grün mit B3b-Sprossen (oder Allowlist bis 1.2.0) | hart |
| G7 | **Runen-Spiegel:** (i) je Stil genau gleich viele weapon_<stil>-exklusive Affixe; (ii) Stat-Runen-Tiers I–III: Roh-Äquivalent (str 0,30 · int 0,34 · dex 0,85 · lck 0,25) je Tier innerhalb ±15 % zwischen den drei; (iii) Runenkunst-Level der drei Stat-Runen je Tier innerhalb ±5; (iv) Rüstungs-T4 je requiresTrinity genau 1; (v) Rüstungs-Stat-Rune III × 5 ≥ 40 % des jeweiligen Endgame-Craft-Kits | (ii) Jägerisch 4 / 3,0 · (iii) 28/40/74 vs 15/38/62 · (v) Ward 31 % | grün | hart |
| G8 | **Support-Spiegel:** je Stil ≥ 1 Attribut-Tonikum, ≥ 1 Trinity-Tonikum mit Kräuterkunde ≤ 30, Stil-Gerichte je 20er-Band gleich viele (±1); Suffix-Pools: Waffen-Pool Σw je Stil innerhalb ±20 %, jeder Schmuck-Suffix mit skillBoost zeigt auf einen Skill, der einen Kampfterm speist (BoostableCombatSkillId ∩ lebende Terme); Slayer-Shop-Ausrüstung je Klasse ≥ 1 (ab B6) | dex-Tonikum fehlt, Ward-Tonikum 72, bulwark tot, Magie-Σw 396 vs 521 | grün (Slayer erst B6) | hart |
| G9 | **Kraft-Hülle je Band (balance-envelope §9):** `buildBisCharacter` damage-Build, allBuffs, an CL 20/40/60/80/99 gegen die Anker-Bosse (goblin_warlock, ash_tyrant, forest_warden, skeleton_nekro, idol_warden): DPS Fernkampf ≥ 0,85 · Nahkampf, Magie ≥ 0,90 · Nahkampf, beide ≤ 1,10; Überleben (Boss→Spieler) je Stil ≥ 0,75 · Maximum der drei | Fern 0,61–0,87, Magie 0,79–1,01; Überleben Fern 17,3 / 29,4 = 0,59 am Götzenwächter | Pins nach B5 messen | weich (Report) in 1.1.x, hart ab 1.2.0 |
| G10 | **Sim-Stil-Parität** (B8): Bronze-Baseline × 3 Stile im Balance-Report, > 30 % CL-Rückstand = Warnung | nie gemessen | — | weich |

Allowlists explizit und kommentiert (Muster `LADDER_EXEMPT_DROP_UNIQUES`): idolhall-Chase (voidweave/voidhide/shadowhide), Slayer-Craft, chitin_coif, frost_pelt_hood.

---

## 5. Aufwand je Stufe

| Stufe | content-dev | combat-/logic-dev | kontrolleur | Mira | Kalender |
|---|---|---|---|---|---|
| 4a (1.1.x) | 3 Tage (45 Items, 50 Loot-Zeilen, 2 Tonika, Suffixe, Runenwerte, Allowlists, Pins) | 0 (Variante B der Runen: 0,5 Tag Prüfung) | 0,5 Tag Re-Pin | 47 Bilder (+6 optional) | 1 Woche nach Bild-Lieferung |
| 4b (1.2.0) | 8–10 Tage | combat-dev 1 Tag (B2), logic-dev 1 Tag (B4) + 3 Tage (B3a) | 2 Tage (Hülle, Sim-Report, procs-Ziel) | 110–120 Bilder | Teil des 1.2.0-Zyklus |
| 4c (Wächter) | 1 Tag (style-parity.test.ts G5–G8) | 0 | 1 Tag (G9/G10) | 0 | mit 4a einführen (G9/G10 weich), mit 4b härten |

---

## 6. Auswirkungen auf die Balance-Hülle (was neu gepinnt werden muss)

| Hüllen-Pin | Bewegung durch 4a | durch 4b |
|---|---|---|
| §4 Tank-/Block-Schiene | keine (kein Platte-/Schild-Item, keine AR-Rune verändert) | keine |
| §4 Lifesteal-Schiene | keine | keine |
| §4 Ward-Schiene 583 / 777 / 1179,5 | **+ ≈ 50 / 100 / 100** (Bewahrende II/III), Stoff-Drops mit Ward > Craft können CL-60/90-Kits verschieben (gravechant_vestment R70 142,8 vs runewoven 100,7) | B5 Stoff-Sets: kleine int-Zunahme, Ward unverändert |
| §3/§4 Krit- und Haste-Deckel | Jägerisch dex 3 × 4 Slots = +12 dex am CL-90-Bogen: Krit- und Haste-Cap binden bereits (§3) → Envelope unverändert, Pins der Bindungsdetektoren bleiben; CL-30-Krit-Stack (bindet heute nicht) steigt leicht | B4 (+1 Slot) und B5 (Leder-dex) drücken weiter an die Deckel — Clamp hält, Pins neu |
| §5 TTK-Matrix (6 Paare) | Fernkampf-Zeilen sinken (skyfather_recurve bleibt BiS-Waffe, aber +dex und ggf. roc_feather_cap R90 EV 25,3 im Kit), Magie-Zeilen sinken (emberheart_robe R90 Ward 192 + int 13, drowned_choir_mitre) → beide Spieler-TTK ≈ −5–10 %, Gegner-TTK Magie +, Fern +; Nahkampf-Zeilen exakt unverändert | B5 + Bogen-Leiter: Ziel-Paare Fern 0,85 / Magie 0,90 — neu pinnen |
| §7 Shop-Ökonomie | keine (keine Shop-Einträge) | keine |
| §8 Meisterringe | keine | keine |
| Sim-Goals / sim-realistic | Fern-/Magie-Läufe erreichen früher Upgrades (drovers_shortbow 0,23 % an der Kuh, shamans_cowl 0,4 % am Schamanen) — Sim-Personas prüfen, keine Pins betroffen | B8 fügt Stil-Varianten hinzu |
| Gold-Ökonomie | 45 neue Sell-Werte (½ value), alle unter der Craft-Referenz derselben Stufe × 1,3 — kein Kauf→Verkauf-Loop möglich (kein Shop-Weg) | — |

Die Rare-Drop-Philosophie bleibt exakt eingehalten: kein neues Teil unterschreitet das nächste Craft-Tier, keine Chance über 0,5 % außer Band 1–20 (0,2–0,44 % wie die bestehenden Frühspiel-Zeilen), kein Shop-/Sammel-Umweg um kampf-gegatete Ware.

---

## 7. Offene Chef-Entscheidungen (je Ja/Nein)

1. **Jäger-Rune spiegeln** (dex 1+lck 1 / dex 2+lck 1 / dex 3+lck 2) und die drei Stat-Runen auf Runenkunst 15/38/62 angleichen; Bewahrende II/III auf 35/60 — Hülle wird neu gepinnt. Ja / Nein
2. **Fehlende Fernkampf-Nebenhand ausgleichen:** Variante A = Zweihand-Waffen bekommen +1 Runenslot (Engine, 1.2.0); Variante B = Runen-Spiegelpaar Windläufer/Schleierfaden (6 Runen, content-only, 1.1.x). Ja zu A / Ja zu B / Nein
3. **Kraft-Ziel** Fernkampf ≥ 0,85 und Magie ≥ 0,90 des Nahkampfs an allen fünf Ankern, erreicht über Leder-/Stoff-Set-Boni und die Bogen-Craft-Leiter (+12–15 %), NICHT über Nahkampf-Senkung; G9 wird ab 1.2.0 hart. Ja / Nein
4. **Stoff-Tiefe 1.2.0:** eigener Skill „Schneidern" (Save-Bump, XP-Split aus Handwerk) — oder Nein = Stoff bleibt in Handwerk und bekommt die zweite Variante je Stufe. Ja (Schneidern) / Nein (Handwerk-Ausbau)
5. **Neue Waffentypen 1.2.0:** Armbrust + Wurfmesser (Fernkampf), Szepter-Craft-Linie + Grimoire (Magie) — 48 Craft-Items, 2 neue Engine-Typen. Ja / Nein

Die Apply-Liste 4a (A1–A7) selbst braucht nur das GO auf dieses Dokument; sie hängt an keiner der fünf Fragen (außer A5 an Frage 1).

---

## 8. Quellen und Repro

- Wegwerf-Skript `packages/engine/src/_parity.test.ts` (gelöscht): Quellen-Klassifikation (craft/shop/slayer/token/gather/world/tower/dungeon/elite/paragon), Stil-Zuordnung (weaponStyle → Trinity-Klasse → Requirement → Attribute), Bänder, Runen-Legalität via `affixAppliesToItem` + `trinityGatePasses`, Suffix-Pools via `affixAppliesToItem`, combatGate-Replik (G1-Formel: Turm = max(level, Etagen-Req · 1,6), dungeonOnly = max(level, requiredLevel)), BiS via `buildBisCharacter(..., "damage", { allBuffs: true })`, TTK-Formel 1:1 aus `balance-envelope.test.ts` `expectedTtk`. Ausgabe im Scratchpad (`parity-out.md`, 932 Zeilen).
- Engine-Formeln: `character.ts` Z. 570–577 (meleeDamage = (0,1 + str·0,3 + Wucht·0,08 + eq)·dmgMult; rangedDamage = dex·0,24 + Fernkampf·0,1 + eq; magicDamage = (int·0,34 + Magie·0,12 + eq)·dmgMult), Fernkampf-Krit +Bonus und ×0,90 Tempo.
- Attribut-Äquivalenzen: `design/itemization-2-spec.md` §3 und §5.1/5.2.
- Runen-Tier-IV-Wirkungstabelle: `design/runen-tier-iv.html` §7.3.
- Material-Audit und Guards G1–G3: `design/magier-material-parity-audit.md` §5, `packages/engine/src/content-integrity.test.ts` Z. 338–528.
- Rezension #8 / Drop ≥ Craft: `packages/content/src/drop-gear-beats-craft.test.ts`.
- Klassen-Suffixe #14: `packages/content/src/suffix-class-fit.test.ts`.
