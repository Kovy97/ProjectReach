# Textpass 1.4 „Feder und Stahl“ · Vorher/Nachher-Proben zur Stilabnahme

**Status:** Entwurf zur Chef-Abnahme (Lore-Dev, 2026-10-24). Nichts davon ist eingebaut.
**Regel der Proben:** Fakten, Namen und Werte bleiben exakt gleich. Es ändern sich nur Sprache, Klarheit und Ton nach `stilregeln.md`; Begriffe nach `glossar.md` (wo ein Glossar-Entscheid noch offen ist, steht die Empfehlung und ist markiert). „Vorher“ ist der Ist-Text aus Content bzw. `translations.ts`, Stand 24.10.2026.
**Was der Chef hier abnimmt:** den Ton. Wenn diese 38 Texte richtig klingen, läuft der Rest nach Regel.

---

## § 1 Items (15)

### 1.1 Balken · `timber_beam` (Material, gewöhnlich)
**Vorher DE:** Bauteil für New Haven. Wird beim Holzfällen gezimmert (Stufe 15).
**Nachher DE:** Ein Balken für die Bauten von New Haven. Fällt beim Holzfällen nebenbei mit ab, sobald du Stufe 15 erreicht hast.
**Vorher EN:** Building component for New Haven. Assembled while woodcutting (level 15).
**Nachher EN:** A beam for the buildings of New Haven. Comes together on the side while you cut wood, once you have reached level 15.
*Warum:* Klammer-Mechanik wird Satz; „Bauteil“ ist Entwicklersprache.

### 1.2 Narbenleder · `scarred_hide` (Material, gewöhnlich)
**Vorher DE:** Von alten Wunden gezeichnet, die verheilten, bevor das Tier endlich zur Strecke gebracht wurde; zäher durch die Narben.
**Nachher DE:** Alte Wunden, verheilt, lange bevor das Tier fiel. Die Narben machen das Leder zäher.
**Vorher EN:** Marked by old wounds that healed before the beast was finally brought down; tougher for the scarring.
**Nachher EN:** Old wounds, healed long before the beast finally went down. The scars make the hide tougher.
*Warum:* Semikolon weg, Schachtelsatz weg, dieselben zwei Aussagen.

### 1.3 Seelenschinder-Reißzahn · `soul_flayer_fang` (Material, sehr selten)
**Vorher DE:** Ein geschwungener Reißzahn, der nach verbrannten Seelen riecht. Seltener Drop des Seelenschinders, begehrt als Trophäe für die Trophäenwand des Lagers.
**Nachher DE:** Ein gebogener Reißzahn, der nach verbrannten Seelen riecht. Der Seelenschinder gibt ihn nur selten her. An der Trophäenwand von New Haven hängt er am besten.
**Vorher EN:** A curved fang reeking of burned souls. Rare drop from the soul flayer, prized as a trophy for the camp's Trophy Wall.
**Nachher EN:** A curved fang that reeks of burned souls. The soul flayer rarely gives one up. It belongs on the Trophy Wall in New Haven.
*Warum:* „Drop“ und „Lager“ (New Haven) nach Glossar; Satzbau ohne Partizipkette.

### 1.4 Leeren-Herold-Splitter · `void_herald_shard` (Material, sehr selten)
**Vorher DE:** Ein kristalliner Splitter eines Leeren-Herolds, der kalte Leerenenergie ausstrahlt. Handwerks-Zutat für das Slayer-Amulett.
**Nachher DE:** Ein Kristallsplitter aus einem Leeren-Herold, kalt bis in den Kern. Er gehört in das Slayer-Amulett.
**Vorher EN:** A crystalline shard from a void herald, radiating cold void energy. Crafting component for the Slayer Amulet.
**Nachher EN:** A crystal shard from a void herald, cold to the core. It goes into the Slayer Amulet.
*Warum:* „Handwerks-Zutat“/„Crafting component“ ist Rezeptsprache; die Verwendung bleibt genannt.

