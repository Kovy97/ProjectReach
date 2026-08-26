# 1.2.0 „Alive" — Brainstorm Weltsysteme

**Perspektive:** Die Welt bewegt sich, auch wenn der Spieler nicht hinschaut.
**Stand:** 26.08.2026 · Systemdesign „lebendige Welten" · nur Design, kein Code.
**Gelesen:** `00-kontext.md`, `engine/blessing.ts`, `engine/tick.ts` (advance/step/offline), `engine/camp.ts`,
`engine/elites.ts`, `engine/quests.ts` (Daily-Seed), `engine/mail.ts`, `engine/slayer.ts`, `shared` (GameState,
CampState, EliteZoneState, OfflineSummary, MailMessage), `persistence` (deserialize/Offline-Fenster),
`pages/NewHavenPage.tsx`, `CombatPage.tsx` (Zonenkarten), `OfflinePopup.tsx`, `Sidebar.tsx`, `TopBar.tsx`,
`design/lore/*`, `design/newhaven-ausbau-retention.md`, `newhaven-ausbau-roadmap.md`, `elite-spawns-concept.md`.

## Vorbemerkung: woran alles andockt (Fakten aus dem Code)

- **Die Engine kennt Wanduhrzeit, aber nur als Parameter.** `advance(state, content, dtMs, { nowMs })` leitet aus
  `nowMs - dtMs` den Fensterstart ab und rückt pro 100-ms-Tick einen `wallClockMs` vor, der an `step()` geht.
  `blessingForTime(nowMs)` ist eine reine Funktion davon, mit Tages-Cache (lokale Mitternacht als Grenze).
  Offline-Catch-up (`persistence.deserialize`: `savedAt..now`, Cap 8 h + Wachturm bis 11 h) läuft durch denselben
  Pfad. **Das ist die Schiene für jedes Weltsystem:** Welt = Funktion der Zeit, nie ein zweiter Simulator.
