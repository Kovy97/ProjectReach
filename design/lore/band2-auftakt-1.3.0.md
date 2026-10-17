# Aschechronik, Band 2 „Götterkriege" — Auftakt für 1.3.0 „Die Götzenhalle erwacht"

Lore-Dev, 2026-10-17. Auftrag: `design/1.3.0-goal.md` E1/E2. Kanon: `aschechronik-spec.md` (Kap. 20/21), `weltlore-grim-reach.md` § 1.1 (Der Getilgte), § 1.4 (sieben Kronen), § 1.7 (Paragonturm). **Status: Chef-Gate.** Erst nach dem Nicken folgen Chronik-Texte (7 Sprachen) und Content.

## § 1 Die Lage nach dem Rückzug (Prämisse, drei Sätze)

Drazhan wich, und die Halle blieb stehen: seine Ernte-Werke laufen ohne Meister weiter, seine Priester weihen weiter, seine Diener warten auf einen, der nicht zurückkommt. Der Wächter trägt im zweiten Band Etagen ein, bis die Halle ihm wieder Kapitel abverlangt. Der rote Faden des Auftakts ist die siebte Krone: Der Siebte wurde nicht vergessen, er wird vergessen **gehalten**. Von wem, beantwortet der Auftakt nicht.

## § 2 Kapitelliste ab `chronicle_22`

Kette: `chronicle_22` → `requires: ["chronicle_21"]`, danach linear. Kapitel 21 (Epilog, Paragon-Etage 5) bleibt unverändert davor. Zahlen (Kill-Counts, Belohnungen, Token) setzt content-dev/balance.

| Kap. | ID | Titel DE / EN | Spielziel | Erzählung |
|---|---|---|---|---|
| 22 | `chronicle_22` | Die leere Halle / The Empty Hall | `kill_monster` `idol_husk` + `skarn_whelp` | Die Halle steht offen, seit Drazhan wich, und sie ist nicht leer: Seine Hülsen gehen ihre Runden weiter, weil niemand ihnen gesagt hat, dass der Meister fort ist, und in den Trümmern nistet die Brut des Skarn. Der Wächter trägt den ersten Eintrag des zweiten Bandes ein, der keine Etage ist. |
| 23 | `chronicle_23` | Die Weihe / The Consecration | `kill_monster` `idol_priest` + `forsaken_servant` | Die Priester, die der Wächter einst nicht sein wollte, haben die Halle nie verlassen; sie weihen weiter, und was sie weihen, trinkt. Ihre Gebete nennen keinen Gott und nicht Drazhan. Sie beten in eine Lücke hinein, und die Lücke hat eine Form. |
| 24 | `chronicle_24` | Was die Götzen tranken / What the Idols Drank | `kill_monster` `prayer_eater` | Die Kernlektion der Aschfelder hatte einen Nachsatz: Nichts kam bei den Göttern an, aber nichts ging verloren. In den unteren Galerien geht die Ernte um, die niemand abholte, satt und voller fremder Stimmen. |
| 25 | `chronicle_25` | Die Kränze / The Wreaths | `kill_monster` `wreath_bearer` | Die ersten Kränze aus Götzeneisen, die der Wächter in der Schlackengrube gießen sah, gehen hier in Prozession, getragen von Werken, die nicht wissen, dass die Prozession vorbei ist. Die Gussgrate wurden nie entfernt: Diese Werke wurden nie fertig. *(Chef-Entscheid 17.10.: ohne Kronen-Bezug, keine sechs Zeichen, keine siebte Form.)* |
| 26 | `chronicle_26` | Belagerungswerke / Siege-Works | `kill_monster` `siege_idol` · **schaltet frei:** Dungeon `expunged_chapel` | Drazhans Belagerungsgötzen zielen noch immer auf den Himmel, unfertig und ohne Meister; was sie treffen sollten, schweigt weiter. Hinter ihrer Reihe liegt eine Tür, die auf keinem Plan der Halle steht: der Eingang zu einem Flügel, dessen Inschriften sämtlich ausgemeißelt sind. |
| 27 | `chronicle_27` | Der Tilger / The Expunger | `dungeons_cleared` `expunged_chapel` ×1 (Boss `the_expunger`, `dungeonOnly`) | In der Getilgten Kapelle arbeitet noch, was die Schriften beschnitt: Der Tilger meißelt, seit es den Namen nicht mehr gibt, und er hört nicht auf, weil ein Name wiederkommen könnte. Er fällt, und seine Arbeit bleibt stehen, Wände voller Lücken, alle in derselben Form. Der Wächter schreibt: Der Siebte wird vergessen gehalten. Die Götterkriege fangen nicht mit Göttern an. |

