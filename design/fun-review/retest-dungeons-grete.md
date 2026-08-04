# Fun-RETEST R6 — Dungeons als Wiederhol-Loop („Grete Beutezug", Dungeon-Farmerin)

**Datum:** 2026-07-16 · **Retest zu:** `dungeons-grete.md` (Fun-Sweep F6, 2026-07-14) · **Methode:**
Playwright-Sim-Harness (Port 5306, Endgame-Fixture „Korveth" CL 96, Chronik per In-Memory-Patch frei,
Wegwerf-Skripte `rt-grete-*.mjs` gelöscht, Harness gestoppt). Screenshots: `ui-audit/shots/rt-grete-*.png`,
alle gesichtet. Unabhängig erhoben — keine Plan-/Status-/Wellen-Dokumente gelesen; alle Befunde stammen
aus dem laufenden Spiel (plus gezielte Code-Verifikation einzelner Live-Beobachtungen).

## 1. Steckbrief

**Persona:** Grete Beutezug — wiederholt Dungeons für Chase-Drops und Clear-Effizienz. Bewertet
Loot-Tabellen nach Jagd-Qualität, Lauf-Länge vs. Belohnung, Wellen-Rhythmus. Die Spielerin mit
300 Warband-Clears für das 0,3-%-Spaltbeil — wenn die Jagd fair kommuniziert ist.

| Setup | Details |
|---|---|
| Charakter | Endgame-Fixture „Korveth Grimhollow", CL 96, Magie-Fokus offensiv 97, Auto-Eat S4, Abgrund-Festmahl |
| Gespielt | Auswahl-Studie aller 8 Dungeon-Karten · 7 komplette Warband-Läufe am Stück · 1 Thron-Lauf (1-Wellen-Boss) · 1 Sanktum-Versuch (Tod in Welle 1) |
| Erzwungene Momente | Lauf 5: warbanner_cape auf 100 % (Jackpot-Gefühl Mittelklasse) · Thron: sevenfold_crown_chain auf 100 % + Drazhan in-memory gezähmt (Jackpot-Gefühl Endgame — bewusst KEIN Balance-Urteil über den Kampf) |
| Messwerte | Warband: 7 Läufe à 48–60 s (Ø 53 s), ~10 Läufe/10-min-Block · 600 g + 350 XP/Clear (Erstclear ×2 = 1.200 g) · Thron: 16.000 g + 24.000 XP (Erstclear ×2) |

## 2. Session-Protokoll

1. **Fixture-Load ist sauber (rt-grete-01/02):** Keine Meisterweihe-Zeremonien-Queue mehr, die den
   Einstieg photobombt. In 9 Dungeon-Betretungen (7 Warband, Thron, Sanktum) kein einziges
   Fremd-Popup mitten im Kampf. Der alte Bug #2 ist tot.
2. **Der erste Blick auf die Dungeon-Liste ist jetzt ein Jagd-Moment (rt-grete-08, 09-card-\*):**
   Jede Karte trägt eine „BEUTE:"-Zeile — die komplette Clear-Loot-Tabelle als Icon-Chips.
   Entdecktes zeigt echtes Icon + grünen Haken, Unentdecktes eine schwarze Silhouette mit „?", und
   die %-Chance steht IMMER daneben, auch vor dem Erstfund: Warband „100 % · 50 % · 40 % · 0,80 % ·
   0,80 %", Sanktum „… 5× 2,0 % … 2× 0,20 %", Thron „… 0,10 %". Ich weiß VOR dem ersten Schritt,
   dass es die 0,1-%-Kette gibt. Genau das hatte ich gefordert. Tooltip auf Silhouetten:
   „Unentdeckt — bezwinge diesen Dungeon, um es aufzudecken." — kein Namens-Leak, aber ein Versprechen.
3. **Chip-Klick → Item-Wiki → Quelle mit % (rt-grete-10, 24):** Entdeckte Chips öffnen das Item-Wiki,
   dort steht „Quelle: Tiefen der Krypta 40 %" bzw. nach dem Kettenfund „Hinter dem Thron 0.1%".
   Die Jagd-Infrastruktur ist rund verzahnt.
