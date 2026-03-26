# Pattern Gallery & 3D Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix pattern export to match GA001 PDF format, add a gallery view of print pages, add hat color swatches, and add an optional stand-in head to the 3D view.

**Architecture:** Four independent features touching the pattern SVG pipeline (`patternSvg.ts` → `printTile.ts` → `PatternView.tsx`) and the 3D scene (`HatScene.tsx` ← `App.tsx`). Pattern changes form a chain (Tasks 1-3 must be done in order); 3D changes (Tasks 4-5) are independent of the pattern chain but share `App.tsx`.

**Tech Stack:** React 19 + TypeScript, Three.js 0.183 + @react-three/fiber 9, Vitest + @testing-library/react, SVG string generation (no external SVG library)

---

## File Map

| File | Change |
|------|--------|
| `src/lib/patternSvg.ts` | Remove `calibrationSquare` option; add `standalone` option; update label text; fix `buildAllPiecesSvg` nested-SVG bug |
| `src/lib/patternSvg.test.ts` | Update tests for new API |
| `src/lib/printTile.ts` | Use `buildPieceSvg({standalone:false})`; move calibration to page frame (25.4mm); `__TOTAL__` placeholder with post-loop replace |
| `src/lib/printTile.test.ts` | Update calibration text assertion; add total-count assertion |
| `src/components/PatternView.tsx` | Replace piece-card list with page gallery grid + click-to-expand modal |
| `src/pages/App.tsx` | Add `hatColor` state + swatch bar; add `showHead` toggle button |
| `src/components/HatScene.tsx` | Accept `hatColor?` + `showHead?`; pass color to PlainHat; add `StandinHead` component |

---

## Task 1: patternSvg.ts — standalone mode, GA001 labels, remove calibration square

**Context:** `buildPieceSvg` currently wraps its output in `<svg>...</svg>`. When `printTile.ts` nests that inside another `<svg>`, browsers treat it as an independent viewport and the coordinate system breaks. Fix: add `standalone: false` option that returns only the inner `<g>` content. Also update label text to match GA001 format.

**Files:**
- Modify: `src/lib/patternSvg.ts`
- Modify: `src/lib/patternSvg.test.ts`

- [ ] **Step 1: Update the test file first (TDD)**

Replace `src/lib/patternSvg.test.ts` entirely:

```typescript
import { describe, it, expect } from 'vitest'
import { buildPieceSvg, buildAllPiecesSvg, PIECE_FONT } from './patternSvg'
import { DEFAULT_PARAMS } from '../types'
import { computeHat } from './hatMath'

describe('buildPieceSvg', () => {
  it('standalone=true (default) produces a complete SVG element', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const svg = buildPieceSvg(geo.patternPieces[0])
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('</svg>')
    expect(svg).toContain(geo.patternPieces[0].cutPath)
    expect(svg).toContain(geo.patternPieces[0].sewingPath)
  })

  it('standalone=false returns inner <g> block without <svg> wrapper', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const inner = buildPieceSvg(geo.patternPieces[0], { standalone: false })
    expect(inner).not.toMatch(/^<svg /)
    expect(inner).toMatch(/^<g transform=/)
    expect(inner).toContain(geo.patternPieces[0].cutPath)
  })

  it('includes PLACE ON FOLD banner when piece is on fold', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    // crown piece (index 0) is on fold
    const svg = buildPieceSvg(geo.patternPieces[0])
    expect(svg).toContain('PLACE ON FOLD')
  })

  it('includes GA001-style cut instruction for cutCount=2', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    // brim piece has cutCount=2
    const brim = geo.patternPieces.find(p => p.id === 'brim')!
    const svg = buildPieceSvg(brim)
    expect(svg).toContain('CUT 2 - PRIMARY FABRIC / CUT 2 - SECONDARY FABRIC')
  })

  it('includes seam allowance note', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const svg = buildPieceSvg(geo.patternPieces[0])
    expect(svg).toContain('seam allowance included')
  })

  it('does NOT include a calibration square', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const svg = buildPieceSvg(geo.patternPieces[0])
    expect(svg).not.toContain('TEST SQUARE')
  })

  it('includes notch marks when piece has notches', () => {
    const geo = computeHat({ ...DEFAULT_PARAMS, showNotches: true })
    const svg = buildPieceSvg(geo.patternPieces[0])
    expect(svg).toContain('class="notch"')
  })
})

describe('buildAllPiecesSvg', () => {
  it('produces a single SVG with all pieces', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const svg = buildAllPiecesSvg(geo.patternPieces)
    expect(svg).toMatch(/^<svg /)
    expect(svg).toContain('</svg>')
    for (const piece of geo.patternPieces) {
      expect(svg).toContain(piece.cutPath)
    }
  })

  it('does NOT nest <svg> elements inside another <svg>', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const svg = buildAllPiecesSvg(geo.patternPieces)
    // Remove the opening <svg ...> tag, then check no more <svg remain
    const withoutOuter = svg.replace(/^<svg[^>]*>/, '')
    expect(withoutOuter).not.toContain('<svg')
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run src/lib/patternSvg.test.ts
```

