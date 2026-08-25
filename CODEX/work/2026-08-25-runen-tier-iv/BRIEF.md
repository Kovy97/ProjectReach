# Asset-Brief — Runen Tier IV (14 Verzauberungs-Runen)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 25.08.2026.
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ist ausgefüllt. Teil B, C und D füllt Mira.
> **Bindender Bildvertrag:** `design/asset-anforderungen.md` (Alpha, Auflösung, Benennung, Abnahme).
> **Prompts:** `CODEX/work/2026-08-25-runen-tier-iv/PROMPTS.md` (je Rune ein fertiger Prompt in Englisch).
> **Design-Quelle:** `design/runen-tier-iv.html` (Balance-Design, vom Chef abgenommen).

---

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Runen Tier IV |
| Auftraggeber | Chef (Design abgenommen), Briefing durch Claude |
| Projekt | Grim Reach |
| Zielversion oder Meilenstein | 1.0-Kurs, Runecrafting-Endgame (RC 85 bis 95) |
| Priorität | P1 wichtig. Der Content wird parallel gebaut und braucht die Bilder vor dem Depot-Upload. |
| Termin | kein fester Termin, aber die Code-Seite läuft bereits |
| Status | zur Produktion freigegeben |

## A2. Produktziel

**Was soll mit diesen Assets erreicht werden?**
Ab Runecrafting 80 gab es bisher keine neue Verzauberungs-Rune mehr. Vierzehn neue Runen füllen die leere Etage zwischen 85 und 95: fünf für Waffen, vier für Rüstung, fünf als komplett neue Schmuck-Linie. Es sind keine „größeren Zahlen", sondern Aktiv-Effekte mit Build-Identität (Finisher, Zweitschlag, Rückschlag, Kopfgeld, Chronik). Jede Rune braucht genau ein Item-Bild, das neben den 36 bestehenden Runen im selben Regal steht und sichtbar eine Stufe darüber liegt.

**Wo sieht der Spieler sie?**
Inventar und Bank (Icon 48 bis 96 px), Runecrafting-Rezeptliste, Verzauberungstisch (Runen-Auswahl), Item-Tooltip (größer), Beute-Popup. Immer auf dunklem Gravewood-Grund.

**Was muss der Spieler innerhalb der ersten Sekunde erkennen oder fühlen?**
1. „Das ist eine Rune" (derselbe Steinkörper wie Tier I bis III).
2. „Die ist höher als alles, was ich bisher hatte" (mehr Glut, Metall-Einfassung, die IV).
3. Die Linie: Waffe = Glut-Gold, Rüstung = Eis-Blau, Schmuck = violettes Leerenglühen.
4. Den Effekt in einem Blick: Waage und Beil = Gericht, Münze und Schädel = Kopfgeld, zwei Pfeile = Zweiter Pfeil.

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**
Siehe A9 und die Abnahme-Liste am Ende. Kurz: 14 Dateien mit exakten IDs, echtes Alpha, 1024 px, Kontaktbogen neben Tier III wirkt wie aus einem Guss, aber eine Stufe höher; bei 64 px bleibt jede Gravur lesbar und die drei Linien sind an der Glutfarbe unterscheidbar.

## A3. Lieferumfang

Dateiname = Content-ID, immer `.png` mit echtem Alpha. Die IDs kommen aus dem Design und sind bereits mit dem Content abgestimmt (keine Kollision im Katalog, keine bestehende Datei gleichen Namens).

