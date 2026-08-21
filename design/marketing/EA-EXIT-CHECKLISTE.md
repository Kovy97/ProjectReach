# Grim Reach: Early Access verlassen (1.0-Vollrelease) — Schritt-für-Schritt für den Chef

**App:** Grim Reach, AppID **4915450**, Depot **4915451**
**Ziel:** Early-Access-Kennzeichnung weg, 1.0-Build live, Announcement raus, Sichtbarkeit mitnehmen.

**Legende**
- ✅ = einfach abarbeiten
- ⚠️ **VOM CHEF ZU PRÜFEN** = ich bin mir bei diesem Steamworks-Detail nicht sicher; bitte im
  Backend nachsehen, bevor du dich darauf verlässt. Ich rate hier bewusst nicht.
- 🔴 = wenn das falsch läuft, ist es öffentlich sichtbar oder nicht mehr rückgängig zu machen

**Grobe Reihenfolge:** Entscheidungen → Build fertig & hochgeladen → Store-Seite vorbereitet →
Termin-Announcement (≥2 Wochen vorher) → am Release-Tag: Build live + EA-Haken raus + Launch-Post
→ danach Rabatt/Reviews/Nachpflege.

---

## TEIL 0 — Entscheidungen, die vor allem anderen stehen müssen

| # | Entscheidung | Warum sie zuerst kommt | Mein Vorschlag |
|---|---|---|---|
| 0.1 | **Release-Datum** | Alles andere hängt daran; Announcement soll ≥2 Wochen vorher raus | Werktag (Di–Do), klar VOR dem Autumn Sale, nicht mitten in einem großen Steam-Sale |
| 0.2 | **Preis zu 1.0**: 9,99 € lassen oder anheben | Preisänderung hat Rabatt-Sperrfristen zur Folge (siehe TEIL 5) | Bei 9,99 € bleiben. Eine Anhebung kostet Sperrfrist und Goodwill und bringt bei der aktuellen Verkaufslage wenig |
| 0.3 | **Launch-Rabatt ja/nein und wie hoch** | Muss im Rabatt-Tool vorab angelegt werden | Plan-1.0 empfiehlt 20 %. Bei unverändertem Basispreis unproblematisch |
| 0.4 | **Steam-Achievements scharf schalten ja/nein** | Handarbeit im Backend, muss vor dem Live-Build fertig sein | Optional. Wenn die Zeit knapp ist: weglassen, das ist kein 1.0-Blocker |
| 0.5 | **Sichtbarkeitsrunde einsetzen ja/nein** | Wir haben eine begrenzte Anzahl und sie sind nicht nachbestellbar | Siehe TEIL 6, Punkt „Sichtbarkeitsrunden" |
| 0.6 | **Trailer neu schneiden ja/nein** | Braucht Vorlauf, muss vor dem Termin-Announcement fertig sein | Wenn der alte Trailer ein „Early Access"-Insert hat: Pflicht. Sonst: nice to have |

---

## TEIL 1 — VOR dem Live-Schalten: was im Spiel selbst noch raus muss

Das sind keine Steamworks-Klicks, sondern Dinge, die sonst nach dem EA-Exit weiter „Early Access"
sagen. Bitte an die Dev-Seite geben, nicht selbst anfassen.

- 🔴 **Versions-String im Spiel.** Der Über-Text im Spiel lautet aktuell in allen 7 Sprachen
  „Grim Reach — v{version} (Early Access)". Betroffene Stellen:
  - `apps/client/src/renderer/i18n/translations.ts` (EN + DE, zwei Vorkommen)
  - `apps/client/src/renderer/i18n/locales/es.ts`, `fr.ts`, `ptBR.ts`, `ru.ts`, `zh.ts`
  Der Klammerzusatz muss weg (oder durch nichts ersetzt werden), sonst steht in der 1.0 im
  Optionsmenü noch „Early Access".
- ✅ **Versionsnummer auf 1.0.0** (läuft bereits über den Build-/Version-Agenten).
- ✅ **Save-Kompat-Vault-Ritual** vor dem Depot-Upload (Hausgesetz, unverhandelbar).
- ✅ **Release-Sweep** grün (läuft parallel).