Expected: several failures (wrong API, old label text, nested SVG).

- [ ] **Step 3: Replace `src/lib/patternSvg.ts`**

```typescript
import type { PatternPiece, FoldEdge } from '../types'

export const PIECE_FONT = 'font-family="Arial, sans-serif"'
const PADDING = 25   // mm of space around piece
const BANNER_W = 10  // mm height/width of PLACE ON FOLD banner

interface SvgOptions {
  standalone?: boolean  // default true; false = return inner <g> content without <svg> wrapper
}

export function buildPieceSvg(piece: PatternPiece, opts: SvgOptions = {}): string {
  const { standalone = true } = opts
  const { width, height, minX, minY } = piece.boundingBox
  const vw = width + PADDING * 2
  const vh = height + PADDING * 2
  const tx = PADDING - minX
  const ty = PADDING - minY

  const notchMarks = piece.notches.map(n => {
    const len = 3, hw = 0.5
    return `<rect class="notch" x="${n.x - hw}" y="${n.y - len / 2}" width="${hw * 2}" height="${len}"
      transform="rotate(${(n.angle * 180) / Math.PI} ${n.x} ${n.y})"
      fill="black" stroke="none"/>`
  }).join('\n')

  const foldBanners = buildFoldBanners(piece.foldEdges)

  const cutInstruction = piece.cutCount === 2
    ? 'CUT 2 - PRIMARY FABRIC / CUT 2 - SECONDARY FABRIC'
    : `CUT ${piece.cutCount}`

  const labelX = minX + width / 2
  const labelY = minY + height / 2
  const label = `
    <text x="${labelX}" y="${labelY - 12}" text-anchor="middle" font-size="13" font-weight="bold" ${PIECE_FONT}>${piece.label}</text>
    <text x="${labelX}" y="${labelY + 5}" text-anchor="middle" font-size="7" ${PIECE_FONT}>${cutInstruction}</text>
    <text x="${labelX}" y="${labelY + 17}" text-anchor="middle" font-size="5" fill="#999" ${PIECE_FONT}>3/8&quot; (1cm) seam allowance included</text>`

  const inner = `<g transform="translate(${tx} ${ty})">
    <path d="${piece.sewingPath}" fill="none" stroke="#555" stroke-width="0.5" stroke-dasharray="3 2"/>
    <path d="${piece.cutPath}" fill="none" stroke="black" stroke-width="0.7"/>
    ${foldBanners}
    ${notchMarks}
    ${label}
  </g>`

  if (!standalone) return inner

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${vw} ${vh}"
    width="${vw}mm" height="${vh}mm">
  ${inner}
</svg>`
}