**Dungeon-Empfehlung (content-dev):** `expunged_chapel` „Die Getilgte Kapelle" / "The Expunged Chapel", Zone `idolhall`, `requiresQuest: "chronicle_26"`, Muster `behind_the_throne`. Wellen: „Die Prozession" (`wreath_bearer`-Alias) → „Die Lücke" (`prayer_eater`-Alias) → „Der Tilger" (Boss). Das Kapitel zählt ausschließlich über den Dungeon-Zähler, nie über ein offen laufendes Wesen (Lehre Kap. 11). Loot-Rahmung: „was er herausschnitt" (what he cut away).

## § 3 Neue Wesen der Götzenhalle

Bildregeln für alle: gemalter Dark-Fantasy-Stil wie der Bestand, Blick nach **links**, freigestellt mit echtem Alpha, **kein Glühen auf Ausrüstung** (erloschene Glut ist erlaubt, leuchtende nicht). Reihenfolge = aufsteigende Stärke; alle offenen Wesen liegen über dem Leeren-Titan (Hochland) und unter den Sanktum-Wellen. Zahlen setzt balance-designer. `idol_warden`, `aether_wraith`, `scale_skarn`, `last_idol`, `drazhan` bleiben Dungeon-Wesen.

| ID | Name DE / EN | Familie | Aussehen (ein Satz) |
|---|---|---|---|
| `idol_husk` | Götzenhülse / Idol Husk | construct | Mannshoher, ausgehöhlter Götzenleib aus rissigem Götzeneisen, die Brusthöhle leer wie ein geplünderter Schrein, der Kopf eine abgeschlagene Maske, der Gang schleppend. |
| `skarn_whelp` | Skarnbrut / Skarn Whelp | dragonkin | Gedrungene junge Echse mit unfertigen Drachenhaut-Platten und zu großen Klauen, die zwischen Trümmerquadern lauert; Farbwelt Schiefer, Rost, Knochen. |
| `forsaken_servant` | Verlassener Diener / Forsaken Servant | demon | Hagerer aschgrauer Dämon mit erloschenen Glutlinien in der Haut und einer gerissenen Eisenkette am Hals, in der Haltung eines Hundes, dessen Herr nicht zurückkommt. |
| `idol_priest` | Götzenpriester / Idol Priest | humanoid | Ausgemergelter Mensch in verrußter Weihrobe, das Gesicht hinter einer glatten Götzeneisen-Maske ohne Augenlöcher, als Waffe ein Räuchergefäß an Ketten. |
| `prayer_eater` | Gebetsfresser / Prayer Eater | undead | Aufgedunsener Leib aus Leichentuch und Asche, der Mund weit und zahnlos, Brust und Arme übersät mit kleinen Kerzenstummel-Narben, als hätte er das Beten selbst gefressen. |
| `wreath_bearer` | Kranzträger / Wreath Bearer | construct | Schlanker Prozessionsgötze aus dunkler Bronze, der einen mannsgroßen Kranz aus Götzeneisen auf Schulter und Schläfe trägt, Gussgrate nie entfernt, das Gesicht eine leere Gussform. |
| `siege_idol` | Belagerungsgötze / Siege Idol | construct | Massiger, turmhoher Götze, nach vorn gebeugt wie ein Rammbock, die Arme zu Speerwerfern umgegossen, der Rücken voller Ketten und Zahnräder, Farbwelt schwarzes Götzeneisen und Grünspan. |

