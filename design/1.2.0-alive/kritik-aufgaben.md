# 1.2.0 „Alive" — Kreuzkritik aus Sicht Aufgaben/Ökonomie (balance-designer, 26.08.2026)

Gelesen: brainstorm-lore.md (L1–L12), brainstorm-weltsysteme.md (W1–W11), brainstorm-erlebnis.md (E1–E11).
Referenz: brainstorm-aufgaben.md (A1–A11). Basis-Zahlen: heute 20–26 Tokens/Tag Endgame (140–180/Woche),
7 Andenken für 100 Tokens (in 5 Tagen durch), Slayer-Serie +2 je 5. Auftrag, Slayer-Shop 35–50 Pkt/h.

## 1. Rechnung: wo kippt es, welche Deckel braucht es

Naiv addiert (jeder Vorschlag zahlt, was er vorschlägt) kommt eine Endgame-Woche auf: Tagesbrett 182 +
siebter Platz „Bitte des Tages" (L3) 56 + Bedarfe (W7, „≤ 50 % der Daily-Ausschüttung") 91 + Gerücht (W9) 20 +
Feuerwache (L6) 10 + Wochenaufträge (A5) 55 + Slayer-Serie 20 = **434 Tokens** statt 180. Das ist ×2,4: die
Andenken-Regale sind an Tag 2 leer, jedes Bündel wird Wegwerfware. Gunst kippt ähnlich: Brenna bekäme aus
Karten, Bedarfen, Köpfen (W5) und Slayer-Aufträgen ungedeckelt 120–150/Tag, „Gefährte" (1.800) fiele in zwölf
Tagen statt fünf Wochen. Der Kern der Lösung: **ein Tagesbudget, ein Wochenbudget, alles andere zahlt keine
Tokens.**

| Vorschlag | naive Wirkung | kippt? | Deckel |
|---|---|---|---|
| W1 Zonenlagen ≤ 1,15 | Gold: Gier 1,20 (Schrein 1,26) × Belagerung 1,15 = ×1,45; XP ×1,24; Rare ×1,21 | Token-Ökonomie nein, Gold-/Rare-Band ja | gleiche Art stapelt nicht (max statt Produkt), Gesamt je Art ≤ 1,30; Lage nie auf Tokens, Gunst, Slayer-Punkte, Dungeon-Clears |
| L3 siebter Platz | +2–8 Tokens/Tag (+30 % Woche) | ja | Bitte des Tages **ist** Platz 6 (A7), zahlt normalen Kartenlohn und doppelte Gunst, keine doppelten Tokens; Tagesdeckel bleibt 26 |
| W7 Bedarfe (Tokens ≤ 50 % Daily) | +13/Tag, +91/Woche | ja | Bedarfe sind die zwei Lieferkarten des Tagesbretts (`deliver_items`, Absender Voss/Eske/Urga) und zahlen aus dem 26er-Deckel; obendrauf nur Bautrupp-Stunden (≤ 1 h/Tag) und Gunst |
| W5 Kopfgelder | Slayer-Punkte + 1 Andenken/Woche | Punkte nein (+45 Pkt/Woche ≈ +5 %), Andenken ja (52/Jahr) | Kopf ≤ 3× `scaledTaskPoints`, 0 Tokens, Brenna-Gunst 10/Kopf innerhalb 40/Tag; Andenken je Gezeichnetem einmalig (12 im Pool), nie wöchentlich |
| W6 + A6 Karawanenmarkt | 1–2 Token-Angebote je Halt (10–20), Gold-Angebote | nein, ist eine Senke (bis 70/Woche) | Kauf ≥ 2× Verkaufswert (Arbitrage-Guard), ≤ 1 Unikat je Halt, Vorrat 1–3, nie kampf-gegatete Ware, Markt gilt bis Wochenende, kein Verlust |
| W9 Gerücht, L6 Feuerwache, A5, Lieferung | 4–5 Wochenquellen à 10–25 = 80–100/Woche | ja | genau **3 Wochenzettel-Slots (55 Tokens)**: Erzähl-Slot (Gerücht), Liefer-Slot (Karawane oder Feuerwache), Jagd-/Wachstums-Slot; Angebot 5, Wahl 3 |
| L2 / W8 Raben-Post-Anhänge | Brot, Proviant, Fundstück des Boten | Tokens nein, Bündel-Ersatz ja bei Wiederholung | Anhang nur an `once`-Briefen (Meilenstein), Cooldown-Briefe ohne Anhang; Boten-Fundstück ≤ Wert eines 3-Token-Bündels, ≤ 1/Woche; nie Tokens, nie Gunst; die Einladung (`queueHint`) ist der Lohn |
| Gunst gesamt | Karten 10–30, Woche 60, Slayer 5, Kopf 10, Laune ×2 | ja ohne Deckel | 60/Tag je Absender aus Karten, 40 aus Slayer und Köpfen, 200/Tag über alle; keine Abnahme |

