# Sweep 4 — Fishing (Angeln) Deep-Dive & Note

**Agent:** Skill-Deep-Dive #03 (Kontrolleur/QA) · **Datum:** 2026-07-01 · **Methode:** echter Engine-Treiber
(headless), `SimPlayer` + `createGame`/`advance` über die reale Tick-/`completeAction`-Engine. Best-Aktion-je-Level
**engine-gemessen** (10-min-Fenster je Repräsentativ-Level, mastery 0, no-rod UND best-rod), Ruten-Uplift-Messung
auf identischer Aktion, **echter L1→99-Durchlauf** (Best-Aktion-Kette, alle Ruten), gillrot-Pet-Drop über den
echten Angel-Pfad (bis Treffer), Ökonomie-/Freischalt-Kadenz-Analyse. Temp-Skript `fishing-sweep.test.ts` nach dem
Lauf **gelöscht**. Kein Spiel-Code geändert. Alle 4 Sub-Tests **grün** (inkl. Monotonie-Assertion über 17 Punkte).

**NOTE: B+** — mechanisch tadelloser Sammel-Skill mit der **besten Werkzeug-Achse im Spiel** (5 Ruten, spürbar
gestaffelt). XP/h **streng monoton** L1→97 auf Basis- UND Best-Ruten-Linie (0 Dips, engine-bestätigt); die
Sweep2-`duskfin_carp`-Delle ist **gefixt** (L45 14.400 > salmon L35 13.292). 17 Fische, **vollständige Roh→Koch-
Kette** (jeder Fisch kochbar, 0 verwaiste Roh-Items), **erreichbarer Pet** (gillrot über echten Pfad bestätigt),
**Mastery-Pool bei L99 auf 100 %** (alle 4 Checkpoints inkl. Capstone), lukrative & exploit-freie Ökonomie
(~51 k Gold/h roh), plus passiver `lck`→Krit-Zufluss für den Kampf. Abzüge nur Design/Feel: **Mid-Game-Plateau
L35–55** (salmon/duskfin/lobster nur +15 % xph über 20 Level; `lobster` das schwache Glied) und **zwei
10-Level-Freischalt-Lücken** (L35→45, L45→55). **Keine P0–P2**, keine Walls, kein Exploit — ship-tauglich.

---

## 1) XP/h-Kurve L1→99 — streng monoton, keine toten/regressiven Tiers (confirmed)

Beste freigeschaltete Angel-Aktion je Band. XP fällt in `completeAction` **je Abschluss unabhängig von der
Fang-Chance** (loot.chance mindert nur den Fisch, nicht die XP) → `xph = xp/durationMs·3.6e6`. Gemessen: fresh
State auf `levelRequired`, 10-min-Fenster, mastery 0. **eng.noRod ≈ Analytik ±1 %**; **eng.rod** = gelebte Rate
mit der auf dem Level besten nutzbaren Rute. Monotonie-Assertion (17 Punkte, Basis UND Best-Ruten) **grün**,
`dips on best-line: NONE`.

| Lvl | Best-Aktion | ms | xp | Soll xph | Ist noRod | **Ist best-Rute** | Rute | fish/h |
|----:|-------------|---:|---:|---------:|----------:|------------------:|------|-------:|
| 1  | catch_shrimp         | 3000  | 2   | 2.400   | 2.400   | **2.580**   | crude    | 1.314 |
| 5  | catch_murk_perch     | 3500  | 3   | 3.086   | 3.078   | **3.330**   | crude    | 1.140 |
| 10 | catch_trout          | 4000  | 4   | 3.600   | 3.600   | **4.248**   | ash      | 978 |
| 15 | catch_cod            | 5000  | 7   | 5.040   | 5.040   | **5.964**   | ash      | 804 |
| 20 | catch_ghostfin_pike  | 5500  | 10  | 6.545   | 6.540   | **7.740**   | ash      | 744 |
| 25 | catch_shadowcarp     | 5750  | 13  | 8.139   | 8.190   | **10.608**  | grimwood | 780 |
| 30 | catch_ironscale_bass | 6000  | 17  | 10.200  | 10.200  | **13.362**  | grimwood | 708 |
| 35 | catch_salmon         | 6500  | 24  | 13.292  | 13.392  | **17.424**  | grimwood | 654 |
| 45 | catch_duskfin_carp   | 7000  | 28  | 14.400  | 14.448  | **21.504**  | bonesteel| 696 |
| 55 | catch_lobster        | 8000  | 34  | 15.300  | 15.300  | **22.848**  | bonesteel| 618 |
| 60 | catch_crypteel       | 8300  | 48  | 20.819  | 21.024  | **31.104**  | bonesteel| 570 |
| 63 | catch_bloodfang_eel  | 8500  | 57  | 24.141  | 24.282  | **36.252**  | bonesteel| 564 |
| 70 | catch_anglerfish     | 9000  | 80  | 32.000  | 32.160  | **56.160**  | void     | 636 |
| 78 | catch_wraithscale    | 9500  | 134 | 50.779  | 51.456  | **90.048**  | void     | 642 |
| 85 | catch_voidray        | 10500 | 195 | 66.857  | 67.860  | **119.340** | void     | 606 |
| 92 | catch_abyssal_crawler| 11500 | 293 | 91.722  | 93.174  | **165.252** | void     | 534 |
| 97 | catch_soulfish       | 12500 | 404 | 116.352 | 118.776 | **213.312** | void     | 468 |

