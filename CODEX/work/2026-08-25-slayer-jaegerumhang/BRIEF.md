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

Der Jägerumhang ist ein frühes, verdientes Slayer-Ausrüstungsstück. Er muss auf den ersten Blick
als hängender Umhang derselben Familie wie `field_cape`, `ranger_cape` und `hardened_warcape`
erkennbar sein, über Leder, Grünfutter und Reißzahn-Schließe aber eindeutig Brennas Jagdlinie
tragen. Sein Materialwert liegt sichtbar über dem einfachen Feldumhang und unter dem saubereren,
helleren Seefahrer-Umhang.

Annahme: Die unveränderte Generatorausgabe darf ausschließlich durch transparenten Zuschnitt,
proportionale Skalierung und bottom-center-Zentrierung auf 1024 × 1024 px aufbereitet werden. Das
native Alpha und die Motivfarben bleiben unangetastet.

Gefundener Briefwiderspruch: A2 nennt im Vergleich `warden_greatcloak`, A6 sowie die direkte
Chef-Anweisung nennen `hardened_warcape`. `hardened_warcape` ist der Pflichtanker;
`warden_greatcloak` wird zusätzlich im Kontaktbogen geführt.

## B2. Art Direction

| Bereich | Mira-Entscheidung |
|---|---|
| Stil | Handgemaltes Ashen-Iron-Itembild mit glaubwürdigem Leder und Wollfutter. Weniger Ornament und Materialluxus als `mariner_cloak`. |
| Schnitt | Praktischer halbweiter Jagdumhang mit kurzem, weichem Kragen. Keine Kapuze im Vordergrund und keine Rüstungsteile. |
| Perspektive | Hängend, leicht schräg von vorn, analog zu den Bestandsumhängen. Kragen oben, Saum unten. |
| Silhouette | Geschlossene Dreiecks- beziehungsweise Glockenform mit einer zurückgeschlagenen Kante, damit das grüne Futter bei 48 px sichtbar bleibt. |
| Material | Dunkelbraunes, verwittertes Leder; stumpfes jägergrünes Wollfutter; eine kleine Reißzahn-Schließe aus angelaufenem Eisen. |
| Gebrauchsspuren | Feine Schrammen, ein sauber vernähter Flicken und leicht ausgefranster Saum. Gepflegt, nicht zerlumpt. |
| Effektanker | Kleine Kerb-Strichliste am unteren Saum. Sie bleibt untergeordnet und darf nicht wie Schrift wirken. |
| Licht | Weiches Hauptlicht von oben links, tiefe Faltenschatten, kein Gegenlicht und kein Leuchtrand. |
| Varianten | A kompakter mit klarer grüner Umschlagkante; B etwas voller und stärker gefaltet. Beide bleiben funktional statt heroisch. |

## B3. Technische Produktionsspezifikation

| Feld | Produktionsentscheidung |
|---|---|
| Arbeitsauflösung | Native Generatorauflösung, erwartbar 1254 × 1254 px; unverändert in `raw/`. |
| Zielauflösung | 1024 × 1024 px |
| Zielformat | PNG, sRGB, RGBA |
| Hintergrund | Echter nativer Alphakanal aus der Erzeugung, keine Matte und kein Keying. |
| Motivanteil | Opake Hauptform 80 bis 90 Prozent der Höhe, vollständig innerhalb des Canvas. |
| Ausrichtung | Optisch mittig, vertikal bottom center mit transparenter Safe Area. |
| Finaler Dateiname | `slayer_hunters_cape.png` |
| Variantenablage | Unveränderte Varianten als `slayer_hunters_cape-variant-a-raw.png` und `slayer_hunters_cape-variant-b-raw.png` in `raw/`; nur die gewählte Fassung unter exakter ID in `fertig/`. |
| Staging | `CODEX/assets/slayer-jaegerumhang-2026-08-25/` |
| Produktpfad | `apps/client/src/renderer/assets/items/slayer_hunters_cape.webp`, ausschließlich durch Claude nach Freigabe. |

## B4. Generierungsplan

1. Den vollständigen Prompt aus `PROMPTS.md` unverändert als Serienkern verwenden.
2. Variante A mit kompakter Silhouette und deutlich sichtbarer grüner Umschlagkante erzeugen.
3. Variante B mit vollerem Faltenwurf und zurückhaltenderem Futteranteil separat erzeugen.
4. Jede Rohdatei vor der Aufbereitung auf 4 Kanäle, benutztes Alpha und transparente Ecken prüfen.
5. Beide Varianten ohne Keying auf 1024 px normalisieren und auf Schwarz, Grau sowie Grellrosa
   neben den fünf Bestandsumhängen und der Slayer-Linie vergleichen.
6. Die stärkere Fassung unter der exakten Content-ID liefern; die zweite bleibt nur als
   dokumentierte Wahlvariante in `raw/` und `qa/`.

Unveränderlicher Negativkern: kein Schachbrett, kein Vollflächenhintergrund, kein Körper, kein
Ständer, keine Bodenfläche, kein Schlagschatten außerhalb der Silhouette, kein Glühen, keine Aura,
keine Partikel, kein Rarity-Rahmen, keine Runen, kein Wappen, kein Text und kein Wasserzeichen.

