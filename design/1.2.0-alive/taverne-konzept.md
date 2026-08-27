# Die Taverne — Konzept für 1.2.0 (27.08.2026)

> Chef-Entscheid 27.08.: Der Alive-Kern aus dem Brainstorm entfällt. Neuer Kern von 1.2.0 ist **die Taverne**,
> ein Spieler-Hub nach dem Vorbild von Shakes & Fidget: ein Ort mit wechselnden Besuchern, die Aufträge
> vergeben. Mira liefert die Szene und die Besucher. Dieses Dokument ist der Vorschlag zur Abnahme.

## 1 Leitidee

Die Taverne ist der Ort, an dem die Welt zum Spieler kommt. Statt einer Tafel mit Zetteln sitzen dort
Leute mit Namen, Gesicht und einem Anliegen: „Viktor der Slayer" will Köpfe aus dem Schwarzdorn,
„Billy der Bauer" braucht eine Ernte. Wer hilft, bekommt Erfahrung im passenden Skill, Rohstoffe,
Gold und bei manchen Gästen Slayer-Punkte oder Marken. Die Gäste wechseln, die Taverne bleibt und
wird mit jedem Update mehr: erst Aufträge, später Stammgäste, Getränke, Aushang, Begleiter, Post.

Drei Regeln, die den Idle-Charakter schützen:
1. Kein Echtzeitzwang: Gäste bleiben, bis ihr Auftrag erledigt ist oder der Tag wechselt; nichts verfällt still.
2. Alles deterministisch aus Welt-Seed und Kalendertag (Muster des Wochentags-Segens), offline und live identisch.
3. Aufträge laufen über die bestehende Warteschlange; die Taverne ist Anlass und Belohnung, nicht ein zweites Spiel.

## 2 Zugang

**Empfehlung: die Taverne ist das erste Gebäude von New Haven, billig und schnell.**
- Kosten 100 Holz und 1 500 Gold, Bauzeit 15 Minuten, keine Voraussetzung (nicht einmal das Zentralhaus).
- Vor dem Bau steht in der Sidebar unter „New Haven" ein gedimmter Reiter „Taverne" mit dem Hinweis
  „Bau die Taverne in New Haven" (Klick springt zum Gebäude). Nach dem Bau wird der Reiter aktiv.
- Zweiter Weg: auf der New-Haven-Karte auf die Taverne klicken → „Betreten".
- Warum bauen statt von Anfang an: Der Bau ist ein natürlicher erster Schritt in New Haven (heute
  fangen viele dort gar nicht an), 15 Minuten sind ein sichtbares erstes Idle-Ziel, und die Chronik
  kann in Kapitel 1 darauf zeigen. Alte Spielstände bekommen die Taverne beim ersten Start geschenkt
  (Migration setzt sie als gebaut, damit niemand rückwirkend bauen muss).

## 3 Die Szene

Miras Kulisse: der Schankraum von innen, deckend, 1672 × 941 wie die Menü-Kulissen, mit **vier
Plätzen** (drei Tische und der Tresen), die im Bild als leere Sitzplätze angelegt sind. An jedem Platz
kann ein Besucher stehen oder sitzen (Freisteller mit echtem Alpha, gleiche Größe und Blickrichtung
wie die Spieler-Porträts, damit die Serie zusammenpasst). Ein leerer Platz zeigt Stuhl und Krug.
Am Tresen steht dauerhaft die Wirtin (siehe § 5).

