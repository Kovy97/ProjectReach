# XP-Balance-Bericht — Foraging (Sammeln)

**Skill:** `foraging` · **Autor:** Balance-Designer · **Datum:** 2026-07-01
**Scope:** Nur XP-Progression (Basis-XP/h, ohne Werkzeuge/Mastery). Read-only-Audit.
**Quellen:** `packages/content/src/index.ts` (Aktionen), `packages/engine/src/leveling.ts` (Kurve), `packages/engine/src/sim.test.ts` (Sim-Bestätigung).

---

## TL;DR — Verdikt: **Note 2 (gut, mit einem echten Strukturfehler)**

Die Chef-Beschwerde („1 XP für Level-8-Aktion ist diabolisch") trifft auf Foraging **heute nicht mehr zu**: die kleinste XP ist `2`, kein einziger Wert ist `1`, und die kürzeste Aktion liefert ~2.220 XP/h (Sim). Die alten diabolischen Roh-XP wurden bereits per „P2-fix"-Kommentaren im Code geglättet. **Kein toter, 0-XP/h-Fall.**

Was **bleibt**, ist kein Brutalität-, sondern ein **Ladder-Problem**: mehrere neu freigeschaltete Aktionen sind **strikte Downgrades** gegenüber etwas, das man schon hat → „tote Tiers". Der schlimmste Fall ist ein **20-Level-Plateau (L18→L38)**, in dem 4 aufeinanderfolgende Freischaltungen schlechter sind als die L18-Aktion.

**Top-3-Fixes:**
1. **Plateau L18–L38 auflösen** (Kritisch): `bloodthistle 4→6`, `blightmarsh 5→7`, `palefungus 5→8`, `mire_essence 6→9`, `umber_thickets 8→11`. Macht aus einem flachen 20-Level-Wall 5 echte Stufen.
2. **`forage_deepwood` (L15) reparieren** (Kritisch): `xp 4→6`. Aktuell −24 % unter der L12-Aktion → eine Region-Freischaltung, die sich wie eine Bestrafung anfühlt.
3. **Region-Schatten-Pockets glätten** (Politur): `gravemoss 10→12`, `verdant_blooms 25→28`, `void_essence 59→66`, `godfungus 132→153`, `radiant_blooms 235→273`. Jede Region-Aktion (+28 % über Kurve) überschattet die 2–3 Level später folgende Reagenz-Aktion.

**Wichtig für den Chef:** Diese Fixes ändern die **Gesamt-Grindzeit fast nicht** (241,7 h → 239,5 h für 1→99), weil die toten Aktionen ohnehin nie die optimale Wahl waren. Es ist **fast reine UX/Feel-Verbesserung** — jede Freischaltung fühlt sich endlich wie eine Belohnung an, ohne die Ökonomie zu verschieben.

---

## 1. Die XP-Kurve (Referenz)

`leveling.ts`: `xpForLevel` folgt der RuneScape/Melvor-Formel, Cap 99. Ziel-Durchsatz laut Studio-Modell:
`target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`.

| Level | XP L→L+1 | target_xph |
|------:|---------:|-----------:|
| 1  | 83      | 820    |
| 10 | 204     | 1.285  |
| 20 | 548     | 2.107  |
| 30 | 1.470   | 3.451  |
| 40 | 3.947   | 5.654  |
| 50 | 10.612  | 9.271  |
| 60 | ~29.000 | ~15.200|
| 70 | 76.818  | 24.944 |
| 80 | ~206.000| ~40.900|
| 90 | 556.499 | 67.139 |
| 97 | 1.112.977| 94.948|

Basis-XP/h einer Aktion: `xp · 3.600.000 / durationMs`.

---

## 2. Alle 32 Foraging-Aktionen (Ist-Zustand)

Sim-Werte (`pnpm test`, ungeared) bestätigen die statische Rechnung bis auf ~1–2 % Tick-Rundung.

| id | Lreq | dur (ms) | xp | xph (Basis) | target@Lreq | % Ziel |
|----|-----:|---------:|---:|------------:|------------:|-------:|
| forage_marshroot | 1 | 3000 | 2 | 2.400 | 820 | 293 % |
| forage_ashfields | 1 | 3200 | 2 | 2.250 | 820 | 274 % |
| forage_feathers | 5 | 4200 | 3 | 2.571 | 1.002 | 257 % |
| forage_sootcaps | 6 | 3400 | 3 | 3.176 | 1.057 | 300 % |
| forage_wildhives | 9 | 3600 | 3 | 3.000 | 1.224 | 245 % |
| forage_ash_essence | 12 | 3800 | 4 | 3.789 | 1.420 | 267 % |
| **forage_deepwood** | **15** | 5000 | **4** | **2.880** | 1.647 | 175 % |
| forage_umber_pods | 18 | 4200 | 5 | 4.286 | 1.909 | 224 % |
| **forage_bloodthistle** | **22** | 4600 | **4** | **3.130** | 2.324 | 135 % |
| **forage_blightmarsh** | **25** | 4800 | **5** | **3.750** | 2.697 | 139 % |
| **forage_palefungus** | **27** | 5000 | **5** | **3.600** | 2.977 | 121 % |
| **forage_mire_essence** | **33** | 5400 | **6** | **4.000** | 4.002 | 100 % |
| forage_umber_thickets | 38 | 5600 | 8 | 5.143 | 5.123 | 100 % |
| forage_cinderwood | 40 | 5400 | 11 | 7.333 | 5.654 | 130 % |
| **forage_gravemoss** | **42** | 5800 | **10** | **6.207** | 6.242 | 99 % |
| forage_gravefungus | 47 | 6000 | 13 | 7.800 | 7.993 | 98 % |
| forage_witchlights | 50 | 6200 | 16 | 9.290 | 9.271 | 100 % |
| forage_grave_essence | 53 | 6300 | 19 | 10.857 | 10.754 | 101 % |
| forage_frostmire | 55 | 6200 | 26 | 15.097 | 11.873 | 127 % |
| **forage_verdant_blooms** | **58** | 6600 | **25** | **13.636** | 13.773 | 99 % |
| forage_nightbloom | 62 | 6800 | 32 | 16.941 | 16.788 | 101 % |
| forage_voidfungus | 67 | 7100 | 42 | 21.296 | 21.502 | 99 % |
| forage_gloomfen | 70 | 7000 | 62 | 31.886 | 24.944 | 128 % |
| **forage_void_essence** | **73** | 7400 | **59** | **28.703** | 28.938 | 99 % |
| forage_violet_petals | 78 | 7700 | 79 | 36.935 | 37.065 | 100 % |
| forage_godsbreath | 82 | 7900 | 99 | 45.114 | 45.182 | 100 % |
| forage_voidheath | 85 | 7800 | 145 | 66.923 | 52.417 | 128 % |
| **forage_godfungus** | **87** | 8200 | **132** | **57.951** | 57.872 | 100 % |
| forage_starcaps | 90 | 8400 | 158 | 67.714 | 67.139 | 101 % |
| forage_divine_essence | 93 | 8600 | 186 | 77.860 | 77.890 | 100 % |
| forage_gravewood | 95 | 8800 | 270 | 110.455 | 85.997 | 128 % |
| **forage_radiant_blooms** | **97** | 8900 | **235** | **95.056** | 94.948 | 100 % |

**Beobachtung zur Kurvenform:** Die **Reagenz-Wirbelsäule** (marshroot→…→radiant_blooms) ist ab L33 exzellent auf ~100 % des Ziels getrimmt. Die **8 Region-Aktionen** (ashfields, deepwood, blightmarsh, cinderwood, frostmire, gloomfen, voidheath, gravewood) sind systematisch auf ~128 % getunt und sollen die „Premium-Anker" sein. Genau dieser +28 %-Überstand erzeugt die toten Pockets (siehe §4).

---

## 3. Progression: „beste verfügbare Aktion" (der Wall-Test)

Der Spieler nimmt immer die höchste verfügbare XP/h. So sieht die reale Progression aus:

| Level | beste Aktion | xph | % Ziel | Std. L→L+1 |
|------:|--------------|----:|-------:|-----------:|
| 1  | marshroot | 2.400 | 293 % | 0,03 |
| 10 | sootcaps | 3.176 | 247 % | 0,06 |
| 20 | **umber_pods** | 4.286 | 203 % | 0,13 |
| 25 | **umber_pods** | 4.286 | 159 % | 0,21 |
| 30 | **umber_pods** | 4.286 | 124 % | 0,34 |
| 35 | **umber_pods** | 4.286 | 97 %  | 0,56 |
| 40 | cinderwood | 7.333 | 130 % | 0,54 |
| 50 | witchlights | 9.290 | 100 % | 1,14 |
| 60 | frostmire | 15.097 | 99 % | 1,89 |
| 70 | gloomfen | 31.886 | 128 % | 2,41 |
| 80 | violet_petals | 36.935 | 90 % | 5,60 |
| 90 | starcaps | 67.714 | 101 % | 8,22 |
| 98 | gravewood | 110.455 | 111 % | 11,13 |

**Zeit ist monoton** (Std. L→L+1 steigt sauber, kein einzelner katastrophaler Zeit-Wall). Aber: bei **L18–L38 bleibt „umber_pods" 20 Level lang die beste Aktion** — 4.286 xph flach, während 5 neue Aktionen freischalten, die **alle schlechter** sind. Der Durchsatz sinkt zwar nie (die Zeit steigt korrekt mit der Kurve), aber es **fühlt sich tot an**: neue Tiers ohne Belohnung.

**Gesamtzeit 1→99 (Basis, ohne Werkzeuge/Mastery): ~241,7 h.**

---

## 4. Diagnose: Tote Tiers (strikte Downgrades bei Freischaltung)

Aktion in Level-Reihenfolge, deren xph ≤ bereits verfügbarem Bestwert liegt:

| tote Freischaltung | Lreq | xph | überschattet von | Defizit |
|--------------------|-----:|----:|------------------|--------:|
| forage_ashfields | 1 | 2.250 | marshroot @2.400 | −6 % · *tolerierbar (Alt-Loot, gleicher Level)* |
| forage_wildhives | 9 | 3.000 | sootcaps @3.176 | −6 % · *tolerierbar (Flavor/Honig)* |
| **forage_deepwood** | **15** | **2.880** | ash_essence @3.789 | **−24 %** ← Fix 2 |
| **forage_bloodthistle** | **22** | **3.130** | umber_pods @4.286 | **−27 %** ← Fix 1 |
| **forage_blightmarsh** | **25** | **3.750** | umber_pods @4.286 | **−12 %** ← Fix 1 |
| **forage_palefungus** | **27** | **3.600** | umber_pods @4.286 | **−16 %** ← Fix 1 |
| **forage_mire_essence** | **33** | **4.000** | umber_pods @4.286 | **−7 %** ← Fix 1 |
| **forage_gravemoss** | **42** | **6.207** | cinderwood @7.333 | **−15 %** ← Fix 3 |
| **forage_verdant_blooms** | **58** | **13.636** | frostmire @15.097 | **−10 %** ← Fix 3 |
| **forage_void_essence** | **73** | **28.703** | gloomfen @31.886 | **−10 %** ← Fix 3 |
| **forage_godfungus** | **87** | **57.951** | voidheath @66.923 | **−13 %** ← Fix 3 |
| **forage_radiant_blooms** | **97** | **95.056** | gravewood @110.455 | **−14 %** ← Fix 3 |

**Zwei Muster:**

- **A) Das große Plateau (L18–L38).** Ursache: `umber_pods` (L18) ist mit 224 % des Ziels überhitzt, während die T2-Reagenz-Linie schon auf ~100–135 % zurückgetrimmt wurde. Ergebnis: 4 tote Freischaltungen hintereinander + flacher Durchsatz über 20 Level. **Das ist der Haupt-Strukturfehler.**
- **B) Region-Schatten-Pockets (wiederkehrend).** Jede +28 %-Region-Aktion (cinderwood, frostmire, gloomfen, voidheath, gravewood) überschattet die 2–3 Level später folgende Reagenz-Aktion (auf ~100 %), weil das Ziel in 3 Levels nur ~10–15 % steigt, die Region aber 28 % darüber liegt. Jeweils nur 1 Aktion / 2–4 Level lang tot, dann holt die Reagenz-Linie beim nächsten Tier auf → **milder** als (A).

