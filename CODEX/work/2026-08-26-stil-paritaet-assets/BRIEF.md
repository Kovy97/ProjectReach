# Asset-Brief — Stil-Parität: 45 Spiegel-Uniques und 2 Tonika (47 Bilder)

> **Auftrag:** Chef → Mira, vorbereitet von Claude am 26.08.2026.
> **Vorlage:** `CODEX/templates/ASSET-BRIEF.md`. Teil A ist ausgefüllt. Teil B, C und D füllt Mira.
> **Bindender Bildvertrag:** `design/asset-anforderungen.md` (Alpha, Auflösung, Benennung, Abnahme).
> **Prompts:** `CODEX/work/2026-08-26-stil-paritaet-assets/PROMPTS.md` (je Bild ein fertiger Prompt in Englisch).
> **Design-Quelle:** `design/stil-paritaet-2026-08-26.md` §4a (Werte, Quellen, Chancen).

---

# Teil A – Auftraggeber-Briefing

## A1. Auftrag

| Feld | Entscheidung |
|---|---|
| Arbeitstitel | Stil-Parität: Spiegel-Uniques für Fernkampf und Magie |
| Auftraggeber | Chef, Briefing durch Claude |
| Projekt | Grim Reach |
| Zielversion oder Meilenstein | 1.1.0 / 1.1.1 (Sofortmaßnahmen der Paritätsanalyse) |
| Priorität | P1. 47 Bilder, die größte Lieferung seit den Runen; Items laufen bis dahin mit Platzhalter. |
| Termin | so bald wie möglich; Reihenfolge A1 → A2 → A3 → A4 → A7 |
| Status | zur Produktion freigegeben |

## A2. Produktziel

**Was soll mit den Assets erreicht werden?**
Die Drop-Tabellen sind Nahkampf-Tabellen: 120 Nahkampf-Uniques gegen 39 Fernkampf und 36 Magie,
46 Monster droppen nur Nahkampf, von normalen Monstern fällt kein einziges Stoffteil. Diese 45 Stücke
spiegeln die Nahkampf-Drops für Fernkampf (Bögen, Leder) und Magie (Zauberstäbe, Stäbe, Foki, Stoff)
an genau den Monstern, die heute nur Nahkampf droppen, dazu zwei Tonika für die Support-Lücke.

**Wo sieht der Spieler sie?**
Beute-Popup, Inventar und Bank (48 bis 96 px), Item-Tooltip, Paperdoll, Item-Wiki (175 px), Bestiarium-Drops.

**Was muss der Spieler innerhalb der ersten Sekunde erkennen?**
1. Den Item-Typ (Bogen, Stab, Wams, Robe, Kappe, Sandale …) in derselben Perspektive wie die Bestandsstücke.
2. Die Herkunft: jedes Stück trägt das Material seines Monsters (Chitin, Moos, Knochen, Glutglas, Salz, Frost).
3. Die Seltenheit nur über Fassung und Detailgrad, nie über Glühen (Ausnahme: die zwei Tränke dürfen leicht glühen).

**Woran erkennt Claude, dass der Auftrag erfolgreich ist?**
47 Dateien mit exakten IDs, echtes Alpha, 1024 px; Kontaktbogen je Gruppe neben den Bestandsstücken
(Bögen neben `copper_shortbow`/`ranger_longbow`, Stäbe neben `gnarled_staff`, Leder neben
`cowhide_jerkin`, Stoff neben `silk_mantle`/`arcane_cape`, Tränke neben `tonic_stoneskin`).

## A3. Lieferumfang

Dateiname = Content-ID, `.png` mit echtem Alpha.