Interaktion: Mauszeiger über einem Gast hebt ihn leicht an und zeigt Name und Anliegen als Kurzzeile;
Klick öffnet die Gäste-Karte im Stahlrahmen: Porträt, Name mit Beiname, zwei Sätze Ansprache, der
Auftrag mit Ziel und Belohnung, Knöpfe **Annehmen** (`.btn-iron`) und **Ablehnen** (Sekundär). Ein
angenommener Auftrag wandert als Aufgabe in die Quest-Seite (neuer Reiter „Taverne") und in den
Aufgaben-Tracker; passende Aktionen lassen sich direkt aus der Karte einreihen („In die Warteschlange:
20 Schwarzdorn-Wölfe"), wie heute beim Slayer-Auftrag.

Leben in der Szene ohne Performance-Kosten: Kerzenflackern als CSS-Overlay, Tag/Nacht nur als
Tönung nach der Uhr (Chef-Regel „nur Vignette" gilt für Zonen, die Taverne ist ein Innenraum), ein
Gast, der geht, verblasst; ein neuer kommt mit kurzem Einblenden.

## 4 Besucher-System

**Pool:** Besucher sind Archetypen mit Namen. Mira liefert je Archetyp ein Gesicht (erste Serie 10
Gäste, § 8), die Namen kommen aus einer Liste je Archetyp, sodass derselbe Archetyp mehrfach mit
anderem Namen auftauchen kann („Viktor der Slayer", später „Runa die Slayerin"). Weiblich und
männlich je Archetyp wie beim Spieler-Roster.

**Spawn:** Jeden Tag (lokale Mitternacht, wie der Segen) werden die vier Plätze neu besetzt:
`worldSeed + Tagesstempel + Platz` wählt Archetyp, Name und Auftrag aus dem Level-Band des Spielers.
Ein Gast, dessen Auftrag angenommen ist, bleibt sitzen, bis der Auftrag abgegeben ist (auch über den
Tageswechsel hinaus); die anderen drei Plätze wechseln. Damit gibt es nie Druck und nie leere Tage.

**Regeln der Mischung:** höchstens ein Slayer-Gast, höchstens zwei Sammel-Gäste, mindestens ein
Gast aus einem Skill, den der Spieler in den letzten sieben Tagen benutzt hat (fühlt sich an, als
kenne einen die Taverne). Ein „Fremder" (seltener Gast, 1 von 12 Tagen) bringt einen Auftrag mit
besonderer Belohnung (Andenken, Rune, Begleiter-Hinweis).

**Ablehnen und Tauschen:** Ein Gast pro Tag lässt sich gratis wegschicken (Platz wird neu besetzt);
weitere Wechsel kosten etwas Gold („eine Runde ausgeben", 100 × Level-Band). Kein Verlust, keine Strafe.

## 5 Die Wirtin

Die Taverne braucht ein festes Gesicht. Vorschlag: **Mutter Eske** aus dem Lore-Roster übernimmt den
Tresen (sie ist im Kanon die Köchin von New Haven; die Taverne wird ihr Haus). Sie begrüßt, erklärt
beim ersten Besuch die Plätze, gibt einmal am Tag einen Satz zur Lage („Heute sitzen zwei Jäger hier,
die Geier werden dreist") und verkauft in Phase 2 die Getränke. Kein zweites Porträt nötig, ihres liegt vor.

## 6 Aufträge

Aufträge sind Vorlagen je Archetyp mit Zufallszahlen aus dem Level-Band (wie die Slayer-Vergabe:
Ziel in Reichweite, nie trivial, nie unerreichbar). Jede Vorlage nennt Ziel, Belohnung und einen Satz
Ansprache; Zahlen skalieren mit dem Band (Gesamtlevel-Stufen wie bei den Dailies).

| Archetyp | Auftrag (Vorlage) | Belohnung |
|---|---|---|
| **Slayer** (Viktor, Runa) | Töte N Monster einer Art aus einer freigeschalteten Zone deines Bands; Varianten: ein Champion, N Turm-Kills | Slayer-XP, Slayer-Punkte, Kampf-XP; selten eine Auftragsmarke |
| **Bauer** (Billy, Marla) | Ernte N × Pflanze; Variante: pflanze und ernte einen vollen Zyklus | Anbau-XP, Saatgut, Speisen |
| **Bergmann / Holzfäller / Fischer / Sammler** | Bring N × Rohstoff (Abgabe aus dem Bestand oder frisch) | Skill-XP, Gold, ein Bündel des nächsten Tiers |
| **Schmied / Handwerker / Juwelier / Runenschreiber** | Stelle N × Gegenstand her und liefere ihn ab | Skill-XP, Material für das nächste Rezept, Gold |
| **Koch** (Eske vertritt, Gäste: „der hungrige Söldner") | Koche N Portionen einer Speise deines Bands | Kochen-XP, Zutaten, ein Festmahl |
| **Kräuterkundiger / Verzauberer** | Braue N Tränke / verzaubere ein Stück | Skill-XP, Runenstaub, ein Tonikum |
| **Dieb** („Ella mit den schnellen Händen") | Stiehl N Mal erfolgreich in einer Zone | Diebeskunst-XP, Gold, ein Fundstück |
| **Wanderer** (Fremder) | Erkunde: schließe einen Dungeon ab / besiege einen Champion / erreiche einen Ort | Andenken, Rune, seltenes Material, Chronik-Zeile |
| **Händler** (Mux vertritt, Gäste: Karawanenleute) | Liefere ein Sortiment (3 verschiedene Waren) | Gold über Verkaufswert, Karawanen-Kiste |

**Belohnungsökonomie:** Aufträge zahlen Skill-XP in Höhe von etwa 10–20 Minuten Fokus-Spielzeit
des Bands, dazu Rohstoffe im Wert der Abgabe plus Aufschlag, Gold gedeckelt je Tag. Slayer-Punkte
nur beim Slayer-Gast, in Höhe von 1–2 Turm-Aufträgen. Marken (Belohnungsladen) nur bei Fremden und
beim Tagesabschluss (siehe § 7), damit die Marken-Ökonomie aus 1.1.0 hält.

**Tagesabschluss:** Wer an einem Tag drei Aufträge abgibt, bekommt „Ein guter Abend": ein kleines
Bündel und eine Marke. Kein Streak, keine Strafe; wer nur einen macht, bekommt einen.

## 7 Die Taverne als Hub (Ausbaustufen)

- **Phase 1 (1.2.0):** Gebäude, Szene mit vier Plätzen, Wirtin, 10 Gäste-Archetypen mit Vorlagen,
  Tagesrotation, Ablehnen/Tauschen, Quest-Reiter „Taverne", Tagesabschluss.
- **Phase 2 (1.2.x):** Getränke (Eske verkauft Segen für Gold: 1 Stunde +10 % XP in einem Skill,
  Idle-tauglich, nicht stapelbar), Stammgäste (ein Gast, dem man dreimal geholfen hat, kommt als
  Stammgast mit besseren Aufträgen wieder), Aushang (Kopfgelder und Karawane), Begleiter sitzen
  in der Taverne, wenn sie nicht unterwegs sind.
- **Phase 3 (1.3):** Raben-Post am Tresen, Erzähl-Gäste mit Chronik-Bezug, Ereignisse (Fest, Belagerung
  aus Sicht der Gäste), Titel und Trophäen an der Wand.

Die täglichen Aufgaben (60 Zettel) bleiben in Phase 1 bestehen; in Phase 2 werden sie zu Gästen
(„die Tafel wird zu Leuten"), damit es nur noch einen Ort für Aufträge gibt. Das ist die Entscheidung E2.

## 8 Bedarf bei Mira

1. **Taverne innen**, deckend, 1672 × 941, mit vier klar lesbaren Plätzen (drei Tische, Tresen),
   Positionen als Pixelkoordinaten im QA-Blatt, leere Stühle mit Krug, Tagesfassung; Nachtfassung
   nur als Tönung im Spiel.
2. **Gäste, erste Serie (10):** Slayer m/w, Bauer m/w, Bergmann, Fischer, Schmied, Kräuterkundige,
   Dieb, Fremder (Wanderer mit Kapuze). Freisteller mit Alpha, Ganzkörper, gleiche Größe und
   Blickrichtung wie das Spieler-Roster (Blick nach rechts zum Tresen), sitzend oder stehend je Platz.
3. **Wirtin** liegt vor (Eske); optional eine Tresen-Pose.
4. Sidebar-Icon „Taverne" (Krug), Gebäude-Bild für New Haven (Taverne außen, Tag).
5. Später: 10 weitere Gäste, Getränke-Icons, Stammgast-Posen.

## 9 Technik

- **State (ein Save-Bump 83 → 84):** `tavern: { built: boolean, day: string, seats: [{ archetypeId, sex, nameIdx, quest: QuestInstance | null, accepted: boolean }×4], done: { dayStamp, count }, swapsUsed, regulars: {} }`.
  `QuestInstance` = Vorlagen-ID + gewürfelte Parameter + Fortschritts-Baseline (Zähler „seit Annahme"
  wie bei wiederholbaren Quests). Migration: Alt-Saves bekommen `built: true`, Plätze werden beim
  ersten Tick besetzt.
- **Engine:** `tavernRefresh(state, content, now)` im Tageswechsel-Hook des Ticks (der Hook fehlt
  heute, die Dailies laufen im Client; er kommt mit dieser Arbeit und macht Offline == Live);
  Vorlagen als Content (`content.tavernQuests`), Namen und Ansprache als Content mit 7 Sprachen;
  Fortschritt liest bestehende Zähler (Kills je Monster, Ernte, Herstellung, Diebstahl, Dungeons,
  Champions); Abgabe verbraucht Items wie `deliver_items` der Warteschlangen-Arbeit.
- **UI:** `TavernPage` (Szene, Plätze, Gäste-Karte im Stahlrahmen, Wirtin-Zeile), Sidebar-Eintrag
  unter New Haven, Quest-Reiter „Taverne", Tracker-Einträge, Toast beim Gästewechsel („Neue Gäste
  in der Taverne") nur beim Tageswechsel, keine Ungelesen-Zähler.
- **Aufwand:** Engine 4 Tage, Content 3, UI 5, Lore-Texte 3, QA 2 ≈ 17 Agent-Tage; mit drei
  parallelen Agenten zwei bis drei Wochen ab Miras Szene. Ohne Szene lässt sich alles mit einer
  Platzhalter-Kulisse bauen und am Ende tauschen.

## 10 Entscheidungen des Chefs

- **E1 Zugang:** baubar als erstes Gebäude (100 Holz, 1 500 Gold, 15 min) oder von Anfang an da? *Empfehlung: baubar, Alt-Saves geschenkt.*
- **E2 Dailies:** bleiben in 1.2.0 neben der Taverne, werden in 1.2.x zu Gästen? *Empfehlung: ja, in dieser Reihenfolge.*
- **E3 Wirtin:** Eske am Tresen (Kanon, Porträt vorhanden) oder eine neue Figur? *Empfehlung: Eske.*
- **E4 Plätze:** vier (drei Tische + Tresen) oder drei? *Empfehlung: vier, damit Slayer + zwei Sammler + ein Fremder passen.*
- **E5 Rotation:** täglich um Mitternacht mit einem Gratis-Tausch, oder alle acht Stunden? *Empfehlung: täglich.*
- **E6 Marken:** nur Fremde und Tagesabschluss zahlen Marken? *Empfehlung: ja, sonst kippt der Belohnungsladen.*
- **E7 Erste Gäste-Serie:** die zehn aus § 8 für Mira freigeben?
