# Raid-Lore — Die Hallen von Gobkha'raz (Halls of Gobkha'raz)

<!-- claude:2026-10-23T15:32:00+02:00 -->
<!-- claude:2026-10-24T22:15:00+02:00 — Gate L entschieden (Chef-Delegation 24.10.2026); Übersetzungen ES/FR/PT-BR/RU/ZH in raid-gobkharaz-i18n.md; Glossar-Nachtrag § 12 in weltlore-grim-reach.md § 9 eingepflegt -->

Lore-Dev, 2026-10-23. Auftrag: `design/1.4.0-goal.md` Welle 0 (Gate L) und Welle 4 (R1–R10, Annahmen A5/A7). Kanon: `weltlore-grim-reach.md` § 1.3–1.5 (Fremder, geliehenes Feuer, Götzeneisen), § 3.4/3.5 (Goblins, Mux), § 4.2/§ 5.1/§ 6 (Mark, Kriegsbande, Nutznießer), § 8 (Sprachfarbe); `aschechronik-spec.md` Kap. 4, 5, 20, 21; `band2-auftakt-1.3.0.md`; `player-character-codex.md` § 2.4 (Goblin ~1,50 m). **Status: Gate L ENTSCHIEDEN am 24.10.2026** („Entscheide du das Beste“, `1.4.0-goal.md` Chef-Entscheide vom 24.10.2026, Zeile Gate L). Die Namen und Texte dieses Dokuments sind damit Kanon; die fünf weiteren Sprachen liegen in **`design/lore/raid-gobkharaz-i18n.md`** (gleiche Paragraphen-Nummern), der Glossar-Nachtrag § 12 steht jetzt auch in `weltlore-grim-reach.md` § 9.

Regeln für alle Spieltexte in dieser Datei: natürliche Prosa, höchstens ein Gedankenstrich je Text (hier: keiner), keine Emojis. **Kanon-Regel für den Raid:** Der Wächter darf Drazhan beim Namen nennen (der Raid öffnet nach Kapitel 20). Die Goblins kennen den Namen nicht; sie sagen immer **„der Gläubiger“ / „the Creditor“**, nie „Drazhan“, nie „der Fremde“.

---

## § 0 ID → Name

### Raid und Räume

| ID | DE | EN |
|---|---|---|
| `gobkharaz` | Die Hallen von Gobkha'raz | Halls of Gobkha'raz |
| `gk_room_1` | Das Zolltor | The Toll Gate |
| `gk_room_2` | Die Zeughallen | The Armories |
| `gk_room_3` | Die Bestiengruben | The Beast Pits |
| `gk_room_4` | Das Heiligtum des geliehenen Feuers | The Shrine of the Borrowed Fire |
| `gk_room_5` | Der Erbthron | The Heir's Throne |

### Bosse

| ID | DE | EN |
|---|---|---|
| `gk_tallymistress` | Zahlmeisterin Vrikka | Tallymistress Vrikka |
| `gk_quartermaster` | Zeugmeister Krogg | Quartermaster Krogg |
| `gk_pitmother` | Grubenmutter Ushka | Pitmother Ushka |
| `gk_felmagus` | Oberfelmagierin Zil'gath | High Fel-Magus Zil'gath |
| `gk_warking` | Kriegskönig Rakkzul der Erbe | War-King Rakkzul the Heir |

### Wellen-Gegner

| ID | Raum | DE | EN | Familie |
|---|---|---|---|---|
| `gk_toll_thug` | 1 | Zollknecht | Toll Enforcer | humanoid |
| `gk_gate_pikeman` | 1 | Torpikenier | Gate Pikeman | humanoid |
| `gk_armory_breaker` | 2 | Zeughausbrecher | Armory Breaker | humanoid |
| `gk_ballista_gunner` | 2 | Ballistenschütze | Ballista Gunner | humanoid |
| `gk_pit_hound` | 3 | Grubenhund | Pit Hound | beast |
| `gk_beastkeeper` | 3 | Bestienhüterin | Beastkeeper | humanoid |
| `gk_fel_acolyte` | 4 | Felakolyth | Fel Acolyte | humanoid |
| `gk_ember_warden` | 4 | Glutwächter | Ember Warden | humanoid |
| `gk_crownguard` | 5 | Kronwächter | Crownguard | humanoid |
| `gk_bannerman` | 5 | Bannerträger | Bannerman | humanoid |

### Sets (Grundnamen; `_heroic`/`_mythic` tragen denselben Namen)

| ID | DE | EN |
|---|---|---|
| Set `gk_fire` | Ornat des geliehenen Feuers | Regalia of the Borrowed Fire |
| `gk_fire_head` | Kapuze des geliehenen Feuers | Hood of the Borrowed Fire |
| `gk_fire_chest` | Robe des geliehenen Feuers | Robe of the Borrowed Fire |
| `gk_fire_legs` | Beinkleid des geliehenen Feuers | Leggings of the Borrowed Fire |
| `gk_fire_feet` | Schuhe des geliehenen Feuers | Shoes of the Borrowed Fire |
| `gk_fire_hands` | Handwickel des geliehenen Feuers | Handwraps of the Borrowed Fire |
| Set `gk_poison` | Pirschgewand der Grubenmeute | Pitpack Stalker's Garb |
| `gk_poison_head` | Kapuze der Grubenmeute | Hood of the Pitpack |
| `gk_poison_chest` | Wams der Grubenmeute | Jerkin of the Pitpack |
| `gk_poison_legs` | Beinschienen der Grubenmeute | Leggings of the Pitpack |
| `gk_poison_feet` | Stiefel der Grubenmeute | Boots of the Pitpack |
| `gk_poison_hands` | Handschuhe der Grubenmeute | Gloves of the Pitpack |
| Set `gk_bleed` | Blutschwur der Kronwache | Bloodoath of the Crownguard |
| `gk_bleed_head` | Helm der Kronwache | Helm of the Crownguard |
| `gk_bleed_chest` | Kürass der Kronwache | Cuirass of the Crownguard |
| `gk_bleed_legs` | Beinschienen der Kronwache | Greaves of the Crownguard |
| `gk_bleed_feet` | Panzerstiefel der Kronwache | Sabatons of the Crownguard |
| `gk_bleed_hands` | Panzerhandschuhe der Kronwache | Gauntlets of the Crownguard |

### Unikate (Grundnamen)

| ID | Boss | DE | EN |
|---|---|---|---|
| `gk_tally_dagger` | Vrikka | Pfandmesser | Pledge Knife |
| `gk_tally_focus` | Vrikka | Das Schuldbuch | The Debt Ledger |
| `gk_tally_ring` | Vrikka | Siegelring des Zolls | Toll Signet |
| `gk_quarter_maul` | Krogg | Belagerungshammer | Siege Maul |
| `gk_quarter_shield` | Krogg | Turmschild der verlorenen Mark | Tower Shield of the Lost March |
| `gk_quarter_quiver` | Krogg | Köcher des Zeugmeisters | Quartermaster's Quiver |
| `gk_pit_longbow` | Ushka | Rudelruf | Packcall |
| `gk_pit_scimitar` | Ushka | Grubenzahn | Pit Fang |
| `gk_pit_amulet` | Ushka | Halsband der Grubenmutter | Pitmother's Collar |
| `gk_fel_staff` | Zil'gath | Stab des geliehenen Feuers | Staff of the Borrowed Fire |
| `gk_fel_wand` | Zil'gath | Glutzunge | Embertongue |
| `gk_fel_ring` | Zil'gath | Ring des Gläubigers | Ring of the Creditor |
| `gk_king_greatsword` | Rakkzul | Erbklinge | Heirblade |
| `gk_king_shortbow` | Rakkzul | Kronbogen des Erben | Crownbow of the Heir |
| `gk_king_scepter` | Rakkzul | Thronszepter | Throne Scepter |
| `gk_king_cape` | Rakkzul | Mantel des Erben | Mantle of the Heir |

