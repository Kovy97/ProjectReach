# Sweep 3 — 14 Midgame-Stil-Parität (L20–50, alle 3 Stile)

**Agent:** Kontrolleur (QA)
**Ziel:** Midgame L20–50 alle 3 Stile via SimPlayer mit realistischem Gear je Stil — Kills/h + Gold/h je
Stil pro Tier messen und feststellen, ob die Stil-Parität erreicht ist (Rest-Delta mit Zahlen).
Vorher war die Parität gebrochen (Melee +40–60 % im Midgame).

**Methode:** Headless via `SimPlayer` (echte Engine). Je Tier fechten alle 3 Stile gegen **denselben**
Mob (sauberes relatives Delta). Realistisches Tier-Gear je Stil (Waffe/Rüstung/Munition), Kampf-
Skills = Tier-Level (melee: attack+power+defence+vitality; ranged: ranged+defence+vitality; magic:
magic_off+magic_def+vitality). Reichlich Food + Auto-Eat (Tier 3), damit Survival NICHT der
Flaschenhals ist → gemessen wird reine Kampfleistung. 3 bzw. 5 Seeds, je 1 Sim-Stunde, gemittelt.
**Alle Läufe: 0 Tode** — Kills/h spiegelt reinen DPS-Durchsatz.

---

## Verdikt: PARITÄT ERREICHT (bei gleicher Aggressiv-Stance) — Rest-Delta ≤ 9 %

Entscheidend ist der **Stance-faire** Vergleich: jeder Stil in seiner DPS-Stance
(melee=**power**, ranged=**fast**, magic=**offensive**). Da liegen alle drei Stile über L20–50
innerhalb von **8–9,5 %** — das ist Parität. Die alte Melee-Dominanz (+40–60 %) ist **weg**.

### Best-Stance (DPS-Stance je Stil) — Kills/h & Gold/h (Ø 3 Seeds, 1 Sim-h)

| Tier (Mob) | Stil/Stance | Kills/h | Gold/h | Index (best=100) |
|---|---|---:|---:|---:|
| **T20** goblin_spearman L20 | melee/power | 436 | 35 604 | **100** |
| | ranged/fast | 410 | 33 592 | 94 |
| | magic/offensive | 397 | 32 557 | 91 |
| **T30** ash_rat L30 | melee/power | 438 | 44 195 | 92 |
| | ranged/fast | 479 | 48 424 | **100** |
| | magic/offensive | 474 | 48 030 | 99 |
| **T40** mire_crawler L38 | melee/power | 369 | 63 798 | **100** |
| | ranged/fast | 339 | 58 822 | 92 |
| | magic/offensive | 364 | 63 179 | 99 |
| **T50** rootling_gimp L48 | melee/power | 378 | 88 393 | **100** |
| | ranged/fast | 344 | 81 073 | 93 |
| | magic/offensive | 362 | 85 249 | 96 |

**Rest-Delta (best−worst)/best:** T20 = 9,5 %, T30 = 7,7 %, T40 = 7,9 %, T50 = 8,4 %.
5-Seed-Wiederholung bestätigt dieselben Verhältnisse (±1 Index-Punkt). Gold/h folgt Kills/h 1:1
(Gold hängt am Kill). **Kein Stil dominiert:** Melee/power führt in 3 von 4 Tiers knapp, Ranged/fast
führt bei T30, Magie liegt durchweg 91–99 % — nie Ausreißer nach oben, nie eingebrochen.

---

## Der eine echte Rest-Befund: Ranged-DEFAULT-Stance ist eine DPS-Falle

Misst man mit **Default-Stances** (frischer Charakter: melee=attack, ranged=**precise**,
magic=offensive), klafft wieder eine Lücke — aber sie ist **rein ein Stance-Artefakt**, kein
Roh-Schaden-Ungleichgewicht:

### Default-Stance — Kills/h (Ø 3 Seeds)

