import type { HatParams, HatGeometry, PatternPiece } from '../types'

const DEG = Math.PI / 180
const TWO_PI = 2 * Math.PI
const CYLINDER_THRESHOLD = 0.1 // mm

// ── Crown ────────────────────────────────────────────────────────────────────

interface CrownResult {
  rBottom: number
  rCrown: number
}

export function computeCrown(p: {
  headCircumference: number
  taperAngle: number
  hatHeight: number
}): CrownResult {
  const rBottom = p.headCircumference / TWO_PI
  const rCrownRaw = rBottom - Math.tan(p.taperAngle * DEG) * p.hatHeight
  const rCrown = Math.max(5, rCrownRaw)
  return { rBottom, rCrown }
}

// ── Side Panel ────────────────────────────────────────────────────────────────

type SidePanelResult =
  | { type: 'cylinder'; width: number; height: number }
  | { type: 'frustum'; R1: number; R2: number; theta: number; slantHeight: number }

export function computeSidePanel(p: {
  rBottom: number
  rTop: number
  hatHeight: number
}): SidePanelResult {
  const diff = p.rBottom - p.rTop
  const s = Math.sqrt(p.hatHeight ** 2 + diff ** 2)

  if (Math.abs(diff) < CYLINDER_THRESHOLD) {
    return {
      type: 'cylinder',
      width: TWO_PI * p.rBottom,
      height: p.hatHeight,
    }
  }

  const R2 = (p.rBottom * s) / diff
  const R1 = R2 - s
  const theta = TWO_PI * p.rBottom / R2

  return { type: 'frustum', R1, R2, theta, slantHeight: s }
}

// ── Brim ──────────────────────────────────────────────────────────────────────

interface BrimResult {
  si: number      // slant inner radius
  so: number      // slant outer radius
  thetaFull: number
  thetaHalf: number
}

export function computeBrim(p: {
  rBottom: number
  brimWidth: number
  brimAngle: number
}): BrimResult {
  const phi = p.brimAngle * DEG
  const cosPhi = Math.cos(phi)
  const si = p.rBottom / cosPhi
  const so = (p.rBottom + p.brimWidth) / cosPhi
  const thetaFull = TWO_PI * p.rBottom / si
  return { si, so, thetaFull, thetaHalf: thetaFull / 2 }
}

