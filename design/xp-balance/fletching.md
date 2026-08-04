# XP-Balance-Bericht — Fletching (Bogenbau) `fletching`

Datum: 2026-07-01 · Autor: Balance-Designer · Status: Vorschlag (READ-ONLY, noch nicht eingepflegt)
Quellen: `packages/content/src/index.ts` (Zeilen ~7446–7717), Kurve `packages/engine/src/leveling.ts`.
Baseline: **ungetunt** — ohne Werkzeug-Bonus, ohne Mastery, ohne XP-Buffs. Alle xp/h sind reine
`xp × 3_600_000 / durationMs`. Werte direkt aus der Quelle abgeleitet (deterministisch), nicht aus
dem evtl. gecachten Sim-Replay.

---

## 1. Kurven-Modell (Referenz)

`target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`, Cap 99.

| L | xpForLevel(L) | Δ(L→L+1) | target_xph |
|---|---|---|---|
| 1 | 0 | 83 | 820 |
| 5 | 388 | 124 | 1 002 |
| 10 | 1 154 | 204 | 1 285 |
| 15 | 2 411 | 335 | 1 647 |
| 20 | 4 470 | 548 | 2 107 |
| 25 | 7 842 | 898 | 2 697 |
| 30 | 13 363 | 1 470 | 3 451 |
| 40 | 37 224 | 3 947 | 5 654 |
| 50 | 101 333 | 10 612 | 9 271 |
| 60 | 273 742 | 28 546 | 15 206 |
| 63 | 368 599 | 38 416 | 17 640 |
| 70 | 737 627 | 76 818 | 24 944 |
| 80 | 1 986 068 | 206 750 | 40 923 |
| 90 | 5 346 332 | 556 499 | 67 139 |
| 95 | 8 771 558 | 913 019 | 85 997 |
| 99 | 13 034 431 | — | (0 — Formel undefiniert am Cap) |

Merke: **an L99 gibt die Formel 0** (kein L100). Für L99-Aktionen (Götzen-Bögen) muss der Wert
extrapoliert werden — nicht per Formel bestimmbar. Die aktuellen L99-Werte tun das korrekt.

---

## 2. Kernbefund vorab

