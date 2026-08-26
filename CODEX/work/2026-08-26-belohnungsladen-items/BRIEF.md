# Asset-Brief — Belohnungsladen: sieben Kapitel-Belohnungen (7 Item-Bilder)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 26.08.2026 (Chef-GO 02).
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ist ausgefüllt. Teil B, C und D füllt Mira.
> **Bindender Bildvertrag:** `design/asset-anforderungen.md` (Alpha, Auflösung, Benennung, Abnahme).
> **Prompts:** `CODEX/work/2026-08-26-belohnungsladen-items/PROMPTS.md` (je Item ein fertiger Prompt in Englisch).
> **Design-Quelle:** `design/bedarfe-1.1.0.html` Punkt 02 (Chef-GO), Content wird parallel gebaut.

---

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Belohnungsladen: Kapitel-Belohnungen |
| Auftraggeber | Chef (GO 02 vom 26.08.2026), Briefing durch Claude |
| Projekt | Grim Reach |
| Zielversion oder Meilenstein | 1.1.0 |
| Priorität | P1. Die Items werden gerade gebaut und laufen bis zur Lieferung mit Platzhalter-Symbol. |
| Termin | vor dem 1.1.0-Upload |
| Status | zur Produktion freigegeben |

## A2. Produktziel

**Was soll mit den Assets erreicht werden?**
Der Belohnungsladen (Quest-Tokens, sechs Regale, die mit der Chronik aufgehen) hatte bisher nur
Speisen, Tränke, Tonika und Saat. Sieben neue Stücke sind die ersten echten Belohnungen: je Regal
ein Meilenstein-Zeichen des Kapitels. Sie sollen sich wie Auszeichnungen anfühlen, die man sich in
der Geschichte verdient hat, nicht wie Beute oder Kampfausrüstung.

**Wo sieht der Spieler sie?**
Belohnungsladen-Karte (96 bis 128 px), Inventar und Bank (48 bis 96 px), Item-Tooltip, Paperdoll
(Ringe, Amulett, Umhang), Verzauberungstisch. Immer auf dunklem Gravewood-Grund.

