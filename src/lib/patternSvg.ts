import type { PatternPiece, FoldEdge } from '../types'

export const PIECE_FONT = 'font-family="Arial, sans-serif"'
const PADDING = 25   // mm of space around piece
const BANNER_W = 10  // mm height/width of PLACE ON FOLD banner

interface SvgOptions {
  calibrationSquare?: boolean
}

export function buildPieceSvg(piece: PatternPiece, opts: SvgOptions): string {
  const { width, height, minX, minY } = piece.boundingBox
  const vw = width + PADDING * 2
  const vh = height + PADDING * 2
  // Shift piece so its minimum coordinates sit at PADDING in SVG space
  const tx = PADDING - minX
  const ty = PADDING - minY

  const calibration = opts.calibrationSquare
    ? buildCalibrationSquare(vw, vh)
    : ''

  const notchMarks = piece.notches.map(n => {
    const len = 3, hw = 0.5
    return `<rect class="notch" x="${n.x - hw}" y="${n.y - len / 2}" width="${hw * 2}" height="${len}"
      transform="rotate(${(n.angle * 180) / Math.PI} ${n.x} ${n.y})"
      fill="black" stroke="none"/>`
  }).join('\n')

  const foldBanners = buildFoldBanners(piece.foldEdges)

  // Label centered in bounding box (piece coordinates)
  const labelX = minX + width / 2
  const labelY = minY + height / 2
  const label = `
    <text x="${labelX}" y="${labelY - 9}" text-anchor="middle" font-size="13" font-weight="bold" ${PIECE_FONT}>${piece.label}</text>
    <text x="${labelX}" y="${labelY + 6}" text-anchor="middle" font-size="7" ${PIECE_FONT}>CUT ${piece.cutCount}</text>
    <text x="${labelX}" y="${labelY + 16}" text-anchor="middle" font-size="4.5" fill="#999" ${PIECE_FONT}>Cadhatter · ${new Date().toLocaleDateString()}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${vw} ${vh}"
    width="${vw}mm" height="${vh}mm">
  <g transform="translate(${tx} ${ty})">
    <path d="${piece.sewingPath}" fill="none" stroke="#555" stroke-width="0.5" stroke-dasharray="3 2"/>
    <path d="${piece.cutPath}" fill="none" stroke="black" stroke-width="0.7"/>
    ${foldBanners}
    ${notchMarks}
    ${label}
  </g>
  ${calibration}
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

function buildCalibrationSquare(_svgW: number, svgH: number): string {
  const sq = 25.4  // 25.4mm = exactly 1 inch
  const x = 6
  const y = svgH - sq - 16
  return `
    <text x="${x + sq / 2}" y="${y - 4}" text-anchor="middle" font-size="4" font-weight="bold" ${PIECE_FONT}>TEST SQUARE</text>
    <rect x="${x}" y="${y}" width="${sq}" height="${sq}" fill="none" stroke="black" stroke-width="0.5"/>
    <text x="${x + sq / 2}" y="${y + sq + 5}" text-anchor="middle" font-size="3.5" ${PIECE_FONT}>25mm / 1 inch</text>`
}

export function buildAllPiecesSvg(pieces: PatternPiece[]): string {
  let currentY = 0
  const groups: string[] = []
  let totalW = 0
  const GAP = 20

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    const pieceSvg = buildPieceSvg(p, { calibrationSquare: i === 0 })
    const h = p.boundingBox.height + PADDING * 2
    const w = p.boundingBox.width + PADDING * 2
    groups.push(`<g transform="translate(0 ${currentY})">${pieceSvg}</g>`)
    currentY += h + GAP
    if (w > totalW) totalW = w
  }

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${totalW} ${currentY}"
    width="${totalW}mm" height="${currentY}mm">
  ${groups.join('\n')}
</svg>`
}
