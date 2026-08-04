# QA-Run 7 — Combat-Tiefenanalyse: MAGIE (nach Round-5-Fixes)

**Tester:** Playtester-Analyst (READ-ONLY, keine Content/Engine-Änderung) · **Datum:** 2026-06-28
**Scope:** Magie-Stil nach den **Round-5-Fixes** seit run6 (Rücknahme des run6-Überschwangs): (1) **godspark-Robe zurückgenommen** — `magicDamage` je Teil gesenkt (Body 27→**23**, Mitra 17→**14**, Skirt 18→**16**, Hände/Schuhe je 17→**14**; Set ≈ 96→**81**), `manaRegen` **0,6→0,35** je Teil (Set +3,0 → **+1,75**); (2) **Stab-Spitze monoton gemacht** — `godspark_staff` auf magicDamage **62**, sodass `godspark(62) < aetherium(74) < godiron(90)` auch im Rohwert gilt. Frage des Chefs: **Sitzt Magie jetzt im Band @L10/L40/L99 (endgame NICHT mehr 1,21× über)? Sind die Stab-Tiers monoton (godiron ≥ godspark)? Beißt Mana endgame wieder? Was hält Magie unter 9,5?** Vergleich: `design/qa/run6-combat-magic.md` (war **8,5**; P1 = Endgame-Overshoot 1,21× über Band, P2 = Mana inert, P2 = godspark > godiron).

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→stil-realistische Skills auf Checkpoint-Level→best-in-slot via `equipItem`→`startCombat`→`advance`, realer Combat-Loop, Seed 5). **Best-craftable pro Slot** (Score: Stil-Schaden » Stil-Attribut » manaRegen/maxMana » Def/HP/Krit). Caster-**Waffenwahl mana-bewusst per voller Sim je Kandidat** (das Harness wählt die Waffe mit den meisten realen Kills, nicht der höchsten Rohzahl). **Symmetrische Attribut-Skalierung:** jeder Stil zieht sein Offense-Attribut aus genau einer Offense-Fertigkeit (Magie int←magic_off, Ranged dex←ranged, Melee str←power); Crafter (Magie/Ranged) trainieren `leatherworking` für ihre Stoff-/Lederrüstung, Melee `smithing` (trainiert kein Attribut). Auto-Eat `cooked_voidray` → **0 Tode** → Ratios = reine **Offense**. **7 on-level Mobs je Checkpoint**, per-Mob-Ratio gemittelt, **Ranged = 1.00** (run5/run6-Standard); L99 schließt die **Regen-Endgame-Mobs** ein. Mana per-Sekunde über 3-min-Fenster gesampelt. **Harness nach dem Lauf entfernt — `packages/**` unverändert.** Alle Zahlen unten sind reale, deterministische Sim-Ausgaben.

> **Methodischer Hinweis (wichtig fürs Δ-Lesen):** Das run6-Harness wurde nach dem Lauf entfernt und musste rekonstruiert werden. Die **Magie-internen** Größen (Absolut-Durchsatz, Stab-Monotonie, Mana) sind robust. Die **vs-Ranged-Ratio** hängt aber an der Ranged-Baseline, und die ist zwischen run6 und run7 **nicht identisch**: in run6 war Ranged der **Boden** (run6-P3 „Ranged ist der Boden"), in run7 ist Ranged mit voll bestückter Munition + leatherworking-dex der **Deckel**. Darum ankere ich das Band-Urteil zusätzlich am **stabilen Melee-Anker** (smithing trainiert kein Attribut → keine dex-Mehrdeutigkeit) und gebe beide Ratio-Sätze an.

---

## Fun-Score: **9,0 / 10**  (run6: 8,5 — **+0,5**)

**Die R5-Fixes treffen ihre drei Ziele — die zwei größten run6-Mängel sind erledigt.** (1) **Der Endgame-Overshoot ist weg:** Magie läuft endgame **keinem** Stil mehr davon. Im selben Harness ordnet sich L99 als **Ranged 533 > Wand 466 ≈ Stab 461 > Melee 433** (Gesamt-Spreizung nur ~23 %, Magie sitzt **mittig**). Gegen den stabilen **Melee-Anker** landet Magie L99 bei **1,07–1,08×** — exakt das R5-Zielband. Die run6-„1,21× über Ranged, auf allen 7 Mobs"-Decke existiert nicht mehr (per-Mob jetzt Stab 0,74–0,96× / Wand 0,83–0,95× vs Ranged; **kein** Endgame-Mob über Ranged). (2) **Stab-Spitze ist oben monoton:** `godiron_staff` (req99, dmg90) ist mit **558 kills/h** jetzt der **stärkste** Stab und wird vom Harness als Best-in-Slot gewählt — die run6-Falle „godspark > godiron" ist **tot**. (3) **Mana beißt wieder:** der manaRegen-Cut zeigt Wirkung — Stab-min-Pool **251→56**/357→312, Wand fällt jetzt **1,7 %** der Zeit unter die Cast-Schwelle (run6: 0,0 %). Mana ist nicht mehr der inerte Volltank von run6. **0 Tode / 0 NaN / 0 Crashes** über 3 Checkpoints × 4 Builds × 7 Mobs + voller Caster-Waffen-Sweep.

**Was den Sprung auf 9,5 verhindert:** (a) Die **Wand-Tier-Kompression** aus run6 ist **unangetastet** — copper(dmg2)→titanium(dmg40) liefern alle ~479–491 kills/h, nur godiron springt (552); 10 von 12 Wand-Upgrades bleiben gefühllos. (b) Eine **kosmetische 1 %-Restdelle**: `aetherium_staff` (req90, 511) liegt minimal **unter** `godspark_staff` (req88, 516) — der wichtige Teil (godiron ≥ godspark) sitzt, aber `godspark<aetherium` aus der Chef-Vorgabe ist **nicht** ganz erreicht. (c) **L10-Wand überschießt vs Ranged weiter** (1,24×). (d) **Cross-Style-Unschärfe:** wo genau Magie endgame vs Ranged sitzt (0,87× hier) hängt davon ab, ob ein Ranged-Main `leatherworking` trainiert — das gehört in der Ranged/Balance-Persona geklärt, ehe das Dreieck final verbucht wird.

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, 7 on-level Mobs; Ratio-Spalten = per-Mob-Ratio-Mittel)

