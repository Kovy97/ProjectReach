# XP-Balance-Bericht — Schmieden (`smithing`)

_Balance-Designer, 2026-07-01. Nur Analyse + Zahlen-Empfehlungen. Content-Katalog wird
NICHT von mir editiert — Umsetzung erfolgt separat mit Chef-Freigabe durch content-dev._

Quellen: `packages/content/src/index.ts` (Smelt- + Forge-Aktionen), `packages/engine/src/leveling.ts` (XP-Kurve).
Alle XP/h sind **deterministisch aus dem Katalog** gerechnet: `xp/h = xp · 3.600.000 / durationMs`.
Baseline = ungebufft (ohne Werkzeug-/Mastery-Boni; die verändern alle Aktionen gleichmäßig und
ändern die Kurven-**Form** nicht).

---

## TL;DR — Verdikt zuerst

**Brutalitäts-Note: 2 / 5 (niedrig — Schmieden ist NICHT brutal, eher großzügig).**

Die Chef-Beschwerde („1 XP für eine Aktion, die Level 8 erfordert, ist diabolisch") trifft auf
Schmieden **auf der Raten-Ebene nicht** zu. Jede Smelt-Aktion liegt **über** dem Referenz-Ziel
(`target_xph`), die Haupt-Smelt-Linie ab Blacksteel (L30) sitzt sogar **frappierend sauber bei
~1,28× Ziel**. Forge-Aktionen laufen mit Barren auf der Hand mit **2–8× Ziel**, im
Voll-Kreislauf (Erz→Barren→Gear) immer noch **1,6–3× Ziel**. Die Progression auf der
**best-verfügbaren Aktion ist streng monoton** — kein Level-Fenster fällt unter die Zielkurve,
es gibt keine XP/h-Walls und keine toten Tiers im Rate-Sinn.

Das „diabolische" Gefühl bei Schmieden ist **kosmetisch + punktuell**, nicht strukturell:

1. **`recycle_scrap` (L5, xp 1) — der einzige echte Trap.** 1.029 XP/h ist die **niedrigste
   Rate der gesamten Skill** und liegt bei einer Level-5-Aktion. Das ist der Schmiede-Zwilling
   von „1 XP für Level 8". → **xp 1 → 3.**
2. **1-XP-Böden killen.** `smelt_copper` (L1) und `recycle_scrap` (L5) sind die einzigen zwei
   1-XP-Aktionen. Ein Tooltip, der beim allerersten Klick „+1 XP" tickt, **erzeugt** die
   Brutalitäts-Empfindung — obwohl die Rate völlig in Ordnung ist. → `smelt_copper` **xp 1 → 2.**
3. **`smelt_murkvein` (L62) — Per-Aktion-Monotonie-Delle.** Gibt roh **26 XP**, während das
   niedrigere `smelt_runite` (L55) **36 XP** gibt. Der Tooltip liest sich als Rückschritt
   (26 < 36), obwohl die kürzere Dauer die Rate rettet. → **xp 26 → 37.**

Sekundär (kein Muss): Die frühen Smelt-Tiers laufen leicht **heiß** (Bronze 2,4× / Iron 1,75×
Ziel) und die späten Forge-Tiers driften relativ großzügiger (Forge-only bis 8× Ziel). Da der
Chef „zu brutal" beklagt, empfehle ich **keine Nerfs** — nur die Böden/Dellen anheben.

---

## 1. Das Modell, gegen das ich balanciere

XP-Kurve (`leveling.ts`, RuneScape/Melvor-Stil, Cap L99):

```
acc += floor(n + 300 · 2^(n/7));  xpForLevel(n+1) = floor(acc/4)
```

Referenz-Ziel-Rate: `target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`.

| L | kumulative XP | Δ zum nächsten Level | target_xph |
|---:|---:|---:|---:|
| 1  | 0 | 83 | 820 |
| 5  | 388 | 124 | 1.002 |
| 10 | 1.154 | 204 | 1.285 |
| 20 | 4.470 | 548 | 2.107 |
| 22 | 5.624 | 667 | 2.324 |
| 30 | 13.363 | 1.470 | 3.451 |
| 35 | 22.406 | 2.409 | 4.417 |
| 40 | 37.224 | 3.947 | 5.654 |
| 45 | 61.512 | 6.471 | 7.240 |
| 55 | 166.636 | 17.404 | 11.873 |
| 60 | 273.742 | 28.546 | 15.206 |
| 62 | 333.804 | 34.795 | 16.788 |
| 65 | 421.548 | 46.855 | 19.475 |
| 70 | 737.627 | 76.818 | 24.944 |
| 75 | 1.260.977 | 126.055 | 31.950 |
| 80 | 1.986.068 | 206.750 | 40.923 |
| 85 | 3.192.941 | 339.240 | 52.417 |
| 90 | 5.346.332 | 556.499 | 67.139 |
| 95 | 8.771.558 | 913.019 | 85.997 |
| 99 | 13.034.431 | — | — |

---

## 2. Skill-Struktur

Schmieden hat **zwei Aktions-Klassen** über **12 Metall-Tiers** (+2 Seiten-Metalle):

- **Smelt** (Erz → Barren): 1 Haupt-Aktion pro Tier, verbraucht Erz (+ Kohle ab Steel). Das ist
  der eigentliche „Grind für Material"-Schritt.
- **Forge** (Barren → Gear): ~20 Rezepte pro Tier (Dolch…Plattenrüstung, Pfeilspitzen). Verbraucht
  1–6 Barren. **Wichtig:** Barren müssen erst gesmeltet werden → die *ehrliche* XP/h einer
  Forge-Only-Session überschätzt, weil die Smelt-Zeit fehlt. Ich rechne deshalb beides:
  „Forge-only" (Barren auf Hand) **und** „Voll-Kreislauf" (Erz→Barren→Gear).

Haupt-Tiers (Smelt-Level): copper 1 · bronze 5 · iron 10 · steel 20 · blacksteel 30 · mithril 35
· adamantium 45 · runite 55 · bloodiron 65 · titanium 75 · aetherium 85 · godiron 95.
Seiten-Metalle: **gravesteel** (L22, Kategorie eigen) und **murkvein** (L62, Kategorie `runite`).

---

## 3. Smelt-Linie (Erz → Barren) — die Kern-Progression

| id | L | dur ms | xp (jetzt) | XP/h | target/h | ratio | ideal xp @1,28× | Empfehlung |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| smelt_copper | 1 | 2.600 | **1** | 1.385 | 820 | 1,69 | 2 | **xp 1 → 2** (kein 1-XP-Boden) |
| recycle_scrap | 5 | 3.500 | **1** | **1.029** | 1.002 | **1,03** | 2 | **xp 1 → 3** (Trap, s. §6) |
| smelt_bronze | 5 | 3.000 | 2 | 2.400 | 1.002 | 2,39 | 2 | belassen (heiß, aber Onboarding) |
| smelt_iron | 10 | 3.200 | 2 | 2.250 | 1.285 | 1,75 | 2 | belassen |
| smelt_steel | 20 | 4.500 | 4 | 3.200 | 2.107 | 1,52 | 3 | belassen |
| smelt_gravesteel | 22 | 4.800 | 5 | 3.750 | 2.324 | 1,61 | 4 | belassen |
| smelt_blacksteel | 30 | 6.000 | 7 | 4.200 | 3.451 | 1,22 | 7 | ✓ linientreu |
| smelt_mithril | 35 | 6.500 | 10 | 5.538 | 4.417 | 1,25 | 10 | ✓ linientreu |
| smelt_adamantium | 45 | 7.500 | 19 | 9.120 | 7.240 | 1,26 | 19 | ✓ linientreu |
| smelt_runite | 55 | 8.500 | 36 | 15.247 | 11.873 | 1,28 | 36 | ✓ linientreu |
| smelt_murkvein | 62 | 5.500 | **26** | 17.018 | 16.788 | 1,01 | 33 | **xp 26 → 37** (Delle, s. §5) |
| smelt_bloodiron | 65 | 9.000 | 62 | 24.800 | 19.475 | 1,27 | 62 | ✓ linientreu |
| smelt_titanium | 75 | 9.500 | 110 | 41.684 | 31.950 | 1,30 | 108 | ✓ linientreu |
| smelt_aetherium | 85 | 10.500 | 195 | 66.857 | 52.417 | 1,28 | 196 | ✓ linientreu |
| smelt_godiron | 95 | 12.000 | 365 | 109.500 | 85.997 | 1,27 | 367 | ✓ linientreu |

**Befund:** Die Haupt-Smelt-Linie **ab Blacksteel (L30) ist praktisch perfekt** — jede Aktion
sitzt bei 1,22–1,30× Ziel, die „ideal @1,28×"-Spalte reproduziert die vorhandenen XP fast exakt.
Das ist keine brutale, sondern eine **sorgfältig getunte** Kurve. Die einzigen Auffälligkeiten:

- **Böden:** `smelt_copper` und `recycle_scrap` mit roh 1 XP (kosmetisch bzw. Trap).
- **Heiße frühe Tiers:** Bronze (2,39×) und Iron (1,75×) laufen über der Linie — als *Nerf* würde
  ich das nicht anfassen (Onboarding soll fliegen, Chef will es großzügiger, nicht härter).
- **Murkvein:** die einzige echte **Per-Aktion-Delle** (§5).

---

## 4. Forge-Linie (Barren → Gear) — Raten pro Tier

Repräsentativ: Dolch (1 Barren), Schwert (2), Plattenrüstung (5, godiron 6). „Voll-Kreislauf"
addiert die Smelt-Zeit/XP der benötigten Barren dazu.

| Tier | L | Dolch/h | Schwert/h | Platte/h | **Platte Voll-Kreislauf/h** | target/h |
|---|---:|---:|---:|---:|---:|---:|
| copper | 1 | 2.400 | 2.057 | 2.000 | 1.636 | 820 |
| bronze | 5 | 2.700 | 3.273 | 4.680 | 3.312 | 1.002 |
| iron | 10 | 2.400 | 3.323 | 6.000 | 3.600 | 1.285 |
| steel | 20 | 4.800 | 4.909 | 11.400 | 6.052 | 2.107 |
| blacksteel | 30 | 6.300 | 7.754 | 18.000 | 8.591 | 3.451 |
| mithril | 40 | 8.100 | 10.368 | 24.923 | 11.077 | 5.654 |
| adamantium | 50 | 13.600 | 16.883 | 40.800 | 18.171 | 9.271 |
| runite | 60 | 23.040 | 27.927 | 67.765 | 30.252 | 15.206 |
| bloodiron | 70 | 39.273 | 46.703 | 113.684 | 51.188 | 24.944 |
| titanium | 80 | 83.400 | 97.463 | 238.286 | 101.956 | 40.923 |
| aetherium | 90 | 120.462 | 139.200 | 340.435 | 150.199 | 67.139 |
| godiron | 95 | 202.800 | 229.585 | 676.000 | 264.000 | 85.997 |

**Befund:**

- **Keine tote Forge-Aktion, keine Wall.** Die best-verfügbare Voll-Kreislauf-Rate steigt
  streng monoton: 1.636 → 3.312 → 3.600 → 6.052 → 8.591 → 11.077 → 18.171 → 30.252 → 51.188
  → 101.956 → 150.199 → 264.000 XP/h. An **keinem** Level-Fenster fällt man unter `target/h`.
- **Innerhalb eines Tiers** ist die Streuung klein (Dolch↔Platte ~Faktor 1,5–3) — es gibt eine
  „beste" XP-Aktion (Plattenrüstung), aber keine der anderen ist ein Trap.
- **Relative Großzügigkeit driftet nach oben:** Forge-only-Platte ist bei copper 2,4× Ziel, bei
  godiron 7,9× Ziel. Das macht das End-Game kürzer als das Modell vorsieht. Da der Chef „zu
  brutal" beklagt, ist das aktuell **kein Problem**, das ich fixen würde — nur als Info, falls
  das Ziel „Skilling exakt auf `target_xph`" ernst genommen werden soll (dann Forge-XP der
  Tiers 80–95 um ~15–20 % trimmen — **nicht empfohlen bei aktueller Chef-Richtung**).

