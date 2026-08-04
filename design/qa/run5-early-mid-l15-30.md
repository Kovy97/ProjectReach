# QA-Run 5 — Übergang Früh→Mid (Level 15–30)

**Tester:** Playtester-Analyst (READ-ONLY, kein Spiel-Code/Content geändert) · **Datum:** 2026-06-28
**Persona:** Spieler im Übergang L15–30. Fokus: Skill-Freischaltungen, Gear-Tiers (Iron/Steel/Blacksteel), **3-Stil-Balance NACH Parität-R3** (Kurz-Check melee/ranged/magie @L16/24/30), Seed-Versorgung, **Suffix-Items im Loot**, Pacing/Walls.
**Run-5-Kontext:** Parität-R3 (Magie-Gear normalisiert), Suffix aktiv (Craft + Drop), neue Crop-Ökonomie + Reed-Gates + Achievements, Packaging v0.1.0, Geared-Sim-Bug gefixt.

**Methode — echte Daten:** Temporäres Sim-Harness direkt auf der Engine (`createGame`→`advance`, deterministischer Seed 5), je Checkpoint **drei tier-gleiche Builds** (melee Dolch / ranged Kurzbogen+Munition / magic Stab) gegen den **on-level Crypt-Mob** (skeleton_warrior L16 / skeleton_butcher L24 / skeleton_icemage L30) über je **1 h** Spielzeit. **Stil-realistische Skill-Investition inkl. der Gear-Craft-Gates, die der jeweilige Stil zwingend mitlevelt** (melee: attack+power+defence+vitality+smithing → dex/str/con · ranged: ranged+defence+vitality+fletching+leatherworking → dex/con · magic: magic_off+magic_def+defence+vitality+runecrafting → int/wis/con). Auto-gewählte stil-passende Rüstung pro Slot, **voller Köcher**, **band-gerechtes Food** (cooked_anglerfish, heilt 120) + Auto-Eat T2, voller HP-Eintritt. Gemessen: **kills/h** + Begleit-Stats aus `computeStats`. Zusätzlich: Suffix-Craft-Rate (2000 Rolls), In-Band-Equipment-Dropper, Gear-/Crop-/Seed-Kadenz direkt aus `packages/content/src/index.ts`. **Harness nach dem Lauf entfernt** (kein Rückstand in `packages/engine/src/`). Abgeglichen mit `run4-early-mid-l15-30.md`.

