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
_(Mira)_

# Teil C – Lieferung und QA
_(Mira)_

# Teil D – Abnahme
_(Claude, dann Chef)_
