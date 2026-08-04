# Balance-Report — Hearthforge Idle

**Stand:** 2026-06-23 · **Scope:** XP-Progression, Skill-Aktionen, Gold-Wirtschaft, Kampf
**Datenbasis:** `packages/engine/src/leveling.ts`, `packages/content/src/index.ts`, Sim-Report aus `pnpm --filter @hearthforge/engine exec vitest run src/sim.test.ts`

> Dieses Dokument ist **read-only Analyse + Empfehlung**. Es ändert keinen Quellcode. Alle Zahlen sind aus der aktuellen Simulation berechnet.

---

## 0. Kernbefund (TL;DR)

Die XP-Kurve aus `leveling.ts` ist exponentiell (RuneScape/Melvor-Stil): Level 99 braucht **13,0 Mio XP**, Level 120 braucht **104,3 Mio XP**. Die Aktionen liefern aber eine **fast flache, viel zu hohe XP/h-Rate** (12.000–18.000 XP/h schon im Frühgame, bis 100.000–156.000 XP/h im Endgame). Dadurch:

- **Skill 1→50 dauert aktuell ~6–8 h** statt der angestrebten ~20 h.
- **Frühgame (Lv 1–40) ist ~10× zu schnell**; das Spiel "fühlt sich nicht idle an".
- **Thieving ist ein massiver Ausreißer** (bis **156.000 XP/h**, ~2× über vergleichbaren Skills).
- **Combat-XP/h liegt bei 19.000–46.000** und ist ebenfalls 5–20× zu hoch im Früh-/Midgame.

**Wurzelursache:** XP/h sollte *mit der Kurve mitwachsen* (langsam steigend), tut es aber kaum. Die Korrektur ist überwiegend ein **Absenken der XP-Werte im Früh- und Midgame**, nicht ein pauschaler globaler Nerf.

---

## 1. Ziel-Progressionskurve

### 1.1 XP-Schwellen (aus `xpForLevel`, Cap = 120)

| Level | Gesamt-XP | XP für *dieses* Level |
|------:|----------:|----------------------:|
| 10  | 1.154        | 185        |
| 20  | 4.470        | 497        |
| 30  | 13.363       | 1.332      |
| 40  | 37.224       | 3.576      |
| 50  | 101.333      | 9.612      |
| 60  | 273.742      | 25.856     |
| 70  | 737.627      | 69.576     |
| 80  | 1.986.068    | 187.260    |
| 90  | 5.346.332    | 504.037    |
| 99  | 13.034.431   | 1.228.825  |
| 110 | 38.737.661   | 3.652.007  |
| 120 | 104.273.167  | 9.830.430  |

Pro Level ~**+38 %** XP. Das ist eine gute, klassische Idle-Kurve — sie soll **bleiben**. Nur die Erträge müssen dazu passen.

### 1.2 Ziel-Zeiten (aktive Spielzeit, einzelne Fertigkeit)

Empfohlenes Gefühl für ein Steam-taugliches Idle-RPG:

| Meilenstein | Ziel-Zeit (aktiv, 1 Skill) | Bedeutung |
|---|---|---|
| **Lv 10** | ~1 h | "Schnupperphase" vorbei |
| **Lv 30** | ~6 h | Frühgame-Skill brauchbar |
| **Lv 50** | **~20 h** | solider Midgame-Skill |
| **Lv 70** | ~60 h | Spezialisierung |
| **Lv 99** | **~250 h** | klassisches "Mastery"-Ziel |
| **Lv 120** | **~700 h** | Endgame-Grind / Prestige |

**Gesamtlevel:** Bei ~22 trainierbaren Skills ist ein "rundes" Gesamt-Profil (z.B. alle Sammel-/Verarbeitungs-Skills ~50, Kampf-Skills ~70) eine **mehrere-hundert-Stunden**-Reise — genau richtig für Idle. Niemand muss alle Skills auf 120; 120 ist bewusst der "Whale/Completionist"-Grind.

### 1.3 Die zugrundeliegende Formel (Ziel-XP/h pro Tier-Level)

Damit jedes *Level* eine langsam steigende Wandzeit kostet, soll die XP/h-Rate **mit der Wurzel der Level-XP-Anforderung** wachsen:

```
ziel_xph(L) = 90 · sqrt( xpForLevel(L+1) − xpForLevel(L) )
```

Das ergibt eine **glatte, monoton steigende** Kurve ohne Ausreißer:

| Tier-Lv | Ziel-XP/h | | Tier-Lv | Ziel-XP/h |
|---:|---:|---|---:|---:|
| 1   | ~820    | | 70  | ~24.900 |
| 10  | ~1.290  | | 80  | ~40.900 |
| 20  | ~2.100  | | 90  | ~67.100 |
| 30  | ~3.450  | | 95  | ~86.000 |
| 40  | ~5.650  | | 99  | ~104.800 |
| 50  | ~9.270  | | 105 | ~141.000 |
| 60  | ~15.200 | | 115 | ~231.000 |

**Pro-Level-Wandzeit** unter dieser Kurve: Lv 30 ≈ 0,4 h, Lv 50 ≈ 1,1 h, Lv 70 ≈ 3,1 h, Lv 90 ≈ 8,3 h, Lv 99 ≈ 13 h, Lv 119 ≈ 35 h. Die kumulierten Summen ergeben exakt die Ziel-Zeiten aus 1.2.

> **Merksatz:** Eine Aktion, deren `levelRequired = L`, soll bei optimalem Spiel auf ~`ziel_xph(L)` kommen. Niedrigstufige Aktionen werden also **stark** abgesenkt, Endgame-Aktionen (Lv 95+) bleiben fast gleich.

---

## 2. Konkrete Anpassungen je Skill / Tier

**Stellschrauben:** Es zählt nur das Verhältnis `xp / durationMs`. Empfehlung: **`durationMs` weitgehend lassen** (Pacing/Animation-Gefühl), **`xp` absenken**, bis die Sim-XP/h ≈ `ziel_xph(levelRequired)` trifft.

### 2.1 Korrekturfaktor je Tier (aktuell → Ziel)

| Tier-Lv | aktuell XP/h (typ.) | Ziel XP/h | **xp-Faktor** |
|---:|---:|---:|:--:|
| 1   | ~12.000  | ~820     | **×0,07** |
| 10  | ~16.200  | ~1.290   | **×0,08** |
| 20  | ~22.400  | ~2.100   | **×0,09** |
| 35  | ~28.800  | ~4.400   | **×0,15** |
| 45  | ~48.000  | ~7.240   | **×0,15** |
| 55  | ~44.300  | ~11.900  | **×0,27** |
| 65  | ~70.000  | ~19.500  | **×0,28** |
| 70  | ~61.700  | ~24.900  | **×0,40** |
| 80  | ~73.800  | ~40.900  | **×0,55** |
| 90  | ~84.700  | ~67.100  | **×0,79** |
| 95  | ~102.000 | ~86.000  | **×0,84** |
| 105 | ~94.700  | ~141.000 | **×1,49** |
| 115 | ~156.000 | ~231.000 | (Thieving-Spezialfall, s.u.) |

**Interpretation:** Der Nerf ist **nicht uniform**. Früh-/Midgame: auf **7–30 %** absenken. Bei Lv ~95 trifft sich Alt und Neu (~×0,8). Ab Lv ~100 dürfen die Top-Aktionen sogar **leicht steigen** (×1,5), damit der Endgame-Grind nicht unerträglich lang wird.

### 2.2 Empfohlene `xp`-Werte je Sammel-Aktion (durationMs unverändert)

Berechnet als `xp_neu = round( ziel_xph(levelReq) · durationMs / 3.600.000 )`, mind. 1.

| Aktion | Skill | Lv | durationMs | xp alt | **xp neu** | XP/h alt→neu |
|---|---|--:|--:|--:|--:|--:|
| cut_normal_tree | woodcutting | 1 | 3000 | 10 | **1** | 12.000 → 820 |
| cut_oak_tree | woodcutting | 1 | 5000 | 25 | **1** | 18.000 → 590* |
| mine_copper | mining | 1 | 3500 | 12 | **1** | 12.343 → 820 |
| catch_shrimp | fishing | 1 | 4000 | 10 | **1** | 9.000 → 820 |
| catch_trout | fishing | 1 | 6000 | 30 | **1–2** | 18.000 → 820 |
| mine_iron | mining | 10 | 4000 | 18 | **1–2** | 16.200 → 1.290 |
| mine_coal | mining | 15 | 4500 | 22 | **2** | 17.600 → 1.660 |
| mine_mithril | mining | 35 | 5000 | 40 | **6** | 28.800 → 4.400 |
| mine_adamantite | mining | 45 | 5500 | 56 | **11** | 36.655 → 7.240 |
| mine_runite | mining | 55 | 6500 | 80 | **21** | 44.308 → 11.900 |
| mine_bloodiron | mining | 70 | 7000 | 120 | **48** | 61.714 → 24.900 |
| mine_titanium | mining | 80 | 7800 | 160 | **89** | 73.846 → 40.900 |
| mine_aetherite | mining | 90 | 8500 | 200 | **158** | 84.706 → 67.100 |
| mine_godiron | mining | 105 | 9500 | 250 | **372** | 94.737 → 141.000 |