- **Es gibt einen Kalendertag im Save:** `stats.lastDailyDay`, `stats.dailyStreak`, `slayerFreeSkipDay` als
  Stempel `YYYYMMDD` (lokal), `nextCalendarDay()` in shared, Monotonie-Guard („day < last → nichts").
  Dailies werden aus `(content, day)` deterministisch gezogen (`pickDailyQuests`).
- **Zwei RNG-Ströme:** `state.rng` (Grind, bit-identisch offline==online) und `state.eliteRng` (nur online, in
  `step` hinter dem `offline`-Guard). Muster für weitere Ströme: `deriveEliteRngSeed(mainSeed)`.
- **Postfach existiert:** `sendLetter(state, "brenna" | "warden", textKey, items)`, `MailPage`, `nav.mail`.
  Genutzt bisher zweimal (erster Champion, erstes Unique).
- **Der Wächter spricht schon bei Rückkehr:** `OfflinePopup` mit `offline.warden.*`-Bausteinen aus
  `OfflineSummary` (ms, gold, xp, items, kills, deaths, petDrops, achievements) plus Camp-Abschnitt.
- **NPC-Medaillons existieren:** `npc.quests|bank|shop|slayer.*` mit Segen-/Elite-/Tod-Varianten auf Quest-,
  Bank-, Mail-Seite. Das Muster „Figur sagt einen Satz zur Lage" ist da, es fehlt nur die Lage.
- **Zonenkarten haben Badge-Slots:** `zone-card-elite-badge`, `-tracks-badge`, `-complete-badge`,
  `-story-lock-badge`, dazu Meta (Level, Gegnerzahl) und Fortschritt (Kills/Drops).
- **New Haven:** 15 Gebäude, Bauwarteschlange, Veredler, Positionen auf Karte. Flavourtexte nennen bereits
  Mux (Händlerposten), Voss (Speicher), Brenna (Trophäenwand). Roster der Glutfeste in der Weltlore § 3.5:
  Brenna, Urga, Voss, Mux, Shairi, Eske. Die Wächterstraße (encampment-lore § 1.3) verbindet Glutfeste und
  New Haven durch die Zonen.
- **Schon vorgeschlagen, noch nicht gebaut:** Schwarzes Brett (Retention § 2), Karawane (§ 4), Siedler mit
  Gesichtern (NH-Erzählung § 1), „Die Welt schlägt zurück" (§ 4), Maren (Chef-GO für 0.4). Ich wiederhole
  das nicht, ich hänge es an eine gemeinsame Uhr.

---

## 1. Drei Leitgedanken

**1. Die Welt ist eine Funktion der Zeit, kein zweiter Simulator.** Alles, was „ohne den Spieler passiert",
wird aus `(Kalenderzeit, Welt-Seed)` abgeleitet, nie aus einer Hintergrund-Simulation, die tickt, wenn keiner
hinsieht. Dadurch ist die Welt beim Offline-Nachholen bit-identisch zur Live-Welt, kostet pro Tick eine
Cache-Abfrage und braucht keinen Save-State für sich selbst. Nur die **Antworten** des Spielers (geliefert,
gejagt, gelesen, gewählt) sind State.

**2. Lebendig heißt: es gab ein Gestern, und es gibt ein Morgen.** Ein Idle-Spiel wird nicht durch mehr
Bewegung auf dem Bildschirm lebendig, sondern dadurch, dass beim Reinschauen etwas **erzählt** wird, was
geschehen ist, und etwas **angekündigt** wird, was kommt. Die Chronik nach hinten, der Kalender nach vorn.
Der Idle-Rhythmus „morgens lesen und stellen, abends ernten" braucht genau diese zwei Richtungen.

**3. Die Welt antwortet auf Taten, nicht auf Anwesenheit.** Nichts geht verloren, weil man weg war; nichts
verlangt, zu einer Uhrzeit da zu sein. Aber was der Spieler an einem Tag tut, verschiebt, was die Welt am
nächsten Tag ist (Präsenz in einer Zone, gelieferte Bedarfe, gefallene Champions). Kampf bleibt dabei der
Hebel: Die Welt bewegt sich am stärksten dort, wo gekämpft wird.

---

## 2. Ideen

Reihenfolge = Abhängigkeit. W1 ist Fundament, W3/W4 sind das Erzählen, W5 bis W7 sind die Bewegung, W8 bis
W11 sind Verstärker. Aufwand: S ≈ 1 Agent-Tag, M ≈ 2 bis 4 Tage, L ≈ eine Woche.

### W1 · Die Weltuhr und die Zonenlagen (Fundament)

**Erlebnis.** Jede Zone hat an jedem Tag eine Lage: Die Krypta liegt unter „Fäulnis", die Grenzlande unter
„Belagerung", der Wildwald in „Blüte", die Küste im „Nebel", die meisten Zonen einfach in „Stille". Auf der
Zonenkarte steht ein kleines Emblem mit einem Satz („Belagerung: Die Kriegsbande sammelt sich. Mehr Gold,
härtere Gegner."), und die Lage verändert spürbar, aber mild, was diese Zone heute abwirft. Morgen ist es
eine andere Zone, und wer morgens draufschaut, weiß, wohin sich die Warteschlange heute lohnt.

**Engine / Idle.** Reines Muster `blessing.ts`: `worldDay(worldSeed, dayStamp)` erzeugt aus einem
Einweg-Hash `(seed, YYYYMMDD)` einen ephemeren mulberry32 und zieht daraus je Zone eine Lage
(Gewichtung: 60 % Stille, Rest verteilt, nie zweimal dieselbe Lage in derselben Zone an Folgetagen). Ergebnis
wird pro Tag gecacht wie `blessingForTime`. Callsites: dort, wo heute `blessingMult(nowMs, kind)` gelesen wird
(`tick.ts completeAction`, `combat.ts` Kill-Pfad), kommt ein `zoneLageMult(nowMs, zoneId, kind)` dazu, gleiche
Neutralitäts-Regel (ohne `nowMs` → 1, keine zusätzlichen RNG-Züge). Offline-Catch-up sieht dieselben Lagen pro
Tick, weil `advance` den Zeitstempel bereits pro Tick fortschreibt und an der Mitternacht segmentiert.
Lagen werden für **alle** Zonen gezogen, unabhängig von Freischaltung, damit die Funktion rein bleibt; die UI
zeigt nur freigeschaltete.

Vorschlag für sechs Lagen, jede mit genau einem Effektpaar (Anreiz + Farbe), Werte ≤ 1.15:

| Lage | Wirkung (Zone) | Farbe |
|---|---|---|
| Stille | keine | Grundzustand |
| Belagerung | Gold +15 %, Gegner-Rüstung +10 % | Grenzlande, Aschfelder bevorzugt |
| Blüte | Rare-Drop +10 % | Wildwald, Weiden, Küste |
| Fäulnis | XP +10 %, Gegner-Regeneration +10 % | Krypta, Schwarzdorn |
| Nebel | Elite-Ruhe kürzer (online), Sichtung im Kodex zählt doppelt | Küste, Hochland |
| Blutfährte | Doppelbeute-Chance +5 % auf Zonen-Champions | Slagpit, Götzenhalle |

**State.** Ein neues Feld `worldSeed: number` (additiv, SAVE_VERSION +1). Migration: für Alt-Saves aus
`rng.state ^ Konstante` ableiten und einfrieren, für neue Charaktere bei Erstellung setzen. Sonst nichts,
die Lagen selbst sind kein State.

**UI.** Zonenkarte (`CombatPage`): Lage-Emblem als weiterer Badge-Slot, Hover mit Satz. TopBar (heute nur
59 Zeilen: Nav + Quest-Hinweis): eine „Weltzeile" mit Segen des Tages, Tagesphase und den 1 bis 2 Zonen,
die heute nicht in Stille liegen. Gegnerliste: kleiner Balken „Belagerung: +15 % Gold" neben dem Zonentitel.

**Art.** Bestand reicht: sechs Lage-Embleme aus dem vorhandenen Emblem-/Status-Icon-Satz, Zonenbilder per
CSS-Tint (Nebel = entsättigt, Fäulnis = grünstich). Optional neu: sechs eigene 32-px-Embleme.

**Aufwand.** M (Engine S, Content-Tabelle S, UI M, Balance-Guard S).
**Risiko.** Multiplikator-Stapelung mit Segen und Schrein → gemeinsamer Deckel (Muster
`CAMP_BLESSING_BOOST_CAP`), Lage nie negativ auf XP/Gold. Uhr-Manipulation → nur Multiplikatoren, keine
Freischaltungen, dazu der bestehende Monotonie-Guard für Tagesstempel.
**Abhängigkeiten.** Keine. Alles Weitere hängt an W1.

### W2 · Nacht im Reach (Tag- und Nachthälfte)

**Erlebnis.** Zwischen 20 und 6 Uhr lokaler Zeit wird das Reach dunkel: Zonenbilder abgedunkelt, die
Untoten-Zonen zeigen „Nachtwache", die Küste „Ebbe". Nachts sind Krypta und Schwarzdorn lohnender bei
seltenen Drops, das Angeln an der Furt geht besser, Holzfällen schlechter; einzelne Sammelaktionen tragen
ein Nacht-Extra („Nachtblüte" aus dem Foraging, nur nachts). Wer tagsüber spielt, erlebt die Nacht über den
Offline-Bericht: Das Achtstundenfenster enthält immer eine.

**Engine / Idle.** `dayPhaseForTime(nowMs)` mit zwei Cache-Grenzen (06:00/20:00 lokal), sonst identisch
zu W1. Effekte nur als Multiplikatoren und als zusätzliche Drop-Zeilen mit Phasen-Bedingung (`phase: "night"`
an einer Drop-Zeile, gelesen mit demselben `nowMs`). Kein neuer RNG-Zug: Die Nacht-Zeile wird im
bestehenden Roll mit Chance 0 behandelt, wenn Tag ist (Muster `blessingChance` liefert 0 statt Wurf).
Kampf-gegatete Materialien bleiben kampf-gegatet: Nacht-Extras sind Kräuter, Fische, Essenzen, nie Kampfmats.

**State.** Keiner.
**UI.** TopBar-Weltzeile (Sonne/Mond mit Zeit bis zum Wechsel), Zonenkarten-Tint, kleine Mond-Markierung an
betroffenen Aktionen auf den Skill-Seiten.
**Art.** Bestand: CSS-Abdunklung der Zonenbilder, Sonne/Mond aus dem Icon-Satz. Neu wünschenswert, aber
nicht nötig: eine Nachtvariante der New-Haven-Kulisse (Retention § 4 wollte sie ohnehin).
**Aufwand.** S bis M.
**Risiko.** Spieler in Nachtschicht sehen nur Nacht → Balance so, dass Tag und Nacht gleich viel wert sind,
nur anders. Zeitzonen-Reisen: harmlos, weil reine Multiplikatoren.
**Abhängigkeiten.** W1 (Weltzeile, Cache-Muster).

### W3 · Die Chronik des Tages (Nachrichten-Feed des Wächters)

**Erlebnis.** Die Quest-Seite bekommt ein Blatt „Chronik", auf dem der Wächter den Tag zusammenfasst:
Weltzeilen („Nebel über der Küste. Zweiter Tag."), Taten („Du hast 212 Goblins gefällt. Der Schamane war
zum ersten Mal dabei."), Lagerzeilen („Der Bautrupp meldet: Sägegrube II steht."), Besuche („Mux' Karren
stand bis Mittag an der Furt."). Ältere Tage bleiben blätterbar, sieben Tage tief. Wer nach zwei Tagen
zurückkommt, liest zwei Seiten, nicht eine Zahl.

**Engine / Idle.** Einträge sind **keine Texte**, sondern kompakte Ereignis-Datensätze
`{ kind, refs, dayStamp, seq }` mit i18n-Schlüssel-Ableitung in der UI (Muster `sendLetter` mit `textKey`).
Erzeugung an deterministischen Punkten: (a) `advance()` erkennt den Tageswechsel am fortgeschriebenen
`wallClockMs` und schreibt die Weltzeilen des neuen Tages (aus W1, rein abgeleitet); (b) bestehende Hooks
(`completeCampBuild`, `onEliteKilled`, Quest-Claim, Kapitel-Abschluss, erster Fund, Slayer-Serie) schreiben
Tat-Zeilen; (c) beim Tageswechsel wird aus den Tageszählern eine Bilanzzeile gebildet (Kills, Gold, XP, aus
Differenz zu einem Tages-Snapshot). Deckel: 12 Einträge je Tag, 7 Tage, ältere fallen weg. Kein RNG. Offline
läuft es identisch, weil alles am Tick hängt.

**State.** `chronicle: ChronicleEntry[]`, `chronicleSeq: number`, `daySnapshot: { day, kills, gold, xp }`
(additiv).
**UI.** Tab „Chronik" auf `QuestsPage` (dort sitzt schon das Wächter-Medaillon), Vorschau der drei jüngsten
Zeilen in der TopBar-Weltzeile beim Hover, Badge im Sidebar-Eintrag bei ungelesenen Tagen.
**Art.** Bestand: Wächter-Medaillon, Monster-/Item-/Gebäude-Icons als Zeilen-Symbole, Pergament-Stil.
**Aufwand.** M (Datensatz S, Hooks S, Tageswechsel-Erkennung S, UI M, Texte in 7 Sprachen M).
**Risiko.** Rauschen. Regeln: nie zwei gleiche Zeilenarten hintereinander, Weltzeilen vor Tatzeilen,
Bilanz immer als letzte Zeile, Stimme nach `waechter-stimme-pack.md` (kurz, gesprochen, ein Gedankenstrich).
**Abhängigkeiten.** W1 für Weltzeilen; jedes weitere System liefert Zeilen hinein.

### W4 · „Was in der Zwischenzeit geschah" (Offline-Rückkehr als Bericht)

**Erlebnis.** Das Offline-Popup wird dreiteilig: links „Die Welt" (welche Lagen kamen und gingen, ob eine
Nacht dazwischen lag, wer in New Haven vorbeikam), mittig „Du" (der bestehende Ertragsbericht mit
Wächterzeile), rechts „New Haven" (Bauten, Veredlung, neue Bedarfe). Alles in der Stimme des Wächters, mit
dem Satz oben, den es heute schon gibt: „Du warst {time} weg. Das hier ist in der Zeit passiert." Wer etwas
verpasst hat (Brenna war da), findet unten einen Brief statt einer Lücke.

**Engine / Idle.** Der Welt-Teil braucht **keinen** gespeicherten Verlauf: Weil W1 eine reine Funktion der
Zeit ist, rekonstruiert das Popup aus `savedAt..now` alles, was in dem Fenster galt (Tage durchlaufen,
`worldDay` je Tag abfragen). Der Du-Teil ist `OfflineSummary` (existiert). Der Lager-Teil ist der bestehende
Camp-Abschnitt plus W7-Bedarfe. Verpasste Besuche erzeugen beim Laden einen Brief (W8), deterministisch aus
dem Fenster, nicht aus Zufall.

**State.** Keiner zusätzlich (Briefe laufen über `mailbox`).
**UI.** `OfflinePopup` (552 Zeilen) um zwei Spalten erweitern; auf kleinen Auflösungen (1366×768, siehe
UI-Skalierungs-Regel) als drei Abschnitte untereinander.
**Art.** Bestand.
**Aufwand.** S bis M.
**Risiko.** Popup wird lang → harte Deckel (max. 4 Weltzeilen), „ruhige Nacht"-Variante bleibt der
Normalfall wie im Stimmen-Paket vorgesehen.
**Abhängigkeiten.** W1, W3 (Zeilenvorrat), W7/W8 für die Lager- und Briefteile.

### W5 · Die Kopfgeldtafel: Gezeichnete auf der Wächterstraße

**Erlebnis.** Bei Brenna hängt eine Tafel mit drei Gezeichneten der Woche: benannte Champions („Grauzahn,
der die Furt kennt"), jeder mit Route: Montag und Dienstag im Schwarzdorn, Mittwoch bis Freitag in der
Krypta, danach fort. Auf der Zonenkarte trägt die Zone, in der er gerade steht, ein Kopfgeld-Badge. Man
stellt die Jagd in die Warteschlange wie einen Elite-Kampf, der Kopf landet an der Trophäenwand, die Chronik
schreibt eine Zeile, Brenna zahlt Slayer-Punkte und einmal je Woche ein Andenken.

**Engine / Idle.** Wochen-Seed `worldWeek(worldSeed, weekStamp)` (Montag als Wochenbeginn, lokal) zieht aus
einem Pool von Gezeichneten (Content: Name, Basis-Monster, Route als Liste von `{zoneId, days}`, Skalierung)
drei Einträge, band-gewichtet nach Gesamtlevel-Snapshot am Wochenbeginn. Der Kampf nutzt
`eliteScaledMonster` (existiert) mit eigener Namenszeile, wird **vom Spieler gestartet** wie
`startEliteCombat` und darf daher offline zu Ende gekämpft werden (Elite-Regel § 1.3: spielerseitig
ausgelöst). Anders als Eliten gibt es kein 15-Minuten-Fenster: Der Gezeichnete steht den ganzen Zonentag
dort, und ein einmal begonnener Kampf zählt auch, wenn die Route weiterzieht. Genau ein Kopf pro Gezeichneten
und Woche. Kein Zug aus `state.rng` für die Auswahl; die Kampf-Beute rollt wie jeder Kampf.

**State.** `bounties: { week: number, heads: Record<bountyId, true>, snapshotLevel: number }` (additiv).
**UI.** `SlayerPage`: Tafel neben Brennas Auftrag (Karten im Shop-Stil, Basalt-Zeilen, `btn-iron` „Jagen").
Zonenkarte: Kopfgeld-Badge. Trophäenwand in New Haven zählt Köpfe (Hover-Liste).
**Art.** Bestand: Monster-Art des Basis-Gegners mit Namensrahmen (wie Elite-Karten), Brenna-Medaillon. Kein
neues Bild nötig; Namen und Routen sind Text.
**Aufwand.** M bis L (Content-Pool ~12 Gezeichnete S, Engine M, UI M).
**Risiko.** Überschneidung mit Eliten → klare Trennung: Eliten = kurze Online-Fenster, zufällig, Uniques;
Gezeichnete = geplant, benannt, wöchentlich, offline-tauglich, Slayer-Punkte. Schwierigkeit: Skalierung
eine Spur über dem Band, sonst wird die Tafel zur Formalität.
**Abhängigkeiten.** W1 (Wochen-Seed), `elites.ts`, Slayer-Punkte, Trophäenwand.

### W6 · Mux' Karren: die Karawane mit Route

**Erlebnis.** Alle vier Tage fährt Mux' Karren von der Glutfeste los und braucht zwei Tage über die
Wächterstraße: Tag 1 „unterwegs durch die Grenzlande", Tag 2 „durch die Aschfelder", dann 24 Stunden am
Händlerposten. Unterwegs hängt an der Zone ein Badge „Karawane in Sicht": Wer dort in diesem Fenster genug
Wegelagerer fällt, sorgt dafür, dass der Karren mit einem Extra-Angebot ankommt. In New Haven steht dann ein
rotierendes Sortiment, einmal pro Halt kaufbar, und Mux sagt einen Satz zur Straße.

**Engine / Idle.** Fahrplan aus W1 (`worldDay` liefert `caravan: { phase, zoneId }`), Route deterministisch aus
`worldSeed` und der Nummer des Zyklus. Geleit = Kill-Zähler des Zonen-Monsterpools im Fenster, gemessen als
Differenz zu einem Baseline-Snapshot beim Fensterbeginn (Muster `repeatBaseline`). Sortiment = deterministische
Auswahl aus einem Content-Pool, Preise nach Shop-Regel (Kauf ≥ 2× Verkaufswert), 1 bis 2 Angebote in
Quest-Tokens. Kein Verpassen von Unikaten: Alles kommt wieder, nur wann ist offen.

**State.** `caravan: { cycle: number, bought: Record<offerId, number>, escortBaseline: number | null }`
(additiv).
**UI.** `NewHavenPage`: Panel am Händlerposten (Karten wie Belohnungsladen). Zonenkarte: Karawanen-Badge.
Sidebar-Badge am New-Haven-Eintrag, solange der Karren steht.
**Art.** Bestand: Händlerposten-Gebäudebild, Mux-Emblem. Neu (klein, optional): ein Karren als Karten-Objekt,
Tag und Nacht.
**Aufwand.** M.
**Risiko.** Gold-Arbitrage (Guard-Test gegen Verkaufswerte, wie Retention § 4 fordert). FOMO nur als Rhythmus,
nie als Verlust.
**Abhängigkeiten.** W1, Händlerposten-Stufen (I: 4 Angebote, III: 6 + Geleit-Slot), W3 für Zeilen.

### W7 · New Haven: Besucher, Bedarfe, Vorfälle

**Erlebnis.** Jeden Tag steht am Zentralhaus ein Tagesblatt: **ein Besucher** (einer der Sechs kommt die
Straße herauf, mit Medaillon und Satz; Voss nur als Zettel), **zwei Bedarfe** (der Räucherhaus-Rauch braucht
Holz, der Bautrupp braucht Barren, Eske will Fisch), **ein Vorfall** als Anlass, nicht als Strafe
(„Spuren am Pfahlring", „Feuer im Sägemehl, gelöscht", „ein Kind hat einen Ring gefunden"). Bedarfe liefert
man aus der Bank mit einem Klick, das verbraucht Material und beschleunigt den laufenden Bau oder gibt
Tokens. Vorfälle schicken einen hinaus: Die Spuren führen zu Goblin-Schurken in den Grenzlanden, und wer
zwanzig fällt, bekommt am Abend die Antwort des Wachturms in der Chronik.

**Engine / Idle.** Alles aus `worldDay` (Besucher, Vorfall, Bedarfs-Rezepte) mit Band-Gewichtung nach
gebauten Gebäuden (Besucher nur an Gebäude, die stehen: Urga ab Schmelzofen, Shairi ab Saatgarten, Eske ab
Kapitel 14). Bedarfe = das Schwarze Brett aus Retention § 2, aber **weltgetrieben statt zufällig**: Der
Vorfall bestimmt die Bedarfe (Feuer → Holz, Kälte → Kohle, Fest → Fisch), also erzählt jeder Bedarf, warum.
Lieferung = Abgabe-Semantik (konsumiert), Belohnung nach Retention-Empfehlung (Tokens ≤ 50 % der
Daily-Ausschüttung, Bautrupp-Stunden). Vorfall-Antworten = Kill-Zähler mit Baseline-Snapshot (wie W6).
Nichts nimmt Schaden, nichts verfällt, kein Timer im Lager.

**State.** `camp.day: { stamp, delivered: Record<needId, true>, answered: boolean, answerBaseline }`
(additiv, in `CampState`).
**UI.** `NewHavenPage`: neues Panel „Am Feuer" (Besucher-Medaillon, zwei Bedarfs-Zeilen mit `btn-iron`
„Liefern", Vorfall-Zeile mit „Auf Karte zeigen"-Sprung zur Zone). Kohlenbecken am Wachturm rot, wenn ein
Vorfall offen ist (NH-Erzählung § 4 Statusstufe).
**Art.** Bestand für Stufe A: die Sechs haben Porträt-Specs (npc_brenna, npc_urga, npc_voss, npc_mux,
npc_shairi, npc_eske); wo ein Porträt noch fehlt, Emblem statt Kopf. Neu nur, wenn Maren (Chef-GO 0.4) als
siebtes Gesicht dazukommt.
**Aufwand.** M (Panel M, Bedarfs-Konsum S, Vorfall-Pool S, Texte M).
**Risiko.** „Steuer-Gefühl" bei zu teuren Bedarfen (Richtwert 10 bis 20 Minuten Farmzeit). Kannibalisierung
der Dailies → Dailies = tun, Bedarfe = geben. Bilder-Bedarf, falls der Chef Köpfe statt Embleme will.
**Abhängigkeiten.** W1, W3, Bank-Abgabe-Pfad, Gebäude-Stufen als Gate.

### W8 · Raben-Post 2: Absender, Einladungen, Begleiter als Boten

**Erlebnis.** Das Postfach füllt sich mit Briefen, die einen Grund haben: Mux kündigt den Karren an, Brenna
hängt einen neuen Kopf an die Tafel, Voss schickt seinen Zettel, der Wächter meldet eine Lage in der Zone,
in der man zuletzt stand. Manche Briefe tragen eine Einladung: ein Knopf „Warteschlange stellen", der die
passende Jagd oder Aktion direkt einreiht. Der aktive Begleiter bringt die Post: Beim Öffnen sitzt sein
Bild neben dem Brief, und ab und zu ist ein kleines Fundstück dabei.

**Engine / Idle.** `MailLetterSender` additiv um `mux | urga | voss | shairi | eske` erweitern; Briefe werden an
denselben deterministischen Punkten wie W3 erzeugt (Tageswechsel, Fahrplan-Phasen, Kopfgeld-Wechsel),
höchstens drei pro Tag. Einladung = `MailMessage` mit optionalem `queueHint: QueuedAction` (additiv), die UI
ruft den bestehenden Queue-Pfad auf. Der Begleiter-Bote ist reine Darstellung; das Fundstück nutzt den
bestehenden Anhang-Pfad (`items`), gezogen aus `worldDay`, nicht aus `state.rng`.

**State.** Erweiterung der bestehenden `MailMessage` um optionale Felder; sonst nichts.
**UI.** `MailPage` (258 Zeilen): Absender-Medaillon, Einladungs-Knopf, Begleiter-Bild am Rand. Badge im
Nav-Eintrag existiert.
**Art.** Bestand: Begleiter-Bilder, NPC-Medaillons/Embleme.
**Aufwand.** S.
**Risiko.** Spam → Deckel und Zusammenfassung („Drei Briefe von heute") nach Muster der Überlauf-Mail.
**Abhängigkeiten.** W3-Hooks, W5/W6/W7 als Absender-Anlässe.

### W9 · Das Gerücht der Woche (Aufgabenkette statt Zettel)

**Erlebnis.** Jede Woche steht auf der Quest-Seite ein Gerücht, drei Schritte lang, aus dem Reach der Woche
gebaut: „Man sagt, im Schwarzdorn heult etwas" → nachts dreißig Dornenwölfe → der Gezeichnete der Woche
zeigt sich in dieser Zone → seine Pelze zu Eske bringen. Am Ende eine Chronikzeile, Tokens, ein Andenken
je Kapitel-Regal. Es fühlt sich an wie eine kleine Quest mit Anfang und Ende, nicht wie „töte 20 X".

**Engine / Idle.** Vorlagen-Pool im Content (~12 Ketten-Vorlagen mit Platzhaltern: Zone, Lage, Gezeichneter,
Bedarf, Empfänger), Auswahl deterministisch aus `worldWeek` und dem Level-Snapshot, Instanziierung in
`QuestDef`-Form mit `objectives`, damit `QuestsPage`, `rawProgress` und `repeatBaseline` unverändert
funktionieren. Schritte bauen auf W1/W2/W5/W7 auf (Nacht-Bedingung als Objective-Filter, Kopf als Objective,
Lieferung als Abgabe-Objective). Kein Verpassen: Ein unvollendetes Gerücht bleibt bis zum Abschluss, das
nächste wartet in der Reihe.

**State.** `weekly: { week, chainId, step, vars, baselines }` (additiv).
**UI.** Quest-Seite: Karte „Gerücht der Woche" über den Dailies, Schrittleiste, Wächter-Zeile je Schritt.
**Art.** Bestand.
**Aufwand.** M bis L (Vorlagen und Texte sind die Arbeit, 7 Sprachen).
**Risiko.** Vorlagen klingen nach Vorlage → wenige, aber gut geschriebene; Variablen nur in Namen, nicht im
Satzbau. Objective-Typen brauchen zwei neue Arten (Nachtbedingung, Abgabe).
**Abhängigkeiten.** W1, W2, W5, W7, Quest-Engine.

### W10 · Monde und Feste (Kalender)

**Erlebnis.** Das Jahr des Reachs hat vier Monde nach den echten Jahreszeiten (Aschemond, Dornmond,
Gezeitenmond, Frostmond), jeder verschiebt, welche Lagen häufig sind, und jeder trägt ein Fest von drei
Tagen: die Nacht der Ertrunkenen an der Küste, die Wilde Jagd im Wildwald, der Glockentag in New Haven.
Feste bringen ein Andenken in den Belohnungsladen, eine Fest-Lage in einer Zone und eine Chronikseite mit
eigener Kopfzeile. Nichts davon ist Macht, alles kommt nächstes Jahr wieder.

**Engine / Idle.** Reine Ableitung aus dem Datum (Monat → Mond, feste Kalendertage → Fest), Vorrang vor der
Tageslage der Festzone. Andenken-Kauf über den bestehenden Token-Shop mit Zeitfenster-Bedingung.
**State.** `festClaims: Record<"festId_year", true>` (additiv).
**UI.** Kalenderleiste auf der Quest-Seite („Diese Woche": Segen, Karawane, Gezeichnete, Fest in 9 Tagen),
TopBar-Weltzeile zeigt den Mond.
**Art.** Bestand plus vier kleine Fest-Embleme (neu, aber winzig) und Zonen-Tint.
**Aufwand.** S bis M.
**Risiko.** Verpassbares → strikt kosmetisch und wiederkehrend. Echte Jahreszeiten sind auf der Südhalbkugel
verdreht → Monde nach Kalender benennen, nicht nach Wetter.
**Abhängigkeiten.** W1, W3, Token-Shop.

### W11 · Zonen-Gedächtnis (Präsenz)

**Erlebnis.** Jede Zone merkt sich, wie oft man dort war: Ein Balken „Präsenz" steigt mit Kills, Köpfen und
Vorfall-Antworten und sinkt langsam über Tage. Hohe Präsenz macht die Zone „befriedet": Belagerungen fallen
dort seltener, Blüte häufiger, der Wächter schreibt es in die Chronik. Die Welt sieht anders aus, weil man da
war, und sie vergisst es wieder, wenn man weg bleibt. Das ist die einzige Idee hier, bei der der Spieler die
Lage von morgen selbst schiebt.

**Engine / Idle.** Präsenz ist State, aber der Verfall tickt nicht: Er wird bei jeder Lesung aus
`(wert, letzterTag, heute)` berechnet (deterministisch, kein Timer). Damit W1 rein bleibt, wird die Präsenz
nur **einmal am Tageswechsel** als Snapshot in die Lage-Ziehung von morgen eingespeist
(`worldDay(seed, day, presenceSnapshot)`), gespeichert in `zonePresence[zoneId].snapDay`. Offline und
online sehen denselben Snapshot, weil der Tageswechsel im Tick liegt.
**State.** `zonePresence: Record<zoneId, { value, day }>` (additiv).
**UI.** Zonenkarten-Meter unter Kills/Drops, Hover-Satz.
**Art.** Bestand.
**Aufwand.** M.
**Risiko.** Erklärbarkeit; Rückkopplung darf nie in „Zone tot" kippen (untere Klemme bei Grundgewichtung).
**Abhängigkeiten.** W1, W3.

### Empfohlener Schnitt für ein Update (4 bis 6 Wochen)

**Kern (muss zusammen leben):** W1 Weltuhr + Zonenlagen, W3 Chronik, W4 Rückkehr-Bericht, W7 New-Haven-Tagesblatt,
W8 Raben-Post 2. Das ist eine Welt, die jeden Tag anders ist, es erzählt und im Lager ankommt, mit fast nur
Bestands-Art.
**Bewegung (eines davon dazu):** W5 Kopfgeldtafel (Kampf ist fundamental, nutzt `elites.ts`) oder W6
Karawane. Meine Empfehlung: W5, weil es die Zonenkarte in Bewegung setzt und Brenna eine zweite Tafel gibt.
**Verstärker (wenn Zeit bleibt):** W2 Nacht (billig), W9 Gerücht (die eigentliche Antwort auf „besseres
Aufgabensystem", aber textlastig), W10/W11 für 1.2.x.

---

## 3. Ein Tag im Leben

Morgens öffnet der Spieler das Spiel und der Wächter sagt, dass er neun Stunden weg war, dass über der Krypta
die Fäulnis lag und dass Mux' Karren in der Nacht die Aschfelder durchquert hat. Im Bericht stehen 640
Skelette, zwei Stufen Kochen und ein Brief von Brenna: Grauzahn steht heute im Schwarzdorn, morgen nicht
mehr. Auf der Zonenkarte trägt der Schwarzdorn das Kopfgeld-Badge und die Grenzlande das Emblem der
Belagerung, also stellt er die Warteschlange auf Grauzahn, danach fünfzig Runden Goblins fürs Gold, danach
Angeln für Eskes Bedarf. In New Haven sitzt Shairi am Saatgarten und sagt einen Satz über müde Erde; das
Tagesblatt will 60 Kohle und 20 Forellen, die Kohle liefert er aus der Bank, der Bautrupp bekommt eine Stunde
geschenkt. Mittags in der Pause ein Blick aufs Handy? Nein, aufs Spiel im Hintergrund: Grauzahns Kopf hängt
an der Trophäenwand, die Chronik hat es notiert, und der Wächter hat den Satz dazu geschrieben, den man
gern noch einmal liest. Die Belagerung hat inzwischen 4 000 Gold mehr gebracht als ein gewöhnlicher Tag, und
das Gerücht der Woche ist auf Schritt zwei. Abends kommt die Nacht ins Reach, die Zonenbilder werden dunkel,
und die Krypta lohnt sich jetzt bei den seltenen Drops, also wechselt die Warteschlange dorthin. Die
Forellen gehen an Eske, der Vorfall vom Morgen ist beantwortet, und das Kohlenbecken am Wachturm brennt wieder
orange. Der letzte Blick gilt der Kalenderleiste: Karren morgen an der Furt, Gezeichnete wechseln Montag,
Fest in neun Tagen. Dann läuft die Krypta durch die Nacht, und morgen früh erzählt jemand, was daraus wurde.

---

## 4. Drei Fragen an den Chef

1. **Echte Uhr oder Spieluhr?** Der Wochentags-Segen läuft nach der lokalen Uhr des Spielers (Chef-Entscheid
   Juli). Sollen Tag/Nacht, Lagen, Karawane und Feste ebenfalls an der echten Uhr hängen (Nacht um 20 Uhr, Fest
   an echten Kalendertagen, alle Spieler sehen dieselbe Welt am selben Tag), oder an einer eigenen Spieluhr,
   die nur mit Spielzeit vorrückt (jeder hat seine eigene Welt, aber nichts hängt an der Wanduhr)? Meine
   Empfehlung ist die echte Uhr: Sie ist bereits verdrahtet, offline-fair, und „die Welt bewegt sich, auch
   wenn keiner hinschaut" ist mit einer Spieluhr wörtlich falsch.
2. **Dürfen Lagen wehtun?** Nur „anders und etwas besser" (Belagerung: mehr Gold, härtere Gegner, nie unter
   Grundwert), oder auch echte Mali als Herausforderung mit Belohnung (Seuche: halbe XP in der Zone, dafür
   ein Andenken für den, der trotzdem bleibt)? Ich empfehle nie unter Grundwert bei XP und Gold; Härte nur
   über Gegnerwerte, damit Idle-Spieler, die morgens stellen und abends ernten, nie bestraft werden.
3. **Wie viele Gesichter darf 1.2.0 haben?** Mira ist auf Start-Charaktere gebucht. Reicht für die Besucher
   in New Haven das Muster „Emblem plus Satz" (null neue Bilder), oder sollen die Sechs Köpfe bekommen (sechs
   Porträts nach den Specs in Weltlore § 3.6) und Maren als siebtes Gesicht dazu? Und: Gezeichnete als reine
   Text-Namen auf Bestands-Monsterbildern, oder mit eigenem Rahmen?

---

## 5. Prüfliste für die anderen Perspektiven

Was ich an Quest-, Daily-, New-Haven- und Begleiter-Ideen kritisch gegenlesen würde:

1. **Kein `Date.now()` in der Engine.** Jede Zeitabhängigkeit muss über den pro Tick fortgeschriebenen
   `nowMs` laufen (Muster `blessingForTime`), sonst bricht offline == online.
2. **Kein zweiter Simulator.** Wenn eine Idee „im Hintergrund passieren" soll, muss sie als Funktion der Zeit
   formulierbar sein. Alles, was tickt, tickt im `step`, und alles, was im `step` tickt, muss offline nachholbar
   sein oder bewusst hinter dem `offline`-Guard liegen (wie Eliten).
3. **RNG-Disziplin.** Neue Zufälle nie aus `state.rng`; entweder ephemer aus `(seed, Tag)` oder ein eigener Strom
   nach `eliteRng`-Muster. Kein zusätzlicher Wurf auf bestehenden Pfaden, wenn das Feature inaktiv ist.
4. **Tagesstempel und Monotonie.** Wer einen Tageswechsel nutzt, nimmt `YYYYMMDD` lokal und den Guard
   „day < last → nichts" (Muster `refreshDailyQuests`), damit Uhr-Rücksetzen nichts doppelt vergibt.
5. **Nichts geht verloren, nichts muss zur Uhrzeit.** Kein Verfall, kein Schaden am Lager, kein Fenster, das
   kürzer als ein Offline-Tag ist, wenn Belohnung daran hängt. Zeitfenster dürfen Rhythmus sein, nie Verlust.
6. **Kampf-Gate bleibt.** Weder Bedarfe, Karawane noch Feste dürfen kampf-gegatete Materialien liefern.
7. **Token-Budget.** Neue Token-Quellen (Bedarfe, Gerücht, Kopfgeld-Andenken) zusammen gegen das
   Daily-Budget rechnen; Retention-Empfehlung ≤ 50 % der Daily-Ausschüttung.
8. **Stapelung.** Segen + Schrein + Lage + Fest: ein gemeinsamer Deckel, nie zwei Lagen je Zone.
9. **Save additiv.** Neue Felder mit Default in `migrateState`, ein Bump für das ganze Update, Sanitize-Klemmen
   für Zeitfelder (Muster Offline-Cap).
10. **Texte als Schlüssel.** Chronik, Briefe, Besucher-Sätze als i18n-Keys mit Platzhaltern, nie Rohtext im
    Save; sieben Sprachen von Anfang an mitdenken; ein Gedankenstrich je Zeile; Wächter-Stimme nach v2.
11. **Rauschen.** Jede Idee, die Zeilen erzeugt (Feed, Toasts, Briefe), braucht einen Deckel pro Tag und eine
    Ruhe-Variante als Normalfall.
12. **Bestands-Art zuerst.** Für jede Figur und jedes Ereignis die Frage, ob Emblem plus Satz reicht; neue
    Bilder nur, wo sie ein Erlebnis tragen (Köpfe der Sechs, Karren, Nachtkulisse).
13. **Keine MMO-Reflexe.** Besucher sind keine Freunde, die Chronik ist kein Chat, die Karawane kein Markt
    zwischen Spielern.
14. **Eine Warteschlange.** Alles Neue muss sich als `QueuedAction` einreihen lassen (Jagd, Lieferung als
    Sofortaktion), keine zweite Aktionsspur.
