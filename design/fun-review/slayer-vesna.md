# Fun-Review: Slayer-System — „Vesna Schwurklinge" (Kopfgeldjägerin)

**FUN-SWEEP F4, CEO-Loop 2026-07-14 · getestet 2026-07-16 · sim-harness (Port 5293) + Engine-Vermessung**

## Steckbrief & Test-Stände

| | |
|---|---|
| Persona | Vesna Schwurklinge — lebt für Auftrags-Loops: Task holen → jagen → kassieren → nächster |
| Bewertet | Task-Vielfalt, Belohnungs-Rhythmus, Skip-Ökonomie, „Jagd oder Abarbeiten?" |
| Stand 1 (mid) | Mira Ashfall, CL 30, Slayer 24 (midgame-Fixture) — echter Task-Zyklus inkl. Kampf-Abschluss |
| Stand 2 (end) | Korveth Grimhollow, CL 96, Slayer 97, Slayer-Helm (endgame-Fixture) — Turm 5, Shop, Cancel |
| Engine-Sim | 3 Stände (CL 5/40/99), 32 volle Task-Zyklen, 80 Angebots-Ziehungen, Kill-Zeiten via simulateCombat, XP-Kurve bis 99 |

**Gemessene Eckdaten:** Task-Größe 15–50 Kills (Ø 33,6) · Task-Dauer mid 3–24 min, end 2–8 min ·
flat 5 Pkt/Task · Skip 20 Pkt (= 4 Task-Abschlüsse) · Turm-Anteil ~40–50 % · Slayer-XP pro Task =
Monster-XP × Kills (halb pro Kill, halb Abschluss-Bonus) · Tasks bis SL 60: ~29, bis 80: ~185,
80→99: ~703 (gesamt ~888 Tasks ≈ 60–90 h reine Jagd) · Endgame-Punktestand nach der 99er-Reise:
~4 440 Pkt (Katalog 2 368 → alles kaufbar, Helm 650 = ~130 Tasks).

## Momente

