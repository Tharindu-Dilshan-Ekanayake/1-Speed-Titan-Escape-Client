import { MAX_LEVEL, SPEED_PACKS, xpRequiredFor } from '../../config/progression'
import { TREADMILL_BY_ID } from '../../config/treadmills'
import { stepAmount, useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { formatNumber } from '../../utils/format'
import { WinsTag } from '../common'
import { ShoeIcon } from '../icons'
import { KeyCap } from './LeftMenu'

function LevelBar() {
  const level = useProgress((s) => s.level)
  const xp = useProgress((s) => s.xp)
  const max = level >= MAX_LEVEL
  const need = xpRequiredFor(level)
  const pct = max ? 100 : Math.min(100, (xp / need) * 100)

  return (
    <div
      className="checker relative h-[4em] overflow-hidden rounded-[0.8em] border-[0.25em] border-[var(--ink)] bg-[#e9e7f7]"
      style={{ boxShadow: '0 0.2em 0 var(--ink)' }}
    >
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-200"
        style={{
          width: `${pct}%`,
          background: 'linear-gradient(180deg, #7ff4ff 0%, #22d0f2 45%, #0ba5d6 100%)',
          boxShadow: 'inset 0 0.3em 0 rgba(255,255,255,0.35)',
        }}
      />
      <div className="relative flex h-full items-center justify-between px-[0.6em]">
        <span className="ol title-font text-[2.5em] leading-none text-[#ffe45c]">Level {level}</span>
        <span className="ol text-[2.3em] leading-none">
          {max ? 'MAX' : `${formatNumber(Math.floor(xp * 100) / 100)}/${formatNumber(need)}`}
        </span>
      </div>
    </div>
  )
}

function SpeedPackButton({ pack, hotkey }) {
  const buy = useProgress((s) => s.buySpeedPack)
  const wins = useProgress((s) => s.wins)
  const toast = useSession((s) => s.toast)
  return (
    <button
      type="button"
      className="btn b-yellow relative flex h-[3.6em] items-center justify-center gap-[0.2em]"
      onClick={() => {
        if (buy(pack.id)) toast(`+${formatNumber(pack.amount)} Speed!`, '#39d7ff', 'shoe')
        else toast(`Need ${pack.cost - wins} more Wins`, '#ff6b6b')
      }}
      title={`Buy +${formatNumber(pack.amount)} Speed for ${pack.cost} Wins`}
    >
      <KeyCap k={hotkey} className="absolute -left-[0.55em] -top-[0.6em]" />
      <ShoeIcon size={2.1} />
      <span className="ol text-[1.9em] leading-none">+{formatNumber(pack.amount)}</span>
      <span className="absolute -bottom-[0.9em] right-[0.3em] rounded-full border-[0.14em] border-[var(--ink)] bg-[#2a2148] px-[0.35em] py-[0.05em]">
        <WinsTag amount={pack.cost} size={0.95} />
      </span>
    </button>
  )
}

function TreadmillChip() {
  const id = useSession((s) => s.treadmillId)
  const perStep = useProgress((s) => (id ? stepAmount(s, TREADMILL_BY_ID[id].mult) : 0))
  if (!id) return null
  const t = TREADMILL_BY_ID[id]
  return (
    <div className="anim-pop absolute -top-[3.2em] left-1/2 flex -translate-x-1/2 items-center gap-[0.4em] whitespace-nowrap rounded-full border-[0.2em] border-[var(--ink)] px-[0.8em] py-[0.15em]" style={{ background: `linear-gradient(180deg, ${t.color}, #2a2148)` }}>
      <ShoeIcon size={1.6} />
      <span className="ol-sm text-[1.3em]">
        Training {t.label} · +{formatNumber(perStep)}/step
      </span>
    </div>
  )
}

export function BottomBar() {
  const speed = useProgress((s) => s.speed)
  const jumpsLeft = useSession((s) => s.jumpsLeft)
  const maxJumps = useProgress((s) => (s.upgrades.tripleJump ? 3 : 2))

  return (
    <div className="pointer-events-auto absolute bottom-[1.6em] left-1/2 w-[min(46em,92vw)] -translate-x-1/2">
      <TreadmillChip />
      <div className="mb-[0.2em] flex items-end justify-between px-[0.3em]">
        <span className="ol text-[2.2em] leading-none" style={{ color: '#4fd8ff' }}>
          {formatNumber(Math.floor(speed * 100) / 100)} Speed
        </span>
        <span className="ol mr-[2em] text-[2.2em] leading-none">
          {maxJumps === 3 ? 'Triple' : 'Double'} Jump: {jumpsLeft}/{maxJumps}
        </span>
      </div>
      <LevelBar />
      <div className="mt-[0.7em] grid grid-cols-4 gap-[0.7em]">
        {SPEED_PACKS.map((p, i) => (
          <SpeedPackButton key={p.id} pack={p} hotkey={String(i + 1)} />
        ))}
      </div>
    </div>
  )
}

export default BottomBar
