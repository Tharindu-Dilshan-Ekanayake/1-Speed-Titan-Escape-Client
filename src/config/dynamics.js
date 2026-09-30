/**
 * Time-driven obstacle motion.
 *
 * Pure functions of the shared game clock (`timeUniform.value`), used both by the
 * renderers and by the player's hit tests - so what you see swinging is exactly
 * what can hit you, with no physics-sync lag.
 */

export const TAU = Math.PI * 2
const frac = (x) => x - Math.floor(x)
const smooth = (x) => x * x * (3 - 2 * x)

/** Moving platform: 0..1 along its track, eased at both ends. */
export const moverK = (m, t) => (1 - Math.cos(frac(t / m.period + m.phase) * TAU)) / 2

/** Rotating disc / laser / sweeper angle (radians). */
export const discAngle = (d, t) => d.phase + d.w * t
export const laserAngle = (l, t) => l.phase + l.w * t

/** Blinking platform: solid while `on`; `warn` flickers during its last 0.6s. */
export function blinkState(b, t) {
  const u = frac(t / b.period + b.phase)
  const on = u < b.duty
  return { on, warn: on && u > b.duty - 0.6 / b.period, u }
}

/** Titan fist crusher phases (fractions of one period). */
export const CRUSH = { warn: 0.4, slam: 0.55, down: 0.62, rise: 0.8 }

export function crusherState(c, t) {
  const u = frac(t / c.period + c.phase)
  let k = 0 // 0 = raised, 1 = slammed down
  if (u >= CRUSH.slam && u < CRUSH.down) {
    const x = (u - CRUSH.slam) / (CRUSH.down - CRUSH.slam)
    k = x * x
  } else if (u >= CRUSH.down && u < CRUSH.rise) {
    k = 1
  } else if (u >= CRUSH.rise) {
    k = 1 - smooth((u - CRUSH.rise) / (1 - CRUSH.rise))
  }
  return {
    k,
    bottom: c.top + (c.rest - c.top) * k,
    warn: u >= CRUSH.warn && u < CRUSH.slam,
    /** 0..1 over the half second after impact (dust ring), else -1. */
    impact: u >= CRUSH.down && u < CRUSH.down + 0.5 / c.period ? (u - CRUSH.down) * c.period * 2 : -1,
  }
}

/** Lava geyser: phase 0 idle, 1 rumbling warning, 2 erupting (k = column height 0..1). */
export function geyserState(g, t) {
  const u = frac(t / g.period + g.phase)
  if (u < 0.55) return { phase: 0, k: 0 }
  if (u < 0.75) return { phase: 1, k: (u - 0.55) / 0.2 }
  const e = (u - 0.75) / 0.25
  return { phase: 2, k: Math.min(1, e * 6) * Math.min(1, (1 - e) * 5) }
}

export const pendulumAngle = (p, t) => p.amp * Math.sin(p.w * t + p.phase)
/** Sign of the blade's sideways velocity right now. */
export const pendulumDir = (p, t) => Math.sign(Math.cos(p.w * t + p.phase)) || 1

/** Lava tide surface height: drains to `low`, floods to `high`. */
export function tideHeight(f, t) {
  const u = frac(t / f.period + f.phase)
  return f.low + ((f.high - f.low) * (1 - Math.cos(u * TAU))) / 2
}
/** +1 while the tide is rising. */
export const tideRising = (f, t) => (frac(t / f.period + f.phase) < 0.5 ? 1 : -1)

/** Wind strength multiplier: strong gusts with near-calm lulls in between to dash in. */
export const windGust = (w, t) => 0.2 + 0.8 * Math.max(0, Math.sin(t * 1.1 + w.phase))

/* --- Collapsing tiles ------------------------------------------------------------- *
 * Stateful (they fall when *stepped on*), so the player writes the trigger time and
 * the tile renders from it.                                                         */

export const collapseTriggers = new Map()
export const COLLAPSE = { shake: 0.45, fall: 1.7, gone: 4.2, back: 4.8 }

export function collapseState(id, t) {
  const t0 = collapseTriggers.get(id)
  if (t0 === undefined) return { phase: 'idle', p: 0 }
  const p = t - t0
  if (p < COLLAPSE.shake) return { phase: 'shake', p: p / COLLAPSE.shake }
  if (p < COLLAPSE.fall) return { phase: 'fall', p: p - COLLAPSE.shake }
  if (p < COLLAPSE.gone) return { phase: 'gone', p: 0 }
  if (p < COLLAPSE.back) return { phase: 'back', p: (p - COLLAPSE.gone) / (COLLAPSE.back - COLLAPSE.gone) }
  collapseTriggers.delete(id)
  return { phase: 'idle', p: 0 }
}

/* --- Rolling boulders --------------------------------------------------------------- */
/** Boulder travelling from `z0` to `z1` (then respawning at z0). */
export function rollerZ(r, t) {
  return r.z0 + (r.z1 - r.z0) * frac(t / r.period + r.phase)
}

/* --- Walking titans (scenery that also marks the no-go ground) ----------------------- */
export function walkerState(w, t) {
  const u = frac(t / w.period + w.phase)
  const k = (1 - Math.cos(u * TAU)) / 2
  return { z: w.z0 + (w.z1 - w.z0) * k, dir: u < 0.5 ? 1 : -1, stride: t * w.stride }
}
