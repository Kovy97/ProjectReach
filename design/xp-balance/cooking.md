# XP-Balance-Bericht: Kochen / Cooking (`cooking`)

_Balance-Designer, 2026-07-01. Reine Analyse — keine Content-Änderung. Einpflegen nur nach Chef-Freigabe via content-dev._

## Verdikt (Kurzfassung)

**Note: 3 / 5 (befriedigend).** Die XP-Ziel­kurve selbst ist solide und **in Summe nicht brutal** (siehe Stunden-pro-Level-Tabelle: L90→91 kostet base ~8 h). Die meisten Aktionen (~30 von 43) treffen die Kurve auf 0,9–1,4× genau. ABER: der Skill ist **lokal löchrig** — ein Cluster „1-XP"-Aktionen L1–L14 fühlt sich diabolisch an und ist gegenüber dem gebufften `cook_chicken` echt tot, plus **eine schwer unter-getunte Falle** (`cook_gallows_preserve` L50, nur **0,48× Ziel**). Diese Ausreißer rechtfertigen die Chef-Beschwerde voll.

**Top-3-Fixes:**
1. **`cook_gallows_preserve` L50: xp 16 → 34** (0,48× → 1,02× Ziel). Der mit Abstand schlimmste Einzelwert; eine L50-Aktion, die ~halbe Rate zahlt, ist der klarste „diabolische" Fall nach Durchsatz.
2. **1-XP-Totzone L1–L14 auflösen** — alle Einzel-Zutat-Aktionen auf **xp 2** heben (`grimwheat_porridge`, `murk_perch`, `bog_fowl`, `boar_loin` [= der vom Chef zitierte L8/1-XP-Fall], `honey_cake`, `hare`). Macht die Frühprogression monoton und belohnend statt „+1".
3. **Durchsatz-Inversionen im Einzel-Line killen** (neuer Unlock zahlt weniger x/h als eine schon offene niedrigere Aktion): `wolf_haunch` 3→4, `venison` 4→5, `bear_shank` 14→17, `wyvern_haunch` 65→76.

---

## 1. Methodik

- **XP-Kurve** (`packages/engine/src/leveling.ts`): `acc += floor(n + 300·2^(n/7))`, `xpForLevel(L+1) = floor(acc/4)`. Cap 99. RuneScape/Melvor-artig, exponentiell.
- **Ziel-Durchsatz** (Studio-Modell): `target_xph(L) = 90·√(xpForLevel(L+1) − xpForLevel(L))`.
- **Aktions-XP-Formel:** `xp = round(target_xph(levelRequired) · durationMs / 3_600_000)`, min 1.
- **Basis-XP/h einer Aktion:** `xp · 3_600_000 / durationMs`. Das ist die **ungebufte Grundrate** — Werkzeuge/Mastery (`perfectCook`-Effekt = +4% je Stufe u.ä.) liegen oben drauf und sind hier bewusst NICHT eingerechnet (Baseline = Worst Case).
- **Ratio** = Basis-XP/h ÷ target_xph(level). 1,00 = perfekt auf Kurve; <0,8 = untertunt/Falle; >1,4 = übergroßzügig.
- Alle Cooking-Aktionen verbrauchen Roh-Zutaten (Fisch/Fleisch aus Kampf-Drops bzw. Foraging/Farming-Crops) und geben 1× gekochtes Food zurück (chance 1). Keine Aktion hat Sekundär-Loot.

## 2. Referenz: XP-Kurve & Ziel-Durchsatz

| Level | xpForLevel | XP für L→L+1 | target_xph |
|---|---|---|---|
| 1  | 0 | 83 | 820 |
| 5  | 388 | 124 | 1.002 |
| 10 | 1.154 | 204 | 1.285 |
| 20 | 4.470 | 548 | 2.107 |
| 30 | 13.363 | 1.470 | 3.451 |
| 40 | 37.224 | 3.947 | 5.654 |
| 50 | 101.333 | 10.612 | 9.271 |
| 60 | 273.742 | 28.546 | 15.206 |
| 70 | 737.627 | 76.818 | 24.944 |
| 80 | 1.986.068 | 206.750 | 40.923 |
| 90 | 5.346.332 | 556.499 | 67.139 |
| 98 | 11.805.606 | 1.228.825 | 99.767 |

