# Sweep 6 — WELLE 2: Frühspiel-Langlauf + erste Session (W2-F)

**Agent:** Kontrolleur (QA) · **Datum:** 2026-07-03 (Nacht-Loop, nach Fix-Batches A/B/C)
**Methode:** `RealisticPlayer` voll ehrlich (kein `give`/`setSkillLevel`), melee, frischer Spielstand mit Starter-Kit.
(1) `pursue([combatLevel(30), reachTotalLevel(150), gold(10000)])`, Budget **50 Sim-h**, Seeds **12 + 83**, instrumentiert mit Minuten-Samples + Neuheits-Timeline (Level-ups, Erst-Kills, Quests, Equips, Tode). (2) Erste-Session-Mikroskop: frische Läufe, `playFor` kumulativ mit Checkpoints 1/5/15/30/60 Min. (3) Kaltstart-Sonden: roher `SimPlayer` (Starter-Kit), 60 Min Dauerkampf ab Minute 0, 10 Seeds. (4) Guide-Koverage statisch gegen die 23 `ONBOARDING_STEPS`.
**ALLE Zeitangaben = SPIELZEIT.** Wegwerf-Harness (`_tmp_s6w2f_*.test.ts`) nach dem Lauf GELÖSCHT; kein Spiel-Code geändert.

---

## Verdikt in einem Satz

**Die erste Stunde ist das beste Stück des Spiels (Neuheit alle 1–2 Min, Quest→Kampf→Skill→Shop-Kette greift natürlich, 0 Frictions), die erste NACHT ist das gefährlichste:** unter Kein-Regen (v49) ist der gemessene Food-Verbrauch an On-Level-Zielen 2,5–4,3 Stück/Min — jede Idle-Strecke über ~60–120 Min am klebrigen Gegner endet im Tod (16 bzw. 21 Tode in ~50 h, ~95 % davon am Ende einer Idle-Strecke), und der Kaltstart tötet den unbeaufsichtigten Frischling weiterhin in 8–56 Min am Tutorial-Huhn (10/10 Seeds); dazu fand der Lauf einen Toolkit-P2 (2H-Blindstelle im `equipBar` → Seed 12 hing 50 h auf dem Kupferspeer) und eine echte Quest-Falle (die Schwertlinien-Kette zählt nur den BASIS-`goblin`, nicht die 8 Varianten).

---

## 1) Langlauf-Ergebnis je Seed (50-h-Budget)

### Seed 12 — 2/3 Ziele, 15 Frictions, 16 Tode

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 30 | ◐ 90 % | 27/30 | — (Budget-Ende) |
| Gesamtlevel 150 | ✅ | 152/150 | 9 h 55 min |
| 10 000 Gold | ✅ | 10 801/10 000 | 9 h 45 min |

Endstand: CL 27, TL 212, **183 390 Gold**, 4 614 Kills, 16 Tode, HP 44/45. Gear: **copper_spear** (Minute 8!) + leather_body + cowhide_cap + worn_workgloves — 50 h ohne Waffenwechsel (Drilldown §4).

### Seed 83 — 3/3 Ziele in 48 h 49, 9 Frictions, 21 Tode

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 30 | ✅ | 30/30 | 48 h 49 min |
| Gesamtlevel 150 | ✅ | 151/150 | 16 h 20 min |
| 10 000 Gold | ✅ | 11 773/10 000 | 7 h 59 min |

Endstand: CL 30, TL 178, **389 191 Gold**, 6 978 Kills, 21 Tode. Gear: steel_sword + wooden_shield + leather_helm + leather_body + garnet_ring. Waffenweg über die Quest-Kette: copper_mace @5 min → **iron_sword @8 h 38 (q_goblin_slayer)** → **steel_sword @19 h 39 (q_fighter_2)**.

