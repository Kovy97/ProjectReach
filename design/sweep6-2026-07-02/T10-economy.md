# T10 — Economy-Audit vor Release (Sweep 6)

**Tester:** T10 (Kontrolleur-Rolle, read-only) · **Datum:** 2026-07-03
**Methode:** (1) RealisticPlayer-Läufe (honest, kein give/setSkillLevel), Seeds **74 + 85**, je **30 Sim-h SPIELZEIT**, 3 Personas pro Seed (Melee-Grinder skillingBias 0.15 / Ranged-Allrounder 0.25 / Magic-Skiller 0.5), Gold-Sample je Sim-Stunde, Buy/Sell-Verben kategorisiert per Wrapper (kein Engine-Eingriff). (2) Statische Content-Analyse: Direkt-Arbitrage, rekursive Craft→Sell-Loops (Zutaten nur zu Shop-Preisen bewertet), Familien-Value-Leitern, Farming-Margen, Food-g/HP.
Wegwerf-Harness `_tmp_s6t10_*` (packages/engine/src), nach dem Lauf gelöscht. **Kein Fix vorgenommen.**

---

## TL;DR

- **Exploits: sauber.** Keine Buy→Sell-Arbitrage (0 Shop-Items mit Verkauf > Kaufpreis), **keine** Craft→Sell-Gold-Loop mit rein kaufbaren Zutaten (Alchemie sauber — Heiltränke/Tonika brauchen nicht kaufbare Kräuter; der dim_essence-Fix aus Sweep 2 hält). Familien-Leitern monoton bis auf **eine** 10-Gold-Inversion (P4).
- **Gold-Überschuss persistiert (P2):** Melee-Grinder steht nach 30 Sim-h bei CL 26–27 mit **136k–186k Gold** + 33k–72k Bank-Hortwert. Auto-Trank/Tonika haben **keinen** Gold-Abfluss gebracht (seit Chef-Entscheid 2026-06-28 nicht kaufbar → Kräuter-/Zeit-Kosten, kein Gold). Alle existierenden Senken zusammen absorbieren ~26–31 % des Grinder-Einkommens.
- **Ranged zahlt doppelte Grind-Steuer bei halbem Einkommen (P2):** Upkeep-Quote ranged 40–48 % (Food+Munition) vs. melee 16–23 %, bei nur ~40 % des Melee-Einkommens pro Kampfstunde.

---

## (a) Gold-Quellen vs. Sinks je Phase — die 6 Läufe

| Lauf | Stil (Bias) | CL | Kills | Tode | verdient | ausgegeben | Endgold | Bank-Hort (Sellwert) | Upkeep-Quote |
|---|---|---|---|---|---|---|---|---|---|
| Grinder74 | melee (.15) | 27 | 3537 | 19 | 221.673 | 35.299 | **186.374** | 32.569 | 16 % |
| Grinder85 | melee (.15) | 26 | 3043 | 17 | 176.384 | 40.284 | **136.100** | 72.147 | 23 % |
| Robin74 | ranged (.25) | 26 | 1083 | 21 | 76.507 | 38.845 | 37.662 | 82.391 | **51 %** |
| Robin85 | ranged (.25) | 27 | 1007 | 18 | 90.846 | 35.850 | 54.996 | 50.280 | **39 %** |
| Mage74 | magic (.5) | 27 | 977 | 16 | 100.414 | 25.265 | 75.149 | 83.925 | 25 % |
| Mage85 | magic (.5) | 26 | 919 | 15 | 63.938 | 23.333 | 40.605 | 175.282 | 36 % |

**Sink-Kategorien (wofür ausgegeben wurde):** praktisch alles ist Food (cooked_trout: 697–1420 Stück = 19,5k–39,8k g) plus bei Ranged Munition (copper_arrow 3784–4176 Stück = 15,1k–16,7k g). Shop-**Gear** lebenslang: **440–595 g** (Starter-Set in Stunde 1, danach nie wieder — Fortschritts-Gear ist per Chef-Entscheid Drop/Craft-only). Verkaufs-Einnahmen (Quick-Sell) minimal: 137–736 g — der RealisticPlayer bankt Materialien statt zu verkaufen (daher die Hortwerte).

