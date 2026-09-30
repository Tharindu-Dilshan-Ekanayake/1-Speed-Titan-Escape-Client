import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useEffect, useMemo } from 'react'

import { HEROES, RARITIES } from '../../config/heroes'
import { HERO_TIERS, heroSlot } from '../../config/layout'
import { heroLockReason, useProgress } from '../../state/progressStore'
import { glowMaterial, groundRingMaterial, mergeBoxes, surfaceMaterial } from '../fx/materials'
import { TextSprite } from '../fx/Text'
import HeroModel from '../hero/HeroModel'

const Z_SPAN = [-19, 19]

function Tiers() {
  const { tile, wood } = useMemo(() => {
    const tops = []
    const sides = []
    for (const t of HERO_TIERS) {
      const cx = (t.minX + t.maxX) / 2
      const cz = (Z_SPAN[0] + Z_SPAN[1]) / 2
      const w = t.maxX - t.minX
      const d = Z_SPAN[1] - Z_SPAN[0]
      tops.push({ c: [cx, t.top - 0.1, cz], s: [w, 0.2, d] })
      sides.push({ c: [cx, (t.top - 0.2) / 2, cz], s: [w, t.top - 0.2, d] })
    }
    return { tile: mergeBoxes(tops), wood: mergeBoxes(sides) }
  }, [])
  useEffect(() => () => [tile, wood].forEach((g) => g.dispose()), [tile, wood])

  return (
    <>
      <RigidBody type="fixed" colliders={false}>
        {HERO_TIERS.map((t, i) => (
          <CuboidCollider
            key={i}
            position={[(t.minX + t.maxX) / 2, t.top / 2, 0]}
            args={[(t.maxX - t.minX) / 2, t.top / 2, (Z_SPAN[1] - Z_SPAN[0]) / 2]}
          />
        ))}
      </RigidBody>
      <mesh geometry={tile} material={surfaceMaterial('tile')} receiveShadow />
      <mesh geometry={wood} material={surfaceMaterial('wood')} receiveShadow />
    </>
  )
}

function Statue({ def, index }) {
  const slot = heroSlot(index)
  const rarity = RARITIES[def.rarity]
  const owned = useProgress((s) => s.ownedHeroes.includes(def.id))
  const equipped = useProgress((s) => s.equipped === def.id)
  const lock = useProgress((s) => heroLockReason(def, s))
  const pedestal = useMemo(() => glowMaterial(rarity.color, 1.6), [rarity.color])
  const ring = useMemo(() => groundRingMaterial(rarity.color), [rarity.color])
  useEffect(() => () => [pedestal, ring].forEach((m) => m.dispose()), [pedestal, ring])

  const status = equipped ? 'EQUIPPED' : owned ? 'OWNED' : lock ? `🔒 ${lock}` : `${def.price.toLocaleString()} Wins`

  return (
    <group position={[slot.x, slot.y, slot.z]}>
      <mesh material={pedestal} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.95, 1.05, 0.12, 28]} />
      </mesh>
      <mesh material={ring} rotation={[-Math.PI / 2, 0, 0]} position={[-1.6, 0.02, 0]}>
        <planeGeometry args={[2.4, 2.4]} />
      </mesh>
      <HeroModel def={def} rotation={[0, -Math.PI / 2, 0]} position={[0, 0.12, 0]} auraStrength={0.8} />
      <TextSprite text={def.name} height={0.46} position={[0, 3.95, 0]} opts={{ fill: ['#ffffff', rarity.glow], size: 80 }} />
      <TextSprite text={rarity.label.toUpperCase()} height={0.3} position={[0, 3.55, 0]} opts={{ fill: rarity.color, size: 64 }} />
      <TextSprite
        text={status}
        height={0.38}
        position={[0, 3.15, 0]}
        opts={{
          fill: equipped ? '#6bff8f' : owned ? '#a8e6ff' : lock ? '#ff8f8f' : ['#fff6a8', '#ffc21a'],
          size: 72,
        }}
      />
    </group>
  )
}

export function HeroHall() {
  return (
    <group>
      <Tiers />
      {HEROES.map((def, i) => (
        <Statue key={def.id} def={def} index={i} />
      ))}
    </group>
  )
}

export default HeroHall
