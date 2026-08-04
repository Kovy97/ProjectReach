# Combat-Sweep 3 — Triage (Ziel: schwer aber fair, Prep [Rüstung/Food/Potions] muss sich lohnen)
Status: 5/9 Tester zurück. FUNDAMENTAL: 0 Engine-Bugs, „schwer aber fair" durchgehend ERREICHT. Alle Findings = Balance-Tuning (balance-designer/content-dev), keine Blocker.

## Zurück (5/9)
- **melee-2h-maul:** SHIP. 2H-Glass-Cannon (+25% DPS) + Prep-nötig ✅. **Armor-Pen-Nische spät:** Crossover mob-def≈20, echter Payoff erst >L90 (void_titan def170); Maul-Basis-DPS 2-5% UNTER Greatsword → verliert auf ungepanzerte Ziele. Hebel: armorPen rauf ODER Band-Armor-Mob-defense rauf.
- **ranged-L90:** SHIP. 4 Endbosse 0-Tode voll geprept (3549 Kills/0 Tode/12h); ohne Prep 169-310 Tode. One-Shot-Cap greift, fair. **Precision unter-getunt:** Ranged-Acc 82 überstrahlt Gegner-Evasion (max 53); precision 25% nur +6.6pts, ~0% Netto-Durchsatz. **Auto-Trank (bloodmend 220=Voll-Refill/5s) → 0 Tode sogar OHNE Rüstung** → Ausführung trivial sobald gefüttert (Rüstung=Kill-Tempo, nicht Überleben).
- **magic-L15:** SHIP. It2.1 wirkt: Magier braucht früh Food (5/6 Mobs Tode ohne Food), Ward-Self-Sustain-Nische eng (nur schnelle Low-HP-Kills food-frei). DoT umgeht Ward (→HP). Wand+Focus schlägt Staff @L15 (wardBreak-Diff vernachlässigbar bei kleinen Gegner-Ward-Pools).
- **magic-L45:** SHIP. Typ-Mob Food ~nicht nötig, tanky/DoT Food nötig. **wardBreak quasi-tot @mid:** Gegner-Ward-Pool (0.3·maxHp=16-26) < ein Treffer → 1-2 Hits egal welcher wardBreak. **F2 (logic-dev, BUG-ARTIG): combatLevel (dungeon.ts:26) nutzt defence+vitality, schließt `warding` AUS → reiner Magier ~11 CL unter Melee/Ranged, maxt ~CL75 statt 99. Rename-Übersehen magic_def→warding → warding in defensiveBase falten.** F3: kein non-slayer ward-Caster @L40-55, kein in-band non-slayer DoT-Mob für Magier.
- **ranged-L15:** SHIP. Prep Pflicht (nackt=Suizid 130 T/h, nur-Food/nur-Leder je 16-36 T/h, Leder+Food=0). Fair (max Einzeltreffer 9 von 41 HP → Pech-One-Shot unmöglich). **Longbow > Shortbow an JEDEM Mob** (eagleEye-Öffnungskrit + precision); Shortbow-Tempo kompensiert nicht → Shortbow braucht Nische. L10-evasionRating-Trim behoben (Dodge 42%).

## Wiederkehrende Balance-Themen (für balance-designer/content-dev, nach allen 9)
1. **CL-Parität-Bug (logic-dev):** `warding` nicht in combatLevel → Magier zu niedrig. FIX-Kandidat.
2. **Konter-Achsen unter-wirksam:** precision (Ranged, Acc zu hoch), wardBreak (Gegner-Ward-Pool zu klein). → Gegner-Evasion/Ward-Pool endgame anheben.
3. **Maul armor-pen spät** + Maul-Basis-DPS < Greatsword.
4. **Food dominiert über Rüstung** als Überlebenshebel; Auto-Trank macht Ausführung trivial (geprept). → Chef-Call: soll Rüstung mehr Überleben kaufen / Auto-Trank-Heal/Threshold-Deckel?
5. **Longbow>Shortbow**, Wand>Staff low-band — Sidegrade-Balance je Waffentyp.
6. **Content-Lücken:** ward-Caster + non-slayer-DoT-Mob in mittleren Bändern.

## Nachtrag (6/9)
- **magic-L90:** SHIP. 4 Bosse 0-Tode voll geprept; Food auf 3/4 nötig (It2.1 härter als It2). Voller Ward → HP nie berührt (fair, One-Shot-Cap→Ward-Chain). **wardBreak = TOTES FEATURE bestätigt:** max Monster-Ward im ganzen Spiel = 92 (≤2.3× ein Treffer, kein Regen) → wardBreak-TTK-Delta 0.0s, gegen größten Pool sogar KONTRAPRODUKTIV. Fix: einem Endgame-Boss großen Ward-Pool (~350+) geben, DANN wird wardBreak der spürbare Konter — ODER Stat streichen. Owner balance/combat-dev. → **Thema #2 (wardBreak) jetzt 2× bestätigt (L45+L90), harter Kandidat.**