### Wochen-Modifikatoren und Material

| ID | DE | EN |
|---|---|---|
| `payday` | Zahltag | Payday |
| `borrowed_fire` | Geliehenes Feuer | Borrowed Fire |
| `war_drums` | Kriegstrommeln | War Drums |
| `beast_hunger` | Bestienhunger | Beast Hunger |
| `open_armory` | Offenes Zeughaus | Open Armory |
| `poison_kitchen` | Giftküche | Poison Kitchen |
| `blood_feast` | Blutfest | Blood Feast |
| `silent_halls` | Stille Hallen | Silent Halls |
| `relic_dust` | Reliktstaub | Relic Dust |

---

## Entschieden (Gate L, Chef-Delegation 24.10.2026)

Der Chef hat am 24.10.2026 alle fünf Punkte an Claude delegiert („Entscheide du das Beste“); die Empfehlungen gelten damit als Entscheid (`design/1.4.0-goal.md`, Chef-Entscheide vom 24.10.2026, Gate L). Der ursprüngliche Wortlaut bleibt als Historie stehen.

1. **ENTSCHIEDEN: Raum 4 auf Englisch „Shrine of the Borrowed Fire“, Deutsch „Heiligtum“.** Keine Kollision mit „Sanctum of the Last Idol“. In ES/FR/PT-BR/RU/ZH nutzt der Raum bewusst Kapellen-/Altar-Wörter (Altar · Chapelle · Capela · Часовня · 圣坛), weil „Santuario/Sanctuaire/Santuário/Святилище/圣所“ dort schon das Sanktum des Letzten Götzen sind (`raid-gobkharaz-i18n.md` § 0).
   - *Ursprüngliche Frage:* „Shrine of the Borrowed Fire“ statt „Sanctum“, damit nichts mit „Sanctum of the Last Idol“ kollidiert. Deutsch bleibt „Heiligtum“. Einverstanden?
