import { useFrame } from '@react-three/fiber'
import { CuboidCollider, CylinderCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Color, MeshStandardMaterial, Quaternion, Vector3 } from 'three'

import {
  blinkState,
  collapseState,
  crusherState,
  discAngle,
  geyserState,
  laserAngle,
  moverK,
  pendulumAngle,
} from '../../config/dynamics'
import { hazardStripeTexture } from '../fx/decorTextures'
import { conveyorMaterial, flameMaterial, glowMaterial, surfaceMaterial, timeUniform } from '../fx/materials'
import Particles from '../fx/Particles'
import { activeStages, bodyTags, bounceHits } from '../playerState'

/**
 * Moving obstacles. Kinematic bodies are driven from the pure timing functions in
 * config/dynamics.js; hazards without collision (fists, geysers, blades) are pure
 * visuals, and the player tests against the same functions.
 *
 * Each component skips its work while its stage (`sk`) is out of range.
 */

const _v = new Vector3()
const _q = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _x = new Vector3(1, 0, 0)
const PARKED = { x: 0, y: -200, z: 0 }

/** Registers a body's tag for the player's ground checks. */
function useBodyTag(ref, tag) {
  useEffect(() => {
    const rb = ref.current
    if (!rb) return undefined
    bodyTags.set(rb.handle, tag)
    return () => bodyTags.delete(rb.handle)
  }, [ref, tag])
}

/** Disposes a three.js resource when it's replaced or the component unmounts. */
function useDispose(resource) {
  useEffect(() => () => resource?.dispose?.(), [resource])
}

/* --- Moving platform ---------------------------------------------------------------- */

export function Mover({ mover, sk }) {
  const body = useRef(null)
  const from = useMemo(() => new Vector3(...mover.from), [mover])
  const to = useMemo(() => new Vector3(...mover.to), [mover])
  const tag = useMemo(() => ({ kind: 'mover', vel: { x: 0, z: 0 } }), [])
  const edge = useMemo(() => glowMaterial('#4dd8ff', 2), [])
  useDispose(edge)
  useBodyTag(body, tag)

  useFrame((_s, delta) => {
    const rb = body.current
    if (!rb || !activeStages.has(sk)) return
    _v.lerpVectors(from, to, moverK(mover, timeUniform.value))
    const cur = rb.translation()
    const dt = Math.max(delta, 1e-3)
    tag.vel.x = (_v.x - cur.x) / dt
    tag.vel.z = (_v.z - cur.z) / dt
    rb.setNextKinematicTranslation(_v)
  })

  const [w, h, d] = mover.size
  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={mover.from}>
      <CuboidCollider args={[w / 2, h / 2, d / 2]} />
      <mesh material={surfaceMaterial(mover.style === 'ice' ? 'snow' : 'plank')} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      {mover.style === 'ice' && (
        <mesh material={surfaceMaterial('frost')} position={[0, -h / 2 - 0.8, 0]}>
          <boxGeometry args={[w * 0.92, 1.6, d * 0.92]} />
        </mesh>
      )}
      <mesh material={edge} position={[0, -h / 2 - 0.03, 0]}>
        <boxGeometry args={[w + 0.12, 0.08, d + 0.12]} />
      </mesh>
    </RigidBody>
  )
}

/* --- Spinning disc -------------------------------------------------------------------- */

export function Disc({ disc, sk }) {
  const body = useRef(null)
  const tag = useMemo(() => ({ kind: 'disc', cx: disc.c[0], cz: disc.c[2], w: disc.w }), [disc])
  const rim = useMemo(() => glowMaterial(disc.w > 0 ? '#ff4fb8' : '#39d7ff', 2.4), [disc.w])
  useDispose(rim)
  useBodyTag(body, tag)

  useFrame(() => {
    const rb = body.current
    if (!rb || !activeStages.has(sk)) return
    rb.setNextKinematicRotation(_q.setFromAxisAngle(_up, discAngle(disc, timeUniform.value)))
  })

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={disc.c}>
      <CylinderCollider args={[disc.h / 2, disc.r]} />
      <mesh material={surfaceMaterial(disc.style === 'gear' ? 'metalplate' : 'stone')} castShadow receiveShadow>
        <cylinderGeometry args={[disc.r, disc.r * 0.92, disc.h, 40]} />
      </mesh>
      {disc.style === 'gear' &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2
          return (
            <mesh
              key={`t${i}`}
              material={surfaceMaterial('gold')}
              position={[Math.cos(a) * (disc.r + 0.25), 0, Math.sin(a) * (disc.r + 0.25)]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry args={[0.6, disc.h * 0.8, 0.7]} />
            </mesh>
          )
        })}
      <mesh material={rim} position={[0, disc.h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[disc.r - 0.28, disc.r - 0.1, 48]} />
      </mesh>
      {/* Spokes, so the spin reads at a glance. */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          material={rim}
          position={[0, disc.h / 2 + 0.012, 0]}
          rotation={[-Math.PI / 2, 0, (i * Math.PI) / 3]}
        >
          <planeGeometry args={[disc.r * 1.6, 0.14]} />
        </mesh>
      ))}
      <mesh position={[0, -disc.h / 2 - 1.5, 0]} material={surfaceMaterial('iron')}>
        <cylinderGeometry args={[0.5, 0.7, 3, 12]} />
      </mesh>
    </RigidBody>
  )
}

