# 3D Rendering Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix brim geometry alignment, add shadows, add brim stitches, and add fabric texture upload to the 3D hat preview.

**Architecture:** All changes are isolated to `src/components/HatScene.tsx` (3D scene) and `src/pages/App.tsx` (texture state + upload UI). The hat math library (`hatMath.ts`) is untouched — the 3D geometry is corrected to match what the math already computes. The texture pattern introduces `PlainHat` and `FabricHat` child components inside `HatScene.tsx` to satisfy React's Rules of Hooks around `useLoader`.

**Tech Stack:** React 19, Three.js 0.183, @react-three/fiber 9, @react-three/drei 10, Vitest + React Testing Library (jsdom). Note: Three.js canvas components cannot be unit-tested in jsdom (no WebGL) — visual verification via `npm run dev` is used for those steps.

---

## File Map

| File | What changes |
|------|-------------|
| `src/components/HatScene.tsx` | Brim → LatheGeometry; shadows; stitch torus; PlainHat/FabricHat split; accepts `fabricUrl` prop |
| `src/pages/App.tsx` | `fabricUrl` state; hidden file input; upload/remove button overlay in 3D tab |

---

## Task 1: Fix brim geometry with LatheGeometry

**Files:**
- Modify: `src/components/HatScene.tsx`

The brim is currently a flat `RingGeometry` tilted at `brimAngle` — incorrect because `brimAngle` is the cone half-angle from horizontal, not a tilt. Replace with `LatheGeometry` which revolves a 2-point profile around Y, producing the correct conic surface.

> **No unit test possible** — Three.js canvas renders nothing in jsdom. Verify visually.

- [ ] **Step 1: Replace brimTilt/brimOuter with phi/brimDrop**

In `src/components/HatScene.tsx`, replace lines 17–19:
```ts
// REMOVE these three lines:
const brimInner = rBottom * MM
const brimOuter = (rBottom + params.brimWidth) * MM
const brimTilt = (params.brimAngle * Math.PI) / 180
```
With:
```ts
const brimInner = rBottom * MM  // inner horizontal radius (unchanged name, same value)
const phi = (params.brimAngle * Math.PI) / 180
const brimDrop = params.brimWidth * Math.tan(phi) * MM  // vertical droop of outer edge
```

- [ ] **Step 2: Replace the brim mesh**

Replace the entire brim `<mesh>` block (lines 39–43):
```tsx
{/* Brim — RingGeometry defaults to XY plane; rotate -90°+brimTilt so it sits flat with angle */}
<mesh position={[0, -sideHeight / 2, 0]} rotation={[-Math.PI / 2 + brimTilt, 0, 0]}>
  <ringGeometry args={[brimInner, brimOuter, 64]} />
  <meshStandardMaterial color="#f0ece4" side={2} />
</mesh>
```
With:
```tsx
{/* Brim — LatheGeometry revolves a 2-point profile around Y: inner edge flush at crown bottom,
    outer edge drooping down by brimDrop. No rotation needed. */}
<mesh position={[0, -sideHeight / 2, 0]}>
  <latheGeometry args={[[
    new THREE.Vector2(brimInner, 0),
    new THREE.Vector2((rBottom + params.brimWidth) * MM, -brimDrop),
  ], 64]} />
  <meshStandardMaterial color="#f0ece4" side={2} />
</mesh>
```

Add the THREE import at the top of the file (after existing imports):
```ts
import * as THREE from 'three'
```

- [ ] **Step 3: Visual verification**

Run: `npm run dev` (from `C:/Users/Zach/dev/cadhatter`)
Open: `http://localhost:5173/app`

Check:
- Brim inner edge sits flush with the bottom of the cone (no gap, no overlap)
- Adjusting brim angle slider shows the outer edge drooping more/less while inner stays fixed
- At brimAngle=0 the brim is perfectly flat/horizontal

- [ ] **Step 4: Commit**

```bash
git add src/components/HatScene.tsx
git commit -m "fix: replace RingGeometry brim with LatheGeometry conic surface"
```

---

## Task 2: Add shadows

**Files:**
- Modify: `src/components/HatScene.tsx`

> **No unit test possible** — visual verification only.