## TEIL 2 — VOR dem Live-Schalten: Store-Assets vorbereiten

- 🔴 **`panel_promise.png` neu bauen.** Auf dem Panel steht als dritte Zeile
  „Built with our community in Early Access". Das ist Early-Access-Sprache **im Bild**, die auch
  eine perfekte Store-Beschreibung nicht wegräumt. Quelle:
  `design/marketing/store-panels/build-panels.py` (Liste `rows`, ca. Zeile 401–403).
  Vorschlag für die neue Zeile: „Built with our community, update after update".
  Notfalls: Panel beim 1.0-Upload einfach weglassen.
- ✅ **Die anderen 4 Panels** (`panel_numbers`, `panel_worldfightsback`, `panel_skills`,
  `panel_newhaven`) bleiben unverändert. Die Zahlen darauf (20 Skills, 1.000+ Items,
  100+ Monster, 19 Zonen & Dungeons, 28 Champions, 0 Mikrotransaktionen) sind gegen den
  aktuellen Content-Stand geprüft und stimmen. Alle 5 Dateien liegen in
  `CODEX/AssetControl/store-elements-0.3.0/description-panels/`.
- 🔴 **Capsules, Header und Library-Assets auf „EARLY ACCESS"-Aufkleber prüfen.** Falls irgendwo
  ein EA-Badge ins Bild gerendert ist, muss die Grafik getauscht werden. (Steam blendet den
  EA-Rahmen normalerweise selbst ein, aber wenn wir ihn zusätzlich ins Bild gemalt haben, bleibt
  er stehen.)
- 🔴 **Trailer auf EA-Insert prüfen.** Wenn im Video „Early Access", „In Entwicklung" oder eine
  Roadmap vorkommt: neu schneiden oder das Video aus der Store-Seite nehmen.
- ✅ **Screenshots:** 1920×1080, mindestens 5, keine Screenshots mit sichtbaren EA-Hinweisen oder
  Debug-UI. Wenn Screenshots noch aus 0.2.x stammen, jetzt austauschen (New Haven, Kampf,
  Bestiarium, Skills, Champion-Zeremonie).

## TEIL 3 — VOR dem Live-Schalten: Steamworks vorbereiten

Alles hier kann man vorbereiten, ohne dass die Seite schon „1.0" sagt.

1. ✅ **Build hochladen und auf einen Test-Branch legen.**
   Steamworks → App **4915450** → **SteamPipe → Builds**. Den 1.0-Build hochladen, aber zunächst
   NICHT auf `default` setzen, sondern auf einen passwortgeschützten Beta-Branch, und dort einmal
   komplett durchspielen (Erststart, Laden eines alten Spielstands, Sprache wechseln).
2. ✅ **Store-Beschreibung vorbereiten.**
   Store-Präsenz → Store-Seite bearbeiten → Beschreibungen. Sprache im Dropdown wählen, Text aus
   `design/marketing/store-about-1.0-PLAIN.txt` einsetzen, an jeder `>>> BILD: … <<<`-Zeile das
   genannte Panel über die Editor-Werkzeugleiste einfügen und die Markierungszeile löschen.
   Danach die Kurzbeschreibung in ihr eigenes Feld (Limit 300 Zeichen; alle 7 Fassungen liegen
   unter dem Limit). **Alle 7 Sprachen**: EN, DE, FR, ES, PT-BR, RU, ZH.
   ⚠️ **VOM CHEF ZU PRÜFEN:** Ob Steamworks die geänderte Beschreibung sofort veröffentlicht oder
   erst nach Prüfung. Bei einem bereits veröffentlichten Titel gehen Textänderungen meiner
   Kenntnis nach schnell durch, aber plane einen Puffer von 1–3 Werktagen ein und mache das
   NICHT erst am Release-Morgen.
3. ✅ **Termin-Announcement posten (≥2 Wochen vor dem Datum).**
   Marketing & Sichtbarkeit → Steam-Events & -Ankündigungen → neues Event. Typ: normale
   Ankündigung, Inhalt: „Grim Reach verlässt am {Datum} den Early Access". Das ist gleichzeitig
   die Basis für die Sichtbarkeitsrunde (siehe TEIL 6).
