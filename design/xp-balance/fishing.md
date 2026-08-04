# XP-Balance-Bericht — Angeln (`fishing`)

_Balance-Designer, 2026-07-01. Nur Analyse + Zahlen-Empfehlungen. Ich editiere den
Content-Katalog NICHT — Umsetzung erfolgt separat mit Chef-Freigabe durch content-dev._

Quellen: `packages/content/src/index.ts` (17 Angel-Aktionen + 5 Angeln-Ruten),
`packages/engine/src/leveling.ts` (XP-Kurve). Baseline-Raten gegen `packages/engine/src/sim.test.ts`
(Fenster 2 min, ungeared, ohne Rute/Mastery) gegengeprüft — Analyse und Sim stimmen überein.

---

## TL;DR — Verdikt zuerst

**Brutalitäts-Note: 2 / 5 (niedrig — Angeln ist NICHT brutal).**
**ABER: der einzige echte Defekt ist ein „totes Tier"-Band, und genau das ist der Punkt, den der Chef meint.**

Die wörtliche Chef-Beschwerde („1 XP für eine Level-8-Aktion ist diabolisch") trifft auf
Angeln **nicht** zu: die kleinste XP ist 2 (`catch_shrimp`, L1), es existiert bereits ein
Ganzzahl-Boden, und die Basis-XP/h ist an **jedem** Punkt **über** dem Referenz-Ziel
(`target_xph`) — vorne sogar 2,6–3,1× (großzügig). Die Kurve ist außerdem **streng monoton**
(kein einziger XP/h-Rückgang).

Der Haken liegt in der **Form**, nicht in der Höhe. Anders als Bergbau (das sauber auf einer
1,3×-Linie sitzt) ist Angeln **vorne überversorgt und dann flach**:

1. **Totes Tier-Band L15–L35** (`cod → pike → shadowcarp → ironscale → salmon`): fünf
   aufeinanderfolgende neue Fische, deren XP/h nur von **4.320 → 5.538** steigt (**+28 % über
   20 Level**), während `target_xph` im selben Bereich um **+168 %** klettert. Jeder neue Fisch
   fühlt sich an wie **kein Upgrade** — die run-fixes haben mit „+1 XP je Tier" nur die
   Monotonie gerettet, nicht die spürbare Progression. **Das ist das „tote Zwischen-Tier",
   vor dem die Skill-Historie warnt.**
2. **Drei Klippen ≥ 1,5×**: L45 `salmon → duskfin_carp` (**×1,86**), L55 `duskfin → lobster`
   (**×1,49**), L78 `anglerfish → wraithscale` (**×1,59**). Erst 20 Level Stillstand, dann ein
   Sprung — genau das „wenige große Sprünge statt vieler Sprossen", das der Chef nicht will.

**Fix (ein kohärenter Re-Scale, keine Einzelflicken):** die XP der Tiers L15–L45 + `anglerfish`
anheben, sodass jede Sprosse ein spürbares **+24–40 %** XP/h bringt. Endpunkte (L1 = 2 XP,
L97 = 404 XP) bleiben fix → Gesamt-Spielzeit ändert sich kaum (223 h → 192 h Basis).

**Warnung an content-dev:** Die rohe Ziel-Formel auf die frühen Tiers anzuwenden würde `xp` auf
**1** abrunden (shrimp/perch/trout → 1) — **das** erzeugt erst das diabolische „1-XP"-Gefühl.
Der min-2-Boden bleibt.

**Nebenbefund (außerhalb XP-Scope, nur Flag):** Angeln ist im Sim der **gold-ärmste** Skill
(Ø 18.002 g/h vs. z. B. Bergbau 69.840). Roh-Fisch verkauft sehr billig. Kein XP-Thema, aber
falls der Chef Berufe auch nach Gold vergleicht, ist Angeln der Ausreißer nach unten.

---

## 1. Das Modell, gegen das ich balanciere

XP-Kurve (`leveling.ts`, RuneScape/Melvor-Stil, Cap L99):

```
acc += floor(n + 300 · 2^(n/7));   xpForLevel(n+1) = floor(acc / 4)
```

Referenz-Ziel-Rate: `target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`.
Empfohlene Roh-XP: `round(target_xph(levelRequired) · durationMs / 3.6e6)`, min 1.
Basis-XP/h einer Aktion (Fairness-Baseline, ohne Rute/Mastery): `xp × 3.600.000 / durationMs`.

| L | kumul. XP | Δ zum nächsten Level | target_xph |
|---:|---:|---:|---:|
| 1  | 0 | 83 | 820 |
| 5  | 388 | 124 | 1.002 |
| 10 | 1.154 | 204 | 1.285 |
| 15 | 2.411 | 335 | 1.647 |
| 20 | 4.470 | 548 | 2.107 |
| 25 | 7.842 | 898 | 2.697 |
| 30 | 13.363 | 1.470 | 3.451 |
| 35 | 22.406 | 2.409 | 4.417 |
| 45 | 61.512 | 6.471 | 7.240 |
| 55 | 166.636 | 17.404 | 11.873 |
| 60 | 273.742 | 28.546 | 15.206 |
| 63 | 368.599 | 38.416 | 17.640 |
| 70 | 737.627 | 76.818 | 24.944 |
| 78 | 1.629.200 | 169.608 | 37.065 |
| 85 | 3.258.594 | 339.198 | 52.417 |
| 92 | 6.517.253 | 678.376 | 74.127 |
| 97 | 10.692.629 | 1.112.977 | 94.948 |
| 99 | 13.034.431 | — | — |

---

## 2. Alle 17 Angel-Aktionen — IST-Zustand

`ratio` = Basis-XP/h ÷ target_xph. `×prev` = XP/h-Verhältnis zur vorherigen Sprosse
(die eigentliche „Sprossen-Höhe"). Alle Aktionen: `chance < 1` Loot, kein `category`, kein `inputs`
(reine Sammel-Aktionen; Rute-`speedMult` verkürzt später die Dauer).

| id | Lvl | xp | durMs | Basis XP/h | target_xph | ratio | ×prev | Befund |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| catch_shrimp          | 1  | 2   | 3000  | 2.400   | 820    | 2,93 | —    | ok (Start) |
| catch_murk_perch      | 5  | 3   | 3500  | 3.086   | 1.002  | 3,08 | 1,29 | ok |
| catch_trout           | 10 | 4   | 4000  | 3.600   | 1.285  | 2,80 | 1,17 | ok |
| catch_cod             | 15 | 6   | 5000  | 4.320   | 1.647  | 2,62 | 1,20 | ok |
| catch_ghostfin_pike   | 20 | 7   | 5500  | 4.582   | 2.107  | 2,17 | **1,06** | **flach/tot** |
| catch_shadowcarp      | 25 | 8   | 5750  | 5.009   | 2.697  | 1,86 | **1,09** | **flach/tot** |
| catch_ironscale_bass  | 30 | 9   | 6000  | 5.400   | 3.451  | 1,56 | **1,08** | **flach/tot** |
| catch_salmon          | 35 | 10  | 6500  | 5.538   | 4.417  | 1,25 | **1,03** | **flach/tot** |
| catch_duskfin_carp    | 45 | 20  | 7000  | 10.286  | 7.240  | 1,42 | **1,86** | **KLIPPE** |
| catch_lobster         | 55 | 34  | 8000  | 15.300  | 11.873 | 1,29 | **1,49** | **KLIPPE** |
| catch_crypteel        | 60 | 48  | 8300  | 20.819  | 15.206 | 1,37 | 1,36 | ok |
| catch_bloodfang_eel   | 63 | 57  | 8500  | 24.141  | 17.640 | 1,37 | 1,16 | ok |
| catch_anglerfish      | 70 | 80  | 9000  | 32.000  | 24.944 | 1,28 | 1,33 | ok |
| catch_wraithscale     | 78 | 134 | 9500  | 50.779  | 37.065 | 1,37 | **1,59** | **KLIPPE** |
| catch_voidray         | 85 | 195 | 10500 | 66.857  | 52.417 | 1,28 | 1,32 | ok |
| catch_abyssal_crawler | 92 | 293 | 11500 | 91.722  | 74.127 | 1,24 | 1,37 | ok |
| catch_soulfish        | 97 | 404 | 12500 | 116.352 | 94.948 | 1,23 | 1,27 | ok |

**Kernbefund:** Die `ratio`-Spalte **fällt** von 2,9–3,1 (unten) auf 1,23 (oben) — die
Großzügigkeit ist vorne konzentriert. Konsequenz: die **absoluten** XP/h stehen von L15–L35
praktisch still (4.320 → 5.538), obwohl die Zielkurve steil steigt. Das ist der Ursprung des
toten Bandes. Danach muss die Kurve die aufgestaute Steigung in wenigen großen Sprüngen
nachholen (L45/L55/L78).

---

## 3. Kurven-Analyse — Stunden pro Level & „Walls" (IST, Basis)

Beste freigeschaltete Aktion je Level, ohne Rute/Mastery:

| L→L+1 | beste Aktion | XP/h | Δ XP | Stunden |
|---|---|---:|---:|---:|
| 1→2   | catch_shrimp        | 2.400   | 83        | 0,03 |
| 5→6   | catch_murk_perch    | 3.086   | 124       | 0,04 |
| 10→11 | catch_trout         | 3.600   | 204       | 0,06 |
| 15→16 | catch_cod           | 4.320   | 335       | 0,08 |
| 20→21 | catch_ghostfin_pike | 4.582   | 548       | 0,12 |
| 25→26 | catch_shadowcarp    | 5.009   | 898       | 0,18 |
| 30→31 | catch_ironscale_bass| 5.400   | 1.470     | 0,27 |
| 35→36 | catch_salmon        | 5.538   | 2.409     | 0,43 |
| **40→41** | **catch_salmon** (immer noch) | **5.538** | **3.947** | **0,71** |
| 45→46 | catch_duskfin_carp  | 10.286  | 6.471     | 0,63 |
| 55→56 | catch_lobster       | 15.300  | 17.404    | 1,14 |
| 63→64 | catch_bloodfang_eel | 24.141  | 38.416    | 1,59 |
| 70→71 | catch_anglerfish    | 32.000  | 76.818    | 2,40 |
| 78→79 | catch_wraithscale   | 50.779  | 169.608   | 3,34 |
| 85→86 | catch_voidray       | 66.857  | 339.198   | 5,07 |
| 90→91 | catch_voidray (immer noch) | 66.857 | 556.499 | 8,32 |
| 98→99 | catch_soulfish      | 116.352 | 1.228.825 | 10,56 |

- **Keine harte Wall im Zeitsinn** — der teuerste Einzel-Level (L98→99) kostet ~10,6 h Basis,
  mit `void_rod` (`speedMult 0,58` → 1,72× schneller) ~6,1 h. Für einen Idle-Skill (offline/über
  Nacht) im Rahmen.
- **Gesamt 1→99, Basis, ohne Tools/Mastery: ~223 h.** Mit tier-gerechter Rute ~135 h; Mastery
  senkt weiter. Solide Idle-Ökonomie.
- **Weichster Punkt: L35–L44** — man klebt 10 Level auf `salmon` (5.538 XP/h), das im
  oberen Teil dieses Fensters **unter** `target_xph` fällt (L44-Ziel ≈ 6.900 > 5.538). Danach
  fast-Verdopplung auf `duskfin_carp`. Kein „langsam", aber der klarste Ort, an dem sich
  Progression **verwirrt** anfühlt: nichts Neues, dann ein Sprung.

---

## 4. „Tote Tiers" & Monotonie-Check

**Monoton:** ja, streng — XP/h steigt an jeder Sprosse (2.400 → 116.352). Kein Rückgang.
Das ist das gute Erbe der run-fixes (`run6-fix`, `monotonicity bug #2.5`, cascade fixes).

**Toten-Tier-Test (Sprossen-Höhe `×prev`):** durchgefallen im Band **L20–L35**. Vier
aufeinanderfolgende Sprossen mit `×1,03–×1,09` (pike, shadowcarp, ironscale, salmon) sind
_de facto_ tote Tiers: neuer Fisch, praktisch gleiche Rate. Design-Regel „viele Sprossen, keine
Sprünge" ist hier zusätzlich durch die drei `×≥1,5`-Klippen (L45/L55/L78) verletzt.

Zum Vergleich Bergbau (Schwester-Bericht): dort liegen die Sprossen sauber bei ~1,3× Ziel ohne
flaches Band. Angeln ist der Skill, bei dem die „tote Tiers"-Warnung real zutrifft.

---

## 5. „Diabolische" Fälle (winzige xp vs. levelRequired)

**Wörtlich: keine.** Kleinste Werte: shrimp 2 @ L1, perch 3 @ L5, trout 4 @ L10, cod 6 @ L15.
Alle liefern 2.400–4.320 XP/h (2,6–2,9× Ziel). Die kleinen Zahlen sind Folge kurzer Dauer +
niedriger absoluter Kurve unten, **nicht** einer bestrafenden Rate.

**Spirituell (das, was der Chef fühlt):** das tote Band L20–L35. `catch_salmon` verlangt L35
und bringt nur `10 XP` = +0,1 XP/h über L30 `ironscale` — nach 25 Leveln Aufstieg. Das ist die
Angel-Variante von „diabolisch": nicht 1 XP, aber ein neuer Fisch, der sich wie kein Fortschritt
anfühlt.

---

## 6. Empfehlung — glatte Sprossen-Leiter (Ziel-Design)

**Ansatz:** geometrische XP/h-Leiter mit konstantem Schritt **≈ ×1,27** je Sprosse, verankert an
den bestehenden Endpunkten (shrimp 2.400 / soulfish 116.352). **Dauern bleiben unverändert**
(die `durationMs`-Leiter 3.000→12.500 ms ist glatt) → content-dev ändert genau **eine Spalte:
`xp`**. Ganzzahl-Boden 2. Ergebnis: jede Sprosse spürbar (+24–40 %), keine Klippe > ×1,40,
kein flaches Band, streng monoton.

| id | Lvl | durMs | xp ALT | **xp NEU** | XP/h NEU | ×prev NEU | Δ |
|---|---:|---:|---:|---:|---:|---:|---|
| catch_shrimp          | 1  | 3000  | 2   | **2**   | 2.400   | —    | — behalten |
| catch_murk_perch      | 5  | 3500  | 3   | **3**   | 3.086   | 1,29 | — behalten |
| catch_trout           | 10 | 4000  | 4   | **4**   | 3.600   | 1,17 | — behalten |
| catch_cod             | 15 | 5000  | 6   | **7**   | 5.040   | 1,40 | +1 |
| catch_ghostfin_pike   | 20 | 5500  | 7   | **10**  | 6.545   | 1,30 | +3 |
| catch_shadowcarp      | 25 | 5750  | 8   | **13**  | 8.139   | 1,24 | +5 |
| catch_ironscale_bass  | 30 | 6000  | 9   | **17**  | 10.200  | 1,25 | +8 |
| catch_salmon          | 35 | 6500  | 10  | **24**  | 13.292  | 1,30 | +14 |
| catch_duskfin_carp    | 45 | 7000  | 20  | **32**  | 16.457  | 1,24 | +12 |
| catch_lobster         | 55 | 8000  | 34  | **47**  | 21.150  | 1,29 | +13 |
| catch_crypteel        | 60 | 8300  | 48  | **63**  | 27.325  | 1,29 | +15 |
| catch_bloodfang_eel   | 63 | 8500  | 57  | **82**  | 34.729  | 1,27 | +25 |
| catch_anglerfish      | 70 | 9000  | 80  | **110** | 44.000  | 1,27 | +30 |
| catch_wraithscale     | 78 | 9500  | 134 | **148** | 56.084  | 1,27 | +14 |
| catch_voidray         | 85 | 10500 | 195 | **209** | 71.657  | 1,28 | +14 |
| catch_abyssal_crawler | 92 | 11500 | 293 | **293** | 91.722  | 1,28 | — behalten |
| catch_soulfish        | 97 | 12500 | 404 | **404** | 116.352 | 1,27 | — behalten |

Neue XP-Folge: `2,3,4,7,10,13,17,24,32,47,63,82,110,148,209,293,404` — streng monoton, resultierende
XP/h streng monoton (geprüft). **Gesamt 1→99 Basis: 223 h → 192 h** (−14 %, ausschließlich im
Mittel-Band schneller; Früh- und Endspiel praktisch unverändert). Mit tier-gerechter Rute ~116 h.

**Wie die Fixes zusammenhängen (ein Re-Scale, keine Einzelflicken):**
- Das Anheben von `cod…salmon` **löst das tote Band** (Sprossen jetzt ×1,24–1,40 statt ×1,03–1,09).
- Weil `salmon` auf 13.292 steigt, wird die **L45-Klippe** `salmon→duskfin` von ×1,86 auf **×1,24**.
- Weil `duskfin` auf 16.457 steigt, wird die **L55-Klippe** `duskfin→lobster` von ×1,49 auf **×1,29**.
- Weil `anglerfish` auf 44.000 steigt, wird die **L78-Klippe** `anglerfish→wraithscale` von ×1,59 auf **×1,27**.

**Alternative (verworfen):** Angeln wie Bergbau streng auf die 1,3×-Linie ziehen. Das würde die
frühen Sprossen (shrimp/perch/trout) auf XP 1–2 **absenken** und das Frühspiel verlangsamen —
gegen die Chef-Vorgabe „weniger brutal". Deshalb halte ich die frühe Großzügigkeit und glätte
nur die Mitte nach oben.

---

## 7. Apply-Liste (geordnet für content-dev)

Alle Änderungen ausschließlich am Feld `xp` in `packages/content/src/index.ts`. Dauern, Loot,
levelRequired **unverändert**.

| Prio | id | `xp` Alt→Neu | Begründung |
|---|---|---|---|
| **P1** | `catch_salmon`         | 10 → **24**  | Kern des toten Bandes; hebt L35 von ×1,03 auf ×1,30 und entschärft zugleich die L45-Klippe. |
| **P1** | `catch_ironscale_bass` | 9 → **17**   | tote Sprosse L30 → ×1,25. |
| **P1** | `catch_shadowcarp`     | 8 → **13**   | tote Sprosse L25 → ×1,24. |
| **P1** | `catch_ghostfin_pike`  | 7 → **10**   | erste tote Sprosse L20 → ×1,30. |
| **P1** | `catch_cod`            | 6 → **7**    | Anschluss ans Band; L15 → ×1,40. |
| **P2** | `catch_anglerfish`     | 80 → **110** | entschärft die L78-Klippe (×1,59 → ×1,27). |
| **P2** | `catch_duskfin_carp`   | 20 → **32**  | entschärft die L55-Klippe (×1,49 → ×1,29). |
| **P2** | `catch_lobster`        | 34 → **47**  | glättet L55→L60. |
| **P2** | `catch_crypteel`       | 48 → **63**  | Linien-Glättung. |
| **P2** | `catch_bloodfang_eel`  | 57 → **82**  | Linien-Glättung. |
| P3 (opt.) | `catch_wraithscale` | 134 → **148** | Feinschliff auf die ×1,27-Linie. |
| P3 (opt.) | `catch_voidray`     | 195 → **209** | Feinschliff auf die ×1,27-Linie. |

**Behalten (nicht anfassen):** `catch_shrimp` (2), `catch_murk_perch` (3), `catch_trout` (4),
`catch_abyssal_crawler` (293), `catch_soulfish` (404). Sie sind bereits linientreu / definieren
die verankerten Endpunkte.

**Politik-Empfehlung (skillübergreifend):** Ganzzahl-Boden **2 XP** je Aktion generell
festschreiben und die rohe Ziel-Formel **nie** ungefiltert auf kurze Low-Level-Aktionen anwenden
(sie rundet auf 1 XP → genau die „diabolische" Empfindung des Chefs).

---

## 8. Verdikt

**Brutalitäts-Note: 2 / 5.** Angeln ist fair bis großzügig, streng monoton, mit funktionierendem
min-2-Boden — nicht brutal. Die 2 (keine 1) steht für den **einen realen Struktur-Defekt**, den
Bergbau nicht hatte: ein 4-Sprossen totes Tier-Band (L20–L35) plus drei Klippen ≥ ×1,5. Auf die
Chef-Vorgabe „monoton, ohne tote Tiers, viele Sprossen" gemessen: monoton = erfüllt, tote Tiers =
**verletzt**.

**Top-3-Fixes:**
1. **Totes Band L20–L35 anheben** — `salmon 10→24`, `ironscale 9→17`, `shadowcarp 8→13`,
   `pike 7→10`, `cod 6→7`. Macht jeden neuen Fisch wieder zum spürbaren Upgrade (×1,24–1,40).
2. **Klippen glätten** — `anglerfish 80→110` (L78), `duskfin 20→32` (L45), `lobster 34→47` (L55).
   Fällt großteils automatisch mit Fix 1 zusammen (ein kohärenter Re-Scale).
3. **Endpunkte + min-2-Boden halten** — shrimp/soulfish nicht antasten, frühe Tiers nicht nach
   der rohen Formel absenken (sonst „1 XP"). Nebenbei prüfen: Angeln ist der gold-ärmste Skill —
   ggf. separater Gold-/Loot-Pass (außerhalb dieses XP-Berichts).
