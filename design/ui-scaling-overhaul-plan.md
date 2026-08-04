# UI Scaling Overhaul — Audit & Plan

**Status**: Planning only. Implementation blocked until Thieving-agent's `skills.css`/`SkillPage.tsx` work is merged.

---

## 1. Root Cause

`apps/client/src/main/index.ts` line 40:

```ts
const factor = Math.max(0.5, Math.min(1, Math.min(w / 1900, h / 1000)));
```

At 1920×1080: `min(1920/1900=1.01, 1080/1000=1.08) → 1.01 → capped at 1.0`. No scaling applied. The entire design — 21px Cinzel body font, 400px sidebar, 90px topbar, 96px content-header, 90px sidebar nav buttons — renders at 100% at the most common desktop resolution.

---

## 2. Strategy Recommendation: Option (C) Hybrid

**Recommendation: (C)** = (A) Baseline recalibration as the primary lever, plus targeted CSS fixes for two specific hardcoded structures that do not self-correct with zoom.

### Why not (B) alone?

A full rem/`--ui-scale` token refactor would touch every CSS file (≈ 11 files, >8000 lines), require updating hundreds of hardcoded `px` values, and would interfere with the Citadel 9-slice border-image system (those pixel widths are proportional to the border-image asset geometry). The payoff is not worth the risk.

### Why (A) is 80% of the fix

`setZoomFactor` is a browser-level zoom: it uniformly scales all CSS px values, font sizes, images, borders, and gaps in the rendered output. At factor 0.80:
- CSS viewport becomes **2400 × 1350 px** (logical).
- Every fixed `px` measurement in CSS is physically 20% smaller.
- `vh` / `vw` / `%` and responsive grids track the scaled viewport correctly — layout does not break.
- Media queries fire against the **CSS viewport**, so at 2400 px CSS width the `@media (max-width: 1280px)` breakpoints are NOT triggered at 1920 physical pixels. This is correct: the layout should use the wide rules.

### (C) Additional CSS fixes needed after zoom

The zoom cannot fix layouts whose problem scales up with the larger CSS viewport:
- **Hardcoded column count** (`monster-grid: repeat(4, 1fr)`): with CSS viewport at 2400 px, 4 monster cards each become ~488 px CSS = 390 px physical — slightly larger than at zoom 1.0.
- **The old `.char-sheet` 3-col fixed-px grid** — not used by the active CharacterPage (which uses `cs-layout` with `1fr` fractions), but should be verified as dead code.
- **`.ach2-stat-panels { grid-template-columns: repeat(3, 1fr) }`** — always 3 equal columns; fine.

---

## 3. Concrete Baseline Formula

Replace the formula in `apps/client/src/main/index.ts`:

```ts
// BEFORE (current)
const factor = Math.max(0.5, Math.min(1, Math.min(w / 1900, h / 1000)));

// AFTER (recommended)
const factor = Math.max(0.65, Math.min(0.95, Math.min(w / 2400, h / 1350)));
```

### Resulting factors

| Resolution   | CSS Viewport    | Factor | Body font (21px × f) | Sidebar (400px × f) |
|--------------|-----------------|--------|----------------------|---------------------|
| 1920 × 1080  | 2400 × 1350 px  | 0.80   | 16.8 px physical     | 320 px physical     |
| 1600 × 900   | 2400 × 1350 px  | 0.667  | 14.0 px physical     | 267 px physical     |
| 1366 × 768   | 2400 × 1350 px  | 0.65 ↑ | 13.7 px physical     | 260 px physical     |
| 1280 × 800   | 2400 × 1350 px  | 0.65 ↑ | 13.7 px physical     | 260 px physical     |
| 2560 × 1440  | 2695 × 1516 px  | 0.95 ↓ | 19.95 px physical    | 380 px physical     |

(↑ = floor applied, ↓ = cap applied)

**Floor rationale**: At 0.65 the 21px Cinzel body renders at ~13.7 px physical. Readable for a desktop RPG; Cinzel at this weight is legible down to ~12 px. The 0.65 floor ensures playability on 1366×768 laptops. A floor below 0.60 risks small-text complaints; above 0.70 would leave 1366×768 still visually large.

**Cap rationale**: 0.95 on large monitors (2560+ px) prevents the UI from appearing oversized on 4K displays while preserving the visual aesthetic.

---

## 4. Page-by-Page Audit at 1920×1080, Zoom 1.0 (Current Reality)

