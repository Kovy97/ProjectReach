# Sweep 6 — T3: Ranged-Progression + Munitions-Ökonomie nach der Entkopplung

**Tester:** Kontrolleur (Sweep-6-Agent T3) · **Datum:** 2026-07-02/03 · **Scope:** headless, read-only
**Methode:** Wegwerf-Harness `_tmp_s6t3_ranged.test.ts` (vitest, nach dem Lauf gelöscht) — 6 Proben:
Munitions-Leiter (Daten + angewandte `computeStats`-Spanne), Pfeil×Bogen-Gate-Matrix (208 Paare),
Feuer-Proben quer durch die Tiers, Auto-Reload-Szenarien, Fletching-Ketten-Audit, skriptete
2-h-Ökonomie-Läufe je Band, plus **ehrlicher RealisticPlayer-Lauf Seed 52 (ranged), 40 Sim-h**
`pursue(combatLevel 35, fletching 40, gold 5000)`. Alle Zeiten SPIELZEIT. Kein Fix vorgenommen.

## Ergebnis-Überblick

| Prüfpunkt | Ergebnis |
| --- | --- |
| Munition-leer-Friction (Ziel < 10 Events / 40 Sim-h) | ✅ **1 Event** (Sim-Min 230, Reserve = 0, danach nachgekauft) |
| Auto-Reload wählt besten NUTZBAREN Pfeil | ✅ blacksteel (0.6, req 30) gewählt; mithril (0.7, req 40) fällt korrekt durch |
| Jeder Pfeil auf jedem Bogen (Entkopplung) | ✅ 10 Feuer-Paare quer durch die Tiers verbrauchen Munition, inkl. godiron_arrow auf cracked_bow |
| Req-Gate des Pfeils (godiron auf Frühbogen @ranged 1) | ✅ equip scheitert mit „Skill-Anforderung nicht erfüllt"; Gate-Matrix 208/208 korrekt |
| Fletching-Kette lückenlos | ✅ alle 13 Munitions-Items haben Forge+Fletch; fletchLvl == Pfeil-Req in jedem Tier |
| Pfeil-Kosten vs. Loot-Einnahmen je Band | ✅ **kein Verlustgeschäft** in allen 13 Bändern (Details unten) |
| ammoDamage-Leiter monoton | ✅ Daten UND angewandte max-Spanne monoton (31.14 → 34.24 auf godiron_longbow @99) |
| Ehrlicher Seed-52-Lauf (40 h): Ziele | ◐ gold 5000 ✅ (24 h), CL 27/35 (77 %), fletching 29/40 (33 %) — s. F2/F3 |

**Empfehlung:** Engine-seitig ist die Entkopplung sauber verdrahtet — ship. Zwei Folge-Aufgaben:
Sim-Heuristiken an die Entkopplung anpassen (F2, verfälscht sonst jede Ranged-Persona-Messung)
und den toten Kupferpfeil-Tier entschärfen (F1).

---

## Findings

### F1 · P3 · balance/content — copper_arrow ist strikt von crude_arrow dominiert (toter Tier + Shop-Falle)
- `packages/content/src/index.ts:323-332` (crude_arrow: ammoDamage **0.1**, kein Req, Shop **1 g**) vs. `:436` (copper_arrow: ammoDamage **0.1**, req ranged 1, Shop **4 g**, Craft-Materialwert ~8 g/Pfeil).
- Identischer Schaden, vierfacher Preis; `fletch_copper_arrows` liefert exakt dieselben 2 400 XP/h wie `fletch_crude_arrows` (beide L1), verbraucht aber zusätzlich Kupferbarren+Federn (Harness-P4-Flatspot).
- Praxis-Beleg: der ehrliche Seed-52-Spieler kaufte über 40 h wiederholt copper_arrow (≈ 1 000 Stück à 4 g) ohne jeden Schadens-Gewinn gegenüber crude à 1 g.
- Vorschlag (kein Fix hier): copper_arrow auf ammoDamage 0.15 anheben ODER Shop-Preis auf 1–2 g senken ODER Tier streichen. **Owner: content-dev / balance-designer.**

