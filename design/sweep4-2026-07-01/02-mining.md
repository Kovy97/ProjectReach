# Sweep 4 — 02 Mining (Bergbau) L1→99 Deep-Dive + Note

**Skill:** Mining (`trains: con`). **Ziel:** Bergbau L1→99 ausgiebig via `SimPlayer` durchspielen und **benoten**.
**Fokus (Chef):** Erz-Tier-Takt (copper→godiron), Spitzhacken-Progression, Roh-Edelstein-Bonus-Drops, Pet, Gold/h, Mastery, tote Tiers.
**Methode:** Headless `SimPlayer`-Skript (`packages/engine/src/mining-sweep.test.ts`, angelegt → gemessen → **gelöscht**). Echte Engine-Funktionen (`createGame`/`setActiveAction`/`advance`/`give`/`equip`). Deterministisch (seed 42), `autoBank` an, damit das Inventar die Messfenster nicht abwürgt. Je Aktion 1 Sim-Stunde. Guard-Tests (`mining`/`mastery`/`wiring-audit`/`content-integrity`/`pet-integrity`/`action-duration`) laufen **51/51 grün**.

## NOTE: **B+** — sehr guter, klar getakteter Sammel-Skill mit einer echten Progressionslücke
Bergbau ist rund: **21 Aktionen** (13 Erz-Adern + 8 Edelstein-Adern), **streng monoton steigende XP/h L1→99** (Erz *und* Gem), zwei sinnvolle Pfade (Erz = XP + Schmiede-Feedstock, Gem = Gold + Juwelier-Feedstock), ein funktionierender Skill-Pet und **spürbare** Mastery (+25 % XP, +85 % Erz bei Max). Was die glatte A kostet: die **Spitzhacken-Progression endet bei L55 (runite)** — die oberen 44 Level (5 Erz-Tiers) bekommen kein Werkzeug-Upgrade mehr. Zusätzlich verpufft der Mastery-„Preserve"-Ast bei Sammel-Skills komplett, und Kupfer-/Zinn-Erz hat keinen Verkaufswert (1-Gold-Floor).

---

## 1) XP/h-Kurve L1→99 — streng monoton, keine toten/regressiven Tiers · confirmed

**Erz-Adern** (beste im Level nutzbare Spitzhacke, frische Mastery, 1 Sim-h):

| Aktion | reqLvl | durMs | xp | Pickaxe | **XP/h** | Erz/h | Bonus-Gem | Gem/h | matGold/h |
|--------|-------:|------:|---:|---------|---------:|------:|-----------|------:|----------:|
| mine_copper     |  1 | 3000 |   2 | bronze  |   2 642 | 1369 | rough_garnet     | 20 |   1 769 |
| mine_tin        |  1 | 3000 |   2 | bronze  |   2 642 | 1369 | rough_garnet     | 20 |   1 769 |
| mine_iron       | 10 | 3600 |   3 | iron    |   3 585 | 1242 | rough_garnet     | 23 |   5 428 |
| mine_coal       | 15 | 4200 |   4 | iron    |   4 100 | 1073 | rough_garnet     | 16 |   3 539 |
| mine_gravesteel | 22 | 4500 |   5 | steel   |   5 225 | 1104 | rough_bloodstone | 14 |  10 706 |
| mine_mithril    | 35 | 5000 |   8 | mithril |   8 432 | 1139 | rough_sapphire   | 19 |  17 940 |
| mine_adamantite | 45 | 5500 |  14 | mithril |  13 496 | 1068 | rough_ruby       | 13 |  27 740 |
| mine_runite     | 55 | 6500 |  27 | runite  |  26 028 | 1107 | rough_ruby       | 10 |  42 866 |
| mine_murkvein   | 62 | 7000 |  33 | runite  |  29 700 | 1035 | rough_ruby       | 10 |  45 305 |
| mine_bloodiron  | 70 | 7000 |  62 | runite  |  57 226 | 1095 | rough_diamond    | 16 |  55 120 |
| mine_titanium   | 80 | 7800 | 115 | runite  |  97 060 | 1031 | rough_diamond    | 10 |  63 460 |
| mine_aetherite  | 90 | 8500 | 205 | runite  | 163 180 | 1010 | rough_diamond    | 10 |  82 400 |
| mine_godiron    | 95 | 9500 | 475 | runite  | **347 700** | 978 | rough_diamond | 11 | 109 340 |

**Edelstein-Adern** (paralleler Pfad → Juwelierskunst/Gold):