**CL-30-Antwort: 1/2 Seeds schafft es, haarscharf am 50-h-Budget** — CL 15 kommt wie in T1 nach ~4–5 h, aber CL 24→30 kostet allein ~20–25 h (Kurve §2). Gesamtlevel 150 und 10k Gold sind dagegen bequeme ~8–16-h-Ziele.

---

## 2) Langzeit-Kurve: glatt bis ~CL 24, dann Knie + erste Öden ab ~21 h

CL je Spielstunde (Auszug): Seed 83: 5→20 in 9 h (~1,7 CL/h) · 20→24 in 8 h · 24→28 in 13 h · **28→30 in 19 h**. Seed 12 (Speer-Käfig, §4): 26→27 in 11 h, 27→28 nie. TL- und Gold-Kurven sind dagegen linear und glatt (Gold ~5–8k/h konstant).

**Erste Mauern/Öden (> 2 h ohne JEDE Neuheit** — kein Level-up, kein Erst-Kill, kein Quest-Claim, kein Equip):

| Seed | Öde-Fenster (Spielminute) | Dauer | Was lief |
| --- | --- | --- | --- |
| 12 | 1272–1446 · 1894–2197 · 2465–2651 · **2651–2999** | 2,9 h · **5,1 h** · 3,1 h · **5,8 h** | Goblin-Lager-Grind (rogue/shaman/spearman/bull_boss) |
| 83 | 1605–1739 · 2301–2528 · 2528–2707 · 2707–2882 | 2,2 h · **3,8 h** · 3,0 h · 2,9 h | Goblin-Lager-Grind (archer/spearman/tower_goblin/rogue) |

Die **ersten** Öden erscheinen erst bei ~21 h (Seed 12) bzw. ~27 h (Seed 83) — die ersten 20 Spielstunden sind dicht (Erst-Kill-Kadenz ~alle 1–2 h, Level-ups laufend). Danach: die Monster-Leiter ist lückenlos (butcher 26, felmagician 27, stormcaller 28, warlock 30), aber alles bleibt **dieselbe Zone, dieselbe Goblin-Familie, dieselben Drops** (Seed 83 endet mit 166 goblin_ears im Inventar); die erste frische Zone (Aschfelder, Lv 30–45) öffnet erst am Ende des Bandes. CL 24–30 ist damit eine gemessene Monotonie-Strecke von ~20 h mit 4 Öde-Fenstern über 2 h.

---

## 3) Session-Rhythmus + die Idle-Nacht-Tod-Lotterie

**Attention-Fairness (It2-Sched): funktioniert.** Seed 12: 27 Idle-Strecken (2 821 Min = 94 % der Spielzeit, max 174 Min), Seed 83: 28 Strecken (93 %). Frühe Nächte rotieren sauber zwischen den Zielen (Kampf-Nacht @10 min, `catch_shrimp`-Nacht @90 min, Thieving/WC/Mining-Fenster), TL 150 latcht nach 9 h 55 bzw. 16 h 20 NEBEN dem Kampfziel — keine 0-%-Starvation, keine Stall-Frictions, Strecken enden früh beim Ziel-Latch. Nach dem Latch von TL+Gold gehören alle Nächte korrekt dem letzten offenen CL-Ziel. **Keine Auffälligkeit — der Umbau hält.**

**ABER: die Nächte selbst sind eine Tod-Lotterie.** 15/16 (Seed 12) bzw. 20/21 (Seed 83) Toden stehen am ENDE einer Idle-Strecke:

- Gemessener Food-Verbrauch im Dauerkampf: **3,09 Food/Min** (Seed 12, über 458 Kampf-Minuten) bzw. **2,46 Food/Min** (Seed 83, 1 022 Min) — die Planungsrate des Vorrats ist 2/Min (`IDLE_FOOD_PER_MIN`), der Vorrats-Deckel 300 (`IDLE_FOOD_MAX`). Eine 3-h-Nacht bräuchte ~560–770 Food.
- Härtester Beleg (Seed 83, Minute 522): vor der Boar-Nacht werden **+171 Food gekauft (Ziel 186)** — bei Minute 562 ist der Vorrat **0** (~4,3/Min an einem Lv-10-Eber @CL 20), Minute 572 HP 6,9, Minute ~578 **Tod**. Ein korrekt geplanter Puffer stirbt nach ~60 Minuten Nacht.
- Deshalb sterben auch ÜBER-levelte Spieler an trivialen Zielen: Seed 12 stirbt 2× am boar (Lv 10) @CL 17 und 2× am bull_boss (Lv 15) @CL 27; Seed 83 @CL ~19 am Basis-goblin (Lv 15).
- Der Tod ist ein harter Stopp (kein Auto-Restart): der Rest der Nacht verfällt still. Bei 16–21 Toden pro 50 h heißt das für einen echten Spieler: **„über Nacht kämpfen lassen" endet regelmäßig mit „tot aufgewacht, halbe Nacht weg"** — pro Lauf gingen so grob geschätzt 10–20 h Idle-Restzeit verloren.