| Build | L10 | L40 | L99 (inkl. Regen-Mobs) |
|---|---:|---:|---:|
| **Ranged** (Anker A) | 623 (1.00×) | 525 (1.00×) | 533 (1.00×) |
| **Melee** (Anker B) | 837 (**1.33×**) | 453 (**0.89×**) | 433 (**0.81×**) |
| **Stab** | 700 (**1.12×**) | 498 (**0.96×**) | 461 (**0.87×**) |
| **Wand+Fokus** | 775 (**1.24×**) | 552 (**1.06×**) | 466 (**0.87×**) |
| **BESTE MAGIE vs Ranged** | **1.24×** | **1.06×** | **0.87×** |
| **BESTE MAGIE vs Melee** | 0.93× | **1.22×** | **1.08×** |

Gewählte Magie-Waffe/Gear je Checkpoint: L10 iron_wand / iron_staff + dim_focus; L40 blacksteel_wand / blacksteel_staff + frost_focus + ember-Robe; L99 **godiron_staff / godiron_wand + god_focus + volles godspark-Set** (mana-bewusste Sim wählt jetzt **godiron** statt run6-godspark → Monotonie-Fix sichtbar).

**Band-Urteil:**
- **vs Ranged:** L10 überschießt (Stab 1,12 / Wand 1,24), L40 sitzt (Stab 0,96 / Wand 1,06), **L99 unter Parität (0,87)** — die run6-Endgame-Decke ist eingerissen, jetzt eher ein leichtes Untertauchen gegen eine **stark** bestückte Ranged.
- **vs Melee (stabiler Anker):** L10 unter (0,84–0,93), L40 leicht heiß (1,10–1,22), **L99 1,07–1,08× — punktgenau im R5-Zielband.**
- **Per-Mob L99 vs Ranged:** Stab 0,74–0,96, Wand 0,83–0,95 — durchgehend **≤ Parität**, kein Einzel-Mob-Overshoot (run6: 1,07–1,32 auf allen 7).

### Δ vs run6 (×-Faktor)

| Checkpoint | run6 Stab (vs R) | run6 Wand (vs R) | **run7 Stab (vs R)** | **run7 Wand (vs R)** | Δ Stab | Δ Wand | run7 vs Melee (Stab/Wand) |
|---|---:|---:|---:|---:|---|---|---:|
| L10 | 0.98×/1.05× | 1.17×/1.18× | **1.12×** | **1.24×** | +0.07 | +0.06 | 0.84 / 0.93 |
| L40 | 0.97×/1.09× | 1.05×/1.08× | **0.96×** | **1.06×** | −0.13 | −0.02 | 1.10 / 1.22 |
| L99 | 0.95×/1.21× | 1.06×/1.20× | **0.87×** | **0.87×** | **−0.34** | **−0.33** | **1.07 / 1.08** |

