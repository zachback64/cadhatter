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

  it('each page is an SVG string', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    pages.forEach(p => {
      expect(p).toContain('<svg')
      expect(p).toContain('</svg>')
    })
  })

  it('page 1 contains calibration square', () => {
    const geo = computeHat(DEFAULT_PARAMS)
    const pages = tilePieces(geo.patternPieces, 'letter')
    expect(pages[0]).toContain('TEST SQUARE')
  })
})
