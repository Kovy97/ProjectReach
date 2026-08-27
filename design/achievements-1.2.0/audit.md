# Achievements 1.2.0 — Audit, In-Game-Vorschlag, Steam-Set

Autor: balance-designer · Stand: 27.08.2026 · Status: ENTWURF für den Chef (kein Code, kein Content geändert)

Grundlage (alles selbst gegengeprüft): `packages/content/src/index.ts` (Block `achievements:`, 537 Defs, per Skript geparst), `packages/shared/src/index.ts` (`AchievementDef`, Zähler-Doku ab Zeile ~4290, `PlayerStats`, `GameState`), `packages/engine/src/achievements.ts` (Auswertung + AP-Meilensteine), `packages/engine/src/leveling.ts` (XP-Tabelle), `apps/client/src/main/steam.ts` + `apps/client/src/renderer/components/Toasts.tsx` (Steam-Brücke), `design/steam-achievements-export.md` (alt, 13.07.), Sim-Lauf `pnpm exec vitest run src/sim.test.ts src/sim-realistic.test.ts` vom 27.08. (Bronze-Baseline, Geared-Held, RealisticPlayer 48 Sim-h), Steamworks-Doku (Stats & Achievements).

Begleitdatei: `design/achievements-1.2.0/steam-set.csv` (dieselben 90 Zeilen wie Abschnitt 3, zum Abtippen/Import).

---

## 0 Kurzfassung

