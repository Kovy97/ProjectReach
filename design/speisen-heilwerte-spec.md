# Speisen-Heilwerte: Von der Einheits-Floor zur Identitäts-Leiter (Task #328)

Balance-Spec, read-only erstellt am 2026-07-24. Apply durch content-dev. Alle Ist-Werte gegen
`packages/content/src/index.ts` verifiziert (Zeilenangaben = Stand heute). Stil-Vorlage:
design/heiltrank-leiter-und-ausreisser-spec.md (Task #320); Systemreferenz:
design/weapon-damage-scaling-spec.md §5.5 (Food-Werte-Pass #5, Chef-GO).

Spieler-Feedback (Chef): „Why do so many cooked fish restore the exact same amount of health?"
Chef-Hypothese (bestätigt, s. §1.3): Der %-Anteil der Hybrid-Heilung nivelliert die Flach-Leiter.

---

## Teil 0 — Mechanik-Fakten (verifiziert, bindend für die Rechnung)

1. **Heilformel** (`packages/shared/src/index.ts:1288`, angewandt in combat.ts:161 `tryAutoEat` und
   useConsumable): `heal = max(healAmount, round(maxHp · healPct))` — **Hybrid-MAX, nicht additiv.**
2. **Auto-Eat** (`combat.ts:139-177`): isst bei `hp ≤ maxHp · Schwelle`. Feste Tier-Schwellen
   **[0.45, 0.55, 0.62, 0.70]** (shared:878-883, Kosten 0/2k/8k/25k), `healMult` überall 1.0
   (Chef-Entscheid: Tiers ändern NUR die Schwelle). Spieler-Slider NUR auf Max-Tier, geklemmt
   0.05–0.95 (shared:907-909). **Cooldown 4 500 ms** (`AUTO_EAT_COOLDOWN_MS`, shared:943).
   Food isst VOR dem Auto-Trank (Trank-Schwelle default 0.4, Cooldown 8 000 ms — Food =
   Grundversorgung, Trank = großer Schluck, shared:944-956).
3. **Sustain-SOLL** (weapon-damage-scaling §5.2/§5.5, Chef-GO): Ziel-Mittel-Food ≈ **18 % maxHp
   je Bissen on-level** ⇒ Peak ~4 %/s (18 %/4.5 s), bewusst UNTER dem nackten on-level-Zufluss
   ~5 %/s („Rüstung ist Pflicht"). Flat-Anker: **flat ≈ 18 % des band-typischen maxHp**.
4. **Band-maxHp-Referenz B(L)** (leicht gerüstet; §5.5-Tabelle + Heiltrank-Spec-Kurve interpoliert):
   L1 12 · L5 15 · L10 22 · L15 27 · L20 33 · L25 38 · L30 44 · L35 50 · L40 56 · L45 61 ·
   L48 65 · L52 71 · L55 80 · L58 85 · L60 88 · L63 92 · L65 95 · L70 110 · L72 113 · L75 118 ·
   L78 123 · L85 160 · L90 185 · L92 193 · L97 208 · L98 210.
5. **Trank-Referenz (heal_std, NICHT anfassen):** Die Heiltrank-pct-Leiter läuft nach Task #320
   **0.12 → 0.25** (Krone godbloom L95). Speisen müssen pro Schluck DARUNTER bleiben
   (shared:944-948: „Tränke heilen kräftiger als Food"). Speisen-Krone in dieser Spec: **0.155**.
6. **Überheilung:** Höchste feste Auto-Eat-Schwelle 0.70 ⇒ beim Bissen fehlen ≥ 30 % maxHp.
   Kein Wert dieser Spec (flat ≤ ~20 % Band-maxHp, pct ≤ 15.5 %) überheilt auf festen Tiers.
   Slider > 0.80 ist bewusste Spieler-Entscheidung (wie beim Auto-Trank).
7. **Kein Shop-Food:** Der Shop (index.ts:12975-13002) listet KEIN Essen — `value` ist reiner
   Vendor-/Verkaufswert. Token-Shop verkauft nur Draughts (Trank-Spec §1.6) ✔.

---

## Teil 1 — Befund

### 1.1 Bestandsaufnahme: alle 46 Speisen (Cooking-Outputs + Food-Consumables, ohne Tränke)

Quelle: Fisch = Fang-Level (fishing) == Koch-Level (verifiziert :6899-7000 vs :7231-7404);
Fleisch = Monster-Drop + Koch-Level; Crops = Farming/Foraging + Koch-Level.

| id | Zeile | Linie | Cook-L | flat | pct | value | Buff/Extra |
|---|---|---|---|---|---|---|---|
| cooked_shrimp | :93 | Fisch | 1 | 2 | 0.12 | 5 | — |
| ashroot_broth | :695 | Crop | 1 | 2 | 0.12 | 16 | — |
| cooked_chicken | :3894 | Fleisch | 2 | 2 | 0.12 | 9 | — |
| grimwheat_porridge | :696 | Crop | 3 | 3 | 0.12 | 20 | — |
| cooked_beef | :3892 | Fleisch | 5 | 3 | 0.12 | 12 | — |
| cooked_murk_perch | :130 | Fisch | 5 | 3 | 0.12 | 7 | — |
| roasted_bog_fowl | :3905 | Fleisch | 7 | 4 | 0.12 | 10 | — |
| grilled_boar_loin | :3906 | Fleisch | 8 | 4 | 0.12 | 14 | — |
| cake_honey | :4682 | Crop | 9 | 4 | 0.12 | 34 | — |
| cooked_trout | :102 | Fisch | 10 | 5 | 0.12 | 12 | — |
| roasted_hare | :3907 | Fleisch | 14 | 5 | 0.12 | 22 | — |
| cooked_cod | :108 | Fisch | 15 | 5 | 0.12 | 22 | — |
| marshroot_chowder | :150 | Feast | 18 | 6 | 0.11 | 40 | con+2 (90 s) |
| cooked_ghostfin_pike | :131 | Fisch | 20 | 6 | 0.11 | 25 | — |
| wolf_steak | :3908 | Fleisch | 22 | 6 | 0.11 | 30 | — |
| cooked_shadowcarp | :139 | Fisch | 25 | 7 | 0.11 | 16 | — |
| venison_roast | :3909 | Fleisch | 28 | 7 | 0.11 | 42 | — |
| cooked_ironscale_bass | :132 | Fisch | 30 | 8 | 0.11 | 33 | — |
| cooked_salmon | :113 | Fisch | 35 | 9 | 0.11 | 40 | — |
| bloodgrain_stew | :179 | Feast | 38 | 10 | 0.11 | 100 | str+3 |
| roc_drumstick_grilled | :3910 | Fleisch | 40 | 10 | 0.11 | 60 | — |
| cooked_duskfin_carp | :133 | Fisch | 45 | 11 | 0.11 | 52 | — |
| duskfin_rangers_stew | :159 | Feast | 48 | 12 | 0.11 | 120 | dex+3 |
| bear_haunch | :3911 | Fleisch | 48 | 12 | 0.11 | 80 | — |
| gallows_preserve | :701 | Crop | 50 | 13 | 0.11 | 75 | — |
| spellwarden_bisque | :169 | Feast | 52 | 14 | 0.11 | 140 | int+3 |
| cooked_lobster | :118 | Fisch | 55 | 15 | 0.11 | 70 | — |
| soulgourd_brisket | :189 | Feast | 58 | 16 | 0.11 | 220 | str+4, con+2 |
| cooked_crypteel | :140 | Fisch | 60 | 16 | 0.11 | 130 | — |
| cooked_bloodfang_eel | :134 | Fisch | 63 | 17 | 0.11 | 95 | — |
| steelshot_bisque | :266 | Feast | 63 | 17 | 0.11 | 240 | dex+4 |
| spellflare_tisane | :275 | Feast | 65 | 18 | 0.11 | 260 | int+4, wis+2 |
| cooked_anglerfish | :123 | Fisch | 70 | 20 | 0.11 | 120 | — |
| wyvern_steak | :3912 | Fleisch | 72 | 21 | 0.11 | 130 | — |
| witherleek_bouillabaisse | :199 | Feast | 75 | 22 | 0.11 | 500 | str+5, con+2 |
| witherleek_sharpshooters_pie | :210 | Feast | 76 | 23 | 0.11 | 480 | dex+5, con+2 |
| witherleek_arcane_broth | :220 | Feast | 77 | 24 | 0.11 | 480 | int+5, wis+3 |
| cooked_wraithscale | :135 | Fisch | 78 | 24 | 0.11 | 165 | — |
| cooked_voidray | :128 | Fisch | 85 | 30 | 0.11 | 200 | — |
| voidray_banquet | :242 | Feast | 86 | 31 | 0.11 | 900 | con+5, str/dex/int+3 |
| risotto_starcap | :4726 | Crop | 90 | 34 | 0.11 | 780 | con+8 |
| ambergrain_feast | :230 | Feast | 90 | 34 | 0.11 | 1200 | con+6, str/dex/int+4 |
| cooked_abyssal_crawler | :136 | Fisch | 92 | 35 | 0.11 | 300 | — |
| abyssal_feast | :249 | Feast | 93 | 36 | 0.11 | 1300 | con+6, dex+4, lck+2 |
| cooked_soulfish | :137 | Fisch | 97 | 39 | 0.11 | 500 | — |
| soulfire_banquet | :257 | Feast | 98 | 40 | 0.12 | 2000 | con+8, str/dex/int+5, wis/lck+3 |

### 1.2 Duplikate auf Rohwert-Ebene (flat)

Innerhalb der FISCH-Linie (die beanstandete Liste) existiert genau EIN Flat-Tie:
**trout = cod = 5** (L10/L15). Linienübergreifend im selben Band: hare=cod (5), ghostfin=wolf=
chowder (6), shadowcarp=venison (7), bloodgrain=roc (10), **rangers_stew=bear_haunch (12, BEIDE
L48)**, brisket=crypteel (16), **eel=steelshot (17, BEIDE L63)**, risotto=ambergrain (34, beide L90).

### 1.3 Das eigentliche Problem: der Einheits-pct-Floor (Chef-Hypothese BESTÄTIGT)

ALLE 46 Speisen tragen healPct **0.11 oder 0.12** (Food-Werte-Pass #5: „pct-Floor"). Wegen
`max(flat, pct·maxHp)` gilt: Sobald `0.11·maxHp` den Flat übersteigt, heilen alle diese Speisen
IDENTISCH — die komplette Flach-Leiter wird überschrieben. Schlimmer: die frühen Speisen tragen
0.12, die späten 0.11 ⇒ **Inversion** (Alt-Food heilt MEHR als höheres Food).

**Effektive Heilung IST (Fisch-Linie) bei band-typischem maxHp:**

| maxHp (Spielphase) | shrimp L1 | trout L10 | salmon L35 | lobster L55 | eel L63 | angler L70 | wraith L78 | voidray L85 |
|---|---|---|---|---|---|---|---|---|
| 30 (≈L12 nackt) | 4 | 5 | 9 | 15 | 17 | 20 | 24 | 30 |
| 60 (≈L30 leicht ger.) | **7** | **7** | **9** | 15 | 17 | 20 | 24 | 30 |
| 112 (≈L45 gerüstet) | **13** | **13** | **12** | 15 | 17 | 20 | 24 | 30 |
| 165 (≈L70 gerüstet) | **20** | **20** | **18** | **18** | **18** | **20** | 24 | 30 |
| 220 (≈L85 gerüstet) | **26** | **26** | **24** | **24** | **24** | **24** | **24** | 30 |
| 300 (≈L99 BiS) | **36** | **36** | **33** | **33** | **33** | **33** | **33** | **33** |

Ablesbar: Ab maxHp ~110 überschreibt der Floor die Flats von L1–L45; bei maxHp 165 heilen
**12 der 17 Fische 18–20 HP**, der L1-Shrimp (20) schlägt den L55-Hummer (18) und zieht mit dem
L70-Anglerfisch gleich; bei maxHp 220–300 kollabiert die GESAMTE Leiter bis inkl. Wraithscale/
Voidray auf einen Einheitswert. Genau das ist „so many fish restore the exact same amount".
**Break-even IST** (maxHp, ab der pct den Flat überschreibt): shrimp 17, murk 25, trout 42,
cod 42, ghostfin 55, salmon 82, lobster 136, eel 155, angler 182, voidray 273 — d. h. für jede
Speise beginnt die Nivellierung schon ~1 Band über ihrem Unlock.

---

## Teil 2 — Design-Entscheid: pct wird Leiter, Flats bleiben Anker

**P1 — Flats bleiben die Food-Werte-Pass-#5-Anker** (~18 % Band-maxHp, §5.5, Chef-GO). Sie tragen
das on-level-Spielgefühl und den nackten Sim-Worst-Case. Nur 4 gezielte Änderungen (P3/P4).

**P2 — healPct wird von der Einheits-Floor (0.11/0.12) zur GESTAFFELTEN Leiter 0.03 → 0.155:**
jede Speise bekommt ihren eigenen, mit dem Koch-Level wachsenden Floor. Wirkung: on-level ändert
sich (fast) nichts (pct < flat/B(L) überall — Flat dominiert am eigenen Band); überlevelte Speisen
verblassen GESTAFFELT statt auf einen Einheitswert zu springen. Früh = flach-dominant mit klaren
Zahlensprüngen, spät = pct-dominant mit klar getrennten Prozenten (Chef-Direktive). Keine
Inversionen mehr: pct steigt streng mit dem Level innerhalb jeder Linie.

**P3 — Fisch-Linie vollständig entdoppelt:** trout 5→**4** (löst den einzigen Fisch-Tie
trout/cod; 4 = exakt 18 % von B(10)=22 — sauberer am Anker als die heutige 5). Damit ist die
Fisch-Leiter in Flat UND pct streng monoton: 2,3,4,5,6,7,8,9,11,15,16,17,20,24,30,35,39.

**P4 — Feast-Krone:** Ein Combo-Gericht muss das einfache Food seines Bands schlagen.
rangers_stew 12→**13** (war == bear_haunch @L48), steelshot_bisque 17→**18** (war == eel @L63),
spellflare_tisane 18→**19** (rückt mit, R/M-Stagger bleibt). Alle ≤ 0.20·B(L) ✔.

**P5 — Linien-Identität** (der „Grund, Verschiedenes zu kochen"):
- **Fisch** = die Sustain-Grundlinie (Basis-pct, beste Masse).
- **Fleisch** = „herzhaft": pct ≈ Fisch-Band **+0.5 pp** — als Floor minimal zäher, aber
  drop-limitiert und teurer.
- **Crops** = Küchen-Beilage: pct ≈ Fisch-Band **−0.5 pp**, billig/kampffrei.
- **Feasts** = Band-Krone: höchster Flat des Bands + Attribut-Buff + pct ≈ Fisch **+1 pp**.
- **Signatur-Zweitnutzen (genau 1, bestehende Mechanik):** `cooked_crypteel` erhält
  `curesPoison: true`. Der Auto-Eat-Pfad behandelt curesPoison-Food bereits identisch zum
  manuellen Verzehr (combat.ts:174-176, run4 P3) — null neue Mechanik. Ohne buff greift
  healAmount weiter (useConsumable-Regel :767). Identität: der Krypta-Aal als „Gift-Esser"
  der Mittelspiel-Fischliste; er begründet, WARUM man ihn neben dem 1 HP stärkeren Blutfang-Aal
  (L63) weiterfischt. potion_antidote (heal 2, v25) bleibt der on-demand-Weg; Krypta-Aal
  erfordert Fishing/Cooking 60.

**P6 — value konsistent zur Heilung:** Koch-Aufschlag der Fischlinie liegt bei ×1.5–×1.9 über roh.
Zwei Ausreißer werden gefixt: `cooked_shadowcarp` 16→**30** (heute ×0.89 — Kochen VERNICHTET Wert:
roh 18 → gekocht 16; neu ×1.67, sitzt sauber zwischen ghostfin 25 und bass 33) und
`cooked_crypteel` 130→**88** (×2.36-Ausreißer, 8.1 g/HP vs. Nachbarn 4.7–5.6; neu ×1.6, 5.5 g/HP —
der curesPoison-Zweitnutzen ist über die Fang-Hürde L60 bezahlt, nicht über Gold).

**Nicht angefasst:** Heiltränke/Draughts (eigene Leiter, Task #320/#244), Auto-Eat-Konstanten,
Feast-Buffs (Attribut-Modifiers 1..8-Guard, §4.3), XP/Duration aller Koch-Aktionen.

---

## Teil 3 — Apply-Tabelle (alt → neu je Item; „=" bleibt)

Sortiert nach Koch-Level; **fett** = Änderung. pct-Änderungen betreffen ALLE 46 Items.

| id | Zeile | L | flat alt→neu | pct alt→**neu** | value alt→neu | Extra |
|---|---|---|---|---|---|---|
| cooked_shrimp | :93 | 1 | 2 = | 0.12→**0.03** | 5 = | |
| ashroot_broth | :695 | 1 | 2 = | 0.12→**0.035** | 16 = | |
| cooked_chicken | :3894 | 2 | 2 = | 0.12→**0.04** | 9 = | |
| grimwheat_porridge | :696 | 3 | 3 = | 0.12→**0.04** | 20 = | |
| cooked_murk_perch | :130 | 5 | 3 = | 0.12→**0.045** | 7 = | |
| cooked_beef | :3892 | 5 | 3 = | 0.12→**0.05** | 12 = | |
| roasted_bog_fowl | :3905 | 7 | 4 = | 0.12→**0.05** | 10 = | |
| grilled_boar_loin | :3906 | 8 | 4 = | 0.12→**0.06** | 14 = | |
| cake_honey | :4682 | 9 | 4 = | 0.12→**0.045** | 34 = | |
| cooked_trout | :102 | 10 | **5→4** | 0.12→**0.055** | 12 = | Fisch-Tie-Fix (P3) |
| roasted_hare | :3907 | 14 | 5 = | 0.12→**0.065** | 22 = | |
| cooked_cod | :108 | 15 | 5 = | 0.12→**0.06** | 22 = | |
| marshroot_chowder | :150 | 18 | 6 = | 0.11→**0.07** | 40 = | |
| cooked_ghostfin_pike | :131 | 20 | 6 = | 0.11→**0.065** | 25 = | |
| wolf_steak | :3908 | 22 | 6 = | 0.11→**0.07** | 30 = | |
| cooked_shadowcarp | :139 | 25 | 7 = | 0.11→**0.07** | **16→30** | value-Inversion-Fix (P6) |
| venison_roast | :3909 | 28 | 7 = | 0.11→**0.075** | 42 = | |
| cooked_ironscale_bass | :132 | 30 | 8 = | 0.11→**0.075** | 33 = | |
| cooked_salmon | :113 | 35 | 9 = | 0.11→**0.08** | 40 = | |
| bloodgrain_stew | :179 | 38 | 10 = | 0.11→**0.085** | 100 = | |
| roc_drumstick_grilled | :3910 | 40 | 10 = | 0.11→**0.085** | 60 = | |
| cooked_duskfin_carp | :133 | 45 | 11 = | 0.11→**0.085** | 52 = | |
| duskfin_rangers_stew | :159 | 48 | **12→13** | 0.11→**0.095** | 120 = | Feast-Krone (P4) |
| bear_haunch | :3911 | 48 | 12 = | 0.11→**0.09** | 80 = | |
| gallows_preserve | :701 | 50 | 13 = | 0.11→**0.09** | 75 = | |
| spellwarden_bisque | :169 | 52 | 14 = | 0.11→**0.10** | 140 = | |
| cooked_lobster | :118 | 55 | 15 = | 0.11→**0.095** | 70 = | |
| soulgourd_brisket | :189 | 58 | 16 = | 0.11→**0.105** | 220 = | |
| cooked_crypteel | :140 | 60 | 16 = | 0.11→**0.10** | **130→88** | + **curesPoison: true** (P5) |
| cooked_bloodfang_eel | :134 | 63 | 17 = | 0.11→**0.105** | 95 = | |
| steelshot_bisque | :266 | 63 | **17→18** | 0.11→**0.11** | 240 = | Feast-Krone (P4) |
| spellflare_tisane | :275 | 65 | **18→19** | 0.11→**0.115** | 260 = | Feast-Krone (P4) |
| cooked_anglerfish | :123 | 70 | 20 = | 0.11→**0.115** | 120 = | |
| wyvern_steak | :3912 | 72 | 21 = | 0.11→**0.115** | 130 = | |
| witherleek_bouillabaisse | :199 | 75 | 22 = | 0.11→**0.125** | 500 = | |
| witherleek_sharpshooters_pie | :210 | 76 | 23 = | 0.11→**0.125** | 480 = | |
| witherleek_arcane_broth | :220 | 77 | 24 = | 0.11→**0.13** | 480 = | |
| cooked_wraithscale | :135 | 78 | 24 = | 0.11→**0.125** | 165 = | |
| cooked_voidray | :128 | 85 | 30 = | 0.11→**0.135** | 200 = | |
| voidray_banquet | :242 | 86 | 31 = | 0.11→**0.14** | 900 = | |
| risotto_starcap | :4726 | 90 | 34 = | 0.11→**0.135** | 780 = | |
| ambergrain_feast | :230 | 90 | 34 = | 0.11→**0.145** | 1200 = | |
| cooked_abyssal_crawler | :136 | 92 | 35 = | 0.11→**0.14** | 300 = | |
| abyssal_feast | :249 | 93 | 36 = | 0.11→**0.15** | 1300 = | |
| cooked_soulfish | :137 | 97 | 39 = | 0.11→**0.145** | 500 = | |
| soulfire_banquet | :257 | 98 | 40 = | 0.12→**0.155** | 2000 = | Krone |

Verbleibende Flat-Ties im selben Band sind sämtlich per Regel differenziert (Linie + pct, bzw.
Buff bei Feasts): beef/murk (pct .05/.045), ghostfin/wolf/chowder (.065/.07/.07+con-Buff),
shadowcarp/venison (.07/.075), bloodgrain/roc (Buff), risotto/ambergrain (.135/.145 + andere
Buffs). Innerhalb JEDER Linie sind (flat, pct) streng monoton und kollisionsfrei; das
(flat,pct)-Paar ist über alle 46 Speisen eindeutig oder buff-differenziert.

---

## Teil 4 — Beleg: Differenzierung kommt IN DER PRAXIS an

### 4.1 Effektive Heilung NEU (Fisch-Linie, dieselben maxHp-Stützstellen wie §1.3)

| maxHp | shrimp | murk | trout | cod | ghostfin | s'carp | bass | salmon | carp | lobster | crypteel | eel | angler | wraith | voidray | abyssal | soulfish |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 30 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 15 | 16 | 17 | 20 | 24 | 30 | 35 | 39 |
| 60 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 11 | 15 | 16 | 17 | 20 | 24 | 30 | 35 | 39 |
| 112 | 3 | 5 | 6 | 7 | 7 | 8 | 8 | 9 | 11 | 15 | 16 | 17 | 20 | 24 | 30 | 35 | 39 |
| 165 | 5 | 7 | 9 | 10 | 11 | 12 | 12 | 13 | 14 | 16 | 17 | 17 | 20 | 24 | 30 | 35 | 39 |
| 220 | 7 | 10 | 12 | 13 | 14 | 15 | 17 | 18 | 19 | 21 | 22 | 23 | 25 | 28 | 30 | 35 | 39 |
| 300 | 9 | 14 | 17 | 18 | 20 | 21 | 23 | 24 | 26 | 29 | 30 | 32 | 35 | 38 | 41 | 42 | 44 |

Vorher @165: „Wand aus 18–20" über 12 Fische mit Shrimp==Anglerfisch. Nachher @165: 5 → 39 in
14 unterscheidbaren Stufen; @300 (wo ALT auf 33/36 kollabierte) läuft die Leiter 9 → 44 (+
soulfire_banquet 47 als Krone). Höherstufiger Fisch heilt an JEDER Stützstelle ≥ niedrigeren
(flat- und pct-Leiter beide monoton ⇒ max() bleibt monoton); vereinzelte Nachbar-Gleichstände
durch Rundung (z. B. crypteel/eel 17/17 @165) lösen sich eine Stufe später wieder auf.

### 4.2 Break-even NEU (maxHp, ab der der %-Floor den Flat übernimmt)

shrimp 67 · murk 67 · trout 73 · cod 84 · ghostfin 93 · shadowcarp 100 · bass 107 · salmon 113 ·
carp 130 · lobster 158 · crypteel 160 · eel 162 · angler 174 · wraith 192 · voidray 223 ·
abyssal 250 · soulfish 269. Streng monoton ⇒ keine Speise wird je von einer niedrigeren
überholt (ALT: Break-even 17–82 für L1–L35 ⇒ Dauer-Nivellierung; NEU setzt der Floor erst
~1.5–2 Bänder über dem Unlock ein und staffelt dann weiter).

### 4.3 Invarianten-Check

- **On-level unverändert:** pct(item) < flat/B(L) für alle 46 (Maximum: soulfire 0.155 < 40/210 =
  0.19) ⇒ am eigenen Band dominiert der Flat, die 18-%-Bissen-Kalibrierung aus §5.5 bleibt exakt.
- **Sustain-Deckel:** Krone 0.155/4.5 s ≈ 3.4 %/s < SOLL ~4 %/s < naked-Inflow ~5 %/s ✔.
  Flat-seitig unverändert (nur trout −1, drei Feasts +1, alle ≤ 0.20·B(L)).
- **Trank-Hierarchie:** Speisen-pct liegt in jedem Band 4–10 pp UNTER der Trank-Leiter
  (L48: 0.095 vs. greater 0.20; L98: 0.155 vs. godbloom 0.25) — der Trank bleibt der große
  Schluck, Food die Grundversorgung ✔.
- **Überheilung:** feste Auto-Eat-Tiers ≤ 0.70 ⇒ Lücke ≥ 30 % > jeder Bissen ✔ (§0.6).
- **Nerf-Fußnote (bewusst):** Wer weit ÜBER Band altes Food isst, heilt künftig deutlich weniger
  (Shrimp @165: 20 → 5). Das ist der gewollte Grund, neue Fische zu kochen. Absicherung im Idle:
  Auto-Eat wechselt bei leerem Stapel automatisch auf anderes Food (combat.ts:146-154); für
  Bestands-Saves mit Alt-Food-Bergen gehört der Hinweis in die Patchnotes (s. Teil 6).

---

## Teil 5 — Guard-/Test-/System-Auswirkungen (beim Apply mitzuziehen)

| Bereich | Wirkung | Aktion |
|---|---|---|
| SAVE_VERSION | reine ContentDB-Zahlen + 1 Boolean auf bestehendem Item, kein State | **kein Bump** ✔ |
| engine/content-integrity §4.4 (:277-295) | KEIN neuer Buff (curesPoison ist kein buff) ⇒ `tagged` bleibt **44** (15 food) | keine |
| engine/content-integrity §4.3 | Feast-Modifiers unverändert (Deckel 8) | keine |
| engine/food-hybrid.test.ts | rein synthetische Items (`__test_hybrid__`) | keine |
| engine/autoeat-dot.test.ts | nutzt cooked_trout nur behavioral (isst > DoT 0.2/Tick; heal 4 trägt); Kommentar „healAmount 3" ist ohnehin stale | Kommentar optional aktualisieren |
| engine/kill-cooldown/combatlog-source/auto-potion/character/discovery/dungeon/idol/paragon | prüfen Verhalten (Essen ja/nein, itemId), keine Heilbetrags-Pins; späte Tests (voidray-Food) heilen mit pct 0.135 eher MEHR | keine |
| sim (pnpm test, XP/Kampf) | Sim-Charakter ist no-food-Worst-Case ⇒ byte-identisch | Sichtprüfung |
| engine/sim-realistic.ts | wählt/kauft Food dynamisch über consumableHeal (:174-178 Toleranz-Heuristik) — kein Shop-Food, keine Pins; Verhalten wird korrekt „on-level Food kochen" bevorzugen | keine |
| useConsumable/Auto-Eat curesPoison | Pfad existiert & getestet (combat.ts:174, run4 P3); crypteel ohne buff ⇒ heilt UND kuriert | keine |
| UI | Tooltip zeigt effektiven Heilwert via consumableHeal (Task #243) + gerundete % — aktualisiert sich selbst; curesPoison-Zeile rendert wie potion_antidote | keine |
| i18n | keine neuen Items/Aktionen | keine |
| Quests/Loot/Token-Shop | Food nur als Stückzahl referenziert (z. B. Brenna-Brief 5× cooked_trout, elites.ts:479) | keine |

---

## Teil 6 — Apply-Liste (geordnet, für content-dev)

1. index.ts:102 `cooked_trout.healAmount` 5→4 (P3; Kommentar: Fisch-Leiter-Dedup, 18 % von B(10)).
2. index.ts:159 `duskfin_rangers_stew.healAmount` 12→13 · :266 `steelshot_bisque` 17→18 ·
   :275 `spellflare_tisane` 18→19 (P4 Feast-Krone).
3. healPct-Restage ALLER 46 Speisen exakt nach Teil-3-Tabelle (Kommentar je Zeile:
   „speisen-heilwerte-spec Teil 3"). Reihenfolge egal, ein Durchgang.
4. index.ts:139 `cooked_shadowcarp.value` 16→30 · :140 `cooked_crypteel.value` 130→88 (P6).
5. index.ts:140 `cooked_crypteel` + `curesPoison: true` (P5; Kommentar auf combat.ts:174-Pfad).
6. `pnpm test` (Turbo-Cache beachten!) — erwartet: alles grün, §4.4-Zähler unverändert 44,
   Sim byte-identisch (no-food). Sichtprüfung Kampf-Tests mit Food (keine neuen Tode).
7. Patchnotes (Entwurf):
   - EN: "Every dish now has its own healing identity: cooked food scales from small snacks to
     endgame feasts instead of collapsing into one flat percentage. Higher-tier fish are now
     always the bigger bite — old low-level food fades with your max HP, so restock your pantry.
     Roasted Crypteel now also cures poison."
   - DE: "Jede Speise hat jetzt eine eigene Heil-Identität: Gekochtes skaliert vom kleinen Snack
     bis zum Endgame-Festmahl, statt auf einen Einheits-Prozentwert zusammenzufallen.
     Höherstufiger Fisch ist jetzt immer der größere Bissen — altes Low-Level-Essen verblasst
     mit steigenden Lebenspunkten, also Vorratskammer auffrischen. Gerösteter Krypta-Aal
     kuriert jetzt zusätzlich Gift."