**Was muss der Spieler innerhalb der ersten Sekunde erkennen?**
1. Den Item-Typ (Ring, Amulett, Umhang, Marke) in derselben Perspektive wie die Bestandsstücke.
2. Das Kapitel: jedes Stück trägt die Farbe und ein Motiv seines Ortes (Weiden, Aschfelder,
   Krypta, Küste/Schlackengrube, Götzenhalle, „zweiter Band").
3. Kein Glühen: Die Seltenheit zeigt der Rahmen im Spiel. Chase-Stück ist nur das Signet, das darf
   die reichste Fassung tragen.

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**
Sieben Dateien mit exakten IDs, echtes Alpha, 1024 px; Kontaktbogen neben `garnet_ring`,
`garnet_amulet`, `field_cape` und `plague_mask` wirkt wie aus einem Guss.

## A3. Lieferumfang

Dateiname = Content-ID, `.png` mit echtem Alpha.

| # | Asset-ID / Dateiname | Item (DE / EN) | Typ | Kapitel-Motiv (Bildanker) | Priorität |
|---:|---|---|---|---|---|
| 1 | `chronicle_wanderers_seal.png` | Wanderersiegel / Wanderer's Seal | Ring | schlichter Bronzering mit eingeprägtem Wegkreuz; Weiden-Grün als kleiner Stein | P1 |
| 2 | `chronicle_ash_mark.png` | Aschenmarke / Ash Mark | Amulett | rußgeschwärzte Eisenmarke an Lederband, Glutriss als Motiv, kein Leuchten | P1 |
| 3 | `chronicle_crypt_lantern.png` | Gruftlaterne / Crypt Lantern | Umhang | grauer Grabtuch-Umhang mit einer kleinen erloschenen Laterne als Schließe | P1 |
| 4 | `chronicle_tide_chain.png` | Gezeitenkette / Tide Chain | Amulett | salzgrüne Kette aus Muschelgliedern mit einem Ankerstück | P1 |
| 5 | `chronicle_idol_eye_ring.png` | Götzenauge-Ring / Idol's Eye Ring | Ring | dunkler Götzenstein-Ring mit einem geschlossenen steinernen Auge (Idol-Set-Palette) | P1 |
| 6 | `chronicle_chronicler_signet.png` | Chronisten-Signet / Chronicler's Signet | Ring (Chase) | Siegelring mit Feder und aufgeschlagenem Buch, reichste Fassung der Serie, dunkles Silber | P1 |
| 7 | `chronicle_task_token.png` | Auftragsmarke / Contract Token | Verbrauch (stapelbar) | Brennas Marke: geprägte Eisenmünze mit Reißzahn-Siegel, leicht abgegriffen | P1 |

Lieferung nach `CODEX/assets/belohnungsladen-2026-08-26/fertig/` (plus `raw/` und `qa/`), danach
HANDOFF und WORKLOG. Nichts in den Renderer kopieren, den Einbau macht Claude.

## A4. Feste Auftraggeber-Entscheidungen

| Entscheidung | Wert |
|---|---|
| Format | PNG, 1024 × 1024, echtes Alpha aus der Erzeugung (kein Schachbrett, kein Magenta, kein nachträgliches Keying) |
| Perspektive | wie die Bestandsstücke desselben Typs: Ringe/Amulette leicht schräg von oben, Umhang hängend, Marke flach liegend leicht schräg |
| Rarity | rare (grüner Rahmen im Spiel); Signet superRare. Kein Glow im Bild (Regel „kein Rarity-Glow auf Ausrüstung") |
| Farbwelt | Ashen-Iron: gedeckt, körnig; je Stück ein Kapitel-Akzent (Weiden-Grün, Asche-Orange, Gruft-Grau, Salz-Grün, Götzen-Violett, Chronik-Silber, Brenna-Braun) |
| Verboten | Glühen, Partikel, Text, Wasserzeichen, Hintergrund, Hände oder Körper |

## A5. Designer-Freiheit

Form der Fassungen, Kettenglieder, Umhangschnitt, Abnutzung; zwei Varianten je Stück willkommen.

## A6. Referenzen und Quellen

Bestand in `apps/client/src/renderer/assets/items/`: Ringe `garnet_ring.webp`, `gemstone_ring.webp`,
`ninth_wardens_signet.webp` (Siegelring-Anker); Amulette `garnet_amulet.webp`, `drovers_charm.webp`,
`bulls_heart_pendant.webp`; Umhänge `field_cape.webp`, `shroud_of_the_dead.webp` (Grabtuch-Anker);
Marken/Schlüssel `plague_mask.webp`, `paragon_key.webp`; Idol-Palette `idol_crown.webp`,
`eye_of_the_idol.webp`. Brenna-Linie: `slayer_helm.webp`, `slayer_hunters_cape.webp`.

## A7. Technische Leitplanken

1024 × 1024 PNG, echtes Alpha, Motiv füllt 80 bis 90 % der Höhe, unten mittig ausgerichtet (die
Spiel-Zellen zeigen `100% auto`, `bottom center`). Prüfung wie beim Jägerumhang (`prepare-and-qa.mjs`-Muster).

## A8. Batch-Konsistenz

Sieben Stücke, eine Serie: gleiche Lichtrichtung (oben links), gleiche Sättigung, Ringe und
Amulette in derselben Größe und Perspektive wie die Bestandsringe. Das Signet darf reicher sein,
kein anderes.

## A9. Abnahme und Entscheidungsgrenzen

Abnahme durch Claude (Kontaktbogen neben A6), Freigabe durch den Chef. Item-Werte und Namen sind
nicht Teil dieses Auftrags.

---

# Teil B – Designauflösung

<!-- codex:2026-08-26T10:23:25+02:00 -->

## B1. Gemeinsamer Serienguss

Die sieben Stücke werden als zusammengehörige, verdiente Chronikzeichen ausgeführt: gedeckte
Ashen-Iron-Materialien, körnige handgemalte Oberflächen, weiches Licht von oben links und pro
Stück genau ein zurückhaltender Kapitel-Akzent. Es gibt keine Rarity-Effekte im Motiv. Das
Chronisten-Signet erhält als einziges Stück eine reichere Gravur und Edelmetallfassung, bleibt
aber gealtert und spielweltlich glaubwürdig.

## B2. Form- und Perspektivsystem

- Ringe: dreiviertel von leicht oben, klar lesbare Ringschiene und zentraler Kopf; Wanderersiegel
  schlicht, Götzenauge massiv und matt, Chronisten-Signet am detailreichsten.
- Amulette: kurze sichtbare Tragekette oder Lederschnur, der Anhänger bildet die dominante
  Silhouette; Aschenmarke kompakt und geschwärzt, Gezeitenkette organischer und salzverwittert.
- Umhang: frei hängend und unten mittig, mit lesbarer Schulter-/Kragenform; die erloschene
  Laternen-Schließe bleibt bei 48 px als einzelner Metallakzent erkennbar.
- Auftragsmarke: eine einzelne flache, leicht schräg liegende Eisenmünze; Reißzahn-Siegel als
  große, einfache Binnenform statt filigraner Illustration.

## B3. Produktionsweg

Jedes Motiv wird einzeln mit dem freigegebenen Prompt und einem strikten nativen-Alpha-Zusatz
erzeugt. Ein Ergebnis mit Hintergrundfläche, Alphahintergrund, Schachbrett oder Farbsäumen wird
verworfen und neu erzeugt; Keying und nachträgliches Freistellen sind ausgeschlossen. Zuerst
werden `chronicle_chronicler_signet` und `chronicle_task_token` als Serienanker geprüft, danach
folgen die fünf übrigen Stücke im gleichen Guss. Die Rohbilder werden unverändert unter `raw/`
archiviert; die normalisierten 1024-px-Dateien entstehen ohne Hintergrundentfernung unter
`fertig/`.

## B4. Abnahmekriterien vor Batch-Freigabe

- [x] Typ-Perspektiven und relative Größe gegen die Bestandsstücke festgelegt.
- [x] Einheitliches Licht oben links und gedeckte Sättigung festgelegt.
- [x] Kapitel-Akzente und Hierarchie des Chase-Signets festgelegt.
- [x] Natives Alpha ohne Keying als technischer Liefervertrag bestätigt.
- [x] Exakte Content-IDs und 1024 × 1024 PNG als Dateivertrag bestätigt.

# Teil C – Lieferung und QA

<!-- codex:2026-08-26T10:26:05+02:00 -->

## C1. Gelieferte Dateien

Sieben finale PNGs liegen unter `CODEX/assets/belohnungsladen-2026-08-26/fertig/`, exakt benannt
wie die sieben Content-IDs aus A3. Die angenommenen unveränderten Generatorausgaben liegen unter
`raw/`. Prüfwerte, Prüfsummen und Kontaktbögen liegen unter `qa/`.

## C2. Technische Prüfung

- 7/7 Dateien: PNG, sRGB, RGBA, exakt 1024 × 1024.
- 7/7: echtes Generator-Alpha bewahrt; Null-, weiches Kanten- und solides Material-Alpha belegt.
- 7/7: äußerer 16-px-Rand vollständig transparent.
- 7/7: opaker Motivkörper 869 bis 870 px hoch und damit innerhalb 80 bis 90 Prozent.
- 7/7: exakte Dateinamen; SHA-256 und Einzelwerte in `qa/qa.json`.
- Kein Keying, keine Matte, kein Despill und kein nachträgliches Freistellen.

## C3. Visuelle Prüfung

Die Serie wurde auf Schwarz, Grau und Grellrosa, bei 48/96/128 px und neben typgleichen
Bestandsstücken geprüft. Keine Hintergrundfläche oder Farbsäume sind sichtbar. Ring-, Amulett-,
Umhang- und Marken-Silhouetten bleiben in Kleinformat unterscheidbar; Licht und Sättigung sind
einheitlich. Der Götzenring bleibt matt und geschlossen, die Gruftlaterne erloschen, der
Ascheriss ist als Pigment ohne Bloom ausgeführt. Das Chronisten-Signet ist sichtbar reicher als
die sechs übrigen Stücke, ohne Glow oder Rarity-Effekt.

## C4. Verworfene Erzeugungen

Technisch oder gestalterisch ungeeignete Fassungen wurden nicht ausgeliefert: ein Signet mit
knappem Rand, zwei Gruftumhänge mit Schachbrett beziehungsweise Studiovignette sowie eine erste
Aschenmarke mit zu leuchtendem Riss. `raw/` enthält ausschließlich die sieben angenommenen
Erzeugungen.

# Teil D – Abnahme

<!-- codex:2026-08-26T10:26:05+02:00 -->

## D1. Mira-Produktionsabnahme

**GO zur Gegenprüfung.** Lieferumfang und technische Gates sind vollständig; die visuellen
Pflichtmerkmale sind auf den Kontaktbögen belegt. Keine Renderer- oder Produktdatei wurde
verändert.

## D2. Bindende Abnahme

Claude prüft die Lieferung gegen A9 und den Bestandsvergleich. Die finale Produktfreigabe bleibt
beim Chef. Status: ausstehend.