4. ✅ **Rabatt vorbereiten, aber noch nicht starten.** Siehe TEIL 5 zuerst lesen.
5. ✅ **Creator-Keys ziehen.**
   Steamworks → Anfrage von Steam-Keys. Für die Liste in `design/marketing/influencer-liste.md`
   plus das Fact-Sheet (`design/marketing/fact-sheet-1.0.md`). Keys ca. 1–2 Wochen vor dem Termin
   verschicken, damit jemand vor dem Launch spielen kann.

## TEIL 4 — Der Live-Schalt-Tag (Reihenfolge ist wichtig)

Diese Reihenfolge vermeidet, dass jemand für ein paar Minuten eine 1.0-Store-Seite mit einem
0.3.0-Build sieht.

1. 🔴 **Build auf `default` setzen.**
   SteamPipe → Builds → den geprüften 1.0-Build auswählen → Branch `default` setzen. Erst jetzt
   bekommen alle Spieler das Update.
2. 🔴 **Early-Access-Kennzeichnung entfernen.**
   Store-Präsenz → Store-Seite bearbeiten → Bereich **Early Access**. Dort sitzen der Schalter
   „dieses Produkt ist im Early Access" und der Early-Access-Fragebogen (die sechs Fragen:
   „Warum Early Access?", „Wie lange?", „Wie unterscheidet sich die Vollversion?",
   „Was ist der aktuelle Stand?", „Anderer Preis in der Vollversion?", „Wie bindet ihr die
   Community ein?"). Schalter aus, Fragebogen-Inhalte damit erledigt.
   ⚠️ **VOM CHEF ZU PRÜFEN:** Ob Steamworks zusätzlich ein Bestätigungs-Dialog oder ein
   Support-Ticket an Valve verlangt, um den EA-Status endgültig zu lösen. Bei manchen Titeln
   reicht der Schalter plus Veröffentlichen, bei manchen fragt Valve nach. Bitte im Backend
   nachsehen, was dort konkret steht, bevor du davon ausgehst, dass es allein mit dem Haken
   getan ist.
3. 🔴 **Neue Store-Beschreibung veröffentlichen** (falls in TEIL 3 nur gespeichert und noch nicht
   publiziert). Alle 7 Sprachen gleichzeitig veröffentlichen, damit keine Sprache im alten Text
   hängen bleibt.
4. ✅ **Erscheinungsdatum prüfen.**
   Store-Präsenz → Basisinformationen → Erscheinungsdatum. Nach dem EA-Exit soll dort das
   1.0-Datum stehen, nicht mehr das EA-Datum vom Juli.
   ⚠️ **VOM CHEF ZU PRÜFEN:** Ob Steam das Datum beim Entfernen des EA-Status automatisch
   umstellt oder ob es manuell gesetzt werden muss. Nach dem Live-Schalten einmal die
   öffentliche Store-Seite ansehen und kontrollieren, was dort als Datum steht.
   **„Coming Soon" ist hier kein Thema:** Der Titel ist bereits veröffentlicht, er fällt nicht
   in den Coming-Soon-Status zurück.
5. ✅ **Launch-Announcement posten.**
   Marketing & Sichtbarkeit → Steam-Events & -Ankündigungen → neues Event, Typ „Update" bzw.
   „Größeres Update". Text: `design/marketing/steam-post-1.0.txt` (EN als Haupttext, DE als
   zweite Sprachfassung im selben Event). Kurzfassung für den Teaser steht ebenfalls in der Datei.
6. ✅ **Launch-Rabatt starten** (falls beschlossen). Siehe TEIL 5.
7. ✅ **Öffentliche Store-Seite mit einem zweiten Browser (ausgeloggt) kontrollieren:**
   kein EA-Banner mehr, kein EA-Kasten in der Beschreibung, richtige Panels, richtiger Preis,
   alle 7 Sprachen über den Sprachumschalter durchklicken.

## TEIL 5 — Preis und Rabatte: die Fallen

