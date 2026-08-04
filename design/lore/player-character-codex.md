# Spieler-Charakter-Codex — Grim Reach

**Status:** v2.0 (Lore-Dev, 2026-07-19) — Chef-Auftrag 18.07.: 25 Spieler-Charakter-Designs (je M+F = 50 Bilder) als lore-verankerte Prompt-Liste. **Die vier neuen Völker (§ 2.5–2.8) warten auf Chef-Freigabe;** die Bibel (`weltlore-grim-reach.md` § 3.4, § 9) wird erst nach GO nachgezogen. Die Prompt-Datei liegt unter `design/chatgpt-prompts-player-chars-2026-07-18.txt`. *v1.1 nach Chef-Feedback: Rüstungen/Kleidung sind freie Fantasie-Designs im Grim-Reach-Ton (nicht mehr an Item-Sets angelehnt), Kämpfer stehen kampfbereit-ruhig statt mitten im Angriff; Dossiers und Übersicht entsprechend angepasst. v1.2 (Chef-Nachschlag): alle 25 Slugs lore-eigen neu benannt, ohne jeden Bezug zu Material-Tiers; letzte Materialwort-Reste aus den Texten entfernt. v2.0 (Chef-Auftrag 19.07.): Umbau auf RASSEN-GALERIEN — neue Prompt-Datei `design/chatgpt-prompts-player-races-2026-07-19.txt` (196 Bilder: 16 T-Pose-Volksreferenzen + 8 Galerien; Menschen 20 Designs, jedes andere Volk 10, je m+f). § 2 trägt jetzt je Volk ein VERBINDLICHES VISUELLES PROFIL (CEO-Vorgabe, wörtliche Basis aller Prompts); Rakhari auf Tiger-Menschen umgebaut, Goblin-Größe fixiert (~1,5 m), Duvra-Größe präzisiert (~1,4–1,5 m, fassbreit), Faryn ohne Spitzohren und mit fast weißer Haut. Die 25 abgenommenen v4-Designs sind unverändert in die Galerien übernommen.*
**Kanon-Quellen:** `packages/content/src/index.ts` (Ausrüstungs-Tiers, Skills, Monster), `design/lore/weltlore-grim-reach.md` (v3 KANON: § 1 Kosmologie, § 3.4 Völker, § 3.5–3.6 Figuren, § 4 Zonen), `design/lore/slayer-tower-lore.md`.
**Regeln:** Das ausgelieferte Spiel ist Kanon; nichts Geliefertes wird umbenannt. Keine Zahlen, keine Mechanik. Natürliche Prosa, höchstens ein Gedankenstrich pro Text. Spieler-Charaktere tragen **keine Kanon-Namen**: Der Spieler ist der Namenlose, die Chronik kennt seinen Namen nicht, also benennen die Dossiers Archetypen, keine Personen. Die Chef-Direktive „jede benannte Figur bekommt eine Aussehens-Spec" gilt hier sinngemäß: Datei → Dossier (dieses Dokument) → generierfertiger Prompt (Prompt-Datei).

---

## § 1 Grundsatz: Der Namenlose und die Völker

Die Glutfeste fragt nicht nach Herkunft, sie fragt nach Händen (Bibel § 3.2). Genau darum kann der Namenlose aus jedem freien Volk des Reachs stammen: Die Chronik verzeichnet Taten, keine Blutlinien, und der Wächter hat nie notiert, welche Ohren, Schuppen oder Hauer der Eintrag trug. Kein spielbares Volk berührt die Dramaturgie der Aschechronik; die Enthüllung, das Finale und der Epilog funktionieren wortgleich für jedes Gesicht. Einzige harte Grenze: Kein spielbares Volk gehört zu den Dienern. Wer am Tor der Glutfeste steht, steht gegen sie.

