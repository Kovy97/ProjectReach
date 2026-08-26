# 1.2.0 „Alive" — Kreuzkritik aus Sicht Weltsysteme (26.08.2026)

Gelesen: brainstorm-lore (L1–L12), brainstorm-aufgaben (A1–A11), brainstorm-erlebnis (E1–E11). Gegen den Code geprüft:
alle sieben NPC-Porträts liegen in `assets/portraits/` (npc_warden, _urga, _voss, _mux, _shairi, _eske, slayermaster_brenna;
das Aufgaben-Papier irrt mit „nur Brenna"). `camp.lastCompletedBuild` + `OfflineSummary.campBuilds` existieren (E3 hält sie für
fehlend). Ambient-Entscheid Task #317 „nur Vignette" ist real. Es gibt keinen Wochenstempel-Helfer. Und: `refreshDailyQuests`
wird heute nur vom Client (QuestsPage, `todayStamp()` + Mitternachts-Timer) aufgerufen, nicht im Tick. Das ist der zentrale Befund
unten: Ohne einen Tageswechsel-Hook in `advance()` hängen alle Tages-Ideen der drei Papiere an einer UI-Seite.

## 1. Technische Prüfung (Tick / Offline / Save)

**Deterministisch und ohne State machbar (reine Ableitung aus Tag, Seed oder Bestands-State):** L1 Absender, L3 Tageslaunen,
L4 Erinnerungen, L9 Wegmarken, L12 Begleiter-Satz, A2 giver, A7 Launenkarte (Slot 6 nach `blessingForTime(day)`; `refresh`
zieht nur am Tageswechsel, also kein Flackern), A11 Regal-Gate, E1, E4, E5, E7, E8, E10, E11 (Optik). L7/A10 `excludes` ist ein
Content-Feld plus eine Zeile in `questUnlocked`, kein State.

**Braucht neue State-Felder** (alle additiv, EIN Bump 83 → 84, Defaults in `migrateState`, Zeitstempel durch `finiteNonNeg`
geklemmt, Tages-/Wochenstempel mit Monotonie-Guard „stamp < last → nichts"):

| System | Feld | Default | Anmerkung |
|---|---|---|---|
| W1 Weltuhr | `worldSeed` | Alt-Save: `rng.state ^ Konst`, neu: bei Erstellung | einziges Feld der Weltschicht |
| W3/L10 Chronik | `chronicle[]`, `chronicleSeq`, `daySnapshot{day,kills,gold,xp}` | `[]`, 0, null | E2 (renderer-lokal) geht darin auf |
| L2/W8 Briefe | `mailSeenSeq`, `letterLastDay{id→stamp}` | 0, `{}` | KEIN neues `mail`-Objekt: `mailbox` + `mailSeq` existieren |
| A3 Drei von sechs | `daily.closed`, `daily.swapsUsed` | false, 0 | Tausch mit `salt = swapsUsed+1` im selben Shuffle: sauber |
| A5/L6 Wochentakt | `weekly{week,quests[]}` | `{0,[]}` | Wochenstempel = Tagesordinal ÷ 7 ab Montag-Epoche, reine Arithmetik |
| A6/W6 Karawane | `caravan{cycle,bought{},escortBaseline}` | `{0,{},null}` | statt `caravanWeek` (s. § 2) |
| A8 Gunst | `favor{giver→n}`, `favorDay{stamp,earned{}}` | `{}`, `{0,{}}` | Tagesdeckel braucht das zweite Feld |
| A9 Glut | `dailyGraceWeek` | 0 | plus Auto-Claim VOR dem Neuziehen |
| A4 Zettelarten | `stats.killsByZone`, `combatMsByZone`, `portionsEaten`, `goldSold` | `{}`/0 | `dungeonsCleared`, `eliteCodex.kills`, `buildSeq` existieren schon |
| W7 Tagesblatt | `camp.day{stamp,delivered{},answered,baseline}` | leer | Bedarfe = Brett (Retention § 2), weltgetrieben |
| L11 Turm-Stimme | `slayerFloorsSeen{}` | `{}` | trivial |
| W10/L8 Feste | `festClaims{}` | `{}` | nur wenn Kalender-Frage GO |

**Bricht Cap oder Warteschlange, so wie formuliert:**
- **Tageswechsel im Client (Bestand).** Alles, was „über Nacht" passieren soll (A9 Auto-Claim, L2 Morgenbriefe, L10 Nacht-Eintrag,
  A5 Wochenwechsel), muss im Tick erkannt werden: `advance()` kennt den `wallClockMs` pro Tick; ein Hook „lokaler Tag hat gewechselt"
  dort (Tages-Cache-Muster aus `blessing.ts`) bedient alle vier. Bleibt es beim Client-Aufruf, laufen Offline- und Live-Pfad auseinander.
