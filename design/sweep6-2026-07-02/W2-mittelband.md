# Sweep 6 — WELLE 2: Mittelband L40–70, alle 3 Stile (Re-Messung nach Ammo-/Craft-Route-Fix)

**Tester:** Kontrolleur (W2b) · **Datum:** 2026-07-03 (Nacht-Loop) · **Modus:** read-only, Wegwerf-Harness `_tmp_s6w2b_*` (nach dem Lauf gelöscht) · Alle Zeitangaben = **SPIELZEIT**.

**Setup:** `RealisticPlayer`, Mid-Snapshot per SimPlayer-Aufbau (erlaubt): je Persona **8 Skills auf 40** (Stil-Offensive + defence/vitality + Stil-Craft-Kette + cooking/fishing → **CL 40** in allen drei Stilen), on-tier Gear (Mithril-Waffe/-Platte bzw. Scaled-Leder bzw. Ember-Roben), 300 venison_roast, 3 000 Gold, volle HP. Danach **ehrlich** `pursue([combatLevel(60), skillLevel(<stil-craft>, 50), gold(20000)], 30 Sim-h)`:

| Persona | Seed | Stil | Stil-Craft-Ziel | Start-Gear |
| --- | --- | --- | --- | --- |
| Wulf | 19 | melee | smithing 50 | mithril_sword + Voll-Mithril + Kiteshield |
| Robin | 38 | ranged | fletching 50 | mithril_shortbow + 600 mithril_arrow + Scaled-Leder |
| Mira | 57 | magic | runecrafting 50 | mithril_staff + Ember-Roben-Set |

Zusätzlich **skriptete Band-Probe** (SimPlayer, Seed 7): 9 Kits (3 Stile × mithril@S50 / adamant@S50 / mithril@S40) × 8 Monster L45–65, je 1 Sim-h `fightFor` mit 999 Food. Wallclock gesamt: ~85 s, deterministisch.

---

## 1. Stil-Vergleichstabelle (ehrliche 30-Sim-h-Läufe)

| Messgröße | Melee (S19) | Ranged (S38) | Magie (S57) |
| --- | --- | --- | --- |
| Kampf-Niveau 40 → | **49** (82 %) | **51** (85 %) | **51** (85 %) |
| Kills (gesamt / pro h) | 2 563 / **85,4** | 1 452 / **48,4** | 3 699 / **123,3** |
| davon Slayer-Turm-Etage 2–3 (illegal, s. F1) | 1 136 (44 %) | 897 (62 %) | 1 342 (36 %) |
| **Tode** | **0** | **1** | **11** |
| Einkommen ≈ (Gold-Ende − Start + Ausgaben) / pro h | 475 918 / **15 864 g** | 273 453 / **9 115 g** | 547 537 / **18 251 g** |
| Ausgaben (goldSpent) | **0 g** | 32 352 g (≈1 597 iron_arrow + Food) | 66 892 g (nur Food) |
| Food verbraucht | **0** (300→300 roasts) | moderat (Puffer-Käufe je Nacht) | massiv (Puffer 300 je Nacht + Käufe) |
| Stil-Craft-Skill 40 → 50-Ziel | smithing **46** (71 %) | fletching **42** (48 %) | runecrafting **40** (**0 XP**, Wall @5 h 56) |
| Gold-Ziel 20 000 | ✅ **36 min** | ✅ 5 h 28 min | ✅ 6 h 02 min |
| Waffen-Upgrade im Lauf | ✅ mithril_maul **geschmiedet + angelegt** @13,5 h (Craft-Route) | ✅ mithril_longbow **gefletcht + angelegt** @3,0 h (Craft-Route) | ❌ bleibt mithril_staff (adamantium_staff hängt am rc-50-Wall) |
| Munition am Ende | – | Köcher **iron_arrow** (0,3) — Mithril-Vorrat @~14,7 h leer, danach Steel-Drops + Shop-Iron | – |
| Frictions | 4 | 7 (davon 4× „Munition leer") | 5 (davon 4× „wiederholt gestorben") |
| Kampfband am Ende | rootling_grunt/gimp L45–48 | rootling_gimp2 L51 | ash_rat L30–rootling_gimp L48 (Vorsicht nach Toden) |

