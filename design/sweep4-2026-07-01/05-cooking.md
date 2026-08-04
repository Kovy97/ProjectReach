# Sweep 4 — Cooking (Kochen) Deep-Dive & Note

**Agent:** Skill-Deep-Dive #05 (Kontrolleur/QA) · **Datum:** 2026-07-01 · **Methode:** echter Engine-Treiber
(headless), `SimPlayer` + `createGame`/`advance` über die reale Tick-/`completeAction`-Engine. Best-Aktion-je-Level
analytisch UND **engine-gemessen** (1 h-Sim je Repräsentativ-Level, mastery 0), Mastery-Uplift-Messung,
ashgut-Pet-Force-Drop über den echten Koch-Pfad (6 Seeds), maxHp-Probe für Heilwert-Deckung, Ökonomie-
und Freischalt-Kadenz-Analyse. Temp-Skript `cooking-sweep.test.ts` (+`_hpprobe`) nach dem Lauf **gelöscht**.
Kein Spiel-Code geändert.

**NOTE: B+** — mechanisch sauberer, dicht getakteter Verarbeitungs-Skill. XP/h **streng monoton** auf der
Best-Linie L1→97 (0 Dips, engine-bestätigt), Ist deckt sich mit Analytik (±7 %, mastery 0), **~51 Aktionen**
mit sehr dichter Freischalt-Kadenz (fast jedes 1.–3. Level etwas Neues), **rewarding Mastery** (Doppelertrag
~57 % + Preserve ~44 % ⇒ ~2,8× Roh-Effizienz am Cap), **ashgut-Pet über den echten Pfad erreichbar** (~1
Drop pro 1→99), tiefe Heil-/Buff-Food-Leiter inkl. Melee/Ranged/Magic-Stil-Parität. Abzüge nur kosmetisch/
Design: **kein Verbrenn-/Fehlversuch-System** (Kochen ist 100 % deterministisch; das Pet-`perfectCook` ist
faktisch Preserve, kein Anti-Burn), **keine Werkzeug-Stufe** (Angeln hat 5 Ruten, Kochen 0), 1 value-negatives
Rezept (`cake_honey`). **Keine P0–P2**, keine echten Walls — ship-tauglich.

---

## 1) XP/h-Kurve L1→99 — monoton, keine toten/regressiven Tiers (confirmed)

Beste freigeschaltete Koch-Aktion je Band, `xph = xp/durationMs·3.6e6`. **Ist (engine, 1 h-Sim, mastery 0) =
Soll (Analytik)** — Abweichung nur durch gebankte In-Progress-Aktion/Rundung (+2…+7 %). Monotonie-Assertion
über 21 Level-Punkte **grün**, `dips on best-line: NONE`.

| Lvl | Best-Aktion | ms | xp | Soll xph | Ist xph (1 h) |
|----:|-------------|---:|---:|---------:|--------------:|
| 1 | cook_shrimp | 2500 | 1 | 1.440 | 1.447 |
| 5 | cook_murk_perch | 2500 | 2 | 2.880 | 2.908 |
| 15 | cook_cod | 3500 | 3 | 3.086 | 3.111 |
| 25 | cook_shadowcarp | 3750 | 4 | 3.840 | 3.880 |
| 30 | cook_ironscale_bass | 4000 | 5 | 4.500 | 4.555 |
| 35 | cook_salmon | 4500 | 7 | 5.600 | 5.670 |
| 40 | cook_roc_drumstick | 5500 | 9 | 5.891 | 5.967 |
| 45 | cook_duskfin_carp | 5000 | 14 | 10.080 | 10.290 |
| 50 | cook_bear_shank | 6000 | 17 | 10.200 | 10.370 |
| 55 | cook_lobster | 6000 | 25 | 15.000 | 15.350 |
| 60 | cook_crypteel | 6600 | 39 | 21.273 | 21.801 |
| 63 | cook_bloodfang_eel | 7000 | 47 | 24.171 | 24.863 |
| 70 | cook_anglerfish | 8000 | 71 | 31.950 | 32.873 |
| 72 | cook_wyvern_haunch | 8500 | 76 | 32.188 | 33.212 |
| 77 | cook_witherleek_arcane_broth | 20000 | 215 | 38.700 | — |
| 78 | cook_wraithscale | 8500 | 119 | 50.400 | 52.479 |
| 85 | cook_voidray | 9500 | 175 | 66.316 | 70.175 |
| 90 | cook_starcap_risotto | 15000 | 280 | 67.200 | 70.560 |
| 92 | cook_abyssal_crawler | 10500 | 265 | 90.857 | 96.990 |
| 97 | cook_soulfish | 11500 | 368 | 115.200 | 124.016 |