/* --- Blinking platform ------------------------------------------------------------------ */

const BLINK_COLORS = ['#ff4fb8', '#39d7ff']
const LEAF_COLORS = ['#6bff5a', '#c6ff3d']

export function BlinkTile({ tile, sk }) {
  const body = useRef(null)
  const vis = useRef(null)
  const parked = useRef(false)
  const cloud = tile.style === 'cloud'
  const leaf = tile.style === 'leaf'
  const color = cloud ? (tile.group ? '#dff3ff' : '#fff2fb') : (leaf ? LEAF_COLORS : BLINK_COLORS)[tile.group]
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color,
        emissive: new Color(color),
        emissiveIntensity: 0.6,
        roughness: 0.35,
        transparent: true,
      }),
    [color],
  )
  useDispose(mat)
  const edge = useMemo(() => glowMaterial(color, 2.6), [color])
  useDispose(edge)

  useFrame(() => {
    const rb = body.current
    if (!rb || !activeStages.has(sk)) return
    const t = timeUniform.value
    const { on, warn } = blinkState(tile, t)
    if (on && parked.current) {
      rb.setTranslation({ x: tile.c[0], y: tile.c[1], z: tile.c[2] }, true)
      parked.current = false
    } else if (!on && !parked.current) {
      rb.setTranslation(PARKED, true)
      parked.current = true
    }
    // The visual stays put and shows a faint ghost while "off", so you can plan.
    vis.current.position.set(tile.c[0], tile.c[1], tile.c[2])
    const flicker = warn ? 0.35 + 0.65 * (Math.sin(t * 40) > 0 ? 1 : 0) : 1
    mat.opacity = on ? flicker : 0.12
    mat.emissiveIntensity = on ? 0.6 * flicker : 0.15
  })

  const [w, h, d] = tile.s
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={tile.c}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} />
      </RigidBody>
      <group ref={vis} position={tile.c}>
        {cloud ? (
          [
            [0, 0, 0, 0.62],
            [-0.3, 0.05, 0.25, 0.42],
            [0.32, 0.06, -0.2, 0.45],
            [0.1, 0.12, 0.35, 0.38],
          ].map(([ox, oy, oz, k], i) => (
            <mesh key={i} material={mat} position={[ox * w, oy, oz * d]} scale={[1, 0.45, 1]} castShadow>
              <sphereGeometry args={[w * k, 14, 10]} />
            </mesh>
          ))
        ) : leaf ? (
          <>
            {/* A giant glowing leaf pad: round, with a vein down the middle. */}
            <mesh material={mat} scale={[1, 1, 1.15]} castShadow>
              <cylinderGeometry args={[w * 0.58, w * 0.5, h, 20]} />
            </mesh>
            <mesh material={edge} position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.14, d * 1.05]} />
            </mesh>
            <mesh material={edge} position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[w * 0.5, w * 0.58, 24]} />
            </mesh>
          </>
        ) : (
          <>
            <mesh material={mat} castShadow>
              <boxGeometry args={[w, h, d]} />
            </mesh>
            <mesh material={edge} position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[w * 0.36, w * 0.46, 4, 1, Math.PI / 4]} />
            </mesh>
          </>
        )}
      </group>
    </>
  )
}

/* --- Collapsing bridge tile ------------------------------------------------------------------ */

