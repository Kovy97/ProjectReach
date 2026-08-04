# Fun-Review RUNDE 3: Paragonturm — „Aldric Steigeisen, der Kletterer"

**Fun-Sweep RUNDE 3 · 2026-07-16 · Vorgeschichte: paragon-aldric.md (R1, Blocker-Wand) · retest-paragon-aldric.md (R2, Wand gefixt, stumme Truhen)**

## 1. Steckbrief — die Reise

Aldric ist der Spieler, für den der Turm DAS Spiel nach dem Spiel ist. **R1:** sein Aufstieg
endete an einer Etage-3-Wand, die sich nicht erklärte — Urteil 3/10, „ich komme nicht wieder".
**R2:** aus der Wand wurde eine Leiter (Rampe + Onramp), Auto-Aufstieg und Achievement-Leiter
kamen — aber der einzige Dopamin-Generator des Turms, die Meilenstein-Truhe, blieb STUMM
(mein P1), und Platte war die einzige gangbare Garderobe — 6/10, „morgen ja, in zwei Wochen
nur, wenn die Truhen klingeln lernen". **Heute, R3:** dritter Aufstieg. Kernfrage unverändert:
Kann ich an diesem Turm wochenlang klettern — und HÖRE ich jetzt, wofür?

**Methode:** 6 wertende Playwright-Live-Sessions (headless, Port 5313, Fixture `endgame`,
Locale de, 30 Screenshots `ui-audit/shots/rt3-aldric-*.png`, **0 Page-Errors über alle Läufe**)
+ deterministische Engine-Kletter-Sims (echte `deserialize`+`advance`-Ticks, Wegwerf-vitest,
8 Seeds je Build, Klettern E1→40). Referenz-Loadout = der Kapitel-20-„craft"-Sieger in seiner
kalibrierten Form: volles Godiron-Plattenset + Kiteschild + Streitkolben, Ägide III auf jedem
Panzerteil, Schärfe III auf der Waffe, Godgem-Schmuck, Seelenfeuer-Bankett (Auto-Eat S3),
Götzenblüten-Infusion @40 %, 3 Tonika, Kampfskills 92 (Fixture). Stoff-Stichprobe: volles
Sterngewebe + Voidcaller-Stab + Aetherium-Fokus, Abwehr-Runen III, gleiche Tränke, Auto-Eat S4.

## 2. Session-Protokoll

