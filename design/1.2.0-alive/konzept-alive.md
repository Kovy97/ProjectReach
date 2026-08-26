# 1.2.0 „Alive" — Synthese nach Brainstorm und Kreuzkritik (26.08.2026)

> Quellen: `brainstorm-{lore,aufgaben,weltsysteme,erlebnis}.md` (Runde 1) und `kritik-*.md` (Runde 2).
> Verfasst von Claude als Zusammenführung; die Entscheidungen unter § 6 liegen beim Chef.

## 1 Der gemeinsame Nenner

Alle vier Perspektiven haben unabhängig voneinander dieselben drei Bausteine erfunden und sich an
denselben Stellen widersprochen. Das ist das Ergebnis:

1. **Lebendig heißt: Jemand hat gemerkt, dass du weg warst.** Der stärkste Moment im Idle-Spiel ist das
   Wieder-Hinschauen. Die Welt erzählt nach hinten (was geschah) und kündigt nach vorn an (was kommt).
2. **Jeder Zettel hat ein Gesicht.** Die sieben Porträts (Wächter, Brenna, Urga, Voss, Mux, Shairi, Eske)
   liegen fertig im Spiel. Dailies werden Bitten echter Leute, Briefe kommen von ihnen, sie stehen in
   New Haven an ihren Gebäuden.
3. **Eine Uhr, keine Simulation.** Alles, was „ohne den Spieler" passiert, wird aus Kalendertag und
   Welt-Seed abgeleitet (Muster des Wochentags-Segens). Offline und live bit-identisch, kein Echtzeitzwang.
4. **Kein zweiter Ungelesen-Kosmos.** Genau zwei Eingänge: der Wächter-Bericht beim Wiederkommen und ein
   freiwilliges Chronik-Fach ohne Zähler. Alles andere hängt sich an bestehende Flächen.
5. **Ein Tagesbudget, ein Wochenbudget.** Naiv addiert hätten die Vorschläge 434 statt 180 Tokens je
   Woche gezahlt. Deshalb: 26 Tokens/Tag, 55/Woche aus drei Wochenzetteln, und Lagen, Kopfgelder und
   Post zahlen nie Tokens.

## 2 Der Alive-Kern: fünf Systeme, die zusammen leben

| # | System | Was der Spieler erlebt | Kern-Inhalt | Aufwand |
|---|---|---|---|---|
| K1 | **Weltuhr und Zonenlagen** | Die Zonenkarte sieht jeden Tag anders aus: Nebel über der Küste, Blutfährte im Schwarzdorn. Eine Weltzeile in der Kopfleiste sagt, was heute los ist. | `worldSeed`, Tages-/Wochenstempel, Tageswechsel-Hook im Tick, je Zone eine Lage pro Tag aus einem kanon-sicheren Pool (2–3 erlaubte Lagen je Zone, von Lore kuratiert), Effekte ≤ 1,15 und nie unter Grundwert, ein Lage-Badge je Karte (rotiert mit Elite/Spuren, nie stapeln) | M (6 Agent-Tage) |
| K2 | **Chronik und Rückkehr-Bericht** | Morgens sagt der Wächter in drei Zeilen, was die Nacht war: Welt, du, New Haven. Wer will, blättert sieben Tage zurück. | EIN Ereignis-Datensatz (7 Tage, 12 Zeilen/Tag, Wächter-Stimme aus Bausteinen), Hooks bei Tageswechsel, Bau fertig, Elite-Kill, Quest-Claim, Brief; Offline-Popup dreiteilig; Chronik als Reiter auf der Quest-Seite, kein Ungelesen-Zähler | M (4,5) |
| K3 | **Absender-Schicht und Raben-Post** | Brenna will Köpfe, weil die Geier dreist werden; Eske dankt für Proviant; nach dem ersten Champion liegt ein Brief am Tor. Bank und Laden zeigen Voss und Mux mit Namen. | `giver` je Daily über Ableitungsregel (Kills → Brenna, Barren → Urga, Gerichte → Eske, Sammelgut → Shairi, Lieferzettel → Voss, Handel → Mux), Bitte-/Dank-Pools, Erinnerungszeilen nach Meilensteinen, Briefe über das bestehende Postfach mit `contractRef`/`queueHint` (Klick reiht die passende Aktion ein), gemeinsamer Tagesdeckel für Briefe, Text-Pass über die Phantom-Bauern der 60 Dailies | S–M (3,5) |
| K4 | **Aufgaben-Takt** | Drei von sechs Zetteln wählen, einen gratis tauschen, abends den Tag abschließen; fertige Zettel werden um Mitternacht automatisch bezahlt; ein Ruhetag pro Woche kühlt die Glut nur ab. Drei große Wochenzettel. | 3 aus 6 + Tausch, Tagesabschluss (+3 Tokens), Auto-Claim am Tageswechsel, Glut statt Streak, Launenkarte auf Platz 6 (Lage der Zone als Vorgeschichte), drei Wochenzettel-Slots (Erzähl-, Liefer-, Jagd-/Wachstumszettel, 55 Tokens), neue Zettelarten `deliver_items`, `equip_tag`, `combat_time_zone`, Kapitel-Deckel wie heute | M (5) |
| K5 | **New Haven lebt** | Am Zentralhaus hängt das Tagesblatt: wer heute da ist, was das Lager braucht, was passiert ist. Donnerstags steht Mux' Karren am Handelsposten; wer die Lieferung bringt, öffnet den großen Markt. Bauten enden mit einer kleinen Zeremonie. | Besucher Stufe A (Porträt-Chips an Gebäuden, Emblem + Satz wo kein Porträt), Bedarfe als Lieferkarten aus dem Tagesbudget, Vorfälle aus Ereignisketten, Karawane nach Fahrplan aus der Weltuhr (kommt immer, Lieferung vergrößert den Markt: Kauf ≥ 2× Verkaufswert, ≤ 1 Unikat je Halt, nie kampf-gegatete Ware), die vier fertigen New-Haven-Quests aus Juli, Bau-Zeremonie klein | M (6) |

