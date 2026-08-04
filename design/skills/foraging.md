# Foraging — Ausbau-Plan (PLAN-ONLY)

**Autor:** balance-designer · **Status:** Entwurf zur Umsetzung durch content-dev · **Stand:** 2026-06-26

Dieses Dokument plant den Ausbau des Skills **Foraging** (`trains: "lck"`) als *aktive,
RNG-lastige Wildernte*. Foraging ist im Utility-Modell die **erste Stufe**:

> Foraging/Farming → Herblore/Inscription → Kampf-/Skilling-Power

Foraging ist EINE von zwei Quellen für die Übergabe-Items (die andere ist Farming).
Es liefert die **wilden** Varianten und ist (Mit-)Quelle für die Vertrags-Linien A (Kräuter, wild),
B (Essenzen, allein), E (Pilze, allein) und **anteilig** C (Pigmentpflanzen).

---

## 1. Was es schon gibt (Bestandsaufnahme — NICHT duplizieren)

Bestehende Foraging-Aktionen in `packages/content/src/index.ts` (~Z. 4227–4323):

| Aktion | Lvl | Dauer | XP | liefert (Legacy-IDs) |
|---|---|---|---|---|
| `forage_ashfields` | 1 | 3200 | 2 | graywort, ashen_dust, +3 Samen |
| `forage_deepwood` | 15 | 5000 | 4 | frostvine, deathmoss, ashen_dust, bloodbeet_seed |
| `forage_blightmarsh` | 25 | 4800 | 5 | witchgrass, +2 Samen |
| `forage_cinderwood` | 40 | 5400 | 11 | emberleaf, ashen_dust, +2 Samen |
| `forage_frostmire` | 55 | 6200 | 26 | rimecap, +2 Samen |
| `forage_gloomfen` | 70 | 7000 | 62 | gloomspore, +2 Samen |
| `forage_voidheath` | 85 | 7800 | 145 | voidbloom, wraithcap_seed |
| `forage_gravewood` | 95 | 8800 | 270 | grave_lily, godbloom_seed |
| `forage_feathers` | 5 | 4200 | 3 | feather, birds_nest, raw_chicken |

**Wichtig:** Diese 8 Region-Aktionen liefern **Legacy-Kräuter** (graywort, witchgrass,
emberleaf, rimecap, gloomspore, voidbloom, grave_lily) und **Farming-Samen** — sie nutzen
**NICHT** die Cross-Skill-Vertrags-IDs. Sie bleiben als „gemischte Wild-Ernte / Samen-Quelle
für Farming" bestehen (kein Bruch). Der Ausbau unten fügt **dedizierte, sauber benannte
Aktionen** hinzu, deren *Primär-Output* je genau ein Vertrags-Item ist. So bleibt die
Herblore/Inscription-Schnittstelle eindeutig, ohne den bestehenden Farming-Samen-Loop zu stören.

`forage_feathers` (L5) bleibt unverändert (Bogenbauer-Selbstversorgung).

---

## 2. Cross-Skill-Vertrag — wofür Foraging (Mit-)Quelle ist

| Linie | Item-IDs (T1→T5) | Foraging? | Senke |
|---|---|---|---|
| **A) Kräuter (wild)** | herb_marshroot, herb_bloodthistle, herb_gravemoss, herb_nightbloom, herb_godsbreath | **Mit-Quelle** (wild) — Farming liefert kultiviert | Herblore |
| **B) Essenzen** | essence_ash, essence_mire, essence_grave, essence_void, essence_divine | **Allein-Quelle** | Herblore + Inscription |
| **C) Pigmente** | pigment_umber (T1-2), pigment_verdant (T3), pigment_violet (T4), pigment_radiant (T5) | **Mit-Quelle** (Pigmentpflanzen) — Farming liefert Rest | Inscription |
| **D) Schilf/Faser** | reed_pale, reed_iron, reed_void | — (reine Farming-Quelle) | Inscription |
| **E) Pilze** | fungus_soot, fungus_pale, fungus_grave, fungus_void, fungus_god | **Allein-Quelle** | Herblore |

> Für Herblore/Inscription gilt: Foraging garantiert die **alleinige** Versorgung mit
> **Essenzen (B)** und **Pilzen (E)**. Bei **Kräutern (A)** und **Pigmenten (C)** teilt es
> sich die Versorgung mit Farming — wild = sofort, aber RNG; kultiviert = planbar, aber Wartezeit.

---

## 3. Neue Flavor-/Verkaufs-Items (von content-dev in ITEMS anzulegen)

Skill-eigene Reagenzien/Verkaufsgut (Dark-Fantasy, kreative Lizenz). Werte als Platzhalter:

