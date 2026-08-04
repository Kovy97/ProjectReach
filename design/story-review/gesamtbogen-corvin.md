# Gesamtbogen-Review — Corvin Weitgang, der Durchspieler

*Aschechronik Kapitel 1–21 als EINE durchgehende Reise. Phase-2-Fable-Sweep des CEO-Loops, 2026-07-16 (Review-Stand: nach Balance-Welle T). Schließt die strukturelle Lücke des 12-Personen-Reviews vom 14.07.: jede Persona sah nur ihr Kapitel-Band — niemand die Kette am Stück.*

## 1 · Persona-Steckbrief + Session-Stats

- **Name:** Corvin Weitgang, der Durchspieler.
- **Archetyp:** Der Spieler, der eine Story-Kampagne in einem Rutsch durchzieht. Ich bewerte nicht das Kapitel, sondern die Kurve: Wo ermüde ich kumulativ? Trägt der Sog über 21 Kapitel? Sitzt der Wechsel aus Grind, Boss und Enthüllung? Wo hätte ich abgebrochen, wo konnte ich nicht aufhören?
- **Methode:** Komplette Kette 1→21 als EINE Session im echten Story-Tab durchlaufen (headless, Port 5283, `withHarness`, Fixture midgame, Locale de). Alle 21 loreTexte in Reihenfolge aus dem laufenden Build gelesen (DOM-Abgleich gegen Content: 21/21 wortgleich), jedes Kapitel über den echten Claim-Button eingelöst, Ziele per `__hfDebug`-Vorspulen erfüllt (kein Echtzeit-Grind). Aufwands-Taxierung aus Content-Statblöcken (Live-Dump aller 54 Zielmonster: HP/Level/Evasion/Ward/Enrage) plus den deterministischen Sim-Belegen aus Band 3/4/5 (Onyx, Thane, Kael). Read-only, kein Langläufer, Wegwerf-Skript `review-corvin-01-durchlauf.mjs` nach dem Lauf gelöscht.
- **Session-Stats:** 21/21 Kapitel geclaimt, 0 Blocker, 0 Page-Errors. Token-Kurve live bestätigt monoton: 1/1/1/2/2/2/2/2/2/2/3/3/3/3/3/3/3/3/3/5/5 = 54 Token gesamt. Gold gesamt 147.550 (eine einzige Senke: Kap. 6 zahlt 1.200 nach 1.500 in Kap. 5). Paragonturm-Unlock nach Kap.-19-Claim live verifiziert: `dungeonsUnlocked.paragon_tower = true`, „Dungeon entsperrt!"-Toast gefeuert, `paragon_key` wie designt nie im Besitz (Intercept). Finale-Zustand rendert: „Jedes geschriebene Kapitel ist eingelöst. Die Chronik ruht — vorerst."

**Der Zeittakt der Reise** (für alle Sog-Urteile unten): Die Kapitel-Zähler selbst sind fast überall in 10–60 Minuten erledigt. Die echten Fristen hängen an den CL-Gates der Story-Dungeons — CL 55 (Kap. 5) / 70 (11) / 82 (13) / 90 (17) / 95 (18) / 99 (19+20). Die CL-Formel (`0.25·(def/ward+vit) + 0.5·Offense`) heißt für CL 99: Offensiv-Skill(s) 99 UND Defensivskill 99 UND Vitality 99. Ein Durchspieler erlebt die Kette also als Metronom: Kapitel = schnell, dazwischen = Progression.

## 2 · Die Pacing-Kurve — Ermüdungs-Protokoll (21 Zeilen)