Bemerkenswert: die L75–77 **Witherleek-Combo-Trio** (bouillabaisse/pie/arcane_broth, ~29–38,7 k xph) ist im
eigenen Band tatsächlich **die beste Aktion** — Combo-Gerichte sind also nicht nur Buff-Food, sondern dort auch
XP-Spitze. Die 2026-07-Balance-Fixes greifen sichtbar: die früher „1-XP-Floor"/Sub-Curve-Fleisch-Aktionen
(bog_fowl, boar_loin, hare, wolf, venison, bear_shank, wyvern) liegen jetzt sauber auf/über der Kurve.

**Time-to-99 (Best base xph, mastery 0, kein Doppelertrag): ~224 h** reine Koch-Zeit (Gesamt-XP 13.034.431).
Mit Mastery-Speed (−~22 %) real näher ~180 h — plus die Roh-Beschaffung (Angeln/Farming/Combat), die den
echten Engpass bildet. Für einen terminalen Verarbeitungs-Skill normal (endgame-XP-Inflation ist known/accepted).

**Bestes vs. schlechtestes je Band:** Auf der Best-Linie gibt es keine Regression. Die „schwächeren" Aktionen
sind durchweg **Alternativ-Input-Rezepte** (Fleisch/Crop/Combo), die niedrigere xph gegen eine andere,
evtl. im Überschuss vorhandene Ressource tauschen — bewusste Vielfalt, kein toter Content (s. §2).

## 2) Sub-Kurven-Aktionen — kontextuell, kein toter Content (confirmed)

Automatischer Check „Aktion < 75 % der Best-xph im eigenen Level": 5 Treffer, alle Alternativ-Input-/Buff-
Rezepte:

| Aktion | Lvl | xph | Best im Band | Anteil | Einordnung |
|--------|----:|----:|-------------:|-------:|-----------|
| cook_ashroot_broth | 1 | 1.029 | shrimp 1.440 | 71 % | Crop→Mahlzeit-Senke (kein Fisch nötig) |
| cook_beef | 5 | 2.057 | murk_perch 2.880 | 71 % | Fleisch-Alternative |
| cook_honey_cake | 9 | 1.800 | murk_perch 2.880 | 63 % | Foraging→Cooking-Senke |
| cook_marshroot_chowder | 18 | 1.800 | cod 3.086 | 58 % | T1-Combo-Buff-Food |
| cook_steelshot_bisque | 63 | 17.743 | bloodfang_eel 24.171 | 73 % | Ranged-Stil-Combo-Buff |

Alle liefern Buff-/Heil-Food bzw. verwerten eine Neben-Ressource — sie sind **nie eine Falle** (der Spieler,
der XP will, nimmt den Fisch; wer Buff-Food will, nimmt das Combo). Kein Handlungsbedarf.

## 3) Freischalt-Takt & Roh→Gekocht-Kette (confirmed, stark)

~51 Koch-Aktionen von L1 bis L97. Freischalt-Level: 1,1,2,3,5,5,7,8,9,10,14,15,15,18,20,22,25,25,28,30,30,35,
35,38,40,45,45,48,48,50,52,55,55,58,60,60,63,63,65,70,70,72,75,76,77,78,85,90,90,92,97 — **fast jedes 1.–3.
Level etwas Neues**, keine langen Leerläufe. Sehr dichte Kadenz (besser als Farming/Mining in diesem Sweep).

**Kette sauber verdrahtet:** Fisch-Roh-Level ≈ Koch-Level (raw_shrimp Angeln L1→cook L1; trout L10→L10; cod
L15→L15; salmon L35→L35; lobster L55→L55; anglerfish L70→L70; voidray L85→L85; soulfish L97→L97). Fleisch-
Roh-Inputs (raw_wyvern_haunch, raw_bear_shank, raw_bog_fowl …) sind als **Monster-Drops referenziert** (≥3 Refs
je Item = Def + Koch-Input + Drop-Quelle), Combo-Inputs (starcap_truffle, ambergrain, wither_leek,
herb_godsbreath) haben 5–11 Refs — nichts verwaist. Kleiner Feel-Punkt: Koch-Dauer ist meist **kürzer** als die
Angel-Dauer desselben Fischs (cook_anglerfish 8000 < catch 9000; cook_soulfish 11500 < 12500) → man kocht
schneller als man fischt, braucht also einen Roh-Puffer (Stockpile-Modell, intendiert).

## 4) Heilwerte je Tier — decken sie den Combat-Bedarf? (confirmed, adäquat mit früher Delle)

maxHp-Probe (alle Skills auf L, ohne Gear): L1=110, L25=482, L50=867, L75=1252, L99=1624 (+Gear-maxHp on top).
Heil-Leiter Fisch: shrimp 8 → trout 20 → cod 35 → salmon 55 → lobster 80 → anglerfish 120 → voidray 170 →
soulfish 270. Combo/Fleisch: marshroot 35 → bloodgrain_stew 70 → soulgourd_brisket 115 → bouillabaisse 185 →
ambergrain_feast 265 → risotto_starcap 350.

