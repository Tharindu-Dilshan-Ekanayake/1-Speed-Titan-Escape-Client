import { useFrame } from '@react-three/fiber'
import { memo, Suspense, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'

import { HERO_BY_ID } from '../../config/heroes'
import { weaponFor } from '../../config/weapons'
import { INTERP_DELAY_MS, remoteFx, remotePoses, useNet } from '../../net/net'
import { FLIP_S, flipAngle } from '../flip'
import Particles from '../fx/Particles'
import { TextSprite } from '../fx/Text'
import HeroModel from '../hero/HeroModel'
import { playerState } from '../playerState'
import PlayerAvatar from '../PlayerAvatar'
import HeldWeapons from '../weapon/HeldWeapons'

const PLAYER_HEIGHT = 1.8
const VIEW_DISTANCE = 240
const _up = new Vector3(0, 1, 0)
const _q = new Quaternion()

const FX_COLORS = { win: '#ffd21f', levelup: '#6bff8f', rebirth: '#ff5f7a', death: '#ff3b1f' }

function lerpAngle(a, b, t) {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

/** One other player: interpolated between the two snapshots around (now - delay). */
const RemotePlayer = memo(function RemotePlayer({ id, profile }) {
  const root = useRef(null)
  const facing = useRef(null)
  const flip = useRef(null)
  const flipT = useRef(0)
  const burst = useRef(null)
  const armsRef = useRef(null)
  // `time` drives the Bloxity rig's walk cycle; it has to tick or the limbs freeze.
  const motionRef = useRef({ time: 0, speed: 0, maxSpeed: 8, grounded: true, grappling: false, sprint: false })
  const hero = HERO_BY_ID[profile.hero]
  const weapon = weaponFor(profile.hero, profile.weapon)
  const fxColor = useRef('#ffd21f')

  useFrame((_state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1)
    const g = root.current
    const buf = remotePoses.get(id)
    if (!g) return
    if (!buf?.length) {
      g.visible = false
      return
    }
    const renderT = performance.now() - INTERP_DELAY_MS
    let a = buf[0]
    let b = buf[buf.length - 1]
    for (let i = buf.length - 1; i > 0; i -= 1) {
      if (buf[i - 1].t <= renderT) {
        a = buf[i - 1]
        b = buf[i]
        break
      }
    }
    const span = Math.max(1, b.t - a.t)
    const k = Math.min(1, Math.max(0, (renderT - a.t) / span))
    const x = a.x + (b.x - a.x) * k
    const y = a.y + (b.y - a.y) * k
    const z = a.z + (b.z - a.z) * k
    const near =
      b.world === playerState.world && Math.abs(x - playerState.pos.x) + Math.abs(z - playerState.pos.z) < VIEW_DISTANCE
    g.visible = near
    if (!near) return
    g.position.set(x, y, z)
    facing.current.quaternion.copy(_q.setFromAxisAngle(_up, lerpAngle(a.yaw, b.yaw, k)))
    const m = motionRef.current
    m.time += dt
    m.grounded = Boolean(b.flags & 1) || Boolean(b.flags & 16)
    m.grappling = Boolean(b.flags & 2)
    m.sprint = Boolean(b.flags & 4)
    const afk = Boolean(b.flags & 8)
    m.speed = afk ? 8 : a.speed + (b.speed - a.speed) * k
    // Same ratio the owner sees: their pose speed against a typical walkspeed.
    m.maxSpeed = Math.max(6, m.speed)

    // Double jump flip: starts when the flag appears, then plays out locally.
    const flipping = Boolean(b.flags & 32)
    if (flipping && flipT.current === 0) flipT.current = 0.001
    if (flipT.current > 0) {
      flipT.current += dt / FLIP_S
      if (flipT.current >= 1) flipT.current = flipping ? 1 : 0
    }
    if (!flipping && flipT.current >= 1) flipT.current = 0
    if (flip.current) flip.current.rotation.x = flipT.current > 0 && flipT.current < 1 ? flipAngle(flipT.current) : 0

    const fx = remoteFx.get(id)
    const age = fx ? performance.now() - fx.t : 1e9
    if (burst.current) {
      burst.current.visible = age < 1400
      if (fx) fxColor.current = FX_COLORS[fx.k] || '#ffffff'
    }
  })

  return (
    <>
    <group ref={root} visible={false}>
      <group ref={facing}>
        <group ref={flip} position={[0, PLAYER_HEIGHT / 2, 0]}>
        <group position={[0, -PLAYER_HEIGHT / 2, 0]}>
        {hero ? (
          <HeroModel def={hero} motionRef={motionRef} armsRef={armsRef} auraStrength={0.8} />
        ) : (
          <Suspense fallback={null}>
            <PlayerAvatar
              remote
              equipped={profile.avatar?.equipped || null}
              proportions={profile.avatar?.proportions}
              targetHeight={PLAYER_HEIGHT}
              motionRef={motionRef}
              armsRef={armsRef}
            />
          </Suspense>
        )}
        </group>
        </group>
      </group>
      <TextSprite
        text={profile.name || 'Player'}
        height={0.42}
        position={[0, 2.55, 0]}
        opts={{ fill: '#ffffff', size: 72 }}
      />
      <TextSprite
        text={`Lv ${profile.level || 1}${profile.rebirths ? ` · R${profile.rebirths}` : ''}`}
        height={0.3}
        position={[0, 2.2, 0]}
        opts={{ fill: ['#fff6a8', '#ffc21a'], size: 60 }}
      />
      <group ref={burst} visible={false}>
        <Particles pattern="rise" shape="star" count={40} size={0.25} a="#ffffff" b="#ffd21f" radius={0.8} height={3} speed={1.8} />
      </group>
    </group>
    {/* Outside the moving group: blades are placed in world space from the arms. */}
    <HeldWeapons spec={weapon} armsRef={armsRef} facingRef={facing} hostRef={root} />
    </>
  )
})

/** Everyone else in this lobby. */
export function RemotePlayers() {
  const players = useNet((s) => s.players)
  const selfId = useNet((s) => s.selfId)
  return Object.values(players)
    .filter((p) => p.id && p.id !== selfId)
    .map((p) => <RemotePlayer key={p.id} id={p.id} profile={p} />)
}

export default RemotePlayers