function buildFoldBanners(edges: FoldEdge[]): string {
  return edges.map(e => {
    const dx = e.x2 - e.x1
    const dy = e.y2 - e.y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return ''
    const cx = (e.x1 + e.x2) / 2
    const cy = (e.y1 + e.y2) / 2
    const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI
    return `<g transform="translate(${cx} ${cy}) rotate(${angleDeg})">
        <rect x="${-len / 2}" y="${-BANNER_W / 2}" width="${len}" height="${BANNER_W}"
          fill="white" stroke="black" stroke-width="0.8"/>
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle"
          font-size="5" font-weight="bold" letter-spacing="0.8" ${PIECE_FONT}>PLACE ON FOLD</text>
      </g>`
  }).join('\n')
}

export function buildAllPiecesSvg(pieces: PatternPiece[]): string {
  let currentY = 0
  const groups: string[] = []
  let totalW = 0
  const GAP = 20

  for (const piece of pieces) {
    const h = piece.boundingBox.height + PADDING * 2
    const w = piece.boundingBox.width + PADDING * 2
    const innerContent = buildPieceSvg(piece, { standalone: false })
    groups.push(`<g transform="translate(0 ${currentY})">${innerContent}</g>`)
    currentY += h + GAP
    if (w > totalW) totalW = w
  }

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${totalW} ${currentY}"
    width="${totalW}mm" height="${currentY}mm">
  ${groups.join('\n')}
</svg>`
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run src/lib/patternSvg.test.ts
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Zach/dev/cadhatter
git add src/lib/patternSvg.ts src/lib/patternSvg.test.ts
git commit -m "feat: buildPieceSvg standalone mode, GA001 labels, remove calibration from piece SVG"
```

---

## Task 2: printTile.ts — fixed calibration square, total page count, no nested SVGs

**Context:** `tilePieces` currently passes the full `buildPieceSvg` output (a complete `<svg>` element) to `wrapInPage`, which nests it inside another `<svg>`. This breaks coordinate systems in browsers. Fix: use `buildPieceSvg({standalone: false})` to get inner content only. Also: move calibration square to page frame (25.4mm), add `N of M` page numbering via `__TOTAL__` placeholder.

**Files:**
- Modify: `src/lib/printTile.ts`
- Modify: `src/lib/printTile.test.ts`

- [ ] **Step 1: Update the test file first (TDD)**

Replace `src/lib/printTile.test.ts` entirely:

```typescript
import { describe, it, expect } from 'vitest'
import { tilePieces, PAPER_SIZES } from './printTile'
import { DEFAULT_PARAMS } from '../types'
import { computeHat } from './hatMath'

describe('tilePieces', () => {
  it('returns at least one page', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    expect(pages.length).toBeGreaterThan(0)
  })

  it('each page is a complete SVG string (no nested <svg>)', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    for (const page of pages) {
      expect(page).toMatch(/^<svg /)
      expect(page).toContain('</svg>')
      // Strip outer opening tag and check no further <svg elements
      const inner = page.replace(/^<svg[^>]*>/, '')
      expect(inner).not.toContain('<svg')
    }
  })

  it('page 1 contains 25.4mm calibration square', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    expect(pages[0]).toContain('25mm / 1 inch')
    expect(pages[0]).toContain(`width="${25.4}"`)
  })

  it('pages after the first do NOT contain calibration square', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    if (pages.length > 1) {
      for (let i = 1; i < pages.length; i++) {
        expect(pages[i]).not.toContain('25mm / 1 inch')
      }
    }
  })

  it('page numbers use N of M format with correct total', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    const total = pages.length
    expect(pages[0]).toContain(`Page 1 of ${total}`)
    if (total > 1) {
      expect(pages[total - 1]).toContain(`Page ${total} of ${total}`)
    }
  })

  it('no page contains the __TOTAL__ placeholder (all replaced)', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    for (const page of pages) {
      expect(page).not.toContain('__TOTAL__')
    }
  })
})
```

- [ ] **Step 2: Run tests — expect failures**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run src/lib/printTile.test.ts
```

Expected: multiple failures (old calibration text, no N of M format, nested SVG).

- [ ] **Step 3: Replace `src/lib/printTile.ts`**

```typescript
import type { PatternPiece } from '../types'
import { buildPieceSvg } from './patternSvg'

export const PAPER_SIZES = {
  letter: { width: 215.9, height: 279.4 },
  a4:     { width: 210,   height: 297   },
} as const

const MARGIN = 10   // mm on each edge
const OVERLAP = 10  // mm tile overlap

export function tilePieces(
  pieces: PatternPiece[],
  paperSize: 'letter' | 'a4',
): string[] {
  const paper = PAPER_SIZES[paperSize]
  const printW = paper.width - MARGIN * 2
  const printH = paper.height - MARGIN * 2
  const pages: string[] = []

  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]
    const pw = piece.boundingBox.width + 40 // +padding from patternSvg
    const ph = piece.boundingBox.height + 40

    // If fits on one page, emit single page
    if (pw <= printW && ph <= printH) {
      const innerContent = buildPieceSvg(piece, { standalone: false })
      pages.push(wrapInPage(innerContent, paper, pages.length + 1, MARGIN, pages.length === 0))
      continue
    }

    // Tile across pages
    const tileW = printW - OVERLAP
    const tileH = printH - OVERLAP
    const cols = Math.ceil(pw / tileW)
    const rows = Math.ceil(ph / tileH)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = col * tileW
        const offsetY = row * tileH
        const pageNum = pages.length + 1
        const isFirst = pages.length === 0

        const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg"
          width="${paper.width}mm" height="${paper.height}mm"
          viewBox="0 0 ${paper.width} ${paper.height}">
          <g transform="translate(${MARGIN - offsetX} ${MARGIN - offsetY})">
            <path d="${piece.cutPath}" fill="none" stroke="black" stroke-width="0.5"/>
            <path d="${piece.sewingPath}" fill="none" stroke="black" stroke-width="0.5" stroke-dasharray="3 3"/>
          </g>
          ${overlapMarks(paper, MARGIN, OVERLAP, col, row, cols, rows)}
          ${isFirst ? calibrationSquare(paper) : ''}
          <text x="${paper.width - MARGIN}" y="${paper.height - MARGIN + 5}"
            text-anchor="end" font-size="3" font-family="Arial,sans-serif">
            Page ${pageNum} of __TOTAL__ — ${piece.label} (${col + 1}/${cols}, ${row + 1}/${rows})
          </text>
        </svg>`
        pages.push(tileSvg)
      }
    }
  }

  // Replace __TOTAL__ placeholder now that final page count is known
  const total = String(pages.length)
  return pages.map(p => p.replace(/__TOTAL__/g, total))
}

function wrapInPage(
  innerContent: string,
  paper: { width: number; height: number },
  pageNum: number,
  margin: number,
  isFirst: boolean,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg"
    width="${paper.width}mm" height="${paper.height}mm"
    viewBox="0 0 ${paper.width} ${paper.height}">
    <g transform="translate(${margin} ${margin})">${innerContent}</g>
    ${isFirst ? calibrationSquare(paper) : ''}
    <text x="${paper.width - margin}" y="${paper.height - 3}"
      text-anchor="end" font-size="3" font-family="Arial,sans-serif">Page ${pageNum} of __TOTAL__</text>
  </svg>`
}

