import { create } from 'zustand'

import { AVATAR_ID, HERO_BY_ID, HEROES } from '../config/heroes'
import { WEAPON_BY_ID } from '../config/weapons'
import {
  MAX_LEVEL,
  DAILY_REWARDS,
  QUESTS,
  SPEED_PACKS,
  stepGainFor,
  UPGRADES,
  walkspeedFor,
  winMultiplierFor,
  WORLD2_UNLOCK,
  xpRequiredFor,
} from '../config/progression'

/**
 * Everything that is saved. Frontend-only for now: persisted to localStorage by
 * state/persistence.js, one save per Bloxity identity. Keep this shape flat and
 * JSON-safe so it can later move to the server unchanged.
 */
export const SAVE_VERSION = 1

/** Local calendar day, e.g. 2026-9-30. */
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

export function freshProgress() {
  return {
    version: SAVE_VERSION,
    speed: 0,
    level: 1,
    xp: 0,
    wins: 0,
    totalWins: 0,
    rebirths: 0,
    ownedHeroes: [],
    equipped: AVATAR_ID,
    ownedWeapons: ['blades'],
    weapon: 'blades',
    upgrades: {},
    world2: 0,
    customSpeed: null,
    bestStageW1: 0,
    bestStageW2: 0,
    bestClaimW1: 0,
    bestClaimW2: 0,
    questIndex: 0,
    questBase: 0,
    totalSteps: 0,
    bestSpeed: 0,
    playtime: 0,
    deaths: 0,
    /** Daily reward streak: days claimed this cycle, and the day of the last claim. */
    daily: { streak: 0, last: '' },
    settings: { graphics: 'high', popups: true, music: true, sfx: true },
  }
}

/* --- Pure helpers (usable outside React) ---------------------------------------- */

export const maxWalkspeed = (p) => walkspeedFor(p.level)
export const currentWalkspeed = (p) => {
  const max = maxWalkspeed(p)
  return p.customSpeed == null ? max : Math.min(Math.max(1, p.customSpeed), max)
}
export const maxJumps = (p) => 2 + (p.upgrades.tripleJump ? 1 : 0)
export const stepMultiplier = (p, treadmillMult = 1) =>
  treadmillMult * (p.upgrades.steps2x ? 2 : 1)
export const stepAmount = (p, treadmillMult = 1) =>
  stepGainFor(p.level) * stepMultiplier(p, treadmillMult)
export const winMultiplier = (p) => winMultiplierFor(p.rebirths) * (p.upgrades.wins2x ? 2 : 1)

/** A rotating "deal": one hero at 30% off, changing every 30 minutes. */
export const DEAL_WINDOW_MS = 30 * 60 * 1000
export const DEAL_DISCOUNT = 0.3
export function currentDeal(now = Date.now()) {
  const slot = Math.floor(now / DEAL_WINDOW_MS)
  const pool = HEROES.filter((h) => !h.requires)
  return {
    heroId: pool[slot % pool.length].id,
    endsAt: (slot + 1) * DEAL_WINDOW_MS,
  }
}
export function heroPrice(hero, now = Date.now()) {
  return currentDeal(now).heroId === hero.id
    ? Math.round(hero.price * (1 - DEAL_DISCOUNT))
    : hero.price
}

/** Why a hero can't be bought yet, or null. */
export function heroLockReason(hero, p) {
  const req = hero.requires
  if (!req) return null
  if (req.world2 && !p.world2) return 'Unlock World 2'
  if (req.rebirths && p.rebirths < req.rebirths) return `Rebirth ${req.rebirths}+`
  return null
}

export function world2Checks(p) {
  return [
    { label: `Beat World 1 Stage ${WORLD2_UNLOCK.stage}`, ok: p.bestClaimW1 >= WORLD2_UNLOCK.stage },
    { label: `Rebirth ${WORLD2_UNLOCK.rebirths} time`, ok: p.rebirths >= WORLD2_UNLOCK.rebirths },
    { label: `Pay ${WORLD2_UNLOCK.cost} Wins`, ok: p.wins >= WORLD2_UNLOCK.cost },
  ]
}