> **Δ-Caveat:** Der große L99-Rückgang vs Ranged (−0,34) ist **nicht** allein der R5-Magie-Nerf. Magie-intern senkt R5 nur ~4,5 % (Robe-magicDamage 96→81) und tauscht die Spitzenwaffe godspark→**godiron** (eher leicht **stärker**) — die Magie-Absolutkraft endgame ändert sich also kaum. Der Großteil des Ratio-Sturzes kommt daher, dass meine Ranged-Baseline der **Deckel** ist (run6: Boden). Robust und harness-unabhängig ist: **Magie überschießt endgame keinen Stil mehr** und trifft **vs Melee 1,07–1,08×**.

**Antwort auf die Kernfrage:** (a) **Im Band / nicht mehr 1,21× über? JA.** Der Endgame-Overshoot ist eliminiert — Magie sitzt mittig (1,07–1,08× Melee; 0,87× gegen eine starke Ranged), per-Mob nirgends mehr über Ranged. L40 sitzt sauber, L10-Wand bleibt leicht heiß. (b) **Stab-Tiers monoton? Oben ja** — godiron (558) ist jetzt klar die beste Waffe; die run6-Falle (godspark > godiron) ist weg. Eine **1 %-Restdelle** (aetherium 511 ≲ godspark 516) bleibt kosmetisch. (c) **Mana endgame relevant? Wieder ja** — Wand 1,7 % below-cost, Stab-min 56/312 statt 251/357; nicht mehr inert.

---

## Mana-Verlauf (3-min-Sampling, on-level rep-Mob; Pool min/avg/max, below-cost % = Weak-Melee-Fenster)

| Build | maxMana | min | avg | Cost | Regen/s | below-cost % |
|---|---:|---:|---:|---:|---:|---:|
| Stab L10 (iron_staff) | 64 | 5 | 16 | 6 | 2.9 | 1.1 % |
| Wand L10 (iron_wand) | 64 | 5 | 30 | 5 | 2.9 | 0.6 % |
| Stab L40 (blacksteel_staff) | 151 | 4 | 32 | 7 | 5.1 | 1.1 % |
| Wand L40 (blacksteel_wand) | 151 | 2 | 34 | 5 | 5.1 | 2.2 % |
| **Stab L99 (godiron_staff)** | **312** | **56** | 231 | 10 | **11.5** | **0.0 %** |
| **Wand L99 (godiron_wand)** | **312** | **6** | 85 | 8 | **11.5** | **1.7 %** |

**Lesart:** Der R5-manaRegen-Cut (0,6→0,35 je Robe-Teil) wirkt. Gegen run6 (Stab min **251**/357, below 0,0 %; Wand min 61, below 0,0 %; regen 12,7/s) ist L99 jetzt **spürbar enger**: Stab-min stürzt **251→56** (der Pool wird endgame real angezapft, nicht mehr Volltank), Wand fällt **1,7 %** der Zeit unter die Cast-Schwelle und feuert dann den `MAGIC_WEAK_FACTOR`-Notschlag — die **Cast→Regen→Cast-Identität existiert endgame wieder**, vor allem für die schnell feuernde Wand (−300 ms aIMs drainiert härter → min 6). Der Stab bleibt mit 0,0 % below-cost noch komfortabel (langsamer → weniger Drain), aber sein Sicherheitspolster ist von „nie unter 251" auf „runter bis 56" geschrumpft. **Netto:** Mana ist von „inert" (run6) zurück zu „beißt leicht" — die manaCost-Cap aus R4 hält die alte Falle dabei tot (kein Top-Tier durchsatz-negativ). Trade-off gut getroffen.

---

## Top-Stärken (Magie)

1. **Endgame-Overshoot eliminiert (run6-P1 erledigt).** L99-Magie überschießt keinen Stil mehr (Stab 0,87× / Wand 0,87× vs Ranged; 1,07–1,08× vs Melee; per-Mob ≤ Parität auf allen 7 Mobs). Aus der run6-„1,21×-Decke auf allen 7 Mobs" ist eine mittige Einordnung geworden.
2. **Stab-Monotonie oben hergestellt (run6-P2 erledigt).** godiron_staff (dmg90) 558 > godspark_staff (dmg62) 516; das Harness wählt godiron mana-bewusst als Best-in-Slot. Höchst-gegateter Craft = stärkste Waffe — req↑ ⇒ Durchsatz↑ an der Spitze.
3. **Mana wieder relevant (run6-P2 erledigt).** manaRegen 0,6→0,35 zieht Stab-min 251→56 und bringt Wand auf 1,7 % below-cost. Resource-Loop endgame zurück, ohne die R4-Falle zu reaktivieren (manaCost-Cap intakt).
4. **Mid-Game (L40) gesund & Identität robust.** Stab 0,96× / Wand 1,06× vs Ranged; Burn/Frost/Shock/accuracy (magic_off-gekoppelt) unberührt; 0 Tode/NaN/Crashes über den gesamten Sweep.