| # | Asset-ID / Dateiname | Rune (DE / EN) | Linie | Effekt (Bildanker) | Priorität |
|---:|---|---|---|---|---|
| 1 | `rune_warpath_iv.png` | Rune des Kriegspfads / Rune of the Warpath | Waffe, Nahkampf | +2 % Schaden je Treffer, bis 12 Stapel (aufsteigender Pfad aus zwölf Kerben) | P1 |
| 2 | `rune_second_arrow_iv.png` | Rune des Zweiten Pfeils / Rune of the Second Arrow | Waffe, Fernkampf | 12 % Chance auf sofortigen Zweitschlag (zwei Pfeile, der zweite dicht hinter dem ersten) | P1 |
| 3 | `rune_thin_veil_iv.png` | Rune des Dünnen Schleiers / Rune of the Thin Veil | Waffe, Magie | +20 % Zauberschaden bei Mana über 80 % (randvoller Brunnen, darüber ein dünner Schleier) | P1 |
| 4 | `rune_wasting_iv.png` | Rune der Auszehrung / Rune of Wasting | Waffe, alle | Brand-, Blutungs- und Gift-Ticks +50 % (ausgezehrte, dünne Flamme, darunter drei fallende Tropfen) | P1 |
| 5 | `rune_judgement_iv.png` | Rune des Gerichts / Rune of the Judgement | Waffe, alle, Chase | +30 % Schaden unter 25 % Leben (Waage, dahinter ein Richtbeil) | P1 |
| 6 | `rune_iron_answer_iv.png` | Rune der Eisernen Antwort / Rune of the Iron Answer | Rüstung, Platte | Angreifer erleiden 2,5 Schaden je Treffer (Brustplatte, aus der Eisendornen nach außen wachsen) | P1 |
| 7 | `rune_ambush_iv.png` | Rune des Hinterhalts / Rune of the Ambush | Rüstung, Leder | Erster Treffer jedes Kampfes doppelt (Dolch, der aus einer Schatten-Sichel tritt) | P1 |
| 8 | `rune_veil_drinker_iv.png` | Rune des Schleiertrinkers / Rune of the Veil-Drinker | Rüstung, Stoff | 10 % des Schadens füllen den Ward (Trinkschale, in die ein Nebelschleier hineinfließt) | P1 |
| 9 | `rune_unbroken_wall_iv.png` | Rune der Ungebrochenen Mauer / Rune of the Unbroken Wall | Rüstung, Schild | Jeder Block heilt 2 % HP (Zinnenmauer, deren Riss sich mit Licht schließt) | P1 |
| 10 | `rune_bounty.png` | Rune des Kopfgelds / Rune of the Bounty | Schmuck | +20 % gegen das Slayer-Ziel (Schädel mit Münzprägung in einem Jägerring) | P1 |
| 11 | `rune_tallyman.png` | Rune des Zählers / Rune of the Tallyman | Schmuck | +15 % Gold aus Tötungen (zwei Spalten Strichliste, darunter eine Münze) | P1 |
| 12 | `rune_restless.png` | Rune der Rastlosen / Rune of the Restless | Schmuck | Tötungen verkürzen die Pause (Stundenglas mit zerbrochener unterer Kammer) | P1 |
| 13 | `rune_chronicle.png` | Rune der Chronik / Rune of the Chronicle | Schmuck | +10 % Kampf-Erfahrung (aufgeschlagenes Buch mit Feder und einem einzigen Strich) | P1 |
| 14 | `rune_gleaning.png` | Rune der Nachlese / Rune of the Gleaning | Schmuck, Chase | +10 % Beutechance (Sichel über drei liegenden Ähren, darunter eine kleine Götzenblüte) | P1 |

**Vollständigkeitsregel:**
Alle 14 in einem Batch. Kein Teilbatch, weil der Kontaktbogen aller 14 neben Tier III die eigentliche Abnahme ist.

## A4. Feste Auftraggeber-Entscheidungen

| Thema | Fixe Entscheidung |
|---|---|
| Kanon / Lore | Namen sind gesetzt (Weltlore-Bibel, Aschechronik). „Gericht" ist Kapitel 19 der Chronik, „Zähler" ist Voss der Zähler (Gewölbe-Verwalter der Glutfeste), „Chronik" ist das Buch des Wächters, „Nachlese" spielt auf die Götzenblüte an, die auf abgeernteten Feldern wächst. Keine Comedy, keine Folklore-Klischees. |
| Motiv / Funktion | Ein Steinkörper wie Tier I bis III, ein einziges eingraviertes Glyph, das den Effekt trägt (Liste in A3, Details in PROMPTS.md). Kein zweites Motiv, keine Szene. |
| Stilbindung | **Bildsprache der 36 Bestandsrunen, keine neue Richtung.** Gleicher grob behauener, hochkant stehender Steinkörper, gleiche frontale Ansicht mit leichter Neigung, gleiche Lichtrichtung (weiches Hauptlicht oben links, das Glyph als zweite Lichtquelle). Referenzen in A6. |
| Farb-/Fraktionscode | Linienfarbe = Glutfarbe, fest: **Waffe = Glut-Gold** (warmes Gold mit weißglühendem Kern, wie Strahlendes Pigment und Götzeneisenbarren), **Rüstung = Eis-Blau** (kühles Blau mit weißem Kern, wie die Ägide-Rune III), **Schmuck = violettes Leerenglühen** (wie Hohle Essenz und Leerenschilf). Je Rune zusätzlich genau eine Sekundärfarbe (im Prompt), immer dem Glühen untergeordnet. |
| Perspektive / Ansicht | Frontal mit leichter Neigung, wie alle Bestandsrunen. Kein Bodenkontakt, kein Schatten. |
| Text im Bild | **Waffe und Rüstung:** die römische Ziffer **IV** eingraviert und glühend, unten mittig unter dem Glyph (wie die III bei Tier III). **Schmuck:** keine Ziffer, die Linie trägt keine Tier-Stufe (Design-Entscheid). Sonst kein Text, keine Buchstaben, keine Runenschrift mit Bedeutung. |
| Gewalt-/Horrorgrenze | Dark Fantasy ist erlaubt (Schädel, Beil, Dornen). Kein Blut in Lachen, keine Splatter-Optik. |
| Bestehendes Asset | Keines wird ersetzt. Die 36 Tier-I-bis-III-Dateien bleiben unangetastet. |
| Weitere Verbote | Kein gemaltes Schachbrett, kein Magenta-Key, keine Bodenplatte, kein Sockel, kein Rahmen, kein Wasserzeichen. Kein Neon, keine Mobile-Game-Politur. Keine Waffe als Hauptmotiv (die Waffen-Runen zeigen ein Glyph, nicht das Schwert). |

