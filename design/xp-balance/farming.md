# XP-Balance-Bericht — Anbau (`farming`)

> Balance-Designer, 2026-07-01. **Read-only Audit** — nur diese Datei geschrieben.
> Grundlage: `packages/content/src/index.ts` (crops-Katalog), `packages/engine/src/farming.ts`
> (Plot-Tick/`grantHarvest`), `packages/engine/src/leveling.ts` (XP-Kurve),
> `packages/shared/src/index.ts` (`PLOT_XP_SHARE`, `PLOT_UNLOCK`, `plotsUnlocked`),
> Design-Spec `design/skills/farming-plots-plan.md` §3.
> Zahlen sind exakt nachgerechnet (Skripte gegen die echte `buildXpTable`).

---

## 0. TL;DR (für den Chef)

- **Anbau ist NICHT diabolisch.** Farming ist der **gesündeste** Nicht-Kampf-Beruf: 27 von 29 Crops
  liegen **exakt auf** der Zielkurve (Faktor 1,00×). Es gibt **keinen** „1-XP"-Fall — die kleinste
  XP/Ernte ist 18 (graywort, L1). Die Chef-Beschwerde („1 XP für L8 ist diabolisch") trifft **nicht** auf
  Anbau zu; sie gilt anderen Skills.
- **ABER: zwei kaputte Crops.** `reed_iron` und `reed_void` haben ein **falsches `levelRequired`**
  (26 statt 46; 58 statt 84). Ihre `xp`-Werte wurden nachweislich für L46 bzw. L84 getunt, sitzen aber viel
  zu früh → **2,7× / 3,6× über der Kurve** an ihrem Platz und **brechen die Monotonie** (falsche XP-Gipfel
  bei L26 und L58). Das ist ein **Content-Tippfehler**, kein Design-Problem.
- **Fix = 2 Zahlen.** `reed_iron.levelRequired: 26 → 46`, `reed_void.levelRequired: 58 → 84`. Danach ist die
  gesamte Kurve **streng monoton** und **on-curve**. Verifiziert.
- **Note: 2** (gut, mit zwei klar behebbaren Defekten). Nach dem 2-Zahlen-Fix: **Note 1**.

---

## 1. Wie XP bei Anbau anfällt (Mechanik)

Farming ist **kein** aktives „eine-Aktion-zur-Zeit"-Skill mehr. Es ist ein **passives Plot-System**
(`engine/farming.ts`, `tickFarmPlots`):

- Der Spieler pflanzt Saat in **Beete (Plots)**, die **passiv gegen `state.elapsedMs` reifen** — parallel
  zu Kampf/Skilling und offline (Cap 24 h). Kein Verbrauch des `activeActionId`-Slots.
- Bei Reife (`elapsed ≥ growMs`) gewährt `grantHarvest`: **`skill.xp += crop.xp`** (× Gather-XP-Buff, sonst ×1)
  plus Ertrag `nextInt(yieldMin, yieldMax)`. Auto-Replant zieht 1 Saat und startet den nächsten Zyklus.
- **Parallelität ist der Idle-Hebel:** freigeschaltete Plot-Anzahl steigt mit dem Level
  (`PLOT_UNLOCK`: 3 → 9 Plots).

**Konsequenz für XP/h:**

| Größe | Formel |
|---|---|
| XP pro Ernte | `crop.xp` (fix im Katalog) |
| XP/h **eines** Plots | `crop.xp · 3_600_000 / growMs` |
| XP/h **gesamt** (alle Plots gleich bepflanzt) | `plotsUnlocked(L) · crop.xp · 3_600_000 / growMs` |

Der Design-Anker (Spec §3.1): **ein** Plot liefert bewusst nur **15 %** (`PLOT_XP_SHARE = 0.15`) der nackten
Zielkurve. Die Progression liegt im **Plot-Count**, nicht im XP/h pro Plot. Deshalb:

```
crop.xp  =  max(1, round( 0.15 · target_xph(levelRequired) · growMs / 3_600_000 ))
target_xph(L) = 90 · sqrt( xpForLevel(L+1) − xpForLevel(L) )
```

> **Hinweis zum Testlauf:** Der Sim (`engine/sim.ts`) modelliert **nur aktive Aktionen + Kampf**, keine
> passiven Plots (Grep: kein `farm`/`crop`/`plot`). `pnpm test` gibt also **keine** Farming-XP/h-Zeile aus.
> Die Zahlen hier stammen aus direkter Berechnung gegen die echte `buildXpTable` — das ist für ein
> passives System die maßgebliche Quelle.

---

## 2. Zielkurve (Anker aus `leveling.ts`, exakt)

| L | xpForLevel(L) | XP L→L+1 | target_xph(L) | 15 %-Anteil (1 Plot) |
|---|---|---|---|---|
| 1  | 0          | 83      | 820    | 123 |
| 5  | 388        | 124     | 1 002  | 150 |
| 10 | 1 154      | 204     | 1 285  | 193 |
| 20 | 4 470      | 548     | 2 107  | 316 |
| 30 | 13 363     | 1 470   | 3 451  | 518 |
| 40 | 37 224     | 3 947   | 5 654  | 848 |
| 50 | 101 333    | 10 612  | 9 271  | 1 391 |
| 60 | 273 742    | 28 546  | 15 206 | 2 281 |
| 70 | 737 627    | 76 818  | 24 944 | 3 742 |
| 80 | 1 986 068  | 206 750 | 40 923 | 6 138 |
| 90 | 5 346 332  | 556 499 | 67 139 | 10 071 |

Referenz-Check gegen Vorgabe: L1 ≈ 820/h, L50 ≈ 9,3k, L99-nah ≈ 105k+ — **passt**.

---

## 3. Voller Crop-Audit (sortiert nach `levelRequired`)

`xp/ideal` = Ist-XP ÷ Kurvenformel. `ppXph` = XP/h eines Plots. **Fett = Ausreißer.**

| Crop (id) | Lv | Tier | grow | xp (ist) | xp (soll) | xp/ideal | ppXph (ist) | ppXph (soll) |
|---|---|---|---|---|---|---|---|---|
| graywort           | 1  | T1 | 10m | 18    | 20    | 0,90 | 108   | 123 |
| ashroot            | 1  | T1 | 10m | 20    | 20    | 1,00 | 120   | 123 |
| grimwheat          | 3  | T1 | 10m | 23    | 23    | 1,00 | 138   | 136 |
| gravetato          | 4  | T1 | 10m | 24    | 24    | 1,00 | 144   | 143 |
| reed_pale          | 6  | T1 | 10m | 26    | 26    | 1,00 | 156   | 159 |
| herb_marshroot     | 8  | T1 | 10m | 29    | 29    | 1,00 | 174   | 175 |
| pigment_umber      | 12 | T1 | 10m | 36    | 36    | 1,00 | 216   | 213 |
| bloodbeet          | 20 | T1 | 10m | 53    | 53    | 1,00 | 318   | 316 |
| bloodgrain         | 22 | T2 | 20m | 116   | 116   | 1,00 | 348   | 349 |
| herb_bloodthistle  | 26 | T2 | 20m | 142   | 142   | 1,00 | 426   | 425 |
| **reed_iron**      | **26** | **T3** | **40m** | **761** | **283** | **2,69** | **1 142** | **425** |
| mandrake           | 30 | T2 | 20m | 173   | 173   | 1,00 | 519   | 518 |
| nightshade         | 35 | T2 | 20m | 221   | 221   | 1,00 | 663   | 663 |
| soulgourd          | 42 | T3 | 40m | 624   | 624   | 1,00 | 936   | 936 |
| pigment_verdant    | 44 | T3 | 40m | 689   | 689   | 1,00 | 1 034 | 1 034 |
| herb_gravemoss     | 46 | T3 | 40m | 761   | 761   | 1,00 | 1 142 | 1 141 |
| gallows_apple      | 50 | T3 | 40m | 927   | 927   | 1,00 | 1 391 | 1 391 |
| ironvine           | 50 | T3 | 40m | 927   | 927   | 1,00 | 1 391 | 1 391 |
| **reed_void**      | **58** | **T5** | **160m** | **19 954** | **5 509** | **3,62** | **7 483** | **2 066** |
| wither_leek        | 62 | T4 | 80m | 3 358 | 3 358 | 1,00 | 2 519 | 2 518 |
| pigment_violet     | 64 | T4 | 80m | 3 707 | 3 707 | 1,00 | 2 780 | 2 780 |
| emberroot          | 65 | T4 | 80m | 3 895 | 3 895 | 1,00 | 2 921 | 2 921 |
| herb_nightbloom    | 66 | T4 | 80m | 4 093 | 4 093 | 1,00 | 3 070 | 3 070 |
| corpse_lily        | 70 | T4 | 80m | 4 989 | 4 989 | 1,00 | 3 742 | 3 742 |
| wraithcap          | 80 | T4 | 80m | 8 185 | 8 185 | 1,00 | 6 139 | 6 138 |
| pigment_radiant    | 84 | T5 | 160m| 19 954| 19 954| 1,00 | 7 483 | 7 483 |
| ambergrain         | 84 | T5 | 160m| 19 954| 19 954| 1,00 | 7 483 | 7 483 |
| herb_godsbreath    | 86 | T5 | 160m| 22 031| 22 031| 1,00 | 8 262 | 8 262 |
| godbloom           | 95 | T5 | 160m| 34 399| 34 399| 1,00 | 12 900| 12 900|

**Beobachtung:** Alles außer den zwei fett markierten Reeds ist auf 1,00× getunt. Ein Musterbeispiel für
saubere Kurven-Arbeit — bis auf die zwei Tippfehler.

---

## 4. Die zwei Defekte im Detail

### 4.1 Monotonie-Brüche (die eigentliche Chef-Sorge: „tote Tiers / unfaire Sprünge")

Nach `levelRequired` sortiert bricht die XP/Ernte an genau zwei Stellen ein — **beide** durch die verrutschten
Reeds verursacht:

```
L26 herb_bloodthistle  xp= 142
L26 reed_iron          xp= 761   ← falscher Gipfel (2,7× über Kurve für L26)
L30 mandrake           xp= 173   ← DROP zurück auf Kurve
...
L58 reed_void          xp= 19 954 ← falscher Gipfel (3,6× über Kurve für L58)
L62 wither_leek        xp=  3 358 ← DROP zurück auf Kurve
```

Ein L26-Spieler kann ein T3-Beet (`reed_iron`, 761 XP/Ernte = 1 142 XP/h/Plot) pflanzen, während alles um
ihn herum bei ~140 XP liegt. Ein L58-Spieler bekommt ein **T5**-Beet 26 Level zu früh (7 483 XP/h/Plot).
Das ist kein „diabolisch niedrig", sondern **kaputt hoch** — trotzdem ein Balance-Defekt (bricht Progression,
verzerrt Material-Ökonomie: `reed_void` value = 80 Gold, 26 Level zu früh).

