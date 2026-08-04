# QA Run 7 — Gesamt-Progression L1→99 (Holistik-Linse: Neuspieler-bis-Endgame-Bogen)

**Playtester:** Progressions-/Holistik-Analyst (READ-ONLY — kein Spiel-Code/Content geändert)
**Datum:** 2026-06-28
**Linse:** Der **rote Faden** von Charaktererstellung bis 21×99. Phasen-Übergänge, tote Stunden, unklare nächste Ziele, Motivations-Brüche — bewertet wird der **Gesamt-Spielfluss**, nicht eine Einzeldomäne.
**Kontext Run 7 (R5-Stand):** Stil-Parität gestrafft (str-Doppeltraining entfernt), Meta-Capstone `total_level 2079` + `sets_completed`-Reihe, Slayer-∞-Punkte-Sink.
**Methode:** Direkt-Verifikation der drei R5-Prämissen-Fixes + gezielte Gegenprüfung der zwei Holistik-Resthebel im echten Code (`packages/engine`, `packages/content`, `packages/shared`). **Kein** frischer Voll-Sim gefahren (bewusst kurz gehalten — Daten-/Code-Einschätzung; Combat-Durchsatz/Wall-Aussagen stützen sich auf die committete `last_idol`-/`sim.ts`-Logik + die belastbaren Run-5-Sim-Zahlen, deren Kalibrierung seit run5 korrekt ist). Kein Temp-Harness gebaut → `packages/**` unverändert.

---

## Fun-Score: **8,7 / 10**

Run 7 hebt den Bogen von 8,5 auf **8,7** — drei saubere, verifizierte Verbesserungen, aber **keine** davon adressiert die zwei tiefsten strukturellen Löcher. Das Spiel bleibt damit, was Run 6 diagnostiziert hat: eine **dicht geführte erste Hälfte (≈9)** und eine **goal-dünne, abflachende zweite Hälfte (≈7)**, an deren Ende ein gerüsteter Held jeden Inhalt facerollt. Die R5-Fixes glätten die zweite Hälfte spürbar an den Rändern (mehr Zwischen- und Endziele, ein endloser Spend-Loop, fairere Stil-Parität), aber sie ersetzen **weder narrative Führung noch eine Krönung**. Der Knick in der Bogenmitte (~L50) bleibt erhalten.

