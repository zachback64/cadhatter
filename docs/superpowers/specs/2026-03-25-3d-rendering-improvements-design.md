# 3D Rendering Improvements — Design Spec
**Date:** 2026-03-25
**Status:** Approved

## Overview

Four improvements to `HatScene.tsx` (the Three.js 3D preview):

1. Fix brim geometry alignment
2. Add shadows
3. Add circumferential stitches around the brim outer edge
4. Allow uploading a fabric texture image that wraps the hat

---

## 1. Brim Alignment Fix

### Problem
The current brim uses `<ringGeometry>` (a flat disk with a hole) rotated by `-π/2 + brimAngle` around the X axis. This is incorrect because:
- The rotation tilts the flat ring as a plane, so the inner edge rises and falls unevenly — it does not stay flush with the cone bottom at all positions.
- `brimAngle` is the **cone half-angle from horizontal**, not a tilt angle.

### Correct geometry
The brim is a **conic annular surface** (frustum cap):
- Inner ring: horizontal radius `rBottom`, at y = `−sideHeight/2` (crown bottom junction)
- Outer ring: horizontal radius `rBottom + brimWidth`, drooping down by `brimWidth · tan(phi)`

where `phi = brimAngle` in radians.

`brimWidth` is the horizontal width of the brim. This matches `computeBrim` in `hatMath.ts`, which uses `si = rBottom / cos(phi)` (slant inner radius) and `so = (rBottom + brimWidth) / cos(phi)` (slant outer radius) to unfold the cone onto a flat annular sector pattern.

### Fix
Replace `<ringGeometry>` and its rotation with `<latheGeometry>` using a 2-point profile:

```
point 0: [rBottom * MM,              0]
point 1: [(rBottom + brimWidth) * MM, −brimWidth * tan(phi) * MM]
```

`LatheGeometry` revolves the profile around the Y axis — no rotation needed. The brim mesh keeps its position at `[0, −sideHeight/2, 0]`.

Remove `brimTilt` and `brimOuter` from `HatScene.tsx`. Derive:
```ts
const phi = (params.brimAngle * Math.PI) / 180
const brimDrop = params.brimWidth * Math.tan(phi) * MM
```
`brimDrop` is used to position the outer brim edge and the stitch torus. The brim mesh sits at `[0, −sideHeight/2, 0]`, so the outer brim edge is at world Y = `−sideHeight/2 − brimDrop`.

---

## 2. Shadows

Add Three.js shadow casting to give the hat a grounded look.

**Canvas:** Add `shadows` prop to `<Canvas>`.

**Lights:**
- Existing `<directionalLight>` gets `castShadow`, `shadow-mapSize={[1024, 1024]}`, and adjusted position `[2, 4, 2]` for a natural angle.
- Keep `<ambientLight>` as-is (ambient doesn't cast shadows).

**Meshes:** Add `castShadow receiveShadow` to the crown top, side, and brim meshes.

**Shadow catcher:** Add a transparent plane below the hat to receive the dropped shadow. Position it just below the outer brim edge (which is the lowest point of the hat):
```tsx
<mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -sideHeight / 2 - brimDrop - 0.01, 0]}>
  <planeGeometry args={[2, 2]} />
  <shadowMaterial opacity={0.25} />
</mesh>
```

---

## 3. Circumferential Stitches

A single ring of stitching around the outer brim edge.

**Geometry:** `<torusGeometry>` with:
- Major radius: `(rBottom + brimWidth) * MM`
- Tube radius: `0.0015` (1.5 mm in scene units)
- Radial segments: 8 (round tube cross-section)
- Tubular segments: 128 (smooth ring)

**Position:** `[0, −sideHeight/2 − brimDrop, 0]` — the exact y position of the outer brim edge.

**Rotation:** `[−Math.PI / 2, 0, 0]` — `TorusGeometry` defaults to the XY plane (axis along Z), so this rotation aligns it to the XZ plane (horizontal ring around Y axis).

**Material:** `<meshStandardMaterial color="#5a3e2b" />` — dark thread color.

---

## 4. Fabric Texture Upload

Upload a PNG/JPG image that wraps the hat surface as a fabric texture.

### State
`App.tsx` adds:
```ts
const [fabricUrl, setFabricUrl] = useState<string | null>(null)
```
A hidden `<input type="file" accept="image/*">` converts the selected file to an object URL via `URL.createObjectURL`. The URL is passed to `HatScene` as `fabricUrl?: string`.

### Texture application (`HatScene.tsx`)

`useLoader` cannot be called conditionally (Rules of Hooks). Extract a `FabricHat` child component that only mounts when `fabricUrl` is set, so `useLoader` always runs for it:

```tsx
// Add required imports
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
import * as THREE from 'three'

function FabricHat({ fabricUrl, crownTop, side, brim }: FabricHatProps) {
  const texture = useLoader(TextureLoader, fabricUrl)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)
  // renders the same three meshes (crown top, side, brim) but with map={texture}
  // and no color prop (texture provides color)
}

// In HatScene, render either FabricHat or the plain meshes:
{fabricUrl
  ? <FabricHat fabricUrl={fabricUrl} {...hatGeomProps} />
  : <PlainHat {...hatGeomProps} />
}
```

`PlainHat` is the existing inline mesh code (crown top, side, brim) extracted into a named component. It accepts the same geometry props as `FabricHat` and renders the three meshes with `color="#f0ece4"` and no `map`. Both components share the same prop interface (`sideRadiusTop`, `sideRadiusBottom`, `sideHeight`, `brimInner`, `brimWidth`, `phi`, `brimDrop`) so geometry calculations are computed once in `HatScene` and passed down to whichever component mounts.

### UI
A small "Upload fabric" button rendered in the top-right corner of the 3D tab (absolute positioned over the canvas). Clicking it triggers the hidden file input. If a texture is loaded, a "✕ Remove" button replaces it.

### Cleanup
Revoke the previous object URL with `URL.revokeObjectURL` when a new file is selected or when the component unmounts, to avoid memory leaks.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/HatScene.tsx` | Brim geometry, shadows, stitches, texture |
| `src/pages/App.tsx` | `fabricUrl` state + file input + button UI |

No changes to `hatMath.ts`, `patternSvg.ts`, `PatternView.tsx`, or `ParamPanel.tsx`.

---

## Out of Scope

- Texture on flat pattern pieces (A was selected: 3D preview only)
- Multiple stitch rows
- Stitch on crown base
- Any changes to the pattern generation logic