export function CollapseTile({ tile, sk }) {
  const body = useRef(null)
  const vis = useRef(null)
  const parked = useRef(false)
  const tag = useMemo(() => ({ kind: 'collapse', id: tile.id }), [tile.id])
  useBodyTag(body, tag)

  useFrame(() => {
    const rb = body.current
    if (!rb || !activeStages.has(sk)) return
    const t = timeUniform.value
    const st = collapseState(tile.id, t)
    const [x, y, z] = tile.c
    let dy = 0
    let jx = 0
    let rot = 0
    let scale = 1
    let gone = false
    if (st.phase === 'shake') {
      jx = Math.sin(t * 75) * 0.07 * st.p
      dy = -0.05 * st.p
    } else if (st.phase === 'fall') {
      dy = -0.5 * 26 * st.p * st.p
      rot = st.p * 1.6 * (tile.tilt >= 0 ? 1 : -1)
    } else if (st.phase === 'gone') {
      gone = true
    } else if (st.phase === 'back') {
      scale = st.p
      gone = st.p < 0.5
    }

    if (gone) {
      if (!parked.current) {
        rb.setTranslation(PARKED, true)
        parked.current = true
      }
    } else if (parked.current) {
      rb.setTranslation({ x, y, z }, true)
      rb.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      parked.current = false
    } else {
      rb.setNextKinematicTranslation({ x: x + jx, y: y + dy, z })
      rb.setNextKinematicRotation(_q.setFromAxisAngle(_x, rot))
    }
    // Visual follows the tile's intended pose even while its collider is parked.
    vis.current.visible = st.phase !== 'gone'
    vis.current.position.set(x + jx, y + dy, z)
    vis.current.rotation.set(rot, 0, tile.tilt)
    vis.current.scale.setScalar(Math.max(0.01, scale))
  })

  const [w, h, d] = tile.s
  return (
    <>
      <RigidBody ref={body} type="kinematicPosition" colliders={false} position={tile.c}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} />
      </RigidBody>
      <group ref={vis} position={tile.c}>
        <mesh
          material={surfaceMaterial(tile.style === 'ice' ? 'frost' : tile.style === 'crystal' ? 'crystaltile' : 'plank')}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[w, h, d - 0.06]} />
        </mesh>
        {tile.style === 'plank' ? (
          <mesh material={surfaceMaterial('darkwood')} position={[0, -h / 2 - 0.1, 0]}>
            <boxGeometry args={[w + 0.3, 0.2, 0.35]} />
          </mesh>
        ) : (
          // Glowing crack lines: these tiles look solid until they aren't.
          <mesh material={surfaceMaterial(tile.style === 'ice' ? 'glow:#8fe8ff:1.6' : 'glow:#b84dff:1.8')} position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, tile.tilt * 20]}>
            <planeGeometry args={[w * 0.8, 0.06]} />
          </mesh>
        )}
      </group>
    </>
  )
}

/* --- Titan fist crusher ---------------------------------------------------------------------- */

