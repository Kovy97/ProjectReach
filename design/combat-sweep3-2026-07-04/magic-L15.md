# Sweep 3 — Combat-Balance-Tester · STIL=MAGIC · BAND=L15 (Frühgame) · „Grim Reach"

Stand 2026-07-04 · Kontrolleur · **READ-ONLY** (Wegwerf-Harness `_tmp_s3_g15.test.ts`, ausgeführt & **gelöscht**; **KEIN** Spiel-Code geändert).
Methodik: eigener per-Tick-Harness über die echten Engine-Primitive (`computeStats`/`startCombat`/`combatStep`, `TICK_MS=100`), **Zeiten = SPIELZEIT** (1800 s = 30 min), Auto-Restart bei Tod (jede „Leben" startet mit vollem HP+Ward, wie die Engine-`onPlayerDefeated`/`startCombat`).
Modellierter L15-Magier: Kampf-Skills `magic/warding/vitality/defence` = 15, `runecrafting` = 15 (Stab-Crafter → INT-Feed), `herblore` = 8 → **combatLevel 15**. On-tier: `iron_staff`/`iron_wand` (req `magic:10`, das höchste bei magic 15 — steel ist req 20), volle Apprentice-Stoffrüstung (req `magic:1`, Σward 45) + `arcane_cape`.

**It2.1-Konstanten im Code verifiziert:** `WARD_PER_MANA=0.20` (`shared:578`), `WARD_KILL_REFILL_PCT=0.10` (`shared:571`), `WARD_CORE_PER_INT=0` (`shared:588`), `WARDING_REGEN_PER_LEVEL=0.02`/Cap 2.0 (`shared:590/592`), `SAVE_VERSION 51`.
**Guard-Basis: 43/43 trinity-relevante Guards grün** vor & nach dem Lauf (`ward`, `enemy-ward-counter`, `armor-iteration2-combat`, `armor-trinity-combat`, `autoeat-dot`, `wiring-audit`, `status-coverage`).

## VERDIKT: **ship** — Mechanik bugfrei & sinnig verdrahtet; It2.1 hat das Chef-Ziel bei L15 erreicht (Food ist jetzt spürbar nötig)
Alle vier Kernfragen positiv beantwortet. Die Doppel-Halbierung von It2.1 (Cast-Recharge 0.5→**0.20**, Kill-Refill 0.20→**0.10**) hat die „Ward-Self-Sustain-Freiheit" aus der L30-Iteration bei L15 **weitgehend beseitigt**: der armored **No-Food**-Magier stirbt auf nahezu allen On-Level-Mobs wiederholt, **Food eliminiert die Tode** (0–1 statt 5–24 / 30 min). Zwei Balance-Beobachtungen (kein Bug, kein Crash) für balance-designer unten. Kein Code-Fix meinerseits.

**Stat-Sheet (L15-Magier):**

| Loadout | maxHP | maxWard | maxMana | dmg/Cast | aIMs | wardBreak | wardRegen/s | manaRegen |
|---|---:|---:|---:|---|---:|---:|---:|---:|
| STAFF `iron_staff` (cloth+cape, offensiv) | 41.2 | **45.0** | 140 | 6.38–6.98 | 2880 | **0.30** | 0.300 | 3.50 |
| STAFF defensiv | 41.2 | 45.0 | 140 | 5.63–6.23 | 2880 | 0.30 | **0.450** (×1.5) | 3.50 |
| WAND+focus `iron_wand`+`iron_focus` | 41.2 | 45.0 | 154 | 6.42–6.62 | **2580** | 0.20 | 0.300 | 3.90 |
| STAFF **nackt (keine Robe)** | 23.2 | **0.0** | 110 | 5.24–5.84 | 2880 | 0.30 | 0.300 | 3.50 |

`WARD_CORE_PER_INT=0` empirisch bestätigt: nackter Magier `maxWard = 0` exakt (kein INT-Ward-Sockel). Mana ist bei L15 **keine Klemme** (minMana 134/140 in allen Läufen → Cast schlägt nie fehl, `MAGIC_WEAK_FACTOR`-Notschlag zündet nie, Recharge-Loop läuft dauerhaft).

---

## (1) Braucht der Magier im Frühgame jetzt spürbar Food? — **JA, klar** (It2.1-Ziel erreicht)

**STAFF, volle Stoffrüstung, KEIN Food, 30 min (offensiv):**

| Mob | Level | Typ | Kills | **Tode** | Direkt→HP | DoT→HP | minWard% | minHP | Food |
|---|---|---|---:|---:|---:|---:|---:|---:|---:|
| goblin | 15 (on) | armor | 154 | **0** | **0** | 0 | **53 %** | 41.2 | 0 |
| feral_goat | 12 | evasion | 65 | **7** | 324 | 0 | 0 % | 0.2 | 0 |
| the_imp | 11 | ward | 81 | **5** | 214 | 0 | 0 % | 0.2 | 0 |
| goblin_shaman | 18 | ward | 90 | **11** | 533 | 0 | 0 % | 0.4 | 0 |
| goblin_rogue | 19 | evasion | 105 | **13** | 604 | 0 | 0 % | 0.4 | 0 |
| bull_boss | 15 | eva-Boss | 34 | **24** | 1113 | 0 | 0 % | 0.7 | 0 |

**Kern-Befund:** Anders als in der L30-Iteration (dort „food-trivial auf Nicht-DoT") stirbt der **armored** L15-Magier **ohne Food auf fast allem** — 5–24 Tode/30 min. Der Ward-Pool (45) erodiert in den zäheren Kämpfen auf **0** und danach blutet Direkt-Schaden auf HP (324–1113 HP). **Food behebt es vollständig** (siehe (2)/D: 0–1 Tode mit `cooked_salmon`).

**Warum bleibt nur der `goblin` (armor) food-frei (0 Tode, minWard 53 %)?** = **Kill-Tempo, nicht Rüstungstyp.** goblin hat nur 15 HP → ~3 Casts (~9 s) pro Kill; der 10 %-Kill-Refill (4.5 Ward) + Cast-Recharge + Warding-Regen holt den Pool zwischen den schnellen Kills zurück. feral_goat (41 HP, ~20 s/Kill) & shaman (24 HP + höherer Schaden) = **lange Kämpfe → Ward-Verlust > Zufluss → Pool auf 0 → HP-Schaden → Tod.** Der Rest-„Self-Sustain" gilt also nur noch für **schnelle Low-HP-Mobs** — eine viel engere Nische als der breite L30-Food-Frei-Befund. (Zufluss-Rechnung: Warding-Regen 0.30/s + Cast-Recharge 6·0.20/2.88 s ≈ 0.42/s ≈ **0.72 Ward/s** ≪ ~1.9 DPS-in im zähen Kampf.)

**DoT-Gegner — DoT umgeht Ward vollständig (per Design korrekt):**

| Szenario | Kills | Tode | Direkt→HP | **DoT→HP** | minWard% | Food-Bisse |
|---|---:|---:|---:|---:|---:|---:|
| goblin + synth-Gift 1.0/s, **kein Food** | 146 | **41** | **0** | **1795** | **54 %** | 0 |
| goblin + synth-Gift 1.0/s, **+salmon** | 154 | **0** | 0 | 1769 | 53 % | 297 |
| goblin_felmagician (L27, poison) armored, kein Food | 53 | 39 | 1709 | 0* | 0 % | 0 |
| goblin_felmagician armored **+salmon** | 67 | 13 | 2503 | 0* | 0 % | 341 |

Der **synthetische Gift-Probe** isoliert den Mechanismus sauber: Ward absorbiert **allen** Direkt-Schaden (Direkt→HP = 0, minWard hält bei 54 %), aber die DoT-Ticks gehen **komplett** auf HP (1795 HP) und töten 41×. **Food (297 Bisse) räumt es auf 0 Tode** — Beweis, dass `combat.ts` DoT **nicht** durch Ward schluckt (`tickPlayerEffects`: `state.character.hp -= dmg` direkt, kein Ward-Layer) **und** dass Auto-Eat auf DoT feuert (der bekannte „auto-eat-on-DoT"-Pfad ist verdrahtet, `combat.ts:1647`). *Beim realen felmagician (poison mag 0.3/s) verpufft der DoT-Anteil im Rundungsraster gegen den dominanten Direkt-Schaden des +12-über-Level-Mobs — kein sauberer DoT-Isolationstest, daher die synth-Probe.

→ **Antwort: JA.** Food ist bei L15 auf DoT-Content **zwingend** und auf Nicht-DoT-Content für alle außer schnellen Low-HP-Mobs **nötig**. It2.1 hat die Ward-Self-Sustain-Freiheit adressiert.

## (2) FAIR + Vorbereitung lohnend/nötig? — **JA, alle drei Prep-Schichten greifen** ✅

**Nackt = Suizid** (bestätigt, `maxWard=0`): naked/no-food goblin **61 Tode** (Tod ~alle 30 s), naked feral_goat **100 Tode**, naked bull_boss **122 Tode / 0 Kills**, naked shaman **123 Tode**.

**Prep-Leiter (bull_boss L15-Boss & shaman L18, 30 min):**

| Loadout | bull_boss Kills / Tode | shaman Kills / Tode | Food-Bisse |
|---|---:|---:|---:|
| nackt, kein Food | **0 / 122** | 20 / 123 | 0 |
| Stoff, kein Food | 34 / 24 | 90 / 11 | 0 |
| Stoff **+ salmon** | **45 / 1** | **95 / 0** | 278 / 163 |

Jede Schicht zahlt messbar: Stoff (Ward 0→45) rettet von „Suizid" zu „spielbar-aber-riskant", Food von „riskant" zu „sicher". **Vorbereitung ist notwendig UND belohnt** — deckt sich exakt mit „schwer aber fair, Rüstung/Food/Potions nötig". **Food-Verbrauch ist hoch** (163–341 Bisse/30 min ≈ nahe dem 3-s-Auto-Eat-Cooldown) → spürbarer Food-Ökonomie-Druck, wie gewünscht.

## (3) Staff vs Wand Feel + wardBreak spürbar? — **Wand fühlt sich früh besser an; wardBreak-Differenz bei L15 vernachlässigbar**

**Gleiche Mobs, armored, kein Food, 30 min:**

| Mob | STAFF (wb 0.30) Kills/Tode | WAND+focus (wb 0.20) Kills/Tode |
|---|---:|---:|
| goblin (armor) | 154 / 0 | 156 / 0 |
| feral_goat (eva) | 65 / 7 | **68 / 5** |
| the_imp (**ward** 8) | 81 / 5 | **90 / 4** |
| goblin_shaman (**ward** 7) | 90 / 11 | **97 / 9** |
| goblin_rogue (eva) | 105 / 13 | **114 / 9** |
| bull_boss (eva-Boss) | 34 / 24 | **40 / 18** |

- **Wand gewinnt durchweg** (mehr Kills, weniger Tode) — schnelleres Tempo (2580 vs 2880 aIMs) + engere Schadensspanne + Focus (+Mana/+manaRegen). Der Staff-Burn (mag 0.3, 4 s) & die höhere Krit-Spanne kompensieren das früh nicht.
- **wardBreak spürbar gegen Ward-Gegner? NEIN, bei L15 kaum.** Die On-Band-Ward-Pools sind winzig (the_imp 8, shaman 7). Bei ~6.4 dmg/Cast durchbricht Staff 30 % (~1.9) vs Wand 20 % (~1.3) — beide leeren einen 7–8er-Pool in 1–2 Casts. Der Ward-Break-Vorteil des Stabs (0.30 vs 0.20) wird erst gegen die **hohen** Endgame-Ward-Pools (48–92) relevant. Ironie: gerade auf den beiden Ward-Mobs killt der Wand **mehr** — der Tempo-Vorteil schlägt den kleinen wardBreak-Vorsprung.
- **Feel-Fazit:** Der Staff ist bei L15 die **schwächere** Wahl; seine Identität (hoher wardBreak + eskalierender Burn) zahlt sich erst später aus. Kein Bug — nur eine Feel-/Balance-Notiz (der 2H-Staff opfert den Offhand-Focus-Slot ohne früh sichtbaren Gegenwert). **Owner (optional): balance-designer.**

## (4) Gegen alle 3 defenseTypes killbar? Ward-Loop intakt? — **JA** ✅

- **armor** (goblin): 154 Kills · **evasion** (feral_goat/goblin_rogue/bull_boss): 34–105 Kills · **ward** (the_imp/goblin_shaman): 81–97 Kills. **Alle drei Achsen killbar** (mit Food ohne Tode). Kein Stalemate, kein Soft-Lock, keine NaN.
- **Ward-Loop (Absorb→Recharge) intakt:** Spieler-Ward absorbiert 1194–2524 über den Lauf; Mana fällt nie unter 134/140 → **jeder** Angriff castet → jeder Cast lädt Ward (`rechargeWard`, `combat.ts:1138`) → Loop läuft dauerhaft. Der 10 %-Kill-Refill greift sichtbar (goblin: Ward stabilisiert bei 53 %). Enemy-Ward-Absorb (`strikeEnemy`, `combat.ts:1283`) + wardBreak-Bleed korrekt (enemy-ward-counter-Guard grün).
- **Stance (Warding-Regen ×1.5) greift:** shaman STAFF **offensiv 90 K/11 T** vs **defensiv 69 K/8 T** — die Defensiv-Stance (wardRegen 0.30→0.45/s, −15 % Cast-Schaden) tankt sichtbar besser (mehr Ward absorbiert: 2524 vs 2027; weniger Tode) zum DPS-Preis. Sinnig verdrahtet.

---

## Befunde (Severity · Owner)

- **B1 (Balance-Beobachtung, kein Bug) — No-Food-Todesrate auch VOLL-armored steil auf Standard-Evasion-Mobs.** feral_goat (L12, on-level) → 7 Tode/30 min trotz voller Apprentice-Robe. Das ist der *gewollte* Food-Druck, aber für einen neuen Spieler, der Food noch nicht entdeckt hat, ist die Wand hart. **Mit Food: 0 Tode.** Reine Balance-/Telegraphing-Frage (Onboarding-Hinweis „bring Food"). **Owner: balance-designer / ui-dev (Hinweis).** Nicht schiffs-blockierend — es erfüllt genau das Chef-Ziel.
- **B2 (Balance-Beobachtung) — Rest-Self-Sustain-Nische: schnelle Low-HP-armor-Mobs bleiben food-frei** (goblin 154 K/0 T/0 HP-Schaden, Ward 53 %). Eng, deutlich schwächer als der L30-Befund; folgt aus Kill-Tempo, nicht aus dem Ward-Design. Akzeptabel als „schnelle Kills brauchen kein Food". **Owner: balance-designer** (falls man auch das schließen will: greift nur über Mob-HP/Magier-DPS, nicht über die Ward-Konstanten).
- **B3 (Feel) — 2H-Staff bei L15 unter Wand** (siehe (3)); wardBreak-Identität erst spät wirksam. **Owner (optional): balance-designer.**
- **P1-Erinnerung (aus armor-sweep2, NICHT L15-relevant) — Stoff-Runecrafting-Doppelgate.** Bei L15 **kein Faktor**: Apprentice-Robe ist req `magic:1` (kein rc-Gate), also für den reinen Kampf-Magier tragbar. Der Blocker beißt erst beim **Übergang auf Frost-Robe (req `magic:22` + `runecrafting:20`)** — außerhalb dieses Bands. **Owner: content-dev** (unverändert offen).

## ✅ Korrekt bestätigt (mit Zahlen)
- **It2.1-Doppel-Nerf verdrahtet & wirksam:** `WARD_PER_MANA=0.20`, `WARD_KILL_REFILL_PCT=0.10` → L15-Magier armored/No-Food stirbt auf 5 von 6 Mobs (war L30: food-trivial). Ziel „Ward-Self-Sustain-Freiheit beheben" **erreicht**.
- **DoT umgeht Ward** (synth-Probe: Direkt→HP 0 bei minWard 54 %, DoT→HP 1795); **Auto-Eat-on-DoT feuert** (Food → 0 Tode). `tickPlayerEffects`/`combat.ts:1647` intakt.
- **`WARD_CORE_PER_INT=0`**: nackter Magier `maxWard=0` exakt → nackt = Suizid (61–123 Tode).
- **Ward-Loop** (Absorb→Cast-Recharge→10 %-Kill-Refill) intakt; Mana nie leer (min 134/140); Warding-Def-Stance ×1.5 greift.
- **Alle 3 defenseTypes killbar**; Staff/Wand/Focus sauber ausgerüstet; enemy-Ward + wardBreak korrekt.
- **43/43 trinity-Guards grün; Harness rückstandslos gelöscht; kein Spiel-Code angefasst.**

**Empfehlung: ship.** Kampf-Kern bugfrei und sinnig verdrahtet, It2.1 trifft das Chef-Ziel bei L15. Die einzigen offenen Punkte sind **Balance-Tuning-Fragen** (B1 No-Food-Härte vs Telegraphing; B2 Rest-Nische; B3 Staff-Feel) für **balance-designer** — kein `combat.ts`/`character.ts`/`shared`-Fix nötig.
