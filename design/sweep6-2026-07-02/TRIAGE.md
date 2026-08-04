# Sweep 6 — TRIAGE (lebendes Dokument)

Stand: 2026-07-03 ~00:45 · Welle 1: 10 Tester (T1–T10) + 2 UI-Agenten

## Regel
Engine-/Content-Fixes erst NACH Abschluss aller Welle-1-Tester anwenden (laufende
Harnesse messen gegen den Quellstand). Renderer-Fixes sofort erlaubt (kein Tester baut den Client).

## Eingegangen
| Tester | Verdikt | P1 | P2 | P3 | P4 |
|---|---|---|---|---|---|
| T3 Ranged/Ammo | ✅ ship | 0 | 1 | 2 | 1 |
| T9 UI-Review | ✅ ship nach P2/P3 | 0 | 2 | 7 | 5 |
| T10 Economy | ✅ exploit-frei, nach oben offen | 0 | 2 | 2 | 2 |
| T6 Konsistenz | ✅ ship, 0 neue Inkonsistenzen | 0 | 0 | 2 | 4 |
| T5 Perfektionist | ✅ 100 % erreichbar | 0 | 0 | 1 | 3 |
| T1 Frühspiel | ✅ 3/3 Ziele, 0 Friction | 0 | 1 | 2 | 2 |
| T8 Neue-Systeme | ✅ kein P1/P2, alle 6 Achsen halten | 0 | 0 | 2 | 3 |
| UI: Attribut-Redesign | ✅ gelandet (Medaillon-Zeilen) | – | – | – | – |
| T4 Magie/Enchant | ✅ Mechanik 5/5; Zugang P3s | 0 | 0 | 4 | 2 |
| T7 Persistenz | ✅ release-tauglich | 0 | 0 | 2 | 4 |
| T2 Melee/Grabstahl | ⚠ Bane top; 1 Toolkit-P1 | 1 | 1 | 1 | 1 |

**WELLE 1 KOMPLETT (01:50): 10/10 Tester + 2 UI-Agenten. Bilanz: 1×P1 (Sim-Toolkit,
nicht Spiel), 7×P2, ~23×P3 — KEIN Spiel-P1, kein Release-Blocker im Produkt.**

## Fix-Batches (laufen seit ~01:55)
- **Batch A (logic-dev, Engine-Kern):** enchant-goldSpent · Cooldown-Reload-Skip · Offline-Regen ·
  stale-Monster-Guard · Trank-Schwellen-Clamp · antiRegen→jeder DoT · Kommentar-Fix
- **Batch B (logic-dev, Sim-Toolkit):** findActionLooting-P1 (Multi-Input + Stall-Friction) ·
  Ammo-Heuristik-Entkopplung · stockFoodForIdle-Guard · Craft-Route (Magier!) · Inventar-Thrash ·
  obtainItem-Anzeige · Caster-Robe-Check · stale Pins
- **Batch C (content-dev): ✅ FERTIG (02:10)** — copper_arrow 0.2 · gemstone_ring 400 · godiron-Fletch 95 ·
  gravesteel_blade Grabfeuer-Burn (+witchstaff-Muster) · T2-Runen-Band 38-42 · Phönix ·
  Familien-Nachzügler