| Kap. | Sog | Eine Zeile (kumulativ empfunden) |
|---|---|---|
| 01 | 7 | Starker Stimmen-Einstieg; 25 Items laufen nebenbei, der Wächter verspricht ein Buch, das ich lesen will. |
| 02 | 8 | „Das gnädigste Land, das dir bevorsteht" ist ein perfekter Früh-Haken, und der Bulle gibt der Drohung sofort einen Puls. |
| 03 | 8 | Die angehaltene Feder beim Wort „Fremder" — drei Kapitel in unter einer Stunde, und der Faden, der bis 20 trägt, sitzt schon. |
| 04 | 7 | Erster echter Grind (30+8, Welle T entschärft: richtig so), getragen vom Zonenwechsel und der Fel-Feuer-Frage. |
| 05 | 6 | Erster Dungeon und erster Tempobruch: die CL-55-Wand nach vier schnellen Kapiteln; der „Schuldner gewechselt"-Satz hält mich am Haken, nicht das Gameplay. |
| 06 | 7 | Die Kernlektion ist der bisher beste Text, mechanisch nach der Wand trivial — als Erholung willkommen. |
| 07 | 6 | Aschtyrann fällt trotz Enrage/Burn (Welle T) in Sekunden; zweites Kapitel in Folge unter meinem Level. |
| 08 | 5 | Drittes Trivial-Kapitel in Serie — der Hügelgräber-Gesang rettet es, aber hier sackt die Kurve kumulativ zum ersten Mal durch. |
| 09 | 6 | „Tote, die irgendwohin singen, sind eine Frage" zieht wieder an; die Richtung Krypta gibt dem Laufen endlich wieder ein Ziel. |
| 10 | 5 | 50 Kills, der größte Zähler der Kette, und der Hohle Chor (Ward 220) ist ein Schwamm — der eine echte Grind-Durchhänger der ersten Hälfte. |
| 11 | 8 | „Ein Sieg, der sich nicht wie einer anfühlt": stärkster Story-Beat bisher, als Einzel-Boss genau die richtige Belohnung nach dem 50er. |
| 12 | 6 | „Der Mensch als Acker" ist große Vorausdeutung an einem kleinen Auftrag (30er-Grind zweier Bestien); dahinter wartet der CL-82-Anstieg. |
| 13 | 8 | Die Königsjagd ist der würdige Halbzeit-Gipfel — Heulen, Hirsch, Wolf, Bär als echte Eskalation statt Zähler. |
| 14 | 7 | Der menschlichste Text der Kette als Ruhepunkt, und 20+10 (Welle T gekürzt) ist exakt die richtige Länge dafür. |
| 15 | 9 | Das Zeugen-Geständnis UND der Moment, ab dem mein Build zählt (Revenant/Hexer-Doppelcheck) — narrativer und mechanischer Wendepunkt in einem Kapitel: der Sog-Höhepunkt der Reise. |
| 16 | 5 | Die Evasion-Wand ist verdient und der Warnsatz (Welle T) fair, aber 25+8 an der neuen Achse ist der längste aktive Block der Kette — hier war ich zum zweiten Mal abbruchnah. |
| 17 | 7 | Die „gestellte Wache" (Welle T neu) gibt dem Boss-Kapitel endlich eigenes Enthüllungs-Gewicht; der Sturmbringer ist ein ehrlicher Prep-Check. |
| 18 | 6 | „Hinter dem Lager liegt nur noch die Halle" ist eine Gänsehaut-Zeile — und dann liegt zwischen mir und der Halle die längste Frist des Spiels (CL 95→99). |
| 19 | 8 | Das Sanktum trägt 20 Kapitel Anlauf und das Runen-Gate fühlt sich verdient an; nur stand „Verursacher: bekannt" schon beim Betreten auf der Bühne (Befund 1). |
| 20 | 9 | Drazhan ist der beste Kampf des Spiels und sein Rückzug das beste Vorhang-Wort — ich habe beides nur in der falschen Reihenfolge bekommen: erst gelesen, dann gekämpft. |
| 21 | 7 | Leise, richtige Landung; der Sieben-Kronen-Satz (Welle T) macht aus dem Epilog ein Versprechen statt eines Abspanns. |

**Kurvenform:** Zwei Gipfel (15, 20), zwei Täler (8–10, 16), ein langer Flur (18→19). Der Sog fällt nie unter „weiterspielen", aber dreimal auf „heute nicht mehr".

## 3 · Bogen-Analyse

**Gesamtsog: 7/10.** Die Kette trägt als Ganzes, und zwar primär über die Wächter-Stimme: 21 Texte, eine Figur, kein einziger Bruch im Ton, und der Fremder-Faden (Saat Kap. 3 → Geständnis 15 → Beweis 19 → Gesicht 20) funktioniert im Stück gelesen noch besser als in Bändern. Was den Sog vom 8er/9er fernhält, ist nicht die Story, sondern die Taktung der Fristen (s. Rhythmus) und dass die zwei größten Enthüllungen sich selbst vorweglesen (Befund 1).