\* *Bei sehr niedriger Ziel-XP/h und kurzer Dauer landet man am `xp ≥ 1`-Floor. Lösung: entweder `durationMs` der frühen Tiers leicht erhöhen, oder die früheste Stufe bewusst minimal über Ziel lassen (verschmerzbar, da Lv 1–10 ohnehin nur ~1 h kostet).*

### 2.3 Verarbeitungs-Skills (Smithing als Leitfaden)

Smithing skaliert heute von 11.000 (Lv 1) bis **102.000 XP/h** (Lv 95). Gleiche Formel anwenden:

| Aktion | Lv | durationMs | xp alt | **xp neu** | XP/h neu |
|---|--:|--:|--:|--:|--:|
| smelt_copper | 1 | 2600 | 8 | **1** | ~820 |
| smelt_iron | 10 | 3200 | 16 | **1** | ~1.290 |
| smelt_steel | 20 | 4500 | 28 | **3** | ~2.100 |
| smelt_mithril | 35 | 6500 | 70 | **8** | ~4.400 |
| smelt_adamantium | 45 | 7500 | 100 | **15** | ~7.240 |
| smelt_runite | 55 | 8500 | 135 | **28** | ~11.900 |
| smelt_bloodiron | 65 | 9000 | 175 | **49** | ~19.500 |
| smelt_titanium | 75 | 9500 | 215 | **84** | ~31.950 |
| smelt_aetherium | 85 | 10500 | 270 | **153** | ~52.400 |
| smelt_godiron | 95 | 12000 | 340 | **287** | ~86.000 |

Dieselbe Logik gilt **1:1** für cooking, fletching, leatherworking, runecrafting, herblore, inscription, farming, foraging: pro Aktion `xp_neu = round(90·sqrt(xpForLevel(L+1)−xpForLevel(L)) · durationMs / 3.6e6)`.

### 2.4 Thieving — Sonderfall (zu nerfen + neu staffeln)

Thieving ist der stärkste Ausreißer **und** seine `levelRequired`-Staffelung passt nicht zur Sim (z.B. `pickpocket_noble` Lv 65 → **136.957 XP/h**, fast 7× über Ziel):

| Aktion | Lv | XP/h aktuell | Ziel XP/h | **xp-Faktor** |
|---|--:|--:|--:|:--:|
| pickpocket_beggar | 1 | 16.800 | 820 | ×0,05 |
| pickpocket_merchant | 12 | 34.000 | 1.470 | ×0,04 |
| loot_market_stall | 20 | 41.143 | 2.100 | ×0,05 |
| pickpocket_tax_collector | 28 | 59.400 | 3.100 | ×0,05 |
| pickpocket_city_guard | 45 | 94.286 | 7.240 | ×0,08 |
| pickpocket_noble | 65 | 136.957 | 19.500 | ×0,14 |
| heist_idol_hoard | 115 | 156.000 | 231.000 | (×1,48 — darf steigen) |

**Empfehlung Thieving:** Gleiche `ziel_xph`-Formel anwenden. Zusätzlich `durationMs` der Top-Heists eher **erhöhen** (z.B. 12.000 → 18.000 ms), damit Thieving sich vom "XP-Geldautomat" zum bewussten Gold-Skill wandelt (s. §3).

---

## 3. Gold-Wirtschaft

**Verkaufspreis = `item.value × 0,5`** (`SELL_FRACTION = 0.5`, `shop.ts`). Slot-Upgrades: Basis 60 Gold, ×1,5 pro Kauf.

### 3.1 Einnahmen vs. Preise — aktueller Stand

| Quelle | Gold/h (Sim/berechnet) | Bewertung |
|---|--:|---|
| Combat Frühgame (Lv 1–8) | 5.000–11.700 g/h | **zu hoch** fürs Frühgame |
| Combat Midgame (Lv 20–40) | 8.600–23.400 g/h | hoch |
| Thieving (stolen_coinpurse etc.) | mehrere 1.000 g/h | ok als Gold-Skill |
| Erz/Barren-Verkauf (Midgame) | iron_bar 8 g, steel_bar 15 g/Stk | passt grob |

