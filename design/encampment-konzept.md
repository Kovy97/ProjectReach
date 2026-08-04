# Encampment „New Haven" — Konzept-Grundstock (Chef-abgenommen 26.07.2026)

*Namens-Entscheide Chef 27.07.2026 (Task #360, bindend): Der Ort heißt **New Haven** — in allen 7 Sprachen unübersetzt. Gebäude 1 = **Zentralhaus / Town Hall** (`camp_townhall`, war „Herzfeuer"), Gebäude 3 = **Vorratsspeicher / Storehouse** (`camp_storehouse`, war „Erdgewölbe"/„Vorratslager"). Details: design/lore/encampment-lore.md.*

*Headline-Feature für **0.3.0** (Ziel: Depot 02.08., Event + Sichtbarkeitsrunde 03.08.).*
*Scope-Beschluss: NUR Phase 1 — Lager-Screen + Gebäude mit permanenten Boni + Bauzeiten.*
*Explizit NICHT in 0.3.0: Companion-/Rekruten-Missionen (Chef: „noch nicht bedenken"), Schrein-Ausbau-Optik-Phasen.*

## Eiserne Regeln (Chef-bestätigt)
1. **Kein Gebäude ist ein neuer Wasserhahn** — jedes veredelt/beschleunigt/verbindet ein BESTEHENDES System. Keine passive Rohstoff-Erzeugung aus dem Nichts.
2. **Null neue Währungen** (Gold + bestehende Materialien), max. EIN neuer Timer-Typ (Bauzeit).
3. **Boost-Budget hart:** max. +15 % Tempo je Einzel-Skill über alle Stufen, +9 % für die breite Werkhof-Gruppe, KAMPF-Werte komplett unberührt (kein Gebäude bufft Schaden/Verteidigung).
4. **Bauzeiten im „Die Stämme"-Stil:** EIN Bautrupp, Echtzeit (läuft offline weiter), kurz am Anfang, 24–48 h für Endstufen — das Lager ist der „Komm-morgen-wieder"-Anker.
5. **Kosten = Senken:** Stufe II ≈ 5× Stufe I, Stufe III ≈ 4× Stufe II; Materialien wandern mit der Zonen-Leiter (Stufe III verlangt Material aus dem Band des jeweiligen Story-Tors).
6. Story-Anbindung: **New Haven ist ab SPIELSTART verfügbar** (Chef-Entscheid 27.07., Task #365 — die Heimatbasis, an der der Charakter ankommt, kein Kapitel-Lohn; Zentralhaus I trägt kein Quest-Gate). Das Pacing hängt allein an den Zentralhaus-AUSBAUTEN: Stufe II an K9, Stufe III an K14.
7. Lore: NOCH KEINE Stadt — New Haven ist der eine behauptete Flecken Licht im verheerten Reach (Wachfeuer + Siedler-Kate → Zeltring + Versammlungshaus → Palisade + wiederhergestellte Wegstation mit Glockenturm). Das Wachfeuer bleibt Gründungsmotiv, ist aber kein Gebäude (Chef 27.07.).

## Gebäudeliste (Chef-abgenommen, Zahlen = Anker für Balance-Feinschliff)

| Gebäude | Funktion (System) | Effekt I / II / III | Kosten-Anker I → III | Bauzeit I / II / III |
|---|---|---|---|---|
| Zentralhaus | Zentrum, schaltet Bauplätze frei, Stufen an K4/K9/K14 | +2/+4/+6 Bauplätze | 500 g + 20 Eichenholz → 15 000 g + Wildwald-Holz + 10 Trübessenz | 10 min / 8 h / 24 h |
| Wachturm | Offline-Cap | +1 h (8→9/10/11 h) | 2 500 g + Stein/Eisen → 40 000 g + Titan | 1 h / 12 h / 48 h |
| Vorratsspeicher | Bank | +4/+4/+6 Plätze | 1 500 g + Holz+Leder → 25 000 g + Warhide + Bloodiron | 30 min / 8 h / 24 h |
| Kommandozelt | Queue | +1/+1/+1 Slot | 2 000 g + Stoff+Holz → 30 000 g + Aetherium-Anteil | 1 h / 12 h / 36 h |
| Fischerhütte | Angeln | +5/10/15 % Tempo | 800 g + Holz + Rohfisch → 12 000 g + Krypta-Aal | 20 min / 6 h / 20 h |
| Sägeplatz | Holzfällen | +5/10/15 % | 800 g + Bronzebarren → 12 000 g + Bloodoak | 20 min / 6 h / 20 h |
| Stollenmund | Bergbau | +5/10/15 % | 800 g + Holz + Stützbalken → 12 000 g + Runite | 20 min / 6 h / 20 h |
| Feldgarten | Anbau + Sammeln | +4/8/12 % | 600 g + Saatgut → 10 000 g + Wildwald-Kräuter | 15 min / 5 h / 16 h |
| Hehlerzelt | Diebeskunst | +5/10/15 % | 1 000 g + Leder + Stoff → 14 000 g + seltene Stoffe | 30 min / 6 h / 20 h |
| Werkhof | ALLE Handwerks-Skills | +3/6/9 % | 3 000 g + Barren-Mix → 35 000 g + Titanium + Essenzen | 2 h / 16 h / 48 h |
| Schmelzofen | Offline-Veredelung Erz→Barren | 20/40/60 pro h (nur beherrschte Rezepte) | 2 500 g + Stein + Eisen → 30 000 g + Slagpit-Material | 1 h / 10 h / 30 h |
| Räucherhaus | Offline-Veredelung Fisch/Fleisch→Gerichte | 20/40/60 pro h | 1 800 g + Holz + Häute → 20 000 g + Wildwald-Fleisch | 45 min / 8 h / 24 h |
| Trophäenhalle | Slayer | +10/20/30 % Punkte; III: 1 Gratis-Skip/Tag | 5 000 g + Totems/Schuppen → 50 000 g + Elite-Mats | 4 h / 16 h / 48 h |
| Schrein des Wächters | Wochensegen | sichtbar + Effekt +10/20/30 % | 4 000 g + Essenzen → 45 000 g + Leerenessenz | 2 h / 16 h / 48 h |
| Händlerposten | Shop | Verkauf +2/4/6 % | 3 000 g + Handelswaren → 25 000 g Gold-lastig | 1 h / 10 h / 30 h |

*(Später, NICHT 0.3.0: Zwinger/Gesindehaus für rekrutierbare Companions + Missionen.)*

## Balance-Korrekturen (26.07., aus encampment-balance.md — GELTEN, Chef-Veto s. Zielsetzung)
1. **Kommandozelt/Schreibzelt umgewidmet:** „Queue +1 Slot" wäre ein No-op (Queue hat heute
   keine Kapazitätsgrenze; eine einzuführen wäre Regression). NEU: **Bautrupp-Tempo
   −10/−20/−30 % Bauzeit** (klassisches Hauptgebäude-Muster). [Chef-Entscheid #4, Default=so]
2. **Schrein: wildhunt ausgenommen** (Freitags-Segen = Kampf-Angriffstempo → Eiserne Regel 3).
   An wildhunt-Tagen verstärkt der Schrein stattdessen den Elite-Ruhe-Cooldown (Spawn-Frequenz).
3. **Material-Anker ersetzt** (existierten nicht/falsches Band): „Stein/Stützbalken"→
   slag_carapace/iron_bar, „Stoff"→Häute/void_thread, Zentralhaus III dim_essence→essence_void,
   „Aetherium" (L85+, über K14-Band)→titanium_bar. Exakte 45 Stücklisten: encampment-balance.md §3.
4. **Zentralhaus-Bauplätze +4/+5/+5** (statt +2/+4/+6 — 14 Gebäude brauchen 14 Plätze).
5. **Gold-Leiter folgt der eisernen Regel ×5/×4** (Anker-III-Werte waren zu niedrig) —
   verbindliche Zahlen in encampment-balance.md.
6. Klemmen: Trophäenhalle+Ring gesamt ≤×1.5 Slayer-Punkte; Händlerposten+Pet ≤+15 % Verkauf.

## Zielbild „Die Stämme"-Karte (Chef-Vision 28.07., NACH 0.3.0)

Das Karten-Grid aus 0.3.0 ist bewusst die erste Stufe. Das eigentliche Ziel ist eine **echte
2D-Dorfkarte im Stil von „Die Stämme"**: eine gezeichnete Lagerfläche mit **sichtbaren
Bauslots**, auf die der Spieler seine Gebäude setzt — plus **Tag/Nacht-Zyklus**, der die
gesamte Karte umleuchtet.

**Deshalb entstehen die Gebäude-Assets schon jetzt in Tag- UND Nachtfassung** (Chef-Entscheid
28.07.): Sie dienen beiden Ansichten. Die isometrische 45°-Ansicht mit sauberem
Rhombus-Grundriss ist genau das Format, das eine solche Karte braucht — kein Neu-Generieren
später.

**Was für die Karte ZUSÄTZLICH gebraucht wird (0.4-Planung, noch nicht beauftragt):**
- Karten-Untergrund (Lagerfläche mit erkennbaren Bauslots) in Tag- und Nachtfassung
- Leere-Bauslot-Grafik (Fundament/Pflock/Aushub)
- Regel, welcher Slot welches Gebäude aufnimmt (feste Plätze vs. frei wählbar)
- Uhrzeit-Quelle für den Zyklus (Echtzeit? Spielzeit? — Determinismus-Frage, siehe Leitplanken)
- Bau-Animation/Übergang beim Stufenwechsel (optional)

Scope-Beschluss bleibt: **0.3.0 = Karten-Grid** (fertig, getestet), **Karte = 0.4**.

## Technische Leitplanken für die Umsetzung
- SAVE_VERSION-Bump (v75→v76) + Migration + Vault-Fixture nach GESETZ.
- Bauzeit-Timer: über die deterministische Spielzeit (Tick-Fortschritt), damit offline==online bit-identisch bleibt — NICHT Date.now() in der Engine.
- Tempo-Boosts greifen im bestehenden Action-Dauer-Pfad (analog Pet-/Meisterschafts-Boni) — ein gemeinsamer Multiplikator-Hook, kein Sonderweg je Skill.
- Offline-Veredelung (Schmelzofen/Räucherhaus): konsumiert Input aus Bank/Inventar über Normalpfade, deterministisch, respektiert Rezept-Kenntnis; Ergebnis in den Offline-Report („dein Lager hat gearbeitet").
- Lager-Screen: Sidebar-Eintrag „New Haven" (unübersetzt, Chef 27.07.); Hotspot-Layout (Vorlage: Chefs YGOJourney-Map-Editor-Muster); Platzhalter-Art bis Chef-Kulissen da sind.

## Offene Arbeitsaufträge
1. Lore-Dev: Erzählung, Ausbaustufen-Namen, Gebäude-Flavor EN/DE (design/lore/encampment-lore.md).
2. Balance-Designer: exakte Material-Stücklisten gegen die echte Ökonomie + Boost-Budget-Nachweis (design/encampment-balance.md).
3. Danach Implementierungs-Wellen (Engine → Content → UI) + Chef-Assets (Lager-Kulisse(n) + 15 Gebäude-Icons — Prompts folgen nach Lore-Namen).