**Kernbild:** CL-Progression ist über die Stile jetzt **vergleichbar** (49/51/51 nach 30 h; +10–11 CL pro 30 idle-lastige Stunden — CL 60 aus dem Mid-Snapshot ist ein ~60-h-Ziel, kein 30-h-Ziel). Die **Ökonomie ist es nicht**: Melee spielt das komplette Mittelband mit **0 g Unterhalt und 0 Toden**, Ranged verdient **~55 % des Magie-/Melee-Einkommens** bei laufenden Pfeil-+Food-Kosten, Magie verdient am meisten, bezahlt aber mit **11 Idle-Toden** und dem höchsten Food-Burn.

### Ranged nach dem Fix (Vergleich T3 Seed 52, vorher)
Die Welle-1-Verzerrung ist weg: **nur 4× „Munition leer" in 30 h** (T3-Ziel < 10 ✅; sweep5: 2 098), Auto-Reload verschießt Turm-Steel-Drops, und die Craft-Route baut den on-tier-Bogen selbst (**mithril_longbow @3 h** — in T3 hing Seed 52 nach 40 h noch auf dem L1-copper_shortbow). Ranged-CL hält jetzt Schritt (51 vs. 49/51). Der verbleibende Rückstand ist ökonomisch (F3/F5), nicht mehr Heuristik.

---

## 2. Blackthorn→Krypta-Übergang L45–65: **wall-frei** ✅ (skriptete Probe, je 1 Sim-h, 999 Food)

Kills · Food/Kill @ **Skills 50, Mithril-Gear (on-tier)** — **0 Tode in allen 72 Zellen** (auch @S40):

| Monster | Melee | Ranged | Magie |
| --- | --- | --- | --- |
| rootling_grunt L45 | 273 · 0,0 | 237 · 0,2 | 261 · 0,1 |
| thorn_wolf L54 | 211 · 0,0 | 177 · 0,7 | 200 · 0,7 |
| moss_golem L56 | 156 · 0,0 | 133 · 0,4 | 154 · 0,6 |
| spectral_stag L58 | 174 · 0,1 | 148 · 0,9 | 165 · 0,7 |
| bramble_witch L60 | 168 · 0,2 | 146 · 1,3 | 160 · 1,2 |
| rootling_treemonster L62 | 91 · 0,6 | 72 · 2,8 | 90 · 2,7 |
| **forest_warden L65** | 70 · **3,6** | 56 · **7,4** | 69 · **7,3** |
| skeleton_warrior L65 (Krypta) | 171 · 0,0 | 143 · 0,8 | 161 · 0,8 |

- **Kein Wall im Band:** Kill-Raten fallen glatt mit dem Monster-Level; der **Krypta-Einstieg (skeleton_warrior L65) ist LEICHTER als das Blackthorn-Finale** — der Übergang trägt.
- **forest_warden L65** ist der lokale Sustain-Spike (216 HP, Boss-Statur, content/src/index.ts:10210-10217): Food/Kill 3,6–7,4, Kill-Rate ≈ halbiert — liest sich als gewolltes Zonen-Finale, kein Blocker (0 Tode).
- **Adamantium-Uplift** (S50, gleiches Band): +9–23 % Kills (z. B. bramble_witch: melee 168→190, ranged 146→179, magic 160→181) — spürbar, nicht spielentscheidend. On-tier-Progression stimmt.
- Kill-Raten der Stile **auf Augenhöhe** (ranged ~10–15 % dahinter) — die ehrliche 30-h-Spreizung (48 vs. 123 Kills/h) kommt aus Zielwahl, Munitions-Stopps und Skilling-/Tod-Downtime, nicht aus dem Kampf-Kern.

---

## 3. Findings

