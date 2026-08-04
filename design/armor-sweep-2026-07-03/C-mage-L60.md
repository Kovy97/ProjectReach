# Rüstungs-Trinität — Phase-C Combat-Tester · STIL=MAGIC · BAND=L60

Datum 2026-07-03 · Tester: kontrolleur · 100 % Kampf, Spielzeit-Sicht · READ-ONLY (Wegwerf-Harness, gelöscht)
Spec: `design/armor-trinity-spec.md`. Headless, seeded, kein Electron.

## Loadout (on-tier L60)
- **Waffe:** `runite_staff` (magic_off 60, 2H, manaCost 8, dmg 5.0–7.4, 2880 ms) — exakt on-tier.
- **Stoff:** `arcane`-Set 5-teilig (`arcane_robe_body/cowl/robe_legs/mitts/slippers`, magic_off 55 / runecrafting 57–58).
  Das ist die HÖCHSTE bei magic_off 60 tragbare Robe — die nächste Stufe (`runewoven`) verlangt magic_off 70.
  Der Magier trägt also on-tier eine ~2–5 Level UNTER-Tier-Robe (siehe P2/P4).
- **Food:** `spellwarden_bisque` (heal 9 → 3.0 HP/s @ 3 s-CD, deckt Spec §7.2 Band-60).
- **Skills:** magic_off 60, magic_def 60, runecrafting 60, defence 60, vitality 60 → **combatLevel 60**.
- **Gegner:** on-tier `bramble_witch` (L60, dmg 21, def 3, hp 85, acc 12, 3200 ms, poison-inflict);
  +2 `rootling_treemonster` (L62, dmg 22, def 5, hp 166, 4000 ms, enrage 0.3→×1.5).

## Abgeleitete L60-Magier-Stats
| int | con | wis | maxHp | maxWard | maxMana | maxHit | manaRegen/s | Cast-Kosten/-Takt | Ward-Recharge/s |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 41 | 34 | 16 | 91 | 182 | 504 | 28.9 | 7.9 | 8 / 2.76 s | 1.45 |

dodge=0, block=0, armorRating=0 (korrekt — Stoff trägt nur Ward). maxWard = int·1 + Σ wardCapacity(141) = 182.

---

## (1) Ward-Loop-Sustain? — JA, robust (eher zu robust)
1 h on-tier Farm, armored+food vs bramble (3 Seeds):

| kills/h | deaths/h | wardAvg | wardMin | wardEmpty% | manaMin/max | Food/h |
|---:|---:|---:|---:|---:|---:|---:|
| 216 | **0** | 167/182 (92 %) | 78 | 0 % | 496/504 | 16 |

- **Mana kollabiert nie:** Regen 7.9/s ≫ Cast-Drain 2.9/s (Cost 8 / 2.76 s) → **+5/s Überschuss** →
  manaMin bleibt bei 496/504. Der Magier castet JEDEN Schlag → Ward lädt durchgehend 1.45/s (`combat.ts:1094`).
- **Ward füllt zusätzlich per Kill komplett auf** (`combat.ts:760/785`, Respawn/neue Welle) — bei 216 Kills/h
  (~alle 17 s) ist DAS der dominante Top-up; der 1.45/s-Recharge ist sekundär, aber stetig.
- Ergebnis: Ward = quasi-permanenter zweiter HP-Balken. Sustain vollständig gegeben.
- **Kehrseite (→ P3):** das im Spec §1.4/§11.1 vorgesehene Druckventil „Mana leer → kein Recharge → Weak-Melee"
  triggert bei einem sauber gebauten L60-Magier NIE (Mana-Überschuss). Das gewollte Sustain-Risiko ist inert.

## (2) Unarmored = Suizid? — JA
Nackt (Robe ab, nur Stab): maxHp 59, **maxWard nur 18** (INT-Kern), kein dodge/block/mitigation.

| Szenario | Wert |
|---|---|
| Immortal-Dummy-TTK nackt (no food) | **20.3 s** Ø (12.8–38.4), armored 104 s → **~5× EHP durch Rüstung** |
| 1 h Farm nackt+food | **27 deaths/h** (armored 0), wardEmpty 22 %, hpMin 0, **792 Food/h** verzehrt |

- Roh-TTK-Minimum 12.8 s ≈ 4 Treffer — deckt sich mit Spec §7.1 „unarmored ~9 s / 3 Treffer".
- Nackt ist idle-untauglich (ständiges Sterben/Essen). Suizid bestätigt.
- Nuance: der INT-Kern-Ward (18) gibt dem nackten Magier einen Mini-Puffer, den nackter Melee/Ranged nicht hat —
  aber er reicht nicht (immer noch 27 deaths/h).

