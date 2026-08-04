# Rüstungs-Trinität — Phase-C2 Combat-Tester (Iteration 2) · STIL=MAGIC · BAND=L60

Datum 2026-07-03 · Tester: kontrolleur · 100 % Kampf, Spielzeit-Sicht · READ-ONLY (Wegwerf-Harness `_tmp_c2G60_sweep`, gelöscht)
Specs: `design/armor-iteration2-spec.md`, Vergleich `design/armor-sweep-2026-07-03/C-mage-L60.md`. Headless, seeded, kein Electron.
Iteration-2-Apply verifiziert: SAVE_VERSION 51, alle §0.1-Konstanten gesetzt, Skill-Rename `magic_off→magic`/`magic_def→warding`,
WARD_CORE_PER_INT=0, Warding-Ward-Regen, 20 %-Kill-Refill, Leder-Floor, 2H-plateWorn-Kopplung. Guard-Tests grün
(armor-iteration2-combat 8/8, armor-trinity-combat 8/8, mitigation, magic-loop, mana-shield, magic-def-xp — 39/39).

## Loadout (on-tier L60, unverändert ggü. It1)
- **Waffe:** `runite_staff` (magic 60, 2H, manaCost 8, dmg 5.0–7.4, 2880 ms) — exakt on-tier.
- **Stoff:** `arcane`-Set 5-teilig (magic 55 / **runecrafting 57–58**). Höchste bei magic 60 tragbare Robe;
  nächste Stufe `runewoven` verlangt magic 70 → **Stoff-Ladder-Lücke magic 55→70 besteht weiter** (It1-P4b, s. F4).
- **Food:** `spellwarden_bisque` (heal 9). **Skills:** magic 60, warding 60, runecrafting 60, defence 60, vitality 60 → combatLevel 60.
- **Gegner:** on-tier `bramble_witch` (L60, dmg 21, def 30 [×10], acc 12, 3200 ms, poison-inflict); +2 `rootling_treemonster` (L62, enrage 0.3→×1.5).

## Abgeleitete L60-Magier-Stats (armored, offensiv)
| int | con | wis | maxHp | maxWard | maxMana | maxHit | manaRegen | Ward-Regen off / def |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 41 | 34 | 16 | 90.7 | **216** | 504 | 28.9 | 7.9/s | **1.20/s → 1.80/s (×1.50)** |

`armorRating=0 dodge=0 block=0` (korrekt — Stoff trägt nur Ward). **maxWard = Σ wardCapacity (216), KEIN INT-Kern mehr**
(It1: 182 = int·1 + 141). Der frühere „Ward-INT-Leak" ist zu — Ward kommt jetzt ausschließlich aus dem Stoffgear.

---

## (Q1) Ward-Loop-Sustain — armored + food vs bramble (60 min, 3 Seeds)
| seed | kills/h | deaths/h | wardAvg | wardMin | wardEmpty% | hpMin | manaMin | food/h |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 217 | **0** | 202/216 (94 %) | 129 | 0 % | 45 | 496 | **1** |
| 2 | 214 | 0 | 200/216 | 125 | 0 % | 45 | 496 | 1 |
| 3 | 217 | 0 | 201/216 | 127 | 0 % | 45 | 496 | 1 |

Sustain vollständig: Mana kollabiert nie (Regen 7.9 ≫ Drain 2.9/s), Ward lädt über Cast-Recharge (1.45/s) + Warding
(1.2/s) + 20 %-Kill-Refill → bleibt bei ~94 %. **Food-Verbrauch on-tier fast null (1/h)** — die HP wird kaum berührt.

## (Q2 / It1-#4) Unarmored = Suizid? — JA, schärfer als It1
Nackt (nur Stab): maxHp **58.7**, **maxWard 0** (It1: 18 via INT-Kern), kein dodge/block/mitigation.

| Maß | nackt | armored | Faktor |
|---|---:|---:|---:|
| Immortal-Dummy-TTK (bramble, no food) | **14.1 s** (10–26) | 96.9 s (83–122) | **×6.9 EHP** |
| 1 h Farm nackt + food | **132 deaths/h**, 871 food/h, hpMin 0 | 0 deaths | — |

Nackt ist idle-untauglich (Dauertod). **Suizid bestätigt — deutlicher als It1** (nackte TTK 14 s vs It1 20 s), weil der
INT-Kern-Ward (18) weg ist: der nackte Magier hat jetzt 0 Puffer.