### F1 · **P2 · sim-harness (logic-dev)** — Sim farmt gesperrte Slayer-Turm-Etagen; 36–62 % aller Kills sind für echte Spieler unerreichbar
- `pickCombatTarget` (packages/engine/src/sim-realistic.ts:1306, analog :1058 `findMonsterDropping`) filtert nur `slayerRequirement` — **nicht** Turm-Zone/Etagen-Freischaltung. Alle drei Personas (Slayer-Level **1**) farmten Etage-2/3-Mobs: tower_skeleton_archer (Etage 2, ab Slayer 20), slag_abomination/cinder_wretch/tower_ember_elemental (Etage 3, ab Slayer 40).
- Die Turm-Mobs sind dazu **Gold/HP-dominant** getunt (tower_skeleton_archer: 26 HP, 96 g, 78 XP — content/src/index.ts:11204-11205) — der Ziel-Optimierer wählt sie deshalb bevorzugt; Wulfs Gold-Ziel fiel dadurch nach 36 min. **Alle Absolut-Zahlen dieses Sweeps (Einkommen/h, Kills/h, Gold-Timing) sind nach oben verzerrt; der Stil-VERGLEICH bleibt gültig** (alle drei nutzen denselben Pool).
- Fix: Zielwahl auf `zone !== "slayer_tower"` bzw. `unlockedTowerFloors` einschränken (UI-Verhalten spiegeln, CombatPage.tsx:1347/1351).

### F2 · **P2 · sim-harness (logic-dev)** — `skillLevel`-goalProxy ist blind für Ketten-Inputs → Ziel-Wall mit 0 XP (Magie) + Phantom-Stalls (Melee)
- `goalProxy` für `skillLevel` = reine Skill-XP (packages/engine/src/sim-goals.ts:285-286). Eine dem Ziel gewidmete Idle-Nacht, die **Inputs sammelt** (mine_coal für smithing, forage_dim_essence für runecrafting), zählt als Null-Fortschritt → `registerIdleStall` rotiert (sim-realistic.ts:538-566), nach 3 Rotationen **permanente Wall**.
- Praxis Seed 57: runecrafting-Ziel nach 3 Forage-Nächten @5 h 56 **aufgegeben — 0 rc-XP in 30 h**, obwohl Material da war; das adamantium_staff-Upgrade (Waffen-Route) hing mit am Wall. Seed 19: 5 „smithing stalled"-Frictions auf Erz-/Kohle-Nächten, die in Wahrheit Fortschritt waren.
- Fix-Muster existiert schon: `obtainItem` bekam in T2-F1 einen **gedeckelten chainInputProgress-Term** (sim-goals.ts:317-321) — denselben Term für `skillLevel` (Inputs der freigeschalteten Rezepte des Ziel-Skills) übernehmen; zusätzlich Walls von Skill-Zielen nach Stärke-/Levelzuwachs neu bewerten (analog ablaufender Tod-Blacklist).

### F3 · **P2 · balance (balance-designer, → Chef-Morgenreport)** — Sustain-Asymmetrie: Melee spielt das Mittelband GRATIS, Ranged/Magie zahlen 5–10× Food (+ Munition)
- Messung (Probe, on-tier @S50): Food/Kill im Band L54–62: **melee 0,0–0,6 · ranged 0,4–2,8 · magic 0,3–2,7**; Voll-Mithril-Melee nimmt gegen L45-Rootlinge **netto ~0 Schaden** (30-h-Lauf: 300 Roasts unangetastet, goldSpent 0, 0 Tode).
- Folge im ehrlichen Lauf: Magie stirbt **11×** (Nächte verbrennen den 300er-Food-Puffer, dann Idle-Tod — die Tode passieren an L30–38-Mobs BEI CL 51), Ranged zahlt doppelt (Pfeile + Food) bei **~55 % Einkommen**; T10-Befund „Ranged doppelt besteuert bei halbem Einkommen" **bestätigt sich auch nach dem Toolkit-Fix**. Die 11 Magie-Tode sind in der Höhe ein Toolkit-Artefakt (IDLE_FOOD_MAX 300, sim-realistic.ts:119), im Kern aber ein echtes Gefälle: der AFK-Caster/Ranger hat laufende Sterbe-Kosten, der AFK-Melee keine.
- Optionen (Design, kein Nacht-Fix): leichte Basis-Mitigation/Ausweich-Schiene für Leder/Roben, Food-Burn-Dämpfung für Nicht-Melee, oder bewusst lassen und als Tank-Identität dokumentieren — dann aber Gold-Senken für Melee (er hat NULL Abfluss, s. F7).