---

## 5. Die eine echte Monotonie-Delle: `smelt_murkvein`

`smelt_murkvein` (L62) gibt roh **26 XP**, `smelt_runite` (L55) gibt **36 XP**. Ein Spieler, der
das später freigeschaltete Metall smeltet, sieht im Tooltip eine **kleinere** Zahl — liest sich
als Rückschritt. Per Stunde ist es dank kürzerer Dauer (5.500 ms) mit 17.018 XP/h knapp *über*
runite (15.247 XP/h), aber die **Wahrnehmung** ist das Problem (genau das Register der
Chef-Beschwerde).

Ursache: murkvein hat als Seiten-Metall eine deutlich kürzere Dauer als runite; um bei 1,28× Ziel
zu landen bräuchte es nur 33 XP — das bleibt aber unter runites 36. Um die **Per-Aktion-Monotonie
zu garantieren**, muss man leicht überschießen:

- **Empfehlung: xp 26 → 37** (→ 24.218 XP/h, 1,44× Ziel). Damit ist der Tooltip monoton
  (37 > 36) **und** die Rate bleibt der modeste Upgrade, den L62 verspricht.
- Alternative (falls die Rate exakt linientreu bleiben soll): Dauer 5.500 → 7.500 ms **und**
  xp 26 → 34. Mehr Churn, gleiche Wirkung — nur wenn content-dev sowieso die Dauer anfasst.