Summe rund 25 Agent-Tage plus i18n (2) und Kontrolleur/Sweep (3) ≈ 30; mit drei parallelen Agenten vier
Wochen, zwei Wochen Puffer. Neue Art: **null verpflichtend** (alle Porträts, Zonenbilder, Embleme vorhanden).

## 3 Reihenfolge und Datenboden

**Woche 1:** K1 (logic-dev) mit dem EINEN Save-Bump 83 → 84, der alle Felder aller fünf Systeme anlegt
(Defaults + Sanitize, Zeitstempel geklemmt, Monotonie-Guard für Tages-/Wochenstempel), parallel K3-Texte
(lore-dev) und K3-Content (`giver`, Label-Keys, Phantom-Bauern).
**Woche 2:** K2 (logic + ui) parallel zu K4-Engine. **Woche 3:** K5 parallel zu K4-UI und K3-UI.
**Woche 4:** Integration, Weltzeile, Overlays in fünf Sprachen, Kontrolleur, Chef-Test. **Wochen 5–6:** Puffer,
Kompat-Vault, Beifang aus 1.1.0 (Schutz-Items tragen statt besitzen, echte Zone auf der Fortsetzen-Karte).

Neue State-Felder (alle additiv): `worldSeed`, `chronicle[]` + `chronicleSeq` + `daySnapshot`, `mailSeenSeq` +
`letterLastDay`, `daily.closed` + `daily.swapsUsed` + `dailyGraceWeek`, `weekly{week, quests[]}`,
`caravan{cycle, bought, escortBaseline}`, `favor{giver→n}` (nur Zähler), `camp.day{…}`, `slayerFloorsSeen`,
Zähler `stats.killsByZone`, `combatMsByZone`, `portionsEaten`, `goldSold`. Zentraler technischer Befund:
`refreshDailyQuests` läuft heute nur im Client (Mitternachts-Timer der Quest-Seite); alle „über Nacht"-Ideen
brauchen den Tageswechsel-Hook in `advance()`, sonst laufen Offline und Live auseinander.

## 4 Ökonomie-Deckel (aus der Aufgaben-Kritik)

- Tag: 26 Tokens Deckel (Kern 7/13/16 je Level-Band), Bitte des Tages ist Platz 6 (normaler Lohn, doppelte Gunst).
- Woche: genau drei Wochenzettel (12/18/25 = 55). Gerücht, Karawane, Feuerwache sind Angebote für diese Slots, keine Extraquellen.
- Zonenlagen: gleiche Art stapelt nicht (max statt Produkt), Gesamt je Art ≤ 1,30 mit Segen; nie unter Grundwert.
- Kopfgelder (falls später): Slayer-Punkte, 0 Tokens. Post: Anhang nur an Meilenstein-Briefen.
- Ergebnis Endgame-Woche: 167 Kern / 237 Maximum (+30 % gegen heute, gewollt, weil Karawanenmarkt als Senke dazukommt).
- Guard-Test: Monte-Carlo über vier Wochen je Level-Band, Tokens/Woche in [150, 240] Endgame, [40, 80] Tag 1–7.

## 5 Bewusst NICHT in 1.2.0 (mit Grund)