### F4 · **P3 · content/balance (content-dev + balance-designer)** — Runecrafting 40→50 hat keine tragfähige Material-Route auf Level (Magie-Craft-Parität)
- Smithing 40→50: **selbstversorgend** (mine_mithril L35 + mine_coal → smelt → forge; Wulf +6 Level nebenbei). Fletching 40→50: shafts+Bögen gehen, die XP-dichten Pfeil-Rezepte hängen an smithing-Arrowheads (s. F5); Robin +2. Runecrafting 40→50: **alle** on-Level-Rezepte (craft_shock_rune :8622, rune_flame_ii/frost_ii, mithril_staff :8716) verlangen storm_essence (nur Kampf-Drops 10–22 %), essence_grave (forage_grave_essence **foraging L53**, :7257-7259, bzw. Turm-Drops 0,12–0,16) oder ember_essence (Goblin-Drops) — für einen Magie-Main mit foraging ~43 existiert keine Route, die nicht 2 Fremd-Skill-Tiers oder Grind-Jagden vorschaltet; die dim_essence-Fallback-Rezepte (3–10 XP) sind totes XP/h.
- Nach dem F2-Fix neu messen — aber das Material-Netz selbst ist objektiv weiter gestreut als bei smithing/fletching. Vorschlag: EINE selbstversorgende rc-XP-Schiene im Band 40–50 (z. B. forage-Quelle für storm_essence ODER ein rune-Rezept rein auf essence_mire/Forage-Band-40-Material).

### F5 · **P3 · content (content-dev)** — Ranged on-tier-Munition ist ab Steel smithing-gegatet; reiner Ranger fällt auf Iron (0,3) zurück
- fletch_mithril_arrows (fletching 40, :7861) braucht 15× mithril_arrowheads = **smithing 40** (:6811); Shop endet bei iron_arrow 6 g (:11302). Robin (smithing 1) kaufte nach dem Mithril-Vorrat **27× ausschließlich iron_arrow** (~1 600 Stück) und beendete den Lauf mit 0,3er-Pfeilen auf einem 40er-Bogen (−0,4 flat je Schuss ≈ −10 % Waffen-DPS). Steel-Drops der Turm-Archer subventionieren — die sind aber Etagen-gegatet (F1-Ironie: der Sim kam nur illegal dran).
- Entweder gewollte Cross-Skill-Pressur (dann ist Ranged im Mittelband systemisch der teuerste Stil, s. F3) oder eine Fletching-only-Zwischenspitze (z. B. Obsidian-/Knochenspitzen via fletching oder breiterer steel_arrow-Drop in Blackthorn) einziehen. Chef-Thema, keine Nacht-Änderung.

### F6 · **P3 · engine, defensiv (combat-dev)** — Slayer-Turm-Etagen-Gate existiert nur in der UI
- `canFightMonster` (packages/engine/src/slayer.ts:88-90) prüft nur `slayerRequirement`; die Etagen-Freischaltung (`unlockedTowerFloors`, slayer.ts:46-51) wird von `startCombat` (combat.ts:213) **nicht** durchgesetzt — Etage-5-Mobs sind mit Slayer 1 engine-seitig bekämpfbar. Heute erreicht das nur Save-Tinkering/Sim; eine Zeile Defensiv-Gate in `canFightMonster` (slayerFloor → Level-Check) schließt es sauber und macht künftige Sim-Messungen ehrlich.