| # | Datei | Item (DE / EN) | Typ | Rarity | Herkunft | Prio |
|---:|---|---|---|---|---|---|
| 1 | `drovers_shortbow.png` | Treiber-Kurzbogen / Drover's Shortbow | shortbow | common | Weiden (Kuh) | P1 |
| 2 | `bullhorn_longbow.png` | Stierhorn-Langbogen / Bullhorn Longbow | longbow | rare | Weiden (Stier-Boss) | P1 |
| 3 | `marrow_shortbow.png` | Knochenmark-Kurzbogen / Marrow Shortbow | shortbow | rare | Slayer-Turm Etage 1 (Hohlmark) | P1 |
| 4 | `crossbower_warbow.png` | Kriegsbogen des Armbrustschützen / Crossbower's Warbow | longbow | rare | Grenzlande (Goblin-Armbrustschütze) | P1 |
| 5 | `chitin_recurve.png` | Chitin-Recurvebogen / Chitin Recurve | shortbow | superRare | Aschfelder (Pechkäfer) | P1 |
| 6 | `mossbound_longbow.png` | Moosgebundener Langbogen / Mossbound Longbow | longbow | superRare | Wildwald (Moosgolem) | P1 |
| 7 | `emberglass_shortbow.png` | Glutglas-Kurzbogen / Emberglass Shortbow | shortbow | superRare | Schlackengrube (Glutelementar) | P1 |
| 8 | `colossus_ribbow.png` | Kolossrippen-Bogen / Colossus Ribbow | shortbow | superRare | Slayer-Turm Etage 4 (Knochenkoloss) | P1 |
| 9 | `bonewrought_longbow.png` | Knochengeschmiedeter Langbogen / Bonewrought Longbow | longbow | superRare | Krypta (Skelett-Speerträger) | P1 |
| 10 | `butchers_hookbow.png` | Hakenbogen des Fleischhauers / Butcher's Hookbow | shortbow | superRare | Krypta (Skelett-Schlächter) | P1 |
| 11 | `impfire_wand.png` | Impfeuer-Zauberstab / Impfire Wand | wand | rare | Aschfelder (Imp) | P1 |
| 12 | `shaman_gnarlstaff.png` | Knorrenstab des Schamanen / Shaman's Gnarlstaff | staff | rare | Grenzlande (Goblin-Schamane) | P1 |
| 13 | `felmagician_rod.png` | Rute des Felmagiers / Felmagician's Rod | scepter | rare | Grenzlande (Goblin-Felmagier) | P1 |
| 14 | `stalker_bonewand.png` | Knochenstab des Pirschers / Stalker's Bonewand | wand | rare | Slayer-Turm Etage 2 (Knochenpirscher) | P1 |
| 15 | `drowned_choirstaff.png` | Chorstab der Ertrunkenen / Drowned Choirstaff | staff | epic | Küste (Riff-Ertrunkene) | P1 |
| 16 | `sentinel_core_wand.png` | Wächterkern-Zauberstab / Sentinel Core Wand | wand | epic | Krypta (Eiserner Wächter) | P1 |
| 17 | `felglass_orb.png` | Felglas-Kugel / Felglass Orb | focus | rare | Slayer-Turm Etage 2 (Aschfeld-Geist) | P1 |
| 18 | `dreadfang_fetish.png` | Schreckenszahn-Fetisch / Dreadfang Fetish | focus | superRare | Slayer-Turm Etage 4 (Schreckenszahn) | P1 |
| 19 | `goat_hide_jerkin.png` | Ziegenleder-Wams / Goat-Hide Jerkin | body leather | common | Weiden (Wildziege) | P1 |
| 20 | `rogue_hide_vambraces.png` | Armschienen des Halunken / Rogue's Hide Vambraces | gloves leather | common | Grenzlande (Goblin-Halunke) | P1 |
| 21 | `skirmisher_hide_jerkin.png` | Plänkler-Lederwams / Skirmisher's Jerkin | body leather | rare | Grenzlande (Goblin-Speerträger) | P1 |
| 22 | `butchers_hide_boots.png` | Lederstiefel des Schlächters / Butcher's Hide Boots | boots leather | rare | Grenzlande (Goblin-Schlächter) | P1 |
| 23 | `ratpelt_cap.png` | Rattenfell-Kappe / Ratpelt Cap | helmet leather | rare | Aschfelder (Aschratte) | P1 |
| 24 | `chitinweave_leggings.png` | Chitingeflecht-Beinlinge / Chitinweave Leggings | legs leather | superRare | Aschfelder (Pechkäfer) | P1 |
| 25 | `thornwolf_pelt_hood.png` | Dornenwolf-Fellkapuze / Thornwolf Pelt Hood | helmet leather | superRare | Wildwald (Dornenwolf) | P1 |
| 26 | `mossbound_treads.png` | Moosgebundene Tritte / Mossbound Treads | boots leather | superRare | Wildwald (Moosgolem) | P1 |
| 27 | `cryptstalker_vambraces.png` | Gruftpirscher-Armschienen / Cryptstalker Vambraces | gloves leather | superRare | Krypta (Skelettkrieger) | P1 |
| 28 | `butchers_hide_leggings.png` | Lederbeinlinen des Fleischhauers / Butcher's Hide Leggings | legs leather | superRare | Krypta (Skelett-Schlächter) | P1 |
| 29 | `roc_feather_cap.png` | Rochfeder-Kappe / Roc-Feather Cap | helmet leather | epic | Hochland (Roch) | P1 |
| 30 | `shamans_cowl.png` | Schamanen-Kapuze / Shaman's Cowl | helmet cloth | rare | Grenzlande (Goblin-Schamane) | P1 |
| 31 | `imp_hide_slippers.png` | Impleder-Schlappen / Imp-Hide Slippers | boots cloth | rare | Aschfelder (Imp) | P1 |
| 32 | `goblin_ragged_robe.png` | Zerlumpte Goblinrobe / Ragged Goblin Robe | body cloth | rare | Grenzlande (Goblin) | P1 |
| 33 | `felmagician_robe.png` | Robe des Felmagiers / Felmagician's Robe | body cloth | rare | Grenzlande (Goblin-Felmagier) | P1 |
| 34 | `stormcaller_sandals.png` | Sturmrufer-Sandalen / Stormcaller Sandals | boots cloth | rare | Grenzlande (Goblin-Sturmrufer) | P1 |
| 35 | `warlock_handwraps.png` | Handwickel des Hexers / Warlock's Handwraps | gloves cloth | rare | Grenzlande (Goblin-Hexer) | P1 |
| 36 | `ashtyrant_cinder_robe.png` | Aschenrobe des Aschtyrannen / Ash Tyrant's Cinder Robe | body cloth | superRare | Aschfelder (Aschtyrann) | P1 |
| 37 | `emberweave_cowl.png` | Glutgewebe-Kapuze / Emberweave Cowl | helmet cloth | superRare | Schlackengrube (Glutelementar) | P1 |
| 38 | `chanters_skirt.png` | Rock des Grabsängers / Chanter's Skirt | legs cloth | superRare | Krypta (Grabsänger) | P1 |
| 39 | `rootling_sap_sandals.png` | Wurzelsaft-Sandalen / Rootling-Sap Sandals | boots cloth | superRare | Wildwald (Wurzling) | P1 |
| 40 | `treemonster_bark_sandals.png` | Rindensandalen des Baumungetüms / Bark Sandals of the Treemonster | boots cloth | superRare | Wildwald (Baumungetüm) | P1 |
| 41 | `gravechant_vestment.png` | Grabgesang-Gewand / Gravechant Vestment | body cloth | superRare | Krypta (Skelett-Speerträger) | P1 |
| 42 | `hexed_bone_gloves.png` | Verhexte Knochenhandschuhe / Hexed Bone Gloves | gloves cloth | superRare | Krypta (Skelett-Schlächter) | P1 |
| 43 | `drowned_choir_mitre.png` | Mitra des Ertrunkenenchors / Drowned Choir Mitre | helmet cloth | epic | Küste (Riff-Ertrunkene) | P1 |
| 44 | `emberheart_robe.png` | Glutherz-Robe / Emberheart Robe | body cloth | epic | Schlackengrube (Glutelementar) | P1 |
| 45 | `hexer_frostweave_gloves.png` | Frostgewebe-Handschuhe des Hexers / Hexer's Frostweave Gloves | gloves cloth | epic | Frostkavernen (Frost-Hexer) | P1 |
| 46 | `tonic_windstride.png` | Windschritt-Tonikum / Windstride Tonic | potion | superRare | Kräuterkunde 38 | P1 |
| 47 | `tonic_wardveil.png` | Schleierhaut-Tonikum / Wardveil Tonic | potion | rare | Kräuterkunde 18 | P1 |

