# Pattern Gallery & 3D Enhancements Design

## Overview

Four features to improve the cadhatter pattern export and 3D preview experience:

1. **Pattern export fix** — match the GA001 reference PDF format exactly
2. **Pattern gallery view** — replace piece cards with tiled print-page thumbnails
3. **Hat color swatches** — preset color options for the 3D display
4. **Stand-in head** — optional head/neck geometry in the 3D view

---

## 1. Pattern Export Fix

### Problem

The current export has two issues:
- The calibration square in `patternSvg.ts` is positioned at `(6, svgH - sq - 16)`, which places it overlapping the bottom-left of the piece.
- The `buildPieceSvg` output (used in `printTile.ts` via `wrapInPage`) gets double-wrapped in an SVG with a nested `<g transform>`, causing the calibration square to render in the wrong coordinate frame.

### Reference: GA001 PDF format

From the Glory Allan GA001 pattern:
- One piece per page, filling the full printable area
- Calibration square in a corner of the **page** (not the piece SVG), labeled "1 inch / 25mm"
- Cut instructions: `CUT 2 - PRIMARY FABRIC / CUT 2 - SECONDARY FABRIC`
- Seam allowance note: `3/8" (1cm) seam allowance included`
- Page number formatted as `1/3`, `2/3`, `3/3`
- Piece label centered on the piece

### Fix

Move the calibration square out of `buildPieceSvg` entirely. It belongs in `printTile.ts → wrapInPage` / `tileSvg`, placed in the **page coordinate frame** at a fixed corner (bottom-left, clear of content). The `calibrationSquare` helper in `printTile.ts` already exists but is 10×10mm — update to 25.4×25.4mm (1 inch) with correct label.

Update cut instruction text in `buildPieceSvg`:
- Line 1: piece label (bold, large)
- Line 2: `CUT 2 - PRIMARY FABRIC / CUT 2 - SECONDARY FABRIC` (if cutCount === 2) or `CUT {n}` otherwise
- Line 3: `3/8" (1cm) seam allowance included` (small, gray)

Page number format: `1/3` (total page count needs to be threaded in from `tilePieces`).

**Page number strategy:** `tilePieces` builds pages in a single forward loop and does not know the total until the loop ends. Use a placeholder string `__TOTAL__` in each page's number label during generation, then do a `String.replace(/__TOTAL__/g, String(pages.length))` on all pages after the loop completes.

- Single-page pieces (via `wrapInPage`): format → `Page N of __TOTAL__`
- Multi-tile pages (via inline `tileSvg`): format → `Page N of __TOTAL__ — {piece.label} (col+1/cols, row+1/rows)`

Both paths use `__TOTAL__` so the post-loop replace covers all pages uniformly.

**`buildAllPiecesSvg` nested-SVG fix:** The `buildAllPiecesSvg` function in `patternSvg.ts` also nests full `<svg>` elements inside another `<svg>`, which causes coordinate confusion in browsers. Fix it to use raw path data directly (not nested SVG strings). Each piece's paths are translated manually by `(0, currentY)` offset using a `<g transform>` that contains only `<path>`, `<text>`, and other non-SVG elements. The `buildPieceSvg` function can be refactored to return either a standalone SVG string OR raw inner SVG content (paths + labels without the outer `<svg>` tag), controlled by an option flag `{ standalone?: boolean }` (default true for backward compat). Call sites:
- `PatternView.tsx → handleDownload` via `buildAllPiecesSvg` → pass `standalone: false`
- `printTile.ts → wrapInPage` → pass `standalone: false`
- `printTile.ts → tileSvg` (tiled path) → pass `standalone: false`

Delete the `buildCalibrationSquare` helper from `patternSvg.ts` once it is no longer called there. A fixed calibration square lives only in `printTile.ts`.

**Files to change:**
- `src/lib/patternSvg.ts` — remove `calibrationSquare` from `buildPieceSvg`; update label text; add `standalone` option to return inner content only
- `src/lib/printTile.ts` — move calibration square to page frame; fix calibration size to 25.4×25.4mm with label `25mm / 1 inch`; use `__TOTAL__` placeholder + post-loop replace for page numbering; use inner-content version of `buildPieceSvg` to avoid nested SVGs

---

## 2. Pattern Gallery View

### Problem

The current `PatternView` renders individual `buildPieceSvg` cards stacked vertically. This doesn't reflect what the user will actually print — users need to see the tiled print pages to verify layout.

### Solution

Replace the scrollable piece-card list with a **gallery of tiled print pages** using `tilePieces()`. Each page renders as a thumbnail in a responsive grid. Clicking a thumbnail opens it full-size (or zooms it).

