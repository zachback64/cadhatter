import { Canvas, useLoader } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { HatParams } from '../types'
import { computeCrown } from '../lib/hatMath'
import * as THREE from 'three'
import { TextureLoader } from 'three'

interface HatMeshProps {
  sideRadiusTop: number
  sideRadiusBottom: number
  sideHeight: number
  brimInner: number
  brimWidth: number   // raw mm value (not scaled)
  rBottom: number     // raw mm value (not scaled)
  brimDrop: number
  MM: number
}

function PlainHat({ sideRadiusTop, sideRadiusBottom, sideHeight, brimInner, brimWidth, rBottom, brimDrop, MM, hatColor }: HatMeshProps & { hatColor: string }) {
  return (
    <>
      {/* Crown top */}
      <mesh position={[0, sideHeight / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <circleGeometry args={[sideRadiusTop, 64]} />
        <meshStandardMaterial color={hatColor} side={2} />
      </mesh>

      {/* Side panel */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[sideRadiusTop, sideRadiusBottom, sideHeight, 64, 1, true]} />
        <meshStandardMaterial color={hatColor} side={2} />
      </mesh>

      {/* Brim */}
      <mesh position={[0, -sideHeight / 2, 0]} castShadow receiveShadow>
        <latheGeometry args={[[
          new THREE.Vector2(brimInner, 0),
          new THREE.Vector2((rBottom + brimWidth) * MM, -brimDrop),
        ], 64]} />
        <meshStandardMaterial color={hatColor} side={2} />
      </mesh>
    </>
  )
}

function FabricHat({ fabricUrl, sideRadiusTop, sideRadiusBottom, sideHeight, brimInner, brimWidth, rBottom, brimDrop, MM }: HatMeshProps & { fabricUrl: string }) {
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

interface Props {
  params: HatParams
  fabricUrl?: string
  hatColor?: string
}

export function HatScene({ params, fabricUrl, hatColor }: Props) {
  const MM = 0.001 // convert mm to Three.js units (1 unit = 1m)
  const { rBottom, rCrown } = computeCrown(params)

  const sideRadiusTop = rCrown * MM
  const sideRadiusBottom = rBottom * MM
  const sideHeight = params.hatHeight * MM
  const brimInner = rBottom * MM  // inner horizontal radius (unchanged name, same value)
  const phi = (params.brimAngle * Math.PI) / 180
  const brimDrop = params.brimWidth * Math.tan(phi) * MM  // vertical droop of outer edge

  const hatMeshProps: HatMeshProps = {
    sideRadiusTop, sideRadiusBottom, sideHeight,
    brimInner, brimWidth: params.brimWidth, rBottom, brimDrop, MM,
  }

  return (
    <Canvas camera={{ position: [0, 0.15, 0.35], fov: 45 }} shadows>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 2]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <Environment preset="city" />

      {/* Hat meshes — plain or fabric-textured */}
      {fabricUrl
        ? <FabricHat fabricUrl={fabricUrl} {...hatMeshProps} />
        : <PlainHat hatColor={hatColor ?? '#f0ece4'} {...hatMeshProps} />
      }

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