### 4.2 Beweis, dass `levelRequired` der Tippfehler ist (nicht `xp`)

Die `xp`-Werte passen **exakt** auf ein anderes Level:

| Crop | xp (ist) | = idealXp(L, grow) bei… | Spec §3.2 nennt | Inscription-Partner |
|---|---|---|---|---|
| reed_iron | 761    | **L46**, 40 min (761 ✓) | „reed_iron **Lv 46**" | `pigment_verdant` (**L44**), `pigment_violet` (L64) |
| reed_void | 19 954 | **L84**, 160 min (19 954 ✓) | „reed_void **Lv 84**" | `pigment_radiant` (**L84**) |

Drei unabhängige Quellen sagen 46/84: (a) der `xp`-Wert selbst, (b) die Design-Spec §3.2, (c) der
Inscription-Rezept-Partner (`reed_iron`+`pigment_verdant`@44; `reed_void`+`pigment_radiant`@84, Zeilen
8461/8519 in content). Nur `levelRequired` (26/58) tanzt aus der Reihe. → **`levelRequired` ist der Bug.**

**Verifikation:** Mit `reed_iron→46` und `reed_void→84` ist die gesamte XP-Sequenz **streng monoton
non-decreasing** (nachgerechnet). Keine weiteren Brüche.

---