**Time-to-99 (echter Durchlauf, Best-Ruten + Best-Aktion, inkl. Mastery-Speed):** **108,0 h** reine Angel-Zeit
(Gesamt-XP 13.034.431), 86.763 gefangene Fische. Für einen Idle-Sammel-Skill (mit Offline-Fortschritt) normal;
endgame-XP-Inflation ist known/accepted.

**Bestes vs. schlechtestes je Band:** Auf der Best-Linie **keine Regression**. Es gibt keine „schwächere
Alternativ-Aktion" pro Band — Angeln hat pro Level-Fenster genau **eine** beste Aktion (linearer Tier-Stapel).
Nebenbeobachtung: `fish/h` **sinkt** mit dem Tier (shrimp 1.314 → soulfish 468), weil höhere Tiers länger dauern —
XP/h steigt trotzdem, weil die XP je Fisch schneller wächst. Für die Koch-Versorgung heißt das: High-Tier-Fisch
kommt langsamer rein (Stockpile-/Puffer-Modell, intendiert).

## 2) Mid-Game-Plateau L35–55 — die einzige echte Feel-Schwäche (confirmed)

Der XP/h-**Gradient** ist ungleich verteilt. Bänder im Vergleich (Basis-xph):

- **L20→35** (pike→bass→salmon): 6.545 → 13.292 = **+103 %** über 15 Level — gute Steigung.
- **L35→55** (salmon→duskfin→lobster): 13.292 → 14.400 → 15.300 = **+15,1 %** über **20 Level** — **flach.**
- **L55→70** (lobster→crypteel→eel→anglerfish): 15.300 → 32.000 = **+109 %** über 15 Level — gute Steigung.

Das schwache Glied ist **`catch_lobster` (L55)**: 15.300 xph sind nur **+6,25 %** über `duskfin_carp` (L45,
14.400) — trotz 10 Level mehr UND längerer Dauer. `duskfin_carp` selbst ist relativ zu salmon (+8,3 %) ok. Dieses
Plateau ist faktisch der **Nachfolger der 2026-07 gefixten L20–35-Dead-Band** (die Salmon-Anchor-Umskalierung hat
L20–35 geglättet, die Flachheit aber nach L35–55 verschoben). Gemildert wird es in der gelebten Rate durch das
**Ruten-Upgrade auf `bonesteel` bei L45** (Best-Ruten-Band L35–55: 17.424 → 21.504 → 22.848 = +31 %) — aber
lobster→duskfin bleibt auch best-Rute nur +6 %. **Kein Wall** (xph steigt monoton), aber die grindigste,
am wenigsten belohnende Strecke des Skills. Soll-Werte s. Finding F1.

## 3) Freischalt-Takt & Roh→Koch-Kette (confirmed — Kette stark, Kadenz mittig lückig)

**17 Angel-Aktionen**, Freischalt-Level: 1, 5, 10, 15, 20, 25, 30, 35, **45**, **55**, 60, 63, 70, 78, 85, 92, 97.
Früh dichter Takt (alle 5 Level etwas Neues), dann **zwei 10-Level-Lücken (L35→45 und L45→55)** ohne neuen Fisch,
danach 3–8er-Abstände. Die L35–55-Lücken decken sich mit dem Plateau aus §2 — hier ist der Skill am zähesten.

**Kette sauber verdrahtet:** **jeder** der 17 Roh-Fische hat genau **eine** Koch-Aktion (`cook_*`, Input qty 1,
Output chance 1) — 0 verwaiste Roh-Items. Roh-Angel-Level ≈ Koch-Level (raw_shrimp L1→cook L1; trout L10→L10;
salmon L35→L35; lobster L55→L55; anglerfish L70→L70; voidray L85→L85; soulfish L97→L97). Mehrere Roh-Fische
(raw_shrimp, raw_cod, raw_salmon, raw_lobster …) droppen zusätzlich aus Monstern (Sekundärquelle) und speisen
Fleisch/Combo-Rezepte — nichts hängt tot herum.

