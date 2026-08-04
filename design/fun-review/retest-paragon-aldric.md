# Fun-RETEST: Paragonturm — „Aldric Steigeisen, der Kletterer"

**RETEST R5 · 2026-07-16 · Erstbesuch: Fun-Sweep F5 (paragon-aldric.md)**

## 1. Steckbrief

Aldric ist der Spieler, für den der Turm DAS Spiel nach dem Spiel ist. Beim Erstbesuch endete
sein Aufstieg an einer Etage-3-Wand (BLOCKER) — heute prüft er, ob aus der Wand eine Leiter
wurde. Maßstab unverändert: Steigt die Spannung pro Etage? Ist der Tod ein „nochmal!"? Gibt es
Build-Anpassung zwischen Läufen? **Kann ich an diesem Turm wochenlang klettern?**

**Methode:** 3 Playwright-Live-Sessions (headless, Port 5305, Fixture `endgame`, Locale de,
27 Screenshots `ui-audit/shots/rt-aldric-*.png`, **0 Page-Errors**) + 12 deterministische
Engine-Kletter-Sims (echte `deserialize`+`step`-Ticks, Wegwerf-vitest, 8 RNG-Seeds je
Kernvariante). Loadout diesmal bewusst **realistischer Kapitel-20/21-Sieger, NICHT BiS**, in
ehrlichen Ausbaustufen (alles 100 % craftbar, null Chase, keine Suffixe):

- **„Stoff-Casual":** volles Sterngewebe-Set (die Caster-Fantasie der Rüstungs-Trinität) +
  Voidcaller-Stab + Aetherium-Fokus + Göttenstein-Schmuck, keine Runen, keine Tränke, 400
  Top-Food, Auto-Eat S4. Kampfskills 92, Ges.-Lv 1915.
- **Zwischenstufen:** dito + Tier-III-Runen, + Tränke/Tonika.
- **„Platte-Kletterer":** Godiron-Plattenset + Kiteschild + Streitkolben, T3-Runen
  (Schärfe/Ägide), Seelenfeuer-Bankett, Auto-Trank @40 %, 3 Tonika.

## 2. Session-Protokoll

