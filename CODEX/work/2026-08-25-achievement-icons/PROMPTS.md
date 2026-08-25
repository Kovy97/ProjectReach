# Prompts — Achievement-Kategorie-Embleme (10 Pflicht, 3 optional)

Gehört zu `BRIEF.md` im selben Ordner. Vorlage: `CODEX/templates/IMAGEGEN-ASSET-PROMPT.md`.
Die Prompts sind Englisch, weil die Bildmodelle Englisch zuverlässiger lesen. Jeder Prompt ist
vollständig und kann einzeln kopiert werden, ohne Referenzbild. Die Referenzpfade aus BRIEF.md A6
dienen nur der Stil-Kontrolle.

Jedes Emblem hat einen Kopf mit Icon-Name, Dateiname, Kategorie DE/EN, Sichtbarkeit und Akzent, danach den Prompt.

---

## Serienkern (zur Orientierung, steckt in jedem Prompt)

Ein Malstil, zehn Motive, zehn Akzente:

| Merkmal | Fest für alle 13 |
|---|---|
| Rolle | Kategorie-Emblem, das in einem vom Spiel gezeichneten runden Medaillon sitzt (28 px Bild in 46 px Ring) |
| Perspektive | frontal, leicht von oben gesehen, Motiv mittig, kompakte annähernd runde Silhouette |
| Licht | weiches Hauptlicht von oben links, eine klare Lichtkante, eine Schattenseite, kein Glühen |
| Material | gemaltes Metall, Leder, Pergament, Holz, Stein mit Gebrauchsspuren; Ashen Iron |
| Grundpalette | dunkles Eisen, Aschgrau, gealtertes Bronze; gedeckte Sättigung |
| Akzent | genau einer je Emblem (Tabelle unten), nie mehr als etwa ein Drittel der Fläche |
| Werte | mittlere bis helle Werte auf der Hauptform, damit das Motiv auf fast schwarzem Grund und entsättigt lesbar bleibt |
| Maßstab | Motiv 80 bis 90 % der Canvashöhe, äußere 16 px transparent, 512 × 512 PNG |
| Verboten | eigener Ring oder Rahmen, Glühen, Aura, Text, Szene, Bodenplatte, Schatten auf dem Canvas |

| # | Datei | Motiv | Akzent |
|---:|---|---|---|
| 1 | `icon_ach_trophy` | Pokal, zwei Henkel, kurzer Sockel | gealtertes Bronze-Gold |
| 2 | `icon_ach_forge` | Amboss mit Schmiedehammer | Glut-Orange am heißen Eisen |
| 3 | `icon_ach_combat` | zwei gekreuzte Schwerter | Oxblood-Rot an den Griffwicklungen |
| 4 | `icon_ach_nature` | Ähre mit zwei Blättern | Moosgrün |
| 5 | `icon_ach_craft` | Zahnrad, dahinter Nadel mit Faden | Kupfer |
| 6 | `icon_ach_scroll` | Schriftrolle mit Wachssiegel | Pergament-Creme |
| 7 | `icon_ach_gold` | Münzsack mit drei Münzen | Münz-Gold |
| 8 | `icon_ach_gift` | eisenbeschlagene Truhe, Deckel einen Spalt offen | Grünspan |
| 9 | `icon_ach_compass` | Messing-Kompass mit Windrose | Indigo-Blau |
| 10 | `icon_ach_star` | achtstrahliges Eisensigill | Silber |
| 11 | `icon_achievments` (optional) | große Trophäe mit Lorbeerkranz | gealtertes Gold |
| 12 | `icon_ach_milestone` (optional) | Meilenstein mit Kerbmarke | Kupfer |
| 13 | `icon_achievement_unlocked` (optional) | Lorbeerkranz um Siegel mit Haken | gealtertes Gold |

Der Alpha-Pflichtblock aus der Vorlage steht wörtlich am Ende jedes Prompts.

---

## Kategorie-Embleme (Pflicht)