## (3) Food nötig? — JA, aber der Druck ist SEHR weich (Stoff ist der food-unabhängigste Stil)
| Szenario | deaths/h | hpMin | hpAvg | Food/h |
|---|---:|---:|---:|---:|
| armored + food (A) | 0 | 45 | 57 | 16 |
| **armored + NO food (C)** | **5.3** | 0 | 47 | 0 |
| armored + food vs +2 (D) | 0 | 91 | 91 | **0** |

- Ohne Food stirbt der Magier ~5×/h → Food ist für 0-Tod-Play nötig. **Aber:** der Ward-Layer (avg 166, nie leer)
  + Per-Kill-Refill lassen die HP nur langsam erodieren → 5 deaths/h statt Dauertod. Gegen den +2-Gegner wurde
  **0 Food** verzehrt (Ward+Recharge deckten ALLES, HP unberührt).
- → Food ist nötig, aber der on-tier-Food-Druck für Stoff ist deutlich weicher als die Spec-§7.2-Marge (die aus
  1H+Schild-Platten-DPS-in abgeleitet ist). Für Stoff grenzt on-tier-Food an optional. (→ P3)

## (4) Stil-Parität L60 — nominal −12 % (wie behauptet), im GEFÜHL geschlossen (eher über-geschlossen)
**Analytische EHP (Spec §7.3-Methode, volle on-tier-Sets, combatLevel 60):**

| Stil | maxHp | Mitigation | Block | Dodge | maxWard | **EHP** |
|---|---:|---:|---:|---:|---:|---:|
| Platte (runite +Schild) | 123 | 50 % | 35 % | — | — | **333** |
| Leder (ironhide/studded ≤60) | 99 | — | — | 65 % | — | **286** |
| **Stoff (arcane)** | 91 | — | — | — | 182 | **273 (Steh)** |

- Stoff vs 2-Stil-Ø (309): **−12 %** → deckt Spec-Behauptung „Stoff −13 %".
- Stoff vs Leder: −4 %. **Stoff vs Platte: −18 %** (Platte ist bei L60 der klare Tank).

**Schließt der Ward-Recharge die Lücke im Gefühl?**
Effektive-EHP-Messung = TTK-Sek gegen immortalen Dummy (no food, kein Kill-Refill, Sustained-Fight = Boss-artig, 5 Seeds):

| Stil | TTK Ø (s) | Spanne |
|---|---:|---:|
| Platte | 91.5 | 86–108 |
| **Stoff (armored)** | **104.2** | 51–178 |
| Leder | 60.5 | 32–108 |
| Stoff (nackt) | 20.3 | 13–38 |

- Im Sustained-Fight hebt der kontinuierliche Recharge (mana-getragen, 1.45/s über die ganze Dauer) Stoffs
  EFFEKTIVE Überlebenszeit auf **≈ Platte** (104 vs 92 s) und klar über Leder — die nominalen −12 %/−18 % sind weg.
- Im FARM (Per-Kill-Refill) bleibt Ward ~92 % voll → der Magier spürt die Lücke subjektiv nie (0 deaths, 216 kills/h).
- **Verdikt:** JA, Recharge + Per-Kill-Refill schließen die Lücke im Gefühl — im Sustained-Fight sogar ÜBER
  (Stoff ≳ Platte), was die intendierte „Platte = tankigster"-Ordnung leicht invertiert (→ P3). Der Magier fühlt
  sich bei L60 nie squishy; wenn überhaupt ist er der verzeihendste Stil zu spielen.
- **ABER die nominale Parität (Spec §4.4-Ziel: Platte≈Stoff≈292) wird verfehlt:** live ist Platte 333 (+14 % über
  Ziel), Stoff 273 (−6 %), Leder 286 (−7 %). Der −18 %-Abstand Stoff↔Platte ist real (Spec wollte ~0 %). (→ P2)

## (5) L60+2 (rootling_treemonster L62) — trivial sicher
| kills/h | deaths/h | wardAvg | wardMin | **hpMin** | Food/h | Immortal-TTK armored |
|---:|---:|---:|---:|---:|---:|---:|
| 127 | **0** | 151 | 26 | **91 (unberührt)** | 0 | 243 s |