4. **Warband-Farm-Block, 7 Läufe (rt-grete-11 bis 18):** 48–60 s pro Lauf, Wellen-Ansage + Totenkopf-
   Leiste + „Beute 0/3"-Badge wie gehabt exzellent lesbar. Boss-Intro mit „🗝 Schatz gefunden!" bleibt
   der Puls-Moment (rt-grete-12-run1). Zeremonie mit Erstclear-Badge und Beute-Showcase, rechts
   stapeln sich „Seltener Fund!"- und „Verzaubertes Item!"-Toasts (rt-grete-13). Nach 7 Clears zeigt
   die Karte „✓ 7" und ALLE fünf Chips aufgedeckt (rt-grete-18) — der Dungeon hat jetzt einen
   sichtbaren Sammelbogen. Was Lauf 7 trägt: der Blick auf die zwei 0,80-%-Chips, die noch ohne Haken
   waren. Das ist neu und es funktioniert.
5. **Jackpot Mittelklasse (rt-grete-14/15, Lauf 5, Cape erzwungen):** „Seltener Fund! Zerfetzter
   Kriegsbanner-Umhang" + „Verzaubertes Item! … DES PHÖNIX" (Suffix-Roll obendrauf) — klingelt richtig.
6. **Thron-Einstieg hat jetzt seinen Auftritt (rt-grete-19/20):** Beim Betreten von „Hinter dem
   Thron" dimmt der Schirm, „BOSS-BEGEGNUNG — DRAZHAN DER KRONLOSE — Macht euch bereit…" als
   Vollbild-Intro VOR Welle 1, korrekt OHNE Schatz-Flash (kein Chest-Lügen-Moment bei 1 Welle).
   Meine alte Top-3 #3 ist exakt so umgesetzt. ABER: Drazhan selbst ist eine lila
   Platzhalter-Silhouette — das Story-Finale inszeniert ein leeres Kostüm (s. Neue Funde).
