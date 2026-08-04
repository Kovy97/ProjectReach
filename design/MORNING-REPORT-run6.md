# Morgenbericht — Nacht-Loop 2026-06-28 (CEO)

## TL;DR
Drei volle 21–22-Tester-Sweeps + 5 Fix-Runden über Nacht. **Spaß-Schnitt 7,7 → 8,25 → 8,76** (run4→5→6), stetig +0,5/Runde. **Kein P0, 0 Walls, 0 Tode** über alle Builds; voller Stand grün (Engine 415/415, Persistenz 49/49, Sim AUFFÄLLIGKEITEN 0, Client-Build 997 Module, packbar als v0.1.0). **1 Persona ≥9,5** (Farming 9,75); der Rest 8,0–9,4. Das **Ziel „alle ≥9,5" ist noch NICHT erreicht** — die letzte Meile hängt an 4 Entscheidungen, die dir gehören (unten).

## Über Nacht gebaut & verifiziert
- **3-Stil-Parität** (4 Runden): Strukturursache („nur Roben tragen Offense") gelöst; manaCost-Cap (Magie-Mana-Falle weg), Platten-meleeDamage-Backbone, Ranged-Trim, 2H-Buff (2H kein Trap mehr), godspark/voidweave-Tuning. Spread von ~2× (run4) auf ~±15–25% (run6).
- **Slayer Phase 2**: slayer_helm, Gear-Set (Vambraces/Greaves/Amulet + Set-Bonus), 4 tote Boss-Drops jetzt in Rezepten, Punkte-Shop 975→10.475 Pkt.
- **Suffix-System sichtbar gemacht**: Tooltip-Stat-Zeilen + Grid-Badge + „Verzaubertes Item!"-Drop-Toast (Craft+Drop aktiv).
- **Datenverlust-P1 behoben**: Instanz-Drops bei vollem Inventar → Gear-Vault statt stumm vernichtet; Auto-Salvage-Footgun entschärft (Qualitätsfilter).
- **Frühspiel**: Starter-Kit (Köcher 150, 3× Saat, Food 20 → 0 Tode), Onboarding-Light-Hinweise, Suffix-Drop-Toast.
- **Komfort/Politur**: Alle-Plots-bepflanzen-Button, item_scrap-/cut_gemstone-Senken, str-in-Platte, total-level-Capstones, pets_5, Reed-Gates, Crop-Ökonomie, Combo-Food-Parität, Endgame-Mobs L84–110, ironhide-L60-Tier.
- **Infra**: GEARED_HERO-Sim repariert (kämpfte nackt → jetzt echtes Godiron, erstmals echte Endgame-Wall-Daten); EA-Packaging (electron-builder Windows, v0.1.0, About-Screen).

## Run-6-Scorecard (22 Personas)
**9,0+ (großteils nur Asset-/Mini-Politur zu 9,5):** Farming **9,75** · Smithing/Jewel 9,4 · Slayer 9,3 · Gather-MWF 9,3 · Crafting-FRL 9,3 · UX/UI 9,0 · Enchant 9,0 · Cooking 9,0 · Save 9,0 · Meta 9,0 · Idle 9,0 · Combat-Status 9,0
**8,5:** Endgame · Combat-Magie · Late-Mid · Progression
**8,0:** Early-Mid · Mid · Combat-Ranged · Combat-Melee · Economy · (Early 8,7)

## Was ≥9,5-überall blockiert — DEINE Entscheidungen
1. **Auto-Eat maskiert Verteidigung (der große Combat-Deckel).** Wegen Auto-Eat T3 = **0 Tode immer** → def/hp/Evasion sind faktisch egal → Stile haben keine Survival-Identität (Glass-Cannon zahnlos). Mehrere Combat-Personas (Ranged/Status/Mid) clustern deshalb bei 8,0–9,0. **Entscheidung:** Soll Tod eine echte Gefahr sein (weniger nachsichtiges Auto-Eat → Verteidigung zählt) oder bleibt der idle-freundliche 0-Tode-Komfort? Reiner Zahlen-Fix reicht hier nicht.
2. **Economy = City-gedeckelt (~8,0).** Gold ist über das Endgame inert; mitwachsende Gold-Senke + wiederkehrende Slayer-Punkte-Senke = die deferrte **City-Welle**. Ohne City ehrlich nicht über ~8,5. (Wie von dir entschieden — nur zur Bestätigung.)
3. **Endgame ist Faceroll + ohne Quest-Bogen.** Capstone fällt in ~2,4 s, keine echte Wall, und **0 Quests zielen aufs Endgame** → hintere Spielhälfte „nächstes-Ziel"-still. Für 9,5 bräuchte es einen **echten Endgame-Gipfel/Wall** + einen **Endgame-Quest-Bogen** (beides eigene Features, kein Tweak).
4. **Parität ist asymptotisch.** R5 läuft gerade (fixt die str-Doppelzählung = Hauptüberkorrektur). Damit sollten die Combat-Bänder Richtung 8,5–9,0 ziehen — aber perfekte ±10% auf JEDEM Level-Band für ALLE 3 Stile ist ein Dauer-Feintuning-Ziel, das Live-EA-Tuning verträgt.

## Aktuell in flight (R5)
- **balance-designer R5**: str-Doppelzählung auflösen (eine Quelle statt Platte+smithing) + godspark zurücknehmen + Ranged-Endgame + Greatsword-Crit entstranden.
- **content-dev P2-Batch**: runite-md, murkvein_bar-Senke, raw_venison, ember-XP, 2079-Capstone+Rename, Slayer-∞-Punkte-Sink+abyssal_core-Preis, Holz-Dips, flame-Symmetrie, ironhide-Offense, witherleek-Trio, Suffix-Früh-Drop.
- **logic-dev**: sets_completed-Typ, Offline-Popup zählt Vault, Auto-Salvage schützt Top-Rolls, toter Frost-Test repariert.

## Empfehlung
Das Spiel ist in **starker, EA-tauglicher Verfassung** (8,76, keine Blocker, alle Systeme grün, packbar). Die verbleibende Lücke zu „9,5 überall" ist **Politur + die 4 Entscheidungen oben** — keine Substanz-Löcher. Mein Vorschlag: (a) R5 + P2-Batch landen lassen (zieht die 9,0er auf ~9,5), (b) du entscheidest #1 (Auto-Eat/Defense) und #3 (Endgame-Gipfel/Quests) — das sind die zwei echten Hebel für die Combat-/Endgame-Personas — und (c) parallel dein Steam-/Icon-Track (UX-Politur ist art-gated). Damit ist eine 0.1 „voll poliert" in Reichweite.

*Volle Einzelreports: `design/qa/run6-*.md`. Vorgänger: `design/qa/run5-SUMMARY.md`, `run5-*`, `run4-*`.*