### 01 · `icon_ach_trophy`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_trophy` |
| Finaler Dateiname | `icon_ach_trophy.png` |
| Kategorie | Alle / All (537 Erfolge, Standardansicht) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | gealtertes Bronze-Gold |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single trophy cup emblem, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a compact medieval trophy cup of aged bronze-gold: a wide bowl with a slightly flared lip, two sturdy curved handles that stay close to the body, a short thick stem and a low square base of dark iron. A simple laurel branch is engraved around the middle of the bowl. Proportions stay squat and wide so the whole cup fills a near-circular area; the handles do not stick out far.
Material and depth: hammered, worn bronze-gold with darker patina in the recesses and small dents on the bowl; the base is dark iron with a matte surface. Painted highlights on the lip and the handle tops, deeper shadow inside the bowl.
Accent: the aged bronze-gold of the cup is the single accent tone; everything else stays dark iron and ash grey.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach rune and item icons; no comic styling, no flat vector, no line-art icon, no glossy badge.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: dark iron, ash grey, aged bronze-gold; restrained saturation; mid-to-light values on the cup so it stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no banner, no ribbon, no laurel wreath around the cup, no text, no letters, no numbers, no logo, no watermark, no scene, no background plate, no second object.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a sports trophy look, a tall slender cup.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 02 · `icon_ach_forge`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_forge` |
| Finaler Dateiname | `icon_ach_forge.png` |
| Kategorie | Fertigkeiten / Skilling (199 Erfolge) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Glut-Orange am heißen Eisen |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single anvil-and-hammer emblem, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a heavy blacksmith anvil of dark forged iron seen from the front and slightly above, with a pronounced horn on the left and a flat face on top. A short-handled smith hammer lies diagonally across the anvil face, its head resting near the center, the wooden handle pointing down to the right. On the anvil face under the hammer lies a small bar of hot iron, glowing dull orange only on the bar itself. The anvil body is compact and wide so the whole group fills a near-circular area.
Material and depth: matte dark iron with lighter worn edges on the anvil face and horn, hammer head of darker steel with a bright struck face, handle of oiled dark wood. Painted highlights along the top edges, deep shadow under the horn.
Accent: the ember orange of the hot iron bar is the single accent tone; it is a painted hot-metal color, not a light source, and it does not illuminate the anvil.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach rune and item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparks flying, no lens flare.
Color palette: dark iron, ash grey, oiled wood brown, one ember orange accent; restrained saturation; mid-to-light values on the anvil face and hammer head so the form stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no banner, no text, no letters, no numbers, no logo, no watermark, no scene, no forge, no fire, no smoke, no background plate, no anvil stump or log under the anvil.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, glowing cracks, a cartoon anvil shape.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 03 · `icon_ach_combat`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_combat` |
| Finaler Dateiname | `icon_ach_combat.png` |
| Kategorie | Kampf / Combat (301 Erfolge) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Oxblood-Rot an den Griffwicklungen |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of two crossed swords, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: two straight medieval arming swords crossed in an X, blades pointing up and outward, grips pointing down and outward, crossing at the lower third of the blades. Blades of worn grey steel with a bright fuller line, simple straight cross-guards of dark iron, grips wrapped in dark red leather, round iron pommels. Blades are fairly broad so the X reads as a solid shape; the whole X fills a near-circular area with the tips and pommels reaching the same distance from the center.
Material and depth: painted steel with a lighter edge on the left side of each blade and a darker side on the right, small nicks on the edges, matte dark iron guards, leather with visible wrap turns.
Accent: the oxblood red of the leather grips is the single accent tone; the steel stays cool grey, never blue.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach weapon icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: worn steel grey, dark iron, ash grey, one oxblood red accent; restrained saturation; mid-to-light values on the blades so the X stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no shield behind the swords, no helmet, no banner, no text, no letters, no numbers, no logo, no watermark, no scene, no background plate, no blood.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, glowing runes on the blades, curved or fantasy-ornate blades, more than two swords.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 04 · `icon_ach_nature`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_nature` |
| Finaler Dateiname | `icon_ach_nature.png` |
| Kategorie | Sammeln / Gathering (4 Erfolge); außerdem auf der Farm-Seite bei 1 em |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt, ca. 12 px auf der Farm-Seite |
| Akzent | Moosgrün |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of a grain ear with two leaves, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a single upright ear of wheat-like grain, full and heavy, slightly bent to the right at the top, on a short thick stalk. Two broad leaves grow from the lower stalk, one curving to the left and one to the right, so the group forms a compact rounded shape rather than a thin line. The grain kernels are clearly separated and painted with light and shadow. The stalk is cut short at the bottom, no roots, no soil.
Material and depth: painted plant matter with a dry, weathered look: the ear in muted ochre and tan, the leaves in moss green with darker veins and pale worn edges. Painted highlights on the left side of the ear, shadow between the kernels.
Accent: the moss green of the two leaves is the single accent tone; the ear stays muted ochre, not bright yellow.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded materials; the same painting grade as the existing Grim Reach resource icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: muted ochre and tan, dry stalk brown, moss green, ash grey; restrained saturation; mid-to-light values on the ear so it stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no wreath, no banner, no text, no letters, no numbers, no logo, no watermark, no scene, no field, no soil, no background plate, no sickle, no basket.
Avoid: comedy, folklore shorthand, harvest-festival cheer, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a lone thin stalk with no body, a bundle of many ears.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 05 · `icon_ach_craft`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_craft` |
| Finaler Dateiname | `icon_ach_craft.png` |
| Kategorie | Handwerk / Crafting (4 Erfolge) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Kupfer |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of a cogwheel with a sewing needle and thread in front of it, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a heavy cogwheel of aged copper with eight broad, rounded teeth and a solid hub with four short spokes, seen from the front. Diagonally across the front of the wheel, from lower left to upper right, lies a long steel sewing needle with a visible eye at the top, and a single length of dark thread runs through the eye and loops loosely once around the lower right of the wheel. The wheel gives the emblem a round silhouette; the needle stays inside that silhouette.
Material and depth: painted copper with a warm worn surface, darker oxidation in the recesses between the teeth, bright edges on the teeth facing upper left; the needle in cool polished steel with a single highlight; the thread in dark waxed linen, painted as a solid cord with light and shadow.
Accent: the copper of the cogwheel is the single accent tone; the needle stays steel grey and the thread near-black.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach tool and item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: aged copper, dark iron, ash grey, polished steel, waxed linen black; restrained saturation; mid-to-light values on the teeth and hub so the wheel stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no banner, no text, no letters, no numbers, no logo, no watermark, no scene, no workbench, no second cogwheel, no background plate, no hands.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, steampunk brass ornament, many tiny teeth that blur at small size.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 06 · `icon_ach_scroll`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_scroll` |
| Finaler Dateiname | `icon_ach_scroll.png` |
| Kategorie | Aufgaben / Quests (8 Erfolge) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Pergament-Creme |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of a sealed parchment scroll, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a short, thick parchment scroll seen from the front, partly unrolled: the upper end is still rolled into a tight cylinder, the lower part hangs open as a flat sheet with a gently curled bottom edge. A round wax seal of dark wine-red sits on the open sheet at the lower center, pressed with a simple unreadable mark. The sheet carries no writing; at most two or three faint blank ruling lines. The scroll is wide and short so the silhouette stays compact and near-circular.
Material and depth: painted parchment in warm cream with darker worn edges, faint stains and a soft curl shadow under the rolled top; the roll shows its spiral end on the right; the wax seal has a matte surface with a small highlight.
Accent: the cream parchment is the single accent tone; the seal stays dark and small, subordinate to the sheet.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: parchment cream, worn tan, dark iron shadow tones, one dark wine-red seal; restrained saturation; the cream sheet keeps light values so it stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no banner, no text, no letters, no runes, no numbers, no logo, no watermark, no scene, no quill, no ribbon, no background plate, no wooden rods at the scroll ends.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a long thin scroll, a treasure map look, readable handwriting.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 07 · `icon_ach_gold`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_gold` |
| Finaler Dateiname | `icon_ach_gold.png` |
| Kategorie | Reichtum / Wealth (9 Erfolge) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Münz-Gold (heller und satter als das Bronze-Gold der Trophäe) |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of a tied coin pouch with a few coins, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a plump round pouch of dark worn leather, tied shut at the top with a short cord, the gathered neck folding over slightly to the right. In front of the pouch at the lower left lie three gold coins, two flat and one leaning against the pouch, each stamped with a simple unreadable mark. The pouch is wide and low so the whole group forms a compact, near-circular silhouette.
Material and depth: painted leather with creases radiating from the tied neck, scuffed lighter edges and a darker underside; the cord in coarse twine; the coins in warm gold with a bright rim highlight on the upper left and a darker shadow side, edges slightly worn.
Accent: the coin gold is the single accent tone, brighter and warmer than aged bronze; the pouch stays dark leather brown, never gold.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no sparkle on the coins, no lens flare.
Color palette: dark leather brown, twine tan, ash grey, one coin-gold accent; restrained saturation; mid-to-light values on the pouch highlights and the coins so the group stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no banner, no text, no letters, no numbers, no currency symbols, no logo, no watermark, no scene, no table, no background plate, no more than three coins, no coins spilling out of an open pouch.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a cartoon money bag with a symbol on it, a pile of treasure.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 08 · `icon_ach_gift`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_gift` |
| Finaler Dateiname | `icon_ach_gift.png` |
| Kategorie | Sammlung / Collection (12 Erfolge) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Grünspan auf den Beschlägen |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of an iron-bound wooden chest, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a small, sturdy wooden chest seen from the front and slightly above, with a rounded barrel lid. The lid is lifted only a finger's width, showing a thin dark gap; nothing inside is visible. Two vertical iron straps run over the lid and body, and a square iron lock plate with a keyhole sits at the front center. The chest is wide and low with the curved lid, so the silhouette is compact and near-circular.
Material and depth: painted dark oak planks with visible grain and worn lighter edges; iron straps and lock plate in dark matte iron with a blue-green verdigris patina in the recesses and around the rivets; a soft painted shadow inside the lid gap.
Accent: the verdigris patina on the iron fittings is the single accent tone; the wood stays dark brown, the iron stays dark grey.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact roughly round silhouette that sits well inside a circle, emblem height about 80 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge along the lid and one shadow side so the form still reads at 28 pixels; no glow, no aura, no rim light, no light coming out of the chest, no lens flare.
Color palette: dark oak brown, dark iron, ash grey, one verdigris blue-green accent; restrained saturation; mid-to-light values on the lid highlight and the front planks so the chest stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame, no badge border, no banner, no text, no letters, no numbers, no logo, no watermark, no scene, no floor, no coins or gems showing, no background plate, no bow or ribbon, no gift-box look.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a treasure chest bursting with gold, a pirate chest cliché, a very dark chest that disappears on black.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 09 · `icon_ach_compass`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_compass` |
| Finaler Dateiname | `icon_ach_compass.png` |
| Kategorie | Erkundung / Exploration (heute 0 Erfolge, Kategorie angelegt) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Indigo-Blau des Zifferblatts |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of a brass field compass, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a round brass compass seen from the front and slightly above, its lid removed, showing a deep indigo-blue dial. On the dial an eight-pointed compass rose in bone white with the four main points longer than the four minor ones, and a slim two-colored needle: one half dark iron, one half bone white, pointing to the upper right. The brass case has a thick worn rim and a small hinge knob at the top and a tiny ring at the bottom, both staying tight to the body. The compass body is itself round; it is the object, not a frame, so its rim is clearly a physical brass case with thickness and wear, not a flat ring.
Material and depth: painted aged brass with scratches and darker tarnish on the rim, a slight bevel where the rim meets the dial; the dial a matte deep indigo with faint concentric wear; the rose and needle painted with a light edge and a shadow side.
Accent: the indigo blue of the dial is the single accent tone; the case stays brass, the rose and needle stay bone white and iron.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, round silhouette, emblem height about 80 to 88 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight on the rim and one shadow side so the form still reads at 28 pixels; no glass reflection, no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: aged brass, dark iron, bone white, one deep indigo accent; restrained saturation; the brass rim and the white rose keep light values so the compass stays readable on a near-black background even when desaturated.
Constraints: no ring, no extra circular frame outside the compass case, no badge border, no banner, no text, no letters, no N E S W markings, no numbers, no logo, no watermark, no scene, no map, no chain, no background plate.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a modern hiking compass, a ship's wheel, a clock face, a thin flat ring that could be mistaken for a UI frame.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 10 · `icon_ach_star`

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_star` |
| Finaler Dateiname | `icon_ach_star.png` |
| Kategorie | Meta / Meta (heute 0 Erfolge, Kategorie angelegt) |
| Sichtbar bei | 28 px im 46-px-Ring, 24 px in der Leiste, 39 bis 50 px im Detailblatt |
| Akzent | Silber |
| Assettyp | UI-Icon, Kategorie-Emblem |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievement category emblem, runtime game asset
Primary request: one single emblem of an eight-pointed forged iron star sigil, isolated on a transparent canvas, to be shown inside a small round medallion frame that the game draws itself.
Subject: a solid eight-pointed star of dark forged iron, four long points and four shorter points between them, with beveled faces so each point has a light side and a dark side. At the center a small raised round boss of polished silver with a single engraved notch mark. Short engraved notches run along the ridge of each long point. The star is a solid metal object with thickness, seen from the front and slightly above; its outline is the whole silhouette.
Material and depth: painted forged iron, matte and dark with lighter worn ridges along the bevels and small hammer marks on the faces; the silver boss bright with one highlight and a soft shadow side; engraved notches darker than the surface, not glowing.
Accent: the polished silver of the center boss and the ridge highlights is the single accent tone; the star body stays dark iron.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, star silhouette filling a near-circular area, emblem height about 82 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, the upper-left faces of each point lighter and the lower-right faces darker so the star still reads at 28 pixels; no glow, no aura, no rim light, no sparkle, no light rays, no lens flare.
Color palette: dark forged iron, ash grey, one polished silver accent; restrained saturation; the beveled highlights keep mid-to-light values so the star stays readable on a near-black background even when desaturated.
Constraints: no ring, no circular frame around the star, no badge border, no banner, no text, no letters, no numbers, no readable runes, no logo, no watermark, no scene, no background plate, no second star, no sky.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a five-pointed rating star, a sheriff badge, a sun, a snowflake, a religious symbol.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

---

## UI-Symbole der Seite (optional, zweite Priorität)

Diese drei werden größer oder an anderer Stelle gezeigt und dürfen deshalb etwas reicher sein. Nr. 11 und Nr. 13 sind heute schon gemalt; Mira ersetzt sie nur, wenn sie neben den neuen Emblemen abfallen, und sagt das im Handoff dazu.

### 11 · `icon_achievments` (Kopf-Trophäe)

| Feld | Wert |
|---|---|
| Icon-Name | `icon_achievments` (bestehender Schlüssel mit Tippfehler, bleibt so) |
| Finaler Dateiname | `icon_achievments.png` |
| Rolle | Kopf-Emblem der Seite; außerdem AP-Zeile in jeder Karte bei 1 em |
| Sichtbar bei | 38 px im 58-px-Ring, ca. 12 px in der AP-Zeile |
| Akzent | gealtertes Gold |
| Assettyp | UI-Icon |
| Zielauflösung | 512 × 512 px (Roh-Ausgabe gern größer in `raw/`) |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, achievements page emblem, runtime game asset
Primary request: one single ornate trophy cup emblem, the centerpiece of the achievements page, isolated on a transparent canvas, to be shown inside a round medallion frame that the game draws itself.
Subject: a tall but still compact trophy cup of aged gold: a bowl with a flared lip and a thin engraved band, two curved handles close to the body, a stem with one knop, and a wider square base of dark iron with a thin gold band. A pair of laurel branches is engraved on the bowl and their tips meet at the front; the branches are part of the cup, not a wreath around it. The cup is richer than a simple category emblem but the silhouette stays clean.
Material and depth: painted aged gold with warm highlights on the lip, handles and knop, darker patina in the engraving and under the lip; the base in matte dark iron. Small dents and wear on the bowl.
Accent: the aged gold of the cup is the single accent tone.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach rune and item icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact silhouette that sits well inside a circle, emblem height about 84 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side; no glow, no aura, no rim light, no sparkle, no light rays, no lens flare.
Color palette: aged gold, dark iron, ash grey; restrained saturation; the gold keeps mid-to-light values so the cup stays readable on a near-black background.
Constraints: no ring, no circular frame, no badge border, no banner, no ribbon, no wreath around the cup, no text, no letters, no numbers, no logo, no watermark, no scene, no background plate, no second object.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a modern sports trophy, a star on top of the cup.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 12 · `icon_ach_milestone` (Meilenstein-Leiste)

| Feld | Wert |
|---|---|
| Icon-Name | `icon_ach_milestone` |
| Finaler Dateiname | `icon_ach_milestone.png` |
| Rolle | Symbol der AP-Meilenstein-Leiste („Nächster Meilenstein: x %") |
| Sichtbar bei | ca. 12 bis 20 px (`.ui-icon`, 1 em) |
| Akzent | Kupfer |
| Assettyp | UI-Icon |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, milestone marker, runtime game asset
Primary request: one single emblem of a stone milestone marker, isolated on a transparent canvas, shown very small next to a progress bar.
Subject: a short, squat standing stone of grey weathered rock with a rounded top, wider than a typical road marker so it reads at very small size. On its front face a single deep notch mark is cut and filled with a small copper inlay: one short horizontal bar with a small round copper stud above it. No letters, no numbers. The stone is cut off cleanly at the bottom, no ground.
Material and depth: painted weathered granite with chipped edges, lichen-free, a lighter top face where the key light hits and a darker right side; the copper inlay warm and worn with one highlight.
Accent: the copper inlay is the single accent tone; the stone stays grey.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, compact silhouette, emblem height about 82 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the stone still reads at 16 pixels; no glow, no aura, no rim light, no sparkle, no lens flare.
Color palette: weathered granite grey, dark iron shadow tones, one copper accent; restrained saturation; the lit faces keep mid-to-light values so the stone stays readable on a near-black background.
Constraints: no ring, no circular frame, no badge border, no banner, no text, no letters, no numbers, no arrows, no logo, no watermark, no scene, no road, no grass, no background plate.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, rarity glow, a gravestone, a signpost, a tall thin obelisk.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 13 · `icon_achievement_unlocked` (Plakette „Freigeschaltet")

| Feld | Wert |
|---|---|
| Icon-Name | `icon_achievement_unlocked` |
| Finaler Dateiname | `icon_achievement_unlocked.png` |
| Rolle | Eck-Plakette freigeschalteter Karten; außerdem Erfolgs-Toast und Offline-Bericht. Gegenstück ist `icon_locked` (Schloss, nicht Teil des Auftrags). |
| Sichtbar bei | 22 px in der Kartenecke, ca. 16 bis 24 px in Toast und Bericht |
| Akzent | gealtertes Gold |
| Assettyp | UI-Icon |
| Zielauflösung | 512 × 512 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach UI icon, unlocked-achievement badge, runtime game asset
Primary request: one single small round pressed-metal seal surrounded by a laurel wreath, isolated on a transparent canvas, shown very small in the corner of a card and in a notification.
Subject: a round seal of aged gold, like a coin or a wax seal struck in metal, with a bold simple check mark pressed into its face as a raised form. Around the seal a closed laurel wreath of two branches in darker bronze, leaves compact and slightly overlapping, tied at the bottom with a small knot. The wreath belongs to this badge only; it is a physical wreath with leaf thickness, not a thin ring. The whole badge is one compact round object.
Material and depth: painted aged gold with a bright highlight on the upper left of the seal face and a darker patina in the pressed recesses; the wreath in darker bronze with lighter leaf edges on the lit side.
Accent: the aged gold of the seal is the single accent tone; the wreath stays darker bronze.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; the same painting grade as the existing Grim Reach icons; no comic styling, no flat vector, no line-art icon.
Composition/framing: frontal view seen slightly from above, emblem centered, round silhouette, emblem height about 84 to 90 percent of the square canvas, nothing touches the edge, the outer 16 pixels of the canvas stay transparent; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left, one clear highlight edge and one shadow side so the check mark still reads at 22 pixels; a very faint painted warmth on the seal face is allowed, but no aura, no rays, no sparkle, no lens flare, no glow beyond the silhouette.
Color palette: aged gold, dark bronze, dark iron shadow tones; restrained saturation; the seal face keeps light values so the check mark stays readable on a near-black background.
Constraints: no thin flat ring, no extra circular frame outside the wreath, no banner, no ribbon tails, no text, no letters, no numbers, no logo, no watermark, no scene, no background plate.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, flat vector line art, plastic 3D look, a green check mark, a shield shape, a star, an emoji look.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where fine detail requires them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

---

## Abnahmegate je Datei (aus der Vorlage, ergänzt)

- [ ] Alphakanal vorhanden und benutzt; kein Karo, kein Vollflächen-Hintergrund; äußere 16 px Alpha 0
- [ ] Grellrosa-Kontrasttest ohne Farbsaum bestanden
- [ ] 512 × 512 px, PNG, sRGB
- [ ] Finaler Dateiname entspricht exakt dem bestehenden Icon-Namen
- [ ] Kein eigener Ring, Rahmen, Rand oder Band im Bild
- [ ] Kein Glühen, keine Aura, kein Lichtsaum
- [ ] Genau ein Akzentton, Grundpalette gedeckt
- [ ] Bei 28 px im 46-px-Ring benennbar, in allen fünf Ringfarben und entsättigt
- [ ] Neben drei Runen von heute: gleicher Malgrad, kein Stilbruch