## (Q3 / It1-#1) Food nötig? — JA für 0-Tod; on-tier weich, aber Über-Level jetzt food-abhängig
| Szenario | deaths/h | wardAvg | wardMin | food/h | hpMin |
|---|---:|---:|---:|---:|---:|
| armored + food (on-tier) | 0 | 202/216 | 125 | 1 | 45 |
| **armored + NO food (on-tier)** | **5–6** | 200/216 | 102 | 0 | 0 |
| armored + food vs **+2** (rootling L62) | 0 | 57–69/216 | **0** | **38–63** | 18–36 |

- Ohne Food stirbt der Magier on-tier ~5–6×/h → **Food ist für 0-Tod-Play nötig** (deckt It1-Marke 5.3).
- **Aber der 20 %-Kill-Refill erodiert den Pool on-tier NICHT** (wardAvg bleibt ~94 %, wardEmpty 0 %) — die Tode
  kommen aus RNG-Spitzen (Poison-Stacks + Treffer-Serien), nicht aus systematischer Pool-Erosion. Der in Spec §6.1
  intendierte „Pool erodiert über Kills → HP → Food"-Mechanismus ist gegen den schwachen on-tier-Mob **inert**.
- **Über-Level (+2) ist die eigentliche Iteration-2-Verbesserung:** dort erodiert der Pool auf **wardMin 0** und der
  Magier isst **38–63 food/h** — in It1 war exakt dieses Szenario „0 Food, Ward nie leer" (100 %-Voll-Reset). Der
  Wechsel 100 %→20 %-Refill hat Über-Level-Farm klar food-abhängig gemacht. ✅ funktioniert wie gewünscht.

## (Q4 / It1-#3) Stil-Parität L60 — analytische EHP (§11.6-Methode)
Voll-Sets, combatLevel 60, `computeStats` → EHP. Platte `maxHp/[(1−mit)(1−block·0.85)]`, 2H `maxHp/(1−mit)`,
Leder `maxHp/[(1−dodge)(1−0.12)]`, Stoff `maxHp+maxWard`.

| Stil | maxHp | mit % | block % | dodge % | maxWard | **EHP** | Abw. v. Ø |
|---|---:|---:|---:|---:|---:|---:|---:|
| Platte 1H+Schild | 123 | 46 | 39 | — | — | **337** | +6 % |
| Platte 2H | 107 | 64 | — | — | — | 293 | −8 % |
| Leder (ironhide) | 103 | — | — | 65 | — | 337 | +6 % |
| **Stoff (arcane)** | 91 | — | — | — | 216 | **307** | **−4 %** |

Ø 318. **Alle vier Stile innerhalb ±10 %** (Spanne 6 %/−8 %). Die It1-Doppelverfehlung ist behoben:
- **Platte-L60-Übertunung weg:** It1 Platte 333 = **+14 %**, jetzt +6 % (flat-mit(60) 0.416 statt 0.50 gegriffen).
- **Stoff-Unterparität halbiert:** It1 Stoff −6 %/−18 % ggü. Platte, jetzt −4 % / **−9 % ggü. Platte-1H** (war −18 %).
- **Rest-Delta bei Stoff (−4 %) hat DIESELBE Wurzel wie It1-P4b:** arcane ist eine magic-55-Robe (maxWard 216); ein
  echtes R60-Ziel wäre maxWard 242 (§11.5) → Stoff-EHP 333 ≈ Platte. Die Ladder-Lücke drückt Stoff leicht unter Ziel.
- **Model-Absolutwerte (§11.6: 362/326/369/348) werden ~10 % unterschritten** (337/293/337/307) — die relative Parität
  stimmt, das Papiermodell ist optimistischer als der Ist-Content (v. a. weil die on-tier-Sets 2–5 Level unter R60 liegen).
  Kein Blocker; nur Hinweis, dass die §11.6-Zahlen ~+10 % über dem Live-Stand liegen.

**Feel-Parität (Immortal-Dummy-TTK bramble, no food, 5 Seeds):**
| Stil | TTK Ø | Spanne |
|---|---:|---:|
| Platte 1H | 83 s | 67–112 |
| Platte 2H | 80 s | 67–96 |
| **Stoff (armored)** | **97 s** | 83–122 |
| Leder | 123 s | 67–237 |

Im Sustained-Fight liegt **Stoff (97 s) über Platte (80–83 s)** — der Cast-Recharge + Warding-Regen geben Stoff
kontinuierlichen Sustain, den Platte/Leder nicht haben. Die intendierte „Platte = tankigst"-Ordnung ist im langen Kampf
weiterhin leicht invertiert (It1-P3c, unverändert). Leder ist high-variance-tankig (Dodge), aber das ist high-band-gewollt.