- **L2 „Trigger nach dem Offline-Catch-up auswerten"**: dann feuern Briefe nur beim Laden, nie im Live-Spiel. Lösung: dieselben
  Hooks wie die Chronik (Tageswechsel, `onEliteKilled`, `completeCampBuild`, Quest-Claim). Kein Sonderpfad.
- **L6 „eine Nacht Wache in der Zone"** darf keine Uhrzeit sein (8-h-Cap, Idle-Regel): als Kill- oder Kampfzeit-Zähler (A4
  `combat_time_zone`) ist es offline-fair; als „zwischen 20 und 6 Uhr" wäre es Echtzeitzwang.
- **A6 „Karawane kommt nur, wenn ich liefere"** stellt die Welt still, wenn der Spieler pausiert, und kollidiert mit W6 (Fahrplan).
  Auflösung: Fahrplan aus der Weltuhr (sie kommt immer), Lieferung vergrößert den Markt (A6-Kiste, Rare-Slot). Beides bleibt.
- **E2 renderer-lokaler Feed** überlebt keinen Neustart und verdoppelt W3/L10. Als MVP-Ringpuffer verlorene Arbeit.
- **E1 Rotation per `setInterval`** ist UI-seitig in Ordnung, braucht aber das Selector-Gate (Perf-Welle A) und darf keine
  Engine-Signale erfinden; sie liest, was W1/W3 liefern.
- **A4 `deliver_items`**: Konsum beim Claim ist queue-fähig; Regel 3 einhalten, wie im Papier vorgeschlagen (Koch-, Barren-, Saat-,
  Sammelware, nie Kampfmats). `equip_tag` wird beim Claim geprüft, nicht getickt: gut.
- **Token-Deckel (A11)** hält, solange W5 Kopfgeld in Slayer-Punkten und W7 Bedarfe unter dem Daily-Budget zahlen. L8-Andenken sind Items.

## 2. Drei Ideen der anderen, die am besten an W1 (Weltuhr) hängen

1. **A7 + L3 Tageslaunen und Launenkarte.** Heute zwei Quellen (Segen des Tages, separate Vorfalls-Tabelle). Mit W1 ist die
   Zonenlage die Vorgeschichte: `worldDay(seed, day)` liefert `{zoneId, lage}`, `pickDailyQuests` reserviert Slot 6 für eine Karte
   mit `mood === blessing` UND Zone der Lage; der Vorfallstext ist die Lage-Zeile (L3-Vorgeschichte als Tooltip am Segen-Chip).
   Felder: keine. UI: Slot 6 auf der Quest-Seite mit Absender-Kopf, Lage-Badge auf der Zonenkarte, Weltzeile in der TopBar.