**Gold-Kurven (Endgold je Sim-h, Seed 74):**
- **Früh (h1–5):** melee 1,2k→7,6k · ranged 0,5k→0,5k · magic 0,5k→1,7k. Keine Engpässe: Starter-Waffen (18–130 g) sofort leistbar. Ranged klemmt am Boden — Munition+Food fressen alles.
- **Mittel (h5–15):** melee →56,6k · ranged →7,4k · magic →21,0k.
- **Spät (h15–30):** melee →186,4k (**linear ~6–8k/h, keine Abflachung — nichts bremst**) · ranged →37,7k · magic →75,1k.

**Re-Quantifizierung des bekannten CL-30-Funds (170–360k):** Für die kampf-fokussierte Persona **bestätigt in der Größenordnung** (136k–186k bei CL 26–27 + Hort; auf CL 30 extrapoliert ≥ 200k). Die Auto-Trank-/Tonika-Systeme (SAVE_VERSION 49) ändern daran **nichts**: `defaultAutoPotion` ist gratis, Heiltränke/Tonika sind **nicht im Shop** — ihr „Preis" ist Herblore-Zeit + Kräuter, kein Gold. Der Gold-Überschuss ist unverändert da.

**Absorptionsrechnung aller existierenden Senken:** komplettes One-Time-Shop-Sortiment (27 Tools/Gear/Bag) = **22.091 g** + alle 3 Auto-Eat-Stufen = **35.000 g** ⇒ 57k ≈ 26–31 % des Grinder-Einkommens. Danach bleiben nur eskalierende Bank-Slots (5k/8k/12,8k/20,5k/32,8k …, funktionierender Endlos-Sink — den der Realist aber nie anfasst) und Enchant-Gold. **~69–84 % des verdienten Golds hat bei CL 27 kein Kaufziel** (melee 84 %, magic 63–75 %, ranged 49 %).

---

## (b) Shop-Audit: Sortiment vs. Bedarf je Band

**Sortiment-Struktur:** 6 Waffen (alle ≤ req 5), 7 Rüstungs-/Starterteile, 15 Tools (Spitzhacken/Ruten/Sicheln 100–4500 g), ~30 Samen (3–380 g), Basics (Pfeile, vial_of_water, item_scrap, Reeds). Teuerste Items: runite_pickaxe 4500, void_rod/void_sickle 3800.

**Waffen-Decke (Chef-Entscheid offen — Datenlage):**

| Shop-Waffe | Kosten | Requirement |
|---|---|---|
| rusty_sword / cracked_bow / cracked_staff | 20 / 18 / 18 | keins |
| bronze_sword | 130 | attack 5 |
| copper_shortbow / gnarled_staff | 120 / 120 | ranged 1 / magic_off 1 |