## 3. Aggregat: Der Skill ist NICHT „zu brutal" — die Kurve ist fair

Stunden für L→L+1 mit der **jeweils besten offenen Aktion** (Basis, ungebuft):

| ab Level | beste Aktion | Basis-XP/h | h für L→L+1 |
|---|---|---|---|
| 1  | cook_shrimp | 1.440 | 0,06 |
| 10 | cook_chicken | 2.400 | 0,09 |
| 30 | cook_ironscale_bass | 4.500 | 0,33 |
| 50 | cook_duskfin_carp | 10.080 | 1,05 |
| 70 | cook_anglerfish | 31.950 | 2,40 |
| 90 | cook_starcap_risotto | 67.200 | 8,28 |

Das ist eine **sanfte** Kurve (mit Mastery/Werkzeugen nochmal schneller). Die Chef-Beschwerde ist also **kein Durchsatz-Problem der Kurve**, sondern (a) das **Gefühl** kleiner XP-Zahlen früh und (b) einzelne **Löcher/Fallen**. Genau die sind unten adressiert.

## 4. Vollständige Aktions-Tabelle (Ist-Zustand)

Sortiert nach `levelRequired`. `xph` = Basis-XP/h. Fett = Problemfall.

| id | lvl | dur ms | xp | xph | target_xph | ratio | Klasse |
|---|---|---|---|---|---|---|---|
| cook_shrimp | 1 | 2.500 | 1 | 1.440 | 820 | 1,76 | Fisch |
| cook_ashroot_broth | 1 | 3.500 | 1 | 1.029 | 820 | 1,25 | Crop |
| cook_chicken | 2 | 3.000 | 2 | 2.400 | 859 | 2,80 | Fleisch |
| **cook_grimwheat_porridge** | 3 | 4.000 | 1 | 900 | 909 | 0,99 | Crop |
| cook_beef | 5 | 3.500 | 2 | 2.057 | 1.002 | 2,05 | Fleisch |
| **cook_murk_perch** | 5 | 2.500 | 1 | 1.440 | 1.002 | 1,44 | Fisch |
| **cook_bog_fowl** | 7 | 3.000 | 1 | 1.200 | 1.106 | 1,09 | Fleisch |
| **cook_boar_loin** | 8 | 3.200 | 1 | 1.125 | 1.167 | 0,96 | Fleisch |
| **cook_honey_cake** | 9 | 4.000 | 1 | 900 | 1.224 | **0,74** | Combo |
| cook_trout | 10 | 3.000 | 2 | 2.400 | 1.285 | 1,87 | Fisch |
| **cook_hare** | 14 | 3.200 | 1 | 1.125 | 1.569 | **0,72** | Fleisch |
| cook_cod | 15 | 3.500 | 3 | 3.086 | 1.647 | 1,87 | Fisch |
| cook_marshroot_chowder | 18 | 14.000 | 7 | 1.800 | 1.909 | 0,94 | Combo |
| cook_ghostfin_pike | 20 | 3.500 | 3 | 3.086 | 2.107 | 1,46 | Fisch |
| **cook_wolf_haunch** | 22 | 4.000 | 3 | 2.700 | 2.324 | 1,16 | Fleisch |
| cook_shadowcarp | 25 | 3.750 | 4 | 3.840 | 2.697 | 1,42 | Fisch |
| **cook_venison** | 28 | 4.500 | 4 | 3.200 | 3.127 | 1,02 | Fleisch |
| cook_ironscale_bass | 30 | 4.000 | 5 | 4.500 | 3.451 | 1,30 | Fisch |
| cook_salmon | 35 | 4.500 | 7 | 5.600 | 4.417 | 1,27 | Fisch |
| cook_bloodgrain_stew | 38 | 16.000 | 23 | 5.175 | 5.123 | 1,01 | Combo |
| cook_roc_drumstick | 40 | 5.500 | 9 | 5.891 | 5.654 | 1,04 | Fleisch |
| cook_duskfin_carp | 45 | 5.000 | 14 | 10.080 | 7.240 | 1,39 | Fisch |
| **cook_bear_shank** | 48 | 6.000 | 14 | 8.400 | 8.398 | 1,00 | Fleisch |
| cook_duskfin_rangers_stew | 48 | 10.000 | 23 | 8.280 | 8.398 | 0,99 | Combo |
| **cook_gallows_preserve** | 50 | 13.000 | 16 | 4.431 | 9.271 | **0,48** | Crop |
| cook_spellwarden_bisque | 52 | 10.000 | 28 | 10.080 | 10.235 | 0,98 | Combo |
| cook_lobster | 55 | 6.000 | 25 | 15.000 | 11.873 | 1,26 | Fisch |
| **cook_soulgourd_brisket** | 58 | 18.000 | 70 | 14.000 | 13.773 | 1,02 | Combo |
| cook_crypteel | 60 | 6.600 | 39 | 21.273 | 15.206 | 1,40 | Fisch |
| cook_bloodfang_eel | 63 | 7.000 | 47 | 24.171 | 17.640 | 1,37 | Fisch |
| cook_steelshot_bisque | 63 | 14.000 | 69 | 17.743 | 17.640 | 1,01 | Combo |
| cook_spellflare_tisane | 65 | 14.000 | 76 | 19.543 | 19.475 | 1,00 | Combo |
| cook_anglerfish | 70 | 8.000 | 71 | 31.950 | 24.944 | 1,28 | Fisch |
| **cook_wyvern_haunch** | 72 | 8.500 | 65 | 27.529 | 27.540 | 1,00 | Fleisch |
| cook_witherleek_bouillabaisse | 75 | 20.000 | 177 | 31.860 | 31.950 | 1,00 | Combo |
| cook_witherleek_sharpshooters_pie | 76 | 20.000 | 195 | 35.100 | 33.571 | 1,05 | Combo |
| cook_witherleek_arcane_broth | 77 | 20.000 | 215 | 38.700 | 35.275 | 1,10 | Combo |
| cook_wraithscale | 78 | 8.500 | 119 | 50.400 | 37.065 | 1,36 | Fisch |
| cook_voidray | 85 | 9.500 | 175 | 66.316 | 52.417 | 1,27 | Fisch |
| cook_ambergrain_feast | 90 | 22.000 | 410 | 67.091 | 67.139 | 1,00 | Combo |
| cook_starcap_risotto | 90 | 15.000 | 280 | 67.200 | 67.139 | 1,00 | Combo |
| cook_abyssal_crawler | 92 | 10.500 | 265 | 90.857 | 74.127 | 1,23 | Fisch |
| cook_soulfish | 97 | 11.500 | 368 | 115.200 | 94.948 | 1,21 | Fisch |

