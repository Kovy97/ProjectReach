# Codex-Auftrag: Painterly-UI, Rahmenfamilie, Vielfalt und Discord

<!-- claude:2026-10-25T12:42:00+01:00 -->

Grundlage: `BESTANDSAUFNAHME.md` im selben Ordner (Befunde und Bildbelege). Der Auftragstext unten wird 1:1 kopiert.

Vor dem Absenden mit dem Chef klären:
- F7 (Seitenleisten-Holzleiste) und F8 (Item-Slot) berühren Chef-Entscheide vom 19.10. Nur als Vergleichsangebot
  drin; streichen, wenn er nicht vergleichen will.
- D5 (Seltenheits-Steine für Discord) berührt die Regel „Raritätsfarben nie als Item-Farbgebung“; nur mit Chef-GO.
- Die Musterrunde (Schritt 1 unten) ist Absicht: Der Chef ist bei Rahmen kritisch und soll vor der Vollproduktion
  entscheiden.

## Auftragstext für Codex

```text
Hallo Mira, der Chef ist mit unseren Rahmen noch nicht glücklich und möchte mehr gemalte Painterly-Vielfalt.
Hier ist das nächste Paket: zuerst eine einheitliche Rahmenfamilie, danach Seitenwand, Menü-Kulisse,
Embleme, drei Icons, drei Skill-Kulissen als Pilot und ein paar Motive für unseren neuen Discord-Server.

LIEFERUNG
- Staging nach CODEX/assets/2026-10-25-painterly-ui/delivery/ mit Unterordnern frames/, textures/,
  backdrops/, emblems/, icons/, skill-backgrounds/, discord/.
- LIEFERUNG.md ist Pflicht: je Datei Dateiname, Maße, Alpha ja/nein, Slice-Maße (bei Rahmen), QA-Notiz,
  Verweis auf Raw/Prompt.
- Keine Runtime-Integration. Nichts unter apps/** anlegen, überschreiben, verschieben oder löschen. Die
  Zielpfade unten sind nur für unseren späteren Einbau. Alte Dateien bleiben immer erhalten. Bei Ersatz
  eines Bestands gilt der genannte Ersatzname.
- Raw-Ausgaben und exakte Prompts wie gewohnt in CODEX/work/2026-10-25-painterly-ui/ sichern.
- Die laufende Zonen-Kampfkulissen-Serie bleibt davon unberührt. Hier sind keine Zonen- oder Dungeon-
  Kulissen bestellt.

STIL (verbindlich, wie bei der Zonen-Korrektur)
Stilreferenz ist das gemalte Reforged-Hauptmenü apps/client/src/renderer/assets/ui/mainmenu_highlands_1920.webp
(und _3440), für Metall zusätzlich das gemalte Logo ui/mainmenu_logo_painterly.webp. Merkmale: breite,
kantige, sichtbare Pinselzüge, gebrochene überlappende Farbflecken, große vereinfachte Licht- und
Schattenmassen, selektive Kanten. Kein fotografisches Mikrokorn, kein Leinwandfilter, kein Rückfall in die
alte detailliert gerenderte Dark-Fantasy-Optik. Die Pinselführung muss auch in Zielgröße erkennbar sein,
die Silhouetten bleiben dabei sauber und ruhig.

ALLGEMEINE REGELN
- Freigestellte Teile mit ECHTEM nativem Alpha direkt aus der Erzeugung. Kein Schachbrett, kein Farb- oder
  Chroma-Key-Hintergrund, kein nachträgliches Freistellen, kein Despill.
- Rahmen dürfen aus gemalten Teilen derselben Erzeugung zusammengesetzt werden: verlustfrei zuschneiden,
  spiegeln, Kantensegmente kacheln. Kein Übermalen per Filter, keine Alpha-Nachbearbeitung.
- Kein Glühen, kein Schimmer, keine Aura, keine Lichtstrahlen, keine Funken. Metall und Edelsteine
  reflektieren nur Licht, sie leuchten nicht.
- Kein Text, keine Buchstaben, keine Zahlen, keine Wappen mit Schrift, keine Signatur, kein Wasserzeichen.
- Bildqualität vor Dateigröße. PNG-Master verlustfrei; wir erzeugen WebP selbst.
- Vor der Produktion je Motiv die genannten Bestandsnachbarn ansehen.

RAHMEN: GEMEINSAMER VERTRAG (gilt für F1 bis F10)
- Zwei Materialien, eine Formensprache.
  - Holz = dunkle, geölte Schwarzeiche (warmbraun, nicht grau) für Behälter: Panel, Karte, Dialog.
  - Eisen = geschwärzter, leicht blauer Schmiedestahl für alles Klickbare: Knopf, Reiter, Slot, Balken,
    Schließen-Knopf, sowie die Item-Karte.
  - Bindeglied: dieselben gedrungenen Bronzenieten und dieselbe Art geschmiedeter Eckbeschläge an beiden
    Materialien.
- Licht weich und frontal von oben vorne, an allen vier Seiten gleichmäßig. Der Außengrat hat überall die
  gleiche helle Kante, damit gespiegelte Ecken korrekt aussehen.
- 9-Slice exakt:
  - Bildgröße genau wie angegeben.
  - Slice-Maß an allen Seiten gleich, außer wo anders genannt.
  - Das Eckornament liegt vollständig im Slice-Quadrat.
  - Über die Slice-Linie läuft nur der durchgehende Balken bzw. das Band.
  - Das Kantensegment zwischen den Slice-Linien muss nahtlos an sich selbst anschließen (CSS nutzt
    "round"): Anfang und Ende passen in Maserung, Farbe und Helligkeit.
  - Keine einmaligen Merkmale wie Astloch, Kerbe oder Riss auf den Kanten, die sich sichtbar wiederholen
    würden.
- Mitte exakt Alpha 0, außer bei F9. Außen kein Schlagschatten und kein Halo; der Außenrand läuft
  höchstens 2 px weich aus.
- Keine Perspektive, alles frontal und flach.
- QA je Rahmen: PREVIEW.html mit den angegebenen CSS-Zeilen (border-image) bauen und ansehen:
  - Größen 120×40, 320×120, 900×600 px,
  - auf texture-basalt.webp und bg_tileable_wood.webp,
  - bei 100 % und 200 % Zoom.
  - Zusätzlich das Kantensegment 3× nebeneinander kacheln (Nahtprüfung) und neben den Bestandsrahmen
    legen.
- Bestandsnachbarn für alle Rahmen:
  ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp (heutiger Hauptrahmen: Rolle, aber zu
  schwach), ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp (heutiger Knopfrahmen),
  ui/gravewood/frames/wood-frame-strip.webp (Seitenleiste, Chef-Preset), Füllflächen
  ui/gravewood/v3/textures/texture-basalt.webp und ui/gravewood/textures/texture-nav-wood2.webp.
- Neuer Zielordner für alle Rahmen: apps/client/src/renderer/assets/ui/gravewood/v4/frames/

----------------------------------------------------------------------------------------------------

F1) Panel-Rahmen (große Spalten und Seitencontainer)
   Datei: frame-panel-oak.png -> ui/gravewood/v4/frames/frame-panel-oak.webp
   Format: 768 x 768, RGBA, Mitte Alpha 0. Slice 96 an allen Seiten. Holzband ca. 64-72 px breit,
   äußerste 8-12 px dürfen transparent sein. Ziel-CSS: border-image: url(...) 96 / 18px round;
   (Darstellung 14-24 px).
   Ecke: geschmiedeter L-Eckbeschlag aus Eisen mit zwei Bronzenieten, vollständig im 96er-Quadrat.

   Use case: new painted 9-slice UI frame for a dark-fantasy idle RPG, replacing a weak existing frame.
   Asset type: Grim Reach game UI frame, flat front view, one square frame, genuinely transparent canvas
   with a real native alpha channel; the inner area is fully empty and transparent.
   Scene/backdrop: none; transparent background and transparent centre. No painted checkerboard, no
   opaque or chroma-key background, no later keying.
   Subject: A sturdy rectangular frame of dark oiled blackoak beams, warm deep brown, with long straight
   grain running along each beam, slightly worn outer edges, and a forged blackened-iron L-shaped corner
   bracket at each of the four corners, each bracket held by two squat bronze rivets.
   Composition/framing: Perfectly frontal and square, beams of exactly equal width on all four sides (about
   70 px on a 768 px canvas), mitred corners hidden under the iron brackets, the brackets confined to the
   outer 96 x 96 px of each corner; straight beams between the corners with uniform, featureless grain so
   they can repeat seamlessly.
   Palette/materials/lighting: Deep warm brown oak (not grey), blackened steel with cool blue-grey
   highlights, dull bronze rivets. Soft frontal top light, the same bright bevel on the outer edge on every
   side, no cast shadow.
   Style/medium: hand-painted painterly game art with broad, angular, visible brush strokes and simplified
   light and shadow masses, like the Grim Reach painted main menu; clean silhouette, no photographic micro
   texture, no canvas filter.
   Output intent: transparent PNG frame, exactly 768 x 768 px, 9-slice ready with slice 96 on all sides.
   Do not add: text, symbols, gems, glow, sparkles, perspective, drop shadow, knots or scratches that
   would repeat visibly, anything inside the opening.
   Reference matching: role like ui/citadel/9-slice-box-3/wooden_frame_with_corners_seamless.webp but much
   richer and warmer; brush handling like ui/mainmenu_highlands_1920.webp; iron like
   ui/mainmenu_logo_painterly.webp without its red gems.

F2) Karten-Rahmen (Skill-Aktionskarten, Monster-, Zonen-, Listenkarten) + Auswahlvariante
   Dateien: frame-card-oak.png und frame-card-oak-selected.png -> ui/gravewood/v4/frames/
   Format: je 512 x 512, RGBA, Mitte Alpha 0. Slice 64, Band ca. 40-44 px. Ziel-CSS: 64 / 10px round;
   (Darstellung 8-12 px).
   Ecke: kleine quadratische Eisenkappe mit einer Niete, ohne Arme.
   Variante "selected": identische Geometrie (deckungsgleich), zusätzlich eine dünne Messing-Einlegelinie
   innen am Band, kein Leuchten.

   Use case: new painted 9-slice card frame, lighter sibling of the panel frame F1.
   Asset type: Grim Reach game UI frame, flat front view, genuinely transparent canvas with a real native
   alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A slimmer rectangular frame of the same dark oiled blackoak as F1, with fine lengthwise grain,
   and a small square blackened-iron corner cap with one bronze rivet at each corner.
   Composition/framing: Frontal, square, equal band width on all sides (about 42 px on 512 px), caps
   inside the outer 64 x 64 px of each corner, straight seamless beams between them.
   Palette/materials/lighting: Warm dark brown oak, blackened steel caps, dull bronze rivets; soft frontal
   top light, identical outer bevel highlight on every side. For the selected variant, add a thin
   polished brass inlay line along the inner edge of the band, reflecting light only.
   Style/medium: same painterly brushwork as F1, simplified and readable at a 10 px band width.
   Output intent: two transparent PNGs, exactly 512 x 512 px, slice 64, pixel-identical geometry between
   the two.
   Do not add: text, glow, gems, ornaments on the edges, perspective, drop shadow, anything inside the opening.
   Reference matching: material identical to F1; card role like the current skill action cards in
   apps/client/src/renderer/styles/skills.css (wooden_frame_with_corners_seamless.webp).

F3) Dialog-/Modal-Rahmen (Bestätigungen, Beute zerlegen, Kauf, Kampf-Beutefenster, Zeremonien)
   Datei: frame-dialog-oak.png -> ui/gravewood/v4/frames/frame-dialog-oak.webp
   Format: 1024 x 1024, RGBA, Mitte Alpha 0. Slice 144, Band ca. 100-110 px. Ziel-CSS: 144 / 30px round;
   (Darstellung 24-36 px).
   Ecke: große Eisen-Eckplatte mit geschmiedetem Rundbuckel (Bossniet) und zwei kleineren Nieten.

   Use case: new painted 9-slice frame for modal dialogs, the heaviest member of the frame family.
   Asset type: Grim Reach game UI frame, flat front view, genuinely transparent canvas with a real native
   alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A heavy double frame: an outer beam of dark oiled blackoak and, along its inner edge, a narrow
   blackened-iron strap fixed with small bronze rivets at regular spacing. At each corner a broad forged
   iron corner plate with a domed boss rivet in the middle and two smaller rivets.
   Composition/framing: Frontal, square, equal band width on all sides (about 105 px on 1024 px), corner
   plates inside the outer 144 x 144 px, rivets on the straight strap at a spacing that divides the edge
   segment evenly so the edge repeats seamlessly.
   Palette/materials/lighting: Warm dark oak, blue-black steel, dull bronze; soft frontal top light, equal
   outer bevel on every side.
   Style/medium: same painterly brushwork as F1 and F2.
   Output intent: transparent PNG, exactly 1024 x 1024 px, slice 144.
   Do not add: text, crests, gems, glow, chains, perspective, drop shadow, anything inside the opening.
   Reference matching: same oak as F1, same rivets as F2; must read clearly heavier than F1 so a dialog
   never looks like a card.

F4) Item-Karte / Tooltip-Rahmen
   Datei: frame-tooltip-iron.png -> ui/gravewood/v4/frames/frame-tooltip-iron.webp
   Format: 512 x 512, RGBA, Mitte Alpha 0. Slice 56, Band ca. 32-36 px. Ziel-CSS: 56 / 8px round;
   (Darstellung 6-9 px).
   Ecke: kleine Eisen-Eckniete. Das Band ist Eisen statt Holz, damit die schwebende Item-Karte sich von
   Karten im Raster abhebt.

   Use case: new painted 9-slice frame for floating item cards and tooltips.
   Asset type: Grim Reach game UI frame, flat front view, genuinely transparent canvas with a real native
   alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A thin band of blackened forged steel with a fine bronze inner bevel line and a single small
   bronze rivet at each corner.
   Composition/framing: Frontal, square, equal band width (about 34 px on 512 px), rivets inside the outer
   56 x 56 px, plain seamless straight edges.
   Palette/materials/lighting: Blue-black steel, thin warm bronze inner line; soft frontal top light,
   equal outer bevel highlight on every side.
   Style/medium: painterly brushwork like F1, kept very calm because it is drawn at 8 px.
   Output intent: transparent PNG, exactly 512 x 512 px, slice 56.
   Do not add: text, glow, gems, ornaments, perspective, drop shadow, anything inside the opening.
   Reference matching: steel like the button frame F5; scale between F2 and the old tooltip
   ui/citadel/tooltip/tt_texture.webp.

F5) Standard-Knopf (.btn-iron) in fünf Zuständen
   Dateien: button-iron-normal.png, button-iron-hover.png, button-iron-pressed.png,
            button-iron-disabled.png, button-iron-selected.png -> ui/gravewood/v4/frames/
   Format: je 768 x 256, RGBA, Mitte Alpha 0 (die Fläche malt das CSS mit texture-basalt). Slice 64 an
   allen Seiten, Band ca. 40-44 px. Ziel-CSS: border: 8px solid transparent; border-image: url(...) 64
   fill / 16px round; (Darstellung 12-17 px, auch auf Mengenknöpfen mit ca. 70 x 28 px).
   Chef-Regel: "Knopf" heißt immer Stahlrahmen. Bitte zuerst NORMAL erzeugen und prüfen. Die übrigen vier
   Zustände sind Bild-Edits von NORMAL mit pixelgleicher Geometrie; nur Licht und Material ändern sich,
   damit beim Zustandswechsel nichts springt.
   Wichtig: Die heutigen hellen Diagonal-Gehrungen in den Ecken wirken auf kleinen Knöpfen unruhig
   (Beleg design/painterly-assets-2026-10-25/crops/f03_eisenknopf_kaempfen.png). Ecken daher ruhig:
   abgeschrägte Eisenecke mit einer Bronzeniete, keine hellen Diagonalen.

   Use case: new painted 9-slice frame for the game's standard button, five interaction states.
   Asset type: Grim Reach game UI button frame, flat front view, genuinely transparent canvas with a real
   native alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A forged blackened-steel button rim with slightly chamfered corners, each corner holding one
   squat bronze rivet, straight hammered steel edges between the corners.
   Composition/framing: Frontal, wide rectangle 768 x 256, equal band width on all sides (about 42 px),
   corner details inside the outer 64 x 64 px, plain seamless straight edges.
   Palette/materials/lighting:
   NORMAL: cool blue-black steel, restrained grey highlights, dull bronze rivets.
   HOVER: same, with warmer reflected light on the upper edge and slightly brighter rivets, no glow.
   PRESSED: inverted bevel; highlights move to the lower edge, upper edge in shadow, overall a little
   darker.
   DISABLED: dull grey steel, desaturated, faint rust specks, lower contrast.
   SELECTED: like NORMAL plus a thin polished brass trim line along the inner edge, no glow.
   Soft frontal top light for every state except the deliberate inversion in PRESSED.
   Style/medium: painterly brushwork like F1, simplified for readability at 12-17 px band width.
   Output intent: five transparent PNGs, exactly 768 x 256 px each, slice 64, pixel-identical geometry.
   Do not add: text, icons, glow, sparkles, gems, diagonal corner highlights, perspective, drop shadow,
   anything inside the opening.
   Reference matching: role of ui/gravewood/frames/nav-bronze-lipped-iron-9slice.webp; steel as in
   ui/mainmenu_logo_painterly.webp without red gems; rivets identical to F2-F4.

F6) Reiter (Ausrüstung/Werte, Kampf/Beute, Filterreiter Bank/Laden)
   Dateien: tab-iron-inactive.png, tab-iron-active.png -> ui/gravewood/v4/frames/
   Format: je 768 x 192, RGBA, Mitte Alpha 0. Slice 56 oben, links und rechts, 24 unten (unten nur eine
   flache Lippe). Ziel-CSS: 56 56 24 56 / 10px 10px 4px 10px round;
   Aktiv: deckungsgleich, Oberkante mit Messingborte, insgesamt heller; Inaktiv: gedämpft, etwas dunkler.

   Use case: new painted 9-slice tab frame, two states.
   Asset type: Grim Reach game UI tab frame, flat front view, genuinely transparent canvas with a real
   native alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A blackened-steel tab rim, slightly chamfered upper corners with one small bronze rivet each,
   a thin flat steel lip along the bottom.
   Composition/framing: Frontal, 768 x 192, band about 36 px on top and sides and 14 px at the bottom,
   corner details inside 56 x 56 px, seamless straight edges.
   Palette/materials/lighting: INACTIVE: muted blue-black steel, low contrast. ACTIVE: same geometry,
   brighter steel and a thin polished brass trim along the top edge, reflecting light only. Soft frontal
   top light.
   Style/medium: painterly brushwork like F5.
   Output intent: two transparent PNGs, exactly 768 x 192 px, pixel-identical geometry.
   Do not add: text, glow, gems, perspective, drop shadow, anything inside the opening.
   Reference matching: steel and rivets identical to F5; the role of the tabs in
   apps/client/src/renderer/styles/character.css (Ausrüstung/Werte).

F7) OPTIONAL, nur Vergleichsangebot: Seiten-/Kopfleisten-Holzleiste
   Hinweis: Der Chef hat am 19.10. die heutige Leiste per Knopf-Editor gewählt
   (ui/gravewood/frames/wood-frame-strip.webp). Das hier ist nur ein Angebot zum Vergleich.
   Dateien: nav-strip-oak-normal.png, nav-strip-oak-active.png -> ui/gravewood/v4/frames/
   Format: je 1024 x 192, RGBA, Mitte Alpha 0. Slice 48, Band ca. 32 px. Ziel-CSS: 48 / 6px round;

   Use case: optional painted alternative for the sidebar and top-bar button rim.
   Asset type: Grim Reach game UI frame, flat front view, genuinely transparent canvas with a real native
   alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A slim rim of the same dark blackoak as F1 with tiny bronze rivets at the four corners.
   ACTIVE: identical geometry with a thin brass inlay line along the inner edge.
   Composition/framing: Frontal, 1024 x 192, equal band width, corners inside 48 x 48 px, seamless
   edges.
   Palette/materials/lighting: warm dark oak, bronze; soft frontal top light.
   Style/medium: painterly brushwork like F1.
   Output intent: two transparent PNGs, exactly 1024 x 192 px.
   Do not add: text, glow, perspective, drop shadow, anything inside the opening.
   Reference matching: role of ui/gravewood/frames/wood-frame-strip.webp; material identical to F1.

F8) OPTIONAL, nur Vergleichsangebot: Item-Slot
   Hinweis: Der Chef hat am 19.10. die alten Inventar-Slots zurückgewünscht. Das hier ist nur ein Angebot.
   Dateien: slot-iron.png, slot-iron-selected.png -> ui/gravewood/v4/frames/
   Format: je 256 x 256, RGBA, Mitte Alpha 0. Slice 48, Band ca. 24 px. Ziel-CSS: 48 / 8px stretch;

   Use case: optional painted item slot frame.
   Asset type: Grim Reach game UI slot frame, flat front view, genuinely transparent canvas with a real
   native alpha channel, empty transparent centre.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A square blackened-steel slot rim with small bronze corner caps, slightly recessed inner
   bevel. SELECTED: identical geometry with a brass inner trim line.
   Composition/framing: Frontal, square, equal band width, caps inside 48 x 48 px.
   Palette/materials/lighting: blue-black steel, bronze; soft frontal top light.
   Style/medium: painterly brushwork like F5, very calm.
   Output intent: two transparent PNGs, exactly 256 x 256 px.
   Do not add: text, glow, perspective, drop shadow, anything inside the opening.
   Reference matching: shape language of the current slots in the character page
   (ui/citadel/box-inventory/slot_universal.webp, bronze corner caps), steel identical to F5.

F9) Fortschrittsbalken: Schiene + vier Füllungen
   Dateien:
   progress-track-iron.png        1024 x 64, RGBA. 3-Slice horizontal: Kappen 48 px links/rechts, Mitte
                                  nahtlos. Rinne innen deckend dunkel gemalt (Alpha 255), Außenkontur
                                  native Alpha. Ziel-CSS: 0 48 0 48 / 0 10px 0 10px round;
   progress-fill-xp.png           512 x 32, RGBA mit Alpha 255, horizontal nahtlos kachelbar
   progress-fill-hp.png           512 x 32, wie oben
   progress-fill-ward.png         512 x 32, wie oben
   progress-fill-neutral.png      512 x 32, wie oben
   -> ui/gravewood/v4/frames/

   Track-Prompt:
   Use case: new painted progress bar track for XP, health, ward and timers.
   Asset type: Grim Reach game UI bar track, flat front view, genuinely transparent canvas with a real
   native alpha channel outside the bar.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: A long, narrow, recessed groove set in a blackened-steel rim, with a rounded forged end cap
   and one bronze rivet at each end; the groove interior is a deep, almost black, opaque channel.
   Composition/framing: Frontal, 1024 x 64, end caps within the outer 48 px on each side, a perfectly
   uniform, seamlessly repeating middle section.
   Palette/materials/lighting: blue-black steel, bronze rivets, near-black groove; soft frontal top light.
   Style/medium: painterly brushwork like F5, very calm.
   Output intent: transparent PNG, exactly 1024 x 64 px.
   Do not add: text, tick marks, glow, perspective, drop shadow.
   Reference matching: steel identical to F5; role of ui/gravewood/progress/progress-track.webp.

   Fill-Prompt (gleiche Zeilen für alle vier, nur Farbe tauschen):
   Use case: seamless painted fill strip for progress bars.
   Asset type: Grim Reach UI bar fill texture, fully opaque strip.
   Scene/backdrop: none; the strip itself fills the whole image.
   Subject: A horizontal band of thick painted pigment with a soft lighter streak along the upper third
   and a darker lower edge, like enamel poured into a metal groove.
   Composition/framing: 512 x 32, horizontally seamless (left and right ends match exactly), no single
   feature that repeats visibly.
   Palette/materials/lighting:
   XP: amber-gold to deep ochre. HP: deep blood red to dark crimson. WARD: violet blending into cold teal,
   like the current ward bar. NEUTRAL: dull bronze.
   Reflected light only.
   Style/medium: painterly brushwork with broad, visible strokes along the length of the strip.
   Output intent: opaque PNG, exactly 512 x 32 px, seamless horizontally.
   Do not add: text, ticks, glow, sparkles, bubbles, gradients to transparency.
   Reference matching: colour roles of the current CSS bars (screenshot
   design/painterly-assets-2026-10-25/crops/f13_kampf_beutefenster.png and the HP/ward bars on the
   character page).

F10) Schließen- und Hilfe-Knopf (ersetzt die rote Citadel-Glaskugel mit 25 x 25 px)
   Dateien: button-close-iron-normal.png, button-close-iron-hover.png, button-close-iron-pressed.png,
            button-help-iron-normal.png, button-help-iron-hover.png -> ui/gravewood/v4/frames/
   Format: je 192 x 192, RGBA, natives Alpha, rund. Darstellung 22-28 px. Hover und pressed sind
   pixelgleiche Bild-Edits von normal.
   Beleg: design/painterly-assets-2026-10-25/crops/f11_dialog_schliessen_knopf.png

   Use case: new painted round close and help buttons for dialogs and item cards.
   Asset type: Grim Reach game UI button, single round object, genuinely transparent canvas with a real
   native alpha channel.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Subject: CLOSE: a round blackened-steel boss with a bronze rim, bearing two crossed forged iron nails
   forming an X. HELP: the same boss bearing a small forged iron hook shaped like a question mark.
   Composition/framing: Frontal, centred, filling about 88 % of the canvas, readable at 24 px.
   Palette/materials/lighting: blue-black steel, bronze rim; soft frontal top light. HOVER: warmer
   reflected light on the rim. PRESSED: inverted bevel, slightly darker.
   Style/medium: painterly brushwork like F5, very clear silhouette.
   Output intent: transparent PNGs, exactly 192 x 192 px.
   Do not add: red colour, glass or gloss, glow, text, letters, drop shadow.
   Reference matching: rivets and steel identical to F5; replaces
   ui/citadel/standalone-close-button/close_n.webp (do not modify the old file).

----------------------------------------------------------------------------------------------------

T1) Seitenwand-Textur (Hintergrund aller Reforged-Seiten)
   Datei: texture-wall-oak-painterly.png -> ui/gravewood/v4/textures/texture-wall-oak-painterly.webp
   Format: 1024 x 1024, RGB, deckend, in BEIDE Richtungen nahtlos kachelbar.
   Befund heute: bg_tileable_wood.webp hat eine sichtbare Kachelnaht (Differenz an der Kante doppelt so
   hoch wie innen) und wirkt verschmiert; Beleg crops/f16b_seitenhintergrund_aufgehellt.jpg.
   QA: 3 x 3 kacheln und aufgehellt (x1.8) prüfen; keine Naht, kein auffälliges Wiederholungsmotiv.

   Use case: seamless painted wall texture behind all game pages.
   Asset type: Grim Reach tileable background texture, fully opaque.
   Scene/backdrop: a close, flat, frontal view of a wall of vertical dark oak planks.
   Subject: Vertical blackoak planks of slightly varying width with darker joints, broad painted grain,
   subtle worn patches, no knots or nails that would repeat visibly.
   Composition/framing: Perfectly frontal and flat, evenly lit, tile seamlessly on all four sides, no
   vignette, no light gradient across the tile.
   Palette/materials/lighting: very dark warm brown, low contrast; overall luminance as dark as the current
   wall after darkening, so gold text and oak panels stand out in front of it.
   Style/medium: painterly brushwork with broad visible strokes like the Grim Reach painted main menu,
   not photographic wood.
   Output intent: opaque PNG, exactly 1024 x 1024 px, seamless in both directions.
   Do not add: text, symbols, carvings, nails, vignette, lighting hot spots.
   Reference matching: role of apps/client/src/renderer/assets/bg_tileable_wood.webp; colour neighbours
   ui/gravewood/textures/texture-nav-wood2.webp and ui/gravewood/v3/textures/texture-basalt.webp.

----------------------------------------------------------------------------------------------------

B1) Kulisse "Reliquiar" für Neues Spiel, Laden und Charaktererstellung
   Dateien: menu_reliquary_painterly_1920.png (1920 x 1080, RGB) und
            menu_reliquary_painterly_3440.png (3440 x 1440, RGB, eigene Komposition, kein Beschnitt)
   -> ui/menu_reliquary_painterly_1920.webp / _3440.webp
   Ersatzname; ui/ember_reliquary_bg.webp bleibt erhalten.
   Befund: Das gemalte Hauptmenü wechselt beim Klick auf Neues Spiel oder Laden in die alte, detailliert
   gerenderte Ödland-Kulisse (Belege shots/1920x1080/m01 bis m04).

   Use case: painted backdrop for the save-slot and character creation screens, matching the painted main
   menu.
   Asset type: Grim Reach full-screen menu backdrop, opaque, no UI.
   Scene/backdrop: The same place as the current reliquary screen: a vast ash-grey wasteland at dusk, a
   distant black spired citadel on a ridge to the right, a broken shipwreck half-sunk in ash on the left,
   scattered faint embers in the ground, low heavy clouds with a thin break of cold light.
   Subject: landscape only.
   Composition/framing: Wide landscape. Upper centre kept calm for the logo, the large central area and
   the lower third kept darker and quiet because slot cards sit on top; the citadel and wreck at the
   edges. The 3440 x 1440 version is recomposed for 21:9 with the same elements, not cropped.
   Palette/materials/lighting: ash greys, cold blue-grey sky, small warm ember accents; darker overall
   than the highlands menu but in the same painted manner.
   Style/medium: hand-painted painterly landscape with broad, angular, visible brush strokes, broken
   overlapping colour patches and simplified light masses, exactly the manner of
   ui/mainmenu_highlands_1920.webp; no photographic detail.
   Output intent: two opaque PNGs, exactly 1920 x 1080 and 3440 x 1440 px.
   Do not add: text, logo, UI, people, creatures, banners with writing, lens flare, glow.
   Reference matching: style from ui/mainmenu_highlands_1920.webp and _3440.webp; motif and mood from
   ui/ember_reliquary_bg.webp.

----------------------------------------------------------------------------------------------------

E1-E5) Gemalte Embleme für Hauptmenü und Seitenleisten-Fußzeile (ersetzen flache SVG, Credits neu)
   Format für alle: 1254 x 1254, RGBA, natives Alpha, Objekt füllt ca. 80 %, lesbar bei 32 px.
   Zielordner: apps/client/src/renderer/assets/ui/ (Ersatznamen; die SVGs bleiben erhalten).
   Bestandsnachbarn für alle: assets/sidebar/sidebaricon_options.webp, sidebaricon_quests.webp,
   sidebaricon_save.webp (gemalte Objekt-Icons gleicher Größe), plus das jeweils genannte SVG für das Motiv.
   QA: auf Schwarz, auf #3a2a1e und auf #d8cfbf bei 32 px und 64 px; nebeneinander als Fünferreihe.

   Gemeinsame Zeilen (in jedem der fünf Prompts mitschicken):
   Use case: painted menu emblem replacing a flat vector icon.
   Asset type: Grim Reach UI emblem, single object, genuinely transparent canvas with a real native alpha
   channel.
   Scene/backdrop: none; no checkerboard, no opaque or chroma-key background, no later keying.
   Composition/framing: Frontal view, centred, filling about 80 % of the square, bold simple silhouette
   readable at 32 px.
   Palette/materials/lighting: aged brass, blackened steel, dark leather, deep red wax where named; soft
   top-left key light.
   Style/medium: hand-painted painterly object with broad visible strokes, matching the Grim Reach painted
   sidebar icons.
   Output intent: transparent PNG, 1254 x 1254 px.
   Do not add: text, letters, numbers, glow, sparkles, frame, plaque, cast shadow.

   E1 emblem_compass_painterly.png  (Neues Spiel, Hauptmenü-Fußleiste)
      Subject: an old brass field compass with a cracked glass lid and a dark iron needle, lid open.
      Reference matching: motif of ui/emblem_compass.svg.
   E2 emblem_waxseal_painterly.png  (Spiel laden / Speichern)
      Subject: a thick deep-red wax seal pressed onto a folded parchment corner, the seal showing an
      abstract tower shape (no letters).
      Reference matching: motif of ui/emblem_waxseal.svg.
   E3 emblem_gear_painterly.png     (Optionen)
      Subject: a heavy forged iron cogwheel with worn teeth and a brass hub.
      Reference matching: motif of ui/emblem_gear.svg.
   E4 emblem_scroll_painterly.png   (Credits, heute ohne Emblem)
      Subject: a rolled parchment scroll tied with a leather cord, a quill pushed through the cord.
      Reference matching: same family as E1-E3.
   E5 emblem_skull_painterly.png    (Spiel verlassen)
      Subject: a weathered bone skull with a dark iron helm band, sombre, not cartoonish.
      Reference matching: motif of ui/emblem_skull.svg.

----------------------------------------------------------------------------------------------------

I1-I3) Drei Icons für Emoji-Lücken (neue IDs, keine Ersetzung)
   Format: 1254 x 1254, RGBA, natives Alpha, lesbar bei 18-24 px. Ziel: apps/client/src/renderer/assets/icons/<id>.webp
   Bestandsnachbarn: assets/icons/icon_attribute_woodcutting_speed.webp, icon_mastery_star.webp,
   icon_crafting.webp.
   Gemeinsame Zeilen wie bei E1-E5, aber: "Asset type: Grim Reach small UI stat icon, single object" und
   "Composition/framing: centred, filling about 85 %, extremely simple silhouette readable at 20 px."

   I1 icon_tool_speed.png   (Werkzeug-Tempo auf allen Sammelkarten, heute ⛏ auch bei Angeln)
      Subject: a neutral tool symbol: a short iron hammer and a whetstone crossed, one small bronze band.
      Reference matching: icon_attribute_woodcutting_speed.webp for scale and outline weight.
   I2 icon_action_speed.png (Aktionstempo in der Meisterschaft, Wachstumszeit beim Anbau; heute ⏱)
      Subject: a compact brass hourglass with dark wood end plates, sand mostly in the lower bulb.
      Reference matching: icon_mastery_star.webp for scale.
   I3 icon_preserve.png     (Materialerhalt in der Meisterschaft; heute ♻)
      Subject: a small closed leather pouch with a brass clasp, a single ingot peeking from it.
      Reference matching: icon_crafting.webp for scale.

----------------------------------------------------------------------------------------------------

S1-S3) Skill-Kulissen im Painterly-Stil (Pilot; die übrigen zehn erst nach Chef-Abnahme)
   <!-- claude:2026-10-25T16:40:00+01:00 --> **CHEF-ENTSCHEID 25.10. abends: abgelehnt** („also neue Skill Hintergründe will ich keine“).
   Pilot S1–S3 wird nicht eingebaut, die übrigen zehn werden NICHT produziert. Bestehende Skill-Hintergründe bleiben.
   Format: 2172 x 724, RGB, deckend (3:1). Die Kartenfassung 880 x 293 erzeugen wir selbst.
   Ersatznamen: <id>_painterly.png -> später assets/skill-backgrounds/<id>.webp, Altbild wird archiviert,
   nicht gelöscht.
   Einsatz: Jede Aktionskarte des Skills zeigt einen Ausschnitt aus der Bildmitte; Baum, Erz oder Fisch
   stehen im Vordergrund davor. Beleg: shots/1920x1080/04-sidebar.woodcutting.png.
   Bestandsnachbarn: das jeweilige heutige Bild (Motiv, Ort), assets/skill-backgrounds/farming.webp
   (Helligkeit), ui/mainmenu_highlands_1920.webp (Stil).

   Gemeinsame Zeilen:
   Use case: painterly repaint of an existing skill background, same place, new painted style.
   Asset type: Grim Reach skill page backdrop, opaque, no UI, no characters.
   Composition/framing: Wide 3:1 panorama. The central third is calm, mid-dark and free of strong detail,
   because a resource object is shown in front of it; interest sits at the left and right. Eye-level
   camera, horizon slightly above the middle.
   Style/medium: hand-painted painterly landscape with broad, angular, visible brush strokes and
   simplified light masses, exactly the manner of ui/mainmenu_highlands_1920.webp; no photographic detail.
   Output intent: opaque PNG, exactly 2172 x 724 px.
   Do not add: text, people, animals, monsters, UI, lens flare, glow.

   S1 woodcutting_painterly.png
      Scene/backdrop: a woodcutters' clearing in a dark pine forest: a canvas tent and stacked logs on the
      right, a chopping stump with a resting axe and a small smouldering campfire on the left, tall pine
      trunks fading into blue-green mist behind.
      Subject: the clearing itself, no figures.
      Palette/materials/lighting: deep pine greens, warm bark browns, soft grey morning light, small
      ember accent.
      Reference matching: identity of assets/skill-backgrounds/woodcutting.webp.
   S2 mining_painterly.png
      Scene/backdrop: a mine entrance in a grey mountain flank: a timber-framed adit with a lantern on the
      right, an ore cart on rails on the left, scree and boulders, cold snowy peaks under overcast sky
      behind.
      Subject: the mine entrance and its surroundings, no figures.
      Palette/materials/lighting: cold slate greys, weathered timber browns, warm lantern spot, pale sky.
      Reference matching: identity of assets/skill-backgrounds/mining.webp.
   S3 fishing_painterly.png
      Scene/backdrop: a calm river bend with a weathered wooden jetty on the right, reeds and willow on the
      left bank, a distant ruined keep on a far hill, soft clouds.
      Subject: the riverside, no figures (the current image has an angler; leave him out).
      Palette/materials/lighting: muted river blues, reed greens, warm weathered wood, gentle daylight.
      Reference matching: identity of assets/skill-backgrounds/fishing.webp.

   Welle 2 (nur zur Info, NICHT jetzt produzieren): bowcraft, cooking, farming, foraging, herblore,
   jewelcrafting, leatherworking, runecrafting, smithing, tailoring, thieving. Wir schicken die Prompts nach
   der Abnahme des Piloten.

----------------------------------------------------------------------------------------------------

D) Discord-Server "Heartforge Studios" (Lieferung in delivery/discord/)
   Die übrigen Discord-Grafiken haben wir aus dem Spielbestand gebaut (design/discord-assets/, Übersicht
   _contact.jpg). Diese Motive fehlen dort und brauchen echte Malerei. Alle mit echtem nativem Alpha,
   gleicher Painterly-Stil, gleiche Allgemeinen Regeln wie oben. Kein Text im Bild. Einzige Ausnahme vom
   Glüh-Verbot: Beim Wappen D1 darf das Eisen in seinen Rissen glutorange gemalt sein, ohne Lichtschein nach außen.
   Bestandsnachbarn für alle: design/discord-assets/_contact.jpg (Gesamtbild), die Emojis in
   design/discord-assets/emojis/ (Größe und Kontrast), ui/mainmenu_logo_painterly.webp (Metall).
   QA: auf Discord-Dunkel #313338 und auf Weiß, in 128 px, 48 px und 22 px; das Wappen zusätzlich rund
   beschnitten in 32 px.

   D1 studio_crest.png und studio_crest_round.png (1024 x 1024)
      Use case: studio crest for Heartforge Studios, used as Discord server icon and studio mark.
      Asset type: single emblem, genuinely transparent canvas with a real native alpha channel; the
      _round variant additionally sits on a dark painted round stone disc that fills the canvas.
      Subject: a heart-shaped iron ingot glowing red-hot only inside its forge cracks, resting on a small
      anvil, with crossed smith's tongs behind it, framed by a simple forged iron ring.
      Composition/framing: frontal, centred, bold silhouette readable at 32 px when cropped to a circle;
      all important parts within the central 80 % circle.
      Palette/materials/lighting: blackened steel, warm ember orange inside the cracks only, dull bronze
      ring; soft frontal top light.
      Do not add: text, letters, glow halo outside the cracks, sparks, drop shadow.
   D2 gauntlet_thumbsup.png und gauntlet_thumbsdown.png (je 512 x 512)
      Subject: an armoured blackened-steel gauntlet giving a thumbs up (and a second image: thumbs down),
      frontal, bold silhouette for 22 px.
   D3 skull_plain.png (512 x 512)
      Subject: a single weathered bone skull, frontal, sombre, not cartoonish, no blades or helm.
   D4 gg_tankards.png (512 x 512)
      Subject: two pewter tankards clinking together with a splash of ale foam, frontal, bold silhouette.
   D5 OPTIONAL, nur mit Chef-GO: rarity_stone_<stufe>.png (je 512 x 512) für die Seltenheiten ohne Emoji
      (common, rare, super rare, epic, legendary, godly); je ein facettierter Stein in einer schlichten
      Eisenfassung. Hinweis: berührt die Regel zu Raritätsfarben, deshalb erst nach Freigabe.
   D6 Maskottchen-Sticker, 4 bis 6 Posen (je 1024 x 1024): der kleine Feuerdämon Pyreling aus dem Spiel
      (Referenz apps/client/src/renderer/assets/pets/pyreling.webp) jubelnd, schlafend (AFK), mit der
      Hand vor dem Gesicht, über einer offenen Truhe ("Loot"), mit Grabstein ("RIP"). Klare Silhouette,
      etwas überzeichnete Mimik, aber im Grim-Reach-Stil, kein Cartoon-Look. Kein Text im Bild.
   D7 role_medal_<rolle>.png (8 x 256 x 256): einheitliche runde Eisenmedaillons mit je einem Symbol für
      die Rollen Heartforge (Esse), Admin (Krone), Moderator (Schild), Game Moderator (gekreuzte
      Schwerter), Helper (Laterne), Beta Tester (Runenstein), Content Creator (Feder), Member (Stern).
      Sehr kontrastreich, lesbar bei 16 px.
   D8 OPTIONAL: zwei Kulissen 2400 x 600 (RGB, deckend) für Kanal-Kopfbilder: eine Studio-Werkstatt mit
      Esse, Zeichentisch und Skizzen (dev-log) und ein dunkles Gewölbe mit Motten um eine Laterne
      (bug-reports). Linkes Drittel ruhig für den Titel.

----------------------------------------------------------------------------------------------------

REIHENFOLGE UND ABNAHME
1. Zuerst F1, F2, F5-NORMAL und F10-close-NORMAL als Musterrunde liefern (mit PREVIEW.html), dann
   anhalten. Der Chef entscheidet über die Rahmenfamilie, bevor die übrigen Rahmenzustände entstehen.
2. Danach F3, F4, F5 (Zustände), F6, F9, F10 (Rest), dann T1, B1, E1-E5, I1-I3, S1-S3, D1-D4, D6-D7.
   F7, F8, D5 und D8 nur, wenn Zeit bleibt und der Chef sie freigegeben hat.
3. Je Paket: Manifest, Galerie, ZIP, LIEFERUNG.md mit QA-Notiz. Bei Rahmen bestätigen: exakte Maße,
   Slice-Maße, Mitte Alpha 0, Kantensegment nahtlos (3x-Kachelprobe), deckungsgleiche Geometrie
   zwischen Zuständen.

Danke!
```

## Für den späteren Einbau (nicht an Codex)

- Die Ziel-CSS-Zeilen je Rahmen stehen oben. Die ungleichen Faktoren `2.15 1.87` des heutigen Holzrahmens entfallen.
- Code-Fixes ohne neue Assets (Emoji-Mappings auf vorhandene Icons, `icon_attribute_lck`/`icon_attribute_mana`) laufen
  in der 1.4.1-Prüfung.
