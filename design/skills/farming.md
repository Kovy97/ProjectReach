# Farming — Ausbau-Plan (PLAN-ONLY)

> Balance-Designer Spec. **Keine** Content-/Code-Änderung — Zahlen sind implementierungsreife Vorschläge für content-dev.
> Quelle der Wahrheit für die Ist-Zahlen: `packages/content/src/index.ts` (Aktionen ab `farm_*`/`gather_graywort`, Items ab Zeile ~235/267).

## 1. Rolle im Utility-Modell

Chef-Kette: **Foraging/Farming → Herblore/Inscription → Power**.

Farming = die **idle/erneuerbare** Quelle: säen → (lange) Wachszeit → ernten. Perfekt fürs Idle-Game, weil eine Aktion über die Offline-Progress-Engine weiterläuft. Farming ist die **zweite Kräuterquelle** (neben wildem Foraging) mit **höherer Ausbeute pro Zyklus**, dafür an Saatgut gebunden (Saat droppt beim Foraging → die beiden Skills greifen ineinander).

Farming liefert konkret:
- **A) Kräuter — kultivierte Variante** (gleiche Vertrags-IDs wie wild geforagt, höhere Ausbeute) → Senke **Herblore**
- **C) Pigmentpflanzen** → Tinte → Senke **Inscription**
- **D) Schilf/Faser** → Pergament → Senke **Inscription**
- **Cooking-Crops** (Gemüse/Getreide) → Senke **Cooking**
- **Flavor-Crops** (Loop-Würze, kein Vertrag)

## 2. Datenmodell-Realität & Idle-Mechanik

Im aktuellen Build hat Farming **kein** separates `growTime`-Feld — eine Farm-Aktion ist eine Gathering-Style-Aktion mit `durationMs`, `inputs` (Saat), `loot` (Ernte). Das Idle/Offline-Verhalten kommt **gratis** aus der Tick-/Offline-Progress-Engine: eine laufende Aktion produziert offline weiter.

→ **Plan knüpft an dieses Modell an**: Die Wachszeit *ist* `durationMs`. Damit Farming sich nach „pflanzen & warten" anfühlt (nicht nach Klick-Gathering), nutzen die neuen erneuerbaren Crops **deutlich längere `durationMs`** (60–240 s) mit **größerem Batch-Output** — der XP/h-Wert bleibt auf der Zielkurve, aber der Spieler sät selten und erntet offline in Mengen. Das ist der bewusste Idle-Hebel.

> **Hinweis an logic-dev/Chef (out of scope für content-dev):** Ein echtes Beet-System (mehrere parallele Plots mit eigenem Timer, ohne dass die aktive Aktion blockiert) wäre die „große" Idle-Ausbaustufe. Dieser Plan braucht es **nicht** — er ist mit dem heutigen Single-Action-Modell sofort umsetzbar. Falls Beete später kommen, bleiben Level/XP/Output gleich; nur die Parallelität ändert sich.

## 3. Zielkurve & Audit der Ist-Aktionen

`target_xph(L) = 90·sqrt(xpForLevel(L+1) − xpForLevel(L))`.
XP einer Aktion: `xp = round(target_xph(level) · durationMs / 3_600_000)`, min 1.

Ist-Farming liegt konsistent **~1,25–1,3×** über der nackten Kurve — gewollter „Renewable-Premium" (Farming kostet Saat + Wartezeit, darf also etwas heißer sein als reines Foraging). Ausnahme: die drei **L1-Starter sind zu heiß (1,95–2,5×)**:

| Aktion | Lvl | dur | xp | xph (ist) | target | ratio | Befund |
|---|---|---|---|---|---|---|---|
| farm_ashroot | 1 | 6000 | 3 | 1800 | 820 | 2.20 | heiß |
| gather_graywort | 1 | 4500 | 2 | 1600 | 820 | 1.95 | heiß |
| farm_grimwheat | 1 | 7000 | 4 | 2057 | 820 | 2.51 | heiß |
| farm_bloodbeet | 20 | 9000 | 8 | 3200 | 2107 | 1.52 | leicht heiß |
| farm_nightshade | 35 | 10000 | 16 | 5760 | 4417 | 1.30 | ok |
| farm_ironvine | 50 | 11000 | 36 | 11782 | 9271 | 1.27 | ok |
| farm_emberroot | 65 | 12000 | 83 | 24900 | 19475 | 1.28 | ok |
| farm_wraithcap | 80 | 13000 | 190 | 52615 | 40923 | 1.29 | ok |
| farm_godbloom | 95 | 14000 | 425 | 109286 | 85997 | 1.27 | ok |