## 5. Befund: zwei Sichtweisen, ein Kern-Missverständnis

**Wichtig für die Bewertung von „toten Tiers":** Cooking hat **zwei Aktions-Klassen**, die sich auf denselben Levels überlappen:

- **Schnelle Einzel-Zutat-Aktionen** (Fisch/Fleisch, 2,5–9,5 s) — der eigentliche XP-Pfad.
- **Langsame Combo-/Crop-Gerichte** (10–22 s, mehrere Zutaten inkl. Farming-Crops + Kräuter) — Varianten/Senken für Farming-Output, **nicht** der XP-optimale Weg.

Ein 20-s-Combo hat bei gleichem Ratio zur Kurve zwangsläufig **weniger roh-XP-pro-Sekunde** als ein 6-s-Fisch. Ein naiver „bester-Durchsatz-sinkt-nie"-Monotonie-Test flaggt darum ~16 Combos als „tot" — das ist ein **Artefakt der Metrik**, kein echter Fehler: alle Combos liegen bei **Ratio 0,94–1,10 = fair auf Kurve**. Man darf Combos NICHT zwingen, schnelle Fische im Durchsatz zu schlagen.

**Richtige Metriken daher:**
1. **Ratio zur Zielkurve** (Fairness pro Aktion) — gilt für ALLE Aktionen.
2. **Interne Monotonie NUR innerhalb der Einzel-Zutat-Line** (der Pfad, den Spieler klettern).

### 5a. Echte Fallen (Ratio < 0,80) — Zeitverschwendung
| id | lvl | ratio | Diagnose |
|---|---|---|---|
| **cook_gallows_preserve** | 50 | **0,48** | Diabolisch. L50-Aktion zahlt <halbe Zielrate. Klassisches totes Tier. |
| **cook_hare** | 14 | 0,72 | Auf 1 XP eingefroren (Formel rundet 1,39→1). Unter Kurve. |
| **cook_honey_cake** | 9 | 0,74 | Combo (2 Honig + Korn), 4 s, nur 1 XP. Unter Kurve. |

