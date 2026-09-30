import { Vector3 } from 'three'

/**
 * Per-frame facts shared across the scene *without* React: the controller writes,
 * obstacles / barriers / culling read inside their own useFrame.
 */
export const playerState = {
  /** Feet position. */
  pos: new Vector3(0, 0, 22),
  world: 1,
  /** Last stage barrier crossed: { key, t, x, y } - drives the barrier ripple. */
  barrierHit: null,
  /** Last water entry: { t, x, y, z } - drives the splash. */
  splash: null,
}

/**
 * Rigid-body handle -> what that body is, for bodies the player reacts to when
 * standing on them:
 *   { kind: 'mover', vel: {x, z} }       moving platform (vel updated per frame)
 *   { kind: 'disc', cx, cz, w }          spinning disc
 *   { kind: 'conveyor', v: {x, z} }      belt
 *   { kind: 'collapse', id }             crumbling tile
 *   { kind: 'bounce', id, v }            launch pad
 *   { kind: 'ice' }                      slippery floor
 */
export const bodyTags = new Map()

/** Launch-pad id -> time it last fired (for its squash animation). */
export const bounceHits = new Map()

/** Stage keys ('1-4') currently near enough to draw and animate. */
export const activeStages = new Set()
