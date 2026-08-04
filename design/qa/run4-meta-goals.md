# QA Run 4 — Meta-Goals & Long-Term Motivation (nach Fixes)

**Playtester:** read-only Daten-Audit + temporäres Sim-Harness (Content live transpiliert & gegen Engine-Logik geprüft; Harness danach entfernt)
**Datum:** 2026-06-27
**Fokus:** Achievements (inkl. 15 neue Endgame-Mob-Kill-Achievements), Sets (inkl. neue ember_robe/voidhide/voidweave), Pets, Total-Level-Ziele, 1k-Kill-Achievements, Dungeons, tote Referenzen. „Genug zum Jagen über die XP-Bar hinaus?"

## Fun-Score: 8 / 10

Die Meta-Goal-Schicht ist breit, sauber verdrahtet und **frei von toten Referenzen**. Die in Run 3 als P1/P2 markierten Endgame-Lücken sind durch die neuen Mobs und L99-Sets **konkret geschlossen** — und zwar korrekt verkabelt, nicht nur als Daten-Attrappe. Was die 8 von der 9 trennt, sind reine **Vollständigkeits-Inkonsistenzen** für Completionists: der komplette 19-Mob-Slayer-Turm-Bestiarium, 2 verwaiste Hochland-Mobs und die 21-Pet-Sammlung haben *kein* Achievement-Pendant, und es fehlt ein „alles-max"-Schlussstein. Nichts davon ist kaputt — es sind fehlende Belohnungs-Haken auf bereits existierendem Content.

---

## Daten-Snapshot (echter Katalog, via Harness gezählt)

- 21 Skills · **805 Items** · **84 Monster** · 679 Actions · 11 Zonen · **6 Dungeons** · **27 Sets** · **21 Pets** · **466 Achievements** · 88 Quests
- Achievement-Bedingungstypen: total_level 6 · skill_level 200 · total_kills 6 · **monster_kills 204** · dungeons_cleared 21 · items_gathered 4 · items_crafted 4 · gold_reached 5 · gold_spent 4 · quests_completed 4 · daily_streak 4 · items_discovered 4
- monster_kills-Schwellen: **15× „1" (Erstkill, Bosse) · 63× 10 · 63× 100 · 63× 1000** → 63 Mobs mit voller 10/100/1000-Jagdkette.

## Verifizierte Fixes (was seit Run 3 funktioniert)

1. **Die 15 neuen Endgame-Mob-Kill-Achievements sind korrekt verdrahtet** — und jagdbar. 5 neue Mobs × [10/100/1000]:
   - `gravecliff_specter` L87 (highlands) · `voidhusk_crusher` L90 (slagpit) · `abyssal_tide_serpent` L96 (coast) · `charred_doomknight` L101 (slagpit) · `void_titan` L110 (highlands).
   - Alle 5 haben gültige `monster_kills`-Targets **und** echte Zonen-Platzierung (je 5 Code-Refs = Def + 3 Achievements + Zone). Kein unerreichbares Achievement.
2. **Run-3-P1 (Combat-XP trichtert auf 4 Mobs in 1 Zone) ist entschärft.** Das L85–115-Open-World-Band hat jetzt **8 Mobs über 4 Zonen** (highlands, slagpit, coast, idolhall) statt 4 in einer Zone. Der L84→L92-Vakuum-Sprung ist mit L87/L90 überbrückt.
3. **Run-3-P2 (nur Melee hat L99-Rüstung) ist gefixt.** Die neuen Sets liefern Stil-Parität an der Decke:
   - **`voidhide_set`** (Fernkampf, L99-Leder): evasion 30 / rangedDamage 18 / crit 0.04 / critDmg 0.18 — spiegelt Godiron für Ranged.
   - **`voidweave_set`** (Magie, L99-Ornat, craft leatherworking 99, xp 1111): magicDamage 36 / accuracy 22 / crit 0.05 / critDmg 0.20 — L99-Magier-Set.
   - **`ember_robe_set`** (Magie, Mid-Tier ~L30–32): magicDamage 14 / accuracy 10 / crit 0.02 — schließt die Lücke frost(10)→aether(18). Magic-Set-Bonus-Leiter ist jetzt monoton: 10→14→18→22→26→28→36.