### 5b. „Diabolisches Gefühl": die 1-XP-Frühzone (L1–L14)
`cook_bog_fowl` (L7), **`cook_boar_loin` (L8, = der vom Chef zitierte Fall)**, `cook_hare` (L14), `cook_murk_perch` (L5), `cook_grimwheat_porridge` (L3) geben alle **1 XP**. Nach Durchsatz sind sie teils sogar on-curve (boar_loin 0,96×) — aber sie stehen **unter dem gebufften `cook_chicken` (L2, 2.400 xph)** und lesen sich als „+1 = nichts". Das ist gleichzeitig ein **Gefühls-** und ein **echtes Totes-Tier-Problem** (ein L8-Unlock, der schlechter ist als eine L2-Aktion). Ursache: bei kurzen Frühzeit-Dauern (2,5–4 s) und kleinem target_xph rundet die Formel unweigerlich auf 1.

### 5c. Durchsatz-Inversionen INNERHALB der Einzel-Line (echte tote Tiers)
Neuer Fleisch/Fisch-Unlock zahlt weniger x/h als eine schon offene, niedrigere Einzel-Aktion:
| toter Unlock | xph | geschlagen von (offen) | xph |
|---|---|---|---|
| cook_wolf_haunch L22 | 2.700 | cook_cod L15 | 3.086 |
| cook_venison L28 | 3.200 | cook_shadowcarp L25 | 3.840 |
| cook_bear_shank L48 | 8.400 | cook_duskfin_carp L45 | 10.080 |
| **cook_wyvern_haunch L72** | 27.529 | **cook_anglerfish L70** | 31.950 |

`cook_wyvern_haunch` ist der auffälligste: 2 Level höher, aber strikt schlechter als Anglerfish → der Unlock bringt **nichts**.

### 5d. Übergroßzügige Ausreißer (Ratio > 1,4) — bewusst LASSEN
`chicken` 2,80 · `murk`(neu) · `cod`/`trout` 1,87 · `ghostfin_pike` 1,46 · `shadowcarp`/`duskfin_carp` ~1,4 · `crypteel` 1,40 · `bloodfang_eel` 1,37 · `wraithscale` 1,36. Diese sind **schneller als Ziel** — genau die Anti-Brutal-Richtung, die der Chef will, und absolut zeitgünstig (früh <0,2 h/Level). **Nicht nerfen.** Sie sind aber der Grund, warum benachbarte on-curve-Aktionen „tot" wirken. Wer eine mathematisch perfekt monotone Best-Kurve will, müsste diese Spikes auf ~1,1× stutzen (Alternativ-Weg, unten). Empfehlung: Spikes lassen, Löcher heben.

## 6. Empfehlungen (neue Zahlen)

Prinzip: **nur heben, nicht nerfen** (Chef-konform). Fallen auf ~Kurve (~1,0×) heben; Einzel-Line-Inversionen minimal über die vorige Einzel-Aktion heben; Frühzone auf ein sauberes, monotones „2er"-Band bringen (bewusst leicht über Kurve — bei <0,2 h/Level ist Gefühl > exakte Kurventreue). Combos/Crops mit Ratio 0,9–1,1 bleiben unangetastet.

