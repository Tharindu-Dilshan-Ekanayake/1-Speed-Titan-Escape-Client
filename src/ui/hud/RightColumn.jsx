import { useEffect, useState } from 'react'

import { HERO_BY_ID, HEROES, RARITIES } from '../../config/heroes'
import { UPGRADES } from '../../config/progression'
import { useHeroPortrait } from '../../game/hero/portraits'
import {
  currentDeal,
  currentWalkspeed,
  heroPrice,
  maxWalkspeed,
  useProgress,
} from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { formatCountdown } from '../../utils/format'
import { WinsTag } from '../common'
import { CheckIcon, PencilIcon } from '../icons'

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(id)
  }, [interval])
  return now
}

function PromoCard({ hero, top, bottom, onClick }) {
  const portrait = useHeroPortrait(hero.id)
  const rarity = RARITIES[hero.rarity]
  return (
    <button type="button" onClick={onClick} className="icon-btn relative flex w-[7.2em] flex-col items-center bg-transparent p-0">
      <span className="ol-sm z-10 text-[1.25em] leading-none" style={{ color: rarity.glow }}>
        {top}
      </span>
      <div
        className="relative -my-[0.2em] h-[6em] w-[6em] rounded-full"
        style={{ background: `radial-gradient(circle, ${rarity.color}aa 0%, transparent 65%)` }}
      >
        {portrait && <img src={portrait} alt="" className="anim-bob h-full w-full object-contain" draggable={false} />}
      </div>
      <span className="z-10 -mt-[0.6em]">{bottom}</span>
    </button>
  )
}

function Promos() {
  const now = useNow()
  const open = useSession((s) => s.openPanel)
  const owned = useProgress((s) => s.ownedHeroes)
  const deal = currentDeal(now)
  const dealHero = HERO_BY_ID[deal.heroId]
  // Showcase the most exclusive hero the player doesn't own yet.
  const showcase = [...HEROES].reverse().find((h) => !owned.includes(h.id)) || HEROES[HEROES.length - 1]

  return (
    <div className="flex items-start gap-[0.4em]">
      <PromoCard
        hero={showcase}
        top={showcase.name.split(' ')[0].toUpperCase()}
        bottom={<WinsTag amount={showcase.price} size={1.25} />}
        onClick={() => open('heroes', { focus: showcase.id })}
      />
      <PromoCard
        hero={dealHero}
        top="-30% DEAL"
        bottom={
          <span className="flex flex-col items-center leading-none">
            <WinsTag amount={heroPrice(dealHero, now)} size={1.15} />
            <span className="ol-sm mt-[0.15em] text-[1.05em]">
              Ends in <span className="text-[#6bff8f]">{formatCountdown(deal.endsAt - now)}</span>
            </span>
          </span>
        }
        onClick={() => open('heroes', { focus: dealHero.id })}
      />
    </div>
  )
}

function CustomSpeed() {
  const current = useProgress((s) => currentWalkspeed(s))
  const max = useProgress((s) => maxWalkspeed(s))
  const setCustomSpeed = useProgress((s) => s.setCustomSpeed)
  const [draft, setDraft] = useState(null)

  const commit = () => {
    if (draft !== null && draft !== '') setCustomSpeed(draft)
    setDraft(null)
  }

  return (
    <div className="flex w-[14em] flex-col items-end">
      <span className="ol-sm mr-[1.2em] text-[1.35em] leading-none">Custom Speed</span>
      <div className="relative mt-[0.2em] w-full">
        <div className="absolute -left-[1.4em] -top-[0.8em] z-10 -rotate-6">
          <PencilIcon size={4} />
        </div>
        <input
          type="number"
          min={1}
          max={max}
          value={draft ?? current}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setDraft(null)
              e.currentTarget.blur()
            }
          }}
          className="speed-input checker ol w-full rounded-[0.8em] border-[0.22em] border-[var(--ink)] bg-[#f1f0fb] py-[0.25em] pl-[2.4em] pr-[0.5em] text-center text-[2em] text-white outline-none"
          style={{ backgroundColor: '#e9e7f7', boxShadow: '0 0.12em 0 var(--ink)' }}
          aria-label="Custom walkspeed"
        />
      </div>
      <span className="ol-sm mt-[0.3em] text-[1.3em] leading-none">Max Speed: {max}</span>
    </div>
  )
}

const TONE = { orange: 'b-orange', yellow: 'b-yellow', blue: 'b-blue', red: 'b-red' }

function UpgradeButton({ up }) {
  const owned = useProgress((s) => Boolean(s.upgrades[up.id]))
  const wins = useProgress((s) => s.wins)
  const buy = useProgress((s) => s.buyUpgrade)
  const toast = useSession((s) => s.toast)
  return (
    <button
      type="button"
      className={`btn ${TONE[up.theme]} flex w-[14em] flex-col items-center px-[0.5em] py-[0.25em]`}
      onClick={() => {
        if (owned) return
        if (buy(up.id)) toast(`${up.name} unlocked!`, '#6bff8f')
        else toast(`Need ${up.cost - wins} more Wins`, '#ff6b6b')
      }}
      title={up.desc}
    >
      <span className="ol text-[1.7em] leading-tight">{up.name}</span>
      {owned ? (
        <span className="ol-sm flex items-center gap-[0.3em] text-[1.2em] text-[#b7ffc8]">
          <CheckIcon size={1.1} /> OWNED
        </span>
      ) : (
        <span className="flex items-center gap-[0.4em]">
          <span className="ol-sm text-[1.25em] italic">ONLY</span>
          <WinsTag amount={up.cost} size={1.25} />
        </span>
      )}
    </button>
  )
}

export function RightColumn() {
  return (
    <div className="pointer-events-auto absolute right-[1em] top-[4.6em] flex flex-col items-end gap-[0.55em]">
      <Promos />
      <CustomSpeed />
      {UPGRADES.slice(0, 3).map((up) => (
        <UpgradeButton key={up.id} up={up} />
      ))}
    </div>
  )
}

export default RightColumn
