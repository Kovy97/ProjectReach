# Auf In-Game-Bugreports über Discord antworten — Machbarkeit

**Frage des Chefs (23.08.2026):** „Können wir etwas machen, dass ich per Discord auf Tickets
in Game antworten kann?"

**Kurze Antwort:** Ja, in drei Ausbaustufen. Die kleinste ist in etwa einer Stunde fertig und
löst den häufigsten Fall. Die große Lösung, bei der die Antwort wirklich im Spiel ankommt,
braucht einen kleinen Server-Baustein, ist aber deutlich weniger Arbeit als es klingt — weil
der Client schon fast alles mitbringt.

---

## Was heute existiert

| Baustein | Zustand |
|---|---|
| Bugreport aus dem Spiel → Discord | **Läuft.** `main/bugReport.ts` postet an einen Discord-Webhook, inkl. bis zu 3 Screenshots. |
| Webhook-Adresse | Fest im Client (`util/bugReportConfig.ts`), rotierbar über eine Remote-Config. |
| **Remote-Config-Abruf über HTTPS** | **Gebaut, aber nie scharf geschaltet** — die URL zeigt auf `https://example.invalid/…`, der Abruf schlägt bewusst fehl und fällt auf den eingebauten Webhook zurück. |
| Postfach im Spiel | **Läuft.** Briefe mit Absender und Text (`engine/mail.ts sendLetter`), erscheinen im Postfach, überleben Speichern/Laden. |
| Ticket-Nummer | **Fehlt.** Ein Report hat heute keine Kennung, weder im Spiel noch in Discord. |

Der entscheidende Punkt: **ein Lesekanal vom Netz ins Spiel ist bereits gebaut und getestet**,
er zeigt nur auf eine Platzhalter-Adresse. Der Weg zurück zum Spieler ist damit keine neue
Architektur, sondern das Scharfschalten einer vorhandenen.

Automatisch mitgeschickt werden heute schon: Programmversion, Speicherstandversion, Betriebssystem,
aktueller Bildschirm, Spielzeit, Charaktername, Gesamtlevel. Was fehlt, ist ausschließlich eine
Kennung, an der sich Antwort und Absender wiederfinden.

---

## Stufe 1 — Kontaktfeld im Report *(rund 1 Stunde, keine Infrastruktur)*

Ein optionales Feld „Discord-Name (falls du eine Antwort möchtest)" im Melde-Dialog. Der Name
landet im Discord-Post. Der Chef antwortet per Direktnachricht oder erwähnt die Person im Server.

**Dafür:** sofort machbar, kein Server, kein Risiko, keine neuen Abhängigkeiten.
**Dagegen:** erreicht nur Spieler, die im Discord sind und das Feld ausfüllen. Erfahrungsgemäß
sind das die wenigsten, und ausgerechnet der verwirrte Gelegenheitsspieler füllt es nicht aus.

**Einschätzung:** Sollten wir so oder so machen. Es kostet fast nichts und deckt die Fälle ab,
in denen jemand ohnehin schon im Discord unterwegs ist.

---

## Stufe 2 — Ticket-Nummer plus öffentliche Antwortliste *(rund ein halber Tag)*

Jeder Report bekommt eine kurze Kennung (`GR-7F3A`), die dem Spieler nach dem Absenden angezeigt
und lokal gespeichert wird. Dieselbe Kennung steht im Discord-Post.

Der Chef antwortet in Discord. Ein kleiner Helfer schreibt die Antwort in eine öffentlich lesbare
JSON-Datei. Das Spiel liest diese Datei beim Start über **genau den Abruf, der schon gebaut ist**,
und legt passende Antworten als Brief ins Postfach.

**Wo diese Datei liegen kann:** ein Repository-Rohlink bei GitHub, ein Gist, oder eine kleine
Cloudflare-Funktion. Alle drei sind kostenlos und brauchen keinen eigenen Server.

**Dafür:** die Antwort kommt wirklich im Spiel an, ohne dass der Spieler Discord braucht. Nutzt
vorhandene Bausteine (Abruf, Postfach, Brief) statt neuer.
**Dagegen:** Die Datei ist öffentlich. Wer die Kennung eines anderen errät, könnte dessen Antwort
lesen. Für Support-Antworten ist das verkraftbar, für alles Persönliche nicht — also Regel:
**in Antworten keine Namen, keine Adressen, keine Spielstanddaten.**

