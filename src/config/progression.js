/**
 * Progression tuning. Every number a designer might want to tweak lives here.
 *
 * Two different "speeds" exist, mirroring the original game:
 *   - Speed (the big HUD stat, "3.71K Speed"): earned per step, fills the level bar.
 *   - Walkspeed (studs/s): how fast the character actually moves. Comes ONLY from
 *     level - heroes never change it.
 */

export const MAX_LEVEL = 15

/**
 * Speed gained per step at each level (index 0 = level 1).
 * Level 1 gives +1, level 15 gives +10, rising steadily in between.
 */
export const STEP_GAIN = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 7.5, 8, 9, 10]

/** Speed needed to go from level L to L+1 (index 0 = level 1 -> 2). */
export const XP_REQUIRED = Array.from({ length: MAX_LEVEL - 1 }, (_, i) =>
  Math.round(25 * Math.pow(1.5, i)),
)

/** Walkspeed in studs/s. Level 1 = 16 (Roblox default), +2 per level -> 44 at 15. */
export const BASE_WALKSPEED = 16
export const WALKSPEED_PER_LEVEL = 2

/** One stud in world units. The character is 1.8 units tall (~5 studs). */
export const STUD = 0.36

export const stepGainFor = (level) => STEP_GAIN[Math.min(Math.max(level, 1), MAX_LEVEL) - 1]
export const xpRequiredFor = (level) => (level >= MAX_LEVEL ? Infinity : XP_REQUIRED[level - 1])
export const walkspeedFor = (level) =>
  BASE_WALKSPEED + (Math.min(Math.max(level, 1), MAX_LEVEL) - 1) * WALKSPEED_PER_LEVEL

/* --- Movement physics (world units) ------------------------------------------ */
export const GRAVITY = -32
export const JUMP_VELOCITY = 11
export const BASE_MAX_JUMPS = 2

/** Horizontal distance of one jump at `walkspeed`, landing at take-off height. */
export function singleJumpDistance(walkspeed) {
  return walkspeed * STUD * ((2 * JUMP_VELOCITY) / -GRAVITY)
}

/** Best-case double jump (second jump at the apex). */
export function doubleJumpDistance(walkspeed) {
  const g = -GRAVITY
  const rise = JUMP_VELOCITY / g
  const apex = (JUMP_VELOCITY * JUMP_VELOCITY) / (2 * g)
  const fall = Math.sqrt((2 * (apex * 2)) / g)
  return walkspeed * STUD * (rise + rise + fall)
}

/* --- Rebirth ------------------------------------------------------------------ */
/**
 * Rebirth resets level, speed and walkspeed back to level 1 (so a step is +1 again).
 * The permanent reward is a wins multiplier.
 */
export const REBIRTH_WIN_BONUS = 0.25
export const winMultiplierFor = (rebirths) => 1 + rebirths * REBIRTH_WIN_BONUS

/* --- Wins shop --------------------------------------------------------------- */
/** "+Speed" packs bought with wins (bux can't be used in this game). */
export const SPEED_PACKS = [
  { id: 'p100', amount: 100, cost: 5 },
  { id: 'p1k', amount: 1_000, cost: 30 },
  { id: 'p10k', amount: 10_000, cost: 200 },
  { id: 'p100k', amount: 100_000, cost: 1_200 },
]

export const UPGRADES = [
  {
    id: 'steps2x',
    name: '2x Steps',
    desc: 'Every step gives double Speed.',
    cost: 150,
    theme: 'orange',
  },
  {
    id: 'wins2x',
    name: '2x Wins',
    desc: 'Every win pad pays double.',
    cost: 300,
    theme: 'yellow',
  },
  {
    id: 'tripleJump',
    name: 'Triple Jump',
    desc: 'One extra jump in mid-air.',
    cost: 120,
    theme: 'blue',
  },
  {
    id: 'infRevive',
    name: '∞ Revives',
    desc: 'Revive at the checkpoint for free, forever.',
    cost: 400,
    theme: 'red',
  },
]

/* --- World 2 ----------------------------------------------------------------- */
export const WORLD2_UNLOCK = {
  /** Must have claimed the World 1 stage-20 pad at least once. */
  stage: 20,
  rebirths: 1,
  cost: 500,
}

/* --- Revive ------------------------------------------------------------------ */
export const reviveCost = (world, stage) => Math.ceil((2 + stage * 0.5) * (world === 2 ? 2 : 1))

/* --- Daily rewards ------------------------------------------------------------- */
/**
 * One claim per calendar day, on a 7-day streak. Missing a day starts the streak
 * over at day 1; after day 7 it loops back to day 1.
 */
export const DAILY_REWARDS = [
  { day: 1, wins: 10 },
  { day: 2, wins: 20 },
  { day: 3, speed: 2_000 },
  { day: 4, wins: 40 },
  { day: 5, wins: 75 },
  { day: 6, speed: 25_000 },
  { day: 7, wins: 200, big: true },
]

/* --- Quest chain --------------------------------------------------------------- */
/**
 * `stat` is read off the progress store; `delta` quests count from the value the
 * stat had when the quest started, the others compare the absolute value.
 */
export const QUESTS = [
  { id: 'q1', label: 'Get 3 Wins', stat: 'totalWins', target: 3, delta: true, reward: 5 },
  { id: 'q2', label: 'Reach Level 5', stat: 'level', target: 5, reward: 10 },
  { id: 'q3', label: 'Get 25 Wins', stat: 'totalWins', target: 25, delta: true, reward: 15 },
  { id: 'q4', label: 'Reach Stage 8', stat: 'bestStageW1', target: 8, reward: 25 },
  { id: 'q5', label: 'Reach Level 15', stat: 'level', target: 15, reward: 40 },
  { id: 'q6', label: 'Rebirth once', stat: 'rebirths', target: 1, reward: 50 },
  { id: 'q7', label: 'Buy your first Hero', stat: 'heroesOwned', target: 1, reward: 60 },
  { id: 'q8', label: 'Get 250 Wins', stat: 'totalWins', target: 250, delta: true, reward: 80 },
  { id: 'q9', label: 'Beat World 1 Stage 20', stat: 'bestClaimW1', target: 20, reward: 150 },
  { id: 'q10', label: 'Unlock World 2', stat: 'world2', target: 1, reward: 200 },
  { id: 'q11', label: 'Reach World 2 Stage 5', stat: 'bestStageW2', target: 5, reward: 300 },
  { id: 'q12', label: 'Rebirth 5 times', stat: 'rebirths', target: 5, reward: 500 },
]
