# 1.2.0 „Alive" — Brainstorm: Das Aufgabensystem als Rhythmusgeber

Stand 26.08.2026, balance-designer. Reines Design-Dokument, kein Code, keine Content-Änderung.
Perspektive: Aufträge, Dailies, Wochenrhythmus, Belohnungsökonomie, Gunst.

**Ist-Stand in Zahlen (aus Content und Engine gelesen, nicht geschätzt):**
- 60 Daily-Karten, 6 je Tag, höchstens 2 je Schwierigkeit, mindestens 2 ohne Kampf. Tokens je Karte
  1/1/2/3/5/8 (sehr leicht bis Meister). Nur drei Zettelarten: töten, sammeln, herstellen.
- Einkommen: Tag 1 bis 3 rund 6 bis 10 Tokens/Tag, Mitte (Gesamtlevel 300 bis 600) bis 20, Endgame
  20 bis 26/Tag, also 140 bis 180 je Woche. Slayer-Serie zahlt 2 Tokens je fünften Auftrag (rund 3/h
  Kampfzeit). Story-Quests einmalig 231 Tokens, Erfolgs-Meta einmalig 165.
- Senken: 47 Verbrauchsbündel (2 bis 20 Tokens) und 7 Andenken für zusammen 100 Tokens. Im Endgame
  sind die Andenken in fünf Tagen durch; danach sind Tokens nur noch Proviantgeld.
- Streak bricht bei einem verpassten Tag. Fertige, nicht eingelöste Karten verfallen um Mitternacht.
- Slayer-Aufträge (Brenna) sind das Auftragssystem, das ankam: Zettel mit Gesicht, Serie, Skip,
  Marke, Stufen-Vorschlag „Jagd/Kopfgeld/Blutjagd" liegt als offene Chef-Entscheidung vor.
- Zähler in `PlayerStats`: kills, deaths, itemsGathered, itemsCrafted, craftedById, goldSpent. Für
  neue Zettelarten fehlen Zonen-, Dungeon-, Elite-, Verkaufs- und Proviantzähler.
- Figuren: Lore-Roster hat sechs Auftraggeber fertig (Brenna, Urga, Voss, Mux, Shairi, Mutter Eske),
  nur Brenna hat ein Porträt; alle 15 Lager-Gebäude haben Bilder samt Nachtvarianten.

---

## 1. Drei Leitgedanken

**Rhythmus statt Tafel.** Ein Idle-Spiel wird lebendig, wenn der Tag eine Form hat: morgens einen
Zettel mitnehmen, abends etwas abliefern, am Wochenende etwas Größeres abschließen. Heute ist die
Tafel ein Automat, der jeden Tag sechs gleichförmige Zettel ausspuckt; sie hat keinen Anfang, kein
Ende und kein Wochenende. Drei Takte (Tag, Woche, Kapitel) mit jeweils eigener Belohnungsart geben
dem Nebenbei-Spielen einen Puls, ohne einen einzigen Echtzeit-Zwang.

**Jeder Zettel hat ein Gesicht und eine Folge.** Brennas Aufträge funktionieren, weil jemand sie
vergibt, jemand sie bezahlt und eine Serie daran hängt. Dailies sind namenlos. Sobald Urga, Voss,
Mux, Shairi und Mutter Eske Zettel ausgeben und sich merken, wer liefert, wird aus „töte 20 X" ein
„Eske braucht Proviant für die Karawane". Und wenn ein erfüllter Auftrag die Welt sichtbar ändert
(Markt öffnet, Karawane steht am Handelsposten), dann hat der Zettel Sinn, nicht nur Zahl.

**Wahl ohne Grind, Deckel ohne Strafe.** Lebendig heißt nicht „mehr zu tun". Der Spieler wählt drei
von sechs, tauscht einen gratis, darf einen Tag ruhen, bekommt fertige Zettel auch nach Mitternacht
bezahlt. Belohnungen sind zuerst Zugang und Ansehen, dann Zahlen; alles ist pro Tag und Woche
gedeckelt, damit nichts leergespielt wird und nichts drei Monate dauert.

---

## 2. Ideen

### Idee 1 — Das Auftragsbuch (Contract Ledger)

