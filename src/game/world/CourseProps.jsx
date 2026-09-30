import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, Object3D, Shape, ShapeGeometry } from 'three'

import { WALL_TOP } from '../../config/stages'
import { useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { glowMaterial } from '../fx/materials'
import Particles from '../fx/Particles'
import { TextPlane, TextSprite } from '../fx/Text'

/* --- Win pads -------------------------------------------------------------------- */

export function WinPad({ pad }) {
  const double = pad.kind === 'double'
  // The double pad only pays out once the 2x Wins upgrade (300 Wins) is owned.
  const owned = useProgress((s) => Boolean(s.upgrades.wins2x))
  const locked = double && !owned
  const color = locked ? '#8a86a6' : double ? '#ff3fd2' : '#ffd21f'
  const ringRef = useRef(null)
  const mat = useMemo(() => glowMaterial(color, 1.8), [color])
  useEffect(() => () => mat.dispose(), [mat])
  useFrame(({ clock }) => {
    if (ringRef.current) {
      const s = 1 + (Math.sin(clock.elapsedTime * 3) * 0.5 + 0.5) * 0.12
      ringRef.current.scale.set(s, 1, s)
    }
  })
  return (
    <group position={pad.c}>
      <mesh material={mat} position={[0, 0.06, 0]}>
        <boxGeometry args={[pad.s[0], 0.12, pad.s[2]]} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.14, 0]}>
        <boxGeometry args={[pad.s[0] + 0.3, 0.04, pad.s[2] + 0.3]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
      </mesh>
      <Particles pattern="line" shape="star" count={26} size={0.18} a="#ffffff" b={color} length={pad.s[0]} radius={pad.s[2] / 2} height={2.4} speed={0.7} />
      <TextSprite
        text={`${pad.wins} Wins`}
        height={0.9}
        position={[0, 2.3, 0]}
        opts={{ fill: locked ? ['#e3e0f5', '#8a86a6'] : double ? ['#ffb3f3', '#ff3fd2'] : ['#fff6a8', '#ffc21a'], size: 96 }}
      />
      {double && (
        <TextSprite
          text={locked ? 'LOCKED · buy 2x Wins (300)' : 'Double Wins'}
          height={0.55}
          position={[0, 1.6, 0]}
          opts={{ fill: locked ? ['#ffffff', '#ff7a7a'] : '#ffe45c', size: 80 }}
        />
      )}
    </group>
  )
}

/* --- Grapple hook ------------------------------------------------------------------ */

export function GrappleHook({ hook, ceiling = WALL_TOP }) {
  const targeted = useSession((s) => s.grappleTarget === hook.id)
  const ringRef = useRef(null)
  const [x, y, z] = hook.p
  const ropeLen = ceiling - y - 0.9
  const claw = useMemo(() => glowMaterial('#d8364a', 0.9), [])
  useEffect(() => () => claw.dispose(), [claw])

  const floating = hook.style === 'float'
  const halo = useRef(null)
  useFrame(({ clock }) => {
    if (!ringRef.current) return
    const s = targeted ? 1.25 + Math.sin(clock.elapsedTime * 10) * 0.12 : 1
    ringRef.current.scale.setScalar(s)
    if (halo.current) {
      halo.current.rotation.z = clock.elapsedTime * 1.4
      halo.current.position.y = 1.4 + Math.sin(clock.elapsedTime * 2 + x) * 0.15
    }
  })

  return (
    <group position={[x, y, z]}>
      {/* Open-sky biomes: a floating rune anchor instead of beams to a ceiling. */}
      {floating && (
        <group ref={halo} position={[0, 1.4, 0]}>
          <mesh>
            <torusGeometry args={[1.25, 0.09, 8, 40]} />
            <meshBasicMaterial color={[0.6, 2.2, 3]} toneMapped={false} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} position={[Math.cos((i * Math.PI) / 2) * 1.25, Math.sin((i * Math.PI) / 2) * 1.25, 0]}>
              <octahedronGeometry args={[0.28, 0]} />
              <meshBasicMaterial color={[2.8, 2.4, 0.6]} toneMapped={false} />
            </mesh>
          ))}
          <Particles pattern="orbit" shape="star" count={16} size={0.2} a="#ffffff" b="#6fe3ff" radius={1.3} height={0.2} speed={1.4} />
        </group>
      )}
      {/* Red support beams up to the ceiling. */}
      {!floating && [-0.55, 0.55].map((ox) => (
        <mesh key={ox} position={[ox, 0.9 + ropeLen / 2, 0]}>
          <boxGeometry args={[0.28, ropeLen, 0.28]} />
          <meshStandardMaterial color="#c9404f" roughness={0.7} />
        </mesh>
      ))}
      {/* Open claw. */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.55, 0.9, 0]}>
          <mesh position={[s * 0.18, -0.45, 0]} rotation={[0, 0, s * 0.5]} material={claw}>
            <boxGeometry args={[0.24, 0.9, 0.24]} />
          </mesh>
          <mesh position={[s * 0.12, -1.05, 0]} rotation={[0, 0, -s * 0.55]} material={claw}>
            <boxGeometry args={[0.22, 0.7, 0.22]} />
          </mesh>
        </group>
      ))}
      <mesh ref={ringRef} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.32, 0.06, 8, 28]} />
        <meshBasicMaterial color={targeted ? [3, 3, 3] : [1.4, 1.4, 1.4]} toneMapped={false} />
      </mesh>
      <mesh>
        <circleGeometry args={[0.18, 20]} />
        <meshBasicMaterial color={[2, 2, 2]} toneMapped={false} />
      </mesh>
      <TextSprite
        text="E"
        height={targeted ? 0.9 : 0.55}
        position={[0, 1.0, 0]}
        opts={{ fill: '#ffffff', size: 110 }}
        depthTest={false}
      />
    </group>
  )
}