## 4) Werkzeug-/Ruten-Progression — die beste Tool-Achse im Spiel (confirmed, stark)

5 Ruten, alle **Shop-kaufbar**, sauber gestaffelt — und **keine harte Voraussetzung** (Angeln geht barhändig,
`bestToolSpeed` = 1 ohne Rute, kein Gold-Gate):

| Rute | req fishing | speedMult | Shop-Preis |
|------|:-----------:|:---------:|-----------:|
| crude_fishing_rod | 0  | 0.93 | 100 |
| ash_fishing_rod   | 10 | 0.85 | 280 |
| grimwood_rod      | 25 | 0.77 | 720 |
| bonesteel_rod     | 45 | 0.68 | 1.700 |
| void_rod          | 65 | 0.58 | 3.800 |

Gemessener Uplift auf identischer Aktion (`catch_anglerfish`, xph): noRod 32.160 → crude 35.040 → ash 38.400 →
grim 42.240 → bone 48.000 → **void 56.160**. **void vs. noRod = +74,6 %**, jede Stufe +9…+17 % — deutlich spürbar
und mit steigendem Sprung (Belohnungs-Beschleunigung). Ruten-Freischalt (L0/10/25/45/65) fällt schön mit den
Fisch-Tiers zusammen (bonesteel@L45=duskfin, void@L65 kurz vor anglerfish@L70).

## 5) Drops + Skill-Pet gillrot (confirmed erreichbar — aber Long-Tail)

- **gillrot**, `dropChance 1/110000`, `source {kind:"skill", skill:"fishing"}` — Wurf in `tryPetDrop` je
  `completeAction`. **Empirisch bestätigt dropbar:** über den echten Angel-Pfad (catch_shrimp, void-Rute) fiel
  gillrot nach **467.078 Fängen** (Erwartung 4,25 über die Spanne). Bestätigt zugleich das Sweep-3-Muster
  „Skilling-Pet über echten Pfad erreichbar" (analog witherling).
- **`skillEffect { kind:"doubleDrop", skill:"fishing", value:0.05 }`** — +5 % Doppel-Fang, korrekt skill-scoped.
  **`combatAbility { kind:"burstDamage", intervalMs:5000, value:0.07 }`** — voll verdrahtet.
- **Erreichbarkeit im 1→99:** 86.763 Fänge ⇒ **E ≈ 0,79 gillrot pro Durchlauf** — der Durchschnittsspieler hat
  ihn bei L99 **noch nicht** (Chase-Pet, ~110 k Fänge / ~235 h @ soulfish für E=1). Liegt im Rahmen der
  Geschwister-Pets (mining cragmaw 1/95.000, cooking ashgut 1/100.000) — **kein Bug**, bewusst seltenes Grind-Pet.
- **Keine Bonus-/Sekundär-Drops** beim Angeln (Loot = nur der Fisch); Zusatz-Ertrag liefert die Mastery-/Pet-
  Doppelchance. Für einen Sammel-Skill korrekt.

## 6) Ökonomie & Mastery

**Mastery (rewarding, confirmed):** Der **Mastery-Pool erreicht bei L99 exakt 100 %** — d. h. **alle 4
Checkpoints inkl. Capstone** sind freigeschaltet (double +3 %+5 %=**+8 %**, speed +4 %+4 %=**+8 %**, preserve +5 %).
Dazu Aktions-Mastery: Doppel-Fang bis **+49 %**, Speed bis **−14,7 %**. Netto am Cap ≈ **~57 % Chance auf doppelten
Fisch** + **~−21 % Dauer (≈ +27 % xph)**. Hinweis: die **Preserve**-Achse (Material-Refund) ist für Angeln
**wirkungslos** (Sammel-Aktion ohne `inputs`) — für einen Gather-Skill ist das systemkonform (die relevante
Belohnung ist Doppel-Fang + Speed), nur eben ein „toter" Teil des generischen Mastery-Panels.

**Gold/Ökonomie (lukrativ, exploit-frei):** Roh-Verkauf im 1→99-Durchlauf = **5.546.753 Gold** bei 86.763 Fischen
⇒ **~51.359 Gold/h** (SELL_FRACTION 0,5 auf value 3→340 je Tier). Angeln ist damit ein **starker Gold-Faucet** —
höher als die meisten Verarbeitungs-Skills, weil der Fang selbst gehandelt werden kann. **Kein Round-Trip-Exploit**
(Fische werden mit gedeckelter Rate gesammelt, kein Kauf<Verkauf-Loop; Ruten sind einmalige Sinks). Wirtschaftlich
konkurriert Roh-Verkauf mit „Fisch kochen" (Cooking-XP + Heil-/Buff-Food) — gesunde Spieler-Entscheidung.