- [ ] **Step 1: Enable shadows on Canvas and lights**

In `src/components/HatScene.tsx`, update the `<Canvas>` opening tag (line 22):
```tsx
// BEFORE:
<Canvas camera={{ position: [0, 0.15, 0.35], fov: 45 }}>

// AFTER:
<Canvas camera={{ position: [0, 0.15, 0.35], fov: 45 }} shadows>
```

Update the directional light (line 24):
```tsx
// BEFORE:
<directionalLight position={[1, 2, 1]} intensity={1} />

// AFTER:
<directionalLight position={[2, 4, 2]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
```

- [ ] **Step 2: Add castShadow/receiveShadow to hat meshes**

Add `castShadow receiveShadow` to all three hat meshes (crown top, side, brim). Example for crown top:
```tsx
// BEFORE:
<mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>

// AFTER:
<mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
```
Do the same for the side mesh and the brim mesh.

- [ ] **Step 3: Add shadow-catching ground plane**

Add this mesh inside `<Canvas>`, after the brim mesh and before `<OrbitControls>`:
```tsx
{/* Invisible ground plane — catches shadow only */}
<mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -sideHeight / 2 - brimDrop - 0.01, 0]}>
  <planeGeometry args={[2, 2]} />
  <shadowMaterial opacity={0.25} />
</mesh>
```

- [ ] **Step 4: Visual verification**

Open `http://localhost:5173/app` (dev server already running from Task 1).

Check:
- A soft shadow appears on the ground below the hat
- Rotating the hat (orbit controls) shows the shadow updating
- Shadow is not harsh/pixelated (1024 map size is adequate)

- [ ] **Step 5: Commit**

```bash
git add src/components/HatScene.tsx
git commit -m "feat: add shadow casting and ground shadow catcher to 3D scene"
```

---

## Task 3: Add circumferential brim stitches

**Files:**
- Modify: `src/components/HatScene.tsx`

A single `TorusGeometry` ring at the outer brim edge, using a dark thread color.

> **No unit test possible** — visual verification only.

- [ ] **Step 1: Add the stitch torus mesh**

Add this mesh inside `<Canvas>`, after the brim mesh (and before the shadow catcher plane):
```tsx
{/* Brim stitch — torus at outer brim edge */}
<mesh
  position={[0, -sideHeight / 2 - brimDrop, 0]}
  rotation={[-Math.PI / 2, 0, 0]}
  castShadow
>
  <torusGeometry args={[(rBottom + params.brimWidth) * MM, 0.0015, 8, 128]} />
  <meshStandardMaterial color="#5a3e2b" />
</mesh>
```

Note on `torusGeometry args`: `[majorRadius, tubeRadius, radialSegments, tubularSegments]`.
- `majorRadius`: `(rBottom + params.brimWidth) * MM` — the outer brim circumference
- `tubeRadius`: `0.0015` — 1.5 mm in scene units (thin thread)
- `radialSegments`: `8` — round cross-section
- `tubularSegments`: `128` — smooth ring

The `-π/2` rotation around X rotates from the XY plane (TorusGeometry default) to horizontal (XZ plane).

- [ ] **Step 2: Visual verification**

Open `http://localhost:5173/app`.

Check:
- A thin dark ring sits exactly on the outer edge of the brim
- The ring follows the brim as brim width and brim angle are adjusted
- The ring casts a shadow onto the ground plane

- [ ] **Step 3: Commit**

```bash
git add src/components/HatScene.tsx
git commit -m "feat: add circumferential stitch torus at outer brim edge"
```

---

## Task 4: Extract PlainHat and FabricHat components

**Files:**
- Modify: `src/components/HatScene.tsx`

Refactor to support fabric texture. `useLoader` (from `@react-three/fiber`) cannot be called conditionally — so the textured and untextured hat are separate components. `HatScene` computes geometry props once and renders either `PlainHat` or `FabricHat`.

> **No unit test possible** — visual verification only. The refactor must leave the plain hat looking identical to before.

- [ ] **Step 1: Define the shared hat geometry props interface**