### 1.5 Dornfang-Klinge · `thornfang_blade` (Waffe, selten)
**Vorher DE:** Eine Klinge aus dem Dornenkranz des Dornwolfs — jede Kante zieht Blut.
**Nachher DE:** Geschnitzt aus dem Zahnkranz des Dornwolfs. Jede Kante zieht Blut.
**Vorher EN:** A blade carved from the Wolf of Thorns' fang-crown — every edge draws blood.
**Nachher EN:** Carved from the Wolf of Thorns' fang-crown. Every edge draws blood.
*Warum:* Strich-Pointe wird Punkt; DE hatte „Dornenkranz“ statt des englischen „fang-crown“ (Sachfehler).

### 1.6 Dämmerfang-Reißer · `duskfang_ripper` (Waffe, selten)
**Vorher DE:** Ein gekrümmter Stichdolch aus einer Geierkralle geschmiedet — leicht, schnell und grausam im Zug.
**Nachher DE:** Ein krummer Stichdolch, geschmiedet aus einer Geierkralle. Leicht, schnell und grausam, sobald er zieht.
**Vorher EN:** A curved shiv forged from a vulture's talon — light, quick, and cruel in the draw.
**Nachher EN:** A curved shiv forged from a vulture's talon. Light, quick, and cruel on the draw.
*Warum:* dasselbe Schema wie 1.5; die Adjektivreihe bleibt, weil sie hier Rhythmus ist, nicht Floskel.

### 1.7 Kronbogen des Erben · `gk_king_shortbow` (Raid-Beute, Waffe)
**Vorher DE:** Kurz genug für einen Goblin, hart genug für die Mark; Rakkzul schoss damit, bevor er saß.
**Nachher DE:** Kurz genug für einen Goblin, hart genug für die Mark. Rakkzul schoss damit, bevor er je auf einem Thron saß.
**Vorher EN:** Short enough for a goblin, hard enough for the march; Rakkzul shot with it before he sat a throne.
**Nachher EN:** Short enough for a goblin, hard enough for the march. Rakkzul shot with it before he ever sat a throne.
*Warum:* Semikolon weg; im DE fehlte der Thron (Sachlücke). Gilt für alle drei Varianten (Normal/Heroisch/Mythisch), die denselben Text tragen.

### 1.8 Lehrlings-Zauberhut · `apprentice_robe_hat` (Rüstung, gewöhnlich)
**Vorher DE:** Abgenutzt, spitz und etwas zu groß. Aber der Magie-Boost ist echt.
**Nachher DE:** Abgetragen, spitz und eine Nummer zu groß. Aber die Intelligenz, die er leiht, ist echt.
**Vorher EN:** Worn, pointed, and slightly too large. But the int boost is real.
**Nachher EN:** Worn, pointed and a size too large. But the intelligence it lends is real.
*Warum:* „Boost“/„int“ sind Entwicklerwörter; DE hatte aus Intelligenz „Magie“ gemacht.

### 1.9 Slayer-Armschienen · `slayer_vambraces` (Rüstung, episch)
**Vorher DE:** Armschienen aus versengter Aschenelend-Haut und gehärtetem Turm-Leder. Jeder Abschuss auf der Jagd schließt die Wunden des Jägers: +4 LP je Kill.
**Nachher DE:** Armschienen aus versengter Aschenelend-Haut und gehärtetem Turmleder. Jeder Sieg auf der Jagd schließt die Wunden des Jägers: +4 Leben je besiegtem Gegner.
**Vorher EN:** Vambraces fashioned from a scorched cinderwretch hide and hardened tower leather. Every kill on the hunt knits the hunter's wounds: +4 HP per kill.
**Nachher EN:** Vambraces of scorched cinderwretch hide and hardened tower leather. Every kill on the hunt knits the hunter's wounds: +4 HP per kill.
*Warum:* Flavor, Doppelpunkt, Wirkung mit Glossar-Wörtern (Leben, besiegter Gegner; EN „HP“/„kill“ bleiben). Glossar-Entscheid „Leben“ steht noch aus.

