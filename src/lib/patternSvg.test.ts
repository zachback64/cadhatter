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
