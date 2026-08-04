# Phase C — Combat-Tester · RANGED · Band L90 (Endgame) · Rüstungs-Trinität

Stand 2026-07-03 · Kontrolleur (Combat-Tester) · **HEADLESS** (createGame/computeStats/advance, Zeiten = SPIELZEIT) · KEIN Spiel-Code geändert · Wegwerf-Harness `_tmp_cR90_*` gelaufen & gelöscht.
Loadout: **BiS Leder+Bogen für die R90-Sprosse** = `wraithhide`-Set (leatherworking 90) + `aetherium_longbow` (ranged 90) + `aetherium_arrow`, alle Kampf-Skills = 90. Gegner: die 4 Idol-Hall-Endbosse (L245–295) + `void_titan` (L242) als 5. Referenz. Fenster: 30 min/Seed, Seeds {1..8} = **4 h Spielzeit je Zelle**.

## VERDIKT: **SHIP (Ranged-Endgame ist solide) — 1 kleiner Content-Fix davor/parallel**
Kein P1/P2-Blocker im Ranged-Pfad. Dodge wirkt exakt auf Spec (73 %), der One-Shot-Cap greift gegen die Enrage-Bosse und verhindert echte One-Shots, alle 4 Idol-Hall-Endbosse mit BiS-Food **0 Tode über je 4 h**. Stil-Parität trifft das Gate (**Leder −3,5 %**). **Ein echter Befund (P3, Content):** das für die R90-Sprosse frisch angelegte L90-Leder-Tier `wraithhide` (und das L90-Stoff-Tier `starweave`) sind **nicht in `content.sets` registriert** → sie geben KEINEN Set-Bonus, während die on-band-Platte (`aetherium_set`) einen `{str12,con13,lck6}`-Bonus (+26 maxHp) trägt. Das drückt Leder von den intendierten +5 % auf −3,5 %.

---

## Die 4 Gate-Fragen (mit Zahlen)

### (1) Evasion nahe Cap (75 %)? Varianz/One-Shot im Endgame gefährlich? — **73 % (nicht am Cap); Varianz real, aber gedeckelt**
`computeStats`, echte wraithhide-Werte (Σ evasionRating = 14,6+21,9+16,06+10,22+10,22 = **73,0**):

| Wert | Ranged L90 BiS |
|---|---:|
| maxHp | **149,7** |
| dodgeChance (Leder, Voll-Vermeidung) | **73,0 %** (Cap 75 %, **2 pp Luft**) |
| evasion (Accuracy-Contest, DEX-Kern) | 12,1 → Gegner-Trefferchance nach Dodge ~54–61 % |
| **reale Gesamt-Vermeidung** (Dodge + Contest) | **≈ 85 %** → nur ~15 % der Schläge landen |
| defense / Mitigation | 0,00 / **0 %** (Leder trägt kein armorRating — korrekt) |
| maxWard (INT-Sockel) | **14** ← `WARD_CORE_PER_INT`-Leak (P3, s.u.) |
| Schaden min/Ø/max · aIMs · Krit | 26,8 / 29,1 / 31,4 · 1368 ms · 23,2 % |

- **Nicht am Cap:** 73 % bei R90; die 75 %-Deckelung erreicht erst das L99-Tier `voidhide` (Σ evasionRating > 75). Bei R90 also 2 pp Headroom — sauber.
- **One-Shot-Cap greift und ist HIER bindend:** kein Einzeltreffer > `0,5·maxHp = 74,8`. Gegen die Nicht-Enrage-Bosse liegt der Roh-Max-Hit bei 40–44 (≈ 30 % HP, **4** gelandete Treffer bis Tod, Cap nicht bindend). Gegen die **Enrage-Bosse** (`last_idol`, `void_titan`) ist der Roh-Max-Hit ×1,75 = **83 / 80,4** → **gekappt auf 74,8 = exakt 50 % maxHp** → **2** gelandete Treffer bis Tod. Der Cap tut also genau seinen Job: kein echter One-Shot, aber „zwei aus vollem Leben" im Enrage ist der Gefahren-Vektor.
- **Varianz-Verdikt:** Da nur ~15 % der Schläge landen (Dodge 73 % + Contest) und Auto-Eat 3 s taktet, ist der „2 gekappte Enrage-Treffer im selben 3-s-Fenster"-Fall selten — mit BiS-Food/Auto-Eat T3 **0 Tode** (s. Frage 4), mit schwächerem Setup vereinzelt tödlich (s. Frage 2). Die RNG-Dodge-Varianz ist real, aber durch One-Shot-Cap + Auto-Eat **gebändigt**, nicht katastrophal.

