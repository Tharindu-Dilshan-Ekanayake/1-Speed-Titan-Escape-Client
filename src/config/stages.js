import { BIOMES } from './biomes'
import { COURSE_START_Z, WORLD2_OFFSET_X } from './layout'
import {
  doubleJumpDistance,
  GRAVITY,
  MAX_LEVEL,
  singleJumpDistance,
  STUD,
  walkspeedFor,
} from './progression'

export { laserAngle } from './dynamics'

/**
 * Stage generator.
 *
 * Every stage is its own place (a biome: castle, giant-tree forest, rooftops, sky
 * islands, jungle river, desert, frozen lake, swamp, factory, volcano, caverns...)
 * separated from the next by a huge wall with a barrier gate. The course weaves
 * across the whole width of the stage and sometimes forks into two routes.
 *
 * Sizes are rolled from a seeded RNG (same course every session) and every gap is
 * sized from the jump physics at the stage's *recommended level*.
 *
 * Output is plain data: game/world/Course.jsx renders it, the player controller
 * reads floors, hazards and hooks from it. `d` is distance forward from the stage's
 * gate; world Z decreases as you progress.
 */

/** Half-width of the gate opening between stages (and out of the hubs). */
export const GATE_HALF = 13
/** Legacy name, still used by the hub gates. */
export const CORRIDOR_HALF = GATE_HALF
/** Gate walls span the full width of any biome. */
export const GATE_WALL_HALF = 50
export const GATE = { tower: 3.2, lintelBottom: 16.5, lintelTop: 21, wallTop: 27 }
export const LAVA_Y = -0.7
/** Feet below this in a 'touch' floor = dead. */
export const KILL_Y = -0.45
/** Void floors kill a long way down. */
export const VOID_KILL_Y = -14
export const VOID_CLOUD_Y = -26
export const WALL_TOP = 22
export const WATER_SURFACE = -0.6
export const SAND_SURFACE = -0.35
/**
 * Forest / city stages hang high above the ground where titans roam: it lies far
 * down so the drop reads at a glance, and falling past DEEP_KILL_Y is the end.
 */
/** Seconds you can stay in water before you start to sink. */
export const WATER_BREATH_S = 3
/** Horizontal speed multiplier while swimming. */
export const SWIM_SPEED = 0.55
export const DEEP_FLOOR_Y = -12
export const DEEP_KILL_Y = -4.5
/** Ground mist over the drop: falling into it is the end. */
export const DEEP_MIST_Y = -5
const DEEP_FLOORS = new Set(['ground', 'street'])
const FLOOR_BOTTOM = -3
const POOL_BOTTOM = -7
const HOOK_Y = 6.4
const PENDULUM_PIVOT = 15

const PILLAR_MAT = {
  desert: 'sandstone',
  ice: 'snowrock',
  glacier: 'snowrock',
  volcano: 'basalt',
  crystal: 'crystalrock',
  abyss: 'crystalrock',
  river: 'mossrock',
  swamp: 'mossrock',
  forest: 'bark',
  factory: 'iron',
  city: 'plaster',
  sky: 'dirt',
}

/** The course: one biome and a list of set pieces per stage. `fork:A|B` = two routes. */
export const STAGE_DEFS = {
  1: [
    { name: 'Lava Leap', biome: 'castle', segs: ['run', 'grapple', 'stones', 'run'] },
    { name: 'Forest of Giant Trees', biome: 'forest', segs: ['branches', 'grapple', 'branches'] },
    { name: 'Rooftop Run', biome: 'city', segs: ['rooftops', 'fork:grapple2|rooftops', 'rooftops'] },
    { name: 'Jungle Rapids', biome: 'river', segs: ['lilypads', 'swim', 'lilypads', 'bounce'] },
    { name: 'Sandstorm Dunes', biome: 'desert', segs: ['pillars', 'rollers', 'stones'] },
    { name: 'Sky Islands', biome: 'sky', segs: ['islands', 'bounce', 'fork:blink|islands'] },
    { name: 'Frozen Lake', biome: 'ice', segs: ['floes', 'collapse', 'icerun'] },
    { name: 'Titan Stomp', biome: 'castle', segs: ['crusher', 'stairs', 'crusher', 'pendulum'] },
    { name: 'Toxic Swamp', biome: 'swamp', segs: ['lilypads', 'collapse', 'fork:blink|beam'] },
    { name: 'Gear Works', biome: 'factory', segs: ['discs', 'conveyor', 'crusher'] },
    { name: 'Eruption', biome: 'volcano', segs: ['tide', 'geysers', 'pillars'] },
    { name: 'Canopy Swing', biome: 'forest', segs: ['grapple3', 'branches', 'pendulum'] },
    { name: 'Burning District', biome: 'city', segs: ['rooftops', 'geysers', 'fork:rooftops|grapple2'] },
    { name: 'Crystal Caverns', biome: 'crystal', segs: ['bounce', 'blink', 'discs', 'islands'] },
    { name: 'Storm Peaks', biome: 'sky', segs: ['wind', 'islands', 'grapple2'] },
    { name: 'Laser Foundry', biome: 'factory', segs: ['laser', 'conveyor', 'laser', 'sweeper'] },
    { name: 'Temple of Sands', biome: 'desert', segs: ['rollers', 'collapse', 'pendulum'] },
    { name: 'Avalanche Pass', biome: 'ice', segs: ['icicles', 'floes', 'wind'] },
    { name: 'Waterfall Climb', biome: 'river', segs: ['swim', 'bounce', 'lilypads', 'grapple'] },
    { name: 'Final Escape', biome: 'castle', segs: ['fork:collapse|stones', 'crusher', 'laser', 'grapple3'] },
  ],
  2: [
    { name: 'Frozen Gate', biome: 'frostcastle', segs: ['icerun', 'grapple2', 'blink'] },
    { name: 'Void Walk', biome: 'abyss', segs: ['islands', 'discs', 'laser'] },
    { name: 'Crystal Swing', biome: 'glacier', segs: ['grapple3', 'floes', 'grapple3'] },
    { name: 'Shatter Bridge', biome: 'abyss', segs: ['collapse', 'wind', 'collapse'] },
    { name: 'Frost Titans', biome: 'frostcastle', segs: ['crusher', 'icerun', 'crusher', 'geysers'] },
    { name: 'Glacier Plunge', biome: 'glacier', segs: ['floes', 'icicles', 'conveyor'] },
    { name: 'Blizzard Pass', biome: 'abyss', segs: ['wind', 'blink', 'wind', 'sweeper'] },
    { name: 'Prism Lasers', biome: 'crystal', segs: ['laser', 'discs', 'laser', 'mover'] },
    { name: 'Titan Gauntlet', biome: 'frostcastle', segs: ['bounce', 'crusher', 'tide', 'pendulum'] },
    { name: "Titan King's Throne", biome: 'abyss', segs: ['fork:collapse|islands', 'grapple3', 'laser', 'blink'] },
  ],
}

export const STAGE_COUNT = { 1: STAGE_DEFS[1].length, 2: STAGE_DEFS[2].length }

export const STAGE_WINS = {
  1: [2, 3, 4, 5, 7, 9, 11, 14, 18, 22, 28, 36, 46, 60, 75, 95, 125, 155, 180, 200],
  2: [250, 290, 335, 385, 440, 500, 570, 650, 740, 1200],
}

/** Barrier / rune colour per stage, cycled. */
export const GATE_COLORS = ['#39d7ff', '#ff4fb8', '#ffc21a', '#3bff7a', '#b84dff', '#ff7a1a']

export const recommendedLevel = (world, stage) =>
  world === 2 ? MAX_LEVEL : Math.max(1, Math.round(1 + ((stage - 1) * (MAX_LEVEL - 1)) / 19))

/* --- Deterministic RNG ---------------------------------------------------------------- */
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const lerp = (a, b, t) => a + (b - a) * t
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

class StageBuilder {
  constructor(world, index, originX, originZ, biomeKey) {
    this.world = world
    this.index = index
    this.originX = originX
    this.originZ = originZ
    this.biomeKey = biomeKey
    this.biome = BIOMES[biomeKey]
    this.W = this.biome.half
    const deep = DEEP_FLOORS.has(this.biome.floor)
    /** Where scenery stands, and how far down platform bodies reach. */
    this.groundY = deep ? DEEP_FLOOR_Y : LAVA_Y
    this.bottom = deep ? DEEP_FLOOR_Y - 0.5 : FLOOR_BOTTOM
    this.lane = { cx: 0, hw: this.W - 3 }
    /**
     * Current path x. The course weaves around the stage centre line on a gentle
     * wave (starting centred, first bend left or right per stage) so it's balanced.
     */
    this.x = 0
    /** Walkable half-width of the surface the path is currently on (see step). */
    this.lastHalf = 6
    this.rng = mulberry32(world * 7919 + index * 104729)
    this.wave = 11 + this.rng() * 3
    this.weaveDir = this.rng() < 0.5 ? -1 : 1
    this.d = 0
    this.uid = 0
    this.colliders = []
    this.iceColliders = []
    this.cyls = []
    this.visuals = []
    this.shapes = []
    this.plats = []
    this.floors = []
    this.hooks = []
    this.movers = []
    this.discs = []
    this.blinks = []
    this.collapses = []
    this.crushers = []
    this.geysers = []
    this.pendulums = []
    this.sweepers = []
    this.lasers = []
    this.bounces = []
    this.conveyors = []
    this.winds = []
    this.rollers = []
    this.walkers = []
    this.pads = []
    this.signs = []
    this.torches = []
    this.banners = []
    this.titans = []
    this.waterfalls = []
    this.logs = []
    this.gauges = []
    this.arrows = []
    this.trim = null
  }