**Der Schritt „Discord → Datei" hat zwei Ausbaustufen:**
- **Von Hand:** Der Chef trägt die Antwort selbst in die Datei ein. Null Technik, aber lästig.
- **Mit Bot:** Ein kleiner Discord-Bot lauscht auf `!antwort GR-7F3A <Text>` im Report-Kanal und
  schreibt die Datei selbst. Das ist der eigentliche „ich antworte per Discord"-Komfort.

---

## Stufe 3 — Bot mit Thread-Antworten *(rund ein Tag zusätzlich)*

Wie Stufe 2, aber der Bot legt zu jedem Report automatisch einen Discord-Thread an. Der Chef
antwortet einfach im Thread wie in einem normalen Gespräch, der Bot erkennt die Antwort und
stellt sie zu. Keine Befehle, keine Kennungen tippen.

**Dafür:** fühlt sich an wie ein echtes Ticketsystem, und zwar in dem Werkzeug, das der Chef
ohnehin offen hat.
**Dagegen:** Der Bot muss irgendwo dauerhaft laufen. Das ist der erste echte Betriebsaufwand in
diesem Projekt — bisher läuft nichts von uns rund um die Uhr.

---

## Stufe 4 — Bot auf dem eigenen NAS, echter Zwei-Wege-Verkehr *(Chef-Wunsch 23.08.)*

Der Chef hat einen NAS, der ohnehin durchläuft. Damit fällt der einzige Grund weg, der die
kleinen Stufen attraktiv gemacht hat: „wir haben nichts, das 24/7 läuft". Das ändert die
Empfehlung — mit eigenem Dauerbetrieb ist die vollständige Lösung nicht mehr die teuerste,
sondern die naheliegende.

### Der Weg einer Nachricht, Schritt für Schritt

Wichtig zum Verständnis vorweg: **Das Spiel läuft auf dem PC des Spielers und hat keine offene
Verbindung zu uns.** Discord kann dort nichts hinschicken. Es gibt keinen Weg, bei dem eine
Nachricht von selbst im Spiel auftaucht — das Spiel muss fragen. Jede Lösung baut darauf auf.

| # | Was passiert | Wo |
|---|---|---|
| 1 | Spieler schickt einen Report. Das Spiel würfelt eine Ticket-Nummer (lang genug, dass sie niemand errät), merkt sie sich lokal und schickt sie mit. | Spiel |
| 2 | Der Bot nimmt den Report an und legt im Discord-Kanal einen **Thread** an, Ticket-Nummer im Titel. | NAS → Discord |
| 3 | Der Chef antwortet im Thread. Normal tippen, keine Befehle. | Discord |
| 4 | Der Bot hängt dauerhaft an Discords Gateway, sieht die Antwort sofort und legt sie unter der Ticket-Nummer ab. **Das ist der Grund für den Dauerbetrieb.** | NAS |
| 5 | Das Spiel fragt beim Start und danach etwa minütlich: „gibt es etwas für meine Tickets?" | Spiel → NAS |
| 6 | Popup „A Developer sent you mail!", Brief im Postfach, Marker am Postfach-Eintrag. | Spiel |
| 7 | Antwortet der Spieler aus dem Spiel, geht sein Text an den Bot, und der Bot postet ihn **in denselben Thread**. | Spiel → NAS → Discord |

Ab Schritt 7 ist es für den Chef ein Gespräch in Discord, für den Spieler ein Briefwechsel im
Postfach. Beide Seiten benutzen das Werkzeug, das sie ohnehin offen haben.

### Die eine echte Hürde: der NAS muss erreichbar sein

Der Bot verbindet sich **nach außen** zu Discord, das funktioniert hinter jedem Router ohne
Konfiguration. Aber in Schritt 5 muss das Spiel des Spielers **den NAS erreichen**. Dafür braucht
es eine öffentliche Adresse mit HTTPS.

**Nicht per Portfreigabe.** Dann stünde die Heim-IP des Chefs in jedem ausgelieferten Client, und
jeder Scanner im Netz klopft irgendwann an.

**Sondern per Cloudflare Tunnel** (kostenlos): Der NAS baut die Verbindung selbst nach außen auf,
es wird kein Port geöffnet, die Heim-IP bleibt verborgen. Man bekommt einen festen Hostnamen wie
`support.grimreach.dev`, gültiges Zertifikat inklusive, und Cloudflare filtert Spam ab, bevor er
das Heimnetz erreicht. Alternativen mit demselben Prinzip: Tailscale Funnel, ngrok (kostenpflichtig
für feste Adressen).

### Was das am Spielstand ändert

