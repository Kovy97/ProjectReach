# Grim Reach — Steam Store Copy 1.4.0 (EN, Chef-Auftrag 25.10.2026)

<!-- claude:2026-10-25T10:19:00+01:00 -->

Ersetzt `steam-store-copy-1.2.0.md` (bleibt als Archiv liegen). Chef-Vorgabe: weniger Story, faktische Gameplay-Elemente,
auf einen Blick lesbar. Jeder Abschnitt = kurze Überschrift + Panel + 3–4 Stichpunkte. Kein Early-Access- und kein
Update-Bezug, Taverne nicht beworben (`TAVERN_ENABLED = false`).

Zahlen geprüft am 25.10.2026 gegen `apps/client/trailer-stage/src/v4/data.json` und direkt im Content
(`packages/content/src/**`, `packages/shared/src/index.ts`): 23 Skills (7 Sammeln, 8 Handwerk, 8 Kampf), 789 Rezepte,
869 Ausrüstungsteile, 42 Sets, 26 Verzauberungen, 29 Suffixe, 120 Monster, 29 Champions, 11 Gebiete, 9 Dungeons,
Raid mit 5 Hallen und 3 Stufen, 31 Raid-Teile in 3 Sets, 23 Begleiter (16 aus Skills, 7 aus dem Kampf, 5 Kampfrollen,
Echo 25 %), 125 Aufgaben, 363 Erfolge, 4 Völker × 30 Archetypen × 2 = 240 Porträts, 3 Ausrüstungs-Kits, 8 Slayer-Etagen,
Paragonturm 5.000 Etagen (`PARAGON_MAX_FLOOR`), 7 Magie-Elemente (`magicTheme`), Offline-Deckel 8 h (`MAX_OFFLINE_MS`),
Autosave 5 s, New Haven 15 baubare Gebäude à 3 Stufen (16 im Content, Taverne gesperrt), 7 Sprachen.

Panels: `design/steam-store-panels-1.4.0/panel_01…07.png` (1170 × 570, gemalter Stil). Die `[img]`-Zeilen sind
Platzhalter, Einpflege-Anleitung ganz unten.

---

## Short Description (≤ 300 Zeichen, aktuell 258)

A dark-fantasy idle RPG. Train 23 skills that feed each other, auto-battle with melee, ranged or magic, hunt 120 monsters in 11 zones and 9 dungeons, then take on a five-hall raid. Queue hours of work, log off and come back to progress. No microtransactions.

---

## About This Game (Steam BBCode)

[h2]23 skills, one queue[/h2]
[img]panel_01_skills.png[/img]
[list]
[*]7 gathering, 8 crafting and 8 combat skills, each up to level 99
[*]750+ recipes that feed each other. Ore becomes bars, bars become blades, hides and cloth become armour
[*]Line up hours of work in a single queue and log off. Every action builds its own mastery
[*]Random events while you work, and customers who bring work orders for gold and XP
[/list]

[h2]Your weapon picks the fight[/h2]
[img]panel_02_combat.png[/img]
[list]
[*]Melee, ranged or magic. Your weapon sets the style, and combat runs by itself with auto-attack and auto-eat
[*]Armour comes as plate (damage reduction), leather (evasion) or cloth (a ward that absorbs hits)
[*]Staves and wands carry one of seven elements, each with its own status effect
[*]850+ gear pieces, 42 sets, 26 enchantments and 29 random suffixes
[/list]

[h2]11 zones, 9 dungeons, 120 monsters[/h2]
[img]panel_03_world.png[/img]
[list]
[*]29 Champions, each with its own unique drop
[*]Dungeons run wave after wave and go into the queue like any other job
[*]Slayer tasks, an 8-floor Slayer tower and a Paragon tower with 5,000 floors
[*]125 quests and 350+ achievements
[/list]