- **Bester Bissen als % maxHp:** früh ~7–13 %, mid/late **~15–25 %**. Die Heil-Leiter wächst **schneller** als
  maxHp (Heal 8→350 ≈ 44×; maxHp 110→1624 ≈ 15×) — spät leicht großzügig, früh etwas dünn.
- **Auto-Eat** (Cooldown 3 s, Schwelle 50 % HP@Tier 0, healMult 1.0): bester Spät-Sustain 350/3 s ≈ **117 HP/s**
  + hpRegen-Buff (risotto +8/s, feast +12/s). Deckt idle-Combat-Bedarf.
- **Frühe Delle:** shrimp 8 HP @ maxHp 110 = 7 %/Bissen ist knapp — fällt aber in „Bronze-Baseline undergeared
  worst-case", das ausdrücklich als known/accepted markiert ist. Kein neuer Befund.
- **Stil-Parität in Buff-Food gepflegt:** Combo-Trios liefern Melee (bloodgrain_stew/bouillabaisse), Ranged
  (rangers_stew/steelshot_bisque/sharpshooters_pie) UND Magic (spellwarden_bisque/spellflare_tisane/arcane_broth)
  — gleiche Heal/hpRegen, stil-spezifischer Bonus. Saubere 3-Stile-Balance.

## 5) Burn-Chance / Fehlversuche — es gibt KEINE (confirmed; Design)

`completeAction` (tick.ts) hat **keinen** Verbrenn-/Fehlschlag-Pfad für Kochen: alle Koch-Loots haben
`chance: 1`, `successBase` ist thieving-only, es existiert **kein `burnt_*`-Item**. Kochen ist 100 %
deterministisch. Konsequenz für das **ashgut-Pet**: `skillEffect { kind: "perfectCook", value: 0.04 }` mappt in
`pets.ts`/`completeAction` auf **Preserve** (Material-Refund) — d. h. es ist mechanisch „4 % Chance, den Roh-Fisch
nicht zu verbrauchen", NICHT Anti-Verbrennen. Die Pet-Beschreibung („beruhigt die Flamme, damit nichts verkohlt")
beschreibt damit eine Mechanik, die es nicht gibt. Kein Bug (Preserve ist real & sinnvoll), aber Flavor↔Mechanik
divergieren — s. Finding F2.

## 6) Werkzeug-/Upgrade-Progression — keine (confirmed)

Kochen hat **keine Werkzeug-Stufe**. Angeln bietet 5 Ruten (crude 0.93 → void 0.58); Kochen 0. Einzige Speed-
Hebel: Mastery-Speed (−14,7 % @ Cap) + Pool (−8 %). Das ist konsistent mit anderen Verarbeitungs-Skills
(Smithing/Fletching sind ebenfalls werkzeuglos), lässt Kochen auf der Gear-Upgrade-Achse aber flach wirken.
Optionaler Vorschlag in §9.

## 7) Drops + Skill-Pet ashgut (confirmed erreichbar)

- **ashgut**, `dropChance 1/100000`, `source {kind:"skill", skill:"cooking"}` — Wurf in `tryPetDrop` **je
  completeAction**. Force-Drop-Lauf (cook_shrimp, 6 Seeds): **3/6 Seeds** erhielten ashgut innerhalb 18k–60k
  Abschlüssen; Gesamt 292k Abschlüsse. Erwartung ~1 Drop / 100k. Ein realer 1→99 hat >100k Abschlüsse ⇒ **~1
  ashgut pro Durchlauf** — deutlich besser erreichbar als das Farming-Witherling-Pet (~1,5 %) aus #06.
- **combatAbility** `{ kind:"heal", intervalMs:5000, value:0.1 }` (10 % Heilung/5 s im Kampf) — voll verdrahtet.
- **Keine Bonus-/Sekundär-Drops** beim Kochen (Loot = nur das Gericht). Für einen Verarbeitungs-Skill korrekt;
  „Zusatz-Ertrag" liefert stattdessen die Mastery-Doppelchance.

## 8) Ökonomie & Mastery

**Mastery (rewarding, confirmed):** Aktions-Mastery 99 + voller Pool gemessen **+22,2 % xph** (Speed 0.853 ×
Pool-Speed 0.92). Dazu **Doppelertrag ~49 % (Aktion) +8 % (Pool) ≈ 57 %** doppeltes *Food* pro Koch UND
**Preserve ~39 % +5 % ≈ 44 %** Chance, den Roh-Input nicht zu verbrauchen. Netto am Cap: ~1,57 Gerichte je Koch
aus ~0,56 Rohwaren ⇒ **~2,8× Roh-Effizienz**. Für einen Food-Produktions-Skill ist das eine sehr spürbare,
lohnende Mastery (die Doppel-/Preserve-Achse ist hier wertvoller als der Speed).

