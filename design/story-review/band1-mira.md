# Story-Review Band 1 — Mira Aschfall (Kapitel 1–4)

*Persona-Simulationsbericht zur Aschechronik-Hauptquest. Quelle der Wahrheit: `packages/content/src/index.ts` (chronicle_01–04), gegengeprüft gegen `design/lore/aschechronik-spec.md` und `design/lore/weltlore-grim-reach.md`.*

---

## Persona-Steckbrief

- **Name:** Mira Aschfall, die Erzählliebhaberin
- **Archetyp:** Story/Atmosphäre über alles
- **Spielstil:** liest jeden `loreText` laut mit; verzeiht etwas Grind, wenn die Welt lebt; hasst leere Plot-Hülsen und Kitsch
- **Gear-Fokus:** egal — Hauptsache die Reise fühlt sich bedeutsam an
- **Wer ich bin:** Eine Spielerin, die ein Idle-RPG nur weiterspielt, wenn die Geschichte sie zieht. Ich claime kein Kapitel, ohne die Chronik-Seite gelesen zu haben.
- **Bewertete Kapitel:** chronicle_01–04 (Glutfeste/Weiden → Grenzlande, L1–~30)
- **Session-Stats:**
  - **2 Headless-Checks** — (1) deterministische Content-Analyse (`review-a1-content.mjs`, tsx über den Live-Katalog); (2) Playwright-Laufzeit-Drive auf **Port 5261** (`review-a1-drive.mjs`), der alle vier echten Kapitel über den Story-Tab durchspielt (Kill-/Gather-Stand via `window.__hfDebug`, Claim, Gate-Öffnung).
  - **Gefundene Bugs/Blocker: 0.** Keine Page-Errors. Alle IDs existieren, alle Ziel-Monster in der richtigen Zone, Gate-Reihenfolge exakt (chronicle_03 → Grenzlande; chronicle_04 → Dungeon Goblin-Kriegsbande), Claim führt jeweils sauber ins Folgekapitel.
  - **1 Balance-Notiz (kein Bug):** der Sprung von 5 Kills (Kap. 3) auf 50 Kills (Kap. 4) ist die erste spürbare Grind-Kante.

---

## Pro Kapitel

### chronicle_01 — Die erste Seite / The First Page
- Spaß: 6/10
- Einfallsreichtum: 7/10
- Machbarkeit: 10/10
- Notiz: Der Rahmen trägt alles — „die Chronik trägt heute deinen Namen", der Namenlose am Tor der Glutfeste, im Regen, ohne Gepäck. Dass die Götter nur als *Glaube* eingeführt werden („ob sie zuhören, verzeichne ich nicht") ist elegante Zurückhaltung, kein Kitsch. Als Aufgabe ist „sammle 25 beliebige Items" allerdings die weichste Onboarding-Hülle, die es gibt: Ich *tue* nichts, was der Würde der Prosa entspricht. Die Seite lebt vom Wächter, nicht vom Spiel.
- Bug/Blocker: keiner. Content-Check: `gather_items` count 25, kein Gate, kein `requires`. Drive: Zähler 0/25 → 25/25 → Claim → springt korrekt auf „First Blood".

