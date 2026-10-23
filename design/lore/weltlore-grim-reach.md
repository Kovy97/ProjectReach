# Weltlore-Bibel — Grim Reach

<!-- claude:2026-10-24T22:15:00+02:00 — § 9: Glossar-Nachtrag 1.4.0 (Raid Gobkha'raz nach Gate L, Werkstatt-Kunden) eingepflegt; sonst unverändert -->

**Status:** **v3 — KANON** (Lore-Dev, 2026-07-13) — die vier Weichen aus §10 sind vom Chef entschieden (2026-07-13): **1. Drazhan der Kronlose ist DER Widersacher** (§1.4), **2. die Heimstatt heißt Glutfeste (Emberhold)** (§3.2), **3. der Wächter ist der Zeuge** (§2 ist Kanon), **4. der Getilgte ist Kanon** (§1.1). Die nicht gewählten Antagonist-Entwürfe (Morvane, Ophar) sind NICHT gelöscht, sondern als Reserve für die Götterkriege nach §11 verschoben. — *v2-Historie (2026-07-13): Umbau nach Chef-Direktiven — Demi-Gott als Antagonist (ersetzte den Wächter-Schuld-Twist aus v1), Bastion-Konzept ersetzt Hearthforge als Heimstatt, High-Fantasy-Völker, benanntes Pantheon + Gesetze der Götter, Figuren-Roster mit Asset-Vorlagen.*
**Struktur-Hinweis:** §10 ist jetzt die **Kanon-Historie** der entschiedenen Weichen; **§11 (neu)** hält die verworfenen Antagonist-Entwürfe als Götterkriege-Reserve; **§12** sammelt die verbliebenen offenen Fragen. Der Paragonturm steht in §5.8; §1.1–1.4 (Pantheon/Gesetze/Drazhan), §3 (Glutfeste, Völker, Figuren, Asset-Vorlagen), §5.7 (Endkampf). Die Hauptquest-Spec der Aschechronik liegt in `design/lore/aschechronik-spec.md` (v2 — implementiert; Dungeons öffnen quest-basiert, ohne Schlüssel).
**Kanon-Quellen:** `packages/content/src/index.ts` (Zonen, Monster, Dungeons, Items, Skills), `design/dungeon-rework-spec.md`, `design/master-capes-konzept.md`. Das ausgelieferte Spiel ist Kanon; dieses Dokument erklärt, was existiert, und benennt nichts Geliefertes um.
**Regeln dieses Dokuments:** keine Zahlen, keine Droprates, keine Mechanik-Designs (mechanische Folgen stehen als Empfehlungen an content-dev/logic-dev, Umsetzung nur auf CEO-Order). Level-Bänder dienen nur der Einordnung.

---

## § 1 Kosmologie & Grundkonflikt

### § 1.1 Das Pantheon — Götter mit Namen, ohne Gesicht

Die Welt hat Götter, und die Götter haben Namen — die Schriften führen sie seit jeher. Aber in der gesamten Geschichte hat sich **nie ein Gott gezeigt**: kein Erscheinen, kein Wunder mit Zeugen, keine Antwort, die man nicht auch dem Wind hätte zuschreiben können. Glaube im Reach war immer Glaube ohne Beweis. Darum nennt das Volk die Götter längst nur noch **die Stillen (The Silent)** — nicht, weil ihre Namen vergessen wären, sondern weil ein Name, der nie antwortet, sich anfühlt wie ein leeres Haus.

Der Twist des Spiels, den der Spieler erst am Ende erfährt: **Es gibt sie wirklich.** Und es gibt nicht nur gute.

Das Pantheon der Schriften (klein gehalten, je ein Satz):

| Gott | EN | Domäne & Charakter |
|---|---|---|
| **Ambrast, der Herdvater** | Ambrast, the Hearthfather | Herd, Handwerk und Zuflucht; man sagt, jede Esse sei ihm ein Altar und jedes Dach ein Gelübde. |
| **Maera, die Kornmutter** | Maera, the Grain Mother | Saat, Ernte und Geduld; die Aschfelder waren einst ihr Brotland, und niemand betete dort je vergebens — glaubte man. |
| **Nereth, der Tiefenherr** | Nereth, Lord of the Deep | See, Gezeiten und das Verzeichnis der Ertrunkenen; die See vergisst keinen Namen, heißt es, weil Nereth sie zählt. |
| **Skorai, die Herrin der Höhen** | Skorai, Lady of the Heights | Himmel, Sturm und alles Fliegende; wer hoch steigt, steht in ihrem Saal — ungebeten. |
| **Vhel, die Torhüterin** | Vhel, the Gatekeeper | Tod, Schwellen und die Zählung der Namen; der Orden der Grabwächter grub und siegelte in ihrem Sinn. |
| **Kaenor, der Waldgänger** | Kaenor, the Woodstrider | Wildnis, Jagd und das alte Jagdrecht; die Königsjagd des Wildwalds war sein Ritus. |
| **Der Getilgte** | The Expunged | Ein Siebter wird gezählt, dessen Name aus allen Schriften geschnitten wurde. Warum, sagt keine. *(KANON — Chef-GO 2026-07-13; bewusst offener Haken für die Götterkriege.)* |

### § 1.2 Die Gesetze der Götter

Die Schriften kennen drei Gesetze, die sich die Götter selbst gaben — das Volk nennt sie das **Dreifache Gebot (The Threefold Law)**:

1. **Das Gesetz der Ferne (The Law of Distance).** Kein Gott betritt die Welt, und keiner zeigt sich ihr. Denn ein bewiesener Gott macht Knechte — und Glaube, der sehen muss, ist keiner.
2. **Das Gesetz der Gabe (The Law of the Gift).** Gebet ist Gabe, nicht Ware und nicht Nahrung. Kein Gott erntet, was ihm zugetragen wird.
3. **Das Gesetz des Bildes (The Law of the Image).** Kein Gott gießt sich ein Gefäß in die Welt — kein Bildnis, keinen Mund, keine Hand.

Darum blieb der Himmel still, durch alle Zeitalter. Die Stille der Götter war nie Gleichgültigkeit. Sie war Gesetz.

**Einer brach alle drei.**

### § 1.3 Der Widersacher — der Halbgott (The Adversary — the Demi-God)

Zwischen Göttern und Menschen steht einer, den die Schriften nicht führen: ein **Halbgott (Demi-God)**, geboren aus Beidem und beheimatet in Keinem. Er stellte sich gegen die Gesetze der Götter und mischte sich in die Menschheit — er ging als **der Fremde (The Stranger)** durch die Welt (Bruch der Ferne), er beantwortete Gebete, die der Himmel liegen ließ (Bruch der Gabe), und er tat, was kein Gott je tat: **Er rief die Götzen ins Leben** (Bruch des Bildes). Sein Name, den die Chronik erst am Ende erfährt und der Spieler mit ihr: **Drazhan der Kronlose (Drazhan the Crownless)** — vollständig in § 1.4.

Das Gebets-Feuer-Motiv aus v1 bleibt — als **sein Mechanismus**: *Gebet ist Feuer. Es wärmt den, der es empfängt, und verzehrt den, der es gibt.* Der Fremde lehrte die Bildnisse zu trinken — und was sie tranken, floss ihm zu. Die Götzen waren nie Götter und nie bloß Erz: Sie waren **seine Ernte-Werke**, aufgestellt im ganzen Land, geduldig wie Mühlen.

**Die Diener (The Servants).** Wo der Fremde ging, blieb etwas zurück: Funken seines geliehenen Feuers, die Gestalt annahmen — das Reach kennt sie als Dämonen (der Imp in den Weiden, der Schmiededämon im Slayer-Turm sind Kanon). Die überrannte Welt jenseits des Reachs gehört ihnen und denen, die sich mit ihnen arrangiert haben. Das Reach ist der letzte benannte Landstrich, der noch standhält — und auch er ist kein sicherer Ort mehr, nur ein umkämpfter.

**Die Enthüllung (Story-Finale).** Der wahre Verursacher wird erst am Ende der letzten Zone offenbar: Der Letzte Götze in der Götzenhalle ist **sein Werk** — das größte, das letzte, das einzige, das der Bildersturz nie zerschlug. Wer das Sanktum besteht und den Letzten Götzen fällt, findet hinter dem Thron die Handschrift des Meisters — und über die Story wird der **Kampf gegen den Widersacher selbst** freigeschaltet (§ 5.7).

**Das Ende, das keines ist.** Der Widersacher wird **nicht getötet**. Er wird zurückgeschlagen — mehr war nie zu haben, er ist ein halber Gott und die Klinge des Namenlosen eine ganze Zumutung, aber keine Hinrichtung. Er zieht sich zurück und kündigt an, dass dies nicht das Ende ist: Die Götter werden auf den Rechtsbruch antworten müssen, und er wird bereit sein. Das ist der saubere Übergang zum nächsten Groß-Kapitel: **die Götterkriege (The God Wars)** — Post-EA. Was er beim Rückzug liegen lässt, nennt die Chronik die **zurückgelassenen Schätze (the treasures left behind)** — die Beute des Endkampfs.

> **Empfehlung an content-dev (Umsetzung nur auf CEO-Order):** Der Endkampf ist ein **regulärer Boss-Kampf** in der Götzenhalle, per Quest nach Abschluss des Sanktums des Letzten Götzen freigeschaltet. Der SIEG wird als Rückzug **erzählt** — keine neue Mechanik, kein Spezial-Ende. Loot-Rahmung: „zurückgelassene Schätze".

### § 1.4 Drazhan der Kronlose (Drazhan the Crownless) — der Widersacher [KANON]

**ENTSCHIEDEN (Chef, 2026-07-13):** Von den drei Antagonist-Entwürfen der v2 ist **Entwurf C** Kanon — Drazhan der Kronlose ist DER Widersacher des Spiels. Die verworfenen Entwürfe Morvane und Ophar bleiben als Reserve für die Götterkriege erhalten (§ 11); sie sind keine Widersacher-Kandidaten mehr, dürfen aber post-EA als eigenständige Figuren wiederkehren. **Wichtig für alle Spieltexte:** Vor der Enthüllung (Kapitel 20 der Aschechronik) läuft Drazhan weiterhin nur als **„der Fremde"** bzw. **„der Widersacher"** — sein Name ist der Story-Payoff des ersten Bandes und fällt nicht früher.

- **Wesen/Gestalt:** Der Kriegs-Halbgott. Ein hünenhafter Krieger in schwarzem Götzeneisen-Harnisch, der an den Rändern mit der aschfahlen, rissigen Haut verschmolzen ist; ein Mantel aus Asche, der nie zur Ruhe kommt; quer über der Brust eine Kette mit **sieben zerbrochenen Kronen**. *(Sieben Kronen, sieben Götter der Schriften — auch die des Getilgten hängt daran. Was das heißt, beantwortet erst der zweite Band.)*
- **Motiv:** Sohn eines Gottes und einer sterblichen Frau — und von den Gesetzen um beides gebracht: kein Thron oben, kein Leben unten. Für ihn ist das Dreifache Gebot Heuchelei: *Die Götter lieben euch nicht. Sie gehorchen nur Regeln.* Die Götzen baute er als Belagerungswerke gegen den Himmel: Anbetung, umgeleitet von den Stillen auf ihn — den Göttern die Nahrung entziehen, sich selbst für den Krieg rüsten, der kommen muss. Die Menschheit war ihm nie Feind, nur Acker. Das ist es, was ihn unverzeihlich macht.
- **Sprechstil:** Eisern, knapp, soldatisch; Verachtung, in die sich widerwilliger Respekt mischt. Er zollt dem Namenlosen als Einziger so etwas wie Anerkennung — ein Soldat erkennt einen Soldaten.
- **Rückzugszeile (Kanon-Wortlaut — im Finale wörtlich zu verwenden, § 5.7):** *„Merkt euch diesen Tag. Ihr saht einen Rückzug, keinen Fall. Wenn die Götter endlich kommen — sagt ihnen: Ich habe angefangen."* / EN: *"Mark this day. You have seen a retreat, not a fall. When the gods come at last — tell them I started it."*
- **Assets:** Porträt `npc_drazhan.png` + Ganzkörper-Kampf-Art `drazhan.png` (Boss-Format) — Beschreibungen in § 3.6.

### § 1.5 Die Götzen (The Idols)

Die Menschen beteten seit jeher an die Bildnisse ihrer Götter — Stein, Holz, Erz; harmlose Andacht, Generationen lang. Dann kam der Fremde. Er weihte die Bildnisse, „damit die Gebete ein Ohr fänden", und die Bildnisse **begannen zu trinken**: erst die Farben des Landes, dann das Korn, dann die Namen der Dörfer. Was ein Götze liebte, wurde grau. Was er sehr liebte, wurde Asche. Und nichts davon kam je bei den Göttern an — die Ernte floss dorthin, wohin sie immer fließen sollte: zu ihm.

**Der Bildersturz (The Idolfall).** Vor Generationen begriff das Reach, was es fütterte, und zerschlug seine Bildnisse — Halle um Halle, Schrein um Schrein. Es war kein Krieg. Es war eine Ernte in umgekehrter Richtung, und sie kam zu spät: Asche wird nicht zurückgenommen. Die Trümmer — Splitter, Herzen, Eisen — trug man fort und versiegelte sie. Einer aber ließ sich nicht zerschlagen: der, der zu Gericht saß.

**Der Letzte Götze (The Last Idol).** In der Götzenhalle hinter dem Hochland sitzt das letzte Bildnis und hält Gericht über die Welt, die ihre Götzen zerschlug. Seine drei Klingen tragen seinen Spruch im Namen: das Letzte Urteil, die Letzte Vergeltung, die Letzte Verdammnis (Last Judgement, Last Vengeance, Last Condemnation). Er trinkt noch immer — dünn, geduldig, aus der Ferne; darum rieselt die Asche weiter, darum stirbt die Welt nicht schnell, sondern stetig. Er ist das Meisterstück des Fremden — und solange er sitzt, läuft die Ernte. Das Reach hielt das Verfahren Generationen lang für das Gericht eines gekränkten Gottes. Es war nie eines. Es war Buchhaltung.

### § 1.6 Der Grundkonflikt

Grim Reach ist keine Geschichte von Rettung. Die Welt ist überrannt — von den Dienern des Widersachers und von allem, was im Windschatten des Chaos gedeiht. Das Reach, der letzte benannte Landstrich, kann nicht geheilt werden; er kann nur **gehalten** werden. Jeder gefällte Baum, jedes geschmiedete Schwert, jede bestandene Jagd ist ein Eintrag in der Chronik, und die Chronik ist das Gedächtnis, das die Asche auf Abstand hält. Am Ende steht kein toter Gott und keine erlöste Welt: Der Widersacher weicht, die Ernte stockt, das Reach bekommt eine Frist — und der Himmel, der so lange schwieg, wird antworten müssen. Die Götterkriege stehen aus.

### § 1.7 Der Paragonturm (The Paragon Spire) — sein zurückgelassenes Werk

Er stand nicht dort, bevor der Widersacher wich. Danach stand er dort. Kein Tempel, kein Grab: ein **Exerzierwerk** — ein Turm ohne oberstes Stockwerk, in dem die Asche alles wiederholt, was das Reach je an Schrecken trug, Etage um Etage, härter und höher. Der Wächter liest ihn als das, was er ist: Der Widersacher hat sein größtes Werkzeug verloren und übt bereits mit dem nächsten. Der Turm ist eine Probe für die Götterkriege — und wer hinaufsteigt, steigt mitten in die Probe und schlägt sie ihm Stockwerk um Stockwerk aus der Hand. Der Wächter nennt den Turm den **Rest der Rechnung**: Die Frist, die der Rückzug erkauft hat, will verteidigt werden, und die Verteidigung führt, wer steigt. Ein oberstes Stockwerk ist nicht bekannt. Die Asche hat Zeit.

---

## § 2 Der Wächter des Reachs (The Warden of the Reach)

**Was er ist (sichtbar).** Der Wächter ist der Erzähler und die einzige **erzählende** Stimme des Spiels — die Figuren der Glutfeste grüßen (§ 3.5), aber sie erzählen nicht. Er empfängt den Namenlosen, zeigt ihm jeden Weg und jede Kunst, und er führt die Aschechronik — das Buch, in das jede Tat des Spielers eingeht. Er ist alt auf eine Weise, die keine Jahre mehr zählt, höflich auf eine Weise, die keine Nähe zulässt, und er kennt das Reach besser, als ein Wanderer es je könnte.

**Was er ist (wirklich — KANON, Chef-GO 2026-07-13: der Zeuge, nicht der Schuldige).** Der Wächter war der letzte Priester der Stillen — und der Einzige, der sich weigerte, die neuen Bildnisse zu weihen. Er hat **den Fremden gesehen**: damals, in den Schmelzen der Schlackengrube, als die ersten Kränze aus Götzeneisen gegossen wurden — einen Mann, der keiner war, der den Gießern die Hände führte und dessen Schatten nicht mit dem Feuer flackerte. *(Rückblickend, seit dem Ende des ersten Bandes, hat dieser Mann einen Namen: Es war Drazhan, § 1.4 — der Kronlose selbst stand in der Schlackengrube und lehrte das Reach, seine Ernte-Werke zu gießen.)* Der Wächter warnte. Niemand hörte auf einen Priester schweigender Götter. Also tat er das Einzige, was Zeugen können: Er fing an aufzuschreiben. Die Chronik ist seine Aussage — Generationen lang geführt, gegen einen Beklagten, dessen Namen er nicht kannte. Man sagt, die Chronik halte ihren Chronisten am Leben, wie ein offenes Verfahren seinen einzigen Zeugen braucht: Er kann nicht abtreten, solange die Akte offen ist. Darum kennt er die Gänge der Krypta — er ging sie, als der Orden noch grub. Darum kennt er den Weg zur Götzenhalle — er ist ihm ein Leben lang nachgegangen. Es ist keine Schuld, die ihn treibt. Es ist Zeugenschaft — und die ist auf ihre Art schwerer, denn Schuld darf büßen. Zeugen müssen zusehen.

**Was er will.** Dass die Akte einen Namen bekommt. Generationen lang stand in der Chronik „Verursacher: unbekannt", und jeder Held, den er führte, war ein weiterer Beweisantrag. Der Namenlose ist nicht der erste Name in der Chronik — der Wächter hat viele geführt, und er sagt nicht, wie viele Einträge mit einem Ende schließen. Aber er ist der erste, der bis hinter den Thron kommt. Als der Fremde am Ende dasteht, benannt und zurückgeschlagen, schreibt der Wächter die eine Zeile, auf die die Chronik so lange gewartet hat. Und schlägt dann, ohne Pause, den zweiten Band auf: die Götterkriege.

**Erzählstimme (Stilvorgabe für alle Chronik-Texte).** Knapp, würdevoll, präzise. Trauer ohne Melodram; trockener Witz in kleinen Dosen und nie auf Kosten der Toten. Keine modernen Idiome, keine Durchbrechung der vierten Wand. Der Wächter befiehlt nicht — er zeigt, bittet und protokolliert. Beispielton: *„Die Hühner sind geblieben. Aus Treue oder aus Mangel an Vorstellungskraft — die Chronik vermerkt beides nicht."*

---

## § 3 Die Glutfeste, der Namenlose & die Figuren

### § 3.1 Der Fall von Hearthforge

**Hearthforge, die Herdschmiede**, war die letzte große Feste des Reachs: ein Gewölbe für das Erworbene, eine Esse, die nie erlosch, Gärten hinter starken Mauern. Sie fiel, als die Diener kamen — nicht an einem Tag, aber an einem Ende: Die Mauern hielten, die Vorräte nicht, und was durch die Tore hereinwollte, wurde mit jedem Winter mehr. Die Überlebenden trugen hinaus, was eine Welt am Leben hält: die Bücher, die Werkzeuge, das Saatgut — und **eine Glut aus der alten Esse**, in einer Eisenpfanne, drei Nächte lang abwechselnd bewacht. Die Quest **„Legende von Hearthforge" (Legend of the Hearthforge)** trägt den Namen zu Recht: Hearthforge ist die Legende, die man sich in der Glutfeste erzählt — der Ort, an dem alle Künste des Reachs überwinterten, bevor sie weitergetragen wurden. Wer heute alle Künste meistert, hält die Legende am Leben. *(Kanon-Auflösung: Der Questname bleibt vollständig erklärt; die Heimstatt des Spielers aber ist nicht Hearthforge — Hearthforge ist gefallen.)*

### § 3.2 Die Glutfeste (Emberhold) — der Rückzugsort der Völker

Am Rand der Weiden, wo das Land noch so tut, als sei nichts geschehen, steht der letzte gemeinsame Ort der freien Völker: **die Glutfeste (Emberhold)**. Kein Prunk, keine Türme — ein Wall aus Erde und Palisade, dahinter Zelte, Karren, eine Esse, Beete, ein vergrabenes Gewölbe. Es ist wenig. Es ist alles. Die Welt draußen ist überrannt; wer der Asche und den Dienern entkam, endet früher oder später hier, und niemand fragt nach Herkunft. Die Glutfeste fragt nach Händen.

**Name (ENTSCHIEDEN — Chef, 2026-07-13): Glutfeste (Emberhold).** Benannt nach der geretteten Glut aus Hearthforge, die in Urgas Esse weiterbrennt: Solange die Glut lebt, ist Hearthforge nicht gefallen, nur umgezogen. Das Wort *Bastion* bleibt als Gattungswort im Umlauf — die Leute sagen beides, die Chronik führt den Ort als Glutfeste. *(Verworfene Alternativen, Historie § 10: Letztwacht/Lastwatch, Aschenhort/Ashenhold.)*

**Rahmung, keine neuen Features:** Bank, Shop, Beete und Werkbänke des Spiels **sind** die Glutfeste — das Gewölbe ist Voss' Zählkammer, der Shop ist Mux' Plane, die Beete sind Shairis Gärten, die Werkbänke stehen um Urgas Esse, und Brennas Aushang hängt am Tor.

### § 3.3 Der Wachstums-Bogen — vom Lager zur Stadt

*(Erzählbogen für das spätere Stadt-Update; keine Mechanik, nur die Geschichte, in die künftiger Content einrücken kann.)*

- **Stufe I — Das Lager (EA-Stand).** Zelte, Palisade, eine Esse, ein Aushang. Eine Handvoll Namen (§ 3.5), jeder trägt drei Ämter. Apokalypse-Gefühl: Nachts zählt man die Feuer draußen, und es werden nicht weniger. Alles, was das Spiel heute an Heimstatt-Funktionen hat, gehört in diese Stufe.
- **Stufe II — Die Freistatt.** Mit jeder Zone, die der Namenlose bricht, reißt der Belagerungsring auf — und es kommen Nachzügler: Familien, Handwerker, ein Ork-Trupp mit Ambossen auf dem Rücken, eine Rakhari-Karawane mit Saatgut. Aus Zelten werden Dächer, aus dem Aushang eine Halle. Mehr Gesichter, erste Geschichten, die nicht vom Wächter erzählt werden.
- **Stufe III — Die Stadt.** Der Wall wird Mauer, das Lager bekommt Gassen, Werkstätten, Streit und Feste — eine kleine Stadt, in der die Völker zum ersten Mal seit dem Fall der Welt wieder *wohnen* statt ausharren. Mehr NPCs, mehr Leben, mehr Story: Die Glutfeste wird vom Rückzugsort zum Beweis, dass die Frist sich lohnt.

Der Wächter über den Bogen: *„Erst hielt der Wall die Welt draußen. Irgendwann hält er eine Stadt drinnen. Die Chronik freut sich auf die Verwechslung."*

### § 3.4 Die Völker (The Peoples) — High Fantasy

Die Welt war immer voller Völker; erst die Katastrophe hat sie an einen Zaun gedrängt. In der Glutfeste gilt: Wer gegen die Diener steht, gehört dazu.

- **Menschen (Humans).** Das Volk des Reachs; die meisten Gesichter der Glutfeste. Bauern, Grabwächter, Schmiede — und der eine, der die Chronik führt.
- **Orks (Orcs).** Sippenvolk aus den überrannten Ländern jenseits der alten Mark; kamen vor Generationen als Flüchtlinge über die Wälle der Grenzlande. Eisenkundig, wortkarg, unbestechlich in Handwerksfragen. Urga Schlackenfaust (§ 3.5) führt ihre Kunst weiter.
- **Rakhari (the Rakhari).** Halbtiger-Menschen: menschliche Statur, Fell und Streifen, Augen mit senkrechten Pupillen. Ihre Heimat brannte, bevor das Reach ihren Namen kannte; sie kamen als Karawanen und brachten mit, was Karawanen retten: Saatgut, Riten, Geduld. Shairi Mondfell (§ 3.5) pflanzt ihre Erinnerung in die Beete der Glutfeste.
- **Goblins (Goblins).** Auch ein Volk — kein schönes Kapitel, aber ein ehrliches: Die Sippen, die das geliehene Feuer des Fremden annahmen, wurden zur Kriegsbande der Grenzlande (Kanon: Goblin-Kriegsbande, Felmagier, Hexenmeister). Nicht alle marschierten. Mux der Abtrünnige (§ 3.5) ist der Beweis — die Bande führt ihn als tot, was er für eine faire Abmachung hält.
- **Und mehr.** Die Schriften nennen Völker, die noch niemand in der Glutfeste gesehen hat, und die Glutfeste hält Plätze frei. *(Bewusst offener Anker: künftige Völker — Zwergen-Steinvolk, Echsenblut, was der Chef will — können ohne Kanon-Bruch nachrücken.)*

**Content-Anker für später (Empfehlungen, kein Auftrag):** Ork-Schmiedekunst als Rezept-/Item-Flavor; Rakhari-Jagdriten als Wildwald-Quest-Farbe; ein Goblin-Deserteur-Strang um Mux; Völker-Gesichter für das Stadt-Update (Stufe II/III).

### § 3.5 Das Figuren-Roster der Glutfeste

*(Der Wächter erzählt; alle anderen Figuren sind STUMM — sie bekommen später NPC-Kopf + Sprechblasen-Begrüßung in den UI-Screens. Je Figur 1–2 Begrüßungszeilen DE/EN, quest-fertig.)*

**Der Wächter des Reachs (The Warden of the Reach)** — Erzähler, Chronist, Zeuge (§ 2). Kein Sprechblasen-NPC; seine Stimme ist die Chronik selbst.

**Brenna Aschenweide (Brenna Ashwick)** — *Slayer-Meisterin.* Hüterin des Slayer-Turms und die Zahlmeisterin des Widerstands: Sie entlohnt jeden, der gegen das Übel kämpft — Kopf um Kopf, Auftrag um Auftrag. Sie liest das Können eines Jägers mit einem Blick und schickt ihn auf Beute eine Spur über seinem Stand.
- DE: „Wieder auf den Beinen? Gut. Das Übel ist es auch." / EN: "Back on your feet? Good. So is the evil."
- DE: „Bring mir Köpfe. Ich bring dir Lohn." / EN: "Bring me heads. I'll bring you pay."

**Urga Schlackenfaust (Urga Slagfist)** — *Schmiedemeisterin, Ork.* Trug die Glut von Hearthforge drei Nächte in einer Eisenpfanne und hat seither das Anrecht, jedem zu sagen, dass seine Arbeit schlampig ist. Die Werkbänke der Glutfeste stehen um ihre Esse.
- DE: „Die Esse frisst, was du bringst. Bring mehr." / EN: "The forge eats what you bring. Bring more."
- DE: „Stahl jammert nicht. Nimm dir ein Beispiel." / EN: "Steel doesn't whine. Take the hint."

**Voss der Zähler (Voss the Tallyman)** — *Gewölbe-Verwalter (Bank), Mensch.* Letzter Schreiber der Grabwächter-Schule; rettete aus Hearthforge keine Waffe, sondern die Hauptbücher. Zählt alles zweimal, aus Prinzip und aus Trauer.
- DE: „Alles wird gezählt. Alles." / EN: "Everything is counted. Everything."
- DE: „Dein Gewölbe steht. Ich habe zweimal gezählt." / EN: "Your vault stands. I counted twice."

**Mux der Abtrünnige (Mux the Renegade)** — *Händler (Shop), Goblin.* Desertierte aus der Kriegsbande mit einem vollen Karren und einem halben Gewissen. Sein Sortiment ist erstaunlich, seine Herkunftsnachweise sind es auch.
- DE: „Nichts gestohlen. Fast nichts." / EN: "Nothing stolen. Almost nothing."
- DE: „Für dich? Sonderpreis. Für alle Sonderpreis." / EN: "For you? Special price. Special price for everyone."

**Shairi Mondfell (Shairi Moonpelt)** — *Feldwartin (Beete), Rakhari.* Pflanzt nach dem Geruchs-Gedächtnis einer verbrannten Heimat; was in ihren Beeten aufgeht, hat zwei Welten überlebt.
- DE: „Die Erde hier ist müde. Wir wecken sie leise." / EN: "The soil here is tired. We wake it gently."
- DE: „Was wächst, hat gewonnen." / EN: "Whatever grows has won."

**Mutter Eske (Mother Eske)** — *Herdmutter und Köchin, Mensch.* Ihr Kessel hing schon in Hearthforge, und er hat eine Regel, die älter ist als die Glutfeste: Erst wird gegessen.
- DE: „Setz dich. Der Kessel fragt nicht, woher du kommst." / EN: "Sit. The kettle doesn't ask where you're from."
- DE: „Gegessen wird, bevor gestorben wird." / EN: "Eating comes before dying."

### § 3.6 Figuren-Aussehen (Asset-Vorlagen)

**Stilregeln für ALLE Vorlagen (Projekt-Kanon):** gemalter Dark-Fantasy-Stil wie die Spieler-Porträts; **KEIN Glühen/Schimmer/Leuchten** (Ausnahme: dem Widersacher als übernatürlichem Wesen ist eine **dezente** Aura erlaubt); **transparenter Hintergrund**; Porträts als Kopf/Schulter-Ausschnitt fürs NPC-Kopf+Sprechblasen-UI. Format: Name → Datei → Beschreibung (1:1 in die Asset-Generierungsliste übernehmbar).

**Der Wächter des Reachs → `npc_warden.png`**
Sehr alter Mann, hageres, kantiges Gesicht mit tiefen Furchen; tief liegende hellgraue Augen, ruhiger, prüfender Blick — müde, aber nicht gebrochen. Langes aschgraues Haar, streng zurückgebunden; kurzer grauer Bart. Über den Schultern ein verwitterter aschfarbener Reisemantel mit tiefer, zurückgeschlagener Kapuze, darunter dunkles Leinen. Charakteristisches Detail: Mantelspange in Form einer eisernen **Buchschließe** (die Schließe der Chronik). Farbwelt: Asche-Grau, kaltes Braun, stumpfes Eisen.

**Brenna Aschenweide → `npc_brenna.png`**
Frau um die Vierzig, wettergegerbtes Gesicht, feine alte Narbe über der linken Braue; wacher, taxierender Blick mit einem Rest Amüsement. Dunkelrotes Haar, streng geflochten, graue Strähnen. Kragen aus abgewetztem Wolfsfell über genieteter dunkler Lederrüstung mit Schnallen. Charakteristisches Detail: Halskette aus **Trophäenzähnen und geprägten Sold-Marken**. Farbwelt: dunkles Lederbraun, Rostrot, Knochenweiß.

**Urga Schlackenfaust → `npc_urga.png`**
Ork-Frau mittleren Alters, breites, ruhiges Gesicht, graugrüne Haut, kurze untere Hauer; rußgeschwärzte Wangen, gelassener, stolzer Blick. Schwarzes Haar zum hohen Knoten gebunden, Seiten rasiert. Schwere lederne Schmiedeschürze über muskulösen Schultern, alte Brandnarben an Hals und Oberarm. Charakteristisches Detail: Anhänger mit einer **matten, erkalteten Glutkohle in Eisenfassung** (die Glut von Hearthforge — bewusst NICHT glühend, matt dunkelrot). Farbwelt: Rußschwarz, Ocker, mattes Dunkelrot.

**Voss der Zähler → `npc_voss.png`**
Hagerer Mann um die Sechzig, blass, eingefallene Wangen, strenger, übermüdeter Blick über einem schmalen Zwicker (Kneifbrille). Schütteres graues Haar, akkurat gescheitelt. Hoher dunkler Kragen einer Schreiberrobe, daran eine kleine Kettenbörse. Charakteristisches Detail: **Schreibfeder hinterm Ohr, Tintenflecken an den Fingerknöcheln**. Farbwelt: Tintenblau-Schwarz, Pergamentbeige, Messing.

**Mux der Abtrünnige → `npc_mux.png`**
Goblin, klein und drahtig, moosgrüne Haut, große bewegliche Ohren — das linke mit mehreren Messingringen; listiges, überraschend freundliches Grinsen mit einem abgebrochenen Zahn. Geflickte Kapuze aus verschiedenfarbigem, verschossenem Stoff. Charakteristisches Detail: über der Schulter die Riemen eines **Bauchladens, an dem Kuriositäten baumeln** (Würfel, Löffel, Amulett-Imitat). Farbwelt: Moosgrün, gedeckte Flickenfarben, Messing.

**Shairi Mondfell → `npc_shairi.png`**
Rakhari-Frau (Halbtiger-Mensch): menschliche Gesichtszüge unter kurzem sandfarbenem Fell mit dunklen Tigerstreifen an Schläfen und Hals; bernsteinfarbene Augen mit senkrechten Pupillen, ruhiger, geduldiger Blick; kleine gerundete Katzenohren hoch am Kopf. Dunkle Mähne in Zöpfen, in die **Saatperlen und getrocknete Gräser** geflochten sind (charakteristisches Detail). Grober Leinenumhang, am Schulterriemen kleine Saatgut-Beutel. Farbwelt: Sand, Umbra, gedecktes Beet-Grün.

**Mutter Eske → `npc_eske.png`**
Alte, rundliche Frau, warmes, tief zerfurchtes Gesicht, wacher gütiger Blick mit strenger Unterkante. Graues Haar unter einem verrußten, geknoteten Kopftuch. Wollenes Schultertuch mit Holzknebel-Verschluss über grobem Leinen. Charakteristisches Detail: langer, dunkel eingebrannter **Holzlöffel**, über die Schulter gesteckt wie ein Marschallstab. Farbwelt: warmes Braun, Ofengrau, ausgeblichenes Rot.

**Drazhan der Kronlose — der Widersacher [KANON] → Porträt `npc_drazhan.png`, Kampf-Art `drazhan.png`**
*(ENTSCHIEDEN — Chef, 2026-07-13. Er ist Endboss und Story-Gesicht; NUR dieser Entwurf wird produziert. Ganzkörper im Monster-Format wie bestehende Boss-Art; Datei = Content-ID `drazhan`. Die verworfenen Entwürfe A/B liegen als Reserve in § 11 — nicht beauftragen.)*
- *Porträt (`npc_drazhan.png`):* Hartes, kriegerisches Halbgott-Gesicht; aschfahle Haut mit feinen dunklen Risslinien wie abgekühlte Lava (matt; einzige zulässige Ausnahme: in Rissen und Augen eine **dezente**, kühlende Restglut). Rasierter Schädel mit grauer Aschezeichnung, dunkle Bartstoppeln, Narbe über dem Kiefer. Kragen: schwarzer Götzeneisen-Harnisch, dessen Ränder sichtbar **mit der Haut verschmolzen** sind; über der Schulter ein Mantel aus Asche, der in Bewegung bleibt. Charakteristisches Detail: Kette mit **zerbrochenen Kronen** (im Porträt zwei sichtbar). Farbwelt: Schwarzeisen, Aschegrau, dunkles Glutrot.
- *Ganzkörper (Kampfpose, `drazhan.png`):* Hünenhafter Krieger (deutlich überlebensgroß) in schwarzem, verschmolzenem Götzeneisen-Harnisch; wehender Aschemantel; quer über der Brust die Kette mit **sieben zerbrochenen Kronen**. Waffe: eine riesige zweihändige Klinge aus mattem Götzeneisen mit sichtbaren Gussnähten, beiläufig geschultert. Haltung: breite Schrittstellung nach vorn, Kinn gesenkt, Blick voll Verachtung mit einem Rest Respekt. Dezente Restglut in den Risslinien als Aura.

---

## § 4 Die Zonen

### § 4.1 Die Weiden (The Pastures) — ca. L1–15

Das Brotland der Glutfeste und der letzte Flecken, auf dem die Welt noch so tut, als sei nichts geschehen. Die Höfe stehen leer, aber das Vieh ist geblieben — Hühner, Kühe, Wildschweine, verwilderte Ziegen —, und ohne Zaun und Hirte hat es eigene Sitten angenommen. Der Rasende Bulle (Maddened Bull) ist keine Ausgeburt der Asche, nur ein Tier, dem niemand mehr widersprochen hat. Beunruhigender ist der Imp (The Imp): ein kleiner Funke von anderswo, eingenistet im grünsten Winkel des Reachs. Die Alten sagten, wo ein Imp haust, ist ein Fremder vorübergegangen. Die Alten sind fort; der Imp ist noch da.
**Chronik-Haken:** Hier schlägt der Wächter die erste Seite auf — die ersten Handgriffe, das erste Blut, und mit dem Imp die erste Ahnung, dass auch das grüne Land Risse hat. Beim Wort „Fremder" hält seine Feder einen Atemzug inne.

### § 4.2 Die Grenzlande (The Borderlands) — ca. L15–60

Einst die Mark: Wälle, Waffenlager und Wachfeuer, der Schildwall des Reachs gegen das Draußen — und das Nadelöhr, durch das die Flüchtenden kamen, als das Draußen fiel: die ersten Ork-Sippen, die ersten Rakhari-Karawanen, zuletzt niemand mehr. Dann wurde die Mark aufgegeben. Die Goblins kamen nicht als Eroberer, sondern als Erben: Sie plünderten Zeughäuser und Belagerungswerke und bauten aus dem Nachlass eine Karikatur der alten Armee, mit Pikenieren, Armbrustern und Belagerungsbestien. Ihre Schamanen und Hexenmeister zapfen Trübessenz (Dim Essence) aus den verlassenen Wachfeuern, und ihre Felmagier tragen ein Feuer, das keiner Esse des Reachs entstammt — geliehen von dem, der es großzügig verleiht und grausam eintreibt. Der Kriegshäuptling (Goblin Warchief) träumt davon, aus der Bande wieder ein Heer zu machen. Es wäre komisch, wenn er nicht so fleißig wäre.
**Chronik-Haken:** Die erste Prüfung des Namenlosen — und die erste unbequeme Frage der Chronik: Wer hat die Mark verlassen, und warum steht das nirgends geschrieben?

### § 4.3 Die Aschfelder (The Ashfields) — ca. L30–45

Die Kornkammer des Reachs — Maeras Brotland, sagten die Schriften —, bis ein Götze sie liebte. Heute ist sie das Anschauungsstück der Chronik: kilometerweit Grau, aus dem die Stoppeln alter Ernten ragen. Was hier lebt, lebt von Resten — Aschratten, Aschfeld-Schakale, Staubgeier, Pechkäfer; im Morast der alten Bewässerungsgräben ziehen Morastkriecher ihre Bahnen. Die Sumpfirrlichter (Mire Wisps) sind keine Tiere: Es sind die Feldarbeiter, die niemand mehr begrub, als das Begraben aus der Mode kam. Über allem herrscht der Aschtyrann (Ash Tyrant) — das größte Aas-Tier der Felder, ein König nach dem einzigen Recht, das die Asche anerkennt.
**Chronik-Haken:** Der Wächter führt den Namenlosen bewusst hierher: So sieht Land aus, das ein Götze geliebt hat. Und er fügt leise hinzu: Nichts davon kam je bei der Kornmutter an. Die Lektion sitzt.

### § 4.4 Der Schwarzdornwald (The Blackthorn Wood) — ca. L45–65

Der Wald hat als Einziger aus dem Bildersturz gelernt: Er bewaffnet sich. Wurzlinge (Rootlings) lösen sich aus dem Unterholz, knorrig und dornig, und der Alte Baumriese (Elder Treant) ist weniger ein Baum als ein Beschluss. Unter den Wurzeln liegen Hügelgräber, älter als jede Feste des Reachs — dort singt der Hügelgrab-Chorist (Barrow Chanter) Litaneien in einer Sprache, die keiner mehr spricht, und wird nicht müde. Die Rankenhexe (Bramble Witch) war einmal eine Frau, die blieb, als alle gingen; inzwischen ist an ihr mehr Wald als Frau, und der Wald ist mit dem Tausch zufrieden. Der Geisterhirsch (Spectral Stag) zeigt sich nur denen, die der Wald prüfen will. Der Waldvogt (The Forest Warden) trägt ein Amt, das früher Menschen innehatten — der Wald hat es eingezogen und neu besetzt.
**Chronik-Haken:** Zum ersten Mal hört der Namenlose die Toten singen. Der Wächter notiert, dass der Gesang eine Richtung hat: kryptenwärts.

### § 4.5 Die Krypta (The Crypt) — ca. L65–90

Das große Werk des Ordens der Grabwächter (Grave Wardens), der in Vhels Sinn grub und siegelte: Als die Asche kam und die Friedhöfe der Dörfer aufgegeben wurden, sammelte der Orden die Toten des Reachs in einer einzigen Tiefe und versiegelte sie — ordentlich, verzeichnet, bewacht. Das Siegel hielt Generationen länger als der Orden selbst. Gebrochen hat es der Nekromantenfürst (Necromancer Lord) — nach allem, was die Zeichen sagen, kein Eindringling, sondern der letzte Kastellan des Ordens, der des Wartens müde wurde. Oder müde **geflüstert**: Die Chronik hegt den Verdacht, dass die Stimme, die ihm das Warten austrieb, nicht seine eigene war. Nun macht er die Toten wieder „diensttauglich": Krieger, Schützen, Speerträger, Eismagier — eine Garnison, die keinen Sold verlangt. Der Hohle Chor (Hollow Choir) singt die Gebete der Toten weiter; hohl heißt er, weil nie ein Amen kommt. Der Eiserne Wächter (Iron Sentinel), ein Konstrukt des Ordens, tut stur weiter Dienst und unterscheidet längst nicht mehr zwischen Grabräuber und Erbe.
**Chronik-Haken:** Das Grabwächter-Siegel (Grave Warden Sigil) wird zum Schlüsselbegriff der Chronik. Der Wächter kennt die Gänge — er ging sie, als der Orden noch grub. Die Chronik vermerkt, wie lange das her sein muss, und rechnet nicht nach.

### § 4.6 Wildwald-Jagdgründe (Wildwood Hunting Grounds) — ca. L90–120

Die alten königlichen Jagdgründe, Kaenors Ritualland — und das letzte satte Land des Reachs. Alles Leben, das die Asche vertrieb, drängte hierher, und dann tat der Wald, was Wälder tun: Die Starken fraßen die Schwachen, Generation um Generation, bis nur noch Riesen übrig waren. Grauwölfe von der Größe eines Ponys, Wildhirsche wie Denkmäler, der Schreckenswolf (Dire Wolf), und über allen der Altbär (Elder Bear), den die Jäger den Alten vom Wildwald nennen. Hier ist nichts verflucht und nichts verdorben — das ist das Beunruhigende. Der Wildwald ist gesund. Er ist nur nicht mehr für Menschen gebaut.
**Chronik-Haken:** Der Wächter verlangt die alte Jägerprobe: den Leitwolf-Reißzahn (Alpha Fang). Die Chronik braucht den Nachweis, dass der Namenlose in einer Welt bestehen kann, die ihn nicht als Krone der Schöpfung führt.

### § 4.7 Gezeitenuntiefen (Tidewater Shoals) — ca. L120–155

Als die Welt fiel, fuhren Flotten hinaus — Menschen, Orks, Rakhari, wer ein Deck fand —, denn irgendwo, so betete man, müsse Land sein, das kein Götze je geliebt und kein Diener je gefunden hat. Die See gibt sie seither zurück, Leichnam um Leichnam, Planke um Planke: Die Riff-Ertrunkenen (Reef Drowned) laufen die Untiefen ab wie eine Heuer, die nie ausgezahlt wurde. Die Gezeitensirene (Tide Siren) singt die Namen der Ertrunkenen — das einzige Verzeichnis, das die See führt; die Frommen sagen, sie singe es Nereth vor, und niemand weiß, ob er zuhört. Aus der Tiefe steigen Dinge auf, die dort unten nichts mehr hält: die Tiefenkrake (Deep Kraken), die Abyssale Gezeitenschlange (Abyssal Tide Serpent). Wenn selbst der Grund der See heraufkommt, sagt der Wächter, sollte man nicht fragen, wovor.
**Chronik-Haken:** Es gibt kein Entkommen übers Wasser — die Chronik schließt das Kapitel „Flucht" endgültig und trägt stattdessen die Namen der Ertrunkenen nach. Jemand muss es tun.

### § 4.8 Schlackengrube & Frostkavernen (Slag Pit & Frost Caverns) — ca. L155–200

Die große Esse des Reachs: Hier wurde geschürft und geschmolzen, was das Land an Adern hergab — bis hinauf zu jenem Erz, aus dem man die Kränze der Bildnisse goss. Die Grube hat zwei Gesichter, und beide sind Endzustände eines Feuers: oben die Glut — Glutelementare, Schlackenkobolde, Grubenspinnen in den warmen Stollen —, unten der Frost, denn irgendwann grub man zu tief und öffnete Adern, in denen die Kälte der Leere wohnt. Dort jagen Frosthunde, dort flüstern Eishexer (Frost Hexers), dort geht der Leeren-Zerschmetterer (Voidhusk Crusher) um. Der Eisenrevenant (Iron Revenant) ist ein Schmied, der in seiner Rüstung starb und die Kündigung nie erhielt. Der Verkohlte Schicksalsritter (Charred Doomknight) ging in die Schlacke, als der Bildersturz kam — ob aus Scham oder aus Trotz, weiß nur er, und er redet nicht.
**Chronik-Haken:** Hier hat der Wächter den Fremden gesehen — damals, beim Guss der ersten Kränze: einen Mann, der keiner war und dessen Schatten nicht mit dem Feuer flackerte (rückblickend: Drazhan, § 1.4). Er hat gewarnt. Es steht nirgends geschrieben, weil niemand es aufschreiben wollte — außer ihm. Vor den kalten Öfen steht er lange und schreibt nichts. Das fällt auf.

### § 4.9 Das Hochland (The Highlands) — ca. L200–242

Das Dach des Reachs. Die Asche ist schwer und bleibt unten; darum ist der Himmel hier oben noch sauber — Skorais Saal, sagten die Schriften —, und alles, was fliegen kann, hat sich nach oben gerettet. Die Rocs — Jungvögel, Jäger, Älteste, Sturm-Rocs — nisten in den Klippen und jagen im Tiefland; der Hochland-Wyvern hält seine eigenen Reviere. Aber Höhe hat einen Preis: Hier oben ist der Schleier dünn — dünn getragen von einem, der ihn zu oft durchschritten hat. Der Leerenroc (Void Roc) ist der Beweis — ein Vogel, durch den man beinahe hindurchsehen kann, und was man sieht, ist kein Fleisch. Der Klippengeist (Gravecliff Specter) haust an den Grabklippen, wo das Hochland seine Toten dem Wind übergab, und der Leeren-Titan (Void Titan) steht in den Pässen wie eine Frage, die niemand gestellt hat.
**Chronik-Haken:** Der Aufstieg zur Götzenhalle. Der Wächter wird einsilbig — die Chronik vermerkt, dass er den Weg nicht nachschlagen muss. Er ist ihm ein Leben lang nachgegangen.

### § 4.10 Die Götzenhalle (The Idol Hall) — ca. L245–295, nur als Sanktum betretbar

Das größte Heiligtum der alten Welt: die Halle, in der die Bildnisse aller Götter standen — und, wie die Chronik am Ende beweist, die Werkstatt des Fremden. Nach dem Bildersturz trug man die Trümmer der zerschlagenen Götzen hierher — Splitter, Herzen, Eisen — und versiegelte die Halle über ihnen. Einer aber war nie zerschlagen worden. Der Letzte Götze sitzt seither über den Trümmern seiner Geschwister und hält Gericht: das Meisterstück, das seinen Meister nie verriet. Sein Hof ist klein und ausreichend: Götzenwächter (Idol Wardens) aus Götzeneisen, die Tempelwache, die nie abgedankt hat; der Aetherwraith — der Schleier aus allem Weihrauch und allen Gebeten, die hier je aufstiegen und nie ankamen; der Drachenhaut-Skarn (Dragonhide Skarn) — lebendes Gestein, mit Drachenhäuten gepanzert, die Schuppenwand vor dem Thron. Die Halle ist versiegelt und wird nicht frei durchwandert: Wer hinein will, geht den Weg des Sanktums, Welle um Welle (§ 5.6). Und hinter dem Thron wartet, was die Chronik so lange nur „Verursacher: unbekannt" nannte (§ 5.7).
**Chronik-Haken:** Das vorletzte Kapitel. Der Wächter weiß, wo die Siegel liegen. Die Chronik fragt nicht mehr, woher — sie hat es längst verstanden: Er ist der letzte Zeuge, und dies ist seine Aussage.

### § 4.11 Der Slayer-Turm (The Slayer Tower) — Nebenstrang, alle Stufen

Älter als der Orden, älter als jede Urkunde: ein Turm, der sammelt, was das Reach verwirft. Irgendwann begann man, das, was nicht sterben wollte und nirgends hingehörte, hierher zu treiben und die Tore zu schließen — Seuchengetier in die Pestkammern, Abbilder und Doppelgänger in die Spiegelhallen (der Turm spiegelt, was draußen haust; niemand weiß, wozu), Fehlschläge der Essen in die Schmiedeabgründe — und mit ihnen der Schmiededämon (Forge Demon), ein Funke des Fremden, der in einer Esse Gestalt fand —, Dinge ohne Namen in die Flüsternde Leere. Ganz unten steht der Abyssale Thron, und die einzige gesicherte Erkenntnis über ihn lautet: Es ist besser, wenn niemand darauf sitzt. Brenna Aschenweide (Brenna Ashwick), die Slayer-Meisterin der Glutfeste, hütet den Turm und entlohnt jeden, der gegen das Übel kämpft — sie liest das Können eines Jägers und schickt ihn auf Beute eine Spur über seinem Stand, Kopfgeld inklusive. Der Wächter billigt ihre Arbeit ausdrücklich.
**Chronik-Haken:** Nebenpfad der Chronik: „Was der Turm hält, muss dünner werden." Der Wächter und Brenna sind sich einig, ohne je ein Wort zu wechseln — die Chronik vermutet gegenseitigen Respekt, kann es aber nicht belegen.

---

## § 5 Die Dungeons

*(Die Wellen-Dramaturgie — Auftakt, benannte Wellen, Truhe, Boss-Finale — ist Kanon aus dem Dungeon-Rework; die Lore erzählt sie als das, was sie ist: der Gang ins Innere. Zugang ist seit der Aschechronik story-verdient: Wer das Chronik-Kapitel eines Gebiets schließt, dem öffnet sich sein Dungeon. Schlüssel gibt es keine mehr; nur der Paragonturm (§ 5.8) behält den seinen.)*

### § 5.1 Die Goblin-Kriegsbande (The Goblin Warband) — Grenzlande

Das Feldlager des Kriegshäuptlings: Hier wird aus der Bande eine Armee geprobt. Wer eindringt, durchläuft die Heerschau in ihrer eigenen Ordnung — die Vorhut, die Speerwand, die Belagerungslinie, den Blutritus der Schamanen — und steht am Ende vor dem Kriegshäuptling selbst. Das Kriegsbanden-Siegel (Warband Seal), das die Bande ihren Offizieren verleiht, ist der Beweis, den die Chronik verlangt: Eine Armee, deren Siegel man nehmen kann, ist keine Armee.
**Chronik-Haken:** Den Krieg abbrechen, bevor er einen Namen bekommt. Der Wächter formuliert es kühler: „Die Mark wurde einmal aufgegeben. Ein zweites Mal wird nicht verzeichnet."

### § 5.2 Tiefen der Krypta (Depths of the Crypt) — Krypta

Unter den verzeichneten Grüften liegt die Tiefe, in der der Nekromantenfürst residiert. Der Abstieg folgt der Ordnung, die er selbst geschaffen hat: die Grabwache, die Knochenschützen, die Knochenwache, der Frostritus — eine Garnison der Toten in tadelloser Aufstellung. Das alte Siegel des Ordens ist gebrochen und kann nicht erneuert werden; die Chronik zieht die einzig verbliebene Konsequenz.
**Chronik-Haken:** Nicht das Siegel flicken — die Hand abschlagen, die es brach. Der Wächter spricht an diesem Ort leiser als sonst, und nicht aus Furcht. Und er notiert die offene Frage, wessen Flüstern den Kastellan mürbe machte.

### § 5.3 Die Wildwald-Jagd (The Wildwood Hunt) — Wildwald

Die alte Königsjagd, wiederbelebt als Ritus: Es beginnt mit dem Heulen, dann stellt sich der Große Hirsch, dann der Schreckenswolf — und zuletzt der Alte vom Wildwald selbst. Keine Rache, kein Feldzug: eine Jagd nach altem Recht — Kaenors Recht —, bei der der Wald mitzählt. Wer sie besteht, hat dem Wildwald nichts bewiesen — der Wildwald ist nicht eitel —, aber der Chronik.
**Chronik-Haken:** Der Wächter will den Ritus vollständig: „Das Reach hatte einmal Könige. Die Jagd ist, was von ihrer Würde übrig ist. Sie soll ordentlich zu Ende gejagt werden."

### § 5.4 Der Hochland-Horst (The Highland Aerie) — Hochland

Der große Horst der Rocs, gestaffelt wie eine Festung: der Horstwächter, die Jagdschwinge, der Älteste — und im Auge des Wetters der Sturmbringer (The Stormbringer), dessen Sturmkern (Storm Core) mehr Himmel enthält, als einem Vogel zusteht. Der Pass zur Götzenhalle führt unter den Horsten hindurch; die Rocs haben keine Meinung zur Chronik, aber sehr klare Ansichten über Durchreisende. Und die Staffelung ist keine Brutordnung, sondern eine Wachordnung: Im Hochland nisten die Rocs in den Klippen (§ 5-Zonenbild bleibt Kanon) — dieser eine große Horst aber ist um den Pass gebaut, seine Vögel brüten nicht, sie halten Wache. Wer sie gestellt hat, lässt die Chronik bewusst offen; die Zeile in der Akte bleibt frei. *(v2.1-Feinschliff, Story-Review 2026-07-13 — offener Faden, braucht in Band 1 keinen Payoff.)*
**Chronik-Haken:** Den Himmelsweg freikämpfen — und eintragen, was der Horst wirklich ist: eine gestellte Wache. Der Wächter bedauert die Vögel aufrichtig (sie sind das Gesündeste, was das Reach noch hat) und lässt es trotzdem eintragen.

### § 5.5 Das Wyvernlager (The Wyvern Lair) — Hochland

Die hohen Nistgründe, wo die Wyvern horsten und der Schleier am dünnsten ist: die Schwinge, der Sturm, die Wyvern — und als Herr des Lagers der Leerenroc, halb Vogel, halb Loch in der Welt. Hier oben, wo der Fremde den Schleier dünn getragen hat, sammelt die Leere, was den Götzen gehört, wie Elstern Silber sammeln. Niemand hat sie darum gebeten. Das Lager ist das letzte Tor vor der Götzenhalle: Kein Schlüssel öffnet es; es öffnet sich dem, der es räumt.
**Chronik-Haken:** Das letzte Tor öffnen. Der Wächter: „Hinter dem Lager liegt nur noch die Halle. Ich habe diesen Satz sehr lange nicht geschrieben."

### § 5.6 Sanktum des Letzten Götzen (Sanctum of the Last Idol) — Götzenhalle

Der große Gang. Die versiegelte Halle öffnet sich nur dem vollen Weg: erst der Wächter des Götzen, dann der Schleier, dann die Schuppenwand — und dann der Thron. Der Letzte Götze führt kein Gespräch; er führt ein Verfahren, und seine drei Klingen sind seine drei Tenöre: Urteil, Vergeltung, Verdammnis. Wer ihn fällt, beendet das Gericht, das die Welt seit dem Bildersturz gegen sich selbst führt — und findet hinter dem Thron, was kein Bildersturm je fand: die Handschrift des Meisters. Werkzeichen im Götzeneisen, gesetzt von einer Hand, die keine menschliche war. Der Letzte Götze war nie der Richter der Welt. Er war das Werk eines anderen — und der andere ist noch da. Aus dem Herzen des Götzen (Heart of the Idol) und den Splittern seiner Geschwister schmieden die Künste der Glutfeste das, was die Götzen nie hergaben: Werkzeug.
**Chronik-Haken:** Das drittletzte Kapitel. Der Wächter schreibt es mit ruhiger Hand — bis zu den Werkzeichen. Dann schreibt er, zum ersten Mal seit Generationen, ein Wort mit zitternder: *„Verursacher: bekannt."*

### § 5.7 Der Kampf gegen den Widersacher — Story-Finale (nach dem Sanktum)

Am Ende der letzten Zone, freigeschaltet über die Story nach dem Fall des Letzten Götzen: Der Fremde tritt aus dem Schatten seines zerbrochenen Meisterstücks und gibt der Chronik, was sie nie hatte — ein Gesicht und einen Namen: **Drazhan der Kronlose** (§ 1.4). Es ist ein Kampf, kein Verfahren: Der Halbgott, der die Gesetze der Götter brach, gegen den Namenlosen, der jede Kunst und jede Klinge des Reachs hinter sich hat. **Drazhan fällt nicht.** Er wird zurückgeschlagen — Schritt um Schritt, bis ihm die Halle nichts mehr gibt —, und dann wählt er den Rückzug wie ein Feldherr, nicht wie ein Geschlagener. Seine Ankündigung (Kanon-Wortlaut in § 1.4, wörtlich zu verwenden) macht aus dem Sieg eine Frist: Dies war nicht das Ende. Die Götter werden antworten müssen. Die Götterkriege stehen aus. Was er zurücklässt — Waffen, Werkstücke, Beutestücke seiner langen Einmischung —, nennt die Chronik die **zurückgelassenen Schätze**: Er reist leicht. Er kommt wieder.
**Chronik-Haken:** Das letzte Kapitel des ersten Bandes. Die Zeile, auf die die Chronik Generationen wartete, wird geschrieben — und die nächste Seite ist schon eingelegt.
> **Empfehlung an content-dev (Umsetzung nur auf CEO-Order):** regulärer Boss-Kampf (Kanon-Mechanik, keine Sonderregeln), Quest-Unlock nach Sanktum-Abschluss, Loot-Rahmung „zurückgelassene Schätze"; Boss-Art im Monster-Format (§ 3.6, Content-ID `drazhan`). Umsetzungsvorschlag im Detail: `design/lore/aschechronik-spec.md`, Kapitel 20.

### § 5.8 Der Paragonturm (The Paragon Spire) — Epilog, endlos

Er stand nicht dort, bevor der Widersacher wich. Danach stand er dort — sein zurückgelassenes Werk, größer als alle Schätze: ein Exerzierturm, in dem die Asche alles wiederholt, was das Reach je an Schrecken trug — Etage um Etage, härter und höher, ohne Ende. Revenants, Hexer, Schicksalsritter, Leerenrocs, Titanen: Die Asche erinnert sich an alles, was je gekämpft hat, und sie erinnert sich aufwärts. Der Wächter liest den Turm als Vorboten der Götterkriege — eine Probe für Heere, die noch nicht marschieren — und nennt ihn den Rest der Rechnung: Die Frist, die der Rückzug erkauft hat, will verteidigt werden, Stockwerk um Stockwerk. Wer fällt, beginnt von vorn, denn die Asche vergisst nichts und verzeiht nur auf Anfang. Ein oberstes Stockwerk ist nicht bekannt. Der Wächter steigt selbst nie hinauf. Er wartet unten, mit dem zweiten Band auf den Knien, und trägt jede erreichte Etage ein, als wäre sie ein Kapitel.
**Chronik-Haken:** Der Epilog-Anker: Die Chronik endet nicht. Sie bekommt nur einen zweiten Band.

---

## § 6 Kräfte & Fraktionen — Diener, Nutznießer, Hinterlassenschaften

**Die Dämonen — die Diener des Widersachers (The Servants).** Funken seines geliehenen Feuers, die Gestalt fanden: der Imp im grünsten Winkel der Weiden, der Schmiededämon in den Abgründen des Slayer-Turms — und draußen, jenseits des Reachs, genug, um eine Welt zu überrennen. Sie sind keine Rasse und kein Volk; sie sind Spuren. Wo ein Diener haust, ist der Fremde vorübergegangen oder hat es vor.

**Die Goblin-Kriegsbande (The Goblin Warband) — Nutznießer.** Erben der aufgegebenen Mark. Keine Wilden — Sammler mit Armeetraum: Sie plündern das zurückgelassene Kriegsgerät des Reachs und äffen dessen alte Ordnung nach, bis die Nachahmung gefährlich wird. Ihre Magie ist zweierlei Diebstahl: Trübessenz aus verlassenen Wachfeuern — und das Fel-Feuer ihrer Felmagier und Hexenmeister, geliehen vom Fremden, der großzügig verleiht und grausam eintreibt. Die Bande dient niemandem bewusst; sie gedeiht im Chaos, das ein anderer sät. Dass nicht alle Goblins marschierten, beweist Mux (§ 3.5).

**Die Untoten — drei Stimmen, ein Motiv.** Die Alten in den Hügelgräbern (der Chor unter dem Schwarzdorn), die versiegelten Toten der Krypta (die Garnison des Nekromantenfürsten) und die Ertrunkenen der See. Was sie eint: Gebete ohne Adresse. Die Toten des Reachs beten weiter, singen weiter, dienen weiter — und nichts davon kommt an, denn der, der die Leitung legte, hat sie zu sich verlegt. Der Hohle Chor heißt hohl, weil nie ein Amen kommt. Untot ist im Reach kein Fluch, sondern ein unbeglichener Rest — Treibgut der großen Ernte.

**Der Orden der Grabwächter (The Grave Wardens).** Tot als Orden, lebendig als Hinterlassenschaft. Sie sammelten die Toten, versiegelten die Krypta, bargen die Trümmer der Götzen nach dem Bildersturz und bauten Wächter aus Eisen, die ihren Erbauern nicht nachstarben. Ihre Siegel, Schilde und Klingen aus Grabstahl (Gravesteel) tragen ihr Zeichen bis heute. Ihr letzter Kastellan wurde ihr größter Verrat: der Nekromantenfürst — und die Chronik fragt bis heute, wessen Flüstern ihn brach. Brenna Aschenweide führt den Wacht-Gedanken des Ordens fort, ohne je Mitglied gewesen zu sein — der Orden hätte sie vermutlich abgelehnt, was gegen den Orden spricht.

**Die Konstrukte.** Der Eiserne Wächter, die Golems, die Abominationen der Essen: Dinge, denen man Dienst gab und dann den Herrn nahm. Sie sind nicht böse — sie sind unbeaufsichtigt, und ihre Pflichttreue ist vollständig aus dem Zusammenhang gefallen. Im Reach gilt: Ein Konstrukt tut exakt, wozu es gebaut wurde. Das ist das Problem.

**Der Hof des Letzten Götzen.** Die Werkstatt-Wache des Fremden: die Tempelwache aus Götzeneisen, der Schleier aus unbeantworteten Gebeten, die Schuppenwand. Draußen im Reach hat der Kult keine lebenden Gemeinden mehr — nur Spuren: Götzeneisen in den Schmelzen, Götzenblüten (Godbloom) auf verbranntem Boden, den Imp im grünen Land. Der Götze braucht keine Anhänger. Er hat einen Auftraggeber.

**Das wilde Land.** Wildwald, Hochland, die See: weder Diener noch Nutznießer — Zeugen. Die gesunde Wildnis ist das, was eine Welt tut, wenn man aufhört, sie zu bestellen. Der Wächter besteht auf dem Unterschied: Nicht alles, was den Namenlosen töten will, gehört dem Feind. Manches gehört einfach wieder sich selbst.

---

## § 7 Der rote Faden — Kapitel-Anker der Aschechronik

*(Reihenfolge entlang der Progression; je Anker das Ziel des Wächters. Stichpunkte, keine Quest-Texte. 21 Kapitel: 19 Weg, Finale, Epilog.)*

1. **Die erste Seite** (Glutfeste/Weiden) — Der Wächter nimmt den Namenlosen am Tor der Glutfeste auf; die ersten Handgriffe. Er will einen neuen Eintrag — die Chronik hatte zu lange keinen.
2. **Erstes Blut** (Weiden: Rasender Bulle) — Die Probe: Kann der Neue bestehen, wo die Welt noch gnädig ist?
3. **Der Funke im Korn** (Weiden: Der Imp) — Der Wächter will wissen, wie ein Diener ins grünste Land kommt. Beim Wort „Fremder" hält seine Feder inne — die Antwort beunruhigt ihn mehr als den Spieler.
4. **Die leere Mark** (Grenzlande) — Die Goblins als Erben; der Wächter lässt den Namenlosen die alte Grenze ablaufen — und die Frage stehen, wer sie aufgab.
5. **Das Kriegsbanner** (Dungeon: Goblin-Kriegsbande) — Das Siegel des Kriegshäuptlings holen: den Krieg beenden, bevor er einen Namen verdient.
6. **Die Aschelektion** (Aschfelder) — Der Wächter zeigt, was ein Götze hinterlässt — und dass nichts davon je bei der Kornmutter ankam. Kein Auftrag: eine Unterrichtsstunde mit Leichen.
7. **Der König des Aas** (Aschfelder: Aschtyrann) — Das Recht der Asche brechen: Auch im Grau gilt wieder eine Ordnung, die nicht frisst.
8. **Dornen** (Schwarzdornwald) — Der Wald bewaffnet sich; der Wächter will Durchgang, nicht Sieg. Der Unterschied wird wichtig.
9. **Der Chor unter den Hügeln** (Schwarzdorn: Choristen, Waldvogt) — Dem Gesang folgen, der kryptenwärts zieht; das Amt des Waldvogts respektieren — und passieren.
10. **Das gebrochene Siegel** (Krypta) — Die Ordnung der Grabwächter besichtigen, den Bruch verstehen. Der Wächter kennt die Gänge — er ging sie, als der Orden noch grub.
11. **Der Fürst der Tiefe** (Dungeon: Tiefen der Krypta) — Die Hand abschlagen, die das Siegel brach — und die Frage eintragen, wessen Flüstern sie führte. Erster Sieg, der sich nicht wie einer anfühlt.
12. **Die Riesen** (Wildwald) — Das letzte satte Land: bestehen, wo der Mensch nicht mehr die Krone ist.
13. **Die alte Jagd** (Dungeon: Wildwald-Jagd) — Die Königsjagd ordentlich zu Ende jagen; der Reißzahn als Eintrag von Würde in einer würdelosen Zeit.
14. **Was die See heimträgt** (Gezeitenuntiefen) — Die Namen der Ertrunkenen nachtragen. Kapitel „Flucht" wird geschlossen — endgültig.
15. **Die kalte Esse** (Schlackengrube & Frostkavernen) — Wo das Götzeneisen geschmolzen wurde. Hier gesteht der Wächter, was er sah: den Fremden, dessen Schatten nicht flackerte. Die Chronik ist eine Zeugenaussage — jetzt weiß es auch der Namenlose.
16. **Der dünne Himmel** (Hochland) — Aufstieg; die Leere sickert von oben, dünn getragen von einem, der den Schleier zu oft durchschritt. Der Wächter braucht den Weg nicht nachzuschlagen.
17. **Der Horst** (Dungeon: Hochland-Horst) — Den Himmelsweg freikämpfen; der Horst hält gestellte Wache, nicht Brut, und die Zeile für den, der sie stellte, bleibt frei. Bedauern eintragen, Sturmkern mitnehmen.
18. **Das letzte Tor** (Dungeon: Wyvernlager) — Das Lager räumen, den Leerenroc bezwingen; danach steht das letzte Tor vor der Halle offen. „Hinter dem Lager liegt nur noch die Halle."
19. **Das Gericht** (Dungeon: Sanktum des Letzten Götzen) — Der volle Gang: Wächter, Schleier, Schuppenwand, Thron. Das Gericht beenden — und hinter dem Thron die Werkzeichen finden. *„Verursacher: bekannt."*
20. **Der wahre Verursacher** (Götzenhalle: Drazhan; § 1.4, § 5.7) — Das freigeschaltete Finale: der Kampf gegen den Halbgott. Die Chronik bekommt ihren Namen: Drazhan der Kronlose. Er fällt nicht — er weicht, und seine Ankündigung (Kanon-Wortlaut § 1.4) macht aus dem Sieg eine Frist. Die zurückgelassenen Schätze werden verzeichnet. Der erste Band schließt.
21. **Epilog: Der zweite Band** (Paragonturm; § 5.8) — Der Turm steht, wo der Widersacher wich: sein zurückgelassenes Werk, die Probe für die Götterkriege. Der Wächter schlägt den zweiten Band auf und trägt Etagen ein statt Kapitel; ein Nachtrag gehört noch in den ersten: Eine der sieben Kronen an Drazhans Kette trug keinen Namen, den die Schriften noch führen (§ 1.1, § 1.4). Die Frist will verteidigt werden — Stockwerk um Stockwerk, bis der Himmel antwortet.

**Nebenstrang (kein Hauptkapitel):** Der Slayer-Turm — Brennas entlohnte Jagdaufträge als stehende Randnotizen der Chronik: „Was der Turm hält, muss dünner werden."

---

## § 8 Sprachfarbe & Materialkunde

Die Materialnamen des Contents tragen die Lore implizit — neue Texte sollen diese Farbe treffen:

- **Essenz-Leiter:** Trübessenz → Aetheressenz → Leerenessenz (Dim → Aether → Void Essence) — drei Zustände des dünner werdenden Schleiers zwischen Welt und Nichts. Sturmessenz/Sturmkern gehören dem sauberen Himmel des Hochlands. **Fel-Feuer** ist keine Stufe dieser Leiter: Es ist das geliehene Feuer des Widersachers — Magie mit Gläubiger.
- **Erz & Metall:** Die Leiter endet bei Grabstahl (Gravesteel — Erbe des Ordens) und Götzeneisen (Godiron — das Kranz-Metall der Bildnisse, gegossen unter den Augen des Fremden). Dazwischen: Bluteisen, Murkvein — Adern, die man besser zugelassen hätte.
- **Holz:** Eisenrinde, Aschenrinde, Schattenkiefer, Bluteiche, Knochenholz, Düsterholz, Pestholz, Götzenholz (Ironbark, Ashbark, Shadowpine, Bloodoak, Bonewood, Grimwood, Blightwood, Godwood) — der Wald des Reachs benennt seine Narben selbst; dass die Leiter beim Götzenholz endet, ist kein Zufall.
- **Ernte & Küche:** Grimmkorn, Grabkartoffel, Grableimkraut, Leichenlilie, Galgenapfel-Konfitüre, Dämmerkappe, Götzenblüte (Grimwheat, Gravetato, Grave Lily, Corpse Lily, Gallows Preserve, Duskcap, Godbloom). Grundsatz des Wächters: *„Das Reach isst, was wächst. Es fragt nicht mehr, wo."*
- **Leder & Gewebe:** Dämmerleder (Duskhide), Aethergewebe (Aetherweave) — Handwerk aus dem Zwielicht bzw. aus dem dünnen Schleier.
- **Erinnerungs-Items:** Seelenopal (Soul Opal), Wiedergänger-Elixier (Revenant Elixir), Götzensplitter (Idol Shard), Herz des Götzen — Reste mit Rest-Zuhörer.
- **Meisterumhänge (Master Capes):** die Meisterweihe der Künste, die aus Hearthforge gerettet wurden und in der Glutfeste weiterleben; die Namen (Hainhüter, Tiefenbrecher, Leerenangler, Grabgärtner, Seelenkoch, Kriegsherr, Unbeugsamer …) sind Ehrentitel, die der Wächter in die Chronik einträgt. Der Umhang der Vollendung (Cape of Completion) ist der einzige Titel, den die Chronik je in Großbuchstaben führt.
- **Zurückgelassene Schätze (treasures left behind):** die Loot-Rahmung des Endkampfs (§ 5.7) — was ein Halbgott auf dem Rückzug liegen lässt, weil er leicht reist.

---

## § 9 Glossar DE/EN

### Bestehende Kanon-Namen (Content)

| Deutsch | Englisch | Typ |
|---|---|---|
| Die Weiden | The Pastures | Zone |
| Die Grenzlande | The Borderlands | Zone |
| Die Aschfelder | The Ashfields | Zone |
| Der Schwarzdornwald | The Blackthorn Wood | Zone |
| Die Krypta | The Crypt | Zone |
| Wildwald-Jagdgründe | Wildwood Hunting Grounds | Zone |
| Gezeitenuntiefen | Tidewater Shoals | Zone |
| Schlackengrube & Frostkavernen | Slag Pit & Frost Caverns | Zone |
| Das Hochland | The Highlands | Zone |
| Die Götzenhalle | The Idol Hall | Zone |
| Der Slayer-Turm | The Slayer Tower | Zone |
| Die Goblin-Kriegsbande | The Goblin Warband | Dungeon |
| Tiefen der Krypta | Depths of the Crypt | Dungeon |
| Die Wildwald-Jagd | The Wildwood Hunt | Dungeon |
| Der Hochland-Horst | The Highland Aerie | Dungeon |
| Das Wyvernlager | The Wyvern Lair | Dungeon |
| Sanktum des Letzten Götzen | Sanctum of the Last Idol | Dungeon |
| Der Paragonturm | The Paragon Spire | Dungeon (endlos) |
| Der Wächter des Reachs | The Warden of the Reach | Erzähler |
| Brenna Aschenweide | Brenna Ashwick | NPC (Slayer-Meisterin) |
| Der Letzte Götze | The Last Idol | Endboss (Sanktum) |
| Götzenwächter | Idol Warden | Monster (Halle) |
| Aetherwraith | Aether Wraith | Monster (Halle) |
| Drachenhaut-Skarn | Dragonhide Skarn | Monster (Halle) |
| Der Nekromantenfürst | The Necromancer Lord | Boss (Krypta) |
| Der Hohle Chor | The Hollow Choir | Monster (Krypta) |
| Der Eiserne Wächter | The Iron Sentinel | Monster/Konstrukt |
| Hügelgrab-Chorist | Barrow Chanter | Monster (Schwarzdorn) |
| Der Waldvogt | The Forest Warden | Boss (Schwarzdorn) |
| Die Rankenhexe | The Bramble Witch | Monster (Schwarzdorn) |
| Der Aschtyrann | The Ash Tyrant | Boss (Aschfelder) |
| Der Rasende Bulle | The Maddened Bull | Boss (Weiden) |
| Der Imp | The Imp | Monster (Weiden; Diener) |
| Schmiededämon | Forge Demon | Monster (Slayer-Turm; Diener) |
| Goblin-Felmagier | Goblin Fel Magician | Monster (Grenzlande) |
| Der Alte vom Wildwald | The Old One of the Wildwood | Boss (Wildwald-Jagd; = Altbär/Elder Bear) |
| Der Sturmbringer | The Stormbringer | Boss (Horst; = Sturm-Roc/Storm Roc) |
| Der Leerenroc | The Void Roc | Boss (Wyvernlager) |
| Der Leeren-Titan | The Void Titan | Monster (Hochland) |
| Der Klippengeist | The Gravecliff Specter | Monster (Hochland) |
| Der Verkohlte Schicksalsritter | The Charred Doomknight | Monster (Schlackengrube) |
| Der Eisenrevenant | The Iron Revenant | Monster (Schlackengrube) |
| Der Kriegshäuptling | The Goblin Warchief | Boss (Kriegsbande) |
| Das Letzte Urteil | Last Judgement | Waffe (Letzter Götze) |
| Die Letzte Vergeltung | Last Vengeance | Waffe (Letzter Götze) |
| Die Letzte Verdammnis | Last Condemnation | Waffe (Letzter Götze) |
| Auge des Götzen | Eye of the Idol | Item (Letzter Götze) |
| Herz des Götzen | Heart of the Idol | Item |
| Götzensplitter | Idol Shard | Item |
| Götzeneisen | Godiron | Material |
| Grabstahl | Gravesteel | Material |
| Grabwächter-Siegel | Grave Warden Sigil | Item |
| Kriegsbanden-Siegel | Warband Seal | Item |
| Leitwolf-Reißzahn | Alpha Fang | Item |
| Sturmkern | Storm Core | Item |
| Trübessenz / Aetheressenz / Leerenessenz | Dim / Aether / Void Essence | Materialien |
| Pestkammern, Spiegelhallen, Schmiedeabgründe, Flüsternde Leere, Abyssaler Thron | Plague Chambers, Mirror Halls, Forge Abyss, Whispering Void, Abyssal Throne | Slayer-Turm-Etagen |
| Legende von Hearthforge | Legend of the Hearthforge | Quest (erklärt durch § 3.1) |

### Neue Eigennamen (diese Bibel, v2)

| Deutsch | Englisch | Bedeutung |
|---|---|---|
| Die Aschechronik | The Ashen Chronicle | Das Buch des Wächters; Titel der Hauptquest |
| Die Stillen | The Silent | Volksname der Götter, die nie antworteten (§ 1.1) |
| Ambrast, der Herdvater | Ambrast, the Hearthfather | Gott von Herd, Handwerk, Zuflucht |
| Maera, die Kornmutter | Maera, the Grain Mother | Göttin von Saat, Ernte, Geduld |
| Nereth, der Tiefenherr | Nereth, Lord of the Deep | Gott der See und des Verzeichnisses der Ertrunkenen |
| Skorai, die Herrin der Höhen | Skorai, Lady of the Heights | Göttin von Himmel, Sturm, allem Fliegenden |
| Vhel, die Torhüterin | Vhel, the Gatekeeper | Göttin von Tod, Schwellen, Namenszählung |
| Kaenor, der Waldgänger | Kaenor, the Woodstrider | Gott von Wildnis, Jagd, altem Jagdrecht |
| Der Getilgte | The Expunged | Der aus den Schriften geschnittene Siebte (KANON, Chef-GO 2026-07-13; Götterkriege-Haken) |
| Das Dreifache Gebot | The Threefold Law | Die Gesetze der Götter: Ferne, Gabe, Bild (§ 1.2) |
| Drazhan der Kronlose | Drazhan the Crownless | **DER Widersacher** (KANON — Chef, 2026-07-13; § 1.4) |
| Der Widersacher | The Adversary | In-Welt-Rollenname Drazhans vor der Enthüllung (§ 1.4) |
| Der Fremde | The Stranger | In-Welt-Name Drazhans vor der Enthüllung (§ 1.4) |
| Morvane, der Bildner | Morvane the Graven | Verworfener Entwurf A — Götterkriege-Reserve (§ 11) |
| Ophar, der Bleiche Hirte | Ophar, the Pale Shepherd | Verworfener Entwurf B — Götterkriege-Reserve (§ 11) |
| Die Diener | The Servants | Dämonen-Funken des Widersachers (Imp, Schmiededämon …) |
| Die Götterkriege | The God Wars | Nächstes Groß-Kapitel (Post-EA); Auftakt Kap. 22–27 in 1.3.0 (`band2-auftakt-1.3.0.md`) |
| Der Tilger | The Expunger | Boss des Band-2-Auftakts: die Hand, die den Namen des Siebten schnitt (Chef-GO 2026-10-17; `the_expunger`) |
| Die Getilgte Kapelle | The Expunged Chapel | Mini-Dungeon der Götzenhalle (`expunged_chapel`), Wellen „Die Prozession"/„Die Lücke" |
| Götzenhülse · Skarnbrut · Verlassener Diener · Götzenpriester · Gebetsfresser · Kranzträger · Belagerungsgötze | Idol Husk · Skarn Whelp · Forsaken Servant · Idol Priest · Prayer Eater · Wreath Bearer · Siege Idol | Offene Wesen der Götzenhalle (1.3.0, IDs und Bestiariums-Zeilen in `band2-auftakt-1.3.0.md` § 5.7) |
| Zurückgelassene Schätze | Treasures Left Behind | Loot-Rahmung des Endkampfs |
| Der Bildersturz | The Idolfall | Historisches Ereignis: das Reach zerschlägt seine Götzen |
| Der Orden der Grabwächter | The Order of the Grave Wardens | Untergegangener Orden; abgeleitet aus bestehenden Items |
| Hearthforge, die Herdschmiede | Hearthforge | **Gefallene** Feste; Legende & Questname, NICHT die Heimstatt (§ 3.1) |
| Die Glutfeste | Emberhold | Heimstatt des Spielers (KANON — Chef, 2026-07-13; § 3.2); „Bastion" bleibt Gattungswort |
| Letztwacht / Aschenhort | Lastwatch / Ashenhold | Verworfene Namens-Alternativen (Historie § 10) |
| Orks | Orcs | Volk (Flüchtlinge der überrannten Länder) |
| Rakhari | The Rakhari | Volk der Halbtiger-Menschen |
| Urga Schlackenfaust | Urga Slagfist | Schmiedemeisterin der Glutfeste (Ork) |
| Voss der Zähler | Voss the Tallyman | Gewölbe-Verwalter der Glutfeste (Bank) |
| Mux der Abtrünnige | Mux the Renegade | Händler der Glutfeste (Goblin-Deserteur) |
| Shairi Mondfell | Shairi Moonpelt | Feldwartin der Glutfeste (Rakhari) |
| Mutter Eske | Mother Eske | Herdmutter/Köchin der Glutfeste |
| Der Namenlose | The Nameless | Der Spieler in der Chronik |
| Das Reach | The Reach | Der letzte benannte Landstrich der Welt |

### Nachtrag 1.4.0 — Raid „Die Hallen von Gobkha'raz“ (Gate L entschieden 24.10.2026; Quelle `raid-gobkharaz.md` § 12, Übersetzungen `raid-gobkharaz-i18n.md`)

| Deutsch | Englisch | Bedeutung |
|---|---|---|
| Gobkha'raz | Gobkha'raz | Verborgene Hauptstadt der Goblins in der Kernfeste der alten Mark; Raid `gobkharaz`. Mux übersetzt: „das, was man uns ließ“ |
| Die Hallen von Gobkha'raz | Halls of Gobkha'raz | Raid-Name; Räume: Zolltor · Zeughallen · Bestiengruben · Heiligtum des geliehenen Feuers · Erbthron (Toll Gate · Armories · Beast Pits · Shrine of the Borrowed Fire · Heir's Throne) |
| Der Gläubiger | The Creditor | Goblin-Name für den Fremden/Drazhan; die Goblins kennen keinen anderen und sagen nie „Drazhan“ |
| Das Schuldbuch | The Debt Ledger | Vrikkas Buch; jede Sippe zahlt Zins auf das geliehene Feuer, in Trägern |
| Eintreibung | Collection | Das Ausbrennen einer säumigen Sippe aus dem Buch; auch Vrikkas dritte Phase und Set-Stufe 5 des Ornats |
| Das Leihfeuer | The Lent Flame | Die Ursprungsflamme im Becken aus Götzeneisen, an der alle Felmagier ihr Feuer entzünden; **bleich, fast weiß, rauchlos, rührt keinen Schatten** (Chef-Entscheid L5, nicht grün) |
| Die Kernfeste | The Keep (of the march) | Die nicht gesprengte Festung unter dem Wall; ihr Reach-Name wird nicht mehr geführt |
| Zahlmeisterin Vrikka · Zeugmeister Krogg · Grubenmutter Ushka · Oberfelmagierin Zil'gath · Kriegskönig Rakkzul der Erbe | Tallymistress Vrikka · Quartermaster Krogg · Pitmother Ushka · High Fel-Magus Zil'gath · War-King Rakkzul the Heir | Die fünf Bosse (`gk_tallymistress`, `gk_quartermaster`, `gk_pitmother`, `gk_felmagus`, `gk_warking`) |
| Die Kronwache | The Crownguard | Garde des Kriegskönigs; Einheit `gk_crownguard` (Kronwächter / Crownguard), Set `gk_bleed` „Blutschwur der Kronwache“ |
| Die Grubenmeute | The Pitpack | Ushkas Zucht (Grubenhunde und Belagerungsbestien); Set `gk_poison` „Pirschgewand der Grubenmeute“ |
| Ornat des geliehenen Feuers | Regalia of the Borrowed Fire | Set `gk_fire` (Magie, Stoff) |
| Das Kerbholz | The Tally Stick | Die Brücke nach Kapitel 20: Gläubigerhälfte unter Drazhans zurückgelassenen Schätzen, Schuldnerhälfte in Vrikkas Buch |
| Grubenzahn | Pit Fang | Ushkas Krummsäbel `gk_pit_scimitar` (nicht „Reißzahn“, Kollision mit Leitwolf-Reißzahn / Alpha Fang) |
| Reliktstaub | Relic Dust | Bergungsrest aus gedroppter Ausrüstung (`relic_dust`); nur für hohe Verzauberungsrunen |
| Zahltag · Geliehenes Feuer · Kriegstrommeln · Bestienhunger · Offenes Zeughaus · Giftküche · Blutfest · Stille Hallen | Payday · Borrowed Fire · War Drums · Beast Hunger · Open Armory · Poison Kitchen · Blood Feast · Silent Halls | Die acht Wochen-Modifikatoren des Raids |

### Nachtrag 1.4.0 — Werkstatt (Kunden der Arbeitsaufträge; Quelle `1.4.0-ereignisse-auftraege.md` § 3)

| Deutsch | Englisch | Bedeutung |
|---|---|---|
| Jorun Bannernaht | Jorun Bannerstitch | Schneiderin der Glutfeste (Mensch); nähte Banner für die Mark vor deren Aufgabe; Kundin für Schneidern (`jorun`) |
| Caedren Eibenhand | Caedren Yewhand | Bogner der Glutfeste (Elf); ehemaliger Schütze, dessen Schulter nachgab; Kunde für Bognerei (`caedren`) |

---

## § 10 Entschiedene Weichen — Kanon-Historie

*Alle vier Weichen der v2 sind entschieden. Sie werden hier als Historie geführt, damit spätere Bearbeiter nachvollziehen können, was zur Wahl stand — die getroffene Entscheidung ist bindend.*

1. **Antagonist — ENTSCHIEDEN (Chef, 2026-07-13): Entwurf C, Drazhan der Kronlose** (§ 1.4). Chef-Zitat: „C Finde ich sehr geil!" Zur Wahl standen A Morvane, der Bildner (Gott-Schmied) und B Ophar, der Bleiche Hirte (der antwortende Hirte) — beide als Götterkriege-Reserve erhalten (§ 11).
2. **Bastion-Name — ENTSCHIEDEN (Chef, 2026-07-13): Glutfeste (Emberhold)** (§ 3.2). Verworfen: Letztwacht (Lastwatch), Aschenhort (Ashenhold).
3. **Wächter als Zeuge — GO (Chef, 2026-07-13):** § 2 ist Kanon. Der Wächter ist der letzte Priester der Stillen und der einzige lebende Zeuge des Fremden; die Chronik ist seine Generationen-Zeugenaussage. Der Mann, den er in der Schlackengrube sah, ist rückblickend Drazhan (§ 1.4, § 4.8).
4. **Der Getilgte — GO (Chef, 2026-07-13):** Der siebte, aus allen Schriften geschnittene Gott ist Kanon (§ 1.1) — der stehende Haken für die Götterkriege.

---

## § 11 Anhang: Verworfene Antagonist-Entwürfe — Reserve für die Götterkriege

*Beide Figuren sind NICHT Kanon des ersten Bandes und werden NICHT produziert (keine Assets beauftragen). Sie sind bewusst vollständig erhalten: Im Post-EA-Kapitel „Die Götterkriege" können sie als eigenständige Figuren wiederkehren — nicht als „der Widersacher" (das ist Drazhan), sondern als das, was zwischen Göttern und Halbgöttern sonst noch unterwegs ist. Ob und wie, entscheidet der Chef, wenn der zweite Band ansteht.*

### § 11.1 Morvane, der Bildner (Morvane the Graven) — verworfener Entwurf A

- **Wesen/Gestalt:** Der Gott-Schmied. Eine erhabene Gestalt aus angelaufener Bronze und Götzeneisen, das Gesicht eine unvollendete Götzen-Maske — eine Hälfte poliert, eine roh gegossen. Statt Krone ein Kranz zerbrochener Gussformen. (EN „the Graven" klingt bewusst an *graven images* an — das Schriftwort für Götzenbilder.)
- **Motiv:** Ihm wurde der Platz im Pantheon verweigert — halb geboren, nie geweiht. Also machte er sich seine Gemeinde selbst: Er gab den Gebeten „ein Ohr", goss den Menschen Götter zum Anfassen und erntete, was hineinfloss. Er hält die Welt für ein unfertiges Werkstück und sich für den einzigen Meister, der noch daran arbeitet. Die Götzen waren keine Bosheit, findet er. Sie waren Handwerk.
- **Sprechstil:** Höflich, handwerklich, geduldig; spricht von Menschen wie von Material und meint es nicht einmal böse. Beleidigt nie — er begutachtet.
- **Rückzugszeile (Reserve):** *„Legt das Werkzeug nicht fort, Namenloser. Ich bin mit dieser Welt noch nicht fertig — und die Götter werden kommen, sie mir streitig zu machen."* / EN: *"Do not set down your tools, Nameless. I am not finished with this world — and the gods will come to contest my claim."*
- **Asset-Vorlage (Reserve, nicht beauftragen):** Porträt `npc_morvane.png` — erhabene, geschlechtslos wirkende Gestalt; das Gesicht eine **unvollendete Götzen-Maske aus angelaufener Bronze** — die eine Hälfte edel poliert, die andere roh gegossen mit stehen gebliebenen Gussgraten; Augen: schmale dunkle Schlitze ohne Pupillen, dahinter nur Tiefe; statt Haar ein Kranz **zerbrochener Gussformen**, getragen wie eine Krone; Schultern: schwere Gießerschürze über Bronzeplatten, durchzogen von Adern aus dunklem Götzeneisen; dezente Aura erlaubt: ein feiner Schleier schwebenden Metallstaubs; Farbwelt: angelaufene Bronze, Grünspan, Schlackenschwarz, mattes Altgold. Kampf-Art `morvane.png` — kolossale Schmied-Gestalt (deutlich überlebensgroß), Gießerschürze und Bronzeplatten wie oben; in der Rechten ein **Gießlöffel-Zepter** (mannshoher Schmelzlöffel), aus dem erkaltendes, dunkles Metall in zähen Fäden tropft (matt, nicht leuchtend); die Linke offen erhoben, die Finger wie Meißel zulaufend; um die Füße zerbrochene Götzen-Fragmente; Haltung: ruhig, begutachtend — ein Meister vor einem missratenen Werkstück; dezente Metallstaub-Schlieren als Aura.

### § 11.2 Ophar, der Bleiche Hirte (Ophar, the Pale Shepherd) — verworfener Entwurf B

- **Wesen/Gestalt:** Eine überlange, hagere, bleiche Gestalt in einer Robe aus tausenden beschriebenen Gebetsbändern; um den Kopf ein geweihartiger Halo aus erstarrtem Kerzenrauch; die Augen weiß wie die eines Blinden, der Blick trotzdem mitfühlend. Ein Hirtenstab aus Götzenholz, gekrönt von einem kleinen, leeren Schrein.
- **Motiv:** Er hörte, was die Götter per Gesetz überhören mussten: das ganze ungestillte Beten der Welt. Und er liebte die Menschen zu sehr, um zu gehorchen. Also antwortete er — aber Antworten kostet, und ein halber Gott kann nur geben, was er zuvor nimmt. Die Götzen waren seine Ohren im Land. Dass sie die Welt grau tranken, nennt er den Preis der Zuwendung, und er trägt ihn scheinbar schwerer als seine Opfer.
- **Sprechstil:** Sanft, trauernd, väterlich; droht nie — er bedauert. Die gefährlichste Stimme, weil sie recht zu haben glaubt.
- **Rückzugszeile (Reserve):** *„Ihr schlagt die Hand, die euch hielt. So haltet euch selbst — bis die Götter kommen. Dann werdet ihr wieder beten. Und ich antworte immer."* / EN: *"You strike the hand that held you. Then hold yourselves — until the gods arrive. You will pray again, when they do. And I always answer."*
- **Asset-Vorlage (Reserve, nicht beauftragen):** Porträt `npc_ophar.png` — überlanges, hageres, bleiches Gesicht von stiller Schönheit und tiefer Müdigkeit; Augen vollständig weiß wie bei einem Blinden, der Blick dennoch mitfühlend gesenkt; um den Kopf ein **geweihartiger Halo aus erstarrtem Kerzenrauch** (feste graue Rauchbögen — als dezente Aura zulässig); Kapuze und Kragen aus **hunderten beschriebenen Stoffstreifen** (Gebetsbändern), die sich wie Verbände um Hals und Schultern legen; Farbwelt: Knochenweiß, Elfenbein, Rauchgrau, verblasste Tinte. Kampf-Art `ophar.png` — überlange, dünne Gestalt (deutlich überlebensgroß), die eine Handbreit über dem Boden steht; Robe aus fließenden Gebetsbändern, die am Saum zu Asche ausfransen; in der Hand ein **Hirtenstab aus schwarzem Götzenholz, gekrönt von einem kleinen leeren Schrein**; Haltung: leicht vorgeneigt, eine Hand segnend-fordernd geöffnet — Einladung und Drohung in derselben Geste; dezenter Rauch-Halo als Aura.

---

## § 12 Offene Fragen an den Chef

1. **Drazhans Vater (erst für die Götterkriege relevant, keine EA-Entscheidung nötig):** Ist sein göttlicher Elternteil einer der sechs Benannten — oder der Getilgte? Die Bibel legt es bewusst nicht fest; die Kette mit den sieben zerbrochenen Kronen (§ 1.4) hält beide Lesarten offen.
2. **Völker-Nachzügler (§ 3.4, Stadt-Update Stufe II/III):** Welche weiteren Völker sollen nachrücken (Zwergen-Steinvolk, Echsenblut, …)? Kein Zeitdruck — der Anker ist offen gebaut.
