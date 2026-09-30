import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, LatheGeometry, Vector2 } from 'three'

import Lightning from '../fx/Lightning'
import {
  auraShellMaterial,
  glowMaterial,
  groundRingMaterial,
  pillarMaterial,
} from '../fx/materials'
import Particles from '../fx/Particles'

/** Flame-shaped silhouette for the ki shell (radius, height). */
const SHELL_PROFILE = [
  [0.5, 0],
  [0.72, 0.35],
  [0.78, 0.9],
  [0.7, 1.5],
  [0.5, 2.1],
  [0.22, 2.55],
  [0.02, 2.8],
].map(([r, y]) => new Vector2(r, y))

let shellGeometry = null
const getShellGeometry = () => (shellGeometry ||= new LatheGeometry(SHELL_PROFILE, 32))

function OrbitRing({ color, index }) {
  const ref = useRef(null)
  const material = useMemo(() => glowMaterial(color, 2.6), [color])
  const hsl = useMemo(() => new Color(), [])
  useEffect(() => () => material.dispose(), [material])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!ref.current) return
    ref.current.rotation.set(0.9 + index * 0.7, t * (0.8 + index * 0.35), 0.3 * index)
    if (color === 'rainbow') {
      hsl.setHSL((t * 0.2 + index * 0.33) % 1, 0.9, 0.6)
      material.color.copy(hsl).multiplyScalar(2.6)
    }
  })
  return (
    <mesh ref={ref} position={[0, 1.05, 0]} material={material}>
      <torusGeometry args={[0.95 + index * 0.12, 0.018, 6, 64]} />
    </mesh>
  )
}

/**
 * The full aura for one hero: flame shell, ground rune ring, particles, arcs, orbit
 * rings, light pillar and (for the player only) a coloured point light.
 */
export function Aura({ aura, light = false, strength = 1 }) {
  const shell = useMemo(
    () => (aura.shell ? auraShellMaterial(aura.color, aura.color2, aura.shell * strength) : null),
    [aura, strength],
  )
  const shellOuter = useMemo(
    () => (aura.shell ? auraShellMaterial(aura.color, aura.color, aura.shell * 0.45 * strength) : null),
    [aura, strength],
  )
  const ring = useMemo(() => (aura.ring ? groundRingMaterial(aura.color, aura.runes) : null), [aura])
  // Faint on the player's own hero (`light`): at full strength it fills the view
  // from the follow camera.
  const pillar = useMemo(
    () => (aura.pillar ? pillarMaterial(aura.color2 || aura.color, light ? 0.28 : 0.9) : null),
    [aura, light],
  )

  useEffect(
    () => () => [shell, shellOuter, ring, pillar].forEach((m) => m?.dispose()),
    [shell, shellOuter, ring, pillar],
  )

  const outerRef = useRef(null)
  useFrame(({ clock }) => {
    if (outerRef.current) outerRef.current.rotation.y = -clock.elapsedTime * 0.8
  })

  const lightColor = aura.color === 'rainbow' ? '#ffffff' : aura.color

  return (
    <group>
      {shell && <mesh geometry={getShellGeometry()} material={shell} scale={[1, 0.95, 1]} />}
      {shellOuter && (
        <mesh ref={outerRef} geometry={getShellGeometry()} material={shellOuter} scale={[1.22, 1.08, 1.22]} />
      )}
      {ring && (
        <mesh material={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <planeGeometry args={[2.8, 2.8]} />
        </mesh>
      )}
      {pillar && (
        <mesh material={pillar} position={[0, 3, 0]}>
          <cylinderGeometry args={[0.95, 1.1, 6, 24, 1, true]} />
        </mesh>
      )}
      {(aura.particles || []).map((p, i) => (
        <Particles
          key={i}
          seed={i + 1}
          pattern={p.pattern}
          shape={p.shape}
          count={p.count}
          size={p.size}
          a={p.a}
          b={p.b}
          speed={p.speed}
          radius={p.pattern === 'orbit' ? 1.05 : 0.8}
          height={2.3}
        />
      ))}
      {aura.lightning && (
        <Lightning color={aura.lightning.color} count={aura.lightning.count} radius={0.75} height={2.1} />
      )}
      {Array.from({ length: aura.orbitRings || 0 }, (_, i) => (
        <OrbitRing key={i} index={i} color={aura.color} />
      ))}
      {light && <pointLight color={lightColor} intensity={6} distance={7} decay={1.6} position={[0, 1.2, 0]} />}
    </group>
  )
}

export default Aura