  r(lo, hi) {
    return lo + (hi - lo) * this.rng()
  }

  sign() {
    return this.rng() < 0.5 ? -1 : 1
  }

  z(d) {
    return this.originZ - d
  }

  wp(x, y, d) {
    return [this.originX + x, y, this.z(d)]
  }

  id(prefix) {
    this.uid += 1
    return `w${this.world}s${this.index}-${prefix}${this.uid}`
  }

  /** Clamp an x so something `halfW` wide stays inside the current lane. */
  laneX(x, halfW = 0) {
    const { cx, hw } = this.lane
    return clamp(x, cx - hw + halfW, cx + hw - halfW)
  }

  /**
   * Next x for the path at the current distance: on the weave, lightly jittered.
   * `halfW` is the room the piece needs, `surfHalf` its walkable half-width. The
   * sideways move is capped so this surface still overlaps the previous one side
   * to side: every gap is then a straight jump of the length it was sized for,
   * never a longer diagonal one.
   */
  step(halfW, surfHalf = halfW) {
    const { cx, hw } = this.lane
    const target = cx + this.weaveDir * hw * 0.5 * Math.sin((this.d - 14) / this.wave)
    const maxShift = Math.max(0.5, this.lastHalf + surfHalf - 1.2)
    const want = clamp(target + this.r(-1.2, 1.2), this.x - maxShift, this.x + maxShift)
    const x = this.laneX(want, halfW + 0.4)
    this.x = x
    this.lastHalf = surfHalf
    return x
  }

  box(x0, x1, y0, y1, d0, d1, mat, { collide = true, ice = false } = {}) {
    const c = [this.originX + (x0 + x1) / 2, (y0 + y1) / 2, (this.z(d0) + this.z(d1)) / 2]
    const s = [x1 - x0, y1 - y0, d1 - d0]
    if (mat) this.visuals.push({ c, s, mat })
    if (collide) (ice ? this.iceColliders : this.colliders).push({ c, h: [s[0] / 2, s[1] / 2, s[2] / 2] })
  }

  /** Visual-only primitive (cyl | cone | sphere | oct | prism | box), merged per material. */
  shape(type, mat, x, y, d, params) {
    this.shapes.push({ type, mat, c: this.wp(x, y, d), ...params })
  }

  /**
   * Walkable platform: a top slab over a body reaching down to `bottom`, with a
   * glowing trim so the route always reads at a glance.
   */
  platform(x0, x1, d0, d1, top = 0, { mat, body, bottom = this.bottom, ice = false, trim = true } = {}) {
    const tile = mat || (ice ? 'frost' : this.biome.top)
    const bodyMat = body || this.biome.body
    this.box(x0, x1, top - 0.3, top, d0, d1, tile, { collide: false })
    if (trim && this.trim) {
      const t = 0.14
      const glow = this.trim
      this.box(x0 - 0.02, x1 + 0.02, top - 0.34, top - 0.2, d0 - 0.02, d0 + t, glow, { collide: false })
      this.box(x0 - 0.02, x1 + 0.02, top - 0.34, top - 0.2, d1 - t, d1 + 0.02, glow, { collide: false })
      this.box(x0 - 0.02, x0 + t, top - 0.34, top - 0.2, d0, d1, glow, { collide: false })
      this.box(x1 - t, x1 + 0.02, top - 0.34, top - 0.2, d0, d1, glow, { collide: false })
    }
    if (top - 0.3 > bottom) this.box(x0, x1, bottom, top - 0.3, d0, d1, bodyMat, { collide: false })
    this.box(x0, x1, Math.min(bottom, top - 0.3), top, d0, d1, null, { ice })
    this.plats.push({ x0, x1, d0, d1 })
  }

  /** Stepped pyramid, top surface at `top`. */
  rockPillar(cx, d, top, width, { collide = true, mat } = {}) {
    const m = mat || PILLAR_MAT[this.biomeKey] || 'rock'
    const tiers = 3
    for (let i = 0; i < tiers; i += 1) {
      const w = width + (tiers - 1 - i) * 1.3
      const y1 = top - (tiers - 1 - i) * 0.9
      const y0 = i === 0 ? this.bottom : y1 - 0.9
      this.box(cx - w / 2, cx + w / 2, y0, y1, d - w / 2, d + w / 2, m, { collide })
    }
    if (collide) this.plats.push({ x0: cx - width / 2, x1: cx + width / 2, d0: d - width / 2, d1: d + width / 2 })
  }

  /** Giant tree trunk (solid), with root flare. */
  trunk(x, d, R, h = 80) {
    const base = this.groundY - 0.5
    this.shape('cyl', 'bark', x, base + h / 2, d, { r: R, h, seg: 14 })
    this.shape('cone', 'bark', x, base + 3, d, { r: R * 1.6, h: 6, seg: 14 })
    this.cyls.push({ c: this.wp(x, base + h / 2, d), r: R, hh: h / 2 })
    this.plats.push({ x0: x - R, x1: x + R, d0: d - R, d1: d + R })
  }

  floor(d0, d1, kind, extra = {}) {
    this.floors.push({ kind, d0, d1, ...extra })
  }

  smallGap(ctx, k = 0.3, lo = 1, hi = 2.5) {
    return clamp(k * ctx.sj, lo, hi)
  }

  isClear(x0, x1, d0, d1, margin = 2) {
    return !this.plats.some(
      (p) => x1 + margin > p.x0 && x0 - margin < p.x1 && d1 + margin > p.d0 && d0 - margin < p.d1,
    )
  }

  rest(ctx, len = 6, w = 11) {
    this.d += this.smallGap(ctx, 0.35, 1.2, 3.5)
    const x = this.laneX(this.x, w / 2)
    this.platform(x - w / 2, x + w / 2, this.d, this.d + len)
    this.arrow(x, 0, this.d + len / 2)
    this.d += len
    this.x = x
    this.lastHalf = w / 2
  }

  /**
   * Glowing chevron on the floor. It points at the next arrow along the route (see
   * aimArrows), so a chain of them shows exactly where the next jump lands.
   */
  arrow(x, top, d, size = 1) {
    this.arrows.push({ p: this.wp(x, top + 0.03, d), d, s: size, yaw: 0 })
  }
}

/* --- Segments ------------------------------------------------------------------------
 * Each starts at b.d (far edge of the previous surface) and leaves b.d at the far
 * edge of its last walkable surface, b.x at its centre.                                */

/**
 * The stage's speed check: one long jump sized to ~90% of a double jump at the
 * recommended level. Under-levelled players have to go train first.
 */
function segLeap(b, ctx) {
  const gap = clamp(0.9 * ctx.dj, 5, 17.5)
  b.x = b.laneX(b.x, 5)
  b.signs.push({
    text: b.world === 2 ? 'SPEED JUMP\nMAX LEVEL' : `SPEED JUMP\nLEVEL ${ctx.recLevel}+`,
    p: b.wp(b.x - 7.5, 2.4, b.d - 1.5),
    rot: 0.9,
    kind: 'speed',
  })
  b.d += gap
  b.platform(b.x - 5, b.x + 5, b.d, b.d + 8)
  b.arrow(b.x, 0, b.d + 4)
  b.d += 8
}

function segRun(b, ctx) {
  const n = 2 + Math.floor(b.rng() * 2)
  for (let i = 0; i < n; i += 1) {
    const gap = clamp(lerp(0.42, 0.7, ctx.t) * ctx.dj, 1.6, 14)
    const len = lerp(10, 5, ctx.t) + b.r(-1, 2)
    const w = clamp(lerp(14, 5, ctx.t) + b.r(-2, 2), 3.5, 18)
    const x = b.step(w / 2)
    b.d += gap
    b.platform(x - w / 2, x + w / 2, b.d, b.d + len, 0, { ice: ctx.ice })
    b.arrow(x, 0, b.d + len / 2, Math.min(1, w / 4))
    b.d += len
  }
}

function segStones(b, ctx) {
  const k = 5 + Math.floor(b.rng() * 3)
  const size = clamp(lerp(4, 2.2, ctx.t), 2, 4.2)
  for (let i = 0; i < k; i += 1) {
    const gap = clamp(lerp(0.3, 0.5, ctx.t) * ctx.dj, 1.2, 9)
    const x = b.step(size / 2)
    const top = ctx.t > 0.25 ? b.r(0, 0.9) : 0
    b.d += gap
    b.platform(x - size / 2, x + size / 2, b.d, b.d + size, top, { mat: 'stone', body: PILLAR_MAT[b.biomeKey] || 'rock' })
    b.arrow(x, top, b.d + size / 2, size / 3.4)
    b.d += size
  }
}