Einordnung: Für den AKTIVEN Spieler bleibt das Band gesund (goldpositiv, Progression läuft). Der strukturelle Konflikt ist **Kein-Regen (v49) × lange Idle-Strecken**: es gibt keine Vorbereitung, die eine 3-h-Kampf-Nacht sicher macht (Food-Bedarf > sinnvoller Puffer), und keinen weichen Fehlermodus (Auto-Eat-Fallback/Flucht/Warnung — T1 #3). Das ist die Erweiterung des T1-P2 vom Kaltstart auf das GANZE Frühband.

---

## 4) Der Kupferspeer-Käfig (Seed 12) — warum 50 h ohne Waffen-Upgrade

Dreifach-Verriegelung, deterministisch nachvollzogen:

1. **[TOOLKIT-P2] `equipBar` ist nur in EINE Richtung 2H-bewusst** (`sim-realistic.ts:1967–1978`): eine 2H-Kandidatin muss Mainhand+Offhand schlagen (korrekt, T4-#2), aber eine **1H-Kandidatin, die eine 2H ersetzt, bekommt den freiwerdenden Offhand nie gutgeschrieben**. Gemessen (Probe): `gearScore(copper_spear)=4,845` (DPS 0,46 + dex-Gewicht) vs `bronze_sword=4,80` + `wooden_shield=1,0` = **5,80 kombiniert** — der Sim behält den Speer, obwohl Schwert+Schild klar besser sind (und beide im Inventar lagen). Ein echter Spieler liest den Tooltip und wechselt.
2. **Folge-Verriegelung:** `shopHasMainhandUpgrade()` und `craftWeaponUpgradeTask()` fragen dieselbe Bar — der Shop-Bronze (4,80 < 4,845) gilt nicht als Upgrade, also feuert auch die Craft-Route nie. Zusätzlich **[TOOLKIT-P3]**: die Waffen-Craft-Route betrachtet nur FREIGESCHALTETE Rezepte (`actionUnlocked`, `sim-realistic.ts:1838`) — Seed 12 stand auf smithing 2, forge_bronze_sword (5)/forge_iron_sword (10) waren unsichtbar; anders als die obtainItem-Route (T4-#6) trainiert sie nicht Richtung Rezept-Gate.
3. **[SPIEL, content] Die Schwertlinien-Quest-Kette zählt nur den BASIS-`goblin`:** `q_first_blood`/`q_goblin_slayer` (`kill_monster target: "goblin"`) schalten bronze_sword → iron_sword → steel_sword+steel_medhelm frei. Seed 12 erlegte in 50 h **4 614 Monster, darunter Tausende Goblin-VARIANTEN** (tower_goblin, shaman, rogue, spearman, archer, crossbower, butcher) — aber nie einen einzigen einfachen `goblin` → Kette in 50 h nie gestartet, keine Waffen-Rewards. Seed 83 traf den Basis-Goblin zufällig @458 min und bekam prompt iron/steel. Spieler-Spiegel: „Erschlage 10 Goblins" steht auf 0/10, während man den ganzen Tag Goblins schlachtet — ein echter Ratlos-Moment, und an dieser Kette hängt die frühe Melee-Waffenleiter.

Wirkung auf den Lauf: Seed 12 kämpfte CL 17→27 mit DPS 0,46 (iron_sword hätte 0,93) — CL-Kurve abgeknickt, 8 der 15 Frictions und ein Teil der Tode sind Folgeschäden. **Der Speer-Käfig selbst ist Sim-Artefakt (Fix vor dem nächsten Melee-Sweep!), die Quest-Falle ist echt.**

---

## 5) Erste-Session-Mikroskop (frisch, 60 Sim-Min, Seeds 12 + 83)

| Zeit | Seed 12 | Seed 83 |
| --- | --- | --- |
| Min 0–5 | Waffen-Route: Kupfer minen → schmelzen → **copper_mace schmieden + anlegen**, Quest `q_gatherer` eingelöst | identisch (deterministischer Start-Plan) |
| Min 5–10 | erstes Huhn @7, `q_first_steps` @9, **wooden_shield gekauft+angelegt @9** | erstes Huhn @5, Quest @7, Schild @7, **leather_helm @9** |
| Min 10–15 | Food-Puffer +8, kurze Idle, Food gekauft (+11), Fischen | Foraging @11, **rot_rat @13**, Bank entlastet, Food gekauft |
| Min 15–30 | leather_helm @19, Hühner + Fischen im Wechsel, leather_body + **bronze_sword gekauft @30–32** | Food-Puffer, 11-Min-Idle, **rotfang_dagger-Drop erkannt + angelegt @30** |
| Min 30–60 | Kuh @34, Food-Puffer +10 (Ziel 48), 24-Min-Idle → **TOD an der Kuh @~60, Food 0** | plague_grub-Kette, leather_body @32, 20-Min-Idle, **CL 11, 0 Tode** |
| Stand @60 | CL 10, TL 60, 900 Gold, 181 Kills, **1 Tod**, Food-Slot LEER, Aktivität: nichts | CL 11, TL 63, 1 861 Gold, 347 Kills, 0 Tode, kämpft weiter |

**Bewertung:** Die Kette Quest→Kampf→Skill→Shop greift von selbst und fühlt sich richtig an — erste Quest-Belohnung @5, erster Kampf @5–7, erstes gekauftes Gear @7–9, erster Skill-Wechsel @8–11, erster seltener Drop erkannt @30. Neuheits-Dichte Stunde 1: **ein Ereignis alle ~1,3 Min** (47 bzw. 49 Novelty-Events). 0 Frictions in beiden Mikro-Läufen. **Der eine Makel wiegt schwer: Seed 12 stirbt in Minute ~60 an einer Lv-5-Kuh — MIT aktiver Food-Pflege (Puffer 48 @2×Planungsrate) — und sitzt dann mit leerem Food-Slot untätig da.** Die Tod-Lotterie (§3) beginnt also nicht im Midgame, sondern in der ersten Stunde: 2 von 4 ehrlichen Frisch-Läufen dieses Sweeps (Mikro-12, Langlauf-83 @26 min) sterben in den ersten ~70 Minuten.

**Wo ein ECHTER Neuling hängen würde (Ratlos-Momente, aus den Traces abgeleitet):**
1. **Food-Slot/Auto-Eat nie erklärt** — die einzige Mechanik, deren Unkenntnis in ≤15 Min tötet (§6). Der Sim „weiß" sie; ein Mensch sieht erst den Tod-Screen.
2. **Tod = kommentarloser Voll-Stopp** — nach dem Kuh-Tod steht der Charakter untätig herum; ohne Hinweis „warum bin ich raus? was jetzt?" (Sweep 5 #2/T1 #3 bestätigt).
3. **„Erschlage 10 Goblins" zählt Varianten nicht** (§4.3) — im Goblin-Lager der klassische „Zähler bewegt sich nicht"-Moment.
4. **Quest-Belohnungen müssen abgeholt werden** — der Sim claimt eager; der echte Neuling muss die Quests-Seite erst finden (kein Guide-Schritt, §7).

---

## 6) Kaltstart-Letalität NACH den Toolkit-Fixes — unverändert tödlich, 10/10

Sonden: frischer Starter-Kit-Charakter (20 shrimp, Auto-Eat vorbelegt @50 %, maxHp 11), `startCombat`, 60 Min unbeaufsichtigt:

| Gegner | Seeds | Food leer (Min) | **Tod (Min)** |
| --- | --- | --- | --- |
| chicken (Lv 1) | 3/5/7/12/21/31/44/62/83/99 | 6–19 | **8/12/12/8/33/15/11/13/8/26** — Median ~12,5; 10/10 tot |
| cow (Lv 5) | 12/62/83 | 4–5 | **5/5/6** |
| rot_rat (Lv 3) | 12/62/83 | 3 | **3/3/3** |

Deckungsgleich mit T1 §3 (erwartungsgemäß: die Batches fixten Sim-Toolkit, Engine-seitig ist der Chef-Entscheid offen). Neu ist die Breite (10 Seeds: Spanne 8–56, zwei Seeds sterben schon nach 8 Min) und der Befund aus §5, dass auch der AKTIV gemanagte Frischling in Stunde 1 sterben kann. Der T1-Triage-Punkt 1 („vor EA 0.1 entscheiden: Werte weichzeichnen oder Tod-UX sichtbar machen") gilt verschärft — die Empfehlung (d) UI-Warnung + (b) moderat mehr Starter-Food deckt den Kaltstart, aber NICHT die Nacht-Lotterie (§3); dafür braucht es zusätzlich eine der Optionen Auto-Eat-Fallback / Flucht-bei-0-Food / Food-Reichweiten-Anzeige beim Idle-Start.

---

## 7) Guide-Koverage: 23 Schritte decken die Landkarte — und 0/23 die Todesursachen

Statisch gegengelesen (`onboarding-steps.ts`, Texte in `translations.ts`, Mount in `App.tsx:346`): Intro + 8 Topbar-Seiten + 13 Sammel-/Handwerks-Skills + Abschluss = 23 Schritte, echte Klick-Pflicht (`requireAction`), sauber begrenzt; der Abschluss sagt ehrlich „Kampf, Monsterjagd, Laden und Bank bekommen später ihren eigenen Rundgang". Das alte Modal (`Onboarding.tsx`) ist unmountet — keine Doppel-Tutorials. Handwerklich in Ordnung.

**Abgleich mit der GEMESSENEN ersten Stunde (§5):** sie spielt sich auf Kampf (ab Min 5), Quests (Claim @5), Shop (Käufe @7–19), Bank (@9–15) und dem Food-Slot ab — **genau die 5 Flächen, zu denen der Guide keinen einzigen Schritt hat** (Sidebar-Einträge combat/shop/bank/quests sowie slayer/enchanting sind ohne Guide-Schritt; Food/Auto-Eat kommt nirgends vor). Die 23 Schritte führen den Neuling durch 21 Menü-Flächen, von denen er in Stunde 1 fast keine braucht, und entlassen ihn dann unvorbereitet in die einzige Mechanik mit 13-Minuten-Kill-Timer (§6). Die echten Ratlos-Momente (§5: Food, Tod-UX, Quest-Zähler, Quest-Claim) werden von 0/23 Schritten adressiert.

Einordnung: Das Deferral ist bewusst (Onboarding-Guide = finaler Meilenstein; Kampf/Shop/Bank-Pässe geplant). Aber solange Kein-Regen den Kill-Timer stellt, ist der Kampf/Food-Pass kein Polish, sondern Überlebens-Doku — Minimallösung bis dahin: EIN Schritt/Hinweis „Food-Slot + Auto-Eat" vor dem ersten Kampf oder die T1-#3(d)-Warnung „kein/wenig Food im Auto-Eat-Slot" im Kampf-Panel.

---

## 8) Findings

**#1 [P2][balance/design] Idle-Nacht-Kämpfe im CL-1–30-Band sind eine Tod-Lotterie: gemessener Food-Verbrauch 2,5–4,3/Min schlägt jeden sinnvollen Puffer — 16 bzw. 21 Tode in ~50 h, ~95 % am Ende einer Idle-Strecke — confirmed (§3, §5).**
- Kern-Repro: Seed 83 @522 min — 186er-Food-Puffer für eine Boar-Nacht (Lv 10 @CL 20), Vorrat 0 nach ~40 Min, Tod nach ~56 Min. Auch bull_boss Lv 15 tötet CL 27 (Seed 12, 2×).
- Das ist T1-#1/#3 vom Kaltstart auf das ganze Frühband erweitert; kein Toolkit-Artefakt (Fütterung lief korrekt). Owner: **Chef-Entscheid** (balance-designer spezifiziert): Auto-Eat-Fallback aufs Inventar ODER Flucht/Kampf-Stopp bei 0 Food statt Ausbluten ODER Food-Reichweiten-Anzeige + Warnung beim Idle-Start ODER bewusst lassen (dann Tod-UX priorisieren). Bis dahin frisst jeder Übernacht-Kampf regelmäßig halbe Nächte.

**#2 [P2][toolkit/logic-dev] `equipBar` verrechnet den freiwerdenden Offhand nicht, wenn eine 1H-Waffe eine 2H ersetzt — Seed 12 hing 50 h auf copper_spear (4,845) statt bronze_sword+Schild (5,80) — confirmed (§4.1, Probe).**
- `sim-realistic.ts:1967–1978`; verriegelt zusätzlich Shop-Kauf UND Craft-Route (beide fragen dieselbe Bar). Verzerrt jede künftige Melee-Messung (CL-Kurve Seed 12 ist Artefakt-belastet). **Vor dem nächsten Sweep fixen** — Spiegelbild des T4-#2-2H-Fixes.

**#3 [P2→P3][content] Die frühe Melee-Waffen-Quest-Kette (`q_first_blood`→`q_goblin_slayer`→…→steel_sword) zählt nur `kill_monster target:"goblin"` — Goblin-VARIANTEN zählen nicht — confirmed (§4.3).**
- Seed 12: 4 614 Kills, Tausende Goblin-Varianten, 0 Basis-Goblins → Kette in 50 h nie gestartet. Spieler-Spiegel: „Erschlage 10 Goblins" bleibt 0/10 beim Goblin-Grinden. Option: Objective auf `family: humanoid`-Goblins/Familien-Ziel erweitern (Familien-Infrastruktur existiert seit T6) oder Quest-Text präzisieren („gewöhnliche Goblins in den Grenzlanden") + Basis-Goblin prominenter machen. Owner: **content-dev** (ggf. logic-dev für Familien-Objectives).

**#4 [P3][toolkit/logic-dev] `craftWeaponUpgradeTask` sieht nur FREIGESCHALTETE Rezepte — trainiert nicht Richtung Rezept-Gate (anders als die obtainItem-Route T4-#6) — confirmed (§4.2).**
- Seed 12 @smithing 2: forge_bronze_sword (Lv 5) unsichtbar → Route still null. Nachrangig zu #2 (korrekte Bar hätte den Shop-Weg geöffnet), aber derselbe Fehlmodus wie T4 Seed 63 in Grün.

**#5 [P3][balance/design] Kaltstart-Letalität unverändert: 10/10 unbeaufsichtigte Frischlinge sterben am Tutorial-Huhn (Min 8–56, Median ~12,5; cow 5–6, rot_rat 3) — confirmed, Re-Messung von T1-#1 (§6).**
- Kein neuer Befund, aber jetzt mit Frequenz-Beleg über 10 Seeds und dem Zusatz, dass auch der aktiv gemanagte Neuling in Stunde 1 sterben kann (§5). Bleibt Chef-Morgenreport-Punkt; Empfehlung unverändert (d) Warnung sofort + (b) moderat, PLUS §3-Hebel.

**#6 [P3][design/ux] Onboarding-Guide deckt 0 der 5 Flächen der echten ersten Stunde (Kampf/Quests/Shop/Bank/Food) — die 23 Schritte sind eine Menü-Landkarte, kein Überlebens-Einstieg — confirmed statisch (§7).**
- Bewusstes Deferral, aber mit §6 kollidierend. Minimal-Brücke bis zum Kampf-Pass: 1 Schritt oder Panel-Warnung zum Food-Slot (ui-dev, klein). Owner: **Chef** (Roadmap) + **ui-dev**.

**#7 [P4][pacing/content] CL 24→30 = ~20–25 h Goblin-Monotonie: Leiter lückenlos, aber eine Zone/eine Familie/gleiche Drops; erste Öden > 2 h ab ~21–27 h, längste 5,8 h; CL 28→30 allein 19 h — confirmed (§2).**
- Erst ab Lv 30 (Aschfelder) wird es frisch. Optionen: Zwischen-Beat im Band 25–29 (Mini-Boss/Quest/Zonen-Vorposten) oder bewusst lassen (Idle-Genre verträgt Grind). Owner: **Chef/balance-designer**.

**#8 [P4][toolkit] Inventar-Entlastung kann Instanz-Loot weiterhin nicht anfassen und meldet dann „nichts bankbar/verkaufbar" (8× Seed 12) — bekanntes T4-#3-Restloch; teils spurios (regulär verkaufbare Duplikate lagen daneben). Owner: logic-dev, niedrig.**

**Positiv-Befunde:** Erste Stunde exzellent (Neuheit alle ~1,3 Min, natürliche Quest→Kampf→Skill→Shop-Kette, 0 Mikro-Frictions, CL 10–11 + ~1–2k Gold nach 60 Min); Attention-Fairness hält (TL 150 latcht neben dem Kampfziel, keine Starvation, Nächte enden am Ziel-Latch); Gold-Ziel 10k in ~8–10 h, Band durchgehend goldpositiv; `stockFoodForIdle`-Guard wirkt (kein Potion-Umschalt-Tod vor Nächten mehr); Quest-Kette liefert, WENN sie zündet (Seed 83: iron @8,6 h, steel @19,7 h); Erst-Kill-Kadenz 0–20 h dicht; keine Stalls/Walls im Scheduler; 183k/389k Rest-Gold bestätigt T10 (Senken-Konzept nötig).

---

## Top-3 fürs Triage

1. **[P2] Idle-Nacht-Tod-Lotterie unter Kein-Regen** (#1, mit #5/#6): Food-Burn 2,5–4,3/Min macht jede längere Kampf-Nacht tödlich — vor EA 0.1 einen weichen Fehlermodus wählen (Fallback/Flucht/Warnung), sonst ist „tot aufgewacht" das Standard-Erlebnis des Frühspiels.
2. **[P2] Toolkit: `equipBar`-2H-Asymmetrie** (#2, + #4): vergiftet Melee-Messungen wie T3-F2 einst Ranged — vor Welle 3 fixen (ein Fix, zwei Verriegelungen fallen).
3. **[P2→P3] Basis-Goblin-Quest-Falle** (#3): Familien-Zählung oder Text-Fix — hängt die frühe Melee-Waffenleiter sonst an einen Zufalls-Pick.