**Kapitel-Boss** `the_expunger` — **Der Tilger / The Expunger** — undead (die Hand, die den Namen schnitt, beim Schneiden nicht gestorben). Empfehlung: über dem Letzten Götzen, in Drazhans Klasse, nicht darüber.
- Datei `npc_the_expunger.png` (Porträt): Überlanges, knöchernes Gesicht, flach wie eine Wand, aus der die Züge herausgemeißelt wurden, nur Mund und Augenhöhlen blieben als Kerben; Haupt kahl, grau von Steinstaub; Kragen einer Schreiberkutte, steif von Staub und alter Tinte; Signatur: ein Gürtel aus leeren Namenstafeln; Farbwelt Steingrau, Knochen, verblasste Tinte, schwarzes Götzeneisen; dezente Aura erlaubt (schwebender Steinstaub), sonst kein Leuchten.
- Datei `the_expunger.png` (Kampf-Art, Ganzkörper, Blick nach links): Hagere, überlebensgroße Gestalt in zerschlissener Schreiberkutte, die Hände zu eisernen Meißelfingern ausgewachsen, in der Rechten ein Klöpfel aus Götzeneisen; am Gürtel die leeren Tafeln, zu Füßen Steinspäne; Haltung mitten in der Arbeit, zur Wand gewandt, als wäre der Spieler eine Störung.

## § 4 Chef-Entscheidungen (GO, 2026-10-17)

1. **Der Tilger:** GO. Der Auftakt etabliert, dass der Schnitt des siebten Namens bewacht wird. Wer das will, bleibt offen für die Götterkriege.
2. **Sieben Kronen:** NOCH NICHT zeigen. Kapitel 25 neutral, Kränze und Werke ohne Kronen-Bezug (§ 2 angepasst).
3. **Die Lücke (Kap. 23):** bleibt leer, keine Reservefigur (Morvane/Ophar bleiben § 11-Reserve).
4. **Getilgte Kapelle:** Mini-Dungeon mit zwei Vorwellen („Die Prozession", „Die Lücke") plus Boss.

Keine offenen Fragen. Glossar-Nachtrag in `weltlore-grim-reach.md` ist eingetragen; die Kapitel-Vollfassungen wandern nach der Content-Übernahme in `aschechronik-spec.md` § 3.

## § 5 Finale Texte (Chef-GO 17.10.2026)

Felder wie bei `chronicle_20`/`chronicle_21`: `name`, `description` (knappes Ziel), `loreText` (Erzähltext des Wächters). Einen Abschlusstext kennt `QuestDef` nicht; der `loreText` trägt wie bisher die Erzählung nach dem Sieg. `MonsterDef` führt nur `name`; die Bestiariums-Zeilen unten sind Angebot für Wiki/Bestiarium, falls content-dev ein Feld dafür hat. `DungeonDef` führt `name` + `waveMeta.name`. Übersetzung in die übrigen fünf Sprachen: content-dev. Jeder Text hält höchstens einen Gedankenstrich.

### § 5.1 `chronicle_22` · requires `chronicle_21` · `kill_monster` idol_husk + skarn_whelp

- **name** DE: Die leere Halle · EN: The Empty Hall
- **description** DE: Betritt die offene Götzenhalle und bezwinge Götzenhülsen und Skarnbrut: Der zweite Band beginnt nicht im Turm.
- **description** EN: Enter the open Idol Hall and bring down Idol Husks and Skarn Whelps: the second volume does not begin in the tower.
- **loreText** DE: Ich hatte mich auf Etagen eingerichtet. Dann kam die Nachricht aus der Halle, und sie kam zu Fuß: Drazhans Hülsen gehen noch immer ihre Runden, weil niemand ihnen gesagt hat, dass der Meister fort ist. Ein Werk weiß nichts vom Rückzug. Es weiß nur seine Bahn. In den Trümmern des Sanktums nistet inzwischen die Brut des Skarn, und ein Nest ist das sicherste Zeichen, dass ein Ort nicht mehr bewacht wird. Du bist hineingegangen, als wäre die Halle ein Gebiet wie jedes andere, und genau das ist sie jetzt: ein Gebiet. Ich schlage den zweiten Band an der ersten Seite auf, die keine Etage ist. Die Feder zögert nicht. Sie hat in der Halle schon einmal geschrieben.
- **loreText** EN: I had settled in for floors. Then word came from the Hall, and it came on foot: Drazhan's husks still walk their rounds, because nobody told them the master is gone. A work knows nothing of retreat. It knows only its path. In the rubble of the Sanctum the Skarn's brood has nested by now, and a nest is the surest sign that a place is no longer guarded. You went in as if the Hall were a region like any other, and that is exactly what it is now: a region. I open the second volume at the first page that is not a floor. The pen does not hesitate. It has written in the Hall before.