## Fixes SOFORT erledigt (Renderer/Tooling/Content-trivial)
- [x] T9: Nav-Label „Fertigkeiten-Übersicht"→„Fertigkeiten" (Truncation auf allen Shots)
- [x] T9: farm-cat-name Ellipsis statt hard-clip (min-width:0)
- [x] T9: Heiltrunk/Heiltrank-Verwechslung → Draughts heißen „Kräutersud" (content, trivial)
- [x] T9: Emoji-Scanner um BMP-Emoji-Presentation erweitert (⚡/⭐ werden jetzt erkannt)
- [x] T9: header-charinfo-name 220→340px (lange Namen)
- [x] T6: bane-Prosa-Template + monsterFamily.*-Keys en+de + {family}-Platzhalter (Grabstahl-Klinge
      zeigt jetzt „+25 % erhöhten Schaden gegen Untote")
- [x] T6: combat.inflictsHint typspezifisch (poison/burn/bleed/frost/shock + generischer Fallback,
      util/inflictHint.ts, 3 Call-Sites)
- [x] T8-P3-1: Tooltip zählt Pfeilschaden/DPS nur noch bei ammoCount ≥ 1 (Engine-Spiegel)

## Queue: nach Welle-1-Abschluss (Engine/Content-Batch)
- [ ] **T3-F2 [P2] logic-dev:** RealisticPlayer-Ammo-Heuristiken noch sorten-gematcht statt entkoppelt
      (sim-realistic.ts:1509-1512, 1288, 1657-1658, 1930-1931) — 214 iron_arrows ungenutzt, copper nachgekauft.
- [ ] **T3-F1 [P3] content:** copper_arrow dominiert von crude_arrow (gleicher Schaden 0.1, 4g vs 1g)
      → ammoDamage 0.2 (Leiter crude 0.1 → copper 0.2 → iron 0.3 bleibt monoton).
- [ ] **T3-F3 [P3] re-test:** Bogen-Progression ehrlicher Ranged-Main (nach F2-Fix neu messen; ggf.
      früher Bogen-Drop/Craft-Sichtbarkeit — Chef-Thema Shop-Decke anfassen NICHT ohne Chef).
- [ ] **T3-F4 [P4] content-nit:** godiron Smithing 95 vs Fletching 99 Versatz.
- [ ] **T9 [P2] ui:** Mana-Bar character 268/268 wirkt ~10 % gefüllt (CharacterPage — WARTET auf Attribut-Designer,
      gleiche Datei).
- [ ] **T9 [P2] Chef-Bestellzettel:** Slayer-Belohnungsshop rendert Masken-Emoji statt Item-Art
      (fehlende Icons → in missing-assets-Liste aufnehmen).
- [ ] **T9 [P3]:** Attribut-Namen-Truncation — löst der laufende Attribut-Redesign-Agent mit.

### T10-Zugänge zur Queue
- [ ] **T10 [P3] logic-dev (Engine-Batch):** enchant.ts:202+262 ziehen Gold ohne `stats.goldSpent`-Buchung
      (gold_spent-Achievements unterzählen) — Muster „Sink ohne Buchung".
- [ ] **T10 [P4] content (Batch):** gemstone_ring req20 val350 < sapphire_ring req15 val360 (Inversion).
- [ ] **CHEF-MORGENREPORT (Design, nicht über Nacht fixen):** (a) Gold-Überschuss 69–84 % der Kaufkraft
      ohne Ziel (Senken-Konzept nötig: z.B. kaufbare Tränke/Tonika, Gold-Sinks im Endgame); (b) Ranged
      doppelt besteuert bei halbem Einkommen — ABER erst nach T3-F2-Toolkit-Fix neu messen (Ranged-Messung
      war durch Ammo-Heuristik + Copper-Bow-Stagnation verzerrt); (c) Waffen-Decke: als Gold-Senke
      irrelevant (<1 %), reine Progressions-Philosophie — Datenlage liegt vor.
- Positiv T10: 0 Arbitrage, 0 Craft→Sell-Loops, Bank-Sink korrekt, Tod kostenlos (gewollt).

### T1-Zugänge zur Queue
- [ ] **T1-#2 [P3] logic-dev (Engine-Batch):** `stockFoodForIdle` (sim-realistic.ts:1407) ohne
      Mindestmengen-Guard — schaltete auf 4er-Stack Heiltränke um → Idle-Tod; `manageFood`:1461 hat
      den Guard bereits (kopieren).
- [ ] **T1-#4 [P4] (Engine-Batch):** stale Regen-Kommentar state.ts:102.
- [ ] **T1-#5 [P4] content (Batch, optional):** ehrlicher Melee endet in Caster-Robe (coreStatScore
      wertet Stil-fremde Rüstung — prüfen ob kosmetisch oder Score-Fehler).