function segBeam(b, ctx) {
  const w = clamp(lerp(3, 1.2, ctx.t), 1, 3.2)
  const pieces = 2 + Math.floor(b.rng() * 2)
  let x = b.laneX(b.x, w)
  b.d += b.smallGap(ctx, 0.3, 1, 4)
  for (let i = 0; i < pieces; i += 1) {
    const len = b.r(6, 10)
    b.platform(x - w / 2, x + w / 2, b.d, b.d + len, 0, { mat: 'plank', body: 'darkwood' })
    for (const dd of [b.d + 0.3, b.d + len - 0.3]) {
      for (const sx of [-1, 1]) {
        const px = x + sx * (w / 2 + 0.2)
        b.box(px - 0.14, px + 0.14, -1.5, 1.4, dd - 0.14, dd + 0.14, 'darkwood', { collide: false })
      }
    }
    b.d += len
    if (i < pieces - 1) {
      if (ctx.t > 0.3) b.d += clamp(0.35 * ctx.sj, 1, 4)
      x = b.laneX(x + b.sign() * b.r(1.5, 3.5), w)
    }
  }
  b.x = x
}

function segStairs(b, ctx) {
  const k = 4 + Math.floor(b.rng() * 2)
  let top = 0
  for (let i = 0; i < k; i += 1) {
    top += lerp(0.8, 1.25, ctx.t)
    const x = b.step(2.2)
    b.d += clamp(lerp(0.2, 0.42, ctx.t) * ctx.sj, 0.8, 4)
    b.platform(x - 2.2, x + 2.2, b.d, b.d + 4.4, top, { mat: 'stone', body: 'castle' })
    b.d += 4.4
  }
}

function segPillars(b, ctx) {
  const k = 4 + Math.floor(b.rng() * 3)
  for (let i = 0; i < k; i += 1) {
    const width = clamp(lerp(3.4, 2.2, ctx.t), 2, 3.6)
    const gap = clamp(lerp(0.32, 0.55, ctx.t) * ctx.dj, 1.2, 10)
    const x = b.step(width / 2 + 1.3, width / 2)
    b.d += gap + width / 2
    const top = b.r(0.2, 1.4)
    b.rockPillar(x, b.d, top, width)
    b.arrow(x, top, b.d, width / 3.4)
    b.d += width / 2
  }
}

function segGrapple(b, ctx, n = 1) {
  const first = n === 1 ? clamp(1.3 * ctx.dj, 11, 19) / 2 : 7
  const start = b.d
  const x = b.laneX(b.x, 6)
  const style = b.biome.walls === 'castle' || b.biome.walls === 'metal' ? 'beam' : 'float'
  for (let i = 0; i < n; i += 1) {
    const hd = start + first + i * 12
    b.hooks.push({ id: b.id('hook'), p: b.wp(x + b.r(-2, 2), HOOK_Y, hd), style })
  }
  const lastHook = start + first + (n - 1) * 12
  b.d = lastHook + (n === 1 ? first : 5)
  // Long landing: the swing lets go 5-11 units past the last hook.
  b.platform(x - 6, x + 6, b.d, b.d + 10)
  b.arrow(x, 0, b.d + 5)
  b.d += 10
  b.x = x
  if (ctx.hintGrapple) {
    b.signs.push({ text: 'Press E or Q\nto grapple\nand fly away!', p: b.wp(x - 6.5, 2.8, start - 3), rot: 0.5 })
    ctx.hintGrapple = false
  } else {
    // Every swing is announced: no one should stand at an edge wondering how to cross.
    b.signs.push({ text: 'GRAPPLE!\nPress E', p: b.wp(b.laneX(x - 6, 1.5), 2.4, start - 2.5), rot: 0.5 })
  }
}

function segCollapse(b, ctx) {
  const w = clamp(lerp(5, 3, ctx.t), 2.8, 5.5)
  const tile = 2.4
  const step = tile + 0.18
  const count = 7 + Math.floor(ctx.t * 6)
  const x = b.laneX(b.x, w / 2 + 0.5)
  const style =
    b.biomeKey === 'ice' || b.biomeKey === 'glacier' ? 'ice' : b.biomeKey === 'abyss' ? 'crystal' : 'plank'
  b.d += b.smallGap(ctx)
  const d0 = b.d
  const len = count * step
  for (let i = 0; i < count; i += 1) {
    b.collapses.push({
      id: b.id('tile'),
      c: b.wp(x, -0.2, d0 + i * step + tile / 2),
      s: [w, 0.4, tile],
      tilt: b.r(-0.05, 0.05),
      style,
    })
  }
  if (style === 'plank') {
    for (const sx of [-1, 1]) {
      const px = x + sx * (w / 2 + 0.25)
      for (const dd of [d0 - 0.3, d0 + len + 0.3]) {
        b.box(px - 0.2, px + 0.2, -2, 1.7, dd - 0.2, dd + 0.2, 'darkwood', { collide: false })
      }
      b.box(px - 0.05, px + 0.05, 1.15, 1.27, d0 - 0.3, d0 + len + 0.3, 'rope', { collide: false })
    }
  }
  b.plats.push({ x0: x - w / 2, x1: x + w / 2, d0, d1: d0 + len })
  b.d = d0 + len + b.smallGap(ctx)
  const lx = b.laneX(x, 5)
  b.platform(lx - 5, lx + 5, b.d, b.d + 6)
  b.arrow(lx, 0, b.d + 3)
  b.d += 6
  b.x = lx
}

function segTide(b, ctx) {
  // Dam steps up, a long walkway the lava floods and drains, dam steps down.
  const { cx, hw } = b.lane
  const x0 = cx - hw
  const x1 = cx + hw
  b.d += 1.2
  b.platform(x0, x1, b.d, b.d + 3, 0.9, { mat: 'stone', body: 'castle' })
  b.d += 3
  b.platform(x0, x1, b.d, b.d + 4, 1.8, { mat: 'stone', body: 'castle' })
  b.d += 4
  const d0 = b.d
  const len = Math.round(48 + ctx.t * 24)
  const w = clamp(lerp(8, 5, ctx.t), 4.5, 9)
  const x = b.laneX(b.x, w / 2 + 5)
  b.platform(x - w / 2, x + w / 2, d0, d0 + len - 2.5, 0, { mat: 'stone', body: 'rock' })
  let side = b.sign()
  for (let dd = d0 + 10; dd < d0 + len - 8; dd += b.r(13, 17)) {
    const ix = x + side * (w / 2 + 2.2)
    b.platform(ix - 2.4, ix + 2.4, dd - 2.4, dd + 2.4, 1.9, { mat: 'stone', body: 'rock' })
    side = -side
  }
  b.platform(x - w / 2, x + w / 2, d0 + len - 2.5, d0 + len, 1.0, { mat: 'stone', body: 'rock' })
  const tide = { low: -1.3, high: 1.25, period: lerp(9, 6.5, ctx.t), phase: b.rng() }
  b.floor(d0, d0 + len, 'tide', tide)
  b.gauges.push({ zTop: b.z(d0), zBot: b.z(d0 + len), y: tide.high })
  b.d = d0 + len
  b.platform(x0, x1, b.d, b.d + 4, 1.8, { mat: 'stone', body: 'castle' })
  b.d += 4
  b.platform(x0, x1, b.d, b.d + 3, 0.9, { mat: 'stone', body: 'castle' })
  b.d += 3
  b.x = x
}

function segSwim(b, ctx) {
  // Climb a cliff, plunge into a deep pool under a waterfall, swim out.
  for (const top of [1.3, 2.6]) {
    b.d += b.smallGap(ctx, 0.3, 1, 2.2)
    const x = b.laneX(b.x, 6)
    b.platform(x - 6, x + 6, b.d, b.d + 3.5, top, { mat: 'stone', body: 'mossrock' })
    b.d += 3.5
  }
  const { cx, hw } = b.lane
  b.d += b.smallGap(ctx, 0.3, 1, 2.2)
  b.platform(cx - hw, cx + hw, b.d, b.d + 6, 4, { mat: 'stone', body: 'mossrock', bottom: POOL_BOTTOM - 1 })
  b.d += 6
  const d0 = b.d
  // The swim has to fit inside the breath you get (WATER_BREATH_S): sized from swim speed.
  const len = Math.round(Math.max(10, WATER_BREATH_S * 0.8 * SWIM_SPEED * ctx.run))
  b.floor(d0, d0 + len, 'water', { surface: WATER_SURFACE, bottom: POOL_BOTTOM, current: 0 })
  b.box(-b.W - 2, b.W + 2, POOL_BOTTOM - 1, POOL_BOTTOM, d0, d0 + len, 'stone')
  const exitX = b.laneX(cx + b.sign() * hw * 0.5, 7)
  b.platform(exitX - 6, exitX + 6, d0 + len - 3, d0 + len, -1.0, { mat: 'stone', body: 'mossrock', bottom: POOL_BOTTOM })
  const side = b.sign()
  const wd = d0 + len * 0.45
  b.waterfalls.push({ x: b.originX + side * (b.W - 0.06), side, z: b.z(wd), w: 10, top: 16, bottom: WATER_SURFACE })
  const ox0 = side > 0 ? b.W - 1.4 : -b.W
  b.box(ox0, ox0 + 1.4, 16, 17.4, wd - 5.6, wd + 5.6, 'mossrock', { collide: false })
  for (let i = 0; i < 4; i += 1) {
    b.logs.push({
      c: b.wp(b.r(-b.W + 3, b.W - 3), WATER_SURFACE, d0 + b.r(4, len - 5)),
      len: b.r(3, 5),
      rot: b.r(0, Math.PI),
      phase: b.r(0, 6),
    })
  }
  b.d = d0 + len
  b.platform(exitX - 7, exitX + 7, b.d, b.d + 6, 0, { bottom: POOL_BOTTOM - 1 })
  b.d += 6
  b.x = exitX
}

