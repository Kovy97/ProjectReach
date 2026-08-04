# Fun-Sweep RUNDE 3 — Dungeons als Wiederhol-Loop („Grete Beutezug", Dungeon-Farmerin)

**Datum:** 2026-07-16 · **Runde 3 zu:** `dungeons-grete.md` (R1) + `retest-dungeons-grete.md` (R2) ·
**Methode:** Playwright-Sim-Harness (Port 5314, Endgame-Fixture „Korveth" CL 96, locale DE, Dungeons
per In-Memory-Patch frei). Wegwerf-Skripte `rt3-grete-*.mjs` nach dem Lauf gelöscht, Harness gestoppt
(Port-Check: kein Listener). Screenshots `ui-audit/shots/rt3-grete-01…27.png`, alle gesichtet.
Unabhängig erhoben — nur meine zwei eigenen Berichte gelesen, keine Plan-/Status-/Patchnotes-Dateien;
alle Urteile aus dem laufenden Spiel (plus gezielte Code-/Asset-Verifikation einzelner Live-Beobachtungen).

## 1. Steckbrief — die Reise R1 → R2 → R3

**Persona:** Grete Beutezug — wiederholt Dungeons für Chase-Drops und Clear-Effizienz. Die Spielerin
mit 300 Warband-Clears für das 0,3-%-Spaltbeil — wenn die Jagd fair kommuniziert ist.

| Runde | Zustand des Loops für Grete |
|---|---|
| R1 | Guter Rhythmus, blinde Jagd: null Beute-Info auf den Karten, die 0,1-%-Kette existierte für die Spielerin nicht. Gesamt 7/10. |
| R2 | Die Jagd wurde ehrlich: Beute-Chips mit Immer-%, Thron-Boss-Intro, Photobomb weg. Aber: der größte Jackpot des Spiels war sein leisester (kein Toast für godly/superRare), Ward-Wand unerklärt, Kleinkram (Singular, Dezimal-Mix, Scroll-Reset). Gesamt 8/10. |
| R3 (jetzt) | Der Jackpot klingelt jetzt am obersten Ende — godly/superRare haben eine eigene, goldene, länger stehende Fanfare-Stufe. Singular und Dezimal-Format sind sauber, Verteidigungs-Badges leben auf den Monsterkarten. Liegen geblieben: Scroll-Reset, Dry-Streak/Pity (bewusst im Balance-Block), und die Bühnen warten weiter auf ihre Stars (Chef-Art). |

| Session-Setup R3 | Details |
|---|---|
| Charakter | Endgame-Fixture „Korveth Grimhollow", CL 96, Magie-Fokus offensiv 97, Auto-Eat S4, Abgrund-Festmahl |
| Gespielt | Karten-Studie aller 7 Dungeon-Karten + Paragonturm · 3 komplette Warband-Läufe in Echtzeit · 1 Thron-Lauf (Intro echt; Drazhan per HP-Patch gefällt — bewusst KEIN Balance-Urteil) · 2 Warband-Schnellläufe (Toast-Kontrolltests rare vs. superRare) · Item-Wiki-, Bestiarium-, Optionen-Studie |
| Erzwungene Momente | sevenfold_crown_chain (godly) auf 100 % am Thron · voidstone_ring (superRare) + diamond_ring (rare, Kontrollgruppe) auf 100 % auf Warband |
| Messwerte | Warband: 55 s / 48 s / 48 s pro Lauf · 600 g + 350 XP/Clear (Erstclear 1.200 g) · Thron: 16.000 g + 24.000 XP (Erstclear ×2) |

## 2. Session-Protokoll

1. **Ankunft (rt3-grete-01):** Das „Der Wächter — Das Schlachtfeld"-Tour-Popup feuert WEITER für den
   CL-96-Fixture-Charakter und dimmt die Kampfseite (R2-Beobachtung #8, unverändert; vermutlich
   Fixture-Artefakt mit leeren Tour-Flags).
2. **Karten-Studie (rt3-grete-02/03):** Die Beute-Vorschau ist unverändert das Herzstück — und die
   Thron-Karte sagt jetzt **„Lv 95 · 1 Welle"**. Der Singular sitzt (R2-Fund #5 behoben). Alle
   %-Chips lokalisiert mit Komma: „0,80%", „0,20%", „0,10%". Der Ketten-Chip ist weiterhin ein
   nacktes „?" ohne Silhouetten-Tease (kein Item-Art vorhanden — Chef-Lieferung).