[h2]23 companions[/h2]
[img]panel_04_companions.png[/img]
[list]
[*]Every companion boosts its own skill and has a real move in combat: control, protection, damage, loot or support
[*]16 drop while skilling, 7 in combat
[*]Each companion you own gives a quarter of its skill bonus, even when it is not equipped
[/list]

[h2]Raid: Halls of Gobkha'raz[/h2]
[img]panel_05_raid.png[/img]
[list]
[*]5 halls with four waves and a boss each. Bosses change phase at 75, 50 and 25% health
[*]Normal, Heroic and Mythic difficulty, a new modifier every week and a weekly chest per boss
[*]31 raid pieces in three versions, with one set each for melee, ranged and magic
[*]Raid runs work in the queue and offline
[/list]

[h2]Human, Elf, Orc, Goblin[/h2]
[img]panel_06_heroes.png[/img]
[list]
[*]4 races and 240 painted portraits. Every race can learn every skill and every combat style
[*]The Slayer's Book, a talent tree of permanent upgrades for your hunt
[*]The Cinderfall prestige: restart your character for Scars, permanent bonuses that speed up every new run. Companions, mastery and achievements stay
[*]3 equipment kits per character to swap your loadout between fights
[/list]

[h2]Made for idle time[/h2]
[img]panel_07_idle.png[/img]
[list]
[*]Up to 8 hours of offline progress for skills, combat, traps and buildings, with a report when you come back
[*]New Haven: 15 buildings with 3 tiers each that turn raw goods into finished ones on their own
[*]No microtransactions and no energy system
[*]7 languages: English, Deutsch, 简体中文, Русский, Español, Português (BR), Français
[/list]

---

## Einpflege-Anleitung (Steamworks → Store-Seite bearbeiten → Beschreibung)

1. **Short Description** oben 1:1 in „Kurzbeschreibung“ einsetzen (258 Zeichen).
2. Unter „Bilder für die Beschreibung“ die sieben PNGs aus `design/steam-store-panels-1.4.0/` hochladen.
3. Den BBCode-Block „About This Game“ einsetzen und jede `[img]panel_….png[/img]`-Zeile durch die Zeile ersetzen,
   die Steamworks für das hochgeladene Bild anbietet:

   | Platzhalter | Bilddatei | Inhalt |
   |---|---|---|
   | `[img]panel_01_skills.png[/img]` | `panel_01_skills.png` | 23 Skill-Icons in drei Reihen, „23 skills, one queue.“ |
   | `[img]panel_02_combat.png[/img]` | `panel_02_combat.png` | Drei Kampfstile mit drei Völkern, Ausrüstungszahlen |
   | `[img]panel_03_world.png[/img]` | `panel_03_world.png` | Gebiete/Dungeons/Monster/Champions, Türme |
   | `[img]panel_04_companions.png[/img]` | `panel_04_companions.png` | 23 Begleiter, fünf Kampfrollen |
   | `[img]panel_05_raid.png[/img]` | `panel_05_raid.png` | Raid Hallen von Gobkha'raz, Normal/Heroisch/Mythisch |
   | `[img]panel_06_heroes.png[/img]` | `panel_06_heroes.png` | Vier Völker, Talentbäume, Prestige, Erfolge |
   | `[img]panel_07_idle.png[/img]` | `panel_07_idle.png` | Offline-Fortschritt, Queue, New Haven, gemaltes Logo |

4. Die sieben alten 1.2.0-Panels (`panel_05_races`, `panel_06_newhaven` u. a.) aus der Beschreibung nehmen: alte
   Zahlen (22 Skills, 110 Kreaturen, 10 Gebiete, 7 Dungeons, 36 Sets).
5. Laut Einpflege-Notiz 1.2.0 zeigt Steam Beschreibungsbilder mit 616 px Breite; die Panels sind 1170 px breit und
   werden scharf verkleinert, Text ist auf diese Größe ausgelegt. Die sieben PNGs zusammen ≈ 7,2 MB.
6. Tags unverändert lassen („Idle“, „Clicker“ behalten, „Story Rich“ nicht setzen).