**Cross-System:** Angeln trainiert `lck` (÷4, geteilt mit foraging/thieving). Angeln 99 (solo) ⇒ ~+25 lck ⇒
**+7,5 % Krit-Chance und +0,5 Krit-Schaden** passiv für den Kampf — ein netter, unaufdringlicher Nutzen über den
Skill hinaus.

## 7) Findings (schwerste zuerst — alle P3, keine P0–P2)

**[P3][balance] F1 — Mid-Game-XP/h-Plateau L35–55; `catch_lobster` das schwache Glied (confirmed).**
`content/src/index.ts:5558` (catch_lobster xp 34) + `:5590` (catch_duskfin_carp xp 28). salmon→duskfin→lobster =
13.292→14.400→15.300 xph = nur +15 % über 20 Level; lobster nur +6,25 % über duskfin trotz +10 Level & +1.000 ms.
**Soll (für ~+7 %/Band-Steigung Richtung crypteel 20.819):** `catch_lobster` xp **34→42** (≈ 18.900 xph),
`catch_duskfin_carp` xp **28→32** (≈ 16.457 xph). Owner: **balance-designer → content-dev**.

**[P3][feel] F2 — Zwei 10-Level-Freischalt-Lücken L35→45 und L45→55 (confirmed).** Früh alle 5 Level neu, mittig
20 Level nur 2 neue Fische. Deckt sich mit dem Plateau (F1). **Soll:** je ein Füller-Fisch bei **L40** und **L50**
(z. B. thematisch „Gloomfin"/„Tidewraith"), xph auf der geglätteten Kurve (~15.900 bzw. ~18.500) — löst F1 und F2
in einem Zug und hält den „etwas Neues"-Takt. Owner: **content-dev** (Kreativ-Lizenz gedeckt).

**[P3][feel] F3 — Kein Köder/Bait-System; keine Angel-Quest (confirmed, optional).** Der Sweep-Auftrag nennt
„Ruten-/**Köder**-Progression" — **Köder existieren nicht** (nur Ruten; `catch_anglerfish`/`catch_soulfish`
tragen „Lure/ködern" nur als Flavor). Ebenso referenziert **keine Quest** Angeln (10 Skill-Achievements L10–99
existieren und sind erreichbar). **Kein Bug.** Optional als zweite Progressions-Achse: verbrauchbare Köder-Tiers
(z. B. +Doppel-Fang-Chance oder −Dauer, gestaffelt), das würde die (ohnehin schon starke) Ruten-Achse ergänzen.
Owner: **content-dev** (Design-Call, Chef).

## 8) Bestätigte Sweep-3-Fixes (nicht neu gemeldet)

- **`duskfin_carp`-Delle GEFIXT:** L45 14.400 xph > salmon L35 13.292 < lobster L55 15.300 — monoton, bestätigt.
- **Balance-Parität/Monotonie L1–90:** Best-Linie streng monoton (Assertion grün), Ist=Soll ±1 % (noRod).
- **gillrot-Skilling-Pet dropbar** über den echten Pfad (analog witherling-Fix): empirisch bestätigt.
- **Ruten-Progression** (crude→void, 0.93→0.58) intakt und spürbar (+74,6 %).

---

## NOTE: **B+**

Sauber getunter Sammel-Skill mit streng monotoner XP-Kurve (engine-bestätigt, Sweep2-Delle gefixt), der **besten
Werkzeug-Achse im Spiel** (5 spürbar gestaffelte Ruten), vollständiger Roh→Koch-Kette ohne verwaiste Items,
erreichbarem Pet, bei L99 voll ausgefahrenem Mastery-Pool (100 %, alle Checkpoints), lukrativer exploit-freier
Ökonomie und passivem Krit-Zufluss über `lck`. Kein Bug, keine Wall, kein Exploit. Abzüge nur für das
**Mid-Game-Plateau L35–55** und die **zwei 10-Level-Freischalt-Lücken** dort — die einzige zähe Strecke eines
sonst runden Skills. Näher an A- gehalten allein durch diese mittige Flaute.

**Top-3-Findings:** F1 Mid-Game-Plateau L35–55 / lobster zu schwach (P3/balance) · F2 zwei 10-Level-Freischalt-
Lücken L35–55 (P3/feel) · F3 kein Köder- und kein Quest-Hook (P3/feel).

**Top-3-Verbesserungen:** (1) `catch_lobster` xp 34→42 und `catch_duskfin_carp` 28→32 · (2) Füller-Fisch bei L40
(~15.900 xph) und L50 (~18.500 xph) — schließt Plateau UND Lücken · (3) optionale Köder-Verbrauchs-Tiers als
zweite Progressions-Achse (bonus double-catch / −Dauer).
