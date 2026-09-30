import { useFrame } from '@react-three/fiber'
import { CylinderCollider, RigidBody } from '@react-three/rapier'
import { memo, useEffect, useMemo, useRef } from 'react'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PlaneGeometry, SphereGeometry } from 'three'

import { rollerZ, walkerState } from '../../config/dynamics'
import { DEEP_FLOOR_Y, DEEP_MIST_Y, LAVA_Y, SAND_SURFACE, VOID_CLOUD_Y } from '../../config/stages'
import { titanFaceTexture } from '../fx/decorTextures'
import {
  cloudSeaMaterial,
  glowMaterial,
  lavaMaterial,
  mergeShapes,
  mistMaterial,
  surfaceMaterial,
  timeUniform,
  waterMaterial,
} from '../fx/materials'
import { activeStages } from '../playerState'
import { TideLava, WaterPool } from './Scenery'

/* --- Floors ------------------------------------------------------------------------ */

const FLAT_FLOORS = {
  ground: { mat: 'leaves', y: DEEP_FLOOR_Y, mist: '#e3f4e8' },
  street: { mat: 'stone', y: DEEP_FLOOR_Y, mist: '#f6e9dc' },
  quicksand: { mat: 'sand', y: SAND_SURFACE },
}

function LavaFloor({ variant, width, len, x, z }) {
  const material = useMemo(() => lavaMaterial(variant), [variant])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh material={material} position={[x, LAVA_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, len]} />
    </mesh>
  )
}

function IceWater({ width, len, x, z }) {
  const material = useMemo(() => waterMaterial('#06203f', '#3d8fc9'), [])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh material={material} position={[x, LAVA_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, len, 32, 32]} />
    </mesh>
  )
}

function CloudSea({ width, len, x, z, abyss }) {
  const material = useMemo(() => (abyss ? cloudSeaMaterial('#6b3dd6', '#140a33') : cloudSeaMaterial()), [abyss])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh material={material} position={[x, VOID_CLOUD_Y, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, len]} />
    </mesh>
  )
}

/** Whatever lies under the course, zone by zone. */
export function StageFloor({ stage, floor }) {
  const x = stage.originX
  const len = floor.zTop - floor.zBot
  const z = (floor.zTop + floor.zBot) / 2
  const width = stage.half * 2 + 4
  switch (floor.kind) {
    case 'water':
      return <WaterPool floor={floor} originX={x} width={width} />
    case 'tide':
      return <TideLava floor={floor} originX={x} world={stage.world} width={width} />
    case 'lava':
      return <LavaFloor variant="fire" width={width} len={len} x={x} z={z} />
    case 'voidlava':
      return <LavaFloor variant="void" width={width} len={len} x={x} z={z} />
    case 'acid':
      return <LavaFloor variant="acid" width={width} len={len} x={x} z={z} />
    case 'molten':
      return <LavaFloor variant="molten" width={width} len={len} x={x} z={z} />
    case 'icewater':
      return <IceWater width={width} len={len} x={x} z={z} />
    case 'void':
      return <CloudSea width={width + 220} len={len} x={x} z={z} abyss={stage.biome === 'abyss' || stage.biome === 'crystal'} />
    default: {
      const flat = FLAT_FLOORS[floor.kind]
      if (!flat) return null
      return (
        <>
          <FlatFloor mat={flat.mat} y={flat.y} width={width} len={len} x={x} z={z} />
          {flat.mist && <Mist color={flat.mist} width={width + 60} len={len} x={x} z={z} />}
        </>
      )
    }
  }
}

function Mist({ color, width, len, x, z }) {
  const material = useMemo(() => mistMaterial(color), [color])
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh material={material} position={[x, DEEP_MIST_Y, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[width, len]} />
    </mesh>
  )
}

function FlatFloor({ mat, y, width, len, x, z }) {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(width, len)
    const uv = g.getAttribute('uv')
    for (let i = 0; i < uv.count; i += 1) uv.setXY(i, (uv.getX(i) * width) / 4, (uv.getY(i) * len) / 4)
    return g
  }, [width, len])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} material={surfaceMaterial(mat)} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
}

/* --- Scenery primitives, merged per material --------------------------------------------- */

export const ShapeSet = memo(function ShapeSet({ shapes }) {
  const groups = useMemo(() => {
    const byMat = new Map()
    for (const sh of shapes) {
      if (!byMat.has(sh.mat)) byMat.set(sh.mat, [])
      byMat.get(sh.mat).push(sh)
    }
    return [...byMat.entries()].map(([mat, list]) => ({ mat, geometry: mergeShapes(list) }))
  }, [shapes])
  useEffect(() => () => groups.forEach((g) => g.geometry?.dispose()), [groups])
  return groups.map(({ mat, geometry }) => (
    <mesh key={mat} geometry={geometry} material={surfaceMaterial(mat)} castShadow={!mat.startsWith('glow') && mat !== 'cloud'} receiveShadow />
  ))
})

