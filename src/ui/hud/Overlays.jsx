import { useEffect, useState } from 'react'

import { SPAWNS } from '../../config/layout'
import { reviveCost } from '../../config/progression'
import { STAGES } from '../../config/stages'
import { useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { formatNumber } from '../../utils/format'
import { WinsTag } from '../common'
import { CloseIcon, HeartIcon, LevelUpIcon, LockIcon, ShoeIcon, TrophyIcon } from '../icons'

export function StepPopups() {
  const popups = useSession((s) => s.stepPopups)
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {popups.map((p) => (
        <div
          key={p.id}
          className="absolute flex items-center gap-[0.2em]"
          style={{ left: `${p.x}%`, top: `${p.y}%`, animation: 'float-up 1.1s ease-out forwards' }}
        >
          <ShoeIcon size={2.6} />
          <span className="ol text-[2.2em]">+{formatNumber(p.amount)}</span>
        </div>
      ))}
    </div>
  )
}

/** "LEVEL 11 ▶ 12 / WALKSPEED 25 ▶ 26" splash. */
export function LevelUpSplash() {
  const shown = useProgress((s) => s.levelUpEvent)
  const [doneSeq, setDoneSeq] = useState(0)
  useEffect(() => {
    if (!shown) return undefined
    const id = setTimeout(() => setDoneSeq(shown.seq), 2400)
    return () => clearTimeout(id)
  }, [shown])
  if (!shown || doneSeq === shown.seq) return null
  return (
    <div key={shown.seq} className="pointer-events-none absolute left-1/2 top-[9%] flex -translate-x-1/2 items-center gap-[1em]" style={{ animation: 'banner 2.4s ease-out forwards' }}>
      <LevelUpIcon size={8} />
      <div className="flex flex-col items-center">
        <span className="ol title-font whitespace-nowrap text-[6em] leading-none" style={{ color: '#7dff6b' }}>
          LEVEL {shown.from} ▶ {shown.to}
        </span>
        <span className="ol whitespace-nowrap text-[2.6em] leading-none">
          WALKSPEED {shown.ws0} ▶ {shown.ws1}
        </span>
      </div>
    </div>
  )
}

export function StageBanner() {
  const banner = useSession((s) => s.banner)
  if (!banner) return null
  return (
    <div key={banner.id} className="pointer-events-none absolute left-1/2 top-[22%] flex -translate-x-1/2 flex-col items-center" style={{ animation: 'banner 2.2s ease-out forwards' }}>
      <span className="ol title-font whitespace-nowrap text-[6.5em] leading-none">{banner.text}</span>
      {banner.sub && <span className="ol whitespace-nowrap text-[2.2em] text-[#8fe8ff]">{banner.sub}</span>}
    </div>
  )
}

export function WinFlash() {
  const flash = useSession((s) => s.winFlash)
  if (!flash) return null
  return (
    <div key={flash.id} className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle, rgba(255,210,40,0.35), transparent 60%)', animation: 'banner 1.8s ease-out forwards' }} />
      <div className="flex items-center gap-[0.5em]" style={{ animation: 'banner 1.8s ease-out forwards' }}>
        <TrophyIcon size={9} />
        <span className="ol title-font text-[7em] text-[#ffe45c]">+{formatNumber(flash.amount)} WINS</span>
      </div>
    </div>
  )
}

const TOAST_ICONS = { trophy: TrophyIcon, lock: LockIcon, shoe: ShoeIcon }

