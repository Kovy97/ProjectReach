# QA-Run 7 — Cooking & Food-Loop (dedizierte Linse: Koch → Kampf)

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-28
**Scope (eigene Linse, Fokus auf die Run-7-Änderung):** Die **zwei run6-P2-Residuen** an der Stil-Parität —
(1) **`raw_venison`-Shop-Fallback** (Ranged/Magie-Fleischsorte fehlte im Shop) und
(2) **L75-Epic-Combo-Food für ALLE 3 Stile** (run6: nur Nahkampf hatte ein L75-Epic). Roh→Gericht-Kette
weiter lückenlos · Heal+Buff-Verdrahtung der neuen Gerichte (kein „defined but never applied") · gold-positiv ·
keine Shop-Arbitrage.
**Leitfrage: Ist die Stil-Parität jetzt auch über **Beschaffung** (Venison kaufbar) und **Power-Niveau**
(L75+-Epic je Stil) geschlossen — und was hält den Koch→Kampf-Loop noch unter 9,5?**
**Kontext (verglichen):** `run6-cooking-food.md` (war **9,0**; gebremst durch zwei P2 — venison drop-only +
kein ranged/magic-Epic-Pendant zu `witherleek_bouillabaisse` L75).

**Methode — echte Daten:** Statische Verifikation direkt am Content-Katalog (`packages/content/src/index.ts`)
und an den Engine-Pfaden (`character.ts` `addBonus`/`computeStats`, `combat.ts` `tryAutoEat`). Alle Item-/
Rezept-/Shop-Zahlen unten sind reale Katalogwerte (Zeilen referenziert). Gold-Bilanz = Output-Vendorwert
minus Σ Input-Vendorwerte. **Kein temporäres Harness nötig** (und folglich keins zu entfernen): die
Buff-Anwendung ist vollständig generisch (addBonus deckt jedes Trio-Feld ab, s. u.), die heal-% nutzen die
in run5/6 verankerten maxHp-Werte (L70≈1177, L75≈hochgerechnet ~1230) als transparente, **konservative**
Interpolation.

---

## Fun-Score: **9,4 / 10**  (Δ vs run6: **+0,4**)

**Beide run6-P2-Residuen sind eingelöst — die Stil-Parität ist jetzt nicht nur über die Level-Kurve,
sondern auch über Beschaffung UND Power-Niveau geschlossen:**

1. **`raw_venison` ist jetzt kaufbar** (`index.ts` 9269: `{ itemId: "raw_venison", cost: 10 }`). Damit hat
   **jede** Combo-Food-Fleischsorte einen Shop-Fallback — die Ranged/Magie-Beschaffungs-Schieflage aus run6
   ist weg.
2. **L75-Epic-**Stil-Trio** vollständig:** zu `witherleek_bouillabaisse` (L75, melee, epic) kommen zwei
   erfundene, stil-passende Geschwister —
   - **`witherleek_sharpshooters_pie`** (Kochen **L76**, **epic**, heal 180, hpRegen 7, defense 12,
     **+8 rangedDamage**, crit +4 %) und
   - **`witherleek_arcane_broth`** (Kochen **L77**, **epic**, heal 180, hpRegen 7, defense 12,
     **+8 magicDamage**, accuracy +10).

   Damit hat **jeder Stil ein L75+-Epic-Combo-Food** — das stärkste Mid-Late-Gericht ist **kein
   Nahkampf-Privileg** mehr. Alle drei sind **gold-positiv** (Δ +235 / +209 / +215) und heilen **UND** buffen
   in einem Bissen über denselben generischen addBonus-Pfad wie die run5/6-Gerichte — **kein toter
   Effekt-Zweig**, auch die neuen Felder `defense`/`accuracy` werden real aggregiert.

**Gebremst (nicht auf 9,5) durch genau den run6-Punkt 3** plus eine Mini-Asymmetrie — beides **P3, kein
Strukturproblem:** Die **Auto-Eat-Tiers** differenzieren weiterhin kaum (Survival schon bei T0 gelöst; der
Tier-Nutzen ist reine Vorrats-Schonung, nicht echtes Überleben) — das ist der **einzige** Teil des
Koch→Kampf-Loops, der sich noch nicht belohnend anfühlt, und exakt der von run6 prognostizierte „Punkt 3 →
9,5"-Hebel. Dazu eine **minimale intra-Trio-Asymmetrie** (Nahkampf heilt 185 statt 180, defense 15 statt 12).

---

## Verifikation der Run-7-Änderungen (reale Zahlen)

### Fix 1 — `raw_venison`-Shop-Fallback: GELÖST ✓
`index.ts` 9269 ergänzt im Shop `{ itemId: "raw_venison", cost: 10 }`. Vendorwert ist **8** (Item-Def 3405)
→ Markup **+2**, **keine Arbitrage** (Kaufen teurer als Verkaufen). Fleisch-Beschaffung jetzt vollständig:

| Fleisch | Vendor | Shop-Fallback? | Combo-Gerichte, die es brauchen |
|---|---:|---|---|
| raw_chicken | 4 | **✓ 8 G** | marshroot_chowder (L18) |
| raw_beef | 5 | **✓ 12 G** | bloodgrain_stew, soulgourd_brisket, spellflare_tisane, bouillabaisse, arcane_broth, ambergrain_feast |
| **raw_venison** | 8 | **✓ 10 G [NEU]** | duskfin_rangers_stew, spellwarden_bisque, steelshot_bisque, **sharpshooters_pie** |

→ Die run6-Schieflage („Fallback hilft faktisch nur Nahkampf") ist behoben: **jede** Fleischsorte ist jetzt
RNG-unabhängig nachkaufbar. Der Loop kann an keiner Fleisch-Zutat mehr stocken.

### Fix 2 — L75-Epic-Stil-Trio: GELÖST ✓ (Power-Parität hergestellt)
Item-Defs `index.ts` 185–208, Rezepte 4855–4891. Das beste In-Band-Combo-Food jetzt pro Stil **epic**:

| Stil | Gericht | Kochen | Rarität | heal | hpRegen | defense | Offensiv | crit/acc |
|---|---|---:|---|---:|---:|---:|---|---|
| Nahkampf | witherleek_bouillabaisse | L75 | **epic** | 185 | 7 | 15 | +8 melee | crit +4 % |
| Fernkampf | **witherleek_sharpshooters_pie [NEU]** | L76 | **epic** | 180 | 7 | 12 | +8 ranged | crit +4 % |
| Magie | **witherleek_arcane_broth [NEU]** | L77 | **epic** | 180 | 7 | 12 | +8 magic | acc +10 |

→ Das 25-Level-„Epic nur für Nahkampf"-Loch aus run6 ist geschlossen. Offensiv-Bonus (+8) und hpRegen (7)
sind **identisch** über alle drei; Magie tauscht crit gegen das stil-passende accuracy +10.

### Fix 3 — Alle drei Trio-Rezepte gold-positiv ✓
| Rezept | Lvl | Inputs (Vendor) | Σ Input | Output-Value | **Δ Gold** |
|---|---:|---|---:|---:|---:|
| cook_witherleek_bouillabaisse | 75 | wraithscale 110 + beef 2×5 + wither_leek 75 + nightbloom 70 | 265 | 500 | **+235** |
| cook_witherleek_sharpshooters_pie | 76 | wraithscale 110 + **venison 2×8** + wither_leek 75 + nightbloom 70 | 271 | 480 | **+209** |
| cook_witherleek_arcane_broth | 77 | wraithscale 110 + beef 2×5 + wither_leek 75 + nightbloom 70 | 265 | 480 | **+215** |

(Vendorwerte: wraithscale 69, beef 3396, venison 3405, wither_leek 570, nightbloom 505; Outputs 188/197/205.)
Alle deutlich über break-even, konsistent zur run5/6-Palette. Hinweis: die Pie buft das neue Venison-Shop-
Item direkt mit ein → Fix 1 und Fix 2 greifen ineinander (Ranger-Main kann ALLE Pie-Fleischzutaten nachkaufen,
Gate ist nur das aus dem Kampf gedroppte `raw_wraithscale` — also bleibt der Koch→Kampf-Loop intakt).

### Fix 4 — Heal+Buff verdrahtet, kein „dead field" ✓ (statisch verifiziert)
`addBonus` (character.ts 143–153) aggregiert **alle** Trio-Buff-Felder generisch: `meleeDamage`,
`rangedDamage`, `magicDamage`, **`defense`** (146), **`accuracy`** (147), `hpRegenPerSec` (152),
`critChance` (153). Diese fließen in `computeStats` real in die abgeleiteten Stats (221–262). Die neuen
Felder `defense`/`accuracy` des Trios sind damit **keine toten Felder** — sie wirken im Hand-Verzehr (über
`useConsumable`, run6 verifiziert) **und** automatisch im Kampf (`tryAutoEat` teilt denselben Pfad). Alle
Rezept-In/-Outputs existieren als Items (content-integrity-tauglich), IDs kollisionsfrei.

---

## Roh → Gericht-Kette: weiterhin lückenlos ✓ — und jetzt ohne Beschaffungs-Asymmetrie
Mit Venison im Shop ist die in run6 monierte „bei trockener Venison-RNG stockt ausgerechnet Ranged/Magie"-
Schwäche aufgelöst. Combo-Food-Leitern jetzt **early→endgame, jeder Stil, lückenlos, top-Band epic**:

| Stil | Leiter (Lvl / Offensiv) | L58–80-Band | L75+-Epic? |
|---|---|---|---|
| **Nahkampf** | bloodgrain_stew L38 · soulgourd_brisket L58 · **bouillabaisse L75 (+8, epic)** · ambergrain L90 | ✓ | ✓ |
| **Fernkampf** | duskfin_rangers_stew L48 · steelshot_bisque L63 (+6) · **sharpshooters_pie L76 (+8, epic) [NEU]** · ambergrain L90 | ✓ | **✓ [NEU]** |
| **Magie** | spellwarden_bisque L52 · spellflare_tisane L65 (+6) · **arcane_broth L77 (+8, epic) [NEU]** · ambergrain L90 | ✓ | **✓ [NEU]** |

---

## Findings

### [P0] — keine.
Kein Crash, kein toter Effekt-Zweig (alle Trio-Felder inkl. defense/accuracy generisch verdrahtet), keine
Heilwert-Inversion, kein Save-Risiko (nur neue Items/Rezepte/1 Shop-Eintrag). Keine Shop-Arbitrage.

### [P1] — keine.
Beide run6-P2-Kernvorgaben (Venison-Fallback + L75-Epic-Stil-Trio) sind strukturell **erfüllt** und
gold-positiv. Die Stil-Parität ist jetzt über **Level-Kurve, Beschaffung und Power-Niveau** geschlossen.

### [P2] — keine.
Erstmals seit run5 **kein offenes P2** in dieser Linse. Die beiden run6-P2 sind beide aufgelöst.

### [P3 — Carryover, Hebel auf 9,5] Auto-Eat-Tiers differenzieren weiterhin kaum
Unverändert ggü. run5/6 (`tryAutoEat` combat.ts 69–77: `autoEatThreshold`/`autoEatHealMult`-Tier-Skalierung,
healMult bis 1.5). Survival ist schon bei T0 gelöst; der Tier-Nutzen liegt weiter v. a. in **Combo-Food-
Vorrats-Schonung** (weniger Bissen/Kampf), nicht in echter Überlebensfähigkeit. Das ist **der einzige** Teil
des Koch→Kampf-Loops, der sich noch nicht belohnend anfühlt, und genau der von run6 als „Punkt 3 → 9,5"
benannte Hebel. Liegt primär im Combat-Revier; hier als Loop-Berührungspunkt. **Fix:** an echten Burst-Druck
koppeln ODER die 2k/8k/25k-Senke bewusst als „Combo-Food-Sparfaktor" framen (Tooltip/UI), damit der Kauf
sich belohnend anfühlt.

### [P3 — Balance, minimal] Mini-Asymmetrie innerhalb des L75-Trios
Nahkampf bleibt am obersten Rand minimal stärker: heal **185 vs 180** (~3 %), defense **15 vs 12**, Item-
Value **500 vs 480**. Offensiv (+8) und hpRegen (7) sind gleich, Magie kompensiert crit durch acc +10. Die
Asymmetrie ist innerhalb der Mess-Toleranz und stört die Parität praktisch nicht — reiner Feinschliff.
**Fix (optional):** heal/defense/value der drei exakt angleichen (alle heal 185, defense 14, value 490).

### [P3 — Beschaffung, kosmetisch] Magie-Top-Gericht braucht kein Venison
`arcane_broth` (magic) nutzt `raw_beef` (2), nur `sharpshooters_pie` (ranged) nutzt `raw_venison` (2). Der
neue Venison-Fallback wirkt damit konkret nur für die Ranged-Pie (Magie war über beef ohnehin abgedeckt).
Kein Problem — thematisch frei wählbar, beide Fleischsorten sind jetzt kaufbar; nur als Vollständigkeits-
Notiz, falls man Venison stärker als „Ranged/Magie-Signatur" positionieren will.

---

## Δ zu run6

| Thema | run6-Befund | Run 7 |
|---|---|---|
| `raw_venison`-Shop-Fallback | **P2** (venison drop-only, Ranged/Magie-Schieflage) | **GELÖST** — `cost 10` im Shop, kein Arbitrage |
| L75-Epic-Combo-Food je Stil | **P2** (nur Nahkampf epic; ranged/magic toppen bei superRare) | **GELÖST** — sharpshooters_pie L76 + arcane_broth L77 (beide epic, +8), gold-positiv, korrekt gebufft |
| Stil-Parität über Beschaffung + Power | offen | **geschlossen** (Level-Kurve ✓ + Beschaffung ✓ + Power ✓) |
| Heal+Buff-Verdrahtung neuer Gerichte | generisch (statisch) | generisch inkl. **neue Felder defense/accuracy**, kein dead field |
| Auto-Eat-Tiers differenzierend | **P3-Carryover** | unverändert → **[P3]-Carryover (Hebel auf 9,5)** |
| Crop-/Brew-/Combo-Rezepte gold-positiv | alle ≥ 0 | unberührt; neue Gerichte +235/+209/+215 |

---

## Was fehlt für 9,5?
Run 6 hatte selbst prognostiziert: „mit 1+2 bei ~9,4; mit 1–3 bei 9,5." **Run 7 hat Punkt 1 (Venison-Fallback)
und Punkt 2 (Epic-Stil-Trio) geliefert → genau 9,4.** Die letzten 0,5 sind **ein** echter Hebel + zwei
kosmetische Schliffe, **kein Strukturproblem**:

1. **(P3 — der Hebel) Auto-Eat-Tiers belohnend machen.** Entweder an echten Burst-/DoT-Druck koppeln
   (sodass höhere Tiers wirklich Tode verhindern, nicht nur Bissen sparen) **oder** die Tier-Stufen klar als
   „Combo-Food-Sparfaktor" framen (UI/Tooltip: „spart X % Verbrauch im Kampf"). **Das** ist der eigentliche
   9,5-Schritt — der einzige Loop-Teil, der sich noch nicht belohnend anfühlt.
2. **(P3) Intra-Trio exakt angleichen** (heal/defense/value der drei L75-Gerichte identisch), damit „bestes
   Premium-Gericht" auch zahlentechnisch perfekt stilneutral ist.
3. **(P3, optional) Venison als Ranged/Magie-Signatur** schärfen (arcane_broth auf venison umstellen), falls
   man die Fleisch-Identität betonen will.

Mit Punkt 1 allein **9,5**; Punkte 2/3 sind reine Politur darüber.

---

## Verdict
**Die Run-7-Hauptvorgabe sitzt vollständig:** `raw_venison` ist im Shop (cost 10, kein Arbitrage) und es gibt
ein **L75-Epic-Stil-Trio** — `witherleek_bouillabaisse` L75 (melee), `witherleek_sharpshooters_pie` L76
(ranged), `witherleek_arcane_broth` L77 (magic) — alle epic, +8 Offensiv, hpRegen 7, gold-positiv (+235 /
+209 / +215) und über den generischen addBonus-Pfad korrekt heilend+buffend (inkl. neuer Felder
defense/accuracy). **Kein P0/P1/P2, kein toter Effekt.** Damit ist die Stil-Parität erstmals über **alle drei
Achsen** geschlossen: Level-Kurve, Beschaffung (jede Fleischsorte kaufbar) und Power-Niveau (L75+-Epic je
Stil). Der Koch→Kampf-Loop ist rund und selbstverstärkend. Δ vs run6 **+0,4 → 9,4**. Was es noch unter 9,5
hält, ist **kein Content-Loch mehr**, sondern der seit run5 mitgeschleppte **Auto-Eat-Tier-Feel** (P3) —
genau der Punkt, den run6 als finalen 9,5-Schritt benannt hat. Tiers belohnend machen, dann ist die 9,5 da.