4. **0 tote Referenzen.** Harness-Cross-Check: kein Set-Piece, kein `items_crafted`-Target, kein `monster_kills`-/`skill_level`-/`dungeons_cleared`-Target zeigt ins Leere. **Keine entfernten Enchant-*Items* in Sets/Achievements.** (Die noch vorhandenen `enchant_*`-Einträge sind Waffen-*Crafting-Actions*, keine entfernten Item-IDs — korrekt.) Achievements netto +5 vs Run 3 trotz +15 Kill-Achievements ⇒ ~10 Alt-Achievements (vermutlich Enchant-bezogen) wurden mitentfernt. Sauber.
5. **Dungeons vollständig & verkabelt.** 6 Dungeons mit Req-Ladder 12/30/34/65/82/99, je keyItem, Encounter-Liste, Loot, XP/Gold. Alle 6 Dungeon-IDs haben je 1/10/50-Clear-Achievements + 3 Gesamt-Stufen (5/25/100). Keine Geister-Dungeons.
6. **Pets: 21, alle gültig.** 14 Skill-Pets (13 Skills, runecrafting hat 2: glyphmaw+vellumoth) + 7 Combat-Pets. Alle `dropChance > 0`, alle Skill-Quellen gültig. Kein defektes Pet.

---

## Findings

### [P0] — keine
Keine blockierenden Meta-Goal-Defekte. Alle geprüften Targets auflösbar, keine toten Referenzen, neue Inhalte erreichbar.

### [P1] — keine
Die Run-3-P1-Endgame-Lücken sind in dieser Domäne geschlossen (siehe Fixes 1–3).

### [P2] Slayer-Turm-Bestiarium (19 Mobs) hat NULL Kill-Achievements
Von 84 Monstern haben 63 eine Kill-Achievement-Kette — aber **die komplette Slayer-Turm-Riege (19 Mobs, L3 `rot_rat` … L96 `abyssal_devourer`)** hat keine einzige. Slayer ist laut Run 3 ein zentrales Endgame-Meta-Goal; trotzdem zahlt das Bekämpfen seiner exklusiven Mobs nichts auf die Achievement-Jagd ein. Für einen Completionist ist das eine spürbare Leerstelle (25 % aller Mobs „unbelohnt").
**Fix:** Mindestens den namhaften Slayer-Bossen (`soul_flayer` L86, `void_herald` L90, `dread_knight` L82, `bone_colossus` L76, `abyssal_devourer` L96) je eine 10/100-Kill-Achievement geben. 1000er bewusst weglassen, da Slayer-Mobs task-RNG-gegated sind — eine reine Slayer-„Bestiary"-Achievement-Reihe (z. B. „X Slayer-Arten erlegt") wäre die elegantere Variante.

### [P2] Zwei verwaiste Open-World-Hochland-Mobs ohne Kill-Achievement
`highland_wyvern` (L79) und `roc_void` (L84) sind ganz normale Open-World-Highlands-Mobs (nicht Slayer-gegated), aber als einzige ihrer Zone **ohne** Kill-Achievement — während Zonen-Nachbarn `roc_elder`/`roc_storm`/`gravecliff_specter`/`void_titan` welche haben. Klarer Konsistenz-Bruch, nicht beabsichtigt wirkend.
**Fix:** Beide auf das Standard-[1/10/100/1000]- bzw. [10/100/1000]-Schema heben.

