import type { PatternPiece } from '../types'
import { buildPieceSvg, PADDING } from './patternSvg'

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
    const pw = piece.boundingBox.width + PADDING * 2
    const ph = piece.boundingBox.height + PADDING * 2

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

        const innerContent = buildPieceSvg(piece, { standalone: false })
        const clipId = `clip-${pageNum}`

        const tileSvg = `<svg xmlns="http://www.w3.org/2000/svg"
          width="${paper.width}mm" height="${paper.height}mm"
          viewBox="0 0 ${paper.width} ${paper.height}">
          <defs>
            <clipPath id="${clipId}">
              <rect x="${MARGIN}" y="${MARGIN}" width="${paper.width - MARGIN * 2}" height="${paper.height - MARGIN * 2}"/>
            </clipPath>
          </defs>
          <g clip-path="url(#${clipId})" transform="translate(${MARGIN - offsetX} ${MARGIN - offsetY})">
            ${innerContent}
          </g>
          ${overlapMarks(paper, MARGIN, OVERLAP, col, row, cols, rows, pageNum)}
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
  pageNum: number,
): string {
  const marks: string[] = []
  if (col < cols - 1) {
    const x = paper.width - margin - overlap
    marks.push(`<line x1="${x}" y1="${margin}" x2="${x}" y2="${paper.height - margin}"
      stroke="black" stroke-width="0.3" stroke-dasharray="2 2"/>
    <text x="${x + 1}" y="${paper.height / 2}" font-size="3" font-family="Arial,sans-serif">→ pg ${pageNum + 1}</text>`)
  }
  if (row < rows - 1) {
    const y = paper.height - margin - overlap
    marks.push(`<line x1="${margin}" y1="${y}" x2="${paper.width - margin}" y2="${y}"
      stroke="black" stroke-width="0.3" stroke-dasharray="2 2"/>
    <text x="${paper.width / 2}" y="${y - 1}" text-anchor="middle" font-size="3" font-family="Arial,sans-serif">↓ pg ${pageNum + cols}</text>`)
  }
  return marks.join('\n')
}
