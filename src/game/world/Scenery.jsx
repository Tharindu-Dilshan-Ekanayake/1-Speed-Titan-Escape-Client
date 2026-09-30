import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three'

import { tideHeight, tideRising } from '../../config/dynamics'
import { GATE, GATE_HALF, WALL_TOP } from '../../config/stages'
import { bannerTexture, titanFaceTexture } from '../fx/decorTextures'
import {
  barrierMaterial,
  flameCardGeometry,
  flameCardMaterial,
  glowMaterial,
  lavaMaterial,
  timeUniform,
  waterfallMaterial,
  waterMaterial,
} from '../fx/materials'
import Particles from '../fx/Particles'
import { TextPlane } from '../fx/Text'
import { playerState } from '../playerState'

const TITLE = { font: '"Luckiest Guy", Fredoka, sans-serif', weight: 400 }

/* --- Barrier ------------------------------------------------------------------------ */

/**
 * See-through energy curtain across a gate. Glows where the player is close and
 * ripples outward from the point they pass through (`hitKey` matches
 * playerState.barrierHit.key).
 */
export function Barrier({ width, height, position, color, hitKey }) {
  const material = useMemo(() => barrierMaterial(color, width, height), [color, width, height])
  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const u = material.uniforms
    u.uPlayer.value.copy(playerState.pos)
    const hit = playerState.barrierHit
    if (hit && hit.key === hitKey && u.uHit.value !== hit.t) {
      u.uHit.value = hit.t
      u.uHitPos.value.set(hit.x - (position[0] - width / 2), hit.y)
    }
  })

  return (
    <group position={position}>
      <mesh material={material} position={[0, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
      </mesh>
      <Particles
        pattern="line"
        shape="star"
        count={70}
        size={0.22}
        a="#ffffff"
        b={color}
        length={width}
        radius={0.25}
        height={height * 0.6}
        speed={0.55}
      />
    </group>
  )
}

/* --- Stage gate ---------------------------------------------------------------------- */

/** Barrier, runes and signs for a stage's gate (the stone is in the stage mesh). */
export function StageGate({ stage }) {
  const rune = useMemo(() => glowMaterial(stage.color, 2.4), [stage.color])
  useEffect(() => () => rune.dispose(), [rune])
  const z = stage.zStart
  const x = stage.originX
  const towerX = GATE_HALF + GATE.tower / 2
  return (
    <group>
      <Barrier width={GATE_HALF * 2} height={GATE.lintelBottom} position={[x, 0, z]} color={stage.color} hitKey={stage.key} />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={rune} position={[x + s * towerX, 13, z + 2.03]}>
            <boxGeometry args={[0.4, 8, 0.05]} />
          </mesh>
          <mesh material={rune} position={[x + s * towerX, GATE.wallTop + 10, z]}>
            <octahedronGeometry args={[0.8, 0]} />
          </mesh>
        </group>
      ))}
      <TextPlane
        text={`STAGE ${stage.index}`}
        height={3}
        position={[x, 23, z + 1.35]}
        opts={{ ...TITLE, fill: ['#ffffff', '#fff3a0'], size: 120 }}
      />
      <TextPlane
        text={stage.name.toUpperCase()}
        height={1.4}
        position={[x, 19.4, z + 1.35]}
        glow={1.6}
        opts={{ fill: ['#ffffff', stage.color], size: 90 }}
      />
      <TextPlane
        text={stage.world === 2 ? 'RECOMMENDED\nREBIRTH 1+' : `RECOMMENDED\nLEVEL ${stage.recLevel}`}
        height={1.6}
        position={[x - towerX, 3.6, z + 2.04]}
        opts={{ fill: '#3a2400', stroke: '#fff3b0', size: 60, bg: '#ffc21a', border: '#7a4a00' }}
      />
      <TextPlane
        text={`${stage.wins} WINS`}
        height={1.2}
        position={[x + towerX, 3.6, z + 2.04]}
        opts={{ fill: ['#fff6a8', '#ffc21a'], size: 70, bg: '#2a2148', border: '#ffc21a' }}
      />
    </group>
  )
}

/* --- Torches & banners ----------------------------------------------------------------- */

/** Every torch flame in a set of points, as one draw call. */
export function FlameCards({ points, w, h }) {
  const geometry = useMemo(() => (points.length ? flameCardGeometry(points, w, h) : null), [points, w, h])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return <mesh geometry={geometry} material={flameCardMaterial()} frustumCulled={false} />
}

