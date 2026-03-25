import { PatternPiece } from '../types'

export const PIECE_FONT = 'font-family="Arial, sans-serif"'
const PADDING = 20 // mm extra around piece for labels

interface SvgOptions {
  calibrationSquare?: boolean
}

export function buildPieceSvg(piece: PatternPiece, opts: SvgOptions): string {
  const { width, height } = piece.boundingBox
  const vw = width + PADDING * 2
  const vh = height + PADDING * 2
  const tx = PADDING
  const ty = PADDING

  const calibration = opts.calibrationSquare
    ? `<rect x="5" y="${vh - 25}" width="10" height="10" fill="none" stroke="black" stroke-width="0.5"/>
       <text x="5" y="${vh - 12}" font-size="4" ${PIECE_FONT}>10mm / 0.39in</text>`
    : ''

  const notchMarks = piece.notches.map(n => {
    const len = 3, hw = 0.5
    return `<rect class="notch" x="${n.x - hw}" y="${n.y - len / 2}" width="${hw * 2}" height="${len}"
      transform="rotate(${(n.angle * 180) / Math.PI} ${n.x} ${n.y})"
      fill="black" stroke="none"/>`
  }).join('\n')

  const foldBanners = piece.onFold
    ? buildFoldBanners(piece.id, width, height)
    : ''

  const labelY = height / 2
  const label = `
    <text x="${width / 2}" y="${labelY - 8}" text-anchor="middle" font-size="7" font-weight="bold" ${PIECE_FONT}>${piece.label}</text>
    <text x="${width / 2}" y="${labelY + 2}" text-anchor="middle" font-size="5.5" ${PIECE_FONT}>CUT ${piece.cutCount}</text>
    <text x="${width / 2}" y="${labelY + 10}" text-anchor="middle" font-size="4" fill="#666" ${PIECE_FONT}>Cadhatter</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 ${vw} ${vh}"
    width="${vw}mm" height="${vh}mm">
  <g transform="translate(${tx} ${ty})">
    <path d="${piece.sewingPath}" fill="none" stroke="black" stroke-width="0.5" stroke-dasharray="3 3"/>
    <path d="${piece.cutPath}" fill="none" stroke="black" stroke-width="0.5"/>
    ${foldBanners}
    ${notchMarks}
    ${label}
  </g>
  ${calibration}
</svg>`
}

function buildFoldBanners(id: PatternPiece['id'], width: number, height: number): string {
  if (id === 'crown') {
    return `
      <rect x="-8" y="0" width="7" height="${height}" fill="#eee" stroke="black" stroke-width="0.3"/>
      <text x="-4.5" y="${height / 2}" text-anchor="middle" font-size="4" transform="rotate(-90 -4.5 ${height / 2})" ${PIECE_FONT}>PLACE ON FOLD</text>
      <rect x="0" y="-8" width="${width}" height="7" fill="#eee" stroke="black" stroke-width="0.3"/>
      <text x="${width / 2}" y="-2.5" text-anchor="middle" font-size="4" ${PIECE_FONT}>PLACE ON FOLD</text>`
  }
  return `
    <rect x="-8" y="0" width="7" height="${height}" fill="#eee" stroke="black" stroke-width="0.3"/>
    <text x="-4.5" y="${height / 2}" text-anchor="middle" font-size="4" transform="rotate(-90 -4.5 ${height / 2})" ${PIECE_FONT}>PLACE ON FOLD</text>`
}

export function buildAllPiecesSvg(pieces: PatternPiece[]): string {
  let currentY = 0
  const groups: string[] = []
  let totalW = 0
  const GAP = 20

  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]
    const pieceSvg = buildPieceSvg(p, { calibrationSquare: i === 0 })
    const h = p.boundingBox.height + (PADDING * 2)
    const w = p.boundingBox.width + (PADDING * 2)
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