---

## 6. Der Trap: `recycle_scrap`

```
recycle_scrap: L5, durationMs 3500, xp 1, inputs 4× item_scrap → 1 copper_bar
```

Das ist die **schlechteste Aktion der gesamten Skill**: 1.029 XP/h, an einer Level-5-Aktion, mit
roh **1 XP** trotz Verbrauch von **4** Schrott-Items. Das ist exakt der „1 XP für eine höhere
Level-Aktion = diabolisch"-Fall, nur mit L5 statt L8. Es ist als Junk-Verwertung gedacht (Schrott
→ Barren), aber in der aktuellen Form eine Falle: langsamer als das direkte `smelt_copper` (L1)
und weit unter `smelt_bronze` (L5, gleiches Level, 2.400 XP/h).

- **Empfehlung: xp 1 → 3.** Ergibt 3.086 XP/h — auf Augenhöhe mit der Bronze-Smelt seines
  eigenen Levels, macht die Schrott-Route zu einer **validen Alternative** statt zu einem Trap.
  (xp 4 = 4.114 XP/h wäre auch vertretbar, da durch Schrott-Nachschub natürlich gedeckelt; 3 ist
  die konservative, linientreuere Wahl.)

---

## 7. Konkrete Apply-Liste (für content-dev, nach Chef-Freigabe)

