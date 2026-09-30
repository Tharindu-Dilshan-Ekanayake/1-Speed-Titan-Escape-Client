import { useEffect } from 'react'

import { useSession } from '../state/sessionStore'
import { formatNumber } from '../utils/format'
import { CloseIcon, TrophyIcon } from './icons'

/** Trophy + amount, the in-game currency tag. */
export function WinsTag({ amount, size = 1, className = '', strike = null }) {
  return (
    <span className={`inline-flex items-center gap-[0.2em] ${className}`} style={{ fontSize: `${size}em` }}>
      <TrophyIcon size={1.25} />
      {strike != null && <s className="ol-sm text-[0.75em] text-white/70">{formatNumber(strike)}</s>}
      <span className="ol-sm text-[#ffe45c]">{formatNumber(amount)}</span>
    </span>
  )
}

/**
 * Modal panel with the original's chunky header bar.
 * `tone` is one of the .b-* button colour classes.
 */
export function Panel({ title, icon, tone = 'b-purple', children, width = 58 }) {
  const close = useSession((s) => s.closePanel)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-[#0c0820]/45 backdrop-blur-[2px]"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div className="panel anim-pop flex max-h-[86vh] flex-col overflow-hidden" style={{ width: `min(94vw, ${width}em)` }}>
        <div className={`${tone} flex items-center gap-[0.6em] border-b-[0.22em] border-[var(--ink)] px-[1em] py-[0.5em]`}>
          {icon}
          <h2 className="ol title-font flex-1 text-[2.3em] leading-none">{title}</h2>
          <button type="button" onClick={close} className="btn b-red flex h-[2.6em] w-[2.6em] items-center justify-center p-0" aria-label="Close">
            <CloseIcon size={1.5} />
          </button>
        </div>
        <div className="panel-scroll overflow-y-auto p-[1.1em]">{children}</div>
      </div>
    </div>
  )
}

/** A thin cyan progress bar with ink border. */
export function Bar({ value, max, color = 'linear-gradient(180deg,#7ff0ff,#12b6e8)', height = 1.2 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="checker relative overflow-hidden rounded-full border-[0.18em] border-[var(--ink)] bg-[#1b1538]" style={{ height: `${height}em` }}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}