### 1.10 Slayer-Beinschienen · `slayer_greaves` (Rüstung, episch)
**Vorher DE:** Beinschienen, mit zersplitterten Schreckenzahn-Zähnen verstärkt. Gebaut für Beute über deinem Stand: +20 % Schaden gegen Monster, die über deinem Kampflevel liegen.
**Nachher DE:** Beinschienen, verstärkt mit den zersplitterten Zähnen des Schreckenzahns. Gebaut für Beute über deinem Stand: +20 % Schaden gegen Monster über deiner Stufe.
**Vorher EN:** Greaves reinforced with the fractured shards of dreadfang teeth. Built for prey above your station: +20% damage against monsters of higher level than you.
**Nachher EN:** Greaves reinforced with the shattered teeth of Dreadfang. Built for prey above your station: +20% damage against monsters above your level.
*Warum:* „Kampflevel“ raus; die Wirkung in einem halben Satz.

### 1.11 Ring des Seelenwächters · `ring_master_warding` (Meisterring, legendär)
**Vorher DE:** Hält stille Wacht über den Schutzschild der Seele. Erhöht die effektive Abwehr-Stufe um 5 und stärkt die Ward-Regeneration.
**Nachher DE:** Hält stille Wacht über die Barriere der Seele. Zählt als 5 Stufen Abwehr mehr und lässt die Barriere darum schneller nachwachsen.
**Vorher EN:** Keeps silent vigil over the soul's own shield. Raises effective Warding by 5, strengthening ward regeneration.
**Nachher EN:** Keeps silent vigil over the soul's own ward. Counts as 5 extra levels of Warding, so your ward regenerates faster.
*Warum:* ein Wort für Ward (Empfehlung „Barriere“; bei „Ward“ entsprechend einsetzen); „effektive Abwehr-Stufe“ wird ein verständlicher Satz.

### 1.12 Wanderersiegel · `chronicle_wanderers_seal` (Ring, selten)
**Vorher DE:** Getragen von Pilgern, die den Weg vom Grenzlager zum ersten Aschen-Schrein markierten. Ein geschärfter Blick für den Weg gewährt +3 % Beutechance auf reguläre Kills, solange es getragen wird.
**Nachher DE:** Getragen von Pilgern, die den Weg vom Grenzlager zum ersten Aschenschrein absteckten. Wer den Weg so gut kennt, sieht mehr am Wegrand: +3 % Beutechance bei gewöhnlichen Gegnern, solange du es trägst.
**Vorher EN:** Carried by pilgrims marking the road from the border camp to the first shrine of ash. A keener eye for the road grants +3% loot chance from regular kills while worn.
**Nachher EN:** Carried by pilgrims who marked the road from the border camp to the first shrine of ash. An eye that knows the road sees more beside it: +3% loot chance from regular kills while worn.
*Warum:* „reguläre Kills“ und Passiv raus; Flavor und Wirkung getrennt durch Doppelpunkt.

### 1.13 Das Schuldbuch · `gk_tally_focus` (Raid-Beute, Fokus)
**Vorher DE:** Jede Seite ein Posten, jeder Posten eine Sippe; die verbrannten Ränder sind die beglichenen.
**Nachher DE:** Jede Seite ein Posten, jeder Posten eine Sippe. Die verbrannten Ränder sind die beglichenen.
**Vorher EN:** Every page an entry, every entry a clan; the burned edges are the settled ones.
**Nachher EN:** Every page an entry, every entry a clan. The burned edges are the settled ones.
*Warum:* Die Raid-Texte sind bereits im Ton; nur Semikolons werden Punkte. So bleibt es für die meisten der 90 Raid-Beute-Zeilen.

### 1.14 Monsterjäger-Kampftrank · `slayer_combat_draught` (Verbrauchsgut, sehr selten)
**Vorher DE:** Aus der Essenz des Slayer-Turms destilliert. Beschleunigt deine Schläge (-450 ms Angriffsintervall) und schärft deinen Blick (+8 % Krit) für 10 Minuten.
**Nachher DE:** Destilliert aus der Essenz des Slayer-Turms. Für 10 Minuten: Angriffsintervall −450 ms, Krit-Chance +8 %.
**Vorher EN:** Distilled from Slayer Tower essence. Quickens your strikes (-450ms attack interval) and sharpens your aim (+8% crit) for 10 minutes.
**Nachher EN:** Distilled from Slayer Tower essence. For 10 minutes: attack interval −450 ms, crit chance +8%.
*Warum:* Flavor zuerst, dann Werte in Stat-Vokabular, keine Klammern. (Name: „Monsterjäger-“ oder „Slayer-“ je Glossar-Entscheid.)