1. 537 Erfolge, davon **458 (85 %) Generator-Fließband**: 268 Monster-Kill-Ketten (84 Monster × 10/100/1000) und 190 Skill-Level-Leitern (19 Skills × 10 Stufen). Kein einziger versteckter Erfolg, keine Belohnung außer AP (AP-Quote → Quest-Marken).
2. **Sieben lebende Systeme haben null Erfolge**: Slayer (Aufträge, Turm, Laden), Champions (28 Varianten, 28 Unikate, Kodex im State), New Haven (15 Bauten × 3 Stufen), Verzauberung/Runen, Meisterschaft (792 Aktionen), Chronik-Kapitel (21), Bestiarium-Vollständigkeit. Der Story-Endboss Drazhan und der Warchief (Kapitel 5) haben nicht einmal einen Kill-Erfolg.
3. **Seltenheit passt nicht zur Schwierigkeit**: „Bull Slayer" (1 Kill, Kapitel 2 verlangt ihn, ~1 h) ist *epic* wie „Woodcutting Maxed" (~35 Fokus-h); 1000 Hühner (1,4 h) ist *rare* wie 1000 Last Idols (≥ 30 h Endgame).
4. **Pacing**: ~30 Erfolge in der ersten Stunde, ~125 in Woche 1, ~215 zwischen 50 und 200 h, ~110 jenseits 200 h oder faktisch nie (u. a. 5 × „1000 Kills" in der Idol-Halle, 100-Tage-Serie, 10 Mio. Gold).
5. Empfehlung In-Game: **auf ~330 Erfolge eindampfen** (Kill-Ketten → Zonen-Bestiarium + Bosse; Skill-Leitern 10 → 5 Stufen), ~75 neue Erfolge für die leeren Systeme, 12 versteckte, Titel/Kosmetik an AP-Quoten. Neue `condition.type`-Werte: 6 Pflicht (für das Steam-Set), 7 Kür; alle rein lesend, kein neuer State, kein SAVE_VERSION-Sprung.
6. **Steam-Set: 90 Erfolge** (Abschnitt 3): 21 Kapitel (2 davon versteckt), 4 Frühgame, 20 × Level 99, 20 × XP-Meilenstein, 20 große Meilensteine, 5 versteckte Scherze. 54 davon brauchen neue interne Erfolge (Kapitel, XP, Slayer, Champions, New Haven, Bestiarium, Tode, Spielzeit).
7. **200 Mio. XP** ist für 15 der 20 Skills realistisch (200–290 Fokus-h; Kampfstile 90–220 h). Nicht sinnvoll bei Farming (2000 h → **30 Mio.**), Vitalität (1700 h → **30 Mio.**), Bannmagie/Warding (3300 h → **20 Mio.**), Diebeskunst und Slayer (350–410 h → **100 Mio.**). Braucht den neuen Typ `skill_xp` (trivial: `state.skills[id].xp` liegt roh im State, XP läuft über Level 99 hinaus weiter).
8. Steam-Technik: Brücke ist fertig verdrahtet und inert; Mapping-Tabelle in `steam.ts` füllen, Sync beim Start zieht Alt-Fortschritt nach (Bestandsspieler bekommen alles gutgeschrieben). Steam deckelt neue Apps bei **100 Erfolgen** bis zur Profil-Feature-Schwelle; 90 bleibt darunter.

---

## 1 Befund

### 1.1 Ist-Zahlen (geprüft am 27.08.)

| Größe | Wert |
|---|---|
| Erfolge gesamt | **537** (59 mit eigenem Emoji-Icon, Rest Kategorie-Fallback) |
| Kategorien | combat 301 · skilling 199 · collection 12 · wealth 9 · quests 8 · gathering 4 · crafting 4 (exploration 0, meta 0 — Typ und UI-Keys existieren) |
| Seltenheit → AP | common 132 (5) · uncommon 159 (10) · rare 181 (25) · epic 51 (50) · legendary 14 (100) → **Σ 10 725 AP** |
| Bedingungstypen | monster_kills 268 · skill_level 190 · dungeons_cleared 21 · total_level 9 · total_kills 6 · paragon_floor 6 · gold_reached 5 · je 4: pets_owned, items_gathered, items_crafted, gold_spent, quests_completed, daily_streak, items_discovered, sets_completed |
| Versteckt / Belohnungen | 0 versteckt (Schema kennt kein `hidden`) · Belohnung nur AP; je 5 % AP-Quote Quest-Marken (`checkApMilestones`), 100 % Zeremonie |
| Abdeckung Monster | 84 von 110 Monstern haben eine 3er-Kette. **Ohne**: feral_goat, the_imp, goblin_reaver, goblin_pikeman, goblin_siegebrute, goblin_bloodshaman, **goblin_warchief** (Kap. 5), ashfield_jackal, mire_wisp, barrow_chanter, hollow_choir, iron_sentinel, **drazhan** (Kap. 20, Story-Endboss), 5 × dg_*, 8 × tower_* |
| Abdeckung Dungeons | 6 von 7 Dungeons (behind_the_throne fehlt; Paragonturm hat eigene Leiter) |
| Abdeckung Skills | 19 von **20** Skills (Slayer hat keine Leiter; das Spiel hat 20 Skills, nicht 21) |
| Bosse | 15 „1 Kill"-Erfolge, 14 × epic, 1 × legendary (Last Idol) + „Godly Drop" (Last Idol × 5) |
| Content-Bezugsgrößen | 110 Monster (18 dungeon-only, 27 Turm) · 11 Zonen (10 Kampf + Turm) · 8 Dungeons · 36 Set-Defs = 35 physische Sets · 21 Begleiter · 28 Champions · 15 Bauten × 3 · 119 Quests (21 Chronik, 38 Neben, 60 Dailies) · 1185 Items · 50 Runen · 792 Aktionen · 30 Feldfrüchte, 9 Beete |

### 1.2 Was gut ist (behalten)

- **Architektur**: rein datengetrieben, keine Event-Hooks; `achievementProgress` liest vorhandene Zähler, die UI zeigt Fortschritt mit denselben Funktionen. Neue Typen sind je ~10 Zeilen.
- **Alt-Save-Nachholung** ist eingebaut: nicht freigeschaltete Erfolge werden bei jedem Check gegen die Zähler geprüft; neue Erfolge greifen beim ersten Tick nach dem Update rückwirkend (Kapitel aus `quests.claimed`, XP aus `skills[id].xp`).
- **Monotone Zähler** (`discoveredItems`, `paragon.best`), Set-Dedup (slayer_set/4pc), AP-Meilensteine idempotent und content-wachstumsfest.
- Die wenigen kuratierten Leitern sind stimmig: Gesamtlevel 25 → 1980 (nach dem 21.08.-Fix erreichbar), Paragon 5 → 30, Begleiter 1/5/10/21, Sets 1/5/10/35.
- Steam-Brücke: Renderer meldet bereits jeden neuen Unlock (`Toasts.tsx:869`) und synct beim ersten Snapshot alle freigeschalteten IDs (`Toasts.tsx:835`); Main-Seite ist ein sauberer No-Op bis AppID/Paket da sind.

### 1.3 Fließband

- **268 Monster-Kill-Ketten** (50 % aller Erfolge): 84 identische „X Slayer / X Reaper"-Tripel. Ein Spieler sieht in der Erfolgsseite 84-mal dieselbe Karte mit anderem Namen. Die Toast-Bündelung (≥ 3 Unlocks → Sammel-Toast) ist bereits ein Symptom davon.
- **190 Skill-Leitern** (35 %): 19 × „Novice/Apprentice/Journeyman/Adept/Veteran/Expert/Master/Grandmaster/Legend/Maxed". Stufe 10 fällt nach ~12 Fokus-Minuten, Stufe 20 nach ~30 Minuten; das sind Level-Ups mit Konfetti, keine Erfolge.
- Zusammen **458 von 537 (85 %)** sind Generator-Output. Das restliche Fünftel (79 Erfolge) ist der eigentliche Erfolgskatalog des Spiels.
- Namen sind austauschbar: „Void Roc Reaper", „Rot Rat Reaper" … Auf Steam wirkt das im Profil billig (und Steam zeigt die globale Freischaltquote je Erfolg an, was bei 84 Tripeln zu einer Wand aus 0,x %-Erfolgen führt).

### 1.4 Systeme ohne Erfolge

| System | Zähler im State (vorhanden) | Erfolge heute | Lücke |
|---|---|---|---|
| Slayer | `slayerTasksCompleted`, `slayerPoints`, `slayerStreak`, `skills.slayer.xp`, Turm-Etagen über `monsterKills` der Monster mit `slayerFloor` | **0** | Aufträge, Serie, Turm-Etagen 1–5, Slayer-Laden, Slayer-Level-Leiter |
| Champions / Elite-Kodex | `eliteCodex[variantId] = {sightings, kills, uniques, fastestKillMs}`, 28 Varianten, 28 Unikate | **0** | erster Champion, alle 28, Unikate, „Der neunte Wächter" |
| New Haven | `camp.buildings[id] = 0..3`, 15 Bauten | **0** | erstes Gebäude, Rathaus III, alles auf III (45 Stufen) |
| Verzauberung / Runen | kein Zähler außer `goldSpent`; 26 Affixe, 29 Suffixe, 50 Runen-Items in `discoveredItems` | **0** | Runen entdeckt (ableitbar); „verzaubert"-Zähler fehlt (Kür) |
| Begleiter | `ownedPets` | 4 (1/5/10/21) | ok; optional stil-spezifisch (3 Magie-Begleiter …) |
| Meisterschaft | `mastery[actionId].xp` (792 Aktionen), `masteryCapes` (Skill-99-Ringe) | **0** | erste Aktion auf 99, 10, 25, 50 |
| Belohnungsladen / Chronik | `quests.claimed` enthält chronicle_01…21 | 0 Kapitel-Erfolge (nur Zähler 1/10/50/75) | **21 Kapitel-Erfolge** (Pflicht Steam) |
| Tägliche Aufgaben | `dailyStreak`; `claimed` enthält jede Daily-ID einmalig (60 im Pool) | Serie 3/7/30/100 | „verschiedene Dailies erledigt" 10/30/60 (ableitbar) |
| Bank / Handel | `bankSlotsPurchased`, `buyBack`; kein Verkaufszähler | 0 | Bankplätze 10/50/max; Verkaufserlös bräuchte neuen Zähler (Kür) |
| Bestiarium | `monsterKills`-Schlüssel mit > 0 | 0 Vollständigkeit | 25/50/110 Monster; „jedes Monster der Zone" je Zone |
| Item-Wiki | `discoveredItems` (1185 Items) | 10/50/100/200 | Leiter endet bei 17 %; 500 (+ 1000) |
| Kochen-Portionen | `craftedById` je Gericht | 0 spezifisch | Σ gekochte Portionen 100/1000/10000 (ableitbar über heal-Items) |
| Stil-Parität | nur Skill-Level ranged/magic/warding | keine stil-eigenen Erfolge | XP-Meilensteine je Stil (Steam), stil-eigene Begleiter-Trios (Kür) |
| Tode / Spielzeit / Zonen | `stats.deaths`, `activePlayMs`, Zonen = Chronik-Gates | 0 | „Asche zu Asche", 100 h, Zonen-Bestiarium |

### 1.5 Pacing über die Spielzeit

Modell (aus Sim + Content): Huhn 5 s/Kill, Goblin 13,8 s (Bronze) / 4,3 s (geared), Aschenratte 60 s, Rasender Stier 180 s; Skilling-Fokus-Stunden bis Stufe 10/20/30/50/70/90/99 ≈ 0,2 / 0,5 / 1 / 3 / 8 / 21 / 35 h (XP-Tabelle L99 = 13 034 431, Sim-XP/h je Stufe inkl. `earlyXpMult`); RealisticPlayer nach 48 Sim-h: Gesamtlevel 275–329, 1 600–9 150 Kills, Kampflevel 15–27. Zählung = Erfolge, die ein normaler Spieler in der Phase typischerweise sammelt (nicht Fokus auf einen Skill).

| Phase | Erfolge (≈) | AP (≈) | Was fällt |
|---|---:|---:|---|
| erste 10 Minuten | 8 | 45 | First Blood (10 Kills, ~1 min), Huhn 10, Kuh 10, Gatherer 100, Gesamtlevel 25 (Start ist 20), Questling (Kap. 1 = 25 Items sammeln), erste Skill-Stufe 10, Curious (10 Items) |
| erste Stunde | 22 | 200 | Kills 100 (8 min), Huhn/Kuh 100, Eber/Imp/Goblin 10, 3–5 × Skill 10, 1–2 × Skill 20, Gold 1000, Crafter 10, Shopper, Collector 50, **Bull Slayer (epic, 50 AP)** weil Kapitel 2 den Stier verlangt |
| Tag 1–2 (≤ 10 h) | 55 | 700 | Skill 20/30/40 in mehreren Skills, Kills 1000 (1,4–4 h), 8–10 Monster auf 100, 2–3 auf 1000 (Huhn/Goblin), Gather 1000, Artisan 100, Gold 10k, Quests 10, Gesamtlevel 100, erster Dungeon (Kap. 4), Goblin-Warlock (epic) |
| Woche 1 (≤ 50 h) | 125 | 2 000 | Gesamtlevel 250, Skill 50/60 in 4–6 Skills, 15–20 Monster auf 100, 5–8 auf 1000, Kills 5000 (die Hälfte der Spieler), Dungeons 5/25, 4–6 Bosse (epic), Begleiter 1–5, erstes Set, Serie 7, Gold 100k, Archivist 100, Hero 50 Quests |
| bis 200 h | 215 | 4 200 | Skill 70–90 breit, erste 2–4 × Stufe 99, Gesamtlevel 500–1000, Kills 10 000, 30–50 Monster auf 1000, alle 14 Bosse, Dungeon-Legend 50/100, Paragon 10–15, Begleiter 10, Sets 5–10, Encyclopedist 200, Merchant Prince, Serie 30 |
| jenseits 200 h / nie | 112 | 3 600 | 15 × Stufe 99, Gesamtlevel 1500/1750/1900/1980, 1000er-Ketten der Idol-Halle (5 Monster × ≥ 30 h), Kills 50 000, Gold 10 Mio., Opulent, Serie 100 (100 Kalendertage), Paragon 20/25/30, alle Sets, alle Begleiter, Godly Drop |

Lesart: Die ersten 10 h liefern ~85 Unlocks, danach wird es eine Wand aus 1000er-Ketten; die Mitte (Woche 2–8) hat wenige *sinnvolle* Ziele, weil Kapitel, Slayer, Champions und New Haven keine Erfolge tragen, obwohl genau dort die Spielzeit liegt.

### 1.6 Seltenheit vs. tatsächliche Schwierigkeit (Stichproben)

| Erfolg | Seltenheit / AP | geschätzter Aufwand | Urteil |
|---|---|---|---|
| ach_kills_chicken_1000 | rare / 25 | 1,4 h Frühgame | überbewertet |
| ach_kills_last_idol_1000 | rare / 25 | ≥ 30 h Endgame (L295, ~2 min/Kill geared) | stark unterbewertet |
| ach_boss_bull_boss (1 Kill) | epic / 50 | ~1 h, Pflicht in Kapitel 2 | massiv überbewertet (gleich viel AP wie Woodcutting 99) |
| ach_boss_goblin_warlock (1 Kill) | epic / 50 | L30-Mob, ~3–5 h | überbewertet |
| ach_dungeon_goblin_warband_1 | uncommon / 10 | erster Dungeon-Clear, schwerer als die meisten „Bosse" | invertiert zu den Boss-Erfolgen |
| ach_skill_*_90 | rare / 25 | ~21 Fokus-h | unterbewertet gegenüber 1000 Hühnern |
| ach_skill_*_99 | epic / 50 | ~35 Fokus-h | ok |
| ach_daily_streak_7 | rare / 25 | 7 Kalendertage, kein Aufwand | ok (Kalender-Gate), aber gleich viel wie Skill 60 |
| ach_quests_100 (count 75) | epic / 50 | 59 Nicht-Dailies + 16 Dailies | erreichbar; ID sagt 100, Text 75 (kosmetisch) |
| ach_total_level_2079 (count 1980) | legendary / 100 | ~700 Fokus-h | ok |
| ach_gold_10000000 | legendary / 100 | Endgame-Verkäufe 1,5–2,7 Mio. g/h laut Sim → 5–10 h Fokus | überbewertet für legendary |

Vorschlag einer **AP-Regel nach Fokus-Stunden** statt nach Zählerhöhe: common < 15 min · uncommon < 2 h · rare 2–15 h · epic 15–60 h · legendary > 60 h oder Kalender ≥ 30 Tage. Damit wird die Seltenheit auf Steam (globale Quote) und im Spiel (AP) dasselbe sagen.

### 1.7 Weitere Befunde

- `design/steam-achievements-export.md` (13.07.) ist **veraltet und so nicht importierbar**: referenziert `ach_skill_magic_off_99` / `ach_skill_magic_def_99` (IDs heißen seit Armor-Iteration 2 `magic` / `warding`), „21 Skills / Gesamtlevel 2079" (20 / 1980), „33 Sets" (35), 530 Erfolge (537). Dieses Dokument ersetzt es.
- 5 Overlay-Sprachen (`packages/content/src/locales/{zh,ru,es,ptBR,fr}.ts`) tragen je 1 074 Achievement-Strings (Name + Beschreibung je ID). Jede Umstrukturierung ist 5-facher Übersetzungsaufwand; verwaiste Keys sind harmlos (`apply.ts` iteriert über die Defs, nicht über die Keys).
- Kein `hidden`-Flag im Schema, die Erfolgsseite kennt keine verdeckten Karten (Name/Beschreibung müssten bis zum Unlock maskiert werden).
- Steam-Namen: „God of Slaughter" (50 000 Kills) und „Harbinger of Ruin" sind fürs Profil grenzwertig laut, aber nicht regelwidrig; im Steam-Set bewusst nicht verwendet.

---

## 2 Vorschlag In-Game

### 2.1 Kategorien neu schneiden (bestehende 9 Typen, keine neuen UI-Keys nötig)

| Kategorie | Inhalt neu | ≈ Anzahl |
|---|---|---:|
| skilling | Skill-Leitern 25/50/75/90/99 (20 × 5), XP-Meilenstein je Skill (20), „alle Skills ≥ 50 / ≥ 75" (2), Gesamtlevel 9, Meisterschaft 4 | 135 |
| combat | Gesamt-Kills 7 (+ 25 000), 12 Bosse (je Zonen-/Story-Endboss, inkl. Warchief, Drazhan, Abyssal Devourer), 4 Boss-100er (versteckt), Dungeons 7 × 3 + Gesamt 3 + „alle Dungeons", Paragon 6, Tode 2 | 60 |
| exploration | Zonen-Bestiarium 11 × 2 (jedes Monster ≥ 1 / ≥ 100), Bestiarium gesamt 3, Slayer-Turm-Etagen 5, New Haven 5 | 35 |
| quests | Chronik-Kapitel 21, Nebenquests 3, Slayer-Aufträge 5, Slayer-Serie 2, Dailies verschieden 3, Serie 4 | 38 |
| collection | Items entdeckt 6 (10 → 1000), Sets 4, Begleiter 4 (+ 3 Stil-Trios), Champion-Unikate 3, Runen entdeckt 2 | 22 |
| gathering / crafting | Gather 4, Craft 4, Portionen 3, Craft je Leitmaterial (Godiron-Waffe, Voidweave-Robe, Voidhide-Rüstung, Godgem-Amulett, Götteratem-Elixier) 5 | 16 |
| wealth | Gold 5, ausgegeben 4, Bankplätze 3 | 12 |
| meta | Spielzeit 4, versteckte Scherze 8, AP-Quoten-Titel 4 | 16 |
| **Summe** | | **≈ 334** |

### 2.2 Kill-Ketten bündeln (268 → ~45)

- **Zonen-Bestiarium** statt 84 Tripel: je Zone „Jedes Wesen der Zone besiegt" (≥ 1) und „Zone gemeistert" (jedes Wesen ≥ 100). Fortschritt = kleinster Kill-Stand über die Zonen-Monster; damit bleibt der Balken lesbar („37/100"). 11 Zonen × 2 = 22.
- **Bestiarium gesamt** 25 / 50 / 110 Monster (3).
- **Bosse** (12, je Zonen-/Story-Endboss): bull_boss, goblin_warchief, ash_tyrant, forest_warden, skeleton_nekro, forest_bear, deep_kraken, charred_doomknight, void_titan, last_idol, drazhan, abyssal_devourer (Turm 5). Seltenheit nach Kapitel-Tiefe: Stier common, Warchief/Tyrant uncommon, Warden/Nekro rare, Bär…Titan epic, Last Idol/Drazhan legendary.
- **Gesamt-Kills** 10/100/1000/5000/10 000/25 000/50 000 (7).
- **Vier versteckte 100er** als Augenzwinkern (Stier, Huhn 1000, Rot-Ratte 1000, Warchief 100).
- Die vorhandenen 15 „ach_boss_*" und die 6 „ach_kills_*" behalten ihre IDs (Save-Kompatibilität, Steam-Mapping); nur Seltenheit/Text ändern.

### 2.3 Skill-Leitern straffen (190 → 100 + 20 XP)

Stufen 25 / 50 / 75 / 90 / 99 je Skill (Fokus ≈ 0,7 / 3 / 10 / 21 / 35 h → uncommon / rare / rare / epic / epic), plus ein **XP-Meilenstein je Skill** (Abschnitt 3.1) als Langzeitziel jenseits 99 und „Alleskönner" (alle Skills ≥ 50, ≥ 75). Die bestehenden IDs `ach_skill_<skill>_50/_90/_99` bleiben; `_10/_20/_30/_40/_60/_70/_80` entfallen; `_25` und `_75` sind neu. Slayer bekommt seine Leiter (5 neu).

### 2.4 Neue Erfolge je fehlendem System (konkrete Bedingungen)

| System | Erfolge (EN · DE) | Bedingung (`type`, target, count) | Seltenheit |
|---|---|---|---|
| Chronik | 21 Kapitel, Namen = Kapiteltitel (Tabelle 3.2) | `quests_completed` target `chronicle_NN` count 1 | Kap. 1–4 common, 5–9 uncommon, 10–15 rare, 16–19 epic, 20–21 legendary |
| Slayer | First Contract · Erster Auftrag (1), Contract Killer · Auftragsjäger (100), Bounty Legend · Kopfgeldlegende (500); Unbroken Chain · Ungebrochene Kette (Serie 10, 25); The Plague Chambers … The Abyssal Throne · Etagen 1–5 (je ein Wesen der Etage erlegt); Slayer 25/50/75/90/99 | `slayer_tasks` 1/100/500 · `slayer_streak` 10/25 · `slayer_floor` 1..5 · `skill_level` slayer | common → legendary |
| Champions | Champion's Bane · Championsfluch (1 Kill), Champion Hunter (10), Every Champion · Alle Champions (28 Varianten), First Trophy · Erste Trophäe (1 Unikat), Trophy Hall · Trophäenhalle (28 Unikate), The Ninth Warden (versteckt) | `elite_kills` (ohne target = Σ Kills; target = Variante), `elite_variants` 28, `elite_uniques` 1/28 | uncommon → legendary |
| New Haven | First Stake · Erster Pfahl (1 Stufe), Town Hall III · Rathaus III, A Roof for Everyone · Ein Dach für alle (15 Bauten ≥ I), Half Built (Σ 30), New Haven Rises (Σ 45) | `camp_levels` (ohne target = Σ Stufen; target = Gebäude-ID) | common → epic |
| Meisterschaft | First Mastery · Erste Meisterschaft (1 Aktion auf 99), 10, 25, 50 | `mastery_maxed` 1/10/25/50 | rare → legendary |
| Dailies | Odd Jobs · Gelegenheitsarbeiten (10 verschiedene), Regular (30), Seen It All · Alles gesehen (60) | `dailies_distinct` | uncommon → epic |
| Bank | Vault Keeper 10/50/max Bankplätze | `bank_slots` | common → rare |
| Bestiarium / Wiki | Bestiary 25/50/110; Items 500/1000 | `monsters_discovered`; `items_discovered` | rare → legendary |
| Kochen | Field Kitchen 100 · Feldküche, Banquet Master 1000, Feeder of Armies 10 000 | `food_cooked` (Σ `craftedById` über heal-Items) | common → epic |
| Kampfstile | Path of the Blade / Bow / Staff · Weg der Klinge / des Bogens / des Stabs: 10 Mio. XP in attack+power / ranged / magic | `skill_xp` 10 000 000 je Stil-Skill | rare |
| Meta | Ten Hours / A Hundred Hours / Five Hundred Hours / A Thousand Hours in the Reach | `play_hours` 10/100/500/1000 | common → legendary |

### 2.5 Neue `condition.type`-Werte und Engine-Aufwand

Alle Typen lesen **bestehenden** State bzw. Content, es entsteht kein neues Feld, keine Migration, kein SAVE_VERSION-Sprung. Muster: ein `case` in `achievementProgress` + ein Test in `achievements.test.ts` + Eintrag in `HANDLED`.

| Typ | liest | Pflicht für Steam-Set | Aufwand |
|---|---|---|---|
| `skill_xp` (target Skill) | `state.skills[target].xp` (roh, läuft über 99 weiter; `addXp` deckelt nicht) | **ja** (20 XP-Meilensteine) | 3 Zeilen |
| `quests_completed` **mit optionalem target** | `quests.claimed.includes(target)` → 1/0, ohne target wie bisher | **ja** (21 Kapitel) | 2 Zeilen, kein neuer Typ |
| `monsters_discovered` | Anzahl `monsterKills`-Keys > 0, die in `content.monsters` existieren | **ja** (Bestiarium) | 5 Zeilen |
| `dungeons_distinct` | Anzahl `dungeonsCleared`-Keys ≥ 1 ohne `paragon_tower` | **ja** (First Clear, alle Dungeons) | 4 Zeilen |
| `slayer_tasks` · `slayer_floor` | `character.slayerTasksCompleted` · höchste `slayerFloor` unter Monstern mit Kill ≥ 1 | **ja** | 3 + 6 Zeilen |
| `elite_kills` (target optional) · `elite_uniques` | `eliteCodex[*].kills` (Σ oder Variante) · Anzahl Varianten mit `uniques ≥ 1` | **ja** | 6 + 4 Zeilen |
| `camp_levels` (target optional) | Σ `camp.buildings` bzw. eine Gebäude-Stufe | **ja** | 4 Zeilen |
| `deaths` · `play_hours` | `stats.deaths` · `activePlayMs / 3 600 000` | ja (versteckte) | je 1 Zeile |
| `zone_bestiary` (target Zone) | min Kills über `content.monsters` mit `zone === target` | nein (In-Game) | 8 Zeilen |
| `slayer_streak` · `bank_slots` · `mastery_maxed` · `dailies_distinct` · `food_cooked` · `elite_variants` · `items_discovered` mit target | wie in 2.4 | nein (Kür) | je 2–8 Zeilen |
| `hidden?: boolean` auf `AchievementDef` | Content-Flag; UI maskiert Name/Beschreibung/Balken bis zum Unlock („???") | ja (Steam-Parität, damit In-Game keine Spoiler zeigt) | Schema 1 Zeile, UI ~30 Zeilen |

Gesamtaufwand logic-dev: **ein halber Tag** inkl. Tests; ui-dev für `hidden` und Kategorie-Neuschnitt ~1 Tag; content-dev für Katalog + 5 Overlays der neuen Strings (≈ 170 neue Defs × 2 Strings × 5 Sprachen) ~1–2 Tage.

### 2.6 Versteckte Erfolge (12, Augenzwinkern, keine Spoiler im Namen)

| EN · DE | Bedingung | Warum |
|---|---|---|
| Ash to Ash · Asche zu Asche | erster Tod | jeder fällt einmal; nimmt dem Tod den Stachel |
| Feathers Everywhere · Überall Federn | 1000 Hühner | die Huhn-Kette wird zum Witz statt zum Tripel |
| Bull-Headed · Sturkopf | Rasender Stier 100 × | der erste Boss als Farmziel |
| Rat King · Rattenkönig | 1000 Rot-Ratten (Turm 1) | Slayer-Turm-Einstieg |
| Old Grudge · Alte Rechnung | Warchief 100 × | Kapitel-5-Boss wiederkehrend |
| The Ninth Warden · Der neunte Wächter | Champion elite_idol_warden | Lore-Nicken (acht Wächter + einer) |
| Not Today · Heute nicht | 100 Tode | Ehre fürs Weitermachen |
| Ninefold · Neunfach | alle 9 Beete bepflanzt (Kür: `farm_plots_planted`) | Farming-Moment |
| Full Shelf · Volles Regal | 6 Belohnungsregale freigeschaltet (= Kap. 20; via `quests_completed` target) | Belohnungsladen-Ende |
| A Hundred Hours in the Reach · Hundert Stunden im Reach | 100 h aktiv | Idle-Selbstironie |
| Second Volume · Zweiter Band | Kapitel 21 (Paragon-Etage 5) | Story-Ende ohne Spoiler |
| The True Culprit · Der wahre Schuldige | Kapitel 20 | Twist bleibt bis zum Unlock unsichtbar |

### 2.7 Belohnungen (keine Spielstärke)

- **AP-Quoten-Titel** bei 25 / 50 / 75 / 100 %: „Chronicler / Warden's Hand / Keeper of the Reach / Grim Reach Complete" (DE: Chronist / Hand des Wächters / Hüter des Reach / Grim Reach vollendet), anzeigbar unter dem Charakternamen (Charakterbogen, Hauptmenü-Ladeliste). Die Quest-Marken je 5 % bleiben.
- **Trophäenwand in New Haven** (`camp_trophy_wall` existiert bereits): zeigt die Steam-Set-Erfolge als Trophäen; das ist die In-Game-Bühne für die 90 kuratierten.
- **Rahmen der Erfolgsseite** je Seltenheit (vorhanden) + ein „Meisterrahmen" für die Skill-XP-Großmeister.
- Ausdrücklich **keine** Stat-Boni, kein Gold, keine Items an Erfolge.

### 2.8 Zielgröße

**≈ 330 Erfolge** (Tabelle 2.1). Begründung: Die 79 nicht generierten Erfolge sind heute der eigentliche Katalog; 330 erhält pro System eine Leiter mit 3–5 Stufen, jedes Kapitel, jede Zone, jeden Boss und jede Skill-Endstufe, ohne dass die Seite zur Tapete wird. Melvor-Idle-Größenordnung (ca. 300–400 „Completion"-Ziele) bestätigt den Bereich. Das Steam-Set (90) ist eine echte Teilmenge davon.

### 2.9 Migration (geprüft)

- `state.achievements` ist ein `string[]` und wird beim Laden **nicht** gefiltert (kein Sanitize-Pfad für Erfolge in `persistence.ts`/`state.ts`); entfernte IDs bleiben harmlos stehen. `earnedAP` zählt nur IDs mit Def, `checkAchievements` überspringt Freigeschaltete und legt Entfernte nie neu an. **Kein SAVE_VERSION-Sprung nötig.**
- **AP-Quote springt**: Σ AP fällt von 10 725 auf ~7 000 (bei ~330 Erfolgen), die Quote eines Bestandsspielers steigt also; `checkApMilestones` holt neu überschrittene 5 %-Schritte nach (typisch 1–3 Schritte → einmalig ein paar Quest-Marken). Vertretbar; alternativ könnte content-dev die Schwellen der neuen Erfolge so setzen, dass Σ AP ≈ 10 000 bleibt.
- **IDs der behaltenen Erfolge dürfen sich nicht ändern** (Save + Steam-Mapping). Neue Erfolge bekommen neue IDs; entfernte werden nicht recycelt.
- Neue Erfolge werden beim ersten Tick nach dem Update rückwirkend freigeschaltet (Kapitel, XP, Bestiarium, Champions, New Haven) und dann an Steam gemeldet.
- Overlays: verwaiste Keys ignorieren, neue Strings in 5 Sprachen nachziehen (Glossar-Begriffe: Reach, Chronik, Champion, New Haven).

---

## 3 Steam-Set (90 Erfolge)

### 3.1 XP-Meilensteine je Skill: ist 200 Mio. realistisch?

Grundlage: XP für Stufe 99 = **13 034 431** (`leveling.ts`, RuneScape-Kurve). XP läuft nach 99 weiter (`addXp` und `completeAction` deckeln nicht; nur `levelFromXp` kappt die Anzeige). XP/h Endgame = Sim-Wert der besten Aktion auf höchster Stufe (27.08.) × milde Dauerboosts (Meisterschafts-Tempo bis 15 %, Lager-Tempo 3–5 %, Tonika nur aktiv). Kampf: Kill-XP = `monster.xp` (Last Idol 58 000, Drazhan 92 000) + Schadens-XP 1,3/Schaden (Fernkampf/Magie × 1,1); Angriffs-Haltung teilt 55/45 auf Angriff/Kraft, andere Haltungen 100 % auf ihren Skill; Vitalität 0,5 XP je Schaden, Bannmagie 0,25 XP je absorbiertem Punkt; Slayer 0,5 × Monster-XP je Auftragskill (Aufträge 15–50 Kills, 50 % Turm). Der Geared-Sim-Held (Platte ohne Essen) tötet die L200+-Zone nicht; die Kampfwerte sind daher Annahme „voll ausgerüstet, Idol-Halle, 20–30 Kills/h" und bewusst als Spanne zu lesen.

| Skill | XP/h Endgame (Annahme) | h → 99 (13 Mio.) | h → 50 Mio. | h → 100 Mio. | h → 200 Mio. | **Empfehlung** |
|---|---:|---:|---:|---:|---:|---|
| Woodcutting | 820 k | 16 | 61 | 122 | 244 | 200 Mio. |
| Mining | 710 k | 18 | 70 | 141 | 282 | 200 Mio. |
| Fishing | 710 k | 18 | 70 | 141 | 282 | 200 Mio. |
| Foraging | 700 k | 19 | 71 | 143 | 286 | 200 Mio. |
| Cooking | 785 k | 17 | 64 | 127 | 255 | 200 Mio. |
| Smithing | 810 k | 16 | 62 | 123 | 247 | 200 Mio. |
| Crafting (leatherworking) | 825 k | 16 | 61 | 121 | 242 | 200 Mio. |
| Jewelcrafting | 825 k | 16 | 61 | 121 | 242 | 200 Mio. |
| Runecrafting | 785 k | 17 | 64 | 127 | 255 | 200 Mio. |
| Herblore | 825 k | 16 | 61 | 121 | 242 | 200 Mio. |
| Thieving | 560 k (Betäubung/Fehlschlag inkl.; bester Heist 487 k roh) | 23 | 89 | 179 | 357 | **100 Mio.** (≈ 180 h) |
| Farming | 100 k (9 Beete Godbloom, 160 min Zyklus, passiv) | 130 | 500 | 1 000 | 2 000 | **30 Mio.** (≈ 300 h passiv) |
| Attack (Haltung Angriff, 55 %) | 1,1 Mio. | 12 | 45 | 91 | 182 | 200 Mio. |
| Power (45 % bzw. 100 % in Kraft-Haltung) | 0,9–2 Mio. | 7–14 | 25–56 | 50–111 | 100–222 | 200 Mio. |
| Defence (Verteidigungs-Haltung 100 %) | 2 Mio. | 7 | 25 | 50 | 100 | 200 Mio. |
| Ranged | 2,2 Mio. | 6 | 23 | 45 | 91 | 200 Mio. |
| Magic | 2,2 Mio. | 6 | 23 | 45 | 91 | 200 Mio. |
| Vitality (0,5 XP/Schaden, alle Stile) | 120 k | 109 | 417 | 833 | 1 667 | **30 Mio.** (≈ 250 h Kampf) |
| Warding (0,25 XP/absorbiert, nur Magie) | 60 k | 217 | 833 | 1 667 | 3 333 | **20 Mio.** (≈ 330 h) — siehe Hinweis |
| Slayer (Mix Turm/Idol-Halle) | 580 k | 22 | 86 | 172 | 345 | **100 Mio.** (≈ 170 h) |

Fazit: **200 Mio. für 15 Skills** (240–290 Fokus-h Skilling, 90–220 h Kampfstile) liegt im gewünschten Fenster 200–400 h und ist als Langzeitziel eines Idle-Spiels sinnvoll. Nicht sinnvoll bei Farming, Vitalität, Bannmagie (passive Skills, Faktor 10–30 langsamer) und knapp außerhalb bei Diebeskunst und Slayer; dort die abgestuften Werte. Hinweis Balance: Bannmagie braucht selbst für Stufe 99 rund 220 h Magie-Kampf (0,25 XP je absorbiertem Punkt); das ist ein eigener Befund für die Stil-Parität, unabhängig von Erfolgen (Frage 3 unten).

### 3.2 Die 90 Erfolge in Backend-Reihenfolge

Regeln: API-Name Großbuchstaben/Unterstrich ≤ 32 Zeichen (geprüft), Beschreibung ≤ 80 Zeichen (geprüft), versteckte ohne Spoiler in Name und Text, Reihenfolge = Anlage-Reihenfolge im Steamworks-Backend (frühe zuerst; versteckte am Ende, Steam listet sie ohnehin gesondert). Spalte „Auslöser": bestehende interne ID oder „neu: ID (Typ, target, count)". „~%" = grobe Schätzung des Anteils der Spieler, die den Erfolg je erreichen (Steam-Globalquote), auf Basis der Pacing-Tabelle 1.5 und üblicher Idle-Retention. Icons: Mira liefert je Erfolg 256 × 256 JPG farbig + Graustufen (Steam verlangt 64 × 64 beim Upload; 256 als Quelle und herunterskalieren).

| # | API-Name | Anzeigename EN | Beschreibung EN | Versteckt | Auslöser (interne ID) | ~% Spieler | Icon-Idee |
|---|---|---|---|---|---|---|---|
| 1 | `CH01_THE_FIRST_PAGE` | The First Page | Finish Chronicle chapter 1: The First Page. | nein | neu: ach_chapter_01 (quests_completed, target chronicle_01, count 1) | 85 % | Aufgeschlagene Chronik, Kapitelmotiv: Federkiel und Tintenfass |
| 2 | `BLOODED` | Blooded | Defeat 100 enemies in the Reach. | nein | ach_kills_100 | 80 % | Gekerbter Bronzedolch auf Ascheboden |
| 3 | `CH02_FIRST_BLOOD` | First Blood | Finish Chronicle chapter 2: First Blood. | nein | neu: ach_chapter_02 (quests_completed, target chronicle_02, count 1) | 75 % | Aufgeschlagene Chronik, Kapitelmotiv: Stierhorn mit Blutstropfen |
| 4 | `FIRST_HARVEST` | First Harvest | Gather 1,000 resources. | nein | ach_gather_1000 | 70 % | Bündel aus Holz, Erz und Fisch auf einem Sack |
| 5 | `COIN_PURSE` | Coin Purse | Hold 1,000 gold at once. | nein | ach_gold_1000 | 72 % | Lederbeutel, aus dem Münzen fallen |
| 6 | `CH03_SPARK_IN_THE_GRAIN` | The Spark in the Grain | Finish Chronicle chapter 3: The Spark in the Grain. | nein | neu: ach_chapter_03 (quests_completed, target chronicle_03, count 1) | 65 % | Aufgeschlagene Chronik, Kapitelmotiv: Glühende Impsglut zwischen Kornähren |
| 7 | `ARTISAN` | Artisan | Craft 100 items. | nein | ach_craft_100 | 60 % | Hammer über Amboss mit Funken |
| 8 | `CH04_THE_EMPTY_MARCH` | The Empty March | Finish Chronicle chapter 4: The Empty March. | nein | neu: ach_chapter_04 (quests_completed, target chronicle_04, count 1) | 55 % | Aufgeschlagene Chronik, Kapitelmotiv: Zerrissenes Goblin-Banner im Wind |
| 9 | `CHAMPIONS_BANE` | Champion's Bane | Defeat your first Champion of the Reach. | nein | neu: ach_elite_first (elite_kills, count 1) | 45 % | Gekrönter Monsterschädel mit rotem Champion-Glühen |
| 10 | `CH05_THE_WAR_BANNER` | The War Banner | Finish Chronicle chapter 5: The War Banner. | nein | neu: ach_chapter_05 (quests_completed, target chronicle_05, count 1) | 40 % | Aufgeschlagene Chronik, Kapitelmotiv: Aufgerichtetes Kriegsbanner des Warchiefs |
| 11 | `FIRST_CLEAR` | First Clear | Clear a dungeon for the first time. | nein | neu: ach_dungeons_distinct_1 (dungeons_distinct, count 1) | 38 % | Aufgebrochenes Verlies-Tor mit Fackellicht |
| 12 | `MASTER_OF_TRADES` | Master of Trades | Reach a total level of 250. | nein | ach_total_level_250 | 35 % | Drei gekreuzte Werkzeuge (Axt, Spitzhacke, Angel) auf Wappenschild |
| 13 | `CH06_THE_ASH_LESSON` | The Ash Lesson | Finish Chronicle chapter 6: The Ash Lesson. | nein | neu: ach_chapter_06 (quests_completed, target chronicle_06, count 1) | 35 % | Aufgeschlagene Chronik, Kapitelmotiv: Rattenschädel in Ascheschicht |
| 14 | `FRIEND_IN_THE_ASH` | A Friend in the Ash | Find your first companion. | nein | ach_pets_1 | 33 % | Kleine Pfotenspur in Asche, ein Auge glimmt im Dunkel |
| 15 | `CH07_THE_CARRION_KING` | The Carrion King | Finish Chronicle chapter 7: The Carrion King. | nein | neu: ach_chapter_07 (quests_completed, target chronicle_07, count 1) | 30 % | Aufgeschlagene Chronik, Kapitelmotiv: Gekrönter Geierkopf (Aschetyrann) |
| 16 | `CH08_THORNS` | Thorns | Finish Chronicle chapter 8: Thorns. | nein | neu: ach_chapter_08 (quests_completed, target chronicle_08, count 1) | 25 % | Aufgeschlagene Chronik, Kapitelmotiv: Dornenranke um ein zerbrochenes Schwert |
| 17 | `CH09_CHOIR_BENEATH_BARROWS` | The Choir Beneath the Barrows | Finish Chronicle chapter 9: The Choir Beneath the Barrows. | nein | neu: ach_chapter_09 (quests_completed, target chronicle_09, count 1) | 22 % | Aufgeschlagene Chronik, Kapitelmotiv: Grablaterne mit grünem Licht |
| 18 | `CH10_THE_BROKEN_SEAL` | The Broken Seal | Finish Chronicle chapter 10: The Broken Seal. | nein | neu: ach_chapter_10 (quests_completed, target chronicle_10, count 1) | 18 % | Aufgeschlagene Chronik, Kapitelmotiv: Zerbrochenes Wachssiegel auf Stein |
| 19 | `CH11_LORD_OF_THE_DEPTHS` | The Lord of the Depths | Finish Chronicle chapter 11: The Lord of the Depths. | nein | neu: ach_chapter_11 (quests_completed, target chronicle_11, count 1) | 15 % | Aufgeschlagene Chronik, Kapitelmotiv: Nekromantenkrone über Knochenhaufen |
| 20 | `MERCHANT_PRINCE` | Merchant Prince | Hold 1,000,000 gold at once. | nein | ach_gold_1000000 | 15 % | Goldkrone auf Münzberg |
| 21 | `CH12_THE_GIANTS` | The Giants | Finish Chronicle chapter 12: The Giants. | nein | neu: ach_chapter_12 (quests_completed, target chronicle_12, count 1) | 13 % | Aufgeschlagene Chronik, Kapitelmotiv: Wolfspranke, überdimensional |
| 22 | `ANNIHILATOR` | Annihilator | Defeat 10,000 enemies. | nein | ach_kills_10000 | 12 % | Schädelpyramide mit Schwert obenauf |
| 23 | `CH13_THE_OLD_HUNT` | The Old Hunt | Finish Chronicle chapter 13: The Old Hunt. | nein | neu: ach_chapter_13 (quests_completed, target chronicle_13, count 1) | 11 % | Aufgeschlagene Chronik, Kapitelmotiv: Bärenkralle und Jagdhorn |
| 24 | `OBSESSED` | Obsessed | Keep a 30-day daily streak. | nein | ach_daily_streak_30 | 8 % | Kalenderblatt mit brennender 30 |
| 25 | `CH14_WHAT_THE_SEA_GIVES` | What the Sea Gives Back | Finish Chronicle chapter 14: What the Sea Gives Back. | nein | neu: ach_chapter_14 (quests_completed, target chronicle_14, count 1) | 9 % | Aufgeschlagene Chronik, Kapitelmotiv: Rostige Gezeitenkette mit Seetang |
| 26 | `CONTRACT_KILLER` | Contract Killer | Complete 100 Slayer tasks. | nein | neu: ach_slayer_tasks_100 (slayer_tasks, count 100) | 9 % | Auftragszettel mit blutigem Daumenabdruck |
| 27 | `CH15_THE_COLD_FORGE` | The Cold Forge | Finish Chronicle chapter 15: The Cold Forge. | nein | neu: ach_chapter_15 (quests_completed, target chronicle_15, count 1) | 8 % | Aufgeschlagene Chronik, Kapitelmotiv: Vereister Amboss |
| 28 | `NEW_HAVEN_RISES` | New Haven Rises | Raise every building in New Haven to its final stage. | nein | neu: ach_camp_levels_45 (camp_levels, count 45) | 5 % | Rathaus mit Fahne, dahinter fertige Palisade |
| 29 | `CH16_THE_THIN_SKY` | The Thin Sky | Finish Chronicle chapter 16: The Thin Sky. | nein | neu: ach_chapter_16 (quests_completed, target chronicle_16, count 1) | 7 % | Aufgeschlagene Chronik, Kapitelmotiv: Rocfeder über Klippenkante |
| 30 | `DUNGEON_LEGEND` | Dungeon Legend | Complete 100 dungeon runs. | nein | ach_dungeons_total_100 | 6 % | Verliesschlüssel mit Lorbeerkranz |
| 31 | `CH17_THE_AERIE` | The Aerie | Finish Chronicle chapter 17: The Aerie. | nein | neu: ach_chapter_17 (quests_completed, target chronicle_17, count 1) | 6 % | Aufgeschlagene Chronik, Kapitelmotiv: Sturmroc-Nest mit Blitz |
| 32 | `CH18_THE_LAST_GATE` | The Last Gate | Finish Chronicle chapter 18: The Last Gate. | nein | neu: ach_chapter_18 (quests_completed, target chronicle_18, count 1) | 5 % | Aufgeschlagene Chronik, Kapitelmotiv: Steinernes Götzentor, halb geöffnet |
| 33 | `CH19_THE_JUDGEMENT` | The Judgement | Finish Chronicle chapter 19: The Judgement. | nein | neu: ach_chapter_19 (quests_completed, target chronicle_19, count 1) | 4 % | Aufgeschlagene Chronik, Kapitelmotiv: Waagschalen aus Obsidian |
| 34 | `DELVER_OF_EVERY_DEPTH` | Delver of Every Depth | Clear every dungeon in the Reach at least once. | nein | neu: ach_dungeons_distinct_all (dungeons_distinct, count 7) | 4 % | Sieben Schlüssel an einem Ring |
| 35 | `CH20_THE_TRUE_CULPRIT` | The True Culprit | Turn the final page of the Chronicle. | ja | neu: ach_chapter_20 (quests_completed, target chronicle_20, count 1) | 3.5 % | Aufgeschlagene Chronik, Kapitelmotiv: Kapuzengestalt mit Sichelklinge (erst nach Freischaltung sichtbar) |
| 36 | `CH21_THE_SECOND_VOLUME` | Epilogue: The Second Volume | Open the Second Volume. | ja | neu: ach_chapter_21 (quests_completed, target chronicle_21, count 1) | 3 % | Aufgeschlagene Chronik, Kapitelmotiv: Geschlossenes zweites Buch mit Turmsymbol auf dem Einband |
| 37 | `ENCYCLOPEDIST` | Encyclopedist | Discover 500 unique items. | nein | neu: ach_discovered_500 (items_discovered, count 500) | 5 % | Dickes Lexikon mit Lupe |
| 38 | `THE_ABYSSAL_THRONE` | The Abyssal Throne | Slay a creature on the fifth floor of the Slayer Tower. | nein | neu: ach_slayer_floor_5 (slayer_floor, count 5) | 6 % | Schwarzer Thron auf Turmspitze über Abgrund |
| 39 | `PEAK_CONTENDER` | Peak Contender | Reach floor 20 of the Paragon Spire. | nein | ach_paragon_floor_20 | 3 % | Turmsilhouette mit leuchtender 20 |
| 40 | `ASCENDANT` | Ascendant | Reach a total level of 1,000. | nein | ach_total_level_1000 | 4 % | Aufsteigender Stern über Wappenschild |
| 41 | `MASTER_WOODCUTTING` | Master Woodcutter | Reach level 99 in Woodcutting. | nein | ach_skill_woodcutting_99 | 4 % | Axt im Godwood-Stumpf, goldener Meisterrahmen |
| 42 | `MASTER_MINING` | Master Miner | Reach level 99 in Mining. | nein | ach_skill_mining_99 | 4 % | Spitzhacke auf Götzeneisen-Ader, goldener Meisterrahmen |
| 43 | `MASTER_FISHING` | Master Angler | Reach level 99 in Fishing. | nein | ach_skill_fishing_99 | 3.5 % | Angelhaken mit Seelenfisch, goldener Meisterrahmen |
| 44 | `MASTER_FORAGING` | Master Forager | Reach level 99 in Foraging. | nein | ach_skill_foraging_99 | 3.5 % | Strahlende Blüte in Handschale, goldener Meisterrahmen |
| 45 | `MASTER_COOKING` | Master Cook | Reach level 99 in Cooking. | nein | ach_skill_cooking_99 | 3 % | Kessel mit Seelenfeuer-Bankett, goldener Meisterrahmen |
| 46 | `MASTER_SMITHING` | Master Smith | Reach level 99 in Smithing. | nein | ach_skill_smithing_99 | 3 % | Amboss mit Götzeneisen-Schwert, goldener Meisterrahmen |
| 47 | `MASTER_LEATHERWORKING` | Master Crafter | Reach level 99 in Crafting. | nein | ach_skill_leatherworking_99 | 3 % | Nadel, Faden und Leerenhaut, goldener Meisterrahmen |
| 48 | `MASTER_FARMING` | Master Farmer | Reach level 99 in Farming. | nein | ach_skill_farming_99 | 2.5 % | Godbloom-Blüte auf neun Beeten, goldener Meisterrahmen |
| 49 | `MASTER_THIEVING` | Master Thief | Reach level 99 in Thieving. | nein | ach_skill_thieving_99 | 2.5 % | Dietrich und Götzenreliquie, goldener Meisterrahmen |
| 50 | `MASTER_JEWELCRAFTING` | Master Jeweler | Reach level 99 in Jewelcrafting. | nein | ach_skill_jewelcrafting_99 | 2.5 % | Godgem-Amulett auf Samt, goldener Meisterrahmen |
| 51 | `MASTER_RUNECRAFTING` | Master Runecrafter | Reach level 99 in Runecrafting. | nein | ach_skill_runecrafting_99 | 2.5 % | Glühender Götzeneisen-Fokus, goldener Meisterrahmen |
| 52 | `MASTER_HERBLORE` | Master Herbalist | Reach level 99 in Herblore. | nein | ach_skill_herblore_99 | 2.5 % | Götteratem-Elixier im Kolben, goldener Meisterrahmen |
| 53 | `MASTER_ATTACK` | Master of Arms | Reach level 99 in Attack. | nein | ach_skill_attack_99 | 3 % | Zwei gekreuzte Schwerter, goldener Meisterrahmen |
| 54 | `MASTER_POWER` | Master of Might | Reach level 99 in Power. | nein | ach_skill_power_99 | 2.5 % | Geballte Panzerfaust, goldener Meisterrahmen |
| 55 | `MASTER_DEFENCE` | Master of the Shield | Reach level 99 in Defence. | nein | ach_skill_defence_99 | 2.5 % | Turmschild mit Kerben, goldener Meisterrahmen |
| 56 | `MASTER_RANGED` | Master Marksman | Reach level 99 in Ranged. | nein | ach_skill_ranged_99 | 2.5 % | Bogen mit gespanntem Pfeil, goldener Meisterrahmen |
| 57 | `MASTER_MAGIC` | Master Mage | Reach level 99 in Magic. | nein | ach_skill_magic_99 | 2.5 % | Stab mit Leerenfunken, goldener Meisterrahmen |
| 58 | `MASTER_VITALITY` | Master of Vitality | Reach level 99 in Vitality. | nein | ach_skill_vitality_99 | 2 % | Herz aus Eisen, goldener Meisterrahmen |
| 59 | `MASTER_WARDING` | Master Warder | Reach level 99 in Warding. | nein | ach_skill_warding_99 | 1.5 % | Schimmernde Bannkuppel, goldener Meisterrahmen |
| 60 | `MASTER_SLAYER` | Master Slayer | Reach level 99 in Slayer. | nein | neu: ach_skill_slayer_99 (skill_level, target slayer, count 99) | 2 % | Slayer-Helm mit Turmsilhouette, goldener Meisterrahmen |
| 61 | `BEASTMASTER` | Beastmaster | Own all 21 companions. | nein | ach_pets_all | 1.5 % | Kreis aus 21 kleinen Tiersilhouetten |
| 62 | `MASTER_OF_ALL_SETS` | Master of All Sets | Own every complete equipment set. | nein | ach_sets_all | 1 % | Rüstungsständer mit drei Rüstungstypen (Platte, Leder, Stoff) |
| 63 | `THE_WHOLE_BESTIARY` | The Whole Bestiary | Defeat every creature in the bestiary at least once. | nein | neu: ach_bestiary_all (monsters_discovered, count 110) | 2 % | Aufgeschlagenes Bestiarium mit Monsterschädeln |
| 64 | `TROPHY_HALL` | Trophy Hall | Claim the unique trophy of every Champion of the Reach. | nein | neu: ach_elite_uniques_all (elite_uniques, count 28) | 1 % | Wand mit 28 Trophäenköpfen, mittig ein rotes Glühen |
| 65 | `TRUE_COMPLETIONIST` | True Completionist | Reach the maximum total level of 1,980. | nein | ach_total_level_2079 (count 1980) | 0.5 % | Goldener Pokal mit 20 Skill-Symbolen im Kranz |
| 66 | `GRANDMASTER_WOODCUTTING` | Woodcutting Grandmaster | Earn 200 million Woodcutting XP. | nein | neu: ach_xp_woodcutting_200m (skill_xp, target woodcutting, count 200000000) | 0.4 % | Axt im Godwood-Stumpf, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 67 | `GRANDMASTER_MINING` | Mining Grandmaster | Earn 200 million Mining XP. | nein | neu: ach_xp_mining_200m (skill_xp, target mining, count 200000000) | 0.4 % | Spitzhacke auf Götzeneisen-Ader, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 68 | `GRANDMASTER_FISHING` | Fishing Grandmaster | Earn 200 million Fishing XP. | nein | neu: ach_xp_fishing_200m (skill_xp, target fishing, count 200000000) | 0.4 % | Angelhaken mit Seelenfisch, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 69 | `GRANDMASTER_FORAGING` | Foraging Grandmaster | Earn 200 million Foraging XP. | nein | neu: ach_xp_foraging_200m (skill_xp, target foraging, count 200000000) | 0.4 % | Strahlende Blüte in Handschale, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 70 | `GRANDMASTER_COOKING` | Cooking Grandmaster | Earn 200 million Cooking XP. | nein | neu: ach_xp_cooking_200m (skill_xp, target cooking, count 200000000) | 0.4 % | Kessel mit Seelenfeuer-Bankett, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 71 | `GRANDMASTER_SMITHING` | Smithing Grandmaster | Earn 200 million Smithing XP. | nein | neu: ach_xp_smithing_200m (skill_xp, target smithing, count 200000000) | 0.4 % | Amboss mit Götzeneisen-Schwert, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 72 | `GRANDMASTER_LEATHERWORKING` | Crafting Grandmaster | Earn 200 million Crafting XP. | nein | neu: ach_xp_leatherworking_200m (skill_xp, target leatherworking, count 200000000) | 0.4 % | Nadel, Faden und Leerenhaut, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 73 | `GRANDMASTER_FARMING` | Farming Grandmaster | Earn 30 million Farming XP. | nein | neu: ach_xp_farming_30m (skill_xp, target farming, count 30000000) | 0.6 % | Godbloom-Blüte auf neun Beeten, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 74 | `GRANDMASTER_THIEVING` | Thieving Grandmaster | Earn 100 million Thieving XP. | nein | neu: ach_xp_thieving_100m (skill_xp, target thieving, count 100000000) | 0.6 % | Dietrich und Götzenreliquie, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 75 | `GRANDMASTER_JEWELCRAFTING` | Jewelcrafting Grandmaster | Earn 200 million Jewelcrafting XP. | nein | neu: ach_xp_jewelcrafting_200m (skill_xp, target jewelcrafting, count 200000000) | 0.4 % | Godgem-Amulett auf Samt, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 76 | `GRANDMASTER_RUNECRAFTING` | Runecrafting Grandmaster | Earn 200 million Runecrafting XP. | nein | neu: ach_xp_runecrafting_200m (skill_xp, target runecrafting, count 200000000) | 0.4 % | Glühender Götzeneisen-Fokus, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 77 | `GRANDMASTER_HERBLORE` | Herblore Grandmaster | Earn 200 million Herblore XP. | nein | neu: ach_xp_herblore_200m (skill_xp, target herblore, count 200000000) | 0.4 % | Götteratem-Elixier im Kolben, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 78 | `GRANDMASTER_ATTACK` | Attack Grandmaster | Earn 200 million Attack XP. | nein | neu: ach_xp_attack_200m (skill_xp, target attack, count 200000000) | 0.4 % | Zwei gekreuzte Schwerter, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 79 | `GRANDMASTER_POWER` | Power Grandmaster | Earn 200 million Power XP. | nein | neu: ach_xp_power_200m (skill_xp, target power, count 200000000) | 0.4 % | Geballte Panzerfaust, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 80 | `GRANDMASTER_DEFENCE` | Defence Grandmaster | Earn 200 million Defence XP. | nein | neu: ach_xp_defence_200m (skill_xp, target defence, count 200000000) | 0.4 % | Turmschild mit Kerben, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 81 | `GRANDMASTER_RANGED` | Ranged Grandmaster | Earn 200 million Ranged XP. | nein | neu: ach_xp_ranged_200m (skill_xp, target ranged, count 200000000) | 0.4 % | Bogen mit gespanntem Pfeil, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 82 | `GRANDMASTER_MAGIC` | Magic Grandmaster | Earn 200 million Magic XP. | nein | neu: ach_xp_magic_200m (skill_xp, target magic, count 200000000) | 0.4 % | Stab mit Leerenfunken, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 83 | `GRANDMASTER_VITALITY` | Vitality Grandmaster | Earn 30 million Vitality XP. | nein | neu: ach_xp_vitality_30m (skill_xp, target vitality, count 30000000) | 0.6 % | Herz aus Eisen, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 84 | `GRANDMASTER_WARDING` | Warding Grandmaster | Earn 20 million Warding XP. | nein | neu: ach_xp_warding_20m (skill_xp, target warding, count 20000000) | 0.6 % | Schimmernde Bannkuppel, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 85 | `GRANDMASTER_SLAYER` | Slayer Grandmaster | Earn 100 million Slayer XP. | nein | neu: ach_xp_slayer_100m (skill_xp, target slayer, count 100000000) | 0.6 % | Slayer-Helm mit Turmsilhouette, schwarz-goldener Großmeisterrahmen mit Lorbeer |
| 86 | `ASH_TO_ASH` | Ash to Ash | Fall in battle for the first time. | ja | neu: ach_deaths_1 (deaths, count 1) | 70 % | Erloschene Fackel in Asche |
| 87 | `FEATHERS_EVERYWHERE` | Feathers Everywhere | Defeat 1,000 chickens. | ja | ach_kills_chicken_1000 | 20 % | Hühnerfeder-Wirbel um einen Kochtopf |
| 88 | `BULL_HEADED` | Bull-Headed | Defeat the Maddened Bull 100 times. | ja | ach_kills_bull_boss_100 | 8 % | Stierschädel mit verbogenem Horn |
| 89 | `THE_NINTH_WARDEN` | The Ninth Warden | Defeat the Ninth Warden. | ja | neu: ach_elite_idol_warden (elite_kills, target elite_idol_warden, count 1) | 2 % | Neun Wächtermasken, die neunte zerbrochen |
| 90 | `A_HUNDRED_HOURS` | A Hundred Hours in the Reach | Play actively for 100 hours. | ja | neu: ach_play_hours_100 (play_hours, count 100) | 10 % | Sanduhr mit Asche statt Sand |

Zählung: 21 Kapitel (2 versteckt) · 4 Frühgame (Blooded, First Harvest, Coin Purse, Artisan) · 20 × Stufe 99 · 20 × XP-Großmeister · 20 große Meilensteine (Master of Trades, Champion's Bane, First Clear, Friend in the Ash, Merchant Prince, Annihilator, Obsessed, Contract Killer, New Haven Rises, Dungeon Legend, Delver of Every Depth, Encyclopedist, Abyssal Throne, Peak Contender, Ascendant, Beastmaster, Master of All Sets, Whole Bestiary, Trophy Hall, True Completionist) · 5 versteckte Scherze (Ash to Ash, Feathers Everywhere, Bull-Headed, The Ninth Warden, A Hundred Hours) = 90, davon 7 versteckt. 36 Auslöser existieren heute, 54 sind neue interne Erfolge (alle über die Typen aus 2.5).

### 3.3 Deutsche Fassung (für die Steam-Lokalisierung „German" im Backend; ZH/RU/ES/PT-BR/FR später über die Content-Overlays)

| # | API-Name | Name DE | Beschreibung DE |
|---|---|---|---|
| 1 | `CH01_THE_FIRST_PAGE` | Die erste Seite | Schließe Chronik-Kapitel 1 ab: Die erste Seite. |
| 2 | `BLOODED` | Blutgetauft | Besiege 100 Gegner im Reach. |
| 3 | `CH02_FIRST_BLOOD` | Erstes Blut | Schließe Chronik-Kapitel 2 ab: Erstes Blut. |
| 4 | `FIRST_HARVEST` | Erste Ernte | Sammle 1.000 Rohstoffe. |
| 5 | `COIN_PURSE` | Geldbeutel | Besitze 1.000 Gold auf einmal. |
| 6 | `CH03_SPARK_IN_THE_GRAIN` | Der Funke im Korn | Schließe Chronik-Kapitel 3 ab: Der Funke im Korn. |
| 7 | `ARTISAN` | Handwerker | Stelle 100 Gegenstände her. |
| 8 | `CH04_THE_EMPTY_MARCH` | Die leere Mark | Schließe Chronik-Kapitel 4 ab: Die leere Mark. |
| 9 | `CHAMPIONS_BANE` | Championsfluch | Besiege deinen ersten Champion des Reach. |
| 10 | `CH05_THE_WAR_BANNER` | Das Kriegsbanner | Schließe Chronik-Kapitel 5 ab: Das Kriegsbanner. |
| 11 | `FIRST_CLEAR` | Erster Durchlauf | Schließe zum ersten Mal einen Dungeon ab. |
| 12 | `MASTER_OF_TRADES` | Meister der Künste | Erreiche Gesamtlevel 250. |
| 13 | `CH06_THE_ASH_LESSON` | Die Lektion der Asche | Schließe Chronik-Kapitel 6 ab: Die Lektion der Asche. |
| 14 | `FRIEND_IN_THE_ASH` | Ein Freund in der Asche | Finde deinen ersten Begleiter. |
| 15 | `CH07_THE_CARRION_KING` | Der Aaskönig | Schließe Chronik-Kapitel 7 ab: Der Aaskönig. |
| 16 | `CH08_THORNS` | Dornen | Schließe Chronik-Kapitel 8 ab: Dornen. |
| 17 | `CH09_CHOIR_BENEATH_BARROWS` | Der Chor unter den Hügelgräbern | Schließe Chronik-Kapitel 9 ab: Der Chor unter den Hügelgräbern. |
| 18 | `CH10_THE_BROKEN_SEAL` | Das gebrochene Siegel | Schließe Chronik-Kapitel 10 ab: Das gebrochene Siegel. |
| 19 | `CH11_LORD_OF_THE_DEPTHS` | Der Herr der Tiefen | Schließe Chronik-Kapitel 11 ab: Der Herr der Tiefen. |
| 20 | `MERCHANT_PRINCE` | Handelsfürst | Besitze 1.000.000 Gold auf einmal. |
| 21 | `CH12_THE_GIANTS` | Die Riesen | Schließe Chronik-Kapitel 12 ab: Die Riesen. |
| 22 | `ANNIHILATOR` | Vernichter | Besiege 10.000 Gegner. |
| 23 | `CH13_THE_OLD_HUNT` | Die alte Jagd | Schließe Chronik-Kapitel 13 ab: Die alte Jagd. |
| 24 | `OBSESSED` | Besessen | Halte eine Tages-Serie von 30 Tagen. |
| 25 | `CH14_WHAT_THE_SEA_GIVES` | Was das Meer zurückgibt | Schließe Chronik-Kapitel 14 ab: Was das Meer zurückgibt. |
| 26 | `CONTRACT_KILLER` | Auftragsjäger | Erledige 100 Slayer-Aufträge. |
| 27 | `CH15_THE_COLD_FORGE` | Die kalte Schmiede | Schließe Chronik-Kapitel 15 ab: Die kalte Schmiede. |
| 28 | `NEW_HAVEN_RISES` | New Haven erhebt sich | Baue jedes Gebäude in New Haven auf die letzte Stufe aus. |
| 29 | `CH16_THE_THIN_SKY` | Der dünne Himmel | Schließe Chronik-Kapitel 16 ab: Der dünne Himmel. |
| 30 | `DUNGEON_LEGEND` | Dungeon-Legende | Schließe 100 Dungeon-Läufe ab. |
| 31 | `CH17_THE_AERIE` | Der Horst | Schließe Chronik-Kapitel 17 ab: Der Horst. |
| 32 | `CH18_THE_LAST_GATE` | Das letzte Tor | Schließe Chronik-Kapitel 18 ab: Das letzte Tor. |
| 33 | `CH19_THE_JUDGEMENT` | Das Urteil | Schließe Chronik-Kapitel 19 ab: Das Urteil. |
| 34 | `DELVER_OF_EVERY_DEPTH` | Bezwinger aller Tiefen | Schließe jeden Dungeon im Reach mindestens einmal ab. |
| 35 | `CH20_THE_TRUE_CULPRIT` | Der wahre Schuldige | Schlage die letzte Seite der Chronik auf. |
| 36 | `CH21_THE_SECOND_VOLUME` | Epilog: Der zweite Band | Öffne den zweiten Band. |
| 37 | `ENCYCLOPEDIST` | Enzyklopädist | Entdecke 500 verschiedene Gegenstände. |
| 38 | `THE_ABYSSAL_THRONE` | Der Abgrundthron | Erlege ein Wesen auf der fünften Etage des Slayer-Turms. |
| 39 | `PEAK_CONTENDER` | Gipfelstürmer | Erreiche Etage 20 des Paragonturms. |
| 40 | `ASCENDANT` | Aszendent | Erreiche Gesamtlevel 1.000. |
| 41 | `MASTER_WOODCUTTING` | Meisterholzfäller | Erreiche Stufe 99 in Holzfällen. |
| 42 | `MASTER_MINING` | Meisterbergmann | Erreiche Stufe 99 in Bergbau. |
| 43 | `MASTER_FISHING` | Meisterangler | Erreiche Stufe 99 in Angeln. |
| 44 | `MASTER_FORAGING` | Meistersammler | Erreiche Stufe 99 in Sammeln. |
| 45 | `MASTER_COOKING` | Meisterkoch | Erreiche Stufe 99 in Kochen. |
| 46 | `MASTER_SMITHING` | Meisterschmied | Erreiche Stufe 99 in Schmieden. |
| 47 | `MASTER_LEATHERWORKING` | Meisterhandwerker | Erreiche Stufe 99 in Handwerk. |
| 48 | `MASTER_FARMING` | Meisterbauer | Erreiche Stufe 99 in Landwirtschaft. |
| 49 | `MASTER_THIEVING` | Meisterdieb | Erreiche Stufe 99 in Diebeskunst. |
| 50 | `MASTER_JEWELCRAFTING` | Meisterjuwelier | Erreiche Stufe 99 in Juwelenschleifen. |
| 51 | `MASTER_RUNECRAFTING` | Meisterrunenschmied | Erreiche Stufe 99 in Runenschmieden. |
| 52 | `MASTER_HERBLORE` | Meisterkräuterkundiger | Erreiche Stufe 99 in Kräuterkunde. |
| 53 | `MASTER_ATTACK` | Meister der Waffen | Erreiche Stufe 99 in Angriff. |
| 54 | `MASTER_POWER` | Meister der Kraft | Erreiche Stufe 99 in Kraft. |
| 55 | `MASTER_DEFENCE` | Meister des Schildes | Erreiche Stufe 99 in Verteidigung. |
| 56 | `MASTER_RANGED` | Meisterschütze | Erreiche Stufe 99 in Fernkampf. |
| 57 | `MASTER_MAGIC` | Meistermagier | Erreiche Stufe 99 in Magie. |
| 58 | `MASTER_VITALITY` | Meister der Vitalität | Erreiche Stufe 99 in Vitalität. |
| 59 | `MASTER_WARDING` | Meisterbannwirker | Erreiche Stufe 99 in Bannmagie. |
| 60 | `MASTER_SLAYER` | Meisterslayer | Erreiche Stufe 99 in Slayer. |
| 61 | `BEASTMASTER` | Bestienmeister | Besitze alle 21 Begleiter. |
| 62 | `MASTER_OF_ALL_SETS` | Meister aller Sets | Besitze jedes vollständige Ausrüstungsset. |
| 63 | `THE_WHOLE_BESTIARY` | Das ganze Bestiarium | Besiege jedes Wesen im Bestiarium mindestens einmal. |
| 64 | `TROPHY_HALL` | Trophäenhalle | Erbeute die einzigartige Trophäe jedes Champions des Reach. |
| 65 | `TRUE_COMPLETIONIST` | Vollender | Erreiche das maximale Gesamtlevel 1.980. |
| 66 | `GRANDMASTER_WOODCUTTING` | Holzfällen-Großmeister | Sammle 200 Mio. Holzfällen-XP. |
| 67 | `GRANDMASTER_MINING` | Bergbau-Großmeister | Sammle 200 Mio. Bergbau-XP. |
| 68 | `GRANDMASTER_FISHING` | Angeln-Großmeister | Sammle 200 Mio. Angeln-XP. |
| 69 | `GRANDMASTER_FORAGING` | Sammeln-Großmeister | Sammle 200 Mio. Sammeln-XP. |
| 70 | `GRANDMASTER_COOKING` | Kochen-Großmeister | Sammle 200 Mio. Kochen-XP. |
| 71 | `GRANDMASTER_SMITHING` | Schmieden-Großmeister | Sammle 200 Mio. Schmieden-XP. |
| 72 | `GRANDMASTER_LEATHERWORKING` | Handwerk-Großmeister | Sammle 200 Mio. Handwerk-XP. |
| 73 | `GRANDMASTER_FARMING` | Landwirtschaft-Großmeister | Sammle 30 Mio. Landwirtschaft-XP. |
| 74 | `GRANDMASTER_THIEVING` | Diebeskunst-Großmeister | Sammle 100 Mio. Diebeskunst-XP. |
| 75 | `GRANDMASTER_JEWELCRAFTING` | Juwelenschleifen-Großmeister | Sammle 200 Mio. Juwelenschleifen-XP. |
| 76 | `GRANDMASTER_RUNECRAFTING` | Runenschmieden-Großmeister | Sammle 200 Mio. Runenschmieden-XP. |
| 77 | `GRANDMASTER_HERBLORE` | Kräuterkunde-Großmeister | Sammle 200 Mio. Kräuterkunde-XP. |
| 78 | `GRANDMASTER_ATTACK` | Angriff-Großmeister | Sammle 200 Mio. Angriff-XP. |
| 79 | `GRANDMASTER_POWER` | Kraft-Großmeister | Sammle 200 Mio. Kraft-XP. |
| 80 | `GRANDMASTER_DEFENCE` | Verteidigung-Großmeister | Sammle 200 Mio. Verteidigung-XP. |
| 81 | `GRANDMASTER_RANGED` | Fernkampf-Großmeister | Sammle 200 Mio. Fernkampf-XP. |
| 82 | `GRANDMASTER_MAGIC` | Magie-Großmeister | Sammle 200 Mio. Magie-XP. |
| 83 | `GRANDMASTER_VITALITY` | Vitalität-Großmeister | Sammle 30 Mio. Vitalität-XP. |
| 84 | `GRANDMASTER_WARDING` | Bannmagie-Großmeister | Sammle 20 Mio. Bannmagie-XP. |
| 85 | `GRANDMASTER_SLAYER` | Slayer-Großmeister | Sammle 100 Mio. Slayer-XP. |
| 86 | `ASH_TO_ASH` | Asche zu Asche | Falle zum ersten Mal im Kampf. |
| 87 | `FEATHERS_EVERYWHERE` | Überall Federn | Besiege 1.000 Hühner. |
| 88 | `BULL_HEADED` | Sturkopf | Besiege den Rasenden Stier 100-mal. |
| 89 | `THE_NINTH_WARDEN` | Der neunte Wächter | Besiege den neunten Wächter. |
| 90 | `A_HUNDRED_HOURS` | Hundert Stunden im Reach | Spiele 100 Stunden aktiv. |

---

## 4 Technik-Plan (kurz)

**Ist**: `apps/client/src/main/steam.ts` lädt `steamworks.js` per Laufzeit-`require` (fehlt das Paket oder ist `GRIMREACH_STEAM_APPID` 0 → No-Op), kennt `STEAM_ACHIEVEMENTS` (interne ID → API-Name, Default 1:1) und zwei IPC-Handler `steam:achievement-unlock` / `steam:achievement-sync`. Der Renderer ruft beide bereits (`Toasts.tsx` 835 = Sync aller freigeschalteten IDs beim ersten Snapshot, 869 = jeder neue Unlock einzeln). Es fehlt nur: Paket, AppID, Mapping, Backend-Anlage.

1. **Mapping** in `steam.ts`: 90 Einträge `"<interne ID>": "<API-Name>"` aus `steam-set.csv` (Spalten trigger_internal_id → api_name; „neu:"-Einträge erst nach content-dev). Interne IDs ohne Mapping werden still ignoriert (`steamApiName` fällt auf 1:1 zurück, das Backend kennt sie nicht → `activate` gibt false, kein Fehler). Empfehlung: das 1:1-Fallback für nicht gemappte IDs **abschalten** (nur gemappte melden), damit Debug-Logs sauber bleiben.
2. **Sync beim Start**: bleibt wie verdrahtet; `unlockAchievement` prüft `isActivated` vor `activate` (idempotent). Bestandsspieler bekommen damit **alles bereits Erreichte beim ersten Start unter Steam gutgeschrieben** — auch die neuen Kapitel-/XP-Erfolge, weil die Engine sie beim ersten Tick aus den vorhandenen Zählern freischaltet und der Diff-Pfad sie meldet; sollte der erste Batch vor `settledRef` liegen, fängt der Sync beim nächsten Start ihn ab. Optional: Sync zusätzlich nach dem Offline-Catch-up erneut senden (eine Zeile).
3. **Offline-Erwerb**: Erfolge werden im Save freigeschaltet, unabhängig von Steam; ohne Steam-Client (Itch/Direkt) bleibt alles No-Op, beim nächsten Start mit Steam zieht der Sync nach. Steam selbst puffert `SetAchievement` offline und lädt beim nächsten Online-Kontakt hoch (Steamworks-Verhalten, kein eigener Code).
4. **Reihenfolge**: (a) content-dev legt die 54 neuen internen Erfolge + `hidden`-Flag an, logic-dev die Typen aus 2.5; (b) Chef legt im Steamworks-Backend (App **4915450** → Stats & Achievements) die 90 Erfolge in Tabellenreihenfolge an (API-Name exakt, Anzeigename/Beschreibung EN, Lokalisierung DE, Hidden-Haken bei 7, Icons 64 × 64 achieved/unachieved) und **veröffentlicht** die Achievement-Konfiguration (eigener „Publish"-Schritt im Backend, sonst sieht der Client nichts); (c) Client: `pnpm add steamworks.js --filter @hearthforge/client`, `steam_appid.txt` neben die Executable für Dev-Läufe, Mapping einspielen, `GRIMREACH_STEAM_APPID=4915450` bzw. Konstante setzen; electron-builder: native Abhängigkeit in `asarUnpack` prüfen; (d) Test auf der Chef-Maschine mit laufendem Steam-Client: frischer Save → Kapitel 1 → Overlay-Popup; Alt-Save → Sync-Batch; Backend-Statistik prüfen; (e) Depot-Upload wie gewohnt. **Dokumentiert, nicht ausgeführt** — Installation von `steamworks.js` macht der Chef.
5. **Anzahl-Obergrenze / Profil-Wirkung**: Steamworks deckelt Apps standardmäßig bei **100 Erfolgen**, bis die App die Schwelle für „Profile Features" erreicht (danach mehr möglich). Jeder Erfolg erscheint mit globaler Freischaltquote im Spielerprofil und in der Store-Seite; ein 500er-Fließband würde dort als Achievement-Spam gelesen und schadet dem Profil-Showcase mehr, als es hilft. 90 ist bewusst unter 100 mit Luft für 10 Ereignis-/Update-Erfolge.
6. **Risiken**: Namen/Texte dürfen nicht anstößig sein (Steam-Richtlinien; „God of Slaughter" bewusst nicht im Set); versteckte Erfolge dürfen im Backend keine Spoiler im Namen tragen (Steam zeigt Name + Beschreibung erst nach Unlock, aber die Datenbank ist per Web-API lesbar); API-Namen sind nach Veröffentlichung praktisch unveränderlich (Umbenennung = neuer Erfolg, alte Quote bleibt); `steamworks.js` ist eine native Node-Abhängigkeit (Electron-ABI, Build auf der Chef-Maschine prüfen); Steam-Overlay-Popups feuern nur bei laufendem Steam-Client — im Sim/Headless nie; prüfen, ob `achievement.activate` in `steamworks.js` `StoreStats` implizit ruft (sonst einmal pro Batch nachziehen).

## 5 Drei Fragen an den Chef

1. **Schnitt der In-Game-Erfolge**: Sollen wir wirklich von 537 auf ~330 eindampfen (Kill-Ketten raus, Skill-Leitern 10 → 5 Stufen; AP-Quote der Bestandsspieler springt einmalig, bis zu 3 Nachhol-Marken), oder bleiben die 537 unangetastet und die ~170 neuen kommen obendrauf (~700, dann Übersetzungsaufwand und weiterhin Tapete)?
2. **XP-Schwellen**: Einverstanden mit 200 Mio. für 15 Skills und den abgestuften Werten (Farming 30, Vitalität 30, Bannmagie 20, Diebeskunst 100, Slayer 100 Mio.), oder lieber eine einheitliche Zahl fürs Profil (dann 100 Mio. für alle, Farming/Vitalität/Bannmagie ausgenommen)?
3. **Bannmagie/Vitalität als Balance-Frage**: Bannmagie braucht bei 0,25 XP je absorbiertem Punkt rund 220 h reinen Magie-Kampf bis Stufe 99, Vitalität ~110 h; beide sind damit 5–10 × langsamer als jeder andere Skill. Soll ich dafür einen eigenen Retune-Vorschlag machen (Faktor 0,25 → ~1,0 bzw. 0,5 → ~1,0), bevor die Steam-99er-Erfolge das für alle sichtbar machen?
