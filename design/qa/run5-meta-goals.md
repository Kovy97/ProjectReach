# QA Run 5 — Meta-Goals & Long-Term Motivation (nach Run-4-P2-Fixes)

**Playtester:** read-only Daten-Audit + temporäres Sim-Harness (Content live transpiliert & gegen Engine-Logik geprüft; Harness danach entfernt)
**Datum:** 2026-06-28
**Fokus:** Schließen der drei Run-4-P2-Completionist-Lücken — (a) Slayer-Turm-Bestiarium, (b) 2 verwaiste Hochland-Mobs, (c) Pet-Vollsammlung via neuem `pets_owned`-Condition-Typ. Plus: tote Referenzen, Set-/Pet-Integrität, Total-Level-Schlussstein. „Belohnt das Spiel jetzt auch das letzte Viertel des Sammel-Contents?"

## Fun-Score: 9 / 10

Run 4 hatte exakt prophezeit: „Schließen der drei P2 → 9/10." Genau das ist passiert — und zwar **korrekt engine-verdrahtet, nicht als Daten-Attrappe**. Alle 84 Monster (inkl. der kompletten 19-Mob-Slayer-Turm-Riege und der beiden Hochland-Waisen) haben jetzt volle Kill-Achievement-Ketten, der neue `pets_owned`-Typ ist im Type-System **und** in `achievementProgress()` real ausgewertet, und der Katalog bleibt bei **0 toten Referenzen**. Was die 9 von der 9,5 trennt, ist genau **ein** fehlender Meta-Haken: der „alles-max"-Schlussstein (Total-Level 2079). Das ist der einzige verbliebene substanzielle Sammel-Endpunkt — alles andere ist Feinpolitur.

---

## Daten-Snapshot (echter Katalog, via Harness gezählt)

- 21 Skills · **813 Items** · **84 Monster** · 688 Actions · 11 Zonen · **6 Dungeons** · **28 Sets** · **21 Pets** · **531 Achievements** · 88 Quests
- Achievement-Bedingungstypen: total_level 6 · skill_level 200 · total_kills 6 · **monster_kills 267** · dungeons_cleared 21 · items_gathered 4 · items_crafted 4 · gold_reached 5 · gold_spent 4 · quests_completed 4 · daily_streak 4 · items_discovered 4 · **pets_owned 2 (NEU)**
- monster_kills-Schwellen: **15× „1" (Erstkill/Bosse) · 84× 10 · 84× 100 · 84× 1000** → **alle 84 Mobs** mit voller 10/100/1000-Jagdkette (Run 4: 63).

## Verifizierte Fixes (was seit Run 4 funktioniert)

1. **Run-4-P2 (Slayer-Turm-Bestiarium) ist vollständig geschlossen.** Die komplette `slayer_tower`-Zone (19 Mobs, `rot_rat` L3 … `abyssal_devourer` L96 — inkl. der namhaften Bosse `bone_colossus` L76, `dread_knight` L82, `soul_flayer` L86, `void_herald` L90) hat jetzt durchgängig `[10/100/1000]`-Ketten. Keine 1000er-Übertreibung wurde vermieden — die volle Kette ist da; akzeptabel, da Turm-Mobs zwar task-gegated, aber dauerhaft farmbar sind.
2. **Run-4-P2 (2 verwaiste Hochland-Mobs) ist geschlossen.** `highland_wyvern` (L79) und `roc_void` (L84) haben jetzt `[10/100/1000]` — konsistent mit ihren Zonen-Nachbarn. Kein Konsistenz-Bruch mehr in den Highlands.
3. **Run-4-P2 (Pet-Vollsammlung) ist geschlossen — und echt verdrahtet.** Neuer Condition-Typ `pets_owned` ist (a) in `shared` (`AchievementConditionType`) deklariert und (b) in `engine/achievements.ts` real ausgewertet: `achievementProgress` zählt `Object.keys(state.character.ownedPets).length`. Zwei Achievements hängen dran: `ach_pets_10` („Tierfreund", rare, 10 Pets) und `ach_pets_all` („Bestienmeister", legendary, alle 21). Die 21-Pet-Sammeljagd zahlt jetzt aufs Meta-Ziel ein. **Kein Daten-Dummy** — die Engine-Funktion ist getestet vorhanden, nicht nur der Typ.
4. **0 tote Referenzen.** Harness-Cross-Check über den gewachsenen Katalog: kein Set-Piece (28 Sets), kein `monster_kills`-/`skill_level`-/`dungeons_cleared`-/`items_crafted`-Target zeigt ins Leere. Die +65 Achievements (63 monster_kills + 2 pets_owned) sind alle auflösbar und erreichbar.
5. **Netto-Bilanz exakt plausibel.** Achievements 466 → 531 (**+65** = 63 neue Mob-Ketten + 2 Pet). monster_kills 204 → 267 (**+63**). „Monster mit Kill-Achievement" 63 → **84/84**. Kein Achievement-Schwund, keine Doppelung.
6. **Pets weiterhin alle gültig (21).** 14 Skill-Pets (runecrafting hat 2: glyphmaw+vellumoth) + 7 Combat-Pets, alle `dropChance > 0`, alle Quellen gültig. `ach_pets_all`=21 deckt sich exakt mit dem Pet-Katalog.

