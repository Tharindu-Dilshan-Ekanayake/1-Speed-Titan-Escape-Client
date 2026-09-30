import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  CanvasTexture,
  DoubleSide,
  ExtrudeGeometry,
  FrontSide,
  MeshStandardMaterial,
  PlaneGeometry,
  Shape,
  SRGBColorSpace,
} from 'three'

import {
  LOBBY,
  PORTAL_TO_W1,
  PORTAL_TO_W2,
  RECORD_BOARDS,
  SPAWNS,
  treadmillSlot,
  WORLD2_HUB,
  WORLD2_OFFSET_X,
} from '../../config/layout'
import { CORRIDOR_HALF, GATE, STAGES } from '../../config/stages'
import { TREADMILLS } from '../../config/treadmills'
import { bannerTexture, carpetTexture, stainedGlassTexture } from '../fx/decorTextures'
import { glowMaterial, mergeBoxes, shaftMaterial, surfaceMaterial, worldUv } from '../fx/materials'
import Particles from '../fx/Particles'
import { TextPlane } from '../fx/Text'
import { woodTexture } from '../fx/textures'
import HeroHall from './HeroHall'
import Portal from './Portal'
import RecordBoard from './RecordBoard'
import { Barrier, FlameCards } from './Scenery'
import Treadmill from './Treadmill'

const CH = CORRIDOR_HALF
const TITLE_FONT = { font: '"Luckiest Guy", Fredoka, sans-serif', weight: 400, size: 120 }
const ROOF_RISE = 9

/** Box from ranges, in the { c, s, mat } shape mergeBoxes wants. `mat` null = collider only. */
const bx = (x0, x1, y0, y1, z0, z1, mat, collide = true) => ({
  c: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
  s: [x1 - x0, y1 - y0, z1 - z0],
  mat,
  collide,
})

/** Boxes -> one fixed body for the solid ones + one merged mesh per material. */
function BoxSet({ boxes }) {
  const byMat = useMemo(() => {
    const m = new Map()
    for (const b of boxes) {
      if (!b.mat) continue
      if (!m.has(b.mat)) m.set(b.mat, [])
      m.get(b.mat).push(b)
    }
    return [...m.entries()].map(([mat, list]) => ({ mat, geometry: mergeBoxes(list) }))
  }, [boxes])
  useEffect(() => () => byMat.forEach((b) => b.geometry.dispose()), [byMat])
  const solid = boxes.filter((b) => b.collide)
  return (
    <>
      {solid.length > 0 && (
        <RigidBody type="fixed" colliders={false}>
          {solid.map((b, i) => (
            <CuboidCollider key={i} position={b.c} args={[b.s[0] / 2, b.s[1] / 2, b.s[2] / 2]} />
          ))}
        </RigidBody>
      )}
      {byMat.map(({ mat, geometry }) => (
        <mesh key={mat} geometry={geometry} material={surfaceMaterial(mat)} castShadow={mat !== 'beam'} receiveShadow />
      ))}
    </>
  )
}

/* --- Hall shell: floor, walls, pillars, pitched roof --------------------------------------- */

