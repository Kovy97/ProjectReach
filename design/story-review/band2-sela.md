# Story-Review Band 2 (chronicle_05–08) — Sela Graufeder

**Reviewerin:** Sela Graufeder, die Gelegenheitsspielerin (Simulations-Persona)
**Revier:** Aschechronik Kapitel 5–8 (Warband-Dungeon-Boss → Aschfelder → Aschtyrann → Schwarzdornwald)
**Quellen:** `packages/content/src/index.ts` (chronicle_05…08 + Monster/Dungeon/Zonen-Gates), `design/lore/aschechronik-spec.md`
**Methode:** Content gelesen + Persona-Urteil; Klarheit & Machbarkeit live gegengeprüft headless (eigener Port 5263, `story-tab-check.mjs`-Muster + `__hfDebug`, read-only). Wegwerf-Skript: `apps/client/ui-audit/review-b1-sela.mjs`.

---

## 1. Persona-Steckbrief

Sela spielt abends **20 Minuten**. Sie will beim Öffnen sofort wissen: **„Was tu ich, wo, wie weit bin ich?"** Geringe Grind-Toleranz, verliert das Interesse bei Verwirrung oder Wänden. Beim Gear nimmt sie, was fällt, und rüstet ungern um. Dichte, literarische Erzähltexte liest sie höchstens quer — ihr Orientierungsanker ist die **Ziel-Zeile mit dem 📍-Pin und der Fortschrittszähler**, nicht die Wächter-Prosa.

Für sie zählt an einem Kapitel: Sagt mir das Spiel klipp und klar, wo der Gegner steht? Ist der Boss in einer Sitzung machbar, ohne dass ich mein halbes Inventar tausche? Und fühlt sich der Weg dahin nach Fortschritt an statt nach Leerlauf?

---

## 2. Bewertung pro Kapitel

### chronicle_05 — Das Kriegsbanner / The War Banner
- Spaß: 6/10
- Einfallsreichtum: 6/10
- Machbarkeit: 5/10
- Notiz: Der Zahltag der Grenzland-Story — mein erster echter Dungeon-Boss, und der Zähler „Chapter 5 of 21" sagt mir sauber, wo ich stehe. Aber die große Ziel-Zeile schickt mich mit „📍 The Borderlands" ins offene Gebiet, wo der Kriegshäuptling gar nicht auftaucht: Er lebt nur im Dungeon Goblin-Kriegsbande. Ich renne erst durchs falsche Feld, bevor ich merke, dass ich in den Dungeon muss. Und ist er endlich fällig, ist er ein L60-Enrage-Boss nach vier Wellen — verliere ich, darf ich den ganzen Dungeon neu laufen. Für 20-Minuten-Abende genau die Sorte Wand plus Umweg, die mich raustreibt.
- Bug/Blocker: **Orientierungs-Falle (Klarheit).** Die WO-Zeile der Story-Bühne wird aus `monster.zone` gebildet (`objectiveLocation` in `pages/QuestsPage.tsx`) und ignoriert `dungeonOnly`. `goblin_warchief` hat `zone:"borderlands"` + `dungeonOnly:true`, also zeigt die Bühne „📍 The Borderlands", obwohl der Boss ausschließlich im Dungeon killbar ist. Verschärft: Die `description` („…in the Goblin Warband dungeon") wird auf der Bühne **nicht** gerendert — nur Titel, loreText, Monstername + WO-Pin. Das Wort „Dungeon" fehlt in jedem sichtbaren Handlungshinweis; „warband" steht nur als Prosa-Flavor im loreText. Live bestätigt (Port 5263): `objs[0].where = "📍 The Borderlands"`. Mildernd: Der Unlock-Chip auf Kap.4 nannte „The Goblin Warband (Dungeon)" — ein aufmerksamer Spieler verknüpft das, eine Casual eher nicht. Fix-Richtung: `objectiveLocation` soll für `dungeonOnly`-Ziele den Dungeon-Namen statt der Trägerzone zeigen.