export function Crusher({ crusher, sk, world }) {
  const fist = useRef(null)
  const shadow = useRef(null)
  const warnRing = useRef(null)
  const dust = useRef(null)
  const skin = useMemo(
    () => new MeshStandardMaterial({ color: world === 2 ? '#9dbbe0' : '#e3a080', roughness: 0.75 }),
    [world],
  )
  useDispose(skin)
  const nail = useMemo(() => new MeshStandardMaterial({ color: '#f4e4d4', roughness: 0.5 }), [])
  useDispose(nail)
  const w = crusher.hx * 2
  const d = crusher.hz * 2
  const armLen = 30

  useFrame(() => {
    if (!fist.current) return
    const active = activeStages.has(sk)
    fist.current.parent.visible = active
    if (!active) return
    const st = crusherState(crusher, timeUniform.value)
    const shake = st.warn ? Math.sin(timeUniform.value * 60) * 0.12 : 0
    fist.current.position.set(shake, st.bottom, 0)
    shadow.current.material.opacity = 0.15 + st.k * 0.55
    shadow.current.scale.setScalar(0.7 + st.k * 0.3)
    warnRing.current.visible = st.warn
    warnRing.current.material.opacity = 0.5 + 0.5 * Math.sin(timeUniform.value * 18)
    dust.current.visible = st.impact >= 0
    if (st.impact >= 0) {
      dust.current.scale.setScalar(1 + st.impact * 2.2)
      dust.current.material.opacity = 1 - st.impact
    }
  })

  const style = crusher.style || 'fist'
  return (
    <group position={crusher.c}>
      <group ref={fist}>
        {style === 'icicle' && (
          <>
            <mesh material={surfaceMaterial('frost')} position={[0, 2.2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
              <coneGeometry args={[crusher.hx, 4.4, 7]} />
            </mesh>
            <mesh material={surfaceMaterial('glow:#bff4ff:1.4')} position={[0, 1.2, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[crusher.hx * 0.4, 2.4, 6]} />
            </mesh>
          </>
        )}
        {style === 'piston' && (
          <>
            <mesh material={surfaceMaterial('metalplate')} position={[0, 1, 0]} castShadow>
              <boxGeometry args={[w, 2, d]} />
            </mesh>
            <mesh material={surfaceMaterial('glow:#ffb31a:2.2')} position={[0, 0.02, 0]}>
              <boxGeometry args={[w + 0.05, 0.1, d + 0.05]} />
            </mesh>
            <mesh material={surfaceMaterial('steel')} position={[0, 2 + armLen / 2, 0]}>
              <cylinderGeometry args={[Math.min(w, d) * 0.22, Math.min(w, d) * 0.22, armLen, 16]} />
            </mesh>
          </>
        )}
        {(style === 'fist' || style === 'frost') && (
        <>
        <mesh material={skin} position={[0, 1.9, 0]} castShadow>
          <boxGeometry args={[w, 2.6, d]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={skin} position={[-w / 2 + (w / 4) * (i + 0.5), 0.35, 0]} castShadow>
            <boxGeometry args={[w / 4 - 0.12, 0.75, d - 0.3]} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} material={nail} position={[-w / 2 + (w / 4) * (i + 0.5), 0.55, d / 2 - 0.1]}>
            <boxGeometry args={[w / 4 - 0.5, 0.35, 0.1]} />
          </mesh>
        ))}
        <mesh material={skin} position={[w / 2 + 0.3, 1.6, 0.4]} castShadow>
          <boxGeometry args={[0.9, 1.6, d * 0.6]} />
        </mesh>
        <mesh material={skin} position={[0, 3.2 + armLen / 2, 0]}>
          <boxGeometry args={[w * 0.72, armLen, d * 0.7]} />
        </mesh>
        </>
        )}
      </group>
      <mesh ref={shadow} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w + 0.8, d + 0.8]} />
        <meshBasicMaterial color="#12081a" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={warnRing} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[Math.max(w, d) * 0.55, Math.max(w, d) * 0.62, 4, 1, Math.PI / 4]} />
        <meshBasicMaterial color={[3, 0.3, 0.2]} transparent toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={dust} position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[Math.max(w, d) * 0.5, Math.max(w, d) * 0.7, 32]} />
        <meshBasicMaterial color="#e8dcc8" transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

/* --- Lava geyser ------------------------------------------------------------------------------ */

export function Geyser({ geyser, sk, world }) {
  const column = useRef(null)
  const glow = useRef(null)
  const embers = useRef(null)
  const root = useRef(null)
  const colors = useMemo(() => (world === 2 ? ['#3ff0ff', '#e6fdff'] : ['#ff4a00', '#ffe14a']), [world])
  const flame = useMemo(() => flameMaterial(colors[0], colors[1]), [colors])
  useDispose(flame)
  const glowMat = useMemo(() => glowMaterial(colors[0], 1), [colors])
  useDispose(glowMat)
  const base = useMemo(() => new Color(colors[0]), [colors])

  useFrame(() => {
    if (!root.current) return
    const active = activeStages.has(sk)
    root.current.visible = active
    if (!active) return
    const st = geyserState(geyser, timeUniform.value)
    const h = geyser.h * st.k
    column.current.visible = st.phase === 2 && st.k > 0.02
    column.current.scale.set(1, Math.max(0.01, st.k), 1)
    column.current.position.y = h / 2
    const pulse = st.phase === 1 ? 0.8 + st.k * 2.5 + Math.sin(timeUniform.value * 25) * 0.5 : st.phase === 2 ? 3 : 0.5
    glowMat.color.copy(base).multiplyScalar(pulse)
    embers.current.visible = st.phase > 0
  })

  return (
    <group ref={root} position={geyser.c}>
      <mesh material={surfaceMaterial('rock')} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[geyser.r, 0.32, 8, 20]} />
      </mesh>
      <mesh ref={glow} material={glowMat} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[geyser.r, 24]} />
      </mesh>
      <mesh ref={column} material={flame}>
        <cylinderGeometry args={[geyser.r * 0.8, geyser.r, geyser.h, 18, 1, true]} />
      </mesh>
      <group ref={embers}>
        <Particles
          pattern="rise"
          shape="ember"
          count={36}
          size={0.24}
          a={colors[1]}
          b={colors[0]}
          radius={geyser.r}
          height={geyser.h * 0.8}
          speed={1.6}
        />
      </group>
    </group>
  )
}

