import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { SPAWNS } from '../../config/layout'
import {
  MAX_LEVEL,
  DAILY_REWARDS,
  SPEED_PACKS,
  stepGainFor,
  UPGRADES,
  walkspeedFor,
  winMultiplierFor,
  WORLD2_UNLOCK,
} from '../../config/progression'
import { STAGES } from '../../config/stages'
import { HERO_WEAPONS, WEAPONS } from '../../config/weapons'
import { useWeaponPortrait } from '../../game/weapon/weaponPortraits'
import { dailyState, maxJumps, useProgress, winMultiplier, world2Checks } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { formatNumber, formatTime } from '../../utils/format'
import { Bar, Panel, WinsTag } from '../common'
import {
  CheckIcon,
  CrossIcon,
  GiftIcon,
  LockIcon,
  RebirthIcon,
  ShoeIcon,
  StatsIcon,
  StoreIcon,
  TeleportIcon,
} from '../icons'
import HeroesPanel from './HeroesPanel'

/* --- Store ------------------------------------------------------------------------ */

const UPGRADE_TONE = { orange: 'b-orange', yellow: 'b-yellow', blue: 'b-blue', red: 'b-red' }

function SwordCard({ w }) {
  const portrait = useWeaponPortrait(w.id)
  const owned = useProgress((s) => s.ownedWeapons.includes(w.id))
  const equipped = useProgress((s) => s.weapon === w.id)
  const wins = useProgress((s) => s.wins)
  const buy = useProgress((s) => s.buyWeapon)
  const equip = useProgress((s) => s.equipWeapon)
  const toast = useSession((s) => s.toast)
  const glow = w.glow === 'rainbow' ? '#ff9bf7' : w.glow
  return (
    <div
      className="card flex flex-col items-center gap-[0.2em] p-[0.5em]"
      style={{ background: `radial-gradient(circle at 50% 35%, ${glow}66, #1f1840 70%)` }}
    >
      <div className="h-[7em] w-full">
        {portrait && <img src={portrait} alt="" className="anim-bob h-full w-full object-contain" draggable={false} />}
      </div>
      <span
        className="ol-sm text-center text-[1.15em] leading-tight"
        style={{ color: w.glow === 'rainbow' ? '#fff' : glow }}
      >
        {w.name}
      </span>
      <span className="text-center text-[0.85em] font-semibold leading-tight text-white/75">{w.desc}</span>
      <button
        type="button"
        disabled={equipped}
        className={`btn ${equipped ? 'b-dark' : owned ? 'b-green' : 'b-gold'} mt-auto w-full py-[0.2em]`}
        onClick={() => {
          if (owned) {
            equip(w.id)
            toast(`${w.name} equipped!`, '#6bff8f')
          } else if (buy(w.id)) toast(`${w.name} unlocked!`, '#ffd43a', 'trophy')
          else toast(`Need ${w.price - wins} more Wins`, '#ff6b6b')
        }}
      >
        {equipped ? (
          <span className="ol-sm text-[1.1em]">Equipped</span>
        ) : owned ? (
          <span className="ol-sm text-[1.1em]">Equip</span>
        ) : (
          <WinsTag amount={w.price} size={1.15} />
        )}
      </button>
    </div>
  )
}

function SwordsTab() {
  const hero = useProgress((s) => s.equipped)
  return (
    <>
      <p className="ol-sm mb-[0.8em] text-center text-[1.1em] text-white/85">
        Glowing blades for both hands.{' '}
        {HERO_WEAPONS[hero] ? (
          <span className="text-[#ffb3f3]">
            Your hero wields their signature {HERO_WEAPONS[hero].name} - switch to your avatar to use these.
          </span>
        ) : (
          'Heroes bring their own signature blades.'
        )}
      </p>
      <div className="grid grid-cols-2 gap-[0.7em] sm:grid-cols-4">
        {WEAPONS.map((w) => (
          <SwordCard key={w.id} w={w} />
        ))}
      </div>
    </>
  )
}

