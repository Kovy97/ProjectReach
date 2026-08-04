# XP-Balance-Bericht: Kräuterkunde / Herblore (`herblore`)

_Balance-Designer, 2026-07-01. Reine Analyse — keine Content-Änderung. Einpflegen nur nach Chef-Freigabe via content-dev._

## Verdikt (Kurzfassung)

**Note: 3 / 5 (befriedigend).** Die Ziel­kurve ist **in Summe fair und NICHT brutal**: von L21 aufwärts sitzen ~24 von 40 Aktionen auf **1,00× Ziel** (das Content-Team hat sichtbar nach der Formel `round(target_xph·dur/3.6M)` gebalanced — die Kommentare im Code beweisen das). Das Problem ist **lokal**, nicht global:

1. **Ein doppeltes „Legacy"-Tier auf Stufe 1** (`brew_antivenom`, `brew_minor_healing`, `brew_greater_healing` — alle ohne `levelRequired`, also default L1) zahlt **1.800–2.160 XP/h** und ist damit bis **L20 die beste Aktion überhaupt**. Es plättet das gesamte Frühspiel und bricht die Monotonie: der eigentlich vorgesehene L1–L20-Aufstieg ist strikt schlechter als eine L1-Aktion.
2. **„1-XP"-Totzone L3/L5** (`brew_forager_tonic_i` L3, `brew_oxblood_tonic` L5 — je **xp 1**). `oxblood` L5 zahlt mit **800 XP/h** sogar **weniger** als die L1-/L3-Aktionen und liegt bei **0,80× Ziel**. Das ist der vom Chef zitierte „1 XP ist diabolisch"-Fall in Reinform.
3. **Eine echte Mitte-Falle:** `brew_emberroot_tonic` L65 zahlt nur **0,77× Ziel** (15.000 XP/h) und ist damit ein **totes Tier** — bei L65 brütet man lieber das L62-`gravensap_salve` (16.500/h) weiter.
4. **Fünf über-getunte Spikes**, die je eine Durchsatz-Inversion beim nächsten Unlock erzeugen: `mandrake_tincture` L30 (**1,76×!**), `bloodmend_draught` L55 (1,29×), `revenant_elixir` L85 (1,28×), `godbloom_infusion` L95 (1,18×), `corpse_lily_salve`/`salve_of_mending` (1,25×/1,33×).

Insgesamt **14 Durchsatz-Inversionen** über die Line (höheres Tier zahlt weniger XP/h als ein schon offenes niedrigeres). Nach den Fixes bleiben **4 kosmetische Rest-Zittern** übrig, alle im <2-h-Band L3–L16 und ohne Effekt auf die *beste offene Rate* (die Progressions-Front ist dann monoton).

**Top-3-Fixes:**
1. **Legacy-Trio ent-plätten:** die drei L1-Default-Aktionen bekommen ein explizites `levelRequired` + Ziel-XP: `brew_antivenom` → **L8, xp 3→2**; `brew_greater_healing` → **L16, xp 3→3** (nur Level setzen); `brew_minor_healing` → **L1, xp 2→1**. Damit verschwindet die L1–L20-Dominanz und der vorgesehene Frühaufstieg greift. (Die Ausgabe-Items bleiben — sie werden von Rezepten/Quests genutzt, siehe §6.)
2. **Totes Tier reparieren:** `brew_emberroot_tonic` L65 **xp 50 → 65** (0,77× → 1,00× Ziel).
3. **Spikes auf Kurve ziehen (killt die Inversionen):** `mandrake_tincture` **16→9**, `bloodmend_draught` **34→26**, `revenant_elixir` **205→160**, `godbloom_infusion` **535→454**, `corpse_lily_salve` **130→104**, `salve_of_mending` **6→5**.

---

## 1. Methodik

