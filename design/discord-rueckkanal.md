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

## Was ich empfehle

**Stufe 1 sofort, Stufe 2 mit Bot als Ziel.** Stufe 3 ist Komfort für den Chef, nicht für den
Spieler, und lohnt erst, wenn die Report-Menge so groß wird, dass Kennungen tippen nervt.

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