**Layout:**
- Grid of page thumbnails (2 columns on wide, 1 on narrow)
- Each thumbnail: white card with drop shadow. Target thumbnail display width = 280px. The page SVG has `width` and `height` in mm (e.g., 215.9mm for Letter). At 96 DPI, 1mm = 3.7795px, so a Letter page renders at ~816px wide natively. Scale factor = `280 / (paperWidthMm * 3.7795)` (≈ 0.342 for Letter, ≈ 0.353 for A4). Apply via `style={{ transform: 'scale(factor)', transformOrigin: 'top left' }}` on the SVG element, and set the wrapper `div` dimensions to `280px × (paperHeightMm * 3.7795 * factor)px` to prevent layout overflow.
- Thumbnail label: `Page N of M` (below the thumbnail card)
- Clicking thumbnail opens a modal with the full-size page SVG (no scaling)

**Implementation:**
- `PatternView.tsx`: compute `const pages = tilePieces(pieces, params.paperSize)` on render
- Render pages as `<div dangerouslySetInnerHTML={{ __html: page }}>` scaled via CSS transform (see Layout above)
- Modal: fullscreen overlay with close button, renders the selected page SVG at 100%
- Download button (`handleDownload`) continues to use `buildAllPiecesSvg` for single-file download (this function is also fixed as part of Feature 1)

**Files to change:**
- `src/components/PatternView.tsx` — replace piece cards with page gallery + modal

---

## 3. Hat Color Swatches

### Solution

Add a row of color swatches below the 3D canvas in the 3D tab. Selecting a swatch sets `hatColor` state in `App.tsx`, which is passed to `HatScene` → `PlainHat`. When fabric texture is active, the color is ignored (texture takes precedence).

**Presets:**
| Name | Hex |
|------|-----|
| Natural | `#f0ece4` (current default) |
| Navy | `#1e3a5f` |
| Black | `#1a1a1a` |
| Olive | `#6b7c45` |
| Burgundy | `#6e1c2e` |
| Sand | `#c8a96e` |

Plus a custom color picker (`<input type="color">`).

When a fabric texture is active (`fabricUrl` is set), the swatch row and color picker are visually disabled (reduced opacity, `pointer-events: none`) since the texture overrides color. The swatches remain visible but non-interactive as a hint that they'll apply when texture is removed.

**Files to change:**
- `src/pages/App.tsx` — add `hatColor` state, pass to HatScene; add swatch row in 3D tab
- `src/components/HatScene.tsx` — accept `hatColor?: string` prop; pass to `PlainHat`
- `src/components/HatScene.tsx` (PlainHat) — use `color={hatColor ?? '#f0ece4'}` on materials

---

## 4. Stand-In Head

### Solution

A toggle button in the 3D tab shows/hides a simple head + neck geometry beneath the hat. The head is sized to match `headCircumference` from `HatParams`.

**Geometry:**
- Head: `SphereGeometry(r, 32, 32)` where `r = headCircumference / (2 * Math.PI) * MM`. Apply `scale={[1, 1.25, 1]}` on the `<mesh>` to make the head taller than wide (ellipsoid). The effective y-radius = `r * 1.25`.
- Neck: `CylinderGeometry` radius ≈ `0.55 * r`, height ≈ `60 * MM`, positioned below head center.
- Material: `meshStandardMaterial color="#c8956c"` (neutral skin tone, no texture)

**Hat positioning:** The hat stays stationary at the origin (orbit behavior is unchanged). The head moves to meet the hat: head top = hat bottom = y of `-sideHeight/2`. Head center y = `-sideHeight/2 - r * 1.25`. Neck center y = head center y - `r * 1.25` - `30 * MM`.

**Toggle:** A `showHead` boolean state in `App.tsx`, toggled by a button in the 3D tab UI. Passed to `HatScene` as `showHead?: boolean`.

**Files to change:**
- `src/pages/App.tsx` — add `showHead` state, toggle button in 3D tab
- `src/components/HatScene.tsx` — accept `showHead?: boolean`; render `StandinHead` component when true
- `src/components/HatScene.tsx` (new `StandinHead` component) — head sphere + neck cylinder geometry

---

## Data Flow Summary

```
App.tsx
  hatColor (string)  ─────────────► HatScene → PlainHat color
  showHead (boolean) ─────────────► HatScene → StandinHead (conditional)
  fabricUrl (string) ─────────────► HatScene → FabricHat (existing)
  params.headCircumference ────────► HatScene → StandinHead sizing
  params.paperSize ────────────────► PatternView → tilePieces

PatternView.tsx
  tilePieces(pieces, paperSize) ───► page SVG thumbnails + modal

printTile.ts
  wrapInPage / tileSvg ────────────► calibration square in page frame
  total page count ────────────────► N/total page numbers

patternSvg.ts
  buildPieceSvg ───────────────────► piece SVG without calibration square
```

---

## Out of Scope

- Multi-layer fabric (primary/secondary color distinction in 3D)
- Animated head turn or hat placement animation
- PDF export (print dialog is sufficient)
- Custom head size separate from `headCircumference` param
