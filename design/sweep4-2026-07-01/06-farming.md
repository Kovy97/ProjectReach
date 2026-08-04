# Sweep 4 — Farming (Ackerbau) Deep-Dive & Note

**Agent:** Skill-Deep-Dive #06 · **Datum:** 2026-07-01 · **Methode:** echter Engine-Treiber (headless),
`createGame` + `tickFarmPlots`/`advance` über die reale Ernte-Engine (`grantHarvest`), engine-gemessene
XP/h je Level-Band (Ist = Analytik exakt), `advance()`-Spot-Checks (L1/L46/L84 deckungsgleich),
Witherling-Force-Drop über den echten Ernte-Pfad, Ökonomie- + Freischalt-Kadenz-Analyse. Temp-Skript
`farming-sweep.test.ts` (7 Tests, alle grün) nach dem Lauf **gelöscht**. Kein Spiel-Code geändert.

**NOTE: B−** — mechanisch sauberes, exakt getuntes **passives** Plot-System: XP/h **monoton** steigend
über L1→99, keine toten/regressiven Tiers, alle Sweep-2/3-Fixes bestätigt (reed_iron L46, reed_void
L84, duskcap-L56-Füller). Kein Combat-Gate (alle 30 Saaten im Shop), 29/30 Crops speisen
Cooking/Herblore/Scribing — starke Vernetzung. Abzüge: **duskcap-Ernte ist verwaistes Content**
(kein Rezept), das **Witherling-Pet ist über normalen 1→99 praktisch unerreichbar** (~1,5 %), lange
Freischalt-Leerläufe (L70–80/L86–95), **kein Mastery** und fallender Ertragsdurchsatz. Keine P0/P1 —
ship-tauglich mit einer Content-Nacharbeit (duskcap-Sink) + zwei Balance-Empfehlungen.

---

## 1) XP/h-Kurve L1→99 — monoton, keine toten/regressiven Tiers (confirmed)

Bestes pflanzbares Crop je Band × freigeschaltete Plots. **Ist (engine-gemessen) = Soll (Analytik)
exakt** — `grantHarvest` gewährt `crop.xp` pro Ernte, ohne Mastery/Doppelwurf. Monotonie-Assertion
über 34 Level-Punkte **grün** (nie regressiv).

| Lvl | Crop | cropLvl | Plots | grow(min) | XP/h |
|----:|------|--------:|------:|----------:|-----:|
| 1 | ashroot | 1 | 3 | 10 | 360 |
| 8 | herb_marshroot | 8 | 3 | 10 | 522 |
| 10 | herb_marshroot | 8 | 4 | 10 | 696 |
| 12 | pigment_umber | 12 | 4 | 10 | 864 |
| 20 | bloodbeet | 20 | 4 | 10 | 1.272 |
| 25 | bloodgrain | 22 | 5 | 20 | 1.740 |
| 26 | herb_bloodthistle | 26 | 5 | 20 | 2.130 |
| 35 | nightshade | 35 | 5 | 20 | 3.315 |
| 40 | nightshade | 35 | 6 | 20 | 3.978 |
| 42 | soulgourd | 42 | 6 | 40 | 5.616 |
| 46 | herb_gravemoss | 46 | 6 | 40 | 6.849 |
| 50 | gallows_apple | 50 | 6 | 40 | 8.343 |
| 55 | gallows_apple | 50 | 7 | 40 | 9.734 |
| **56** | **duskcap** | 56 | 7 | 40 | **13.104** ← +35 % (Füller greift) |
| 62 | wither_leek | 62 | 7 | 80 | 17.630 |
| 70 | corpse_lily | 70 | 8 | 80 | 29.934 |
| 80 | wraithcap | 80 | 8 | 80 | 49.110 |
| 84 | pigment_radiant | 84 | 8 | 160 | 59.862 |
| 85 | pigment_radiant | 84 | 9 | 160 | 67.345 |
| 86 | herb_godsbreath | 86 | 9 | 160 | 74.355 |
| 95–99 | godbloom | 95 | 9 | 160 | 116.097 |

