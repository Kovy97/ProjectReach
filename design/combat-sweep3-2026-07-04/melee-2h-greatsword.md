# Combat-Sweep 3 — STIL=MELEE, WAFFE=2H-Greatsword — Bänder L15 / L45 / L90

Stand 2026-07-04 · Tester: kontrolleur (Combat-Balance) · **READ-ONLY** (Wegwerf-Harness `_tmp_s3_gs_*` gelaufen & gelöscht; kein Spiel-Code geändert) · **Kein Fix**
Methodik: echte Engine (`SimPlayer`→`equipItem`→`startCombat`→`advance` in TICK_MS=100-Schritten), 100 % Kampf, **Spielzeit** 30 min/Lauf, Auto-Eat Tier 0 (Schwelle 50 %) + Auto-Trank (Schwelle 40 %), Kill-Cooldown 5 s. Kills/h, endHp%, deaths = **Mittel bzw. Summe aus 3 Seeds** (1/7/42); minHp% = tiefster Boden über alle Seeds (per-Tick abgetastet). Held: Melee, `attack=power=defence=vitality=Bandlevel` (Hybrid-Progression treibt Attribute), attack-Stance. `slayer=99` nur um Tower-Etagen freizuschalten (kein Kampf-Stat-Effekt, nicht in combatLevel).

**#231 verifiziert appliziert** im Content (`iron_greatsword 3.9/7.3`, `mithril 8.1/15.2`, `aetherium 20.1/37.1` = Spec §1.2 exakt). Greatsword-Interval 3150, **keine** Signatur (armorPen/precision/wardBreak = 0 — „reiner Stat-Stick", Spec §1.1). 2H trägt **kein** armorRating (Glass-Cannon seit #221).

Gear/Band: L15=iron, L45=mithril, L90=aetherium. Rüstung = 5 Platten (`<tier>_fullhelm/platebody/platelegs/gauntlets/sabatons`). 2H = `<tier>_greatsword`; Vergleich 1H = `<tier>_sword` + `<tier>_kiteshield`. Food/Trank je Band (proportional gewählt, **nicht** Best-in-Game): L15 `cooked_salmon` (h6) + `potion_heal` (h9); L45 `cooked_lobster` (h8) + `potion_greater_heal` (h15); L90 `cooked_soulfish` (h27) + `godbloom_infusion` (h46).

---

## VERDIKT: **SHIP** — die 2H-Glass-Cannon ist sauber getunt

Das #231-Tradeoff **greift und fühlt sich richtig an**: das Greatsword killt on-tier spürbar schneller (+6…+22 % Kills/h auf Mobs mit echter HP, ~+25 % Papier-DPS) und ist dafür dramatisch squishiger — die EHP-Lücke zu 1H+Schild **wächst mit dem Tier** (1H +47 % → +71 % → +104 % EHP). „Schwer aber fair": **on-tier + vorbereitet = 0 Tode** (beide Waffen), **over-level oder unvorbereitet = das Greatsword wird 2–6× härter bestraft als 1H+Schild.** Killbar gegen alle 3 Gegner-defenseTypes an allen Bändern. Kein Absturz, kein Progressions-Wall on-tier. Zwei kleine Balance-Nits (P2/P3) + eine Content-Coverage-Lücke (P4) — keiner blockt den Greatsword-Ship.

---

## Stat-Readout (computeStats, attack-Stance)

| Band | Build | maxHp | Ø-Hit / Interval | **Papier-DPS** | mit% | block% | armorRating | **EHP** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| **L15** | 2H-GS | 43.2 | 11.4 / 2950 | **3.98** | 28.6 | 0 | 50.1 | **60.5** |
| | 1H+Schild | 47.2 | 8.4 / 2700 | 3.18 | 32.6 | 24.8 | 60.5 | **88.7** |
| | 2H UNARMORED | 23.2 | 8.4 / 2950 | 2.93 | 0 | 0 | 0 | 23.2 |
| **L45** | 2H-GS | 80.2 | 25.1 / 2830 | **9.26** | 36.4 | 0 | 71.5 | **126** |
| | 1H+Schild | 92.2 | 18.5 / 2580 | 7.42 | 40.4 | 33.2 | 84.7 | **215** |
| | 2H UNARMORED | 46.2 | 18.1 / 2830 | 6.61 | 0 | 0 | 0 | 46.2 |
| **L90** | 2H-GS | 175.7 | 60.5 / 2590 | **26.05** | 49.4 | 0 | 122.0 | **347** |
| | 1H+Schild | 197.7 | 44.4 / 2340 | 20.76 | 53.4 | 47.2 | 143.2 | **709** |
| | 2H UNARMORED | 81.7 | 40.4 / 2590 | 16.54 | 0 | 0 | 0 | 81.7 |