### (2) Food nötig? — **JA, PFLICHT und nicht-trivial** (anders als Melee: kein Lifesteal)
4 h/Boss, Seeds 1–8. `minHP%` = tiefster HP-Stand über alle Seeds:

| Boss (Lvl) | BiS-Food¹ T3 | Casual² (Food, T0=50 %) | Mid-Food³ T3 | **OHNE Food** |
|---|---|---|---|---|
| idol_warden (245) | 0 Tode, 40,7 % | 0 Tode, 40,7 % | 0 Tode, 24,7 % | **34 Tode** |
| aether_wraith (260) | 0 Tode, 40,1 % | 0 Tode, 40,1 % | 0 Tode, 24,0 % | **48 Tode** |
| scale_skarn (275) | 0 Tode, 39,4 % | 0 Tode, 39,4 % | 0 Tode, 23,4 % | **44 Tode** |
| last_idol (295, enrage) | 0 Tode, 38,1 % | 0 Tode, **8,0 %** | 0 Tode, 18,0 % | **70 Tode** |
| void_titan (242, enrage) | 0 Tode, **16,7 %** | **1 Tod**, 10,0 % | **1 Tod**, 0,7 % | **120 Tode** |

¹ `cooked_soulfish` (27 Heal), Auto-Eat T3 (isst @80 %). ² gleiches Food, Auto-Eat T0 (isst erst @50 %). ³ `cooked_wraithscale` (15 Heal), T3.
- **OHNE Food = Dauertod** (34–120 Tode/4 h, minHP 0,5 %). Ranged hat KEINEN Lifesteal (Melee-Sustain) und Leder KEINE Mitigation → jeder gelandete Treffer ist unmitigierter Voll-Schaden, akkumuliert ⇒ Food strukturell PFLICHT. (Kontrast zum Melee-L90-Sweep, wo Lifesteal Food für 3/4 Bosse vestigial macht — bei Ranged gilt das **nicht**, Spec §7.2 ist hier **erfüllt**.)
- **Nicht-trivial:** analytischer DPS-in 1,15–1,60 HP/s; Soulfish (27/3 s) deckt Steady-State locker, aber die Enrage-Spikes drücken selbst MIT BiS-Food auf 16,7 % (void_titan). Schwächeres Food/Auto-Eat kostet Leben (Casual/Mid: je 1 void_titan-Tod ≈ 0,3 %/Kill; last_idol Casual auf 8 % minHP). Food arbeitet also echt — genau die intendierte Spannung.

### (3) Stil-Parität R90 (Gate: Leder −3 %)? — **GETROFFEN: Leder −3,5 %** (Spec-Formel)
`computeStats`, on-band-Sets bei combatLevel 90, EHP-Formel Spec §7.3:

| Stil (on-band-Set @R90) | maxHp | Schicht | **EHP** | Δ vs Ø |
|---|---:|---|---:|---:|
| **Platte** aetherium (**+Set-Bonus**) | 197,7 | red 55 % · block 40 % | **627** | **+9,2 %** |
| **Leder** wraithhide (**KEIN Set**) | 149,7 | dodge 73 % | **554** | **−3,5 %** |
| **Stoff** godspark (+Set, on-band) | 127,7 | maxWard 414 | **542** | **−5,7 %** |

