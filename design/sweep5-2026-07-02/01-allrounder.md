# Sweep 5 — 01 Ehrlicher Früh-Allrounder (Multi-Goal, Toolkit v2)

**Agent:** Kontrolleur (QA) · **Datum:** 2026-07-02
**Methode:** `RealisticPlayer.pursue()` — voll ehrlich (kein `give`/`setSkillLevel` im Honest-Teil), Stil melee, Starter-Kit.
**Ziele:** `[combatLevel(25), skillLevel("fishing",30), skillLevel("smithing",20), gold(10000), completeQuest("q_shaman_hunt")]`
(q_shaman_hunt = frühe 3er-Kette q_first_blood → q_goblin_slayer → q_shaman_hunt).
**Budget:** 30 Sim-h · **Seeds:** 11, 42, 1337 (Teil 1/2) + 5, 99, 424242 (Death-Band, Teil 3).
**ALLE Zeitangaben = SPIELZEIT.** Temp-Messskript in `packages/engine/src` angelegt und wieder GELÖSCHT; kein Spiel-Code geändert.

---

## Verdikt in einem Satz

Das Toolkit v2 trägt (2 von 3 Seeds erreichen 5/5 Ziele, deterministisch, saubere Berichte) — aber das
Referenz-Signal „Allrounder stirbt wiederholt an Gegnern weit UNTER seinem CL" ist **auf allen Seeds
reproduzierbar**, und die Ursache ist **nicht** Monster-Tuning, sondern die **Food-Ökonomie**: mit
vollem Food-Vorrat gibt es im gesamten L8–25-Band **null Tode** (sogar 2 Level über CL), ehrlich
finanziert kollabiert die Versorgung → **P2 bestätigt, aber als Ökonomie-Rebalance, nicht als Mob-Nerf.**

---

## 1) Multi-Goal-Ergebnis je Seed (formatMultiGoalMarkdown)

### Allrounder Seed 11 (melee, 30 Sim-h Budget)

**Spielzeit:** 29 h 43 min · **Ziele:** 5/5 erreicht · **Frictions:** 2

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 25 erreichen | ✅ | Kampf-Niveau 25/25 | 29 h 21 min |
| fishing auf Level 30 | ✅ | fishing Lv 30/30 | 6 h 22 min |
| smithing auf Level 20 | ✅ | smithing Lv 20/20 | 7 h 56 min |
| 10000 Gold besitzen | ✅ | 13189/10000 Gold | 10 h 54 min |
| Quest q_shaman_hunt abschließen | ✅ | completed | 29 h 43 min |

Endstand: CL25, Gesamtlevel 190, 114 330 Gold, 4 922 Kills, **6 Tode** (boar L10 @CL19,
tower_goblin L15 @CL19, goblin L15 — alle UNTER Level). Gear @CL25: **bronze_sword** + Kupfer-Platten.

### Allrounder Seed 42 (melee, 30 Sim-h Budget)

**Spielzeit:** 19 h 5 min · **Ziele:** 5/5 erreicht · **Frictions:** 17

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 25 erreichen | ✅ | Kampf-Niveau 25/25 | 7 h 26 min |
| fishing auf Level 30 | ✅ | fishing Lv 30/30 | 11 h 26 min |
| smithing auf Level 20 | ✅ | smithing Lv 20/20 | 15 h 58 min |
| 10000 Gold besitzen | ✅ | 10449/10000 Gold | **2 h 46 min** |
| Quest q_shaman_hunt abschließen | ✅ | completed | 19 h 5 min |

Endstand: CL26, Gesamtlevel 192, 164 712 Gold, 4 296 Kills, **0 Tode**. Gear @CL26: **crude_waraxe**
(0,28 %-Drop!) + wooden_shield. Das 10k-Gold-Ziel fiel nach 2 h 46 min — fast komplett aus
**One-Shot-Chicken-Idle** (chicken L1: 4 g + Loot alle ~2,8 s, null Food-Kosten).

### Allrounder Seed 1337 (melee, 30 Sim-h Budget) — der Ausreißer

**Spielzeit:** 30 h 0 min · **Ziele:** 1/5 erreicht · **Frictions:** 5