Lieferung nach `CODEX/assets/stil-paritaet-2026-08-26/fertig/` (plus `raw/` und `qa/`), gern in
Teil-Lieferungen je Gruppe (A1, A2, A3, A4, A7), danach HANDOFF und WORKLOG. Nichts in den Renderer
kopieren, den Einbau macht Claude.

## A4. Feste Auftraggeber-Entscheidungen

| Entscheidung | Wert |
|---|---|
| Format | PNG, 1024 × 1024, echtes Alpha aus der Erzeugung (kein Schachbrett, kein Magenta, kein nachträgliches Keying) |
| Perspektive | wie die Bestandsstücke desselben Typs: Bögen/Stäbe diagonal stehend, Rüstung hängend von vorn, Kappen dreiviertel, Stiefel/Sandalen paarweise, Foki und Tränke leicht von oben |
| Rarity | common/rare/superRare/epic nur über Fassung und Detailgrad; KEIN Glow auf Ausrüstung (Regel „kein Rarity-Glow"); Tränke dürfen leicht von innen glühen |
| Farbwelt | Ashen-Iron: gedeckt, körnig; Material des Quellmonsters als Akzent (Chitin schwarz-amber, Moos grün, Knochen elfenbein, Glutglas mit Ember-Pigment, Salz-Verdigris, Frost-Silber) |
| Verboten | Glühen auf Ausrüstung, Partikel, Text, Wasserzeichen, Hintergrund, Hände, Körper, Ständer |

## A5. Designer-Freiheit

Schnitt, Faltenwurf, Abnutzung, Position der Akzente; bei Bögen die Form der Nocken; bei Stoff, ob Ärmel oder Kapuze sichtbar sind. Varianten willkommen, aber nicht nötig.

## A6. Referenzen und Quellen

`apps/client/src/renderer/assets/items/`: Bögen `copper_shortbow.webp`, `ranger_longbow.webp`, `stolen_shortbow.webp`; Stäbe `gnarled_staff.webp`, `iron_staff.webp`; Zauberstäbe `iron_wand.webp`; Foki `iron_focus.webp`; Leder `cowhide_jerkin.webp`, `direhide_jerkin.webp`, `padfoot_boots.webp`; Stoff `silk_mantle.webp`, `arcane_cape.webp`, `aetherweave_leggings.webp`; Tränke `tonic_stoneskin.webp`, `tonic_keeneye.webp`. Monster-Palette: `assets/monsters/<id>.webp` (pitch_beetle, moss_golem, ember_elemental, reef_drowned, frost_hexer …). Falls eine Referenz-ID fehlt, nimm das nächstliegende Stück desselben Typs.

## A7. Technische Leitplanken

1024 × 1024 PNG, echtes Alpha, Motiv füllt 80 bis 90 % der Höhe, unten mittig ausgerichtet (`100% auto`, `bottom center`). Prüfung wie beim Jägerumhang (`prepare-and-qa.mjs`-Muster, Kontaktbogen je Gruppe).

## A8. Batch-Konsistenz

Fünf Gruppen, eine Serie: gleiche Lichtrichtung, gleiche Sättigung; innerhalb einer Gruppe gleiche Größe und Perspektive; Rarity-Stufen innerhalb einer Gruppe erkennbar gestaffelt (common schlicht → epic reich).

## A9. Abnahme und Entscheidungsgrenzen

Abnahme durch Claude (Kontaktbogen je Gruppe), Freigabe durch den Chef. Item-Werte, Namen und Quellen sind nicht Teil dieses Auftrags.

---

# Teil B – Designauflösung

<!-- codex:2026-08-26T10:35:00+02:00 -->

## B1. Gemeinsamer Serienguss

Alle 47 Motive werden als eine Ashen-Iron-Serie mit weichem Licht von oben links, gedeckter
Sättigung, körnigen Gebrauchsspuren und klaren 48-px-Silhouetten ausgeführt. Die Herkunft wird
über Material und einen kontrollierten Farbakzent erzählt, nicht über Effekte. Common bleibt
schlicht und funktional; rare erhält einen lesbaren Akzent; superRare verbindet zwei Materialien
und feinere Beschläge; epic ist innerhalb seines Typs am reichsten, bleibt aber gealtert.

## B2. Formsystem nach Gruppe

- **A1 Bögen:** vollständige gespannte Silhouette diagonal von unten links nach oben rechts;
  Kurzbögen kompakter und kräftiger, Langbögen höher und schlanker. Jeder Bogen muss mechanisch
  funktionsfähig sein: ein durchgehender symmetrisch belastbarer Stab, zwei plausible Wurfarme,
  eine gerade gespannte Sehne von Nocke zu Nocke und eine saubere Biegelinie um den Mittelgriff;
  keine dekorative S-Form, getrennten Wurfarme oder asymmetrischen Lastpfade. Materialmotive sind
  nur Beschlag und Verkleidung der funktionalen Grundform. Griff, beide Nocken und Sehne bleiben
  sichtbar. `ranger_longbow.webp` fehlt im Bestand; `copper_longbow.webp`,
  `iron_longbow.webp`, `spectral_longbow.webp` und `stagstride_longbow.webp` bilden den
  nächstliegenden Korridor.
- **A2 Magie:** Stäbe, Ruten und Zauberstäbe diagonal wie die Bögen, aber über Kopfstück und
  Griffmaß klar getrennt. Foki liegen frei und leicht von oben. Kein magisches Licht; Steine,
  Rauchglas und Pigmente bleiben materialgebunden und stumpf.
- **A3 Leder:** Wämser, Beinlinge und Armschienen frontal wie hängend; Kappen dreiviertel;
  Stiefel immer als vollständiges Paar. Material des Quellmonsters bleibt Beschlag oder Besatz,
  nicht die Silhouette einer echten Kreatur.
- **A4 Stoff:** Roben und Röcke frontal hängend, Handschuhe paarweise, Kapuzen und Mitra
  dreiviertel. Stoff bleibt deutlich weicher und leichter als Leder, ohne Körper oder Mannequin.
- **A7 Tonika:** je ein einzelnes verschlossenes Gefäß leicht von oben; nur die Flüssigkeit darf
  schwach von innen leuchten, ohne äußeren Halo oder Partikel.

## B3. Produktion und autonomes Qualitäts-Gate

Jedes Motiv wird einzeln mit seinem freigegebenen Prompt und einem strikten nativen-Alpha-Block
erzeugt. Die Gruppenfolge A1 → A2 → A3 → A4 → A7 bleibt als internes Konsistenz-Gate bestehen;
gemäß aktueller Chef-Anweisung läuft die Produktion jedoch ohne Zwischenfreigabe bis 47/47 durch.
Erzeugungen mit Schachbrett, Hintergrundfläche, abgeschnittener Hauptsilhouette, Ausrüstungs-Glow,
falscher Objektanzahl oder unpassender Typ-Perspektive werden selbstständig verworfen und ersetzt.
Kein Chroma-Key, keine Matte und kein nachträgliches Freistellen.

## B4. Aufbereitung und Abnahmebild

Angenommene Generatorausgaben werden unverändert unter `raw/` archiviert. Finals werden nur über
den vorhandenen Alphakanal zugeschnitten, proportional auf 80 bis 90 Prozent Motivhöhe skaliert
und unten mittig auf transparentem 1024er-Canvas platziert. Für jede Gruppe entstehen ein
Bestandsvergleich, ein Serienbogen, Schwarz-/Grau-/Grellrosa-Kantenprüfungen und eine
48-/96-/175-px-Lesbarkeitsprobe; Einzelwerte und SHA-256 stehen in `qa/qa.json`.

# Teil C – Lieferung und QA
_(Mira)_

<!-- codex:2026-08-26T14:18:00+02:00 -->

- Lieferung vollständig: 47/47 Finals unter
  `CODEX/assets/stil-paritaet-2026-08-26/fertig/`, exakt nach den Content-IDs benannt.
- Gruppen vollständig: A1 10, A2 8, A3 11, A4 16, A7 2. Dieselben 47 angenommenen
  Generatorausgaben liegen unverändert als `<Content-ID>-raw.png` unter `raw/`.
- Erzeugung mit eingebautem ImageGen im Standardmodus und nativem Alpha. Kein Keying, keine
  Matte, kein Despill, kein Freistellen. Aufbereitung nur über vorhandenes Alpha: transparenter
  Zuschnitt, proportionale Skalierung und Bottom-Center-Platzierung.
- Automatische Endprüfung: alle Finals 1024 × 1024 sRGB-RGBA, Alpha 0 bis 255, äußerer
  16-px-Rand vollständig Alpha 0, Motivhöhe 850 bis 880 px. Keine fehlenden oder zusätzlichen
  Dateien. SHA-256 und Einzelmaße stehen in `qa/qa.json`.
- Je Gruppe vorhanden: Serienbogen auf Transparent, Schwarz, Grau und Grellrosa,
  Bestandsvergleich sowie 48-/96-/175-px-Lesbarkeitsprobe. Die Bögen wurden zusätzlich
  vergrößert auf mechanische Plausibilität geprüft.
- Nach Chef-Hinweis wurde A1 vollständig neu gegossen. Alle zehn angenommenen Bögen besitzen
  einen durchgehenden tragenden Stab, ausbalancierte Wurfarme, klare Nocken und genau eine gerade
  gespannte Sehne von Nocke zu Nocke; keine S-Waffen, gespaltenen Wurfarme oder Dekorsehnen.
- Drei technisch saubere, aber zu breit komponierte A4-Rohfassungen wurden kompakter neu erzeugt,
  damit auch `imp_hide_slippers`, `stormcaller_sandals` und `warlock_handwraps` den Höhenkorridor
  erfüllen. Nur die angenommenen Fassungen liegen in `raw/` und `fertig/`.
- Visuelle Prüfung: gemeinsames Licht oben links, gedämpfte Ashen-Iron-Sättigung,
  typgerechte Perspektiven und nachvollziehbare Rarity-Staffelung. Kein Glühen, keine Partikel
  oder Aura auf Ausrüstung; nur schwaches inneres Flüssigkeitslicht bei beiden Tonika.
- Keine Renderer-, Content-, Save-, i18n- oder `.claude/**`-Datei verändert.

# Teil D – Abnahme
_(Claude, dann Chef)_

<!-- codex:2026-08-26T14:18:00+02:00 -->

- Mira Produktions-/QA-Gate: **GO** — 47/47 vollständig, technische und visuelle Eigenprüfung
  bestanden.
- Claude Gegenprüfung: **ausstehend**.
- Chef-Freigabe: **ausstehend**.