**Gold/Ökonomie (heal-fokussiert, exploit-frei):** Roh→Gekocht-Marge fast durchweg positiv (+2 bis +540).
Ausreißer: **`cake_honey` Marge −14** (2×wildhive_honey@16=32 → cake_honey value 18 → Kochen *vernichtet*
Item-Wert) und cooked_shadowcarp −2 (vernachlässigbar). Kochen ist ein **Heil-/Buff-Food-Produzent, kein
Gold-Faucet** (Margen klein; Rohwaren kosten Zeit). heal/gold: früh effizient (1,5–3,3), späte Combos premium
(0,2–0,5, dafür Buffs). Kein Round-Trip-Exploit (Sell < value; man muss die Rohwaren selbst stellen).

## 9) Findings (schwerste zuerst — alle P3, keine P0–P2)

**[P3][balance] F1 — `cake_honey` ist value-negativ (confirmed).** `content/src/index.ts:9363` (cook_honey_cake)
+ `:4248` (cake_honey). Inputs 2×wildhive_honey (value 16 → 32) ergeben cake_honey value 18 → Marge −14. Kochen
verbrennt hier Item-Wert. **Soll:** cake_honey.value 18→**34** (auf Input-Wert + Koch-Marge) oder Input auf
1×wildhive_honey senken. Owner: **content-dev**.

**[P3][feel] F2 — Kochen hat kein Verbrenn-/Fehlversuch-System; Pet-`perfectCook` ist faktisch Preserve
(confirmed).** `tick.ts completeAction` (kein burn-Pfad) + `content:13473` (ashgut). Kein `burnt_*`-Item, alle
Loots chance 1. Der Pet-Effekt „perfectCook +4 %" wirkt als Material-Preserve, nicht als Anti-Burn — Flavor↔
Mechanik divergieren. Reine Design-Frage (Chef): entweder (a) Pet-Text/`kind` auf Preserve umtexten, oder (b)
optional ein level-skalierendes Burn-System einführen (Burn-Chance ~ max(0, (levelReq+5 − level))·x %, Output
`burnt_X` heal 0) für Früh-Textur. Owner: **content-dev** (Text) bzw. **combat-dev/logic-dev** (falls Burn-System).

**[P3][feel] F3 — keine Koch-Werkzeug-Stufe (confirmed, optional).** Angeln 5 Ruten, Kochen 0. Konsistent mit
Smithing/Fletching, aber flach auf der Upgrade-Achse. Optional: eine „Kochgeschirr"-Toolreihe (Pfanne/Kessel,
speedMult 0.93→0.6, req cooking 1/25/45/65) analog zu den Ruten. Owner: **content-dev** (Design-Call, Chef).

## 10) Bestätigte Sweep-3-Fixes (nicht neu gemeldet)

- Balance-Parität ±10 % L1–90: **bestätigt** (Best-Linie monoton, Ist=Soll ±7 %).
- „1-XP-Floor"/Sub-Curve-Fleisch-Aktionen (bog_fowl L7, boar_loin L8, hare L14, wolf L22, venison L28, bear_shank
  L48, wyvern L72) sowie `cook_gallows_preserve` L50 (16→34 xp): **bestätigt on-curve**.
- Stil-Parität Ranged/Magic-Combo-Food (steelshot/spellflare/sharpshooters/arcane_broth): **bestätigt** (gleiche
  Heal/hpRegen, stil-spezifischer Bonus).

---

## NOTE: **B+**

Dicht getakteter, sauber getunter Verarbeitungs-Skill mit streng monotoner XP-Kurve (engine-bestätigt),
exzellenter Freischalt-Kadenz, spürbar lohnender Mastery (Doppel+Preserve ⇒ ~2,8× Roh-Effizienz), erreichbarem
Pet und einer tiefen, stil-paritätischen Heil-/Buff-Food-Leiter. Kein Bug, keine Wall. Abzüge nur für die fehlende
Verbrenn-/Werkzeug-Textur (zwei klassische Progressions-Achsen liegen brach) und eine value-negative Rezeptzeile.

**Top-3-Findings:** F1 cake_honey value-negativ (P3/balance) · F2 kein Burn-System, Pet-perfectCook=Preserve-
Misnomer (P3/feel) · F3 keine Koch-Werkzeug-Stufe (P3/feel).

**Top-3-Verbesserungen:** (1) cake_honey.value 18→34 · (2) ashgut-`perfectCook` in echtes level-skalierendes
Burn-System aufwerten ODER Pet-Text auf Preserve umtexten · (3) optionale „Kochgeschirr"-Toolreihe (0.93→0.6)
für die fehlende Upgrade-Achse.
