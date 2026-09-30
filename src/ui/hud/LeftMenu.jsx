import { MAX_LEVEL } from '../../config/progression'
import { dailyState, useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { formatNumber } from '../../utils/format'
import { TrophyIcon } from '../icons'
import { MENU } from './menu'

export function KeyCap({ k, className = '' }) {
  return <span className={`keycap ${className}`}>{k}</span>
}

function MenuTile({ item, badge, alert, onClick }) {
  const { Icon } = item
  return (
    <button type="button" onClick={onClick} className={`menu-tile ${item.tone}`} aria-label={`${item.label} (${item.key})`}>
      <span className="menu-tile-shine" />
      <span className="menu-tile-icon">
        <Icon size={3.4} />
      </span>
      <span className="ol menu-tile-label">{item.label}</span>
      <KeyCap k={item.key} className="absolute -left-[0.55em] -top-[0.55em]" />
      {badge && (
        <span className="ol-sm absolute -right-[0.5em] -top-[0.6em] rounded-full border-[0.14em] border-[var(--ink)] bg-[#1b1538] px-[0.35em] text-[0.95em]">
          {badge}
        </span>
      )}
      {alert && <span className="menu-tile-alert ol-sm anim-wiggle">!</span>}
    </button>
  )
}

/**
 * Wins counter + menu tiles, centred on the left edge (the top-left corner is kept
 * clear for the Bloxity host overlay).
 */
export function LeftMenu() {
  const wins = useProgress((s) => s.wins)
  const level = useProgress((s) => s.level)
  const rewardReady = useProgress((s) => !dailyState(s).claimedToday)
  const panel = useSession((s) => s.panel)
  const open = useSession((s) => s.openPanel)
  const close = useSession((s) => s.closePanel)
  const pct = Math.round((level / MAX_LEVEL) * 100)
  const toggle = (id) => (panel === id ? close() : open(id))

  return (
    <div className="pointer-events-auto absolute left-[1em] top-1/2 flex -translate-y-1/2 flex-col gap-[0.9em]">
      <button type="button" onClick={() => toggle('store')} className="wins-pill">
        <TrophyIcon size={2.6} />
        <span className="ol text-[2.1em] leading-none text-[#ffe45c]">{formatNumber(wins)}</span>
      </button>
      <div className="grid grid-cols-2 gap-x-[0.9em] gap-y-[1.1em]">
        {MENU.map((item) => (
          <MenuTile
            key={item.panel}
            item={item}
            badge={item.panel === 'rebirth' ? `${pct}%` : null}
            alert={(item.panel === 'rebirth' && level >= MAX_LEVEL) || (item.panel === 'rewards' && rewardReady)}
            onClick={() => toggle(item.panel)}
          />
        ))}
      </div>
    </div>
  )
}

export default LeftMenu
