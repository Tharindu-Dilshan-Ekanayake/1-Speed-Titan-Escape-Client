import { useEffect } from 'react'

import { SPEED_PACKS } from '../../config/progression'
import { useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { formatNumber } from '../../utils/format'
import { MENU } from './menu'

/**
 * Menu hotkeys (shown as keycaps on the tiles): R H B G T I toggle panels, 1-4 buy
 * Speed packs. Ignored while typing, and never on movement / action keys.
 */
export function useHotkeys() {
  useEffect(() => {
    const byKey = Object.fromEntries(MENU.map((m) => [`Key${m.key}`, m.panel]))
    const onKey = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      const session = useSession.getState()
      if (session.dead) return
      const panel = byKey[e.code]
      if (panel) {
        if (session.panel === panel) session.closePanel()
        else session.openPanel(panel)
        return
      }
      const n = Number(e.key)
      if (n >= 1 && n <= SPEED_PACKS.length && !session.panel) {
        const pack = SPEED_PACKS[n - 1]
        const progress = useProgress.getState()
        if (progress.buySpeedPack(pack.id)) session.toast(`+${formatNumber(pack.amount)} Speed!`, '#39d7ff', 'shoe')
        else session.toast(`Need ${pack.cost - progress.wins} more Wins`, '#ff6b6b')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
