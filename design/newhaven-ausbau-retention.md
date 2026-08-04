# New Haven als täglicher Anker — Ausbau-Brainstorm (Retention-Rückgrat)

*Balance-Designer, 2026-08-03. Reines Design-Doc, kein Code, keine Änderung an bestehenden Docs.*
*Grundlagen: `design/encampment-konzept.md` (Eiserne Regeln + Zielbild), `design/0.3.0-zielsetzung.md`
(Scope-OUT = erste Ausbau-Kandidaten), `design/encampment-balance.md` (+ Nachtrag 03.08.),
`design/newhaven-sim-report.md` (gemessene Befunde), `design/newhaven-bauteile-vorschlag.md`,
`design/newhaven-freie-platzierung-entscheid-2026-07-31.md`, `design/daily-quests-spec.md`.*

---

## 0. Diagnose: Warum New Haven heute „einmal durchbauen, dann passiv" ist

Der Sim-Report hat es gemessen, nicht vermutet:

1. **Der Interaktions-Teil ist nach einer Sitzung vorbei.** Die komplette Stufe I ist nach ~13
   Spielstunden durchgebaut; danach läuft immer genau EIN langer Bau ohne Entscheidung
   (Sim-Report §3.2). Für die 1×/Tag-Zielgruppe heißt das: ab Tag 2 ist New Haven ein
   Fortschrittsbalken, den man anschaut.
2. **Die Wirtschafts-Senke ist zu klein.** 14,3 h Materialbeschaffung gegen 456 h Bauzeit
   (Verhältnis 1:32, Sim-Report §6). Das Lager saugt praktisch nichts aus der Bank — die
   Senken-Absicht der Eisernen Regel 5 wird strukturell verfehlt, nicht nur in den Zahlen.
3. **Nach dem Endausbau gibt es NICHTS.** Kein wiederkehrender Grund, den Screen zu öffnen,
   außer dem Offline-Report. Der Wachturm holt den Spieler zwar täglich ins Spiel, aber nicht
   ins Lager.

Das Ziel dieses Docs: **jeden Tag ein Grund, New Haven zu ÖFFNEN** (nicht nur davon zu
profitieren) **und nach Wochen noch ein Ausbauziel.** Jede Idee unten wird gegen die Eisernen
Regeln geprüft:

| Regel | Kurzform |
|---|---|
| R1 | Kein neuer Wasserhahn — nur veredeln/beschleunigen/verbinden Bestehendes |
| R2 | Null neue Währungen (Gold + Materialien + bestehende Quest-Tokens), max. der eine Bauzeit-Timer-Typ |
| R3 | Boost-Budget hart, KAMPF-Werte unberührt |
| R4 | Echtzeit-Timer im „Die Stämme"-Stil, offline==online deterministisch |
| R5 | Kosten = Senken |

---

## 1. Rekruten-/Companion-Missionen (die geplante Phase 2: Gesindehaus/Zwinger)

**Kernidee.** Rekruten (neue Lager-NPCs, Gesindehaus) und Companions (die bestehenden 21 Pets,
Zwinger) werden auf Echtzeit-Missionen geschickt — exakt das Bautrupp-Muster: EIN Auftrag je
Einheit, deterministische Dauer über die getickte Spielzeit, Ergebnis im Offline-Report. Die
Mission ist die „zweite Bautrupp-Spur": etwas, das man morgens losschickt und abends abholt.

**Was Missionen zurückbringen (der R1-kritische Punkt).** Missionen erzeugen NIEMALS Items aus
dem Nichts. Vier saubere Belohnungsklassen:

| Klasse | Beispiel | Warum regelkonform |
|---|---|---|
| **Veredelung** | „Trage 200 Erz zur Schmiede von Emberrest" — Spieler gibt Erz + Kohle mit, Rekrut bringt Barren zurück (Schmelzofen-Semantik: kein XP, kein RNG, exakte Rezeptmengen) | Input→Output über Normalpfade, wie Schmelzofen/Räucherhaus |
| **Zeitersparnis** | „Hilfstrupp anheuern": laufender Bau −X h (einmalig, auf den AKTIVEN Job) | verschiebt nur Kalenderzeit, keine Ökonomie |
| **Quest-Tokens** | Kurier-Mission zahlt 1–2 Tokens | bestehende Währung (Daily-Quests + Achievement-Meilensteine zahlen sie bereits); R2-konform, aber Budget-pflichtig (s. u.) |
| **Wissen & Karte** | Kundschafter-Mission bringt ein **Karten-Fragment**: vervollständigte Sätze erweitern die nutzbare Lagerkarten-Fläche (freie Platzierung existiert schon!) oder decken einen Wiki-/Bestiarium-Eintrag auf | rein kosmetisch/QoL, null Ökonomie-Wirkung |

**Loop-Skizze.** Täglich stehen 2–3 Missions-Angebote am Gesindehaus (deterministisch pro
Kalendertag geseedet, Muster Daily-Quests). Spieler wählt, bestückt ggf. mit Inputs, schickt los
(4–12 h Echtzeit). Companion-Twist beim Zwinger: ein Pet auf Mission ist als aktiver Begleiter
NICHT verfügbar — sein Passiv-Bonus pausiert. Das ist eine echte Entscheidung ohne neuen
Power-Hahn (Opportunitätskosten statt Bonus).

**Anbindung an Bestehendes:** Bautrupp-Timer-Code (Job-Struktur, Offline-Report),
Schmelzofen-Veredelungspfad (`refine.ts`-Semantik), Daily-Seed-Muster, Pet-System
(`companionPetId`), Quest-Token-Shop, Karten-Rendering mit freier Platzierung.

**Aufwand: L.** Zwei neue Gebäude ×3 Stufen (Assets!), Missions-Katalog, neuer State +
SAVE_VERSION + Migration + Vault-Fixture, eigene UI, Token-Budget-Guard. Das ist ein
Headline-Feature, kein Zwischenpatch.

**Risiken.**
- *Token-Inflation:* jede neue Token-Quelle entwertet den Rewards-Shop. Budget hart pinnen:
  Missions-Tokens/Tag ≤ 50 % der Daily-Quest-Tokens/Tag, Guard-Test analog `camp-envelope`.
- *Veredelungs-Doppelung:* Missions-Veredelung darf Schmelzofen/Räucherhaus nicht obsolet machen
  — Missionen sind Batch (1× am Tag, größere Menge), Gebäude sind Dauerläufer. Raten-Summe
  gegen die ≤-30-%-Leitplanke aus `encampment-balance.md` §4 rechnen.
- *„Noch ein Timer":* R2 erlaubt max. EINEN neuen Timer-Typ — Missionen MÜSSEN denselben
  Bauzeit-Timer-Typ wiederverwenden (gleiche Engine-Struktur, andere Job-Art), sonst
  Regelbruch.

---

## 2. Versorgungsaufträge / Schwarzes Brett (tägliche Material-Lieferwünsche)