function segCrusher(b, ctx) {
  const count = 2 + Math.floor(ctx.t * 2.5)
  const w = clamp(lerp(9, 6, ctx.t), 5.5, 9)
  const x = b.laneX(b.x, w / 2 + 0.6)
  const spacing = 10
  b.d += b.smallGap(ctx)
  const d0 = b.d
  const len = 8 + count * spacing
  b.platform(x - w / 2, x + w / 2, d0, d0 + len, 0, { mat: 'stone', body: 'castle' })
  const period = lerp(3.8, 2.7, ctx.t)
  const style = b.biome.walls === 'metal' ? 'piston' : b.world === 2 ? 'frost' : 'fist'
  for (let i = 0; i < count; i += 1) {
    b.crushers.push({
      id: b.id('crush'),
      c: b.wp(x, 0, d0 + 7 + i * spacing),
      hx: w / 2 + 0.6,
      hz: 2.4,
      top: 11,
      rest: 0,
      period,
      phase: (i * 0.29) % 1,
      style,
    })
  }
  b.d = d0 + len
  b.x = x
}

function segIcicles(b, ctx) {
  const count = 4 + Math.floor(ctx.t * 4)
  const w = 11
  const x = b.laneX(b.x, w / 2)
  b.d += b.smallGap(ctx)
  const d0 = b.d
  const len = 8 + count * 5.5
  b.platform(x - w / 2, x + w / 2, d0, d0 + len, 0, { mat: 'snow', body: 'frost' })
  const period = lerp(3.2, 2.4, ctx.t)
  for (let i = 0; i < count; i += 1) {
    b.crushers.push({
      id: b.id('icicle'),
      c: b.wp(x + (i % 2 ? 2.6 : -2.6), 0, d0 + 6 + i * 5.5),
      hx: 1.5,
      hz: 1.5,
      top: 13,
      rest: 0,
      period,
      phase: (i * 0.37) % 1,
      style: 'icicle',
    })
  }
  b.d = d0 + len
  b.x = x
}

function segGeysers(b, ctx) {
  const len = Math.round(30 + ctx.t * 12)
  const w = clamp(lerp(22, 14, ctx.t), 12, 24)
  const x = b.laneX(b.x, w / 2)
  b.d += b.smallGap(ctx)
  const d0 = b.d
  b.platform(x - w / 2, x + w / 2, d0, d0 + len, 0, { mat: 'stone', body: PILLAR_MAT[b.biomeKey] || 'rock' })
  const count = 6 + Math.floor(ctx.t * 6)
  for (let i = 0; i < count; i += 1) {
    b.geysers.push({
      id: b.id('geyser'),
      c: b.wp(x + b.r(-w / 2 + 2, w / 2 - 2), 0, d0 + 4 + ((len - 8) * (i + 0.5)) / count),
      r: 1.35,
      h: 9,
      period: lerp(3.6, 2.6, ctx.t),
      phase: b.rng(),
    })
  }
  b.d = d0 + len
  b.x = x
}

function segPendulum(b, ctx) {
  const n = 2 + Math.floor(ctx.t * 2.5)
  const w = clamp(lerp(6, 3.6, ctx.t), 3.4, 6.5)
  const x = b.laneX(b.x, w / 2 + 2)
  b.d += b.smallGap(ctx)
  const d0 = b.d
  const len = 8 + n * 9
  b.platform(x - w / 2, x + w / 2, d0, d0 + len, 0, { mat: 'plank', body: 'darkwood' })
  for (let i = 0; i < n; i += 1) {
    const dd = d0 + 6 + i * 9
    b.pendulums.push({
      id: b.id('pend'),
      pivot: b.wp(x, PENDULUM_PIVOT, dd),
      L: PENDULUM_PIVOT - 2,
      amp: lerp(0.45, 0.6, ctx.t),
      w: lerp(1.6, 2.3, ctx.t),
      phase: i * 1.9,
    })
    // Gantry frame the blade hangs from.
    for (const sx of [-1, 1]) {
      const px = x + sx * (w / 2 + 3.2)
      b.box(px - 0.4, px + 0.4, b.bottom, PENDULUM_PIVOT + 0.6, dd - 0.4, dd + 0.4, 'darkwood', { collide: false })
    }
    b.box(x - w / 2 - 3.6, x + w / 2 + 3.6, PENDULUM_PIVOT + 0.4, PENDULUM_PIVOT + 1.2, dd - 0.5, dd + 0.5, 'darkwood', {
      collide: false,
    })
  }
  b.d = d0 + len
  b.x = x
}

function segSweeper(b, ctx) {
  const count = ctx.t > 0.5 ? 2 : 1
  for (let k = 0; k < count; k += 1) {
    b.d += b.smallGap(ctx, 0.35, 1.2, 3)
    const size = 16
    const x = b.laneX(b.x, size / 2)
    const d0 = b.d
    b.platform(x - size / 2, x + size / 2, d0, d0 + size, 0, { mat: 'stone', body: 'rock' })
    b.sweepers.push({
      id: b.id('sweep'),
      c: b.wp(x, 0, d0 + size / 2),
      r: size / 2 - 0.4,
      y0: 0.25,
      y1: 0.85,
      w: b.sign() * lerp(1.3, 2.1, ctx.t),
      phase: b.r(0, 6),
    })
    b.box(x - 0.7, x + 0.7, 0, 1.6, d0 + size / 2 - 0.7, d0 + size / 2 + 0.7, 'iron')
    b.d = d0 + size
    b.x = x
  }
}

function segDiscs(b, ctx) {
  const n = 3 + Math.floor(b.rng() * 2)
  for (let i = 0; i < n; i += 1) {
    const r = clamp(lerp(4.2, 2.7, ctx.t), 2.5, 4.5)
    const gap = clamp(lerp(0.3, 0.45, ctx.t) * ctx.dj, 1.4, 6)
    const x = b.step(r + 0.5, r)
    b.d += gap + r
    b.discs.push({
      id: b.id('disc'),
      c: b.wp(x, -0.25, b.d),
      r,
      h: 0.5,
      w: (i % 2 ? 1 : -1) * lerp(0.55, 1.2, ctx.t),
      phase: b.r(0, 6),
      style: b.biome.walls === 'metal' ? 'gear' : 'stone',
    })
    b.plats.push({ x0: x - r, x1: x + r, d0: b.d - r, d1: b.d + r })
    b.d += r
  }
}

function segBlink(b, ctx) {
  const n = 6 + Math.floor(ctx.t * 5)
  const size = clamp(lerp(3.8, 2.6, ctx.t), 2.4, 4)
  const period = lerp(3.4, 2.6, ctx.t)
  for (let i = 0; i < n; i += 1) {
    const x = b.step(size / 2)
    b.d += clamp(lerp(0.25, 0.4, ctx.t) * ctx.dj, 1.2, 4)
    b.blinks.push({
      id: b.id('blink'),
      c: b.wp(x, -0.2, b.d + size / 2),
      s: [size, 0.4, size],
      group: i % 2,
      period,
      duty: 0.6,
      phase: (i % 2) * 0.5,
      style: b.biomeKey === 'sky' ? 'cloud' : 'neon',
    })
    b.plats.push({ x0: x - size / 2, x1: x + size / 2, d0: b.d, d1: b.d + size })
    b.d += size
  }
}

function segBounce(b, ctx) {
  const ledges = ctx.t > 0.5 ? [5.5, 10.5] : [5.5]
  const x = b.laneX(b.x, 6)
  let d = b.d + b.smallGap(ctx)
  let top = 0
  b.platform(x - 5, x + 5, d, d + 8, 0, { mat: 'stone' })
  let padD = d + 5
  d += 8
  for (let i = 0; i < ledges.length; i += 1) {
    const next = ledges[i]
    b.bounces.push({
      id: b.id('bounce'),
      c: b.wp(x, top + 0.14, padD),
      r: 1.6,
      v: Math.sqrt(2 * -GRAVITY * (next - top + 1.6)),
    })
    b.platform(x - 6, x + 6, d + 0.5, d + 12.5, next, { body: PILLAR_MAT[b.biomeKey] || 'castle' })
    padD = d + 9.5
    top = next
    d += 12.5
  }
  b.d = d
  b.x = x
}

