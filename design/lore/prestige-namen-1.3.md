# Prestige 1.3: Namensvorschläge des Lore-Dev

Lore-Dev, 2026-10-17. Auftrag: Chef-Entscheid 4 in `design/1.3-prestige-konzept.md` („Namen: lore-dev schlägt vor"). Kanon-Quellen: `weltlore-grim-reach.md` § 1.2 (Dreifaches Gebot), § 1.5 (Götzen, Bildersturz), § 2 (Wächter), § 4.10 (Götzenhalle); `aschechronik-spec.md` Kap. 20/21; `band2-auftakt-1.3.0.md` (Halle ohne Meister, Der Tilger). **Status: Chef-Gate.** Interne IDs bleiben neutral (`prestige`, `prestigePoints`), wie im Konzept beschlossen; hier geht es nur um die Spielerworte.

Regeln dieses Dokuments: natürliche Spieltexte, höchstens ein Gedankenstrich je Text, keine Comedy. Nichts davon ist in Content oder Code eingetragen.

## § 0 Kollisionsprüfung (grep `packages/content/src/index.ts`, i18n `translations.ts`)

| Wort | Befund | Folge |
|---|---|---|
| Glut | Kampf-Status Feuer (Chef-Hinweis), dazu Glutfeste (Emberhold) | tabu für Prestige, auch „Ember" im EN |
| Siegel / Seal / Signet | acht Ringe heißen „-Siegel" oder „-Siegelring" (Windwitwen-, Hohllicht-, Erstlicht-, Dornwächter-Siegel, Siegel des Neunten Wächters, Kriegsbanden-/Abyssaler/Götzengebundener Siegelring); zwei Marken-Materialien (Grabwächter-Siegel, Kriegsbanden-Siegel); Kapitel 10 „Das gebrochene Siegel" | „Aschesiegel" liest sich im DE wie ein Ring. Nicht verboten, aber ein echtes Risiko (§ 2.1) |
| Kodex | Jägerkodex = Slayer-Baum; EN heißt er „Slayer's Book" | ein zweiter „-kodex" ist möglich, der EN-Zwilling müsste dann „Book" heißen |
| Ashfall | `ashfall_recurve` „Ashfall Recurve / Aschfall-Recurvebogen" (Bogen) | „Ashfall" als Systemname entfällt (§ 2.3) |
| Nachlese / Gleaning | `rune_gleaning` „Rune der Nachlese", Affix „Nachlesend" | entfällt als Baumname (§ 2.2) |
| Schrein der Stillen / Shrine of the Silent | Lager-Gebäude (`camp_warden_shrine`): „nur ein aufgerichteter Stein" | kein Konflikt, aber Verwandtschaft; der Hallen-Altar muss sich davon absetzen |
| Narbenhaut | Roster-Figur „Kell Narbenhaut / Kell Scarhide" | nicht als Knotenname verwenden; „Narbengewebe" statt „Narbenhaut" |
| Aschenmarke / Ash Mark, Aschestaub / Ashen Dust, Ascheessenz / Ash Essence, Aschenschwur / Ashen Vow | bestehende Items | „Mark", „Dust", „Essence", „Vow" nicht als Währung |
| Funke | Die Diener sind „Funken seines Feuers" (Bibel § 1.3); Knoten „Zweiter Funke" | im empfohlenen Set umbenannt (§ 5) |
| Marken / Tokens | Quest-Marken werden beim Aufstieg zurückgesetzt | „Marke" nicht als Prestige-Währung |

## § 1 Was der Altar in der Welt ist (Rahmen für alle Sets)

Die Götzenhalle war das größte Heiligtum der alten Welt und zugleich die Werkstatt des Fremden (Bibel § 4.10). Nach dem Bildersturz trug das Reach die Scherben seiner zerschlagenen Bildnisse hierher und versiegelte die Halle über ihnen. Seit Band 2 steht die Halle offen und ohne Meister: ein Gebiet wie jedes andere. Der Altar des Prestige-Systems ist der älteste Stein darin, älter als die Götzen, und der Wächter weiß das, weil er als letzter Priester der Stillen dort gestanden hat.

Die Lore-Logik des Zurücksetzens: Was ein Bildnis sehr liebte, wurde Asche (§ 1.5). Stufen, Ausrüstung, Gold und Fortschritt sind das, was ein Held anhäuft; es ist das Trinkbare. Was bleibt, ist, was nicht in Erz gegossen werden kann: Bindungen (Begleiter), das Wissen der Hände (Meisterschaft), erkauftes Wissen (Jägerkodex) und die Zeugenaussage des Wächters (Erfolge, Bestiarium, Wiki). Diese Einteilung stimmt mit der Bleibt-Liste des Konzepts überein, ohne eine Mechanik zu verlangen.

## § 2 Drei Namens-Sets

### § 2.1 Set A: Aschegang (Arbeitsname, komplettiert)

| Slot | DE | EN |
|---|---|---|
| System | Der Aschegang | The Ashwalk |
| Währung | Aschesiegel | Ash Seals |
| Baum | Der Aschekodex | The Ash Codex |
| Altar | Der Aschealtar | The Ash Altar |
| Zähler am Porträt | Aschestern | Ash Star |

**Lore-Begründung.** Asche ist die Wunde dieser Welt: Was ein Götze sehr liebte, wurde Asche, und Asche wird nicht zurückgenommen (§ 1.5). Der Aschegang ist der eine Gang, den jemand freiwillig in die Asche tut und aus dem er wieder herauskommt; das Siegel wäre das Zeichen, mit dem der Wächter ein abgeschlossenes Kapitel verschließt, der Kodex das Schwesterbuch des Jägerkodex. Es ist das Wort, das ein Chronist wählen würde: schlicht, und jeder versteht es sofort.

**Risiken.** Fünfmal „Asche-" neben Aschechronik, Aschfeldern, Aschtyrann, Aschenweide, Ascheessenz, Aschestaub und Aschenmarke; das Leitmotiv verliert Gewicht, wenn es Produktlinie wird. „Siegel" ist im DE das Ringwort (§ 0). „Aschekodex / Ash Codex" bricht das EN-Muster des Jägerkodex („Slayer's Book"). „Aschestern" ist ein UI-Wort, kein Weltwort.