### 1.15 Monsterjäger-Jagdelixier · `slayer_hunters_elixir` (Verbrauchsgut, episch)
**Vorher DE:** Nur für Slayer-Veteranen. Beschleunigt deine Angriffe (-600 ms Intervall), +12 % Krit, +20 % Krit-Schaden für 30 Minuten. Überlegene Dauerversorgung gegenüber dem Kampftrank.
**Nachher DE:** Vorbehalten den Veteranen der Jagd. Für 30 Minuten: Angriffsintervall −600 ms, Krit-Chance +12 %, Krit-Schaden +20 %. Hält länger vor als der Kampftrank.
**Vorher EN:** Reserved for veteran Slayers. Hastens your attacks (-600ms interval), +12% crit, +20% crit damage for 30 minutes. Superior sustained uptime vs. the Combat Draught.
**Nachher EN:** Reserved for veteran Slayers. For 30 minutes: attack interval −600 ms, crit chance +12%, crit damage +20%. Outlasts the Combat Draught.
*Warum:* „Überlegene Dauerversorgung“ war wörtlich übersetztes Balance-Deutsch.

---

## § 2 Aufgaben und Chronik (5)

### 2.1 In den Wald · `q_woodcutter_1`
**Vorher DE:** Erreiche Holzfällen-Level 5. Eine scharfe Axt und ein kühnes Herz reichen; mehr verlangt die Glutfeste nicht.
**Nachher DE:** Erreiche Stufe 5 in Holzfällen. Eine scharfe Axt und ein festes Herz reichen aus. Mehr verlangt die Glutfeste nicht.
**Vorher EN:** Reach Woodcutting level 5. A sharp axe and a stout heart are all it takes; Emberhold asks no more.
**Nachher EN:** Reach level 5 in Woodcutting. A sharp axe and a stout heart are all it takes. Emberhold asks no more.
*Warum:* Muster „Stufe {n} in {Fertigkeit}“ (gilt für die acht Aufgaben mit „-Level“ und für `q_skiller_2`); Semikolon weg.

### 2.2 Sammler · `q_gatherer`
**Vorher DE:** Sammle 50 beliebige Items für die Glutfeste: Holz hacken, Erz abbauen, Kräuter pflücken oder Monster erlegen.
**Nachher DE:** Sammle 50 Gegenstände für die Glutfeste, gleich welche: Holz schlagen, Erz brechen, Kräuter pflücken oder Monster erlegen.
**Vorher EN:** Gather 50 items of any kind for Emberhold: chop wood, mine ore, pick herbs, or fell monsters.
**Nachher EN:** Gather 50 items of any kind for Emberhold: cut wood, break ore, pick herbs or bring down monsters.
*Warum:* „Items“ raus; Verben aus der Welt statt aus dem Menü.

### 2.3 Vielseitiger Abenteurer · `q_skiller_2`
**Vorher DE:** Erreiche ein kombiniertes Gesamtlevel von 50. Wer nur eines kann, hält in dieser Welt nicht lange durch.
**Nachher DE:** Erreiche Gesamtstufe 50. Wer nur ein Handwerk kennt, hält in dieser Welt nicht lange durch.
**Vorher EN:** Reach a combined total level of 50. Knowing only one trade doesn't last long in this world.
**Nachher EN:** Reach total level 50. Knowing only one trade does not last long in this world.
*Warum:* „kombiniertes Gesamtlevel“ ist doppelt; „Gesamtstufe“ ist das Wort der Kopfzeile.

