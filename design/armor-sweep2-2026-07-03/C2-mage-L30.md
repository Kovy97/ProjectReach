# Phase C2 — Combat-Tester (Iteration 2) · STIL=MAGIC · BAND=L30 · „Grim Reach"

Stand 2026-07-03 · Kontrolleur · **READ-ONLY** (Wegwerf-Harness `_tmp_c2G30_*`, ausgeführt & gelöscht; KEIN Spiel-Code geändert).
Methodik: eigener per-Tick-Harness (`computeStats`/`startCombat`/`combatStep`, TICK_MS=100, **Zeiten = SPIELZEIT**, Auto-Restart bei Tod).
100 % Kampf, combatLevel = 30 (alle Kampf-Skills L30, `warding` L30). On-tier Stoff + 2H-Stab (`blacksteel_staff` req30).
It2-Konstanten verifiziert im Code: `WARD_KILL_REFILL_PCT=0.20`, `WARD_CORE_PER_INT=0`, `K_DODGE=45`, `LEATHER_HIT_FLOOR=0.12`,
`DEFENSE_MITIGATION_K=125`, `BLOCK_DAMAGE_REDUCTION=0.85`, `WARDING_REGEN_PER_LEVEL=0.02`/Cap 2.0, SAVE_VERSION 51.
Guard-Basis: **59/59** trinity-relevante Guards grün (`ward`, `armor-iteration2-combat`, `armor-trinity-combat`, `mitigation`,
`no-natural-regen`, `autoeat-dot`, `magic`, `magic-loop`, `magic-def-xp`, `wiring-audit`, `status-coverage`).

## VERDIKT: **fix-then-ship** — Mechanik bugfrei; 3 It2-Ziele erreicht, 1 NEUER Struktur-Blocker (P1) + 1 offener Balance-Punkt (P2)
Die vier Defensiv-Mechaniken + die beiden Chef-Features (Warding-Skill, 20 %-Refill) sind **sauber verdrahtet**. It2 hat die drei
It1-Magier-Mängel messbar behoben (Stoff-Leiter-Lücke, INT-Ward-Leak, Content-Leiter). **ABER:** der zentrale Praxis-Befund ist ein
**Rüstungs-Gating-Bruch** — der reine Kampf-Magier kann seine on-tier-Stoffrüstung **nicht anlegen** (Runecrafting-Doppelgate), während
Melee/Ranged ihre Rüstung durchs Kämpfen freischalten. Genau die Asymmetrie, die Spec §8 für **Leder** erkannt+gefixt hat, steht bei
**Stoff** unverändert. Folge: der spielbare Magier ist Glas, nicht der food-triviale Tank aus dem statischen Modell.

---

## It1 → It2 — die vier Auftragsfragen

### (1) Food jetzt nötig? — **NEIN auf Nicht-DoT (It1-P2 NICHT behoben); JA marginal auf DoT** — mit großem Vorbehalt (P1)

**On-tier-Magier (ember, direkt zugewiesen wie It1-Harness), 1800 s SPIELZEIT, kein Food:**

| Mob | Level | DoT | Kills | Tode | Direkt→HP | DoT→HP | minWard/max | endHP% | Food-Bisse |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| ash_rat | L30 (on) | — | 141 | **0** | **0** | 0 | 66/103 | **100 %** | 0 |
| ashfield_jackal | L32 (+2) | — | 137 | **0** | **0** | 0 | 71/103 | 100 % | 0 |
| dust_vulture | L34 (+4) | — | 132 | **0** | **0** | 0 | 54/103 | 100 % | 0 |
| goblin_warlock | L30 (on) | burn | 106 | 1 | **0** | 86 | 55/103 | 50 % | 0 |
| goblin_warlock +Salmon | L30 | burn | 106 | **0** | 0 | 86 | 55/103 | 53 % | **1** |

