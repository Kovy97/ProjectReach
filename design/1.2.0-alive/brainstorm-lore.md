# 1.2.0 „Alive" — Brainstorm Lore: Figuren, Orte, Geschichten

**Status:** v1 (Lore-Dev, 2026-08-26) — Design-Brainstorm auf Chef-Auftrag („Welt lebendiger, besseres Aufgabensystem, mehr und bessere Quests, Daily-Vielfalt"). NUR Dokument: kein Code, keine Content-Änderung, keine Umsetzung. Mechanische Folgen stehen als Empfehlungen an content-dev/logic-dev/ui-dev; Zahlen (Counts, Rewards, Schwellen) bleiben balance-designer-Revier.
**Perspektive:** Figuren, Orte, Geschichten. Wie bekommt die Welt Gesichter, wie hält die Aschechronik (The Ashen Chronicle) alles zusammen, und was davon trägt im Idle-Rhythmus.
**Kanon-Quellen (geprüft):** `packages/content/src/index.ts` (38 Nebenquests `q_*`, 21 Kapitel `chronicle_01–21`, 60 Dailies `daily_*`, Token-Regale, 15 `camp_*`-Gebäude, 28 Eliten `elite_*`, Wochensegen), `packages/shared/src/index.ts` (QuestDef: `loreText`, `requires`, `repeatable`, `daily`, `difficulty`, `maxTotalLevel`; sieben Zieltypen), `packages/engine/src/quests.ts` (`pickDailyQuests`: 6 Karten, max. 2 je Stufe, min. 2 Nicht-Kampf), `packages/engine/src/blessing.ts` (sieben Wochentags-Segen, lokaler Kalendertag), `apps/client/src/renderer/pages/QuestsPage.tsx` + `util/questStrands.ts` (Stränge mit Sprecher: Wächter, Brenna, Urga) + `util/npcVoice.ts` (bedingte NPC-Zeilen), `design/lore/*` (Bibel v3, Aschechronik v2.1, Encampment v2, New-Haven-Ausbau v1, Wächter-Stimmen v2, Slayer-Turm v1).
**Sprachregeln:** Alle spielersichtbaren Beispieltexte unten sind gesprochenes Register (Stimm-Regeln v2), höchstens EIN Gedankenstrich je Text, keine Zahlen im Erzähltext, DE + EN.

---

## Vorbemerkung: Ausgangslage aus Lore-Sicht (Befunde, kurz)

Bevor Ideen kommen, drei Dinge, die schon im Bestand liegen und die jede Idee unten billiger machen:

1. **Alle sieben Gesichter existieren als Assets.** `npc_warden`, `slayermaster_brenna_ashwick`, `npc_urga`, `npc_voss`, `npc_mux`, `npc_shairi`, `npc_eske` liegen in `assets/portraits/`. Die Bank zeigt bereits Voss' Porträt, der Shop Mux' Porträt. Nur die Labels sind noch Amtstitel („Die Verwalterin / The Quartermaster", „Der Händler / The Merchant"). Die Bank-Zeile ist damit sogar ein Widerspruch: männliches Porträt, weiblicher Titel. Das ist Chef-Frage 1 (§ 4).
2. **Vier Textpakete warten fertig auf Anwendung:** der New-Haven-Nebenstrang „Die andere Spalte" (vier Quests, drei Szenen ausgeschrieben, `newhaven-ausbau-erzaehlung.md` § 2/§ 5/§ 6), die Slayer-Etagen-Intros und Zettel-Zeilen (`slayer-tower-lore.md` § 3/§ 5), zwei Raben-Post-Briefe (`waechter-stimme-pack.md` § E) und der K17/K21-Feinschliff (`aschechronik-spec.md`). 1.2.0 kann davon leben, ohne dass ein neuer Satz geschrieben wird.
3. **Die Dailies haben Kanon-Risse.** Mehrere Karten reden von Leuten, die es nicht gibt: „der Bauer wird es dir danken" (`daily_ve_kill_chickens`), „der Rancher" (`daily_ve_kill_cows`), „die Dorfgrenze" (`daily_ve_kill_goblins_5`), „Frühstück am Dock" (`daily_ve_cook_shrimp`). Die Weiden sind laut Kanon verlassen; die Höfe stehen leer. Genau diese Lücke ist die Chance: Sobald jede Bitte einen echten Absender hat (Idee 1), verschwinden die Phantom-Bauern von selbst.

---

## 1 Drei Leitgedanken

**1. Lebendig heißt: Jemand hat gemerkt, dass du weg warst.** Ein Idle-Spiel läuft, während der Spieler nicht hinsieht. Die stärkste Fiktion dafür haben wir schon: Der Wächter führt Buch, auch über das, was ohne Zuschauer geschah. Lebendig wird die Welt nicht durch mehr Ereignisse, sondern dadurch, dass Leute mit Namen davon erzählen, wenn man zurückkommt: ein Brief am Tor, ein Satz am Kessel, ein Eintrag über die Nacht.

**2. Bitten statt Zettel.** Die Tafel mit sechzig Zufallskarten ist eine Verwaltung. Eine Bitte ist ein Mensch mit einem Grund. Wenn Brenna Köpfe will, weil die Geier dreist werden, und Eske zwanzig Portionen, weil die Hände hungrig zurückkommen, dann ist dieselbe Karte plötzlich ein Gespräch, und der Dank am Abend ist der Lohn, den kein Token ersetzt. Vielfalt entsteht nicht aus mehr Zieltypen, sondern aus mehr Absendern und aus der Woche des Reachs, die jedem Tag ein Gesicht gibt.

**3. Der Ort wächst mit den Leuten, und die Chronik hält es fest.** New Haven ist die andere Spalte der Chronik: der einzige Ort, an dem Taten nicht verrechnet, sondern sichtbar werden. Gesichter kommen die Straße herauf, Feuer werden hinausgetragen, eine Glocke hängt, und wer entscheidet, hinterlässt eine Zeile. Der Wächter erzählt nicht alles, aber er verzeichnet alles, und darum fühlt sich am Ende jede Idee unten wie ein Teil desselben Buches an.

---

## 2 Elf Ideen

*Bündelung vorab, weil der Chef „wenige Systeme, die zusammen leben" will: Die Ideen 1, 2, 4 und 10 sind EIN System (die Stimm-Schicht: Absender, Briefe, Erinnerungen, Tageseintrag) und teilen sich die Auslöser. Die Ideen 5, 6 und 8 sind der New-Haven-Bogen. Idee 3 ist der Kalender. Idee 7 ist die eine echte Entscheidung. Die Ideen 9, 11 und 12 sind Farbe und fast umsonst.*

### Idee 1 — Die Tafel bekommt Absender (The Board Gets Senders)

**Spielererlebnis.** Jede Daily-Karte zeigt, wer bittet: Brenna für Köpfe, Urga für Barren, Eske für Gerichte, Shairi für Sammelgut, Voss als Zettel für Bestand, Mux für Kram, der Wächter für Gesamtzahlen. Auf der Karte steht ein kurzer Satz in der Stimme dieser Person, und beim Einlösen antwortet sie mit einem Dank. Abends steht auf der Tafel nicht „6/6 erledigt", sondern sechs Leute, die etwas bekommen haben.

**Engine/Idle-Weg.** Kein Umbau der 60 Defs nötig: Der Sprecher lässt sich wie in `questSpeaker()` regelbasiert aus Zieltyp und Ziel ableiten (`kill_monster` → Brenna; `craft_items` Barren → Urga; `craft_items` Speisen → Eske; `gather_items` → Shairi; `kill_total` → Wächter; Leder/Kram → Mux). Optional ein additives `speaker`-Feld an `QuestDef` für Ausnahmen. Bitte- und Dank-Zeilen kommen aus einem kleinen Pool je Sprecher und Kategorie und werden deterministisch aus Tagesstempel + Quest-ID gewählt, damit die Karte nicht flackert. Reine Anzeige, kein State, offline irrelevant.

**Beispielzeilen (Bitte / Dank):**
- Brenna: DE „Zwanzig Köpfe aus den Aschfeldern. Die Geier werden dreist." · EN "Twenty heads from the Ashfields. The vultures are getting bold." / DE „Geliefert. Bezahlt wird am Tor." · EN "Delivered. Payment is at the gate."
- Eske: DE „Der Kessel ist leer, und die Hände kommen hungrig zurück. Koch mir etwas." · EN "The kettle is empty, and the hands come back hungry. Cook me something." / DE „Das reicht bis morgen. Setz dich, du isst zuerst." · EN "That will last till tomorrow. Sit down, you eat first."
- Urga: DE „Die Esse frisst. Barren, keine Ausreden." · EN "The forge eats. Bars, no excuses." / DE „Taugt. Sag das keinem, sonst werden sie faul." · EN "It'll do. Tell no one, they'll get lazy."
- Shairi: DE „Die Beete brauchen, was der Wald hergibt. Bring mir ein paar Handvoll." · EN "The beds need what the wood will give. Bring me a few handfuls." / DE „Was du gebracht hast, geht auf. Das tut nicht alles." · EN "What you brought is sprouting. Not everything does."
- Voss (Zettel): DE „Bestand zu niedrig. Auffüllen, zweimal zählen. V." · EN "Stock too low. Restock, count twice. V."

**Art-Bedarf.** Bestand (sieben Porträts vorhanden).
**Aufwand.** S (Ableitungs-Tabelle + rund 36 Zeilen; Text-Pass über die Phantom-Bauern der 60 Dailies kommt dazu, siehe Vorbemerkung).
**Risiko.** Jede Zeile kostet sieben Sprachen; der Pool muss klein bleiben. Die Zuordnung darf nicht wackeln (Brenna für Kills, immer).
**Abhängigkeiten.** Chef-Frage 1 (Namen statt Amtstitel). Idee 3 nutzt dieselben Sprecher.

### Idee 2 — Raben-Post: Briefe am Morgen (Raven Post)

**Spielererlebnis.** Wer zurückkommt, findet Briefe am Tor: Brenna nach dem ersten Champion (mit Proviant), der Wächter nach dem ersten Unique, Eske nach einer Todesserie (mit Brot), Voss, wenn das Gewölbe voll ist, Mux, wenn ein neues Regal öffnet, der Bautrupp, wenn New Haven etwas fertiggestellt hat. Briefe sind kurz, haben manchmal einen Anhang, und sie stapeln sich nicht. Man liest sie zum Kaffee, und sie sind der Beweis, dass die Nacht jemandem aufgefallen ist.

**Engine/Idle-Weg.** Auslöser sind bestehende Zähler und Breadcrumbs (`stats.deaths`, `lastEliteSpawn`, claimed-Set, `camp.buildSeq`, `OfflineSummary.campBuilds`, Bank-Füllstand). Neuer additiver State `mail` (Brief-ID, Tagesstempel, gelesen, Anhang abgeholt), SAVE-Bump mit Migration „leeres Postfach". Die Trigger-Auswertung läuft nach dem Offline-Catch-up, damit Briefe „über Nacht" entstehen; jeder Brief-Def hat `once` oder einen Tages-Cooldown, und es liegen nie mehr als drei ungelesene am Tor (ältere wandern ins Archiv). Anhang läuft über die bestehende Reward-Pipeline, wie ein Quest-Claim. Kein RNG: Briefe sind eine Funktion des States.

**Neuer Brief (Beispiel, Eske nach vielen Toden):**
> DE: Man sagt mir, du fällst öfter, als dir guttut. Ich frage nicht, wo. Im Beutel ist Brot, mehr als du brauchst, damit du es nicht einteilst. Iss, bevor du wieder gehst.
> Eske
> EN: They tell me you fall more often than is good for you. I'm not asking where. There's bread in the pouch, more than you need, so you won't ration it. Eat before you go out again.
> Eske

**Art-Bedarf.** Bestand für Absenderköpfe. Neu, klein: ein Brief-/Siegel-Icon für die Top-Bar und je Absender ein Siegel-Emblem, ableitbar aus den charakteristischen Details der Porträt-Specs (Buchschließe, Zahn-Kette, Hammer, Löffel, Saatperle, Zählkerbe). Notfalls tut es `icon_quest_journal`.
**Aufwand.** M.
**Risiko.** Brief-Spam ist der Tod der Idee; die Regel „höchstens einer je Absender je Woche, nie zwei am selben Morgen" gehört in die Engine. Übersetzungslast: ein Brief hat 50 bis 70 Wörter mal sieben. Anhänge sind Balance-Revier.
**Abhängigkeiten.** Das fehlende Signal „Kapitel gerade abgeschlossen" (`npcVoice.ts` vermerkt es) wäre hier zu bauen und würde zugleich die geparkten Zeilen `npc.shop.chapter`/`npc.quests.chapter` freischalten. Die beiden Briefe aus `waechter-stimme-pack.md` § E sind sofort verwendbar.

### Idee 3 — Die sieben Tageslaunen (The Seven Moods of the Reach)

**Spielererlebnis.** Jeder Wochentag hat bereits einen Segen mit Namen. Jetzt bekommt er eine Vorgeschichte in zwei Sätzen, ein Gesicht und eine Bitte des Tages. Samstag ist Blutmond: Brenna hängt eine Blutmond-Jagd ans Brett, und der Wächter sagt, warum die Bestien dreist sind. Donnerstag ist Karrentag: Mux' Karren steht am Händlerposten, Mux hat eine Wunschliste. Nach zwei Wochen kennt der Spieler die Woche des Reachs wie einen Kalender, und „heute ist Dienstag" heißt etwas.

**Engine/Idle-Weg.** Optionales Daily-Feld `blessing: BlessingId` (additiv) und ein siebter Tafel-Platz „Bitte des Tages" außerhalb der 6er-Mischung, fest Tag → Karte, ohne RNG. Der Wochentag ist lokal und deterministisch (`blessing.ts`), also offline-sicher. Je Tag drei Stufen (früh/mittel/spät), damit jedes Level-Band eine erfüllbare Tages-Bitte hat: 21 Karten. Segens-Lore als Tooltip am Segen-Chip: sieben Kurztexte des Wächters.

**Die Woche des Reachs (Vorschlag, je ein Satz Vorgeschichte + Sprecher):**

| Tag | Segen (Content) | Vorgeschichte in einem Satz | Absender der Tages-Bitte |
|---|---|---|---|
| Sonntag | Moderluft (Rotmist) | Der Nebel aus den Gräben der Aschfelder, seit das Begraben aus der Mode kam; er bringt Dinge nach oben, die unten lagen. | Eske (Kessel-Tag: kochen) |
| Montag | Nebelwacht (Mist Vigil) | Die Nacht, in der die Wegwächter ihre Feuer doppelt besetzten; wer wach bleibt, lernt. | Der Wächter (Fertigkeiten) |
| Dienstag | Aschesturm (Ashen Storm) | Wind von den Feldern; er legt frei, was unter dem Grau lag. | Shairi (sammeln) |
| Mittwoch | Stille (Silence) | Der Tag, an dem das Reach seine Bildnisse zerschlug und niemand mehr betete; seither ein Tag für Arbeit. | Urga (Barren, Werkstücke) |
| Donnerstag | Gier des Reachs (Greed) | Karrentag: Mux' Karren kommt, wenn die Straße es zulässt, und die Preise sind fair, sagt Mux. | Mux (Kram, Leder, Verkauf) |
| Freitag | Wilde Jagd (Wild Hunt) | Kaenors Ritus; die Hörner hört man bis zur Furt, und der Wald zählt mit. | Brenna (Wildwald/Weiden-Jagd) |
| Samstag | Blutmond (Blood Moon) | Die Bestien sind dreist, ihre Bälge mehr wert; keiner weiß, wer den Mond färbt, und Brenna fragt nicht. | Brenna (Köpfe) |

**Art-Bedarf.** Bestand (Segen-Chips, Porträts).
**Aufwand.** S–M (Filterfeld, siebter Platz, 21 Karten, 7 Kurztexte).
**Risiko.** Kalenderbindung: Wer samstags nie spielt, sieht die Blutmond-Jagd nie. Das ist gewollt (die Welt hat eine Woche), aber es ist Chef-Frage 3. Die Segens-Namen sind Content-Kanon und bleiben; die Vorgeschichten dürfen nicht mehr behaupten als einen Satz.
**Abhängigkeiten.** Idee 1 (Absender). Counts der 21 Karten: balance-designer.

### Idee 4 — Figuren, die sich erinnern (Faces That Remember)

**Spielererlebnis.** Nach Kapitel 7 sagt Eske am Kessel etwas über den Aschtyrannen. Nach dem ersten Champion nennt Brenna ihn „der mit dem Namen". Voss zählt die Kapitel-Andenken im Gewölbe. Wer nach dem Offline-Cap zurückkommt, hört von Mux: „Ich hatte dich schon abgeschrieben." Nichts davon ist eine Quest, alles ist Anerkennung, und der Spieler merkt: Diese Leute wissen, was ich getan habe.

**Engine/Idle-Weg.** Reine Lese-Regeln auf bestehendem State (claimed-Set, `stats`, `eliteZones`, `camp`, Offline-Dauer). `resolveNpcVoiceKey` bekommt eine weitere Ebene „Meilenstein-Erinnerung", Priorität unter Elite und über Segen, mit einer Frische-Regel: eine Erinnerung ist in den ersten Tagen nach dem Meilenstein bevorzugt und fällt danach in die Rotation. Kein neuer State.

**Beispielzeilen:**
- Eske nach Kapitel 7: DE „Der Aschtyrann, sagen sie. Gut. Dann kommt der Wind heute ohne Geier." · EN "The Ash Tyrant, they say. Good. Then the wind comes without vultures today."
- Voss nach Kapitel 14: DE „Die See gibt niemanden frei. Ich habe die Konten mit dem Vermerk Flucht geschlossen. Es waren viele." · EN "The sea lets no one go. I closed the accounts marked flight. There were many."
- Mux nach langer Abwesenheit: DE „Ich hatte dich schon abgeschrieben. Preise für Wiedergänger: dieselben." · EN "I had already written you off. Prices for revenants: the same."
- Brenna nach vielen Aufträgen: DE „Die Wand ist voll. Ich habe anbauen lassen." · EN "The wall is full. I had it extended."
- Urga nach dem ersten Götzeneisen-Barren: DE „Du hast das Kranzmetall geschmolzen. Wasch dir danach die Hände. Ich meine das ernst." · EN "You smelted the wreath metal. Wash your hands afterward. I mean that."

**Art-Bedarf.** Bestand.
**Aufwand.** S je Paket (sechs Figuren mal vier Meilensteine = 24 Zeilen).
**Risiko.** Ohne Frische-Regel wiederholt sich die Erinnerung, bis sie eine Floskel ist. Text mal sieben.
**Abhängigkeiten.** Chef-Frage 1. Teilt sich Auslöser mit Idee 2.

### Idee 5 — Die andere Spalte: New Haven bekommt Bewohner (The Other Column)

**Spielererlebnis.** Nach Kapitel 9 kommt zum ersten Mal jemand die tote Straße herauf und bleibt: eine alte Frau mit einer Laterne ohne Öl. Nach Kapitel 10 wird New Haven bemerkt, das Becken auf dem Turm brennt rot, und der Spieler geht hinaus und antwortet. Die Siedler nennen den Ort beim Namen, bevor der Wächter ihn einträgt, und nach Kapitel 14 hängt die Glocke. Dazu tauchen die sechs Gesichter der Glutfeste an „ihren" Gebäuden auf: Mux am Händlerposten an Karrentagen, Urga nach den ersten Offline-Barren am Schmelzofen, Shairi ab Saatgarten III, Brenna an der Trophäenwand, Eske nach Kapitel 14 auf dem Platz, Voss als angeschlagener Zettel am Speicher. Wer baut, sieht Gesichter.

**Engine/Idle-Weg.** Vier Nebenquests auf dem bestehenden Quest-System, gegated per `requires` auf Chronik-Kapitel; alle vier Chronik-Texte liegen in `newhaven-ausbau-erzaehlung.md` § 2, § 5 und § 6 abnahmefertig vor. Die Gesichter an Gebäuden sind Anzeige-Hooks „Figur X an Gebäude Y, wenn Bedingung Z" (Lese-Regeln auf Gebäude-Stufe, claimed-Set, Wochentag). Offline: Quests zählen wie immer, der Bautrupp meldet wie bisher.

**Art-Bedarf.** Stufe A (die Sechs als Besucher): null neu. Stufe B (die alte Maren als eigene Siedlerin, Glöcknerin ab Kapitel 14): ein Porträt `npc_maren.png`, Spec liegt vor (`newhaven-ausbau-erzaehlung.md` § 8). Ohne Porträt bleibt sie „die Alte mit der Laterne" in der Wächter-Erzählung, und die Szenen funktionieren trotzdem.
**Aufwand.** S–M (Stufe A + vier Quests), M mit Maren.
**Risiko.** `gather_items` zählt generisch, kein Item-Ziel: Die Glocken-Bronze wird erzählt, nicht gefordert (oder logic-dev ergänzt ein Ziel-Item, additiv). NPC-Köpfe auf dem Lager-Screen brauchen einen Platz im Raster (ui-dev).
**Abhängigkeiten.** Die fünf offenen Chef-Fragen des New-Haven-Papiers (Namens-Stand, Maren-GO, Besuchslogik, Kulissen-Priorität, Vorboten-Rahmung). Chef-Frage 1 hier.

### Idee 6 — Die Feuerlinie (The Fire Line): eine Kette entlang der Wächterstraße

**Spielererlebnis.** Der Wächter bittet, die alten Wachfeuer der Wegwächter (Road Wardens) wieder anzuzünden, Station um Station, von New Haven hinaus in die Grenzlande und die Aschfelder. Jede Station verlangt Holz und Kohle, dann eine Nacht Wache in der Zone, und am Morgen meldet der Wachturm: „Zwei Feuer auf der Straße." Am Ende sieht man von New Haven aus eine Linie aus Lichtern, und Mux stellt fest, dass die Straße besser geworden ist. Die Feuerlinie, die von außen nach innen erlosch, kehrt von innen nach außen zurück. Das ist die Gründungsgeschichte New Havens, vom Spieler selbst zu Ende erzählt.

**Engine/Idle-Weg.** Fünf Quests mit bestehenden Zieltypen (`gather_items`, `craft_items` Kohle/Balken, `kill_monster` in der Zone der Station), sequenziell per `requires`, Einstieg ab Kapitel 4 (die Mark ist erklärt). Der Stand „Feuer der Linie" ist aus dem claimed-Set ableitbar, kein neuer State. Nach Abschluss eine wöchentlich re-armende `repeatable`-Quest „Feuerwache": Die Feuer wollen genährt werden, und wer nährt, bekommt Tokens und eine Zeile. Wichtig für Regel 1: Die Feuer gehen NIE aus. Wer die Wache nicht hält, verliert nichts; er bekommt nur den Bonus der Woche nicht.

**Wächter-Text für Station 1 (Beispiel):**
> DE: Die Wegwächter hielten eine Linie aus Feuern, eine Tagesreise auseinander, von den Kernlanden bis zur Mark. Sie erlosch von außen nach innen und blieb an deiner Furt stehen. Ich bitte dich um das Gegenteil: Trag sie wieder hinaus. Das erste Feuer steht dort, wo die Straße den Bach verlässt. Holz und Kohle dorthin, und eine Nacht bleiben. Wer die erste Nacht übersteht, hat die Station.
> EN: The Road Wardens kept a line of fires, a day's walk apart, from the heartlands to the march. It went out from the outside in and stopped at your ford. I ask you for the opposite: carry it back out. The first fire stands where the road leaves the stream. Wood and coal to that spot, and stay the night. Whoever lasts the first night holds the station.

**Art-Bedarf.** Bestand. Optional ein Overlay mit ein bis fünf Lichtpunkten auf der New-Haven-Kulisse (kein neues Bild, ein Layer).
**Aufwand.** M.
**Risiko.** Darf keine Verlust-Mechanik werden (siehe oben). Die Stationen sind Erzählung, keine Karten-Orte: kein neuer Schauplatz, keine neue Zone.
**Abhängigkeiten.** `encampment-lore.md` § 1.3 (Kanon der Wächterstraße), Idee 5. Eine Aufwertung des Wachturm-Bonus je Feuer wäre balance-Revier und nicht nötig.

### Idee 7 — Mux' Halbmarke (Mux's Half-Mark): eine Kette mit Entscheidung

**Spielererlebnis.** Am Hehlerzelt taucht ein junger Goblin auf, Tarrik, der wie Mux die Kriegsbande verlassen hat. Die Bande sucht ihn, und Brenna hat ein Kopfgeld auf seinen Namen, denn er trug die Marke eines Offiziers. Der Spieler stellt erst die Späher, die ihm folgen, und entscheidet dann: Tarrik an Brenna ausliefern (Kopfgeld, ihr Respekt, Mux' Schweigen für eine Weile) oder ihn in New Haven behalten (er bleibt als Siedler am Hehlerzelt, Mux' Preise werden besser, Brenna ist eine Weile kurz angebunden). Beides steht danach in der Chronik, und die Figuren erinnern sich daran (Idee 4). Keiner der beiden Wege ist der falsche; der Wächter sagt das ausdrücklich.

**Engine/Idle-Weg.** Drei Quests Kette (Spuren an der Straße, Späher stellen, Tarrik reden lassen), dann zwei Abschlussquests, die sich gegenseitig ausschließen. Dafür braucht das Quest-System EIN neues, additives Feld `excludes: string[]` (eine Quest wird unwählbar, sobald eine ausgeschlossene eingelöst ist). Folgen sind Text, je eine NPC-Erinnerungszeile und ein unterschiedliches Andenken. Gegner sind bestehende Goblin-Varianten der Grenzlande; kein neues Monster. Ohne `excludes` gibt es die schwächere Variante „erzählte Entscheidung": beide Enden sichtbar, der Wächter rahmt die Wahl, beide bleiben einlösbar. Das ist Chef-Frage 2.

**Wächter-Text zur Entscheidung (Beispiel):**
> DE: Brenna will den Kopf, Mux will den Jungen, und beide haben recht auf ihre Art. Ich entscheide das nicht. Ich trage ein, was du tust, und ich werde es nicht bewerten. Das hier ist nicht das erste Mal, dass das Reach wählen musste, wen es aufnimmt. Es ist nur das erste Mal, dass jemand dabei zusieht.
> EN: Brenna wants the head, Mux wants the boy, and both are right in their way. I do not decide this. I enter what you do, and I will not grade it. This is not the first time the Reach has had to choose whom it takes in. It is only the first time someone is watching.

**Art-Bedarf.** Ein Porträt `npc_tarrik.png` (Spec in Anhang A). Ohne Porträt bleibt Tarrik eine Sprechzeile ohne Kopf am Hehlerzelt; die Kette funktioniert, aber die Entscheidung hat dann kein Gesicht.
**Aufwand.** M (+ logic-dev für `excludes`, klein).
**Risiko.** Keine Moralkeule: Brenna ist nicht die Böse, Mux nicht der Gute. Save-Kompat unkritisch, da alle Quests neu sind. Ton: Goblins sind ein Volk, kein Comic.
**Abhängigkeiten.** Chef-Frage 2. Kanon Bibel § 3.4 (Goblins, Mux) und § 3.5.

### Idee 8 — Ereignisse mit Vorgeschichte (Events with a Past): Karrentage, Die Zählung, Die Glutnacht

**Spielererlebnis.** Drei kleine Bögen, jeder mit einem Gesicht, einem Grund, einer Wendung und einem Nachhall, der bleibt:

- **Karrentage (Cart Days).** Mux' Karren ist überfällig; die Straße ist unsicher. Der Spieler räumt die Straße (Kills in den Grenzlanden) und stellt fertig, was Mux bestellt hatte. Wendung: Der Karren bringt nicht nur Ware, sondern einen Brief aus der Glutfeste (Idee 2). Nachhall: Am Händlerposten steht der Karren, Mux hat seine Zeile „früher zwei Überfälle pro Fahrt, jetzt einer". Wiederkehrend am Donnerstag.
- **Die Zählung (The Counting).** Nach Kapitel 10 wird New Haven bemerkt: etwas Großes ist nachts den Pfahlring abgegangen und hat nichts genommen, nur gezählt. Der Spieler antwortet draußen, gerahmt über die bestehenden Eliten der Nachbarzone als Vorboten. Wendung: Was zählte, war kein Tier; der Wächter erkennt die Art des Zählens wieder, aus der Krypta, und schreibt es nicht hin. Nachhall: eine Kerbe an der Trophäenwand, das Becken auf dem Turm brennt ruhig. Einmalig, danach als kleine „Wacht"-Bitte bei jedem aktiven Champion in Nachbarzonen.
- **Die Glutnacht (Ember Night).** Die Glutfeste erinnert an die drei Nächte, in denen die Glut aus Hearthforge in einer Eisenpfanne getragen wurde. Eske kocht für alle, Urga lässt die Esse eine Nacht ohne Hammer, und der Spieler hält die Wache der drei Nächte: kochen, sammeln, Gegner stellen. Wendung: Der Wächter liest einmal im Jahr Namen laut vor, die Träger der Pfanne. Urgas Name ist darunter. Einen Namen liest er nicht, weil er ihn nie erfahren hat: den dritten Träger. Nachhall: Auf dem Platz von New Haven brennt das Wachfeuer „mit einer zweiten Glut" (Text), und es gibt ein Andenken. Auslöser: Meilenstein (z. B. Vorratsspeicher steht), dann jährlich wiederkehrend, falls Chef-Frage 3 den Kalender zulässt.

**Engine/Idle-Weg.** Alles auf `repeatable`/`requires`/optional `blessing` (Idee 3). Kein Timer, kein Verfall: Ein Ereignis ist eine Kette, die erscheint, wenn ihr Auslöser gilt, und die einlösbar bleibt, bis sie erledigt ist. Wer eine Woche fehlt, findet die Glutnacht am Tor vor, nicht verpasst. Der Nachhall ist Anzeige (Kulissen-Variante, NPC-Zeile, Wegmarke), kein neuer Systemzustand außer dem Andenken-Item.

**Art-Bedarf.** Bestand. Optional eine Kulissen-Variante „Karren angedockt" (der Händlerposten zeigt den Karren ohnehin) und ein Andenken-Item-Bild je Ereignis (kann zunächst ein bestehendes `chronicle_*`-Andenken-Bild leihen).
**Aufwand.** M je Ereignis, L für alle drei.
**Risiko.** Ein Fest in einer sterbenden Welt muss knapp bleiben: kein Jahrmarkt, keine Girlanden, ein Kessel und Namen. Kalenderbindung ist Chef-Frage 3. Der dritte Träger ist ein bewusst offener Haken; niemand muss ihn in 1.2.0 auflösen.
**Abhängigkeiten.** Idee 3 (Wochentag), Idee 5 (New Haven), Idee 2 (Brief als Wendung).

### Idee 9 — Wegmarken (Waymarks): Orte, die sich erinnern

**Spielererlebnis.** Auf der Kampfseite jeder Zone steht eine kurze Wegmarke des Wächters, die sich mit dem Stand ändert. Aschfelder vor Kapitel 7: „Über den Feldern herrscht der Aschtyrann." Danach: „Die Geier haben einen neuen gekürt. Er ist kleiner." Bei aktivem Champion: „Einer mit Namen läuft hier herum. Ich hätte den Namen gern." Der Ort erzählt, was der Spieler hier getan hat, und die Zone fühlt sich nicht mehr wie eine Liste an.

**Engine/Idle-Weg.** Content-Tabelle `zoneWaymarks` (Zone × Zustand → Text); Zustand abgeleitet aus claimed-Set und `eliteZones`; reine Anzeige. Zehn Zonen mal drei Zustände = dreißig Kurztexte, je zwei Sätze.

**Beispiel Krypta:** vor K11: DE „Die Tiefe steht offen, und die Toten sind wieder diensttauglich. Ich kenne die Gänge. Frag nicht, woher." · EN "The deep stands open, and the dead are fit for duty again. I know these corridors. Don't ask how." Nach K11: DE „Der Kastellan ist gefallen. Die Garnison weiß es noch nicht. Sie wird es nie wissen." · EN "The castellan has fallen. The garrison doesn't know it yet. It never will."

**Art-Bedarf.** Bestand (Zonenbilder).
**Aufwand.** S–M.
**Risiko.** Text mal sieben; Wegmarken müssen knapper sein als Chronik-Texte, sonst liest sie niemand.
**Abhängigkeiten.** Keine.

### Idee 10 — Der Tageseintrag (The Day's Entry): die Chronik führt Tagebuch

**Spielererlebnis.** Ein neuer Reiter in der Chronik zeigt die letzten sieben Tage als Einträge des Wächters: „Dienstag, Aschesturm. Vierzig Aschratten, Brennas Bitte erfüllt, Urga hat den Ofen gelobt. Nachts kam nichts durch." Morgens liest man, was die Nacht war, abends, was der Tag geworden ist. Die Einträge sind aus Bausteinen gesetzt, aber sie klingen wie ein Mensch, der abends kurz aufschreibt, was war. Zusammen mit den Briefen (Idee 2) ist das die Antwort auf „Wie fühlt sich lebendig an, wenn man nur nebenbei hinsieht": Jemand hat mitgeschrieben.

**Engine/Idle-Weg.** Kleiner Ringpuffer `journal` mit sieben Tages-Einträgen im State (additiv, SAVE-Bump, Migration „leer") und je Tag ein Handvoll Zähler: Kills, Gesammeltes, Gefertigtes, eingelöste Bitten, Tode, Bauten, Champion-Kills, abgeschlossenes Kapitel. Die Nacht schreibt sich beim Offline-Catch-up in den Eintrag; `OfflineSummary` liefert die Zahlen bereits. Satzbausteine mit Bedingungen nach dem Muster des Offline-Pakets (§ A der Stimm-Regeln): Kopfzeile immer, höchstens drei Ereigniszeilen, Ruhe-Zeile nur, wenn nichts greift.

**Art-Bedarf.** Bestand (`icon_quest_journal`).
**Aufwand.** M (State + rund 40 Bausteine).
**Risiko.** Bausteine dürfen nicht wie ein Log klingen; Register v2 gilt. Zahlen sind hier erlaubt (es ist Buchführung), Schwellen setzt ui-dev.
**Abhängigkeiten.** Teilt Zähler mit Idee 2, Wochentag-Namen mit Idee 3.

### Idee 11 — Der Turm bekommt Stimme (The Tower Speaks): fertiges Textpaket

**Spielererlebnis.** Beim ersten Betreten jeder Slayer-Etage spricht Brenna (Etage 6, falls sie kommt: der Wächter, weil Brenna dort schweigt), und jeder Auftragszettel trägt eine Zeile in ihrer Stimme, je nach Etage des Ziels. Der Turm hört auf, eine Liste zu sein, und Brenna hört auf, über alles zu schweigen (Tester-Befund R3).

**Engine/Idle-Weg.** Ein additives Flag „Etage gesehen" (SAVE-Bump), die Zettel-Zeile deterministisch per Task-Seed. Alle Texte liegen in `slayer-tower-lore.md` § 3 (Intros, Tooltips) und § 5 (13 Zettel-Zeilen + 3 Welt-Zeilen) fertig vor; die fünf Bestandsetagen brauchen keine Content-Erweiterung.

**Art-Bedarf.** Bestand.
**Aufwand.** S–M.
**Risiko.** Keins. Wartet seit 17.07. auf Chef-GO (§ 9 des Turm-Papiers).
**Abhängigkeiten.** Chef-GO Slayer-Turm.

### Idee 12 — Begleiter mit einem Satz (Companions with a Line)

**Spielererlebnis.** Jeder Begleiter bekommt beim ersten Fund eine Zeile des Wächters und eine Herkunft in einem Satz im Bestiarium: woher das Tier kommt, warum es geblieben ist. Die Offline-Zeile „Dir ist unterwegs etwas zugelaufen" existiert schon; das hier ist ihr Gegenstück beim Hinsehen.

**Engine/Idle-Weg.** Reine Anzeige an bestehende Companion-Defs (optionales `loreText`-Feld, wie bei Quests). Kein State.
**Art-Bedarf.** Bestand (Companion-Bilder existieren).
**Aufwand.** S.
**Risiko.** Companion-/Rekruten-Fiktion ist per Chef-Entscheid (0.3.0) nicht ausgearbeitet; ein Satz Herkunft ist keine Missions-Lore und bricht nichts, sollte aber als Grenze so benannt werden.
**Abhängigkeiten.** Keine.

---

## 3 Ein Tag im Leben (mit diesen Ideen)

Morgens öffnet der Spieler das Spiel, und am Tor liegen zwei Briefe: einer von Brenna, weil in der Nacht der erste Champion gefallen ist, mit Proviant, und einer vom Bautrupp, weil der Vorratsspeicher steht. Der Tageseintrag der Nacht steht darunter: Dienstag, Aschesturm, sechzig Kills, nichts kam durch den Pfahlring. Auf der Tafel bittet Shairi um Sammelgut, weil der Sturm freilegt, was unter dem Grau lag, und Brenna will Köpfe aus den Aschfeldern, weil die Geier dreist werden. Der Spieler legt die Warteschlange: erst sammeln für Shairi, dann in die Aschfelder für Brenna, dann die dritte Station der Feuerlinie, und geht zur Arbeit.

Mittags ein kurzer Blick: Die Wegmarke der Aschfelder sagt, dass einer mit Namen dort herumläuft, und Voss am Gewölbe merkt trocken an, dass er nichts versichert, was man da draußen bei sich trägt. Der Spieler hängt den Champion vorn an die Schlange und schließt das Fenster wieder.

Abends sind die Bitten erfüllt: Eske bedankt sich am Kessel, Shairi sagt, dass etwas aufgeht, und Brenna hat den Namen des Champions für das Buch bekommen. Der Wachturm meldet drei Feuer auf der Straße, und Mux stellt fest, dass die Straße besser geworden ist. Am Hehlerzelt wartet Tarrik immer noch auf eine Entscheidung, und der Spieler schiebt sie auf morgen, was der Wächter ohne Kommentar einträgt. Der Tageseintrag schließt mit einem Satz, und der Spieler weiß, dass die Nacht wieder jemandem auffallen wird.

---

## 4 Drei Fragen an den Chef

1. **Namen statt Amtstitel, und wie viele Gesichter?** Die Bank zeigt heute Voss' Porträt unter „Die Verwalterin", der Shop Mux' Porträt unter „Der Händler". Dürfen die Sechs überall unter ihren Namen auftreten (zwei Label-Keys mal sieben Sprachen, sonst nichts)? Und wie groß darf der Kader für 1.2.0 werden: nur die Sechs (null neue Porträts), plus Maren (eines), plus Tarrik (zwei)? Mira ist auf Start-Charaktere gebucht; jedes neue Gesicht ist ein Slot, den sie nicht hat.
2. **Echte Entscheidung oder erzählte?** Für eine Kette mit zwei Enden braucht das Quest-System ein kleines additives Feld `excludes` (nur eines der beiden Enden ist einlösbar). Ist das gewollt, oder sollen Entscheidungen erzählt bleiben (beide Wege sichtbar, der Wächter rahmt die Wahl, nichts wird verschlossen)? Die erste Variante macht Figuren, die sich erinnern, glaubwürdig; die zweite ist risikolos und flacher.
3. **Kalender oder Meilenstein?** Sollen Ereignisse an der echten Woche und am echten Jahr hängen (Blutmond-Jagd nur samstags, Glutnacht einmal im Jahr, die Welt hat einen Kalender, den man auch verpassen kann) oder nur an Meilensteinen des Spielstands (nichts verpassbar, aber die Welt wartet auf den Spieler)? Meine Empfehlung ist ein Hybrid: kleine Wochentags-Bitten am Kalender, große Ereignisse am Meilenstein, und nichts, was verfällt, während der Spieler offline ist.

---

## 5 Prüfliste für die anderen Perspektiven (Vorabliste)

Was ich an den Ideen der anderen Agenten kritisch gegenlesen möchte, bevor etwas gebaut wird:

1. **Absender-Pflicht.** Jede „Welt-Laune", jedes Ereignis, jeder Bonus braucht eine Person mit einem Grund. Ein anonymer Buff „+10 % XP heute" ist kein Leben, es ist ein Multiplikator. Die Segen haben schon Namen; jede neue Laune braucht Absender und einen Satz Vorgeschichte.
2. **Kein Verfall, kein Timer-Zwang.** Fenster ja, Verlust nie. Ein Ereignis, das abläuft, während der Spieler acht Stunden offline ist, bricht Regel 1 und die Fiktion des Wächters, der wartet.
3. **Kanon-Namen und Orte.** New Haven bleibt unübersetzt, die Heimstatt heißt Glutfeste (Emberhold), nicht „das Lager", nicht Hearthforge (gefallen). Es gibt keine Bauern, Rancher, Dörfer oder Docks: Die Weiden sind verlassen, die Höfe leer, die Furt hat einen Steg, keinen Hafen. Bestehende Dailies verstoßen (siehe Vorbemerkung); ein Text-Pass gehört in jeden Daily-Vorschlag.
4. **Der Fremde bleibt namenlos bis Kapitel 20.** Dailies, Events und NPC-Zeilen dürfen „geliehenes Feuer" sagen, nie den Gläubiger. Drazhan fällt in keinem Nebentext.
5. **Der Wächter verzeichnet.** Er kämpft nicht, baut nicht, steigt nicht, befiehlt nicht. Wer ihn als Auftraggeber nutzt: Er bittet und trägt ein. Brenna spricht in Köpfen und Lohn und schweigt über die Zellen. Voss reist nicht (Zettel). Die Sechs ziehen nie nach New Haven um; sie besuchen.
6. **Tag/Nacht, Wetter, Jahreszeiten.** Falls vorgeschlagen: Die Asche bleibt unten, der Hochland-Himmel ist sauber, der Blutmond ist ein Segen-Name und kein Astronomie-System, der Schrein der Stillen bleibt bildlos. Ein erster Frost existiert im Kanon (Szene A); Schnee in den Weiden nicht.
7. **Kader-Disziplin.** Jede benannte neue Figur braucht Porträt-Spec, Mira-Slot und einen Platz, an dem sie steht. Vorschläge ohne Gesicht (Zettel, Bautrupp, „die Hände") sind billiger und oft besser. Die vier neuen Völker des Charakter-Codex (Duvra, Sesskar, Aschgänger, Faryn) warten auf Chef-GO und dürfen nicht als Siedler eingeplant werden, bevor die Bibel nachgezogen ist.
8. **Text-Budget.** Sieben Sprachen. Jede Idee sollte ihre Zeilenzahl ausweisen; Pools statt Einzelzeilen; Register v2 (gesprochen, keine Aphorismen, keine Buch-Poesie, höchstens ein Gedankenstrich).
9. **Companion-Missionen.** Die Companion-/Rekruten-Fiktion ist per Chef-Entscheid nicht ausgearbeitet. Wer Begleiter losschickt, braucht zuerst die Fiktion, dann die Mechanik.
10. **Keine neuen Zonen als Schauplatz für Geschichten.** Die Feuerlinie, die Karrentage, die Zählung spielen in bestehenden Zonen; Stationen und Straßen sind Erzählung, keine Karten-Orte. Neue Schauplätze sind ein anderes Update.
11. **Belohnungen und Counts.** Bleiben balance-Revier; Erzähltexte nennen keine Stückzahlen, damit Counts frei bleiben. Wer Andenken-Items vorschlägt: keine Kampfwerte, wie bei den Kapitel-Andenken.

---

## Anhang A — Aussehens-Vorlagen neuer Figuren (Chef-Direktive: jede benannte Figur bekommt eine Spec)

**Stilregeln (Projekt-Kanon):** gemalter Dark-Fantasy-Stil wie die Spieler-Porträts, KEIN Glühen, transparenter Hintergrund, Kopf/Schulter-Ausschnitt für das NPC-Kopf+Sprechblasen-Muster. Format: Name → Datei → Beschreibung.

**Tarrik Halbmarke (Tarrik Halfmark) → `npc_tarrik.png`** *(Idee 7; nur bei Chef-GO)*
Junger Goblin, drahtig, deutlich kleiner als ein Mensch (Codex-Profil, rund anderthalb Meter); dunkelgrüne Haut, ein Ohr an der Spitze gekerbt, keine Ringe. Müder, wachsamer Blick ohne Grinsen, das ist der Kontrast zu Mux. Kurzes schwarzes Haar, stoppelig geschoren. Lederkoller der Kriegsbande mit abgetrennten Abzeichen, an der Brust sichtbare Nähte, wo die Bandenmarke saß. Charakteristisches Detail: eine **halbe Sold-Marke aus Messing** an einer Schnur um den Hals, die Bruchkante grob, die andere Hälfte hat die Bande. Farbwelt: Dunkelgrün, verblichenes Bandenrot, stumpfes Messing.

**Die alte Maren (Old Maren) → `npc_maren.png`** *(Idee 5, Stufe B; nur bei Chef-GO)*
Spec liegt vollständig in `design/lore/newhaven-ausbau-erzaehlung.md` § 8 vor (ausgebrannte Eisenlaterne als Detail, bewusst ohne Licht). Hier nicht wiederholt, damit es nur eine Fassung gibt.

*Keine weiteren neuen Figuren. Der dritte Träger der Glutpfanne (Idee 8) bleibt bewusst namenlos und ohne Gesicht.*

---

## Anhang B — Glossar-Nachtrag (Vorschlag, erst nach Chef-Abnahme in die Bibel § 9 übernehmen)

| DE | EN | Bemerkung |
|---|---|---|
| Raben-Post | Raven Post | Brief-System der Glutfeste (Fiktion aus `waechter-stimme-pack.md` § E) |
| die Tageslaune | the day's mood | Wochentag mit Segen, Vorgeschichte, Absender und Tages-Bitte |
| die Bitte des Tages | the day's request | siebter Tafel-Platz, fest an den Wochentag gebunden |
| die Feuerlinie | the Fire Line | Kette entlang der Wächterstraße; die Wachfeuer der Wegwächter |
| die Feuerwache | the fire watch | wöchentlich re-armende Pflege-Bitte nach Abschluss der Feuerlinie |
| die Halbmarke | the Half-Mark | Tarriks zerbrochene Sold-Marke; Titel der Entscheidungs-Kette |
| Karrentage | Cart Days | Mux' Donnerstag; Karren am Händlerposten |
| Die Zählung | The Counting | Ereignis nach Kapitel 10 (New Haven wird bemerkt), Ausbau von Szene C |
| Die Glutnacht | Ember Night | Gedenken an die drei Nächte der Glutpfanne aus Hearthforge |
| der dritte Träger | the third bearer | bewusst offener Haken der Glutnacht; kein Name, kein Gesicht |
| die Wegmarke | the waymark | zustandsabhängiger Wächter-Kurztext je Zone |
| der Tageseintrag | the day's entry | Tagebuch-Reiter der Chronik, sieben Tage |
| Tarrik Halbmarke | Tarrik Halfmark | Goblin-Deserteur (NUR bei Chef-GO), Idee 7 |

---

## Offene Fragen an den Chef

Die drei richtungsentscheidenden Fragen stehen in § 4. Darunter, kleiner:

4. Darf der Text-Pass über die 60 Dailies (Phantom-Bauern, Rancher, Dock, Dorfgrenze) in 1.2.0 mitlaufen, auch wenn keine der Ideen oben gebaut wird? Es sind reine Anzeigetexte, keine IDs, keine Ziele.
5. Sollen die vier fertigen Textpakete (New-Haven-Nebenstrang, Slayer-Etagen, Raben-Post-Briefe, K17/K21-Feinschliff) als Sockel von 1.2.0 gelten, bevor Neues geschrieben wird? Ich würde es empfehlen: Es ist der billigste Weg zu „lebendig", und alle vier warten auf Chef-GO.
