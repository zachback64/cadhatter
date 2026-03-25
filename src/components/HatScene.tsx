import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { HatParams } from '../types'
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

      {/* Crown top */}
      <mesh position={[0, sideHeight / 2, 0]}>
        <circleGeometry args={[sideRadiusTop, 64]} />
        <meshStandardMaterial color="#f5f5f5" side={2} />
      </mesh>

      {/* Side panel */}
      <mesh>
        <cylinderGeometry args={[sideRadiusTop, sideRadiusBottom, sideHeight, 64, 1, true]} />
        <meshStandardMaterial color="#f5f5f5" side={2} />
      </mesh>

      {/* Brim */}
      <group position={[0, -sideHeight / 2, 0]} rotation={[brimTilt, 0, 0]}>
        <mesh>
          <ringGeometry args={[brimInner, brimOuter, 64]} />
          <meshStandardMaterial color="#f5f5f5" side={2} />
        </mesh>
      </group>

      <OrbitControls enablePan={false} minDistance={0.1} maxDistance={1} />
    </Canvas>
  )
}
