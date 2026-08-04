# Fun-Review F7 — Achievements + Bestiarium + Sammel-Meta („Pip Hakenliste", der Komplettist)

**FUN-SWEEP des CEO-Loops 2026-07-14 · Tester F7 · 2026-07-16 · sim-harness Port 5296 (Registry eingetragen), Fixtures midgame/endgame + `__hfDebug`-Patches, read-only.**

Pip lebt von Häkchen. Er öffnet die Achievements-Seite öfter als die Charakter-Seite. Er hat das
Gebiet auf drei Ständen erlebt: früh/mid (Mira, Combat-Lv 30, 56/530), Endgame (Korveth,
Combat-Lv 96, 213/530) und einer simulierten 100%-Vollendung (alle 530 freigeschaltet).

---

## Steckbrief: Was das Meta-Spiel tatsächlich enthält

| System | Umfang | Gesamtfortschritts-Anzeige |
|---|---|---|
| Achievements | **530** Stück, 5 Raritäten, AP-Score (gesamt **10.335 AP**) | Hero-Bar „56 / 530" + AP-Zahl + %-Ring + „Next milestone: x %" |
| Bestiarium | **105** Monster in 11 Zonen-Sektionen | Kopfzeile „Defeated: 9/105 Monsters" + Balken je Zone |
| Item-Entdeckung | **1.061** Items | nur Zähler „Discovered: 28/1061 Items" (Bestiarium-Kopf + Statistik) — **keine Checkliste dahinter** |
| Pet-Galerie | **21** Pets | „0 / 21 companions" + ???-Karten mit Quelle & Drop-Chance |
| Sets | 34 Set-Defs | nur indirekt via `sets_completed`-Achievements |

**Raritäts-Verteilung:** 131 common · 158 uncommon · **180 rare** · 50 epic · 11 legendary.
„Rare" ist die HÄUFIGSTE Stufe — die Pyramide ist in der Mitte invertiert; das Badge verliert Bedeutung.
AP je Stufe: 5/10/25/50/100.

**Kategorie-Verteilung:** combat **295** (56 %!) · skilling 199 · collection 11 · wealth 9 ·
quests 8 · gathering 4 · crafting 4 · exploration **0** · meta **0** (Tabs korrekt ausgeblendet).
Die 295 Combat sind fast komplett 3-Stufen-Kill-Leitern (10/100/1000) × ~86 Monster (258 Stück) —
solide Langzeit-Jagdliste, aber strukturell ein einziges Muster.

**Belohnung:** AP ist reiner Score. Kein Shop, kein Titel, kein Buff, keine Kosmetik hängt daran
(Code-verifiziert: `earnedAP` wird ausschließlich auf der Achievements-Seite gelesen; einzige
Außenwirkung ist der Steam-Achievement-Sync). Der „Next milestone: 5 %"-Ring zählt auf … nichts.

---

## Momente (erlebt im Harness)

