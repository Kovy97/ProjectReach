# Sweep 6 — T1 Frühspiel-Härtung (Multi-Goal, honest)

**Agent:** Kontrolleur (QA) · **Datum:** 2026-07-03 (Nacht-Loop)
**Methode:** `RealisticPlayer.pursue()` — voll ehrlich (kein `give`/`setSkillLevel`), Stil melee (Default-Persona), frischer Spielstand mit Starter-Kit (20 cooked_shrimp, Auto-Eat @50 %).
**Ziele:** `[combatLevel(15), skillLevel("woodcutting", 20), gold(1000)]` · **Budget:** 25 Sim-h · **Seeds:** 31, 62.
**ALLE Zeitangaben = SPIELZEIT.** Wegwerf-Harness (`_tmp_s6t1_*.test.ts` in `packages/engine/src`) nach dem Lauf GELÖSCHT; kein Spiel-Code geändert.

---

## Verdikt in einem Satz

**Beide Seeds erreichen 3/3 Ziele in unter 5 h der 25-h-Budgets, mit 0 Friction-Events und zusammen genau 1 Tod in ~50 Sim-h** — das Frühspiel (CL 1–15) ist nach den Fixes gesund und gold-positiv; der eine Tod entlarvt aber eine Toolkit-Falle (Auto-Eat auf Mini-Potion-Stack gesetzt) UND den härtesten Effekt der Kein-Regen-Ökonomie (v49): **ohne funktionierendes Auto-Eat stirbt im Idle JEDER — ein frischer Spieler am Tutorial-Huhn nach 13 Sim-Minuten.**

---

## 1) Multi-Goal-Ergebnis je Seed

### Seed 31 (melee, 25 Sim-h Budget)

**Spielzeit: 4 h 46 min · Ziele: 3/3 · Frictions: 0 · Tode: 0**

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 15 | ✅ | 15/15 | 3 h 47 min |
| woodcutting Lv 20 | ✅ | 20/20 | 4 h 46 min |
| 1000 Gold | ✅ | 1411/1000 | 1 h 30 min |

Endstand: CL 15, Gesamtlevel 97, 8 589 Gold (Lifetime verdient ~11,9k, ausgegeben 3 323), 1 479 Kills (310/h), HP 30/30. Gear: rotfang_dagger + wooden_shield + leather_helm + apprentice_robe_body.

### Seed 62 (melee, 25 Sim-h Budget)

**Spielzeit: 4 h 34 min · Ziele: 3/3 · Frictions: 0 · Tode: 1**

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 15 | ✅ | 15/15 | 4 h 34 min |
| woodcutting Lv 20 | ✅ | 20/20 | 1 h 54 min |
| 1000 Gold | ✅ | 1315/1000 | 2 h 20 min |

Endstand: CL 15, Gesamtlevel 94, 2 409 Gold (verdient ~8k, ausgegeben 5 591), 1 007 Kills (220/h), HP 25/30. Gear: bronze_sword + wooden_shield + leather_helm + apprentice_robe_body. **1 Tod an cow (Lv 5) @CL 5 bei Sim-Min ~140** (Details §2).

**Antwort auf die Auftragsfrage „kommen beide durch?": JA, mit >5× Budget-Reserve.** Zum Vergleich Sweep 5 (L8–25-Band): 2/3 Seeds, bis 13 Tode, bis 17 Frictions. Das Frühband ist der gesündeste bisher vermessene Abschnitt.

---

## 2) Der eine Tod — Drilldown Seed 62 (deterministisch reproduziert)

Via Budget-Prefix-Brackets (gleiche Seed, `pursue`-Budget 121/126/132/138/144/150 Min ⇒ bit-identischer Lauf bis zum Schnitt):

| Spielzeit | Zustand |
| --- | --- |
| 114–118 min | Nach WC-20-Ziel: Quest-Claims + Gear-Einkauf (Robe 90 g, Schild, Helm) → **Gold nur noch 229** |
| 120 min | Idle-Vorbereitung: Ziel „Kampf cow" (on-level, CL 5); Food-Puffer-Kauf **+6 cooked_trout** (mehr nicht bezahlbar: 169 g über der 60er-Reserve ÷ 28 g) — und dabei Auto-Eat-Slot auf **minor_healing_potion (4 Stück, heal 3)** umgestellt |
| 121 min | Auto-Eat = Potion(3) — frisst den 4er-Stack in ~90 s leer |
| 126 min | **Auto-Eat tot** (Potion 0) — 6 trout + 8 shrimp liegen UNGENUTZT im Inventar; HP 10.7 |
| 132 min | HP 5.7 — langsames Ausbluten an einer Level-5-Kuh (Schaden 1 / 3,6 s) |
| 138 min | HP 2.6 |
| ~140 min | **TOD** (stop=defeated, Voll-Heal, Kampf aus) — Kills frieren bei 151 ein, Rest-Idle (~10 min) verfällt still |

