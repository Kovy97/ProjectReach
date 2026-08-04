# QA-Run 6 — Cooking & Food-Loop (dedizierte Linse: Koch → Kampf)

**Tester:** Playtester-Analyst (STRIKT READ-ONLY; einzige Schreibdatei = dieser Bericht) · **Datum:** 2026-06-28
**Scope (eigene Linse, Fokus auf die Run-6-Änderung):** Combo-Food-**Stil-Parität** im Band **L58–80**
für alle 3 Stile (Nahkampf/Fernkampf/Magie) · **Fleisch-Shop-Fallback** · Roh→Gericht-Kette weiter
lückenlos · Heal+Buff-Verdrahtung der neuen Gerichte (kein „defined but never applied") · gold-positiv.
**Leitfrage: Ist Combo-Food jetzt für ALLE 3 Stile durchs L58–80-Band — und was hält den Loop noch
unter 9,5?**
**Kontext (verglichen):** `run5-cooking-food.md` (war **8,5**; gebremst durch Combo-Food-Stil-Paritäts-
Lücke ranged/magic L52→L90 [P2] + Fleisch ohne Shop-Fallback [P3] + Auto-Eat-Tiers kaum differenzierend [P2]).

**Methode — echte Daten:** Statische Verifikation direkt am Content-Katalog (`packages/content/src/index.ts`)
und an den Engine-Pfaden (`consumable.ts` `useConsumable`/`applyConsumableBuff`, `character.ts`
`computeStats`/`addBonus`, `combat.ts` Auto-Eat). Alle Item-/Rezept-/Shop-Zahlen unten sind die realen
Katalogwerte (Zeilen referenziert). Gold-Bilanz = Vendorwert des gekochten Outputs minus Vendorsumme der
Roh-Inputs. **Kein temporäres Harness nötig:** die Buff-Anwendung ist vollständig generisch (s. u.), die
heal-% nutzen die in run5 vom Engine-Harness gewonnenen maxHp-Anker (L50≈867, L70≈1177) als transparente
Interpolation — **konservativ** (überschätzt con → ausgewiesene heal-% sind eine Untergrenze).

---

## Fun-Score: **9,0 / 10**  (Δ vs run5: **+0,5**)

**Die Run-5-Kernvorgabe ist eingelöst:** Combo-Food gibt es jetzt für **alle drei Stile im L58–80-Band**.
Run 6 ergänzt zwei erfundene, stil-passende Gerichte —
- **`steelshot_bisque`** (Kochen **L63**, +6 **rangedDamage**, crit +3 %, heal 120, hpRegen 4) und
- **`spellflare_tisane`** (Kochen **L65**, +6 **magicDamage**, accuracy +8, heal 120, hpRegen 4) —

und schließt damit das in run5 monierte **~40-Level-Loch** (ranged/magic hatten zwischen L52 und L90
nichts Stil-Passendes). Beide Rezepte sind **gold-positiv** (Δ **+65** bzw. **+109**), beide Gerichte
heilen **UND** buffen in einem Bissen über denselben generischen Pfad wie die run5-verifizierten Combo-
Gerichte — **kein toter Effekt-Zweig**. Zusätzlich landet der run5-P3-Fix teilweise: **Fleisch** hat jetzt
einen Shop-Fallback.

**Gebremst (nicht auf 9,5) durch zwei Residuen**, beide direkt an der Parität:
1. **Der Fleisch-Shop-Fallback ist unvollständig und stil-schief:** nur `raw_beef` (12 G) und
   `raw_chicken` (8 G) sind kaufbar — **`raw_venison` fehlt**. Venison ist aber genau die Pflichtzutat der
   **ranged/magic-Gerichte** (`duskfin_rangers_stew` L48, `spellwarden_bisque` L52, `steelshot_bisque` L63).
   Der Fallback hilft also faktisch fast nur dem Nahkampf — er reproduziert die Stil-Schieflage, die Run 6
   eigentlich auflösen sollte.
2. **Die Power-Parität bleibt ungleich:** das Premium-Mid-Gericht `witherleek_bouillabaisse` (L75) ist
   **epic** (heal 185, hpRegen 7, +8 melee) — es gibt **kein ranged/magic-Epic-Pendant**. Ranged/Magie
   toppen im Band bei **superRare** (heal 120, hpRegen 4) und bekommen zwischen L65 und L90 (25 Level)
   **nichts Neues**, während Nahkampf bei L75 ein frisches Epic erhält.

---

## Verifikation der Run-6-Änderungen (reale Zahlen)

### Fix 1 — Stil-Parität im L58–80-Band: GELÖST ✓
Die zwei neuen Gerichte (`index.ts` 202–215 / Rezepte 4833–4856) füllen das ranged/magic-Loch. Combo-Food-
Leitern jetzt **vollständig early→endgame für jeden Stil**:

| Stil | Combo-Food-Leiter (Lvl / Offensiv-Bonus) | Lücke L52→L90? |
|---|---|---|
| **Nahkampf** | bloodgrain_stew L38 (+4) · [soulgourd_brisket L58 neutral] · **witherleek_bouillabaisse L75 (+8, epic)** · ambergrain_feast L90 (alle) | geschlossen |
| **Fernkampf** | duskfin_rangers_stew L48 (+4) · **steelshot_bisque L63 (+6) [NEU]** · ambergrain_feast L90 (alle) | **geschlossen ✓** |
| **Magie** | spellwarden_bisque L52 (+4) · **spellflare_tisane L65 (+6) [NEU]** · ambergrain_feast L90 (alle) | **geschlossen ✓** |

→ Im **L58–80-Band** hat nun **jeder Stil** ein stil-passendes Offensiv-Combo-Food:
Fernkampf **L63**, Magie **L65**, Nahkampf **L75**. Die run5-Kernvorgabe ist **erfüllt**.

### Fix 2 — Beide neuen Rezepte gold-positiv ✓
| Rezept | Lvl | Inputs (Vendor) | Σ Input | Output-Value | **Δ Gold** |
|---|---:|---|---:|---:|---:|
| cook_steelshot_bisque | 63 | bloodfang_eel 62 + venison 8 + soulgourd 35 + nightbloom 70 | 175 | 240 | **+65** |
| cook_spellflare_tisane | 65 | bloodfang_eel 62 + beef 5 + nightbloom 70 + bloodthistle 14 | 151 | 260 | **+109** |

Beide deutlich über break-even — konsistent zur run5-Palette. (Werte: `index.ts` 68/3379/552/488 bzw.
3370/486.)

### Fix 3 — Heal+Buff verdrahtet, kein „dead field" ✓ (statisch verifiziert)
`useConsumable` (consumable.ts 26–49) wendet `healAmount`, `curesPoison` und `buff` **gleichzeitig**
generisch an; `applyConsumableBuff` (11–17) ist mit dem Auto-Eat-Pfad (combat.ts) **geteilt**. In
`computeStats` aggregiert `addBonus` (character.ts 142–183) **alle** Buff-Felder der neuen Gerichte —
`rangedDamage`, `magicDamage`, `accuracy`, `critChance`, `hpRegenPerSec`. **Folge:** steelshot/spellflare
heilen UND buffen sofort, im Hand-Verzehr **und** automatisch im Kampf, ohne jede item-spezifische
Verdrahtung. Kein Risiko eines wirkungslosen Stat-Felds. Alle Rezept-Inputs/-Outputs existieren als Items
(content-integrity-tauglich).

### Fix 4 — Fleisch-Shop-Fallback: **teilweise** gelandet (run5-P3) ◐
`index.ts` 9190–9191 ergänzt im Shop: `raw_beef` (cost 12, Vendor 5) und `raw_chicken` (cost 8, Vendor 4)
— sinnvoller Markup, kein Gratis-Arbitrage. **Aber `raw_venison` (Vendor 8) hat KEINEN Shop-Eintrag**
(globaler Katalog-Scan: nur Item-Def 3379, Drop 8643 bei `scarred_hide` 0.7, Koch-Refs — **kein Shop**).
Damit ist die einzige Zutatengruppe ohne Fallback genau die **Ranged/Magie-Fleischsorte**.

---

## Roh → Gericht-Kette: weiterhin lückenlos ✓ (mit einer Beschaffungs-Asymmetrie)
Alle Inputs der jetzt **9** Combo-Gerichte existieren mehrfach referenziert. Fleisch-Bezug nach Run 6:

| Fleisch | Vendor | Shop-Fallback? | Combo-Gerichte, die es brauchen |
|---|---:|---|---|
| raw_chicken | 4 | **✓ 8 G** | marshroot_chowder (L18) |
| raw_beef | 5 | **✓ 12 G** | bloodgrain_stew, soulgourd_brisket, spellflare_tisane, witherleek, ambergrain_feast |
| **raw_venison** | 8 | **✗ keiner** | **duskfin_rangers_stew, spellwarden_bisque, steelshot_bisque** |

→ Der Loop bleibt selbstverstärkend (Kampf → Fleisch → Combo-Food → Kampf), aber bei trockener Venison-RNG
können **ausgerechnet 2/3 der Ranged- und 1/2 der Magie-Combo-Gerichte** stocken, während alle Nahkampf-
Gerichte (beef) RNG-unabhängig kaufbar sind.

---

## Findings

### [P0] — keine.
Kein Crash, kein toter Effekt-Zweig (Heal+Buff generisch verdrahtet), keine Heilwert-Inversion, kein
Save-Risiko. Beide neuen Gerichte auflösbar und korrekt gebufft.

### [P1] — keine.
Die Run-5-Kernvorgabe „Combo-Food für alle 3 Stile im L58–80-Band" ist strukturell **erfüllt** und
gold-positiv.

### [P2 — IN-FOCUS, Residual] Fleisch-Shop-Fallback unvollständig & stil-schief (venison fehlt)
Run 6 setzt den run5-P3-Fix nur für `raw_beef`/`raw_chicken` um. **`raw_venison` bleibt drop-only** —
und Venison ist die Pflicht-Fleischsorte der **ranged/magic**-Gerichte (`duskfin_rangers_stew` L48,
`spellwarden_bisque` L52, `steelshot_bisque` L63). Damit hilft der neue Fallback **faktisch nur dem
Nahkampf** und reproduziert exakt die Stil-Schieflage, die Run 6 auflösen sollte. **Impact:** unterläuft
die Parität auf der Beschaffungsseite — ein Bogen-/Magie-Main bleibt für sein Combo-Food RNG-abhängig,
ein Nahkämpfer nicht. **Fix:** `{ itemId: "raw_venison", cost: ~18 }` zum Shop ergänzen (analog beef/chicken,
Markup über Vendor 8). Einzeiler, schließt die Parität komplett.

### [P2 — Parität, Power-Asymmetrie] Kein ranged/magic-Epic-Pendant zu `witherleek_bouillabaisse` (L75)
Die Parität ist „pro Band vorhanden", aber **nicht gleich stark**. Real:

| Stil | Bestes In-Band-Combo-Food (L58–80) | Rarität | heal | hpRegen | Offensiv |
|---|---|---|---:|---:|---:|
| Nahkampf | witherleek_bouillabaisse **L75** | **epic** | **185** | **7** | +8 melee |
| Fernkampf | steelshot_bisque L63 | superRare | 120 | 4 | +6 ranged |
| Magie | spellflare_tisane L65 | superRare | 120 | 4 | +6 magic |

Nahkampf bekommt im Band ein **Epic** (heal 185 ≈ 15 % maxHp @L75) mit dem höchsten Regen seiner Stufe;
Ranged/Magie toppen bei **superRare** (heal 120 ≈ 11 % @L63/65, hpRegen 4) und erhalten **zwischen L65 und
L90 nichts Neues** (25-Level-Loch), während Nahkampf bei L75 noch ein frisches Gericht nachgeschoben
bekommt. Das beste Mid-Late-Combo-Food bleibt damit ein Nahkampf-Privileg. **Impact:** mittel — die formale
Vorgabe ist erfüllt, aber „bestes Premium-Gericht der Phase nur für 1 Stil" ist genau die Asymmetrie, die
run5 im Kern adressieren wollte. **Fix:** `witherleek_bouillabaisse` zu einem **L75-Epic-Trio** aufbohren
(Ranged-/Magie-Geschwister mit +ranged bzw. +magic, gleichem heal/regen-Niveau) — analog zum L48/L52- und
neuen L63/L65-Paar.

### [P3 — Carryover] Auto-Eat-Tiers differenzieren weiterhin kaum
Unverändert ggü. run5 (T0–T3, healMult bis 1.5). Survival ist schon bei T0 gelöst; der Tier-Nutzen liegt
weiterhin v. a. in **Combo-Food-Vorrats-Schonung** (weniger Bissen/Kampf), nicht in echter Überlebens-
fähigkeit. Liegt primär im Combat-Revier; hier nur als Berührungspunkt. **Fix:** an echten Burst-Druck
koppeln ODER bewusst als „Food-Sparfaktor" framen, damit die 2k/8k/25k-Senke sich belohnend anfühlt.

### [P3 — Balance, minimal] steelshot/spellflare heilen kurventechnisch wie ein L58-Gericht
Beide heilen 120 (≈11 % maxHp @L63/65, interpoliert), liegen damit knapp über dem neutralen
`soulgourd_brisket` (L58, heal 115) und deutlich unter dem L75-Epic (185 ≈15 %). Für L63/65 minimal niedrig
auf der Heilkurve, aber kein Loch — sie sind früher und günstiger als witherleek. Niedrigste Priorität;
würde sich mit dem P2-Epic-Trio-Fix ohnehin erledigen.

---

## Δ zu run5

| Thema | run5-Befund | Run 6 |
|---|---|---|
| Combo-Food-Stil-Parität (ranged/magic L52→L90-Loch) | **P2** (Kernbremse) | **GELÖST** — steelshot L63 (+6 ranged) & spellflare L65 (+6 magic), gold-positiv, korrekt gebufft |
| Combo-Food im L58–80-Band für alle 3 Stile | nur Nahkampf | **alle 3 ✓** (R L63 · M L65 · Nk L75) |
| Fleisch-Shop-Fallback | **P3** (Fleisch ganz ohne Fallback) | **teilweise** — beef/chicken ✓, **venison fehlt → neu [P2]** |
| Power-Parität des Premium-Mid-Gerichts | (implizit in P2) | **neu [P2]** — kein ranged/magic-Epic zu witherleek L75 |
| Heal+Buff-Verdrahtung neuer Gerichte | run5: live verifiziert | generisch, kein dead field (statisch bestätigt) |
| Auto-Eat-Tiers differenzierend | **P2** | unverändert → **[P3]-Carryover** |
| Crop-/Brew-Rezepte gold-positiv | alle ≥ 0 | unberührt; neue Gerichte +65/+109 |

---

## Was fehlt für 9,5?
Wie in run5 prognostiziert („Punkt 1 → ~9,0; 1–3 zusammen → 9,5"). Run 6 hat **Punkt 1 (Paritäts-Gerichte)
geliefert** und **Punkt 2 (Fleisch-Fallback) angefangen** — daher genau **9,0**. Die letzten 0,5 sind zwei
gezielte Ergänzungen + ein Feinschliff, **kein Strukturproblem**:

1. **(P2) `raw_venison`-Shop-Fallback ergänzen.** Ein Einzeiler im Shop (`{ itemId: "raw_venison", cost ~18 }`)
   schließt die Beschaffungs-Schieflage — sonst greift der neue Fallback fast nur für Nahkampf, und die
   frisch erkämpfte Parität bröckelt auf der Zutatenseite.
2. **(P2) Premium-Mid-Combo-Food entkoppeln.** `witherleek_bouillabaisse` (L75) zu einem Epic-**Stil-Trio**
   aufbohren (ranged-/magic-Geschwister, gleiches heal/regen-Niveau), damit das stärkste Mid-Late-Gericht
   nicht 25 Level lang ein Nahkampf-Privileg ist. **Der eigentliche Hebel** für echte (nicht nur formale)
   Parität.
3. **(P3) Auto-Eat-Tiers** an echten Druck koppeln oder klar als „Combo-Food-Sparfaktor" positionieren.

Mit Punkt 1 allein ~9,2; mit 1+2 bei ~9,4; mit 1–3 bei 9,5.

---

## Verdict
**Die Run-6-Hauptvorgabe sitzt:** Combo-Food existiert jetzt für **alle drei Stile im L58–80-Band**
(`steelshot_bisque` L63 ranged, `spellflare_tisane` L65 magic, `witherleek_bouillabaisse` L75 melee), beide
neuen Gerichte sind gold-positiv und heilen+buffen über den identischen generischen Pfad — **kein P0/P1, kein
toter Effekt**. Δ vs run5 **+0,5 → 9,0**. Zwei Residuen halten es unter 9,5, beide direkt an der Parität und
beide klein: der **Fleisch-Fallback ist unvollständig** (Venison — die Ranged/Magie-Fleischsorte — fehlt im
Shop) und das **Premium-Mid-Gericht (witherleek L75, epic) hat kein ranged/magic-Pendant**. Beides ist
Content/Daten, kein Bug: Venison in den Shop, ein L75-Epic-Trio nachziehen — dann gilt „Combo-Food für alle
3 Stile" nicht nur über die Level-Kurve, sondern auch über Beschaffung und Power-Niveau.
