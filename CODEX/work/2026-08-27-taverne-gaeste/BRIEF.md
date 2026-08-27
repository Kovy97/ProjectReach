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
_(füllt Mira)_

# Teil C – QA-Protokoll (Mira)
_(füllt Mira)_

# Teil D – Übergabe (Mira)
_(füllt Mira)_