**Spielererlebnis.** Statt vier Seiten (Chronik, Aufträge, Dailies, Slayer) gibt es ein Buch mit
Reitern je Auftraggeber: Brenna, Urga, Voss, Mux, Shairi, Eske und der Wächter. Jeder Zettel sieht
gleich aus (Gesicht, Ziel, Fortschritt, Lohn, Frist), egal ob er von Brennas Würfel, aus dem
Tagespool oder aus der Chronik stammt. Man blättert einmal morgens durch und weiß, was heute, diese
Woche und in diesem Kapitel ansteht.

**Engine/Idle.** Phase 1 ist reine Darstellung: eine `ContractView` im Client, die Slayer-Task,
Daily-Einträge, Wochenaufträge und offene Story-Quests in ein Format bringt; die drei Engines
bleiben, wie sie sind. Phase 2 (nach 1.2.0) zieht die gemeinsamen Felder in einen `ContractDef`
(giver, cadence: daily | weekly | chapter | slayer, objectives, rewards, expires). Die Slayer-Seite
bleibt Brennas Heim für Turm und Punkte-Shop; das Buch verlinkt dorthin. Offline: keine Änderung,
alles bleibt Zähler gegen Baseline.

**Art.** Bestand: Brenna-Porträt, Lager-Gebäudebilder als Reiter-Hintergrund, Embleme. Neu
wünschenswert: fünf Köpfe (siehe Idee 2), aber nicht Voraussetzung.

**Aufwand** M (UI) für Phase 1; L für Phase 2. **Risiko** mittel: Vollfusion der Engines wäre ein
Refactor mit Save-Folgen, deshalb Phase 2 bewusst ausgeklammert. **Abhängigkeiten:** Idee 2 (Geber),
Idee 5 (Wochentakt); Chef-Entscheidung zu Brennas Stufen sollte vorher fallen, damit das Buch die
Stufen-Buttons gleich mitdenkt.

### Idee 2 — Sechs Auftraggeber, ein Gesicht je Zettel

**Spielererlebnis.** Jeder Daily- und Wochenzettel trägt einen Absender aus der Glutfeste: Urga will
Barren, Voss will Vorräte gezählt, Mux will Ware, Shairi will Saat, Eske will Proviant, Brenna will
Köpfe. Der Absender spricht einen Satz beim Annehmen und einen beim Abliefern (Lore-Roster hat je
zwei Zeilen fertig). Man merkt sich, wer einen gut bezahlt, und man sieht sofort, welche Zettel zur
eigenen Tagesplanung passen.

**Engine/Idle.** Content-Feld `giver?: "brenna" | "urga" | "voss" | "mux" | "shairi" | "eske" |
"warden"` an `QuestDef` (rein additiv, nie persistiert). Zuordnung der 60 Bestandskarten nach
Objective-Art: Kampf zu Brenna, Barren/Waffen zu Urga, Sammeln zu Voss, Kochen zu Eske, Handel und
Diebeskunst zu Mux, Anbau zu Shairi. Vergabe-Regel: unter den 6 Tageskarten mindestens 3
verschiedene Absender (analog zur Schwierigkeits-Klemme in `pickDailyQuests`).

**Art.** Bestand reicht zum Start: Brenna-Porträt; für die anderen fünf als Platzhalter das
Gebäude ihres Wirkens (Schmelze, Speicher, Handelsposten, Saatgarten, Räucherhaus) plus Emblem.
Neu (später, Mira): fünf Köpfe nach den Vorlagen in weltlore § 3.6.

**Aufwand** S (Content) + S (UI). **Risiko** gering; Texte sind 12 Zeilen je Sprache. **Abhängigkeiten:**
keine; Grundlage für Idee 8 (Gunst).

### Idee 3 — Drei von sechs: der Tageszettel

**Spielererlebnis.** Das Brett zeigt weiter sechs Karten, aber der Tag ist „geschlossen", sobald
drei davon abgeliefert sind: dafür gibt es den Tagesabschluss (Tokens plus Gunst beim Absender der
Mehrheit). Die übrigen drei bleiben machbar, zahlen aber nur ihren Kartenlohn. Einmal am Tag darf man
eine Karte gratis tauschen, ein zweiter Tausch kostet 2 Tokens.