function calibrationSquare(paper: { width: number; height: number }): string {
  const sq = 25.4  // 1 inch
  const x = 5
  const y = paper.height - sq - 8
  return `
    <rect x="${x}" y="${y}" width="${sq}" height="${sq}" fill="white" fill-opacity="0.8" stroke="black" stroke-width="0.5"/>
    <text x="${x + sq / 2}" y="${y + sq + 4}" text-anchor="middle" font-size="3" font-family="Arial,sans-serif">25mm / 1 inch</text>`
}

function overlapMarks(
  paper: { width: number; height: number },
  margin: number,
  overlap: number,
  col: number,
  row: number,
  cols: number,
  rows: number,
): string {
  const marks: string[] = []
  if (col < cols - 1) {
    const x = paper.width - margin - overlap
    marks.push(`<line x1="${x}" y1="${margin}" x2="${x}" y2="${paper.height - margin}"
      stroke="black" stroke-width="0.3" stroke-dasharray="2 2"/>
    <text x="${x + 1}" y="${paper.height / 2}" font-size="3" font-family="Arial,sans-serif">→ pg ${col + 2}</text>`)
  }
  if (row < rows - 1) {
    const y = paper.height - margin - overlap
    marks.push(`<line x1="${margin}" y1="${y}" x2="${paper.width - margin}" y2="${y}"
      stroke="black" stroke-width="0.3" stroke-dasharray="2 2"/>
    <text x="${paper.width / 2}" y="${y - 1}" text-anchor="middle" font-size="3" font-family="Arial,sans-serif">↓ pg ${row + 2}</text>`)
  }
  return marks.join('\n')
}
```

- [ ] **Step 4: Run all lib tests**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run src/lib/
```

