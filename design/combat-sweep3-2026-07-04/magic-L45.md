# Combat-Balance-Sweep 3 — STIL=MAGIC · BAND=L45 (Mid) · Staff + Wand

Datum 2026-07-04 · Tester: kontrolleur (Combat-Balance) · 100 % Kampf, SPIELZEIT-Sicht
READ-ONLY · Wegwerf-Harness `src/_tmp_s3_g45_magic.test.ts` (nach Lauf gelöscht) · headless, seeded (3 Seeds/Zelle, 60 min Spielzeit), kein Electron.
Neuer Stand verifiziert: Stoff=Ward, wardBreak-Konter, Warding-Ward-Regen, It2.1 (`WARD_PER_MANA` 0.5→0.20, `WARD_KILL_REFILL_PCT` 0.20→0.10), Gegner-Trinität (`defenseType` armor/evasion/ward). Guard-Test `enemy-ward-counter` grün gelesen.

CHEF-ZIEL: „schwer aber fair — Vorbereitung nötig."

## Loadout (on-tier L45)
- **Staff:** `mithril_staff` (magic 40, 2H, dmg 3.2–4.8, aIMs 3000, manaCost 7, **wardBreak 0.30**, burn-Proc 0.9).
- **Wand:** `mithril_wand` (magic 40, 1H, dmg 2.7–3.5, aIMs 2700, manaCost 6, **wardBreak 0.20**, shock-Proc 0.24) — optional `mithril_focus` Offhand.
- **Stoff:** `aether`-Set 5-teilig (magic 40, Σ wardCapacity **138**, Σ modifiers con13/int16/wis4).
- **Food:** `cooked_wraithscale` (heal 15). **Skills:** magic 45, warding 45, vitality 45 (runecrafting 45). magicStance offensiv/defensiv.

## Abgeleitete L45-Magier-Stats
| Loadout | int | con | wis | maxHp | maxWard | maxMana | maxHit | aIMs | manaRegen | wardRegen/s | wardBreak | armor | CL |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Staff off | 34 | 22 | 13 | 62.2 | **138** | 422 | 22.0 | 2880 | 6.7 | 0.90 | 0.30 | 0 | **34** |
| Staff def | 34 | 22 | 13 | 62.2 | 138 | 422 | 19.4 | 2880 | 6.7 | **1.35** | 0.30 | 0 | 34 |
| Wand off | 34 | 22 | 13 | 62.2 | 138 | 422 | 20.7 | 2580 | 6.7 | 0.90 | 0.20 | 0 | 34 |
| Wand+focus | 36 | 22 | 16 | 62.2 | 138 | 454 | 21.4 | 2580 | 7.9 | 0.90 | 0.20 | 0 | 34 |
| **nackt** (nur Stab) | 14 | 9 | 8 | **36.2** | **0** | 202 | 15.0 | 2880 | 4.7 | 0.90 | 0.30 | 0 | 34 |

`armor 0`, `dodge 0`, `block 0` (korrekt — Stoff trägt nur Ward). **Nackt = maxWard 0** (WARD_CORE_PER_INT=0 → der gesamte Ward-Layer ist gear-gegatet, kein INT-Kern). **CL 34** — s. F2.

## Gegner (fightable, nächste an L45)
| defenseType | Gegner | L | hp | dmg | def | eva | ward | inflict | Rolle |
|---|---|---:|---:|---:|---:|---:|---:|---|---|
| armor | `rootling_grunt` | 45 | 47 | 17 | 23 | 1 | – | – | **typischer on-band-Mob** |
| armor | `ash_tyrant` | 45 | 136 | 17 | 40 | 2 | – | – | zäher Champion (Boss-Achievement) |
| evasion | `pitch_beetle` | 42 | 67 | 16 | 30 | 11 | – | – | on-band Ausweicher |
| armor+DoT | `rootling_gimp2` | 51 | 73 | 19 | 30 | 2 | – | poison | über-band DoT (+6) |
| ward | `goblin_warlock` | **30** | 52 | 13 | 20 | 2 | 16 | – | nächster Ward-Gegner (−15 unter Band!) |
| ward+DoT | `bramble_witch` | **60** | 85 | 21 | 30 | 3 | 26 | poison | nächster Ward-Gegner über Band (+15) |