function StorePanel() {
  const wins = useProgress((s) => s.wins)
  const upgrades = useProgress((s) => s.upgrades)
  const buyPack = useProgress((s) => s.buySpeedPack)
  const buyUpgrade = useProgress((s) => s.buyUpgrade)
  const toast = useSession((s) => s.toast)
  const initialTab = useSession((s) => s.panelData?.tab) || 'boosts'
  const [tab, setTab] = useState(initialTab)

  return (
    <Panel title="Store" icon={<StoreIcon size={3.2} />} tone="b-orange" width={60}>
      <div className="mb-[0.9em] flex justify-center gap-[0.6em]">
        {[
          ['boosts', 'Speed & Boosts'],
          ['swords', 'Swords'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`btn ${tab === id ? 'b-gold' : 'b-dark'} px-[1.2em] py-[0.3em]`}
          >
            <span className="ol text-[1.4em]">{label}</span>
          </button>
        ))}
      </div>
      {tab === 'swords' ? (
        <SwordsTab />
      ) : (
        <>
          <p className="ol-sm mb-[0.8em] text-center text-[1.15em] text-white/85">
            Everything here costs <span className="text-[#ffe45c]">Wins</span> - earn them on the win pads at the end of
            every stage.
          </p>
          <h3 className="ol mb-[0.4em] text-[1.6em]">Speed Packs</h3>
          <div className="grid grid-cols-2 gap-[0.7em] sm:grid-cols-4">
            {SPEED_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn b-yellow flex flex-col items-center gap-[0.2em] py-[0.6em]"
                onClick={() => {
                  if (buyPack(p.id)) toast(`+${formatNumber(p.amount)} Speed!`, '#39d7ff', 'shoe')
                  else toast(`Need ${p.cost - wins} more Wins`, '#ff6b6b')
                }}
              >
                <ShoeIcon size={3} />
                <span className="ol text-[1.9em] leading-none">+{formatNumber(p.amount)}</span>
                <span className="ol-sm text-[1em]">Speed</span>
                <span className="rounded-full border-[0.14em] border-[var(--ink)] bg-[#2a2148] px-[0.5em]">
                  <WinsTag amount={p.cost} size={1.1} />
                </span>
              </button>
            ))}
          </div>

          <h3 className="ol mb-[0.4em] mt-[1em] text-[1.6em]">Upgrades</h3>
          <div className="grid grid-cols-1 gap-[0.7em] sm:grid-cols-2">
            {UPGRADES.map((u) => {
              const owned = Boolean(upgrades[u.id])
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={owned}
                  className={`btn ${UPGRADE_TONE[u.theme]} flex items-center gap-[0.7em] px-[0.8em] py-[0.5em] text-left`}
                  onClick={() => {
                    if (buyUpgrade(u.id)) toast(`${u.name} unlocked!`, '#6bff8f')
                    else toast(`Need ${u.cost - wins} more Wins`, '#ff6b6b')
                  }}
                >
                  <div className="flex flex-1 flex-col">
                    <span className="ol text-[1.7em] leading-tight">{u.name}</span>
                    <span className="ol-sm text-[1em] text-white/90">{u.desc}</span>
                  </div>
                  {owned ? <CheckIcon size={2.2} /> : <WinsTag amount={u.cost} size={1.4} />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </Panel>
  )
}

/* --- Rebirth ---------------------------------------------------------------------- */

function Row({ label, from, to, good }) {
  return (
    <div className="flex items-center justify-between rounded-[0.6em] bg-[#1b1538]/70 px-[0.8em] py-[0.35em]">
      <span className="ol-sm text-[1.3em]">{label}</span>
      <span className="ol-sm text-[1.3em]">
        {from} <span className="text-white/60">▶</span>{' '}
        <span style={{ color: good ? '#6bff8f' : '#ff9b9b' }}>{to}</span>
      </span>
    </div>
  )
}

function RebirthPanel() {
  const level = useProgress((s) => s.level)
  const rebirths = useProgress((s) => s.rebirths)
  const rebirth = useProgress((s) => s.rebirth)
  const toast = useSession((s) => s.toast)
  const close = useSession((s) => s.closePanel)
  const ready = level >= MAX_LEVEL

  return (
    <Panel title="Rebirth" icon={<RebirthIcon size={3.2} />} tone="b-red" width={40}>
      <div className="flex flex-col gap-[0.6em]">
        <div className="flex items-center justify-between">
          <span className="ol text-[1.5em]">
            Level {level} / {MAX_LEVEL}
          </span>
          <span className="ol-sm text-[1.2em] text-white/80">Rebirths: {rebirths}</span>
        </div>
        <Bar value={level} max={MAX_LEVEL} height={1.6} color="linear-gradient(180deg,#ff9b9b,#e0102e)" />
        <p className="ol-sm text-[1.1em] text-white/85">
          Reach Level {MAX_LEVEL} to Rebirth. You start again from Level 1 (+1 Speed per step), but keep every Win and
          Hero - and win more from now on.
        </p>
        <Row label="Level" from={level} to={1} />
        <Row label="Walkspeed" from={walkspeedFor(level)} to={walkspeedFor(1)} />
        <Row label="Speed per step" from={`+${stepGainFor(level)}`} to={`+${stepGainFor(1)}`} />
        <Row
          label="Wins bonus"
          from={`x${winMultiplierFor(rebirths)}`}
          to={`x${winMultiplierFor(rebirths + 1)}`}
          good
        />
        <button
          type="button"
          disabled={!ready}
          className="btn b-red mt-[0.4em] py-[0.5em]"
          onClick={() => {
            if (rebirth()) {
              toast(`REBIRTH ${rebirths + 1}! Wins x${winMultiplierFor(rebirths + 1)}`, '#ff9b9b')
              close()
            }
          }}
        >
          <span className="ol title-font text-[2em]">{ready ? 'REBIRTH!' : `Reach Level ${MAX_LEVEL}`}</span>
        </button>
      </div>
    </Panel>
  )
}

/* --- Rewards ------------------------------------------------------------------------ */

function useClock(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

function RewardLabel({ r, size = 1 }) {
  return r.wins ? (
    <WinsTag amount={r.wins} size={1.3 * size} />
  ) : (
    <span className="flex items-center gap-[0.2em]">
      <ShoeIcon size={1.5 * size} />
      <span className="ol-sm text-[#4fd8ff]" style={{ fontSize: `${1.2 * size}em` }}>
        +{formatNumber(r.speed)}
      </span>
    </span>
  )
}

/** Daily login rewards: one claim a day on a 7-day streak. */
function RewardsPanel() {
  const now = useClock()
  const daily = useProgress((s) => s.daily)
  const claim = useProgress((s) => s.claimDaily)
  const toast = useSession((s) => s.toast)
  const st = dailyState({ daily }, new Date(now))
  const today = DAILY_REWARDS[st.index]
  return (
    <Panel title="Daily Rewards" icon={<GiftIcon size={3.2} />} tone="b-purple" width={56}>
      <p className="ol-sm mb-[0.8em] text-center text-[1.2em]">
        Come back every day! Miss a day and the streak starts over.
      </p>
      <div className="grid grid-cols-4 gap-[0.6em] sm:grid-cols-7">
        {DAILY_REWARDS.map((r, i) => {
          const done = i < st.index || (i === st.index && st.claimedToday)
          const current = i === st.index && !st.claimedToday
          return (
            <div
              key={r.day}
              className={`daily-card ${done ? 'is-done' : ''} ${current ? 'is-today' : ''} ${r.big ? 'is-big' : ''}`}
            >
              <span className="ol-sm text-[1.05em]">Day {r.day}</span>
              <GiftIcon size={r.big ? 3.4 : 2.6} />
              <RewardLabel r={r} size={0.85} />
              {done && (
                <span className="daily-check">
                  <CheckIcon size={2.2} />
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-[1em] flex flex-col items-center gap-[0.4em]">
        {st.claimedToday ? (
          <span className="ol-sm text-[1.3em]">
            Next reward in <span className="text-[#6bff8f]">{formatTime(Math.ceil((st.nextAt - now) / 1000))}</span>
          </span>
        ) : (
          <button
            type="button"
            className="btn b-green anim-pulse px-[1.6em] py-[0.3em]"
            onClick={() => {
              const r = claim()
              if (r) toast(r.wins ? `+${r.wins} Wins!` : `+${formatNumber(r.speed)} Speed!`, '#6bff8f', 'trophy')
            }}
          >
            <span className="ol flex items-center gap-[0.4em] text-[1.6em]">
              Claim Day {today.day}! <RewardLabel r={today} />
            </span>
          </button>
        )}
      </div>
    </Panel>
  )
}

/* --- Teleport ------------------------------------------------------------------------ */

function TeleportPanel() {
  const world2 = useProgress((s) => s.world2)
  const bestW1 = useProgress((s) => s.bestStageW1)
  const session = useSession.getState()

  const go = (spawn, label) => {
    session.requestTeleport(spawn.pos, spawn.yaw)
    session.closePanel()
    if (label) session.showBanner(label)
  }

  const places = [
    { label: 'Spawn', sub: 'Castle Hall', spawn: SPAWNS.lobby, tone: 'b-blue' },
    { label: 'Training', sub: 'Treadmills', spawn: SPAWNS.training, tone: 'b-orange' },
    { label: 'Heroes', sub: 'Hero Hall', spawn: SPAWNS.heroes, tone: 'b-purple' },
    {
      label: 'Stage 1',
      sub: `Best: Stage ${bestW1}`,
      spawn: { pos: STAGES[1][0].checkpoint, yaw: 0 },
      tone: 'b-green',
    },
  ]

  return (
    <Panel title="Teleport" icon={<TeleportIcon size={3.2} />} tone="b-blue" width={44}>
      <div className="grid grid-cols-2 gap-[0.7em]">
        {places.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`btn ${p.tone} flex flex-col items-center py-[0.6em]`}
            onClick={() => go(p.spawn)}
          >
            <span className="ol text-[1.9em] leading-tight">{p.label}</span>
            <span className="ol-sm text-[1em] text-white/90">{p.sub}</span>
          </button>
        ))}
        <button
          type="button"
          className={`btn ${world2 ? 'b-blue' : 'b-dark'} col-span-2 flex items-center justify-center gap-[0.6em] py-[0.6em]`}
          onClick={() => (world2 ? go(SPAWNS.world2, 'WORLD 2') : session.openPanel('world2'))}
        >
          {!world2 && <LockIcon size={2} />}
          <span className="ol title-font text-[2em]">World 2</span>
        </button>
      </div>
    </Panel>
  )
}

/* --- World 2 unlock -------------------------------------------------------------------- */

function World2Panel() {
  const checks = useProgress(useShallow((s) => world2Checks(s).map((c) => c.ok)))
  const labels = useProgress(useShallow((s) => world2Checks(s).map((c) => c.label)))
  const unlocked = useProgress((s) => s.world2)
  const unlock = useProgress((s) => s.unlockWorld2)
  const session = useSession.getState()

  return (
    <Panel title="World 2" icon={<TeleportIcon size={3.2} />} tone="b-blue" width={40}>
      <div className="flex flex-col gap-[0.6em]">
        <p className="ol-sm text-center text-[1.2em]">The Frozen Void: 10 brutal stages, huge Win pads (up to 600!)</p>
        {labels.map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-[0.6em] rounded-[0.6em] bg-[#1b1538]/70 px-[0.8em] py-[0.35em]"
          >
            {checks[i] ? <CheckIcon size={1.8} /> : <CrossIcon size={1.8} />}
            <span className="ol-sm text-[1.3em]">{label}</span>
          </div>
        ))}
        <button
          type="button"
          disabled={!unlocked && !checks.every(Boolean)}
          className="btn b-blue mt-[0.4em] py-[0.5em]"
          onClick={() => {
            if (unlocked || unlock()) {
              session.requestTeleport(SPAWNS.world2.pos, SPAWNS.world2.yaw)
              session.closePanel()
              session.showBanner('WORLD 2', 'The Frozen Void')
            }
          }}
        >
          <span className="ol title-font text-[1.9em]">
            {unlocked ? 'Enter World 2' : `Unlock for ${WORLD2_UNLOCK.cost} Wins`}
          </span>
        </button>
      </div>
    </Panel>
  )
}

/* --- Stats & settings -------------------------------------------------------------------- */

function StatsPanel() {
  const p = useProgress(
    useShallow((s) => ({
      speed: s.speed,
      bestSpeed: s.bestSpeed,
      level: s.level,
      rebirths: s.rebirths,
      totalWins: s.totalWins,
      totalSteps: s.totalSteps,
      playtime: s.playtime,
      deaths: s.deaths,
      bestStageW1: s.bestStageW1,
      bestStageW2: s.bestStageW2,
      heroes: s.ownedHeroes.length,
      winMult: winMultiplier(s),
      jumps: maxJumps(s),
      graphics: s.settings.graphics,
    })),
  )

  const rows = [
    ['Speed', formatNumber(p.speed)],
    ['Best Speed', formatNumber(p.bestSpeed)],
    ['Level', `${p.level} / ${MAX_LEVEL}`],
    ['Rebirths', p.rebirths],
    ['Total Wins', formatNumber(p.totalWins)],
    ['Wins Multiplier', `x${p.winMult}`],
    ['Steps Taken', formatNumber(p.totalSteps)],
    ['Playtime', formatTime(p.playtime)],
    ['Best Stage (W1)', `${p.bestStageW1} / 20`],
    ['Best Stage (W2)', `${p.bestStageW2} / 10`],
    ['Heroes Owned', p.heroes],
    ['Lava Deaths', p.deaths],
  ]

  return (
    <Panel title="Stats" icon={<StatsIcon size={3.2} />} tone="b-dark" width={46}>
      <div className="grid grid-cols-2 gap-[0.5em]">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex items-center justify-between rounded-[0.6em] bg-[#1b1538]/70 px-[0.7em] py-[0.3em]"
          >
            <span className="ol-sm text-[1.1em] text-white/80">{k}</span>
            <span className="ol-sm text-[1.2em] text-[#ffe45c]">{v}</span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

const PANELS = {
  heroes: HeroesPanel,
  store: StorePanel,
  rebirth: RebirthPanel,
  rewards: RewardsPanel,
  teleport: TeleportPanel,
  world2: World2Panel,
  stats: StatsPanel,
}

export function PanelHost() {
  const panel = useSession((s) => s.panel)
  const Component = PANELS[panel]
  return Component ? <Component key={panel} /> : null
}