**Kern-Befund:** Der **20 %-Kill-Refill hat die Food-Trivialität auf Nicht-DoT-Content NICHT beseitigt.** Direkter Schaden wird über
141/137/132 Kills **zu 100 % vom Ward geschluckt** (`directHpDmg = 0`); der Pool erodiert nur leicht und **stabilisiert** bei 52–69 %
(min 54–71 von 103), statt auf 0 zu fallen. Grund: In kurzen on-level-Kämpfen ist der Ward-Verlust je Kill kleiner als 20 %-Refill +
Cast-Recharge (~3.5 Ward/s) + Warding-Regen (0.6/s) zusammen zurückgeben — auch **+2/+4 über Level** kippt das nicht. Damit gilt die
It1-Beobachtung (ash_rat 137 Kills / 0 HP-Schaden) unverändert. Auf DoT-Content ist Burn der **einzige** HP-Kanal (86 HP / 30 min → 1 Tod
ohne Food, 0 mit **1 Bissen/30 min**) — Food bleibt für den Magier **viel schwächer** verankert als für Melee.
→ **Owner: balance-designer.** Das ist der offene §13-„Food-Philosophie"-Punkt; selbst die harte Variante (Refill 0.10) dürfte
on-level-Nicht-DoT kaum erodieren, weil die per-Kampf-Ward-Last ≪ Zufluss ist. **ACHTUNG:** dieser Befund gilt nur für den *modellierten*
on-tier-Magier — der *real ausrüstbare* Magier (P1) hat das gegenteilige Problem (Food-Not).

### (2) Warding-Loop + passiver Regen? — **JA, korrekt verdrahtet** ✅

`wardRegenPerSec` (§9.2) misst exakt spec-konform, KAMPF-scoped, additiv zum Cast-Recharge:

| warding-Level | 1 | 30 (offensiv) | 30 (defensiv) | 99 | 99 (Cap) |
|---|---:|---:|---:|---:|---:|
| Ward-Regen/s | 0.030 | **0.600** | **0.900** (×1.5) | 1.98 | 2.000 (Cap) |

- Defensiv-Magie-Stance × 1.5 greift (0.6 → 0.9). Isoliert (armor-iteration2-combat-Guard) + im 600-s-Farm bestätigt: defensiv hält den
  Pool höher (minWard 66 vs 60) und tötet minimal langsamer.
- **Warding-XP (§9.3) fließt** (absorb-basiert): offensiver Magier trainiert Warding **langsam** (nur Absorb; ash_rat 30 min ≈ +940 XP,
  < 1 Level); **defensiver** Magier zusätzlich über die Stance-Cast-Route (warlock 600 s ≈ +7500 XP ≈ +4 Level). Das ist per-Spec
  (§9.3 „primär Absorb, sekundär Defensiv-Stance-Casting") — die **Rate ist stark absorb-abhängig** (schnell beim Tanken harter Treffer,
  fast still auf weichen Mobs). `WARDING_XP_PER_ABSORB=0.25` bleibt der von der Spec markierte Kalibrier-Punkt.
- **Sustain-Verdikt:** Der Loop „hält" wie It1 **über den großen Pool + Refills**, nicht über den Cast-Recharge allein — Gesamt-Ward-Regen
  (Cast ~3.5/s + Warding 0.6/s = ~4.1/s) bleibt < DPS-in im zähen Kampf, d. h. **kein Unsterblichkeits-Sustain** (Spec §1.4 intakt).

### (3) unarmored = Suizid? — **JA** ✅ (und sauberer als It1)

Nur-Stab, keine Robe, vs goblin_warlock L30, 1800 s:

| Food | maxHp | maxWard | Kills | **Tode/30 min** | Verdikt |
|---|---:|---:|---:|---:|---|
| kein | 34 | **0** | 28 | **115** | Tod ~alle 16 s → Suizid |
| +Salmon | 34 | 0 | 63 | **42** | Tod ~alle 43 s → weiter unspielbar |

- **`maxWard` fällt jetzt auf EXAKT 0** (It1: 6 aus dem INT-Kern). Der It1-P4-Leak (`WARD_CORE_PER_INT 1→0`) ist **geschlossen** — der
  nackte Magier hat keinerlei Gratis-Absorb-Sockel mehr, das Suizid-Verdikt ist damit härter/sauberer als It1.

### (4) Stil-Parität L30? — **Magier ON-PARITY (+2 %)** — It1-Cloth-Gap (−25 %) **behoben** ✅ (Rest-Spanne = Cross-Check)

`computeStats` @ combatLevel 30, on-tier je Stil direkt zugewiesen; EHP = `(maxHp+maxWard)/[(1−dodge)(1−mit)(1−block·0.85)(Leder-Floor)]`:

| Stil | maxHp | maxWard | mit% | block% | dodge% | **EHP** | dev vs Ø |
|---|---:|---:|---:|---:|---:|---:|---:|
| **Magier (ember+Stab)** | 55.7 | **103** | 0 | 0 | 0 | **159** | **+2 %** |
| Magier (frost = It1-Tier) | 47.7 | 75 | 0 | 0 | 0 | 123 | (It1-Referenz) |
| Melee 1H+Schild | 71.7 | 0 | 38 | 30 | 0 | 155 | −1 % |
| Melee 2H | 61.7 | 0 | 54 | 0 | 0 | 134 | −14 % |
| Ranged Leder+Bogen | 71.7 | 0 | 0 | 0 | 54 | 176 | +13 % |

- **It1: Magier −25 % (EHP 105, frost req22, weil ember nicht existierte). It2: Magier +2 % (EHP 159, ember req30, Σward 103).** Die
  Stoff-Leiter-Lücke (It1-P3) ist von content-dev **geschlossen** (ember-Tier req30 eingezogen; der frühere INT-Kern in die Teile
  eingefaltet, §11.5). Der Magier-EHP-Wert ist **hart** (Ward absorbiert 1:1, keine Modell-Annahme) → der Fix ist real.
- **Rest-Spanne primär-4 (1H/2H/Leder/ember) = 27 %** (2H −14 % unten, Leder +13 % oben) — > ±10 %. **Aber:** das ist **kein
  Magier-Befund** (Magier sitzt mittig). 2H-tief/Leder-hoch gehören den Melee-/Ranged-C2-Testern. Teil-Modell-sensitiv (mein EHP-Modell
  behandelt Dodge als reinen Multiplikator → generös für Leder). **Cross-Check unten (P3).**

---

## Befunde (Severity · `file:line` · Owner)

**P1 — STRUKTUR-BLOCKER: reine Kampf-Magier können ihre on-tier-Stoffrüstung nicht anlegen (Runecrafting-Doppelgate).**
`packages/content/src/index.ts` — **jedes** Stoff-Teil oberhalb `apprentice_*` (req `magic:1`) trägt ein ZWEITES Requirement auf den
Crafting-Skill `runecrafting`: `frost_* {magic:22, runecrafting:20}`, `ember_* {magic:30, runecrafting:32}`, `aether_* {…, rc:45}` …
bis `voidweave_* {magic:99, runecrafting:99}`. Ein reiner Kampf-Magier hat `runecrafting = 0` → **bestes ausrüstbares Stoff = apprentice**
(Σward 24.3). Das ist **exakt** die Crafting-Gate-Asymmetrie, die Spec §8 für Leder erkannt und **behoben** hat
(`leatherworking → ranged`; im aktuellen Content trägt **0** Leder-Teil noch `leatherworking`) — **für Stoff aber NICHT** angefasst.

Symmetrie-Nachweis (on-tier-Body je Stil):
- Platte `blacksteel_platebody`: `requirements: { defence: 30 }` — reiner Kampf-Skill ✅ (`index.ts:1603`)
- Leder `direhide_jerkin`/`scaled_*`: `{ ranged: N }` — reiner Kampf-Skill ✅ (§8 appliziert)
- **Stoff `ember_robe_body`: `{ magic: 30, runecrafting: 32 }` — Doppelgate auf Nicht-Kampf-Crafting ❌** (`index.ts:~3992`)

**Was der real ausrüstbare (apprentice-)Magier tut** (1800 s, ember→apprentice ist der einzige Unterschied):

| Loadout | Mob | Food | maxWard | Tode/30 min | Direkt→HP | Food-Bisse | Verdikt |
|---|---|---|---:|---:|---:|---:|---|
| **apprentice** | ash_rat (Nicht-DoT) | kein | 24 | **3** | 209 | 0 | stirbt sogar auf Nicht-DoT |
| apprentice | goblin_warlock | kein | 24 | **10** | 470 | 0 | Glas |
| apprentice | goblin_warlock | +Salmon | 24 | 0 | 321 | **34** | Food-Dauerspam |
| *(Referenz)* ember | goblin_warlock | +Salmon | 103 | 0 | 0 | 1 | food-trivial |

