# QA-Run 7 — Mid-Game Playtest (Level 25–60), nach Parität-R5 (str-Doppelzählung entfernt, godspark zurück)

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code geändert) · **Datum:** 2026-06-28
**Scope:** Mid-Game L25–60. **Kernfrage:** sitzen nach R5 alle 3 Stile @L30/40/55 im Band 0,90–1,10× — ist der Melee-mid-Überschuss aus run6 (L40 **1,144×** heiß) weg, ohne neuen Boden/Decke?
**R5-Hebel (im Code verifiziert):** (1) **`smithing trains:"str"` ENTFERNT** → str-Doppelzählung Melee weg, str-Backbone gear-/power-basiert (mid-relevant); (2) **godspark-Roben zurück** (magicDamage 14/23/16/14/14, manaRegen 0,35, staff critDamage 0,12) — req85–88 = **endgame, mid-irrelevant**; (2b) Stab-Monotonie; (4) **Greatsword critDamage 0,30 linienweit** (alle 12 Tiers, **mid-relevant**). Verifiziert: `content.skills.smithing` trägt **kein** `trains` mehr; godspark-Werte exakt wie R5-Spec.
**Methode:** Temporäres Engine-Harness (`packages/engine/src/_run7tmp.test.ts`, **nach der Analyse entfernt**, `packages/**` unverändert). Identisch zur run6-Methodik für saubere Δ: gleiche Skill-Basis für alle drei Stile (Kampf- **+** 5 Gear-Crafting-Skills `smithing/fletching/leatherworking/jewelcrafting/runecrafting` auf L; woodcutting **un**gesetzt → wie run6), best-craftbares Gear per **effDPS-Greedy** über alle Slots inkl. Waffe+Munition (2 Pässe), dann **realer 1h-Kampf-Sim der echten combat.ts** gegen je 3 on-level Mobs, ø der per-Mob-kills/h-Ratio (cancelt Mob-HP), Ranged = 1.00. Uniform `cooked_voidray`, Auto-Eat T3 → 0 Tode → Ratios = reine **Offense**. Melee in **Attack**-Stance (Untergrenze) **und** **Power**-Stance (Obergrenze) gemessen. **Zusätzlich ein within-harness A/B** (smithing→str AN/AUS in derselben Pipeline) → der str-Hebel-Delta ist damit **harness-invariant** belegt, nicht nur cross-run interpoliert.

---

## Fun-Score: **8.5 / 10** (run6: 8,0)

**Der Kern-Auftrag ist im Wesentlichen erfüllt: der run6-Melee-mid-Überschuss ist weg.** Melee L40 **1,144 → 0,959** (Attack) bzw. **1,111** (Power), L55 **1,078 → 0,986 / 1,108** — die heiße Spitze ist gebrochen, beide mid-Checkpoints sitzen in Attack-Stance **zentriert** und in Power-Stance nur noch **hauchdünn** über Band (+0,01 statt run6 +0,04…+0,18). Magie und Ranged sind auf **allen drei** Checkpoints im Band (Magie 1,009 / 1,027 / 1,053; Ranged = Referenz). 0 Tode, keine Walls, keine Trivialität (≥ ~2,7 s/Kill). Die **eine Zeile** (`smithing trains:"str"` raus) hat exakt getan, was R5 versprach: der A/B-Hebel-Delta ist sauber ×0,830 / 0,870 / 0,932 (L30/40/55), und die „mit smithing→str"-Variante reproduziert run6 eng (0,972 / 1,103 / 1,058 vs run6 0,955 / 1,144 / 1,078) → **Harness validiert, R5-Diagnose bestätigt**.