### § 5.2 `chronicle_23` · requires `chronicle_22` · `kill_monster` idol_priest + forsaken_servant

- **name** DE: Die Weihe · EN: The Consecration
- **description** DE: Stelle die Götzenpriester und ihre verlassenen Diener in den Galerien der Halle: Die Weihe muss aufhören.
- **description** EN: Confront the Idol Priests and their forsaken servants in the galleries of the Hall: the consecration has to stop.
- **loreText** DE: Ich war der Einzige, der sich weigerte, die neuen Bildnisse zu weihen. Die anderen sind nie gegangen. Sie stehen in den Galerien mit Masken ohne Augen, schwenken ihre Gefäße und weihen, was sie finden, und was sie weihen, trinkt. Hinter ihnen die Diener, die der Fremde zurückließ: Funken seines Feuers an Ketten, die niemand mehr hält. Sie folgen den Priestern, weil sonst niemand da ist, dem sie folgen könnten. Ich habe ihre Gebete mitgeschrieben, das ist meine Art zuzuhören. Sie nennen keinen Gott. Sie nennen nicht Drazhan. Sie beten in eine Lücke hinein, sauber und geübt, und die Lücke hat eine Form. Ich kenne die Form nicht. Das beunruhigt mich mehr als jeder Name.
- **loreText** EN: I was the only one who refused to consecrate the new images. The others never left. They stand in the galleries in masks without eyes, swinging their censers, consecrating whatever they find, and whatever they consecrate drinks. Behind them the servants the Stranger left behind: sparks of his fire on chains nobody holds any more. They follow the priests because there is no one else left to follow. I wrote their prayers down; that is my way of listening. They name no god. They do not name Drazhan. They pray into a gap, neatly and with practice, and the gap has a shape. I do not know the shape. That troubles me more than any name would.

### § 5.3 `chronicle_24` · requires `chronicle_23` · `kill_monster` prayer_eater

- **name** DE: Was die Götzen tranken · EN: What the Idols Drank
- **description** DE: Jage die Gebetsfresser in den unteren Galerien: Die Ernte, die niemand abholte, geht um.
- **description** EN: Hunt the Prayer Eaters in the lower galleries: the harvest nobody collected is walking.
- **loreText** DE: In den Aschfeldern habe ich dir die Kernlektion beigebracht: Nichts, was die Götzen tranken, kam je bei den Göttern an. Den Nachsatz habe ich damals weggelassen, weil ich ihn nicht kannte. Nichts ging verloren. Drazhan erntete, was ihm zufloss, aber ein Feldherr auf dem Rückzug lässt die Scheunen stehen. In den unteren Galerien geht jetzt um, was nie abgeholt wurde: Gebete, die Gestalt angenommen haben, satt, schwer, voller fremder Stimmen. Ein Gebetsfresser spricht nicht. Er wiederholt. Ich habe eine Bitte um Regen gehört, die älter ist als ich, und ich bin alt. Du hast sie zum Schweigen gebracht, alle, die du gefunden hast. Es war Gnade, nicht Sieg. Die Chronik vermerkt beides.
- **loreText** EN: In the Ashfields I taught you the core lesson: nothing the idols drank ever reached the gods. I left out the addendum then, because I did not know it. Nothing was lost. Drazhan harvested what flowed to him, but a commander in retreat leaves the barns standing. In the lower galleries, what was never collected now walks: prayers that have taken shape, sated, heavy, full of strangers' voices. A Prayer Eater does not speak. It repeats. I heard a plea for rain older than I am, and I am old. You silenced them, every one you found. It was mercy, not victory. The Chronicle records both.

### § 5.4 `chronicle_25` · requires `chronicle_24` · `kill_monster` wreath_bearer

