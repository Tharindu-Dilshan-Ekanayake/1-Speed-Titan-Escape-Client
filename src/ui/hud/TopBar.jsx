import { useShallow } from 'zustand/react/shallow'

import { questProgress, useProgress } from '../../state/progressStore'
import { useSession } from '../../state/sessionStore'
import { WinsTag } from '../common'

/** "Get 3 Wins (1/3)" strip across the top, plus where-am-I chip. */
export function TopBar() {
  // Flattened + shallow-compared: a fresh object per render would loop forever.
  const quest = useProgress(
    useShallow((s) => {
      const q = questProgress(s)
      return q
        ? { label: q.quest.label, value: q.value, target: q.quest.target, reward: q.quest.reward }
        : { label: null }
    }),
  )
  const world = useSession((s) => s.world)
  const stage = useSession((s) => s.stage)

  return (
    <div className="pointer-events-none absolute left-1/2 top-[0.8em] flex -translate-x-1/2 flex-col items-center gap-[0.3em]">
      {quest.label && (
        <div
          className="flex items-center gap-[0.8em] rounded-[0.4em] px-[2.2em] py-[0.2em]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(22,16,44,0.62) 15%, rgba(22,16,44,0.62) 85%, transparent)' }}
        >
          <span className="ol text-[2.3em] leading-tight">
            {quest.label} ({quest.value}/{quest.target})
          </span>
          <WinsTag amount={quest.reward} size={1.4} />
        </div>
      )}
      <span className="ol-sm rounded-full bg-[#16102c]/55 px-[0.9em] py-[0.1em] text-[1.2em]">
        World {world} · {stage === 0 ? (world === 2 ? 'Frozen Hub' : 'Castle Hall') : `Stage ${stage}`}
      </span>
    </div>
  )
}

export default TopBar