function segConveyor(b, ctx) {
  const n = 2 + Math.floor(b.rng() * 2)
  const speed = lerp(0.35, 0.5, ctx.t) * ctx.run
  for (let i = 0; i < n; i += 1) {
    const sideways = ctx.t > 0.45 && i % 2 === 1
    const w = clamp(lerp(sideways ? 7 : 8, 5, ctx.t), 4.5, 9)
    const len = sideways ? 12 : 16
    const x = b.step(w / 2)
    b.d += b.smallGap(ctx, 0.3, 1.2, 3)
    const v = sideways ? [b.sign() * speed, 0] : [0, speed]
    b.conveyors.push({ id: b.id('belt'), c: b.wp(x, -0.2, b.d + len / 2), s: [w, 0.4, len], v })
    b.box(x - w / 2, x + w / 2, b.bottom, -0.4, b.d, b.d + len, 'iron', { collide: false })
    for (const sx of [-1, 1]) {
      const rx = x + sx * (w / 2 + 0.2)
      b.box(rx - 0.2, rx + 0.2, -0.45, 0.3, b.d, b.d + len, 'gold', { collide: false })
    }
    b.plats.push({ x0: x - w / 2, x1: x + w / 2, d0: b.d, d1: b.d + len })
    b.d += len
  }
}

function segWind(b, ctx) {
  const w = clamp(lerp(4.6, 3.2, ctx.t), 3, 4.8)
  const len = Math.round(30 + ctx.t * 16)
  const side = b.sign()
  const x = b.laneX(b.x, 10)
  b.d += b.smallGap(ctx)
  const d0 = b.d
  b.platform(x - w / 2, x + w / 2, d0, d0 + len, 0, { mat: 'plank', body: 'darkwood' })
  // Fans on pylons beside the walkway, blowing across it.
  const fanX = x + side * 9
  const fans = []
  for (let dd = d0 + 5; dd < d0 + len - 3; dd += 10) {
    fans.push(b.wp(fanX, 5.5, dd))
    b.box(fanX - 0.5, fanX + 0.5, b.bottom, 3.2, dd - 0.5, dd + 0.5, 'iron', { collide: false })
  }
  b.plats.push({ x0: Math.min(x, fanX) - 1, x1: Math.max(x, fanX) + 1, d0, d1: d0 + len })
  b.winds.push({
    id: b.id('wind'),
    x0: b.originX + x - 10,
    x1: b.originX + x + 10,
    zTop: b.z(d0),
    zBot: b.z(d0 + len),
    y1: 10,
    push: -side * lerp(0.16, 0.24, ctx.t) * ctx.run,
    side,
    phase: b.r(0, 6),
    fans,
  })
  b.d = d0 + len
  b.x = x
}

function segLaser(b, ctx) {
  const len = 16
  const half = 8.5
  const x = b.laneX(b.x, half)
  b.d += b.smallGap(ctx, 0.3, 1.2, 3)
  b.platform(x - half, x + half, b.d, b.d + len, 0, { mat: 'stone', body: 'castle' })
  const center = b.wp(x, 0, b.d + len / 2)
  b.box(x - 0.6, x + 0.6, 0, 1.6, b.d + len / 2 - 0.6, b.d + len / 2 + 0.6, 'iron')
  b.lasers.push({
    id: b.id('laser'),
    c: [center[0], 0.75, center[2]],
    r: half + 0.8,
    w: b.sign() * lerp(1.3, 2.1, ctx.t),
    phase: b.r(0, Math.PI),
  })
  b.d += len
  b.x = x
}

function segMover(b, ctx) {
  const gap = clamp(1.8 * ctx.dj, 12, 24)
  const size = 4.5
  const x = b.laneX(b.x, 6)
  const near = b.d + 0.6 + size / 2
  const far = b.d + gap - 0.6 - size / 2
  b.movers.push({
    id: b.id('mover'),
    from: b.wp(x, -0.2, near),
    to: b.wp(x, -0.2, far),
    size: [size, 0.4, size],
    period: ((far - near) / 3.4) * 2,
    phase: b.rng(),
  })
  b.plats.push({ x0: x - size / 2, x1: x + size / 2, d0: near, d1: far })
  b.d += gap
  b.platform(x - 6, x + 6, b.d, b.d + 7)
  b.arrow(x, 0, b.d + 3.5)
  b.d += 7
  b.x = x
}

/* --- Biome set pieces ------------------------------------------------------------------ */

/**
 * Branch platforms growing off giant trunks (Forest of Giant Trees). Every other
 * gap is wider with a glowing leaf pad in the middle that fades in and out: hop on
 * it while it's there, or double jump the whole way.
 */
function segBranches(b, ctx) {
  const k = 4 + Math.floor(b.rng() * 2)
  let top = 0.4
  for (let i = 0; i < k; i += 1) {
    const size = clamp(lerp(6, 3.8, ctx.t), 3.6, 6.5)
    const padded = i % 2 === 1
    const gap = clamp(lerp(0.26, 0.42, ctx.t) * ctx.dj * (padded ? 1.6 : 1), 1.4, 9)
    const R = b.r(2.6, 3.6)
    const prevX = b.x
    const prevTop = top
    const x = b.step(size / 2 + R * 2 + 1, size / 2)
    // Trunks grow on the outer side, toward the stage walls, away from the route.
    const side = x >= b.lane.cx ? -1 : 1
    top = clamp(top + b.r(-0.7, 1.0), 0.2, 3.5)
    if (padded) {
      const pad = 2.6
      b.blinks.push({
        id: b.id('leaf'),
        c: b.wp((prevX + x) / 2, (prevTop + top) / 2 - 0.2, b.d + gap / 2),
        s: [pad, 0.4, pad],
        group: 0,
        period: 3.2,
        duty: 0.68,
        phase: b.rng(),
        style: 'leaf',
      })
    }
    b.d += gap
    b.platform(x - size / 2, x + size / 2, b.d, b.d + size, top, { mat: 'bark', body: 'darkwood', bottom: top - 1.3 })
    // The trunk stands well off to the side so it never blocks the next jump.
    const tx = x - side * (R + size / 2 + 2.2)
    b.trunk(tx, b.d + size / 2, R)
    // Branch holding the platform up.
    b.box(Math.min(tx, x), Math.max(tx, x), top - 2.2, top - 1.1, b.d + size / 2 - 0.6, b.d + size / 2 + 0.6, 'bark', {
      collide: false,
    })
    b.shape('sphere', 'leaves', x + side * (size / 2), top + 0.3, b.d + size / 2, { r: 1.2, sy: 0.55 })
    b.arrow(x, top, b.d + size / 2, size / 3.6)
    b.d += size
  }
}

/** A house: plaster walls, timber frame, windows; flat walkable roof if `walkable`. */
function house(b, x, d, w, dep, top, walkable) {
  if (walkable) {
    b.platform(x - w / 2, x + w / 2, d, d + dep, top, { mat: 'rooftile', body: 'plaster' })
    b.box(x + w / 2 - 1.1, x + w / 2 - 0.3, top, top + 1.8, d + 0.4, d + 1.2, 'brick')
  } else {
    b.box(x - w / 2, x + w / 2, b.bottom, top, d, d + dep, 'plaster', { collide: false })
    b.shape('prism', 'roofred', x, top, d + dep / 2, { s: [w + 0.6, Math.min(w, dep) * 0.45, dep + 0.6] })
  }
  // Timber band + windows on both long sides.
  for (const sx of [-1, 1]) {
    const fx = x + sx * (w / 2 + 0.04)
    b.box(fx - 0.06, fx + 0.06, top - 0.9, top - 0.5, d, d + dep, 'darkwood', { collide: false })
    for (let wd = d + 1.4; wd < d + dep - 1; wd += 2.4) {
      for (let wy = top - 1.8; wy > -1.5; wy -= 3) {
        b.box(fx - 0.07, fx + 0.07, wy - 1.1, wy, wd - 0.5, wd + 0.5, 'window', { collide: false })
      }
    }
  }
}

/** Jumping between house roofs over titan-infested streets. */
function segRooftops(b, ctx) {
  const n = 4 + Math.floor(b.rng() * 3)
  let top = 1
  for (let i = 0; i < n; i += 1) {
    const w = clamp(lerp(9, 5.5, ctx.t) + b.r(-1, 1.5), 5, 10)
    const dep = clamp(lerp(9, 6, ctx.t) + b.r(-1, 2), 5, 10)
    const gap = clamp(lerp(0.32, 0.5, ctx.t) * ctx.dj, 1.4, 8)
    top = clamp(top + b.r(-1.3, 1.3), 0.5, 5)
    const x = b.step(w / 2)
    b.d += gap
    house(b, x, b.d, w, dep, top, true)
    b.arrow(x, top, b.d + dep / 2)
    b.d += dep
  }
}

function island(b, x, dc, size, top, walkable) {
  const crystal = b.biomeKey === 'abyss' || b.biomeKey === 'crystal'
  const topMat = crystal ? 'crystaltile' : 'grass'
  const underMat = crystal ? 'crystalrock' : 'dirt'
  if (walkable) {
    b.platform(x - size / 2, x + size / 2, dc - size / 2, dc + size / 2, top, { mat: topMat, body: underMat, bottom: top - 1.6 })
  } else {
    b.shape('box', topMat, x, top - 0.8, dc, { s: [size, 1.6, size] })
  }
  b.shape('cone', underMat, x, top - 1.6 - size * 0.45, dc, { r: size * 0.68, h: size * 0.9, flip: true, seg: 7 })
  if (b.rng() < 0.5) b.shape('sphere', crystal ? 'glow:#b84dff:1.6' : 'leaves', x + b.r(-1, 1), top + 0.5, dc + b.r(-1, 1), { r: 0.9, sy: 0.8 })
}

