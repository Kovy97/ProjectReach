# Autonomer CEO-Run — 2026-07-01 (~12 h, Chef weg)

**Mandat:** Chef ~12 h abwesend, volle CEO-Autonomie, keine Rückfragen. Queue koordiniert abarbeiten,
immer GRÜN halten (Typecheck alle Pakete + Engine-Tests ohne sim + Persistenz + Client-Build), periodisch
frische ZIP bauen (`steam\grimreach_depot_4915451.zip` + `Downloads\GrimReach-0.1.0-Playtest.zip`), hier loggen.
**Single-Writer strikt:** nur EIN Schreiber gleichzeitig auf `packages/content/src/index.ts` UND auf
`packages/shared/src/index.ts`. Bei zusammengefasstem Kontext hier weiterlesen + Status updaten.

**Ziel am Ende:** neues SIM-Agent-Toolkit nutzen → **10 verbesserte Sim-Agenten** losschicken →
Funde triagieren → fixen → grün → ZIP.

## Queue (Stand Start 2026-07-01 ~14:00)
**EA-Bugfixes (Chef-Rapidfire):**
- [x] #1 Offline-Popup Kampf-Skill-Icons (getSkillIcon ?? getSidebarIcon) — erledigt
- [x] #2 Offline-Cap 12h→8h (MAX_OFFLINE_MS) — erledigt
- [x] #3 Karten-Header 0×/LV in die Ecken (px statt %) — erledigt
- [x] #5 Pfeile in Bogen-Dropper-Drops — Agent grün
- [ ] #4 Save-Übersicht breiter/klarer + Spielzeit OHNE Offline (neues `activePlayMs`) — **Agent A läuft**
- [ ] #6 Dev-Notes auf manchen Action-Cards entfernen (vermutlich Item/Aktions-`name`/`description`)
- [ ] #8 Dungeon-Keys aus ALLEN Shops entfernen (content)
- [ ] #9 Attack-Speed-Suffix „of the Viper" wirkt nicht (−0.0s) — computeStats/Suffix-Anwendung
- [ ] #10 Bogen-Equip verlangt fälschlich Fletching 20 — Equip-Requirement-Logik
- [ ] #11 alle Pfeile im Köcher equippable (isAmmoItem)
- [ ] #12 Pfeil-Max-Stack 9999
**Infra:**
- [ ] #189 SIM-Agent-Toolkit (headless Treiber + Personas + Reporting + UI-Audit) — **Agent läuft** → dann 10 Sim-Runs