---

## Findings

### [P0] — keine
Keine blockierenden Meta-Goal-Defekte. Alle Targets auflösbar, 0 tote Referenzen, neue Inhalte erreichbar.

### [P1] — keine
Die drei hochwertigen Run-4-P2-Completionist-Lücken sind in dieser Domäne erledigt (siehe Fixes 1–3).

### [P2] Kein „alles-max"-Schlussstein über Total-Level 1500 (aus Run-4-P3 hochgestuft)
Höchstes Skilling-Meta-Goal bleibt `ach_total_level_1500` (legendary). Das echte Completionist-Maximum sind **21 × 99 = 2079**. Zwischen 1500 und 2079 — das **gesamte letzte Drittel** des Skillings — gibt es kein Ziel mehr. Run 4 führte das als P3; jetzt, wo alle anderen P2 geschlossen sind, ist dies **der** verbliebene substanzielle Meta-Haken und damit der konkrete Blocker auf dem Weg zur 9,5. Aufwand: minimal (ein Achievement).
**Fix:** `ach_total_level_2079` „True Max / Vollender" (legendary) als finaler Schlussstein; ein Halbschritt `ach_total_level_1800` (epic) glättet die heute große 1000→1500-(Ende)-Lücke. (An content-dev — außerhalb Read-only-Scope.)

### [P3] Erstes Pet-Achievement erst bei 10/21 — Sammel-Reise früh unbelohnt
Die zwei `pets_owned`-Achievements sind 10 und 21. Das erste Etappenziel fällt damit erst bei knapp der **Hälfte** der Sammlung — die frühe Pet-Jagd (1.–9. Pet, RNG-zäh bei dropChance ~1e-5) zahlt zunächst gar nichts aufs Meta-Ziel ein. Run 4 hatte 5/12/21 vorgeschlagen.
**Fix:** Ein frühes `ach_pets_5` (uncommon) ergänzen → 5/10/21. Reine Belohnungs-Kurve, kein neuer Mechanismus.

### [P3] `pets_owned`-Engine zählt rohe `ownedPets`-Keys, Doku sagt „nur Content-Pets"
Der Doc-Kommentar in `shared` beschreibt `pets_owned` als „Anzahl besessener Pets, **die es im Content gibt**". Die Engine-Implementierung zählt aber ungefiltert `Object.keys(state.character.ownedPets).length`. Heute irrelevant (21 Pets, 0 tote Refs, `ach_pets_all`=21 passt). **Aber:** Würde später ein Pet aus dem Content entfernt, könnte ein Altsave >21 zählen und `ach_pets_all` fälschlich/zu-leicht triggern. Robustheits-Nuance, kein aktueller Defekt.
**Fix:** Zählung gegen `content.pets` schneiden (analog zur Doku), oder den Kommentar an die Ist-Implementierung angleichen. (An logic-dev.)

