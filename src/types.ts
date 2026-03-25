export interface HatParams {
  headCircumference: number; // mm
  hatHeight: number;         // mm
  taperAngle: number;        // degrees (0 = cylinder)
  brimWidth: number;         // mm
  brimAngle: number;         // degrees (0 = flat brim)
  goreCount: 1 | 4 | 6 | 8;
  seamAllowance: number;     // mm
  showNotches: boolean;
  units: 'cm' | 'in';
  paperSize: 'letter' | 'a4';
}

export const DEFAULT_PARAMS: HatParams = {
  headCircumference: 570, // 57 cm
  hatHeight: 100,         // 10 cm
  taperAngle: 10,
  brimWidth: 60,          // 6 cm
  brimAngle: 8,
  goreCount: 6,
  seamAllowance: 10,      // 1 cm
  showNotches: true,
  units: 'cm',
  paperSize: 'letter',
}

export interface Notch {
  x: number;
  y: number;
  angle: number; // radians, direction perpendicular to edge
}

export interface PatternPiece {
  id: 'crown' | 'side' | 'brim';
  label: string;       // e.g. "BRIM"
  cutCount: number;    // e.g. 2
  onFold: boolean;
  sewingPath: string;  // SVG path data (the actual shape to sew along)
  cutPath: string;     // SVG path data (sewingPath + seamAllowance offset)
  notches: Notch[];
  boundingBox: { width: number; height: number }; // mm, of cutPath
}

export interface HatGeometry {
  patternPieces: PatternPiece[];
}