- **XP-Kurve** (`packages/engine/src/leveling.ts`): `acc += floor(n + 300·2^(n/7))`, `xpForLevel(L+1) = floor(acc/4)`. Cap 99. RuneScape/Melvor-artig, exponentiell.
- **Ziel-Durchsatz** (Studio-Modell): `target_xph(L) = 90·√(xpForLevel(L+1) − xpForLevel(L))`.
- **Aktions-XP-Formel:** `xp = round(target_xph(levelRequired) · durationMs / 3_600_000)`, min 1.
- **Basis-XP/h einer Aktion:** `xp · 3_600_000 / durationMs`. Ungebufte Grundrate — Werkzeuge/Mastery (u.a. `potionPreserve`-Effekt +5%/Stufe) liegen oben drauf und sind hier NICHT eingerechnet (Baseline = Worst Case).
- **Ratio** = Basis-XP/h ÷ target_xph(level). 1,00 = perfekt auf Kurve; <0,8 = untertunt/Falle; >1,4 = übergroßzügig.
- **Default `levelRequired`:** `action.levelRequired ?? 1` (bestätigt in `packages/shared/src/index.ts:959` und `packages/engine/src/actions.ts:8`). Die drei Legacy-Aktionen **ohne** `levelRequired` sind also faktisch **L1**.
- Alle 40 Herblore-Aktionen verbrauchen Kräuter/Reagenzien und geben 1× Trank/Tinktur/Salbe zurück (chance 1). Kein Sekundär-Loot.
- **Hinweis Sim:** Der `pnpm test`-Sim-Block deckt Gathering + Combat ab, **nicht** die Braurezepte — Herblore hat keine Live-XP/h-Zeile, es gibt also keine `0 XP/h`-Roten-Fahnen aus dem Sim. Die hier genannten Raten sind analytisch (Basis, ungebuft).

## 2. Referenz: XP-Kurve & Ziel-Durchsatz

| Level | xpForLevel | XP für L→L+1 | target_xph |
|---|---|---|---|
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
| 99 | 13.034.431 | (Cap) | 99.767* |

*Am Cap ist `target_xph(99)` per Formel 0 (kein Folgelevel). Als Proxy `target_xph(98)` = 99.767/h.

## 3. Aggregat: Der Skill ist NICHT „zu brutal" — die Kurve ist fair

Stunden für L→L+1 mit der **jeweils besten offenen Aktion** (Basis, ungebuft, aktueller Stand):

| ab Level | beste offene Aktion | Basis-XP/h | h für L→L+1 | vs. Ziel |
|---|---|---|---|---|
| 1  | brew_antivenom (L1!) | 2.160 | 0,04 | 2,63× |
| 10 | brew_antivenom (L1!) | 2.160 | 0,09 | 1,68× |
| 20 | brew_antivenom (L1!) | 2.160 | 0,25 | 1,03× |
| 30 | brew_mandrake_tincture | 6.063 | 0,24 | 1,76× |
| 40 | brew_mandrake_tincture | 6.063 | 0,65 | 1,07× |
| 50 | brew_witchlight_tonic | 9.360 | 1,13 | 1,01× |
| 60 | brew_bloodmend_draught | 15.300 | 1,87 | 1,01× |
| 70 | brew_corpse_lily_salve | 31.200 | 2,46 | 1,25× |
| 80 | brew_warpath_tonic | 37.029 | 5,58 | 0,90× |
| 90 | brew_apex_tonic | 67.129 | 8,29 | 1,00× |
| 98 | brew_godbloom_infusion | 101.368 | 12,12 | 1,02× |

**Lesart:** Der Gesamt-Zeitaufwand ist gesund (L90→91 ~8 h Basis, mit Mastery/Tools deutlich schneller). ABER die „beste offene Aktion"-Spalte zeigt zwei Krankheiten: (a) **L1–L20 hängt an einer einzigen L1-Aktion** (antivenom, 2.160/h) fest — kein Fortschrittsgefühl; (b) **L30–L49 hängt an `mandrake_tincture`** (6.063/h) fest, weil dieses eine L30-Rezept 1,76× über Kurve liegt.

## 4. Voll-Tabelle (nach `levelRequired` sortiert)

`ratio` = Basis-XP/h ÷ target_xph. `↯` = Durchsatz-Inversion (zahlt weniger XP/h als eine schon offene, niedrigere Aktion).