- **Leder trifft das Gate exakt (−3,5 %)** gegen das on-band-Mittel (575) — deckungsgleich mit GATE-B (Leder −3 %). ✅
- Aber: die **Spanne der 3 Stile = 15,8 %** (> ±10 %), getrieben von der **Platte (+9,2 %)**, nicht von Leder. Ursache: `aetherium_set` gibt +13 con (+26 maxHp), Leder/Stoff-Sets fehlen bzw. sind schwächer.
- **Wichtig — die Spec-Formel unterschätzt Leder:** sie zählt nur Dodge, NICHT die Accuracy-Contest-Vermeidung. Der Ranger hat mit dex 37 die HÖCHSTE Contest-Evasion aller Stile → **reale** Vermeidung **≈ 85 %** ⇒ reale Leder-EHP ≈ `149,7/0,15 ≈ 998` (+ 14 INT-Ward). In echten Kämpfen liegt Leder damit **auf/über Parität**; die −3,5 % sind ein Formel-Artefakt, kein Spielgefühl-Defizit. Die Boss-Kämpfe (Frage 4) bestätigen: Leder überlebt endgame-tauglich.
- Spec **intendiert Leder +5 %** (Varianz-Ausgleich). Formel-Ist −3,5 % ⇒ ~8,5 pp unter Absicht. Hätte `wraithhide` einen aetherium-äquivalenten +13con-Set-Bonus, wäre die Leder-EHP **651 (+13 %)** — würde also ÜBERschießen. Der korrekte Fix ist ein **kleiner** Leder-Set-Bonus (Ziel +5 %), nicht die Kopie des Platten-Bonus. → Content/Balance (s. P3).

### (4) Alle 4 Endbosse killbar, 0 Tode? Dodge-Varianz gegen Bosse? — **JA, mit BiS-Food; 0 Tode/4 h je Boss**
`cooked_soulfish` + Auto-Eat T3, 4 h/Boss (8 Seeds × 30 min):

| Boss (Lvl) | Kills/4 h | Tode | sek/Kill | min-HP |
|---|---:|---:|---:|---:|
| idol_warden (245) | 1012 | **0** | 14,2 | 40,7 % |
| aether_wraith (260) | 873 | **0** | 16,5 | 40,1 % |
| scale_skarn (275, regen 0,6) | 730 | **0** | 19,7 | 39,4 % |
| last_idol (295, regen 1, enrage ×1,75) | 553 | **0** | 26,0 | 38,1 % |
| *void_titan (242, enrage ×1,75)* | *293* | **0** | *49,1* | *16,7 %* |

- **Alle 4 Idol-Hall-Endbosse: 0 Tode über je 4 h**, Ranger-DPS schlägt die Regen der zähen Bosse (scale_skarn/last_idol werden gekillt). Dodge-Varianz zeigt sich als min-HP ~38–41 % (komfortabler Puffer).
- **Dodge-Varianz-Grenzfall = void_titan** (höchste Accuracy 19 → nur ~83,5 % Vermeidung): min-HP **16,7 %** selbst mit BiS-Food, und bei Casual/Mid-Setup je **1 Tod** (≈ 0,3 %/Kill). Kein echter One-Shot (Cap), aber der Boss mit der höchsten Trefferrate + Enrage ist der einzige, der die RNG-Dodge-Varianz spürbar an die Wand drückt. Für die 4 eigentlichen Endbosse unkritisch.

---

## Befunde (Priorität + Owner)

**P1/P2 — keiner.** Kein Blocker und kein Balance-Bug im Ranged-Endgame-Pfad. Dodge, One-Shot-Cap, Ammo-Verbrauch, Auto-Eat: alle korrekt verdrahtet.

**P3 (Content-Wiring) — L90-Gap-Filler-Tiers `wraithhide` (Leder) + `starweave` (Stoff) fehlen in `content.sets` · Owner: content-dev.**
Beide Tiers wurden für die Rüstungs-Trinität-Sprosse R90 als ITEMS angelegt (`index.ts:3227–3251` Leder, `:4186–4215` Stoff), aber **kein zugehöriger Set-Eintrag** existiert — im Gegensatz zu ALLEN anderen Leder-/Stoff-/Platten-Tiers (shadowhide/voidhide/godspark/voidweave/aetherium haben Sets). Folge: ein R90-Ranger im vollen wraithhide-Set bekommt **0 Set-Bonus** (kein con/dex/skillBoost), die on-band-Platte `aetherium_set` dagegen `{str12,con13,lck6}` (+26 maxHp). Das ist der konkrete Treiber der Leder-Unter-Parität (−3,5 % statt +5 %) UND der 15,8 %-Stil-Spanne. Klassisches „definiert-aber-nicht-verdrahtet"-Muster. **Fix:** `wraithhide_set` + `starweave_set` in `content.sets` ergänzen, Bonus so eichen, dass Leder die intendierten **+5 %** (nicht +13 %) trifft. (Am L99-Band existiert das Problem NICHT — `voidhide_set`/`voidweave_set` sind da; rein die L90-Zwischensprosse ist die Lücke.)