export function CylColliders({ cyls }) {
  if (!cyls.length) return null
  return (
    <RigidBody type="fixed" colliders={false}>
      {cyls.map((c, i) => (
        <CylinderCollider key={i} position={c.c} args={[c.hh, c.r]} friction={0.6} />
      ))}
    </RigidBody>
  )
}

/* --- Wandering titans --------------------------------------------------------------------- */

const SKIN = { smiling: '#e9a98c', colossal: '#b8302c', bearded: '#d99a78' }

/**
 * A 12-unit titan strolling through the forest floor / streets - scenery, but its
 * ground is death, so it reads as a threat. Built once per variant, then cloned.
 */
const prototypes = new Map()
function titanPrototype(variant) {
  if (prototypes.has(variant)) return prototypes.get(variant)
  const skin = new MeshStandardMaterial({ color: SKIN[variant], roughness: 0.8 })
  const dark = new MeshStandardMaterial({ color: '#3a2418', roughness: 0.9 })
  const face = new MeshStandardMaterial({ map: titanFaceTexture(variant === 'bearded' ? 'smiling' : variant), roughness: 0.8 })
  const eye = glowMaterial(variant === 'colossal' ? '#ff5a2a' : '#ffe27a', 3)
  const box = (w, h, d, m, p) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), m)
    mesh.position.set(...p)
    mesh.castShadow = true
    return mesh
  }
  const root = new Group()
  const hips = new Group()
  hips.position.y = 5.2
  root.add(hips)
  hips.add(box(3.6, 4.6, 2.2, skin, [0, 2.3, 0]))
  if (variant !== 'colossal') hips.add(box(3.7, 1.2, 2.3, dark, [0, 0.2, 0]))
  const head = new Group()
  head.position.y = 4.8
  hips.add(head)
  head.add(box(2.6, 2.8, 2.4, skin, [0, 1.4, 0]))
  const facePlane = new Mesh(new PlaneGeometry(2.6, 2.8), face)
  facePlane.position.set(0, 1.4, 1.21)
  head.add(facePlane)
  const eyeGeo = new SphereGeometry(0.22, 10, 8)
  for (const s of [-1, 1]) {
    const e = new Mesh(eyeGeo, eye)
    e.position.set(s * 0.6, 1.65, 1.22)
    head.add(e)
  }
  if (variant === 'bearded') head.add(box(2.7, 1.2, 0.6, dark, [0, 0.4, 1.1]))
  if (variant !== 'colossal') head.add(box(2.8, 0.9, 2.6, dark, [0, 2.9, -0.1]))
  for (const s of [-1, 1]) {
    const arm = new Group()
    arm.position.set(s * 2.3, 4.2, 0)
    arm.add(box(1.1, 4.6, 1.2, skin, [0, -2.2, 0]))
    hips.add(arm)
    const leg = new Group()
    leg.position.set(s * 0.95, 0, 0)
    leg.add(box(1.4, 5.2, 1.5, skin, [0, -2.6, 0]))
    hips.add(leg)
  }
  prototypes.set(variant, root)
  return root
}

export function TitanWalker({ walker, sk }) {
  const { root, limbs } = useMemo(() => {
    const clone = titanPrototype(walker.variant).clone(true)
    // The clone mirrors the prototype's hierarchy: hips > [torso, (belt), head, arm, leg, arm, leg]
    const hips = clone.children[0]
    const groups = hips.children.filter((c) => c.isGroup && c.position.y !== 4.8)
    return { root: clone, limbs: { armL: groups[0], legL: groups[1], armR: groups[2], legR: groups[3] } }
  }, [walker.variant])

  useFrame(() => {
    const active = activeStages.has(sk)
    root.visible = active
    if (!active) return
    const st = walkerState(walker, timeUniform.value)
    root.position.set(walker.x, walker.y ?? LAVA_Y, st.z)
    root.rotation.y = st.dir > 0 ? Math.PI : 0
    const swing = Math.sin(st.stride) * 0.45
    limbs.legL.rotation.x = swing
    limbs.legR.rotation.x = -swing
    limbs.armL.rotation.x = -swing * 0.8
    limbs.armR.rotation.x = swing * 0.8
    root.children[0].position.y = 5.2 + Math.abs(Math.cos(st.stride)) * 0.25
  })

  return <primitive object={root} scale={walker.scale} />
}

/* --- Rolling boulder -------------------------------------------------------------------- */

export function Boulder({ roller, sk }) {
  const ref = useRef(null)
  useFrame(() => {
    if (!ref.current) return
    const active = activeStages.has(sk)
    ref.current.visible = active
    if (!active) return
    const z = rollerZ(roller, timeUniform.value)
    ref.current.position.set(roller.x, roller.y, z)
    // Rolling toward +Z: spin about X by distance travelled.
    ref.current.rotation.x = (z - roller.z0) / roller.r
  })
  return (
    <mesh ref={ref} material={surfaceMaterial('sandstone')} castShadow>
      <dodecahedronGeometry args={[roller.r, 1]} />
    </mesh>
  )
}

