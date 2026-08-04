# Playtest-Synthese — konsolidierte Findings & Prioritäten (2026-06-24)

Quelle: 10 Persona-Playtests — **alle 10 fertig**. Engine-Sims, zahlengetrieben.
Durchschnitts-Spaß: **5,4/10** (3–7) — solides Fundament, aber wiederkehrende strukturelle Lücken.
Dieses Dokument steuert die autonome Umsetzungs-Schleife. Status pro Punkt wird hier gepflegt.

## 🔴 P0 — Spiel-Stopper / klare Bugs (zuerst)

### P0.1 — `combatLevel` = Ø aller 7 Kampf-Skills sperrt Single-Style-Spieler aus
**Gemeldet von 4 Personas** (casual-idler, melee-bruiser, completionist, mage) — das mit Abstand häufigste & härteste Finding.
- Ein reiner Nahkämpfer/Magier/Idler trainiert nur 3–4 der 7 Skills; die übrigen bleiben L1 und ziehen den Schnitt runter.
- Melee-Beweis: nach 99.090 Kills `power L83`, aber `combatLevel` klemmt bei **31**. Theoretisches Max eines reinen Melee = **57** → highland_aerie (Gate 65) & idol_sanctum (100) **mathematisch unerreichbar**.
- Doppelte Mauer: runite/godiron-Schmiedemats liegen NUR als Dungeon-Loot hinter genau diesen Gates.
- **Fix (Entscheidung als CEO):** `combatLevel` auf **fokus-belohnende Formel** umstellen (OSRS-artig): defensiver Sockel (defence+vitality) + **bestes Offensiv-Profil** `max(melee, ranged, magic)` statt stumpfem 7er-Ø. Ein voll gemaxter Single-Style muss idol_sanctum erreichen. Dungeon-Gates ggf. gegenprüfen. **Determinismus & SAVE_VERSION wahren.** → *combat-dev*
- **Status: ✅ FERTIG & verifiziert (combat-dev, engine 198 grün).**