**Content-Lücke (F3):** Kein fightable **ward**-defenseType-Gegner im Band L40–55 — der nächste ist L30 (unter) bzw. L60 (über). In-Band-DoT-Mobs (`slag_abomination`/`cinder_wretch` L44/48) sind **slayer-gegatet** (slayer_tower, slayerLevel 40) → für einen normalen L45-Magier gar nicht betretbar. Ein on-band-Magier trifft in seinem eigenen Band **weder einen Ward-Gegner noch einen nicht-slayer-DoT-Gegner**.

---

## (P1) Braucht der Magier Food? + It2.1 Ward-Self-Sustain-Watch (staff, armored, 3 Seeds/60 min)
| Szenario | kills/h | deaths/h | food/h | wardAvg (%) | wardMin | wardEmpty% | hpMin | hpAvg% |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **nonDoT typ** `rootling_grunt` +food | 260 | 0 | **3** | 80 (58%) | 0 | 0.1 | 28 | 86 |
| … NOfood | 260 | **0.7** | 0 | 80 (58%) | 0 | 0.2 | 0 | 80 |
| … +food **DEF-Stance** | 251 | 0 | **0** | 124 (**90%**) | **44** | 0.0 | 62 | 100 |
| … NOfood DEF-Stance | 251 | 0 | 0 | 124 (90%) | 44 | 0.0 | 62 | 100 |
| **nonDoT zäh** `ash_tyrant` +food | 112 | 0 | 352 | 11 (8%) | 0 | 8.4 | 24 | 62 |
| … NOfood | 97 | **28.3** | 0 | 50 (36%) | 0 | 3.0 | 0 | 84 |
| … +food DEF | 101 | 0 | 216 | 17 (12%) | 0 | 4.1 | 26 | 63 |
| **DoT** `rootling_gimp2` +food | 198 | 0 | 282 | 17 (12%) | 0 | 5.5 | 13 | 62 |
| … NOfood | 185 | **23.7** | 0 | 55 (40%) | 0 | 1.8 | 0 | 78 |
| … +food DEF | 177 | 0 | 222 | 20 (14%) | 0 | 3.3 | 20 | 62 |

**Antwort:** Differenziert, und genau so, wie „schwer aber fair" es verlangt:
- **Trivialer on-band-Mob** (rootling_grunt, 5 DPS-in): Food faktisch **nicht nötig** (off-stance 3 food/h, 0.7 deaths/h; DEF-stance 0 food, 0 deaths). Ward+HP tragen allein.
- **Zäher / über-level / DoT-Gegner:** Food **klar nötig** — ohne Food **28.3 / 23.7 deaths/h** (ash_tyrant / rootling_gimp2). Der Ward-Pool wird durchgemahlen (wardAvg 8–14 %, wardEmpty 5–8 %) → HP → Food.

**It2.1-Watch — Ward-Self-Sustain NICHT zu stark (offensiv bestätigt):** Im Offensiv-Modus erodiert der Ward gegen jeden nicht-trivialen Gegner sichtbar (8–14 % Durchschnitt, wardMin 0, wardEmpty 5–8 %) — die It2.1-Halbierung (WARD_PER_MANA 0.5→0.20, Kill-Refill 0.20→0.10) hat den früheren „nie-erodierenden-Ward"-Food-Freibrief geschlossen. **Rest-Puffer** (non-DoT typ, off): wardAvg 58 %, persistiert, kippt aber gelegentlich auf 0 → gesunder Puffer, keine Immortalitäts-Engine. ✅

**Einzige Watch-Notiz:** DEF-Stance vs **trivialer** Mob → Ward self-sustained auf **90 %** (wardMin 44, HP unberührt, 0 Food, 0 Tode). Food-freies Idle-Farmen, aber (a) nur gegen triviale Ziele — gegen ash_tyrant/rootling_gimp2 braucht auch DEF-Stance Food (216–222 food/h), (b) Kosten −15 % Cast-Schaden. Innerhalb der Erwartung (Defensiv-Stance darf schwache Mobs trivialisieren); nur beobachten, falls der DEF-Stance-Ward-Regen (×1.5) je steigt.

