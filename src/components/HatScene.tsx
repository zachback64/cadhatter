import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { HatParams } from '../types'
import { computeCrown } from '../lib/hatMath'

interface Props {
  params: HatParams
}

export function HatScene({ params }: Props) {
  const MM = 0.001 // convert mm to Three.js units (1 unit = 1m)
  const { rBottom, rCrown } = computeCrown(params)

  const sideRadiusTop = rCrown * MM
  const sideRadiusBottom = rBottom * MM
  const sideHeight = params.hatHeight * MM
  const brimInner = rBottom * MM
  const brimOuter = (rBottom + params.brimWidth) * MM
  const brimTilt = (params.brimAngle * Math.PI) / 180

  return (
    <Canvas camera={{ position: [0, 0.15, 0.35], fov: 45 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 2, 1]} intensity={1} />
      <Environment preset="city" />

      {/* Crown top — rotated -90° around X so it lies flat (CircleGeometry defaults to XY plane) */}
      <mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[sideRadiusTop, 64]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Side panel */}
      <mesh>
        <cylinderGeometry args={[sideRadiusTop, sideRadiusBottom, sideHeight, 64, 1, true]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Brim — RingGeometry defaults to XY plane; rotate -90°+brimTilt so it sits flat with angle */}
      <mesh position={[0, -sideHeight / 2, 0]} rotation={[-Math.PI / 2 + brimTilt, 0, 0]}>
        <ringGeometry args={[brimInner, brimOuter, 64]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      <OrbitControls enablePan={false} minDistance={0.1} maxDistance={1} />
    </Canvas>
  )
}
