# Asset-Brief — Jägerumhang (Slayer-Shop, 1 Item-Bild)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 25.08.2026 (Chef-Entscheidung E6).
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ist ausgefüllt. Teil B, C und D füllt Mira.
> **Bindender Bildvertrag:** `design/asset-anforderungen.md` (Alpha, Auflösung, Benennung, Abnahme).
> **Prompt:** `CODEX/work/2026-08-25-slayer-jaegerumhang/PROMPTS.md` (ein fertiger Prompt in Englisch).
> **Design-Quelle:** `design/slayer-shop-1.1.0.md` §4.4 (Item-Werte, vom Chef abgenommen).

---

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Jägerumhang (Hunter's Cape) |
| Auftraggeber | Chef (Entscheidung E6 vom 25.08.2026), Briefing durch Claude |
| Projekt | Grim Reach |
| Zielversion oder Meilenstein | 1.1.0, Slayer-Shop Phase 2 |
| Priorität | P2. Der Content ist fertig geschrieben und wartet nur auf das Bild; ohne Bild kein Einbau. |
| Termin | kein fester Termin; das Item geht mit dem nächsten Upload nach dem Bild live |
| Status | zur Produktion freigegeben |

## A2. Produktziel

**Was soll mit dem Asset erreicht werden?**
Der Slayer-Shop hat zwischen Slayer 30 und 50 kein Ausrüstungs-Angebot. Der Jägerumhang füllt die
Lücke: das erste Ausrüstungsstück, das sich ein Jäger nach rund dreißig Aufträgen kaufen kann
(150 Slayer-Punkte, etwa vier bis fünf Stunden). Er soll sich wie eine verdiente Auszeichnung von
Brenna Aschenweide anfühlen, nicht wie Beute.

**Wo sieht der Spieler ihn?**
Slayer-Shop-Karte (Bild 96 bis 128 px), Inventar und Bank (48 bis 96 px), Item-Tooltip (größer),
Verzauberungstisch, Beute-Popup. Immer auf dunklem Gravewood-Grund.

**Was muss der Spieler innerhalb der ersten Sekunde erkennen?**
1. „Das ist ein Umhang" (dieselbe Silhouette und Perspektive wie die Bestands-Umhänge).
2. „Der gehört zur Slayer-Linie" (Brennas Farben: verwittertes Dunkelbraun, Jägergrün, ein einzelnes
   Schädel- oder Reißzahn-Abzeichen).
3. Den Effekt im Anklang: der erste Schlag der Jagd beißt tiefer (ein aufgenähter Reißzahn oder eine
   Kerbe als Strichliste am Saum, nicht mehr).

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**
Eine Datei mit exakter ID, echtes Alpha, 1024 px, Kontaktbogen neben `field_cape`, `ranger_cape`
und `warden_greatcloak` wirkt wie aus einem Guss, aber erkennbar als Slayer-Stück.

## A3. Lieferumfang

Dateiname = Content-ID, `.png` mit echtem Alpha.

| # | Asset-ID / Dateiname | Item (DE / EN) | Slot | Effekt (Bildanker) | Priorität |
|---:|---|---|---|---|---|
| 1 | `slayer_hunters_cape.png` | Jägerumhang / Hunter's Cape | Umhang (cape) | +15 % Schaden gegen ein unverletztes Ziel (Reißzahn oder erste Kerbe am Saum) | P2 |

Lieferung nach `CODEX/assets/slayer-jaegerumhang-2026-08-25/fertig/` (plus `raw/` und `qa/`), danach
HANDOFF und WORKLOG. Nichts in den Renderer kopieren, das macht Claude beim Einbau.

## A4. Feste Auftraggeber-Entscheidungen

| Entscheidung | Wert |
|---|---|
| Format | PNG, 1024 × 1024, echtes Alpha aus der Erzeugung (kein Schachbrett, kein Magenta, kein nachträgliches Keying) |
| Perspektive | wie die Bestands-Umhänge: hängend, leicht schräg von vorn, Kragen oben, Saum unten, freigestellt |
| Rarity | superRare (im Spiel violetter Rahmen; das Bild selbst trägt KEINEN Glow, s. Regel „kein Rarity-Glow auf Ausrüstung") |
| Farbwelt | verwittertes Dunkelbraun-Leder mit stumpfem Jägergrün-Futter, ein einziges Metall-Abzeichen (angelaufenes Eisen oder dunkle Bronze) |
| Abzeichen | Schädel MIT Reißzahn oder nur Reißzahn, klein, an Kragen oder Schulterschließe. Kein Wappen, keine Schrift |
| Zustand | „verwittert, aber gepflegt": ausgefranster Saum, geflickte Stelle erlaubt; kein Schmutz-Overkill, keine Armut (Spieler-Char-Ästhetik) |
| Verboten | Glühen, Partikel, Magie-Aura, Text, Wasserzeichen, Hintergrund, Körper oder Ständer |

## A5. Designer-Freiheit

Schnitt (Halb- oder Vollumhang), Faltenwurf, Position von Flicken und Abzeichen, ob das Futter
sichtbar umschlägt, Kragenform (Kapuze erlaubt, wenn sie zurückgeschlagen ist). Zwei Varianten
zur Wahl sind willkommen.

## A6. Referenzen und Quellen

Bestands-Umhänge (Stil-Kontrolle, dieselbe Perspektive):
- `apps/client/src/renderer/assets/items/field_cape.webp` (verwittert, einfach; unser unteres Ende)
- `apps/client/src/renderer/assets/items/ranger_cape.webp` (Jägergrün-Anklang)
- `apps/client/src/renderer/assets/items/hardened_warcape.webp` (Leder, robust)
- `apps/client/src/renderer/assets/items/mariner_cloak.webp` (Chase-Umhang desselben Bandes; der Jägerumhang darf NICHT edler wirken)
Slayer-Linie (Farben, Abzeichen): `slayer_helm.webp`, `slayer_greaves.webp`, `slayer_vambraces.webp` im selben Ordner.
Brenna Aschenweide (Auftraggeberin im Spiel): Porträt in `assets/npcs/` (Ledermantel, dunkle Palette).

## A7. Technische Leitplanken

1024 × 1024 PNG, echtes Alpha, Motiv füllt 80 bis 90 % der Höhe, unten mittig ausgerichtet (die
Spiel-Zellen zeigen `100% auto`, `bottom center`). Kein Rand-Schatten außerhalb der Silhouette.
Prüfung wie im Runen-Auftrag: `prepare-and-qa.mjs`-Muster (Alpha-Histogramm, Bounding-Box, Kontaktbogen).

## A8. Batch-Konsistenz

Ein Bild. Konsistenz gilt gegenüber den Bestands-Umhängen (A6): Perspektive, Lichtrichtung (oben
links), Sättigung (gedeckt).

## A9. Abnahme und Entscheidungsgrenzen

Abnahme durch Claude (Kontaktbogen neben A6), Freigabe durch den Chef. Änderungen an Item-Werten
oder Name sind NICHT Teil dieses Auftrags (Content steht in `design/slayer-shop-1.1.0.md` §4.4).

---

# Teil B – Designauflösung

## B1. Verständnis des Auftrags
_(Mira)_

## B2. Art Direction
_(Mira)_

## B3. Technische Produktionsspezifikation
_(Mira)_

## B4. Generierungsplan
_(Mira)_

## B5. Prüfplan vor Produktion
_(Mira)_

# Teil C – Lieferung und QA

## C1. Gelieferte Dateien
## C2. Visuelle QA
## C3. Technische QA
## C4. Nachweis

# Teil D – Abnahme
_(Claude, dann Chef)_