| id | L | xp | dur (ms) | XP/h | target_xph | ratio | Flag |
|---|---|---|---|---|---|---|---|
| brew_minor_healing¹ | 1 | 2 | 3500 | 2.057 | 820 | 2,51× | Legacy-Dup |
| brew_antivenom¹ | 1 | 3 | 5000 | 2.160 | 820 | 2,63× | Legacy-Dup, L1-Dominant |
| brew_greater_healing¹ | 1 | 3 | 6000 | 1.800 | 820 | 2,20× | Legacy-Dup |
| brew_minor_heal | 1 | 1 | 3500 | 1.029 | 820 | 1,25× | — |
| brew_forager_tonic_i | 3 | 1 | 4000 | 900 | 909 | 0,99× | ↯ „1-XP" |
| brew_oxblood_tonic | 5 | 1 | 4500 | 800 | 1.002 | **0,80×** | ↯ „1-XP"-Falle |
| brew_antidote | 8 | 2 | 5000 | 1.440 | 1.167 | 1,23× | — |
| brew_rot_ward_tonic | 8 | 2 | 5000 | 1.440 | 1.167 | 1,23× | — |
| brew_lesser_heal | 12 | 2 | 5500 | 1.309 | 1.420 | 0,92× | ↯ |
| brew_stoneskin_tonic | 16 | 3 | 6000 | 1.800 | 1.729 | 1,04× | — |
| brew_heal | 21 | 4 | 6500 | 2.215 | 2.216 | 1,00× | — |
| brew_salve_of_mending | 25 | 6 | 6000 | 3.600 | 2.697 | 1,33× | Spike |
| brew_keeneye_tonic | 26 | 6 | 7000 | 3.086 | 2.832 | 1,09× | ↯ (ggü. salve) |
| brew_mandrake_tincture | 30 | 16 | 9500 | 6.063 | 3.451 | **1,76×** | Spike (schlimmster) |
| brew_forager_tonic_ii | 32 | 8 | 7500 | 3.840 | 3.809 | 1,01× | ↯ (ggü. mandrake) |
| brew_nightshade_extract | 35 | 11 | 8500 | 4.659 | 4.417 | 1,05× | ↯ |
| brew_bloodrage_tonic | 38 | 11 | 8000 | 4.950 | 5.123 | 0,97× | ↯ |
| brew_emberleaf_tonic | 40 | 13 | 8500 | 5.506 | 5.654 | 0,97× | ↯ |
| brew_greater_heal | 41 | 15 | 9000 | 6.000 | 5.941 | 1,01× | ↯ |
| brew_greater_antidote | 46 | 20 | 9500 | 7.579 | 7.607 | 1,00× | — |
| brew_witchlight_tonic | 50 | 26 | 10000 | 9.360 | 9.271 | 1,01× | — |
| brew_arcane_surge | 52 | 28 | 10000 | 10.080 | 10.235 | 0,98× | — |
| brew_bloodmend_draught | 55 | 34 | 8000 | 15.300 | 11.873 | 1,29× | Spike |
| brew_harvest_tonic | 58 | 42 | 11000 | 13.745 | 13.773 | 1,00× | ↯ (ggü. bloodmend) |
| brew_potent_heal | 61 | 53 | 12000 | 15.900 | 15.977 | 1,00× | — |
| brew_gravensap_salve | 62 | 55 | 12000 | 16.500 | 16.788 | 0,98× | — |
| brew_emberroot_tonic | 65 | 50 | 12000 | 15.000 | 19.475 | **0,77×** | ↯ totes Tier |
| brew_ironbark_tonic | 66 | 71 | 12500 | 20.448 | 20.464 | 1,00× | — |
| brew_gloomspore_tincture | 70 | 90 | 13500 | 24.000 | 24.944 | 0,96× | ↯ (ggü. corpse_lily) |
| brew_corpse_lily_salve | 70 | 130 | 15000 | 31.200 | 24.944 | 1,25× | Spike |
| brew_warding_elixir | 72 | 99 | 13000 | 27.415 | 27.540 | 1,00× | ↯ |
| brew_warpath_tonic | 78 | 144 | 14000 | 37.029 | 37.065 | 1,00× | — |
| brew_elixir_renewal | 81 | 179 | 15000 | 42.960 | 43.000 | 1,00× | — |
| brew_revenant_elixir | 85 | 205 | 11000 | 67.091 | 52.417 | 1,28× | Spike |
| brew_godharvest_tonic | 86 | 245 | 16000 | 55.125 | 55.077 | 1,00× | ↯ (ggü. revenant) |
| brew_apex_tonic | 90 | 317 | 17000 | 67.129 | 67.139 | 1,00× | — |
| brew_grave_lily_elixir | 94 | 409 | 18000 | 81.800 | 81.843 | 1,00× | — |
| brew_panacea_elixir | 94 | 409 | 18000 | 81.800 | 81.843 | 1,00× | — |
| brew_godbloom_infusion | 95 | 535 | 19000 | 101.368 | 85.997 | 1,18× | Spike |
| brew_godsbreath_elixir | 99 | 582 | 20000 | 104.760 | 99.767* | 1,05× | Cap-OK |