**Kein diabolischer Roh-XP-Fall.** Die vom Chef zitierte „1 XP"-Situation existiert in Foraging nicht (mehr). Kleinste XP = 2; kleinste xph = 2.220 (Sim); kein 0-XP/h-Skilling-Flag.

---

## 5. Empfehlungen (konkrete neue Zahlen)

Hebel = **nur `xp`** (Dauern bleiben, damit Loot-Raten/Ökonomie unberührt). Prinzip: jede Freischaltung ist ein echtes Upgrade (oder ≤2 % Seiten-Grade bei bewussten Alt-Loot-Aktionen).

### Fix 1 — Plateau L18–L38 auflösen (KRITISCH, P1)

| id | Lreq | dur | xp alt→neu | xph alt→neu | % Ziel neu |
|----|-----:|----:|:----------:|:-----------:|-----------:|
| forage_bloodthistle | 22 | 4600 | **4 → 6** | 3.130 → 4.696 | 202 % |
| forage_blightmarsh | 25 | 4800 | **5 → 7** | 3.750 → 5.250 | 195 % |
| forage_palefungus | 27 | 5000 | **5 → 8** | 3.600 → 5.760 | 193 % |
| forage_mire_essence | 33 | 5400 | **6 → 9** | 4.000 → 6.000 | 150 % |
| forage_umber_thickets | 38 | 5600 | **8 → 11** | 5.143 → 7.071 | 138 % |