Ergebnis mit Deckeln: Endgame-Woche Kern 112 + 55 = **167**, Maximum 182 + 55 = **237** (+30 % gegen heute,
gewollt, weil neue Senken kommen). Shop-Kalibrierung: Bündelpreise unverändert (kein Repricing in bestehende
Saves), die Andenken-Zeit wächst von 5 Tagen auf 3–5 Wochen über Gunst-Regale (A11, 540 Tokens), Karawanen-
Token-Angebote (≤ 70/Woche) und Kopf-Andenken über Slayer-Punkte. Frühspiel bleibt 7/Tag Kern, erstes
Andenken Tag 3. Guard-Test: Monte-Carlo über 4 Wochen je Level-Band, Tokens/Woche in [150, 240] Endgame,
[40, 80] Tag 1–7; Gunst je Absender ≤ 1.400/Woche.

## 2. Drei Ideen der anderen, die das Auftragsbuch am stärksten machen, und wie daraus EIN System wird

1. **Absender (L1, L4, W7-Besucher, W8-Absender).** Lore hat die sieben Porträts gefunden (ich hatte fünf
   als fehlend geführt; Korrektur zu A2: null neue Bilder). Ein `GiverId` und eine `givers`-Tabelle (Porträt,
   Emblem, Gebäude, Stimm-Pool) werden von Karten, Briefen, Besuchern, Chronikzeilen und Gunst gemeinsam
   gelesen. Lores Ableitungsregel (Kills → Brenna, Barren → Urga …) ist der Default, `giver` am `QuestDef`
   die Ausnahme. Damit sind „Bitte statt Zettel" (L) und Gunst (A8) dieselbe Zeile im Content.
2. **Die Weltuhr (W1) mit Woche des Reachs (L3).** Tagesstempel, Wochenstempel und `worldSeed` sind die
   einzige Antwort auf jedes „wann": Tagesbrett, Bitte des Tages, Wochenzettel, Karawanen-Fahrplan (W6),
   Gezeichnete (W5), Lagen. Mein Buch führt keinen eigenen Timer; `refreshDailyQuests` und ein
   `refreshWeekly` lesen nur Stempel. Lores Vorgeschichten je Wochentag sind der Text, der die Uhr fühlbar
   macht, und A7/L3 sind schon dieselbe Idee.
3. **Raben-Post als Einladung (L2, W8, E9).** Post ist der Push-Kanal des Buchs: Ein Brief trägt
   `contractRef` und `queueHint`, der Klick reiht die passende Aktion ein. Tafel/Buch ist der Pull-Kanal,
   das New-Haven-Tagesblatt (W7) ist das Buch gefiltert auf Lager-Absender, die Chronik (W3/L10) ist das
   Protokoll der Abgaben. Ein Datenmodell: `Contract { giver, cadence, objectives, rewards, expiresStamp }`,
   `Letter { giver, textKey, contractRef?, queueHint? }`, `ChronicleEntry { kind, refs, dayStamp }`.

So wird es eins: **Absender** sagt, wer bittet; **Uhr** sagt, wann; **Tafel** zeigt, was offen ist; **Post**
bringt es zum Spieler; **Gunst** merkt sich, dass er geliefert hat. Ehrenplatz: W9 „Gerücht der Woche" ist
mein Erzähl-Slot der Wochenzettel und braucht kein eigenes System, nur die Vorlagen.

## 3. Drei Streichungen oder Verschiebungen

1. **Drei Tagebücher → eines.** E2 (Sitzungs-Feed, renderer-lokal), W3 (Chronik-Datensätze) und L10
   (Tageseintrag) sind dieselbe Fläche. Behalten: W3-Datenmodell mit L10-Stimme, Deckel 12 Zeilen/Tag, 7 Tage.
   E2 streichen (Toasts reichen), E1 Weltpuls-Zeile nur als Hover auf der Weltzeile, nicht als Rotation.