| Item-ID | Name (en / de) | type | value | rarity | Rolle |
|---|---|---|---|---|---|
| `wildhive_honey` | Wildhive Honey / Wildwaben-Honig | material | 12 | — | T1 Verkaufsgut + späteres Food-Reagenz |
| `witchlight_dust` | Witchlight Dust / Irrlicht-Staub | material | 45 | magic | T2–T3 seltenes Reagenz (Herblore-Bonus-Hook) |
| `gravensap` | Gravensap / Grabharz | material | 130 | rare | T4 seltenes Reagenz (Inscription-Bonus-Hook) |
| `starcap_truffle` | Starcap Truffle / Sternkappen-Trüffel | material | 420 | epic | T5 Luxus-Verkaufsgut (Gold-Sink-Gegengewicht) |

Roh-Edelsteine als seltener Beifang nutzen **bestehende** IDs
(`rough_garnet`, `rough_sapphire`, `rough_ruby`, `rough_diamond`) — analog zur Mining-Leiter.

---

## 4. Master-Tabelle: 20 neue Aktionen (T1–T5)

Pro Tier vier Linien (Kraut · Pilz · Essenz · Pigment), **gestaffelte Level** für eine
glatte Leiter (viele Sprossen, keine Plateaus/Klippen). XP folgen der Zielkurve
`xp = round(target_xph(Lvl) · Dauer/3.6e6)` (siehe §6 Begründung).

| Tier | Aktion-ID | Lvl | Dauer (ms) | Primär-Output (Vertrag) | XP |
|---|---|---|---|---|---|
| T1 | `forage_marshroot` | 1 | 3000 | **herb_marshroot** (A) | 2 |
| T1 | `forage_sootcaps` | 6 | 3400 | **fungus_soot** (E) | 2 |
| T1 | `forage_ash_essence` | 12 | 3800 | **essence_ash** (B) | 2 |
| T1 | `forage_umber_pods` | 18 | 4200 | **pigment_umber** (C) | 2 |
| T2 | `forage_bloodthistle` | 22 | 4600 | **herb_bloodthistle** (A) | 3 |
| T2 | `forage_palefungus` | 27 | 5000 | **fungus_pale** (E) | 4 |
| T2 | `forage_mire_essence` | 33 | 5400 | **essence_mire** (B) | 6 |
| T2 | `forage_umber_thickets` | 38 | 5600 | **pigment_umber** (C, reicher) | 8 |
| T3 | `forage_gravemoss` | 42 | 5800 | **herb_gravemoss** (A) | 10 |
| T3 | `forage_gravefungus` | 47 | 6000 | **fungus_grave** (E) | 13 |
| T3 | `forage_grave_essence` | 53 | 6300 | **essence_grave** (B) | 19 |
| T3 | `forage_verdant_blooms` | 58 | 6600 | **pigment_verdant** (C) | 25 |
| T4 | `forage_nightbloom` | 62 | 6800 | **herb_nightbloom** (A) | 32 |
| T4 | `forage_voidfungus` | 67 | 7100 | **fungus_void** (E) | 42 |
| T4 | `forage_void_essence` | 73 | 7400 | **essence_void** (B) | 59 |
| T4 | `forage_violet_petals` | 78 | 7700 | **pigment_violet** (C) | 79 |
| T5 | `forage_godsbreath` | 82 | 7900 | **herb_godsbreath** (A) | 99 |
| T5 | `forage_godfungus` | 87 | 8200 | **fungus_god** (E) | 132 |
| T5 | `forage_divine_essence` | 93 | 8600 | **essence_divine** (B) | 186 |
| T5 | `forage_radiant_blooms` | 97 | 8900 | **pigment_radiant** (C) | 235 |

> `pigment_umber` deckt laut Vertrag T1–T2 ab → bewusst **zwei** Aktionen (`forage_umber_pods`
> L18 + `forage_umber_thickets` L38), damit der frühe Tinten-Loop nicht 20 Level lang von
> einer einzigen Quelle abhängt. Die spätere Aktion gibt mehr Stück pro Ernte (siehe §5).

Optional 3 Flavor-Aktionen (kein Vertrag, reine Identität/Gold — empfohlen, nicht zwingend):

| Tier | Aktion-ID | Lvl | Dauer | Primär-Output | XP |
|---|---|---|---|---|---|
| T1 | `forage_wildhives` | 9 | 3600 | `wildhive_honey` | 2 |
| T3 | `forage_witchlights` | 50 | 6200 | `witchlight_dust` | 16 |
| T5 | `forage_starcaps` | 90 | 8400 | `starcap_truffle` | 158 |