**Kernidee.** Am Zentralhaus hängt ein Schwarzes Brett: 3–4 Lieferwünsche pro Kalendertag
(„Das Lager braucht: 120 Kohle", „40 rohe Häute", „15 Hummer"). Der Spieler LIEFERT die
Materialien — sie werden KONSUMIERT (das ist der Punkt: eine echte, wiederkehrende Senke, genau
die Lücke aus Diagnose #2) — und bekommt eine kleine, klug gewählte Belohnung.

**Belohnungen (bewusst klein, bewusst keine Items):**
- **Quest-Tokens** (1–2 je Auftrag, Tagesbudget gedeckelt — s. Risiko oben),
- **„Helfer-Stunden":** der laufende Bau wird um 30–60 min verkürzt (die Lieferung „ernährt
  den Bautrupp") — thematisch perfekt und reine Zeitersparnis,
- optional Flavor: der Tages-Lieferant bekommt einen sichtbaren Gruß im Lager (Feuer brennt
  heller, Bewohner-Blase) — kostenlos, aber Bindung.

**Loop-Skizze.** Login → Offline-Report → „Das Brett hat 3 neue Wünsche" → liefern aus der Bank
(1 Klick je Auftrag, wenn Material da ist) → Bau tickt schneller / Tokens. Wer das Material
nicht hat, hat ein TAGESZIEL fürs normale Spielen. Auswahl deterministisch pro Tag geseedet und
aus dem Band des Spielers gezogen (Level-gewichtet, Muster Daily-Quests-Pool).

**Anbindung an Bestehendes:** Die Daily-Quest-Engine kann fast alles davon (Tages-Seed, Pool,
Schwierigkeits-Streuung, Claim-Flow) — der Unterschied ist nur, dass `gather_items` beim
Abschluss **abgeben statt besitzen** heißen muss (Konsum-Semantik prüfen/ergänzen!). Die
Wunschlisten ziehen gezielt die Bank-Druck-Materialien aus `encampment-balance.md` §0
(`raw_hide`, `crude_bone`, `coal`, Niedrig-Logs, `stolen_coinpurse`, Essenzen) — die Senke, die
der Sim-Report vermisst hat, entsteht hier täglich statt einmalig.

**Aufwand: M.** Kein neues Gebäude nötig (ans Zentralhaus/Karte andocken), Engine-Wiederverwendung
hoch; Arbeit steckt in Konsum-Semantik, Pool-Kuration je Band, Token-Budget-Guard, UI-Panel im
New-Haven-Screen. Save-Bump nötig (Brett-State).

**Risiken.**
- *Kannibalisiert Daily-Quests:* klare Trennung — Dailies = TUN (töte/crafte/erreiche), Brett =
  GEBEN (liefere aus Bestand). Belohnungshöhe unter den Dailies halten.
- *„Steuer-Gefühl":* wenn die Wünsche zu teuer sind, fühlt sich das Brett wie Abgabe an.
  Richtwert: 10–20 min Farmzeit-Gegenwert je Auftrag, Belohnung sichtbar sofort.
- *Rundungs-Exploits:* Belohnung nie in Gold auszahlen (sonst Arbitrage gegen Verkaufspreise
  rechnen müssen); Tokens + Zeit sind arbitragefrei.

---

## 3. Bautrupp-Dauerbeschäftigung (der Trupp darf nie arbeitslos wirken)

Drei Teilstücke, getrennt bewertbar:

**3a. Bau-Warteschlange (QoL, zuerst!).** Heute endet ein Bau und der Trupp steht, bis der
Spieler wiederkommt — verschenkte Offline-Zeit und der Hauptgrund für „passiv". Eine Queue von
2–3 vorausbezahlten Aufträgen (Gold+Material werden beim EINREIHEN abgezogen — R5-konform,
keine Preisspekulation) lässt den Trupp durcharbeiten. **Aufwand: S** (Job-Array statt
Einzel-Job, UI-Liste). *Risiko:* minimal; einzig die alte Kommandozelt-Diskussion beachten —
die Queue ist hier BAUTRUPP-Queue, nicht Action-Queue, kollidiert also nicht mit dem
K1-Entscheid aus `encampment-balance.md`.

**3b. Zier- und Kleinaufträge (Mini-Bauten zwischen den Stufen).** Palisaden-Segmente, Laternen
(leuchten im Nacht-Zyklus!), Banner, Brunnen, Gemüsebeete — kleine Bauaufträge (10 min–2 h) mit
Gold-+Material-+Bauteil-Kosten, frei auf der Karte platzierbar wie Gebäude. Reine Senke + reines
Kosmetik-Ergebnis, null Boosts → R1/R3 trivial bestanden. Das nutzt die freie Platzierung und
den Tag/Nacht-Zyklus, die schon gebaut sind, und gibt dem Lager Spieler-Identität
(Screenshot-Futter für die Community!). **Aufwand: M** (Content-Katalog Zierobjekte,
Platzierungs-Typ „Dekor", Chef-Assets in Tag/Nacht-Fassung).

**3c. Reparaturen/Verfall: NICHT empfohlen.** Verfall wäre eine Zwangs-Steuer und bestraft
genau die 1×/Tag-Zielgruppe, die wir binden wollen — Idle-Spieler hassen Rückschritt beim
Wegsein mehr, als sie Aufgaben lieben. Wenn „Instandhaltung" als Fantasy gewünscht ist, dann als
FREIWILLIGER Brett-Auftrag („Palisade ausbessern": Material liefern → Helfer-Stunden), nie als
Malus bei Unterlassung.

**Anbindung:** Bautrupp-Engine (3a/3b), Bauteil-System aus Task #366 (3b konsumiert Balken/
Verstrebungen → stärkt die Holzfällen-Identität weiter), Karten-Rendering (3b).

---

## 4. Karawane / fahrender Händler (periodischer Besucher)

**Kernidee.** Alle 3–4 Tage (deterministisch aus dem Kalender geseedet, Muster
Wochentags-Segen) steht eine Karawane vor dem Händlerposten — 24 h lang, dann zieht sie weiter.
Rotierendes Sortiment als reine **Kauf-Senke**: Bulk-Materialpakete zum AUFPREIS gegen den
Normalshop (Bequemlichkeit kostet), Zier-Baupläne für 3b, selten ein Chase-Angebot (z. B. ein
Suffix-Reroll-Gegenstand o. Ä. aus BESTEHENDEN Systemen). Kein Ankauf über Marktwert, kein
exklusives Power-Item — die Karawane verkauft nichts, was es nicht schon gibt, nur ANDERS
gebündelt und zeitlich knapp.

**Loop-Skizze.** „Die Karawane ist da!"-Badge am Sidebar-Eintrag → Spieler öffnet New Haven,
schaut das Sortiment durch, kauft oder lässt es → FOMO-light (nächster Besuch in 3–4 Tagen,
Rotation aus großem Pool). Händlerposten-Stufe verbessert den Besuch (I: 4 Angebote, III: 6
Angebote + 1 Rare-Slot) — das gibt dem heute „situativen" Gebäude (Sim-Report §2, Platz 11)
einen echten Grund.

**Anbindung an Bestehendes:** Shop-/Preispfad (`effectiveSellPrice`-Symmetrie bleibt unberührt,
Karawane nutzt Kaufpfad), Kalender-Seed-Muster (`WEEKDAY_BLESSING`), Händlerposten-Stufen,
Token-Shop (Karawane könnte 1–2 Angebote in Tokens auspreisen — Senke für die Token-Quelle aus
§1/§2!).

**Aufwand: M.** Sortiment-Pool (Content), Besuchs-Kalender (Engine, klein), Karawanen-Panel
(UI), 1 Asset (Karawagen, Tag/Nacht). Save-Bump nur, falls „gekauft diese Rotation" persistiert
wird (nötig für Limits → ja, Bump).

**Risiken.**
- *Arbitrage:* JEDES Angebot gegen Verkaufswert rechnen (Kaufpreis ≥ 2× Sell-Wert, wie im
  Normalshop) — sonst Gold-Pumpe. Guard-Test für den Karawanen-Pool.
- *FOMO-Kipp-Punkt:* verpasste Rotation darf nie ein Unikat kosten. Alles kommt wieder; nur
  WANN ist offen. (EA-Publikum reagiert allergisch auf verpassbare Power.)
- *Leere ohne Gold-Senke-Bedarf:* Früh-Spieler haben wenig Gold übrig — Sortiment band-gewichtet
  wie das Brett.

---

## 5. Eigene Ideen

**5a. Lager-Ausbauphasen (die Lore-Leiter sichtbar machen).** Konzept-Regel 7 beschreibt sie
schon: Wachfeuer + Kate → Zeltring + Versammlungshaus → Palisade + Wegstation mit Glockenturm.
Vorschlag: die KULISSE der Karte wechselt mit der Gesamt-Ausbausumme (z. B. Phasen bei 15/30/45
gebauten Stufen). Kein einziger Zahlenwert ändert sich — aber das Lager hat plötzlich ein
LANGZEIT-Sichtziel („noch 6 Ausbauten bis zur Palisade"), und jede Phase ist ein
Screenshot-/Event-Moment. **Anbindung:** Karten-Rendering, Tag/Nacht-Fassungen; Zähler ist
trivial aus `camp`-State ableitbar (kein Save-Bump). **Aufwand: S–M** (fast nur Chef-Assets:
3 Untergrund-Fassungen ×Tag/Nacht — deckt sich mit der 0.4-Kartenplanung im Konzept!).
*Risiko:* reine Asset-Abhängigkeit; ohne Kulissen kein Feature.

**5b. Karten-Fragmente → „Flurstücke" (Kartenfläche als Sammelziel).** Die freie Platzierung
hat eine natürliche Ressource, die KEINE Ökonomie ist: Fläche. Kundschafter-Missionen (§1) und
seltene Brett-Serien (§2) zahlen Karten-Fragmente; ein voller Satz schaltet ein Flurstück frei
(Kartenrand wandert nach außen, mehr Platz für Gebäude + Dekor). Das ist das Collection-Meta,
das Pip im Fun-Review liebt, mit null Balance-Wirkung. **Aufwand: M** (Kartengrenzen-Logik,
Fragment-State + Save-Bump, UI). *Risiko:* nur sinnvoll NACH 3b/0.4-Karte — vorher ist Fläche
wertlos.

**5c. Was bewusst NICHT vorgeschlagen wird:** Gebäude-Stufe IV (das Boost-Budget aus R3 ist
ausgereizt; eine vierte Stufe könnte nur QoL geben und würde die saubere I/II/III-Leiter
verwässern), Verfall/Reparaturzwang (s. 3c), jede Form von Lager-Kampfwert (R3), ein
„Lager-Level" als neue Fortschrittswährung (R2 — die Ausbauphasen aus 5a leisten das sichtbar,
ohne Zahl).

---

## 6. Eiserne-Regeln-Check (Gesamtübersicht)

| Idee | R1 kein Hahn | R2 Währung/Timer | R3 Budget | R4 Determinismus | R5 Senke |
|---|---|---|---|---|---|
| 1 Missionen | ✅ nur Veredelung/Zeit/Tokens/Wissen | ⚠️ Tokens budgetieren; Timer-Typ WIEDERVERWENDEN | ✅ (Pet-Pause ist Malus) | ✅ Tages-Seed + Tick-Zeit | ✅ Inputs mitgeben |
| 2 Schwarzes Brett | ✅ | ⚠️ Token-Tagesdeckel | ✅ | ✅ Tages-Seed | ✅✅ DIE neue Dauersenke |
| 3a Bau-Queue | ✅ | ✅ | ✅ | ✅ | ✅ (Vorkasse) |
| 3b Zieraufträge | ✅ | ✅ | ✅ (0 Boosts) | ✅ | ✅✅ |
| 4 Karawane | ✅ (nur Kaufpfad) | ✅ | ✅ | ✅ Kalender-Seed | ✅ Gold-Senke |
| 5a Ausbauphasen | ✅ | ✅ | ✅ | ✅ | — (Sichtziel) |
| 5b Flurstücke | ✅ | ⚠️ Fragmente sind SAMMELSTÜCKE, keine Währung (nicht handelbar, kein Shop!) | ✅ | ✅ | — |

---

## 7. Priorisierung (Impact × Aufwand)

| # | Idee | Täglicher Öffnungs-Grund | Wochen-Ziel | Aufwand | Priorität |
|---|---|---|---|---|---|
| 1 | **3a Bau-Warteschlange** | indirekt (Trupp arbeitet immer) | — | **S** | **P1 — sofort** |
| 2 | **2 Schwarzes Brett** | ✅✅ (DER Tagesanker) | Token-Sparziele | **M** | **P1** |
| 3 | 4 Karawane | ✅ (alle 3–4 Tage) | Rotations-Chase | M | P2 |
| 4 | 3b Zieraufträge | teils (Bau-Ideen) | ✅ (Lager-Identität) | M | P2 |
| 5 | 5a Ausbauphasen | — | ✅✅ (Sichtziel) | S–M (Asset-gated) | P2 |
| 6 | **1 Rekruten-Missionen** | ✅✅ (zweite Trupp-Spur) | ✅✅ (2 Gebäude + Missions-Meta) | **L** | **P3 — das nächste Headline** |
| 7 | 5b Flurstücke | — | ✅ (Collection) | M | P3 (nach Karte + Missionen) |

**Die Logik:** Erst den Trupp nie mehr arbeitslos machen (3a, billig), dann den Tagesanker
setzen (2), dann die Wochen-Rhythmen (4/5a), und die Missionen als das nächste große
Screenshot-Feature aufsparen, wenn die 0.4-Karte steht — Rekruten, die sichtbar über eine echte
Dorfkarte laufen, sind doppelt so viel wert wie Rekruten in einer Liste.

---

## 8. Empfehlung

**Nächster Schritt für 0.3.x (klein, schnell):**
**Bau-Warteschlange (3a) + Schwarzes Brett (2) als EIN Paket „New Haven lebt".**
Beides zusammen ist eine überschaubare Welle (S + M, hohe Engine-Wiederverwendung:
Bautrupp-Jobs + Daily-Quest-Engine), braucht einen Save-Bump statt zwei, keine neuen Gebäude
und fast keine Chef-Assets (1 Brett-Icon/Hotspot). Ergebnis: der Trupp arbeitet durch, und es
gibt ab Tag 1 einen täglichen Grund, den Screen zu ÖFFNEN — plus die Dauersenke, die der
Sim-Report angemahnt hat. Vorab zu pinnen: Token-Tagesbudget-Guard (Brett ≤ Daily-Quests)
und die Konsum-Semantik der Lieferungen.

**0.4-Bogen (mit der „Die Stämme"-Karte):** Karawane (4) + Zieraufträge (3b) + Ausbauphasen
(5a). Alle drei sind Karten-Features im Geist des Chef-Zielbilds: ein Besucher, der sichtbar
vorfährt; Dekor, das der Spieler selbst setzt; eine Kulisse, die mit dem Fortschritt wächst.
Asset-Bedarf (Karawagen, Zierobjekte, 3 Kulissen-Phasen je ×Tag/Nacht) früh beim Chef anmelden.

**0.5-Bogen (Headline):** Gesindehaus + Zwinger mit Rekruten-/Companion-Missionen (1), darauf
aufbauend Karten-Fragmente/Flurstücke (5b) als Missions-Meta. Das ist der „Phase 2"-Moment aus
dem Konzept — groß genug für eine eigene Sichtbarkeitsrunde, und bis dahin haben Brett +
Karawane die Token-/Senken-Infrastruktur bereits etabliert und balanciert.

**Vorab nötige Chef-Entscheide (wenn 0.3.x startet):**
1. Token-Budget: dürfen Brett-Aufträge Quest-Tokens zahlen (empfohlen: ja, gedeckelt ≤ 50 %
   der Daily-Quest-Ausschüttung) — oder nur Helfer-Stunden?
2. Queue-Tiefe der Bau-Warteschlange (empfohlen: 2 Slots, Schreibzelt III könnte auf 3 heben —
   das gäbe dem Schreibzelt neben dem Tempo einen zweiten ehrlichen Verkaufspunkt).
3. Brett-Belohnung „Helfer-Stunden": Deckel pro Tag (empfohlen: max. 2 h/Tag, sonst frisst es
   die 24–48-h-Endstufen-Dramaturgie aus R4).