2. **A6 + L8 Karrentage / Karawane + A5 Wochenzettel.** Hook: `worldDay().caravan` (Phase: unterwegs Zone A, Zone B, angedockt) aus dem
   Zyklus-Seed; der Wochenzettel „Karawanenlieferung" (A5) hängt am selben Wochenstempel, sein Claim setzt `caravan.bought`-Budget
   und den Rare-Slot frei. Felder: `caravan{}`, `weekly{}`. UI: Händlerposten-Panel in `NewHavenPage`, Karawanen-Badge auf der Zone,
   Mux-Zeile über L1/L4 („früher zwei Überfälle, jetzt einer") als Erinnerung nach erfolgreichem Geleit.
3. **L10 + E3 Tageseintrag und Wächter-Bericht** (= W3/W4). Hook: der Tageswechsel-Hook aus § 1 schreibt Weltzeilen (Lagen, Fahrplan,
   Besucher) aus `worldDay`, die Bestands-Breadcrumbs (`lastCompletedBuild`, `lastEliteKill`, `mailSeq`-Differenz zu `mailSeenSeq`)
   liefern die Tatzeilen; `OfflinePopup` rekonstruiert den Welt-Teil aus `savedAt..now` ohne gespeicherten Verlauf. Felder:
   `chronicle`, `chronicleSeq`, `daySnapshot`. UI: Reiter „Chronik" auf `QuestsPage`, dritte Spalte im Offline-Popup.

Nahe dran, fast umsonst: **L9 Wegmarken** lesen Zone × Lage × Kapitel (dreißig Texte werden zu ~50, aber kein State).

## 3. Streichen oder verschieben

1. **E6 Zeit-Tönung und die Optik-Hälfte meines W2 (Nacht).** Widerspricht Chef-Entscheid #317. Verschieben bis ausdrückliches GO;
   der mechanische Teil von W2 (Nacht-Multiplikatoren, Nacht-Drop-Zeilen) ist davon unabhängig und kann warten.
2. **E1 Weltpuls und E2 Sitzungs-Feed als eigene Systeme.** Doppelung mit Chronik und TopBar-Weltzeile. Zusammenlegen: E1 wird die
   Weltzeile (liest W1/W3), E2 entfällt zugunsten der gespeicherten Chronik.
3. **A8 Gunst mit A11 Gunst-Regalen und Titeln.** Vierte Progressionsachse, 24 Sprossen, Titel in sieben Sprachen, 12 Andenken-Bilder:
   ein eigenes Update. Für 1.2.0 nur ein Lieferzähler je Absender (`favor{}` ohne Stufenwirkung), den L4-Erinnerungen und Mux-Rabatt
   lesen dürfen. Regale und Titel in 1.3.

Dazu verschieben: **A1 Phase 2** (Engine-Fusion) und **E11 Brett-Optik** vor der A3-Regel; **L6 Feuerlinie / L8 Glutnacht** nach
1.2.x (Textvolumen L, Kalender-Frage offen); **L7 Halbmarke** nur mit Tarrik-GO, sonst erzählte Entscheidung.

## 4. Alive-Kern (fünf Systeme), Baureihenfolge, Aufwand

| # | System | Inhalt | Agent-Tage |
|---|---|---|---|
| K1 | **Weltuhr** (W1) | `worldSeed`, Tages-/Wochenstempel in shared, Tageswechsel-Hook in `advance()`, `worldDay/worldWeek`, Zonenlagen, Fahrplan, Besucher-Plan; Lage-Badge + Weltzeile | logic 3, content 1, ui 2 = **6** |
| K2 | **Chronik + Rückkehr** (W3/W4/L10/E3) | Ereignis-Datensätze, Hooks, Offline-Popup dreiteilig, Wächter-Bausteine | logic 1.5, ui 2, lore 1 = **4.5** |
| K3 | **Absender-Schicht** (L1/A2/L4/L2/W8) | `giver`, Bitte-/Dank-Pools, Erinnerungen, Briefe an K2-Hooks, Namen statt Amtstitel | content 1, ui 1, lore 1.5 = **3.5** |
| K4 | **Aufgaben-Takt** (A3/A9/A7+L3/A5) | Drei von sechs, Tausch, Glut + Auto-Claim, Launenkarte, Wochenzettel | logic 2.5, content 1, ui 1.5 = **5** |
| K5 | **New Haven lebt** (W7/A6+L8/L5 Stufe A) | Tagesblatt (Besucher, Bedarfe, Vorfall), Karawane mit Route, Gesichter an Gebäuden | logic 2, content 1.5, ui 2.5 = **6** |

Summe 25 Agent-Tage, plus i18n 2, QA/Kontrolleur 3 = ~30; mit drei parallelen Agenten vier Wochen, zwei Wochen Puffer. Optional als
„Bewegung" danach: W5 Kopfgeldtafel (4 Tage, als Reiter auf der Slayer-Seite, nie als festes Panel: Bounty-Board-Lehre).

**Abhängigkeitsgraph.** K1 → K2 (Weltzeilen, Tageswechsel-Hook) · K1 → K4 (Launenkarte, Wochenstempel) · K1 → K5 (Fahrplan,
Besucher) · K3 → K4 (Absender auf Karten) · K3 → K5 (Gesichter, Mux-Zeilen) · K3 → K2 (Briefe als Chronikzeilen) · K4, K5 → K2
(liefern Zeilen). K1 und K3 haben keine Vorbedingung und laufen parallel.

**Baureihenfolge.** Woche 1: K1 (logic-dev, inkl. Save-Bump mit ALLEN Feldern der Tabelle oben, damit nur einmal migriert wird)
parallel zu K3-Texten (lore-dev) und K3-Content (`giver`, Label-Keys). Woche 2: K2 (logic + ui) parallel zu K4-Engine. Woche 3: K5
parallel zu K4-UI und K3-UI. Woche 4: Integration, Weltzeile, i18n-Overlays, Kontrolleur, Chef-Test. Wochen 5–6: Puffer, W5.

**Vorab zu entscheiden (blockiert Woche 1):** echte Uhr für Lagen/Fahrplan (Empfehlung ja), Namen statt Amtstitel (L-Frage 1),
Karawane nach Fahrplan (§ 1), Gunst nur als Zähler (§ 3).