---

## 5. Loot-Detail pro Aktion (Chancen = Platzhalter)

Foraging = RNG-Wildernte → Primär-Output **nicht** garantiert (anders als Mining `chance:1`).
Primärchance ~0.55–0.70, dazu thematischer Beifang (Nachbar-Linie / Roh-Edelstein / Flavor).

**T1**
- `forage_marshroot` — `herb_marshroot` 0.65 (1–2) · `fungus_soot` 0.20 (1) · `wildhive_honey` 0.10 (1)
- `forage_sootcaps` — `fungus_soot` 0.70 (1–2) · `essence_ash` 0.15 (1) · `rough_garnet` 0.010 (1)
- `forage_ash_essence` — `essence_ash` 0.60 (1–2) · `herb_marshroot` 0.20 (1) · `pigment_umber` 0.08 (1)
- `forage_umber_pods` — `pigment_umber` 0.65 (1–2) · `essence_ash` 0.15 (1) · `rough_garnet` 0.010 (1)

**T2**
- `forage_bloodthistle` — `herb_bloodthistle` 0.65 (1–2) · `fungus_pale` 0.20 (1) · `witchlight_dust` 0.05 (1)
- `forage_palefungus` — `fungus_pale` 0.68 (1–2) · `essence_mire` 0.16 (1) · `rough_sapphire` 0.010 (1)
- `forage_mire_essence` — `essence_mire` 0.60 (1–2) · `herb_bloodthistle` 0.18 (1) · `pigment_umber` 0.10 (1)
- `forage_umber_thickets` — `pigment_umber` 0.70 (2–3) · `essence_mire` 0.15 (1) · `witchlight_dust` 0.05 (1)

**T3**
- `forage_gravemoss` — `herb_gravemoss` 0.62 (1–2) · `fungus_grave` 0.20 (1) · `witchlight_dust` 0.06 (1)
- `forage_gravefungus` — `fungus_grave` 0.66 (1–2) · `essence_grave` 0.16 (1) · `rough_ruby` 0.010 (1)
- `forage_grave_essence` — `essence_grave` 0.58 (1–2) · `herb_gravemoss` 0.18 (1) · `pigment_verdant` 0.08 (1)
- `forage_verdant_blooms` — `pigment_verdant` 0.62 (1–2) · `essence_grave` 0.14 (1) · `rough_ruby` 0.012 (1)

**T4**
- `forage_nightbloom` — `herb_nightbloom` 0.60 (1–2) · `fungus_void` 0.18 (1) · `gravensap` 0.05 (1)
- `forage_voidfungus` — `fungus_void` 0.64 (1–2) · `essence_void` 0.15 (1) · `rough_diamond` 0.010 (1)
- `forage_void_essence` — `essence_void` 0.56 (1–2) · `herb_nightbloom` 0.16 (1) · `pigment_violet` 0.08 (1)
- `forage_violet_petals` — `pigment_violet` 0.60 (1–2) · `essence_void` 0.14 (1) · `gravensap` 0.05 (1)

**T5**
- `forage_godsbreath` — `herb_godsbreath` 0.55 (1–2) · `fungus_god` 0.16 (1) · `starcap_truffle` 0.04 (1)
- `forage_godfungus` — `fungus_god` 0.60 (1–2) · `essence_divine` 0.14 (1) · `rough_diamond` 0.012 (1)
- `forage_divine_essence` — `essence_divine` 0.52 (1–2) · `herb_godsbreath` 0.14 (1) · `pigment_radiant` 0.07 (1)
- `forage_radiant_blooms` — `pigment_radiant` 0.55 (1–2) · `essence_divine` 0.12 (1) · `starcap_truffle` 0.04 (1)

**Flavor (optional)**
- `forage_wildhives` — `wildhive_honey` 0.80 (1–3) · `birds_nest` 0.05 (1)
- `forage_witchlights` — `witchlight_dust` 0.55 (1–2) · `essence_grave` 0.12 (1)
- `forage_starcaps` — `starcap_truffle` 0.45 (1) · `fungus_god` 0.18 (1) · `rough_diamond` 0.015 (1)

> Beifang-Designregel: Jede Aktion droppt ihren Primär-Output + **eine Nachbar-Linie**
> (damit Herblore/Inscription nie an einer einzigen Aktion verhungern) + seltenen Bonus.
> Bewusst KEINE Farming-Samen in den neuen Aktionen — Samen bleiben Sache der 8 Legacy-Region-Aktionen.

---

## 6. Begründung & Balance-Check