Expected: all tests PASS (patternSvg + printTile + hatMath).

- [ ] **Step 5: Commit**

```bash
cd C:/Users/Zach/dev/cadhatter
git add src/lib/printTile.ts src/lib/printTile.test.ts
git commit -m "feat: fix calibration square (25.4mm), N-of-M page numbers, no nested SVGs in print tiles"
```

---

## Task 3: PatternView.tsx — gallery view + modal

**Context:** Currently renders individual `buildPieceSvg` cards. Replace with a grid of `tilePieces()` output rendered as scaled thumbnails. Clicking a thumbnail opens it full-size in a modal.

**Thumbnail sizing:** Letter page = 215.9mm wide. At 96 DPI, 1mm = 3.7795px. Target thumbnail width = 280px. Scale = 280 / (215.9 × 3.7795) ≈ 0.342. Wrapper div height = paper.height × 3.7795 × scale.

**Files:**
- Modify: `src/components/PatternView.tsx`

Note: No new test file needed — PatternView is mocked in App.test.tsx. The component's behavior is validated visually and through integration. The `tilePieces` and `buildAllPiecesSvg` functions are already tested.

- [ ] **Step 1: Replace `src/components/PatternView.tsx`**

```tsx
import { useState } from 'react'
import type { PatternPiece, HatParams } from '../types'
import { buildAllPiecesSvg } from '../lib/patternSvg'
import { tilePieces, PAPER_SIZES } from '../lib/printTile'

const THUMB_W = 280
const MM_TO_PX = 3.7795

interface Props {
  pieces: PatternPiece[]
  params: HatParams
  onParamsChange: (params: HatParams) => void
}

export function PatternView({ pieces, params, onParamsChange }: Props) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null)

  const paper = PAPER_SIZES[params.paperSize]
  const scale = THUMB_W / (paper.width * MM_TO_PX)
  const thumbH = Math.round(paper.height * MM_TO_PX * scale)

  const pages = tilePieces(pieces, params.paperSize)

  const handleDownload = () => {
    const svg = buildAllPiecesSvg(pieces)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cadhatter-pattern.svg'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const html = `<!DOCTYPE html><html><head>
      <style>
        @page { size: ${params.paperSize === 'letter' ? '8.5in 11in' : 'A4'}; margin: 0; }
        body { margin: 0; }
        .page { page-break-after: always; width: 100%; }
        .page:last-child { page-break-after: auto; }
      </style>
    </head><body>
      ${pages.map(p => `<div class="page">${p}</div>`).join('')}
    </body></html>`

    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Gallery grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-6 justify-items-center">
          {pages.map((page, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setSelectedPage(i)}
                className="bg-white rounded shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                style={{ width: THUMB_W, height: thumbH }}
                aria-label={`View page ${i + 1}`}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    width: Math.round(paper.width * MM_TO_PX),
                    height: Math.round(paper.height * MM_TO_PX),
                    pointerEvents: 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: page }}
                />
              </button>
              <span className="text-xs text-gray-500">Page {i + 1} of {pages.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Full-size modal */}
      {selectedPage !== null && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setSelectedPage(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-[92vw] max-h-[92vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 sticky top-0 bg-white">
              <span className="text-sm font-medium text-gray-700">
                Page {selectedPage + 1} of {pages.length}
              </span>
              <button
                onClick={() => setSelectedPage(null)}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4" dangerouslySetInnerHTML={{ __html: pages[selectedPage] }} />
          </div>
        </div>
      )}

      {/* Footer: download + print + paper size */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
        <button
          onClick={handleDownload}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-700"
        >
          ⬇ Download SVG
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50"
        >
          🖨 Print
        </button>
        <div className="flex items-center gap-1.5 ml-auto text-sm text-gray-600">
          <span>Paper:</span>
          <select
            value={params.paperSize}
            onChange={e => onParamsChange({ ...params, paperSize: e.target.value as HatParams['paperSize'] })}
            className="border border-gray-300 rounded px-1.5 py-0.5 text-sm"
          >
            <option value="letter">Letter</option>
            <option value="a4">A4</option>
          </select>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run full test suite to verify nothing broke**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 3: Commit**

```bash
cd C:/Users/Zach/dev/cadhatter
git add src/components/PatternView.tsx
git commit -m "feat: replace pattern piece cards with gallery view of print pages"
```

---

## Task 4: Hat color swatches

**Context:** Add a row of 6 preset color swatches + custom color picker below the 3D canvas. The selected color is passed to `HatScene` → `PlainHat`. When fabric texture is loaded, swatches are visually disabled (fabric overrides color).

**Files:**
- Modify: `src/pages/App.tsx`
- Modify: `src/components/HatScene.tsx`
- Modify: `src/pages/App.test.tsx`

- [ ] **Step 1: Add hatColor tests to `src/pages/App.test.tsx`**

Add these tests after the existing 3 tests:

```tsx
const SWATCHES = [
  { name: 'Natural', hex: '#f0ece4' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'Olive', hex: '#6b7c45' },
  { name: 'Burgundy', hex: '#6e1c2e' },
  { name: 'Sand', hex: '#c8a96e' },
]