Die Bibel hält in § 3.4 ausdrücklich Plätze frei („Die Schriften nennen Völker, die noch niemand in der Glutfeste gesehen hat"). Dieser Codex besetzt vier dieser Plätze und rührt die bestehenden Völker nicht an.

## § 2 Die spielbaren Völker

### § 2.1 Menschen (Humans) — Bestand

Das Volk des Reachs und die meisten Gesichter der Glutfeste: Bauern, Jäger, Grabwächter-Erben, Schmiede, Schreiber. Fürs Artwork gilt die Farbwelt der Bibel: wettergegerbt, praktisch, erdige Töne, nichts Höfisches.

**Visuelles Profil (verbindlich, CEO 19.07.):** ~1,70–1,90 m; die Referenz-Anatomie des Rosters; wettergegerbte Gesichter, sichtbare Narben-Kultur, volles Spektrum an Haut- und Haartönen; das „Normal", an dem alle anderen Völker lesbar werden.

### § 2.2 Orks (Orcs) — Bestand

Sippenvolk aus den überrannten Ländern, seit Generationen Flüchtlinge und längst Mitbauer des Walls. Eisenkundig, wortkarg, unbestechlich in Handwerksfragen (Bibel § 3.4; Urga Schlackenfaust führt ihre Kunst weiter). **Visuelles Profil (verbindlich, CEO 19.07.):** ~2,10 m, massiv; dunkelolive bis graugrüne Haut; sichtbare untere Hauer; breiter Kiefer, flache Nase, schwere Braue; Kriegszöpfe oder geschorene Muster; Narben als Ehrenzeichen. Kleidung zweckmäßig, viel Leder und Eisen. Die Größe steht in jedem Prompt.

### § 2.3 Rakhari (the Rakhari) — Bestand

Tiger-Menschen der verbrannten Karawanenheimat; sie retteten, was Karawanen retten: Saatgut, Riten, Geduld (Bibel § 3.4; Shairi Mondfell).

**Visuelles Profil (verbindlich, CEO-UMBAU 19.07.):** ~1,90 m, athletisch aufrecht; menschliche Statur und Haltung; kräftiger, fast menschlicher Gesichtsschnitt mit kurzer breiter Raubtiernase und markantem Kiefer — der Kopf bleibt nah am Menschen, nie klein und niedlich; gestreiftes Fell (sand/rost mit dunklen Tigerstreifen; seltene dunkle Varianten), kleine runde Ohren hoch am Kopf, angedeutete Reißzähne, gold-bernsteinfarbene Tigeraugen mit runden Pupillen, kräftige Hände mit Krallen, langer Tigerschwanz; Raubtier-Grazie mit Gewicht. Frühere weichere Merkmalsbeschreibungen sind hiermit ersetzt.

### § 2.4 Goblins (Goblins) — Bestand, spielbar nur als Freie

Auch ein Volk, kein schönes Kapitel, aber ein ehrliches (Bibel § 3.4). Spielbare Goblins sind **Abtrünnige und freie Sippen** wie Mux: Leute, die das geliehene Feuer ausschlugen und deren Namen die Kriegsbande als tot führt. **Visuelles Profil (verbindlich, CEO 19.07.):** ~1,50 m — deutlich kleiner als Menschen, der Kopf auf Brusthöhe eines Menschen; die Größe steht in jedem Prompt. Drahtig-sehnig; moosgrüne bis dunkelgrüne Haut; große bewegliche spitze Ohren; scharfe Züge, spitze Zähne; lange flinke Finger; Kleidung der Freien: zusammengetragen, aber erstaunlich funktional und gut gearbeitet — nie ärmlich-albern.

### § 2.5 NEU: Die Duvra (the Duvra) — das Tiefenvolk

- **Name:** die Duvra (Einzahl und Mehrzahl gleich); EN: the Duvra.
- **Herkunft im Kanon:** Die Duvra wohnten unter dem Reach, in Tiefenhallen entlang der großen Erzadern, und ihre Flöze reichten bis unter die spätere Schlackengrube. Als man zu tief grub und die Adern öffnete, in denen die Kälte der Leere wohnt (Bibel § 4.8), froren ihre Hallen von innen zu. Die Überlebenden stiegen in ein Licht hinauf, das sie nur aus Liedern kannten. Ein Schatten liegt auf ihrer Erinnerung: Auch Duvra-Hände waren unter den geführten Händen, die den eisernen Götzen gossen, und ihre Ältesten sprechen davon nur im Beichtton.
- **Verhältnis zu Glutfeste/Reach:** Sie kamen in kleinen Werkrotten und gruben ihre Quartiere halb in den Wall; Zeltdächern trauen sie nicht. An Urgas Esse gelten sie als die Einzigen, denen sie selten widerspricht.
- **Visuelles Profil (verbindlich, CEO 19.07.):** ~1,40–1,50 m, aber FASSBREIT — massige Gedrungenheit, klare Abgrenzung zum schmalen Goblin; die Größe steht in jedem Prompt. Graustichige Steinhaut mit dunkleren mineralischen Sprenkeln (Alleinstellungsmerkmal); breite flache Züge, tiefliegende dunkle Augen, schwere Brauen; dichtes dunkles Haar und Bärte mit Steinperlen/Eisenringen (Frauen bartlos, kunstvolle Flechten); Hände wie Schraubstöcke.
- **Kultur:** Bei den Duvra werden Schulden und Erzadern im selben Buch geführt; ein Versprechen hat einen Preis in Metall, sonst ist es keines. Sie singen unter Tage, weil das Lied die Richtung hält, und sie geben ihre Toten dem Stein zurück, in Nischen, die kein Fremder findet.

### § 2.6 NEU: Die Sesskar (the Sesskar) — das Salzvolk

- **Name:** die Sesskar; EN: the Sesskar.
- **Herkunft im Kanon:** Schuppenvolk der Watten und Flussmündungen, seit jeher dort zu Hause, wo das Reach in die See ausläuft. Mit den Flotten fuhren sie nicht: Ihre Alten lehrten, dass die See für Lebende kein Draußen hat, und die Gezeitenuntiefen (Bibel § 4.7) gaben ihnen recht. Als die Ertrunkenen ihre Watten abzulaufen begannen und der Gesang der Sirene die Reusen füllte statt der Fang, zogen sie flussaufwärts, Kahn um Kahn.
- **Verhältnis zu Glutfeste/Reach:** Sie stellen die Reusen und Fischzüge der Glutfeste und fahren die flachen Kähne, wo sich sonst niemand aufs Wasser traut. Der See tragen sie nichts nach; man flucht nicht auf ein Verzeichnis.
- **Visuelles Profil (verbindlich, CEO 19.07.):** ~1,80 m, schlank; feine graublaue bis salzgraue Schuppenhaut wie Haifischhaut (KEINE groben Echsenplatten), hellere Kehl- und Bauchseite; KEIN Haar — Flossenkämme an Schädel und Nacken, deren Linie so individuell ist wie ein Gesicht; Kiemenlinien seitlich am Hals; Nickhaut über bernsteinfarbenen Augen; leicht verlängerte Finger mit Schwimmhaut-Ansätzen. Schmuck aus Muschel, Knochen und geknoteter Schnur.
- **Kultur:** Die Sesskar führen den Gezeitenzähler, eine Knotenschnur, die Flut um Flut fortgeschrieben wird, und jede Familie hütet eine Namensschnur ihrer Ertrunkenen. Wer einen Namen hört, den die Sirene singt, knotet ihn nach; irgendwer muss es tun, und die Sesskar finden, das stünde auch in Nereths Sinn.

### § 2.7 NEU: Die Aschgänger (the Ashwalkers) — die Kärrner der Toten

- **Name:** die Aschgänger; EN: the Ashwalkers.
- **Herkunft im Kanon:** Das Fuhrvolk des Ordens der Grabwächter. Generationen lang fuhren sie die Totenkarren von den Dörfern zur Krypta (Bibel § 4.5), lebten auf den Straßen der Aschfelder und begruben unterwegs, was liegen geblieben war. Als der Orden erlosch und das Begraben aus der Mode kam, blieben sie auf den grauen Straßen, weil es sonst niemand tat. Die Asche hat sie dafür gezeichnet, und sie tragen die Zeichnung ohne Klage.
- **Verhältnis zu Glutfeste/Reach:** Die Glutfeste vertraut ihnen an, was sonst niemand anfassen will, und Voss der Zähler achtet ihre Listen: Die Aschgänger führen Namensregister aller, die sie je begruben. Sie können durch das Grau der Aschfelder gehen, ohne zu erkranken.
- **Visuelles Profil (verbindlich, CEO 19.07.):** ~1,90 m, hager; blassgraue Haut mit dunklen Asche-Sprenkeln, besonders um Augen, Schläfen und Unterarme (es ist kein Staub, es wäscht sich nicht ab); natürlich dunkel geränderte Augen; früh weißes oder aschgraues Haar; sie wirken älter, als sie sind; ruhige, langsame Präsenz. Kleidung in Grau- und Knochentönen, praktisch; fast jeder trägt ein kleines eisernes Spaten-Amulett oder eine Grabmarke.
- **Kultur:** Aschgänger begraben ordentlich, denn sie haben in den Sumpfirrlichtern gesehen, was aus dem Gegenteil wird. Man grüßt bei ihnen die Toten zuerst, dann die Lebenden, und wer laut durch das Grau geht, gilt als schlecht erzogen.

### § 2.8 NEU: Die Faryn (the Faryn) — das Klippenvolk

- **Name:** die Faryn; EN: the Faryn.
- **Herkunft im Kanon:** Das älteste Volk des Hochlands. Ihre Dörfer hingen in den Klippen unter Skorais sauberem Himmel, ihre Toten übergaben sie an den Grabklippen dem Wind (der Klippengeist haust dort bis heute, Bibel § 4.9), und ihre Himmelsleser lasen Sterne, Winde und die dünnen Stellen des Schleiers, lange bevor unten jemand ein Wort dafür hatte. Sie sahen den Leerenroc als Erste. Dann hörte die Höhe auf, sauber zu sein, und die Faryn taten, was ihr Volk immer tat, wenn der Himmel sich ändert: Sie stiegen ab.
- **Verhältnis zu Glutfeste/Reach:** Wenige, leise, geachtet. Sie lesen der Glutfeste Wetter und Zugvögel, und ihre Seil- und Klippenkunst hängt an jedem Wachtstand des Walls. Zur Essenz-Kunst der Runen haben sie das älteste Verhältnis im Reach; sie nennen den Schleier schlicht das Tuch.
- **Visuelles Profil (verbindlich, CEO 19.07.):** ~2,00–2,10 m, windschlank-hager — das größte Volk; die Größe steht in jedem Prompt. Fast weiße Haut mit kühlem Unterton (ersetzt die frühere Bronze-Haut); lange schmale Gesichter, hohe scharfe Wangenknochen; weißes bis silbernes Haar, gern mit Knochen- oder Federringen (einer für jeden Toten, den man dem Wind gab); sehr helle Augen (eisgrau bis blass-violett); lange Finger; feine helle Windzeichen-Linien als traditionelle Tätowierung an Schläfen/Unterarmen. WICHTIG: gewöhnliche menschliche Ohren, KEINE Elfen-Spitzohren — die Abgrenzung sind Größe, Blässe und Windzeichen.
- **Kultur:** Faryn zählen Winde, wie andere Münzen zählen, und sprechen erst, wenn der Satz fertig ist. Ihre Trauer ist wortlos: ein Ring mehr im Haar, ein Blick mehr nach oben. Dass ihr Himmel nun eine Front ist, tragen sie mit dem Gleichmut von Leuten, die schon immer wussten, dass man dort oben nur Gast war.

## § 3 Die 25 Designs — Übersicht

**Hinweis v2.0:** Das Spieler-Roster ist auf Rassen-Galerien erweitert (Chef-Auftrag 19.07.): 16 T-Pose-Volksreferenzen (`ref_<rasse>_m/f.png`) plus 90 Designs (Menschen 20, jedes andere Volk 10; 196 Bilder gesamt) in `design/chatgpt-prompts-player-races-2026-07-19.txt`. Die folgende Übersicht dokumentiert die 25 abgenommenen v4-Kern-Designs; sie sind unverändert in die Galerien einsortiert (Rakhari-Designs aufs Tiger-Profil umgeschrieben, kleine/große Völker mit Größenanker in jedem Prompt).

Dateipaar je Design: `player_<volk>_<slug>_m.png` / `_f.png`. Kampf-Designs (K) stehen kampfbereit-ruhig (Waffe gezogen, aber nicht mitten im Angriff), Berufs-Designs (B) in ruhiger Arbeitshaltung. Rüstungen und Kleidung sind **freie Fantasie-Designs** im Grim-Reach-Ton (Chef-Freigabe 18.07.): dunkel, gedeckt, abgenutzt-glaubwürdig, matt, mit markanten Silhouetten und sichtbarer Volks-Identität; die Progressionsidee (schlicht bis prächtig über die 13 Kämpfer) bleibt. Die Optik-Spalte nennt das erfundene Design-Motiv, keine Item-Sets.

| Nr | Datei-Basis | Volk | Rolle | Optik-Motiv | Chroma |
|---|---|---|---|---|---|
| K1 | `player_human_sellsword` | Mensch | Kampf: Nahkampf früh | Geschwärzter Gambeson, Wolfsfell, Langschwert | Magenta |
| K2 | `player_orc_bulwark` | Ork | Kampf: Nahkampf mittel | Palisaden-Schulter, Torflügel-Schild | Magenta |
| K3 | `player_duvra_stonewarden` | Duvra | Kampf: Nahkampf gehoben | Steinquader-Panzer, Schlussstein-Helm | Grün |
| K4 | `player_rakhari_speardancer` | Rakhari | Kampf: Nahkampf hoch | Rote Lack-Lamellen, Ritenbänder | Grün |
| K5 | `player_human_thronewalker` | Mensch | Kampf: Nahkampf Endgame | Schwarze Chronik-Platte, Knochengrat-Helm | Magenta |
| K6 | `player_human_trapper` | Mensch | Kampf: Fernkampf früh | Jagdleder, Weidenwoll-Kragen | Magenta |
| K7 | `player_goblin_turncloak` | Goblin | Kampf: Fernkampf mittel | Beute-Flickwerk, Münzknöpfe | Magenta |
| K8 | `player_sesskar_saltarrow` | Sesskar | Kampf: Fernkampf gehoben | Schalenplatten-Küraß, Netz-Umhang | Magenta |
| K9 | `player_faryn_wyvernbane` | Faryn | Kampf: Fernkampf Endgame | Windleder, Schwingen-Mantel | Grün |
| K10 | `player_human_novice` | Mensch | Kampf: Magie früh | Flickenrobe, zu großer Hut | Grün |
| K11 | `player_sesskar_tidecaller` | Sesskar | Kampf: Magie mittel | Salzkrusten-Robe, Milchglas-Stab | Magenta |
| K12 | `player_ashwalker_shroudweaver` | Aschgänger | Kampf: Magie hoch | Leichentuch-Robe, Runenbänder | Grün |
| K13 | `player_rakhari_ritesinger` | Rakhari | Kampf: Magie Endgame | Glutrad-Ornat, hohe Kopfzier | Grün |
| B1 | `player_sesskar_weirkeeper` | Sesskar | Beruf: Fishing | Reusen- und Netzwerk | Magenta |
| B2 | `player_orc_anvilborn` | Ork | Beruf: Smithing | Schmiedeschürze, Hammer | Magenta |
| B3 | `player_human_hearthkeeper` | Mensch | Beruf: Cooking | Kessel, Kelle | Blau |
| B4 | `player_duvra_seamsinger` | Duvra | Beruf: Mining | Spitzhacke, Erzkorb | Grün |
| B5 | `player_orc_thornfeller` | Ork | Beruf: Woodcutting | Fällaxt, Stammholz | Magenta |
| B6 | `player_rakhari_sower` | Rakhari | Beruf: Farming | Hacke, Saatbeutel | Magenta |
| B7 | `player_ashwalker_gleaner` | Aschgänger | Beruf: Foraging | Sammelkorb, Grabstock | Magenta |
| B8 | `player_goblin_lockwhisper` | Goblin | Beruf: Thieving | Dietriche, Beutel | Magenta |
| B9 | `player_human_herbwise` | Mensch | Beruf: Herblore | Mörser, Trankgurt | Magenta |
| B10 | `player_faryn_veilscribe` | Faryn | Beruf: Runecrafting | Meißel, Runensteine | Grün |
| B11 | `player_duvra_gemwright` | Duvra | Beruf: Jewelcrafting | Lupe, geschliffene Steine | Grün |
| B12 | `player_faryn_saddlewright` | Faryn | Beruf: Leatherworking | Ahle, Spannrahmen | Grün |

Verteilung: Menschen 6, Orks 3, Rakhari 3, Duvra 3, Sesskar 3, Faryn 3, Goblins 2, Aschgänger 2. Kampf-Designs: 13 von 25, also die Hälfte der 50 Bilder in Kampfausrüstung mit gezogener Waffe (kampfbereiter, ruhiger Stand — Chef-Vorgabe v2).

## § 4 Dossiers — Kampf-Charaktere

**K1 — Der Jungsöldner** (`player_human_sellsword_m/f`) · Mensch, Nahkampf früh, Chroma Magenta *(v2.0 an die abgenommene v4-Datei angeglichen)*
Junge Söldner mit der ersten eigenen Klinge: geschwärzter Gambeson unter geschnürter Halbplatte, ein Wolfsfell über der Schulter, aschgraue Kriegsbemalung quer über dem Gesicht, das Langschwert gezogen und gesenkt. Er ist sehnig und wach, einer, der schon überlebt hat; sie trägt das dunkle Haar streng gebunden und eine schmale Narbe über der Braue. In der Chronik steht so einer meist auf der ersten Seite.

**K2 — Der Schildwall** (`player_orc_bulwark_m/f`) · Ork, Nahkampf mittel, Chroma Magenta
Wo der Wall am dünnsten ist, stehen diese beiden, und ihre Rüstung sagt es laut: dunkle vernietete Eisenplatte, eine massive Schulter aus geschichteten Bohlensegmenten wie ein Stück Palisadenwall, dazu ein Turmschild, der sichtbar aus einem alten Torflügel geschmiedet wurde, und eine einhändige Kampfaxt. Als Kriegsbemalung ein weißer Tonerde-Streifen quer über den Augen. Er ist ein Veteran mit gebrochenem Hauer und ruhigen Augen; sie eine jüngere Sippenkämpferin, der Schädel seitlich rasiert, der Griff sicherer als jedes Wort.

**K3 — Die Tiefenwacht** (`player_duvra_stonewarden_m/f`) · Duvra, Nahkampf gehoben, Chroma Grün
Als die Hallen der Duvra zufroren, hielten die Tiefenwachten die Tore, bis der Letzte oben war. Diese Rüstung erinnert daran, denn sie ist Architektur: Panzerplatten geschnitten wie geschichtete Steinquader, ein Helm in Form eines gewölbten Schlusssteins, dazu ein Großhammer mit einem behauenen, eisenbandierten Steinblock als Kopf. Er trägt den Bart in schweren Zöpfen mit Eisenperlen und redet nur, wenn der Hammer ruht; sie hat den Schlaghandschuh doppelt gefüttert und die Geduld einer Frau, die weiß, dass Stein immer gewinnt.

**K4 — Der Blutspeer** (`player_rakhari_speardancer_m/f`) · Rakhari, Nahkampf hoch, Chroma Grün
Speertanz ist bei den Rakhari ein Ritus, keine Schau: Man tanzt ihn gegen Dinge, die größer sind als man selbst. Lamellenpanzer aus dunkelrot lackierten Lederplättchen über Sandleinen, eine Schärpe mit Karawanenknoten, ein Speer mit langer Klinge und kurzen Ritenbändern, viel freies Fell für die Beweglichkeit. Er ist ein narbiger Karawanenjäger mit halbem Ohr; sie eine Tänzerin der alten Schule, die Streifen an den Armen mit Ritualasche nachgezogen. Beide bewegen sich, als hätte der Boden sie eingeladen.

**K5 — Der Thronveteran** (`player_human_thronewalker_m/f`) · Mensch, Nahkampf Endgame, Chroma Magenta
So sieht jemand aus, der bis vor den Thron kam und wiederkehrte: schwarze, matt geriffelte Vollplatte, in deren Flächen feine Schriftzeilen graviert und mit heller Tinte gefüllt sind, wie Einträge einer getragenen Chronik, darüber ein knochenweißer, zerschlissener Waffenrock, ein Helm mit Knochenplatten-Grat und ein Großschwert. Kein Aschemantel, keine Kronen, keine Glut; niemand soll den Falschen erkennen. Er ist ein grauschläfiger Hüne mit müdem, klarem Blick; sie eine hochgewachsene Veteranin, das Haar kurz, eine alte Brandnarbe am Kinn.

**K6 — Der Weidenjäger** (`player_human_trapper_m/f`) · Mensch, Fernkampf früh, Chroma Magenta
Jemand muss das Wild stellen und nachts vom Palisadenwall in die Dunkelheit sehen. Gegerbtes braunes Leder, Kurzbogen, ein Köcher voller selbst befiederter Pfeile. Er ist ein junger Fallensteller mit wachem Grinsen und Wetterhaut; sie eine ernste Jägerin mit aufgebundenem Haar, die zuerst schießt und dann grinst. Beide kennen jeden Zaunpfahl der Weiden beim Vornamen.

**K7 — Der Deserteur** (`player_goblin_turncloak_m/f`) · Goblin, Fernkampf mittel, Chroma Magenta
Die Kriegsbande führt beide als tot, und wie Mux halten sie das für eine faire Abmachung. Aus Beute zusammengeflickter Lederharnisch mit aufgenähten Münzknöpfen, ein einzelner, sichtbar zu großer menschlicher Armschutz, ein abgerissenes, durchgestrichenes Banden-Abzeichen als Trophäe, Kurzbogen, voller Köcher, ein Dolch für Meinungsverschiedenheiten. Er ist klein, flink, mit einem Ohrring zu viel; sie hat ein zerkerbtes Ohr und die Ruhe einer Schützin, die nie zweimal schießen musste. Die Glutfeste fragt nicht nach Herkunft, und dafür sind beide leise dankbar.

**K8 — Der Uferschütz** (`player_sesskar_saltarrow_m/f`) · Sesskar, Fernkampf gehoben, Chroma Magenta
Wer die Reusen gegen das verteidigt, was die See zurückgibt, lernt auf nasse Ziele zu schießen. Küraß aus überlappenden, salzgebleichten Schalenplatten über blaugrauem Ölzeug, ein halber Umhang aus geknüpftem Netz, ein Langbogen, Pfeile mit Widerhaken wie kleine Harpunen, am Gürtel die Namensschnur der eigenen Ertrunkenen. Er ist ein alter Wattgänger mit vernarbtem Kamm; sie eine junge Kahnführerin, deren Kammlinie elegant wie eine Bugwelle läuft. Beide schießen bei Nebel besser als andere bei Sonne.

**K9 — Der Klippenschatten** (`player_faryn_wyvernbane_m/f`) · Faryn, Fernkampf Endgame, Chroma Grün
In den Klippen schoss man Wyvern im Steigwind, und wer das überlebt hat, dem ist kein Ziel mehr zu schnell. Fast schwarzes, lichtschluckendes Windleder in schmalen Lagen, ein langer geschlitzter Mantel, dessen Bahnen wie angelegte Schwingen fallen, ein Großer Langbogen aus Horn und Holz, das Silberhaar mit Knochenringen gebunden. Er ist ein wortkarger Himmelsleser mit zu vielen Ringen im Haar; sie eine Grätenjägerin, schmal wie eine Sehne, den Blick immer eine Handbreit über dem Horizont.

**K10 — Der Lehrling** (`player_human_novice_m/f`) · Mensch, Magie früh, Chroma Grün
Die Robe ist verwaschen, der Saum geflickt, und der Hut ist etwas zu groß; das gehört bei Lehrlingen offenbar zur Ausbildung. Ein schlichter Holzstab, ein Bündel Notizen im Gürtel, mehr braucht der Anfang nicht. Er ist ein eifriger Bauernsohn, der zu viel liest; sie eine ernsthafte junge Frau, die den Hut mit einer Nadel festgesteckt hat, weil sie das Problem pragmatisch löst. Der Wächter trägt solche Anfänge gern ein.

**K11 — Der Gezeitenrufer** (`player_sesskar_tidecaller_m/f`) · Sesskar, Magie mittel, Chroma Magenta
Ein Volk, das die Kälte der Watten kennt, fürchtet keinen Frost. Ihre Tracht sieht aus wie gefrorene Gischt: mehrlagige Robe in blassem Blaugrau mit einer weißen, kristallinen Salzkruste am Saum, ein Kragen aus stumpfen Knochenzapfen, ein Treibholzstab mit einem Stein wie Milchglas, der Atem sichtbar kalt. Er ist ein bedächtiger Gezeitenzähler mit heller Kehle; sie eine strenge Ritualistin, deren Kamm mit feinen Silberklammern geschmückt ist. Beide sprechen Zauber wie man Ebbe ansagt: unaufgeregt und pünktlich.

**K12 — Der Runenweber** (`player_ashwalker_shroudweaver_m/f`) · Aschgänger, Magie hoch, Chroma Grün
Die Aschgänger nähen Runen, wie andere Wunden nähen: sorgfältig und ohne Aufhebens. Eine Robe aus übereinander gelegten grauen Tuchbahnen wie sorgsam vernähte Leichentücher, darauf tintendunkle Runenbänder, am Gurt kleine Zinn-Namensmarken, dazu das Spaten-Amulett der Kärrner und ein dunkler Stab. Er ist ein hagerer Totengräber-Sohn mit stillem Blick; sie eine Registerführerin, die die Namen ihrer Begrabenen als Schutzlitanei aufsagen kann. Ihre Magie klingt wie Wind über Stoppelfeldern, und sie leuchtet nicht.

**K13 — Der Ritenhüter** (`player_rakhari_ritesinger_m/f`) · Rakhari, Magie Endgame, Chroma Grün
Die Karawanen retteten ihre Riten, und die Ritenhüter tragen sie weiter, im prächtigsten Gewand, das die Glutfeste kennt: anthrazitfarbenes Ornat mit einem mattgolden gestickten Glutrad über der Brust, eine lange Stola mit geknoteten Ritenbändern, eine hohe, kantige Kopfzier mit Aussparungen für die Ohren, ein Stab aus dunklem Eisen mit mattgoldenen Ringen. Er ist ein alter Ritualsänger mit ergrautem Fell an den Schläfen; sie eine jüngere Hüterin mit sorgfältig geflochtener Mähne und dem Ernst einer Frau, die jedes Band selbst geknotet hat.

## § 5 Dossiers — Berufs-Charaktere

**B1 — Der Reusenflicker** (`player_sesskar_weirkeeper_m/f`) · Sesskar, Fishing, Chroma Magenta
Die Fischzüge der Glutfeste hängen an Sesskar-Händen: Sie kennen die Strömung, die Reusen und die Regel, der See nichts nachzutragen. Wachsleinen-Schürze über Schuppenhaut, Rute, Netz über der Schulter, ein Fangkorb an der Hüfte. Er ist ein geduldiger Alter, der Knoten mit zwei Fingern bindet; sie eine junge Flickerin, die beim Arbeiten lautlos die Gezeiten mitzählt.

**B2 — Die Essenhand** (`player_orc_anvilborn_m/f`) · Ork, Smithing, Chroma Magenta
An Urgas Esse arbeitet man sich das Recht auf Schweigen ab. Schwere Lederschürze, rußgeschwärzte Arme, Hammer und Zange, ein dunkles Werkstück auf dem Amboss. Er ist ein junger Geselle mit frischen Brandmarken und ernstem Stolz; sie eine erfahrene Essenhand, das Haar hochgebunden, der Blick prüfend wie eine Wasserwaage. Stahl jammert nicht, und diese beiden auch nicht.

**B3 — Der Herdkoch** (`player_human_hearthkeeper_m/f`) · Mensch, Cooking, Chroma Blau
Mutter Eskes Kessel hat Schüler, und ihre Regel gilt: Erst wird gegessen. Fleckige Schürze, hölzerne Kelle, ein gusseiserner Kessel, Zwiebelzöpfe und Kräuterbündel am Gurt. Er ist ein rundlicher, flinker Koch mit verbranntem Daumen und guter Laune; sie eine junge Herdköchin mit Kopftuch, die mit der Kelle deutet wie ein Feldherr mit dem Stab. Beide kochen gegen das Ende der Welt an, eine Mahlzeit nach der anderen.

**B4 — Der Flözgänger** (`player_duvra_seamsinger_m/f`) · Duvra, Mining, Chroma Grün
Die Duvra haben ihre Hallen verloren, nicht ihr Handwerk. Spitzhacke über der Schulter, Erzkorb mit rostrot geäderten Erzbrocken, eine unangezündete Grubenlampe am Gürtel, Knieschützer aus Leder. Er ist ein breiter Alter, der Gestein am Klang erkennt; sie eine junge Flözgängerin, die Steinperlen im Haar wie eine Ahnenliste trägt. Beide klopfen den Berg ab wie einen alten Freund.

**B5 — Der Baumfäller** (`player_orc_thornfeller_m/f`) · Ork, Woodcutting, Chroma Magenta
Gegen einen Wald, der sich bewaffnet, schickt man Leute mit Geduld und guter Axt. Ärmelloses Lederwams, schwere Fällaxt, ein geschultertes Stammstück, Sägemehl im Haar. Er ist ein Riese mit Gutmütigkeit und Splitternarben; sie eine kompakte Fällerin, die den Keil mit einem Schlag setzt. Der Schwarzdorn hat bei beiden Respekt hinterlassen, in beide Richtungen.

**B6 — Der Saathüter** (`player_rakhari_sower_m/f`) · Rakhari, Farming, Chroma Magenta
Was die Karawanen retteten, wird in den Beeten der Glutfeste eingelöst: Saatgut, Riten, Geduld. Grobe Leinenkleidung, eine Hacke, Saatbeutel am Schultergurt, ein Korb mit Setzlingen. Er ist ein bedächtiger Gärtner, der mit den Pflanzen spricht, weil es nachweislich nicht schadet; sie eine junge Saathüterin mit Gräsern in der Mähne, aber eigener Flechtart, keine Kopie von Shairi. Was wächst, hat gewonnen.

**B7 — Der Grausammler** (`player_ashwalker_gleaner_m/f`) · Aschgänger, Foraging, Chroma Magenta
Nur Aschgänger sammeln im Grau, ohne krank heimzukommen, und sie wissen, was auf verbranntem Boden blüht. Staubgraue Wanderkleidung, Grabstock, ein Korb mit Dämmerkappen und bleichen Götzenblüten, Beutel für Wurzeln und Rinde. Er ist ein stiller Weitläufer mit Tuch um den Hals; sie eine junge Sammlerin, deren weißes Haar unter der Kapuze hervorweht. Beide grüßen unterwegs die Toten zuerst, so gehört es sich.

**B8 — Der Beutelschneider** (`player_goblin_lockwhisper_m/f`) · Goblin, Thieving, Chroma Magenta
Muxens Sortiment hat Herkunftsnachweise, und irgendwer beschafft die. Dunkle Kapuze, weiche Sohlen, Dietriche zwischen den Fingern, ein fremder Münzbeutel am Gürtel, das Grinsen halb schuldbewusst. Er ist ein wieselflinker Taschenkünstler mit Messingring im Ohr; sie eine kühle Schlossflüsterin, die Türen öffnet wie andere Bücher. Gestohlen wird nur bei denen, die es nicht merken sollten, sagt sie, und fast nie im Haus.

**B9 — Der Krautkundige** (`player_human_herbwise_m/f`) · Mensch, Herblore, Chroma Magenta
Zwischen Grableimkraut und Leichenlilie braucht es Leute, die wissen, was heilt und was nur so aussieht. Fleckige Werkschürze, Mörser und Stößel, ein Gurt mit verkorkten Fläschchen, gebündelte, getrocknete Kräuter. Er ist ein zerstreuter älterer Kundiger mit Brille und verfärbten Fingern; sie eine resolute Heilerin, die Rezepte im Kopf und Widerworte im Vorrat hat. Getrunken wird, was sie freigeben, und sonst nichts.

**B10 — Der Runenschreiber** (`player_faryn_veilscribe_m/f`) · Faryn, Runecrafting, Chroma Grün
Die Faryn lasen die dünnen Stellen des Schleiers, lange bevor unten jemand Essenz sagte. Blaugraue Arbeitsrobe mit Schultermantel, Meißel und Klöpfel, ein halb beschlagener Runenstein in der Hand, am Gurt Beutel mit Rohlingen und verkorkte Essenz-Phiolen, alles matt. Er ist ein greiser Himmelsleser, der jede Rune zweimal prüft; sie eine junge Schreiberin, deren Silberhaar beim Arbeiten mit einem Knochenring gebändigt ist. Beide behandeln das Tuch der Welt wie ein Erbstück: mit Respekt und sauberem Werkzeug.

**B11 — Der Steinschleifer** (`player_duvra_gemwright_m/f`) · Duvra, Jewelcrafting, Chroma Grün
Wer Erzadern im Buch führt, führt auch ihre schönsten Seiten. Feine Lederschürze, eine Lupe am Stirnband, winzige Zangen und Feilen, auf dem Handteller geschliffene Steine in Granatrot, Saphirblau und Bernstein. Er ist ein pedantischer Meister mit Metallperlen im Bart; sie eine junge Schleiferin mit ruhigen Händen und einem Blick, der Einschlüsse findet wie andere Ausreden. Bei den Duvra ist ein sauberer Schliff eine Form von Ehrlichkeit.

**B12 — Der Lederwirker** (`player_faryn_saddlewright_m/f`) · Faryn, Leatherworking, Chroma Grün
Klippenvolk näht Häute, seit es im Steigwind jagt; gerissenes Sattelzeug kostet dort oben das Leben. Fleckige Gerberschürze, Ahle und Falzbein, eine über den kleinen Spannrahmen gezogene Haut, gefärbte Finger. Er ist ein knochiger Alter, der Nähte mit dem Daumennagel prüft; sie eine hochgewachsene Wirkerin, die Riemen flicht wie andere Zöpfe. Ihre Arbeit hält, das ist der ganze Stolz, den sie zeigen.

## § 6 Glossar-Nachtrag (nach Chef-GO in Bibel § 9 einpflegen)

| Deutsch | Englisch | Bedeutung |
|---|---|---|
| Die Duvra | The Duvra | NEU: Tiefenvolk aus den gefrorenen Tiefenhallen unter der Schlackengrube (§ 2.5) |
| Die Sesskar | The Sesskar | NEU: Schuppenvolk der Watten und Flussmündungen (§ 2.6) |
| Die Aschgänger | The Ashwalkers | NEU: aschgezeichnetes Fuhrvolk des Grabwächter-Ordens (§ 2.7) |
| Die Faryn | The Faryn | NEU: Klippenvolk des Hochlands, Himmelsleser (§ 2.8) |
| Der Gezeitenzähler | The Tide-Tally | Knotenschnur-Kalender der Sesskar |
| Die Namensschnur | The Name-Knot | Sesskar-Schnur mit den Namen der eigenen Ertrunkenen |
| Das Tuch | The Cloth | Faryn-Wort für den Schleier |
| Die Windzeichen | The Wind-Marks | Faryn-Tätowierung: feine helle Linien an Schläfen und Unterarmen (§ 2.8) |

## § 7 Empfehlungen (Umsetzung nur auf CEO-Order)

- **content-dev/ui-dev:** Volk-Auswahl als rein kosmetische Portrait-/Avatar-Wahl rahmen; keine Volks-Boni, keine neuen Mechaniken. Die 196 Bilder binden sich über die Dateinamen; die 16 T-Pose-Referenzen (`ref_*`) sind Wiki-/Generator-Referenzen, keine Spiel-Assets.
- **lore-dev (selbst, nach GO):** Bibel § 3.4 um die vier Völker erweitern, Glossar § 9 um § 6 dieses Codex ergänzen; der offene Anker „Und mehr" bleibt bestehen.

## § 8 Offene Fragen an den Chef

1. **Steam-Capsule:** Welche Galerie-Designs sollen zusätzlich als Capsule-/Key-Art-Motiv ausgearbeitet werden? Meine Kandidaten: Thronveteran (Mensch), Kriegsfürst (Ork), Emberfang (Rakhari), Trauerplatte (Aschgänger), Sturmflut-Garde (Sesskar). Auf Zuruf liefere ich eigene Capsule-Prompts (Querformat, eigene Regeln, nicht Galerie-Vorspann).
2. **Bibel-Nachzug:** Mit den CEO-Profilen vom 19.07. gelten die vier neuen Völker als freigegeben. Soll ich Bibel § 3.4 und Glossar § 9 jetzt nachziehen (inkl. Rakhari-Umbau auf Tiger-Menschen)?
3. **Wiki-Volkstexte:** Die T-Pose-Prompts enthalten die generischen Volksbeschreibungen. Sollen daraus eigenständige bilinguale Wiki-Einträge (DE/EN) je Volk werden?