/* --- Pendulum axe ----------------------------------------------------------------------------- */

export function Pendulum({ pendulum, sk }) {
  const arm = useRef(null)
  const edge = useMemo(() => glowMaterial('#ff6a3a', 2.8), [])
  useDispose(edge)
  useFrame(() => {
    if (!arm.current) return
    const active = activeStages.has(sk)
    arm.current.visible = active
    if (active) arm.current.rotation.z = pendulumAngle(pendulum, timeUniform.value)
  })
  const L = pendulum.L
  return (
    <group ref={arm} position={pendulum.pivot}>
      <mesh material={surfaceMaterial('iron')} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.45, 1.6, 12]} />
      </mesh>
      <mesh material={surfaceMaterial('iron')} position={[0, -L / 2, 0]}>
        <boxGeometry args={[0.28, L, 0.28]} />
      </mesh>
      {/* Half-moon blade hanging from the arm end. */}
      <mesh material={surfaceMaterial('steel')} position={[0, -L, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[1.9, 1.9, 0.2, 28, 1, false, -Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh material={edge} position={[0, -L, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[1.9, 0.08, 6, 28, Math.PI]} />
      </mesh>
    </group>
  )
}

/* --- Sweeper bar ----------------------------------------------------------------------------- */

export function Sweeper({ sweeper, sk }) {
  const bar = useRef(null)
  const stripes = useMemo(() => {
    const t = hazardStripeTexture().clone()
    t.repeat.set(sweeper.r / 2, 1)
    t.needsUpdate = true
    return t
  }, [sweeper.r])
  useEffect(() => () => stripes.dispose(), [stripes])
  const cap = useMemo(() => glowMaterial('#ff3b4f', 2.6), [])
  useDispose(cap)
  useFrame(() => {
    if (!bar.current) return
    const active = activeStages.has(sk)
    bar.current.visible = active
    if (active) bar.current.rotation.y = -laserAngle(sweeper, timeUniform.value)
  })
  const y = (sweeper.y0 + sweeper.y1) / 2
  const h = sweeper.y1 - sweeper.y0
  return (
    <group ref={bar} position={[sweeper.c[0], y, sweeper.c[2]]}>
      <mesh castShadow>
        <boxGeometry args={[sweeper.r * 2, h, h]} />
        <meshStandardMaterial map={stripes} roughness={0.5} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={cap} position={[s * sweeper.r, 0, 0]}>
          <sphereGeometry args={[h * 0.75, 12, 10]} />
        </mesh>
      ))}
    </group>
  )
}

/* --- Rotating laser ---------------------------------------------------------------------------- */

export function Laser({ laser, sk }) {
  const ref = useRef(null)
  const mat = useMemo(() => glowMaterial('#ff1f3a', 3.2), [])
  useDispose(mat)
  useFrame(() => {
    if (!ref.current) return
    const active = activeStages.has(sk)
    ref.current.visible = active
    if (active) ref.current.rotation.y = -laserAngle(laser, timeUniform.value)
  })
  return (
    <group ref={ref} position={laser.c}>
      <mesh material={mat} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.09, 0.09, laser.r * 2, 10]} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.24, 0.24, laser.r * 2, 10]} />
        <meshBasicMaterial color={[2.2, 0.1, 0.25]} transparent opacity={0.25} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* --- Launch pad ------------------------------------------------------------------------------- */

export function BouncePad({ pad }) {
  const body = useRef(null)
  const top = useRef(null)
  const tag = useMemo(() => ({ kind: 'bounce', id: pad.id, v: pad.v }), [pad])
  const glow = useMemo(() => glowMaterial('#5dff7a', 2.2), [])
  useDispose(glow)
  useBodyTag(body, tag)
  useFrame(() => {
    if (!top.current) return
    const hit = bounceHits.get(pad.id)
    const age = hit === undefined ? 9 : timeUniform.value - hit
    const squash = age < 0.8 ? 1 - Math.exp(-age * 7) * Math.cos(age * 30) * 0.6 : 1
    top.current.scale.set(1 + (1 - squash) * 0.3, Math.max(0.3, squash), 1 + (1 - squash) * 0.3)
  })
  return (
    <>
      <RigidBody ref={body} type="fixed" colliders={false} position={pad.c}>
        <CylinderCollider args={[0.14, pad.r]} />
      </RigidBody>
      <group position={pad.c}>
        <mesh material={surfaceMaterial('iron')} position={[0, -0.05, 0]}>
          <cylinderGeometry args={[pad.r + 0.25, pad.r + 0.35, 0.2, 24]} />
        </mesh>
        <group ref={top}>
          <mesh material={glow} position={[0, 0.08, 0]}>
            <cylinderGeometry args={[pad.r, pad.r, 0.14, 24]} />
          </mesh>
        </group>
        <Particles
          pattern="rise"
          shape="star"
          count={30}
          size={0.25}
          a="#ffffff"
          b="#5dff7a"
          radius={pad.r * 0.8}
          height={4}
          speed={1.2}
        />
      </group>
    </>
  )
}