**Optionaler Tune-Down (nicht zwingend, eigene Apply-Liste B):** Starter auf ~1,25× bringen, indem XP gesenkt wird: `farm_ashroot` xp 3→2 (xph 1200), `gather_graywort` belassen oder xp 2→1 (xph 800), `farm_grimwheat` xp 4→2 (xph 1029). Niedriges Level → kleine Absolutwerte, geringe Auswirkung; nur Kosmetik der Kurve. Neue Crops unten sind bereits sauber auf 1,25× gesetzt.

Alle neuen Aktionen sind mit **Faktor 1,25** auf der Kurve gerechnet → kein 0-XP/h, keine Cliffs.

## 4. Neue Crops — Spec-Tabellen

Tiers: **T1**(1–20) · **T2**(21–40) · **T3**(41–60) · **T4**(61–80) · **T5**(81–99).
„Wachszeit" = `durationMs` (= Zyklusdauer, läuft offline weiter). Output = `loot` min–max @ chance 1.

### 4A) Kräuter — KULTIVIERTE Variante (Vertrag A) → Senke Herblore

Gleiche Item-IDs wie die wilde Foraging-Variante, **höherer Batch** (Foraging gibt ~1–2/Zyklus bei kurzer Dauer; Farming gibt 4–6 bei langer Dauer). Lange Grow-Zeit = klarer Idle-Charakter.

| Tier | Aktion-ID | Crop-Item (Vertrag) | Saat-Item | Lvl | Wachszeit | Output | XP |
|---|---|---|---|---|---|---|---|
| T1 | `farm_marshroot` | `herb_marshroot` | `marshroot_seed` | 8 | 90 s | 4–6 | 36 |
| T2 | `farm_bloodthistle` | `herb_bloodthistle` | `bloodthistle_seed` | 26 | 120 s | 4–6 | 118 |
| T3 | `farm_gravemoss` | `herb_gravemoss` | `gravemoss_seed` | 46 | 150 s | 4–6 | 396 |
| T4 | `farm_nightbloom` | `herb_nightbloom` | `nightbloom_seed` | 66 | 180 s | 4–6 | 1279 |
| T5 | `farm_godsbreath` | `herb_godsbreath` | `godsbreath_seed` | 86 | 240 s | 4–6 | 4590 |

> **Schnittstelle:** `herb_*`-IDs sind der gemeinsame Cross-Skill-Vertrag. Foraging liefert sie **wild** (niedriger Yield, keine Saat nötig), Farming **kultiviert** (höher, Saat-gebunden). Herblore konsumiert beide identisch. Saat-Items (`*_seed`) müssen als Foraging-Drop existieren (analog heutiger `bloodbeet_seed` etc.) — Drop-Tabellen-Erweiterung an content-dev/Foraging-Spec.

### 4C) Pigmentpflanzen (Vertrag C) → Tinte → Senke Inscription

| Tier | Aktion-ID | Crop-Item (Vertrag) | Saat-Item | Lvl | Wachszeit | Output | XP |
|---|---|---|---|---|---|---|---|
| T1–2 | `farm_umberleaf` | `pigment_umber` | `umberleaf_seed` | 12 | 60 s | 3–5 | 30 |
| T3 | `farm_verdantcap` | `pigment_verdant` | `verdantcap_seed` | 44 | 90 s | 3–5 | 215 |
| T4 | `farm_violetbloom` | `pigment_violet` | `violetbloom_seed` | 64 | 120 s | 3–5 | 772 |
| T5 | `farm_radiantbloom` | `pigment_radiant` | `radiantbloom_seed` | 84 | 150 s | 3–5 | 2598 |

