# Sweep 6 — T2: Midgame-Melee + Grabstahl/Bane-Systemtest

Datum: 2026-07-03 (Nacht-Loop) · Tester: T2 · Modus: read-only (Wegwerf-Harness `_tmp_s6t2_*`, nach dem Lauf gelöscht) · Alle Zeitangaben = **SPIELZEIT**.

**Setup (a):** `RealisticPlayer` Seed 41, melee („Gunnar"), Midgame-Snapshot per SimPlayer-Aufbau (erlaubt): attack/power/defence/vitality 30 + mining/smithing/cooking/fishing/woodcutting 30 (CL 30), volles Blacksteel-Set (Schwert/Vollhelm/Platte/Beine/Handschuhe/Stiefel/Tropfenschild), 300 venison_roast als Auto-Eat, 3 000 Gold. Dann **ehrlich** `pursue([combatLevel(45), obtainItem(gravesteel_blade), killMonster(skeleton_nekro, 5)], 30 Sim-h)`.
**Messungen (b/c):** deterministische Kampf-Messreihen (Seed 7/11) mit echter `gravesteel_blade` gegen Dummy-Ziele (bane-Isolation), gegen den echten `skeleton_nekro` und über die komplette Krypta-Bank L65–90 (2 Sim-h je Zelle, Blacksteel-Rüstung, venison_roast). Wallclock des gesamten Harness: ~47 s.

---

## 1. Ergebnis des 30-h-Laufs (a)

| Ziel | Status | Stand @30 h | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 45 | ◐ 82 % | CL 37/45 | — |
| 1× gravesteel_blade | **◐ 0 %** | 0/1 | — |
| 5× skeleton_nekro | ✅ | 5/5 | **10 h 10 min** |

Endstand: CL 37 · Gesamtlevel 331 · Gold 62 977 · 433 Kills · **0 Tode** · attack 44, power 36, vitality 36, **mining 30→53** · Gear unverändert Blacksteel. Frictions: **0** (siehe F1 — fälschlich sauber).

- **5× Nekromantenfürst (L90) bei CL 30–33 mit 0 Toden**: der ehrliche Spieler besiegt ihn in bewachten 2-Min-Fenstern mit vollem Food-Management problemlos (erster Kill @117 min). Kontrast zu (c): AFK-`fightFor` am selben Gegner = Todesmühle (F5).
- **Grabstahlklinge nie gebaut — aber NICHT wegen des Spiels**: Der Sim-Scheduler hat 30 h lang in JEDER Idle-Strecke `mine_gravesteel` gefahren: **32 162 gravesteel_ore, 0 coal, 0 Barren, 0 Klinge** (mining 30→53, crude_bone 417 ✓, Kohle nie angefasst). Toolkit-Bug F1, kein Content-Problem — der ehrliche Gegenbeweis steht in §2.
- CL-45-Pacing aus diesem Lauf ist dadurch **nicht belastbar** (≈ 60 % der Idle-Zeit versickerte im toten Ore-Grind); CL 30→37 in 30 h ist eine UNTERGRENZE.

## 2. Grabstahl-Kette (b): craftbar & erreichbar ✅

Ehrlicher SimPlayer auf **Mindest-Leveln** (mining 22, smithing 24, Kampf-Skills 20): mine_gravesteel (L22) → 2× Erz in 1 min; mine_coal (L15) → 2× Kohle; 2× crude_bone fällt beim Goblin-Grind nebenbei (25 %; Quellen ab **rot_rat L3 mit 50 %**, shambling_carcass L12 70 %); smelt_gravesteel (L22, Erz+Kohle) → forge_gravesteel_blade (L24, 2 Barren + 2 Knochen): **Klinge nach ~123 Sim-Min ab Null.** crude_bone-Zufluss ist auch passiv reichlich (417 Stück in 30 h Lauf (a)). Kette sinnig verdrahtet, keine Sackgasse.

## 3. Bane-Messreihe (b): exakt +25 % nur gegen Untote ✅

Echte Klinge, eingefrorene Skills 40, Anti-Krit-Offhand, identischer Seed ⇒ paarweise vergleichbare Treffer (24 Hits/Serie):

| Ziel-Dummy | Ø-Hit | Ratio vs. ungetaggt |
| --- | --- | --- |
| family: undead | 13,875 | **1,276** (pro Hit 1,25–1,30, Rundung) |
| ungetaggt | 10,875 | 1,000 |
| family: beast | 10,875 | **1,000** |

Bane feuert exakt und NUR auf die getaggte Familie (deckt sich mit den Guards in `packages/engine/src/bane.test.ts`).

## 4. antiRegen (b): Mechanik ✅ — aber gegen den Nekro strukturell tot ❌

- **Mechanik-Beweis (isoliert):** ungetaggter Regen-Dummy (2 HP/s, 300 HP), Blutung via Gorehound-Pet, Klinge vs. identischer Klon ohne antiRegen: **16 vs. 11 Kills/20 min** (+45 %), 1. Kill 1,2 vs. 1,7 min. antiRegen unterdrückt Regen bei blutenden/vergifteten Zielen korrekt (combat.ts:1533–1540).
- **Realität skeleton_nekro:** `resist: ["poison","bleed"]` (content index.ts:10428) blockt die EINZIGEN Statusarten, die antiRegen scharfschalten. 30-min-Messung (Skills 40, Klinge + Gorehound): bleed/poison landet **nie** auf dem Nekro; Klon ohne resist: **22 → 27 Kills/30 min (+23 %)**, die als Beute liegen bleiben.
- **Reichweite generell:** Die Klinge hat selbst KEINEN DoT; alle 20 bleed/poison-Proc-Items sind mainhand (verdrängen die Klinge); kein Blutungs-/Gift-Enchant im Runenkatalog → einziger Real-Weg ist ein DoT-Pet (gorehound 1/80 000, witherling, sporewretch, hemlock). Von 32 Regen-Monstern sind 4 komplett bleed+poison-immun (rootling_treemonster L62, **skeleton_nekro L90**, gravecliff_specter L237, abyssal_devourer L96). Gleiche tote Kombi auch auf `bramble_witchstaff` (frost+antiRegen, frost zählt nicht). `thornfang_blade` (bleed+antiRegen) und `mire_hexstaff` (poison+antiRegen) sind dagegen in sich stimmig.

## 5. Krypta-Band L65–90 (c): Grabstahl vs. Blacksteel — spürbar ✅

2 Sim-h je Zelle, Seed 7, Blacksteel-Rüstung, venison_roast (999):

| Monster | Grabstahl (S30) | Blacksteel (S30) | Uplift | Grabstahl (S40) | Blacksteel (S40) | Uplift |
| --- | --- | --- | --- | --- | --- | --- |
| skeleton_warrior L65 | 303 | 263 | +15 % | 331 | 273 | +21 % |
| skeleton_archer L68 | 328 | 284 | +15 % | 344 | 294 | +17 % |
| skeleton_spearman L71 | 277 | 232 | +19 % | 294 | 243 | +21 % |
| skeleton_butcher L75 | 206 | 168 | +23 % | 214 | 178 | +20 % |
| skeleton_icemage L80 | 166 | 135 | +23 % | 172 | 143 | +20 % |
| skeleton_pyroclasp L85 | 158 | 127 | +24 % | 164 | 134 | +22 % |
| skeleton_nekro L90 | 54 (49 Tode) | 41 (51 Tode) | **+32 %** | 83 (23 Tode) | 56 (31 Tode) | **+48 %** |

- Uplift überall spürbar; am Nekro nichtlinear verstärkt (kürzere Kämpfe = weniger Regen-Heilung — NICHT antiRegen, s. §4).
- **Food-Ersparnis** mit Klinge 10–45 % (z. B. warrior S30: 71 vs. 127 Roasts/2 h).
- Design-Intention bestätigt: die L24-Klinge schlägt das L30-Schwert gegen Untote klar — stimmige Chase-/Nischen-Waffe (passt zur Rare-Drop-Philosophie).

---

## Findings

### F1 (P1, Owner: logic-dev — Sim-Toolkit, kein Spiel-Bug)
**`obtainItem`-Kettenplaner klemmt am ersten Rezept-Input und der Idle-Pfad kennt keine Wall-Erkennung.** `findActionLooting` (sim-realistic.ts:870–889) rekursiert bei fehlenden Inputs stur in die Quelle des ERSTEN Inputs (gravesteel_ore), auch wenn davon längst 32 000 liegen — Kohle (2. Input) wird nie beschafft, `ensureInputs(smelt)` (:912–923, Schwelle qty×3) wird nie wahr. Ergebnis in (a): 30 h → 32 162 Erz, 0 Kohle, 0 Klinge. Verschärft: Das Ziel wird fast nur über Idle-Strecken bedient (`prepareForGoalIdle`, :950 ff.); dort gibt es KEINE Stall-/Rotations-/Friction-Buchhaltung (die sitzt nur im Aktiv-Fenster, :467–496), und weil der tote Task den Proxy nie bewegt, bleibt das Ziel „attention-starved" und gewinnt die NÄCHSTE Idle-Strecke wieder — Endlosschleife mit **frictions=0** („fälschlich sauber"). Folgen: alle Craft-`obtainItem`-Sweep-Ziele unbrauchbar UND Ko-Ziele im selben Lauf verzerrt (CL-45-Messung hier wertlos). Fix-Skizze: in der Input-Rekursion (:882–887) bereits gedeckte Inputs (have ≥ qty×3) überspringen; Stall-Zählung auch für Idle-Besitzer-Strecken.
**Repro:** RealisticPlayer Seed 41 melee, Skills-30-Snapshot + Blacksteel-Set, `pursue([combatLevel(45), obtainItem("gravesteel_blade",1), killMonster("skeleton_nekro",5)], 30 h)` → Inventar/Bank auf gravesteel_ore vs. coal prüfen.