At the top of `src/components/HatScene.tsx`, after imports, add:
```ts
interface HatMeshProps {
  sideRadiusTop: number
  sideRadiusBottom: number
  sideHeight: number
  brimInner: number
  brimWidth: number   // in MM (raw mm, not scaled)
  rBottom: number     // in MM (raw mm, not scaled)
  phi: number
  brimDrop: number
  MM: number
}
```

- [ ] **Step 2: Extract PlainHat component**

Add this function above `HatScene` in `src/components/HatScene.tsx`:
```tsx
function PlainHat({ sideRadiusTop, sideRadiusBottom, sideHeight, brimInner, brimWidth, rBottom, phi, brimDrop, MM }: HatMeshProps) {
  return (
    <>
      {/* Crown top */}
      <mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <circleGeometry args={[sideRadiusTop, 64]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Side panel */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[sideRadiusTop, sideRadiusBottom, sideHeight, 64, 1, true]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Brim */}
      <mesh position={[0, -sideHeight / 2, 0]} castShadow receiveShadow>
        <latheGeometry args={[[
          new THREE.Vector2(brimInner, 0),
          new THREE.Vector2((rBottom + brimWidth) * MM, -brimDrop),
        ], 64]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>
    </>
  )
}
```

- [ ] **Step 3: Add FabricHat component**

Add this function above `HatScene` (after `PlainHat`):
```tsx
import { useLoader } from '@react-three/fiber'
import { TextureLoader } from 'three'
```
(Add to existing imports at top of file)

```tsx
function FabricHat({ fabricUrl, sideRadiusTop, sideRadiusBottom, sideHeight, brimInner, brimWidth, rBottom, phi, brimDrop, MM }: HatMeshProps & { fabricUrl: string }) {
  const texture = useLoader(TextureLoader, fabricUrl)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(4, 4)

  return (
    <>
      {/* Crown top */}
      <mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <circleGeometry args={[sideRadiusTop, 64]} />
        <meshStandardMaterial map={texture} side={2} />
      </mesh>

      {/* Side panel */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[sideRadiusTop, sideRadiusBottom, sideHeight, 64, 1, true]} />
        <meshStandardMaterial map={texture} side={2} />
      </mesh>

      {/* Brim */}
      <mesh position={[0, -sideHeight / 2, 0]} castShadow receiveShadow>
        <latheGeometry args={[[
          new THREE.Vector2(brimInner, 0),
          new THREE.Vector2((rBottom + brimWidth) * MM, -brimDrop),
        ], 64]} />
        <meshStandardMaterial map={texture} side={2} />
      </mesh>
    </>
  )
}
```

- [ ] **Step 4: Update HatScene to use PlainHat/FabricHat and accept fabricUrl**

Update the `Props` interface:
```ts
interface Props {
  params: HatParams
  fabricUrl?: string
}
```

Update `HatScene` signature:
```tsx
export function HatScene({ params, fabricUrl }: Props) {
```

Remove the three inline hat meshes from the JSX (crown top, side, brim). Replace with:
```tsx
{/* Hat meshes — switch between plain and fabric-textured */}
{fabricUrl
  ? <FabricHat fabricUrl={fabricUrl} {...hatMeshProps} />
  : <PlainHat {...hatMeshProps} />
}
```

Where `hatMeshProps` is an object built from the computed values:
```ts
const hatMeshProps: HatMeshProps = {
  sideRadiusTop, sideRadiusBottom, sideHeight,
  brimInner, brimWidth: params.brimWidth, rBottom, phi, brimDrop, MM,
}
```

- [ ] **Step 5: Visual verification**

Open `http://localhost:5173/app`.

Check:
- Hat looks identical to before (no texture loaded yet)
- No console errors
- Orbit controls, sliders, shadows, stitches all still work

- [ ] **Step 6: Commit**

```bash
git add src/components/HatScene.tsx
git commit -m "refactor: extract PlainHat/FabricHat components to support fabric texture"
```

---

## Task 5: Add fabric upload UI in App.tsx

**Files:**
- Modify: `src/pages/App.tsx`

Add state for the fabric URL, a hidden file input, and an Upload/Remove button overlaid on the 3D view.

- [ ] **Step 1: Write the failing test**