3. **Dezimal-Gegenprobe (rt3-grete-04):** Chip-Klick → Item-Wiki: „Quelle: Goblin-Hexenmeister
   **0,10%** · Die Goblin-Kriegsbande **0,80%**" — Komma wie auf der Karte. Der Karte-vs.-Wiki-Mix
   aus R2 (Fund #6) ist tot. Auch das Bestiarium formatiert jetzt mit Komma („0,01%", s. Punkt 8).
4. **Monsterkarten (rt3-grete-05):** Jede Auswahl-Karte trägt jetzt ein **Verteidigungs-Badge** —
   „Gepanzert" / „Flink" / „Beschildet" — mit Konter-Tooltip („Schützt Lebenspunkte mit einem
   Ward-Pool … Gekontert durch Ward-Durchbruch."). Vom Huhn (Flink) bis zum Leeren-Herold
   (Beschildet) durchgängig. Die verwaisten Übersetzungen aus R2 (Fund in Bug-Verifikation #4) sind
   verdrahtet — das Trinity-Vokabular wird jetzt im normalen Spiel gelernt.
5. **Drei echte Warband-Läufe (rt3-grete-10…14):** 55/48/48 s, Wellen-Ansage + Totenkopf-Leiste +
   „Beute 0/3" wie gehabt exzellent. Nach 3 Clears: „✓ 3" auf der Karte, 4 von 5 Chips aufgedeckt —
   der eine hakenlose 0,80-%-Chip ist sichtbar der Köder für Lauf 4. ABER: Nach jedem „Weiter" lande
   ich bei scrollY=0 (Zonen oben); der Betreten-Button liegt bei 1081 px — einen Pixel unter dem
   1080er-Viewport. **Scroll-Reset aus R2 (Fund #7) besteht exakt fort**; am Thron liegt der Button
   nach „Weiter" sogar bei 1431 px. Jeder Lauf bleibt Scrollen+Klick.
6. **Thron-Auftritt (rt3-grete-20):** Vollbild-Intro „BOSS-BEGEGNUNG — DRAZHAN DER KRONLOSE — Macht
   euch bereit…" vor Welle 1, ohne Chest-Flash-Lüge — dramaturgisch weiter richtig. Drazhan selbst:
   im Intro kein Bild, im Kampf eine schemenhafte lila Silhouette. Das Finale inszeniert weiterhin
   ein leeres Kostüm (kein `drazhan.png` im Asset-Ordner — Chef-Lieferung).
7. **Der godly Jackpot klingelt (rt3-grete-21/22/23):** Kette erzwungen, Drazhan fällt — und diesmal:
   **„Seltener Fund! Kette der Sieben Zerbrochenen Kronen"-Toast mit eigener Godly-Stufe** (Klasse
   `toast-rare-godly`): dicker Goldrahmen, goldene Schrift, deutlich größer als der Meilenstein-Toast
   darüber — und er steht nach 4,5 s NOCH, während Standard-Toasts längst abgebaut sind (verlängerte
   Bühnenzeit live bestätigt). Die Zeremonie zeigt die Kette im goldgerahmten Beute-Feld. Der
   Kontrolltest bestätigt die Eskalation: diamond_ring (rare) bekommt den normalen dünnen Toast,
   voidstone_ring (superRare) dieselbe Godly-Stufe inkl. Extra-Bühnenzeit. Mein R2-Kernbefund #1 ist
   behoben — der seltenste Fund des Spiels ist jetzt sein lautester. Restlücken: der Titel bleibt
   wortgleich „Seltener Fund!" (godly verdient eine eigene Wortstufe), und die Kette selbst ist ein
   📿-Emoji statt Artwork.
8. **Bestiarium-Gegenprobe (rt3-grete-27):** Götzenwächter und **Aetherwraith haben prachtvolle Art**
   (der Ward-Wand-Wraith sieht fantastisch aus). Aber die Bestiarium-Karte zeigt HP/Schaden/
   Verteidigung — **keinen Verteidigungs-Typ, keine Ward-Kapazität**. Und genau die
   Sanktum-Wellen-Monster sind dungeonOnly: sie tauchen in der Monsterauswahl (wo das neue Badge
   lebt) nie auf. Die Ward-Wand bleibt vor dem Betreten unsichtbar — das Badge fehlt exakt dort, wo
   es am meisten retten würde. Nebenfund: entdeckte Kill-Drops zeigen dort jetzt %-Chancen (beim
   Aetherwraith ein 0,01-%-Chase!), unentdeckte weiter „?" ohne %.
9. **Optionen durchsucht (rt3-grete-07):** Keine Zeremonie-/Auto-Skip-Option — der Pflicht-Klick pro
   48-s-Lauf bleibt der einzige tote Moment im Loop.

## 3. Bewertungsbogen (R1 | R2 | R3 | Δ R2→R3)

| Aspekt | R1 | R2 | R3 | Δ | Begründung |
|---|---|---|---|---|---|
| Spaß sofort (erste 5 min) | 8 | 9 | 9 | ±0 | Kartenwahl als Jagd-Moment + 48–55-s-Puls tragen sofort; die durchgehend lila Warband-Wellen dämpfen den ersten Eindruck weiter. |
| Spaß über Zeit | 6 | 7 | 7 | ±0 | Die Fanfare veredelt das ZIEL der langen Jagd, aber der Weg dorthin ist unverändert: kein Dry-Streak-Kontext (bewusst im Balance-Block), Scroll-Reset pro Lauf. Lauf 50+ bleibt Willenssache. |
| Sucht-Faktor („eine Runde noch") | 7 | 8 | 8 | ±0 | Die hakenlosen Chips bleiben der beste Köder; neu dazu das Wissen, dass der Treffer laut wird. Mechanisch ist die Schleife aber identisch zu R2. |
| Belohnungs-Dichte & Dopamin | 8 | 8 | 9 | **+1** | Der R2-Krater am obersten Ende ist zu: godly/superRare haben jetzt die lauteste Fanfare (Goldrahmen, Extra-Bühnenzeit, godly-Zeremonie-Feld). Die Schichtung darunter war schon stark. Zur 10 fehlen eigene Wortstufe/Sound und echtes Item-Art im Moment des Triumphs. |
| Ziel-Klarheit | 4 | 9 | 9 | ±0 | Unverändert vorbildlich (Chips, Immer-%, Wiki-Verzahnung). Rest: Boss-Kill-Chases vor Erstfund weiter ohne % im Bestiarium, Threat/Defense der Dungeon-Wellen unsichtbar. |
| Tiefe & Entscheidungen | 6 | 7 | 7 | ±0 | Die Trinity-Badges machen Kampf-Vorbereitung in ZONEN erstmals aus der UI ableitbar — aber für Dungeons (dieses Modul!) bleibt die Ward-Break-Frage unbeantwortbar, weil Wellen-Monster nirgends ein Badge tragen. |
| Frustfreiheit | 6 | 7 | 7 | ±0 | Nichts Neues frustet; aber die zwei benannten Reibungen blieben: Scroll-Reset nach jeder Zeremonie, unangekündigte Sanktum-Wand. Tour-Popup im Endgame-Fixture feuert weiter. |
| Verzahnung | 8 | 9 | 9 | ±0 | Dezimal-Format jetzt wirklich EIN System (Karte=Wiki=Bestiarium, Komma). Gegenzug: das neue Badge-System ist NICHT ins Bestiarium/in die Dungeon-Wellen verzahnt — genau eine Lücke, sonst wäre es die 10. |

**GESAMT-SUCHT-URTEIL: 7 → 8 → 8 (±0).** Diese Fix-Runde war für Dungeons chirurgisch, nicht
strukturell: Sie hat exakt den lautesten meiner R2-Funde behoben (godly-Fanfare) und den Kleinkram
poliert (Singular, Dezimal, Badges) — das hebt Dopamin auf 9, ändert aber die Schleife selbst nicht.
Der Drei-Runden-Trend ist trotzdem eindeutig gesund: R1 „blinde Läufe", R2 „ehrliche Jagd", R3
„Jagd mit würdigem Triumph". Der Weg zur 9 ist jetzt kurz und präzise benennbar: Dry-Streak-Zähler
(liegt im Balance-Block), Scroll-Fix (ein UI-Handgriff), und die Bühnen brauchen ihre Stars (Chef).

**„Komme ich morgen wieder?"** — Ja. Auf meiner Warband-Karte fehlt noch ein Haken, ich kenne die
Preise, und zum ersten Mal weiß ich: Wenn die 0,1 % fallen, feiert das Spiel MIT mir statt zu
schweigen. Was mich morgen noch nicht empfängt: ein Zähler, der meine 47 trockenen Läufe würdigt,
und ein Drazhan mit Gesicht.

## 4. Runde-2-Funde-Verifikation

| # | R2-Fund | Status R3 |
|---|---|---|
| 1 | Stiller godly-Jackpot (Toast feuert nicht für superRare/godly) | **BEHOBEN, über die Forderung hinaus.** Beide Stufen feuern UND haben eine eigene Eskalationsstufe (`toast-rare-godly`): Goldrahmen, größere Optik, verlängerte Bühnenzeit (nach 4,5 s noch sichtbar; live gegen rare-Kontrollgruppe verifiziert). Godly-Rahmen auch im Zeremonie-Beute-Feld. Rest: Titel wortgleich „Seltener Fund!" für alle Stufen; Sound headless nicht prüfbar. |
| 2 | Ward-Wand unerklärt / Badges verwaist in translations.ts | **TEILWEISE BEHOBEN.** Das Verteidigungs-Badge (Gepanzert/Flink/Beschildet + Konter-Tooltip) ist jetzt auf JEDER Monsterauswahl-Karte verdrahtet (Zone + Slayer) — das Vokabular wird gelernt. ABER: dungeonOnly-Wellen-Monster (Sanktum!) erscheinen dort nie, Bestiarium-Karten und Dungeon-Karten zeigen weiterhin weder Defense-Typ noch Ward-Wert. Die konkrete Sanktum-Ward-Wand bleibt vor dem Betreten unsichtbar. |
| 3 | „1 Wellen" (fehlender Singular) | **BEHOBEN.** Thron-Karte: „Lv 95 · 1 Welle" (rt3-grete-03-card-throne). |
| 4 | Dezimal-Mix (Karte „0,10 %" vs. Wiki „0.1%") | **BEHOBEN.** Wiki-Quellen jetzt „0,80%"/„0,10%", Bestiarium „0,01%" — Komma durchgängig (DE), identische Formatierung wie die Karten-Chips. |
| 5 | Scroll-Reset nach Zeremonie | **NICHT behoben.** Nach „Weiter": scrollY=0; Warband-Betreten-Button bei 1081 px (Viewport 1080 — einen Pixel unterm Fold), Thron bei 1431 px. In allen 4 gemessenen Zeremonien identisch. Für Vielfahrer bleibt jeder Lauf Scrollen+Klick. |
| 6 | Drazhan-/Warband-Platzhalter-Art | **NICHT geliefert** (Chef-Lieferung — fair vermerkt, kein Dev-Versäumnis): kein `drazhan.png`, keine der 5 Warband-Goblin-PNGs (reaver/pikeman/siegebrute/bloodshaman/warchief), kein Item-Art für Kette/Faust/Spaltbeil. Positiv-Kontrast: `aether_wraith.png` existiert und ist im Bestiarium spektakulär. |

## 5. Runde-2-Top-3-Check (erlebbar passiert?)

1. **Godly/superRare in die Jackpot-Fanfare, godly als eigene Stufe** → **ERLEBBAR PASSIERT.** Der
   Kern meiner Forderung ist exakt umgesetzt: nicht nur ins RARE-Set aufgenommen, sondern eine
   sichtbare Godly-Stufe mit Goldrahmen und mehr Bühnenzeit. Der 0,1-%-Moment ist jetzt der lauteste
   des Loops. Feinschliff offen: eigene Titel-Wortstufe („Legendärer Fund!" o. ä.) und Item-Art.
2. **Dry-Streak-Kontext / sanftes Pity + Zeremonie-Auto-Skip** → **NICHT erlebbar.** Kein Zähler auf
   der Karte, nichts in den Optionen. Pity liegt laut Auftrag bewusst im Balance-Block — fair. Der
   Auto-Skip (reiner UI-Komfort) wäre davon aber unabhängig gewesen und fehlt ebenfalls.
3. **Den Bühnen ihre Stars geben (Drazhan, 5 Warband-Goblins, Chase-Item-Art)** → **NICHT passiert**
   (wartet auf Chef-Lieferung). Der meistwiederholte Dungeon ist weiter durchgehend lila, das
   Finale-Intro inszeniert eine Silhouette, der legendärste Chip ist ein nacktes „?".

## 6. Neue Funde (R3)

1. **UI (mittel): Das Verteidigungs-Badge fehlt genau dort, wo die Ward-Wand wohnt.** dungeonOnly-
   Monster (alle Sanktum-Wellen) haben keine Monsterauswahl-Karte, und Bestiarium-Karten rendern
   das Badge nicht — der einzige Ort, an dem ein Spieler den Beschildet-Status des Aetherwraith
   VOR dem 30-Minuten-Run lernen könnte, zeigt ihn nicht. Badge (+ Ward-Wert) ins Bestiarium und/oder
   Wellen-Typen auf die Dungeon-Karte wäre der Lückenschluss zu R2-Fund #2.
2. **POLISH (klein): Stat-Label-Umbruch auf Monsterkarten:** „VERTEIDIGUN G" bricht in der Stat-Kachel
   um (rt3-grete-05, alle Karten) — das längste Label passt nicht in seine Zelle.
3. **BEOBACHTUNG (unverändert aus R2, weiter offen):** Tour-Popup „Das Schlachtfeld" feuert beim
   CL-96-Endgame-Fixture und dimmt die Kampfseite bis zum Wegklicken (rt3-grete-01). Auf echten
   Alt-Saves nach Migration prüfenswert.
4. **POSITIV: Bestiarium zeigt entdeckte Kill-Drops mit %** — inkl. eines 0,01-%-Chase beim
   Aetherwraith, Komma-formatiert. Unentdeckte Kill-Drops bleiben „?" ohne % (bekannte Restlücke aus
   R2-Top-3 #1 / Bug #3 — vor Erstfund weiter unsichtbare Boss-Kill-Chases wie das 0,3-%-Spaltbeil).
5. **POSITIV: superRare-Items mit echtem Artwork in der Zeremonie** (voidstone_ring im blauvioletten
   Rahmen, rt3-grete-26) — wo Art existiert, trägt die Beute-Bühne bereits.

## 7. Meine Top-3 für Runde 4

1. **Dry-Streak-Zähler auf die Karte, sobald der Balance-Block ihn freigibt** — „✓ 47 · seit letztem
   seltenen Fund: 47" neben dem Clear-Zähler (+ optional sanftes Pity auf die <1-%-Zeilen). Es ist
   der letzte fehlende Baustein zwischen „ich kenne den Preis" (R2) und „jeder Lauf zahlt sichtbar
   ein" — und seit R1 mein konstantester Wunsch. Dazu der Zeremonie-Auto-Skip außer bei
   Rare/Erstclear: der Pflicht-Klick ist bei 48-s-Läufen der einzige tote Moment.
2. **Scroll-Fix nach der Zeremonie** (ein Handgriff, seit R2 offen): „Weiter" soll vor den
   Betreten-Button des gerade gelaufenen Dungeons zurückführen — bei 1081 px fehlt dem Warband-Button
   buchstäblich EIN Pixel zum Klick ohne Scrollen. Plus: Verteidigungs-Badge/Ward-Wert ins Bestiarium
   und die Wellen-Typen auf die Dungeon-Karte — dann ist die Ward-Wand endlich vorher lesbar.
3. **Die Bühnen-Art einbinden, sobald der Chef liefert** — Priorität: Drazhan (das Intro ist gebaut
   und wartet), die 5 Warband-Goblins (Visitenkarte des Loops, ~10 Läufe pro Farm-Block), Item-Art
   für Kette/Faust/Spaltbeil (der Silhouetten-Tease der Chips verpufft ausgerechnet bei den
   Chase-Items). Und dem godly-Toast eine eigene Wortstufe geben — „Seltener Fund!" ist für ein
   0,1-%-Item eine Untertreibung.

## Positiv-Anker (nicht anfassen)

- Die Godly-Toast-Eskalation (Goldrahmen + Extra-Bühnenzeit + godly-Zeremonie-Feld) ist genau
  richtig kalibriert — laut, aber nicht albern. So fühlt sich ein 0,1-%-Moment an.
- Beute-Chips mit Immer-% + Haken-Sammelbogen: weiterhin die beste Einzelmechanik des Loops.
- „Lv 95 · 1 Welle", Komma-Dezimale überall: der Kleinkram ist wirklich weg, nichts davon regressiert.
- 48–55-s-Warband-Puls, 2-s-Wellen-Cooldown, Boss-Atempause, „kein Verlust"-Tod-UX: unverändert exakt richtig.
- Trinity-Badges mit Konter-Tooltips auf den Monsterkarten: bestes neues Lehr-Element — jetzt noch
  dorthin tragen, wo die Prüfung stattfindet.