¹ Kein `levelRequired` im Content → default **L1**.

## 5. Diabolische Fälle & Monotonie-Brüche (Priorität)

**A. Die L1-Default-Dominanz (Kern der Chef-Beschwerde).** `brew_antivenom` (L1, 2.160/h) ist von L1 bis L20 die **beste Aktion des ganzen Skills**. Der bewusst gebaute Frühaufstieg (`brew_minor_heal` 1.029 → `forager_i` 900 → `oxblood` 800 → …) liegt komplett **darunter** und ist teils sogar rückläufig. Ergebnis: 20 Level lang kein spürbarer Fortschritt + die niedrigeren Neu-Unlocks fühlen sich wie eine Bestrafung an. Ursache: die drei ältesten Rezepte haben nie ein `levelRequired` bekommen und wurden nie auf die Zielformel normiert.

**B. „1 XP für Stufe 5" (`brew_oxblood_tonic`).** xp 1 / 4.500 ms = **800 XP/h = 0,80× Ziel** — langsamer als die L1- **und** L3-Aktion. Exakt das vom Chef zitierte Muster („winzige xp relativ zum levelRequired"). Gleiches, milder: `forager_tonic_i` L3 (xp 1).

**C. Totes Mitte-Tier (`brew_emberroot_tonic` L65).** Mit 0,77× Ziel und 15.000/h **unter** dem schon bei L62 offenen `gravensap_salve` (16.500/h). Ein Spieler auf L65 hat keinen Grund, es je zu brauen → totes Rezept.

**D. Spikes erzeugen Folge-Inversionen.** Jeder über-getunte Wert lässt den *nächsten* Unlock schlechter aussehen:
- `mandrake_tincture` L30 (1,76×) → `forager_tonic_ii` L32, `nightshade` L35 usw. zahlen weniger.
- `bloodmend_draught` L55 (1,29×) → `harvest_tonic` L58 sinkt.
- `revenant_elixir` L85 (1,28×) → `godharvest_tonic` L86 sinkt (67k → 55k).
- `corpse_lily_salve` L70 (1,25×) → `warding_elixir` L72 „fühlt" sich langsamer an.
- `godbloom_infusion` L95 (1,18×) → nur Cap-nah, klein.

**Monotonie-Zählung:** aktuell **14** Durchsatz-Inversionen. Mit den Empfehlungen aus §7 → **4**, und diese 4 liegen alle im L3–L16-Band (<2 h Gesamtzeit) und betreffen **nicht** die jeweils *beste offene* Rate — die Progressions-Front wird monoton.

## 6. Legacy-Trio: NICHT löschen, sondern re-tiern

Die drei Default-L1-Aktionen erzeugen die Items `minor_healing_potion`, `greater_healing_potion`, `antivenom_tonic`. Diese Items sind **weiter in Benutzung** — als Rezept-Inputs (`packages/content/src/index.ts:11968+`) und als Quest-/Achievement-Belohnungen (`:12692+`). **Die Items müssen bleiben.** Zu ändern ist nur die **Brau-Aktion** (Level + xp), damit sie sauber in die Leiter einsortiert und nicht mehr L1-dominant ist. Sekundär: die Aktionen duplizieren funktional die neueren Vertragsrezepte (`brew_minor_heal`, `brew_heal`, `brew_greater_heal`, `brew_antidote`) — falls der Chef das Duplikat ganz auflösen will, wäre der saubere Weg, die Aktion zu streichen und die Ausgabe-Items stattdessen als Loot der neuen Vertragsrezepte zu führen. Das ist eine Design-Entscheidung für den Chef; die untenstehenden Re-Tier-Zahlen sind die **minimal-invasive** Variante (Item-Ökonomie unangetastet).

## 7. Empfehlungen — Apply-Liste (geordnet)

`recommended` = Ziel-XP nach Formel bzw. Monotonie-Floor. „—" = keine Änderung nötig.