2. **W5 Kopfgeldtafel verschieben oder in Brennas Stufen falten.** Sie dupliziert Slayer-Aufträge, Eliten und
   das vom Chef zurückgebaute BountyBoard (E-Vorbemerkung). Wenn der Chef Brennas Stufen freigibt, wird der
   Gezeichnete der Woche das Ziel der Stufe „Blutjagd" (ein Zettel, kein zweites Brett). Sonst 1.2.x.
3. **W11 Zonen-Gedächtnis, W10 Monde/Feste, W2 Nacht, E5/E6 Deko und Tönung → 1.2.x.** Präsenz ist eine
   Rückkopplung auf die Lagen (schwer erklärbar, stapelt), Feste sind verpassbarer Kalender, Nacht halbiert
   die Welt für Schichtarbeiter, und alle vier zahlen nichts auf „besseres Aufgabensystem" ein. E6 hängt
   ohnehin an einer Chef-Entscheidung vom 24.07. Nicht streichen, aber verschieben: L7 Halbmarke (braucht
   `excludes`, ein Porträt und eine Chef-Frage) hinter die Kapitel-Nebenseiten (A10), die dasselbe Feld nutzen.

## 4. Der Alive-Kern (fünf Systeme, Reihenfolge = Abhängigkeit)

| # | System | enthält | Aufwand | Woche |
|---|---|---|---|---|
| 1 | **Weltuhr** | W1 (worldSeed, worldDay/worldWeek, Wochenstempel mit Monotonie-Guard), Lagen mit Deckel aus § 1, Weltzeile in der TopBar (W1-UI, E4-Wochenrad als Tooltip) | M | 1 |
| 2 | **Absender und Gunst** | GiverId-Tabelle, `giver` am QuestDef mit Ableitungsregel (L1), `favor`-State mit Deckeln (A8), Namen statt Amtstitel (L-Chef-Frage 1), Text-Pass Phantom-Bauern (L-Vorbemerkung) | M | 1–2 |
| 3 | **Das Auftragsbuch** | Tageszettel 3 von 6 + Tausch (A3), Abendzettel + Glut (A9), Bitte des Tages auf Platz 6 (L3/A7), neue Zettelarten inkl. `deliver_items` für Bedarfe (A4/W7), Wochenzettel 3 Slots mit Gerücht (A5/W9), Gunst-Regale (A11), Tafel-Optik (E11) | L | 2–4 |
| 4 | **Raben-Post und Chronik** | Briefe mit Absender, `contractRef`, `queueHint` (L2/W8/E9), Chronik als Protokoll (W3+L10), Wächter-Bericht mit Bau- und Brief-Breadcrumbs (E3/W4), Erinnerungszeilen (L4) | M | 3–4 |
| 5 | **Karawane und Tagesblatt** | Fahrplan (W6) + Lieferzettel öffnet den Markt (A6), Besucher am Gebäude (W7/L5 Stufe A), Bau-Zeremonie klein (E10), New-Haven-Nebenstrang aus fertigen Texten (L5) | M | 4–5 |

Woche 6 ist Sweep und Kompat-Vault. **Zuerst gebaut werden muss der gemeinsame Datenboden, in einem einzigen
SAVE-Bump (logic-dev, Woche 1):** `worldSeed`, Wochenstempel, `GiverId`, `favor`, `daily.closed/swapsUsed`,
`weekly`, `caravanWeek`, die neuen `PlayerStats`-Zähler (Zonen, Dungeons, Elites, Verkauf, Proviant, Bauten)
und die neuen `QuestObjectiveType`-Werte, alle mit Default und Sanitize. Erst dann können content-dev (Karten,
Absender, Regale), lore-dev (Bitten, Briefe, Wochentexte) und ui-dev (Buch, Post, Weltzeile) parallel
andocken, ohne dass einer auf den anderen wartet oder ein zweiter Bump nötig wird. Was in diesem Kern fehlt,
kommt danach: Kopfgeld als Blutjagd-Ziel, Halbmarke, Kapitel-Nebenseiten ab Kapitel 10, Nacht, Feste, Präsenz.