/** Floating islands with rocky undersides. */
function segIslands(b, ctx) {
  const n = 4 + Math.floor(b.rng() * 3)
  let top = 0
  for (let i = 0; i < n; i += 1) {
    const size = clamp(lerp(7, 3.6, ctx.t) + b.r(-1, 1.5), 3.4, 8.5)
    const gap = clamp(lerp(0.4, 0.62, ctx.t) * ctx.dj, 1.6, 12)
    top = clamp(top + b.r(-1, 1.3), -0.5, 3)
    const x = b.step(size / 2)
    b.d += gap
    island(b, x, b.d + size / 2, size, top, true)
    b.arrow(x, top, b.d + size / 2, Math.min(1, size / 3.6))
    b.d += size
  }
}

/** Lily pads on water (river) or toxic sludge (swamp). */
function segLilypads(b, ctx) {
  const n = 6 + Math.floor(b.rng() * 4)
  const r = clamp(lerp(2, 1.4, ctx.t), 1.3, 2.1)
  for (let i = 0; i < n; i += 1) {
    const gap = clamp(lerp(0.3, 0.5, ctx.t) * ctx.dj, 1.2, 7)
    const x = b.step(r)
    b.d += gap + r
    b.cyls.push({ c: b.wp(x, -0.45, b.d), r, hh: 0.16 })
    b.shape('cyl', 'lily', x, -0.45, b.d, { r, h: 0.32, seg: 18 })
    b.arrow(x, -0.28, b.d, r / 2)
    if (b.rng() < 0.4) b.shape('sphere', 'glow:#ff8fd8:1.4', x + r * 0.4, -0.1, b.d - r * 0.3, { r: 0.35 })
    b.plats.push({ x0: x - r, x1: x + r, d0: b.d - r, d1: b.d + r })
    b.d += r
  }
  const x = b.laneX(b.x, 5)
  b.d += b.smallGap(ctx)
  b.platform(x - 5, x + 5, b.d, b.d + 5, 0, { mat: 'grass', body: 'mossrock' })
  b.d += 5
  b.x = x
}

/** Drifting ice floes on freezing water; some slide side to side. */
function segFloes(b, ctx) {
  const n = 5 + Math.floor(b.rng() * 3)
  for (let i = 0; i < n; i += 1) {
    const w = clamp(lerp(6, 3.6, ctx.t) + b.r(-0.5, 1.5), 3.4, 7.5)
    const dep = clamp(w + b.r(-1, 1), 3, 7.5)
    const gap = clamp(lerp(0.3, 0.5, ctx.t) * ctx.dj, 1.2, 8)
    const x = b.step(w / 2 + 3, w / 2)
    b.d += gap
    if (i % 3 === 2 && ctx.t > 0.2) {
      b.movers.push({
        id: b.id('floe'),
        from: b.wp(x - 3, -0.2, b.d + dep / 2),
        to: b.wp(x + 3, -0.2, b.d + dep / 2),
        size: [w, 0.4, dep],
        period: 5 + b.r(0, 2),
        phase: b.rng(),
        style: 'ice',
      })
      b.plats.push({ x0: x - w / 2 - 3, x1: x + w / 2 + 3, d0: b.d, d1: b.d + dep })
    } else {
      b.platform(x - w / 2, x + w / 2, b.d, b.d + dep, 0, { mat: 'snow', body: 'frost', bottom: -2.2, ice: b.rng() < 0.4 })
      b.arrow(x, 0, b.d + dep / 2, Math.min(1, w / 4))
    }
    b.d += dep
  }
}

/** A long temple ramp with boulders rolling down it and side alcoves to dodge into. */
function segRollers(b, ctx) {
  const w = 8
  const len = Math.round(40 + ctx.t * 16)
  const x = b.laneX(b.x, w / 2 + 4)
  b.d += b.smallGap(ctx)
  const d0 = b.d
  b.platform(x - w / 2, x + w / 2, d0, d0 + len, 0, { mat: 'sandstone', body: 'sandstone' })
  // Low rails with gaps that open into safe alcoves, alternating sides.
  const alcoves = []
  let side = -1
  for (let dd = d0 + 8; dd < d0 + len - 6; dd += 10) {
    alcoves.push({ side, d: dd })
    const ax = x + side * (w / 2 + 2)
    b.platform(ax - 2, ax + 2, dd - 1.6, dd + 1.6, 0, { mat: 'sandstone', body: 'sandstone' })
    side = -side
  }
  for (const sx of [-1, 1]) {
    const rx = x + sx * (w / 2 + 0.3)
    let from = d0
    for (const a of alcoves.filter((al) => al.side === sx)) {
      b.box(rx - 0.3, rx + 0.3, 0, 0.9, from, a.d - 1.6, 'sandstone')
      from = a.d + 1.6
    }
    b.box(rx - 0.3, rx + 0.3, 0, 0.9, from, d0 + len, 'sandstone')
  }
  const count = 2 + Math.floor(ctx.t * 2)
  const speed = lerp(9, 14, ctx.t)
  for (let i = 0; i < count; i += 1) {
    b.rollers.push({
      id: b.id('boulder'),
      x: b.originX + x + (i % 2 ? 1.8 : -1.8),
      y: 1.6,
      r: 1.6,
      z0: b.z(d0 + len - 1),
      z1: b.z(d0 + 1),
      period: len / speed,
      phase: i / count,
    })
  }
  b.d = d0 + len
  b.x = x
}

const LABELS = {
  grapple2: 'SWING',
  grapple3: 'SWING',
  rooftops: 'ROOFTOPS',
  blink: 'BLINK',
  islands: 'ISLANDS',
  beam: 'PLANKS',
  collapse: 'BRIDGE',
  stones: 'STONES',
}
const label = (seg) => LABELS[seg] || seg.toUpperCase()

/** Two routes side by side; they merge on a wide plaza. */
function segFork(b, ctx, spec) {
  const [left, right] = spec.split('|')
  const W = b.W
  b.d += b.smallGap(ctx)
  b.platform(-W + 3, W - 3, b.d, b.d + 6, 0, { mat: 'stone', body: 'castle' })
  b.signs.push({ text: `◀ ${label(left)}   ${label(right)} ▶`, p: b.wp(0, 2.4, b.d + 3), rot: 0 })
  const start = b.d + 6
  const lanes = [
    { cx: -W / 2, hw: W / 2 - 2.5, seg: left },
    { cx: W / 2, hw: W / 2 - 2.5, seg: right },
  ]
  const ends = []
  for (const lane of lanes) {
    b.lane = { cx: lane.cx, hw: lane.hw }
    b.x = lane.cx
    b.lastHalf = lane.hw
    b.d = start
    runSeg(b, ctx, lane.seg)
    ends.push({ d: b.d, x: b.x })
  }
  const end = Math.max(ends[0].d, ends[1].d)
  // Stretch the shorter route with a runway so both meet the plaza.
  ends.forEach((e, i) => {
    if (end - e.d > 1.5) {
      b.lane = { cx: lanes[i].cx, hw: lanes[i].hw }
      const x = b.laneX(e.x, 3)
      b.platform(x - 3, x + 3, e.d + 1.2, end, 0)
    }
  })
  b.lane = { cx: 0, hw: W - 3 }
  b.d = end + b.smallGap(ctx)
  b.platform(-W + 3, W - 3, b.d, b.d + 6, 0, { mat: 'stone', body: 'castle' })
  b.d += 6
  b.x = 0
}

const SEGMENTS = {
  run: segRun,
  icerun: (b, ctx) => segRun(b, { ...ctx, ice: true }),
  stones: segStones,
  beam: segBeam,
  stairs: segStairs,
  pillars: segPillars,
  grapple: (b, ctx) => segGrapple(b, ctx, 1),
  grapple2: (b, ctx) => segGrapple(b, ctx, 2),
  grapple3: (b, ctx) => segGrapple(b, ctx, 3),
  collapse: segCollapse,
  tide: segTide,
  swim: segSwim,
  crusher: segCrusher,
  icicles: segIcicles,
  geysers: segGeysers,
  pendulum: segPendulum,
  sweeper: segSweeper,
  discs: segDiscs,
  blink: segBlink,
  bounce: segBounce,
  conveyor: segConveyor,
  wind: segWind,
  laser: segLaser,
  mover: segMover,
  leap: segLeap,
  branches: segBranches,
  rooftops: segRooftops,
  islands: segIslands,
  lilypads: segLilypads,
  floes: segFloes,
  rollers: segRollers,
}

function runSeg(b, ctx, name) {
  if (name.startsWith('fork:')) segFork(b, ctx, name.slice(5))
  else SEGMENTS[name](b, ctx)
}

/* --- Walls & scenery ------------------------------------------------------------------ */

/** Invisible side walls so nobody leaves the stage sideways. */
function sideBarrier(b, length) {
  for (const s of [-1, 1]) {
    const x = s * (b.W + 1)
    b.box(x - 0.5, x + 0.5, -10, 40, 0, length, null)
  }
}