### 2.4 Fleißige Hände · `daily_e_craft_any_10` (Tagesaufgabe)
**Vorher DE:** Stelle 10 beliebige Items her — schmieden, schmelzen, Bögen bauen oder kochen.
**Nachher DE:** Stelle 10 Gegenstände her, gleich welche: schmieden, schmelzen, Bögen bauen oder kochen.
**Vorher EN:** Craft 10 items of any kind — smith, smelt, fletch or cook.
**Nachher EN:** Craft 10 items of any kind: smith, smelt, fletch or cook.
*Warum:* Aufzählung nach Doppelpunkt statt Gedankenstrich; Schema für die Tagesaufgaben mit Strich.

### 2.5 Das letzte Tor · `chronicle_18`, Lore-Text (Auszug: die letzten drei Sätze)
**Vorher DE:** Ich habe diesen Satz sehr lange nicht geschrieben. Die Feder hat ihn trotzdem gekonnt. Also weiter — die Akte will ihr Ende, und ich habe ihr eines versprochen.
**Nachher DE:** Ich habe diesen Satz sehr lange nicht geschrieben. Die Hand hat ihn trotzdem hinbekommen. Also weiter. Ich habe diesem Buch ein Ende versprochen, und das halte ich.
**Vorher EN:** I have not written that sentence in a very long time. The pen managed it all the same. Onward, then — the file wants its ending, and I promised it one.
**Nachher EN:** I have not written that sentence in a very long time. My hand managed it all the same. Onward, then. I promised this book an ending, and I keep my word.
*Warum:* v2-Regel: Feder und Akte handeln nicht, der Wächter handelt. Der Rest des Kapitels bleibt. Diese Probe hängt an Stil-Frage 2 (Chronik-Register).

---

## § 3 Begleiter (3)

### 3.1 Glyphenschlund · `glyphmaw`
**Vorher DE:** Es schluckt Runen ganz und speit mehr aus, als es verschluckt hat. Das Schlundleuchten erlischt nie. Im Kampf speit es den Überschuss in deinen Ward, Stück für Stück.
**Nachher DE:** Es schluckt Runen ganz und gibt mehr zurück, als es verschluckt hat. Das Leuchten im Schlund erlischt nie. Im Kampf speit es den Überschuss in deine Barriere, Stück für Stück.
**Vorher EN:** It swallows runes whole and regurgitates more than it consumed. The throat-glow never fades. In combat it spits the surplus into your ward, a little at a time.
**Nachher EN:** It swallows runes whole and gives back more than it took. The glow in its throat never fades. In combat it spits the surplus into your ward, a little at a time.
*Warum:* Verb-Doppelung weg, Ward-Wort nach Glossar; Dreisatz-Reihenfolge (Erscheinung, Beruf, Kampf) war schon richtig.

### 3.2 Aasschwinge · `carrionwing`
**Vorher DE:** Es kreist jeden Kampf aus, bevor es landet. Sein Aasfresser-Blick durchsucht jeden Kill zweimal, und manche Nacht trägst du doppelt heim, nur die Beute eines Champions rührt es nicht an. Dann legt es die Flügel an und stürzt sich in einem Sturzflug hinab, der glatt durch jede Rüstung schlägt.
**Nachher DE:** Es kreist über jedem Kampf, bevor es landet. Sein Aasfresserblick geht jeden Kadaver zweimal durch, und in manchen Nächten trägst du doppelt heim. Nur die Beute eines Champions rührt es nicht an. Dann legt es die Flügel an und stößt herab, so hart, dass es glatt durch jede Rüstung geht.
**Vorher EN:** It circles every fight before landing. Its scavenger's eye picks over a kill twice, and some nights you carry home double, though it leaves a champion's prize alone. Then it folds its wings and drops in a dive that punches clean through armour.
**Nachher EN:** It circles every fight before it lands. Its scavenger's eye goes over every carcass twice, and some nights you carry home double. A champion's prize it leaves alone. Then it folds its wings and dives, hard enough to punch clean through armour.
*Warum:* „Kill“ raus, „stürzt sich in einem Sturzflug“ war doppelt; Champion-Ausnahme bekommt einen eigenen Satz.