test('renders color swatches in 3D tab', () => {
  render(<AppPage />)
  for (const swatch of SWATCHES) {
    expect(screen.getByTitle(swatch.name)).toBeInTheDocument()
  }
})

test('swatches are disabled when fabric is loaded', () => {
  render(<AppPage />)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([''], 'fabric.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })

  const swatchBar = screen.getByTestId('swatch-bar')
  expect(swatchBar).toHaveStyle('pointer-events: none')
  expect(swatchBar).toHaveStyle('opacity: 0.4')
})
```

- [ ] **Step 2: Run the new tests — expect failures**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run src/pages/App.test.tsx
```

Expected: 2 new tests FAIL (swatches not rendered yet).

- [ ] **Step 3: Update `src/components/HatScene.tsx` to accept `hatColor`**

a) Update the `Props` interface:
```typescript
interface Props {
  params: HatParams
  fabricUrl?: string
  hatColor?: string
}
```

b) Update `HatScene` signature:
```typescript
export function HatScene({ params, fabricUrl, hatColor }: Props) {
```

c) Update `PlainHat` to accept and use `hatColor`:
```typescript
function PlainHat({ sideRadiusTop, sideRadiusBottom, sideHeight, brimInner, brimWidth, rBottom, brimDrop, MM, hatColor }: HatMeshProps & { hatColor: string }) {
```

And update all three `meshStandardMaterial` calls in `PlainHat` to use `color={hatColor}` instead of `color="#f0ece4"`.

d) Update the `HatScene` render to pass `hatColor`:
```tsx
{fabricUrl
  ? <FabricHat fabricUrl={fabricUrl} {...hatMeshProps} />
  : <PlainHat hatColor={hatColor ?? '#f0ece4'} {...hatMeshProps} />
}
```

- [ ] **Step 4: Update `src/pages/App.tsx` to add `hatColor` state + swatch bar**