function buildWalls(b, length) {
  const { W, biome } = b
  switch (biome.walls) {
    case 'castle': {
      for (const side of [-1, 1]) {
        const x = side * (W + 0.5)
        b.box(x - 0.5, x + 0.5, -9, WALL_TOP, 0, length, biome.wallMat)
      }
      for (let d = 8; d < length; d += 12) {
        for (const side of [-1, 1]) {
          const x = side * (W - 0.1)
          b.box(x - 0.7, x + 0.7, -9, WALL_TOP + 1, d - 0.7, d + 0.7, 'beam', { collide: false })
        }
        b.box(-W - 1, W + 1, WALL_TOP, WALL_TOP + 1.2, d - 0.55, d + 0.55, 'beam', { collide: false })
      }
      for (let d = 14; d < length - 4; d += 16) {
        for (const side of [-1, 1]) {
          const x = side * (W - 0.35)
          b.box(x - 0.3, x + 0.3, 6.6, 7.5, d - 0.3, d + 0.3, 'iron', { collide: false })
          b.torches.push(b.wp(side * (W - 0.8), 7.5, d))
        }
      }
      for (let d = 22; d < length - 8; d += 32) {
        for (const side of [-1, 1]) b.banners.push({ side, x: b.originX + side * (W - 0.12), z: b.z(d), top: 19, h: 8, w: 3.2 })
      }
      b.titans.push({
        side: b.sign(),
        z: b.z(length * b.r(0.3, 0.7)),
        variant: b.world === 2 ? 'frost' : b.index % 4 ? 'colossal' : 'smiling',
      })
      break
    }
    case 'cliff': {
      for (const side of [-1, 1]) {
        for (let d = 0; d < length; d += b.r(5, 9)) {
          const depth = b.r(5, 10)
          const x0 = side > 0 ? W + b.r(0, 1.5) : -W - b.r(0, 1.5) - depth
          b.box(x0, x0 + depth, -9, b.r(16, 36), d, d + b.r(5, 10), biome.wallMat, { collide: false })
        }
      }
      sideBarrier(b, length)
      break
    }
    case 'trees': {
      for (const side of [-1, 1]) {
        for (let d = 4; d < length; d += b.r(9, 15)) {
          const R = b.r(3.5, 6)
          const x = side * (W + R + b.r(0, 5))
          b.shape('cyl', 'bark', x, b.groundY + 36, d, { r: R, h: 74, seg: 12 })
          b.shape('cone', 'bark', x, b.groundY + 2.5, d, { r: R * 1.6, h: 6, seg: 12 })
          b.shape('sphere', b.biomeKey === 'swamp' ? 'swampleaves' : 'leaves', x - side * 3, b.r(34, 48), d, {
            r: b.r(9, 14),
            sy: 0.55,
          })
        }
      }
      sideBarrier(b, length)
      break
    }
    case 'houses': {
      for (const side of [-1, 1]) {
        for (let d = 2; d < length - 6; d += b.r(9, 13)) {
          const w = b.r(7, 11)
          const x = side * (W + w / 2 + b.r(1.5, 3))
          house(b, x, d, w, b.r(7, 10), b.r(6, 15), false)
        }
        // Wall Rose, far behind the houses.
        const wx = side * (W + 42)
        b.box(wx - 3, wx + 3, b.bottom, 60, -10, length + 10, 'castle', { collide: false })
      }
      sideBarrier(b, length)
      break
    }
    case 'metal': {
      for (const side of [-1, 1]) {
        const x = side * (W + 0.6)
        b.box(x - 0.6, x + 0.6, -9, 26, 0, length, 'metalplate')
        for (const py of [6, 11, 18]) {
          b.shape('cyl', 'iron', side * (W - 0.6), py, length / 2, { r: 0.55, h: length, seg: 10, rx: Math.PI / 2 })
        }
        for (let d = 10; d < length; d += 14) {
          b.box(side * W - 0.08, side * W + 0.08, 2, 24, d - 0.25, d + 0.25, 'glow:#ffb31a:2', { collide: false })
          b.shape('cyl', 'gold', side * (W - 0.4), 14, d + 7, { r: 4, h: 0.6, seg: 16, rz: Math.PI / 2 })
        }
      }
      break
    }
    default:
      break
  }
}

/** Scenery scattered through the open space (never on or near the course). */
function scatterDecor(b, length) {
  const { W } = b
  const tries = Math.round(length / 3)
  for (let i = 0; i < tries; i += 1) {
    const x = b.r(-W + 2, W - 2)
    const d = b.r(16, length - 12)
    const s = b.r(1.5, 3.5)
    if (!b.isClear(x - s, x + s, d - s, d + s, 2.5)) continue
    switch (b.biome.decor) {
      case 'spires':
        if (i % 3 === 0) b.rockPillar(x, d, b.r(3, 8), s * 1.1, { collide: false })
        break
      case 'forest':
        if (i % 3 === 0 && b.isClear(x - 5, x + 5, d - 5, d + 5, 6)) b.trunk(x, d, b.r(2.6, 4.2))
        else b.shape('sphere', 'leaves', x, b.groundY + 0.2, d, { r: s * 0.9, sy: 0.55 })
        break
      case 'clouds':
        b.shape('sphere', 'cloud', x, b.r(-10, -4), d, { r: s * 1.8, sy: 0.45 })
        break
      case 'abyss':
        if (i % 2) b.shape('oct', `glow:${b.rng() < 0.5 ? '#b84dff' : '#39d7ff'}:1.8`, x, b.r(-6, 6), d, { r: s * 0.5, sy: 2 })
        else b.shape('box', 'darkstone', x, b.r(-8, -2), d, { s: [s, s * 1.4, s], rx: b.r(0, 1), ry: b.r(0, 1) })
        break
      case 'jungle':
        b.shape('sphere', 'mossrock', x, -0.8, d, { r: s * 0.7, sy: 0.6 })
        break
      case 'desert':
        if (i % 2) {
          b.shape('cyl', 'cactus', x, 1.6, d, { r: 0.45, h: 4.4, seg: 8 })
          b.shape('cyl', 'cactus', x + 0.8, 2.4, d, { r: 0.3, h: 1.6, seg: 8 })
        } else {
          b.shape('sphere', 'sand', x, -0.6, d, { r: s * 1.3, sy: 0.35 })
        }
        break
      case 'ice':
        if (i % 2) b.shape('cone', 'frost', x, 1.5, d, { r: s * 0.6, h: s * 2.5, seg: 6 })
        else b.shape('box', 'frost', x, 0, d, { s: [s * 1.6, 1.6, s * 1.3], ry: b.r(0, 1) })
        break
      case 'swamp':
        if (i % 2) b.shape('sphere', 'glow:#9bff4d:1.6', x, -0.3, d, { r: 0.45 })
        else b.shape('cyl', 'darkwood', x, 3, d, { r: 0.35, h: 7, seg: 6, rz: b.r(-0.3, 0.3) })
        break
      case 'factory':
        if (i % 3 === 0) b.shape('cyl', 'iron', x, 0.5, d, { r: 0.9, h: 3, seg: 10 })
        break
      case 'volcano':
        if (i % 3 === 0) b.rockPillar(x, d, b.r(4, 10), s * 1.2, { collide: false, mat: 'basalt' })
        break
      case 'crystal':
        b.shape('oct', `glow:${['#39d7ff', '#ff4fb8', '#b84dff'][i % 3]}:1.9`, x, b.r(-4, 3), d, { r: s * 0.45, sy: 2.4 })
        break
      default:
        break
    }
  }
  // Distant floating islands around the open-sky biomes.
  if (b.biome.walls === 'none') {
    for (let d = 0; d < length; d += 26) {
      for (const side of [-1, 1]) {
        island(b, side * (W + b.r(18, 40)), d + b.r(-8, 8), b.r(8, 16), b.r(-4, 14), false)
      }
    }
  }
}

/** Titans roaming the ground (forest / city): where they walk is certain death. */
function placeWalkers(b, length) {
  if (b.biome.floor !== 'ground' && b.biome.floor !== 'street') return
  const count = 4
  for (let i = 0; i < 40 && b.walkers.length < count; i += 1) {
    const x = b.r(-b.W + 4, b.W - 4)
    const d0 = b.r(10, length - 40)
    const d1 = d0 + b.r(18, 30)
    if (!b.isClear(x - 4, x + 4, d0, d1, 5)) continue
    b.walkers.push({
      x: b.originX + x,
      y: b.groundY,
      z0: b.z(d0),
      z1: b.z(d1),
      period: b.r(14, 22),
      phase: b.rng(),
      stride: b.r(2.2, 3),
      // Tall enough that their heads rise to just below the course.
      scale: b.r(0.95, 1.15),
      variant: ['smiling', 'colossal', 'smiling', 'bearded'][b.walkers.length % 4],
    })
  }
}

/**
 * Points every arrow at the next one along the route. Arrows are recorded in build
 * order; a fork records one lane then the other, so an arrow whose successor lies
 * behind it (or far away) just points straight on.
 */
function aimArrows(b) {
  const list = b.arrows
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i]
    const n = list[i + 1]
    if (!n || n.d <= a.d + 0.5) continue
    const dx = n.p[0] - a.p[0]
    const dz = n.p[2] - a.p[2]
    if (Math.hypot(dx, dz) > 34) continue
    // The chevron points along -Z; rotating it by yaw about Y aims it at (dx, dz).
    a.yaw = Math.atan2(-dx, -dz)
  }
}