### Layout shell
- **Sidebar** (`.sidebar width: 400px`): Takes 400/1920 = **20.8% of horizontal space** with 90×90 nav icons and 90px-tall nav buttons. Feels massive. **Fix: zoom baseline**.
- **TopBar** (`.topbar clamp(72px, 7vw, 92px)`): At 1920 px, `7vw = 134px` → clamp → 92 px. Combined with content-header → 188 px of vertical chrome before page content. **Fix: zoom baseline**.
- **Content-Header** (`.content-header min-height: 96px; h1 font-size: 36px; .content-header-icon 80×80px`): Very tall for a header. At zoom 0.80 → 76.8 px, 28.8 px font, 64 px icon. **Fix: zoom baseline**.

### Character Page (`cs-layout`, `character.css` line 1573)
- Uses `grid-template-columns: 1fr 1.15fr 1.55fr` — fraction-based, naturally responsive. No overflow at any zoom.
- Portrait wrap: `flex: 1 1 auto; min-height: 220px` — fills available space. Fine.
- Attribute cards: `cs-attr-card-val clamp(22px, 4vh, 34px)`, `cs-attr-card-icon clamp(26px, 4.6vh, 44px)` — clamp-based, zoom-safe.
- Vitals bars: fixed `height: 22px` (vital-bar) + 24px cbar → 17.6 px and 19.2 px physical at zoom 0.80. Fine.
- **No action needed** beyond zoom fix.

### Character — OLD `.char-sheet` (`grid-template-columns: 320px 400px 1fr`)
- Verify CharacterPage.tsx does not render `.char-sheet` (confirmed: it uses `.cs-layout`). Search for any remaining use of `.char-sheet` in components; if none, mark as dead CSS.
- If used elsewhere: at zoom 0.80 the `1fr` right column expands to ~1232 px CSS = 986 px physical (very wide). Would need `max-width` guard or fraction conversion.
- **Action: audit usage; dead-code removal if unused**.

### Skill Pages (`SkillPage`, `skills.css`)
- Action grid: `repeat(auto-fill, minmax(max(260px, calc((100% - 54px) / 4)), 1fr))`. At zoom 0.80, CSS content ≈ 1952 px → 4 cards at ~474 px CSS = 379 px physical. Slightly wider than at zoom 1.0 (355 px physical), because the sidebar and chrome shrank more than the cards. Acceptable.
- Category headers: `border-width: 7px` wooden frame + `font-size: 19px`. At zoom 0.80 → 15.2 px physical. Fine.
- Skill card banner: `height: 190px` → 152 px physical at zoom 0.80. Good.
- **No action needed** beyond zoom fix. (SkillPage.tsx is off-limits during current agent run.)

### Combat — Zone Select (`zone-grid`)
- `repeat(auto-fill, minmax(max(220px, calc((100% - 54px) / 4)), 1fr))`. Responsive. Fine.
- Zone card `min-height: 168px` (on `.has-bg`) → 134 px physical at zoom 0.80. Fine.
- **No action needed**.

### Combat — Monster Select (`monster-grid`, `combat.css` line 26)
- **PROBLEM**: `grid-template-columns: repeat(4, 1fr)`. Hardcoded 4 columns.
- At zoom 0.80, CSS content ≈ 1952 px. Each card: 1952/4 = 488 px CSS = **390 px physical**. Cards are already large at zoom 1.0 (355 px); zoom-out effect is cancelled by the wider CSS content area.
- Monster card `.aspect-ratio: 3 / 4` → 390×520 px physical. Four giant cards in a row.
- **Fix required (combat.css)**: Change to auto-fill with 5-column preference:
  ```css
  .monster-grid {
    grid-template-columns: repeat(auto-fill, minmax(max(190px, calc((100% - 5*20px) / 5)), 1fr));
  }
  ```
  This gives ~366 px CSS = 293 px physical per card at zoom 0.80. Five cards per row. Existing `@media (max-width: 900px) → repeat(2, 1fr)` breakpoint stays.

### Combat — Battle (`battle-main`, `combat.css`)
- `grid-template-columns: 1fr 1fr 1.05fr`. Fraction-based. Fine.
- Fighter panels, HP bars, cast bars: all CSS-based and zoom-safe.
- `dmg-number font-size: 44px` → 35.2 px physical at zoom 0.80. Still highly visible.
- **No action needed**.

### Bank Page (`bank-columns`)
- `grid-template-columns: 1fr 1fr`. Fine.
- `bank-row font-size: 18px` → 14.4 px physical at zoom 0.80. Legible.
- **No action needed**.

### Shop Page (`shop-columns`)
- `grid-template-columns: 1fr 1fr`. Fine.
- `shop-row font-size: 18px` → 14.4 px. Fine.
- **No action needed**.