/** Wall banners (both sides), merged into one mesh. */
export function Banners({ list, theme }) {
  const geometry = useMemo(() => {
    if (!list.length) return null
    const pos = []
    const uv = []
    const nrm = []
    const index = []
    for (const b of list) {
      const base = pos.length / 3
      const x = b.x - b.side * 0.05
      const z0 = b.z - (b.side * b.w) / 2
      const z1 = b.z + (b.side * b.w) / 2
      const y0 = b.top - b.h
      // Facing into the corridor (-side along X).
      pos.push(x, y0, z0, x, y0, z1, x, b.top, z1, x, b.top, z0)
      uv.push(0, 0, 1, 0, 1, 1, 0, 1)
      for (let i = 0; i < 4; i += 1) nrm.push(-b.side, 0, 0)
      index.push(base, base + 1, base + 2, base, base + 2, base + 3)
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(pos, 3))
    g.setAttribute('uv', new Float32BufferAttribute(uv, 2))
    g.setAttribute('normal', new Float32BufferAttribute(nrm, 3))
    g.setIndex(index)
    g.computeBoundingSphere()
    return g
  }, [list])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={bannerTexture(theme)} transparent alphaTest={0.4} side={DoubleSide} roughness={0.9} />
    </mesh>
  )
}

/* --- Titans peeking over the walls -------------------------------------------------------- */

/** Head centre relative to the wall top: mostly below it, so it reads from the run. */
const HEAD_Y = -1.6
const SKIN = { smiling: '#e9a98c', colossal: '#b8302c', frost: '#9dbbe0' }
const EYES = { smiling: '#ffe27a', colossal: '#ff5a2a', frost: '#6ff4ff' }

/**
 * A giant head leaning in over the corridor wall, hands gripping the top, watching
 * the player go past. Scale ~9 units per head - bigger than the whole platform.
 */