/**
 * Huge wall across the stage with a barrier gate - separates one biome from the
 * next. `hubHalf` > 0 for stage 1, whose middle is the hub's own front wall.
 */
function buildGateWall(b, hubHalf) {
  const t = GATE.wallTop
  const G = GATE_HALF
  const inner = hubHalf || G + GATE.tower
  for (const s of [-1, 1]) {
    const x0 = s > 0 ? inner : -GATE_WALL_HALF
    const x1 = s > 0 ? GATE_WALL_HALF : -inner
    b.box(x0, x1, -14, t, -1.5, 1.5, 'castle')
    for (let cx = x0 + 1; cx < x1 - 0.5; cx += 2.4) {
      b.box(cx - 0.6, cx + 0.6, t, t + 1.2, -1.5, -0.6, 'castle', { collide: false })
    }
    if (!hubHalf) {
      const tx0 = s > 0 ? G : -G - GATE.tower
      b.box(tx0, tx0 + GATE.tower, -14, t + 3, -2, 2, 'castle')
      b.shape('cone', b.world === 2 ? 'roofblue' : 'roofred', tx0 + GATE.tower / 2, t + 6, 0, {
        r: 3,
        h: 6,
        seg: 4,
        ry: Math.PI / 4,
      })
      b.torches.push(b.wp(s * (G + GATE.tower / 2), 5.8, 2.3))
    }
  }
  if (!hubHalf) {
    b.box(-G, G, GATE.lintelBottom, t, -1.3, 1.3, 'castle')
    b.box(-G, G, GATE.lintelBottom - 0.35, GATE.lintelBottom, -1.4, 1.4, 'gold', { collide: false })
    b.box(-GATE_WALL_HALF, GATE_WALL_HALF, t - 1.4, t - 0.8, -1.7, 1.7, 'gold', { collide: false })
  }
}

/* --- Stage assembly -------------------------------------------------------------- */

function buildStage(world, index, originZ) {
  const originX = world === 2 ? WORLD2_OFFSET_X : 0
  const def = STAGE_DEFS[world][index - 1]
  const b = new StageBuilder(world, index, originX, originZ, def.biome)
  const count = STAGE_COUNT[world]
  const recLevel = recommendedLevel(world, index)
  const ws = walkspeedFor(recLevel)
  const t = world === 1 ? (index - 1) / (count - 1) : lerp(0.55, 1, (index - 1) / (count - 1))
  const ctx = {
    t,
    ws,
    run: ws * STUD,
    sj: singleJumpDistance(ws),
    dj: doubleJumpDistance(ws),
    hintGrapple: world === 1 && index === 1,
  }
  const color = GATE_COLORS[(index - 1 + (world - 1) * 3) % GATE_COLORS.length]
  const W = b.W
  b.trim = `glow:${color}:1.5`
  ctx.recLevel = recLevel

  // --- Gate wall + wide start plaza.
  buildGateWall(b, index === 1 ? (world === 2 ? 25 : 33) : 0)
  b.platform(-Math.min(W, 20), Math.min(W, 20), 0, 14, 0, { trim: false })
  b.arrow(0, 0, 10)
  const checkpoint = b.wp(0, 0.1, 7)
  if (world === 1 && index === 1) {
    b.signs.push({ text: 'Walk to get faster!\nEvery step = +Speed', p: b.wp(-9, 2.6, 5), rot: 0.35 })
    b.signs.push({ text: 'Tap SPACE twice\nto Double Jump!', p: b.wp(9, 2.6, 9), rot: -0.35 })
  }
  b.d = 14

  segLeap(b, ctx)
  b.rest(ctx)
  def.segs.forEach((name, i) => {
    runSeg(b, ctx, name)
    if (i < def.segs.length - 1) b.rest(ctx)
  })

  // --- End plaza: runs right up to the next gate. Win pad left of the gate, double
  // pad right of it on a raised pedestal (one jump up) - same line, both sides.
  b.d += b.smallGap(ctx, 0.4, 1.2, 4)
  const hubStart = b.d
  const plazaLen = 16
  b.platform(-W + 1, W - 1, hubStart, hubStart + plazaLen, 0, { mat: 'stone', body: 'castle', trim: false })
  const wins = STAGE_WINS[world][index - 1]
  const padX = GATE_HALF + GATE.tower + 4.5
  const padD = hubStart + plazaLen - 4.5
  const pedestal = lerp(1.1, 1.8, t)
  const last = index === count
  b.platform(padX - 3, padX + 3, padD - 3, padD + 3, pedestal, { mat: 'gold', body: 'castle' })
  b.pads.push(
    { id: b.id('pad'), kind: 'win', wins, c: b.wp(-padX, 0.02, padD), s: [4.2, 0.12, 4.2] },
    { id: b.id('pad'), kind: 'double', wins: wins * 2, c: b.wp(padX, pedestal + 0.02, padD), s: [4, 0.12, 4] },
  )
  b.arrow(0, 0, hubStart + 4)
  b.d = hubStart + plazaLen
  const length = b.d
  if (last) {
    // The end of the world: a solid wall and a trophy sign instead of another gate.
    b.box(-GATE_WALL_HALF, GATE_WALL_HALF, -14, GATE.wallTop, length - 1.5, length + 1.5, 'castle')
    b.signs.push({
      text: world === 1 ? 'YOU ESCAPED!\nWorld 2 awaits' : 'TITAN KING\nDEFEATED!',
      p: b.wp(0, 9, length - 1.7),
      rot: 0,
      kind: 'finale',
    })
  }

  // Swimmable biomes get a solid river bed.
  if (b.biome.floor === 'water') b.box(-W - 2, W + 2, POOL_BOTTOM - 1, POOL_BOTTOM, 0, length, 'mossrock')

  buildWalls(b, length)
  scatterDecor(b, length)
  placeWalkers(b, length)
  aimArrows(b)

  // --- Floors: explicit zones (tide / pools), the biome's floor everywhere else.
  const base = b.biome.floor
  const baseExtra =
    base === 'water'
      ? { surface: WATER_SURFACE, bottom: POOL_BOTTOM, current: 0.38 * ctx.run }
      : base === 'quicksand'
        ? { surface: SAND_SURFACE }
        : {}
  const explicit = b.floors.sort((p, q) => p.d0 - q.d0)
  const floors = []
  let cur = 0
  for (const f of explicit) {
    if (f.d0 > cur) floors.push({ kind: base, d0: cur, d1: f.d0, ...baseExtra })
    floors.push(f)
    cur = f.d1
  }
  if (cur < length) floors.push({ kind: base, d0: cur, d1: length, ...baseExtra })
  for (const f of floors) {
    f.zTop = b.z(f.d0)
    f.zBot = b.z(f.d1)
  }

  return {
    world,
    index,
    key: `${world}-${index}`,
    name: def.name,
    biome: def.biome,
    half: W,
    color,
    recLevel,
    wins,
    originX,
    zStart: b.z(0),
    zEnd: b.z(length),
    length,
    checkpoint,
    colliders: b.colliders,
    iceColliders: b.iceColliders,
    cyls: b.cyls,
    visuals: b.visuals,
    shapes: b.shapes,
    floors,
    hooks: b.hooks,
    movers: b.movers,
    discs: b.discs,
    blinks: b.blinks,
    collapses: b.collapses,
    crushers: b.crushers,
    geysers: b.geysers,
    pendulums: b.pendulums,
    sweepers: b.sweepers,
    lasers: b.lasers,
    bounces: b.bounces,
    conveyors: b.conveyors,
    winds: b.winds,
    rollers: b.rollers,
    walkers: b.walkers,
    pads: b.pads,
    signs: b.signs,
    torches: b.torches,
    banners: b.banners,
    titans: b.titans,
    waterfalls: b.waterfalls,
    logs: b.logs,
    gauges: b.gauges,
    arrows: b.arrows,
  }
}

function buildWorldStages(world) {
  const stages = []
  let z = COURSE_START_Z[world]
  for (let i = 1; i <= STAGE_COUNT[world]; i += 1) {
    const stage = buildStage(world, i, z)
    stages.push(stage)
    z = stage.zEnd
  }
  return stages
}

export const STAGES = { 1: buildWorldStages(1), 2: buildWorldStages(2) }

export const ALL_HOOKS = [...STAGES[1], ...STAGES[2]].flatMap((s) => s.hooks)
export const ALL_PADS = [...STAGES[1], ...STAGES[2]].flatMap((s) =>
  s.pads.map((p) => ({ ...p, world: s.world, stage: s.index })),
)

/** Which stage of `world` contains world-Z `z`, or 0 when still in the hub. */
export function stageAt(world, z) {
  const list = STAGES[world]
  if (z > list[0].zStart) return 0
  for (const s of list) {
    if (z <= s.zStart && z >= s.zEnd) return s.index
  }
  return list[list.length - 1].index
}

/** The floor zone (lava / water / void / ...) under world-Z `z` in `stage`. */
export function floorAt(stage, z) {
  for (const f of stage.floors) {
    if (z <= f.zTop && z >= f.zBot) return f
  }
  return null
}