## Reihenfolge (Single-Writer-sicher)
1. **Agent A (#4):** shared (SAVE_VERSION) + engine + persistence + MainMenu — läuft als aktueller shared/engine-Writer.
2. **Danach Agent B:** ranged/ammo/suffix-Cluster (#9–12) + #8 Keys + #6 (falls content) — sole content+shared-Writer.
   (Erst nach A starten, damit nicht zwei gleichzeitig shared/index.ts schreiben.)
3. **#189** fertig → verifizieren → dann **10 Sim-Runs** → Funde fixen.
4. Zwischendurch grün halten + ZIP an stabilen Checkpoints.

## Steam-Stand (Kontext, siehe [[ea-0.1-release-push]])
AppID **4915450**, Depot **4915451**. Build hochgeladen (BuildID 23999996), Store in Valve-Prüfung,
Release **2026-08-10**, Preis **9,99 €**. Balance-Fixes + dim_essence-Frühquelle bereits drin (Sim: 0 echte Walls).
Capsules hochskaliert (später nativ ersetzen). Trailer offen.

## Log
- ~14:00 Run gestartet. Agent A (#4) + #189 laufen. Nächster Schritt: Agent B nach A.
- ~14:10 **Agent A (#4) fertig+grün** (activePlayMs, SAVE_VERSION 43→44, Save-Übersicht breiter). StatsPage-Konsistenz nachgezogen (elapsedMs→activePlayMs). shared frei.
- ~14:12 **Agent B gestartet** (combat-dev, sole content+shared-Writer): #9 Attack-Speed-Suffix, #10 Bogen-Equip, #11 Pfeile equippable, #12 Stack 9999, #8 Dungeon-Keys, #6 Dev-Notes.
- ~14:25 **#189 SIM-Toolkit fertig+grün** (sim-player/personas/report + ui-audit-plan + Guard-Test, 469 Engine-Tests). Toolkit bereit für 10 Sim-Runs.
- WARTE auf Agent B → dann verifizieren + ZIP-Checkpoint → **10 Sim-Runs** (Toolkit) → Funde fixen.
- Toolkit-Follow-ups (später, ui-dev): Renderer-Test-Hook `?fixture=` + Playwright-Scaffold für echten UI-Audit; content-Guards (i18n/Platzhalter/Icon-Refs).
- ~14:35 **Agent B fertig+grün** (Ranged-Cluster #9-12 + #8 Keys + #6 Dev-Note). Engine 474, Persistenz 58, Build. Tasks #185-188 erledigt. Bonus-Fund (offen): Magie-Waffen verlangen `runecrafting` zum Equippen (gleiche Klasse wie Bögen) → in Fix-Runde mitnehmen.
- Nächste Schritte: (1) programmatischen Persona-Sweep laufen (persona-sweep.test.ts) → Baseline-Findings; (2) 10 LLM-Tester-Agenten mit dem neuen Toolkit + ui-audit-plan; (3) Funde triagieren + fixen (inkl. Magie-Equip); (4) frische win-unpacked + ZIP.
- ~14:45 **Programmatischer Persona-Sweep durch** (persona-sweep.test.ts): 6 Personas, nur 2 P3/feel (Ziel im Zeitbudget nicht erreicht = erwartbar), **0 Crashes/Walls, 0 P0-P2** → Engine mechanisch solide.
- ~19:xx **BALANCE-ÜBERHOLUNG KOMPLETT (Chef-freigegeben, autonom).** Sweep 3 (20 ziel-gerichtete Spieler) → Balance-Pass 2 (Stil-Parität-Grundwerte, Pfeil-Ranged-Reqs, 2H, voidweave, Tower) → Balance-Pass 3 (Leder-dex-Mods, Ranged-precise-Stance 1.12→1.0, Endgame-Bow-Flats+Bleed-DoTs, Magie-Uptime, Waffen-Werte-Cap, 9 Bögen-Retier, combatLevel `magic_off` + XP-Faktoren) → Magie-L90-Feinjustierung (staff-Intervalle tief). **ERGEBNIS: Parität ±10 % über alle 3 Stile L1–L90** (vorher Midgame Melee +40-60 %, L90 ranged −26 %/magie −30 %). 0 Walls, CL-Pacing 2 CL, volle Sim 491/491. Specs: design/balance-pass2/3-2026-07-01.md; Triage: design/sweep3-2026-07-01/TRIAGE.md. OFFEN (Rest-Sweep3): Ranged-Idle-Auto-Reload (P2) + P3-Politur (ach_sets count, Starter-Köcher, Sidebar-alt „Hearthforge Idle", Regen-Label, Onboarding 3→4, dungeon-test-Gear-IDs). Design-Flag Chef: DoT-Stile (burn/bleed) stark vs tanky/regen = intendierte Nische.
- ~16:00 **SWEEP2 (25 Agenten) + FIX-PASS 2 KOMPLETT+GRÜN.** Alle 25 Berichte + `TRIAGE.md` in `design/sweep2-2026-07-01/`. 3 Fix-Agenten (content/ui/logic) durch: **P1 Köcher-im-UI-befüllbar** (Chef-#11 endlich komplett), **witherling-Farming-Pet dropbar** (ach_pets_all erreichbar), **dim_essence-Gold-Loop geschlossen** (aus Shop), **Pfeil↔Bogen-Paarung** 0 Mismatches, roher Pet/Status-Token weg, Skilling-Toast-Spam gefixt, Umlaut-Rest, Enchanting-Proc+Reason-Codes, Tooltip-Buffs, Rarity-Sort, Onboarding-Text korrekt, +viele P3. Typecheck 5/5 · Engine 481 · Persistenz 71 · Sim 3/3 (0 Walls) · Build. Frische ZIP baut.
- **CHEF-BALANCE-LISTE (nicht autonom, für Chef-Rückkehr) in `design/sweep2-2026-07-01/TRIAGE.md`:** Stil-Parität Midgame (Melee +40-60%), 2H-Melee tot, voidweave<godspark-Set-Inversion, Magie-Waffenleiter craft-only, Slayer-Tower-Etagen überlevelt, Default-Stance-Melee-Wall@boar-L10, Ranged-Auto-Reload, endgame gold/XP, scale_skarn-Portrait.
- ~14:50 **10 Tester-Agenten dispatcht** (kontrolleur, Fokus je: 01-onboarding, 02-combat-ranged, 03-crafting, 04-economy, 05-idle-offline, 06-robustness, 07-completionist, 08-ui-audit, 09-i18n-content, 10-feel-qol) → Findings nach `design/sweep-2026-07-01/`. WARTE auf Berichte → aggregieren + triagieren + Fix-Pass (inkl. Magie-Waffen-runecrafting-Equip).

## CHEF-DIREKTIVE (kurz zurück, ~15:xx)
- **Pfeil-Drops überarbeiten:** Pfeile von Bogen-Gegnern NUR wo sinnvoll; **Pfeil-Tier nach MONSTER-LEVEL** (Metall-Leiter), NICHT nach Bogen-ammoType. Keine Eisenpfeile auf Lv1-Mobs → Eisen ~L10–24 etc. Mengen auf Low-Mobs runter. (Nebenwirkung des Pfeile-Agenten, vom Ökonomie-Sweep bestätigt.)
- **Danach: Sweep mit 25 verbesserten Sim-Agenten** (nicht 10) zur Validierung. Budget vom Chef freigegeben.

## Aggregierte Findings (10er-Sweep) — Triage-Liste für Fix-Pass
**P1:** (a) Deutscher Achievement-Block = ASCII-Umlaute (181 Strings, content 11045-11621). (b) Roher Pet-Token auf Charakterblatt „+15% gatherYield · onHitStatus" (CharacterPage:653) = der „Dev-Notes"-Leak.
**P2 (content):** Magie-Waffen runecrafting-Equip (57/62 → nur magic_off lassen). dim_focus-Geldmaschine (value 120→~30). ach_quests_100 unerreichbar (count ≤88). Pfeile-Rework (tier-getreu, s.o.). ember_essence Single-Source (2-3 Quellen). (s)-Pluralisierung 22 EN-Achievements + „1 Auftraege". „First Clear"→„Erste Leerung" (Fehlübersetzung). Gift-Terminologie Antigift/Antidot/Gegengift vereinheitlichen. 10 Items ohne Icon (Emoji-Fallback).
**P2 (ui):** Enchanting-Vorschau hart EN (t("stat.*")). Bestiarium emoji→echte Icons. Offline-Popup Gold-Zeile 🪙→Icon.
**P2 (design/chef-flag, NICHT autonom umbauen):** Standard-Stance trainiert nur attack (+ Onboarding-Text „automatisch" faktisch falsch → Text-Fix ja, Stance-Verhalten = Chef). 21-Schritt-Onboarding kürzen (Onboarding = Chef-Milestone). Offline-Determinismus Farming+Kampf (logic-dev: eigener Farming-RNG oder Anspruch akzeptieren).
**P3:** Stale Kommentare (persistence:924 „24h", GameContext:190 „12h" → 8h). tower_* ohne slayerFloor. Bank ohne Sort/Filter. Skilling-Glücksfunde ohne Toast. keeneye Item/Aktion-Namensdiff. Slayer/Monsterjäger. Farm-Begriffe EN (Crops/Plots). nav.city „City" (Stadt stillgelegt → toten Eintrag raus). chicken iron_arrow (in Pfeile-Rework mit). forge_tower_compound netto-negativ.