1. **Trophäensaal-Erstkontakt (mid, 56/530).** Hero mit Pokal, Unlock-Bar, 350 AP, 3%-Ring,
   Kategorie-Flügel mit eigenen Zählern („Skilling 47/199"). Filter All/Unlocked/Locked, Karten
   mit Raritäts-Badge, AP-Wert und **live tickenden Fortschrittsbalken auf gesperrten Karten**
   („Woodcutting Journeyman 24/30"). Pip fühlt sich sofort zu Hause — das ist ein Spiel im Spiel,
   optisch bereits Citadel-würdig. Der alte Namens-über-Badge-Überlappungsbug (ach2-name,
   ui-audit-README) ist im neuen Kartenlayout nicht mehr da.
2. **Der Unlock-Moment.** Gold erreicht 10.000 → Fanfare (achievement.mp3) + Toast „Achievement
   unlocked! Coffer (+10 AP)", Hero-Zähler tickt vor Pips Augen 56→57, AP 350→360. Sauber und
   befriedigend — aber die +10 AP kaufen nichts, und Pip weiß das.
3. **Der verschluckte Jackpot.** 21 Achievements in einem Tick (realistisches Szenario: Rückkehr
   aus langer Offline-Phase) → nur die **letzten 4** Toasts sichtbar (MAX_TOASTS-FIFO), 17
   Unlock-Momente verpuffen lautlos. Kein „+17 weitere (+890 AP)"-Sammel-Toast, kein
   Kürzlich-freigeschaltet-Log zum Nachschauen. Für einen Komplettisten ist genau dieser
   Heimkehr-Stapel DER Dopamin-Moment des Tages — und er wird abgeschnitten.
4. **Bestiarium = Sammelalbum, nicht Datenbank.** Echte Monster-Art auf Zonen-Hintergrund,
   ???-Silhouetten für Unentdeckte, Kill-Zähler-Badge, Drop-Slots als schwarze Silhouetten mit
   „?" (Chase-Gefühl!), Klick auf entdeckte Drops öffnet das Item-Wiki, „Fight"-Button direkt auf
   der Karte schließt den Kreis zur Jagd. Zonen-Balken („9/15 discovered") + Auf/Zuklappen machen
   die Jagdliste lesbar. Pips Herz schlägt hier höher als auf der Achievements-Seite.
5. **Der Gipfel ohne Fahne (100%-Simulation).** 530/530, Bar voll gold, Ring 100 %, 10.335 AP —
   und es passiert: nichts. Kein Konfetti, kein Titel, keine Zeile. Stattdessen steht dort
   „Next milestone: 100%" (bei 100 %!) und der Footer vertröstet: „New achievements are added
   regularly." Der Everest des Komplettisten hat keine Gipfelfahne.

Kein einziger Console-/Page-Error über beide Läufe.

---

## Bewertungsbogen — Achievements + Bestiarium + Sammel-Meta (Pip Hakenliste, der Komplettist)
- Spaß sofort (erste 5 Minuten): 7/10
- Spaß über Zeit (Stunden/Tage, simuliert): 5/10
- Sucht-Faktor („eine Runde noch"): 6/10
- Belohnungs-Dichte & Dopamin-Momente: 5/10
- Ziel-Klarheit (warum mache ich weiter?): 7/10
- Tiefe & Entscheidungen (denken statt klicken?): 3/10
- Frustfreiheit (10 = kein Frust): 7/10
- Verzahnung mit dem Rest des Spiels: 6/10
- GESAMT-SUCHT-URTEIL: 6/10
- Komme ich morgen wieder? Ja — aber wegen der 24/30-Balken und Zonen-Alben, nicht wegen der
  AP-Zahl; die verpufft ohne Gegenwert.

**Begründung der Ausreißer:** Tiefe 3/10 ist genre-okay, aber als „eigenes Spiel im Spiel"
gemessen gibt es null Entscheidungen — nur Zähler. Belohnung 5/10, weil der beste Toast des
Spiels an einer Währung hängt, die nichts kauft, und Massen-Unlocks abgeschnitten werden.
Ziel-Klarheit 7/10 statt mehr, weil das nächste Häkchen zwar pro Kategorie gut sichtbar ist
(Leiter-Sortierung + Locked-Filter + Balken), aber 291 der 474 gesperrten Karten bei 0 % stehen
und es keine globale „fast fertig"-Sicht gibt.

---

## Top-3-Sucht-Verbesserungen (Pips Reihenfolge)

1. **AP muss etwas kaufen — häng Belohnungen an die Meilenstein-Ringe.** Die UI verspricht es
   bereits („Next milestone: 5 %"), es fehlt nur der Preis dahinter: alle 5 % ein Titel, eine
   Kosmetik, Quest-Tokens o. Ä., und bei 100 % eine echte Zeremonie (das Spiel hat mit
   MasteryCeremony schon das Muster dafür). Größter Einzelhebel des ganzen Gebiets — verwandelt
   10.335 tote Punkte in eine Fortschrittswährung.
2. **„Nächste Häkchen"-Leiste + Sammel-Toast.** Oben auf der Achievements-Seite die 3–5
   fast-fertigen Achievements global nach Fortschritt sortiert anpinnen (Daten existieren schon:
   `achievementProgress`), und bei Massen-Unlocks statt FIFO-Abschneiden einen Stapel-Toast
   „21 Achievements freigeschaltet (+1.020 AP)" zeigen. Beides zusammen macht aus „Wand mit 474
   Karten" eine tägliche To-do-Liste mit Heimkehr-Jackpot.
3. **Bestiarium zur echten Jagdliste ausbauen:** (a) „Nur Unbesiegte"-Filter analog zum
   Locked-Filter der Achievements, (b) die 10/100/1000-Kill-Leiter als Mini-Häkchen direkt auf
   der Monsterkarte (die 258 Kill-Achievements sind unsichtbar, solange sie nur in der
   Achievements-Wand liegen), (c) hinter den „Discovered: x/1061 Items"-Zähler eine
   Checklisten-Ansicht legen (Item-Wiki als Galerie mit entdeckt/fehlt) — ein Zähler ohne Liste
   ist für einen Komplettisten eine offene Wunde.

**Kleinere Würfe:** Raritäten rebalancen (180× „rare" entwertet das Wort — Ziel: common > uncommon
> rare); exploration/meta-Kategorien entweder befüllen (Zonen entdeckt, Dungeons gemeistert,
Chronik-Kapitel) oder aus dem Typ entfernen; Kategorien gathering/crafting (je 4) wirken wie
Platzhalter neben 295 Combat.

---

## Bugs & Auffälligkeiten

1. **„Next milestone: 100%" bei 100 % Vollendung** (AchievementsPage.tsx, `nextMilestone`-Clamp):
   bei `apPct >= 100` sollte dort „Vollständig!"/Feier-Zustand stehen, nicht ein weiteres
   „nächstes" Ziel. Kosmetisch, aber genau am wichtigsten Moment des Komplettisten.
2. **Massen-Unlock verschluckt Toasts ohne Hinweis** (Toasts.tsx, MAX_TOASTS=4, FIFO-slice):
   21 gleichzeitige Unlocks → 4 sichtbar, 17 kommentarlos weg. Design-Lücke eher als Bug, aber
   real erlebbar nach jeder längeren Offline-Phase.
3. Kein Fehler im Lauf: beide Fixtures, alle Seiten, 0 Page-/Console-Errors. Der in
   ui-audit/README dokumentierte `ach2-name`-Spillover ist im aktuellen Kartenlayout behoben.
4. Hinweis (kein Bug): Endgame-Fixture zeigt combat 25/295 — Fixture-Artefakt (kaum Monster-Kills
   im Fixture), nicht als Balance-Befund lesen.

*Screenshots des Laufs: Session-Scratchpad `f7-shots/` (f7-mid-01…09, f7-end-01…04). Wegwerf-Skript
fun-f7-tour.mjs nach dem Lauf gelöscht; Port 5296 bleibt in der SIM-AGENT-GUIDE-Registry dokumentiert.*