| Idee | Warum nicht jetzt | Wohin |
|---|---|---|
| Auftragsbuch als eigene Seite mit Reitern | kollidiert mit Chronik-Reiter um die Quest-Seite, eng bei 1366×768; Absender direkt auf die Karten reicht | 1.3, falls die Quest-Seite dann neu geschnitten wird |
| Kopfgeldtafel mit wandernden Gezeichneten | dupliziert Slayer-Aufträge/Eliten und das zurückgebaute Kopfgeld-Brett | 1.2.x als Ziel von Brennas Stufe „Blutjagd", nur als Kartenreihe |
| Gunst-Stufen mit Regalen, Titeln, Porträtrahmen | vierte Progressionsachse, 12 neue Bilder; 1.2.0 führt nur den Zähler | 1.3 |
| Gerücht der Woche | textlastig (7 Sprachen), verpassbar | 1.2.x als Erzähl-Slot der Wochenzettel |
| Nacht, Zeit-Tönung, Wetter | Chef-Entscheid #317 „nur Vignette" | nur mit ausdrücklichem GO |
| Monde/Feste, Zonen-Gedächtnis | verpassbarer Kalender bzw. schwer lesbare Rückkopplung, Badge-Inflation | 1.3 |
| Deko-Siedler aus `char_*`-Porträts, Begleiter als Briefträger | Kanon (Zwillinge des Namenlosen; Raben-Post) | gestrichen |
| Halbmarke (Entscheidung mit `excludes`) | braucht Tarrik-Porträt und Chef-GO | Pilot in 1.2.0 nur, wenn Chef D8 bejaht |

## 6 Entscheidungen des Chefs (D1–D5 blockieren Woche 1)

- **D1 Echte Uhr:** Lagen, Fahrplan, Tageswechsel an der lokalen Uhr wie der Wochentags-Segen? *Empfehlung ja.*
- **D2 Namen statt Amtstitel:** Bank „Voss" statt „Die Verwalterin", Laden „Mux" statt „Der Händler", die Sechs überall mit Namen? *Empfehlung ja.*
- **D3 Karawane:** kommt jede Woche nach Fahrplan, Lieferung vergrößert den Markt (statt „kommt nur, wenn ich liefere")? *Empfehlung ja.*
- **D4 Gunst:** in 1.2.0 nur Zähler je Absender (Erinnerungszeilen, kleiner Mux-Rabatt), Regale/Titel später? *Empfehlung ja.*
- **D5 Lagen dürfen nicht wehtun:** nie unter Grundwert bei XP/Gold, Härte nur über Gegnerwerte? *Empfehlung ja.*
- **D6 Chronik-Ort:** Reiter auf der Quest-Seite ohne Ungelesen-Zähler (statt Sidebar-Fach)? *Empfehlung ja.*
- **D7 Brennas Stufen:** jetzt mitentscheiden (damit Wochenzettel und spätere Kopfgelder sie kennen) oder 1.2.x? *Empfehlung: Design jetzt festlegen, Bau 1.2.x.*
- **D8 Eine echte Entscheidung:** Halbmarke (Tarrik: zu Brenna oder Siedler) als Pilot mit `excludes`-Feld und einem Tarrik-Porträt von Mira? *Empfehlung: ja, wenn Mira nach den Start-Charakteren Luft hat; sonst erzählte Entscheidung.*
- **D9 Mira-Wünsche (optional):** Maren (Siedlerin), Tarrik, sechs Siegel-Embleme für die Absender. Nichts davon blockiert den Kern.
- **D10 Beifang aus 1.1.0 in Woche 5–6:** Schutz-Items tragen statt besitzen, echte Zone auf der Fortsetzen-Karte, Paritäts-E2–E5? *Empfehlung: Schutz-Items ja, Rest nach Bedarf.*

## 7 Ein Tag im Leben (nur mit dem Kern)

Morgens: Der Wächter meldet Nebel über der Küste, einen Brief von Mux und den fertigen Vorratsspeicher.
Auf der Tafel bittet Shairi um Sammelgut, Brenna um Köpfe aus dem Schwarzdorn, wo heute Blutfährte liegt;
der Spieler nimmt drei Zettel, tauscht einen, stellt die Warteschlange und geht. Mittags ein Blick: die
Chronik notiert den ersten Kopf und Eskes Dank für den Proviant. Abends ist der Tag geschlossen, der
Wochenzettel „Karawanenlieferung" steht bei zwei von drei, und am Donnerstag wartet Mux' Karren mit
einer Kiste, die es nur gibt, wenn geliefert wurde. Nichts blinkt, nichts verfällt, und morgen ist die
Welt wieder eine andere.
