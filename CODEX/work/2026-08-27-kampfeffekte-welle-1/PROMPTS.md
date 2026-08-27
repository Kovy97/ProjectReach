# Prompts — Kampfeffekte, Serie Welle 1 (33 Dateien, davon 6 aus dem Testlauf)

Gehört zu `BRIEF.md`. Konzept `design/combat-fx/konzept-kampfeffekte.md` (Chef-Entscheide D1–D5 vom 27.08.2026: sieben Magie-Themen, drei Schlüsselbilder, gedecktes Blut, alle vier Familien, Gegner gespiegelt). Streifen 768 × 256 (drei Felder à 256 × 256: Beginn, Höhepunkt, Ausklang), Geschosse 256 × 128 (Flug nach RECHTS). Die sechs Testlauf-Dateien werden übernommen, nicht neu erzeugt.

| # | Datei | Maß | Familie | Status |
|---:|---|---|---|---|
| 1 | `fx_missile_arcane.png` | 256 × 128 | A Geschoss | aus dem Testlauf |
| 2 | `fx_impact_arcane.png` | 768 × 256 | A Einschlag | aus dem Testlauf |
| 3 | `fx_missile_fire.png` | 256 × 128 | A Geschoss | neu |
| 4 | `fx_impact_fire.png` | 768 × 256 | A Einschlag | aus dem Testlauf |
| 5 | `fx_missile_frost.png` | 256 × 128 | A Geschoss | neu |
| 6 | `fx_impact_frost.png` | 768 × 256 | A Einschlag | neu |
| 7 | `fx_missile_shock.png` | 256 × 128 | A Geschoss | neu |
| 8 | `fx_impact_shock.png` | 768 × 256 | A Einschlag | neu |
| 9 | `fx_missile_poison.png` | 256 × 128 | A Geschoss | neu |
| 10 | `fx_impact_poison.png` | 768 × 256 | A Einschlag | neu |
| 11 | `fx_missile_void.png` | 256 × 128 | A Geschoss | neu |
| 12 | `fx_impact_void.png` | 768 × 256 | A Einschlag | neu |
| 13 | `fx_missile_aether.png` | 256 × 128 | A Geschoss | neu |
| 14 | `fx_impact_aether.png` | 768 × 256 | A Einschlag | neu |
| 15 | `fx_slash_cut.png` | 768 × 256 | B Slash | aus dem Testlauf |
| 16 | `fx_slash_heavy.png` | 768 × 256 | B Slash | neu |
| 17 | `fx_slash_blunt.png` | 768 × 256 | B Slash | neu |
| 18 | `fx_slash_thrust.png` | 768 × 256 | B Slash | neu |
| 19 | `fx_missile_arrow.png` | 256 × 128 | B Pfeil | neu |
| 20 | `fx_impact_arrow.png` | 768 × 256 | B Pfeil | neu |
| 21 | `fx_blood_red.png` | 768 × 256 | C Blut | aus dem Testlauf |
| 22 | `fx_blood_ichor.png` | 768 × 256 | C Blut | neu |
| 23 | `fx_blood_bone.png` | 768 × 256 | C Blut | neu |
| 24 | `fx_impact_block.png` | 768 × 256 | C Block | neu |
| 25 | `fx_miss_whiff.png` | 768 × 256 | C Fehlschlag | neu |
| 26 | `fx_pet_bite.png` | 768 × 256 | D Begleiter | aus dem Testlauf |
| 27 | `fx_pet_bolt.png` | 768 × 256 | D Begleiter | neu |
| 28 | `fx_pet_ward.png` | 768 × 256 | D Begleiter | neu |
| 29 | `fx_pet_mark.png` | 768 × 256 | D Begleiter | neu |
| 30 | `fx_pet_pilfer.png` | 768 × 256 | D Begleiter | neu |
| 31 | `fx_pet_critstar.png` | 768 × 256 | D Begleiter | neu |
| 32 | `fx_crit_magic.png` | 768 × 256 | Crit-Overlay | neu |
| 33 | `fx_crit_weapon.png` | 768 × 256 | Crit-Overlay | neu |