EHP = maxHp / Pro-Treffer-Faktor. 2H-Faktor `(1−mit)`; 1H-Faktor `(1−mit)(1−block·0.85)`.
**Papier-DPS-Prämie 2H/1H: L15 ×1.25 · L45 ×1.25 · L90 ×1.26** — konsistent ~+25 % (= #231-Ziel-Oberkante).
**EHP-Prämie 1H/2H: L15 +47 % · L45 +71 % · L90 +104 %** — die 2H-Squishiness eskaliert mit dem Tier (Block skaliert 24.8→47.2 %, dazu Schild-armorRating + mehr maxHp = dreifacher Defensiv-Vorteil, den das 2H strukturell nicht hat).

---

## (1) Glass-Cannon-Feel: mehr Schaden, mehr Risiko? — **JA, lehrbuchmäßig**

**Killt schneller (on-tier, prepared, Kills/h — MATRIX A):**

| Band | Mob (defType) | 2H-GS | 1H+Schild | **2H/1H** |
|---|---|---:|---:|---:|
| L15 | goblin (armor) | 329 | 329 | ×1.00 |
| L15 | goblin_rogue (evasion) | 291 | 241 | **×1.21** |
| L15 | goblin_shaman (ward) | 236 | 210 | **×1.12** |
| L45 | rootling_grunt (armor) | 272 | 257 | **×1.06** |
| L45 | pitch_beetle (evasion) | 186 | 165 | **×1.13** |
| L45 | tower_ember_elemental (ward) | 321 | 278 | **×1.15** |
| L90 | dread_knight (armor, regen0.4) | 357 | 306 | **×1.17** |
| L90 | gray_wolf (evasion, hp52) | 297 | 313 | ×0.95 |
| L90 | skeleton_nekro (ward, hp281+ward84) | 123 | 101 | **×1.22** |

2H schlägt 1H in **7/9** on-tier-Matchups (+6…+22 %). Die zwei Ausnahmen sind **one-shot-bare Niedrig-HP-Mobs** (goblin hp15, gray_wolf hp52): wenn beide Waffen den Mob in 1 Schlag legen, gewinnt die **schnellere** 1H (überschüssige 2H-DPS = Overkill). → **#231 zahlt real aus, sobald der Mob genug HP hat; der größte 2H-Vorsprung liegt genau auf den HP-/Ward-schwersten „DPS-Check"-Mobs** (skeleton_nekro +22 %, dread_knight +17 %) — die Glass-Cannon-Nische. **Alle deaths = 0** (prepared on-tier = sicher).

**Deutlich squishiger, stirbt ohne Prep schneller (MATRIX B, primary on-tier, restart=false, TTD):**

| Band | Config | 2H-GS TTD | 1H+Schild TTD |
|---|---|---:|---:|
| L45 | ARMOR-ONLY (kein Food/Trank) | **15 s** (1 Kill) | 29 s (2 Kills) |
| L90 | ARMOR-ONLY | **5 s** (0 Kills) | 14 s (0 Kills) |
| L90 | UNARMORED (+Food+Trank) | stirbt 3/3, Ø 220 s | stirbt 2/3, Ø 1221 s |

Ohne Heilquelle hält das 2H **~½ (L45) bzw. ~⅓ (L90) so lang** wie 1H+Schild. Am L15-Band (goblin dmg7) ist der Mob zu schwach, um den EHP-Unterschied zu zeigen (2H hält dort durch schnellere Kills sogar minimal länger). **Der Tradeoff lohnt (mehr Kills) und ist gefährlich (viel weniger Puffer) — genau wie gewünscht.** ✅

---

## (2)+(3) FAIR mit Prep, harte Strafe ohne — Vorbereitung lohnend & nötig (Einzelvariablen)

**Prep-Ablation, primary on-tier Mob, 2H-GS (restart=false → TTD; MATRIX B):**

| Band | PREP | ARMOR-ONLY | UNARMORED(+Food+Trank) | NAKED |
|---|---|---|---|---|
| L15 (goblin) | überlebt (164 K) | **†42 s** | überlebt (155 K) | **†14 s** |
| L45 (rootling_grunt) | überlebt (136 K) | **†15 s** | **†229 s** (15 K) | **†3 s** |
| L90 (skeleton_nekro) | überlebt (61 K) | **†5 s** | **†220 s** (5 K) | **†5 s** |

Sauberes, gestaffeltes Prep-Ökonomie-Bild:
- **Rüstung nötig** (L45/L90): unarmored stirbt (2H hat **kein** Schild als Fallback — anders als 1H, dessen „unarmored" den Schild behält). Am L15 lässt der schwache Mob es durchgehen.
- **Mindestens EINE Heilquelle nötig** (alle Bänder): **ARMOR-ONLY** (Platte, aber weder Food noch Trank) **stirbt überall** (†5–42 s). Food ODER Trank allein (mit Rüstung) reicht on-tier zum Überleben → die zweite Heilquelle ist **Versicherung**, nicht Pflicht on-tier.
- **NAKED = reiner Suizid** (†3–14 s). ✅
- **PREP (Platte + Food + Trank) = 0 Tode on-tier, komfortabler endHp-Boden** (51–63 %) → **fair**. ✅

**Fazit:** „mit Food+Rüstung machbar, ohne = harte Strafe" ist exakt erfüllt. Jede Prep-Achse ist einzeln spürbar; keine ist Deko.

---

## (4) Killbar gegen alle 3 Gegner-defenseTypes? — **JA an allen Bändern**

MATRIX A: prepared 2H killt `armor`, `evasion` UND `ward` an L15/L45/L90 bei **0 Toden** und positiver Kill-Rate. Weil das Greatsword **keine Konter-Signatur** trägt (armorPen/precision/wardBreak = 0, per §1.1 gewollt), sieht es gegen jeden Typ die **volle** Gegner-Verteidigung — es brute-forced alle drei gleich, ohne Nische:
- vs `armor` (dread_knight def41 → ~25 % Mitigation): 2H rohe-DPS trägt trotzdem (+17 % vs 1H). Der **Maul** (armorPen 0.30) wäre hier die Konter-Waffe — Greatsword bewusst nicht.
- vs `evasion` (gray_wolf eva23): Accuracy-Contest kostet Treffer; da hp niedrig, gewinnt die schnellere 1H knapp (Overkill-Effekt). Der **Speer** (precision) wäre der Konter.
- vs `ward` (skeleton_nekro ward84+hp281): **grindigster Fall** (123 kph — muss den vollen Ward-Pool durchkauen, kein Ward-Break), aber killbar und **+22 % über 1H** (reiner HP-Berg = 2H-DPS-Bestfall). Der **Zauber-brechende** Konter fehlt bewusst.

→ Greatsword = universeller No-Counter-Brute: killt alles, ist gegen `ward` relativ am langsamsten — **intended** (§1.1). ✅

---

## (5) Kills/Zeit + Todesrate: 2H-GS vs 1H+Schild — **#231 bestätigt: 2H mehr DPS, dafür mehr Tode**

**On-tier prepared:** 2H +6…+22 % Kills/h (7/9 Matchups, MATRIX A), beide 0 Tode.

**Over-level Stress (MATRIX D, prepared, 30 min, deaths = Summe 3 Seeds):**

| Band (Stress-Mob) | Waffe | Kills/h | **Tode/3 Seeds** | minHp% |
|---|---|---:|---:|---:|
| L15 (goblin_warlock L30, +15) | **2H-GS** | 129 | **11** | 0 |
| | 1H+Schild | 111 | **0** | 7 |
| L45 (forest_warden L65, +20, enrage, hp216) | **2H-GS** | 55 | **55** | 0 |
| | 1H+Schild | 61 | **9** | 3 |
| L90 (tower_roc_void L94, +4, enrage, eva23) | **2H-GS** | 236 | **0** | 7 |
| | 1H+Schild | 209 | **0** | 16 |

- **+15/+20 over-level:** das 2H **eskaliert die Todesrate** — L15 warlock **11 vs 0**, L45 warden **55 vs 9** (~6×). Bei L45 killt 1H sogar mehr (61 vs 55), **weil das 2H so oft stirbt, dass seine Uptime einbricht.** Das ist der Glass-Cannon-Deal in Reinform: du KANNST mit dem 2H over-level pushen und (L15) mehr farmen, zahlst es aber in Toden; 1H macht dasselbe sicher, aber langsamer.
- **+4 over-level (L90):** prepared beide 0 Tode; 2H killt +13 %, dippt aber tiefer (minHp 7 vs 16) → **spürbar riskanterer HP-Boden** ohne Tode.
- **ARMOR-ONLY vs Stress** (kein Food/Trank): 2H stirbt ~2× so oft wie 1H (L15 144 vs 110, L45 149 vs 88, L90 92 vs 45) — Prep + höhere EHP der 1H addieren sich.

→ Bestätigt #231 **auf beiden Achsen**: 2H = mehr Durchsatz **und** mehr Risiko; 1H+Schild = die sichere, langsamere Defensiv-Linie. Der Tradeoff ist scharf und richtungsstabil.

---

## Befunde (P1–P4)

**P1 — keine (INFO).** Kein Absturz, kein on-tier-Wall, kein Sequenz-Bruch. #231 ist im Content appliziert und liefert die +~25 % DPS / +6–22 % Kills. Glass-Cannon-Identität (kein armorRating, keine Signatur) intakt.

**P2 — LOW (balance-designer):** computeStats-DPS-Prämie 2H/1H liegt bei **×1.25 / ×1.25 / ×1.26** — L90 sitzt **minimal über** dem `weapon-dps-spec` §6-Gate-Deckel „≤ ×1.25". In der Praxis bleibt Kills/h bei +17–22 % (Overkill/Mitigation stauchen), also unkritisch. Falls strikt ≤1.25 gewünscht: aetherium/godiron-greatsword `damageMax` einen Hauch trimmen. Kein Gameplay-Problem. *Owner: balance-designer (Kalibrierung).*

**P3 — LOW/MEDIUM (content-dev/balance-designer):** **Endgame-Heiltrank-Lücke.** Dedizierte Heiltränke enden bei `potion_potent_heal` (h24 = ~13 % der L90-2H-HP von 176); der nächste Heilwert ist `godbloom_infusion` (h46), dann direkt `bloodmend_draught` (h220 = **Voll-Heal+**). Zwischen 46 und 220 klafft nichts → Auto-Trank ist am L90 entweder fast wirkungslos (24) oder ein Full-Heal (220, macht sogar unarmored überlebbar). Betrifft die **Prep-Kalibrierung** am Endgame (nicht das Greatsword). Empfehlung: einen Mid-Endgame-Trank (~80–100 Heal, ~50 % L90-HP) einziehen ODER `bloodmend_draught` als bewussten Top-Sink markieren. *(Am Rande: der weapon-dps-spec §5.5-Copy-Nit `bloodmend_draught` h22→h220 ist offenbar auf 220 aufgelöst — bestätigt.)* *Owner: content-dev.*

**P4 — INFO/LOW (content-dev):** **Non-Tower-Coverage-Lücke nach defenseType.** Es gibt keinen farmbaren (nicht-Tower/nicht-slayreq) **`ward`**-Mob zwischen L18 (goblin_shaman) und L85 (skeleton_pyroclasp), und keinen nicht-Tower **`armor`**-Mob nahe L90 (dread_knight L82 = Tower, abyssal_devourer L96 = slayreq). Für diesen Sweep über `slayer=99` (Tower entsperrt) umgangen — aber ein reiner Nicht-Slayer-Spieler hat am L45-Band **kein** Ward-Ziel und am L90-Band **kein** Armor-Ziel außerhalb des Towers. Kein Greatsword-Balance-Belang; betrifft die „killbar gegen alle 3 Typen"-Zugänglichkeit ohne Slayer. *Owner: content-dev (Zonen-Bestückung).*

---

## Empfehlung
**SHIP.** Das 2H-Greatsword erfüllt Chef-Ziel und #231 an allen drei Bändern: schneller (echte, mit der HP wachsende DPS-Prämie), gefährlicher (EHP-Lücke +47→+104 %, Todesrate over-level/unprepared 2–6× über 1H), fair (on-tier + Food + Rüstung = 0 Tode), hart bestraft ohne Prep (Rüstung + eine Heilquelle sind einzeln nötig; naked = †3–14 s), und killbar gegen armor/evasion/ward. P2 (marginaler DPS-Deckel) und P3 (Endgame-Trank-Lücke) sind optionale Balance-Nachschärfungen für balance-designer/content-dev, P4 eine Zonen-Coverage-Notiz — **kein Blocker für das Greatsword.**