### § 2.2 Set B: Die Stille Gabe (The Silent Offering)

| Slot | DE | EN |
|---|---|---|
| System | Die Stille Gabe | The Silent Offering |
| Währung | Aschekörner | Ash Grains |
| Baum | Die Saat | The Sowing |
| Altar | Der Stille Altar | The Silent Altar |
| Zähler am Porträt | Stilles Siegel | Silent Seal |

**Lore-Begründung.** Das Dreifache Gebot sagt: Gebet ist Gabe, nicht Nahrung, und kein Gott erntet, was ihm zugetragen wird (§ 1.2). Die Götzen brachen genau dieses Gesetz, indem sie tranken. In der Halle, in der alles trank, gibt es einen Stein, der es nie tat: der alte Altar der Stillen, den der Wächter als letzter Priester nicht weihen ließ. Was dort niedergelegt wird, empfängt niemand; es hört nur auf, deins zu sein. Was das Feuer nicht nimmt, ist klein und hart und keimt: Körner, die man in die nächste Zeit sät. Der Schrein der Stillen im Lager wäre das kleine Echo dieses Altars.

**Risiken.** Theologisch das tiefste Set, aber das am wenigsten „coole": „Gabe" liest sich auch als Talent, Körner und Saat riechen nach Landwirtschaft. Das bessere Baumwort „Nachlese" ist von der Rune belegt (§ 0). „Stilles Siegel" greift wieder zum Ringwort.

### § 2.3 Set C: Der Aschesturz (The Cinderfall)

| Slot | DE | EN |
|---|---|---|
| System | Der Aschesturz | The Cinderfall |
| Währung | Narben | Scars |
| Baum | Das Narbenbuch | The Book of Scars |
| Altar | Der Scherbenaltar | The Shard Altar |
| Zähler am Porträt | Aschekerbe | Ash Notch |

**Lore-Begründung.** Das Reach hat einmal zerschlagen, was es fütterte: der Bildersturz (§ 1.5), und seine Scherben liegen unter der Götzenhalle (§ 4.10). Wer vier Künste auf 99 gebracht und den ersten Band geschlossen hat, ist selbst zu einem Bildnis geworden, das Stunden trinkt; der Aschesturz ist sein eigener Bildersturz, auf demselben Boden, über denselben Scherben. Was durch die Asche geht, behält nur, was eingeschrieben ist: Narben, die einzige Schrift, die die Asche nicht löscht, und der Wächter liest sie in ein Buch. Das stellt das System auch gegen den Tilger: Der schneidet Schrift heraus, das Narbenbuch trägt sie ein.

