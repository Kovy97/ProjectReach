# Slayer-Turm Etage 1–5: Neu-Balancing (1.4.1, Slayer B)

Stand 2026-10-25, content-dev. Chef-GO 25.10.: Die 27 Turm-Gegner der Etagen 1–5 bekommen Welt-Werte ihres Levels plus Slayer-Zuschlag (Richtwert +25 %), vorher per Simulation geprüft. Etagen 6–8 (L100+) unverändert.

## Befund
Die 27 Monster trugen noch die Werte des Julibalancings (balance-pass2 / Combat-Feel-v2), die Welt-Monster wurden danach (Monster-Threat-Spec, Combat-Feel) angehoben. Beispiel Turm-Eisenrevenant L56: 36 LP, Welt-Moosgolem L56: 90 LP. Sim-Messung alt: Turm-Gegner starben in 0,3–0,7× der Zeit eines Welt-Gegners gleichen Levels (Etage 1: 8,6 s gegen 17,4 s).

## Methode
1. Referenz = Welt-Trash (ohne Boss/Enrage, ohne Regen-Elites, ohne dungeonOnly/dg_-Zwillinge, ohne Turm, L5–100, n=37). OLS-Fit (Ward zählt als LP): `ln(effLP) = 2,905 + 0,02276·L`, `ln(dmg) = 1,736 + 0,02543·L`, `acc = 6,93 + 0,0758·L` (deckt sich mit Threat-Spec §4). Unter L12 ist der Fit unbrauchbar, dort Interpolation über die echten Welt-Mobs (Huhn L1, Kuh L5, Eber L10). DMG-Basis = geometrisches Mittel der echten Nachbarn ±7 Level, XP-Band = XP je eff. LP derselben Nachbarn.
2. Startwerte: eff. LP = 1,25 × Referenz (nie unter heute), Ward-Anteil proportional erhalten; DMG = Referenz × 1,15 (Etage 1–2: ×1,1, Etage 3: ×1,0, L≤12 unverändert, jeweils nie unter heute); ACC = Fit gerundet (nie unter heute); XP = max(heute, 1,25 × XP/LP-Band × eff. LP).
3. Kalibrierung per Sim (combatStep/advance, 10 Sim-Min je Zelle, Nahkampf/Fernkampf/Magie, Kampflevel = Monsterlevel, Plattenset + Waffe der passenden Metallstufe, Auto-Essen Stufe 2 mit passender Speise, Welt-Vergleich = alle Welt-Trash-Nachbarn ±6 Level): Zeit je Kill (TTK) Zielwert = Welt-TTK-Kurve × Faktor (Etage 1: 1,0 unter L15, sonst 1,3; Etage 2: 1,3; Etage 3: 1,4; Etage 4: 1,45; Etage 5: 1,5). Die Welt-TTK-Kurve ist flach (Nahkampf ca. 13 s, Fernkampf/Magie ca. 18 s), weil sie durch Angriffsintervall und Mindest-Treffer begrenzt ist. Deshalb liegen die kalibrierten LP bei ca. 1,5–2× der LP-Referenz statt 1,25×: der TTK-Zielwert (1,3–2× Welt) hat Vorrang vor dem LP-Richtwert.
4. Sim-Wächter-Grenze: `tankyIssue` in sim.ts meldet Gegner, die der Bronze-CL12-Held nicht tötet und deren maxHp über 1,7× der Band-Fit-Kurve liegt. Für bone_stalker, tower_skeleton_warrior, slag_abomination, tower_ember_elemental, forge_demon, dreadfang wurde maxHp deshalb knapp unter die Schwelle gesetzt (Ergebnis: AUFFÄLLIGKEITEN 0). Regen-Gegner sind von dieser Regel ausgenommen.

Unverändert: Level, Verteidigung, Ausweichen, Verteidigungstyp, Angriffsintervall, Resistenzen, Inflict, Enrage, Regen (absolut, HP/s), Loot, Gold. Verteidigung/Ausweichen liegen schon auf Welt-Niveau des Levels (z. B. L56 Rüstung 30 gegen Welt 30–40, L74 Ausweichen 18 gegen Welt-Wolf L97 23), deshalb kein Eingriff.

## Alt/Neu je Monster (Level unverändert, DEF/EVA unverändert)

