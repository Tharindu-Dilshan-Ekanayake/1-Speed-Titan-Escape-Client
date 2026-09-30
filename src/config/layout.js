/**
 * Fixed world layout. Units are world units (the character is 1.8 tall).
 *
 * World 1 hub (the castle hall) sits at the origin; its stage corridor runs from the
 * hall's front wall toward -Z. World 2 is a separate ice hub far off along +X so the
 * two never share a view.
 */

export const LOBBY = { minX: -32, maxX: 32, minZ: -38, maxZ: 38, wallHeight: 22 }

/** Where each world's course begins (the hall's front wall line). */
export const COURSE_START_Z = { 1: LOBBY.minZ, 2: -24 }

export const WORLD2_OFFSET_X = 1400
export const WORLD2_HUB = { minX: -24, maxX: 24, minZ: -24, maxZ: 26, wallHeight: 20 }

/**
 * Spawn points: [x, y, z] of the feet, plus the camera yaw to face (FollowCamera's
 * orbit yaw: 0 = looking toward -Z, +PI/2 = looking toward -X).
 */
export const SPAWNS = {
  lobby: { pos: [0, 0.1, 22], yaw: 0 },
  training: { pos: [-18, 0.1, 0], yaw: Math.PI / 2 },
  heroes: { pos: [12, 0.1, 0], yaw: -Math.PI / 2 },
  world1: { pos: [0, 0.1, LOBBY.minZ - 4], yaw: 0 },
  world2: { pos: [WORLD2_OFFSET_X, 0.1, 12], yaw: 0 },
}

/* --- Training treadmills -------------------------------------------------------- */
export const TREADMILL_LENGTH = 7
export const TREADMILL_WIDTH = 3.4
export const TREADMILL_TOP = 0.2
/** Treadmills line the left wall; you run toward the wall (facing -X). */
export const treadmillSlot = (i) => ({
  x: LOBBY.minX + 1.5 + TREADMILL_LENGTH / 2,
  z: -21.7 + i * 6.2,
})

/* --- Hero hall -------------------------------------------------------------------- */
/** Three bleacher tiers against the right wall, four heroes per tier. */
export const HERO_TIERS = [
  { minX: 17, maxX: 21.5, top: 0.6 },
  { minX: 21.5, maxX: 26, top: 1.3 },
  { minX: 26, maxX: LOBBY.maxX, top: 2.0 },
]
export const HERO_ROW_Z = [-15, -5, 5, 15]
export const heroSlot = (i) => {
  const tier = HERO_TIERS[Math.floor(i / 4)]
  return {
    x: (tier.minX + tier.maxX) / 2 + 0.6,
    y: tier.top,
    z: HERO_ROW_Z[i % 4],
    tier,
  }
}

/* --- Portals ---------------------------------------------------------------------- */
export const PORTAL_TO_W2 = { pos: [-24, 0, -31], radius: 3.4 }
export const PORTAL_TO_W1 = { pos: [WORLD2_OFFSET_X - 13, 0, 18], radius: 3.2 }

/* --- Personal record boards (on the lobby's back wall, under the windows) --------- */
export const RECORD_BOARDS = [
  { stat: 'speed', title: 'TOP SPEED', color: '#39d7ff', pos: [-16, 0, LOBBY.maxZ - 0.35] },
  { stat: 'playtime', title: 'TOP PLAYTIME', color: '#4dff7a', pos: [0, 0, LOBBY.maxZ - 0.35] },
  { stat: 'wins', title: 'TOP WINS', color: '#ffd43a', pos: [16, 0, LOBBY.maxZ - 0.35] },
]