Der Gate hebt die **Kern-Balance komplett auf**: statt „+2 % on-parity, food-trivial" (Modell) ist der spielbare Magier **−53 % EHP
(74 vs Ø 156), stirbt auf Nicht-DoT-Content und braucht 34 Bissen/30 min auf DoT.** Er invertiert P4 (Parität) **und** P2 (Food) für die
Praxis. Passt zum Studio-Grundsatz „reiner Skiller kein Playstyle / Kampf ist fundamental" NUR, wenn Rüstung durch **Kämpfen**
freischaltet — was hier für 2 von 3 Stilen gilt, für Magie nicht. **Owner: content-dev (Regate Stoff auf `magic`-only, analog §8-Leder,
ODER magic-gegatete Stoff-Tiers ergänzen) — Balance-Designer/Chef-Entscheid wie der §8-Default „umgaten".** **fix-then-ship-Blocker
für den Playstyle „reiner Kampf-Magier".**

**P2 — It1-P2 offen: 20 %-Refill stellt die Food-Pflicht auf Nicht-DoT NICHT her.** On-tier-Magier nimmt über 1800 s / 141 Kills auf
ash_rat **0 Direkt-HP-Schaden**; Ward stabilisiert bei ~64 % Pool (auch +2/+4 über Level). `combat.ts:767` & `:797` refillen korrekt nur
`WARD_KILL_REFILL_PCT` (verifiziert), aber der Zufluss (20 % + Cast ~3.5/s + Warding 0.6/s) > per-Kampf-Ward-Last auf weichen Mobs.
DoT bleibt der einzige HP-Kanal (~1 Bissen/30 min). **Kein Crash — Balance/Design.** Optionen: härtere §13-Variante (Refill 0.10) —
oder akzeptieren als Magier-Sustain-Identität + Doku. **Owner: balance-designer.** (Nachrangig zu P1: bei ge-fixtem P1 kehrt dieser Punkt
zurück; solange P1 steht, ist er moot.)

**P3 — Cross-Check (NICHT Magier-Scope): L30-EHP-Spanne 27 % (2H −14 %, Leder/Ranged +13 %).** Magier selbst mittig (+2 %). 2H trägt
mit 54 % flacher Mitigation + 0.86× maxHp → EHP 134 (−14 %, tiefer als Spec-Ziel −8 %); Leder mit 54 % Dodge → EHP 176 (+13 %,
modell-generös). Zusatz-Flag: **Leder-Body maxHp (71.7) == Platte-1H maxHp (71.7)** — die §1.1-CON-Leitplanke (Leder 0.86× Platte)
scheint für Leder **unter-appliziert**. **Owner: content-dev + Abgleich mit den Melee-/Ranged-C2-Testern.**

## ✅ Korrekt bestätigt / It1→It2 behoben (mit Zahlen)
- **It1-P3 (Stoff-Leiter-Lücke) behoben:** ember-Tier req30 existiert (Σward 103) → Magier-EHP 105 (−25 %) → **159 (+2 %)**.
- **It1-P4 (INT-Ward-Leak) behoben:** `WARD_CORE_PER_INT=0` → nackter/Nicht-Stoff-Magier `maxWard = 0` exakt (war 6).
- **It1-P3-b (Content-Leiter L31–33) verbessert:** `ashfield_jackal L32` (+2) existiert jetzt → „+2"-Over-Level testbar (war Lücke 30→34).
- **20 %-Refill korrekt verdrahtet:** `WARD_KILL_REFILL_PCT=0.20`, `combat.ts:767`/`:797`; voller Ward nur bei `startCombat:247` +
  Death-Heal (`onPlayerDefeated:904` heilt HP voll, Ward voll via nächstem `startCombat`).
- **Warding-Skill (§9.2/§9.3) verdrahtet:** Regen 0.6/0.9/2.0-Cap, kampf-scoped, additiv; Absorb- + Defensiv-Stance-XP fließen.
- **Ward-Absorb VOR HP**, DoT-Bypass (burn ignoriert Ward/Rüstung), Mana-Sustain (maxMana 256 ≫ Cast 7, minMana 249) — alle wie It1.
- **59/59 trinity-Guards grün; Harness `_tmp_c2G30_*` rückstandslos gelöscht.**

**Empfehlung: fix-then-ship.** Kein Blocker/Crash im Kampf-Kern. **P1 (Stoff-Runecrafting-Gate) ist die eine Sache, die den Magier-
Playstyle real kaputt macht** und vor 1.0 einen content-dev-Fix + Chef-Entscheid (analog §8-Leder) braucht; P2 ist der offene
§13-Food-Philosophie-Punkt (balance-designer); P3 gehört den Melee-/Ranged-C2-Testern. `combat.ts`/`character.ts` bleiben unberührt.
