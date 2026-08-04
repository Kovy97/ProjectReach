# QA-Run 6 — Übergang Früh→Mid (Level 15–30)

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code/Content geändert) · **Datum:** 2026-06-28
**Persona:** Spieler im Übergang L15–30. **Kernfrage:** Hält die 3-Stil-Parität @L16/24/30 weiter im Band, und ist die in Run5 gemeldete **Magie-Accuracy-Delle gegen evasive Mobs** (L30 Icemage) jetzt geschlossen? Sind **Suffix-Loots im Kampf** sichtbar?
**Run-6-Kontext:** Round-4-Paritätshebel — **manaCost-Cap** (Stäbe), **str-Platte** (Plattenrüstung trägt jetzt `str`), **Ranged-Trim**, „Suffix sichtbar".

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`startCombat`→`advance`, deterministischer Seed 5), je Checkpoint **drei tier-gleiche, slot-vergleichbare Builds** (melee Dolch+Schild / ranged Kurzbogen+Köcher / magic Stab) gegen den **on-level Crypt-Mob** (skeleton_warrior L16 / skeleton_butcher L24 / skeleton_icemage L30) über je **1 h** Spielzeit. Stil-realistische Skill-Investition inkl. der Pflicht-Craft-Gates (melee: attack+power+defence+vitality+smithing → dex/str/con · ranged: ranged+defence+vitality+fletching+leatherworking → dex/con · magic: magic_off+magic_def+defence+vitality+runecrafting → int/wis/con), je auf das Checkpoint-Level gesetzt. Pro Stil eine **slot-symmetrische** Rüstung (Helm/Body/Legs/Gloves/Boots; Melee zusätzlich Schild im offhand — legitimer 1H-Dolch-Vorteil, da Bogen/Stab zweihändig sind und keinen offhand zulassen), **voller Köcher**, **band-gerechtes Food** (cooked_anglerfish) + Auto-Eat T2, voller HP-Eintritt. Gemessen: **kills/h** + Begleit-Stats aus `computeStats`. Zusätzlich: Craft-Suffix-Rate (4.000 Rolls), Crypt-Equipment-Drop-Scan, Stab-manaCost direkt aus `packages/content/src/index.ts`. **Harness nach dem Lauf entfernt** (kein Rückstand in `packages/engine/src/`). Abgeglichen mit `run5-early-mid-l15-30.md`.

> **Methodik-Hinweis:** Die **absoluten** kills/h sind wegen unterschiedlicher Kit-Wahl nicht 1:1 mit Run5 vergleichbar (mein Magie-Kit trägt z. B. kein Amulett/Cape/Ringe). Das Parität-Maß ist das **Stil-Verhältnis innerhalb desselben Laufs** — und das ist konsistent gemessen.

---

## Fun-Score: **8,0 / 10**

Gemischter Lauf: **ein echter Fix, eine echte Regression, eine unveränderte Lücke.**