## Nachtrag (7/9)
- **melee-2h-greatsword:** SHIP. #231 bestätigt: DPS-Prämie ×1.25-1.26 alle Bänder, EHP-Malus wächst mit Tier (1H +47/+71/+104% tankiger). Glass-Cannon-Feel ✅ (schneller on-tier, squishiger, over-level 2H 11-55 Tode vs 1H 0-9). Fair-mit-Prep/hart-ohne ✅. Killbar vs alle 3 Typen (kein Konter = brute-force, grindig vs ward). P2 LOW: L90-DPS-Ratio ×1.26 knapp über §6-Deckel ≤×1.25 (optional aetherium/godiron-damageMax-Trim). **P3 (content): Endgame-Heiltrank-Lücke — dedizierte Potions capen bei h24 (~13% L90-HP), dann Sprung auf godbloom 46 / bloodmend 220 (Voll-Heal) → Auto-Trank ist L90 entweder fast nutzlos ODER God-Mode. Kein Mid-Endgame-Trank.** P4: non-tower-Coverage-Lücke (kein farmbarer ward-Mob L18-85, kein armor-Mob ~L90 außerhalb Turm für Nicht-Slayer).
### Neues Thema #7: Endgame-Heiltrank-Leiter kaputt (h24→46→220-Sprung) → Auto-Trank binär nutzlos/God-Mode. (content-dev, hängt mit Thema #4 Auto-Trank zusammen.)
### Neues Thema #8: Content-Coverage — kein non-slayer/non-tower ward-Mob (L18-85) + armor-Mob (~L90); mehrfach geflaggt (magic-L45 F3, greatsword P4). (content-dev)

## Nachtrag (8/9)
- **ranged-L45:** SHIP. Prep nötig+lohnend (unprepared 134 T/h, jede Prep-Achse einzeln → 0 Tode; Heal=Überlebenshebel #1, Leder=Effizienz-Hebel #1 ×3 Sustain). Fair (max Einzeltreffer 21% HP, One-Shot-Cap bindet nie). **precision bestätigt wirksam** (skaliert mit Gegner-Evasion: eva30 → 51.9%→56.5% hit). Ranged unter Stress der SICHERSTE Stil (0 Tode vs Magic 19). Longbow>Shortbow (+7-11%). F1: kein freier ward-Mob L45 (nur slayer-tower-gated) = Thema #8. 
### THEMA #9 (Chef-Entscheid): „on-level zu leicht" — mit voller Prep 0 Tode gegen JEDEN on-level-Mob; Schwierigkeit ist Ressourcen/Uptime-Kosten, kein Todesdruck. Echter Druck erst over-level. Mehrfach (ranged-L45 F3, ranged-L90 „Ausführung trivial gefüttert", greatsword). Chef wollte „schwer aber fair" — ist FAIR, aber evtl. zu leicht wenn geprept. → Chef-Call: on-level härter (Mob-Damage/Enrage rauf, Auto-Trank-Deckel) ODER Prep-Gating als „schwer" akzeptieren?

## Nachtrag (9/9 — KOMPLETT)
- **melee-1h+Schild:** SHIP. Consumables hart Pflicht (Rüstung allein stirbt überall on-level; nackt = 11-14s Tod). Food+Trank ZUSAMMEN überleben harten over-level-Kampf wo jedes einzeln stirbt (= Chef-Fantasie erfüllt). Fair (One-Shot-Cap bindet, max Treffer on-level 9-16% HP). Schild-Identität real+skalierend (No-Food-TTD +58/+120/+122% mit Schild, ~0 kph-Kosten). Alle 3 Typen killbar. **Precision ist der SICHTBARE Melee-Konter** (Dolch +18-20% vs evasion), armorPen kaum (+0-5.5%), wardBreak fehlt Melee ganz.
### ★ THEMA #0 (WICHTIGSTE — trifft Chef-Ziel direkt): RÜSTUNGS-PFLICHT ERODIERT ab L45+
Bei L45/L90 überlebt **nackt+Food+Trank** on-level → Rüstung wird Durchsatz/Ökonomie-Wahl statt Leben/Tod (Preis der Nacktheit: ~4× Consumable-Verbrauch, −25% kph). Nur @L15 stirbt nackt zuverlässig. URSACHE: flache tier-skalierte Heil-Werte + One-Shot-Cap → sobald nackte maxHp groß genug, ersetzt Food/Trank-Flut die Mitigation. Chef wollte „mit Rüstung UND Essen UND Tränken vorbereiten MÜSSEN" — Food/Tränke sind Pflicht ✅, aber Rüstung nicht mehr ab Mid. FIX: **Heilung als %maxHp statt flach** (+ ggf. Auto-Trank-Durchsatz-Cap / bloodmend 220-Voll-Refill entschärfen) → Nacktheit nicht mehr weg-heilbar, Rüstung bleibt Pflicht. Owner balance-designer→content-dev. Verbindet #4/#7/#9.

---

# FAZIT 9/9 — alle SHIP, 0 Engine-Bugs, „fair" voll erreicht. Priorisierte Fix-Liste:
1. **★ #0 Rüstungs-Pflicht erodiert (Heilung flach→%maxHp)** — trifft Chef-Ziel direkt. balance-designer→content-dev.
2. **#1 Magier-Kampflevel-Bug** — `warding` fehlt in combatLevel (dungeon.ts:26) → Magier ~11 CL zu niedrig, maxt ~CL75. Klarer Fix. logic-dev.
3. **#2 wardBreak totes Feature** (2× bestätigt L45+L90) — max Monster-Ward 92. Endgame-Boss großen Ward-Pool (~350+) geben ODER Stat streichen. balance/content-dev.
4. **#3/#4 Konter-Kurven:** precision unter-wirksam für Ranged (Acc zu hoch); armorPen unsichtbar bis ~L150 (Kurve vorziehen ODER als Endgame-Stat dokumentieren). balance-designer.
5. **#8 Content-Coverage:** kein non-slayer ward-Mob L18-85, kein armor-Mob ~L90 außerhalb Turm. content-dev.
6. **#7 Endgame-Heiltrank-Leiter** (h24→46→220-Sprung → Auto-Trank binär). content-dev.
7. **#5 Waffen-Sidegrades:** Longbow>Shortbow, Wand>Staff, Maul<Greatsword auf soft targets. balance/content-dev.
8. **#P4 Melee kein wardBreak-Konter** (asymmetrisch) — optional geweihte Ward-Break-Rune/Waffe für Melee.