Ursachenkette: **(a)** Toolkit-Bug — `stockFoodForIdle` wählt das Auto-Eat-Food per `bestFoodInInventory()` OHNE Mindestmengen-Guard (Finding #2); **(b)** Kein-Regen v49 + kein Auto-Eat-Fallback ⇒ leergelaufener Food-Slot im Idle = sicherer Tod, egal wie trivial der Gegner (Finding #1/#3); **(c)** menschlich plausibler Verstärker: der Gear-Einkauf 2 Minuten vor der Idle-Strecke ließ kein Gold für einen echten Food-Puffer übrig.

Gegenprobe: identischer Prefix, aber Food-Slot bleibt auf shrimp (19 nachgekauft) ⇒ **40 Min Kuh-Idle ohne Tod**, HP pendelt 11–17/20, sogar 20 Min lang GANZ ohne Food (Level-up-Heals + seltene Treffer kompensieren). Der Tod ist also kein Kuh-Tuning-Problem, sondern ein Food-Slot-Problem.

---

## 3) Kein-Regen-Ökonomie (v49) + Kill-Cooldown 5 s — tragfähig?

**Sustain-Sonden ab frischem Spielstand** (Starter-Kit, honest, 60 Min Dauerkampf ab Minute 0, Seed 62):

| Gegner (Lv) | Kills/h | Gold/h | Starter-Food (20 shrimp) leer ab | **TOD in Sim-Min** |
| --- | ---: | ---: | ---: | ---: |
| chicken (1) | 263 | ~1 290 | Min 9 | **13** |
| cow (5) | 84 | ~1 200 | Min 4 | **5** |
| rot_rat (3, Poison) | 220 | ~1 340 | Min 3 | **3** |

- **Für den AKTIVEN Spieler tragfähig:** Die Haupt-Läufe zeigen es — mit Fenster-Upkeep (Food nachkaufen, Gear, Vitality steigt) 1 Tod in 50 h, CL 15 in 3 h 47–4 h 34, Frühband **gold-positiv** (verdient 1,75–2,5k/h vs. Food-Kosten ~0,8–2,8k gesamt pro Lauf) — anders als das defizitäre L10–22-Band aus Sweep 5 #1.
- **Für den UNBEAUFSICHTIGTEN Frischling nicht:** Vor v49 trug die natürliche Regeneration jeden Starter-Mob unbegrenzt; jetzt stirbt ein frischer Charakter, der einfach nur das erste Huhn anklickt und das Fenster verlässt, **nach 13 Sim-Minuten** — und die Session endet hart (kein Auto-Restart, Sweep 5 #2). Auch der „risikofreie Chicken-Gold-Farm" (Sweep 5 #4) ist damit nicht mehr risikofrei — aber der Preis zahlt sich am neuen Spieler zuerst aus.
- **Kill-Cooldown 5 s:** frisst bei den kurzen Früh-TTKs ~35–40 % der reinen Kampfzeit (4,3–4,4 Kills/Min in den Sonden). Pacing bleibt trotzdem gesund (s.o.) — die Entschleunigung wirkt wie gewollt, ohne das Frühband zu brechen.

---

## 4) Waffen-Upgrades zeitnah? (gearScore-Fix) — JA

| Seed | Mainhand-Timeline (Spielzeit) | Quelle |
| --- | --- | --- |
| 31 | rusty_sword → copper_sword @2 min → bronze_sword @56 min → **rotfang_dagger @3 h 19** | Quest → Shop-Kauf → **0,23 %-Drop erkannt + angelegt** |
| 62 | rusty_sword → copper_sword @2 min → bronze_axe @1 h 56 → bronze_sword @2 h 30 | Quest → Quest (Axt = Waffe+WC-Tool) → Shop-Kauf |

Dazu je 3 Rüstungs-Slots (Schild/Helm/Body) bis ~Stunde 2–3 gefüllt. Kein „rusty_sword bis CL 24" mehr (Sweep 5 Teil B); der Score erkennt auch Range-Form-Drops (rotfang_dagger). Randnotiz (P4): beide Melee-Läufe enden in der **apprentice_robe** (Caster-Body, con 1/int 1) — als con-Träger legitim bester Body im frühen Shop, liest sich aber stil-fremd.

---

## 5) Friction-Muster (FrictionCollector)

**0 Events in beiden Läufen** („Keine Reibungspunkte — die Session lief flüssig") — gegenüber Sweep 5 (2–17 Events/Lauf, 4 Muster) sind Inventar-Equip-Spam, Munitions- und Food-Sackgassen im Frühband komplett verschwunden. Der Seed-62-Tod erzeugte KEIN Friction-Event (1 Tod < `DEATH_BLACKLIST_AT` = 2 — korrekt nach Spec, aber der Bericht lebt hier vom Log, nicht vom Collector).

---

## 6) Findings

**#1 [P2][balance/design] Kein-Regen (v49) macht unbeaufsichtigtes Frühst-Spiel in Minuten tödlich — selbst am Tutorial-Mob — confirmed.**
- Repro: Sonden §3 — frischer Starter-Kit-Charakter, `startCombat("chicken")`, 60 Min ticken: Food leer Min 9, **Tod Min 13** (cow: 5, rot_rat: 3). Danach harter Stopp — Rest der Session tot.
- Erwartet (EA-Neuspieler-Funnel): Die erste unbeaufsichtigte Viertelstunde am Level-1-Mob endet nicht im Tod.
- Einordnung: Regen-Entfernung ist bewusster Chef-Entscheid („spürbar, aber fair") und für den aktiven Spieler funktioniert sie (§3). Die Schärfe am Kaltstart (maxHp 11, shrimp heal 1, Auto-Eat-Schwelle 50 % = 5,5 HP) wirkt aber über dem Intent. Hebel (Owner: **balance-designer** spezifizieren, Chef entscheidet): Starter-Food-Menge/-Heilwert, Auto-Eat-Stufe-0-Schwelle, oder Gnaden-Regen unterhalb CL ~5; alternativ bewusst lassen + Tod-UX (#3) priorisieren.

**#2 [P3][toolkit] `stockFoodForIdle` setzt Auto-Eat auf Mini-Stack-Potions — verursachte den einzigen Tod des Laufs — confirmed.**
- Code: `packages/engine/src/sim-realistic.ts:1407` — `bestFoodInInventory()` OHNE Mindestmenge; `manageFood` (Zeile 1461) hat den Guard (`bestFoodInInventory(FOOD_LOW) ?? …`) mit exakt dieser Begründung im Kommentar („2 Notfall-Potions schlagen KEINEN 500er-Stapel Shrimp") — der Sweep5-T5-Pfad hat die eigene Lektion nicht übernommen.
- Wirkung: Seed 62 @120 min — nach Trout-Kauf wird `minor_healing_potion` (4 Stück, heal 3 > trout 2) als Auto-Eat gesetzt → 90 s später Auto-Eat tot, 14 echte Food-Items ungenutzt → Tod (§2). Verzerrt künftige Tod-Statistiken aller Personas. Owner: **logic-dev** (reines Sim-Toolkit) — vor dem nächsten Persona-Sweep fixen.

**#3 [P3][design/ux] Auto-Eat hat keinen Fallback, wenn das gewählte Food leerläuft — mit Kein-Regen ist der leere Food-Slot im Idle ein stilles Todesurteil trotz vollem Inventar — confirmed (Spiegel des Sim-Tods).**
- Code: `packages/engine/src/combat.ts:88–99` (`tryAutoEat`: nur `character.food`; count < 1 ⇒ kein Essen, kein Wechsel).
- Spieler-Erlebnis aus §2: „Ich hatte 14 Essen dabei und bin an einer Kuh gestorben." Vor v49 war der leere Slot lässlich (Regen), jetzt ist er die häufigste plausible Idle-Todesursache.
- Entscheid (Chef/Design): Fallback aufs nächste essbare Inventar-Item (mit Log/Toast) ODER bewusst Melvor-artig lassen — dann aber UI-Warnung „Food-Slot leer/fast leer" beim Idle-Beginn bzw. im Kampf-Panel (**ui-dev**), passend zu Sweep 5 #3 (Sustain-Hinweis).

**#4 [P4][doku] Stale-Kommentar: `state.ts` behauptet Out-of-Combat-Regen — confirmed.**
- `packages/engine/src/state.ts:102` „(HP regeneriert nur außerhalb des Kampfes)" widerspricht v49 (Regen komplett entfernt, `HP_REGEN_PER_TICK` gestrichen — shared/index.ts:358–363). Gleiche Klasse wie Sweep 5 #7. Owner: **logic-dev**.

**#5 [P4][flavor] Melee-Persona endet in der Caster-Robe (`apprentice_robe_body`) — works as coded.**
- Beide Seeds; con 1 macht die Robe zum legitim besten frühen Body-Teil im Shop (90 g, requirements magic_off 1). Falls unerwünscht: früher, günstiger Melee-Body in den Shop (**content-dev**) — kein Bug.

**Positiv-Befunde:** 3/3-Ziele auf beiden Seeds mit >5× Zeitreserve; 0 Frictions (erstmals); Frühband gold-positiv; Gold-Ziel 1000 nach 1 h 30–2 h 20; woodcutting 20 nach 1 h 54 (fokussiert) bzw. 4 h 46 (im Mix); Waffen-Progression inkl. Rare-Drop-Erkennung zeitnah (§4); Kill-Cooldown bremst ohne Progressions-Schaden; Scheduler-Fairness (It2) hält alle drei Ziele parallel in Bewegung (keine 0-%-Starvation mehr).

---

## Top-3 fürs Triage

1. **[P2] Kaltstart-Letalität unter Kein-Regen** (#1, mit #3): Tod am Tutorial-Huhn nach 13 Sim-Minuten unbeaufsichtigtem Spiel + harter Session-Stopp — vor EA 0.1 bewusst entscheiden: Werte weichzeichnen oder Tod-UX sichtbar machen.
2. **[P3] Toolkit-Fix `stockFoodForIdle`** (#2): Ein-Zeilen-Fix (Guard wie in `manageFood`), sonst verfälschen Potion-Umschalt-Tode jeden künftigen Sweep.
3. **[P3] Auto-Eat-Fallback/Warnung** (#3): der eigentliche Spiel-Hebel hinter dem einzigen ehrlichen Tod dieses Sweeps.