function Hall({ bounds, offsetX = 0, theme }) {
  const { minX, maxX, minZ, maxZ, wallHeight: H } = bounds
  const ice = theme === 'ice'
  const wallMat = ice ? 'icebrick' : 'brick'
  const beamMat = ice ? 'darkstone' : 'beam'
  const ox = offsetX

  const boxes = useMemo(() => {
    const list = [
      bx(ox + minX, ox + maxX, -1, 0, minZ, maxZ, ice ? 'ice' : 'tile'),
      bx(ox + minX - 1, ox + minX, -1, H, minZ - 1, maxZ + 1, wallMat),
      bx(ox + maxX, ox + maxX + 1, -1, H, minZ - 1, maxZ + 1, wallMat),
      bx(ox + minX, ox + maxX, -1, H, maxZ, maxZ + 1, wallMat),
      // Front wall, split around the gate opening.
      bx(ox + minX, ox - CH, -1, H, minZ - 1, minZ, wallMat),
      bx(ox + CH, ox + maxX, -1, H, minZ - 1, minZ, wallMat),
      // Invisible lid: nobody double-jumps out, and it stops the camera too.
      bx(ox + minX, ox + maxX, H + 1, H + 2, minZ, maxZ, null),
    ]
    // Pillars along the side walls, tie beams and king posts across.
    for (let z = minZ + 5; z < maxZ - 2; z += 8) {
      for (const x of [minX + 0.4, maxX - 0.4])
        list.push(bx(ox + x - 0.7, ox + x + 0.7, 0, H + 1, z - 0.7, z + 0.7, beamMat, false))
      list.push(bx(ox + minX, ox + maxX, H, H + 1, z - 0.5, z + 0.5, beamMat, false))
      const cx = ox + (minX + maxX) / 2
      list.push(bx(cx - 0.35, cx + 0.35, H + 1, H + ROOF_RISE, z - 0.35, z + 0.35, beamMat, false))
    }
    return list
  }, [ox, minX, maxX, minZ, maxZ, H, ice, wallMat, beamMat])

  // Pitched roof: two slopes meeting in a ridge along Z. Single-sided, facing down:
  // it's only ever seen from inside.
  const half = (maxX - minX) / 2
  const slope = Math.hypot(half, ROOF_RISE)
  const angle = Math.atan2(ROOF_RISE, half)
  const depth = maxZ - minZ + 2
  const cz = (minZ + maxZ) / 2
  const cx = ox + (minX + maxX) / 2
  const roofTex = useMemo(() => woodTexture(ice ? '#3d4a7a' : '#7a4c3a', ice ? 'roof-ice' : 'roof'), [ice])
  const roofGeo = useMemo(() => worldUv(new PlaneGeometry(slope, depth), slope, depth), [slope, depth])
  useEffect(() => () => roofGeo.dispose(), [roofGeo])
  const trussZ = useMemo(() => {
    const zs = []
    for (let z = minZ + 5; z < maxZ - 2; z += 8) zs.push(z)
    return zs
  }, [minZ, maxZ])
  const skylight = useMemo(() => glowMaterial(ice ? '#bfe9ff' : '#fff1c9', 1.6), [ice])
  useEffect(() => () => skylight.dispose(), [skylight])

  return (
    <>
      <BoxSet boxes={boxes} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            geometry={roofGeo}
            position={[cx + (s * half) / 2, H + ROOF_RISE / 2, cz]}
            rotation={[Math.PI / 2, 0, -s * angle, 'ZXY']}
          >
            <meshStandardMaterial map={roofTex} side={FrontSide} roughness={0.9} />
          </mesh>
          {/* Rafters under each slope, at every truss. */}
          {trussZ.map((z) => (
            <mesh
              key={z}
              material={surfaceMaterial(beamMat)}
              position={[cx + (s * half) / 2, H + ROOF_RISE / 2 - 0.5, z]}
              rotation={[0, 0, -s * angle]}
            >
              <boxGeometry args={[slope, 0.7, 0.7]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh material={skylight} position={[cx, H + ROOF_RISE - 0.6, cz]}>
        <boxGeometry args={[2.6, 0.2, depth - 6]} />
      </mesh>
    </>
  )
}

/* --- Grand gate into the stages -------------------------------------------------------------- */

function FrontBanner({ position, rotation, theme, w = 3.4, h = 8.5 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial map={bannerTexture(theme)} transparent alphaTest={0.4} side={DoubleSide} roughness={0.9} />
    </mesh>
  )
}

function GrandGate({ x, z, H, color, title, sub, hitKey, theme }) {
  const ice = theme === 'ice'
  const stone = ice ? 'darkstone' : 'castle'
  const towerX = CH + 2.6
  const towerTop = H + 6

  const boxes = useMemo(() => {
    const list = []
    for (const s of [-1, 1]) {
      const tx = x + s * towerX
      list.push(bx(tx - 2.6, tx + 2.6, -1, towerTop, z - 3, z + 3, stone))
      for (const [dx, dz] of [
        [-1.9, -2.3],
        [1.9, -2.3],
        [-1.9, 2.3],
        [1.9, 2.3],
      ]) {
        list.push(bx(tx + dx - 0.6, tx + dx + 0.6, towerTop, towerTop + 1.4, z + dz - 0.6, z + dz + 0.6, stone, false))
      }
      list.push(bx(tx - 3.1, tx + 3.1, 0, 1.2, z - 3.5, z + 3.5, stone))
      list.push(bx(tx - 0.35, tx + 0.35, 6.4, 7.3, z + 3, z + 3.5, 'iron', false))
    }
    list.push(bx(x - CH, x + CH, GATE.lintelBottom, H + 1, z - 2.2, z + 2.2, stone))
    list.push(bx(x - CH, x + CH, GATE.lintelBottom - 0.4, GATE.lintelBottom, z - 2.3, z + 2.3, 'gold', false))
    list.push(bx(x - CH - 5, x + CH + 5, H + 1, H + 2.2, z - 2.4, z + 2.4, 'gold', false))
    // The raised portcullis, bars poking out under the lintel.
    for (let px = -CH + 0.8; px < CH; px += 1.4) {
      list.push(
        bx(x + px - 0.1, x + px + 0.1, GATE.lintelBottom - 1.6, GATE.lintelBottom, z - 0.1, z + 0.1, 'iron', false),
      )
    }
    return list
  }, [x, z, H, stone, towerX, towerTop])

  const rune = useMemo(() => glowMaterial(color, 2.4), [color])
  useEffect(() => () => rune.dispose(), [rune])
  const torchPoints = useMemo(() => [-1, 1].map((s) => [x + s * towerX, 7.3, z + 3.3]), [x, z, towerX])

  return (
    <group>
      <BoxSet boxes={boxes} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[x + s * towerX, towerTop + 4.9, z]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[4.4, 7, 4]} />
            <meshStandardMaterial color={ice ? '#3a6bff' : '#c9303f'} roughness={0.6} />
          </mesh>
          <mesh material={rune} position={[x + s * towerX, towerTop + 9, z]}>
            <octahedronGeometry args={[0.8, 0]} />
          </mesh>
          <mesh material={rune} position={[x + s * towerX, 12.5, z + 3.02]}>
            <boxGeometry args={[0.4, 5, 0.05]} />
          </mesh>
          <FrontBanner position={[x + s * towerX, 20, z + 3.05]} theme={ice ? 'ice' : 'fire'} />
        </group>
      ))}
      <FlameCards points={torchPoints} w={1.1} h={1.9} />
      <Barrier width={CH * 2} height={GATE.lintelBottom} position={[x, 0, z]} color={color} hitKey={hitKey} />
      <TextPlane
        text={title}
        height={2.9}
        position={[x, 20.6, z + 2.25]}
        glow={1.3}
        opts={{ ...TITLE_FONT, fill: ['#fff7b0', '#ffb31a', '#ff5a1f'] }}
      />
      <TextPlane
        text={sub}
        height={1.3}
        position={[x, 17.9, z + 2.25]}
        glow={1.5}
        opts={{ fill: ['#ffffff', color], size: 90 }}
      />
    </group>
  )
}