| Tier | melee/attack | ranged/precise | magic/off | Ranged-Index |
|---|---:|---:|---:|---:|
| T20 | 389 | 316 | 397 | 80 % |
| T30 | 393 | 361 | 474 | 76 % |
| T40 | 335 | 257 | 364 | 71 % |
| T50 | 338 | 265 | 362 | 73 % |

Ursache: Ranged-Default **`precise`** hat `speedMult 1.12` (12 % **langsamer**) für +12 % Accuracy —
gegen die mittel-evasiven Midgame-Mobs ist das ein Netto-DPS-Verlust. `fast` (`speedMult 0.85`,
−10 % Acc) killt ~30 % schneller. Analog ist auch Melee-Default `attack` ~11 % unter `power`.
Beide Default-Stances sind also NICHT die DPS-Stance — das ist symmetrisch und OK; nur die
**Ranged-Default-Strafe ist mit ~20–29 % deutlich größer** als die Melee-Default-Strafe (~11 %),
und ein neuer Spieler weiß nicht, dass er auf `fast` umstellen muss.
(Referenz: `packages/shared/src/index.ts:68` `activeStanceMods`.)

---

## Findings

**[P3][balance/ux] Ranged-Default-Stance `precise` ist im Midgame ein ~20–29 % DPS-Nachteil** — confirmed.
- Erwartet: Default-Stance liefert konkurrenzfähigen DPS (analog zum Melee-`attack`-Default, der nur ~11 % unter `power` liegt).
- Tatsächlich: `precise` (12 % langsamer) killt 20–29 % langsamer als `fast`; ein neuer Ranged-Spieler startet in der langsamsten Stance und sieht Ranged fälschlich als schwach.
- Evidence: T40 ranged/precise 257 vs ranged/fast 339 Kills/h (+32 %); T50 265 vs 344 (+30 %). `packages/shared/src/index.ts:75` (precise `speedMult 1.12`).
- Empfehlung (an Combat-Dev / Balance): entweder Ranged-Default auf `fast` setzen (wie Melee auf die 55/45-Aggressiv-Route gebracht wurde), ODER `precise` `speedMult` von 1.12 → ~1.0 senken (Accuracy-Bonus bleibt, ohne die harte Tempo-Strafe). Reine Empfehlung — kein Muss, da bei bewusster Stance-Wahl Parität besteht.

**[P3][feel] Magie hängt komplett am Stab-Manahaushalt (bei Stab: gesund)** — confirmed.
- Mit Tier-Stab (Manakosten 6–8) trägt der Mana-Pool + Regen (30 + int·5 + wis·2; Regen 1,5 + wis·0,2/s) das Dauercasten im Midgame ohne Einbruch in den Weak-Cast (×0.35) — Magie hält 91–99 % Index. Kein Handlungsbedarf; nur dokumentiert, damit ein späterer Wand-only-Build (höhere Feuerrate) gesondert geprüft wird.

**Kein P0/P1/P2.** Die in der Vorgabe genannte Midgame-Melee-Dominanz (+40–60 %) ist **nicht mehr reproduzierbar** — die Waffenschaden-Anhebung (steel_longbow 12→25, steel_staff 14→25 usw.) wirkt.

---

## Ziel erreicht?

**JA.** Stil-Parität L20–50 ist bei gleicher Aggressiv-Stance **erreicht** (Rest-Delta ≤ 9 % über alle
vier Tiers, 0 Tode). Ranged und Magie haben zu Melee aufgeschlossen; keine der drei Stile dominiert.
Einziger Rest: die **Ranged-Default-Stance `precise`** verschenkt ~20–29 % DPS — ein Onboarding-/
Default-Thema (P3), kein Roh-Balance-Bruch.

## Top-3
1. **Parität bestätigt (P0-Frage der Vorgabe):** Best-Stance-Spread nur 8–9,5 % über L20–50; Melee-Dominanz weg.
2. **Ranged-Default-Falle (P3):** `precise` ist 20–29 % langsamer als `fast` → Default auf `fast` oder `precise`-Tempostrafe senken.
3. **Magie gesund (P3/info):** Stab-Manahaushalt trägt Dauercasten im Midgame; Magie nie Ausreißer (91–99 %).