**S1 — Erstaufstieg (Platte, E1 manuell → Auto-Aufstieg E2–E7).** Das Panel empfängt mich wie
in R2: großes Artwork, „ETAGE 1 · Rekord: 0", sechs lesbare Stat-Kacheln, Truhen-Staffel,
Auto-Aufstieg-Toggle (`s1-01`). Etage 1 fällt in **21,7 s** (R2: 24,1 s · R1: 72 s — kumuliert
−70 %). Der Clear feuert den vertrauten Dreiklang (Erfolgs-Meilenstein +4 Marken, Boss-Achievement
+50 AP, „Neuer Rekord! Etage 1"). ABER: Nach dem manuellen Sieg stehe ich WIEDER ganz oben auf
der Zonenliste — Panel 1.627 px unterhalb des Viewports (`s1-03`), reproduziert mit echtem
Mausrad-Scrolling. Meine Scroller-Forensik erklärt, warum der Welle-KK-Fix hier nichts rettet
(s. Neue Funde #1). Dann Auto-Aufstieg an und der Satz, auf den ich zwei Runden gewartet habe:
**Etage 2, 3, 4, 5, 6, 7 fallen ohne einen einzigen Klick, die Seite BLEIBT im Kampfschirm**
(battleView durchweg an, kein Rauswurf zwischen Etagen), und beim E5-Boss erscheint — golden,
legendär, mit Gold-Barren-Icon — **„Meilenstein-Truhe! Etage 5: 2× Götzeneisenbarren, 2×
Leerenessenz"** (`s1-05`), daneben „Erster Aufstieg (+10 AP)" und genau EIN „Neuer Rekord!
Etage 5"-Toast. Kein Stapel aus fünf Legendär-Toasts: der Rekord-Toast aktualisiert sich selbst
(Welle KK), über 6 Etagen Auto-Kette stand nie mehr als einer. Session-Bilanz: +2.806 Gold in
6,9 min auf 482.000 = **+0,58 % Vermögen**.

**S1b — Der E10-Boss und Truhe 2.** „Weiter ab Etage 10" mit einem Klick, der Leeren-Titan
(4.992 HP, Verteidigung 107) ist wieder der 4–5-Minuten-Abnutzungskampf aus R2. Beim Clear der
volle Vierklang (`s1b-03`): Erfolgs-Meilenstein, **„Meilenstein-Truhe! Etage 10: 2×
Götzeneisenbarren, 1× Leerenessenz, 2× Seelenopal"** — die Tier-2-Staffel wird beim Namen
genannt —, „Standhafter Kletterer (+25 AP)", „Neuer Rekord! Etage 10". Drei Sekunden später
kämpft E11 bereits (Leerenroc, Trefferchance 55 % — die Ausweich-Rampe), die Toasts stehen noch.
Das Kampf-Log zeigt inzwischen echte Mathematik: „Kritischer Treffer! 102 Schaden (151 − 49 /
Gegner-Rüstung)", „Geblockt! −33" — der Turm ERKLÄRT im Log mehr als früher.

**S1c — Die Sonde nach oben.** Ab Checkpoint 13: E14 fällt nach ~3 min mit 252/377 HP, der
E15-Leerenroc-Boss lief nach weiteren 4 min noch. Ab Checkpoint 19: der E20-Schicksalsritter
(15.503 HP, Rampe exakt ×1,0) tötet den Fixture-Char in **7,5 min NICHT** — HP pendeln stabil
bei 233–263, aber sein Lebensbalken schmilzt kaum. Die Engine-Sim mit dem uniformen
92er-Referenz-Char stirbt dagegen frisch angesetzt auf E20 in **8/8 Seeds nach 0,8–4,1 min**.
Die „Wand" oberhalb ist also je nach Char-Ausbau Tod ODER zäher Nicht-Fortschritt — ein
Live-Patt endet still (der Stalemate-Text existiert nur im Offline-Popup).

**S2 — Preview-Parade, Truhen-Probe manuell, Re-Climb, Wiki.** Die Etagen-Previews E2/E4/E5/
E10/E20: alle Werte inkl. Tausenderpunkt lesbar, Ward getrennt (E2: Leben 685 · Ward 58; E14:
3.218 + Ward 709), Boss-Chip + Truhen-Hinweis sitzen. Weiterhin: lange Boss-Namen clippen
(„Verkohlter Schicksal…"), deutsche Labels brechen mitten im Wort („VERTEIDIGU NG",
„GENAUIGKEI T"), und **Enrage/Regeneration/Inflict fehlen komplett** — auf E20 sind das
Enrage ×1,8 und 35 % Brand, die niemand kommen sieht. Truhen-Strip: ✓-Haken je erreichter
Stufe, aber „Truhe 3" hat **keinen Tooltip** — die 5 Chase-Items à 1,5 % bleiben unsichtbar.
Re-Climb-Kontrolle (Rekord 20, E1 geclart): korrekt der kompakte „Etage bezwungen"-Toast,
kein Legendär. Manuelle Truhen-Probe (E5-Boss OHNE Auto-Aufstieg): der Truhen-Toast feuert
AUCH hier („Etage 5: 1× Götzeneisenbarren, 2× Leerenessenz", `s2-manual-chest-moment`) — aber
ich stehe dabei wieder oben auf der Zonenliste (Panel bei 1.626 px). Schlüssel-Wiki der
gesperrten Karte: als Quelle steht weiter NUR „Der Letzte Götze 8,0 %" — die seit Welle T
garantierte Kapitel-20-Belohnung fehlt dort immer noch.

**S2b — Kapitel 21 und Medaillon.** Chronik auf Kapitel 20 gesetzt: Kapitel 21 „Epilog: Der
zweite Band" hängt sauber am Turm (📍 Der Paragonturm, Balken 3/5), kippt bei Rekord 5 auf
EINLÖSBAR mit durchgestrichenem Ziel, vollem Wächter-Epilog und 10.000 Gold + 5 Marken
(`s2b-02`). Statistik-Seite: „Höchste Paragonetage: 5" im Kampf-Medaillon. Beides stabil.

**S3 — Stoff-Stichprobe (fair: Kalibrierung liegt im Balance-Block der nächsten Session).**
Sterngewebe-Caster mit Abwehr-Runen III, Tränken, Tonika, Auto-Eat S4: Ward 789 tankt E1–E3
komplett (HP bleiben bei 224), dann **Tod auf Etage 4 am Leerenroc mit hpMin 14** — exakt die
R2-Wand. Das Todes-Popup ist ehrlich (Monster benannt, „dein Rekord bei Etage 3 bleibt sicher",
„🗼 Zurück auf Etage 1"), die Auto-Kette endet sauber ohne Neustart — aber es gibt weiterhin
KEINE Analyse-Zeile und keinen „Wieder hinein"-Knopf, nur „Schließen".

**Zahlen (Engine-Sim, 8 Seeds je Build, Skills 92, alles craftbar):**

| Build | Ende | Kapitel 21 (E5) | Anmerkung |
|---|---|---|---|
| Stoff casual (o. Runen/Tränke) | Tod E3–4 (8/8) | **0 %** | TTK E1 36 s |
| Stoff + Abwehr-Runen III + Tränke | Tod E4 (8/8) | **0 %** | Tränke ändern die Todes-Etage NICHT |
| Stoff + Ägide III (± Tränke) | Tod E4–6 | 12,5 % | mit/ohne Tränke identisch |
| Platte nackt (o. Runen/Tränke) | Tod E6–10 (Median E10) | 100 % | wie R2 |
| **Platte + Runen + Tränke (Referenz)** | Tod E10–15 (Median E11) | **100 %** | TTK E1 22 s · E5 115,5 s · E10 281 s |
| dito, Skills 99 | Tod E10–15 | 100 % | Skill-Delta wirkungslos |

Leiter-Erreichbarkeit (Platte-Referenz): **E5 100 % · E10 87,5 % · E15 0 % · E20 0 %** — auf
den Prozentpunkt identisch mit R2, die Kalibrierung steht stabil. E20 frisch: 8/8 Tod in
0,8–4,1 min (Sim) bzw. >7,5 min ergebnisloser Kampf (Live-Fixture-Char). Ertrag: 373–431 Gold
je Etage (Median 428) auf der flachen 1,035er-Kurve; die beiden erlebten Truhen brachten
zusammen 3–4 Götzeneisenbarren, 3 Leerenessenzen, 2 Seelenopale.

## 3. Bewertungsbogen (R1 | R2 | R3 | Δ R2→R3)

| Aspekt | R1 | R2 | R3 | Δ | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 Min) | 5 | 7 | **8** | +1 | E1 in 21,7 s, Dreiklang beim ersten Clear, und die erste Truhe klingelt schon in Minute ~6 legendär mit Item-Liste. Abzug: der ehrliche Stoff-Sieger scheitert weiter in Minute 10. |
| Spaß über Zeit | 2 | 5 | **6** | +1 | Auto-Aufstieg trägt echte Sessions klickfrei durch steigende Boss-TTKs (22 s → 281 s), Truhen strukturieren den Bogen hörbar. Ertrag bleibt homöopathisch (+0,58 % Vermögen in 6,9 min), oberhalb E15 nur BiS-Territorium, Stoff-Achse tot. |
| Sucht-Faktor („eine Runde noch") | 3 | 6 | **7** | +1 | Die Kette E2→E7 ohne einen Klick, die Seite bleibt stehen, Rekord-Toast aktualisiert statt zu spammen — das IST der Kletter-Flow. Gekappt vom Nach-Sieg-Rauswurf im manuellen Modus und dem Tod ohne „Wieder hinein"-Klick. |
| Belohnungs-Dichte & Dopamin | 2 | 4 | **6** | +2 | Mein R2-P1 ist erfüllt: der Truhenmoment EXISTIERT — legendärer Toast mit konkreten Items + Icon, in beiden Modi, im selben Frame wie Achievement + Rekord. Was fehlt: die E20-Chase-Staffel bleibt unsichtbar (kein Tooltip), Gold/Etage flach, ein gescheiterter Lauf zahlt weiter auf nichts ein. |
| Ziel-Klarheit | 8 | 9 | **9** | 0 | Truhen-Strip mit ✓, „Weiter ab Etage N", Kapitel-21-Bogen mit Ortsmarke und würdigem Epilog, Medaillon. Die 10 scheitert daran, dass das attraktivste Ziel (Chase ab E20) nirgends beziffert wird. |
| Tiefe & Entscheidungen | 4 | 6 | **6** | 0 | Die Hebel sind unverändert real (Platte nackt E10 > Stoff voll E4) — aber der Turm LEHRT sie weiter nicht: keine Tod-Analyse, Killer-Werte fehlen in der Preview, und für Stoff bewegen Runen/Tränke die Todes-Etage aktuell gar nicht (Spike-Tod). Lichtblick: das Kampf-Log rechnet jetzt vor (Rüstungs-Abzug, Block). |
| Frustfreiheit | 3 | 6 | **7** | +1 | Der größte R2-Frust (stumme Truhe) ist weg; Tod-Popup ehrlich, Kette endet sauber, Wiedereinstieg ein Klick. Bleibt: Rauswurf an den Seitenanfang nach jedem manuellen Clear, Tod an unsichtbaren Werten, stilles Patt oberhalb der Wand. |
| Verzahnung | 8 | 9 | **9** | 0 | AP-/Marken-Ökonomie, Bestiarium/Slayer-Credit, Chronik-Finale, Stats-Medaillon, Truhen-Toast mit echten Item-Icons. Unverändert vorbildlich. |

**GESAMT-SUCHT-URTEIL: 3/10 → 6/10 → 7/10 (+1).** Der Drei-Runden-Trend ist eindeutig: aus
dem Papiertiger (R1) wurde ein funktionierendes Prestige-System (R2) und jetzt ein System, das
seine Belohnungen auch ZEIGT. Der Turm hat seinen Dopamin-Generator gefunden; was ihm zur 8
fehlt, ist die zweite Leiter (Stoff/Leder) und ein Chase-Schaufenster.

**„Komme ich morgen wieder?"** — Ja. Und zwar nicht mehr aus Tester-Pflicht: Auto-Aufstieg an,
Rekord 15 als Ziel, und die E20-Truhe als erster echter Chase-Horizont. Ob ich in einem Monat
noch klettere, hängt an zweierlei: ob mein Stoff-Magier je eine eigene Leiter bekommt (zugesagt
für die nächste Balance-Session — ich werde sie prüfen), und ob der Turm mir irgendwann SAGT,
dass in Truhe 3 fünf Chase-Items mit je 1,5 % schlummern, statt es mich im Quellcode nachlesen
zu lassen.

## 4. Runde-2-Funde-Verifikation

1. **Stumme Meilenstein-Truhen (mein P1!) → BEHOBEN.** Eigener Truhen-Toast (legendäre
   Aufmachung, 🎁/Item-Icon, konkrete Beute-Liste mit Mengen), live verifiziert auf E5 UND E10,
   im Auto-Aufstieg UND manuell; die Engine stempelt dafür einen Breadcrumb
   (`lastParagonChest`), der Auto-Ketten-Truhen kumuliert statt zu verlieren (Engine-Sim
   bestätigt seq/Kumulation). Genau die Umsetzung, die ich in R2 als Top-1 skizziert habe.
2. **Rekord-Toast-Inflation → BEHOBEN.** Auf dem Erstaufstieg über 6 Auto-Etagen stand zu
   jedem Zeitpunkt genau EIN „Neuer Rekord!"-Toast (aktualisiert sich selbst, Zählung im
   Sekundenraster: recordToastCount konstant 1); unterhalb des Rekords korrekt der kompakte
   „Etage bezwungen"-Toast. Der Legendär-Moment ist wieder etwas wert.
3. **Scroll-Wurf nach Clear → NICHT BEHOBEN (Fix greift am falschen Element).** Nach jedem
   manuellen Etagen-Clear lande ich am Seitenanfang der Zonenliste (Panel 1.627 px unter dem
   Viewport; reproduziert mit echtem Mausrad). Forensik: Der Welle-KK-Scroll-Anker lauscht auf
   `.content-body` — das hat auf der Kampfseite aber KEINEN Overflow (scrollHeight =
   clientHeight = 923 px); die Zonenliste scrollt tatsächlich in `.combat-main-area` /
   `.combat-select` (scrollHeight 2.758 px bei 875 px Fenster). Der Anker misst also immer 0
   und stellt 0 wieder her. Im Auto-Aufstieg irrelevant (kein View-Wechsel), im manuellen
   Modus voll da.
4. **Deutsche Label-Clips → TEILWEISE.** Werte seit R2/Welle CC voll lesbar (15.503 statt
   „LE… 1…"), Ward getrennt ausgewiesen. Aber: lange Stat-Labels brechen mitten im Wort
   („VERTEIDIGU NG", „GENAUIGKEI T") und lange Boss-Namen enden weiter in der Ellipsis
   („Verkohlter Schicksal…") — auf E5 wie E20.
5. **Unsichtbare Todesursachen (Enrage/Regen/Inflict fehlen in der Preview) → NICHT BEHOBEN.**
   Die E20-Preview zeigt 7 Kacheln, aber weder Enrage ×1,8 noch 35 % Brand-Inflict noch
   Regeneration. Man stirbt weiter an Werten, die nirgends stehen. Kleines Gegengewicht: das
   Kampf-LOG zeigt jetzt Rüstungs-/Block-Mathematik — nach dem Treffer statt vor der Etage.

## 5. Runde-2-Top-3-Check — erlebbar passiert?

1. **„Truhen zum Klingeln bringen" (Toast + E20-Vorschau) → ZUR HÄLFTE, die wichtige Hälfte.**
   Der Truhen-Toast ist da und sitzt genau im Clear-Moment — erlebt, nicht nur behauptet. Die
   zweite Hälfte fehlt: „Truhe 3" im Panel hat keinerlei Tooltip/Aufklapper mit den 5
   Chase-Items à 1,5 % (≈7,3 % je E20-Truhe auf ≥1 Chase, davon 30 % mit Suffix) — man
   klettert weiter, ohne zu wissen WOFÜR.
2. **„Der Turm lehrt, was er prüft" → NICHT PASSIERT.** Keine Analyse-Zeile im Tod-Popup
   (nur „Schließen"), keine Killer-Werte in der Preview, und die Stoff-/Leder-Kalibrierung
   steht aus — Letzteres ausdrücklich im Balance-Block der nächsten Session eingeplant, das
   werte ich nicht als gebrochenes Versprechen, sondern als offene Schuld. Messbar heute:
   Stoff stirbt in JEDER Ausbaustufe auf E4–6 (Kapitel 21: 0–12,5 % über 8 Seeds), und anders
   als in meinen R2-Messungen (Runen → E6, +Tränke → E9) bewegen Konsumierbaren-Hebel die
   Todes-Etage aktuell überhaupt nicht mehr — der Tod ist ein Spike (hpMin 14 bei 4.993
   Top-Food im Gepäck), gegen den Heil-Raten machtlos sind.
3. **„Auto-Aufstieg finishen + Tod-Moment schließen" → NICHT PASSIERT (Kern war schon R2).**
   Der Toggle funktioniert tadellos (Kette endet bei Tod sauber, kein Auto-Restart, Toggle
   bleibt für den nächsten Lauf an) — aber es gibt weiterhin keine Stopp-Regeln („vor
   Boss-Etage halten", „unter X Food stoppen"), keinen Panel-Anker nach manuellem Clear und
   keinen „Wieder hinein"-Knopf im Todes-Popup. Der Settings-Typ kennt nur das nackte Boolean.

## 6. Neue Funde

1. **BUG (P2) — Scroll-Anker zielt auf den falschen Container.** `CombatPage` sichert/
   restauriert `scrollTop` von `.content-body`, das auf der Kampfseite nie scrollt
   (scrollHeight = clientHeight); die Zonen-/Dungeon-/Paragon-Liste scrollt in
   `.combat-main-area`/`.combat-select`. Effekt: der in Welle KK adressierte
   Nach-Sieg-Rauswurf besteht im manuellen Modus unverändert fort (Panel nach Clear 1.627 px
   unterhalb des Viewports, Mausrad-reproduziert). Fix-Hinweis: denselben Listener auf den
   echten Scroller hängen (oder das Panel nach Turm-Clears gezielt ankern).
2. **BALANCE (Beobachtung mit Messwert) — Stoffs Konsumierbaren-Leiter ist flach geworden.**
   R2 maß für Stoff noch Zwischenstufen (T3-Runen → Tod E6, +Tränke → Tod E9); heute enden
   ALLE Stoff-Ausbaustufen bei Tod E4–6 (0–12,5 % Kapitel 21), Tränke/Runen-Wahl/Futter ändern
   die Todes-Etage nicht mehr messbar — der E4-Leerenroc tötet per Burst durch Ward+Food
   hindurch. Teil-Unsicherheit: meine R2-Builds sind nicht bit-genau rekonstruierbar. Aber der
   heutige Zustand ist eindeutig: für Nicht-Platte gibt es unterhalb der zugesagten
   Neu-Kalibrierung keinen kaufbaren Fortschritt im Turm.
3. **POLISH — Stilles Patt an der Wand.** Der E20-Kampf des starken Fixture-Chars lief 7,5 min
   ohne Fortschritt und ohne jede UI-Ansage; die Stalemate-Erklärung („keine Seite konnte
   treffen") existiert nur im Offline-Popup. Wer an der Wand parkt, erfährt live nicht, DASS
   er parkt — mit Auto-Aufstieg wartet man auf ein Ende, das ggf. der 60-s-Detektor bringt,
   ohne es zu benennen.
4. **POLISH — Ausrüstungs-Raster blinkt nach Kampfende leer.** Direkt nach dem View-Wechsel
   Kampf → Zonenliste rendert das Ausrüstungs-Panel der Kampf-Sidebar einen Moment lang nur
   leere Goldrahmen (lazy geladene Icons re-mounten); Sekunden später ist alles wieder da.
   Kosmetisch, aber im meist-gesehenen Übergang des Turms.
5. **POLISH — Schlüssel-Wiki weiter unvollständig (R2-Fund #5, unverändert).** Quelle nur
   „Der Letzte Götze 8,0 %"; die garantierte Kapitel-20-Belohnung fehlt — Vor-Unlock-Spieler
   planen mit einer falschen 8-%-Grind-Erwartung.
6. **Beobachtung (positiv):** Das Kampf-Log erklärt inzwischen Treffermathematik
   („151 − 49 / Gegner-Rüstung", „Geblockt! −33") — die halbe Miete für „der Turm lehrt";
   es fehlt nur der Transport dieser Info in Preview/Tod-Moment. Und: Boss-Etagen tragen im
   Kampf-Banner jetzt einen 💀-Boss-Tag.

## 7. Meine Top-3 für Runde 4

1. **Das Chase-Schaufenster öffnen.** Tooltip/Aufklapper auf „Truhe 3" (und dem
   Truhen-Hinweis der Boss-Preview) mit den konkreten 5 Chase-Items und ihren 1,5 % — dieselbe
   Silhouetten-Technik wie die Dungeon-Beute-Vorschau, die das Spiel bereits kann. Der Turm
   hat jetzt einen hörbaren Dopamin-Generator; gebt ihm ein Schaufenster, damit man schon auf
   E12 weiß, warum E20 der Traum ist. (Kleinster Aufwand, größter Sucht-Hebel.)
2. **Die zweite Leiter bauen — und den Spike entschärfen.** Die zugesagte Stoff-/Leder-
   Kalibrierung so schneiden, dass Konsumierbaren-Hebel wieder Etagen kaufen (aktuell: Stoff
   E4–6 in JEDER Ausbaustufe, Hebel-Wirkung 0 Etagen): z. B. Ward-Bruch-Schutz oder
   Ausweich-/Ward-Skalierung gegen die Etagen-Kurve, plus Korridor-Guard, der den Magier in
   STOFF testet statt in Platte. Dazu die Killer-Werte (Enrage/Inflict/Regen) endlich in die
   Preview und eine Analyse-Zeile ins Tod-Popup — die Log-Mathematik existiert schon, sie muss
   nur an die richtige Stelle.
3. **Die letzten Reibungen im Loop wegschleifen.** (a) Scroll-Anker auf den echten Container
   (`.combat-select`) — ein Einzeiler-Bug mit Dauerwirkung; (b) „Wieder hinein (Etage 1)"-
   Button im Todes-Popup; (c) Stopp-Regeln für den Auto-Aufstieg („vor Boss-Etage halten",
   „unter X Food stoppen"); (d) Live-Patt benennen (Toast „Keine Seite macht Fortschritt —
   Kampf beendet"). Danach ist der manuelle Modus so rund wie die Auto-Kette — und der Turm
   für mich eine 8.
