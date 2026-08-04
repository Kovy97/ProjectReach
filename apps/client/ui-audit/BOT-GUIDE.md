# Bot-Guide — `ui-audit/bot.mjs`

Für JEDEN Agenten, der den Grim-Reach-Client durch ein Skript steuern soll — auch ein schwächeres
Modell. Du brauchst KEIN Playwright-Wissen, keine Ports, keine GPU-Flags, keine
`window.__hfDebug`-Interna. Alles ist deklarativ: eine Liste von `verb:arg`-Kommandos rein, eine
`result.json`-Datei raus. **Lies NUR diese Datei — nicht `SIM-AGENT-GUIDE.md`, nicht
`sim-harness.mjs`, außer du baust an bot.mjs selbst mit.**

## Quickstart (copy-paste, unter 60s)

```
cd apps/client
node ui-audit/bot.mjs --fixture midgame --do "goto:combat; zone:pastures; fight-now:chicken; wait:combat-active; shot:probe.png; state:combat"
```

Danach: die Zeile, die nach `RESULT:` ausgegeben wird, ist ein Dateipfad — öffne GENAU DIESE Datei
und lies NUR sie. Exit-Code 0 = alles `ok:true`. Exit-Code 1 = irgendeine Aktion ist `ok:false`,
lies ihr `error`+`hint`-Feld.

Falls der allererste Lauf mit einem "browser not found"/"Executable doesn't exist"-Fehler abbricht
(einmaliger lokaler Playwright-Download, keine Sache von bot.mjs selbst):

```
pnpm --filter @hearthforge/client exec playwright install chromium
```

## Harte Regeln

- **Immer aus `apps/client/` heraus starten** (oder absolute Pfade für `--actions`/`--out` nutzen).
- **NIE Electron/`pnpm dev` starten.** bot.mjs startet (oder nutzt wieder) seinen eigenen
  Wegwerf-Dev-Server automatisch — das ist keine echte App-Instanz.
- **NIE eine zweite Browser-Seite/einen zweiten Tab öffnen.** Der komplette Spiel-Tick
  (Kampf/Skills/alles) läuft über `requestAnimationFrame` — eine Seite, die nicht im Vordergrund
  ist, bekommt ihre rAF pausiert und friert scheinbar ein. Ein bot.mjs-Aufruf = eine Seite = ein
  zusammenhängender Ablauf. Brauchst du mehrere Schritte? Reihe sie alle in EINEN `--do`/
  `--actions`-Aufruf.
- **IMMER im Vordergrund abwarten** — bot.mjs holt vor jeder Aktion automatisch die Seite in den
  Vordergrund (`bringToFront`); du musst dafür nichts tun, aber verlass dich NICHT auf einen
  eigenen zweiten Prozess/eine zweite Verbindung zur selben Seite.
- **NUR `result.json` auswerten**, nie stdout/stderr parsen. Konsolen-Rauschen (`RESULT:`/`OK`/
  `FAILED`-Zeilen) ist nur ein Hinweis, wo die Datei liegt — die Wahrheit steht in der Datei.
- Ein bot.mjs-Aufruf fährt SEINEN Dev-Server am Ende immer wieder runter (außer er hat einen
  bereits laufenden fremden wiederverwendet) — Spielstand persistiert NICHT über zwei separate
  bot.mjs-Aufrufe hinweg. Für einen zusammenhängenden Test: alles in EINE Aktionsliste packen.
- Bei parallelen Bot-Sessions (mehrere Agenten gleichzeitig): jede Session braucht ihren EIGENEN
  `--port` aus 5340-5359 (Default 5340 nur für einen einzelnen/sequenziellen Bot sicher).

## CLI

| Flag | Pflicht | Default | Bedeutung |
|---|---|---|---|
| `--fixture <name>` | nein | keins → Hauptmenü | `midgame` oder `endgame` (s. `ui-audit/fixtures/*.json`) |
| `--do "<a>; <b>; ..."` | genau eins von `--do`/`--actions` | — | Aktionsliste inline, `;`-getrennt |
| `--actions <datei.json>` | genau eins von `--do`/`--actions` | — | JSON-Array von `"verb:arg"`-Strings (oder `{"type":"verb","arg":"..."}`-Objekten, äquivalent) |
| `--out <datei.json>` | nein | `ui-audit/bot-runs/<timestamp>-<pid>/result.json` | wohin result.json + Screenshots dieses Laufs geschrieben werden (derselbe Ordner) |
| `--port <n>` | nein | 5340 | reservierter Bereich 5340-5359 |
| `--viewport <B>x<H>` | nein | 1920x1080 | |
| `--locale <en\|de>` | nein | en | |