/* --- Lobby back wall: stained glass, god rays, leaderboards, banners ----------------------- */

const WINDOW_X = [-16, 0, 16]
const BANNER_X = [-24, -8, 8, 24]
const SIDE_TORCH_Z = [-22, -6, 10, 26]

function BackWall() {
  const { maxZ, maxX, minX } = LOBBY
  const shaft = useMemo(() => shaftMaterial('#ffe9b8', 0.32), [])
  useEffect(() => () => shaft.dispose(), [shaft])

  const boxes = useMemo(() => {
    const list = []
    for (const x of WINDOW_X) {
      list.push(bx(x - 3.6, x - 3, 8.8, 20.2, maxZ - 0.6, maxZ, 'castle', false))
      list.push(bx(x + 3, x + 3.6, 8.8, 20.2, maxZ - 0.6, maxZ, 'castle', false))
      list.push(bx(x - 3.6, x + 3.6, 8.3, 8.9, maxZ - 0.8, maxZ, 'castle', false))
      list.push(bx(x - 3.6, x + 3.6, 20.1, 20.7, maxZ - 0.6, maxZ, 'castle', false))
    }
    for (const x of BANNER_X) list.push(bx(x - 0.3, x + 0.3, 6.5, 7.4, maxZ - 0.8, maxZ, 'iron', false))
    for (const z of SIDE_TORCH_Z) {
      list.push(bx(minX, minX + 0.9, 10.5, 11.4, z - 0.3, z + 0.3, 'iron', false))
      list.push(bx(maxX - 0.9, maxX, 10.5, 11.4, z - 0.3, z + 0.3, 'iron', false))
    }
    return list
  }, [maxZ, minX, maxX])

  const flames = useMemo(
    () => [
      ...BANNER_X.map((x) => [x, 7.4, maxZ - 0.7]),
      ...SIDE_TORCH_Z.flatMap((z) => [
        [minX + 0.7, 11.4, z],
        [maxX - 0.7, 11.4, z],
      ]),
    ],
    [maxZ, minX, maxX],
  )

  // God rays from each window down to the floor ~13 units into the hall.
  const drop = Math.atan2(12.7, 14.5)
  const rayLen = Math.hypot(12.7, 14.5)

  return (
    <group>
      <BoxSet boxes={boxes} />
      {WINDOW_X.map((x, i) => (
        <group key={x}>
          <mesh position={[x, 14.5, maxZ - 0.06]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[6, 11.4]} />
            <meshBasicMaterial
              map={stainedGlassTexture(i + 1)}
              transparent
              alphaTest={0.3}
              color={[1.5, 1.5, 1.5]}
              toneMapped={false}
            />
          </mesh>
          <group position={[x, 14.5 / 2, maxZ - 12.7 / 2]} rotation={[drop, 0, 0]}>
            <mesh material={shaft}>
              <planeGeometry args={[5.5, rayLen]} />
            </mesh>
            <mesh material={shaft} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[5.5, rayLen]} />
            </mesh>
          </group>
          <Particles
            pattern="sparkle"
            shape="dot"
            count={30}
            size={0.09}
            a="#fff4c8"
            b="#ffffff"
            radius={2.5}
            height={12}
            speed={0.4}
            intensity={1.6}
            position={[x, 1, maxZ - 7]}
          />
        </group>
      ))}
      {BANNER_X.map((x) => (
        <FrontBanner
          key={x}
          position={[x, 16, maxZ - 0.15]}
          rotation={[0, Math.PI, 0]}
          theme={Math.abs(x) === 8 ? 'royal' : 'fire'}
        />
      ))}
      <FlameCards points={flames} w={1} h={1.7} />
      <TextPlane
        text="HALL OF LEGENDS"
        height={1.5}
        position={[0, 21.3, maxZ - 0.3]}
        rotation={[0, Math.PI, 0]}
        opts={{ ...TITLE_FONT, fill: ['#fff7b0', '#ffc21a'], size: 110 }}
      />
      {RECORD_BOARDS.map((b) => (
        <RecordBoard
          key={b.stat}
          stat={b.stat}
          title={b.title}
          color={b.color}
          position={b.pos}
          rotation={[0, Math.PI, 0]}
          scale={1.3}
        />
      ))}
    </group>
  )
}

