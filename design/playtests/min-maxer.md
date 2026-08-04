# Playtest-Feedback — Persona: „Der Min-Maxer / Theorycrafter"

**Spielstil (1–2 Sätze):** Ich optimiere alles auf Effizienz — beste XP/h, beste Gold/h, optimale Gear-/Skill-Reihenfolge. Ich suche die „Meta", liebe Spreizung zwischen Aktivitäten (es soll sich lohnen, das Optimum zu finden) und werde genervt, wenn entweder eine triviale Aktion alles dominiert ODER Optimierung gar nichts bringt.

**Methode:** Engine direkt angesteuert (`runReport()` aus `sim.ts` + eigener Harness in `_playtest_minmaxer.test.ts`). Gemessen über jeweils **1 h Sim-Zeit**, deterministischer Seed. Aktionen mit Über-Inventar (kein Overflow), Inputs „unendlich" verfügbar (misst die reine Aktions-Effizienz, nicht die Beschaffungskette). Combat mit fixiertem Combat-Level + rollengerechtem Gear. Dungeons als geared Endgame-Held (Kampf L90, Götzeneisen-Set) geloopt.

---

## Kernbefunde (zahlengetrieben)

### 1) Es GIBT eine dominante Gold-Strategie: Endgame-Smithing schlägt alles um 1–2 Größenordnungen

| Aktivität (Top je Kategorie) | XP/h | Gold/h (Netto-Marktwert) |
|---|---:|---:|
| **forge_godiron_blade** (Smithing) | 216.672 | **2.266.800** |
| forge_godiron_body | 252.252 | 2.226.660 |
| forge_aetherium_blade | 131.370 | 1.698.240 |
| craft_onyx_amulet (Jewelcrafting) | 85.680 | 1.142.300 |
| enchant_god_focus (Runecrafting) | 52.380 | 617.700 |
| cut_godwood_tree (Woodcutting) | 205.920 | 515.392 |
| **Bestes Combat (geared, aether_wraith)** | — | **80.411** |
| Bestes Combat (Bronze-Baseline) | — | 7.030 |
| Bestes Thieving (heist_idol_hoard) | 120.884 | 132.011 |

**Befund:** Das Schmieden von Endgame-Gear liefert ~2,27 Mio Gold/h Marktwert — das **~28-fache** des besten Kampf-Gold/h (80k) und das **~17-fache** des besten Sammel-Golds. Selbst Jewelcrafting (Onyx-Amulett, 1,14 Mio g/h) und Runecrafting (618k g/h) hängen jede Kampf-/Sammel-Aktivität ab. Für einen Min-Maxer ist die Schlussfolgerung trivial und damit **langweilig**: „Skill Smithing → forge das teuerste Item → verkaufen". Combat als Gold-Quelle ist faktisch irrelevant.

⚠️ **Caveat (Harness-Bias):** Diese Gold/h messen den **Marktwert der Output-Items minus Input-Items**, mit *unendlich verfügbaren Inputs* — die Zeit/Kosten der Erz-/Barren-Beschaffung sind NICHT eingerechnet. In der Realität ist die Beschaffungskette (mine_godiron 253k xp/h aber nur 114k g/h Erz, smelt_godiron) der Flaschenhals. Trotzdem: Solange Output-Wert ≫ (Input-Wert + Verarbeitungszeit), bleibt „selbst schmieden und verkaufen" der dominante Geld-Loop. **Das muss validiert werden** — wenn ein godiron_blade für ~2.4k+ verkauft, aber die 5 Barren (à 480 value → ~1.2k Verkaufswert) plus Mining-Zeit deutlich billiger sind, ist die Marge real und ausbeutbar.

### 2) XP/h-Spreizung ist gesund (126×), aber innerhalb eines Skills oft trivial-monoton

- **Spread XP/h:** min 2.006 (pickpocket_merchant) → max 253.368 (mine_godiron) = **126×**. Gut — Optimierung lohnt sich klar.
- **ABER:** Innerhalb eines Skills ist „nimm immer die höchste freigeschaltete Aktion" praktisch immer optimal (XP/h steigt monoton mit Tier). Es gibt keinen interessanten Trade-off (z.B. „niedrigeres Tier = mehr XP/h aber weniger Gold", oder Mastery-Break-Even). Min-Maxer-Entscheidung = „klick die unterste Zeile der Liste". Das ist **keine** Theorycrafting-Tiefe.
- **Thieving** ist durchgehend das schlechteste XP/h (2.006–3.243 bei den Pickpockets) — als reiner Skiller ein Trap-Skill, lohnt nur für seinen Gold/Loot-Nebeneffekt.