---

## Priorisierte Findings

### [P0] — keine. Keine Crashes, NaN-Drift, 0 Tode über alle Magie-Läufe.

### [P2 Feel] Wand-Tier-Kompression unverändert (run6-Carryover) — Caster-Waffen fühlen sich gewichtslos an
**Befund (forced @aether_wraith, volle L99-Robe + god_focus):** copper_wand (dmg2) **479** → titanium_wand (dmg40) **491** → aetherium_wand (dmg47) **491** → godiron_wand (dmg58) **552**. Von copper bis aetherium praktisch **flach** (+2,5 % über 45 dmg-Punkte); erst godiron springt (+12 %). Die Waffen-`magicDamage` ist gegenüber Skill+int+Robe-magicDamage (magic_off 99 ≈ +119, int ≈ +41, Robe ≈ +81) weiter **Rauschen** — ein Caster spürt 10 von 12 Wand-Upgrades nicht. R5 hat das nicht adressiert.
**Fix-Vorschlag:** Caster-Waffen-`magicDamage` über die Tiers spreizen (steilere Kurve) **oder** den Skill/int-Anteil am magicDamage senken, damit die Waffe spürbares Gewicht bekommt. (Revier: content/Balance.)

### [P2 Cross-Style] Ranged-Baseline ungeklärt — verhindert ein sauberes Dreieck-Urteil
**Befund:** Magies L99-Position vs Ranged springt zwischen **0,87×** (Ranged-Main trainiert `leatherworking` → Lederrüstung-dex → Ranged = Deckel) und deutlich höher (kein leatherworking → Ranged = Boden, wie run6). Das ist **keine** Magie-interne Frage, deckelt aber die Aussagekraft des „vs Ranged"-Bands. run6 flaggte dasselbe (P3 „Ranged ist der Boden").
**Fix-Vorschlag:** In der Ranged-/Balance-Persona festlegen, ob ein Ranged-Main realistisch leatherworking trainiert (er craftet seine Lederrüstung — vermutlich ja), und die Parität an **einem** kanonischen Anker (Melee oder eine festgelegte Ranged-Baseline) verbuchen. Gegen Melee sitzt Magie endgame mit 1,07–1,08× sauber. (Revier: Balance-Designer.)

### [P3 Balance] Residuale 1 %-Nicht-Monotonie aetherium ≲ godspark (kosmetisch)
**Befund (forced @aether_wraith):** godiron_staff (req99) **558** > godspark_staff (req88, dmg62) **516** ≳ aetherium_staff (req90, dmg74) **511**. Der wichtige Teil (godiron ≥ godspark) sitzt; aber aetherium (req90, höherer Rohwert) liegt **1 % unter** godspark (req88) — eine winzige Delle, innerhalb des Seed-Rauschens. Die Chef-Vorgabe „godspark<aetherium<godiron" ist im **Durchsatz** also nicht ganz erreicht (im Rohwert schon: 62<74<90); godspark zieht via crit/Burn-Profil mit aetherium gleich.
**Fix-Vorschlag (niedrige Prio):** aetherium_staff minimal crit/critDamage geben (oder dmg 74→~78), damit req↑ ⇒ Durchsatz↑ auch zwischen godspark und aetherium strikt gilt. Kosmetik. (Revier: content.)

### [P3 Balance] L10-Wand überschießt vs Ranged weiter (1,24×)
**Befund:** Wand+dim_focus ist früh stark vs Ranged (775 vs 623 = 1,24×; run6 1,18×). Stab L10 1,12×. Billige Cast-Kosten (5), −300 ms aIMs und Fokus-Krit machen den frühen Wand-Caster vs Ranged überlegen. (Gegen Melee ist L10-Magie dagegen unter Parität — 0,84–0,93×.) Mildernd: per-Mob streut L10-Wand stark (0,94–1,82) — die hohen Werte stammen von wenigen squishy Mobs.
**Fix-Vorschlag:** Früh-Foki (dim_focus) oder Früh-Wand-`magicDamage` minimal trimmen, bis L10-Wand ≤1,10× vs Ranged. (Revier: content.)