### 3.3 Leon, der Gefürchtete · `booted_tomcat`
**Vorher DE:** Ein grau-silbern getigerter Kater mit gelbgrünen Augen, der aufrecht in Stiefeln und Lederharnisch geht und mit Schlinge und Armbrust jagt. An den Fallen leert er die Schlinge mit etwas Glück zweimal, und ein Fang lässt zehn Beute-Würfe da statt fünf. Im Kampf landet er einen Stiefeltritt, nach dem der Gegner hinkt.
**Nachher DE:** Ein grau-silbern getigerter Kater mit gelbgrünen Augen. Er geht aufrecht, in Stiefeln und Lederharnisch, und jagt mit Schlinge und Armbrust. An den Fallen leert er die Schlinge mit etwas Glück zweimal, und ein Fang bringt zehn Beutewürfe statt fünf. Im Kampf tritt er zu, und der Gegner hinkt danach.
**Vorher EN:** A grey-and-silver tabby tom with yellow-green eyes who walks upright in boots and a leather harness, hunting with snare and crossbow. At the traps he empties the snare twice when luck is on his side, and a catch leaves ten loot rolls instead of five. In a fight he lands a booted kick that leaves the enemy limping.
**Nachher EN:** A grey-and-silver tabby tom with yellow-green eyes. He walks upright in boots and a leather harness and hunts with snare and crossbow. At the traps he empties the snare twice when luck is with him, and a catch brings ten loot rolls instead of five. In a fight he lands a booted kick that leaves the enemy limping.
*Warum:* Erster Satz ohne Relativsatz-Kette; „Beute-Würfe da lassen“ war Übersetzer-Deutsch. Die Zahlen bleiben hier, weil die Beschreibung die einzige Stelle ist.

---

## § 4 Erfolge (5)

### 4.1 Vollender · `ach_total_level_1980`
**Vorher DE:** Erreiche das absolute Maximum von 2178 Gesamtlevel. Alle 22 Fertigkeiten auf Stufe 99.
**Nachher DE:** Erreiche Gesamtstufe 2178, mehr gibt es nicht: alle 22 Fertigkeiten auf Stufe 99.
**Vorher EN:** Reach the absolute maximum total level of 2178. All 22 skills at level 99.
**Nachher EN:** Reach total level 2178, the most there is: all 22 skills at level 99.
*Warum:* Zwei Wörter für Level im selben Satz; „absolutes Maximum“ ist Werbeton.

### 4.2 Holzfällen-Maximiert · `ach_skill_woodcutting_99` (Schema für 22 Fertigkeiten)
**Vorher DE:** Holzfällen-Maximiert · Erreiche Holzfällen Stufe 99.
**Nachher DE:** Meisterweihe: Holzfällen · Erreiche Stufe 99 in Holzfällen.
**Vorher EN:** Woodcutting Maxed · Reach Woodcutting level 99.
**Nachher EN:** Woodcutting Maxed · Reach level 99 in Woodcutting.
*Warum:* „Maximiert“ ist kein Deutsch; die Stufe-99-Zeremonie heißt im Spiel Meisterweihe. Leiter: Geselle (25) / Veteran (50) / Meister (75) / Legende (90) / Meisterweihe (99).

### 4.3 Verlies-Läufer · `ach_dungeons_total_5`
**Vorher DE:** Verlies-Läufer · Schließe 5 Verliese ab.
**Nachher DE:** Dungeonläufer · Schließe 5 Dungeon-Durchläufe ab.
**Vorher EN:** Dungeon Runner · Complete 5 dungeon runs.
**Nachher EN:** Dungeon Runner · Complete 5 dungeon runs. (unverändert)
*Warum:* „Verlies“ steht nur in sechs Erfolgen, „Dungeon“ überall sonst; „5 Verliese abschließen“ war sachlich schief (es sind Durchläufe).

### 4.4 Set-Sucher · `ach_sets_completed_1`
**Vorher DE:** Vervollständige 1 vollständiges Ausrüstungs-Set.
**Nachher DE:** Vervollständige ein Ausrüstungsset. (Folge-Erfolge: „Vervollständige 5 Ausrüstungssets.“)
**Vorher EN:** Complete 1 full equipment set.
**Nachher EN:** Complete one full equipment set.
*Warum:* „vervollständige … vollständiges“ war doppelt; Schreibung „Ausrüstungsset“ als Gattungswort.