a) Add `hatColor` state after the existing state declarations:
```tsx
const [hatColor, setHatColor] = useState('#f0ece4')
```

b) Define swatches array above the component (module level):
```tsx
const SWATCHES = [
  { name: 'Natural', hex: '#f0ece4' },
  { name: 'Navy',    hex: '#1e3a5f' },
  { name: 'Black',   hex: '#1a1a1a' },
  { name: 'Olive',   hex: '#6b7c45' },
  { name: 'Burgundy', hex: '#6e1c2e' },
  { name: 'Sand',    hex: '#c8a96e' },
] as const
```

c) Update `HatScene` usage to pass `hatColor`:
```tsx
<HatScene params={params} fabricUrl={fabricUrl ?? undefined} hatColor={hatColor} />
```

d) Add swatch bar inside the `div className="relative h-full"` wrapper, below the Upload/Remove button overlay. Insert this JSX after the existing `<div className="absolute top-2 right-2">...</div>`:

```tsx
{/* Color swatch bar */}
<div
  data-testid="swatch-bar"
  className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-sm"
  style={fabricUrl ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
>
  {SWATCHES.map(s => (
    <button
      key={s.hex}
      title={s.name}
      onClick={() => setHatColor(s.hex)}
      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
      style={{
        backgroundColor: s.hex,
        borderColor: hatColor === s.hex ? '#374151' : 'transparent',
        outline: hatColor === s.hex ? '2px solid white' : 'none',
        outlineOffset: '-3px',
      }}
    />
  ))}
  <input
    type="color"
    value={hatColor}
    onChange={e => setHatColor(e.target.value)}
    title="Custom color"
    className="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform"
    style={{ padding: 0 }}
  />
</div>
```

- [ ] **Step 5: Run all tests**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/Zach/dev/cadhatter
git add src/pages/App.tsx src/components/HatScene.tsx src/pages/App.test.tsx
git commit -m "feat: add hat color swatches to 3D view"
```

---

## Task 5: Stand-in head

**Context:** Add an optional head + neck geometry to the 3D scene. A toggle button in the 3D tab shows/hides the head. The head is a scaled sphere (ellipsoid) sized to `headCircumference`, positioned so its top meets the bottom of the hat crown. The neck is a cylinder below it.

**Head sizing math:**
- `r = headCircumference / (2 * Math.PI) * MM` — uniform sphere radius before scaling
- `headRadiusY = r * 1.25` — effective y-radius after `scale={[1, 1.25, 1]}`
- Hat bottom is at `y = -sideHeight / 2`
- Head center y = `-sideHeight / 2 - headRadiusY`
- Neck center y = `head center y - headRadiusY - 30 * MM` (30mm = half of 60mm neck height)

**Files:**
- Modify: `src/pages/App.tsx`
- Modify: `src/components/HatScene.tsx`
- Modify: `src/pages/App.test.tsx`

- [ ] **Step 1: Add showHead test to `src/pages/App.test.tsx`**

Add this test after the existing tests:

```tsx
test('toggle head button shows and hides stand-in head', () => {
  render(<AppPage />)
  // Button should be present in 3D tab
  const toggleBtn = screen.getByRole('button', { name: /show head/i })
  expect(toggleBtn).toBeInTheDocument()

  // After clicking, it should say "Hide head"
  fireEvent.click(toggleBtn)
  expect(screen.getByRole('button', { name: /hide head/i })).toBeInTheDocument()

  // HatScene mock will receive showHead=true (can't test 3D internals in jsdom)
})
```

- [ ] **Step 2: Run new test — expect failure**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run src/pages/App.test.tsx
```

Expected: new test FAILS (no toggle button yet).

- [ ] **Step 3: Add `StandinHead` component to `src/components/HatScene.tsx`**

a) Add `showHead?: boolean` to `Props` interface:
```typescript
interface Props {
  params: HatParams
  fabricUrl?: string
  hatColor?: string
  showHead?: boolean
}
```

