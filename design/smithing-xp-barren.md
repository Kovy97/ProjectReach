# Smithing-XP und Barren: Warum Maul 120 XP und Platebody 99 XP gibt

**Autor:** Balance-Designer · **Datum:** 2026-08-25 · **Status:** Analyse und Entscheidungsvorlage, KEINE Content-/Code-Änderung.
**Frage des Chefs (wörtlich):** „Warum wirken die Smithing-XP-Werte so willkürlich? Warum gibt der Blacksteel Maul 120 XP, verbraucht 3 Barren, und Blacksteel Platebody verbraucht 5 Barren und gibt nur 99 XP. Sollte die XP nicht gekoppelt sein an die verwendete Barren-Anzahl?"
**Datenbasis:** `packages/content/src/index.ts` (261 Smithing-Aktionen, 29 Mining-Aktionen, 399 Aktionen der Nachbar-Skills), `packages/engine/src/leveling.ts` (`xpForLevel`), Wegwerf-Auswertung per Vitest (gelöscht). Alle Zahlen sind Basiswerte ohne Werkzeug, Lager-Boni, Mastery oder Ring-Perks.

---

## 0. Kurzantwort

| Frage | Antwort |
|---|---|
| Hängt die Forge-XP an den Barren? | Nein. Sie hängt ausschließlich an `levelRequired` × `durationMs`: `xp = round(600 · sqrt(xpForLevel(L+1) − xpForLevel(L)) · durationMs / 3 600 000)`. In allen 12 Tiers liegt XP/h ÷ Ziel zwischen 0.94 und 1.12, im Median exakt 1.00 (T2). |
| Wie stark streut XP pro Barren? | Faktor 2.5 bis 2.8 in JEDEM Tier (Blacksteel 19.8 bis 51.0). Immer gleiches Muster: 1-Barren-Items (Dolch, Helm) sind die sparsamsten, Platebody ist das teuerste. |
| Ist das ein bewusstes Prinzip? | Halb. Die Dauer-Kopplung der XP/h-Kurve ist dokumentiert und gewollt (§2). Die Entkopplung von den Barren ist ein Artefakt: `smithing-stats-spec.md` (25.06.) hatte XP ∝ Barren, Task #232 (05.07.) hat alle 496 Aktions-XP aus Level × Dauer neu abgeleitet und das stillschweigend überschrieben. Kein Dokument hat den Zielkonflikt „XP pro Zeit vs. XP pro Material" je entschieden. |
| Ist Smithing ein Sonderfall? | Nein. Cooking, Leatherworking (inkl. Fletching), Runecrafting, Jewelcrafting, Herblore folgen exakt derselben Regel (§3). Bei Smithing fällt es nur auf, weil es EINE Input-Sorte mit kleinen ganzen Zahlen gibt und OSRS/Melvor „XP pro Barren" als Erwartung gesetzt haben. |
| Empfehlung | Option B: Forge-Dauer an die Barren koppeln, XP weiter aus der Formel. Damit wird XP/Barren je Tier konstant, XP/h bleibt exakt auf der Zielkurve, und ein 5-Barren-Platebody dauert sichtbar länger als ein 1-Barren-Dolch. Apply-Liste in Anhang A3. |

---

## 1. Messung über alle Tiers

### 1.1 Die Zielkurve, gegen die gemessen wird

Live ist seit Task #232 die Konstante **C = 600** (nicht mehr 90 wie in älteren Docs und in einigen Content-Kommentaren). Kontrolle: `smelt_godiron` 1911 XP / 12 s = 573 300 XP/h, Ziel(95) = 573 312.

| L | Ziel XP/h (C=600, live) | alte Referenz (C=90) |
|---|---|---|
| 1 | 5 466 | 820 |
| 10 | 8 570 | 1 285 |
| 20 | 14 046 | 2 107 |
| 30 | 23 004 | 3 451 |
| 40 | 37 695 | 5 654 |
| 50 | 61 809 | 9 271 |
| 60 | 101 373 | 15 206 |
| 70 | 166 296 | 24 944 |
| 80 | 272 819 | 40 923 |
| 90 | 447 593 | 67 139 |
| 95 | 573 312 | 85 997 |
| 99 | 698 873 | 104 831 |

### 1.2 Barren-Kette je Tier (Mining → Smelting), pro 1 Barren

Erz kommt nur aus Mining (kein Erz und kein Barren im Shop). Barren kommen zusätzlich als Monster-/Schrein-Drops (`iron_bar`, `steel_bar`, `runite_bar`, `godiron_bar`) und aus dem Lager-Schmelzofen (20/40/60 Barren pro Stunde, ohne XP, `refine.ts`).

| Barren | Tier | Smelt-L | Erz-Rezept | Smelt s | Smelt-XP | Erz-Abbau s/Barren | Kette s/Barren | Mining-XP/Barren | Smithing-XP/Barren (Smelt) |
|---|---|---|---|---|---|---|---|---|---|
| copper_bar | copper | 1 | 1 copper | 2.6 | 4 | 3.0 | 5.6 | 5 | 4 |
| bronze_bar | bronze | 5 | 1 copper + 1 tin | 3.0 | 6 | 6.0 | 9.0 | 10 | 6 |
| iron_bar | iron | 10 | 1 iron | 3.2 | 8 | 3.6 | 6.8 | 9 | 8 |
| steel_bar | steel | 20 | 1 iron + 1 coal | 4.5 | 18 | 7.8 | 12.3 | 22 | 18 |
| gravesteel_bar | gravesteel | 22 | 1 gravesteel + 1 coal | 4.8 | 21 | 8.7 | 13.5 | 32 | 21 |
| blacksteel_bar | blacksteel | 30 | 1 steel_bar (1 iron + 1 coal) + 2 coal | 6.0 | 38 | 20.7 | 26.7 | 48 | 56 (38 + 18 Stahl) |
| mithril_bar | mithril | 35 | 2 mithril + 2 coal | 6.5 | 53 | 18.4 | 24.9 | 108 | 53 |
| adamantium_bar | adamantium | 45 | 2 adamantite + 3 coal | 7.5 | 101 | 23.6 | 31.1 | 187 | 101 |
| runite_bar | runite | 55 | 2 runite + 3 coal | 8.5 | 187 | 25.6 | 34.1 | 325 | 187 |
| murkvein_bar | runite | 62 | 2 murkvein + 3 coal | 5.5 | 171 | 26.6 | 32.1 | 475 | 171 |
| bloodiron_bar | bloodiron | 65 | 2 bloodiron + 4 coal | 9.0 | 325 | 30.8 | 39.8 | 698 | 325 |
| titanium_bar | titanium | 75 | 2 titanium + 4 coal | 9.5 | 562 | 32.4 | 41.9 | 1 234 | 562 |
| aetherium_bar | aetherium | 85 | 2 aetherite + 5 coal | 10.5 | 1 019 | 38.0 | 48.5 | 2 179 | 1 019 |
| godiron_bar | godiron | 95 | 2 godiron + 5 coal | 12.0 | 1 911 | 40.0 | 52.0 | 3 091 | 1 911 |

Alle 15 Smelt-Aktionen liegen auf der Kurve (XP/h ÷ Ziel 0.99 bis 1.08, Anhang A2).

### 1.3 Forge-Aktionen je Tier: die Streuung (nur der Forge-Schritt)

| Tier | n | L | Barren | s/Item | XP/Item | XP/s min-max | XP/h ÷ Ziel | s/Barren min-max | XP/Barren min-max | Faktor XP/Barren |
|---|---|---|---|---|---|---|---|---|---|---|
| copper | 19 | 1-4 | 1-5 | 3.0-9.0 | 5-17 | 1.43-1.89 | 0.94-1.12 | 1.8-3.5 | 3.0-5.0 | 1.67 |
| bronze | 19 | 5-7 | 1-5 | 4.0-10.0 | 8-20 | 2.00-2.00 | 0.98-1.08 | 2.0-5.0 | 4.0-10.0 | 2.50 |
| iron | 21 | 10-12 | 1-5 | 4.0-10.0 | 10-27 | 2.31-2.70 | 0.97-1.05 | 1.8-5.0 | 4.8-12.0 | 2.50 |
| steel | 22 | 20-23 | 1-5 | 6.0-15.0 | 23-68 | 3.83-4.53 | 0.98-1.01 | 2.4-7.0 | 10.4-27.0 | 2.60 |
| gravesteel | 3 | 24-26 | 2-5 | 10.0-12.6 | 52-63 | 4.75-5.20 | 0.99-1.00 | 2.5-5.9 | 12.6-28.0 | 2.22 |
| blacksteel | 19 | 30-32 | 1-5 | 7.0-17.0 | 45-120 | 6.38-7.07 | 1.00-1.01 | 2.8-8.0 | 19.8-51.0 | 2.58 |
| mithril | 20 | 40-42 | 1-5 | 7.0-17.0 | 73-197 | 10.43-11.59 | 1.00-1.00 | 2.6-8.0 | 30.0-84.0 | 2.80 |
| adamantium | 19 | 50-52 | 1-5 | 8.0-19.0 | 137-360 | 17.13-18.95 | 1.00-1.00 | 3.0-9.0 | 56.8-155.0 | 2.73 |
| runite | 22 | 60-63 | 1-5 | 9.0-21.0 | 253-653 | 28.11-32.67 | 1.00-1.00 | 3.4-10.0 | 105.8-282.0 | 2.67 |
| bloodiron | 19 | 70-72 | 1-5 | 10.0-23.0 | 462-1173 | 46.18-51.00 | 1.00-1.00 | 3.8-11.0 | 193.8-508.0 | 2.62 |
| titanium | 19 | 80-82 | 1-5 | 11.0-25.0 | 834-2092 | 75.75-83.68 | 1.00-1.00 | 4.2-12.0 | 351.4-909.0 | 2.59 |
| aetherium | 19 | 90-92 | 1-5 | 12.0-27.0 | 1492-3706 | 124.31-137.26 | 1.00-1.00 | 4.6-13.0 | 631.4-1616.0 | 2.56 |
| godiron | 19 | 95-99 | 1-6 | 14.0-31.0 | 2230-6018 | 159.25-194.15 | 1.00-1.00 | 4.5-15.0 | 873.7-2389.0 | 2.73 |
| void | 1 | 65 | 2 | 17.5 | 630 | 36.00 | 1.00 | 8.8 | 315.0 | 1.00 |
| slayer_requirements | 3 | 30-80 | 5-10 | 10.0-30.0 | 64-2273 | 6.40-75.77 | 1.00 | 2.0-3.0 | 12.8-227.3 | (Sonder-Inputs) |

Lesart: XP/s ist innerhalb eines Tiers praktisch konstant (die kleine Restspanne kommt nur aus den Level-Offsets +1/+2 der schweren Items), die Sekunden pro Barren streuen um Faktor 2.6 bis 3. Genau diese Dauer-Streuung wird 1:1 zur XP/Barren-Streuung.

### 1.4 Volle Kette (Mining + Smelting + Forging): Smithing-XP pro Gesamtstunde

Für einen Spieler, der Erz selbst abbaut. Mining-XP sind hier NICHT eingerechnet (sie gehen an Mining), Smelt-XP schon.

| Tier | Kette s/Barren | Forge-Anteil an Gesamtzeit | Smithing-XP/h Kette min-max | Faktor | bestes Item | schlechtestes Item |
|---|---|---|---|---|---|---|
| copper | 5.6 | 24-38 % | 3 316-3 767 | 1.14 | dagger (1 B) | scimitar (2 B) |
| bronze | 9.0 | 18-36 % | 3 273-4 114 | 1.26 | mace (1 B) | platebody (5 B) |
| iron | 6.8 | 21-42 % | 5 318-6 102 | 1.15 | medhelm (1 B) | chainbody (4 B) |
| steel | 12.3 | 16-36 % | 6 955-8 462 | 1.22 | warblade (3 B) | platebody (5 B) |
| gravesteel | 13.5 | 16-30 % | 7 551-9 146 | 1.21 | gravemark (2 B) | warplate (5 B) |
| blacksteel | 26.7 | 9-23 % | 9 250-11 101 | 1.20 | dagger (1 B) | platebody (5 B) |
| mithril | 24.9 | 9-24 % | 10 865-14 991 | 1.38 | dagger (1 B) | platebody (5 B) |
| adamantium | 31.1 | 9-22 % | 16 659-22 983 | 1.38 | dagger (1 B) | platebody (5 B) |
| runite | 32.1 | 9-23 % | 28 109-39 301 | 1.40 | murkvein_longsword (2 B) | platebody (5 B) |
| bloodiron | 39.8 | 9-22 % | 42 837-59 031 | 1.38 | dagger (1 B) | platebody (5 B) |
| titanium | 41.9 | 9-22 % | 71 328-98 249 | 1.38 | dagger (1 B) | platebody (5 B) |
| aetherium | 48.5 | 9-21 % | 111 892-154 244 | 1.38 | dagger (1 B) | platebody (5 B) |
| godiron | 52.0 | 8-22 % | 177 430-235 484 | 1.33 | battleaxe (2 B) | platebody (6 B) |

Zwei Befunde: (1) Ab Blacksteel macht der Forge-Schritt nur noch 8 bis 24 % der Gesamtzeit aus, die Kette (Erz + Kohle + Schmelzen) dominiert. (2) Weil Forge-XP an Forge-Sekunden hängt und Mining-Sekunden keine Smithing-XP bringen, ist das Item mit den MEISTEN Forge-Sekunden pro Barren (der Dolch) in der Kette das beste, das Platebody das schlechteste. Der Chef hat also auch in der Kettenrechnung recht: das Platebody ist je Zeit 20 bis 40 % schlechter.

### 1.5 Blacksteel im Detail (Ist)

| Item | L | Barren | Dauer s | XP | XP/Barren | XP/h Forge | Kette s/Item | Smithing-XP/h Kette |
|---|---|---|---|---|---|---|---|---|
| dagger | 30 | 1 | 8 | 51 | 51.0 | 22 950 | 35 | 11 101 |
| medhelm | 30 | 1 | 8 | 51 | 51.0 | 22 950 | 35 | 11 101 |
| gauntlets | 30 | 1 | 7 | 45 | 45.0 | 23 143 | 34 | 10 789 |
| sabatons | 30 | 1 | 7 | 45 | 45.0 | 23 143 | 34 | 10 789 |
| sword | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 10 572 |
| scimitar | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 10 572 |
| mace | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 10 572 |
| axe | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 10 572 |
| battleaxe | 31 | 2 | 13.5 | 91 | 45.5 | 24 267 | 67 | 10 924 |
| spear | 31 | 2 | 13.5 | 91 | 45.5 | 24 267 | 67 | 10 924 |
| fullhelm | 31 | 2 | 8 | 54 | 27.0 | 24 300 | 61 | 9 733 |
| kiteshield | 31 | 2 | 11 | 74 | 37.0 | 24 218 | 64 | 10 398 |
| platelegs | 31 | 3 | 11 | 74 | 24.7 | 24 218 | 91 | 9 563 |
| towershield | 31 | 3 | 11 | 74 | 24.7 | 24 218 | 91 | 9 563 |
| greataxe | 32 | 3 | 17 | 120 | 40.0 | 25 412 | 97 | 10 678 |
| greatsword | 32 | 3 | 17 | 120 | 40.0 | 25 412 | 97 | 10 678 |
| **maul** | 32 | 3 | 17 | **120** | 40.0 | 25 412 | 97 | 10 678 |
| chainbody | 31 | 4 | 13 | 87 | 21.8 | 24 092 | 120 | 9 346 |
| **platebody** | 32 | 5 | 14 | **99** | 19.8 | 25 457 | 147 | 9 250 |