### chronicle_02 — Erstes Blut / First Blood
- Spaß: 7/10
- Einfallsreichtum: 6/10
- Machbarkeit: 10/10
- Notiz: Endlich Kampf, plus ein Mini-Boss (Rasender Bulle, Enrage unter 40 % HP). Die Zeile „deine Hand wurde ruhiger statt schneller" ist ein feiner Charakter-Beat, und dass der Bulle *keine* Ausgeburt ist, nur „ein Tier, dem zu lange niemand widersprach", verweigert bewusst das Verdorbenes-Biest-Klischee. Das Ziel selbst — 15 Weidentiere + Boss — bleibt trotzdem Standard-Frühquest. Solide, kein Funke.
- Bug/Blocker: keiner. Alle Ziel-IDs (chicken/cow/boar/feral_goat + bull_boss) in Zone `pastures` (offen ab Start). Namens-Kollision mit der Nebenquest ist gelöst (die heißt jetzt „Goblin-Blut"). Drive: 15/15 + 1/1 → Claim → „The Spark in the Grain"; Grenzlande danach noch korrekt gesperrt.

### chronicle_03 — Der Funke im Korn / The Spark in the Grain
- Spaß: 7/10
- Einfallsreichtum: 8/10
- Machbarkeit: 9/10
- Notiz: Erzählerisch das stärkste der vier — hier fängt das *Buch* an, ein Krimi zu sein. „Wo ein Imp haust, ist ein Fremder vorübergegangen", und der Wächter hält beim Wort „Fremder" die Feder an: der Erzähler verrät sich selbst als Vorausdeutung, 17 Kapitel vor der Auflösung. Genau der Haken, für den ich weiterspiele. Nur: 5-mal denselben squishy L11-Imp klicken ist die dünnste Aufgabe des Bandes — der Payoff-Same rechtfertigt sie, aber knapp.
- Bug/Blocker: keiner. `the_imp` liegt in `pastures` (bewusst als frühe Dämon-Quelle ergänzt). Abschluss öffnet die Zone Grenzlande — im Drive verifiziert: Unlock-Chip „The Borderlands" erscheint, und die Zone entsperrt sich nach dem Claim tatsächlich auf der Combat-Page. Die 9 statt 10 bei Machbarkeit: reines Single-Target-Grind-Monotonie-Ding, kein Fehler.

### chronicle_04 — Die leere Mark / The Empty March
- Spaß: 6/10
- Einfallsreichtum: 8/10
- Machbarkeit: 8/10
- Notiz: Die reichste Lore des Bandes — der aufgegebene Schildwall, die Goblins nicht als Eroberer, sondern als *Erben*, die aus dem Nachlass „eine Karikatur der alten Armee" bauen, und das „geliehene" Fel-Feuer mit dem verschwiegenen Gläubiger (direkter Drazhan-Faden). Und trotzdem: Hier beginnt der Grind. 40 Kämpfer + 10 Zauberer = 50 Kills, nach den lächerlichen 5 aus Kapitel 3 fühlt sich das wie ein Ruck an. Der Text hält mich bei der Stange; ein Mechanik-Spieler ohne meine Geduld sähe hier die erste Wand.
- Bug/Blocker: keiner. Alle 10 Goblin-Varianten in `borderlands` (Gate chronicle_03, das chronicle_04 via `requires` voraussetzt → Reihenfolge stimmt exakt). Drive: 40/40 + 10/10 → Claim → „The War Banner"; Unlock-Chip „Dungeon: Die Goblin-Kriegsbande" korrekt. **Fairness-Notiz (Balance, kein Blocker):** die Zauberer-Union reicht vom L18-Schamanen bis zum L30-Hexenmeister — man kann alle 10 am L18-Schamanen farmen, also *nicht* auf L30 gegatet; das hält es fair. Trotzdem würde ein sanfterer Count (etwa 30 + 8) dem story-getakteten Spieler besser stehen.

---

## Gesamteindruck (Mira)

Der erste Band öffnet ruhig und mit einer echten Erzählstimme — der Wächter-als-Chronist ist ein Gerüst, das trägt. Kapitel 3 ist der Moment, in dem ich *angebissen* habe (der „Fremder"-Haken), Kapitel 4 liefert die reichste Welt, verlangt dafür aber zum ersten Mal Sitzfleisch. Die Kurve, die mich stört: Aufgaben-Substanz und Grind-Menge laufen dem Text hinterher. Kapitel 1–3 geben mir fast nichts zu *tun*, Kapitel 4 plötzlich viel. Mechanisch ist der Band makellos — kein toter Link, kein falsches Gate, kein leerer Kasten. Was fehlt, ist keine Reparatur, sondern Feinschliff: den Aufgaben etwas mehr Fleisch geben (statt „5× ein Mob"), und die Grind-Kante zwischen Kapitel 3 und 4 abflachen. Dann zieht mich der Band nicht nur über den Text, sondern über beides.