### F2 (P2, Owner: content-dev, Sign-off combat-dev)
**antiRegen auf der Grabstahlklinge ist gegen ihr thematisches Flaggschiff-Ziel unerfüllbar.** Vorbedingung „Ziel blutet/ist vergiftet" (combat.ts:1533–1540) kollidiert mit `skeleton_nekro.resist ["poison","bleed"]` (content index.ts:10428) — der EINZIGE Regen-Untote der Krypta ist gegen genau die Auslöser immun; die Klinge bringt keinen eigenen DoT mit, alle DoT-Waffen sind mainhand, kein DoT-Enchant existiert ⇒ ohne Chase-Pet ist die antiRegen-Zeile der Klinge in der Krypta totes Tooltip-Versprechen (gemessen: −23 % Kills/30 min vs. Klon ohne resist). Optionen: (i) Klinge bekommt kleinen bleed-Proc (Muster thornfang_blade), (ii) `bleed` aus Nekro-resist streichen (poison bleibt, thematisch sauber — Skelett blutet nicht? dann (i)), (iii) antiRegen von der Klinge nehmen. Gleiches Muster prüfen: `bramble_witchstaff` (frost+antiRegen — frost triggert antiRegen nicht).
**Repro:** Skills 40, gravesteel_blade + gorehound (`ownedPets`+`companionPetId`), 30 min vs. skeleton_nekro: `combat.enemyEffects` enthält nie bleed/poison; vs. resist-freien Klon +23 % Kills.