**1. Brennas Anschlagbrett (stark).** Erstkontakt sitzt: Porträt, Nameplate, „Kill what I mark,
get paid. Simple arrangement.", die Speech-Box spricht mich mit Namen an, fetter 0-Punkte-Zähler,
Shop-Leiter darunter. Zwei Klicks später habe ich einen Auftrag und der Topbar-Chip
(„Slayer: 0/48 Goblin Rogue") verfolgt mich durchs ganze Spiel — genau das richtige
Kopfgeld-Gefühl, der Zettel steckt quasi am Gürtel.

**2. Die Jagd & der Abschluss (der beste Moment des Systems).** „Go to Combat" → die Zielzone
trägt ein „CONTAINS TASK TARGET"-Band, die Monsterkarte ein „Task Target"-Ribbon — ich finde
meine Beute ohne Suchen. Der Abschluss knallt: „SLAYER TASK COMPLETE! +513 XP · +5 pts"-Toast,
Slayer-Level-up obendrauf, Kill-Summary listet Slayer-XP mit. Dopamin vorhanden.
**Aber:** Auf dem Auftragszettel selbst steht KEINE Belohnung. xpReward/pointReward existieren
im Task-Objekt und werden nirgends angezeigt — ich erfahre erst beim Abschluss, was die Jagd wert
war. Ein Kopfgeld ohne aufgedruckte Summe ist kein Kopfgeld.

**3. Der Skip-Moment (tut weh — richtig so — aber die UI lügt unten herum).** 20 Punkte = 4
Abschlüsse Einkommen; ich habe zweimal geschluckt und einmal geskippt (Turm-Task x48 auf Etage 1
bei CL 30 — reines Abarbeiten). Der Schmerz ist gut kalibriert. **Bug:** Unter Slayer-Level 10
ist Skippen laut Engine GRATIS (Früh-Slayer-Gnade), aber die UI zeigt stur „Skip Task (20 pts)"
und sperrt den Button bei < 20 Punkten — der Neuling, für den die Gnade gebaut wurde, sitzt vor
einem toten Button. Dazu existiert „Cancel task" als zweiter Pfad: gleicher Effekt, gleiche 20
Punkte, aber MIT Rückfrage (Skip ohne). Zwei Knöpfe, ein Ergebnis, inkonsistente Reibung.

**4. Endgame-Monotonie (die Jagd wird zum Pendeln).** Mit CL 96/SL 97 bekam ich: Bone Stalker
x18 (Etage 2, L34 — 80 Sekunden „Jagd" für 5 Punkte), dann wild_stag, gray_wolf, wild_stag,
gray_wolf … Der Welt-Pool im Level-Fenster (CL+1…+8) enthält am Ende genau 1–2 Monster; ~60 %
aller Welt-Tasks sind derselbe Hirsch. Und weil Turm-Tasks keine UNTERE Levelkante haben,
schickt Brenna eine 97er-Jägerin regelmäßig zurück in die Pestkammern zu L3-Ratten. Nur
abyssal_devourer x40 (Etage 5, 8-min-Task) fühlte sich nach mir an. Mid-Game ist das Gegenteil:
9 unique Monster in 12 Tasks, Fenster immer ÜBER mir (ash_tyrant: 45 s/Kill, 14 Tode/30 min —
Jagd mit Zähnen, gelegentlich Overreach).

**5. Die Shop-Leiter (klarste Zielkette des Spiels).** Pestmaske 12 → Ohrstöpsel/Spiegel 18/25 →
Soul Veil 55 → Void Anchor 100 → Slayer-Gear 320/420/520 → Helm 650. Gate-Items schalten wörtlich
neue Beute frei (Anforderungs-Monster), der Helm ersetzt alle — Kaufen fühlt sich wie
Werkzeug-Aufrüstung einer Jägerin an, nicht wie Kosmetik. „RARE FIND!"-Toast beim War-Brew-Kauf
war ein hübscher Extra-Kick. Störfaktor: flat 5 Pkt egal ob 15 oder 50 Kills — große Marks zahlen
wie kleine.

## Bewertungsbogen — Slayer-System (Vesna Schwurklinge, Kopfgeldjägerin)
- Spaß sofort (erste 5 Minuten): 8/10
- Spaß über Zeit (Stunden/Tage, simuliert): 6/10
- Sucht-Faktor („eine Runde noch"): 7/10
- Belohnungs-Dichte & Dopamin-Momente: 6/10
- Ziel-Klarheit (warum mache ich weiter?): 9/10
- Tiefe & Entscheidungen (denken statt klicken?): 4/10
- Frustfreiheit (10 = kein Frust): 6/10
- Verzahnung mit dem Rest des Spiels: 8/10
- GESAMT-SUCHT-URTEIL: 7/10
- Komme ich morgen wieder? Ja — die 3–10-Minuten-Häppchen und die Shop-Leiter ziehen; aber ab SL 80 käme ich für den Hirsch Nr. 40 nicht mehr.

**Begründung der Ausreißer:** Ziel-Klarheit 9 — Etagen-Gates (20/40/60/80), Shop-Leiter, Cape bei
99: ich weiß IMMER, wofür der nächste Task ist. Tiefe 4 — es gibt fast keine Entscheidungen:
ein Master (die Tab-Leiste mit genau einem Tab wirkt wie ein leeres Versprechen), Tower/Welt ist
Würfel statt Wahl, einzige echte Entscheidung ist skip-oder-durchbeißen. Zeit-Kurve 6 — früh
exzellent (SL 1→26 in 8 Tasks, Etage 2 nach ~5), Endgame verhungert (Pool-Kollaps + 703 Tasks
für 80→99 ohne neue Reize dazwischen).

## Top-3-Sucht-Verbesserungen

1. **Kopfgeld auf den Zettel + skalierende Prämie.** Belohnung (XP/Punkte) beim Assign im
   Task-Panel anzeigen (Daten liegen im Task-Objekt) und `pointReward` mit der Task-Größe
   skalieren (z. B. 3 + required/10, gerundet): ein 50er-Mark muss sich fetter anfühlen als ein
   15er. Größter Dopamin-Hebel fürs geringste Risiko — reine Anzeige + eine Formel.
2. **Task-Streak (OSRS-Kette).** Jeder 5./10. Abschluss in Folge gibt Bonus-Punkte, Skip bricht
   die Kette (der Code sagt explizit „KEIN Streak-System (Phase 1)" — Phase 2 ist jetzt). Das ist
   DER fehlende „eine Runde noch"-Mechanismus und macht die Skip-Entscheidung endlich zur echten
   Abwägung (Kette opfern?) statt reiner Steuer.
3. **Endgame-Pool retten.** (a) Turm-Tasks eine untere Kante geben (z. B. nur Etagen, deren
   Monster ≥ CL−25 sind) — keine L3-Ratten für 97er; (b) Welt-Fenster bei dünner Abdeckung nach
   oben öffnen (wenn < 4 Kandidaten: Fenster bis CL+20 strecken) — Level 100+ hat 70
   Welt-Monster bis L242 zur Verfügung und bekommt trotzdem nur den Hirsch.

## Bugs & Befunde

1. **[UI-Bug, echt] Früh-Slayer-Gnade unbenutzbar.** `SlayerPage.tsx` liest roh `master.skipCost`
   (Z. 99–101) statt `effectiveSkipCost` (slayer.ts, dessen JSDoc die UI explizit dazu
   auffordert): unter SL 10 ist der Skip engine-seitig gratis, aber Label bleibt „(20 pts)" und
   `disabled={state.slayerPoints < skipCost}` (Z. 319/334) sperrt den Button bei 0 Punkten.
   Verifiziert im Browser (SL 1, 0 Pkt → Button disabled). Der Anti-Sackgassen-Fix aus Sweep6
   erreicht den Spieler nie. → ui-dev, klein.
2. **[UX] Skip vs. Cancel doppelt.** Zwei Aktionen, identischer Effekt & Preis; Skip sofort ohne
   Rückfrage (Fehlklick = 20 Pkt weg), Cancel mit Confirm. `executeCancelTask` ruft zudem
   `spendSlayerPoints(skipCost)` direkt (ebenfalls an der Gnade vorbei). Eine Aktion mit Confirm
   reicht. → ui-dev.
3. **[Kosmetik/Drift] Fallback `?? 30`** für skipCost in SlayerPage (echter Wert 20) — toter
   Divergenz-Fallback, bei Content-Änderung Verwirrungsquelle.
4. **[Design] Story-Gate würgt den Welt-Pool.** Ohne Chronik-Fortschritt besteht der Welt-Pool
   mid-game aus GENAU 1 Monster (bull_boss, 60 % aller Welt-Tasks) — die Zonen-Gates aus Welle C
   filtern still. Gewollt ist die Verzahnung, aber Brenna sollte es AUSSPRECHEN (eine Zeile:
   „Die Chronik öffnet neue Jagdgründe") statt kommentarlos denselben Bullen zu verkaufen.
5. **[OK/bestätigt] Kein Soft-Lock:** assignTask filtert unerfüllbare Anforderungs-Monster und
   gesperrte Etagen korrekt raus; Slayer-Helm ersetzt alle Gate-Items (Task auf Anforderungs-Monster
   mit Helm: keine Warnung, Kills zählen). Kein Page-Error in beiden Läufen.

*Wegwerf-Skripte (fun-f4-a/b.mjs, Engine-Scratch-Test) nach dem Lauf gelöscht; Port 5293 in der
Registry vermerkt. Screenshots im Session-Scratchpad (f4-01…f4-25).*