/* --- Chandeliers ------------------------------------------------------------------------------ */

function Chandeliers({ x = 0, zs, top }) {
  const flames = useMemo(
    () =>
      zs.flatMap((z) =>
        Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return [x + Math.cos(a) * 2.6, 15.9, z + Math.sin(a) * 2.6]
        }),
      ),
    [x, zs],
  )
  return (
    <group>
      {zs.map((z) => (
        <group key={z} position={[x, 15.4, z]}>
          <mesh material={surfaceMaterial('gold')} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.6, 0.16, 8, 32]} />
          </mesh>
          <mesh material={surfaceMaterial('iron')} position={[0, (top - 15.4) / 2, 0]}>
            <boxGeometry args={[0.1, top - 15.4, 0.1]} />
          </mesh>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <mesh key={i} position={[Math.cos(a) * 2.6, 0.25, Math.sin(a) * 2.6]}>
                <cylinderGeometry args={[0.1, 0.1, 0.5, 6]} />
                <meshStandardMaterial color="#fff3dc" />
              </mesh>
            )
          })}
        </group>
      ))}
      <FlameCards points={flames} w={0.35} h={0.7} />
    </group>
  )
}

/* --- Floor dressing ---------------------------------------------------------------------------- */

function SpawnDecal({ position }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 512
    const ctx = c.getContext('2d')
    ctx.translate(256, 256)
    ctx.fillStyle = 'rgba(20,16,34,0.85)'
    ctx.beginPath()
    const spikes = 11
    for (let i = 0; i <= spikes * 2; i += 1) {
      const a = (i / (spikes * 2)) * Math.PI * 2
      const r = i % 2 ? 70 : 230 - (i % 4) * 30
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.fill()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(0, 0, 58, 0, Math.PI * 2)
    ctx.fill()
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    return t
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} />
    </mesh>
  )
}

/** Red carpet from the spawn to the gate. */
function Carpet({ x, z0, z1, width = 6 }) {
  const len = z1 - z0
  const texture = useMemo(() => {
    const t = carpetTexture().clone()
    t.repeat.set(1, len / 6)
    t.needsUpdate = true
    return t
  }, [len])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh position={[x, 0.012, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width, len]} />
      <meshStandardMaterial map={texture} roughness={0.95} />
    </mesh>
  )
}

