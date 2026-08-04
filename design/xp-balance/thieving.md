# XP-Balance-Bericht — Diebeskunst (`thieving`)

_Balance-Designer, 2026-07-01. Nur Analyse + Zahlen-Empfehlungen. Content-Katalog wird
NICHT von mir editiert — Umsetzung erfolgt separat mit Chef-Freigabe durch content-dev._

Quellen: `packages/content/src/index.ts` (14 `steal`- + 9 `fence`-Aktionen),
`packages/engine/src/leveling.ts` (XP-Kurve), `packages/engine/src/tick.ts` +
`packages/shared/src/index.ts` (`actionSuccessChance`, Stun-/Risiko-Mechanik).
Alle Zahlen sind aus den Quell-Konstanten **exakt** hergeleitet (kein Sim-Schätzwert):
Basis-XP/h = `xp · 3.6e6 / durationMs`; die effektive Rate benutzt die reale
Resolution aus `tick.ts` (Fehlschlag → keine XP + Stun).

---

## TL;DR — Verdikt zuerst

**Brutalitäts-Note: 3 / 5 (mittel).** Diebeskunst ist auf dem **Papier** großzügig
(Basis-XP/h überall ≥ Ziel), fühlt sich aber aus zwei Gründen brutal an:

1. **Totes Tier L20–L35 (der Kern-Defekt).** Die neuen Freischaltungen `loot_market_stall`
   (L20) und `pickpocket_tax_collector` (L28) geben **weniger** XP/h als der uralte
   `pickpocket_merchant` (L12) — sowohl in der Basisrate (3.429 / 3.600 < 4.000) als auch
   effektiv. Ein Spieler bleibt **von L12 bis L36** rational auf einer einzigen L12-Aktion
   hängen. 24 Level ohne echten Fortschritt = genau das „brutale" Gefühl.
2. **Die „1-XP"-Beschwerde hat hier ein Gesicht:** `fence_trinket` gibt **1 XP bei L12**
   (und liegt mit 1.200 XP/h sogar **unter** dem L1-`fence_coinpurse` mit 1.440). Das ist
   die Diebeskunst-Entsprechung von „1 XP für eine Level-8-Aktion ist diabolisch".