**Der Fix:** Die zentrale Run5-Delle — *Magie bricht gegen den hoch-evasiven, frost-resistenten Icemage (L30) auf 0,84× ein* — ist **weitgehend geschlossen**. Magie liegt @L30 jetzt bei **0,89×** und der Checkpoint-Spread fällt auf **1,13×** (Run5: 1,28×) — der **engste L30-Wert bisher**. Treiber ist der **manaCost-Cap**: Stäbe kosten jetzt nur noch **5–10 Mana** (der stale Code-Kommentar nennt noch „8→24"), sodass der Magier mit Pool 78–120 + hoher Regen **praktisch durchgehend voll castet** statt in den Weak-Melee zu kippen — er verliert am evasiven Ziel keine Burst-Fenster mehr. Die KERNFRAGE *„Magie-Accuracy gegen evasive Mobs ok?"* lautet jetzt **ja**.

**Die Regression:** Die **str-Platte** überschießt am unteren Bandende. Jedes Plattenteil trägt jetzt `str` **plus** flachen meleeDamage (iron-Set: str +5 → +7,5 Schaden, dazu +6 flat; steel/blacksteel analog). Das macht **Nahkampf zum klaren Top-Stil**, und zwar am stärksten gegen **niedrig-HP-Mobs**: @L16 (Mob 120 HP) zweischlägt der str-Dolch den Gegner und erreicht **766 kills/h** gegen ranged 531 (0,69×) / magic 539 (0,70×) → **Spread 1,44×**. Wo Run5 @L16 noch **1,10×** (±5 %) maß, läuft Melee jetzt davon. Das ist **schlechter als der schlechteste Run5-Wert** (1,28×): der Parität-Riss ist nicht verschwunden, sondern vom Magie-Boden am oberen Ende zum **Melee-Deckel am unteren Ende** gewandert — und **breiter** geworden.

**Die Lücke:** „Suffix sichtbar" ist **im Kampf-Pfad nicht eingelöst**. Der Drop-Suffix-Mechanismus ist in `combat.ts` sauber verdrahtet (`onEnemyDefeated` würfelt `suffixChance` auf jedem Equipment-Drop), aber **0 Crypt-Mobs droppen überhaupt Equipment** — der Crypt-Grinder sieht weiter keinen Random-Roll. Craft-Suffix-Rate verifiziert bei **21,4 %** (Soll 20 %). Identisch zu Run5 P3.

0 Tode, 0 Walls, 0 XP-Trichter, mustergültige Gear-Leiter — die Basis bleibt stark. Aber der Lauf **verbessert das Gesamt-Paritätsband nicht** (worst-case 1,28× → 1,44×), darum **−0,5 ggü. Run5 (8,5)**.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Crypt-Mob, **0 Tode überall**)

| Stil (Waffe) | L16 vs skeleton_warrior | L24 vs skeleton_butcher | L30 vs skeleton_icemage |
|---|---:|---:|---:|
| **Melee (Dolch+Schild)** | **766 (1.00×)** | **528 (1.00×)** | 480 (1.00×) |
| **Ranged (Kurzbogen)** | 531 (0.69×) | 431 (0.82×) | **483 (1.01×)** |
| **Magic (Stab)** | 539 (0.70×) | 451 (0.85×) | 428 (0.89×) |

**Spread je Checkpoint** (bester/schlechtester Stil): **L16 1.44×**, L24 1.23×, **L30 1.13×**.

Lesart: Melee ist an **jedem** Checkpoint die Spitze, mit dem größten Vorsprung am unteren Ende (L16 1,44×) und schrumpfendem Vorsprung nach oben (L30 nur noch ~gleichauf mit Ranged). Genau das erwartet man von einem **Flat-/str-Schadens-Boost gegen Mobs mit wenig HP**: bei 120 HP (Warrior) entscheidet jeder zusätzliche Schadenspunkt über einen ganzen Schlag-Breakpoint; bei 220 HP (Icemage) verwässert der Effekt. Magie und Fernkampf sind untereinander an jedem Checkpoint **innerhalb ±5 %** — die Streuung kommt **fast ausschließlich aus dem Melee-Überschuss**.

**Begleit-Stats @L24** (aus `computeStats`):
- **Melee** steel_dagger: dmg **90**, aIMs **2435 (schnellster Takt)**, crit 0.11, acc 193, eva 36, def 104, hp 487
- **Ranged** steel_shortbow: dmg 54, aIMs 2394, crit **0.18 (höchste)**, acc 198, **eva 88**, def 64, hp 391
- **Magic** steel_staff: dmg 86, aIMs **2880 (langsamster)**, crit **0.03 (niedrigste)**, acc 170, eva 73, def 59, hp 387, mana 102, manaCost 6

**Begleit-Stats @L30:** Melee dmg 103 / acc 226 / eva 40 · Ranged dmg 71 / acc 234 / crit 0.18 / eva 111 · Magic dmg 100 / **acc 196** / crit 0.03 / eva 75 / mana 109 / manaCost 7.

