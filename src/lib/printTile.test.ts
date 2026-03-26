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