**Per-Plot-XP/h ist streng monoton in `levelRequired`** (eigene Assertion grün): 108 (graywort L1) →
12.900 (godbloom L95). Die in Sweep 2/3 gefundenen Typo-Regressionen sind **bestätigt gefixt**:
`reed_iron` jetzt L46 (1.142/Plot, war L26), `reed_void` jetzt L84 (7.483/Plot, war L58). Der
`duskcap`-Füller (L56, 1.872/Plot) setzt sich sauber zwischen ironvine (1.391) und wither_leek (2.519)
und glättet die alte L50–62-Lücke (ohne ihn bliebe L56–61 bei 9.734 XP/h statt 13.104).

**Progression liegt bewusst im Plot-COUNT** (3→9, `PLOT_XP_SHARE=0.15`), nicht in XP/Plot. Das
funktioniert: die Plot-Freischaltungen (L10/25/40/55/70/85) liefern spürbare +25/33 %-Sprünge.

---

## 2) Freischalt-Takt — funktioniert, aber lange Leerläufe

Crop- **und** Plot-Unlocks kombiniert. Dead-Zones (≥6 Level ohne irgendetwas Neues, Spieler pflanzt
dasselbe Crop weiter):

| Band | Level | plant durchgängig |
|------|-------|-------------------|
| L12→L20 | 8 Lvl | pigment_umber |
| L56→L62 | 6 Lvl | duskcap |
| **L70→L80** | **10 Lvl** | corpse_lily |
| L86→L95 | 9 Lvl | herb_godsbreath |

Weil Farming rein passiv ist (kein Klick, kein Werkzeug-Upgrade), verstärken diese Leerläufe die
„Set-and-forget"-Leere: zwischen L70 und L80 passiert **10 Level lang nichts Neues** — kein Crop, kein
Plot, kein Werkzeug. Kein Blocker, aber der schwächste Feel-Abschnitt.

**Werkzeug-Progression: existiert nicht.** Farming hat weder Spitzhacke/Rute-Äquivalent noch
Mastery — die einzige „Progression" ist Plot-Count + Crop-Tier. Für einen L1→99-Skill ist das dünn.

---

## 3) Ökonomie — passiv positiv, aber nicht-monoton & fallender Durchsatz

Netto-Gold/h (Ernte verkauft − Saatkosten, best-Crop je Band, alle Plots, Auto-Replant):

| Lvl | Crop | Plots | Ertrag/h | Netto-Gold/h |
|----:|------|------:|---------:|-------------:|
| 1 | ashroot | 3 | 135 | 702 |
| 20 | bloodbeet | 4 | 180 | 2.088 |
| 40 | nightshade | 6 | 162 | 3.708 |
| 56 | duskcap | 7 | 105 | 6.668 |
| **62** | **wither_leek** | 7 | 66 | **4.397** ← Dip |
| 70 | corpse_lily | 8 | 75 | 10.170 |
| 80 | wraithcap | 8 | 75 | 10.290 |
| **84** | **pigment_radiant** | 8 | 45 | **6.150** ← Dip |
| 95–99 | godbloom | 9 | 51 | 13.095 |

Zwei Punkte:
- **Gold/h ist nicht monoton** (Dips bei L62 wither_leek und L84 pigment_radiant), weil Pigment-/
  Reed-Crops niedrigen Verkaufswert haben (sie sind Herblore/Scribing-Inputs, kein Food). Gold ist
  aber nicht der Zweck des Skills → nur kosmetisch.