### F2 · P2 · sim-harness — RealisticPlayer-Heuristiken sind NICHT entkoppelt (Sorten-Matching), Ranged-Messungen verzerrt
Die Engine schießt jeden Pfeil aus jedem Bogen (combat.ts:1135-1148), aber der ehrliche Fake-Spieler denkt noch in `weapon.ammoType`:
- `packages/engine/src/sim-realistic.ts:1509-1512` — manageAmmo zählt einen Köcher mit „fremder" Sorte als 0 und rüstet die Bogen-Sorte zurück (kann einen vom Engine-Auto-Reload geladenen BESSEREN Pfeil aktiv downgraden);
- `:1288` — nach outOfAmmo wird nur weitergekämpft, wenn der Köcher exakt die Bogen-Sorte enthält;
- `:1657-1658` und `:1930-1931` — Bogen-Upgrades werden verweigert, solange die DEKLARIERTE Sorte nicht bevorratet ist (nach der Entkopplung irrelevant);
- `:1596/1608` — alignQuiverTo zwingt den Köcher auf die Bogen-Sorte.
- Messbare Folge im Seed-52-Lauf: **214 iron_arrow (0.3 dmg) lagen ungenutzt in Inventar/Bank, während laufend copper_arrow (0.1 dmg) nachgekauft wurde** — Endstand nach 40 h: Köcher copper_arrow×65 bei ranged 36. Ein echter Spieler rüstet die Eisenpfeile einfach aus (+0.2 flat je Schuss).
- Kein Spiel-Bug — aber solange das steht, unterschätzt jede Ranged-Persona Kill-Tempo/Progression und die Friction-Zählung misst das ALTE Verhalten. **Owner: logic-dev (Sim-Toolkit), via CEO einplanen.**