### Stats Page (`stats-page`)
- `repeat(auto-fit, minmax(340px, 1fr))`. At CSS 1952 px → 5 columns (5×340=1700 < 1952). 5 stat panels across. Fine.
- `stats-page .row font-size: 19px` → 15.2 px physical. Fine.
- **No action needed**.

### Achievements Page (`ach2-page`)
- `ach2-stat-panels: repeat(3, 1fr)` — 3 equal columns always. Fine.
- `ach2-grid: repeat(auto-fill, minmax(340px, 1fr))` — responsive. Fine.
- `ach2-card padding: 18px; ach2-emblem 60×60px` → 48px physical at zoom 0.80. Fine.
- **No action needed**.

### Bestiary Page (`bestiary-grid`)
- `repeat(auto-fill, minmax(240px, 1fr))`. At CSS 1952 px → 8 columns. Fine.
- `bestiary-portrait height: 96px` → 76.8 px physical. Fine.
- **No action needed**.

### Options Page (`options-page`)
- `repeat(auto-fit, minmax(340px, 1fr))`. Fine.
- **No action needed**.

### Quests Page (`quests-page`)
- Flex column list. No fixed widths. Fine.
- `quest-card padding: 16px 18px` → 12.8×14.4 px physical. Fine.
- **No action needed**.

### Skills Overview Page (`skilloverview-page`)
- Uses `.panel` and `.skilloverview-*` classes (list-style overview). No known fixed-px grid traps.
- **No action needed** (verify visually during test pass).

### Mastery Page (`mastery-*`)
- Not deeply audited; likely panel + list structure. Verify during test pass.

### Companions / Pet Gallery (`petgallery-*`)
- Not deeply audited. Verify during test pass.

### Main Menu (`menu`, `character.css` line 532)
- `width: 100vw; height: 100vh`. Menu panel `max-width: 610px`. At zoom 0.80: 488 px physical. Fine. Centered.
- **No action needed**.

### Character Creation (`creation`, `character.css` line 7)
- `height: 100vh`. Showcase `flex: 0 0 42%`. Uses `clamp()` throughout. Fine.
- **No action needed**.

### Item Tooltip — Ornamental (`itip-panel`, `components.css`)
- `width: 600px` → 480 px physical at zoom 0.80. Good.
- `itip-image-frame height: 392px` → 313.6 px physical. Good.
- `itip-panel max-height: 90vh` → 90% of 1080 physical = 972 px. Never clips.
- **No action needed**.

### Modals (`modal`, `modals.css`)
- `max-width: 480px`. At zoom 0.80: 384 px physical. Fine.
- Centered via flexbox on `modal-overlay: fixed inset: 0`. Always centered.
- **No action needed**.

---

## 5. Global CSS Structures — Risk Table

| File | Selector | Issue | Severity at zoom 0.80 | Recommendation |
|------|----------|--------|----------------------|----------------|
| `base.css` | `body { font-size: 21px }` | Entire type scale at 21px. Fixed by zoom. | None after zoom | No change |
| `sidebar.css` | `.sidebar { width: 400px }` | 320 px physical after zoom. Fine. | None | No change |
| `topbar.css` | `.topbar { height: clamp(72px, 7vw, 92px) }` | At CSS 2400px: 7vw=168 → 92px CSS = 73.6px physical. Fine. | None | No change |
| `topbar.css` | `.content-header { min-height: 96px }` | 76.8 px physical after zoom. Fine. | None | No change |
| `character.css` | `.char-sheet { grid-template-columns: 320px 400px 1fr }` | If active: `1fr` column balloons at wider CSS viewport. CharacterPage uses `cs-layout` (fr-based) instead. | Probably none (dead code) | Verify and remove if unused |
| `character.css` | `.doll { --doll-slot: min(96px, 11vh) }` | `11vh = 148.5 CSS px → min(96, 148.5) = 96px` at any zoom. Slots are always 96 CSS px = 76.8 px physical at 0.80. Fine. | None | No change |
| `character.css` | `.inv-grid { max-height: 22vh }` | Old char-sheet only. `22vh = 297px CSS = 237px physical`. Fine as scroll limit. | None | No change |
| `combat.css` | `.monster-grid { repeat(4, 1fr) }` | Cards grow wider at larger CSS viewport. 4 giant cards. | **High** | Change to auto-fill minmax (see §4) |
| `skills.css` | `.skillcard-banner { height: 190px }` | 152 px physical at zoom 0.80. Fine. | None | No change |
| `skills.css` | `.actions { minmax(max(260px,…/4), 1fr) }` | 4 cards slightly wider (379 px vs 355 px physical). Acceptable. | Low | No change |
| `components.css` | `.itip-panel { width: 600px }` | 480 px physical after zoom. Good size. | None | No change |
| `components.css` | `.itip-image-frame { height: 392px }` | 313 px physical after zoom. Fine. | None | No change |
| `design-system.css` | `.ds-slot { 52×52px }` | 41.6 px physical at 0.80. A bit small but fine for equipment grid. | Low | No change |
| `pages.css` | `.stats-page { minmax(340px, 1fr) }` | 5 columns at 2400 CSS viewport. Fine. | None | No change |
| `pages.css` | `.ach2-grid { minmax(340px, 1fr) }` | More columns at wider CSS viewport. Fine. | None | No change |