## B5. Prüfplan vor Produktion

- [x] Brief, Prompt und `design/asset-anforderungen.md` vollständig gelesen
- [x] `design/slayer-shop-1.1.0.md` §4.4 gegen den Auftrag geprüft
- [x] Bestandsumhänge, Slayer-Ausrüstung und Brenna-Porträt visuell verglichen
- [x] Perspektive, Lichtrichtung und Wertigkeit des Zielkorridors bestimmt
- [x] Exakte Content-ID und Zielauflösung bestätigt
- [x] Native-Alpha-Weg über das eingebaute ImageGen-Werkzeug bestätigt
- [x] Kein Keying und keine Renderer-Integration eingeplant
- [x] Freigabegate erfüllt; keine offene Produktentscheidung

# Teil C – Lieferung und QA

## C1. Gelieferte Dateien

| Datei | Rolle | Maße / Format | Status |
|---|---|---|---|
| `fertig/slayer_hunters_cape.png` | finale Content-ID, Variante A | 1024 × 1024 PNG sRGB RGBA | Final |
| `raw/slayer_hunters_cape-variant-a-raw.png` | unveränderte Generatorausgabe der gewählten Fassung | 1254 × 1254 PNG RGBA | Quelle Final |
| `raw/slayer_hunters_cape-variant-b-raw.png` | unveränderte Generatorausgabe der schmaleren Alternative | 1254 × 1254 PNG RGBA | Wahlvariante |

## C2. Visuelle QA

- [x] Bei 48, 96 und 128 px eindeutig als Umhang erkennbar
- [x] Perspektive und Lichtrichtung entsprechen den Bestandsumhängen
- [x] Dunkelbraunes Leder, stumpfes Jägergrün und Reißzahn-Schließe lesen als Slayer-Linie
- [x] Flicken und Saumkerben sind untergeordnet; keine Armuts- oder Kostümoptik
- [x] Variante A wirkt breiter und klarer als Variante B und wurde deshalb gewählt
- [x] Unter `mariner_cloak` eingeordnet; keine vergleichbare Ziernaht oder helle Stoffgüte
- [x] Kein Glühen, keine Partikel, keine Aura, kein Rahmen und keine magische Bildsprache
- [x] Keine unerwünschten Texte, Logos, Runen oder Wasserzeichen
- [x] Keine abgeschnittene Silhouette und keine Geometriefehler
- [x] Auf Schwarz, Grau und Grellrosa ohne sichtbaren Farbsaum

## C3. Technische QA

- [x] Finaler Dateiname exakt `slayer_hunters_cape.png`
- [x] 1024 × 1024 px, PNG, sRGB, vier Kanäle
- [x] Alphakanal vorhanden und benutzt; Alpha 0 bis 255
- [x] Äußerer 16-px-Rand vollständig Alpha 0
- [x] Opake Motivhöhe 880 px beziehungsweise 85,9 Prozent
- [x] Unveränderte native Generatorausgaben beider gültigen Varianten in `raw/`
- [x] Kein Keying, keine Matte, kein Despill und keine nachträgliche Freistellung
- [x] `qa.json` enthält Bounding-Boxen, Alpha-Zählung und SHA-256
- [x] Keine Renderer- oder `.claude/**`-Datei verändert

## C4. Nachweis

Prüfpfade:

- `qa/contact-sheet-{black,gray,magenta}.png`
- `qa/contact-sheet-neben-bestand.png`
- `qa/contact-sheet-neben-slayer-linie.png`
- `qa/contact-sheet-ui-48-96-128.png`
- `qa/slayer_hunters_cape-variant-{a,b}-preview.png`
- `qa/qa.json`

Headless ausgeführt: `prepare-and-qa.mjs` über Node. Ergebnis: exakter Finalname, drei geprüfte
1024er-Dateien einschließlich beider Variantenansichten, sRGB-RGBA, benutztes Alpha, vollständig
transparenter Außenrand und 880 px Motivhöhe. Alle automatischen Checks stehen auf `true`.

Bekannte Grenze: Die Kerben und Reparaturnaht werden bei 48 px zu Textur. Das ist beabsichtigt;
Silhouette, Grünfutter und Reißzahn-Schließe tragen die Erkennung in dieser Größe.

Mira-Empfehlung: Variante A freigeben. Variante B bleibt als technisch saubere Alternative im
Staging, benötigt aber keine weitere Bearbeitung.

# Teil D – Abnahme

**Mira-Produktionsentscheidung:** GO für Variante A zur Gegenprüfung.

**Gewählte Datei:** `fertig/slayer_hunters_cape.png`

**Verbindliche Korrekturen aus der Produktions-QA:** keine.

**Darf integriert werden?** Erst nach Gegenprüfung durch Claude und finaler Freigabe durch den
Chef gemäß A9.

**Ziel:** Grim Reach 1.1.0, Slayer-Shop Phase 2.

**Status:** Produktions-QA durch Mira am 2026-08-25 abgeschlossen; Claude-/Chef-Abnahme ausstehend.