### [P2] Pet-Vollsammlung (21 Pets) ist achievement-technisch unsichtbar
`AchievementCondition` kennt keinen `pets_owned`-Typ; Pets sind keine Items und fallen daher auch nicht unter `items_discovered`. Ergebnis: Das Sammeln aller 21 Pets — eine der besten Langzeit-Sammeljagden des Spiels — hat **kein** Achievement, weder pro Pet noch als „Alle 21". Das ist genau die Art Sammel-Ziel, die ein Meta-Goal-Spieler erwartet.
**Fix:** Neuen Condition-Typ `pets_owned` (Muster wie `dungeons_cleared` ohne Target = Gesamtzahl) + 2–3 Achievements (z. B. 5 / 12 / 21 Pets „Zoomeister"). Engine-seitig billig: `ownedPetCount` existiert bereits in pets.ts.

### [P3] Kein „alles-max"-Schlussstein über Total-Level 1500 hinaus
Höchstes Skilling-Meta-Goal ist `ach_total_level_1500` (Eternal Scholar). Das echte Completionist-Maximum sind **21 × 99 = 2079**. Zwischen 1500 und 2079 (das volle End-Drittel des Skillings) gibt es kein Ziel mehr.
**Fix:** `ach_total_level_2079` „True Max / Vollender" (legendary) als finaler Schlussstein. Ein Halbschritt bei 1800 wäre optional sinnvoll.

### [P3] ember_robe-Crafts geben absurd niedrige XP (wahrscheinlich Tippfehler)
`craft_ember_robe_hood/legs/body` (leatherworking L30–32) geben **15 / 17 / 18 XP** — Größenordnungen unter dem Tier-Niveau (voidhide/voidweave L99 geben 667–1111). Tangential zur Meta-Goal-Domäne, aber es entwertet das Crafting der Set-Teile als Skilling-Ziel und sieht nach Copy-Paste-Fehler aus (vermutlich 150/170/180 gemeint). Nebenbei: die Rezepte verlangen `aether_rune` als Zutat auf L32 — Material-Tier passt nicht zum Level.
**Fix:** XP an die Tier-Kurve angleichen; Zutaten-Tier prüfen. (An content-dev/balance weiterreichen — außerhalb Read-only-Scope.)

---

## Δ vs Run 3

| Aspekt | Run 3 (endgame) | Run 4 (meta-goals) |
|---|---|---|
| Fun (Endgame/Meta-Lens) | 7/10 | **8/10** |
| Combat-Variety L85–115 | P1: 4 Mobs / 1 Zone, L84→92-Vakuum | **gelöst** — 8 Mobs / 4 Zonen, Lücke überbrückt |
| L99-Rüstungs-Parität | P2: nur Melee (Godiron) | **gelöst** — voidhide (Ranged) + voidweave (Magie) L99 |
| Neue Endgame-Mob-Kill-Achievements | — | **15 korrekt verdrahtet & jagdbar** |
| Tote Referenzen / Enchant-Reste | (nicht im Fokus) | **0** — sauber, ~10 Alt-Achievements mitentfernt |
| Sets | 24 | **27** (+ember/voidhide/voidweave, Bonus-Leitern monoton) |
| Slayer-Bestiarium-Achievements | (nicht geprüft) | **neu als P2**: 19 Mobs unbelohnt |
| Pet-Sammel-Achievement | (nicht geprüft) | **neu als P2**: 21 Pets unbelohnt |

**Netto:** Die hochwertigen Run-3-Endgame-P1/P2 sind in der Meta-Goal-Domäne erledigt und korrekt umgesetzt (+1 Fun). Neu aufgedeckt sind drei *additive* Completionist-Lücken (Slayer-Bestiarium, Pet-Sammlung, 2079-Schlussstein) — alles „fehlende Belohnung auf vorhandenem Content", keine Defekte. Schließen davon → 9/10.

## Verdikt
Genug zum Jagen über die XP-Bar hinaus: **ja, deutlich.** 466 Achievements, 27 Sets, 21 Pets, 6 Dungeons mit klarer Req-Leiter, 63 Tausender-Kill-Grinds, Total-Level-Stufen bis 1500 — alles referenz-sauber und erreichbar. Die offenen Punkte sind Konsistenz/Vollständigkeit (Slayer + Pets + Max-Cap belohnen), nicht Substanz.