**Fletching ist NICHT „zu brutal" bei der Rate.** Die reale xp/h liegt praktisch überall **auf oder
über** dem 90·√-Zielband (Faktor ~1.0–3.6×). Der Haupt-XP-Pfad (Langbögen) liegt sogar durchgängig
bei ~1.8–2.4× Ziel. Die Chef-Beschwerde („1 XP diabolisch") trifft Fletching also **nicht über die
Grundrate**, sondern über zwei echte Struktur-Defekte:

1. **Ein totes Tier (Eisen, L10)** — die klarste „diabolische" Stelle.
2. **Frühe Wall L5→L20** — die beste verfügbare Rate steigt kaum (3 600 → 4 909 xp/h, +36 % über 15 Level), und neue Tiers sind teils *Downgrades*.
3. **Feel-Problem**: winzige Roh-XP (+1/+2/+3) am unteren Ende — im Idle demotivierend, obwohl xp/h ok.
4. **Cliff in der `durationMs`-Kurve** bei `steel_longbow` (11 000 ms, +69 % ggü. Eisen in einem Tier).
5. **Content-Lücken** in der Holzschild-Linie (L15, L25, **L63**, **L92** — 38- und 29-Level-Wüsten). Reine Content-Frage, keine XP-Wert-Frage.

---

## 3. Das tote Tier im Detail (die „diabolische" Stelle)

Beim Aufstieg auf **L10 (Eisen)** ist *jedes* Eisen-Rezept schlechter als das, was der Spieler seit
**L5 (Bronze)** schon hat:

| Aktion | Level | dur | xp | xp/h |
|---|---|---|---|---|
| fletch_bronze_arrows | 5 | 3000 | 3 | **3 600** |
| fletch_iron_arrows | 10 | 3500 | **2** | 2 057 |
| fletch_iron_shortbow | 10 | 4500 | 3 | 2 400 |
| fletch_iron_longbow | 10 | 6500 | 6 | 3 323 |

`fletch_iron_arrows` gibt bei **höherem** Level und **längerer** Dauer **weniger** Roh-XP als Bronze
(2 statt 3) — nicht-monoton in beiden Dimensionen. Selbst das beste Eisen-Rezept (iron_longbow,
3 323 xp/h) liegt **−8 %** unter Bronze-Pfeilen (3 600). **Belohnung für L10 = Downgrade.** Ergebnis:
Bronze-Pfeile bleiben von L5 bis L19 die beste Aktion — eine 14-Level-Flachstrecke.

### Best-verfügbare-Rate-Frontier (IST)

| bei Level | beste Aktion | xp/h | Δ ggü. vorher |
|---|---|---|---|
| 1 | copper_longbow | 2 700 | — |
| 5 | bronze_arrows | 3 600 | +33 % |
| 10 | bronze_arrows *(noch immer!)* | 3 600 | **+0 % ← totes Eisen-Tier** |
| 15 | bronze_arrows *(noch immer!)* | 3 600 | **+0 %** |
| 20 | steel_longbow | 4 909 | +36 % |
| 25 | steel_longbow | 4 909 | +0 % |
| 30 | blacksteel_longbow | 7 754 | +58 % |
| 40 | mithril_longbow | 10 368 | +34 % |
| 50 | adamantium_longbow | 16 883 | +63 % |
| 60 | runite_longbow | 27 927 | +65 % |
| 70 | bloodiron_longbow | 46 703 | +67 % |
| 80 | titanium_longbow | 97 463 | +109 % |
| 90 | aetherium_longbow | 139 200 | +43 % |
| 99 | godiron_longbow | 229 585 | +49 % |

**Fazit:** Ab L30 ist die Progression gesund (+34–109 % pro Tier). Kaputt ist nur der Abschnitt
**L5–L20** (totes Eisen-Tier + Stahl-Wall). Der Rest ist eher **großzügig**, nicht brutal.

---

## 4. Linien-Identität (xp/h je Tier)

Langbogen > Kurzbogen > Pfeile — überall, **außer bei Eisen**, wo Pfeile einbrechen:

| Tier | Pfeile | Kurzbogen | Langbogen |
|---|---|---|---|
| copper | 2 400 | 2 400 | 2 700 |
| bronze | 3 600 | 2 700 | 3 273 |
| **iron** | **2 057** ⚠ | **2 400** ⚠ | **3 323** ⚠ |
| steel | 3 600 | 4 800 | 4 909 |
| blacksteel | 5 040 | 6 300 | 7 754 |
| mithril | 6 000 | 8 100 | 10 368 |
| adamantium | 9 771 | 13 600 | 16 883 |
| runite | 16 200 | 23 040 | 27 927 |
| bloodiron | 24 800 | 39 273 | 46 703 |
| titanium | 41 684 | 83 400 | 97 463 |
| aetherium | 66 857 | 120 462 | 139 200 |
| godiron | 109 500 | 202 800 | 229 585 |

Das ist eine saubere Identität (Langbogen = XP-Pfad, Pfeile = Munitionspfad ~auf Ziel). Nur die
**Eisen-Zeile** durchbricht sie in allen drei Linien.

---

## 5. Master-Tabelle: current vs target vs recommended

`target` = `target_xph(levelRequired)`. `recommended` = mein Vorschlag (siehe §6). **„halten" = Wert
ist bereits gut, nicht anfassen (kein Nerf).**

| id | level | current xp (xp/h) | target xph | recommended |
|---|---|---|---|---|
| fletch_bowstring | 1 | 1 (1 440) | 820 | halten (1) |
| fletch_shafts | 1 | 1 (1 800) | 820 | halten (1) |
| fletch_crude_arrows | 1 | 1 (1 200) | 820 | **2** (Feel-Floor) |
| fletch_copper_arrows | 1 | 2 (2 400) | 820 | halten (2) |
| fletch_bronze_arrows | 5 | 3 (3 600) | 1 002 | halten (3) |
| **fletch_iron_arrows** | 10 | **2 (2 057)** | 1 285 | **4** (→4 114) |
| **fletch_steel_arrows** | 20 | 4 (3 600) | 2 107 | **5** (→4 500) |
| fletch_blacksteel_arrows | 30 | 7 (5 040) | 3 451 | halten (7) |
| fletch_mithril_arrows | 40 | 10 (6 000) | 5 654 | halten (10) |
| fletch_adamantium_arrows | 50 | 19 (9 771) | 9 271 | halten (19) |
| fletch_runite_arrows | 60 | 36 (16 200) | 15 206 | halten (36) |
| fletch_bloodiron_arrows | 70 | 62 (24 800) | 24 944 | halten (62) |
| fletch_titanium_arrows | 80 | 110 (41 684) | 40 923 | halten (110) |
| fletch_aetherium_arrows | 90 | 195 (66 857) | 67 139 | halten (195) |
| fletch_godiron_arrows | 95 | 365 (109 500) | 85 997 | halten (365) |
| fletch_copper_shortbow | 1 | 2 (2 400) | 820 | halten (2) |
| **fletch_bronze_shortbow** | 5 | 3 (2 700) | 1 002 | **4** (→3 600) |
| **fletch_iron_shortbow** | 10 | **3 (2 400)** | 1 285 | **6** (→4 800) |
| **fletch_steel_shortbow** | 20 | 8 (4 800) | 2 107 | **9** (→5 400) |
| fletch_blacksteel_shortbow | 30 | 14 (6 300) | 3 451 | halten (14) |
| fletch_mithril_shortbow | 40 | 18 (8 100) | 5 654 | halten (18) |
| fletch_adamantium_shortbow | 50 | 34 (13 600) | 9 271 | halten (34) |
| fletch_runite_shortbow | 60 | 64 (23 040) | 15 206 | halten (64) |
| fletch_bloodiron_shortbow | 70 | 120 (39 273) | 24 944 | halten (120) |
| fletch_titanium_shortbow | 80 | 278 (83 400) | 40 923 | halten (278) |
| fletch_aetherium_shortbow | 90 | 435 (120 462) | 67 139 | halten (435) |
| fletch_godiron_shortbow | 99 | 845 (202 800) | (Cap) | halten (845) |
| fletch_copper_longbow | 1 | 3 (2 700) | 820 | halten (3) |
| **fletch_bronze_longbow** | 5 | 5 (3 273) | 1 002 | **6** (→3 927) |
| **fletch_iron_longbow** | 10 | **6 (3 323)** | 1 285 | **9** (→4 985) |
| **fletch_steel_longbow** | 20 | 15 (4 909) | 2 107 | **14 @ dur 8000** (→6 300) |
| fletch_blacksteel_longbow | 30 | 28 (7 754) | 3 451 | halten (28) |
| fletch_mithril_longbow | 40 | 36 (10 368) | 5 654 | halten (36) |
| fletch_adamantium_longbow | 50 | 68 (16 883) | 9 271 | halten (68) |
| fletch_runite_longbow | 60 | 128 (27 927) | 15 206 | halten (128) |
| fletch_bloodiron_longbow | 70 | 240 (46 703) | 24 944 | halten (240) |
| fletch_titanium_longbow | 80 | 555 (97 463) | 40 923 | halten (555) |
| fletch_aetherium_longbow | 90 | 870 (139 200) | 67 139 | halten (870) |
| fletch_godiron_longbow | 99 | 1690 (229 585) | (Cap) | halten (1690) |
| fletch_willowbark_shield | 15 | 4 (2 618) | 1 647 | halten (4) |
| fletch_grimwood_shield | 25 | 9 (4 629) | 2 697 | halten (9) |
| fletch_ashfen_buckler | 63 | 80 (20 571) | 17 640 | halten (80) |
| fletch_voidwood_pavise | 92 | 870 (142 364) | 74 127 | halten (870) |

---

## 6. Empfehlung — „Boden anheben, Spitze nicht nerfen"

Prinzip: Der Chef will *weniger brutal / monoton steigend*. Also **nur anheben oder Monotonie
reparieren, nie senken.** Alles ab **L40 bleibt exakt** (bereits glatt und über Ziel). Ich fasse nur
die kaputte Zone L5–L20 an. Genau **9 Werte** + **1 Dauer**:

| # | id | Änderung | Warum |
|---|---|---|---|
| 1 | fletch_iron_arrows | xp **2 → 4** | Behebt das tote Tier: 4 114 xp/h schlägt Bronze (3 600), bleibt < Stahl. Kern-Fix. |
| 2 | fletch_iron_shortbow | xp **3 → 6** | Eisen-Kurzbogen war 2 400 = schlechter als Bronze-Pfeile; jetzt 4 800, monoton. |
| 3 | fletch_iron_longbow | xp **6 → 9** | Eisen-Langbogen 3 323 < Bronze; jetzt 4 985, echter L10-Upgrade-Sprung. |
| 4 | fletch_bronze_shortbow | xp **3 → 4** | Glättet Kurzbogen-Linie (copper 2 400 < bronze 3 600 < iron 4 800). |
| 5 | fletch_bronze_longbow | xp **5 → 6** | Glättet Langbogen-Linie (2 700 < 3 927 < 4 985). |
| 6 | fletch_steel_shortbow | xp **8 → 9** | Hält Kurzbogen monoton nach dem Eisen-Bump (5 400 > iron 4 800). |
| 7 | fletch_steel_arrows | xp **4 → 5** | Hält Pfeil-Linie monoton nach dem Eisen-Bump (4 500 > iron 4 114). |
| 8 | fletch_steel_longbow | **dur 11000 → 8000** (xp 15 → 14) | Entfernt den Dauer-Cliff (11 000 ms war Ausreißer). Rate 4 909 → 6 300, Wall weg. |
| 9 | fletch_crude_arrows | xp **1 → 2** | Feel-Floor: die allererste Archer-Aktion soll kein „+1"-Tick sein. |

### Wirkung: Frontier nach Fix (monoton, keine Toten mehr)

| bei Level | beste Aktion (rec) | xp/h | Δ |
|---|---|---|---|
| 1 | copper_longbow | 2 700 | — |
| 5 | bronze_longbow | 3 927 | +45 % |
| 10 | **iron_longbow** | 4 985 | **+27 % (Tier lebt!)** |
| 20 | steel_longbow | 6 300 | +26 % (Wall weg) |
| 30 | blacksteel_longbow | 7 754 | +23 % |
| 40+ | unverändert | … | +34–109 % |

Zeit L→L+1 verbessert sich nur dort, wo es kaputt war: **L10** von 0.06 h auf 0.04 h, **L20** von
0.11 h auf 0.09 h. Alles ab L30 **identisch** — kein Eingriff, kein Nerf, keine Economy-Verschiebung.

### Monotonie-Check (Roh-XP je Linie nach Fix)
- Pfeile: 2, 3, **4**, **5**, 7, 10, 19, 36, 62, 110, 195, 365 — streng steigend ✓
- Kurzbogen: 2, **4**, **6**, **9**, 14, 18, 34, 64, 120, 278, 435, 845 — streng steigend ✓
- Langbogen: 3, **6**, **9**, **14**, 28, 36, 68, 128, 240, 555, 870, 1690 — streng steigend ✓

---

## 7. Nachrangige Punkte (kein XP-Wert-Fix, an Content/Chef melden)

- **Holzschild-Linie hat Content-Löcher**, nicht schlechte Zahlen: nur 4 Rezepte bei L15, L25, **L63**,
  L92. Zwischen Grimwood (L25) und Ashfen (L63) liegen **38 Level ohne Schild**, danach 29 Level Leere.
  Die 4 vorhandenen XP-Werte sind je für sich gut (alle über Ziel, intern monoton). → Empfehlung an
  Content: 2–3 Zwischen-Tiers (~L35, L45, L55, L75, L85) einschieben, damit der Offhand-Pfad eine
  Leiter statt vier Sprünge wird. XP dann per Formel `round(1.45 · target_xph(L) · dur/3.6e6)`.
- **L99-Formel-Falle**: `target_xph(99)=0`. Für godiron_shortbow/longbow (L99) NICHT die Formel
  anwenden — Wert extrapolieren. Aktuell korrekt (845 / 1690 liegen auf dem Trend). Nur dokumentieren.
- **Arrows/Shortbows sind XP-irrelevant**, da Langbögen jede Stufe dominieren. Das ist by design ok
  (Pfeile = Munition, Kurzbögen = eigene Gear-Nische), aber falls je „welche Aktion trainiere ich"
  Klarheit fehlt: die Langbogen-Dominanz ist gewollt und bleibt nach dem Fix erhalten.

---

## 8. Verdikt

**Note: 3 / 5** (befriedigend). Mittel- und Endgame (L30–99) sind sauber, monoton und großzügig über
Ziel — gut gebaut. Der Ruf „diabolisch" ist für Fletching **übertrieben bei der Rate**, aber es gibt
**einen echten toten Tier** (Eisen) plus eine frühe Wall und stingy Low-Level-Zahlen, die genau den
schlechten ersten Eindruck erzeugen, über den der Chef klagt. Alles mit 9 kleinen Anhebungen + 1
Dauer-Korrektur behebbar, ohne einen einzigen Nerf.

### Top-3-Fixes
1. **`fletch_iron_arrows` xp 2 → 4** — killt das tote Eisen-Tier (der eine echte Nicht-Monotonie-Bug).
2. **`fletch_steel_longbow` dur 11000 → 8000** — entfernt den Dauer-Cliff und die L20-Wall (Rate 4 909 → 6 300).
3. **Eisen-Bögen anheben** (`iron_shortbow` 3→6, `iron_longbow` 6→9) — L10 wird zum spürbaren Upgrade statt Downgrade.

---

## 9. Apply-Liste für content-dev (verbatim, in Reihenfolge)

Datei: `packages/content/src/index.ts` (Fletching-Block ~7446–7717). **Nur `xp` bzw. `durationMs`,
sonst nichts.**

1. `fletch_iron_arrows`: `xp: 2` → `xp: 4`
2. `fletch_steel_arrows`: `xp: 4` → `xp: 5`
3. `fletch_bronze_shortbow`: `xp: 3` → `xp: 4`
4. `fletch_iron_shortbow`: `xp: 3` → `xp: 6`
5. `fletch_steel_shortbow`: `xp: 8` → `xp: 9`
6. `fletch_bronze_longbow`: `xp: 5` → `xp: 6`
7. `fletch_iron_longbow`: `xp: 6` → `xp: 9`
8. `fletch_steel_longbow`: `durationMs: 11000` → `durationMs: 8000` **und** `xp: 15` → `xp: 14`
9. `fletch_crude_arrows`: `xp: 1` → `xp: 2`

Alle anderen Fletching-Aktionen: **unverändert lassen.** (Kein Nerf, keine Economy-Änderung.)