> **Methodik-Hinweis (wichtig für den Vergleich):** Run4 setzte beim Ranged-Build nur 1.000 Pfeile und keinen Gear-Craft-Skill an; in diesem Lauf wurden ein **voller Köcher** (sonst false „Out-of-Ammo"-Stopps, die als Tode zählen) und die **Pflicht-Craft-Skills** (Bogen↔fletching, Stab↔runecrafting) realistisch mitgelevelt. Die **absoluten** kills/h sind dadurch nicht 1:1 mit Run4 vergleichbar — die **Stil-Verhältnisse** (das eigentliche Parität-Maß) aber sehr wohl.

---

## Fun-Score: **8,5 / 10**

Der zentrale Run4-Dämpfer ist **weitgehend behoben**: Die 3-Stil-Parität ist im Band nach R3 **deutlich enger**. Wo Run4 einen klaffenden Spalt von **1.59–1.74×** (Fernkampf-Dominanz, Nahkampf als Durchsatz-Boden) maß, liegen die drei Stile jetzt über das ganze Band **innerhalb von ±15 %** zueinander — bei L16 sogar innerhalb **±5 %**. **Nahkampf ist nicht mehr der Boden** (der Dolch mit −500 ms Tempo ist jetzt der schnellste Takt der drei), **Fernkampf dominiert nicht mehr**, und **Magie überschießt nicht mehr** (`int·2 → int·1.7` ist gelandet). Dazu kommen drei neue, motivierende Schichten: das **Suffix-System** (WoW-Random-Rolls, ~20 % auf Crafts, verifiziert), die **getierte Crop-Ökonomie** mit Reed-Gates und ein **großes Achievement-System** (erste Meilensteine fallen in-band). 0 Tode, 0 Walls, 0 XP-Trichter. Kein Punkt mehr verschenkt wegen kaputter Parität.

Die **1,0 fehlenden Punkte** sind feiner: Magie ist jetzt **evasionssensitiv** — top gegen niedrig-evasive Mobs (L24 Butcher), aber **Boden** gegen den hoch-evasiven, frost-resistenten Icemage (L30), weil Magies Accuracy/Cadence/Krit strukturell am Boden liegen. Fernkampf hat weiterhin **keine Glass-Cannon-Kehrseite** (mehr Evasion als der „Tank"). Und der **Suffix-Reiz erreicht den reinen Crypt-Grinder kaum** (Skelette droppen nur Material). Das sind Glättungen, keine Brüche — daher +1,5 ggü. Run4 (7).

---

## Reale Durchsatz-Messung (kills/h, 1 h Sim, on-level Crypt-Mob, **0 Tode überall**)

| Stil (Waffe) | L16 vs skeleton_warrior | L24 vs skeleton_butcher | L30 vs skeleton_icemage |
|---|---:|---:|---:|
| **Melee (Dolch)** | 515 (1.00×) | 469 (1.00×) | 445 (1.00×) |
| **Ranged (Kurzbogen)** | 489 (0.95×) | 434 (0.93×) | **480 (1.08×)** |
| **Magic (Stab)** | **537 (1.04×)** | **530 (1.13×)** | 374 (0.84×)\* |

\* Magie L30 mit dem **optimalen** Burn-Stab (blacksteel_staff, acc 39): **374**. Mit dem nominell schadenshöheren bramble_witchstaff (frost, acc 22) nur **350** — schlechter, weil der Icemage **Frost resistiert** und Magies niedrige Accuracy am evasiven Ziel überproportional verliert. Die Tabelle nutzt die schlauere Wahl.

**Spread je Checkpoint** (Verhältnis bester/schlechtester Stil): L16 **1.10×**, L24 **1.22×**, L30 **1.28×**. Mittelwert-relativ liegen alle Stile an jedem Checkpoint **innerhalb ±15 %**, bei L16 innerhalb ±5 %.

**Begleit-Stats @L24** (aus `computeStats`):
- **Melee** steel_dagger: dmg 82, **aIMs 2535 (schnellster Takt)**, crit 0.11, acc 193, eva 38, def 121, hp 521
- **Ranged** steel_shortbow: dmg 58, aIMs 2642, crit 0.18, acc 198, **eva 61**, def 107, hp 461
- **Magic** steel_staff: **dmg 96 (höchster)**, **aIMs 2880 (langsamster)**, **crit 0.03 (niedrigster)**, **acc 170 (niedrigste)**, eva 89, def 69, hp 401

Lesart: Magies nominell höchster Schaden (int·1.7-Koeffizient + Stab) wird durch **langsamsten Takt, niedrigste Accuracy und fast keine Krit** ausgeglichen — gegen niedrig-evasive Ziele (Butcher eva 6) reicht das zur Spitze, gegen evasive (Icemage eva 16) kippt es zum Boden. Nahkampf ist über den `attack`-Skill (trainiert **dex**) + Dolch-Tempo (−500 ms) jetzt der **schnellste, krit-affine** Stil — daher solide Mitte. Fernkampf ist mit eva 61 weiterhin **wendiger als der Platten-Nahkämpfer (eva 38)**.

---

## Top-Stärken

1. **3-Stil-Parität ist die große Verbesserung.** Spread von Run4 **~1.7× → jetzt 1.10–1.28×**. Nahkampf ist nicht mehr der Boden, Fernkampf nicht mehr dominant, Magie überschießt nicht mehr. Verifiziert im Code: `magicDamage = int·1.7` (`character.ts:223`, war Run4 `int·2`). Genau die Persona-Frage *„halten alle 3 Stile mit?"* lautet im Band jetzt überwiegend **ja** (mit einer mid/high-Mob-spezifischen Magie-Delle, s. P2).
2. **Gear-Leiter Iron/Steel/Blacksteel mustergültig getaktet — für alle 3 Stile.** Dolch attack **10/20/30**, Kurzbogen ranged+fletching **10/20/30**, Stab magic_off+runecrafting **10/20/30**. Exakt alle 10 Level zwei klare Waffen-Upgrades je Stil im Band — verlässlicher Craft-Dopamin-Takt, jetzt symmetrisch über die Stile.
3. **Suffix-System ist live und liefert.** `content.suffixes` ist mit einem vollen, typ-/ilvl-gefilterten Pool befüllt (bear/bull/wolf/berserker/carnage · tiger/hawk/viper/lynx/phantom · …). Gemessene **Craft-Suffix-Rate 20,7 %** bei ilvl 24 (Design-Soll 20 % + lck-Mod) — WoW-artige Random-Rolls greifen beim Schmieden/Fletchen/Runecraften. `drop-suffix`/`suffix`/`style-xp-parity`-Tests **grün** (21/21).
4. **Neue Crop-Ökonomie + Reed-Gates sauber getiert.** `crops` mit `tier`/`levelRequired`/`growMs`/Ertrag: T1 (L1–20, 10 min, 6–9) → T2 (L21–40, 20 min, 7–11). In-band pflanzbar: pigment_umber L12, **bloodbeet L20**, bloodgrain L22, herb_bloodthistle L26. Reed-Linie reed_pale L6 → reed_iron → reed_void als eigene Gate-Leiter. Passives Plot-System (alte Farming-Aktionen entfernt).
5. **Seed-Versorgung lückenlos + Achievements als Ziele.** Shop-Fallbacks für alle Forage-only-Seeds (graywort 3 … godbloom 320, inkl. bloodbeet/nightshade/ironvine). Großes Achievement-System; der erste Meilenstein **ach_total_level_25** fällt direkt ins Band.
6. **Keine Walls, kein Leerlauf, keine XP-Trichter.** 0 Tode über alle Builds/Level, monotone Skalierung, lückenlose Crypt-Mob-Leiter L16/18/20/24/30 als roter Faden.

---

## Priorisierte Findings

### [P2 Balance] Magie ist evasionssensitiv — top gegen träge Mobs, Boden gegen evasive (L30 Icemage 0.84×)
**Befund (Sim):** Magie clearts L24 (Butcher, eva 6) mit **1.13×** an der Spitze, fällt aber L30 (Icemage, eva 16) auf **0.84×** zum Boden — auch mit der optimalen Waffe (blacksteel_staff 374; bramble 350). Treiber: Magie hat strukturell die **niedrigste Accuracy** (170 @L24 vs melee 193 / ranged 198), den **langsamsten Takt** (aIMs 2880–3155, kein Tempo-Bonus) und **quasi keine Krit** (0.03–0.06). Gegen ein evasives Ziel mit hoher eigener Accuracy (Icemage acc 86) verliert Magie überproportional Treffer. Zusätzlich resistiert der Icemage **Frost** — der bramble-Stab (frost-DoT) ist dort wertlos; nur Burn-Stäbe taugen.
**Persona-Wirkung:** Der Magier fühlt sich gegen „normale" Mobs stark, läuft aber gegen wendige/resistente Gegner spürbar leer — ohne dass das Spiel ihm einen Hinweis gibt (Stab-Element vs. Mob-Resist).
**Fix-Vorschlag (combat/character):** Magie-**Accuracy-Kurve** leicht anheben (z. B. `offenseSkill·2 → ·2.3` nur für magic, ODER Stäbe mit etwas mehr Basis-Accuracy), damit der L30-Evasions-Dip schließt. Optional Mob-Resist im UI sichtbar machen, damit der Element-Stab-Wechsel eine bewusste Entscheidung wird.
**Δ vs run4:** **Stark verbessert** — Run4 P2 „Magie überschießt mid (1.56×, `int·2`)" ist **gefixt** (`int·1.7`); das neue, kleinere Problem ist die Evasions-Delle an einem einzelnen Checkpoint.

### [P2 Balance] Fernkampf hat weiter keine Glass-Cannon-Kehrseite (eva 61/84 > Melee-„Tank" 38/41)
**Befund (Sim):** Trotz weiterhin entferntem `evasion += 5` ist die Bogen-Evasion im Band **höher als die des Platten-Nahkämpfers**: L24 **61 vs 38**, L30 **84 vs 41**. Quelle unverändert: `evasion = 10 + dex·1 + sDefence·0.4 + eq` (`character.ts:238`) — dex ist Super-Stat **und** Leder trägt Evasion. Anders als Run4 ist Fernkampf jetzt aber **nicht** mehr Top-Durchsatz (mid-pack), also ist die fehlende Kehrseite weniger gravierend — er ist „rundes Paket ohne Strafe", nicht mehr „bestes Paket ohne Strafe".
**Fix-Vorschlag:** Leder-/Bogen-Evasion dämpfen oder den `dex`-Evasions-Koeffizienten für Fernkampf leicht senken, damit die intendierte Stil-Identität (hoher Schaden, geringe Defensive) entsteht — sonst gleichen sich nur die Zahlen an, nicht die Spielgefühle.
**Δ vs run4:** **Entschärft** (Durchsatz nicht mehr dominant), **Identität unverändert offen**.

### [P3 Loot] Suffix-Reiz erreicht den reinen Crypt-Grinder kaum (Skelette droppen nur Material)
**Befund (Daten):** Suffixe würfeln auf **Equipment**-Outputs — beim Crafting (20 %) und beim **Equipment-Drop** (8 %). Die Crypt-Skelette droppen aber ausschließlich Material (crude_bone/ore/essence). In-band droppen nur **4 Mobs** überhaupt Equipment (ash_tyrant→iron_sword @5 %, thorn_wolf→thornfang_blade @2 %, moss_golem→moss_plate_body @2,5 %, spectral_stag→spectral_coif @2 %), und das × 8 % Suffix-Chance = **praktisch nie**. Ein Spieler, der das Band im Crypt grindet, sieht Suffixe daher fast nur, wenn er selbst craftet.
**Persona-Wirkung:** Der „oh, das Schwert hat *des Bären*!"-Moment — der eigentliche Sog des Suffix-Systems — bleibt dem Kampf-Pfad weitgehend vorenthalten.
**Fix-Vorschlag (content):** Ein paar mehr in-band Mobs mit (seltenem) Equipment-Loot ausstatten ODER die **Drop-Suffix-Chance auf bestehenden Equipment-Drops erhöhen** (auf den wenigen Quellen kostet das nichts an Inflation), damit Random-Rolls auch beim Farmen aufploppen.
**Δ vs run4:** **Neu** (Suffix-System ist neu; funktioniert, Sichtbarkeit im Kampf-Pfad dünn).

### [P3 Economy] Gold-Knappheit endet früh — kaum echte Kaufspannung ab ~L25 (bekannt/deferred)
**Befund:** Combat-Gold ist ungedämpft; on-level-Einkommen wächst klar über die Pflicht-Käufe hinaus (Auto-Eat, Pickaxes, Waffen). Selbst teure Posten sind in Minuten verdient; die neuen Seed-Fallbacks (18–320 g) sind kein nennenswerter Sink. Identisch zur Run3/Run4-Diagnose.
**Status:** Per Chef an die City-Welle gekoppelt (**deferred**). Hier nur band-spezifisch bestätigt.
**Δ vs run4:** Unverändert (deferred).

### [P3 Politur] Out-of-band Seeds ab L1 kaufbar, Pflanz-Level nicht angezeigt
**Befund:** nightshade_seed (Shop 28 g, Crop Farming **L35**) und ironvine_seed (55 g, **L50**) sind ab L1 kaufbar, lange bevor pflanzbar (bloodbeet L20 ist in-band ok). Funktional harmlos (Fallback erfüllt seinen Zweck), aber ein Spieler kann unnutzbare Saat horten.
**Fix-Vorschlag (ui/content):** Pflanz-Level im Shop-Tooltip anzeigen.
**Δ vs run4:** **Unverändert offen** (run4-P3).

---

## Persona-Antworten (kompakt)

- **Skill-Freischaltungen / -Vielfalt:** Breit, on-level getaktet, Craft-Ketten greifen (smithing/fletching/runecrafting/leatherworking als Stil-Gates). ✅
- **Gear-Tiers (Iron/Steel/Blacksteel):** Mustergültige 10-Level-Kadenz für **alle drei** Stile. ✅
- **3-Stil-Balance NACH R3 (@L16/24/30):** **Ja, hält** — alle Stile innerhalb ±15 % (L16 ±5 %). Melee nicht mehr Boden, Magie überschießt nicht mehr. Eine mild-evasions-abhängige Magie-Delle bei L30. ✅ / 🟡
- **Seed-Versorgung:** Lückenlos (Shop-Fallbacks für alle Forage-Seeds). ✅
- **Suffix-Items im Loot:** System live, Craft-Rate ~20,7 % verifiziert; im **reinen Kampf-Pfad** aber kaum sichtbar (P3). ✅ / 🟡
- **Pacing / Walls:** Keine. 0 Tode, 0 Walls, keine XP-Trichter, lückenlose Mob-Leiter. ✅
- **Neue Crop-Ökonomie / Reed-Gates / Achievements:** Vorhanden, getiert, in-band greifbar (bloodbeet L20, ach_total_level_25). ✅

---

## Δ vs run4 — Fix-Status (Übersicht)

| run4-Finding | Status in run5 |
|---|---|
| run4 P1: Melee Durchsatz-Boden (−37…−43 %) | 🟢 **gefixt** — Melee mid-pack; Spread aller Stile jetzt ±15 % (Dolch-Tempo macht Melee schnellsten Takt) |
| run4 P2: Magie überschießt mid (`int·2`, L24 1.56×) | 🟢 **gefixt** — `int·1.7`; L24 jetzt 1.13× (im Band) |
| run4 P2: Ranged ohne Glass-Cannon-Kehrseite (eva > Melee) | 🟡 **entschärft** (Durchsatz nicht mehr dominant), Identität unverändert offen |
| run4 P3: Magie-Robe-Frühkadenz (L1–22 dünn) | 🟢 weitgehend gegenstandslos — Magie im Band stark/ausgewogen; Robe-Tiers greifen |
| run4 P3: Gold läuft mid tot | ⏸️ **deferred** (City-Welle) — im Band bestätigt |
| run4 P3: Pflanz-Level out-of-band Seeds unsichtbar | 🟡 **offen** (kleine UI-Politur) |
| NEU: Suffix-System | 🟢 **live & korrekt** (~20,7 % Craft), 🟡 Loot-Sichtbarkeit im Kampf dünn |
| Geared-Sim-Bug | 🟢 Sim sauber — 0 false Walls/Tode nach korrektem Köcher-/Skill-Setup |

---

## Was fehlt für 9,5?

1. **Magie-Accuracy-Kurve glätten**, damit der L30-Evasions-Dip verschwindet und alle drei Stile **auch gegen wendige/resistente Mobs** im ±10 %-Band bleiben (nicht nur gegen träge). Der einzige verbleibende echte Parität-Riss.
2. **Stil-Identitäten schärfen statt nur Zahlen angleichen:** Fernkampf endlich eine **Glass-Cannon-Kehrseite** geben (Evasion < Platten-Melee). Aktuell sind die Stile gleich *schnell*, aber spielen sich nicht unterschiedlich *riskant*.
3. **Suffix-Reiz in den Kampf-Pfad bringen:** mehr in-band Equipment-Drops oder höhere Drop-Suffix-Chance, damit der Random-Roll-Sog auch den Crypt-Grinder erreicht — nicht nur den Crafter.
4. **Mitwachsender Gold-Sink** (deferred City-Welle), damit die Kauf-Spannung nicht ab ~L25 abstirbt.
5. **Politur:** Pflanz-Level der Seeds und **Mob-Resistenzen** (für die Element-Stab-Wahl) im UI sichtbar machen.

---

## Kein-Befund / bewusst nicht angefasst
- **Combat-FX/Juice, großer Onboarding-Flow** — laut MEMORY spätere Meilensteine, nicht bewertet.
- **UI-Anzeige (Köcher-Munition, Suffix-Namen im Tooltip)** — UI-Revier; reine Engine/Content-Linse hier.
- **Endgame-Skalierung, Slayer-Ökonomie, Packaging v0.1.0** — außerhalb der L15–30-Persona.
- **Sim-Harness** wurde nach dem Lauf wieder **entfernt** (kein Datei-Rückstand in `packages/engine/src/`).