## A5. Designer-Freiheit

**Mira darf frei entscheiden:**
Exakte Steinform innerhalb der Familie (oval, sechseckig, abgebrochene Kante), Risse und Bruchkanten, Ausarbeitung der Metall-Einfassung, Dichte der Aura-Partikel, Feinschliff der Glyph-Geometrie, solange der Bildanker aus A3 auf 64 px lesbar bleibt.

**Mira soll Varianten anbieten bei:**
Keine Pflicht. Empfohlen: ein Anker je Linie zuerst (Nr. 5 Gericht, Nr. 6 Eiserne Antwort, Nr. 10 Kopfgeld), kurz an Claude oder den Chef zeigen, dann den Rest im gleichen Guss.

**Gewünschte Zahl an Konzeptvarianten vor Finalisierung:**
0 für den Batch, optional 2 für den ersten Anker je Linie.

## A6. Referenzen und Quellen

Die Pfade dienen der Stil-Kontrolle. Die Prompts sind so geschrieben, dass sie ohne Referenzbild funktionieren.

| Art | Pfad | Was davon übernehmen? | Was ausdrücklich nicht? |
|---|---|---|---|
| Waffen-Rune Tier III | `G:\GameDev\apps\client\src\renderer\assets\items\rune_flame_iii.webp` | Steinkörper, eingravierter Zierrahmen, Flammen als Aura um die Kante, glühende III unten | die Flamme selbst (das Motiv ist Tier-III-Flamme, nicht Tier IV) |
| Waffen-Rune Tier III | `G:\GameDev\apps\client\src\renderer\assets\items\rune_keen_iii.webp` | dunkler Basalt, weiß-silbernes Klingen-Glyph, Zierkante, III | nichts |
| Waffen-Rune Tier III | `G:\GameDev\apps\client\src\renderer\assets\items\rune_precise_iii.webp` | ruhige, saubere Glyph-Geometrie (Fadenkreuz), so lesbar sollen die neuen Glyphen sein | nichts |
| Rüstungs-Rune Tier III | `G:\GameDev\apps\client\src\renderer\assets\items\rune_aegis_iii.webp` | **das Eis-Blau der Rüstungs-Linie**, Schild-Glyph auf grauem Stein, Metallkante | nichts |
| Rüstungs-Rune Tier III | `G:\GameDev\apps\client\src\renderer\assets\items\rune_bulwark_iii.webp` | Gold-Metalleinfassung als Vorbild für die Waffen-Linie IV, III oben | das Gold für die Rüstungs-Linie (die ist blau) |
| Rüstungs-Rune Tier III | `G:\GameDev\apps\client\src\renderer\assets\items\rune_warding_iii.webp` | violette Aura als Vorbild für das Leerenglühen der Schmuck-Linie | nichts |
| Stufung I → II → III (eine Rune) | `G:\GameDev\apps\client\src\renderer\assets\items\rune_flame_i.webp`, `rune_flame_ii.webp`, `rune_flame_iii.webp` | **So wird das Tier ausgedrückt:** I = roher Stein, dünnes Linien-Glyph, kaum Aura, gekratzte I. II = eingravierte Runenkante, Glyph heller, erste Aura. III = ausgearbeiteter Zierrahmen, Glyph voll leuchtend, Aura verlässt den Stein (Flammen, Kristalle, Funken), III glühend. Tier IV ist die nächste Sprosse dieser Leiter. | nichts |
| Stufung, Quell-Originale (PNG, 1254 px) | `C:\Users\MSchu\Downloads\ASSETS\archive\renderer-assets-pre-optimize-2026-06-28\items\rune_flame_i.png`, `rune_flame_ii.png`, `rune_flame_iii.png` | dieselbe Stufung in voller Auflösung, um Kanten und Aura-Ausläufer zu studieren | nichts |
| Rüstungs-Originale (PNG, 512 px) | `C:\Users\MSchu\Downloads\ASSETS\archive\png-originals-20260722\items\rune_aegis_i.png` bis `rune_aegis_iii.png`, ebenso `rune_bulwark_*`, `rune_storm_*`, `rune_warding_*`, `rune_evasion_*` (1254 px) | Stufung der Rüstungs-Linie | die Ordner `integrated-2026-07-17\rune_evasion_*.png` sind RGB ohne Alpha (Roh-Stand vor dem Freistellen), nicht als Liefer-Vorbild nutzen |
| Zutaten-Palette | `G:\GameDev\apps\client\src\renderer\assets\items\pigment_radiant.webp`, `godiron_bar.webp` (Gold), `essence_void.webp`, `reed_void.webp` (Violett), `idol_shard.webp` (schwarzes Götzeneisen), `godbloom.webp` (elfenbeinfarbene Blüte) | Farbwerte der drei Linien und der Sekundärfarben | nichts |
| Lore-/Designquelle | `G:\GameDev\design\runen-tier-iv.html` (Abschnitt 4: Karten je Rune), `G:\GameDev\design\lore\weltlore-grim-reach.md` (§ 2 Wächter, § 3 Voss, § 4.10 Götzenhalle), `G:\GameDev\design\lore\aschechronik-spec.md` (Kapitel 19 „Das Gericht") | Namen, Bedeutungen | nichts |
| Technische Quelle | `G:\GameDev\apps\client\src\renderer\items.ts` (Auto-Discovery: `assets/items/<itemId>.{png,webp}`, WebP gewinnt) | Namensschema | nichts |

**Referenzrang bei Widerspruch:**
Dieses Briefing > `design/asset-anforderungen.md` > `design/runen-tier-iv.html` > Bestandsrunen. Bei Zweifeln an einem Glyph kurz nachfragen statt raten.

## A7. Technische Leitplanken

Gemessen an den 36 Bestandsrunen (PIL, 25.08.2026): alle WebP RGBA mit echtem Alpha, quadratisch. 21 Dateien 640 × 640 (Waffen-Linie), 12 Dateien 512 × 512 (Trinity-Runen), 3 Dateien 1254 × 1254 (Ausweichen). Transparenter Anteil 47 bis 71 %. Motiv-Bounding-Box: 79 bis 99 % der Höhe, 52 bis 86 % der Breite, typisch 86 bis 92 % hoch und 60 bis 72 % breit. Der Stein steht mittig, hochkant, die Aura darf die Box vergrößern, nichts berührt den Rand.

| Feld | Vorgabe |
|---|---|
| Zielpfad im Produkt | `apps/client/src/renderer/assets/items/<id>.webp` (Übergabe durch Claude nach Freigabe, nicht durch Mira) |
| Dateiformat | Lieferung: **PNG mit echtem Alpha**. Claude wandelt bei der Integration in WebP (Full-Res-Pipeline, wie bei allen Items). |
| Maße / Seitenverhältnis | **1024 × 1024 px**, quadratisch, Motiv mittig. Mindestens 512 laut Assetvertrag, wir nehmen die doppelte Reserve, weil Tooltips die Bilder groß zeigen. |
| Motivanteil | Steinkörper 80 bis 88 % der Kantenhöhe, Breite ergibt sich aus der Hochkant-Form (etwa 55 bis 70 %). Aura darf bis 92 % reichen. Die äußeren 32 px auf allen vier Seiten bleiben vollständig transparent (Alpha 0). |
| Hintergrund | Freisteller, echtes natives Alpha. Keine Bodenfläche, kein Schatten, kein Sockel. |
| Alpha-Erzeugung | Nativ im Quellbild. Kein Chroma-Key, kein Schachbrett, kein nachträgliches Keying. Glut-, Funken- und Nebelkanten halbtransparent auslaufen lassen. |
| Alpha-Rand / Beschnitt | Kein Farbsaum (Prüfung auf grellrosa Fläche). Nichts angeschnitten. |
| Farbraum | sRGB |
| Dateigrößenlimit | keines. Qualität vor Dateigröße. |
| Auto-Discovery / Namensschema | Dateiname = Item-ID, Kleinbuchstaben, Unterstriche. Waffe und Rüstung enden auf `_iv`, Schmuck ohne Tier-Suffix (siehe A3). Kein `final`, kein `v2`. |
| Muss vorhandenes Asset ersetzen? | nein |
| Quelldatei zusätzlich liefern? | ja: die unveränderte Roh-Ausgabe des Generators als `<id>-raw.png` in einem Unterordner `raw/`, damit Claude bei Bedarf neu zuschneiden kann |

## A8. Batch-Konsistenz

**Welche Merkmale müssen über den gesamten Batch identisch bleiben?**
Kamera (frontal, leichte Neigung), Maßstab (Stein 80 bis 88 % Höhe), Lichtrichtung (weiches Hauptlicht oben links, Glyph als eigene Lichtquelle), Materialwelt (dunkler Stein, Metall-Einfassung, Glut), Handmal-Look Ashen Iron, Transparenz, Position der IV.

**Welche Merkmale müssen Fortschritt oder Unterschiede zeigen?**
1. **Tier IV über Tier III:** kräftigere Glut mit weißglühendem Kern, ein feines Riss-Netz im Stein, das von innen leuchtet, eine Metall-Einfassung statt nur einer Gravurkante, größere aber kontrollierte Aura. Neben `rune_flame_iii` muss Tier IV sofort als höher lesbar sein, ohne den Stein zu überdecken.
2. **Drei Linien:** Waffe = roher, kantiger Basalt mit dunkler Bronze- oder Götzeneisen-Einfassung, Glut-Gold. Rüstung = flach behauener, grauer Granit mit genietetem Stahlband, Eis-Blau. Schmuck = derselbe Steinkörper, aber schmaler, feiner poliert, obsidianartig dunkel, mit feiner Silber-Filigran-Einlage, violettes Leerenglühen, keine Ziffer. Die Schmuck-Linie darf filigraner wirken, die Waffen-Linie roher, alle bleiben erkennbar eine Familie.
3. **Zwei Chase-Runen** (Gericht, Nachlese) dürfen die reichste Einfassung der jeweiligen Linie tragen. Gericht zusätzlich mit schwarzen Götzeneisen-Adern im Stein (Rezept braucht den Götzensplitter).

**Reihenfolge oder visuelle Hierarchie:**
Innerhalb einer Linie gleiche Intensität, nur die beiden Chase-Runen eine Spur reicher. Nicht 14 verschiedene Glut-Stärken.

## A9. Abnahme und Entscheidungsgrenzen

**Muss Chef oder Claude vor der finalen Generierung ein Konzept freigeben?**
Nein für den Batch. Empfohlen: die drei Anker (Gericht, Eiserne Antwort, Kopfgeld) kurz zeigen, bevor die restlichen elf laufen.

**Darf Mira technisch notwendige Korrekturen ohne Rückfrage durchführen?**
Ja, Standard: Zuschnitt, Zentrierung, Kantenkorrektur an halbtransparenten Glut-Rändern (nur aus Motivfarben), Skalierung auf 1024.

**Folgende Änderungen brauchen zwingend Auftraggeber-GO:**
Motivwechsel eines Glyphs, andere Linienfarbe, Ziffer auf Schmuck-Runen, Wegfall der IV auf Waffe oder Rüstung, Stilbruch gegenüber den Bestandsrunen, Teilbatch.

**Offene Entscheidungen, ohne die Mira nicht starten darf:**
Keine. Alles Nötige steht hier und in PROMPTS.md.

---

# Hausregeln (bindend, aus dem Projektgedächtnis)

1. **Echte Transparenz.** Alphakanal aus der Erzeugung, niemals ein gemaltes Schachbrett, kein Magenta-Key, kein nachträgliches Keying. Gemessen wird das Ergebnis auf grellrosa Grund.
2. **Runen dürfen glühen.** Das Glüh-Verbot gilt für Ausrüstung, nicht für Runen. Tier IV liegt sichtbar über Tier III, aber in derselben Bildsprache: gleicher Stein, gleiche Perspektive, gleiche Lichtrichtung. Keine neue Stilrichtung.
3. **Dark Fantasy.** Kein Comedy, keine Folklore-Klischees, kein Neon. Schmuck-Linie feiner, Waffen-Linie roher.
4. **Prompts sind vollständig.** Jeder Prompt nennt Material, Form, Gravur-Motiv, Glutfarbe, Sekundärfarbe und Verbote. Referenzbilder sind nur Stil-Kontrolle.
5. **Natürliche Texte** in allen Begleitdokumenten: höchstens ein Gedankenstrich pro Satz.
6. **Dateiname = Content-ID**, exakt wie in A3.

---

# Ablage der Lieferung

Gemäß `CODEX/RULES.md` (Staging unter `CODEX/assets/**`, produktive Übergabe erst nach Freigabe):

```
CODEX/assets/runen-tier-iv-2026-08-25/
  README.md              <- Auftrag, Prompt-Verweis, Lizenz-/Urheberstatus, Ziel-IDs, Maße, QA-Status
  fertig/                <- 14 finale PNGs, Dateiname exakt die ID
    rune_warpath_iv.png
    ...
    rune_gleaning.png
  raw/                   <- unveränderte Generator-Ausgaben als <id>-raw.png
  qa/                    <- Kontaktbogen auf Schwarz, Grau und Grellrosa; contact-sheet-neben-tier-iii.png; qa.json mit Maßen, Alpha-Werten und SHA-256
```

Danach `CODEX/HANDOFF.md` und `CODEX/WORKLOG.md` aktualisieren. Keine Datei nach `apps/client/src/renderer/assets/**` kopieren, das übernimmt Claude (asset-integrator) nach Prüfung.

---

# Abnahme-Kriterien (Claude prüft jede Datei)

1. Alphakanal vorhanden und benutzt. Äußere 32 px rundum Alpha 0. Kein Karo, kein Vollflächen-Hintergrund.
2. Kein Farbsaum auf grellrosa Fläche. Glut- und Nebelränder halbtransparent, keine harte Ein-Bit-Kante.
3. 1024 × 1024 px, PNG, sRGB. Steinkörper 80 bis 88 % der Höhe, mittig.
4. Dateiname exakt eine der 14 IDs aus A3, 14 Dateien, keine unerwartete.
5. Die IV auf allen neun Waffen- und Rüstungs-Runen, keine Ziffer auf den fünf Schmuck-Runen.
6. Linienfarbe stimmt: fünf Gold, vier Eis-Blau, fünf Violett. Auf dem Kontaktbogen bei 96 px sind die drei Gruppen ohne Beschriftung trennbar.
7. Jeder Bildanker aus A3 ist bei 64 px noch erkennbar (Kleintest).
8. Kontaktbogen neben `rune_flame_iii`, `rune_aegis_iii`, `rune_warding_iii`: gleiche Familie, sichtbar eine Stufe höher, kein Stilbruch.
9. Kein Text außer der IV, kein Wasserzeichen, kein Sockel, kein Schatten.
10. Roh-Dateien und qa.json vorhanden.

---

# Teil B – Designauflösung

<!-- codex:2026-08-25T10:30:00+02:00 -->

## B1. Verständnis des Auftrags

**Designziel in einem Satz:**  
Vierzehn neue Runen müssen als unmittelbare Fortsetzung der bestehenden Runenfamilie lesbar sein, wobei Tier IV die bisherige Stufung sichtbar übertrifft und die neue Schmuck-Linie eine feinere violette Schwesterfamilie bildet.

**Wichtigste visuelle Aussage:**  
Steinkörper, Linienfarbe und Glyph müssen bereits bei 64 bis 96 px gleichzeitig Rune, Linie und Effekt vermitteln.

**Annahmen von Mira:**  
Die Prompts in `PROMPTS.md` sind der unveränderte Motivvertrag. Die Bestandsrunen dienen ausschließlich als Stilreferenz. Die eingebettete römische IV ist bei Waffe und Rüstung erlaubter Bildinhalt und kein unerwünschter Fließtext.

**Gefundene Widersprüche oder fehlende Pflichtangaben:**  
Keine. Der aktuelle Chefauftrag weist Teil B bis D Mira zu. Teil D wird daher als vorbereiteter Abnahmestand dokumentiert, ohne ein GO im Namen von Chef oder Claude vorwegzunehmen.

## B2. Art Direction

| Bereich | Mira-Entscheidung |
|---|---|
| Stil | Handgemalte Ashen-Iron-Itemkunst mit grobem Stein, glaubwürdig eingelassenem Metall und kontrollierter magischer Glut. Keine neue Render- oder Mobile-Game-Richtung. |
| Komposition | Ein einzelner hochkant stehender Runenstein mittig auf transparentem Quadrat. Glyph zentral, IV bei Waffe und Rüstung klar getrennt darunter. |
| Kamera / Perspektive | Nahezu frontal mit leichter Neigung. Weiches Hauptlicht von oben links wie im Bestand. |
| Silhouette | Waffe roh und kantig, Rüstung flach behauen und genietet, Schmuck schmal und weich gerundet. Alle vollständigen Silhouetten bleiben innerhalb der Safe Area. |
| Materialwelt | Dunkler Basalt und Bronze für Waffe, grauer Granit und Stahl für Rüstung, polierter schwarzer Obsidian und Silberfiligran für Schmuck. |
| Palette | Waffen-Glut warmes Gold mit weißem Kern, Rüstung Eis-Blau mit weißem Kern, Schmuck tiefes Violett mit hellem Lilakern. Sekundärfarben bleiben je Prompt untergeordnet. |
| Licht | Steinlicht von oben links plus Glyph als zweite Lichtquelle. Tier IV ist heller als Tier III, ohne die Steinoberfläche auszubrennen. |
| Atmosphäre | Glutpartikel, Frostnebel oder Leerenschleier je Linie. Aura bleibt kontrolliert und halbtransparent. |
| Detailgrad | Hauptglyph auf 64 px lesbar, Metallrahmen und Rissnetz auf 96 px erkennbar, feinste Textur für Tooltipgröße reserviert. |
| Batch-Klammer | Gleicher Maßstab, gleiche vertikale Achse, identische Lichtrichtung, eine Glyphhierarchie und ein festes Verhältnis aus Stein, Einfassung, Rissnetz und Aura. |

## B3. Technische Produktionsspezifikation

| Feld | Finale Produktionsentscheidung |
|---|---|
| Arbeitsauflösung | Native Generatorausgabe, anschließend ausschließlich verlustfreie Skalierung und Zentrierung auf Zielmaß. Kein Keying. |
| Zielauflösung | 1024 × 1024 px |
| Zielformat | PNG, sRGB, vier Kanäle |
| Hintergrund / Alpha | Natives echtes Alpha. Volltransparente äußere 32 px, natürliche Teilalpha-Kanten für Glut, Frost und Nebel. |
| Bindende Content-ID / finaler Dateiname | Die 14 IDs aus A3, exakt und ohne Zusatz. |
| Native-Alpha-Produktionsweg bestätigt | ja, eingebautes ImageGen mit explizitem Transparenzvertrag |
| Beschnitt / Safe Area | Steinkörper 80 bis 88 % der Höhe, Aura höchstens 92 %, nichts berührt den Rand. |
| Namensschema | `<content_id>.png`, Waffe und Rüstung mit `_iv`, Schmuck ohne Ziffer im Namen und Bild. |
| Staging-Pfad | `CODEX/assets/runen-tier-iv-2026-08-25/` |
| Produktionspfad nach Freigabe | `apps/client/src/renderer/assets/items/<content_id>.webp`, Integration ausschließlich durch Claude. |
| Varianten- und Quellablage | Unveränderte Generatorausgaben in `raw/<content_id>-raw.png`, Finals in `fertig/`, Prüfbelege in `qa/`. |

## B4. Generierungsplan

**Methode:**  
Vierzehn einzelne Neugenerierungen mit eingebautem ImageGen. Referenzen werden als Stilkontrolle betrachtet. Die Roh-Alphas bleiben unverändert erhalten, Finals erhalten nur Maß-, Canvas- und motivfarbene Randkorrekturen ohne Freistellung.

**Konsistenzstrategie:**  
Fester Serienkern aus `PROMPTS.md`, identische Kamera-, Maßstab-, Licht- und Alpha-Vorgaben. Gericht, Eiserne Antwort und Kopfgeld bilden die drei Linienanker. Jede Folgerune wird gegen ihren Anker und die passende Tier-III-Referenz geprüft.

**Produktionsreihenfolge:**  
1. Gericht als Waffenanker, Eiserne Antwort als Rüstungsanker und Kopfgeld als Schmuckanker.
2. Native-Alpha-, 64-px- und Familienprüfung der drei Anker.
3. Restliche elf Runen gruppiert nach Waffe, Rüstung und Schmuck.
4. Verlustfreie Zielaufbereitung, drei Kontrast-Kontaktbögen, Tier-III-Vergleich und vollständige QA.

**Master-Prompt beziehungsweise unveränderlicher Prompt-Kern:**  
```text
One single upright Grim Reach enchantment runestone, isolated on a genuinely transparent square canvas. Original hand-painted Ashen Iron dark-fantasy item art, grounded medieval stone and metal, frontal view with a slight tilt, soft key light from the upper left, engraved glyph as the second light source. The slab fills 80 to 88 percent of the canvas height, aura may reach 92 percent, complete uncropped silhouette, outer 32 pixels transparent. Tier IV must visibly exceed tier III through a metal rim, white-cored glow, luminous hairline cracks and a controlled aura while preserving the established runestone body and perspective. No scene, floor, pedestal, shadow, frame, logo or watermark.
```

**Pflichtblock für jeden Grim-Reach-Freisteller:**  
```text
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark unless the brief explicitly requires it.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

**Asset-spezifische variable Prompt-Felder:**  
Content-ID, Linie, Glyph, Steinform, Metalltyp, Glutfarbe, Sekundärfarbe, IV-Regel und Chase-Veredelung gemäß dem jeweiligen Block in `PROMPTS.md`.

**Negativvorgaben:**  
```text
No checkerboard, chroma-key color, opaque background, floor, contact shadow, pedestal, scene, extra object, logo, watermark, stray text, duplicate glyph, extra numeral, cropped aura, neon saturation, plastic 3D render, generic mobile-game gloss or style drift from the existing Grim Reach rune family.
```

## B5. Prüfplan vor Produktion

- [x] CEO-Pflichtfelder ausreichend
- [x] `design/asset-anforderungen.md` vollständig gelesen
- [x] relevante Design- und Lore-Angaben aus Brief und Promptpaket gelesen
- [x] Ziel-Loader und Namensschema geprüft
- [x] exakte Content-ID und finaler Dateiname vor Generierung bestätigt
- [x] bei Freistellern ein echter nativer Alpha-Produktionsweg bestätigt, kein Keying eingeplant
- [x] bestehende Assets in echter Zielgröße betrachtet
- [x] Rechte- und Lizenzlage klar, ausschließlich Projektassets und originäre Generierung
- [x] Konflikte mit Claudes Revier oder laufender Arbeit ausgeschlossen, keine Renderer-Integration
- [x] Freigabe-Gate aus A9 erfüllt

# Teil C – Lieferung und QA

<!-- codex:2026-08-25T11:52:00+02:00 -->

## C1. Gelieferte Dateien

| # | Datei | Asset-ID | Maße / Format | Status | Produktionspfad |
|---:|---|---|---|---|---|
| 1 | `rune_warpath_iv.png` | `rune_warpath_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 2 | `rune_second_arrow_iv.png` | `rune_second_arrow_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 3 | `rune_thin_veil_iv.png` | `rune_thin_veil_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 4 | `rune_wasting_iv.png` | `rune_wasting_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 5 | `rune_judgement_iv.png` | `rune_judgement_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 6 | `rune_iron_answer_iv.png` | `rune_iron_answer_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 7 | `rune_ambush_iv.png` | `rune_ambush_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 8 | `rune_veil_drinker_iv.png` | `rune_veil_drinker_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 9 | `rune_unbroken_wall_iv.png` | `rune_unbroken_wall_iv` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 10 | `rune_bounty.png` | `rune_bounty` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 11 | `rune_tallyman.png` | `rune_tallyman` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 12 | `rune_restless.png` | `rune_restless` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 13 | `rune_chronicle.png` | `rune_chronicle` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |
| 14 | `rune_gleaning.png` | `rune_gleaning` | 1024 × 1024 PNG RGBA | Final | `CODEX/assets/runen-tier-iv-2026-08-25/fertig/` |

## C2. Visuelle QA

- [x] Motiv und Funktion auf 64 und 96 px erkennbar
- [x] Batch wirkt innerhalb der drei Linien wie aus einem Guss
- [x] Silhouette und Hauptkontrast funktionieren
- [x] Keine unerwünschten Texte, Logos oder Wasserzeichen
- [x] Keine sichtbaren Generierungsfehler an Stein, Einfassung oder Glyph
- [x] Keine abgeschnittenen wichtigen Formen
- [x] Alphakanal vorhanden und benutzt, kein Karo und kein Vollflächen-Hintergrund
- [x] Silhouette auf grellrosa Prüffläche ohne Farbsaum kontrolliert
- [x] Auflösungsuntergrenze aus `design/asset-anforderungen.md` erreicht
- [x] Dateiname entspricht exakt der Content-ID
- [x] Glühen bleibt auf die ausdrücklich freigegebenen Runen beschränkt
- [x] Blickrichtung ist für Runen nicht anwendbar
- [x] Farb- und Helligkeitswerte passen zum dunklen Gravewood-Kontext
- [x] Tier IV ist gegenüber Tier III sichtbar höher, aber systemtreu
- [x] 64- und 96-px-Vorschau sowie dunkle UI-Fläche geprüft

## C3. Technische QA

- [x] 14 exakte Dateinamen, keine fehlenden oder unerwarteten IDs
- [x] 1024 × 1024 px, PNG, sRGB, vier Kanäle
- [x] Echtes natives Alpha in allen 14 Rohbildern, keine Key-Matte und keine nachträgliche Freistellung
- [x] Äußere 32 px in allen Finals vollständig transparent
- [x] Steinkörper in allen Finals 80 bis 88 % der Bildhöhe
- [x] Neun `_iv`-Dateien und fünf Schmuckdateien ohne Tier-Suffix
- [x] Keine automatische Bindung aus dem Staging
- [x] Loader-Regel `assets/items/<itemId>.{png,webp}` verifiziert
- [x] Keine vorhandene Produktionsdatei überschrieben
- [x] Generator-Rohbilder, Promptpaket und Urheberstatus dokumentiert
- [x] Headless Asset-QA erfolgreich, Runtime-Build nicht erforderlich, da keine Runtime-Datei geändert wurde

## C4. Nachweis

**Preview- und Proof-Pfade:**  
`CODEX/assets/runen-tier-iv-2026-08-25/qa/contact-sheet-black.png`, `contact-sheet-gray.png`, `contact-sheet-magenta.png`, `contact-sheet-ui-64-96.png` und `contact-sheet-neben-tier-iii.png`.

**Ausgeführte Checks:**  
`prepare-and-qa.mjs` prüfte Zahl und Namen, Maße, PNG und sRGB, vier Kanäle, benutztes Alpha, Teilalpha, äußere 32 px, Steinkörper-Bounding-Box und SHA-256. Ergebnis in `qa/qa.json`: 14 von 14 bestanden.

**Bekannte Grenzen:**  
Die Bildmotive wurden visuell, nicht per OCR, auf IV und Ziffernfreiheit geprüft. Zwei technisch verworfene Gericht-Fassungen und vier verworfene Waffenfassungen mit gemaltem Karo liegen ausschließlich unter `CODEX/work/2026-08-25-runen-tier-iv/rejected-alpha/` und sind kein Lieferbestandteil.

**Mira-Empfehlung:**  
Gesamten Batch zur Claude-Gegenprüfung freigeben. Die drei Linien sind sauber getrennt und bleiben neben Tier III eindeutig dieselbe Runenfamilie.

**Empfohlener Claude-Owner für Gegenprüfung:**  
`asset-integrator`, danach `kontrolleur`.

# Teil D – Abnahme

<!-- codex:2026-08-25T11:00:35+02:00 -->

**Entscheidung:**  
GO. Der Chef hat die Lieferung mit 14 von 14 Runen angenommen.

**Gewählte Variante:**  
Vollständiger 14er-Batch unter `CODEX/assets/runen-tier-iv-2026-08-25/fertig/`.

**Verbindliche Korrekturen:**  
1. Keine.

**Darf danach integriert werden?**  
Ja. Die Integration als WebP mit 640 px, Renderer-Ablage und Archivierung der Originale läuft durch den zuständigen Agenten.

**Zielversion / Changelog-Zuordnung:**  
Runecrafting-Endgame im 1.0-Kurs, genaue Release-Zuordnung durch Chef oder Claude.

**Abnahme durch / Datum:**  
Chef, 2026-08-25. Gegenprüfung bestätigt RGBA 1024², vollständig transparenten Außenrand, Steinkörper mit 84 bis 90 % Höhe, keine Schachbrettsignale in opaken Zonen, exakte IDs, Tier-III-Familienbindung, klare Linienfarben und lesbare Glyphen.