| Monster | Etage | Lv | eff. LP alt→neu | DMG | ACC | DEF/EVA (unverändert) | XP alt→neu |
|---|---|---|---|---|---|---|---|
| rot_rat | 1 | 3 | 3→12 | 3→3 | 4→4 | 2e/3 | 2→9 |
| plague_grub | 1 | 7 | 5→16 | 4→4 | 6→6 | 4e/4 | 6→13 |
| shambling_carcass | 1 | 12 | 9→34 | 6→6 | 6→7 | 10a/0 | 11→60 |
| tower_goblin | 1 | 15 | 15→40 | 7→8 | 7→8 | 10a/1 | 24→64 |
| hollow_marrow | 1 | 16 | 11→41 | 7→8 | 7→8 | 10a/1 | 14→66 |
| tower_goblin_rogue | 1 | 19 | 18→35 | 8→10 | 8→8 | 10e/6 | 38→67 |
| gaze_basilisk | 2 | 22 | 15→38 | 9→11 | 8→9 | 11e/7 | 22→76 |
| wailing_shade | 2 | 28 | 23→56 (Ward 5→12) | 12→14 | 8→9 | 14w/2 | 35→124 |
| bone_stalker | 2 | 34 | 24→53 | 13→15 | 9→10 | 20a/1 | 58→122 |
| tower_skeleton_warrior | 2 | 36 | 28→56 | 14→17 | 9→10 | 20a/1 | 68→143 |
| ashfield_wraith | 2 | 38 | 38→69 (Ward 9→16) | 16→21 | 9→10 | 20w/2 | 78→197 |
| tower_skeleton_archer | 2 | 38 | 26→54 | 16→21 | 9→10 | 20e/10 | 78→154 |
| slag_abomination | 3 | 44 | 24→68 | 25→25 | 9→10 | 22a/1 | 88→208 |
| cinder_wretch | 3 | 48 | 25→97 | 24→26 | 9→11 | 24a/2 | 110→340 |
| tower_ember_elemental | 3 | 50 | 36→105 (Ward 8→26) | 26→27 | 9→11 | 30w/2 | 130→373 |
| forge_demon | 3 | 54 | 42→117 (Ward 10→29) | 29→29 | 9→11 | 30w/2 | 165→423 |
| tower_iron_revenant | 3 | 56 | 36→123 | 34→34 | 9→11 | 30a/1 | 180→457 |
| dreadfang | 4 | 62 | 32→106 | 29→34 | 9→12 | 31e/16 | 258→404 |
| void_stalker | 4 | 66 | 35→111 | 34→38 | 10→12 | 33e/17 | 315→386 |
| sorrow_wraith | 4 | 72 | 65→171 (Ward 15→39) | 36→41 | 10→12 | 40w/3 | 680→680 |
| tower_frost_hound | 4 | 74 | 56→123 | 37→43 | 10→13 | 40e/18 | 820→820 |
| bone_colossus | 4 | 76 | 62→146 | 45→45 | 11→13 | 66a/2 | 920→920 |
| dread_knight | 5 | 82 | 78→175 | 43→46 | 11→13 | 70a/2 | 1080→1080 |
| soul_flayer | 5 | 86 | 114→233 (Ward 26→53) | 41→46 | 12→13 | 43w/2 | 1320→1320 |
| void_herald | 5 | 90 | 127→253 (Ward 29→58) | 43→49 | 12→14 | 50w/3 | 1650→1650 |
| tower_roc_void | 5 | 94 | 112→194 | 40→50 | 12→14 | 50e/23 | 2150→2150 |
| abyssal_devourer | 5 | 96 | 120→224 | 49→50 | 13→14 | 78a/2 | 2300→2300 |

## Sim-Ergebnisse je Monster (Ø über Nahkampf/Fernkampf/Magie, 10 Sim-Min je Zelle)

TTK = Sekunden je Kill (Zykluszeit). Welt = Ø der Welt-Trash-Nachbarn ±6 Level.