2. **ENTSCHIEDEN: Rakkzuls vier Phasen wie in § 5.5** (75 % Vrikkas Ward, 50 % Kroggs „jeder 4. Angriff ×3“, 25 % Ushkas Doppelangriffe mit Blutung, 10 % Wut mit Zil'gaths Brand). combat-dev/balance dürfen die Reihenfolge tauschen; die Ansagen tragen jede Reihenfolge der vier Vorgänger.
3. **ENTSCHIEDEN: Kein neues Chronik-Kapitel.** Die Einladung (§ 3) steht auf der Raid-Karte, nennt Drazhan offen, lässt den Wächter die Gläubigerhälfte des Kerbholzes finden und Mux den Namen bestätigen. Band 2 läuft weiter in der Götzenhalle.
4. **ENTSCHIEDEN: „Kronwächter / Crownguard“** (statt „Königsgardist“) und **„Grubenzahn / Pit Fang“** (statt „Reißzahn“, Kollision mit „Leitwolf-Reißzahn / Alpha Fang“).
5. **ENTSCHIEDEN: Das geliehene Feuer ist bleich, fast weiß, rauchlos, und bewegt keine Schatten.** Nicht grün. Gilt für Kulisse 4 und 5, Zil'gath, Felakolyth, Glutwächter und alle Fel-Items. Bild-Briefings in § 4.4/§ 4.5/§ 5.4 sind darauf schon geschrieben. Dazu aus dem Chef-Entscheid: Mark-Banner rotbraun, die Feste liegt unter dem Wall der Mark.

---

## § 1 Gobkha'raz — Kanon-Vorschlag (Arbeitsdokument, kein Spieltext)

**Lage.** Die Mark hatte eine Kernfeste unter ihrem Wall: Torhaus, Zeughallen, Zwinger, Torkapelle, Befehlshalle. Beim Abzug wurde sie nicht gesprengt; niemand gab den Befehl, so wenig wie den zur Aufgabe selbst (Chronik Kap. 4). Die Goblins fanden sie, wie man ein Erbe findet, und nannten sie Gobkha'raz. Mux übersetzt den Namen mit „das, was man uns ließ“, und sagt, die Übersetzung sei höflich. Die Feste hatte einmal einen Namen des Reachs. Die Chronik führt ihn nicht mehr: Wer eine Festung aufgibt, verliert das Recht, sie zu benennen. Das Feldlager der Kriegsbande (Dungeon `goblin_warband`) ist der Vorposten; Gobkha'raz ist die Stadt dahinter.

**Gesellschaft der Schuld.** In Gobkha'raz gehört niemandem etwas. Das Eisen ist geliehen (vom Reach, das es liegen ließ), das Feuer ist geliehen (vom Gläubiger), und das Buch, in dem beides steht, ist der eigentliche Thron. Jede Sippe, die das geliehene Feuer trägt, zahlt Zins, und der Zins wird in Trägern gezahlt: *Gebet ist Feuer, es verzehrt den, der es gibt* (Bibel § 1.3). Ein Felmagier brennt aus, von den Händen her, grau bis zum Ellbogen, und die Sippe stellt den nächsten. Wer im Rückstand ist, wird „eingetrieben“: Das Sippenzeichen wird aus dem Buch gebrannt, die Leute gehen in die Gruben (als Futter) oder an die Front (als Vorhut). Das ist die Kultur, aus der die fünf Bosse kommen: die Zählerin, der Verleiher, die Züchterin, die Priesterin, der König. Keine Lumpen, keine Komik. Eine Stadt, die die alte Armee so genau nachbaut, dass sie eine geworden ist.

**Der Gläubiger und sein Rückzug.** Die Goblins haben den Fremden nie bei einem Namen gekannt. Er verlieh das Feuer, stellte das Becken aus Götzeneisen in die Torkapelle und nahm Zil'gath den Ring als Pfand ab. Dann kam er nicht wieder. Als Drazhan in der Götzenhalle wich (Kap. 20), erlosch das Feuer in der Mark nicht. Es wurde heller, so wie ein Gläubiger auf dem Rückzug seine Forderungen nicht verfallen lässt, sondern liegen, damit sie jemand anders eintreibt. Zwei Lesarten ringen in Gobkha'raz: Zil'gath zahlt weiter in ein Feuer, von dem niemand mehr abholt, und wartet. Rakkzul erklärt die Schuld für erloschen und das Feuer für Erbe. Wer recht hat, entscheidet der Spieler mit dem Schwert; die Chronik notiert nur, dass beide Lesarten ein Heer brauchen.

**Die Brücke (A7).** Unter den zurückgelassenen Schätzen lag die Gläubigerhälfte eines Kerbholzes mit dem Namen Gobkha'raz. Die Schuldnerhälfte liegt in Vrikkas Buch. Der Wächter ist Chronist; er erkennt ein Hauptbuch, wenn er eines sieht. Mux bestätigt den Namen beim dritten Fragen und hebt danach den Preis für Seile an. Warum jetzt: Ein Heer mit Drazhans Feuer im Rücken der Glutfeste ist genau das, was der Paragonturm probt, „Heere, die noch nicht marschieren“ (Bibel § 1.7). Rakkzul will marschieren. Die Mark wurde einmal aufgegeben; der Wächter hat geschrieben, dass ein zweites Mal nicht verzeichnet wird, und er meint es.

**Der Ton des Wächters zu diesem Kapitel.** Kein Triumph. Die Goblins sind ein Volk (Bibel § 3.4, „kein schönes Kapitel, aber ein ehrliches“). Die freien Sippen sind gegangen; wer in Gobkha'raz steht, hat das Feuer genommen oder wurde hineingeboren, und die Chronik unterscheidet das nicht, weil sie es nicht kann. Voss zählt zweimal aus Trauer. Vrikka zählt einmal und brennt. Der Wächter trägt beides ein.

**Warum man wiederkommt (Wiederholung des Raids).** Eine Hauptstadt wird nicht an einem Tag vernichtet. Die Sippen kommen nach, der Thron wird neu besetzt, das Buch neu geführt. Die Rast-Zeile nach dem Endboss (§ 11) sagt genau das.

---

## § 2 Raid-Name und Einführung

- **name** DE: Die Hallen von Gobkha'raz · EN: Halls of Gobkha'raz
- **Einführung** DE: Unter dem alten Wall der Mark liegt die Hauptstadt der Goblins: die Kernfeste, die das Reach beim Abzug nicht sprengte und die ihre Erben Gobkha'raz nennen. Hier wird das geliehene Feuer verwaltet, Sippe um Sippe, Zins um Zins, und hier baut der Kriegskönig das Heer, von dem der Kriegshäuptling nur träumte. Fünf Hallen, fünf Türen, und hinter der letzten ein Thron.
- **Einführung** EN: Beneath the old rampart of the march lies the capital of the goblins: the keep the Reach did not raze when it withdrew, which its heirs call Gobkha'raz. Here the borrowed fire is administered, clan by clan and interest by interest, and here the War-King builds the army the Warchief only dreamed of. Five halls, five doors, and a throne behind the last.
- **Gebühr-Zeile (optional, für die Raid-Karte)** DE: Ein Feldzug kostet, was ein Feldzug kostet: Proviant, Bolzen und Mux' Wegzoll. Voss zählt es zweimal. · EN: A campaign costs what a campaign costs: provisions, bolts and Mux's toll for the way in. Voss counts it twice.

---

## § 3 Einladungstext (Stimme des Wächters, auf der Raid-Karte nach dem ersten Sieg über Drazhan)

- DE: Drazhan wich, und das Feuer in der Mark erlosch nicht; es wurde heller. Unter dem, was er zurückließ, lag die Gläubigerhälfte eines Kerbholzes, und darauf ein Name, den Mux mir erst beim dritten Fragen bestätigte: Gobkha'raz, die Hauptstadt der Goblins, in der die Schuld für das geliehene Feuer geführt wird. Ihr Kriegskönig hält den Gläubiger für fort und sich selbst für dessen Erben, und er baut aus dem Nachlass der Mark das Heer, von dem der Häuptling nur träumte. Ich habe einmal geschrieben, dass die Mark kein zweites Mal aufgegeben wird. Es ist Zeit, das zu belegen.
- EN: Drazhan withdrew, and the fire in the march did not go out; it grew brighter. Among what he left behind lay the creditor's half of a tally stick, and on it a name Mux confirmed only the third time I asked: Gobkha'raz, the capital of the goblins, where the debt for the borrowed fire is kept. Its War-King holds the Creditor gone and himself the Creditor's heir, and out of the estate of the march he is building the army the Warchief only dreamed of. I once wrote that the march would not be abandoned a second time. It is time to prove it.

---

## § 4 Die fünf Räume (Name und Kulisse; die Beschreibung ist zugleich das Bild-Briefing)

Bildformat wie `assets/battlescreens/*.webp` (1536×1024 + `.card.webp` 880×587, deckend); Dateinamen-Vorschlag `gk_room_1` … `gk_room_5` (Loader-Vertrag prüft der Hauptagent). Gemalter Dark-Fantasy-Stil wie die Bestands-Kulissen, keine Figuren im Bild, kein Leuchten außer dem Feuer selbst.

### § 4.1 `gk_room_1` · Das Zolltor / The Toll Gate

- DE: Das Torhaus der alten Mark, in den Wall gehauen, das Fallgitter aus schwarzem Mark-Eisen noch an seinen Ketten. Fackellicht auf nassem Stein, an den Wänden Kerbtafeln mit Sippenzeichen, und über dem Durchgang der Tisch der Zahlmeisterin, an dem jeder gezählt wird, bevor er eintritt.
- EN: The gatehouse of the old march, cut into the rampart, the portcullis of black march-iron still on its chains. Torchlight on wet stone, tally boards with clan marks along the walls, and above the passage the Tallymistress's table, where everyone is counted before they enter.
- Bild-Briefing: Enge, hohe Torkammer; Fallgitter halb hochgezogen; orangefarbenes Fackellicht, nasser Basalt, Ketten, Holztafeln voller Kerben und eingebrannter Zeichen; ein hohes Pult auf einer Empore über dem Durchgang. Farbwelt: Schwarz, Rost, Fackelorange, Pergament.

### § 4.2 `gk_room_2` · Die Zeughallen / The Armories

- DE: Die gewölbten Zeughallen der Mark, Pfeiler um Pfeiler, voll von dem, was das Reach zurückließ: Pikenständer, Ballisten auf ihren Lafetten, Banner der Mark mit Goblinzeichen übermalt. Schmiedeglut und Fett auf Eisen, Licht aus Kohlebecken, alles geölt, alles gezählt, nichts davon den Goblins gehörig und alles in ihrer Hand.
- EN: The vaulted armories of the march, pillar after pillar, full of what the Reach left behind: racks of pikes, ballistae on their carriages, banners of the march painted over with goblin marks. Forge glow and grease on iron, light from coal braziers, everything oiled and everything counted, none of it the goblins' own and all of it in their hands.
- Bild-Briefing: Lange Tonnengewölbe-Halle; Ballisten in Reihe, Pikenständer, Schildstapel, Fässer mit Bolzen; rot-braune Banner der Mark mit grob übermalten Zeichen; Kohlebecken als Lichtquelle, Schmiedeglut im Hintergrund. Farbwelt: Dunkelstahl, Rost, Öl, Mark-Rotbraun, Glutorange.

### § 4.3 `gk_room_3` · Die Bestiengruben / The Beast Pits

- DE: Die alten Zwinger der Mark, tief unter dem Wall, zu Gruben erweitert und mit Eisengittern überdeckt. Fackeln in Käfigen, Stroh, Ketten und Knochen, und unter den Gittern atmet etwas, das zu groß für einen Zwinger gezüchtet wurde.
- EN: The old kennels of the march, deep beneath the rampart, widened into pits and roofed with iron grates. Caged torches, straw, chains and bone, and under the grates something breathes that was bred too large for a kennel.
- Bild-Briefing: Tiefer Gewölbekeller, Boden mit Gittern über schwarzen Gruben, Ketten von der Decke, Stroh und Knochen, Fackeln hinter Eisengittern; Fleischhaken, Trog, Kratzspuren im Stein. Farbwelt: Knochenweiß, Blutbraun, Eisen, wenig Licht.

### § 4.4 `gk_room_4` · Das Heiligtum des geliehenen Feuers / The Shrine of the Borrowed Fire

- DE: Die Torkapelle der Mark, einst Vhel geweiht, der Torhüterin; wo ihr Bildnis stand, brennt jetzt in einem Becken aus Götzeneisen das geliehene Feuer. Es ist bleich, wirft keinen Rauch, und die Schatten im Raum bewegen sich nicht mit ihm; an den schwarzen Wänden sind die Namen der Sippen eingebrannt, Zeile um Zeile, wie Posten.
- EN: The gate chapel of the march, once consecrated to Vhel the Gatekeeper; where her image stood, the borrowed fire now burns in a basin of god-iron. It is pale, gives no smoke, and the shadows in the room do not move with it; on the black walls the names of the clans are burned in, line by line, like entries.
- Bild-Briefing: Kleine, hohe Kapelle mit leerem Bildnis-Sockel; darauf ein schwarzes Becken aus Götzeneisen mit bleicher, fast weißer, rauchloser Flamme; die Schatten der Säulen hart und unbewegt; Wände rußschwarz mit eingebrannten Zeichenreihen. Farbwelt: Schwarz, Asche, Weißfeuer, Götzeneisen. Das Feuer ist die einzige Lichtquelle.

### § 4.5 `gk_room_5` · Der Erbthron / The Heir's Throne

- DE: Die Befehlshalle der Mark, hoch und kalt, die Fenster mit Schilden verschlossen. Der Thron ist aus der Lafette einer Ballista und dem Torbeschlag der Mark gezimmert, davor die Kronwache in Mark-Platte, über allem die Banner, und zwei Feuer im Raum: die Kohle des Zeugmeisters und das bleiche Feuer aus dem Heiligtum, das keinen Schatten rührt.
- EN: The command hall of the march, high and cold, its windows shuttered with shields. The throne is built from a ballista's carriage and the gate-iron of the march, the Crownguard in march-plate before it, the banners above everything, and two fires in the room: the Quartermaster's coal and the pale fire from the shrine, which moves no shadow.
- Bild-Briefing: Große Halle mit Schilden vor den Fenstern; Thron aus Ballisten-Lafette und schwarzem Torbeschlag auf einem Podest; Bannerreihen der Mark mit dem Zeichen des Erben; links Kohlebecken (orange), rechts ein Becken mit bleichem Feuer (weiß); auf dem Boden Spuren schwerer Stiefel. Farbwelt: Schwarz, Mark-Rotbraun, Kohle, Weißfeuer, kaltes Grau.

---

## § 5 Die Bosse

Je Boss: Name, Herkunft/Rolle (Bestiarium-tauglich), Intro-Zeile (gesprochen, in der Atempause), Phasen-Ansagen (Erzähl-/Log-Stimme, kurz). Mechaniken aus Goal R5; Phasen-Namen sind Vorschlag. Aussehen: Porträt `npc_<id>.png` (Kopf/Schulter, transparent) und Kampf-Art `<id>.png` (Ganzkörper, Blick nach links, transparent). Alle Goblins etwa 1,50 m, drahtig; kein Glühen auf Ausrüstung, dezente Aura nur bei Zil'gaths Feuer.

### § 5.1 `gk_tallymistress` · Zahlmeisterin Vrikka / Tallymistress Vrikka

- **Herkunft** DE: Vrikka führt das Schuldbuch von Gobkha'raz: Jede Sippe, die das geliehene Feuer trägt, zahlt Zins, und der Zins wird in Trägern gezahlt, denn das Feuer verzehrt den, der es gibt. Wer im Rückstand ist, wird eingetrieben, sein Zeichen aus dem Buch gebrannt und seine Sippe in die Gruben oder an die Front geschickt; Vrikka hat nie gekämpft und nie verloren, weil in Gobkha'raz niemand gegen die Zahlen kämpft.
- **Herkunft** EN: Vrikka keeps the debt ledger of Gobkha'raz: every clan that carries the borrowed fire pays interest, and the interest is paid in bearers, because the fire consumes the one who gives it. Whoever falls behind is collected, their mark burned out of the book and their clan sent to the pits or the front; Vrikka has never fought and never lost, because in Gobkha'raz nobody fights the numbers.
- **Intro** DE: „Sippe und Zeichen. Oder ich trage dich unter Verluste ein.“ · EN: "Clan and mark. Or I enter you under losses."
- **Phase 75 % · Das Schuldbuch / The Ledger** (Ward): DE: Die Zahlmeisterin schlägt das Schuldbuch auf. Die Zahlen stehen vor ihr. · EN: The Tallymistress opens the ledger. The numbers stand before her.
- **Phase 50 % · Zinseszins / Compound Interest** (alle 10 s schneller): DE: Zinseszins. Jede Zeile kommt schneller als die letzte. · EN: Compound interest. Every line comes faster than the last.
- **Phase 25 % · Eintreibung / Collection** (Wut + Blutung): DE: Eintreibung. Die Zahlmeisterin brennt dein Zeichen aus dem Buch. · EN: Collection. The Tallymistress burns your mark out of the book.
- **Aussehen → `npc_gk_tallymistress.png` / `gk_tallymistress.png`:** Alte Goblin-Frau, hager, moosgrüne Haut mit Altersflecken, das linke Auge milchig, das rechte scharf; graues Haar streng zurückgebunden, die Ohren mit Kerben wie ein Kerbholz. Langer Schreiber-Mantel aus der Uniform eines Mark-Zahlmeisters, Messingknöpfe, am Gürtel Schlüssel und Kerbhölzer. Signatur: das Schuldbuch an einer Kette am Handgelenk, Seitenränder versengt; in der anderen Hand ein Brenneisen. Farbwelt: Tintenschwarz, Pergament, Messing, Brandränder. Kampf-Art: stehend hinter einem hohen Pult, Buch aufgeschlagen, Pfandmesser im Gürtel.

### § 5.2 `gk_quartermaster` · Zeugmeister Krogg / Quartermaster Krogg

- **Herkunft** DE: Krogg hütet, was das Reach in der Mark zurückließ, und er kennt jedes Stück: welche Ballista welchen Bolzen nimmt, welcher Kürass für welchen Mann der Mark geschmiedet wurde. In Gobkha'raz gehört niemandem etwas, alles ist geliehen, auch das Eisen, und Krogg gibt es nur an Sippen aus, die im Schuldbuch sauber stehen.
- **Herkunft** EN: Krogg keeps what the Reach left behind in the march, and he knows every piece: which ballista takes which bolt, which cuirass was forged for which man of the march. In Gobkha'raz nobody owns anything, everything is lent, the iron too, and Krogg issues it only to clans that stand clean in the ledger.
- **Intro** DE: „Das ist Gerät der Mark. Es wird nicht angefasst. Es wird ausgegeben.“ · EN: "That is gear of the march. It is not touched. It is issued."
- **Phase 75 % · Mark-Panzer / March-Plate** (Rüstung hoch): DE: Der Zeugmeister schließt den Panzer der Mark. Das Eisen wurde für einen Größeren geschmiedet. Es hält trotzdem. · EN: The Quartermaster closes the march-plate. The iron was forged for someone taller. It holds all the same.
- **Phase 50 % · Ballistensalve / Ballista Volley** (jeder 4. Angriff ×3): DE: Ballistensalve. Der Zeugmeister zählt bis vier. · EN: Ballista volley. The Quartermaster counts to four.
- **Phase 25 % · Letzte Ausgabe / Last Issue** (Rüstung weg, Tempo +40 %): DE: Letzte Ausgabe. Der Zeugmeister wirft den Panzer ab und kommt schneller, als das Eisen es erlaubte. · EN: Last issue. The Quartermaster throws off the plate and comes faster than the iron allowed.
- **Aussehen → `npc_gk_quartermaster.png` / `gk_quartermaster.png`:** Breiter, narbiger Goblin, dunkelgrüne Haut, kurzer grauer Bart, ein Ohr zur Hälfte abgerissen. Mark-Kürass, auf sein Maß gekürzt, mit sichtbaren Nietenreihen der Änderung; schwere Lederschürze, Riemen mit Zangen und Schlüsseln. Signatur: ein Bündel Ballistenbolzen quer über dem Rücken. Farbwelt: Dunkelstahl, Rost, geöltes Leder, Mark-Rotbraun. Kampf-Art: Belagerungshammer in beiden Händen, Turmschild an den Rücken geschnallt.

### § 5.3 `gk_pitmother` · Grubenmutter Ushka / Pitmother Ushka

- **Herkunft** DE: Ushka züchtet in den alten Zwingern der Mark die Belagerungsbestien, aus den Kriegshunden, die das Reach zurückließ, und aus allem, was die Gruben seither gefressen haben; gefüttert wird mit den Eingetriebenen. Sie kämpft nicht ohne ihre Bestie, und die Bestie hat noch nie ohne sie gekämpft.
- **Herkunft** EN: In the old kennels of the march Ushka breeds the siege beasts, out of the war hounds the Reach left behind and everything the pits have eaten since; the feed is the collected. She does not fight without her beast, and the beast has never fought without her.
- **Intro** DE: „Still. Sie hat heute noch nicht gefressen.“ · EN: "Quiet. She has not eaten today."
- **Phase 75 % · Rudelruf / Pack Call** (Gift): DE: Rudelruf. Die Gruben antworten, und die Bisse tragen Gift. · EN: Pack call. The pits answer, and the bites carry venom.
- **Phase 50 % · Die Kette fällt / The Chain Falls** (Doppelangriffe + Blutung): DE: Die Kette fällt. Die Bestie beißt zweimal, und jeder Biss reißt. · EN: The chain falls. The beast bites twice, and every bite tears.
- **Phase 25 % · Mutterwut / Mother's Fury** (Wut + Heilung je Treffer): DE: Mutterwut. Ushka schlägt für ihre Bestie, und jeder Treffer nährt sie. · EN: Mother's fury. Ushka strikes for her beast, and every blow feeds her.
- **Aussehen → `npc_gk_pitmother.png` / `gk_pitmother.png`:** Gedrungene Goblin-Frau mit schweren Schultern, moosgrüne Haut, Unterarme voller alter Bissnarben; verfilzter Zopf mit Knochenringen. Dicke, benagelte Lederschürze über Fellwams, an der Hüfte Peitsche und Fleischhaken. Signatur: ein Eisenhalsband um den eigenen Hals, von dem eine Kette zur Bestie läuft. Kampf-Art (eine Einheit): Ushka links vorn, dahinter die Belagerungsbestie, Schulterhöhe über ihrem Kopf, fassbreiter Hundeleib, narbige Haut, Mark-Geschirr mit aufgenieteten Eisenplatten, eiserner Maulkorb halb geöffnet. Farbwelt: Knochen, Blutbraun, Eisen, schmutziges Stroh.

### § 5.4 `gk_felmagus` · Oberfelmagierin Zil'gath / High Fel-Magus Zil'gath

- **Herkunft** DE: Zil'gath hütet im Heiligtum das Leihfeuer, an dem jeder Felmagier der Bande sein eigenes entzündet; sie hat es vom Fremden selbst übernommen und nennt ihn bis heute den Gläubiger, nie den Herrn. Seit er wich, zahlt sie den Zins weiter in ein Feuer, von dem niemand mehr abholt, und sie hält den Kriegskönig für einen Schuldner, der sich für den Erben hält.
- **Herkunft** EN: In the shrine Zil'gath keeps the lent flame from which every fel magician of the warband lights his own; she received it from the Stranger himself and to this day calls him the Creditor, never the master. Since he withdrew she has kept paying interest into a fire nobody collects from, and she holds the War-King for a debtor who mistakes himself for the heir.
- **Intro** DE: „Du bringst Schatten mit, die sich bewegen. Hier drinnen tun sie das nicht.“ · EN: "You bring shadows that move. In here, they do not."
- **Phase 75 % · Felschild / Fel Shield** (Ward): DE: Die Oberfelmagierin hebt das geliehene Feuer zwischen sich und dich. · EN: The High Fel-Magus raises the borrowed fire between herself and you.
- **Phase 50 % · Brandopfer / Burnt Offering** (Brand auf dich, Feuerresistenz): DE: Brandopfer. Zil'gath zahlt den Zins mit deiner Haut, und ihr eigenes Feuer tut ihr nichts mehr. · EN: Burnt offering. Zil'gath pays the interest with your skin, and her own fire no longer touches her.
- **Phase 25 % · Der Gläubiger blickt her / The Creditor Looks This Way** (Schaden + stärkerer Brand): DE: Das Feuer wird heller, ohne dass jemand nachlegt. Der Gläubiger blickt her. · EN: The fire grows brighter with nobody feeding it. The Creditor is looking this way.
- **Aussehen → `npc_gk_felmagus.png` / `gk_felmagus.png`:** Hagere Goblin-Frau, dunkelgrüne Haut, Hände und Unterarme aschgrau bis über den Ellbogen (das Feuer verzehrt den, der es gibt), Augen bleich; Schädel kahl, die Kopfhaut von Brandnarben gezeichnet. Schwarze Priesterrobe, an Saum und Kragen mit dem grauen Gewand der alten Torkapelle unterlegt; am Finger fehlt der Ring (das Pfand). Signatur: ein Stab aus Götzeneisen mit einer Schale am Ende, darin die bleiche, rauchlose Flamme; dezente Aura erlaubt, das Feuer wirft keinen beweglichen Schatten. Farbwelt: Schwarz, Asche, Weißfeuer, Götzeneisen. Kampf-Art: aufrecht, Stab vor sich, der Boden um sie ohne Schatten.

### § 5.5 `gk_warking` · Kriegskönig Rakkzul der Erbe / War-King Rakkzul the Heir

- **Herkunft** DE: Rakkzul stand über dem Kriegshäuptling, wie ein König über seinem Feldlager steht; als der Häuptling fiel, übernahm er dessen Schuld, und als der Gläubiger wich, erklärte er die Schuld für erloschen und das Feuer für sein Erbe. Er trägt eine Krone aus dem Torbeschlag der Mark, und er meint mit „Erbe“ beides: das Land, das man seinem Volk ließ, und das Feuer, das ihm niemand mehr abnehmen kann.
- **Herkunft** EN: Rakkzul stood above the Warchief the way a king stands above his field camp; when the Warchief fell he took over his debt, and when the Creditor withdrew he declared the debt extinguished and the fire his inheritance. He wears a crown hammered from the gate-iron of the march, and by "heir" he means both things: the land his people were left, and the fire nobody can take back from him.
- **Intro** DE: „Der Gläubiger ist fort. Was er verlieh, gehört jetzt dem, der es hält.“ · EN: "The Creditor is gone. What he lent belongs now to the one who holds it."
- **Phase 75 % · Das Schuldbuch des Königs / The King's Ledger** (Vorschlag: Vrikkas Ward): DE: Der Kriegskönig hebt das Schuldbuch. Vrikkas Zahlen stehen jetzt vor ihm. · EN: The War-King raises the ledger. Vrikka's numbers stand before him now.
- **Phase 50 % · Das Zeughaus des Königs / The King's Armory** (Vorschlag: Kroggs jeder 4. Angriff ×3): DE: Der Kriegskönig ruft die Zeughallen. Kroggs Eisen antwortet. · EN: The War-King calls on the armories. Krogg's iron answers.
- **Phase 25 % · Die Gruben des Königs / The King's Pits** (Vorschlag: Ushkas Doppelangriffe + Blutung): DE: Der Kriegskönig öffnet die Gruben. Was Ushka züchtete, gehorcht nur noch ihm. · EN: The War-King opens the pits. What Ushka bred answers only to him now.
- **Phase 10 % · Erbe des Krieges / Heir of War** (Wut; Vorschlag: dazu Zil'gaths Brand): DE: Erbe des Krieges. Rakkzul nimmt das geliehene Feuer in beide Hände, und niemand treibt es ein. · EN: Heir of war. Rakkzul takes the borrowed fire in both hands, and nobody comes to collect.
- **Aussehen → `npc_gk_warking.png` / `gk_warking.png`:** Goblin von etwa 1,50 m, aber breit wie ein Ork im Schulterbereich, dunkelgrüne Haut, schwerer Kiefer mit kurzen Hauern, ein Ohr glatt abgeschnitten. Krone aus schwarzem Torbeschlag der Mark, kantig, mit Scharnieren und Nieten, kein Schmuckstein. Kommandanten-Platte der Mark, auf sein Maß umgeschmiedet, darüber der rotbraune Feldmantel der Mark; um den Hals an einer Kette das Kriegsbanden-Siegel, größer als das der Offiziere. Signatur: die Erbklinge, ein Großschwert der Mark, länger als er selbst, mit beiden Händen geführt. Farbwelt: Schwarzes Eisen, Mark-Rotbraun, Dunkelgrün, kaltes Grau; kein Glühen, das bleiche Feuer nur als Reflex auf der Klinge. Kampf-Art: breiter Stand vor dem Thron, Schwert gesenkt, Blick nach links.

---

## § 6 Wellen-Gegner (Name, Bestiarium-Satz, Aussehen)

Bildregeln: Monster-Format wie Bestand, Blick nach links, echtes Alpha, kein Glühen auf Ausrüstung. Alle Goblins etwa 1,50 m, die Ausrüstung ist Mark-Gerät auf ihr Maß gekürzt, sauber und gefährlich, keine Lumpen.

| ID | Name DE / EN | Bestiarium DE | Bestiarium EN | Aussehen (ein Satz) |
|---|---|---|---|---|
| `gk_toll_thug` | Zollknecht / Toll Enforcer | Treibt am Zolltor ein, was das Schuldbuch verlangt, mit Knüppel und Kerbholz. | Collects at the Toll Gate what the ledger demands, with cudgel and tally stick. | Stämmiger Goblin in genietetem Lederkoller der Mark-Torwache, Eisenknüppel in der Rechten, ein Bündel Kerbhölzer am Gürtel, Augen auf Zählen gestellt. |
| `gk_gate_pikeman` | Torpikenier / Gate Pikeman | Hält den Durchgang mit einer Pike der Mark, die länger ist als drei Goblins. | Holds the passage with a pike of the march, longer than three goblins. | Schlanker Goblin in Kettenhemd und Mark-Helm mit Nasal, die Pike quer, der Schaft hinten abgesägt, um sie führen zu können. |
| `gk_armory_breaker` | Zeughausbrecher / Armory Breaker | Trägt den Vorschlaghammer des Zeughauses und braucht keine Tür, nur eine Wand. | Carries the armory's sledge and needs no door, only a wall. | Breiter Goblin ohne Helm, Schmiedeschürze über Brustplatte, Vorschlaghammer geschultert, Arme von Funkennarben gesprenkelt. |
| `gk_ballista_gunner` | Ballistenschütze / Ballista Gunner | Ein Goblin an einer Ballista der Mark, die für sechs Männer gebaut wurde; es reicht, dass er den Hebel erreicht. | One goblin at a ballista of the march built for a crew of six; it is enough that he reaches the lever. | Goblin mit Lederkappe und Augenschirm, eine Handballista der Mark im Anschlag, Bolzenköcher auf dem Rücken, Fettflecken an den Händen. |
| `gk_pit_hound` | Grubenhund / Pit Hound | Was in den Gruben nicht zur Belagerungsbestie taugt, wird Grubenhund; es ist der ungeduldigere Teil der Zucht. | What the pits do not raise into a siege beast becomes a pit hound; it is the less patient half of the breeding. | Hochbeiniger, sehniger Kriegshund mit narbigem kurzen Fell, Eisenhalsband mit abgerissener Kette, Lefzen zurückgezogen. |
| `gk_beastkeeper` | Bestienhüterin / Beastkeeper | Führt die Hunde an Ketten der Mark und lässt los, bevor du nah genug bist. | Leads the hounds on chains of the march and lets go before you are close enough. | Goblin-Frau in dicker Lederrüstung mit Bissspuren, zwei Ketten in der Faust, Peitsche am Gürtel, das Haar unter einem Tuch. |
| `gk_fel_acolyte` | Felakolyth / Fel Acolyte | Trägt das geliehene Feuer zum ersten Mal; die Hände sind schon grau bis zum Handgelenk. | Carries the borrowed fire for the first time; the hands are already grey to the wrist. | Junger Goblin in schwarzer Robe, Hände aschgrau bis zum Handgelenk, eine kleine bleiche Flamme in der offenen Hand, kein Rauch, kein beweglicher Schatten. |
| `gk_ember_warden` | Glutwächter / Ember Warden | Hält das Becken im Heiligtum, damit nie etwas hineinfällt und nie etwas hinauskommt. | Guards the basin in the shrine so that nothing falls in and nothing gets out. | Goblin in geschwärzter Mark-Platte mit Kapellenkragen, Hellebarde der Mark mit versengtem Schaft, Visier geschlossen. |
| `gk_crownguard` | Kronwächter / Crownguard | Die Garde des Kriegskönigs, in Mark-Platte, die auf Goblinmaß umgeschmiedet wurde; der Blutschwur gilt ihm, nicht der Bande. | The War-King's guard, in march-plate reforged to goblin measure; the blood oath is sworn to him, not to the warband. | Goblin in voller Mark-Platte mit dem Zeichen des Erben auf der Brust, Schwert und Rundschild, an der Handfläche des Schildarms eine Schwurnarbe. |
| `gk_bannerman` | Bannerträger / Bannerman | Trägt ein Banner der Mark mit dem Zeichen des Erben übermalt und hält es, bis er fällt; danach hält es ein anderer. | Carries a banner of the march painted over with the Heir's mark and holds it until he falls; after that, another holds it. | Goblin in Halbplatte, ein rotbraunes Mark-Banner mit übermaltem Zeichen an einer Stange, Kurzschwert gezogen, Stange in den Boden gestemmt. |

---

## § 7 Die drei Raid-Sets

Mechanik aus Goal R7 (aufbauen, dann einlösen). Set-Stufen: 2 / 4 / 5 Teile. Teile je Boss: Raum 1 Hände, Raum 2 Schuhe, Raum 3 Hose, Raum 4 Kopf, Raum 5 Brust.

### § 7.1 `gk_fire` · Ornat des geliehenen Feuers / Regalia of the Borrowed Fire (Magie, Stoff)

- **Set-Satz** DE: Gewebt für die, die das Feuer tragen und wissen, was es kostet; den Zins zahlt das Ziel. · EN: Woven for those who carry the fire and know what it costs; the interest is paid by the target.
- **Stufen:** 2 Teile **Geliehene Glut / Borrowed Ember** (+Brandschaden, Brand hält länger) · 4 Teile **Zinsfeuer / Compounding Fire** (je Sekunde Brand mehr Zauberschaden, verfällt mit dem Brand) · 5 Teile **Eintreibung / Collection** (jeder 5. Zauber lässt den Brand detonieren und neu entzünden).
- `gk_fire_head` Kapuze des geliehenen Feuers / Hood of the Borrowed Fire: DE: Der Saum ist versengt. Der Kopf darunter war es nie. · EN: The hem is singed. The head beneath it never was.
- `gk_fire_chest` Robe des geliehenen Feuers / Robe of the Borrowed Fire: DE: Schwarzer Stoff aus dem Heiligtum, mit Sippenzeichen bestickt, die alle beglichen sind. · EN: Black cloth from the shrine, embroidered with clan marks, all of them settled.
- `gk_fire_legs` Beinkleid des geliehenen Feuers / Leggings of the Borrowed Fire: DE: Wer das Feuer trägt, geht nicht schnell. Er muss es auch nicht. · EN: Whoever carries the fire does not walk fast. Nor needs to.
- `gk_fire_feet` Schuhe des geliehenen Feuers / Shoes of the Borrowed Fire: DE: Die Asche im Heiligtum ist warm. Die Sohlen wissen es. · EN: The ash in the shrine is warm. The soles know it.
- `gk_fire_hands` Handwickel des geliehenen Feuers / Handwraps of the Borrowed Fire: DE: Gewickelt bis zum Ellbogen, damit niemand sieht, wie weit das Grau schon reicht. · EN: Wrapped to the elbow, so nobody sees how far the grey has climbed.

### § 7.2 `gk_poison` · Pirschgewand der Grubenmeute / Pitpack Stalker's Garb (Fernkampf, Leder)

- **Set-Satz** DE: Leder aus den Gruben, nach dem Rudel geschnitten: Es riecht nach Hund, und das Gift darin ist kein Zufall. · EN: Leather from the pits, cut to the pack's pattern: it smells of hound, and the venom in it is no accident.
- **Stufen:** 2 Teile **Grubengift / Pit Venom** (+Giftschaden) · 4 Teile **Schleichende Seuche / Creeping Blight** (Gift stapelt bis 8, je Stapel Rüstung ignoriert) · 5 Teile **Ausbruch / Rupture** (volle Stapel platzen, Abklingzeit).
- `gk_poison_head` Kapuze der Grubenmeute / Hood of the Pitpack: DE: Die Kapuze sitzt tief. Die Meute jagt mit der Nase. · EN: The hood sits low. The pack hunts by nose.
- `gk_poison_chest` Wams der Grubenmeute / Jerkin of the Pitpack: DE: Vernäht aus Grubenleder, die Nähte aus Sehne, die Taschen nach Giftdrüsen bemessen. · EN: Stitched from pit leather, the seams in sinew, the pouches sized for venom glands.
- `gk_poison_legs` Beinschienen der Grubenmeute / Leggings of the Pitpack: DE: Geschnitten zum Pirschen zwischen Gittern. Die Knie sind doppelt. · EN: Cut for stalking between grates. The knees are doubled.
- `gk_poison_feet` Stiefel der Grubenmeute / Boots of the Pitpack: DE: Die Sohlen sind weich; in den Gruben hört man jeden Schritt, der keiner Pfote gehört. · EN: The soles are soft; in the pits every step that is not a paw is heard.
- `gk_poison_hands` Handschuhe der Grubenmeute / Gloves of the Pitpack: DE: Die Fingerspitzen sind offen, damit man die Sehne spürt und das Gift nicht. · EN: The fingertips are open, so the string is felt and the venom is not.

### § 7.3 `gk_bleed` · Blutschwur der Kronwache / Bloodoath of the Crownguard (Nahkampf, Platte)

- **Set-Satz** DE: Mark-Platte aus den Zeughallen, der Blutschwur der Kronwache in die Innenseite geschlagen; wer sie trägt, hat ihn nie geleistet, und sie hält trotzdem. · EN: March-plate from the armories, the Crownguard's blood oath struck into the inside; whoever wears it never swore it, and it holds all the same.
- **Stufen:** 2 Teile **Geschworene Klinge / Sworn Blade** (+Blutungsschaden) · 4 Teile **Offene Wunden / Open Wounds** (Blutung stapelt bis 3, je Stapel Kritschaden) · 5 Teile **Blutzoll / Blood Toll** (drei Stapel reißen auf, Restschaden sofort, Heilung, Abklingzeit).
- `gk_bleed_head` Helm der Kronwache / Helm of the Crownguard: DE: Das Visier ist eng. Die Kronwache sieht nur, was vor ihr steht. · EN: The visor is narrow. The Crownguard sees only what stands before it.
- `gk_bleed_chest` Kürass der Kronwache / Cuirass of the Crownguard: DE: Innen der Schwur, außen das Zeichen des Erben über dem Wappen der Mark. · EN: The oath inside, the Heir's mark outside over the crest of the march.
- `gk_bleed_legs` Beinschienen der Kronwache / Greaves of the Crownguard: DE: Die Schienen wurden dreimal gekürzt. Die Dellen stammen von vorher. · EN: The greaves were shortened three times. The dents are from before.
- `gk_bleed_feet` Panzerstiefel der Kronwache / Sabatons of the Crownguard: DE: Schwer genug, dass der Boden des Erbthrons Spuren trägt. · EN: Heavy enough that the floor of the Heir's Throne bears marks.
- `gk_bleed_hands` Panzerhandschuhe der Kronwache / Gauntlets of the Crownguard: DE: Der Schwur wird mit der offenen Hand geleistet und mit der geschlossenen gehalten. · EN: The oath is sworn with the open hand and kept with the closed one.

---

## § 8 Unikate (Tooltip-Flavor, ein Satz)

### Vrikka
- `gk_tally_dagger` Pfandmesser / Pledge Knife (Dolch): DE: Mit diesem Messer nimmt die Zahlmeisterin das Pfand; es schneidet, was man nicht freiwillig gibt. · EN: With this knife the Tallymistress takes the pledge; it cuts what is not given willingly.
- `gk_tally_focus` Das Schuldbuch / The Debt Ledger (Fokus): DE: Jede Seite ein Posten, jeder Posten eine Sippe; die verbrannten Ränder sind die beglichenen. · EN: Every page an entry, every entry a clan; the burned edges are the settled ones.
- `gk_tally_ring` Siegelring des Zolls / Toll Signet (Ring): DE: Wer dieses Siegel trägt, zahlt am Zolltor nicht. Er wird bezahlt. · EN: Whoever wears this seal does not pay at the Toll Gate. They are paid.

### Krogg
- `gk_quarter_maul` Belagerungshammer / Siege Maul (Zweihand-Hammer): DE: Der Hammer, mit dem die Mark ihre Tore verkeilte und die Goblins sie öffneten. · EN: The maul with which the march wedged its gates shut and the goblins opened them.
- `gk_quarter_shield` Turmschild der verlorenen Mark / Tower Shield of the Lost March (Schild): DE: Das Wappen der Mark ist noch darunter. Krogg ließ es übermalen, nicht abschleifen. · EN: The crest of the march is still beneath. Krogg had it painted over, not ground off.
- `gk_quarter_quiver` Köcher des Zeugmeisters / Quartermaster's Quiver (Köcher): DE: Jeder Pfeil darin ist gezählt, und Krogg will sie zurück. · EN: Every arrow in it is counted, and Krogg wants them back.

### Ushka
- `gk_pit_longbow` Rudelruf / Packcall (Langbogen, Gift): DE: Die Sehne summt wie ein Pfiff; was aus den Gruben antwortet, trägt Gift. · EN: The string hums like a whistle; what answers from the pits carries venom.
- `gk_pit_scimitar` Grubenzahn / Pit Fang (Krummsäbel): DE: Die Klinge ist nach dem Zahn der ersten Bestie geschmiedet, die Ushka aufzog; sie reißt, statt zu schneiden. · EN: The blade is forged after the fang of the first beast Ushka raised; it tears rather than cuts.
- `gk_pit_amulet` Halsband der Grubenmutter / Pitmother's Collar (Amulett): DE: Ushkas eigenes Halsband aus den Gruben; wer es trägt, gehört zum Rudel, ob er will oder nicht. · EN: Ushka's own collar from the pits; whoever wears it belongs to the pack, willing or not.

### Zil'gath
- `gk_fel_staff` Stab des geliehenen Feuers / Staff of the Borrowed Fire (Stab, Brand): DE: Die Flamme am Ende wirft keinen Rauch und keinen Schatten. Sie wurde nie zurückgegeben. · EN: The flame at its tip gives no smoke and no shadow. It was never returned.
- `gk_fel_wand` Glutzunge / Embertongue (Zauberstab): DE: Ein Span aus Götzeneisen, an dem das Leihfeuer leckt; er spricht nur in Brand. · EN: A sliver of god-iron the lent flame licks at; it speaks only in fire.
- `gk_fel_ring` Ring des Gläubigers / Ring of the Creditor (Ring): DE: Zil'gath trug ihn als Pfand für das Feuer. Der Gläubiger kam nie, ihn abzuholen. · EN: Zil'gath wore it as the pledge for the fire. The Creditor never came to collect it.

### Rakkzul
- `gk_king_greatsword` Erbklinge / Heirblade (Großschwert, Blutung): DE: Das Schwert des letzten Hauptmanns der Mark, von einem Goblin mit beiden Händen geführt. Es hat sich nie beschwert. · EN: The sword of the last captain of the march, carried two-handed by a goblin. It has never complained.
- `gk_king_shortbow` Kronbogen des Erben / Crownbow of the Heir (Kurzbogen): DE: Kurz genug für einen Goblin, hart genug für die Mark; Rakkzul schoss damit, bevor er saß. · EN: Short enough for a goblin, hard enough for the march; Rakkzul shot with it before he sat a throne.
- `gk_king_scepter` Thronszepter / Throne Scepter (Szepter): DE: Aus dem Torbeschlag der Mark geschmiedet wie die Krone; es hat mehr Befehle gegeben als sie. · EN: Forged from the gate-iron of the march like the crown; it has given more orders than the crown has.
- `gk_king_cape` Mantel des Erben / Mantle of the Heir (Umhang): DE: Der Feldmantel der Mark, gekürzt auf seinen neuen Träger; der Saum wurde nie gewaschen. · EN: The field cloak of the march, shortened for its new wearer; the hem was never washed.

---

## § 9 Wochen-Modifikatoren (Name + ein Satz; Wirkungen in Goal R8)

| ID | DE | EN |
|---|---|---|
| `payday` | **Zahltag.** Am Zahltag ist das Tor billiger und die Hallen voller: Jede Sippe steht an, um zu zahlen. | **Payday.** On payday the gate is cheaper and the halls fuller: every clan lines up to pay. |
| `borrowed_fire` | **Geliehenes Feuer.** Das Heiligtum hat diese Woche weit ausgeliehen; jede Klinge brennt, auch deine. | **Borrowed Fire.** The shrine has lent widely this week; every blade burns, yours included. |
| `war_drums` | **Kriegstrommeln.** Der Kriegskönig lässt trommeln, und Gobkha'raz schlägt im Takt. | **War Drums.** The War-King has the drums beaten, and Gobkha'raz strikes to the beat. |
| `beast_hunger` | **Bestienhunger.** Die Gruben wurden nicht gefüttert; was dich trifft, frisst mit. | **Beast Hunger.** The pits have not been fed; whatever hits you feeds on it. |
| `open_armory` | **Offenes Zeughaus.** Krogg gibt die Mark-Platte an jeden aus; Eisen auf allen, und jeder Spalt darin zählt doppelt. | **Open Armory.** Krogg issues march-plate to everyone; iron on all of them, and every gap in it counts double. |
| `poison_kitchen` | **Giftküche.** Die Bestienhüterinnen haben die Klingen in den Gruben getränkt, und was einmal vergiftet ist, bleibt es länger. | **Poison Kitchen.** The beastkeepers have steeped the blades in the pits, and what is poisoned stays poisoned longer. |
| `blood_feast` | **Blutfest.** Die Kronwache erneuert den Schwur; die Wunden dieser Woche schließen sich langsam, auf beiden Seiten. | **Blood Feast.** The Crownguard renews the oath; this week's wounds close slowly, on both sides. |
| `silent_halls` | **Stille Hallen.** Keine Trommel, kein Zahltag, kein Fest. Gobkha'raz wartet, wie es ist. | **Silent Halls.** No drum, no payday, no feast. Gobkha'raz waits, as it is. |

---

## § 10 Reliktstaub / Relic Dust (`relic_dust`)

- **name** DE: Reliktstaub · EN: Relic Dust
- **description** DE: Was von einem Fundstück bleibt, wenn man ihm das Eisen nimmt: Staub, der sich erinnert, wofür er geschmiedet wurde. · EN: What remains of a found piece when the iron is taken from it: dust that remembers what it was forged for.

---

## § 11 Rast-Bildschirm

Kopfzeile bleibt: **„Du rastest.“ / „You are resting.“** Darunter je Raum eine Zeile, nach dem Boss.

| Nach | DE | EN |
|---|---|---|
| Raum 1 (Vrikka) | Das Schuldbuch liegt offen. Niemand zählt mehr, wer eintritt. | The ledger lies open. Nobody counts who enters any more. |
| Raum 2 (Krogg) | Die Zeughallen sind still. Das Eisen der Mark hat einen neuen Hüter, vorerst dich. | The armories are quiet. The iron of the march has a new keeper, for now you. |
| Raum 3 (Ushka) | Die Gruben sind leer. Was darin atmete, atmet nicht mehr. | The pits are empty. What breathed in them breathes no more. |
| Raum 4 (Zil'gath) | Das bleiche Feuer brennt weiter, ohne Hüterin. Dein Schatten bewegt sich. Das ist gut so. | The pale fire still burns, without its keeper. Your shadow moves. That is as it should be. |
| Raum 5 (Rakkzul) | Der Thron ist leer, die Krone liegt daneben. Gobkha'raz ist still, bis die nächste Sippe kommt. | The throne is empty, the crown beside it. Gobkha'raz is quiet, until the next clan comes. |

---

## § 12 Glossar-Nachtrag (nach Gate L in `weltlore-grim-reach.md` § 9 einpflegen)

| Deutsch | Englisch | Bedeutung |
|---|---|---|
| Gobkha'raz | Gobkha'raz | Verborgene Hauptstadt der Goblins in der Kernfeste der alten Mark; Raid `gobkharaz` |
| Die Hallen von Gobkha'raz | Halls of Gobkha'raz | Raid-Name |
| Der Gläubiger | The Creditor | Goblin-Name für den Fremden/Drazhan; die Goblins kennen keinen anderen |
| Das Schuldbuch | The Debt Ledger | Vrikkas Buch; jede Sippe zahlt Zins auf das geliehene Feuer, in Trägern |
| Eintreibung | Collection | Das Ausbrennen einer säumigen Sippe aus dem Buch; auch Vrikkas dritte Phase und Set-Stufe 5 des Ornats |
| Das Leihfeuer | The Lent Flame | Die Ursprungsflamme im Becken aus Götzeneisen, an der alle Felmagier ihr Feuer entzünden; bleich, rauchlos, rührt keinen Schatten |
| Die Kernfeste | The Keep (of the march) | Die nicht gesprengte Festung unter dem Wall; ihr Reach-Name wird nicht mehr geführt |
| Zahlmeisterin Vrikka · Zeugmeister Krogg · Grubenmutter Ushka · Oberfelmagierin Zil'gath · Kriegskönig Rakkzul der Erbe | Tallymistress Vrikka · Quartermaster Krogg · Pitmother Ushka · High Fel-Magus Zil'gath · War-King Rakkzul the Heir | Die fünf Bosse (§ 5) |
| Die Kronwache | The Crownguard | Garde des Kriegskönigs; Einheit `gk_crownguard`, Set `gk_bleed` |
| Die Grubenmeute | The Pitpack | Ushkas Zucht (Grubenhunde und Belagerungsbestien); Set `gk_poison` |
| Das Kerbholz | The Tally Stick | Die Brücke: Gläubigerhälfte unter Drazhans zurückgelassenen Schätzen, Schuldnerhälfte in Vrikkas Buch |
| Reliktstaub | Relic Dust | Bergungsrest aus gedroppter Ausrüstung; nur für hohe Verzauberungsrunen |