Geordnet nach Wichtigkeit. **Alle Änderungen sind reine `xp`-Bumps — keine Dauer-Änderung nötig.**

| # | id | levelRequired | xp jetzt | xp neu | Grund |
|---|---|---:|---:|---:|---|
| 1 | `recycle_scrap` | 5 | 1 | **3** | Einziger echter Trap; niedrigste Rate der Skill an L5. |
| 2 | `smelt_murkvein` | 62 | 26 | **37** | Per-Aktion-Monotonie-Delle (26 < runite 36). |
| 3 | `smelt_copper` | 1 | 1 | **2** | Letzter 1-XP-Boden; verhindert „+1 XP"-Erstklick-Gefühl. |

Das war's. **Kein weiterer Fix nötig.** Alles andere (Smelt-Linie ab Blacksteel, gesamte
Forge-Linie) ist monoton, über Ziel und ohne tote Tiers.

**Warnung an content-dev (wie bei mining):** Die rohe Ziel-Formel auf frühe Tiers anzuwenden
würde `xp` auf 1 abrunden und **genau** das diabolische Gefühl erzeugen. Der min-2-Boden (bzw.
min-3 bei Trap-Aktionen) ist die richtige Schutzmaßnahme — **nicht** die Roh-Formel blind
übernehmen.

---

## 8. Verdikt

**Note: 2 / 5 (niedrig-brutal → eigentlich großzügig).**

Schmieden widerlegt die pauschale Chef-These „Nicht-Kampf-XP zu brutal": die Raten liegen
durchweg **über** dem Ziel, die Haupt-Smelt-Linie ist bei ~1,28× Ziel geradezu vorbildlich
getunt, und die best-verfügbare Progression ist streng monoton ohne Walls. Das „diabolische"
Gefühl kommt aus **kosmetischer Zahlen-Granularität** (1-XP-Ticks am Anfang) und **zwei
Punkt-Defekten**, nicht aus der Kurven-Form.

**Top-3-Fixes:**
1. `recycle_scrap` xp **1 → 3** (Trap entschärfen).
2. `smelt_murkvein` xp **26 → 37** (Per-Aktion-Monotonie herstellen).
3. `smelt_copper` xp **1 → 2** (letzten 1-XP-Boden entfernen).