// ── Seam allowance offset ─────────────────────────────────────────────────────
export function offsetArcRadius(r: number, d: number, isInnerHole: boolean): number {
  return isInnerHole ? r - d : r + d
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function computeHat(params: HatParams): HatGeometry {
  const { rBottom, rCrown } = computeCrown(params)
  const side = computeSidePanel({ rBottom, rTop: rCrown, hatHeight: params.hatHeight })
  const brim = computeBrim({ rBottom, brimWidth: params.brimWidth, brimAngle: params.brimAngle })
  const sa = params.seamAllowance

  const pieces: PatternPiece[] = [
    buildCrownPiece(rCrown, sa, params.showNotches),
    buildSidePiece(side, params.goreCount, sa, params.showNotches),
    buildBrimPiece(brim, sa, params.showNotches),
  ]

  return { patternPieces: pieces }
}

// ── Pattern piece builders ────────────────────────────────────────────────────

function buildCrownPiece(rCrown: number, sa: number, showNotches: boolean): PatternPiece {
  const r = rCrown
  const rCut = r + sa

  const sewingPath = `M ${r} 0 A ${r} ${r} 0 0 1 0 ${r} L 0 0 Z`
  const cutPath = `M ${rCut} 0 A ${rCut} ${rCut} 0 0 1 0 ${rCut} L 0 0 Z`

  const notches = showNotches
    ? [{ x: r * Math.cos(Math.PI / 4), y: r * Math.sin(Math.PI / 4), angle: Math.PI / 4 }]
    : []

  return {
    id: 'crown',
    label: 'TOP',
    cutCount: 1,
    onFold: true,
    sewingPath,
    cutPath,
    notches,
    boundingBox: { width: rCut, height: rCut },
  }
}

function buildSidePiece(
  side: SidePanelResult,
  goreCount: 1 | 4 | 6 | 8,
  sa: number,
  showNotches: boolean,
): PatternPiece {
  if (side.type === 'cylinder') {
    const w = side.width
    const h = side.height
    const pieces = goreCount === 1 ? 1 : goreCount
    const goreW = w / pieces

    const sewingPath = `M 0 0 H ${goreW} V ${h} H 0 Z`
    const cutPath = `M ${-sa} ${-sa} H ${goreW + sa} V ${h + sa} H ${-sa} Z`

    const notches = showNotches
      ? [
          { x: goreW / 2, y: 0, angle: -Math.PI / 2 },
          { x: goreW / 2, y: h, angle: Math.PI / 2 },
        ]
      : []

    return {
      id: 'side',
      label: 'SIDE PANEL',
      cutCount: goreCount === 1 ? 2 : goreCount,
      onFold: goreCount === 1,
      sewingPath,
      cutPath,
      notches,
      boundingBox: { width: goreW + sa * 2, height: h + sa * 2 },
    }
  }

  // Frustum: annular sector
  const { R1, R2, theta } = side
  const arcAngle = goreCount === 1 ? theta / 2 : theta / goreCount

  const x1out = R2, y1out = 0
  const x2out = R2 * Math.cos(arcAngle), y2out = R2 * Math.sin(arcAngle)
  const x1in = R1 * Math.cos(arcAngle), y1in = R1 * Math.sin(arcAngle)
  const x2in = R1, y2in = 0
  const largeArc = arcAngle > Math.PI ? 1 : 0

  const sewingPath = [
    `M ${x1out} ${y1out}`,
    `A ${R2} ${R2} 0 ${largeArc} 1 ${x2out} ${y2out}`,
    `L ${x1in} ${y1in}`,
    `A ${R1} ${R1} 0 ${largeArc} 0 ${x2in} ${y2in}`,
    'Z',
  ].join(' ')

  const R1c = R1 - sa, R2c = R2 + sa
  const cx1out = R2c, cy1out = 0
  const cx2out = R2c * Math.cos(arcAngle), cy2out = R2c * Math.sin(arcAngle)
  const cx1in = R1c * Math.cos(arcAngle), cy1in = R1c * Math.sin(arcAngle)
  const cx2in = R1c, cy2in = 0

  const cutPath = [
    `M ${cx1out} ${cy1out}`,
    `A ${R2c} ${R2c} 0 ${largeArc} 1 ${cx2out} ${cy2out}`,
    `L ${cx1in} ${cy1in}`,
    `A ${R1c} ${R1c} 0 ${largeArc} 0 ${cx2in} ${cy2in}`,
    'Z',
  ].join(' ')

  const midAngle = arcAngle / 2
  const notches = showNotches
    ? [
        { x: R2 * Math.cos(midAngle), y: R2 * Math.sin(midAngle), angle: midAngle },
        { x: R1 * Math.cos(midAngle), y: R1 * Math.sin(midAngle), angle: midAngle + Math.PI },
      ]
    : []

  return {
    id: 'side',
    label: 'SIDE PANEL',
    cutCount: goreCount === 1 ? 2 : goreCount,
    onFold: goreCount === 1,
    sewingPath,
    cutPath,
    notches,
    boundingBox: { width: R2c * 2, height: R2c * 2 },
  }
}

function buildBrimPiece(brim: BrimResult, sa: number, showNotches: boolean): PatternPiece {
  const { si, so, thetaHalf } = brim
  const largeArc = thetaHalf > Math.PI ? 1 : 0

  const x1out = so, y1out = 0
  const x2out = so * Math.cos(thetaHalf), y2out = so * Math.sin(thetaHalf)
  const x1in = si * Math.cos(thetaHalf), y1in = si * Math.sin(thetaHalf)
  const x2in = si, y2in = 0

  const sewingPath = [
    `M ${x1out} ${y1out}`,
    `A ${so} ${so} 0 ${largeArc} 1 ${x2out} ${y2out}`,
    `L ${x1in} ${y1in}`,
    `A ${si} ${si} 0 ${largeArc} 0 ${x2in} ${y2in}`,
    'Z',
  ].join(' ')

  const sic = si - sa, soc = so + sa
  const cx1out = soc, cy1out = 0
  const cx2out = soc * Math.cos(thetaHalf), cy2out = soc * Math.sin(thetaHalf)
  const cx1in = sic * Math.cos(thetaHalf), cy1in = sic * Math.sin(thetaHalf)
  const cx2in = sic, cy2in = 0

  const cutPath = [
    `M ${cx1out} ${cy1out}`,
    `A ${soc} ${soc} 0 ${largeArc} 1 ${cx2out} ${cy2out}`,
    `L ${cx1in} ${cy1in}`,
    `A ${sic} ${sic} 0 ${largeArc} 0 ${cx2in} ${cy2in}`,
    'Z',
  ].join(' ')

  const midAngle = thetaHalf / 2
  const notches = showNotches
    ? [
        { x: so * Math.cos(midAngle), y: so * Math.sin(midAngle), angle: midAngle },
        { x: si * Math.cos(midAngle), y: si * Math.sin(midAngle), angle: midAngle + Math.PI },
      ]
    : []

  return {
    id: 'brim',
    label: 'BRIM',
    cutCount: 2,
    onFold: true,
    sewingPath,
    cutPath,
    notches,
    boundingBox: { width: soc * 2, height: soc * 2 },
  }
}