### `100vh` usage summary
- `html, body, #root { height: 100% }` + `.layout { height: 100vh }` — correct; fills physical screen at any zoom.
- `.creation { height: 100vh }`, `.menu { height: 100vh; width: 100vw }` — correct.
- `max-height: calc(100vh - 200px)` (citymap-stage) — `100vh = 1350 CSS px = 1080 physical` at zoom 0.80. `1350-200=1150 CSS → 920 physical`. Fine.
- No cases of `overflow: hidden` on a `100vh` container with dynamic child content that would clip.

---

## 6. Implementation Order

### Phase 1 — Baseline recalibration (single-line change, immediate effect)

**File**: `apps/client/src/main/index.ts`

Change line 40 (the `applyUiScale` function body):
```ts
// FROM:
const factor = Math.max(0.5, Math.min(1, Math.min(w / 1900, h / 1000)));
// TO:
const factor = Math.max(0.65, Math.min(0.95, Math.min(w / 2400, h / 1350)));
```

This single change fixes the problem for ~90% of pages.

### Phase 2 — Monster grid (targeted CSS fix, one selector)

**File**: `apps/client/src/renderer/styles/combat.css`

Replace `.monster-grid` column rule to prefer 5 columns:
```css
.monster-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(max(190px, calc((100% - 5*20px) / 5)), 1fr));
  gap: 20px;
}
/* keep existing @media (max-width: 900px) and @media (max-width: 480px) breakpoints unchanged */
```

### Phase 3 — Dead code verification

Search for `.char-sheet` usage in `apps/client/src/renderer/` (excluding CSS):
- If zero JSX references found → mark `.char-sheet`, `.char-col`, `.char-col-left`, `.char-col-mid`, `.char-col-right`, `.char-hero-block`, `.char-portrait-big`, `.char-portrait-nameplate`, `.char-vitals-strip`, `.char-stats-panel`, `.char-inv-header`, `.char-bags-row`, `.char-col-heading`, `.doll-wrap`, `.doll`, `.slot`, `.equip-caption`, `.char-col-right`, `.inv-grid` (original version, ~lines 871–1568 of `character.css`) as removable in a future CSS cleanup ticket.
- If found: convert fixed-column widths to `1fr 1.15fr 1.55fr` (same ratio as `cs-layout`).

### Phase 4 — Test pass

Verify at three target sizes using Electron dev mode (window resize):
1. **1920 × 1080** — factor 0.80. No horizontal scroll, no clipped text, no overflowing panels.
2. **1600 × 900** — factor 0.667. Same checks. Five monster cards per row fits.
3. **1366 × 768** — factor 0.65 (floor). Text readable (≥ 13 px physical). Sidebar at 260 px physical — compact but functional.

Check each view: Main Menu → Character Creation → Character → every Skill page → Combat (zone, monster, battle) → Bank → Shop → Stats → Achievements → Bestiary → Options → Quests → Skills Overview → Mastery → Companions.

---

## 7. What Is Deliberately NOT Done

- **No rem/`--ui-scale` refactor** (Option B): Too broad, interferes with Citadel 9-slice geometry.
- **No per-page zoom injection** (JS-side): Zoom is global and that is correct; individual page overrides would create inconsistent density.
- **No changes to `SkillPage.tsx` or `skills.css`** during this pass: those files are locked by the Thieving-agent.
- **No changes to font sizes in CSS**: The 20% zoom reduction makes 21px body → 16.8 px physical, which is the right outcome without touching CSS.

---

## 8. Files Affected

| Priority | File | Change |
|----------|------|--------|
| P0 | `apps/client/src/main/index.ts` | Formula change (1 line) |
| P1 | `apps/client/src/renderer/styles/combat.css` | `.monster-grid` column rule |
| P2 | `apps/client/src/renderer/styles/character.css` | Remove `.char-sheet` dead code (audit first) |
| — | All other CSS files | No changes |

---

*Plan authored 2026-06-27. Implementation waits on Thieving-agent merging `skills.css`/`SkillPage.tsx`.*
