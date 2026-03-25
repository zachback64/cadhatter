import { describe, it, expect } from 'vitest'
import { buildPieceSvg, PIECE_FONT } from './patternSvg'
import { DEFAULT_PARAMS } from '../types'
import { computeHat } from './hatMath'

describe('buildPieceSvg', () => {
  it('produces valid SVG string with cut and sewing paths', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const piece = geo.patternPieces[0] // crown
    const svg = buildPieceSvg(piece, { calibrationSquare: true })
    expect(svg).toContain('<svg')
    expect(svg).toContain(piece.cutPath)
    expect(svg).toContain(piece.sewingPath)
    expect(svg).toContain('PLACE ON FOLD')
    expect(svg).toContain('TOP')
    expect(svg).toContain('CUT 1')
  })

  it('omits calibration square when not requested', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const svg = buildPieceSvg(geo.patternPieces[1], { calibrationSquare: false })
    expect(svg).not.toContain('TEST SQUARE')
  })

  it('includes notch marks when showNotches is true', () => {
    const geo = computeHat({ ...DEFAULT_PARAMS, showNotches: true })
    const svg = buildPieceSvg(geo.patternPieces[0], {})
    expect(svg).toContain('notch')
  })
})