/* --- Signs & decor -------------------------------------------------------------------- */

const SIGN_STYLES = {
  hint: { fill: '#ffffff', size: 72, bg: 'rgba(30,26,52,0.9)', border: '#0c0a18' },
  speed: { fill: '#3a2400', stroke: '#fff3b0', size: 72, bg: '#ffc21a', border: '#7a4a00' },
  finale: { fill: ['#fff7b0', '#ffb31a'], size: 110, bg: 'rgba(30,26,52,0.92)', border: '#ffc21a' },
}

/** Tutorial / hint board standing on a platform. */
export function HintSign({ sign }) {
  const style = SIGN_STYLES[sign.kind] || SIGN_STYLES.hint
  return (
    <TextPlane
      text={sign.text}
      height={sign.kind === 'finale' ? 6 : 2.4}
      position={sign.p}
      rotation={[0, sign.rot || 0, 0]}
      glow={sign.kind === 'finale' ? 1.3 : 1}
      opts={style}
    />
  )
}

/** Pulsing floor chevrons pointing onward (one instanced draw per stage). */
export function Arrows({ list, color }) {
  const ref = useRef(null)
  const geometry = useMemo(() => {
    const sh = new Shape()
    // Chevron pointing to local +Y (becomes world -Z after laying it flat).
    sh.moveTo(0, 1.2)
    sh.lineTo(1.4, -0.2)
    sh.lineTo(0.8, -0.8)
    sh.lineTo(0, 0)
    sh.lineTo(-0.8, -0.8)
    sh.lineTo(-1.4, -0.2)
    sh.closePath()
    return new ShapeGeometry(sh)
  }, [])
  const material = useMemo(() => glowMaterial(color, 1.8), [color])
  const base = useMemo(() => new Color(color), [color])
  useEffect(() => () => [geometry, material].forEach((r) => r.dispose()), [geometry, material])
  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const o = new Object3D()
    // Yaw first, then lay flat: aims the chevron without tipping it.
    o.rotation.order = 'YXZ'
    list.forEach((a, i) => {
      o.position.set(...a.p)
      o.rotation.set(-Math.PI / 2, a.yaw || 0, 0)
      o.scale.setScalar(Math.max(0.45, Math.min(1, a.s ?? 1)))
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
  }, [list])
  useFrame(({ clock }) => {
    material.color.copy(base).multiplyScalar(1.2 + Math.sin(clock.elapsedTime * 4) * 0.8)
  })
  if (!list.length) return null
  return <instancedMesh ref={ref} args={[geometry, material, list.length]} frustumCulled={false} />
}
