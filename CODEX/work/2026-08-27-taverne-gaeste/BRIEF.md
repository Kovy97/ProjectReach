# Asset-Brief — Taverne: 19 Gäste (Idle + Gesichtskarte), Szene, Icons

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 27.08.2026 (Chef-Freigabe F1, ohne Rona).
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ausgefüllt, Teil B–D gehören Mira.
> **Prompts:** `PROMPTS.md` (Serienkerne + je Gast zwei Prompts + Szene + Icons).
> **Design-Quelle:** `design/1.2.0-alive/taverne-konzept.md` und `taverne-voelker-und-gaeste.md` (Fassung 2).

# Teil A – Auftraggeber-Briefing

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Die Taverne: Gäste, Szene, Icons |
| Zielversion | 1.2.0 (Kern des Updates) |
| Priorität | P1. Der Bau startet mit Platzhaltern; Szene zuerst, dann Gäste in Chef-Reihenfolge |
| Umfang | 19 Gäste × 2 Dateien (`tavern_<id>_idle.png` 1086 × 1448 Alpha, `tavern_<id>_face.png` 1024 × 1024 Alpha) = 38 Dateien; Szene `tavern_interior.png` 1672 × 941 deckend; `icon_tavern.png`, `building_tavern.png` |
| Haltung | ALLE Gäste in friedlicher Idle-Stellung, als stünden sie gerade in der Taverne (Krug, Becher, Werkzeug in Ruhe), Blick nach Bildschirm-rechts, keine Kampfpose, kein Glühen |
| Gesicht = Figur | Gesichtskarte und Ganzkörper sind dieselbe Person (gleiche Züge, Haare, Narben, Kopfbedeckung); erst Idle, dann Gesicht aus derselben Beschreibung |
| Völker | nur Mensch, Elf, Ork, Goblin; Profile in PROMPTS.md verbindlich (Größe, Haut, Hauer, Ohren) |
| Regeln | echtes Alpha (kein Schachbrett, kein Key), kein Text, max. ein warmer Akzent, Serienlook des Spieler-Rosters (gleiche Größe/Blickrichtung) |
| Lieferung | `CODEX/assets/taverne-gaeste-2026-08-27/fertig/` (plus `raw/`, `qa/` mit Kontaktbögen und den Platz-Koordinaten der Szene), danach HANDOFF und WORKLOG |
| Nicht anfassen | Renderer; den Einbau (WebP q92, Archiv) macht Claude |

**Reihenfolge-Vorschlag:** Szene → Halvard (Wirt) → Viktor, Billy (die beiden Beispiele des Chefs) → Rest in Listenfolge.

**Woran erkennt Claude Erfolg:** 38 + 3 Dateien mit exakten Namen, Alpha-Prüfung bestanden, Kontaktbogen zeigt 19 klar unterscheidbare Personen, Gesichtskarte und Figur je Gast eindeutig dieselbe Person, Szene mit vier lesbaren freien Plätzen und Koordinatenblatt.

# Teil B – Produktionsplan (Mira)

1. Szene im Ashen-Iron-Tageslook erzeugen und auf 1672 × 941 normieren.
2. Vier Gäste-Fußpunkte sowie Tresen, Tafel, Kamin und Tür als Pixelkoordinaten festlegen.
3. Halvard zuerst als Idle-Figur erzeugen und Alpha technisch prüfen; erst nach bestandenem Alpha-Test
   Gesichtskarte und restliche Gäste im selben Serienguss erzeugen.
4. Icons zuletzt erzeugen, Kontaktbögen und vollständige technische QA schreiben.

Die eingebaute Erzeugung lieferte beim vorgeschalteten Ork-Demo-Test durchgehend RGB statt nativem
Alpha. Deshalb wurde Schritt 3 vor weiterer Serienproduktion gestoppt. Die deckende Szene konnte
regelkonform fertiggestellt werden.

# Teil C – QA-Protokoll (Mira)

**Teilstatus:** Szene PASS, Alpha-Serie BLOCKIERT.

- `tavern_interior.png`: PNG, 1672 × 941, RGB/deckend, PASS.
- Szene enthält drei Tische, Tresen, Anschlagtafel, Kamin und Tür; keine Personen und keinen Text, PASS.
- Vier getrennte Fußpunkte und vier Objektanker dokumentiert, PASS.
- Transparenz-Pipeline: getestete Ausgaben `channels: 3`, `hasAlpha: false`; Pflichtregel nicht erfüllbar,
  daher keine Gäste- oder transparenten Icon-Dateien in `fertig/`.
- Details: `CODEX/assets/taverne-gaeste-2026-08-27/qa/QA.md`.

# Teil D – Übergabe (Mira)

**Teillieferung / kein Gesamt-GO.**

- Produktionsfertig: `CODEX/assets/taverne-gaeste-2026-08-27/fertig/tavern_interior.png`.
- QA: `qa/tavern_interior-anchors.png`, `qa/scene-coordinates.json`, `qa/QA.md`.
- Nicht geliefert: 38 Gäste-PNGs, `icon_tavern.png`, `building_tavern.png`.
- Renderer wurde nicht verändert.
- Fortsetzung erst mit verlässlich nativem Alpha oder nach ausdrücklicher Änderung der Vorgabe.