export function Toasts() {
  const toasts = useSession((s) => s.toasts)
  return (
    <div className="pointer-events-none absolute left-1/2 top-[15%] flex -translate-x-1/2 flex-col items-center gap-[0.4em]">
      {toasts.map((t) => {
        const Icon = TOAST_ICONS[t.icon]
        return (
          <div key={t.id} className="flex items-center gap-[0.4em] whitespace-nowrap rounded-full bg-[#16102c]/70 px-[1em] py-[0.2em]" style={{ animation: 'toast-in 2.6s ease-out forwards' }}>
            {Icon && <Icon size={2} />}
            <span className="ol text-[1.8em]" style={{ color: t.color }}>
              {t.text}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** Turns quest completions into toasts. */
export function QuestWatcher() {
  const event = useProgress((s) => s.questEvent)
  const toast = useSession((s) => s.toast)
  useEffect(() => {
    if (event) toast(`Quest complete! ${event.label}  +${event.reward} Wins`, '#6bff8f', 'trophy')
  }, [event, toast])
  return null
}

const REVIVE_SECONDS = 10

/** Leave the death screen: at the stage checkpoint, or back at the hub spawn. */
function respawn(atCheckpoint) {
  const session = useSession.getState()
  const d = session.dead
  if (!d) return
  if (atCheckpoint && d.stage > 0) {
    session.requestTeleport(STAGES[d.world][d.stage - 1].checkpoint, 0)
  } else {
    const spawn = d.world === 2 ? SPAWNS.world2 : SPAWNS.lobby
    session.requestTeleport(spawn.pos, spawn.yaw)
  }
  session.setDead(null)
}

/** Lava death: red vignette + the original's "REVIVE?" prompt, paid in Wins. */
export function ReviveModal() {
  const dead = useSession((s) => s.dead)
  const wins = useProgress((s) => s.wins)
  const infinite = useProgress((s) => Boolean(s.upgrades.infRevive))
  const [now, setNow] = useState(() => Date.now())

  const cost = dead ? reviveCost(dead.world, dead.stage) : 0

  // Countdown ticks from the death timestamp; at zero it's back to spawn.
  useEffect(() => {
    if (!dead) return undefined
    // Nothing to revive into from a hub (fell off the map) - respawn straight away.
    const limit = dead.stage === 0 ? 600 : REVIVE_SECONDS * 1000
    const id = setInterval(() => {
      const t = Date.now()
      setNow(t)
      if (t - dead.at >= limit) respawn(false)
    }, 200)
    return () => clearInterval(id)
  }, [dead])

  const elapsed = dead ? Math.max(0, now - dead.at) : 0
  const left = Math.max(0, Math.ceil((REVIVE_SECONDS * 1000 - elapsed) / 1000))

  if (!dead) return null

  const yes = () => {
    if (infinite || useProgress.getState().spend(cost)) respawn(true)
    else useSession.getState().toast(`Need ${cost - wins} more Wins`, '#ff6b6b')
  }

  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle, rgba(255,60,20,0.15) 30%, rgba(200,20,0,0.55))', animation: 'flash-red 0.6s ease-out forwards' }} />
      {dead.stage > 0 && (
        <div className="panel anim-pop relative w-[min(92vw,38em)] overflow-hidden">
          <div className="b-pink flex items-center gap-[0.6em] border-b-[0.22em] border-[var(--ink)] px-[0.9em] py-[0.4em]">
            <HeartIcon size={3} />
            <span className="ol title-font flex-1 text-[2.6em]">Revive</span>
            <button type="button" className="btn b-red flex h-[2.6em] w-[2.6em] items-center justify-center p-0" onClick={() => respawn(false)} aria-label="Close">
              <CloseIcon size={1.5} />
            </button>
          </div>
          <div className="flex flex-col items-center gap-[0.8em] p-[1.2em]">
            {dead.msg && <span className="ol text-[1.8em] leading-none text-[#ff9b6b]">{dead.msg}</span>}
            <span className="ol title-font text-[4em] leading-none">REVIVE?</span>
            <span className="ol-sm text-[1.3em] text-white/85">
              Continue from Stage {dead.stage} · back to spawn in {left}s
            </span>
            <div className="grid w-full grid-cols-3 gap-[0.7em]">
              {infinite ? (
                <div />
              ) : (
                <div className="flex flex-col items-center gap-[0.3em]">
                  <button
                    type="button"
                    className="btn b-red w-full py-[0.5em]"
                    onClick={() => {
                      useSession.getState().openPanel('store')
                      respawn(false)
                    }}
                  >
                    <span className="ol text-[1.5em]">∞ Revives</span>
                  </button>
                  <WinsTag amount={400} size={1.3} />
                </div>
              )}
              <div className="flex flex-col items-center gap-[0.3em]">
                <button type="button" className="btn b-green w-full py-[0.5em]" onClick={yes}>
                  <span className="ol text-[1.9em]">Yes!</span>
                </button>
                {infinite ? (
                  <span className="ol-sm text-[1.3em] text-[#6bff8f]">FREE</span>
                ) : (
                  <span className="flex items-center gap-[0.3em]">
                    <span className="ol-sm text-[1.2em]">ONLY</span>
                    <WinsTag amount={cost} size={1.3} />
                  </span>
                )}
              </div>
              <div className="flex flex-col items-center">
                <button type="button" className="btn b-yellow w-full py-[0.5em]" onClick={() => respawn(false)}>
                  <span className="ol text-[1.9em]">No</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