### 3) Combat-Style-Parität: brauchbar, aber NICHT gleichwertig (Stil ist mob-abhängig)

Gleiches Combat-Level (L40), rollengerechtes Gear, Food cooked_trout:

| Gegner | Stil | s/Kill | Gold/h | XP/h |
|---|---|---:|---:|---:|
| goblin_rogue (Lv5) | MELEE | 2,9 | 13.776 | 21.677 |
| | RANGED | 2,6 | 15.093 | 19.780 |
| | MAGIC | 2,6 | 15.093 | 19.780 |
| skeleton_warrior (Lv16) | MELEE | **5,5** | **11.056** | 19.824 |
| | RANGED | 7,4 | 8.199 | 17.372 |
| | MAGIC | 7,4 | 8.199 | 17.372 |

**Befunde:**
- Gegen ungepanzerte/niedrige Mobs (goblin) sind **Ranged = Magic ~10 % besser** als Melee (schnelleres Tempo / Krit).
- Gegen den tankigeren skeleton_warrior dreht es: **Melee ist ~35 % besser** (5,5 vs 7,4 s/Kill) — Melee-Lifesteal + Power-Skalierung greift bei Mobs mit Defense.
- ⚠️ **Ranged und Magic liefern in MEINEN Tests identische Zahlen** (grimoak_longbow+iron_arrow vs dim_focus ergeben exakt 2,6/7,4 s/k). Das riecht nach zu enger Balance ODER danach, dass die beiden Waffen bei L40 zufällig denselben effektiven DPS haben. Für einen Min-Maxer ist „zwei Stile, ein Ergebnis" enttäuschend — wo ist der Grund, Magic statt Ranged zu spielen? Magie kostet Mana (MANA_PER_CAST), Ranged kostet Munition — wenn der Output gleich ist, gewinnt immer der mit den billigeren Ressourcen.
- **Positiv:** Es gibt KEINE global dominante Stil-Wahl — der beste Stil hängt vom Gegner ab (Melee vs tanky, Ranged/Magic vs squishy). Das ist genau die Art von Entscheidung, die ich mag. Aber sie ist aktuell schwach ausgeprägt (10–35 % Delta) und Ranged/Magic sind zu austauschbar.

### 4) Combat-Gold/h ist überraschend flach — kein lohnendes „Farm-Spot"-Meta

Geared Endgame-Held, Top-Gold-Mobs: aether_wraith 80.411 → forest_warden 67.215 → goblin_warlock **67.066** (!) → ash_tyrant 66.711 → last_idol 66.521.

**Befund (Anti-Meta-Problem):** Ein Lv14-Goblin (goblin_warlock) liefert quasi gleich viel Gold/h wie der Lv120-Endboss (last_idol)! Spreizung Top→Top10 nur ~80k→51k = **1,6×**. Für einen Min-Maxer heißt das: **es lohnt sich nicht, schwierigere/höhere Gegner zu farmen** — niedrige Mobs sterben schneller und gleichen ihren geringeren Gold-pro-Kill durch Kill-Speed aus. Es gibt keinen „dieser eine Spot ist die Meta"-Moment. Das ist die langweilige Variante: Optimierung bringt fast nichts, also farme ich, wo's bequem ist.

### 5) Dungeons: Gold/h-Zahlen brauchbar, aber Loot-Wert-Messung defekt; idol_sanctum-Bug

| Dungeon | reqL | Runs/h | Gold/h (direkt) |
|---|---:|---:|---:|
| highland_aerie | 65 | 75 | **266.449** |
| crypt_depths | 30 | 134 | 194.903 |
| goblin_warband | 12 | 344 | 145.410 |
| wildwood_hunt | 34 | 121 | 132.942 |
| idol_sanctum | 100 | 720 | **0** ⚠️ |

- **highland_aerie** ist mit 266k g/h **>3× besser** als das beste Dauer-Combat (80k) → für den geared Held ist Dungeon-Loop das echte Gold-Meta nach Smithing. Gut, dass es Spreizung gibt (266k vs 133k = 2×).
- ⚠️ **idol_sanctum: 0 g/h direkt bei 720 „Runs"/h** ist ein klarer Mess-/Logik-Bug. 720 Runs/h = alle 5 s ein „Run" — der Run-Zähler triggert fälschlich, weil zwischen Encounter-Wellen kurzzeitig `dungeonId===null && monsterId===null` gilt oder der Dungeon sofort scheitert. **Bitte prüfen:** Wird idol_sanctum überhaupt korrekt abgeschlossen, oder bricht `last_idol` (Lv120) den Run ab? Die direkte Gold-Belohnung (8000/run) müsste sonst dominieren.
- ⚠️ **Loot-Value/h (~200 Mio überall)** ist ein Harness-Artefakt (zählt vorgesetzte Schlüssel-/Food-Stacks mit) — ignorieren. Nicht aussagekräftig.

