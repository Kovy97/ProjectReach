# Autonome Session 2 — Mandat & Logbuch

**Start:** 2026-06-23 ~11:30 · **Dauer:** ~12 h autonom (bis ~23:30) · Direktor: Claude.

## Zwischenstand (~14:04, nach Iter 1–25) — alles grün: 157 Tests (150 Engine + 7 Persistenz), typecheck 5/5, build, Sim 0 Auffälligkeiten
**Gebaut:** Lebendige Welt mit 8 Zonen / 58 Monstern (Weiden, Grenzlande, Aschfelder, Schwarzdorn, Krypta, Hochland,
**Küste** & **Wildwald** neu) — Drops kategorisch an Skills gekoppelt. Voll verdrahtete Ketten: **Fletching**
(Schaft+Pfeilspitze+Feder → Pfeile je Tier, ammoDamage im Kampf), **Jewelcrafting** (Edelstein schleifen → 8 Schmuck +
Raubzahnkette; Ring-Routing), **Fisch-Kette** (Kabeljau/Lachs/Hummer). **Mastery-System** (Doppelertrag + Tempo je
Aktion, Karten-Anzeige + Übersichtsseite). **Bank/Lager** (unbegrenzte Stapel, SAVE_VERSION 17). Balance-Pass (145
xp-Werte auf Zielkurve).
**WICHTIG — 3 echte Combat-Bugs gefixt (Iter 21/22/24):** Status-Effekte (Brennen/Blutung/Frost/Schock), die Monster
dem Spieler zufügen, waren komplett wirkungslos (nur Gift wirkte) → jetzt voll verdrahtet; `monster.xp` (in der UI
als Kill-Belohnung gezeigt) wurde nie vergeben → jetzt stil-geroutet gewährt; Auto-Eat ignorierte DoT-Schaden → jetzt
greift es auch bei Gift/Blutung. **Der Kampf funktioniert jetzt wie entworfen** (vorher taten viele Monster-Mechaniken
& die Kill-XP nichts).
Härtung/Guards: **wiring-audit** (keine toten/verwaisten Items), **i18n-Paritäts-Guard** (en/de via tsc), **Achievement-**
& **Status-Coverage-Guards** (Anti-Regression), Bank-Rename-Migration. Referenzdocs: `balance-*.md`, `asset-gaps.md`
(29 Monster/32 Gear-PNGs offen).
**Braucht DEINE Entscheidung (bewusst nicht solo gemacht — UX-/Balance-/Tooling-subjektiv):** Toast-Notifications
(Level-up/seltener Drop), Save-Export, Asset-Downscale-Pipeline, diskrete Mastery-Meilenstein-Perks, Mini-Dungeons.
**Status ab ~14:04:** Hochwert-Arbeitsfläche erschöpft → Standby mit langer Taktung; ich greife genuin wertvolle/sichere
Arbeit auf, wenn sie auftaucht, und warte sonst auf deine Richtung. Loop läuft bis ~23:18.