- [ ] **CHEF-MORGENREPORT (T1-#1 [P2] + #3 [P3]):** Kaltstart-Letalität — frischer Spieler ohne
      Food-Pflege stirbt nach ~13 Sim-Min am Tutorial-Huhn (Starter-Food 3–9 Min); Auto-Eat mit leerem
      Slot = stilles Idle-Todesurteil. Optionen: (a) Starter-Zone-Monster-Schaden senken, (b) mehr
      Starter-Food, (c) Gnaden-Regen unter CL5, (d) UI-Warnung „kein Food im Auto-Eat" (ui-dev, klein),
      (e) bewusst lassen (Vorbereitung ist fundamental). Empfehlung: (d) sofort + (b) moderat.

### T8-Zugänge zur Queue (Engine-Batch)
- [ ] **T8-P3-2 combat-dev:** Defensiv-Zeile gegen stale Monster im Dungeon-Wellen-Pfad falls
      cooldownOnKill je ≥5000ms (combat.ts:636-661).
- [ ] **T8-P4-2 combat-dev:** Auto-Trank-Schwelle 1.0 (nur via Save-Edit) trinkt bei vollen HP —
      Ein-Zeilen-Clamp.
- [ ] **T8-P4-1/P4-3:** nur dokumentieren (Cooldown-Persistenz bei künftigem Tuning; kein
      Combo-Tonikum mit Heilanteil bauen — content-Regel).

### T5/T6-Zugänge zur Queue
- [ ] **T5-F1 [P3] CHEF-ENTSCHEID:** daily_streak-100-Achievement = 100 lückenlose ECHTZEIT-Tage,
      1 verpasster Tag = Reset — einzige fehler-intolerante Completion-Wall. Optionen: Schwelle senken /
      kumulativ statt Streak / lassen (Hardcore-Trophäe).
- [ ] **T5-F2/F3 [P4→Morgenreport] balance:** BiS-Melee one-shottet last_idol (Crit 220 vs 200 HP) +
      ~36 Mio Kampf-XP/h am last_idol (Offense-99 in ~22 min bei BiS) — Endgame-XP-Hahn, Chef-Thema.
- [ ] **T6 [P4]:** 14 stale Baseline-Pins kürzen (beim nächsten Guard-Anfassen); charred_doomknight/
      spectral_stag/slag_abomination Familien-Diskussion; „des Phoenix"→„des Phönix".

### Nachzügler aus Batch C (Welle-2-Queue)
- [ ] bronze_arrow (req 5, 0.2) jetzt von copper_arrow (req 1, 0.2) dominiert → 0.25 beim nächsten
      Content-Anfassen.
- [ ] sim-consistency: „sapphire_ring->gemstone_ring"-Pin ist jetzt der 15. stale Pin (Batch B kürzt).

## Welle 2 — eingegangen
| Tester | Verdikt |
|---|---|
| W2-UI (frische Shots) | ✅ Regressionen 7/7 PASS, keine P1; Overflow 29→4 echt |
| W2-T7 Ranged-Re-Messung | ✅ **Lücke war Toolkit-Artefakt** — Netto 87–101 % von Melee, Kills/h Parität; T10-P2-2 GESCHLOSSEN, keine Balance-Aufgabe |
| W2-T5 Pets+Bank | ✅ PASS beide Teile (21/21 Pets wirken, Bank-Sink exakt, kein Verlust-Bug) |
| W2-T3 Dungeons | ✅ ship (6 Dungeons; Keys fair, Wellen korrekt, T8-Fix verifiziert; Seed 44 cleart 1. Versuch) |
| W2-T6 Frühspiel-Langlauf | ⚠ 1. Session exzellent; Idle-Nacht-Tod-Lotterie [P2-Spiel→CHEF]; 2 Toolkit-P2; Goblin-Quest-Falle |
| W2-T4 Slayer | ⚠ Mechanik sauber; Punkte-Ökonomie [P2, fix-then-ship] + Früh-Turm-Wand [P2] |
| W2-T2 Mittelband | ✅ Band wall-frei (72 Zellen, 0 Tode); Ranged-Fix verifiziert (4 statt 2098 Ammo-Stopps, on-tier-Bogen via Craft-Route) |

### W2-T7-Zugänge (Sim-Toolkit-Batch, NACH Welle 2)
- [ ] **W2-F1 [P2] logic-dev:** Munition nicht idle-proportional bevorratet (AMMO_TOTAL_LOW=200 ≈ 10
      Kampf-Min pro 30–180-Min-Idle) — halbiert gemessenes Ranged-Vermögen.
- [ ] **W2-F2 [P2] logic-dev:** Sim plant Craft-Skill-LEVELING nie als Gear-Route (Fletching/Smithing
      bleiben Lv 1; Bogen-UND-Melee-Stall @copper sind dasselbe Toolkit-Loch) — danach T3-F3 neu messen.
- [ ] W2-F3/F4 [P4]: Min-Kaufmenge-Klemme; Inventar-Friction-Spam Melee.

### W2-T2-Zugänge
- [ ] **Batch D [P2/P3]:** Sim farmt gesperrte Turm-Etagen (sim-realistic.ts:1306) + ENGINE:
      Etagen-Gate ist UI-only (slayer.ts:88 — engine-seitig erzwingen, sonst latentes API-Loch) ·
      skillLevel-Proxy blind für Ketten-Inputs (sim-goals.ts:285, chainInputProgress-Muster).
- [ ] **CHEF-MORGENREPORT [P2-Balance]: Melee spielt das Mittelband GRATIS** (0 Food/0 Gold/0 Tode
      in 30 h) während Ranged/Magie 5–10× Food zahlen — Kosten-Parität der Stile (Magie 11 Idle-Tode).
      Bündelt mit Idle-Tod-Lotterie + Upkeep-Themen.
- [ ] P3 content (Batch E): rc 40→50 ohne on-Level-Materialroute (essences foraging 53/Kampf) ·
      Mithril-Pfeile smithing-gegatet (reiner Ranger fällt auf Iron zurück).

### W2-T4-Zugänge
- [ ] **Batch E [P2] content/balance (NACH Welle 2): Slayer-Punkte-Ökonomie rekalibrieren** — Preise
      stammen aus 4-Master-Ära; heute 5 Pkt/Task ⇒ helm 3000 Pkt ≈ 86 h, Katalog ≈ 272 h. Ziel:
      helm ~15-20 Slayer-h, Katalog ~60-80 h (Preise ÷4-6 oder Punkte/Task-Formel CL-skaliert);
      Kommentar „Varek" fixen; Konsum-Beschreibungs-Widersprüche (:4317/4327/4424) mitziehen.
- [ ] **Batch D-Erweiterung [P2] logic-dev: Früh-Slayer-Wand** — Turm-Task-Pfad ohne CL-Filter
      (slayer.ts:180-195; frisch CL3 → +16-Level-Tasks) + Skip 20 Pkt bei 5 Pkt/Task = Falle;
      Fix: Turm-Pfad erst ab CL-Schwelle ODER CL-Fenster auch für Turm + Skip-Kosten früh senken.
- [ ] CHEF-MORGENREPORT: tower_*-Kopien = 51×-Farm-Shortcut (tower_roc_void, identische Loot-Tabelle
      bei gesenkten Stats) — beabsichtigt? · Endgame-Task-Monotonie (CL95: 50 % gray_wolf).
- [ ] P3/P4 Backlog: „nicht im Inventar"-Text vs Bank (ui) · maxPurchases defined-never-applied ·
      SlayerPage skipTask-Duplikat.

### W2-T6-Zugänge
- [ ] **CHEF-MORGENREPORT [P2-Spiel]: Idle-Tod-Lotterie** — ~95 % aller Frühband-Tode am Ende von
      Idle-Strecken („über Nacht kämpfen = tot aufwachen" = Standard-Fehlermodus); Kaltstart 10/10 Seeds
      tot am Tutorial-Huhn (Median ~12,5 Min). Optionen: (a) Auto-Flucht bei Food-leer (wie Stalemate),
      (b) UI-Warnung „Food reicht ~X h" beim Verlassen, (c) Starter-Food +, (d) lassen. Bündelt T1-#1.
- [ ] **Toolkit-Batch D [P2] (NACH Welle 2):** equipBar-2H-Asymmetrie (1H+Schild-Kombi nie
      gutgeschrieben → 50 h Kupferspeer!, sim-realistic.ts:1967-1978) · W2-F1 Ammo-Bevorratung ·
      W2-F2 Craft-Skill-Leveling-Route · craftWeaponUpgradeTask nur-freigeschaltete-Rezepte ·
      T5-Geister-Keys (inventory.ts:160).
- [ ] **Content [P2→P3]: Goblin-Quest-Falle** — q_first_blood/q_goblin_slayer zählen nur target
      „goblin", Varianten zählen nicht → Schwert-Questkette startet nie (4.614 Kills, 0 Fortschritt).
      Fix-Optionen: Engine kill-objective target-Liste ODER Quest-Targets auf häufigste Variante(n).
- [ ] P3 ui: 1 Guide-Schritt „Food/Auto-Eat vor dem ersten Kampf" (0/23 Steps decken die 1. Stunde).
- [ ] Öde-Notiz (Chef-Info): CL 24→30 = ~20-25 h Goblin-Monotonie, frische Zone erst Lv 30.

### W2-T3-Zugänge
- [ ] P3 balance/content: alpha_fang_amulet doppelt (L54-Quest UND CL90-wildwood-Dungeon-Reward —
      Dungeon-Reward-Linie neu bestücken); Sanctum on-level trivial + Open-World-last_idol (~500k Gold/h!)
      schlägt den eigenen Dungeon → gehört zum last_idol-Chef-Thema (XP- UND Gold-Hahn).
- [ ] P4 ui-dev: Death-Popup-Einzeiler „Dungeon-Schlüssel verbraucht" bei Tod im Dungeon.

### W2-T5-Zugänge (Backlog, kein Blocker)
- [ ] P3 logic-dev: inventory.ts:160/tick.ts:66 zählen 0-qty-Geister-Keys (Auto-Bank verwirft still).
- [ ] P4 ui-dev: PetGallery rundet 4,5 %→„+5%"; Bank-Intro-Satz „Crafting zieht aus der Bank".
- [ ] P4 content: accuracyDownEnemy ungenutzt; stale Kommentar :13656; nur 1 Taschen-Item für 4 Plätze
      (Item-Builder-Kandidat für den Chef).

### W2-UI-Sofort-Fixes (erledigt)
- [x] Herblore-Aktionsnamen an Kräutersud-Rename angeglichen (Brew Minor/Greater)
- [x] cs-stat-label kleiner+enger (VERTEIDIGUNG clippte endgame)
- [x] „du: {n}"/„you: {n}" → „Dein Level: {n}"/„Your level: {n}"
- [x] Dauer-Anzeigen locale-bewusst (formatStat statt toFixed — 2,6s im Deutschen; 6 Stellen)
- [x] Locked-Rezepte: Graustufen-Silhouette statt Vollschwarz-Blob
- Offen für Chef-Bestellzettel [P2]: ~20-25 unique Icons (Slayer-Shop-Art 😷🪞 prominent,
  ⚡-Runen, 🌱-Saat, UI-Glyphen 🔨🗝🪙🧪💰🔊) — Liste in W2-ui-review.md §3
- Offen [P4]: Mastery-„LEGENDÄR"-Badge kosmetisch irreführend + hartkodierte Emoji-Map

## Checkpoint 03:20 — VOLL-VERIFY GRÜN
typecheck 5/5 · Engine 90/635 (0 Walls, Baseline 15) · Persistence 99 · Client-Build ✓
Alle Batches (A/B/C) + 10 Sofort-Fixes verifiziert. Welle 2 (7 Tester) läuft gegen diesen Stand.

## Nach den Batches
Voll-Verify (typecheck, engine inkl. sim, persistence, client build) → antiRegen-Prosa-Template
anpassen (ich) → Welle 2 (Fix-Verifikation + frische Seeds + Schwerpunkt Offline/Cooldown-Fixes).


## Wieder-Aufsetzen nach Session-Limit (Opus, 2026-07-03 vormittags)
Batch D+E liefen ins Limit, landeten teilweise. Bereinigt:
- [x] 2 veraltete Slayer-Tests korrigiert (CL-Fenster-Turm + Gratis-Skip <SL10 — chef-konformes
      Batch-D-Verhalten, Tests angepasst; 18/18 grün).
- [x] Varek→Slayer-Meister (Batch-E-Kommentar-Rest).
- [x] REGRESSION Craft-Route preemptet Kämpfen (Melee 0 Kills) → gefixt (WEAPON_ADEQUACY_PER_CL-Gate);
      Melee 0→608 Kills, Magier-Craft grün.
- [x] „21 geared-Walls" = KEIN Produkt-Bug: Turm-Etagen-Gate (Batch D, korrekt) blockte im
      simulateCombat-Harness Turm-Monster (Held mit Slayer-Level 1). Harness-Fix in sim.ts
      (Slayer-Level mit-heben) → ECHTE WALLS 0, Baseline 15→9. sim.test-Pin aktualisiert.
- [x] VERIFY: typecheck 5/5 · Engine 635/635 · Persistenz 99/99 · sim.test 0 Walls.
- Batch D/E-Content-Fixes (Slayer-Preise, Goblin-Quest-targets, gravesteel-burn etc.) sind gelandet
  und grün. Offene D/E-Nachzügler (nicht fertig appliziert) → für einen sauberen Folge-Pass notiert.
