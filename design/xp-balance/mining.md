# XP-Balance-Bericht — Bergbau (`mining`)

_Balance-Designer, 2026-07-01. Nur Analyse + Zahlen-Empfehlungen. Content-Katalog wird
NICHT von mir editiert — Umsetzung erfolgt separat mit Chef-Freigabe durch content-dev._

Quellen: `packages/content/src/index.ts` (Aktionen + Spitzhacken), `packages/engine/src/leveling.ts` (XP-Kurve).

---

## TL;DR — Verdikt zuerst

**Brutalitäts-Note: 2 / 5 (niedrig — Bergbau ist NICHT brutal, eher großzügig).**

Die Chef-Beschwerde („1 XP für eine Aktion, die Level 8 erfordert, ist diabolisch") trifft auf
Bergbau **nicht** zu. Im Gegenteil: Bergbau liegt an **jedem** Punkt der Kurve **über** dem
Referenz-Ziel (`target_xph`), im Schnitt bei ~**1,3×** Ziel — und besitzt bereits einen
harten Ganzzahl-Boden (min. 2 XP), der genau das „1-XP-Gefühl" verhindert. Die Progression
ist **streng monoton** (keine XP/h-Rückgänge, keine toten Tiers).

Es gibt genau **einen** echten Defekt:

1. **`mine_godiron` (L95) ist ein End-Game-Spike** — xp 475 statt der linientreuen ~295.
   Das sind **180.000 XP/h** = 2,09× Ziel und 1,66× die Nachbar-Aktion `mine_godgem_seam`.
   → **xp 475 → 295.** (Einziger Muss-Fix.)
2. `mine_garnet_seam` (L15) liegt minimal **unter** Kohle (3.200 < 3.429 XP/h) — kosmetisch. → xp 4 → 5 (optional).
3. `mine_voidstone_seam` (L82) leicht heiß (145 vs. 135 Linien-Referenz) — vernachlässigbar. → optional 145 → 135.

**Wichtige Warnung an content-dev:** Die rohe Ziel-Formel auf die frühen Tiers anzuwenden
würde `xp` auf 1–2 abrunden (siehe Spalte „1.0× roh") — **das** würde die diabolische
„1 XP"-Empfindung erst erzeugen. Der bestehende min-2-Boden ist die richtige Schutzmaßnahme
und muss bleiben.

---

## 1. Das Modell, gegen das ich balanciere

XP-Kurve (`leveling.ts`, RuneScape/Melvor-Stil, Cap L99):

```
acc += floor(n + 300 · 2^(n/7));  xpForLevel(n+1) = floor(acc/4)
```

Referenz-Ziel-Rate: `target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`.
Empfohlene Roh-XP einer Aktion: `round(target_xph(levelRequired) · durationMs / 3.6e6)`, min 1.

| L | kumulative XP | Δ zum nächsten Level | target_xph |
|---:|---:|---:|---:|
| 1  | 0 | 83 | 820 |
| 10 | 1.154 | 204 | 1.285 |
| 15 | 2.411 | 335 | 1.647 |
| 22 | 5.624 | 667 | 2.324 |
| 35 | 22.406 | 2.409 | 4.417 |
| 45 | 61.512 | 6.471 | 7.240 |
| 55 | 166.636 | 17.404 | 11.873 |
| 62 | 333.804 | 34.795 | 16.788 |
| 70 | 737.627 | 76.818 | 24.944 |
| 80 | 1.986.068 | 206.750 | 40.923 |
| 90 | 5.346.332 | 556.499 | 67.139 |
| 95 | 8.771.558 | 913.019 | 85.997 |
| 99 | 13.034.431 | — | — |

---

## 2. Alle Bergbau-Aktionen (21 Stück)

Basis-XP/h = `xp × 3.600.000 / durationMs` (ohne Spitzhacke/Mastery — Fairness-Baseline).
`ratio` = Basis-XP/h ÷ target_xph. `1.3×-Ref` = linientreue Soll-XP (das erkennbare Design-Ziel).

| id | Lvl | xp (cur) | durMs | Basis XP/h | target_xph | ratio | 1.0× roh | 1.3×-Ref | Empf. |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| mine_copper           | 1  | 2   | 3000 | 2.400   | 820    | 2,93 | 1  | 2   | **2** (behalten) |
| mine_tin              | 1  | 2   | 3000 | 2.400   | 820    | 2,93 | 1  | 2   | **2** (behalten) |
| mine_iron             | 10 | 3   | 3600 | 3.000   | 1.285  | 2,33 | 1  | 2   | **3** (behalten) |
| mine_coal             | 15 | 4   | 4200 | 3.429   | 1.647  | 2,08 | 2  | 2   | **4** (behalten) |
| mine_garnet_seam      | 15 | 4   | 4500 | 3.200   | 1.647  | 1,94 | 2  | 3   | **5** (opt. +1) |
| mine_gravesteel       | 22 | 5   | 4500 | 4.000   | 2.324  | 1,72 | 3  | 4   | **5** (behalten) |
| mine_bloodstone_seam  | 25 | 7   | 5000 | 5.040   | 2.697  | 1,87 | 4  | 5   | **7** (behalten) |
| mine_mithril          | 35 | 8   | 5000 | 5.760   | 4.417  | 1,30 | 6  | 8   | **8** (behalten) |
| mine_sapphire_seam    | 35 | 9   | 5500 | 5.891   | 4.417  | 1,33 | 7  | 9   | **9** (behalten) |
| mine_adamantite       | 45 | 14  | 5500 | 9.164   | 7.240  | 1,27 | 11 | 14  | **14** (behalten) |
| mine_runite           | 55 | 27  | 6500 | 14.954  | 11.873 | 1,26 | 21 | 28  | **27** (behalten) |
| mine_ruby_seam        | 55 | 27  | 6500 | 14.954  | 11.873 | 1,26 | 21 | 28  | **27** (behalten) |
| mine_murkvein         | 62 | 33  | 7000 | 16.971  | 16.788 | 1,01 | 33 | 42  | **33** (behalten) |
| mine_bloodiron        | 70 | 62  | 7000 | 31.886  | 24.944 | 1,28 | 49 | 63  | **62** (behalten) |
| mine_diamond_seam     | 75 | 88  | 7800 | 40.615  | 31.950 | 1,27 | 69 | 90  | **88** (behalten) |
| mine_titanium         | 80 | 115 | 7800 | 53.077  | 40.923 | 1,30 | 89 | 115 | **115** (behalten) |
| mine_voidstone_seam   | 82 | 145 | 8300 | 62.892  | 45.182 | 1,39 | 104| 135 | **135** (opt. −10) |
| mine_aetherite        | 90 | 205 | 8500 | 86.824  | 67.139 | 1,29 | 159| 206 | **205** (behalten) |
| mine_onyx_seam        | 90 | 210 | 8800 | 85.909  | 67.139 | 1,28 | 164| 213 | **210** (behalten) |
| **mine_godiron**      | 95 | **475** | 9500 | **180.000** | 85.997 | **2,09** | 227| **295** | **295** ← FIX |
| mine_godgem_seam      | 95 | 270 | 9000 | 108.000 | 85.997 | 1,26 | 215| 279 | **270** (behalten) |

**Kernbefund:** Die Spalte „1.3×-Ref" reproduziert die IST-Werte ab L35 fast punktgenau
(mithril 8=8, adamantite 14=14, runite 27≈28, bloodiron 62≈63, titanium 115=115,
aetherite 205≈206, onyx 210≈213, godgem 270≈279). Die Linie wurde also bewusst auf ~1,3× Ziel
gebaut. Der einzige Wert, der aus diesem Muster ausbricht, ist **godiron (475 statt 295)**.

---

## 3. Kurven-Analyse — Stunden pro Level & „Walls"

Beste freigeschaltete Aktion je Level, Basis (ohne Spitzhacke/Mastery):

| L→L+1 | beste Aktion | XP/h | Δ XP | Stunden |
|---|---|---:|---:|---:|
| 1→2   | mine_copper     | 2.400   | 83      | 0,03 |
| 10→11 | mine_iron       | 3.000   | 204     | 0,07 |
| 15→16 | mine_coal       | 3.429   | 335     | 0,10 |
| 22→23 | mine_gravesteel | 4.000   | 667     | 0,17 |
| 35→36 | mine_sapphire_seam | 5.891| 2.409   | 0,41 |
| 45→46 | mine_adamantite | 9.164   | 6.471   | 0,71 |
| 55→56 | mine_runite     | 14.954  | 17.404  | 1,16 |
| 62→63 | mine_murkvein   | 16.971  | 34.795  | 2,05 |
| 70→71 | mine_bloodiron  | 31.886  | 76.818  | 2,41 |
| 80→81 | mine_titanium   | 53.077  | 206.750 | 3,90 |
| 90→91 | mine_aetherite  | 86.824  | 556.499 | 6,41 |
| 98→99 | mine_godiron    | 180.000 | 1.228.825 | 6,83 |

- **Keine „Wall".** Der teuerste Einzel-Level (L98→99) kostet mit Basis-Aktion ~6,8 h; mit
  Runit-Spitzhacke (`speedMult 0,6` → 1,67× schneller) ~4,1 h. Für einen Idle-Skill (läuft
  offline/über Nacht) völlig im Rahmen.
- **Frühe Level sind trivial schnell** (0,03–0,17 h). Das ist das Gegenteil von „brutal" —
  Bergbau ist vorne sogar zu großzügig. Nicht kritisch, aber der Grund, warum die Note keine 1 ist.
- **Gesamt 1→99, Basis-Aktion, ohne Tools/Mastery: ~210 h.** Mit tier-gerechter Spitzhacke: ~**129 h**.
  Mastery-Boni senken das zusätzlich. Solide Idle-Ökonomie.

Lokaler weichster Punkt: **L55→62** (Runit-Plateau). Murkvein (L62) bringt nur +13 % XP/h
über Runit (L55) bei 7 Leveln Abstand und sitzt exakt auf Ziel (ratio 1,01) — der einzige
Tier, der nicht die 1,3×-Großzügigkeit mitnimmt. Kein Fehler (monoton), aber der einzige Ort,
der sich im Vergleich zu den Nachbarn etwas „zäh" anfühlt. Optionaler Feinschliff, kein Muss.

---

## 4. „Tote Tiers" & Monotonie-Check

**Erz-Linie (reines XP-Grinden), nach Level sortiert — streng monoton steigend:**
copper/tin 2.400 → iron 3.000 → coal 3.429 → gravesteel 4.000 → mithril 5.760 →
adamantite 9.164 → runite 14.954 → murkvein 16.971 → bloodiron 31.886 → titanium 53.077 →
aetherite 86.824 → godiron 180.000. **Keine Rückgänge, kein totes Tier.**

**Gem-Seam-Linie (XP + Edelstein-Farming) — ebenfalls streng monoton:**
garnet 3.200 → bloodstone 5.040 → sapphire 5.891 → ruby 14.954 → diamond 40.615 →
voidstone 62.892 → onyx 85.909 → godgem 108.000. **Keine Rückgänge.**

Einziger Interleave-Makel: `mine_garnet_seam` (L15, 3.200) liegt knapp **unter** dem
gleichstufigen `mine_coal` (L15, 3.429). Bei allen anderen Paaren liegt die Seam auf/über der
parallelen Erz-Aktion (z. B. ruby≈runite, onyx≈aetherite). Rein kosmetisch — die Seam tauscht
XP bewusst gegen Edelsteine — aber ein +1 XP (→ 4.000 XP/h) stellt das Muster sauber her.

---

## 5. „Diabolische" Fälle (winzige xp vs. levelRequired)

**Keine im wörtlichen Sinn.** Kleinste absolute Werte: copper/tin 2 XP @ L1, iron 3 @ L10,
coal 4 @ L15. Alle liefern 2.400–3.429 XP/h (2–3× Ziel) — die kleinen Zahlen sind Folge der
kurzen Dauer und der niedrigen absoluten XP-Kurve unten, **nicht** einer bestrafenden Rate.

Wo die Chef-Beschwerde herkommt (Hypothese für andere Skills, nicht Bergbau): Aktionen mit
kurzer `durationMs` bei mittlerem `levelRequired`, deren Roh-Ziel-XP < 1,5 ist und auf 1
abrundet — ohne Ganzzahl-Boden. Bergbau ist dagegen bereits abgesichert (min. 2). **Empfehlung
für die Skill-übergreifende Politik:** Ganzzahl-Boden von **2 XP** je Aktion generell festschreiben.

---

## 6. Konkrete Empfehlungen (Apply-Liste, geordnet)

| Prio | id | Feld | Alt | Neu | Begründung |
|---|---|---|---:|---:|---|
| **P1** | `mine_godiron` | `xp` | 475 | **295** | Entfernt den einzigen echten Spike. 295 → **111.789 XP/h**: bleibt Top-Erz, sitzt sauber über godgem (108.000) und aetherite (86.824). Bringt L95 auf die 1,3×-Linie (ratio 2,09 → 1,30). Monotonie bleibt erhalten. |
| P2 (opt.) | `mine_garnet_seam` | `xp` | 4 | **5** | 5 → 4.000 XP/h > Kohle 3.429. Stellt „Seam ≥ parallele Erz-Aktion" wie bei allen anderen Paaren her. Rein kosmetisch. |
| P3 (opt.) | `mine_voidstone_seam` | `xp` | 145 | **135** | Zieht den einzigen leicht heißen Seam-Wert (ratio 1,39) auf die 1,3×-Linie. Vernachlässigbar; nur für Perfektionisten. |

**Nicht anfassen:** Alle übrigen 18 Aktionen. Sie liegen bereits auf der bewussten
1,3×-Ziel-Linie mit sauberer Monotonie. Insbesondere **die frühen Tiers NICHT nach der rohen
Ziel-Formel absenken** (Spalte „1.0× roh" würde copper/iron auf 1–2 drücken) — das erzeugt erst
das „1-XP"-Gefühl und verlangsamt das Frühspiel. Der min-2-Boden bleibt.

**Durations:** keine Änderung nötig. Die `durationMs`-Leiter (3.000 → 9.500 ms) ist glatt und
skaliert sauber mit Tier + Spitzhacken-`speedMult` (0,92 → 0,60).

---

## 7. Verdikt

**Brutalitäts-Note: 2 / 5.** Bergbau ist fair bis großzügig, streng monoton, ohne tote Tiers,
mit funktionierendem Ganzzahl-Boden gegen das „1-XP"-Problem. Die Note ist keine 1, weil (a) ein
End-Game-Spike existiert und (b) die frühen Level trivial schnell sind (Inkonsistenz zur
1,3×-Linie, aber in Richtung „zu leicht", nicht „brutal").

**Top-3-Fixes:**
1. **`mine_godiron` xp 475 → 295** — den End-Game-Spike (2,09× Ziel / 1,66× Nachbar) glätten. Einziger Muss-Fix.
2. **`mine_garnet_seam` xp 4 → 5** — Seam knapp über gleichstufiges Kohle heben (Interleave-Sauberkeit).
3. **Politik: Ganzzahl-Boden 2 XP je Aktion festschreiben** — die eigentliche Wurzel der Chef-Beschwerde
   liegt in anderen Skills mit kurzen Aktionen, die auf 1 XP abrunden; Bergbau macht es bereits richtig.