---

## Was sich gut anfühlt ✅
- **Gesunde XP/h-Spreizung (126×)** über alle Skills — Tier-Progression fühlt sich nach Fortschritt an.
- **Combat-Style-Trade-off existiert** (Melee@tanky vs Ranged/Magic@squishy) — im Ansatz genau das, was ein Theorycrafter will.
- **Dungeon-Gold (highland_aerie 266k/h) ist ein lohnendes Spät-Ziel** mit echter Spreizung gegenüber anderen Dungeons.
- **Mastery-System** (Speed/Double/Preserve) ist da und bietet potenziell Optimierungs-Tiefe (habe ich nur indirekt gemessen).

## Was sich zu langsam/zäh/langweilig anfühlt ⚠️
- **Smithing = unangefochtene Gold-Meta** (2,27 Mio g/h, ~28× Combat). Trivial zu finden → langweilig. Sobald ein Min-Maxer das merkt, ignoriert er Combat-Gold komplett.
- **Combat-Gold ist zu flach** (Lv14-Goblin ≈ Lv120-Boss). Optimierung bringt nichts → der frustrierende „warum überhaupt aufsteigen?"-Moment.
- **Innerhalb eines Skills keine Entscheidung** — immer „höchstes Tier = bestes XP/h UND Gold/h". Kein Trade-off.
- **Ranged ≡ Magic** in den Zahlen — ein Stil ist redundant.

## Reibungspunkte & Frust (konkret)
1. **Gold-Economy ist durch Crafting ausbeutbar.** Wenn Output-Verkaufswert > Input-Beschaffungskosten, ist „forge & sell" ein Gelddrucker. → Bitte den realen Break-Even messen (inkl. Mining-/Smelt-Zeit).
2. **Combat lohnt sich ökonomisch nicht** gegenüber Skilling — ein Min-Maxer würde Kampf nur für Combat-Level/Drops machen, nie für Gold.
3. **idol_sanctum-Dungeon-Bug** (0 Gold, 720 Phantom-Runs) — Endgame-Content scheint kaputt oder unabschließbar.

## Was fehlt für ein vollwertiges Spiel (Persona-Sicht) + Vorschläge (priorisiert)

**P1 — Gold-Sink & Crafting-Marge entschärfen.** Der Verkaufswert von gecrafteten Items darf nicht so weit über den Inputs liegen, dass „craften → NPC-verkaufen" das Optimum ist. Optionen: (a) Verkaufspreis (SELL_FRACTION) für High-Tier-Gear stark senken, (b) Inputs teurer/zeitintensiver machen, (c) echte Gold-Sinks (Reparatur, teure Upgrades, Slot-Kosten skalieren härter). **Validierung:** Break-Even-Sim mit *realer* Beschaffungskette statt unendlicher Inputs.

**P2 — Combat-Gold/Drops nach Mob-Level spreizen.** Höhere Mobs müssen spürbar mehr Gold/h ODER exklusive, wertvolle Drops liefern, sonst gibt es kein „Farm-Spot-Meta". Ziel: Top-Mob ~3–5× Gold/h des Einstiegs-Mobs (statt aktuell 1,6×).

**P3 — Ranged vs Magic differenzieren.** Magic sollte z.B. via Statuseffekte (burn/frost) gegen tanky/regen-Mobs glänzen, Ranged via Krit/Tempo gegen squishy. Aktuell identisch → ein Stil ist überflüssig.

**P4 — Intra-Skill-Trade-offs einbauen.** Mindestens an einigen Stellen: niedrigeres Tier = mehr XP/h aber weniger Gold (oder umgekehrt), oder Mastery-Break-Even-Punkte, damit „welche Aktion grinde ich?" eine echte Frage wird.

**P5 — idol_sanctum-Dungeon fixen** (Mess-/Abschluss-Bug).

---

## Spaß-Bewertung: **6 / 10**
Die Bausteine für tiefes Theorycrafting sind da (große XP-Spreizung, mob-abhängige Stil-Wahl, Mastery, Dungeon-Spreizung), aber die **Gold-Economy ist durch Endgame-Crafting trivial dominiert** und **Combat-Gold ist zu flach, um Optimierung zu belohnen** — für einen Min-Maxer aktuell zu viel „eine offensichtliche Strategie schlägt alles" statt spannender Trade-offs.