| # | id | level | current xp | target xp | **recommended** | Begründung |
|---|---|---|---|---|---|---|
| 1 | brew_antivenom | **1→8** | 3 | 2 | **xp 2 + levelRequired: 8** | Legacy-Dominanz raus; auf Antidot-Tier (wie `brew_antidote`) normiert → 1.440/h = 1,23×. |
| 2 | brew_greater_healing | **1→16** | 3 | 3 | **xp 3 + levelRequired: 16** | Auf `stoneskin`-Tier normiert → 1.800/h = 1,04×. Nur Level setzen. |
| 3 | brew_minor_healing | **1** | 2 | 1 | **xp 1** (L1 bleibt) | Auf `brew_minor_heal` (L1) angeglichen → 1.029/h = 1,25×. Nicht mehr 2,5× Ziel. |
| 4 | brew_forager_tonic_i | 3 | 1 | 2 | **xp 2** | „1-XP" raus, über L1 gehoben → 1.800/h. |
| 5 | brew_oxblood_tonic | 5 | 1 | 2 | **xp 2** | „1-XP"-Falle raus → 1.600/h (statt 0,80× Ziel). |
| 6 | brew_lesser_heal | 12 | 2 | 3 | **xp 3** | war 0,92× & unter L8; → 1.964/h. |
| 7 | brew_salve_of_mending | 25 | 6 | 5 | **xp 5** | Spike 1,33× → 1,11×; killt Inversion ggü. `keeneye` L26. |
| 8 | brew_mandrake_tincture | 30 | 16 | 9 | **xp 9** | **Schlimmster Spike** 1,76× → 1,00×; beendet die L30–L49-Plättung. |
| 9 | brew_nightshade_extract | 35 | 11 | 10 | **xp 10** | 1,10× → 1,00× (Feinschliff, optional). |
| 10 | brew_bloodmend_draught | 55 | 34 | 26 | **xp 26** | Spike 1,29× → 0,99×; killt `harvest_tonic`-Inversion. |
| 11 | brew_emberroot_tonic | 65 | 50 | 65 | **xp 65** | **Totes Tier** 0,77× → 1,00×. Wichtigster Einzel-Bump. |
| 12 | brew_gloomspore_tincture | 70 | 90 | 94 | **xp 94** | 0,96× → 1,00×; harmonisiert das L70-Paar mit corpse_lily. |
| 13 | brew_corpse_lily_salve | 70 | 130 | 104 | **xp 104** | Spike 1,25× → 1,00×. |
| 14 | brew_revenant_elixir | 85 | 205 | 160 | **xp 160** | Spike 1,28× → 1,00×; killt `godharvest`-Inversion. |
| 15 | brew_godbloom_infusion | 95 | 535 | 454 | **xp 454** | Spike 1,18× → 1,00×. |

**Bewusst NICHT geändert:** alle Aktionen bei 0,95–1,10× (die Mehrheit L21–L99) sowie `brew_godsbreath_elixir` L99 (xp 582 = 1,05× Cap-Proxy — die Formel liefert am Cap 0, der Override ist korrekt und bleibt). `brew_grave_lily_elixir`/`brew_panacea_elixir` (beide L94, xp 409) sind gewollt gleichwertige Parallel-Rezepte, kein Bug.

### Optionaler „mathematisch perfekter" Frühband-Anhang
Fixes #4–#6 heben das Frühband via xp-Bump (Dauer bleibt, Feel bleibt „snappy", Frühspiel wird bewusst leicht großzügig — genau was der Chef will). Es bleiben 4 kosmetische <500-XP/h-Zittern im L3–L16-Band. Wer die Front-**und** jede Einzelaktion streng monoton will, setzt stattdessen die Dauern on-curve (z.B. `oxblood` L5 dur 4500→7000 bei xp 2 = exakt 1.029/h). Nicht empfohlen — verlängert kurze Frühaktionen ohne echten Gewinn.

## 8. Ergebnis nach Fixes

- Durchsatz-Inversionen: **14 → 4** (alle im trivialen <2-h-Frühband, ohne Effekt auf die beste offene Rate).
- Frühspiel L1–L20 folgt wieder der vorgesehenen Leiter statt an einer L1-Aktion zu kleben.
- L21–L99 sitzt durchgehend auf **~1,00× Ziel**; kein totes Tier mehr, keine >1,3×-Spikes.
- Gesamt-Zeitaufwand praktisch unverändert (die Fixes verschieben XP zwischen Tiers, sie inflationieren die Kurve nicht).

_Alle Zahlen reproduzierbar aus `packages/engine/src/leveling.ts` (XP-Tabelle) + der Zielformel. Keine Content-Datei wurde verändert._
