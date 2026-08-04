# Phase C — Combat-Tester · STIL=MAGIC · BAND=L30 · „Grim Reach"

Stand 2026-07-03 · Kontrolleur · **READ-ONLY** (Wegwerf-Harness `_tmp_cG30_*`, ausgeführt & gelöscht; KEIN Spiel-Code geändert).
Methodik: eigener per-Tick-Harness (combatStep, TICK_MS=100, **Zeiten = SPIELZEIT**), on-level `computeStats`/`startCombat`/`combatStep`.
100 % Kampf. Loadout: on-tier Stoff + 2H-Stab, combatLevel = 30 (alle Kampf-Skills L30). Guard-Basis: 26/26 Trinity-Tests grün
(`ward`, `armor-trinity-combat`, `mitigation`, `no-natural-regen`, `autoeat-dot`).

## VERDIKT: **SHIP-WITH-TRIMS** — Trinität mechanisch korrekt; 1 Balance-Entscheidung (P2) + 2 bekannte Content-Trims (P3)
Die vier Defensiv-Mechaniken sind sauber verdrahtet und der Magier ist funktional/spielbar. ABER: der **Respawn-Ward-Refill**
(combat.ts:785, spec-gewollt) macht direkten Schaden beim Farmen zu ~0 → **Food-Pflicht fällt für den Magier auf Nicht-DoT-Content
komplett weg** (P2, Design-Entscheidung nötig). Und die **Stoff-Leiter hat bei L30 eine Lücke** (bestes on-tier-Robe req22 statt req30)
→ Magier −25 % EHP im statischen Modell (P3, = GATE-B Lever 1). Beides berührt combat.ts/character.ts NICHT (Content/Config/Design).

## Gewähltes Loadout (Auto-Selektor, on-tier R=30)
| Slot-Linie | Auswahl | Kennwerte |
|---|---|---|
| Stoff (5 Teile) | frost_circlet/robe_body/robe_legs/handwraps/treads — **alle req22** | Σ wardCapacity ≈ 43.6 |
| Waffe | **blacksteel_staff** req30 | manaCost 7, 3000 ms/Cast |
| → Magier gesamt | maxHp **48**, maxWard **57** (INT-Kern 13 + 43.6), maxMana 184 | armorRating/dodge/block = 0 |

**Leiter-Lücke:** bestes tragbares Stoff bei Char-L30 ist req**22** (Frost) — die nächste Stoff-Sprosse liegt >30, während Platte/Leder
req**28–30** erreichen (blacksteel/scaled). Der L30-Magier hängt also eine ganze Sprosse hinter seiner Defensiv-Schicht.

---

## (1) Ward-Loop-Sustain? — **NEIN aus Cast allein (spec-gewollt); JA in der Praxis via Kill-Refill**
Isolierter Dauerkampf (unsterblicher Mob, kein Kill-Refill), 180 s SPIELZEIT, kein Food:
- **Recharge ≈ 1.32 Ward/s** (68 Casts × 7 Mana × 0.5 / 180 s) — deckt sich mit Spec 1.3/s.
- **DPS-in ≈ 3.27/s** → Recharge ist nur **~40 %** des Zuflusses. Ward-Pool (57) kollabiert auf 0 (ticksWard0 = 204 → 20.4 s bei 0 Ward),
  danach leakt Direktschaden auf HP → **3 Tode/180 s** (≈ 60 s Überleben je Leben rein auf Ward+HP).
