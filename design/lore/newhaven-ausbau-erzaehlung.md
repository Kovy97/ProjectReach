# New Haven — Ausbau der Erzählung (Design-Brainstorm)

**Status:** v1 (Lore-Dev, 2026-08-03) — Design-Brainstorm auf CEO-Auftrag. NUR Dokument; keine Umsetzung, keine Änderung bestehender Docs. Alle Mechanik-Folgen stehen als Empfehlungen an content-dev/logic-dev/ui-dev, Umsetzung nur auf CEO-Order.
**Grundlagen:** `design/lore/encampment-lore.md` (v2 — Gründungsbogen, Ausbaustufen, 15 Gebäude, „die Hände"), `design/lore/weltlore-grim-reach.md` (v3 — KANON), `design/lore/aschechronik-spec.md` (v2.1 — Kapitel 1–21, Quest-System-Fähigkeiten), `design/encampment-konzept.md` (Eiserne Regeln). Content-Kanon geprüft: Nebenquest-Stränge (`q_first_steps` … `q_smith_master`) und das Elite-System (`elite_<zone>_*` je Zone) in `packages/content/src/index.ts`.
**Sprachregeln:** Alle spielersichtbaren Beispieltexte folgen der Direktive „natürliche Spieltexte": höchstens EIN Gedankenstrich pro Text, keine starren Dreier-Parallelismen.

---

## § 0 Leitgedanke — der Ort, an dem die Geschichte ankommt

Die Aschechronik ist als Buch über Verlorenes gebaut; ihre stärkste Zeile über New Haven steht schon im Gründungsbogen: *„Der erste Posten in der anderen Spalte ist klein: ein Feuer an der alten Straße, und einer, der nicht weitergeht."* (encampment-lore § 1.1)

Das ist der Hebel. New Haven wird zum emotionalen Zentrum, wenn es **die andere Spalte der Chronik** ist: der einzige Ort, an dem die Taten des Spielers nicht nur verrechnet, sondern **sichtbar** werden — als Gesichter, als Bauten, als Name. Und weil es diesen Ort gibt, bekommt die Kernthese des Spiels („Die Welt lebt und schlägt zurück") zum ersten Mal eine Adresse: Eine tote Straße bemerkt niemand. New Haven ist keine tote Straße mehr.

Alle fünf Richtungen unten zahlen auf denselben Dreiklang ein: **gesehen werden** (Siedler, Momente), **gewachsen sein** (Kulisse, Name), **gemeint sein** (Bedrohung).

---

## § 1 Richtung 1 — Siedler mit Gesichtern

**Kernidee.** Wer die Chronik vorantreibt, füllt New Haven mit Gesichtern, die er kennt. Keine neuen Wasserhähne, keine Missionen (Companion-Scope bleibt gesperrt): statische Figuren mit Sprechzeilen am jeweiligen Gebäude, nach dem Muster der Warden-Medaillons der Quest-Seite bzw. des in der Bibel (§ 3.5) angelegten NPC-Kopf+Sprechblasen-Patterns.

**Wer kommt in Frage — Stufe A: die bestehenden Gesichter der Glutfeste (keine neue Figur nötig).**
Die encampment-lore verankert bereits drei Fäden zwischen Glutfeste und New Haven: Mux schickt den Karren, Voss schickt den Grundriss, Brenna zahlt für die Köpfe an der Wand. Diese Fäden werden Auftritte:

| Figur | Gebäude | Anlass (Gate) | Muster |
|---|---|---|---|
| **Mux der Abtrünnige** | Händlerposten | „Karrentage" — wann immer der Karren angedockt ist (rein kosmetischer Rhythmus, z. B. an Segen-Tagen) | Porträt + 1 Zeile |
| **Brenna Aschenweide** | Trophäenwand | ab Trophäenwand II, oder nach einem Slayer-Meilenstein | Porträt + 1 Zeile |
| **Voss der Zähler** | Vorratsspeicher | ab Speicher I — als **angeschlagener Zettel**, nicht als Person (Voss reist nicht; seine Stimme ist Papier) | nur Text, kein Porträt |
| **Urga Schlackenfaust** | Schmelzofen | nach den ersten Offline-Barren | Porträt + 1 Zeile |
| **Shairi Mondfell** | Saatgarten | ab Saatgarten III | Porträt + 1 Zeile |
| **Mutter Eske** | Räucherhaus / Platz | nach Kapitel 14 (die Flucht ist geschlossen; sie kommt, weil bleiben jetzt amtlich ist) | Porträt + 1 Zeile |

Beispielzeilen (bilingual, Sprechblasen-fertig):

- **Mux (Händlerposten):** DE „Die Straße wird besser. Früher zwei Überfälle pro Fahrt, jetzt einer. Das nenne ich Aufschwung." · EN "The road is improving. Used to be two ambushes a trip, now it's one. That's what I call prosperity."
- **Brenna (Trophäenwand):** DE „Ich zahle für Köpfe, nicht für Wände. Aber die Wand gefällt mir." · EN "I pay for heads, not for walls. But I like the wall."
- **Voss (Zettel am Speicher):** DE „Bestand geprüft, auf Papier. Zählt trotzdem alles zweimal. — V." · EN "Stock verified, on paper. Count everything twice anyway. — V."
- **Urga (Schmelzofen):** DE „Die Barren taugen. Der Ofen zieht schief. Ich schicke jemanden." · EN "The bars will do. The furnace draws crooked. I'm sending someone."
- **Shairi (Saatgarten):** DE „Eure Erde erinnert sich schneller als unsere. Sie hatte weniger zu vergessen." · EN "Your soil remembers faster than ours. It had less to forget."
- **Eske (Platz):** DE „Ein Ort ist dort, wo gegessen wird, bevor gestorben wird. Ich höre, ihr seid jetzt ein Ort." · EN "A place is where eating comes before dying. I hear you are a place now."

*Kanon-Wächter:* Die Sechs **ziehen nicht um**. Die Völker halten die Glutfeste, der Namenlose hält die Straße (encampment-lore § 1.2) — es sind Besuche, Botensendungen, Zettel. Genau das macht sie wertvoll: Wenn Brenna die Straße heraufkommt, ist das ein Ereignis.

**Stufe B (Chef-GO nötig): genau EINE neue Siedlerin.** Die Aschechronik selbst führt keine benennbaren Geretteten (ihre Figuren sind tot, Ämter oder Monster), und die Nebenquests sind Aushang-Aufträge ohne Questgeber-Gesichter. Wer New Haven ein *eigenes* Gesicht geben will, muss es neu einführen — sparsam: **eine** Figur, die zwei Beats trägt. Vorschlag: **die alte Maren (Old Maren)** — die erste Zugezogene (Szene A in § 6), später die Glöcknerin des Zentralhauses III (Szene B). Eine Figur, zwei Kapitel-Momente, ein Porträt. Aussehens-Vorlage in § 8. Ohne GO bleibt sie „die Alte mit der Laterne": ungenannt, ohne Porträt, nur in der Wächter-Erzählung zitiert — die Szenen funktionieren auch so.

**Tragende Systeme:** NPC-Kopf+Sprechblasen-Pattern (Bibel § 3.5, für die Glutfeste-Screens ohnehin geplant), Gebäude-Stufen als Anzeige-Gate, Chronik-Kapitel als Anzeige-Gate.
**Assets/Texte:** Porträts der Sechs stehen bereits als Specs in Bibel § 3.6 (npc_brenna, npc_urga, npc_voss, npc_mux, npc_shairi, npc_eske) — New Haven **wiederverwendet dieselben Dateien**, null neue Porträts für Stufe A. Neu: je Figur 1–2 Zeilen (oben geliefert), UI-Hook „Figur X an Gebäude Y zeigen, wenn Bedingung Z". Stufe B: 1 Porträt (npc_maren.png) + Zeilen.
**Aufwand:** Stufe A **S–M** (Texte fertig, UI-Hook klein). Stufe B **M** (ein Asset, ein Chef-GO).

---

## § 2 Richtung 2 — Chronik-Momente IM Lager: der Nebenstrang „Die andere Spalte"

**Kernidee.** Die Hauptkette (chronicle_01–21) ist ausgeliefert und bleibt unangetastet. New Haven bekommt einen **eigenen kleinen Nebenstrang** auf dem bestehenden Quest-System — Arbeitstitel **„Die andere Spalte" (The Other Column)**: die Seiten der Chronik, die nicht Verlorenes verzeichnen, sondern Ankünfte, Bauten, Antworten. Technisch sind das normale Nebenquests (wie `q_gatherer`, `q_boar_hunter` …) mit `loreText`, gegated über `requires` auf Chronik-Kapitel.

**Konkrete Beats (Vorschlag, 4 Quests):**

1. **„Die Ankunft" (The Arrival)** — `requires: chronicle_09`. Nach dem Chor unter den Hügeln werden die Wege länger; und zum ersten Mal kommt jemand die Straße herauf und bleibt. Ziel funktional schlicht (z. B. `gather_items` — Vorräte für einen zweiten Platz am Feuer); der Text trägt die Szene (§ 6, Szene A).
2. **„Die Antwort" (The Answer)** — `requires: chronicle_10` (die Krypta steht offen, die Nächte sind nicht mehr neutral). Bedrohungs-Beat aus Richtung 4: Spuren am Pfahlring, der Spieler geht hinaus und antwortet. Ziel: `kill_monster` in den Grenzlanden/der angrenzenden Zone (§ 6, Szene C).
3. **„New Haven"** — `requires: chronicle_11` oder später (genug Zugezogene). Die Namens-Quest aus Richtung 5 (§ 5): Die Chronik übernimmt den Namen, den die Siedler längst benutzen.
4. **„Die Glocke" (The Bell)** — `requires: chronicle_14`. Die See lässt niemanden fort; das Zentralhaus III bekommt seine Glocke. Ziel: `gather_items` (Bronze für den Guss — Bronze existiert im Spiel; exakte Stückliste ist balance-designer-Revier). Text: § 6, Szene B.

**Warum das trägt:** Kein neuer Zieltyp, kein neues UI — `loreText` + Kompass-Panel existieren, das Medaillon-Muster existiert, `requires`-Ketten existieren. Die Kapitel-Beats der Hauptkette (K9 = Zeltring, K14 = Wegstation) bekommen ihr **Echo im Lager**, ohne die Hauptkette anzufassen.

**Empfehlungen an content-dev (Umsetzung nur auf CEO-Order):**
- Quest-IDs mit eigenem Präfix, z. B. `camp_q_arrival`, `camp_q_answer`, `camp_q_name`, `camp_q_bell` (Kollisionfrei zu `q_*` und `chronicle_*`).
- Prüfen, ob `gather_items` gezielte Item-IDs trägt oder nur „beliebige Items" zählt (Kapitel 1 nutzt es generisch). Falls nur generisch: Ziel generisch lassen, die Erzählung trägt die Deutung; die Glocken-Bronze wandert dann in die Reward-Rahmung statt ins Ziel.
- Ein Gebäude-Stufen-Gate für Quests (z. B. „erst ab Zentralhaus II") wäre ein **neuer Unlock-Typ** — vermeiden; Kapitel-Gates reichen, da die Zentralhaus-Stufen ohnehin an K9/K14 hängen.

**Assets/Texte:** null neue Assets; 4× loreText DE/EN (drei davon in § 6 ausgeschrieben) + 4 knappe funktionale descriptions.
**Aufwand:** **S–M.**

---

## § 3 Richtung 3 — Sichtbares Wachstum der Kulisse

**Kernidee.** Die drei Ausbaustufen sind in der encampment-lore bereits als EINE wachsende Szene spezifiziert (§ 2, Kulissen-Hinweis: gleiche Kamera, gleiche Furt, gleiche Ruine; es kommen nur Bauten hinzu). Das Spiel muss diesen Wandel nur **zeigen**: Der Kartengrund bzw. die Kopf-Kulisse des New-Haven-Screens wechselt mit der Zentralhaus-Stufe.

**Minimaler Asset-Satz (Grid-Ansicht 0.3.x):**
- **3 Kulissen-Zustände** derselben Szene: Wachfeuer (Stufe I), Zeltring (Stufe II), Wegstation mit Glockenturm (Stufe III) — Tagfassung.
- Nachtfassungen optional nachziehbar (die Gebäude-Assets existieren per Chef-Entscheid 28.07. ohnehin in Tag+Nacht; die Kulisse kann nachziehen, wenn die 0.4-Karte kommt).
- Palette wie kanonisch festgelegt: Aschgrau, nasses Holzbraun, stumpfes Eisen, ein einziger warmer Punkt (das Wachfeuer). Stufe III fügt als zweiten Akzent die Bronzeglocke hinzu — matt, kein Glow.

**Erweiterter Satz (0.4-Karte „Die Stämme"-Stil):** Karten-Untergrund in 3 Stufen × Tag/Nacht (6 Assets) + die bereits geplante Leere-Bauslot-Grafik. Das ist die im Konzept-Doc ohnehin vorgesehene 0.4-Planung; die Stufen-Differenzierung des Untergrunds ist der einzige Zusatzwunsch dieses Papiers.

**Der erzählerische Trick, der nichts kostet:** Der Wechsel geschieht bei der Fertigstellung des Zentralhaus-Ausbaus — also exakt in dem Moment, in dem der Bautrupp „Vollzug meldet". Eine einzige Toast-Zeile macht daraus ein Ereignis:
- Stufe II: DE „Der Ring steht. Wer die tote Straße entlangkommt, sieht jetzt ein Licht, das bleibt." · EN "The ring stands. Whoever comes down the dead road now sees a light that stays."
- Stufe III: DE „Die Wegstation steht wieder auf ihren eigenen Fundamenten. Gebaut, als bliebe man." · EN "The waystation stands on its own foundations again. Built as if to stay."

**Tragende Systeme:** Zentralhaus-Stufe (existiert als 0.3.0-State), Toast-System, Tag/Nacht (existiert für die Assets).
**Assets/Texte:** 3 Kulissen (Tag) als Minimalsatz; 2 Toast-Zeilen (geliefert).
**Aufwand:** Logik **S** (ui-dev: Kulisse an Stufe binden), Assets **M** (3 Bilder) bis **L** (voller 0.4-Satz mit Nacht).

---

## § 4 Richtung 4 — Die Welt schlägt zurück, auch hier

**Kernidee.** Keine Tower-Defense, kein Verlust, kein neuer Timer — die Eisernen Regeln bleiben unberührt. Die Bedrohung gegen New Haven ist **erzählt und beantwortet**: Das Lager wird bemerkt, der Spieler geht hinaus und antwortet dort, wo das Spiel Kämpfe hat (Zonen, Eliten). New Haven selbst verliert nie etwas; es **meldet**. Das genügt, denn die Meldung hat ein Datum: Sie beginnt, sobald der Ort etwas ist, das man bemerken kann — die Bedrohung ist der Beweis der Bedeutung.

**Drei Eskalationsstufen, alle ohne neue Mechanik:**

1. **Textstufe (reine Zeilen, sofort machbar).** Offline-Report- und Toast-Varianten, selten eingestreut:
   - DE „Der Turm hat heute Nacht zweimal Alarm geschlagen. Es kam nichts durch." · EN "The tower raised the alarm twice last night. Nothing got through."
   - DE „Spuren am Pfahlring. Der Bautrupp hat sie eingeebnet und weitergearbeitet." · EN "Tracks at the ring of stakes. The work crew leveled them and went on working."
   - Ab Zentralhaus III, bei Rückkehr nach langer Abwesenheit: DE „Die Glocke hat dich gemeldet, bevor du am Tor warst." · EN "The bell announced you before you reached the gate."
   *Regel:* Diese Zeilen sind Würze, nicht Rauschen — niedrige Frequenz, nie zwei in Folge, und die Grundzeile „New Haven hat gearbeitet." bleibt der Normalfall.
2. **Statusstufe (kleiner UI-Hook).** Das Kohlenbecken des Wachturms auf dem Lager-Screen brennt **rot statt orange**, wenn in einer angrenzenden Zone gerade ein Elite-Gegner aussteht (das Elite-System mit Ruhe-Cooldown existiert; der Hook liest nur Zustand, er erschafft keinen). Dazu eine Hover-Zeile: DE „Der Turm meldet Bewegung an der Straße." · EN "The tower reports movement on the road." Wer hinausgeht und den Elite legt, sieht das Becken wieder ruhig — die Schleife „Warnung → Antwort → Ruhe" entsteht komplett aus Bestehendem.
3. **Quest-Stufe (Vorboten als Rahmung).** Die Bedrohungs-Beats des „Andere Spalte"-Strangs (§ 2) rahmen **bestehende** Monster/Eliten der Nachbarzonen als Vorboten gegen New Haven — keine neuen Gegner, keine neuen Spawns. Szene C (§ 6) ist der ausgeschriebene Prototyp. *(Prüfauftrag an content-dev: kreditieren `elite_*`-Kills auf die eigene ID oder die Basis-ID? Davon hängt ab, ob Vorboten-Quests Eliten direkt targeten können oder auf Basis-Monster zielen und die Eliten nur erzählt werden.)*

**Was bewusst NICHT passiert:** kein Gebäude nimmt Schaden, kein Vorrat geht verloren, kein Angriff läuft in Echtzeit ab, kein Kampf findet im Lager statt. Die Fiktion deckt das sauber: Der Pfahlring hält, der Turm wacht, und was die Reihe abgeht, **zählt nur** — noch. Diese Zurückhaltung ist kein Mangel, sie ist die Drohung.

**Tragende Systeme:** Offline-Report (existiert), Toasts (existieren), Elite-System je Zone inkl. Ruhe-Cooldown (existiert; der Schrein interagiert bereits damit), Quest-System (§ 2).
**Assets/Texte:** Textstufe: nur Zeilen (geliefert). Statusstufe: 1 Becken-Variante (rot) der Wachturm-Grafik oder ein reiner Farb-Overlay. Quest-Stufe: in § 2 enthalten.
**Aufwand:** Textstufe **S** · Statusstufe **M** (kleiner UI-Hook + 1 Asset-Variante) · Quest-Stufe **S–M** (Teil von § 2).

---

## § 5 Richtung 5 — der Namens-Moment als Quest

**Aktenlage zuerst, weil zwei Stände existieren:** `design/lore/encampment-lore.md` führt **„New Haven" als bindenden Chef-Entscheid vom 27.07.** (Ortsname, in allen 7 Sprachen unübersetzt, Sidebar-Label ab Start). Der Auftrag zu diesem Brainstorm nennt als Default „kein Orts-Eigenname in 0.3.0". Beide Stände sind vereinbar, wenn man sie so liest: Das **Label** heißt ab 0.3.0 New Haven, aber es gibt (noch) keinen inszenierten **Moment**, in dem der Ort seinen Namen bekommt. Genau diese Lücke ist die Chance — und der Gründungsbogen hat sie bereits vorbereitet: *„irgendwann trägt die Chronik einen Namen nach, den nicht der Wächter vergeben hat, sondern die Zugezogenen"* (§ 1.1).

**Vorschlag: die Quest „New Haven" (Titel unübersetzt, wie der Name).** Kein Label-Wechsel, keine UI-Umbenennung, kein Save-Risiko: Die Quest dramatisiert, was der Kanon ohnehin erzählt — der Name war zuerst im Mund der Siedler, und der Wächter übernimmt ihn in die Chronik, wie er alles übernimmt, was sich durchsetzt. Der Spieler erlebt den Eintrag, nicht die Umbenennung. Einordnung: nach der Ankunfts-Quest (§ 2), wenn Zugezogene da sind, die einen Namen mitgebracht haben können.

- **Ziel (funktional):** bewusst klein — z. B. `gather_items` (der Wächter bittet um frische Tinte bzw. Vorräte für die Schreibarbeit; die Deutung trägt der Text). Der Moment ist der Lohn.
- **Chronik-Text DE:** Sie sagen es seit Wochen, beim Wasserholen und beim Zählen der Barren: New Haven. Keiner hat es beschlossen. Namen werden nicht beschlossen, sie setzen sich durch. Heute habe ich ihn in die Chronik übernommen, wie ich alles übernehme, was sich durchsetzt. Der Name ist nicht von hier. Die Leute auch nicht. Beides bleibt.
- **Chronik-Text EN:** They have been saying it for weeks, fetching water and counting bars: New Haven. Nobody decided it. Names are not decided, they take hold. Today I entered it into the Chronicle, the way I enter everything that takes hold. The name is not from here. Neither are the people. Both are staying.

*(Die Schlusszeilen sind wörtlich der Kanon-Wortlaut aus encampment-lore § 1.1 — der Moment löst ein Versprechen ein, das die Lore bereits gegeben hat.)*

**Variante mit Label-Wechsel (nicht empfohlen):** Sidebar zeigt vor der Quest „das Lager / the Camp", danach „New Haven". Emotional eine Spur stärker, kostet aber i18n-Pflege in 7 Sprachen, einen State-Haken und widerspricht dem 27.07.-Entscheid („New Haven ab Start"). Nur mit ausdrücklichem Chef-Entscheid.

**Tragende Systeme:** Quest-System + loreText; sonst nichts.
**Assets/Texte:** null Assets; 1 loreText (geliefert) + description.
**Aufwand:** **S** (empfohlene Variante) · **M–L** (Label-Wechsel-Variante, nicht empfohlen).

---

## § 6 Drei Gänsehaut-Momente (ausgeschrieben, quest-fertig)

### Szene A — „Die Ankunft" (The Arrival) · nach Kapitel 9

*Anlass: Der Zeltring entsteht; zum ersten Mal seit Jahren sieht, wer die tote Straße entlangkommt, ein Licht, das bleibt. Jetzt kommt die erste, die dem Licht folgt.*

- **Chronik-Text DE:** In der Nacht nach dem ersten Frost kam jemand die tote Straße herauf. Eine alte Frau aus der Glutfeste, zu Fuß, mit einer Laterne, in der kein Öl mehr war. Sie sagte, vom Grat aus habe sie ein Licht gesehen, das nicht wanderte, und alles, was in diesem Land nachts leuchtet, wandert. Sie hat nicht gefragt, wem der Platz gehört. Sie hat den Kessel vom Feuer genommen, als er überkochte, und ist geblieben. Die Chronik führt seit Generationen Buch über Verlorenes. Die andere Spalte bekommt heute ihren zweiten Eintrag: eine Ankunft. Die Schrift ist ungeübt. Sie wird es nicht bleiben.
- **Chronik-Text EN:** On the night after the first frost, someone came up the dead road. An old woman out of Emberhold, on foot, carrying a lantern with no oil left in it. She said that from the ridge she had seen a light that did not wander, and everything that shines at night in this land wanders. She did not ask who owns the place. She took the kettle off the fire when it boiled over, and she stayed. For generations the Chronicle has kept its ledger of things lost. Today the other column receives its second entry: an arrival. The handwriting is out of practice. It will not stay that way.
- **Sprechzeile der Siedlerin (falls Stufe B / Porträt kommt):** DE „Ich habe euer Feuer vom Grat gesehen. Es stand still. Alles andere, was hier nachts leuchtet, wandert." · EN "I saw your fire from the ridge. It held still. Everything else that shines at night here wanders."
- **Toast bei Abschluss:** DE „Jemand ist die Straße heraufgekommen. Und geblieben." · EN "Someone came up the road. And stayed."

### Szene B — „Die Glocke" (The Bell) · nach Kapitel 14

*Anlass: Die See hat das Kapitel „Flucht" geschlossen; wer nicht fliehen kann, baut. Die Wegstation bekommt ihre Glocke — und New Haven seine Antwort auf das Verzeichnis der See.*

- **Chronik-Text DE:** Heute hing die Glocke zum ersten Mal im Stuhl. Keine Weihe, kein Fest; der Wind stand schlecht und die Hände hatten zu tun. Dann schlug sie an, einmal, zur Probe. Auf dem ganzen Platz hörte die Arbeit auf, und unten an der Furt, sagen die, die dort standen, hat einer den Hut abgenommen. Die See führt ein Verzeichnis der Ertrunkenen, und niemand weiß, ob jemand zuhört. Seit heute führt New Haven ein Gegenverzeichnis: einen Ton, der bis zur Furt trägt und nichts weiter sagt als dies. Hier wird gezählt, wer lebt.
- **Chronik-Text EN:** Today the bell hung in its frame for the first time. No consecration, no feast; the wind was wrong and the hands had work to do. Then it struck, once, as a trial. Across the whole square the work stopped, and down at the ford, say those who stood there, a man took off his hat. The sea keeps a registry of the drowned, and no one knows whether anyone listens. As of today New Haven keeps a counter-registry: a sound that carries to the ford and says nothing more than this. Here, the living are counted.
- **Optionaler Haken (Stufe B):** Die Alte von Szene A wird die Glöcknerin — die Frau, die dem Licht folgte, ist jetzt die, die es hörbar macht. Sprechzeile: DE „Ich habe lange gebraucht, um herzukommen. Wer die Glocke hört, braucht kürzer." · EN "It took me a long time to get here. Whoever hears the bell will need less."

### Szene C — „Die Antwort" (The Answer) · nach Kapitel 10

*Anlass: Die Krypta steht offen, die Nächte gehören nicht mehr nur dem Wind. Zum ersten Mal wird New Haven bemerkt — und der Spieler erfährt, dass das der Preis der Bedeutung ist.*

- **Chronik-Text DE:** Das Kohlenbecken auf dem Turm brannte heute Nacht rot. Am Morgen fanden die Hände Spuren am Pfahlring: etwas Großes ist die Reihe abgegangen, langsam, von der Straßenseite her. Es hat nichts genommen. Es hat gezählt. Die Siedler standen am Zaun, und niemand hat gefragt, ob es wiederkommt; das fragt man nur bei Dingen, die vielleicht nicht wiederkommen. Ich trage ein, was einzutragen ist: New Haven wird bemerkt. Vor einem Jahr wäre das keine Nachricht gewesen — eine tote Straße bemerkt niemand. Geh hinaus und gib Antwort.
- **Chronik-Text EN:** The brazier on the tower burned red last night. In the morning the hands found tracks along the ring of stakes: something large walked the line, slowly, from the road side. It took nothing. It counted. The settlers stood at the fence, and nobody asked whether it would come back; you only ask that about things that might not. I enter what there is to enter: New Haven has been noticed. A year ago that would not have been news — nobody notices a dead road. Go out and answer.
- **Ziel (funktional):** `kill_monster` in der angrenzenden Zone (Grenzlande-Band), erzählt als das Stellen der Vorboten; Elite-Rahmung je nach Kill-Credit-Prüfung (§ 4.3).
- **Toast bei Abschluss:** DE „Das Becken auf dem Turm brennt wieder ruhig." · EN "The brazier on the tower burns quiet again."

---

## § 7 Priorisierung & empfohlener erster Schritt

| Prio | Paket | Inhalt | Aufwand | Warum |
|---|---|---|---|---|
| **1** | „Die andere Spalte", Welle 1 | 3 Quests (Ankunft, Antwort, Glocke) + die Toast-/Report-Zeilen der Textstufe aus § 4 | **S–M** | Null neue Assets, null neue Mechanik, liefert alle drei Gänsehaut-Szenen. Höchste Emotion pro Aufwand. |
| **2** | Siedler-Gesichter, Stufe A | Mux/Brenna/Voss/Urga/Shairi/Eske an den Gebäuden (Zeilen fertig, Porträts ohnehin geplant) | **S–M** | Macht New Haven bevölkert, ohne eine einzige neue Figur. |
| **3** | Namens-Quest „New Haven" | 1 Quest, kein Label-Wechsel | **S** | Kleiner Moment, großer Kanon-Payoff; braucht vorher die Chef-Klärung (§ 9, Frage 1). |
| **4** | Wachstums-Kulisse | 3 Kulissen-Stufen (Tag) + 2 Toast-Zeilen | **M** | Stärkstes visuelles Signal, hängt an Chef-Assets; Toast-Zeilen können vorab schon rein. |
| **5** | Bedrohungs-Statusstufe | rotes Kohlenbecken ↔ Elite-Zustand | **M** | Schönste Systemschleife, aber UI-Hook + Asset-Variante; nach Welle 1 sinnvoller. |
| **6** | Siedlerin Maren (Stufe B) | 1 neue Figur, 2 Beats, 1 Porträt | **M** | Nur mit Chef-GO; die Szenen funktionieren auch ohne sie. |

**Empfohlener erster Schritt:** Paket 1 — der Nebenstrang **„Die andere Spalte"** mit den drei ausgeschriebenen Szenen plus Textstufe. Alles läuft auf dem ausgelieferten Quest-System, alle Texte liegen in diesem Dokument abnahmefertig vor; content-dev kann nach Chef-Abnahme direkt bauen. Damit ist New Haven beim nächsten sichtbaren Update nicht nur ein Boost-Menü mit Bauzeiten, sondern der Ort, an dem die Chronik ihre andere Spalte führt.

---

## § 8 Aussehens-Vorlage (nur bei Chef-GO für Stufe B)

**Die alte Maren (Old Maren) → `npc_maren.png`**
Sehr alte Menschenfrau, klein und aufrecht; wettergegerbtes, tief zerfurchtes Gesicht mit hellen, wachen Augen, der Blick geduldig und ein wenig belustigt, als hätte sie das Schlimmste bereits hinter sich und wüsste es. Graues Haar kurz und praktisch geschnitten, unter einem verschlissenen, um den Kopf geschlungenen Wolltuch. Mehrlagige, geflickte Reisekleidung aus grober Wolle über hagerer Gestalt, ein lederner Trageriemen quer über der Schulter. Charakteristisches Detail: eine kleine **ausgebrannte Eisenlaterne** am Riemen vor der Brust — rußgeschwärzt, ohne Licht (sie ging den letzten Weg nach dem Licht der anderen, nicht nach ihrem eigenen; bewusst KEIN Glow). Farbwelt: Aschgrau, verwaschenes Wollbraun, stumpfes Eisen. Gemalter Dark-Fantasy-Stil wie die Spieler-Porträts, Kopf/Schulter-Ausschnitt, transparenter Hintergrund.

---

## § 9 Glossar-Nachtrag (Vorschlag, erst nach Chef-Abnahme in die Bibel übernehmen)

| DE | EN | Bemerkung |
|---|---|---|
| Die andere Spalte | The Other Column | Nebenquest-Strang New Havens; Begriff aus dem Wächter-Zitat in encampment-lore § 1.1 |
| das Gegenverzeichnis | the counter-registry | die Glocke als Antwort auf das Verzeichnis der See (Szene B); reines Erzählmotiv |
| die alte Maren | Old Maren | NUR bei Chef-GO (Stufe B); sonst ungenannt „die Alte mit der Laterne" |

---

## Offene Fragen an den Chef

1. **Namens-Stand klären:** encampment-lore führt „New Haven" als bindenden Entscheid vom 27.07. (Label ab Start); der Brainstorm-Auftrag nennt „kein Orts-Eigenname in 0.3.0" als Default. Dieses Papier nimmt an: Label bleibt ab Start „New Haven", die Namens-QUEST (§ 5) erzählt nur den Chronik-Eintrag nach. Passt das — oder soll das Label vor der Quest „das Lager" zeigen (Variante mit Label-Wechsel, nicht empfohlen)?
2. **GO/No-GO für die eine neue Siedlerin** (Maren, § 1 Stufe B + § 8): Mit GO trägt sie Ankunft und Glocke als Gesicht; ohne GO bleiben beide Szenen reine Wächter-Erzählung (funktioniert, ist aber eine Spur kühler).
3. **Besuchslogik der Glutfeste-Gesichter:** Dürfen Mux und Brenna (als erste zwei) in New Haven auftauchen, oder sollen alle sechs streng in der Glutfeste bleiben und nur über Zettel/Sendungen präsent sein?
4. **Kulissen-Priorität:** 3-Stufen-Kulisse schon für die Grid-Ansicht (0.3.x) beauftragen, oder erst zusammen mit dem 0.4-Karten-Untergrund?
5. **Vorboten-Rahmung:** Einverstanden, dass bestehende Eliten/Monster der Nachbarzonen rein textlich als „Vorboten gegen New Haven" gerahmt werden (keine neuen Gegner, keine neuen Spawns)?
