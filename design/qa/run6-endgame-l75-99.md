# QA Run 6 — Endgame L75–99 (Magie repariert, Slayer-Phase-2-Loot, echte Geared-Sim)

**Playtester:** Endgame-Analyst, Persona L75–99. Methode: **echte Engine-Simulation** (Temp-Harness, danach entfernt) — voll gemaxter L99-Held (ALLE Skills 99), fünf BiS-Loadouts, je 1 h Auto-Battle gegen das Endgame-Band L82–120 inkl. der neuen Slayer-Etage 5. Slayer-Anforderungs-Items im Inventar (sonst meldet `canFightMonster` eine Schein-Wall).
**Datum:** 2026-06-28
**Fokus (Chef-Kernfragen Run 6):** Magie endgame jetzt im Band (war 0,49× durch Mana)? 3-Stil-Parität @L99 0,9–1,1×? Slayer-Phase-2-Loot als Endgame-Ziel? Suffix-Endgame-Drops? Echte Walls mit gearedem Held? Was hält es unter 9,5?
**Vergleich:** `design/qa/run5-endgame-l75-99.md` (Fun **7,5** — Magie 0,49×, Harness nackt, 0 Walls).

## Fun-Score: 8,5 / 10 (Δ vs run5: **+1,0**)

Die drei größten Run-5-Wunden sind versorgt: **Magie ist von 0,49× auf ~0,80× Melee gesprungen** (manaCost-Cap + godspark-Robe + manaRegen-Skalierung — der manuell gemessene #1-Frust-Punkt aus Run 5 ist weg), das **Geared-Harness rüstet jetzt wirklich aus** (combatLevel 99 → echtes Godiron, verifiziert), und mit **Slayer Phase 2** existiert erstmals ein echtes, stil-übergreifendes Endgame-Gear-Ziel + Punkte-Sink bis Slayer 80. Die Stil-Parität-Spanne hat sich von 0,51 breit (0,49–1,00) auf **0,35 breit (0,65–1,00)** zusammengezogen.

Warum nicht höher: Die **Ranged-Trim hat überkorrigiert** — Fernkampf ist von 0,83× (Run 5, 2. Platz) auf **~0,65× abgesackt und jetzt der schwächste Stil**. Die Parität ist also nicht erreicht, nur verschoben: statt „Magie am Boden" jetzt „Ranged am Boden", und Melee-1H dominiert weiter klar (das 800-ms-Tempo-Limit macht die schnelle 1H zum König). Und die zwei strukturellen Run-5-Löcher bleiben offen: **0 Walls** (selbst der neue härteste Slayer-Mob `abyssal_devourer` mit enrage ×2,0 fällt in 1,8 s; `last_idol` in 2,3 s), und der **8-%-Drop-Suffix hat im Endgame weiter keine Oberfläche** (alle Endgame-Mobs droppen nur Materialien). Solides, reiches, jetzt fairer balanciertes Endgame — aber für einen gerüsteten Helden immer noch ein gelöstes Spiel ohne einzige Herausforderung.

---

## Magie endgame — „jetzt im Band statt am Boden?" → JA (Kernfrage #1 beantwortet)

**Magie ist von 0,49× (Run 5, letzter Platz) auf ~0,80× Melee-1H gestiegen und damit der zweitstärkste Stil.** Der manaCost-Cap greift belegbar:

- `godiron_staff` manaCost **10** (Run 5: 24), `godiron_wand` 8, `godspark_staff` 9.
- Magier-Stats @L99 (godiron_staff + godspark-Robe-Set + slayer_amulet): **Mana 312 / Regen 12,2/s** (Run 5: 270 / 10/s). Das godspark-Set gibt 5×0,6 = +3,0 manaRegen.
- Nachhaltiger Cast-Takt = Regen/Kosten = 12,2/10 = **1,22 Casts/s** bei 800 ms aIMs (= ~0,8 Casts/s Bedarf) → **Mana deckt den vollen Cast-Takt durchgehend**. Keine Weak-Cast-Spirale mehr. In Run 5 waren ~75 % der Schwünge Schwach-Schläge; jetzt castet der Magier dauerhaft voll.
- Stab vs. Wand+Fokus: **0,80× vs 0,80×** — praktisch identisch. Magie-Build-Diversität (2H-Stab ↔ 1H-Wand+Fokus) ist wiederhergestellt, kein Falle-Pfad.

Knapp unter dem 0.85×-Ziel, aber das ist Feintuning, kein Frust-Loch mehr.

---

## 3-Stil-Parität @L99 — „0,9–1,1×?" → NEIN, aber Spanne halbiert

Durchsatz-Verhältnis vs Melee-1H (Referenz 1,00×), gemittelt über das **besiegbare** Band (14 Mobs L82–120):

| Stil | Ø Run 6 | Ø Run 5 | Δ |
|---|---|---|---|
| **Melee 1H (Schwert/Schild)** | **1,00×** | 1,00× | — |
| **Magie (Stab + godspark-Robe)** | **~0,80×** | 0,49× | **+0,31** |
| **Magie (Wand+Fokus)** | ~0,80× | — | neu |
| **Melee 2H (Großschwert)** | ~0,74× | 0,58× | +0,16 |
| **Fernkampf (Langbogen+Voidhide)** | **~0,65×** | 0,83× | **−0,18 ⚠** |

Die `0,9–1,1×`-Bandbreite ist nicht erreicht: Melee-1H ist weiter der klare Ausreißer **nach oben** (schnelle 1H + 800-ms-aIMs-Floor + Lebensraub + als einziger Stil das Slayer-2-Teile-Set). Alle anderen liegen 0,65–0,80×. Die gute Nachricht: kein Stil ist mehr Halbkraft, die Spanne ist von 0,51 auf 0,35 geschrumpft. Die schlechte: **die Ranged-Trim hat den Fernkampf vom 2. Platz auf den letzten gedrückt** (rangedDamage 440→390, crit 56 %→49 %).

**BiS-Helden-Stats (computeStats, alle Skills 99):**
- Melee 1H: dmg 547 / HP 3010 / def 644 / acc 977 / eva 187 / crit 52 % / critDmg 2,48 / **aIMs 800**
- Melee 2H: dmg 692 / HP 2885 / def 576 / acc 940 / crit 52 % / critDmg 2,78 / **aIMs 1265**
- Ranged: dmg 390 / HP 2139 / def 318 / acc 964 / eva 285 / crit 49 % / **aIMs 1000**
- Magie-Stab: dmg 406 / HP 2121 / def 295 / acc 1038 / crit 60 % / aIMs 800 / **Mana 312 / Regen 12,2/s**
- Magie-Wand+Fokus: dmg 395 / acc 1086 / Mana 312 / Regen 12,2/s

---

## Echte Walls mit gearedem Held — die Kernfrage → weiterhin 0 Walls

Kampf-Matrix (voll gemaxt, je 1 h, `cooked_voidray` + Auto-Eat). Zelle = Kills/h · s/Kill:

| Mob | Lv | Melee-1H | Melee-2H | Ranged | Magie-Stab | Magie-Wand |
|---|---|---|---|---|---|---|
| roc_void | 84 | 2895 · 1,2s | 1845 · 2,0s | 1978 · 1,8s | 1987 · 1,8s | 1986 · 1,8s |
| gravecliff_specter | 87 | 2487 · 1,4s | 1788 · 2,0s | 1892 · 1,9s | 1998 · 1,8s | 1985 · 1,8s |
| voidhusk_crusher | 90 | 2562 · 1,4s | 1866 · 1,9s | 1462 · 2,5s | 1987 · 1,8s | 1961 · 1,8s |
| idol_warden | 92 | 2541 · 1,4s | 1849 · 1,9s | 1543 · 2,3s | 2027 · 1,8s | 2020 · 1,8s |
| abyssal_tide_serpent | 96 | 2526 · 1,4s | 1819 · 2,0s | 1408 · 2,6s | 1931 · 1,9s | 1931 · 1,9s |
| aether_wraith | 98 | 2538 · 1,4s | 1844 · 2,0s | 1523 · 2,4s | 1994 · 1,8s | 2001 · 1,8s |
| charred_doomknight | 101 | 1975 · 1,8s | 1602 · 2,2s | 1457 · 2,5s | 1761 · 2,0s | 1628 · 2,2s |
| scale_skarn | 104 | 1982 · 1,8s | 1627 · 2,2s | 1456 · 2,5s | 1626 · 2,2s | 1621 · 2,2s |
| void_titan | 110 | 1867 · 1,9s | 1589 · 2,3s | 1160 · 3,1s | 1557 · 2,3s | 1558 · 2,3s |
| **last_idol (Capstone)** | **120** | **1541 · 2,3s** | 1174 · 3,1s | 1038 · 3,5s | 1291 · 2,8s | 1284 · 2,8s |
| dread_knight (Slayer-E5) | 82 | 2954 · 1,2s | — | 2004 · 1,8s | 2799 · 1,3s | — |
| soul_flayer (Slayer-E5) | 86 | 2972 · 1,2s | — | 1991 · 1,8s | 2031 · 1,8s | — |
| void_herald (Slayer-E5) | 90 | 2561 · 1,4s | — | 1504 · 2,4s | 2000 · 1,8s | — |
| **abyssal_devourer (Slayer-E5)** | **96** | **1979 · 1,8s** | — | 1202 · 3,0s | 1613 · 2,2s | — |

**Ergebnis: 0 Walls.** Jeder der fünf Builds besiegt jeden Mob inkl. Capstone und inkl. des neuen härtesten Slayer-Mobs. `abyssal_devourer` (L96, **regen 8, enrage ×2,0**, 4 Resists) ist der zäheste Encounter des Spiels — und fällt einem Melee-Helden in **1,8 s**. `last_idol` (regen 14, enrage ×1,75) in 2,3 s. Die regen/enrage-Werte sind gegen 400–550 Spieler-DPS weiter wirkungslos. **Unverändert ggü. Run 5 (P2).**

> Mess-Hinweis: In einem ersten Lauf ohne Slayer-Anforderungs-Item meldeten soul_flayer/void_herald/abyssal_devourer „0 Kills / 720 Tode" — das war ein **Harness-Artefakt** (`canFightMonster` blockt den Kampf-Eintritt, kein echter Tod). Mit Item im Inventar laufen sie normal. Real-Daten oben.

---

## Slayer-Phase-2-Loot als Endgame-Ziel → JA, der echte Run-6-Gewinn

Das ist das stärkste neue Stück Endgame. **Slayer Phase 2** liefert:

- **Neue Slayer-Etage 5 „Der Abyssale Thron"** (L82–96): `dread_knight` (82), `soul_flayer` (86, req soul_veil), `void_herald` (90, req void_anchor), `abyssal_devourer` (96, req void_anchor). Boss-tier-Drops: `soul_flayer_fang`, `void_herald_shard`, `abyssal_core` (1–8 % — echte Chase-Mats).
- **Cross-Style-Slayer-Set „Slayers Ornat"** (epic): `slayer_helm` (Slayer 80; def 48, HP 140, +12 alle Schadensarten, slayerHelm-Flag = keine Req-Items mehr nötig), `slayer_amulet` (70), `slayer_greaves` (65), `slayer_vambraces` (50). **2-Teile-Set-Bonus** (+def20/HP60/acc10/+8 alle Schadensarten/crit3 %), 4-Teile voll. ALLE drei Stile profitieren (meleeDamage+rangedDamage+magicDamage auf jedem Teil) — endlich ein BiS-Ziel, das nicht stil-exklusiv ist.
- **Slayer-Punkte-Sink reicht jetzt bis Slayer 80** (war Stop bei 60/void_anchor). Run-5-P3 weitgehend geschlossen.

Das gibt dem Endgrind echten Pull: Slayer-Etage 5 farmen → Punkte + Boss-Mats → episches Set craften. **Adressiert Run-5-P2 (Endgame-Gear-Ziel) und Run-5-P3 (Shop-Stop).**

---

## Suffix-Endgame-Drops → fast unverändert (Run-5-P2 bleibt offen)

- **Neuer Suffix-Tier `suffix_executioner` (minIlvl 70, weight 6)** ergänzt — der höchste Tier war in Run 5 minIlvl 50. Gut, aber:
- **Die Endgame-Mobs droppen weiter ausschließlich Materialien.** Open-World L84–110, Idolhall, UND die neue Slayer-Etage 5 — kein einziger Equipment-Drop, der den 8-%-Drop-Suffix auslösen könnte.
- **Einziges Equip-Drop im ganzen Endgame bleibt `aether_runestaff` von `last_idol` (5 %) — ein L40-Stab (magicDmg 27).** Der schwerste Boss des Spiels droppt weiter Vendor-Trash.
- → Suffix-Endgame ist faktisch weiter ein **Crafting**-Feature (`DEFAULT_CRAFT_SUFFIX_CHANCE = 0,2` auf godiron/voidhide/godspark). Der 8-%-Drop-Pfad hat im Endgame keine Oberfläche. Der neue minIlvl-70-Suffix ist nur über Crafting erreichbar.

---

## Findings

### [P1] Ranged-Trim überkorrigiert: Fernkampf jetzt schwächster Stil (~0,65×)
Run 5 war Ranged 0,83× (2. Platz). Die Trim (rangedDamage 440→390, crit 56 %→49 %) hat ihn auf ~0,65× gedrückt — unter 2H-Melee (0,74×) und Magie (0,80×). Die Parität ist nicht behoben, nur das Defizit von Magie auf Ranged verlagert. Besonders an def-/eva-starken Mobs (voidhusk_crusher 2,5 s, void_titan 3,1 s) bricht Ranged weg.
**Fix:** Trim teilweise zurücknehmen — rangedDamage der Top-Bögen oder ammoDamage anheben, Ziel Ranged ~0,80–0,85× (gleichauf mit Magie). Nicht zurück auf 0,83× über Melee-2H springen lassen.

### [P2] Magie 0,80× — knapp unter dem 0,85×-Ziel
Riesenfortschritt (0,49→0,80), aber noch nicht im Zielband. Letzter Feinschliff: +1–2 manaRegen am Top-Set ODER godiron_staff magicDamage leicht hoch (90→~98). Geringe Priorität — Magie ist spielbar und konkurrenzfähig.

### [P2] Endgame hat für BiS keinerlei Wall — Capstone & härtester Slayer-Mob = Farm (unverändert)
`last_idol` (L120) 2,3 s, `abyssal_devourer` (L96, enrage ×2,0, regen 8) 1,8 s. Die regen/enrage-DPS-Checks (regen 3–14/s) sind gegen 400–550 Spieler-DPS wirkungslos. Kein Schwierigkeits-Gate für einen gerüsteten Helden.
**Fix:** %-basierter regen/Schild (skaliert mit max-HP statt flach), DPS-Soft-Enrage-Timer, oder Stil-Resist mit Biss — für ≥1 Capstone-Encounter. (Combat-FX lt. Memory späterer Meilenstein; hier nur als Balance-Lücke.)

### [P2] Suffix-Endgame-Loot via Kampf weiter ohne Oberfläche (unverändert)
Endgame-Mobs (inkl. neuer Slayer-E5) droppen nur Materialien; einziger Equip-Drop ist der L40-Stab vom Capstone. Der neue minIlvl-70-Suffix ist nur über Crafting erreichbar.
**Fix:** 1–2 endgame-tier Equipment-Drops (low-chance) in die L96–120-Tabellen + auf die Slayer-E5-Bosse, damit 8-%-Drop-Suffix + minIlvl-70-Tier am Endgame ankommen. `aether_runestaff`-Drop durch ein endgame-würdiges Item ersetzen.

### [P2] Slayer-2-Teile-Set bevorzugt Melee in der Stil-Parität
Nur Melee-1H kann slayer_vambraces (Handschuhe) + slayer_amulet tragen → **Slayer-2-Teile-Bonus aktiv** (+8 alle Schadensarten/crit3 %). Ranged braucht den Handschuh-Slot für Voidhide-, Magie für godspark-Set-Bonus → nur 1 Teil (Amulett), kein Set-Bonus. Das bläht die Melee-Referenz zusätzlich auf.
**Fix:** entweder einen 1-Teil-Slayer-Bonus, oder ranged/magic Handschuh-Alternativen, die den Slayer-Slot freispielen, ODER Set-Bonus stil-neutral kleiner halten.

### [P3] 2H-Melee bleibt Durchsatz-Falle (0,74×, verbessert)
Großschwert 0,74× von Schwert/Schild (Run 5: 0,58×) — besser durch Slayer-Gear/Greatsword-Werte, aber das 800-ms-aIMs-Limit der schnellen 1H bleibt der König. Build-Diversität noch schief.
**Fix:** 2H-Schadens-Premium weiter anheben ODER 1H/2H verschiedene aIMs-Floors.

### [P3] Slayer 80–99 weiter ohne Sink; Endgame-Quest-Bogen weiter offen
Slayer-Shop endet jetzt bei 80 (slayer_helm/abyssal_core) — Slayer 80–99 ohne neuen Punkte-Sink. 0 Quests zielen auf last_idol/Godiron-Forge/Idol-Sanctum/Slayer-Thron (Quest-Bogen lt. Chef bewusst offen).

---

## Δ vs run5 — Zusammenfassung

| Run-5-Aussage/Loch | Status Run 6 |
|---|---|
| Magie ~0,49× (Mana-Drossel, P1) | **BEHOBEN** — ~0,80× via manaCost-Cap (Stab 24→10) + godspark-Robe (+3 manaRegen) + Regen 10→12,2/s |
| GEARED_HERO kämpft nackt (req 99 vs combatLevel 90, P1) | **BEHOBEN** — combatLevel 99, alle 5 Godiron-Teile equippen (verifiziert) |
| Slayer-Shop-Stop bei 60 / kein Endgame-Gear-Ziel (P2/P3) | **BEHOBEN** — Slayer Phase 2: cross-style Slayer-Set, Etage 5 (L82–96), Sink bis 80 |
| Suffix kein Tier > minIlvl 50 (P2) | **TEILS** — neuer minIlvl-70-Tier, aber nur via Crafting erreichbar |
| Ranged 0,83× (2. Platz) | **REGRESSION** — Trim überkorrigiert → ~0,65×, jetzt schwächster Stil |
| 0 Walls / Capstone-Faceroll (P2) | **unverändert** — last_idol 2,3 s, abyssal_devourer (enrage ×2,0) 1,8 s |
| Suffix-Drop ohne Endgame-Oberfläche (P2) | **unverändert** — Endgame-Mobs droppen nur Mats |
| Kein Endgame-Quest-Bogen (P2) | **unverändert offen** |

**Fun: 7,5 → 8,5 (+1,0).** Zwei der drei Run-5-Hauptwunden (Magie-Halbkraft, Schein-Harness) sind geheilt, plus ein echtes Endgame-Gear-Ziel. Gebremst durch die neue Ranged-Regression und die unveränderten strukturellen Löcher (0 Walls, Suffix-Drop-Oberfläche, Quest-Bogen).

---

## Was fehlt für 9,5?

1. **Ranged-Trim teilweise zurücknehmen** (P1) — auf ~0,80–0,85× heben, gleichauf mit Magie. Sonst spielt 1/4 der Spieler den neuen Halbkraft-Stil. Plus Melee-1H-Dominanz angehen (aIMs-Floor differenzieren), damit die `0,9–1,1×`-Bandbreite real wird.
2. **Eine echte Endgame-Wall bauen** (P2) — mindestens last_idol UND abyssal_devourer müssen einen gerüsteten Helden fordern: %-basierter Schild/regen (max-HP-skaliert), DPS-Timer, oder beißender Stil-Resist. „Endgame" mit 1,8–2,3 s/Kill auf jedem Boss ist ein gelöstes Spiel.
3. **Suffix-Endgame mit Oberfläche** (P2) — echte Equip-Drops (low-chance) auf L96–120-Mobs + Slayer-E5-Bosse, damit der 8-%-Drop-Pfad und der neue minIlvl-70-Tier am Endgame ankommen; L40-Capstone-Drop ersetzen.
4. **Slayer-Set-Parität** (P2) — Set-Bonus stil-neutral, damit er nicht heimlich Melee bevorzugt.
5. **Endgame-Quest-Bogen + Slayer-80–99-Sink + 2H-Premium** (P3) — narrativer Pull L70/85/99/Slayer-Thron, Punkte-Sink über Slayer 80, und 2H als echte Alternative.

Punkt 1–2 heben von 8,5 auf ~9,2; 3–5 schließen auf 9,5. Die Magie-Reparatur und Slayer Phase 2 zeigen: Die richtigen Hebel werden gezogen — es fehlen nur noch die Ranged-Gegenkorrektur und die seit Run 4/5 bekannte „echte Herausforderung + Loot-Chase-Oberfläche".