**Session 1 — der ehrliche Wiedereinstieg (Stoff-Casual).** Das Panel empfängt mich verwandelt:
großzügige Karte mit großem Artwork, „ETAGE 1 · Rekord: 0", sechs LESBAREN Stat-Kacheln
(585 Leben / 70 Schaden / 27 Verteidigung / 20 Genauigkeit / 1 Ausweichen / 3,4s), Truhen-Staffel
(„Etage 5: Truhe 1 · Etage 10: Truhe 2 · Etage 20: Truhe 3") und Auto-Aufstieg-Toggle
(`rt-aldric-02-panel-fresh.png`). Die Quest-Seite hakt sauber ein: Kapitel 21 „Epilog: Der
zweite Band · Erreiche Etage 5 · 📍 Der Paragonturm · 0/5" (`rt-aldric-01-quest-ch21-fresh.png`).
Etage 1 fällt in **31,6 s** (alt: 72 s — der Onramp wirkt), der Clear feuert organisch dreifach:
Rekord-Toast + Boss-Achievement „Eiserner Wille" + Erfolgs-Meilenstein +4 Marken
(`rt-aldric-05-after-clear-floor1.png`). ABER: Nach dem Sieg stehe ich wieder GANZ OBEN auf der
Zonenliste (gemessen: scrollY 0, Panel außerhalb des Viewports) — der neue goldene „Weiter ab
Etage 2"-CTA existiert, wohnt aber weiter am Seitenende unter Zonen + Dungeons. Ab Etage 3
Auto-Aufstieg an (`rt-aldric-06-autoascend-on.png`) — und auf **Etage 4 sterbe ich am
Leerenroc**, mit 396/400 Essen im Gepäck und hpMin 7,4 unterwegs (Auto-Eat +36+11 % kommt gegen
~82er-Hits auf einem 230-HP-Pool nicht an). Das Todes-Popup (`rt-aldric-11-death-popup.png`):
„Kein Verlust bei Ausrüstung und Gold — dein Rekord bei Etage 3 bleibt sicher. 🗼 Zurück auf
Etage 1." — ehrlich, widerspruchsfrei, Rekord benannt; danach startet nichts ungefragt neu.
Kapitel 21 steht bei 3/5 (`rt-aldric-13-quest-ch21-done.png`), die erste Truhe habe ich NIE
gesehen. Sim über 8 Seeds bestätigt: Stoff-Casual stirbt zu **100 % auf Etage 3–4**
(Todes-Etagen [4,4,4,3,3,4,4,4]) — **0 % Kapitel-21-Abschluss**. Auch das alte BiS-Chase-Set
ohne Runen stirbt auf E4. Für diese Builds ist die Wand des Erstbesuchs nur um genau eine Etage
gewandert.

**Session 2 — der präparierte Kletterer (Platte).** Der Umbau auf Godiron-Platte + Runen +
Tränke ist exakt die Roguelite-Build-Anpassung, die ich beim Erstbesuch vermisst habe — und sie
WIRKT dramatisch: E1 in 24,1 s, der E5-Boss (2.832-HP-Schicksalsritter,
`rt-aldric-21-floor5-boss.png`) fällt nach 122,5 s, und beim Clear feuern „Erster Aufstieg
(+10 AP)" + „Neuer Rekord! Etage 5" zusammen (`rt-aldric-22-floor5-cleared.png`). Kapitel 21
wird EINLÖSBAR — durchgestrichenes Ziel, voller Wächter-Epilog („… Die Götterkriege stehen
aus — und die Chronik endet nicht."), großer Abschluss-Button — während der Kampf im
Hintergrund weiterläuft (`rt-aldric-23-bg-climb-quests.png`; Seitenwechsel bei E7, der Kampf
lief nach — idle-gerecht). Der E10-Boss Leeren-Titan (4.992 HP) ist ein **271-Sekunden-
Abnutzungskampf**; der Titan trifft meine Platte nur noch einstellig, dafür kaue ich minutenlang
an seiner Verteidigung 107 (`rt-aldric-24/25`). Ab E11 greift die Ausweich-Rampe sichtbar:
Trefferchance gegen den Leerenroc fällt auf 55 %, 214 s für eine NORMALE Etage. Mitten auf E12
fliehe ich absichtlich: Checkpoint 11 bleibt, Panel sagt „Weiter ab Etage 12", Truhen 1+2
abgehakt, Auto-Aufstieg bleibt an (`rt-aldric-26-left-midrun-panel.png`) — faire
Session-Grenze, Wiedereinstieg ein Klick. Nach **25 Minuten** endet die Session am Zeit-Cap bei
**Rekord 13, ohne Tod** (E14 lief noch); die Sim-Seeds verorten den Platte-Tod auf E10–15
(Todes-Etagen [10,11,11,15,15,15,15,15] → medianer Rekord 14). Gold-Bilanz der ganzen Session:
+6.054 auf 482.000 (**+1,3 % Vermögen in 25 min**, inkl. zweier Truhen). Die Achievement-Leiter
lebt sichtbar mit: „Erster Aufstieg" und „Standhafter Kletterer" golden freigeschaltet, „Wo die
Luft dünn wird" bei 13/15 (`rt-aldric-31-achievements-ladder.png`), Stats-Medaillon „Höchste
Paragonetage: 13" (`rt-aldric-32`).

**Session 3 — Preview-Tiefencheck, Truhen-Probe, Abschluss-Moment.** Die gesperrte Karte sagt
weiter „Paragon-Schlüssel gesucht"; das verlinkte Item-Wiki nennt als Quelle NUR „Der Letzte
Götze 8,0 %" (`rt-aldric-41-key-wiki.png`) — dass Kapitel 20 den Schlüssel garantiert liefert,
steht dort nicht. Die Preview-Karten (E2/E4/E5/E10/E20, `rt-aldric-42-preview-e*.png`): Werte
inkl. Tausenderpunkt voll lesbar, der Eishexer zeigt jetzt **Leben 685 + Ward 58 getrennt**,
der Leerenroc sein Ausweichen 35, Boss-Chip + Truhen-Hinweis sitzen. Aber: lange Namen clippen
(„Verkohlter Schicksal…"), deutsche Labels ellipsieren („VERTEIDIG…", „GENAUIGKE…"), und
**Enrage/Regeneration/Inflict fehlen komplett** — auf E20 sind das Enrage ×1,8 und 35 %
Brand-Inflict, die niemand kommen sieht. Die manuelle Truhen-Probe (E5-Boss ohne Auto-Aufstieg):
Inventar +3 Götzeneisenbarren +1 Leerenessenz — aber auf dem Bildschirm existiert davon
NICHTS: einziger Toast „Neuer Rekord!", die Kampfansicht (mit dem Loot-Log) ist beim
Etagen-Ende bereits unmountet, ich stehe oben auf der Zonenliste
(`rt-aldric-45-chest-moment-manual.png`). Kapitel-21-Abschluss nachgeholt: **+10.000 Gold,
+5 Marken** (23→28), die Chronik schließt mit „Jedes geschriebene Kapitel ist eingelöst. Die
Chronik ruht — vorerst." (`rt-aldric-46-ch21-claimed.png`) — ein würdiger, stiller Serien-
Schluss. Re-Climb-Kontrolle: Unterhalb des Rekords gibt es korrekt den kompakten „Etage
bezwungen"-Toast statt Legendär (`rt-aldric-44-reclimb-toast.png`).

**Zahlen (Engine-Sim, deterministisch; Live-Werte decken sich auf ±2 s):**

| Build (alles craftbar) | Ende | Kapitel 21 (E5) | Kampfzeit bis Ende |
|---|---|---|---|
| Stoff casual (Sterngewebe, o. Runen/Tränke) | Tod E3–4 (8/8 Seeds) | **0 %** | ~2,7 min |
| Fixture-BiS-Chase (o. Runen/Tränke) | Tod E4 | 0 % | ~3,0 min |
| Stoff + T3-Runen | Tod E6 | ja, knapp (E4-Clear mit 22 HP!) | ~8,3 min |
| Stoff + Runen + Tränke | Tod E9 | ja | ~13,3 min |
| **Platte NACKT** (o. Runen/Tränke) | Tod E10 | ja | ~12,3 min |
| Platte + Runen | Tod E10 | ja | ~14,1 min |
| Platte + Runen + Tränke (Korridor-Bauart, Skills 92) | Tod E10–15 | **100 %** | 14–30 min |

Ablesbar: **Die Rüstungsklasse dominiert alles.** Platte ohne jede weitere Investition trägt
weiter (E10) als Stoff mit maximalem Consumable-Einsatz (E9) — Mitigation skaliert gegen die
Schadenskurve, Ward/HP-Pools nicht. Zweite verdeckte Achse: die Ausweich-Etagen des Leerenroc
(E4 eva 35, E15 eva 70, E30 eva 86). Erreichbarkeit der Achievement-Leiter mit dem besten
Craft-Build (Platte voll, Skills 92, 8 Seeds): **E5 100 %, E10 87,5 %, E15 0 %, E20+ 0 %** —
ab E15 beginnt wie designt Suffix-/BiS-Territorium. Ertrag: ~350–550 Gold je Etage (flache
1,035er-Kurve), XP bei Lv 92+ bedeutungslos; Boss-Truhe Tier 1 ≈ 1.500–1.900 Gold Materialwert
je 5 Etagen; E20-Truhe: 5 Chase-Rows à 1,5 % → **7,3 % Chance auf ≥1 Chase-Item pro
E20+-Truhe**, davon 30 % mit Suffix (⇒ 2,2 % je Truhe auf suffixed Chase).

## 3. Bewertungsbogen (alt → neu → Δ)

| Aspekt | alt | neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 Min) | 5 | **7** | +2 | Prächtiges Panel, E1 in 24–32 s statt 72 s, Dreifach-Feedback beim ersten Clear — aber der ehrliche Stoff-Sieger scheitert weiter in Minute 10. |
| Spaß über Zeit | 2 | **5** | +3 | Echter 25-min-Session-Bogen mit steigenden Boss-TTKs und fühlbarer Build-Progression (E4→E15); oberhalb E15 nur noch BiS-Chase, Ertrag pro Etage bleibt homöopathisch, Truhen stumm. |
| Sucht-Faktor („eine Runde noch") | 3 | **6** | +3 | Auto-Aufstieg + persistenter Checkpoint + „Weiter ab Etage N" machen Weiterklettern fast klickfrei; Leiter und Rekord ziehen. Stumme Truhen und die E15-Decke kappen den Kick. |
| Belohnungs-Dichte & Dopamin | 2 | **4** | +2 | Truhen/AP/Marken existieren und sind gestaffelt sichtbar — aber der zentrale Truhenmoment ist UNSICHTBAR, und +1,3 % Vermögen in 25 min trägt kein Dopamin. |
| Ziel-Klarheit | 8 | **9** | +1 | Truhen-Strip im Panel, Achievement-Leiter mit Live-Balken, Kapitel-Ortsmarke, Rekord in Panel/Stats/Popup — vorbildlich. |
| Tiefe & Entscheidungen | 4 | **6** | +2 | Rüstungsklasse, Runen, Tränke, Stances sind echte Hebel mit messbaren Folgen (E4 vs. E15!) — aber das Spiel LEHRT keinen davon, und „Platte für alle Stile" kannibalisiert die Rüstungs-Trinität. |
| Frustfreiheit | 3 | **6** | +3 | Ehrliches Todes-Popup, faires Verlassen/Wiedereinstieg, Auto-Aufstieg entschärft den Re-Climb. Bleibt: Stoff-Wand auf E4 fühlt sich exakt wie der alte Blocker an, und man stirbt an unsichtbaren Werten. |
| Verzahnung | 8 | **9** | +1 | Kill-Credit in Bestiarium/Slayer/Achievements, Kapitel-21-Bogen mit würdigem Finale, AP-/Marken-Ökonomie, Stats-Medaillon, Hintergrund-Klettern bei Seitenwechsel. |

**GESAMT-SUCHT-URTEIL: 3/10 → 6/10 (+3).** Der Turm ist vom Papiertiger zum funktionierenden
Prestige-System geworden — mit zwei stummen Stellen genau dort, wo die Sucht wohnen müsste
(Truhenmoment, Build-Feedback).

**„Komme ich morgen wieder?"** — Ja. Morgen ja: Rekord 13 will auf 15, und die Leiter zeigt
mir den Balken dafür. Aber ob ich in zwei Wochen noch klettere, entscheidet sich daran, ob der
Turm bis dahin lernt, seine Truhen zu zeigen und meinem Stoff-Magier eine eigene Leiter zu
bauen — sonst endet die Reise wieder bei „Platte anziehen oder gehen".

## 4. Top-3-Verifikation (meine alten Empfehlungen)

1. **„Einstiegskurve an den Kap.-19/20-Sieger kalibrieren" → GUT umgesetzt, mit blindem
   Fleck.** Exakt der vorgeschlagene Hebel wurde gebaut: Sekundärwert-Rampe ×0,3→×1,0 bis E20
   plus HP-Onramp ×0,65→×1,0 bis E5 (engine/paragon.ts, sogar mit Verweis auf meinen Befund).
   TTK Etage 1 liegt bei 24–32 s (Ziel ≤30 s getroffen), Kapitel 21 ist mit dem kalibrierten
   Referenz-Build zu 100 % machbar, erlebt bis E13+ ohne Tod. ABER: Kalibriert wurde auf ein
   Platte-Referenz-Loadout (auch für „Magier": Wand+Schild+PLATTE) — der ehrliche Stoff-Caster
   und das Chase-Set ohne Runen sterben weiter VOR Etage 5 (0 % über 8 Seeds). Die Rampe hat
   die Wand für die halbe Garderobe des Spiels nur von E3 auf E4 geschoben.
2. **„Den ‚eine Etage noch'-Klick in den Clear-Moment legen" → GUT zur Hälfte.** Der
   Auto-Aufstieg-Toggle existiert (opt-in, endet sauber bei Tod/Verlassen — im Code als
   „Aldric A2" geführt) und der Weiter-Button hat CTA-Prominenz samt Etagen-Nummer. Was fehlt:
   der Klick IM Clear-Moment — nach jedem manuellen Sieg lande ich am Seitenanfang der
   Zonenliste (scrollY 0, Panel unsichtbar) und muss zum CTA scrollen; Stopp-Regeln („vor
   Boss-Etage", „unter X Food") gibt es nicht; Zwischencheckpoints bleiben bewusst „später".
3. **„Den Aufstieg sichtbar veredeln" → GUT.** Paragon-Achievement-Leiter E5/10/15/20/25/30
   (Rarität sauber gestaffelt bis legendär) mit Live-Fortschrittsbalken; Truhen-Staffel als
   ✓-Strip im Panel; Preview-Karte auf volle Breite mit 6–7 gelabelten Stats inkl. Ward. Es
   fehlen: eine Turm-Meta (Paragon-Marken o. Ä. — ein gescheiterter Lauf zahlt weiter auf
   nichts ein) und die Killer-Werte in der Preview (s. u.).

## 5. Bug-Verifikation (Alt-Befunde)

1. **Etage-3-Wand (Blocker):** BEHOBEN für den kalibrierten Referenz-Pfad — Korridor-Guard
   friert „E1→E5 ≥70 % je Stil" als Test ein, live bestätigt bis E13+ ohne Tod. **Nicht
   behoben** für Stoff-/Ward-Builds und Drop-Gear ohne Runen: Tod auf E3–4, Kapitel 21 dort
   weiter unerreichbar (0 % über 8 Seeds). Aus „Wand für alle" wurde „Wand für Nicht-Platte".
2. **Preview-Clipping:** WERTE behoben (Karte verbreitert, „15.503" statt „LE… 1…"). Lange
   NAMEN clippen weiterhin („Verkohlter Schicksal…"), ebenso deutsche Stat-Labels
   („VERTEIDIG…", „GENAUIGKE…").
3. **Death-Popup-Widerspruch:** BEHOBEN. Neue Zeile „Kein Verlust bei Ausrüstung und Gold —
   dein Rekord bei Etage {n} bleibt sicher" + „🗼 Zurück auf Etage 1" — ehrlich und
   rekord-bewusst formuliert.
4. **Ward in der Preview verschwiegen:** BEHOBEN — Eishexer zeigt „Leben 685 · Ward 58"
   getrennt.
5. **Rekord-Toast-Inflation (Beobachtung):** unverändert vorhanden — auf dem Erstaufstieg ist
   JEDE Etage ein legendärer „Neuer Rekord!" (13 legendäre Toasts in einer Session); im
   Re-Climb korrekt der kompakte „Etage bezwungen"-Toast. Ab E20+ bleibt die Entwertung des
   Legendär-Moments ein Risiko.

## 6. Neue Funde

1. **BUG (P1) — Die stumme Meilenstein-Truhe.** Truhen-Loot erzeugt keinerlei sichtbares
   Feedback: kein Toast (das Toast-System difft nur seltene Funde — die garantierten
   Truhen-Materialien sind common), und das Kampf-Log, in dem die Loot-Zeilen landen, ist beim
   Etagen-Ende nicht mehr auf dem Bildschirm (Battle-View unmountet; mit Auto-Aufstieg ersetzt
   die nächste Etage das Log sogar im selben Tick). Live verifiziert in BEIDEN Modi: E5-Truhe
   gab 3× Götzeneisenbarren + 1× Leerenessenz ins Inventar — auf dem Schirm war davon nichts.
   Das im Panel beworbene Kern-Versprechen des Turms ist im Spiel unsichtbar.
2. **BUG (P1, Balance) — Rüstungsklassen-Gate bricht die Trinität im Turm.** Machbarkeit hängt
   dominant an Platte/Mitigation: Platte nackt E10 > Stoff voll ausgebaut E9; Stoff casual E4.
   Der eigene Korridor-Test rüstet selbst den Magie-Referenz-Build mit Platte+Schild aus. Die
   Rüstungs-Trinität verkauft Stoff=Ward als Caster-Weg — im Endlos-Turm ist er strukturell
   der kürzeste. Kein In-Game-Hinweis (Preview, Tod-Popup, Hilfetext) macht diesen Hebel
   sichtbar; man findet ihn nur durch wiederholtes Sterben oder Externes.
3. **POLISH — Nach-Sieg-Rauswurf.** Jeder manuelle Etagen-Clear wirft an den Seitenanfang der
   Zonenliste (scrollY 0); Panel + CTA liegen unterhalb von 9 Zonen- und 8+ Dungeon-Karten.
4. **POLISH — Preview verschweigt die Killer-Werte.** Enrage (bis ×1,8), Regeneration und
   Inflict (E20: 35 % Chance) fehlen in der Etagen-Vorschau komplett — genau die Werte, die ab
   E10 über Leben und Tod entscheiden, während harmlosere (Tempo, Verteidigung) angezeigt werden.
5. **POLISH — Schlüssel-Wiki unvollständig.** Die gesperrte Karte verlinkt das Item-Wiki, das
   als einzige Quelle „Der Letzte Götze 8,0 %" nennt — die seit Welle T garantierte
   Kapitel-20-Belohnung fehlt; Vor-Unlock-Spieler planen mit einer falschen Grind-Erwartung.
6. **POLISH — Stat-Label-/Namens-Ellipsis** in den Preview-Kacheln (s. Bug-Verifikation 2).
7. **Beobachtung (positiv):** Kein Auto-Restart nach Turm-Tod (Kette endet korrekt, Toggle
   bleibt für den nächsten Lauf an); Flucht mitten in der Etage kostet nur die laufende Etage,
   nicht den Checkpoint; Hintergrund-Klettern über Seitenwechsel funktioniert.

## 7. Neue Top-3 für mehr Sucht-Faktor

1. **Truhen zum Klingeln bringen.** Ein eigener Truhen-Toast im Clear-Moment (Icon + konkrete
   Item-Liste; legendäre Aufmachung, wenn eine Chase-Row zieht) plus die Loot-Zeilen in einer
   Nach-Kampf-Zusammenfassung, die den View-Wechsel überlebt. Dazu im Panel die E20-Staffel
   greifbar machen: Tooltip/Aufklapper auf „Truhe 3" mit den 5 Chase-Items und ihren 1,5 % —
   zeigen, WOFÜR man klettert. Der Turm hat genau einen Dopamin-Generator; er muss hörbar sein.
2. **Der Turm muss lehren, was er prüft.** (a) Tod-Popup um eine Analyse-Zeile erweitern
   („Der Leerenroc wich 45 % deiner Treffer aus — Genauigkeit hilft" / „14 Treffer à ~80 —
   Rüstung/Mitigation hilft"); (b) Enrage/Regen/Inflict in die Etagen-Preview; (c) mittelfristig
   Stoff-/Leder-Pfade kalibrieren (z. B. Ward-Regen- oder Ausweich-Skalierung gegen die
   Etagen-Kurve), sodass die Trinität DREI gangbare Leitern hat statt einer — der Korridor-Guard
   sollte den Magier-Build in Stoff testen, nicht in Platte.
3. **Auto-Aufstieg finishen + Tod-Moment schließen.** Stopp-Regeln („vor Boss-Etage halten",
   „unter X Food/Tränke stoppen"), nach manuellem Clear ein Anker aufs Panel statt Seitenanfang,
   und im Todes-Popup ein direkter „Wieder hinein (Etage 1)"-Knopf — der Re-Climb beginnt dann
   im Moment der Niederlage statt nach einer Scroll-Expedition. Perspektivisch: Paragon-Marken
   je Erst-Clear als kleine Turm-Meta, damit auch der gescheiterte Lauf einzahlt.
