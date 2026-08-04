# Waffen-Effekt-Palette — „Grim Reach" (Kreativ-Vorlage für Waffen 2.0)

> Chef-Lizenz 2026-07-02: kreative Effekte erfinden; langweilige/unbedeutende Waffen dürfen im Zuge des
> Stat-Reworks Charakter bekommen — AUSSER bewusste Füller-Waffen (glatte Smithing-Leiter bleibt schlicht).
> Regel: ~80 % der Palette nutzt EXISTIERENDE Mechaniken (Status, Lifesteal, Mana, Kill-/Krit-Momente),
> der Rest sind kleine, saubere Hooks in combat.ts. Jeder Effekt wird im DPS-Budget eingepreist
> (erwartete Uptime × Magnitude) — Effekte sind Identität, kein Gratis-Power-Creep.

## A) Bestehende Mechaniken, neu erzählt (sofort nutzbar)
1. **Brand/Blutung/Gift/Frost/Schock** — bleiben, aber je Waffe mit eigener Prosa & Identität.
2. **Vampirisch** (Lifesteal) — „Die Klinge trinkt. 8 % des zugefügten Schadens heilen dich."

## B) Konditionale Schläge (1 if im Schadenspfad — trivial implementierbar)
3. **Henker** — „+25 % Schaden gegen Ziele unter 20 % Leben." (Execute-Fantasy, Finisher-Gefühl)
4. **Riesentöter** — „+15 % Schaden gegen Gegner über deinem Kampf-Niveau." (Underdog-Waffe, hilft beim Hochkämpfen)
5. **Verzweiflung** — „+30 % Schaden, solange du unter 30 % Leben bist." (Risk/Reward — passt perfekt zum Tod-Abbruch)
6. **Kopfgeldklinge** — „+20 % Schaden gegen dein Slayer-Ziel." (Slayer-State existiert)

## C) Momentum & Kampfrhythmus (transienter Zähler im CombatState)
7. **Blutrausch** — „Jeder Treffer steigert deinen Schaden um 2 %, bis zu 10-mal. Endet mit dem Kampf."
8. **Hinterhalt** — „Dein erster Treffer eines Kampfes verursacht doppelten Schaden." (First-Strike, Dolch-Fantasy)
9. **Doppelschlag** — „12 % Chance, unmittelbar ein zweites Mal zuzuschlagen." (Extra-Attack-Roll, State-RNG)
10. **Funkenschlag** — „Kritische Treffer entladen einen Blitz für X Zusatzschaden." (Krit-Hook existiert)

## D) Kill-Momente (Hook in onEnemyDefeated — synergiert mit Kill-Cooldown!)
11. **Jagdrausch** — „Tötungen verkürzen deine Erholungspause um 2 Sekunden." (spielt MIT dem neuen 5s-Pacing!)
12. **Seelenernte** — „Tötungen stellen X Mana wieder her." (Caster) / **Kriegshunger** — „…heilen dich um X." (Melee)
13. **Nachhall** — „Überschüssiger Schaden eines Todesstoßes trifft den nächsten Gegner." (Overkill-Carry — Farm-Fantasy)

## E) Zermürbung (Monster-Mechaniken existieren: regen/enrage)
14. **Wundbrand** — „Blutende Ziele regenerieren nicht." (Anti-Regen — macht Regen-Bosse zur Waffen-Wahl!)
15. **Aetherfresser** — „Treffer entziehen dem Ziel die Magie und stellen dir X Mana wieder her."

## F) Durchbruch & Präzision (Mitigations-/Accuracy-Pfad)
16. **Schildbrecher** — „Deine Treffer ignorieren 30 % der Verteidigung des Ziels." (Anti-Tank-Waffe)
17. **Aegis-Brecher** — „+20 % Schaden gegen schwer gepanzerte Ziele." (def-Schwellen-Conditional)
18. **Erstes Blut** — „+25 % Schaden gegen unverletzte Ziele." (Opener — das Gegenstück zum Henker)
19. **Adlerauge** — „Dein erster Schuss eines Kampfes trifft immer kritisch." (Ranged-Opener)

