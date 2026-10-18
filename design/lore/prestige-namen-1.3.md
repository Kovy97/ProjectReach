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
| Handgedächtnis | Second Nature (Vorschlag § 9.1; im Content vorläufig „Muscle Memory") | Knoten im Ast „Der kurze Weg": Fertigkeiten, die schon einmal auf 99 standen, lernen sich schneller zurück |

### § 6.1 Die fünf weiteren Sprachen (Nachtrag 18.10.)

Ist-Stand aus `packages/content/src/locales/{zh,ru,es,fr,ptBR}.ts` (Schlüssel `talentTrees:prestige*`, `talentBranches:prestige.*`, `talentNodes:prestige.*`). Einträge mit **(V)** sind Vorschläge und stehen noch nicht im Content; Begründungen in § 9. Spaltenreihenfolge wie in `design/i18n-glossary.md`.

| Deutsch | ZH-Hans | RU | ES | PT-BR | FR |
|---|---|---|---|---|---|
| Der Aschesturz | 烬落 | Пеплопад (Kollision mit dem Bogen, § 9.3 Nr. 2) | Caída de Ceniza | Queda das Cinzas | Chute des Cendres |
| Narben | 伤痕 | Шрамы | Cicatrices | Cicatrizes | Cicatrices |
| Das Narbenbuch | 伤痕之书 | Книга шрамов | Libro de las Cicatrices | Livro das Cicatrizes | Livre des Cicatrices |
| Der Scherbenaltar | 碎片祭坛 | Алтарь осколков | Altar de los Fragmentos | Altar dos Fragmentos | Autel des Éclats |
| Aschekerbe | 灰烬刻痕 (V) | Пепельная зарубка (V) | Muesca de ceniza (V) | Entalhe de cinzas (V) | Encoche de cendre (V) |
| Was bleibt | 所留之物 | Что остаётся | Lo que queda | O que resta | Ce qui reste |
| Der kurze Weg | 捷径 | Короткий путь | El camino corto | O caminho curto | Le chemin court |
| Gezeichnet | 烙痕 | Отмеченный | Marcado | Marcado | Marqué |
| Schlussstein | 拱心石 | Замковый камень | Piedra clave | Pedra-chave | Clé de voûte |
| Handgedächtnis | 第二天性 (V) | Вторая натура (V) | Segunda naturaleza (V) | Segunda natureza (V) | Seconde nature (V) |
| Durchgang (Hilfswort in allen Knotentexten) | 周目 | прохождение | partida | partida | partie |

Bestandsbegriffe, an denen die Übersetzungen hängen und die sie treffen: Jägerkodex = 猎魔之书 / Книга охотника / Libro del Cazador / Livro do Caçador / Livre du Chasseur; Götzensplitter = 神像碎片 / Осколок Идола / Fragmento de ídolo / Fragmento de Ídolo / Éclat d'idole; Wächter = 守望者 / Страж / Guardián / Guardião / Gardien; Chronik = 编年史 / Хроника / Crónica / Crônica / Chronique; Aufgabenmarken (Client `quests.tokens.label`) = 任务代币 / Жетоны заданий / Fichas de misión / Fichas de missão / Jetons de quête.

## § 7 Asset-Hinweise (für die Asset-Liste des Chefs, Dateinamen nach Loader-Vertrag durch ui-dev)

- **Scherbenaltar (Altar-Szene):** Niedriger, breiter Altar aus schwarzem Götzeneisen und ineinander verbackenen Götzenscherben, in den Boden der Halle eingelassen; graue Asche gegen den Sockel geweht, ein paar kalte Kerzenstummel, keine Flamme, kein Glühen. Gemalter Dark-Fantasy-Stil wie die Hallen-Kulisse; Farbwelt Schiefer, Rost, Knochen, Aschgrau.
- **Narbenbuch (Baum-Symbol):** Geschlossenes, dickes Buch, gebunden in Narbenleder (Bezug zum Material `scarred_hide`), Schnitt grau von Asche, ohne Verschluss; keine Schrift auf dem Deckel.
- **Aschekerbe (Porträt-Zähler):** Eine Kerbe im Eisenrahmen des Porträts je Aschesturz, bei mehr als drei eine Ziffer neben der Kerbe; alternativ ein kleiner Scherbensplitter als Glyphe. Kein Stern, kein Leuchten.

## § 8 Offene Fragen an den Chef

1. **Set-Wahl:** A (Aschegang), B (Stille Gabe) oder C (Aschesturz, Empfehlung)? Oder Set C mit dem Systemwort „Aschegang / Ashwalk" (Rückfalloption § 3)?
2. **EN-Systemname:** „The Cinderfall" (Empfehlung) oder das schlichtere „The Shattering"? Beides ist frei; „Ashfall" ist vom Bogen belegt.
3. **Schrein der Stillen (Lager):** Soll sein Beschreibungstext später auf den Hallen-Altar verweisen? Das wäre eine Content-Änderung (content-dev), kein Muss.
4. **Zähler-Form:** Kerbe im Porträtrahmen (Empfehlung, § 7) oder Glyphe mit Zahl, wie im Konzept als „Aschestern" skizziert?

## § 9 Nachtrag 18.10.

Der Chef hat am 18.10. Set C „Der Aschesturz" gewählt. Der Engine-Agent hat das Narbenbuch in `packages/content/src/talents.ts` (Baum `prestige`) eingetragen und die Texte in fünf Sprachen nachgezogen. Dieser Nachtrag beantwortet zwei Fragen: Wie heißt der neue Knoten „Handgedächtnis", und stimmen die fünf Übersetzungen mit Set C und dem Glossar überein. Geprüft wurde nur lesend; nichts davon ist in Content oder Code geändert.

### § 9.1 Der Knoten „Handgedächtnis"

**Deutsch: Handgedächtnis bleibt.** Das Wort ist kurz, körperlich und sitzt im Ast „Der kurze Weg" genau richtig: Lehrjahre, Bekannte Seiten, Handgedächtnis, Alte Pfade. Es führt den Hände-Faden von „Schwielen" und von der Bestätigungszeile in § 4.3 („das Wissen deiner Hände") weiter, ohne ihn zu wiederholen. Die eingetragene Flavorzeile („Die Hände wissen noch, wohin sie greifen.") passt und bleibt.

**Englisch: „Second Nature" statt „Muscle Memory".** „Muscle memory" ist ein Begriff aus Sportphysiologie und Fitnessjargon; er liest sich im Mund des Wächters modern (Kanonregel 2). „Second nature" ist dagegen alt, trägt dieselbe Bedeutung (etwas so oft getan, dass der Körper es ohne Nachdenken kann) und spielt leise mit dem zweiten Durchgang. Als Knotenreihe: Apprentice Years, Familiar Pages, Second Nature, Old Paths. Die EN-Flavorzeile („Your hands still know where to reach.") bleibt unverändert.

Alternative, falls der Chef das Hände-Bild auch im Englischen will: **„Knowing Hands".** Verworfen: „Master's Hands", weil der Erfolg `ach_mastery_25` schon „Hands of the Master / Hände des Meisters" heißt und in RU/ES/FR/PT-BR bereits als „Руки мастера / Manos de maestro / Mains de maître / Mãos de mestre" übersetzt ist; „Old Hands", weil im selben Ast schon „Old Paths" steht.

Übersetzungen für „Second Nature" (alle fünf sind feste Redewendungen ihrer Sprache und im Content frei): RU „Вторая натура", ZH „第二天性", ES „Segunda naturaleza", FR „Seconde nature", PT-BR „Segunda natureza". Falls „Knowing Hands": RU „Знающие руки", ZH „识路之手" (nicht „熟手", das tragen rund zwanzig Erfolge), ES „Manos que saben", FR „Mains qui savent", PT-BR „Mãos que sabem".

### § 9.2 Prüfbefund der fünf Sprachen

Gesamturteil: Die Übersetzungen tragen den Ton. Die Sätze sind kurz, der Wächter spricht in der zweiten Person, die Flavorzeilen sind mitübersetzt statt gestrichen, und in keiner der fünf Sprachen steht ein Gedankenstrich. Die Anbindung an den Bestand ist sauber: Das Narbenbuch spiegelt in allen fünf Sprachen das Wort des Jägerkodex (Buch + Genitiv), der Scherbenaltar nutzt überall das Wort des Götzensplitters, Wächter und Chronik entsprechen den Aschechronik-Quests, Bank und Marken den Client-Labels (Ausnahme FR, unten). Der Systemname ist in jeder Sprache in allen fünf Vorkommen gleich geschrieben.

| Sprache | Aschesturz | Narben | Narbenbuch | Scherbenaltar | Aschekerbe |
|---|---|---|---|---|---|
| RU | Пеплопад → **Kollision:** der Bogen `items:ashfall_recurve:name` heißt schon „Лук «Пеплопад»". Vorschlag: Systemname behalten, Bogen umbenennen (§ 9.3 Nr. 2); Rückfall „Испепеление" | Шрамы, bleibt | Книга шрамов, bleibt | Алтарь осколков, bleibt | fehlt → Пепельная зарубка |
| ZH | 烬落, bleibt (der Bogen heißt 落灰反曲弓, kein Konflikt) | 伤痕, bleibt | 伤痕之书, bleibt | 碎片祭坛, bleibt | fehlt → 灰烬刻痕 |
| ES | Caída de Ceniza, bleibt | Cicatrices, bleibt | Libro de las Cicatrices, bleibt | Altar de los Fragmentos, bleibt | fehlt → Muesca de ceniza |
| PT-BR | Queda das Cinzas, bleibt | Cicatrizes, bleibt | Livro das Cicatrizes, bleibt | Altar dos Fragmentos, bleibt | fehlt → Entalhe de cinzas |
| FR | Chute des Cendres, bleibt | Cicatrices, bleibt | Livre des Cicatrices, bleibt | Autel des Éclats, bleibt | fehlt → Encoche de cendre |

Zur Aschekerbe: Sie ist ein UI-Wort (Porträtzähler) und steht noch in keiner Content-Datei; die Vorschläge gehören ins Glossar für ui-dev (§ 6.1). Zum Systemnamen: Alle fünf Sprachen übersetzen „Asche" statt „Cinder", was richtig ist, weil das Deutsche Aschesturz heißt und das Englische „Cinder" nur dem Bogen ausweicht. Vier Sprachen sind dabei selbst dem Bogen ausgewichen; nur das Russische hat exakt das Wort des Bogens getroffen.

Eigenheiten, die bleiben dürfen: RU „Рубцовая ткань" (Narbengewebe) neben „шрамы" (Narben) ist die korrekte medizinische Form, kein Widerspruch. ZH „烙痕" für „Gezeichnet" trägt die Brand-Lesart und passt zum Aschesturz. ZH „周目" für Durchgang ist Spielerjargon, aber dasselbe Register wie das englische „run". RU „Глубокий надрез" verliert den Komparativ aus „The Deeper Cut"; die Flavorzeile („режет глубже") trägt ihn, und ein russischer Komparativ im Titel wäre sperrig.

### § 9.3 Korrekturen je Schlüssel

1. **Muss, FR** `talentNodes:prestige.chronicleRecall:description`: „sans marques ni objets" → „sans jetons ni objets". Der Client nennt die Aufgabenmarken „Jetons de quête" (`quests.tokens.label`); „marques" ist dort nicht belegt. RU (жетонов), ZH (代币), ES (fichas) und PT-BR (fichas) treffen den Client-Begriff.
2. **Muss, RU, Chef-Entscheid** (Kollision Пеплопад). Option A, Empfehlung: `items:ashfall_recurve:name` „Лук «Пеплопад»" → „Лук «Пепельный дождь»" (Aschenregen, im Content frei); alle Narbenbuch-Schlüssel bleiben, weil „Пеплопад" das beste Wort für das System ist und ein Dutzend Mal im Spiel stehen wird, der Bogen einmal. Das ändert eine ausgelieferte RU-Zeichenkette, daher Chef-Sache. Option B, falls der Bogen unantastbar ist: in `talentTrees:prestige:description` sowie den Beschreibungen `keepTools`, `keepBankStacks`, `keepEquipment` und `pointsBoost` „Пеплопад" → „Испепеление" (Einäscherung; Formen: „о каждом Испепелении", „переживают Испепеление", „Каждое следующее Испепеление приносит").
3. **Folgeänderung nach GO zu § 9.1**, `talentNodes:prestige.masteredXp:name` in fünf Dateien: RU „Мышечная память" → „Вторая натура"; ZH „肌肉记忆" → „第二天性"; ES „Memoria muscular" → „Segunda naturaleza"; FR „Mémoire musculaire" → „Seconde nature"; PT-BR „Memória muscular" → „Segunda natureza". Die Beschreibungen bleiben.
4. **Kann, ES und PT-BR** `talentNodes:prestige.damage:name`: „Puño marcado" → „Puño cicatrizado", „Punho marcado" → „Punho cicatrizado". Der Ast heißt in beiden Sprachen schon „Marcado"; das Englische hat „Scarred Fist", das Französische „balafré". Das Narbenwort gehört in den Knoten.
5. **Kann, FR** `talentNodes:prestige.keepTools:name`: „Cals" → „Callosités". „Cals" ist korrekt, aber so selten, dass es wie ein Tippfehler aussieht.

**Nebenbefund DE** (nicht mein Revier, Empfehlung an content-dev): `talentNodes:prestige.keepTools:description` sagt „warten im Lager"; die Bank heißt im deutschen Client „Bank" (`nav.bank`), und „Lager" ist seit 0.3.0 das Lager des Spielers. Vorschlag: „und warten in der Bank". Das Englische („wait in your bank") und alle fünf Übersetzungen haben die Bank.

Summe: fünf Korrekturvorschläge (zwei Muss, eine Folgeänderung nach GO, zwei Kann), dazu ein DE-Nebenbefund.

### § 9.4 Offene Fragen an den Chef (Nachtrag)

1. **EN-Name für Handgedächtnis:** „Second Nature" (Empfehlung) oder „Knowing Hands"? Oder bleibt „Muscle Memory"?
2. **RU-Kollision:** Option A (Bogen wird „Лук «Пепельный дождь»") oder Option B (Systemname „Испепеление")?
3. **Kann-Korrekturen 4 und 5** mitnehmen oder lassen?
