# Combat-Balance-Sweep 3 — MAGIC · Band L90 (Endgame) · BiS Stoff+Stab

Stand 2026-07-04 · Combat-Balance-Tester (Sweep 3) · **HEADLESS** (createGame/computeStats/startCombat/advance, Zeiten = SPIELZEIT, TICK_MS=100) · **KEIN Spielcode geändert** · Wegwerf-Harness `_tmp_s3_g90_magic.test.ts` gelaufen & **gelöscht**.

**Loadout:** `godspark`-Set (mitre/vestment/skirt/handwraps/sandals, req **magic 85** — It2.1 #2 hat den runecrafting-Co-Req entfernt, reiner Kampf-Magier trägt es jetzt) + `godspark_vestment_set`-Bonus {int5,wis3,lck2, skillBoost magic+4} + `aetherium_staff` (2H, req magic 90, wardBreak 0.30). Skills magic/warding/vitality = 90. Food = `cooked_soulfish` (heal 27), Auto-Eat Tier 3 (Schwelle 80 %). Gegner: die 4 Götzenhallen-Endbosse. Vergleichsbasis: `design/armor-sweep2-2026-07-03/C2-mage-L90.md` (It2).

**Neuer Stand seit It2 (verifiziert im Code):** `WARD_PER_MANA` 0.5→**0.20** (`shared:578`), `WARD_KILL_REFILL_PCT` 0.20→**0.10** (`shared:571`), Magie-Defensiv-Stance `dmgMult` 1→**0.85** (`shared:117`). Guard-Tests grün: `ward` (13) · `armor-iteration2-combat` (8) · `autoeat-dot` (2) · `mitigation` (2) · `mana-shield` (3) = **28/28**.

---

## VERDIKT: **SHIP (schwer aber fair)** — 1 P2-Finding (`wardBreak` ist Totes Gewicht), 2 Kalibrier-Nits.

It2.1 wirkt genau wie vorgesehen: der Endgame-Magier ist jetzt **auf 3 der 4 Bosse food-pflichtig** (It2: nur `last_idol`). Mit voller Prep (BiS+Food+Auto-Eat T3) sind **alle 4 Bosse 0-Tod** (auch `last_idol` über 3600 s). Kein unfairer One-Shot: ein Einzel-Kampf mit vollem Ward berührt die HP **nie** (minHP 100 % auf allen 4, inkl. Enrage). Unprepared **ohne Food** = harte Strafe (5–21 Tode). **Aber:** `wardBreak` (0.30 auf jedem Stab, Cap 0.75) ist **messbar wirkungslos** gegen jeden Ward-Gegner im Spiel — kein Bug im Code, aber ein totes Balance-Feature (P2). Stil-Parität (Cloth-EHP) unverändert zu It2.

---

## computeStats — BiS-Magier (echte Werte)

| Stat | Wert | Kommentar |
|---|---:|---|
| maxHp (CL≈68) | **105,7** | 5 + con37·2 + (vitality90−1)·0,3 |
| maxWard | **476,2** | nur Gear (WARD_CORE_PER_INT=0); godspark Σ 95,23+142,85+104,76+66,66+66,66 |
| oneShotCap (0,5·maxHp) | **52,85** | kein Einzeltreffer entfernt mehr |
| Cast-Recharge | **~0,61/s** | manaCost 8 · WARD_PER_MANA 0,20 / Cast-Takt 2,61 s (It2: ~1,46/s) |
| wardRegenPerSec | **1,80** offensiv | warding90·0,02 (Cap 2,0; defensiv ×1,5→2,0) |
| **Ward-Regen gesamt** | **~2,41/s** | Recharge 0,61 + Warding 1,80 — **≪ Boss-DPS-in ~7,5/s** → Pool = EHP, kein Unsterblichkeits-Sustain |
| minHit/maxHit | 37,76 / 41,36 | attackIntervalMs 2610 |
| defense / evasion | 0 / 1,9 | Stoff trägt keine Mitigation/Dodge/Block-Schicht (korrekt) |
| wardBreak | 0,30 | s. P4 — wirkungslos |
| maxMana / manaRegen | 732 / 14,7 | Mana nie knapp (min 724 über alle Sims) |

**It2→It2.1:** Cast-Recharge von ~1,46/s auf ~0,61/s gedrittelt (WARD_PER_MANA-Cut), Kill-Refill von 20 %→10 % (95→47,6 Ward/Kill). Beide Hebel zusammen erodieren den Pool im Endgame **deutlich schneller** — Food kehrt zurück (s. P2/Q1). *(Nit: aetherium_staff recharget 0,61/s, minimal über der It2.1-§1.2-Projektion 0,59 — F1c-Cap 0,6/s ist nicht appliziert, bindet aber ohnehin nicht; irrelevant.)*

---

## P1 — 4 Endbosse killbar mit voller Prep, 0 Tode?  → **JA**

900 s Dauerfarm je Boss, MIT Food (soulfish, Auto-Eat T3):

| Boss | Lv | kills/900 s | **Tode** | TTK₁ | minHP % | Food gegessen |
|---|---:|---:|---:|---:|---:|---:|
| idol_warden | 245 | 47 | **0** | 13,1 s | 100 | **0** |
| aether_wraith | 260 | 35 | **0** | 18,3 s | 80,1 | 56 |
| scale_skarn | 275 | 35 | **0** | 20,9 s | 78,2 | 30 |
| last_idol | 295 | 25 | **0** | 31,4 s | 49,9 | 88 |

`last_idol` **3600 s** (Über-Level-Dauerfarm): **0 Tode**, 103 kills, minHP 40,4 %, 408 Food. → Alle 4 Bosse mit voller Prep dauerhaft killbar, 0 Tode. **P1 ✅** (deckt sich mit It2.1-Gate #6).

---

## P2 — Braucht der Magier @Endgame Food?  → **JA, auf 3 der 4 Bosse (härter als It2)**

Gleiche 900 s, **MIT vs OHNE** Food:

| Boss | Tode Food/NoFood | minHP % Food/NoFood | Food | Verdikt |
|---|---:|---:|---:|---|
| idol_warden L245 | 0 / **0** | 100 / 100 | 0 | Ward-Puffer hält (minWard 335) — **food-frei** |
| aether_wraith L260 | 0 / **4** | 80,1 / **5,4** | 56 | **Food nötig** |
| scale_skarn L275 | 0 / **2** | 78,2 / **13,9** | 30 | **Food nötig** |
| last_idol L295 | 0 / **5** | 49,9 / **4,4** | 88 | **Food nötig (hart)** — 3600 s: **21 Tode** ohne Food |

**Mechanik:** je Kill refillt der Pool nur `WARD_KILL_REFILL_PCT` 10 % (47,6 Ward); ein Kampf verbraucht mehr, als Refill + Recharge (0,61/s) + Warding (1,80/s) zurückgeben → der Pool **erodiert auf 0** (farm-minWard=0 auf 3 Bossen) → Chip auf HP → Food. Nur der **schwächste** Boss (`idol_warden`, damage 27, attackIntervalMs 3400) liegt unter der Erosionsschwelle → Puffer hält, food-frei (spec-konform §6.1 „Farm-Puffer am weichsten Mob").

**It2→It2.1:** In It2 war NUR `last_idol` food-pflichtig; jetzt **3 von 4**. Das ist die beabsichtigte It2.1-Wirkung („Magier food-hungriger, Endgame-Food kehrt zurück"). Food-Menge tracked sauber die DPS-in (aether_wraith 56 > scale_skarn 30, weil 3,0 s vs 3,6 s Angriffstakt — mehr Treffer). **P2 ✅** — Food ist ein echter, gradierter Endgame-Bedarf.

---

## P3 — FAIR? (kein unfairer One-Shot; unprepared = harte Strafe)  → **JA**

**Kein unfairer One-Shot (One-Shot-Cap→Ward):** Ein Einzel-Kampf mit vollem Startward berührt die HP **nie** — **minHP 100 % auf allen 4 Bossen**, inkl. `last_idol`-Enrage (×1,75). minWard nach dem Kill: idol_warden 425 · aether_wraith 336 · scale_skarn 374 · **last_idol 270**. Der Enrage-Roh-Spike wird vom One-Shot-Cap (52,85) gedeckelt und landet vollständig im Ward-Pool (≥270) → HP unberührt. Absorb-Order `Mitigation→Cap→Ward→HP` (combat.ts:1739–1755) greift exakt. Die Gefahr ist **rein die Erosion über eine Session**, nie ein Einzelschlag — genau „schwer aber fair".

**Prepared vs Unprepared (last_idol, 900 s):**

| Szenario | kills | **Tode** | minHP % | Food | Lesart |
|---|---:|---:|---:|---:|---|
| **PREPARED** (BiS+Food+T3) | 25 | **0** | 49,9 | 88 | Ziel-Zustand |
| UNPREP-A — BiS, **kein Food** | 21 | **5** | 4,4 | 0 | **Food = harte Wand** (ohne Food: Tod) |
| UNPREP-B — nur Stab, **kein Cloth** (+Food) | 17 | 0 | 39,7 | **204** | überlebt, aber 2,3× Food & −32 % kills |
| UNPREP-C — runewoven-Cloth statt godspark (+Food, BiS-Stab) | 24 | 0 | 42,8 | 120 | Unter-Tier = +36 % Food |
| UNPREP-C auf idol_warden (leichtester) | 44 | 0 | 79,9 | 14 | Unter-Tier klärt leichten Content locker |

**Befund:** Die **harte** Prep-Wand ist **Food** (UNPREP-A: 5 Tode/900 s, 21/3600 s). Die **Ward-Rüstung** ist eine **Effizienz-/Komfort-**Achse (mehr Ward = weniger Food, mehr kills), keine binäre Überlebensbedingung — ein reiner Stab-Träger (maxWard 0) überlebt `last_idol` mit 0 Toden, verbrennt aber 204 statt 88 Food und killt 32 % langsamer. Das ist ein **kohärentes, faires** Prep-Modell: Grundvorbereitung (Food) ist Pflicht, tiefere Vorbereitung (BiS-Ward) wird mit Durchsatz belohnt. **P3 ✅.**

*Kalibrier-Nit (Owner: balance-designer / Chef):* Dass maxWard 0 (gar keine Ward-Rüstung) am härtesten Boss noch 0-Tod schafft, liegt am **One-Shot-Cap + Auto-Eat-Boden** (jeder Treffer ≤ 0,5·maxHp, Auto-Eat 27/3 s). Wer „nackt = Tod" will, müsste den Cap lockern oder Auto-Eat-Takt/-Heal senken — bewusste Chef-Entscheidung, kein Bug (It2.1-Gate #6 hat „mit Food + Cap = 0 Tode" ausdrücklich abgesegnet).

---

## P4 — wardBreak spürbar? · Stil-Parität R90? · Vorbereitung lohnt?

### wardBreak gegen Ward-Gegner  → **NEIN, messbar wirkungslos (P2-Finding)**

`aetherium_staff.wardBreak` = 0,30 (30 % jedes Treffers umgeht den Gegner-Ward direkt auf HP). Isoliert gemessen (Content geklont, wardBreak variiert, sonst identisch):

| Gegner (enemyWard) | TTK₁ wb **0,30** | wb **0,00** | wb **0,75** (Cap) |
|---|---:|---:|---:|
| aether_wraith (38) | 18,3 s | **18,3 s** | 18,3 s |
| gravecliff_specter (92) | 65,3 s | **58,2 s** | 57,0 s |

- **aether_wraith (der einzige Ward-Endboss, Pool 38):** wardBreak ändert die TTK **um 0,0 s** — der Pool ist kleiner als **ein** Spielertreffer (~40) und in <1 Treffer verbraucht, egal ob wardBreak an ist.
- **gravecliff_specter (größter Monster-Ward im Spiel, 92):** wardBreak macht die TTK **schlechter** (65,3 s vs 58,2 s) und ist **nicht monoton** — weil das Vorziehen von Schaden auf HP den Gegner früher unter seinen `regen`-Cap (0,6/s… hier 0,3/s) drückt → er heilt **mehr**. Die „Konter"-Statistik **schadet** gegen Ward+Regen-Gegner.

**Root-Cause (kein Code-Bug):** Der Absorb-Code (combat.ts:1283–1291) ist korrekt — der Unit-Test `enemy-ward-counter.test.ts` beweist mit einem **50-Mio-Ward-Pool**, dass der Durchblut-Anteil ≈ wardBreak ist. Aber: (a) der **maximale Monster-Ward im ganzen Content ist 92** (`gravecliff_specter`; die 4 Endbosse: nur `aether_wraith` 38, Rest 0) — alle ≤ 2,3× ein Spielertreffer; (b) Gegner-Ward **regeneriert nicht** (frischer Pool je Encounter); (c) die zu entfernende Gesamtmenge `Ward+HP` ist **invariant** gegenüber wardBreak — wardBreak verschiebt nur die Reihenfolge (und der `enemy-ward-counter`-TTK-Test greift nur wegen Pro-Treffer-Rundung bei einem Pool von 200 / maxHp 4000 ohne Regen). → In **echtem Content** ist wardBreak **totes Gewicht** und stellenweise kontraproduktiv.

**→ P2 (Owner: balance-designer + combat-dev).** Entweder (A) einem/mehreren Endgame-Bossen einen **großen** Ward-Pool geben (z. B. `aether_wraith` von 38 auf ~350–450 heben → dann ist wardBreak der spürbare Konter, für den er gebaut wurde, und ein Nicht-wardBreak-Stil beißt sich am Schild fest), oder (B) wardBreak als Waffen-Signatur **entfernen**. So wie es ist, wird dem Spieler auf jedem Stab/Bogen ein Konter-Stat angezeigt, der nichts tut. **Dies ist das „definiert/angezeigt, aber nie wirksam angewandt"-Muster** (analog Status-Effekte / monster.xp / auto-eat-on-DoT).

### Stil-Parität R90 (EHP, echte computeStats)

| Stil (BiS R90) | maxHp | maxWard | mit % | dodge % | block % | **EHP** |
|---|---:|---:|---:|---:|---:|---:|
| **Stoff (godspark, magic 90)** | 105,7 | 476,2 | – | – | – | **582** |
| Leder (wraithhide, ranged 90) | 169,7 | – | – | 72,0 | – | 690 |
| Platte 1H+Schild (godiron, def 99) | 227,7 | – | 54,0 | – | 49,7 | 857 |
| Platte 2H (godiron, def 99) | 203,7 | – | 50,0 | – | – | *407\** |

- **Stoff-EHP 582** ist **bit-identisch** zu C2-mage-L90 (It2, realer CL68: 582) — It2.1 hat **keine** Ward-Kapazitäts-/Rüstungs-EHP-Konstante geändert (nur Recharge/Refill/Stance-dmg), daher ist die R90-Defensiv-Parität **strukturell unverändert** zur It2-SHIP-Bewertung (Stoff am unteren Rand, −7,7 % CL90 / −10,3 % CL68). Cloth bleibt der Glass-Cannon mit dem Ward als „großer, aber verbrauchbarer" EHP-Schicht.
- *\*Platte-2H (407) ist im Harness untertrieben:* meine Messung enthält **nicht** den 2H-Melee-armorRating-Bonus / die Defensiv-Stance-Methodik, die C2 nutzte (dort mit 630 / mit 72 %). Melee-/Ranged-Parität R90 ist Sache der parallelen Sweep-3-Tester (`_tmp_s3_m1h_*`, `_tmp_s3_r45_*`); ich messe hier rigoros nur den Stoff-Wert und bestätige die Invarianz seit It2. **Kein Paritäts-Regress durch It2.1.**

### Vorbereitung lohnt? → **JA** (s. P3-Tabelle): BiS+Food = 25 kills / 0 Tode / 88 Food; runewoven statt godspark = +36 % Food; kein Cloth = +132 % Food & −32 % kills; **kein Food = 5 Tode**. Tiefe Prep ⇒ mehr Durchsatz & weniger Ressourcen; fehlende Grundprep (Food) ⇒ Tod.

---

## Findings (Severity · Owner · file:line)

- **P2 — `wardBreak` ist im echten Content totes/kontraproduktives Feature.** (Owner: **balance-designer + combat-dev**.) Mechanik korrekt (`combat.ts:1283–1291`, `enemy-ward-counter.test.ts` grün), aber der größte Monster-Ward-Pool ist **92** (`content:11308` gravecliff_specter; von den 4 Endbossen hat nur `aether_wraith` einen Pool, 38 — `content:11225`). Gemessen: TTK-Delta **0,0 s** (aether_wraith) bzw. **negativ/nicht-monoton** (gravecliff, wegen Regen). Fix: entweder einem Endgame-Boss einen großen Ward-Pool (~350+) geben, oder wardBreak als Waffen-Stat streichen. **Blockt den Magier-L90-Ship NICHT** (latenter No-op), ist aber die Kopf-Erkenntnis dieses Sweeps und beantwortet Chefs P4 direkt: **nicht spürbar**.

- **P3-Nit — Food-Härtegrad Endgame** (Owner: balance-designer / Chef). It2.1 zieht Food auf 3 von 4 Bossen (gewollt). Falls „auch am weichsten Boss Food" gewünscht: `WARD_KILL_REFILL_PCT 0.10 → 0.05` zöge auch `idol_warden` in die Erosion. Aktuell spec-konform (§6.1). Kein Blocker.

- **P3-Nit — maxWard 0 überlebt Endgame mit Food** (Owner: Chef-Philosophie). One-Shot-Cap (0,5·maxHp) + Auto-Eat-Boden machen selbst „keine Ward-Rüstung" 0-Tod (nur teuer). Falls „nackt = Tod" gewünscht, Cap/Auto-Eat-Takt antasten. It2.1-Gate #6 hat das aktuelle Verhalten abgesegnet.

- **Keine Bugs / kein Exploit.** WARD_PER_MANA 0.20 & Kill-Refill 0.10 greifen (combat.ts:794/828/1138), Warding-Regen additiv+gedeckelt+kampf-scoped (combat.ts:1505–1509), One-Shot-Cap→Ward→HP-Order exakt, kein unendlicher Sustain (Ward-Regen ges. 2,41/s ≪ 7,5/s DPS-in), Ward nie > maxWard. Guard-Tests 28/28 grün.

**Empfehlung: SHIP** für Magier-L90-Endgame — „schwer aber fair" erreicht (Food auf 3/4 Bossen nötig, alle 4 mit Prep 0-Tod, keine unfairen One-Shots, Prep lohnt spürbar). **Ein** echter Fix vor 1.0 empfohlen: `wardBreak` spürbar machen ODER entfernen (P2, balance-designer/combat-dev) — kein Ship-Blocker, aber ein sichtbar totes Feature auf jeder Caster-/Ranged-Waffe.
