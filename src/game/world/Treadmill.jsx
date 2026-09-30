import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'

import { TREADMILL_LENGTH as L, TREADMILL_TOP, TREADMILL_WIDTH as W } from '../../config/layout'
import { treadmillUnlocked } from '../../config/treadmills'
import { useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import Lightning from '../fx/Lightning'
import { beltMaterial, flameMaterial, glowMaterial, groundRingMaterial } from '../fx/materials'
import Particles from '../fx/Particles'
import { TextPlane, TextSprite } from '../fx/Text'

/** Per-tier effect stacks. Everything runs off shaders except the lightning arcs. */
function TreadmillFx({ fx, color }) {
  const flames = useMemo(() => {
    const palette = {
      fire: ['#ff3b1f', '#ffe14a'],
      void: ['#8a2dff', '#ff6bf2'],
      toxic: ['#1bd660', '#e8ff5a'],
      cosmic: ['rainbow', '#fff3b0'],
    }[fx]
    return palette ? flameMaterial(palette[0], palette[1]) : null
  }, [fx])
  const ring = useMemo(() => (fx === 'void' || fx === 'cosmic' ? groundRingMaterial(fx === 'cosmic' ? 'rainbow' : color, true) : null), [fx, color])
  useEffect(() => () => [flames, ring].forEach((m) => m?.dispose()), [flames, ring])

  const particle = {
    sparkle: { shape: 'star', a: '#ffffff', b: color, count: 40, size: 0.2 },
    fire: { shape: 'ember', a: '#ffe14a', b: '#ff2200', count: 70, size: 0.2 },
    electric: { shape: 'star', a: '#ffffff', b: '#ffd21f', count: 50, size: 0.18 },
    void: { shape: 'dot', a: '#d9a6ff', b: '#3a0070', count: 70, size: 0.28 },
    toxic: { shape: 'dot', a: '#d6ff6b', b: '#0e8f3c', count: 70, size: 0.24 },
    plasma: { shape: 'star', a: '#ffffff', b: '#2f6bff', count: 60, size: 0.2 },
    cosmic: { shape: 'star', a: 'rainbow', b: '#ffffff', count: 110, size: 0.22 },
  }[fx]

  return (
    <group position={[0, TREADMILL_TOP, 0]}>
      {particle && (
        <Particles
          pattern="line"
          length={L}
          radius={W / 2}
          height={fx === 'fire' || fx === 'cosmic' ? 3 : 2.4}
          speed={fx === 'plasma' || fx === 'electric' ? 1.3 : 0.8}
          {...particle}
        />
      )}
      {flames &&
        [-1, 1].map((s) => (
          <mesh key={s} material={flames} position={[0, 0.7, s * (W / 2 + 0.1)]}>
            <planeGeometry args={[L, 1.6]} />
          </mesh>
        ))}
      {ring && (
        <mesh material={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={[L + 1.5, L + 1.5]} />
        </mesh>
      )}
      {(fx === 'electric' || fx === 'plasma' || fx === 'cosmic') && (
        <Lightning
          color={fx === 'electric' ? '#fff27a' : fx === 'plasma' ? '#8fb4ff' : '#ffd27a'}
          count={fx === 'plasma' ? 5 : 3}
          box={[L, 2.2, W]}
          width={3.5}
        />
      )}
    </group>
  )
}

export function Treadmill({ def, position }) {
  const unlocked = useProgress((s) => treadmillUnlocked(def, s))
  const active = useSession((s) => s.treadmillId === def.id)
  const belt = useMemo(() => beltMaterial(def.color), [def.color])
  const rail = useMemo(() => glowMaterial(def.color, 2.2), [def.color])
  useEffect(() => () => belt.dispose(), [belt])
  useEffect(() => () => rail.dispose(), [rail])

  const screenRef = useRef(null)
  useFrame(({ clock }) => {
    belt.uniforms.uActive.value = active ? 1.6 : unlocked ? 0.8 : 0.55
    if (screenRef.current) {
      const s = active ? 1 + Math.sin(clock.elapsedTime * 8) * 0.06 : 1
      screenRef.current.scale.setScalar(s)
    }
  })

  const multText = `x${def.mult}`
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[L / 2 + 0.2, TREADMILL_TOP / 2, W / 2 + 0.2]} position={[0, TREADMILL_TOP / 2, 0]} />
        <CuboidCollider args={[0.3, 1.1, W / 2]} position={[-L / 2 - 0.5, 1.1, 0]} />
      </RigidBody>

      {/* Frame + belt */}
      <mesh position={[0, TREADMILL_TOP / 2 - 0.01, 0]} receiveShadow castShadow>
        <boxGeometry args={[L + 0.4, TREADMILL_TOP, W + 0.4]} />
        <meshStandardMaterial color="#2b2d3d" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh material={belt} rotation={[-Math.PI / 2, 0, Math.PI]} position={[0, TREADMILL_TOP + 0.005, 0]}>
        <planeGeometry args={[L, W - 0.5]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={rail} position={[0, TREADMILL_TOP + 0.08, s * (W / 2 + 0.05)]}>
          <boxGeometry args={[L + 0.4, 0.12, 0.14]} />
        </mesh>
      ))}

      {/* Console at the wall end */}
      <mesh position={[-L / 2 - 0.5, 1.1, 0]} castShadow>
        <boxGeometry args={[0.6, 2.2, W]} />
        <meshStandardMaterial color="#353a52" roughness={0.45} metalness={0.3} />
      </mesh>
      <mesh material={rail} position={[-L / 2 - 0.18, 2.2, 0]}>
        <boxGeometry args={[0.06, 0.1, W]} />
      </mesh>
      <group ref={screenRef} position={[-L / 2 - 0.18, 1.45, 0]} rotation={[0, Math.PI / 2, 0]}>
        <TextPlane
          text={multText}
          height={1.1}
          glow={1.8}
          opts={{ fill: ['#ffffff', def.color], size: 110, bg: '#141522', border: def.color }}
        />
      </group>

      <TextSprite
        text={def.label}
        height={0.7}
        position={[0, unlocked ? 3.6 : 4.1, 0]}
        glow={1.4}
        opts={{ fill: ['#ffffff', def.color], size: 84 }}
      />
      {!unlocked && (
        <TextSprite
          text={`LOCKED · ${def.wins} Wins${def.rebirths ? ` + R${def.rebirths}` : ''}`}
          height={0.5}
          position={[0, 3.45, 0]}
          opts={{ fill: ['#ffffff', '#ff7a7a'], size: 72 }}
        />
      )}

      {/* Locked or not, every treadmill shows off its effects - that's what you train for. */}
      {def.fx !== 'basic' && <TreadmillFx fx={def.fx} color={def.color} />}
    </group>
  )
}

export default Treadmill