## (P2) Fair + Vorbereitung lohnend/nötig (unarmored / no-food, EINZELN)
| Szenario (vs rootling_grunt L45) | kills/h | deaths/h | food/h | Bewertung |
|---|---:|---:|---:|---|
| **armored + food** (Baseline) | 260 | 0 | **3** | Referenz |
| armored, **NO food** | 260 | 0.7 | 0 | on-band ok, härtere Mobs (P1) nicht |
| **nackt** + food | 212 | 0 | **573** | überlebt nur durch Dauer-Essen (×190 Food) |
| **nackt**, NO food | 98 | **242** | 0 | Dauertod — idle-untauglich |

Nackte TTK (naked, no food) vs rootling_grunt = **13.5 s bis Tod**; armored überlebt unbegrenzt. **Vorbereitung wird massiv belohnt:** Rüstung senkt Food ×190 (573→3/h) UND nullt die Tode; Rüstung weglassen = 242 Tode/h oder 573 Food/h. Beide Hebel (Rüstung, Food) zählen einzeln, jeder stärker gegen härteres Content. **Fair + Vorbereitung nötig — bestätigt.**

## (P3) Staff vs Wand (Feel) + wardBreak vs Ward-Gegner
| Vergleich (vs rootling_grunt) | kills/h | food/h | wardAvg% | hpAvg% |
|---|---:|---:|---:|---:|
| STAFF (maxHit22, aIMs2880, burn, wb0.30) | 260 | 3 | 58 | 86 |
| WAND (maxHit20.7, aIMs2580, shock, wb0.20) | **278** | 2 | 70 | **96** |
| WAND+focus | 279 | 3 | 68 | 90 |

**Feel:** klar differenziert. **Staff** = harte, langsame Schläge + Burn-DoT + höherer wardBreak. **Wand** = schnellere, leichtere Schläge + **Shock** (Stun-Chance → Gegner setzt aus → hpAvg 96 % vs 86 %, spürbar sicherer) + Focus-Slot (mehr Mana/int). Wand liegt am mid-band ~**+7 % kills/h** vorn (Tempo 2580 vs 2880 schlägt den Schadens-pro-Cast-Vorsprung des Stabs).

**wardBreak vs Ward-Gegner — der Konter greift praktisch NICHT (F1):**
| vs Ward-Gegner | STAFF wb0.30 | WAND wb0.20 |
|---|---:|---:|
| `goblin_warlock` L30 (ward16) | 209 kills/h | **223** |
| `bramble_witch` L60 (ward26) | 141 kills/h | 143 |

Der Gegner-Ward-Pool (16–26 = `ENEMY_WARD_HP_FRACTION 0.3·maxHp`) ist **kleiner als ein einzelner Treffer** (maxHit ~22) → er bricht in 1–2 Schlägen, egal ob wb0.20 oder wb0.30. Die wardBreak-Signatur des Stabs (+0.10) liefert **null spürbaren Vorteil**; der schnellere Wand tötet Ward-Gegner sogar geringfügig FIXER. Mechanisch korrekt (Guard `enemy-ward-counter` grün), aber am mid-band vom Waffentempo überstimmt — wardBreak ist hier ein quasi-toter Differenzierungs-Stat.

## (P4) Gegen alle 3 defenseTypes killbar? + Stil-Parität
| staff vs | kills/h | deaths/h | stalemate |
|---|---:|---:|---:|
| **armor** `rootling_grunt` L45 | 260 | 0 | 0 |
| **evasion** `pitch_beetle` L42 | 166 | 0 | 0 |
| **ward** `goblin_warlock` L30 | 209 | 0 | 0 |
| **ward** `bramble_witch` L60 | 141 | 1.3 | 0 |

Alle drei defenseTypes sauber killbar, **kein Stalemate**. Evasion-Mob am langsamsten (166 — Stab trägt keine precision, der Ausweicher dodged mehr), bleibt aber problemlos farmbar.

**Stil-Parität @L45 (analytische EHP §11.6 + kills/h vs rootling_grunt):**
| Stil | maxHp | mit% | dodge/block | maxWard | **EHP** | Abw. Ø | maxHit | aIMs | kills/h | **CL** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Melee (mithril+Platte+Schild) | 92 | 40 | block33 | – | **216** | +1 % | 20.1 | 2580 | 259 | 45 |
| Ranged (mithril-Bogen+Leder) | 82 | – | dodge58 | – | **222** | +4 % | 13.1 | 2061 | 252 | 45 |
| **Magic (mithril-Stab+Aether)** | 62 | – | – | 138 | **200** | **−6 %** | 22.0 | 2880 | 260 | **34** |