### F7 · **P4 · balance-Beobachtung (Morgenreport-Datenpunkt)** — Gold-Ziel 20 000 im Mittelband trivial; Melee ohne jeden Abfluss
- 20 k nach 36 min (melee, F1-verzerrt) bzw. 5,5–6 h (ranged/magic); Einkommen 9–18 k/h bei Ausgaben 0–12 %. Nach 30 h sitzen alle auf 244–484 k. Deckt sich mit T10/G2: bis Enchant-/Runen-Senken greifen, ist Gold im Mittelband reine Anzeige — beim Voll-Plate-Melee **buchstäblich 0 Ausgaben in 30 h**.

### F8 · **P4 · sim-harness-Nit (logic-dev)** — Crafted-Gear-Duplikate pinnen das Inventar
- Wulf endete mit 7× blacksteel_platebody + 3× sabatons + 2× maul im Inventar (Smithing-XP-Ausschuss); `manageInventory` stuft sie weder als Junk (verkaufbar) noch als bankbar ein → ab Min 1236 „Inventar voll — weiterer Loot geht verloren" (1× Friction, dann stiller Loot-Skip). Kostet Langläufen Loot/Gold; Verkaufs-Regel für unterlegene Duplikate ergänzen.

### Positiv (Fix-Verifikation Welle 1 → 2)
- **Craft-Route greift in beiden reparierten Pfaden**: melee schmiedet + trägt in-tier-Upgrades (maul), ranged fletcht den on-tier-Bogen nach 3 h (T4-#2/T3-F3 ✅).
- **Ammo-Entkopplung**: 4 statt 2 098 Munitions-Stopps; Auto-Reload nutzt Drop-Pfeile sortenfremd (T3-F2 ✅).
- **Idle-Stall-Buchhaltung** (T2-F1) meldet tote Nächte jetzt zuverlässig — F2 ist die nötige Verfeinerung, kein Regress.
- Blackthorn→Krypta-Band ohne Wall; 0 Tode in 72 skripteten Messzellen; Determinismus & Performance des Toolkits einwandfrei (3× 30 Sim-h ≈ 60 s).

---

## 4. Slayer-Nutzung im Mittelband: **nicht messbar** (und aktuell zweischneidig)
- Der Sim hat **kein Slayer-Verb** (kein assignTask/Master-Besuch): Slayer-XP blieb in allen drei Läufen auf 1, die slayer-gegateten Band-Monster (forge_demon L54, void_stalker L66, sorrow_wraith L72) wurden korrekt gemieden — **stattdessen** wurde der Turm ohne Etagen-Recht gefarmt (F1/F6). Das System Slayer ist für Mittelband-Personas damit weiterhin unbewertet; nach F1-Fix lohnt ein eigener Slayer-Loop-Tester (Task → Turm-Etage 1–2 → Belohnungs-Shop).

## 5. Gesamturteil
**Spiel: ship-fähig fürs Mittelband.** Der L45–65-Übergang ist wall-frei, on-tier-Gear-Progression trägt (inkl. Adamantium-Uplift), die Welle-1-Fixes wirken messbar. Die echten Baustellen sind Design-Themen für den Morgenreport (F3 Sustain-Gefälle, F5 Munitions-Gate, F7 Gold ohne Senke) plus zwei kleine Content-/Engine-Nachzieher (F4, F6). **Toolkit: zwei P2s (F1, F2) vor der nächsten Messwelle fixen** — F1 verzerrt alle Absolutzahlen, F2 erstickt jede Skill-Ziel-Messung mit Input-Ketten.

*Rohdaten (Voll-Logs, Friction-Logs, Kill-Verteilungen, 72 Probe-Zellen) im Session-Scratchpad (`s6w2b_*.md`); Kernzahlen vollständig hier. Harness `_tmp_s6w2b_explore.test.ts` / `_tmp_s6w2b_mittelband.test.ts` / `_tmp_s6w2b_probe.test.ts` nach dem Lauf gelöscht; kein Spiel-Code angefasst.*