**Shop-Anker (Auswahl):** rusty_sword 15, bronze_sword 80, leather_body 60, iron_sword 240, steel_body 480, mithril_pickaxe 1.000, runite_pickaxe 2.400.

### 3.2 Problem

Das Frühgame-**Combat-Gold (5.000–11.700 g/h)** überrennt die Startshop-Preise komplett: bronze_sword (80) + leather_body (60) + cooked food sind in **<2 Minuten Kämpfen** finanziert. Die gesamte Bronze→Eisen→Stahl-Ausrüstungsprogression wird ihres Sinns beraubt.

### 3.3 Empfehlungen Gold

1. **Combat-Gold ans neue XP-Tempo koppeln.** Wenn time-to-kill steigt (§4), sinkt Gold/h automatisch. Zusätzlich `monster.gold` im Frühgame **halbieren** (goblin 5 → 2–3, mire_crawler 9 → 4).
2. **Ziel-Gold/h-Kurve** analog zur XP-Kurve, deutlich flacher als heute:
   - Frühgame (Lv 1–15): **~500–1.500 g/h**
   - Midgame (Lv 30–60): **~3.000–8.000 g/h**
   - Endgame (Lv 90+): **~20.000–40.000 g/h**
3. **Shop-Preise als "Zeit-Kosten" denken:** Ein Tier-Upgrade sollte ~0,5–1 h der dann aktuellen Gold/h kosten. bronze_sword (80 g) → bei ~800 g/h Frühgame = ~6 min: ok. iron_sword (240 g) bei ~1.500 g/h: ok. Steel/Mithril-Tools sind gut gestaffelt; **untere Preise leicht anheben** (bronze_sword 80 → 120, leather_body 60 → 100), sobald Combat-Gold gesenkt ist.
4. **Thieving = primärer Gold-Skill.** Drop-Werte (signet_ring 120, cut_gemstone 180, idol_coin 600) sind kohärent und dürfen so bleiben; nur die **XP** absenken (§2.4). So bleibt Thieving als Gold-Quelle attraktiv, ohne XP-Exploit.

---

## 4. Kampf-Balance

Baseline-Held (5 STR/CON, bronze_sword + leather_body + wooden_shield, cooked_trout).

### 4.1 Aktuelle Sim-Werte (Auszug)

| Monster | Lv | s/Kill | combatXP/h | Gold/h | Tode |
|---|--:|--:|--:|--:|--:|
| goblin | 1 | 2,8 | ~19.300 | 7.582 | 0 |
| mire_crawler | 8 | 3,4 | ~36.000 | 11.689 | 0 |
| pitch_beetle | 14 | 5,9 | ~31.700 | 10.325 | 0 |
| ash_tyrant | 20 | 11 | ~45.800 | 23.447 | 0 |
| forest_warden | 40 | 26,7 | ~37.800 | 19.270 | 2 |
| ember_elemental | 52 | 16,9 | ~42.600 | 18.001 | 0 |
| frost_hexer | 68 | 25,4 | ~42.500 | 18.961 | 6 |
| idol_warden | 92 | 109,1 | — | 7.047 | 26 |
| aether_wraith | 98 | 60 | ~27.600 | 14.370 | 29 |
| scale_skarn | 104 | — | 0 | 0 | 55 (unkillbar) |
| last_idol | 120 | — | 0 | 0 | 119 (Boss, ok) |

### 4.2 Befunde

- **time-to-kill ist grundsätzlich plausibel gestaffelt** (3 s früh → 25 s+ spät). Das Skelett stimmt.
- **Combat-XP/h ist viel zu hoch** (19.000–46.000), genau wie bei den Aktionen — derselbe Faktor-Fix (§2) nötig: `monster.xp` im Früh-/Midgame auf **~5–15 %** absenken.
- **Skalierungsbruch ab Lv ~92:** Baseline-Held stirbt 26–119×; `scale_skarn`/`last_idol` sind mit Startausrüstung unkillbar. Bei `last_idol` (Lv-120-Boss) ist das **erwünscht**; bei `idol_warden`/`scale_skarn` zeigt es, dass die Held-Power-Kurve nicht mit Monster-HP/DMG mitwächst (erwartbar, da Baseline nur 5/5 Attribute hat — mit echter Endgame-Ausrüstung anders).

### 4.3 Ziel-„time-to-kill" je Zone

