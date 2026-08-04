# Autonome Arbeitssession — Log

**Start:** 2026-06-23 00:01 · **Deadline:** ~2026-06-23 05:01 (5 h)

**Auftrag:** Eigenständig das Spiel kontinuierlich verbessern (Polish, Tooltips, schönere Interfaces,
komplettes Skill-UI-Update mit „was tue ich gerade"-Anzeige + Fortschrittsbalken), Logik durchgehen,
Schwachstellen erkennen & intelligent beheben. **Verifikation über Simulation + Tests + Build — KEIN
Electron-Start** (User schläft, kann das Fenster nicht schließen). Selbst-Wiederaufruf bis Deadline.

## Arbeitsweise pro Iteration
1. Diesen Log lesen (Kontext).
2. Eine Verbesserung wählen (aus Backlog) & implementieren.
3. Verifizieren: `pnpm typecheck`, `pnpm test`, `pnpm --filter @hearthforge/client build`,
   Simulation `pnpm --filter @hearthforge/engine exec vitest run src/sim.test.ts`.
4. Hier kurz protokollieren (was getan, was gefunden).
5. ScheduleWakeup neu setzen, solange vor Deadline.

## Backlog (priorisiert, wird laufend ergänzt)
- [ ] Simulations-Harness bauen (sim.ts + sim.test.ts) → Spiel ohne Electron durchsimulieren.
- [ ] Skill-UI-Update: aktive Aktion prominent + Fortschrittsbalken + Raten (XP/h, Items/h).
- [ ] Tooltip-Komponente (Hover-Card statt title-Attribut) für Items/Skills.
- [ ] Balance-Pass anhand der Simulation (Time-to-kill, XP-Raten, Gold-Fluss).
- [ ] Globaler „aktive Aktion"-Indikator in der Sidebar/Kopfzeile (sieht man überall, was läuft).
- [ ] Offline-Fortschritts-Popup beim Laden.
- [ ] Optionen-Seite (Sprachwahl auch im Spiel).
- [ ] Fernkampf-Eigenheiten (Krit/Tempo/Ausweichen), Konstitutions/HP-Skill.
- [ ] Logik-Review: Edge-Cases (Inventar voll im Kampf-Loot, Aktion-Level-Gating, etc.).

## Befunde aus der Simulation (Baseline)
- Alle 43 Aktionen produzieren korrekt (kein Stall/0-XP-Bug).
- Kampf-Kurve grob stimmig: Baseline-Bronze-Held farmt bis ~Lv68, Lv120-Boss korrekt unbesiegbar.
- **BALANCE (für User):** XP-Raten zu hoch — Lv26-39 in 1h pro Aktion; für Cap 120 zu schnell. NICHT
  selbst umbalanciert (User-Domäne). Notiert.

## Protokoll
- 00:01 — Session gestartet, Electron geschlossen, Log angelegt.
- 00:10 — **Simulations-Harness** gebaut (`engine/src/sim.ts` + `sim.test.ts`): simuliert alle Aktionen
  & Kämpfe, Report + `findIssues`. Lauf: `pnpm --filter @hearthforge/engine exec vitest run src/sim.test.ts`.
- 00:20 — **Skill-UI-Update**: Kopf mit Level-Badge + XP-Balken (cur/next, %), prominentes
  „Läuft gerade"-Panel mit großem Fortschrittsbalken + Raten (XP/h, Items/h), Aktions-Karten erweitert
  (Start/Stop-Label, Produziert-Vorschau, Material have/need). **Globaler Aktivitäts-Indikator** in der
  Kopfzeile (Aktiv/Kampf/Untätig + Mini-Fortschrittsbalken, überall sichtbar). +13 i18n-Keys (en+de).
  Grün: 41 Tests, typecheck 5/5, build.
- 00:14 — **Fernkampf-Eigenheiten** (Engine): in `computeStats` bekommt Stil `ranged` jetzt +0.10
  Krit-Chance, ×0.85 Angriffstempo (schneller) und +5 Ausweichen. Damit sind alle drei Stile
  mechanisch eigenständig (Nahkampf=Lebensraub, Magie=Mana/Status, Fernkampf=Krit/Tempo/Ausweichen).
  Neuer Test `styles.test.ts` (2). `findIssues`-Schwelle verfeinert (High-Level-Bosse für Baseline
  nicht mehr als „Bug"). Grün: 43 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Fernkampf-Eigenheiten erledigt.
- 00:20 — **Aktions-Level-Gating**: `ActionDef.levelRequired` + Durchsetzung in `setActiveAction`
  (+ Helper `actionLevelMet`). UI: gesperrte Aktionen disabled + „🔒 Benötigt Level N". Exemplarisch
  auf Top-Tier-Aktionen gesetzt (grimiron/blackcast/blackthorn/scaled/aether — Platzhalter-Level 10-20,
  **konkrete Werte = User-Domäne**). Sim-Harness angepasst (gegatete Aktionen vorab auf Level setzen,
  XP-Zuwachs statt -Gesamt messen). Neuer Test `gating.test.ts` (3). Kein Save-Change (levelRequired ist
  Content, kein State). Grün: 42 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Aktions-Level-Gating erledigt (System; mehr Aktionen kann User/künftige Iteration gaten).
- 00:30 — **Buff-System** (Engine): `ItemDef.buff {durationMs, bonus}`, `CharacterState.buffs: ActiveBuff[]`,
  `useConsumable` (Glyphe → Buff aktivieren/erneuern, Trank → sofort heilen), `tickBuffs` in `advance`,
  `computeStats` wendet Buff-Boni an. Glyphen geben jetzt echte Boni (Wucht=+6 Schaden alle Stile 5min,
  Abwehr=+8 Vert./+25 HP 5min). UI: Consumables im Inventar anklickbar (nutzen), aktive Buffs als Badges
  (Icon+Restzeit) im Charakterblatt. **Bugfix:** Mana-Vital zeigte immer max statt aktuell. SAVE_VERSION→7,
  migriert (buffs=[]). Neuer Test `buffs.test.ts` (3). Grün: 49 Tests, typecheck 5/5, build, Sim 0.
- [x] Buffs für Tränke/Glyphen erledigt.
- 00:38 — **Offline-Fortschritts-Popup**: `deserialize` liefert jetzt eine `OfflineSummary` (XP/Gold/Items,
  per Snapshot vor/nach dem Nachholen). GameContext fängt sie beim Laden ab (nur >1 Min Abwesenheit),
  Modal-Popup „Während du weg warst" (Dauer, +XP, +Gold, erbeutete Items) + Einsammeln-Button. +6 i18n-Keys
  (en+de), Modal-CSS. Kein Save-Change (Summary ist transient). Neuer Persistenz-Test (jetzt 5). Grün:
  50 Tests, typecheck 5/5, build, Sim 0.
- [x] Offline-Popup erledigt.
- 00:48 — **Optionen-Seite** (`OptionsPage`): erreichbar über Sidebar (⚙️ Optionen, „other"-Sektion),
  In-Game-Sprachumschalter (English/Deutsch) — vorher nur im Hauptmenü möglich. +2 i18n-Keys (nav.options,
  options.language) en+de, CSS. Kein Save-Change (Locale liegt in localStorage). Grün: 50 Tests,
  typecheck 5/5, build, Sim 0.
- [x] Optionen-Seite erledigt.
- 00:54 — **Lebenskraft-Skill (Vitality)**: neue Kampf-Fertigkeit `vitality` (trainiert CON). Ausgeteilter
  Schaden gibt Lebenskraft-XP (`VITALITY_XP_PER_DAMAGE`, in `grantOffenseXp`), Level erhöht max. HP
  `(level-1)*3` in `computeStats`. **Logik-Bug gefangen:** erst gab Level 1 schon +3 HP und verschob die
  Grundformel (Test schlug fehl → auf `(level-1)*3` korrigiert, Basis 50+CON*10 bleibt). Kein Save-Change
  (vitality ist normaler skills-Eintrag). Neuer Test `vitality.test.ts` (1). Grün: 51 Tests, typecheck 5/5,
  build, Sim 0.
- [x] HP/Konstitutions-Skill erledigt.
- 01:01 — **Kampf-Fertigkeiten im Charakterblatt**: neuer Block „Kampf-Fertigkeiten" in der Werte-Spalte
  zeigt Level von Angriff/Wucht/Verteidigung/Fernkampf/Off.+Def. Magie/Lebenskraft. Konstante
  `COMBAT_SKILL_IDS` in shared. +1 i18n-Key (char.combatSkills) en+de. Kein Save-Change. Grün: 51 Tests,
  typecheck 5/5, build, Sim 0.
- [x] Kampf-Skills im Charakterblatt erledigt.
- 01:07 — **Statistik-System + Seite**: `GameState.stats: PlayerStats {kills, deaths}` (lebenslang, in
  `onEnemyDefeated`/`onPlayerDefeated` hochgezählt — anders als `combat.kills`, das pro Session nullt).
  Neue 📊 Statistik-Seite (Sidebar) zeigt Gesamtlevel, Gesamt-XP, Spielzeit, Gold, besiegte Monster, Tode.
  SAVE_VERSION→8, migriert (stats={kills:0,deaths:0}). +7 i18n-Keys en+de. Neuer Test `stats.test.ts` (1).
  Grün: 52 Tests, typecheck 5/5, build, Sim 0.
- [x] Statistik-Seite erledigt.
- 01:15 — **Items-gesammelt-Statistik**: `PlayerStats.itemsGathered` (lebenslang) — in `completeAction`
  (Sammeln/Verarbeiten-Output) und `onEnemyDefeated` (Kampf-Loot) um die tatsächlich hinzugefügte Menge
  hochgezählt (addItem-Rückgabe → zählt Overflow nicht mit). Auf der Statistik-Seite ergänzt. SAVE_VERSION→9,
  migriert (auch v8→v9: itemsGathered=0). +1 i18n-Key en+de. Test `stats.test.ts` erweitert (2). Grün:
  53 Tests, typecheck 5/5, build, Sim 0.
- [x] Items-gesammelt-Statistik erledigt.
- 01:21 — **Logik-Bugfix: Overheal/Overmana**: nach Ablauf eines +HP-Buffs (z.B. Glyphe der Abwehr) oder
  Ablegen von HP-/INT-Gear blieben HP/Mana über dem neuen Maximum (Regen ist `< max`-gated, kappte nie nach
  unten). Jetzt kappen `combatStep` und der `advance`-Regen-Block HP/Mana aufs aktuelle Maximum. Kein
  Save-Change. Test in `buffs.test.ts` ergänzt (4). Grün: 54 Tests, typecheck 5/5, build, Sim 0.
- [x] Overheal-Edge-Case erledigt.
- 01:26 — **Charakterblatt-Kampfwerte erweitert**: Krit-Schaden (`stat.critDamage`, neu) + Ausweichen
  (`stat.evasion`) im „Kampf"-Block ergänzt. +1 i18n-Key (stat.critDamage) en+de. Kein Save-Change.
  Grün: 54 Tests, typecheck 5/5, build, Sim 0.
  HINWEIS: Tooltip-Hover-Card bewusst aufgeschoben — positionierungs-empfindlich (Clipping bei overflow,
  Bildschirmrand), ohne visuelle Prüfung riskant. Native `title`-Tooltips funktionieren weiterhin. Besser
  umsetzen, wenn der User es live sehen/prüfen kann.
- [x] Krit-Schaden/Ausweichen im Charakterblatt erledigt.
- 01:32 — **Gegner-Loot-Vorschau**: Monster-Karten im Kampf-Auswahlbildschirm zeigen jetzt
  ⭐ XP · 🪙 Gold sowie eine Beute-Vorschau (Item-Icons mit Tooltip „Name · Chance%"). +1 i18n-Key
  (combat.drops) en+de, CSS. Kein Save-Change. Grün: 54 Tests, typecheck 5/5, build, Sim 0.
- [x] Gegner-Loot-Vorschau erledigt.
- 01:37 — **Achievement-/Meilenstein-System**: datengetriebene `AchievementDef` (id, name, desc, icon,
  `condition {type, value}`) in `ContentDB.achievements`; `GameState.achievements: string[]` (freigeschaltete
  IDs). Engine-Modul `achievements.ts` (`checkAchievements`) prüft Bedingungen (totalLevel/kills/itemsGathered/
  gold) und schaltet neu erfüllte frei — aufgerufen in `advance` (greift damit auch beim Offline-Nachholen).
  10 Erfolge im Content (Gesamtlevel 25/100/250, Kills 10/100/1000, Sammeln 100/1000, Gold 1k/10k), alle
  {en,de}. UI: Erfolge-Panel auf der Statistik-Seite (Grid, freigeschaltet hervorgehoben / gesperrt mit 🔒 +
  Zähler X/Y), +1 i18n-Key (achievements.title) en+de, CSS. SAVE_VERSION→10, migriert (achievements=[]).
  Neuer Test `achievements.test.ts` (4). Grün: 58 Tests (53 Engine + 5 Persistenz), typecheck 5/5, build,
  Sim 0 Auffälligkeiten.
- [x] Achievement-/Meilenstein-System erledigt.
- 01:47 — **Skill-Übersicht** (`SkillsOverviewPage`): neue Seite (Sidebar „📚 Fertigkeiten-Übersicht",
  oben in der Skills-Sektion) zeigt ALLE Fertigkeiten auf einen Blick — Gesamtlevel-Kopf + zwei Gruppen
  (Allgemeine Fertigkeiten / Kampf-Fertigkeiten via `COMBAT_SKILL_IDS`), jede Karte mit Emoji-Icon,
  Name, Level und XP-Fortschrittsbalken (`levelFromXp`/`xpForLevel` wiederverwendet). Neue NavView
  `skills-overview` + Routing in `App.tsx`. +5 i18n-Keys (nav.skillsOverview, skills.overview/.totalLevel/
  .group.general/.group.combat) en+de, CSS (responsives Grid). Kein Save-Change (reine Anzeige).
  Grün: 58 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Skill-Übersicht erledigt.
- 01:52 — **Logik-Review (kein Bug gefunden, dokumentiert):** Offline ist auf 24 h gedeckelt
  (`MAX_OFFLINE_MS`), Spielertod beendet den Kampf (`onPlayerDefeated` setzt `monsterId=null`) → KEIN
  Offline-Endlos-Todesloop; Loot-Overflow wird via `addItem`-Rückgabe korrekt nicht gezählt. Shop hat
  bereits vollständiges Kauf- UND Verkauf-UI (`sellItem`/`sellPrice`, „Alle verkaufen"). → „Verkaufswerte
  für mehr Items" ist reine Balance (item.value-Zahlen) = User-Domäne, NICHT angefasst.
- 01:52 — **Gegner-Statuseffekt-Resistenzen** (Engine + Content + UI): `MonsterDef.resist?: StatusType[]`
  (Content, kein State → keine Migration). Neuer exportierter Helfer `monsterResists(monster, type)`;
  `applyWeaponEffect` überspringt resistierte Effekte komplett (Magie-Waffeneffekte greifen nicht).
  Thematisch vergeben: Glutelementar/Aschtyrann/Eisenrevenant → 🔥 burn-immun, Frosthund/Eishexer →
  ❄️ frost-immun, Aetherwraith → ⚡ shock-immun, Endboss „Der Letzte Götze" → immun gegen ALLE.
  UI: Monster-Auswahlkarte zeigt „Immun: <Icons>" (reuse `EFFECT_ICON`), +2 i18n-Keys (combat.immune,
  combat.immuneHint) en+de, CSS. Neuer Test `resistances.test.ts` (4). **Stolperstein gefangen:** Endboss-ID
  ist `last_idol` (nicht `the_last_idol`) — Test korrigiert. Grün: 62 Tests, typecheck 5/5, build, Sim 0.
- [x] Gegner-Statuseffekt-Resistenzen erledigt.
- 02:01 — **Bestiarium + per-Monster-Kill-Tracking**: `GameState.monsterKills: Record<id, number>`
  (lebenslang, in `onEnemyDefeated` hochgezählt). Neue Seite „📖 Bestiarium" (Sidebar, Kampf-Sektion):
  alle Gegner nach Stufe sortiert, Entdeckt-Zähler (X/Y); besiegte zeigen Name + HP/Schaden/Verteidigung,
  ☠ Kill-Zahl, Immunitäten (🔥/❄️/⚡) und Beute-Icons. Noch nicht besiegte erscheinen als „???"
  (gestrichelt, gedimmt) mit Hinweis. Neue NavView `bestiary` + Routing. SAVE_VERSION→11, migriert
  (monsterKills={}). +5 i18n-Keys (nav.bestiary, bestiary.title/.discovered/.level/.undiscovered) en+de,
  CSS. Test in `stats.test.ts` ergänzt (Bestiarium-Summe == stats.kills, nur gekämpftes Monster zählt).
  Grün: 63 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Bestiarium-Seite erledigt.
- 02:07 — **Zonen-System + Bestiarium-Gruppierung**: `ZoneDef {id, name}` + `ContentDB.zones` (5 Regionen:
  Grenzlande, Aschfelder, Schwarzdornwald, Schlackengrube & Frostkavernen, Götzenhalle), `MonsterDef.zone`
  an allen 21 Gegnern gesetzt (passend zu den bestehenden Zonen-Kommentaren). Bestiarium gruppiert die
  Gegner jetzt nach Zone (je Zone eine Sektion mit Überschrift, „Sonstige"-Fallback für zonenlose).
  Datengetrieben (Reihenfolge aus content.zones). +CSS (.bestiary-zone). `inventory.test`-ContentDB-Literal
  um `zones: []` ergänzt. Kein Save-Change (Zonen sind Content). Neuer Test `zones.test.ts` (2):
  jeder Gegner referenziert eine existierende Zone, jede Zone hat ≥1 Gegner. Grün: 65 Tests, typecheck 5/5,
  build, Sim 0 Auffälligkeiten.
- [x] Zonen-System + Bestiarium-Gruppierung erledigt.
- 02:14 — **Kampf-Auswahl nach Zone gruppiert**: `MonsterSelect` (CombatPage) rendert die Gegner jetzt in
  Zonen-Sektionen (Reihenfolge aus content.zones, „Sonstige"-Fallback), Gegner je Zone nach Stufe sortiert
  — gleiche Gruppierungslogik wie das Bestiarium, konsistente UX. Zonen-Überschrift mit Unterstrich-Trenner
  (.combat-zone-heading). Reine UI-Änderung, kein Save-Change, keine neuen i18n-Keys (Zonennamen aus
  Content via tr()). Grün: 65 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Kampf-Auswahl nach Zone gruppieren erledigt.
- 02:18 — **Spieler-Gift-System (neue StatusType `poison`)**: kohärentes vertikales Feature, das das bisher
  wirkungslose Antigift-Tonikum sinnvoll macht. `CombatState.playerEffects: StatusEffect[]` (Spielerseite,
  spiegelt enemyEffects); `MonsterDef.inflict {type,chance,magnitude,durationMs}` löst bei Gegner-Treffer
  einen Effekt aus; `ItemDef.curesPoison`. Engine: `tickPlayerEffects` (Gift-DoT, ignoriert Rüstung, gibt
  Lebenskraft-XP, kann den Spieler besiegen → onPlayerDefeated), `applyMonsterInflict` bei Gegner-Treffer,
  `useConsumable` entfernt Gift bei curesPoison. createCombat/startCombat init []; onPlayerDefeated leert
  playerEffects. Content: Antigift `curesPoison:true`; giftige Gegner Morastkriecher (Lv8), Rankenhexe
  (Lv32), Grubenspinne (Lv42). UI: Spieler-Statusbadges im Kampf (🟢 + Restzeit), Gift-Warnung „Verursacht:
  🟢" auf Gegner-Karte. SAVE_VERSION→12, migriert (playerEffects=[]). +2 i18n-Keys (combat.inflicts/.Hint)
  en+de, CSS. Neuer Test `poison.test.ts` (3): DoT+Ablauf, Antigift-Heilung, Content-Markierung. Grün:
  68 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Spieler-Gift-System erledigt.
- 02:26 — **Blutungs-Status + Waffeneffekt-Generalisierung**: neue StatusType `bleed` (DoT wie Brand,
  ignoriert Rüstung). **Mechanik-Generalisierung:** `weaponEffect` wird jetzt bei JEDEM Treffer ausgelöst
  (vorher nur bei Magie-Zaubern) — bei Magie weiterhin an einen echten Cast gekoppelt (`casts`), sonst
  (Nahkampf/Fernkampf) bei jedem Treffer. `tickEnemyEffects` behandelt bleed wie burn. Content:
  Schwarzguss-Kriegsklinge erhält `weaponEffect bleed` (25%, 8/s, 5s); Blutungs-Immunität für Eisenrevenant
  (Konstrukt), Geisterhirsch (+poison, Geist) und Endboss. UI: 🩸-Icon in Kampf & Bestiarium; Bestiarium
  zeigt jetzt auch „Verursacht:"-Zeile (Konsistenz mit Kampf-Auswahl). Kein Save-Change (neuer Enum-Wert +
  Content). Neuer Test `bleed.test.ts` (3): DoT-Tick, seeded Integration (Nahkampfwaffe löst bleed über
  viele Treffer aus — **Stolperstein gefangen:** Test gegen Goblin schlug fehl, weil der One-Shot-Kill
  enemyEffects im selben Tick leert → auf zähen Aschtyrann umgestellt), Content-Marker. Grün: 71 Tests,
  typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Blutungs-Status + Waffeneffekt-Generalisierung erledigt.
- 02:33 — **Status-Effekt-Legende**: kompakte Referenz oben auf der Bestiarium-Seite, die alle fünf
  Statuseffekte erklärt (🔥 Brand, ❄️ Frost, ⚡ Schock, 🟢 Gift, 🩸 Blutung) mit Icon, Name und
  Kurzbeschreibung (Tooltip + Inline). Datengetrieben aus `STATUS_LEGEND`-Array. +11 i18n-Keys
  (bestiary.legend + status.<typ>(.desc)) en+de, CSS (flex-Legende mit Trennlinie). `t()` akzeptiert
  `string`, daher dynamische Keys `status.${s}.desc` unkritisch. Reine UI, kein Save-Change. Grün:
  71 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Status-Effekt-Legende erledigt.
- 02:38 — **Skill-Übersicht klickbar**: `onNavigate`-Callback (= setActivePageId) wird durch `PageContent`
  an `SkillsOverviewPage` durchgereicht. Allgemeine Fertigkeitskarten sind jetzt anklickbar (als `<button>`
  mit Reset + Hover) und springen direkt zur jeweiligen Skill-Seite (nav-pageId === skillId). Kampf-
  Fertigkeiten (ohne eigene Seite) bleiben nicht-klickbar. Reine UI, kein Save-Change, keine neuen i18n-Keys.
  Grün: 71 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Skill-Übersicht klickbar erledigt.
- 02:43 — **Bestiarium → direkt in den Kampf**: entdeckte Gegner-Karten haben jetzt einen „⚔ Kämpfen"-Button,
  der `startCombat` aufruft und per `onNavigate("combat")` direkt zur Kampfseite springt. `onNavigate`
  via PageContent durchgereicht (wie bei der Skill-Übersicht). Nicht entdeckte („???") bleiben ohne Button.
  Bestehender i18n-Key `combat.fight` wiederverwendet, +CSS (.bestiary-fight-btn mit Hover). Reine UI,
  kein Save-Change. Grün: 71 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Bestiarium-Karten klickbar erledigt.
- 02:47 — **Gesamtfortschritt-Anzeige**: neue „Completion"-Sektion auf der Statistik-Seite mit
  Fortschrittsbalken für Erfolge (X/Y · %) und Bestiarium (entdeckte Gegner X/Y · %). Liest vorhandenen
  State (achievements, monsterKills) + Content. +4 i18n-Keys (completion.title/.achievements/.bestiary)
  en+de, CSS. Reine UI, kein Save-Change. Grün: 71 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Gesamtfortschritt/Completion-Anzeige erledigt.
- 02:51 — **Fernkampf-Munitionsverbrauch**: Fernkampf bekommt eine eigene Ressource (Pfeile) — analog zu
  Mana bei Magie. `ItemDef.ammoType?: ItemId`; Bögen (Kurzbogen, Graueibe-Langbogen, Schwarzdorn-
  Kriegsbogen) verbrauchen pro Schuss 1 `iron_arrow`. Engine: in `performPlayerAttack` verbraucht
  Fernkampf Munition; ohne Munition nur improvisierter Schlag (`RANGED_WEAK_FACTOR=0.4`), und der
  Waffeneffekt wird nur bei echtem Schuss (firesAmmo) ausgelöst — Effekt-Gating jetzt sauber pro Stil
  (Magie=casts, Fernkampf=firesAmmo, Nahkampf=immer). Damit sind alle drei Stile vollständig eigenständig
  (Nahkampf=Lebensraub, Magie=Mana+Status, Fernkampf=Krit/Tempo/Munition). UI: Munitionsanzeige im Kampf
  (🪶 + Anzahl, Warnung „Keine Munition!" bei 0). +3 i18n-Keys (combat.ammo/.ammoHint/.ammoEmpty) en+de,
  CSS. Kein Save-Change (ammoType ist Content). Neuer Test `ranged.test.ts` (3): Verbrauch, Leerlauf ohne
  Absturz, Content-Marker. **Stolperstein:** „kein Schaden"-Assertion scheiterte am Goblin-Respawn (enemyHp
  zurück auf max) → auf eventCount/kills umgestellt. Sim nutzt Bronze-Nahkampf → unbeeinflusst. Grün:
  74 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Fernkampf-Munitionsverbrauch erledigt.
- 02:58 — **Kampfstil + Munition auf dem Charakterblatt**: Der „Kampf"-Block zeigt jetzt oben den aktiven
  Kampfstil (Nahkampf/Fernkampf/Magie, aus `stats.style` via styleLabel) und — falls eine Fernkampfwaffe
  mit Munitionsbedarf ausgerüstet ist — eine Munitionszeile (Anzahl + Item-Name). Macht die neuen
  Stil-/Munitions-Mechaniken auch außerhalb des Kampfes sichtbar. +2 i18n-Keys (stat.style, stat.ammo)
  en+de, `itemCount` importiert. Reine UI, kein Save-Change. Grün: 74 Tests, typecheck 5/5, build, Sim 0.
- [x] Kampfstil + Munition auf Charakterblatt erledigt.
- 03:03 — **Gegner-Selbstheilung (regen)**: neue Engine-Mechanik `MonsterDef.regen?` (HP/Sekunde, solange
  der Gegner lebt) — macht Kämpfe zum DPS-Check (Status-DoTs/Burst werden relevanter). In `combatStep`
  heilt der Gegner pro Tick, gekappt aufs Maximum. Content: Moosgolem regeneriert 3 HP/s (thematisch).
  UI: ♻-Anzeige mit Tooltip auf Bestiarium- & Kampf-Auswahlkarte. +1 i18n-Key (combat.regenHint) en+de.
  Kein Save-Change (regen ist Content). Neuer Test `regen.test.ts` (3): heilt unter Max, nie über Max,
  Gegner ohne regen unverändert. **Sim geprüft:** Moosgolem mit Regen weiterhin besiegbar (301 Kills,
  ~12s/Kill — spürbar zäher als andere, gewollter DPS-Check; **Balance = User-Domäne, nur notiert**),
  0 Auffälligkeiten. Grün: 77 Tests, typecheck 5/5, build.
- [x] Gegner-Selbstheilung erledigt.
- 03:08 — **Logik-Review Skilling (kein Bug):** Verarbeitungs-Aktionen stoppen sauber bei fehlendem
  Material (`hasInputs`-Check vor UND in der while-Schleife) — kein Stall/Endlosproduktion. Dokumentiert.
  **Inhalts-Tiefe (nutzt bestehende Mechaniken):** (1) Schwarzdorn-Kriegsbogen erhält `weaponEffect bleed`
  (Widerhaken-Pfeile, 20%/7-pro-s/5s) — erste Fernkampf-Statuswaffe, greift dank der Ranged-Effekt-
  Generalisierung. (2) Endgame-Drachenhaut-Skarn (Lv104) regeneriert 6 HP/s (Drachen-Heilung). Kein
  Save-Change (nur Content). Neuer Test `ranged-effect.test.ts` (3): Effekt löst MIT Munition aus, OHNE
  Munition NICHT (firesAmmo-Gating sauber bestätigt), Content-Marker. **Sim:** 0 Auffälligkeiten;
  scale_skarn als Lv104-Endgame für Baseline erwartungsgemäß unbesiegbar (kein Flag, da Schwelle ≤50).
  Grün: 80 Tests, typecheck 5/5, build.
- [x] Fernkampf-Statuswaffe + Endgame-Regen-Gegner erledigt.
- 03:13 — **Gegner-Wut (Enrage)**: neue Engine-Mechanik `MonsterDef.enrage {belowHpPct, damageMult}` —
  unter dem HP-Schwellwert schlägt der Gegner mit erhöhtem Schaden. In `combatStep` skaliert der
  Gegner-Angriffsschaden, wenn `enemyHp/maxHp <= belowHpPct`. Content: Waldvogt (unter 35% → ×1,6),
  Endboss „Der Letzte Götze" (unter 30% → ×1,75). UI: 😡-Indikator mit Tooltip auf Bestiarium- & Kampf-
  Auswahlkarte. +1 i18n-Key (combat.enrageHint) en+de. Kein Save-Change (Content). Neuer Test
  `enrage.test.ts` (2): Content-Marker + über 120 Seeds gemittelt schlägt der wütende Gegner härter
  (robust gegen einzelne Fehlschläge). **Stolperstein:** Einzel-Seed-Vergleich scheiterte (Gegner verfehlt
  / HP-Clamp verfälschte hp-Differenz) → auf geloggten Trefferschaden + Seed-Mittelung umgestellt.
  **Sim:** Waldvogt weiter besiegbar (135 Kills, ~26,7s/Kill, jetzt 2 Tode statt 0 — Wut erzeugt Spannung;
  **Balance = User-Domäne, notiert**), 0 Auffälligkeiten. Grün: 82 Tests, typecheck 5/5, build.
- [x] Gegner-Wut (Enrage) erledigt.
- 03:21 — **Wut-Badge im aktiven Kampf**: Der Gegner-Fighter zeigt jetzt ein pulsierendes 😡-Badge neben
  dem Namen, sobald er unter den Wut-Schwellwert fällt (live aus `cs.enemyHp/maxHp` berechnet, Tooltip
  „Wütend — erhöhter Schaden!"). FighterProps um `enraged`/`enrageLabel` erweitert. +1 i18n-Key
  (combat.enrageActive) en+de, CSS-Puls-Animation. Reine UI, kein Save-Change. Grün: 82 Tests, typecheck
  5/5, build, Sim 0 Auffälligkeiten.
- [x] Wut-Badge im aktiven Kampf erledigt.
- 03:26 — **„Aktion gestoppt"-Hinweis**: `GameState.lastStop {actionId, reason:"no_materials"}` hält fest,
  warum die zuletzt aktive Sammel-/Verarbeitungsaktion automatisch endete. In `step` an beiden Stopp-Stellen
  gesetzt; beim Start einer neuen Aktion (`setActiveAction`) und beim `startCombat` wieder geleert. Die
  Skill-Seite zeigt statt „Idle" einen hervorgehobenen Hinweis „Gestoppt — Material leer…", aber nur in der
  betroffenen Fertigkeit. Besonders nützlich nach Offline-Zeit (man sieht sofort, warum die Produktion
  stoppte). SAVE_VERSION→13, migriert (lastStop=null). +1 i18n-Key (skill.stoppedNoMaterials) en+de, CSS.
  Neuer Test `laststop.test.ts` (2): wird bei Material-Ende gesetzt, beim Neustart verworfen. Grün:
  84 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] „Aktion gestoppt"-Hinweis erledigt.
- 03:32 — **Globaler „Gestoppt"-Hinweis in der Kopfzeile**: Der Aktivitäts-Indikator (GameStats) zeigt
  jetzt — wenn nichts läuft, aber `lastStop.reason==="no_materials"` gesetzt ist — „⚠ Gestoppt: <Aktion>"
  (statt „Untätig"), mit Tooltip. So bemerkt man von jeder Seite aus, dass die Produktion mangels Material
  endete. +1 i18n-Key (header.stopped) en+de, CSS (.activity-stopped). Reine UI, kein Save-Change. Grün:
  84 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Globaler „Produktion gestoppt"-Hinweis erledigt.
- 03:36 — **Inventar-voll-Logik (echter Logik-Gap behoben):** Bisher lief Sammeln/Verarbeiten bei vollem
  Inventar weiter und verwarf den Ertrag still (Overflow via addItem→0). Jetzt stoppt `step` die Aktion,
  wenn KEINE der möglichen Ausgaben mehr ins Inventar passt — mit `lastStop.reason="inventory_full"`.
  Neuer Helfer `canHold(inv, content, itemId)` (stapelbares Item mit vorhandenem Stack ODER freier Slot);
  `canHoldOutputs` prüft alle Loot-Items. Greift auch offline (kein verschwendeter Nachhol-Ertrag).
  Stop-Reason-Typ um `inventory_full` erweitert; Skill-Seite & Kopfzeile zeigen die passende Meldung
  (Material leer vs. Inventar voll). Veraltetes addItem-TODO entfernt. +1 i18n-Key
  (skill.stoppedInventoryFull) en+de. Kein SAVE_VERSION-Bump nötig (gleiche Struktur, nur Reason-Union
  erweitert; lastStop-Migration existiert bereits). Neuer Test `inventory-full.test.ts` (2): stoppt bei
  vollem Inventar, läuft mit Platz normal weiter. Grün: 86 Tests, typecheck 5/5, build, Sim 0.
- [x] Inventar-voll-Logik erledigt.
- 03:42 — **Inventar-Füllstand in der Kopfzeile**: GameStats zeigt jetzt „🎒 x/y" (belegte/effektive Slots,
  inkl. Taschen via `usedSlots`/`effectiveCapacity`), färbt sich warnend, wenn voll, mit Tooltip
  („Inventar voll — schaffe Platz…"). Macht die neue Inventar-voll-Stop-Logik proaktiv sichtbar, bevor das
  Sammeln stoppt. +2 i18n-Keys (header.bags/.bagsFull) en+de, CSS. Reine UI, kein Save-Change. Grün:
  86 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Inventar-Füllstand-Anzeige erledigt.
- 03:46 — **Regen-Badge am Gegner im aktiven Kampf**: Der Gegner-Fighter zeigt neben dem Namen ein
  ♻-Trait-Badge (mit Tooltip), wenn das Monster regeneriert — konsistent zum Wut-Badge. FighterProps um
  `regen`/`regenLabel` erweitert, +CSS (.trait-badge). Bestehende i18n-Keys wiederverwendet. Reine UI,
  kein Save-Change. Grün: 86 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Regen-Badge im aktiven Kampf erledigt.
- 03:50 — **Kampf-Log um Status-Ereignisse** (begonnen, nach OOM beim Testlauf vorerst gestoppt).
- 08:23 — **Iteration 37 fertiggestellt & verifiziert** (am Morgen, User wieder da): `CombatEvent` um
  kind `"status"` + optionales `status?: StatusType` erweitert; Engine loggt Statuseffekt-AUSLÖSUNGEN
  (nur bei Neuanwendung, kein DoT-Spam): Gegner-Effekt via `applyWeaponEffect` (by:"player"),
  Spieler-Gift via `applyMonsterInflict` (by:"enemy"). UI: `eventText` rendert „X erleidet <Status>!" /
  „Du erleidest <Status>!", +2 i18n-Keys (combat.statusEnemy/.statusPlayer) en+de, CSS (.log-line.status).
  Kein Save-Change (optionales Feld, log ist gekappt). Neuer Test `combatlog-status.test.ts` (2).
  **URSACHE exit code 137:** nicht der Spielcode — der Test hatte zwei 3000-Tick-Schleifen, die zusammen
  mit dem parallelen vitest ins Speicherlimit liefen (SIGKILL). Fix: Schleifen auf 800 reduziert → Test
  läuft in 7 ms. Grün: 88 Tests (83 Engine + 5 Persistenz), typecheck 5/5, build, Sim 0 Auffälligkeiten.
- [x] Kampf-Log Status-Ereignisse erledigt.
- LEHRE: Sim-/Tick-Schleifen in Tests klein halten (≤ ~1000 Iterationen) bzw. Tests isoliert laufen
  lassen, um OOM/SIGKILL (exit 137) zu vermeiden.