- **Ertragsdurchsatz FÄLLT mit dem Tier**: 135 Crops/h (L1) → 51/h (L99). growMs skaliert ×16
  (10→160 min), der Ertrag pro Ernte nur ~×2 (6–9 → 12–18). Endgame-Farming ist damit ein **dünner
  Zulieferer** für Cooking/Herblore-Bulk-Bedarf — wer godbloom/godsbreath für Tränke braucht, wartet
  lange. Exploit-frei (Saat wird beim Pflanzen abgezogen, Reife strikt gegen `elapsedMs`).

**Combat-Gate: KEINES.** Alle 30 Saaten sind im Shop kaufbar (graywort_seed 3 g … godbloom_seed
320 g). Ein reiner Skiller kann Farming ohne einen einzigen Kampf auf 99 bringen. 

---

## 4) Crops → Cooking/Herblore — sinnig verdrahtet, EINE Ausnahme

29 von 30 Crop-Erträgen sind echte Rezept-Inputs: Food-Crops (gravetato, bloodbeet, soulgourd,
ironvine, wraithcap, gallows_apple …) → **Cooking**; herb_*/mandrake_root/nightshade/emberroot/
corpse_lily_bulb/godbloom → **Herblore**; pigment_*/reed_* → **Scribing/Enchanting**. Gute
Skill-Verzahnung.

**Ausnahme (Finding F1): `duskcap`.** Der geerntete `duskcap` (Item-value 72) hat **null**
Downstream-Verwendung — kein Rezept-Input, keine Loot-Tabelle, kein Quest-Item. Er existiert nur als
(1) Item-Def und (2) Crop-`yieldItem`. Damit ist die duskcap-Ernte reines Vendor-Gut, während **jedes**
Nachbar-Crop einen Verarbeitungs-Sink hat. Das ist genau das „definiert, aber nie konsumiert"-Muster:
der Füller wurde für die XP-Lücke eingezogen (funktioniert, s. §1), aber sein Ertrag nie verdrahtet.

---

## 5) Witherling-Pet — verdrahtet & dropbar, aber über 1→99 quasi unerreichbar

`tryPetDrop({kind:"skill", skill:"farming"})` läuft pro Ernte-Zyklus in `grantHarvest` — der Pfad ist
**bestätigt aktiv**: im Force-Volume-Lauf (echte Ernte-Engine, seed 12345) fällt der Witherling nach
~28.000 Ernten. Damit ist der Sweep-3-„witherling-dropbar"-Fix confirmed.

**ABER (Finding F2):** `dropChance = 1/105.000` **pro Ernte**, und ein voller L1→99-Grind erzeugt nur
**~1.534 Ernten** (jede = 1 Wurf). ⇒ Erwartungswert ≈ **0,015 Drops**, P(≥1) ≈ **1,5 %**. Weil Farming
passiv & langsam ist (lange growMs, wenige Ernten), bekommt der Skill ~**100× weniger Würfe pro
Spielstunde** als ein aktiver Sammel-Skill (der pro Sekunde eine Aktion abschließt). Für P≈50 % bräuchte
es ~73.000 Ernten — bei T5 (9 Plots × 160 min = 3,4 Ernten/h) sind das >20.000 h reines Endgame-Farmen.
Der Witherling ist damit faktisch ein „ewig-Grind"-Pet, nicht über den normalen Skill-Pfad erreichbar.
(Für `ach_pets_all`-Completionisten relevant: nur über extrem lange Parallel-Laufzeit machbar.)

---

## 6) Mastery — für Farming NICHT vorhanden (by design, aber leere Achse)