### F3 · P3 · progression/feel — Ehrlicher Ranged-Main hängt nach 40 Sim-h auf dem L1-Bogen fest (CL 27/35, 15 Tode)
- Seed 52, 40 Sim-h: Endgear **copper_shortbow** (Shop-L1-Bogen) bei ranged 36; 5× „wiederholt gestorben"-Friction an Lv-19-26-Goblins (goblin_archer/spearman/butcher, tower_goblin_rogue); fletching-Ziel 29/40.
- Ursachenmix: (a) F2-Heuristiken (Bogen-Wechsel/Pfeil-Nutzung blockiert), (b) Bogen-Progression läuft per Chef-Entscheid ausschließlich über Fletching/Drops (`content/src/index.ts:11289-11292` — kein Fortschritts-Gear im Shop), aber der Sim craftet Bögen nur als XP-Quelle, nie als Gear-Route, und in den frühen Zonen (pastures/borderlands) existiert praktisch kein Bogen-Drop (farmhand_sling @ 0.0019 ist der einzige ranged-Mainhand-Drop der Weide; nächste echte Bögen erst coast/crypt).
- Die Fletch-Kette selbst ist erreichbar (iron_shortbow @ fletching 10 = oak_log×3 + bowstring; bowstring = scarred_hide, droppt breit ab den Frühzonen) — der Pfad existiert, wird vom Harness nur nicht gegangen. Nach dem F2-Fix neu messen; wenn der Stall bleibt, ist es ein echtes Onboarding-/Signposting-Thema („dein nächster Bogen kommt vom Fletchen"). **Owner: zunächst logic-dev (F2), danach Re-Test; Game-seitig beobachten (balance-designer).**

### F4 · P4 · content-nit — Godiron-Spitzen 4 Level vor dem Pfeil craftbar (einziger Tier mit Versatz)
- `forge_godiron_arrowheads` @ smithing **95** (`content/src/index.ts:7032`), `fletch_godiron_arrows` @ fletching **99** (`:7944-7954`, bewusst 95→99 gefixt). In allen anderen 11 Tiers gilt forge-Level == fletch-Level. Harmlos (Vorlauf-Material), nur Inkonsistenz. **Owner: content-dev, bei Gelegenheit.**

### F5 · P4 · Beobachtung (positiv) — Munitions-Ökonomie trägt in jedem Band; Kostenanteil steigt spät deutlich
Kein Band ist ein Verlustgeschäft; früh subventionieren Pfeil-Drops die Munition sogar komplett (Band copper: Netto-Pfeil-GEWINN durch chicken-Drops). Der Munitionskosten-Anteil am Brutto steigt aber von ~6 % (iron, Shop-Preis) auf ~48-60 % (titanium/godiron, Material-Wert) — gewollte Gold-Senke, im Auge behalten. Food ist ab Tier 40+ der zweite große Posten (bis 1 779 Stück/2 h @ titanium).

---

## Messdaten

### Munitions-Leiter (Daten; angewandte Spanne monoton bestätigt)
| Pfeil | req | ammoDamage | value | Shop | Craft-Material/Stk | Fletch-Lvl |
| --- | --- | --- | --- | --- | --- | --- |
| crude | – | 0.1 | 1 | 1 | 0.93 | 1 |
| copper | 1 | 0.1 | 2 | 4 | 8 | 1 |
| bronze | 5 | 0.2 | 2 | – | 8 | 5 |
| iron | 10 | 0.3 | 3 | 6 | 9 | 10 |
| steel | 20 | 0.5 | 4 | – | 10 | 20 |
| blacksteel | 30 | 0.6 | 6 | – | 12 | 30 |
| mithril | 40 | 0.7 | 8 | – | 14 | 40 |
| adamantium | 50 | 0.9 | 11 | – | 17 | 50 |
| runite | 60 | 1.1 | 15 | – | 21 | 60 |
| bloodiron | 70 | 1.4 | 19 | – | 25 | 70 |
| titanium | 80 | 1.7 | 24 | – | 30 | 80 |
| aetherium | 90 | 2.0 | 30 | – | 36 | 90 |
| godiron | 99 | 3.2 | 40 | – | 46 | 99 |

XP/h-Leiter der Pfeil-Rezepte monoton (2 400 → 109 500), einziger Flatspot crude==copper @L1 (→ F1).

### Auto-Reload-Proben (Engine, scripted)
- ranged 30, steel_shortbow, Köcher 3× crude, Inventar: copper/steel/blacksteel/mithril je 200 → nach Leerschießen Köcher **blacksteel_arrow×164**, mithril unangetastet (200), kein Stopp. ✅
- ranged 30, NUR mithril (req 40) im Inventar, Köcher leer → sauberer outOfAmmo-Stopp, 0 Kills, kein illegales Equip. ✅
- Gate: godiron_arrow @ranged 1 auf cracked_bow → equip-Fail „Skill-Anforderung nicht erfüllt"; @ranged 99 feuert er auf dem cracked_bow (19 Schuss/2 min). ✅

### Ökonomie je Band (2 Sim-h, skriptet: Skills = Band-Level, Tier-Kurzbogen + Tier-Pfeil, on-level-Gegner)
| Band (Pfeil@Lvl vs Gegner) | Kills | Pfeile (je Kill) | Gold+Loot | Pfeilkosten (Shop / Material) | Netto |
| --- | --- | --- | --- | --- | --- |
| crude@1 vs chicken (L1) | 1001 | 1045 (1.0) | 16 872 | 1 045 / 975 | **+15 827** |
| copper@1 vs chicken (L1) | 1001 | −244 (Drops!) | 14 304 | −976 / — | **+15 280** |
| bronze@5 vs cow (L5) | 784 | 1588 (2.0) | 18 984 | — / 12 704 | **+15 808** (Material) |
| iron@10 vs boar (L10) | 593 | 2088 (3.5) | 27 233 | 12 528 / 18 792 | **+14 705** (Shop) |
| steel@20 vs goblin_spearman (L20) | 659 | 2008 (3.0) | 57 192 | — / 20 080 | **+37 112** (Material) |
| blacksteel@30 vs ash_rat (L30) | 694 | 2003 (2.9) | 74 508 | — / 24 036 | **+50 472** |
| mithril@40 vs mire_crawler (L38) | 579 | 2406 (4.2) | 104 722 | — / 33 684 | **+71 038** |
| adamantium@50 vs rootling_gimp2 (L51) | 493 | 2770 (5.6) | 139 635 | — / 47 090 | **+92 545** |
| runite@60 vs bramble_witch (L60) | 511 | 2852 (5.6) | 219 800 | — / 59 892 | **+159 908** |
| bloodiron@70 vs skeleton_spearman (L71) | 500 | 3018 (6.0) | 192 905 | — / 75 450 | **+117 455** |
| titanium@80 vs skeleton_icemage (L80) | 398 | 3348 (8.4) | 210 443 | — / 100 440 | **+110 003** |
| aetherium@90 vs forest_hare (L90) | 951 | 1824 (1.9) | 154 261 | — / 65 664 | **+88 597** |
| godiron@99 vs gray_wolf (L97) | 849 | 2329 (2.7) | 180 273 | — / 107 134 | **+73 139** |

(Netto = Gold+Loot-Wert minus Pfeilkosten; Food separat: 5 → 1 779 Stück/2 h steigend. Skript-Setup
unterschätzt Attribute eines echten Mains leicht → Pfeile/Kill konservativ.)

### Ehrlicher Lauf — Seed 52, ranged, 40 Sim-h, pursue(CL 35, fletching 40, gold 5000)
- Ziele: gold 5000 ✅ nach 24 h 6 min · CL **27**/35 (77 %) · fletching **29**/40 (33 %).
- 1 536 Kills, **15 Tode**, 7 Frictions gesamt, davon **1× Munition leer** (Ziel < 10 ✅); 5× „wiederholt gestorben" an Lv-19-26-Goblins; 1× Koch-Zutaten unerreichbar.
- Endstand: mainhand **copper_shortbow**, Köcher copper_arrow×65, ranged 36, defence 1; Pfeil-Bestände crude 107 / copper 65 / **iron 214 (nie verwendet — F2)**; 92 Munitions-/Fletch-Log-Zeilen (überwiegend copper-Nachkäufe in 30-40er-Stückzahlen).