| Zone / Tier | Ziel s/Kill | Anmerkung |
|---|---|---|
| Frühgame (Lv 1–10) | **3–6 s** | passt heute |
| Midgame (Lv 20–50) | **6–12 s** | passt grob |
| Spätgame (Lv 60–100) | **12–25 s** | passt |
| Mini-Bosse (ash_tyrant, forest_warden) | **+50–100 %** ggü. Zone | heute 11 s / 26,7 s — gut |
| Endboss (last_idol) | langer, gefährlicher Kampf | korrekt (Tode erwartet) |

### 4.4 Empfehlungen Kampf

1. **`monster.xp` analog §2 nerfen** (Ziel-combat-XP/h ≈ `ziel_xph(monster.level)`). Konkret:
   - goblin (Lv 1): xp 15 → **~2** (Ziel ~820 XP/h bei 2,8 s/Kill)
   - mire_crawler (Lv 8): xp 34 → **~3**
   - ash_tyrant (Lv 20): xp 140 → **~9**
   - forest_warden (Lv 40): xp 280 → **~42**
   - ember_elemental (Lv 52): xp 200 → **~55**
   - aether_wraith (Lv 98): xp 460 → **~430** (kaum ändern)
2. **HP/Damage-Skelett behalten** — time-to-kill ist gesund. Nur XP & Frühgame-Gold absenken.
3. **Held-Power-Kurve prüfen** (separat): Ab Lv ~90 muss echte Endgame-Ausrüstung den DPS so anheben, dass `idol_warden`/`scale_skarn` mit ~20–40 s/Kill machbar werden. Das ist ein **Equipment-/Attribut-Balancing**, kein Monster-Stat-Problem.

---

## 5. Umsetzungs-Fahrplan (priorisiert)

1. **[P0] XP/h-Formel zentral verankern.** Helper `targetXpPerHour(level) = 90·sqrt(xpForLevel(level+1)−xpForLevel(level))` als Single Source of Truth (Doku/Konstante). Alle weiteren Schritte leiten sich daraus ab.
2. **[P0] Sammel- & Verarbeitungs-Aktionen `xp` absenken** (§2.2/§2.3): `xp = round(targetXpPerHour(levelRequired)·durationMs/3.6e6)`. Größter Effekt aufs Spielgefühl, mechanisch risikoarm.
3. **[P0] Thieving entschärfen** (§2.4): XP nach gleicher Formel; Top-Heist-`durationMs` erhöhen.
4. **[P1] Combat-`xp` absenken** (§4.4) — gleiche Formel auf `monster.xp`.
5. **[P1] Frühgame-Gold senken** (§3.3): `monster.gold` Lv 1–15 halbieren; ggf. untere Shop-Preise leicht anheben.
6. **[P2] Verifizieren:** `vitest run src/sim.test.ts` erneut laufen lassen; prüfen, dass XP/h ≈ `targetXpPerHour(levelRequired)` und time-to-kill in den Ziel-Bändern liegt. `findIssues`-Schwellen ggf. nachziehen.
7. **[P2] Endgame-Power-Kurve** (Lv 90+ Equipment/Attribute) separat balancen, damit `idol_warden`/`scale_skarn` mit Endgame-Gear killbar werden.

> **Wichtig:** `durationMs` bewusst weitgehend unangetastet lassen — das Pacing-Gefühl je Aktion bleibt, nur die Belohnung wird kurvengerecht.

---

## 6. 5-Zeilen-Zusammenfassung (Kernzahlen)

1. **Kurve:** Lv 50 = 101k XP, Lv 99 = 13,0M, Lv 120 = 104,3M — bleibt; nur Erträge anpassen.
2. **Ziel-Zeiten (1 Skill):** ~20 h auf Lv 50, ~250 h auf Lv 99, ~700 h auf Lv 120.
3. **Ziel-XP/h:** `90·sqrt(ΔXP_Level)` → ~820 (Lv 1), ~9.300 (Lv 50), ~67.000 (Lv 90), ~105.000 (Lv 99).
4. **Fix:** Früh-/Midgame-`xp` auf **7–30 %** absenken; bei ~Lv 95 deckungsgleich; Thieving ist der größte Ausreißer (bis ×0,04).
5. **Combat & Gold:** time-to-kill (3 s→25 s+) ist gesund; nur `monster.xp` (heute 19k–46k XP/h) und Frühgame-Gold (5k–12k g/h) im selben Maß senken.