## G) Status-Synergien (belohnt Kombinieren)
20. **Ausweider** — „Blutungen, die du verursachst, richten 50 % mehr Schaden an."
21. **Frostbiss** — „+25 % Schaden gegen verlangsamte Ziele." (Frost→Nuke-Kombo)
22. **Katalysator** — „Deine Statuseffekte halten 3 Sekunden länger."
23. **Seuchenträger** — „Tötungen vergiften den nächsten Gegner." (Kill-Chain, nutzt den Respawn-Fluss)
24. **Schlachter** — „Kritische Treffer gegen blutende Ziele heilen dich um X."

## H) Rhythmus & Eskalation (transiente Zähler)
25. **Wucht** — „Jeder 5. Treffer verursacht +100 % Schaden." (Hammer-Fantasy)
26. **Kaskade** — „Jeder Nicht-Krit erhöht deine Kritchance um 3 %, bis ein Krit gelingt." (Bad-Luck-Protection)
27. **Ausdauer** — „Dein Angriffstempo steigt alle 10 Sekunden im Kampf um 5 %." (Anti-Zäh-Mob)
28. **Kurzer Prozess** — „+30 % Schaden in den ersten 5 Sekunden eines Kampfes." (Burst-Identität)
29. **Berserkerlied** — „+20 % Angriffstempo, solange du unter 50 % Leben bist."
30. **Rache** — „Nachdem du getroffen wurdest, verursacht dein nächster Schlag +40 % Schaden."

## I) Preis & Ressource (Risk/Cost-Waffen — mutige Builds)
31. **Blutzoll** — „Jeder Schlag kostet dich X Leben, verursacht dafür +25 % Schaden." (Blutmagier-Klinge)
32. **Arkaner Überfluss** — „+20 % Zauberschaden, solange dein Mana über 80 % liegt." (Caster-Disziplin)
33. **Sparsamkeit** — „25 % Chance, dass ein Zauber kein Mana kostet."
34. **Durchschuss** — „20 % Chance, keine Munition zu verbrauchen." (Ranged-Ökonomie)
35. **Spiegelhaut** — „Angreifer erleiden X Schaden, wenn sie dich treffen." (Dornen — auch für Schild-Ausnahmen)

## J) Jäger & Sammler (Ökonomie-/Meta-Rider — Idle-Herz)
36. **Glücksklinge** — „+15 % Gold von Tötungen."
37. **Sammlerklinge** — „+10 % Beutechance." (unser Magic Find)
38. **Gelehrtenklinge** — „+10 % Kampferfahrung."
39. **Trophäenjäger** — „+1 % Schaden je 50 Bestiarium-Tötungen dieser Gegnerart (max +20 %)." (nutzt monsterKills!)
40. **Rudelführer** — „Die Fähigkeit deines Begleiters löst 25 % häufiger aus." (Pet-Synergie)

## Zuteilungs-Regeln
- **Füller bleibt Füller:** die glatte Metall-Smithing-Leiter (copper→godiron Standard-Klingen) bleibt effektlos — sie IST die Baseline.
- **1 Charakter-Waffe pro Tier-Band** in der Craft-Leiter (z.B. der Scimitar-Zweig als „schnelle" Identität).
- **Jede Signature-/Unique-/Drop-Waffe bekommt einen Effekt mit Prosa** — kein Rare ohne Persönlichkeit (Mire Fang Dagger = Bleed-Prosa; bramble_witchstaff = Wundbrand? thematisch zuteilen).
- **Boss-/godly-Waffen:** dürfen 2 Effekte kombinieren (z.B. last_judgement: Henker + Kriegshunger).
- Effekt-Magnitude wird vom Budget abgezogen (Spec §Effekt-Pricing): erwartete DPS-Äquivalenz = Uptime × Wirkung.
- **UI:** alle Effekte als Fließtext (WoW-Stil), i18n en+de, Template je Effekt-Typ.

## Engine-Bedarf (klein, combat-dev)
Neue Effekt-Kinds als Daten auf `weaponEffect`: `execute`, `giantSlayer`, `desperation`, `bounty`, `momentum`,
`firstStrike`, `doubleStrike`, `critBurst`, `cooldownOnKill`, `manaOnKill`, `healOnKill`, `overkillCarry`,
`antiRegen`, `manaDrain` — alle: 1 Bedingung + 1 Wirkung im bestehenden Schadens-/Kill-/Krit-Pfad,
transiente Zähler im CombatState (nicht persistiert), State-RNG-Disziplin.