Dazu ein verstecktes Brutalitäts-Multiplikator: **Erfolgschance + Stun**. Die reale
effektive Rate liegt bei nur ~**40–45 %** der Basisrate (Fehlschläge geben nichts und
betäuben). Zeit 1→99 auf der besten Aktion: **~237 h Basis, aber ~563 h effektiv** (Default
„careful"). Das ist tragbar, aber die toten Tiers machen es unnötig zäh.

**Streng monoton fehlt an 4 Stellen** (2× steal, 2× fence). Behebbar mit **5 XP-Zahlen**,
keine Dauer-Änderung nötig, keine Migration.

**Top-3-Fixes:** (1) `loot_market_stall` xp 4→6, (2) `pickpocket_tax_collector` xp 4→7,
(3) `fence_trinket` xp 1→2. Details unten.

---

## 1. Das Modell, gegen das ich balanciere

XP-Kurve (`leveling.ts`, RuneScape/Melvor-Stil, Cap L99):

```
acc += floor(n + 300 · 2^(n/7));   xpForLevel(n+1) = floor(acc/4)
```

Referenz-Zielrate: `target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`.

| L | kumulative XP | Δ zum nächsten Level | target_xph |
|---:|---:|---:|---:|
| 1  | 0 | 83 | 820 |
| 5  | 388 | 124 | 1.002 |
| 10 | 1.154 | 204 | 1.285 |
| 20 | 4.470 | 548 | 2.107 |
| 30 | 13.363 | 1.470 | 3.451 |
| 40 | 37.224 | 3.947 | 5.654 |
| 50 | 101.333 | 10.612 | 9.271 |
| 60 | 273.742 | 28.546 | 15.206 |
| 70 | 737.627 | 76.818 | 24.944 |
| 80 | 1.986.068 | 206.750 | 40.923 |
| 90 | 5.346.332 | 556.499 | 67.139 |
| 99 | 13.034.431 | — | — |

### Thieving-spezifische Mechanik (wichtig für „fühlt sich brutal an")

- **`steal`-Aktionen** würfeln bei Abschluss auf Erfolg: `actionSuccessChance = clamp(0,
  0.95, successBase + successPerLevel·(level−req) + bonus)`. **Fehlschlag → keine XP, kein
  Gold, kein Loot + Betäubung** (`stunMs`, sonst `DEFAULT_STUN_MS = 1200`). Die Aktionsdauer
  ist trotzdem verbraucht.
- **Default-Risikomodus „careful":** `successBonus +0.05`, `stunMult 0.5`, `rewardMult 0.85`.
  D.h. real bekommt man **85 %** der Nenn-XP und verliert bei Fehlschlag den halben Stun an
  Zeit. → Effektive Rate ≈ `p · xp · 0.85 · 3.6e6 / (dur + (1−p)·stun·0.5)`.
- **`fence`-Aktionen** haben **kein** `successBase` → gelingen immer (deterministischer
  Craft-Pfad, input-gated durch gestohlene Wertsachen). Nur `rewardMult 0.85` greift.

**Konsequenz für die Balance:** Basis-XP/h ist die Design-Metrik (die Code-Kommentare der
letzten Fixes rechnen damit), aber die **effektive** Rate ist es, die der Spieler spürt —
und sie kann die Monotonie brechen, selbst wenn die Basisrate steigt (siehe burgle_warehouse).

---

## 2. IST-Zustand: `steal`-Leiter (Haupt-XP-Pfad)

Basis = `xp·3.6e6/dur`. Effektiv = „careful", Erfolg auf `levelRequired` (kein Über-Level).

| id | L | xp | dur (ms) | Basis-XP/h | Ziel@L | Basis/Ziel | Erfolg@L | Eff-XP/h |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| pickpocket_beggar | 1 | 2 | 3000 | 2.400 | 820 | 2,93× | 65 % | 1.281 |
| pickpocket_drunkard | 5 | 3 | 3200 | 3.375 | 1.002 | 3,37× | 63 % | 1.737 |
| pickpocket_merchant | 12 | 4 | 3600 | 4.000 | 1.420 | 2,82× | 60 % | 1.953 |
| **loot_market_stall** | 20 | 4 | 4200 | **3.429** | 2.107 | 1,63× | 57 % | **1.588** ⬇ |
| **pickpocket_tax_collector** | 28 | 4 | 4000 | **3.600** | 3.127 | 1,15× | 55 % | **1.593** ⬇ |
| burgle_warehouse | 36 | 12 | 7000 | 6.171 | 4.640 | 1,33× | 55 % | 2.795 |
| pickpocket_city_guard | 45 | 11 | 4200 | 9.429 | 7.240 | 1,30× | 47 % | 3.522 |
| crack_strongbox | 55 | 25 | 6000 | 15.000 | 11.873 | 1,26× | 50 % | 6.096 |
| pickpocket_noble | 65 | 32 | 4600 | 25.043 | 19.475 | 1,29× | 45 % | 8.938 |
| rob_cultist_shrine | 75 | 85 | 7500 | 40.800 | 31.950 | 1,28× | 47 % | 15.637 |
| raid_tax_vault | 85 | 165 | 9000 | 66.000 | 52.417 | 1,26× | 45 % | 24.281 |
| loot_reliquary | 95 | 260 | 8500 | 110.118 | 85.997 | 1,28× | 45 % | 40.420 |
| plunder_ashen_treasury | 97 | 500 | 10000 | 180.000 | 94.948 | 1,90× | 45 % | 66.298 |
| heist_idol_hoard | 99 | 985 | 12000 | 295.500 | (Cap) | — | 41 % | 99.555 |

**Befunde:**

- **⬇ Monotonie-Bruch (Basis):** `loot_market_stall` (L20, 3.429) < `pickpocket_merchant`
  (L12, 4.000). Auch `pickpocket_tax_collector` (L28, 3.600) bleibt darunter. Erst
  `burgle_warehouse` (L36) übertrifft den Merchant wieder.
- **⬇ Totes Tier (effektiv, das eigentliche Problem):** Effektiv ist der Merchant (1.953)
  bis **L36** die beste Aktion. `loot_market_stall` (1.588) und `tax_collector` (1.593)
  sind effektiv sogar **schlechter** als der Merchant, weil ihre Erfolgschance sinkt und die
  Dauer steigt, ohne dass die XP mithält. → Der Spieler klebt L12–L35 auf einer Aktion.
- Die Kurven-Kommentare im Code („4000 xph … Thieving-Track monoton") wurden **nur bis
  merchant** geprüft; die L20/L28-Regression wurde übersehen.
- Der Rest (L36→L99) ist sauber monoton in **beiden** Metriken und trackt die Kurve schön
  eng (~1,26–1,33× Ziel). `plunder_ashen_treasury` (1,90×) und `heist_idol_hoard` sind
  End-Game-Spikes, aber bei L97/99 im „Ziellinien"-Bereich akzeptabel (Cap-Level, terminal).
- „Diabolisch-kleine XP" im Absolutwert: fünf steal-Aktionen L1–L28 geben nur **2–4 XP**.
  XP/h ist ok, aber das sichtbare „+4" über 28 Level fühlt sich nach Stillstand an
  (Feel-Problem, sekundär).

---

## 3. IST-Zustand: `fence`-Leiter (Hehler-Kette, input-gated)

Deterministisch (kein Erfolgswurf). Eff = Basis · 0,85 (careful `rewardMult`).

| id | L | xp | dur (ms) | Basis-XP/h | Ziel@L | Basis/Ziel |
|---|---:|---:|---:|---:|---:|---:|
| fence_coinpurse | 1 | 1 | 2500 | 1.440 | 820 | 1,76× |
| **fence_trinket** | 12 | 1 | 3000 | **1.200** | 1.420 | 0,84× ⬇ |
| crack_smugglers_lock | 28 | 3 | 3000 | 3.600 | 3.127 | 1,15× |
| **launder_ledger** | 30 | 3 | 3500 | **3.086** | 3.451 | 0,89× ⬇ |
| melt_insignia | 36 | 5 | 4000 | 4.500 | 4.640 | 0,97× |
| reforge_signet | 65 | 22 | 4000 | 19.800 | 19.475 | 1,02× |
| melt_goblet | 75 | 40 | 4500 | 32.000 | 31.950 | 1,00× |
| desecrate_reliquary | 85 | 73 | 5000 | 52.560 | 52.417 | 1,00× |
| appraise_idol | 95 | 119 | 5000 | 85.680 | 85.997 | 1,00× |

**Befunde:**

- **⬇ `fence_trinket` (L12, 1 XP → 1.200 XP/h)** ist der klarste „diabolische" Fall: unter
  Ziel (0,84×) **und** unter dem L1-`fence_coinpurse` (1.440). Ein L12-Freischalt-Rezept,
  das schlechter ist als das allererste. Genau die Chef-Beschwerde.
- **⬇ `launder_ledger` (L30, 3.086)** < `crack_smugglers_lock` (L28, 3.600). Kleiner
  Rückgang. (Der eigentliche Reiz von launder_ledger ist Gold + `dim_essence`, nicht XP —
  aber die XP soll trotzdem nicht regredieren.)
- Ab `crack_smugglers_lock`/`melt_insignia` trackt Fence die Kurve fast perfekt (≈1,0×) und
  ist monoton. Diese Aktionen sind **vorbildlich** justiert.
- **Content-Lücke (kein XP-Bug):** zwischen `melt_insignia` (L36) und `reforge_signet`
  (L65) liegen 29 Level ohne Fence-Aktion — folgt der Input-Verfügbarkeit (kein fenc-barer
  Drop dazwischen). Akzeptabel; nur notieren, falls später ein Mid-Tier-Wertgegenstand dazukommt.

---

## 4. Empfehlungen — konkrete neue Zahlen

Zielbild: **streng monotone** Basis- **und** Effektiv-Rate, glatte Leiter ohne tote Tiers,
großzügig (Chef-Mandat „weniger brutal"). Ich lasse die früh-generösen und die sauberen
Spät-Aktionen unangetastet und hebe nur die durchhängende Mitte. Alle Werte sind minimal
gewählt, sodass jede Freischaltung ein **klarer Aufstieg** ist.

### 4a. `steal` — Ziel-Tabelle

| id | level | current xp | target (Kurve) | recommended | neue Basis / Eff | Begründung |
|---|---:|---:|---:|---:|---:|---|
| loot_market_stall | 20 | 4 | ~2,5 | **6** | 5.143 / 2.382 | Behebt Basis- **und** Eff-Bruch vs. merchant; +29 % Basis, +22 % Eff über merchant. |
| pickpocket_tax_collector | 28 | 4 | ~3,5 | **7** | 6.300 / 2.788 | Steigt sauber über loot_market_stall; beendet das tote Tier. |
| burgle_warehouse | 36 | 12 | ~9 | **14** | 7.200 / 3.261 | Nötig, damit die **Effektiv**-Kette weitersteigt (bei xp 12 wäre Eff 2.795 < tax_collectors neue 2.788-Nachbarschaft und Basis 6.171 < 6.300 → neuer Bruch). |

Nicht ändern (L45–L99): bereits monoton in Basis+Effektiv und kurventreu. Die
End-Game-Spikes L97/L99 sind gewollt (Belohnungs-Höhepunkt am Cap).

**Optional (Feel, kein Muss):** Um die sichtbare „2–4 XP"-Ebene L1–L12 lebendiger zu machen,
könnte man `pickpocket_merchant` 4→5 anheben (Basis 5.000). Rein kosmetisch; Monotonie
bleibt gewahrt. **Nicht** empfohlen, solange die toten Tiers oben Priorität haben.

### 4b. `fence` — Ziel-Tabelle

| id | level | current xp | target (Kurve) | recommended | neue Basis | Begründung |
|---|---:|---:|---:|---:|---:|---|
| fence_trinket | 12 | 1 | ~1,2 | **2** | 2.400 | Beseitigt „1 XP bei L12" + Bruch vs. fence_coinpurse; jetzt 1,69× Ziel, monoton. |
| launder_ledger | 30 | 3 | ~3,4 | **4** | 4.114 | Steigt über crack_smugglers_lock (3.600); 1,19× Ziel. |

`fence_coinpurse` (L1, 1 XP) **bleibt** 1 — bei L1 mit 1.440 XP/h (1,76× Ziel) ist 1 XP
normal und nicht diabolisch (der Boden liegt hier am richtigen Ort).

### Ergebnis nach Fixes (verifiziert)

- **steal:** Basis 2.400 → 3.375 → 4.000 → **5.143 → 6.300 → 7.200** → 9.429 → 15.000 → …
  streng steigend; Effektiv 1.281 → 1.737 → 1.953 → **2.382 → 2.788 → 3.261** → 3.522 → …
  streng steigend. **Keine toten Tiers mehr.**
- **fence:** Basis 1.440 → **2.400** → 3.600 → **4.114** → 4.500 → … streng steigend.
- Die Basis/Ziel-Kurve taumelt jetzt glatt von der großzügigen Früh-Ebene (~2,9–3,4×) auf
  die kurventreue Spät-Ebene (~1,26×) herunter — genau die gewünschte „viele Sprossen"-Leiter.

---

## 5. Anwenden — geordnete Liste für content-dev

Datei: `packages/content/src/index.ts`, Objekt `actions`. Nur `xp`-Feld ändern, sonst nichts.
Keine Dauer-, Loot-, Gold- oder Save-Änderung nötig. Keine Migration (reine Zahlenwerte).

1. `loot_market_stall`      → `xp: 4` **→ `xp: 6`**   (Muss, behebt totes Tier)
2. `pickpocket_tax_collector` → `xp: 4` **→ `xp: 7`** (Muss, behebt totes Tier)
3. `fence_trinket`          → `xp: 1` **→ `xp: 2`**   (Muss, „1-XP"-Diabolik)
4. `burgle_warehouse`       → `xp: 12` **→ `xp: 14`** (Muss, hält Effektiv-Monotonie)
5. `launder_ledger`         → `xp: 3` **→ `xp: 4`**   (Soll, kleiner Fence-Bruch)

Optional/Feel (nur nach Chef-Wunsch): `pickpocket_merchant` `xp: 4 → 5`.

**Nach dem Einpflegen:** `pnpm test` (Turbo-Cache beachten, ggf. `--filter` direkt) — die
Thieving-Guard-Tests (`packages/engine/src/thieving.test.ts`) prüfen nur Gating/Gold/Stun,
nicht Monotonie; die Zahlen-Änderung berührt sie nicht. Ein einfacher Sim-Blick auf
XP/h der geänderten Aktionen bestätigt die neue Leiter.

---

## 6. Verdikt

**Brutalitäts-Note: 3 / 5.** Nicht so großzügig wie Bergbau (2/5), aber auch nicht diabolisch.
Der Papier-Wert ist fair; die gefühlte Brutalität kommt aus (a) dem toten Tier L12–L35 und
(b) dem versteckten Erfolg-/Stun-Faktor (real ~40–45 % der Basisrate). Fünf XP-Zahlen
beseitigen alle Monotonie-Brüche und toten Tiers; danach ist Diebeskunst eine glatte,
faire, streng steigende Leiter.

**Top-3-Muss-Fixes:**
1. `loot_market_stall` xp **4 → 6**
2. `pickpocket_tax_collector` xp **4 → 7**
3. `fence_trinket` xp **1 → 2**
(+ `burgle_warehouse` 12→14 zur Absicherung der Effektiv-Monotonie, `launder_ledger` 3→4 kosmetisch.)
