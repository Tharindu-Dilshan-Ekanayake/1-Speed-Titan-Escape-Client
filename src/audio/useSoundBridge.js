import { useEffect } from 'react'

import { useProgress } from '../state/progressStore'
import { useSession } from '../state/sessionStore'
import { sound } from './sound'

/**
 * Game events -> sounds, and the audio settings -> the mixer. UI clicks are
 * caught once at the document level so every chunky button clicks.
 */
export function useSoundBridge() {
  const music = useProgress((s) => s.settings.music)
  const sfx = useProgress((s) => s.settings.sfx)

  useEffect(() => sound.setMusic(music !== false), [music])
  useEffect(() => sound.setSfx(sfx !== false), [sfx])

  useEffect(() => {
    const unsubProgress = useProgress.subscribe((s, prev) => {
      if (s.levelUpEvent && s.levelUpEvent !== prev.levelUpEvent) sound.play('levelup', 0.2)
      if (s.rebirths > prev.rebirths) sound.play('rebirth')
      if (s.questEvent && s.questEvent !== prev.questEvent) sound.play('win', 0.3)
      const bought =
        s.ownedHeroes.length > prev.ownedHeroes.length ||
        s.ownedWeapons.length > prev.ownedWeapons.length ||
        Object.keys(s.upgrades).length > Object.keys(prev.upgrades).length
      if (bought) sound.play('buy')
    })
    const unsubSession = useSession.subscribe((s, prev) => {
      if (s.winFlash && s.winFlash !== prev.winFlash) sound.play('win', 0.3)
      if (s.panel && s.panel !== prev.panel) sound.play('open', 0.1)
      const t = s.toasts[s.toasts.length - 1]
      if (t && t !== prev.toasts[prev.toasts.length - 1] && t.icon === 'lock') sound.play('deny', 0.2)
      if (t && t !== prev.toasts[prev.toasts.length - 1] && t.color === '#ff6b6b') sound.play('deny', 0.2)
    })
    const onDown = (e) => {
      if (e.target.closest?.('.btn, .icon-btn, .menu-tile, .sound-btn')) sound.play('click', 0.05)
    }
    document.addEventListener('pointerdown', onDown)
    return () => {
      unsubProgress()
      unsubSession()
      document.removeEventListener('pointerdown', onDown)
    }
  }, [])
}