| Ziel | Status | Stand | Spielzeit |
| --- | --- | --- | --- |
| Kampf-Niveau 25 erreichen | ◐ 92 % | Kampf-Niveau 23/25 | — |
| fishing auf Level 30 | ◐ **0 %** | fishing Lv 1/30 | — |
| smithing auf Level 20 | ◐ **0 %** | smithing Lv 1/20 | — |
| 10000 Gold besitzen | ✅ | 10223/10000 Gold | 8 h 40 min |
| Quest q_shaman_hunt abschließen | ◐ 100 % | **locked, 1/1 Ziele erfüllt** | — |

Endstand: CL23, 5 759 Kills, **13 Tode**, 0 Quests geclaimt. **Warum gescheitert:**
1. **Tod-Spirale:** Tode an rot_rat (**L3!** @CL11), tower_goblin (L15 @CL19), goblin (L15 @CL21),
   boar (L10 @CL21), bull_boss (L15 @CL22) → je 2 Tode = Blacklist → der Ziel-Pool schrumpft auf
   Schwach-Mobs (plague_grub/cow) → CL kriecht (30 h für CL23; Seed 42 brauchte 7,5 h für CL25).
2. **Scheduler-Starvation (Toolkit):** fishing/smithing bekamen in 30 h **kein einziges** aktives
   Fenster (Details Finding #5).
3. **Quest „100 % aber locked":** alle Schamanen-Kills waren da (Lifetime-Zähler), aber die
   Prärequisiten-Claims liefen nie (Finding #6).

**Spannweite der Seeds:** CL25 in 7 h 26 min … >30 h (4×+). Treiber ist fast ausschließlich die
Tod→Blacklist→Schwachmob-Spirale — also Finding #1/#2, nicht Kampf-DPS.

---

## 2) Friction-Log als Spieler-Feedback (der Kern)

Aggregiert aus den drei Läufen (formatFrictionMarkdown; 24 Events, 4 Muster):

**Muster A — „Ich sterbe an Gegnern, die weit unter mir sind, und verstehe nicht warum" (7 Events, alle Seeds).**
> „Wiederholt gestorben an rot_rat (Lv3) — Ziel gewechselt" — Evidence: `{deaths:2, combatLevel:11, food:"cooked_trout"}`
> „Wiederholt gestorben an boar (Lv10)" @CL19–21 · „an goblin (Lv15)" @CL21 · „an tower_goblin (Lv15)" @CL19 · „an bull_boss (Lv15)" @CL22

Als Spieler-Feedback gelesen: Das Monster-Level ist als Gefahren-Signal **irreführend**. Gefährlich
ist nicht der Mob, sondern die **Kampf-DAUER ohne Food-Nachschub** (Idle-Strecke). Ein Neuling, der
„grüne" Gegner 8 Level unter sich anwählt und nachts stirbt, erlebt das als unfair/kaputt.

**Muster B — „Mein Idle bricht still ab" (implizit in allen Tod-Events).** Nach jedem Tod stoppt der
Kampf (kein Auto-Neustart, `onPlayerDefeated`), d.h. der REST der Idle-Strecke (im Sim bis ~3 h, real:
die Nacht) läuft leer. Seed 1337 hat so einen Großteil seiner 30 h verloren. Für einen echten Spieler:
morgens einloggen → „nichts passiert seit 23:40". Kein UI-Vorwurf hier prüfbar (headless), aber das
Verhaltensmuster ist die eigentliche Strafe des Todes — und sie ist unsichtbar.

**Muster C — „Anlegen geht nicht: Inventar voll" (16 Events, Seed 42).**
> „Upgrade copper_platebody ließ sich trotz erfüllter Anforderungen nicht anlegen (Inventar voll)"

Mechanik (Code verifiziert): Gear **stapelt** (`addItem` ignoriert `stackable`, inventory.ts:110–114).
Wer aus einem 2+-Stack anlegt, braucht bei vollem Inventar einen freien Slot für das getauschte Teil
(equipment.ts:88–92 — der Guard ist KORREKT, Datenverlust-Schutz). Für den Spieler klingt „Inventar
voll" beim ANLEGEN aber paradox (er will ja nichts hinzufügen). Die 16 Wiederholungen sind Sim-Retry-Spam
(Toolkit), das Grundmoment trifft echte Spieler mit vollem Inventar genauso.

**Muster D — „Mein Quest-Ziel bewegt sich nicht" (Seed 42/1337).**
> „Ziel ‚Quest q_shaman_hunt abschließen' kommt nicht voran — zu anderen Zielen rotiert" — Evidence: `{detail:"locked, 0/1"}`

Teils Toolkit (Claims lazy, Finding #6). Spiegel-Frage ans Spiel: Lifetime-Zähler machen Quest-Ketten
beim Nach-Claimen retroaktiv sofort fertig (angenehm!) — aber solange die Vorquest nicht geclaimt ist,
zeigt die Ziel-Quest „locked" trotz 100 % Fortschritt. Ein „Belohnung abholbar"-Badge auf der ganzen
Kette wäre das UI-Gegenstück.

**Positiv (auch das ist Spieler-Feedback):** Kein einziges Food-/Munitions-Sackgassen-Event
(„Kein Food beschaffbar") in 90 Sim-h Allrounder-Läufen; Kill-Durchsatz on-level 118–241 Kills/h
fühlt sich flott an; fishing 30 nach 6–11 h und smithing 20 nach 8–16 h Spielzeit im Multi-Goal-Mix
sind ordentliches Allrounder-Pacing.

---

## 3) Death-Band-Validierung L8–25 (Referenz-Signal: boar L10 @CL15, goblin_spearman L20 @CL23)

**Reproduzierbar? JA — auf 3/3 Seeds, an allen 5 Mobs.** Zwei Messreihen, je 1 Sim-h pro Zelle,
Auto-Restart nach Tod, ehrlich hochgespieltes Gear/Level (pursue bis Checkpoint; CL10 nach 44–184 Sim-Min):

**(B) EHRLICH versorgt** (Food per Bank/Shop-Nachkauf alle 10 Sim-Min bis 40 Stück, Gold-Reserve 60,
Inventar-Entlastung per Original-Heuristik — also genau das, was der RealisticPlayer selbst tut):

| Mob (Lv) | on-level CL | Kills/h | **Tode/h** | Food gegessen/h | Gold für Food/h |
| --- | --- | ---: | ---: | ---: | ---: |
| boar (10) | 10 | 118–123 | **20–27** | 120–172 | 3 360–4 480 |
| boar (10) | 16 (≈Referenz „@CL15") | 136–142 | **13–20** | 120–175 | 3 360–4 900 |
| goblin (15) | 17 | 229–237 | **8–16** | 120–228 | 3 360–6 384 |
| goblin_shaman (18) | 20 | 139–152 | **18–36** | 40–240 | 560–6 720 |
| goblin_spearman (20) | 22 | 132–141 | **28–47** | 0–240 | 0–6 720 |
| goblin_spearman (20) | 23 (Referenz „@CL23") | 138–146 | **26–44** | 0–240 | 0–6 720 |
| goblin_archer (22) | 24 | 161–176 | **39–59** | 0–240 | 0–6 720 |

**(C) DIAGNOSE — identische Checkpoints/Gear, aber Food-Vorrat über der maximalen Essrate**
(1 300 cooked_trout gestellt; 1 Biss/3 s ⇒ max 1 200/h — einziger nicht-honest Eingriff, klar deklariert):

| Mob (Lv) | CL | Kills/h | **Tode/h** | Trout-VERBRAUCH/h |
| --- | --- | ---: | ---: | ---: |
| boar (10) | 10–18 | 137–151 | **0** | 323–385 |
| goblin (15) | 17–20 | 237–241 | **0** | 299–314 |
| goblin_shaman (18) | 20–22 | 160–161 | **0** | 485–512 |
| goblin_spearman (20) | 22–24 | 152–164 | **0** | 576–661 |
| goblin_archer (22) | 24 | 195–196 | **0** | 836–913 |

**Interpretation — die Kernaussage dieses Sweeps:**
- Die **Kampf-Mathematik ist NICHT zu scharf**: mit ausreichend Food stirbt selbst der rusty_sword-Spieler
  an einem Mob 2 Level ÜBER seinem CL **nie** (archer L22 @CL24: 0 Tode). Kill-Raten sind überall gesund.
- Der Tod kommt **immer über leergelaufenes Food**. Der Bedarf (300–913 Trout/h) übersteigt, was ein
  ehrlicher Spieler nachschieben kann — ökonomisch UND versorgungslogistisch:

| Mob | Gold-Income/h (Kills × Gold) | Food-Bedarf/h (Trout à 28 g Shop) | **Netto** |
| --- | ---: | ---: | ---: |
| chicken L1 (Kontrast) | ~5 000 | ~0 (dmg 1) | **+5 000** |
| boar L10 | 3 900 | 10 100–10 800 | **−6 500** |
| goblin L15 | 8 600 | 8 400–8 800 | **±0** |
| goblin_shaman L18 | 9 000 | 13 600–14 300 | **−5 000** |
| goblin_spearman L20 | 10 400–11 200 | 16 100–18 500 | **−6 500** |
| goblin_archer L22 | 14 800 | 23 400–25 600 | **−9 500** |

  (Loot-Verkäufe kommen obendrauf, drehen das Vorzeichen aber nicht — die B-Läufe VERKAUFTEN Junk per
  Heuristik und konnten trotzdem nur 120–240 Trout/h finanzieren/nachschieben.)
- **Band zu scharf? Nein — aber P2 trotzdem JA:** Das erlebte Ergebnis (wiederholte Tode weit unter CL,
  totes Idle) ist real und reproduzierbar; der richtige Hebel ist die **Food-/Gold-Ökonomie des Kampfes**
  (und/oder Tod-Verhalten im Idle), nicht ein Nerf von boar/goblin_spearman.
- Gear-Kontext: Teil-B-Charaktere trugen bis CL24 **rusty_sword** (Leveling nur über das CL-Ziel → keine
  Quest-Rewards; Teil-A-Allrounder standen @CL25 auch nur bei bronze/crude). Besseres Gear halbiert die
  Kampfdauer/Kill (Sweep 3: steel maxHit ~101 vs rusty 58) → Food-Bedarf ~halbiert, Income verdoppelt —
  Gear-Progression ist der halbe Fix; der ehrliche Weg dorthin ist aber selbst gold-/quest-gated.

---

## 4) Findings

**#1 [P2][balance] Kampf im L8–25-Band ist food-ökonomisch defizitär → wiederholte Tode an Mobs weit unter CL — confirmed.**
- Repro: Tabellen (B)/(C) oben, Seeds 5/99/424242; Referenz-Kombos boar@CL16 und spearman@CL23 bestätigt.
- Erwartet: On-Level-Kampf ist mit ehrlicher Versorgung tragfähig (±0 bis leicht positiv).
- Tatsächlich: Bedarf 300–913 Trout/h vs. Income 3,9–14,9k Gold/h → −5k bis −9,5k/h; Versorgung reißt ab → 8–59 Tode/h. Mit vollem Food: 0 Tode überall.
- Hebel (Owner: **balance-designer** spezifizieren, **content-dev** anwenden): Mob-Gold im Band anheben ODER Food-Heilwerte/-Preise (cooked_trout 28 g/20 HP) neu setzen ODER Auto-Eat-Effizienz (AUTO_EAT_COOLDOWN_MS 3 s, Schwelle 50 %) — Ziel: goblin-Niveau (±0) als UNTERGRENZE fürs ganze Band.

**#2 [P2][idle/design] Tod stoppt den Kampf ohne Neustart → Rest der Idle-Strecke verfällt still — confirmed.**
- Code: `onPlayerDefeated` (packages/engine/src/combat.ts:591–608): voll heilen, `stopReason:"defeated"`, `monsterId=null`, KEIN Auto-Restart.
- Wirkung: In Kombination mit #1 stirbt der Idle-Spieler nach Minuten bis ~1 h und die Session ist tot (Seed 1337: 13 Tode, 30 h für CL23; Seed 42: 0 Tode, 7,5 h für CL25 — 4× Varianz allein hieraus).
- Entscheid (Chef/Design, Umsetzung **combat-dev**): Auto-Resume nach Tod mit Malus (z.B. Food-/Gold-Abzug) ODER bewusst so lassen + UI muss den Tod-Zeitpunkt/Grund beim Wiedereinstieg klar zeigen (**ui-dev**).

**#3 [P3][ux] Monster-Level ist als Gefahren-Signal irreführend; kein Sustain-Hinweis — confirmed (Friction, 7 Events).**
- „Wiederholt gestorben an rot_rat (Lv3)" @CL11 mit cooked_trout gesetzt. Gefahr = Food-Verbrauchsrate vs. Vorrat über die Kampfdauer, nicht Mob-Level.
- Empfehlung (**ui-dev**, nach #1-Entscheid): Kampf-Start-Hinweis „geschätzter Food-Verbrauch/h" oder Warnung „Vorrat reicht ~X min gegen diesen Gegner".

**#4 [P3][balance] Anreiz-Inversion: chicken L1 ist die beste risikofreie Frühgame-Goldquelle — confirmed.**
- Seed 42: 10 000 Gold nach 2 h 46 min via One-Shot-Chicken (~5k/h, 0 Food-Kosten) während On-Level-Kampf Gold verbrennt (#1). Optimalstrategie = Under-Level-Farmen; kollidiert mit „Combat ist fundamental". Owner: **balance-designer** (mit #1 zusammen lösen).

**#5 [P3][toolkit] Multi-Goal-Scheduler kann 0 %-Ziele dauerhaft aushungern — confirmed.**
- Seed 1337: fishing/smithing nach 30 h exakt Lv 1 (kein einziges Fokus-Fenster). Ursache: Score `0.2 + 0.6·progress + 0.3·flow + 0.25·rand` (packages/engine/src/sim-realistic.ts:420–436) — Max-Score eines 0 %-Skilling-Ziels (0,45) < Min-Score eines ~90 %-Kampf-Ziels im Flow (~1,05); deterministisch verhungert.
- Fix-Idee (Owner: **logic-dev**, reines Sim-Toolkit): Anti-Starvation-Term (Fenster seit letztem Fokus) oder Score-Deckel. Wichtig für die Aussagekraft künftiger Multi-Goal-Sweeps.

**#6 [P3][toolkit] Quest-Ketten-Claims sind lazy — Prärequisiten werden nur in Fokus-Fenstern geclaimt — confirmed.**
- `claimCompletedQuestGoals` (sim-realistic.ts:615–626) claimt nur die ZIEL-Quest; die Kette (questTask, 553–613) nur bei Fokus. Seeds 11/42: q_first_blood/q_goblin_slayer erst nach 18–29 h geclaimt (längst erfüllt); Seed 1337: nie → Ziel endet als „locked, 1/1 erfüllt".
- Nebenwirkung: Quest-Reward-Gear (copper/bronze/iron_sword …) bleibt liegen → die Sim unterschätzt ehrliches Gear (rusty_sword bis CL24 in Teil B). Ein echter Spieler claimt früher. Owner: **logic-dev** (Toolkit): completed Prärequisiten der Ziel-Quest in `claimCompletedQuestGoals` mitclaimen.

**#7 [P3][toolkit/doku] Stale-Kommentar: sim-player.ts behauptet Engine-Auto-Restart nach Tod — confirmed.**
- packages/engine/src/sim-player.ts:159–166 („Ein normaler Tod startet in der Engine automatisch neu und lässt monsterId GESETZT") widerspricht combat.ts:591–608 (genau umgekehrt). Messung bleibt korrekt (deaths via `stats.deaths`-Delta), aber der Kommentar führt den nächsten Sweep-Agenten in die Irre. Owner: **logic-dev** (Kommentar angleichen).

**#8 [P3][ux] „Inventar voll" beim ANLEGEN aus einem Stack — Mechanik korrekt, Botschaft unintuitiv — confirmed (Mechanik) / suspected (UI-Wortlaut).**
- Gear stapelt (inventory.ts:110–114); Equip aus 2+-Stack braucht bei vollem Inventar einen freien Slot fürs getauschte Teil (equipment.ts:88–92, Datenverlust-Schutz korrekt). 16 Frictions in Seed 42. Owner: **ui-dev** (Tooltip „Getauschtes Item braucht einen freien Slot"); Toolkit-Retry-Spam dämpfen (**logic-dev**, P4).

**Positiv-Befunde:** Toolkit v2 (pursue/Goals/Berichte) funktioniert und ist deterministisch; keine Food-/Ammo-Sackgassen-Frictions; Skilling-Pacing (fishing 30 ≈ 6–11 h, smithing 20 ≈ 8–16 h Spielzeit im Mix) gesund; Kill-Durchsatz on-level 118–241/h.

---

## Top-3 fürs Triage

1. **[P2] Food-Ökonomie des Kampfes L8–25** (#1, mit #4): On-Level-Kampf ist gold-negativ und versorgungstechnisch nicht haltbar → reproduzierbare Tode an Mobs bis 14 Level unter CL. Kampf-Mathe selbst ist sauber (0 Tode bei vollem Food) — Ökonomie-Hebel, kein Mob-Nerf.
2. **[P2] Tod im Idle = stiller Totalausfall der Session** (#2): kein Auto-Resume, keine sichtbare Strafe außer verlorener Zeit; 4×-Varianz in Zeit-bis-CL25 (7,5 h vs >30 h) hängt fast nur daran.
3. **[P3] Toolkit-Härtung vor dem nächsten Multi-Goal-Sweep** (#5/#6/#7): Scheduler-Starvation + lazy Quest-Claims verzerren sonst künftige Persona-Berichte.
