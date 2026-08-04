# Sweep 3 — 15 · Endgame L50–99, alle 3 Stile (geared)

**Rolle:** Kontrolleur (QA). **Datum:** 2026-07-01. **Methode:** headless SimPlayer/Engine-Sim
(temporäres Vitest-Skript, nach dem Lauf wieder gelöscht) + Verifikation der Balance-Guard-Tests.
**Ziel:** Verifizieren, dass geared Endgame weiter **0 echte Walls** hat (alle Bosse besiegbar),
die **Stil-Parität eng** bleibt und die **neuen Waffen-Werte** Endgame **nicht kaputt/übermächtig**
gemacht haben (godly-Caps eingehalten).

## Ziel erreicht? — JA (mit einem strukturellen Parität-Soft-Spot)
- **0 Walls bestätigt (confirmed).** Jeder der 3 Stile tötet JEDES Endgame-Ziel — inkl. aller 4
  Finalbosse (idol_warden L245, aether_wraith L260, scale_skarn L275, **last_idol L295**) und des
  DoT-immunen Regen-8-Bosses abyssal_devourer L96 — **mit 0 Toden**, sowohl beim omni-maxed als auch
  beim realistischen Combat-Build.
- **godly-Caps eingehalten (confirmed).** maxHit-Werte plausibel (melee 1088, magic 781, ranged
  612+38 Pfeil). Mitigation-Deckel 0,80 + Lifesteal-Deckel 12 abs. sind grün gepinnt
  (`endgame-danger.test.ts`). Der Finalboss wird bei realistischem Gear NICHT trivial one-geshottet
  (TTK last_idol ~4–6 s = mehrere Treffer).
- **Ranged-Buff nicht übermächtig (confirmed).** Die Aufwertung `last_vengeance` rDmg 90→130 hat
  Endgame NICHT gekippt: Ranged ist am Endgame sogar der **schwächste** Stil gegen tanky/Regen-Ziele
  (s.u.) — kein Overshoot.
- **Parität: eng im Kern-Band, aber ein Soft-Spot an den zähesten Zielen.** Im praktischen L50–99-Band
  one-shottet geared alles → throughput-gebunden (Angriffstempo), Stile grob vergleichbar. An den
  **zähesten Deep-Endgame-Zielen** (hohe def / hoher Regen) entsteht eine klare Reihenfolge
  **Magie > Melee > Ranged** (bis ~2× TTK-Unterschied). Strukturell, kein Regress durch den Balance-Pass.

## Verifikation der Guard-Tests (godly-Caps + Stil-Invarianten) — alle grün
`endgame-danger` (5) · `styles` (6) · `ranged-vs-magic` (4) · `style-xp-parity` (3) · `ranged-xp` (1)
· `set-bonus` (3) · `wiring-audit` (2) · `status-coverage` (3) → **27 passed**.
Bestätigt u.a.: Mitigation hart auf 0,80, Lifesteal doppelt gedeckelt (%+abs 12), und dass
**Ranged per Design KEINEN DoT** trägt, Magie schon (`ranged-vs-magic`) — genau die Asymmetrie, die
sich am Endgame als Parität-Soft-Spot zeigt.

## Loadouts (Best-in-Slot je Stil)
- **Melee:** last_judgement (2H) + volles godiron-Set (5 Teile, Set-Bonus aktiv) + eye_of_the_idol +
  last_idol_mantle. maxHit 1088 (maxed) / 1034 (combat), aI 1995 ms.
- **Ranged:** last_vengeance (2H) + godiron_arrow + volles voidhide-Set + eye + mantle. maxHit 612
  (+38 Pfeil), aI 1431 ms.
- **Magic:** last_condemnation (2H) + volles **voidweave**-Set (> godspark bestätigt: magicDmg 22 vs 17)
  + eye + mantle. maxHit 781, aI 1420 ms, Mana 620/Regen 20 → **dauerhaftes Casten** (nie Weak-Melee).

## Evidence — Sim (5-min-Fenster/Ziel/Stil; Zelle = kills/h · TTK · cleanDPS; „Dn"=Tode)
**Omni-maxed (alle Skills 99 — theoret. Ceiling):** — Auszug DPS-gebundener Ziele:
```
                    melee            ranged           magic
skeleton_nekro L90  612 /3.9s/719    660 /5.7s/492    948 /2.8s/1002
charred_doomkn L200 576 /3.9s/687    528 /5.7s/470    708 /4.2s/638
void_titan   L242   372 /5.9s/607    300 /11.4s/314   480 /5.6s/639   <- ranged ~2× TTK
idol_warden  L245   1188/1.9s/579    1644/1.4s/786    2100/1.4s/786
scale_skarn  L275   1044/1.9s/816    1104/4.2s/369    1884/1.4s/1107
last_idol    L295   1092/1.9s/1053   828 /4.2s/476    1092/2.8s/714
```
**Realistischer Combat-Build (Nicht-Kampf-Skills L1 → lck/str niedrig, crit 2,80×):**
```
                    melee            ranged           magic
skeleton_nekro      408 /5.9s/476    372 /7.1s/395    540 /4.2s/668
abyssal_devourer    1020/1.9s/632    876 /4.2s/286    1056/2.8s/429   (Regen8, alle DoT immun)
charred_doomknight  336 /7.9s/339    300 /10.0s/268   456 /5.6s/479
void_titan          216 /17.9s/200   192 /15.7s/228   276 /8.5s/421
idol_warden         924 /1.9s/579    1008/4.2s/262    1620/1.4s/786
scale_skarn         696 /3.9s/397    732 /4.2s/369    996 /2.8s/554
last_idol           516 /3.9s/513    516 /5.7s/351    708 /4.2s/476
```
**0 Tode in ALLEN 60+ Fights (maxed) und allen realistischen Fights.** Kein `!stalemate`/`!outOfAmmo`.