**Engine/Idle.** `DailyQuestState` bekommt `closed: boolean` und `swapsUsed: number` (SAVE-Bump,
Migration: false/0). Tausch zieht deterministisch mit `salt = swapsUsed + 1` aus dem gefilterten
Pool, ohne bereits liegende Karten (kein zweiter RNG-Pfad, derselbe seeded Shuffle). Der Abschluss
löst aus, sobald drei `claimed` sind; kein Timer, kein Online-Zwang. Offline-Fortschritt zählt wie
heute über Baselines.

**Rechnung (Tokens je Tag, Kernpfad = 3 Karten + Abschluss 3):**

| Phase | heute (alle 6) | Kern 3 + Abschluss | mit den 3 Restkarten |
|---|---|---|---|
| Tag 1 bis 3 (ve/e/m) | 6 bis 10 | 1+1+2+3 = 7 | bis 11 |
| Mitte (m/h/ma 5) | bis 20 | 2+3+5+3 = 13 | bis 23 |
| Endgame (h/ma 8) | 20 bis 26 | 5+5+3+3 = 16 | bis 26 |

Der Tagesdeckel bleibt exakt der heutige (Shop-Kalibrierung hält), aber der Kern kostet halb so viel
Zeit. Tausch ist der Hebel gegen „drei Kampfkarten für einen Skiller".

**Art.** Bestand (Karten-Rahmen, Knopf-Familie). **Aufwand** S (Engine) + S (UI). **Risiko** gering.
**Abhängigkeiten:** keine. Streicht faktisch die Sorge „Dailies gehen nicht zu meinem Stil".

### Idee 4 — Neue Zettelarten: liefern, rüsten, streifen, geleiten

