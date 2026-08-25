# Prompts — Runen Tier IV (14 Bildgenerator-Prompts)

Gehört zu `BRIEF.md` im selben Ordner. Vorlage: `CODEX/templates/IMAGEGEN-ASSET-PROMPT.md`.
Die Prompts sind Englisch, weil die Bildmodelle Englisch zuverlässiger lesen. Jeder Prompt ist
vollständig und kann einzeln kopiert werden, ohne Referenzbild. Die Referenzpfade aus BRIEF.md A6
dienen nur der Stil-Kontrolle.

Jede Rune hat einen Kopf mit Content-ID, Dateiname, Name DE/EN, Effekt und Linie, danach den Prompt.

---

## Serienkern (zur Orientierung, steckt in jedem Prompt)

Drei Linien, ein Körper:

| Linie | Steinkörper | Einfassung | Glut | Ziffer |
|---|---|---|---|---|
| Waffe (5) | grob behauener, kantiger dunkler Basalt, abgeschlagene Kanten | gehämmerte dunkle Bronze mit warm abgegriffenen Goldkanten (Götzeneisen-Look) | Glut-Gold, weißglühender Kern | IV unten mittig |
| Rüstung (4) | flach behauener grauer Granit, gerade Kanten | genietetes Stahlband um den Rand | Eis-Blau, weißer Kern | IV unten mittig |
| Schmuck (5) | schmaler, glatt polierter, obsidianartig dunkler Stein | feine Silber-Filigran-Einlage entlang Rand und Glyph | violettes Leerenglühen, blasser Lila-Kern | keine |

Tier IV über Tier III: kräftigere Glut mit hellem Kern, ein feines Riss-Netz im Stein, das von innen
leuchtet, Metall-Einfassung statt reiner Gravurkante, größere aber kontrollierte Aura. Die beiden
Chase-Runen (Gericht, Nachlese) dürfen die reichste Einfassung ihrer Linie tragen.

Der Alpha-Pflichtblock aus der Vorlage steht wörtlich am Ende jedes Prompts.

---

## Waffen-Linie

