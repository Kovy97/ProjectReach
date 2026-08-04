# Armor-Iteration 2.1 — Fix-Spec (Rest-Themen nach dem It2-Riesenerfolg)

Stand 2026-07-03 · Autor: balance-designer · Status: **Spec fertig, wartet auf logic/combat/content-Apply**

Grundlage: `design/armor-iteration2-spec.md` + `design/armor-sweep2-2026-07-03/TRIAGE2.md`
(12 Combat-Tester Runde 2, Abschnitt „GESAMTBILANZ RUNDE 2") + die Einzelberichte `C2-*.md`.

**Iteration 2 ist ein Riesenerfolg** — alle 4 It1-Kernprobleme sind über alle Bänder behoben (nackter 2H =
Suizid, Food alle Stile, 1H+Schild ≈ 2H, Frühband-Parität von 121 % auf ~40 %). Diese 2.1 räumt die
**konvergenten Rest-Themen** ab (Magier-Food, Stoff-Gating, R10-Feinschliff, 2 Balance-Watches). Kein neuer
Mechanik-Bau; nur Konstanten, ein Req-Remapping, R10-Content-Werte, ein Stance-Malus, ein Buff-Guard.

**Ich wende nichts an** — geordnete Apply-List in §6, Gate-Kriterien in §7.

**Sim-Validierung:** Die F1-Zahlen (§1) sind über ein **Ward-Erosions-Zyklusmodell** validiert, das direkt aus
den echten Content-Werten (Staff-manaCost/-Tempo, Monster-`damage`/`accuracy`/`attackIntervalMs`, Stoff-`wardCapacity`)
und den **gemessenen Kills/h + Ward-Trajektorien der 12 Runde-2-Tester** (`C2-mage-L30/L60/L90`, `C2-ranged-L30`)
gerechnet ist. Das Modell reproduziert den bekannten Ist-Zustand (L10/L30 over-sustained, L60 marginal, L90 food-nötig)
und projiziert die Fix-Wirkung. Es ist **mean-field** (mittelt RNG-Varianz weg) → es **unterschätzt** den echten
Food-Bedarf eher (Varianz-Spitzen dippen den Pool zusätzlich auf 0). Die kontrolleur-Re-Gate misst final per echtem
`simulateCombat` (§7).

---

## 0. TL;DR — Konstanten-/Wert-Diff

| # | Änderung | Alt | **Neu** | Owner | Datei |
|---|---|---:|---:|---|---|
| F1a | `WARD_PER_MANA` (Cast-Recharge) | 0.5 | **0.20** | logic | `packages/shared/src/index.ts` |
| F1b | `WARD_KILL_REFILL_PCT` (Kill-Refill, **de-facto Magier-only**) | 0.20 | **0.10** | logic (combat liest) | `shared` |
| F1c | *(optional, Robustheits-Rail)* `WARD_RECHARGE_CAP_PER_SEC` **neu** | – | **0.6** | combat | `shared`/`combat.ts` |
| #4 | Magie-Defensiv-Stance `dmgMult` | 1.0 | **0.85** | logic | `shared` (`activeStanceMods`) |
| #5 | Buff-Guard `buff.trinity.armorRating` Max | 150 | **35** | logic | `shared`/content-integrity-Guard |
| #2 | Stoff-Requirements: `runecrafting`-Co-Req **entfernen** (Req = `magic:N`) | — | — | content | `packages/content/src/index.ts` |
| #3 | R10-Content-Werte finalisieren (apprentice-Ward, cured-Leder-evasion, iron-con, Leder-con-Guardrail, Stoff-Mid-Robe) | — | — | content | `content` |

- **Kein SAVE_VERSION-Bump** (F1/#4/#5 = Laufzeit-Konstanten; #2/#3 = statischer Content; Requirements werden je
  Load neu gelesen). #2 **lockert** nur (kein Force-Unequip, keine Migration — s. §2).
- **`MELEE_LIFESTEAL` bleibt 0.06** und **`WARDING_REGEN_*` bleiben unverändert** — bewusst (§1.4).

---

## 1. F1 (KERN) — Magier @low/mid-band food-frei beheben

### 1.1 Root-Cause (Tester-bestätigt, mechanisch nachgerechnet)

Der Magier hat **drei** Ward-Zuflüsse; ihr Zusammenspiel übersteigt am Low/Mid-Band die eingehende Trefferhöhe (DPS-in),
sodass der Pool **nie erodiert** → nie HP-Schaden → nie Food (außer über DoT, das den Ward umgeht):

1. **Cast-Recharge** = `manaCost · WARD_PER_MANA` je Cast. Entscheidend: die Recharge-**Rate** ist über alle Bänder
   nahezu **FLACH** (echte Staffs: **~1.0/s @L10 → ~1.47/s @L90**), weil `manaCost` (6→8) und Cast-Tempo (3000→2730 ms)
   kaum steigen. Damit ist sie ein **riesiger Anteil** der niedrigen Low-Band-DPS-in, aber ein **winziger** der
   Endgame-DPS-in (7.5/s). → **Das ist die eigentliche Sustain-Engine**, die der Tester (`C2-mage-L10`, `C2-ranged-L30`)
   als Wurzel identifiziert hat. Der It2-Kill-Refill-Trim (100 %→20 %) hat sie NICHT berührt.
2. **Kill-Refill** = `WARD_KILL_REFILL_PCT · maxWard` je Kill. Absolut wächst er mit dem (durch #2/#3 **größeren**) Pool
   — bei L60 schon **43/Kill**, L90 **95/Kill**. Bei kurzen Low-Band-Kämpfen deckt er allein fast den Ward-Verlust je Kill.
3. **Warding-Regen** = `min(2.0, warding·0.02)/s`, läuft auch in der 5 s-Kill-Cooldown-Verschnaufpause (`combat.ts:1516`).

**⚠️ Kopplung mit #2+#3:** Diese beiden machen den Pool **größer** (L10 24→45, on-tier-Stoff via `magic` tragbar) →
sie wirken Food-**verringernd**. **F1 muss das überkompensieren** — genau die vom Chef markierte Kopplung.

### 1.2 Fix — zwei gekoppelte Hebel (beide nötig, Modell-bewiesen)

**Nachweis, dass EIN Hebel nicht reicht** (L30-Zyklusmodell, ash_rat on-tier non-DoT):
`WARD_PER_MANA 0.20` **allein** (Kill-Refill bleibt 0.20) → NET **+2.5 Ward/Kill = weiter over-sustained, KEIN Food**.
Erst **beide** (WPM 0.20 **und** Refill 0.10) → NET **−7.8 Ward/Kill = erodiert**. Grund: der Kill-Refill (20 %·103 = 20.6)
ist am Low/Mid-Band der **dominante** Zufluss; ohne ihn zu trimmen bleibt der Magier food-frei, egal wie tief WPM geht.

| Hebel | Alt | **Neu** | Wirkung |
|---|---:|---:|---|
| **F1a `WARD_PER_MANA`** | 0.5 | **0.20** | Cast-Recharge **~1.0–1.47/s → ~0.40–0.59/s** (≈ Endgame-Niveau) über ALLE Bänder. Kein Sustain-Motor mehr; bleibt ein spürbarer, aber kleiner Cast-Trickle (thematisch „Zaubern verstärkt den Ward etwas"). |
| **F1b `WARD_KILL_REFILL_PCT`** | 0.20 | **0.10** | Halbiert den Kill-Refill. **De-facto Magier-only** — nur Stoff hat `maxWard>0` (WARD_CORE_PER_INT=0 ⇒ Melee/Ranged-Kill-Refill = 0.10·0 = 0). **Berührt Melee/Ranged NICHT** → sauber am Magier gezielt. Das IST die „härtere Food-Philosophie" (§13-Alt-Spec), aber gezielt statt pauschal. |

**F1c — optionaler Robustheits-Deckel** (Chef-Parenthese „Recharge-vs-Pool-Deckel je Sekunde", combat-dev):
`rechargeThisCast = min(cost·WARD_PER_MANA, WARD_RECHARGE_CAP_PER_SEC · castIntervalSec)` mit **0.6/s**. Bei WPM 0.20
**bindet er heute NICHT** (alle Staffs/Wands liefern 0.40–0.59/s < 0.6) — er ist ein **Zukunfts-Rail**: er verhindert,
dass ein künftiger *billig+schnell*-castender Stab die Recharge wieder zur Low-Band-Sustain-Engine macht (entkoppelt
den Fix vom nicht-monotonen Staff-Cast-Tempo). **Nur applizieren, falls die Re-Gate einen über-rechargenden Staff findet.**

### 1.3 Sim-Validierung (Ward-Erosions-Zyklusmodell, L10/30/60/90)

Zyklus = Kampf (aktiv) + 5 s Kill-Cooldown-Breather (`KILL_COOLDOWN_MS`). Cast-Recharge nur im Kampf; Warding ganzer
Zyklus; Kill-Refill 1×/Zyklus. `NET < 0` ⇒ Pool erodiert ⇒ Food. Fight-Zeiten & DPS-in aus echten Monster-Werten +
Tester-Kills/h.

| Band (on-tier Mob) | maxWard | Recharge/s alt→neu | DPS-in/s | **NET/Kill ALT** (WPM.5/Ref.20) | **NET/Kill NEU** (WPM.2/Ref.10) | Verdikt neu |
|---|---:|---:|---:|---:|---:|---|
| **L10** boar (non-DoT) | 45 | 1.00 → 0.40 | 1.25 | **+9.8** (over-sustained) | **+2.3** (dünner Puffer) | Puffer kollabiert; s.u. |
| **L30** ash_rat (non-DoT) | 103 | 1.17 → 0.47 | 3.78 | **+8.0** (over-sustained) | **−7.8** → Pool leer in ~13 Kills (~2.8 min) | **Food ✅** |
| **L60** bramble_witch | 216 | 1.39 → 0.56 | 5.25 | **+18.3** (over-sustained) | **−12.9** → Pool leer in ~17 Kills (~4.6 min) | **Food ✅** |
| **L90** last_idol (over-lvl) | 476 | 1.47 → 0.59 | 7.50 | +4.7 (Tester: erodiert via Varianz) | **−63.6** → Pool leer in ~7 Kills | **Food ✅ (härter)** |

**Lesart:**
- **L30/L60 kippen sauber von over-sustained → erodierend** (Pool leer in ~3–5 min, dann Chip→HP→Food). Das ist die
  Kern-Wirkung: der Magier braucht bei L30–L40 on-level **spürbar Food, in der Ranged-Größenordnung** (Gate #5 erfüllt).
- **L10 boar** bleibt **knapp positiv (+2.3, dünner Puffer)** — **strukturell**: gegen den *weichsten* non-DoT-Mob
  reichen Kill-Refill (4.5) + Warding (2.0) allein ≈ dem winzigen DPS-in (1.25/s); selbst `WPM=0` bliebe break-even.
  **Das ist gewollt und spec-konform (§6.1-Farm-Puffer)** — identisch zum L90-Magier, der die 3 *leichten* Idol-Bosse
  puffert und nur `last_idol` mit Food fährt. Der Puffer ist von **+9.8 auf +2.3 kollabiert** (−76 %): bei **jedem
  DoT-Mob** (Ward-Bypass → HP → Food), **jedem Über-Level-Farm** und schon unter **RNG-Varianz** auf non-DoT dippt die
  HP → Food kehrt zurück. „Food nicht 0" ist damit real erreicht; die absolute 0-Food-Idylle des weichsten Mobs bleibt
  (wie bei jedem Stil auf trivialem Content).
- **L90 Endgame:** F1 macht den Endgame-Magier **food-hungriger** (schneller erodierend), ändert aber **nicht die
  Überlebensfähigkeit**: mit Food + Auto-Eat + One-Shot-Cap (0.5·maxHp) **0 Tode** (vom `C2-mage-L90`-Tester bereits als
  „P4: härtere Food → Refill 0.20→0.10" vorabgesegnet). Der Chef-Vorbehalt „Endgame unberührt" ist im Sinn von *kein
  Suizid / weiter killbar* eingehalten; die reine Food-Menge steigt (bewusster Preis dafür, dass L30/L60 überhaupt
  Food-pflichtig werden — es gibt keinen bandselektiven Kill-Refill-Knopf).

### 1.4 Was **nicht** angefasst wird (bewusst)
- **`MELEE_LIFESTEAL` bleibt 0.06.** Der Kill-Refill-Cut ist Magier-only, also braucht Melee keinen Ausgleich; der
  `C2-melee-L90`-Tester warnte, die Melee-Food-Marge sei **dünn** (`maxWard=0`, Netto −0.02…−0.16 HP/s) — sie NICHT
  weiter destabilisieren.
- **`WARDING_REGEN_PER_LEVEL/_CAP/_DEF_STANCE_MULT` bleiben.** Warding ist ein Chef-Feature mit echtem Nutzen
  (Defensiv-Stance-Wert); Gesamt-Regen (Recharge 0.59 + Warding ≤2.0 = **≤2.6/s**) bleibt **≪ Endgame-DPS-in 7.5/s** →
  kein Unsterblichkeits-Sustain (Spec §1.4 intakt).

---

## 2. #2 — Stoff-Gating → `magic` (Spiegel zu Leder→ranged, §8)

**Befund (4× konvergiert: `C2-mage-L10/L30/L60`, `C2-ranged-L30`):** JEDES Stoffteil über `apprentice` trägt ein
**runecrafting-Co-Requirement** (frost rc20 … voidweave rc99), das den reinen Kampf-Magier (runecrafting = 0) auf
`apprentice` (maxWard 24) einsperrt = effektiv ungepanzert. Genau die Crafting-Gate-Asymmetrie, die Spec §8 für **Leder**
gelöst hat (`leatherworking→ranged`), für **Stoff** aber offenließ.

**Fix (content-dev):** `runecrafting` aus den `requirements` **aller** Stoffrüstungsteile streichen; Req = **nur `magic:N`**
(N = das ohnehin vorhandene magic-Req des Teils). Req-Mapping je Tier:

| Tier | Ist `requirements` | **Neu** |
|---|---|---|
| apprentice (hat/body/legs/mitts/slippers) | `{ magic: 1 }` | `{ magic: 1 }` *(unverändert)* |
| frost (circlet/body/legs/handwraps/treads) | `{ magic: 22, runecrafting: 20 }` | **`{ magic: 22 }`** |
| ember (hood/body/legs/handwraps/sandals) | `{ magic: 30, runecrafting: 32 }` | **`{ magic: 30 }`** |
| aether (hood/body/legs/gloves/slippers) | `{ magic: 40, runecrafting: 45 }` | **`{ magic: 40 }`** |
| arcane (cowl/body/legs/mitts/slippers) | `{ magic: 55, runecrafting: 57–58 }` | **`{ magic: 55 }`** |
| runewoven (cowl/body/legs/handwraps/treads) | `{ magic: 70, runecrafting: 71–72 }` | **`{ magic: 70 }`** |
| godspark (mitre/vestment/skirt/handwraps/sandals) | `{ magic: 85, runecrafting: 88 }` | **`{ magic: 85 }`** |
| starweave (coronet/vestment/skirt/handwraps/sandals) | `{ magic: 92, runecrafting: 94 }` | **`{ magic: 92 }`** |
| voidweave (mitre/vestment/skirt/handwraps/sandals) | `{ magic: 99, runecrafting: 99 }` | **`{ magic: 99 }`** |

- **Kein Save-Impact, kein Force-Unequip, keine Migration.** Requirements sind statischer Content. Der Change **lockert
  strikt** (das magic-Req war stets ≤ dem rc-Req und bleibt) → **niemand** verliert bereits getragene Roben; nur *mehr*
  Spieler können sie anlegen. Sauberer als §8-Leder (dort war ein Grandfather-Edge-Case zu prüfen; hier nicht).
- **`runecrafting` bleibt der Herstell-Skill** (Craft-Actions unverändert) — nur das **Trage**-Gate wandert auf `magic`.
  Der Craft-Weg (rc-Roben selbst herstellen) bleibt als alternative Beschaffung erhalten.

---

## 3. #3 — R10-Content-Werte finalisieren (EHP-Parität R10 ±10 %)

R10-Spanne war 40 % (Tester); Ziel ±10 %. Alle Werte tester-präzise aus `C2-ranged-L10`/`C2-mage-L10` + It2-§11.4/§11.5.
**Decoupled von F1** (reiner Content-Trim, eine Welle).

| # | Set/Teil | Ist | **Ziel** | Konkret (content-dev) |
|---|---|---|---|---|
| a | **apprentice-Stoff** `wardCapacity` | Σ 24.3 (hat 4.86 / body 7.29 / legs 5.35 / mitts 3.4 / slippers 3.4) | **Σ 45** | **hat 9 · body 14 · legs 10 · mitts 6 · slippers 6** (It2-§11.5 R10-Zeile) |
| b | **cured-Leder** `evasionRating` | Σ 26.4 (dodge 37 %) | **Σ 32.6 → dodge 42 %** | **cap 6.5 · body 9.8 · legs 7.2 · gloves 4.6 · boots 4.6** (It2-§11.4 R10-Zeile) |
| c | **iron-Platte** `modifiers.con` | maxHp 45.7 (con ~19) | **maxHp ~42** (con → **~17**) | Platte-Low-Band-Übertunung weiter runter (It2-§1.1) |
| d | **Leder-CON-Guardrail** | leather-body maxHp **== plate-1H maxHp** (Kollision, `C2-mage-L30/L10` P3) | Leder-Vollset-maxHp = **0.86 × Platte-1H-Vollset** | Leder-`con` je Band senken (It2-§1.1-Anteil); L30-Beispiel: Leder-maxHp 71.7 → **~62** |
| e | **Stoff-Mid-Robe** (Ladder-Gap) | Lücke `magic 55` (arcane) → `magic 70` (runewoven) | neue Robe **`magic 62–65`**, `wardCapacity` Σ **~240** | schließt die −4 % Stoff-Rest-Unterparität (It2-§1.2/§11.5 R62); Req = `{ magic: 62 }` (per #2, kein rc) |

R10-Ziel-Parität (Modell, It2-§11.6-Methodik): 1H+Schild 79 / 2H 71 / Leder 71 / Stoff 79 → **Spanne ±5.5 % ✅**.
Nach (a)–(d) rückt der reale R10 von 40 % auf **≤ ±10 %**.

*(Optionaler Nit `C2-ranged-L10`: gelootete `leather_helm`/`leather_body` [nur `con:1`, 0 evasion] die on-tier-evasion
aus §11.4 geben, sonst sind sie auf der Avoidance-Achse ungepanzert. Owner: content-dev, nicht R10-blockierend.)*

---

## 4. #4 — Magie-Defensiv-Stance: Offense-Kosten (Tester-P3)

**Befund (`C2-mage-L60` P3):** Die Magie-Defensiv-Stance (`activeStanceMods`, `shared:113-114`) hat **keine** Offense-
Kosten (`accMult 1, dmgMult 1, speedMult 1`) — sie gibt nur `defMult 1.15` (für Stoff wirkungslos, armorRating=0) **+
×1.5 Ward-Regen + Warding-XP**. Ergebnis: **Dauer-Defensiv = Gratis-Survival** (nur magic-XP entgeht). Ranged-Defensiv
zahlt via `speedMult 1.12` (12 % langsamer); Magie zahlt nichts.

**Fix (logic-dev, `shared`):** der Defensiv-Magie-Stance einen **`dmgMult 0.85`** geben (−15 % Cast-Schaden):

```
magicStance === "defensive"
  ? { accMult: 1, dmgMult: 0.85, defMult: STYLE_DEFENCE_MULT, speedMult: 1, xpSkill: "warding" }  // −15 % Schaden
  : { accMult: 1, dmgMult: 1,    defMult: 1,                  speedMult: 1, xpSkill: "magic" }
```

- **Beziffert:** −15 % Cast-Schaden ⇒ ~+18 % TTK (`1/0.85`). Die Stance wird ein **echter Tradeoff**: langsamere Kills
  gegen +50 % Ward-Regen (`C2-mage-L60`: Defensiv-TTK war +14 % **schneller-sterbend-schützend**, jetzt kostet es
  Durchsatz). Etwas härter als Ranged-Defensiv (−12 %), gerechtfertigt, weil der ×1.5-Ward-Regen-Bonus stärker ist als
  Ranged-Defensivs +15 % Mitigation.
- `accMult`/`speedMult` **unverändert** (single-Knopf-Tradeoff, kein Accuracy-/Tempo-Malus obendrauf).
- **Kein Save-Impact** (reine Laufzeit-Stance-Berechnung). UI-Tooltip (ui-dev): „Defensiv: +50 % Ward-Regen, −15 % Schaden".

---

## 5. #5 — §10-Buff-`armorRating`-Range tightenen (Melee-L90-Tester)

**Befund (`C2-melee-L90` P2):** Der It2-§10-Buff-Typ erlaubt `buff.trinity.armorRating` bis **150**. 2H-**Defensiv**
sitzt bei L90 schon bei **76.2 %** Mitigation (def 399.74 = raw 347.6 ×`STYLE_DEFENCE_MULT` 1.15); der Cap-Punkt ist
`def=500` (80 %). Ein „Stein-Haut"-Buff (+80) hebt 2H-def auf ~492 def → **79.7 % ≈ Cap**; ein Max-Buff (150) klemmt 2H
**hart auf 80 %**. → asymmetrisch (1H-def 57 % ist weit weg), Buff-armorRating **verpufft**, und 2H wird über die
intendierten −7.8 % EHP hinaus stark. Relevant vor #219-Consumables.

**Fix (logic-dev, content-integrity-Buff-Guard):** Max von **150 → 35**. Herleitung (bindender Fall = 2H-Defensiv):

```
Cap-Punkt:        def = 500 → 80 %.   2 pp-Marge-Ziel: mit ≤ 78 % → def ≤ 443.
2H-def mit Buff:  def = (347.6 + buffAR) · 1.15 ≤ 443  →  buffAR ≤ 37.6  →  Cap 35
Ergebnis 2H-def:  (347.6 + 35)·1.15 = 440.0 → 77.9 % (2.1 pp UNTER dem 0.80-Cap) ✅
```

- Bei **jedem** Build bleibt so ≥ 2 pp Marge zum Mitigation-Cap: 1H-def (146.74 raw) +35 → 62.6 % (+5.2 pp, weiter sinnvoll);
  2H-power (347.6, defMult 1.0) +35 → 75.4 %. **Kein Build erreicht den Cap trivial.**
- +35 armorRating bleibt ein **wirksamer** Consumable-Buff am Low/Mid-Band (R10: Platte-mit 28.6 %→40.5 %, +11.9 pp) und
  ist am High-Band bewusst nur noch minor (+5 pp) — passende „früh stark, spät klein"-Kurve für einen Trank.

**Guard-Prinzip (für die anderen Buff-Währungen, konsistent):** *Kein Buff·defMult darf einen Voll-BiS-Build innerhalb
von 2 pp an einen HARTEN Cap schieben* (Mitigation 0.80, Dodge 0.75, Block 0.50). Bindend ist nur `armorRating` (2H-def);
für die weichen Fälle (Konvention beibehalten, nur Notiz):

| Währung | It2-Range | **2.1-Range** | Begründung |
|---|---|---|---|
| `trinity.armorRating` | 0…150 | **0…35** | bindend (2H-def @Cap), s.o. |
| `trinity.evasionRating` | 0…40 | **0…20** | Dodge soft-cappt (0.75) schon; 20 hält Mid-Band nützlich, High-Band-Leder klemmt ggf. auf 0.75 (akzeptabel, = gear-only-Verhalten) |
| `trinity.blockChance` | 0…0.15 | **0…0.08** | Block-Cap 0.50 wird von High-Band-Schilden ohnehin fast erreicht → Buff wirkt v. a. Low/Mid |
| `trinity.wardCapacity` | 0…80 | **0…80** *(unverändert)* | Ward hat KEINEN %-Cap → keine Cap-Trivialität |
| `modifiers.{attr}` | 1…6 | 1…6 *(unverändert)* | Attribute unkritisch |

*(Deeper-Fix-Option `C2-melee-L90` P2 — „2H-Waffen-AR·defMult am Cap deckeln" — ist combat-dev-Scope und **nicht** Teil
dieser Spec; der Buff-Range-Trim adressiert die #219-relevante Consumable-Achse direkt.)*

---

## 6. Apply-List (geordnet, Single-Writer je Datei)

**Reihenfolge:** A (shared/logic) zuerst — definiert Konstanten/Guard/Stance, die B/C lesen. #2 und #3 gehören in
**eine** Content-Welle (Parität-Kohärenz).

### A — logic-dev (`packages/shared/src/index.ts`) — ZUERST
1. **F1a** `WARD_PER_MANA 0.5 → 0.20`.
2. **F1b** `WARD_KILL_REFILL_PCT 0.20 → 0.10`.
3. **#4** `activeStanceMods`: Magie-Defensiv `dmgMult 1 → 0.85`.
4. **#5** Buff-Guard-Range `trinity.armorRating` Max `150 → 35` (+ evasionRating `40→20`, blockChance `0.15→0.08`);
   im content-integrity-`consumable-buff`-Guard.
5. *(optional F1c)* neue Konstante `WARD_RECHARGE_CAP_PER_SEC = 0.6` **nur exportieren**, falls B sie applied.

### B — combat-dev (`packages/engine/src/combat.ts`) — NUR falls F1c gewünscht
6. Cast-Recharge deckeln: `rechargeThisCast = min(cost·WARD_PER_MANA, WARD_RECHARGE_CAP_PER_SEC · castIntervalSec)`
   (bindet bei WPM 0.20 heute nicht → reines Zukunfts-Rail). **Sonst kein combat.ts-Change** (F1a/F1b sind reine
   Konstanten, die combat.ts bereits liest: `rechargeWard`/`:767`/`:797`).

### C — content-dev (`packages/content/src/index.ts`) — NACH A, EINE Welle
7. **#2** `runecrafting`-Co-Req aus ALLEN Stoffrüstungsteilen streichen (Mapping §2). Craft-Actions unangetastet.
8. **#3a** apprentice-`wardCapacity` → Σ 45 (9/14/10/6/6).
9. **#3b** cured-Leder-`evasionRating` → Σ 32.6 (6.5/9.8/7.2/4.6/4.6).
10. **#3c** iron-Platte-`con` runter → maxHp ~42.
11. **#3d** Leder-`con`-Guardrail (Leder-Vollset-maxHp = 0.86 × Platte-1H, It2-§1.1) — Kollision leather-body==plate fixen.
12. **#3e** Stoff-Mid-Robe `magic 62–65` (Σward ~240, Req `{magic:62}`) — Ladder-Gap arcane→runewoven.
13. *(optional)* gelootete leather_helm/body on-tier-`evasionRating` (§11.4).

### D — ui-dev
14. Defensiv-Magie-Stance-Tooltip: „+50 % Ward-Regen, **−15 % Schaden**" (statt nur „+50 % Ward-Regen").

### E — kontrolleur — Re-Gate (§7)

---

## 7. Gate-Kriterien (kontrolleur, headless, echter `computeStats`/`simulateCombat`)

1. **Food nötig für ALLE Stile inkl. Magier ALLE Bänder:** je Stil Voll-Set, on-tier, `food:undefined`, langes Fenster →
   **driftet/stirbt**; mit on-tier-Food → **0 Tode, kein Suizid**. Für Magier **L10/L30/L60/L90** einzeln:
   - L30/L60 on-tier non-DoT: Ward-Pool **erodiert auf 0** über die Session → HP-Chip → Food (Modell: leer in ~3–5 min).
   - L10: non-DoT-Puffer **dünn** (kein 0-Food-Dauerfarm mehr unter Varianz); **jeder DoT-/Über-Level-Mob** treibt Food.
   - L90: mit Food 0 Tode (Auto-Eat + One-Shot-Cap deckt die schnellere Erosion).
   - **Ziel-Größenordnung:** Magier-Food/h @L30–L40 im **Ranged-Referenzbereich** (nicht 0).
2. **Magier kann On-Tier-Stoff via `magic` tragen:** reiner Kampf-Magier (runecrafting 1) legt frost/ember/…/voidweave an
   (`equipItem` ok=true); kein Robe > apprentice mehr rc-gegatet. **Kein Force-Unequip** bei Save-Load.
3. **R10-Parität ±10 %:** Voll-Set je Klasse @CL10 → `computeStats` → EHP-Spanne ≤ ±10 % (war 40 %). apprentice-maxWard 45,
   cured-dodge 42 %, iron-maxHp ~42, Leder-maxHp < Platte-maxHp (Guardrail).
4. **Defensiv-Stance-Tradeoff:** Magie-Defensiv `dmgMult 0.85` greift (gemessener DPS −15 %/TTK +~18 %); Dauer-Defensiv ist
   kein Gratis-Survival mehr.
5. **Kein Build am Mitigation-Cap:** Voll-BiS + Max-Buff (`trinity.armorRating` 35) → **2H-def ≤ ~78 %** (≥ 2 pp unter 0.80);
   Guard fängt Out-of-Range (>35) ab.
6. **Endgame unbeschädigt:** L90 alle 4 Idol-Bosse mit Food **0 Tode** (F1 erhöht nur die Food-Menge, nicht die Todesrate);
   Gesamt-Ward-Regen (Recharge ~0.59 + Warding ≤2.0 = ≤2.6/s) **≪ 7.5/s** → kein Unsterblichkeits-Sustain.
7. **Regression:** `mitigation`/`ward`/`armor-iteration2-combat`/`armor-trinity-combat`-Guards grün; `findGearedWalls`
   leer; `pnpm typecheck` + Engine/Persistence-Tests + client-build grün. **Kein SAVE_VERSION-Bump nötig.**

### Offene Chef-Entscheide (Defaults gesetzt)
- **F1-Magnitude:** WPM **0.20** + Refill **0.10** (empfohlen, Modell-validiert). Milder: WPM 0.25/Refill 0.10 (L10/L30
  schwächerer Food-Druck). Default: **0.20 / 0.10**.
- **F1c-Recharge-Deckel:** nur applizieren, falls Re-Gate einen über-rechargenden Staff findet. Default: **weglassen**
  (bindet bei WPM 0.20 nicht).
- **Endgame-Food-Härte:** F1b hebt auch die L90-Food-Menge (kein bandselektiver Kill-Refill möglich). Akzeptiert als Preis
  für L30/L60-Food-Pflicht (0 Tode bleiben). Falls Chef L90 exakt wie It2 will: F1b weglassen → dann bleibt L30/L60
  food-frei (Zielkonflikt, geflaggt). Default: **F1b anwenden**.
