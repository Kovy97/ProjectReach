# Prompts — Kampfeffekte Testlauf (6)

Vorlage `CODEX/templates/IMAGEGEN-ASSET-PROMPT.md`. Englisch, jeder Prompt vollständig. Zwei Formate:
**Streifen** (768 × 256, drei Felder à 256 × 256 von links nach rechts: onset, peak, fade) und **Geschoss** (256 × 128, Einzelbild).

## Serienkern Streifen

```
Game VFX sprite strip for a dark fantasy idle RPG, painterly realism in the muted "ashen iron" palette with ONE controlled accent color, isolated on a fully transparent background (true alpha, no checkerboard, no backdrop, no floor, no shadow). The canvas is 768 x 256 and holds exactly THREE square cells of 256 x 256 side by side, each cell showing the SAME effect at three moments: left = onset (small, forming), middle = peak (largest, brightest), right = fade (dissolving, dimmer). Same center point in every cell, generous padding, no text, no frame lines, no watermark.
```

## Pflichtzusatz Alpha (in jeden Prompt)

```
Output requirement: a native transparent PNG with a real alpha channel generated as part of the image. Everything outside the effect must be genuinely transparent (alpha 0) with soft edges on glow and smoke. Do not draw or simulate transparency. No checkerboard, no solid background, no chroma key.
```

---

## 1 · `fx_missile_arcane.png` (Geschoss, 256 × 128)
```
Game VFX projectile sprite for a dark fantasy idle RPG, painterly realism, isolated on a fully transparent background (true alpha). A single arcane bolt flying to the RIGHT: a compact violet-white core of light with a short trailing wisp of pale violet smoke behind it (to the left), subtle rune flecks in the trail, muted "ashen iron" palette with violet as the one accent. Canvas 256 x 128, bolt centered, head near the right third, tail fading toward the left edge, no text, no frame.
[Pflichtzusatz Alpha]
```

## 2 · `fx_impact_arcane.png` (Streifen)
```
[Serienkern Streifen] Subject: an arcane impact burst where a violet bolt strikes: onset = a small violet-white spark with a thin ring, peak = a bright violet burst with a broken ring of light and a few drifting rune shards, fade = dissolving violet smoke and dimming shards. Accent color violet.
[Pflichtzusatz Alpha]
```

## 3 · `fx_impact_fire.png` (Streifen)
```
[Serienkern Streifen] Subject: a fire impact where a firebolt strikes: onset = a small orange spark with a puff of soot, peak = a rolling orange-red fireburst with dark smoke curling at the edges and a few embers, fade = dimming embers and grey smoke. Accent color ember orange, no cartoon flames, grounded and smoky.
[Pflichtzusatz Alpha]
```

## 4 · `fx_slash_sword.png` (Streifen)
```
[Serienkern Streifen] Subject: a sword slash arc cutting from upper left to lower right: onset = a thin pale steel streak beginning at upper left, peak = a full crescent slash of cold steel light with a faint motion blur and tiny sparks along the edge, fade = the crescent thinning and dissolving into pale dust. Accent color cold steel white, no blood in this asset.
[Pflichtzusatz Alpha]
```

## 5 · `fx_blood_red.png` (Streifen)
```
[Serienkern Streifen] Subject: a restrained blood spatter from a landed hit on a living creature: onset = a few small dark red droplets bursting outward from the center, peak = a compact spray of dark muted red droplets and thin streaks arcing outward and slightly downward, fade = droplets falling and thinning to a few dark specks. Muted and brief, no gore, no body parts, no pooling, painterly not glossy. Accent color dark red.
[Pflichtzusatz Alpha]
```

## 6 · `fx_pet_bite.png` (Streifen)
```
[Serienkern Streifen] Subject: a companion beast bite mark effect: onset = two faint curved rows of small claw-like marks forming, peak = a clear bite crescent (upper and lower jaw arcs of pale bone-white marks) with a small burst of dust between them, fade = the marks dissolving into dust. Accent color pale bone, no blood in this asset, reads clearly at 256 pixels.
[Pflichtzusatz Alpha]
```