Beide Formen des Aktionsliste sind gleichwertig — nimm, was dir leichter fällt:

```json
["goto:combat", "zone:pastures", "fight-now:chicken", "wait:combat-active", "shot:kampf.png"]
```
```json
[{ "type": "goto", "arg": "combat" }, { "type": "wait", "arg": "combat-active" }]
```

## Aktions-Vokabular

| Aktion | Beispiel | Was passiert |
|---|---|---|
| `goto:<pageId>` | `goto:combat` | Klickt den Sidebar-/TopBar-Nav-Button mit dieser id (Werte aus `navigation.ts`: character, combat, skills-overview, mastery, bestiary, achievements, quests, bank, shop, options, stats, companions, enchanting, mail, oder ein Skill-Id wie mining/smithing/cooking/...) |
| `zone:<zoneId>` | `zone:pastures` | Öffnet eine Zone aus dem Kampf-Zonen-Grid (geht bei Bedarf erst automatisch aus einer Zonen-Detailansicht zurück) |
| `card:<monsterId>` | `card:chicken` | Scrollt die Monster-Karte ins Bild (reine Sichtbarkeits-Prüfung, kein Klick) |
| `fight-now:<monsterId>` | `fight-now:chicken` | Klickt den „Sofort kämpfen"-Button dieser Monster-Karte |
| `queue:<monsterId>x<n>` | `queue:chickenx25` | Reiht n Kills ein (nutzt den 1/5/10-Preset-Button, sonst das freie Eingabefeld) |
| `click:<css>` oder `click:text=<text>` | `click:.dungeon-enter` / `click:text=Confirm` | Generischer Fallback für alles ohne eigenes Vokabular (Dungeon-Enter, Quest-Claim, Shop-Kauf, Modal-Bestätigen, …) |
| `type:<css>=<text>` | `type:.qty-picker-input=25` | Füllt ein Text-/Zahlenfeld (per `.fill`, löscht vorherigen Inhalt) |
| `wait:<kind>` | `wait:combat-active` | Blockiert bis eine Bedingung eintritt (Arten unten); optional `@<ms>` für ein eigenes Timeout, z.B. `wait:combat-active@20000` |
| `shot:<name>.png` | `shot:kampf.png` | Screenshot (Viewport, kein Full-Page-Scroll) in den Lauf-Ordner |
| `state:<path>` | `state:combat` | Kuratierter `__hfDebug`-Auszug (NIE der volle State) — Pfade: `combat`, `queue`, `inventory-count`, `level`, `gold` |
| `assert:<ausdruck>` | `assert:state.combat.monsterId == "chicken"` | Lässt den Lauf fehlschlagen, wenn der JS-Ausdruck falsy ist (Variablen: `state`, `content`) |

`wait:`-Arten: `combat-active`, `combat-idle`, `page-loaded`, `toast`, `selector=<css>`.

Jede Aktion bekommt automatisch EINEN Retry-Versuch (kurze Pause, dann nochmal) — ein Timing-
Flackern muss nicht extra behandelt werden.

## Ausgabeformat (`result.json`)

```json
{
  "ok": true,
  "fixture": "midgame",
  "port": 5340,
  "actions": [
    { "action": "goto:combat", "ok": true, "ms": 210, "note": "navigiert zu \"combat\"" },
    { "action": "zone:pastures", "ok": true, "ms": 340, "note": "Zone \"pastures\" geöffnet" },
    { "action": "fight-now:chicken", "ok": true, "ms": 55, "note": "Sofort-Kampf gegen \"chicken\" gestartet" },
    { "action": "wait:combat-active", "ok": true, "ms": 80, "note": "Kampf aktiv" },
    { "action": "shot:kampf.png", "ok": true, "ms": 40, "file": "G:\\...\\bot-runs\\...\\kampf.png" },
    { "action": "state:combat", "ok": true, "ms": 8, "data": { "monsterId": "chicken", "enemyHp": 11, "playerHp": 240, "kills": 0, "dungeonId": null, "paragonFloor": null, "eliteVariantId": null, "stopReason": null } }
  ],
  "summary": { "total": 6, "ok": 6, "failed": 0 },
  "pageErrors": [],
  "durationMs": 3120
}
```

Bei einem Fehlschlag bricht der Lauf NACH der fehlgeschlagenen Aktion ab (Folgeaktionen bauen
typischerweise auf ihr auf) — `actions` enthält dann weniger Einträge als geplant, der letzte hat
`ok:false` mit `error`+`hint`. `pageErrors` sind Browser-Konsolenfehler der ganzen Session
(informativ, verhindern für sich allein kein `ok:true`).