### F3 (behoben mid-sweep durch T6 — Rest: P3, Owner: ui-dev/logic-dev)
**`weaponEffect.bane`-Prosa fehlte bei Sweep-Beginn** (einziger der 33 Effekt-Kinds ohne i18n-Key): Tooltip zeigte nur den generischen Fallback „Grants the weapon a special combat effect." — kein roher Key (Fallback-Kette in weaponEffectProse.ts:33 ff. funktioniert wie spezifiziert ✅), aber die +25 %-vs-Untote-Mechanik war spielweit unsichtbar. Während dieses Sweeps von T6 gefixt (EN+DE + `monsterFamily.*` + `{family}`-Platzhalter mit Roh-Id-Fallback — Implementierung gegengelesen, sauber). **Rest-Lücke:** kein Guard-Test prüft `weaponEffect.<kind>`-i18n-Parität gegen `SPECIAL_EFFECT_TYPES`/`STATUS`-Kinds — genau so ist bane durchgerutscht. Empfehlung: kleiner Client-Guard (Kind-Liste × UI_TEXT.en/de).

### F4 (✅ Verdikt, Balance): Bane-System liefert wie spezifiziert.
+25 % exakt und familien-scharf (§3); Krypta-Uplift +15–24 % Kills, +32–48 % am Boss, 10–45 % weniger Food (§5); Kette ehrlich in ~2 h ab Mindest-Leveln erreichbar (§2). Keine Aktion nötig.

### F5 (P4, Beobachtung, Owner: balance-designer)
**skeleton_nekro ist bei CL 30–40 eine AFK-Todesmühle, aber bewacht trivial-sicher:** unbeaufsichtigtes `fightFor` = 49–51 Tode/2 h und ~500 Roasts/h (Food 999 in <2 h leer); der RealisticPlayer in 2-Min-Fenstern: 5 Kills, 0 Tode. Passt zur „Undergeared-Walls sind gewollt"-Linie (Progressions-Druck), aber das Gefälle attended↔idle ist am oberen Rand — falls Idle-Nekro-Farmen vor CL ~45 NICHT gewollt ist, ist alles gut; nur bewusst abnicken.

---

*Harness `_tmp_s6t2_gravesteel.test.ts` (packages/engine/src) nach dem Lauf gelöscht; Rohausgaben (Konsole, pursue-Log 106 Zeilen, Frictions) lagen im Session-Scratchpad. Kein Spiel-Code verändert.*