Lesart: Die Magie-Accuracy-**Kurve** ist unverändert (`offenseSkill·2`; magic acc 170 @L24 = exakt Run5). Der L30-Gewinn kommt **nicht** aus mehr Accuracy, sondern aus dem **manaCost-Cap** (zuverlässiges Vollcasten) — die wirksame Accuracy 196 @L30 reicht jetzt, um die Icemage-Evasion (16) ohne Weak-Cast-Einbrüche zu überspielen. Melee ist über str-Platte + Dolch-Tempo (−500 ms) der **schnellste UND schadensstärkste** Stil geworden; das ist die neue Schieflage.

---

## Top-Stärken

1. **Magie-Delle @L30 geschlossen — die Run5-Hauptbaustelle ist erledigt.** 0,84× → **0,89×**, L30-Spread 1,28× → **1,13×** (engster Wert im ganzen Band). Sauberer Hebel: **manaCost-Cap** (Stäbe 5–10 statt 8–24) → der Magier castet durchgehend voll, statt am evasiven Ziel in den Weak-Melee zu rutschen.
2. **manaCost-Cap ist ein sauberer, nebenwirkungsarmer Gewinn.** Mit Pool 78–120 + Regen läuft Mana im Band nie trocken; kein Frühgame-Weak-Cast-Spiral mehr. Verifiziert: `castManaCost` liest `item.manaCost`, Werte im Content auf 5–10 gedeckelt.
3. **Gear-Leiter Iron/Steel/Blacksteel weiter mustergültig — für alle 3 Stile.** Dolch attack 10/20/30, Kurzbogen ranged+fletching 10/20/30, Stab magic_off+runecrafting 10/20/30. Verlässlicher Craft-Dopamin-Takt, symmetrisch.
4. **Suffix-Craft-System live & korrekt.** Craft-Suffix-Rate **21,4 %** (steel_platebody, ilvl 24, n=4000; Soll 20 % + lck-Mod). Der Drop-Suffix-Pfad ist in `combat.ts` korrekt verdrahtet — er hat im Crypt nur keine Equipment-Quelle (s. P2).
5. **Keine Walls, kein Leerlauf, keine XP-Trichter.** 0 Tode über alle 9 Builds/Checkpoints, monotone Skalierung, lückenlose Crypt-Mob-Leiter L16/24/30.

---

## Priorisierte Findings

