import { HEROES } from '../config/heroes'
import {
  heroSlot,
  PORTAL_TO_W1,
  PORTAL_TO_W2,
  TREADMILL_LENGTH,
  TREADMILL_WIDTH,
  treadmillSlot,
} from '../config/layout'
import { ALL_PADS } from '../config/stages'
import { TREADMILLS } from '../config/treadmills'

/**
 * Every "walk into it" zone in the game as an axis-aligned box tested against the
 * player's feet each frame. Static data, so no physics sensors or event plumbing.
 *
 * { id, kind, min: [x,y,z], max: [x,y,z], ...payload }
 */
export const TRIGGERS = [
  ...TREADMILLS.map((t, i) => {
    const { x, z } = treadmillSlot(i)
    return {
      id: `tm:${t.id}`,
      kind: 'treadmill',
      treadmillId: t.id,
      min: [x - TREADMILL_LENGTH / 2, -0.5, z - TREADMILL_WIDTH / 2 + 0.25],
      max: [x + TREADMILL_LENGTH / 2, 1.2, z + TREADMILL_WIDTH / 2 - 0.25],
    }
  }),
  ...HEROES.map((h, i) => {
    const { x, y, z, tier } = heroSlot(i)
    return {
      id: `hero:${h.id}`,
      kind: 'hero',
      heroId: h.id,
      min: [tier.minX, y - 0.4, z - 2],
      max: [x + 0.8, y + 2, z + 2],
    }
  }),
  {
    id: 'portal:w2',
    kind: 'portal',
    to: 2,
    min: [PORTAL_TO_W2.pos[0] - 2.4, -0.5, PORTAL_TO_W2.pos[2] - 1.1],
    max: [PORTAL_TO_W2.pos[0] + 2.4, 5, PORTAL_TO_W2.pos[2] + 1.1],
  },
  {
    id: 'portal:w1',
    kind: 'portal',
    to: 1,
    min: [PORTAL_TO_W1.pos[0] - 2.4, -0.5, PORTAL_TO_W1.pos[2] - 1.1],
    max: [PORTAL_TO_W1.pos[0] + 2.4, 5, PORTAL_TO_W1.pos[2] + 1.1],
  },
  ...ALL_PADS.map((pad) => ({
    id: `pad:${pad.id}`,
    kind: 'pad',
    pad,
    min: [pad.c[0] - pad.s[0] / 2, pad.c[1] - 0.4, pad.c[2] - pad.s[2] / 2],
    max: [pad.c[0] + pad.s[0] / 2, pad.c[1] + 1.2, pad.c[2] + pad.s[2] / 2],
  })),
]

export function insideTrigger(t, p) {
  return (
    p.x >= t.min[0] && p.x <= t.max[0] &&
    p.y >= t.min[1] && p.y <= t.max[1] &&
    p.z >= t.min[2] && p.z <= t.max[2]
  )
}
