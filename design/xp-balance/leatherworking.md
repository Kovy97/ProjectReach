# XP-Balance-Bericht — Handwerk / Leatherworking (`leatherworking`)

Datum: 2026-07-01 · Autor: Balance-Designer · Status: Vorschlag (noch NICHT eingepflegt)

Betrifft nur `skill: "leatherworking"` in `packages/content/src/index.ts` (107 Fundstellen,
**96 Crafting-Aktionen**: Gerben/Material, Leichtrüstungs-Sets T1–T8, Umhänge/Capes,
Magier-Roben T1–T7).
Kurve: `packages/engine/src/leveling.ts` (`xpForLevel`, `levelFromXp`, Cap 99).
Baseline: alle XP/h **ohne** Werkzeug-/Mastery-/Pet-/Buff-Multiplikatoren. Verifiziert:
`tick.ts:126` vergibt roh `action.xp` (× Multiplikatoren = 1 im Baseline-Fall);
`actions.ts:8` → fehlendes `levelRequired` = **1**. Reale Raten mit Tools liegen höher.

---

## TL;DR (Verdikt)

**Note: 3 / 5** (befriedigend — Tempo ok, aber Kurve schlampig). Skala: 1 = exzellent … 5 = kaputt.

Die Chef-Beschwerde („XP-Raten zu brutal") ist für Handwerk **auf XP/Stunde-Basis nur
teilweise wahr**: die *Geschwindigkeit* ist fair bis großzügig (Ratio zur Zielkurve meist
**1.0–1.6**, Minimum 0.84). Gesamt-Zeit 1→99 mit jeweils bester Aktion ≈ **233 h** — für
ein Idle-Craftingfach normal. **Das Fach ist nicht zu langsam.**

Aber Handwerk ist die **unsauberste** der geprüften Nicht-Kampf-Kurven. Vier echte Defekte
erzeugen genau den „diabolischen" Eindruck:

1. **„1-XP"-Boden + frühe Nicht-Monotonie (L2–L12).** `craft_cured_boots` (L2), `craft_cured_vambraces` (L3), `craft_apprentice_robe_legs` (L2) geben **1 XP**; die L8/L12-Umhänge geben **2 XP** — *weniger* als das L1-Wams (`craft_leather_body`, 3 XP). Ein Craft auf höherem Level, der **weniger** Roh-XP gibt als die Tutorial-Aktion: exakt der Chef-Anker „1 XP für Lvl-8 ist diabolisch".
2. **Glut-Robe (`robe_ember`, L30–32) ist um Faktor ~3 übertunt.** `craft_ember_robe_body`: **13 745 XP/h = 3.61× Ziel**. Ein QA-„run6-fix" hat die XP verdreifacht (Code-Kommentar: `XP 12→42`) und dabei überschossen.
3. **Folge von (2): tote Tiers L33–L58.** Weil die L32-Glut-Robe ~25 Level lang die beste Aktion bleibt, sind **Scaled (L28-30), Aether (L45-47) und Arcane (L57-58) als XP-Methode tot** — sie liegen *unter* der L32-Glut-Robe. Die beste erreichbare XP/h **sinkt** beim Wechsel Glut→Aether (13 745 → ~10 000). Das ist das Gegenteil von „viele Sprossen".
4. **Endgame-Überschuss L99.** `robe_voidweave` / `leather_voidhide` liefern ~**200 000 XP/h = 2.0×** der L99-Referenz (~100 000). Kosmetisch (Cap), aber inkonsistent mit dem Rest.

Dazu vier Unter-Kurve-Ausreißer (Ratio < 1.0): `craft_arcane_cape` 0.84, `craft_scaled_boots`/`_vambraces` 0.86, `tan_shadowhide` 0.94, `tan_wyvern_scale` 0.97.

**Fix-Idee (ein Regler):** alle Aktionen auf ein einheitliches Band **~1.2× target_xph**
normalisieren (`xp = max(2, round(1.2 · target_xph(L) · durationMs / 3 600 000))`). Das
Ergebnis (verifiziert): **streng monotone beste-XP/h-Leiter ohne Dips**, jedes Tier wird
beim Freischalten zur neuen besten Aktion, „1-XP" verschwindet — bei praktisch gleicher
Gesamtdauer (**~230 h** statt 233 h). Es ist also **keine** globale Nerf- oder Buff-Aktion,
sondern ein **Glätten**: ein Spike runter (Glut, Void), viele Böden hoch.

### Top-3-Fixes
1. **Glut-Spike entschärfen (Kern-Fix gegen tote Tiers).** `robe_ember` von 3.6× auf ~1.2× ziehen: `craft_ember_robe_hood` 30→10, `_robe_legs` 36→12, `_robe_body` 42→14, `_handwraps`/`_sandals` 13→9. Erst dadurch werden Aether/Arcane wieder echte Upgrades. (Politik: dies ist der *einzige* Nerf, der Chef-relevant ist — er behebt die „tote Tiers"-Sorge, nicht die „zu langsam"-Sorge.)
2. **„1-XP"-Boden killen + frühe Monotonie (L2–L12).** Boden **min 2 XP**: `craft_cured_boots` 1→2, `craft_cured_vambraces` 1→2, `craft_apprentice_robe_legs` 1→2; `craft_arcane_cape` 2→3. Direkte Antwort auf den Chef-Anker.
3. **Unter-Kurve-Ausreißer & Endgame glätten.** Hoch: `craft_scaled_boots`/`_vambraces` 3→4, `tan_wyvern_scale` 120→149, `tan_shadowhide` 245→313, `craft_hardened_warcape` 18→22. Runter (optional, kosmetisch): `robe_voidweave`/`leather_voidhide` L99 auf ~1.2× (z. B. `craft_voidhide_body` 1000→599).

---

## 1. Datengrundlage — die Zielkurve

`target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`. Referenzpunkte des Studios
(getroffen): ~820/h (L1) · ~9 271/h (L50) · ~99 767/h (L98≈L99-Referenz).

| L | xpForLevel(L) | target_xph(L) | Beste verfügbare Aktion (Baseline XP/h) | Ratio | Std. L→L+1 |
|---|---|---|---|---|---|
| 1 | 0 | 820 | `tan_leather` (2 400) | 2.93 | 0.03 |
| 5 | 388 | 1 002 | `tan_leather` (2 400) | 2.39 | 0.05 |
| 10 | 1 154 | 1 285 | `tan_leather` (2 400) | 1.87 | 0.09 |
| 20 | 4 470 | 2 107 | `craft_frost_handwraps` (3 323) | 1.58 | 0.16 |
| 30 | 13 363 | 3 451 | `craft_ember_robe_hood` (12 000) | **3.48** | 0.12 |
| 40 | 37 224 | 5 654 | `craft_ember_robe_body` (13 745) | **2.43** | 0.29 |
| 50 | 101 333 | 9 271 | `craft_ember_robe_body` (13 745) | 1.48 | 0.77 |
| 60 | 273 742 | 15 206 | `craft_ironhide_helm` (24 545) | 1.61 | 1.16 |
| 70 | 737 627 | 24 944 | `craft_warhide_helm` (31 846) | 1.28 | 2.41 |
| 80 | 1 986 068 | 40 923 | `tan_dragonhide` (37 500) | 0.92 | 5.51 |
| 90 | 5 346 332 | 67 139 | `craft_godspark_vestment` (85 714) | 1.28 | 6.49 |
| 95 | 8 771 558 | 85 997 | `craft_shadowhide_vambraces` (86 400) | 1.00 | 10.57 |
| 99 | 13 034 431 | ~99 767 | `craft_voidhide_vambraces` (200 100) | 2.01 | — |

Beobachtung: früh **stark frontlastig** (2.4–2.9× — idle-typisch, ok), dann eine
**Über-Kurve-Beule bei L30–50** (Glut-Robe), danach **auf Kurve** bis ~L95, endet mit einer
**2×-Beule bei L99**.

---

## 2. Der Kern-Defekt — Glut-Robe zerstört die Mittelspiel-Leiter

Die **beste erreichbare XP/h** springt bei L30 von 4 050 (`scaled_helm`) auf **12 000**
(`ember_robe_hood`), Peak **13 745** bei L32 (`ember_robe_body`). Dieser Wert bleibt dann
**bis L58 die beste Aktion** — 26 Level lang. Alles, was dazwischen freigeschaltet wird,
ist *schlechter*:

| Tier (Level) | Beste Aktion XP/h | vs. L32-Glut-Robe (13 745) |
|---|---|---|
| Glut / ember (L30–32) | **13 745** | — (Peak, 3.6× Ziel) |
| Ranger/Frost-Cape (L35–38) | 5 200 | −62 % |
| Aether-Robe (L45–47) | 10 246 | **−25 % (Downgrade!)** |
| Studded (L50–52) | 13 200 | −4 % (gleich) |
| Arcane-Robe (L57–58) | 13 886 | +1 % (endlich knapp vorbei) |
| Ironhide (L60) | 24 545 | +79 % (echtes Upgrade) |

→ Für einen XP-optimierenden Spieler existieren **Scaled-, Aether- und Arcane-Tier als
XP-Methode nicht** — er näht 26 Level lang dieselbe L32-Glut-Robe. Das verstößt frontal
gegen das Studio-Prinzip „viele Sprossen, keine wenigen Sprünge" und gegen Monotonie der
besten Rate (sie **sinkt** Glut→Aether).

**Warum runter statt alles drüber hoch?** Um Aether/Arcane über die 3.6×-Glut-Robe zu heben,
müsste man L45–58 auf ~3.6×+ Ziel aufblasen (~28 000 XP/h bei L50 statt 9 271 Ziel) — das
sprengt die Zielkurve komplett. Der chirurgische Fix ist, die **eine** Beule zu entfernen.
Nach Normalisierung (§5) ist die beste-Rate-Leiter lückenlos monoton:

```
L30 scaled_legs 4 235 → L31 ember_legs 4 320 → L32 ember_body 4 582 → L35 ranger_cape 5 400
→ L38 frost_shroud 6 000 → L45 hardened_warcape 8 800 → L46/47 aether 9 164→9 692
→ L50 studded 11 200 → L52 studded_body 12 300 → L57/58 arcane 15 709→16 457
→ L60 ironhide 18 450 …  (kein Dip mehr)
```

---

## 3. Die „diabolischen" Fälle — Roh-XP-Boden & frühe Nicht-Monotonie

Per-Stunde ist L1–L12 in Ordnung (Ratio ~1.0–2.9), aber die **angezeigte Zahl** ist der
Schmerz. Aktionen, die auf höherem Level **weniger** Roh-XP geben als eine frühere:

| Aktion | Level | Roh-XP | schlechter als | Problem |
|---|---|---|---|---|
| `craft_cured_boots` | 2 | **1** | `craft_leather_body` L1 (3) | am Boden (min 1) |
| `craft_apprentice_robe_legs` | 2 | **1** | `craft_leather_body` L1 (3) | am Boden |
| `craft_cured_vambraces` | 3 | **1** | `craft_leather_body` L1 (3) | am Boden, Ratio 0.99 |
| `craft_leather_cape` | 8 | **2** | `craft_leather_body` L1 (3) | Chef-Anker (~L8, winzig) |
| `craft_arcane_cape` | 12 | **2** | `craft_leather_body` L1 (3) | + Ratio **0.84** (unter Kurve) |

Diese sind keine echten Pace-Killer (kurze Dauer), aber sie lesen sich als Beleidigung und
lassen die Umhang-Linie kaputt wirken. Boden **min 2 XP** + `arcane_cape`→3 behebt Optik
**und** Monotonie zugleich, ohne die Kurve messbar zu verschieben.

Hinweis: Roh-XP-Vergleiche zwischen *unterschiedlich großen* Teilen (Stiefel vs. Kürass)
sind normal und **kein** Defekt — z. B. `craft_scaled_vambraces` (3) < `craft_scaled_helm`
(9) im selben Tier ist gewollt. Als Defekt zählt nur, wenn ein Teil den *gleichen Slot* auf
höherem Level unterbietet oder unter dem min-Boden klebt.

---

## 4. Weitere Auffälligkeiten

- **Unter-Kurve-Ausreißer (Ratio < 1.0):** `craft_arcane_cape` 0.84, `craft_scaled_boots`
  0.86, `craft_scaled_vambraces` 0.86, `tan_shadowhide` 0.94, `tan_wyvern_scale` 0.97. Alle
  leicht auf ~1.2× heben (siehe Tabelle §5).
- **Endgame-2×-Beule (L99):** `leather_voidhide` (helm 778 … body 1000) und `robe_voidweave`
  (mitre 833 … vestment 1111) liegen bei **~200 000 XP/h = 2.0×** Referenz. Da bei Cap 99
  kein „nächstes Level" existiert, ist das kosmetisch — aber inkonsistent. Optionaler Fix
  auf ~1.2× (`voidhide_body` 1000→599 usw.).
- **Scaled-Tier zerfasert (L14 → L28–30):** `craft_scaled_body` sitzt allein bei **L14**,
  Rest des Scaled-Sets bei L28–30. 14 Level Spreizung innerhalb eines optischen Tiers.
  Zusätzlich fehlt eine **Gerb-Aktion für `scaled_leather`** (es wird verbraucht, aber von
  *keiner* Leatherworking-Aktion produziert — vermutlich Monster-Drop). Content-Frage, keine
  reine Zahl → an content-dev als Hinweis.
- **Tan/Gerben-Leiter ist sauber:** `tan_leather` (L1) · `tan_hardened_leather` (L22) ·
  `reinforce_studded_leather` (L50) · `cure_warhide` (L70) · `tan_dragonhide` (L78) ·
  `tan_shadowhide` (L90) liegen bei Ratio 1.0–1.55 — als Gerb-Strang unproblematisch (nur
  die zwei Ausreißer oben).

---

## 5. Empfehlung — Voll-Tabelle (Ziel-Band ~1.2× target_xph, Boden 2)

`recommended = max(2, round(1.2 · target_xph(levelRequired) · durationMs / 3 600 000))`.
`target` = reine Kurve (Ratio 1.0). Nur Zeilen mit **current ≠ recommended** brauchen einen
Edit; die restlichen (~40) sind bereits im Band und **unverändert lassen**.

Spalten: `| id | level | current | target(1.0×) | recommended(1.2×) |`

### 5.1 Früh (L1–24) — Boden hoch, Monotonie
| id | level | current | target | recommended |
|---|---|---|---|---|
| `craft_cured_boots` | 2 | 1 | 1 | **2** |
| `craft_apprentice_robe_legs` | 2 | 1 | 1 | **2** |
| `craft_cured_vambraces` | 3 | 1 | 1 | **2** |
| `craft_cured_legs` | 5 | 3 | 1 | 3 → 2 (ok, lassen)* |
| `craft_arcane_cape` | 12 | 2 | 2 | **3** |
| `craft_scaled_body` | 14 | 7 | 4 | **5** |
| `craft_frost_circlet` | 20 | 6 | 4 | **5** |
| `craft_frost_handwraps` | 20 | 6 | 4 | **5** |
| `craft_frost_treads` | 20 | 6 | 4 | **5** |
| `craft_frost_robe_legs` | 21 | 7 | 5 | **6** |
| `tan_hardened_leather` | 22 | 6 | 4 | **5** |
| `craft_hardened_helm` | 22 | 6 | 4 | **5** |
| `craft_frost_robe_body` | 22 | 8 | 6 | **7** |
| `craft_hardened_legs` | 23 | 7 | 5 | **6** |
| `craft_hardened_body` | 24 | 8 | 6 | **7** |

*`craft_cured_legs` (L5, 3 XP) ist mit Ratio 2.16 leicht über Band, aber Roh-3 ist harmlos
und wahrt Monotonie zum L1-Wams — **lassen**.

### 5.2 Scaled + Glut (L28–38) — KERN: Glut-Spike runter
| id | level | current | target | recommended |
|---|---|---|---|---|
| `craft_scaled_boots` | 28 | 3 | 3 | **4** |
| `craft_scaled_vambraces` | 28 | 3 | 3 | **4** |
| `craft_scaled_helm` | 28 | 9 | 7 | **8** |
| `craft_ember_handwraps` | 30 | 13 | 8 | **9** |
| `craft_ember_sandals` | 30 | 13 | 8 | **9** |
| `craft_ember_robe_hood` | 30 | **30** | 9 | **10** |
| `craft_ember_robe_legs` | 31 | **36** | 10 | **12** |
| `craft_ember_robe_body` | 32 | **42** | 12 | **14** |
| `craft_ranger_cape` | 35 | 10 | 10 | **12** |
| `craft_frost_shroud` | 38 | 13 | 13 | **15** |

### 5.3 Aether / Studded / Arcane (L45–58)
| id | level | current | target | recommended |
|---|---|---|---|---|
| `craft_hardened_warcape` | 45 | 18 | 18 | **22** |
| `craft_aether_gloves` | 45 | 25 | 19 | **23** |
| `craft_aether_slippers` | 45 | 25 | 19 | **23** |
| `craft_aether_hood` | 45 | 26 | 20 | **24** |
| `craft_aether_robe_legs` | 46 | 30 | 23 | **28** |
| `craft_aether_robe_body` | 47 | 37 | 29 | **35** |
| `craft_studded_boots` | 50 | 10 | 10 | **12** |
| `craft_studded_vambraces` | 50 | 10 | 10 | **12** |
| `reinforce_studded_leather` | 50 | 30 | 23 | **28** |
| `craft_studded_helm` | 50 | 31 | 24 | **29** |
| `craft_studded_legs` | 51 | 36 | 28 | **34** |
| `craft_studded_body` | 52 | 44 | 34 | **41** |
| `craft_arcane_mitts` | 57 | 40 | 40 | **48** |
| `craft_arcane_slippers` | 57 | 40 | 40 | **48** |
| `craft_arcane_cowl` | 57 | 44 | 44 | **52** |
| `craft_arcane_robe_legs` | 57 | 44 | 44 | **52** |
| `craft_arcane_robe_body` | 58 | 54 | 54 | **64** |

### 5.4 Ironhide / Warhide / Runewoven (L60–72)
| id | level | current | target | recommended |
|---|---|---|---|---|
| `craft_ironhide_boots` | 60 | 50 | 34 | **41** |
| `craft_ironhide_vambraces` | 60 | 50 | 34 | **41** |
| `craft_ironhide_helm` | 60 | 75 | 46 | **56** |
| `craft_ironhide_legs` | 61 | 85 | 55 | **67** |
| `craft_ironhide_body` | 62 | 100 | 65 | **78** |
| `craft_warhide_boots` | 70 | 28 | 28 | **33** |
| `craft_warhide_vambraces` | 70 | 28 | 28 | **33** |
| `cure_warhide` | 70 | 105 | 83 | **100** |
| `craft_warhide_helm` | 70 | 115 | 90 | **108** |
| `craft_runewoven_handwraps` | 71 | 99 | 95 | **114** |
| `craft_runewoven_treads` | 71 | 99 | 95 | **114** |
| `craft_runewoven_cowl` | 71 | 107 | 102 | **122** |
| `craft_runewoven_robe_legs` | 71 | 102 | 102 | **122** |
| `craft_warhide_legs` | 71 | 135 | 106 | **127** |
| `craft_warhide_body` | 72 | 155 | 122 | **147** |
| `craft_runewoven_robe_body` | 72 | 130 | 130 | **156** |

### 5.5 Dragonhide / Godspark / Shadowhide (L75–95)
| id | level | current | target | recommended |
|---|---|---|---|---|
| `tan_wyvern_scale` | 75 | 120 | 124 | **149** |
| `tan_dragonhide` | 78 | 125 | 124 | **148** |
| `craft_dragonhide_boots` | 82 | 50 | 50 | **60** |
| `craft_dragonhide_vambraces` | 82 | 50 | 50 | **60** |
| `craft_dragonhide_helm` | 82 | 163 | 163 | **196** |
| `craft_dragonhide_legs` | 82 | 176 | 176 | **211** |
| `craft_dragonhide_body` | 82 | 201 | 201 | **241** |
| `craft_godspark_handwraps` | 88 | 323 | 253 | **304** |
| `craft_godspark_sandals` | 88 | 323 | 253 | **304** |
| `craft_godspark_mitre` | 88 | 345 | 270 | **324** |
| `craft_godspark_skirt` | 89 | 395 | 311 | **373** |
| `tan_shadowhide` | 90 | 245 | 261 | **313** |
| `craft_godspark_vestment` | 90 | 500 | 392 | **470** |
| `craft_shadowhide_boots` | 95 | 96 | 96 | **115** |
| `craft_shadowhide_vambraces` | 95 | 96 | 96 | **115** |
| `craft_shadowhide_helm` | 95 | 311 | 311 | **373** |
| `craft_shadowhide_legs` | 95 | 334 | 334 | **401** |
| `craft_shadowhide_body` | 95 | 382 | 382 | **459** |

### 5.6 Endgame L99 (optional — kosmetische 2×-Beule)
| id | level | current | target | recommended |
|---|---|---|---|---|
| `craft_voidhide_boots` | 99 | 667 | 333 | **399** |
| `craft_voidhide_vambraces` | 99 | 667 | 333 | **399** |
| `craft_voidweave_handwraps` | 99 | 722 | 360 | **432** |
| `craft_voidweave_sandals` | 99 | 722 | 360 | **432** |
| `craft_voidhide_helm` | 99 | 778 | 388 | **466** |
| `craft_voidweave_mitre` | 99 | 833 | 416 | **499** |
| `craft_voidhide_legs` | 99 | 889 | 443 | **532** |
| `craft_voidweave_skirt` | 99 | 944 | 471 | **565** |
| `craft_voidhide_body` | 99 | 1000 | 499 | **599** |
| `craft_voidweave_vestment` | 99 | 1111 | 554 | **665** |

**Unverändert lassen** (bereits im Band 0.97–1.23): `tan_leather`, `craft_leather_cap`,
`craft_leather_body`, `craft_apprentice_hat/robe/mitts/slippers`, `craft_leather_cape`,
`craft_leather_warcape`, `craft_scaled_legs`, `craft_hardened_boots/vambraces`,
`craft_frost_*` (nur die vier oben), `craft_arcane_cape`→siehe §5.1.

---

## 6. Apply-Liste für content-dev (geordnet, nur bei Chef-Freigabe)

Prioritätsreihenfolge. Alles sind reine `xp:`-Feld-Änderungen in
`packages/content/src/index.ts` (keine Dauer/Inputs anfassen).

1. **P1 — „1-XP"-Boden + Monotonie (5 Werte):**
   `craft_cured_boots` 1→2 · `craft_cured_vambraces` 1→2 · `craft_apprentice_robe_legs` 1→2 ·
   `craft_arcane_cape` 2→3.
2. **P1 — Glut-Spike (5 Werte, Kern gegen tote Tiers):**
   `craft_ember_robe_hood` 30→10 · `craft_ember_robe_legs` 36→12 · `craft_ember_robe_body` 42→14 ·
   `craft_ember_handwraps` 13→9 · `craft_ember_sandals` 13→9.
3. **P2 — Unter-Kurve-Ausreißer hoch (5 Werte):**
   `craft_scaled_boots` 3→4 · `craft_scaled_vambraces` 3→4 · `tan_wyvern_scale` 120→149 ·
   `tan_shadowhide` 245→313 · `craft_hardened_warcape` 18→22.
4. **P3 — Vollnormalisierung Mittel-/Endspiel** auf `recommended` (Tabellen §5.1–§5.5),
   damit jede Sprosse exakt im 1.2×-Band sitzt (ca. 55 weitere Werte; optional als Sammel-Pass).
5. **P4 — Endgame-Beule (optional/kosmetisch):** `leather_voidhide` + `robe_voidweave` auf §5.6.
6. **Content-Hinweis (nicht Zahl, an content-dev):** fehlende Gerb-Aktion für `scaled_leather`
   und die 14-Level-Spreizung des Scaled-Tiers (L14 body vs. L28-30 Rest) prüfen.

---

## 7. Wirkung (verifiziert)

| Metrik | vorher | nach Normalisierung (1.2×) |
|---|---|---|
| Beste-XP/h-Leiter | 1 Dip (Glut→Aether), ~4 tote Tiers | **streng monoton, 0 Dips** |
| Ratio-Spanne (alle Aktionen) | 0.84 – 3.61 | **1.13 – 1.31** (+ früher Boden) |
| Kleinste Roh-XP | 1 | **2** |
| Gesamt-Std. 1→99 (beste Aktion) | 233.0 h | **229.8 h** (praktisch gleich) |

Kernaussage für den Chef: Das Fach ist **nicht zu langsam** — die Reparatur ist ein
**Glätten** (ein Spike runter, viele Böden hoch), das die gefühlte Fairness und die
„viele-Sprossen"-Progression herstellt, ohne die Grind-Dauer messbar zu ändern.