### chronicle_06 — Die Aschelektion / The Ash Lesson
- Spaß: 5/10
- Einfallsreichtum: 8/10
- Machbarkeit: 9/10
- Notiz: Erzählerisch der Höhepunkt des Bandes — die unbegrabenen Feldarbeiter, die weiterbeten, und die Ernte, die nie bei der Kornmutter ankam: das ist ein Bild, das hängen bleibt, selbst wenn ich nur quer lese. Spielerisch ist es leider Füllmaterial direkt nach einem Boss: 30 Viecher + 10 Irrlichter in einem L30–45-Gebiet, das nach dem L55-Dungeon trivial ist. Nach dem Häuptling wieder Kleinvieh kloppen fühlt sich an wie einen Schritt zurück statt vorwärts. WO-Zeile stimmt („The Ashfields"), Ziel klar.
- Bug/Blocker: keiner. Anmerkung: spürbare Level-Band-Rückstufung (Kap.5 L55–60 → Kap.6 L30–45) — kein Bug, aber es nimmt dem Fortschritt kurz die Luft.

### chronicle_07 — Der König des Aas / The Carrion King
- Spaß: 7/10
- Einfallsreichtum: 7/10
- Machbarkeit: 9/10
- Notiz: Mein Lieblingskapitel des Bandes zum Feierabend: ein einzelner Boss, klarer Auftrag, schneller Sieg. Die WO-Zeile zeigt korrekt „The Ashfields", der Aschtyrann steht als Welt-Boss im offenen Gebiet (L45), also für meine inzwischen L55+-Figur gut machbar und beliebig oft retrybar — kein Dungeon-Neulauf-Risiko. „Wer frisst, regiert" und „Weilen sind, was wir verteidigen" gibt der schnellen Kill-Aufgabe genug Stimmung, ohne mich zum Lesen zu zwingen.
- Bug/Blocker: keiner.

### chronicle_08 — Dornen / Thorns
- Spaß: 6/10
- Einfallsreichtum: 7/10
- Machbarkeit: 7/10
- Notiz: „Der Alte Baumriese ist weniger ein Baum als ein Beschluss" — schönes Bild, und der Gesang aus den Hügelgräbern macht neugierig aufs nächste Kapitel. In der Praxis: 30 Wurzlinge lichten, dann der Baumriese als Welt-Boss. Beide WO-Zeilen korrekt („The Blackthorn Wood"). Der Baumriese (L62) hat Regeneration, hohe Rüstung und resistiert Blutung/Gift — mit meinem Mitnahme-Gear kann sich das ziehen, wenn mein Schaden zu niedrig ist, um seine Heilung zu überbieten. Er steht aber im offenen Gebiet, also kann ich frei nachlegen, ohne einen Dungeon neu zu rennen. Grenzwertig, aber fair.
- Bug/Blocker: keiner.

---

## 3. Fazit aus Sela-Sicht

Der Band **erzählt stark** (Kap.6 ist der Ideen-Höhepunkt) und ist bis auf eine Stelle sauber orientiert — die Fortschrittsanzeige „Chapter N of 21" und die Unlock-Chips sind für eine Casual genau richtig. **Die eine ernste Baustelle ist Kapitel 5:** Die Story-Bühne lotst mich mit „📍 The Borderlands" an den falschen Ort, während der Boss nur im Dungeon lebt und das Wort „Dungeon" in keinem sichtbaren Handlungshinweis auftaucht. Das ist die Sorte Verwirrung, die mich an einem 20-Minuten-Abend aussteigen lässt. Machbarkeits-Wand ist ebenfalls Kap.5 (L60-Enrage-Boss + Dungeon-Neulauf bei Wipe) — für eine Spielerin, die ungern umrüstet, der härteste Punkt des Bandes. Kap.6–8 sind klar und machbar; Kap.6 fühlt sich nur wie ein Rückschritt an, weil das Level-Band nach dem Dungeon absackt.

**Reihenfolge der Dringlichkeit:** (1) WO-Zeile für `dungeonOnly`-Ziele auf den Dungeon-Namen umstellen (Kap.5-Klarheit, betrifft alle Boss-in-Dungeon-Kapitel), (2) Kap.5-Boss-Schwierigkeit/Dungeon-Neulauf für Casuals im Auge behalten.