/* --- Hall boards (TRAINING / HEROES) ------------------------------------------------------- */

const EMBLEMS = {
  // Lightning bolt: training makes you fast.
  bolt: [[0.15, 1], [-0.55, -0.1], [-0.05, -0.1], [-0.25, -1], [0.6, 0.25], [0.05, 0.25], [0.35, 1]],
  // Five-point star: heroes.
  star: Array.from({ length: 10 }, (_, i) => {
    const a = Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? 0.42 : 1
    return [Math.cos(a) * r, Math.sin(a) * r]
  }),
}

function Emblem({ kind, color, position, scale = 1 }) {
  const ref = useRef(null)
  const geometry = useMemo(() => {
    const pts = EMBLEMS[kind]
    const sh = new Shape()
    pts.forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)))
    sh.closePath()
    const g = new ExtrudeGeometry(sh, { depth: 0.25, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 })
    g.center()
    return g
  }, [kind])
  const material = useMemo(() => glowMaterial(color, 2.4), [color])
  useEffect(() => () => [geometry, material].forEach((r) => r.dispose()), [geometry, material])
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.rotation.y = Math.sin(t * 1.4) * 0.5
    ref.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08)
  })
  return (
    <group position={position} scale={scale}>
      <mesh ref={ref} geometry={geometry} material={material} />
    </group>
  )
}

/**
 * A big framed board hung high on a hall wall: gold frame, rich panel, glowing rim,
 * the title in the game's logo lettering, a subtitle, and a spinning emblem either
 * side. Hung in front of the wall pillars on two chains, so nothing cuts across it.
 */
function HallBoard({ title, sub, color, panel, emblem, position, rotation }) {
  const W = 26
  const H = 9
  const rim = useMemo(() => glowMaterial(color, 2.2), [color])
  const back = useMemo(
    () => new MeshStandardMaterial({ color: panel, roughness: 0.55, emissive: panel, emissiveIntensity: 0.35 }),
    [panel],
  )
  useEffect(() => () => [rim, back].forEach((m) => m.dispose()), [rim, back])
  const gold = surfaceMaterial('gold')
  const frame = [
    [0, H / 2 + 0.25, W + 1, 0.5],
    [0, -H / 2 - 0.25, W + 1, 0.5],
    [-W / 2 - 0.25, 0, 0.5, H],
    [W / 2 + 0.25, 0, 0.5, H],
  ]
  return (
    <group position={position} rotation={rotation}>
      <mesh material={back} castShadow>
        <boxGeometry args={[W, H, 0.4]} />
      </mesh>
      {frame.map(([x, y, w, h], i) => (
        <mesh key={i} material={gold} position={[x, y, 0.1]} castShadow>
          <boxGeometry args={[w, h, 0.6]} />
        </mesh>
      ))}
      {/* Glowing inner rim. */}
      {[
        [0, H / 2 - 0.12, W - 0.2, 0.12],
        [0, -H / 2 + 0.12, W - 0.2, 0.12],
        [-W / 2 + 0.12, 0, 0.12, H - 0.2],
        [W / 2 - 0.12, 0, 0.12, H - 0.2],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} material={rim} position={[x, y, 0.22]}>
          <boxGeometry args={[w, h, 0.05]} />
        </mesh>
      ))}
      {/* Gold studs on the corners, chains up to the rafters. */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sy) => (
          <mesh key={`${sx}${sy}`} material={gold} position={[sx * (W / 2 + 0.25), sy * (H / 2 + 0.25), 0.3]}>
            <sphereGeometry args={[0.55, 14, 10]} />
          </mesh>
        )),
      )}
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={surfaceMaterial('iron')} position={[sx * (W / 2 - 1.5), H / 2 + 3.5, -0.1]}>
          <cylinderGeometry args={[0.08, 0.08, 6.5, 6]} />
        </mesh>
      ))}
      <TextPlane
        text={title}
        height={4.6}
        position={[0, 1, 0.24]}
        opts={{ ...TITLE_FONT, size: 160, fill: ['#fffbe0', '#ffd21f', '#ff9a00'], stroke: '#1a1330' }}
      />
      <TextPlane text={sub} height={1.5} position={[0, -2.9, 0.24]} opts={{ fill: '#ffffff', size: 80, stroke: '#1a1330' }} />
      {[-1, 1].map((sx) => (
        <Emblem key={sx} kind={emblem} color={color} position={[sx * (W / 2 - 2.2), 0.6, 0.6]} scale={1.6} />
      ))}
    </group>
  )
}