### 4.5 Ein Freund in der Asche · `ach_pets_1`
**Vorher DE:** Besitze deinen ersten Begleiter.
**Nachher DE:** Nimm deinen ersten Begleiter auf.
**Vorher EN:** Own your first pet.
**Nachher EN:** Take in your first companion.
*Warum:* „pet“ widerspricht „Companions“ überall sonst; „besitzen“ passt nicht zu Wesen, die einem zulaufen (Offline-Bericht: „Dir ist unterwegs etwas zugelaufen“).

---

## § 5 UI-Hinweise und Labels (10)

### 5.1 Kopfzeile · `sidebar.combatLevel`, `sidebar.totalLevel`
**Vorher DE:** Kampf Lv · Ges. Lv
**Nachher DE:** Kampfstufe · Gesamtstufe
**Vorher EN:** Combat Lv · Total Lv
**Nachher EN:** Combat level · Total level
*Hinweis an ui-dev:* Breite für „Kampfstufe 96 · Gesamtstufe 1918“ prüfen. Wenn der Platz fehlt, zeigt die Zeile nur die Zahlen mit Icon und der Tooltip das Wort; eine deutsche Abkürzung gibt es nicht. EN darf im Notfall „Lv“ behalten.

### 5.2 Aktion gestoppt · `skill.stoppedLevelTooLow`
**Vorher DE:** Gestoppt — Level zu niedrig für diese Aktion. Steigere die Fertigkeit und starte neu.
**Nachher DE:** Gestoppt: Deine Stufe reicht für diese Aktion nicht aus. Steigere die Fertigkeit und starte sie neu.
**Vorher EN:** Level too low for this action. Raise the skill and restart.
**Nachher EN:** Stopped: your level is too low for this action. Raise the skill and start it again.
*Warum:* Zustand, dann Handlung; Doppelpunkt statt Strich; EN bekommt dasselbe Signalwort wie DE.

### 5.3 Bank voll · `bank.full`
**Vorher DE:** Bank voll — gib einen Slot frei, um neue Item-Arten einzulagern.
**Nachher DE:** Die Bank ist voll. Räume einen Platz frei, bevor du neue Gegenstandsarten einlagerst.
**Vorher EN:** Bank full — free a slot before you can store new item types.
**Nachher EN:** The bank is full. Free a slot before you store new item types.

### 5.4 Herstellbar · `skill.craftable` (0-Fall)
**Vorher DE/EN:** Herstellbar: 0× · Craftable: 0×
**Nachher DE:** Herstellbar: 0× · Material fehlt | Herstellbar: 0× · ab Stufe {n} | Herstellbar: 0× · Inventar voll
**Nachher EN:** Craftable: 0× · materials missing | Craftable: 0× · needs level {n} | Craftable: 0× · inventory full
*Hinweis an ui-dev:* braucht drei Schlüssel (`skill.craftable.none.materials` / `.level` / `.space`) und den Grund aus der Rezeptprüfung. Bei n > 0 bleibt der alte Text.

### 5.5 Seltener Fund · `toast.dropRate`
**Vorher DE:** Dropchance {pct}
**Nachher DE:** Fundchance {pct}
**Vorher EN:** Drop rate {pct}
**Nachher EN:** Drop rate {pct} (unverändert)
*Warum:* Der Toast darüber heißt „Seltener Fund!“; dasselbe Wort darunter.

### 5.6 Statblatt · `stat.mitigation`
**Vorher DE:** Mitigation
**Nachher DE:** Schadensminderung
**Vorher/Nachher EN:** Mitigation

### 5.7 Kampfseite · `combat.dock.skills`, `combat.kills`, `combat.hud.kills`
**Vorher DE:** Skills · Kills: {n} · Kills
**Nachher DE:** Fertigkeiten · Besiegt: {n} · Besiegt
**Vorher/Nachher EN:** Skills · Kills: {n} · Kills (unverändert)

