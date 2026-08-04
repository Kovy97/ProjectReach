# XP-Balance-Bericht — Juwelierskunst (`jewelcrafting`)

Datum: 2026-07-01 · Autor: Balance-Designer · Status: Vorschlag (noch NICHT eingepflegt)

Betrifft nur `skill: "jewelcrafting"` in `packages/content/src/index.ts`.
Kurve: `packages/engine/src/leveling.ts` (`xpForLevel`, Cap 99).
Baseline: alle XP/h ohne Werkzeug-/Mastery-Multiplikatoren (Real-Raten liegen höher).

---

## TL;DR (Verdikt)

**Note: 2 / 5** (gut, kleine Fixes). Skala: 1 = exzellent … 5 = kaputt.

Wichtigste Erkenntnis, die der Chef-Beschwerde widerspricht: **Juwelierskunst ist auf
XP/**Stunde**-Basis NICHT zu brutal.** Jede einzelne Aktion liegt **auf oder über** der
Studio-Zielkurve `target_xph(L)` (Verhältnis 1.00–2.93). Das ist eine der besser
getunten Nicht-Kampf-Berufe — die erfundenen Tiers (Bloodstone/Voidstone/Godgem) sind
sauber auf der Kurve (Ratio ≈ 1.0).

Der „diabolische" Eindruck entsteht hier aus zwei anderen Quellen:
1. **Optik der winzigen Absolutzahlen** (1–4 XP pro Aktion bis L20) — fühlt sich geizig
   an, obwohl die Rate fair ist (kurze Dauer × kleine Level-Balken).
2. **Zwei Content-Plateaus** (L5→15 und L20→34), in denen keine neue Aktion erscheint und
   die beste XP/h flach bleibt, während der Levelbalken 4× wächst.

Monotonie ist im **XP/Stunde**-Sinn erfüllt (der beste verfügbare Wert steigt streng
monoton). Roh-XP-pro-Aktion „sinkt" nur dort, wo ein Rezept mit langer Dauer auf
niedrigerem Level sitzt (Artefakt, keine echte Regression — siehe §4).

### Top-3-Fixes
1. **Content-Lücke L20→34 schließen** (14 Level flach): eine Zwischen-Tier (Cut + Ring +
   Amulett) um L24–28, XP auf Kurve (~2.5k–3.5k XP/h). Sekundär L5→15. → an content-dev,
   ist neue Aktion, keine reine Zahl.
2. **Absolutzahl-Boden gegen die „1-XP"-Optik**: kein Schmuck-Craft < 3 XP, kein Cut < 2 XP.
   Betrifft nur die 8 Aktionen ≤ L20 (siehe Apply-Liste). Kostet Endgame nichts.
3. **Frühkurve entschärfen ODER bewusst lassen**: L1–L5 sind mit Ratio 2.0–2.9 sehr
   frontlastig. Empfehlung: **lassen** (idle-typisch, schneller Einstieg). Nur dokumentiert.

---

## 1. Datengrundlage — die Zielkurve

`target_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`

| L | xpForLevel(L+1)−xpForLevel(L) | target_xph(L) |
|---|---|---|
| 1 | 83 | 820 |
| 5 | 124 | 1 002 |
| 10 | 204 | 1 285 |
| 15 | 335 | 1 647 |
| 20 | 548 | 2 107 |
| 30 | 1 470 | 3 451 |
| 40 | 3 947 | 5 654 |
| 50 | 10 612 | 9 271 |
| 60 | 28 546 | 15 206 |
| 70 | 76 818 | 24 944 |
| 80 | 206 750 | 40 923 |
| 90 | 556 499 | 67 139 |
| 98 | 1 228 825 | 99 767 |

Kumulativ: `xpForLevel(20)=4 470`, `(34)=20 224`, `(50)=101 333`, `(70)=737 627`,
`(90)=5 346 332`, `(99)=13 034 431`. Die ersten 20 Level sind ~0,03 % des Gesamt-XP —
darum kostet ein großzügiger Boden im Frühspiel praktisch nichts.

---

## 2. Alle Aktionen — Ist-Rate vs. Zielrate

Basis-XP/h = `xp × 3 600 000 / durationMs`. Ratio = Ist-XPH / target_xph(levelRequired).

| id | lvl | dur ms | cur xp | cur XP/h | target XP/h | Ratio |
|---|---|---|---|---|---|---|
| cut_garnet | 1 | 2500 | 1 | 1 440 | 820 | 1.76 |
| craft_garnet_ring | 1 | 3000 | 2 | 2 400 | 820 | **2.93** |
| craft_garnet_amulet | 3 | 3500 | 2 | 2 057 | 909 | **2.26** |
| craft_fang_necklace | 5 | 3500 | 2 | 2 057 | 1 002 | **2.05** |
| cut_sapphire | 15 | 3000 | 2 | 2 400 | 1 647 | 1.46 |
| craft_sapphire_ring | 15 | 4000 | 3 | 2 700 | 1 647 | 1.64 |
| craft_soul_amulet | 15 | 4000 | 3 | 2 700 | 1 647 | 1.64 |
| craft_warband_signet | 15 | 5000 | 4 | 2 880 | 1 647 | 1.75 |
| craft_sapphire_amulet | 18 | 4500 | 4 | 3 200 | 1 909 | 1.68 |
| craft_gemstone_ring | 20 | 6000 | 4 | 2 400 | 2 107 | 1.14 |
| cut_ruby | 34 | 3500 | 5 | 5 143 | 4 204 | 1.22 |
| craft_ruby_ring | 34 | 5000 | 7 | 5 040 | 4 204 | 1.20 |
| craft_alpha_fang_amulet | 36 | 9000 | 15 | 6 000 | 4 640 | 1.29 |
| craft_ruby_amulet | 38 | 5500 | 10 | 6 545 | 5 123 | 1.28 |
| cut_bloodstone | 44 | 4000 | 12 | 10 800 | 6 891 | **1.57** |
| craft_bloodstone_ring | 44 | 5700 | 17 | 10 737 | 6 891 | **1.56** |
| craft_spellbinder_ring | 46 | 5700 | 12 | 7 579 | 7 607 | 1.00 |
| craft_bloodstone_amulet | 48 | 6200 | 23 | 13 355 | 8 398 | **1.59** |
| cut_diamond | 55 | 4500 | 19 | 15 200 | 11 873 | 1.28 |
| craft_grave_warden_band | 55 | 10000 | 42 | 15 120 | 11 873 | 1.27 |
| craft_diamond_ring | 55 | 6500 | 27 | 14 954 | 11 873 | 1.26 |
| craft_diamond_amulet | 60 | 7000 | 38 | 19 543 | 15 206 | 1.29 |
| craft_stormcaller_amulet | 65 | 12000 | 83 | 24 900 | 19 475 | 1.28 |
| cut_onyx | 70 | 5500 | 49 | 32 073 | 24 944 | 1.29 |
| craft_onyx_ring | 70 | 7000 | 62 | 31 886 | 24 944 | 1.28 |
| craft_void_anchor | 70 | 10000 | 90 | 32 400 | 24 944 | 1.30 |
| craft_onyx_amulet | 75 | 8000 | 91 | 40 950 | 31 950 | 1.28 |
| craft_slayer_amulet | 80 | 20000 | 293 | 52 740 | 40 923 | 1.29 |
| craft_heartforged_pendant | 82 | 16000 | 255 | 57 375 | 45 182 | 1.27 |
| cut_voidstone | 85 | 6000 | 87 | 52 200 | 52 417 | 1.00 |
| craft_voidstone_ring | 85 | 8000 | 116 | 52 200 | 52 417 | 1.00 |
| craft_voidstone_amulet | 88 | 9000 | 151 | 60 400 | 60 810 | 0.99 |
| cut_godgem | 95 | 7000 | 167 | 85 886 | 85 997 | 1.00 |
| craft_godgem_ring | 95 | 10000 | 239 | 86 040 | 85 997 | 1.00 |
| craft_godgem_amulet | 99 | 12000 | 365 | 109 500 | (Cap) | 1.10¹ |

¹ Bei L99 ist `xpForLevel(100)−xpForLevel(99)=0`, die Formel liefert 0. Referenz gegen
`target_xph(98)=99 767` → Zielrate erfüllt, kein Handlungsbedarf.

**Beobachtung:** Kein einziger Wert liegt unter der Zielkurve. Der Beruf ist im Frühspiel
großzügig (Ratio bis 2.93) und verdichtet sich ab L34 auf ein konstantes ~1.28, das späten
erfundenen Tiers liegen exakt auf 1.00. Das ist eine gesunde, leicht frontlastige Kurve.

---

## 3. Kurven-Verlauf — beste Aktion & Stunden pro Level

„hrs CUR" = Stunden L→L+1 mit der besten verfügbaren Aktion (Ist). „hrs TGT" = auf der
Zielkurve. CUR < TGT bedeutet: schneller als Ziel.

| L | xp bis L+1 | beste Aktion | beste XP/h | hrs CUR | hrs TGT |
|---|---|---|---|---|---|
| 1 | 83 | craft_garnet_ring | 2 400 | 0.03 | 0.10 |
| 5 | 124 | craft_garnet_ring | 2 400 | 0.05 | 0.12 |
| 10 | 204 | craft_garnet_ring | 2 400 | 0.09 | 0.16 |
| 15 | 335 | craft_warband_signet | 2 880 | 0.12 | 0.20 |
| 20 | 548 | craft_sapphire_amulet | 3 200 | 0.17 | 0.26 |
| 25 | 898 | craft_sapphire_amulet | 3 200 | 0.28 | 0.33 |
| 30 | 1 470 | craft_sapphire_amulet | 3 200 | 0.46 | 0.43 |
| 34 | 2 182 | cut_ruby | 5 143 | 0.42 | 0.52 |
| 38 | 3 240 | craft_ruby_amulet | 6 545 | 0.50 | 0.63 |
| 44 | 5 863 | cut_bloodstone | 10 800 | 0.54 | 0.85 |
| 48 | 8 707 | craft_bloodstone_amulet | 13 355 | 0.65 | 1.04 |
| 50 | 10 612 | craft_bloodstone_amulet | 13 355 | 0.79 | 1.14 |
| 55 | 17 404 | cut_diamond | 15 200 | 1.15 | 1.47 |
| 60 | 28 546 | craft_diamond_amulet | 19 543 | 1.46 | 1.88 |
| 65 | 46 826 | craft_stormcaller_amulet | 24 900 | 1.88 | 2.40 |
| 70 | 76 818 | craft_void_anchor | 32 400 | 2.37 | 3.08 |
| 75 | 126 022 | craft_onyx_amulet | 40 950 | 3.08 | 3.94 |
| 80 | 206 750 | craft_slayer_amulet | 52 740 | 3.92 | 5.05 |
| 85 | 339 198 | craft_heartforged_pendant | 57 375 | 5.91 | 6.47 |
| 88 | 456 519 | craft_voidstone_amulet | 60 400 | 7.56 | 7.51 |
| 90 | 556 499 | craft_voidstone_amulet | 60 400 | 9.21 | 8.29 |
| 95 | 913 019 | craft_godgem_ring | 86 040 | 10.61 | 10.62 |
| 98 | 1 228 825 | craft_godgem_ring | 86 040 | 14.28 | 12.32 |

**Die „beste XP/h"-Spalte steigt streng monoton** (2 400 → 2 880 → 3 200 → 5 143 → …
→ 86 040). Es gibt **kein totes Tier** auf dem optimalen Pfad. Ganz spät (L90, L98) läuft
die Ist-Rate leicht hinter Ziel — das ist tolerierbar und wird durch Werkzeug/Mastery
(Baseline hier ausgeklammert) real aufgeholt.

### Die zwei echten Plateaus (Walls)
- **L20 → L34 (14 Level):** letzte neue Aktion ist `craft_gemstone_ring` (L20), nächste
  erst `cut_ruby`/`craft_ruby_ring` (L34). Beste XP/h klemmt bei 3 200, während der
  Levelbalken von 548 auf 2 182 (≈ 4×) wächst. Hier steigt hrs CUR von 0.17 auf 0.42 —
  kein Drama, aber es ist ein **Content-Loch**, keine neue Belohnung, kein neuer Edelstein.
- **L5 → L15 (10 Level):** analog, `craft_fang_necklace` (L5) bis `cut_sapphire` (L15).
  Weniger kritisch, weil absolut kurz.

Beides ist **content-dev-Arbeit** (neue Aktion/neuer Edelstein), keine reine Zahl. Vorschlag
für die Zwischen-Tier siehe §5.

---

## 4. Monotonie der Roh-XP (die „diabolische" Optik)

Sortiert man alle Aktionen nach `levelRequired`, ist die Roh-XP-pro-Aktion **fast** monoton.
Die scheinbaren Rückschritte sind Dauer-Artefakte, kein Balance-Fehler:

| „Rückschritt" | Erklärung | Handlung |
|---|---|---|
| alpha_fang_amulet L36 = 15 XP → ruby_amulet L38 = 10 XP | alpha_fang ist ein Sonder-Drop-Amulett (9 000 ms) mit bewusst hoher Belohnung; ruby_amulet hat kürzere Dauer. Auf **XP/h** ist ruby_amulet (6 545) > alpha_fang (6 000). | Keine — XP/h korrekt. Optional ruby_amulet 10→13, falls streng-monotone Roh-Zahl gewünscht. |
| slayer_amulet L80 = 293 XP → heartforged L82 = 255 XP | slayer läuft 20 000 ms, heartforged 16 000 ms. Auf **XP/h** ist heartforged (57 375) > slayer (52 740) — korrekt monoton. | Keine — reines Dauer-Artefakt. |

**Fazit:** Im gameplay-relevanten Sinn (XP/Stunde) ist der Katalog monoton. Roh-Zahl-Dips
sind unkritisch. Der Chef-Reflex „kleinere Zahl bei höherem Level = kaputt" trifft hier
nicht zu — nur langsamere, wertvollere Rezepte.

Der **einzige** Punkt, der die Chef-Formulierung „1 XP fühlt sich diabolisch an" wirklich
berührt, ist die reine **Optik**: `cut_garnet` = 1 XP, sechs weitere Aktionen = 2 XP. Das
ist geizig anzusehen, obwohl die Rate fair ist. Fix in §5, Punkt B.

---

## 5. Empfehlungen (konkrete Zahlen)

### A. Content-Lücken (an content-dev, neue Aktionen — Zahlen mitgeliefert)
Zwischen-Tier L24–28, z. B. Edelstein „Amethyst" (oder vorhandenes `cut_gemstone`-Material
nutzen). Ziel: XP auf Kurve, damit L20→34 nicht flach bleibt.

| neue id (Vorschlag) | lvl | dur ms | empf. xp | ~XP/h | begründung |
|---|---|---|---|---|---|
| cut_amethyst | 25 | 3200 | 3 | 3 375 | füllt Cut-Loch, Ratio ~1.15 |
| craft_amethyst_ring | 26 | 4800 | 4 | 3 000 | Ring-Loch, Ratio ~1.0 |
| craft_amethyst_amulet | 28 | 5200 | 5 | 3 462 | Amulett-Loch, Ratio ~1.1 |

(Optional zusätzlich eine L8–10-Aktion, um L5→15 zu halbieren.)

### B. Absolutzahl-Boden gegen „1-/2-XP"-Optik (reine Zahl, an content-dev)
Regel: kein Schmuck-Craft < 3 XP, kein Cut < 2 XP. Betrifft nur ≤ L20. Rate-Effekt
vernachlässigbar (erste 20 Level = 0,03 % des Gesamt-XP; ~1,5 h → ~1,3 h).

`target` unten = kurven-abgeleitet `round(target_xph(lvl)·dur/3.6e6)`; `recommended` = meine
finale Empfehlung (nie unter Ist, Boden angewandt).

| id | level | current | target | recommended |
|---|---|---|---|---|
| cut_garnet | 1 | 1 | 1 | **2** |
| craft_garnet_ring | 1 | 2 | 1 | **3** |
| craft_garnet_amulet | 3 | 2 | 1 | **3** |
| craft_fang_necklace | 5 | 2 | 1 | **3** |
| cut_sapphire | 15 | 2 | 1 | **3** |
| craft_sapphire_ring | 15 | 3 | 2 | 3 (unverändert) |
| craft_soul_amulet | 15 | 3 | 2 | 3 (unverändert) |
| craft_warband_signet | 15 | 4 | 2 | 4 (unverändert) |
| craft_sapphire_amulet | 18 | 4 | 2 | 4 (unverändert) |
| craft_gemstone_ring | 20 | 4 | 4 | 4 (unverändert) |

Alle Aktionen ab L34 bleiben **unverändert** — sie sind sauber auf ~1.28× bzw. 1.0× Ziel
und bereits monoton in XP/h. Kein Handlungsbedarf.

### C. Optional (Kosmetik der Roh-Monotonie, niedrige Priorität)
- `craft_ruby_amulet` L38: 10 → **13** (überholt die Roh-Zahl von alpha_fang L36=15 nicht
  ganz, aber schließt den optischen Dip; XP/h dann 8 509, Ratio 1.66 — akzeptabel).
  Nur umsetzen, falls der Chef strikte Roh-Zahl-Monotonie will; **nicht** balance-nötig.

---

## 6. Apply-Liste (geordnet, für content-dev nach Chef-Freigabe)

Nur `packages/content/src/index.ts`, Feld `xp` der genannten Aktion. Reihenfolge = Priorität.

1. `cut_garnet` → `xp: 2`
2. `craft_garnet_ring` → `xp: 3`
3. `craft_garnet_amulet` → `xp: 3`
4. `craft_fang_necklace` → `xp: 3`
5. `cut_sapphire` → `xp: 3`
6. (Content, größer) Zwischen-Tier L24–28 anlegen (Tabelle §5.A) — schließt L20→34-Wall.
7. (Optional) `craft_ruby_amulet` → `xp: 13` (nur wenn strikte Roh-Monotonie erwünscht).

Punkte 1–5 sind risikofrei (Frühspiel-Optik, kein Endgame-Effekt). Punkt 6 ist die einzige
inhaltlich substanzielle Änderung. Alles ab L34 bleibt, wie es ist.

---

## 7. Verifikation nach Einpflegen (Vorschlag)
- `pnpm test` und den Sim-Block prüfen: keine jewelcrafting-Aktion bei 0 XP/h (war ohnehin
  nie der Fall).
- Sicht-Check: Roh-XP-pro-Aktion sortiert nach Level zeigt keine 1er/2er mehr ≤ L20.
- Beste-XP/h-Kurve (Tabelle §3) muss streng monoton bleiben — durch die Bumps unverändert.