Mastery ist in der Engine auf `action.id` gekeyt (`tick.ts` `completeAction` → `state.mastery[action.id]`).
Farming-Plots haben **keine `ActionDef`** — `grantHarvest` (farming.ts:91) berührt Mastery bewusst nicht
(„Plots speisen KEINE Mastery"). Es gibt auch **keine** aktiven `farm_*`-Aktionen mehr. Ergebnis:
Farming hat **null Mastery-Progression** — die komplette Mastery-Belohnungs-Achse (Doppelertrag,
Preserve, Speed, Pool-Boni) fehlt für diesen Skill. Das ist eine bewusste Design-Entscheidung, aber
für die Frage „Mastery spürbar/lohnend?" lautet die Antwort schlicht: **es gibt keine**. Ein
Completionist, der „alle Mastery" jagt, muss wissen, dass Farming hier nichts beiträgt.

---

## Findings (schwerste zuerst)

- **[P2][content] `duskcap`-Ernte ist verwaistes Content** — *confirmed.*
  Repro: `content.crops.duskcap.yieldItem = "duskcap"`; `grep "\"duskcap\""` → nur Item-Def
  (`content/src/index.ts:581`, value 72) + Crop-Def (`:13879`). Kein Rezept-Input/Loot/Quest.
  Erwartet: wie alle 29 Nachbar-Crops einen Cooking/Herblore-Sink. Tatsächlich: nur Vendor-Gut.
  **Owner: content-dev** (duskcap als Herblore- oder Cooking-Input verdrahten, z.B. Trank/Extrakt).

- **[P3][balance/feel] Witherling über 1→99 praktisch unerreichbar** — *confirmed.*
  Evidence: dropChance 1/105.000 pro Ernte; voller Grind ≈ 1.534 Ernten ⇒ P(≥1) ≈ 1,5 %
  (`content/src/index.ts:13417`). Fix ist verdrahtet (Force-Drop @~28k Ernten), aber die Rate passt
  nicht zum passiven, ernte-armen Skill. Soll-Vorschlag: dropChance ~5–8× anheben (≈ **1/15.000** pro
  Ernte → P(1→99) ≈ 10 %) **oder** pro-Ernte-Wurf um `yieldMenge` skalieren. **Owner: content-dev/balance.**

- **[P3][balance] Lange Freischalt-Leerläufe** — *confirmed.*
  L70→L80 (10 Lvl), L86→L95 (9 Lvl), L12→L20 (8 Lvl) ohne neues Crop/Plot. Soll-Vorschlag: je ein
  Zwischen-Crop bei ~L75 (T4, zwischen corpse_lily 3.742 und wraithcap 6.139/Plot) und ~L90 (T5)
  einziehen. **Owner: content-dev/balance.**

## Verbesserungen (mit Zahlen)

1. **duskcap-Sink** einziehen (Herblore-Trank oder Cooking-Gericht mit `duskcap` als Input) — schließt
   den einzigen Content-Loch-Crop, macht den L56-Füller vollwertig statt Vendor-Trash.
2. **Witherling-Rate ~1/15.000/Ernte** (5–8× hoch) oder yield-skaliert — bringt P(1→99) von 1,5 % auf
   ~10 %, ohne den Pet trivial zu machen; passt an das ernte-arme, passive Profil des Skills an.
3. **Zwei Zwischen-Crops (~L75, ~L90)** + optional eine leichte **Mastery- oder Werkzeug-Achse**
   (z.B. „Kompost/Dünger"-Tiers, die growMs senken oder Ertrag heben) — gäbe dem passiven Skill eine
   spürbare Fortschritts-Schleife jenseits von reinem Plot-Count und füllte die Leerläufe.

---

### Zusammenfassung
Farming ist ein **funktionierendes, exakt getuntes** passives Plot-System: XP/h monoton, keine
Regressionen, alle Sweep-2/3-Fixes bestätigt, kein Combat-Gate, starke Cooking/Herblore-Vernetzung.
Es verliert Punkte für **einen verwaisten Crop (duskcap)**, ein **über den Skill-Pfad quasi
unerreichbares Pet**, **lange Unlock-Leerläufe**, **fallenden Ertragsdurchsatz** und das **komplette
Fehlen von Mastery/Werkzeugen**. Als „Idle-Skiller im Hintergrund" solide, als eigenständig gespielter
L1→99-Skill etwas flach. **NOTE: B−. Empfehlung: ship** (duskcap-Sink als einzige echte Nacharbeit).