- **name** DE: Die Kränze · EN: The Wreaths
- **description** DE: Zerschlage die Kranzträger in der langen Halle: Die ersten Werke des Fremden gehen noch.
- **description** EN: Break the Wreath Bearers in the long hall: the Stranger's first works are still walking.
- **loreText** DE: Ich sah sie gießen, in der Schlackengrube, als ich noch glaubte, Warnen sei ein Beruf. Die ersten Kränze aus Götzeneisen, von Händen geführt, die keine menschlichen waren. Hier sind sie wieder. Die Kranzträger gehen in Prozession durch die lange Halle, Schulter an Schulter, und tragen, was man ihnen aufsetzte, als wäre die Prozession noch nicht vorbei. Niemand hat ihnen gesagt, wohin sie gehen. Es stand auch nie fest. Du bist ihnen in den Weg getreten, und sie sind gefallen, wie Werke fallen: ohne Klage, mit viel Lärm. Ich habe die Gussgrate an den Scherben betrachtet, bis die Hand ruhig war. Man entfernt Grate, wenn ein Werk fertig ist. Diese hier wurden nie fertig. Das erleichtert mich auf eine Art, die ich nicht erklären will.
- **loreText** EN: I watched them cast, in the Slag Pit, back when I still believed warning was a profession. The first wreaths of god-iron, guided by hands that were not human. Here they are again. The Wreath Bearers walk in procession through the long hall, shoulder to shoulder, carrying what was set upon them as if the procession were not yet over. Nobody told them where they are going. It was never settled. You stepped into their path, and they fell the way works fall: without complaint, with a great deal of noise. I studied the casting seams on the shards until my hand was steady. Seams are removed when a work is finished. These were never finished. That relieves me in a way I would rather not explain.

### § 5.5 `chronicle_26` · requires `chronicle_25` · `kill_monster` siege_idol · schaltet frei: `expunged_chapel`

- **name** DE: Belagerungswerke · EN: Siege-Works
- **description** DE: Fälle die Belagerungsgötzen vor der ausgemeißelten Tür: Dahinter liegt die Getilgte Kapelle.
- **description** EN: Fell the Siege Idols before the chiselled door: beyond it lies the Expunged Chapel.
- **loreText** DE: Die Götzen waren seine Belagerungswerke gegen den Himmel. Ich habe den Satz geschrieben, als Drazhan ihn sagte, und erst heute verstanden, dass er wörtlich gemeint war. Am Ende der Halle stehen sie in Reihe, zum Himmel gebeugt, die Arme zu Wurfarmen umgegossen, unfertig und ohne Meister. Was sie treffen sollten, schweigt weiter. Ich ziehe es vor, dass niemand sie fertigstellt. Du hast sie gefällt, eines nach dem anderen, und als das letzte lag, war die Wand dahinter frei. Eine Tür, auf keinem Plan der Halle, und ich habe die Pläne. Dahinter ein Flügel, in dem jede Inschrift ausgemeißelt ist, sauber, Zeile um Zeile. Jemand hat hier gearbeitet. Ich glaube nicht, dass er fertig ist.
- **loreText** EN: The idols were his siege-works against heaven. I wrote the sentence down when Drazhan said it, and only today understood that he meant it literally. At the end of the Hall they stand in a row, bent toward the sky, their arms recast as throwing-arms, unfinished and masterless. What they were meant to strike keeps its silence. I would rather nobody finished them. You felled them one after another, and when the last one lay down, the wall behind them was clear. A door on no plan of the Hall, and I have the plans. Beyond it a wing in which every inscription has been chiselled out, cleanly, line by line. Someone has been working here. I do not think he is finished.

### § 5.6 `chronicle_27` · requires `chronicle_26` · `dungeons_cleared` expunged_chapel ×1

- **name** DE: Der Tilger · EN: The Expunger
- **description** DE: Räume die Getilgte Kapelle und bezwinge den Tilger: Was die Schriften beschnitt, arbeitet noch.
- **description** EN: Clear the Expunged Chapel and bring down the Expunger: what cut the scriptures is still at work.
- **loreText** DE: Die Prozession am Eingang, die Lücke dahinter, und am Ende der Kapelle: er. Er hat nicht aufgesehen, als du kamst. Er meißelte. Der Tilger ist die Hand, die den Namen des Siebten aus den Schriften schnitt, und sie hat beim Schneiden nicht aufgehört, weil ein Name wiederkommen könnte, wenn man ihn lässt. Du hast ihn gefällt, und seine Arbeit blieb stehen: Wände voller Lücken, alle in derselben Form. Ich habe eine davon mit der Hand nachgefahren. Sie passt zu der Lücke, in die die Priester beten. Ich schreibe es nüchtern, weil ich es nicht anders kann: Der Siebte wurde nicht vergessen. Er wird vergessen gehalten. Wer das will, steht in keinem Buch, das ich besitze — noch nicht. Die Götterkriege fangen nicht mit Göttern an. Sie fangen mit dem an, was jemand getilgt haben wollte.
- **loreText** EN: The procession at the entrance, the gap behind it, and at the end of the chapel: him. He did not look up when you came. He was chiselling. The Expunger is the hand that cut the Seventh's name from the scriptures, and it did not stop cutting, because a name can come back if you let it. You felled him, and his work stayed where it was: walls full of gaps, all of the same shape. I traced one with my hand. It fits the gap the priests pray into. I write this plainly, because I cannot write it any other way: the Seventh was not forgotten. He is kept forgotten. Who wants that is in no book I own — not yet. The God Wars do not begin with gods. They begin with what someone wanted expunged.

