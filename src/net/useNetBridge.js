import { useEffect } from 'react'

import { useBloxity } from '../bloxity/BloxityContext'
import { useBloxityStore } from '../bloxity/store'
import { useProgress } from '../state/progressStore'
import { sendFx, sendProfile, startNet } from './net'

/** What other players need to draw us and fill the lobby boards. */
function profileNow(identity) {
  const p = useProgress.getState()
  const b = useBloxityStore.getState()
  return {
    name: identity?.displayName || identity?.username || 'Guest',
    userId: String(identity?.id ?? identity?._id ?? ''),
    hero: p.equipped,
    weapon: p.weapon,
    level: p.level,
    rebirths: p.rebirths,
    bestSpeed: Math.floor(p.bestSpeed),
    totalWins: p.totalWins,
    playtime: Math.floor(p.playtime / 60) * 60,
    avatar: { equipped: b.equipped || {}, proportions: b.proportions || {} },
  }
}

const SHARED = ['hero', 'weapon', 'level', 'rebirths', 'bestSpeed', 'totalWins', 'playtime']

/**
 * Joins a lobby once the game has loaded (and the save for this identity is in),
 * then keeps our profile fresh and announces the big moments to the lobby.
 */
export function useNetBridge(saveLoaded) {
  const { identity, status } = useBloxity()
  const sdkSettled = status === 'ready' || status === 'error'

  useEffect(() => {
    if (!saveLoaded || !sdkSettled) return undefined
    startNet(() => profileNow(identity))

    let last = profileNow(identity)
    let timer = null
    const flush = () => {
      timer = null
      const now = profileNow(identity)
      const patch = {}
      for (const k of SHARED) if (now[k] !== last[k]) patch[k] = now[k]
      if (now.name !== last.name) patch.name = now.name
      if (JSON.stringify(now.avatar) !== JSON.stringify(last.avatar)) patch.avatar = now.avatar
      last = now
      if (Object.keys(patch).length) sendProfile(patch)
    }
    const queue = () => {
      if (!timer) timer = setTimeout(flush, 1200)
    }
    const unsubProgress = useProgress.subscribe((s, prev) => {
      if (s.levelUpEvent && s.levelUpEvent !== prev.levelUpEvent) sendFx('levelup')
      if (s.rebirths > prev.rebirths) sendFx('rebirth')
      if (s.totalWins > prev.totalWins) sendFx('win')
      queue()
    })
    const unsubAvatar = useBloxityStore.subscribe(queue)
    queue()
    return () => {
      unsubProgress()
      unsubAvatar()
      clearTimeout(timer)
    }
  }, [saveLoaded, sdkSettled, identity])
}
