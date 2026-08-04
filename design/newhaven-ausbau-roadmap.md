# New-Haven-Ausbau — Roadmap-Vorlage (Synthese, 2026-08-03)

*Synthese aus drei parallel erstellten Perspektiv-Docs (alle heute, alle gegen echten Katalog/Sim gerechnet):*
- `design/newhaven-ausbau-retention.md` (Tages-Loop & Beschäftigung)
- `design/newhaven-ausbau-oekonomie.md` (Senken & Langzeit-Ziele)
- `design/lore/newhaven-ausbau-erzaehlung.md` (Bedeutung & Gänsehaut)

*Erstellt von Claude als Entscheidungsvorlage für den Chef. Nichts hiervon ist beauftragt, bis der Chef Phasen/Punkte freigibt.*

## 1. Gemeinsame Diagnose (alle drei Perspektiven konvergieren)

New Haven ist heute ein **einmaliges Durchbau-Feature**: Stufe I nach ~13 Spielstunden komplett, Vollausbau = einmalige Senke von ~715k Gold + allen Bauteilen (~26 Tage Bautrupp), danach versiegen **Gold-Senke, Material-Nachfrage, Tages-Anker und erzählerische Relevanz gleichzeitig**. Material-Senken-Verhältnis heute 1:32 (14 h Beschaffung vs. 456 h Bauzeit) — es ist ein Warte-Feature.

„Bedeutender" heißt dreifach: **(1) täglicher Öffnungs-Grund, (2) dauerhafte Senke, (3) emotionales Gewicht** — New Haven führt „die andere Spalte" der Chronik (encampment-lore §1.1): gesehen werden, gewachsen sein, gemeint sein.

## 2. Phasenplan (Empfehlung)

### Phase 0.3.x — „New Haven lebt" (klein & schnell, ein Save-Bump, kaum Assets)
| Punkt | Quelle | Aufwand |
|---|---|---|
| **Bau-Warteschlange** (Tiefe 2, Schreibzelt III → 3; Vorkasse) | Retention | S |
| **Schwarzes Brett** — tägliche Lieferwünsche, konsumieren Material (auf Daily-Engine/Tages-Seed) | Retention | M |
| **Gerberei** — dritter Offline-Veredler (Schmelzofen-Muster; raw_hide = Bank-Druck Nr. 1, ~30 Rezepte fressen Leder; Rate 20/40/60 hält den Guard) | Ökonomie | M |
| **„Die andere Spalte" Welle 1** — 3 Szenen-Nebenquests im Lager + Textstufe der Bedrohung (null neue Assets, Texte abnahmefertig im Lore-Doc) | Lore | S |
| **Listen-Bau-Toast „Auf Karte zeigen"** (Chef-UX-Punkt von heute) | Chef | S |

### Phase 0.4 — „Die wachsende Zuflucht" (Karten-Fokus, mit Chef-Assets)
| Punkt | Quelle | Aufwand |
|---|---|---|
| **3 Monumente** als Wochen-Projekte (Glockenturm 250k / Wächterstatue 750k / Leuchtfeuer 2M mit Chronik-Stückliste; Σ ~3M Gold + 360 h Bauzeit; Boni unter bestehenden Klemmen) | Ökonomie | L |
| **Sichtbares Wachstum** — 3 Kulissen-Stufen des Kartengrunds am Zentralhaus-Ausbau (Zeltring→Palisade→Glockenturm; Miras Konzepttafeln laufen bereits, Inbox-Auftrag 05) | Lore | M |
| **Karawane** — kalender-geseedeter Besucher am Händlerposten, reine Kauf-Senke mit Arbitrage-Guard | Retention | M |
| **Zieraufträge** — kosmetische Bauten als freie Karten-Senke | Retention | M |
| **Siedler Stufe A** — bestehende NPC-Gesichter (Mux, Brenna, Urga, Shairi, Eske, Voss-Zettel) mit Sprechzeilen im Lager; optional Stufe B: EINE neue Figur „die alte Maren" | Lore | S–M |
| **Namens-Moment-Quest** (dramatisiert den kanonischen Chronik-Eintrag, kein Label-Wechsel) | Lore | S |
| **Welt schlägt zurück, Stufe 2** — rotes Turm-Kohlenbecken (zeigt bestehenden Elite-Zustand), Vorboten-Quests; New Haven verliert nie, es MELDET | Lore | S–M |

### Phase 0.5 — nächstes Headline-Feature
**Gesindehaus/Zwinger + Rekruten-/Companion-Missionen** (Bautrupp-Muster als zweite Spur; Belohnungen R1-konform: Veredelung mit Inputs, Bauzeit-Ersparnis, gedeckelte Tokens; Pet auf Mission = Passiv-Bonus pausiert). Dazu Essenzbrenner (dim_essence-Senke) und der Nordstern „Wegstationen-Wiederaufbau".

## 3. Verworfen (mit Begründung, alle drei einig)
- **Gebäude-Stufe IV** — Boost-Budget erschöpft, ×4-Kosten ohne legalen Gegenwert, 30 Assets für Nummern-Kosmetik. Breite schlägt Höhe.
- **Mühle** — flour/dough ohne Katalog-Unterbau = verkapptes Wasserhahn-Muster.
- **Verbrauchs-/Verfalls-Loops** (auch als Opt-in-Bonus) — verkappte Steuer, bestraft die 1×/Tag-Zielgruppe. Einzig ein zahlenfreies kosmetisches Wachfeuer als Flavor denkbar.

## 4. Offene Chef-Entscheide (gebündelt)
| # | Entscheid | Empfehlung | Quelle |
|---|---|---|---|
| 1 | 0.3.x-Paket „New Haven lebt" GO? | GO (alle 5 Punkte) | Synthese |
| 2 | Token-Budget Schwarzes Brett | ≤ 50 % der Daily-Ausschüttung | Retention |
| 3 | Bau-Queue-Tiefe | 2, Schreibzelt III → 3 | Retention |
| 4 | Gerberei in 0.3.x oder 0.4? | 0.3.x | Ökonomie |
| 5 | Monumente: Pilot (nur Glockenturm) oder alle drei? | Pilot in 0.4.0, Rest 0.4.x | Ökonomie |
| 6 | Monument-Bonusvariante Leuchtfeuer (Veredler-Rate vs. Alternativen) | Variante A (+10/h) | Ökonomie |
| 7 | Monumente außerhalb der Zentralhaus-Kapazität? | Ja (eigene Kategorie) | Ökonomie |
| 8 | Siedlerin „Maren" (eine neue Figur) GO? | GO für 0.4 | Lore |
| 9 | Namens-Moment-Quest trotz „kein Eigenname"-Default? | GO — sie TAUFT nicht um, sie dramatisiert den Kanon-Eintrag | Lore |
| 10 | Sichtbares Wachstum: 3 Kulissen-Stufen produzieren? | Nach Miras Konzepttafeln entscheiden | Lore/Mira |

## 5. Nächste Schritte nach Chef-GO
Je freigegebenem Punkt: Design-Detail (falls nötig) → Implementierungs-Welle → Verifikations-Gate, nach den Arbeitsregeln der 0.3.0-Zielsetzung §7. Miras Konzepttafeln (Wachstum) und Event-Artwork laufen bereits als Inbox-Auftrag 05.