**Rhythmus (Grind/Boss/Enthüllung): 6/10.** Das Grundmuster Gebiet → Dungeon-Unlock → Boss-Kapitel ist sauber und wird nie langweilig-mechanisch. Zwei Störungen, die man nur kumulativ spürt: Erstens das **Trivial-Tal 6–9** — die CL-55-Wand von Kap. 5 überschießt die vier Folgekapitel (Monster L30–65) um 10 bis 25 Level, direkt nach der ersten echten Anstrengung kommen vier Kapitel ohne Widerstand (Befund 3). Zweitens die **Frist-Geografie der zweiten Hälfte**: ab Kap. 15 zieht jede Stufe an (Prep-Schicht → Evasion-Achse → CL 90 → 95 → 99), und die längste Einzelfrist der ganzen Reise liegt ausgerechnet zwischen 18 und 19, an einem Bindeglied-Kapitel (Befund 2). Die Boss-Einzelkapitel (5, 7, 11, 13, 17, 18, 19, 20) sitzen dagegen alle richtig: nach jedem großen Zähler kommt ein Ein-Ziel-Kapitel als Auszahlung.

**Enthüllungs-Dramaturgie, kumulativ erlebt: 6/10** (als Text-Kette gelesen wäre es eine 8). Die Verteilung ist vorbildlich — es gibt kein Kapitel ohne Faden-Fortschritt, die Personifikation der Chronik („sie hat Übung darin") wird als Running Gag zur Bindung, und Welle T hat die zwei schwächsten Glieder (17 ohne eigene Enthüllung, 21 ohne Band-2-Haken) nachweislich repariert; beide Texte rendern live. Der Abzug kommt aus der Anzeige-Reihenfolge: Der Chronik-Eintrag eines Kapitels steht ab Aktivierung auf der Bühne, im Präteritum, inklusive der Enthüllung, die das Kapitel erst erspielen soll. Bei 1–18 ist das ein charmanter Tick (die Chronik weiß es schon), bei 19 und 20 entwertet es den Klimax (Befund 1).

**Abbruchrisiko-Stellen** (wo genau, warum — in Reihenfolge der Gefährlichkeit):
1. **Zwischen Kap. 18 und 19 (CL 95→99):** die mit Abstand längste Frist der Reise, am Punkt der höchsten erzählten Dringlichkeit („die Akte will ihr Ende"). Wer hier pausiert, kommt womöglich nie zur besten Stunde des Spiels (19+20).
2. **Vor Kap. 5 (CL 55):** der erste Tempobruch überhaupt — vier Kapitel in einer guten Stunde, dann Stunden Leveling. Klassischer Früh-Churn-Punkt; Band 2 (Sela) hat zusätzlich die Orientierungsfalle dokumentiert.
3. **Kap. 16 (Evasion-Wand):** verdiente Härte (Thane), aber 33 Ziele an einer Achse, die einen Build-Umbau verlangt, ist der längste aktive Pflichtblock; der Welle-T-Warnsatz senkt das Risiko, beseitigt es nicht.
4. **Kap. 10 (50er-Zähler + Ward-Schwamm):** kein Wall, aber der eine Punkt der ersten Hälfte, an dem Fleiß die Story ersetzt.

**Finale-Payoff nach 20 Kapiteln Anlauf: 7/10.** Mechanisch ist das Finale die Auszahlung, die der Anlauf verspricht: Sanktum-Wellen, Runen-Gate, Drazhans Enrage-Korridor (Kael belegt 81–94 % mit vollem Loadout, 0 % undergeared) — hart, fair, verdient. Der Epilog landet das Buch sauber und öffnet Band 2 mit dem Kronen-Satz. Dramaturgisch verliert das Finale genau die zwei Punkte aus Befund 1: die Werkzeichen und Drazhans Name/Motiv/Rückzugszitat werden als Bühnentext GELESEN, bevor sie erspielt sind — der beste Moment des Spiels quittiert sich selbst vorab.

## 4 · Die 3 wichtigsten Bogen-Befunde (nur im Gesamtdurchlauf sichtbar)

### Befund 1 — Chronik-Einträge erscheinen VOR der Tat; Kap. 19/20 spoilern ihren eigenen Klimax
**Beobachtung (live belegt, Screenshots corvin-19/20-stage):** Der `loreText` eines Kapitels rendert auf der Story-Bühne, sobald das Kapitel AKTIV wird — als rückblickender Chronik-Eintrag im Präteritum neben einem Zähler auf 0. Kap. 20 zeigt bei „Drazhan der Kronlose 0/1" bereits den kompletten Enthüllungstext: Name, Herkunft, Motiv, Rückzug und das wörtliche Schlusszitat. Kap. 19 zeigt „Werkzeichen … Verursacher: bekannt" vor dem ersten Schritt ins Sanktum. Der 12er-Sweep konnte das nicht sehen: Wer Texte kapitelweise als Texte prüft, liest sie richtig; wer die Kette spielt, liest jede Auflösung vor ihrem Kampf.
**Vorschlag (UI-only, kein neuer Lore-Text):** In `ChronicleStoryTab` (QuestsPage) den `loreText` erst ab Status `completed` zeigen — die Tat ist getan, der Eintrag erscheint zusammen mit dem Claim-Button als Lese-Payoff, und das Präteritum stimmt plötzlich in allen 21 Kapiteln. Während `active` trägt die Sprechblase die vorhandene funktionale `description` (Wächter-Kurzauftrag), und der jüngste geclaimte Eintrag bleibt direkt darunter in der Historie lesbar (ggf. den obersten Eintrag auto-aufklappen, damit die Bühne nie stimmlos ist). Aufwand: klein; Wirkung: rettet die Dramaturgie des kompletten Finales.

### Befund 2 — Die längste Frist der Reise liegt zwischen Kap. 18 und 19, an einem Bindeglied
**Beobachtung:** Alle großen Wartezeiten der Kette hängen an den CL-Gates der Story-Dungeons (55/70/82/90/95/99), nie an den Kapiteln selbst. Die Schlussfolge 90→95→99 stapelt drei Anstiege in vier Kapitel, und der teuerste (95→99 = Offense UND Defence/Warding UND Vitality auf 99, Formel `dungeon.ts`) liegt exakt zwischen „Hinter dem Lager liegt nur noch die Halle" (18) und der Halle (19). Erzählte Dringlichkeit und erlebte Wartezeit laufen am kritischsten Punkt der Reise maximal auseinander; das ist die gefährlichste Abbruchstelle des Spiels, direkt vor seinen zwei besten Kapiteln.
**Vorschlag:** CL-Gate von `idol_sanctum`/`behind_the_throne` von 99 auf 95 senken (an balance-designer). Die echte Prüfung ist nachweislich der Kampf selbst, nicht die Tür: Kael belegt, dass last_idol/drazhan ohne volles Loadout (Runen, Suffixe, Tonika) bei 0 % liegen — das Boss- und Runen-Gate bleibt vollständig intakt, nur das redundante Skill-Cap-Gate davor fällt. Wer mit CL 95 hineingeht und scheitert, hat eine lesbare Aufgabe (Prep-Schicht) statt einer stummen Wartezeit. Alternativ minimal: `wyvern_lair` und `idol_sanctum` auf dasselbe Gate (95/95) ziehen, damit 18→19 fristlos ist und der 99er-Anstieg vor 18 liegt, wo noch kein „nur noch"-Versprechen im Text steht.

### Befund 3 — Das Trivial-Tal Kap. 6–9: die einzige Strecke, auf der die Gefahr wächst, während der Widerstand fällt
**Beobachtung:** Die CL-55-Wand von Kap. 5 überschießt die vier Folgekapitel um 10–25 Level (Aschfelder L30–45, Schwarzdorn L45–65). Einzeln bewertet war das „Erholung" bzw. „Rückschritt" (Sela, Kap. 6); kumulativ ist es ein Viertel der Reise ohne Widerstand, direkt nachdem das Spiel zum ersten Mal Anstrengung verlangt hat, und ausgerechnet auf den Kapiteln, deren Texte die Weltgefahr eskalieren (Aschelektion, Chor-Richtung). Sog-Zeilen 7–10 oben zeigen die Delle: 6/5/6/5 — der längste zusammenhängende Durchhänger der Kurve.
**Vorschlag:** `goblin_warband.requiredLevel` von 55 auf ~45 senken (an balance-designer). Die Wand wird nicht weicher — der Warchief (L60, Enrage) und seine vier Wellen bleiben die echte Prüfung, ganz im Sinne des „Undergeared-Walls sind gewollt"-Kanons — sie kommt nur früher: Der Spieler erreicht die Aschfelder dann mit ~CL 45–50 statt 55+, und das Band L30–45 lebt wieder. Wer die Wand lieber stehen lässt: alternativ die Zähler von 6/8/9 leicht straffen (30→20 bei Kap. 6/8), damit das Tal kürzer wird statt flacher.

---
*Beleg-Basis: Live-Durchlauf 21/21 im ausgelieferten Build (Port 5283, Skript gelöscht), Screenshots corvin-00…99 im Session-Scratchpad, Monster-Stat-Live-Dump, Sim-Zahlen aus band3-onyx/band4-thane/band5-kael, CL-Formel `packages/engine/src/dungeon.ts`, Gates `packages/content/src/index.ts`.*