**P3 (bekannt, offen) — Ward-INT-Sockel auf Ranged-Held (`WARD_CORE_PER_INT=1,0`) · Owner: logic-dev.**
BiS-Ranged zeigt `maxWard = 14` (aus int 14) → ~14 HP Gratis-Absorb VOR HP + sichtbare Ward-Leiste, obwohl Ward eine Magier-Mechanik ist. 1:1 GATE-B Punkt 7 / TRIAGE-Lever 2 (Empfehlung `WARD_CORE_PER_INT = 0`). In Phase C weiterhin präsent, kein Blocker (~9 % maxHp Zusatzpuffer, in allen Zahlen oben bereits enthalten).

**P4 (Watch/Balance) — Enrage-Boss-Dodge-Varianz · Owner: balance-designer.**
`void_titan` (acc 19, enrage) und `last_idol` drücken die RNG-Dodge-Varianz an die Grenze: mit sub-optimalem Auto-Eat (T0) oder schwächerem Food vereinzelte Tode (~0,3 %/Kill), mit BiS-Food 0 Tode aber min-HP 8–17 %. Kein Bug (One-Shot-Cap verhindert echte One-Shots, Spec §1.6 greift), aber der „2 gekappte Treffer im 3-s-Auto-Eat-Fenster"-Vektor ist der Preis der reinen Voll-Vermeidungs-Defensive. Bei künftigen Enrage-/Accuracy-Buffs mitprüfen, dass Leder nicht als einziger Stil kippt.

**Guard-Gap (Empfehlung) — Owner: kontrolleur/logic-dev.** Kein Test erzwingt „jedes Rüstungs-Tier hat ein Set" (sonst hätte er `wraithhide`/`starweave` gefangen). Ein kleiner content-integrity-Guard (jede Armor-Item-Familie mit ≥5 Slot-Teilen ⇒ Set-Eintrag) würde die Klasse dieser Lücken künftig fangen.

---

## Methodik / Reproduzierbarkeit
- Held: `createGame({startingStyle:"ranged"})`, alle `COMBAT_SKILL_IDS` = 90, `leatherworking` = 99, 5× wraithhide + `aetherium_longbow` + 2 Mio `aetherium_arrow` (Köcher via `equipItem`), Auto-Eat-Tier gesetzt.
- `computeStats` → maxHp/dodgeChance/defense/evasion/maxWard; EHP: Platte `maxHp/((1−red)(1−block·0,75))`, Leder `maxHp/(1−dodge)`, Stoff `maxHp+maxWard`; red = `min(0,80, def/(def+12,5))`.
- Überleben: `startCombat(boss)` + `advance` in 5-s-Chunks über 30 min, Tode = `stats.deaths`-Delta (Respawn heilt voll), 8 Seeds summiert; min-HP je 5-s-Chunk gesampelt.
- Parität-Stoff on-band mit Set = `godspark` (magic_off 85, `godspark_vestment_set`); `starweave` (magic_off 92, kein Set) als Gegenprobe → dieselbe Leder-Zahl (−3,5 % / −7,1 %).
- Konstanten: DODGE_CAP 0,75 · ONE_SHOT_CAP 0,5 · DMG_MAX_HIT_MULT 1,4815 · AUTO_EAT_COOLDOWN 3 s. Evasion aktuell **linear** (`evasionRating/100`) — die in TRIAGE geplante diminishing-Kurve ist noch NICHT angewandt (getestet wurde der Ist-Stand).