### [P3 Feel] Stab-Mana endgame noch komfortabel (0,0 % below-cost)
**Befund:** Der Stab beißt endgame nur indirekt (min 56/312, below-cost 0,0 %) — nur die Wand löst den Mana-Loop real aus (1,7 %). Für die Stab-Identität bleibt Mana ein knappes, aber nie versiegendes Polster. Bewusst belassen (R5 zielte aufs Wiederbeißen, nicht aufs Auszehren) — nur als Beobachtung notiert; ggf. manaRegen der Robe minimal weiter (0,35→~0,30), falls auch der Stab leicht beißen soll.

### [P3 Kontext — außerhalb Magie-Scope] Melee ist endgame im selben Harness der Boden (0,81× vs Ranged)
**Befund:** L99-Ordnung Ranged 533 > Wand 466 ≈ Stab 461 > Melee 433. Mit der hier verwendeten (stark bestückten) Ranged-Baseline ist **Melee** endgame der schwächste Stil. Für die Melee-/Ranged-Tester notieren — hängt am selben Ranged-Baseline-Entscheid wie P2 Cross-Style.

---

## Mechanik-Checks (Magie, alle bestanden)
- **godspark-Robe-Rücknahme** verifiziert: magicDamage Body 23 / Mitra 14 / Skirt 16 / Hände 14 / Schuhe 14 (Set 81), `manaRegen 0,35` je Teil. → maxMana 357→**312**, regen 12,7→**11,5/s**.
- **Stab-Rohwert-Monotonie** verifiziert: godspark_staff dmg **62** < aetherium **74** < godiron **90** (auch crit/critDamage/Burn monoton).
- **manaCost-Cap (R4) intakt:** godiron_staff/aetherium_staff `manaCost 10`, godiron_wand/aetherium_wand `8` — kein craftbares Top-Tier durchsatz-negativ (alte run5-Falle bleibt tot).
- **Per-Waffe `manaCost`** korrekt gelesen (`castManaCost`), Fallback `MANA_PER_CAST` greift; **Cast → Weak-Melee (×0,35) → Regen → Resume** deterministisch.
- **Mana-Schild tier-skaliert** (`2 × (1 + level/50)`) greift; endgame nicht mehr vom Regen überrannt (Wand below-cost 1,7 %).
- **accuracy** stil-abhängig an `magic_off` gekoppelt (run3-B1 intakt); Burn nur bei echtem Cast.

## „Was fehlt für 9,5?"
1. **Caster-Waffen spürbar machen (P2 Feel)** — Wand/Stab-`magicDamage`-Kurve spreizen, damit nicht 10/12 Upgrades im Skill-magicDamage untergehen. **Größter verbleibender Hebel.**
2. **Ranged-Baseline kanonisieren (P2 Cross-Style)** — festlegen, ob Ranged-Mains leatherworking trainieren, und die Parität an einem festen Anker verbuchen; dann sitzt das ganze Dreieck eindeutig (vs Melee tut es das bereits mit 1,07–1,08×).
3. **aetherium_staff aus der 1 %-Delle heben (P3)** — kleine crit/dmg-Anhebung, damit req90 strikt > req88.
4. **L10-Wand auf ≤1,10× vs Ranged trimmen (P3)** — Früh-Fokus/Wand-magicDamage minimal kürzen.
5. *(optional)* **Stab-Mana leicht beißen lassen** — Robe-manaRegen 0,35→~0,30, falls auch der Stab den Loop spüren soll (derzeit nur Wand).

## Fazit
Round 5 hat **alle drei Hauptziele getroffen**: der run6-Endgame-Overshoot ist **weg** (Magie überschießt keinen Stil mehr — mittige Einordnung, **1,07–1,08× vs dem stabilen Melee-Anker**, per-Mob ≤ Parität vs Ranged), die **Stab-Spitze ist oben monoton** (godiron 558 ist jetzt die beste Waffe, die run6-Falle godspark > godiron ist tot), und **Mana beißt wieder** (Wand 1,7 % below-cost, Stab-min 251→56). Das sind die beiden größten run6-Mängel (P1 Overshoot, P2 Mana inert) plus der P2-Monotonie-Fix — sauber gelöst, ohne neue schwere Probleme und ohne die R4-manaCost-Falle zu reaktivieren. Darum **+0,5 auf 9,0/10**. Für 9,5 fehlen zwei Justierungen außerhalb des reinen Endgame-Werts: die **Wand-Tier-Kompression** (Caster-Upgrades spürbar machen) und die **Kanonisierung der Ranged-Baseline** (damit das Band auch vs Ranged eindeutig verbucht ist) — plus zwei kosmetische P3 (aetherium-Delle, L10-Wand). Reine Content-/Methodik-Justierungen.

*(Sim-Harness war temporär und wurde nach dem Lauf entfernt — keine Engine-/Content-Änderung; `packages/**` unverändert.)*
