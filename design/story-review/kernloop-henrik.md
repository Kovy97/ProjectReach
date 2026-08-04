# Kernloop-Review — Henrik Stetig, der Idle-Alltagsspieler

*Persona-Simulationsbericht zum KERN-LOOP von Grim Reach (Skilling → Verarbeitung → Economy → Offline-Rhythmus). Erster Urteils-Sweep, der nicht die Chronik, sondern den Alltag bewertet. Quellen der Wahrheit: echte Engine-/Persistence-Pfade (`serialize` → `deserialize` = identischer Offline-Catch-up wie im Spiel) auf dem midgame-/endgame-Fixture, plus Playwright-Lauf gegen den Client (Port 5282).*

---

## Persona-Steckbrief

- **Name:** Henrik Stetig, der Idle-Alltagsspieler
- **Archetyp:** Brot-und-Butter-Spieler eines Idle-RPGs — 90 % der Spielzeit wird NICHT gekämpft
- **Rhythmus:** morgens 10 Minuten (ernten, Dailies ziehen, Aktion stellen), tagsüber ~9 h offline, abends 30 Minuten (verarbeiten, verkaufen, Nacht-Aktion stellen), nachts ~9 h offline
- **Wer ich bin:** Der Spieler, der entscheidet, ob das Spiel eine Woche überlebt. Ich will jeden Morgen eine Zahl sehen, die sich lohnt, und jeden Abend eine Entscheidung treffen, die morgen zählt.
- **Session-Stats:**
  - **2 Headless-Engine-Sims** (Wegwerf-vitest in `packages/persistence`): 4 komplette Alltags-Zyklen zeitgerafft auf dem midgame-Fixture (8 Offline-Fenster à 8 h über die ECHTE `deserialize`-Kette, Skill-Rotation Mining→Fishing→Woodcutting→Foraging→Thieving, Abend-Verarbeitung, Kampf-Dosis-Test Chronik 1–2) + Follow-up (Farming-Zyklen, Saat-Ökonomie, 16 h/48 h-Cap-Verhalten, Endgame-Probe).
  - **1 Playwright-Lauf** (Port 5282, DE-Locale): echter Menü-Load eines 9 h alten Saves → Welcome-Back-Bühne → Morgen-Rundgang (Skill-Seite, Beete, Bank, Laden, Aufgaben) → Gegenprobe endgame-Save 30 h alt ohne aktive Aktion. **Keine Page-Errors.**
  - **Messwerte-Kern:** 8 h Mining = +161.348 XP / +31 Level / 11.040 Erze; 8 h Thieving = **+156.515 Gold** direkt; 8 h Foraging = 12.222 Items inkl. ~1.600 Samen; Erz-Verkauf eines Tages = ~45.000 Gold; Chronik-Kapitel 2 (Kampf) = ~2 Minuten; lebenslange Shop-Sinks (Auto-Eat 2+3, Slots, erste Bank-Pakete) < 40.000 Gold.
  - **Gefundene Bugs/Blocker: 0 harte, 4 weiche** (s. Dimensionen).

---

## Bewertungen

### 1. Skilling-Loop-Spaß (sammeln → verarbeiten → craften) — **8/10**