### [P3] ember_robe-Craft-XP weiter absurd niedrig (Run-4-P3 unverändert)
`craft_ember_robe_hood/legs/body` (leatherworking L30–32) geben weiterhin **15 / 17 / 18 XP** — Größenordnungen unter Tier-Niveau (voidhide/voidweave L99: 667–1111; selbst Mid-Tier-Smithing auf L31 ~42). Sieht weiter nach Copy-Paste-Tippfehler aus (vermutlich 150/170/180). Zusätzlich verlangen die Rezepte `aether_rune` als Zutat auf L30–32 — Material-Tier passt nicht zum Level. Tangential zur Meta-Goal-Domäne, entwertet aber das Craften der Set-Teile als Skilling-Ziel.
**Fix:** XP an Tier-Kurve angleichen, Zutaten-Tier prüfen. (An balance-/content-dev — außerhalb Read-only-Scope.)

---

## Δ vs Run 4

| Aspekt | Run 4 (meta-goals) | Run 5 (meta-goals) |
|---|---|---|
| Fun (Meta-Lens) | 8/10 | **9/10** |
| Monster mit Kill-Achievement | 63 / 84 | **84 / 84** (alle) |
| Slayer-Turm-Bestiarium (19 Mobs) | P2: 0 Achievements | **gelöst** — voll `[10/100/1000]` |
| Hochland-Waisen (wyvern/roc_void) | P2: ohne Achievement | **gelöst** — `[10/100/1000]` |
| Pet-Vollsammlung | P2: achievement-unsichtbar | **gelöst** — `pets_owned` (Typ NEU, engine-verdrahtet), 2 Achievements |
| Achievements gesamt | 466 | **531** (+65: 63 Mob + 2 Pet) |
| monster_kills-Bedingungen | 204 | **267** (+63) |
| Tote Referenzen | 0 | **0** |
| Total-Level-Schlussstein (2079) | P3 | **P2** (jetzt der Haupt-Gap) |
| Sets / Items / Actions | 27 / 805 / 679 | 28 / 813 / 688 (additiv mitgewachsen) |

**Netto:** Alle drei Run-4-P2-Lücken sauber und korrekt geschlossen (+1 Fun, wie prognostiziert). Neu aufgedeckt ist nichts Substanzielles — nur die Hochstufung des 2079-Schlusssteins zum Haupt-Gap plus drei P3-Feinheiten. Keine Regression, keine neue tote Ref.

## Was fehlt für 9,5?

Drei kleine, additive Haken — keiner ist ein Defekt, alle „fehlende Belohnung auf vorhandenem Content":

1. **(P2, der eigentliche Hebel) `ach_total_level_2079` „Vollender"** + optional `ach_total_level_1800`. Schließt das heute leere letzte Skilling-Drittel und gibt dem 21×99-Endgame seinen Krönungs-Schlussstein. Allein das holt den Großteil des halben Punkts.
2. **(P3) `ach_pets_5`** für eine belohnte frühe Pet-Reise (5/10/21 statt 10/21).
3. **(P3) `pets_owned`-Zählung gegen Content schneiden** (Doku/Impl angleichen) — Zukunftssicherheit, falls je ein Pet entfernt wird.

Für die **vollen 10** käme darüber hinaus eine Set-Vollsammlungs-Achievement-Reihe in Frage (28 Sets, derzeit ohne „Set-Completionist"-Haken — analog zu `pets_owned` ein denkbarer künftiger `sets_completed`-Typ). Das ist aber Kür, nicht Voraussetzung für 9,5.

## Verdikt
Die Meta-Goal-Schicht belohnt jetzt **das gesamte Bestiarium und die volle Pet-Sammlung** — die zwei größten Langzeit-Sammeljagden des Spiels zahlen ein, referenz-sauber und engine-echt. Es bleibt genau **ein** sinnvoller Meta-Endpunkt offen (Total-Level 2079). Mit dessen Ergänzung (+ den zwei P3-Politur-Punkten) ist die 9,5 erreicht.
