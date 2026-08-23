# Support-Brücke — Discord ↔ Spiel

> **AUF EIS — Chef-Entscheid 23.08.2026: „Diese Pipeline für Support ist mir zu blöd.“**
> Stattdessen gibt es seit 1.0.2 ein freiwilliges Discord-Namensfeld im Melde-Dialog; der Chef
> antwortet direkt in Discord. Der Code hier ist fertig und lokal geprüft (Signaturweg,
> `/reply`, Abruf, keine Doppelzustellung) — er ist nur nirgends deployed. Falls die Frage
> wiederkommt, ist die Arbeit getan und die Anleitung unten gültig.

Damit kann der Chef aus Discord heraus einem Spieler antworten, und die Antwort landet im
Postfach im Spiel. Der Spieler kann zurückschreiben, ohne Discord zu benutzen.

**Es läuft nichts bei dir zuhause.** Der Baustein ist ein Cloudflare Worker: ein kleines
Programm, das nur startet, wenn es angesprochen wird. Kein NAS, kein Server, keine öffentliche
Adresse, keine Portfreigabe.

---

## Wie eine Nachricht läuft

```
Spieler meldet etwas
   │  POST /report          (das Spiel würfelt eine Ticket-Nummer und schickt sie mit)
   ▼
Worker  ──►  Discord: Nachricht im Kanal + Thread "GR-XXXXX-XXXXX"
   │
   │  Chef tippt im Thread:  /reply GR-XXXXX-XXXXX Dein Text
   ▼
Discord  ──►  POST /interactions  (Discord RUFT AN, deshalb muss nichts lauschen)
   │
   ▼
Worker legt die Antwort unter der Ticket-Nummer ab
   │
   │  Spiel fragt beim Start und dann minütlich:  GET /poll?tickets=…
   ▼
Popup "A Developer sent you mail!" + Brief im Postfach
   │
   │  Spieler antwortet:  POST /message
   ▼
Worker  ──►  postet in denselben Discord-Thread
```

Der entscheidende Punkt, warum das ohne dauerlaufenden Bot geht: **Slash-Befehle sind ein
Anruf von Discord an uns**, kein Zuhören von uns bei Discord.

---

## Einrichtung (einmalig, etwa 20 Minuten)

### 1. Discord-Anwendung anlegen
1. <https://discord.com/developers/applications> → **New Application**, Name z. B. `Grim Reach Support`.
2. Reiter **Bot** → **Add Bot**. Den **Token** kopieren (das ist ein Geheimnis, nur einmal sichtbar).
3. Reiter **General Information** → **Public Key** kopieren.
4. Oben die **Application ID** kopieren.
5. Reiter **OAuth2 → URL Generator**: Haken bei `bot`, Rechte `Send Messages`, `Create Public Threads`,
   `Send Messages in Threads`. Die erzeugte URL öffnen und den Bot auf deinen Server einladen.
6. In Discord den Ziel-Kanal rechtsklicken → **Kanal-ID kopieren** (dafür muss unter
   *Einstellungen → Erweitert* der **Entwicklermodus** an sein).

### 2. Worker anlegen
```bash
cd tools/support-bridge
npm install
npx wrangler login                       # öffnet den Browser, einmalig
npx wrangler kv namespace create TICKETS # gibt eine id aus
```
Die ausgegebene **id** in `wrangler.toml` bei `[[kv_namespaces]]` eintragen, ebenso die
**Kanal-ID** bei `DISCORD_CHANNEL_ID`.

Dann die beiden Geheimnisse setzen (landen bei Cloudflare, nicht in der Datei):
```bash
npx wrangler secret put DISCORD_BOT_TOKEN
npx wrangler secret put DISCORD_PUBLIC_KEY
```

### 3. Veröffentlichen
```bash
npx wrangler deploy
```
Am Ende steht eine Adresse wie `https://grimreach-support.<dein-konto>.workers.dev`.
Prüfen: `https://…/health` muss `{"ok":true}` liefern.

### 4. Discord sagen, wohin es rufen soll
In der Discord-Anwendung unter **General Information** → **Interactions Endpoint URL** die Adresse
plus `/interactions` eintragen, also `https://…workers.dev/interactions`, und speichern. Discord
schickt sofort einen Test-Anruf; nimmt es die Adresse an, stimmt die Signaturprüfung.

### 5. Den Befehl registrieren
```bash
DISCORD_APP_ID=… DISCORD_BOT_TOKEN=… DISCORD_GUILD_ID=… node register-commands.mjs
```
Mit `DISCORD_GUILD_ID` (deine Server-ID) ist `/reply` **sofort** verfügbar. Ohne sie wird der
Befehl global registriert und Discord braucht bis zu einer Stunde.

---

## Benutzung

Im Thread (oder irgendwo im Server) tippen:

```
/reply ticket: GR-ABCDE-FGHIJ  text: Hi, New Haven ist nicht weg — es steht jetzt oben unter Combat.
```

Discord bestätigt dir still („Zugestellt an …", nur du siehst es). Der Spieler bekommt die
Nachricht beim nächsten Abruf, also binnen einer Minute, solange sein Spiel läuft.

---

## Vorher wissen

- **Kein Live-Chat.** Das Spiel fragt minütlich nach. Deine Antwort ist also binnen einer Minute
  da, nicht in Echtzeit.
- **Deine Antwort wird nicht übersetzt.** Ein russischer Spieler liest sie so, wie du sie tippst.
- **Tickets verfallen nach 90 Tagen** (`TICKET_TTL_S` in `src/index.ts`).
- **Missbrauchsschutz:** 60 Anfragen pro IP und Minute, 4000 Zeichen je Text, Ticket-Nummern mit
  50 Bit Zufall (nicht erratbar). `/interactions` ist davon ausgenommen und stattdessen durch
  Discords Signatur geschützt.
- **Kosten:** Cloudflares kostenlose Stufe deckt 100.000 Anfragen pro Tag. Bei einem Abruf je
  Spieler und Minute trägt das rund 1000 gleichzeitige Spieler.

---

## Was im Spiel noch fehlt

Dieser Worker ist die eine Hälfte. Im Client fehlen noch: Ticket-Nummer erzeugen und merken,
der Abruf im Minutentakt, das Popup „A Developer sent you mail!", der Brief im Postfach und das
Antwortfeld. Der Brief ist der einzige Teil, der den Spielstand berührt: die vorhandenen Briefe
tragen nur Übersetzungsschlüssel, nie Rohtext — eine Entwickler-Antwort braucht deshalb eine
neue Postfach-Art mit SAVE_VERSION-Sprung und Migration.