/**
 * Where the player is in the daily streak: `index` is today's reward (0-6),
 * `claimedToday` whether it's been taken, `nextAt` when the next one unlocks (ms).
 */
export function dailyState(p, now = new Date()) {
  const today = dayKey(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const { streak = 0, last = '' } = p.daily || {}
  if (last === today) return { index: streak - 1, claimedToday: true, nextAt: midnight.getTime() }
  const continues = last === dayKey(yesterday) && streak < DAILY_REWARDS.length
  return { index: continues ? streak : 0, claimedToday: false, nextAt: midnight.getTime() }
}

export function questStat(p, stat) {
  if (stat === 'heroesOwned') return p.ownedHeroes.length
  return p[stat] ?? 0
}

export function questProgress(p) {
  const quest = QUESTS[p.questIndex]
  if (!quest) return null
  const raw = questStat(p, quest.stat)
  const value = quest.delta ? raw - p.questBase : raw
  return { quest, value: Math.max(0, Math.min(value, quest.target)) }
}

/* --- Store -------------------------------------------------------------------- */

export const useProgress = create((set, get) => ({
  ...freshProgress(),

  /** Latest level-up, for the splash. `seq` changes on every event. */
  levelUpEvent: null,
  /** Latest quest completion, for the toast. */
  questEvent: null,

  load: (data) => {
    const base = freshProgress()
    const merged = { ...base, ...(data || {}) }
    merged.upgrades = { ...base.upgrades, ...(data?.upgrades || {}) }
    merged.settings = { ...base.settings, ...(data?.settings || {}) }
    merged.daily = { ...base.daily, ...(data?.daily || {}) }
    if (!merged.ownedWeapons.includes('blades')) merged.ownedWeapons = ['blades', ...merged.ownedWeapons]
    merged.level = Math.min(Math.max(1, merged.level | 0), MAX_LEVEL)
    set({ ...merged, levelUpEvent: null, questEvent: null })
  },

  /** Speed from steps or packs; fills the level bar (levels can chain). */
  addSpeed: (amount, { fromStep = false } = {}) => {
    const p = get()
    let { level, xp } = p
    const from = level
    const speed = p.speed + amount
    if (level < MAX_LEVEL) {
      xp += amount
      while (level < MAX_LEVEL && xp >= xpRequiredFor(level)) {
        xp -= xpRequiredFor(level)
        level += 1
      }
      if (level >= MAX_LEVEL) xp = 0
    }
    const patch = {
      speed,
      level,
      xp,
      bestSpeed: Math.max(p.bestSpeed, speed),
      totalSteps: p.totalSteps + (fromStep ? 1 : 0),
    }
    if (level !== from) {
      patch.levelUpEvent = {
        from,
        to: level,
        ws0: walkspeedFor(from),
        ws1: walkspeedFor(level),
        seq: (p.levelUpEvent?.seq || 0) + 1,
      }
      // A player sitting at max walkspeed keeps tracking the max.
      if (p.customSpeed != null && p.customSpeed >= walkspeedFor(from)) patch.customSpeed = null
    }
    set(patch)
    get().checkQuest()
  },

  addWins: (amount) => {
    const p = get()
    set({ wins: p.wins + amount, totalWins: p.totalWins + amount })
    get().checkQuest()
  },

  /** Win pad touched. Returns the wins actually paid out. */
  claimPad: (pad) => {
    const p = get()
    const amount = Math.round(pad.wins * winMultiplier(p))
    const claimKey = pad.world === 2 ? 'bestClaimW2' : 'bestClaimW1'
    set({
      wins: p.wins + amount,
      totalWins: p.totalWins + amount,
      [claimKey]: Math.max(p[claimKey], pad.stage),
    })
    get().checkQuest()
    return amount
  },

  reachStage: (world, stage) => {
    const key = world === 2 ? 'bestStageW2' : 'bestStageW1'
    if (stage > get()[key]) {
      set({ [key]: stage })
      get().checkQuest()
    }
  },

  canRebirth: () => get().level >= MAX_LEVEL,
  rebirth: () => {
    const p = get()
    if (p.level < MAX_LEVEL) return false
    // Back to a level-1 character: +1 per step, starting walkspeed.
    set({ level: 1, xp: 0, speed: 0, rebirths: p.rebirths + 1, customSpeed: null })
    get().checkQuest()
    return true
  },

  spend: (cost) => {
    const p = get()
    if (p.wins < cost) return false
    set({ wins: p.wins - cost })
    return true
  },

  buyHero: (id) => {
    const p = get()
    const hero = HERO_BY_ID[id]
    if (!hero || p.ownedHeroes.includes(id) || heroLockReason(hero, p)) return false
    if (!get().spend(heroPrice(hero))) return false
    set({ ownedHeroes: [...get().ownedHeroes, id], equipped: id })
    get().checkQuest()
    return true
  },

  equip: (id) => {
    if (id === AVATAR_ID || get().ownedHeroes.includes(id)) set({ equipped: id })
  },

  buyWeapon: (id) => {
    const p = get()
    const w = WEAPON_BY_ID[id]
    if (!w || p.ownedWeapons.includes(id)) return false
    if (!get().spend(w.price)) return false
    set({ ownedWeapons: [...get().ownedWeapons, id], weapon: id })
    return true
  },

  equipWeapon: (id) => {
    if (get().ownedWeapons.includes(id)) set({ weapon: id })
  },

  buySpeedPack: (id) => {
    const pack = SPEED_PACKS.find((x) => x.id === id)
    if (!pack || !get().spend(pack.cost)) return false
    get().addSpeed(pack.amount)
    return true
  },

  buyUpgrade: (id) => {
    const up = UPGRADES.find((x) => x.id === id)
    if (!up || get().upgrades[id] || !get().spend(up.cost)) return false
    set({ upgrades: { ...get().upgrades, [id]: true } })
    return true
  },

  unlockWorld2: () => {
    const p = get()
    if (p.world2) return true
    if (!world2Checks(p).every((c) => c.ok)) return false
    set({ wins: p.wins - WORLD2_UNLOCK.cost, world2: 1 })
    get().checkQuest()
    return true
  },

  setCustomSpeed: (value) => {
    const max = maxWalkspeed(get())
    const n = Math.round(Number(value))
    if (!Number.isFinite(n)) return
    set({ customSpeed: n >= max ? null : Math.max(1, n) })
  },

  recordDeath: () => set({ deaths: get().deaths + 1 }),

  tickPlaytime: (seconds) => set({ playtime: get().playtime + seconds }),

  /** Claims today's daily reward. Returns the reward, or null if already claimed. */
  claimDaily: () => {
    const d = dailyState(get())
    if (d.claimedToday) return null
    const reward = DAILY_REWARDS[d.index]
    set({ daily: { streak: d.index + 1, last: dayKey(new Date()) } })
    if (reward.wins) get().addWins(reward.wins)
    if (reward.speed) get().addSpeed(reward.speed)
    return reward
  },

  /** Advances the quest chain (possibly several quests at once). */
  checkQuest: () => {
    for (let guard = 0; guard < QUESTS.length; guard += 1) {
      const p = get()
      const progress = questProgress(p)
      if (!progress || progress.value < progress.quest.target) return
      const { quest } = progress
      const nextIndex = p.questIndex + 1
      const next = QUESTS[nextIndex]
      // Baseline taken after the reward lands, so the payout doesn't count toward
      // the next "get N wins" quest.
      const after = { ...p, wins: p.wins + quest.reward, totalWins: p.totalWins + quest.reward }
      set({
        questIndex: nextIndex,
        questBase: next ? questStat(after, next.stat) : 0,
        wins: after.wins,
        totalWins: after.totalWins,
        questEvent: { label: quest.label, reward: quest.reward, seq: (p.questEvent?.seq || 0) + 1 },
      })
    }
  },

  setSetting: (key, value) => set({ settings: { ...get().settings, [key]: value } }),
}))

/** The saveable slice (drops actions and transient events). */
export function snapshotProgress() {
  const s = useProgress.getState()
  const out = {}
  for (const key of Object.keys(freshProgress())) out[key] = s[key]
  return out
}