> `pigment_umber` deckt vertraglich T1–T2 ab → eine Pflanze (L12) genügt; verdant/violet/radiant je eigene Pflanze. Foraging liefert dieselben Pigmente alternativ wild.

### 4D) Schilf / Faser (Vertrag D) → Pergament → Senke Inscription

| Tier | Aktion-ID | Crop-Item (Vertrag) | Saat-Item | Lvl | Wachszeit | Output | XP |
|---|---|---|---|---|---|---|---|
| T1–2 | `farm_palereed` | `reed_pale` | `palereed_seed` | 6 | 75 s | 4–7 | 28 |
| T3–4 | `farm_ironreed` | `reed_iron` | `ironreed_seed` | 46 | 120 s | 4–7 | 317 |
| T5 | `farm_voidreed` | `reed_void` | `voidreed_seed` | 84 | 200 s | 4–7 | 3464 |

> Schilf ist **exklusiv Farming** (Vertrag: „Quelle: Farming"). Höherer Batch (4–7), weil Pergament-Rezepte mengenintensiv sind. `reed_pale` deckt T1–2, `reed_iron` deckt T3–4.

### Cooking-Crops (Gemüse/Getreide) → Senke Cooking

Food-Input für Cooking (heute fast nur Fisch/Fleisch — Gemüse/Getreide fehlt). Kürzere Wachszeiten als die Vertrags-Crops (häufigerer Bedarf, kleinere Einheiten), Output stapelbar als `material`.

| Tier | Aktion-ID | Crop-Item | Saat-Item | Lvl | Wachszeit | Output | XP |
|---|---|---|---|---|---|---|---|
| T1 | `farm_gravetato` | `gravetato` | `gravetato_seed` | 4 | 30 s | 3–5 | 10 |
| T2 | `farm_bloodgrain` | `bloodgrain` | `bloodgrain_seed` | 22 | 45 s | 3–6 | 36 |
| T3 | `farm_soulgourd` | `soulgourd` | `soulgourd_seed` | 42 | 70 s | 3–6 | 152 |
| T4 | `farm_witherleek` | `wither_leek` | `witherleek_seed` | 62 | 100 s | 3–6 | 583 |
| T5 | `farm_ambergrain` | `ambergrain` | `ambergrain_seed` | 84 | 140 s | 3–6 | 2425 |

> **Schnittstelle Cooking:** Diese Items sind als Cooking-`inputs` gedacht (Brot aus `bloodgrain`, Eintopf aus `soulgourd`+`wither_leek`, etc.). Konkrete Koch-Rezepte/Heilwerte sind **Cooking-Spec** (separates Doc) — hier nur die Crop-Quelle.

### Flavor-Crops (kein Vertrag, Loop-Würze)

Niedrige Stückzahl, hoher Item-Value, dark-fantasy-Flair. Optionale Inputs für besondere Herblore-Tränke/Cooking-Gerichte.

| Aktion-ID | Crop-Item | Saat-Item | Lvl | Wachszeit | Output | XP |
|---|---|---|---|---|---|---|
| `farm_mandrake` | `mandrake_root` | `mandrake_seed` | 30 | 90 s | 1–2 | 108 |
| `farm_gallows_apple` | `gallows_apple` | `gallows_apple_seed` | 50 | 110 s | 2–3 | 354 |
| `farm_corpse_lily` | `corpse_lily_bulb` | `corpse_lily_seed` | 70 | 140 s | 1–2 | 1213 |

> Namens-Flavor: Mandrake_root = „Screaming Mandrake" (schreiende Alraune), gallows_apple = am Galgen gereifte Frucht, corpse_lily = Leichenlilie. Item-`value` hoch ansetzen (Alraune ~120, Galgenapfel ~280, Leichenlilie ~600) als Gold-Alternative zum Verkauf.

## 5. XP/h-Validierung (alle neuen Aktionen)

Alle @ Faktor ~1,25× Zielkurve — sauber, monoton, keine Cliffs, kein 0-XP/h:

| Aktion | Lvl | xph | target | ratio |
|---|---|---|---|---|
| farm_marshroot | 8 | 1440 | 1167 | 1.23 |
| farm_palereed | 6 | 1344 | 1057 | 1.27 |
| farm_umberleaf | 12 | 1800 | 1420 | 1.27 |
| farm_gravetato | 4 | 1200 | 952 | 1.26 |
| farm_bloodgrain | 22 | 2880 | 2324 | 1.24 |
| farm_bloodthistle | 26 | 3540 | 2832 | 1.25 |
| farm_mandrake | 30 | 4320 | 3451 | 1.25 |
| farm_soulgourd | 42 | 7817 | 6242 | 1.25 |
| farm_verdantcap | 44 | 8600 | 6891 | 1.25 |
| farm_gravemoss / farm_ironreed | 46 | 9504 / 9510 | 7607 | 1.25 |
| farm_gallows_apple | 50 | 11585 | 9271 | 1.25 |
| farm_witherleek | 62 | 20988 | 16788 | 1.25 |
| farm_violetbloom | 64 | 23160 | 18535 | 1.25 |
| farm_nightbloom | 66 | 25580 | 20464 | 1.25 |
| farm_corpse_lily | 70 | 31191 | 24944 | 1.25 |
| farm_radiantbloom / farm_voidreed / farm_ambergrain | 84 | 62352 / 62352 / 62357 | 49885 | 1.25 |
| farm_godsbreath | 86 | 68850 | 55077 | 1.25 |

## 6. Begründung (kurz)

- **Idle-Identität:** lange `durationMs` (60–240 s) + Batch-Output (4–7) = „säen und offline ernten". Bewusst anders als Foraging (kurze, aktive Klicks, kleiner Yield).
- **Renewable-Premium 1,25×:** Farming kostet Saat + Wartezeit, darf etwas über der nackten Kurve liegen — exakt der heute geshippte Wert, also konsistent.
- **Tier-Leiter:** je Tier mind. eine Crop pro Vertragslinie → viele Sprossen, keine flachen Strecken, kein Cliff (Validierung §5 monoton steigend).
- **Cross-Skill-Verzahnung:** `herb_*` doppelt bezogen (Foraging wild / Farming kultiviert) → Spieler wählt Quelle; Saat-Drop koppelt Foraging→Farming.
- **Cooking-Lücke geschlossen:** Gemüse/Getreide als Food-Input, das es heute kaum gibt.

## 7. Apply-Liste für content-dev (geordnet)

**Liste A — neue Farming-Inhalte (Kern dieses Plans):**
1. **Item-Defs anlegen** (analog Block ab Zeile ~267): pro Crop je ein Saat-Item (`*_seed`, type `material`, stackable, kleiner value) und ein Ernte-Item. Vertrags-IDs **exakt** übernehmen: `herb_marshroot/_bloodthistle/_gravemoss/_nightbloom/_godsbreath`, `pigment_umber/_verdant/_violet/_radiant`, `reed_pale/_iron/_void`. Cooking-/Flavor-Items frei benannt wie oben.
2. **Farm-Aktionen anlegen** (Block ab `farm_ashroot`, Zeile ~4160) mit Lvl/`durationMs`/`xp`/`inputs`(1 Saat)/`loot`(Output) exakt aus §4.
3. **Saat-Drops** in Foraging-Aktionen ergänzen (analog `bloodbeet_seed`-Drops): die neuen `*_seed` in passende `forage_*`-Loot-Tabellen einhängen (Tier-passend). Detail-Drop-Raten = Foraging-Spec; Default-Vorschlag: chance 0,10–0,18, min/max 1.
4. **Achievements:** bestehende `ach_skill_farming_*` decken Level ab — kein Neubedarf.

**Liste B — optionaler Starter-Tune (Kosmetik, kann entfallen):**
5. `farm_ashroot` xp 3→2; `farm_grimwheat` xp 4→2; `gather_graywort` xp 2→1 — bringt die L1-Starter von ~2,2–2,5× auf ~1,25× der Kurve.

**Nicht in diesem Plan / Folge-Specs:** konkrete Herblore-/Inscription-/Cooking-Rezepte, die diese Crops verbrauchen (eigene Skill-Docs); echtes Multi-Plot-Beet-System (logic-dev/Chef-Entscheid).