### P0.2 — `magic_def` ist ein totes Skill (Bug)
- mage: `magic_def` geht in `defense` ein (computeStats `sMagicDef*0.2`), bekommt aber in `combat.ts` **nie XP**. Reiner Magier kann „defensive Magie" nie trainieren.
- **Fix:** beim Einstecken (magischen) Schadens XP geben, analog `defence` — ODER Skill entfernen. Empfehlung: trainieren (sonst bricht „7 Skills"-Annahme). → *combat-dev*
- **Status: ✅ FERTIG & verifiziert (combat-dev, engine 198 grün).**

### P0.3 — idol_sanctum: 0 Gold bei 720 „Runs"/h (Bug)
- min-maxer: idol_sanctum meldet 720 Phantom-Runs/h, 0 g/h direkt. Vermutlich Run-Zähler triggert in Wellen-Lücke (`dungeonId/monsterId` kurz null) ODER `last_idol` (Lv120) bricht Run ab statt Clear.
- **Fix:** Run-Abschluss/Abbruch-Logik prüfen; Gold-Belohnung (8000/Run) muss greifen. → *combat-dev*
- **Status: ✅ FERTIG & verifiziert (combat-dev, engine 198 grün).**

### P0.4 — (geprüft) idol_sanctum „Key-Deadlock" ist KEIN Soft-Lock
- speedrunner vermutete: `idolhall_key` droppt nur von `last_idol` *innerhalb* idol_sanctum → unbetretbar.
- **Verifiziert:** `last_idol` hat `zone: "idolhall"` → spawnt **open-world** in der Götzenhalle (dungeon-diver farmte ihn dort). Key ist erhältlich (content-refs-Guard bestätigt). **Kein** Fix nötig. Wahrer Blocker = combatLevel-100-Gate = **P0.1**.
- **Status: ERLEDIGT (Fehlalarm, dokumentiert).**

## 🟠 P1 — Große Systemlücken (als Nächstes)

### P1.1 — Keine Gold-Senken (merchant) → Reichtum folgenlos — 🟡 ERSTER SCHRITT FERTIG
- Gesamter Shop war **6.071 g** (in 1h verdient), danach toter Goldberg (7,6 Mio nach 200h).
- ✅ **Schritt 1 (Batch B):** kaufbare Dungeon-Schlüssel im Shop (warband 4k → idolhall 160k, ~10–20 Runs-Äquivalent) → Shop-Wert 6k→245k, skaliert mit Endgame-Reichtum. Engine brauchte nichts (ShopEntry reicht).
- **Noch offen (späterer Batch, koppelt an Stadt/logic-dev):** skalierender Luxus-Shop (5–6-stellig), perm. Gold/XP-Boosts, Bank-Upgrades als wirklich große Senken.
- ✅ **Stadt-Slice-A fertig** (Laden/Bank unter „Stadt", Quests-Placeholder) — `design/city-plan.md`.

### P1.2 — Crafting-Gold-Exploit (min-maxer) — ✅ VALIDIERT/ENTSCHÄRFT
- balance-designer-Audit (`design/crafting-margin-audit.md`): die 2,27 Mio g/h waren **Doppel-Artefakt** — NPC zahlt nur `value×SELL_FRACTION(0,5)`, und „unendliche Inputs" ignorierten die Beschaffung (Mining+Smelt = ~11× der Forge-Zeit). **Realer Voll-Ketten-Netto: ~64–88k g/h** = unter Thieving (132k)/Dungeon (266k). **Kein Gelddrucker, kein Schmiede-Nerf nötig.**
- **Einziger echter Rest (klein, → content-dev in Batch B):** `rough_onyx.value` 560→240 (roh minen+verkaufen = 114k g/h schlägt das Amulett 64k → Weiterverarbeiten bestraft den Spieler). Optional `onyx.value` 1300→900 (vorher Folge-Crafts craft_onyx_ring/soul_amulet prüfen).

### P1.3 — Magie-Identität zerfällt ab Tier 2 (mage) — 🟡 GRÖSSTENTEILS FERTIG (Batch C)
- ✅ weaponEffect auf ALLE RC-Stäbe (frost_scepter→frost, aether→burn, stormcaller/voidcaller→shock, godspark→burn-stark) — Magie spürbar magisch + differenziert von Ranged (P2.7).
- ✅ INT-Rüstungslinie: 12 neue Items, 4 Tiers (apprentice→godspark), `modifiers.int` 3→14 + magicDamage + maxMana, 3 Set-Boni, craftbar. „0 INT-Gear"-Lücke geschlossen (verifiziert: wird in computeStats angewendet).
- **Noch offen:** Magier-**Überlebensmechanik** (Mana-Schild / Frost-Slow-Defensive als Gegenstück zum Melee-Lifesteal) + Mana als echte Ressource (Burst-Cast). → *combat-dev (Batch D/E)*

### P1.4 — Combat zu leicht / keine Gefahr (melee-bruiser)
- 0 Tode bei 99k Kills, Dungeons in <1 Min. Food/Auto-Eat-Tiers nutzlos, keine Spannung.
- **Fix-Richtung:** Monster-Schaden/Accuracy im Mid/Endgame anziehen; Boss-Mechaniken (Spike/Heilphasen). → *balance-designer → content-dev/combat-dev*

### P1.5 — Dungeon-Runs zu kurz/seicht + Reward-Whiff (dungeon-diver)
- Runs 24–59 s, 4–5 Trash-Wellen, kein Tiefgang; namensgebendes Reward-Mat nur 0.6 Chance (alpha_fang 0× in 5 Runs); idol_sanctum (Pinnacle) ist mit 4 Wellen der KÜRZESTE.
- **Fix-Richtung:** mehr Wellen/Boss-Phasen, **skalierbare „Tiefe N"**, **Pity-Zähler** aufs Kern-Reward, mehr Wellen für idol_sanctum. → *content-dev + combat-dev*

## 🟡 P2 — Balance & Content-Tiefe

- ✅ **P2.1 ranged ×2 XP-Overtune** (Batch D): ranged-Offense-XP ×2→×1.2 (melee-Niveau + Munitions-Bonus), Gates greifen wieder. *Folge-Check (P3, klein): Magie-Offense-XP steht noch bei ×2 — Parität prüfen, kein Playtest hat es bisher als Problem gemeldet.*
- ✅ **P2.2 feather-Quelle** (Batch C): neue Foraging-Aktion `forage_feathers` (Lv5, 2–5 Federn) — Pfeil-Loop selbstversorgbar.
- ✅ **P2.3 Holz-Bögen niched** (Batch C): ashbark/ironbark/shadowpine/bonewood bekommen critChance/critDamage/-Tempo als Crit/Tempo-Nische (verifiziert angewendet) vs. Flat-Damage-Composite.
- ✅ **P2.4 Thieving-Leiter monoton** (Batch D): 5 Stufen (market_stall/warehouse/city_guard/noble/reliquary) Direkt-Gold angehoben → streng monoton 6,8k→165k. Spec: `design/combat-gold-and-thieving-audit.md`.
- **P2.5 Keine Completion-Rewards + nur 10 Schwellen-Achievements** (completionist): keine bestiary/collection/skill-max/all-dungeons-Rewards; `checkAchievements` hart auf 4 condition.types; keine aggregierten X/Y-Zähler. Neue condition.types + Belohnungen + Counter. → *logic-dev + content-dev*
- 🟡 **P2.6 Combat-Gold — DEUTLICH VERBESSERT, Rest = Design-Entscheidung** (2 Iterationen): realisiertes gold/h von ursprünglich **1,6× → 2,1× (Iter1) → ~3–4× (Iter2)**, Farm-Spot-Meta existiert jetzt, grob monoton mit Level. **Rest-Limit:** gleichstufige Mobs mit verschiedener HP differieren durch den Kill-Zeit-Floor (≤~110 HP = ~2,45s/Kill) → Rest-Inversion (thorn_wolf 76k > ash_tyrant 60k), und last_idol (66k) leicht unter scale_skarn (72k). Per-Mob-Handtuning kann das nicht sauber lösen. **CEO-Entscheidung offen:** strukturell fixen (z.B. `gold`-Ertrag teilweise an Kill-Zeit/HP koppeln statt rein per-Mob), oder Rest-Inversion als akzeptabel belassen. Auto-Tuning hier bewusst **gestoppt** (diminishing returns). Spec: `design/combat-gold-and-thieving-audit.md`.
- 🟢 **Neuer Mini-Fund (melee-Retest):** combatLevel-Falle — `meleeOffense=(attack+power)/2`; wer nur `power` grindet (attack=1) klemmt bei 75 (reicht für aerie, nicht idol). Design-OK, aber UI braucht **Gate-Hinweis** „benötigt combatLevel X" + Hinweis, dass beide Melee-Skills zählen. → *ui-dev (P3.4-nah)*.
- ✅ **P2.7 Ranged ≡ Magic** (Batch D verifiziert): Profile laufen messbar auseinander (11,6% am Regen-Mob — Magie via burn-DoT durch Regen/Resist, Ranged via Burst/Krit). Kein Rebalance nötig.
- 🟡 **P2.8 Gear-Lücke / Combat-entkoppelt** (speedrunner, melee-bruiser): ✅ Batch C fügte 10 thematische Mid-Tier-**Monster-Drops** hinzu (Dornenschwert, Aschklinge, Moosplatten …) → Kämpfer rüsten jetzt auch durchs Kämpfen auf. Top-Tier (runite/godiron) bleibt Dungeon/Smithing — bewusst. [[creative-item-license]]

## 🟢 P3 — Politur / Langzeit

- **P3.1 Mastery faktisch tot** (completionist + afk-skiller): Pool nach 1 Woche 0,81%, nach 90 Tagen erst 5,7% → erster Checkpoint (10%) im Normalspiel **unerreichbar**, Capstone Fiktion. Zudem **XP/h flach über alle Mastery-Level** (Mastery trifft nur Loot/Tempo ≤15%, nicht XP) → kein spürbares Feedback fürs Hochziehen. Fix: Pool-Checkpoints drastisch früher ODER Cap senken; Mastery-Bonus spürbarer (auch XP/Wert).
- **P3.7 AFK-Komfort fehlt** (afk-skiller): nur 10 Start-Inventar-Slots, **kein Auto-Bank/Auto-Verkauf**, **keine Auto-Craft-Chain** für mehrstufige Rezepte (Spieler muss Zwischenprodukte manuell fertigen). Für die AFK-Persona zentrale Reibung. → *logic-dev/ui-dev*
- **P3.2 Combat-Kill-XP winzig vs Sammeln** (casual-idler): Combat-Idle fühlt sich level-mäßig wie Stillstand. Kill-XP ~3–5× ODER pro Kill auf Stil-Spur bündeln (überschneidet mit P0.1).
- **P3.3 item.requirements.fletching ≠ craft.levelRequired** (archer): bauen vs tragen inkonsistent angleichen.
- **P3.4 „Empfohlenes Level"/Gefahr-Marker pro Monster** (casual-idler): verhindert Death-Loops. (UI)
- **P3.5 Offline-Rückkehr-Belohnung sichtbar** (casual-idler): „während du weg warst: +X". (UI, evtl. vorhanden)
- **P3.6 Sammel-Soft-Cap/Bank-Anreiz** (casual-idler): Grund periodisch zurückzukommen.

## QA-Konsolidierung (kontrolleur, nach Batch D) — 🟢 GRÜN / ship
210 Tests grün, Build sauber, Sim 0 Auffälligkeiten, alle neuen Felder real angewendet, Determinismus/Save unberührt, UI-Crash-Gate sauber. Offene Mini-Funde:
- 🟡 LOW: `magic_off`-Offense-XP ×2 vs. ranged ×1.2 (combat.ts:185) — Parität prüfen (→ combat-dev, = der P2.1-Folge-Check oben).
- 🟢 INFO: INT-Roben sind 11 statt „12" (apprentice-Tier ohne Beine) — optional `apprentice_robe_legs` ergänzen (→ content-dev).

## Re-Playtest-Validierung (nach Batch A–D)
- **melee-bruiser: 5 → 8/10** — combatLevel-Fix + Melee-Drops greifen voll (alle 5 Dungeons offen, Aufrüsten durchs Kämpfen). Gold-Spreizung nur halb (→ P2.6 Iteration 2). `melee-bruiser-retest.md`.
- **mage: 5 → 7,5/10** — alle 4 Magie-Identitäts-Fixes messbar wirksam (Stab-Effekte, INT-Gear, magic_def-Routing, Ranged≠Magic). Offen: Überlebensmechanik/Mana. `mage-retest.md`.

## Umsetzungs-Reihenfolge (autonome Schleife)
1. **Batch A (läuft):** P0.1 combatLevel-Formel + P0.2 magic_def-XP + P0.3 idol_sanctum-Bug → *combat-dev*. Parallel: Dungeon-Backgrounds + 3-Spalten-Combat-Layout → *ui-dev*.
2. **Batch B:** P1.2 Crafting-Marge VALIDIEREN (*balance-designer*) → dann P1.1 Gold-Senken (kaufbare Keys + Luxus-Shop, koppelt an Stadt-Plan).
3. **Batch C:** P1.3 Magie-Identität (weaponEffects + INT-Gear + Defensive) + P2.1/P2.7 ranged/magic-Tuning.
4. **Batch D:** P1.5 Dungeon-Tiefe + Pity; P1.4 Schwierigkeit.
5. **Batch E:** P2.5 Completion-Rewards + Achievements-System; P2.2/2.3/2.4 Content-Balance.
6. **Re-Playtest** nach jedem größeren Batch: betroffene Personas erneut laufen lassen, Zahlen gegenprüfen.

## Stand der autonomen Schleife (Batches A–D + Retests, alle grün)
✅ **Erledigt & verifiziert:** P0.1 combatLevel-Formel · P0.2 magic_def · P0.3 idol_sanctum · P1.1 Gold-Senke Schritt 1 (kaufbare Keys) · P1.2 Crafting-Marge (entschärft, nur rough_onyx-Fix) · P1.3 Magie-Identität (Stab-Effekte + INT-Roben, ohne Überlebensmechanik) · P2.1 ranged-XP · P2.2 feather-Quelle · P2.3 Holz-Bögen · P2.4 Thieving monoton · P2.6 Combat-Gold (2 Iter, deutlich besser) · P2.7 ranged≠magic · P2.8 Mid-Tier-Drops · Stadt-Slice-A · 10 kreative Boss-Drops. **Re-Playtests: melee 5→8, mage 5→7,5.** QA: 🟢 ship.

## Offene CEO-Entscheidungen (wenn Chef zurück ist)
1. **combatLevel-Formel** (P0.1) bestätigen — jetzt fokus-belohnend (Single-Style erreicht Endgame). Playtests: klar besser. OK so?
2. **Combat-Gold** (P2.6) — Rest-Inversion durch Kill-Zeit-Floor strukturell fixen (gold an Kill-Zeit koppeln) oder belassen?
3. **Combat-Gold-Rebalance generell** — substanzielle Economy-Änderung (58 Mobs), leicht revertierbar; passt die Richtung (Farm-Spot-Meta)?
4. **Laden/Bank** unter „Stadt"-Sektion lassen oder zurück nach „Sonstiges"?

## Nächste größere Features (brauchen deine Priorisierung — NICHT spekulativ gebaut)
- **P1.5 Dungeon-Tiefe + Pity** (dungeon-diver 5/10): Runs zu kurz (24–59s), Reward verpufft. „Tiefe N"-Mechanik + Pity-Zähler = neue State/SAVE_VERSION → Design-Entscheidung.
- **P2.5 Completion-Rewards + Achievements-System** (completionist 6/10): neue condition.types (bestiaryComplete/skillMaxed/allDungeonsCleared…) + aggregierte X/Y-Zähler + Belohnungen. Größeres logic-dev-Feature.
- **P1.3-Rest Magier-Überlebensmechanik** (mana-Schild/Frost-Slow) + Mana als echte Ressource.
- **P1.4 Combat-Schwierigkeit** (melee: 0 Tode in 99k Kills) — Mid/Endgame-Gefahr, Boss-Mechaniken.
- **P3.1 Mastery-Überarbeitung** (completionist+afk: Pool nach 90d nur 5,7%, XP/h flach) — Cap/Checkpoints/Bonus.
- **P3.7 AFK-Komfort** (afk-skiller): Auto-Bank/Auto-Verkauf, Auto-Craft-Chain, mehr Start-Slots.
- **Stadt-Plan Slice B+** (`design/city-plan.md`): echtes Quest-/Daily-Quest-System.

## Kleine Folge-Tickets (decision-frei, für einen späteren Mini-Batch)
- magic_off-Offense-XP ×2 vs ranged ×1.2 — Parität prüfen (combat-dev).
- `apprentice_robe_legs` ergänzen (INT-Roben-Tier1 komplettieren) (content-dev).
- combatLevel-Gate-Hinweis im UI („benötigt combatLevel X", beide Melee-Skills zählen) (ui-dev).