Genau eine Sache, und sie ist unvermeidbar: Die vorhandenen Briefe tragen bewusst **nur
i18n-Schlüssel, nie Rohtext** (`MailMessage`, `kind: "letter"`, `textKey`). Eine Entwickler-Antwort
*ist* Rohtext. Das verlangt eine neue Postfach-Art (`kind: "support"`) mit Rohtext, Ticket-Nummer
und Richtung — also **SAVE_VERSION-Sprung plus Migration plus Vault-Ritual**. Der einzige Punkt in
diesem ganzen Vorhaben, der den Speicherstand berührt.

### Was wir vorher festlegen müssen

1. **Sprache.** Die Antwort des Chefs wird nicht übersetzt. Ein russischer Spieler bekommt sie so,
   wie sie getippt wurde. Entweder alle Antworten auf Englisch, oder wir zeigen im Brief dazu,
   in welcher Sprache geantwortet wurde.
2. **Missbrauch.** Der Endpunkt ist öffentlich erreichbar, weil er es sein muss. Nötig sind:
   Ticket-Nummern mit genug Zufall (sonst liest ein Fremder fremde Antworten), eine Obergrenze
   pro IP, und eine Längenbegrenzung für Spieler-Antworten.
3. **Aufbewahrung.** Wie lange hebt der Bot Tickets auf? Vorschlag: 90 Tage, danach löschen.
4. **Wenn der NAS aus ist.** Nichts geht verloren: Der Spieler kommt nicht durch und versucht es
   beim nächsten Start erneut; deine Antworten liegen auf dem NAS und werden zugestellt, sobald er
   wieder fragt. Es ist eine Verzögerung, kein Datenverlust.

### Ehrliche Einordnung

**Es ist kein Live-Chat.** Bei einem Abruf pro Minute kommt eine Antwort binnen einer Minute an,
solange das Spiel läuft. Das fühlt sich an wie eine Textnachricht, nicht wie ein Gespräch.
Kürzer als 30 Sekunden sollte das Intervall nicht werden: bei tausend gleichzeitigen Spielern
sind das sonst spürbar viele Anfragen für einen NAS.

**Aufwand:** Bot (Discord-Gateway, Threads, Ablage, HTTP-Endpunkt) etwa 1 bis 2 Tage. Client
(Ticket-Nummer, Abruf, neue Postfach-Art, Popup, Antwortfeld) etwa 1 Tag. Tunnel einrichten eine
knappe Stunde. Dazu die Save-Migration mit Vault-Ritual.

**Der Nutzen ist real:** Von den bisherigen Reports waren zwei an einem einzigen Tag gar keine
Defekte, sondern Missverständnisse („The New Haven disappeared", „Bogen und Schild gleichzeitig?").
Beide hätte ein Zweizeiler an den Spieler erledigt.

---

## Was ich empfehle

**Aktualisiert 23.08. nach dem NAS-Hinweis: Stufe 1 sofort, danach direkt Stufe 4.**
Stufe 2 und 3 waren Umwege um das fehlende Dauerbetrieb-Problem herum. Mit einem NAS, der
ohnehin läuft, entfällt ihr einziger Vorteil — und die öffentlich lesbare Antwortdatei aus
Stufe 2 (mit ihrem Datenschutz-Beigeschmack) wird durch eine private Ablage auf dem eigenen
Gerät ersetzt. Stufe 1 bleibt trotzdem sinnvoll als Sofortmaßnahme, solange Stufe 4 gebaut wird.

Die ehrliche Einordnung: Der Nutzen liegt fast vollständig in Stufe 2. Der Spieler, der heute
„The New Haven disappeared" meldet, will keine Direktnachricht — er will im Spiel lesen, dass
alles in Ordnung ist. Genau dafür haben wir das Postfach.

**Vorher zu klären:**
1. Wo soll die Antwortdatei liegen? (GitHub-Rohlink ist der Weg mit dem geringsten Aufwand.)
2. Soll der Bot laufen, oder trägst du Antworten erst einmal von Hand ein?
3. Ist dir bewusst und recht, dass die Antworten öffentlich lesbar sind?

---

## Nebenbefund, unabhängig von der Entscheidung

`BUG_REPORT_CONFIG_URL` zeigt auf `https://example.invalid/…`. Solange dort keine echte Adresse
steht, lässt sich der Webhook **nicht ohne neuen Build rotieren** — bei Spam oder einem
geleakten Webhook wäre das der einzige Weg. Eine echte Datei dort einzuhängen kostet zehn Minuten
und ist unabhängig von allem oben sinnvoll.