export function TitanPeek({ titan, originX, half }) {
  const { root, head, dispose } = useMemo(() => {
    const r = new Group()
    const skin = new MeshStandardMaterial({ color: SKIN[titan.variant], roughness: 0.8 })
    const hair = new MeshStandardMaterial({ color: titan.variant === 'frost' ? '#e8f4ff' : '#3a2418', roughness: 0.9 })
    const face = new MeshStandardMaterial({ map: titanFaceTexture(titan.variant), roughness: 0.8 })
    const eye = glowMaterial(EYES[titan.variant], 4)
    const disposables = [skin, hair, face, eye]
    const geos = []
    const box = (w, h, d) => {
      const g = new BoxGeometry(w, h, d)
      geos.push(g)
      return g
    }
    const add = (parent, g, m, p, rot) => {
      const mesh = new Mesh(g, m)
      mesh.position.set(...p)
      if (rot) mesh.rotation.set(...rot)
      mesh.castShadow = true
      parent.add(mesh)
      return mesh
    }

    const h = new Group()
    // Leaning in over the wall top, into the corridor (local +Z), looking down.
    h.position.set(0, HEAD_Y, 1.2)
    r.add(h)
    add(h, box(8, 9, 7), skin, [0, 0, 0])
    const facePlane = new PlaneGeometry(8, 9)
    geos.push(facePlane)
    add(h, facePlane, face, [0, 0, 3.51])
    const eyeGeo = new SphereGeometry(0.62, 16, 12)
    geos.push(eyeGeo)
    add(h, eyeGeo, eye, [-1.85, 0.8, 3.45])
    add(h, eyeGeo, eye, [1.85, 0.8, 3.45])
    for (const s of [-1, 1]) add(h, box(0.9, 2.2, 1.6), skin, [s * 4.3, 0.2, 0.2])
    if (titan.variant !== 'colossal') {
      add(h, box(8.4, 2, 7.4), hair, [0, 4.6, -0.1])
      for (let i = 0; i < 6; i += 1) {
        add(
          h,
          box(1.6, 2.4, 1.6),
          hair,
          [-3.5 + i * 1.4, 5.8, -1 + (i % 2)],
          [0.3 * (i % 2 ? 1 : -1), 0, 0.2 * (i - 2.5)],
        )
      }
    }
    // Hands gripping the wall top, fingers curled over the inside edge.
    for (const s of [-1, 1]) {
      const hand = new Group()
      hand.position.set(s * 5.2, 0.6, -1.4)
      add(hand, box(3.4, 1.4, 3), skin, [0, 0, 0])
      for (let f = 0; f < 4; f += 1) {
        const fx = -1.25 + f * 0.83
        add(hand, box(0.72, 0.7, 1.4), skin, [fx, 0.1, 2.1])
        add(hand, box(0.7, 1.8, 0.7), skin, [fx, -0.9, 2.55])
      }
      add(hand, box(3, 7, 2.6), skin, [0, -3.6, -2.4], [0.5, 0, 0])
      r.add(hand)
    }
    return {
      root: r,
      head: h,
      dispose: () => {
        geos.forEach((g) => g.dispose())
        disposables.forEach((m) => m.dispose())
      },
    }
  }, [titan.variant])
  useEffect(() => dispose, [dispose])

  const x = originX + titan.side * (half + 1.2)
  useFrame(() => {
    const t = timeUniform.value
    head.position.y = HEAD_Y + Math.sin(t * 0.8 + titan.z) * 0.35
    head.rotation.x = 0.42 + Math.sin(t * 0.6 + titan.z) * 0.05
    // Watch the player.
    // Local +X runs along world +Z on the +X wall and along -Z on the -X wall.
    const dz = playerState.pos.z - titan.z
    head.rotation.y = Math.max(-0.7, Math.min(0.7, Math.atan2(dz * titan.side, 12)))
    head.rotation.z = Math.sin(t * 0.5) * 0.05
  })

  return (
    <primitive
      object={root}
      position={[x, WALL_TOP, titan.z]}
      rotation={[0, titan.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
    />
  )
}

/* --- Water ------------------------------------------------------------------------------ */

export function WaterPool({ floor, originX, width }) {
  const material = useMemo(() => waterMaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  const len = floor.zTop - floor.zBot
  return (
    <mesh
      material={material}
      position={[originX, floor.surface, (floor.zTop + floor.zBot) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[width, len, 48, 48]} />
    </mesh>
  )
}

export function Waterfall({ fall }) {
  const material = useMemo(() => waterfallMaterial(), [])
  useEffect(() => () => material.dispose(), [material])
  const h = fall.top - fall.bottom
  return (
    <group>
      <mesh
        material={material}
        position={[fall.x - fall.side * 0.6, fall.bottom + h / 2, fall.z]}
        rotation={[0, fall.side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}
      >
        <planeGeometry args={[fall.w, h]} />
      </mesh>
      <Particles
        pattern="rise"
        shape="dot"
        count={60}
        size={0.7}
        a="#ffffff"
        b="#9fe8ff"
        radius={3}
        height={3}
        speed={0.6}
        intensity={1.3}
        position={[fall.x - fall.side * 2.5, fall.bottom, fall.z]}
      />
    </group>
  )
}

export function FloatingLog({ log }) {
  const ref = useRef(null)
  useFrame(() => {
    if (!ref.current) return
    const t = timeUniform.value + log.phase
    ref.current.position.y = log.c[1] + Math.sin(t * 1.3) * 0.08
    ref.current.rotation.set(Math.sin(t) * 0.05, log.rot + Math.sin(t * 0.3) * 0.2, Math.PI / 2)
  })
  return (
    <mesh ref={ref} position={log.c} castShadow>
      <cylinderGeometry args={[0.45, 0.45, log.len, 10]} />
      <meshStandardMaterial color="#7a4a2e" roughness={0.95} />
    </mesh>
  )
}

/* --- Lava tide ---------------------------------------------------------------------------- */

export function TideLava({ floor, originX, world, width }) {
  const ref = useRef(null)
  const material = useMemo(() => lavaMaterial(world === 2 ? 'void' : 'fire'), [world])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    if (ref.current) ref.current.position.y = tideHeight(floor, timeUniform.value)
  })
  const len = floor.zTop - floor.zBot
  return (
    <mesh
      ref={ref}
      material={material}
      position={[originX, floor.low, (floor.zTop + floor.zBot) / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[width, len]} />
    </mesh>
  )
}

/** Glowing high-water marks on both walls, pulsing faster while the tide rises. */
export function TideGauge({ gauge, floor, originX, half }) {
  const material = useMemo(() => glowMaterial('#ff3b1f', 2), [])
  const base = useMemo(() => new Color('#ff3b1f'), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(() => {
    const t = timeUniform.value
    const rising = tideRising(floor, t) > 0
    const k = rising ? 1.6 + Math.sin(t * 10) * 1.2 : 0.9
    material.color.copy(base).multiplyScalar(k)
  })
  const len = gauge.zTop - gauge.zBot
  return [-1, 1].map((s) => (
    <mesh
      key={s}
      material={material}
      position={[originX + s * (half - 0.02), gauge.y, (gauge.zTop + gauge.zBot) / 2]}
    >
      <boxGeometry args={[0.08, 0.22, len]} />
    </mesh>
  ))
}

/* --- Splash ------------------------------------------------------------------------------ */

/** Ring + spray where the player last hit the water. */
export function SplashFx() {
  const group = useRef(null)
  const ring = useRef(null)
  const last = useRef(null)
  useFrame(() => {
    const s = playerState.splash
    if (!group.current) return
    if (!s) {
      group.current.visible = false
      return
    }
    if (s !== last.current) {
      last.current = s
      group.current.position.set(s.x, s.y + 0.05, s.z)
    }
    const age = timeUniform.value - s.t
    group.current.visible = age < 1.2
    const k = Math.min(1, age / 1.2)
    ring.current.scale.setScalar(0.5 + k * 4)
    ring.current.material.opacity = 1 - k
  })
  return (
    <group ref={group} visible={false}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 1, 32]} />
        <meshBasicMaterial color={[1.6, 1.8, 2]} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <Particles
        pattern="rise"
        shape="dot"
        count={40}
        size={0.35}
        a="#ffffff"
        b="#8fe3ff"
        radius={1.1}
        height={2.6}
        speed={1.8}
      />
    </group>
  )
}