### § 5.7 Wesen: Namen und Bestiariums-Zeilen

| ID | name DE | name EN | Bestiarium DE | Bestiarium EN |
|---|---|---|---|---|
| `idol_husk` | Götzenhülse | Idol Husk | Ein Götzenleib ohne Inhalt, der seine Bahn weitergeht, weil niemand ihm den Rückzug befahl. | An idol's body with nothing inside, still walking its path because nobody ordered it to retreat. |
| `skarn_whelp` | Skarnbrut | Skarn Whelp | Brut des Drachenhaut-Skarn, in den Trümmern des Sanktums geschlüpft. Ein Nest ist das sicherste Zeichen für einen unbewachten Ort. | Brood of the Dragonhide Skarn, hatched in the rubble of the Sanctum. A nest is the surest sign of an unguarded place. |
| `forsaken_servant` | Verlassener Diener | Forsaken Servant | Ein Funke vom Feuer des Fremden, der Gestalt annahm und wartet, an einer Kette, die niemand mehr hält. | A spark of the Stranger's fire that took shape and waits, on a chain nobody holds any more. |
| `idol_priest` | Götzenpriester | Idol Priest | Einer von denen, die weihten, als der Wächter sich weigerte. Die Maske hat keine Augen; er braucht keine. | One of those who consecrated when the Warden refused. The mask has no eyes; he needs none. |
| `prayer_eater` | Gebetsfresser | Prayer Eater | Gebete, die nie ankamen und nie verloren gingen, zu einem Leib geworden. Er spricht nicht, er wiederholt. | Prayers that never arrived and were never lost, grown into a body. It does not speak; it repeats. |
| `wreath_bearer` | Kranzträger | Wreath Bearer | Trägt einen der ersten Kränze aus Götzeneisen in einer Prozession, die niemand beendet hat. | Carries one of the first god-iron wreaths in a procession nobody ever ended. |
| `siege_idol` | Belagerungsgötze | Siege Idol | Ein Belagerungswerk gegen den Himmel, unfertig und ohne Meister. Der Wächter zieht es vor, dass es so bleibt. | A siege-work against heaven, unfinished and masterless. The Warden prefers it stay that way. |
| `the_expunger` (Boss, `dungeonOnly`) | Der Tilger | The Expunger | Die Hand, die den Namen des Siebten aus den Schriften schnitt. Sie hat nicht aufgehört. | The hand that cut the Seventh's name from the scriptures. It has not stopped. |

### § 5.8 Dungeon `expunged_chapel`

- **name** DE: Die Getilgte Kapelle · EN: The Expunged Chapel · Zone `idolhall` · `requiresQuest: "chronicle_26"` · Muster `behind_the_throne`/`idol_sanctum`.
- **waveMeta** (index-parallel zu `encounters`):
  1. „Die Prozession" / "The Procession", `kind: "elite"`, Welle `wreath_bearer` (dg_-Alias nach Krypta-Muster).
  2. „Die Lücke" / "The Gap", `kind: "elite"`, Welle `prayer_eater` (dg_-Alias).
  3. „Der Tilger" / "The Expunger", `kind: "boss"`, Welle `the_expunger`.
- Loot-Rahmung (Kommentar/Erfolgstexte): „Was er herausschnitt" / "What he cut away". Zahlen: content-dev/balance.
- Optionale interne Erfolge (kein Steam-Set): `ach_boss_the_expunger` „Der Schnitt endet" / "The Cut Ends" („Besiege den Tilger." / "Defeat the Expunger."); `ach_chapter_27` „Vergessen gehalten" / "Kept Forgotten" („Schließe das erste Kapitel der Götterkriege ab." / "Finish the first chapter of the God Wars.").