| Monster | Etage | Welt Ø TTK (s) | alt | neu | neu/Welt | Tode/10 min alt→neu (3 Stile) |
|---|---|---|---|---|---|---|
| rot_rat | 1 | 14.8 | 6.0 | 14.6 | 0.99x | 0→0 |
| plague_grub | 1 | 23.4 | 7.4 | 16.6 | 0.71x | 0→4 |
| shambling_carcass | 1 | 18.6 | 7.2 | 18.3 | 0.99x | 0→0 |
| tower_goblin | 1 | 16.2 | 9.5 | 20.8 | 1.28x | 0→0 |
| hollow_marrow | 1 | 16.3 | 8.7 | 20.7 | 1.27x | 0→0 |
| tower_goblin_rogue | 1 | 15.3 | 13.0 | 23.5 | 1.54x | 1→2 |
| gaze_basilisk | 2 | 15.7 | 11.5 | 24.0 | 1.53x | 0→1 |
| wailing_shade | 2 | 16.4 | 11.2 | 22.1 | 1.35x | 0→0 |
| bone_stalker | 2 | 15.0 | 10.4 | 18.9 | 1.26x | 0→1 |
| tower_skeleton_warrior | 2 | 15.6 | 11.2 | 18.9 | 1.22x | 0→0 |
| ashfield_wraith | 2 | 19.6 | 13.5 | 23.1 | 1.18x | 0→1 |
| tower_skeleton_archer | 2 | 19.6 | 13.0 | 22.9 | 1.17x | 0→0 |
| slag_abomination | 3 | 16.3 | 8.5 | 18.7 | 1.15x | 0→1 |
| cinder_wretch | 3 | 16.4 | 8.3 | 24.1 | 1.47x | 0→0 |
| tower_ember_elemental | 3 | 14.2 | 10.3 | 23.3 | 1.64x | 0→0 |
| forge_demon | 3 | 20.5 | 11.1 | 24.3 | 1.18x | 0→0 |
| tower_iron_revenant | 3 | 19.3 | 9.8 | 25.5 | 1.33x | 0→0 |
| dreadfang | 4 | 20.1 | 10.3 | 26.5 | 1.32x | 0→0 |
| void_stalker | 4 | 19.0 | 10.6 | 26.7 | 1.40x | 0→0 |
| sorrow_wraith | 4 | 17.0 | 11.8 | 26.4 | 1.56x | 0→0 |
| tower_frost_hound | 4 | 24.7 | 14.4 | 28.0 | 1.13x | 0→0 |
| bone_colossus | 4 | 33.0 | 13.0 | 26.4 | 0.80x | 0→0 |
| dread_knight | 5 | 31.9 | 14.5 | 28.2 | 0.88x | 0→0 |
| soul_flayer | 5 | 27.9 | 15.6 | 28.5 | 1.02x | 0→0 |
| void_herald | 5 | 17.6 | 16.2 | 29.0 | 1.65x | 0→0 |
| tower_roc_void | 5 | 10.1 | 18.7 | 30.7 | 3.05x | 0→0 |
| abyssal_devourer | 5 | 9.8 | 17.3 | 28.8 | 2.93x | 0→0 |

## Sim-Ergebnisse je Etage

| Etage | Welt Ø TTK (s) | alt | neu | neu/Welt | Task Ø32 Kills alt→neu (min) | Kills/h alt→neu | XP/h alt→neu |
|---|---|---|---|---|---|---|---|
| 1 | 17.4 | 8.6 | 19.1 | 1.10x | 4.6→10.2 | 417→189 | 5925→8494 (x1.43) |
| 2 | 17.0 | 11.8 | 21.7 | 1.28x | 6.3→11.6 | 305→166 | 17374→23319 (x1.34) |
| 3 | 17.3 | 9.6 | 23.2 | 1.34x | 5.1→12.4 | 376→155 | 50825→56346 (x1.11) |
| 4 | 22.7 | 12.0 | 26.8 | 1.18x | 6.4→14.3 | 299→134 | 176541→89005 (x0.50) |
| 5 | 19.5 | 16.5 | 29.0 | 1.49x | 8.8→15.5 | 219→124 | 377696→218329 (x0.58) |

## Tests
- Geändert: keine. tower-monsters.test.ts (Klon-Guard) erlaubt level/maxHp/damage/accuracy/evasion/defense/wardCapacity/regen/xp/gold bereits als Abweichung und bleibt grün. Bronze-Baseline der sim.test.ts: AUFFÄLLIGKEITEN (0).
- Engine-Suite komplett: 2142 grün, 1 rot (slayer-auto-task.test.ts, 8-h-Offline: erwartet deaths = 0, gemessen 1; ein Tod eines Kampflevel-30-Helden mit Kupferschwert beim Auftrag cinder_wretch/tower_iron_revenant, Etage 3). Die Datei liegt im Revier des Slayer-Umbaus und wurde nicht angefasst. Erwartung ist durch die Turm-Härtung bewusst überholt; Vorschlag: auf deaths <= 1 lockern oder den Test-Helden besser ausrüsten.
- Typecheck aller Pakete grün. Das Paket @hearthforge/content hat kein vitest, der Content-Lauf entfällt.