### [P1 Balance] str-Platte überschießt → Nahkampf dominiert das Band, am stärksten @L16 (1,44×)
**Befund (Sim):** Mit `str`-tragender Plattenrüstung ist Melee an **jedem** Checkpoint die Spitze: L16 **1,00× (766)** vs ranged 0,69× / magic 0,70× → **Spread 1,44×**; L24 1,23×; L30 noch 1,13× (gleichauf mit Ranged). Quelle: jedes Plattenteil trägt jetzt `modifiers.str` **plus** flachen `bonus.meleeDamage` (iron-Set Helm/Body/Legs: str 1/2/2 = +5 → +7,5 Schaden über `str·1.5`, dazu +1/2/2 flat; steel: str 1/3/+ → +8 Schaden @L24 gemessen). Da `meleeDamage = (1 + str·1.5 + power·0.8 + eq)` ist, addiert sich der str-Plattenbeitrag **on top** der ohnehin schnellsten Dolch-Kadenz (−500 ms). Gegen **niedrig-HP-Mobs** (Warrior 120 HP) springt der Schaden über einen Schlag-Breakpoint (2-shot) → überproportionaler kills/h-Sprung; gegen 220-HP-Mobs verwässert er.
**Persona-Wirkung:** Der Schwertträger räumt im frühen Band **~45 % schneller** als Bogi/Magier — der Spieler, der Fernkampf/Magie wählt, fühlt sich am Übergang spürbar zweitklassig. Genau die Run5-Errungenschaft („Melee nicht mehr Boden, niemand dominiert") ist ins Gegenteil gekippt.
**Fix-Vorschlag (content/balance):** Den str-Plattenbeitrag **dämpfen** (z. B. nur halber `str` auf Body, kein zusätzlicher flat meleeDamage), ODER den flachen meleeDamage von Plattenteilen entfernen und Melee-Schaden allein über `power` skalieren. Ziel: L16-Spread zurück Richtung ≤1,15×. Gegenprobe gegen einen 120-HP-Mob fahren (dort schlägt der Effekt am härtesten durch).
**Δ vs run5:** **Neue Regression.** Run5 hatte @L16 1,10× (±5 %), Melee mid-pack. Der Round-4-Hebel „str-Platte" hat über sein Ziel hinausgeschossen.

### [P2 Loot] „Suffix sichtbar" im Kampf-Pfad nicht eingelöst — 0 Crypt-Mobs droppen Equipment
**Befund (Daten):** Der Drop-Suffix-Mechanismus ist korrekt (`onEnemyDefeated` würfelt `roll.suffixChance ?? DEFAULT_DROP_SUFFIX_CHANCE` auf jedem Equipment-Drop, erzeugt eine Item-Instanz). Aber ein **Scan aller Crypt-Mobs ergibt 0 Equipment-Drops** — sie droppen ausschließlich Material (crude_bone/ore/essence/frost_essence/scarred_hide). Random-Roll-Suffixe kann der Crypt-Grinder daher **nur über eigenes Crafting** sehen (Rate 21,4 % verifiziert), nie aus dem Kampf.
**Persona-Wirkung:** Der „oh, das Schwert hat *des Bären*!"-Sog bleibt dem Kampf-Pfad weiter vorenthalten — der Hauptloop der L15–30-Persona ist der Crypt-Grind.
**Fix-Vorschlag (content):** Ein paar in-band Crypt-Mobs mit (seltenem) Equipment-Loot ausstatten (z. B. skeleton_butcher → ein Knochen-Themen-Item @3 %) ODER die Drop-Suffix-Chance der wenigen bestehenden Equipment-Drops anheben. Falls „sichtbar" UI-seitig gemeint war (Suffix-Name im Tooltip), liegt das außerhalb der Engine/Content-Linse → an ui-dev.
**Δ vs run5:** **Unverändert offen** (war run5 P3). Trotz „Suffix sichtbar"-Zielsetzung im Crypt-Loot nicht angekommen.

### [P3 Balance] Fernkampf weiter ohne Glass-Cannon-Kehrseite (eva 88/111 > Platten-Melee 36/40)
**Befund (Sim):** Trotz „Ranged-Trim" bleibt die Bogen-Evasion **deutlich über** der des Platten-Nahkämpfers: L24 **88 vs 36**, L30 **111 vs 40**. Quelle unverändert: `evasion = 10 + dex·1 + sDefence·0.4 + eq` (`character.ts:238`) — dex ist Super-Stat **und** Leder trägt Evasion. Der „Ranged-Trim" hat im Band weder die Bogen-Evasion noch den Durchsatz erkennbar gesenkt (ranged liegt sauber mid-pack/0,69–1,01×). Da Ranged jetzt **nicht** dominiert, ist die fehlende Kehrseite weniger gravierend — aber die intendierte Stil-Identität (hoher Schaden, geringe Defensive) entsteht weiterhin nicht.
**Fix-Vorschlag:** Leder-/dex-Evasions-Koeffizient für Fernkampf leicht senken, damit die Stile sich unterschiedlich *riskant* spielen, nicht nur in Zahlen angleichen.
**Δ vs run5:** **Unverändert** (war run5 P2). „Ranged-Trim" hier im Band nicht messbar wirksam.

### [P3 Economy] Gold-Knappheit endet früh (bekannt/deferred)
**Befund:** Combat-Gold ungedämpft; on-level-Einkommen wächst klar über die Pflicht-Käufe. Identisch zur Run3–5-Diagnose.
**Status:** Per Chef an die City-Welle gekoppelt (**deferred**). Hier nur band-spezifisch bestätigt.
**Δ vs run5:** Unverändert (deferred).

---

## Persona-Antworten (kompakt)

- **3-Stil-Parität @L16/24/30:** 🟡 **Teilweise.** L30 **1,13×** (bestens), L24 **1,23×** (ok), aber **L16 1,44×** — Melee läuft am unteren Band davon (str-Platte). Nicht mehr durchgängig im ±15 %-Band.
- **Magie-Accuracy gegen evasive Mobs (Icemage L30):** ✅ **Jetzt ok** (0,89×, Spread 1,13×). manaCost-Cap hat die Run5-Delle geschlossen.
- **Suffix-Loot sichtbar im Kampf:** 🟡 **Nein** im Crypt-Pfad (0 Equipment-Drops); Craft-Suffix funktioniert (21,4 %).
- **Pacing / Walls:** ✅ Keine. 0 Tode, 0 Walls, lückenlose Mob-Leiter.
- **Gear-Tiers (Iron/Steel/Blacksteel):** ✅ Mustergültige 10-Level-Kadenz, alle drei Stile.

---

## Δ vs run5 — Status (Übersicht)

| Thema | run5 | run6 |
|---|---|---|
| Magie-Delle @L30 vs evasive Icemage | 🔴 0,84× (P2, „was fehlt für 9,5" #1) | 🟢 **gefixt** — 0,89×, L30-Spread 1,13× (manaCost-Cap) |
| 3-Stil-Spread @L16 | 🟢 1,10× (±5 %) | 🔴 **1,44× — Melee dominiert (str-Platte überschießt, NEU P1)** |
| 3-Stil-Spread @L24 | 🟢 1,22× | 🟡 1,23× (Melee-Überschuss) |
| Worst-case-Spread (Band) | 1,28× (@L30) | 🔴 **1,44× (@L16) — Band breiter geworden** |
| Suffix im Kampf-Pfad sichtbar | 🟡 0 Equipment-Drops | 🟡 **unverändert** 0 Equipment-Drops |
| Suffix-Craft-Rate | ~20,7 % | 🟢 21,4 % |
| Ranged Glass-Cannon-Kehrseite | 🟡 offen (eva > Melee) | 🟡 **unverändert** (Ranged-Trim im Band nicht messbar) |
| Gold-Sink mid | ⏸️ deferred | ⏸️ deferred |
| Tode / Walls | 0 / 0 | 0 / 0 |

---

## Was fehlt für 9,5?

1. **str-Platte zurückdrehen (P1, neuer Top-Blocker).** Den str-/flat-meleeDamage-Beitrag der Plattenrüstung dämpfen, bis der L16-Spread wieder ≤1,15× liegt — sonst ist die in Run5 erkämpfte Parität gegen einen neuen Melee-Überschuss eingetauscht. **Gegenprobe gegen einen 120-HP-Mob** ist Pflicht, weil der Effekt dort am härtesten durchschlägt.
2. **Suffix-Reiz in den Kampf-Pfad bringen.** Mind. ein, zwei in-band Crypt-Mobs mit seltenem Equipment-Loot (oder erhöhte Drop-Suffix-Chance darauf), damit der Crypt-Grinder Random-Rolls **erlebt**, nicht nur erschmiedet.
3. **Stil-Identität schärfen statt nur Zahlen angleichen.** Fernkampf endlich eine Glass-Cannon-Kehrseite geben (eva < Platten-Melee) — der „Ranged-Trim" hat im Band noch keine spürbare Wirkung.
4. **Mitwachsender Gold-Sink** (deferred City-Welle).
5. **Politur:** Mob-Resistenzen (Frost/Burn) im UI sichtbar machen, damit die Burn-Stab-vs-Frost-Mob-Wahl bewusst wird (der manaCost-Cap hat die Magie-Robustheit erhöht, aber die Element-Logik bleibt für den Spieler unsichtbar).

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Onboarding-Flow** — laut MEMORY spätere Meilensteine, nicht bewertet.
- **UI-Anzeige (Suffix-Name im Tooltip, Mob-Resist, Köcher-Munition)** — UI-Revier; reine Engine/Content-Linse hier.
- **Endgame-Skalierung, Slayer-Ökonomie, Packaging** — außerhalb der L15–30-Persona.
- **Sim-Harness** wurde nach dem Lauf wieder **entfernt** (kein Datei-Rückstand in `packages/engine/src/`).
