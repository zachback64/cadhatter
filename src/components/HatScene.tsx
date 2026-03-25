import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { HatParams } from '../types'
import { computeCrown } from '../lib/hatMath'
import * as THREE from 'three'

interface Props {
  params: HatParams
}

export function HatScene({ params }: Props) {
  const MM = 0.001 // convert mm to Three.js units (1 unit = 1m)
  const { rBottom, rCrown } = computeCrown(params)

  const sideRadiusTop = rCrown * MM
  const sideRadiusBottom = rBottom * MM
  const sideHeight = params.hatHeight * MM
  const brimInner = rBottom * MM  // inner horizontal radius (unchanged name, same value)
  const phi = (params.brimAngle * Math.PI) / 180
  const brimDrop = params.brimWidth * Math.tan(phi) * MM  // vertical droop of outer edge

  return (
    <Canvas camera={{ position: [0, 0.15, 0.35], fov: 45 }} shadows>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 2]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <Environment preset="city" />

      {/* Crown top — rotated -90° around X so it lies flat (CircleGeometry defaults to XY plane) */}
      <mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <circleGeometry args={[sideRadiusTop, 64]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Side panel */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[sideRadiusTop, sideRadiusBottom, sideHeight, 64, 1, true]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Brim — LatheGeometry revolves a 2-point profile around Y: inner edge flush at crown bottom,
          outer edge drooping down by brimDrop. No rotation needed. */}
      <mesh position={[0, -sideHeight / 2, 0]} castShadow receiveShadow>
        <latheGeometry args={[[
          new THREE.Vector2(brimInner, 0),
          new THREE.Vector2((rBottom + params.brimWidth) * MM, -brimDrop),
        ], 64]} />
        <meshStandardMaterial color="#f0ece4" side={2} />
      </mesh>

      {/* Brim stitch — torus at outer brim edge */}
      <mesh
        position={[0, -sideHeight / 2 - brimDrop, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        castShadow
      >
        <torusGeometry args={[(rBottom + params.brimWidth) * MM, 0.0015, 8, 128]} />
        <meshStandardMaterial color="#5a3e2b" />
      </mesh>

      {/* Invisible ground plane — catches shadow only */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -sideHeight / 2 - brimDrop - 0.01, 0]}>
        <planeGeometry args={[2, 2]} />
        <shadowMaterial opacity={0.25} />
      </mesh>

      <OrbitControls enablePan={false} minDistance={0.1} maxDistance={1} />
    </Canvas>
  )
}
