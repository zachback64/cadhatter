import type { PatternPiece, FoldEdge } from '../types'

export const PIECE_FONT = 'font-family="Arial, sans-serif"'
const PADDING = 25   // mm of space around piece
const BANNER_W = 10  // mm height/width of PLACE ON FOLD banner

export interface SvgOptions {
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
    const len = 3
    const hw = 0.5
    return `<rect class="notch" x="${n.x - hw}" y="${n.y - len / 2}" width="${hw * 2}" height="${len}"
      transform="rotate(${(n.angle * 180) / Math.PI} ${n.x} ${n.y})"
      fill="black" stroke="none"/>`
  }).join('\n')

  const foldBanners = buildFoldBanners(piece.foldEdges)

  // cutCount===2 only occurs on the brim; goreCount∈{1,4,6,8} so side panels never hit this
  const cutInstruction = piece.cutCount === 2
    ? 'CUT 2 - PRIMARY FABRIC / CUT 2 - SECONDARY FABRIC'
    : `CUT ${piece.cutCount}`

  const labelX = vw / 2
  const labelY = vh / 2
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
