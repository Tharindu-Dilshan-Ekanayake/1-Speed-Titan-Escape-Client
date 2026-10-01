import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import { Suspense, useRef } from 'react'
import { Quaternion, Vector3 } from 'three'

import { HERO_BY_ID } from '../config/heroes'
import { SPAWNS, WORLD2_OFFSET_X } from '../config/layout'
import { JUMP_VELOCITY, STUD } from '../config/progression'
import {
  collapseTriggers,
  crusherState,
  geyserState,
  laserAngle,
  pendulumAngle,
  pendulumDir,
  rollerZ,
  tideHeight,
  windGust,
} from '../config/dynamics'
import { FLOOR_KINDS } from '../config/biomes'
import { ALL_HOOKS, DEEP_KILL_Y, SWIM_SPEED, WATER_BREATH_S, floorAt, GATE_WALL_HALF, KILL_Y, STAGES, stageAt, VOID_KILL_Y } from '../config/stages'
import { TREADMILL_BY_ID, treadmillUnlocked } from '../config/treadmills'
import {
  currentWalkspeed,
  maxJumps,
  stepAmount,
  useProgress,
} from '../state/progressStore'
import { useSession } from '../state/sessionStore'
import { sound } from '../audio/sound'
import { weaponFor } from '../config/weapons'
import { publishPose, sendFx } from '../net/net'
import HeroModel from './hero/HeroModel'
import { FLIP_S, flipAngle } from './flip'
import { bodyTags, bounceHits, playerState } from './playerState'
import PlayerAvatar from './PlayerAvatar'
import { insideTrigger, TRIGGERS } from './triggers'
import useKeyboard from './useKeyboard'
import HeldWeapons from './weapon/HeldWeapons'

// Capsule roughly matching the humanoid. Rapier's capsule args are the half-height of
// the *cylindrical* section plus the radius, so total height = 2*(halfHeight+radius).
const CAPSULE_RADIUS = 0.35
const CAPSULE_HALF_HEIGHT = 0.55
const PLAYER_HEIGHT = 2 * (CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS)
const HALF = PLAYER_HEIGHT / 2

/** Extra ray length past the capsule bottom; tolerates small ground gaps. */
const GROUND_RAY_SLACK = 0.12
/** Grace period after walking off a ledge in which a ground jump still counts. */
const COYOTE_S = 0.12
const GRAPPLE_RANGE = 13
const GRAPPLE_SPEED = 22
/** Max distance past the hook the swing carries you before letting go. */
const GRAPPLE_EXIT = 7.5
const GRAPPLE_MIN_EXIT = 5
/** Forward fling (u/s) when the swing lets go. */
const GRAPPLE_RELEASE = 9
/** Walkspeed (u/s) above which heroes switch to the arms-back anime sprint. */
const SPRINT_ANIM_SPEED = 8.5
/** Steps per second while AFK on a treadmill. */
const TREADMILL_STEP_RATE = 3.2
/** Sweepers and pendulum blades shove you instead of killing you. */
const KNOCK_SPEED = 14
const KNOCK_UP = 7
const STUN_S = 0.45

// Scratch objects, reused each frame so the loop allocates nothing.
const _input = new Vector3()
const _move = new Vector3()
const _camForward = new Vector3()
const _camRight = new Vector3()
const _targetQuat = new Quaternion()
const _up = new Vector3(0, 1, 0)
const _a = new Vector3()
const _b = new Vector3()
const _c = new Vector3()
const _p = new Vector3()
const _q = new Vector3()
const _gv = { x: 0, z: 0 }
const _f = new Vector3()
const _pose = [0, 0, 0, 0, 0, 0, 1, 0]
const _knock = { x: 0, z: 0 }
const KILL = 'kill'

/**
 * Tests the player against the current stage's timed obstacles, using the same
 * timing functions the renderers draw from.
 * @returns {null | 'kill' | {x: number, z: number}} nothing, death, or a knockback direction
 */
