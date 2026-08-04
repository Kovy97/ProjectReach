# QA Run 7 — Endgame L75–99 (R5-Balance: Melee-1H-Trim, godspark zurück, Greatsword-Crit)

**Playtester:** Endgame-Analyst, Persona L75–99. Methode: **echte Engine-Simulation** (Temp-Harness `packages/engine/src/_run7harness.test.ts`, danach entfernt) — voll gemaxter Held (ALLE 21 Skills auf 99, damit auch runecrafting/leatherworking/slayer-Equip-Reqs greifen), fünf BiS-Loadouts, je 1 h Auto-Battle (`cooked_voidray` + Auto-Eat) gegen das Endgame-Band L82–120 inkl. Slayer-Etage 5. Slayer-Anforderungs-Items im Inventar (sonst Schein-Wall via `canFightMonster`).
**Datum:** 2026-06-28
**Fokus (Chef-Kernfrage Run 7):** 3-Stil @L99 jetzt **enger im Band** (Melee-1H-Decke runter + Ranged-Boden hoch)? R5-Hebel verifizieren: str-Doppel weg (Melee-1H runter), godspark zurück (Magie endgame ~1,08?), Greatsword-Crit linienweit, GEARED_HERO-Sim-Fix. Bleibt **Faceroll-Endgame + fehlender Quest-Bogen** der strukturelle 9,5-Blocker?
**Vergleich:** `design/qa/run6-endgame-l75-99.md` (Fun **8,5** — Ranged 0,65× über-getrimmt, Melee-1H-Decke, 0 Walls).

## Fun-Score: 8,5 / 10 (Δ vs run6: **+0,0** — die Hebel sind richtig gerichtet, aber zu zaghaft)