- ⇒ Ward ist **EHP, kein Selbst-Sustain** — exakt Spec §1.4 („Recharge ≪ DPS-in, großer Pool = die EHP, Recharge nur Flavor"). ✅ korrekt.

**ABER realistisch (Ward refillt auf max bei JEDEM Kill, combat.ts:785):** Kämpfe sind kurz (18.8 s/Kill), der Magier tötet lange bevor
der Ward leerläuft → über 96 Warlock-Kills **ticksWard0 = 2** (praktisch nie leer), Ward absorbiert 40.4/Kill von 57 (Marge bleibt).
Der Loop „hält" also **über Kill-Refills, nicht über Cast-Recharge**. Mana reicht immer (maxMana 184 ≫ Cast 7, ticksMana0 = 0) → der
Weak-Melee-Ohne-Recharge-Fall triggert bei L30 **nie**.

## (2) Unarmored = Suizid? — **JA** ✅
Nur-Stab, keine Robe (maxWard fällt auf 6 = reiner INT-Kern; maxHp 34), vs goblin_warlock L30, 180 s:
| Food | Kills | Tode | minHP | Bewertung |
|---|---:|---:|---:|---|
| kein | 5 | **7** | 0 % | Tod ~alle 25 s → Idle-untauglich = Suizid |
| +Salmon | 7 | 0 | **1 %** | überlebt nur auf Messers Schneide (41 Bisse/180 s = Dauerspam) |

Gepanzert (voll Stoff) im Vergleich: 0–2 Tode über **1800 s**. ⇒ die Ward-Schicht ist die Grenze zwischen Tod und Dauerbetrieb.
(Der 6-Ward-Rest kommt aus `WARD_CORE_PER_INT` — s. P4; kosmetisch klein, ändert das Suizid-Verdikt nicht.)

## (3) Food nötig / nicht trivial (Ward vs Food)? — **NUR gegen DoT; gegen Nicht-DoT komplett trivial (P2)**
30-min-Farm (1800 s SPIELZEIT), voll Stoff:
| Mob | Food | Kills | Tode | Direct-Hit→HP | **DoT→HP** | endHP | Verdikt |
|---|---|---:|---:|---:|---:|---:|---|
| goblin_warlock L30 (**burn**) | kein | 96 | 2 | **3** | **114** | 66 % | Food nötig — aber Druck kommt **nur aus Burn** |
| goblin_warlock L30 (burn) | +Salmon(6) | 97 | 0 | 0 | 105 | 56 % | Food deckt (14 Bisse/30 min = 1/~2 min) |
| **ash_rat L30 (kein DoT)** | **kein** | 137 | **0** | **0** | **0** | **100 %** | **Food 0 nötig — HP fällt NIE, minWard bleibt 21** |

**Kern:** Direktschaden wird durch Ward **vollständig** geschluckt und der Ward setzt sich per Kill gratis auf max zurück
(combat.ts:785). DoT (`ignoriert Rüstung`, combat.ts:1017/1027) ist der **einzige** HP-Kanal des Magiers. Gegen einen Mob **ohne**
DoT nimmt der farmende Magier **über 30 min literal 0 HP-Schaden** und braucht **kein Food** → die Spec-Säule „Food strukturell
PFLICHT" (§7.2) ist für den Magier auf Nicht-DoT-Content **ausgehebelt**. Selbst gegen den DoT-Mob ist die Food-Abhängigkeit
**viel geringer** als bei Melee (14 Salmon/30 min vs Melee 12 Salmon/**5 min**).

## (4) Stil-Parität L30? — **FAIL im statischen EHP (Magier −25 %, Spanne 53 %)** — nuanciert
`computeStats` @ combatLevel 30, on-tier je Stil, EHP-Methodik Spec §7.3:
| Stil | maxHp | maxWard | red% | block% | dodge% | **EHP** | dev vs Ø |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Magier** (Stoff+Stab) | 48 | 57 | 0 | 0 | 0 | **105** | **−25 %** |
| Melee (Platte+Schild, 1H) | 72 | 6 | 43 | 24 | 0 | **153** | +9 % |
| Ranged (Leder+Bogen) | 66 | 6 | 0 | 0 | 59 | **161** | +15 % |
Ø 140 · **Spanne 53 %** → weit außerhalb ±10 %. Ursache: **Stoff-Leiter-Lücke** (Robe req22 statt req30, s.o.) + kleiner INT-Ward-Leak
bei Melee/Ranged. **Deckt sich mit GATE-B (R30 Spanne 37 %) und Spec §11.4 (Leder/Stoff low/mid unter-spec) — bekannter Trim, hier bei L30 beziffert.**

**Wichtige Nuance:** das **statische** EHP unterschätzt den Magier, weil es den Kill-Refill ignoriert. Beim **Farmen killbarer
on-tier-Mobs** ist der Magier faktisch der **tankigste** Stil auf dem Direktschaden-Kanal (0 HP-Schaden, s. Frage 3). Die −25 %
beißen nur im **einzelnen zähen Kampf** (Boss/DPS-Check/über-Level-tanky), wo schnelles Töten ausbleibt → dann kollabiert der Ward
und der Magier ist glasig (Frage 1: 3 Tode/180 s). Zwei Wahrheiten, je nach Kampf-Typ.

## (5) L30+2? — **kein L+2-Mob vorhanden; +4 (dust_vulture L34) ist trivial**
**Content-Lücke:** zwischen goblin_warlock (L30) und dem nächsten Mob existiert **kein Gegner L31/32/33** — die nächste Sprosse ist
**dust_vulture L34 (= +4)**. Ein echter „+2"-Schritt ist nicht testbar.
Magier vs dust_vulture L34 (kein DoT), 300 s: **18 Kills, 0 Tode, HP 100 % durchweg, minWard 16, 0 Food.** Selbst +4 hoch ist HP-sicher —
weil der Mob keinen DoT trägt und der Kill-Refill seine Direkttreffer negiert. Bestätigt die Refill-Beobachtung aus Frage 3.

---

## Befunde (Severity · `file:line` · Owner)
**P2 — Kill-Ward-Refill hebelt die Food-Pflicht des Magiers auf Nicht-DoT-Content aus.** `combat.ts:785` (`state.character.ward =
stats.maxWard` bei jedem Respawn, spec-gewollt §1.4). Folge: farmender Magier nimmt auf Nicht-DoT-Content **0 HP-Schaden über
unbegrenzt viele Kills** (ash_rat: 137 Kills/1800 s/0 Food/HP 100 %) → Spec-Säule §7.2 „Food PFLICHT" gilt für den Magier nur noch
gegen DoT-Mobs. **Kein Crash, reine Balance/Design-Entscheidung.** Optionen: (a) Ward beim Respawn NICHT voll auffüllen (Rest-Ward
mitnehmen, nur Cast-Recharge) — stellt Food-Druck her; (b) bewusst so lassen (Magier-Sustain-Identität) + Doku. **Owner:
balance-designer (Entscheid) → combat-dev (falls (a)).**

**P3 — L30-EHP-Parität: Magier −25 % (Spanne 53 %).** Stoff-Leiter-Lücke: bestes on-tier-Robe req22 vs Platte/Leder req28–30
(kein req23–30-Robe). Content-Daten, kein Formel-/Wiring-Fehler (Ward-Formel exakt: 13 INT-Kern + 43.6 Gear). **= GATE-B Lever 1 /
Spec §11.4, bei L30 beziffert. Owner: content-dev** (Stoff-Zwischen-Tier req~28 einziehen; Ziel maxWard ~75 → EHP ~123, dev ≈ −12 %).

**P3 — Content-Ladder-Lücke: kein Monster L31–33.** Nächster Gegner nach goblin_warlock L30 ist dust_vulture L34 (+4). „+2"-Over-Level
nicht existent → Zonensprung 30→34. **Owner: content-dev** (Design-Frage: gewollte Zonengrenze Borderlands→Ashfields, oder Zwischen-Mob?).

**P4 — `WARD_CORE_PER_INT=1.0`-Leak weiter offen.** Melee/Ranged tragen bei L30 maxWard **6** (INT 6) → kleine Ward-Leiste + Gratis-
Absorb-Puffer bei Nicht-Stoff. **= GATE-B Lever 2 (unverändert). Owner: logic-dev/content-dev** (`WARD_CORE_PER_INT → 0`, INT-Kern in
`wardCapacity` einfalten). Bei L30 klein (6), aber der UI-Vertrag §8 („Ward nur bei Stoff sichtbar") ist verletzt.

**P4 (Cross-Check, NICHT Magier-Scope) — Ranged-DPS wirkte sehr schwach vs warlock:** scaled-Leder + blacksteel_shortbow +
blacksteel_arrow → **42.9 s/Kill** (Magier 18.8, Melee 16.7), minHP 3 %, 46 Bisse/300 s. Evtl. Harness-Munitions-/Bogenwahl. **Flag an
den Ranged-Phase-C-Tester** — kein Magier-Befund.

## ✅ Korrekt bestätigt (mit Zahlen)
- **Ward-Recharge**: 1.32/s ≈ Spec 1.3/s, an Mana-Verbrauch gekoppelt (cost·0.5); absorbiert VOR HP (als `shield` geloggt);
  Init = maxWard bei Kampfstart UND Respawn. **Kein Recharge-Bug.**
- **DoT-Bypass** (burn/poison/bleed) ignoriert Ward/Rüstung/Dodge für ALLE Stile — intendiert (combat.ts:1017/1027), symmetrisch.
- **Mana-Sustain** L30: 184 Mana ≫ 7/Cast → Weak-Melee/kein-Recharge triggert nie; der „Mana-leer"-Druckfall existiert bei L30 nicht.
- 26/26 Trinity-Guards grün; Harness rückstandslos gelöscht.

**Empfehlung: fix-then-ship.** Kein Blocker/Crash. P2 (Food-Pflicht-Loch) ist eine **balance-designer-Entscheidung** vor 1.0; P3/P4
sind bereits als GATE-B-Lever gelistet (content/logic). combat.ts/character.ts bleiben unberührt.
