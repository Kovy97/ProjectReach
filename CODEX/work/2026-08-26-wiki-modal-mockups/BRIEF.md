# Asset-Brief — Wiki-Modal: fünf Redesign-Mockups

<!-- codex:2026-08-26T14:32:00+02:00 -->

## Teil A – Auftrag

- Auftraggeber: Chef, direkt.
- Ziel: Fünf klar unterschiedliche visuelle Konzepte für das Grim-Reach-Item-Wiki-Modal. Nach
  Auswahl wird das bevorzugte Konzept separat in HTML/CSS angenähert.
- Referenz: `reference-current-wiki-modal.png` — Inhaltsumfang und bestehende Ashen-Iron-
  Art-Direction bewahren, Layout und Informationshierarchie neu denken.
- Konzeptphase: keine Renderer-, React-, CSS-, i18n- oder Engine-Änderung.

## Teil B – Gemeinsame Invarianten

- Desktop-Modal im breiten 16:9-Format, vollständig sichtbar, keine Browser- oder Gerätechrome.
- Gravewood-&-Bronze/Ashen-Iron: dunkles Holz, rußiges Eisen, Pergamentbraun, gealterte Bronze,
  warmes Gold als Akzent; gemalte hochwertige Fantasy-UI, keine Neon- oder Mobile-Optik.
- Inhalte müssen sofort hierarchisch lesbar sein: Itembild, Name, Typ/Rarity, Wert, Stapelbarkeit,
  Quelle und Verwendungen.
- Beispielinhalt bleibt Blacksteel Bar. Die Verwendungsmenge muss als große Liste oder Graph
  skalieren können, ohne eine unruhige Kartenwand zu erzeugen.
- Große lesbare Cinzel-artige Überschriften, klare Abstände, starke aktive Zustände, zugänglicher
  Kontrast. Dekor sitzt an Ecken/Kanten, nicht in dehnbaren Flächen.

## Teil C – Fünf Richtungen

1. **Codex Ledger** — ruhiges Buch-/Registerlayout mit dominanter Itemakte und kompakter
   zweispaltiger Rezeptliste.
2. **Forge Flow** — Quelle → Item → Verwendungen als übersichtlicher Herstellungsgraph.
3. **Archiv-Schubladen** — feste Item-Seitenleiste, filterbare Verwendungsgruppen und kompakte
   aufklappbare Zeilen.
4. **Blacksteel Index** — informationsstarke Tabelle mit Sticky-Header, klaren Spalten und
   schneller Vergleichbarkeit.
5. **Relic Showcase** — großzügiger Item-Hero oben, Quelle als Herkunftsband und Verwendungen als
   visuelle Galerie mit Detailleiste.

## Teil D – Abnahme

- Chef wählt eine Richtung oder kombiniert ausdrücklich Elemente mehrerer Varianten.
- Erst nach dieser Entscheidung folgt ein separater HTML/CSS-Umsetzungsauftrag.
