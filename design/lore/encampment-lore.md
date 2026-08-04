# Encampment-Lore — „New Haven" (The Encampment)

**Status:** v2 (Lore-Dev 2026-07-26; Namens-Entscheide des Chefs vom 27.07.2026 eingearbeitet, Task #360) — Abnahme-Vorlage für den Chef im Rahmen von Task #357 (0.3.0-Headline-Feature).

**Chef-Entscheide 27.07. (bindend, überschreiben v1):**
1. Der **Ortsname ist „New Haven"** — in ALLEN 7 Sprachen unübersetzt (auch zh/ru lateinisch geschrieben). Er ersetzt „das Lager" / „the Camp" überall dort, wo bisher ein Ortsname stand.
2. Gebäude 1 heißt **Zentralhaus / Town Hall** (`camp_townhall`), NICHT mehr „Herzfeuer/Hearthfire": Das Zentrum ist ein Verwaltungs- und Versammlungshaus, kein Lagerfeuer. Der Arbeitstitel war ein Echo des Studionamens und gehört nicht ins Spiel. Das **Wachfeuer bleibt als Gründungsmotiv** der Erzählung (§ 1.1) und als Requisit auf dem Platz, ist aber kein Gebäude.
3. Gebäude 3 heißt **Vorratsspeicher / Storehouse** (`camp_storehouse`), NICHT mehr „Erdgewölbe/Earthen Vault": ein aufgeständerter Speicher auf Steinstelzen statt eines Erdkellers.

**Grundlage (bindend):** `design/encampment-konzept.md` (Chef-abgenommene Gebäudeliste + eiserne Regeln), `design/lore/weltlore-grim-reach.md` (v3 — KANON: Glutfeste § 3.2, Wächter § 2, Gesetze der Götter § 1.2), `design/lore/aschechronik-spec.md` (Kapitel 9 und 14 — die Anlässe der Zentralhaus-AUSBAUTEN; Stufe I steht seit dem Chef-Entscheid vom 27.07. ab Spielstart und hängt an keinem Kapitel mehr).
**Scope:** NUR 0.3.0-Phase-1-Lore: Erzählung, Ausbaustufen, 15 Gebäude, Baumeister-Frage. Companion-/Rekruten-/Missions-Lore ist ausdrücklich NICHT ausgearbeitet (Chef: „noch nicht bedenken") — wo sie später andocken kann, steht ein markierter offener Anker, mehr nicht.
**Figuren:** Es wird KEINE neue benannte Figur eingeführt (§ 4). Damit fallen keine Porträt-Specs an; die Chef-Direktive „jede benannte Figur bekommt eine Aussehens-Vorlage" ist per Verzicht erfüllt.
**Sprachregeln:** Alle spielersichtbaren Texte in diesem Dokument (Flavor-Zeilen, Stufen-Beschreibungen, UI-Strings, Wächter-Zitate) folgen der Direktive „natürliche Spieltexte": höchstens EIN Gedankenstrich pro Text, keine starren Dreier-Parallelismen. Einzige gewollte Ausnahme: der Schrein-Flavor zitiert das Gesetz des Bildes („kein Bildnis, keinen Mund, keine Hand", Bibel § 1.2) — das ist Liturgie-Echo, kein KI-Muster.

---

## § 1 Die Erzählung von New Haven

### § 1.1 Warum es entsteht

Die Glutfeste ist eine Zuflucht: der letzte gemeinsame Ort der freien Völker, ein Wall, hinter den man sich zurückzieht. Seit dem Fall der Welt hat das Reach nur so gebaut — rückwärts, enger, näher ans Feuer.

New Haven ist das Gegenteil. Es ist der erste Ort seit dem Fall, der **vorwärts** gebaut wird: hinaus aus dem Schutz der Weiden, an die alte Wächterstraße (§ 1.3), dorthin, wo das Land verheert ist und die Straße es noch weiß. Kein zweites Emberhold, keine Festung, kein Rückzug. Ein vorgeschobener Platz der Künste des Reachs, errichtet von einem Einzigen mit geliehenen Händen: der eine behauptete Flecken Licht im verheerten Reach.

**Der Ort ist zuerst da, nicht der Plan.** An der Ruine einer alten Wegstation, an der Furt, wo die Straße den Bach quert, liegt ein karger Rastplatz: ein Herdstein, ein Brunnen, ein Windschirm aus Häuten und ein Wachfeuer, das jemand am Brennen gehalten hat. Viel mehr ist es nicht. Es ist der letzte Punkt der alten Feuerlinie, der noch glimmt; die Linie erlosch von außen nach innen und ist hier stehengeblieben.

**Hier kommt der Namenlose an.** Nicht als Lohn für eine Tat, sondern weil die Straße aus der Glutfeste hinaus an dieser Furt endet und der Weg weiter ins verheerte Land führt. Wer hier ankommt, hat keinen Ort. Er hat eine Feuerstelle und die Wahl, sie ausgehen zu lassen oder etwas daneben zu stellen. Alles, was New Haven später ist, entsteht aus dieser einen Entscheidung: Die Feuerlinie kehrt von innen nach außen zurück, und sie beginnt an dem Punkt, an dem der Namenlose stehenbleibt.

Der Wächter über den Eintrag: *„Die Chronik führt seit Generationen Buch über Verlorenes. Der erste Posten in der anderen Spalte ist klein: ein Feuer an der alten Straße, und einer, der nicht weitergeht."*

Was danach geschieht, steht in keinem Plan. Das Feuer wird gesehen, und wer in der Glutfeste nichts mehr zu verlieren hat, kommt die Straße herauf und bleibt. Aus dem Rastplatz wird ein Platz mit Tisch und Tür, dann einer mit Gruben, Balken und Arbeit, und irgendwann trägt die Chronik einen Namen nach, den nicht der Wächter vergeben hat, sondern die Zugezogenen: **New Haven**. Der Wächter hat ihn übernommen, wie er alles übernimmt, was sich durchsetzt. *„Der Name ist nicht von hier. Die Leute auch nicht. Beides bleibt."*

### § 1.2 Was es ist — und was es nicht ist

**Noch keine Stadt.** Zivilisation ist im Reach einmal gescheitert; die Chronik hat die Kapitel dazu. New Haven baut deshalb nicht in die Breite, sondern in die Tiefe: erst ein Haus, das hält, dann das nächste. Es gibt einen Platz, ein Zentralhaus, Gruben, Balken und Arbeit; es gibt keine Gassen, kein Wappen und keine Mauer, die eine Stadt behaupten würde. Alles hier ist verwittert-praktisch: geborgenes Material, alte Fundamente, geflickte Plane. Was glänzt, ist frisch geschmiedet und wird es nicht lange bleiben.

**Wessen es ist.** New Haven gehört dem Namenlosen. Die Chronik führt es unter seinem Namen — beziehungsweise unter dem Fehlen desselben. Die Glutfeste schickt Hände und Werkzeug (§ 4), Mux schickt einen Karren, Voss schickt einen Grundriss und Anweisungen. Die Völker halten die Glutfeste; der Namenlose hält die Straße, und im Zentralhaus wird aufgeschrieben, was daraus folgt.

**Was es tut.** New Haven arbeitet, während der Namenlose fort ist. Das ist sein ganzer Sinn und seine ganze Würde: Ein Ofen, der nachts schmilzt, ein Rauch, der geduldig kocht, ein Turm, von dem aus einer die Arbeit der anderen ein Stück länger wachhält. Wer von der Jagd zurückkommt, findet Barren, Rauchfleisch und einen Bautrupp, der Vollzug meldet. Der Wächter nennt den Ort nüchtern, was er ist: *„Kein Sieg. Ein Standpunkt."*

### § 1.3 Die alte Wächterstraße (the old Wardens' Road) — neues Kanon-Stück, klein gehalten

Als das Reach noch Könige hatte, hatte es auch Straßen, und eine davon war Dienstweg: die **Wächterstraße**, die Linie der Wachfeuer, die von den Kernlanden hinaus zur Mark lief. Auf ihr gingen die **Wegwächter (Road Wardens)** — ein Amt wie das des Waldvogts, nur menschlich und darum ausgestorben: Feuer nähren, Brücken flicken, melden, was die Nacht bewegt. Ihre Wegstationen standen eine Tagesreise auseinander, mit Herdstein, Brunnen und einem Tor, das man schließen konnte. Als die Mark aufgegeben wurde, starb die Straße mit ihr; die Stationen verfielen, die Feuerlinie erlosch von außen nach innen.

Das Volk der Glutfeste nimmt an, die Straße sei nach **dem** Wächter benannt. Sie ist es nicht; das Amt ist älter als sein Titel. Er stellt es nicht richtig. *„Die Straße ist nicht nach mir benannt. Ich bin nur nie von ihr abgekommen."*

*(Absicht dieses Bausteins: Er erklärt mit einem einzigen neuen Begriff, warum an der Furt Fundamente, ein Brunnen und ein Herdstein liegen — New Haven baut nichts aus dem Nichts, es setzt Erbe wieder instand. Keine neuen benannten Figuren, kein neuer Schauplatz auf der Karte: Die Straße liegt zwischen den Weiden und der Mark, dort, wo New Haven von der ersten Stunde an liegt.)*

### § 1.4 Verzahnung mit der Aschechronik (Spielstart / K9 / K14)

Die Gründung ist **kein** Kapitel-Ereignis mehr (Chef-Entscheid 27.07.): New Haven ist die Heimatbasis ab der ersten Spielminute. An den echten Kapitel-Inhalten hängen nur noch die beiden **Ausbau**-Stufen des Zentralhauses:

- **Spielstart — die Ankunft (Zentralhaus I, die Siedler-Kate).** Der Namenlose kommt an der Furt an und findet den Rastplatz, wie ihn die tote Straße hinterlassen hat: Herdstein, Brunnen, ein Feuer. Die Kate mit Tisch und Tür ist das Erste, was er selbst dagegensetzt, und der erste Ort seit dem Fall, an dem einer aufschreibt, was gebaut werden soll. Kapitel 4 „Die leere Mark" erklärt weiterhin das Land ringsum und warum es leer ist; es schaltet New Haven aber nicht mehr frei, sondern beantwortet nachträglich, wovor der Rastplatz übriggeblieben war.
- **Kapitel 9 „Der Chor unter den Hügeln" — der Ring (Zentralhaus II, das Versammlungshaus).** Der Gesang der Toten hat eine Richtung, kryptenwärts, und der Wächter schreibt: „Wir gehen ihr nach." Die Wege werden länger, die Nächte draußen mehr. Wer draußen bleibt, muss wissen, wohin er zurückkommt: Aus der Kate wird ein Versammlungshaus, groß genug für alle, die noch da sind, und um den Platz legt sich ein Ring aus Pfählen.
- **Kapitel 14 „Was die See heimträgt" — der Stein (Zentralhaus III, der Glockenturm).** Die See gibt die Flotten der Flucht zurück, Leichnam um Leichnam; der Wächter schließt das Kapitel „Flucht" endgültig. Wer nicht fliehen kann, baut. Das Haus wird auf den Fundamenten der alten Wegstation neu errichtet, Stein unten, Balken oben, und darüber hängt eine Glocke, die man bis zur Furt hört. Der Wächter: *„Ich habe das Kapitel ‚Flucht' geschlossen und am selben Tag einen Grundstein vermerkt. Es ist derselbe Eintrag, zweimal geschrieben."*

---

## § 2 Die drei Ausbaustufen (gekoppelt an Zentralhaus I/II/III)

### Stufe I — Das Wachfeuer (The Watchfire) · ab Spielstart

- **DE:** Ein Feuer der alten Straße, ein Kessel, ein Windschirm aus Häuten, daneben die erste Kate. Kaum ein Ort, eher die Behauptung, dass hier wieder einer sein wird.
- **EN:** A fire of the old road, a kettle, a windbreak of hides, and beside it the first hut. Barely a place, more the claim that someone will be here again.

### Stufe II — Der Zeltring (The Tent Ring) · ab Kapitel 9

- **DE:** Zelte und erste Dächer um den Platz, das Versammlungshaus an seiner Stirnseite, dahinter ein Ring aus zugespitzten Pfählen. Wer die tote Straße entlangkommt, sieht zum ersten Mal seit Jahren ein Licht, das bleibt.
- **EN:** Tents and the first roofs around the square, the assembly house at its head, and behind them a ring of sharpened stakes. Whoever comes down the dead road sees, for the first time in years, a light that stays.

### Stufe III — Die Wegstation (The Waystation) · ab Kapitel 14

- **DE:** Die alte Station der Wächterstraße, auf ihren eigenen Fundamenten neu errichtet: Stein unten, Balken oben, ein Tor, das man schließen kann, und eine Glocke über dem Zentralhaus. Die See lässt niemanden fort; also wird gebaut, als bliebe man.
- **EN:** The old station of the Wardens' Road, raised again on its own foundations: stone below, timber above, a gate that closes, and a bell above the town hall. The sea lets no one leave; so it is built as if to stay.

*(Kulissen-Hinweis für die Chef-Assets: Die drei Stufen sind als EINE wachsende Szene gedacht — gleiche Kamera, gleiche Furt, gleiche Ruine im Hintergrund; es kommen nur Bauten hinzu und die Ruine wird Stück für Stück wieder Gebäude. Palette durchgehend: Aschgrau, nasses Holzbraun, stumpfes Eisen, ein einziger warmer Punkt: das Wachfeuer auf dem Platz vor dem Zentralhaus.)*

---

## § 3 Die 15 Gebäude — finale Namen, Flavor, Visuals

**Stilregeln für alle Gebäude-Assets (Projekt-Kanon):** gemalter Dark-Fantasy-Stil wie die bestehende Spiel-Art; Freisteller mit echtem Alpha (Schachbrett-Verbot); verwittert-praktisch, geborgenes Material, keine Folklore, keine Comedy, kein Glanz. KEIN Fantasy-Glow — ehrliches Feuer-/Kohlenlicht ist erlaubt, wo ein Feuer brennt (Wachfeuer, Schmelzofen, Räucherhaus, Turm-Kohlenbecken). Gemeinsame Farbwelt: Aschgrau, Holzbraun, stumpfes Eisen, geflickte Plane; Akzente sparsam (Glutrot am Feuer, Beet-Grün im Garten). Dateinamen-Vorschlag: `camp_<id>.png`.

Umbenennungen gegenüber den Arbeitstiteln sind je Gebäude begründet; 9 von 15 Arbeitstiteln halten dem Ton stand und bleiben.

---

**1. Zentralhaus (Town Hall)** — Zentrum, Stufen an K4/K9/K14 · ID `camp_townhall`
*Umbenannt am 27.07. (Chef-Entscheid, Task #360; war: „Herzfeuer/Hearthfire"). Begründung: Das Hearthforge-Echo war ein Echo des Studionamens und gehört nicht ins Spiel, und das Zentrum von New Haven ist ein HAUS, kein Feuer — dort wird verwaltet, verteilt und entschieden. Das Wachfeuer bleibt als Gründungsmotiv (§ 1.1) und als Requisit auf dem Platz davor, aber es ist kein Gebäude mehr.*
- **Flavor DE:** Erst eine Kate mit einem Tisch, später ein Haus mit Glocke: Wer sie hört, weiß, dass in New Haven einer entscheidet.
- **Flavor EN:** First a hut with a table, later a house with a bell: whoever hears it knows that someone in New Haven is deciding.
- **Visual (wächst über drei Stufen, gleiche Stelle):** **I — Siedler-Kate:** niedriges Blockhaus auf dem alten Fundament der Wegstation, Grassodendach, ein einziger Raum mit Tisch, Tür und Fensterluke; davor der Herdstein mit dem Wachfeuer. **II — Versammlungshaus:** aufgestockt und verlängert, offene Vorlaube auf Pfosten, lange Tafel und Bänke, an der Außenwand ein Brett mit angeschlagenen Zetteln. **III — Zentralhaus mit Glockenturm:** Sockelgeschoss aus gesetztem Feldstein, Fachwerk darüber, Schindeldach, seitlich ein schlanker offener Glockenstuhl aus Balken mit einer einzelnen Bronzeglocke. Durchgehend verwittert-praktisch, keine Zier, kein Wappen; warmes Licht nur aus Fenster und Feuerstelle, kein Glow.

**2. Wachturm (Watchtower)** — Offline-Zeit · ID-Vorschlag `camp_watchtower`
*Arbeitstitel bleibt.*
- **Flavor DE:** Solange oben einer wacht, ruht unten die Arbeit nicht.
- **Flavor EN:** While someone keeps watch above, the work below does not rest.
- **Visual:** Schlanker Gerüstturm aus entrindeten Stämmen mit Kreuzverstrebungen und Leiter, oben eine offene Plattform mit Häute-Windschirm und eisernem Kohlenbecken. Bauweise sichtbar pragmatisch: Seilbund und Holznagel statt Schmiedezier. Stimmung: ein dünner, aufrechter Strich gegen einen aschgrauen Himmel.

**3. Vorratsspeicher (Storehouse)** — Bank-Erweiterung · ID `camp_storehouse`
*Umbenannt am 27.07. (Chef-Entscheid, Task #360; war: „Erdgewölbe/Earthen Vault", davor Arbeitstitel „Vorratslager"). Kein Erdkeller, kein Gewölbe: New Haven lagert oben statt unten. Ein aufgeständertes Speicherhaus auf Steinstelzen ist an einer Furt auch das Vernünftige — Hochwasser und Ratten bleiben draußen.*
- **Flavor DE:** Auf Steinstelzen gesetzt, damit weder Nässe noch Ratten hineinkommen. Voss hat den Grundriss geschickt, dazu die Anweisung, alles zweimal zu zählen.
- **Flavor EN:** Raised on stone stilts, so neither damp nor rats get in. Voss sent the floor plan, along with instructions to count everything twice.
- **Visual:** Ein kleines Bohlenhaus, das auf sechs gemauerten Steinstelzen gut kniehoch über dem Boden steht; über jeder Stelze eine flache Steinscheibe als Rattenteller. Aufgang über eine schmale Bohlentreppe, Tür mit Eisenband und Riegel, in den Türpfosten eingebrannte Zählkerben. Unter dem Haus Schatten, Werkzeug und ein umgedrehtes Fass. Stimmung: unscheinbar mit Absicht — was trocken liegt, verdirbt nicht.

**4. Schreibzelt (The Scrivener's Tent)** — Warteschlangen-Plätze · ID-Vorschlag `camp_scriveners_tent`
*Umbenannt (Arbeitstitel „Kommandozelt"): New Haven ist kein Heerlager und der Namenlose kein Feldherr. Die Warteschlange ist im Reach etwas Schriftliches: Tagwerke, abends notiert — die Kultur der Chronik, eine Nummer kleiner.*
- **Flavor DE:** Was abends aufgeschrieben ist, muss morgens nicht mehr entschieden werden.
- **Flavor EN:** What is written down at night need not be decided in the morning.
- **Visual:** Kleines, straff gespanntes Zelt aus geflickter grauer Plane, davor ein Klapptisch mit Steinbeschwerern, Tintenhorn und einer Schnur, an der versiegelte Auftragszettel hängen. Alles ordentlich, nichts prächtig. Stimmung: der stillste Winkel von New Haven.

**5. Fischerhütte (Fisher's Hut)** — Angeln · ID-Vorschlag `camp_fishers_hut`
*Arbeitstitel bleibt.*
- **Flavor DE:** Die Furt gibt mehr her als Durchgang, wenn man still genug sitzt.
- **Flavor EN:** The ford yields more than passage, if you can sit still long enough.
- **Visual:** Windschiefe Hütte aus Bohlen und Treibholz auf niedrigen Pfählen am Bachufer bei der Furt, daneben Trockengestelle mit Netzen und Reusen aus Weidengeflecht. Ein schmaler Steg aus zwei Planken ragt ins Wasser. Stimmung: graues Wasser, Geduld, nasses Holz.

**6. Sägegrube (The Sawpit)** — Holzfällen · ID-Vorschlag `camp_sawpit`
*Umbenannt (Arbeitstitel „Sägeplatz"): Die Sägegrube ist das historische, handfeste Werk dazu — zwei Mann, eine Schrotsäge, ein Stamm über der Grube. Passender Grenzlager-Ton als ein „Platz".*
- **Flavor DE:** Einer steht oben, einer unten im Sägemehl; Balken werden es so oder so.
- **Flavor EN:** One man stands above, one below in the sawdust; it comes out beams either way.
- **Visual:** Rechteckige, mit Balken eingefasste Grube, quer darüber ein aufgebockter Stamm mit langer Schrotsäge; daneben Stapel entrindeter Stämme und fertiger Balken, Sägemehl im Matsch. Kein Dach, höchstens eine Plane an zwei Pfosten. Stimmung: Schweiß und Harzgeruch.

**7. Stollenmund (The Adit)** — Bergbau · ID-Vorschlag `camp_adit`
*Arbeitstitel bleibt; EN „The Adit" ist das würdige alte Bergmannswort für den Stollenzugang.*
- **Flavor DE:** Der Hang gibt nichts freiwillig her, aber er gibt.
- **Flavor EN:** The hillside gives nothing freely, but it gives.
- **Visual:** Ein mit schweren Stützbalken gerahmtes Stollenportal in einer felsigen Uferböschung, davor Abraumhalde, Körbe und ein Schlitten mit Erzbrocken. Am Türstock ein kalter Laternenhaken. Stimmung: schwarzes Loch in grauem Fels, ehrliche Arbeit, kein Geheimnis.

**8. Saatgarten (The Seed Garden)** — Anbau + Sammeln · ID-Vorschlag `camp_seed_garden`
*Umbenannt (Arbeitstitel „Feldgarten"): „Feld" verspricht, was New Haven nicht ist. „Saat" ist im Reach ein aufgeladenes Wort — Maera in jeder Saat, die Rakhari-Karawanen mit Saatgut. Der Garten sagt: Hier wird wieder gesät.*
- **Flavor DE:** Die Erde hier hat lange nichts Gutes getragen; man bringt ihr das Vertrauen wieder bei.
- **Flavor EN:** This soil has borne nothing good in a long time; it is being taught to trust again.
- **Visual:** Hochbeete, eingefasst mit halbierten Stämmen, hinter einem niedrigen Flechtzaun; an den Eckpfosten hängen kleine Saatgut-Beutel, daneben eine Regentonne aus einem alten Fass. Erste grüne Reihen in grauer Erde. Stimmung: der einzige Fleck Farbe in New Haven, und er ist klein.

**9. Hehlerzelt (The Fence's Tent)** — Diebeskunst · ID-Vorschlag `camp_fences_tent`
*Arbeitstitel bleibt: ehrlich benannt und trocken genug für den Reach-Ton.*
- **Flavor DE:** Niemand fragt, woher die Ware kommt. Genau das ist das Geschäft.
- **Flavor EN:** No one asks where the goods come from. That is the trade.
- **Visual:** Dunkles, mehrfach geflicktes Zelt, bewusst ein Stück abseits der anderen gestellt, Eingangsplane halb zugeschlagen. Davor Kisten unter Ölplane und eine Handwaage, deren Gewichte erkennbar nicht zueinander gehören. Stimmung: nichts Verbotenes zu sehen, und genau das fällt auf.

**10. Werkhof (The Workyard)** — alle Handwerks-Künste · ID-Vorschlag `camp_workyard`
*Arbeitstitel bleibt.*
- **Flavor DE:** Bank an Bank unter einer Plane: Jede Kunst arbeitet schneller, wenn die Nachbarkunst die Zange hält.
- **Flavor EN:** Bench by bench under one tarp: every craft works faster when the next one holds the tongs.
- **Visual:** Offene Werkschuppen um einen festgetretenen Hof, plankengedeckte Werkbänke, Werkzeugwände, ein Schleifstein mit Tretkurbel; die Dächer sind steinbeschwerte Planen. Halbfertige Werkstücke überall, nichts Dekoratives. Stimmung: das lauteste Viertel von New Haven.

**11. Schmelzofen (The Smelter)** — Offline-Veredelung Erz → Barren · ID-Vorschlag `camp_smelter`
*Arbeitstitel bleibt.*
- **Flavor DE:** Feuer hält keine Dienstzeiten: Was hineingeht, kommt als Barren wieder heraus, ob jemand zusieht oder nicht.
- **Flavor EN:** Fire keeps no working hours: what goes in comes back out as bars, watched or not.
- **Visual:** Gedrungener Schachtofen aus Lehmziegeln und Feldstein mit ledernem Blasebalg, davor Schlackenhalde und Barrenformen aus Sandstein. Am Ofenmund mattes Kohlenlicht, Rauchfahne in den grauen Himmel. Stimmung: das zweite Feuer von New Haven, das arbeitende.

**12. Räucherhaus (The Smokehouse)** — Offline-Veredelung Fisch/Fleisch → Gerichte · ID-Vorschlag `camp_smokehouse`
*Arbeitstitel bleibt.*
- **Flavor DE:** Rauch ist der geduldigste Koch des Reachs.
- **Flavor EN:** Smoke is the most patient cook in the Reach.
- **Visual:** Niedriges Blockhaus mit Schindeldach, aus dessen Fugen und Firstluke träge Rauch sickert; innen angedeutet Gestelle mit Fischen und Schinken über einem Glimmfeuer. Vor der Tür Salzfass und Hackklotz. Stimmung: der einzige Ort in New Haven, der nach etwas Gutem riecht.

**13. Trophäenwand (The Trophy Wall)** — Slayer · ID-Vorschlag `camp_trophy_wall`
*Umbenannt (Arbeitstitel „Trophäenhalle"): Eine eigene Halle wäre für New Haven zu groß gebaut. Die Trophäen hängen am Wall selbst — die Wand ist Teil der Palisade, und sie wächst mit den Taten.*
- **Flavor DE:** Brenna zahlt für Köpfe; die Wand erinnert daran, dass geliefert wurde.
- **Flavor EN:** Brenna pays for heads; the wall remembers that they were delivered.
- **Visual:** Ein verstärkter Abschnitt der Palisade unter einem schrägen Vordach: Schädel, Schuppen, Totems und zerbrochene Waffen, mit Eisenhaken angeschlagen, darunter eingekerbte Strichlisten. Kein Arrangement, reine Buchführung in Knochen. Stimmung: still, respektvoll, unmissverständlich.

**14. Schrein der Stillen (Shrine of the Silent)** — Wochensegen · ID-Vorschlag `camp_silent_shrine`
*Umbenannt (Arbeitstitel „Schrein des Wächters"): Der Wächter ist kein Gott und würde einen Schrein auf seinen Namen als Erster in der Chronik beanstanden. Die Stillen sind Kanon (Bibel § 1.1), und ein Schrein OHNE Bildnis ist die einzige Andacht, die das Reach nach dem Bildersturz noch wagt — genau richtig, um die Segen des Reachs zu verstärken. Wächter-Zitat dazu: „Er ist leer. So ist es richtig."*
- **Flavor DE:** Kein Bildnis, kein Mund, keine Hand: nur ein aufgerichteter Stein und die Möglichkeit, dass jemand zuhört.
- **Flavor EN:** No image, no mouth, no hand: only a raised stone and the chance that someone is listening.
- **Visual:** Ein einzelner roher, windgeschliffener Stehstein auf einem kleinen Rund aus Steinplatten, davor eine flache Opferleiste mit Kornschale und Wasserschale. KEINE Gravuren, keine Figur, kein Symbol; in höheren Stufen kommen nur ein Randsteinkreis und sieben unbeschriftete flache Steine hinzu. Stimmung: der leerste Ort von New Haven, und der aufgeräumteste.

**15. Händlerposten (The Trading Post)** — Verkauf · ID-Vorschlag `camp_trading_post`
*Arbeitstitel bleibt.*
- **Flavor DE:** Mux schickt den Karren, wann immer die Straße es zulässt; die Preise sind fair, sagt Mux.
- **Flavor EN:** Mux sends the cart whenever the road allows; the prices are fair, says Mux.
- **Visual:** Ein Unterstand aus Pfosten und Plane, an den ein zweirädriger Karren rückwärts angedockt ist; Kisten, Ballen und Fässer unter einem Netz, an einem Querbalken eine hängende Balkenwaage. Die Plane ist aus erkennbar zusammengewürfelten Stoffbahnen geflickt. Stimmung: Umschlagplatz, kein Markt.

---

## § 4 Der Baumeister — der Bautrupp der Glutfeste

**Vorschlag (genau einer): Es baut ein bewusst namenloser Bautrupp aus der Glutfeste — „die Hände".** Die Glutfeste fragt nicht nach Herkunft, sie fragt nach Händen (Bibel § 3.2); eine Handvoll Freiwillige aller Völker kommt über die Straße, wenn der Namenlose Gold und Material stellt, baut, und geht wieder. Der Namenlose beauftragt, der Trupp errichtet, der Wächter vermerkt: *„Ich baue nicht. Ich vermerke, was steht."*

**Begründung:**
1. **Kein neues Gesicht vor dem 02.08.** — ein benannter Baumeister bräuchte nach Chef-Direktive Porträt-Spec, Asset und Begrüßungszeilen; der Trupp braucht nichts davon.
2. **Kader klein halten** — jeder Name muss seinen Platz verdienen; ein Bau-Timer verdient noch keinen.
3. **Die Fiktion deckt die Mechanik exakt:** EIN Bautrupp (eiserne Regel 4) erklärt, warum immer nur ein Bau läuft, warum Bauzeit Echtzeit ist und offline weiterläuft (der Trupp arbeitet, während der Namenlose fort ist), und warum der Offline-Report melden kann: „New Haven hat gearbeitet."
4. **Offener Anker, nicht ausgearbeitet:** Wenn später Companions/Rekruten kommen (explizit NICHT 0.3.0), kann ein benannter Baumeister aus diesem Trupp heraustreten, ohne dass irgendein Text von heute bricht.

**UI-Text-Vorschläge (bilingual, quest-/toast-fertig):**
- DE „Bautrupp beschäftigt" · EN "Work crew busy"
- DE „Der Bautrupp errichtet: {Gebäude} (Stufe {n})" · EN "The work crew is raising: {building} (tier {n})"
- DE „Der Bautrupp meldet: {Gebäude} steht." · EN "The work crew reports: {building} stands."
- Offline-Report: DE „New Haven hat gearbeitet." · EN "New Haven has been working."

---

## § 5 Glossar-Nachtrag (nach Chef-Abnahme in die Weltlore-Bibel übernehmen)

| DE | EN | Bemerkung |
|---|---|---|
| New Haven | New Haven | **Ortsname; in ALLEN 7 Sprachen UNÜBERSETZT** (auch zh/ru lateinisch). Feature-/Sidebar-Label: „New Haven" (Chef 27.07.) |
| das Lager | the Encampment | nur noch beschreibend/intern (Code-Präfix `camp_`, Feature-Doku); kein Ortsname mehr |
| die alte Wächterstraße | the old Wardens' Road | Plural: Straße der Wegwächter, nicht DES Wächters |
| Wegwächter | Road Wardens | ausgestorbenes Amt, analog Waldvogt |
| die Furt | the ford | namenlos (Eigenname optional, § Offene Fragen) |
| Das Wachfeuer | The Watchfire | Ausbaustufe I |
| Der Zeltring | The Tent Ring | Ausbaustufe II |
| Die Wegstation | The Waystation | Ausbaustufe III |
| Zentralhaus | Town Hall | Gebäude 1 (war: Herzfeuer/Hearthfire — Chef-Entscheid 27.07.) |
| Wachturm | Watchtower | Gebäude 2 |
| Vorratsspeicher | Storehouse | Gebäude 3 (war: Erdgewölbe, davor Vorratslager — Chef-Entscheid 27.07.) |
| Schreibzelt | The Scrivener's Tent | Gebäude 4 (war: Kommandozelt) |
| Fischerhütte | Fisher's Hut | Gebäude 5 |
| Sägegrube | The Sawpit | Gebäude 6 (war: Sägeplatz) |
| Stollenmund | The Adit | Gebäude 7 |
| Saatgarten | The Seed Garden | Gebäude 8 (war: Feldgarten) |
| Hehlerzelt | The Fence's Tent | Gebäude 9 |
| Werkhof | The Workyard | Gebäude 10 |
| Schmelzofen | The Smelter | Gebäude 11 |
| Räucherhaus | The Smokehouse | Gebäude 12 |
| Trophäenwand | The Trophy Wall | Gebäude 13 (war: Trophäenhalle) |
| Schrein der Stillen | Shrine of the Silent | Gebäude 14 (war: Schrein des Wächters) |
| Händlerposten | The Trading Post | Gebäude 15 |
| die Hände / der Bautrupp | the work crew | namenloser Bautrupp der Glutfeste |

**Empfehlung an content-dev (Umsetzung nur auf CEO-Order):** Content-IDs mit `camp_`-Präfix wie in § 3 vorgeschlagen (verhindert Kollisionen mit Item-/Monster-IDs, z. B. einem künftigen `smelter`-Item). Asset-Dateinamen analog `camp_<id>.png`.

---

## Offene Fragen an den Chef

1. ~~**Eigenname für den Ort?**~~ **ENTSCHIEDEN 27.07.: „New Haven"**, in allen 7 Sprachen unübersetzt. Der Alternativvorschlag „Graufurt (Greyford)" ist damit vom Tisch.
2. **Abnahme der Umbenennungen** (Schreibzelt, Sägegrube, Saatgarten, Trophäenwand, Schrein der Stillen) — insbesondere **Schrein der Stillen** statt „Schrein des Wächters": Der Wächter ist kein Gott; der bildlose Schrein der Stillen ist die kanonisch saubere Lösung. Veto genügt, Rückfall auf Arbeitstitel ist jederzeit möglich.
3. ~~**EN-Paar Herzfeuer/Hearthfire?**~~ **ENTSCHIEDEN 27.07.: gestrichen.** Gebäude 1 ist Zentralhaus / Town Hall; das Wachfeuer bleibt Motiv, nicht Gebäude. Gebäude 3 ist Vorratsspeicher / Storehouse.
4. **Sidebar-Label „New Haven"** neben dem Dungeon „Wyvernlager": Die frühere Kollision („Lager" vs. „Wyvernlager") ist mit dem Ortsnamen ohnehin aufgelöst.