function checkHazards(stage, pos, feetY, time) {
  for (const l of stage.lasers) {
    const dx = pos.x - l.c[0]
    const dz = pos.z - l.c[2]
    if (Math.abs(dz) > l.r + 1 || Math.abs(dx) > l.r + 1) continue
    if (Math.abs(pos.y - l.c[1]) > HALF + 0.05) continue
    const a = laserAngle(l, time)
    const ux = Math.cos(a)
    const uz = Math.sin(a)
    const along = Math.max(-l.r, Math.min(l.r, dx * ux + dz * uz))
    if (Math.hypot(dx - along * ux, dz - along * uz) < CAPSULE_RADIUS + 0.1) return KILL
  }
  for (const c of stage.crushers) {
    if (Math.abs(pos.x - c.c[0]) > c.hx + 0.25 || Math.abs(pos.z - c.c[2]) > c.hz + 0.25) continue
    const { bottom } = crusherState(c, time)
    if (bottom < feetY + 1.75 && bottom > feetY - 0.4) return KILL
  }
  for (const g of stage.geysers) {
    if (Math.hypot(pos.x - g.c[0], pos.z - g.c[2]) > g.r + 0.2) continue
    const gs = geyserState(g, time)
    if (gs.phase === 2 && gs.k > 0.25 && feetY < g.h * gs.k) return KILL
  }
  for (const p of stage.pendulums) {
    if (Math.abs(pos.z - p.pivot[2]) > 0.75) continue
    const a = pendulumAngle(p, time)
    const bx = p.pivot[0] + Math.sin(a) * p.L
    const by = p.pivot[1] - Math.cos(a) * p.L - 0.9
    if (Math.abs(pos.x - bx) < 1.7 && Math.abs(pos.y - by) < 1.9) {
      _knock.x = pendulumDir(p, time)
      _knock.z = 0
      return _knock
    }
  }
  for (const sw of stage.sweepers) {
    if (feetY > sw.y1 || feetY < sw.y0 - 1.8) continue
    const dx = pos.x - sw.c[0]
    const dz = pos.z - sw.c[2]
    if (Math.abs(dx) > sw.r + 1 || Math.abs(dz) > sw.r + 1) continue
    const a = laserAngle(sw, time)
    const ux = Math.cos(a)
    const uz = Math.sin(a)
    const along = Math.max(-sw.r, Math.min(sw.r, dx * ux + dz * uz))
    if (Math.hypot(dx - along * ux, dz - along * uz) < CAPSULE_RADIUS + 0.3) {
      // Shoved along the bar's direction of travel at that point.
      const dir = Math.sign(sw.w * along) || 1
      _knock.x = -uz * dir
      _knock.z = ux * dir
      return _knock
    }
  }
  for (const r of stage.rollers) {
    const rz = rollerZ(r, time)
    if (Math.hypot(pos.x - r.x, pos.y - r.y, pos.z - rz) < r.r + CAPSULE_RADIUS + 0.2) {
      // Bowled back down the ramp.
      _knock.x = Math.sign(pos.x - r.x) * 0.35
      _knock.z = 1
      return _knock
    }
  }
  return null
}

function bezier(out, p0, c, p1, t) {
  const u = 1 - t
  return out
    .copy(p0)
    .multiplyScalar(u * u)
    .addScaledVector(c, 2 * u * t)
    .addScaledVector(p1, t * t)
}

const hubSpawn = (world) => (world === 2 ? SPAWNS.world2 : SPAWNS.lobby)

/**
 * The player: a dynamic Rapier capsule wearing either the Bloxity avatar or an anime
 * hero. Owns all moment-to-moment gameplay: movement at the level's walkspeed,
 * double jump, grappling, swimming, steps -> Speed, treadmills, win pads, lava
 * (still and tidal), obstacle hits and the special floors (conveyors, spinning
 * discs, ice, launch pads, crumbling tiles).
 */