## (Q5) +2 Over-Level (rootling L62) — sicher, aber nicht mehr food-frei
127–130 kills/h, **0 deaths**, wardMin 0, hpMin 18–36, **38–63 food/h**. Der Ward-Pool wird voll aufgezehrt und das
HP-Polster getestet, aber Recharge+Food halten den Magier über Wasser. Kein Trivial-Farm mehr (It1: 0 Food, HP unberührt).

---

## Findings (P1 = Blocker … P4 = Politur)

**P1 — keine.** Keine Crashes, keine Engine-Bugs in der Trinität-Mechanik. Ward-Regen-Tick (`combat.ts:1436`), Leder-Floor
(`:1661`), 20 %-Kill-Refill (`:767/797`), Warding-XP bei Absorb (`:1679`), 2H-`plateWorn/4`-Kopplung (`character.ts:347`),
diminishing Dodge (`:354`), `maxWard = Σ wardCapacity` (`:358`, WARD_CORE_PER_INT=0) — alle spec-konform verdrahtet und
in combat gelesen. Guard-Tests grün (39/39).

**It1-Vergleich (die vier Auftragsfragen):**
1. **Food jetzt nötig (Ward-Refill 20 %)?** — **Teilweise/kontextabhängig.** On-tier: nötig für 0-Tod (5–6 deaths/h ohne),
   aber Verbrauch minimal (1 food/h) und der Pool erodiert NICHT (bleibt ~94 %). Über-Level (+2): jetzt klar food-abhängig
   (38–63 food/h, Ward→0) — das ist die echte Verbesserung ggü. It1 (dort 0 Food/Ward-nie-leer). Der 20 %-Refill wirkt,
   aber erst wenn der Mob stark genug ist, mehr Ward zu ziehen als Refill+Recharge zurückgeben.
2. **Warding löst „Defensiv-Stance nutzlos"?** — **JA, spürbar.** `wardRegenPerSec` 1.20→**1.80/s (×1.5)** in Defensiv
   verifiziert (computeStats). Nutzen: Sustained-Fight-TTK **+14 %** (offensiv 97 s → defensiv 111 s), höherer Ward-Boden
   im No-Food-Farm (wardMin 116/125/102 → 132/137/115). Die It1-P4a-„0 Nutzen"-Beschwerde ist behoben (s. aber F3).
3. **Stil-Parität L60 (beide korrigiert)?** — **JA.** Platte-Übertunung +14 %→+6 %, Stoff −18 %→−9 % ggü. Platte; alle vier
   Stile ±10 %. Rest-Delta (−4 % Stoff) = die fortbestehende Ladder-Lücke (F4), kein Tuning-Fehler.
4. **unarmored = Suizid?** — **JA, schärfer** (naked-TTK 14 s vs It1 20 s; naked maxWard jetzt 0). 132 deaths/h nackt+food.

**P2 — Rest-Stoff-Unterparität (−4 %) via Stoff-Ladder-Lücke magic 55→70.** `content-dev` / `balance-designer`.
Spec §1.2 wollte die 58→70-Lücke füllen (Zwischen-Robe magic ~62–65); **im Content ist keine solche Robe angelegt** —
Stoff-Körperrüstung springt weiter von `arcane` (magic 55, maxWard 216) auf `runewoven` (magic 70). Der on-tier-L60-Magier
trägt damit eine magic-55-Robe (5 Level unter Tier), was die −4 %-EHP-Rest-Lücke exakt erklärt (R60-Ziel wäre maxWard 242).
Identisch zu It1-P4b, nur kleinere Auswirkung. Nicht release-kritisch, aber die Zwischen-Robe schließt die Parität sauber.

**P3 — Defensiv-Magie-Stance hat KEINE Offense-Kosten → „Gratis-Survival".** `balance-designer` / `combat-dev` (Tuning/Design).
`activeStanceMods` (shared:110-115) gibt der Magie-Defensiv-Stance `accMult 1, dmgMult 1, speedMult 1` — identisch zu
Offensiv; der einzige Unterschied ist `defMult` (wirkt für Stoff nicht, armorRating=0) + Warding-XP-Route + ×1.5 Ward-Regen.
Ergebnis: ein Stoff-Magier kann **dauerhaft in Defensiv-Stance** stehen und verliert dabei NUR magic-XP (kein Sofort-DPS).
Damit ist die Stance-Wahl kein echter Offense/Defense-Tradeoff mehr, sondern „mehr Survival praktisch umsonst". Melee/Ranged
zahlen für ihre Defensiv-Stance i. d. R. mit acc/dmg — Magie nicht. Chef-Entscheid: entweder bewusst so (Warding-Identität)
oder Defensiv-Magie einen kleinen dmgMult-Malus geben, damit die Stance ein Tradeoff bleibt.