**Zu den EN-Wörtern.** „Ashfall" wäre die natürliche Entsprechung, ist aber vom Bogen belegt (§ 0). „Cinderfall" folgt zwei Paaren, die das Spiel schon führt: Asche ↔ Cinder (Aschenelend / Cinder Wretch, Aschenrobe / Cinder Robe) und Sturz ↔ Fall (Bildersturz / Idolfall). „Book of Scars" spiegelt „Slayer's Book". Der Scherbenaltar erklärt nebenbei das Item Götzensplitter (Idol Shard): Daraus ist er gebaut.

**Risiken.** „Sturz" kann als Absturz gelesen werden; der Parallelbegriff Bildersturz fängt das auf, aber nicht für jeden Spieler. Narben als ausgebbare Währung sind ungewöhnlich; Spieler kennen das Muster aus Souls-Spielen (Seelen, Blutechos), es braucht einen Satz Erklärung im Narbenbuch. „Narbenhaut" ist als Knotenname tabu (§ 0).

## § 3 Empfehlung: Set C, Der Aschesturz

Gründe, kurz:

1. **Es erklärt den Ort.** Nur Set C sagt, warum der Altar in der Götzenhalle steht und nicht in der Glutfeste: Der Bildersturz endete hier, und der Held wiederholt ihn an sich selbst.
2. **Es erklärt die Bleibt-Liste.** Narben sind Schrift, die die Asche nicht löscht; Begleiter, Meisterschaft, Jägerkodex und Erfolge sind eingeschrieben, Stufen und Gold sind getrunken. Das ist dieselbe Trennung wie in der Technik-Tabelle des Konzepts, nur erzählt.
3. **Keine Kollisionen, kein Asche-Stapel.** Ein einziges „Asche-" im Systemnamen, sonst Material der Halle (Scherben) und des Helden (Narben). Kein Siegel, kein Kodex-Doppel, kein Glut, kein Funke.
4. **Es ist bebilderbar.** Ein Altar aus Götzenscherben, ein Buch in Narbenleder (das Material `scarred_hide` existiert), eine Kerbe im Eisenrahmen des Porträts. Jedes Wort hat ein Bild.

**Rückfalloption, falls der Chef „Sturz" zu negativ findet:** Das Systemwort „Aschegang / Ashwalk" aus Set A lässt sich ohne Schaden in Set C einsetzen (Aschegang über dem Scherbenaltar, Narben, Narbenbuch, Aschekerbe). Alle Ritualtexte unten bleiben dann bis auf das Wort „Sturz" in der Sperrzeile gültig.

## § 4 Ritualtexte (Set C)

### § 4.1 Wer spricht: der Wächter des Reachs

- **Der Wächter** ist laut Bibel § 2 die einzige erzählende Stimme des Spiels; die Figuren der Glutfeste grüßen, sie erzählen nicht. Er war der letzte Priester der Stillen und hat in dieser Halle gestanden, bevor sie trank. Er hat viele Helden geführt und sagt nicht, wie viele Einträge mit einem Ende schließen (§ 2). Der Aschesturz ist das erste Mal, dass einer zu ihm zurückkommt; `prestige.history[]` ist in der Welt genau das: seine Einträge über die früheren Gänge.
- **Brenna** gehört zum Slayer-Turm und zur Glutfeste. Sie liest das Können eines Jägers und zahlt Kopfgeld; am Altar hätte sie nichts zu sagen, und ihre Stimme ist schon mit dem Jägerkodex belegt.
- **Der Götze** fiel in Kapitel 19 und hat nie gesprochen: „Er führt kein Gespräch; er führt ein Verfahren" (§ 5.6). Ein sprechender Altar würde die Götzenlogik (trinken) zum Gastgeber des Rituals machen, und genau das soll das Ritual nicht sein.
- **Der Tilger** ist Feind, `dungeonOnly`, und in Kapitel 27 zu Hause; wer am Ende von Kapitel 21 steht, muss ihn noch nicht gesehen haben. Außerdem löscht er Schrift. Das Narbenbuch ist sein Gegenteil.