## Mandat (vom User)
- **Gebalanctes Spiel** bauen (Balance ist jetzt MEINE Aufgabe, nicht mehr nur „notieren"). Assets liefert der User im Nachlauf.
- **Lebendige, verbundene Welt:** echte Zonen, in denen Gegner *kategorisch* leben und deren Drops Skills speisen
  (z.B. Weide: Huhn→Federn→Fletching, Kuh→Leder→Gerberei, Fleisch→Kochen). Kämpfe sollen sich nicht wie eine
  flache Monsterliste anfühlen.
- **Alles sinnig verdrahten** (keine toten Items/Loops).
- **Gedanken zum Kampf** machen (aktuell langweilig: „Kampf → Monster wählen").
- **Agents erlaubt** (bis 10) für parallele, DISJUNKTE Bereiche; einer darf am UI arbeiten.

## Arbeitsregeln
- Verifikation NUR headless: `pnpm typecheck`, `pnpm test`, `pnpm --filter @hearthforge/client build`,
  `pnpm --filter @hearthforge/engine exec vitest run src/sim.test.ts`. **NIEMALS Electron/`pnpm dev`** (User weg).
- **Repo ist KEIN Git-Repo** → keine Worktrees. Hot-Files (`content/index.ts`, `shared/index.ts`) + gemeinsames
  `out/` ⇒ Agents NUR auf disjunkten Dateien, KEINE parallelen `pnpm build` (out/-Konflikt). Doc-/Analyse-Agents
  und Client-only-UI-Agents (Verifikation via `tsc --noEmit`) sind sicher parallel. Hot-File-Integration mache ich selbst.
- Save-Logik bei neuem State/umbenannten IDs immer mitziehen (Migration + ggf. SAVE_VERSION).
- Pro Iteration: 1–2 Backlog-Punkte, headless verifizieren (nichts rot), hier protokollieren, ScheduleWakeup neu setzen.

## Schlüssel-Referenz: Balance-Formel (aus design/balance-report.md)
Ziel-XP/h pro Level: **`ziel_xph(L) = 90 · sqrt(xpForLevel(L+1) − xpForLevel(L))`** → ~820 (Lv1), ~9.300 (Lv50),
~67.000 (Lv90), ~105.000 (Lv99). Zielzeiten: ~20 h (Lv50), ~250 h (Lv99), ~700 h (Lv120).
Umsetzung: `durationMs` lassen, **`xp` je Aktion absenken** (Früh-/Midgame auf ~7–30 %, ~Lv95 deckungsgleich, ab
Lv105 leicht steigend). Combat-`monster.xp` analog. Thieving-XP stark nerfen (größter Ausreißer). Frühgame-Gold ~halbieren.

## Protokoll
- **Iter 1 (11:30):** Lebendige Welt — **Weiden-Zone** (Huhn/Kuh/Wildschwein) eingebaut; Drops verdrahtet
  (Huhn→Feder+raw_chicken, Kuh→raw_hide+raw_beef, Wildschwein→hide+beef). `vulture_feather`→generisches **`feather`**
  vereinheitlicht (Fletching-Pfeile nutzen es; +Migration). Neue Items raw/cooked beef & chicken (+Heilung),
  Koch-Rezepte `cook_beef`/`cook_chicken`. Neue Zone `pastures`. Test `living-world.test.ts` (5).
  **Parallel-Agents:** (a) UI-Tooltip-Agent → Equip-Stats (Krit/Tempo/2H/Werkzeug) jetzt im Tooltip + i18n + CSS
  (Client-only, tsc grün). (b) Balance-Agent → `design/balance-report.md` (Formel + konkrete xp-Tabellen + Fahrplan).
  Grün: 110 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.

- **Iter 2 (11:25, User lieferte Kreaturen-Art):** Monster-Bild-System auf **Auto-Discovery** umgestellt
  (`monsters.ts` via import.meta.glob → `assets/monsters/<id>.png`). **29 Kreaturen-PNGs** eingebunden.
  **24 neue Monster** + lebendige Zonen, Drops verdrahtet:
  • Grenzlande: Goblin-Warband (Schurke/Speer/Bogen/Armbrust/Schlächter/Felmagier/Sturmrufer/Hexenmeister) — Ohren/Gear/Status.
  • Weiden: **Rasender Bulle** (Boss, Enrage) → Leder/Fleisch.
  • Schwarzdornwald: **Rootlinge** ×4 (lebende Bäume, bleed/poison-immun) → Holz/Kräuter; Baumriese-Boss (regen+enrage).
  • Neue Zone **Krypta** (crypt): 7 Skelette (16–45) → Knochen, mit Frost/Pyro/Nekro-Status & -Immunitäten.
  • Neue Zone **Hochland** (highlands): 4 Rocs (35–75, Riesenvögel) → viele Federn (Fletching-Sink).
  Bestehende Huhn/Kuh/Ratte/Goblin jetzt bebildert. Zonen `crypt`+`highlands` ergänzt.
  Grün: 110 Tests (Content-Integrität + Zonen-Test fangen tote Refs/zonenlose Monster), typecheck 5/5, build (29 Assets), Sim 0.

- **Iter 3 (~11:30):** **Kampf-Zonen-Navigation** (CombatPage): zweistufig — erst **Zonen-Auswahl** (Karten je
  Zone mit Thumbnail des ersten Monsters, Level-Spanne, Gegnerzahl, Entdeckt-Zähler), dann Gegner der Zone
  + „← Alle Zonen". +4 i18n-Keys (combat.chooseZone/.zoneLevels/.enemies/.allZones) en+de, CSS (.zone-grid/
  .zone-card/.zone-detail-head, max 4 pro Reihe). Client-only. **Parallel-Agent:** Balance-XP-Tabelle →
  `design/balance-xp-table.md` (Formel verifiziert; 96 Aktionen + 49 Monster mit `xp_neu`; mechanische
  Apply-Liste; Caveat: Endgame-Held-Power separat). Grün: 110 Tests, typecheck 5/5, build, Sim 0.
  → NÄCHSTE Iteration: Apply-Liste aus `balance-xp-table.md` mechanisch ins content/index.ts übernehmen (Hot-File, selbst).

- **Iter 4 (~11:40): BALANCE-PASS P0 angewendet.** Apply-Liste aus `balance-xp-table.md` (145 Einträge:
  96 Aktionen + 49 Monster) per Skript ins `content/index.ts` übernommen (`xp:` je Entität ersetzt; Backup
  in scratchpad). XP/h folgt jetzt der Zielkurve: früh ~1.000 (cut_normal_tree 1200, mine_copper 1028,
  pickpocket_beggar 585) → mid ~2–4k (smelt_steel 2400, mine_mithril 4320) → Endgame ~140k (mine_godiron).
  Frühgame ~10× langsamer als zuvor. `tick.test.ts` balance-unabhängig gemacht (XP = Abschlüsse × action.xp).
  Grün: 110 Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  HINWEIS (aus Report): Endgame-Power-Kurve (Lv90+ Held bricht ein) ist SEPARAT zu lösen (Equipment/Set-Boni),
  nicht Teil der XP-Balance.

- **Iter 5 (~11:52): SET-BONI.** `SetDef {id,name,pieces,minPieces,bonus}` + `ContentDB.sets`; `computeStats`
  zählt getragene Set-Teile und addiert den Bonus ab `minPieces`. Helfer `activeSets()` exportiert. Sets:
  Kupfer (8 Teile, ab 5 → +4 Def/+15 HP/+2 Nah/−0,1s Tempo), Eisen (4, ab 3 → +8/+30/+4/−0,15s),
  Stahl (2, ab 2 → +12/+40/+6). UI: „Set-Bonus"-Block im Charakterblatt (aktive Sets + kompakte Bonus-Zeile),
  +1 i18n-Key (char.setBonus) en+de, CSS. Adressiert die Endgame-Power-Kurve (skaliert mit künftigen Tier-Sets).
  Kein Save-Change (sets = Content). Test `set-bonus.test.ts` (3): Schwelle, exakter +4-Bonus, Content-Refs.
  Grün: 113 Tests, typecheck 5/5, build, Sim 0.
  → Folge-Backlog: Set-Zugehörigkeit + „x/y Teile" auch im Item-Tooltip anzeigen (Client-only, Agent-tauglich).

- **Iter 6 (~12:13): FLETCHING-KETTE komplett & verdrahtet.** Saubere Munitions-Kette je Tier statt des alten
  unsauberen `fletch_arrows` (das in einem Schritt Schaft + Pfeil ohne Spitze erzeugte). Neu:
  • Items: `iron/steel/mithril/runite_arrowheads` (geschmiedet) + `copper/steel/mithril/runite_arrow` (iron_arrow existierte).
  • Smithing: `forge_iron/steel/mithril/runite_arrowheads` (1 Barren → 15 Spitzen, je in Tier-Kategorie, Lv10/20/35/55).
  • Fletching: `fletch_shafts` (1 normal_log → 15 Schäfte) + Pfeil-Rezepte je Tier
    (15 Schaft + 15 Spitze + 15 Feder → 15 Pfeil; copper Lv1, iron(=fletch_arrows) Lv10, steel Lv20, mithril Lv35, runite Lv55).
  • **Tier wirkt jetzt mechanisch:** neues `ItemDef.ammoDamage`; Kampf addiert es beim Schuss
    (copper 0 / iron 2 / steel 4 / mithril 7 / runite 11). Bögen tier-passend: short_bow→copper, grimoak→iron, blackthorn→steel.
  Feder-Sink (15/Craft) verdrahtet Weiden/Hochland-Federn an die Pfeil-Produktion. Kein Save-Change (nur neue Items + opt. Feld).
  Tests `ranged.test`/`ranged-effect.test` auf neue Munition aktualisiert; neuer `fletching.test.ts` (7: Schäfte, je Tier
  Vollkette, Bogen→fletchbare Munition). Grün: 115 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  → Folge-Backlog: Pfeilspitzen/Pfeile auch für Tiers ohne Bogen (bronze/höher) wenn dort Fernkampfwaffen kommen.

- **Iter 7 (~12:30): JEWELCRAFTING — Edelstein-Schleifen → Schmuck.** Neuer Skill `jewelcrafting`
  (Juwelierskunst). Verdrahtet die toten Roh-Edelstein-Drops (rough_garnet/sapphire/ruby/diamond) und füllt
  die leeren Hals-/Ring-Slots. Neu:
  • 4 Schleif-Aktionen (`cut_garnet/sapphire/ruby/diamond`: roh → geschliffen, Lv1/15/34/55) + 4 geschliffene Gem-Items.
  • 8 Schmuck-Items: Ring + Amulett je Gem mit tier-skalierenden Boni (Granat HP/Nah → Saphir Magie/Ausweichen →
    Rubin Nah/Krit → Diamant Def/HP/Acc). 8 Craft-Rezepte (Gem + Barren als Fassung: copper→mithril je Tier).
  • **Engine: Ring-Routing** — Ringe deklarieren kanonisch `ring1`, equipItem legt den zweiten Ring automatisch
    in `ring2` (erster freier Slot), damit beide Ring-Slots nutzbar sind.
  • UI: Nav-Eintrag + Skill-Icon 💍 + i18n (nav.jewelcrafting en+de). Skill-Seite/Übersicht greifen Skill auto.
  Kein Save-Change (state.skills lazy {}, neue Items auto). Test `jewelcrafting.test.ts` (7: Skill, je Gem
  Vollkette, Amulett-Bonus wirkt +10 HP, Ring-Routing ring1→ring2). Grün: 122 Engine-Tests, typecheck 5/5,
  build (136 Module), Sim 0 Auffälligkeiten.
  → Folge: Schmuck-Assets (PNG) später; ggf. höhere Gem-Tiers (Bergbau-Bonus-Drops nur bis Diamant).

- **Iter 8 (~12:40): KÜSTENZONE „Gezeitenuntiefen" + Fisch-Kette.** Fischen war unterentwickelt (nur Shrimp+Forelle).
  Neu:
  • 3 Fisch-Tiers: Kabeljau/Lachs/Hummer — je `catch_*` (Fishing, Lv15/35/55) + `cook_*` (Cooking) + roh/gebraten-Items
    (Heilung 35/55/80). Schließt die Lücke zw. Forelle (Heal 20) und Endgame.
  • Neue Zone `coast` mit 4 aquatischen Gegnern: Schlickkrabbe (Lv8) → Shrimp/Schuppenleder, Riff-Ertrunkener (Lv20)
    → Kabeljau/Leder, Gezeitensirene (Lv38, Schock) → Lachs/Narbenleder, Tiefenkrake (Lv60, regen+enrage) → Hummer/Leder/Seelenopal.
  • **Doppelte Verzahnung:** Monster-Drops speisen Kochen (Fisch) UND Gerberei (vorhandene Leder-Items) — kein totes Item.
  Zone ins `zones`-Array (zw. highlands & slagpit). Kein Save-Change. Test `coast.test.ts` (5: Zone besiedelt, je Fisch
  Fang→Koch-Kette + Heilung, Küsten-Drops sind Koch-Inputs). Grün: 127 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  → Folge: Küsten-Creature-Art (PNG, Auto-Discovery); evtl. Krabben-Panzer (chitin) → eigenes Leder-Tier.

- **Iter 9 (~12:48): MASTERY pro Aktion (Langzeit-Progression).** Neues System: jede Skill-Aktion hat eine eigene
  Mastery-Spur. Vertikaler Schnitt über alle Schichten:
  • shared: `GameState.mastery: Record<ActionId, {xp}>`; SAVE_VERSION 15→16; Konstanten + Helfer `masteryDoubleChance`
    (linear 0,5 %/Level ab Lv2, gekappt 50 %).
  • engine: `completeAction` vergibt Mastery-XP (= action.xp) UND wendet **Doppel-Ertrag-Chance** auf Loot an (Level VOR
    dem Abschluss zählt). Helfermodul `mastery.ts` (`masteryLevel/Progress/BonusChance`), aus engine exportiert.
  • state: `mastery: {}` initialisiert. persistence: Migration füllt `mastery = {}` für Alt-Saves.
  • UI: Mastery-Zeile je Aktionskarte (★ Level + goldener Fortschrittsbalken + „+X% ×2"-Bonus), i18n (skill.mastery/
    .masteryTip en+de), CSS (.skillcard-mastery/.mastery-bar/.mastery-bonus).
  Nur Skilling-Aktionen (Kampf ruft completeAction nicht) → Combat unberührt. Bonus bei Lv1=0 → Sim unverzerrt.
  Test `mastery.test.ts` (4: leere Map frisch, XP-Akkumulation = Skill-XP & isoliert je Aktion, Chance-Kurve,
  hohes Level → mehr Ertrag). Grün: 131 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  → Folge: Mastery-Meilensteine/Belohnungen (z.B. ab Lv50 freischaltbare Perks); Gesamt-Mastery-Übersichtsseite.

- **Iter 10 (~12:55): VERDRAHTUNGS-AUDIT (Stewardship: „alles sinnig verdrahtet").** Nach 9 Feature-Iterationen
  ein Audit aller Items eingezogen — als dauerhafter Guard-Test `wiring-audit.test.ts` (2):
  • „Jedes Item ist erhältlich" (Loot/Shop/Start/Munition) → **grün, 0 verwaiste Items** (Welt erreichbar sauber).
  • „Kein totes Material" (kein Input/Munition UND kein Verkaufswert) → fand **4 tote Drops**:
    birds_nest, goblin_ear, crude_bone, shaman_totem (Monster-Junk ohne Sink & ohne value).
  Fix: sinnvolle Verkaufswerte + Icons vergeben (14/5/3/22, shaman_totem rarity magic) — werden zu legitimen
  Trophäen-Gold-Quellen (wie guard_insignia/ledger_page). Kein Save-/Logik-Change. 
  Grün: 133 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  → Folge: ggf. crude_bone (häufigster Drop) später als echten Skill-Reagenz (Herblore/Farming) statt nur Verkauf.

- **Iter 11 (~13:00): MASTERY-TEMPO-BONUS (zweiter Mastery-Effekt).** Mastery vertieft: neben Doppelertrag jetzt
  auch ein **Tempo-Bonus** je Aktion (linear 0,12 %/Level ab Lv2, gekappt 12 % bei Lv99). shared: `masterySpeedMult`
  + Konstanten. engine: `tick.ts` multipliziert die effektive Dauer mit Werkzeug- UND Mastery-Tempo; Helfer
  `masterySpeedFor` (engine-exportiert). UI: SkillPage rechnet Mastery-Tempo in Zeit/Rate/Ertrag-Kacheln ein
  (★-Marker bei aktivem Bonus), Mastery-Tooltip zeigt nun Doppelertrag- UND Tempo-% ({spd}), i18n en+de aktualisiert.
  Lv1 = 0 % → Sim/Balance unverzerrt; Effekt stapelt mit Doppelertrag für starke, aber teuer erkaufte Langzeit-Belohnung.
  Test `mastery.test.ts` erweitert (6: + Tempo-Kurve, + „mehr Abschlüsse bei hohem Level"). Kein Save-Change (mastery
  existiert seit v16). Grün: 135 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  → Folge: Gesamt-Mastery-Übersichtsseite (read-only Aggregat) oder diskrete Meilenstein-Perks.

- **Iter 12 (~13:05): MASTERY-ÜBERSICHTSSEITE (Client-only).** Vervollständigt den Mastery-Bogen (Iter 9+11) mit
  einer read-only Aggregat-Seite `MasteryPage.tsx`: Kopf mit Gesamt-Meisterschaft (Summe aller Aktions-Level) +
  „maximierte Aktionen X/Y"; je Skilling-Fertigkeit ein Panel mit Fortschritts-% und sortierter Aktionsliste
  (★ Level + Balken + aktive Perks „+X% ×2" / „−Y% ⏱"). Verdrahtet: View `mastery` in NavView-Typ + App-Routing
  + Nav-Eintrag (★, unter Fertigkeits-Übersicht), i18n (nav.mastery + mastery.title/intro/totalLevel/mastered en+de),
  CSS (.mastery-page/.mastery-row-Grid u.a.). Keine Engine/Content/Shared-Änderung → 135 Engine-Tests unberührt gültig.
  Grün: typecheck 5/5, build sauber.
  → Folge: diskrete Mastery-Meilenstein-Perks (z.B. ab Lv50 Bonus-Freischaltung) als nächste echte Mechanik.

- **Iter 13 (~13:10): WILDWALD-ZONE (Jagdgründe) — die „Wild"-Verzahnung.** Vom User explizit genannt
  („Wald: Holz/Kräuter/Wild"). Neue Zone `wildwood` (Lv12–45) mit 5 Wildtieren/Raubtieren — distinkt zu den
  Weiden (Nutztiere Lv1–10) und Blackthorn (lebende Bäume): Waldhase (12) → Leder/Fleisch, Grauwolf (18, Blutung)
  → Leder/Reißzahn, Wildhirsch (26) → Narbenleder/Fleisch, Schreckenswolf (34, Blutung+Enrage) → Narbenleder/Reißzahn,
  Altbär (45, Regen+Enrage, Boss) → Schuppenleder/Fleisch/Seelenopal. Speist die **Mittelgame-Leder- (Gerberei) &
  Fleisch-Versorgung (Kochen)** — füllt die Lücke zw. Weiden- und Hochland-Drops. Voll wiederverwendete Items →
  audit-/integritäts-sicher (kein totes Item). Zone ins `zones`-Array (nach coast). Kein Save-Change.
  Bestehende Guards (zones/content-integrity/wiring-audit) decken ab. Grün: 135 Engine-Tests, typecheck 5/5, build,
  Sim 0 Auffälligkeiten (Fauna kämpft stimmig). → Folge: Creature-Art (PNG, Auto-Discovery); evtl. Reißzahn/Pelz als
  eigene Crafting-Kette.

- **Iter 14 (~13:16): RAUBZAHN-KETTE (Wildwald-Reißzahn → Schmuck).** Combat-Kern hat bereits Tiefe (Auto-Eat,
  Lifesteal, Mana-Casts, Status, Enrage, Munition) → riskante Ability-Erfindung solo vermieden; stattdessen den
  Wildwald-Drop `fang` (war nur verkaufbar) zu echtem Sink gemacht: neues `craft_fang_necklace` (Jewelcrafting Lv5,
  3 Reißzahn + 1 gegerbtes Leder) → `fang_necklace` (Amulett, +3 Nahkampf/+3 % Krit). Edelstein-freier, **offensiver**
  Früh-Amulett-Pfad neben dem defensiven Granatamulett (Build-Vielfalt). Schließt die Schleife Jagd→Schmuck→stärker
  kämpfen. Kein Save-Change. Test in `jewelcrafting.test.ts` (fang jetzt Input, Kette equippbar, +3 Nahkampf wirkt).
  Grün: 136 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten.

- **Iter 15 (~13:20): ASSET-LÜCKEN-REPORT (Stewardship für User-Workflow „Assets im Nachlauf").** Präzisen
  Abgleich vorhandener PNGs gegen Content erstellt (temp. Test mit fs-Read + content-Import, danach entfernt) →
  neues Referenzdok `design/asset-gaps.md`. Stand: **Monster 29/58, Items 28/158**. Priorisiert: P1 29 fehlende
  Monster nach Zone, P2 32 fehlende Ausrüstungsteile (Sets/Bögen/Foki/Schmuck), P3 98 Materialien (Emoji-Fallback
  reicht) in sinnvollen Clustern (Barren/Spitzhacken/Munition/Edelsteine/Fisch/Leder/Drops). + Pipeline-Hinweis
  (2 MB-Renders → Downscale). Kein Code-Change → typecheck FULL TURBO grün. Hilft dem User, Assets gezielt zu liefern.

- **Iter 16 (~13:30): BANK/LAGER (Roadmap M3 „die WoW-Bank-Idee").** Roadmap geprüft → Fernkampf hat bereits
  Identität (computeStats Z.166: +10 % Krit, ×0,85 Tempo, +5 Ausweichen; Notiz war veraltet). Stattdessen den
  explizit gelisteten, offenen M3-Punkt umgesetzt: **Bank** als unbegrenzte Stapel je Item (`GameState.bank:
  Record<ItemId,number>`, SAVE_VERSION 16→17 + Migration). engine `bank.ts`: `depositItem/depositAll/withdrawItem/
  bankCount/bankList` — Einlagern durch Inventarbestand begrenzt, Abheben durch Lager UND freien Inventarplatz
  (kein Item-Verlust bei vollem Inventar), leere Einträge werden entfernt. UI `BankPage` (zwei Spalten Inventar↔Lager,
  „Alles einlagern", 1/Alle je Zeile) + View `bank` in NavView/App-Routing/Nav (🏦, neben Shop), i18n (10 Keys en+de),
  CSS (.bank-columns spiegelt Shop). state-init `bank:{}`. Test `bank.test.ts` (6: leer frisch, ein/auslagern,
  Bestands-/Platz-Grenzen, depositAll). Grün: 142 Engine-Tests, typecheck 5/5, build, Sim 0 Auffälligkeiten,
  Persistenz-Round-Trip ok.
  → Folge: optional Bank-Suche/Filter & Sortierung bei vielen Einträgen; „in Bank einzahlen"-Shortcut aus dem Charakterblatt.

- **Iter 17 (~13:36): STATISTIK-INTEGRATION (Politur statt neuem System).** Bewusst kein neues Feature
  (Roadmap warnt vor Feature-Wildwuchs) — stattdessen die neuen Systeme in die M4-Statistikseite integriert:
  Stat-Zeilen „Gesamt-Meisterschaft" (Summe aller Aktions-Mastery-Level) + „Items im Lager"; Completion-Balken
  „Meisterschaft X/Y maximierte Aktionen" neben Achievements/Bestiarium. Client-only (StatsPage + 4 i18n-Keys en+de).
  142 Engine-Tests unberührt gültig. Grün: typecheck 5/5, build.
  → Folge: M4-Politur (Notifications Level-up/seltener Drop, Onboarding) oder Bank-Komfort (Filter/Sort).

- **Iter 18 (~13:42): i18n-PARITÄTS-GUARD (Härtung statt riskantem UX-Feature).** Toast-/Notification-System bewusst
  zurückgestellt (UX-subjektiv + Multi-Site-XP-Refactor → besser mit User). Stattdessen die ~40 neuen i18n-Keys
  geprüft: **en/de exakt paritätisch (231/231)**. Dann dauerhaft abgesichert ohne neue Infra: `translations.ts`
  umstrukturiert zu `const en = {…}` + `const de: Record<keyof typeof en, string> = {…}` → fehlende/zusätzliche
  Keys sind jetzt ein **tsc-Fehler** (greift im bestehenden typecheck). Guard verifiziert (Probe-Key → tsc-Error
  TS2741, dann zurückgenommen). Client-only. Grün: typecheck 5/5, build. Verhindert künftig stumme Fehl-Übersetzungen.

- **Iter 19 (~13:48): BANK-RENAME-MIGRATION (Lücke aus Iter 16 geschlossen).** Beim Bank-Feature hatte ich die
  Item-ID-Rename-Migration NICHT auf die Bank-Schlüssel angewandt (Inventar/Ausrüstung/Essen/Buffs schon) → latenter
  Bug bei künftigen Item-Umbenennungen. Gefixt: `migrateState` remappt jetzt auch `state.bank`-Keys über dieselbe
  RENAME-Map und **führt Mengen bei Kollision zusammen** (alt+neu → Summe). Persistenz-isoliert. Test ergänzt
  (grimiron_ore:5 + iron_ore:3 im Lager → iron_ore:8, alte ID weg). Grün: typecheck 5/5, Persistenz 7/7.

- **Iter 21 (~13:55): COMBAT-BUG GEFUNDEN & GEFIXT (Bug-Hunt).** `applyMonsterInflict` legte beliebige Status-Typen
  in `playerEffects`, aber `tickPlayerEffects` verarbeitete NUR `poison` → vom Monster zugefügtes **Brennen (×2),
  Blutung (×3), Frost (×1), Schock (×3) waren am Spieler komplett wirkungslos**. Viele Bedrohungsmechaniken (inkl.
  meiner Wölfe=Blutung, Sirene/Sturm-Roc=Schock) taten nichts. Fix: `tickPlayerEffects` spiegelt jetzt die
  Gegner-Logik — Gift/Brennen/Blutung = DoT, Frost verlangsamt den Spieler-Angriffstimer, Schock setzt den
  Spielerangriff aus (gibt `{frost,shock}` zurück; combatStep wendet beides an). Test `player-status.test.ts` (3:
  Blutung/Brennen schädigen jetzt, Schock zieht keine HP). Sim bestätigt: Inflict-Monster nun spürbar gefährlicher
  (dire_wolf 26 Tode, roc_storm 85), aber keiner auf 0 Kills → Schwierigkeit angemessen. „Sinnig verdrahtet"
  wiederhergestellt. Grün: 145 Engine + 7 Persistenz, typecheck 5/5, build, Sim 0 Auffälligkeiten.

- **Iter 22 (~14:00): ZWEITER COMBAT-BUG — Kill-XP nie vergeben (Bug-Hunt fortgesetzt).** `monster.xp` wird in der
  CombatPage als „⭐{m.xp}" als Belohnung angezeigt, aber **nirgends in der Engine vergeben** — Kampf-XP war rein
  schadensbasiert. Die UI versprach also eine Kill-XP, die der Spieler nie bekam (und die ich in dieser Session sogar
  gebalanced hatte). Intent-konsistenter, reversibler Fix: `grantKillXp` routet `monster.xp` beim Kill stil-gerecht
  (Nahkampf: je ½ auf attack & power; Fernkampf→ranged; Magie→magic_off); `onEnemyDefeated` bekommt `style`-Param.
  Niedrige Magnitude (chicken 1 … idol_warden 824) → minimaler Balance-Impact, Sim weiter 0 Auffälligkeiten.
  Test `kill-xp.test.ts` (2: präzise Rekonstruktion XP = Trefferschaden×Faktor + monster.xp/2; Bonus strikt wirksam).
  Grün: 147 Engine + 7 Persistenz, typecheck 5/5, build, Sim 0. Bug-Hunt-Muster „definiert/angezeigt aber nie
  angewandt" zweimal gefunden (Iter 21 Status-Effekte, Iter 22 Kill-XP).

- **Iter 23 (~14:01): „Definiert-aber-nicht-angewandt"-Muster SYSTEMATISCH durchgeprüft (sauber).** Alle Felder von
  ItemDef/ActionDef/MonsterDef gegen Engine-Nutzung abgeglichen → nach den Fixes aus Iter 21/22 sind alle mechanischen
  Felder verdrahtet (successPerLevel wird via actionSuccessChance in *shared* gelesen — kein Bug, nur engine-only-Grep
  täuschte). Achievement-Condition-Typen (gold/kills/itemsGathered/totalLevel) alle vom Checker behandelt. Kein
  weiterer Bug dieses Musters. Kleiner Guard-Test ergänzt (`achievements.test.ts`: jeder genutzte Condition-Typ muss
  behandelt sein → neuer Typ ohne Switch-Zweig schlägt fehl). Grün: Achievements 5/5, typecheck 5/5.
  → Muster erschöpft; künftige Bug-Hunts in anderen Klassen (Logik-Edge-Cases, Offline-Pfad) oder weiter Politur.

- **Iter 24 (~14:02): DRITTER Combat-Bug — Auto-Eat ignorierte DoT.** Folge-Bug meines Iter-21-Fixes: `tryAutoEat`
  lief NUR im Gegner-Angriffs-Block. Seit DoT (Gift/Brennen/Blutung) jeden Tick HP zieht, konnte ein Spieler MIT Essen
  zwischen zwei langsamen Schlägen an DoT sterben, ohne zu essen. Fix: `tryAutoEat` zusätzlich direkt nach dem
  DoT-Tick (vor dem Tod-Check) — spiegelt den Schaden→Essen→Tod-Fluss des Gegner-Angriffs. Test `autoeat-dot.test.ts`
  (2: Spieler isst durch reinen DoT und überlebt [Gegner im Fenster stumm]; ohne Essen sauberer Kampf-Abbruch + HP-Reset).
  Sim-Char hat kein Essen → unverändert; Sim 0 Auffälligkeiten. Grün: 150 Engine + 7 Persistenz, typecheck 5/5, build.
  **Combat-Status-Cluster komplett bereinigt:** Iter 21 (Effekte am Spieler inert) → 22 (Kill-XP nie vergeben) →
  24 (Auto-Eat ignorierte DoT). Drei zusammenhängende reale Bugs in einem Hunt.

- **Iter 25 (~14:03): Shop/Inventar/Combat-UI verifiziert (sauber) + Status-Regression-Guard.** Bug-Hunt in
  Shop (`buyItem/sellItem/buySlotUpgrade` — Gold/Platz/Mengen korrekt, kein negatives Gold) und Inventar-Primitiven
  (`addItem/removeItem/canHold` — Stapel-Merge & Overflow korrekt) → **sauber**. CombatPage zeigt Spieler-Effekte
  bereits an (alle 5 Icons) → keine UI-Lücke. Geprüft: Waffen-Effekte nutzen nur bleed/burn (von tickEnemyEffects
  als DoT behandelt) → keine spiegelverkehrte Iter-21-Lücke. Neuer Guard `status-coverage.test.ts` (2): jeder
  Inflict-Typ muss spielerseitig, jeder weaponEffect-Typ gegnerseitig behandelt sein → verhindert Rückfall der
  Iter-21-Bugklasse. Grün: Status-Coverage 2/2, typecheck 5/5. **Bug-Hunt-Hochwert-Fläche weitgehend erschöpft;
  Taktung auf 30 Min beruhigt.**

- **Iter 27 (~Rückkehr User): WIEDER AKTIV + NOTIFICATIONS.** User zurück („warum gehts nicht weiter") — Standby war
  zu zaghaft; Taktung zurück auf aktiv. User-Richtung (Frage): **Notifications & Politur + mehr Content/Progression**.
  Geliefert: Toast-Benachrichtigungen (`components/Toasts.tsx`) für Level-ups (je Fertigkeit), Gesamtlevel und
  seltene Funde (rare/epic/legendary). Bewusst **client-only**: vergleicht pro Tick einen Snapshot (useRef) gegen den
  aktuellen Stand (Level/Gesamtlevel/rare-Item-Mengen) via `useEffect([state.totalTicks])` — kein Engine-/Save-Eingriff,
  geringes Risiko. Unten-rechts gestapelt, 4 s Auto-Dismiss, Einblend-Animation. In App neben ItemTooltipOverlay
  gemountet. +3 i18n-Keys en+de (toast.levelUp/.totalLevel/.rareFind), CSS (.toast-stack/.toast). Grün: typecheck 5/5
  (i18n-Parität bestätigt), build. → Folge: Notifications-Politur (z.B. Achievement-Toast) + Content-Strang.

- **Iter 28 (~17:52): CONTENT — Mithril-Gear-Tier ausmodelliert.** Höhere Smithing-Kategorien hatten nur Smelt+Pfeilspitzen.
  Mithril nun voll: 5 Items (mithril_blade +38 Nah/+4% Krit, _helm/_body/_legs/_shield) + 5 Forge-Rezepte (mithril-Kategorie,
  Lv38-42, mithril_bar-Input) + `mithril_set` (4 Teile, ab 3 → +18 Def/+60 HP/+9 Nah/+2% Krit). Eine Stufe über Steel,
  rarity rare. Forge-XP/h auf Zielkurve (~4,3–5k), wiring-audit/set-bonus/content-integrity grün. Grün: 152 Engine +
  7 Persistenz, typecheck 5/5, build, Sim 0 Auffälligkeiten. → Folge: weitere Tiers (Adamantium/Runite-Gear) + Notif-Politur.

- **Iter 29 (~18:02): CONTENT — Adamantium- & Runit-Gear-Tiers.** Muster von Mithril gespiegelt: je 5 Items + 5 Forge-Rezepte
  + Set. Adamantium (rare, Lv48-52, Blade +48 Nah/+5% Krit, Set +24Def/+80HP/+12Nah/+3%Krit); Runit (epic, Lv58-62,
  Warblade +60 Nah/+6% Krit/Blutung, Set +32Def/+110HP/+16Nah/+3%Krit/+10%KritDmg). Damit haben Smithing-Kategorien
  Copper→Runite jetzt vollständiges Gear (offen: bloodiron/titanium/aetherium/godiron). Grün: 152 Engine + 7 Persistenz,
  typecheck 5/5, build, Sim 0 Auffälligkeiten (wiring-audit/set-bonus/content-integrity decken die neuen Items ab).
  → Nächster Tick: Notification-Politur (Achievement-Toast) — Strang wechseln.

- **Iter 30 (~18:10): NOTIFICATION-POLITUR — Achievement-Toast.** Toasts-System um neu freigeschaltete Achievements
  erweitert (Snapshot um `achievements: Set` ergänzt, Diff pro Tick → Toast mit Achievement-Icon/Name, lila Akzent).
  Deckung jetzt: Level-up / Gesamtlevel / seltener Fund / Meilenstein. Client-only, +1 i18n-Key en+de (toast.achievement),
  CSS-Akzent. Grün: typecheck 5/5 (i18n-Parität bestätigt), build. → Folge weiter abwechselnd Content/Politur.

- **Iter 31 (~18:15): CONTENT — Bloodiron- & Titanium-Gear.** Je 5 Items + 5 Forge + Set. Bloodiron (epic, Lv68-72,
  Reaver +74 Nah/starke Blutung, Set +42Def/+145HP/+22Nah); Titanium (legendary, Lv83-87, Großklinge +90 Nah/+20%KritDmg,
  Set +56Def/+185HP/+28Nah). Offen nur noch Aetherium/Godiron. Grün: 152 Engine + 7 Persistenz, typecheck 5/5, build,
  Sim 0 Auffälligkeiten. → Nächster Content-Tick: Aetherium+Godiron (Smithing-Gear dann komplett).

- **Iter 32 (~18:23): CONTENT — Aetherium- & Godiron-Gear (Metallleiter-Gear KOMPLETT).** Je 5 Items + 5 Forge + Set.
  Aetherium (legendary, Lv91-94, Edge +108 Nah/Brand, Set +70Def/+230HP/+34Nah); Godiron (legendary Endstufe, Lv100-105,
  Weltspalter +132 Nah/+30%KritDmg/starke Blutung, Set +88Def/+300HP/+42Nah). **Smithing-Gear nun für alle Haupt-Tiers
  Copper→Godiron vollständig** (Waffe+4 Rüstung+Set je Tier). Einziger Rest: Blacksteel (Zwischenlegierung Lv30, nur Smelt)
  — optional. Forge-XP/h auf Endgame-Kurve. Grün: 152 Engine + 7 Persistenz, typecheck 5/5, build, Sim 0 Auffälligkeiten.
  → Strang wechseln: Notification/Politur oder neue Mechanik.

- **Iter 33 (~18:31): BALANCE/CONTENT — Fernkampf auf Endgame-Parität.** Gap erkannt: Melee-Gear ging bis +132 (Lv105),
  aber Fernkampf stoppte bei +30 (Lv30) / Magie bei +34 → „3 Stile" gebrochen. Fix Teil 1: 3 Endgame-Bögen via Fletching
  (Komposit aus Holz+Sehne+Barren, verzahnt Fletching↔Smithing): composite_warbow (Lv40, +50, mithril_arrow),
  runed_longbow (Lv60, +80/Blutung, runite_arrow), godwood_bow (Lv88, +116/Blutung, runite_arrow). + 3 Fletch-Rezepte.
  Fernkampf hat strukturell +Krit/+Tempo → etwas weniger Rohschaden als Melee ist gewollt. Grün: 42 Test-Files,
  typecheck 5/5, build, Sim 0 Auffälligkeiten. → NÄCHSTER Tick: Magie-Stäbe auf Parität (Fix Teil 2).

## Backlog (priorisiert)
- [ ] **Balance-Pass P0** (groß, Hot-File): zentrale xp-Absenkung je Aktion gemäß Formel; Thieving-XP-Nerf;
  Sammel/Verarbeitung. Danach Combat-`monster.xp` + Frühgame-Gold halbieren. (Mache ich selbst, sequnone.)
- [ ] **Kampf-Zonen-Navigation (UI):** CombatPage → erst Zone wählen (Kacheln „Weiden/Grenzlande/…"), dann Gegner;
  Zone-Lore/Beute-Übersicht. (Client-only → Agent möglich.)
- [ ] **Set-Boni:** komplettes Metall-Set angelegt → Bonus (skaliert über alle Tiers). (Engine + content.)
- [x] **Fletching-Kette fertig** (Iter 6): Pfeilspitzen (+Feder+Schaft) → Pfeile je Tier; Ranged-Munition + ammoDamage verdrahtet.
- [x] **Edelstein-Schleifen → Schmuck** (Iter 7): jewelcrafting-Skill, 4 Gems geschliffen, 8 Schmuckstücke, Ring-Routing.
- [~] **Mehr lebendige Zonen** mit Skill-Verzahnung: Küste/Fische erledigt (Iter 8). Offen: Wald (Holz/Kräuter/Wild), Mine-Tiefe.
- [x] **Mastery pro Aktion** (Iter 9): eigene Mastery-Spur je Aktion, Doppel-Ertrag-Bonus, UI-Anzeige, SAVE_VERSION 16.
- [x] **Mastery-Übersicht** (Iter 12): read-only Aggregat-Seite mit Gesamt-Meisterschaft + Perks je Aktion.
- [x] **Wildwald-Zone** (Iter 13): Wild/Raubtiere Lv12–45, Mittelgame-Leder-/Fleisch-Versorgung.
- [x] **Reißzahn-Crafting-Kette** (Iter 14): fang → Raubzahnkette (offensives Früh-Amulett).
- [ ] **Bestiarium-/Asset-Status prüfen** oder **diskrete Mastery-Meilenstein-Perks**. ← NÄCHSTES
- [ ] **Mastery pro Aktion** (Langzeitziele) — optional/später.
- [ ] **Asset-Downscale-Pipeline** (Icons ~2 MB → ~20 KB) — Quick Win.
- [ ] UI-Politur laufend (eigener Agent).
