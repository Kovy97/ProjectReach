# Band 1 (Kap. 1–4) — Grok Eisenzahns Effizienz-Bericht

*Simulations-Spieler-Review der Aschechronik. Quellen: `packages/content/src/index.ts` (chronicle_01–04, Monster-Stats), `design/lore/aschechronik-spec.md` §1. Machbarkeit belegt aus Content-Zahlen (HP/XP/Level/Attack-Interval) + Gate-Kette; Kampf ist Ziel-wählbar (List-Modell), daher Pool-Ziele = Optimierer wählt das billigste gültige Target.*

## 1. Persona-Steckbrief

- **Name:** Grok Eisenzahn, der Effizienz-Ork
- **Archetyp:** Min-Maxer / Optimierer
- **Spielstil:** rechnet XP/h, Gold/h und Grind-Zeit aus, überspringt Erzähltext, will flüssiges Pacing ohne Leerlauf; allergisch gegen Gate-Reibung und unklare Ziele
- **Gear-Fokus:** härtestes verfügbares Tier, effizienteste Route, cherry-pickt das schwächste gültige Target eines Pool-Ziels
- **Wer ich bin:** Der Spieler, der ein Idle-Game abbricht, sobald sich der Fortschritt „klebrig" anfühlt.
- **Kapitel:** Aschechronik Band 1, Kap. 1–4 (Glutfeste/Weiden → Grenzlande)
- **Session-Stats (geschätzt, erstmaliges lineares Durchspielen, vernünftig gegeart):** ~71 Kills + 25 Gather-Items, ~30–35 min aktive Zeit für Kap. 1–4, ~4.000+ XP, Quest-Gold 1.750 (Monster selbst: 0 Gold — Einkommen nur über Loot-Verkauf). 5 Tokens. Ramp der Ziel-Mengen: 25 gather → 16 kills → 5 kills → 50 kills.

**Konvention:** Machbarkeit 10 = mühelos/perfekt gegatet; niedriger = mehr Grind oder eine Gear-Wall.

---

## 2. Bewertung pro Kapitel

### chronicle_01 — „Die erste Seite" / "The First Page"
- Spaß: 6/10
- Einfallsreichtum: 3/10
- Machbarkeit: 10/10
- Notiz: Schmerzfreier Einstieg. `gather_items: 25` zählt jedes Item (hacken/schürfen/pflücken/looten), also keine erzwungene Route — ich starte einfach meine Gather-Loop und bin in 2–3 Minuten durch. Aber es ist das generischste Ziel im ganzen Buch, null Herausforderung, und 100 Gold Belohnung sind eine Rundungsdifferenz. Als Onboarding okay, als Kapitel Luft.
- Bug/Blocker: keiner

### chronicle_02 — „Erstes Blut" / "First Blood"
- Spaß: 7/10
- Einfallsreichtum: 5/10
- Machbarkeit: 8/10
- Notiz: Erstes Blut plus benannter Mini-Boss — sauberer erster Kampf-Loop. Der 4er-Pool (Huhn 3 HP / Kuh 12 / Wildschwein 23 / Ziege 41) heißt: kein Single-Spawn-Nadelöhr, ich picke Hühner für Kill-Speed oder Ziegen für XP. Der Rasende Bulle (L15, 67 HP, Enrage <40%) ist ein netter ~10-Hit-Cap, aber für einen frischen Char der einzige Stolperstein — undergeared frisst man die Enrage-Phase. Belohnung (250 Gold + 10× gekochter Fisch) ist tatsächlich nützlich fürs Auto-Eat. Flow stimmt.
- Bug/Blocker: keiner

### chronicle_03 — „Der Funke im Korn" / "The Spark in the Grain"
- Spaß: 5/10
- Einfallsreichtum: 6/10
- Machbarkeit: 9/10
- Notiz: Nur 5× the_imp (L11, 26 HP + Ward 8) — vorbei, bevor es anfängt. Als Ward-Intro didaktisch clever (erstmals „durch einen Schild kauen"), und der Single-Target-Hunt ist mechanisch etwas eigenes. Aber 5 Kills ist das kürzeste Kapitel des Bandes und fühlt sich wie Füllmaterial zwischen dem Bull-Boss (Kap. 2) und dem Goblin-Grind (Kap. 4). Ziel klar, kein Leerlauf, aber der Sprung von hier (5) auf Kap. 4 (50) ist ein 10x — inkonsistente Kapitel-Länge, die ich als Optimierer sofort merke.
- Bug/Blocker: keiner

### chronicle_04 — „Die leere Mark" / "The Empty March"
- Spaß: 7/10
- Einfallsreichtum: 6/10
- Machbarkeit: 8/10
- Notiz: Hier startet das Spiel für mich — erster echter Grind, zwei Tiers (40 Kämpfer 15–39 HP + 10 Fel-Caster). Alles in EINER Zone (Grenzlande), kein Travel-Churn — sauberer Flow. Entscheidend fürs Pacing: der Caster-Pool ist eine Union, und da Kampf Ziel-wählbar ist, farme ich für die 10 Caster einfach den Goblin-Schamanen (L18, 24 HP) statt in den Hexenmeister (L30, 52 HP, Ward 16, Burn) zu rennen — die Union ist ein Geschenk an Min-Maxer, kein RNG-Gate. Gesamt ~15–25 min. Zwei Wermutstropfen: Monster geben 0 Gold (Gold/h nur über Loot-Verkauf), und der 5→50-Sprung aus Kap. 3 ist abrupt. Gate-Kette stimmt: Kap. 3 öffnet die Grenzlande, alle Ziel-Varianten spawnen dort offen (nicht erst im Dungeon).
- Bug/Blocker: keiner. Historische „Varianten zählen nicht"-Falle (4614 Kills = 0/10) ist über die `targets[]`-Union geschlossen; Kill-Credit über Basis-ID bestätigt. Einziger Rest-Reibungspunkt zum Gegenprüfen: falls Caster niedrige Spawn-Gewichte im Auto-Select haben, zieht sich das 10er-Sub-Ziel gegenüber den 40 Kämpfern — bei direkter Target-Wahl aber kein Problem.

---

## 3. Grok-Fazit Band 1

Sauber gegateter, dead-end-freier Einstieg mit einer Ramp, die als Zahl schön klingt (25→16→5→50), sich aber holprig anfühlt: Kap. 3 ist zu kurz (Füller), Kap. 4 springt 10x. Größter Effizienz-Pluspunkt: Pool-/Union-Ziele plus Ziel-wählbarer Kampf lassen mich immer das billigste gültige Target picken — kein RNG-Grind, keine erzwungene Gear-Wall (Schamane statt Hexenmeister). Größte Reibung für meinen Playstyle: Monster-Gold = 0 (Gold/h hängt komplett am Loot-Verkauf), und die Belohnungskurve (100/250/400/1000 Gold) hinkt der Kill-Zahl hinterher. Kein „klebriges" Kapitel, das mich zum Abbruch treibt — aber Kap. 1 und 3 sind Luft, die ein Effizienz-Spieler im Schnelldurchlauf wegklickt. Machbarkeit über den ganzen Band: hoch, einzige echte Stat-Checks sind der Bulle (undergeared) und der Hexenmeister (den ich elegant umgehe).