## Troubleshooting

| Symptom | Abhilfe |
|---|---|
| Exit 1, letzte Aktion hat `error`/`hint` | `hint` wörtlich lesen — er nennt die konkrete Abhilfe |
| `"...did not come up..."` | Portkollision — anderen `--port` aus 5340-5359 probieren |
| `"browser not found"`/`"Executable doesn't exist"` | einmalig `pnpm --filter @hearthforge/client exec playwright install chromium` |
| `zone:`/`card:`/`fight-now:` "nicht gefunden" | Vorher `goto:combat`? Ist das Monster in dieser Zone? Zone per Story-Fortschritt gesperrt (`storyLocked`) — Fixture mit mehr Fortschritt nötig, z.B. `midgame` statt keins |
| `wait:combat-active` läuft in Timeout | Ist die VORHERIGE Aktion (fight-now/queue) wirklich `ok:true`? Mit `state:combat` den Ist-Zustand prüfen |
| `wait:toast` läuft in Timeout | Toasts verschwinden nach ~4s wieder — evtl. schon abgelaufen, oder das erwartete Ereignis (Level-up/Drop/Achievement) ist gar nicht eingetreten |
| Ablauf wirkt "eingefroren" mitten im Flow | Hast du versehentlich eine zweite Seite/einen zweiten Prozess auf dieselbe Session losgelassen? (harte Regel oben) |
| `--actions`-Datei wird nicht gefunden | Pfad ist relativ zum aktuellen Arbeitsverzeichnis — absoluten Pfad nutzen, wenn unsicher |

## Lektionen aus dem Sweep (Fixtures & Timing)

Fünf Stolperfallen aus dem 6-Bot-Sweep (Task #355), die jeden Agenten treffen können:

- **Fixtures MÜSSEN in BEIDE Orte.** `ui-audit/fixtures/<name>.json` UND
  `src/renderer/public/ui-audit-fixtures/<name>.json` — der Client lädt zur Laufzeit NUR aus
  `public/`. Eine Fixture, die nur in `ui-audit/fixtures/` liegt, existiert für `--fixture <name>`
  schlicht nicht (leerer/Default-State statt der erwarteten Szene).
- **`character.combatStyle` ist die Nahkampf-Stance, keine Kampfschule.** Gültige Werte sind
  `attack` / `power` / `defensive` (die drei Melee-Haltungen) — NIEMALS `"ranged"` oder `"magic"`
  hineinschreiben, auch wenn der Charakter eine Fernkampf-/Magie-Ausrüstung tragen soll. Ein
  ungültiger Wert lässt den Bootstrap beim Laden STUMM fehlschlagen (kein Fehler, einfach ein
  Zustand, der nicht zur erwarteten Fixture passt) — der Kampfstil selbst hängt an der
  ausgerüsteten Waffe, nicht an diesem Feld.
- **`shot:` direkt nach `wait:combat-active` erwischt oft den Vor-Render-Frame.** Der Wait-Zustand
  wird erreicht, bevor React den Frame tatsächlich gemalt hat — ein Screenshot in genau diesem
  Moment zeigt manchmal noch den alten/leeren Zustand. Bei kritischen Beleg-Screenshots lieber
  2-3 `shot:`-Aktionen hintereinander (unterschiedliche Dateinamen) statt einer einzelnen.
- **Eigene Fixture-Präfixe pro Bot.** Läuft ein Sweep mit mehreren parallelen Agenten, wählt jeder
  Bot ein eigenes Namenspräfix für seine Fixtures (z.B. `dsw_*`, `db_*`) und fasst NIE Fixtures
  eines anderen Präfixes an — sonst überschreiben sich parallele Läufe gegenseitig.
- **Port-Notizen (empirisch aus dem Sweep):** 5357 ist unter Windows oft belegt/blockiert;
  5341/5342 sind kollisionsanfällig (andere lokale Tools greifen gern genau dorthin); 5348/5349
  liefen im Sweep durchgehend stabil — bei Portkonflikten zuerst dort probieren.

## Grenzen (bewusst NICHT im Vokabular — nutze `click:`/`type:` generisch dafür)

Dungeon-Enter-Button, Quest-Claim, Shop-Kauf, Elite-/World-Spawn-Karten, Menü-/Charaktererstellung-
Flows haben (noch) kein eigenes Kommando — sie sind aber jederzeit über den generischen
`click:<css>`/`click:text=<text>`-Fallback erreichbar. Wenn ein Bot-Sweep-Programm regelmäßig
gegen einen dieser Flows läuft, an ui-dev melden — dann lohnt sich ein eigenes Kommando.
