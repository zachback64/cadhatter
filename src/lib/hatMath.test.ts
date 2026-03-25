import { describe, it, expect } from 'vitest'
import { computeCrown, computeSidePanel, computeBrim } from './hatMath'

const MM = 1
const DEG = Math.PI / 180

describe('computeCrown', () => {
  it('returns correct radius for default params', () => {
    // headCircumference=570mm, taperAngle=10°, hatHeight=100mm
    // r_bottom = 570 / (2π) ≈ 90.74
    // r_crown = 90.74 - tan(10°) * 100 ≈ 90.74 - 17.63 = 73.11
    const result = computeCrown({ headCircumference: 570, taperAngle: 10, hatHeight: 100 })
    expect(result.rCrown).toBeCloseTo(73.11, 1)
    expect(result.rBottom).toBeCloseTo(90.74, 1)
  })

  it('clamps r_crown to minimum 5mm', () => {
    const result = computeCrown({ headCircumference: 400, taperAngle: 30, hatHeight: 200 })
    expect(result.rCrown).toBeGreaterThanOrEqual(5)
  })
})

describe('computeSidePanel', () => {
  it('returns rectangle for cylinder (taper=0)', () => {
    const result = computeSidePanel({ rBottom: 90.74, rTop: 90.74, hatHeight: 100 })
    expect(result.type).toBe('cylinder')
    expect(result.width).toBeCloseTo(2 * Math.PI * 90.74, 1)
    expect(result.height).toBe(100)
  })

  it('returns frustum sector for tapered hat', () => {
    // r_bottom=90.74, r_top=73.11, hatHeight=100
    // diff = 90.74 - 73.11 = 17.63
    // s = sqrt(100² + 17.63²) ≈ 101.54
    // R2 = 90.74 * 101.54 / 17.63 ≈ 522.6
    // R1 = R2 - s ≈ 421.1
    // θ = 2π * 90.74 / 522.6 ≈ 1.091 rad
    const result = computeSidePanel({ rBottom: 90.74, rTop: 73.11, hatHeight: 100 })
    expect(result.type).toBe('frustum')
    if (result.type === 'frustum') {
      expect(result.R2).toBeCloseTo(522.6, 0)
      expect(result.R1).toBeCloseTo(421.1, 0)
      expect(result.theta).toBeCloseTo(1.091, 2)
    }
  })
})

describe('computeBrim', () => {
  it('computes brim annular sector', () => {
    // r_bottom=90.74, brimWidth=60, brimAngle=8°
    // si = 90.74 / cos(8°) ≈ 91.63
    // so = (90.74+60) / cos(8°) ≈ 152.22
    // θ_brim = 2π * 90.74 / 91.63 ≈ 6.22 rad (full circle)
    // half: 3.11 rad
    const result = computeBrim({ rBottom: 90.74, brimWidth: 60, brimAngle: 8 })
    expect(result.si).toBeCloseTo(91.63, 1)
    expect(result.so).toBeCloseTo(152.22, 1)
    expect(result.thetaHalf).toBeCloseTo(3.11, 1)
  })
})