**Warum nicht höher:** R5 hat den Melee-mid-Buckel gekappt, aber an zwei Stellen **am unteren Rand überkorrigiert** und einen run6-Nebenbefund **verschärft**. (a) **Melee L30 fällt unter Band** — 0,807× (so wie der effDPS-Optimierer wählt) bzw. 0,900× (beste reale Schnellwaffe). R5 prognostizierte L30 ×0,99 („smithing-str früh vernachlässigbar"); **gemessen ×0,830** — die **Richtung der Prognose stimmt, das Ausmaß nicht**, denn der relative str-Verlust ist am **kleinsten** Roh-Schaden (L30) am **größten**. (b) **Der R5-Greatsword-crit-Buff (0,30 linienweit) vertieft die run6-P2-effDPS-Falle:** der Optimierer wählt nun `blacksteel_greatsword` (real 0,807× wegen 2H-Trägheit gegen evasive Mobs) statt des realen Optimums `blacksteel_dagger` (0,900×) → das parität-„neutral" gemeinte Diversitäts-Hebel **drückt den gemessenen Melee-L30-Wert zusätzlich**. (c) **Melee bleibt stance-wackelig:** Attack zentriert L40/L55 aber dippt L30; Power hebt L30 ins Band aber schiebt L40/L55 auf 1,11 → nie über **beide** Stances **und** alle drei Level sauber zentriert. Netto: der run6-Hauptbefund ist gelöst und alles ist enger, aber das Band-Versagen ist **von Melee-mid-heiß (L40) zu Melee-low-kalt (L30) gewandert** — gleiche Anzahl Treffer (8/9), neuer Ort.

---

## Gemessene 3-Stil-Parität (Kern-Auftrag)

### Realer 1h-Kampf-Sim (echte combat.ts, ø per-Mob-kills/h-Ratio, ranged = 1.00) — Ground Truth, Attack-Stance
| Level | Melee (effDPS-Pick) | Ranged | **Magie** | Tode | im Band 0,9–1,1? |
|---|---|---|---|---|---|
| **L30** | **0,807** | 1,000 | **1,009** | 0/0/0 | ✗ nur **Melee** unter Band; Magie ✓ |
| **L40** | 0,959 | 1,000 | **1,027** | 0/0/0 | ✓ alle drei im Band |
| **L55** | 0,986 | 1,000 | **1,053** | 0/0/0 | ✓ alle drei im Band |

**8 von 9 Stil-Checkpoints im Band — einziger Ausreißer: Melee L30 (0,807× nach Optimierer-Wahl).** Magie ist auf **allen drei** drin, Ranged ist Referenz. Der run6-Ausreißer (Melee L40 1,144× über Band) ist **eliminiert**.

### Melee Attack- vs Power-Stance (Unter-/Obergrenze) — Melee ist stance-abhängig
| Level | Attack (effDPS-Pick) | Attack (beste Schnellwaffe = Dolch) | Power (effDPS-Pick) | Power (Dolch) |
|---|---|---|---|---|
| **L30** | 0,807 | **0,900** | 0,982 | **1,076** |
| **L40** | 0,959 | 0,959 | 1,111 | 1,111 |
| **L55** | 0,986 | 0,986 | 1,108 | 1,108 |

> Ein Min-Maxer kämpft in **Power**-Stance (Melee-Schaden ×1,12; Ranged/Magie bekommen **keinen** dmgMult → ihr Optimum ist Attack/Accuracy). Realistische Melee-Decke: L40/L55 **≈ 1,11** (knapp über Band), L30 mit Dolch **1,076** (im Band). Konservative Untergrenze (Attack): L40/L55 zentriert, L30 dippt. → Melee sitzt **nie** über alle Stances+Level zugleich zentriert; die Stance-Spreizung (L30 0,81…1,08; L55 0,99…1,11) ist der Rest-Wackler.

### Within-harness A/B (smithing→str AN/AUS, identische Pipeline) — Hebel-Delta harness-invariant
| Level | mit smithing→str (run6-äquivalent) | R5 (entfernt) | Hebel-Delta | run6-Report (Referenz) |
|---|---|---|---|---|
| **L30** | 0,972 | **0,807** | ×0,830 | 0,955 |
| **L40** | 1,103 | **0,959** | ×0,870 | 1,144 |
| **L55** | 1,058 | **0,986** | ×0,932 | 1,078 |

**Die „mit smithing→str"-Spalte reproduziert run6 eng** (0,972/1,103/1,058 vs 0,955/1,144/1,078) → das Harness ist mit run6 konsistent, der Hebel-Delta (×0,83/0,87/0,93) ist die belastbare, harness-invariante Aussage: **R5 wirkt genau dort am stärksten, wo run6 am heißesten war (L40), und am schwächsten wo es ohnehin grenzwertig war — kappt aber L30 stärker als nötig.**

### Gewählte Loadouts (Auszug, effDPS-Greedy)
- **L30** Melee `blacksteel_greatsword`(effDPS-Falle!) + steel/iron-Platte · Ranged `blacksteel_shortbow`+`blacksteel_arrow` · Magie `bramble_witchstaff` + frost-Roben
- **L40** Melee `mithril_dagger` + mithril-Platte · Ranged `mithril_shortbow`+`mithril_arrow` · Magie `mithril_wand` + ember-Roben
- **L55** Melee `adamantium_dagger` + adamantium-Platte · Ranged `adamantium_shortbow`+`adamantium_arrow` · Magie `adamantium_wand` + aether-Roben

---

## Δ vs run6

| Checkpoint | Melee run6 → run7 (Attack) | Magie run6 → run7 | Bewertung |
|---|---|---|---|
| **L30** | 0,955 → **0,807** (Dolch 0,900) | 1,051 → 1,009 | **Über-Korrektur:** Melee von zentriert → unter Band |
| **L40** | **1,144 → 0,959** | 1,017 → 1,027 | **run6-Hauptbefund GELÖST** (heiß → zentriert) |
| **L55** | 1,078 → **0,986** | 0,985 → 1,053 | Melee von oberem Rand → zentriert; Magie oberer Rand |

- **run6-P1 „Melee mid über Band" GELÖST.** Die str-Doppelzählung war die Wurzel (run6: smith-Main bekam str aus power **und** smithing). EINE Zeile raus → Melee L40 1,144→0,959, L55 1,078→0,986. A/B bestätigt: der Effekt ist der str-Hebel, nichts anderes.
- **Nebenwirkung: Melee L30 jetzt unter Band** (0,807 / 0,900). Der relative str-Verlust ist am kleinsten Roh-Schaden (L30) am größten — R5s „früh vernachlässigbar" (×0,99) trifft nicht zu (gemessen ×0,830).
- **R5-Greatsword-crit-Buff (0,30 linienweit) hat die run6-P2-effDPS-Falle vertieft:** der Optimierer wählt L30 nun den `blacksteel_greatsword` (real 0,807) statt des Dolchs (0,900). Der als „parität-neutral" deklarierte Diversitäts-Hebel ist es für die **naive effDPS-Optimierung nicht** — er drückt den gemessenen Melee-L30-Wert.
- **Magie mid stabil im Band, leicht steigender Trend** (1,009→1,053). godspark (req85) erscheint **nie** mid → R5s godspark-Rückdrehung ist **mid-neutral** (bestätigt: mid-Magie nutzt frost/ember/aether-Roben + Craft-Wand). manaCost-Cap (R4) hält.
- **Spreizung:** worst-case paarweise = Magie/Melee @L30 = 1,053/0,807 = **1,31×** (mit Dolch-Melee 1,053/0,900 = 1,17×). Gegenüber run6 (max 1,14× @L40) **nicht verbessert** — die Spreizung ist nur **vom oberen ans untere Ende gewandert** (L40-heiß → L30-kalt).

## Δ vs R5-Prognose (`balance-3style-parity-r5.md §3`)

R5 sagte mid voraus: Melee L30 **1,05**, L55 **1,00**; Magie L30 **1,05**, L55 **1,07** (Ranged=1,00).
Gemessen (Attack): Melee **0,807** (L30) / **0,986** (L55); Magie **1,009** / **1,053**.

- **Magie: Prognose getroffen** (L55 1,07 vs 1,053; L30 leicht drunter) — im Band, Auftrag erfüllt.
- **Melee L55: Prognose getroffen** (1,00 vs 0,986).
- **Melee L30: Prognose verfehlt.** R5 erwartete 1,05 (Hebel-Delta ×0,99), gemessen 0,807 (Delta ×0,830). R5 hat den L30-str-Beitrag der Doppelzählung **unterschätzt** und den eigenen Greatsword-crit-Hebel **nicht als effDPS-Fallen-Verstärker** mitgedacht. Beide drücken L30 unter Band.

---

## Priorisierte Findings

### [P0] — keine
Keine Abstürze, keine Walls, keine Trivialität (alle Sims ≥ ~2,7 s/Kill), **0 Tode** in 3 Stilen × 3 Checkpoints × 3 Mobs. Stabilität einwandfrei.

### [P1 Balance] Melee L30 unter Band — R5 hat am unteren mid-Rand überkorrigiert
**Befund (Ground Truth):** Melee L30 real **0,807×** (effDPS-Optimierer-Wahl) bzw. **0,900×** (beste reale Schnellwaffe `blacksteel_dagger`) — unter Band. Within-harness-A/B: der str-Hebel zieht L30 um **×0,830** (nicht R5s prognostizierte ×0,99). Ursache: der relative str-Verlust ist am kleinsten Roh-Schaden (L30) am größten; R5s „früh vernachlässigbar" gilt **absolut** (wenige str-Punkte), aber **relativ** dominiert es den frühen Schaden. **Mildernd:** in Power-Stance (DPS-optimal) ist L30 mit Dolch **1,076** (im Band) — der Unter-Band-Befund ist teils ein Attack-Stance-Artefakt, aber die effDPS-Optimierer-Wahl (Greatsword) bleibt auch in Power nur 0,982.
**Fix-Richtung (content, klein & zielgenau auf req ≤ ~32):** Der str-Backbone ist für L40/L55 jetzt richtig — **nicht** den globalen str-Hebel zurücknehmen (sonst kippt L40/L55 wieder heiß). Stattdessen einen **früh-mid-lokalen** Melee-Top-up: z.B. den `modifiers.str` der **steel/blacksteel-Platte** (req ~20–30) leicht anheben **oder** den frühen blacksteel-1H-`meleeDamage` minimal (+2…+4) → hebt nur req≤32-Melee, lässt mithril/adamantium (L40+) unberührt. Ziel: Melee L30 → 0,95–1,0 (Attack).

### [P1 Balance] R5-Greatsword-crit-Buff (0,30 linienweit) vertieft die effDPS-Waffenfalle
**Befund:** R5 Hebel 4 legte `critDamage 0,30` auf **alle** Greatsword-Tiers (war: nur godiron req99). Mid wählt der effDPS-Optimierer dadurch den `blacksteel_greatsword` (effDPS-„optimal" via Krit), real verliert der aber wegen 2H-Trägheit (650 ms aIMs-Strafe) gegen evasive Mobs: **0,807×** vs Dolch **0,900×** (−0,09 allein durch Waffenwahl). Der als „parität-neutral" deklarierte Diversitäts-Hebel ist es für naive Optimierung **nicht** — er verstärkt run6-P2 und drückt den gemessenen Melee-L30-Wert spürbar. (run6 P2 war noch P2; durch R5 ist es Band-relevant geworden → P1.)
**Fix-Richtung (content):** Den R4-2H-aIMs-`×0,6`-Buff (bisher auf godiron-Tier) explizit auch auf die **mid**-2H-Greatswords (steel/blacksteel/mithril) ziehen, damit die jetzt crit-starken Greatswords **real ihrem effDPS folgen** — dann ist die Greatsword-Wahl kein Real-Verlust mehr und der Diversitäts-Hebel wirklich neutral. Alternativ: den Greatsword-critDamage erst ab mid-Tier greifen lassen (statt copper→godiron). **Empfehlung:** 2H-aIMs auf mid ziehen (löst P1 **und** gibt der 2H-Identität echte Zähne).

### [P2 Balance] Melee stance-wackelig — nie über beide Stances + alle Level zentriert
**Befund:** Attack-Stance zentriert L40/L55 (0,96/0,99), dippt aber L30; Power-Stance hebt L30 ins Band (1,076), schiebt aber L40/L55 auf **1,108–1,111** (knapp über Band, +0,01). Die Stance-Spreizung (L30 0,81…1,08 / L55 0,99…1,11) bedeutet: Melee ist je nach gewählter Stance entweder am unteren oder am oberen Bandrand, nie sauber mittig. **Deutlich milder als run6** (dort Power-L40 ~1,28), aber der Rest-Wackler.
**Fix-Richtung:** Nach den P1-Fixes (L30-Top-up + 2H-Falle) Melee in **beiden** Stances re-messen; falls Power-L40/L55 weiter +0,01 über Band, ist das tolerierbar (Min-Maxer-Decke am Rand), kein eigener Hebel nötig.

### [P2 Balance] Magie mid leicht top-heavy steigend (1,009 → 1,053), godspark endgame ungeprüft
**Befund:** Magie steigt L30→L55 von 1,009 auf 1,053 (im Band, oberer Drittel). Mid-neutral durch R5 (godspark req85 erscheint nie mid). Aber R5 hat godspark + Stab-Monotonie **endgame** verändert — der mid-Befund sagt nichts über L75/L99, wo godspark (jetzt magicDamage ×1,3, manaRegen 0,35, staff cd 0,12) tatsächlich greift.
**Fix-Richtung:** Kein mid-Hebel. **L75/L99-Sweep** fahren (R5-Prognose dort: Magie L99 1,08, Melee 1,05–1,14, Greatsword-crit linienweit) — verifizieren, dass godspark-Rückdrehung das Band endgame hält und Melee dort nicht via Power-Stance + linienweitem Greatsword-crit überschießt.

### [P3 Balance] Combo-Food kosmetisch · Suffix paritäts-neutral (unverändert seit run5/run6)
**Befund:** R5 hat beides nicht angefasst. Combo-Food-Stil-Buffs (~+2 % auf mid-Roh-Schaden) bleiben kein Hebel; Suffixe sind WoW-Stil Random-Rolls, alle Stile gleichverteilt → paritäts-neutral, korrekt verdrahtet. Gear-Progression mid sauber: jedes Tier ein Upgrade, manaCost-Inversion (run5) bleibt behoben.
**Fix-Richtung (unverändert):** Combo-Food-Stil-Schaden mit Tier skalieren (mid +8/+12) oder bewusst kosmetisch lassen.

---

## Erledigte run6-Punkte / positives Δ

1. **run6-P1 „Melee mid über Band" GELÖST.** Melee L40 1,144→0,959, L55 1,078→0,986 (Attack). EINE Zeile (`smithing trains:"str"` raus); A/B-validiert (Hebel-Delta ×0,87/0,93, „mit"-Variante reproduziert run6).
2. **str-Backbone vereinheitlicht** (gear-/power-basiert statt skill-level-abhängig) — der run6-noSmith-Lücken-Befund ist strukturell geschlossen (str-Quelle = power + Platte, smith-/noSmith-Build identisch).
3. **R5-Content sauber angekommen (im Code verifiziert):** smithing ohne `trains`; godspark 14/23/16/14/14 + manaRegen 0,35 + staff cd 0,12 — exakt wie `balance-3style-parity-r5.md`.
4. **Magie + Ranged auf allen 3 mid-Checkpoints im Band**, 0 Tode/keine Walls bleiben; manaCost-Cap (R4) hält.

## Walls / Stabilität
Kein Wall, keine Trivialität, keine Abstürze: realer 1h-Sim über L30/40/55 × 3 Stile × 3 Mobs → **0 Tode**. Rest-Kernproblem ist die Melee-L30-Unter-Korrektur (P1) + die R5-vertiefte Greatsword-effDPS-Falle (P1).

---

## Was fehlt für 9,5?
1. **Melee L30 zurück ins Band (Kern-Rest):** früh-mid-lokaler Top-up (steel/blacksteel-Platten-str **oder** früher blacksteel-1H-meleeDamage +2…+4) — **ohne** den globalen str-Hebel zurückzunehmen (sonst kippt L40/L55 wieder heiß). Ziel: Melee L30 0,95–1,0 (Attack). **Pflicht** — danach sind alle 9 Attack-Checkpoints im Band.
2. **Greatsword-effDPS-Falle entschärfen:** R4-2H-aIMs-`×0,6`-Buff explizit auf mid-Greatswords (steel/blacksteel/mithril) ziehen, damit der R5-Greatsword-crit-Buff real wirkt statt nur die effDPS-Wahl zu vergiften. Macht den Diversitäts-Hebel wirklich neutral **und** gibt 2H Zähne.
3. **L75/L99-Endgame-Sweep:** R5 hat godspark-Rückdrehung + Stab-Monotonie + linienweiten Greatsword-crit **endgame** eingebaut → verifizieren, dass das Band L75/L99 hält und Melee dort nicht via Power-Stance + Greatsword-crit überschießt (R5-Prognose Melee 1,05–1,14, Magie 1,08).
4. **Melee in BEIDEN Stances zentrieren:** nach 1.+2. re-messen; Power-L40/L55 sitzen bei 1,11 (knapp über) — prüfen, ob das nach den Fixes tolerierbar am Rand bleibt oder einen winzigen mid-Melee-Trim braucht.
5. **Combo-Food zu echten Hebeln** (Stil-Schaden mit Tier skalieren) — sonst bewusst kosmetisch lassen.
6. **Stil-Identität jenseits der DPS erlebbar machen** (Magie-Mana/Status, Melee-Tank/Lifesteal, Ranged-Krit-Burst) — im Code da, unter uniformem Food unsichtbar; Content-/UX-Pass, der diese Identitäten mid spürbar macht, ohne die jetzt sehr enge DPS-Parität zu brechen.

---

### Methoden-Hinweis (Fairness & Konfidenz)
Alle drei Stile teilen **dieselbe Skill-Basis** (Kampf- + 5 Gear-Crafting-Skills auf L, woodcutting ungesetzt — identisch run6); einziger Unterschied ist Gear + Stil-Formel + Mana/Munition. Greedy-Optimierer über alle Slots inkl. Waffe+Munition (2 Pässe). Realer 1h-Sim = echte combat.ts (Mana-Depletion, Köcher-Munition, Krit, Status, Auto-Eat real). **Konfidenz hoch:** der within-harness-A/B (smithing→str AN/AUS) macht den str-Hebel **harness-invariant** belegbar, und die „mit smithing→str"-Variante reproduziert run6 eng (0,972/1,103/1,058 vs 0,955/1,144/1,078) → mein Harness ist mit run6 kalibriert; die Cross-Run-Streuung (R5-Konfidenz-Hinweis) ist damit für die Melee-Aussage neutralisiert. **Melee mit Attack (Untergrenze) UND Power (Obergrenze) gemessen** → der L40/L55-„zentriert"- und der L30-„unter Band"-Befund sind beide stance-abgesichert. Magie/Ranged in ihrer optimalen Stance (Accuracy-Attack; rangedDamage/magicDamage bekommen keinen dmgMult). Das temporäre Harness (`packages/engine/src/_run7tmp.test.ts`) wurde nach der Messung **entfernt**; `packages/**` unverändert.