- Lebenslanger Waffen-Spend im Shop: **max. 426 g** = **0,19–0,6 %** des 30-h-Einkommens.
- Ab Sim-h 3 (CL 11–17) hat jede Persona das 20–60-fache der teuersten Shop-Waffe flüssig; ab h10 das 30–240-fache.
- **Antwort auf die Chef-Frage:** Die Copper/Bronze-Decke lässt nahezu **100 % der Waffen-Kaufkraft ungenutzt** — aber sie ist als GOLD-Senke irrelevant: selbst eine Anhebung auf Iron/Steel (geschätzt 300–800 g je Waffe) absorbierte einmalig < 2k ≈ **< 1 %** des 30-h-Einkommens. Die Decke ist eine reine Progressions-Philosophie-Frage (Gear via Drops/Crafting, „combat is fundamental"), **kein** Hebel gegen den Überschuss. Der Überschuss braucht wiederkehrende/eskalierende Senken, nicht teurere Einmal-Käufe.

**Bedarf je Band gedeckt?** Früh: ja (Starter-Kit + Food + Munition + billige Samen). Mittel/spät: Tools-Leiter (bis 4,5k) ist der einzige mitwachsende Posten; danach kauft der Spieler nur noch Verbrauch (Food/Pfeile/Samen). Kein Angebot im 10k+-Band außer Bank-Slots/Auto-Eat (im Menü, nicht im Shop).

---

## (c) Quick-Sell/Bank-Werte: Leitern & Exploits

- **Direkt-Arbitrage (kaufen → sofort verkaufen): 0 Treffer.** Kein Shop-Item hat `sellPrice > cost`.
- **Craft→Sell-Profit-Loops (alle Zutaten rekursiv zu Shop-Preisen beschaffbar): 0 Rezepte mit Profit > 0** (geprüft über alle Actions mit Inputs, EV inkl. Erfolgschance @ L99, Verkauf = value × 0,5). Der Alchemie-Klassiker existiert nicht: vial_of_water (2 g) ist kaufbar, aber jedes Kraut ist Farm-/Forage-only ⇒ Tränke sind Zeit-, nicht Gold-Loops. Deckt sich mit `design/crafting-margin-audit.md` (reale Voll-Kette ≈ Combat-Niveau, kein Drucker).
- **Familien-Leitern (Metall × Waffentyp/Rüstungsteil, Gems × Ring/Amulett): monoton bis auf 1 Fund:**
  - **P4:** `gemstone_ring` (req 20) value **350** < `sapphire_ring` (req 15) value **360** — einzige echte Tier-Pendant-Inversion im Katalog (Amulett-Pendant ist korrekt: 480 > 440). Einzeiler für content-dev.
- Breiter Pairwise-Scan (gleicher Slot/Stil/Typ/Rarity, req>0) zeigt daneben nur Bewusstes: Chase-Drops mit niedriger Req + hohem Value sind per Rare-Drop-Philosophie **intended** und wurden nicht als Findings gezählt; thematische Einzel-Drops (z.B. alpha_fang_amulet 900 @36 vs. ruby_amulet 760 @38, slayer_amulet 5500 @70 vs. heartforged_pendant 5000 @82) liegen im Rausch-Bereich, kein Exploit (alles Drop-only, kein Kaufweg).
- **Farming (Shop-Saat → Quick-Sell der Ernte):** alle 30 Crops profitabel (intended, Zeit-Loop). Spitze: godbloom **~668 g/h pro Plot** (Saat 320 → EV 2100, 2,67 h). Mit 9 Plots ≈ **6,0k g/h rein passiv** — erreicht ~70–80 % des aktiven Melee-Grinds (8,7k/h Kampfzeit) und **überholt Ranged aktiv (3,4k/h)**. Kein Exploit (Farming-Level + Replant-Takt nötig), aber als P3 notiert: die passive Leiter sollte den schwächsten aktiven Stil nicht schlagen.

---

## (d) Auto-Eat-/Auto-Trank-Upgradekosten vs. Nutzen

- **Auto-Eat:** 2.000 / 8.000 / 25.000 g für Schwelle 0,5→0,6→0,7→0,8 (healMult konstant 1,0 per Chef-Entscheid). Kein Food-Mehrverbrauch durch höhere Schwelle (verzehrte Heilung = erlittener Schaden), reiner Sicherheits-/Komfortgewinn ⇒ Preis fair. In Einkommens-Stunden: melee ~0,3 h / 1,1 h / 3,4 h — gut gestaffelt; ranged ~0,8 h / 3,1 h / 9,8 h — T3 für Ranged spürbar teurer (Folge der Einkommens-Asymmetrie aus (a), nicht der Preise).
- **Auto-Trank (Chef-Feature 2026-07-02):** Freischaltung gratis (`defaultAutoPotion`), **kein Gold-Upgrade, kein Gold-Sink** — Kosten sind Kräuter/Herblore-Zeit. Ökonomisch neutral.
- **Beobachtung Sim-Realismus:** Der RealisticPlayer kauft die Auto-Eat-Stufen **nie** (`autoEatTier 0` in allen 6 Läufen nach 30 h) — die Läufe UNTERschätzen die realen Sinks um bis zu 35k. Selbst damit eingerechnet bleibt der Melee-Überschuss sechsstellig.

---

## (e) Tonika-/Food-Preise vs. No-Regen-Bedarf (Grind-Steuer)

- Shop-Food: cooked_shrimp 12 g/HP-Einheit, cooked_trout 14 g/HP-Einheit (28 g, heilt 2) — das Massenprodukt jeder Persona (697–1420 Trouts/30 h). Gekochtes Eigen-Food ist deutlich billiger (Zeitkosten statt Gold) — der Shop-Aufschlag von ~2,3× über `value` ist eine funktionierende Komfort-Steuer.
- **Grind-Steuer gesamt (Upkeep/Einkommen):** melee **16–23 %**, magic **25–36 %**, ranged **39–51 %**. Für melee/magic zumutbar und gesund (Gold zirkuliert). **Ranged ist doppelt belastet** (Food + 15–17k Munition) bei gleichzeitig niedrigstem Einkommen pro Kampfstunde — siehe P2-2.
- Tonika (62 Buff-Items) sind komplett kauffrei ⇒ keine Gold-Steuer, reine Herblore-/Cooking-Ökonomie. Kein Handlungsbedarf.

---

## Findings (priorisiert)

| # | Sev | Finding | Zahlen/Beleg | Owner |
|---|---|---|---|---|
| 1 | **P2** | **Gold-Überschuss ohne Ziel persistiert** (bekannter Fund, neu quantifiziert): Melee-Grinder 136k–186k Endgold @ CL 26–27 nach 30 Sim-h, linear steigend; Auto-Trank/Tonika brachten keinen Gold-Abfluss; alle Senken zusammen absorbieren 26–31 % | Läufe Grinder74/85; Senken-Summe 57k (Shop 22.091 + Auto-Eat 35.000); 69–84 % der Kaufkraft ohne Ziel | balance-designer (Senken-Konzept; Enchant-Gold/Bank-Slots prominenter machen oder neue wiederkehrende Senke) |
| 2 | **P2** | **Ranged: doppelte Grind-Steuer bei ~40 % des Melee-Einkommens pro Kampfstunde** — Upkeep 39–51 % (Food+Munition) vs. melee 16–23 %; Einkommen/Kampf-h: melee ~8,7k, magic ~6,7k, ranged ~3,4k | Robin74/85: earned 76,5k/90,8k, davon Munition 16,7k/15,5k; Kills/Kampf-h: melee 139, magic 65, ranged 48 | balance-designer + combat-dev (Kill-Tempo-Parität ranged; alternativ Pfeil-Kosten/Drop-Rückfluss) |
| 3 | **P3** | **Enchant-Gold-Sink zählt `stats.goldSpent` nicht hoch** — inkonsistent zu shop.ts/bank.ts; `gold_spent`-Achievements/Statistik unterzählen, sobald Enchanting Gold frisst | `packages/engine/src/enchant.ts:202` (attach) und `:262` (disenchant): `state.character.gold -= cost` ohne `state.stats.goldSpent += cost`; Gegenmuster `shop.ts:24-25/65-66/104-105`, `bank.ts:130-131` | logic-dev |
| 4 | **P3** | **Passives Farming überholt aktiven Ranged-Grind**: 9 Plots godbloom ≈ 6,0k g/h passiv vs. ranged aktiv ~3,4k g/h | Farming-Margen-Tabelle (§c): godbloom 668 g/h/Plot, wraithcap 583, corpse_lily 568 | balance-designer (Beobachtung; ggf. T4/T5-Crop-Margen leicht drücken oder an P2-2 koppeln) |
| 5 | **P4** | **Value-Inversion gemstone_ring**: req 20, value 350 < sapphire_ring req 15, value 360 — einzige Familien-Leiter-Verletzung im Katalog | statischer Scan über alle Metall-/Gem-Familien (1 Treffer) | content-dev (value → ~400) |
| 6 | **P4** | Shop-Waffen-Decke (Datenlage zur offenen Chef-Frage): Decke = req 5 / 130 g; Waffen-Kaufkraft ab h3 zu ~100 % ungenutzt; Anhebung auf Iron/Steel absorbierte < 1 % des 30-h-Einkommens — als Gold-Senke irrelevant, reine Design-Frage | §b-Tabelle | Chef-Entscheid (keine Balance-Wirkung) |

**Positiv-Verdikt (explizit):** keine Arbitrage, keine Gold-Druck-Loops (Alchemie/Smithing/Fletching sauber), Value-Leitern praktisch monoton, Tod kostet bewusst nichts (`combat.ts` onPlayerDefeated — kein versteckter Sink, kein Exploit), Bank-Slot-Sink skaliert korrekt exponentiell. Die Ökonomie ist **exploit-frei, aber oben offen** — das Release-Risiko ist Langeweile durch nutzloses Gold (P2-1), nicht Wirtschaftsbruch.