### 5.8 Meisterschaft · `mastery.poolHint`
**Vorher DE:** Der Meisterschafts-Pool eines Skills füllt sich, während du seine Aktionen meisterst. Checkpoints bei 5/25/50/95 % schalten skillweite Boni frei (Doppelertrag, Tempo, Material-Ersparnis).
**Nachher DE:** Der Meisterschaftsvorrat einer Fertigkeit füllt sich, während du ihre Aktionen meisterst. Bei 5, 25, 50 und 95 % schaltet er Boni für die ganze Fertigkeit frei: doppelter Ertrag, mehr Tempo, gesparte Materialien.
**Vorher EN:** The skill's mastery pool fills as you master its actions. Checkpoints at 5/25/50/95% unlock skill-wide bonuses (double yield, speed, material preservation).
**Nachher EN:** A skill's mastery pool fills as you master its actions. At 5, 25, 50 and 95% it unlocks bonuses for the whole skill: double yield, more speed, saved materials.

### 5.9 Slayer-Turm · `slayer.tower.intro`
**Vorher DE:** Fünf Etagen mit steigender Schwierigkeit, je nach Slayer-Level freigeschaltet. Tower-Aufgaben gewähren einzigartige Drops.
**Nachher DE:** Fünf Etagen, jede gefährlicher als die davor, und jede öffnet sich erst ab einer bestimmten Slayer-Stufe. Aufträge im Turm bringen Beute, die es nirgends sonst gibt.
**Vorher EN:** Five floors of escalating danger, each gated by Slayer level. Tower tasks grant unique drops.
**Nachher EN:** Five floors, each more dangerous than the last, and each opens only at a certain Slayer level. Tower contracts drop loot found nowhere else.
*Warum:* „gated“, „Tower-Aufgaben“, „Drops“ raus; „Slayer“ nach Glossar-Entscheid.

### 5.10 Erklärtext mit Strich-Kette · `onboarding.guide.achievements.body`
**Vorher DE:** Schließe Spielziele ab — Skill-Level erreichen, Monster besiegen, Reichtum anhäufen — um Erfolge freizuschalten. Jeder gibt Erfolgspunkte (AP), die deinen Gesamtfortschritt messen.
**Nachher DE:** Erfolge schaltest du frei, indem du Ziele erreichst: eine bestimmte Stufe in einer Fertigkeit, besiegte Monster, angehäuftes Gold. Jeder Erfolg bringt Erfolgspunkte (AP), an denen du deinen Gesamtfortschritt ablesen kannst.
**Vorher EN:** Complete in-game goals — reaching skill levels, defeating monsters, amassing wealth — to unlock Achievements. Each grants Achievement Points (AP) that track your overall progress.
**Nachher EN:** Achievements unlock when you reach goals: a certain skill level, monsters defeated, gold amassed. Each one grants Achievement Points (AP), which track your overall progress.
*Warum:* Die einzige Textsorte mit Gedankenstrich-Ketten (3 DE, 4 EN) sind diese Erklärtexte; Doppelpunkt-Aufzählung löst alle.

---

## § 6 Abnahme-Fragen zu den Proben

1. Ton der Item-Texte (1.1–1.15): Reicht der Halbton Chronik (knapp, sachlich, ein Bild), oder darf es trockener/dunkler werden?
2. Mechanik hinter dem Doppelpunkt (1.9, 1.11, 1.12, 1.14, 1.15): gefällt die Form, oder lieber ein eigenes Effektfeld (Stil-Frage 5)?
3. Aufgaben-Muster „Stufe {n} in {Fertigkeit}“ (2.1) und „gleich welche: …“ (2.2, 2.4) als Schema freigeben?
4. Chronik-Probe (2.5): Register-Entscheid; nur Feder/Akte raus, oder stärker in die gesprochene Stimme?
5. Erfolgsleiter mit „Meisterweihe“ (4.2) freigeben?
6. Kopfzeile ohne Abkürzung (5.1): ui-dev den Platz prüfen lassen, bevor der Text fällt?