b) Update `HatScene` signature:
```typescript
export function HatScene({ params, fabricUrl, hatColor, showHead }: Props) {
```

c) Add `StandinHead` component above `HatScene` (outside the component, using hooks is fine since it's its own component):
```typescript
interface StandinHeadProps {
  headCircumference: number  // mm
  hatBottomY: number         // Three.js units — y position of hat bottom
  MM: number
}

function StandinHead({ headCircumference, hatBottomY, MM }: StandinHeadProps) {
  const r = (headCircumference / (2 * Math.PI)) * MM
  const headRadiusY = r * 1.25
  const headCenterY = hatBottomY - headRadiusY
  const neckCenterY = headCenterY - headRadiusY - 30 * MM
  const neckRadius = r * 0.55
  const neckHeight = 60 * MM

  return (
    <>
      <mesh position={[0, headCenterY, 0]} scale={[1, 1.25, 1]} castShadow>
        <sphereGeometry args={[r, 32, 32]} />
        <meshStandardMaterial color="#c8956c" />
      </mesh>
      <mesh position={[0, neckCenterY, 0]} castShadow>
        <cylinderGeometry args={[neckRadius, neckRadius, neckHeight, 32]} />
        <meshStandardMaterial color="#c8956c" />
      </mesh>
    </>
  )
}
```

d) In `HatScene`, compute `hatBottomY` and render `StandinHead` conditionally. Add after the `hatMeshProps` definition:
```typescript
const hatBottomY = -sideHeight / 2
```

Add after the existing hat mesh / stitch torus JSX, before `<OrbitControls`:
```tsx
{showHead && (
  <StandinHead
    headCircumference={params.headCircumference}
    hatBottomY={hatBottomY}
    MM={MM}
  />
)}
```

- [ ] **Step 4: Add `showHead` state + toggle button to `src/pages/App.tsx`**

a) Add state after `hatColor`:
```tsx
const [showHead, setShowHead] = useState(false)
```

b) Update `HatScene` usage:
```tsx
<HatScene params={params} fabricUrl={fabricUrl ?? undefined} hatColor={hatColor} showHead={showHead} />
```

c) Add toggle button inside `<div className="absolute top-2 right-2">` — add it to the existing overlay div. Change the overlay from a single button to a flex column:

Replace the current:
```tsx
<div className="absolute top-2 right-2">
  {fabricUrl ? (
    <button ...>✕ Remove fabric</button>
  ) : (
    <button ...>Upload fabric</button>
  )}
</div>
```

With:
```tsx
<div className="absolute top-2 right-2 flex flex-col items-end gap-2">
  {fabricUrl ? (
    <button
      onClick={handleRemoveFabric}
      className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
    >
      ✕ Remove fabric
    </button>
  ) : (
    <button
      onClick={() => fileInputRef.current?.click()}
      className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
    >
      Upload fabric
    </button>
  )}
  <button
    onClick={() => setShowHead(h => !h)}
    className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
  >
    {showHead ? 'Hide head' : 'Show head'}
  </button>
</div>
```

- [ ] **Step 5: Run all tests**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
cd C:/Users/Zach/dev/cadhatter
git add src/pages/App.tsx src/components/HatScene.tsx src/pages/App.test.tsx
git commit -m "feat: add optional stand-in head to 3D view"
```

---

## Final verification

- [ ] **Run full test suite**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test -- --run
```

Expected: all tests PASS.

- [ ] **Start dev server and verify visually**

```bash
cd C:/Users/Zach/dev/cadhatter && npm run dev
```

Check:
- Pattern tab: gallery grid of pages, click opens modal, paper size toggle regenerates grid
- Pattern pages: `Page 1 of 3` format, calibration square in bottom-left corner of page 1 only
- Download SVG: single file with all pieces stacked, no nested `<svg>` elements
- 3D tab: color swatches visible at bottom, clicking changes hat color, swatches gray out when fabric is loaded
- 3D tab: "Show head" button toggles a skin-toned head below the hat