Das Sammeln trägt: Jede Skill-Seite ist ein sauberes Entscheidungs-Brett (XP, XP/h, Dauer, Ertrag/h, Meisterschafts-Balken, Abbau-Zähler pro Ader), der nächste Tier steht sichtbar mit Zahlen daneben, und die Topbar beantwortet permanent die Alltagsfrage („21.118 XP/h · Level 56 in 44 min"). Die Verarbeitung hat dagegen Planungs-Reibung, die Henrik erst am Abend merkt: ein 8-h-Grabstahl-Tag lässt sich NICHT schmelzen, weil `smelt_gravesteel` zusätzlich Kohle will — und ein Offline-Fenster kann nur EINE Aktion fahren. Der Abend-Loop lebt also von Zwei-Tages-Planung (Kohle-Tag → Erz-Tag → Schmelz-Abend), was Tiefe gibt, aber nirgends angekündigt wird.

- **Bug/Blocker:** keiner. Reibung: Rezept-Karten verraten nicht, dass der morgige Schmelz-Abend heute einen Kohle-Tag braucht.

### 2. Economy-Balance — **4/10**

Hier kippt der Loop. Diebeskunst druckt im Midgame **~156.000 Gold pro 8-h-Fenster** — passiv, ohne Klick —, während das gesamte lebenslange Kauf-Universum (Auto-Eat 2: 8.000, Auto-Eat 3: 25.000, Inventar-Slots ab 60, Bank-Paket 5.000) an einem einzigen Tag abbezahlt ist; am Ende von Tag 3 saß Henrik auf 209.000 Gold ohne ein einziges Kaufziel. Monster geben (bewusst) kein Gold und Sammeln erzeugt Gold nur über manuelles Verkaufen (~45.000/Tag für einen Erz-Haul) — Diebeskunst dominiert damit strikt jede andere Gold-Quelle und macht den Verkaufs-Loop wirtschaftlich irrelevant. Gold-Dürre gibt es nirgends; Gold-Stau ab Tag 2 überall. Der Token-Shop (Dailies) ist dagegen sauber austariert (Tages-Ertrag ≈ ein 16-Token-Angebot) — er zeigt, wie die Gold-Seite aussehen müsste.

- **Bug/Blocker:** kein Bug — ein Balance-Loch. Thieving-Gold/h vs. Sink-Leiter ist um etwa eine Größenordnung verschoben.

### 3. Offline-/Welcome-Back-Gefühl — **7/10**

Die Bühne ist der beste Moment des Tages: Citadel-Rahmen, „Abwesend: 8h 0m", Stern-Medaillon, und das **„+31 LVL"**-Abzeichen neben Bergbau ist genau der Dopamin-Schlag, für den Henrik morgens das Spiel öffnet. Drei Dinge trüben ihn: (a) das **8-h-Cap ist stumm** — nach 9, 16 oder 48 h Abwesenheit steht identisch „8h 0m" da, Henrik verliert real ~2 h Progression pro Tag und erfährt es nie; (b) Polish-Fehler in der Skill-Zeile: „BERGB…" wird abgeschnitten und „+161348 XP" kommt ohne Tausenderpunkt daher, direkt unter dem korrekt formatierten „+161.348" des Medaillons (`OfflinePopup.tsx`, Skill-Zeile ohne `formatNum`); (c) wer ohne aktive Aktion zurückkehrt (Endgame-Gegenprobe, 30 h weg), bekommt **gar nichts** — kein Popup, nur ein stilles „Untätig" in der Topbar. Der wichtigste Screen des Spiels bestraft ausgerechnet den Fehler, den er verhindern soll, mit Schweigen.

- **Bug/Blocker (weich):** fehlendes `formatNum` + Namens-Truncation in der Skill-Zeile; stummes Cap; kein „Leer zurückgekehrt"-Hinweis. Ein mitten im Fenster gestoppter Skilling-Job (Material alle/Inventar voll) steht zwar danach als „⚠ Gestoppt" in der Topbar, die Bühne selbst verschweigt ihn aber — die kleine Zahl wirkt dann grundlos enttäuschend.

### 4. Progressions-Sog (lockt immer ein nächstes Ziel?) — **8/10**

Im Midgame zieht es massiv: Jedes 8-h-Fenster bringt 20–30 Level im rotierten Skill, jede Rotation schaltet sichtbar neue Adern/Gewässer/Bäume frei (Mithril „Stufe 35" steht mit Zahlen direkt neben der laufenden Aktion), Meisterschaft klettert pro Tag um ~50 Stufen pro Aktion, und die XP/h-Kurve explodiert mit jedem Tier (17k/h auf L24 → 111k/h auf L55 → 1,19M/h auf L95) — Aufholen fühlt sich immer schneller an, die 99er bleiben trotzdem Wochen-Ziele (13M XP/Skill). Zwei Löcher: **Farming koppelt sich ab** (bewusst 15 % XP-Rate — aber 4 Beete liefern pro Tag ~700 Farming-XP neben 161.000 Mining-XP, das Level friert gefühlt ein und die Ernte ist wertlos), und im Endgame **verpufft Über-XP kommentarlos** (8 h Godiron = 9,5M XP ins Leere; der Haul von 1,1M Gold trifft dann auf die leere Sink-Landschaft aus Dimension 2). Der Sammel-Sog bleibt: 216/530 Erfolge, 7/21 Pets, Master-Capes.

- **Bug/Blocker:** keiner.

### 5. Skiller-Kampf-Verzahnung (Dosis) — **6/10**

Das Prinzip (Kampf ist unvermeidbar, Design-Gesetz) steht hier nicht zur Debatte — die Dosis ist im Chronik-Pfad gut gesetzt: Kapitel 1 erfüllt sich aus Henriks Sammel-Zählern von selbst, Kapitel 2 (15 Weidetiere + Bulle) kostete den Fixture-Charakter **~2 Minuten** ohne Tod, und die Kill-Zahlen späterer Kapitel (30–40 + Boss) bleiben Abend-Häppchen, solange das Level passt. Zwei Dosis-Probleme: Erstens ist das **Daily-Brett Skiller-feindlich** — der Pool ist ~24 Kill / 20 Craft / 6 Gather, am Sim-Tag waren 4 von 6 Dailies Kampf/Kampf-nah; Henriks Token-Einkommen (die einzige gut designte Währung!) hängt damit an täglicher Kampfpflicht statt an gelegentlichen Kampf-Abenden. Zweitens sind ganze Verarbeitungs-Skills (Leder: 15 monster-exklusive Inputs, dazu Runen-/Juwelen-Essenzen, Fleisch-Küche) dauerhaft an Kill-Nachschub gekettet — gewollt, aber in Summe mit den Dailies wird aus „Kampf würzt den Alltag" eher „Kampf steht jeden Tag auf dem Zettel".

- **Bug/Blocker:** keiner (Design-Dosis-Befund, kein Defekt).

### 6. UI-Alltagstauglichkeit (die 10-Minuten-Session) — **8/10**

Die Morgen-Session funktioniert komplett in Budget: Welcome-Back → Einsammeln (1 Klick, Esc geht auch), Beete-Seite mit **„Alle bepflanzen"**-Sammelknopf und „Beete wachsen offline weiter"-Zeile, Aufgaben-Tab mit klarer Struktur (Story 0/21 · Aufträge 0/38 · Täglich 0/6 · Belohnungs-Shop) und „Einlösbar"-Badge, Bank mit Suche/Filtern/„+10 Slots"-Kauf, und überall die Topbar-ETA als Ein-Blick-Statusleiste. Autosave alle 15 s nimmt der kurzen Session jede Verlustangst. Abzüge: die Brenna-Ersteintritts-Touren legen sich (einmalig, aber ausgerechnet in einer kurzen Session) blockierend über jede neue Seite, und die Welcome-Back-Polish-Fehler aus Dimension 3 sitzen genau auf dem meistgesehenen Screen.

- **Bug/Blocker:** keiner hart; Playwright-Lauf ohne einen einzigen Page-Error.

---

## Überlebt Grim Reach Henriks Woche?

**Ja — die Woche gewinnt das Spiel souverän.** Die Rotation aus „jede Nacht explodiert ein anderer Skill um 25 Level" plus die inszenierte Welcome-Back-Bühne ist exakt das Ritual, für das Henrik Idle-Spiele spielt, und die 10-Minuten-Session ist ergonomisch besser gelöst als bei den meisten Genre-Vorbildern. Gefährdet ist Woche zwei: Sobald Henrik merkt, dass Gold nichts mehr kauft (Tag 2–3), Farming nichts beiträgt und das Daily-Brett ihn täglich in den Kampf schickt, verliert der Abend seine Entscheidungen — dann trägt nur noch die XP-Kurve. Die Fixes dafür sind klein und liegen fast alle in Content-/Balance-Zahlen, nicht in Systemen.

## Priorisierte Empfehlungen

1. **Thieving-Gold auf die Sink-Leiter eichen** (balance-designer): Gold/h von `loot_market_stall`-artigen Aktionen um Faktor ~4–6 senken ODER die Sink-Leiter strecken (Auto-Eat-/Werkzeug-/Komfort-Stufen im 50k–500k-Band, Bank-Pakete sind als einziger Skalierer zu einsam). Ziel-Metrik: das nächste Kaufziel sollte im Midgame 2–4 Spieltage entfernt sein, nicht 2 Stunden.
2. **Offline-Cap ehrlich machen** (ui-dev, 1 Zeile + 1 String): Welcome-Back-Zeile „Abwesend: 8h 0m — Maximum erreicht (du warst 16h 12m weg)" sobald `now − savedAt > MAX_OFFLINE_MS`. Die echte Abwesenheit ist dem Client bekannt; nur die Anzeige fehlt.
3. **Welcome-Back-Polish-Dreier** (ui-dev, `OfflinePopup.tsx`): (a) `formatNum` auf die Skill-XP-Zeile, (b) Skill-Namen nicht truncaten (Zeile hat Platz), (c) `state.lastStop` in der Bühne ausweisen („Deine Schmelze stoppte nach ~40 min: keine Kohle mehr") — der Hook existiert bereits im State, es fehlt nur die Zeile.
4. **Leere Rückkehr abfedern** (ui-dev + logic-dev): Rückkehr mit >1 h Abwesenheit und NULL Ertrag (keine aktive Aktion, keine Beete) zeigt eine Mini-Karte „Nichts verdient — Aktion setzen?" mit Direktsprung zur zuletzt aktiven Fertigkeit. Der teuerste Fehlmoment des Genres kostet aktuell 0 Feedback.
5. **Daily-Draw Skiller-fair ziehen** (logic-dev, `pickDailyQuests`): pro Tag mindestens 2 Nicht-Kampf-Dailies garantieren (Pool hat genug Craft/Gather-Einträge); die dicken 3-Token-Dailies dürfen Kampf bleiben. Damit bleibt combat-is-fundamental unangetastet, aber der Skiller-Alltag verdient seine Tokens ohne tägliche Pflichtjagd.