| Aktion | reqLvl | durMs | xp | Pickaxe | **XP/h** | Gem/h | 2. Gem | 2./h | matGold/h |
|--------|-------:|------:|---:|---------|---------:|------:|--------|-----:|----------:|
| mine_garnet_seam     | 15 | 4500 |   4 | iron    |   3 824 | 1005 | rough_sapphire  |  71 |  23 295 |
| mine_bloodstone_seam | 25 | 5000 |   7 | steel   |   6 601 | 1003 | rough_sapphire  |  43 |  57 100 |
| mine_sapphire_seam   | 35 | 5500 |   9 | mithril |   8 622 | 1045 | rough_ruby      |  61 |  51 905 |
| mine_ruby_seam       | 55 | 6500 |  27 | runite  |  26 028 | 1099 | rough_diamond   |  42 |  94 640 |
| mine_diamond_seam    | 75 | 7800 |  88 | runite  |  73 480 | 1014 | rough_onyx      |  17 | 164 280 |
| mine_voidstone_seam  | 82 | 8300 | 145 | runite  | 116 145 |  997 | rough_onyx      |  74 | 248 160 |
| mine_onyx_seam       | 90 | 8800 | 210 | runite  | 161 280 |  969 | rough_diamond   | 192 | 147 000 |
| mine_godgem_seam     | 95 | 9000 | 270 | runite  | 204 930 |  978 | rough_voidstone | 109 | 368 460 |

**Beste Aktion je Level-Band** (Mining-Level = Band, beste Spitzhacke; L1–62 gemessen, L70–99 aus den Tabellen abgeleitet — jenseits L55 ändert sich das Werkzeug nicht mehr, daher deckungsgleich):

| Band | Beste Aktion | XP/h | # freigeschaltet |
|-----:|--------------|-----:|-----------------:|
|  1 | mine_copper           |   2 642 | 2 |
| 10 | mine_iron             |   3 585 | 3 |
| 15 | mine_coal             |   4 100 | 5 |
| 22 | mine_gravesteel       |   5 225 | 6 |
| 25 | **mine_bloodstone_seam** |   6 601 | 7 |
| 35 | **mine_sapphire_seam**   |   8 622 | 9 |
| 45 | mine_adamantite       |  13 496 | 10 |
| 55 | mine_runite           |  26 028 | 12 |
| 62 | mine_murkvein         |  29 700 | 13 |
| 70 | mine_bloodiron        |  57 226 | 14 |
| 75 | **mine_diamond_seam** |  73 480 | 15 |
| 80 | mine_titanium         |  97 060 | 16 |
| 82 | **mine_voidstone_seam** | 116 145 | 18 |
| 90 | mine_aetherite        | 163 180 | 20 |
| 95 | mine_godiron          | 347 700 | 21 |
| 99 | mine_godiron          | 347 700 | 21 |