Ergibt eine sauber steigende Leiter: umber_pods 4.286 → 4.696 → 5.250 → 5.760 → 6.000 → 7.071 → cinderwood 7.333. Die 190–200 %-Werte sind früh, aber **konsistent** mit dem ohnehin generösen Frühspiel (umber_pods steht bereits bei 224 %) — es ist die Fortsetzung derselben Linie, kein Ausreißer.

### Fix 2 — `forage_deepwood` (KRITISCH, P1)

| id | Lreq | dur | xp alt→neu | xph alt→neu | % Ziel neu |
|----|-----:|----:|:----------:|:-----------:|-----------:|
| forage_deepwood | 15 | 5000 | **4 → 6** | 2.880 → 4.320 | 262 % |

Hebt die L15-Region über die L12-Reagenz (ash_essence 3.789). Liegt danach quasi gleichauf mit umber_pods (4.320 vs 4.286, <1 %) → sauberer Seiten-Grade mit eigenem Loot (frostvine/deathmoss), kein Downgrade mehr.

### Fix 3 — Region-Schatten-Pockets glätten (POLITUR, P2)

Jede Aktion knapp über den vorausgehenden Region-Anker heben (wird damit selbst kurz Best-in-Slot, bevor das nächste Tier übernimmt):

| id | Lreq | dur | xp alt→neu | xph alt→neu | überholt |
|----|-----:|----:|:----------:|:-----------:|----------|
| forage_gravemoss | 42 | 5800 | **10 → 12** | 6.207 → 7.448 | cinderwood 7.333 |
| forage_verdant_blooms | 58 | 6600 | **25 → 28** | 13.636 → 15.273 | frostmire 15.097 |
| forage_void_essence | 73 | 7400 | **59 → 66** | 28.703 → 32.108 | gloomfen 31.886 |
| forage_godfungus | 87 | 8200 | **132 → 153** | 57.951 → 67.171 | voidheath 66.923 |
| forage_radiant_blooms | 97 | 8900 | **235 → 273** | 95.056 → 110.427 | gravewood 110.455 |