| id | level | current xp | target xph | recommended xp | neue xph | neue ratio | Begründung |
|---|---|---|---|---|---|---|---|
| cook_grimwheat_porridge | 3 | 1 | 909 | **2** | 1.800 | 1,98 | Frühzone-Feel; monoton über shrimp. |
| cook_murk_perch | 5 | 1 | 1.002 | **2** | 2.880 | 2,87 | 1-XP raus; L5-Fisch neben beef(2). |
| cook_bog_fowl | 7 | 1 | 1.106 | **2** | 2.400 | 2,17 | 1-XP raus. |
| **cook_boar_loin** | 8 | 1 | 1.167 | **2** | 2.250 | 1,93 | **Der Chef-Anker** („L8, 1 XP"). |
| cook_honey_cake | 9 | 1 | 1.224 | **2** | 1.800 | 1,47 | Falle 0,74→ok; Combo mit 3 Zutaten. |
| cook_hare | 14 | 1 | 1.569 | **2** | 2.250 | 1,43 | Falle 0,72→ok; 1-XP raus. |
| cook_wolf_haunch | 22 | 3 | 2.324 | **4** | 3.600 | 1,55 | Inversion vs cod(3.086) beheben. |
| cook_venison | 28 | 4 | 3.127 | **5** | 4.000 | 1,28 | Inversion vs shadowcarp(3.840). |
| cook_bear_shank | 48 | 14 | 8.398 | **17** | 10.200 | 1,21 | Inversion vs duskfin_carp(10.080). |
| **cook_gallows_preserve** | 50 | 16 | 9.271 | **34** | 9.415 | 1,02 | **Top-Fix.** 0,48→1,02; Crop-Senke fair auf Kurve. |
| cook_soulgourd_brisket | 58 | 70 | 13.773 | **76** | 15.200 | 1,10 | Combo minimal über lobster(15.000). |
| cook_wyvern_haunch | 72 | 65 | 27.540 | **76** | 32.188 | 1,17 | Inversion vs anglerfish(31.950) beheben. |

**Nicht geändert / bewusst gelassen:** alle Combo-Gerichte mit Ratio 0,94–1,10 (`marshroot_chowder`, `bloodgrain_stew`, `duskfin_rangers_stew`, `spellwarden_bisque`, `steelshot_bisque`, `spellflare_tisane`, `witherleek_*`, `ambergrain_feast`, `starcap_risotto`) und alle über-Ziel-Fische (Anti-Brutal). `cook_shrimp`/`cook_ashroot_broth`/`cook_chicken`/`cook_beef`/`cook_trout`/`cook_cod` bleiben (Frühanker, absolut billig).

### Alternativer, „sauberer" Weg (falls perfekt monotone Best-Kurve gewünscht)
Statt nur zu heben: die Spike-Aktionen auf 1,05–1,15× stutzen (z. B. `chicken` bleibt 2 aber Dauer 3.000→hoch; `cod` 3→2; `duskfin_carp` 14→11; `bloodfang_eel` 47→38; `wraithscale` 119→100; `anglerfish` 71→62). Ergebnis: Best-verfügbar-Kurve steigt exakt monoton, alle Ratios in 0,95–1,15. **Nachteil:** enthält Nerfs → gegen die „nicht brutal"-Ansage. Nur wählen, wenn der Chef Kurven-Sauberkeit über maximale Großzügigkeit stellt. Standard-Empfehlung bleibt der Heben-Weg oben.

## 7. Apply-Liste für content-dev (geordnet, nach Chef-Freigabe)

In `packages/content/src/index.ts`, nur das `xp`-Feld der jeweiligen Aktion setzen (Dauern & Inputs unverändert):

1. `cook_gallows_preserve` (Zeile ~9127): `xp: 16` → `xp: 34`
2. `cook_boar_loin` (~5896): `xp: 1` → `xp: 2`
3. `cook_bog_fowl` (~5889): `xp: 1` → `xp: 2`
4. `cook_hare` (~5903): `xp: 1` → `xp: 2`
5. `cook_murk_perch` (~5969): `xp: 1` → `xp: 2`
6. `cook_grimwheat_porridge` (~9121): `xp: 1` → `xp: 2`
7. `cook_honey_cake` (~9293): `xp: 1` → `xp: 2`
8. `cook_wolf_haunch` (~5910): `xp: 3` → `xp: 4`
9. `cook_venison` (~5917): `xp: 4` → `xp: 5`
10. `cook_bear_shank` (~5931): `xp: 14` → `xp: 17`
11. `cook_wyvern_haunch` (~5938): `xp: 65` → `xp: 76`
12. `cook_soulgourd_brisket` (~6072): `xp: 70` → `xp: 76`

Die inline-Formelkommentare (`// target_xph(L)=…`) an den betroffenen Zeilen sollten bei der Einpflege mit aktualisiert werden, da die Werte dann bewusst vom reinen Formel-Rundungswert abweichen (Frühzone/Inversions-Override).

---

_Ende. Note 3/5. Kernaussage: Kurve fair, aber 1 diabolische Falle (gallows_preserve 0,48×) + 1-XP-Frühzone + 4 Einzel-Line-Inversionen = 12 gezielte XP-Bumps, keine Nerfs, keine Dauer-/Input-Änderungen._