## 5. Empfehlungen (konkrete Zahlen für content-dev)

### 5.1 KRITISCH — die zwei Reeds on-curve rücken (Pflicht)

| id | Feld | current | target/soll | **recommended** |
|---|---|---|---|---|
| `reed_iron` | `levelRequired` | 26 | 46 | **46** |
| `reed_void` | `levelRequired` | 58 | 84 | **84** |

- **Nur `levelRequired` ändern.** `xp` (761 / 19 954), `growMs`, `tier`, `yieldMin/Max` bleiben **unverändert**
  — sie sind bereits korrekt für 46/84.
- Ergebnis: Monotonie wiederhergestellt, beide Crops exakt 1,00× Kurve, konsistent mit Spec §3.2 und den
  Inscription-Rezepten.

### 5.2 SEKUNDÄR — Lücke L50→L62 schließen (empfohlen, nach dem Fix)

Nach 5.1 rutscht `reed_void` von L58 weg → im Band **L51–L61 gibt es keine neue Crop** (man pflanzt weiter
`gallows_apple`/`ironvine`, 1 391 XP/h/Plot, während die Kurve von 9 271 auf 16 788 steigt). Kein harter Wall,
aber die längste Flaute im Katalog (12 Level). Vorschlag: **eine** neue T3/T4-Crop um L54–56 einschieben
(neues Item ODER eine der doppelten L50-Crops hochziehen):