**XP-Kurve.** Alle XP-Werte folgen `target_xph(L) = 90·sqrt(xpForLevel(L+1)−xpForLevel(L))`,
verifiziert gegen `packages/engine/src/leveling.ts`. Stichproben (Dauer aus Tabelle):

| Lvl | Ziel xp/h | gewählte XP → effektive xp/h |
|---|---|---|
| 1 | ~820 | 2 → ~2400 (Rundungsboden, wie Legacy `forage_ashfields`=2) |
| 33 | ~4000 | 6 → ~4000 ✓ |
| 53 | ~10750 | 19 → ~10860 ✓ |
| 73 | ~28940 | 59 → ~28700 ✓ |
| 93 | ~77890 | 186 → ~77860 ✓ |
| 97 | ~94950 | 235 → ~95060 ✓ |

Die T1-Werte runden formal auf 1; **empfohlen sind 2 XP** (an die bestehenden T1-Aktionen
angeglichen), damit sich der Einstieg nicht „leer" anfühlt. Kein einziger 0-XP/h-Fall.
Die Dauer-Leiter (3000 → 8900 ms) steigt monoton wie Mining (3000 → 7800+) → identisches
„Idle-Gefühl" pro Tick, keine Klippen.

**Gather-Parität.** Dauern, Level-Gates und XP spiegeln die Mining-Leiter
(`mine_iron` L10/3600/3 … `mine_titanium` L80/7800/115) und die Legacy-Foraging-Leiter
fast 1:1 → Foraging bleibt mit den anderen Gather-Skills vergleichbar, ohne sie zu überholen.

**Progressions-Gefühl (Leiter statt Sprünge).** 20 neue Aktionen, im 5er-Raster über je 20
Level gestaffelt (z. B. T3: 42 · 47 · 50 · 53 · 58) → durchschnittlich alle ~4–5 Level eine
neue freischaltbare Aktion. Kein Tier-Plateau, kein 20-Level-Loch.

**Cross-Skill-Garantie.** Nach Umsetzung deckt Foraging **alle 5 Tier** der Linien A (wild),
B und E sowie die Foraging-Anteile von C lückenlos ab. Herblore und Inscription können
damit ab L1 durchgehend mit Inputs versorgt werden — geteilt mit Farming bei A und C,
exklusiv bei B und E.

**Identität.** Wild = RNG (Primärchance < 1, dafür mehrere Linien pro Ernte + seltene
Flavor-Drops/Edelsteine). Farming wird im Gegenzug planbar-aber-langsam — die beiden
Quellen bleiben spielmechanisch unterscheidbar.

---

## 7. Apply-Liste für content-dev (geordnet)

1. **ITEMS anlegen** — Vertrags-Items, die noch fehlen (prüfen!), als `type:"material", stackable:true`:
   `herb_marshroot, herb_bloodthistle, herb_gravemoss, herb_nightbloom, herb_godsbreath` ·
   `essence_ash, essence_mire, essence_grave, essence_void, essence_divine` ·
   `fungus_soot, fungus_pale, fungus_grave, fungus_void, fungus_god` ·
   `pigment_umber, pigment_verdant, pigment_violet, pigment_radiant`.
   Rarity grob nach Tier: T1 — / T2 magic / T3 magic / T4 rare / T5 epic. Werte aufsteigend
   (z. B. herb: 6/14/30/70/150; essence/fungus etwas höher; pigment ~ Faktor 1,5).
2. **Flavor-ITEMS anlegen** — `wildhive_honey, witchlight_dust, gravensap, starcap_truffle` (Werte §3).
3. **20 Vertrags-Aktionen** aus §4/§5 hinzufügen (ID, `skill:"foraging"`, `durationMs`, `xp`,
   `levelRequired`, `loot`). T1-XP auf 2 setzen (nicht 1).
4. **3 Flavor-Aktionen** (optional) aus §4/§5 hinzufügen.
5. **Legacy-Aktionen unverändert lassen** (Samen-/Farming-Loop) — nur prüfen, dass keine ID kollidiert.
6. **Save-Logik:** Keine neuen State-Felder → keine Migration nötig; nur neue Item-/Action-IDs.
   Trotzdem MEMORY-Regel „Save-Logik mitziehen" gegenchecken, falls Bank-Slots fix sind.
7. **Achievements:** bestehende `ach_skill_foraging_*` decken die Level-Leiter bereits ab — nichts zu tun.
8. **Verifizieren:** `pnpm test` (Turbo-Cache ggf. leeren) → Sim-Block prüfen: jede neue
   Aktion > 0 XP/h, kein Loot-Verweis auf eine fehlende Item-ID.