---

## Findings (schwerste zuerst)

### [P3][balance] Endgame-Parität-Soft-Spot: Ranged fällt gegen tanky/Regen-Ziele ~1,5–2× zurück; Magie führt — *confirmed, strukturell (kein Regress)*
- **Repro:** Best-in-Slot je Stil (s.o.), fight vs. void_titan L242 (def 168, regen 6):
  cleanDPS **melee 607 / ranged 314 / magic 639** (ratio 2,04); TTK ranged 11,4 s vs melee 5,9 s /
  magic 5,6 s. Gleiches Muster an charred_doomknight, scale_skarn, last_idol, allen Regen-Mobs.
- **Erwartet:** ~gleiche effektive DPS/kills-h der 3 Stile (Ziel „Parität eng").
- **Tatsächlich:** An den zähesten Zielen klare Reihenfolge **Magie ≳ Melee > Ranged**. Ursache
  (strukturell, `ranged-vs-magic.test.ts` pinnt es): Melee (bleed) und Magie (burn) tragen einen
  **DoT-Waffeneffekt**, der Rüstung UND Gegner-Regen umgeht; die godly-Bögen (last_vengeance,
  voidwing_greatbow, spectral_longbow) haben **keinen** weaponEffect → reiner Direktschaden, der von
  Top-Def (Mitigation bis 0,80) am härtesten beschnitten wird und Regen nicht durchbricht. Zusätzlich
  hat Magie am Endgame Mana-Sustain (Regen 20 > Verbrauch) → castet dauerhaft.
- **NICHT vom aktuellen Balance-Pass verursacht** (der HOB ranged/magic früh/mittig; die Endgame-
  Asymmetrie ist älter). Kein Wall — nur ein Parität-Skew an der Spitze.
- **Empfehlung (Chef-Zahlen erwünscht):**
  1. `last_vengeance` einen leichten Ranged-DoT/Effekt geben, z.B. `weaponEffect: { type: "bleed",
     chance: 0.40, magnitude: 30, durationMs: 7000 }` (thematisch „Blutungspfeil") → schließt die
     Armor/Regen-Lücke gegen Tanks, ohne Trash-Farming (dort one-shot) zu verschieben. Alternativ
     rDmg 130→150.
  2. Optional Gegenzug für Magie-Übergewicht an Regen-Zielen: `voidweave`-Set critDamage 0,18→0,15
     ODER burn-magnitude der godly-Staff leicht senken — nur falls Magie nach Fix 1 noch vorn liegt.

### [P3][balance] Omni-maxed: lck→critDamage stapelt auf 4,28× (+63–78% Crit) → selbst der Finalboss wird one-geshottet — *confirmed, minor/optional*
- **Repro:** Alle Skills 99 (inkl. fishing/foraging/thieving → lck 79). critDamage = 1,5 + lck·0,02 +
  eq → **4,28×**, critChance melee 63,5 % / magic 78,5 %. last_idol (2000 HP) fällt bei melee in ~1
  Crit (TTK 1,9 s). Beim realistischen Build (lck 5) sinkt es auf 2,80× und TTK last_idol ~4–6 s
  (mehrere Treffer) — **dann angemessen**.
- **Bewertung:** Betrifft nur den „alles-99"-Vollmaxer; trifft alle Stile gleich (kein Parität-Effekt).
  Ist der theoretische Endgame-Ceiling — Power-Fantasy vertretbar, aber die lck-Kopplung an
  critDamage macht das Aushängeschild-Ziel (Finalboss) trivial.
- **Empfehlung (optional):** lck-Beitrag zu critDamage entkoppeln/senken (z.B. `lck·0,02`→`0,01`) oder
  critDamage hart deckeln (z.B. ≤ 3,5×). Nicht dringlich.

### [P3][ux/info] Endgame-Gold/XP-Inflation sichtbar, aber **bekannt & akzeptiert** — nur Bestätigung
- last_idol gibt xp 58000 + gold 2500/Kill; kills/h 4-stellig → enormer Durchsatz. Laut Briefing
  „bekannt & akzeptiert", daher **kein Bug** — nur zur Vollständigkeit vermerkt.

## Top 3
1. **0 Walls bestätigt** — alle 4 Finalbosse + DoT-immuner Regen-Boss von allen 3 Stilen tötbar,
   0 Tode, maxed UND realistisch. Endgame ist geared clean clearbar.
2. **godly-Caps eingehalten & Ranged-Buff nicht übermächtig** — Mitigation/Lifesteal-Deckel grün,
   Finalboss bei realistischem Gear nicht 1-Hit; der ranged-Waffen-Buff hat Endgame nicht gekippt.
3. **Parität-Soft-Spot Ranged (P3):** an den zähesten Zielen liegt Ranged ~1,5–2× hinter Magie/Melee,
   weil sein godly-Bogen keinen DoT trägt (Armor+Regen-Bypass fehlt). Fix-Vorschlag: DoT-weaponEffect
   auf `last_vengeance` (bleed 0,40/30/7 s) oder rDmg 130→150.