Die Maul/Platebody-Anomalie ist reine Dauer-Herkunft: der Maul bekam in `smithing-stats-spec.md` 17 s („schwer, träge, aIMs +1500"), das Platebody 14 s. Beide liegen exakt auf der Kurve (25 412 bzw. 25 457 XP/h, Ziel(32) = 25 300). Vollständige Liste aller 247 Forge-Aktionen: Anhang A1.

---

## 2. Bewusstes Prinzip oder Artefakt? Die Fundstellen

| Datum | Dokument / Stelle | Aussage | Bedeutung für die Frage |
|---|---|---|---|
| 2026-06-23 | `design/balance-report.md` §1.3, §2 | `ziel_xph(L) = 90·sqrt(xpForLevel(L+1) − xpForLevel(L))`; „Es zählt nur das Verhältnis `xp / durationMs`. Empfehlung: `durationMs` weitgehend lassen (Pacing/Animation-Gefühl), `xp` absenken." §2.3 nimmt Smithing als Leitfaden, listet aber nur Smelts. | Geburtsstunde der Dauer-Kopplung. Inputs kommen nicht vor. |
| 2026-06-23 | `design/balance-skilling-xp.md` §4.1 | gleiche Formel, C=150, Mindest-XP `max(2, ceil(durationMs/2500))` | Dauer als einzige zweite Variable bestätigt. |
| 2026-06-24 | `design/skilling-xp-retune.md` §3, §4 | „Smelting/Feeder-Aktionen geben dieselbe XP/h wie ein Forge desselben Levels: fair, weil die XP/h nur am Level hängt, nicht an der Dauer." Ziel: keine Exploit-Bahn zwischen Highest-Level-Lane und Greedy-XP/h-Lane. | Das GEWOLLTE Prinzip: jede Aktion eines Levels gleich schnell. Material explizit nicht Teil der Überlegung. |
| 2026-06-25 | `design/smithing-stats-spec.md` §3, §4.10, §4.13, §5 | „forge-xp … jedes Item skaliert ≈ Sword-xp × (Bar-Zahl / 2) × leichte Lvl-Korrektur. `durationMs` skaliert mit Bar-Zahl/Schwere." Tabelle „xp pro Bar": Blacksteel 14. Maul 17 000 ms / 42 XP, Platebody 14 000 ms / 70 XP (beide 14 XP/Barren). | Hier WAR die XP an Barren gekoppelt. Aber die Dauern der Spec waren selbst nicht barren-proportional (Maul 5.7 s/Barren, Platebody 2.8 s/Barren), weil „Schwere" mitspielte. |
| 2026-06-2x | `design/smithing-tier-items.md` Z. 141 | „Smithing-XP skaliert mit Tier … proportional zu Bar-Zahl × Tier-Faktor." | Zweite Stelle, die XP ∝ Barren als Regel nennt. |
| 2026-07-05 | `design/xp-economy-retune-spec.md` (Task #232) §0, §3.2, §8, §9 | `xp = max(1, round(600·sqrt(step(L)) · durationMs / 3 600 000))` für ALLE 496 Aktionen; „`durationMs`, `levelRequired`, `loot`, `inputs` unverändert lassen"; „Höheres Level ⇒ höhere target_xph ⇒ höhere XP/h, unabhängig von der Dauer ⇒ Monotonie fällt praktisch gratis ab." | Der Pass, der die Barren-Kopplung überschrieben hat. Inputs sind ausdrücklich keine Variable der Formel. Der Zielkonflikt XP/Zeit vs. XP/Material wird nirgends erwähnt. |
| live | `packages/content/src/index.ts` Kommentare Z. 6865, 7394, 7530, 9135, 10088, 11070, 11151 | „XP via Formel: target_xph(L)=…·√(…); xp=round(xph·ms/3_600_000), min 1" (teils noch mit 90 statt 600 notiert) | Content-dev hat die Formel als Regel übernommen, für alle Verarbeitungs-Skills. |
| live | Messung §1.3, Anhang A2 | XP/h ÷ Ziel: Median 1.00 in allen Tiers | Bestätigung, dass #232 vollständig angewendet ist. |

**Urteil:** Die Dauer-Kopplung ist ein bewusstes, dreifach dokumentiertes Prinzip für die XP/h-Kurve (jede Aktion eines Levels gleich schnell, keine Exploit-Bahn). Die daraus folgende Streuung von XP pro Barren war nie eine Entscheidung: die einzige Spec, die XP pro Barren behandelt (25.06.), wurde zehn Tage später von einer Formel überschrieben, die Inputs nicht kennt. Kein Dokument nach dem 25.06. enthält die Worte „XP pro Barren". Der Chef sieht also ein Artefakt, das aus zwei je für sich vernünftigen Regeln entstanden ist.

---

## 3. Gegenprobe Nachbar-Skills

Im Content gibt es keinen Skill „fletching" und keinen Skill „crafting". Fletching lebt als Aktionsfamilie `fletch_*` (Kategorien `bow_*`, `shield_wood`, `rod_wood`) innerhalb von `leatherworking`.

| Skill | n (mit Inputs) | XP/h ÷ Ziel: Median (P10 / P90) | XP/Input-Faktor auf gleicher Stufe (max) | Beispielpaar |
|---|---|---|---|---|
| smithing (Forge) | 247 | 1.00 (1.00 / 1.01) | 2.58 (Blacksteel) | dagger 1 Barren, 8 s, 51 XP vs. platebody 5 Barren, 14 s, 99 XP |
| leatherworking (inkl. Fletching) | 172 | 1.00 (0.98 / 1.02) | 14.9 | L75: `craft_slayer_vambraces` 16 Inputs, 15 s, 887 XP vs. `tan_wyvern_scale` 1 Input, 14 s, 828 XP |
| cooking | 46 | 1.00 (0.98 / 1.03) | 2.4 | L48: `cook_duskfin_rangers_stew` 4 Inputs, 10 s, 156 XP vs. `cook_bear_shank` 1 Input, 6 s, 93 XP |
| runecrafting | 102 | 1.00 (0.99 / 1.01) | 6.0 | L99: `enchant_godiron_focus` 6 Inputs, 9.5 s, 1 844 XP vs. `craft_godiron_focus` 2 Inputs, 19 s, 3 688 XP |
| jewelcrafting | 36 | 1.00 (0.98 / 1.01) | 2.75 | L70: `craft_void_anchor` 5 Inputs, 10 s, 462 XP vs. `cut_onyx` 1 Input, 5.5 s, 254 XP |
| herblore | 43 | 1.00 (0.99 / 1.01) | 1.33 | L94: `brew_panacea_elixir` 4 Inputs, 18 s, 2 728 XP vs. `brew_grave_lily_elixir` 3 Inputs, 18 s, 2 728 XP |

Gleiche Dauer, gleiche Stufe, verschiedene Materialmenge, identische XP (Beispiele): `fletch_adamantium_shortbow` (6 Inputs, 9 s, 155 XP) vs. `reinforce_studded_leather` (3 Inputs, 9 s, 155 XP); `fletch_aetherium_shortbow` (7 Inputs, 13 s, 1 616 XP) vs. `craft_wraithhide_helm` (5 Inputs, 13 s, 1 616 XP); `craft_copper_wand` (8 Inputs, 4.5 s, 7 XP) vs. `craft_copper_focus` (2 Inputs, 4.5 s, 7 XP).

**Fazit §3:** Das Muster ist spielweit, nicht Smithing-spezifisch. Eine Änderung nur bei Smithing ist vertretbar (dort ist das Material am sichtbarsten: eine Sorte, kleine ganze Zahlen, Genre-Erwartung), sollte aber als Präzedenz bewusst benannt werden. Bei Leatherworking/Runecrafting sind Inputs gemischt (Leder + Runen + Essenzen), eine Material-Kopplung wäre dort weniger eindeutig zu definieren.

---

## 4. Drei Optionen mit Zahlen

Notation je Tier t: `L_t` = Basis-Level der Forge-Aktionen, `T(L)` = Ziel-XP/h (C=600), `b_i` = Barren des Items, `d_i` = Ist-Dauer in s, `s̄_t = Σd_i / Σb_i` = mittlere Forge-Sekunden pro Barren im Tier, `v_t = T(L_t) · s̄_t / 3600` = Tier-Wert eines Barrens in XP. Basis: reine Barren-Rezepte der 12 Haupt-Tiers (236 Aktionen). Gravesteel/Void/Slayer (Sonder-Inputs) bleiben außen vor. Smelts bleiben in allen Optionen unverändert (1 Barren, auf Kurve).

| Option | Regel | Was sich ändert |
|---|---|---|
| **A: XP an Barren** | `xp_i = round(v_t · b_i)`, Dauer bleibt | nur `xp` (236 Werte) |
| **B: Dauer an Barren** | `d_i' = b_i · s̄_t` (auf 500 ms gerundet), `xp_i = round(T(L_i) · d_i' / 3600)` | `durationMs` (215 Werte) und `xp` (236 Werte) |
| **C: Hybrid** | `xp_i = round(½ · T(L_i) · d_i / 3600 + ½ · v_t · b_i)`, Dauer bleibt | nur `xp` (236 Werte) |

### 4.1 Wirkung auf die XP/h-Kurve und auf XP pro Barren, je Tier

| Tier | L_t | Ziel XP/h | s̄_t | v_t | Ist XP/h ÷ Ziel | A: XP/h ÷ Ziel (bestes Item) | B | C | Ist XP/Barren | A | B | C |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| copper | 1 | 5 466 | 2.27 | 3.5 | 0.94-1.12 | 0.56-1.15 (scimitar) | 0.98-1.05 | 0.75-1.07 | 3.0-5.0 | 3.5 | 3.5-4.0 | 3.0-4.0 |
| bronze | 5 | 6 681 | 2.85 | 5.3 | 0.98-1.08 | 0.54-1.27 (platebody) | 0.98-1.08 | 0.75-1.12 | 4.0-10.0 | 5.3 | 5.0-6.0 | 4.6-7.0 |
| iron | 10 | 8 570 | 2.93 | 7.0 | 0.97-1.05 | 0.59-1.48 (platebody) | 0.98-1.02 | 0.76-1.23 | 4.8-12.0 | 7.0 | 7.0-8.0 | 5.8-9.0 |
| steel | 20 | 14 046 | 4.61 | 18.0 | 0.98-1.01 | 0.66-1.74 (platebody) | 0.99-1.03 | 0.84-1.37 | 10.4-27.0 | 18.0 | 17.5-21.0 | 14.2-23.0 |
| blacksteel | 30 | 23 004 | 5.18 | 33.1 | 1.00-1.01 | 0.65-1.68 (platebody) | 1.00-1.01 | 0.82-1.34 | 19.8-51.0 | 33.1 | 32.0-36.6 | 26.4-42.0 |
| mithril | 40 | 37 695 | 5.12 | 53.6 | 1.00-1.00 | 0.64-1.78 (platebody) | 0.99-1.00 | 0.82-1.39 | 30.0-84.0 | 53.6 | 52.0-59.7 | 41.8-69.0 |
| adamantium | 50 | 61 809 | 5.82 | 99.9 | 1.00-1.00 | 0.65-1.76 (platebody) | 1.00-1.00 | 0.82-1.38 | 56.8-155.0 | 99.9 | 98.5-110.7 | 78.4-127.0 |
| runite | 60 | 101 373 | 6.69 | 188.3 | 1.00-1.00 | 0.67-1.78 (platebody) | 1.00-1.00 | 0.83-1.39 | 105.8-282.0 | 188.3 | 183.0-208.2 | 147.0-235.0 |
| bloodiron | 70 | 166 296 | 7.25 | 334.9 | 1.00-1.00 | 0.66-1.73 (platebody) | 1.00-1.00 | 0.83-1.36 | 193.8-508.0 | 334.9 | 335.0-374.0 | 264.4-422.0 |
| titanium | 80 | 272 819 | 7.95 | 602.8 | 1.00-1.00 | 0.66-1.72 (platebody) | 1.00-1.00 | 0.83-1.36 | 351.4-909.0 | 602.8 | 606.0-669.4 | 477.2-756.0 |
| aetherium | 90 | 447 593 | 8.66 | 1 076.6 | 1.00-1.00 | 0.67-1.70 (platebody) | 1.00-1.00 | 0.83-1.35 | 631.4-1616.0 | 1 076.6 | 1 057.0-1 194.2 | 854.0-1 346.0 |
| godiron | 95 | 573 312 | 9.87 | 1 571.3 | 1.00-1.00 | 0.66-1.80 (platebody) | 1.00-1.00 | 0.83-1.40 | 873.7-2 389.0 | 1 571.3 | 1 552.5-1 909.0 | 1 222.5-1 980.0 |

Lesart B: die Restspanne bei XP/Barren (z. B. 32.0 bis 36.6) kommt ausschließlich aus den Level-Offsets (+1/+2 der schweren Items bringen ein etwas höheres Ziel). Das ist gewollt: ein L32-Item darf etwas mehr pro Barren geben als ein L30-Item.

### 4.2 Wirkung auf die Material-Ökonomie: Barren pro Tier-Schritt

Barren, die ein Spieler für den Sprung zum nächsten Tier-Level verschmieden muss (inkl. Smelt-XP je Barren, nur Smelt + Forge). „Ist" hat drei Antworten, weil es vom Item abhängt.

| Tier | Schritt | ΔXP | Ist: sparsamstes Item | Ist: teuerstes Item | Ist: schnellstes Item | A | B | C | h reines Schmieden | h volle Kette (selbst gemined) |
|---|---|---|---|---|---|---|---|---|---|---|
| copper | 1→5 | 388 | 43 (dagger) | 55 (scimitar) | 49 (axe) | 52 | 49-52 | 49-55 | 0.1 | 0.1 |
| bronze | 5→10 | 766 | 48 (mace) | 77 (platebody) | 55 (dagger) | 68 | 64-70 | 59-72 | 0.1 | 0.2 |
| iron | 10→20 | 3 316 | 166 (medhelm) | 259 (platebody) | 184 (gauntlets) | 222 | 207-221 | 195-240 | 0.4 | 0.5 |
| steel | 20→30 | 8 893 | 198 (medhelm) | 313 (platebody) | 274 (fullhelm) | 247 | 228-251 | 217-276 | 0.6 | 1.1 |
| blacksteel | 30→40 | 23 861 | 223 (dagger) | 315 (platebody) | 236 (gauntlets) | 268 | 258-271 | 243-290 | 1.0 | 2.1 |
| mithril | 40→50 | 64 109 | 468 (dagger) | 772 (platebody) | 468 (dagger) | 601 | 569-611 | 525-676 | 1.7 | 4.3 |
| adamantium | 50→60 | 172 409 | 673 (dagger) | 1 093 (platebody) | 673 (dagger) | 858 | 815-864 | 756-961 | 2.8 | 7.5 |
| runite | 60→70 | 463 885 | 989 (dagger) | 1 584 (platebody) | 989 (dagger) | 1 236 | 1 174-1 254 | 1 099-1 389 | 4.6 | 12.1 |
| bloodiron | 70→80 | 1 248 441 | 1 499 (dagger) | 2 406 (platebody) | 1 659 (sword) | 1 892 | 1 786-1 892 | 1 671-2 118 | 7.5 | 21.1 |
| titanium | 80→90 | 3 360 264 | 2 284 (dagger) | 3 679 (platebody) | 3 231 (fullhelm) | 2 885 | 2 729-2 877 | 2 550-3 234 | 12.3 | 34.2 |
| aetherium | 90→99 | 7 688 099 | 2 918 (dagger) | 4 658 (platebody) | 4 115 (platelegs) | 3 669 | 3 474-3 703 | 3 251-4 105 | 17.2 | 49.8 |
| godiron | 95→99 | 4 262 873 | 991 (dagger) | 1 531 (platebody) | 1 029 (gauntlets) | 1 224 | 1 116-1 231 | 1 096-1 360 | 7.4 | 18.1 |

Heute ist die materialsparsamste Bahn (Dolche) zugleich die schnellste oder gleich schnell: der Spieler, der es „richtig" macht, schmiedet nur Dolche und Handschuhe. Unter A und B gibt es diese Bahn nicht mehr, alle Items kosten dasselbe pro Level.

### 4.3 Option B: was sich an den Dauern ändert

| Tier | s̄_t | Dauer neu ÷ alt min-max | Σ Dauer Vollset s alt → neu | Aktionen mit Dauer-Änderung | 1-Barren-Item s | 5/6-Barren-Item s |
|---|---|---|---|---|---|---|
| copper | 2.27 | 0.71-1.28 | 96 → 98 | 5/19 | 3 → 2.5 | 9 → 11.5 |
| bronze | 2.85 | 0.60-1.40 | 123 → 122 | 7/19 | 4 → 3 | 10 → 14 |
| iron | 2.93 | 0.60-1.61 | 141 → 143 | 11/21 | 4.5 → 3 | 9 → 14.5 |
| steel | 4.61 | 0.64-1.92 | 235 → 234 | 21/22 | 6 → 4.5 | 12 → 23 |
| blacksteel | 5.18 | 0.63-1.86 | 228 → 228 | 18/19 | 8 → 5 | 14 → 26 |
| mithril | 5.12 | 0.63-1.96 | 236 → 234 | 20/20 | 8 → 5 | 13 → 25.5 |
| adamantium | 5.82 | 0.67-1.93 | 256 → 256 | 19/19 | 9 → 6 | 15 → 29 |
| runite | 6.69 | 0.65-1.97 | 321 → 322 | 20/21 | 10 → 6.5 | 17 → 33.5 |
| bloodiron | 7.25 | 0.68-1.92 | 319 → 322 | 18/19 | 11 → 7.5 | 19 → 36.5 |
| titanium | 7.95 | 0.67-1.90 | 350 → 352 | 18/19 | 12 → 8 | 21 → 40 |
| aetherium | 8.66 | 0.65-1.89 | 381 → 382 | 18/19 | 13 → 8.5 | 23 → 43.5 |
| godiron | 9.87 | 0.67-2.19 | 444 → 442 | 18/19 | 15 → 10 | 27 → 59 |

Die Gesamtdauer eines kompletten Sets bleibt je Tier identisch (Konstruktion). Leichte Items werden 30 bis 40 % schneller, Platebody/Chainbody 1.9 bis 2.2× langsamer.

### 4.4 Blacksteel unter allen drei Optionen

| Item | L | Barren | Ist s | Ist XP | Ist XP/B | Ist XP/h | A XP | A XP/h | B s | B XP | B XP/B | B XP/h | C XP | C XP/B | C XP/h | Kette Ist | Kette A | Kette B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| dagger | 30 | 1 | 8 | 51 | 51.0 | 22 950 | 33 | 14 850 | 5 | 32 | 32.0 | 23 040 | 42 | 42.0 | 18 900 | 11 101 | 9 233 | 9 994 |
| medhelm | 30 | 1 | 8 | 51 | 51.0 | 22 950 | 33 | 14 850 | 5 | 32 | 32.0 | 23 040 | 42 | 42.0 | 18 900 | 11 101 | 9 233 | 9 994 |
| gauntlets | 30 | 1 | 7 | 45 | 45.0 | 23 143 | 33 | 16 971 | 5 | 32 | 32.0 | 23 040 | 39 | 39.0 | 20 057 | 10 789 | 9 507 | 9 994 |
| sabatons | 30 | 1 | 7 | 45 | 45.0 | 23 143 | 33 | 16 971 | 5 | 32 | 32.0 | 23 040 | 39 | 39.0 | 20 057 | 10 789 | 9 507 | 9 994 |
| sword | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 18 277 | 10.5 | 67 | 33.5 | 22 971 | 75 | 37.5 | 20 769 | 10 572 | 9 651 | 10 085 |
| scimitar | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 18 277 | 10.5 | 67 | 33.5 | 22 971 | 75 | 37.5 | 20 769 | 10 572 | 9 651 | 10 085 |
| mace | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 18 277 | 10.5 | 67 | 33.5 | 22 971 | 75 | 37.5 | 20 769 | 10 572 | 9 651 | 10 085 |
| axe | 30 | 2 | 13 | 83 | 41.5 | 22 985 | 66 | 18 277 | 10.5 | 67 | 33.5 | 22 971 | 75 | 37.5 | 20 769 | 10 572 | 9 651 | 10 085 |
| battleaxe | 31 | 2 | 13.5 | 91 | 45.5 | 24 267 | 66 | 17 600 | 10.5 | 71 | 35.5 | 24 343 | 78 | 39.0 | 20 800 | 10 924 | 9 578 | 10 310 |
| spear | 31 | 2 | 13.5 | 91 | 45.5 | 24 267 | 66 | 17 600 | 10.5 | 71 | 35.5 | 24 343 | 78 | 39.0 | 20 800 | 10 924 | 9 578 | 10 310 |
| fullhelm | 31 | 2 | 8 | 54 | 27.0 | 24 300 | 66 | 29 700 | 10.5 | 71 | 35.5 | 24 343 | 60 | 30.0 | 27 000 | 9 733 | 10 436 | 10 310 |
| kiteshield | 31 | 2 | 11 | 74 | 37.0 | 24 218 | 66 | 21 600 | 10.5 | 71 | 35.5 | 24 343 | 70 | 35.0 | 22 909 | 10 398 | 9 950 | 10 310 |
| platelegs | 31 | 3 | 11 | 74 | 24.7 | 24 218 | 99 | 32 400 | 15.5 | 104 | 34.7 | 24 155 | 87 | 29.0 | 28 473 | 9 563 | 10 551 | 10 243 |
| towershield | 31 | 3 | 11 | 74 | 24.7 | 24 218 | 99 | 32 400 | 15.5 | 104 | 34.7 | 24 155 | 87 | 29.0 | 28 473 | 9 563 | 10 551 | 10 243 |
| greataxe | 32 | 3 | 17 | 120 | 40.0 | 25 412 | 99 | 20 965 | 15.5 | 109 | 36.3 | 25 316 | 110 | 36.7 | 23 294 | 10 678 | 9 899 | 10 431 |
| greatsword | 32 | 3 | 17 | 120 | 40.0 | 25 412 | 99 | 20 965 | 15.5 | 109 | 36.3 | 25 316 | 110 | 36.7 | 23 294 | 10 678 | 9 899 | 10 431 |
| **maul** | 32 | 3 | 17 | 120 | 40.0 | 25 412 | 99 | 20 965 | 15.5 | 109 | 36.3 | 25 316 | 110 | 36.7 | 23 294 | 10 678 | 9 899 | 10 431 |
| chainbody | 31 | 4 | 13 | 87 | 21.8 | 24 092 | 132 | 36 554 | 20.5 | 138 | 34.5 | 24 234 | 110 | 27.5 | 30 462 | 9 346 | 10 698 | 10 237 |
| **platebody** | 32 | 5 | 14 | 99 | 19.8 | 25 457 | 166 | 42 686 | 26 | 183 | 36.6 | 25 338 | 132 | 26.4 | 33 943 | 9 250 | 10 885 | 10 450 |

„Kette" = Smithing-XP pro Gesamtstunde inkl. Erz und Schmelzen (§1.4). Unter B ist auch die Kette item-unabhängig (9 994 bis 10 450, Faktor 1.05 statt 1.20).

### 4.5 Bewertung

| Kriterium | A: XP an Barren | B: Dauer an Barren | C: Hybrid |
|---|---|---|---|
| XP/h-Kurve (optimales Spiel) | **kippt**: Platebody-Bahn 1.7 bis 1.8× Ziel in jedem Tier (Blacksteel 42 686 statt 23 004). Zeit bis 99 sinkt von ~45 h auf ~26 h. Gegenmittel wäre v_t am Platebody zu verankern, dann liegen alle anderen Items bei 0.35 bis 0.6× Ziel, das ist ein fühlbarer Nerf gegenüber heute. | **bleibt exakt** (0.98 bis 1.05, Rest = Rundung auf 500 ms) | halb gekippt: 0.82 bis 1.40× Ziel, Platebody-Bahn +34 bis +40 % |
| XP pro Barren | konstant je Tier | konstant je Tier (±7 % aus Level-Offsets) | Faktor 1.6 statt 2.6, weiter item-abhängig |
| Material pro Level-Schritt | item-unabhängig (Blacksteel 268) | item-unabhängig (258-271) | 243-290 |
| Exploit-Bahn | ja: Barren aus Drops (`iron_bar`, `steel_bar`, `runite_bar`, `godiron_bar`) und aus dem Lager-Schmelzofen (60/h ohne XP) landen in der 1.7×-Platebody-Bahn | keine | abgeschwächt |
| Selbst-Miner (volle Kette) | fast neutral (Faktor 1.18 statt 1.20), weil die Kette dominiert | neutral (1.05) | neutral (1.10) |
| Eingriff | 236 `xp`-Werte | 215 `durationMs` + 236 `xp` | 236 `xp` |
| Was der Spieler „richtig" findet | Genre-Erwartung (OSRS/Melvor: XP pro Barren fix, Platebody = Trainings-Item). Aber Idle-Spieler merken die 1.7×-Bahn sofort, die Kurve ist dann faktisch eine andere. | „Ein Platebody dauert fünfmal so lang wie ein Dolch": intuitiv und stimmig. XP pro Barren fix, XP pro Stunde fix, kein Grübeln, welches Item man schmieden soll. Einzige Reibung: schwere Items sind sichtbar träger (Godiron-Platebody 59 s). | am schwersten zu erklären: XP hängt „halb an der Zeit, halb am Material", beide Zahlen bleiben krumm |
| Konsistenz mit den Nachbar-Skills | Bruch des spielweiten Prinzips „XP/h = f(Level)" nur für Smithing | Prinzip bleibt spielweit intakt, Smithing bekommt lediglich saubere Dauern | Bruch, aber halb |

**Empfehlung: Option B.** Sie ist die einzige, die beide Intuitionen gleichzeitig erfüllt (XP ∝ Barren UND XP/h auf Zielkurve) und dabei das dokumentierte Prinzip aus `skilling-xp-retune.md` §4 (keine Exploit-Bahn) nicht antastet. Sie behebt nebenbei die Wurzel der Maul/Platebody-Anomalie (die „Schwere"-Dauern der alten Spec) statt sie über XP zu kaschieren, und sie neutralisiert Drop-Barren und Schmelzofen-Barren als XP-Abkürzung. Der Preis (schwere Items sind träger) ist thematisch stimmig und in einem Idle-Spiel unkritisch; die Summe der Dauern je Set bleibt gleich.

Falls der Chef lieber gar keine Dauern anfassen will, ist C der kleinste Kompromiss, aber ich rate davon ab: er hinterlässt zwei krumme Kennzahlen statt einer geraden.

### 4.6 Apply-Reihenfolge für content-dev (bei B)

1. Für jede Forge-Aktion der 12 Haupt-Tiers (reine Barren-Rezepte, 236 Aktionen): `durationMs = round_500ms(bars × s̄_t × 1000)` mit `s̄_t` aus §4.3, danach `xp = max(1, round(600 · sqrt(xpForLevel(L+1) − xpForLevel(L)) · durationMs / 3 600 000))`. Vollständige Werte: **Anhang A3** (verbatim anwendbar).
2. Smelts, Gravesteel (`crude_bone`-Rezepte), `forge_void_sickle`, `slayer_requirements`-Rezepte: unverändert.
3. Content-Kommentare „target_xph(L)=90·√…" bei Gelegenheit auf 600 korrigieren (rein kosmetisch, betrifft die Zeilen aus §2).
4. `pnpm test` mit geleertem Turbo-Cache; Balance-Report-Block gegenlesen (Smithing-Ø-XP/h soll unverändert bleiben).
5. Doku nachziehen: `xp-economy-retune-spec.md` §9 Smithing-Tabelle und `smithing-stats-spec.md` §3/§4 (dur/xp-Spalten) sind danach historisch.

---

## 5. Welche Guards und Pins bei einer Umsetzung betroffen wären (nur benannt)

| Test / Guard | Was er pinnt | A | B | C |
|---|---|---|---|---|
| `sim.test.ts` „druckt den Balance-Report + Auffälligkeiten" | Druckt XP/h je Aktion und Ø je Skill; `findIssues` flaggt nur `xpPerHour <= 0` und fehlende Outputs; harter Assert nur `wallsSkill` (Kampf) | kein Bruch; Ø-Smithing-XP/h im Report sinkt um ~7 % (Mittel über alle Items 0.93× Ziel, weil leichte Items überwiegen), das Maximum (Platebody) steigt auf 1.7 bis 1.8× | kein Bruch, Report unverändert bis auf Rundung | kein Bruch, Ø praktisch unverändert (0.97×), Maximum 1.35 bis 1.40× |
| `balance-envelope.test.ts`, `balance-envelope-helpers.ts` | Charaktere über `xpForLevel`, `ring_master_smithing` als Perk-Träger; keine Aktions-XP-Pins | kein Bruch | kein Bruch | kein Bruch |
| `content-integrity.test.ts` „Material-Parität der drei Stile" G1 bis G3 (aus `magier-material-parity-audit.md` §5) | Kampf-Gates von Materialketten und Sprossen-Lücken je Stil, rein über Items/Monster/Level; weder `xp` noch `durationMs` | kein Bruch | kein Bruch | kein Bruch |
| G4 (weich, im Balance-Report) | CL-Fortschritt melee/ranged/magic nebeneinander (Kampf) | nicht betroffen | nicht betroffen | nicht betroffen |
| `sim-realistic.test.ts` | Seed 8: `obtainItem(steel_platebody)` in < 3 Sim-h; Seed 41: `gravesteel_blade` in < 10 Sim-h; Seed 1337: Smithing-20-Ziel bekommt XP > 0 | kein Bruch | **prüfen**: `forge_steel_platebody` 12 s → 23 s; Budget 3 h hat viel Luft, aber seeded Läufe können kippen | kein Bruch |
| `sim-consistency.test.ts` `checkTierLadderMonotony` | Item-Stats-Leitern, gepinnte Baseline-Brüche | kein Bruch | kein Bruch | kein Bruch |
| `action-duration.test.ts` | Lager-Werkhof −9 % relativ zu `action.durationMs` (keine Absolutwerte) | kein Bruch | kein Bruch | kein Bruch |
| `processing.test.ts`, `action-queue.test.ts`, `action-target.test.ts`, `priority-insert.test.ts`, `queue-block.test.ts`, `discovery.test.ts` | nutzen `smelt_bronze`/`smelt_copper` (3 s, 1+1 Erz → 1 Barren) als Fixture | kein Bruch (Smelts unverändert) | kein Bruch (Smelts unverändert) | kein Bruch |
| `refine.test.ts` | Lager-Schmelzofen: Smelt-Präfix-Filter, 60/h, KEINE XP | kein Bruch | kein Bruch | kein Bruch |
| `smithing.test.ts` | Kategorien, `levelRequired ≥ 1`, Kohle in Legierungen, Barren-Items existieren | kein Bruch | kein Bruch | kein Bruch |
| Mastery (`tick.ts:193` `mastery.xp += action.xp`) | kein Test-Pin, aber Mastery-Tempo je Item folgt der Aktions-XP | Mastery pro Platebody +68 %, pro Dolch −35 % | Mastery pro Item ∝ Dauer wie heute | dazwischen |
| Persistenz / `SAVE_VERSION` | Aktions-XP und -Dauer sind Content, nicht Save-State | keine Migration | keine Migration; eine beim Speichern laufende Forge-Aktion läuft mit neuer Dauer weiter (harmlos) | keine Migration |

Kurz: kein harter Guard pinnt Smithing-XP oder Forge-Dauern. Einziger Prüfpunkt bei B sind die drei seeded `sim-realistic`-Läufe; alles andere ist Report-Kosmetik.

---

## 6. Fazit für den Chef (5 Zeilen)

1. Du hast recht: Forge-XP hängt nur an Level × Dauer, Barren zählen nicht. XP pro Barren streut in jedem Tier um Faktor 2.5 bis 2.8, Maul 40 XP/Barren, Platebody 19.8.
2. Die Dauer-Kopplung ist ein dokumentiertes Prinzip für die XP/h-Kurve (jede Aktion eines Levels gleich schnell). Die Barren-Entkopplung war nie eine Entscheidung: die Spec vom 25.06. hatte XP ∝ Barren, Task #232 vom 05.07. hat sie mit einer Formel ohne Inputs überschrieben.
3. Cooking, Leatherworking/Fletching, Runecrafting, Jewelcrafting, Herblore folgen exakt derselben Regel; Smithing ist nur der sichtbarste Fall.
4. Empfehlung Option B: Forge-Dauer = Barren × Tier-Sekunden (Blacksteel 5.18 s/Barren), XP weiter aus der Formel. Dann gilt beides: ~33 XP pro Blacksteel-Barren bei jedem Item UND XP/h exakt auf Kurve; Platebody dauert 26 s statt 14, Dolch 5 s statt 8. Option A (nur XP anheben) kippt die Kurve um +70 bis +80 % auf der Platebody-Bahn.
5. Kein harter Test pinnt Smithing-XP oder Forge-Dauern; bei B sind nur drei seeded `sim-realistic`-Läufe gegenzuprüfen. Apply-Liste für content-dev liegt in Anhang A3.

---

## Anhang

Zahlen mit Dezimalpunkt (wie im Content). „Kette" = Erz + Kohle + Schmelzen + Schmieden, Smithing-XP pro Gesamtstunde ohne Mining-XP.

### A1: Alle 247 Forge-Aktionen (Ist-Stand)
| id | Tier | L | Barren | Sonst. | Dauer s | XP | XP/Barren | XP/s | XP/h | Ziel XP/h | :Ziel | Kette s/Item | Kette Smithing-XP/h |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| copper_dagger | copper | 1 | 1 |  | 3.0 | 5 | 5.0 | 1.67 | 6000 | 5466 | 1.10 | 9 | 3767 |
| copper_sword | copper | 1 | 1 |  | 3.5 | 5 | 5.0 | 1.43 | 5143 | 5466 | 0.94 | 9 | 3560 |
| copper_mace | copper | 1 | 1 |  | 3.5 | 5 | 5.0 | 1.43 | 5143 | 5466 | 0.94 | 9 | 3560 |
| copper_medhelm | copper | 1 | 1 |  | 3.5 | 5 | 5.0 | 1.43 | 5143 | 5466 | 0.94 | 9 | 3560 |
| copper_gauntlets | copper | 1 | 1 |  | 3.0 | 5 | 5.0 | 1.67 | 6000 | 5466 | 1.10 | 9 | 3767 |
| copper_sabatons | copper | 1 | 1 |  | 3.0 | 5 | 5.0 | 1.67 | 6000 | 5466 | 1.10 | 9 | 3767 |
| copper_scimitar | copper | 1 | 2 |  | 4.0 | 6 | 3.0 | 1.50 | 5400 | 5466 | 0.99 | 15 | 3316 |
| copper_axe | copper | 2 | 2 |  | 4.5 | 8 | 4.0 | 1.78 | 6400 | 5724 | 1.12 | 16 | 3669 |
| copper_battleaxe | copper | 2 | 2 |  | 4.5 | 8 | 4.0 | 1.78 | 6400 | 5724 | 1.12 | 16 | 3669 |
| copper_spear | copper | 2 | 2 |  | 4.5 | 8 | 4.0 | 1.78 | 6400 | 5724 | 1.12 | 16 | 3669 |
| copper_fullhelm | copper | 2 | 2 |  | 4.5 | 8 | 4.0 | 1.78 | 6400 | 5724 | 1.12 | 16 | 3669 |
| copper_kiteshield | copper | 2 | 2 |  | 4.5 | 8 | 4.0 | 1.78 | 6400 | 5724 | 1.12 | 16 | 3669 |
| copper_towershield | copper | 2 | 3 |  | 6.5 | 11 | 3.7 | 1.69 | 6092 | 5724 | 1.06 | 23 | 3554 |
| copper_chainbody | copper | 2 | 4 |  | 8.0 | 14 | 3.5 | 1.75 | 6300 | 5724 | 1.10 | 30 | 3553 |
| copper_greataxe | copper | 3 | 3 |  | 6.5 | 12 | 4.0 | 1.85 | 6646 | 6060 | 1.10 | 23 | 3708 |
| copper_greatsword | copper | 3 | 3 |  | 6.5 | 12 | 4.0 | 1.85 | 6646 | 6060 | 1.10 | 23 | 3708 |
| copper_maul | copper | 3 | 3 |  | 6.5 | 12 | 4.0 | 1.85 | 6646 | 6060 | 1.10 | 23 | 3708 |
| copper_platelegs | copper | 3 | 3 |  | 6.5 | 12 | 4.0 | 1.85 | 6646 | 6060 | 1.10 | 23 | 3708 |
| copper_platebody | copper | 4 | 5 |  | 9.0 | 17 | 3.4 | 1.89 | 6800 | 6350 | 1.07 | 37 | 3600 |
| bronze_dagger | bronze | 5 | 1 |  | 4.0 | 8 | 8.0 | 2.00 | 7200 | 6681 | 1.08 | 13 | 3877 |
| bronze_mace | bronze | 5 | 1 |  | 5.0 | 10 | 10.0 | 2.00 | 7200 | 6681 | 1.08 | 14 | 4114 |
| bronze_medhelm | bronze | 5 | 1 |  | 5.0 | 10 | 10.0 | 2.00 | 7200 | 6681 | 1.08 | 14 | 4114 |
| bronze_gauntlets | bronze | 5 | 1 |  | 4.0 | 8 | 8.0 | 2.00 | 7200 | 6681 | 1.08 | 13 | 3877 |
| bronze_sabatons | bronze | 5 | 1 |  | 4.0 | 8 | 8.0 | 2.00 | 7200 | 6681 | 1.08 | 13 | 3877 |
| bronze_sword | bronze | 5 | 2 |  | 5.5 | 11 | 5.5 | 2.00 | 7200 | 6681 | 1.08 | 24 | 3523 |
| bronze_scimitar | bronze | 5 | 2 |  | 6.0 | 12 | 6.0 | 2.00 | 7200 | 6681 | 1.08 | 24 | 3600 |
| bronze_axe | bronze | 6 | 2 |  | 6.0 | 12 | 6.0 | 2.00 | 7200 | 7048 | 1.02 | 24 | 3600 |
| bronze_battleaxe | bronze | 6 | 2 |  | 6.0 | 12 | 6.0 | 2.00 | 7200 | 7048 | 1.02 | 24 | 3600 |
| bronze_spear | bronze | 6 | 2 |  | 6.0 | 12 | 6.0 | 2.00 | 7200 | 7048 | 1.02 | 24 | 3600 |
| bronze_fullhelm | bronze | 6 | 2 |  | 6.0 | 12 | 6.0 | 2.00 | 7200 | 7048 | 1.02 | 24 | 3600 |
| bronze_kiteshield | bronze | 6 | 2 |  | 6.0 | 12 | 6.0 | 2.00 | 7200 | 7048 | 1.02 | 24 | 3600 |
| bronze_platelegs | bronze | 6 | 3 |  | 8.0 | 16 | 5.3 | 2.00 | 7200 | 7048 | 1.02 | 35 | 3497 |
| bronze_towershield | bronze | 6 | 3 |  | 8.0 | 16 | 5.3 | 2.00 | 7200 | 7048 | 1.02 | 35 | 3497 |
| bronze_chainbody | bronze | 6 | 4 |  | 9.0 | 18 | 4.5 | 2.00 | 7200 | 7048 | 1.02 | 45 | 3360 |
| bronze_greataxe | bronze | 7 | 3 |  | 8.0 | 16 | 5.3 | 2.00 | 7200 | 7373 | 0.98 | 35 | 3497 |
| bronze_greatsword | bronze | 7 | 3 |  | 8.0 | 16 | 5.3 | 2.00 | 7200 | 7373 | 0.98 | 35 | 3497 |
| bronze_maul | bronze | 7 | 3 |  | 8.0 | 16 | 5.3 | 2.00 | 7200 | 7373 | 0.98 | 35 | 3497 |
| bronze_platebody | bronze | 7 | 5 |  | 10.0 | 20 | 4.0 | 2.00 | 7200 | 7373 | 0.98 | 55 | 3273 |
| iron_dagger | iron | 10 | 1 |  | 4.5 | 11 | 11.0 | 2.44 | 8800 | 8570 | 1.03 | 11 | 6053 |
| iron_medhelm | iron | 10 | 1 |  | 5.0 | 12 | 12.0 | 2.40 | 8640 | 8570 | 1.01 | 12 | 6102 |
| iron_gauntlets | iron | 10 | 1 |  | 4.0 | 10 | 10.0 | 2.50 | 9000 | 8570 | 1.05 | 11 | 6000 |
| iron_sabatons | iron | 10 | 1 |  | 4.0 | 10 | 10.0 | 2.50 | 9000 | 8570 | 1.05 | 11 | 6000 |
| iron_sword | iron | 10 | 2 |  | 6.5 | 15 | 7.5 | 2.31 | 8308 | 8570 | 0.97 | 20 | 5552 |
| iron_scimitar | iron | 10 | 2 |  | 6.5 | 15 | 7.5 | 2.31 | 8308 | 8570 | 0.97 | 20 | 5552 |
| iron_mace | iron | 10 | 2 |  | 6.5 | 15 | 7.5 | 2.31 | 8308 | 8570 | 0.97 | 20 | 5552 |
| iron_axe | iron | 10 | 2 |  | 6.5 | 15 | 7.5 | 2.31 | 8308 | 8570 | 0.97 | 20 | 5552 |
| iron_pickaxe | iron | 10 | 2 |  | 6.5 | 15 | 7.5 | 2.31 | 8308 | 8570 | 0.97 | 20 | 5552 |
| iron_sickle | iron | 10 | 2 |  | 6.5 | 15 | 7.5 | 2.31 | 8308 | 8570 | 0.97 | 20 | 5552 |
| iron_battleaxe | iron | 11 | 2 |  | 7.0 | 18 | 9.0 | 2.57 | 9257 | 9020 | 1.03 | 21 | 5942 |
| iron_spear | iron | 11 | 2 |  | 7.0 | 18 | 9.0 | 2.57 | 9257 | 9020 | 1.03 | 21 | 5942 |
| iron_fullhelm | iron | 11 | 2 |  | 6.0 | 15 | 7.5 | 2.50 | 9000 | 9020 | 1.00 | 20 | 5694 |
| iron_kiteshield | iron | 11 | 2 |  | 5.5 | 14 | 7.0 | 2.55 | 9164 | 9020 | 1.02 | 19 | 5654 |
| iron_platelegs | iron | 11 | 3 |  | 6.5 | 17 | 5.7 | 2.62 | 9415 | 9020 | 1.04 | 27 | 5487 |
| iron_towershield | iron | 11 | 3 |  | 6.5 | 17 | 5.7 | 2.62 | 9415 | 9020 | 1.04 | 27 | 5487 |
| iron_chainbody | iron | 11 | 4 |  | 8.0 | 20 | 5.0 | 2.50 | 9000 | 9020 | 1.00 | 35 | 5318 |
| iron_greataxe | iron | 12 | 3 |  | 9.0 | 24 | 8.0 | 2.67 | 9600 | 9468 | 1.01 | 29 | 5878 |
| iron_greatsword | iron | 12 | 3 |  | 9.5 | 25 | 8.3 | 2.63 | 9474 | 9468 | 1.00 | 30 | 5900 |
| iron_maul | iron | 12 | 3 |  | 10.0 | 27 | 9.0 | 2.70 | 9720 | 9468 | 1.03 | 30 | 6039 |
| iron_platebody | iron | 12 | 5 |  | 9.0 | 24 | 4.8 | 2.67 | 9600 | 9468 | 1.01 | 43 | 5358 |
| steel_dagger | steel | 20 | 1 |  | 6.0 | 23 | 23.0 | 3.83 | 13800 | 14046 | 0.98 | 18 | 8066 |
| steel_medhelm | steel | 20 | 1 |  | 7.0 | 27 | 27.0 | 3.86 | 13886 | 14046 | 0.99 | 19 | 8394 |
| steel_gauntlets | steel | 20 | 1 |  | 6.0 | 23 | 23.0 | 3.83 | 13800 | 14046 | 0.98 | 18 | 8066 |
| steel_sabatons | steel | 20 | 1 |  | 6.0 | 23 | 23.0 | 3.83 | 13800 | 14046 | 0.98 | 18 | 8066 |
| steel_sword | steel | 20 | 2 |  | 11.0 | 43 | 21.5 | 3.91 | 14073 | 14046 | 1.00 | 36 | 7989 |
| steel_scimitar | steel | 20 | 2 |  | 11.0 | 43 | 21.5 | 3.91 | 14073 | 14046 | 1.00 | 36 | 7989 |
| steel_mace | steel | 20 | 2 |  | 11.0 | 43 | 21.5 | 3.91 | 14073 | 14046 | 1.00 | 36 | 7989 |
| steel_axe | steel | 20 | 2 |  | 11.0 | 43 | 21.5 | 3.91 | 14073 | 14046 | 1.00 | 36 | 7989 |
| steel_pickaxe | steel | 20 | 2 |  | 11.0 | 43 | 21.5 | 3.91 | 14073 | 14046 | 1.00 | 36 | 7989 |
| steel_sickle | steel | 20 | 2 |  | 11.0 | 43 | 21.5 | 3.91 | 14073 | 14046 | 1.00 | 36 | 7989 |
| steel_battleaxe | steel | 21 | 2 |  | 11.5 | 47 | 23.5 | 4.09 | 14713 | 14770 | 1.00 | 36 | 8277 |
| steel_spear | steel | 21 | 2 |  | 11.5 | 47 | 23.5 | 4.09 | 14713 | 14770 | 1.00 | 36 | 8277 |
| steel_fullhelm | steel | 21 | 2 |  | 7.0 | 29 | 14.5 | 4.14 | 14914 | 14770 | 1.01 | 32 | 7405 |
| steel_kiteshield | steel | 21 | 2 |  | 9.0 | 37 | 18.5 | 4.11 | 14800 | 14770 | 1.00 | 34 | 7821 |
| steel_platelegs | steel | 21 | 3 |  | 11.0 | 45 | 15.0 | 4.09 | 14727 | 14770 | 1.00 | 48 | 7441 |
| steel_towershield | steel | 21 | 3 |  | 11.0 | 45 | 15.0 | 4.09 | 14727 | 14770 | 1.00 | 48 | 7441 |
| steel_chainbody | steel | 21 | 4 |  | 11.0 | 45 | 11.3 | 4.09 | 14727 | 14770 | 1.00 | 60 | 6997 |
| steel_greataxe | steel | 22 | 3 |  | 15.0 | 65 | 21.7 | 4.33 | 15600 | 15496 | 1.01 | 52 | 8254 |
| steel_greatsword | steel | 22 | 3 |  | 15.0 | 65 | 21.7 | 4.33 | 15600 | 15496 | 1.01 | 52 | 8254 |
| steel_maul | steel | 22 | 3 |  | 15.0 | 65 | 21.7 | 4.33 | 15600 | 15496 | 1.01 | 52 | 8254 |
| steel_platebody | steel | 22 | 5 |  | 12.0 | 52 | 10.4 | 4.33 | 15600 | 15496 | 1.01 | 74 | 6955 |
| steel_warblade | steel | 23 | 3 |  | 15.0 | 68 | 22.7 | 4.53 | 16320 | 16289 | 1.00 | 52 | 8462 |
| gravesteel_blade | gravesteel | 24 | 2 | crude_bonex2 | 11.8 | 56 | 28.0 | 4.75 | 17085 | 17118 | 1.00 | 39 | 9093 |
| gravesteel_warplate | gravesteel | 25 | 5 | crude_bonex3 | 12.6 | 63 | 12.6 | 5.00 | 18000 | 17980 | 1.00 | 80 | 7551 |
| gravesteel_gravemark | gravesteel | 26 | 2 | crude_bonex1 | 10.0 | 52 | 26.0 | 5.20 | 18720 | 18879 | 0.99 | 37 | 9146 |
| blacksteel_dagger | blacksteel | 30 | 1 |  | 8.0 | 51 | 51.0 | 6.38 | 22950 | 23004 | 1.00 | 35 | 11101 |
| blacksteel_medhelm | blacksteel | 30 | 1 |  | 8.0 | 51 | 51.0 | 6.38 | 22950 | 23004 | 1.00 | 35 | 11101 |
| blacksteel_gauntlets | blacksteel | 30 | 1 |  | 7.0 | 45 | 45.0 | 6.43 | 23143 | 23004 | 1.01 | 34 | 10789 |
| blacksteel_sabatons | blacksteel | 30 | 1 |  | 7.0 | 45 | 45.0 | 6.43 | 23143 | 23004 | 1.01 | 34 | 10789 |
| blacksteel_sword | blacksteel | 30 | 2 |  | 13.0 | 83 | 41.5 | 6.38 | 22985 | 23004 | 1.00 | 66 | 10572 |
| blacksteel_scimitar | blacksteel | 30 | 2 |  | 13.0 | 83 | 41.5 | 6.38 | 22985 | 23004 | 1.00 | 66 | 10572 |
| blacksteel_mace | blacksteel | 30 | 2 |  | 13.0 | 83 | 41.5 | 6.38 | 22985 | 23004 | 1.00 | 66 | 10572 |
| blacksteel_axe | blacksteel | 30 | 2 |  | 13.0 | 83 | 41.5 | 6.38 | 22985 | 23004 | 1.00 | 66 | 10572 |
| blacksteel_battleaxe | blacksteel | 31 | 2 |  | 13.5 | 91 | 45.5 | 6.74 | 24267 | 24172 | 1.00 | 67 | 10924 |
| blacksteel_spear | blacksteel | 31 | 2 |  | 13.5 | 91 | 45.5 | 6.74 | 24267 | 24172 | 1.00 | 67 | 10924 |
| blacksteel_fullhelm | blacksteel | 31 | 2 |  | 8.0 | 54 | 27.0 | 6.75 | 24300 | 24172 | 1.01 | 61 | 9733 |
| blacksteel_kiteshield | blacksteel | 31 | 2 |  | 11.0 | 74 | 37.0 | 6.73 | 24218 | 24172 | 1.00 | 64 | 10398 |
| blacksteel_platelegs | blacksteel | 31 | 3 |  | 11.0 | 74 | 24.7 | 6.73 | 24218 | 24172 | 1.00 | 91 | 9563 |
| blacksteel_towershield | blacksteel | 31 | 3 |  | 11.0 | 74 | 24.7 | 6.73 | 24218 | 24172 | 1.00 | 91 | 9563 |
| blacksteel_chainbody | blacksteel | 31 | 4 |  | 13.0 | 87 | 21.8 | 6.69 | 24092 | 24172 | 1.00 | 120 | 9346 |
| blacksteel_greataxe | blacksteel | 32 | 3 |  | 17.0 | 120 | 40.0 | 7.06 | 25412 | 25392 | 1.00 | 97 | 10678 |
| blacksteel_greatsword | blacksteel | 32 | 3 |  | 17.0 | 120 | 40.0 | 7.06 | 25412 | 25392 | 1.00 | 97 | 10678 |
| blacksteel_maul | blacksteel | 32 | 3 |  | 17.0 | 120 | 40.0 | 7.06 | 25412 | 25392 | 1.00 | 97 | 10678 |
| blacksteel_platebody | blacksteel | 32 | 5 |  | 14.0 | 99 | 19.8 | 7.07 | 25457 | 25392 | 1.00 | 148 | 9250 |
| mithril_dagger | mithril | 40 | 1 |  | 8.0 | 84 | 84.0 | 10.50 | 37800 | 37695 | 1.00 | 33 | 14991 |
| mithril_medhelm | mithril | 40 | 1 |  | 8.0 | 84 | 84.0 | 10.50 | 37800 | 37695 | 1.00 | 33 | 14991 |
| mithril_gauntlets | mithril | 40 | 1 |  | 7.0 | 73 | 73.0 | 10.43 | 37543 | 37695 | 1.00 | 32 | 14219 |
| mithril_sabatons | mithril | 40 | 1 |  | 7.0 | 73 | 73.0 | 10.43 | 37543 | 37695 | 1.00 | 32 | 14219 |
| mithril_sword | mithril | 40 | 2 |  | 12.5 | 131 | 65.5 | 10.48 | 37728 | 37695 | 1.00 | 62 | 13695 |
| mithril_scimitar | mithril | 40 | 2 |  | 12.5 | 131 | 65.5 | 10.48 | 37728 | 37695 | 1.00 | 62 | 13695 |
| mithril_mace | mithril | 40 | 2 |  | 12.5 | 131 | 65.5 | 10.48 | 37728 | 37695 | 1.00 | 62 | 13695 |
| mithril_axe | mithril | 40 | 2 |  | 12.5 | 131 | 65.5 | 10.48 | 37728 | 37695 | 1.00 | 62 | 13695 |
| mithril_pickaxe | mithril | 40 | 2 |  | 12.5 | 131 | 65.5 | 10.48 | 37728 | 37695 | 1.00 | 62 | 13695 |
| mithril_battleaxe | mithril | 41 | 2 |  | 13.0 | 143 | 71.5 | 11.00 | 39600 | 39609 | 1.00 | 63 | 14274 |
| mithril_spear | mithril | 41 | 2 |  | 13.0 | 143 | 71.5 | 11.00 | 39600 | 39609 | 1.00 | 63 | 14274 |
| mithril_fullhelm | mithril | 41 | 2 |  | 8.0 | 88 | 44.0 | 11.00 | 39600 | 39609 | 1.00 | 58 | 12083 |
| mithril_kiteshield | mithril | 41 | 2 |  | 11.0 | 121 | 60.5 | 11.00 | 39600 | 39609 | 1.00 | 61 | 13441 |
| mithril_platelegs | mithril | 41 | 3 |  | 11.0 | 121 | 40.3 | 11.00 | 39600 | 39609 | 1.00 | 86 | 11762 |
| mithril_towershield | mithril | 41 | 3 |  | 11.0 | 121 | 40.3 | 11.00 | 39600 | 39609 | 1.00 | 86 | 11762 |
| mithril_chainbody | mithril | 41 | 4 |  | 12.0 | 132 | 33.0 | 11.00 | 39600 | 39609 | 1.00 | 112 | 11097 |
| mithril_greataxe | mithril | 42 | 3 |  | 17.0 | 197 | 65.7 | 11.59 | 41718 | 41612 | 1.00 | 92 | 13976 |
| mithril_greatsword | mithril | 42 | 3 |  | 17.0 | 197 | 65.7 | 11.59 | 41718 | 41612 | 1.00 | 92 | 13976 |
| mithril_maul | mithril | 42 | 3 |  | 17.0 | 197 | 65.7 | 11.59 | 41718 | 41612 | 1.00 | 92 | 13976 |
| mithril_platebody | mithril | 42 | 5 |  | 13.0 | 150 | 30.0 | 11.54 | 41538 | 41612 | 1.00 | 138 | 10865 |
| adamantium_dagger | adamantium | 50 | 1 |  | 9.0 | 155 | 155.0 | 17.22 | 62000 | 61809 | 1.00 | 40 | 22983 |
| adamantium_medhelm | adamantium | 50 | 1 |  | 9.0 | 155 | 155.0 | 17.22 | 62000 | 61809 | 1.00 | 40 | 22983 |
| adamantium_gauntlets | adamantium | 50 | 1 |  | 8.0 | 137 | 137.0 | 17.13 | 61650 | 61809 | 1.00 | 39 | 21913 |
| adamantium_sabatons | adamantium | 50 | 1 |  | 8.0 | 137 | 137.0 | 17.13 | 61650 | 61809 | 1.00 | 39 | 21913 |
| adamantium_sword | adamantium | 50 | 2 |  | 14.5 | 249 | 124.5 | 17.17 | 61821 | 61809 | 1.00 | 77 | 21168 |
| adamantium_scimitar | adamantium | 50 | 2 |  | 14.5 | 249 | 124.5 | 17.17 | 61821 | 61809 | 1.00 | 77 | 21168 |
| adamantium_mace | adamantium | 50 | 2 |  | 14.5 | 249 | 124.5 | 17.17 | 61821 | 61809 | 1.00 | 77 | 21168 |
| adamantium_axe | adamantium | 50 | 2 |  | 14.5 | 249 | 124.5 | 17.17 | 61821 | 61809 | 1.00 | 77 | 21168 |
| adamantium_battleaxe | adamantium | 51 | 2 |  | 15.0 | 271 | 135.5 | 18.07 | 65040 | 64942 | 1.00 | 77 | 22057 |
| adamantium_spear | adamantium | 51 | 2 |  | 15.0 | 271 | 135.5 | 18.07 | 65040 | 64942 | 1.00 | 77 | 22057 |
| adamantium_fullhelm | adamantium | 51 | 2 |  | 9.0 | 162 | 81.0 | 18.00 | 64800 | 64942 | 1.00 | 71 | 18404 |
| adamantium_kiteshield | adamantium | 51 | 2 |  | 13.0 | 235 | 117.5 | 18.08 | 65077 | 64942 | 1.00 | 75 | 20920 |
| adamantium_platelegs | adamantium | 51 | 3 |  | 13.0 | 235 | 78.3 | 18.08 | 65077 | 64942 | 1.00 | 106 | 18220 |
| adamantium_towershield | adamantium | 51 | 3 |  | 13.0 | 235 | 78.3 | 18.08 | 65077 | 64942 | 1.00 | 106 | 18220 |
| adamantium_chainbody | adamantium | 51 | 4 |  | 14.0 | 253 | 63.3 | 18.07 | 65057 | 64942 | 1.00 | 138 | 17090 |
| adamantium_greataxe | adamantium | 52 | 3 |  | 19.0 | 360 | 120.0 | 18.95 | 68211 | 68237 | 1.00 | 112 | 21254 |
| adamantium_greatsword | adamantium | 52 | 3 |  | 19.0 | 360 | 120.0 | 18.95 | 68211 | 68237 | 1.00 | 112 | 21254 |
| adamantium_maul | adamantium | 52 | 3 |  | 19.0 | 360 | 120.0 | 18.95 | 68211 | 68237 | 1.00 | 112 | 21254 |
| adamantium_platebody | adamantium | 52 | 5 |  | 15.0 | 284 | 56.8 | 18.93 | 68160 | 68237 | 1.00 | 171 | 16659 |
| runite_dagger | runite | 60 | 1 |  | 10.0 | 282 | 282.0 | 28.20 | 101520 | 101373 | 1.00 | 44 | 38286 |
| runite_medhelm | runite | 60 | 1 |  | 10.0 | 282 | 282.0 | 28.20 | 101520 | 101373 | 1.00 | 44 | 38286 |
| runite_gauntlets | runite | 60 | 1 |  | 9.0 | 253 | 253.0 | 28.11 | 101200 | 101373 | 1.00 | 43 | 36752 |
| runite_sabatons | runite | 60 | 1 |  | 9.0 | 253 | 253.0 | 28.11 | 101200 | 101373 | 1.00 | 43 | 36752 |
| runite_sword | runite | 60 | 2 |  | 16.5 | 465 | 232.5 | 28.18 | 101455 | 101373 | 1.00 | 85 | 35660 |
| runite_scimitar | runite | 60 | 2 |  | 16.5 | 465 | 232.5 | 28.18 | 101455 | 101373 | 1.00 | 85 | 35660 |
| runite_mace | runite | 60 | 2 |  | 16.5 | 465 | 232.5 | 28.18 | 101455 | 101373 | 1.00 | 85 | 35660 |
| runite_axe | runite | 60 | 2 |  | 16.5 | 465 | 232.5 | 28.18 | 101455 | 101373 | 1.00 | 85 | 35660 |
| runite_pickaxe | runite | 60 | 2 |  | 16.5 | 465 | 232.5 | 28.18 | 101455 | 101373 | 1.00 | 85 | 35660 |
| runite_sickle | runite | 60 | 2 |  | 16.5 | 465 | 232.5 | 28.18 | 101455 | 101373 | 1.00 | 85 | 35660 |
| runite_battleaxe | runite | 61 | 2 |  | 17.0 | 503 | 251.5 | 29.59 | 106518 | 106516 | 1.00 | 85 | 37056 |
| runite_spear | runite | 61 | 2 |  | 17.0 | 503 | 251.5 | 29.59 | 106518 | 106516 | 1.00 | 85 | 37056 |
| runite_fullhelm | runite | 61 | 2 |  | 10.0 | 296 | 148.0 | 29.60 | 106560 | 106516 | 1.00 | 78 | 30844 |
| runite_kiteshield | runite | 61 | 2 |  | 14.0 | 414 | 207.0 | 29.57 | 106457 | 106516 | 1.00 | 82 | 34511 |
| runite_platelegs | runite | 61 | 3 |  | 15.0 | 444 | 148.0 | 29.60 | 106560 | 106516 | 1.00 | 117 | 30844 |
| runite_towershield | runite | 61 | 3 |  | 15.0 | 444 | 148.0 | 29.60 | 106560 | 106516 | 1.00 | 117 | 30844 |
| runite_chainbody | runite | 61 | 4 |  | 16.0 | 473 | 118.3 | 29.56 | 106425 | 106516 | 1.00 | 152 | 28843 |
| runite_greataxe | runite | 62 | 3 |  | 21.0 | 653 | 217.7 | 31.10 | 111943 | 111921 | 1.00 | 123 | 35445 |
| runite_greatsword | runite | 62 | 3 |  | 21.0 | 653 | 217.7 | 31.10 | 111943 | 111921 | 1.00 | 123 | 35445 |
| runite_maul | runite | 62 | 3 |  | 21.0 | 653 | 217.7 | 31.10 | 111943 | 111921 | 1.00 | 123 | 35445 |
| runite_platebody | runite | 62 | 5 |  | 17.0 | 529 | 105.8 | 31.12 | 112024 | 111921 | 1.00 | 188 | 28109 |
| murkvein_longsword | runite | 63 | 2 |  | 16.5 | 539 | 269.5 | 32.67 | 117600 | 117600 | 1.00 | 81 | 39301 |
| bloodiron_dagger | bloodiron | 70 | 1 |  | 11.0 | 508 | 508.0 | 46.18 | 166255 | 166296 | 1.00 | 51 | 59031 |
| bloodiron_medhelm | bloodiron | 70 | 1 |  | 11.0 | 508 | 508.0 | 46.18 | 166255 | 166296 | 1.00 | 51 | 59031 |
| bloodiron_gauntlets | bloodiron | 70 | 1 |  | 10.0 | 462 | 462.0 | 46.20 | 166320 | 166296 | 1.00 | 50 | 56892 |
| bloodiron_sabatons | bloodiron | 70 | 1 |  | 10.0 | 462 | 462.0 | 46.20 | 166320 | 166296 | 1.00 | 50 | 56892 |
| bloodiron_sword | bloodiron | 70 | 2 |  | 18.5 | 855 | 427.5 | 46.22 | 166378 | 166296 | 1.00 | 98 | 55229 |
| bloodiron_scimitar | bloodiron | 70 | 2 |  | 18.5 | 855 | 427.5 | 46.22 | 166378 | 166296 | 1.00 | 98 | 55229 |
| bloodiron_mace | bloodiron | 70 | 2 |  | 18.5 | 855 | 427.5 | 46.22 | 166378 | 166296 | 1.00 | 98 | 55229 |
| bloodiron_axe | bloodiron | 70 | 2 |  | 18.5 | 855 | 427.5 | 46.22 | 166378 | 166296 | 1.00 | 98 | 55229 |
| bloodiron_battleaxe | bloodiron | 71 | 2 |  | 19.0 | 922 | 461.0 | 48.53 | 174695 | 174735 | 1.00 | 99 | 57396 |
| bloodiron_spear | bloodiron | 71 | 2 |  | 19.0 | 922 | 461.0 | 48.53 | 174695 | 174735 | 1.00 | 99 | 57396 |
| bloodiron_fullhelm | bloodiron | 71 | 2 |  | 11.0 | 534 | 267.0 | 48.55 | 174764 | 174735 | 1.00 | 91 | 47046 |
| bloodiron_kiteshield | bloodiron | 71 | 2 |  | 15.0 | 728 | 364.0 | 48.53 | 174720 | 174735 | 1.00 | 95 | 52440 |
| bloodiron_platelegs | bloodiron | 71 | 3 |  | 16.5 | 801 | 267.0 | 48.55 | 174764 | 174735 | 1.00 | 136 | 47046 |
| bloodiron_towershield | bloodiron | 71 | 3 |  | 16.5 | 801 | 267.0 | 48.55 | 174764 | 174735 | 1.00 | 136 | 47046 |
| bloodiron_chainbody | bloodiron | 71 | 4 |  | 18.0 | 874 | 218.5 | 48.56 | 174800 | 174735 | 1.00 | 177 | 44167 |
| bloodiron_greataxe | bloodiron | 72 | 3 |  | 23.0 | 1173 | 391.0 | 51.00 | 183600 | 183602 | 1.00 | 142 | 54303 |
| bloodiron_greatsword | bloodiron | 72 | 3 |  | 23.0 | 1173 | 391.0 | 51.00 | 183600 | 183602 | 1.00 | 142 | 54303 |
| bloodiron_maul | bloodiron | 72 | 3 |  | 23.0 | 1173 | 391.0 | 51.00 | 183600 | 183602 | 1.00 | 142 | 54303 |
| bloodiron_platebody | bloodiron | 72 | 5 |  | 19.0 | 969 | 193.8 | 51.00 | 183600 | 183602 | 1.00 | 218 | 42837 |
| titanium_dagger | titanium | 80 | 1 |  | 12.0 | 909 | 909.0 | 75.75 | 272700 | 272819 | 1.00 | 54 | 98249 |
| titanium_medhelm | titanium | 80 | 1 |  | 12.0 | 909 | 909.0 | 75.75 | 272700 | 272819 | 1.00 | 54 | 98249 |
| titanium_gauntlets | titanium | 80 | 1 |  | 11.0 | 834 | 834.0 | 75.82 | 272945 | 272819 | 1.00 | 53 | 95002 |
| titanium_sabatons | titanium | 80 | 1 |  | 11.0 | 834 | 834.0 | 75.82 | 272945 | 272819 | 1.00 | 53 | 95002 |
| titanium_sword | titanium | 80 | 2 |  | 20.5 | 1554 | 777.0 | 75.80 | 272898 | 272819 | 1.00 | 104 | 92433 |
| titanium_scimitar | titanium | 80 | 2 |  | 20.5 | 1554 | 777.0 | 75.80 | 272898 | 272819 | 1.00 | 104 | 92433 |
| titanium_mace | titanium | 80 | 2 |  | 20.5 | 1554 | 777.0 | 75.80 | 272898 | 272819 | 1.00 | 104 | 92433 |
| titanium_axe | titanium | 80 | 2 |  | 20.5 | 1554 | 777.0 | 75.80 | 272898 | 272819 | 1.00 | 104 | 92433 |
| titanium_battleaxe | titanium | 81 | 2 |  | 21.0 | 1672 | 836.0 | 79.62 | 286629 | 286665 | 1.00 | 105 | 96046 |
| titanium_spear | titanium | 81 | 2 |  | 21.0 | 1672 | 836.0 | 79.62 | 286629 | 286665 | 1.00 | 105 | 96046 |
| titanium_fullhelm | titanium | 81 | 2 |  | 12.0 | 956 | 478.0 | 79.67 | 286800 | 286665 | 1.00 | 96 | 78163 |
| titanium_kiteshield | titanium | 81 | 2 |  | 16.0 | 1274 | 637.0 | 79.63 | 286650 | 286665 | 1.00 | 100 | 86501 |
| titanium_platelegs | titanium | 81 | 3 |  | 18.0 | 1433 | 477.7 | 79.61 | 286600 | 286665 | 1.00 | 144 | 78138 |
| titanium_towershield | titanium | 81 | 3 |  | 18.0 | 1433 | 477.7 | 79.61 | 286600 | 286665 | 1.00 | 144 | 78138 |
| titanium_chainbody | titanium | 81 | 4 |  | 20.0 | 1593 | 398.3 | 79.65 | 286740 | 286665 | 1.00 | 188 | 73708 |
| titanium_greataxe | titanium | 82 | 3 |  | 25.0 | 2092 | 697.3 | 83.68 | 301248 | 301214 | 1.00 | 151 | 90251 |
| titanium_greatsword | titanium | 82 | 3 |  | 25.0 | 2092 | 697.3 | 83.68 | 301248 | 301214 | 1.00 | 151 | 90251 |
| titanium_maul | titanium | 82 | 3 |  | 25.0 | 2092 | 697.3 | 83.68 | 301248 | 301214 | 1.00 | 151 | 90251 |
| titanium_platebody | titanium | 82 | 5 |  | 21.0 | 1757 | 351.4 | 83.67 | 301200 | 301214 | 1.00 | 231 | 71328 |
| aetherium_dagger | aetherium | 90 | 1 |  | 13.0 | 1616 | 1616.0 | 124.31 | 447508 | 447593 | 1.00 | 62 | 154244 |
| aetherium_medhelm | aetherium | 90 | 1 |  | 13.0 | 1616 | 1616.0 | 124.31 | 447508 | 447593 | 1.00 | 62 | 154244 |
| aetherium_gauntlets | aetherium | 90 | 1 |  | 12.0 | 1492 | 1492.0 | 124.33 | 447600 | 447593 | 1.00 | 61 | 149415 |
| aetherium_sabatons | aetherium | 90 | 1 |  | 12.0 | 1492 | 1492.0 | 124.33 | 447600 | 447593 | 1.00 | 61 | 149415 |
| aetherium_sword | aetherium | 90 | 2 |  | 22.5 | 2797 | 1398.5 | 124.31 | 447520 | 447593 | 1.00 | 120 | 145657 |
| aetherium_scimitar | aetherium | 90 | 2 |  | 22.5 | 2797 | 1398.5 | 124.31 | 447520 | 447593 | 1.00 | 120 | 145657 |
| aetherium_mace | aetherium | 90 | 2 |  | 22.5 | 2797 | 1398.5 | 124.31 | 447520 | 447593 | 1.00 | 120 | 145657 |
| aetherium_axe | aetherium | 90 | 2 |  | 22.5 | 2797 | 1398.5 | 124.31 | 447520 | 447593 | 1.00 | 120 | 145657 |
| aetherium_battleaxe | aetherium | 91 | 2 |  | 23.0 | 3005 | 1502.5 | 130.65 | 470348 | 470310 | 1.00 | 120 | 151290 |
| aetherium_spear | aetherium | 91 | 2 |  | 23.0 | 3005 | 1502.5 | 130.65 | 470348 | 470310 | 1.00 | 120 | 151290 |
| aetherium_fullhelm | aetherium | 91 | 2 |  | 13.0 | 1698 | 849.0 | 130.62 | 470215 | 470310 | 1.00 | 110 | 122269 |
| aetherium_kiteshield | aetherium | 91 | 2 |  | 17.0 | 2221 | 1110.5 | 130.65 | 470329 | 470310 | 1.00 | 114 | 134495 |
| aetherium_platelegs | aetherium | 91 | 3 |  | 19.5 | 2548 | 849.3 | 130.67 | 470400 | 470310 | 1.00 | 165 | 122291 |
| aetherium_towershield | aetherium | 91 | 3 |  | 19.5 | 2548 | 849.3 | 130.67 | 470400 | 470310 | 1.00 | 165 | 122291 |
| aetherium_chainbody | aetherium | 91 | 4 |  | 22.0 | 2874 | 718.5 | 130.64 | 470291 | 470310 | 1.00 | 216 | 115833 |
| aetherium_greataxe | aetherium | 92 | 3 |  | 27.0 | 3706 | 1235.3 | 137.26 | 494133 | 494182 | 1.00 | 173 | 141141 |
| aetherium_greatsword | aetherium | 92 | 3 |  | 27.0 | 3706 | 1235.3 | 137.26 | 494133 | 494182 | 1.00 | 173 | 141141 |
| aetherium_maul | aetherium | 92 | 3 |  | 27.0 | 3706 | 1235.3 | 137.26 | 494133 | 494182 | 1.00 | 173 | 141141 |
| aetherium_platebody | aetherium | 92 | 5 |  | 23.0 | 3157 | 631.4 | 137.26 | 494139 | 494182 | 1.00 | 266 | 111892 |
| godiron_dagger | godiron | 95 | 1 |  | 15.0 | 2389 | 2389.0 | 159.27 | 573360 | 573312 | 1.00 | 67 | 231045 |
| godiron_medhelm | godiron | 95 | 1 |  | 15.0 | 2389 | 2389.0 | 159.27 | 573360 | 573312 | 1.00 | 67 | 231045 |
| godiron_gauntlets | godiron | 95 | 1 |  | 14.0 | 2230 | 2230.0 | 159.29 | 573429 | 573312 | 1.00 | 66 | 225873 |
| godiron_sabatons | godiron | 95 | 1 |  | 14.0 | 2230 | 2230.0 | 159.29 | 573429 | 573312 | 1.00 | 66 | 225873 |
| godiron_sword | godiron | 95 | 2 |  | 26.5 | 4220 | 2110.0 | 159.25 | 573283 | 573312 | 1.00 | 131 | 221848 |
| godiron_scimitar | godiron | 95 | 2 |  | 26.5 | 4220 | 2110.0 | 159.25 | 573283 | 573312 | 1.00 | 131 | 221848 |
| godiron_mace | godiron | 95 | 2 |  | 26.5 | 4220 | 2110.0 | 159.25 | 573283 | 573312 | 1.00 | 131 | 221848 |
| godiron_axe | godiron | 95 | 2 |  | 26.5 | 4220 | 2110.0 | 159.25 | 573283 | 573312 | 1.00 | 131 | 221848 |
| godiron_battleaxe | godiron | 97 | 2 |  | 27.0 | 4747 | 2373.5 | 175.81 | 632933 | 632986 | 1.00 | 131 | 235484 |
| godiron_spear | godiron | 97 | 2 |  | 27.0 | 4747 | 2373.5 | 175.81 | 632933 | 632986 | 1.00 | 131 | 235484 |
| godiron_fullhelm | godiron | 97 | 2 |  | 15.0 | 2637 | 1318.5 | 175.80 | 632880 | 632986 | 1.00 | 119 | 195398 |
| godiron_kiteshield | godiron | 97 | 2 |  | 19.0 | 3341 | 1670.5 | 175.84 | 633032 | 632986 | 1.00 | 123 | 209649 |
| godiron_platelegs | godiron | 97 | 3 |  | 23.0 | 4044 | 1348.0 | 175.83 | 632974 | 632986 | 1.00 | 179 | 196632 |
| godiron_towershield | godiron | 97 | 3 |  | 23.0 | 4044 | 1348.0 | 175.83 | 632974 | 632986 | 1.00 | 179 | 196632 |
| godiron_chainbody | godiron | 97 | 4 |  | 26.0 | 4572 | 1143.0 | 175.85 | 633046 | 632986 | 1.00 | 234 | 187938 |
| godiron_greataxe | godiron | 99 | 3 |  | 31.0 | 6018 | 2006.0 | 194.13 | 698865 | 698873 | 1.00 | 187 | 226222 |
| godiron_greatsword | godiron | 99 | 3 |  | 31.0 | 6018 | 2006.0 | 194.13 | 698865 | 698873 | 1.00 | 187 | 226222 |
| godiron_maul | godiron | 99 | 3 |  | 31.0 | 6018 | 2006.0 | 194.13 | 698865 | 698873 | 1.00 | 187 | 226222 |
| godiron_platebody | godiron | 99 | 6 |  | 27.0 | 5242 | 873.7 | 194.15 | 698933 | 698873 | 1.00 | 339 | 177430 |
| void_sickle | void | 65 | 2 | void_essencex2 | 17.5 | 630 | 315.0 | 36.00 | 129600 | 129836 | 1.00 | 86 | 42175 |
| craft_mirror_ward | slayer_requirements | 30 | 5 | frost_essencex2 | 10.0 | 64 | 12.8 | 6.40 | 23040 | 23004 | 1.00 | 44 | 8509 |
| craft_slayer_greaves | slayer_requirements | 75 | 6 | dread_fang_shardx8+slag_carapacex4 | 18.0 | 1065 | 177.5 | 59.17 | 213000 | 212997 | 1.00 | 257 | 42266 |
| craft_slayer_helm | slayer_requirements | 80 | 10 | slayer_ward_capsulex1+tower_forge_compoundx1 | 30.0 | 2273 | 227.3 | 75.77 | 272760 | 272819 | 1.00 | 449 | 63285 |

### A2: Smelt-Aktionen (Ist-Stand)
| id | Tier | L | Dauer s | XP | XP/s | XP/h | Ziel | :Ziel |
|---|---|---|---|---|---|---|---|---|
| smelt_copper | copper | 1 | 2.6 | 4 | 1.54 | 5538 | 5466 | 1.01 |
| recycle_scrap | copper | 5 | 3.5 | 7 | 2.00 | 7200 | 6681 | 1.08 |
| smelt_bronze | bronze | 5 | 3.0 | 6 | 2.00 | 7200 | 6681 | 1.08 |
| smelt_iron | iron | 10 | 3.2 | 8 | 2.50 | 9000 | 8570 | 1.05 |
| smelt_steel | steel | 20 | 4.5 | 18 | 4.00 | 14400 | 14046 | 1.03 |
| smelt_gravesteel | gravesteel | 22 | 4.8 | 21 | 4.38 | 15750 | 15496 | 1.02 |
| smelt_blacksteel | blacksteel | 30 | 6.0 | 38 | 6.33 | 22800 | 23004 | 0.99 |
| smelt_mithril | mithril | 35 | 6.5 | 53 | 8.15 | 29354 | 29449 | 1.00 |
| smelt_adamantium | adamantium | 45 | 7.5 | 101 | 13.47 | 48480 | 48266 | 1.00 |
| smelt_runite | runite | 55 | 8.5 | 187 | 22.00 | 79200 | 79155 | 1.00 |
| smelt_murkvein | runite | 62 | 5.5 | 171 | 31.09 | 111927 | 111921 | 1.00 |
| smelt_bloodiron | bloodiron | 65 | 9.0 | 325 | 36.11 | 130000 | 129836 | 1.00 |
| smelt_titanium | titanium | 75 | 9.5 | 562 | 59.16 | 212968 | 212997 | 1.00 |
| smelt_aetherium | aetherium | 85 | 10.5 | 1019 | 97.05 | 349371 | 349444 | 1.00 |
| smelt_godiron | godiron | 95 | 12.0 | 1911 | 159.25 | 573300 | 573312 | 1.00 |

### A3: Option B, Apply-Liste aller Forge-Aktionen der 12 Haupt-Tiers (durationMs neu = Barren x s_t, auf 500 ms gerundet; xp neu = round(T(L) x durationMs / 3.6e6))
| id | Tier | L | Barren | durationMs alt -> neu | xp alt -> neu | XP/Barren neu | XP/h neu |
|---|---|---|---|---|---|---|---|
| forge_copper_dagger | copper | 1 | 1 | 3000 -> 2500 | 5 -> 4 | 4.0 | 5760 |
| forge_copper_sword | copper | 1 | 1 | 3500 -> 2500 | 5 -> 4 | 4.0 | 5760 |
| forge_copper_mace | copper | 1 | 1 | 3500 -> 2500 | 5 -> 4 | 4.0 | 5760 |
| forge_copper_medhelm | copper | 1 | 1 | 3500 -> 2500 | 5 -> 4 | 4.0 | 5760 |
| forge_copper_gauntlets | copper | 1 | 1 | 3000 -> 2500 | 5 -> 4 | 4.0 | 5760 |
| forge_copper_sabatons | copper | 1 | 1 | 3000 -> 2500 | 5 -> 4 | 4.0 | 5760 |
| forge_copper_scimitar | copper | 1 | 2 | 4000 -> 4500 | 6 -> 7 | 3.5 | 5600 |
| forge_copper_axe | copper | 2 | 2 | 4500 -> 4500 | 8 -> 7 | 3.5 | 5600 |
| forge_copper_battleaxe | copper | 2 | 2 | 4500 -> 4500 | 8 -> 7 | 3.5 | 5600 |
| forge_copper_spear | copper | 2 | 2 | 4500 -> 4500 | 8 -> 7 | 3.5 | 5600 |
| forge_copper_fullhelm | copper | 2 | 2 | 4500 -> 4500 | 8 -> 7 | 3.5 | 5600 |
| forge_copper_kiteshield | copper | 2 | 2 | 4500 -> 4500 | 8 -> 7 | 3.5 | 5600 |
| forge_copper_towershield | copper | 2 | 3 | 6500 -> 7000 | 11 -> 11 | 3.7 | 5657 |
| forge_copper_chainbody | copper | 2 | 4 | 8000 -> 9000 | 14 -> 14 | 3.5 | 5600 |
| forge_copper_greataxe | copper | 3 | 3 | 6500 -> 7000 | 12 -> 12 | 4.0 | 6171 |
| forge_copper_greatsword | copper | 3 | 3 | 6500 -> 7000 | 12 -> 12 | 4.0 | 6171 |
| forge_copper_maul | copper | 3 | 3 | 6500 -> 7000 | 12 -> 12 | 4.0 | 6171 |
| forge_copper_platelegs | copper | 3 | 3 | 6500 -> 7000 | 12 -> 12 | 4.0 | 6171 |
| forge_copper_platebody | copper | 4 | 5 | 9000 -> 11500 | 17 -> 20 | 4.0 | 6261 |
| forge_bronze_dagger | bronze | 5 | 1 | 4000 -> 3000 | 8 -> 6 | 6.0 | 7200 |
| forge_bronze_mace | bronze | 5 | 1 | 5000 -> 3000 | 10 -> 6 | 6.0 | 7200 |
| forge_bronze_medhelm | bronze | 5 | 1 | 5000 -> 3000 | 10 -> 6 | 6.0 | 7200 |
| forge_bronze_gauntlets | bronze | 5 | 1 | 4000 -> 3000 | 8 -> 6 | 6.0 | 7200 |
| forge_bronze_sabatons | bronze | 5 | 1 | 4000 -> 3000 | 8 -> 6 | 6.0 | 7200 |
| forge_bronze_sword | bronze | 5 | 2 | 5500 -> 5500 | 11 -> 10 | 5.0 | 6545 |
| forge_bronze_scimitar | bronze | 5 | 2 | 6000 -> 5500 | 12 -> 10 | 5.0 | 6545 |
| forge_bronze_axe | bronze | 6 | 2 | 6000 -> 5500 | 12 -> 11 | 5.5 | 7200 |
| forge_bronze_battleaxe | bronze | 6 | 2 | 6000 -> 5500 | 12 -> 11 | 5.5 | 7200 |
| forge_bronze_spear | bronze | 6 | 2 | 6000 -> 5500 | 12 -> 11 | 5.5 | 7200 |
| forge_bronze_fullhelm | bronze | 6 | 2 | 6000 -> 5500 | 12 -> 11 | 5.5 | 7200 |
| forge_bronze_kiteshield | bronze | 6 | 2 | 6000 -> 5500 | 12 -> 11 | 5.5 | 7200 |
| forge_bronze_platelegs | bronze | 6 | 3 | 8000 -> 8500 | 16 -> 17 | 5.7 | 7200 |
| forge_bronze_towershield | bronze | 6 | 3 | 8000 -> 8500 | 16 -> 17 | 5.7 | 7200 |
| forge_bronze_chainbody | bronze | 6 | 4 | 9000 -> 11500 | 18 -> 23 | 5.8 | 7200 |
| forge_bronze_greataxe | bronze | 7 | 3 | 8000 -> 8500 | 16 -> 17 | 5.7 | 7200 |
| forge_bronze_greatsword | bronze | 7 | 3 | 8000 -> 8500 | 16 -> 17 | 5.7 | 7200 |
| forge_bronze_maul | bronze | 7 | 3 | 8000 -> 8500 | 16 -> 17 | 5.7 | 7200 |
| forge_bronze_platebody | bronze | 7 | 5 | 10000 -> 14000 | 20 -> 29 | 5.8 | 7457 |
| forge_iron_dagger | iron | 10 | 1 | 4500 -> 3000 | 11 -> 7 | 7.0 | 8400 |
| forge_iron_medhelm | iron | 10 | 1 | 5000 -> 3000 | 12 -> 7 | 7.0 | 8400 |
| forge_iron_gauntlets | iron | 10 | 1 | 4000 -> 3000 | 10 -> 7 | 7.0 | 8400 |
| forge_iron_sabatons | iron | 10 | 1 | 4000 -> 3000 | 10 -> 7 | 7.0 | 8400 |
| forge_iron_sword | iron | 10 | 2 | 6500 -> 6000 | 15 -> 14 | 7.0 | 8400 |
| forge_iron_scimitar | iron | 10 | 2 | 6500 -> 6000 | 15 -> 14 | 7.0 | 8400 |
| forge_iron_mace | iron | 10 | 2 | 6500 -> 6000 | 15 -> 14 | 7.0 | 8400 |
| forge_iron_axe | iron | 10 | 2 | 6500 -> 6000 | 15 -> 14 | 7.0 | 8400 |
| forge_iron_pickaxe | iron | 10 | 2 | 6500 -> 6000 | 15 -> 14 | 7.0 | 8400 |
| forge_iron_sickle | iron | 10 | 2 | 6500 -> 6000 | 15 -> 14 | 7.0 | 8400 |
| forge_iron_battleaxe | iron | 11 | 2 | 7000 -> 6000 | 18 -> 15 | 7.5 | 9000 |
| forge_iron_spear | iron | 11 | 2 | 7000 -> 6000 | 18 -> 15 | 7.5 | 9000 |
| forge_iron_fullhelm | iron | 11 | 2 | 6000 -> 6000 | 15 -> 15 | 7.5 | 9000 |
| forge_iron_kiteshield | iron | 11 | 2 | 5500 -> 6000 | 14 -> 15 | 7.5 | 9000 |
| forge_iron_platelegs | iron | 11 | 3 | 6500 -> 9000 | 17 -> 23 | 7.7 | 9200 |
| forge_iron_towershield | iron | 11 | 3 | 6500 -> 9000 | 17 -> 23 | 7.7 | 9200 |
| forge_iron_chainbody | iron | 11 | 4 | 8000 -> 11500 | 20 -> 29 | 7.3 | 9078 |
| forge_iron_greataxe | iron | 12 | 3 | 9000 -> 9000 | 24 -> 24 | 8.0 | 9600 |
| forge_iron_greatsword | iron | 12 | 3 | 9500 -> 9000 | 25 -> 24 | 8.0 | 9600 |
| forge_iron_maul | iron | 12 | 3 | 10000 -> 9000 | 27 -> 24 | 8.0 | 9600 |
| forge_iron_platebody | iron | 12 | 5 | 9000 -> 14500 | 24 -> 38 | 7.6 | 9434 |
| forge_steel_dagger | steel | 20 | 1 | 6000 -> 4500 | 23 -> 18 | 18.0 | 14400 |
| forge_steel_medhelm | steel | 20 | 1 | 7000 -> 4500 | 27 -> 18 | 18.0 | 14400 |
| forge_steel_gauntlets | steel | 20 | 1 | 6000 -> 4500 | 23 -> 18 | 18.0 | 14400 |
| forge_steel_sabatons | steel | 20 | 1 | 6000 -> 4500 | 23 -> 18 | 18.0 | 14400 |
| forge_steel_sword | steel | 20 | 2 | 11000 -> 9000 | 43 -> 35 | 17.5 | 14000 |
| forge_steel_scimitar | steel | 20 | 2 | 11000 -> 9000 | 43 -> 35 | 17.5 | 14000 |
| forge_steel_mace | steel | 20 | 2 | 11000 -> 9000 | 43 -> 35 | 17.5 | 14000 |
| forge_steel_axe | steel | 20 | 2 | 11000 -> 9000 | 43 -> 35 | 17.5 | 14000 |
| forge_steel_pickaxe | steel | 20 | 2 | 11000 -> 9000 | 43 -> 35 | 17.5 | 14000 |
| forge_steel_sickle | steel | 20 | 2 | 11000 -> 9000 | 43 -> 35 | 17.5 | 14000 |
| forge_steel_battleaxe | steel | 21 | 2 | 11500 -> 9000 | 47 -> 37 | 18.5 | 14800 |
| forge_steel_spear | steel | 21 | 2 | 11500 -> 9000 | 47 -> 37 | 18.5 | 14800 |
| forge_steel_fullhelm | steel | 21 | 2 | 7000 -> 9000 | 29 -> 37 | 18.5 | 14800 |
| forge_steel_kiteshield | steel | 21 | 2 | 9000 -> 9000 | 37 -> 37 | 18.5 | 14800 |
| forge_steel_platelegs | steel | 21 | 3 | 11000 -> 14000 | 45 -> 57 | 19.0 | 14657 |
| forge_steel_towershield | steel | 21 | 3 | 11000 -> 14000 | 45 -> 57 | 19.0 | 14657 |
| forge_steel_chainbody | steel | 21 | 4 | 11000 -> 18500 | 45 -> 76 | 19.0 | 14789 |
| forge_steel_greataxe | steel | 22 | 3 | 15000 -> 14000 | 65 -> 60 | 20.0 | 15429 |
| forge_steel_greatsword | steel | 22 | 3 | 15000 -> 14000 | 65 -> 60 | 20.0 | 15429 |
| forge_steel_maul | steel | 22 | 3 | 15000 -> 14000 | 65 -> 60 | 20.0 | 15429 |
| forge_steel_platebody | steel | 22 | 5 | 12000 -> 23000 | 52 -> 99 | 19.8 | 15496 |
| forge_steel_warblade | steel | 23 | 3 | 15000 -> 14000 | 68 -> 63 | 21.0 | 16200 |
| forge_blacksteel_dagger | blacksteel | 30 | 1 | 8000 -> 5000 | 51 -> 32 | 32.0 | 23040 |
| forge_blacksteel_medhelm | blacksteel | 30 | 1 | 8000 -> 5000 | 51 -> 32 | 32.0 | 23040 |
| forge_blacksteel_gauntlets | blacksteel | 30 | 1 | 7000 -> 5000 | 45 -> 32 | 32.0 | 23040 |
| forge_blacksteel_sabatons | blacksteel | 30 | 1 | 7000 -> 5000 | 45 -> 32 | 32.0 | 23040 |
| forge_blacksteel_sword | blacksteel | 30 | 2 | 13000 -> 10500 | 83 -> 67 | 33.5 | 22971 |
| forge_blacksteel_scimitar | blacksteel | 30 | 2 | 13000 -> 10500 | 83 -> 67 | 33.5 | 22971 |
| forge_blacksteel_mace | blacksteel | 30 | 2 | 13000 -> 10500 | 83 -> 67 | 33.5 | 22971 |
| forge_blacksteel_axe | blacksteel | 30 | 2 | 13000 -> 10500 | 83 -> 67 | 33.5 | 22971 |
| forge_blacksteel_battleaxe | blacksteel | 31 | 2 | 13500 -> 10500 | 91 -> 71 | 35.5 | 24343 |
| forge_blacksteel_spear | blacksteel | 31 | 2 | 13500 -> 10500 | 91 -> 71 | 35.5 | 24343 |
| forge_blacksteel_fullhelm | blacksteel | 31 | 2 | 8000 -> 10500 | 54 -> 71 | 35.5 | 24343 |
| forge_blacksteel_kiteshield | blacksteel | 31 | 2 | 11000 -> 10500 | 74 -> 71 | 35.5 | 24343 |
| forge_blacksteel_platelegs | blacksteel | 31 | 3 | 11000 -> 15500 | 74 -> 104 | 34.7 | 24155 |
| forge_blacksteel_towershield | blacksteel | 31 | 3 | 11000 -> 15500 | 74 -> 104 | 34.7 | 24155 |
| forge_blacksteel_chainbody | blacksteel | 31 | 4 | 13000 -> 20500 | 87 -> 138 | 34.5 | 24234 |
| forge_blacksteel_greataxe | blacksteel | 32 | 3 | 17000 -> 15500 | 120 -> 109 | 36.3 | 25316 |
| forge_blacksteel_greatsword | blacksteel | 32 | 3 | 17000 -> 15500 | 120 -> 109 | 36.3 | 25316 |
| forge_blacksteel_maul | blacksteel | 32 | 3 | 17000 -> 15500 | 120 -> 109 | 36.3 | 25316 |
| forge_blacksteel_platebody | blacksteel | 32 | 5 | 14000 -> 26000 | 99 -> 183 | 36.6 | 25338 |
| forge_mithril_dagger | mithril | 40 | 1 | 8000 -> 5000 | 84 -> 52 | 52.0 | 37440 |
| forge_mithril_medhelm | mithril | 40 | 1 | 8000 -> 5000 | 84 -> 52 | 52.0 | 37440 |
| forge_mithril_gauntlets | mithril | 40 | 1 | 7000 -> 5000 | 73 -> 52 | 52.0 | 37440 |
| forge_mithril_sabatons | mithril | 40 | 1 | 7000 -> 5000 | 73 -> 52 | 52.0 | 37440 |
| forge_mithril_sword | mithril | 40 | 2 | 12500 -> 10000 | 131 -> 105 | 52.5 | 37800 |
| forge_mithril_scimitar | mithril | 40 | 2 | 12500 -> 10000 | 131 -> 105 | 52.5 | 37800 |
| forge_mithril_mace | mithril | 40 | 2 | 12500 -> 10000 | 131 -> 105 | 52.5 | 37800 |
| forge_mithril_axe | mithril | 40 | 2 | 12500 -> 10000 | 131 -> 105 | 52.5 | 37800 |
| forge_mithril_pickaxe | mithril | 40 | 2 | 12500 -> 10000 | 131 -> 105 | 52.5 | 37800 |
| forge_mithril_battleaxe | mithril | 41 | 2 | 13000 -> 10000 | 143 -> 110 | 55.0 | 39600 |
| forge_mithril_spear | mithril | 41 | 2 | 13000 -> 10000 | 143 -> 110 | 55.0 | 39600 |
| forge_mithril_fullhelm | mithril | 41 | 2 | 8000 -> 10000 | 88 -> 110 | 55.0 | 39600 |
| forge_mithril_kiteshield | mithril | 41 | 2 | 11000 -> 10000 | 121 -> 110 | 55.0 | 39600 |
| forge_mithril_platelegs | mithril | 41 | 3 | 11000 -> 15500 | 121 -> 171 | 57.0 | 39716 |
| forge_mithril_towershield | mithril | 41 | 3 | 11000 -> 15500 | 121 -> 171 | 57.0 | 39716 |
| forge_mithril_chainbody | mithril | 41 | 4 | 12000 -> 20500 | 132 -> 226 | 56.5 | 39688 |
| forge_mithril_greataxe | mithril | 42 | 3 | 17000 -> 15500 | 197 -> 179 | 59.7 | 41574 |
| forge_mithril_greatsword | mithril | 42 | 3 | 17000 -> 15500 | 197 -> 179 | 59.7 | 41574 |
| forge_mithril_maul | mithril | 42 | 3 | 17000 -> 15500 | 197 -> 179 | 59.7 | 41574 |
| forge_mithril_platebody | mithril | 42 | 5 | 13000 -> 25500 | 150 -> 295 | 59.0 | 41647 |
| forge_adamantium_dagger | adamantium | 50 | 1 | 9000 -> 6000 | 155 -> 103 | 103.0 | 61800 |
| forge_adamantium_medhelm | adamantium | 50 | 1 | 9000 -> 6000 | 155 -> 103 | 103.0 | 61800 |
| forge_adamantium_gauntlets | adamantium | 50 | 1 | 8000 -> 6000 | 137 -> 103 | 103.0 | 61800 |
| forge_adamantium_sabatons | adamantium | 50 | 1 | 8000 -> 6000 | 137 -> 103 | 103.0 | 61800 |
| forge_adamantium_sword | adamantium | 50 | 2 | 14500 -> 11500 | 249 -> 197 | 98.5 | 61670 |
| forge_adamantium_scimitar | adamantium | 50 | 2 | 14500 -> 11500 | 249 -> 197 | 98.5 | 61670 |
| forge_adamantium_mace | adamantium | 50 | 2 | 14500 -> 11500 | 249 -> 197 | 98.5 | 61670 |
| forge_adamantium_axe | adamantium | 50 | 2 | 14500 -> 11500 | 249 -> 197 | 98.5 | 61670 |
| forge_adamantium_battleaxe | adamantium | 51 | 2 | 15000 -> 11500 | 271 -> 207 | 103.5 | 64800 |
| forge_adamantium_spear | adamantium | 51 | 2 | 15000 -> 11500 | 271 -> 207 | 103.5 | 64800 |
| forge_adamantium_fullhelm | adamantium | 51 | 2 | 9000 -> 11500 | 162 -> 207 | 103.5 | 64800 |
| forge_adamantium_kiteshield | adamantium | 51 | 2 | 13000 -> 11500 | 235 -> 207 | 103.5 | 64800 |
| forge_adamantium_platelegs | adamantium | 51 | 3 | 13000 -> 17500 | 235 -> 316 | 105.3 | 65006 |
| forge_adamantium_towershield | adamantium | 51 | 3 | 13000 -> 17500 | 235 -> 316 | 105.3 | 65006 |
| forge_adamantium_chainbody | adamantium | 51 | 4 | 14000 -> 23500 | 253 -> 424 | 106.0 | 64953 |
| forge_adamantium_greataxe | adamantium | 52 | 3 | 19000 -> 17500 | 360 -> 332 | 110.7 | 68297 |
| forge_adamantium_greatsword | adamantium | 52 | 3 | 19000 -> 17500 | 360 -> 332 | 110.7 | 68297 |
| forge_adamantium_maul | adamantium | 52 | 3 | 19000 -> 17500 | 360 -> 332 | 110.7 | 68297 |
| forge_adamantium_platebody | adamantium | 52 | 5 | 15000 -> 29000 | 284 -> 550 | 110.0 | 68276 |
| forge_runite_dagger | runite | 60 | 1 | 10000 -> 6500 | 282 -> 183 | 183.0 | 101354 |
| forge_runite_medhelm | runite | 60 | 1 | 10000 -> 6500 | 282 -> 183 | 183.0 | 101354 |
| forge_runite_gauntlets | runite | 60 | 1 | 9000 -> 6500 | 253 -> 183 | 183.0 | 101354 |
| forge_runite_sabatons | runite | 60 | 1 | 9000 -> 6500 | 253 -> 183 | 183.0 | 101354 |
| forge_runite_sword | runite | 60 | 2 | 16500 -> 13500 | 465 -> 380 | 190.0 | 101333 |
| forge_runite_scimitar | runite | 60 | 2 | 16500 -> 13500 | 465 -> 380 | 190.0 | 101333 |
| forge_runite_mace | runite | 60 | 2 | 16500 -> 13500 | 465 -> 380 | 190.0 | 101333 |
| forge_runite_axe | runite | 60 | 2 | 16500 -> 13500 | 465 -> 380 | 190.0 | 101333 |
| forge_runite_pickaxe | runite | 60 | 2 | 16500 -> 13500 | 465 -> 380 | 190.0 | 101333 |
| forge_runite_sickle | runite | 60 | 2 | 16500 -> 13500 | 465 -> 380 | 190.0 | 101333 |
| forge_runite_battleaxe | runite | 61 | 2 | 17000 -> 13500 | 503 -> 399 | 199.5 | 106400 |
| forge_runite_spear | runite | 61 | 2 | 17000 -> 13500 | 503 -> 399 | 199.5 | 106400 |
| forge_runite_fullhelm | runite | 61 | 2 | 10000 -> 13500 | 296 -> 399 | 199.5 | 106400 |
| forge_runite_kiteshield | runite | 61 | 2 | 14000 -> 13500 | 414 -> 399 | 199.5 | 106400 |
| forge_runite_platelegs | runite | 61 | 3 | 15000 -> 20000 | 444 -> 592 | 197.3 | 106560 |
| forge_runite_towershield | runite | 61 | 3 | 15000 -> 20000 | 444 -> 592 | 197.3 | 106560 |
| forge_runite_chainbody | runite | 61 | 4 | 16000 -> 27000 | 473 -> 799 | 199.8 | 106533 |
| forge_runite_greataxe | runite | 62 | 3 | 21000 -> 20000 | 653 -> 622 | 207.3 | 111960 |
| forge_runite_greatsword | runite | 62 | 3 | 21000 -> 20000 | 653 -> 622 | 207.3 | 111960 |
| forge_runite_maul | runite | 62 | 3 | 21000 -> 20000 | 653 -> 622 | 207.3 | 111960 |
| forge_runite_platebody | runite | 62 | 5 | 17000 -> 33500 | 529 -> 1041 | 208.2 | 111869 |
| forge_bloodiron_dagger | bloodiron | 70 | 1 | 11000 -> 7500 | 508 -> 346 | 346.0 | 166080 |
| forge_bloodiron_medhelm | bloodiron | 70 | 1 | 11000 -> 7500 | 508 -> 346 | 346.0 | 166080 |
| forge_bloodiron_gauntlets | bloodiron | 70 | 1 | 10000 -> 7500 | 462 -> 346 | 346.0 | 166080 |
| forge_bloodiron_sabatons | bloodiron | 70 | 1 | 10000 -> 7500 | 462 -> 346 | 346.0 | 166080 |
| forge_bloodiron_sword | bloodiron | 70 | 2 | 18500 -> 14500 | 855 -> 670 | 335.0 | 166345 |
| forge_bloodiron_scimitar | bloodiron | 70 | 2 | 18500 -> 14500 | 855 -> 670 | 335.0 | 166345 |
| forge_bloodiron_mace | bloodiron | 70 | 2 | 18500 -> 14500 | 855 -> 670 | 335.0 | 166345 |
| forge_bloodiron_axe | bloodiron | 70 | 2 | 18500 -> 14500 | 855 -> 670 | 335.0 | 166345 |
| forge_bloodiron_battleaxe | bloodiron | 71 | 2 | 19000 -> 14500 | 922 -> 704 | 352.0 | 174786 |
| forge_bloodiron_spear | bloodiron | 71 | 2 | 19000 -> 14500 | 922 -> 704 | 352.0 | 174786 |
| forge_bloodiron_fullhelm | bloodiron | 71 | 2 | 11000 -> 14500 | 534 -> 704 | 352.0 | 174786 |
| forge_bloodiron_kiteshield | bloodiron | 71 | 2 | 15000 -> 14500 | 728 -> 704 | 352.0 | 174786 |
| forge_bloodiron_platelegs | bloodiron | 71 | 3 | 16500 -> 22000 | 801 -> 1068 | 356.0 | 174764 |
| forge_bloodiron_towershield | bloodiron | 71 | 3 | 16500 -> 22000 | 801 -> 1068 | 356.0 | 174764 |
| forge_bloodiron_chainbody | bloodiron | 71 | 4 | 18000 -> 29000 | 874 -> 1408 | 352.0 | 174786 |
| forge_bloodiron_greataxe | bloodiron | 72 | 3 | 23000 -> 22000 | 1173 -> 1122 | 374.0 | 183600 |
| forge_bloodiron_greatsword | bloodiron | 72 | 3 | 23000 -> 22000 | 1173 -> 1122 | 374.0 | 183600 |
| forge_bloodiron_maul | bloodiron | 72 | 3 | 23000 -> 22000 | 1173 -> 1122 | 374.0 | 183600 |
| forge_bloodiron_platebody | bloodiron | 72 | 5 | 19000 -> 36500 | 969 -> 1862 | 372.4 | 183649 |
| forge_titanium_dagger | titanium | 80 | 1 | 12000 -> 8000 | 909 -> 606 | 606.0 | 272700 |
| forge_titanium_medhelm | titanium | 80 | 1 | 12000 -> 8000 | 909 -> 606 | 606.0 | 272700 |
| forge_titanium_gauntlets | titanium | 80 | 1 | 11000 -> 8000 | 834 -> 606 | 606.0 | 272700 |
| forge_titanium_sabatons | titanium | 80 | 1 | 11000 -> 8000 | 834 -> 606 | 606.0 | 272700 |
| forge_titanium_sword | titanium | 80 | 2 | 20500 -> 16000 | 1554 -> 1213 | 606.5 | 272925 |
| forge_titanium_scimitar | titanium | 80 | 2 | 20500 -> 16000 | 1554 -> 1213 | 606.5 | 272925 |
| forge_titanium_mace | titanium | 80 | 2 | 20500 -> 16000 | 1554 -> 1213 | 606.5 | 272925 |
| forge_titanium_axe | titanium | 80 | 2 | 20500 -> 16000 | 1554 -> 1213 | 606.5 | 272925 |
| forge_titanium_battleaxe | titanium | 81 | 2 | 21000 -> 16000 | 1672 -> 1274 | 637.0 | 286650 |
| forge_titanium_spear | titanium | 81 | 2 | 21000 -> 16000 | 1672 -> 1274 | 637.0 | 286650 |
| forge_titanium_fullhelm | titanium | 81 | 2 | 12000 -> 16000 | 956 -> 1274 | 637.0 | 286650 |
| forge_titanium_kiteshield | titanium | 81 | 2 | 16000 -> 16000 | 1274 -> 1274 | 637.0 | 286650 |
| forge_titanium_platelegs | titanium | 81 | 3 | 18000 -> 24000 | 1433 -> 1911 | 637.0 | 286650 |
| forge_titanium_towershield | titanium | 81 | 3 | 18000 -> 24000 | 1433 -> 1911 | 637.0 | 286650 |
| forge_titanium_chainbody | titanium | 81 | 4 | 20000 -> 32000 | 1593 -> 2548 | 637.0 | 286650 |
| forge_titanium_greataxe | titanium | 82 | 3 | 25000 -> 24000 | 2092 -> 2008 | 669.3 | 301200 |
| forge_titanium_greatsword | titanium | 82 | 3 | 25000 -> 24000 | 2092 -> 2008 | 669.3 | 301200 |
| forge_titanium_maul | titanium | 82 | 3 | 25000 -> 24000 | 2092 -> 2008 | 669.3 | 301200 |
| forge_titanium_platebody | titanium | 82 | 5 | 21000 -> 40000 | 1757 -> 3347 | 669.4 | 301230 |
| forge_aetherium_dagger | aetherium | 90 | 1 | 13000 -> 8500 | 1616 -> 1057 | 1057.0 | 447671 |
| forge_aetherium_medhelm | aetherium | 90 | 1 | 13000 -> 8500 | 1616 -> 1057 | 1057.0 | 447671 |
| forge_aetherium_gauntlets | aetherium | 90 | 1 | 12000 -> 8500 | 1492 -> 1057 | 1057.0 | 447671 |
| forge_aetherium_sabatons | aetherium | 90 | 1 | 12000 -> 8500 | 1492 -> 1057 | 1057.0 | 447671 |
| forge_aetherium_sword | aetherium | 90 | 2 | 22500 -> 17500 | 2797 -> 2176 | 1088.0 | 447634 |
| forge_aetherium_scimitar | aetherium | 90 | 2 | 22500 -> 17500 | 2797 -> 2176 | 1088.0 | 447634 |
| forge_aetherium_mace | aetherium | 90 | 2 | 22500 -> 17500 | 2797 -> 2176 | 1088.0 | 447634 |
| forge_aetherium_axe | aetherium | 90 | 2 | 22500 -> 17500 | 2797 -> 2176 | 1088.0 | 447634 |
| forge_aetherium_battleaxe | aetherium | 91 | 2 | 23000 -> 17500 | 3005 -> 2286 | 1143.0 | 470263 |
| forge_aetherium_spear | aetherium | 91 | 2 | 23000 -> 17500 | 3005 -> 2286 | 1143.0 | 470263 |
| forge_aetherium_fullhelm | aetherium | 91 | 2 | 13000 -> 17500 | 1698 -> 2286 | 1143.0 | 470263 |
| forge_aetherium_kiteshield | aetherium | 91 | 2 | 17000 -> 17500 | 2221 -> 2286 | 1143.0 | 470263 |
| forge_aetherium_platelegs | aetherium | 91 | 3 | 19500 -> 26000 | 2548 -> 3397 | 1132.3 | 470354 |
| forge_aetherium_towershield | aetherium | 91 | 3 | 19500 -> 26000 | 2548 -> 3397 | 1132.3 | 470354 |
| forge_aetherium_chainbody | aetherium | 91 | 4 | 22000 -> 34500 | 2874 -> 4507 | 1126.8 | 470296 |
| forge_aetherium_greataxe | aetherium | 92 | 3 | 27000 -> 26000 | 3706 -> 3569 | 1189.7 | 494169 |
| forge_aetherium_greatsword | aetherium | 92 | 3 | 27000 -> 26000 | 3706 -> 3569 | 1189.7 | 494169 |
| forge_aetherium_maul | aetherium | 92 | 3 | 27000 -> 26000 | 3706 -> 3569 | 1189.7 | 494169 |
| forge_aetherium_platebody | aetherium | 92 | 5 | 23000 -> 43500 | 3157 -> 5971 | 1194.2 | 494152 |
| forge_godiron_dagger | godiron | 95 | 1 | 15000 -> 10000 | 2389 -> 1593 | 1593.0 | 573480 |
| forge_godiron_medhelm | godiron | 95 | 1 | 15000 -> 10000 | 2389 -> 1593 | 1593.0 | 573480 |
| forge_godiron_gauntlets | godiron | 95 | 1 | 14000 -> 10000 | 2230 -> 1593 | 1593.0 | 573480 |
| forge_godiron_sabatons | godiron | 95 | 1 | 14000 -> 10000 | 2230 -> 1593 | 1593.0 | 573480 |
| forge_godiron_sword | godiron | 95 | 2 | 26500 -> 19500 | 4220 -> 3105 | 1552.5 | 573231 |
| forge_godiron_scimitar | godiron | 95 | 2 | 26500 -> 19500 | 4220 -> 3105 | 1552.5 | 573231 |
| forge_godiron_mace | godiron | 95 | 2 | 26500 -> 19500 | 4220 -> 3105 | 1552.5 | 573231 |
| forge_godiron_axe | godiron | 95 | 2 | 26500 -> 19500 | 4220 -> 3105 | 1552.5 | 573231 |
| forge_godiron_battleaxe | godiron | 97 | 2 | 27000 -> 19500 | 4747 -> 3429 | 1714.5 | 633046 |
| forge_godiron_spear | godiron | 97 | 2 | 27000 -> 19500 | 4747 -> 3429 | 1714.5 | 633046 |
| forge_godiron_fullhelm | godiron | 97 | 2 | 15000 -> 19500 | 2637 -> 3429 | 1714.5 | 633046 |
| forge_godiron_kiteshield | godiron | 97 | 2 | 19000 -> 19500 | 3341 -> 3429 | 1714.5 | 633046 |
| forge_godiron_platelegs | godiron | 97 | 3 | 23000 -> 29500 | 4044 -> 5187 | 1729.0 | 632990 |
| forge_godiron_towershield | godiron | 97 | 3 | 23000 -> 29500 | 4044 -> 5187 | 1729.0 | 632990 |
| forge_godiron_chainbody | godiron | 97 | 4 | 26000 -> 39500 | 4572 -> 6945 | 1736.3 | 632962 |
| forge_godiron_greataxe | godiron | 99 | 3 | 31000 -> 29500 | 6018 -> 5727 | 1909.0 | 698888 |
| forge_godiron_greatsword | godiron | 99 | 3 | 31000 -> 29500 | 6018 -> 5727 | 1909.0 | 698888 |
| forge_godiron_maul | godiron | 99 | 3 | 31000 -> 29500 | 6018 -> 5727 | 1909.0 | 698888 |
| forge_godiron_platebody | godiron | 99 | 6 | 27000 -> 59000 | 5242 -> 11454 | 1909.0 | 698888 |

s_t je Tier (Mittel s/Barren, aus Ist-Dauern): copper 2.27 · bronze 2.85 · iron 2.93 · steel 4.61 · blacksteel 5.18 · mithril 5.12 · adamantium 5.82 · runite 6.69 · bloodiron 7.25 · titanium 7.95 · aetherium 8.66 · godiron 9.87