**Verifiziert gelandet (Run-7-Prämissen — alle drei ✅):**
- **Stil-Parität gestrafft / str-Doppel weg:** `attack` trainiert jetzt **`dex`** (vorher str), `power` trainiert `str` (index.ts:16–17, Kommentar „Attribut Stärke bleibt davon getrennt"). Melee trainiert damit nicht länger str **zweifach** — die Roh-Schaden-Schieflage des Nahkämpfers ggü. den ressourcen-/dex-Stilen ist strukturell entschärft. ✅
- **Meta-Capstone 2079:** `ach_total_level_2079` „Vollender / True Completionist" (legendary, 21×99-Ceiling) existiert **zusätzlich** zu `ach_total_level_2000` „Beinahe Vollständig" (index.ts:9296–9297). Das letzte Skilling-Drittel hat jetzt einen echten **terminalen** Gipfel **und** einen Vorstufen-Marker — die run5/6-Lücke „kein Ziel ganz oben" ist auf der Achievement-Ebene geschlossen. ✅
- **`sets_completed`-Reihe:** `ach_sets_completed_1/5/10` (uncommon/rare/epic, index.ts:9786–9788) gibt dem Set-Sammeln eine **eigene Progressions-Leiter** über den ganzen Bogen — ein zweiter Pull neben total-level, der genau in der goal-dünnen zweiten Hälfte trägt. ✅
- **Slayer-∞-Sink:** `slayer_combat_draught` (50 Pkt) + `slayer_hunters_elixir` (200 Pkt) im `slayerShop` **ohne `maxPurchases`** → unbegrenzt kaufbare Verbrauchs-Buffs (index.ts:12307–12310). Der run5-„Shop endet, Punkte werden wertlos"-Defekt ist endgültig zu: Slayer-Punkte haben jetzt einen **dauerhaften** Abnehmer. ✅

**Nicht gelandet / weiterhin offen (die Score-Bremsen):**
- **Endgame-Quest-Bogen fehlt** — höchstes level-zielendes Quest-Objective bleibt `reach_total_level 150` (index.ts:10851); **0** Quest-Referenzen auf `last_idol` / Idol-Sanktum / Godiron-Forge. Die gesamte zweite Bogenhälfte ist quest-still.
- **Endgame-Gipfel/Wall fehlt** — Capstone `last_idol` **unverändert** ggü. run6: L120, maxHp **1400**, regen 14, enrage ×1,75 (index.ts:8810–8834). Kein max-HP-skalierter Schild, kein DPS-Soft-Enrage-Timer, kein Stil-Resist-Gate → geared faceroll in wenigen Sekunden.
- **Magie int-untertrainiert (Carry-over):** `runecrafting` trägt **weiterhin kein `trains`** (index.ts:31), während `power→str`, `ranged/attack→dex`, `magic_off→int` ihre Stile mit-pushen. Der run4/6-Hebel `runecrafting trains:"int"` ist erneut nicht gelandet.

---

## Die Zeitachse als roter Faden (Run-7-Verifikation)

| Phase | Level | Run6-Score | Holistik-Befund Run 7 |
|---|---|---|---|
| **Start / Früh** | L1–15 | 8,0 | Unverändert: 3 Stile ab Sek. 1, sofortige Quest-Kette. Reibung bleibt: Köcher-Hartstopp, leerer Erst-Farm-Besuch, unsichtbarer erster Suffix-Drop (P2). |
| **Früh-Mitte** | L15–30 | 8,5 | Weiter der beste Übergang — Skills + Dungeons + erste Sets. **R5-Bonus:** `sets_completed_1` belohnt jetzt das erste Vollset explizit. |
| **Mitte** | L25–60 | 6,5→ | Parität-Straffung (str-Doppel weg) macht den **Stil-Vergleich** fairer; die mid-game Magie-Roh-Schaden-Lage bleibt aber un-sim-bestätigt + `runecrafting`-Lücke offen (P1). |
| **Spät-Mitte** | L50–75 | 7,5 | **Leicht angehoben:** `sets_completed` + `total_level 2000/2079` + Slayer-∞-Sink geben hier mehr selbst-setzbare Ziele. **Aber:** Quest-Führung versiegt weiterhin exakt hier (P1). |
| **Endgame** | L75–99(+) | 7,5 | **Unverändert faceroll.** Capstone unangetastet, 0 Walls, kein narrativer Pull. Mehr *Achievements* zum Anpeilen, aber kein *Encounter*, der fordert, und keine *Quest*, die hinführt. |

**Holistik-Diagnose:** Run 7 hat die zweite Hälfte **mit Zielen aufgefüllt** (Achievements, Set-Leiter, endloser Punkte-Sink) — das ist echt und gut. Aber Ziele ≠ Führung und Ziele ≠ Herausforderung. Der Spieler hat jetzt mehr Häkchen zum Setzen, fällt aber zur Bogenmitte weiter aus dem **geführten** Korridor und trifft am Gipfel weiter **kein** Gate. Der Knick ist flacher, nicht weg.

---

## Findings

### [P0] — keine
Kein blockierender Progressions-Defekt. 0 Walls (geared), 0 Crashes, 0 inhaltliche Lücken. Die offenen Punkte sind **Führungs-/Herausforderungs-Kurven**, keine Defekte. Die drei R5-Fixes sind regressionsfrei im Code verifiziert.

### [P1 Holistik] Endgame-Quest-Bogen fehlt — die hintere Hälfte bleibt „nächstes-Ziel"-still **(BESTÄTIGTER 9,5-BLOCKER #1)**
**Befund (verifiziert):** Das höchste level-zielende Quest-Objective im gesamten Katalog ist weiterhin `reach_total_level 150` (index.ts:10851); alle `reach_*`-Etappen liegen in den frühen/mittleren Quest-Blöcken. **Kein** Quest-Objective referenziert das Endgame (`last_idol`, Idol-Sanktum, Godiron-Forge — 0 Treffer). Die R5-Fixes haben hier **nichts** geändert: `sets_completed` und `total_level 2079` sind **Achievements**, keine geführten Quest-Ketten — sie geben ein Häkchen, aber kein narratives „geh-dorthin-tu-dies-dann-jenes". Die gesamte zweite Bogenhälfte (L50→99, der AFK-lastigste Teil) bleibt damit ohne quest-getriebene Führung. **Das ist und bleibt der größte einzelne Holistik-Bruch.**
**Fix-Richtung (eigenes Feature, content):** Quest-Kette über die hintere Hälfte ziehen — `reach_*`-Etappen bei total 300/600/1000/1500 + skill-L70/L90-Meilensteine — **plus** ein narrativer Endgame-Bogen (L70/85/99 → Forge/Sanktum/Capstone), gekoppelt an P2-#2.

### [P1 Balance/Identität] Stil-Parität gestrafft — aber Magie bleibt int-untertrainiert
**Befund:** Die str-Doppel-Straffung (`attack→dex`) ist gelandet und **verbessert** die Melee-vs-Rest-Balance verifiziert. **Aber** der zweite Magie-Hebel fehlt weiter: `runecrafting` trägt kein `trains` (index.ts:31), während alle drei Kampfstil-Pfade ihr Kernattribut über ein Crafting-/Kampf-Skill mit-trainieren. Der Magier bleibt strukturell int-untertrainiert. Zusätzlich steht — wie in run6 — die **In-Band-Bestätigung** der mid/endgame-Magie-Schadenslage nach den manaCost-Fixes weiter aus (kein frischer Sim).
**Fix-Richtung:** `runecrafting trains:"int"` setzen (logic/content) + Gegenprobe-Sweep L30/55/75/99, sobald die Sim trägt — Ziel: Magie durchgängig ≥0,90× mit **flachem** Level-Trend.

### [P2 Holistik] Kein Endgame-Gipfel: gerüsteter Held facerollt alles **(BESTÄTIGTER 9,5-BLOCKER #2)**
**Befund (verifiziert, in Run 7 unverändert):** `last_idol` (L120) hat unverändert maxHp **1400**, regen 14, enrage ×1,75 below 30 % (index.ts:8810–8834). Der `endgame-danger`-Test prüft nur, dass Enrage den **Pro-Treffer-Schaden** erhöht und der Lifesteal-Deckel greift — er prüft **nicht**, dass der Mob einem gerüsteten Helden standhält. Gegen 300–600 Spieler-DPS fällt 1400 HP in Sekunden; regen 14/s ist wirkungslos. Der Höhepunkt eines ~100-h-Aufstiegs ist weiter ein **führungsloses Faceroll-Plateau** — kein Gate, keine Story. R5 hat hier nichts angefasst.
**Fix-Richtung (eigenes Feature, combat/content):** ≥1 echter Wall-Encounter — max-HP-skalierter Schild **oder** DPS-Soft-Enrage-Timer **oder** Stil-Resist-Gate — gekoppelt an den Quest-Bogen aus P1-#1. (Combat-FX bleibt laut Memory späterer Meilenstein; hier nur als **Struktur-Gate**, nicht als VFX.)

### [P2 Onboarding/Start] Frühspiel-Sackgassen am Einstieg (unverändert)
**Befund (carry-over):** Starterkit ohne Saat/Gold → erster Farm-Besuch leer; Start-Köcher 60 Pfeile / Hartstopp; erster Suffix-Drop ohne Erst-Kontakt-Signal. Kleine, aber erste-Stunde-Reibungen mit überproportionalem Eindruck.
**Fix-Richtung (klein):** 3× `graywort_seed` (+ Mini-Gold) ins Starterkit; Köcher 250–500 oder passives Pfeil-Bergen; früher garantierter Suffix-Drop + Toast.

### [P2 Holistik] Suffix-Endgame ohne Bühne; Belohnungs-Glättung im letzten Drittel
**Befund:** `sets_completed` + `total_level 2079` schließen die Achievement-Lücke gut. Offen bleibt: höchster Suffix-`minIlvl=50` → L84- und L120-Drop ziehen aus demselben Pool, keine capstone-exklusive Identität; der 8 %-Drop-Suffix-Pfad hat im Endgame keine eigene Bühne. Zwischen total 1750→2000→2079 ist die Marker-Dichte am oberen Ende ok, der Sprung 1500→1750 aber groß.
**Fix-Richtung:** 3–4 capstone-Suffixe (`minIlvl 80/100`) + 1–2 low-chance Endgame-Equip-Drops in L96–120.

### [P3 Politur] Pet-Erstmeilenstein spät, 2H-Durchsatzfalle, ember_robe-Craft-XP (carry-over)
**Befund:** Erstes `pets_owned`-Achievement erst bei 10/21; 2H-Melee aIMs-Floor drückt 2H ~0,58× von 1H; `craft_ember_robe_*`-XP vermutlich Tippfehler (15/17/18 statt ~150/170/180).
**Fix-Richtung:** `ach_pets_5`; 2H-Schadens-Premium oder separater 1H/2H-aIMs-Floor; ember_robe-XP an Tier-Kurve.

---

## Bestätigung der Kernfrage des Chefs

**Ja — die zwei strukturellen Resthebel sind verifiziert die verbleibenden 9,5-Blocker des Gesamterlebnisses:**

1. **Endgame-Quest-Bogen (P1-#1)** — der **größte** Einzelhebel. Code-belegt: Quest-Führung endet bei `reach_total_level 150`, 0 Endgame-Quest-Referenzen. Die R5-Achievements (2079, sets) füllen *Ziele* nach, ersetzen aber keine *Führung*. Eigenes Feature (content + Quest-System).
2. **Echter Endgame-Gipfel/Wall (P2-#2)** — Code-belegt: `last_idol` unverändert faceroll, 0 Walls im L84–120-Band. Eigenes Feature (combat-Gate + content).

**Sind das die einzigen Brüche im roten Faden?** Nicht ganz — zwei **kleinere** Brüche bleiben, die aber nicht den 9,5-Block ausmachen, sondern die Politur danach:
- **Magie-Stil-Reise (P1-Balance):** `runecrafting trains:"int"` fehlt weiter → ein Drittel der Spieler trainiert sein Kernattribut nicht mit. Hält den Bogen für Magier unter Parität, ist aber ein **Einzeiler-Fix** + Gegenprobe, kein eigenes Feature.
- **Früh-Reibungen (P2-Onboarding):** überproportional auf den Ersteindruck, aber lokal und klein.

> **Fazit:** Die zwei vom Chef benannten Hebel sind bestätigt **die** strukturellen 9,5-Blocker. Beide sind eigene Features, beide unangetastet von R5. R5 war richtig investiert (Parität + Ziel-Dichte + Punkte-Sink), aber es war **Füllung der zweiten Hälfte, nicht ihr Rückgrat**.

---

## Was fehlt für 9,5? — die Hebel in Reihenfolge

1. **Endgame-Quest-Bogen bauen (P1-#1) — größter Einzelhebel.** `reach_*`-Etappen bis total ~1500 + skill-L70/L90 **und** ein narrativer L70/85/99-Bogen → Forge/Sanktum/Capstone. Hebt Spät-Mitte **und** Endgame gleichzeitig. (eigenes Feature)
2. **Echten Endgame-Gipfel bauen (P2-#2).** Mindestens der Capstone muss einen gerüsteten Helden fordern (max-HP-Schild / DPS-Timer / Stil-Resist), gekoppelt an Hebel 1. (eigenes Feature)
3. **Magie-Reise gleichwertig machen (P1-Balance).** `runecrafting trains:"int"` nachziehen + Gegenprobe-Sweep, dass Magie über alle Checkpoints ≥0,90× liegt. (kleiner Fix)
4. **P2/P3-Politur:** Starterkit-Sackgassen, Suffix-Endgame-Bühne, Pet-/2H-Feinheiten.

> Hebel 1+2 schließen den „abflachende zweite Hälfte"-Knick (8,7 → ~9,2); Hebel 3 + Politur tragen auf durchgängig ≥9,5.

---

## Kein-Befund / bewusst nicht bewertet
- **Combat-FX/Juice, geführter Tutorial-Flow, Sidebar-Design-Rollout** — laut Memory bewusst spätere Meilensteine (die Endgame-Wall oben ist als **Struktur-Gate**, nicht als VFX gemeint).
- **Economy-City-Deckel (~8)** — bekannt/ehrlich deferred, kein neuer Holistik-Befund.
- **Methoden-Limit (Konfidenz):** Combat-Durchsatz-/Wall- und Magie-In-Band-Aussagen stützen sich auf committete Logik + run5-Sim-Zahlen, **nicht** auf einen frischen Voll-Sim (bewusst kurz gehalten). Die *Richtung* (Capstone unverändert faceroll, Parität verbessert) ist über die direkt verifizierten Werte aber belegt.