### 01 · `rune_warpath_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_warpath_iv` |
| Finaler Dateiname | `rune_warpath_iv.png` |
| Name | Rune des Kriegspfads / Rune of the Warpath |
| Effekt | +2 % Schaden je Treffer, bis 12 Stapel, endet mit dem Kampf |
| Linie | Waffe, Nahkampf |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (weapon line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the melee weapon rune family, standing upright, isolated on a transparent canvas.
Body: a rough-hewn upright slab of dark basalt with chipped, broken edges, taller than wide, roughly oval with one flattened corner. A hammered dark-bronze edge fitting is seated into the rim of the stone, near-black metal with warm gold worn on the high edges, like idol iron. A fine web of hairline cracks runs through the stone and glows ember-gold from within.
Engraving: one glyph cut deep into the face of the stone: an ascending stair of twelve short cut notches rising from the lower left to the upper right, the last notch opening into a spearhead that points up. The notches grow slightly brighter toward the top so the glyph reads as a path that builds momentum. No other symbol.
Tier marker: the roman numeral IV engraved and glowing in the same ember gold, centered below the glyph, about one fifth of the slab width.
Glow: ember gold, warm gold with a white-hot core in the deepest cuts. Aura of a few drifting embers and a faint heat shimmer around the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: a deep blood-red tint only on the topmost notch and the spearhead.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (rough stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: dark basalt grey and black, dark bronze, ember gold, one blood-red accent; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no sword or weapon shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a second glyph, a second numeral, lens flares, flames covering the stone.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 02 · `rune_second_arrow_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_second_arrow_iv` |
| Finaler Dateiname | `rune_second_arrow_iv.png` |
| Name | Rune des Zweiten Pfeils / Rune of the Second Arrow |
| Effekt | 12 % Chance auf einen sofortigen Zweitschlag |
| Linie | Waffe, Fernkampf |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (weapon line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the ranged weapon rune family, standing upright, isolated on a transparent canvas.
Body: a rough-hewn upright slab of dark basalt with chipped, broken edges, taller than wide, roughly oval with one flattened corner. A hammered dark-bronze edge fitting is seated into the rim of the stone, near-black metal with warm gold worn on the high edges, like idol iron. A fine web of hairline cracks runs through the stone and glows ember-gold from within.
Engraving: one glyph cut deep into the face of the stone: two slender arrows flying upward in parallel, the second arrow set slightly lower and a little behind the first so it reads as an echo of the first. Identical fletching on both, the second arrow slightly dimmer. No bow, no target.
Tier marker: the roman numeral IV engraved and glowing in the same ember gold, centered below the glyph, about one fifth of the slab width.
Glow: ember gold, warm gold with a white-hot core in the deepest cuts. Aura of a few drifting embers and a faint heat shimmer around the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: a pale ash-grey smoke trail behind the second arrow only.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (rough stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: dark basalt grey and black, dark bronze, ember gold, one ash-grey accent; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no bow shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, more than two arrows, a second numeral, lens flares, motion blur across the whole image.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 03 · `rune_thin_veil_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_thin_veil_iv` |
| Finaler Dateiname | `rune_thin_veil_iv.png` |
| Name | Rune des Dünnen Schleiers / Rune of the Thin Veil |
| Effekt | +20 % Zauberschaden, solange das Mana über 80 % liegt |
| Linie | Waffe, Magie |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (weapon line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the magic weapon rune family, standing upright, isolated on a transparent canvas.
Body: a rough-hewn upright slab of dark basalt with chipped, broken edges, taller than wide, roughly oval with one flattened corner. A hammered dark-bronze edge fitting is seated into the rim of the stone, near-black metal with warm gold worn on the high edges, like idol iron. A fine web of hairline cracks runs through the stone and glows ember-gold from within.
Engraving: one glyph cut deep into the face of the stone: a round stone well seen from the front, filled to the brim so that its top edge is a bright horizontal line of light, and above it a single thin torn line stretched taut like a veil about to split. The glyph should read as fullness held under a thin barrier. No figure, no hand.
Tier marker: the roman numeral IV engraved and glowing in the same ember gold, centered below the glyph, about one fifth of the slab width.
Glow: ember gold, warm gold with a white-hot core in the deepest cuts. Aura of a few drifting embers and a faint heat shimmer around the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: a silvery aether-white only on the thin veil line above the well.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (rough stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: dark basalt grey and black, dark bronze, ember gold, one silver-white accent; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no staff or wand shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a second glyph, a second numeral, lens flares, blue or purple magic (this is the gold weapon line).
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 04 · `rune_wasting_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_wasting_iv` |
| Finaler Dateiname | `rune_wasting_iv.png` |
| Name | Rune der Auszehrung / Rune of Wasting |
| Effekt | Eigene Brand-, Blutungs- und Gift-Ticks richten 50 % mehr Schaden an |
| Linie | Waffe, alle Waffen |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (weapon line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the weapon rune family, standing upright, isolated on a transparent canvas.
Body: a rough-hewn upright slab of dark basalt with chipped, broken edges, taller than wide, roughly oval with one flattened corner. A hammered dark-bronze edge fitting is seated into the rim of the stone, near-black metal with warm gold worn on the high edges, like idol iron. A fine web of hairline cracks runs through the stone and glows ember-gold from within.
Engraving: one glyph cut deep into the face of the stone: a tall, thin, starved flame with a hollow dark center, leaning slightly as if guttering, and beneath it three small falling tick-drops in a vertical line. The glow of this glyph is deliberately thinner and more consumed than a healthy flame, like a coal burning itself out. The three drops are the same glyph line, not separate objects.
Tier marker: the roman numeral IV engraved and glowing in the same ember gold, centered below the glyph, about one fifth of the slab width.
Glow: ember gold, warm gold with a white-hot core only at the base of the flame. Aura of a few drifting embers and a thin thread of dying smoke rising from the flame tip. Stronger than a tier III rune overall, but the glyph itself reads as wasted and consumed.
Secondary color: ash-grey for the smoke, and a faint sickly green-grey tint only at the tips of the three falling drops.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (rough stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: dark basalt grey and black, dark bronze, ember gold, ash grey, one faint green-grey accent; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no weapon shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a healthy roaring fire, blood pools, skulls, a second numeral, lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 05 · `rune_judgement_iv` (Chase)

| Feld | Wert |
|---|---|
| Content-ID | `rune_judgement_iv` |
| Finaler Dateiname | `rune_judgement_iv.png` |
| Name | Rune des Gerichts / Rune of the Judgement |
| Effekt | +30 % Schaden gegen Ziele unter 25 % Leben |
| Linie | Waffe, alle Waffen, Chase-Rune (Rezept braucht den Götzensplitter) |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (weapon line, tier IV, chase item), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the weapon rune family and the most prized of its line, standing upright, isolated on a transparent canvas.
Body: a rough-hewn upright slab of dark basalt with chipped, broken edges, taller than wide, roughly oval with one flattened corner. The richest edge fitting of the weapon line: a hammered dark-bronze band seated into the rim, near-black metal with warm gold worn on the high edges, with a few small engraved marks in the metal. Through the stone run veins of near-black idol iron, matte and unlit, alongside a fine web of hairline cracks that glow ember-gold from within.
Engraving: one glyph cut deep into the face of the stone: a balance scale with two hanging pans, and behind it the head of an executioner's axe standing upright so that its blade crosses the scale's beam. The scale tilts slightly to one side, the axe stays perfectly straight. The composition reads as a verdict being passed. No figure, no hand.
Tier marker: the roman numeral IV engraved and glowing in the same ember gold, centered below the glyph, about one fifth of the slab width.
Glow: ember gold, warm gold with a white-hot core that is stronger than on any other weapon rune, brightest along the axe edge. Aura of drifting embers and a faint heat shimmer around the slab edges. The stone stays fully visible.
Secondary color: the matte near-black of the idol-iron veins in the stone. No other accent.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (rough stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; solemn, dark-fantasy restraint.
Color palette: dark basalt grey and black, dark bronze, ember gold, matte black iron veins; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no sword shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, blood, a gavel, a courtroom, a second numeral, lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

---

## Rüstungs-Linie

### 06 · `rune_iron_answer_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_iron_answer_iv` |
| Finaler Dateiname | `rune_iron_answer_iv.png` |
| Name | Rune der Eisernen Antwort / Rune of the Iron Answer |
| Effekt | Angreifer erleiden 2,5 Schaden je gelandetem Treffer |
| Linie | Rüstung, nur Platte |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (armor line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the plate armor rune family, standing upright, isolated on a transparent canvas.
Body: a flat-dressed upright slab of grey granite with squared-off, worked edges, taller than wide, roughly a tall hexagon with softened corners. A riveted band of dull steel runs around the rim, seated into the stone, with small round rivet heads. A fine web of hairline cracks runs through the stone and glows ice-blue from within.
Engraving: one glyph cut deep into the face of the stone: the front outline of a plate breastplate, and from its edges a ring of short iron thorns growing outward in every direction. The breastplate outline glows; the thorns are dark, unlit iron with only a thin blue rim light. The glyph reads as armor that answers back.
Tier marker: the roman numeral IV engraved and glowing in the same ice blue, centered below the glyph, about one fifth of the slab width.
Glow: ice blue, cool blue with a white core in the deepest cuts. Aura of thin frost-mist and a few small ice crystals forming at the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: the dark unlit iron of the thorns. No other accent.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: grey granite, dull steel, ice blue with white core, dark iron; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no full suit of armor shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, gold or orange glow (this is the blue armor line), a second numeral, lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 07 · `rune_ambush_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_ambush_iv` |
| Finaler Dateiname | `rune_ambush_iv.png` |
| Name | Rune des Hinterhalts / Rune of the Ambush |
| Effekt | Der erste Treffer jedes Kampfes verursacht doppelten Schaden |
| Linie | Rüstung, nur Leder |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (armor line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the leather armor rune family, standing upright, isolated on a transparent canvas.
Body: a flat-dressed upright slab of grey granite with squared-off, worked edges, taller than wide, roughly a tall hexagon with softened corners. A riveted band of dull steel runs around the rim, seated into the stone, with small round rivet heads. A fine web of hairline cracks runs through the stone and glows ice-blue from within.
Engraving: one glyph cut deep into the face of the stone: a downward-pointing dagger stepping out of a crescent of pure shadow that curves around its upper half, like a blade emerging from a dark doorway. Only the lower half of the blade glows; the upper half and the hilt sink into the shadow crescent. The glyph reads as the first strike from hiding.
Tier marker: the roman numeral IV engraved and glowing in the same ice blue, centered below the glyph, about one fifth of the slab width.
Glow: ice blue, cool blue with a white core at the dagger tip. Aura of thin frost-mist and a few small ice crystals forming at the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: the deep shadow-black of the crescent. No other accent.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: grey granite, dull steel, ice blue with white core, shadow black; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no real dagger as a separate object, no figure, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, blood, an eye, green or gold glow (this is the blue armor line), a second numeral, lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 08 · `rune_veil_drinker_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_veil_drinker_iv` |
| Finaler Dateiname | `rune_veil_drinker_iv.png` |
| Name | Rune des Schleiertrinkers / Rune of the Veil-Drinker |
| Effekt | 10 % des verursachten Schadens füllen den eigenen Ward-Pool |
| Linie | Rüstung, nur Stoff |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (armor line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the cloth armor rune family, standing upright, isolated on a transparent canvas.
Body: a flat-dressed upright slab of grey granite with squared-off, worked edges, taller than wide, roughly a tall hexagon with softened corners. A riveted band of dull steel runs around the rim, seated into the stone, with small round rivet heads. A fine web of hairline cracks runs through the stone and glows ice-blue from within.
Engraving: one glyph cut deep into the face of the stone: a wide, shallow drinking bowl seen slightly from above, and a thin sheet of mist descending from above and flowing over the rim into the bowl. The bowl outline glows; the mist is pale and semi-transparent and thins out at the top. The glyph reads as a vessel drinking a veil.
Tier marker: the roman numeral IV engraved and glowing in the same ice blue, centered below the glyph, about one fifth of the slab width.
Glow: ice blue, cool blue with a white core along the bowl rim. Aura of thin frost-mist and a few small ice crystals forming at the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: pale silver for the descending mist only.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: grey granite, dull steel, ice blue with white core, pale silver mist; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no face, no mouth, no figure, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a goblet with liquid, purple or gold glow (this is the blue armor line), a second numeral, lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 09 · `rune_unbroken_wall_iv`

| Feld | Wert |
|---|---|
| Content-ID | `rune_unbroken_wall_iv` |
| Finaler Dateiname | `rune_unbroken_wall_iv.png` |
| Name | Rune der Ungebrochenen Mauer / Rune of the Unbroken Wall |
| Effekt | Jeder erfolgreiche Block heilt 2 % der maximalen HP |
| Linie | Rüstung, nur Schild |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (armor line, tier IV), runtime game asset
Primary request: one single enchantment runestone, the fourth and highest tier of the shield rune family, standing upright, isolated on a transparent canvas.
Body: a flat-dressed upright slab of grey granite with squared-off, worked edges, taller than wide, roughly a tall hexagon with softened corners. A riveted band of dull steel runs around the rim, seated into the stone, with small round rivet heads. A fine web of hairline cracks runs through the stone and glows ice-blue from within.
Engraving: one glyph cut deep into the face of the stone: a crenellated wall of stone blocks, four courses high with battlements on top, and a vertical crack running down its center that is being knit shut by light. The crack glows brightest where it has already closed at the bottom and fades to a thin dark line at the top. The glyph reads as a wall that heals itself.
Tier marker: the roman numeral IV engraved and glowing in the same ice blue, centered below the glyph, about one fifth of the slab width.
Glow: ice blue, cool blue with a white core in the sealing crack. Aura of thin frost-mist and a few small ice crystals forming at the slab edges. Stronger than a tier III rune, but the stone stays fully visible.
Secondary color: a warm stone-grey for the individual wall blocks so they read as masonry against the slab.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura); no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the stone; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: grey granite, dull steel, ice blue with white core, warm stone grey; restrained saturation everywhere except the glyph core.
Constraints: no text or letters except the engraved roman numeral IV; no logo, no watermark, no shield shown as an object, no heart symbol, no figure, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a castle silhouette with towers, green or gold glow (this is the blue armor line), a second numeral, lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

---

## Schmuck-Linie (keine Ziffer)

### 10 · `rune_bounty`

| Feld | Wert |
|---|---|
| Content-ID | `rune_bounty` |
| Finaler Dateiname | `rune_bounty.png` |
| Name | Rune des Kopfgelds / Rune of the Bounty |
| Effekt | +20 % Schaden gegen das aktive Slayer-Ziel |
| Linie | Schmuck |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (jewelry line), runtime game asset
Primary request: one single enchantment runestone of the jewelry rune line, standing upright, isolated on a transparent canvas.
Body: a slim, smoothly polished upright slab of near-black obsidian-like stone, narrower and more refined than a weapon rune, taller than wide with gently rounded ends, edges softly beveled. A fine silver filigree inlay traces the rim of the stone in a thin continuous line with small knots at the top and bottom. A fine web of hairline cracks runs through the stone and glows violet from within.
Engraving: one glyph cut into the face of the stone and traced with the same silver filigree: a front-facing skull with a round coin stamped into its brow, ringed by a thin hunter's mark circle with four short tick marks at the compass points, like a target laid over a face. The glyph reads as a marked head with a price on it.
Tier marker: none. No numeral, no letters anywhere on the stone.
Glow: void violet, deep violet with a pale lilac core in the deepest cuts. Aura of thin void-wisps curling around the slab like smoke seen through a veil. Clearly stronger than a tier III rune, but the stone stays fully visible.
Secondary color: dull antique gold only on the coin in the skull's brow.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura), refined toward jewelry: finer, cleaner, more delicate than the weapon runes; no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, slab width about 55 to 60 percent, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the polished stone with a narrow specular edge; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: obsidian black, silver filigree, void violet with lilac core, one antique gold accent; restrained saturation everywhere except the glyph core.
Constraints: no text or letters, no numeral, no logo, no watermark, no ring or necklace shown as an object, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, pirate imagery, neon saturation, generic mobile-game gloss, plastic look, a grinning cartoon skull, blood, gold or blue glow (this is the violet jewelry line), lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 11 · `rune_tallyman`

| Feld | Wert |
|---|---|
| Content-ID | `rune_tallyman` |
| Finaler Dateiname | `rune_tallyman.png` |
| Name | Rune des Zählers / Rune of the Tallyman |
| Effekt | +15 % Gold aus Tötungen (benannt nach Voss dem Zähler, der alles zweimal zählt) |
| Linie | Schmuck |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (jewelry line), runtime game asset
Primary request: one single enchantment runestone of the jewelry rune line, standing upright, isolated on a transparent canvas.
Body: a slim, smoothly polished upright slab of near-black obsidian-like stone, narrower and more refined than a weapon rune, taller than wide with gently rounded ends, edges softly beveled. A fine silver filigree inlay traces the rim of the stone in a thin continuous line with small knots at the top and bottom. A fine web of hairline cracks runs through the stone and glows violet from within.
Engraving: one glyph cut into the face of the stone and traced with the same silver filigree: two vertical columns of tally strokes side by side, each column made of two groups of four upright strokes with one diagonal stroke crossing them, and beneath both columns a single round coin. The glyph reads as a ledger that counts everything twice.
Tier marker: none. No numeral, no letters anywhere on the stone. The tally strokes are marks, not writing.
Glow: void violet, deep violet with a pale lilac core in the deepest cuts. Aura of thin void-wisps curling around the slab like smoke seen through a veil. Clearly stronger than a tier III rune, but the stone stays fully visible.
Secondary color: dull antique gold only on the coin beneath the columns.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura), refined toward jewelry: finer, cleaner, more delicate than the weapon runes; no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, slab width about 55 to 60 percent, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the polished stone with a narrow specular edge; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: obsidian black, silver filigree, void violet with lilac core, one antique gold accent; restrained saturation everywhere except the glyph core.
Constraints: no text or letters, no numeral, no digits, no logo, no watermark, no coin pile, no purse, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a dollar sign or any currency symbol, gold or blue glow (this is the violet jewelry line), lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 12 · `rune_restless`

| Feld | Wert |
|---|---|
| Content-ID | `rune_restless` |
| Finaler Dateiname | `rune_restless.png` |
| Name | Rune der Rastlosen / Rune of the Restless |
| Effekt | Tötungen verkürzen die Erholungspause um 1 s |
| Linie | Schmuck |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (jewelry line), runtime game asset
Primary request: one single enchantment runestone of the jewelry rune line, standing upright, isolated on a transparent canvas.
Body: a slim, smoothly polished upright slab of near-black obsidian-like stone, narrower and more refined than a weapon rune, taller than wide with gently rounded ends, edges softly beveled. A fine silver filigree inlay traces the rim of the stone in a thin continuous line with small knots at the top and bottom. A fine web of hairline cracks runs through the stone and glows violet from within.
Engraving: one glyph cut into the face of the stone and traced with the same silver filigree: an hourglass whose upper bulb is intact and full of sand, and whose lower bulb is shattered open so the sand falls straight through and out of the bottom. The glyph reads as time that refuses to wait.
Tier marker: none. No numeral, no letters anywhere on the stone.
Glow: void violet, deep violet with a pale lilac core in the deepest cuts. Aura of thin void-wisps curling around the slab like smoke seen through a veil. Clearly stronger than a tier III rune, but the stone stays fully visible.
Secondary color: pale silver for the falling sand only.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura), refined toward jewelry: finer, cleaner, more delicate than the weapon runes; no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, slab width about 55 to 60 percent, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the polished stone with a narrow specular edge; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: obsidian black, silver filigree, void violet with lilac core, pale silver sand; restrained saturation everywhere except the glyph core.
Constraints: no text or letters, no numeral, no logo, no watermark, no clock face, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a wooden hourglass frame in perspective (keep it a flat engraved glyph), gold or blue glow (this is the violet jewelry line), lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 13 · `rune_chronicle`

| Feld | Wert |
|---|---|
| Content-ID | `rune_chronicle` |
| Finaler Dateiname | `rune_chronicle.png` |
| Name | Rune der Chronik / Rune of the Chronicle |
| Effekt | +10 % Kampf-Erfahrung (die Chronik des Wächters, jede Tat geht ein) |
| Linie | Schmuck |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (jewelry line), runtime game asset
Primary request: one single enchantment runestone of the jewelry rune line, standing upright, isolated on a transparent canvas.
Body: a slim, smoothly polished upright slab of near-black obsidian-like stone, narrower and more refined than a weapon rune, taller than wide with gently rounded ends, edges softly beveled. A fine silver filigree inlay traces the rim of the stone in a thin continuous line with small knots at the top and bottom. A fine web of hairline cracks runs through the stone and glows violet from within.
Engraving: one glyph cut into the face of the stone and traced with the same silver filigree: an open book seen from the front, both pages blank except for one single vertical ink stroke on the right page, and a quill laid diagonally across the spine. The glyph reads as a chronicle in which every deed is entered.
Tier marker: none. No numeral, no letters anywhere on the stone. The pages carry one stroke, not writing.
Glow: void violet, deep violet with a pale lilac core in the deepest cuts. Aura of thin void-wisps curling around the slab like smoke seen through a veil. Clearly stronger than a tier III rune, but the stone stays fully visible.
Secondary color: a muted parchment cream only on the open pages.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura), refined toward jewelry: finer, cleaner, more delicate than the weapon runes; no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, slab width about 55 to 60 percent, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the polished stone with a narrow specular edge; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: obsidian black, silver filigree, void violet with lilac core, muted parchment cream; restrained saturation everywhere except the glyph core.
Constraints: no text or letters, no numeral, no readable writing on the pages, no logo, no watermark, no eye, no face, no hands, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, neon saturation, generic mobile-game gloss, plastic look, a leather-bound book in perspective (keep it a flat engraved glyph), gold or blue glow (this is the violet jewelry line), lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

### 14 · `rune_gleaning` (Chase)

| Feld | Wert |
|---|---|
| Content-ID | `rune_gleaning` |
| Finaler Dateiname | `rune_gleaning.png` |
| Name | Rune der Nachlese / Rune of the Gleaning |
| Effekt | +10 % Beutechance auf reguläre Loot-Tabellen (die Götzenblüte wächst auf abgeernteten Feldern) |
| Linie | Schmuck, Chase-Rune, höchste Rune des Spiels (RC 95) |
| Assettyp | Item, Verzauberungs-Rune |
| Zielauflösung | 1024 × 1024 px |
| Hintergrundtyp | Freisteller mit nativem Alpha |
| Blickrichtung | nicht anwendbar |

```text
Use case: stylized-concept
Asset type: Grim Reach item, enchantment rune (jewelry line, chase item), runtime game asset
Primary request: one single enchantment runestone of the jewelry rune line, the most prized of its line, standing upright, isolated on a transparent canvas.
Body: a slim, smoothly polished upright slab of near-black obsidian-like stone, narrower and more refined than a weapon rune, taller than wide with gently rounded ends, edges softly beveled. The richest filigree of the jewelry line: a fine silver inlay traces the rim in a thin continuous line and branches into a few short vine-like tendrils at the top and bottom knots. A fine web of hairline cracks runs through the stone and glows violet from within.
Engraving: one glyph cut into the face of the stone and traced with the same silver filigree: a curved sickle blade arched over three fallen grain stalks lying on the base line of the glyph, and beneath them one small five-petaled flower. The glyph reads as gathering what was left behind after the harvest.
Tier marker: none. No numeral, no letters anywhere on the stone.
Glow: void violet, deep violet with a pale lilac core, a little stronger than on the other jewelry runes. Aura of thin void-wisps curling around the slab like smoke seen through a veil. The stone stays fully visible.
Secondary color: ivory cream on the small flower and a muted wheat ochre on the three grain stalks. Both stay subordinate to the violet glow.
Style/medium: original hand-painted Ashen Iron dark-fantasy art; painted, not rendered; grounded medieval materials; same visual language as the existing Grim Reach rune icons (stone slab, engraved glowing glyph, restrained aura), refined toward jewelry: finer, cleaner, more delicate than the weapon runes; no comic styling.
Composition/framing: frontal view with a slight tilt, slab centered, upright portrait silhouette on a square canvas, slab height about 84 percent of the canvas, slab width about 55 to 60 percent, aura may reach 92 percent, nothing touches the edge; complete silhouette; generous safe padding.
Lighting/mood: soft key light from the upper left on the polished stone with a narrow specular edge; the glyph is the second light source and throws its glow onto the surrounding stone and the air around the slab; dark-fantasy restraint.
Color palette: obsidian black, silver filigree, void violet with lilac core, ivory cream, muted wheat ochre; restrained saturation everywhere except the glyph core.
Constraints: no text or letters, no numeral, no logo, no watermark, no hands, no farmer, no field, no scene, no frame, no pedestal.
Avoid: comedy, folklore shorthand, harvest-festival cheer, neon saturation, generic mobile-game gloss, plastic look, a grim reaper, a skull, gold or blue glow (this is the violet jewelry line), lens flares.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image.
The canvas outside the subject must be genuinely transparent (alpha 0), with natural soft semi-transparent edge pixels where glow, embers, mist, or fine detail require them.
Do not draw or simulate transparency. No checkerboard or transparency grid. No magenta, green, blue, white, black, or other solid-color background for later removal. No chroma key and no post-key extraction.
No floor plane, ground patch, pedestal, contact shadow, cast shadow, border, text, or watermark.
Keep the complete subject inside the canvas with safe padding and an uncropped silhouette.
```

---

## Abnahmegate je Datei (aus der Vorlage, ergänzt)

- [ ] Alphakanal vorhanden und benutzt; kein Karo, kein Vollflächen-Hintergrund; äußere 32 px Alpha 0
- [ ] Grellrosa-Kontrasttest ohne Farbsaum bestanden
- [ ] 1024 × 1024 px, PNG, sRGB
- [ ] Finaler Dateiname entspricht exakt der Content-ID
- [ ] IV auf Waffe und Rüstung vorhanden, keine Ziffer auf Schmuck
- [ ] Linienfarbe stimmt (Gold / Eis-Blau / Violett)
- [ ] Glyph bei 64 px lesbar
- [ ] Neben Tier III: gleiche Familie, sichtbar eine Stufe höher