---

## 1 · `fx_missile_arcane.png` (256 × 128) — aus dem Testlauf übernehmen
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a compact violet-white core of light with pale violet smoke and tiny rune flecks. Accent color violet.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 2 · `fx_impact_arcane.png` (768 × 256) — aus dem Testlauf übernehmen
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a violet burst with a broken ring of light and drifting rune shards, dissolving into violet smoke. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color violet.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 3 · `fx_missile_fire.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a smoldering ember core wrapped in orange flame with dark soot trailing. Accent color ember orange.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 4 · `fx_impact_fire.png` (768 × 256) — aus dem Testlauf übernehmen
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a rolling orange-red fireburst with curling dark smoke and embers, fading to grey smoke; grounded, no cartoon flames. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color ember orange.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 5 · `fx_missile_frost.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a shard of pale blue ice with a crystalline mist trail. Accent color ice blue.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 6 · `fx_impact_frost.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a burst of ice crystals and frost mist, shards radiating outward, dissolving into cold vapor. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color ice blue.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 7 · `fx_missile_shock.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a crackling ball of pale yellow lightning with thin forking arcs trailing. Accent color pale yellow.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 8 · `fx_impact_shock.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a lightning discharge with jagged arcs, a bright flash at the center, fading to faint sparks. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color pale yellow.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 9 · `fx_missile_poison.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a dripping globule of dark green venom with a thin vapor trail. Accent color sickly green.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 10 · `fx_impact_poison.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a splash of dark green venom with rising toxic bubbles and vapor, settling into a few drips. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color sickly green.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 11 · `fx_missile_void.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a dark sphere of void swallowing light with a thin violet rim and shadow trail. Accent color deep purple-black.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 12 · `fx_impact_void.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: an implosion of shadow: dark tendrils pulled inward, a thin violet rim flash, fading to black smoke. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color deep purple-black.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 13 · `fx_missile_aether.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a bright pale gold spark with a soft white halo and a thin light trail. Accent color pale gold-white.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 14 · `fx_impact_aether.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a soft radiant burst of pale gold light with fine rays and drifting motes, fading to a warm glow. Onset = a small spark of the same kind, peak = the full burst, fade = the remains. Accent color pale gold-white.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 15 · `fx_slash_cut.png` (768 × 256) — aus dem Testlauf übernehmen
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a sword slash arc cutting from upper left to lower right: onset = a thin pale steel streak, peak = a full crescent of cold steel light with faint motion blur and tiny sparks, fade = the crescent thinning into pale dust. Accent color cold steel white, no blood in this asset.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 16 · `fx_slash_heavy.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a heavy two-handed chop from upper left to lower right: onset = a broad dark streak beginning, peak = a wide heavy crescent of dull steel with a shockwave puff of dust at the impact end, fade = dust settling. Accent color dull steel, no blood in this asset.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 17 · `fx_slash_blunt.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a crushing blunt impact of a mace or hammer: onset = a small ring of compressed air, peak = a broad shockwave ring with dust and stone chips bursting outward, fade = the ring thinning and dust falling. Accent color dust brown, no blood in this asset.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 18 · `fx_slash_thrust.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a spear thrust from left to right: onset = a thin bright point of light, peak = a long narrow lance of steel light with a small burst at the tip, fade = the lance dissolving into a thin line of sparks. Accent color cold steel white, no blood in this asset.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 19 · `fx_missile_arrow.png` (256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop). A single projectile flying to the RIGHT with a short trailing wisp behind it (to the left), muted "ashen iron" palette with ONE accent color. Canvas 256 x 128, projectile centered, head near the right third, tail fading toward the left edge, no text, no frame. Subject: a single wooden arrow with a steel head and grey fletching flying to the RIGHT, a faint motion streak behind it. Accent color none, natural materials.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 20 · `fx_impact_arrow.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: an arrow striking: onset = a small puff of dust at a point, peak = a burst of dust and a few wood and steel splinters with a short flash at the point, fade = dust settling. Accent color pale grey.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 21 · `fx_blood_red.png` (768 × 256) — aus dem Testlauf übernehmen
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a restrained blood spatter from a landed hit on a living creature: onset = a few small dark red droplets bursting outward, peak = a compact spray of dark muted red droplets and thin streaks arcing outward and slightly downward, fade = droplets falling and thinning to a few dark specks. Muted and brief, no gore, no body parts, no pooling, painterly not glossy. Accent color dark red.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 22 · `fx_blood_ichor.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a spatter of dark ichor from an undead or void creature: onset = a few black-violet drops, peak = a compact spray of thick black-violet ichor with a faint sickly sheen, fade = drops falling and thinning. Muted and brief, no gore, no body parts, no pooling, painterly not glossy. Accent color black-violet.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 23 · `fx_blood_bone.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a burst of bone dust and small bone chips from a struck skeleton: onset = a puff of pale dust, peak = a spray of pale chips and dust arcing outward, fade = dust settling. Muted and brief, no gore, no body parts, no pooling, painterly not glossy. Accent color bone white.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 24 · `fx_impact_block.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a shield block: onset = a small spark where steel meets steel, peak = a burst of orange-white sparks fanning outward from a point with a faint shield-shaped flash, fade = sparks falling. Accent color spark orange.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 25 · `fx_miss_whiff.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a missed swing, air only: onset = a faint pale streak, peak = a soft translucent whoosh of displaced air with a few dust motes, fade = the streak dissolving. Very subtle, low contrast. Accent color pale grey.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 26 · `fx_pet_bite.png` (768 × 256) — aus dem Testlauf übernehmen
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a companion beast bite mark: onset = two faint curved rows of claw-like marks forming, peak = a clear bite crescent of pale bone-white marks with a small burst of dust between them, fade = the marks dissolving into dust. Reads clearly at 256 pixels. Accent color pale bone.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 27 · `fx_pet_bolt.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a small companion bolt strike: onset = a tiny teal spark, peak = a compact teal burst with a thin ring and a few motes, fade = motes drifting. Reads clearly at 256 pixels. Accent color teal.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 28 · `fx_pet_ward.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a companion ward or heal glow around a figure's center: onset = a faint green-gold ring forming, peak = a soft radiant ring of green-gold light with rising motes, fade = the ring thinning upward. Reads clearly at 256 pixels. Accent color green-gold.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 29 · `fx_pet_mark.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a companion curse mark set on an enemy: onset = a faint dark red rune line forming, peak = a hovering dark red rune sigil with a thin ring and a pulse of shadow, fade = the sigil dimming. Reads clearly at 256 pixels. Accent color dark red.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 30 · `fx_pet_pilfer.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a companion pilfer effect: onset = a small glint of gold, peak = a quick swirl of pale dust with a few gold coin glints and a tiny burlap pouch silhouette, fade = the dust and glints settling. Reads clearly at 256 pixels. Accent color gold.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 31 · `fx_pet_critstar.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a companion critical strike flare: onset = a small four-point white spark, peak = a sharp four-point star flare of white-gold light with a thin ring, fade = the flare shrinking to a point. Reads clearly at 256 pixels. Accent color white-gold.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 32 · `fx_crit_magic.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a critical hit overlay for spells, layered OVER an impact: onset = a thin white ring, peak = a wide bright white-violet ring flash with radial light streaks, fade = the ring expanding and vanishing. Mostly transparent in the center. Accent color white-violet.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

## 33 · `fx_crit_weapon.png` (768 × 256)
```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark. Subject: a critical hit overlay for weapon hits, layered OVER a slash: onset = a thin gold ring, peak = a wide bright white-gold ring flash with radial streaks and a few sparks, fade = the ring expanding and vanishing. Mostly transparent in the center. Accent color white-gold.
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```