export function Player({ onAvatarReady, bodyRef: externalBodyRef }) {
  const localBodyRef = useRef(null)
  const bodyRef = externalBodyRef || localBodyRef
  const visualRef = useRef(null)
  const flipRef = useRef(null)
  const armsRef = useRef(null)
  const ropeRef = useRef(null)
  const keys = useKeyboard()
  const { rapier, world } = useRapier()

  const equipped = useProgress((s) => s.equipped)
  const weaponId = useProgress((s) => s.weapon)
  const heroDef = HERO_BY_ID[equipped]
  const weapon = weaponFor(equipped, weaponId)

  /** Pose inputs for whichever model is worn. Written every frame, never state. */
  const motionRef = useRef({
    time: 0,
    speed: 0,
    grounded: true,
    maxSpeed: 6,
    sprint: false,
    grappling: false,
  })

  const st = useRef({
    jumpsUsed: 0,
    coyote: 0,
    stepAcc: 0,
    grapple: null,
    boost: new Vector3(),
    stun: 0,
    knockVy: 0,
    waterJump: 0,
    waterTime: 0,
    wasInWater: false,
    inside: new Set(),
    deathPos: null,
    lastStage: 0,
    lastLocation: '',
    flipT: 0,
    stride: 0,
  })

  const castDown = (body) => {
    const pos = body.translation()
    const ray = new rapier.Ray({ x: pos.x, y: pos.y, z: pos.z }, { x: 0, y: -1, z: 0 })
    const maxDistance = HALF + GROUND_RAY_SLACK
    const hit = world.castRay(ray, maxDistance, true, undefined, undefined, undefined, body)
    return hit && hit.timeOfImpact <= maxDistance ? hit : null
  }

  const die = (s, session, progress, msg = 'Burned by lava!') => {
    if (session.dead) return
    const w = playerState.world
    const stage = stageAt(w, playerState.pos.z)
    s.deathPos = playerState.pos.clone()
    s.deathPos.y = Math.max(s.deathPos.y, KILL_Y - 0.2)
    s.grapple = null
    progress.recordDeath()
    sound.play('death', 0.5)
    sendFx('death')
    session.setDead({ world: w, stage, at: Date.now(), msg })
  }

  const onEnter = (t, session, progress) => {
    switch (t.kind) {
      case 'pad': {
        if (t.pad.kind === 'double' && !progress.upgrades.wins2x) {
          session.toast('Locked! Buy 2x Wins (300 Wins) in the shop', '#ff6b6b', 'lock')
          break
        }
        const amount = progress.claimPad(t.pad)
        session.flashWin(amount)
        session.toast(`+${amount} Wins!`, t.pad.kind === 'double' ? '#ff5fe0' : '#ffd43a', 'trophy')
        const spawn = hubSpawn(t.pad.world)
        session.requestTeleport(spawn.pos, spawn.yaw)
        break
      }
      case 'treadmill': {
        const tm = TREADMILL_BY_ID[t.treadmillId]
        if (treadmillUnlocked(tm, progress)) {
          session.setTreadmill(tm.id)
        } else {
          const need = [
            tm.wins > progress.totalWins ? `${tm.wins} total Wins` : null,
            tm.rebirths > progress.rebirths ? `Rebirth ${tm.rebirths}` : null,
          ].filter(Boolean)
          session.toast(`Locked! Needs ${need.join(' + ')}`, '#ff6b6b', 'lock')
        }
        break
      }
      case 'hero':
        if (!session.panel) session.openPanel('heroes', { focus: t.heroId })
        break
      case 'portal':
        if (t.to === 2) {
          if (progress.world2) {
            session.requestTeleport(SPAWNS.world2.pos, SPAWNS.world2.yaw)
            session.showBanner('WORLD 2', 'The Frozen Void')
          } else if (!session.panel) {
            session.openPanel('world2')
          }
        } else {
          session.requestTeleport(SPAWNS.lobby.pos, SPAWNS.lobby.yaw)
          session.showBanner('WORLD 1', 'Titan Castle')
        }
        break
      default:
        break
    }
  }

  const onExit = (t, session) => {
    if (t.kind === 'treadmill' && session.treadmillId === t.treadmillId) session.setTreadmill(null)
  }

  useFrame((state, rawDelta) => {
    const body = bodyRef.current
    if (!body) return
    const dt = Math.min(rawDelta, 1 / 20)
    const time = state.clock.elapsedTime
    const s = st.current
    const k = keys.current
    const session = useSession.getState()
    const progress = useProgress.getState()
    const motion = motionRef.current
    motion.time += dt

    // --- Teleport requests ---------------------------------------------------------
    if (session.teleport) {
      const { pos, yaw } = session.teleport
      body.setTranslation({ x: pos[0], y: pos[1] + HALF + 0.05, z: pos[2] }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      s.grapple = null
      s.boost.set(0, 0, 0)
      s.stun = 0
      s.waterTime = 0
      s.knockVy = 0
      s.jumpsUsed = 0
      s.lastStage = 0
      if (visualRef.current) visualRef.current.quaternion.setFromAxisAngle(_up, Math.PI + yaw)
      session.clearTeleport()
      session.snapCamera(yaw)
      return
    }

    const pos = body.translation()
    playerState.pos.set(pos.x, pos.y - HALF, pos.z)
    playerState.world = pos.x > WORLD2_OFFSET_X / 2 ? 2 : 1
    const w = playerState.world

    // --- Dead: hold still until the revive prompt resolves -------------------------
    if (session.dead) {
      if (s.deathPos) body.setTranslation({ x: s.deathPos.x, y: s.deathPos.y + HALF, z: s.deathPos.z }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      motion.speed = 0
      if (ropeRef.current) ropeRef.current.visible = false
      return
    }
    s.deathPos = null

    const feetY = pos.y - HALF
    s.stun = Math.max(0, s.stun - dt)
    s.waterJump = Math.max(0, s.waterJump - dt)

    // --- Where are we? ------------------------------------------------------------------
    const inCorridor = Math.abs(pos.x - (w === 2 ? WORLD2_OFFSET_X : 0)) < GATE_WALL_HALF
    const stage = inCorridor ? stageAt(w, pos.z) : 0
    const stageData = stage > 0 ? STAGES[w][stage - 1] : null
    session.setLocation(w, stage)
    if (stage > s.lastStage) {
      sound.play('gate', 0.5)
      session.showBanner(`STAGE ${stage}`, stageData.name)
      progress.reachStage(w, stage)
      // Ripple the gate barrier we just walked through.
      playerState.barrierHit = { key: stageData.key, t: time, x: pos.x, y: feetY + 0.9 }
    }
    if (stage !== s.lastStage) s.lastStage = stage

    // --- Floors: every biome has its own way to end you ------------------------------------
    let water = null
    let sand = null
    const floor = stageData ? floorAt(stageData, pos.z) : null
    const fk = floor ? FLOOR_KINDS[floor.kind] : FLOOR_KINDS.lava
    if (floor?.kind === 'water') {
      // In the water once the feet are ~0.6 under it; swimming holds you at 1.0 under,
      // so the body rides on top with only the legs submerged.
      if (feetY < floor.surface - 0.6) water = floor
    } else if (floor?.kind === 'tide') {
      if (feetY < tideHeight(floor, time) - 0.02) {
        die(s, session, progress, fk.msg)
        return
      }
    } else if (fk.death === 'sink') {
      if (feetY < floor.surface - 0.1) sand = floor
      if (feetY < floor.surface - 2.1) {
        die(s, session, progress, fk.msg)
        return
      }
    } else if (fk.death === 'deep') {
      if (feetY < DEEP_KILL_Y) {
        die(s, session, progress, fk.msg)
        return
      }
    } else if (fk.death === 'fall') {
      if (feetY < VOID_KILL_Y) {
        die(s, session, progress, fk.msg)
        return
      }
    } else if (feetY < KILL_Y) {
      die(s, session, progress, fk.msg)
      return
    }
    if (feetY < -24) {
      die(s, session, progress, 'Fell off the world!')
      return
    }

    // --- Obstacles -----------------------------------------------------------------------------
    if (stageData) {
      const hazard = checkHazards(stageData, pos, feetY, time)
      if (hazard === KILL) {
        die(s, session, progress, 'Obliterated!')
        return
      }
      if (hazard && s.stun <= 0) {
        sound.play('hit', 0.3)
        s.boost.set(hazard.x * KNOCK_SPEED, 0, hazard.z * KNOCK_SPEED)
        s.knockVy = KNOCK_UP
        s.stun = STUN_S
        s.grapple = null
      }
    }

    // --- Ground ------------------------------------------------------------------------
    const hit = castDown(body)
    const linvel = body.linvel()
    const grounded = Boolean(hit) && linvel.y < 3
    const tag = hit ? bodyTags.get(hit.collider.parent()?.handle) : null
    let groundVel = null
    let slippery = false
    let bounce = 0
    if (grounded && tag) {
      switch (tag.kind) {
        case 'mover':
          groundVel = tag.vel
          break
        case 'disc':
          // Tangential velocity of the point we're standing on.
          _gv.x = tag.w * (pos.z - tag.cz)
          _gv.z = -tag.w * (pos.x - tag.cx)
          groundVel = _gv
          break
        case 'conveyor':
          groundVel = tag.v
          break
        case 'collapse':
          if (!collapseTriggers.has(tag.id)) {
            collapseTriggers.set(tag.id, time)
            sound.play('crumble', 0.2)
          }
          break
        case 'bounce':
          if (linvel.y < 1) {
            bounce = tag.v
            bounceHits.set(tag.id, time)
          }
          break
        case 'ice':
          slippery = true
          break
        default:
          break
      }
    }
    if (grounded) {
      s.jumpsUsed = 0
      s.coyote = COYOTE_S
    } else {
      s.coyote -= dt
    }

    // --- Horizontal input, camera relative -----------------------------------------------
    if (k.joyX || k.joyY) _input.set(k.joyX, 0, k.joyY)
    // A / D turn the camera (see FollowCamera) rather than strafing; W / S move.
    else _input.set(0, 0, (k.backward ? 1 : 0) - (k.forward ? 1 : 0))
    const hasInput = _input.lengthSq() > 0.01
    const walkSpeed = currentWalkspeed(progress) * STUD
    let hx = 0
    let hz = 0

    if (hasInput && !s.grapple && s.stun <= 0) {
      // Analog sticks walk slower when pushed partway; keys are always full speed.
      const throttle = Math.min(1, _input.length())
      _input.normalize().multiplyScalar(throttle)
      state.camera.getWorldDirection(_camForward)
      _camForward.y = 0
      _camForward.normalize()
      _camRight.crossVectors(_camForward, _up).normalize()
      _move
        .set(0, 0, 0)
        .addScaledVector(_camForward, -_input.z)
        .addScaledVector(_camRight, _input.x)
      hx = _move.x * walkSpeed
      hz = _move.z * walkSpeed
      _move.normalize()
      if (visualRef.current) {
        _targetQuat.setFromAxisAngle(_up, Math.atan2(_move.x, _move.z))
        visualRef.current.quaternion.slerp(_targetQuat, 1 - Math.pow(0.0005, dt))
      }
    }
    if (water) {
      hx *= SWIM_SPEED
      hz *= SWIM_SPEED
    }
    if (sand) {
      hx *= 0.3
      hz *= 0.3
    }

    // --- Treadmill (AFK running) ----------------------------------------------------------
    const treadmill = session.treadmillId ? TREADMILL_BY_ID[session.treadmillId] : null
    const afk = Boolean(treadmill) && grounded && !hasInput
    if (afk && visualRef.current) {
      // Face the treadmill console (the wall, -X).
      _targetQuat.setFromAxisAngle(_up, -Math.PI / 2)
      visualRef.current.quaternion.slerp(_targetQuat, 1 - Math.pow(0.001, dt))
    }

    // --- Jump / double jump / swim -------------------------------------------------------------
    let vy = linvel.y
    const jumpLimit = maxJumps(progress)
    while (k.jumpPresses > 0) {
      k.jumpPresses -= 1
      if (s.grapple) {
        s.grapple = null
        s.grappleQueued = false
        vy = JUMP_VELOCITY
        s.jumpsUsed = 1
        sound.play('jump')
      } else if (water) {
        // Kick up out of the water when close enough to the surface (not once sinking).
        if (feetY > water.surface - 2.6 && s.waterTime <= WATER_BREATH_S) {
          vy = JUMP_VELOCITY * 1.12
          s.jumpsUsed = 1
          s.waterJump = 0.35
          sound.play('splash', 0.3)
        }
      } else if (s.jumpsUsed === 0 && (grounded || s.coyote > 0)) {
        vy = JUMP_VELOCITY
        s.jumpsUsed = 1
        s.coyote = 0
        sound.play('jump')
      } else if (s.jumpsUsed < jumpLimit) {
        vy = JUMP_VELOCITY
        s.jumpsUsed += 1
        s.flipT = 0.001
        sound.play('doublejump')
      }
    }
    if (bounce) {
      vy = bounce
      s.jumpsUsed = 1
      sound.play('bounce', 0.3)
    }
    // Landing thump after a real fall.
    if (grounded && !s.wasGrounded && s.fallVy < -9) sound.play('land', 0.15)
    s.wasGrounded = grounded
    s.fallVy = linvel.y
    if (sand) {
      // Sinking: one weak jump to scramble out, otherwise down you go.
      if (vy > 1 && s.sandJump) {
        vy = JUMP_VELOCITY * 0.8
        s.sandJump = false
      } else if (vy <= 1) {
        vy = -0.9
        s.jumpsUsed = 0
      }
    } else {
      s.sandJump = true
    }
    // Breath: you can swim for WATER_BREATH_S, then you go under and don't come back.
    s.waterTime = water ? s.waterTime + dt : Math.max(0, s.waterTime - dt * 2)
    playerState.air = Math.max(0, 1 - s.waterTime / WATER_BREATH_S)
    const sinking = water && s.waterTime > WATER_BREATH_S
    if (sinking) {
      vy += (-4 - vy) * (1 - Math.exp(-dt * 4))
      if (feetY < water.surface - 3.2) {
        die(s, session, progress, 'Drowned!')
        return
      }
    } else if (water && s.waterJump <= 0) {
      // Ride on the surface. Gravity is switched off below (buoyancy): with it on, the
      // pull (32 u/s^2) beats any smooth float force and you slowly sank to the bottom.
      // First-order settle onto the float level (no overshoot, whatever the frame rate).
      vy = Math.max(-4, Math.min(4.5, (water.surface - 1.0 - feetY) * Math.min(6, 0.7 / dt)))
      s.jumpsUsed = 0
    }
    const buoyant = Boolean(water) && !sinking && s.waterJump <= 0
    if (buoyant !== s.buoyant) {
      body.setGravityScale(buoyant ? 0 : 1, true)
      s.buoyant = buoyant
    }
    if (water && !s.wasInWater && linvel.y < -3) {
      playerState.splash = { t: time, x: pos.x, y: water.surface, z: pos.z }
      sound.play('splash', 0.3)
    }
    s.wasInWater = Boolean(water)
    if (s.knockVy) {
      vy = s.knockVy
      s.knockVy = 0
    }
    session.setJumpsLeft(jumpLimit - s.jumpsUsed)

    // --- Grapple -------------------------------------------------------------------------------
    let target = null
    s.lastHookCooldown = Math.max(0, (s.lastHookCooldown || 0) - dt)
    if (!s.grapple) {
      let best = GRAPPLE_RANGE
      for (const hook of ALL_HOOKS) {
        // Don't re-grab the hook we just swung from.
        if (hook.id === s.lastHook && s.lastHookCooldown > 0) continue
        const d = Math.hypot(hook.p[0] - pos.x, hook.p[1] - pos.y, hook.p[2] - pos.z)
        if (d < best) {
          best = d
          target = hook
        }
      }
    }
    session.setGrappleTarget(target?.id ?? null)

    while (k.grapplePresses > 0) {
      k.grapplePresses -= 1
      // Pressed mid-swing: buffer it and chain into the next hook on release.
      if (s.grapple) s.grappleQueued = true
      if (target && !s.grapple) {
        const p0 = new Vector3(pos.x, pos.y, pos.z)
        const h = new Vector3(...target.p)
        // Swing through and out the far side: mirrored across the hook, but never
        // further than GRAPPLE_EXIT past it, so a long-range grab can't overshoot
        // the landing platform.
        const p1y = Math.min(h.y - 1.5, Math.max(p0.y, h.y - 4.2) + 1.2)
        _a.set(h.x - p0.x, 0, h.z - p0.z)
        // Grabbed from (nearly) underneath: swing the way the character faces.
        if (_a.lengthSq() < 2.25 && visualRef.current) {
          _a.set(0, 0, 1).applyQuaternion(visualRef.current.quaternion).setY(0)
        }
        const reach = Math.min(Math.max(Math.hypot(h.x - p0.x, h.z - p0.z), GRAPPLE_MIN_EXIT), GRAPPLE_EXIT)
        _a.normalize()
        const p1 = new Vector3(h.x + _a.x * reach, p1y, h.z + _a.z * reach)
        const c = new Vector3(h.x, Math.min(p0.y, p1.y) - 0.2, h.z)
        const len = p0.distanceTo(p1) * 1.15
        s.grapple = { p0, p1, c, h, hookId: target.id, t: 0, dur: Math.min(1.3, Math.max(0.35, len / GRAPPLE_SPEED)) }
        sound.play('grapple')
        s.boost.set(0, 0, 0)
      }
    }

    // --- Wind ------------------------------------------------------------------------------------
    let windX = 0
    if (stageData) {
      for (const wz of stageData.winds) {
        if (pos.x > wz.x0 && pos.x < wz.x1 && pos.z < wz.zTop && pos.z > wz.zBot && feetY < wz.y1) {
          windX += wz.push * windGust(wz, time)
        }
      }
    }

    if (s.grapple) {
      const g = s.grapple
      const t1 = Math.min(1, g.t + dt / g.dur)
      bezier(_b, g.p0, g.c, g.p1, t1)
      const vx = (_b.x - pos.x) / dt
      const vyG = (_b.y - pos.y) / dt
      const vz = (_b.z - pos.z) / dt
      g.t = t1
      if (visualRef.current) {
        _targetQuat.setFromAxisAngle(_up, Math.atan2(g.p1.x - g.p0.x, g.p1.z - g.p0.z))
        visualRef.current.quaternion.slerp(_targetQuat, 1 - Math.pow(0.001, dt))
      }
      if (t1 >= 1) {
        // Fling out along the swing direction with a hop; a jump is refunded.
        bezier(_a, g.p0, g.c, g.p1, 0.94)
        _c.subVectors(_b, _a).setY(0).normalize()
        s.boost.set(_c.x * GRAPPLE_RELEASE, 0, _c.z * GRAPPLE_RELEASE)
        body.setLinvel({ x: s.boost.x, y: 6.5, z: s.boost.z }, true)
        s.grapple = null
        s.jumpsUsed = 1
        s.lastHook = g.hookId
        s.lastHookCooldown = 0.4
        if (s.grappleQueued) k.grapplePresses += 1
        s.grappleQueued = false
      } else {
        body.setLinvel({ x: vx, y: vyG, z: vz }, true)
      }
      if (ropeRef.current) {
        const rope = ropeRef.current
        _p.set(pos.x, pos.y + 0.45, pos.z)
        _q.fromArray(g.h.toArray())
        rope.visible = true
        rope.position.copy(_p).lerp(_q, 0.5)
        rope.scale.set(1, _p.distanceTo(_q), 1)
        rope.quaternion.setFromUnitVectors(_up, _c.subVectors(_q, _p).normalize())
      }
    } else {
      if (ropeRef.current) ropeRef.current.visible = false
      // Grapple fling / knockback momentum fades out on top of normal walking.
      const decay = s.stun > 0 ? (grounded ? 2.5 : 0.9) : grounded ? 8 : 2.2
      s.boost.multiplyScalar(Math.exp(-dt * decay))
      let fx = hx + s.boost.x + windX
      let fz = hz + s.boost.z + (water?.current || 0)
      if (groundVel) {
        fx += groundVel.x
        fz += groundVel.z
      }
      if (slippery) {
        // Ice: velocity only drifts toward what you ask for.
        const kIce = 1 - Math.exp(-dt * 2.2)
        fx = linvel.x + (fx - linvel.x) * kIce
        fz = linvel.z + (fz - linvel.z) * kIce
      }
      body.setLinvel({ x: fx, y: vy, z: fz }, true)
    }

    // --- Triggers -------------------------------------------------------------------------------
    for (const t of TRIGGERS) {
      const inside = insideTrigger(t, playerState.pos)
      const was = s.inside.has(t.id)
      if (inside && !was) {
        s.inside.add(t.id)
        onEnter(t, session, progress)
      } else if (!inside && was) {
        s.inside.delete(t.id)
        onExit(t, session)
      }
    }

    // --- Steps -> Speed ----------------------------------------------------------------------------
    const horizSpeed = Math.hypot(hx, hz)
    const walking = (grounded || water) && horizSpeed > 0.5
    if (walking || afk) {
      const rate = afk ? TREADMILL_STEP_RATE : Math.min(6, Math.max(2, horizSpeed / 2.4))
      s.stepAcc += dt * rate
      while (s.stepAcc >= 1) {
        s.stepAcc -= 1
        const amount = stepAmount(progress, treadmill ? treadmill.mult : 1)
        progress.addSpeed(amount, { fromStep: true })
        if (progress.settings.popups) session.popStep(amount)
      }
    }

    // --- Front flip on double jump ----------------------------------------------------------
    if (s.flipT > 0) {
      s.flipT += dt / FLIP_S
      if (s.flipT >= 1 || s.grapple || (grounded && s.flipT > 0.25)) s.flipT = 0
    }
    if (flipRef.current) flipRef.current.rotation.x = s.flipT > 0 ? flipAngle(s.flipT) : 0

    // --- Footsteps: one per footfall of the run cycle (the rig swings at the same rate) ----
    if ((grounded && horizSpeed > 0.5 && !water) || afk) {
      const ratio = afk ? 1 : Math.min(1, horizSpeed / Math.max(walkSpeed, 0.01))
      const before = Math.floor(s.stride / Math.PI)
      s.stride += dt * (5 + ratio * 5)
      if (Math.floor(s.stride / Math.PI) !== before) sound.play(horizSpeed > SPRINT_ANIM_SPEED ? 'run' : 'footstep', 0.12)
    } else {
      s.stride = 0
    }

    // --- Pose ---------------------------------------------------------------------------------------
    motion.grounded = (grounded && !(s.flipT > 0)) || Boolean(s.grapple) || Boolean(water)
    motion.grappling = Boolean(s.grapple)
    motion.speed = afk ? walkSpeed : horizSpeed
    motion.maxSpeed = Math.max(walkSpeed, 0.01)
    motion.sprint = motion.speed > SPRINT_ANIM_SPEED

    // --- Share the pose with the lobby ----------------------------------------------------------
    if (visualRef.current) {
      _f.set(0, 0, 1).applyQuaternion(visualRef.current.quaternion)
      const flags =
        (motion.grounded ? 1 : 0) | (s.grapple ? 2 : 0) | (motion.sprint ? 4 : 0) | (afk ? 8 : 0) | (water ? 16 : 0) | (s.flipT > 0 ? 32 : 0)
      _pose[0] = +pos.x.toFixed(2)
      _pose[1] = +feetY.toFixed(2)
      _pose[2] = +pos.z.toFixed(2)
      _pose[3] = +Math.atan2(_f.x, _f.z).toFixed(2)
      _pose[4] = +motion.speed.toFixed(1)
      _pose[5] = flags
      _pose[6] = w
      _pose[7] = stage
      publishPose(_pose)
    }
  })

  return (
    <>
      <RigidBody
        ref={bodyRef}
        position={[SPAWNS.lobby.pos[0], SPAWNS.lobby.pos[1] + HALF + 0.5, SPAWNS.lobby.pos[2]]}
        colliders={false}
        mass={1}
        // Locking rotation keeps the capsule upright; facing is handled on the mesh.
        enabledRotations={[false, false, false]}
        friction={0}
        linearDamping={0}
        ccd
        name="player"
      >
        <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} friction={0} />
        {/* Model origin is at the feet; the capsule origin is at its centre. */}
        <group ref={visualRef} position={[0, -HALF, 0]} rotation={[0, Math.PI, 0]}>
          {/* Flips pivot about the body's middle. */}
          <group ref={flipRef} position={[0, HALF, 0]}>
            <group position={[0, -HALF, 0]}>
              {heroDef ? (
                <HeroModel def={heroDef} motionRef={motionRef} light onReady={onAvatarReady} armsRef={armsRef} />
              ) : (
                <Suspense fallback={null}>
                  <PlayerAvatar onReady={onAvatarReady} targetHeight={PLAYER_HEIGHT} motionRef={motionRef} armsRef={armsRef} />
                </Suspense>
              )}
            </group>
          </group>
        </group>
      </RigidBody>

      <HeldWeapons spec={weapon} armsRef={armsRef} facingRef={visualRef} />

      {/* Grapple cable, stretched between hand and hook while swinging. */}
      <mesh ref={ropeRef} visible={false} frustumCulled={false}>
        <cylinderGeometry args={[0.035, 0.035, 1, 6]} />
        <meshBasicMaterial color={[2.4, 2.4, 2.6]} toneMapped={false} />
      </mesh>
    </>
  )
}

export { PLAYER_HEIGHT }
export default Player