🔴 **Das ist der Teil, an dem man sich den Launch-Rabatt versehentlich verbaut.** Alle Regeln
hier bitte im Steamworks-Rabatt-Tool gegenprüfen: das Tool zeigt beim Anlegen selbst an, ab wann
ein Rabatt erlaubt ist, und diese Anzeige gilt, nicht meine Zusammenfassung.

- **Grundprinzip:** Steam schützt Käufer vor „erst Preis hoch, dann Fake-Rabatt". Deshalb hängen
  Preisänderung und Rabatt zusammen: **nach einer Basispreis-Änderung gibt es eine Sperrfrist,
  bevor du einen Rabatt fahren darfst.**
  ⚠️ **VOM CHEF ZU PRÜFEN:** die genaue Länge dieser Sperrfrist (Größenordnung: mehrere Wochen).
  **Konsequenz für uns:** Wenn du den Preis zu 1.0 anheben willst UND einen Launch-Rabatt willst,
  geht das mit hoher Wahrscheinlichkeit nicht am selben Tag. Entweder Preis lassen und Rabatt
  fahren, oder Preis anheben und auf den Rabatt verzichten.
- **Abstand zwischen zwei Rabatten:** Zwischen dem Ende eines Rabatts und dem Beginn des
  nächsten liegt eine Sperrfrist. Wenn Grim Reach also kurz vor dem 1.0-Termin noch in einem
  Sale oder in einem eigenen Rabatt lief, kann der Launch-Rabatt blockiert sein.
  ⚠️ **VOM CHEF ZU PRÜFEN:** wann der letzte Rabatt für 4915450 endete. Steht im Rabatt-Verlauf.
- **Vorlaufzeit:** Rabatte müssen ein paar Tage vor Start angelegt werden, sie lassen sich nicht
  spontan am selben Tag starten. Also spätestens **eine Woche vor dem Release-Tag** anlegen.
  ⚠️ **VOM CHEF ZU PRÜFEN:** die exakte Vorlaufzeit im Tool.
- **Steam-Sales:** Während eines offiziellen Steam-Sales gelten zusätzliche Einschränkungen für
  eigene Rabatte und Preisänderungen. Das ist ein weiterer Grund, klar vor dem Autumn Sale zu
  releasen und nicht hinein.
- **Reihenfolge, die am wenigsten Ärger macht:** Basispreis unverändert lassen → Launch-Rabatt
  eine Woche vorher anlegen mit Start am Release-Tag → über einen Preis-Anstieg frühestens ein
  paar Monate nach 1.0 nachdenken.

## TEIL 6 — Was Valve prüft und wo Wartezeit entsteht

- **Store-Seiten-Prüfung.** Änderungen an einer Store-Seite können bei Valve durch eine Prüfung
  laufen. Rechne mit **1–3 Werktagen**, plane die Textänderung also nicht auf den Release-Morgen.
  ⚠️ **VOM CHEF ZU PRÜFEN:** ob es bei einem bereits veröffentlichten Titel für reine
  Text-/Bildänderungen überhaupt eine Prüfung gibt. Im Zweifel: früh einreichen, nichts verlieren.
- **Build-Prüfung.** Der Build selbst wird nicht inhaltlich geprüft, aber der erste Build nach
  einer Änderung an den unterstützten Sprachen oder am Content-Deskriptor kann hängen bleiben.
  Wenn wir nichts davon anfassen: kein Thema.
- **Der EA-Exit ist ein zweites Launch-Ereignis.** Steam behandelt das Verlassen von Early Access
  wie eine neue Veröffentlichung: der Titel taucht wieder in Neuerscheinungs-Listen auf. Das ist
  der ganze Grund für diesen Plan.
  ⚠️ **VOM CHEF ZU PRÜFEN:** ob Steam die Wunschlisten-Besitzer beim EA-Exit automatisch per
  Mail benachrichtigt. Ich bin mir nicht sicher genug, um das als gesetzt zu verkaufen, und es
  macht für die Erwartungshaltung einen großen Unterschied. Steht im Zweifel in der Steamworks-Doku
  zum Thema Early Access verlassen oder lässt sich beim Valve-Support erfragen.