/* --- Hubs ---------------------------------------------------------------------------------- */

export function Lobby() {
  const first = STAGES[1][0]
  return (
    <group>
      <Hall bounds={LOBBY} theme="castle" />
      <GrandGate
        x={0}
        z={LOBBY.minZ}
        H={LOBBY.wallHeight}
        color={first.color}
        title="+1 SPEED TITAN ESCAPE"
        sub={`STAGE 1 · ${first.name.toUpperCase()}  ▶`}
        hitKey={first.key}
        theme="castle"
      />
      <BackWall />
      <Chandeliers zs={[-20, 0, 20]} top={LOBBY.wallHeight + ROOF_RISE - 1} />
      <Carpet x={0} z0={LOBBY.minZ + 3.5} z1={SPAWNS.lobby.pos[2] - 3} />
      <SpawnDecal position={[SPAWNS.lobby.pos[0], 0.02, SPAWNS.lobby.pos[2]]} />

      {/* Hung in front of the wall pillars (they stand out 1.1 from the wall). */}
      <HallBoard
        title="TRAINING"
        sub="Run on treadmills to get faster!"
        color="#ffb31a"
        panel="#8a3a00"
        emblem="bolt"
        position={[LOBBY.minX + 1.7, 10.8, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
      <HallBoard
        title="HEROES"
        sub="Buy legendary heroes with Wins!"
        color="#c77dff"
        panel="#3b1377"
        emblem="star"
        position={[LOBBY.maxX - 1.7, 10.8, 0]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {TREADMILLS.map((t, i) => {
        const { x, z } = treadmillSlot(i)
        return <Treadmill key={t.id} def={t} position={[x, 0, z]} />
      })}

      <HeroHall />
      <Portal position={PORTAL_TO_W2.pos} to={2} label="WORLD 2" color="#3fa8ff" />
      <Particles
        pattern="fall"
        shape="star"
        count={120}
        size={0.12}
        a="#ffffff"
        b="#c9c0ff"
        radius={22}
        height={16}
        speed={0.25}
        intensity={1.4}
      />
    </group>
  )
}

export function World2Hub() {
  const first = STAGES[2][0]
  const crystal = useMemo(() => glowMaterial('#5ff8ff', 1.5), [])
  useEffect(() => () => crystal.dispose(), [crystal])
  const crystals = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const side = i % 2 ? 1 : -1
        return {
          x: WORLD2_OFFSET_X + side * (WORLD2_HUB.maxX - 3),
          z: -16 + Math.floor(i / 2) * 9,
          h: 3 + (i % 3) * 1.5,
        }
      }),
    [],
  )
  return (
    <group>
      <Hall bounds={WORLD2_HUB} offsetX={WORLD2_OFFSET_X} theme="ice" />
      <GrandGate
        x={WORLD2_OFFSET_X}
        z={WORLD2_HUB.minZ}
        H={WORLD2_HUB.wallHeight}
        color={first.color}
        title="THE FROZEN VOID"
        sub={`STAGE 1 · ${first.name.toUpperCase()}  ▶`}
        hitKey={first.key}
        theme="ice"
      />
      <Chandeliers x={WORLD2_OFFSET_X} zs={[-8, 12]} top={WORLD2_HUB.wallHeight + ROOF_RISE - 1} />
      <Carpet x={WORLD2_OFFSET_X} z0={WORLD2_HUB.minZ + 3.5} z1={SPAWNS.world2.pos[2] - 3} />
      <SpawnDecal position={[SPAWNS.world2.pos[0], 0.02, SPAWNS.world2.pos[2]]} />
      {crystals.map((c, i) => (
        <mesh key={i} material={crystal} position={[c.x, c.h / 2, c.z]} rotation={[0, i, 0]} scale={[1, c.h / 2, 1]}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      <Portal position={PORTAL_TO_W1.pos} to={1} label="WORLD 1" color="#ffb31a" />
      <Particles
        pattern="fall"
        shape="star"
        count={160}
        size={0.14}
        a="#ffffff"
        b="#8fe8ff"
        radius={18}
        height={14}
        speed={0.3}
        position={[WORLD2_OFFSET_X, 0, 0]}
      />
    </group>
  )
}