/* --- Conveyor ---------------------------------------------------------------------------------- */

export function Conveyor({ belt }) {
  const body = useRef(null)
  const tag = useMemo(() => ({ kind: 'conveyor', v: { x: belt.v[0], z: belt.v[1] } }), [belt])
  useBodyTag(body, tag)
  const [w, h, d] = belt.s
  const along = belt.v[0] !== 0 ? w : d
  const across = belt.v[0] !== 0 ? d : w
  const speed = Math.hypot(belt.v[0], belt.v[1])
  const mat = useMemo(() => conveyorMaterial('#ffb31a', along / 2.5, speed / 2.5), [along, speed])
  useDispose(mat)
  // Plane local +X is pointed along the belt's motion.
  const yaw = Math.atan2(-belt.v[1], belt.v[0])
  return (
    <>
      <RigidBody ref={body} type="fixed" colliders={false} position={belt.c}>
        <CuboidCollider args={[w / 2, h / 2, d / 2]} />
      </RigidBody>
      <group position={belt.c}>
        <mesh material={surfaceMaterial('iron')}>
          <boxGeometry args={[w, h - 0.02, d]} />
        </mesh>
        <group rotation={[0, yaw, 0]}>
          <mesh material={mat} position={[0, h / 2 + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[along, across]} />
          </mesh>
        </group>
      </group>
    </>
  )
}

/* --- Wind fans ---------------------------------------------------------------------------------- */

function Fan({ p, side }) {
  const blades = useRef(null)
  useFrame((_s, delta) => {
    if (blades.current) blades.current.rotation.x += delta * 14
  })
  return (
    <group position={p} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
      <mesh material={surfaceMaterial('iron')} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[2.3, 0.3, 8, 28]} />
      </mesh>
      <group ref={blades}>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            material={surfaceMaterial('castle')}
            rotation={[(i * Math.PI) / 2, 0, 0]}
            position={[0.1, 0, 0]}
          >
            <boxGeometry args={[0.12, 2, 0.7]} />
          </mesh>
        ))}
        <mesh material={surfaceMaterial('gold')} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 0.4, 12]} />
        </mesh>
      </group>
    </group>
  )
}

export function WindZone({ wind, sk }) {
  const root = useRef(null)
  useFrame(() => {
    if (root.current) root.current.visible = activeStages.has(sk)
  })
  const len = wind.zTop - wind.zBot
  const cz = (wind.zTop + wind.zBot) / 2
  const fanX = wind.fans[0]?.[0] ?? 0
  return (
    <group ref={root}>
      {wind.fans.map((p, i) => (
        <Fan key={i} p={p} side={wind.side} />
      ))}
      {/* Streaks flying across the corridor, away from the fans. */}
      <group position={[fanX, 4, cz]} rotation={[0, 0, wind.side > 0 ? Math.PI / 2 : -Math.PI / 2]}>
        <Particles
          pattern="line"
          shape="streak"
          count={90}
          size={1.1}
          a="#ffffff"
          b="#bfe9ff"
          length={8}
          radius={len / 2}
          height={24}
          speed={1.6}
          intensity={1.4}
        />
      </group>
    </group>
  )
}

/* --- Slippery ice ------------------------------------------------------------------------------ */

export function IceBody({ colliders }) {
  const body = useRef(null)
  const tag = useMemo(() => ({ kind: 'ice' }), [])
  useBodyTag(body, tag)
  if (!colliders.length) return null
  return (
    <RigidBody ref={body} type="fixed" colliders={false}>
      {colliders.map((c, i) => (
        <CuboidCollider key={i} position={c.c} args={c.h} friction={0} />
      ))}
    </RigidBody>
  )
}