Die R5-Tunings sind **directionally korrekt, aber zu klein, um die Kernfrage mit „Ja" zu beantworten.** Der einzige echte Gewinn ist **Magie: godspark-Robe zurück → Stab von 0,80× auf 0,83× und damit gefestigter klarer #2** (kein Stil mehr unter „Halbkraft-Verdacht"). Der Rest ist Rauschen: Die **Stil-Spanne ist von 0,345 auf 0,331 geschrumpft — 0,014, innerhalb der Mess-Streuung.** Beide strukturellen Pole der Kernfrage stehen unverändert: **Melee-1H bleibt die Decke bei 1,00×** (der „str-Doppel weg"-Trim senkte den Roh-Schaden 547→513, aber der 800-ms-aIMs-Floor + Lebensraub fängt das ab → Durchsatz nur −1,6 % im Bandmittel), und **Ranged bleibt der Boden bei 0,67×** — praktisch **unangetastet** (1492→1501 k/h). Die explizite Annahme der Kernfrage „Ranged-Boden behoben" trifft **nicht** zu: Fernkampf liegt weiter allein am Boden, 0,09 unter dem nächstschwächsten Stil.

Warum trotzdem stabil 8,5 und kein Rückschritt: Nichts ist kaputtgegangen, Magie ist messbar besser, **0 Walls / 0 Tode / 0 Crashes**. Warum kein 8,6+: Die zwei seit Run 5 bekannten strukturellen Löcher — **Faceroll-Endgame** (Capstone `last_idol` fällt Melee in 2,4 s, härtester Slayer-Mob `abyssal_devourer` mit enrage ×2,0 in 1,9 s) **und der fehlende Endgame-Quest-Bogen** — sind **komplett unberührt**. Das ist und bleibt der 9,5-Blocker.

---

## 3-Stil-Parität @L99 — „jetzt enger im Band?" → NEIN, Spanne quasi gleich (0,345 → 0,331)

Durchsatz-Verhältnis vs Melee-1H (Referenz 1,00×), gemittelt über die 10 Open-World-Mobs L84–120, **direkt run6↔run7 (gleiche Mob-Menge, gleiches Harness-Prinzip):**

| Stil | Ø run6 | Ø run7 | Δ | Stand |
|---|---|---|---|---|
| **Melee 1H (Schwert/Schild)** | 1,000× | **1,000×** | — | Decke, unverändert #1 |
| **Magie (godiron_staff + godspark-Robe)** | 0,800× | **0,832×** | **+0,033** | klarer #2 (echter R5-Gewinn) |
| **Magie (Wand+Fokus)** | 0,791× | **0,804×** | +0,013 | #3 |
| **Melee 2H (Großschwert)** | 0,750× | **0,760×** | +0,010 | #4, weiter Durchsatzfalle |
| **Fernkampf (Langbogen+Voidhide)** | 0,655× | **0,669×** | +0,014 | **Boden, faktisch unangetastet ⚠** |

**Spanne run6: 0,345 → run7: 0,331.** Das Band hat sich um **0,014** zusammengezogen — innerhalb der Streuung, kein Paritäts-Fortschritt. Das `0,9–1,1×`-Ziel ist weit entfernt: 4 von 5 Stilen liegen 0,67–0,83×, nur Melee-1H steht oben. Der +0,014-Anstieg bei Ranged/2H ist **kein Buff**, sondern reiner Ratio-Effekt der minimal gesenkten Melee-1H-Basis (Nenner kleiner → Quotient leicht höher). Absolut hat sich Ranged **nicht bewegt** (s. u.).

**BiS-Helden-Stats (computeStats, alle Skills 99 — verifiziert):**
- Melee 1H: dmg **513** (run6 547) / HP 3078 / def 676 / acc 977 / crit 52 % / critDmg 2,48 / **aIMs 800**
- Melee 2H: dmg 658 / HP 2953 / def 608 / crit 52 % / **critDmg 2,78** (Greatsword-Crit aktiv) / **aIMs 1265**
- Ranged: dmg **393** (run6 390) / HP 2139 / def 326 / crit 49 % / **aIMs 1000** — praktisch identisch zu run6
- Magie-Stab: dmg 398 / acc 1038 / crit 60 % / aIMs 800 / **Mana 312 / Regen 11,5/s**
- Magie-Wand+Fokus: dmg 386 / acc 1127 / **Mana 357 / Regen 11,5/s**

---

## R5-Hebel einzeln verifiziert (Sim-belegt)

**1. „str-Doppel weg → Melee-1H runter" → gelandet, aber wirkungsarm.** Melee-1H-Roh-Schaden 547→513 (−6 %). Durchsatz im Bandmittel aber nur **2291→2254 k/h (−1,6 %)** — der 800-ms-aIMs-Floor + Lebensraub absorbiert den Trim fast vollständig. Auf Trivial-Mobs greift er stärker (roc_void 2895→2532, −13 %), am Capstone gar nicht (1541→1526). **Netto: die Decke steht weiter bei 1,00×.** Den Roh-Schaden zu senken, ohne den aIMs-Floor anzufassen, verschiebt die Decke nicht.

**2. „godspark zurück → Magie endgame ~1,08" → Magie verbessert, aber „1,08" deutlich überzeichnet.** godspark-Robe (5× manaRegen 0,35 + magicDamage) liefert: Magie-Stab **0,832× Ø**, am Capstone **0,89×**. Die `1,01×`-Marke wird **nur** am leichtesten Mob (roc_void L84) erreicht; über das Band ist Magie weiter durchgängig **unter** Melee. „~1,08×" ist im echten Kampf nicht reproduzierbar — realistisch ist „solider, gefestigter #2 bei ~0,83×". Das ist der **einzige substanzielle R5-Gewinn**.

**3. „Greatsword-Crit linienweit" → gelandet, marginal.** 2H critDmg 2,78 (vs 1H 2,48), Greatsword `critDamage 0.30` aktiv. Durchsatz 0,750→0,760×. Der **aIMs-1265-Floor** (vs 1H 800) frisst das Crit-Premium weiter auf. 2H bleibt **Durchsatzfalle** — Build-Diversität nicht hergestellt.

**4. „GEARED_HERO-Sim-Fix" → committetes Harness deckt nur Melee.** `sim.ts` GEARED_HERO ist auf `combatLevel: 99` korrekt (run5-Fehlkalibrierung behoben). **Aber:** es setzt nur `COMBAT_SKILL_IDS` auf 99 und equippt nur Godiron-**Melee**. Magie-/Ranged-BiS (godspark/voidhide, req `runecrafting`/`leatherworking` 99) würde im Repo-`runReport` **nicht equippen** → die committete Wall-Erkennung validiert weiter nur den Melee-Pfad. Mein Temp-Harness setzt alle 21 Skills 99 und deckt alle fünf Loadouts (P3, s. u.).

---

## Echte Walls mit gearedem Held → weiterhin 0 Walls (unverändert)

Kampf-Matrix (alle Skills 99, BiS je Stil, je 1 h). Zelle = Kills/h:

| Mob | Lv | Melee-1H | Melee-2H | Ranged | Magie-Stab | Magie-Wand |
|---|---|---|---|---|---|---|
| roc_void | 84 | 2532 | 1846 | 1977 | 2546 | 2009 |
| gravecliff_specter | 87 | 2487 | 1788 | 1889 | 2150 | 2018 |
| voidhusk_crusher | 90 | 2562 | 1866 | 1551 | 1904 | 2005 |
| idol_warden | 92 | 2541 | 1849 | 1543 | 1972 | 2046 |
| abyssal_tide_serpent | 96 | 2527 | 1819 | 1410 | 1839 | 1957 |
| aether_wraith | 98 | 2538 | 1844 | 1521 | 1972 | 2018 |
| charred_doomknight | 101 | 1975 | 1602 | 1453 | 1754 | 1647 |
| scale_skarn | 104 | 1982 | 1632 | 1457 | 1686 | 1642 |
| void_titan | 110 | 1868 | 1589 | 1165 | 1492 | 1425 |
| **last_idol (Capstone)** | **120** | **1526 · 2,4s** | 1170 | 1043 · 3,5s | 1362 | 1304 |
| dread_knight (Slayer-E5) | 82 | 2954 | 1863 | 2005 | 2651 | 2044 |
| soul_flayer (Slayer-E5) | 86 | 2586 | 1861 | 1985 | 2185 | 2022 |
| void_herald (Slayer-E5) | 90 | 2561 | 1862 | 1502 | 1944 | 1954 |
| **abyssal_devourer (Slayer-E5)** | **96** | **1881 · 1,9s** | 1652 | 1199 | 1557 | 1622 |

**Ergebnis: 0 Walls, 0 Tode.** Jeder Build besiegt jeden Mob inkl. Capstone und härtestem Slayer-Mob. `abyssal_devourer` (enrage ×2,0, regen 8) fällt Melee in **1,9 s**, `last_idol` (regen 14, enrage ×1,75) in **2,4 s**. Die flachen regen/enrage-Werte sind gegen 400–550 Spieler-DPS weiter wirkungslos. **Vollständig unverändert ggü. run5/run6.**

---

## Findings

### [P1] Kernfrage verfehlt: Ranged-Boden NICHT behoben — Fernkampf bleibt allein am Boden (0,67×)
Ranged-Durchsatz run6→run7 **1492→1501 k/h (+0,6 %, im Rauschen)** — der Stil wurde faktisch nicht angefasst. Mit 0,669× liegt er 0,09 unter dem nächstschwächsten Stil (2H 0,76×) und 0,16 unter Magie. Der +0,014-Ratio-Anstieg ist nur Nebeneffekt der gesenkten Melee-Basis, kein Ranged-Buff. An def-/eva-starken Mobs bricht er weiter weg (void_titan 1165, abyssal_devourer 1199). **Die R5-Runde hat den in run6 als #1-Loch markierten Ranged-Boden schlicht ausgelassen.**
**Fix:** rangedDamage der Top-Bögen / ammoDamage gezielt **+15–20 %**, Ziel Ranged ~0,82–0,85× (gleichauf mit Magie). Das ist der einzige Hebel, der die Spanne real verengt.

### [P1] Melee-1H-Decke steht weiter bei 1,00× — falscher Hebel gezogen (Roh-Schaden statt Tempo)
Der „str-Doppel weg"-Trim senkte den Roh-Schaden, aber der **800-ms-aIMs-Floor** (vs 2H 1265, Ranged 1000) ist die eigentliche Ursache der 1H-Dominanz und blieb unberührt → Durchsatz nur −1,6 %. Solange schnelle 1H + Lebensraub am 800-ms-Floor liegen, ist 1H die Decke, egal wie man den Roh-Schaden trimmt.
**Fix:** aIMs-Floor stil-differenzieren (1H höher, z. B. 1000 ms; 2H niedriger) ODER Lebensraub-Skalierung am Endgame deckeln. Roh-Schaden weiter zu senken bringt nichts.

### [P2] Faceroll-Endgame unverändert — kein Stil trifft auf eine Wall (struktureller 9,5-Blocker, bestätigt)
`last_idol` 2,4 s, `abyssal_devourer` (enrage ×2,0, regen 8) 1,9 s. Flache regen/enrage-Checks (3–14/s) sind gegen 400–550 DPS wirkungslos. Der Höhepunkt eines ~100-h-Aufstiegs ist ein **gelöstes Spiel ohne einzige Herausforderung**. **Eigenes Feature, nicht durch Balance-Tuning lösbar** — bestätigt als einer der zwei 9,5-Blocker.
**Fix:** %-/max-HP-skalierter regen/Schild, DPS-Soft-Enrage-Timer ODER beißender Stil-Resist für ≥1 Capstone-Encounter. (Combat-FX lt. Memory späterer Meilenstein — hier als reines Struktur-Gate gemeint.)

### [P2] Fehlender Endgame-Quest-Bogen unverändert (struktureller 9,5-Blocker #2, bestätigt)
Kein Quest-Objective zielt auf `last_idol`/Idol-Sanktum/Godiron-Forge/Slayer-Thron (run6-Holistik: höchstes `reach_*` ≤ total 150). Die gesamte hintere Bogenhälfte L50→99 ist quest-still; das Endgame hat weder narrativen Pull noch Krönung. **Eigenes Feature — der zweite 9,5-Blocker, unberührt von R5.**

### [P2] Suffix-Endgame-Drops via Kampf weiter ohne Oberfläche (unverändert)
Endgame-Mobs (inkl. Slayer-E5) droppen nur Materialien; einziger Equip-Drop bleibt der L40-`aether_runestaff` vom Capstone. Der 8-%-Drop-Suffix + minIlvl-70-Tier erreichen das Endgame nur über Crafting. (Aus run6 unverändert übernommen — in dieser Linse nicht neu gemessen, da kein R5-Hebel daran rührte.)

### [P3] 2H-Melee bleibt Durchsatzfalle (0,76×) trotz Greatsword-Crit
critDmg 2,78 hebt 2H nur auf 0,760× — der aIMs-1265-Floor frisst das Crit-Premium. Build-Diversität (1H↔2H) weiter nicht gegeben.
**Fix:** an den stil-differenzierten aIMs-Floor (P1) koppeln statt weiter Crit/Schaden draufzulegen.

### [P3] Committetes GEARED_HERO-Harness validiert nur den Melee-Pfad
`sim.ts` setzt nur Kampf-Skills 99 → Magie-/Ranged-BiS (req runecrafting/leatherworking 99) equippt im Repo-`runReport` nicht; die automatische Wall-Erkennung deckt damit Ranged/Magie nicht ab. Empfehlung: im Geared-Harness alle Equip-relevanten Skills auf 99 setzen (oder `equipItem`-Fehlschlag laut machen), damit künftige Sweeps alle drei Stile automatisch prüfen.

---

## Δ vs run6 — Zusammenfassung

| run6-Aussage/Loch | Status run7 |
|---|---|
| Ranged 0,65× über-getrimmt (run6-P1) | **NICHT behoben** — 0,669×, absolut unverändert (1492→1501 k/h); Kernfrage-Annahme verfehlt |
| Melee-1H-Decke 1,00× | **unverändert** — str-Trim senkt Roh-Schaden, Durchsatz −1,6 %; aIMs-Floor nicht angefasst |
| Magie 0,80× knapp unter Ziel (run6-P2) | **VERBESSERT** — godspark zurück → 0,832×, gefestigter #2 (einziger echter R5-Gewinn; „1,08×" überzeichnet) |
| 2H 0,74× Durchsatzfalle (run6-P3) | **marginal** — Greatsword-Crit → 0,760×, aIMs-Floor bleibt limitierend |
| Spanne 0,345 | **0,331** — −0,014, im Rauschen, kein Paritäts-Fortschritt |
| 0 Walls / Capstone-Faceroll (run6-P2) | **unverändert** — last_idol 2,4 s, abyssal_devourer 1,9 s |
| Endgame-Quest-Bogen fehlt (run6) | **unverändert offen** |
| Suffix-Drop ohne Endgame-Oberfläche (run6-P2) | **unverändert** |

**Fun: 8,5 → 8,5 (+0,0).** R5 hat einen Stil (Magie) sauber gefestigt und nichts kaputt gemacht — aber die Kernfrage „enger im Band" ist **nicht** erreicht (Spanne −0,014), der Ranged-Boden wurde übersehen, die Melee-Decke mit dem falschen Hebel adressiert, und beide strukturellen 9,5-Blocker stehen unberührt.

---

## Was fehlt für 9,5?

1. **Ranged-Boden endlich heben (P1, höchste Balance-Priorität).** rangedDamage/ammoDamage der Top-Tiers +15–20 % → Ranged ~0,83×. Dies wurde in R5 ausgelassen und ist die einzige Maßnahme, die die Spanne real verengt. Sonst spielt ein Viertel der Spieler weiter den klaren Boden-Stil.
2. **Melee-1H-Decke über das Tempo lösen, nicht über Roh-Schaden (P1).** Stil-differenzierter aIMs-Floor (1H ↑, 2H ↓) — bringt 1H runter UND 2H aus der Durchsatzfalle in einem Hebel, und macht die `0,9–1,1×`-Bandbreite erstmals erreichbar.
3. **Eine echte Endgame-Wall bauen (P2, eigenes Feature — 9,5-Blocker #1).** last_idol UND abyssal_devourer müssen einen gerüsteten Helden fordern: %-/max-HP-skalierter Schild/regen, DPS-Timer oder beißender Stil-Resist. „Endgame" mit 1,9–2,4 s/Kill auf jedem Boss ist ein gelöstes Spiel.
4. **Endgame-Quest-Bogen (P2, eigenes Feature — 9,5-Blocker #2).** Narrativer Pull L70/85/99 → Forge/Sanktum/Capstone/Slayer-Thron + `reach_*`-Etappen über die hintere Bogenhälfte. Krönt den Aufstieg, den heute niemand führt.
5. **Suffix-Endgame-Oberfläche + 2H-Premium + Slayer-80–99-Sink (P2/P3).** Low-chance Equip-Drops auf L96–120 + Slayer-E5-Bosse; L40-Capstone-Drop ersetzen.

**Einordnung der zwei 9,5-Blocker (bestätigt):** Punkt 3 (Faceroll-Wall) und 4 (Quest-Bogen) sind **eigene Features, keine Tuning-Aufgaben** — sie sind der Grund, warum auch ein perfekt paritätisches Band das Spiel nur auf ~9,2 trägt. R5 zeigt das Muster der letzten Runden: Die Feinjustage (Magie) wird sauber gezogen, aber die **strukturellen Endgame-Features** und die **konsequente Stil-Parität** (Ranged-Boden + 1H-Tempo-Decke) bleiben die offene Distanz zwischen 8,5 und 9,5.