- Der Ward-Pool + Recharge absorbieren die Über-Level-DPS komplett: **HP fiel keine einzige Sekunde unter Voll (91)**,
  0 Food verzehrt, 0 Tode. Over-Leveling um 2 ist für den on-tier-Stoff-Magier keine Bedrohung („Farm-Zone").
- Kill-Durchsatz sinkt ggü. on-tier (127 vs 216/h) nur wegen der höheren Tree-HP (166) + Enrage, nicht wegen Gefahr.

---

## Findings (P1 = Blocker … P4 = Politur)

**P1 — keine.** Keine Crashes, keine Engine-Bugs in der Trinität-Mechanik. Ward-Absorb (`combat.ts:1628`),
Recharge-beim-Cast (`:1094`), Per-Kill-/Start-Refill (`:760/785/244`), One-Shot-Cap (`:1626`) und die
Reihenfolge Dodge→Contest→Mitigation→Block→Cap→Ward (§1.5) verhalten sich exakt spec-konform. Alle vier
Klassen-Felder sind sinnig verdrahtet (`character.ts:252-321`, in combat gelesen).

**P2 — Parität-Ziel bei L60 verfehlt (nominal), Feel gerettet vom Recharge.** `content-dev` / `balance-designer`.
Live-EHP Platte 333 / Leder 286 / Stoff 273 gegen Spec-§4.4-Ziel (292/307/292). Platte ist bei L60 **+14 % über
Ziel** (runite-Set-Bonus-maxHp 123 + exakter 60er-Tier + volle 50 %/35 %), Stoff **−6 %** unter Ziel. Ergebnis:
Stoff −18 % ggü. Platte statt der intendierten ~0 %. Der Ward-Recharge kaschiert das im Gefühl (siehe Q4), aber
das nominale Parität-Ziel ist bei diesem Band nicht getroffen. Ursache-Doppel: Platte über-getunt UND Stoff unter-
getiert (P4-Ladder-Lücke). Empfehlung: Platten-L60-maxHp/Set-Bonus prüfen ODER Stoff- Zwischen-Tier ergänzen.

**P3 — Ward macht den Magier bei L60 fast druckfrei (drei Tuning-Beobachtungen).** `balance-designer` / `combat-dev`.
- (a) Das „Mana leer → kein Recharge → Weak-Melee"-Druckventil (Spec §1.4/§11.1) ist inert: manaRegen 7.9/s ≫
  Cast-Drain 2.9/s (+5/s), manaMin 496/504 → der Magier castet immer, Ward lädt immer. Das gewollte Sustain-Risiko
  existiert bei L60 nicht.
- (b) On-tier-Food-Druck sehr weich: armored-no-food nur 5.3 deaths/h, gegen +2 sogar 0 Food. Stoff ist der
  food-unabhängigste Stil — weicher als die §7.2-Marge (aus Platten-DPS-in abgeleitet) vorsieht.
- (c) Im Sustained-Fight (kein Kill-Refill) hebt Recharge Stoffs effektive TTK (104 s) auf ≈/über Platte (92 s) —
  über-schließt die −12 % und invertiert die Tank-Ordnung leicht. Recharge-Rate 1.45/s ggf. minimal zu großzügig
  (deckt sich mit Spec-§11.1-Offenfrage zur Recharge-Quelle/-Rate).

**P4 — Politur / bekannte Deferrals.**
- (a) **Magie-Defensiv-Stance bringt Stoff KEINEN Defensiv-Nutzen:** `defMult` multipliziert nur `armorRating`
  (=0 für Stoff, `character.ts:434`) und rührt Ward/HP nicht an (`shared:104-107`). Ein Stoff-Magier in Defensiv-
  Stance bekommt nur das magic_def-XP-Reroute, keine Härte — anders als Platte (defMult skaliert Mitigation). Ggf.
  verwirrend („Defensiv = tankiger?"). `combat-dev`/`ui-dev` (oder bewusst — dann Tooltip klarstellen).
- (b) **Stoff-Ladder-Lücke magic_off 58 (arcane) → 70 (runewoven) = 12 Leerlevel**, die breiteste der drei Linien
  (Leder hat kleinere 60→62-Lücke, ironhide body/legs). Das ist die strukturelle Quelle der −12 % bei L60 und exakt
  Spec-§11-Offenpunkt #4. `content-dev`: Zwischen-Robe (magic_off ~62–65) ergänzen.
- (c) **`defenseType`-Tag ist definiert, aber im Engine nirgends gelesen** (grep leer) — korrekt DEFERRED (Spec §6.2:
  Konter-Wirkung = Waffen-Spec-Scope). Kein Bug; nur Hinweis: sobald die Konter-Achse landet, braucht es einen
  Guard-Test (wiring-audit deckt die Trinität-Felder aktuell nicht ab).

## Gesamt-Empfehlung: **ship** (mit Balance-Nachtrag)
Die Magie-Defensiv-Identität funktioniert bei L60 mechanisch sauber und fühlt sich gut/verzeihend an; alle vier
harten Constraints (Sustain, Unarmored=Suizid, Food-nötig, +2-sicher) sind erfüllt. Kein Blocker. Offen sind reine
Balance-Kalibrierungen (P2/P3) und Content-Ladder-Lücke (P4b) — für den EA-Push nicht release-kritisch, aber der
`balance-designer` sollte die Platten-Übertunung + Ward-Recharge-Rate + Stoff-Zwischentier vor dem finalen Pass ansehen.