Ø-EHP 213, Spanne +4 %/−6 % → **Parität gut** (Magic minimal am unteren Ende). **kills/h 259/252/260 — praktisch identisch** (±3 %). Stil-Feel klar getrennt (Platte=Mitigation+Block, Leder=hoher Dodge+Tempo, Stoff=Burst-Hits+Ward-Puffer). **DPS- und EHP-Parität @L45 bestätigt.**

**ABER — CL-Asymmetrie (F2):** Magic zeigt **CL 34** vs Melee/Ranged **CL 45** bei gleichem Tier. Grund: `combatLevel` (dungeon.ts) rechnet `defensiveBase = defence + vitality`, aber der Magier trainiert als Defensiv-Skill **warding** (nicht defence) — warding fließt in **keinen** CL-Term ein. Melee/Ranged bekommen ihren Defensiv-Skill (defence) im CL gutgeschrieben, der Magier nicht.

---

## Findings (Severity · Owner)
- **F1 (MEDIUM · combat-dev/content-dev):** `wardBreak` ist am mid-band ein quasi-toter Stat. Gegner-Ward-Pools (`ENEMY_WARD_HP_FRACTION 0.3·maxHp` = 16–26 @L45) sind kleiner als ein Spielertreffer → Pool bricht in 1–2 Hits, die Staff-wb0.30-vs-Wand-wb0.20-Differenz gibt 0 spürbaren TTK-Vorteil (der schnellere Wand tötet Ward-Gegner sogar fixer). Mechanik korrekt (Guard grün), aber vom Waffentempo überstimmt. Erwägen: höhere `ENEMY_WARD_HP_FRACTION` auf ward-defenseType-Gegnern ODER wardBreak als Signatur überdenken.
- **F2 (MEDIUM · logic-dev):** CL-Parität-Lücke — `combatLevel` (`packages/engine/src/dungeon.ts:26`) schließt `warding` aus dem `defensiveBase` aus. Ein reiner Magier liegt ~11 CL unter Melee/Ranged desselben Tiers (34 vs 45); maxed cappt er ~CL75 statt 99 (Dungeon-Gate idol_sanctum 99 nur erreichbar, wenn er off-class `defence` grindet). Symmetrie-Fix: `warding` (Mage-Defensiv-Skill, ex-`magic_def`) in `defensiveBase` aufnehmen — beim Rename `magic_def→warding` offenbar übersehen.
- **F3 (LOW–MEDIUM · content-dev):** Content-Lücke im L40–55-Band: kein fightable **ward**-defenseType-Gegner (nächster L30/L60), und alle in-band **DoT**-Mobs sind slayer-gegatet. Ein on-band-Magier begegnet in seinem Band weder einem Ward-Gegner noch einem nicht-slayer-DoT-Gegner → das Trinität-/wardBreak-Erlebnis fehlt genau in diesem Band. Erwägen: einen normalen (nicht-slayer) Ward-Caster-Gegner L44–48 ergänzen.
- **F4 (WATCH · combat-dev):** DEF-Stance-Ward self-sustained gegen triviale on-band-Mobs auf 90 % (0 Food, 0 Tode). Innerhalb Erwartung (nur triviale Ziele, −15 % Cast-Schaden), aber beobachten, falls der Warding-Ward-Regen je erhöht wird.

## Verdict
**SHIP (magic L45).** Chef-Ziel „schwer aber fair, Vorbereitung nötig" erfüllt: Food gegen härtere/DoT-Gegner klar nötig (23–28 deaths/h ohne), Ward-Self-Sustain im Offensiv-Modus nicht zu stark (It2.1-Nerf greift), nackt = Suizid (242 deaths/h) / Rüstung senkt Food ×190 → Vorbereitung massiv belohnt. Alle 3 defenseTypes killbar, kein Stalemate, Stil-EHP/DPS-Parität @L45 gut (±6 % / ±3 %). Zwei mittlere Balance-Flags für Folge-Iterationen (F1 wardBreak-quasi-tot, F2 CL-Asymmetrie) — kein Blocker, kein Fix in diesem Sweep.