**Spielererlebnis.** Neben Töten, Sammeln und Herstellen gibt es Zettel, die sich anders anfühlen,
auch wenn sie unter der Haube Zähler sind: „Liefere Eske 30 gebratene Forellen" (Ware wird beim
Abgeben eingezogen), „Trag heute Urgas Stahl" (Ausrüstungsziel), „Streifzug: je 5 Kills in drei
Gebieten", „Geleit: 30 Minuten Kampfzeit in den Grenzlanden, bis die Karawane durch ist", „Dungeon
zweimal räumen", „Zwei Slayer-Aufträge für Brenna", „Den Champion der Aschfelder stellen", „Ein
Lagerbau abschließen", „20 Portionen essen", „Ware für 2.000 Gold an Mux verkaufen". Kombis bündeln
zwei Ziele auf einem Zettel („Handwerksrunde: 8 Barren schmelzen und 8 abliefern").

**Engine/Idle.** Neue `QuestObjectiveType`-Werte, rein additiv: `deliver_items` (Zähler = Besitz,
Claim zieht ab, Muster `canHoldRewards` umgekehrt; Bank zählt mit, idle-fair), `equip_tag` (erfüllt,
wenn ein Item mit Tag/Tier angelegt ist; kein Zähler), `kill_zones` (Zonen mit ≥ N Kills heute),
`combat_time_zone` (Kampf-Millisekunden je Zone), `dungeon_clears`, `slayer_tasks`
(`slayerTasksCompleted` existiert), `elite_kills`, `camp_builds`, `portions_eaten`, `gold_sold`.
Dafür wächst `PlayerStats` um `killsByZone`, `combatMsByZone`, `dungeonClears`, `eliteKills`,
`campBuildsCompleted`, `portionsEaten`, `goldSold` (SAVE-Bump, alle 0). Alles bleibt „Zähler gegen
Baseline", also offline- und queue-fähig. Geleit ist bewusst kein Timer, sondern Kampfzeit: sie
läuft auch offline, solange die Warteschlange in der Zone steht.

**Art.** Bestand (Skill-Icons, Zonenbilder, Item-Bilder für Lieferziele). **Aufwand** M (Engine:
Zähler sitzen in combat.ts, tick.ts, camp.ts, shop) + M (Content: 30 bis 40 neue Karten). **Risiko**
mittel: Zähler in combat.ts sind combat-dev-Revier; `deliver_items` darf keine kampf-gegateten
Materialien über Shop-Ware erfüllbar machen (Regel 3), deshalb Lieferziele nur auf Koch-, Barren-,
Saat- und Sammelware. **Abhängigkeiten:** Idee 2 für die Absender; Idee 8 für Gunst.

### Idee 5 — Wochenaufträge

**Spielererlebnis.** Jeden Montag liegen drei große Zettel im Buch, einer davon immer ein
Wachstumsauftrag („Gewinne diese Woche 6 Gesamtlevel"), einer eine Lieferung für die Karawane
(Idee 6), einer ein Jagd- oder Dungeonauftrag. Sie laufen sieben Tage, verfallen nicht über Nacht und
zahlen spürbar mehr als Dailies. Wer nur am Wochenende spielt, hat trotzdem ein Ziel.

**Engine/Idle.** `WeeklyQuestState { week: number; quests: [{questId, claimed}] }` mit
Wochenstempel (Jahr·100 + ISO-Woche) vom Client, Monotonie-Schranke wie `refreshDailyQuests`.
Content-Flag `weekly: true` mit `difficulty` und `giver`. Der Wachstumsauftrag nutzt
`reach_total_level` relativ zur Baseline (Baseline-Mechanik existiert für repeatable), Zielwert nach
Level-Band: +8 unter Gesamtlevel 200, +6 bis 500, +4 darüber. Auswahl: seeded über den Wochenstempel,
Filter `isDailyEligible` wiederverwendet.

**Rechnung.** Lohn 12 / 18 / 25 Tokens (leicht/mittel/schwer) = 55 je Woche, plus 60 Gunst je
Zettel, plus die Karawanen-Kiste (Idee 6). Endgame-Woche: 7 × 16 (Kern) + 55 = 167 Tokens; mit
Restkarten bis rund 240. Jeder Wochenzettel soll 1 bis 2 Stunden Warteschlange entsprechen.

**Art.** Bestand; ein Wochenzettel-Rahmen (breiter, Pergament dunkler) als CSS. **Aufwand** M.
**Risiko** gering; Wochen-Reset ist die Daily-Logik mit anderem Stempel. **Abhängigkeiten:** Idee 3
(Buch-Layout), Idee 6 (Karawane).

### Idee 6 — Die Karawane (ein Auftrag, der die Welt verändert)

**Spielererlebnis.** Der Wochenzettel „Karawanenlieferung" (Voss und Mux: 60 Barren, 40 Portionen,
20 Saat, je nach Kapitel) endet nicht mit Tokens, sondern damit, dass die Karawane am Handelsposten
steht: Der Karawanenmarkt öffnet bis Sonntag mit fünf Angeboten gegen Gold, davon eines mit
begrenztem Vorrat (Rune, Suffix-Pergament, Tonikum der nächsten Stufe) und eine Karawanen-Kiste. Wer
nicht liefert, sieht am Montag den leeren Stellplatz. Die Welt reagiert auf das, was man getan hat.

**Engine/Idle.** `world.caravanWeek: number` (Wochenstempel der letzten Ankunft; 0 = nie) im State,
gesetzt beim Claim des Karawanenzettels. Shop-Angebote bekommen `requiresCaravan?: true` und
`weeklyStock?: number`; Kauf-Zähler `caravanBought: Record<offerId, number>` wird beim Wochenwechsel
geleert. Angebots-Rotation seeded über den Wochenstempel und das höchste freigeschaltete Kapitel,
damit die Ware zum Stand passt. Alles rein deterministisch, kein Echtzeit-Fenster: der Markt ist
offen, solange `caravanWeek === aktuelle Woche`.

**Rechnung.** Lieferung entspricht rund 45 bis 90 Minuten Skilling je Woche; Gegenwert im Markt
gedeckelt auf Ware, die es auch anderswo gibt (Regel 3), plus genau ein Vorratsstück, das man sonst
nur erspielt. Kiste: 1 Rolle aus einer kapitelgerechten Tabelle, kein Chase-Item.

**Art.** Bestand: `camp_trade_post` (3 Stufen, Tag/Nacht). Neu wünschenswert: ein Karawanen-Standbild
(Karren vor dem Handelsposten) und ein Kisten-Icon; Fallback bestehendes Truhen-Item. **Aufwand** M.
**Risiko** mittel: Markt-Ware darf die Progression nicht abkürzen; Vorrat 1 bis 3 Stück, Preise am
Gold-Shop kalibrieren. **Abhängigkeiten:** Idee 5.

### Idee 7 — Tageslaunen der Welt

**Spielererlebnis.** Jeden Tag ist eine der sechs Karten eine Launenkarte, die zum Wochentags-Segen
passt: am Blutmond (Samstag) „Brennas Blutjagd: 25 Köpfe, doppelter Lohn", am Aschesturm (Dienstag)
„Shairi: Saat vor dem Sturm einholen", bei Stille (Mittwoch) „Urga: die Esse läuft rund, 12 Barren".
Dazu kommt einmal je Woche ein kleiner Vorfall aus einer Tabelle („Ratten im Speicher", „Nebel über
der Furt", „Ein Bote aus dem Turm"), der die Karte mit einem Satz und einem Bild einleitet. Der Tag
hat eine Laune, die man am Brett ablesen kann.

**Engine/Idle.** Content-Feld `mood?: BlessingId` an Daily-Karten; `pickDailyQuests` reserviert Slot
6 für eine Karte mit `mood === blessingForTime(day)`, falls im gefilterten Pool vorhanden (sonst wie
heute). Vorfälle sind Content-Tabellen mit `incidentId`, deterministisch über den Tagesstempel
gezogen; sie ändern Text und Lohn-Multiplikator der Karte (×1,5 bis ×2 Tokens, nie Gunst-Bonus).
Kein State, kein Save-Belang: Segen ist bereits eine reine Funktion des lokalen Tages.

**Art.** Bestand: Segen-Icons, Zonenbilder, Gebäudebilder (Nachtvarianten für „Nebel", „Bote").
**Aufwand** S (Engine) + S bis M (Content: 7 Launenkarten je Level-Band, 8 bis 10 Vorfälle).
**Risiko** gering. **Abhängigkeiten:** keine; passt zu Ideen anderer Perspektiven über Wetter und
Ereignisse, sofern die deterministisch am Tagesstempel hängen.

### Idee 8 — Gunst der Glutfeste (Ansehen je Auftraggeber)

**Spielererlebnis.** Jeder abgelieferte Zettel zahlt Gunst bei seinem Absender. Vier Stufen (Bekannt,
Vertraut, Verbündet, Gefährte) öffnen Zugang, nicht Zahlen: Eske stellt morgens einen Proviantkorb
hin (1 Abholung/Tag, Kochware des aktuellen Kapitels), Voss legt ein Zählbuch auf (Statistik-Seite
mit Tages- und Wochenbilanz), Urga gibt ein Meisterrezept frei (Variante eines vorhandenen Items,
kein neues Tier), Mux gewährt Karawanenrabatt, Shairi eine seltene Saat, Brenna den Zugang zu
„Kopfgeld" ohne Slayer-Level-Gate. Stufe 4 ist ein Titel und ein Porträtrahmen. Man baut sich ein
Verhältnis auf, das im Buch als Leiste sichtbar ist.

**Engine/Idle.** `favor: Record<GiverId, number>` im State (SAVE-Bump, alle 0). Vergabe in
`claimQuest` über `QuestDef.giver` und Schwierigkeit; Slayer-Aufträge zahlen Brenna-Gunst in
`recordKillForSlayer`. Deckel: je Absender höchstens 60 Gunst/Tag aus Dailies und 40 aus Slayer
(kein Grind-Pfad). Stufenwirkungen laufen über einen `favorLevel(giver)`-Helfer, den Shop, Rezepte
und Slayer-Vergabe lesen. Keine Abnahme, kein Verfall (Idle-Regel: Pause kostet nichts).

**Rechnung (Gunst je Zettel: 10/12/15/20/30 nach Schwierigkeit, Wochenzettel 60, Slayer 5):**

| Stufe | Schwelle | fokussiert (3 Kern beim selben Absender, ~50/Tag + 60/Woche) | verteilt (6 Absender) |
|---|---|---|---|
| Bekannt | 120 | 2 bis 3 Tage | ~1 Woche |
| Vertraut | 400 | ~1 Woche | ~3 Wochen |
| Verbündet | 900 | ~2,5 Wochen | ~6 Wochen |
| Gefährte | 1.800 | ~5 Wochen | ~12 Wochen |

Kein einzelner Lohn liegt weiter als 5 bis 6 Wochen entfernt; alle sechs Absender auf Gefährte ist
das offene Ende (rund 4 bis 5 Monate), aber kein einzelnes Ziel. Die Leiter hat 24 Sprossen statt der
heutigen 7 Andenken.

**Art.** Bestand: Embleme, Gebäudebilder; Porträtrahmen als CSS. Neu wünschenswert: fünf Köpfe (wie
Idee 2). **Aufwand** M. **Risiko** mittel: Stufenwirkungen dürfen die Lager-Boni (`campBoost`) nicht
stapeln, deshalb bewusst Zugang statt Prozent; Titel müssen in sieben Sprachen. **Abhängigkeiten:**
Ideen 2, 3, 5.

### Idee 9 — Glut statt Streak, Abendzettel statt Verfall

**Spielererlebnis.** Die Serie heißt jetzt Glut: Sie wächst mit jedem geschlossenen Tag, und ein
verpasster Tag je Woche lässt sie nur abkühlen statt erlöschen (Ruhetag). Ab Glut 7 gibt es 10 %
mehr Gunst, keine Tokens (Anti-Grind). Wer morgens reinschaut, findet die gestern in der
Warteschlange fertig gewordenen Zettel bereits bezahlt: Fertige, nicht eingelöste Karten werden beim
Tageswechsel automatisch abgeliefert. Nichts verfällt, weil man geschlafen hat.

**Engine/Idle.** In `refreshDailyQuests` vor dem Neuziehen: für jeden Eintrag mit erfüllten Zielen und
`claimed === false` ein `claimQuest` (Tokens und Gold immer, Items nur bei Platz, sonst in die Bank
per `addItemOrBank`). Streak: `dailyStreak` bleibt, neu `dailyGraceWeek: number` (Wochenstempel, in
dem der Ruhetag verbraucht wurde); Lücke von genau einem Tag und freier Ruhetag → Streak bleibt.
Erfolge 3/7/30/100 behalten ihre Semantik, werden nur gnädiger. Uhr-Rücksprung bleibt abgewiesen.

**Art.** Bestand; Glut-Anzeige als kleines Kohlenbecken-Icon (vorhanden in Gebäudebildern) oder
Emblem. **Aufwand** S. **Risiko** gering; Auto-Claim muss `canHoldRewards` respektieren.
**Abhängigkeiten:** keine; sollte in jedem Fall kommen, auch wenn sonst nichts aus dieser Liste.

### Idee 10 — Kapitel-Nebenseiten des Wächters

**Spielererlebnis.** Mit jedem Chronik-Kapitel öffnen sich zwei bis drei Nebenseiten: kleine
Aufträge ohne Frist, die das Kapitel vertiefen. Eine davon ist immer eine Wiederkehr in ein altes
Gebiet mit Dreh (den Champion stellen, ein Lieferziel für Eske, ein Geleit durch die Weiden), eine ist
eine Entscheidung mit zwei Ausgängen (Voss oder Mux beliefern; beide zahlen, aber verschieden), und
eine ist ein Meilenstein (Meisterschaft, Turm-Etage). Belohnung: Chroniktext, ein Andenken, Gunst.

**Engine/Idle.** Reine Content-Arbeit auf `QuestDef` mit `requires: ["chronicle_NN"]`, `giver`,
`loreText`; Entscheidungen als zwei Quests mit gegenseitigem Ausschluss (`excludes?: string[]`, neues
Content-Feld; Engine prüft in `questUnlocked`). Kein Save-Belang außer dem bestehenden
completed/claimed. Lore-dev schreibt, content-dev trägt ein.

**Rechnung.** 21 Kapitel × 2,5 Nebenseiten ≈ 50 Quests, je 2 bis 5 Tokens und 20 bis 40 Gunst; das
verdoppelt die Story-Tokens auf rund 400 über die Lebenszeit, ohne Tagesdeckel zu berühren.

**Art.** Bestand: Zonenbilder, Elite-Kodex-Bilder, Andenken-Items (7 vorhanden; für neue Andenken
Item-Bilder nötig oder Wiederverwendung mit Suffix). **Aufwand** S (Engine) + L (Text in sieben
Sprachen). **Risiko** gering technisch, hoch im Textvolumen; deshalb erst Kapitel 1 bis 9 in 1.2.0.
**Abhängigkeiten:** Idee 2 (Absender), lore-dev.

### Idee 11 — Die Belohnungsleiter (Ökonomie und Deckel)

**Spielererlebnis.** Tokens haben wieder Ziele: Neben den Kapitel-Regalen gibt es je Absender ein
Gunst-Regal, das mit der Stufe wächst (Stufe 2: ein Andenken, Stufe 3: ein Werkzeug oder Tonikum
der nächsten Kapitelstufe, Stufe 4: ein Kosmetik-Stück). Preise 30 bis 60 Tokens, also 2 bis 4
Kerntage je Stück. Wer alle sechs Regale leerkauft, hat rund 540 Tokens ausgegeben, was drei bis
fünf Wochen Kernpfad entspricht; die Verbrauchsbündel bleiben die unendliche Senke.

**Engine/Idle.** `TokenShopShelf.requiresFavor?: { giver, level }` neben `requiresQuest`, geprüft in
`isShelfOpen`. Kein neuer State. Deckel, die diese Liste zusammenhält:

| Quelle | Deckel | Warum |
|---|---|---|
| Tageszettel | 26 Tokens/Tag (heutiger Wert) | Shop-Kalibrierung hält |
| Wochenzettel | 55 Tokens/Woche | Wochenendspieler bekommt ein Drittel des Endgame-Wochenlohns |
| Slayer-Serie | 2 Tokens je 5 Aufträge (unverändert) | Kampf bleibt lohnend, aber kein Token-Grind |
| Gunst | 60/Tag je Absender aus Zetteln, 40 aus Slayer | keine Ein-Absender-Farm |
| Launenkarte | ×2 Tokens auf genau einer Karte | Tag fühlt sich besonders an, Deckel steigt um ≤ 8 |
| Kapitel-Nebenseiten | einmalig | Story-Tokens bleiben Bonus, nicht Einkommen |

**Zeit bis zur Belohnung (Endgame-Kernpfad, 16 Tokens/Tag):** Verbrauchsbündel 1 Tag, Andenken 1
Tag, Gunst-Andenken 2 bis 4 Tage, Kapitel-Regal komplett 1 Woche, Gunst-Regal je Absender 1 bis 2
Wochen (plus Gunst-Schwelle), alle Gunst-Regale 3 bis 5 Wochen. Frühspiel (7 Tokens/Tag): erstes
Andenken am Tag 3, erstes Gunst-Andenken Ende Woche 1. Nichts unter 1 Tag außer Bündeln, nichts über
6 Wochen.

**Art.** Bestand plus 12 neue Andenken-Bilder (Mira später; Fallback: Bestandsitems mit Suffix).
**Aufwand** S (Engine) + M (Content). **Risiko** gering. **Abhängigkeiten:** Ideen 3, 5, 8.

---

## 3. Ein Tag im Leben

Morgens öffnet der Spieler das Auftragsbuch und sieht, dass die Warteschlange über Nacht Urgas
Barrenzettel fertig gemacht hat und er schon bezahlt ist; Glut steht auf 9. Er heftet drei Zettel als
Tagesziel ab: Eskes Lieferung (30 Forellen, liegen in der Bank), Brennas Launenkarte (Blutmond, 25
Köpfe für doppelten Lohn) und Shairis Saatzettel; die Kampfkarte gegen Kryptaskelette tauscht er
gratis gegen einen Streifzug. Dann stellt er die Warteschlange auf Angeln, danach Aschfelder-Kampf,
und schließt das Spiel. Mittags ein kurzer Blick: der Streifzug hat zwei von drei Gebieten, Brennas
Aufträge laufen mit, der Wochenzettel „Karawanenlieferung" steht bei 41 von 60 Barren. Er hängt zwei
Slayer-Aufträge hinten an die Queue, weil Brenna diese Woche noch 80 Gunst bis Vertraut fehlt.
Abends liefert er Eske die Forellen ab, die Tagesabschluss-Glocke zeigt +3 Tokens und +15 Gunst, und
das Kapitel-Nebenblatt „Wiederkehr in die Weiden" verlangt den Champion des Bullen, also stellt er
die Weiden für die Nacht ein. Vor dem Schließen liefert er die letzten Barren an Voss: Die Karawane
steht bis Sonntag am Handelsposten, und im Markt liegt genau ein Frostrunen-Pergament. Er hat dafür
noch nicht genug Gold, aber die Nacht ist lang, und der Zettel für morgen ist schon angeheftet.

---

## 4. Drei Fragen an den Chef

1. **Ein Buch oder Brücken?** Soll das Auftragsbuch in 1.2.0 nur die Übersicht sein (Slayer-Seite,
   Chronik und Dailies bleiben eigene Seiten, das Buch verlinkt), oder gehen Dailies und
   Wochenaufträge komplett ins Buch und die Quest-Seite wird zur reinen Chronik? Meine Empfehlung:
   Übersicht jetzt, Fusion der Engines nach 1.2.0, aber die Slayer-Stufen-Entscheidung vorher.
2. **Gunst als Zugang oder als Zahl?** Ich empfehle Zugang, Kosmetik und Titel (nichts, was auf die
   Lager-Prozente stapelt). Wenn der Chef lieber fühlbare Zahlen will, müssten Deckel und
   `campBoost`-Klemmen gemeinsam neu kalibriert werden, das wäre eine eigene Balance-Welle.
3. **Wochentakt: Kalender oder rollend, und wie hart ist die Karawane?** Montag lokal (wie die
   Wochentags-Segen) oder sieben Tage ab dem ersten Login eines Spielers? Und soll die Karawane nur
   kommen, wenn man liefert (Welt reagiert auf mich), oder jede Woche kommen und die Lieferung nur
   den Markt vergrößern (Welt lebt auch ohne mich)? Ich empfehle Montag lokal und „kommt nur, wenn
   ich liefere" für den Sinn-Effekt, mit einer kleinen Grundauslage, damit der Posten nie leer wirkt.

---

## 5. Was ich bei den anderen Perspektiven prüfen möchte

- **Jede Token- oder Gunst-Quelle außerhalb der Deckel aus Idee 11.** Ein „Ereignis zahlt 20
  Tokens" oder „NPC-Geschenk" sprengt die Shop-Kalibrierung; Ereignisse sollten Gold, Ware oder
  Zugang zahlen, nicht Tokens.
- **Echtzeit in der Engine.** Alles, was „passiert um 18 Uhr" oder „nur wenn du online bist"
  verlangt, verletzt Regel 1; ich prüfe, ob jedes Ereignis als Funktion des Tages- oder
  Wochenstempels formulierbar ist (Muster `blessingForTime`, `refreshDailyQuests`).
- **Vierte Währung.** Wenn eine Perspektive Ruf, Ansehen oder Marken als kaufbare Währung vorschlägt,
  möchte ich das mit Gunst (Idee 8, nicht ausgebbar, nur Stufen) zusammenlegen; drei Währungen
  (Gold, Slayer-Punkte, Tokens) sind genug.
- **Weltereignisse gegen combat-is-fundamental.** Kein Vorfall, kein Markt und keine Karawane darf
  kampf-gegatete Materialien oder Drops liefern; ich rechne Markt- und Kisten-Tabellen gegen die
  Drop-Tabellen gegen.
- **NPC-Ideen und Textvolumen.** Jede Dialogzeile ist ×7 Sprachen; ich prüfe, ob vorgeschlagene
  Figuren mit den 12 Roster-Zeilen auskommen oder ob Bewohner-Systeme (New Haven) Hunderte Zeilen
  brauchen.
- **Stapelnde Boni.** Bewohner, Wetter, Gunst und Segen dürfen nicht alle auf dieselben Multiplikatoren
  zeigen; ich prüfe jede vorgeschlagene Wirkung gegen `CAMP_BLESSING_BOOST_CAP`,
  `SLAYER_POINTS_TOTAL_BONUS_CAP` und die Gather-/Craft-Speed-Klemmen.
- **Verlust durch Abwesenheit.** Jede Idee mit Verfall, Abkühlung oder Strafe für Pausen widerspricht
  dem Idle-Versprechen; Glut (Idee 9) ist die gnädigste Form, die ich für vertretbar halte.
- **Slayer-Doppelung.** Wenn eine andere Perspektive Kopfgeld-Bretter, Jagdaufträge oder Monsterlisten
  vorschlägt, prüfe ich, ob das Brennas Stufen (offene Chef-Entscheidung) ersetzt oder dupliziert.
