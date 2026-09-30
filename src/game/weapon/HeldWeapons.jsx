import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'

import Particles from '../fx/Particles'
import { buildWeapon } from './buildWeapon'

const FX = {
  ember: { shape: 'ember', a: '#ffdd55', b: '#ff2200' },
  frost: { shape: 'shard', a: '#ffffff', b: '#63d8ff' },
  spark: { shape: 'star', a: '#ffffff', b: '#ffe23a' },
  void: { shape: 'dot', a: '#d9a6ff', b: '#3a0070' },
  star: { shape: 'star', a: '#ffffff', b: '#ffcc33' },
  petal: { shape: 'petal', a: '#ffd6ec', b: '#ff5fae' },
  leaf: { shape: 'leaf', a: '#c8ff6b', b: '#1bd660' },
  rainbow: { shape: 'star', a: 'rainbow', b: '#ffffff' },
}

const _s = new Vector3()
const _h = new Vector3()
const _arm = new Vector3()
const _fwd = new Vector3()
const _right = new Vector3()
const _dir = new Vector3()
const _up = new Vector3(0, 1, 0)
const _yAxis = new Vector3(0, 1, 0)
const _q = new Quaternion()

function OneBlade({ spec, side, armsRef, facingRef, hostRef }) {
  const weapon = useMemo(() => buildWeapon(spec), [spec])
  useEffect(() => () => weapon.dispose(), [weapon])
  const group = useRef(null)
  const fx = FX[spec.fx]

  useFrame(({ clock }) => {
    const g = group.current
    const arms = armsRef.current
    const facing = facingRef.current
    if (!g || !arms || !facing || (hostRef && !hostRef.current?.visible)) {
      if (g) g.visible = false
      return
    }
    arms(side, _s, _h)
    g.visible = true
    // Held like a titan slayer: the blade sweeps forward from the fist, following
    // the arm's swing (arm hanging down -> blade pointing ahead).
    _arm.subVectors(_h, _s).normalize()
    _fwd.set(0, 0, 1).applyQuaternion(facing.getWorldQuaternion(_q))
    _right.crossVectors(_up, _fwd).normalize()
    _dir.crossVectors(_arm, _right).normalize()
    // Blades tip slightly outward, away from the body.
    _dir.addScaledVector(_right, side * 0.18).normalize()
    g.position.copy(_h)
    g.quaternion.setFromUnitVectors(_yAxis, _dir)
    weapon.update(clock.elapsedTime)
  })

  return (
    <group ref={group} visible={false}>
      <primitive object={weapon.root} />
      {fx && (
        <Particles
          pattern="rise"
          count={18}
          size={0.13}
          radius={0.12}
          height={weapon.length}
          speed={1.1}
          position={[0, 0.2, 0]}
          {...fx}
        />
      )}
    </group>
  )
}

/**
 * A blade in each hand. `armsRef.current(side, outShoulder, outHand)` fills world
 * positions for the model's arm (-1 left, +1 right); `facingRef` is the object
 * whose +Z is the character's forward. `hostRef` (optional) hides them with it.
 */
export function HeldWeapons({ spec, armsRef, facingRef, hostRef }) {
  return (
    <>
      <OneBlade spec={spec} side={-1} armsRef={armsRef} facingRef={facingRef} hostRef={hostRef} />
      <OneBlade spec={spec} side={1} armsRef={armsRef} facingRef={facingRef} hostRef={hostRef} />
    </>
  )
}

export default HeldWeapons