- **Monoton auf der Level-Linie** — jedes höhere Band hat eine bessere beste Aktion. **Keine tote/regressive Ader.** Auch innerhalb jeder Linie (Erz und Gem) streng steigend.
- Schönes Wechselspiel: **Gem-Adern sind an den Bändern 25/35/75/82 die XP-beste Wahl**, Erz-Adern sonst. Beide Pfade lohnen (Erz → mehr XP + Schmiede-Barren; Gem → deutlich mehr Gold + Juwelier).
- Endgame-Sprung aetherite→godiron (163k→348k XP/h, +113 % in 5 Levels) ist steil, fällt aber unter **bekannt & akzeptiert („endgame XP-Inflation")** — nicht als neues Finding gewertet.

## 2) Freischalt-Takt — dicht, kein Leerlauf · confirmed
Neue Ader-Freischaltungen: L1 copper/tin · L10 iron · L15 coal + garnet_seam · L22 gravesteel · L25 bloodstone_seam · L35 mithril + sapphire_seam · L45 adamantite · L55 runite + ruby_seam · L62 murkvein · L70 bloodiron · L75 diamond_seam · L80 titanium · L82 voidstone_seam · L90 aetherite + onyx_seam · L95 godiron + godgem_seam. **Größter Abstand = 10 Level** (L25→35, L45→55). Kein Band ohne Ziel; die Sweep-3-Füller **gravesteel L22 + bloodstone L25** sitzen genau in der früheren copper→mithril-Lücke — **bestätigt wirksam**.

## 3) Werkzeug-Progression — bricht bei L55 ab (Haupt-Kritikpunkt)
| Pickaxe | speedMult | req | Wert |
|---------|----------:|-----|-----:|
| bronze  | 0.92 | – | 40 |
| iron    | 0.85 | mining 10 | 110 |
| steel   | 0.78 | mining 20 | 280 |
| mithril | 0.70 | mining 35 | 600 |
| runite  | 0.60 | mining 55 | 1400 |

Fünf Tiers bis L55, sauber gestaffelt und im Shop kaufbar — **bis dahin spürbar**. Danach **nichts mehr**: die runite-Hacke (0.6) bleibt von L55 bis 99 die Endstufe, obwohl es 5 weitere Erz-/Barren-Tiers gibt (murkvein/bloodiron/titanium/aetherite/godiron). Man schürft Götzeneisen mit einer Runit-Hacke → siehe Finding 1.

## 4) Roh-Edelstein-Bonus-Drops + Pet · confirmed
- **Bonus-Gems** an jeder Erz-Ader (Chance 0.01→0.025, mit Tier steigend: garnet→bloodstone→sapphire→ruby→diamond). Sauber gestaffelt. **Voll verdrahtet:** alle Roh-Gems haben `cut_*`-Rezepte (Juwelierskunst) **inkl. der erfundenen** rough_bloodstone/voidstone/godgem → cut_bloodstone/cut_voidstone/cut_godgem + Ringe/Amulette. Kein toter Gem-Drop. Gold-mäßig sind die Bonus-Gems ~20–25 % des Erz-Pfad-Golds; die Gem-Adern selbst sind der eigentliche Gold-Motor (godgem 368k/h vs. godiron-Erz 109k/h).
- **Pet `cragmaw`** (⛏️): `source: skill/mining`, `dropChance 1/95000` pro Aktion, `skillEffect: doubleDrop mining 0.05` (5 % Extra-Erz), `combatAbility: burstDamage`. **Droppt über den echten Pfad** — im Sim bei seed 42 nach **~30 Sim-h (~60 000 Aktionen)** erhalten (Erwartungswert ~95k Aktionen / ~47,5 h). Thematisch passend („cracks ore in pairs").

## 5) Gold/Ökonomie — zwei saubere Pfade, exploit-frei · confirmed
- Erz-Pfad-Gold steigt monoton (copper 1 769 → godiron 109 340 g/h inkl. Bonus-Gems). Gem-Pfad-Gold höher (bis 368k g/h), dafür weniger XP → echte Wahl.
- Materialsenken vorhanden: jedes Erz → Schmiede-Barren; jeder Roh-Gem → Juwelier. Kein Loop-Exploit gefunden (Sammeln ohne Inputs, kein Preserve-Gratis-Craft).
- **Reiner Skiller ohne Kampf:** Mining braucht nur Mining-Level + Spitzhacke (Shop, Gold aus Erz/Gem-Verkauf) — **kein Combat-Gate**. Bis 99 komplett kämpferfrei machbar.

## 6) Mastery — spürbar · confirmed
`mine_iron` @ Mining 99 + Runit-Hacke, 1 Sim-h: frische Aktion **XP/h 5 097 / Erz/h 1 808**; Mastery L99 + voller Pool **XP/h 6 369 / Erz/h 3 339** → **+25 % Tempo, +85 % Erz-Ertrag** (masteryDoubleChance 0.49 + Pool-Doppel 0.08 + Tempo-Cap 14.7 % + Pool-Tempo 0.08). Deutlich lohnend. **Aber:** der Preserve-Ast (per-Action bis 40 %, Pool-Checkpoint 0.5 = +5 %) greift **nur bei Aktionen mit `inputs`** — Mining-Adern haben keine → für Bergbau (und alle Sammel-Skills) **wirkungslos** (Finding 2).

---

## FINDINGS (schwerste zuerst)

### [P2][balance] Spitzhacken-Progression endet bei L55 — 44 Level ohne Werkzeug-Upgrade · confirmed
- **Repro:** `bestToolSpeed(state, content, "mining")` mit allen Pickaxes; höchste Stufe = `runite_pickaxe` (0.6, req 55). Kein `_pickaxe`-Item darüber (grep bestätigt: nur bronze/iron/steel/mithril/runite; Shop-Einträge 11015–11019).
- **Erwartet vs. tatsächlich:** Ein Skill, dessen Identität Werkzeug-Upgrades sind, sollte parallel zu den Erz-Tiers weiter aufrüsten. Tatsächlich: murkvein(62)/bloodiron(70)/titanium(80)/aetherite(90)/godiron(95) werden **alle mit derselben Runit-Hacke** geschürft — das späte Progressionsgefühl beim Werkzeug fehlt völlig.
- **Vorschlag (Soll-Werte):** 3 weitere Tiers, gestaffelt an den Barren-Tiers — `adamant_pickaxe` speedMult **0.55**, req mining 45 (Adamantium-Barren); `titanium_pickaxe` **0.50**, req 70; `godiron_pickaxe` **0.45**, req 90. Hält die spürbare Tool-Kurve bis 99 und gibt den Erz-Barren eine Senke.
- **Owner:** Content-Dev (Items + Shop + ggf. Schmiede-Rezepte); ggf. Balance-Designer für die speedMult-Werte.

### [P3][feel] Mastery-„Preserve" verpufft bei allen Sammel-Skills (Mining hat keine Inputs) · confirmed
- **Repro:** `completeAction` (tick.ts:86–98) zieht Preservation nur im `if (action.inputs)`-Zweig; Mining-Adern haben keine `inputs`. `masteryPreserveChance` (bis 0.4) und der Pool-0.5-Checkpoint (+0.05 preserve) sind für Mining tot.
- **Erwartet vs. tatsächlich:** Erwartet, dass jeder der 4 Mastery-Pool-Checkpoints einen fühlbaren Nutzen hat. Tatsächlich ist der 0.5-Checkpoint für Sammel-Skills wertlos — ~¼ des Mastery-Belohnungsraums läuft leer.
- **Vorschlag:** Für Sammel-Skills den Preserve-Beitrag umwidmen (z. B. Pool-0.5 = +0.05 *Doppelertrag* oder +Bonus-Gem-Chance) — oder ein `gatherYield`-Äquivalent, das die Roh-Gem-Chance leicht anhebt.
- **Owner:** Logic-Dev (mastery/shared-Checkpoint-Semantik).

### [P3][balance] `copper_ore` & `tin_ore` ohne `value` → 1-Gold-Verkaufs-Floor · confirmed
- **Repro:** content index.ts:55–56 — beide ohne `value`. `sellPrice` = `max(1, round(0·0.5))` = **1**. Alle anderen Erze haben `value` (iron 8, gravesteel 18 …).
- **Erwartet vs. tatsächlich:** kleine Inkonsistenz — Kupfer/Zinn-Erz ist beim Verkauf faktisch wertlos. Da primär Bronze-Inputs, tolerierbar (fällt teils unter „Bronze-Baseline"), aber `value: 2–3` wäre konsistent mit der Holz-Tier-Staffelung.
- **Owner:** Content-Dev.

### Bestätigungen (nicht als Fehler melden)
- XP/h **streng monoton L1–99** (Erz + Gem), **keine toten/regressiven Tiers**.
- **cragmaw**-Pet droppt über den echten Mining-Pfad; skillEffect doubleDrop 0.05 aktiv.
- Bonus-Gem-Drops sauber gestaffelt und **komplett verdrahtet** (alle `cut_*`-Rezepte inkl. der erfundenen Blutstein/Leerenstein/Göttenstein).
- Mastery spürbar (+25 % XP, +85 % Erz).
- Sweep-3-Füller **gravesteel L22 + bloodstone L25** wirksam; kein Leerlauf-Band > 10 Level.
- Guard-Tests **51/51 grün** (`mining` 4, `mastery` 16, `wiring-audit` 2, `content-integrity` 5, `pet-integrity` 21, `action-duration` 3).

---

## Top-3-Findings
1. **[P2] Werkzeug-Progression bricht bei L55 ab** — runite ist die letzte Spitzhacke; L55–99 (5 Erz-Tiers) ohne Upgrade → Content-Dev.
2. **[P3] Mastery-Preserve verpufft bei Sammel-Skills** — Mining hat keine Inputs; ¼ des Mastery-Reward-Raums tot → Logic-Dev.
3. **[P3] copper_ore/tin_ore ohne value** — 1-Gold-Floor, Inkonsistenz zur restlichen Erz-Staffel → Content-Dev.

## Top-3-Verbesserungen (mit Zahlen)
1. **3 neue Spitzhacken-Tiers:** adamant 0.55/req45, titanium 0.50/req70, godiron 0.45/req90 (+ Shop-Preise ~2 500/6 000/14 000 g, + Schmiede-Rezepte aus dem jeweiligen Barren).
2. **Sammler-taugliches Pool-0.5-Checkpoint:** Preserve → +0.05 Doppelertrag *oder* +Bonus-Gem-Chance für Skills ohne `inputs`.
3. **Kupfer/Zinn-Erz `value: 3`** (Bronze-Baseline konsistent zu Holz-Tiers; hebt den frühen Gold-Floor minimal).

**Gesamt-Empfehlung:** ship — Mining ist release-tauglich (Note **B+**). Die Spitzhacken-Lücke L55–99 ist der einzige spürbare Feel-Makel und ein guter Post-EA-/Balance-Kandidat, kein Blocker.