7. **Jackpot Endgame (rt-grete-21/22, Kette erzwungen):** Zeremonie zeigt die Kette im goldgerahmten
   (godly) Beute-Feld — aber als 📿-Emoji (kein Item-Artwork existiert), und rechts bleibt es STILL:
   **kein „Seltener Fund!"-Toast für den seltensten Fund des Spiels.** Das 0,8-%-Cape bekommt eine
   Fanfare, die 0,1-%-Kette nicht (Ursache verifiziert, s. Neue Funde #1). Der größte Jackpot-Moment
   des Spiels ist aktuell sein leisester.
8. **Sanktum-Realitäts-Check (rt-grete-25/26):** Welle 1/4 „Der Wächter" — prachtvolle Boss-Art
   (der Kontrast zu den Goblin-Platzhaltern ist brutal). Der Wächter (Stufe 245, 1.946 HP, 154 dmg)
   frisst meinem CL-96-Magier in ~40 s alle 14 Festmähler weg und tötet ihn. Die Karte hatte NICHTS
   angekündigt (kein Threat-Hinweis, kein Defense-Typ). Die Tod-UX selbst ist vorbildlich:
   „DU BIST GEFALLEN … KEIN VERLUST: Du behältst alles. Iss dich stark und versuch es erneut." mit
   Monster-Portrait — fair, erklärend, kein Loot-Verlust.
9. **Kleinigkeiten unterwegs:** Wächter-Tour-Popup („Das Schlachtfeld") feuert auch für den
   CL-96-Endgame-Charakter und dimmt die Kampfseite bis zum Wegklicken (rt-grete-03/04, vermutlich
   Fixture-Artefakt mit leeren Tour-Flags — auf echten Alt-Saves prüfenswert). Nach der Zeremonie
   lande ich oben bei den Zonen statt vor dem Betreten-Button (rt-grete-17) — Restart ist wieder
   Scrollen+Klick statt nur Klick.

## 3. Bewertungsbogen (alt → neu → Delta)

| Aspekt | alt | neu | Δ | Begründung |
|---|---|---|---|---|
| Spaß sofort (erste 5 min) | 8 | 9 | +1 | Schon die Kartenwahl ist jetzt ein Jagd-Moment (Silhouetten + %); der 53-s-Warband-Puls trägt sofort — nur die lila Goblin-Wellen dämpfen den ersten Eindruck. |
| Spaß über Zeit | 6 | 7 | +1 | Chip-Aufdeckung (Silhouette → ✓) gibt jedem Dungeon einen Sammelbogen und der %-Blick macht lange Jagden planbar; ohne Dry-Streak-Kontext bleibt Lauf 50+ aber weiter reine Willenssache. |
| Sucht-Faktor („eine Runde noch") | 7 | 8 | +1 | Die zwei hakenlosen 0,80-%-Chips auf der Karte SIND der „eine Runde noch"-Köder — genau der Hebel, der fehlte; Pity/Streak fehlt weiterhin für die ganz langen Jagden. |
| Belohnungs-Dichte & Dopamin | 8 | 8 | ±0 | Schichtung (Wellen-Loot → Chest → Boss → Clear → Suffix → Erstclear ×2) unverändert stark — aber ausgerechnet am obersten Ende (godly) fällt die Fanfare aus (Toast-Bug). |
| Ziel-Klarheit | 4 | 9 | +5 | Der Kernbefund ist behoben: volle Clear-Tabelle mit % IMMER sichtbar, Wiki-Verzahnung, Quelle+%. Rest-Abzug: Boss-Kill-Chases (Spaltbeil 0,3 %) zeigen vor Erstfund weiter keine %, und Threat/Defense-Typ der Wellen bleibt unsichtbar. |
| Tiefe & Entscheidungen | 6 | 7 | +1 | „Welche Jagd lohnt für meine Zeit?" ist jetzt eine informierte Portfolio-Entscheidung; Kampf-Vorbereitung (Ward-Break-Frage) lässt sich aus der UI aber weiterhin nicht ableiten. |
| Frustfreiheit | 6 | 7 | +1 | Photobomb weg, Thron-Antiklimax weg, Tod-Popup fair und erklärend („kein Verlust"); bleibt: unangekündigte Wände (Sanktum-W1), „1 Wellen", Scroll-Reset, stiller Godly-Jackpot. |
| Verzahnung | 8 | 9 | +1 | Karten-Chips ↔ Item-Wiki ↔ Bestiarium nutzen dieselbe Entdeckungs-Wahrheit und dieselbe %-Formatierung; Zonen-Karten zählen Drop-Sammlung, Slayer-/Paragonturm wohnen in derselben Auswahl. |

**GESAMT-SUCHT-URTEIL: 7 → 8 (+1).** Der Loop war schon gut gebaut; jetzt weiß ich endlich, WOFÜR
ich laufe — das macht aus einem soliden Farm-Rhythmus eine echte Jagd. Die letzte Stufe zur 9 liegt
exakt dort, wo der Jackpot am größten sein müsste: der godly Fund ohne Fanfare, die Ultra-Jagd ohne
Fortschrittsgefühl, das Finale ohne Gesicht.

**„Komme ich morgen wieder?"** — Ja, und zwar aus dem richtigen Grund: Auf meiner Warband-Karte
fehlen noch Haken, und ich kenne jetzt die Preise. Für die 0,1-%-Kette käme ich inzwischen
immerhin WISSENTLICH wieder — aber ohne Zähler und ohne Fanfare am Ziel bleibt das ein Versprechen
an die Sturen, kein Sog für alle.

## 4. Top-3-Verifikation (meine alten Empfehlungen)

1. **Beute-Vorschau auf der Dungeon-Karte** → **GUT umgesetzt, über die Forderung hinaus.**
   Clear-Loot als Chips auf jeder Karte (auch gesperrten), % IMMER sichtbar (auch unentdeckt — mehr
   als das Bestiarium je zeigte), Silhouetten-Tease, ✓-Haken, Klick → Item-Wiki. Die
   sevenfold_crown_chain existiert jetzt öffentlich mit „0,10 %" auf der Thron-Karte.
   Rest-Lücke: Kill-Loot der Wellen-Monster (warchief_cleaver 0,3 %) bleibt außen vor — der Karten-Chip-Satz
   deckt nur die Clear-Tabelle, das Bestiarium zeigt unentdeckte Kill-Drops weiter ohne %.
2. **Chase-Fortschritt sichtbar machen oder deckeln (Pity)** → **GAR NICHT umgesetzt.**
   Kein „seit letztem seltenen Fund", kein Pity-Zähler, nichts dergleichen in Engine oder UI
   (der „✓ n"-Clear-Zähler stand schon beim letzten Besuch). Die 0,1-%-Kette ist jetzt sichtbar,
   aber die ~1000-Läufe-Erwartung fühlt sich weiterhin wie eine Wand ohne Fortschrittsbalken an.
3. **Thron braucht den größten Auftritt** → **GUT umgesetzt** (Kern der Empfehlung): 1-Wellen-Dungeons
   bekommen das volle Boss-Intro VOR Welle 1, ohne Chest-Flash-Lüge — Drazhans Einstieg ist jetzt
   dramaturgisch gleichwertig. Der optionale Zusatz (Zeremonie-nur-bei-Rare-Option für Vielfahrer)
   kam nicht; der Pflicht-Klick pro Lauf bleibt. UND: Das Intro inszeniert eine lila
   Platzhalter-Silhouette — der Auftritt ist gebaut, der Star fehlt (s. Neue Funde #2).

## 5. Bug-Verifikation (alte Befunde)

| # | Alter Befund | Status |
|---|---|---|
| 1 | goblin_reaver ohne Monster-Art (Welle 1 Warband) | **NICHT behoben — größer als gedacht:** alle FÜNF Warband-Wellen-Monster (reaver/pikeman/siegebrute/bloodshaman/warchief) haben keine Art (rt-grete-11; `assets/monsters/` hat nur generische goblin_*.png anderer IDs, keine Alias-Zuordnung). Der meistwiederholte Einstiegs-Dungeon ist durchgehend lila. |
| 2 | Meisterweihe-Queue photobombt Fixture-Load/Kampf | **BEHOBEN.** Sauberer Load (rt-grete-01/02), keine Zeremonie-Interrupts in 9 Dungeon-Betretungen. |
| 3 | Ultra-Chases unsichtbarer Content | **BEHOBEN** (für Clear-Loot): 0,10 %-Chip auf der Thron-Karte, 2× 0,20 % auf Sanktum — vor dem Erstfund sichtbar. Teil-Rest: Kill-Loot-Chases im Bestiarium weiter ohne % vor Erstfund. |
| 4 | Melee-Ward-Wand unerklärt (aether_wraith 1654 Ward) | **NICHT behoben.** Ward-Kapazität/Defense-Typ der Wellen-Monster wird weiterhin nirgends vor dem Kampf ausgewiesen; die übersetzten Badge-Texte („Beschildet/Flink/Gepanzert" + Konter-Beschreibungen) existieren in `translations.ts`, werden aber in keiner Komponente mehr gerendert (Badge wurde entfernt, nichts ersetzt sie). Live-Äquivalent erlebt: Sanktum-W1 tötet den CL-96-Fixture-Magier ohne jede Vorwarnung auf der Karte. |
| 5 | Kleinigkeiten | Paragonturm-Karte weiter Legacy-„Schlüssel gesucht"-Optik (by design, rt-grete-06). Fixture-RNG weiter deterministisch (Lauf 1 droppt wieder felstaff+fist — Test-Artefakt, kein Spieler-Problem). „Zu schwach — kein Kampf-XP (Beute unverändert)"-Regel greift weiter sauber und farmer-freundlich (rt-grete-12-run1, Log). |

## 6. Neue Funde

1. **BUG (hoch): „Seltener Fund!"-Toast feuert nicht für superRare und godly.**
   `Toasts.tsx:90`: `const RARE = new Set(["rare", "epic", "legendary"])` — die Rarity-Skala kennt
   aber `… | superRare | … | godly` (`shared/index.ts:1948ff`). Live verifiziert: 0,8-%-Cape → Toast,
   0,1-%-Kette (godly) → **kein Toast** (rt-grete-22). Der seltenste Fund des Spiels bekommt weniger
   Fanfare als ein Krypta-Zufallsfund. Betrifft auch die beiden Sanktum-Grale (idol_aegis,
   last_idol_mantle) und jedes superRare-Item.
2. **ASSET (hoch): Drazhan hat keine Monster-Art** — das neue 1-Wellen-Boss-Intro (Vollbild, Name in
   Gold) inszeniert eine lila Platzhalter-Silhouette; auch im Kampf bleibt der Endboss lila
   (rt-grete-19/20). Kein `drazhan.png` in `assets/monsters/`.
3. **ASSET (hoch): Alle 5 Warband-Wellen-Monster ohne Art** (s. Bug-Verifikation #1) — Platzhalter in
   jedem der ~10 Läufe pro Farm-Block.
4. **ASSET (mittel): Chase-Items ohne Item-Bild:** `sevenfold_crown_chain` (Karten-Chip = nacktes „?"
   ohne Silhouetten-Tease — ausgerechnet der legendärste Chip ist der visuell ärmste; Jackpot-Zeremonie
   zeigt 📿-Emoji), außerdem `warchief_fist`/`warchief_cleaver` (Toast/Bestiarium mit Emoji-Fallback).
5. **POLISH: „Lv 95 · 1 Wellen"** auf der Thron-Karte — `combat.dungeonWaves` ist starres
   „Wellen"/„waves", kein Singular (EN ebenso: „1 waves").
6. **POLISH: Dezimaltrennzeichen inkonsistent (DE):** Karte „0,10 %" (Komma), Item-Wiki-Quelle
   „0.1%" (Punkt, rt-grete-24).
7. **POLISH: Scroll-Position nach der Zeremonie:** „Weiter" wirft mich an den Seitenanfang (Zonen)
   statt zurück vor den Betreten-Button (rt-grete-17) — beim letzten Besuch blieb die Position
   erhalten; für Vielfahrer ist jeder Lauf jetzt Scrollen+Klick.
8. **BEOBACHTUNG: Einsteiger-Tour-Popup im Endgame:** „Der Wächter — Das Schlachtfeld" feuert auch
   für den CL-96-Fixture-Charakter und dimmt die Kampfseite (rt-grete-03). Vermutlich
   Fixture-Artefakt (leere Tour-Flags) — prüfenswert, ob echte Alt-Saves nach Migration betroffen wären.
9. **BEOBACHTUNG (gewollte Wand, unangekündigt):** Sanktum-W1 (Wächter, Stufe 245) verbrennt einem
   nicht darauf gebauten CL-96 in ~40 s 14 Top-Speisen und tötet ihn — als Progressions-Druck ok
   (Combat-ist-fundamental), aber die Karte gibt keinerlei Threat-Signal über „Lv 95" hinaus, das
   hier eher „Betretungs-Minimum" als „Machbarkeits-Anzeige" bedeutet.

## 7. Neue Top-3 für mehr Sucht-Faktor

1. **Godly/superRare in die Jackpot-Fanfare — und godly eine EIGENE Eskalationsstufe.**
   `RARE`-Set um beide Stufen ergänzen ist der Ein-Zeilen-Fix; der eigentliche Hebel: der
   0,1-%-Moment muss der lauteste des Spiels sein (goldener Toast, eigener Sound, Zeremonie im
   Godly-Rahmen). Aktuell ist er stiller als ein 0,8-%-Fund — das ist die verkehrte Welt, und es
   ist der billigste große Dopamin-Gewinn im ganzen Loop.
2. **Dry-Streak-Kontext auf der Karte, jetzt wo die % öffentlich sind:** „✓ 47 · seit letztem
   seltenen Fund: 47" neben dem Clear-Zähler, optional ein sanftes Pity auf die <1-%-Zeilen
   (z. B. +50 % Chase-Chance je 50 trockene Clears, Reset bei Treffer). Die Vorschau hat die Jagd
   ehrlich gemacht; ein Zähler macht sie FÜHLBAR — jeder Lauf zahlt sichtbar auf etwas ein, statt
   im Nichts zu verschwinden. Dazu als Vielfahrer-Komfort: Zeremonie-Auto-Skip außer bei
   Rare/Erstclear (der Pflicht-Klick pro 53-s-Lauf bleibt sonst der einzige tote Moment im Loop).
3. **Den gebauten Bühnen ihre Stars geben:** Drazhan-Art (das Finale-Intro ist da und zeigt lila),
   die 5 Warband-Wellen-Goblins (der Einstiegs-Dungeon ist die Visitenkarte des Loops) und
   Item-Bilder für Kette/Spaltbeil/Faust — der Silhouetten-Tease auf den Karten ist die
   Sucht-Mechanik der Vorschau, und genau bei den Chase-Items zeigt er ein nacktes „?" statt einer
   verheißungsvollen Kontur.

## Positiv-Anker (nicht anfassen)

- Die Beute-Vorschau-Chips mit Immer-% sind die beste Einzelverbesserung des Programms — exakt
  richtig kalibriert (Silhouette teasert, % informiert, ✓ belohnt, Klick vertieft).
- 1-Wellen-Boss-Intro ohne Chest-Flash-Lüge: dramaturgisch UND mechanisch ehrlich gelöst.
- Tod-Popup „Kein Verlust: Du behältst alles" — die fairste Formulierung einer Niederlage im Genre.
- 48–60-s-Warband-Puls mit 2-s-Wellen-Cooldown/8-s-Boss-Atempause: unverändert exakt richtig.
- Belohnungs-Schichtung + Suffix-Toast-Stapelei („… DES PHÖNIX") liest sich weiter großartig.