### § 4.2 Altar-Begrüßung (Altar freigeschaltet, erster Besuch)

- **DE:** Unter diesem Stein liegen die Scherben aller Bildnisse, die das Reach je zerschlug. Das Reach hat seinen Sturz überstanden, weil es nichts behielt außer dem, was es gelernt hatte. Leg hier nieder, was du bist, und ich trage ein, was du warst; den Rest bekommt die Asche.
- **EN:** Beneath this stone lie the shards of every image the Reach ever broke. The Reach outlived its fall because it kept nothing but what it had learned. Lay down here what you are, and I will record what you were; the ash gets the rest.

### § 4.3 Bestätigung vor dem Sturz (über der Geht/Bleibt-Liste, vor der Namenseingabe)

- **DE:** In die Asche gehen Stufen, Ausrüstung, Gold und jede Seite der Chronik, die du aufgeschlagen hast. Bei dir bleiben deine Begleiter, das Wissen deiner Hände, der Jägerkodex und alles, was ich je über dich eingetragen habe. Asche wird nicht zurückgenommen.
- **EN:** Into the ash go levels, gear, gold and every page of the Chronicle you have opened. With you stay your companions, the knowledge in your hands, the Slayer's Book and everything I have ever recorded about you. Ash is not taken back.

### § 4.4 Erwachen im neuen Durchgang (nach der Asche-Überblendung)

- **DE:** Du bist durch die Asche gegangen, und die Asche hat dich nicht behalten. Was sie dir ließ, trägst du als Narben. Die Chronik schlägt eine neue Seite auf; die Feder kennt dich schon.
- **EN:** You went through the ash, and the ash did not keep you. What it left you, you wear as scars. The Chronicle opens a new page; the pen already knows you.

### § 4.5 Optional: Altar sichtbar, Bedingung nicht erfüllt

- **DE:** Der Altar nimmt nur, wer vier Künste gemeistert und den ersten Band zu Ende gebracht hat. Vorher wäre es kein Sturz, nur ein Stolpern.
- **EN:** The altar takes only those who have mastered four arts and finished the first volume. Before that it would be no fall, only a stumble.

Alle vier Texte: kein Gedankenstrich, je drei Sätze oder weniger. Übersetzung in die übrigen fünf Sprachen über den EN-Text (content-dev/ui-dev).

## § 5 Knoten-Namen im Narbenbuch (Set C)

Äste (Vorschlag, die Konzeptnamen bleiben als Arbeitsbegriffe gültig):

| Konzept | DE | EN | Anmerkung |
|---|---|---|---|
| Erbe | Was bleibt | What Remains | |
| Eile | Der kurze Weg | The Short Road | |
| Macht | Gezeichnet | Marked | „gezeichnet" = von Narben gezeichnet |
| Krönung | Schlussstein | Keystone | „Krönung" bewusst vermieden: In der Götzenhalle soll kein Kronen-Wort stehen, bevor Band 2 die sieben Kronen zeigt (Chef-Entscheid 17.10.) |

Knoten:

| Konzept | DE | EN | Eine Zeile Flavor (DE) |
|---|---|---|---|
| Erbstück 1/2/3 | Erbstück | Heirloom | Ein Stück, das die Asche nicht bekommt. |
| Werkzeuggürtel | Schwielen | Calluses | Die Hände vergessen ihr Werkzeug nicht. |
| Vorratstruhe 5/10/20 | Vergrabene Truhe | Buried Chest | Was vergraben war, hat kein Feuer gesehen. |
| Startbörse | Grabmünzen | Grave Coins | Man gibt den Toten Münzen mit. Du bist nicht tot, aber die Münzen stören nicht. |
| Lehrjahre (5 Ränge) | Lehrjahre | Apprentice Years | Was man einmal gelernt hat, lernt man schneller noch einmal. |
| Erinnerung | Bekannte Seiten | Familiar Pages | Kapitel, die du gelebt hast, liest die Chronik dir nicht zweimal vor. |
| Alte Pfade | Alte Pfade | Old Paths | Tore, die du einmal geräumt hast, kennen dich. |
| Aschehaut | Narbengewebe | Scar Tissue | Narbengewebe reißt nicht so leicht. |
| Aschefaust | Narbenfaust | Scarred Fist | Knöchel, die schon einmal gebrochen waren, brechen nicht mehr. |
| Rabenvorrat | Marschordnung | Marching Order | Ein Feldherr weiß schon, was nach dem nächsten Schritt kommt. |
| Glutblick (Glut-Kollision) | Elsternauge | Magpie's Eye | Sammelt, was den Götzen gehörte, wie Elstern Silber sammeln. |
| Zweiter Funke | Der tiefere Schnitt | The Deeper Cut | Der nächste Sturz schneidet tiefer und lässt mehr zurück. |