Create `src/pages/App.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppPage } from './App'

// Mock HatScene — Three.js/WebGL doesn't work in jsdom
vi.mock('../components/HatScene', () => ({
  HatScene: () => <div data-testid="hat-scene" />,
}))

// Mock PatternView
vi.mock('../components/PatternView', () => ({
  PatternView: () => <div data-testid="pattern-view" />,
}))

// Mock URL.createObjectURL / revokeObjectURL
beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  global.URL.revokeObjectURL = vi.fn()
})

test('shows Upload fabric button in 3D tab', () => {
  render(<AppPage />)
  expect(screen.getByRole('button', { name: /upload fabric/i })).toBeInTheDocument()
})

test('shows Remove button after file selected, then reverts on remove', () => {
  render(<AppPage />)
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File([''], 'fabric.png', { type: 'image/png' })
  fireEvent.change(input, { target: { files: [file] } })

  expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /upload fabric/i })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /remove/i }))
  expect(screen.getByRole('button', { name: /upload fabric/i })).toBeInTheDocument()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/Zach/dev/cadhatter && npx vitest run src/pages/App.test.tsx
```
Expected: FAIL — `AppPage` has no upload button yet.

- [ ] **Step 3: Add fabricUrl state and file input to App.tsx**

Add to `src/pages/App.tsx` imports:
```ts
import { useState, useRef, useEffect } from 'react'
```
(Replace the existing `import { useState }` line.)

Add inside `AppPage` function, after the existing state:
```ts
const [fabricUrl, setFabricUrl] = useState<string | null>(null)
const fileInputRef = useRef<HTMLInputElement>(null)

const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (fabricUrl) URL.revokeObjectURL(fabricUrl)
  setFabricUrl(URL.createObjectURL(file))
}

const handleRemoveFabric = () => {
  if (fabricUrl) URL.revokeObjectURL(fabricUrl)
  setFabricUrl(null)
  if (fileInputRef.current) fileInputRef.current.value = ''
}

useEffect(() => {
  return () => { if (fabricUrl) URL.revokeObjectURL(fabricUrl) }
}, [])  // cleanup on unmount only
```

Add the hidden file input inside the JSX, just before the closing `</div>` of the outer wrapper:
```tsx
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleFileChange}
/>
```

- [ ] **Step 4: Add the Upload/Remove button overlay and wire up HatScene**

Replace the 3D tab content in App.tsx:
```tsx
{tab === '3d' ? (
  <div className="relative h-full">
    <HatScene params={params} fabricUrl={fabricUrl ?? undefined} />
    <div className="absolute top-2 right-2">
      {fabricUrl ? (
        <button
          onClick={handleRemoveFabric}
          className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
        >
          ✕ Remove fabric
        </button>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm bg-white border border-gray-300 rounded px-3 py-1 shadow-sm hover:bg-gray-50"
        >
          Upload fabric
        </button>
      )}
    </div>
  </div>
) : (
  <PatternView pieces={geo.patternPieces} params={params} onParamsChange={setParams} />
)}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd C:/Users/Zach/dev/cadhatter && npx vitest run src/pages/App.test.tsx
```
Expected: PASS — 2 tests pass.

- [ ] **Step 6: Run all tests to check for regressions**

```bash
cd C:/Users/Zach/dev/cadhatter && npm test
```
Expected: All tests pass.

- [ ] **Step 7: Visual verification**

Open `http://localhost:5173/app`.

Check:
- "Upload fabric" button visible in top-right of 3D view
- Clicking opens file picker
- Selecting a fabric image (any PNG/JPG) applies it to all hat surfaces
- "✕ Remove fabric" button appears; clicking it restores plain color
- Switching sliders while texture is applied works correctly
- Switching to Pattern tab and back retains texture state

- [ ] **Step 8: Commit**

```bash
git add src/pages/App.tsx src/pages/App.test.tsx
git commit -m "feat: add fabric texture upload button to 3D view"
```

---

## Done

All four improvements are complete:
1. ✅ Brim geometry fixed — conic LatheGeometry, inner edge flush at all angles
2. ✅ Shadows — directional shadow + transparent ground catcher
3. ✅ Stitches — dark torus ring at outer brim edge
4. ✅ Fabric upload — image wraps all hat surfaces, removable, memory-safe