*Alternative zu Fix 3, falls man die Kurve enger am 100 %-Ziel halten will:* statt die Reagenz zu heben, die 5 Region-Anker von +28 % auf ~+10 % trimmen. Das **reduziert** aber XP (fühlt sich brutaler an) und schwächt die „Premium-Region"-Identität — daher **nicht** empfohlen angesichts der Chef-Vorgabe „fair, nicht brutal".

### Bewusst NICHT ändern
`forage_ashfields` (−6 %) und `forage_wildhives` (−6 %) sind Alt-/Flavor-Aktionen mit eigenem Loot auf ~gleichem Level → tolerierbare Seiten-Grades, kein Fix nötig.

---

## 6. Validierung des Empfehlungssatzes

Nach Anwendung aller Fixes (Monotonie-Check der besten verfügbaren Aktion):

- **Kein strikter Downgrade > 1 %** mehr. Verbleibende „Ties": ashfields −6 %, wildhives −6 % (bewusste Flavor), umber_pods −1 % vs deepwood, radiant_blooms 0 % vs gravewood — alle Seiten-Grades mit unterschiedlichem Loot.
- **Gesamtzeit 1→99: 241,7 h → 239,5 h** (−0,9 %). Die Ökonomie bleibt praktisch unverändert; der Gewinn ist reines „jede Freischaltung ist ein Upgrade"-Feel.
- Loot-Chancen/-Mengen und Dauern unangetastet → Gold/h und Reagenz-Versorgung unverändert.

---

## 7. Apply-Liste für content-dev (geordnet, verbatim)

Nur `xp`-Felder in `packages/content/src/index.ts`, Foraging-Block (Z. ~6758–7076). **Dauern nicht anfassen.**

**P1 — Plateau + deepwood (Pflicht):**
1. `forage_deepwood`: `xp: 4` → `xp: 6`
2. `forage_bloodthistle`: `xp: 4` → `xp: 6`
3. `forage_blightmarsh`: `xp: 5` → `xp: 7`
4. `forage_palefungus`: `xp: 5` → `xp: 8`
5. `forage_mire_essence`: `xp: 6` → `xp: 9`
6. `forage_umber_thickets`: `xp: 8` → `xp: 11`

**P2 — Region-Pockets (Politur):**
7. `forage_gravemoss`: `xp: 10` → `xp: 12`
8. `forage_verdant_blooms`: `xp: 25` → `xp: 28`
9. `forage_void_essence`: `xp: 59` → `xp: 66`
10. `forage_godfungus`: `xp: 132` → `xp: 153`
11. `forage_radiant_blooms`: `xp: 235` → `xp: 273`

**Nachkontrolle:** `pnpm test` (Sim-Block, Cache ggf. leeren — siehe Memory „Turbo-Test-Cache-Falle") → prüfen, dass die Foraging-XP/h-Liste in Level-Reihenfolge monoton steigt und kein 0-XP/h-Eintrag existiert.

> Hinweis: Bestehende `// P2-fix`-Kommentare an einigen Aktionen aktualisieren, damit die dokumentierten xph-Werte konsistent bleiben.