| Vorschlag | Lv | Tier | grow | empf. xp | ppXph |
|---|---|---|---|---|---|
| Gap-Filler A | 55 | T3 | 40 min | **1 187** | 1 781 |
| Gap-Filler B | 56 | T4 | 80 min | **2 495** | 1 872 |

(`xp = round(0.15 · target_xph(L) · grow/3.6e6)`.) Das ist ein **Content-Wunsch**, kein Bug — niedrigere
Priorität als 5.1. Analog kleinere Flauten: L12→20, L35→42, L86→95 (Endgame, tolerierbar).

### 5.3 KOSMETIK — graywort auf Formelwert (optional)

| id | Feld | current | target | recommended |
|---|---|---|---|---|
| `graywort` | `xp` | 18 | 20 | **20** (oder lassen) |

`graywort` ist mit 18 statt 20 minimal unter Formel (0,90×). 2 XP, spürbar für niemanden — reine
Aufräum-Option, damit die erste Crop sauber auf 1,00× sitzt. Kein Muss.

---

## 6. Durchsatz-Sanity (nach Fix)

Total passiv (alle Plots auf Level-Tier) = `plotsUnlocked(L) · 0.15 · target_xph(L)`:

| L | Plots | Total passiv XP/h | = % Kurve |
|---|---|---|---|
| 1  | 3 | 369     | 45 %  |
| 10 | 4 | 771     | 60 %  |
| 25 | 5 | 2 023   | 75 %  |
| 40 | 6 | 5 089   | 90 %  |
| 55 | 7 | 12 467  | 105 % |
| 70 | 8 | 29 933  | 120 % |
| 85 | 9 | 70 762  | 135 % |

Monoton steigend, nie 0 XP/h, früh unter / spät leicht über einer aktiven Aktion — genau die
„läuft-immer-nebenbei"-Rolle. **Fair.**

---

## 7. Verdikt

**Note: 2** (gut). Anbau ist konzeptionell sauber und fast durchgehend perfekt on-curve — der gesündeste
Nicht-Kampf-Beruf im Katalog, **kein** diabolischer Niedrig-XP-Fall. Abzug nur für zwei verrutschte Reeds,
die die Monotonie brechen. Nach dem 2-Zahlen-Fix: **Note 1**.

**Top-3-Fixes (geordnete Apply-Liste für content-dev):**
1. `reed_iron.levelRequired: 26 → 46` (nur dieses Feld; xp/grow/tier bleiben).
2. `reed_void.levelRequired: 58 → 84` (nur dieses Feld; xp/grow/tier bleiben).
3. (Optional/sekundär) Lücke L50→62 mit einer T3/T4-Crop bei L54–56 füllen (xp ≈ 1 187 @ T3 / 2 495 @ T4);
   Kosmetik: `graywort.xp 18 → 20`.

> Reine Zahlen-Spec. **Nichts an Content/Engine editiert.** Einpflegen erst mit Chef-Freigabe via content-dev.