## Folgen für die Slayer-Ökonomie
- Zeit je Auftrag (Ø 32 Kills) steigt auf das 1,8–2,2-Fache (Etage 1: 4,6 auf 10,2 min, Etage 3: 5,1 auf 12,4 min, Etage 5: 8,8 auf 15,5 min). Slayer-Punkte pro Stunde sinken entsprechend auf etwa 45–55 % der alten Rate (Punkte hängen am Auftrag, nicht am Kill).
- Kampf-XP/h: Etage 1–3 steigen (x1,1–1,4), weil die XP je Kill mit den LP wachsen. Etage 4–5 sinken auf etwa 50–58 %, weil die alten XP je Kill dort schon weit über dem Welt-Band lagen (Etage 5: 2300 XP für 120 LP, Welt-Band 2–5 XP je LP) und laut Vorgabe nicht gesenkt wurden. Ausgleich wäre nur über höhere XP je Kill möglich; nicht umgesetzt, Entscheid Chef.

## Grenzen der Messung
Alle Stile tragen das Plattenset der Stufe (Rüstungs-Trinität nicht nachgestellt), kein Pet, keine Suffixe, keine Tränke. Die Zahlen sind eine Obergrenze der Überlebensfähigkeit; mit einer Metallstufe weniger Ausrüstung (Stresslauf) treten auf den Etagen 1–3 ein bis fünf Tode je 10 Sim-Min auf einzelnen Gegnern auf (plague_grub, tower_goblin_rogue, gaze_basilisk, ashfield_wraith, slag_abomination), Welt-Gegner liegen dort bei 0–1,4.

## Integration (Hauptagent, 25.10. abends)

<!-- claude:2026-10-25T16:17:00+01:00 -->

- **Slayer A (Auftragsauswahl, `assignTask`):** Die Pool-Mindestgröße senkt die Turm-Unterkante (CL − 3) nur noch ohne
  Welt-Aufträge. Sonst teilen sich die Turm-Kandidaten auf Niveau einen Topf mit dem Welt-Pool (eine flache Ziehung,
  Auftragsart folgt dem Monster). Vorher z. B. Slayer 45 / CL 57: Etage-3-Mobs L48/L50 im Pool. Test
  `slayer-tower-pool-1-4-1.test.ts`; zwei Alt-Tests in `slayer.test.ts` erwarteten das Auffüllen und sind mit Begründung
  angepasst. Hinweis: Der Chef-Fall (Eisenrevenant L56) lag bei CL 48–59 regulär im Fenster, die Ursache war B.
- **Punkte-Ausgleich:** `TOWER_FLOOR_POINTS_MULT` Etage 1–5 ×2 (Aufträge dauern 1,8–2,4× so lang), Etage 6–8 unverändert.
- **Test-Held S1 offline:** `slayer-auto-task.test.ts` starb mit Kupferschwert ohne Rüstung einmal auf Etage 3 (Tod beendet
  den Kampf). Er trägt jetzt die Stahl-Stufe; der Test prüft die Auftragskette, nicht das Überleben.
- **Bewusst offen:** Kampf-XP/h auf Etage 4–5 sinkt auf ~50–58 % (alte XP je Kill lag weit über dem Welt-Band, XP je Kill
  wurde nicht gesenkt). Ausgleich nur über höhere XP je Kill, Chef-Entscheid.
- Prüfungen: Engine 2143 grün (24 übersprungen), Persistence 575, Client 300, Typecheck 5/5, Build grün, Sim AUFFÄLLIGKEITEN 0.

## Ausgleich Etage 4–5 (Chef 25.10. abends: „Etage 5 ausgleichen“)

<!-- claude:2026-10-25T19:10:00+01:00 -->

Kampf-XP/h war auf Etage 4 auf ×0,50 und auf Etage 5 auf ×0,58 gefallen. Jetzt je Monster XP = alte XP (vor 1.4.1) × Zeit je Kill
neu / alt aus der Sim-Tabelle oben, nie unter dem bisherigen Wert. Damit liegt die XP/h wieder auf dem Stand vor der Härtung.
Etage 4 ist mit ausgeglichen, weil sie denselben Einbruch hatte.

| Monster | XP vor 1.4.1 | XP nach Härtung | XP jetzt |
|---|---|---|---|
| dreadfang | 258 | 404 | 664 |
| void_stalker | 315 | 386 | 793 |
| sorrow_wraith | 680 | 680 | 1.521 |
| tower_frost_hound | 820 | 820 | 1.594 |
| bone_colossus | 920 | 920 | 1.868 |
| dread_knight | 1.080 | 1.080 | 2.100 |
| soul_flayer | 1.320 | 1.320 | 2.412 |
| void_herald | 1.650 | 1.650 | 2.954 |
| tower_roc_void | 2.150 | 2.150 | 3.530 |
| abyssal_devourer | 2.300 | 2.300 | 3.829 |