Hinweise: „Schwielen" ist die Narben-Lesart von Werkzeugen, die bleiben; wer es zu bildhaft findet, nimmt „Werkgürtel / Workbelt". „Marschordnung" ersetzt den Raben, weil die Warteschlange im Spiel „Aktions-Warteschlange / Action Queue" heißt und die Raben die Rabenfracht (Cross-Save) tragen; der Feldherr-Ton ist Drazhans Register (Bibel § 1.4), das der Held sich nimmt. „Elsternauge" zitiert § 5.5 der Bibel („wie Elstern Silber sammeln"). Flavor-Zeilen sind Angebot für Tooltips; Zahlen setzt der balance-designer.

## § 6 Glossar-Nachtrag (nach Chef-GO in `weltlore-grim-reach.md` § 9 zu übernehmen)

| Deutsch | Englisch | Bedeutung |
|---|---|---|
| Der Aschesturz | The Cinderfall | Prestige-System: der eigene Bildersturz des Helden am Scherbenaltar |
| Narben | Scars | Prestige-Währung; die Schrift, die die Asche nicht löscht |
| Das Narbenbuch | The Book of Scars | Prestige-Baum; Schwesterbuch des Jägerkodex (Slayer's Book) |
| Der Scherbenaltar | The Shard Altar | Altar in der Götzenhalle, gebaut aus den Scherben des Bildersturzes |
| Aschekerbe | Ash Notch | Zähler am Porträt; eine Kerbe je Aschesturz |
| Was bleibt · Der kurze Weg · Gezeichnet · Schlussstein | What Remains · The Short Road · Marked · Keystone | Äste des Narbenbuchs |

## § 7 Asset-Hinweise (für die Asset-Liste des Chefs, Dateinamen nach Loader-Vertrag durch ui-dev)

- **Scherbenaltar (Altar-Szene):** Niedriger, breiter Altar aus schwarzem Götzeneisen und ineinander verbackenen Götzenscherben, in den Boden der Halle eingelassen; graue Asche gegen den Sockel geweht, ein paar kalte Kerzenstummel, keine Flamme, kein Glühen. Gemalter Dark-Fantasy-Stil wie die Hallen-Kulisse; Farbwelt Schiefer, Rost, Knochen, Aschgrau.
- **Narbenbuch (Baum-Symbol):** Geschlossenes, dickes Buch, gebunden in Narbenleder (Bezug zum Material `scarred_hide`), Schnitt grau von Asche, ohne Verschluss; keine Schrift auf dem Deckel.
- **Aschekerbe (Porträt-Zähler):** Eine Kerbe im Eisenrahmen des Porträts je Aschesturz, bei mehr als drei eine Ziffer neben der Kerbe; alternativ ein kleiner Scherbensplitter als Glyphe. Kein Stern, kein Leuchten.

## § 8 Offene Fragen an den Chef

1. **Set-Wahl:** A (Aschegang), B (Stille Gabe) oder C (Aschesturz, Empfehlung)? Oder Set C mit dem Systemwort „Aschegang / Ashwalk" (Rückfalloption § 3)?
2. **EN-Systemname:** „The Cinderfall" (Empfehlung) oder das schlichtere „The Shattering"? Beides ist frei; „Ashfall" ist vom Bogen belegt.
3. **Schrein der Stillen (Lager):** Soll sein Beschreibungstext später auf den Hallen-Altar verweisen? Das wäre eine Content-Änderung (content-dev), kein Muss.
4. **Zähler-Form:** Kerbe im Porträtrahmen (Empfehlung, § 7) oder Glyphe mit Zahl, wie im Konzept als „Aschestern" skizziert?
