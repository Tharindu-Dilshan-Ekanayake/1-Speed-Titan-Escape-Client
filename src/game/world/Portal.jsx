import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'

import { useProgress } from '../../state/progressStore'
import { portalMaterial } from '../fx/materials'
import Particles from '../fx/Particles'
import { TextPlane } from '../fx/Text'

/** Deterministic ring of floating ice cubes around the swirl. */
const CUBES = Array.from({ length: 22 }, (_, i) => {
  const a = (i / 22) * Math.PI * 2
  const r = 3.1 + ((i * 37) % 7) / 10
  return { a, r, s: 0.35 + ((i * 53) % 5) / 10, spin: ((i * 17) % 10) / 10 }
})

/**
 * Swirling portal. `to` = the world it leads to; World 2's portal shows a lock until
 * unlocked (the walk-in trigger then opens the unlock panel instead).
 */
export function Portal({ position, to, label, color = '#3fa8ff' }) {
  const unlocked = useProgress((s) => to === 1 || Boolean(s.world2))
  const swirl = useMemo(() => portalMaterial(unlocked ? color : '#5a5f7a', '#ffffff'), [unlocked, color])
  useEffect(() => () => swirl.dispose(), [swirl])
  const ringRef = useRef(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (!ringRef.current) return
    ringRef.current.children.forEach((cube, i) => {
      const c = CUBES[i]
      const a = c.a + t * 0.25
      cube.position.set(Math.cos(a) * c.r, Math.sin(a) * c.r + Math.sin(t * 2 + i) * 0.12, Math.sin(t + i) * 0.2)
      cube.rotation.set(t * c.spin, t * c.spin * 1.3, 0)
    })
  })

  return (
    <group position={position}>
      <group position={[0, 3.6, 0]}>
        <mesh material={swirl}>
          <circleGeometry args={[2.9, 48]} />
        </mesh>
        <group ref={ringRef}>
          {CUBES.map((c, i) => (
            <mesh key={i} castShadow>
              <boxGeometry args={[c.s, c.s, c.s]} />
              <meshStandardMaterial color="#8fb8ff" emissive="#2f62ff" emissiveIntensity={0.35} roughness={0.2} transparent opacity={0.9} />
            </mesh>
          ))}
        </group>
        <Particles pattern="orbit" shape="shard" count={30} size={0.25} a="#ffffff" b={color} radius={2.6} height={0.1} speed={0.6} position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
      <TextPlane
        text={unlocked ? label : `🔒 ${label}`}
        height={1.5}
        position={[0, 7.6, 0]}
        opts={{ fill: ['#fff7b0', '#ffc21a'], size: 110, font: '"Luckiest Guy", Fredoka, sans-serif', weight: 400 }}
      />
    </group>
  )
}

export default Portal
