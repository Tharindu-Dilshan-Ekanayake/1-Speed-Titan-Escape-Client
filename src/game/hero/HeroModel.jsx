import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'

import Aura from './Aura'
import { buildHero } from './buildHero'

const idleMotion = { speed: 0, maxSpeed: 6, grounded: true, grappling: false }

/**
 * A hero model plus its aura. `motionRef` (from the player controller) drives the
 * pose; statues and previews pass nothing and idle.
 *
 * @param {{ def: object, motionRef?: React.MutableRefObject<object>, light?: boolean,
 *   aura?: boolean, auraStrength?: number, onReady?: () => void }} props
 */
export function HeroModel({ def, motionRef, light = false, aura = true, auraStrength = 1, onReady, armsRef, ...props }) {
  const hero = useMemo(() => buildHero(def), [def])
  useEffect(() => {
    if (!armsRef) return undefined
    armsRef.current = hero.arm
    return () => {
      if (armsRef.current === hero.arm) armsRef.current = null
    }
  }, [hero, armsRef])

  useEffect(() => () => hero.dispose(), [hero])
  useEffect(() => {
    onReady?.()
  }, [hero, onReady])

  useFrame(({ clock }, delta) => {
    hero.update(motionRef?.current ?? idleMotion, clock.elapsedTime, Math.min(delta, 0.1))
  })

  return (
    <group {...props}>
      <primitive object={hero.root} />
      {aura && def.aura && <Aura aura={def.aura} light={light} strength={auraStrength} />}
    </group>
  )
}

export default HeroModel