- **Sichtbarkeitsrunden.** Wir haben insgesamt 5, sie sind nicht nachbestellbar, und der Plan
  (`design/plan-1.0-vollrelease.md`) sagt ausdrücklich: nicht für 0.x verbrennen, für 1.0
  aufheben. Voraussetzung ist ein Announcement, das nicht zu alt ist.
  ⚠️ **VOM CHEF ZU PRÜFEN:** (a) wie viele Runden für 4915450 noch übrig sind, (b) ob eine Runde
  für den 1.0-Moment überhaupt nötig ist oder ob das EA-Exit-Launch-Ereignis die Sichtbarkeit
  ohnehin mitbringt. Wenn der EA-Exit die Sichtbarkeit selbst liefert, wäre eine zusätzlich
  verbrannte Runde Verschwendung. Das steht in Steamworks unter Marketing & Sichtbarkeit.
- **Reviews.** Der Review-Score wandert mit, es gibt keinen Reset. Das ist gut für uns
  (bestehende positive Reviews zählen weiter) und ein Grund, den Launch-Post freundlich zu
  halten und auf Review-Anfragen der ersten Woche schnell zu reagieren.

## TEIL 7 — NACH dem Live-Schalten (erste Woche)

- ✅ **Am Release-Tag:** Diskussionsforum und die Steam-Rezensionen im Auge behalten, gemeldete
  Fehler in `design/patchnotes.md` eintragen lassen.
- ✅ **Reddit/Discord:** Vorlagen liegen in `design/marketing/reddit-vorlagen-alle-subs.md`.
  Vor dem Posten die 0.3.0-Formulierungen gegen die 1.0-Fassung tauschen.
- ✅ **Creator-Nachfassen:** Wer einen Key bekommen und nicht reagiert hat, bekommt am Release-Tag
  eine kurze zweite Mail mit dem Fact-Sheet-Link.
- ✅ **Hotfix-Bereitschaft:** Wenn in den ersten Tagen ein echter Blocker auftaucht, Hotfix-Build
  ohne Announcement auf `default` (Silent-Push, wie bei 0.2.1). Save-Kompat-Regel gilt weiter.
- ✅ **Post-Launch-Post** nach ca. einer Woche: kurzer Dank plus die Liste der Fixes aus den
  ersten Tagen. Hält das Event-Fenster offen und zeigt Kaufinteressenten, dass jemand da ist.
- ⚠️ **VOM CHEF ZU PRÜFEN:** Ob nach dem EA-Exit noch Reste in der Steam-Verwaltung stehen, die
  nur der Store-Seite selbst gehören: EA-Hinweise in den Systemanforderungen, ein EA-Vermerk im
  „Über das Spiel"-Kurztext, oder ein EA-Satz in der Entwickler-Beschreibung/Franchise-Seite.
  Einmal alle Textfelder der App durchsehen.

---

## Kurzfassung als Abhak-Liste

**Vor dem Termin**
- [ ] Release-Datum, Preis, Rabatt-Entscheidung stehen (TEIL 0)
- [ ] „(Early Access)" aus dem In-Game-Versions-String in allen 7 Sprachen raus
- [ ] `panel_promise.png` ohne EA-Zeile neu gebaut
- [ ] Capsules/Header/Trailer ohne EA-Aufkleber
- [ ] Screenshots aktuell (New Haven ist drauf)
- [ ] 1.0-Build hochgeladen, auf Beta-Branch getestet
- [ ] Store-Beschreibung in allen 7 Sprachen eingesetzt (noch nicht zwingend veröffentlicht)
- [ ] Termin-Announcement ≥2 Wochen vorher gepostet
- [ ] Launch-Rabatt angelegt (Start am Release-Tag)
- [ ] Creator-Keys raus

**Am Release-Tag**
- [ ] Build auf `default`
- [ ] EA-Schalter aus, Fragebogen weg
- [ ] Neue Beschreibung veröffentlicht (alle 7 Sprachen)
- [ ] Erscheinungsdatum kontrolliert
- [ ] Launch-Post veröffentlicht
- [ ] Rabatt läuft
- [ ] Store-Seite ausgeloggt gegengeprüft

**Danach**
- [ ] Forum/Reviews beobachtet
- [ ] Reddit/Discord-Posts raus
- [ ] Post-Launch-Post nach ca. einer Woche