**P4 — Sustained-Fight-Inversion (Stoff ≳ Platte) besteht (It1-P3c, milder).** `balance-designer`.
Stoff-TTK (97 s) > Platte (80–83 s) im Boss-artigen Dauerkampf, weil Recharge+Warding kontinuierlich sustainen. Die
nominale EHP-Parität ist erfüllt (Q4), aber die „Platte = tankigst"-Erwartung kippt im langen Fight. Weniger extrem als It1
(damals 104 vs 92 s). Reine Tuning-Beobachtung; ggf. Recharge-/Warding-Rate minimal senken, falls die Ordnung wichtig ist.

**Gate-C-#2 (Auftrags-Hinweis) — Stoff via reinem `magic`-Level NICHT tragbar.** `balance-designer` / `content-dev` (Chef-Entscheid).
Ein reiner Kampf-Magier (levelt nur `magic`, runecrafting 1) kann **KEINE Stoffrüstung über `apprentice` (magic 1)** anlegen.
Alle mittleren/hohen Roben tragen einen **runecrafting-Co-Req, der 2–3 Level ÜBER dem magic-Req liegt** (bindende Schranke):

| Robe | magic-Req | runecrafting-Co-Req | pure-magic (rc 1) tragbar? |
|---|---:|---:|:--|
| apprentice | 1 | – | ✅ |
| frost | 22 | 20 | ❌ |
| aether | 40 | 45 | ❌ |
| **arcane (on-tier L60)** | 55 | **58** | ❌ |
| runewoven | 70 | 72 | ❌ |

Das ist **dieselbe Asymmetrie, die Spec §8 für Leder GELÖST hat** (leatherworking→ranged umgegatet, damit ein reiner
Schütze seine Dodge-Schicht durchs Kämpfen freischaltet). Für Stoff wurde §8 NICHT gezogen: Melee trägt Platte via `defence`
(Kampf-Skill), Ranged trägt Leder via `ranged` (nach §8), aber Magier braucht **`runecrafting` (Sammel-/Crafting-Skill)**
für seine Ward-Schicht. `runecrafting` trainiert zwar `int` (thematisch mage-nah) und die It1/It2-Loadouts enthielten es —
aber ein Spieler, der 100 % kämpft, hat es nicht und steckt in apprentice-Roben (maxWard 7) fest = effektiv ungepanzert
(→ Suizid, Q2). **Chef-Entscheid nötig:** Stoff analog §8 auf `magic` umgaten (Empfehlung, Symmetrie zu Platte/Leder),
ODER `runecrafting` bewusst als Magier-Pflicht-Co-Skill bestätigen (dann sicherstellen, dass es früh/trivial mitläuft).

**Bekannte Deferrals (kein Bug):** `defenseType`-Tag weiter nirgends in der Engine gelesen (Konter-Achse = Waffen-Spec-Scope,
It1-P4c). Buff-Typ-Erweiterung (§10) ist sauber verdrahtet UND von echten Consumables befüllt (glyph_of_the_bulwark,
tonic_stoneskin/keeneye, elixir_warding) + Range-Guard in content-integrity — kein totes Feld. (`buff.modifiers`-Attribut-
Buffs sind derzeit von keinem Consumable genutzt — content-Lücke, nicht mein Band-Scope.)

## Gesamt-Empfehlung: **ship (mit Balance-Nachträgen)**
Die vier harten Constraints sind erfüllt: Sustain ✅, Unarmored=Suizid ✅ (schärfer), Food-nötig ✅ (on-tier weich,
Über-Level hart), +2-sicher ✅. Die zwei Chef-Features wirken mechanisch sauber: **Warding-Ward-Regen + Defensiv-Stance
haben jetzt echten, messbaren Nutzen** (It1-P4a behoben) und die **Stil-Parität ist bei L60 auf ±10 % korrigiert**
(It1 Platte +14 % / Stoff −18 % → jetzt +6 % / −9 %). Kein P1-Blocker.

**Vor dem finalen Pass anzusehen (balance-designer/content-dev, nicht EA-blockierend):**
- **Gate-C-#2 (Stoff-Gating)** — Chef-Entscheid: runecrafting-Co-Req behalten oder analog §8 auf `magic` umgaten. **Die
  wichtigste offene Frage** — sie entscheidet, ob ein reiner Kampf-Magier überhaupt jenseits von apprentice existieren kann.
- **P2** — Zwischen-Robe magic ~62–65 (schließt die letzten −4 % Stoff-Parität; Spec-§1.2-Offenpunkt).
- **P3** — Defensiv-Magie-Stance Offense-Kosten geben oder bewusst als kostenlos bestätigen.
- **P4** — optionale minimale Senkung der Ward-Recharge/Warding-Rate, falls „Platte = tankigst" im Sustained-Fight zählt.
